// Template foundation checks. Fetches each template's preview and asserts the structure, the data
// slots, the mock's interactive hooks and the shared chrome are all in the server HTML.
//
// Server HTML, deliberately: every template's content must be present without running JavaScript.
// Islands add behaviour to markup that is already there; they never supply the content itself.
//
//   node scripts/test/templates.mjs [http://localhost:3000]

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

const has = (html, needle) => html.includes(needle);
const count = (html, needle) => html.split(needle).length - 1;

/**
 * The rendered markup with every <script> removed.
 *
 * Next embeds a React Flight payload in the page, and that payload repeats each element's props as
 * JSON — so a data attribute appears once in the markup and again in the payload. Counting or
 * asserting absence against the raw response would measure the payload as well as the page.
 */
const markupOf = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

/** Chrome every template must share, checked on all five. */
const SHARED = [
  ['header', 'id="hdr"'],
  ['header nav', 'class="nav"'],
  ['header mobile menu button', 'class="menu-btn"'],
  ['footer', 'class="ftr"'],
  ['breadcrumbs', 'class="crumbs"'],
  ['sticky mobile call/book bar', 'id="sfoot"'],
  ['icon sprite', 'id="i-phone"'],
];

const CASES = [
  {
    name: 'NationalHub',
    url: '/preview/national/',
    checks: [
      ['hero heading', '<h1>'],
      ['finder field', 'id="f-q"'],
      ['finder status line', 'id="finder-note"'],
      ['state card grid', 'id="state-cards"'],
      ['state cards rendered', 'class="state-card reveal"'],
      ['load-more control', 'id="states-load-more"'],
      ['load-more wrapper', 'id="states-more"'],
      ['city chip directory', 'id="dirlist"'],
      ['directory groups', 'class="chips-group'],
      ['coverage-only note', 'id="dir-coverage"'],
      ['empty state', 'id="dir-empty"'],
      ['floating CTA cluster', 'id="fcta"'],
      ['booking sheet', 'id="bsheet"'],
    ],
    counts: [['every state card in the HTML', 'class="state-card reveal"', 8]],
  },
  {
    name: 'StateHub',
    url: '/preview/state/',
    checks: [
      ['hero search form', 'id="f-q"'],
      ['finder status line', 'id="finder-note"'],
      ['directory count', 'id="dir-count"'],
      ['location grid', 'id="loc-grid"'],
      ['location cards', 'class="job_listing loc-card reveal"'],
      ['map toggle', 'id="map-toggle"'],
      ['map panel', 'id="map-panel"'],
      ['editorial blocks', 'class="ed reveal"'],
      ['detail accordion', 'data-acc-trigger'],
      ['floating CTA cluster', 'id="fcta"'],
    ],
    counts: [['every location card in the HTML', 'class="job_listing loc-card reveal"', 20]],
  },
  {
    name: 'CityPage',
    url: '/preview/city/',
    checks: [
      ['hero', 'id="o1-hero"'],
      ['hero trust line', 'class="hero-trust"'],
      ['hero proof row', 'class="hero-proof"'],
      ['hero award marks', 'class="hero-awards"'],
      ['embedded booking form', 'class="book-slot"'],
      ['introduction', 'id="o1-intro"'],
      ['team photograph', 'class="team-photo"'],
      ['service section', 'id="o1-services"'],
      ['service section illustration', 'id="ph-services"'],
      ['service accordion', 'id="svc-lib"'],
      ['service drawer triggers', 'data-drawer-open'],
      ['service drawer', 'id="drawer"'],
      ['drawer close control', 'data-drawer-close'],
      ['solutions filter', 'id="svc-filters"'],
      ['solutions grid', 'id="svc-grid"'],
      ['solutions load-more', 'id="svc-more"'],
      ['service areas', 'id="o1-areas"'],
      ['areas illustration', 'id="ph-areas"'],
      ['process', 'id="o1-process"'],
      ['cost', 'id="o1-cost"'],
      ['FAQ', 'id="o1-faq"'],
      ['contact', 'id="o1-contact"'],
      ['final CTA', 'id="o1-cta"'],
      ['floating CTA cluster', 'id="fcta"'],
    ],
    counts: [
      ['all 8 service rows in the HTML', 'data-acc-item', 11], // 8 service rows + 3 FAQ items
      ['all 24 solution cards in the HTML', 'class="svc-card"', 24],
      ['a drawer trigger per service row', 'data-drawer-open', 8],
    ],
  },
  {
    name: 'ServicePage',
    url: '/preview/service/',
    checks: [
      ['hero', 'id="o1-hero"'],
      ['embedded booking form', 'class="book-slot"'],
      ['related services', 'FIXTURE related services'],
      ['FAQ accordion', 'data-acc-trigger'],
      ['service drawer', 'id="drawer"'],
      ['floating CTA cluster', 'id="fcta"'],
    ],
    counts: [],
  },
  {
    name: 'LegacyPage',
    url: '/preview/legacy/',
    checks: [
      ['legacy wrapper', 'class="tpl-legacy"'],
      ['source title', 'FIXTURE Legacy Page Title From WordPress'],
      ['source body', 'class="legacy-body"'],
      ['source prose preserved', 'FIXTURE first paragraph, exactly as WordPress stored it.'],
      ['source heading preserved', 'FIXTURE heading inside a WPBakery column'],
      ['source link preserved', 'href="/fixture-target/"'],
      ['source image reference preserved', '/img/crew-sweeping.jpg'],
      ['provenance block', 'class="legacy-provenance"'],
      ['transformation report', 'wpbakery_unclosed_shortcode'],
    ],
    counts: [],
    // The whole point of the template: these must not survive into the rendered page.
    absent: [
      ['WPBakery shortcode removed', '[vc_row]'],
      ['WPBakery closing tag removed', '[/vc_column]'],
      ['orphan shortcode removed', '[fixture_shortcode'],
      ['inline script removed', 'FIXTURE_SHOULD_NOT_RUN'],
      ['inline handler removed', 'onclick='],
      ['javascript URL neutralised', 'javascript:alert'],
      ['no invented structured data', '"@type":"Service"'],
    ],
  },
];

let failures = 0;
let checks = 0;

for (const c of CASES) {
  const res = await fetch(base + c.url, { redirect: 'manual' });
  const html = await res.text();
  const markup = markupOf(html);
  console.log(`\n──────── ${c.name}  ${c.url}  HTTP ${res.status}`);
  if (res.status !== 200) {
    console.log(`  ✗ expected 200`);
    failures++;
    continue;
  }
  for (const [label, needle] of [...SHARED, ...c.checks]) {
    checks++;
    const ok = has(html, needle);
    if (!ok) failures++;
    console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  }
  for (const [label, needle, want] of c.counts) {
    checks++;
    const got = count(markup, needle);
    const ok = got === want;
    if (!ok) failures++;
    console.log(`  ${ok ? '✓' : '✗'} ${label} — expected ${want}, found ${got}`);
  }
  for (const [label, needle] of c.absent ?? []) {
    checks++;
    const ok = !has(markup, needle);
    if (!ok) failures++;
    console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  }
  // The fixture banner must be on every preview, so a fixture page can never be mistaken for a real one.
  checks++;
  const banner = has(html, 'data-fixture-banner');
  if (!banner) failures++;
  console.log(`  ${banner ? '✓' : '✗'} fixture banner present`);
}

console.log(`\n${failures === 0 ? `TEMPLATE CHECKS: PASS (${checks} checks)` : `TEMPLATE CHECKS: ${failures} of ${checks} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
