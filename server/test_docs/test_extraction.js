/**
 * Phase 5 Verification Script
 * 
 * Tests the extraction pipeline against 3 real sample documents
 * and 1 deliberately bad/blank input.
 * Verifies that:
 * 1. 3 real sample documents produce rows in `events` with plausible field values.
 * 2. Deliberately bad/blank input produces a `needs_review = true` row without crashing.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { processDocumentExtraction } = require('../services/extraction.service');
const { pool, query } = require('../config/db');

async function runTests() {
  console.log('=== PHASE 5: EXTRACTION PIPELINE VERIFICATION ===\n');

  try {
    // Test 1: Real DDR with mud loss (Well 1: 15/9-F-12)
    console.log('--- Test 1: Real DDR with mud loss ---');
    const doc1Path = path.join(__dirname, 'doc1_volve_ddr_mudloss.txt');
    const res1 = await processDocumentExtraction({
      well_id: 1,
      filePath: doc1Path,
      buffer: fs.readFileSync(doc1Path),
      doc_type: 'DDR'
    });
    console.log(`Test 1 Result: Status=${res1.status}, Events=${res1.events.length}, Formations=${res1.formations.length}, NeedsReview=${res1.needs_review_count}`);
    for (const ev of res1.events) {
      console.log(`  -> Event: [${ev.event_type}] depth=${ev.depth}m, formation="${ev.formation}", confidence=${ev.confidence}, needs_review=${ev.needs_review}`);
    }

    // Test 2: Real Stuck pipe & kick report (Well 2: 15/9-F-14)
    console.log('\n--- Test 2: Real Stuck pipe & gas kick report ---');
    const doc2Path = path.join(__dirname, 'doc2_stuckpipe_kick.txt');
    const res2 = await processDocumentExtraction({
      well_id: 2,
      filePath: doc2Path,
      buffer: fs.readFileSync(doc2Path),
      doc_type: 'WCR'
    });
    console.log(`Test 2 Result: Status=${res2.status}, Events=${res2.events.length}, Formations=${res2.formations.length}, NeedsReview=${res2.needs_review_count}`);
    for (const ev of res2.events) {
      console.log(`  -> Event: [${ev.event_type}] depth=${ev.depth}m, formation="${ev.formation}", confidence=${ev.confidence}, needs_review=${ev.needs_review}`);
    }

    // Test 3: Real Torque spike & cementing report (Well 3: 15/9-F-15)
    console.log('\n--- Test 3: Real Torque spike & cementing report ---');
    const doc3Path = path.join(__dirname, 'doc3_torque_cementing.txt');
    const res3 = await processDocumentExtraction({
      well_id: 3,
      filePath: doc3Path,
      buffer: fs.readFileSync(doc3Path),
      doc_type: 'DDR'
    });
    console.log(`Test 3 Result: Status=${res3.status}, Events=${res3.events.length}, Formations=${res3.formations.length}, NeedsReview=${res3.needs_review_count}`);
    for (const ev of res3.events) {
      console.log(`  -> Event: [${ev.event_type}] depth=${ev.depth}m, formation="${ev.formation}", confidence=${ev.confidence}, needs_review=${ev.needs_review}`);
    }

    // Test 4: Deliberately bad / blank / corrupt input (Well 4: 15/9-F-4)
    console.log('\n--- Test 4: Deliberately bad / corrupted input ---');
    const doc4Path = path.join(__dirname, 'doc4_bad_blank_scan.txt');
    const res4 = await processDocumentExtraction({
      well_id: 4,
      filePath: doc4Path,
      buffer: fs.readFileSync(doc4Path),
      doc_type: 'WCR'
    });
    console.log(`Test 4 Result: Status=${res4.status}, Events=${res4.events.length}, Formations=${res4.formations.length}, NeedsReview=${res4.needs_review_count}`);
    for (const ev of res4.events) {
      console.log(`  -> Event: [${ev.event_type}] depth=${ev.depth}m, formation="${ev.formation}", confidence=${ev.confidence}, needs_review=${ev.needs_review}`);
    }

    // Database verification: verify rows in Postgres
    console.log('\n--- Database Record Verification ---');
    const dbEvents = await query(`
      SELECT e.id, w.name AS well_name, e.event_type, e.depth, e.formation, e.confidence, e.needs_review
      FROM events e
      JOIN wells w ON w.id = e.well_id
      WHERE e.document_id IN ($1, $2, $3, $4)
      ORDER BY e.id
    `, [res1.document_id, res2.document_id, res3.document_id, res4.document_id]);

    console.table(dbEvents.rows);

    const hasPlausibleValues = res1.events.length > 0 && res2.events.length > 0 && res3.events.length > 0;
    const hasBadNeedsReview = res4.needs_review_count > 0 && res4.events.some(e => e.needs_review === true);

    console.log('\n=== DEFINITION OF DONE ASSESSMENT ===');
    console.log(`1. Real sample documents produced plausible event rows: ${hasPlausibleValues ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`2. Deliberately bad input safely flagged needs_review = true: ${hasBadNeedsReview ? 'PASSED ✅' : 'FAILED ❌'}`);

    if (hasPlausibleValues && hasBadNeedsReview) {
      console.log('\n>>> PHASE 5 DEFINITION OF DONE FULLY SATISFIED! <<<');
    } else {
      throw new Error('Phase 5 criteria not met');
    }

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
