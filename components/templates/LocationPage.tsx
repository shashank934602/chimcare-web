import '@/styles/city.css';
import type { CSSProperties } from 'react';
import type { LocationPageProps } from '@/lib/content/assemble-location';
import { Icon } from '@/components/chrome/Icon';
import { Accordion } from '@/components/islands/Accordion';
import { Breadcrumbs, SectionHead } from '@/components/sections/shared';
import { FloatingCta } from '@/components/chrome/FloatingCta';
import { BookingForm } from '@/components/islands/BookingForm';
import { BookingSheet } from '@/components/islands/BookingSheet';

const pad = (n: number) => String(n + 1).padStart(2, '0');

/**
 * The leaf template — one service in one city, which is every URL under `/location/`.
 *
 * Built from the approved Spokane mock's design system, and driven entirely by what the page's own
 * WordPress body contains. A section that the source does not have is not rendered: no placeholder,
 * no borrowed content, no invented heading. That is why the same component renders a 60 KB city hub
 * and an 8 KB legacy page without a variant flag.
 *
 * Nothing here names a city, a state or a service.
 */
export function LocationPage(p: LocationPageProps) {
  const { hero, identity } = p;
  return (
    <>
      <main id="main">
        <section className="option o1 tpl-city">
          {/* HERO */}
          <div className="hero o1-hero" id="o1-hero">
            <div className="wrap">
              <div className="enter">
                <Breadcrumbs
                  crumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Locations', href: '/locations/' },
                    ...(identity.state ? [{ label: identity.state, href: `/locations/${identity.state.toLowerCase()}/` }] : []),
                    { label: identity.city || identity.slug },
                  ]}
                  style={{ '--i': 0 } as CSSProperties}
                />
                <ul className="hero-trust" aria-label="Trust" style={{ '--i': 1 } as CSSProperties}>
                  {hero.trustLine.map((t) => (
                    <li key={t.label}><Icon name={t.icon} />{t.label}</li>
                  ))}
                </ul>
                <p className="eyebrow" style={{ '--i': 1 } as CSSProperties}>{hero.eyebrow}</p>
                <h1 style={{ '--i': 2 } as CSSProperties}>{hero.title}</h1>
                {hero.lede && <p className="lede" style={{ '--i': 3 } as CSSProperties}>{hero.lede}</p>}
                <div className="ctas" style={{ '--i': 4 } as CSSProperties}>
                  <a className="btn btn-primary" href="#booking" data-book>Schedule Service</a>
                  {hero.phone && hero.phoneHref && (
                    <a className="btn btn-outline" href={hero.phoneHref}><Icon name="phone" />Call {hero.phone}</a>
                  )}
                </div>
                {hero.addressLine && (
                  <p className="addr" style={{ '--i': 5 } as CSSProperties}><Icon name="pin" />{hero.addressLine}</p>
                )}
                {hero.image && (
                  <figure className="hero-figure" style={{ '--i': 7 } as CSSProperties}>
                    <img src={hero.image.src} width={hero.image.width} height={hero.image.height} fetchPriority="high" decoding="async" alt={hero.image.alt} />
                  </figure>
                )}
              </div>
              {/* The mock's hero is two columns: the page's own words on the left, the booking form
                  on the right. It is the same form on every page, so it is chrome, not content. */}
              <div className="book-slot">
                <BookingForm embedded options={p.booking} context={p.bookingContext} />
              </div>
            </div>
          </div>

          {/* WHY IT MATTERS — outline A */}
          {p.intro && (
            <div className="section o1-intro" id="o1-intro">
              <div className="wrap">
                <div className="reveal">
                  <p className="eyebrow">{identity.city ? `Chimcare in ${identity.city}` : 'Chimcare'}</p>
                  <h2>{p.intro.heading}</h2>
                </div>
                <div className="copy reveal">
                  {p.intro.paragraphs.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}
                  <div className="ctas"><a className="btn btn-primary" href="#booking" data-book>Get a Quote</a></div>
                </div>
              </div>
            </div>
          )}

          {/* WHY HOMEOWNERS TRUST CHIMCARE — outline B */}
          {p.whyTrust && (
            <div className="o1-trust-copy on-dark" id="o1-trust-copy">
              <div className="wrap">
                <div className="reveal">
                  <p className="eyebrow">Why Chimcare</p>
                  <h2>{p.whyTrust.heading}</h2>
                  {p.whyTrust.paragraphs.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}
                </div>
              </div>
            </div>
          )}

          {/* SERVICE DIRECTORY — outline B and C */}
          {p.serviceDirectory && p.serviceDirectory.items.length > 0 && (
            <div className="section o1-solutions" id="o1-solutions">
              <div className="wrap">
                <SectionHead eyebrow="Services" heading={p.serviceDirectory.heading} lede={p.serviceDirectory.lede ?? undefined} />
                <div className="svc-grid reveal" id="svc-grid" style={{ marginTop: 44 }}>
                  {p.serviceDirectory.items.map((name) => (
                    <article key={name} className="svc-card">
                      <h3>{name}</h3>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PROCESS — outline A */}
          {p.process && (
            <div className="section" id="o1-process">
              <div className="wrap">
                <SectionHead eyebrow="How it works" heading={p.process.heading} />
                {p.process.steps.length > 0 ? (
                  <ol className="o1-steps reveal">
                    {p.process.steps.map((s, i) => (
                      <li className="o1-step" key={(s.title || s.body).slice(0, 40)}>
                        <span className="dot">{pad(i)}</span>
                        {s.title && <h3>{s.title}</h3>}
                        <p>{s.body}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="copy reveal">{p.process.paragraphs.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}</div>
                )}
              </div>
            </div>
          )}

          {/* SERVICE AREAS */}
          {p.areas && p.areas.list.length > 0 && (
            <div className="section areas" id="o1-areas">
              <div className="wrap">
                <div className="reveal">
                  <p className="eyebrow">Service area</p>
                  <h2>{p.areas.heading}</h2>
                  {p.areas.lede && <p className="lede">{p.areas.lede}</p>}
                </div>
                <div className="reveal">
                  <ul className="area-list">
                    {p.areas.list.map((a) => <li key={a}><Icon name="pin" />{a}</li>)}
                  </ul>
                  <div className="ctas" style={{ marginTop: 26 }}>
                    <a className="btn btn-primary" href="#booking" data-book>Book a visit</a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WHY CHOOSE US */}
          {p.whyChooseUs && (
            <div className="section o1-contact" id="o1-contact">
              <div className="wrap">
                <div className="reveal">
                  <p className="eyebrow">Why us</p>
                  <h2 style={{ fontSize: 'clamp(30px,3.4vw,44px)', letterSpacing: '-.02em', lineHeight: 1.06, margin: '12px 0 18px' }}>
                    {p.whyChooseUs.heading}
                  </h2>
                  {p.whyChooseUs.paragraphs.map((t) => <p key={t.slice(0, 40)} style={{ color: 'var(--text-2)', maxWidth: '52ch' }}>{t}</p>)}
                </div>
                {p.whyChooseUs.bullets.length > 0 && (
                  <div className="why-card reveal">
                    <h3>What you get</h3>
                    <ul>
                      {p.whyChooseUs.bullets.map((b) => <li key={b}><Icon name="check" /><span>{b}</span></li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANYTHING THE OUTLINES DO NOT COVER — rendered plainly rather than dropped */}
          {p.other.map((o) => (
            <div className="section" key={o.heading}>
              <div className="wrap">
                <SectionHead eyebrow="From this page" heading={o.heading} />
                <div className="copy reveal">{o.paragraphs.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}</div>
              </div>
            </div>
          ))}

          {/* FAQ */}
          {p.faq && (
            <div className="section" id="o1-faq">
              <div className="wrap">
                <SectionHead eyebrow="Questions" heading={p.faq.heading} />
                <Accordion mode="single" className="faq reveal" style={{ maxWidth: 820 }}>
                  {p.faq.items.map((f, i) => (
                    <div className={i === 0 ? 'faq-item is-open' : 'faq-item'} key={f.question} data-acc-item>
                      <button className="faq-q" type="button" aria-expanded={i === 0} data-acc-trigger>
                        {f.question}
                        <Icon name="plus" />
                      </button>
                      <div className="acc-panel"><div><p className="faq-a">{f.answer}</p></div></div>
                    </div>
                  ))}
                </Accordion>
              </div>
            </div>
          )}

          {/* FINAL CTA */}
          {p.finalCta && (
            <div className="section o1-final" id="o1-cta">
              <div className="wrap">
                <div className="panel on-dark reveal">
                  <div>
                    <p className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>Chimcare</p>
                    <h2 style={{ marginTop: 12 }}>{p.finalCta.heading}</h2>
                    {p.finalCta.paragraphs.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}
                  </div>
                  <div className="side">
                    <a className="btn btn-primary" href="#booking" data-book>Schedule Service</a>
                    {hero.phone && hero.phoneHref && (
                      <a className="phone" href={hero.phoneHref}><Icon name="phone" />{hero.phone}</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      <BookingSheet options={p.booking} context={p.bookingContext} />
      {hero.phone && hero.phoneHref && (
        <FloatingCta phone={hero.phone} phoneHref={hero.phoneHref} email="harold@chimcare.com" quoteHref="#booking" />
      )}
    </>
  );
}
