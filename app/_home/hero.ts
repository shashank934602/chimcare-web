import { DESIGN, type DesignAsset } from '@/lib/content/design-assets';

/**
 * The redesigned homepage hero, spliced into the saved WordPress markup in place of the original
 * hero content (headline, sub-copy, "Happy Clients" proof row and the inline request-service form).
 *
 * `HOME_HTML` (app/_home/content.ts) is generated and never hand-edited, so this module patches it
 * at render time instead: `withHomeHero` finds the hero content by the element IDs the extractor
 * gave it and swaps that stretch of the string for `buildHeroHtml()`. Everything else — the saved
 * header/nav sharing the same background section, and every section below the hero — passes through
 * untouched. Matching by content rather than by a fixed character offset means a future re-run of
 * scripts/extract-home.mjs that only shifts whitespace elsewhere in the document won't break the
 * splice; if the hero markup itself is ever regenerated differently, the original HTML is returned
 * unchanged rather than corrupted.
 *
 * The card's behaviour (the rotating headline word, ZIP/service validation and handing the request to
 * the app booking sheet) lives in components/islands/HomeBehaviour.tsx, the same place every other
 * bit of life this saved markup needs already lives. Its visual styling is
 * app/_home/overrides.css, section 8.
 */

// The old hero's opening element — the exact point the new hero replaces from.
const HERO_START_MARKER = '<div class="elementor-element elementor-element-b671b4c';
// The "Why choose Chimcare" strip right after the hero — used to find where the old hero, and the
// wrapper divs/section that close around it, end.
const AFTER_HERO_ANCHOR = 'elementor-element-f68c0e4';

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

// The same real accreditation marks the city/location hero already shows (DESIGN.bbbBadge,
// DESIGN.awards) — never a stand-in for one that isn't on file (see design-assets.ts).
function badgesHtml(): string {
  const badges: DesignAsset[] = [DESIGN.bbbBadge, ...DESIGN.awards].filter((a): a is DesignAsset => a !== null);
  if (!badges.length) return '';
  const items = badges
    .map(
      (b) =>
        `<li><img src="${attr(b.src)}" width="${b.width}" height="${b.height}" loading="lazy" decoding="async" alt="${attr(b.alt)}" title="${attr(b.alt)}"></li>`,
    )
    .join('');
  return `<div class="cc-hero-badges">
        <span class="cc-hero-badges-label">Certified &amp; Insured</span>
        <ul class="cc-hero-badges-list">${items}</ul>
      </div>`;
}

function buildHeroHtml(): string {
  return `<div class="cc-hero" id="cc-hero">
  <div class="cc-hero-inner">
    <div class="cc-hero-copy">
      <p class="cc-hero-eyebrow">America&rsquo;s Fireplace &amp; Chimney Experts</p>
      <h1 class="cc-hero-title">Chim<span class="cc-hero-accent">care</span> Fast &amp; Reliable<br><span class="cc-hero-rot" id="cc-hero-rot">Chimney Sweeps</span><br>Done Right Since 1989.</h1>
      <p class="cc-hero-sub">The USA&rsquo;s Most Trusted Chimney Sweep, Chimney Repair, Masonry and Fireplace Company <em>Since 1989</em>.</p>
      ${badgesHtml()}
    </div>
    <div class="cc-hero-card">
      <form id="cc-hero-form" novalidate>
        <label class="cc-hero-field">
          <span class="cc-hero-label">Service Needed</span>
          <select id="cc-hero-service" class="cc-hero-input">
            <option value="" disabled selected>Choose the Service You Need</option>
            <option value="Chimney Inspection">$69 Chimney Inspection</option>
            <option value="Gas Fireplace Diagnostic">$49 Gas Fireplace Diagnostic</option>
            <option value="Chimney Sweep + Inspection">$299 Chimney Sweep + Inspection</option>
            <option value="Repair Quote">Repair Quote</option>
            <option value="Masonry Quote">Masonry Quote</option>
          </select>
        </label>
        <div class="cc-hero-field">
          <label class="cc-hero-label" for="cc-hero-zip">ZIP Code</label>
          <div class="cc-hero-zipwrap">
            <input id="cc-hero-zip" class="cc-hero-input" inputmode="numeric" pattern="[0-9]*" maxlength="5" placeholder="Enter your ZIP code" autocomplete="postal-code" aria-describedby="cc-hero-note cc-hero-err">
            <button type="button" class="cc-hero-locate" id="cc-hero-locate" aria-label="Use my current location" title="Use my current location">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.5" fill="none"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" fill="none"/></svg>
              <span class="cc-hero-locate-spinner" aria-hidden="true"></span>
            </button>
          </div>
          <p class="cc-hero-note" id="cc-hero-note" aria-live="polite"></p>
        </div>
        <p class="cc-hero-err" id="cc-hero-err" role="alert" aria-live="polite"></p>
        <button type="submit" class="cc-hero-submit">
          <span class="cc-hero-submit-label">Check My Area</span>
          <span class="cc-hero-submit-spinner" aria-hidden="true"></span>
        </button>
      </form>
      <div class="cc-hero-result" id="cc-hero-result" hidden role="status" aria-live="polite"></div>
      <p class="cc-hero-trust">78,000+ Happy Clients &middot; Since 1989</p>
    </div>
  </div>
</div>`;
}

export function withHomeHero(html: string): string {
  const heroStart = html.indexOf(HERO_START_MARKER);
  const afterHeroAnchor = heroStart === -1 ? -1 : html.indexOf(AFTER_HERO_ANCHOR, heroStart);
  const wrapperCloseStart = afterHeroAnchor === -1 ? -1 : html.lastIndexOf('</section>', afterHeroAnchor);

  if (heroStart === -1 || afterHeroAnchor === -1 || wrapperCloseStart === -1) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[app/_home/hero.ts] Could not locate the homepage hero markers; leaving HOME_HTML unchanged.');
    }
    return html;
  }

  const before = html.slice(0, heroStart);
  // Closes, in order: the widget-wrap and column the hero shares with the saved nav, the
  // elementor-container around them, and the header/hero wrapper section itself.
  const afterHero = html.slice(wrapperCloseStart + '</section>'.length);
  return `${before}${buildHeroHtml()}</div></div></div></section>${afterHero}`;
}
