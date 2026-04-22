import { users } from '@/lib/db/schema'

const PRIVILEGED_ROLES = new Set(['admin', 'moderator', 'approved_member'])

export const STATION_CHANGE_TYPES = ['create', 'edit', 'delete'] as const
export type StationChangeType = (typeof STATION_CHANGE_TYPES)[number]

export function isStationChangeType(value: unknown): value is StationChangeType {
  return typeof value === 'string' && (STATION_CHANGE_TYPES as readonly string[]).includes(value)
}

export type SanitizedStationPayload = {
  name?: string
  latitude?: number
  longitude?: number
  address?: string
  city?: string
  country?: string
  countryCode?: string
  plugTypes?: string[]
  isFree?: boolean
  isIndoor?: boolean
  accessNotes?: string
  photos?: string[]
}

type ValidationResult = { payload: SanitizedStationPayload; error?: string }

const trimTo = (value: unknown, max: number) => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, max)
}

const parseBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined)

const parseNumberInRange = (value: unknown, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value < min || value > max) return undefined
  return value
}

const parseStringArray = (value: unknown, maxItems: number, maxItemLength: number) => {
  if (!Array.isArray(value)) return undefined
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxItemLength))
  return normalized.length ? normalized : undefined
}

export function canModerate(role: (typeof users.$inferSelect)['role'] | null | undefined) {
  return !!role && PRIVILEGED_ROLES.has(role)
}

export function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>
}

export function sanitizeStationPayload(body: unknown, requestType: StationChangeType): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { payload: {}, error: 'Invalid request body' }
  }

  const source = body as Record<string, unknown>
  const payload: SanitizedStationPayload = {
    name: trimTo(source.name, 120),
    latitude: parseNumberInRange(source.latitude, -90, 90),
    longitude: parseNumberInRange(source.longitude, -180, 180),
    address: trimTo(source.address, 240),
    city: trimTo(source.city, 120),
    country: trimTo(source.country, 120),
    countryCode: trimTo(source.countryCode, 3),
    plugTypes: parseStringArray(source.plugTypes, 20, 60),
    isFree: parseBoolean(source.isFree),
    isIndoor: parseBoolean(source.isIndoor),
    accessNotes: trimTo(source.accessNotes, 1000),
    photos: parseStringArray(source.photos, 15, 500),
  }

  if (requestType === 'create') {
    if (!payload.name || payload.latitude == null || payload.longitude == null) {
      return { payload, error: 'Missing required fields' }
    }
  }

  if (requestType === 'edit') {
    if (Object.values(payload).every((value) => value == null)) {
      return { payload, error: 'No editable fields provided' }
    }
  }

  return { payload }
}
