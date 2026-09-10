import '@/styles/state.css';
import type { CSSProperties } from 'react';
import type { StateHubProps } from '@/lib/content/assemble-hubs';
import { Icon } from '@/components/chrome/Icon';
import { JsonLd } from '@/components/seo/JsonLd';
import { Accordion } from '@/components/islands/Accordion';
import { Breadcrumbs, SectionHead, TrustStrip } from '@/components/sections/shared';
import { BookingSheet } from '@/components/islands/BookingSheet';

export function StateHub(p: StateHubProps) {
  const style = { '--img-state': `url(${p.imgState})` } as CSSProperties;
  return (
    <main id="main" className="tpl-state" style={style}>
      <JsonLd data={p.jsonLd} />
      {/* HERO */}
      <section className="hero">
        <div className="wrap enter">
          <Breadcrumbs crumbs={p.crumbs} style={{ '--i': 0 } as CSSProperties} />
          <div className="hero-grid" style={{ '--i': 1 } as CSSProperties}>
            <div className="hero-copy">
              <h1><span className="hl">Chimcare</span> Locations in {p.hero.name}</h1>
              <p className="lede">{p.hero.lede}</p>
              <div className="hero-search" id="finder">
                <div className="searchbar">
                  <Icon name="search" />
                  <input id="f-q" type="search" placeholder="Search by ZIP or City." autoComplete="off" spellCheck={false} aria-label="Search Chimcare locations" />
                </div>
                <p className="finder-note" id="finder-note" role="status">
                  <Icon name="pin" />
                  <span>Showing <b>all {p.hero.count} {p.hero.name} locations</b>.</span>
                </p>
              </div>
              <div className="ctas">
                <a className="btn btn-primary" href="#directory">Find Your Location <Icon name="arrow" /></a>
                <a className="btn btn-outline" href="#booking" data-book>Schedule Service</a>
              </div>
              <div className="hero-meta">
                <div><b>{p.hero.count}</b><span>Locations statewide</span></div>
                <div><b>1989</b><span>Serving since</span></div>
                <div><b>CSIA</b><span>Certified technicians</span></div>
              </div>
            </div>
          </div>
          <div className="hero-certs">
            <span className="lbl">MEMBERSHIPS &amp; AWARDS</span>
            <img src="/img/awards.png" width={1248} height={450} loading="lazy" decoding="async" alt="National Chimney Sweep Guild member, Angie's List Super Service Award 2020 and Angi Super Service Award 2021" />
          </div>
        </div>
      </section>

      <TrustStrip items={p.trust} className="trust" awards={false} />

      {/* DIRECTORY + MAP */}
      <section className="section mapsec dir-lead" id="directory">
        <div className="wrap">
          <SectionHead eyebrow={p.directory.eyebrow} heading={p.directory.heading} lede={p.directory.lede} />
          <div className="grid">
            <div>
              <div className="dir-bar">
                <p className="dir-count" id="dir-count"><b>{p.directory.cards.length}</b> locations</p>
              </div>
              <div className="loc-grid" id="loc-grid">
                {p.directory.cards.map((c) => (
                  <article className="job_listing loc-card reveal" key={c.id} data-id={c.id} data-search={c.search}>
                    <div className="content-box">
                      {c.href && <a className="job_listing-clickbox" href={c.href} aria-hidden="true" tabIndex={-1}></a>}
                      <header className={c.photo ? 'job_listing-entry-header listing-cover has-image' : 'job_listing-entry-header listing-cover no-image'}>
                        {c.photo && <img className="ph-photo" src={c.photo.src} alt={c.photo.alt} loading="lazy" decoding="async" />}
                      </header>
                      <div className="body">
                        <p className="city">{c.name}{c.kind === 'coverage' ? ' · coverage' : ''}</p>
                        <h3>{c.title}</h3>
                        <div className="meta">
                          <div>
                            <Icon name="pin" />
                            <span>
                              {c.addressLines.length ? <>{c.addressLines[0]}<br />{c.addressLines[1]}</> : c.servedFrom}
                            </span>
                          </div>
                        </div>
                        <a className="tel" href={c.phoneHref}><Icon name="phone" />{c.phone}</a>
                        <div className="foot">
                          {c.href ? <a className="go" href={c.href}>View location <Icon name="arrow" /></a> : <span className="go">Page in review</span>}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="map-panel reveal" id="map-panel">
              <div className="lmap" id="lmap" style={{ display: 'grid', placeItems: 'center', color: 'var(--text-2)', fontSize: 14 }}>
                Map island (Leaflet, M3) mounts here — {p.directory.cards.length} pins
              </div>
              <div className="map-legend">
                <span><i></i>Chimcare location</span>
                <span>Hover a pin or a card to link the two.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EDITORIAL INTRO */}
      <section className="section tinted intro">
        <div className="wrap">
          <div className="rail reveal">
            <p className="eyebrow">{p.intro.eyebrow}</p>
            <h2>{p.intro.heading}</h2>
            <div className="ctas">
              <a className="btn btn-dark" href="#booking" data-book>Schedule Service</a>
              <a className="btn btn-ghost" href="#services">Read the detail</a>
            </div>
          </div>
          <div className="copy reveal">
            {p.intro.paragraphs.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}
            <ul className="stats">
              {p.intro.stats.map((s) => <li key={s.title}><b>{s.title}</b><span>{s.body}</span></li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* EDITORIAL BLOCKS */}
      <section className="section">
        <div className="wrap">
          {p.editorial.map((e) => (
            <article className={e.flip ? 'ed flip reveal' : 'ed reveal'} key={e.heading}>
              <figure>
                <div className="ph" data-ph={e.imageAlt}>
                  <img className="ph-photo" src={'/' + e.imageKey} alt={e.imageAlt} loading="lazy" decoding="async" />
                </div>
              </figure>
              <div>
                <p className="eyebrow">{e.eyebrow}</p>
                <h2>{e.heading}</h2>
                <p>{e.intro}</p>
                <ul className="clist">
                  {e.bullets.map((b) => <li key={b}><Icon name="check" />{b}</li>)}
                </ul>
                {e.outro && <p style={{ marginTop: 20 }}>{e.outro}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* EXPANDABLE DETAIL */}
      <section className="section tinted" id="services">
        <div className="wrap">
          <SectionHead eyebrow={p.detail.eyebrow} heading={p.detail.heading} lede={p.detail.lede} left />
          <Accordion mode="multi" className="faq reveal">
            {p.detail.items.map((it, i) => (
              <div className={i === 0 ? 'faq-item is-open' : 'faq-item'} key={it.question} data-acc-item>
                <button className="faq-q" type="button" aria-expanded={i === 0} data-acc-trigger>
                  {it.question}
                  <Icon name="plus" />
                </button>
                <div className="acc-panel">
                  <div>
                    <div className="faq-a">
                      {it.intro && <p>{it.intro}</p>}
                      {it.bullets && <ul>{it.bullets.map((b) => <li key={b}><Icon name="check" /><span>{b}</span></li>)}</ul>}
                      {it.paragraphs?.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CREW */}
      <section className="section crew">
        <div className="wrap">
          <SectionHead eyebrow="Our people" heading="Real technicians, real certifications." lede="The same faces show up on your street year after year — trained, background-checked, and certified to work on your chimney." />
          <div className="crew-grid">
            {p.crew.map((c) => (
              <div className="crew-card reveal" key={c.title}>
                <img className="ph-photo" loading="lazy" decoding="async" width={600} height={400} src={c.src} alt={c.alt} />
                <div className="body"><b>{c.title}</b><small>{c.small}</small></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section final" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="wrap">
          <div className="panel reveal">
            <div>
              <p className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>{p.finalCta.eyebrow}</p>
              <h2 style={{ marginTop: 12 }}>{p.finalCta.heading}</h2>
              <p>{p.finalCta.paragraph}</p>
            </div>
            <div className="side">
              <a className="btn btn-primary" href="#booking" data-book>Schedule Service</a>
              <a className="btn btn-outline" href="/locations/">All Chimcare locations</a>
              <a className="phone-big" href={p.phoneHref}><Icon name="phone" />{p.phone}</a>
            </div>
          </div>
        </div>
      </section>
      <BookingSheet options={p.booking} context={p.bookingContext} />
    </main>
  );
}
