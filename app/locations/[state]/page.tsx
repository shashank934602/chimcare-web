import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StateHub } from '@/components/templates/StateHub';
import { assembleStateHub } from '@/lib/content/assemble-hubs';
import { getPrices } from '@/lib/data/pricing';
import { getCitiesForState, getStateBySlug } from '@/lib/data/states';

export const dynamic = 'force-dynamic';

type Params = Promise<{ state: string }>;

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

export default async function StatePage({ params }: { params: Params }) {
  const { state } = await params;
  const p = await load(state);
  if (!p) notFound();
  return <StateHub {...p} />;
}
