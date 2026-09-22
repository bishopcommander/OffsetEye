# eRTMAC-NWIS — AGENTS.md (Build Instructions)

This file is the operating manual for an AI coding agent (or a human) building this project. It defines **what** to build, **when** to build it, and **how to know it's done**. Read this whole file before writing any code. Execute phases in order — do not skip ahead, and do not start a phase whose prerequisites aren't met.

For the project overview, problem statement, and demo narrative, see `README.md`. This file is implementation detail only.

---

## 0. Project summary

eRTMAC-NWIS is a drilling-risk decision-support prototype built for Oil India Limited (OIL). OIL's existing eRTMAC system provides real-time drilling data, but decisions in geologically complex formations also need historical knowledge from nearby/offset wells — currently locked inside scattered PDFs (WCRs, DDRs) and individual engineers' memory, which slows decisions and causes missed proactive risk mitigation. NWIS is a **standalone decision-support platform alongside eRTMAC**, not a replacement for it — an "institutional memory" layer.

It ingests historical well documents, extracts structured events (mud loss, stuck pipe, overpressure, torque spikes, cementing issues, kicks, fishing operations, NPT), and lets an engineer query nearby/analogous wells in natural language to surface relevant historical risk evidence before continuing to drill. AI assists retrieval and summarization; it never makes the final decision, and never executes a query directly — every AI output that reaches a data query is schema-validated first.

**Official required capabilities** (from the OIL problem statement):
1. Map-based visualization of nearby wells within a user-defined radius
2. Instant access to historical drilling experiences/events from offset wells
3. Correlation of drilling parameters, reservoir characteristics, mud losses, kicks, stuck pipe, casing/cementing programs, and formation-specific risks across wells
4. Proactive alerts when current operations approach depths/formations where similar challenges occurred nearby
5. A searchable knowledge repository of drilling events, lessons learned, and mitigation measures
6. Predictive analytics for mud losses, stuck pipe, overpressure, torque spikes, cementing issues, based on offset-well behavior
7. A user-friendly dashboard for both field and office personnel

