import { NextResponse } from 'next/server';
import { count } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { pages } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(pages);
  return NextResponse.json({ ok: true, driver: process.env.DATABASE_URL ? 'postgres' : 'pglite', pages: Number(n) });
}
