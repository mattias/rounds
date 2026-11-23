// Toolbar popup and setup/options page (same code). Everything here lives behind the extension button.
(() => {
  const { LANGS, UI_LANGS, mergeCfg, makeT } = YR;
  const isTab = location.pathname.endsWith("options.html");
  const app = document.getElementById("app");
  let cfg, T, info = null, flash = "", recent = [], localRecent = [];

  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...kids);
    return e;
  };
  const row = (label, ...kids) => el("div", { className: "row" }, label ? el("label", { textContent: label }) : "", ...kids);
  const save = () => chrome.storage.local.set({ cfg });
  const num = (val, min, max, step, on) => {
    const i = el("input", { type: "number", min, max, step, value: val });
    i.onchange = () => { on(Number(i.value)); save(); };
    return i;
  };

  function langPicker(key) {
    const cur = cfg.langs[key];
    const known = LANGS.some((l) => l[1] === cur);
    const sel = el("select");
    LANGS.forEach(([, en, nat]) => sel.append(el("option", { value: en, textContent: nat === en ? en : `${nat} · ${en}`, selected: en === cur })));
    sel.append(el("option", { value: "__other", textContent: T("otherLang"), selected: !known }));
    const txt = el("input", { type: "text", value: known ? "" : cur, placeholder: T("typeLang"), style: `display:${known ? "none" : "block"}` });
    sel.onchange = () => {
      if (sel.value === "__other") { txt.style.display = "block"; txt.focus(); return; }
      txt.style.display = "none"; cfg.langs[key] = sel.value; save();
    };
    txt.onchange = () => { if (txt.value.trim()) { cfg.langs[key] = txt.value.trim(); save(); } };
    return [sel, txt];
  }
  function uiPicker() {
    const sel = el("select");
    UI_LANGS.forEach(([c, n]) => sel.append(el("option", { value: c, textContent: n, selected: c === cfg.uiLang })));
    sel.onchange = () => { cfg.uiLang = sel.value; T = makeT(cfg.uiLang); save(); render(); };
    return sel;
  }

  async function getInfo() {
    if (isTab) return null;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !/^https:\/\/www\.(youtube|netflix)\.com\//.test(tab.url || "")) return null;
      const r = await chrome.tabs.sendMessage(tab.id, { type: "info" });
      return r && r.vid ? { ...r, tabId: tab.id } : null;
    } catch { return null; }
  }
  const recKey = () => `${info.site}:${info.vid}`;
  async function saveRecord(patch) {
    const o = await chrome.storage.local.get(recKey());
    const rec = { on: false, text: "", clips: {}, ...(o[recKey()] || {}), ...patch };
    await chrome.storage.local.set({ [recKey()]: rec });
  }

  function render() {
    app.replaceChildren();
    // First run: welcome + the two languages that matter.
    if (!cfg.onboarded) {
      app.append(
        el("h1", { textContent: T("welcomeTitle") }),
        el("p", { textContent: T("welcomeText") }),
        row(T("uiLang"), uiPicker()),
        row(T("learning"), ...langPicker("target")),
        row(T("feedback"), ...langPicker("native")),
        el("div", { className: "row" }, el("button", { className: "primary", textContent: T("start"), onclick: () => {
          cfg.onboarded = true; save(); render(); if (!isTab) window.close(); } })),
      );
      return;
    }

    app.append(el("h1", { textContent: T("title") }),
      el("button", { className: "primary", textContent: "🎞 " + T("openLocal"), onclick: () => chrome.tabs.create({ url: chrome.runtime.getURL("local.html") }) }));

    // This video
    if (info) {
      const on = el("input", { type: "checkbox", checked: !!info.on });
      on.onchange = () => { info.on = on.checked; saveRecord({ on: on.checked }); };
      const ta = el("textarea", { value: info.text || "", spellcheck: false });
      const msg = el("span", { className: "ok" });
      const btns = el("div", { className: "row" },
        el("button", { className: "primary", textContent: T("save"), onclick: async () => {
          info.text = ta.value; await saveRecord({ text: ta.value }); msg.textContent = T("saved"); } }));
      if (info.site === "youtube") btns.append(el("button", { textContent: T("fromDesc"), onclick: async () => {
        try {
          const r = await chrome.tabs.sendMessage(info.tabId, { type: "chapters" });
          if (r && r.lines && r.lines.length) { ta.value = r.lines.join("\n"); msg.textContent = ""; }
          else msg.textContent = T("noChapters");
        } catch { msg.textContent = T("noChapters"); } } }));
      btns.append(msg);
      app.append(
        el("h2", { textContent: T("sBlocks") }),
        el("label", { className: "row" }, on, T("showPanel")),
        el("div", { className: "hint", textContent: T("blocksFormat") }), ta, btns,
      );
    } else if (!isTab) {
      app.append(el("p", { textContent: T("noVideo") }));
    }

    // Recent videos
    app.append(recentBlock());

    // How the rounds work
    app.append(helpBlock());

    // Languages
    app.append(
      el("h2", { textContent: T("sLang") }),
      row(T("uiLang"), uiPicker()),
      row(T("learning"), ...langPicker("target")),
      row(T("feedback"), ...langPicker("native")),
      row(T("promptIn"), (() => {
        const s = el("select");
        [["en", "English"], ["ja", "日本語"]].forEach(([c, n]) => s.append(el("option", { value: c, textContent: n, selected: c === cfg.promptIn })));
        s.onchange = () => { cfg.promptIn = s.value; save(); };
        return s;
      })()),
    );

    // Speeds
    app.append(
      el("h2", { textContent: T("sSpeeds") }),
      row(T("r1"), num(cfg.speed[1], 0.25, 2, 0.05, (v) => (cfg.speed[1] = v || 1))),
      row(T("r2"), num(cfg.speed[2], 0.25, 2, 0.05, (v) => (cfg.speed[2] = v || 1))),
      row(T("r3cfg"), T("from"), num(cfg.r3.from, 0.25, 2, 0.05, (v) => (cfg.r3.from = v || 1)),
        T("to"), num(cfg.r3.to, 0.25, 2, 0.05, (v) => (cfg.r3.to = v || 1)),
        T("passes"), num(cfg.r3.passes, 1, 10, 1, (v) => (cfg.r3.passes = Math.max(1, v | 0)))),
      row(T("r4"), num(cfg.speed[4], 0.25, 2, 0.05, (v) => (cfg.speed[4] = v || 1))),
    );

    // Cover bars
    const bar = (pos) => num(cfg.bars[pos], 0, 60, 1, (v) => (cfg.bars[pos] = Math.min(60, Math.max(0, v || 0))));
    const tabBox = el("input", { type: "checkbox", checked: cfg.showTab !== false });
    tabBox.onchange = () => { cfg.showTab = tabBox.checked; save(); };
    app.append(
      el("h2", { textContent: T("sBars") }),
      row(T("barTop"), bar("top")),
      row(T("barBottom"), bar("bottom")),
      el("div", { className: "hint", textContent: T("barsHint") }),
      el("label", { className: "row" }, tabBox, T("showTab")),
      el("div", { className: "hint", textContent: T("keys") }),
    );

    // Backup: same file format as the mobile web app.
    const note = el("span", { className: "ok", textContent: flash });
    flash = "";
    const file = el("input", { type: "file", accept: "application/json,.json", style: "display:none" });
    file.onchange = async () => { if (file.files[0]) { flash = await importData(file.files[0]); render(); } };
    app.append(
      el("h2", { textContent: T("sBackup") }),
      el("div", { className: "hint", textContent: T("backupHint") }),
      el("div", { className: "row" },
        el("button", { textContent: "⬇ " + T("exportB"), onclick: async () => { await exportData(); note.textContent = T("exported"); } }),
        // A file picker closes the toolbar popup, so importing happens on the full settings page.
        el("button", { textContent: "⬆ " + T("importB"), onclick: () => (isTab ? file.click() : chrome.runtime.openOptionsPage()) }),
        file, note),
    );
  }

  // The last 10 videos where the panel was used; a click opens the video in a new tab.
  function recentBlock() {
    const wrap = el("div", { className: "recent" }, el("h2", { textContent: T("recentT") }));
    // Streaming videos and local files in one list, newest first. A local file must be picked again on the local page.
    const items = [...recent, ...localRecent.map((e) => ({ ...e, site: "local" }))].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 10);
    if (!items.length) wrap.append(el("p", { className: "hint", textContent: T("recentEmpty") }));
    for (const e of items) {
      const url = e.site === "local" ? chrome.runtime.getURL("local.html") + "#reopen=" + encodeURIComponent(e.id)
        : e.site === "netflix" ? `https://www.netflix.com/watch/${encodeURIComponent(e.id)}` : `https://www.youtube.com/watch?v=${encodeURIComponent(e.id)}`;
      wrap.append(el("button", { className: "recentrow", title: e.title || "", onclick: () => chrome.tabs.create({ url }) },
        el("span", { className: "badge", textContent: e.site === "netflix" ? "N" : e.site === "local" ? "🎞" : "▶" }),
        el("span", { className: "rt", textContent: e.title || `${e.site} ${e.id}` })));
    }
    if (items.length) wrap.append(el("div", { className: "row" }, el("button", { textContent: T("recentClear"), onclick: async () => {
      recent = []; localRecent = []; await chrome.storage.local.set({ history: [], localHistory: [] }); render(); } })));
    return wrap;
  }

  // What / why / how for each round (English, 日本語 and Svenska have full texts; other languages show English).
  function helpBlock() {
    const wrap = el("div", { className: "help" }, el("h2", { textContent: T("helpTitle") }), el("p", { textContent: T("helpIntro") }));
    for (const r of [1, 2, 3, 4]) {
      const d = el("details", {}, el("summary", { textContent: T("r" + r) }));
      for (const [lbl, k] of [["lblWhat", "What"], ["lblWhy", "Why"], ["lblHow", "How"]]) {
        d.append(el("p", {}, el("b", { textContent: T(lbl) + ": " }), T(`h${r}${k}`)));
      }
      wrap.append(d);
    }
    return wrap;
  }

  async function exportData() {
    const all = await chrome.storage.local.get(null);
    const videos = {};
    for (const [k, v] of Object.entries(all)) {
      if (/^(youtube|netflix|local):/.test(k)) videos[k] = { text: v.text || "", clips: v.clips || {}, ...(v.sync ? { sync: v.sync } : {}) };
      else if (k.startsWith("vid:") && !videos["youtube:" + k.slice(4)]) videos["youtube:" + k.slice(4)] = { text: v.text || "", clips: v.clips || {} };
    }
    const blob = new Blob([JSON.stringify({ app: "rounds", version: 1, cfg, videos, history: [...(Array.isArray(all.history) ? all.history : []), ...(Array.isArray(all.localHistory) ? all.localHistory : []).map((e) => ({ ...e, kind: "local" }))] }, null, 1)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "rounds-backup.json" });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  // Keys are "youtube:ID" / "netflix:ID"; plain IDs (from the mobile app) mean YouTube.
  async function importData(f) {
    try {
      const d = JSON.parse(await f.text());
      if (d.app !== "rounds" || typeof d.videos !== "object") throw new Error("bad");
      const existing = await chrome.storage.local.get(null);
      const patch = {};
      // Nothing from the file is trusted: ids, shapes and numbers are checked, and a record that lacks a part
      // (for example only {"text": ...}) keeps what is already stored for that part instead of erasing it.
      const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
      const safeKey = (k) => k !== "__proto__" && k !== "constructor" && k !== "prototype";
      const idOk = (site, id) => (site === "youtube" ? /^[\w-]{11}$/.test(id) : site === "netflix" ? /^\d{1,12}$/.test(id) : typeof id === "string" && id.length > 0 && id.length < 300);
      const num = (x) => typeof x === "number" && isFinite(x);
      const cleanClips = (c) => {
        const out = {};
        if (!isObj(c)) return out;
        for (const [bi, list] of Object.entries(c)) {
          if (!safeKey(bi) || !Array.isArray(list)) continue;
          const l = list.filter((x) => x && num(x.s) && num(x.e) && x.e > x.s && x.s >= 0).map((x) => ({ s: x.s, e: x.e }));
          if (l.length) out[bi] = l;
        }
        return out;
      };
      const cleanSync = (s) => {
        const out = {};
        if (!isObj(s)) return out;
        for (const [name, v] of Object.entries(s)) if (safeKey(name) && isObj(v) && num(v.offset) && num(v.scale) && v.scale > 0.5 && v.scale < 2) out[name] = { offset: v.offset, scale: v.scale };
        return out;
      };
      let count = 0;
      for (const [k, rec] of Object.entries(d.videos)) {
        if (!safeKey(k) || !isObj(rec)) continue;
        const m = k.match(/^(youtube|netflix|local):(.*)$/s);
        const site = m ? m[1] : "youtube", id = m ? m[2] : k;
        if (!idOk(site, id)) continue;
        const key = site + ":" + id, old = existing[key] || {};
        const next = {
          text: typeof rec.text === "string" ? rec.text : old.text || "",
          clips: isObj(rec.clips) ? cleanClips(rec.clips) : old.clips || {},
        };
        if (isObj(rec.sync)) next.sync = cleanSync(rec.sync); else if (old.sync) next.sync = old.sync;
        if (site !== "local") next.on = old.on ?? !!next.text; // streaming videos: show the panel when blocks exist
        patch[key] = next;
        count++;
      }
      let newRecent = recent, newLocal = localRecent;
      if (Array.isArray(d.history)) { // merge: newest first, no duplicates, at most 10; entries without "site" came from the mobile app (YouTube)
        const merge = (list, keyOf) => {
          const seen = new Set();
          return list.sort((a, b) => (b.ts || 0) - (a.ts || 0)).filter((e) => { const k = keyOf(e); return !seen.has(k) && seen.add(k); }).slice(0, 10);
        };
        const valid = d.history.filter((e) => isObj(e) && typeof e.id === "string");
        const title = (e) => (typeof e.title === "string" ? e.title.slice(0, 200) : "");
        const ts = (e) => (num(e.ts) ? e.ts : 0);
        const stream = valid.filter((e) => e.kind !== "local").map((e) => ({ site: e.site === "netflix" ? "netflix" : "youtube", id: e.id, title: title(e), ts: ts(e) }))
          .filter((e) => idOk(e.site, e.id));
        const own = valid.filter((e) => e.kind === "local" && idOk("local", e.id)).map((e) => ({ id: e.id, title: title(e), ts: ts(e), kind: "local" }));
        patch.history = merge([...stream, ...(Array.isArray(existing.history) ? existing.history : [])], (e) => e.site + ":" + e.id);
        patch.localHistory = merge([...own, ...(Array.isArray(existing.localHistory) ? existing.localHistory : [])], (e) => e.id);
        newRecent = patch.history; newLocal = patch.localHistory;
      }
      let newCfg = null;
      if (isObj(d.cfg)) { newCfg = mergeCfg({ ...d.cfg, onboarded: true }); patch.cfg = newCfg; }
      await chrome.storage.local.set(patch); // only after it succeeded do we update what the popup shows
      recent = newRecent; localRecent = newLocal;
      if (newCfg) { cfg = newCfg; T = makeT(cfg.uiLang); }
      return T("imported", count);
    } catch { return T("importBad"); }
  }

  (async () => {
    const o = await chrome.storage.local.get(["cfg", "history", "localHistory"]);
    cfg = mergeCfg(o.cfg);
    recent = Array.isArray(o.history) ? o.history : [];
    localRecent = Array.isArray(o.localHistory) ? o.localHistory : [];
    T = makeT(cfg.uiLang);
    if (!cfg.onboarded && !isTab) { chrome.runtime.openOptionsPage(); window.close(); return; }
    info = await getInfo();
    render();
  })();
})();
