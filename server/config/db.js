/**
 * Database connection pool
 *
 * Uses the pg Pool for connection reuse. All credentials are read from
 * environment variables — never hardcoded. Set these in .env (see .env.example).
 */

'use strict';

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'ertmac_nwis',
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD,
  // Keep a modest pool for a prototype; tune for production
  max:      10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool client error:', err.message);
});

/**
 * Run a parameterised query and return the result rows.
 * @param {string} text  - SQL string with $1, $2, … placeholders
 * @param {Array}  params - Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[db] query (${duration}ms) rows=${res.rowCount}`);
  }
  return res;
}

module.exports = { pool, query };
