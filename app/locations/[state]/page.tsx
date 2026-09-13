import 'leaflet/dist/leaflet.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StateHub } from '@/components/templates/StateHub';
import { assembleStateHub } from '@/lib/content/assemble-hubs';
import { SEARCH_ENABLED } from '@/lib/content/search';
import { getPrices } from '@/lib/data/pricing';
import { getCitiesForState, getStateBySlug } from '@/lib/data/states';

export const dynamic = 'force-dynamic';

type Params = Promise<{ state: string }>;
type Search = Promise<{ q?: string }>;

async function load(slug: string) {
  const state = await getStateBySlug(slug);
  if (!state || !state.verified) return null; // unverified states have no hub page yet
  const listings = await getCitiesForState(state.id);
  const prices = await getPrices(listings.find((l) => l.branch)?.branch?.regionId ?? null);
  return assembleStateHub({ state, listings, prices });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { state } = await params;
  const p = await load(state);
  if (!p) return { title: 'Not found' };
  return { title: p.meta.title, description: p.meta.description, alternates: { canonical: p.meta.canonical } };
}

export default async function StatePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { state } = await params;
  const { q } = await searchParams;
  const p = await load(state);
  if (!p) notFound();
  // `?q=` filters on the server too, so a shared link renders already filtered without JavaScript.
  // While search is switched off the query is ignored, so the page never renders pre-filtered.
  return <StateHub {...p} query={SEARCH_ENABLED ? q ?? '' : ''} stateSlug={state} />;
}
