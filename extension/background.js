/* Bini Voice — service worker: badge state */
function refreshBadge() {
  chrome.storage.local.get('bini.settings', function (r) {
    var s = r['bini.settings'] || { enabled: true };
    chrome.action.setBadgeText({ text: s.enabled === false ? '' : 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#a46bff' });
  });
}
chrome.runtime.onInstalled.addListener(function (details) {
  refreshBadge();
  if (details.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('studio/index.html') });
});
chrome.runtime.onStartup.addListener(refreshBadge);
chrome.storage.onChanged.addListener(function (c, area) { if (area === 'local' && c['bini.settings']) refreshBadge(); });
chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (msg && msg.type === 'active' && sender.tab) {
    chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.count > 0 ? 'LIVE' : '' });
    if (msg.count === 0) refreshBadge();
  }
});
