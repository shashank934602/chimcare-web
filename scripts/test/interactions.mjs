// Interaction checks. Drives a real headless Chrome over the DevTools Protocol and exercises the
// behaviours the design mocks specify, asserting the DOM actually changes.
//
// Rendering checks (scripts/test/templates.mjs) prove the markup is in the server HTML. These prove
// the islands make it behave. Read-only: it clicks and types on a local preview and writes nothing.
//
//   node scripts/test/interactions.mjs [base-url]

import { spawn } from 'node:child_process';
import fs from 'node:fs';

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error('Chrome not found');
const PORT = 9455;

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/chrome-interactions', 'about:blank',
], { stdio: 'ignore' });

async function endpoint() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome did not expose a debugging endpoint');
}

const sock = new WebSocket(await endpoint());
await new Promise((r) => sock.addEventListener('open', r));
let msgId = 0;
const pending = new Map();
sock.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});
const send = (method, params = {}, sessionId) =>
  new Promise((res) => { const id = ++msgId; pending.set(id, res); sock.send(JSON.stringify({ id, method, params, sessionId })); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (exceptionDetails) return { error: exceptionDetails.text ?? 'evaluation failed' };
  return { value: result?.value };
};

async function open(url, width = 1440) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 900, screenWidth: width, screenHeight: 900 }, sessionId);
  await send('Page.navigate', { url: base + url }, sessionId);
  await new Promise((r) => setTimeout(r, 1600));
}

let failures = 0;
let total = 0;
const check = (label, ok, detail = '') => {
  total++;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

// `q` is a query executed in the page; each returns a plain value.
const q = async (expr) => (await evaluate(`(() => { ${expr} })()`)).value;

// ─────────────────────────────────────────── NationalHub
console.log('\n──────── NationalHub — finder, state load-more, chip directory');
await open('/preview/national/');
{
  const before = await q(`return [...document.querySelectorAll('#state-cards .state-card')].filter(e => !e.hidden).length;`);
  check('state grid opens with a batch, not everything', before === 6, `showing ${before} of 8`);

  await q(`document.querySelector('#states-load-more').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 250));
  const after = await q(`return [...document.querySelectorAll('#state-cards .state-card')].filter(e => !e.hidden).length;`);
  check('load more reveals the rest', after === 8, `showing ${after} of 8`);

  const groups = await q(`return document.querySelectorAll('#dirlist .chips-group').length;`);
  check('chip directory has a group per state', groups === 8, `${groups} groups`);

  // Typing a city name filters the chips and narrows the status line.
  await q(`const i = document.querySelector('#f-q');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(i, 'Fixture City 1'); i.dispatchEvent(new Event('input', { bubbles: true })); return 1;`);
  await new Promise((r) => setTimeout(r, 350));
  const visibleChips = await q(`return [...document.querySelectorAll('#dirlist .chips a, #dirlist .chips span')].filter(e => !e.hidden).length;`);
  check('typing a city filters the chip directory', visibleChips > 0 && visibleChips < 24, `${visibleChips} chips shown`);
  const note = await q(`return document.querySelector('#finder-note').textContent.trim();`);
  check('status line reports the filtered count', /Showing/.test(note) && /of 24/.test(note), note.slice(0, 60));
  check('clear button appears once there is a query', await q(`return !document.querySelector('#f-clear').hidden;`));

  await q(`document.querySelector('#f-clear').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 350));
  const restored = await q(`return document.querySelector('#finder-note').textContent.trim();`);
  check('clearing restores the full list', /all 24 locations/.test(restored), restored.slice(0, 50));

  await q(`const i = document.querySelector('#f-q');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(i, 'zzzznowhere'); i.dispatchEvent(new Event('input', { bubbles: true })); return 1;`);
  await new Promise((r) => setTimeout(r, 350));
  check('no match shows the empty state', await q(`return !document.querySelector('#dir-empty').hidden;`));
}

