// Content-binding check: fetches each test URL from a running server and prints what the template
// actually rendered for that row. Usage: node scripts/check-pages.mjs [http://localhost:3000]

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").trim();
const first = (s, re) => (s.match(re) ?? [])[1];
const all = (s, re) => [...s.matchAll(re)].map((m) => m[1]);

const URLS = [
  { url: '/locations/', expect: 200 },
  { url: '/locations/mn/', expect: 200 },
  { url: '/location/chimney-sweep-fireplace-in-minneapolis-mn/', expect: 200, note: 'branch city: 120 South 6th St, 612-509-9564' },
  { url: '/location/chimney-sweep-fireplace-in-eagan-mn/', expect: 200, note: 'branch city' },
  { url: '/location/chimney-sweep-repair-in-bloomington-mn/', expect: 200, note: 'coverage city (no street address; areas from the live page)' },
  { url: '/location/chimney-crown-sealing-in-minneapolis-mn/', expect: 200, note: 'service page (Q1 option a)' },
  { url: '/location/chimney-sweep-repair-in-minneapolis-mn/', expect: 308, note: 'redirects.json: duplicate city page → branch page' },
  { url: '/location/fireplace-inserts-in-bloomington-mn/', expect: 308, note: 'redirects.json: real target' },
  { url: '/location/chimney-caps-repair-in-bloomington-mn-2/', expect: 404, note: 'gone.json (edge answers 410 in production)' },
  { url: '/location/chimney-sweep-repair-in-isanti-mn/', expect: 404, note: 'coverage city in review (no city FAQ yet)' },
  { url: '/location/chimney-nest-removal-in-minneapolis-mn/', expect: 404, note: 'live Tier A URL outside the 92-service catalogue: kind=legacy until LegacyShell exists' },
  { url: '/locations/wa/', expect: 404, note: 'state not in this seed' },
  { url: '/location/this-slug-does-not-exist/', expect: 404 },
];

let failures = 0;
for (const t of URLS) {
  const res = await fetch(base + t.url, { redirect: 'manual' });
  const ok = res.status === t.expect;
  if (!ok) failures++;
  console.log(`\n${ok ? '✓' : '✗'} ${t.url}  →  ${res.status}${t.note ? `   (${t.note})` : ''}`);
  if (res.status >= 300 && res.status < 400) {
    console.log('    Location:', res.headers.get('location'));
    continue;
  }
  if (res.status !== 200) continue;
  const html = await res.text();
  const ld = all(html, /<script type="application\/ld\+json">(.*?)<\/script>/gs).flatMap((j) => (JSON.parse(j)['@graph'] ?? []).map((n) => n['@type']));
  console.log('    title      :', strip(first(html, /<title>(.*?)<\/title>/) ?? ''));
  console.log('    h1         :', strip(first(html, /<h1[^>]*>(.*?)<\/h1>/s) ?? ''));
  console.log('    canonical  :', first(html, /rel="canonical" href="([^"]+)"/));
  console.log('    json-ld    :', ld.join(', '), html.includes('AggregateRating') ? '  !! AggregateRating present' : '');
  const slots = all(html, /(\{\{[^}]+\}\})/g);
  if (slots.length) { failures++; console.log('    !! unfilled slots:', slots.slice(0, 5).join(' ')); }
  const addr = first(html, /<p class="addr"[^>]*>.*?<\/svg>([^<]+)<\/p>/s);
  if (addr) console.log('    hero line  :', strip(addr));
  const phones = [...new Set(all(html, /Call (\d{3}-\d{3}-\d{4})/g))];
  if (phones.length) console.log('    phone      :', phones.join(', '));
  const prices = [...new Set(all(html, /(\$\d{2,3}) (?:Chimney|- Chimney|Gas)/g))];
  if (prices.length) console.log('    prices     :', prices.join(' / '));
  const hoods = all(html, /#i-pin"><\/use><\/svg>([^<]+)<\/li>/g);
  if (hoods.length) console.log('    areas      :', hoods.join(', '));
  const cards = (html.match(/<article class="svc-card"/g) ?? []).length;
  if (cards) console.log('    svc cards  :', cards, '| links to service pages:', all(html, /href="\/location\/([a-z0-9-]+)\/"/g).filter((s) => !/^chimney-sweep-(fireplace|repair)-in-/.test(s)).length);
  const faqs = all(html, /<button class="faq-q"[^>]*>([^<]+)<svg/g);
  if (faqs.length) console.log('    faq        :', faqs.length, 'questions —', strip(faqs[0]), '…');
  const locCards = all(html, /<p class="city">([^<]+)<\/p>/g);
  if (locCards.length) console.log('    loc cards  :', locCards.map(strip).join(' | '));
  const stateCards = all(html, /<span class="abbr">([A-Z]{2})<\/span>/g);
  if (stateCards.length) console.log('    state cards:', stateCards.join(', '));
}
// --- booking form round-trip: POST like the form does, then read it back --------------------------
const token = process.env.ADMIN_TOKEN ? `?token=${process.env.ADMIN_TOKEN}` : '';
const date = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
const post = await fetch(base + '/api/bookings/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    service: 'sweep', serviceLabel: '$299 Chimney Sweep + Inspection', date, timeWindow: '8–11 AM',
    name: 'Check Script', phone: '612-555-0100', email: 'check@example.com', zip: '55402', notes: 'check-pages.mjs',
    context: { pageSlug: '/location/chimney-sweep-fireplace-in-minneapolis-mn/', pageKind: 'city', label: 'Chimcare · Minneapolis, MN', stateCode: 'MN', cityId: 1, cityName: 'Minneapolis', branchId: 1 },
  }),
});
const receipt = await post.json();
console.log(`\n${post.status === 201 && receipt.ok ? '✓' : '✗'} POST /api/bookings/  →  ${post.status}`, receipt);
if (!(post.status === 201 && receipt.ok)) failures++;
const bad = await fetch(base + '/api/bookings/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service: 'sweep', date: '2020-01-01', name: 'x' }) });
console.log(`${bad.status === 422 ? '✓' : '✗'} POST invalid payload  →  ${bad.status} (expects 422 with field errors)`);
if (bad.status !== 422) failures++;
const list = await fetch(base + '/api/bookings/' + token);
if (list.status === 200) {
  const { bookings } = await list.json();
  const mine = bookings.find((b) => b.reference === receipt.reference);
  console.log(`${mine ? '✓' : '✗'} GET /api/bookings/  →  ${bookings.length} rows; stored context:`, mine ? { pageKind: mine.pageKind, cityName: mine.cityName, stateCode: mine.stateCode, branchId: mine.branchId, status: mine.status, externalId: mine.externalId } : 'not found');
  if (!mine) failures++;
} else {
  console.log(`  GET /api/bookings/ → ${list.status} (set ADMIN_TOKEN to read it in production mode)`);
}

console.log(`\n${failures ? `${failures} check(s) failed` : 'all checks passed'}`);
process.exit(failures ? 1 : 0);
