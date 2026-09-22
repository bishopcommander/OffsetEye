# eRTMAC-NWIS — Detailed System Architecture (MERN Stack)

## 1. High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React SPA)                         │
│  Login · Well selector · Leaflet map · Search box · Depth slider ·      │
│  Alert panel · Evidence drill-down · Feedback logging                   │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │ REST/JSON over HTTPS (JWT in header)
┌───────────────────────────────────▼───────────────────────────────────────┐
│                    EXPRESS API GATEWAY (Node.js)                        │
│  - Auth middleware (JWT verify)                                         │
│  - Request validation (Joi/Zod)                                         │
│  - Rate limiting                                                        │
│  - Routes to service modules below                                      │
└──────┬───────────────┬────────────────┬───────────────┬─────────────────┘
       │               │                │               │
       ▼               ▼                ▼               ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐
│ INGESTION & │ │  RAG / QUERY │ │ CORRELATION  │ │  LIVE DEPTH        │
│ EXTRACTION  │ │  SERVICE     │ │ & ALERTING   │ │  SIMULATOR         │
│ SERVICE     │ │              │ │ SERVICE      │ │                    │
└──────┬──────┘ └──────┬───────┘ └──────┬───────┘ └─────────┬──────────┘
       │               │                │                   │
       └───────────────┴────────┬───────┴───────────────────┘
                                 ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         DATA & STORAGE LAYER                           │
│  PostgreSQL (single instance)                                          │
│    + PostGIS   → well coordinates, ST_DWithin radius queries           │
│    + pgvector  → document embeddings for narrative/semantic search     │
│    + plain tables → structured events, users, simulated depth log      │
│  Local filesystem → raw PDF/scan storage                               │
│  Redis (optional) → cached demo query results, session store           │
└───────────────────────────────────────┬────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL PLUGS (swappable integrations)             │
│  LLM API (OpenAI / Anthropic / Gemini) → extraction, query parsing,    │
│    summarization                                                       │
│  OCR fallback (Google Document AI / LlamaParse, free tier)             │
│  Map tiles (OpenStreetMap via Leaflet)                                 │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component breakdown

### 2.1 Client — React SPA

| Aspect | Detail |
|---|---|
| Stack | React + React Router + Leaflet.js (map) + Axios (HTTP) |
| State | React Context or Zustand for active well / session state — Redux is overkill at this scale |
| Screens | Login, Dashboard (map + well selector + radius slider), Search panel, Alert history, Evidence drill-down modal |
| Talks to | Express API only — never touches Postgres or the LLM API directly |
| Auth | Stores JWT in memory (not localStorage, to reduce XSS exposure); attaches as `Authorization: Bearer <token>` |

### 2.2 Express API gateway

| Aspect | Detail |
|---|---|
| Stack | Node.js + Express + `jsonwebtoken` + `joi` (validation) + `helmet` + `cors` |
| Responsibilities | Auth check, request shape validation, routing to service modules, centralized error handling |
| Does NOT | Contain business logic itself — it's a thin router, not a monolith controller |
| Structure | `/routes`, `/middleware`, `/services` (see folder structure in §6) |

### 2.3 Ingestion & extraction service

| Aspect | Detail |
|---|---|
| Responsibilities | Accept raw PDF/scan uploads → parse → OCR if needed → LLM extraction → write structured events to Postgres |
| Libraries | `pdf-parse` (born-digital PDFs), `tesseract.js` (OCR), LLM SDK (extraction call) |
| Input | PDF/image file, well_id |
| Output | Structured event record: `{well_id, depth, formation, event_type, description, mitigation, source_doc_ref, confidence}` |
| Failure mode handling | If OCR confidence is low or extraction returns malformed JSON, flag the record as `needs_review` instead of silently accepting it — surface this in the UI rather than hiding it |

### 2.4 RAG / query service

| Aspect | Detail |
|---|---|
| Responsibilities | Turn a natural-language question into a validated structured filter, run it deterministically, summarize only the matched rows |
| Pipeline | (1) LLM call → structured filter object, validated against a fixed JSON schema before use → (2) PostGIS `ST_DWithin` geospatial filter → (3) SQL `WHERE` filter on event_type/depth/formation → (4) if empty, return "no matching events found" (a real, reachable path) → (5) LLM summarization call, grounded only in the filtered rows → (6) attach claim-level citations back to source excerpts |
| Guardrail | The LLM's output at step (1) is treated as untrusted input — it never writes or executes SQL directly, only populates a schema-validated object |
| Caching | Cache the demo query + response pair so the live demo doesn't depend on a live LLM call succeeding on stage |

### 2.5 Correlation & alerting service

| Aspect | Detail |
|---|---|
| Responsibilities | Match active well's current depth/formation against structured historical events from nearby wells; fire alerts when the simulated depth crosses into a matched risk window |
| Logic | Deterministic — formation-name/synonym match + a depth window (e.g. ±50m). Not a trained model. |
| Output | Ranked list of matched events; an alert record with attached evidence when triggered |
| Why deterministic | Per the project's own Safe AI research — this is the one place a false/opaque AI judgment would be least forgivable, so it isn't AI at all |

### 2.6 Live depth simulator

