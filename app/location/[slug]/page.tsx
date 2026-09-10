import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { CityPage } from '@/components/templates/CityPage';
import { ServicePage } from '@/components/templates/ServicePage';
import { assembleCityPage, assembleServicePage } from '@/lib/content/assemble';
import { getCityBundle } from '@/lib/data/cities';
import { getMasters } from '@/lib/data/masters';
import { getPublishedServiceSlugs, getServiceForPage, resolvePage } from '@/lib/data/pages';
import { getPrices } from '@/lib/data/pricing';
import { getCatalog } from '@/lib/data/services';

/**
 * The dispatcher (architecture §4). One route for every legacy /location/{slug}/ URL:
 * the site.pages row decides whether the URL is a city page, a service page, a redirect or a 404.
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  const page = await resolvePage(slug);
  if (!page) return { kind: 'missing' as const };
  if (page.fate === 'redirect' && page.redirectTo) return { kind: 'redirect' as const, to: page.redirectTo };
  if (page.status !== 'published' || !page.cityId) return { kind: 'missing' as const };

  const [bundle, catalog, masters, serviceSlugs] = await Promise.all([
    getCityBundle(page.cityId),
    getCatalog(),
    getMasters(),
    getPublishedServiceSlugs(page.cityId),
  ]);
  if (!bundle) return { kind: 'missing' as const };
  const prices = await getPrices(bundle.city.regionId ?? bundle.branch?.regionId ?? null);
  const common = { city: bundle.city, state: bundle.state, branch: bundle.branch, prices, faqs: bundle.faqs, catalog, serviceSlugs, masters };

  if (page.kind === 'city') {
    const props = assembleCityPage(common);
    if (!props.gate.ok) {
      // A published row that no longer passes the distinctness gate is withheld, not served thin.
      console.warn(`[gate] ${slug} withheld: missing ${props.gate.missing.join(', ')}`);
      return { kind: 'missing' as const };
    }
    return { kind: 'city' as const, props };
  }
  if (page.kind === 'service' && page.serviceId) {
    const svc = await getServiceForPage(page.serviceId);
    if (!svc) return { kind: 'missing' as const };
    return { kind: 'service' as const, props: assembleServicePage({ ...common, slug, service: svc.service, category: svc.category }) };
  }
  return { kind: 'missing' as const };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const r = await load(slug);
  if (r.kind !== 'city' && r.kind !== 'service') return { title: 'Not found', robots: { index: false } };
  const { meta } = r.props;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    openGraph: { type: 'website', title: meta.title, description: meta.description, url: meta.canonical },
  };
}

export default async function LocationPage({ params }: { params: Params }) {
  const { slug } = await params;
  const r = await load(slug);
  if (r.kind === 'redirect') permanentRedirect(r.to); // edge Worker answers 301 in production; this is the in-app fallback
  if (r.kind === 'missing') notFound();
  return r.kind === 'city' ? <CityPage {...r.props} /> : <ServicePage {...r.props} />;
}
