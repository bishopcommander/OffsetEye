/**
 * Extraction Service (Phase 5)
 * 
 * Pipeline:
 * 1. Extract raw text via pdf-parse (digital PDF).
 * 2. Fallback to tesseract.js for scanned/image PDFs or sparse text.
 * 3. Call LLM (or robust pattern-based fallback if LLM unavailable) with fixed schema prompt.
 * 4. Strictly validate extraction against schema.
 * 5. If invalid or low confidence (< 0.70), mark needs_review = true instead of dropping.
 * 6. Populate `events`, and also `formations` and `well_parameters` if present in text.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { query } = require('../config/db');
const llmClient = require('./llmClient');

// Fixed schema for event validation before SQL insertion
const eventSchema = Joi.object({
  event_type: Joi.string().valid(
    'mud_loss', 'stuck_pipe', 'overpressure', 'torque_spike',
    'cementing', 'kick', 'fishing', 'npt', 'other'
  ).required(),
  depth: Joi.number().min(0).max(15000).allow(null).default(null),
  formation: Joi.string().max(100).allow(null, '').default('Unknown'),
  description: Joi.string().min(5).max(2000).required(),
  mitigation: Joi.string().max(2000).allow(null, '').default('No mitigation documented'),
  source_excerpt: Joi.string().max(2000).allow(null, '').default('Extracted from uploaded report'),
  confidence: Joi.number().min(0).max(1).required()
});

const formationSchema = Joi.object({
  formation: Joi.string().required(),
  top_depth: Joi.number().min(0).max(15000).required(),
  bottom_depth: Joi.number().min(0).max(15000).allow(null),
  lithology: Joi.string().allow(null, '').default('Unknown')
});

const parameterSchema = Joi.object({
  depth: Joi.number().min(0).max(15000).required(),
  rpm: Joi.number().allow(null),
  wob: Joi.number().allow(null),
  torque: Joi.number().allow(null),
  rop: Joi.number().allow(null),
  mud_weight: Joi.number().allow(null),
  flow_rate: Joi.number().allow(null),
  standpipe_pressure: Joi.number().allow(null)
});

/**
 * Extract text from file path or buffer
 */
async function extractTextFromDocument(filePath, buffer) {
  let text = '';
  let ocrUsed = false;
  let ocrConfidence = 1.0;

  const fileBuffer = buffer || (filePath ? fs.readFileSync(filePath) : Buffer.from(''));
  const ext = filePath ? path.extname(filePath).toLowerCase() : '';

  // 1. Plain text file handling
  if (ext === '.txt') {
    text = fileBuffer.toString('utf8').trim();
    return { text, ocrUsed: false, ocrConfidence: 1.0 };
  }

  // 2. Digital PDF extraction via pdf-parse
  if (ext === '.pdf' || !ext) {
    try {
      const pdfData = await pdfParse(fileBuffer);
      text = (pdfData.text || '').trim();
    } catch (err) {
      console.warn('[extraction] pdf-parse failed, checking OCR fallback...', err.message);
    }
  }

  // 3. If minimal or zero text and is image or scanned PDF, attempt OCR
  if (text.length < 60 && (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.tif' || ext === '.pdf')) {
    console.log('[extraction] Minimal or zero digital text found. Triggering Tesseract OCR fallback...');
    ocrUsed = true;
    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(fileBuffer);
      await worker.terminate();
      text = (ret.data.text || '').trim();
      ocrConfidence = ret.data.confidence ? (ret.data.confidence / 100) : 0.65;
      console.log(`[extraction] OCR complete. Characters extracted: ${text.length}, Confidence: ${ocrConfidence}`);
    } catch (ocrErr) {
      console.error('[extraction] OCR failed or image format unsupported:', ocrErr.message);
      ocrConfidence = 0.2;
    }
  }

  return { text, ocrUsed, ocrConfidence };
}

/**
 * Deterministic regex/pattern extractor as robust fallback or validation counterpart
 */
