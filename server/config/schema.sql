-- eRTMAC-NWIS — Phase 2 Database Schema
-- Run against the ertmac_nwis database after:
--   createdb ertmac_nwis
--   psql -U postgres -d ertmac_nwis -c "CREATE EXTENSION IF NOT EXISTS postgis;"
--   psql -U postgres -d ertmac_nwis -c "CREATE EXTENSION IF NOT EXISTS vector;"
--
-- Then: psql -U postgres -d ertmac_nwis -f server/config/schema.sql

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'engineer'  -- engineer | admin
);

-- ─── Wells ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wells (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  -- PostGIS geometry column for fast radius queries
  location      geometry(Point, 4326),
  formation     TEXT,
  current_depth DOUBLE PRECISION,   -- metres MD
  planned_depth DOUBLE PRECISION    -- metres MD
);

-- GiST index for ST_DWithin performance
CREATE INDEX IF NOT EXISTS wells_location_gist ON wells USING GIST (location);

-- ─── Well trajectory (stub for MVP; real survey data is Version 2) ─────────────
-- The MVP uses measured depth as the primary correlation axis.
-- Directional trajectory support is represented here so v2 can add real
-- directional-survey data without a schema change.
CREATE TABLE IF NOT EXISTS well_trajectory (
  id               SERIAL PRIMARY KEY,
  well_id          INTEGER NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  measured_depth   DOUBLE PRECISION NOT NULL,  -- metres
  inclination      DOUBLE PRECISION,            -- degrees from vertical
  azimuth          DOUBLE PRECISION,            -- degrees
  true_vertical_depth DOUBLE PRECISION         -- metres TVD
);

-- ─── Formations (formation tops/bottoms per well) ─────────────────────────────
CREATE TABLE IF NOT EXISTS formations (
  id          SERIAL PRIMARY KEY,
  well_id     INTEGER NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  formation   TEXT NOT NULL,
  top_depth   DOUBLE PRECISION,    -- metres MD
  bottom_depth DOUBLE PRECISION,   -- metres MD
  lithology   TEXT
);

-- ─── Documents ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id             SERIAL PRIMARY KEY,
  well_id        INTEGER NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  file_path      TEXT NOT NULL,
  doc_type       TEXT,              -- WCR | DDR | mud_log | other
  upload_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ocr_confidence DOUBLE PRECISION   -- 0–1; NULL if born-digital PDF
);

-- ─── Events ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id             SERIAL PRIMARY KEY,
  well_id        INTEGER NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  document_id    INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  event_type     TEXT NOT NULL,     -- mud_loss | stuck_pipe | overpressure | torque_spike | cementing | kick | fishing | npt
  depth          DOUBLE PRECISION,  -- metres MD
  formation      TEXT,
  description    TEXT,
  mitigation     TEXT,
  source_excerpt TEXT,              -- verbatim extract used to produce this record
  confidence     DOUBLE PRECISION,  -- 0–1; set by extraction pipeline
  needs_review   BOOLEAN NOT NULL DEFAULT FALSE  -- true if confidence low or schema invalid
);

-- ─── Well parameters (thin WITSML slice) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS well_parameters (
  id                 SERIAL PRIMARY KEY,
  well_id            INTEGER NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  depth              DOUBLE PRECISION,   -- metres MD
  rpm                DOUBLE PRECISION,
  wob                DOUBLE PRECISION,   -- weight on bit (kN)
  torque             DOUBLE PRECISION,   -- kNm
  rop                DOUBLE PRECISION,   -- rate of penetration (m/hr)
  mud_weight         DOUBLE PRECISION,   -- kg/m³ or ppg
  flow_rate          DOUBLE PRECISION,   -- l/min
  standpipe_pressure DOUBLE PRECISION    -- bar or psi
);

-- ─── Embeddings (pgvector) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS embeddings (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER REFERENCES events(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  -- 1536 dims for text-embedding-ada-002; adjust if using a different model
  vector      vector(1536),
  CONSTRAINT embeddings_must_ref_one CHECK (
    (event_id IS NOT NULL AND document_id IS NULL) OR
    (event_id IS NULL AND document_id IS NOT NULL)
  )
);

-- ─── Risk summary (output of frequency/counting analytics layer) ──────────────
CREATE TABLE IF NOT EXISTS risk_summary (
  id                  SERIAL PRIMARY KEY,
  well_id             INTEGER NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  depth_window_start  DOUBLE PRECISION NOT NULL,
  depth_window_end    DOUBLE PRECISION NOT NULL,
  risk_category       TEXT NOT NULL,   -- mud_loss | stuck_pipe | overpressure | torque_spike | cementing | kick | npt
  matched_count       INTEGER NOT NULL DEFAULT 0,
  flag                TEXT NOT NULL DEFAULT 'normal'  -- elevated | normal
);

-- ─── Alerts ───────────────────────────────────────────────────────────────────
-- Alerts are fired by the deterministic correlation logic reading from risk_summary,
-- NOT directly from raw correlation matches.
CREATE TABLE IF NOT EXISTS alerts (
  id               SERIAL PRIMARY KEY,
  well_id          INTEGER NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  event_id         INTEGER REFERENCES events(id) ON DELETE SET NULL,
  triggered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  depth_at_trigger DOUBLE PRECISION,
  status           TEXT NOT NULL DEFAULT 'open'  -- open | acknowledged | closed
);

-- ─── Feedback log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback_log (
  id        SERIAL PRIMARY KEY,
  alert_id  INTEGER REFERENCES alerts(id) ON DELETE SET NULL,
  user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action    TEXT NOT NULL,   -- confirmed | corrected | overridden | not_relevant
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
