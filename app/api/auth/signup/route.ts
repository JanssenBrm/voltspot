export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, accounts } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { name, email, password } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const [user] = await db
    .insert(users)
    .values({ name, email, provider: 'email' })
    .returning()

  await db.insert(accounts).values({
    userId: user.id,
    type: 'credentials',
    provider: 'email',
    providerAccountId: user.id,
    refresh_token: hashedPassword, // store hashed password here
  })

  // Award signup points + check early adopter badge
  const { awardPoints } = await import('@/lib/points')
  const { checkAndAwardBadges } = await import('@/lib/badges')
  await awardPoints(user.id, 10)
  await checkAndAwardBadges(user.id)

  // Send verification email
  try {
    await resend.emails.send({
      from: 'VoltSpot <noreply@voltspot.app>',
      to: email,
      subject: 'Welcome to VoltSpot! ⚡',
      html: `
        <h1>Welcome to VoltSpot, ${name}!</h1>
        <p>Thanks for joining the world's community-driven e-bike charging network.</p>
        <p>Start finding and checking in at charging stations near you.</p>
        <a href="${process.env.NEXTAUTH_URL}" style="background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">
          Explore the Map
        </a>
        <p style="color:#888;font-size:12px;margin-top:32px;">
          Station data partially sourced from Open Charge Map (openchargemap.org)
        </p>
      `,
    })
  } catch (err) {
    console.error('Email send failed:', err)
  }

  return NextResponse.json({ success: true, userId: user.id }, { status: 201 })
}
