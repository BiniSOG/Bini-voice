// DSP + preset tests: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../shared/dsp.js');
require('../shared/presets.js');
const { VoiceShifter, FFT, detectPitch } = globalThis.BiniDSP;
const P = globalThis.BiniPresets;
const SR = 48000;

function harmonic(f0, n = SR) {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) { let v = 0; for (let h = 1; h < 16; h++) v += Math.sin(2 * Math.PI * f0 * h * i / SR) / h; x[i] = 0.2 * v; }
  return x;
}
function run(params, input) {
  const s = new VoiceShifter(SR, 1024); s.setParams(params);
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 128) s.process(input.subarray(i, i + 128), out.subarray(i, i + 128));
  return out;
}
function fundamental(x) {
  const N = 16384, f = new FFT(N), re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = x[x.length - N + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  f.transform(re, im, false);
  // lowest strong peak
  let max = 0; const mag = [];
  for (let k = 1; k < N / 2; k++) { mag[k] = Math.hypot(re[k], im[k]); max = Math.max(max, mag[k]); }
  for (let k = 2; k < N / 2 - 1; k++) if (mag[k] > max * 0.3 && mag[k] >= mag[k - 1] && mag[k] >= mag[k + 1]) return k * SR / N;
  return 0;
}
const rms = (x) => Math.sqrt(x.subarray(SR / 4).reduce((a, v) => a + v * v, 0) / (x.length - SR / 4));

test('FFT round trip', () => {
  const f = new FFT(64), re = new Float64Array(64).map((_, i) => Math.sin(i)), im = new Float64Array(64), orig = re.slice();
  f.transform(re, im, false); f.transform(re, im, true);
  for (let i = 0; i < 64; i++) assert.ok(Math.abs(re[i] / 64 - orig[i]) < 1e-9);
});

test('identity is transparent', () => {
  const x = harmonic(140), y = run({}, x);
  assert.ok(Math.abs(rms(y) / rms(x) - 1) < 0.02);
});

for (const [semis, f0] of [[12, 120], [7, 120], [-5, 200], [-12, 220], [4, 180]]) {
  test(`pitch ${semis > 0 ? '+' : ''}${semis} st on ${f0} Hz`, () => {
    const y = run({ pitch: semis }, harmonic(f0));
    const want = f0 * 2 ** (semis / 12), got = fundamental(y);
    assert.ok(Math.abs(got - want) / want < 0.02, `expected ~${want.toFixed(1)} got ${got.toFixed(1)}`);
    assert.ok(rms(y) > 0.05, 'output not silent');
  });
}

test('formant-only shift keeps pitch', () => {
  const y = run({ formant: 1.2 }, harmonic(150));
  assert.ok(Math.abs(fundamental(y) - 150) < 3);
});

test('robot voice is monotone at frame rate', () => {
  const y = run({ robot: 1 }, harmonic(130));
  assert.ok(Math.abs(detectPitch(y.subarray(SR / 2, SR / 2 + 4096), SR) - SR / 256) < 3);
});

test('presets resolve sensibly for male and female speakers', () => {
  const f = P.findVoice('f-young'), m = P.findVoice('m-adult');
  assert.ok(P.resolve(f, { gender: 'male' }).pitch > 8);
  assert.ok(P.resolve(m, { gender: 'female' }).pitch < -8);
  assert.ok(P.resolve(f, { gender: 'male' }).formant > 1.1);
  assert.equal(P.resolve(f, { gender: 'male' }, 0).pitch, 0);
  for (const v of P.VOICES) {
    const r = P.resolve(v, { gender: 'male' });
    for (const [k, val] of Object.entries(r)) assert.ok(Number.isFinite(val), `${v.id}.${k}`);
  }
});

test('every human age bracket exists for both genders', () => {
  for (const g of ['male', 'female']) for (const a of P.AGES) {
    assert.ok(P.VOICES.some((v) => v.category === g && v.age === a.id), `${g}/${a.id}`);
  }
});