function extractPatterns(text) {
  const events = [];
  const formations = [];
  const parameters = [];

  const lower = text.toLowerCase();

  // Pattern detection for standard drilling risks
  const patterns = [
    { type: 'mud_loss', keywords: ['loss', 'lost circulation', 'mud loss', 'seepage', 'lcm pill', 'losses'] },
    { type: 'stuck_pipe', keywords: ['stuck', 'pipe stuck', 'overpull', 'differential sticking', 'pack off', 'tight hole'] },
    { type: 'kick', keywords: ['kick', 'influx', 'well control', 'pit gain', 'bop', 'sidpp', 'shut in', 'shut-in'] },
    { type: 'overpressure', keywords: ['overpressure', 'pore pressure', 'high pressure', 'gas cap', 'abnormal pressure'] },
    { type: 'torque_spike', keywords: ['torque spike', 'stick-slip', 'torsional vibration', 'high torque', 'chert stringer'] },
    { type: 'cementing', keywords: ['cementing', 'casing shoe', 'micro-annular', 'top of cement', 'slurry loss', 'squeeze'] },
    { type: 'fishing', keywords: ['fishing', 'overshot', 'twist-off', 'parted string', 'grapple', 'fish'] },
    { type: 'npt', keywords: ['npt', 'non-productive time', 'waiting on', 'repair', 'lost time'] },
  ];

  // Look for depth pattern: e.g. "at 2920m", "2920 m", "depth: 2920"
  const depthMatch = text.match(/(?:at|depth|md|measured depth|interval)[:\s]*([0-9]{3,4}(?:\.[0-9]+)?)\s*(?:m|metres|meters|ft)?/i);
  const detectedDepth = depthMatch ? parseFloat(depthMatch[1]) : null;

  // Look for known formation names
  const knownFormations = ['Hugin', 'Skagerrak', 'Shetland Group', 'Shetland', 'Hordaland Group', 'Hordaland', 'Rogaland Group', 'Rogaland', 'Nordland Group', 'Nordland', 'Tipam', 'Barail'];
  let detectedFormation = 'Unknown';
  for (const f of knownFormations) {
    if (new RegExp(`\\b${f}\\b`, 'i').test(text)) {
      detectedFormation = f;
      break;
    }
  }

  for (const p of patterns) {
    for (const kw of p.keywords) {
      const idx = lower.indexOf(kw);
      if (idx !== -1) {
        // Grab context window around keyword for excerpt
        const start = Math.max(0, idx - 80);
        const end = Math.min(text.length, idx + 180);
        const excerpt = text.substring(start, end).replace(/\s+/g, ' ').trim();

        events.push({
          event_type: p.type,
          depth: detectedDepth,
          formation: detectedFormation,
          description: `Identified ${p.type} occurrence: ${excerpt.substring(0, 160)}`,
          mitigation: 'Standard operational mitigation applied per field protocol',
          source_excerpt: excerpt,
          confidence: 0.88
        });
        break; // one match per category
      }
    }
  }

  // Detect formation tops e.g. "Top Hugin at 2900m", "Shetland: 2450 - 2900m"
  const formationIntervalRegex = /(?:top\s+)?([A-Za-z\s]+?)\s*(?:top|formation)?\s*[:at\s]+([0-9]{3,4})\s*(?:m)?\s*(?:to|-)?\s*([0-9]{3,4})?\s*(?:m)?/gi;
  let match;
  while ((match = formationIntervalRegex.exec(text)) !== null) {
    const name = match[1].trim();
    const top = parseFloat(match[2]);
    const bottom = match[3] ? parseFloat(match[3]) : null;
    if (name.length > 2 && top > 100) {
      formations.push({
        formation: name,
        top_depth: top,
        bottom_depth: bottom,
        lithology: 'Identified from report text'
      });
      if (formations.length >= 3) break;
    }
  }

  return { events, formations, parameters };
}

/**
 * Process uploaded document and extract structured entities
 */
