/**
 * Phase 6 Verification Test
 * 
 * Verifies all 5 criteria from AGENTS.md Phase 6 Definition of Done:
 * 1. Real natural-language query returns a correct, grounded answer with citations.
 * 2. Out-of-range query returns explicit empty-result message ("no matching events found").
 * 3. Cached fallback returns correctly with LLM API disabled/offline.
 * 4. Risk analytics returns correct per-category counts and elevated/normal flag.
 * 5. Deterministic alert fires ONLY off risk analytics output, not directly off raw correlation matches.
 */

'use strict';

const { search, CACHED_DEMO_QUERY } = require('../services/rag.service');
const { correlateNearbyRisks } = require('../services/correlation.service');
const { pool, query } = require('../config/db');

async function verifyPhase6() {
  console.log('=== PHASE 6: RAG, CORRELATION & RISK ANALYTICS VERIFICATION ===\n');

  try {
    // -------------------------------------------------------------
    // Check 1: Real natural-language query against seeded data
    // -------------------------------------------------------------
    console.log('--- Check 1: Real Natural Language Query Grounded Retrieval ---');
    const q1 = 'What mud loss events were reported in Hugin formation near 2930m?';
    const res1 = await search({
      question: q1,
      wellId: 1, // active well: 15/9-F-12
      radiusMeters: 5000
    });

    console.log(`Query: "${q1}"`);
    console.log(`Matched Events: ${res1.matched_events_count}`);
    console.log(`Summary: ${res1.summary.substring(0, 160)}...`);
    console.log(`Citations count: ${res1.citations.length}`);
    if (res1.citations.length > 0) {
      console.log(`Sample citation: [${res1.citations[0].source_well} @ ${res1.citations[0].depth}m] ${res1.citations[0].claim}`);
    }

    const check1Passed = res1.matched_events_count > 0 && res1.citations.length > 0 && res1.summary.length > 20;
    console.log(`Check 1 Result: ${check1Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);

    // -------------------------------------------------------------
    // Check 2: Out-of-range query returns explicit empty-result
    // -------------------------------------------------------------
    console.log('--- Check 2: Out-of-range Query (Zero Hallucination Guardrail) ---');
    const q2 = 'What stuck pipe incidents occurred in Barail formation at depth 8500m?';
    const res2 = await search({
      question: q2,
      wellId: 1,
      radiusMeters: 5000
    });

    console.log(`Query: "${q2}"`);
    console.log(`Matched Events: ${res2.matched_events_count}`);
    console.log(`Empty Result Flag: ${res2.empty_result}`);
    console.log(`Summary Message: "${res2.summary}"`);

    const check2Passed = res2.matched_events_count === 0 &&
      res2.empty_result === true &&
      res2.summary.toLowerCase().includes('no matching historical events found');
    console.log(`Check 2 Result: ${check2Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);

    // -------------------------------------------------------------
    // Check 3: Cached fallback returns correctly with LLM disabled
    // -------------------------------------------------------------
    console.log('--- Check 3: Cached Demo Fallback with LLM API Disabled ---');
    const res3 = await search({
      question: CACHED_DEMO_QUERY,
      wellId: 1,
      forceCachedFallback: true
    });

    console.log(`Cached Query: "${CACHED_DEMO_QUERY}"`);
    console.log(`Cached Fallback Used: ${res3.cached_fallback_used || res3.is_cached_demo}`);
    console.log(`Citations count: ${res3.citations.length}`);
    console.log(`Cached Summary Excerpt: ${res3.summary.substring(0, 150)}...`);

    const check3Passed = (res3.cached_fallback_used || res3.is_cached_demo) && res3.citations.length === 3;
    console.log(`Check 3 Result: ${check3Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);

    // -------------------------------------------------------------
    // Check 4: Deterministic Correlation & Risk Analytics
    // -------------------------------------------------------------
    console.log('--- Check 4: Deterministic Risk Analytics (Counting & Elevated Flags) ---');
    // Active well: 15/9-F-12 at depth 2930m in Hugin formation
    // Offset wells nearby: 15/9-F-14 (35m away), 15/9-F-15 (58m away)
    // Both have documented mud loss around 2910m-2935m in Hugin sand!
    const corrRes = await correlateNearbyRisks({
      wellId: 1,
      currentDepth: 2930.0,
      depthWindow: 60,
      radiusMeters: 5000
    });

    console.log(`Active Well: ${corrRes.well_name} at ${corrRes.current_depth}m MD`);
    console.log(`Identified Formation: ${corrRes.current_formation}`);
    console.log(`Offset Wells Checked: ${corrRes.offset_wells_checked.map(w => `${w.name} (${w.dist_m}m)`).join(', ')}`);
    console.log(`Total Matched Offset Events in Window: ${corrRes.matched_events_count}`);

    console.log('\nRisk Analytics Table:');
    console.table(corrRes.risk_analytics.map(r => ({
      Category: r.risk_category,
      Count: r.matched_count,
      AffectedWells: r.affected_wells_count,
      TotalNearby: r.total_nearby_wells,
      Flag: r.flag
    })));

    // Verify mud_loss is elevated
    const mudLossRisk = corrRes.risk_analytics.find(r => r.risk_category === 'mud_loss');
    const check4Passed = mudLossRisk && mudLossRisk.matched_count >= 2 && mudLossRisk.flag === 'elevated';
    console.log(`Check 4 Result (mud_loss elevated with count >= 2): ${check4Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);

    // -------------------------------------------------------------
    // Check 5: Deterministic Alert Firing off Risk Analytics
    // -------------------------------------------------------------
    console.log('--- Check 5: Alert Firing Logic Strictly Gated on Elevated Flag ---');
    console.log(`Alerts Triggered: ${corrRes.alerts_triggered.length}`);
    for (const alt of corrRes.alerts_triggered) {
      console.log(`  -> Alert fired: event_type=${alt.event_type} at depth=${alt.event_depth}m, offset_well=${alt.offset_well_name}`);
    }

    // Verify that alerts in database only correspond to categories with 'elevated' flag
    const elevatedCategories = corrRes.risk_analytics.filter(r => r.flag === 'elevated').map(r => r.risk_category);
    const allAlertsValid = corrRes.alerts_triggered.length > 0 &&
      corrRes.alerts_triggered.every(a => elevatedCategories.includes(a.event_type));

    console.log(`All alerts match elevated categories only: ${allAlertsValid ? 'YES ✅' : 'NO ❌'}`);
    const check5Passed = allAlertsValid;
    console.log(`Check 5 Result: ${check5Passed ? 'PASSED ✅' : 'FAILED ❌'}\n`);

    // -------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------
    console.log('=== PHASE 6 DEFINITION OF DONE SUMMARY ===');
    console.log(`1. Real NL Query Grounded Search: ${check1Passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`2. Out-of-Range Empty Result Message: ${check2Passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`3. Cached Demo Fallback with API Offline: ${check3Passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`4. Risk Analytics Per-Category Count & Flag: ${check4Passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`5. Deterministic Alerts Fired ONLY off Elevated Flags: ${check5Passed ? 'PASSED ✅' : 'FAILED ❌'}`);

    if (check1Passed && check2Passed && check3Passed && check4Passed && check5Passed) {
      console.log('\n>>> ALL 5 PHASE 6 DEFINITION OF DONE REQUIREMENTS SATISFIED! <<<');
    } else {
      throw new Error('Phase 6 verification failed one or more checks');
    }

  } catch (err) {
    console.error('Phase 6 verification error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyPhase6();
