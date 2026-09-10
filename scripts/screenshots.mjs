/**
 * Responsive screenshots using a TRUE viewport (Puppeteer setViewport).
 * Chrome's --window-size sets the window, not the viewport, which produced
 * misleading "clipped" captures during Phase 7 debugging.
 */
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.argv[2] ?? "http://localhost:3100/location/chimney-sweep-repair-in-boston-ma/";
const OUT = process.argv[3] ?? ".";
const BPS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"] });
for (const bp of BPS) {
  const page = await browser.newPage();
  await page.setViewport({ width: bp.width, height: bp.height, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  const path = `${OUT}/boston-${bp.name}.png`;
  await page.screenshot({ path, fullPage: true });
  const dims = await page.evaluate(() => ({
    w: document.documentElement.clientWidth, h: document.documentElement.scrollHeight,
  }));
  console.log(`${bp.name.padEnd(8)} viewport=${bp.width}px  page=${dims.w}x${dims.h}  -> ${path}`);
  await page.close();
}
await browser.close();
