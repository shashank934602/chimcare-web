const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export type ContactSubmission = { name: string; email: string; message: string; pageSlug?: string; sourceUrl?: string };

/** Shared by the client and the server. Returns field → message. */
export function validateContact(raw: Record<string, unknown>): { errors: Record<string, string>; value?: ContactSubmission } {
  const errors: Record<string, string> = {};
  const name = str(raw.name, 120);
  if (name.length < 2) errors.name = 'Tell us who to ask for.';
  const email = str(raw.email, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter a valid email address.';
  const message = str(raw.message, 2000);
  if (message.length < 10) errors.message = 'Tell us a bit more about how we can help.';
  const pageSlug = str(raw.pageSlug, 200);
  const sourceUrl = str(raw.sourceUrl, 500);

  if (Object.keys(errors).length) return { errors };
  return { errors, value: { name, email, message, pageSlug: pageSlug || undefined, sourceUrl: sourceUrl || undefined } };
}