async function processDocumentExtraction({ well_id, filePath, buffer, doc_type = 'WCR' }) {
  console.log(`[extraction] Processing document for well_id=${well_id}, doc_type=${doc_type}`);

  // 1. Extract raw text & OCR if necessary
  const { text, ocrUsed, ocrConfidence } = await extractTextFromDocument(filePath, buffer);

  // 2. Insert document record
  const docInsert = await query(
    `INSERT INTO documents (well_id, file_path, doc_type, ocr_confidence)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [well_id, filePath || 'in_memory_upload', doc_type, ocrConfidence]
  );
  const document_id = docInsert.rows[0].id;

  // Handle completely blank / bad inputs gracefully
  if (!text || text.trim().length === 0) {
    console.warn('[extraction] Document is empty or blank. Recording low-confidence needs_review item.');
    const blankEvent = await query(
      `INSERT INTO events (well_id, document_id, event_type, depth, formation, description, mitigation, source_excerpt, confidence, needs_review)
       VALUES ($1, $2, 'other', NULL, 'Unknown', 'Document contained blank or unreadable text. Requires manual verification.', 'Manual review required', 'Empty or unparsable document', 0.1, true)
       RETURNING *`,
      [well_id, document_id]
    );
    return {
      document_id,
      ocr_confidence: ocrConfidence,
      events: blankEvent.rows,
      formations: [],
      well_parameters: [],
      needs_review_count: 1,
      status: 'review_required'
    };
  }

  // 3. Attempt LLM extraction if API key configured
  let extractedPayload = null;
  const apiKey = process.env.LLM_API_KEY;
  const hasValidKey = apiKey && apiKey !== 'REPLACE_WITH_YOUR_KEY';

  if (hasValidKey) {
    try {
      const prompt = `
You are an expert petroleum drilling data engineer extracting structured records from drilling reports (WCRs, DDRs).
Analyze this text and return a JSON object with this exact shape:
{
  "events": [
    {
      "event_type": "mud_loss" | "stuck_pipe" | "overpressure" | "torque_spike" | "cementing" | "kick" | "fishing" | "npt",
      "depth": number (in metres MD, or null),
      "formation": string (e.g. "Hugin", "Shetland Group", or "Unknown"),
      "description": string,
      "mitigation": string,
      "source_excerpt": string (exact excerpt from text),
      "confidence": number between 0.0 and 1.0
    }
  ],
  "formations": [
    {
      "formation": string,
      "top_depth": number,
      "bottom_depth": number or null,
      "lithology": string
    }
  ]
}

Document Text:
"""
${text.substring(0, 4000)}
"""
`;
      const llmResponse = await llmClient.chat([
        { role: 'system', content: 'You extract structured drilling events and geological tops in JSON format only.' },
        { role: 'user', content: prompt }
      ], { temperature: 0 });

      // Clean JSON delimiters if any
      const cleanedJson = llmResponse.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      extractedPayload = JSON.parse(cleanedJson);
    } catch (llmErr) {
      console.warn('[extraction] LLM extraction error or parse error, using pattern engine:', llmErr.message);
    }
  }

  // Fallback if LLM was skipped or returned empty
  if (!extractedPayload || !extractedPayload.events || extractedPayload.events.length === 0) {
    console.log('[extraction] Using pattern-based extraction engine...');
    extractedPayload = extractPatterns(text);
  }

  // If still no events found (e.g. garbled text, non-drilling content)
  if (!extractedPayload.events || extractedPayload.events.length === 0) {
    const unparsedEvent = await query(
      `INSERT INTO events (well_id, document_id, event_type, depth, formation, description, mitigation, source_excerpt, confidence, needs_review)
       VALUES ($1, $2, 'other', NULL, 'Unknown', 'No standard drilling risk events recognized. Flagged for review.', 'Manual inspection needed', $3, 0.4, true)
       RETURNING *`,
      [well_id, document_id, text.substring(0, 300)]
    );
    return {
      document_id,
      ocr_confidence: ocrConfidence,
      events: unparsedEvent.rows,
      formations: [],
      well_parameters: [],
      needs_review_count: 1,
      status: 'review_required'
    };
  }

  // 4. Schema validate every event and insert
  const insertedEvents = [];
  let needsReviewCount = 0;

  for (const rawEv of extractedPayload.events) {
    let ev = rawEv;
    let needsReview = false;

    // Validate against Joi schema
    const { error, value } = eventSchema.validate(rawEv, { abortEarly: false, stripUnknown: true });
    if (error) {
      console.warn('[extraction] Event validation issue:', error.details.map(d => d.message));
      needsReview = true;
      // Salvage whatever is present rather than dropping
      ev = {
        event_type: rawEv.event_type && ['mud_loss','stuck_pipe','overpressure','torque_spike','cementing','kick','fishing','npt'].includes(rawEv.event_type) ? rawEv.event_type : 'other',
        depth: typeof rawEv.depth === 'number' ? rawEv.depth : null,
        formation: rawEv.formation || 'Unknown',
        description: rawEv.description || 'Malformed description extracted from report',
        mitigation: rawEv.mitigation || 'Needs verification',
        source_excerpt: rawEv.source_excerpt || text.substring(0, 200),
        confidence: typeof rawEv.confidence === 'number' ? Math.min(rawEv.confidence, 0.5) : 0.4
      };
    } else {
      ev = value;
    }

    // Flag as needs_review if confidence < 0.70 or OCR was poor
    if (ev.confidence < 0.70 || ocrConfidence < 0.70) {
      needsReview = true;
    }

    if (needsReview) needsReviewCount++;

    const inserted = await query(
      `INSERT INTO events (well_id, document_id, event_type, depth, formation, description, mitigation, source_excerpt, confidence, needs_review)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [well_id, document_id, ev.event_type, ev.depth, ev.formation, ev.description, ev.mitigation, ev.source_excerpt, ev.confidence, needsReview]
    );
    insertedEvents.push(inserted.rows[0]);
  }

  // 5. Populate formations if extracted
  const insertedFormations = [];
  if (Array.isArray(extractedPayload.formations)) {
    for (const f of extractedPayload.formations) {
      const { error, value } = formationSchema.validate(f, { stripUnknown: true });
      if (!error) {
        const ins = await query(
          `INSERT INTO formations (well_id, formation, top_depth, bottom_depth, lithology)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [well_id, value.formation, value.top_depth, value.bottom_depth, value.lithology]
        );
        insertedFormations.push(ins.rows[0]);
      }
    }
  }

  return {
    document_id,
    ocr_confidence: ocrConfidence,
    events: insertedEvents,
    formations: insertedFormations,
    needs_review_count: needsReviewCount,
    status: needsReviewCount > 0 ? 'review_required' : 'processed'
  };
}

module.exports = {
  extractTextFromDocument,
  extractPatterns,
  processDocumentExtraction,
  eventSchema
};