// ─────────────────────────────────────────── StateHub
console.log('\n──────── StateHub — directory filter, load more, map toggle');
await open('/preview/state/');
{
  const first = await q(`return [...document.querySelectorAll('#loc-grid .loc-card')].filter(e => !e.hidden).length;`);
  check('directory opens with the first page', first === 6, `showing ${first} of 20`);

  await q(`const b = [...document.querySelectorAll('.dir-more button')].pop(); b.click(); return 1;`);
  await new Promise((r) => setTimeout(r, 300));
  const more = await q(`return [...document.querySelectorAll('#loc-grid .loc-card')].filter(e => !e.hidden).length;`);
  check('load more adds the next page', more > first, `showing ${more} of 20`);

  await q(`const i = document.querySelector('#f-q');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(i, 'Fixture City 3'); i.dispatchEvent(new Event('input', { bubbles: true })); return 1;`);
  await new Promise((r) => setTimeout(r, 400));
  const filtered = await q(`return [...document.querySelectorAll('#loc-grid .loc-card')].filter(e => !e.hidden).length;`);
  check('hero search filters the directory grid', filtered > 0 && filtered < 20, `${filtered} cards`);
  const count = await q(`return document.querySelector('#dir-count').textContent.replace(/\\s+/g, ' ').trim();`);
  check('directory count follows the filter', /\b1\b/.test(count), count.slice(0, 40));

  await q(`const i = document.querySelector('#f-q');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(i, 'zzzznowhere'); i.dispatchEvent(new Event('input', { bubbles: true })); return 1;`);
  await new Promise((r) => setTimeout(r, 400));
  check('no match shows the directory empty state', await q(`return !!document.querySelector('.dir-empty');`));

  await q(`document.querySelector('#map-toggle').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 300));
  const toggled = await q(`const t = document.querySelector('#map-toggle');
    return { open: document.querySelector('#map-panel').classList.contains('is-shown'), label: t.textContent.trim(), expanded: t.getAttribute('aria-expanded') };`);
  check('map toggle opens the panel', toggled.open === true, `label "${toggled.label}"`);
  check('map toggle reports its state to assistive tech', toggled.expanded === 'true');
  await q(`document.querySelector('#map-toggle').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 300));
  const toggled2 = await q(`const t = document.querySelector('#map-toggle');
    return { open: document.querySelector('#map-panel').classList.contains('is-shown'), label: t.textContent.trim() };`);
  check('map toggle closes it again', toggled2.open === false, `label "${toggled2.label}"`);
}

