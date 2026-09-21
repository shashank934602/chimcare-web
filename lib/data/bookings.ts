import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bookings, type Booking, type NewBooking } from '@/lib/db/schema';

export async function insertBooking(row: NewBooking): Promise<Booking> {
  const db = await getDb();
  const [saved] = await db.insert(bookings).values(row).returning();
  return saved;
}

export async function markBookingSynced(id: number, status: string, externalId: string | null): Promise<void> {
  const db = await getDb();
  await db.update(bookings).set({ status, externalId }).where(eq(bookings.id, id));
}
