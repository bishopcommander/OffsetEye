/**
 * Search routes — natural-language query → RAG pipeline
 *
 * POST /api/search   — NL question → validated filter → SQL → grounded summary
 *
 * The full RAG implementation lives in rag.service.js (Phase 6).
 * This route is a stub that returns a structured placeholder until Phase 6.
 */

'use strict';

const express = require('express');
const Joi = require('joi');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();
router.use(authMiddleware);

const searchSchema = Joi.object({
  question:   Joi.string().min(3).max(1000).required(),
  well_id:    Joi.number().integer().optional(),
  radius_m:   Joi.number().min(100).max(500000).default(25000),
});

// ── POST /api/search ───────────────────────────────────────────────────────────
router.post('/', validate(searchSchema), async (req, res) => {
  // Phase 6 will replace this stub with the full RAG pipeline
  return res.status(501).json({
    message: 'RAG search not yet implemented — coming in Phase 6',
    received: req.body,
  });
});

module.exports = router;
