import { notFound } from 'next/navigation';
import { listLeads } from '@/lib/data/leads';

export const dynamic = 'force-dynamic';

/**
 * Out-of-area requests — the ones the client resells rather than services.
 * Open in development; in production it needs ?token=ADMIN_TOKEN, same as /admin/bookings.
 */
export default async function LeadsAdmin({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN)) notFound();
  const rows = await listLeads();
  const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 14, verticalAlign: 'top' };
  return (
    <main id="main" className="tpl-hub">
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="wrap" style={{ display: 'block' }}>
          <p className="eyebrow">Admin · test view</p>
          <h1 style={{ fontSize: 'clamp(28px,3.5vw,40px)', letterSpacing: '-.02em', margin: '10px 0 6px' }}>Out-of-area leads</h1>
          <p className="lede" style={{ marginBottom: 28 }}>
            {rows.length} most recent. Requests from ZIPs this business does not cover: never scheduled, never sent to the
            booking adapter. &ldquo;Diverted&rdquo; means the request arrived as a booking and was reclassified here.
          </p>
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1000 }}>
              <thead>
                <tr>{['Reference', 'Created', 'Status', 'Customer', 'Contact', 'ZIP', 'Where', 'Asked for', 'Message', 'From page'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td style={td} colSpan={10}>No leads yet — submit the hero form with a ZIP outside the service area.</td></tr>
                )}
                {rows.map((l) => (
                  <tr key={l.id}>
                    <td style={{ ...td, fontFamily: 'ui-monospace,monospace', fontWeight: 700 }}>{l.reference}</td>
                    <td style={td}>{l.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                    <td style={td}>{l.status}{l.divertedFromBooking ? <><br /><small>diverted</small></> : null}</td>
                    <td style={td}>{l.name}</td>
                    <td style={td}>{l.phone}<br /><small>{l.email}</small></td>
                    <td style={td}>{l.zip}</td>
                    <td style={td}>{l.zipCity ? `${l.zipCity}${l.zipState ? `, ${l.zipState}` : ''}` : '—'}</td>
                    <td style={td}>{l.serviceLabel ?? l.serviceKey ?? '—'}</td>
                    <td style={td}><small>{l.message ?? ''}</small></td>
                    <td style={td}><small>{l.pageKind}</small><br />{l.pageSlug}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 18, fontSize: 13, color: 'var(--text-2)' }}>JSON: <a className="link" href="/api/leads/">/api/leads/</a></p>
        </div>
      </section>
    </main>
  );
}
