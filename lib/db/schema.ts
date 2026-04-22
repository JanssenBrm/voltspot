import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  boolean,
  integer,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID (e.g. "user_2abc...")
  email: text('email').unique().notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: text('role').default('user'),
  points: integer('points').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const stations = pgTable('stations', {
  id: uuid('id').primaryKey().defaultRandom(),
  ocmId: text('ocm_id').unique(),
  name: text('name').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  address: text('address'),
  city: text('city'),
  country: text('country'),
  countryCode: text('country_code'),
  plugTypes: text('plug_types').array(),
  isFree: boolean('is_free'),
  isIndoor: boolean('is_indoor'),
  accessNotes: text('access_notes'),
  status: text('status').default('unverified'),
  claimedBy: text('claimed_by').references(() => users.id),
  claimedAt: timestamp('claimed_at'),
  pioneerUserId: text('pioneer_user_id').references(() => users.id),
  source: text('source').default('ocm'),
  photos: text('photos').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const checkIns = pgTable('check_ins', {
  id: uuid('id').primaryKey().defaultRandom(),
  stationId: uuid('station_id').references(() => stations.id).notNull(),
  userId: text('user_id').references(() => users.id),
  rating: integer('rating'),
  comment: text('comment'),
  statusReported: text('status_reported'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  pointsValue: integer('points_value').default(0),
})

export const userBadges = pgTable(
  'user_badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => users.id).notNull(),
    badgeSlug: text('badge_slug').references(() => badges.slug).notNull(),
    earnedAt: timestamp('earned_at').defaultNow(),
  },
  (t) => ({ unq: unique().on(t.userId, t.badgeSlug) }),
)

export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  stationIds: uuid('station_ids').array(),
  distanceKm: doublePrecision('distance_km'),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const stationChangeRequests = pgTable('station_change_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  stationId: uuid('station_id').references(() => stations.id),
  requestType: text('request_type').notNull(),
  status: text('status').default('pending').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  requestedBy: text('requested_by').references(() => users.id),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewNote: text('review_note'),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const leaderboardSnapshots = pgTable('leaderboard_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id).notNull(),
  period: text('period'),
  countryCode: text('country_code'),
  rank: integer('rank'),
  points: integer('points'),
  snapshotAt: timestamp('snapshot_at').defaultNow(),
})

export type User = typeof users.$inferSelect
export type Station = typeof stations.$inferSelect
export type CheckIn = typeof checkIns.$inferSelect
export type Badge = typeof badges.$inferSelect
export type UserBadge = typeof userBadges.$inferSelect
export type Route = typeof routes.$inferSelect
export type StationChangeRequest = typeof stationChangeRequests.$inferSelect
