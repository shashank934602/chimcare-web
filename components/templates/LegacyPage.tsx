import '@/styles/legacy.css';
import type { Crumb } from '@/lib/content/assemble';
import { cleanVerbatim } from '@/lib/content/verbatim';
import { Breadcrumbs } from '@/components/sections/shared';
import { Icon } from '@/components/chrome/Icon';

export type LegacyPageProps = {
  /** The legacy URL this page answers on. It is preserved exactly; nothing here rewrites it. */
  path: string;
  crumbs: Crumb[];
  /** Straight from WordPress: `post_title`, unmodified. */
  title: string;
  /** Straight from WordPress: `post_content`. Immutable — cleaned for display only, never in place. */
  rawHtml: string;
  /** Source metadata, carried through as WordPress holds it. Absent fields stay absent. */
  source: {
    postId: number | null;
    modified: string | null;
    /** Yoast's stored title/description, only when WordPress actually has one. */
    metaTitle: string | null;
    metaDescription: string | null;
    canonical: string | null;
    robots: string | null;
  };
  contact?: { phone: string; phoneHref: string };
  /** Shown to reviewers, never to the public. */
  showProvenance?: boolean;
};

/**
 * The migration safety layer: a legacy page rendered from its own WordPress source.
 *
 * A URL reaches this template when it must keep working but has no modelled city, service or hub
 * behind it. That is most of the legacy universe, and the alternative — 404 — loses the page.
 *
 * What this template guarantees:
 *   the URL is unchanged, the source content is unchanged, the source metadata is carried through,
 *   and image references keep pointing where WordPress pointed them.
 *
 * What it will not do: invent a service, an FAQ, a heading, a description or structured data. There
 * is deliberately no JSON-LD here. A legacy page makes no claim the source did not make.
 *
 * Malformed WPBakery markup is cleaned at the render boundary only, by `lib/content/verbatim.ts`.
 * The stored row keeps its defect; `showProvenance` renders exactly which rules fired.
 */
export function LegacyPage(p: LegacyPageProps) {
  const { html, transforms, unchanged } = cleanVerbatim(p.rawHtml);
  return (
    <main id="main" className="tpl-legacy">
      <article className="legacy">
        <div className="wrap">
          <Breadcrumbs crumbs={p.crumbs} />
          <h1 className="legacy-title">{p.title}</h1>

          {/* The source body. Cleaned for display; the stored content is untouched. */}
          <div className="legacy-body" dangerouslySetInnerHTML={{ __html: html }} />

          {p.contact && (
            <p className="legacy-contact">
              <a className="btn btn-primary" href={p.contact.phoneHref}>
                <Icon name="phone" />Call {p.contact.phone}
              </a>
            </p>
          )}

          {p.showProvenance && (
            <aside className="legacy-provenance" aria-label="Source provenance">
              <p className="eyebrow">Source provenance</p>
              <dl>
                <dt>URL</dt><dd>{p.path}</dd>
                {p.source.postId !== null && <><dt>WordPress post</dt><dd>{p.source.postId}</dd></>}
                {p.source.modified && <><dt>Last modified in WordPress</dt><dd>{p.source.modified}</dd></>}
                {p.source.metaTitle && <><dt>Source title tag</dt><dd>{p.source.metaTitle}</dd></>}
                {p.source.metaDescription && <><dt>Source description</dt><dd>{p.source.metaDescription}</dd></>}
                {p.source.canonical && <><dt>Source canonical</dt><dd>{p.source.canonical}</dd></>}
                {p.source.robots && <><dt>Source robots</dt><dd>{p.source.robots}</dd></>}
              </dl>
              <p className="eyebrow" style={{ marginTop: 18 }}>Render-time cleanup</p>
              {unchanged ? (
                <p>None. The rendered markup is byte-identical to the stored source.</p>
              ) : (
                <ul>
                  {transforms.map((t) => (
                    <li key={t.id}>
                      <b>{t.id}</b> · {t.count} {t.count === 1 ? 'occurrence' : 'occurrences'}
                      <br /><span>{t.defect}</span>
                      <br /><span>{t.action}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="legacy-note">The stored source is unchanged. This list is produced at render time.</p>
            </aside>
          )}
        </div>
      </article>
    </main>
  );
}
