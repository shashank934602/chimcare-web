import { SERVICE_KEYS, TIME_WINDOWS, type BookingContext, type BookingSubmission } from './types';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : undefined);

export function todayISO(): string {
  const t = new Date();
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
  return t.toISOString().slice(0, 10);
}

/** Shared by the client (per step) and the server (whole payload). Returns field → message. */
export function validateBooking(raw: Record<string, unknown>): { errors: Record<string, string>; value?: BookingSubmission } {
  const errors: Record<string, string> = {};
  const service = str(raw.service);
  if (!(SERVICE_KEYS as readonly string[]).includes(service)) errors.service = 'Choose the service you need.';
  const date = str(raw.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = 'Pick a preferred date.';
  else if (date < todayISO()) errors.date = 'Pick today or a later date.';
  const timeWindow = str(raw.timeWindow);
  if (!(TIME_WINDOWS as readonly string[]).includes(timeWindow)) errors.timeWindow = 'Choose a time window.';
  const name = str(raw.name, 120);
  if (name.length < 2) errors.name = 'Tell us who to ask for.';
  const phone = str(raw.phone, 40);
  if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a 10-digit phone number.';
  const email = str(raw.email, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter a valid email address.';
  const zip = str(raw.zip, 10);
  if (!/^\d{5}$/.test(zip)) errors.zip = 'Enter your 5-digit ZIP code.';
  const address = str(raw.address, 200);
  const notes = str(raw.notes, 1000);

  const c = (raw.context ?? {}) as Record<string, unknown>;
  const pageKind = str(c.pageKind);
  const context: BookingContext = {
    pageSlug: str(c.pageSlug),
    pageKind: (['hub', 'state', 'city', 'service'] as const).includes(pageKind as never) ? (pageKind as BookingContext['pageKind']) : 'hub',
    label: str(c.label, 120) || 'Chimcare',
    stateCode: str(c.stateCode, 2) || undefined,
    stateName: str(c.stateName, 60) || undefined,
    cityId: int(c.cityId),
    cityName: str(c.cityName, 80) || undefined,
    branchId: int(c.branchId),
    branchName: str(c.branchName, 80) || undefined,
    serviceId: int(c.serviceId),
    serviceName: str(c.serviceName, 120) || undefined,
  };

  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    value: {
      service: service as BookingSubmission['service'],
      serviceLabel: str(raw.serviceLabel, 120) || service,
      date,
      timeWindow: timeWindow as BookingSubmission['timeWindow'],
      name,
      phone,
      email,
      zip,
      address: address || undefined,
      notes: notes || undefined,
      context,
      sourceUrl: str(raw.sourceUrl, 500) || undefined,
    },
  };
}
