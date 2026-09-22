/**
 * Wells routes
 *
 * GET  /api/wells              — list all wells (auth required)
 * GET  /api/wells/:id          — single well metadata
 * GET  /api/wells/:id/events   — historical events for a well
 * GET  /api/wells/nearby       — ST_DWithin radius search
 *                                ?lat=&lng=&radius_m=&formation=
 */

'use strict';

const express = require('express');
const Joi = require('joi');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

// ── GET /api/wells ─────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, name, latitude, longitude, formation, current_depth, planned_depth
       FROM wells ORDER BY name`,
      []
    );
    return res.json({ wells: result.rows });
  } catch (err) {
    console.error('[wells/list]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/wells/nearby ──────────────────────────────────────────────────────
router.get('/nearby', async (req, res) => {
  const schema = Joi.object({
    lat:        Joi.number().min(-90).max(90).required(),
    lng:        Joi.number().min(-180).max(180).required(),
    radius_m:   Joi.number().min(100).max(500000).default(25000),
    formation:  Joi.string().optional(),
  });
  const { error, value } = schema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map(d => d.message) });
  }
  const { lat, lng, radius_m, formation } = value;
  try {
    let sql = `
      SELECT w.id, w.name, w.latitude, w.longitude, w.formation, w.current_depth, w.planned_depth,
             ST_Distance(w.location::geography, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography) AS dist_m,
             COUNT(e.id)::int AS event_count,
             array_agg(DISTINCT e.event_type) FILTER (WHERE e.event_type IS NOT NULL) AS event_types
      FROM wells w
      LEFT JOIN events e ON e.well_id = w.id
      WHERE ST_DWithin(w.location::geography, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography, $3)
    `;
    const params = [lat, lng, radius_m];
    if (formation) {
      params.push(formation);
      sql += ` AND LOWER(w.formation) = LOWER($${params.length})`;
    }
    sql += ' GROUP BY w.id ORDER BY dist_m';
    const result = await query(sql, params);
    return res.json({ wells: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('[wells/nearby]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/wells/:id ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid well id' });
  try {
    const well = await query('SELECT * FROM wells WHERE id = $1', [id]);
    if (well.rows.length === 0) return res.status(404).json({ error: 'Well not found' });

    const formations = await query(
      'SELECT formation, top_depth, bottom_depth, lithology FROM formations WHERE well_id = $1 ORDER BY top_depth',
      [id]
    );
    return res.json({ well: well.rows[0], formations: formations.rows });
  } catch (err) {
    console.error('[wells/:id]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/wells/:id/events ──────────────────────────────────────────────────
router.get('/:id/events', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid well id' });
  try {
    const result = await query(
      `SELECT id, event_type, depth, formation, description, mitigation,
              source_excerpt, confidence, needs_review
       FROM events WHERE well_id = $1 ORDER BY depth`,
      [id]
    );
    return res.json({ events: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('[wells/:id/events]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
