/**
 * RAG & Search Service (Phase 6)
 * 
 * Safety & Grounding Rules:
 * 1. Natural-language query is parsed into a structured filter object, validated with Joi.
 * 2. The LLM never constructs or executes SQL directly.
 * 3. Matched rows only are provided to the summarizer — no evidence means explicit "no matching events found".
 * 4. Claim-level citations link statements back to verbatim source excerpts.
 * 5. One known-good query/response pair is cached to a fixed key for offline demo fallback.
 */

'use strict';

const Joi = require('joi');
const { query } = require('../config/db');
const llmClient = require('./llmClient');
const { normalizeFormation } = require('./formationSynonyms');

// Fixed schema for the structured query filter produced by LLM
const filterSchema = Joi.object({
  event_types: Joi.array().items(
    Joi.string().valid('mud_loss', 'stuck_pipe', 'overpressure', 'torque_spike', 'cementing', 'kick', 'fishing', 'npt')
  ).default([]),
  formation: Joi.string().allow(null, '').default(null),
  depth_min: Joi.number().min(0).max(15000).allow(null).default(null),
  depth_max: Joi.number().min(0).max(15000).allow(null).default(null),
  keywords: Joi.array().items(Joi.string()).default([]),
  radius_m: Joi.number().min(100).max(500000).default(25000)
});

// Fixed cached demo query and grounded response for offline / API fallback
const CACHED_DEMO_KEY = 'hugin_mud_loss_stuck_pipe_risk';
const CACHED_DEMO_QUERY = 'what mud loss and stuck pipe risks were encountered in hugin sandstone near 2950m?';

const CACHED_DEMO_RESPONSE = {
  is_cached_demo: true,
  query: CACHED_DEMO_QUERY,
  summary: 'Historical records from offset wells in the Hugin sandstone (2900m - 3150m MD) reveal severe dynamic mud losses (22 to 45 m3/hr) and differential stuck pipe incidents. In well 15/9-F-12, penetrating the top Hugin with 1.34 SG mud resulted in 28 m3/hr losses requiring high-fluid-loss crosslinked LCM pills. In well 15/9-F-14, severe losses of 45 m3/hr occurred, and stationary wireline survey pauses caused differential sticking with 28.5 hours NPT. Mitigation protocol requires spotting heavy calcium carbonate/polymer pills, limiting stationary pauses to under 10 minutes, and monitoring torque fluctuations.',
  citations: [
    {
      claim: 'Partial mud loss of 28 m3/hr upon penetrating top Hugin sand; treated with 15 m3 LCM pill.',
      source_well: '15/9-F-12',
      depth: 2920.0,
      formation: 'Hugin',
      source_excerpt: 'DDR #42: At 2920m MD observed 28 m3/hr dynamic losses in Hugin sandstone. Mixed and spotted 15 m3 mica/calcium carbonate LCM pill.'
    },
    {
      claim: 'Severe loss of circulation (45 m3/hr) in depleted high-permeability Hugin reservoir zone.',
      source_well: '15/9-F-14',
      depth: 2935.0,
      formation: 'Hugin',
      source_excerpt: 'DDR 15/9-F-14: Total losses 45 m3/hr at 2935m MD. Standpipe pressure dropped 35 bar. Spotted 20 m3 heavy LCM pill.'
    },
    {
      claim: 'Differential sticking during survey pause across depleted Hugin interval resulting in 28.5 hrs NPT.',
      source_well: '15/9-F-14',
      depth: 3120.0,
      formation: 'Hugin',
      source_excerpt: 'Incident log: Pipe stuck off-bottom at 3120m after stationary wireline check. Overpull 900 kN unsuccessful until lubricant pill soaked 3 hrs.'
    }
  ],
  matched_events_count: 3
};

/**
 * Heuristic/pattern query parser used if LLM API is unavailable or for instant local fallback
 */
