import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import fs from 'node:fs';
import path from 'node:path';
import { LocationPage } from '@/components/templates/LocationPage';
import { assembleLocationPage, type LocationSource } from '@/lib/content/assemble-location';

/**
 * Renders a real WordPress location page through the leaf template, from
 * `data/sample/location-sample.jsonl` — a random cross-state sample pulled straight out of the
 * database by `scripts/sample/extract-locations.mjs`.
 *
 * Development only: it returns 404 when NODE_ENV is production, and it is noindex. It exists so the
 * template can be checked against pages nobody hand-picked, in states other than the pilot state.
 */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Location preview', robots: { index: false, follow: false } };

type Row = LocationSource & { id: string; content_length: number; wp_post_id: number };

function rows(): Row[] {
  const file = path.join(process.cwd(), 'data/sample/location-sample.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Row);
}

export default async function LocationPreview({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { id } = await params;
  const all = rows();
  const row = all.find((r) => r.id.toLowerCase() === id.toLowerCase() || r.slug === id);
  if (!row) notFound();

  const props = assembleLocationPage(row);
  const others = all.filter((r) => r.id !== row.id);

  return (
    <>
      <div style={{ background: '#1B1A1B', color: '#fff', font: '500 12.5px/1.5 system-ui, sans-serif', padding: '10px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', alignItems: 'baseline' }}>
          <b style={{ color: '#F9A825' }}>{row.state}</b>
          <code>{row.url}</code>
          <span style={{ opacity: 0.72 }}>wp #{row.wp_post_id} · {row.content_length.toLocaleString()} bytes · outline <b>{props.outline}</b></span>
          <span style={{ opacity: 0.72 }}>sections: {props.sectionsFound.join(', ') || 'none'}</span>
          {props.missing.length > 0 && <span style={{ color: '#FF8A80' }}>missing: {props.missing.join(', ')}</span>}
        </div>
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {others.map((r) => (
            <a key={r.id} href={`/preview/location/${r.id}/`} style={{ color: '#9ecbff', textDecoration: 'none' }}>
              {r.id} {r.state}
            </a>
          ))}
        </div>
      </div>
      <LocationPage {...props} />
    </>
  );
}
