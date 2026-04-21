const OCM_BASE = 'https://api.openchargemap.io/v3/poi'

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
  const plugTypes = (s.Connections ?? [])
    .map((c) => c.ConnectionType?.Title)
    .filter(Boolean) as string[]

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
