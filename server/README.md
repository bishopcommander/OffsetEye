# eRTMAC-NWIS Server

Express API backend for the Nearby Wells Intelligence System.

## Structure (populated in Phase 3)

```
server/
  server.js                   Entry point
  config/
    db.js                     PostgreSQL connection pool
  routes/
    auth.routes.js            Register / login / JWT issue
    wells.routes.js           Well metadata, radius search
    search.routes.js          NL query → RAG pipeline
    alerts.routes.js          Alert history, feedback logging
  middleware/
    auth.middleware.js        JWT verification
    validate.middleware.js    Joi request validation
  services/
    llmClient.js              Single point of contact with the LLM API
    extraction.service.js     PDF/OCR → structured events
    rag.service.js            NL query → filter → SQL → grounded summary
    correlation.service.js    Deterministic formation/depth matching
    depthSimulator.service.js Simulated eRTMAC live-depth feed
  models/                     Raw SQL query functions (no ORM)
  uploads/                    Raw uploaded PDFs (gitignored)
```

## Phase history

- Phase 1: directory stub created, package.json declared, server.js placeholder added
- Phase 3: full implementation
