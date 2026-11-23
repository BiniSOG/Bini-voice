/*
 * Bini Voice — settings store. Uses chrome.storage.local inside the
 * extension (so popup, studio and tabs stay in sync) and localStorage
 * everywhere else.
 */
(function (g) {
  'use strict';
  var hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  var listeners = [];

  var DEFAULTS = {
    'bini.settings': {
      enabled: true,
      voiceId: 'f-young',
      intensity: 1,
      source: { mode: 'preset', gender: 'male', f0: 0 },
      quality: 'balanced',
      theme: 'dark',
      noiseSuppression: true,
      echoCancellation: true,
      favorites: []
    },
    'bini.customVoices': []
  };

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function merge(key, v) {
    var d = DEFAULTS[key];
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      var o = clone(d);
      for (var k in v || {}) o[k] = v[k];
      return o;
    }
    return v == null ? clone(d) : v;
  }

  var Store = {
    DEFAULTS: DEFAULTS,
    get: function (key) {
      if (hasChrome) {
        return new Promise(function (res) {
          chrome.storage.local.get(key, function (r) { res(merge(key, r[key])); });
        });
      }
      var raw = null;
      try { raw = JSON.parse(localStorage.getItem(key)); } catch (e) {}
      return Promise.resolve(merge(key, raw));
    },
    set: function (key, value) {
      if (hasChrome) {
        var o = {}; o[key] = value;
        return new Promise(function (res) { chrome.storage.local.set(o, res); });
      }
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
      listeners.forEach(function (fn) { fn(key, value); });
      return Promise.resolve();
    },
    subscribe: function (fn) {
      listeners.push(fn);
      if (hasChrome && listeners.length === 1) {
        chrome.storage.onChanged.addListener(function (changes, area) {
          if (area !== 'local') return;
          for (var k in changes) {
            var v = merge(k, changes[k].newValue);
            listeners.forEach(function (l) { l(k, v); });
          }
        });
      }
    }
  };

  g.BiniStore = Store;
})(typeof globalThis !== 'undefined' ? globalThis : self);
