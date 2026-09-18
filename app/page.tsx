import type { Metadata } from 'next';
// The live chimcare.com homepage, lifted verbatim by scripts/extract-home.mjs: its own markup and its own
// (scoped) stylesheet, plus hand-written corrections. Rerun the script to refresh; never edit the generated files.
// The WordPress stylesheet is linked from /public rather than imported — see the script for why.
// The corrections are read as text and emitted right after that link (see the render below). A plain
// CSS import is bundled into a stylesheet the production build puts BEFORE the linked one, so every
// override that only ties the WordPress rule on specificity lost there (it won in `next dev`, which
// orders them the other way) — e.g. the hero badges rendered at 512px instead of 34px. Turbopack
// ignores `?raw` on .css, so the file is read from disk; next.config.ts traces it into the '/' bundle.
import fs from 'node:fs';
import path from 'node:path';
import { HOME_BODY_CLASS, HOME_CSS_HREF, HOME_HTML, HOME_META, HOME_SCHEMA } from './_home/content';
import { withHomeHero } from './_home/hero';
import { withHeaderBbb } from './_home/header-bbb';
import { withEvenMapPins } from './_home/map-pins';
import { withSharpAwardLogos } from './_home/award-logos';
import { withoutEmDash } from '@/lib/content/typography';
import { withInternalAboutLink, withInternalContactLink } from './_home/nav-links';
import { FloatingCta } from '@/components/chrome/FloatingCta';
import { BookingSheet } from '@/components/islands/BookingSheet';
import { HomeBehaviour } from '@/components/islands/HomeBehaviour';
import { HomeLocationsMenu } from '@/components/islands/HomeLocationsMenu';
import { RequestServiceModal } from '@/components/islands/RequestServiceModal';
import type { BookingContext } from '@/lib/booking/types';
import { SITE_URL, bookingOptions } from '@/lib/content/assemble';
import { buildLocationsMenu } from '@/lib/content/locations-menu';
import { getPrices } from '@/lib/data/pricing';

// Booking prices come from the database, like every other page in this slice.
export const dynamic = 'force-dynamic';

const homeOverridesCss = fs.readFileSync(path.join(process.cwd(), 'app', '_home', 'overrides.css'), 'utf8');

const canonical = `${SITE_URL}/`;
const NATIONAL_PHONE = '1-800-362-4840';
const NATIONAL_PHONE_HREF = 'tel:18003624840';

// The saved page's own <title>/description (HOME_META, scraped verbatim from the live site) are
// what's actually live today: a generic "Home - Chimney Sweep & Masonry Services" title with no
// meta description at all, and an og:description auto-built by patching together on-page text
// ("Call Us Now Chimcare...0 k+..."). Real facts, badly presented — replaced here with the same
// facts (brand, founding year, services, the "78,000+ happy clients" stat already shown on the page
// itself) written as an actual title and description, the same way About/Contact already do.
const TITLE = 'Chimcare | Chimney Sweep, Repair & Masonry Services Since 1989';
const DESCRIPTION =
  'Trusted chimney sweep, repair, and masonry services since 1989. Certified, insured, and serving 78,000+ happy clients nationwide. Book online today.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: HOME_META.robots ?? undefined,
  alternates: { canonical },
  openGraph: {
    type: 'website',
    url: canonical,
    locale: HOME_META.ogLocale ?? undefined,
    title: TITLE,
    description: DESCRIPTION,
    siteName: HOME_META.ogSiteName ?? undefined,
    images: [{ url: '/img/hero-chimney-sweep.jpg', width: 2000, height: 1589, alt: 'A Chimcare technician servicing a chimney on a rooftop' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/img/hero-chimney-sweep.jpg'] },
  // The saved page's own site icons (the app has no favicon of its own yet).
  icons: {
    icon: [
      { url: 'https://www.chimcare.com/wp-content/uploads/2025/12/cropped-chimcare-site-icon-32x32.png', sizes: '32x32' },
      { url: 'https://www.chimcare.com/wp-content/uploads/2025/12/cropped-chimcare-site-icon-192x192.png', sizes: '192x192' },
    ],
    apple: 'https://www.chimcare.com/wp-content/uploads/2025/12/cropped-chimcare-site-icon-180x180.png',
  },
};

// HOME_SCHEMA's own WebPage node still carries the old scraped title as its "name" — patched to
// match TITLE here rather than in the generated file, the same reasoning as the metadata above.
function homeSchemaWithTitle(): Record<string, unknown> | null {
  if (!HOME_SCHEMA) return null;
  const graph = HOME_SCHEMA['@graph'];
  if (!Array.isArray(graph)) return HOME_SCHEMA;
  return {
    ...HOME_SCHEMA,
    '@graph': graph.map((node) =>
      node && typeof node === 'object' && (node as { '@type'?: string })['@type'] === 'WebPage' ? { ...node, name: TITLE } : node,
    ),
  };
}

export default async function Home() {
  const booking = bookingOptions(await getPrices(null));
  const bookingContext: BookingContext = { pageSlug: '/', pageKind: 'hub', label: 'Chimcare' };
  const homeHtml = withSharpAwardLogos(withEvenMapPins(withoutEmDash(withHeaderBbb(withInternalAboutLink(withInternalContactLink(withHomeHero(HOME_HTML)))))));
  const homeSchema = homeSchemaWithTitle();
  return (
    <>
      <link rel="stylesheet" href={HOME_CSS_HREF} precedence="default" />
      {/* Same precedence, rendered after the link: React inserts it after home.css in every build. */}
      <style href="wp-home-overrides" precedence="default">{homeOverridesCss}</style>
      {homeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema).replace(/</g, '\\u003c') }}
        />
      )}
      {/* The wrapper stands in for WordPress's <body>: it carries the saved body classes the stylesheet keys on. */}
      <div className={`wp-home ${HOME_BODY_CLASS}`}>
        <div id="page" className="hfeed site">
          <div id="content" className="site-content">
            <main id="main" className="site-main" dangerouslySetInnerHTML={{ __html: homeHtml }} />
          </div>
        </div>
      </div>
      <BookingSheet options={booking} context={bookingContext} />
      <RequestServiceModal />
      <HomeBehaviour />
      <HomeLocationsMenu data={buildLocationsMenu()} />
      <FloatingCta phone={NATIONAL_PHONE} phoneHref={NATIONAL_PHONE_HREF} email="harold@chimcare.com" quoteHref="#booking" />
    </>
  );
}