// ─────────────────────────────────────────── CityPage
console.log('\n──────── CityPage — service accordion, drawer, solutions filter, FAQ');
await open('/preview/city/');
{
  const acc = await q(`const rows = [...document.querySelectorAll('#svc-lib .o1-row')];
    const openFirst = rows[0].classList.contains('is-open');
    rows[1].querySelector('[data-acc-trigger]').click();
    return { openFirst, secondOpen: rows[1].classList.contains('is-open'), firstClosedAfter: !rows[0].classList.contains('is-open'),
             aria: rows[1].querySelector('[data-acc-trigger]').getAttribute('aria-expanded') };`);
  check('first service row opens by default', acc.openFirst === true);
  check('clicking a row opens it', acc.secondOpen === true);
  check('single-mode accordion closes the previous row', acc.firstClosedAfter === true);
  check('accordion updates aria-expanded', acc.aria === 'true');

  const drawer = await q(`document.querySelector('[data-drawer-open]').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 300));
  const d = await q(`const dr = document.querySelector('#drawer');
    return { open: dr.classList.contains('is-open'), hidden: dr.getAttribute('aria-hidden'),
             title: (document.querySelector('#drawer-title') || {}).textContent || '',
             locked: document.body.classList.contains('no-scroll') };`);
  check('service drawer opens from a row trigger', d.open === true);
  check('drawer is exposed to assistive tech when open', d.hidden === 'false');
  check('drawer shows the row it was opened with', /FIXTURE Service 1/.test(d.title), d.title.slice(0, 40));
  check('background scroll is locked while the drawer is open', d.locked === true);

  await q(`document.querySelector('#drawer [data-drawer-close]').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 300));
  const dc = await q(`const dr = document.querySelector('#drawer');
    return { open: dr.classList.contains('is-open'), locked: document.body.classList.contains('no-scroll') };`);
  check('drawer closes', dc.open === false);
  check('scroll lock is released', dc.locked === false);

  await q(`document.querySelector('[data-drawer-open]').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 250));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sessionId);
  await new Promise((r) => setTimeout(r, 300));
  check('Escape closes the drawer', await q(`return !document.querySelector('#drawer').classList.contains('is-open');`));

  const solBefore = await q(`return [...document.querySelectorAll('#svc-grid .svc-card')].filter(e => !e.hidden).length;`);
  check('solutions grid opens with one page', solBefore === 8, `${solBefore} of 24`);
  await q(`document.querySelector('#svc-more-btn').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 250));
  const solAfter = await q(`return [...document.querySelectorAll('#svc-grid .svc-card')].filter(e => !e.hidden).length;`);
  check('show more adds another page', solAfter > solBefore, `${solAfter} of 24`);

  await q(`document.querySelector('#svc-filters .svc-tile').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 250));
  const filtered = await q(`const shown = [...document.querySelectorAll('#svc-grid .svc-card')].filter(e => !e.hidden);
    return { n: shown.length, allSameCat: new Set(shown.map(e => e.dataset.cat)).size <= 1 };`);
  check('a category tile filters the grid', filtered.n > 0 && filtered.n < 24, `${filtered.n} cards`);
  check('the filtered grid shows only that category', filtered.allSameCat === true);

  const faq = await q(`const items = [...document.querySelectorAll('#o1-faq [data-acc-item]')];
    const before = items[0].classList.contains('is-open');
    items[1].querySelector('[data-acc-trigger]').click();
    return { before, opened: items[1].classList.contains('is-open'), closedFirst: !items[0].classList.contains('is-open') };`);
  check('FAQ opens with the first answer visible', faq.before === true);
  check('FAQ opens the clicked question', faq.opened === true);
  check('FAQ closes the previous question', faq.closedFirst === true);
}

// ─────────────────────────────────────────── Shared chrome
console.log('\n──────── Shared chrome — mobile menu, booking sheet, floating cluster');
await open('/preview/city/', 390);
{
  await q(`document.querySelector('.menu-btn').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 250));
  const menu = await q(`const b = document.querySelector('.menu-btn');
    return { open: document.querySelector('#hdr').classList.contains('open'), aria: b.getAttribute('aria-expanded') };`);
  check('mobile menu opens', menu.open === true);
  check('mobile menu reports its state', menu.aria === 'true');
  await q(`document.querySelector('.menu-btn').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 250));
  check('mobile menu closes again', await q(`return !document.querySelector('#hdr').classList.contains('open');`));

  const trigger = await q(`const t = document.querySelector('#sfoot [data-book-sheet]'); if (!t) return 'no trigger'; t.click(); return 'clicked';`);
  await new Promise((r) => setTimeout(r, 350));
  const sheet = await q(`return document.querySelector('#bsheet').classList.contains('is-open');`);
  check('the sticky bar opens the booking sheet', sheet === true, trigger === 'no trigger' ? 'no trigger found' : '');
  await q(`const c = document.querySelector('#bsheet .drawer-close'); if (c) c.click(); return 1;`);
  await new Promise((r) => setTimeout(r, 350));
  check('the booking sheet closes', await q(`return !document.querySelector('#bsheet').classList.contains('is-open');`));

  await open('/preview/city/', 1440);
  const fcta = await q(`return document.querySelector('#fcta').classList.contains('is-on');`);
  check('floating cluster is off while the booking form is in view', fcta === false);
  await q(`window.scrollTo(0, document.body.scrollHeight); return 1;`);
  await new Promise((r) => setTimeout(r, 700));
  check('floating cluster appears once the booking form scrolls away',
    await q(`return document.querySelector('#fcta').classList.contains('is-on');`));
  await q(`document.querySelector('#fcta-sched').click(); return 1;`);
  await new Promise((r) => setTimeout(r, 350));
  check('the floating cluster opens the booking sheet',
    await q(`return document.querySelector('#bsheet').classList.contains('is-open');`));
  check('the cluster hides itself while the sheet is open',
    await q(`return !document.querySelector('#fcta').classList.contains('is-on');`));
}

console.log(`\n${failures === 0 ? `INTERACTION CHECKS: PASS (${total} checks)` : `INTERACTION CHECKS: ${failures} of ${total} FAILED`}`);
chrome.kill();
process.exit(failures === 0 ? 0 : 1);
