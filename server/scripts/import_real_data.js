'use strict';

/**
 * import_real_data.js
 * ───────────────────
 * Deterministic import of real Volve field data into OffsetEye.
 * Parses WITSML Daily Drilling Report (DDR) XML files — NO LLM needed.
 * Extracts events from structured WITSML tags:
 *   equipFailureInfo, activity (state/proprietaryCode/comments), mudLoss
 *
 * Run once: node server/scripts/import_real_data.js
 *
 * NOTE: Build-time script — never import from the live server.
 * Safe to re-run (deduplicates on well_id + event_type + depth + desc slice).
 */

const path  = require('path');
const fs    = require('fs');
const { XMLParser } = require('fast-xml-parser');
const { Pool }      = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// ─── DB CONNECTION ────────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.PGHOST     || process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
  database: process.env.PGDATABASE || process.env.DB_NAME     || 'ertmac_nwis',
  user:     process.env.PGUSER     || process.env.DB_USER     || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
});
const q = (sql, params) => pool.query(sql, params);

// ─── 15 REAL VOLVE WELLS ──────────────────────────────────────────────────────
// Surface coordinates from NPD FactPages / Sodir (WGS84)
const WELLS = [
  { name: '15/9-F-1',  lat: 58.4366, lng: 1.8952, formation: 'Heimdal',   current_depth: 2850, planned_depth: 3100 },
  { name: '15/9-F-4',  lat: 58.4350, lng: 1.8901, formation: 'Hugin',     current_depth: 3250, planned_depth: 3700 },
  { name: '15/9-F-5',  lat: 58.4373, lng: 1.8878, formation: 'Skagerrak', current_depth: 2480, planned_depth: 3000 },
  { name: '15/9-F-7',  lat: 58.4402, lng: 1.8912, formation: 'Hugin',     current_depth: 3180, planned_depth: 3600 },
  { name: '15/9-F-9',  lat: 58.4445, lng: 1.8961, formation: 'Heimdal',   current_depth: 3050, planned_depth: 3400 },
  { name: '15/9-F-10', lat: 58.4390, lng: 1.8855, formation: 'Hugin',     current_depth: 3620, planned_depth: 3900 },
  { name: '15/9-F-11', lat: 58.4385, lng: 1.8849, formation: 'Hugin',     current_depth: 3480, planned_depth: 3800 },
  { name: '15/9-F-12', lat: 58.4419, lng: 1.8847, formation: 'Hugin',     current_depth: 2930, planned_depth: 3500 },
  { name: '15/9-F-13', lat: 58.4408, lng: 1.8840, formation: 'Skagerrak', current_depth: 2710, planned_depth: 3200 },
  { name: '15/9-F-14', lat: 58.4420, lng: 1.8851, formation: 'Hugin',     current_depth: 3728, planned_depth: 4000 },
  { name: '15/9-F-15', lat: 58.4421, lng: 1.8853, formation: 'Skagerrak', current_depth: 2965, planned_depth: 3300 },
  { name: '15/9-19',   lat: 58.4602, lng: 1.9215, formation: 'Hugin',     current_depth: 2930, planned_depth: 3200 },
  { name: '15/9-19A',  lat: 58.4598, lng: 1.9208, formation: 'Hugin',     current_depth: 2930, planned_depth: 3200 },
  { name: '15/9-19B',  lat: 58.4606, lng: 1.9222, formation: 'Skagerrak', current_depth: 3150, planned_depth: 3500 },
  { name: '15/9-19S',  lat: 58.4595, lng: 1.9200, formation: 'Heimdal',   current_depth: 3200, planned_depth: 3600 },
];

