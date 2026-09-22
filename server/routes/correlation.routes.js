/**
 * Correlation & Risk Analytics routes
 *
 * GET /api/correlation/:well_id — get correlation and risk analytics for well
 * GET /api/correlation/risk-summary/:well_id — get latest risk summary records
 */

'use strict';

const express = require('express');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');
const { correlateNearbyRisks } = require('../services/correlation.service');

const router = express.Router();
router.use(authMiddleware);

// ── GET /api/correlation/:well_id ──────────────────────────────────────────────
router.get('/:well_id', async (req, res) => {
  const wellId = parseInt(req.params.well_id, 10);
  if (isNaN(wellId)) return res.status(400).json({ error: 'Invalid well_id' });

  try {
    let depth = req.query.depth ? parseFloat(req.query.depth) : null;
    if (!depth) {
      const wellRes = await query('SELECT current_depth FROM wells WHERE id = $1', [wellId]);
      if (wellRes.rows.length === 0) return res.status(404).json({ error: 'Well not found' });
      depth = wellRes.rows[0].current_depth || 2950;
    }

    const depthWindow = req.query.window ? parseFloat(req.query.window) : 50;
    const radiusMeters = req.query.radius ? parseFloat(req.query.radius) : 25000;

    const result = await correlateNearbyRisks({
      wellId,
      currentDepth: depth,
      depthWindow,
      radiusMeters
    });

    return res.json(result);
  } catch (err) {
    console.error('[correlation/get]', err.message);
    return res.status(500).json({ error: 'Correlation failed', details: err.message });
  }
});

// ── GET /api/correlation/risk-summary/:well_id ──────────────────────────────────
router.get('/risk-summary/:well_id', async (req, res) => {
  const wellId = parseInt(req.params.well_id, 10);
  if (isNaN(wellId)) return res.status(400).json({ error: 'Invalid well_id' });

  try {
    const result = await query(`
      SELECT id, well_id, depth_window_start, depth_window_end, risk_category, matched_count, flag
      FROM risk_summary
      WHERE well_id = $1
      ORDER BY id DESC
      LIMIT 16
    `, [wellId]);
    return res.json({ risk_summaries: result.rows });
  } catch (err) {
    console.error('[correlation/risk-summary]', err.message);
    return res.status(500).json({ error: 'Failed to fetch risk summary', details: err.message });
  }
});

module.exports = router;
