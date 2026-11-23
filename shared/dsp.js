/*
 * Bini Voice — DSP core
 * Formant-preserving phase-vocoder pitch shifter with spectral effects.
 * Classic script (no modules) so it can run in an AudioWorklet, a page's
 * MAIN world (Chrome extension) and a ScriptProcessor fallback alike.
 */
(function (g) {
  'use strict';

  var TWO_PI = Math.PI * 2;

  function FFT(n) {
    this.n = n;
    this.cos = new Float64Array(n / 2);
    this.sin = new Float64Array(n / 2);
    for (var i = 0; i < n / 2; i++) {
      this.cos[i] = Math.cos((TWO_PI * i) / n);
      this.sin[i] = Math.sin((TWO_PI * i) / n);
    }
    var bits = Math.round(Math.log(n) / Math.LN2);
    this.rev = new Uint32Array(n);
    for (var j = 0; j < n; j++) {
      var r = 0;
      for (var b = 0; b < bits; b++) r |= ((j >> b) & 1) << (bits - 1 - b);
      this.rev[j] = r;
    }
  }

  /** In-place complex FFT. inverse=true computes the unscaled inverse. */
  FFT.prototype.transform = function (re, im, inverse) {
    var n = this.n, rev = this.rev, cos = this.cos, sin = this.sin;
    var s = inverse ? -1 : 1;
    for (var i = 0; i < n; i++) {
      var r = rev[i];
      if (r > i) {
        var t = re[i]; re[i] = re[r]; re[r] = t;
        t = im[i]; im[i] = im[r]; im[r] = t;
      }
    }
    for (var size = 2; size <= n; size <<= 1) {
      var half = size >> 1, step = n / size;
      for (var start = 0; start < n; start += size) {
        for (var j = start, k = 0; j < start + half; j++, k += step) {
          var l = j + half;
          var c = cos[k], sn = sin[k] * s;
          var tre = re[l] * c + im[l] * sn;
          var tim = im[l] * c - re[l] * sn;
          re[l] = re[j] - tre; im[l] = im[j] - tim;
          re[j] += tre; im[j] += tim;
        }
      }
    }
  };

  function wrap(p) {
    p = p % TWO_PI;
    if (p > Math.PI) p -= TWO_PI;
    else if (p < -Math.PI) p += TWO_PI;
    return p;
  }

  /**
   * VoiceShifter — streaming, sample-in/sample-out.
   * Pitch: phase-locked (Laroche–Dolson) time-stretch by p, then resampling by p.
   * Formant: cepstral envelope is divided out and re-applied warped.
   * params: pitch (semitones), formant (ratio, 1 = unchanged),
   *         whisper (0..1), robot (0|1), vibratoRate (Hz), vibratoDepth (semitones)
   */
  var RING = 8192, RMASK = RING - 1;

  function VoiceShifter(sampleRate, fftSize, osamp) {
    var N = fftSize || 1024;
    this.sr = sampleRate;
    this.N = N;
    this.osamp = osamp || 4;
    this.half = N / 2;
    this.step = N / this.osamp;
    this.latency = N - this.step;
    this.expct = (TWO_PI * this.step) / N;
    this.fft = new FFT(N);

    this.inFIFO = new Float32Array(N);
    this.accum = new Float64Array(2 * N + 8);
    this.wacc = new Float64Array(2 * N + 8);
    this.re = new Float64Array(N);
    this.im = new Float64Array(N);
    this.cre = new Float64Array(N);
    this.cim = new Float64Array(N);

    var H = this.half + 1;
    this.lastPhase = new Float64Array(H);
    this.synPhase = new Float64Array(H);
    this.anaMag = new Float64Array(H);
    this.anaFreq = new Float64Array(H);
    this.anaPh = new Float64Array(H);
    this.env = new Float64Array(H);
    this.peaks = new Int32Array(H);

    this.win = new Float64Array(N);
    for (var k = 0; k < N; k++) this.win[k] = 0.5 - 0.5 * Math.cos((TWO_PI * k) / N);
    // Cepstral lifter (~1.1 ms) — keeps the vocal-tract envelope, drops harmonics
    this.lifter = Math.max(8, Math.min(this.half - 1, Math.round(sampleRate * 0.0011)));

    // Stretched-signal ring buffer read by the resampler
    this.ring = new Float32Array(RING);
    this.wpos = this.step + 8;
    this.rpos = 0;
    this.rate = 1;

    this.rover = this.latency;
    this.vibPhase = 0;

    this.pitch = 1;
    this.formant = 1;
    this.whisper = 0;
    this.robot = 0;
    this.vibRate = 0;
    this.vibDepth = 0;
  }

  VoiceShifter.prototype.setParams = function (p) {
    if (!p) return;
    if (p.pitch != null) this.pitch = Math.pow(2, Math.max(-24, Math.min(12, p.pitch)) / 12);
    if (p.formant != null) this.formant = Math.max(0.4, Math.min(2.5, p.formant));
    if (p.whisper != null) this.whisper = Math.max(0, Math.min(1, p.whisper));
    if (p.robot != null) this.robot = p.robot ? 1 : 0;
    if (p.vibratoRate != null) this.vibRate = p.vibratoRate;
    if (p.vibratoDepth != null) this.vibDepth = p.vibratoDepth;
  };

  VoiceShifter.prototype.process = function (input, output) {
    var inFIFO = this.inFIFO, latency = this.latency, N = this.N, ring = this.ring;
    for (var i = 0, n = input.length; i < n; i++) {
      inFIFO[this.rover++] = input[i];
      if (this.rover >= N) {
        this.rover = latency;
        this._frame();
      }
      // Cubic (Catmull-Rom) read from the stretched stream
      var pos = this.rpos, ip = Math.floor(pos), f = pos - ip;
      var y0 = ring[(ip - 1) & RMASK], y1 = ring[ip & RMASK], y2 = ring[(ip + 1) & RMASK], y3 = ring[(ip + 2) & RMASK];
      output[i] = y1 + 0.5 * f * (y2 - y0 + f * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f * (3 * (y1 - y2) + y3 - y0)));
      pos += this.rate;
      if (pos >= RING) pos -= RING;
      this.rpos = pos;
    }
  };

  VoiceShifter.prototype._computeEnvelope = function () {
    var N = this.N, half = this.half, cre = this.cre, cim = this.cim;
    var mag = this.anaMag, env = this.env, L = this.lifter, k;
    for (k = 0; k <= half; k++) cre[k] = Math.log(mag[k] + 1e-9);
    for (k = 1; k < half; k++) cre[N - k] = cre[k];
    cim.fill(0);
    this.fft.transform(cre, cim, false);
    for (k = 0; k < N; k++) { cre[k] /= N; cim[k] = 0; }
    for (k = L; k <= N - L; k++) cre[k] = 0;
    this.fft.transform(cre, cim, false);
    for (k = 0; k <= half; k++) env[k] = Math.exp(cre[k]);
  };

  VoiceShifter.prototype._envAt = function (x) {
    if (x < 0) return this.env[0];
    if (x >= this.half) return 0;
    var i = x | 0, f = x - i;
    return this.env[i] * (1 - f) + this.env[i + 1] * f;
  };

  VoiceShifter.prototype._frame = function () {
    var N = this.N, half = this.half, osamp = this.osamp, Ha = this.step;
    var re = this.re, im = this.im, win = this.win, inFIFO = this.inFIFO;
    var expct = this.expct, k;

    for (k = 0; k < N; k++) { re[k] = inFIFO[k] * win[k]; im[k] = 0; }
    this.fft.transform(re, im, false);

    var semis = 0;
    if (this.vibDepth > 0 && this.vibRate > 0) {
      semis = this.vibDepth * Math.sin(this.vibPhase);
      this.vibPhase = (this.vibPhase + (TWO_PI * this.vibRate * Ha) / this.sr) % TWO_PI;
    }
    var Hs = Math.max(1, Math.round(Ha * this.pitch * Math.pow(2, semis / 12)));
    var pe = Hs / Ha;

    var anaMag = this.anaMag, anaFreq = this.anaFreq, anaPh = this.anaPh, lastPhase = this.lastPhase;
    for (k = 0; k <= half; k++) {
      var r = re[k], m = im[k];
      var ph = Math.atan2(m, r);
      anaMag[k] = Math.sqrt(r * r + m * m);
      anaFreq[k] = k + (wrap(ph - lastPhase[k] - k * expct) * osamp) / TWO_PI;
      anaPh[k] = ph;
      lastPhase[k] = ph;
    }

    // After resampling by pe, formants would scale by pe; pre-warp so they land at `formant`
    var warp = pe / this.formant;
    var needEnv = Math.abs(warp - 1) > 1e-3;
    if (needEnv) this._computeEnvelope();
    var env = this.env, MAXG = 16;

    var synPhase = this.synPhase, wh = this.whisper, robot = this.robot;
    if (Hs === Ha && !robot && wh <= 0) {
      for (k = 0; k <= half; k++) synPhase[k] = anaPh[k];
    } else {
      var peaks = this.peaks, np = 0, maxMag = 0;
      for (k = 0; k <= half; k++) if (anaMag[k] > maxMag) maxMag = anaMag[k];
      var thr = maxMag * 1e-5;
      for (k = 1; k < half; k++) {
        var a = anaMag[k];
        if (a > thr && a > anaMag[k - 1] && a >= anaMag[k + 1]) peaks[np++] = k;
      }
      if (np === 0) {
        for (k = 0; k <= half; k++) synPhase[k] = wrap(synPhase[k] + anaFreq[k] * expct * pe);
      } else {
        // Identity phase locking: peaks advance at their true frequency,
        // the bins in each peak's region keep their analysis offset.
        var lo = 0;
        for (var pi = 0; pi < np; pi++) {
          var kp = peaks[pi];
          var hi = pi === np - 1 ? half : (kp + peaks[pi + 1]) >> 1;
          var pph = robot ? 0 : synPhase[kp] + anaFreq[kp] * expct * pe;
          if (wh > 0) pph += wh * (Math.random() * 2 - 1) * Math.PI;
          for (k = lo; k <= hi; k++) {
            var off = anaPh[k] - anaPh[kp];
            if (wh > 0 && k !== kp) off += wh * (Math.random() * 2 - 1) * Math.PI;
            synPhase[k] = k === kp ? wrap(pph) : wrap(pph + off);
          }
          lo = hi + 1;
        }
      }
    }

    for (k = 0; k <= half; k++) {
      var mg = anaMag[k];
      if (needEnv) mg *= Math.min(this._envAt(k * warp) / (env[k] + 1e-12), MAXG);
      re[k] = mg * Math.cos(synPhase[k]);
      im[k] = mg * Math.sin(synPhase[k]);
    }
    im[0] = 0; im[half] = 0;
    for (k = 1; k < half; k++) { re[N - k] = re[k]; im[N - k] = -im[k]; }
    this.fft.transform(re, im, true);

    // Overlap-add with hop Hs, normalised by the accumulated window energy
    var accum = this.accum, wacc = this.wacc, invN = 1 / N;
    for (k = 0; k < N; k++) {
      accum[k] += win[k] * re[k] * invN;
      wacc[k] += win[k] * win[k];
    }
    var ring = this.ring, wpos = this.wpos;
    for (k = 0; k < Hs; k++) {
      var w = wacc[k];
      ring[wpos & RMASK] = w > 0.05 ? accum[k] / w : accum[k] / 0.05;
      wpos++;
    }
    this.wpos = wpos & RMASK;
    accum.copyWithin(0, Hs); accum.fill(0, accum.length - Hs);
    wacc.copyWithin(0, Hs); wacc.fill(0, wacc.length - Hs);
    inFIFO.copyWithin(0, Ha);
    this.rate = pe;
  };

  /** Simple autocorrelation pitch detector (Hz or 0 if unvoiced). */
  function detectPitch(buf, sampleRate) {
    var n = buf.length, rms = 0, i;
    for (i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < 0.01) return 0;
    var minLag = Math.floor(sampleRate / 500), maxLag = Math.floor(sampleRate / 60);
    var corr = new Float64Array(maxLag + 2), best = 0, bestLag = 0;
    for (var lag = minLag; lag <= maxLag && lag < n / 2; lag++) {
      var sum = 0, e1 = 0, e2 = 0;
      for (i = 0; i < n - lag; i++) {
        sum += buf[i] * buf[i + lag];
        e1 += buf[i] * buf[i];
        e2 += buf[i + lag] * buf[i + lag];
      }
      corr[lag] = sum / Math.sqrt(e1 * e2 + 1e-12);
      if (corr[lag] > best) best = corr[lag];
    }
    // Prefer the shortest period that is nearly as good (avoids octave errors)
    for (lag = minLag + 1; lag < maxLag && lag < n / 2 - 1; lag++) {
      if (corr[lag] >= 0.92 * best && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) { bestLag = lag; best = corr[lag]; break; }
    }
    if (!bestLag) return 0;
    return best > 0.8 ? sampleRate / bestLag : 0;
  }

  g.BiniDSP = { FFT: FFT, VoiceShifter: VoiceShifter, detectPitch: detectPitch };
})(typeof globalThis !== 'undefined' ? globalThis : self);
