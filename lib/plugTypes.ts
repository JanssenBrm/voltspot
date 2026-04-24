/** Canonical plug type identifiers used throughout the application. */
export type PlugType = 'Type 1' | 'Type 2' | 'Schuko' | 'CCS' | 'CHAdeMO' | 'GBT' | 'Tesla' | 'Other'

/** All supported plug types in display order. */
export const ALL_PLUG_TYPES: PlugType[] = ['Type 1', 'Type 2', 'Schuko', 'CCS', 'CHAdeMO', 'GBT', 'Tesla', 'Other']

/**
 * Cyclist-friendly display names for each canonical plug type.
 * These are shown in the UI alongside (or instead of) the raw technical codes
 * so that e-bike riders can quickly recognise the connector they need.
 */
export const PLUG_FRIENDLY_NAMES: Record<PlugType, string> = {
  'Type 1': 'Type 1 (J1772)',
  'Type 2': 'Type 2 (Mennekes)',
  'Schuko': 'Schuko (Standard Outlet)',
  'CCS': 'CCS (Fast Charge)',
  'CHAdeMO': 'CHAdeMO (Fast Charge)',
  'GBT': 'GB/T (China)',
  'Tesla': 'Tesla / NACS',
  'Other': 'Other',
}

export const PLUG_ICONS: Record<string, string> = {
  'Type 1': '🔌',
  'Type 2': '🔌',
  'Schuko': '🔌',
  'CCS': '⚡',
  'CHAdeMO': '⚡',
  'GBT': '🔌',
  'Tesla': '⚡',
  'Other': '🔌',
}

export const PLUG_COLORS: Record<string, string> = {
  'Type 1': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Type 2': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Schuko': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'CCS': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'CHAdeMO': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'GBT': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Tesla': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

/**
 * Mapping from raw OSM `socket:*` tag suffixes (after stripping the `socket:` prefix)
 * to canonical PlugType values.
 */
const OSM_SOCKET_MAP: Record<string, PlugType> = {
  schuko: 'Schuko',
  type2_cable: 'Type 2',
  type2: 'Type 2',
  type1_cable: 'Type 1',
  type1: 'Type 1',
  ccs: 'CCS',
  ccs_combo1: 'CCS',
  ccs_combo2: 'CCS',
  chademo: 'CHAdeMO',
  tesla_supercharger: 'Tesla',
  tesla_roadster: 'Tesla',
  nacs: 'Tesla',
  gbt_ac: 'GBT',
  gbt_dc: 'GBT',
  type3c: 'Type 2',
  type3a: 'Other',
}

/**
 * Normalises a raw plug-type string — whether from an OCM connection-type title,
 * an OSM `socket:*` tag suffix, or free-form user input — to one of the
 * canonical {@link PlugType} values.
 *
 * The function first tries an exact look-up in the OSM socket map, then falls
 * back to keyword matching against the lower-cased input.
 */
export function normalizePlugType(raw: string): PlugType {
  const lower = raw.toLowerCase().trim()

  // Exact OSM socket tag match
  if (OSM_SOCKET_MAP[lower]) return OSM_SOCKET_MAP[lower]

  // Keyword-based matching (handles OCM titles, legacy values, user input)
  if (lower.includes('schuko') || lower.includes('standard outlet') || lower.includes('household')) return 'Schuko'
  if (lower.includes('type 2') || lower.includes('type2') || lower.includes('mennekes') || lower.includes('iec 62196-2') || lower.includes('iec62196')) return 'Type 2'
  if (lower.includes('type 1') || lower.includes('type1') || lower.includes('j1772') || lower.includes('sae j1772')) return 'Type 1'
  if (lower.includes('ccs') || lower.includes('combo')) return 'CCS'
  if (lower.includes('chademo') || lower.includes('cha-demo')) return 'CHAdeMO'
  if (lower.includes('gb/t') || lower.includes('gbt') || lower.includes('gb_t')) return 'GBT'
  if (lower.includes('tesla') || lower.includes('nacs') || lower.includes('supercharger')) return 'Tesla'

  return 'Other'
}
