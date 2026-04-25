import { normalizePlugType } from './plugTypes'

const OCM_BASE = 'https://api.openchargemap.io/v3/poi'

// Keywords that identify car-only DC fast-charge connectors.
// A station is only excluded if ALL its connectors match these keywords.
const CAR_ONLY_KEYWORDS = ['chademo', 'ccs', 'combo', 'tesla', 'gb/t', 'supercharger', 'nacs']

export interface OCMStation {
  ID: number
  AddressInfo: {
    Title: string
    AddressLine1: string | null
    Town: string | null
    Country: { Title: string; ISOCode: string } | null
    Latitude: number
    Longitude: number
  }
  Connections: Array<{
    ConnectionType: { Title: string } | null
  }> | null
  UsageCost: string | null
  StatusType: { IsOperational: boolean } | null
}

/**
 * Returns true if the station has at least one connector that could be used
 * to charge an e-bike (i.e. not exclusively car-only DC fast-charge connectors).
 */
export function isBikeCompatible(station: OCMStation): boolean {
  const connectors = (station.Connections ?? [])
    .map((c) => c.ConnectionType?.Title?.toLowerCase() ?? '')
    .filter(Boolean)

  // No connector info — include by default (benefit of the doubt)
  if (connectors.length === 0) return true

  // Include if at least one connector is NOT in the car-only set
  return connectors.some((c) => !CAR_ONLY_KEYWORDS.some((kw) => c.includes(kw)))
}

export async function fetchOCMStations(params: Record<string, string> = {}): Promise<OCMStation[]> {
  const qs = new URLSearchParams({
    output: 'json',
    maxresults: '10000',
    compact: 'true',
    verbose: 'false',
    key: process.env.OPEN_CHARGE_MAP_API_KEY ?? '',
    ...params,
  })
  const res = await fetch(`${OCM_BASE}?${qs}`, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`OCM API error: ${res.status}`)
  return res.json()
}

export function mapOCMToStation(s: OCMStation) {
  const plugTypes = Array.from(
    new Set(
      (s.Connections ?? [])
        .map((c) => c.ConnectionType?.Title)
        .filter(Boolean)
        .map((title) => normalizePlugType(title as string)),
    ),
  )

  const isFree =
    s.UsageCost == null ||
    s.UsageCost.toLowerCase().includes('free') ||
    s.UsageCost === '0'

  return {
    ocmId: String(s.ID),
    name: s.AddressInfo.Title,
    latitude: s.AddressInfo.Latitude,
    longitude: s.AddressInfo.Longitude,
    address: s.AddressInfo.AddressLine1 ?? null,
    city: s.AddressInfo.Town ?? null,
    country: s.AddressInfo.Country?.Title ?? null,
    countryCode: s.AddressInfo.Country?.ISOCode ?? null,
    plugTypes: plugTypes.length > 0 ? plugTypes : null,
    isFree,
    status: 'unverified' as const,
    source: 'ocm' as const,
  }
}
