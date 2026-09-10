// The 15-check validation harness — one implementation, used by both the pilot CLI
// (scripts/validate-render.mjs) and the migration agent.
//
// It takes an "expectation" per page, built from immutable migration data, and checks the rendered
// page against it. It never modifies a page and never relaxes a check: a failure is reported.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const CHECKS = [
  'template', 'legacy_url', 'title_h1', 'faq', 'hero_path', 'hero_file', 'seo_meta',
  'local_seo', 'structured_data', 'breadcrumbs', 'services', 'links', 'cta_contact', 'chrome', 'no_rewrite',
];

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&#039;': "'", '&nbsp;': ' ', '&#x2F;': '/' };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|nbsp|#x27|#0?39|#x2F);/g, (m) => ENT[m] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const textOf = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const norm = (s) => decode(String(s)).replace(/\s+/g, ' ').trim();
const one = (h, re) => (h.match(re) ?? [])[1];
const all = (h, re) => [...h.matchAll(re)].map((m) => m[1]);

/**
 * @param {object} exp expectation built from migration data:
 *   { slug, name, kind, publicUrl, previewUrl, publishable, faqs, hero, neighborhoods,
 *     metaDescription, branch, nationalPhone, prices, expectedServiceLinks, stateName, stateSlug, siteUrl, publicRoot }
 */
