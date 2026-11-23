/* Bini Voice — extension popup */
(function () {
  'use strict';
  var P = window.BiniPresets, Store = window.BiniStore;
  var $ = function (s) { return document.querySelector(s); };
  var S = { settings: null, custom: [], cat: 'female' };
  var ICON = {
    mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  var AGE = {}; P.AGES.forEach(function (a) { AGE[a.id] = a.label; });

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function avatar(v) {
    var c = v.colors || ['#8a6bff', '#ff6fae'];
    var inner = v.category === 'character' || v.id === 'original'
      ? '<svg class="i" viewBox="0 0 24 24">' + (v.id === 'original' ? ICON.mic : ICON.star) + '</svg>'
      : '<span>' + esc(v.name.charAt(0)) + '</span>';
    return '<div class="avatar" style="--c1:' + c[0] + ';--c2:' + c[1] + '">' + inner + '</div>';
  }

  function render() {
    var s = S.settings, v = P.findVoice(s.voiceId, S.custom);
    var c = v.colors || ['#8a6bff', '#ff6fae'];
    document.documentElement.style.setProperty('--v1', c[0]);
    document.documentElement.style.setProperty('--v2', c[1]);
    var theme = s.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : s.theme;
    document.documentElement.setAttribute('data-theme', theme || 'dark');
    document.body.classList.toggle('off', !s.enabled);
    $('#enabled').checked = !!s.enabled;
    $('#nowAvatar').outerHTML = avatar(v).replace('class="avatar"', 'id="nowAvatar" class="avatar"');
    $('#nowName').textContent = v.name;
    $('#nowTag').textContent = v.tagline || 'Custom voice';
    $('#nowState').textContent = s.enabled ? 'Active on websites' : 'Paused';
    $('#intensity').value = s.intensity;
    $('#intensity').style.setProperty('--p', (s.intensity / 1.5) * 100 + '%');
    $('#intensityOut').textContent = Math.round(s.intensity * 100) + '%';
    document.querySelectorAll('#cats button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-cat') === S.cat); });

    var list = P.VOICES.concat(S.custom).filter(function (x) { return x.category === S.cat; });
    if (S.cat === 'character') list.unshift(P.findVoice('original'));
    $('#grid').innerHTML = list.length ? list.map(function (x) {
      var cc = x.colors || c;
      return '<button class="p-card ' + (x.id === s.voiceId ? 'selected' : '') + '" data-id="' + esc(x.id) + '" style="--c1:' + cc[0] + ';--c2:' + cc[1] + '">' +
        avatar(x) + esc(x.name) + '<small>' + esc(AGE[x.age] || (x.category === 'custom' ? 'Custom' : x.id === 'original' ? 'Natural' : 'Character')) + '</small></button>';
    }).join('') : '<div class="p-empty">No custom voices yet.<br>Create one in the Studio.</div>';
  }

  function save() { Store.set('bini.settings', S.settings); }

  $('#enabled').addEventListener('change', function (e) { S.settings.enabled = e.target.checked; save(); render(); });
  $('#intensity').addEventListener('input', function (e) { S.settings.intensity = +e.target.value; render(); });
  $('#intensity').addEventListener('change', save);
  $('#cats').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (b) { S.cat = b.getAttribute('data-cat'); render(); } });
  $('#grid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-id]'); if (!b) return;
    S.settings.voiceId = b.getAttribute('data-id'); save(); render();
  });
  $('#openStudio').addEventListener('click', function () { chrome.tabs.create({ url: chrome.runtime.getURL('studio/index.html') }); });

  Promise.all([Store.get('bini.settings'), Store.get('bini.customVoices')]).then(function (r) {
    S.settings = r[0]; S.custom = r[1] || [];
    var v = P.findVoice(S.settings.voiceId, S.custom);
    if (v.category && v.category !== 'all') S.cat = v.category;
    render();
  });
})();
