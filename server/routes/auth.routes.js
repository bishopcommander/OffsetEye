/**
 * Auth routes — register & login
 *
 * POST /api/auth/register  — create a new user account
 * POST /api/auth/login     — verify credentials, return JWT
 *
 * Passwords are hashed with bcrypt (cost factor 12).
 * JWTs are signed with process.env.JWT_SECRET, expire per JWT_EXPIRES_IN.
 */

'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { query } = require('../config/db');
const validate = require('../middleware/validate.middleware');

const router = express.Router();
const SALT_ROUNDS = 12;

// ── Joi schemas ────────────────────────────────────────────────────────────────
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('engineer', 'admin').default('engineer'),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post('/register', validate(registerSchema), async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hash, role]
    );
    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('[auth/register]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await query('SELECT id, username, password_hash, role FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
