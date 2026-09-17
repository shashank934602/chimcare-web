import { NextResponse } from 'next/server';
import { insertContactMessage } from '@/lib/data/contact';
import { validateContact } from '@/lib/contact/validate';

export const dynamic = 'force-dynamic';

/** POST /api/contact — validate → store. No adapter: unlike bookings, a message has nowhere else to sync to yet. */
export async function POST(req: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, errors: { form: 'Invalid request.' } }, { status: 400 });
  }
  const { errors, value } = validateContact(raw);
  if (!value) return NextResponse.json({ ok: false, errors }, { status: 422 });

  await insertContactMessage({ ...value, sourceUrl: value.sourceUrl ?? req.headers.get('referer') ?? undefined });
  return NextResponse.json({ ok: true }, { status: 201 });
}
