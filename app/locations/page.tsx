import type { Metadata } from 'next';
import { NationalHub } from '@/components/templates/NationalHub';
import { assembleNationalHub } from '@/lib/content/assemble-hubs';
import { getPrices } from '@/lib/data/pricing';
import { getBranchesForState, getCitiesForState, getStates } from '@/lib/data/states';

// Test slice: always read the database. Production: static + ISR, revalidated by the `states`/`branches` tags (architecture §10).
export const dynamic = 'force-dynamic';

async function load() {
  const states = await getStates();
  const prices = await getPrices(null);
  const citiesByState = new Map<number, Awaited<ReturnType<typeof getCitiesForState>>[number]['city'][]>();
  const branchesByState = new Map<number, Awaited<ReturnType<typeof getBranchesForState>>>();
  for (const s of states) {
    const listings = await getCitiesForState(s.id);
    citiesByState.set(s.id, listings.filter((l) => l.published).map((l) => l.city));
    branchesByState.set(s.id, await getBranchesForState(s.id));
  }
  return assembleNationalHub({ states, citiesByState, branchesByState, prices });
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await load();
  return { title: p.meta.title, description: p.meta.description, alternates: { canonical: p.meta.canonical } };
}

export default async function LocationsPage() {
  const p = await load();
  return <NationalHub {...p} />;
}
