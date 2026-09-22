/**
 * Correlation & Risk Analytics Service (Phase 6)
 * 
 * Rules:
 * 1. The correlation and alerting logic is strictly DETERMINISTIC (formation match + depth window).
 *    Never use an LLM for judgment calls or alert triggering.
 * 2. Risk analytics aggregates matched offset events into counts and elevated/normal flags per category.
 * 3. Alerts fire ONLY off the risk analytics output (elevated flag), NOT raw correlation matches.
 */

'use strict';

const { query } = require('../config/db');
const { normalizeFormation, isKnownFormation } = require('./formationSynonyms');

const RISK_CATEGORIES = [
  'mud_loss',
  'stuck_pipe',
  'overpressure',
  'torque_spike',
  'cementing',
  'kick',
  'fishing',
  'npt'
];

/**
 * Determine the current geological formation for a well at a given depth
 */
async function getCurrentFormation(wellId, depth) {
  // Check formations table for depth intervals with known geological names
  const formRes = await query(`
    SELECT formation, top_depth, bottom_depth FROM formations
    WHERE well_id = $1 AND top_depth <= $2
    ORDER BY top_depth DESC
  `, [wellId, depth]);

  for (const row of formRes.rows) {
    if (isKnownFormation(row.formation)) {
      if (row.bottom_depth === null || row.bottom_depth === undefined || row.bottom_depth >= depth) {
        return normalizeFormation(row.formation);
      }
    }
  }

  // Fallback to well's primary formation label
  const wellRes = await query('SELECT formation FROM wells WHERE id = $1', [wellId]);
  if (wellRes.rows.length > 0 && wellRes.rows[0].formation) {
    return normalizeFormation(wellRes.rows[0].formation);
  }

  return 'Unknown';
}

/**
 * Perform deterministic correlation across offset wells
 * 
 * @param {object} params
 * @param {number} params.wellId - ID of active well
 * @param {number} params.currentDepth - Current measured depth (MD) in metres
 * @param {number} [params.depthWindow=50] - Depth window (+/- metres)
 * @param {number} [params.radiusMeters=25000] - Search radius in metres
 */
