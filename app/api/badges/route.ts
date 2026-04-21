import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { badges } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const all = await db.select().from(badges)
  return NextResponse.json(all)
}
