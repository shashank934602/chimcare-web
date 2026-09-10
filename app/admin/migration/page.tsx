import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMigrationRows } from '@/lib/data/migration';
import type { ReviewFlag } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Migration status', robots: { index: false, follow: false } };

/**
 * Migration review: every city carried over from WordPress, what state it is in, and exactly what a
 * human still has to resolve. A page that fails validation is listed here with its blockers — it is
 * migrated and previewable, it is simply not public.
 */
export default async function MigrationAdmin({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  const { token, status } = await searchParams;
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN)) notFound();
  const all = await getMigrationRows('mn');
  const rows = status ? all.filter((r) => r.city.sourceStatus === status) : all;

  const byStatus = new Map<string, number>();
  for (const r of all) byStatus.set(r.city.sourceStatus, (byStatus.get(r.city.sourceStatus) ?? 0) + 1);
  const flagCounts = new Map<string, number>();
  for (const r of all) for (const f of r.city.reviewFlags) flagCounts.set(f.code, (flagCounts.get(f.code) ?? 0) + 1);

  const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 13.5, verticalAlign: 'top' };
  const chip = (bg: string, fg: string): React.CSSProperties => ({ background: bg, color: fg, borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 800, letterSpacing: '.04em', whiteSpace: 'nowrap', display: 'inline-block' });
  const statusChip = (s: string) =>
    s === 'SOURCE_PAGE_PUBLISHABLE' ? chip('#E6F4EA', '#146C2E') : s === 'NO_SOURCE_PAGE' ? chip('#EFEDEA', '#5B5651') : chip('#FDF0E3', '#8A4B08');

  return (
    <main id="main" className="tpl-hub">
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="wrap" style={{ display: 'block' }}>
          <p className="eyebrow">Admin · migration review</p>
          <h1 style={{ fontSize: 'clamp(28px,3.5vw,40px)', letterSpacing: '-.02em', margin: '10px 0 6px' }}>Minnesota migration status</h1>
          <p className="lede" style={{ marginBottom: 20, maxWidth: 760 }}>
            {all.length} cities. A city with a live WordPress page is always migrated and always renders through the same
            template; validation decides only whether it may be published. Missing source fields are listed, never filled in.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <a href="/admin/migration/" style={{ ...chip('#1A1A1C', '#fff'), textDecoration: 'none' }}>All {all.length}</a>
            {[...byStatus.entries()].sort().map(([s, n]) => (
              <a key={s} href={`/admin/migration/?status=${s}`} style={{ ...statusChip(s), textDecoration: 'none' }}>{s} {n}</a>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 26 }}>
            Open flags — {[...flagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} (${n})`).join(' · ')}
          </p>

          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1200 }}>
              <thead>
                <tr>{['City', 'Kind', 'Migration status', 'Public', 'Blocked by', 'Needs review', 'Source page', 'Serving branch'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map(({ city, branch, pageSlug, pageStatus }) => (
                  <tr key={city.id}>
                    <td style={{ ...td, fontWeight: 700 }}>
                      {city.name}
                      {pageSlug && <><br /><a href={`/admin/preview/${city.slug}/`} style={{ fontSize: 12, fontWeight: 600 }}>preview →</a></>}
                    </td>
                    <td style={td}>{city.kind}<br /><small style={{ color: 'var(--text-2)' }}>tier {city.tier}</small></td>
                    <td style={td}><span style={statusChip(city.sourceStatus)}>{city.sourceStatus}</span></td>
                    <td style={td}>{pageStatus ?? <span style={{ color: 'var(--text-2)' }}>no page row</span>}</td>
                    <td style={{ ...td, maxWidth: 260 }}>
                      {city.sourceStatus === 'NO_SOURCE_PAGE' ? <span style={{ color: 'var(--text-2)' }}>not applicable</span> : <MissingList flags={city.reviewFlags} />}
                    </td>
                    <td style={{ ...td, maxWidth: 380 }}>
                      {city.reviewFlags.map((f) => (
                        <div key={f.code} style={{ marginBottom: 6 }}>
                          <b style={{ fontSize: 12 }}>{f.code}</b>
                          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{f.detail}</div>
                          {f.quotes?.map((q) => <div key={q} style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-2)' }}>“{q}”</div>)}
                        </div>
                      ))}
                    </td>
                    <td style={td}>
                      {city.legacyPostId ? <>post {city.legacyPostId}<br /><small style={{ color: 'var(--text-2)' }}>{city.slug}</small></> : <span style={{ color: 'var(--text-2)' }}>none in WordPress</span>}
                    </td>
                    <td style={td}>{branch ? branch.name : <span style={{ color: 'var(--text-2)' }}>unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

/** The gate's own blocker list, reconstructed from the flags so the two never disagree. */
function MissingList({ flags }: { flags: ReviewFlag[] }) {
  const map: Partial<Record<ReviewFlag['code'], string>> = {
    faq_missing_in_source: 'city-specific FAQ',
    insufficient_source_areas: 'neighbourhoods',
    insufficient_source_local_copy: 'local specifics',
    hero_image_missing: 'hero image',
    no_serving_branch: 'serving branch',
  };
  const items = flags.map((f) => map[f.code]).filter(Boolean) as string[];
  if (!items.length) return <span style={{ color: '#146C2E' }}>nothing — publishable</span>;
  return <ul style={{ margin: 0, paddingLeft: 16 }}>{items.map((i) => <li key={i} style={{ fontSize: 12.5 }}>{i}</li>)}</ul>;
}
