import { SERVICE_KEYS, type ServiceKey } from '@/lib/booking/types';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * A service request from the ZIP popup: who to call back, where, and what about.
 *
 * Note what is NOT here: no preferred date, no time window. The popup never asks for a slot — it
 * promises a call back, and a form that asked someone to pick a visit time before anyone had
 * confirmed they could come would be promising something different.
 *
 * The same submission serves both outcomes. Which table it lands in is decided server-side from the
 * ZIP alone (lib/content/coverage.ts); the visitor sees one form either way.
 */
export type RequestSubmission = {
  name: string;
  phone: string;
  email: string;
  zip: string;
  service?: ServiceKey;
  serviceLabel?: string;
  message?: string;
  pageSlug?: string;
  pageKind?: string;
  sourceUrl?: string;
};

/** Shared by the client (before submit) and the server (whole payload). Returns field → message. */
export function validateRequest(raw: Record<string, unknown>): { errors: Record<string, string>; value?: RequestSubmission } {
  const errors: Record<string, string> = {};
  const name = str(raw.name, 120);
  if (name.length < 2) errors.name = 'Enter your name.';
  const phone = str(raw.phone, 40);
  if (phone.replace(/\D/g, '').length !== 10) errors.phone = 'Enter a 10-digit phone number.';
  const email = str(raw.email, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter an email like name@example.com.';
  const zip = str(raw.zip, 10);
  if (!/^\d{5}$/.test(zip)) errors.zip = 'Enter your 5-digit ZIP code.';

  // Optional — a request can arrive without a service picked, and often does.
  const service = str(raw.service);
  const serviceKey = (SERVICE_KEYS as readonly string[]).includes(service) ? (service as ServiceKey) : undefined;
  const serviceLabel = str(raw.serviceLabel, 120);
  const message = str(raw.message, 2000);
  const pageSlug = str(raw.pageSlug, 200);
  const pageKind = str(raw.pageKind, 20);
  const sourceUrl = str(raw.sourceUrl, 500);

  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    value: {
      name, phone, email, zip,
      service: serviceKey,
      serviceLabel: serviceLabel || undefined,
      message: message || undefined,
      pageSlug: pageSlug || undefined,
      pageKind: pageKind || undefined,
      sourceUrl: sourceUrl || undefined,
    },
  };
}
