// The booking adapter boundary (architecture §12). The site only ever talks to this interface;
// swapping MockAdapter for WorkizAdapter is a config change (BOOKING_ADAPTER=workiz).

import type { BookingSubmission } from './types';

export type AdapterResult = { externalId: string | null; status: 'synced' | 'received' };

export interface BookingAdapter {
  readonly name: string;
  createBooking(input: BookingSubmission & { reference: string }): Promise<AdapterResult>;
}

export class MockAdapter implements BookingAdapter {
  readonly name = 'mock';
  async createBooking(input: BookingSubmission & { reference: string }): Promise<AdapterResult> {
    console.log(`[booking:mock] ${input.reference} ${input.service} ${input.date} ${input.timeWindow} for ${input.context.label}`);
    return { externalId: `MOCK-${input.reference}`, status: 'synced' };
  }
}

/** Placeholder until the Workiz API contract is known. Env: WORKIZ_API_TOKEN, WORKIZ_API_SECRET. */
export class WorkizAdapter implements BookingAdapter {
  readonly name = 'workiz';
  async createBooking(): Promise<AdapterResult> {
    if (!process.env.WORKIZ_API_TOKEN) throw new Error('WORKIZ_API_TOKEN is not set');
    // TODO: POST to the Workiz job-creation endpoint and return its job id as externalId.
    throw new Error('WorkizAdapter is not implemented yet');
  }
}

export function getBookingAdapter(): BookingAdapter {
  return process.env.BOOKING_ADAPTER === 'workiz' ? new WorkizAdapter() : new MockAdapter();
}
