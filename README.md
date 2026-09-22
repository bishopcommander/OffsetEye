# eRTMAC-NWIS — Nearby Wells Intelligence System

A standalone AI/ML-enabled decision-support platform that sits alongside Oil India Limited's eRTMAC real-time monitoring system, giving drilling engineers instant access to historical, offset-well knowledge that currently lives scattered across PDFs and individual memory.

> Looking for build instructions instead? See [`AGENTS.md`](./AGENTS.md) for the full phase-by-phase implementation spec.

---

## The problem

OIL's eRTMAC provides real-time drilling data, but decisions in geologically complex formations also need historical context from nearby/offset wells — currently locked inside scattered Well Completion Reports, Daily Drilling Reports, and individual engineers' memory. This slows decisions and causes missed opportunities to proactively mitigate risk. Drilling teams today have no unified way to see nearby wells geospatially, retrieve offset-well experience instantly, correlate risk across wells by depth/formation, or get proactively alerted before re-encountering a known hazard.

## The solution

NWIS is **institutional memory as a platform** — not a replacement for eRTMAC, but a layer beside it. It:

1. Extracts and structures information from historical drilling reports using OCR, NLP, and AI
2. Visualizes nearby wells on an interactive map within a user-defined radius
3. Provides a searchable knowledge repository of drilling events, lessons learned, and mitigations
4. Correlates geological, drilling, and reservoir data across wells by depth and formation
5. Scores drilling risk (mud loss, stuck pipe, overpressure, torque spikes, cementing issues) from offset-well history
6. Generates real-time, evidence-backed alerts as the active well approaches a known risk zone
7. Presents all of this through a single dashboard for field and office personnel

## Architecture

```
Client (React + Leaflet)
        │
Express API gateway (auth, routing)
        │
   ┌────┴────┬──────────────┬─────────────────┐
Extraction  RAG/Search   Correlation &     Live depth
& OCR                    Alerting          simulator*
   └────┬────┴──────────────┴─────────────────┘
        │
PostgreSQL (single instance)
  + PostGIS  → geospatial radius queries
  + pgvector → semantic search over documents
  + plain tables → structured events, parameters, formations
        │
External plugs: LLM API · OCR fallback · map tiles
```
*In this public-data prototype, the "live" feed is simulated. In an OIL deployment, this input is replaced by the real eRTMAC real-time drilling stream.

## AI/ML pipeline & safety design

Every AI touchpoint in this system was deliberately scoped to keep a human engineer as the final decision-maker:

- **Retrieval, not autonomous querying:** a natural-language question is parsed by an LLM into a structured filter — but that output is schema-validated before it ever reaches the database. The LLM never writes or executes SQL directly.
- **Grounded summaries only:** answers are generated only from the rows the structured filter actually matched. No matching evidence means an explicit "no matching events found," not a guess.
- **Claim-level citations:** every summarized answer links back to the specific source excerpt it came from, so an engineer can verify rather than trust blindly.
- **Deterministic alerting:** the mechanism that actually fires a risk alert is rule-based (formation/synonym match + depth window), not an LLM judgment call. This is the MVP alert mechanism.
- **Risk scoring is a separate, optional signal:** a classical ML model (Random Forest/Gradient Boosting — no deep learning) can layer a risk *score* on top of offset-well history, but it is architecturally distinct from, and never gates, the deterministic alert. This is scoped as a stretch goal for the current build; see `AGENTS.md` for status.
- **Low-confidence extractions are flagged, not hidden:** any document extraction below a confidence threshold is marked `needs_review` and surfaced as such in the UI.

**The one-line answer to "how do you prevent hallucinated drilling information?"**
*LLM output is schema-validated, never executes queries directly, retrieval happens against real records, and every summary is grounded with a source citation the engineer can check.*

## Data sources & honest limitations

The official data sources for a production deployment are OIL's own Well Completion Reports, Daily Drilling Reports, mud-logging databases, reservoir/geological data, eRTMAC streams, trajectory/survey data, and historical event records (mud losses, kicks, stuck pipe, fishing operations, NPT).

**OIL's operational data is not publicly available for prototyping.** This build instead uses real, published international datasets as technical analogues:

| Dataset | Used for |
|---|---|
| Volve (Equinor) | Real-time drilling records, well logs, and reports — the strongest analogue for time-series drilling data |
| FORCE 2020 | Well X/Y position, NPD lithostratigraphy, and lithology logs |
| Sodir FactPages | Norwegian well/GIS metadata |
| 3W (Petrobras) | Labeled undesirable-event time series |
| Texas RRC records | Messy, real-world scanned-document stress test for OCR |

None of these fully replicate OIL/Indian well conditions, and none provide OIL-specific WCR/DDR narrative text, fishing-operation histories, or full directional-survey data. The architecture is built so OIL's internal records can replace these public analogues at deployment without changing the underlying schema or pipeline.

## What's in the MVP vs. later versions

**In this build:** map + radius search, document extraction with confidence flagging, grounded RAG search with citations, deterministic depth/formation alerting, simulated live-depth feed, core dashboard.

**Explicitly deferred:** full directional-trajectory correlation (schema supports it, data doesn't yet), fishing-operation event coverage, classical ML risk scoring (stretch goal), and any real eRTMAC integration (simulated for now).

## Getting started

See [`AGENTS.md`](./AGENTS.md) for the complete environment setup and an 8-phase build sequence with a concrete Definition of Done for each phase.