function parseQueryHeuristically(userQuery) {
  const lower = userQuery.toLowerCase();
  const eventTypes = [];

  const typeMap = {
    'mud loss': 'mud_loss',
    'loss': 'mud_loss',
    'lost circulation': 'mud_loss',
    'stuck pipe': 'stuck_pipe',
    'stuck': 'stuck_pipe',
    'overpressure': 'overpressure',
    'pressure': 'overpressure',
    'torque': 'torque_spike',
    'stick-slip': 'torque_spike',
    'cement': 'cementing',
    'cementing': 'cementing',
    'kick': 'kick',
    'influx': 'kick',
    'fishing': 'fishing',
    'npt': 'npt'
  };

  for (const [key, val] of Object.entries(typeMap)) {
    if (lower.includes(key) && !eventTypes.includes(val)) {
      eventTypes.push(val);
    }
  }

  // Detect depth numbers
  const depthMatch = userQuery.match(/([0-9]{3,4}(?:\.[0-9]+)?)\s*(?:m|metres|meters|ft)?/i);
  let depth_min = null;
  let depth_max = null;
  if (depthMatch) {
    const targetDepth = parseFloat(depthMatch[1]);
    depth_min = Math.max(0, targetDepth - 100);
    depth_max = targetDepth + 100;
  }

  // Detect formation
  const formation = normalizeFormation(userQuery);
  const detectedFormation = formation !== 'Unknown' && formation !== userQuery.trim() ? formation : null;

  return {
    event_types: eventTypes,
    formation: detectedFormation,
    depth_min,
    depth_max,
    keywords: [],
    radius_m: 25000
  };
}

/**
 * Step 1: LLM Query Parsing with Schema Validation
 */
async function parseUserQuery(userQuery) {
  const apiKey = process.env.LLM_API_KEY;
  const hasValidKey = apiKey && apiKey !== 'REPLACE_WITH_YOUR_KEY';

  let rawFilter = null;

  if (hasValidKey) {
    try {
      const prompt = `
You are a database query filter parser for a petroleum engineering drilling system.
Convert the user's natural language question into a JSON object matching this schema:
{
  "event_types": ["mud_loss" | "stuck_pipe" | "overpressure" | "torque_spike" | "cementing" | "kick" | "fishing" | "npt"],
  "formation": string or null (e.g. "Hugin", "Shetland Group", "Skagerrak"),
  "depth_min": number or null (metres),
  "depth_max": number or null (metres),
  "radius_m": number (default 25000)
}

User question: "${userQuery}"
Output JSON only.
`;
      const reply = await llmClient.chat([
        { role: 'system', content: 'You convert drilling queries into JSON filter parameters. Output JSON only.' },
        { role: 'user', content: prompt }
      ], { temperature: 0 });

      const cleaned = reply.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      rawFilter = JSON.parse(cleaned);
    } catch (err) {
      console.warn('[rag] LLM query parse failed, falling back to heuristic parser:', err.message);
    }
  }

  if (!rawFilter) {
    rawFilter = parseQueryHeuristically(userQuery);
  }

  // Validate with Joi strictly before use
  const { error, value } = filterSchema.validate(rawFilter, { stripUnknown: true });
  if (error) {
    console.warn('[rag] Filter schema validation error, falling back to safe defaults:', error.message);
    return parseQueryHeuristically(userQuery);
  }

  return value;
}

/**
 * Step 2: Deterministic Database Execution from Validated Filter
 */
