import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { awardPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) return NextResponse.json({ error: 'No webhook secret' }, { status: 500 })

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: any
  try {
    evt = wh.verify(body, { 'svix-id': svix_id, 'svix-timestamp': svix_timestamp, 'svix-signature': svix_signature })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data
    const email = email_addresses?.[0]?.email_address
    if (!email) return NextResponse.json({ ok: true })

    await db.insert(users).values({
      id,
      email,
      name: [first_name, last_name].filter(Boolean).join(' ') || null,
      avatarUrl: image_url || null,
    }).onConflictDoNothing()

    await awardPoints(id, 10)
    await checkAndAwardBadges(id)
  }

  if (evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data
    const email = email_addresses?.[0]?.email_address
    if (email) {
      await db.update(users).set({
        email,
        name: [first_name, last_name].filter(Boolean).join(' ') || null,
        avatarUrl: image_url || null,
      }).where(eq(users.id, id))
    }
  }

  return NextResponse.json({ ok: true })
}
