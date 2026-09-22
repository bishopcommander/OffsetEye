/**
 * Prognosis routes — Pre-spud hazard forecast & new well offset scan
 *
 * POST /api/prognosis/scan  — scan offset wells for a proposed location and depth
 * GET  /api/prognosis/quick — quick scan using active field coordinates
 */

'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { prognosisInputSchema, generateNewWellPrognosis } = require('../services/prognosis.service');

const router = express.Router();
router.use(authMiddleware);

// ── POST /api/prognosis/scan ──────────────────────────────────────────────────
router.post('/scan', validate(prognosisInputSchema), async (req, res) => {
  try {
    const { latitude, longitude, planned_depth, radius_m, well_name } = req.body;
    const result = await generateNewWellPrognosis({
      latitude,
      longitude,
      planned_depth,
      radius_m,
      well_name
    });
    return res.json(result);
  } catch (err) {
    console.error('[prognosis/scan] Error:', err);
    return res.status(500).json({ error: 'Prognosis scan failed', details: err.message });
  }
});

// ── GET /api/prognosis/quick ──────────────────────────────────────────────────
router.get('/quick', async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : 58.445;
    const lng = req.query.lng ? parseFloat(req.query.lng) : 1.890;
    const depth = req.query.depth ? parseFloat(req.query.depth) : 3600;
    const radius = req.query.radius ? parseFloat(req.query.radius) : 15000;
    const name = req.query.name || 'Proposed Appraisal Well 15/9-X';

    const result = await generateNewWellPrognosis({
      latitude: lat,
      longitude: lng,
      planned_depth: depth,
      radius_m: radius,
      well_name: name
    });
    return res.json(result);
  } catch (err) {
    console.error('[prognosis/quick] Error:', err);
    return res.status(500).json({ error: 'Quick prognosis failed', details: err.message });
  }
});

module.exports = router;
