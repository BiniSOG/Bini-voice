/*
 * Bini Voice — Web Audio engine.
 * input → filters → VoiceShifter (worklet / ScriptProcessor) → EQ → grit
 *       → ring-mod → tremolo → [dry + echo + reverb] → compressor → output
 */
(function (g) {
  'use strict';

  function makeImpulse(ctx, seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function driveCurve(amount) {
    var n = 2048, curve = new Float32Array(n), k = amount * 60 + 1;
    for (var i = 0; i < n; i++) {
      var x = (i * 2) / n - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    return curve;
  }

  function VoiceEngine(ctx, opts) {
    opts = opts || {};
    this.ctx = ctx;
    this.workletUrl = opts.workletUrl || null;
    this.fftSize = opts.fftSize || 1024;
    this.params = null;
    this.mode = 'none';
  }

  VoiceEngine.prototype.init = async function () {
    var c = this.ctx, self = this;
    var n = function (type) { return c['create' + type](); };

    this.input = n('Gain');
    this.hp = n('BiquadFilter'); this.hp.type = 'highpass'; this.hp.frequency.value = 70; this.hp.Q.value = 0.7;
    this.lp = n('BiquadFilter'); this.lp.type = 'lowpass'; this.lp.frequency.value = 16000; this.lp.Q.value = 0.7;

    // --- Pitch / formant core ---
    var core = null;
    if (this.workletUrl && c.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      try {
        await c.audioWorklet.addModule(this.workletUrl);
        core = new AudioWorkletNode(c, 'bini-voice', {
          numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
          channelCount: 1, channelCountMode: 'explicit', channelInterpretation: 'speakers',
          processorOptions: { fftSize: this.fftSize }
        });
        this._send = function (p) { core.port.postMessage(p); };
        this.mode = 'worklet';
      } catch (e) {
        console.warn('[Bini Voice] AudioWorklet unavailable, using fallback', e);
        core = null;
      }
    }
    if (!core) {
      if (!g.BiniDSP) throw new Error('BiniDSP not loaded');
      var dsp = new g.BiniDSP.VoiceShifter(c.sampleRate, this.fftSize);
      core = c.createScriptProcessor(1024, 1, 1);
      core.onaudioprocess = function (e) {
        dsp.process(e.inputBuffer.getChannelData(0), e.outputBuffer.getChannelData(0));
      };
      this._send = function (p) { dsp.setParams(p); };
      this.mode = 'script';
    }
    this.core = core;

    // --- Tone ---
    this.bass = n('BiquadFilter'); this.bass.type = 'lowshelf'; this.bass.frequency.value = 220;
    this.presence = n('BiquadFilter'); this.presence.type = 'peaking'; this.presence.frequency.value = 2800; this.presence.Q.value = 0.9;
    this.treble = n('BiquadFilter'); this.treble.type = 'highshelf'; this.treble.frequency.value = 6500;

    // --- Grit ---
    this.shaper = n('WaveShaper'); this.shaper.oversample = '2x';
    this.distDry = n('Gain'); this.distWet = n('Gain'); this.distWet.gain.value = 0;
    this.distOut = n('Gain');

    // --- Ring modulation ---
    this.ringDry = n('Gain'); this.ringMod = n('Gain'); this.ringMod.gain.value = 0;
    this.ringWet = n('Gain'); this.ringWet.gain.value = 0;
    this.ringOsc = n('Oscillator'); this.ringOsc.frequency.value = 60; this.ringOsc.start();
    this.ringOsc.connect(this.ringMod.gain);
    this.ringOut = n('Gain');

    // --- Tremolo ---
    this.trem = n('Gain');
    this.tremLfo = n('Oscillator'); this.tremLfo.frequency.value = 6; this.tremLfo.start();
    this.tremDepth = n('Gain'); this.tremDepth.gain.value = 0;
    this.tremLfo.connect(this.tremDepth); this.tremDepth.connect(this.trem.gain);

    // --- Space ---
    this.sum = n('Gain');
    this.echoSend = n('Gain'); this.echoSend.gain.value = 0;
    this.delay = c.createDelay(2); this.delay.delayTime.value = 0.28;
    this.feedback = n('Gain'); this.feedback.gain.value = 0.35;
    this.echoTone = n('BiquadFilter'); this.echoTone.type = 'lowpass'; this.echoTone.frequency.value = 4500;
    this.revSend = n('Gain'); this.revSend.gain.value = 0;
    this.convolver = n('Convolver'); this.convolver.buffer = makeImpulse(c, 2.6, 3);

    this.comp = n('DynamicsCompressor');
    this.comp.threshold.value = -18; this.comp.knee.value = 12; this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.004; this.comp.release.value = 0.18;
    this.output = n('Gain');

    // --- Wiring ---
    this.input.connect(this.hp); this.hp.connect(this.lp); this.lp.connect(core);
    core.connect(this.bass); this.bass.connect(this.presence); this.presence.connect(this.treble);
    this.treble.connect(this.distDry); this.treble.connect(this.shaper); this.shaper.connect(this.distWet);
    this.distDry.connect(this.distOut); this.distWet.connect(this.distOut);
    this.distOut.connect(this.ringDry); this.distOut.connect(this.ringMod); this.ringMod.connect(this.ringWet);
    this.ringDry.connect(this.ringOut); this.ringWet.connect(this.ringOut);
    this.ringOut.connect(this.trem);
    this.trem.connect(this.sum);
    this.trem.connect(this.echoSend); this.echoSend.connect(this.delay);
    this.delay.connect(this.echoTone); this.echoTone.connect(this.feedback); this.feedback.connect(this.delay);
    this.echoTone.connect(this.sum);
    this.trem.connect(this.revSend); this.revSend.connect(this.convolver); this.convolver.connect(this.sum);
    this.sum.connect(this.comp); this.comp.connect(this.output);

    this.latencySamples = this.fftSize;
    if (this.params) this.setParams(this.params, true);
    return this;
  };

  function ramp(param, value, ctx, instant) {
    if (instant) { param.value = value; return; }
    param.setTargetAtTime(value, ctx.currentTime, 0.03);
  }

  VoiceEngine.prototype.setParams = function (p, instant) {
    this.params = p;
    if (!this.core) return;
    var c = this.ctx, db = function (v) { return Math.pow(10, v / 20); };
    this._send({
      pitch: p.pitch, formant: p.formant, whisper: p.whisper, robot: p.robot,
      vibratoRate: p.vibratoRate, vibratoDepth: p.vibratoDepth
    });
    ramp(this.hp.frequency, p.lowCut || 70, c, instant);
    ramp(this.lp.frequency, Math.min(p.highCut || 16000, c.sampleRate / 2 - 100), c, instant);
    ramp(this.bass.gain, p.bass || 0, c, instant);
    ramp(this.presence.gain, p.presence || 0, c, instant);
    ramp(this.treble.gain, p.treble || 0, c, instant);

    var d = p.distortion || 0;
    if (d !== this._lastDrive) { this.shaper.curve = driveCurve(d); this._lastDrive = d; }
    ramp(this.distWet.gain, d * 0.8, c, instant);
    ramp(this.distDry.gain, 1 - d * 0.6, c, instant);

    var r = p.ring || 0;
    ramp(this.ringWet.gain, r * 1.4, c, instant);
    ramp(this.ringDry.gain, 1 - r * 0.85, c, instant);
    ramp(this.ringOsc.frequency, p.ringFreq || 60, c, instant);

    var t = p.tremolo || 0;
    ramp(this.trem.gain, 1 - t * 0.5, c, instant);
    ramp(this.tremDepth.gain, t * 0.5, c, instant);
    ramp(this.tremLfo.frequency, p.tremoloRate || 6, c, instant);

    ramp(this.echoSend.gain, p.echo || 0, c, instant);
    ramp(this.delay.delayTime, p.echoTime || 0.28, c, instant);
    ramp(this.feedback.gain, 0.25 + (p.echo || 0) * 0.35, c, instant);
    ramp(this.revSend.gain, (p.reverb || 0) * 0.9, c, instant);
    ramp(this.sum.gain, 1 - (p.reverb || 0) * 0.25, c, instant);

    ramp(this.output.gain, db(p.gain || 0), c, instant);
  };

  VoiceEngine.prototype.disconnect = function () {
    try { this.output.disconnect(); } catch (e) {}
    try { this.ringOsc.stop(); this.tremLfo.stop(); } catch (e) {}
  };

  /** Render an AudioBuffer offline through a fresh engine. Returns an AudioBuffer. */
  VoiceEngine.render = async function (buffer, params, opts) {
    opts = opts || {};
    var sr = buffer.sampleRate, tail = Math.round(sr * 2.5);
    var fft = opts.fftSize || 2048;
    var Offline = g.OfflineAudioContext || g.webkitOfflineAudioContext;
    var ctx = new Offline(1, buffer.length + tail + fft, sr);
    var engine = new VoiceEngine(ctx, { workletUrl: opts.workletUrl, fftSize: fft });
    engine.params = params;
    await engine.init();
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(engine.input);
    engine.output.connect(ctx.destination);
    src.start();
    var rendered = await ctx.startRendering();
    // Remove algorithmic latency and silent tail
    var data = rendered.getChannelData(0), skip = fft;
    var end = data.length;
    while (end > skip + sr * 0.2 && Math.abs(data[end - 1]) < 1e-4) end--;
    var out = new AudioBuffer({ length: Math.max(1, end - skip), sampleRate: sr, numberOfChannels: 1 });
    out.copyToChannel(data.subarray(skip, end), 0);
    return out;
  };

  /** Encode an AudioBuffer as a 16-bit PCM WAV Blob. */
  VoiceEngine.toWav = function (buffer) {
    var ch = buffer.numberOfChannels, len = buffer.length, sr = buffer.sampleRate;
    var bytes = 44 + len * ch * 2, ab = new ArrayBuffer(bytes), v = new DataView(ab);
    var w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, bytes - 8, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true);
    v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * ch * 2, true);
    var chans = [];
    for (var c = 0; c < ch; c++) chans.push(buffer.getChannelData(c));
    var o = 44;
    for (var i = 0; i < len; i++) {
      for (c = 0; c < ch; c++) {
        var s = Math.max(-1, Math.min(1, chans[c][i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
      }
    }
    return new Blob([ab], { type: 'audio/wav' });
  };

  g.BiniVoiceEngine = VoiceEngine;
})(typeof globalThis !== 'undefined' ? globalThis : self);
