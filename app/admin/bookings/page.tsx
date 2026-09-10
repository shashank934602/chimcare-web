import { notFound } from 'next/navigation';
import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bookings } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/**
 * Minimal booking list so the test can confirm a submission landed with the right page/city/service context.
 * Open in development; in production it needs ?token=ADMIN_TOKEN (the real admin sits behind Cloudflare Access + auth).
 */
export default async function BookingsAdmin({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN)) notFound();
  const db = await getDb();
  const rows = await db.select().from(bookings).orderBy(desc(bookings.id)).limit(100);
  const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 14, verticalAlign: 'top' };
  return (
    <main id="main" className="tpl-hub">
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="wrap" style={{ display: 'block' }}>
          <p className="eyebrow">Admin · test view</p>
          <h1 style={{ fontSize: 'clamp(28px,3.5vw,40px)', letterSpacing: '-.02em', margin: '10px 0 6px' }}>Bookings</h1>
          <p className="lede" style={{ marginBottom: 28 }}>{rows.length} most recent. Each row shows the page, city and service the form was started from.</p>
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1100 }}>
              <thead>
                <tr>{['Reference', 'Created', 'Status', 'Service', 'When', 'Customer', 'Contact', 'ZIP / address', 'From page', 'City · state', 'Notes'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td style={td} colSpan={11}>No bookings yet — submit the form on any location page.</td></tr>
                )}
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td style={{ ...td, fontFamily: 'ui-monospace,monospace', fontWeight: 700 }}>{b.reference}</td>
                    <td style={td}>{b.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                    <td style={td}>{b.status}{b.externalId ? <><br /><small>{b.adapter}: {b.externalId}</small></> : null}</td>
                    <td style={td}>{b.serviceLabel}</td>
                    <td style={td}>{b.preferredDate}<br /><small>{b.timeWindow}</small></td>
                    <td style={td}>{b.name}</td>
                    <td style={td}>{b.phone}<br /><small>{b.email}</small></td>
                    <td style={td}>{b.zip}{b.address ? <><br /><small>{b.address}</small></> : null}</td>
                    <td style={td}><small>{b.pageKind}</small><br />{b.pageSlug}</td>
                    <td style={td}>{b.cityName ?? '—'}{b.stateCode ? ` · ${b.stateCode}` : ''}{b.branchId ? <><br /><small>branch #{b.branchId}</small></> : null}</td>
                    <td style={td}><small>{b.notes ?? ''}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 18, fontSize: 13, color: 'var(--text-2)' }}>JSON: <a className="link" href="/api/bookings/">/api/bookings/</a></p>
        </div>
      </section>
    </main>
  );
}
