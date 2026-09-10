import '@/styles/city.css';
import type { CSSProperties } from 'react';
import type { ServicePageProps } from '@/lib/content/assemble';
import { Icon } from '@/components/chrome/Icon';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs, Faq, SectionHead, TrustStrip } from '@/components/sections/shared';
import { BookingForm } from '@/components/islands/BookingForm';
import { BookingSheet } from '@/components/islands/BookingSheet';
import { ServiceDrawer } from '@/components/islands/ServiceDrawer';
import { FloatingCta } from '@/components/chrome/FloatingCta';

const pad = (n: number) => String(n + 1).padStart(2, '0');

/**
 * ServicePage — what a Tier A/B service×city URL renders if decision Q1 keeps those URLs as pages.
 * Derived from the city template: same hero/booking, the category's long-form row as the body,
 * then process, pricing, FAQ and links to sibling services and the city page.
 *
 * Service identity (`row`, `initialService`), location identity (`hero`, `contact`), content, SEO,
 * images, FAQs and CTAs all arrive as separate slots, so one template serves every service × city
 * combination. It decides nothing about which services exist: the catalogue is supplied, and a URL
 * whose service is not modelled never reaches this template.
 */
export function ServicePage(p: ServicePageProps) {
  const style = { '--img-city': `url(${p.imgCity})` } as CSSProperties;
  return (
    <>
      <main id="main">
      <JsonLd data={p.jsonLd} />
      <section className="option o1 tpl-city tpl-service" style={style}>
        <div className="hero o1-hero" id="o1-hero">
          <div className="wrap">
            <div className="enter">
              <Breadcrumbs crumbs={p.crumbs} style={{ '--i': 0 } as CSSProperties} />
              <p className="eyebrow" style={{ '--i': 1 } as CSSProperties}>{p.hero.eyebrow}</p>
              <h1 style={{ '--i': 2 } as CSSProperties}>{p.hero.title}</h1>
              <p className="lede" style={{ '--i': 3 } as CSSProperties}>{p.hero.lede}</p>
              <div className="ctas" style={{ '--i': 4 } as CSSProperties}>
                <a className="btn btn-primary" href="#booking" data-book>Schedule Service</a>
                <a className="btn btn-outline" href={p.contact.phoneHref}><Icon name="phone" />Call {p.contact.phone}</a>
              </div>
              {p.hero.addressLine && <p className="addr" style={{ '--i': 5 } as CSSProperties}><Icon name="pin" />{p.hero.addressLine}</p>}
            </div>
            <div className="book-slot">
              <BookingForm embedded options={p.booking} context={p.bookingContext} initialService={p.initialService} />
            </div>
          </div>
        </div>

        <TrustStrip items={p.trust} className="o1-trust" />

        {p.row && (
          <div className="section o1-svc" id="o1-services">
            <div className="wrap">
              <SectionHead eyebrow="What it involves" heading={p.row.name} lede={p.row.why} />
              <div className="o1-list reveal">
                <article className="o1-row is-open" data-service={p.row.key}>
                  <div className="acc-panel">
                    <div>
                      <div className="body">
                        <div className="svc-body svc-main">
                          {p.row.paragraphs.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}
                        </div>
                        <div className="side svc-body svc-side">
                          <h4>What's included</h4>
                          <ul className="svc-list">
                            {p.row.included.map((x) => <li key={x}><Icon name="check" />{x}</li>)}
                          </ul>
                          <div className="ctas"><a className="btn btn-primary" href="#booking" data-book>{p.row.cta}</a></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        )}

        <div className="section" id="o1-process">
          <div className="wrap">
            <SectionHead eyebrow={p.process.eyebrow} heading={p.process.heading} lede={p.process.lede} />
            <ol className="o1-steps reveal">
              {p.process.steps.map((s, i) => (
                <li className="o1-step" key={s.title}>
                  <span className="dot">{pad(i)}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="section o1-cost" id="o1-cost">
          <div className="wrap">
            <div className="panel reveal">
              <div>
                <p className="eyebrow">{p.cost.eyebrow}</p>
                <h2>{p.cost.heading}</h2>
                <p>{p.cost.paragraph}</p>
                <div className="factors">{p.cost.factors.map((f) => <span key={f}>{f}</span>)}</div>
              </div>
              <div className="ctas" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <a className="btn btn-primary" href="#booking" data-book>{p.cost.cta}</a>
                <a className="btn btn-ghost" href={p.contact.phoneHref}><Icon name="phone" />{p.contact.phone}</a>
              </div>
            </div>
          </div>
        </div>

        {/* RELATED SERVICES — the internal-linking rule: service → category siblings and its city */}
        <div className="section areas" id="o1-related">
          <div className="wrap">
            <div className="reveal">
              <p className="eyebrow">Related</p>
              <h2>{p.related.heading}</h2>
              <p className="lede"><a className="link" href={p.related.cityLink.href}>{p.related.cityLink.label} <Icon name="arrow" /></a></p>
            </div>
            <div className="reveal">
              <ul className="area-list">
                {p.related.items.map((r) => (
                  <li key={r.title}><Icon name="check" />{r.href ? <a href={r.href}>{r.title}</a> : r.title}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="section" id="o1-faq">
          <div className="wrap">
            <SectionHead eyebrow={p.faq.eyebrow} heading={p.faq.heading} />
            <Faq items={p.faq.items} />
          </div>
        </div>

        <div className="section o1-final" id="o1-cta">
          <div className="wrap">
            <div className="panel on-dark reveal">
              <div>
                <p className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>{p.finalCta.eyebrow}</p>
                <h2 style={{ marginTop: 12 }}>{p.finalCta.heading}</h2>
                <p>{p.finalCta.paragraph}</p>
              </div>
              <div className="side">
                <a className="btn btn-primary" href="#booking" data-book>{p.finalCta.cta}</a>
                <a className="phone" href={p.contact.phoneHref}><Icon name="phone" />{p.contact.phone}</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>
      {/* Siblings of <main>, as in the mocks — see CityPage. */}
      <BookingSheet options={p.booking} context={p.bookingContext} />
      {p.row && (
        <ServiceDrawer rows={[p.row]} eyebrow={p.hero.eyebrow} phone={p.contact.phone} phoneHref={p.contact.phoneHref} />
      )}
      <FloatingCta phone={p.contact.phone} phoneHref={p.contact.phoneHref} email="harold@chimcare.com" quoteHref="#o1-cost" />
    </>
  );
}
