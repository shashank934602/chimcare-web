import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { LocationPage } from '@/components/templates/LocationPage';
import { assembleLocationPage, type LocationSource } from '@/lib/content/assemble-location';
import { getCityBundle } from '@/lib/data/cities';
import { getMasters } from '@/lib/data/masters';
import { getCatalog } from '@/lib/data/services';
import { getPrices } from '@/lib/data/pricing';
import { resolvePage } from '@/lib/data/pages';
import { getPageSource } from '@/lib/data/page-source';
import { catalogueGrid } from '@/lib/content/assemble';
import { buildContext } from '@/lib/content/slots';
import { getPublishedServiceSlugs } from '@/lib/data/pages';

/**
 * The dispatcher. One route for every legacy `/location/{slug}/` URL, and one template behind it.
 *
 * Every URL on this site is a service in a city — there is no city-only page — so the `site.pages`
 * row decides only whether the URL is served, redirected or gone, not which template renders it.
 *
 * Content comes from the page's own WordPress body (`lib/data/page-source.ts`), and the business
 * facts — the serving branch's phone and address — come from the database, because WordPress does not
 * hold them reliably. A page with no source row is not served: there is nothing to render but master
 * copy, and master copy is not this page's content.
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  const page = await resolvePage(slug);
  if (!page) return { kind: 'missing' as const };
  if (page.fate === 'redirect' && page.redirectTo) return { kind: 'redirect' as const, to: page.redirectTo };
  if (page.status !== 'published') return { kind: 'missing' as const };

  const src = await getPageSource(slug);
  if (!src) return { kind: 'missing' as const };

  // The serving branch supplies the phone and the address; WordPress's own listing meta is the
  // fallback, and neither is composed from anything else.
  const [bundle, masters, catalog] = await Promise.all([
    page.cityId ? getCityBundle(page.cityId) : Promise.resolve(null),
    getMasters(),
    getCatalog(),
  ]);
  const branch = bundle?.branch ?? null;
  const prices = await getPrices(bundle?.city?.regionId ?? branch?.regionId ?? null);
  const serviceSlugs = page.cityId ? await getPublishedServiceSlugs(page.cityId) : new Map<number, string>();
  const state = bundle?.state?.code ?? slug.slice(-2).toUpperCase();
  const m = /^(.*?)-in-(.+)-[a-z]{2}$/.exec(slug) ?? /^(.*?)-(.+)-[a-z]{2}$/.exec(slug);

  const source: LocationSource = {
    url: `/location/${slug}/`,
    slug,
    state,
    serviceSlug: m ? m[1] : null,
    citySlug: m ? m[2] : null,
    post_title: src.postTitle,
    post_content: src.postContent,
    yoast_title: src.yoastTitle,
    yoast_metadesc: src.yoastMetadesc,
    phone: branch?.phone ?? src.phone,
    location: branch ? `${branch.street}, ${branch.city}, ${state} ${branch.zip}` : src.jobLocation,
    hero: bundle?.city?.heroImageKey
      ? {
          src: '/' + bundle.city.heroImageKey,
          alt: bundle.city.heroImageAlt ?? bundle.city.name,
          width: 1500,
          height: 1000,
        }
      : null,
  };

  return {
    kind: 'page' as const,
    props: assembleLocationPage(source, {
      city: bundle?.city ?? null,
      state: bundle?.state ?? null,
      branch,
      prices,
      masters,
      catalog: catalogueFor(bundle, catalog, prices, serviceSlugs),
    }),
  };
}

/** The catalogue grid for this city, or nothing when the URL has no city row behind it. */
function catalogueFor(
  bundle: Awaited<ReturnType<typeof getCityBundle>>,
  catalog: Awaited<ReturnType<typeof getCatalog>>,
  prices: Awaited<ReturnType<typeof getPrices>>,
  serviceSlugs: Map<number, string>,
) {
  if (!bundle?.city || !bundle.state) return null;
  const ctx = buildContext({ state: bundle.state, city: bundle.city, branch: bundle.branch, prices, servicesCount: catalog.services.length });
  const { cards, tiles } = catalogueGrid(catalog, ctx, serviceSlugs);
  return { count: catalog.services.length, tiles, cards };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const r = await load(slug);
  if (r.kind !== 'page') return { title: 'Not found', robots: { index: false } };
  const { meta, hero } = r.props;
  // Title and description are the source's own. Where WordPress has none, none is invented: the
  // page falls back to its own <h1>, and carries no description at all. ISSUE-025 / ISSUE-026.
  return {
    title: meta.title ?? hero.title,
    ...(meta.description ? { description: meta.description } : {}),
    alternates: { canonical: meta.canonical },
    openGraph: { type: 'website', title: meta.title ?? hero.title, url: meta.canonical },
  };
}

export default async function LocationRoute({ params }: { params: Params }) {
  const { slug } = await params;
  const r = await load(slug);
  if (r.kind === 'redirect') permanentRedirect(r.to); // the edge answers 301 in production; this is the fallback
  if (r.kind === 'missing') notFound();
  return <LocationPage {...r.props} />;
}
