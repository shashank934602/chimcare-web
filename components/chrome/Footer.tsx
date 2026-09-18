import '@/styles/footer.css';
import { Icon } from './Icon';

// The same three facts the About page's own trust row shows (components/templates/AboutPage.tsx) —
// real, established claims, not new marketing copy invented for this redesign.
const TRUST = [
  { icon: 'cal', label: 'Since 1989' },
  { icon: 'shield', label: 'Certified & Insured' },
  { icon: 'check', label: '78,000+ Happy Clients' },
];

// The full real catalogue, but the column only ever shows the first four (see JSX below) — the
// rest are one click away through "View All Services", the same #booking flow every listed
// service already opens (there's no dedicated services page yet — see CLAUDE.md's Q1).
const SERVICES = [
  'Chimney Sweep & Cleaning',
  'Chimney & Fireplace Inspection',
  'Gas Fireplace Service & Repair',
  'Chimney Repair & Masonry',
  'Crown, Flashing & Tuckpointing',
  'Fireplace Installation',
  'Gas & Wood-Burning Inserts',
  'Gas Log Sets',
  'Chimney Caps & Dampers',
  'Animal-Safe Chimney Clearing',
];
const SERVICES_SHOWN = 4;

// The site's own main nav (components/chrome/Header.tsx), mirrored — not a separate hand-picked
// set of "useful" links. Terms of Use / Privacy Policy / Sitemap already live in the bottom bar.
const QUICK_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '#' },
  { label: 'Locations', href: '/locations/' },
  { label: 'About Us', href: '/about-us/' },
  { label: 'Contact', href: '/contact-us/' },
];

// Real accounts only — the same three the site has always linked (no Twitter/Pinterest/RSS handle
// exists to link to, so none is shown).
const SOCIAL = [
  { icon: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/chimcare.chimneysweep/' },
  { icon: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/user/Chimcare' },
  { icon: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/chimcare' },
];

type FooterState = { name: string; href: string; cities: Array<{ name: string; href: string }> };

export function Footer({ states }: { states: FooterState[] }) {
  return (
    <footer className="ftr">
      <span className="foot-decor-stripe" aria-hidden="true" />
      <Icon name="home" className="ico foot-decor-roof" />
      <div className="foot-main">
        <div className="wrap">
          {/* Row 1: brand, quick links, services, contact + follow — four columns. */}
          <div className="foot-row foot-row-1">
            <div className="foot-brand">
              <span className="logo-chip">
                <img src="/img/logo.svg" alt="Chimcare" title="Chimcare" />
              </span>
              <p>America&rsquo;s Fireplace &amp; Chimney Experts. Founded 1989, working toward every rooftop and hearth in the country.</p>
              <ul className="foot-trust">
                {TRUST.map((t) => (
                  <li key={t.label}>
                    <span className="foot-trust-ico">
                      <Icon name={t.icon} className="ico" />
                    </span>
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="foot-col">
              <h4>Quick Links</h4>
              <ul className="foot-links foot-links-chev">
                {QUICK_LINKS.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>
                      <Icon name="arrow" className="ico foot-chev" />
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="foot-col">
              <h4>Services</h4>
              <ul className="foot-links">
                {SERVICES.slice(0, SERVICES_SHOWN).map((s) => (
                  <li key={s}>
                    <a href="#booking" data-book>
                      {s}
                    </a>
                  </li>
                ))}
                <li>
                  <a className="foot-more" href="#booking" data-book>
                    View All Services
                    <Icon name="arrow" className="ico" />
                  </a>
                </li>
              </ul>
            </div>

            <div className="foot-col">
              <h4>Contact Us</h4>
              <ul className="foot-contact">
                <li>
                  <span className="foot-contact-ico">
                    <Icon name="pin" className="ico" />
                  </span>
                  <span>
                    Corporate Office
                    <br />
                    12236 SW Garden Place
                    <br />
                    Tigard, OR 97223
                  </span>
                </li>
                <li>
                  <span className="foot-contact-ico">
                    <Icon name="phone" className="ico" />
                  </span>
                  <a className="tel" href="tel:18003624840">1-800-362-4840</a>
                </li>
                <li>
                  <span className="foot-contact-ico">
                    <Icon name="mail" className="ico" />
                  </span>
                  <a href="mailto:harold@chimcare.com">harold@chimcare.com</a>
                </li>
              </ul>

              <h4 className="foot-follow-h">Follow Us</h4>
              <ul className="foot-social">
                {SOCIAL.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer">
                      <Icon name={s.icon} className="ico" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Row 2: every service area, one card per state. Cities wrap as chips rather than a
              stacked one-per-line list, so a state's card height tracks its own chip count instead
              of forcing a JS-balanced column of unrelated states to match it. */}
          <div className="foot-row foot-row-2">
            <h4>Service Areas</h4>
            <div className="foot-areas-grid">
              {states.map((s) => (
                <div className="foot-area" key={s.href}>
                  <div className="foot-area-head">
                    <a className="foot-area-name" href={s.href}>
                      <span className="foot-area-ico">
                        <Icon name="pin" className="ico" />
                      </span>
                      {s.name}
                    </a>
                  </div>
                  <ul className="foot-area-cities">
                    {s.cities.map((c) => (
                      <li key={c.href}>
                        <a href={c.href}>{c.name}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="foot-legal">
        <div className="wrap">
          <span>© {new Date().getFullYear()} Chimcare · Since 1989 · OR CCB #195475 · WA License #CHIMC**882C</span>
        </div>
      </div>
    </footer>
  );
}