async function executeStructuredQuery({ filter, activeWellId }) {
  let locationGeom = null;
  if (activeWellId) {
    const locRes = await query('SELECT location FROM wells WHERE id = $1', [activeWellId]);
    if (locRes.rows.length > 0) {
      locationGeom = locRes.rows[0].location;
    }
  }

  let sql = `
    SELECT e.id, e.well_id, w.name AS well_name, w.latitude, w.longitude,
           e.event_type, e.depth, e.formation, e.description, e.mitigation,
           e.source_excerpt, e.confidence, e.needs_review
  `;

  const params = [];

  if (locationGeom) {
    params.push(locationGeom);
    sql += `, ROUND(ST_Distance(w.location::geography, $1::geography)::numeric, 1) AS distance_m`;
  }

  sql += `
    FROM events e
    JOIN wells w ON w.id = e.well_id
    WHERE 1=1
  `;

  if (locationGeom && filter.radius_m) {
    params.push(filter.radius_m);
    sql += ` AND ST_DWithin(w.location::geography, $1::geography, $${params.length})`;
  }

  if (filter.event_types && filter.event_types.length > 0) {
    params.push(filter.event_types);
    sql += ` AND e.event_type = ANY($${params.length}::text[])`;
  }

  if (filter.formation) {
    params.push(filter.formation);
    sql += ` AND (LOWER(e.formation) LIKE '%' || LOWER($${params.length}) || '%' OR LOWER($${params.length}) LIKE '%' || LOWER(e.formation) || '%')`;
  }

  if (filter.depth_min !== null && filter.depth_min !== undefined) {
    params.push(filter.depth_min);
    sql += ` AND e.depth >= $${params.length}`;
  }

  if (filter.depth_max !== null && filter.depth_max !== undefined) {
    params.push(filter.depth_max);
    sql += ` AND e.depth <= $${params.length}`;
  }

  sql += ` ORDER BY e.confidence DESC, e.depth ASC LIMIT 20`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Step 3: Grounded Summarization with Claim-Level Citations
 */
async function generateGroundedSummary(userQuery, matchedRows) {
  // Explicit zero-result handling: never hallucinate
  if (!matchedRows || matchedRows.length === 0) {
    return {
      summary: 'No matching historical events found for the specified criteria and offset well radius.',
      citations: [],
      empty_result: true
    };
  }

  // Prepare claim-level citations from matched rows
  const citations = matchedRows.map(row => ({
    claim: `${row.event_type.replace('_', ' ').toUpperCase()} at ${row.depth ? row.depth + 'm' : 'unknown depth'}: ${row.description}`,
    source_well: row.well_name,
    depth: row.depth,
    formation: row.formation,
    source_excerpt: row.source_excerpt || row.description
  }));

  const apiKey = process.env.LLM_API_KEY;
  const hasValidKey = apiKey && apiKey !== 'REPLACE_WITH_YOUR_KEY';

  if (hasValidKey) {
    try {
      const evidenceText = matchedRows.map((r, i) => `
[Record #${i+1}]
Well: ${r.well_name}
Event: ${r.event_type}
Depth: ${r.depth}m MD
Formation: ${r.formation}
Description: ${r.description}
Mitigation: ${r.mitigation}
Source Excerpt: "${r.source_excerpt}"
`).join('\n');

      const prompt = `
You are a drilling engineering assistant. Answer the user's question using ONLY the provided historical evidence below.
Do not invent any facts, numbers, or events. Reference specific wells, depths, and excerpts.

User Question: "${userQuery}"

Historical Evidence:
${evidenceText}
`;
      const summary = await llmClient.chat([
        { role: 'system', content: 'You summarize offset well drilling risks grounded strictly in retrieved historical evidence.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.1 });

      return {
        summary: summary.trim(),
        citations,
        empty_result: false
      };
    } catch (err) {
      console.warn('[rag] LLM summarization error, falling back to deterministic synthesis:', err.message);
    }
  }

  // Deterministic grounded synthesis fallback
  const wellNames = [...new Set(matchedRows.map(r => r.well_name))].join(', ');
  const types = [...new Set(matchedRows.map(r => r.event_type.replace('_', ' ')))].join(' and ');
  const depths = matchedRows.filter(r => r.depth).map(r => r.depth);
  const minD = depths.length ? Math.min(...depths) : 'N/A';
  const maxD = depths.length ? Math.max(...depths) : 'N/A';

  const summary = `Historical analysis across offset wells (${wellNames}) identified ${matchedRows.length} documented ${types} event(s) in depth range ${minD}m - ${maxD}m. Primary mitigation reported in offset records involved: ${matchedRows[0].mitigation || 'standard field practices'}.`;

  return {
    summary,
    citations,
    empty_result: false
  };
}

/**
 * Main RAG Search Entrypoint
 */
async function search({ question, wellId, radiusMeters = 25000, forceCachedFallback = false }) {
  const cleanQ = (question || '').trim().toLowerCase();

  // Check cached demo fallback (e.g. for offline demo reliability)
  const isDemoQuery = cleanQ.includes('mud loss') && (cleanQ.includes('hugin') || cleanQ.includes('2950'));
  if (forceCachedFallback || (isDemoQuery && (!process.env.LLM_API_KEY || process.env.LLM_API_KEY === 'REPLACE_WITH_YOUR_KEY'))) {
    console.log('[rag] Returning cached demo response for reliable presentation.');
    return {
      ...CACHED_DEMO_RESPONSE,
      active_well_id: wellId,
      cached_fallback_used: true
    };
  }

  // 1. Parse question to structured filter (schema validated)
  const filter = await parseUserQuery(question);
  if (radiusMeters) filter.radius_m = radiusMeters;

  // 2. Execute structured query against Postgres/PostGIS
  const matchedRows = await executeStructuredQuery({ filter, activeWellId: wellId });

  // 3. Grounded summarization with claim-level citations
  const { summary, citations, empty_result } = await generateGroundedSummary(question, matchedRows);

  return {
    question,
    validated_filter: filter,
    matched_events_count: matchedRows.length,
    matches: matchedRows,
    summary,
    citations,
    empty_result: !!empty_result,
    cached_fallback_used: false
  };
}

module.exports = {
  filterSchema,
  parseUserQuery,
  executeStructuredQuery,
  generateGroundedSummary,
  search,
  CACHED_DEMO_KEY,
  CACHED_DEMO_QUERY,
  CACHED_DEMO_RESPONSE
};
