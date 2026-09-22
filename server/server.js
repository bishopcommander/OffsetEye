/**
 * eRTMAC-NWIS — Express Server (stub)
 *
 * This file is the Phase 1 placeholder. The full server implementation
 * (routes, middleware, services, DB connection) is built in Phase 3.
 *
 * IMPORTANT: This prototype uses public international datasets (Volve, Sodir,
 * FORCE 2020, 3W, Texas RRC) as technical analogues for OIL operational data,
 * which is not publicly available. The architecture is designed so OIL's
 * internal WCR/DDR/eRTMAC data can replace these at deployment.
 */

'use strict';

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', phase: 1, message: 'Phase 1 stub — full server coming in Phase 3' });
});

app.listen(PORT, () => {
  console.log(`eRTMAC-NWIS server stub listening on port ${PORT}`);
});

module.exports = app;
