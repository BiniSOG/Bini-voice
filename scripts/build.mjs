// Bini Voice build: assembles dist/app (PWA) and dist/extension (Chrome MV3). No dependencies.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const shared = join(root, 'shared');
const LIB = ['dsp.js', 'presets.js', 'engine.js', 'store.js'];

function writeLib(dir) {
  mkdirSync(dir, { recursive: true });
  for (const f of LIB) cpSync(join(shared, f), join(dir, f));
  const worklet = readFileSync(join(shared, 'dsp.js'), 'utf8') + '\n' + readFileSync(join(shared, 'worklet-processor.js'), 'utf8');
  writeFileSync(join(dir, 'worklet.js'), worklet);
}

rmSync(dist, { recursive: true, force: true });

// PWA
const appOut = join(dist, 'app');
cpSync(join(root, 'app'), appOut, { recursive: true });
writeLib(join(appOut, 'lib'));

// Chrome extension (popup + content scripts + full app as the Studio page)
const extOut = join(dist, 'extension');
cpSync(join(root, 'extension'), extOut, { recursive: true });
writeLib(join(extOut, 'lib'));
cpSync(appOut, join(extOut, 'studio'), { recursive: true });
rmSync(join(extOut, 'studio', 'sw.js'), { force: true });

// Optional zip for the Chrome Web Store
try {
  execSync('zip -qr ../bini-voice-extension.zip .', { cwd: extOut, stdio: 'ignore' });
  console.log('✓ dist/bini-voice-extension.zip');
} catch { /* zip not installed — fine */ }

console.log('✓ dist/app        → serve this folder (PWA)');
console.log('✓ dist/extension  → chrome://extensions → Load unpacked');
if (!existsSync(join(root, 'app', 'icons', 'icon-192.png'))) console.warn('! icons missing: run npm run icons');
