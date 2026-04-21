import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  boolean,
  integer,
  unique,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  name: text('name'),
  image: text('image'), // required by NextAuth adapter
  avatarUrl: text('avatar_url'),
  provider: text('provider'),
  role: text('role').default('user'),
  points: integer('points').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
})

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires').notNull(),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires').notNull(),
  },
  (t) => ({ unq: unique().on(t.identifier, t.token) }),
)

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
  claimedBy: uuid('claimed_by').references(() => users.id),
  claimedAt: timestamp('claimed_at'),
  pioneerUserId: uuid('pioneer_user_id').references(() => users.id),
  source: text('source').default('ocm'),
  photos: text('photos').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const checkIns = pgTable('check_ins', {
  id: uuid('id').primaryKey().defaultRandom(),
  stationId: uuid('station_id').references(() => stations.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
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
    userId: uuid('user_id').references(() => users.id).notNull(),
    badgeSlug: text('badge_slug').references(() => badges.slug).notNull(),
    earnedAt: timestamp('earned_at').defaultNow(),
  },
  (t) => ({ unq: unique().on(t.userId, t.badgeSlug) }),
)

export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  stationIds: uuid('station_ids').array(),
  distanceKm: doublePrecision('distance_km'),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const leaderboardSnapshots = pgTable('leaderboard_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
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
