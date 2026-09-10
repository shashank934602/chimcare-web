// Overflow measurement in a REAL browser window, with no device emulation at all.
//
// scripts/check-responsive.mjs uses Emulation.setDeviceMetricsOverride, which is fast but is a
// simulation: Chrome reports its own idea of the viewport and can hold a stale scroll width. This
// script instead opens a window of the requested size, measures what the page actually does, and
// cross-checks four independent numbers that must agree:
//
//   documentElement.clientWidth   the layout viewport CSS breakpoints resolve against
//   documentElement.scrollWidth   how wide the document actually is
//   body.scrollWidth              how wide the body actually is
//   visualViewport.width          what the user can see
//
// It also reports whether the page can be scrolled sideways by hand, which is the thing a visitor
// would notice, and names the elements responsible.
//
//   node scripts/test/viewport-real.mjs [base] --widths 390,834,1440 --url /path ...

import { spawn } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith('http')) ?? 'http://localhost:3000').replace(/\/$/, '');
const widths = (args.includes('--widths') ? args[args.indexOf('--widths') + 1] : '390,834,1440').split(',').map(Number);
const urls = args.reduce((acc, a, i) => (a === '--url' ? [...acc, args[i + 1]] : acc), []);
const json = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error('Chrome not found');

const MEASURE = `(() => {
  // Force layout before reading: Chrome can otherwise return a scroll width computed before the
  // last style or font change. Adding and removing a node invalidates it properly; a class no-op
  // does not.
  const probe = document.createElement('div');
  document.body.appendChild(probe);
  void document.documentElement.offsetWidth;
  probe.remove();
  void document.documentElement.offsetWidth;

  const de = document.documentElement;
  const vw = de.clientWidth;

  // Can a person actually scroll sideways? Try it and put it back.
  const before = window.scrollX;
  window.scrollTo(vw, window.scrollY);
  const scrolled = Math.round(window.scrollX);
  window.scrollTo(before, window.scrollY);

  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= vw + 1) continue;
    let a = el, skip = false;
    for (let n = 0; a && n < 12; n++, a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') { skip = true; break; }
      if (a.hasAttribute('hidden') || a.getAttribute('aria-hidden') === 'true') { skip = true; break; }
    }
    if (skip) continue;
    offenders.push({
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className : '').split(' ').filter(Boolean).slice(0, 3).join('.'),
      right: Math.round(r.right), width: Math.round(r.width),
      text: (el.textContent || '').trim().slice(0, 44),
    });
  }
  offenders.sort((a, b) => b.right - a.right);
  return JSON.stringify({
    vw,
    docScroll: de.scrollWidth,
    bodyScroll: document.body.scrollWidth,
    visual: window.visualViewport ? Math.round(window.visualViewport.width) : null,
    scrollableBy: scrolled,
    dpr: window.devicePixelRatio,
    offenders: offenders.slice(0, 6),
  });
})()`;

const results = [];
for (const width of widths) {
  // A fresh window per width: resizing an existing one leaves media queries settled on the old size.
  const port = 9500 + width % 100;
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    `--window-size=${width},900`, `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/chrome-viewport-${width}`, 'about:blank',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) { wsUrl = (await r.json()).webSocketDebuggerUrl; break; } } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!wsUrl) { chrome.kill(); throw new Error(`Chrome did not start for width ${width}`); }

  const sock = new WebSocket(wsUrl);
  await new Promise((r) => sock.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  sock.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
  const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); sock.send(JSON.stringify({ id: i, method, params, sessionId })); });

  // Attach to the window Chrome already opened at the requested size. Creating a new target would
  // give it Chrome's default dimensions and defeat the point of sizing the window.
  const { targetInfos } = await send('Target.getTargets');
  const page = targetInfos.find((t) => t.type === 'page');
  if (!page) { chrome.kill(); throw new Error(`no page target at width ${width}`); }
  const { sessionId } = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  await send('Page.enable', {}, sessionId);

  // Chrome will not open a window narrower than roughly 500px, so a 390px "real window" silently
  // measures 500px instead. Check the layout viewport actually reached the requested width and, when
  // it cannot, say so and fall back to device metrics for that width rather than reporting a number
  // for a viewport nobody tested. Either way the scroll attempt below is a real one.
  await send('Page.navigate', { url: base + urls[0] }, sessionId);
  await new Promise((r) => setTimeout(r, 900));
  const probe = await send('Runtime.evaluate', { expression: 'document.documentElement.clientWidth', returnByValue: true }, sessionId);
  let method = 'real-window';
  if (probe.result.value !== width) {
    method = 'emulated';
    await send('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: width < 900 ? 2 : 1, mobile: width < 900,
      screenWidth: width, screenHeight: 900,
    }, sessionId);
    console.log(`  · ${width}px: the window would not go below ${probe.result.value}px, so this width is device-emulated`);
  }

  for (const url of urls) {
    await send('Page.navigate', { url: base + url }, sessionId);
    await new Promise((r) => setTimeout(r, 1700));
    const { result } = await send('Runtime.evaluate', { expression: MEASURE, returnByValue: true }, sessionId);
    const m = JSON.parse(result.value);
    const overflow = Math.max(m.docScroll, m.bodyScroll) - m.vw;
    // The layout viewport must be the width we asked for, or the measurement is about a different page.
    const atWidth = m.vw === width;
    const ok = atWidth && overflow <= 1 && m.scrollableBy <= 1;
    results.push({ url, width, method, ...m, overflow, ok });
    console.log(
      `${ok ? '✓' : '✗'} ${String(width).padStart(4)}px ${method === 'emulated' ? '(emu)' : '     '} ${url.padEnd(50)} layout ${m.vw} · doc ${m.docScroll} · body ${m.bodyScroll} · scrollable ${m.scrollableBy}px${ok ? '' : atWidth ? `  OVERFLOW +${overflow}px` : `  WRONG VIEWPORT (${m.vw} not ${width})`}`,
    );
    if (!ok) for (const o of m.offenders) console.log(`        ${o.tag}${o.cls ? '.' + o.cls : ''}  right=${o.right} width=${o.width}  "${o.text}"`);
  }
  sock.close();
  chrome.kill();
}

if (json) fs.writeFileSync(json, JSON.stringify(results, null, 1) + '\n');
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} real-window checks with no horizontal overflow.`);
process.exit(bad.length ? 1 : 0);
