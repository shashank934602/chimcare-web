// Ports the handwritten CSS from the three design mocks into scoped stylesheets.
//
//   node scripts/port-css.mjs <mocks-dir>
//
// Reads locations_new3.html, washington-locations.html, spokane.html from <mocks-dir> and writes:
//   styles/tokens.css   one :root token set (hub values; city-only tokens appended)
//   styles/base.css     resets, chrome (header/footer/booking/floating CTAs/drawer), keyframes, .reveal/.enter — unscoped
//   styles/hub.css      every other hub rule, scoped under .tpl-hub
//   styles/state.css    every other state rule, scoped under .tpl-state
//   styles/city.css     every other city rule, scoped under .option (the mock's own wrapper class)
//   public/img/css-*.*  images that were embedded as base64 inside the CSS
//
// Scoping keeps each template pixel-faithful to its own mock while letting the three coexist in one app.
// Chrome rules are taken from the state mock, so header/footer look identical everywhere. Chrome the
// state mock never defines (the city mock's drawer, header BBB badge, icon call button, "Fast Online
// Booking" CTA and fab tooltips) is appended from the city mock — added, never overridden.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import postcss from 'postcss';

const mocksDir = process.argv[2] ?? path.resolve('..', 'mocks');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const stylesDir = path.join(root, 'styles');
const imgDir = path.join(root, 'public', 'img');
fs.mkdirSync(stylesDir, { recursive: true });
fs.mkdirSync(imgDir, { recursive: true });

const MOCKS = {
  hub: 'locations_new3.html',
  state: 'washington-locations.html',
  city: 'spokane.html',
};
const SCOPE = { hub: '.tpl-hub', state: '.tpl-state', city: '.option' };

// Selectors whose first compound matches one of these are site chrome → base.css (state version wins).
const CHROME = ['.skip', '.sr-only', '.hdr', '.nav', '.menu-btn', '.logo', '.logo-chip', '.phone', '.ftr', '.ftel',
  '.fcta', '.fab', '.sfoot', '.bsheet', '.book', '.svc-opt', '.svc-opts', '.drawer', '.no-scroll', '.policies', '.soc',
  '.ico', '.reveal', '.enter', '.img-reveal', '.btn', '.wrap', '.steps', '.step'];
const NOT_CHROME = ['.book-slot'];
const RESET = /^(\*|html|body|img|button|h1|h2|h3|h4|p|ul|ol|a|\[hidden\]|:focus-visible)(\s*,\s*(\*|html|body|img|button|h1|h2|h3|h4|p|ul|ol|a))*$/;

