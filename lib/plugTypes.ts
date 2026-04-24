/** Canonical plug type identifiers used throughout the application. */
export type PlugType =
  | 'Type 2'
  | 'Type 1'
  | 'Schuko'
  | 'UK'
  | 'US'
  | 'Swiss'
  | 'French'
  | 'CEE Blue'
  | 'Other'

/** All supported plug types in display order. */
export const ALL_PLUG_TYPES: PlugType[] = [
  'Type 2',
  'Type 1',
  'Schuko',
  'UK',
  'US',
  'Swiss',
  'French',
  'CEE Blue',
  'Other',
]

/**
 * Cyclist-friendly display names for each canonical plug type.
 * These are shown in the UI alongside (or instead of) the raw technical codes
 * so that e-bike riders can quickly recognise the connector they need.
 *
 * Only AC charging connectors relevant to e-bikes are included.
 * Car-only DC fast-charge connectors (CCS, CHAdeMO, Tesla/NACS, GB/T) are
 * normalised to 'Other' and are not shown as dedicated filter options.
 */
export const PLUG_FRIENDLY_NAMES: Record<PlugType, string> = {
  'Type 2': 'Type 2 (Mennekes)',
  'Type 1': 'Type 1 (J1772)',
  'Schuko': 'Schuko / CEE 7/4 (European Outlet)',
  'UK': 'UK 3-Pin (BS 1363)',
  'US': 'US Outlet (NEMA)',
  'Swiss': 'Swiss Outlet (SEV 1011)',
  'French': 'French / Belgian Outlet (CEE 7/5)',
  'CEE Blue': 'CEE Blue (Camping / Outdoor)',
  'Other': 'Other',
}

export const PLUG_ICONS: Record<string, string> = {
  'Type 2': '🔌',
  'Type 1': '🔌',
  'Schuko': '🔌',
  'UK': '🔌',
  'US': '🔌',
  'Swiss': '🔌',
  'French': '🔌',
  'CEE Blue': '🔌',
  'Other': '🔌',
}

export const PLUG_COLORS: Record<string, string> = {
  'Type 2': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Type 1': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Schuko': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'UK': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'US': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Swiss': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  'French': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  'CEE Blue': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

/**
 * Mapping from raw OSM `socket:*` tag suffixes (after stripping the `socket:` prefix)
 * to canonical PlugType values.
 *
 * Car-only DC fast-charge sockets (CCS, CHAdeMO, Tesla/NACS, GB/T) are mapped
 * to 'Other' so they do not appear as dedicated e-bike plug types.
 */
const OSM_SOCKET_MAP: Record<string, PlugType> = {
  // European AC
  schuko: 'Schuko',
  type2: 'Type 2',
  type2_cable: 'Type 2',
  type3c: 'Type 2',
  // North American / Japanese AC
  type1: 'Type 1',
  type1_cable: 'Type 1',
  // UK
  bs1363: 'UK',
  // US outlets
  nema_5_15: 'US',
  nema_5_20: 'US',
  nema_14_30: 'US',
  nema_14_50: 'US',
  nema_6_20: 'US',
  // Swiss
  sev1011: 'Swiss',
  // French / Belgian
  typee: 'French',
  cee_7_5: 'French',
  // CEE Blue (camping / outdoor)
  cee_blue: 'CEE Blue',
  cee_16a_blue: 'CEE Blue',
  cee_16a_ceeform: 'CEE Blue',
  // Car-only DC fast-charge — not relevant for e-bikes
  ccs: 'Other',
  ccs_combo1: 'Other',
  ccs_combo2: 'Other',
  chademo: 'Other',
  tesla_supercharger: 'Other',
  tesla_roadster: 'Other',
  nacs: 'Other',
  gbt_ac: 'Other',
  gbt_dc: 'Other',
  type3a: 'Other',
}

/**
 * Normalises a raw plug-type string — whether from an OCM connection-type title,
 * an OSM `socket:*` tag suffix, or free-form user input — to one of the
 * canonical {@link PlugType} values.
 *
 * Car-only DC fast-charge types (CCS, CHAdeMO, Tesla/NACS, GB/T) are explicitly
 * caught first and mapped to 'Other' so they cannot accidentally match an
 * e-bike-relevant keyword that appears in their full title (e.g. "CCS (Type 2)").
 *
 * The function first tries an exact look-up in the OSM socket map, then falls
 * back to keyword matching against the lower-cased input.
 */
export function normalizePlugType(raw: string): PlugType {
  const lower = raw.toLowerCase().trim()

  // Exact OSM socket tag match
  if (OSM_SOCKET_MAP[lower]) return OSM_SOCKET_MAP[lower]

  // Car-only DC fast-charge connectors — check before any AC keyword to prevent
  // false positives (e.g. "CCS (Type 2)" must not be treated as Type 2).
  if (
    lower.includes('ccs') ||
    lower.includes('combo') ||
    lower.includes('chademo') ||
    lower.includes('cha-demo') ||
    lower.includes('tesla') ||
    lower.includes('nacs') ||
    lower.includes('supercharger') ||
    lower.includes('gb/t') ||
    lower.includes('gb_t') ||
    lower.includes('gbt')
  ) return 'Other'

  // E-bike-relevant AC keyword matching (OCM titles, legacy values, user input)
  if (lower.includes('type 2') || lower.includes('type2') || lower.includes('mennekes') || lower.includes('iec 62196-2') || lower.includes('iec62196')) return 'Type 2'
  if (lower.includes('type 1') || lower.includes('type1') || lower.includes('j1772') || lower.includes('sae j1772')) return 'Type 1'
  if (lower.includes('schuko') || lower.includes('standard outlet') || lower.includes('household') || lower.includes('cee 7/4') || lower.includes('cee7/4')) return 'Schuko'
  if (lower.includes('bs 1363') || lower.includes('bs1363') || lower.includes('type g') || lower.includes('uk 3-pin') || lower.includes('uk plug')) return 'UK'
  if (lower.includes('nema') || lower.includes('type a') || lower.includes('type b') || lower.includes('us standard') || lower.includes('american plug')) return 'US'
  if (lower.includes('sev 1011') || lower.includes('sev1011') || lower.includes('type j') || lower.includes('swiss')) return 'Swiss'
  if (lower.includes('type e') || lower.includes('french') || lower.includes('belgian') || lower.includes('cee 7/5') || lower.includes('cee7/5')) return 'French'
  if (lower.includes('cee blue') || lower.includes('cee 16a') || lower.includes('camping') || lower.includes('ceeform')) return 'CEE Blue'

  return 'Other'
}
