/*
 * Bini Voice — page hook (MAIN world).
 * Wraps navigator.mediaDevices.getUserMedia so any site that asks for the
 * microphone receives the transformed voice instead.
 */
(function () {
  'use strict';
  if (window.__biniVoiceHooked) return;
  window.__biniVoiceHooked = true;

  var md = navigator.mediaDevices;
  if (!md || !md.getUserMedia) return;

  var cfg = null, waiters = [], sessions = new Set();
  var P = window.BiniPresets, Engine = window.BiniVoiceEngine;

  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data || e.data.source !== 'bini-voice-ext' || e.data.type !== 'config') return;
    cfg = e.data;
    waiters.splice(0).forEach(function (fn) { fn(); });
    sessions.forEach(function (s) { s.engine.setParams(params()); });
  });
  window.postMessage({ source: 'bini-voice-page', type: 'hello' }, '*');

  function ready() {
    if (cfg) return Promise.resolve();
    return new Promise(function (res) { waiters.push(res); setTimeout(res, 1000); });
  }

  function params() {
    var s = cfg.settings;
    // When switched off mid-call we keep the graph but make it neutral
    if (!s.enabled) return P.resolve(P.findVoice('original'), s.source, 0);
    return P.resolve(P.findVoice(s.voiceId, cfg.custom), s.source, s.intensity);
  }

  function report() { window.postMessage({ source: 'bini-voice-page', type: 'active', count: sessions.size }, '*'); }

  async function wrap(stream) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    var ctx = new Ctx({ latencyHint: 'interactive' });
    var engine = new Engine(ctx, { workletUrl: cfg.workletUrl, fftSize: 1024 });
    engine.params = params();
    await engine.init();
    var src = ctx.createMediaStreamSource(stream);
    src.connect(engine.input);
    var dest = ctx.createMediaStreamDestination();
    engine.output.connect(dest);

    var inTrack = stream.getAudioTracks()[0];
    var outTrack = dest.stream.getAudioTracks()[0];
    var session = { engine: engine, ctx: ctx };

    // Make the processed track look like the real microphone to the page
    try {
      Object.defineProperty(outTrack, 'label', { get: function () { return inTrack.label; } });
      outTrack.getSettings = function () { return inTrack.getSettings(); };
      if (inTrack.getCapabilities) outTrack.getCapabilities = function () { return inTrack.getCapabilities(); };
      outTrack.getConstraints = function () { return inTrack.getConstraints(); };
      outTrack.applyConstraints = function (c) { return inTrack.applyConstraints(c); };
    } catch (e) {}

    var stopOut = outTrack.stop.bind(outTrack);
    outTrack.stop = function () {
      stopOut();
      inTrack.stop();
      sessions.delete(session);
      report();
      try { engine.disconnect(); ctx.close(); } catch (e) {}
    };
    inTrack.addEventListener('ended', function () { outTrack.stop(); });

    if (ctx.state === 'suspended') {
      ctx.resume();
      var resume = function () { ctx.resume(); };
      ['pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, resume, { once: true, capture: true }); });
    }

    sessions.add(session);
    report();
    return new MediaStream([outTrack].concat(stream.getVideoTracks()));
  }

  var original = md.getUserMedia.bind(md);
  md.getUserMedia = async function (constraints) {
    var stream = await original(constraints);
    if (!constraints || !constraints.audio || !stream.getAudioTracks().length) return stream;
    await ready();
    if (!cfg || !cfg.settings || !cfg.settings.enabled || !P || !Engine) return stream;
    try {
      return await wrap(stream);
    } catch (e) {
      console.warn('[Bini Voice] passthrough:', e);
      return stream;
    }
  };
})();