// ─── EVENT CLASSIFICATION (deterministic keyword matching) ────────────────────
function classifyText(code, comment, state) {
  const txt = `${code} ${comment} ${state}`.toLowerCase();
  if (/mud loss|lost circulation|lost returns|no returns|partial loss|seepage loss/.test(txt)) return 'mud_loss';
  if (/stuck pipe|stuck in hole|differential sticking|mechanically stuck/.test(txt)) return 'stuck_pipe';
  if (/\bkick\b|influx|well control|shut.in|sicp|sidpp/.test(txt)) return 'kick';
  if (/over.?pressure|abnormal pressure|pressure surge/.test(txt)) return 'overpressure';
  if (/\btorque\b.*high|high.*\btorque\b|tight hole|excessive drag|over.pull/.test(txt)) return 'torque_spike';
  if (/cement|cementing|squeeze.*cem|csg shoe job/.test(txt)) return 'cementing';
  if (/\bfish\b|fishing|overshot|spear|\bjar\b/.test(txt)) return 'fishing';
  if (/non.productive|equipment failure|wait on weather|wow|rig failure|mech.*fail/.test(txt)) return 'npt';
  return null;
}

// ─── WELL NAME NORMALISER ──────────────────────────────────────────────────────
// Turns "NO 15/9-F-12" / "15_9_F_12" / "15/9-F-12" → "15/9-F-12"
function normaliseWellName(raw) {
  return (raw || '')
    .replace(/^NO\s+/i, '')
    .replace(/_/g, '/')
    .replace(/(\d)\/(\d)/g, '$1-$2')   // 9/F → 9-F
    .replace(/\s+/g, '')
    .replace(/15\/9\/F\//i, '15/9-F-') // odd edge case
    .toUpperCase();
}

// Build a lookup: normalised → db name (as stored in our WELLS array)
function buildWellIndex(wellIdMap) {
  const idx = {};
  for (const [dbName, id] of Object.entries(wellIdMap)) {
    idx[normaliseWellName(dbName)] = id;
    // also store just the short suffix  e.g. "F-12" → id
    const suffix = dbName.split('-').slice(-2).join('-').toUpperCase();
    if (!idx[suffix]) idx[suffix] = id;
  }
  return idx;
}

// ─── XML PARSER ───────────────────────────────────────────────────────────────
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  isArray: (name) =>
    ['activity','equipFailureInfo','fluid','mudLoss','geology'].includes(name),
});

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('OffsetEye — Deterministic Volve DDR Importer');
  console.log('=============================================');

  // ── Step 1: Upsert 15 wells ────────────────────────────────────────────────
  console.log('\n[1/4] Upserting 15 real Volve wells...');

  // Ensure unique constraint exists (won't error if already exists)
  await q(`ALTER TABLE wells ADD CONSTRAINT wells_name_unique UNIQUE (name)`)
        .catch(() => {}); // already exists — ignore

  const wellIdMap = {};
  for (const w of WELLS) {
    const res = await q(`
      INSERT INTO wells (name, latitude, longitude, location, formation, current_depth, planned_depth)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($3, $2), 4326), $4, $5, $6)
      ON CONFLICT (name) DO UPDATE
        SET latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
            location=EXCLUDED.location, formation=EXCLUDED.formation,
            current_depth=EXCLUDED.current_depth, planned_depth=EXCLUDED.planned_depth
      RETURNING id
    `, [w.name, w.lat, w.lng, w.formation, w.current_depth, w.planned_depth]);
    wellIdMap[w.name] = res.rows[0].id;
    console.log(`  ✓ ${w.name.padEnd(15)} id=${res.rows[0].id}`);
  }

  const wellIndex = buildWellIndex(wellIdMap);

  // ── Step 2: Parse DDR XMLs ─────────────────────────────────────────────────
  const DDR_DIR = path.join(__dirname,
    '../../Volve_Well_technical_data/Well_technical_data/Daily Drilling Report - XML Version');

  const files = fs.readdirSync(DDR_DIR)
                  .filter(f => f.endsWith('.xml'))
                  .sort();

  console.log(`\n[2/4] Scanning ${files.length} DDR XML files for real events...`);

  let parsed = 0, skipped = 0, eventsTotal = 0, paramsTotal = 0;
  const docCache = {};  // wellId → documentId

  for (const fname of files) {
    const fpath = path.join(DDR_DIR, fname);
    let raw;
    try { raw = fs.readFileSync(fpath, 'latin1'); } catch { skipped++; continue; }

    let obj;
    try { obj = parser.parse(raw); } catch { skipped++; continue; }

    const dr = obj?.drillReports?.drillReport ?? obj?.drillReport;
    if (!dr) { skipped++; continue; }

    // Resolve well identity
    const rawName = dr.nameWell || dr.wellAlias?.name || '';
    const normName = normaliseWellName(rawName);

    // Try exact match first, then suffix match
    let wellId = wellIndex[normName];
    if (!wellId) {
      const suffix = normName.split('-').slice(-2).join('-');
      wellId = wellIndex[suffix];
    }
    if (!wellId) { skipped++; continue; }

    // Get / create document record for this well (one per well)
    if (!docCache[wellId]) {
      const docSlug = fname.split('_').slice(0, 4).join('_');
      await q(`
        INSERT INTO documents (well_id, file_path, doc_type, upload_date, ocr_confidence)
        VALUES ($1, $2, 'DDR', NOW(), 1.0)
        ON CONFLICT DO NOTHING
      `, [wellId, `DDR_XML/${docSlug}`]);

      const docRes = await q(
        `SELECT id FROM documents WHERE well_id=$1 AND doc_type='DDR' LIMIT 1`, [wellId]);
      docCache[wellId] = docRes.rows[0]?.id || null;
    }
    const docId = docCache[wellId];
    if (!docId) { skipped++; continue; }

    // Current report depth and mud weight
    const status    = dr.statusInfo || {};
    const rawMd     = status.md?.['#text'] ?? status.md ?? -999;
    const depth     = (parseFloat(rawMd) > 0 && parseFloat(rawMd) < 10000)
                        ? parseFloat(rawMd) : null;
    const fluid0    = dr.fluid?.[0];
    const mudW      = fluid0 ? parseFloat(fluid0.density?.['#text'] ?? fluid0.density ?? -999) : -999;
    const validMud  = (mudW > 0.5 && mudW < 5) ? mudW : null;

    // A. equipFailureInfo events
    const eqList = dr.equipFailureInfo || [];
    for (const eq of eqList) {
      const cls  = eq.equipClass || '';
      const desc = eq.description || '';
      const eqMd = parseFloat(eq.md?.['#text'] ?? eq.md ?? -999);
      const evD  = (eqMd > 0 && eqMd < 10000) ? eqMd : depth;
      const type = classifyText(cls, desc, '');
      if (type && evD) {
        await insertEvent(wellId, docId, type, evD, desc, null, 0.85);
        eventsTotal++;
      }
    }

    // B. activity events
    const acts = dr.activity || [];
    for (const act of acts) {
      const code    = act.proprietaryCode || act.typeActivity || '';
      const comment = act.comments || act.description || '';
      const state   = act.stateDetailActivity || act.state || '';
      const actMd   = parseFloat(act.md?.['#text'] ?? act.md ?? -999);
      const evD     = (actMd > 0 && actMd < 10000) ? actMd : depth;
      const type    = classifyText(code, comment, state);
      if (type && evD) {
        const mitigation = state.includes('fail') && status.forecast24Hr
          ? status.forecast24Hr.slice(0, 300) : null;
        await insertEvent(wellId, docId, type, evD, comment, mitigation, 0.80);
        eventsTotal++;
      }
    }

    // C. mudLoss blocks
    const mudLosses = dr.mudLoss || [];
    for (const ml of mudLosses) {
      const mlMd  = parseFloat(ml.md?.['#text'] ?? ml.md ?? -999);
      const evD   = (mlMd > 0 && mlMd < 10000) ? mlMd : depth;
      if (!evD) continue;
      const vol  = ml.volLost?.['#text'] ?? ml.volLost ?? '?';
      const zone = ml.zone || 'unknown zone';
      const desc = `Lost returns: ${vol} m3 in ${zone}`;
      await insertEvent(wellId, docId, 'mud_loss', evD, desc, null, 0.90);
      eventsTotal++;
    }

    // D. well_parameters (one row per unique well+depth from fluid readings)
    if (depth && validMud) {
      const rop = parseFloat(status.ropCurrent || -999);
      await q(`
        INSERT INTO well_parameters (well_id, depth, mud_weight, rop)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [wellId, depth, validMud, (rop > 0 && rop < 1000) ? rop : null]);
      paramsTotal++;
    }

    parsed++;
    if (parsed % 250 === 0) {
      console.log(`  ... ${parsed}/${files.length} files — ${eventsTotal} events so far`);
    }
  }

  // ── Step 3: Rebuild risk_summary ───────────────────────────────────────────
  console.log(`\n[3/4] Rebuilding risk_summary from ${eventsTotal} real events...`);
  await q(`DELETE FROM risk_summary`);

  const allWells = await q(`SELECT id FROM wells`);
  const cats = ['mud_loss','stuck_pipe','overpressure','torque_spike',
                'cementing','kick','fishing','npt'];

  for (const { id: wid } of allWells.rows) {
    const bounds = await q(
      `SELECT MIN(depth) as lo, MAX(depth) as hi FROM events WHERE well_id=$1`, [wid]);
    const lo = bounds.rows[0].lo;
    const hi = bounds.rows[0].hi;
    if (!lo) continue;

    const start = Math.floor(lo / 100) * 100;
    const end   = Math.ceil(hi  / 100) * 100;

    for (let ws = start; ws < end; ws += 100) {
      const we = ws + 100;
      for (const cat of cats) {
        const cnt = parseInt(
          (await q(
            `SELECT COUNT(*) as c FROM events
             WHERE well_id=$1 AND event_type=$2 AND depth BETWEEN $3 AND $4`,
            [wid, cat, ws, we]
          )).rows[0].c, 10);
        if (cnt === 0) continue;
        await q(`
          INSERT INTO risk_summary
            (well_id, depth_window_start, depth_window_end, risk_category, matched_count, flag)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [wid, ws, we, cat, cnt, cnt >= 2 ? 'elevated' : 'normal']);
      }
    }
  }
  console.log('  ✓ risk_summary rebuilt.');

  // ── Step 4: Update current_depth from real DDR data ────────────────────────
  console.log('\n[4/4] Updating current_depth to max event depth per well...');
  await q(`
    UPDATE wells w
    SET current_depth = sub.max_d
    FROM (SELECT well_id, MAX(depth) AS max_d FROM events GROUP BY well_id) sub
    WHERE w.id = sub.well_id AND sub.max_d > w.current_depth
  `);
  console.log('  ✓ current_depth updated.');

  await pool.end();
  console.log('\n══════════════════════════════════════════');
  console.log(`  Files parsed  : ${parsed}`);
  console.log(`  Files skipped : ${skipped} (no matching well)`);
  console.log(`  Events total  : ${eventsTotal}`);
  console.log(`  Param rows    : ${paramsTotal}`);
  console.log('  IMPORT COMPLETE ✓');
  console.log('══════════════════════════════════════════');
}

// ─── INSERT EVENT (deduplicated) ─────────────────────────────────────────────
async function insertEvent(wellId, docId, eventType, depth, description, mitigation, confidence) {
  const snippet = (description || '').slice(0, 80);
  const dup = await q(
    `SELECT id FROM events WHERE well_id=$1 AND event_type=$2
     AND depth=$3 AND LEFT(description,80)=$4 LIMIT 1`,
    [wellId, eventType, depth, snippet]);
  if (dup.rows.length) return;

  await q(`
    INSERT INTO events
      (well_id, document_id, event_type, depth, formation, description,
       mitigation, source_excerpt, confidence, needs_review)
    VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9)
  `, [
    wellId, docId, eventType, depth,
    (description || '').slice(0, 800),
    (mitigation   || null),
    (description  || '').slice(0, 200),
    confidence,
    confidence < 0.75,
  ]);
}

main().catch(err => {
  console.error('\nImport failed:', err.message, err.stack);
  process.exit(1);
});
