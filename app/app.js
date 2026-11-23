/* Bini Voice — application */
(function () {
  'use strict';

  var P = window.BiniPresets, Store = window.BiniStore, Engine = window.BiniVoiceEngine, DSP = window.BiniDSP;
  var IS_EXT = typeof chrome !== 'undefined' && !!(chrome.runtime && chrome.runtime.id);
  var WORKLET_URL = 'lib/worklet.js';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------------------------------------------------------------- icons
  var ICONS = {
    mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8"/>',
    headphones: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z"/>',
    power: '<path d="M12 3v8"/><path d="M6.4 6.4a8 8 0 1 0 11.2 0"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.5M8.2 13.2l7.6 4.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>',
    wand: '<path d="M15 4V2M15 10V8M11 6h2M17 6h2M4 20l10-10M18.5 2.5l1 1"/>',
    wave: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/>',
    voice: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10"/>',
    robot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/>',
    alien: '<path d="M12 3c-4.4 0-8 3.2-8 7.5C4 15 8.5 21 12 21s8-6 8-10.5C20 6.2 16.4 3 12 3z"/><path d="M7.5 11.5c1.5 0 3 1 3 2.5M16.5 11.5c-1.5 0-3 1-3 2.5"/>',
    flame: '<path d="M12 21c4 0 7-2.8 7-6.8 0-4.2-4-6.7-4.5-11.2C11 5.5 9.5 8 10 11c-1.5-.5-2.5-2-2.5-3.5C6 9 5 11.5 5 14.2 5 18.2 8 21 12 21z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    mountain: '<path d="M3 20l6-11 4 7 2-3 6 7z"/>',
    feather: '<path d="M20 4c-7 0-12 5-12 12v4M8 16h7M11 12h6M4 20L20 4"/>',
    ghost: '<path d="M5 21V10a7 7 0 0 1 14 0v11l-2.5-2-2.3 2-2.2-2-2.2 2-2.3-2z"/><path d="M9.5 10h.01M14.5 10h.01"/>',
    radio: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l10-5M15 14h.01M7 12h4M7 16h4"/><circle cx="16" cy="14" r="2.5"/>',
    church: '<path d="M12 2v4M10 4h4M6 21V11l6-5 6 5v10M3 21h18M10 21v-4a2 2 0 0 1 4 0v4"/>',
    halo: '<ellipse cx="12" cy="5" rx="6" ry="2"/><path d="M8 21c0-5 1.8-9 4-9s4 4 4 9"/>',
    squirrel: '<path d="M18 4c-3 0-5 2.5-5 5.5V12c0 3-2 5-5 5"/><circle cx="7" cy="13" r="3"/><path d="M9 20h8a3 3 0 0 0 0-6"/>'
  };
  function icon(name) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.voice) + '</svg>'; }
  function hydrateIcons(root) { $$('[data-icon]', root).forEach(function (el) { el.innerHTML = icon(el.getAttribute('data-icon')); el.removeAttribute('data-icon'); }); }

  var CHAR_ICON = {
    'c-robot': 'robot', 'c-alien': 'alien', 'c-demon': 'flame', 'c-chipmunk': 'squirrel', 'c-giant': 'mountain',
    'c-whisper': 'feather', 'c-ghost': 'ghost', 'c-radio': 'radio', 'c-cathedral': 'church', 'c-angel': 'halo', original: 'mic'
  };
  var SWATCHES = [
    ['#8a6bff', '#ff6fae'], ['#f472b6', '#fbbf24'], ['#38bdf8', '#818cf8'], ['#34d399', '#22d3ee'],
    ['#f97316', '#ef4444'], ['#a3e635', '#14b8a6'], ['#e879f9', '#6366f1'], ['#94a3b8', '#475569']
  ];

  // ---------------------------------------------------------------- state
  var S = {
    settings: null, custom: [], category: 'all', age: 'all', view: 'voices',
    live: false, monitoring: false, recording: false, recStart: 0,
    studio: null, editingId: null
  };
  var A = {}; // audio graph

  function voices() { return P.VOICES.concat(S.custom); }
  function currentVoice() { return P.findVoice(S.settings.voiceId, S.custom); }
  function studioVoice() {
    var d = S.studio;
    return { id: '__studio', name: d.name || 'Custom', category: 'custom', colors: d.colors, pitch: d.pitch, formant: d.formant, fx: d.fx };
  }
  function activeVoice() { return S.view === 'studio' ? studioVoice() : currentVoice(); }
  function activeParams() { return P.resolve(activeVoice(), S.settings.source, S.view === 'studio' ? 1 : S.settings.intensity); }
  function saveSettings() { return Store.set('bini.settings', S.settings); }
  function saveCustom() { return Store.set('bini.customVoices', S.custom); }

  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  function busy(on, text) { $('#busy').hidden = !on; if (text) $('#busyText').textContent = text; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ageLabel(id) { var a = P.AGES.filter(function (x) { return x.id === id; })[0]; return a ? a.label : ''; }

  function avatarHTML(v, cls) {
    var c = v.colors || SWATCHES[0];
    var inner = CHAR_ICON[v.id] ? icon(CHAR_ICON[v.id]) : v.category === 'custom' && !v.name ? icon('wand') : '<span>' + esc((v.name || '?').charAt(0).toUpperCase()) + '</span>';
    return '<div class="avatar ' + (cls || '') + '" style="--c1:' + c[0] + ';--c2:' + c[1] + '">' + inner + '</div>';
  }

  // ---------------------------------------------------------------- theme
  function applyTheme() {
    var t = S.settings.theme;
    if (t === 'system') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    $('meta[name="theme-color"]').setAttribute('content', t === 'light' ? '#f6f4fb' : '#0b0a12');
  }
  function applyVoiceColors(v) {
    var c = v.colors || SWATCHES[0], r = document.documentElement.style;
    r.setProperty('--v1', c[0]); r.setProperty('--v2', c[1]);
  }

  // ---------------------------------------------------------------- stage
  function renderStage() {
    var v = activeVoice();
    applyVoiceColors(v);
    $('#nowName').textContent = v.name || 'Custom';
    $('#nowLabel').textContent = S.view === 'studio' ? 'Previewing' : 'Now speaking as';
    $('#nowTag').textContent = S.view === 'studio' ? describeCustom(v) : (v.tagline || describeCustom(v));
    $('#orbIcon').innerHTML = icon(S.live ? 'wave' : 'mic');
    $('#orb').setAttribute('aria-label', S.live ? 'Live — tap to stop' : 'Start live voice');
    var st = $('#stage');
    st.classList.toggle('live', S.live);
    st.classList.toggle('recording', S.recording);
    $('#statusText').textContent = S.recording ? 'Recording ' + fmtTime((Date.now() - S.recStart) / 1000) : S.live ? 'Live' : 'Tap the orb to start';
    $('#monitorBtn').setAttribute('aria-pressed', String(S.monitoring));
    $('#recBtn').setAttribute('aria-pressed', String(S.recording));
    $('#recLabel').textContent = S.recording ? 'Stop rec' : 'Record';
    $('#stopBtn').disabled = !S.live;
    $('#stopBtn').style.opacity = S.live ? 1 : 0.45;
    $('#engineTag').textContent = S.live && A.engine ? (A.engine.mode === 'worklet' ? 'AudioWorklet' : 'Compat mode') + ' · ' + Math.round(A.ctx.sampleRate / 1000) + ' kHz' : '';
    var iv = $('#intensity');
    iv.value = S.settings.intensity; setRangeFill(iv);
    $('#intensityOut').textContent = Math.round(S.settings.intensity * 100) + '%';
    $('.intensity').style.opacity = S.view === 'studio' ? 0.4 : 1;
    iv.disabled = S.view === 'studio';
  }
  function describeCustom(v) {
    var r = P.resolve(v, S.settings.source, 1);
    var sign = r.pitch >= 0 ? '+' : '';
    return 'Pitch ' + sign + r.pitch.toFixed(1) + ' st · Timbre ' + r.formant.toFixed(2) + '×';
  }
  function fmtTime(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function setRangeFill(el) {
    var p = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--p', p + '%');
  }

  function renderSourceChip() {
    var s = S.settings.source;
    var label = s.mode === 'calibrated' && s.f0 ? 'My voice · ' + Math.round(s.f0) + ' Hz' : 'My voice · ' + (s.gender === 'female' ? 'Female' : 'Male');
    $('#sourceChip').innerHTML = icon('mic') + esc(label);
  }

  // ---------------------------------------------------------------- voices view
  function renderTabs() {
    $('#catTabs').innerHTML = P.CATEGORIES.map(function (c) {
      return '<button role="tab" data-cat="' + c.id + '" class="' + (S.category === c.id ? 'active' : '') + '">' + c.label + '</button>';
    }).join('');
    var showAges = S.category === 'all' || S.category === 'male' || S.category === 'female';
    var chips = [{ id: 'all', label: 'All ages' }].concat(P.AGES).concat([{ id: 'fav', label: '♥ Favorites' }]);
    $('#ageChips').innerHTML = chips.map(function (a) {
      return '<button class="chip ' + (S.age === a.id ? 'active' : '') + '" data-age="' + a.id + '">' + a.label + (a.range ? ' <span style="opacity:.6">' + a.range + '</span>' : '') + '</button>';
    }).join('');
    $('#ageChips').style.display = showAges ? '' : 'none';
  }

  function filteredVoices() {
    var favs = S.settings.favorites || [];
    return voices().filter(function (v) {
      if (S.category === 'custom') return v.category === 'custom';
      if (S.category !== 'all' && v.category !== S.category) return false;
      var agesApply = S.category === 'all' || S.category === 'male' || S.category === 'female';
      if (agesApply && S.age === 'fav') return favs.indexOf(v.id) >= 0;
      if (agesApply && S.age !== 'all') return v.age === S.age;
      return true;
    });
  }

  function voiceCardHTML(v, opts) {
    opts = opts || {};
    var c = v.colors || SWATCHES[0];
    var sel = !opts.picker && v.id === S.settings.voiceId;
    var fav = (S.settings.favorites || []).indexOf(v.id) >= 0;
    var meta = [];
    if (v.category === 'female' || v.category === 'male') meta.push(v.category === 'female' ? 'Female' : 'Male');
    if (v.age) meta.push(ageLabel(v.age));
    if (v.category === 'character') meta.push('Character');
    if (v.category === 'custom') meta.push('Custom');
    return '<button class="voice-card ' + (sel ? 'selected' : '') + '" data-voice="' + esc(v.id) + '" style="--c1:' + c[0] + ';--c2:' + c[1] + '" aria-pressed="' + sel + '">' +
      avatarHTML(v) +
      (opts.picker ? '' : '<span class="fav ' + (fav ? 'on' : '') + '" data-fav="' + esc(v.id) + '" role="button" aria-label="Favorite">' + icon('heart') + '</span>') +
      (!opts.picker && v.category === 'custom' ? '<span class="fav edit-btn" data-edit="' + esc(v.id) + '" role="button" aria-label="Edit">' + icon('edit') + '</span>' : '') +
      '<div><div class="vc-name">' + esc(v.name) + '</div><div class="vc-tag">' + esc(v.tagline || describeCustom(v)) + '</div></div>' +
      '<div class="vc-meta">' + meta.map(function (m) { return '<span class="pill">' + m + '</span>'; }).join('') + '</div>' +
      '</button>';
  }

  function renderVoices() {
    var list = filteredVoices();
    $('#voiceCount').textContent = list.length + ' voices';
    var html = list.map(function (v, i) { return voiceCardHTML(v).replace('class="voice-card', 'style="animation-delay:' + Math.min(i * 25, 300) + 'ms" class="voice-card'); }).join('');
    if (!list.length) {
      html = S.category === 'custom'
        ? '<div class="empty"><strong>No custom voices yet</strong>Design your own signature sound in the Studio.<br><button class="btn primary small" data-goto="studio">' + icon('sparkle') + 'Open Studio</button></div>'
        : '<div class="empty"><strong>Nothing here</strong>Try another filter.</div>';
    }
    $('#voiceGrid').innerHTML = html;
  }

  function selectVoice(id) {
    S.settings.voiceId = id;
    saveSettings();
    renderVoices(); renderStage(); pushParams();
    if (!S.live) toast(currentVoice().name + ' selected — tap the orb to hear it');
  }

  // ---------------------------------------------------------------- studio
  var STUDIO_GROUPS = [
    { title: 'Voice', icon: 'voice', items: [
      { key: 'pitch', label: 'Pitch', min: -12, max: 12, step: 0.1, fmt: function (v) { return (v > 0 ? '+' : '') + v.toFixed(1) + ' st'; } },
      { key: 'formant', label: 'Timbre', min: 0.6, max: 1.6, step: 0.01, fmt: function (v) { return v.toFixed(2) + '×'; } },
      { key: 'whisper', fx: true, label: 'Breathiness', min: 0, max: 1, step: 0.01, fmt: pct },
      { key: 'robot', fx: true, label: 'Robotic monotone', toggle: true }
    ] },
    { title: 'Motion', icon: 'wave', items: [
      { key: 'vibratoDepth', fx: true, label: 'Vibrato', min: 0, max: 1.5, step: 0.01, fmt: function (v) { return v.toFixed(2) + ' st'; } },
      { key: 'vibratoRate', fx: true, label: 'Vibrato rate', min: 1, max: 12, step: 0.1, fmt: hz },
      { key: 'tremolo', fx: true, label: 'Tremolo', min: 0, max: 1, step: 0.01, fmt: pct },
      { key: 'tremoloRate', fx: true, label: 'Tremolo rate', min: 1, max: 14, step: 0.1, fmt: hz }
    ] },
    { title: 'Tone', icon: 'sliders', items: [
      { key: 'bass', fx: true, label: 'Bass', min: -12, max: 12, step: 0.5, fmt: dbf },
      { key: 'presence', fx: true, label: 'Presence', min: -12, max: 12, step: 0.5, fmt: dbf },
      { key: 'treble', fx: true, label: 'Air', min: -12, max: 12, step: 0.5, fmt: dbf },
      { key: 'lowCut', fx: true, label: 'Low cut', min: 20, max: 800, step: 5, fmt: hz },
      { key: 'highCut', fx: true, label: 'High cut', min: 2000, max: 16000, step: 100, fmt: function (v) { return (v / 1000).toFixed(1) + ' kHz'; } }
    ] },
    { title: 'Texture', icon: 'flame', items: [
      { key: 'distortion', fx: true, label: 'Grit', min: 0, max: 1, step: 0.01, fmt: pct },
      { key: 'ring', fx: true, label: 'Metallic', min: 0, max: 1, step: 0.01, fmt: pct },
      { key: 'ringFreq', fx: true, label: 'Metal tone', min: 10, max: 400, step: 1, fmt: hz }
    ] },
    { title: 'Space', icon: 'church', items: [
      { key: 'reverb', fx: true, label: 'Reverb', min: 0, max: 1, step: 0.01, fmt: pct },
      { key: 'echo', fx: true, label: 'Echo', min: 0, max: 0.9, step: 0.01, fmt: pct },
      { key: 'echoTime', fx: true, label: 'Echo time', min: 0.05, max: 1, step: 0.01, fmt: function (v) { return Math.round(v * 1000) + ' ms'; } },
      { key: 'gain', fx: true, label: 'Output', min: -12, max: 12, step: 0.5, fmt: dbf }
    ] }
  ];
  function pct(v) { return Math.round(v * 100) + '%'; }
  function hz(v) { return (v < 100 ? v.toFixed(1) : Math.round(v)) + ' Hz'; }
  function dbf(v) { return (v > 0 ? '+' : '') + v.toFixed(1) + ' dB'; }

  function freshStudio(from) {
    var base = P.toCustom(from || P.findVoice('original'), S.settings.source);
    return { name: 'My Voice', colors: SWATCHES[0].slice(), pitch: base.pitch, formant: base.formant, fx: base.fx };
  }

  function renderStudioShell() {
    $('#studioBase').innerHTML = '<option value="">— Neutral —</option>' + voices().filter(function (v) { return v.id !== 'original'; }).map(function (v) {
      return '<option value="' + esc(v.id) + '">' + esc(v.name) + (v.age ? ' · ' + ageLabel(v.age) : '') + (v.category === 'character' ? ' · Character' : '') + '</option>';
    }).join('');
    $('#studioGroups').innerHTML = STUDIO_GROUPS.map(function (g) {
      return '<div class="card group"><div class="group-head">' + icon(g.icon) + g.title + '</div>' + g.items.map(function (it) {
        if (it.toggle) return '<div class="toggle-row"><span>' + it.label + '</span><label class="switch"><input type="checkbox" data-skey="' + it.key + '"><span></span></label></div>';
        return '<div class="slider-row"><label for="s-' + it.key + '">' + it.label + '</label><input type="range" id="s-' + it.key + '" data-skey="' + it.key + '" min="' + it.min + '" max="' + it.max + '" step="' + it.step + '"><output id="o-' + it.key + '"></output></div>';
      }).join('') + '</div>';
    }).join('');
    $('#swatches').innerHTML = SWATCHES.map(function (c, i) {
      return '<button class="swatch" data-swatch="' + i + '" style="--c1:' + c[0] + ';--c2:' + c[1] + '" aria-label="Color ' + (i + 1) + '"></button>';
    }).join('');
  }

  function itemDef(key) {
    for (var g = 0; g < STUDIO_GROUPS.length; g++) for (var i = 0; i < STUDIO_GROUPS[g].items.length; i++) if (STUDIO_GROUPS[g].items[i].key === key) return STUDIO_GROUPS[g].items[i];
  }
  function studioGet(key) { var d = itemDef(key); return d.fx ? S.studio.fx[key] : S.studio[key]; }
  function studioSet(key, v) { var d = itemDef(key); if (d.fx) S.studio.fx[key] = v; else S.studio[key] = v; }

  function renderStudio() {
    var d = S.studio;
    $('#studioTitle').textContent = S.editingId ? 'Edit voice' : 'Create a voice';
    $('#studioDelete').hidden = !S.editingId;
    if (document.activeElement !== $('#studioName')) $('#studioName').value = d.name;
    $('#studioAvatar').outerHTML = avatarHTML({ name: d.name, colors: d.colors, category: 'custom' }, 'xl').replace('class="avatar', 'id="studioAvatar" class="avatar');
    $$('[data-skey]').forEach(function (el) {
      var k = el.getAttribute('data-skey'), v = studioGet(k), def = itemDef(k);
      if (def.toggle) { el.checked = !!v; return; }
      el.value = v; setRangeFill(el);
      $('#o-' + k).textContent = def.fmt(Number(v));
    });
    $$('[data-swatch]').forEach(function (el) {
      var c = SWATCHES[+el.getAttribute('data-swatch')];
      el.classList.toggle('active', c[0] === d.colors[0] && c[1] === d.colors[1]);
    });
  }

  function saveStudio() {
    var d = S.studio, name = (d.name || '').trim() || 'My Voice';
    var v = { id: S.editingId || 'u-' + Date.now().toString(36), name: name, category: 'custom', colors: d.colors.slice(), pitch: d.pitch, formant: d.formant, fx: JSON.parse(JSON.stringify(d.fx)) };
    v.tagline = describeCustom(v);
    var idx = S.custom.findIndex(function (x) { return x.id === v.id; });
    if (idx >= 0) S.custom[idx] = v; else S.custom.push(v);
    saveCustom();
    S.settings.voiceId = v.id; saveSettings();
    S.editingId = v.id;
    toast('“' + name + '” saved to My voices');
    renderStudioShell(); renderStudio(); renderVoices(); renderStage();
  }

  function editCustom(id) {
    var v = S.custom.filter(function (x) { return x.id === id; })[0];
    if (!v) return;
    S.editingId = id;
    S.studio = { name: v.name, colors: v.colors.slice(), pitch: v.pitch, formant: v.formant, fx: Object.assign({}, P.FX_DEFAULTS, v.fx) };
    goto('studio');
  }

  // ---------------------------------------------------------------- audio
  function fftSize() { return S.settings.quality === 'studio' ? 2048 : 1024; }

  async function startLive() {
    if (S.live) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Microphone not available in this browser'); return; }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: S.settings.echoCancellation, noiseSuppression: S.settings.noiseSuppression, autoGainControl: true, channelCount: 1 }
      });
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ctx = new Ctx({ latencyHint: 'interactive' });
      var engine = new Engine(ctx, { workletUrl: WORKLET_URL, fftSize: fftSize() });
      engine.params = activeParams();
      await engine.init();
      var src = ctx.createMediaStreamSource(stream);
      src.connect(engine.input);
      var analyser = ctx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.75;
      engine.output.connect(analyser);
      var inAnalyser = ctx.createAnalyser(); inAnalyser.fftSize = 2048; src.connect(inAnalyser);
      var monitor = ctx.createGain(); monitor.gain.value = S.monitoring ? 1 : 0;
      engine.output.connect(monitor); monitor.connect(ctx.destination);
      var dest = ctx.createMediaStreamDestination(); engine.output.connect(dest);
      var rawDest = ctx.createMediaStreamDestination(); src.connect(rawDest);
      if (ctx.state === 'suspended') await ctx.resume();
      A = { stream: stream, ctx: ctx, engine: engine, src: src, analyser: analyser, inAnalyser: inAnalyser, monitor: monitor, dest: dest, rawDest: rawDest };
      S.live = true;
      renderStage();
    } catch (e) {
      console.error(e);
      toast(e && e.name === 'NotAllowedError' ? 'Microphone permission denied' : 'Could not start audio: ' + (e.message || e));
    }
  }

  function stopLive() {
    if (S.recording) stopRecording();
    if (A.stream) A.stream.getTracks().forEach(function (t) { t.stop(); });
    if (A.engine) A.engine.disconnect();
    if (A.ctx) A.ctx.close();
    A = {}; S.live = false;
    renderStage();
  }

  function pushParams() { if (A.engine) A.engine.setParams(activeParams()); }

  function setMonitoring(on) {
    S.monitoring = on;
    if (A.monitor) A.monitor.gain.setTargetAtTime(on ? 1 : 0, A.ctx.currentTime, 0.02);
    if (on) toast('Monitoring on — use headphones to avoid feedback');
    renderStage();
  }

  // ---------------------------------------------------------------- visualizer
  var vizData = new Uint8Array(256), tick = 0;
  function drawViz() {
    var cv = $('#viz'), g = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    g.clearRect(0, 0, W, H);
    var cs = getComputedStyle(document.documentElement);
    var c1 = cs.getPropertyValue('--v1').trim() || '#c084fc', c2 = cs.getPropertyValue('--v2').trim() || '#f472b6';
    var bars = 72, inner = 150, level = 0;
    if (A.analyser) A.analyser.getByteFrequencyData(vizData);
    tick += 0.016;
    var grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    g.strokeStyle = grad; g.lineCap = 'round'; g.lineWidth = 5;
    for (var i = 0; i < bars; i++) {
      var a = (i / bars) * Math.PI * 2 - Math.PI / 2;
      var m = i < bars / 2 ? i : bars - i; // mirror for symmetry
      var v = A.analyser ? vizData[2 + Math.floor(m * 1.6)] / 255 : 0;
      level += v;
      var idle = 0.06 + 0.04 * Math.sin(tick * 2 + i * 0.35);
      var len = 8 + (A.analyser ? v * 95 : idle * 60);
      g.globalAlpha = A.analyser ? 0.35 + v * 0.65 : 0.25;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      g.lineTo(cx + Math.cos(a) * (inner + len), cy + Math.sin(a) * (inner + len));
      g.stroke();
    }
    g.globalAlpha = 1;
    if (S.live) document.documentElement.style.setProperty('--level', (1 + Math.min(0.12, (level / bars) * 0.35)).toFixed(3));
    if (S.recording && Math.floor(tick * 4) % 4 === 0) $('#statusText').textContent = 'Recording ' + fmtTime((Date.now() - S.recStart) / 1000);
    requestAnimationFrame(drawViz);
  }

  // ---------------------------------------------------------------- recording & library (IndexedDB)
  var DB = {
    open: function () {
      if (DB._p) return DB._p;
      DB._p = new Promise(function (res, rej) {
        var r = indexedDB.open('bini-voice', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('recordings', { keyPath: 'id' }); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
      return DB._p;
    },
    tx: function (mode, fn) {
      return DB.open().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction('recordings', mode), st = t.objectStore('recordings'), out = fn(st);
          t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
          t.onerror = function () { rej(t.error); };
        });
      });
    },
    all: function () { return DB.tx('readonly', function (s) { return s.getAll(); }); },
    put: function (o) { return DB.tx('readwrite', function (s) { s.put(o); }); },
    del: function (id) { return DB.tx('readwrite', function (s) { s.delete(id); }); }
  };

  function pickMime() {
    var types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < types.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(types[i])) return types[i];
    return '';
  }

  async function startRecording() {
    if (!S.live) await startLive();
    if (!S.live) return;
    var mime = pickMime();
    if (mime === null) { toast('Recording is not supported in this browser'); return; }
    var opts = mime ? { mimeType: mime } : undefined;
    var rec = new MediaRecorder(A.dest.stream, opts), raw = new MediaRecorder(A.rawDest.stream, opts);
    var chunks = [], rawChunks = [];
    rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
    raw.ondataavailable = function (e) { if (e.data.size) rawChunks.push(e.data); };
    var voice = activeVoice(), started = Date.now(), done = 0;
    var finish = function () {
      if (++done < 2) return;
      var type = rec.mimeType || mime || 'audio/webm';
      var item = {
        id: 'r-' + started.toString(36), name: voice.name + ' take', voiceId: voice.id, voiceName: voice.name,
        colors: voice.colors, created: started, duration: (Date.now() - started) / 1000,
        blob: new Blob(chunks, { type: type }), raw: new Blob(rawChunks, { type: type })
      };
      // Store the voiced take as WAV so it can be shared instantly (Telegram, WhatsApp…)
      decodeBlob(item.blob).then(function (buf) { item.blob = Engine.toWav(buf); item.duration = buf.duration; })
        .catch(function () {})
        .then(function () { return DB.put(item); })
        .then(function () { toast('Saved to Library'); renderLibrary(); });
    };
    rec.onstop = finish; raw.onstop = finish;
    rec.start(250); raw.start(250);
    A.rec = rec; A.rawRec = raw;
    S.recording = true; S.recStart = started;
    renderStage();
  }
  function stopRecording() {
    if (A.rec && A.rec.state !== 'inactive') A.rec.stop();
    if (A.rawRec && A.rawRec.state !== 'inactive') A.rawRec.stop();
    S.recording = false;
    renderStage();
  }

  var player = new Audio(), playingId = null, urls = {};
  player.addEventListener('timeupdate', function () {
    var bar = playingId && $('[data-rec="' + playingId + '"] .rec-progress i');
    if (bar && player.duration && isFinite(player.duration)) bar.style.width = (player.currentTime / player.duration) * 100 + '%';
  });
  player.addEventListener('ended', function () { playingId = null; renderLibraryButtons(); });

  async function renderLibrary() {
    var items = [];
    try { items = await DB.all(); } catch (e) { console.warn(e); }
    items.sort(function (a, b) { return b.created - a.created; });
    renderLibrary.items = items;
    var el = $('#recList');
    if (!items.length) {
      el.innerHTML = '<div class="empty"><strong>Your takes live here</strong>Record from the live stage, or import any audio file and give it a new voice.</div>';
      return;
    }
    el.innerHTML = items.map(function (r) {
      var c = r.colors || SWATCHES[0];
      var d = new Date(r.created);
      return '<div class="rec-item" data-rec="' + r.id + '" style="--c1:' + c[0] + ';--c2:' + c[1] + '">' +
        '<button class="play" data-play="' + r.id + '" aria-label="Play">' + icon('play') + '</button>' +
        '<div style="min-width:0"><div class="rec-title">' + esc(r.name) + '</div><div class="rec-meta">' + esc(r.voiceName) + ' · ' + fmtTime(r.duration) + ' · ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + '</div><div class="rec-progress"><i></i></div></div>' +
        '<div class="rec-actions">' +
        '<button class="icon-btn" data-revoice="' + r.id + '" aria-label="Change voice" title="Change voice">' + icon('wand') + '</button>' +
        (navigator.share ? '<button class="icon-btn" data-share="' + r.id + '" aria-label="Share" title="Share to Telegram, WhatsApp…">' + icon('share') + '</button>' : '') +
        '<button class="icon-btn" data-dl="' + r.id + '" aria-label="Download" title="Download WAV">' + icon('download') + '</button>' +
        '<button class="icon-btn" data-del="' + r.id + '" aria-label="Delete" title="Delete">' + icon('trash') + '</button>' +
        '</div></div>';
    }).join('');
    renderLibraryButtons();
  }
  function renderLibraryButtons() {
    $$('[data-play]').forEach(function (b) {
      var on = b.getAttribute('data-play') === playingId && !player.paused;
      b.innerHTML = icon(on ? 'pause' : 'play');
    });
  }
  function recById(id) { return (renderLibrary.items || []).filter(function (r) { return r.id === id; })[0]; }
  function blobUrl(r) { if (!urls[r.id]) urls[r.id] = URL.createObjectURL(r.blob); return urls[r.id]; }

  function togglePlay(id) {
    var r = recById(id); if (!r) return;
    if (playingId === id && !player.paused) { player.pause(); }
    else { if (playingId !== id) player.src = blobUrl(r); playingId = id; player.play(); }
    renderLibraryButtons();
  }

  async function decodeBlob(blob) {
    var Ctx = window.AudioContext || window.webkitAudioContext, ctx = new Ctx();
    try { return await ctx.decodeAudioData(await blob.arrayBuffer()); } finally { ctx.close(); }
  }

  async function downloadRec(id) {
    var r = recById(id); if (!r) return;
    busy(true, 'Preparing WAV…');
    try {
      var wav = r.blob.type === 'audio/wav' ? r.blob : Engine.toWav(await decodeBlob(r.blob));
      var a = document.createElement('a');
      a.href = URL.createObjectURL(wav);
      a.download = fileName(r);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    } catch (e) { toast('Could not export: ' + e.message); }
    busy(false);
  }

  function fileName(r) { return (r.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'bini-voice') + '.wav'; }

  async function shareRec(id) {
    var r = recById(id); if (!r) return;
    if (r.blob.type !== 'audio/wav') {
      // Older take: convert once, then the next tap shares instantly
      busy(true, 'Preparing audio…');
      try { r.blob = Engine.toWav(await decodeBlob(r.blob)); await DB.put(r); } catch (e) { busy(false); toast('Could not prepare audio'); return; }
      busy(false);
    }
    var file = new File([r.blob], fileName(r), { type: 'audio/wav' });
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) { downloadRec(id); return; }
    try {
      await navigator.share({ files: [file], title: r.name });
    } catch (e) {
      if (e && e.name === 'NotAllowedError') toast('Ready — tap Share again');
    }
  }

  async function renderWithVoice(sourceBlob, voice, name) {
    busy(true, 'Giving it ' + voice.name + '’s voice…');
    try {
      var buf = await decodeBlob(sourceBlob);
      var out = await Engine.render(buf, P.resolve(voice, S.settings.source, voice.id === S.settings.voiceId ? S.settings.intensity : 1), { workletUrl: WORKLET_URL, fftSize: 2048 });
      var item = {
        id: 'r-' + Date.now().toString(36), name: name, voiceId: voice.id, voiceName: voice.name, colors: voice.colors,
        created: Date.now(), duration: out.duration, blob: Engine.toWav(out), raw: sourceBlob
      };
      await DB.put(item);
      await renderLibrary();
      toast('Rendered with ' + voice.name);
    } catch (e) { console.error(e); toast('Could not process audio: ' + (e.message || e)); }
    busy(false);
  }

  function openVoicePicker(title, onPick) {
    $('#sheetTitle').textContent = title;
    $('#sheetBody').innerHTML = '<div class="grid">' + voices().map(function (v) { return voiceCardHTML(v, { picker: true }); }).join('') + '</div>';
    $('#sheet').hidden = false;
    openVoicePicker.cb = onPick;
  }
  function closeSheet() { $('#sheet').hidden = true; openVoicePicker.cb = null; }

  // ---------------------------------------------------------------- calibration
  async function calibrate() {
    var wasLive = S.live;
    if (!S.live) await startLive();
    if (!S.live) return;
    var btn = $('#calibBtn'), out = $('#calibOut'), buf = new Float32Array(A.inAnalyser.fftSize), found = [];
    btn.disabled = true;
    var t0 = Date.now(), dur = 4000;
    await new Promise(function (res) {
      (function step() {
        A.inAnalyser.getFloatTimeDomainData(buf);
        var f = DSP.detectPitch(buf, A.ctx.sampleRate);
        if (f > 60 && f < 450) found.push(f);
        out.textContent = 'Keep talking naturally… ' + Math.ceil((dur - (Date.now() - t0)) / 1000) + 's';
        if (Date.now() - t0 < dur) setTimeout(step, 40); else res();
      })();
    });
    btn.disabled = false;
    if (!wasLive) stopLive();
    if (found.length < 8) { out.textContent = 'Didn’t catch enough voice — try again a little louder.'; return; }
    found.sort(function (a, b) { return a - b; });
    var f0 = found[Math.floor(found.length / 2)];
    S.settings.source = { mode: 'calibrated', gender: f0 > 165 ? 'female' : 'male', f0: f0 };
    saveSettings();
    out.textContent = 'Your average pitch: ' + Math.round(f0) + ' Hz';
    renderSettings(); renderSourceChip(); renderVoices(); renderStage(); pushParams();
    toast('Calibrated — voices now tuned to you');
  }

  // ---------------------------------------------------------------- settings view
  function renderSettings() {
    var s = S.settings;
    $$('#sourceSeg button').forEach(function (b) {
      var k = b.getAttribute('data-src');
      b.classList.toggle('active', s.source.mode === 'calibrated' ? k === 'calibrated' : k === s.source.gender);
      if (k === 'calibrated') b.disabled = !s.source.f0;
      if (k === 'calibrated') b.style.opacity = s.source.f0 ? 1 : 0.4;
    });
    if (s.source.f0 && !$('#calibOut').textContent) $('#calibOut').textContent = 'Last calibration: ' + Math.round(s.source.f0) + ' Hz';
    $$('#qualitySeg button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-q') === s.quality); });
    $$('#themeSeg button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-theme-opt') === s.theme); });
    $('#nsToggle').checked = !!s.noiseSuppression;
    $('#ecToggle').checked = !!s.echoCancellation;
    $('#extGroup').hidden = !IS_EXT;
    $('#getExt').hidden = IS_EXT;
    $('#extEnabled').checked = !!s.enabled;
  }

  // ---------------------------------------------------------------- navigation
  function goto(view) {
    if (view === 'studio' && !S.studio) S.studio = freshStudio();
    S.view = view;
    $('#app').setAttribute('data-view', view);
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + view); });
    $$('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-view') === view); });
    if (view === 'studio') renderStudio();
    if (view === 'library') renderLibrary();
    if (view === 'settings') renderSettings();
    renderStage(); pushParams();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------------------------------------------------------------- events
  function bind() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-goto]');
      if (t) { goto(t.getAttribute('data-goto')); return; }
      t = e.target.closest('[data-close]');
      if (t) { closeSheet(); return; }
    });

    $('#tabbar').addEventListener('click', function (e) {
      var t = e.target.closest('.tab'); if (t) goto(t.getAttribute('data-view'));
    });
    $('#catTabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]'); if (!b) return;
      S.category = b.getAttribute('data-cat'); S.age = 'all'; renderTabs(); renderVoices();
    });
    $('#ageChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-age]'); if (!b) return;
      S.age = b.getAttribute('data-age'); renderTabs(); renderVoices();
    });
    $('#voiceGrid').addEventListener('click', function (e) {
      var f = e.target.closest('[data-fav]');
      if (f) {
        e.stopPropagation();
        var id = f.getAttribute('data-fav'), favs = S.settings.favorites || (S.settings.favorites = []), i = favs.indexOf(id);
        if (i >= 0) favs.splice(i, 1); else favs.push(id);
        saveSettings(); renderVoices(); return;
      }
      var ed = e.target.closest('[data-edit]');
      if (ed) { e.stopPropagation(); editCustom(ed.getAttribute('data-edit')); return; }
      var c = e.target.closest('[data-voice]'); if (c) selectVoice(c.getAttribute('data-voice'));
    });

    $('#orb').addEventListener('click', function () { S.live ? stopLive() : startLive(); });
    $('#stopBtn').addEventListener('click', stopLive);
    $('#monitorBtn').addEventListener('click', function () { setMonitoring(!S.monitoring); });
    $('#recBtn').addEventListener('click', function () { S.recording ? stopRecording() : startRecording(); });
    var iv = $('#intensity');
    iv.addEventListener('input', function () {
      S.settings.intensity = +iv.value; setRangeFill(iv);
      $('#intensityOut').textContent = Math.round(iv.value * 100) + '%';
      pushParams();
    });
    iv.addEventListener('change', saveSettings);

    // Studio
    $('#studioGroups').addEventListener('input', function (e) {
      var el = e.target, k = el.getAttribute('data-skey'); if (!k) return;
      var def = itemDef(k);
      studioSet(k, def.toggle ? (el.checked ? 1 : 0) : +el.value);
      if (!def.toggle) { setRangeFill(el); $('#o-' + k).textContent = def.fmt(+el.value); }
      $('#nowTag').textContent = describeCustom(studioVoice());
      pushParams();
    });
    $('#studioName').addEventListener('input', function (e) { S.studio.name = e.target.value; $('#nowName').textContent = e.target.value || 'Custom'; renderStudioAvatar(); });
    $('#swatches').addEventListener('click', function (e) {
      var b = e.target.closest('[data-swatch]'); if (!b) return;
      S.studio.colors = SWATCHES[+b.getAttribute('data-swatch')].slice();
      renderStudio(); renderStage();
    });
    $('#studioBase').addEventListener('change', function (e) {
      var v = e.target.value ? P.findVoice(e.target.value, S.custom) : null;
      var keep = { name: S.studio.name, colors: S.studio.colors };
      S.studio = freshStudio(v);
      S.studio.name = keep.name; S.studio.colors = v && v.colors ? v.colors.slice() : keep.colors;
      renderStudio(); renderStage(); pushParams();
    });
    $('#studioReset').addEventListener('click', function () {
      S.studio = freshStudio(); S.editingId = null; $('#studioBase').value = '';
      $('#studioName').value = S.studio.name; renderStudio(); renderStage(); pushParams();
    });
    $('#studioSave').addEventListener('click', saveStudio);
    $('#studioDelete').addEventListener('click', function () {
      if (!S.editingId || !confirm('Delete this voice?')) return;
      S.custom = S.custom.filter(function (v) { return v.id !== S.editingId; });
      if (S.settings.voiceId === S.editingId) S.settings.voiceId = 'original';
      S.editingId = null; saveCustom(); saveSettings();
      S.studio = freshStudio(); renderStudioShell(); renderStudio(); renderVoices(); renderStage();
      toast('Voice deleted');
    });

    // Library
    $('#recList').addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-play]'))) togglePlay(b.getAttribute('data-play'));
      else if ((b = e.target.closest('[data-share]'))) shareRec(b.getAttribute('data-share'));
      else if ((b = e.target.closest('[data-dl]'))) downloadRec(b.getAttribute('data-dl'));
      else if ((b = e.target.closest('[data-del]'))) {
        var id = b.getAttribute('data-del');
        if (playingId === id) { player.pause(); playingId = null; }
        DB.del(id).then(renderLibrary);
      } else if ((b = e.target.closest('[data-revoice]'))) {
        var r = recById(b.getAttribute('data-revoice'));
        openVoicePicker('Give this take a new voice', function (v) { renderWithVoice(r.raw || r.blob, v, v.name + ' remix'); });
      }
    });
    $('#importFile').addEventListener('change', function (e) {
      var f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      openVoicePicker('Which voice for “' + f.name + '”?', function (v) { renderWithVoice(f, v, f.name.replace(/\.[^.]+$/, '') + ' · ' + v.name); });
    });
    $('#sheetBody').addEventListener('click', function (e) {
      var c = e.target.closest('[data-voice]'); if (!c) return;
      var cb = openVoicePicker.cb, v = P.findVoice(c.getAttribute('data-voice'), S.custom);
      closeSheet(); if (cb) cb(v);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

    // Settings
    $('#sourceSeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-src]'); if (!b || b.disabled) return;
      var k = b.getAttribute('data-src'), s = S.settings.source;
      S.settings.source = k === 'calibrated' ? { mode: 'calibrated', gender: s.gender, f0: s.f0 } : { mode: 'preset', gender: k, f0: s.f0 };
      saveSettings(); renderSettings(); renderSourceChip(); renderVoices(); renderStage(); pushParams();
    });
    $('#calibBtn').addEventListener('click', calibrate);
    $('#qualitySeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]'); if (!b) return;
      S.settings.quality = b.getAttribute('data-q'); saveSettings(); renderSettings();
      if (S.live) { stopLive(); startLive(); }
    });
    $('#themeSeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-theme-opt]'); if (!b) return;
      S.settings.theme = b.getAttribute('data-theme-opt'); saveSettings(); applyTheme(); renderSettings();
    });
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);
    $('#nsToggle').addEventListener('change', function (e) { S.settings.noiseSuppression = e.target.checked; saveSettings(); });
    $('#ecToggle').addEventListener('change', function (e) { S.settings.echoCancellation = e.target.checked; saveSettings(); });
    $('#extEnabled').addEventListener('change', function (e) { S.settings.enabled = e.target.checked; saveSettings(); });

    // Keep in sync with the extension popup / other tabs
    Store.subscribe(function (key, val) {
      if (key === 'bini.settings' && JSON.stringify(val) !== JSON.stringify(S.settings)) {
        S.settings = val; applyTheme(); renderTabs(); renderVoices(); renderStage(); renderSourceChip(); pushParams();
        if (S.view === 'settings') renderSettings();
      } else if (key === 'bini.customVoices' && JSON.stringify(val) !== JSON.stringify(S.custom)) {
        S.custom = val || []; renderVoices();
      }
    });
  }
  function renderStudioAvatar() {
    var a = $('#studioAvatar span'); if (a) a.textContent = (S.studio.name || '?').charAt(0).toUpperCase();
  }

  // ---------------------------------------------------------------- boot
  // ---------------------------------------------------------------- install (PWA)
  var installEvt = null;
  var isStandalone = function () { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; };
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function dismissedInstall() { try { return localStorage.getItem('bini.installDismissed') === '1'; } catch (e) { return false; } }
  function showInstallBanner() {
    if (IS_EXT || isStandalone() || dismissedInstall()) return;
    $('#installBanner').hidden = false;
  }
  function installHelp() {
    var steps;
    if (isIOS) {
      steps = ['Open this page in <b>Safari</b> (other iPhone browsers can’t install apps)', 'Tap the <b>Share</b> button at the bottom', 'Scroll and tap <b>Add to Home Screen</b>, then <b>Add</b>'];
    } else if (/android/i.test(navigator.userAgent)) {
      steps = ['Tap the <b>⋮</b> menu at the top right of Chrome', 'Tap <b>Add to home screen</b> (or <b>Install app</b>)', 'Choose <b>Install</b> — not “Create shortcut” — and confirm', 'Don’t see Install? Reload this page once and try again'];
    } else {
      steps = ['Click the <b>install icon</b> at the right end of Chrome’s address bar', 'Or open the <b>⋮</b> menu → <b>Cast, save and share</b> → <b>Install page as app</b>', 'Click <b>Install</b>'];
    }
    $('#sheetTitle').textContent = 'Install Bini Voice';
    $('#sheetBody').innerHTML = '<ol class="steps">' + steps.map(function (t) { return '<li><span>' + t + '</span></li>'; }).join('') + '</ol>';
    $('#sheet').hidden = false;
    openVoicePicker.cb = null;
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
    showInstallBanner();
  });
  window.addEventListener('appinstalled', function () {
    installEvt = null; $('#installBanner').hidden = true; toast('Installed — find Bini Voice on your home screen');
  });
  function bindInstall() {
    $('#installBtn').addEventListener('click', async function () {
      if (installEvt) {
        installEvt.prompt();
        var r = await installEvt.userChoice;
        installEvt = null;
        if (r && r.outcome === 'accepted') $('#installBanner').hidden = true;
      } else {
        installHelp();
      }
    });
    $('#installClose').addEventListener('click', function () {
      $('#installBanner').hidden = true;
      try { localStorage.setItem('bini.installDismissed', '1'); } catch (e) {}
    });
    // Show on mobile even if Chrome hasn't offered its prompt yet (falls back to instructions)
    if (/android|iphone|ipad|ipod/i.test(navigator.userAgent) || isIOS) showInstallBanner();
  }

  async function boot() {
    S.settings = await Store.get('bini.settings');
    S.custom = (await Store.get('bini.customVoices')) || [];
    applyTheme();
    hydrateIcons(document);
    renderSourceChip(); renderTabs(); renderVoices(); renderStudioShell();
    S.studio = freshStudio();
    renderStage();
    bind();
    bindInstall();
    requestAnimationFrame(drawViz);
    var hash = location.hash.replace('#', '');
    if (['voices', 'studio', 'library', 'settings'].indexOf(hash) >= 0) goto(hash);
    if (!IS_EXT && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }
  boot();
})();
