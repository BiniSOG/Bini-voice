// Renders the Bini Voice logo into PNG icons (requires Playwright, dev only).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#8a6bff"/><stop offset=".45" stop-color="#c86bff"/><stop offset="1" stop-color="#ff6fae"/></linearGradient>
    <radialGradient id="h" cx=".3" cy=".15" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <rect x="${pad}" y="${pad}" width="${100 - 2 * pad}" height="${100 - 2 * pad}" rx="${pad ? 0 : 24}" fill="url(#g)"/>
  <rect x="${pad}" y="${pad}" width="${100 - 2 * pad}" height="${100 - 2 * pad}" rx="${pad ? 0 : 24}" fill="url(#h)"/>
  <g fill="#fff" transform="translate(50 50) scale(${pad ? 0.72 : 1}) translate(-50 -50)">
    <rect x="25" y="41" width="7" height="18" rx="3.5"/><rect x="36.5" y="31" width="7" height="38" rx="3.5"/>
    <rect x="48" y="21" width="7" height="58" rx="3.5"/><rect x="59.5" y="35" width="7" height="30" rx="3.5"/>
    <rect x="71" y="43" width="7" height="14" rx="3.5"/></g></svg>`;

const jobs = [
  ...[16, 32, 48, 128].map((s) => ({ s, out: `extension/icons/icon-${s}.png`, pad: 0 })),
  { s: 192, out: 'app/icons/icon-192.png', pad: 0 },
  { s: 512, out: 'app/icons/icon-512.png', pad: 0 },
  { s: 512, out: 'app/icons/maskable-512.png', pad: 0.0001 }
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const j of jobs) {
  await page.setViewportSize({ width: j.s, height: j.s });
  const body = j.pad ? svg(0).replace('rx="24"', 'rx="0"').replace('rx="24"', 'rx="0"').replace('scale(1)', 'scale(0.72)') : svg(0);
  await page.setContent(`<html><body style="margin:0;background:transparent">${body.replace('<svg ', `<svg width="${j.s}" height="${j.s}" `)}</body></html>`);
  await page.screenshot({ path: join(root, j.out), omitBackground: true, clip: { x: 0, y: 0, width: j.s, height: j.s } });
  console.log('✓', j.out);
}
await browser.close();
