// Measures real horizontal overflow at given viewport widths, using Chrome over the DevTools
// Protocol with proper device-metrics emulation (not just a resized window, which mis-measures
// mobile layout). For each page and width it reports the document scroll width against the viewport
// and names the widest offending elements.
//
// Read-only: it loads pages and measures them. Nothing is written.
//
//   node scripts/check-responsive.mjs [base-url] [--widths 390,834,1440] [--url /path ...]

import { spawn } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith('http')) ?? 'http://localhost:3000').replace(/\/$/, '');
const widths = (args.includes('--widths') ? args[args.indexOf('--widths') + 1] : '390,834,1440').split(',').map(Number);
const urls = args.reduce((acc, a, i) => (a === '--url' ? [...acc, args[i + 1]] : acc), []);
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error('Chrome not found');
const PORT = 9333;

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/chrome-responsive-profile', 'about:blank',
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

/** Minimal CDP client over the browser-level socket, using flat sessions. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.waiting = new Map();
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.waiting.has(msg.id)) {
        const { resolve, reject } = this.waiting.get(msg.id);
        this.waiting.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
      if (msg.method === 'Page.loadEventFired') this.onLoad?.();
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
}

const MEASURE = `(() => {
  const vw = window.innerWidth;
  const doc = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed') continue;
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === 'string' ? el.className : '').split(' ').filter(Boolean).slice(0, 3).join('.'),
        right: Math.round(r.right),
        width: Math.round(r.width),
        text: (el.textContent || '').trim().slice(0, 40),
      });
    }
  }
  offenders.sort((a, b) => b.right - a.right);
  const seen = new Set();
  const top = offenders.filter((o) => { const k = o.tag + o.cls; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 5);
  return JSON.stringify({ vw, doc, overflow: doc - vw, count: offenders.length, top });
})()`;

const wsUrl = await endpoint();
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
const cdp = new Cdp(ws);
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
await cdp.send('Page.enable', {}, sessionId);
await cdp.send('Runtime.enable', {}, sessionId);

const results = [];
for (const url of urls) {
  for (const width of widths) {
    const mobile = width < 900;
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: mobile ? 2 : 1, mobile,
      screenWidth: width, screenHeight: 900,
    }, sessionId);
    await cdp.send('Page.navigate', { url: base + url }, sessionId);
    await new Promise((r) => setTimeout(r, 1400));
    const { result } = await cdp.send('Runtime.evaluate', { expression: MEASURE, returnByValue: true, awaitPromise: false }, sessionId);
    const m = JSON.parse(result.value);
    results.push({ url, width, ...m });
    const status = m.overflow <= 1 ? 'ok' : `OVERFLOW +${m.overflow}px`;
    console.log(`${status === 'ok' ? '✓' : '✗'} ${String(width).padStart(4)}px  ${url}  viewport ${m.vw} · document ${m.doc}  ${status}`);
    if (m.overflow > 1) for (const o of m.top) console.log(`        ${o.tag}${o.cls ? '.' + o.cls : ''}  right=${o.right} width=${o.width}  "${o.text}"`);
  }
}

const bad = results.filter((r) => r.overflow > 1);
console.log(`\n${results.length - bad.length}/${results.length} viewport checks with no horizontal overflow.`);
ws.close();
chrome.kill();
process.exit(bad.length ? 1 : 0);
