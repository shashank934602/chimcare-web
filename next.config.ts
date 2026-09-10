import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // WordPress URLs end with a slash; keep them byte-identical so no legacy URL ever 308s.
  trailingSlash: true,
  // Native / WASM database drivers must not be bundled into the server build.
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
};

export default nextConfig;
