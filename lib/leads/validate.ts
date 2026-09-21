import { SERVICE_KEYS, type ServiceKey } from '@/lib/booking/types';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * An out-of-area request. Note what is NOT here: no preferred date, no time window. Nothing on this
 * form is being scheduled, so asking a visitor to choose a visit slot for a job we will not do would
 * be a lie told in a form field.
 */
export type LeadSubmission = {
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
export function validateLead(raw: Record<string, unknown>): { errors: Record<string, string>; value?: LeadSubmission } {
  const errors: Record<string, string> = {};
  const name = str(raw.name, 120);
  if (name.length < 2) errors.name = 'Tell us who to ask for.';
  const phone = str(raw.phone, 40);
  if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a 10-digit phone number.';
  const email = str(raw.email, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter a valid email address.';
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
      name,
      phone,
      email,
      zip,
      service: serviceKey,
      serviceLabel: serviceLabel || undefined,
      message: message || undefined,
      pageSlug: pageSlug || undefined,
      pageKind: pageKind || undefined,
      sourceUrl: sourceUrl || undefined,
    },
  };
}
