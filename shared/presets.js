/*
 * Bini Voice — voice catalogue & parameter resolution.
 * Human voices are defined by an absolute target (fundamental f0 + formant
 * scale relative to an adult male vocal tract) so the result is the same
 * whoever speaks. Characters and custom voices use relative settings.
 */
(function (g) {
  'use strict';

  var FX_DEFAULTS = {
    whisper: 0, robot: 0, vibratoRate: 5, vibratoDepth: 0,
    bass: 0, presence: 0, treble: 0,
    distortion: 0, ring: 0, ringFreq: 60,
    tremolo: 0, tremoloRate: 6,
    echo: 0, echoTime: 0.28, reverb: 0,
    lowCut: 70, highCut: 16000, gain: 0
  };

  var AGES = [
    { id: 'child', label: 'Child', range: '6–11' },
    { id: 'teen', label: 'Teen', range: '13–17' },
    { id: 'young', label: 'Young adult', range: '18–29' },
    { id: 'adult', label: 'Adult', range: '30–54' },
    { id: 'senior', label: 'Senior', range: '65+' }
  ];

  var CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'female', label: 'Female' },
    { id: 'male', label: 'Male' },
    { id: 'character', label: 'Characters' },
    { id: 'custom', label: 'My voices' }
  ];

  // Reference speakers for the "my voice is" setting
  var SOURCES = {
    male: { f0: 120, formant: 1.0 },
    female: { f0: 210, formant: 1.16 }
  };

  var VOICES = [
    { id: 'original', name: 'Original', category: 'all', tagline: 'Your natural voice', colors: ['#64748b', '#94a3b8'], pitch: 0, formant: 1, fx: {} },

    // ---- Female ----
    { id: 'f-child', name: 'Lily', category: 'female', age: 'child', tagline: 'Bright, playful girl', colors: ['#f9a8d4', '#fbcfe8'], target: { f0: 285, formant: 1.30 }, fx: { presence: 2, treble: 1 } },
    { id: 'f-teen', name: 'Mia', category: 'female', age: 'teen', tagline: 'Light, energetic teen', colors: ['#fb7185', '#fda4af'], target: { f0: 238, formant: 1.21 }, fx: { presence: 1.5 } },
    { id: 'f-young', name: 'Sophia', category: 'female', age: 'young', tagline: 'Clear, airy and warm', colors: ['#e879f9', '#f0abfc'], target: { f0: 220, formant: 1.18 }, fx: { presence: 1, treble: 1.5, whisper: 0.04 } },
    { id: 'f-adult', name: 'Grace', category: 'female', age: 'adult', tagline: 'Confident, polished', colors: ['#c084fc', '#e9d5ff'], target: { f0: 200, formant: 1.15 }, fx: { presence: 1 } },
    { id: 'f-velvet', name: 'Velvet', category: 'female', age: 'adult', tagline: 'Low, smooth and sultry', colors: ['#a855f7', '#f472b6'], target: { f0: 172, formant: 1.12 }, fx: { bass: 2, whisper: 0.12, treble: -1 } },
    { id: 'f-senior', name: 'Margaret', category: 'female', age: 'senior', tagline: 'Gentle, seasoned grandma', colors: ['#fca5a5', '#fde68a'], target: { f0: 182, formant: 1.10 }, fx: { vibratoDepth: 0.22, vibratoRate: 5.5, whisper: 0.1, treble: -2.5, presence: -1 } },

    // ---- Male ----
    { id: 'm-child', name: 'Leo', category: 'male', age: 'child', tagline: 'Curious, cheerful boy', colors: ['#67e8f9', '#a5f3fc'], target: { f0: 268, formant: 1.27 }, fx: { presence: 1.5 } },
    { id: 'm-teen', name: 'Ethan', category: 'male', age: 'teen', tagline: 'Fresh, slightly raspy teen', colors: ['#38bdf8', '#7dd3fc'], target: { f0: 152, formant: 1.10 }, fx: { presence: 1 } },
    { id: 'm-young', name: 'Noah', category: 'male', age: 'young', tagline: 'Easy-going and natural', colors: ['#60a5fa', '#a5b4fc'], target: { f0: 128, formant: 1.03 }, fx: {} },
    { id: 'm-adult', name: 'James', category: 'male', age: 'adult', tagline: 'Rich, grounded baritone', colors: ['#818cf8', '#6366f1'], target: { f0: 110, formant: 0.98 }, fx: { bass: 2 } },
    { id: 'm-deep', name: 'Titan', category: 'male', age: 'adult', tagline: 'Deep cinematic bass', colors: ['#4f46e5', '#0ea5e9'], target: { f0: 84, formant: 0.90 }, fx: { bass: 4, presence: 1, reverb: 0.08 } },
    { id: 'm-senior', name: 'Arthur', category: 'male', age: 'senior', tagline: 'Wise, weathered grandpa', colors: ['#94a3b8', '#7dd3fc'], target: { f0: 116, formant: 0.95 }, fx: { vibratoDepth: 0.28, vibratoRate: 5, whisper: 0.08, treble: -3, bass: -1 } },

    // ---- Characters ----
    { id: 'c-robot', name: 'Robot', category: 'character', tagline: 'Metallic monotone android', colors: ['#2dd4bf', '#64748b'], pitch: 0, formant: 1, fx: { robot: 1, ring: 0.25, ringFreq: 70, presence: 3, distortion: 0.08 } },
    { id: 'c-alien', name: 'Alien', category: 'character', tagline: 'Warbling visitor', colors: ['#a3e635', '#22d3ee'], pitch: 4, formant: 1.35, fx: { vibratoDepth: 0.8, vibratoRate: 9, ring: 0.35, ringFreq: 33, reverb: 0.15 } },
    { id: 'c-demon', name: 'Demon', category: 'character', tagline: 'Growling underworld beast', colors: ['#ef4444', '#7f1d1d'], pitch: -8, formant: 0.72, fx: { distortion: 0.35, bass: 5, reverb: 0.25 } },
    { id: 'c-chipmunk', name: 'Chipmunk', category: 'character', tagline: 'Squeaky and speedy', colors: ['#fbbf24', '#fb923c'], pitch: 9, formant: 1.68, fx: { treble: 1 } },
    { id: 'c-giant', name: 'Giant', category: 'character', tagline: 'Booming from the mountains', colors: ['#a16207', '#57534e'], pitch: -6, formant: 0.78, fx: { bass: 3, reverb: 0.3, echo: 0.15, echoTime: 0.35 } },
    { id: 'c-whisper', name: 'Whisper', category: 'character', tagline: 'Secret, breathy hush', colors: ['#cbd5e1', '#a78bfa'], pitch: 0, formant: 1, fx: { whisper: 1, treble: 3, presence: 2, gain: 3 } },
    { id: 'c-ghost', name: 'Ghost', category: 'character', tagline: 'Haunting, hollow echo', colors: ['#e0e7ff', '#6366f1'], pitch: 3, formant: 1.1, fx: { whisper: 0.55, reverb: 0.5, tremolo: 0.3, tremoloRate: 4, echo: 0.2 } },
    { id: 'c-radio', name: 'Radio', category: 'character', tagline: 'Old AM broadcast', colors: ['#f59e0b', '#78350f'], pitch: 0, formant: 1, fx: { lowCut: 450, highCut: 3200, distortion: 0.18, presence: 4, gain: 2 } },
    { id: 'c-cathedral', name: 'Cathedral', category: 'character', tagline: 'Vast stone hall', colors: ['#fde68a', '#a78bfa'], pitch: 0, formant: 1, fx: { reverb: 0.65, echo: 0.12, echoTime: 0.42 } },
    { id: 'c-angel', name: 'Angel', category: 'character', tagline: 'Soft, heavenly shimmer', colors: ['#fef3c7', '#f0abfc'], pitch: 5, formant: 1.2, fx: { reverb: 0.4, whisper: 0.12, vibratoDepth: 0.15, vibratoRate: 5, treble: 2 } }
  ];

  function sourceFromSettings(src) {
    src = src || {};
    if (src.mode === 'calibrated' && src.f0 > 50) {
      var t = Math.max(0, Math.min(1, (src.f0 - 140) / 60));
      return { f0: src.f0, formant: 1 + 0.16 * t };
    }
    return SOURCES[src.gender] || SOURCES.male;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /** Turn a voice definition into concrete engine parameters. */
  function resolve(voice, sourceSettings, intensity) {
    voice = voice || VOICES[0];
    var t = intensity == null ? 1 : Math.max(0, Math.min(1.5, intensity));
    var src = sourceFromSettings(sourceSettings);
    var pitch, formant;
    if (voice.target) {
      pitch = 12 * Math.log(voice.target.f0 / src.f0) / Math.LN2;
      formant = voice.target.formant / src.formant;
    } else {
      pitch = voice.pitch || 0;
      formant = voice.formant || 1;
    }
    var fx = {}, k;
    for (k in FX_DEFAULTS) fx[k] = FX_DEFAULTS[k];
    for (k in voice.fx || {}) fx[k] = voice.fx[k];

    var out = {
      pitch: pitch * t,
      formant: Math.exp(Math.log(formant) * t),
      whisper: Math.min(1, fx.whisper * t),
      robot: fx.robot && t >= 0.4 ? 1 : 0,
      vibratoRate: fx.vibratoRate,
      vibratoDepth: fx.vibratoDepth * t,
      bass: fx.bass * t, presence: fx.presence * t, treble: fx.treble * t,
      distortion: Math.min(1, fx.distortion * t),
      ring: Math.min(1, fx.ring * t), ringFreq: fx.ringFreq,
      tremolo: Math.min(1, fx.tremolo * t), tremoloRate: fx.tremoloRate,
      echo: Math.min(0.9, fx.echo * t), echoTime: fx.echoTime,
      reverb: Math.min(1, fx.reverb * t),
      lowCut: Math.exp(lerp(Math.log(FX_DEFAULTS.lowCut), Math.log(fx.lowCut), Math.min(1, t))),
      highCut: Math.exp(lerp(Math.log(FX_DEFAULTS.highCut), Math.log(fx.highCut), Math.min(1, t))),
      gain: fx.gain * t
    };
    return out;
  }

  function findVoice(id, customVoices) {
    var all = VOICES.concat(customVoices || []);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return VOICES[0];
  }

  /** Express any voice as relative custom-voice sliders (for "start from"). */
  function toCustom(voice, sourceSettings) {
    var r = resolve(voice, sourceSettings, 1), fx = {};
    for (var k in FX_DEFAULTS) fx[k] = r[k] != null ? r[k] : FX_DEFAULTS[k];
    fx.vibratoDepth = r.vibratoDepth;
    return { pitch: Math.round(r.pitch * 10) / 10, formant: Math.round(r.formant * 100) / 100, fx: fx };
  }

  g.BiniPresets = {
    VOICES: VOICES, AGES: AGES, CATEGORIES: CATEGORIES, SOURCES: SOURCES,
    FX_DEFAULTS: FX_DEFAULTS, resolve: resolve, findVoice: findVoice, toCustom: toCustom
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
