/**
 * Search routes — natural-language query → RAG pipeline (Phase 6)
 *
 * POST /api/search — NL question → validated filter → SQL → grounded summary
 */

'use strict';

const express = require('express');
const Joi = require('joi');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { search } = require('../services/rag.service');

const router = express.Router();
router.use(authMiddleware);

const searchSchema = Joi.object({
  question:             Joi.string().min(3).max(1000).required(),
  well_id:              Joi.number().integer().optional(),
  radius_m:             Joi.number().min(100).max(500000).default(25000),
  force_cached_fallback: Joi.boolean().default(false)
});

// ── POST /api/search ───────────────────────────────────────────────────────────
router.post('/', validate(searchSchema), async (req, res) => {
  try {
    const { question, well_id, radius_m, force_cached_fallback } = req.body;
    const result = await search({
      question,
      wellId: well_id,
      radiusMeters: radius_m,
      forceCachedFallback: force_cached_fallback
    });
    return res.json(result);
  } catch (err) {
    console.error('[search/query] Error:', err);
    return res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

module.exports = router;
