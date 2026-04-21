import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

const BADGES = [
  {
    slug: 'pioneer',
    name: 'Pioneer',
    description: 'First to claim a station',
    icon: '🏴',
    pointsValue: 50,
  },
  {
    slug: 'trail-blazer',
    name: 'Trail Blazer',
    description: 'Added your first station',
    icon: '🔥',
    pointsValue: 30,
  },
  {
    slug: 'explorer-10',
    name: 'Explorer',
    description: 'Checked in at 10 different stations',
    icon: '🗺️',
    pointsValue: 20,
  },
  {
    slug: 'explorer-50',
    name: 'Seasoned Explorer',
    description: 'Checked in at 50 different stations',
    icon: '🧭',
    pointsValue: 50,
  },
  {
    slug: 'explorer-100',
    name: 'Volt Nomad',
    description: 'Checked in at 100 different stations',
    icon: '⚡',
    pointsValue: 100,
  },
  {
    slug: 'route-maker',
    name: 'Route Maker',
    description: 'Created your first public route',
    icon: '🛣️',
    pointsValue: 20,
  },
  {
    slug: 'photographer',
    name: 'Lens Rider',
    description: 'Uploaded 10 photos',
    icon: '📸',
    pointsValue: 20,
  },
  {
    slug: 'reporter',
    name: 'Watchdog',
    description: 'Reported 5 broken stations',
    icon: '🔍',
    pointsValue: 25,
  },
  {
    slug: 'top-weekly',
    name: 'Weekly Champion',
    description: 'Reached #1 on the weekly leaderboard',
    icon: '🏆',
    pointsValue: 75,
  },
  {
    slug: 'early-adopter',
    name: 'Early Adopter',
    description: 'Joined in the first 1000 users',
    icon: '🌟',
    pointsValue: 40,
  },
]

async function main() {
  console.log('Seeding badges...')
  for (const badge of BADGES) {
    await db
      .insert(schema.badges)
      .values(badge)
      .onConflictDoNothing({ target: schema.badges.slug })
  }
  console.log(`Seeded ${BADGES.length} badges.`)
}

main().catch(console.error)