async function correlateNearbyRisks({ wellId, currentDepth, depthWindow = 50, radiusMeters = 25000 }) {
  // 1. Get active well location and details
  const activeWellRes = await query(`
    SELECT id, name, latitude, longitude, location, formation, current_depth, planned_depth
    FROM wells WHERE id = $1
  `, [wellId]);

  if (activeWellRes.rows.length === 0) {
    throw new Error(`Well with id ${wellId} not found`);
  }
  const activeWell = activeWellRes.rows[0];

  const minDepth = Math.max(0, currentDepth - depthWindow);
  const maxDepth = currentDepth + depthWindow;

  // 2. Identify active well's formation at this depth
  const currentFormation = await getCurrentFormation(wellId, currentDepth);

  // 3. Find nearby offset wells (excluding the active well itself)
  const nearbyWellsRes = await query(`
    SELECT id, name, latitude, longitude, formation, current_depth,
           ST_Distance(location::geography, $1::geography) AS dist_m
    FROM wells
    WHERE id != $2 AND ST_DWithin(location::geography, $1::geography, $3)
    ORDER BY dist_m ASC
  `, [activeWell.location, wellId, radiusMeters]);

  const offsetWells = nearbyWellsRes.rows;
  const offsetWellIds = offsetWells.map(w => w.id);

  if (offsetWellIds.length === 0) {
    return {
      well_id: wellId,
      well_name: activeWell.name,
      current_depth: currentDepth,
      depth_window: { start: minDepth, end: maxDepth },
      current_formation: currentFormation,
      offset_wells_count: 0,
      matched_events: [],
      risk_analytics: [],
      alerts_triggered: []
    };
  }

  // 4. Retrieve candidate historical events from offset wells within depth window
  // Deterministic formation matching checks canonical name or fuzzy substring
  const eventsRes = await query(`
    SELECT e.id, e.well_id, w.name AS well_name, e.event_type, e.depth, e.formation,
           e.description, e.mitigation, e.source_excerpt, e.confidence, e.needs_review,
           ROUND(ST_Distance(w.location::geography, $1::geography)::numeric, 1) AS distance_m
    FROM events e
    JOIN wells w ON w.id = e.well_id
    WHERE e.well_id = ANY($2::int[])
      AND e.depth >= $3 AND e.depth <= $4
    ORDER BY distance_m ASC, e.depth ASC
  `, [activeWell.location, offsetWellIds, minDepth, maxDepth]);

  // Filter deterministically by formation match / synonym match
  const matchedEvents = eventsRes.rows.filter(ev => {
    if (!ev.formation || ev.formation === 'Unknown') return true; // retain if formation unknown but depth matches
    const evNorm = normalizeFormation(ev.formation);
    return evNorm.toLowerCase() === currentFormation.toLowerCase() ||
           evNorm.toLowerCase().includes(currentFormation.toLowerCase()) ||
           currentFormation.toLowerCase().includes(evNorm.toLowerCase());
  });

  // 5. Build Risk Analytics (Frequency & Counting Layer)
  // Take matched-events list and aggregate into per-category signal across the named risk types
  const riskAnalytics = [];
  const totalOffsetWells = offsetWells.length;

  for (const category of RISK_CATEGORIES) {
    const categoryEvents = matchedEvents.filter(e => e.event_type === category);
    const count = categoryEvents.length;
    const distinctWellsCount = new Set(categoryEvents.map(e => e.well_id)).size;

    // Deterministic threshold for elevated risk:
    // e.g., 2 or more occurrences, or >= 40% of nearby wells had this issue in this depth window
    const isElevated = count >= 2 || (totalOffsetWells > 0 && distinctWellsCount >= 2) || (count >= 1 && totalOffsetWells === 1);
    const flag = isElevated ? 'elevated' : 'normal';

    const summaryRecord = {
      risk_category: category,
      matched_count: count,
      affected_wells_count: distinctWellsCount,
      total_nearby_wells: totalOffsetWells,
      flag,
      description: `${distinctWellsCount} of ${totalOffsetWells} nearby wells experienced ${category.replace('_', ' ')} in depth window ${minDepth}m - ${maxDepth}m.`
    };
    riskAnalytics.push(summaryRecord);

    // Save/update in risk_summary table
    await query(`
      INSERT INTO risk_summary (well_id, depth_window_start, depth_window_end, risk_category, matched_count, flag)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [wellId, minDepth, maxDepth, category, count, flag]);
  }

  // 6. Alert Firing Logic: fires ONLY off risk analytics output where flag = 'elevated'
  const alertsTriggered = [];
  const elevatedCategories = riskAnalytics.filter(r => r.flag === 'elevated').map(r => r.risk_category);

  if (elevatedCategories.length > 0) {
    // Select the most representative matched events for these elevated categories
    const eventsToAlert = matchedEvents.filter(e => elevatedCategories.includes(e.event_type));

    for (const ev of eventsToAlert) {
      // Check if an open alert for this well & event already exists to prevent duplication
      const existingAlert = await query(`
        SELECT id FROM alerts
        WHERE well_id = $1 AND event_id = $2 AND status = 'open'
      `, [wellId, ev.id]);

      if (existingAlert.rows.length === 0) {
        const newAlert = await query(`
          INSERT INTO alerts (well_id, event_id, triggered_at, depth_at_trigger, status)
          VALUES ($1, $2, NOW(), $3, 'open')
          RETURNING id, well_id, event_id, triggered_at, depth_at_trigger, status
        `, [wellId, ev.id, currentDepth]);

        alertsTriggered.push({
          ...newAlert.rows[0],
          event_type: ev.event_type,
          event_depth: ev.depth,
          event_formation: ev.formation,
          description: ev.description,
          mitigation: ev.mitigation,
          source_excerpt: ev.source_excerpt,
          offset_well_name: ev.well_name,
          distance_m: ev.distance_m
        });
      }
    }
  }

  return {
    well_id: wellId,
    well_name: activeWell.name,
    current_depth: currentDepth,
    depth_window: { start: minDepth, end: maxDepth },
    current_formation: currentFormation,
    offset_wells_checked: offsetWells.map(w => ({ id: w.id, name: w.name, dist_m: Math.round(w.dist_m) })),
    matched_events_count: matchedEvents.length,
    matched_events: matchedEvents,
    risk_analytics: riskAnalytics,
    alerts_triggered: alertsTriggered
  };
}

module.exports = {
  getCurrentFormation,
  correlateNearbyRisks,
  RISK_CATEGORIES
};
