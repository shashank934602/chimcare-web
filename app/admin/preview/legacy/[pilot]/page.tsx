import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import fs from 'node:fs';
import path from 'node:path';
import { LegacyPage, type LegacyPageProps } from '@/components/templates/LegacyPage';

/**
 * Source-backed LegacyPage preview for the 10-URL smoke test.
 *
 * It reads `data/smoke-10/page-source.jsonl`, which `scripts/smoke/extract-source.mjs` wrote straight
 * out of WordPress with a SHA-256 per row. Nothing here re-fetches, edits or normalises that content:
 * the row is passed to the template as it was stored, and `lib/content/verbatim.ts` cleans only at
 * the render boundary.
 *
 * This is deliberately NOT the production route. `/location/[slug]/` still answers 404 for
 * `kind='legacy'`, and connecting LegacyPage to it is a separate decision (ISSUE-006). This route is
 * behind the same admin gate the existing migration preview uses, is `noindex, nofollow`, and only
 * ever serves the ten rows in the smoke set.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Legacy source preview', robots: { index: false, follow: false } };

type SourceRow = {
  pilot_id: string;
  url: string;
  found: boolean;
  wp_post_id?: number;
  post_title?: string;
  post_content?: string;
  post_modified?: string;
  yoast_title?: string | null;
  yoast_metadesc?: string | null;
  yoast_canonical?: string | null;
  yoast_robots_noindex?: string | null;
  content_sha256?: string;
};

function readSource(pilot: string): SourceRow | null {
  const file = path.join(process.cwd(), 'data/smoke-10/page-source.jsonl');
  if (!fs.existsSync(file)) return null;
  for (const line of fs.readFileSync(file, 'utf8').trim().split('\n')) {
    const row = JSON.parse(line) as SourceRow;
    if (row.pilot_id === pilot && row.found) return row;
  }
  return null;
}

export default async function LegacySourcePreview({
  params,
  searchParams,
}: {
  params: Promise<{ pilot: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  // The same gate the existing migration preview uses. Not weakened for this test: ISSUE-008 stands.
  const { token } = await searchParams;
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN)) notFound();

  const { pilot } = await params;
  const row = readSource(pilot);
  if (!row) notFound();

  const props: LegacyPageProps = {
    path: row.url,
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Locations', href: '/locations/' }, { label: row.post_title ?? row.url }],
    title: row.post_title ?? '',
    rawHtml: row.post_content ?? '',
    source: {
      postId: row.wp_post_id ?? null,
      modified: row.post_modified ?? null,
      metaTitle: row.yoast_title ?? null,
      metaDescription: row.yoast_metadesc ?? null,
      canonical: row.yoast_canonical ?? null,
      robots: row.yoast_robots_noindex === '1' ? 'noindex' : null,
    },
    showProvenance: true,
  };
  return <LegacyPage {...props} />;
}
