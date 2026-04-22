import { NextRequest, NextResponse } from 'next/server'

const NOMINATIM_HEADERS = {
  'Accept-Language': 'en',
  'User-Agent': 'Voltspot/1.0 (https://github.com/JanssenBrm/voltspot)',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  const lat = searchParams.get('lat')?.trim()
  const lng = searchParams.get('lng')?.trim()

  try {
    if (query) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: NOMINATIM_HEADERS },
      )
      if (!res.ok) return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })
      const data = await res.json()
      return NextResponse.json(data?.[0] ?? null)
    }

    if (lat && lng) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=jsonv2`,
        { headers: NOMINATIM_HEADERS },
      )
      if (!res.ok) return NextResponse.json({ error: 'Reverse geocoding failed' }, { status: 502 })
      const data = await res.json()
      return NextResponse.json(data ?? null)
    }

    return NextResponse.json({ error: 'Provide q or lat/lng query params' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
  }
}
