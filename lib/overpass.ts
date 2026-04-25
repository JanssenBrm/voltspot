import { normalizePlugType } from './plugTypes'

const SOCKET_PREFIX = 'socket:'

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: {
    lat: number
    lon: number
  }
  tags?: Record<string, string>
}

function buildCountryQuery(isoCode: string, since?: Date): string {
  const newerFilter = since ? `(newer:"${since.toISOString()}")` : ''
  return `
[out:json][timeout:60];
area["ISO3166-1"="${isoCode}"]->.searchArea;
(
  node["amenity"="charging_station"]["bicycle"="yes"](area.searchArea)${newerFilter};
  way["amenity"="charging_station"]["bicycle"="yes"](area.searchArea)${newerFilter};
  node["amenity"="charging_station"]["motorcar"!="yes"]["bicycle"!="no"]["socket:schuko"](area.searchArea)${newerFilter};
  node["amenity"="charging_station"]["motorcar"!="yes"]["socket:type2_cable"!~"."]["socket:chademo"!~"."]["socket:ccs"!~"."](area.searchArea)${newerFilter};
);
out center body;
>;
out skel qt;
  `.trim()
}

async function queryOverpass(query: string, attempt = 1): Promise<OverpassElement[]> {
  try {
    const body = new URLSearchParams({ data: query }).toString()
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json,text/plain,*/*',
        'User-Agent': 'voltspot-seeder/1.0 (+https://github.com/JanssenBrm/voltspot)',
      },
      body,
      next: { revalidate: 0 },
    })

    if (res.status === 429 || res.status === 504) {
      if (attempt >= 3) throw new Error('Overpass failed after 3 attempts')
      const delay = attempt * 2000
      await new Promise((r) => setTimeout(r, delay))
      return queryOverpass(query, attempt + 1)
    }

    if (!res.ok) {
      const errorBody = await res.text()
      throw new Error(`Overpass API error: ${res.status}${errorBody ? ` - ${errorBody.slice(0, 240)}` : ''}`)
    }

    const json: { elements?: OverpassElement[] } = await res.json()
    return json.elements ?? []
  } catch (err) {
    if (attempt >= 3) throw err
    await new Promise((r) => setTimeout(r, attempt * 2000))
    return queryOverpass(query, attempt + 1)
  }
}

export async function fetchStationsForCountry(isoCode: string): Promise<OverpassElement[]> {
  return queryOverpass(buildCountryQuery(isoCode.toUpperCase()))
}

export async function fetchRecentStationsForCountry(isoCode: string, since: Date): Promise<OverpassElement[]> {
  return queryOverpass(buildCountryQuery(isoCode.toUpperCase(), since))
}

export function mapOverpassToStation(element: OverpassElement) {
  const tags = element.tags ?? {}
  const latitude = element.lat ?? element.center?.lat
  const longitude = element.lon ?? element.center?.lon

  if (latitude == null || longitude == null) {
    throw new Error(`Overpass element ${element.type}/${element.id} has no coordinates`)
  }

  const plugTypes = Array.from(
    new Set(
      Object.entries(tags)
        .filter(([key, value]) => key.startsWith(SOCKET_PREFIX) && value !== 'no' && value !== '0')
        .map(([key]) => normalizePlugType(key.replace(SOCKET_PREFIX, ''))),
    ),
  )

  const countryCode =
    tags['addr:country'] ?? tags['country_code'] ?? tags['ISO3166-1:alpha2'] ?? tags['is_in:country_code'] ?? null

  const country = tags['addr:country'] ?? tags['is_in:country'] ?? null

  return {
    ocmId: `osm:${element.type}/${element.id}`,
    name: tags.name ?? 'Charging Station',
    latitude,
    longitude,
    address: tags['addr:street'] ?? tags.address ?? null,
    city: tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'] ?? null,
    country,
    countryCode: countryCode ? countryCode.toUpperCase() : null,
    plugTypes: plugTypes.length > 0 ? plugTypes : null,
    isFree: tags.fee === 'no' ? true : tags.fee === 'yes' ? false : null,
    isIndoor: tags.indoor ? tags.indoor === 'yes' : null,
    accessNotes: tags.access ?? null,
    source: 'osm' as const,
  }
}
