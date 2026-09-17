import { getDb } from '@/lib/db/client';
import { contactMessages } from '@/lib/db/schema';

export async function insertContactMessage(input: {
  name: string;
  email: string;
  message: string;
  pageSlug?: string;
  sourceUrl?: string;
}) {
  const db = await getDb();
  const [row] = await db.insert(contactMessages).values(input).returning();
  return row;
}
