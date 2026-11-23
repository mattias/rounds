// Starts the local player page inside the extension. The app code (docs/app.js) keeps its data in
// localStorage, so before it starts we copy the shared data in from chrome.storage and mirror every
// write back. Settings are shared with the toolbar popup; local-file blocks live under "local:<name>|<size>".
(async () => {
  const warn = (msg) => {
    console.warn("[Rounds]", msg);
    const bar = Object.assign(document.createElement("div"), { textContent: msg, style: "padding:8px 12px;background:#5a2a2a;color:#fff;font:13px system-ui,sans-serif" });
    document.body.prepend(bar);
  };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { warn("Could not copy saved data into the page (storage full?): " + k.slice(0, 40)); } };
  try {
    const all = await chrome.storage.local.get(null);
    for (const k of Object.keys(localStorage)) if (k === "rounds:cfg" || k === "rounds:history" || k.startsWith("rounds:v:")) localStorage.removeItem(k);
    if (all.cfg) put("rounds:cfg", all.cfg);
    if (Array.isArray(all.localHistory)) put("rounds:history", all.localHistory);
    for (const [k, v] of Object.entries(all)) if (k.startsWith("local:")) put("rounds:v:" + k, v);
  } catch (e) {
    warn("Could not read your saved Rounds data: " + (e && e.message ? e.message : e));
  }

  // Every write the app makes is mirrored to chrome.storage; failures are reported instead of lost silently.
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    orig.call(this, k, v);
    if (this !== localStorage) return;
    let patch = null;
    try {
      if (k === "rounds:cfg") patch = { cfg: JSON.parse(v) };
      else if (k === "rounds:history") patch = { localHistory: JSON.parse(v) };
      else if (k.startsWith("rounds:v:")) patch = { [k.slice("rounds:v:".length)]: JSON.parse(v) };
    } catch { /* malformed value: not mirrored */ }
    if (patch) chrome.storage.local.set(patch).catch((e) => warn("Could not save to the extension storage: " + (e && e.message ? e.message : e)));
  };

  document.body.append(Object.assign(document.createElement("script"), { src: "docs/app.js" }));
})();
