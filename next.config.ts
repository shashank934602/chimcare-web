import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // WordPress URLs end with a slash; keep them byte-identical so no legacy URL ever 308s.
  trailingSlash: true,
  // Where the build is written. The default is `.next`, and it is configurable for one reason: a
  // migration run serves the production build on :3200 and checks 10,000 pages against it for
  // hours, while `next dev` writes to that same folder. Frontend work would silently rewrite the
  // build the run is measuring. `NEXT_DIST_DIR=.next-dev npm run dev -- -p 3210` gives the dev
  // server its own directory, so both can run at once. Unset in CI and in production.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // Development only. Next blocks cross-origin requests to dev assets (fonts, CSS, client JS, HMR)
  // from any host but localhost, so opening the dev server on a phone over the LAN served the HTML
  // and then blocked everything that makes it a page. Testing on a real phone is not optional here
  // (most of this site's visitors are on one), so the private LAN range is allowed in. This has no
  // effect on a production build.
  allowedDevOrigins: ['192.168.1.143', '192.168.1.*', '192.168.*.*', '10.*.*.*'],
  // Native / WASM database drivers must not be bundled into the server build.
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  // The route store is a data file, not an import, so nothing in the module graph points at it and
  // the build would leave it out of the serverless bundle. That failure is silent: every page works
  // locally and 404s in production, because the lookup finds no store and falls through. Naming it
  // here is what puts it in the function's filesystem.
  outputFileTracingIncludes: {
    // The footer (on every page) and the location hubs list the migrated routes and their map pins.
    '/*': ['./data/routes.sqlite', './data/migrated-geocode.json'],
    // The homepage reads its CSS corrections as text so they load after home.css (see app/page.tsx).
    '/': ['./app/_home/overrides.css'],
    // The batch dashboard reads the published tracking database the same way the pages read the
    // route store: a data file, not an import, so it must be named here to reach the deployment.
    '/admin/batches': ['./data/migration-ledger.sqlite'],
    // The location route reads the ledger at BUILD time to decide which pages to prerender.
    '/location/[slug]': ['./data/routes.sqlite', './data/migration-ledger.sqlite'],
  },
  // The services hub lives at WordPress's own URL, /chimcare-services/. It was briefly built at /services/;
  // anything that picked that address up lands on the real one.
  async redirects() {
    return [{ source: '/services', destination: '/chimcare-services/', permanent: true }];
  },
};

export default nextConfig;
