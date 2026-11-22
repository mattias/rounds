// Rounds for mobile: the same rounds as the browser extension, on top of the YouTube IFrame player.
(() => {
  const { LANGS, UI_LANGS, mergeCfg, makeT } = YR;
  const { parseBlocks, PROMPTS, TAILS } = Core;

  // App-only strings (English / 日本語 / Svenska; other interface languages fall back to English).
  const APP = {
    en: {
      tagline: "Listening rounds for YouTube",
      urlPh: "Paste a YouTube link", load: "Load", badLink: "That does not look like a YouTube link.",
      intro: "Paste a YouTube link (or share one to this app), add the blocks, and start a round. Netflix is only available in the desktop extension.",
      welcomeText: "Choose the language you want to learn and the language you want feedback in. You can change this any time in Settings.",
      noBlocks: "No blocks yet. Open “Blocks” below and paste the list from Gemini.",
      gemini: "Open Gemini", blocksT: "Blocks", settingsT: "Settings", dataT: "Backup",
      exportB: "Export", importB: "Import", exportHint: "Save your blocks, clips and settings as a file, or load a file from another device.",
      imported: "Imported {0} video(s).", importBad: "Not a Rounds backup file.", exported: "Backup saved.",
      noEmbed: "This video cannot be played here (embedding is disabled).", rate: "Playing at {0}x on this device.",
      playerT: "Player", histT: "History", histEmpty: "Videos you open show up here (the last 10).", histClear: "Clear history", histRemove: "Remove", histBlocks: "{0} blocks",
    },
    ja: {
      tagline: "YouTube用リスニング・ラウンド",
      urlPh: "YouTubeのリンクを貼り付け", load: "読み込む", badLink: "YouTubeのリンクではないようです。",
      intro: "YouTubeのリンクを貼り付ける（またはこのアプリに共有する）→ ブロックを追加 → ラウンド開始。Netflixはパソコン用拡張機能のみ対応です。",
      welcomeText: "学習したい言語と、フィードバックを受けたい言語を選んでください。あとから設定でいつでも変更できます。",
      noBlocks: "ブロックがありません。下の「ブロック」を開き、Geminiの一覧を貼り付けてください。",
      gemini: "Geminiを開く", blocksT: "ブロック", settingsT: "設定", dataT: "バックアップ",
      exportB: "エクスポート", importB: "インポート", exportHint: "ブロック・クリップ・設定をファイルに保存、または別の端末のファイルを読み込みます。",
      imported: "{0}件の動画を読み込みました。", importBad: "Roundsのバックアップファイルではありません。", exported: "バックアップを保存しました。",
      noEmbed: "この動画はここでは再生できません（埋め込みが無効）。", rate: "この端末では{0}倍速で再生されています。",
      playerT: "プレーヤー", histT: "履歴", histEmpty: "開いた動画がここに表示されます（最新10件）。", histClear: "履歴を消去", histRemove: "削除", histBlocks: "{0}ブロック",
    },
    sv: {
      tagline: "Lyssningsrundor för YouTube",
      urlPh: "Klistra in en YouTube-länk", load: "Ladda", badLink: "Det ser inte ut som en YouTube-länk.",
      intro: "Klistra in en YouTube-länk (eller dela en till appen), lägg till block och starta en runda. Netflix finns bara i datortillägget.",
      welcomeText: "Välj språket du vill lära dig och språket du vill ha feedback på. Du kan ändra det när som helst under Inställningar.",
      noBlocks: "Inga block än. Öppna “Block” nedan och klistra in listan från Gemini.",
      gemini: "Öppna Gemini", blocksT: "Block", settingsT: "Inställningar", dataT: "Säkerhetskopia",
      exportB: "Exportera", importB: "Importera", exportHint: "Spara dina block, klipp och inställningar som en fil, eller läs in en fil från en annan enhet.",
      imported: "Importerade {0} video(r).", importBad: "Inte en Rounds-säkerhetskopia.", exported: "Säkerhetskopian sparad.",
      noEmbed: "Videon kan inte spelas här (inbäddning är avstängd).", rate: "Spelas i {0}x på den här enheten.",
      playerT: "Spelare", histT: "Historik", histEmpty: "Videor du öppnar visas här (de senaste 10).", histClear: "Rensa historiken", histRemove: "Ta bort", histBlocks: "{0} block",
    },
  };

  // ---------- Storage ----------
  const LS = localStorage;
  const getJ = (k) => { try { return JSON.parse(LS.getItem(k)); } catch { return null; } };
  const setJ = (k, v) => LS.setItem(k, JSON.stringify(v));
  const CFG_KEY = "rounds:cfg", VID_PREFIX = "rounds:v:";
  let cfg = mergeCfg(getJ(CFG_KEY));
  let T = makeT(cfg.uiLang);
  const A = (k, ...a) => ((APP[cfg.uiLang] || APP.en)[k] ?? APP.en[k] ?? k).replace(/\{(\d+)\}/g, (_, i) => a[+i]);
  const saveCfg = () => setJ(CFG_KEY, cfg);
  const saveVid = () => S.vid && setJ(VID_PREFIX + S.vid, { text: S.text, clips: S.clips });

  // ---------- Helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...kids);
    return e;
  };
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (s) => {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
  };
  function ytId(s) {
    s = String(s || "");
    const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|live\/|embed\/|v\/))([\w-]{11})/i);
    return m ? m[1] : /^[\w-]{11}$/.test(s.trim()) ? s.trim() : null;
  }

  // ---------- State ----------
  const S = {
    vid: null, text: "", blocks: [], clips: {}, cur: -1, round: 1, active: false, pass: 0, clip: 0,
    markStart: null, msg: null, lock: 0, ready: false, dur: 0, rateSeen: null, noEmbed: false,
  };
  window.__rounds = { S, get yt() { return yt; } }; // handy for debugging in the console
  const open = new Set(JSON.parse(LS.getItem("rounds:open") || "[]"));

  // ---------- Player ----------
  let yt = null, apiReady = false, pendingId = null;
  window.onYouTubeIframeAPIReady = () => { apiReady = true; if (pendingId) makePlayer(pendingId); };
  function loadApi() {
    if (window.YT && YT.Player) { apiReady = true; return; }
    document.head.append(el("script", { src: "https://www.youtube.com/iframe_api" }));
  }
  function makePlayer(id) {
    $("#player-host").replaceChildren(el("div", { id: "player" }));
    yt = new YT.Player("player", {
      videoId: id,
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, enablejsapi: 1, origin: location.origin },
      events: {
        onReady: () => { S.ready = true; updateDur(); noteTitle(); render(); },
        onStateChange: (e) => { if (e.data === 1 || e.data === 5) { updateDur(); noteTitle(); } },
        onError: () => { S.noEmbed = true; render(); },
      },
    });
  }
  function updateDur() {
    const d = yt && yt.getDuration && yt.getDuration();
    if (d > 0 && d !== S.dur) {
      S.dur = d; self.__dur = d;
      if (S.text) S.blocks = parseBlocks(S.text);
      render();
    }
  }
  // ---------- History (the last 10 videos) ----------
  const HIST_KEY = "rounds:history", HIST_MAX = 10;
  let view = "player"; // "player" | "history"
  const getHist = () => (Array.isArray(getJ(HIST_KEY)) ? getJ(HIST_KEY) : []);
  function touchHist(id) {
    const all = getHist(), old = all.find((e) => e.id === id);
    setJ(HIST_KEY, [{ id, title: old?.title || "", ts: Date.now() }, ...all.filter((e) => e.id !== id)].slice(0, HIST_MAX));
  }
  function noteTitle() {
    const vd = yt && yt.getVideoData && yt.getVideoData();
    if (!vd || !vd.title || vd.video_id !== S.vid) return;
    const all = getHist(), e = all.find((x) => x.id === S.vid);
    if (e && e.title !== vd.title) { e.title = vd.title; setJ(HIST_KEY, all); }
  }
  function setView(v) {
    if (v === view) return;
    if (v === "history" && yt && isPlaying()) { yt.pauseVideo(); S.active = false; }
    view = v;
    render();
  }
  function historyView() {
    const all = getHist(), wrap = el("div", { className: "list" });
    if (!all.length) wrap.append(el("p", { className: "hint", textContent: A("histEmpty") }));
    for (const e of all) {
      const rec = getJ(VID_PREFIX + e.id);
      const n = rec && rec.text ? parseBlocks(rec.text).length : 0;
      wrap.append(el("div", { className: "hist" },
        el("button", { className: "histbtn", onclick: () => loadVideo(e.id) },
          el("img", { src: `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`, alt: "", loading: "lazy" }),
          el("span", { className: "histtxt" }, el("b", { textContent: e.title || e.id }),
            el("small", { textContent: `${new Date(e.ts).toLocaleDateString(cfg.uiLang)} · ${A("histBlocks", n)}` }))),
        el("button", { textContent: "✕", title: A("histRemove"), onclick: () => { setJ(HIST_KEY, getHist().filter((x) => x.id !== e.id)); render(); } })));
    }
    if (all.length) wrap.append(el("button", { textContent: A("histClear"), onclick: () => { setJ(HIST_KEY, []); render(); } }));
    return wrap;
  }

  function loadVideo(id) {
    touchHist(id);
    if (id === S.vid && yt && S.ready) { view = "player"; render(); return; }
    view = "player";
    S.vid = id; S.cur = -1; S.active = false; S.msg = null; S.noEmbed = false; S.ready = false; S.dur = 0; self.__dur = 0;
    const rec = getJ(VID_PREFIX + id);
    S.text = rec?.text || ""; S.clips = rec?.clips || {};
    S.blocks = parseBlocks(S.text);
    history.replaceState(null, "", location.pathname + "?v=" + id);
    if (yt && yt.loadVideoById && S.ready !== undefined && yt.cueVideoById) { try { yt.cueVideoById(id); S.ready = true; } catch { /* rebuilt below */ } }
    if (!yt || !yt.cueVideoById) {
      if (apiReady) makePlayer(id); else { pendingId = id; loadApi(); }
    }
    render();
  }
  const isPlaying = () => yt && yt.getPlayerState && yt.getPlayerState() === 1;

  // ---------- Playback ----------
  function segment() {
    const b = S.blocks[S.cur];
    if (!b) return null;
    if (S.round === 3) {
      const cs = S.clips[S.cur] || [];
      if (cs.length) return cs[Math.min(S.clip, cs.length - 1)];
    }
    return b;
  }
  function rateFor() {
    // the embedded player works in 0.05 steps
    const q = (x) => Math.round(x * 20) / 20;
    if (S.round !== 3) return q(cfg.speed[S.round]);
    const { from, to, passes } = cfg.r3;
    return q(passes <= 1 ? to : from + ((to - from) * S.pass) / (passes - 1));
  }
  function start(i, round) {
    if (!S.ready || !S.blocks[i]) return;
    if (round) S.round = round;
    S.cur = i; S.pass = 0; S.clip = 0; S.active = true; S.msg = null;
    seekPlay();
    render();
  }
  function seekPlay() {
    const seg = segment();
    if (!seg || !yt) return;
    S.lock = Date.now() + 600;
    yt.seekTo(seg.s, true);
    yt.setPlaybackRate(rateFor());
    yt.playVideo();
    setTimeout(() => { S.rateSeen = yt.getPlaybackRate(); render(); }, 500);
  }
  function halt() {
    yt && yt.pauseVideo();
    S.active = false;
    render();
  }
  function onEnd() {
    if (S.round === 3) {
      const cs = S.clips[S.cur] || [];
      S.pass++;
      if (S.pass >= cfg.r3.passes) {
        S.pass = 0;
        if (S.clip + 1 < cs.length) S.clip++;
        else if (cfg.loop) S.clip = 0;
        else return halt();
      }
      seekPlay();
    } else if (cfg.loop) seekPlay();
    else return halt();
    render();
  }
  setInterval(() => {
    if (!S.active || !yt || !S.ready) return;
    const seg = segment();
    if (!seg) return;
    const t = yt.getCurrentTime();
    const bar = $(".blk.on .prog");
    if (bar) bar.style.width = Math.min(100, Math.max(0, ((t - seg.s) / (seg.e - seg.s)) * 100)) + "%";
    if (Date.now() < S.lock) return;
    if (isPlaying() && t >= seg.e - 0.05) onEnd();
  }, 80);


  // ---------- Clips ----------
  function markClip() {
    if (!S.ready || S.cur < 0) { S.msg = T("pick"); return render(); }
    const t = yt.getCurrentTime();
    if (S.markStart == null) { S.markStart = t; S.msg = T("clipStart", fmt(t)); }
    else {
      const s = Math.min(S.markStart, t), e = Math.max(S.markStart, t);
      S.markStart = null; S.msg = null;
      if (e - s > 0.5) { (S.clips[S.cur] ||= []).push({ s, e }); saveVid(); }
    }
    render();
  }

  // ---------- Prompt ----------
  async function copyPrompt(thenOpen) {
    const pl = cfg.promptIn === "ja" ? "ja" : "en";
    const { target, native } = cfg.langs;
    const tail = `${TAILS[pl].link}\nhttps://www.youtube.com/watch?v=${S.vid}`;
    const text = PROMPTS[pl]({ target, native, tail });
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = el("textarea", { value: text, style: "position:fixed;opacity:0" });
      document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    S.msg = T("copied");
    render();
    if (thenOpen) window.open("https://gemini.google.com/app", "_blank");
  }

  // ---------- Export / import ----------
  function exportData() {
    const videos = {};
    for (let i = 0; i < LS.length; i++) {
      const k = LS.key(i);
      if (k.startsWith(VID_PREFIX)) videos[k.slice(VID_PREFIX.length)] = getJ(k);
    }
    const blob = new Blob([JSON.stringify({ app: "rounds", version: 1, cfg, videos, history: getHist() }, null, 1)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "rounds-backup.json" });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    S.msg = A("exported"); render();
  }
  async function importData(file) {
    try {
      const d = JSON.parse(await file.text());
      if (d.app !== "rounds" || typeof d.videos !== "object") throw new Error("bad");
      let n = 0;
      // Files from the extension use "youtube:ID" / "netflix:ID" keys; Netflix has no place in the mobile app.
      const imported = {};
      for (const [k, rec] of Object.entries(d.videos)) {
        if (k.startsWith("netflix:")) continue;
        const id = k.replace(/^youtube:/, "");
        imported[id] = { text: rec.text || "", clips: rec.clips || {} };
        setJ(VID_PREFIX + id, imported[id]); n++;
      }
      if (Array.isArray(d.history)) { // merge: newest first, no duplicates, at most 10
        const seen = new Set();
        const merged = [...d.history.filter((e) => e && e.id && e.site !== "netflix"), ...getHist()]
          .sort((a, b) => (b.ts || 0) - (a.ts || 0)).filter((e) => !seen.has(e.id) && seen.add(e.id));
        setJ(HIST_KEY, merged.slice(0, HIST_MAX));
      }
      if (d.cfg) { cfg = mergeCfg({ ...d.cfg, onboarded: true }); T = makeT(cfg.uiLang); saveCfg(); }
      if (S.vid && imported[S.vid]) { S.text = imported[S.vid].text; S.clips = imported[S.vid].clips; S.blocks = parseBlocks(S.text); }
      S.msg = A("imported", n);
    } catch { S.msg = A("importBad"); }
    render();
  }

  // ---------- UI ----------
  const ui = () => $("#ui");
  const num = (val, min, max, step, on) => {
    const i = el("input", { type: "number", min, max, step, value: val, inputMode: "decimal" });
    i.onchange = () => { on(Number(i.value)); saveCfg(); };
    return i;
  };
  const row = (label, ...kids) => el("div", { className: "row" }, label ? el("label", { textContent: label }) : "", ...kids);
  function langPicker(key) {
    const cur = cfg.langs[key];
    const known = LANGS.some((l) => l[1] === cur);
    const sel = el("select");
    LANGS.forEach(([, en, nat]) => sel.append(el("option", { value: en, textContent: nat === en ? en : `${nat} · ${en}`, selected: en === cur })));
    sel.append(el("option", { value: "__other", textContent: T("otherLang"), selected: !known }));
    const txt = el("input", { type: "text", value: known ? "" : cur, placeholder: T("typeLang"), style: `display:${known ? "none" : "block"}` });
    sel.onchange = () => {
      if (sel.value === "__other") { txt.style.display = "block"; txt.focus(); return; }
      txt.style.display = "none"; cfg.langs[key] = sel.value; saveCfg();
    };
    txt.onchange = () => { if (txt.value.trim()) { cfg.langs[key] = txt.value.trim(); saveCfg(); } };
    return [sel, txt];
  }
  function uiPicker() {
    const sel = el("select");
    UI_LANGS.forEach(([c, n]) => sel.append(el("option", { value: c, textContent: n, selected: c === cfg.uiLang })));
    sel.onchange = () => { cfg.uiLang = sel.value; T = makeT(cfg.uiLang); saveCfg(); render(); };
    return sel;
  }
  function section(id, title, ...kids) {
    const d = el("details", { open: open.has(id) });
    d.ontoggle = () => { d.open ? open.add(id) : open.delete(id); LS.setItem("rounds:open", JSON.stringify([...open])); };
    d.append(el("summary", { textContent: title }), el("div", { className: "sec" }, ...kids));
    return d;
  }

  function render() {
    const root = ui();
    const keepScroll = window.scrollY;
    root.replaceChildren();
    document.title = "Rounds";
    $("#tagline").textContent = A("tagline");
    $("#url").placeholder = A("urlPh");
    $("#load").textContent = A("load");

    // First run
    if (!cfg.onboarded) {
      root.append(el("div", { className: "card" },
        el("h2", { textContent: T("welcomeTitle") }), el("p", { textContent: A("welcomeText") }),
        row(T("uiLang"), uiPicker()), row(T("learning"), ...langPicker("target")), row(T("feedback"), ...langPicker("native")),
        el("button", { className: "primary", textContent: T("start"), onclick: () => { cfg.onboarded = true; saveCfg(); render(); } })));
      return;
    }

    // Tabs: player / history
    const tabs = $("#tabs");
    tabs.replaceChildren(
      el("button", { className: view === "player" ? "on" : "", textContent: "▶ " + A("playerT"), onclick: () => setView("player") }),
      el("button", { className: view === "history" ? "on" : "", textContent: "🕘 " + A("histT"), onclick: () => setView("history") }));
    tabs.style.display = "flex";
    if (view === "history") {
      $("#player-wrap").style.display = "none";
      root.append(historyView());
      return;
    }

    $("#player-wrap").style.display = S.vid ? "block" : "none";
    if (!S.vid) root.append(el("p", { className: "hint", textContent: A("intro") }));
    if (S.noEmbed) root.append(el("p", { className: "warn", textContent: A("noEmbed") }));

    if (S.vid) {
      // Rounds
      const rounds = el("div", { className: "rounds" });
      for (const r of [1, 2, 3, 4]) {
        const sp = r === 3 ? `${cfg.r3.from}→${cfg.r3.to}x` : `${cfg.speed[r]}x`;
        rounds.append(el("button", { className: "round" + (S.round === r ? " on" : ""), onclick: () => { S.round = r; S.cur >= 0 ? start(S.cur, r) : render(); } },
          el("b", { textContent: T("r" + r) }), el("span", { textContent: sp })));
      }
      root.append(rounds);

      // Transport
      root.append(el("div", { className: "transport" },
        el("button", { textContent: "⏮", title: T("prev"), onclick: () => start(Math.max(0, S.cur - 1)) }),
        el("button", { textContent: "↻", title: T("replay"), onclick: () => S.cur >= 0 && start(S.cur) }),
        el("button", { textContent: "⏭", title: T("next"), onclick: () => start(Math.min(S.blocks.length - 1, S.cur + 1)) }),
        el("button", { textContent: "⏹", title: T("stop"), onclick: halt }),
        el("button", { className: cfg.loop ? "on" : "", textContent: "🔁 " + T("loop"), onclick: () => { cfg.loop = !cfg.loop; saveCfg(); render(); } })));

      // Status
      const b = S.blocks[S.cur];
      let st = S.msg;
      if (!st) {
        if (b && S.active) {
          st = T("status", S.cur + 1, S.round, rateFor().toFixed(2));
          if (S.round === 3) st += T("status3", Math.min(S.clip + 1, Math.max(1, (S.clips[S.cur] || []).length)), S.pass + 1, cfg.r3.passes);
        } else st = b ? T("stopped") : T("pick");
      }
      root.append(el("div", { className: "status", textContent: st }));
      if (S.active && S.rateSeen && Math.abs(S.rateSeen - rateFor()) > 0.02) root.append(el("p", { className: "warn", textContent: A("rate", S.rateSeen) }));

      // Blocks
      const bl = el("div", { className: "list" });
      S.blocks.forEach((blk, i) => bl.append(el("button", { className: "blk" + (i === S.cur ? " on" : ""), onclick: () => start(i) },
        el("span", { textContent: blk.label || `${A("blocksT")} ${i + 1}` }), el("small", { textContent: `${fmt(blk.s)}–${fmt(blk.e)}` }), el("div", { className: "prog" }))));
      if (!S.blocks.length) bl.append(el("p", { className: "hint", textContent: A("noBlocks") }));
      root.append(bl);

      // Clips
      const cs = S.clips[S.cur] || [];
      if (S.round === 3 || cs.length) {
        const cl = el("div", { className: "list" }, el("h3", { textContent: T("clips") }));
        cs.forEach((c, i) => cl.append(el("div", { className: "clip" },
          el("button", { className: S.round === 3 && S.active && i === S.clip ? "on" : "", textContent: `${i + 1}: ${fmt(c.s)}–${fmt(c.e)}`,
            onclick: () => { S.round = 3; S.clip = i; S.pass = 0; S.active = true; seekPlay(); render(); } }),
          el("button", { textContent: "✕", onclick: () => { cs.splice(i, 1); S.clip = 0; saveVid(); render(); } }))));
        if (!cs.length) cl.append(el("p", { className: "hint", textContent: T("noClips") }));
        cl.append(el("button", { textContent: "＋ " + T("markClip"), onclick: markClip }), el("p", { className: "hint", textContent: T("markHint") }));
        root.append(cl);
      }

      // Gemini
      root.append(el("div", { className: "transport" },
        el("button", { className: "primary", textContent: "📋 " + T("copyPrompt"), onclick: () => copyPrompt(false) }),
        el("button", { textContent: "✦ " + A("gemini"), onclick: () => copyPrompt(true) })));

      // Block editor
      const ta = el("textarea", { value: S.text, spellcheck: false });
      const saved = el("span", { className: "ok" });
      root.append(section("blocks", A("blocksT"),
        el("p", { className: "hint", textContent: T("blocksFormat") }), ta,
        el("div", { className: "transport" }, el("button", { className: "primary", textContent: T("save"), onclick: () => {
          S.text = ta.value; S.blocks = parseBlocks(S.text); S.cur = -1; S.active = false; saveVid(); S.msg = T("saved"); render(); } }), saved)));
    }

    // How the rounds work (full texts in English, 日本語, Svenska; other languages show English)
    const helpItems = [el("p", { className: "hint", textContent: T("helpIntro") })];
    for (const r of [1, 2, 3, 4]) {
      const d = el("details", {}, el("summary", { textContent: T("r" + r) }));
      for (const [lbl, k] of [["lblWhat", "What"], ["lblWhy", "Why"], ["lblHow", "How"]]) {
        d.append(el("p", {}, el("b", { textContent: T(lbl) + ": " }), T(`h${r}${k}`)));
      }
      helpItems.push(d);
    }
    root.append(section("help", T("helpTitle"), ...helpItems));

    // Settings
    root.append(section("settings", A("settingsT"),
      row(T("uiLang"), uiPicker()), row(T("learning"), ...langPicker("target")), row(T("feedback"), ...langPicker("native")),
      row(T("promptIn"), (() => {
        const s = el("select");
        [["en", "English"], ["ja", "日本語"]].forEach(([c, n]) => s.append(el("option", { value: c, textContent: n, selected: c === cfg.promptIn })));
        s.onchange = () => { cfg.promptIn = s.value; saveCfg(); };
        return s;
      })()),
      el("h3", { textContent: A("speedsT") }),
      row(T("r1"), num(cfg.speed[1], 0.25, 2, 0.05, (v) => (cfg.speed[1] = v || 1))),
      row(T("r2"), num(cfg.speed[2], 0.25, 2, 0.05, (v) => (cfg.speed[2] = v || 1))),
      row(T("r3cfg"), T("from"), num(cfg.r3.from, 0.25, 2, 0.05, (v) => (cfg.r3.from = v || 1)), T("to"), num(cfg.r3.to, 0.25, 2, 0.05, (v) => (cfg.r3.to = v || 1)),
        T("passes"), num(cfg.r3.passes, 1, 10, 1, (v) => (cfg.r3.passes = Math.max(1, v | 0)))),
      row(T("r4"), num(cfg.speed[4], 0.25, 2, 0.05, (v) => (cfg.speed[4] = v || 1))),
      ));

    // Backup
    const file = el("input", { type: "file", accept: "application/json,.json", style: "display:none", onchange: () => file.files[0] && importData(file.files[0]) });
    root.append(section("data", A("dataT"),
      el("p", { className: "hint", textContent: A("exportHint") }),
      el("div", { className: "transport" }, el("button", { textContent: "⬇ " + A("exportB"), onclick: exportData }),
        el("button", { textContent: "⬆ " + A("importB"), onclick: () => file.click() }), file)));
    window.scrollTo(0, keepScroll);
  }

  // ---------- Start-up ----------
  function go(text) {
    const id = ytId(text);
    if (!id) { S.msg = A("badLink"); render(); return false; }
    loadVideo(id);
    return true;
  }
  $("#form").onsubmit = (e) => { e.preventDefault(); if (go($("#url").value)) $("#url").value = ""; };
  $("#paste").onclick = async () => { try { $("#url").value = await navigator.clipboard.readText(); $("#form").requestSubmit(); } catch { $("#url").focus(); } };
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

  // ?v=ID (reload), or a link shared to the installed app (?url= / ?text=)
  const qs = new URLSearchParams(location.search);
  render();
  const first = qs.get("v") || qs.get("url") || qs.get("text") || qs.get("title");
  if (first && cfg.onboarded) go(first);
})();