function firstCompound(sel) {
  return sel.trim().split(/[\s>+~]+/)[0];
}
function isChrome(sel) {
  const c = firstCompound(sel);
  if (NOT_CHROME.some((n) => c === n || c.startsWith(n + '.') || c.startsWith(n + ':'))) return false;
  return CHROME.some((p) => c === p || c.startsWith(p + '.') || c.startsWith(p + ':') || c.startsWith(p + '[') ||
    (c.startsWith(p + '-') && !NOT_CHROME.some((n) => c.startsWith(n))));
}
function splitSelectors(list) {
  const out = []; let depth = 0, cur = '';
  for (const ch of list) {
    if (ch === '(') depth++; else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function scopeSelector(sel, scope) {
  const s = sel.trim();
  if (s === ':root' || s === 'html' || s === 'body') return scope;
  if (s.startsWith('body ')) return scope + s.slice(4);
  if (s.startsWith(scope + ' ') || s === scope || s.startsWith(scope + '.') || s.startsWith(scope + ':')) return s;
  return `${scope} ${s}`;
}

function extractCss(html) {
  const m = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  let css = m[1];
  css = css.replace(/@font-face\s*\{[^}]*\}/g, '');
  css = css.slice(css.indexOf(':root')); // drops the inlined Leaflet stylesheet
  // externalise embedded images
  css = css.replace(/url\((["']?)data:image\/([a-z+]+);base64,([A-Za-z0-9+/=]+)\1\)/g, (_, q, type, b64) => {
    const buf = Buffer.from(b64, 'base64');
    const hash = crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
    const ext = { 'svg+xml': 'svg', jpeg: 'jpg' }[type] ?? type;
    const file = `css-${hash}.${ext}`;
    fs.writeFileSync(path.join(imgDir, file), buf);
    return `url(/img/${file})`;
  });
  return css;
}

const out = { tokens: [], base: [], hub: [], state: [], city: [] };
const seenBase = new Set();
const keyframes = new Map();

// Chrome is taken from the state mock so the header, footer and booking widget look identical on
// every template. The city mock is newer and introduces chrome the state mock never had — the
// service drawer, the header's BBB badge, the icon-only call button, the "Fast Online Booking" CTA,
// the two header phone variants and the floating-action tooltips. Dropping those left the markup
// unstyled.
//
// So the state mock still wins for everything it defines, and the city mock may ADD a rule whose
// every selector names at least one class the state mock never mentions. `.hdr .phone-bar` is added
// because `phone-bar` is new; `.hdr .wrap` is not, because the state mock owns both. The hub mock
// contributes no chrome, exactly as before.
const CHROME_SOURCES = new Set(['state', 'city']);
const stateChromeRules = new Set(); // "<media>|<selector>" pairs the state mock actually wrote
const ruleKey = (atParams, sel) => `${atParams ?? ''}|${sel.replace(/\s+/g, ' ').trim()}`;

function claimChrome(tpl, node, atParams) {
  if (!CHROME_SOURCES.has(tpl)) return false;
  const sels = splitSelectors(node.selector).filter(isChrome);
  if (!sels.length) return false;
  if (tpl === 'state') {
    for (const sel of sels) stateChromeRules.add(ruleKey(atParams, sel));
    return true;
  }
  // The city mock may add a rule the state mock never wrote at this exact breakpoint. It may not
  // change one the state mock did write: where both define the same selector at the same media
  // query, the state mock's value stands and every template keeps the header it has today.
  return sels.every((sel) => !stateChromeRules.has(ruleKey(atParams, sel)));
}

function emit(bucket, rule, atParams, scope) {
  const selectors = splitSelectors(rule.selector).map((s) => (scope ? scopeSelector(s, scope) : s));
  const body = rule.nodes.map((n) => n.toString()).join(';');
  const text = `${selectors.join(',')}{${body}}`;
  if (bucket === 'base') {
    const key = (atParams ?? '') + '|' + text;
    if (seenBase.has(key)) return;
    seenBase.add(key);
  }
  out[bucket].push(atParams ? `@media ${atParams}{${text}}` : text);
}

for (const [tpl, file] of Object.entries(MOCKS)) {
  const html = fs.readFileSync(path.join(mocksDir, file), 'utf8');
  const css = extractCss(html);
  const ast = postcss.parse(css);
  let rootSeen = 0;
  const stats = { chrome: 0, scoped: 0, dropped: 0 };

  const walk = (container, atParams) => {
    for (const node of container.nodes ?? []) {
      if (node.type === 'atrule') {
        if (node.name === 'keyframes') {
          if (!keyframes.has(node.params)) { keyframes.set(node.params, node.toString()); }
          continue;
        }
        if (node.name === 'media') { walk(node, node.params); continue; }
        continue; // other at-rules are not used by the mocks
      }
      if (node.type !== 'rule') continue;
      const sel = node.selector.trim();

      if (!atParams && sel === ':root') {
        rootSeen++;
        if (tpl === 'hub' && rootSeen === 1) { out.tokens.push(node.toString()); continue; }
        if (tpl === 'city') {
          // tokens the hub does not define go to tokens.css so they resolve everywhere
          const extra = node.nodes.filter((d) => d.type === 'decl' && /^--(ex-|font-ui)/.test(d.prop));
          if (extra.length) out.tokens.push(`:root{${extra.map((d) => d.toString()).join(';')}}`);
        }
        // every other :root becomes a scoped token override (e.g. the state/city --img-city photo)
        emit(tpl, node.clone({ selector: SCOPE[tpl] }), null, null);
        continue;
      }
      const sels = splitSelectors(sel);
      const chrome = sels.every(isChrome);
      const reset = RESET.test(sel) || (!atParams && (sel === 'html' || sel === 'body'));
      if (reset) {
        if (tpl === 'state') emit('base', node, atParams, null); else stats.dropped++;
        continue;
      }
      if (chrome) {
        if (claimChrome(tpl, node, atParams)) { emit('base', node, atParams, null); stats.chrome++; } else stats.dropped++;
        continue;
      }
      if (sels.some(isChrome)) {
        // mixed list: split chrome part to base (state only) and page part to the template
        const pageSels = sels.filter((s) => !isChrome(s));
        const chromeSels = sels.filter(isChrome);
        if (chromeSels.length && claimChrome(tpl, node.clone({ selector: chromeSels.join(',') }), atParams)) {
          emit('base', node.clone({ selector: chromeSels.join(',') }), atParams, null);
        }
        if (pageSels.length) emit(tpl, node.clone({ selector: pageSels.join(',') }), atParams, SCOPE[tpl]);
        stats.scoped++;
        continue;
      }
      emit(tpl, node, atParams, SCOPE[tpl]);
      stats.scoped++;
    }
  };
  walk(ast, null);
  console.log(tpl, stats);
}

const header = (name) => `/* ${name} — generated by scripts/port-css.mjs from the design mocks. Do not edit by hand. */\n`;
fs.writeFileSync(path.join(stylesDir, 'tokens.css'), header('tokens') + out.tokens.join('\n') + '\n');
fs.writeFileSync(path.join(stylesDir, 'base.css'), header('base') + [...keyframes.values()].join('\n') + '\n' + out.base.join('\n') + '\n');
for (const tpl of ['hub', 'state', 'city']) {
  let css = out[tpl].join('\n');
  // the state hero photo is per-state data: expose it as a CSS variable the template sets inline
  if (tpl === 'state') css = css.replace(/url\(\/img\/css-aaaca1ea\.webp\)/g, 'var(--img-state,url(/img/css-aaaca1ea.webp))');
  fs.writeFileSync(path.join(stylesDir, `${tpl}.css`), header(tpl) + css + '\n');
}
for (const f of ['tokens', 'base', 'hub', 'state', 'city']) {
  console.log(`styles/${f}.css`, fs.statSync(path.join(stylesDir, `${f}.css`)).size, 'bytes');
}
