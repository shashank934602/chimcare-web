import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { LocationPage } from '@/components/templates/LocationPage';
import { assembleLocationPage, type LocationSource } from '@/lib/content/assemble-location';
import { getCityBundle } from '@/lib/data/cities';
import { resolvePage } from '@/lib/data/pages';
import { getPageSource } from '@/lib/data/page-source';

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
  const bundle = page.cityId ? await getCityBundle(page.cityId) : null;
  const branch = bundle?.branch ?? null;
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

  return { kind: 'page' as const, props: assembleLocationPage(source), cityName: bundle?.city?.name ?? null };
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
