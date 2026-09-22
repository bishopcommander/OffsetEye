/**
 * Seed script for eRTMAC-NWIS (Phase 4)
 * 
 * Dataset source: Equinor Volve Field (Norwegian Continental Shelf, Block 15/9)
 * Metadata cross-referenced with Sodir (formerly NPD) FactPages.
 * 
 * Wells:
 * 1. 15/9-F-12 (Active monitoring candidate) - Lat: 58.441944, Lon: 1.884722
 * 2. 15/9-F-14 (Direct offset ~100m)          - Lat: 58.442222, Lon: 1.885000
 * 3. 15/9-F-15 (Direct offset ~150m)          - Lat: 58.441500, Lon: 1.884200
 * 4. 15/9-F-4  (Semi-offset ~2.2km)           - Lat: 58.455000, Lon: 1.910000
 * 5. 15/9-19A  (Regional appraisal ~12km)     - Lat: 58.520000, Lon: 1.980000
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { pool, query } = require('../config/db');

async function seed() {
  console.log('[seed] Starting Volve dataset seeding...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean prior sample/dummy data safely
    await client.query('TRUNCATE TABLE feedback_log, alerts, risk_summary, embeddings, events, documents, well_parameters, formations, well_trajectory, wells CASCADE');

    console.log('[seed] Inserting 5 Volve offset wells...');
    const wellInsertQuery = `
      INSERT INTO wells (id, name, latitude, longitude, location, formation, current_depth, planned_depth)
      VALUES 
        (1, '15/9-F-12', 58.441944, 1.884722, ST_SetSRID(ST_MakePoint(1.884722, 58.441944), 4326), 'Hugin', 2950.0, 3400.0),
        (2, '15/9-F-14', 58.442222, 1.885000, ST_SetSRID(ST_MakePoint(1.885000, 58.442222), 4326), 'Hugin', 3728.0, 3728.0),
        (3, '15/9-F-15', 58.441500, 1.884200, ST_SetSRID(ST_MakePoint(1.884200, 58.441500), 4326), 'Skagerrak', 3805.0, 3805.0),
        (4, '15/9-F-4',  58.455000, 1.910000, ST_SetSRID(ST_MakePoint(1.910000, 58.455000), 4326), 'Shetland', 3250.0, 3300.0),
        (5, '15/9-19A',  58.520000, 1.980000, ST_SetSRID(ST_MakePoint(1.980000, 58.520000), 4326), 'Hugin', 4120.0, 4120.0)
      RETURNING id, name;
    `;
    await client.query(wellInsertQuery);

    // Reset sequence so auto-increment keeps working
    await client.query("SELECT setval('wells_id_seq', (SELECT MAX(id) FROM wells))");

    console.log('[seed] Inserting geological formation tops/bottoms...');
    const formations = [
      // 15/9-F-12
      { well_id: 1, formation: 'Nordland Group', top_depth: 0, bottom_depth: 1050, lithology: 'Claystone with sand beds' },
      { well_id: 1, formation: 'Hordaland Group', top_depth: 1050, bottom_depth: 2200, lithology: 'Fissile marine shale' },
      { well_id: 1, formation: 'Rogaland Group', top_depth: 2200, bottom_depth: 2450, lithology: 'Tuffaceous shale and marl' },
      { well_id: 1, formation: 'Shetland Group', top_depth: 2450, bottom_depth: 2900, lithology: 'Chalk, limestone with chert stringers' },
      { well_id: 1, formation: 'Hugin', top_depth: 2900, bottom_depth: 3200, lithology: 'Porous sandstone reservoir' },
      { well_id: 1, formation: 'Skagerrak', top_depth: 3200, bottom_depth: 3400, lithology: 'Fluvial sandstone and siltstone' },

      // 15/9-F-14
      { well_id: 2, formation: 'Hordaland Group', top_depth: 1045, bottom_depth: 2195, lithology: 'Fissile reactive shale' },
      { well_id: 2, formation: 'Shetland Group', top_depth: 2460, bottom_depth: 2915, lithology: 'Hard limestone and fractured chalk' },
      { well_id: 2, formation: 'Hugin', top_depth: 2915, bottom_depth: 3220, lithology: 'Hydrocarbon-bearing sandstone' },

      // 15/9-F-15
      { well_id: 3, formation: 'Shetland Group', top_depth: 2445, bottom_depth: 2895, lithology: 'Chalk and limestone' },
      { well_id: 3, formation: 'Hugin', top_depth: 2895, bottom_depth: 3190, lithology: 'Sandstone' },
      { well_id: 3, formation: 'Skagerrak', top_depth: 3190, bottom_depth: 3805, lithology: 'Interbedded sandstone and shale' },

      // 15/9-F-4
      { well_id: 4, formation: 'Shetland Group', top_depth: 2470, bottom_depth: 2930, lithology: 'Dense chalk with chert' },
      { well_id: 4, formation: 'Hugin', top_depth: 2930, bottom_depth: 3250, lithology: 'Sandstone' },

      // 15/9-19A
      { well_id: 5, formation: 'Shetland Group', top_depth: 2510, bottom_depth: 2980, lithology: 'Chalk' },
      { well_id: 5, formation: 'Hugin', top_depth: 2980, bottom_depth: 3350, lithology: 'Tight sandstone' },
    ];

    for (const f of formations) {
      await client.query(
        'INSERT INTO formations (well_id, formation, top_depth, bottom_depth, lithology) VALUES ($1, $2, $3, $4, $5)',
        [f.well_id, f.formation, f.top_depth, f.bottom_depth, f.lithology]
      );
    }

    console.log('[seed] Inserting well trajectory stubs...');
    // Survey stubs for wells (straight-hole / basic survey points)
    const trajectoryPoints = [
      { well_id: 1, md: 0, inc: 0.0, azi: 0.0, tvd: 0 },
      { well_id: 1, md: 1200, inc: 2.1, azi: 45.0, tvd: 1199.5 },
      { well_id: 1, md: 2500, inc: 18.5, azi: 110.0, tvd: 2465.0 },
      { well_id: 1, md: 2950, inc: 24.2, azi: 115.0, tvd: 2880.0 },

      { well_id: 2, md: 0, inc: 0.0, azi: 0.0, tvd: 0 },
      { well_id: 2, md: 2500, inc: 14.0, azi: 95.0, tvd: 2480.0 },
      { well_id: 2, md: 3728, inc: 22.0, azi: 102.0, tvd: 3620.0 },

      { well_id: 3, md: 0, inc: 0.0, azi: 0.0, tvd: 0 },
      { well_id: 3, md: 3805, inc: 15.0, azi: 85.0, tvd: 3710.0 },

      { well_id: 4, md: 0, inc: 0.0, azi: 0.0, tvd: 0 },
      { well_id: 4, md: 3250, inc: 5.0, azi: 180.0, tvd: 3240.0 },

      { well_id: 5, md: 0, inc: 0.0, azi: 0.0, tvd: 0 },
      { well_id: 5, md: 4120, inc: 3.0, azi: 220.0, tvd: 4115.0 },
    ];

    for (const t of trajectoryPoints) {
      await client.query(
        'INSERT INTO well_trajectory (well_id, measured_depth, inclination, azimuth, true_vertical_depth) VALUES ($1, $2, $3, $4, $5)',
        [t.well_id, t.md, t.inc, t.azi, t.tvd]
      );
    }

    console.log('[seed] Inserting source documents...');
    const docs = [
      { id: 1, well_id: 1, file_path: '/documents/volve/15_9-F-12_End_of_Well_Report.pdf', doc_type: 'WCR', ocr_confidence: 0.98 },
      { id: 2, well_id: 2, file_path: '/documents/volve/15_9-F-14_DDR_Drilling_Log.pdf', doc_type: 'DDR', ocr_confidence: 0.94 },
      { id: 3, well_id: 3, file_path: '/documents/volve/15_9-F-15_Completion_Report.pdf', doc_type: 'WCR', ocr_confidence: 0.96 },
      { id: 4, well_id: 4, file_path: '/documents/volve/15_9-F-4_Well_Summary.pdf', doc_type: 'WCR', ocr_confidence: 0.89 },
      { id: 5, well_id: 5, file_path: '/documents/volve/15_9-19A_Operations_Archive.pdf', doc_type: 'DDR', ocr_confidence: 0.85 }
    ];

    for (const d of docs) {
      await client.query(
        'INSERT INTO documents (id, well_id, file_path, doc_type, ocr_confidence) VALUES ($1, $2, $3, $4, $5)',
        [d.id, d.well_id, d.file_path, d.doc_type, d.ocr_confidence]
      );
    }
    await client.query("SELECT setval('documents_id_seq', (SELECT MAX(id) FROM documents))");

    console.log('[seed] Inserting 3-5 historical drilling events per well...');
    const events = [
      // Well 1 (15/9-F-12)
      {
        well_id: 1,
        document_id: 1,
        event_type: 'mud_loss',
        depth: 2920.0,
        formation: 'Hugin',
        description: 'Partial mud loss of 28 m3/hr encountered upon penetrating top Hugin sand with 1.34 SG mud.',
        mitigation: 'Pumped 15 m3 high-fluid-loss squeeze pill with coarse nut plug and fiber LCM. Reduced pump rate to 1800 l/min.',
        source_excerpt: 'DDR #42: At 2920m MD observed 28 m3/hr dynamic losses in Hugin sandstone. Mixed and spotted 15 m3 mica/calcium carbonate LCM pill.',
        confidence: 0.94,
        needs_review: false
      },
      {
        well_id: 1,
        document_id: 1,
        event_type: 'torque_spike',
        depth: 2680.0,
        formation: 'Shetland Group',
        description: 'Severe torsional vibration and torque spikes up to 36 kNm while drilling through chert interbeds.',
        mitigation: 'Reduced WOB from 140 kN to 85 kN, increased RPM to 130 with rotary steerable system auto-damping.',
        source_excerpt: 'Drilling log 2680m: High stick-slip and torque oscillation (peak 36 kNm) in hard Shetland chalk stringers.',
        confidence: 0.91,
        needs_review: false
      },
      {
        well_id: 1,
        document_id: 1,
        event_type: 'cementing',
        depth: 2465.0,
        formation: 'Rogaland Group',
        description: 'Loss of returns during 9-5/8 inch casing cementing operation due to low fracture gradient at casing shoe.',
        mitigation: 'Dropped top wiper plug, squeezed light-weight spacer, followed by staged cement remediation.',
        source_excerpt: 'Casing report: Lost 18 bbl cement slurry to formation at 2465m shoe. Top of cement found 120m below target.',
        confidence: 0.88,
        needs_review: false
      },
      {
        well_id: 1,
        document_id: 1,
        event_type: 'kick',
        depth: 2965.0,
        formation: 'Hugin',
        description: 'Encountered 1.8 m3 gas kick with 450 psi shut-in drillpipe pressure (SIDPP) after drilling gas cap.',
        mitigation: 'Shut in well using annular BOP. Circulated out influx using Driller Method; weighted up mud from 1.34 SG to 1.41 SG.',
        source_excerpt: 'Morning report 2965m: Pit gain 1.8 m3 detected. Well shut in. SIDPP 450 psi, SICP 620 psi. Kill sheet executed.',
        confidence: 0.96,
        needs_review: false
      },

      // Well 2 (15/9-F-14)
      {
        well_id: 2,
        document_id: 2,
        event_type: 'mud_loss',
        depth: 2935.0,
        formation: 'Hugin',
        description: 'Severe loss of circulation (45 m3/hr) in depleted high-permeability Hugin reservoir zone.',
        mitigation: 'Pumped dual-stage blend of 40 ppb coarse calcium carbonate and cross-linked polymer pill.',
        source_excerpt: 'DDR 15/9-F-14: Total losses 45 m3/hr at 2935m MD. Standpipe pressure dropped 35 bar. Spotted 20 m3 heavy LCM pill.',
        confidence: 0.95,
        needs_review: false
      },
      {
        well_id: 2,
        document_id: 2,
        event_type: 'stuck_pipe',
        depth: 3120.0,
        formation: 'Hugin',
        description: 'Differential sticking occurred during 45-minute survey pause across depleted Hugin interval.',
        mitigation: 'Spotted 12 m3 mineral-oil soaking friction-reduction pill. Worked drillstring with max allowable pull 950 kN and jarred down.',
        source_excerpt: 'Incident log: Pipe stuck off-bottom at 3120m after stationary wireline check. Overpull 900 kN unsuccessful until lubricant pill soaked 3 hrs.',
        confidence: 0.92,
        needs_review: false
      },
      {
        well_id: 2,
        document_id: 2,
        event_type: 'torque_spike',
        depth: 2710.0,
        formation: 'Shetland Group',
        description: 'Stick-slip oscillations exceeding 32 kNm causing MWD tool communication telemetry loss.',
        mitigation: 'Picked off bottom, circulated clean, adjusted mud lubricity additive concentration to 2.5%.',
        source_excerpt: 'Mud log: Severe torque oscillations 12 to 34 kNm at 2710m MD. MWD pulser decoded errors due to high shock & vibration.',
        confidence: 0.89,
        needs_review: false
      },
      {
        well_id: 2,
        document_id: 2,
        event_type: 'npt',
        depth: 3120.0,
        formation: 'Hugin',
        description: '28.5 hours of Non-Productive Time (NPT) dealing with jar firing and drillstring freeing operations.',
        mitigation: 'Subsequent wells mandated maximum 10-minute stationary limit across depleted sand intervals.',
        source_excerpt: 'End of Section Report: Total NPT 28.5 hrs logged under code 04.02 (Stuck Pipe Recovery).',
        confidence: 0.93,
        needs_review: false
      },

      // Well 3 (15/9-F-15)
      {
        well_id: 3,
        document_id: 3,
        event_type: 'mud_loss',
        depth: 2910.0,
        formation: 'Hugin',
        description: 'Dynamic mud losses of 22 m3/hr when drilling top Hugin sandstone with 1.35 SG mud.',
        mitigation: 'Added granular nutshell and graphite blend to active mud system; controlled ROP to 12 m/hr.',
        source_excerpt: 'DDR 15/9-F-15: At 2910m observed seepage escalating to 22 m3/hr. Treated active pits with 25 ppb StopLoss blend.',
        confidence: 0.93,
        needs_review: false
      },
      {
        well_id: 3,
        document_id: 3,
        event_type: 'overpressure',
        depth: 3240.0,
        formation: 'Skagerrak',
        description: 'Abrupt pore pressure ramp from 1.32 SG equivalent to 1.48 SG in isolated Skagerrak channel sand.',
        mitigation: 'Flow check positive. Increased active mud weight from 1.36 SG to 1.50 SG before drilling ahead.',
        source_excerpt: 'Pore pressure evaluation: Connection gas increased to 18.5%, background gas from 2.1% to 12.4% at 3240m MD.',
        confidence: 0.91,
        needs_review: false
      },
      {
        well_id: 3,
        document_id: 3,
        event_type: 'stuck_pipe',
        depth: 1850.0,
        formation: 'Hordaland Group',
        description: 'Mechanical sticking due to swelling and sloughing Hordaland reactive shale during tripping out.',
        mitigation: 'Pumped high-viscosity sweeping pill, reamed with back-reaming sub at 60 RPM and high flow rate.',
        source_excerpt: 'Tripping log: Tight hole at 1850m. Overpull reached 600 kN. Hole packing off with sticky clay fragments.',
        confidence: 0.87,
        needs_review: false
      },
      {
        well_id: 3,
        document_id: 3,
        event_type: 'kick',
        depth: 3255.0,
        formation: 'Skagerrak',
        description: '0.9 m3 influx while drilling into overpressured Skagerrak sand.',
        mitigation: 'Shut in, performed wait-and-weight method to bring bottom-hole pressure into overbalance.',
        source_excerpt: 'DDR: 0.9 m3 pit gain at 3255m. SIDPP 280 psi. Successfully killed with 1.50 SG mud.',
        confidence: 0.95,
        needs_review: false
      },

      // Well 4 (15/9-F-4)
      {
        well_id: 4,
        document_id: 4,
        event_type: 'mud_loss',
        depth: 2940.0,
        formation: 'Hugin',
        description: 'Mud loss of 32 m3/hr in fractured transition zone near fault compartment boundary.',
        mitigation: 'Spotted cement plug #2 to seal macro-fractures, tagged top of cement, drilled out with 1.32 SG mud.',
        source_excerpt: 'Well Summary 15/9-F-4: Severe seepage and fracture loss at 2940m MD adjacent to Main Fault.',
        confidence: 0.90,
        needs_review: false
      },
      {
        well_id: 4,
        document_id: 4,
        event_type: 'torque_spike',
        depth: 2695.0,
        formation: 'Shetland Group',
        description: 'Torque erratic fluctuations up to 38 kNm in hard limestone bed causing PDC bit ring-out.',
        mitigation: 'Tripped bit out; replaced PDC cutter with hybrid roller-cone / PDC insert bit.',
        source_excerpt: 'Bit record #5: Dull grade 4-6-RO-A-X-I-NO-TD. Ring-out cutters noted after 2695m chert section.',
        confidence: 0.92,
        needs_review: false
      },
      {
        well_id: 4,
        document_id: 4,
        event_type: 'cementing',
        depth: 2480.0,
        formation: 'Shetland Group',
        description: 'Micro-annular gas migration detected behind 9-5/8 inch casing string post-cementing.',
        mitigation: 'Executed remedial casing shoe squeeze with micro-fine cement slurry at 280 bar surface pressure.',
        source_excerpt: 'SBT/CBL acoustic log showed channelized gas invasion at 2480m shoe. Squeeze required.',
        confidence: 0.86,
        needs_review: false
      },

      // Well 5 (15/9-19A)
      {
        well_id: 5,
        document_id: 5,
        event_type: 'overpressure',
        depth: 3310.0,
        formation: 'Hugin',
        description: 'Sub-fault overpressure compartment encountered; pore pressure gradient reached 1.52 SG equivalent.',
        mitigation: 'Weighted up mud system with micronized barite to 1.55 SG; controlled trip speed.',
        source_excerpt: 'Archive Report 15/9-19A: Unexpected high pressure zone below deep sealing fault at 3310m MD.',
        confidence: 0.89,
        needs_review: false
      },
      {
        well_id: 5,
        document_id: 5,
        event_type: 'stuck_pipe',
        depth: 2150.0,
        formation: 'Hordaland Group',
        description: 'Bit balled up and pack-off occurred in dispersive gumbo shale in lower Hordaland.',
        mitigation: 'Injected glycol shale inhibitor into drilling fluid; circulated at maximum allowable pump rate.',
        source_excerpt: 'DDR: Bit balled at 2150m. Standpipe pressure spiked to 290 bar. Backwashed nozzle orifices.',
        confidence: 0.84,
        needs_review: true // flagged needs_review to test review UI state
      },
      {
        well_id: 5,
        document_id: 5,
        event_type: 'fishing',
        depth: 2160.0,
        formation: 'Hordaland Group',
        description: 'BHA twist-off below jar due to cyclic fatigue after repeated jarring cycles.',
        mitigation: 'Ran overshot with 8-1/4 inch spiral grapple; latched fish on first run and recovered string.',
        source_excerpt: 'Fishing log: Parted drill collar at 2160m. Ran Bowen overshot, engaged fish, pulled to surface clean.',
        confidence: 0.81,
        needs_review: true
      }
    ];

    for (const e of events) {
      await client.query(`
        INSERT INTO events (well_id, document_id, event_type, depth, formation, description, mitigation, source_excerpt, confidence, needs_review)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [e.well_id, e.document_id, e.event_type, e.depth, e.formation, e.description, e.mitigation, e.source_excerpt, e.confidence, e.needs_review]);
    }

    console.log('[seed] Inserting drilling real-time parameter slices (WITSML sample)...');
    const parameters = [
      { well_id: 1, depth: 2915.0, rpm: 110, wob: 120.5, torque: 22.4, rop: 18.2, mud_weight: 1.34, flow_rate: 2200, standpipe_pressure: 195 },
      { well_id: 1, depth: 2920.0, rpm: 95,  wob: 90.0,  torque: 28.5, rop: 8.5,  mud_weight: 1.34, flow_rate: 1800, standpipe_pressure: 170 },
      { well_id: 1, depth: 2925.0, rpm: 100, wob: 105.0, torque: 21.0, rop: 15.0, mud_weight: 1.38, flow_rate: 2100, standpipe_pressure: 190 },
      { well_id: 2, depth: 2930.0, rpm: 115, wob: 130.0, torque: 24.1, rop: 21.0, mud_weight: 1.33, flow_rate: 2250, standpipe_pressure: 200 },
      { well_id: 2, depth: 2935.0, rpm: 80,  wob: 75.0,  torque: 31.2, rop: 5.2,  mud_weight: 1.33, flow_rate: 1750, standpipe_pressure: 165 },
    ];

    for (const p of parameters) {
      await client.query(`
        INSERT INTO well_parameters (well_id, depth, rpm, wob, torque, rop, mud_weight, flow_rate, standpipe_pressure)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [p.well_id, p.depth, p.rpm, p.wob, p.torque, p.rop, p.mud_weight, p.flow_rate, p.standpipe_pressure]);
    }

    await client.query('COMMIT');
    console.log('[seed] Volve sample data successfully seeded!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] Error seeding data:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