**Data sources referenced in the problem statement** (real production sources — the prototype substitutes public analogues where these aren't accessible; see §4, Core database schema):
Well Completion Reports (WCRs), Daily Drilling Reports (DDRs), drilling/mud-logging databases, historical well parameters, reservoir/geological data, eRTMAC data streams, **well trajectory and survey data**, casing/cementing/mud program records, and historical event records including mud losses, kicks, stuck pipe, **fishing operations**, and NPT events.

> **Known scope gap:** public datasets provide only partial coverage of the data types the OIL problem statement names. Volve is genuinely strong on real-time drilling records, well logs, and reports; FORCE 2020 provides well X/Y position and NPD lithostratigraphy alongside its logs. What none of them provide is OIL-specific WCR/DDR-style operational narrative, fishing-operation histories, or directional-survey data at the depth this project needs. Say this plainly if asked: *"OIL operational data isn't publicly available to us, so the prototype uses public international datasets as technical analogues. The architecture is designed so OIL's internal WCR/DDR/eRTMAC data can replace them at deployment."*

**Non-negotiable design rules** (apply to every phase):
1. The correlation/alerting logic that fires a risk alert is **deterministic** (rule-based formation + depth match) — never an LLM judgment call.
2. Any LLM call that produces a filter/query is treated as **untrusted input**: validate its JSON against a fixed schema before it touches SQL. Never let an LLM construct or execute SQL directly.
3. Every extracted fact stored in `events` must carry a `source_excerpt` and `confidence`. Low-confidence or malformed extractions get `needs_review = true`, not silently dropped or silently accepted.
4. Summaries must be grounded only in retrieved rows — no answer without matching evidence. An empty-result case ("no matching events found") is a valid, expected output, not an error.
5. No deep learning. Use rule-based/classical methods (or none at all) unless a phase explicitly calls for scikit-learn-style classical ML.
6. Document text and embeddings are sent to a third-party LLM API. This is acceptable specifically because this prototype's data is public/synthetic (Volve, Sodir, 3W, Texas RRC) — never real OIL data. State this explicitly wherever `llmClient.js` is documented or discussed. A real OIL deployment would need this reconsidered (self-hosted embeddings/LLM), and that reconsideration is a data-governance decision for OIL to make, not a default to build around now.

---

## 1. Tech stack

- **Frontend:** React + Leaflet.js (map) + Axios
- **Backend:** Node.js + Express
- **Database:** PostgreSQL with PostGIS (geospatial) + pgvector (embeddings) — one instance, no separate vector DB
- **OCR:** Tesseract.js, with a paid OCR API as a documented fallback only
- **LLM:** one provider (OpenAI/Anthropic/Gemini), called only through `/server/services/llmClient.js` — never call the LLM API directly from another file. Sends document text/embeddings to a third party; acceptable here only because this prototype uses public/synthetic data, not real OIL data (see design rule 6 above).
- **Auth:** JWT via `jsonwebtoken` + `bcrypt`

Do not introduce Kafka, a separate vector database, microservices, or deep learning frameworks. If a task seems to need one of these, stop and flag it rather than adding it — it's very likely the task can be solved more simply within this stack.

---

## 2. Folder structure to create

```
/client                      React app
  /src/components
  /src/pages
  /src/services               (API calls to backend)
  /src/context                (or /store)

/server                      Express app
  /routes
  /services
    llmClient.js              (single point of contact with the LLM API)
    extraction.service.js
    rag.service.js
    correlation.service.js
    depthSimulator.service.js
  /middleware
  /models                     (Postgres queries)
  /config
    db.js
  server.js
```

---

## 3. Build phases

Work through these in order. Each phase has a **Definition of Done** — do not move to the next phase until every item in it is true. If a Definition-of-Done item can't be satisfied, stop and report why rather than proceeding.

### Phase 1 — Environment & repo setup
**When:** first, before any code.
**Do:**
- Verify Node.js and PostgreSQL are installed.
- Initialize the project folder and `git init`.
**Definition of done:** `node -v` and `psql --version` both return valid versions; an empty git repo exists with an initial commit.

### Phase 2 — Database schema
**When:** after Phase 1 is done.
**Do:**
- `createdb ertmac_nwis`
- `CREATE EXTENSION postgis;` and `CREATE EXTENSION vector;`
- Create tables: `wells`, `documents`, `events`, `embeddings`, `alerts`, `feedback_log`, `users`, `well_trajectory` (see schema in §4).
- Add a `geometry(Point, 4326)` column on `wells.location` with a GiST index.
- `well_trajectory` is optional for MVP if no real survey data is available — stub it with straight-hole assumptions (surface coordinates only) rather than skipping the table, so Version 2 can add real directional-survey data without a schema change. The MVP uses measured depth as the primary correlation axis; directional trajectory support is represented in the schema but requires real survey data for full implementation.
**Definition of done:** all tables exist; a dummy row can be inserted and selected from each; `ST_DWithin` runs without error on two dummy well rows.

### Phase 3 — Backend skeleton
**When:** after Phase 2 is done.
**Do:**
- `npm init`, install `express pg jsonwebtoken bcrypt joi cors helmet dotenv`.
- Build `server.js` with a `GET /health` route.
- Build `/config/db.js` for the Postgres connection.
- Build register/login routes issuing JWTs, and auth middleware verifying them.
**Definition of done:** `/health` responds unauthenticated; a protected test route rejects requests with no/invalid token and accepts requests with a valid one.

### Phase 4 — Seed real sample data
**When:** after Phase 3 is done.
**Do:**
- Load a small slice of the Volve dataset + matching Sodir FactPages metadata.
- Seed 3–5 wells with real coordinates/formation/depth.
- If trajectory/survey data is available in the chosen dataset slice, seed `well_trajectory` too; otherwise leave it stubbed per Phase 2 and note this as a Version 2 item, not a silent omission.
- Manually insert 3–5 historical events per well as a stand-in for the extraction pipeline.
**Definition of done:** a real `ST_DWithin` radius query against seeded wells returns the geometrically correct subset (verify by hand against known coordinates).

### Phase 5 — Extraction pipeline
**When:** after Phase 4 is done.
**Do:**
- Build a document upload route.
- Try `pdf-parse` first; fall back to `tesseract.js` for scanned/image PDFs.
- Send extracted text to `llmClient.js` with a fixed extraction prompt returning JSON: `{event_type, depth, formation, description, mitigation, confidence}`.
- Validate the returned JSON against a fixed schema before insert. Set `needs_review = true` on validation failure or low confidence, rather than discarding or force-accepting it.
- Where a document or dataset slice contains formation tops/bottoms or drilling-parameter readings, populate `formations` and `well_parameters` too — don't route everything through `events` alone just because that table exists first.
**Definition of done:** running the pipeline against 3 real sample documents produces rows in `events` with plausible field values, and at least one deliberately bad/blank input correctly produces a `needs_review = true` row instead of a crash or bad data.

### Phase 6 — RAG, correlation & risk analytics
**When:** after Phase 5 is done.
**Do:**
- Build the query-parsing LLM call (question → structured filter object), schema-validated before use.
- Translate the validated filter into a real SQL/PostGIS query.
- Handle zero-result queries explicitly with a real "no matching events found" response.
- Build the grounded summarization call, fed only the matched rows, with claim-level citations to source excerpts.
- Build the deterministic correlation logic (formation/synonym match + depth window) that produces the matched-events list — no LLM call in this specific function.
- **Build the risk analytics step — MUST HAVE, do not skip this even if the ML stretch goal below is cut.** This is deliberately simple counting/frequency logic, not a trained model: take the matched-events list from correlation and aggregate it into a per-category signal across the named risk types — **mud loss, stuck pipe, overpressure, torque spikes, cementing issues, kicks, NPT**. Output a plain count plus an elevated/normal flag per category (e.g. "3 of 5 nearby wells: mud loss in this depth window → elevated"). This is what actually satisfies the problem statement's "predictive analytics" language at prototype scale — more reliably than the ML stretch goal, which may not get built. Be honest in the demo that this is frequency-based, not a trained model.
- Build the alert-firing logic off the risk analytics output (formation/depth match + elevated flag) — this is the MVP alert mechanism and must ship.
- **[Stretch, only if time remains]** Build a classical ML risk-scoring layer on top of the above, kept architecturally distinct from both the deterministic alert and the risk-analytics counting step. **Do not run Python at request time and do not call a live Python server from Node — no second runtime, no live network dependency for a prediction.** Instead:
  1. **Offline, one-time, outside the running app:** train a Random Forest/Gradient Boosting classifier in Python with scikit-learn on historical offset-well events (features: formation, depth, drilling parameters). This script is a build-time tool, never deployed and never run again after export.
  2. **Export the fitted tree(s) to a plain JSON file** — walk scikit-learn's `tree_.feature`, `tree_.threshold`, `tree_.children_left/right`, `tree_.value` attributes into a simple nested `{feature, threshold, left, right, leafValue}` structure. This JSON is just data, not a pickle file — pickle is Python-specific and unreadable from Node.
  3. **Write a small (~30–50 line) hand-rolled Node.js function that reads that JSON and walks it at inference time**: compare the incoming row's feature value against each node's threshold, go left/right, repeat until a leaf, return the leaf value. For a forest, do this per tree and majority-vote/average the leaves.
  4. The resulting ML risk score is an additional signal shown alongside the risk-analytics flag and the alert; it never replaces or gates either of them. If this isn't built, say so plainly in the demo rather than implying it exists — do not let "predictive analytics" language in the README overstate what's actually running.
- Cache one known-good query/response pair to a fixed key for demo fallback use.
- `depthSimulator.service.js` simulates the active well's drilling progression for the public-data prototype. State this explicitly wherever it's referenced: in an OIL deployment, this input is replaced by the real eRTMAC real-time drilling stream — it is not itself a real-time integration.
**Definition of done:** a real natural-language query against seeded data returns a correct, grounded answer with citations; an out-of-range query returns the explicit empty-result message, not a hallucinated one; the cached fallback returns correctly with the LLM API disabled; the risk analytics step returns a correct per-category count and elevated/normal flag against known seeded events (verify by hand); the deterministic alert fires only off the risk analytics output, not directly off raw correlation matches.

### Phase 7 — Frontend
**When:** after Phase 6 is done (or in parallel once Phase 3's auth routes exist, if resourcing allows — but do not point it at unfinished RAG/correlation endpoints).
**Do:**
- Build login, map (Leaflet + OSM tiles), well selector + radius slider, search box, alert panel, evidence drill-down modal, depth slider.
- Wire every screen to a real backend endpoint — no mocked data once the corresponding backend phase is complete.
- Render a visible `needs_review` indicator wherever such records are shown.
**Definition of done:** a full click-through (login → select well → map loads → radius query → NL search → alert appears → drill-down shows evidence) works against the real backend with no console errors.

### Phase 8 — Integration & demo polish
**When:** last.
**Do:**
- Run the full end-to-end flow start to finish.
- Verify the cached demo query still works with the live LLM API disconnected.
- Verify the UI's behavior on OCR failure, empty query results, and an API timeout — each should show a real, non-crashing state.
- Fill in a formation-synonym lookup table (10–15 entries minimum).
**Definition of done:** the end-to-end flow completes with the network/API disabled using only the cached fallback; no unhandled error states remain in the three failure scenarios above.

---

## 4. Core database schema

```sql
wells (id, name, latitude, longitude, location geometry(Point,4326), formation, current_depth, planned_depth)
well_trajectory (id, well_id FK, measured_depth, inclination, azimuth, true_vertical_depth)  -- stub with surface-only rows if no real survey data
formations (id, well_id FK, formation, top_depth, bottom_depth, lithology)
well_parameters (id, well_id FK, depth, rpm, wob, torque, rop, mud_weight, flow_rate, standpipe_pressure)  -- thin table; populate from Volve WITSML slices where available, otherwise seed sparsely rather than fabricate values
documents (id, well_id FK, file_path, doc_type, upload_date, ocr_confidence)
events (id, well_id FK, document_id FK, event_type, depth, formation, description, mitigation, source_excerpt, confidence, needs_review boolean)
embeddings (id, event_id FK or document_id FK, vector)
alerts (id, well_id FK, event_id FK, triggered_at, depth_at_trigger, status)
risk_summary (id, well_id FK, depth_window_start, depth_window_end, risk_category, matched_count, flag)  -- output of the Layer-8 counting/frequency step; alerts read from this, not from raw event matches directly
feedback_log (id, alert_id FK, user_id FK, action, timestamp)
users (id, username, password_hash, role)
```

---

## 5. Agent operating rules

- Work one phase at a time. After finishing a phase, explicitly check it against that phase's Definition of Done before continuing.
- If a required input (dataset, API key, credential) is missing, stop and ask for it — don't fabricate placeholder data and continue silently past it.
- Never remove or weaken the schema-validation step between an LLM output and a database query, even to "simplify" or "just get it working."
- If asked to add a feature not listed here, implement it in the phase it most naturally belongs to, and note the addition rather than silently expanding scope.
- Prefer the simplest implementation that satisfies the Definition of Done over a more "complete" one that isn't asked for yet.
