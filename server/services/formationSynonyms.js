/**
 * Formation Synonym & Stratigraphic Lookup Table
 * 
 * Provides deterministic normalization of formation names across historical well reports.
 * Requirement: 10-15 entries minimum.
 */

'use strict';

const SYNONYM_MAP = {
  // Volve / North Sea Formations
  'hugin': 'Hugin',
  'hugin fm': 'Hugin',
  'hugin formation': 'Hugin',
  'hugin sandstone': 'Hugin',
  'top hugin': 'Hugin',

  'skagerrak': 'Skagerrak',
  'skagerrak fm': 'Skagerrak',
  'skagerrak formation': 'Skagerrak',
  'triassic sandstone': 'Skagerrak',

  'shetland': 'Shetland Group',
  'shetland group': 'Shetland Group',
  'shetland chalk': 'Shetland Group',
  'chalk group': 'Shetland Group',
  'tor formation': 'Shetland Group',
  'ekofisk formation': 'Shetland Group',

  'hordaland': 'Hordaland Group',
  'hordaland group': 'Hordaland Group',
  'hordaland shale': 'Hordaland Group',
  'gumbo shale': 'Hordaland Group',

  'rogaland': 'Rogaland Group',
  'rogaland group': 'Rogaland Group',
  'balder formation': 'Rogaland Group',
  'sele formation': 'Rogaland Group',

  'nordland': 'Nordland Group',
  'nordland group': 'Nordland Group',
  'nordland claystone': 'Nordland Group',

  // Assam-Arakan Basin / OIL Analogues
  'tipam': 'Tipam',
  'tipam formation': 'Tipam',
  'tipam sandstone': 'Tipam',
  'upper tipam': 'Tipam',

  'barail': 'Barail',
  'barail group': 'Barail',
  'barail arenaceous': 'Barail',
  'barail coal shale': 'Barail',

  'kopili': 'Kopili',
  'kopili formation': 'Kopili',
  'kopili shale': 'Kopili',

  'girujan': 'Girujan Clay',
  'girujan': 'Girujan Clay',
  'girujan clay': 'Girujan Clay'
};

const CANONICAL_FORMATIONS = new Set(Object.values(SYNONYM_MAP));

/**
 * Check if a given formation name maps to a recognized geological formation
 */
function isKnownFormation(rawName) {
  if (!rawName || typeof rawName !== 'string') return false;
  const clean = rawName.trim().toLowerCase();
  if (SYNONYM_MAP[clean]) return true;
  for (const key of Object.keys(SYNONYM_MAP)) {
    if (clean.includes(key)) return true;
  }
  return false;
}

/**
 * Normalize formation name using synonym lookup
 * @param {string} rawName 
 * @returns {string} canonical formation name
 */
function normalizeFormation(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'Unknown';
  const clean = rawName.trim().toLowerCase();
  if (SYNONYM_MAP[clean]) {
    return SYNONYM_MAP[clean];
  }
  for (const [key, canonical] of Object.entries(SYNONYM_MAP)) {
    if (clean.includes(key)) {
      return canonical;
    }
  }
  return rawName.trim();
}

module.exports = {
  SYNONYM_MAP,
  CANONICAL_FORMATIONS,
  isKnownFormation,
  normalizeFormation
};