| Aspect | Detail |
|---|---|
| Responsibilities | UI-driven depth value (slider or auto-increment) written to a timestamped Postgres table; re-triggers the correlation check on each change |
| Explicitly | Labeled in the UI as a simulated feed, never presented as a live eRTMAC connection |
| Infra | No Kafka/streaming needed — plain polling or a WebSocket push from Express to the client is enough at this scale |

### 2.7 Data & storage layer

| Store | Purpose |
|---|---|
| PostgreSQL + PostGIS | Well coordinates, radius queries (`ST_DWithin`) |
| PostgreSQL + pgvector | Document embeddings for narrative/semantic search, scoped narrowly (never for enforcing hard constraints) |
| PostgreSQL plain tables | Structured events, users, alerts, simulated depth log, feedback/override log |
| Local filesystem | Raw PDF/scan storage — swap for S3-compatible storage only if you outgrow prototype scale |
| Redis (optional) | Cached demo responses, session/rate-limit store |

---

## 3. Integration points ("plugs")

These are the swappable external dependencies — designed so any one of them can be replaced without touching the rest of the system:

| Plug | Default choice | Swap-in alternative | Notes |
|---|---|---|---|
| LLM API | OpenAI or Anthropic (whichever the team has credits for) | Gemini, or a self-hosted open model | Isolate all LLM calls behind one `llmClient` module so switching providers is a one-file change |
| OCR | Tesseract.js (free, self-hosted) | Google Document AI / LlamaParse (better on degraded scans, costs money, sends data off-machine) | Use the paid option live for exactly one demo document to show the accuracy contrast honestly |
| Map tiles | OpenStreetMap via Leaflet | Mapbox | No API key friction with OSM — safer for a live demo |
| Vector search | pgvector (same Postgres instance) | Dedicated vector DB (Qdrant/Pinecone) | Only worth it if corpus size genuinely exceeds pgvector's comfortable range |
| File storage | Local disk | S3-compatible object storage | Move to this the moment you need multi-instance deployment |

---

## 4. End-to-end workflow (request-level sequence)

1. **Engineer logs in** → Client sends credentials → Express verifies → returns JWT.
2. **Selects active well** → Client requests well metadata → Express queries Postgres → returns name/coordinates/depth.
3. **Map renders** → Client plots active well via Leaflet using returned coordinates.
4. **Radius query** → Client sends radius value → Express runs `ST_DWithin` against PostGIS → returns nearby wells.
5. **Formation filter** → Express filters nearby wells by matching/synonym formation name → returns "relevant" subset.
6. **Historical events load** → Express queries the events table for the relevant wells → returns event list to Client.
7. **Engineer asks a question** → Client sends natural-language query → RAG service: LLM parses to structured filter (schema-validated) → PostGIS + SQL filter executes → if matches exist, LLM summarizes grounded only in those rows → claim-level citations attached → response returned to Client.
8. **Depth slider moves** → Client posts new depth value → Correlation service re-checks against matched risk windows.
9. **Risk zone crossed** → Correlation service fires an alert with its supporting evidence → pushed to Client (poll or WebSocket).
10. **Engineer inspects alert** → Client requests "why this alert" detail → Express returns matching parameters + source excerpt.
11. **Engineer drills into mitigation** → Client requests full mitigation text + source document link.
12. **Engineer logs a decision** → Client posts an annotation (reviewed/acted on/not relevant) → Express writes to the feedback/override log — this closes the loop and also feeds the automation-complacency check (rising override rate = a signal to recalibrate, not a bug).

---

## 5. Database schema (core tables)

```
wells
  id, name, latitude, longitude, formation, current_depth, planned_depth

documents
  id, well_id (FK), file_path, doc_type, upload_date, ocr_confidence

events
  id, well_id (FK), document_id (FK), event_type, depth, formation,
  description, mitigation, source_excerpt, confidence, needs_review (bool)

embeddings
  id, event_id (FK) or document_id (FK), vector (pgvector column)

alerts
  id, well_id (FK), event_id (FK), triggered_at, depth_at_trigger, status

feedback_log
  id, alert_id (FK), user_id (FK), action (confirmed/corrected/overridden), timestamp

users
  id, username, password_hash, role
```

Geospatial column: `wells.location` as a PostGIS `geometry(Point, 4326)`, indexed with a GiST index for fast `ST_DWithin` queries.

---

## 6. Suggested folder structure

```
/client                      React app
  /src
    /components
    /pages
    /services (API calls)
    /context or /store

/server                      Express app
  /routes
    auth.routes.js
    wells.routes.js
    search.routes.js
    alerts.routes.js
  /services
    extraction.service.js
    rag.service.js
    correlation.service.js
    depthSimulator.service.js
    llmClient.js             (single point of contact with the LLM API)
  /middleware
    auth.middleware.js
    validate.middleware.js
  /models                    (Postgres queries — raw SQL or Prisma/Sequelize)
  /config
    db.js
  server.js
```

---

## 7. Demo-day resilience notes

- Pre-run and cache the flagship natural-language query response — don't depend on a live LLM call succeeding on stage.
- Pin the LLM provider and confirm API key rate limits/headroom well before the event.
- Keep a small, hand-built formation-synonym lookup table — Layer 5/7's correlation logic depends on it, and it's cheap to build.
- Have a visible `needs_review` state in the UI for low-confidence extractions rather than silently failing.
