// {{slot}} substitution for master copy. Only the keys below exist; an unknown slot throws so a
// broken master can never publish with a literal "{{city.name}}" on the page.

import type { Branch, City, ServiceCategory, Service, State } from '@/lib/db/schema';
import type { Prices } from '@/lib/data/pricing';

export type SlotContext = Record<string, string>;

const SLOT = /\{\{\s*([a-z0-9_.]+)\s*\}\}/g;

export function fill(template: string, ctx: SlotContext): string {
  return template.replace(SLOT, (_, key: string) => {
    const v = ctx[key];
    if (v === undefined) throw new Error(`Unknown slot {{${key}}}`);
    return v;
  });
}

export function fillDeep<T>(value: T, ctx: SlotContext): T {
  if (typeof value === 'string') return fill(value, ctx) as T;
  if (Array.isArray(value)) return value.map((v) => fillDeep(v, ctx)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, fillDeep(v, ctx)])) as T;
  }
  return value;
}

export function money(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

export function phoneHref(display: string): string {
  return `tel:${display.replace(/\D/g, '')}`;
}

export function buildContext(input: {
  state: State;
  city?: City;
  branch?: Branch | null;
  prices?: Prices;
  service?: Service;
  category?: ServiceCategory;
  servicesCount?: number;
}): SlotContext {
  const { state, city, branch, prices, service, category } = input;
  const ctx: SlotContext = {
    'state.code': state.code,
    'state.name': state.name,
    'state.slug': state.slug,
  };
  if (city) {
    const n = city.neighborhoods;
    Object.assign(ctx, {
      'city.name': city.name,
      'city.slug': city.slug,
      'neighborhoods.first': n[0] ?? '',
      'neighborhoods.second': n[1] ?? '',
      'neighborhoods.list': n.join(', '),
      'local.climate_line': city.localSpecifics.climate_line ?? '',
      'local.weather_stress': city.localSpecifics.weather_stress ?? '',
      'local.housing_line': city.localSpecifics.housing_line ?? '',
      'local.season_line': city.localSpecifics.season_line ?? '',
    });
  }
  if (branch) {
    Object.assign(ctx, {
      'branch.name': branch.name,
      'branch.phone': branch.phone,
      'branch.phone_href': phoneHref(branch.phone),
      'branch.street_short': branch.streetShort,
      'branch.address': `${branch.street}, ${branch.city}, ${state.code} ${branch.zip}`,
      'branch.licenses': branch.licenses.join(' · '),
    });
  }
  if (prices) {
    Object.assign(ctx, {
      'price.sweep_inspection': money(prices.sweep_inspection),
      'price.inspection': money(prices.inspection),
      'price.gas_diagnostic': money(prices.gas_diagnostic),
    });
  }
  if (input.servicesCount !== undefined) ctx['services.count'] = String(input.servicesCount);
  if (service) ctx['service.name'] = service.name;
  if (category) ctx['category.name'] = category.name;
  return ctx;
}
