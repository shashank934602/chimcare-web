// Minimal CDP driver: emulate a real viewport width, capture a full-page PNG,
// and report any element that sticks out horizontally.
const { spawn } = require('child_process');
const fs = require('fs');

const CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333 + (process.pid % 200);

const PROBE = `(() => {
  const de = document.documentElement, vw = de.clientWidth, bad = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    const s = getComputedStyle(el);
    if (s.position === 'fixed' || s.visibility === 'hidden' || s.display === 'none') continue;
    if (el.closest('svg') || el.tagName === 'svg' || el.closest('.skip')) continue;
    if (r.right > vw + 1.5 || r.left < -1.5)
      bad.push(el.tagName.toLowerCase() + '.' + (String(el.className.baseVal ?? el.className).split(' ')[0] || '') + ' [' + Math.round(r.left) + ',' + Math.round(r.right) + ']');
  }
  return JSON.stringify({ vw, scrollW: de.scrollWidth, over: de.scrollWidth > vw, bad: bad.slice(0, 10) });
})()`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const jobs = JSON.parse(process.argv[2]); // [{file,width,out,eval?}]
  const chrome = spawn(CH, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--no-first-run', '--user-data-dir=/tmp/cdp-' + PORT, 'about:blank'], { stdio: 'ignore' });
  let ver;
  for (let i = 0; i < 60; i++) {
    try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; }
    catch { await sleep(250); }
  }
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}, sessionId) => new Promise(res => {
    const mid = ++id; pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });

  const { targetId } = (await send('Target.createTarget', { url: 'about:blank' })).result;
  const { sessionId } = (await send('Target.attachToTarget', { targetId, flatten: true })).result;
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable');

  for (const job of jobs) {
    await S('Emulation.setDeviceMetricsOverride',
      { width: job.width, height: job.height || 900, deviceScaleFactor: 1, mobile: job.width < 700 });
    await S('Page.navigate', { url: 'file://' + job.file });
    await sleep(job.wait || 2200);
    if (job.js) {
      const r = await S('Runtime.evaluate', { expression: job.js, awaitPromise: true });
      console.log('EVAL ' + job.tag + ' ' + (r.result?.result?.value ?? JSON.stringify(r.result?.exceptionDetails || '')));
      await sleep(600);
    }
    const probe = await S('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    console.log(job.tag + '  ' + probe.result.result.value);
    if (job.out) {
      const shot = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
        clip: job.clip || undefined });
      if (shot.result?.data) fs.writeFileSync(job.out, Buffer.from(shot.result.data, 'base64'));
      else console.log('  (screenshot failed)');
    }
  }
  ws.close(); chrome.kill();
}
main().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
