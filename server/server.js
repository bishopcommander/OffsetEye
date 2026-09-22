/**
 * eRTMAC-NWIS — Express Server (Phase 3: full implementation)
 *
 * IMPORTANT — data governance note:
 * This prototype uses public international datasets (Volve, Sodir, FORCE 2020,
 * 3W, Texas RRC) as technical analogues for OIL operational data, which is not
 * publicly available. The LLM client sends document text to a third-party API —
 * acceptable only because no real OIL data is used. See llmClient.js for details.
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

// Routes
const authRoutes   = require('./routes/auth.routes');
const wellsRoutes  = require('./routes/wells.routes');
const alertsRoutes = require('./routes/alerts.routes');
const searchRoutes    = require('./routes/search.routes');
const documentsRoutes   = require('./routes/documents.routes');
const correlationRoutes = require('./routes/correlation.routes');
const depthRouter       = require('./services/depthSimulator.service');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security & utility middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limit — 200 req / 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ── Health check (unauthenticated) ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    phase: 3,
    service: 'eRTMAC-NWIS API',
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/wells',  wellsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/search',      searchRoutes);
app.use('/api/documents',   documentsRoutes);
app.use('/api/correlation', correlationRoutes);
app.use('/api/depth',       depthRouter);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`eRTMAC-NWIS server running on http://localhost:${PORT}`);
  console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  LLM provider: ${process.env.LLM_PROVIDER || 'openai (default)'}`);
});

module.exports = app;
