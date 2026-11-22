// Starts the local player page inside the extension. The app code (docs/app.js) keeps its data in
// localStorage, so before it starts we copy the shared data in from chrome.storage and mirror every
// write back. Settings are shared with the toolbar popup; local-file blocks live under "local:<name>|<size>".
(async () => {
  const all = await chrome.storage.local.get(null);
  for (const k of Object.keys(localStorage)) if (k === "rounds:cfg" || k === "rounds:history" || k.startsWith("rounds:v:")) localStorage.removeItem(k);
  if (all.cfg) localStorage.setItem("rounds:cfg", JSON.stringify(all.cfg));
  if (Array.isArray(all.localHistory)) localStorage.setItem("rounds:history", JSON.stringify(all.localHistory));
  for (const [k, v] of Object.entries(all)) if (k.startsWith("local:")) localStorage.setItem("rounds:v:" + k, JSON.stringify(v));

  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    orig.call(this, k, v);
    if (this !== localStorage) return;
    try {
      if (k === "rounds:cfg") chrome.storage.local.set({ cfg: JSON.parse(v) });
      else if (k === "rounds:history") chrome.storage.local.set({ localHistory: JSON.parse(v) });
      else if (k.startsWith("rounds:v:")) chrome.storage.local.set({ [k.slice("rounds:v:".length)]: JSON.parse(v) });
    } catch { /* ignore malformed values */ }
  };

  document.body.append(Object.assign(document.createElement("script"), { src: "docs/app.js" }));
})();
