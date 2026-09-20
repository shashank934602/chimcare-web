import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  batches, checks, images, ledgerAvailable, spaces, totals, urls,
  type CheckRow, type UrlRow,
} from '@/lib/data/migration-ledger';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Migration batches', robots: { index: false, follow: false } };

/**
 * Batch dashboard: what happened to every URL, batch by batch, and what is still missing.
 *
 * Three questions, in the order they matter:
 *   1. Did every URL in a batch get all the way through, and is it live? (the batch table)
 *   2. Did we miss anything? (the reconciliation checks, each naming the URLs that failed, and the
 *      URL-space table: the parts of the old site the pipeline cannot read at all)
 *   3. Will anything break when the domain moves? (the image row: pages still load their photos
 *      from the old WordPress server)
 *
 * Everything comes from `data/migration-ledger.sqlite`, published by the pipeline. The page derives
 * nothing of its own, so it cannot disagree with `ledger.py --check`.
 *
 * Same gate as the other admin pages: open in development, `?token=ADMIN_TOKEN` in production.
 */
export default async function BatchesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; batch?: string; only?: string }>;
}) {
  const { token, batch, only } = await searchParams;
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN)) notFound();

  const th: React.CSSProperties = { textAlign: 'left', padding: '9px 12px', borderBottom: '1px solid var(--line)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid var(--line)', fontSize: 13.5, verticalAlign: 'top' };
  const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const card: React.CSSProperties = { background: 'var(--surface-2)', borderRadius: 14, padding: '16px 18px', minWidth: 150 };
  const chip = (bg: string, fg: string): React.CSSProperties => ({ background: bg, color: fg, borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', display: 'inline-block' });
  const ok = chip('#E6F4EA', '#146C2E');
  const bad = chip('#FCE8E6', '#A50E0E');
  const warn = chip('#FEF7E0', '#8A4B08');
  const link = (href: string, text: string) => <a href={href} style={{ color: 'var(--brand-red)', textDecoration: 'none' }}>{text}</a>;
  const q = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `?${s}` : '';
  };

  if (!ledgerAvailable()) {
    return (
      <main id="main" className="tpl-hub">
        <section className="section" style={{ paddingTop: 48 }}>
          <div className="wrap" style={{ display: 'block' }}>
            <h1>Migration batches</h1>
            <p className="lede">
              No tracking data published yet. Run <code>python3 scripts/ledger.py --publish</code> in
              <code> chimcare-migration/</code>.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const t = totals();
  const batchRows = batches();
  const checkRows: CheckRow[] = checks(batch);
  const spaceRows = spaces();
  const img = images();
  const list: UrlRow[] = urls({ batch, only, limit: 200 });
  const failing = checkRows.filter((c) => c.failed > 0);
  const missed = spaceRows.filter((s) => s.covered !== 'yes');
  const missedClicks = missed.reduce((sum, s) => sum + s.clicks, 0);
  const allClicks = spaceRows.reduce((sum, s) => sum + s.clicks, 0) || 1;

  return (
    <main id="main" className="tpl-hub">
      <section className="section" style={{ paddingTop: 44 }}>
        <div className="wrap" style={{ display: 'block' }}>
          <p className="eyebrow">Admin · migration</p>
          <h1 style={{ fontSize: 'clamp(26px,3.2vw,38px)', letterSpacing: '-.02em', margin: '10px 0 6px' }}>
            Batches
          </h1>
          <p className="lede" style={{ marginBottom: 26 }}>
            Every URL the pipeline has touched, what happened to it, and what is still missing.
            {batch ? <> Showing <strong>{batch}</strong> — {link(q({}), 'all batches')}.</> : null}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 30 }}>
            {[
              ['URLs tracked', t.urls.toLocaleString()],
              ['Published', t.published.toLocaleString()],
              ['Live (200)', t.liveOk.toLocaleString()],
              ['Clicks covered', Math.round(t.clicks).toLocaleString()],
              ['With a defect', t.defects.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} style={card}>
                <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 20, margin: '0 0 10px' }}>Batch by batch</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 34 }}>
            <thead>
              <tr>
                <th style={th}>Batch</th>
                <th style={{ ...th, textAlign: 'right' }}>URLs</th>
                <th style={{ ...th, textAlign: 'right' }}>Probed</th>
                <th style={{ ...th, textAlign: 'right' }}>Fetched</th>
                <th style={{ ...th, textAlign: 'right' }}>Built</th>
                <th style={{ ...th, textAlign: 'right' }}>Published</th>
                <th style={{ ...th, textAlign: 'right' }}>Live</th>
                <th style={{ ...th, textAlign: 'right' }}>Defects</th>
                <th style={{ ...th, textAlign: 'right' }}>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {batchRows.map((b) => (
                <tr key={b.batch}>
                  <td style={td}>{link(q({ batch: b.batch }), b.batch)}</td>
                  <td style={num}>{b.urls.toLocaleString()}</td>
                  <td style={num}>{b.probed.toLocaleString()}</td>
                  <td style={num}>{b.fetched.toLocaleString()}</td>
                  <td style={num}>{b.routed.toLocaleString()}</td>
                  <td style={num}>{b.published.toLocaleString()}</td>
                  <td style={num}>
                    {b.liveChecked ? `${b.liveOk.toLocaleString()} / ${b.liveChecked.toLocaleString()}` : '—'}
                  </td>
                  <td style={num}>
                    {b.defects ? <span style={bad}>{b.defects}</span> : <span style={ok}>0</span>}
                  </td>
                  <td style={num}>{Math.round(b.clicks).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontSize: 20, margin: '0 0 6px' }}>
            Did we miss anything? <span style={failing.length ? bad : ok}>{checkRows.length - failing.length}/{checkRows.length} clean</span>
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 0 12px' }}>
            Each check looks for URLs that fell between two steps. A check passes only when it finds none.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 34 }}>
            <tbody>
              {checkRows.map((c) => (
                <tr key={c.check}>
                  <td style={{ ...td, width: 70 }}>{c.failed ? <span style={bad}>fail</span> : <span style={ok}>ok</span>}</td>
                  <td style={td}>
                    {c.question}
                    {c.failed ? (
                      <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>
                        {c.failed}{c.failed >= 200 ? '+' : ''} URL(s): {c.sample.join(', ')}
                        {c.failed > c.sample.length ? ' …' : ''}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontSize: 20, margin: '0 0 6px' }}>What the pipeline cannot read</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 0 12px' }}>
            Every kind of URL the old site publishes. {missed.length ? (
              <>
                <strong>{Math.round(missedClicks).toLocaleString()} clicks ({Math.round((missedClicks / allClicks) * 100)}% of the site)</strong>{' '}
                sit in spaces no stage can read today.
              </>
            ) : 'Everything is covered.'}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 34 }}>
            <thead>
              <tr>
                <th style={th}>URL space</th>
                <th style={{ ...th, textAlign: 'right' }}>In WordPress</th>
                <th style={{ ...th, textAlign: 'right' }}>Known URLs</th>
                <th style={{ ...th, textAlign: 'right' }}>Clicks</th>
                <th style={{ ...th, textAlign: 'right' }}>Share</th>
                <th style={th}>Covered</th>
              </tr>
            </thead>
            <tbody>
              {spaceRows.map((s) => (
                <tr key={s.space}>
                  <td style={td}>
                    {s.space}
                    <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3 }}>{s.note}</div>
                  </td>
                  <td style={num}>{s.wp_urls ? s.wp_urls.toLocaleString() : '—'}</td>
                  <td style={num}>{s.gsc_urls.toLocaleString()}</td>
                  <td style={num}>{Math.round(s.clicks).toLocaleString()}</td>
                  <td style={num}>{(s.share * 100).toFixed(1)}%</td>
                  <td style={td}>
                    {s.covered === 'yes' ? <span style={ok}>yes</span>
                      : s.covered === 'partial' ? <span style={warn}>partial</span>
                      : <span style={bad}>no</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ fontSize: 20, margin: '0 0 6px' }}>Images at cutover</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 0 30px', maxWidth: '80ch' }}>
            Migrated pages reference <strong>{img.files.toLocaleString()} image files</strong>{' '}
            ({img.heroes.toLocaleString()} of them a page&rsquo;s main photo){img.bytes ? `, ${(img.bytes / 1024 / 1024).toFixed(0)} MB measured` : ''}.
            They are still served by the old WordPress site, at paths that must keep working when the
            domain moves. Mirrored to our own site so far: <strong>{img.mirrored.toLocaleString()}</strong>.
            {img.mirrored < img.files ? (
              <> <span style={bad}>{(img.files - img.mirrored).toLocaleString()} still only on WordPress</span></>
            ) : <> <span style={ok}>all mirrored</span></>}
          </p>

          <h2 style={{ fontSize: 20, margin: '0 0 10px' }}>
            URLs {batch ? `in ${batch}` : ''} {only === 'defects' ? 'with a defect' : ''}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 0 12px' }}>
            {link(q({ batch, only: undefined }), 'all')} · {link(q({ batch, only: 'defects' }), 'only defects')} ·{' '}
            {link(q({ batch, only: 'live' }), 'only live')} — highest traffic first, 200 shown.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 50 }}>
            <thead>
              <tr>
                <th style={th}>URL</th>
                <th style={{ ...th, textAlign: 'right' }}>Clicks</th>
                <th style={{ ...th, textAlign: 'right' }}>Services</th>
                <th style={th}>Published</th>
                <th style={th}>Live</th>
                <th style={th}>Defect</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.slug}>
                  <td style={td}>
                    <a href={`/location/${u.slug}/`} style={{ color: 'inherit', textDecoration: 'none' }}>{u.slug}</a>
                  </td>
                  <td style={num}>{u.clicks ? Math.round(u.clicks).toLocaleString() : '—'}</td>
                  <td style={num}>{u.service_count ?? '—'}</td>
                  <td style={td}>{u.published ? <span style={ok}>yes</span> : <span style={bad}>no</span>}</td>
                  <td style={td}>
                    {u.live_status === 200 ? <span style={ok}>200</span>
                      : u.live_status ? <span style={bad}>{u.live_status}</span> : '—'}
                  </td>
                  <td style={{ ...td, color: u.defect ? '#A50E0E' : 'var(--text-2)' }}>{u.defect ?? '—'}</td>
                </tr>
              ))}
              {list.length === 0 ? (
                <tr><td style={td} colSpan={6}>Nothing matches.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
