import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CityPage } from '@/components/templates/CityPage';
import { assembleCityPage } from '@/lib/content/assemble';
import { getCityBundle, getCityIdBySlug } from '@/lib/data/cities';
import { getMasters } from '@/lib/data/masters';
import { getPublishedServiceSlugs } from '@/lib/data/pages';
import { getPrices } from '@/lib/data/pricing';
import { getCatalog } from '@/lib/data/services';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Migration preview', robots: { index: false, follow: false } };

/**
 * Renders any migrated city through the SAME CityPage template the public route uses, whether or not
 * it passes validation. This is what "the page is implemented" means for an incomplete row: the data
 * is in the system and the reusable template renders it. Missing source fields stay missing — the
 * banner names them — and nothing here is published or indexed.
 */
export default async function MigrationPreview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN)) notFound();
  const { slug } = await params;

  const cityId = await getCityIdBySlug(slug);
  if (!cityId) notFound();
  const bundle = await getCityBundle(cityId);
  if (!bundle) notFound();
  if (!bundle.city.legacyPostId) notFound(); // no WordPress page ever existed; there is nothing to preview

  const [catalog, masters, serviceSlugs] = await Promise.all([getCatalog(), getMasters(), getPublishedServiceSlugs(cityId)]);
  const prices = await getPrices(bundle.city.regionId ?? bundle.branch?.regionId ?? null);
  const props = assembleCityPage({ city: bundle.city, state: bundle.state, branch: bundle.branch, prices, faqs: bundle.faqs, catalog, serviceSlugs, masters });

  return (
    <>
      <div style={{ background: '#1A1A1C', color: '#fff', padding: '14px max(24px, calc((100% - 1200px) / 2))', fontSize: 13.5, lineHeight: 1.6 }}>
        <b style={{ letterSpacing: '.06em', textTransform: 'uppercase', fontSize: 11 }}>Migration preview · not published, not indexed</b>
        <div style={{ marginTop: 6 }}>
          <b>{bundle.city.name}</b> · {bundle.city.sourceStatus} · WordPress post {bundle.city.legacyPostId} ·{' '}
          {props.gate.ok ? 'passes validation' : <>blocked by: {props.gate.missing.join(', ')}</>}
        </div>
        {bundle.city.legacyPricingCopy.length > 0 && (
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Legacy pricing copy preserved but not rendered: {bundle.city.legacyPricingCopy.map((q) => `“${q}”`).join(' ')}
          </div>
        )}
        <div style={{ marginTop: 6, opacity: 0.85 }}>
          Sections below fall back to master copy where WordPress supplied nothing. Empty areas, no FAQ and the placeholder
          hero are the real state of the source data. <a href="/admin/migration/" style={{ color: '#fff' }}>All migration rows →</a>
        </div>
      </div>
      <CityPage {...props} />
    </>
  );
}
