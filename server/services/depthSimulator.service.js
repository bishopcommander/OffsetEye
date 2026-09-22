/**
 * Depth Simulator Service
 *
 * Simulates a live depth feed for the active well in this public-data prototype.
 * In an OIL deployment this is replaced by the real eRTMAC real-time drilling stream.
 * This is explicitly NOT a real-time integration — it is labeled as simulated everywhere.
 *
 * POST /api/depth/update  — set current depth (manual slider or auto-increment)
 * GET  /api/depth/:well_id — get last known simulated depth for a well
 *
 * On each depth update, the correlation service is triggered to re-check risk windows.
 */

'use strict';

const express = require('express');
const Joi = require('joi');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { correlateNearbyRisks } = require('./correlation.service');

const router = express.Router();
router.use(authMiddleware);

const depthSchema = Joi.object({
  well_id: Joi.number().integer().required(),
  depth_m: Joi.number().min(0).max(15000).required(),
  depth_window: Joi.number().min(10).max(500).default(50),
  radius_m: Joi.number().min(100).max(500000).default(25000)
});

// ── POST /api/depth/update ─────────────────────────────────────────────────────
router.post('/update', validate(depthSchema), async (req, res) => {
  const { well_id, depth_m, depth_window, radius_m } = req.body;
  try {
    // 1. Update current_depth on the well record
    await query('UPDATE wells SET current_depth = $1 WHERE id = $2', [depth_m, well_id]);

    // 2. Trigger deterministic correlation check & risk analytics
    const correlationResult = await correlateNearbyRisks({
      wellId: well_id,
      currentDepth: depth_m,
      depthWindow: depth_window,
      radiusMeters: radius_m
    });

    return res.json({
      well_id,
      depth_m,
      simulated: true,
      note: 'Simulated feed — not a live eRTMAC connection. Replace with real stream at OIL deployment.',
      correlation: correlationResult
    });
  } catch (err) {
    console.error('[depth/update]', err.message);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ── GET /api/depth/:well_id ────────────────────────────────────────────────────
router.get('/:well_id', async (req, res) => {
  const well_id = parseInt(req.params.well_id, 10);
  if (isNaN(well_id)) return res.status(400).json({ error: 'Invalid well_id' });
  try {
    const result = await query('SELECT id, name, current_depth FROM wells WHERE id = $1', [well_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Well not found' });
    return res.json({ ...result.rows[0], simulated: true });
  } catch (err) {
    console.error('[depth/get]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