export async function validatePage(base, exp, { linkStatus }) {
  const results = [];
  const add = (check, ok, detail) => results.push({ check, ok, detail });
  const mode = exp.publishable ? 'public' : 'preview';
  const url = mode === 'public' ? exp.publicUrl : exp.previewUrl;

  const res = await fetch(base + url);
  const html = await res.text();
  const body = textOf(html);

  add('template', res.status === 200 && html.includes('tpl-city'), `status ${res.status}, tpl-city ${html.includes('tpl-city')}`);
  if (res.status !== 200) {
    for (const c of CHECKS.slice(1)) add(c, false, 'page did not render');
    return results;
  }

  // legacy URL served exactly, trailing slash included
  if (mode === 'public') {
    const noSlash = await fetch(base + exp.publicUrl.replace(/\/$/, ''), { redirect: 'manual' });
    add('legacy_url', [301, 308].includes(noSlash.status), `${exp.publicUrl} → 200; without slash → ${noSlash.status}`);
  } else {
    add('legacy_url', true, 'not published; public URL intentionally 404s');
  }

  const h1 = textOf(one(html, /<h1[^>]*>([\s\S]*?)<\/h1>/) ?? '');
  const title = textOf(one(html, /<title>([\s\S]*?)<\/title>/) ?? '');
  const expectedH1 = `Chimney Sweep & Fireplace Services in ${exp.name}, ${exp.stateCode}`;
  add('title_h1', h1 === expectedH1 && (mode !== 'public' || title === `${expectedH1} - Chimcare`), `h1 "${h1}"; title "${title}"`);

  // every source FAQ, verbatim
  const faqQs = all(html, /<button class="faq-q"[^>]*>([\s\S]*?)<svg/g).map(textOf);
  const missingQ = exp.faqs.filter((f) => !faqQs.includes(norm(f.question)));
  const missingA = exp.faqs.filter((f) => !body.includes(norm(f.answer).slice(0, 120)));
  add('faq', exp.faqs.length > 0 && !missingQ.length && !missingA.length,
    `${exp.faqs.length} source FAQs; missing Q ${missingQ.length}; missing A ${missingA.length}`);

  add('hero_path', !!exp.hero && html.includes(`/${exp.hero.imageKey}`), exp.hero ? `expected /${exp.hero.imageKey}` : 'no hero on the row');

  if (exp.hero) {
    const file = path.join(exp.publicRoot, exp.hero.imageKey);
    const exists = fs.existsSync(file);
    const buf = exists ? fs.readFileSync(file) : null;
    const sha = buf ? crypto.createHash('sha256').update(buf).digest('hex') : null;
    const altOk = exp.hero.alt ? html.includes(`alt="${exp.hero.alt.replace(/&/g, '&amp;')}"`) || html.includes(`alt="${exp.hero.alt}"`) : true;
    add('hero_file', exists && sha === exp.hero.sha256 && (exp.hero.filesize == null || buf.length === exp.hero.filesize) && path.basename(file) === exp.hero.filename && altOk,
      `exists ${exists}, sha match ${sha === exp.hero.sha256}, bytes ${buf?.length}/${exp.hero.filesize}, name ${path.basename(file)}, alt rendered ${altOk}`);
  } else {
    add('hero_file', false, 'no hero attachment');
  }

  const canonical = one(html, /rel="canonical" href="([^"]+)"/);
  const desc = one(html, /<meta name="description" content="([^"]*)"/);
  const robots = one(html, /<meta name="robots" content="([^"]*)"/) ?? '';
  if (mode === 'public') {
    const descOk = !exp.metaDescription || norm(desc ?? '') === norm(exp.metaDescription);
    add('seo_meta', canonical === `${exp.siteUrl}${exp.publicUrl}` && !!desc && descOk && !/noindex/.test(robots),
      `canonical ${canonical}; description matches source ${descOk}; robots ${robots || '(none)'}`);
  } else {
    add('seo_meta', /noindex/.test(robots), `preview must be noindex; robots ${robots || '(none)'}`);
  }

  const phone = exp.branch?.phone ?? exp.nationalPhone;
  const telHref = `tel:${phone.replace(/\D/g, '')}`;
  const streetShown = exp.branch ? html.includes(exp.branch.street) : false;
  add('local_seo', html.includes(telHref) && (exp.kind === 'branch' ? streetShown : !streetShown),
    `tel ${telHref} ${html.includes(telHref)}; street address shown ${streetShown} (kind ${exp.kind})`);

  let graph = [];
  let parsed = true;
  try {
    graph = all(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g).flatMap((j) => JSON.parse(j)['@graph'] ?? []);
  } catch {
    parsed = false;
  }
  const types = graph.map((n) => n['@type']);
  const businessType = exp.kind === 'branch' ? 'HomeAndConstructionBusiness' : 'Service';
  const areaServed = graph.find((n) => n.areaServed)?.areaServed ?? [];
  const areaNames = (Array.isArray(areaServed) ? areaServed : [areaServed]).map((a) => a?.name);
  add('structured_data',
    parsed && types.includes('WebPage') && types.includes('BreadcrumbList') && types.includes(businessType) &&
      !html.includes('AggregateRating') && !html.includes('"Review"') && areaNames.includes(exp.name),
    `parsed ${parsed}; types ${types.join(',')}; expected ${businessType}; areaServed has city ${areaNames.includes(exp.name)}`);

  const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList')?.itemListElement ?? [];
  add('breadcrumbs',
    crumbs.map((c) => c.name).join(' > ') === `Home > Locations > ${exp.stateName} > ${exp.name}` &&
      crumbs[1]?.item === `${exp.siteUrl}/locations/` && crumbs[2]?.item === `${exp.siteUrl}/locations/${exp.stateSlug}/`,
    `crumbs ${crumbs.map((c) => c.name).join(' > ')}`);

  const cards = (html.match(/<article class="svc-card"/g) ?? []).length;
  const serviceLinks = new Set(all(html, /href="(\/location\/[a-z0-9-]+\/)"/g).filter((h) => !h.includes(exp.slug)));
  add('services', cards === exp.expectedServiceCards && serviceLinks.size === exp.expectedServiceLinks,
    `${cards} cards (expected ${exp.expectedServiceCards}); ${serviceLinks.size} links (expected ${exp.expectedServiceLinks})`);

  const internal = [...new Set(all(html, /href="(\/[^"#?]*)"/g))].filter((h) => !h.startsWith('/uploads/') && !h.startsWith('/img/') && h !== '/sitemap.xml');
  const broken = [];
  for (const href of internal) {
    const st = await linkStatus(href);
    if (st >= 400) broken.push(`${href} → ${st}`);
  }
  add('links', broken.length === 0, broken.length ? `broken: ${broken.slice(0, 4).join(', ')}` : `${internal.length} internal links all resolve`);

  add('cta_contact', exp.prices.every((p) => html.includes(p)) && html.includes('id="booking"') && html.includes(phone),
    `prices ${exp.prices.join('/')}; booking form ${html.includes('id="booking"')}; phone ${html.includes(phone)}`);

  const chrome = {
    header: html.includes('<header'),
    footer: html.includes('<footer'),
    stateHubLink: html.includes(`href="/locations/${exp.stateSlug}/"`),
    nationalPhone: html.includes(`tel:${exp.nationalPhone.replace(/\D/g, '')}`),
    trustLine: html.includes('Since 1989'),
  };
  add('chrome', Object.values(chrome).every(Boolean), Object.entries(chrome).map(([k, v]) => `${k} ${v}`).join(', '));

  const rendered = all(html, /#i-pin"><\/use><\/svg>([^<]+)<\/li>/g).map(norm);
  const expectedAreas = [...exp.neighborhoods.map(norm), 'Surrounding areas'];
  add('no_rewrite', rendered.join('|') === expectedAreas.join('|'), `rendered [${rendered.join(', ')}] vs source [${expectedAreas.join(', ')}]`);

  return results;
}

/** Runs the harness over many pages, sharing one link-status cache. */
export async function validateAll(base, expectations) {
  const cache = new Map();
  const linkStatus = async (u) => {
    if (!cache.has(u)) {
      const r = await fetch(base + u, { redirect: 'manual' }).catch(() => ({ status: 0 }));
      cache.set(u, r.status);
    }
    return cache.get(u);
  };
  const byPage = new Map();
  for (const exp of expectations) byPage.set(exp.slug, await validatePage(base, exp, { linkStatus }));
  return byPage;
}
