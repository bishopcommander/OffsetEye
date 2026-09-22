/**
 * Alerts routes
 *
 * GET  /api/alerts              — list alerts for the active well
 *                                 ?well_id=&status=open|acknowledged|closed
 * PATCH /api/alerts/:id/status  — update alert status
 * POST /api/alerts/:id/feedback — log engineer feedback (feedback_log table)
 */

'use strict';

const express = require('express');
const Joi = require('joi');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();
router.use(authMiddleware);

// ── GET /api/alerts ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const schema = Joi.object({
    well_id: Joi.number().integer().required(),
    status:  Joi.string().valid('open', 'acknowledged', 'closed').optional(),
  });
  const { error, value } = schema.validate(req.query, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'Validation failed', details: error.details.map(d => d.message) });

  const { well_id, status } = value;
  try {
    let sql = `
      SELECT a.id, a.well_id, a.event_id, a.triggered_at, a.depth_at_trigger, a.status,
             e.event_type, e.depth AS event_depth, e.formation, e.description, e.mitigation,
             e.source_excerpt, e.confidence, e.needs_review
      FROM alerts a
      LEFT JOIN events e ON e.id = a.event_id
      WHERE a.well_id = $1
    `;
    const params = [well_id];
    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }
    sql += ' ORDER BY a.triggered_at DESC';
    const result = await query(sql, params);
    return res.json({ alerts: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('[alerts/list]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PATCH /api/alerts/:id/status ──────────────────────────────────────────────
const statusSchema = Joi.object({
  status: Joi.string().valid('open', 'acknowledged', 'closed').required(),
});
router.patch('/:id/status', validate(statusSchema), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid alert id' });
  try {
    const result = await query(
      'UPDATE alerts SET status = $1 WHERE id = $2 RETURNING *',
      [req.body.status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Alert not found' });
    return res.json({ alert: result.rows[0] });
  } catch (err) {
    console.error('[alerts/status]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/alerts/:id/feedback ─────────────────────────────────────────────
const feedbackSchema = Joi.object({
  action: Joi.string().valid('confirmed', 'corrected', 'overridden', 'not_relevant').required(),
});
router.post('/:id/feedback', validate(feedbackSchema), async (req, res) => {
  const alertId = parseInt(req.params.id, 10);
  if (isNaN(alertId)) return res.status(400).json({ error: 'Invalid alert id' });
  try {
    const result = await query(
      'INSERT INTO feedback_log (alert_id, user_id, action) VALUES ($1, $2, $3) RETURNING *',
      [alertId, req.user.id, req.body.action]
    );
    return res.status(201).json({ feedback: result.rows[0] });
  } catch (err) {
    console.error('[alerts/feedback]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
