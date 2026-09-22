/**
 * Documents routes — upload, OCR & extraction pipeline
 *
 * POST /api/documents/upload — upload PDF/scan, trigger extraction pipeline
 * GET  /api/documents/:well_id — list documents for well
 */

'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');
const { processDocumentExtraction } = require('../services/extraction.service');

const router = express.Router();
router.use(authMiddleware);

// Configure multer for disk storage
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Permitted: ${allowed.join(', ')}`));
    }
  }
});

// ── POST /api/documents/upload ────────────────────────────────────────────────
router.post('/upload', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Attach field "document".' });
  }

  const well_id = parseInt(req.body.well_id, 10);
  if (isNaN(well_id)) {
    return res.status(400).json({ error: 'Missing or invalid well_id' });
  }

  const doc_type = req.body.doc_type || 'WCR';

  try {
    const result = await processDocumentExtraction({
      well_id,
      filePath: req.file.path,
      doc_type
    });

    return res.status(201).json({
      message: 'Document processed successfully',
      document_id: result.document_id,
      ocr_confidence: result.ocr_confidence,
      events_extracted: result.events.length,
      formations_extracted: result.formations.length,
      needs_review_count: result.needs_review_count,
      status: result.status,
      events: result.events,
      formations: result.formations
    });
  } catch (err) {
    console.error('[documents/upload] Error:', err);
    return res.status(500).json({ error: 'Extraction pipeline failed', details: err.message });
  }
});

// ── GET /api/documents/:well_id ────────────────────────────────────────────────
router.get('/:well_id', async (req, res) => {
  const well_id = parseInt(req.params.well_id, 10);
  if (isNaN(well_id)) return res.status(400).json({ error: 'Invalid well_id' });

  try {
    const result = await query(
      `SELECT d.id, d.well_id, d.file_path, d.doc_type, d.upload_date, d.ocr_confidence,
              COUNT(e.id) AS events_count,
              COUNT(CASE WHEN e.needs_review THEN 1 END) AS needs_review_count
       FROM documents d
       LEFT JOIN events e ON e.document_id = d.id
       WHERE d.well_id = $1
       GROUP BY d.id
       ORDER BY d.upload_date DESC`,
      [well_id]
    );
    return res.json({ documents: result.rows });
  } catch (err) {
    console.error('[documents/list] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
