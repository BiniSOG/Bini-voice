/* Bini Voice — isolated-world bridge: relays settings from chrome.storage to the page hook */
(function () {
  'use strict';
  var workletUrl = chrome.runtime.getURL('lib/worklet.js');
  var cache = { settings: null, custom: [] };

  function post() {
    if (!cache.settings) return;
    window.postMessage({
      source: 'bini-voice-ext', type: 'config',
      settings: cache.settings, custom: cache.custom, workletUrl: workletUrl
    }, '*');
  }

  chrome.storage.local.get(['bini.settings', 'bini.customVoices'], function (r) {
    var s = r['bini.settings'] || {};
    cache.settings = Object.assign({ enabled: true, voiceId: 'f-young', intensity: 1, source: { mode: 'preset', gender: 'male' } }, s);
    cache.custom = r['bini.customVoices'] || [];
    post();
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    if (changes['bini.settings']) cache.settings = Object.assign({}, cache.settings, changes['bini.settings'].newValue);
    if (changes['bini.customVoices']) cache.custom = changes['bini.customVoices'].newValue || [];
    post();
  });

  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data || e.data.source !== 'bini-voice-page') return;
    if (e.data.type === 'hello') post();
    if (e.data.type === 'active') {
      try { chrome.runtime.sendMessage({ type: 'active', count: e.data.count }); } catch (err) {}
    }
  });
})();
