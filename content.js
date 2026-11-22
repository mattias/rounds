(() => {
  if (window.__yrLoaded) return;
  window.__yrLoaded = true;

  // ---------- i18n (English / 日本語) ----------
  const I18N = {
    en: {
      tab: "Rounds", title: "YT Rounds", off: "Turn off for this video", min: "Collapse", settings: "Settings",
      r1: "1 · Blind listen", r2: "2 · Parse", r3: "3 · Shadowing", r4: "4 · Receipt",
      loop: "Loop", prev: "Previous block", next: "Next block", replay: "Replay block", stop: "Stop",
      blocks: "Blocks", noBlocks: "No blocks yet. Open Settings and add some.",
      clips: "Clips (round 3)", markClip: "Mark clip", markHint: "Press once at the start, once at the end.",
      noClips: "No clips: round 3 uses the whole block.",
      clipStart: (t) => `Clip start ${t}. Press again at the end.`,
      pick: "Pick a block and a round.", stopped: "Stopped.",
      status: (b, r, x) => `Block ${b} · Round ${r} · ${x}x`,
      status3: (c, p, n) => ` · clip ${c} · pass ${p}/${n}`,
      mask: "Cover subtitles", maskUnit: "% of height", from: "from", to: "to", passes: "passes",
      r3cfg: "Round 3 speed ramp", edit: "Edit blocks", save: "Save", fromDesc: "Get chapters from description",
      noChapters: "No chapters found in the description.",
      format: "One per line:  0:00 - 3:36 Name   (or chapters:  0:00 Name)",
      keys: "Alt+1–4 round · Alt+←/→ block · Alt+R replay · Alt+M mark clip",
      gemini: "Gemini", geminiTip: "Open Gemini in a side window", lang: "Language",
      copyPrompt: "Copy Gemini prompt", copied: "Prompt copied. Paste it into Gemini.",
    },
    ja: {
      tab: "ラウンド", title: "YTラウンド", off: "この動画ではオフ", min: "たたむ", settings: "設定",
      r1: "1 · ブラインド", r2: "2 · 構文分解", r3: "3 · シャドーイング", r4: "4 · 確認",
      loop: "ループ", prev: "前のブロック", next: "次のブロック", replay: "もう一度", stop: "停止",
      blocks: "ブロック", noBlocks: "ブロックがありません。設定から追加してください。",
      clips: "クリップ（ラウンド3）", markClip: "クリップを記録", markHint: "開始と終了で1回ずつ押します。",
      noClips: "クリップなし：ラウンド3はブロック全体を使います。",
      clipStart: (t) => `クリップ開始 ${t}。終了位置でもう一度押してください。`,
      pick: "ブロックとラウンドを選んでください。", stopped: "停止中",
      status: (b, r, x) => `ブロック${b} · ラウンド${r} · ${x}倍速`,
      status3: (c, p, n) => ` · クリップ${c} · ${p}/${n}回目`,
      mask: "字幕を隠す", maskUnit: "％（高さ）", from: "開始", to: "終了", passes: "回数",
      r3cfg: "ラウンド3の速度ランプ", edit: "ブロックを編集", save: "保存", fromDesc: "概要欄のチャプターを取得",
      noChapters: "概要欄にチャプターが見つかりません。",
      format: "1行に1つ：  0:00 - 3:36 名前  （チャプター形式： 0:00 名前）",
      keys: "Alt+1–4 ラウンド · Alt+←/→ ブロック · Alt+R もう一度 · Alt+M クリップ",
      gemini: "Gemini", geminiTip: "Geminiを別ウィンドウで開く", lang: "言語",
      copyPrompt: "Gemini用プロンプトをコピー", copied: "コピーしました。Geminiに貼り付けてください。",
    },
  };
  let lang = (navigator.language || "en").toLowerCase().startsWith("ja") ? "ja" : "en";
  const T = (k, ...a) => {
    const v = I18N[lang][k];
    return typeof v === "function" ? v(...a) : v;
  };

  // ---------- Defaults ----------
  const DEFAULT_CFG = {
    speed: { 1: 0.85, 2: 1.0, 4: 1.0 },
    r3: { from: 0.9, to: 1.0, passes: 4 },
    maskH: 24,
    loop: false,
    lang: null,
  };
  const ROUND_MASK = { 1: true, 2: false, 3: false, 4: true };
  const ROUND_CC = { 1: false, 2: true, 3: null, 4: false }; // null = leave as is

  // ---------- Helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const video = () => $("video.html5-main-video") || $("video");
  const pad = (n) => String(n).padStart(2, "0");
  const toSec = (t) => t.split(":").reduce((a, x) => a * 60 + Number(x), 0);
  const fmt = (s) => {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
  };
  const vidId = () => new URLSearchParams(location.search).get("v");
  const store = {
    get: (k) => new Promise((r) => chrome.storage.local.get(k, (o) => r(o[k]))),
    set: (k, v) => chrome.storage.local.set({ [k]: v }),
  };
  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...kids);
    return e;
  };

  // ---------- State ----------
  const S = {
    vid: null, on: false, text: "", blocks: [], clips: {}, cfg: structuredClone(DEFAULT_CFG),
    cur: -1, round: 1, active: false, pass: 0, clip: 0, markStart: null, msg: null,
  };

  // "0:00 - 3:36 Name"  or chapters "0:00 Name" (ends where the next begins)
  function parseBlocks(text) {
    const dur = video()?.duration || 1e9;
    const out = [];
    for (const line of text.split(/\r?\n/)) {
      const l = line.trim();
      if (!l) continue;
      let m = l.match(/^(\d+(?::\d+){1,2})\s*[-–—~]\s*(\d+(?::\d+){1,2})\s*(.*)$/);
      if (m) { out.push({ s: toSec(m[1]), e: toSec(m[2]), label: m[3] || "" }); continue; }
      m = l.match(/^(\d+(?::\d+){1,2})\s+(.*)$/);
      if (m) out.push({ s: toSec(m[1]), e: null, label: m[2] });
    }
    out.forEach((b, i) => { if (b.e == null) b.e = out[i + 1] ? out[i + 1].s : dur; });
    return out;
  }

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
    if (S.round !== 3) return S.cfg.speed[S.round];
    const { from, to, passes } = S.cfg.r3;
    return passes <= 1 ? to : from + ((to - from) * S.pass) / (passes - 1);
  }
  function setCC(want) {
    if (want == null) return;
    const btn = $(".ytp-subtitles-button");
    if (!btn || btn.style.display === "none") return;
    if ((btn.getAttribute("aria-pressed") === "true") !== want) btn.click();
  }
  function applyView() {
    const mask = $("#yr-mask");
    if (!mask) return;
    mask.style.display = S.on && S.active && ROUND_MASK[S.round] ? "block" : "none";
    mask.style.height = S.cfg.maskH + "%";
  }
  function start(i, round) {
    if (!video() || !S.blocks[i]) return;
    if (round) S.round = round;
    S.cur = i; S.pass = 0; S.clip = 0; S.active = true; S.msg = null;
    seekPlay();
    setCC(ROUND_CC[S.round]);
    render();
  }
  function seekPlay() {
    const v = video(), seg = segment();
    if (!v || !seg) return;
    v.currentTime = seg.s;
    v.playbackRate = rateFor();
    v.play();
    applyView();
  }
  function halt() {
    video()?.pause();
    S.active = false;
    applyView();
    render();
  }
  function onEnd() {
    if (S.round === 3) {
      const cs = S.clips[S.cur] || [];
      S.pass++;
      if (S.pass >= S.cfg.r3.passes) {
        S.pass = 0;
        if (S.clip + 1 < cs.length) S.clip++;
        else if (S.cfg.loop) S.clip = 0;
        else return halt();
      }
      seekPlay();
    } else if (S.cfg.loop) seekPlay();
    else return halt();
    render();
  }
  setInterval(() => {
    const v = video();
    if (!S.on || !S.active || !v) return;
    const seg = segment();
    if (!seg) return;
    const bar = $(".yr-blk.yr-on .yr-prog");
    if (bar) bar.style.width = Math.min(100, Math.max(0, ((v.currentTime - seg.s) / (seg.e - seg.s)) * 100)) + "%";
    if (!v.paused && v.currentTime >= seg.e - 0.05) onEnd();
  }, 80);

  // ---------- Clips ----------
  function markClip() {
    const v = video();
    if (!v || S.cur < 0) { S.msg = T("pick"); return render(); }
    if (S.markStart == null) {
      S.markStart = v.currentTime;
      S.msg = T("clipStart", fmt(S.markStart));
    } else {
      const s = Math.min(S.markStart, v.currentTime), e = Math.max(S.markStart, v.currentTime);
      S.markStart = null; S.msg = null;
      if (e - s > 0.5) { (S.clips[S.cur] ||= []).push({ s, e }); saveVid(); }
    }
    render();
  }
  function saveVid() {
    if (S.vid) store.set("vid:" + S.vid, { on: S.on, text: S.text, clips: S.clips });
  }
  function saveCfg() { store.set("cfg", S.cfg); }

  // ---------- Gemini prompt (EN / JA) ----------
  const PROMPTS = {
    en: (url) => `You are my Japanese listening-comprehension and conversation coach. I will give you a YouTube link and/or a subtitle file (.srt / .ass) in Japanese. Your job is to help me break the video down and quiz me hard on the content, until I can listen to it and understand everything without subtitles.

Do the following when I send the material:

1. **Analyse the material and split it into blocks:**
   - Read the transcript/subtitle file and split the video into natural thematic blocks of about 3–5 minutes each (with exact timestamps and a short title in English).
   - Briefly point out what makes this particular video hard to hear (e.g. fast spoken-language sentences, specialised vocabulary, dialect, or OCR/ASR errors in the subtitles).

2. **Start the quiz for Block 1 (entirely in Japanese):**
   - Ask 4 questions in natural, everyday Japanese (casual or 丁寧語 depending on the tone of the video, no stiff textbook language):
     - Question 1: Ask me to summarise the block in my own words (active recall).
     - Questions 2–4: Ask detail and nuance questions that test whether I truly understood causality, motives, irony or key lines (not just surface keywords).
   - Do NOT reveal the answers in advance.

3. **After I have answered in Japanese:**
   - Correct my listening comprehension (if I misunderstood anything in the video) and give natural feedback on my Japanese (grammar, word choice, nuance).
   - Refer to exact timestamps and lines from the subtitles for everything I missed or misunderstood, and break down difficult sentence structures.
   - When we are done with Block 1, move on to Block 2 with the same setup.

Here is the video/subtitles I want to work on now:
${url}`,
    ja: (url) => `あなたは私の日本語リスニング・会話コーチです。日本語のYouTubeリンクや字幕ファイル（.srt / .ass）を渡しますので、動画を分解して内容を徹底的に確認する手伝いをしてください。字幕なしで聞いてすべて理解できるようになるまで、厳しく問いかけてください。

資料を送ったら、次のことをしてください。

1. **資料を分析してブロックに分ける：**
   - 書き起こし／字幕ファイルを読み、動画を3〜5分ほどの自然なテーマ別ブロックに分けてください（正確なタイムスタンプと、日本語の短い見出しを付けてください）。
   - この動画が聞き取りにくい理由を簡潔に挙げてください（例：速い話し言葉の文、専門用語、方言、字幕のOCR／音声認識の誤りなど）。

2. **ブロック1のクイズを始める（すべて日本語で）：**
   - 動画のトーンに合わせて、自然な日常的な日本語（くだけた表現または丁寧語）で4つ質問してください。教科書のような硬い表現は避けてください。
     - 質問1：このブロックの内容を自分の言葉でまとめるよう求めてください（アクティブ・リコール）。
     - 質問2〜4：因果関係、動機、皮肉、重要なセリフを本当に理解できたかを確かめる、詳細やニュアンスの質問をしてください（表面的なキーワードだけでは答えられないもの）。
   - 答えは先に教えないでください。

3. **私が日本語で答えたあと：**
   - 聞き取りの間違い（動画の内容の誤解）を訂正し、私の日本語（文法、語の選び方、ニュアンス）に自然なフィードバックをください。
   - 聞き逃した点や誤解した点については、字幕の正確なタイムスタンプとセリフを示し、難しい文の構造を分解して説明してください。
   - ブロック1が終わったら、同じ形式でブロック2に進んでください。

これから取り組む動画／字幕はこちらです：
${url}`,
  };
  async function copyPrompt(l) {
    const text = PROMPTS[l](`https://www.youtube.com/watch?v=${S.vid}`);
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = el("textarea", { value: text, style: "position:fixed;opacity:0" });
      document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    S.msg = T("copied"); render();
  }

  // ---------- UI ----------
  let panel, tab;

  function buildTab() {
    tab?.remove();
    tab = el("button", { id: "yr-tab", onclick: () => { S.on = true; saveVid(); mount(); } });
    document.body.append(tab);
  }

  function mount() {
    panel?.remove(); panel = null;
    if (!S.on) { buildTab(); tab.textContent = T("tab"); applyView(); return; }
    tab?.remove(); tab = null;
    panel = el("div", { id: "yr-panel" });
    document.body.append(panel);
    render();
    ensureMask();
    applyView();
  }

  function dragify(panelEl, handle) {
    handle.onmousedown = (e) => {
      if (e.target.closest("button")) return;
      const r = panelEl.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      const mv = (ev) => { panelEl.style.left = ev.clientX - dx + "px"; panelEl.style.top = ev.clientY - dy + "px"; panelEl.style.right = "auto"; };
      const up = () => { removeEventListener("mousemove", mv); removeEventListener("mouseup", up); };
      addEventListener("mousemove", mv); addEventListener("mouseup", up);
    };
  }

  const numInput = (val, min, max, step, on) => {
    const i = el("input", { type: "number", min, max, step, value: val });
    i.onclick = (e) => e.stopPropagation();
    i.onchange = () => on(Number(i.value));
    return i;
  };

  function render() {
    if (!panel) return;
    const keepMin = panel.classList.contains("yr-min");
    const openDetails = [...panel.querySelectorAll("details")].map((d) => d.open);
    const editVal = $("#yr-text", panel)?.value;
    const pos = { l: panel.style.left, t: panel.style.top, r: panel.style.right };
    panel.replaceChildren();
    panel.className = keepMin ? "yr-min" : "";
    if (pos.l) { panel.style.left = pos.l; panel.style.top = pos.t; panel.style.right = pos.r; }

    // Header
    const head = el("div", { className: "yr-head" },
      el("b", { textContent: T("title") }),
      el("button", { textContent: T("gemini"), title: T("geminiTip"), onclick: () =>
        chrome.runtime.sendMessage({ type: "gemini", availW: screen.availWidth, availH: screen.availHeight }) }),
      el("button", { className: "yr-ic", textContent: lang === "ja" ? "EN" : "日本語", title: T("lang"), onclick: () => {
        lang = lang === "ja" ? "en" : "ja"; S.cfg.lang = lang; saveCfg(); render(); } }),
      el("button", { className: "yr-ic", textContent: "–", title: T("min"), onclick: () => panel.classList.toggle("yr-min") }),
      el("button", { className: "yr-ic", textContent: "✕", title: T("off"), onclick: () => { S.on = false; S.active = false; saveVid(); video()?.pause?.(); mount(); } }),
    );
    dragify(panel, head);

    const body = el("div", { className: "yr-body" });

    // Rounds
    const rounds = el("div", { className: "yr-rounds" });
    for (const r of [1, 2, 3, 4]) {
      const sp = el("span", { className: "yr-sp" });
      if (r === 3) sp.textContent = `${S.cfg.r3.from}→${S.cfg.r3.to}x`;
      else sp.append(numInput(S.cfg.speed[r], 0.25, 2, 0.05, (v) => {
        S.cfg.speed[r] = v || 1; saveCfg(); if (S.active && S.round === r) video().playbackRate = rateFor(); }), "x");
      rounds.append(el("div", { className: "yr-r" + (S.round === r ? " yr-on" : ""),
        onclick: () => { S.round = r; S.cur >= 0 ? start(S.cur, r) : render(); } },
        el("b", { textContent: T("r" + r) }), sp));
    }
    body.append(rounds);

    // Transport
    body.append(el("div", { className: "yr-row" },
      el("button", { textContent: "⏮", title: T("prev"), onclick: () => start(Math.max(0, S.cur - 1)) }),
      el("button", { textContent: "↻", title: T("replay"), onclick: () => S.cur >= 0 && start(S.cur) }),
      el("button", { textContent: "⏭", title: T("next"), onclick: () => start(Math.min(S.blocks.length - 1, S.cur + 1)) }),
      el("button", { textContent: "⏹", title: T("stop"), onclick: halt }),
      el("span", { className: "yr-grow" }),
      el("button", { className: S.cfg.loop ? "yr-on" : "", textContent: "🔁 " + T("loop"),
        onclick: () => { S.cfg.loop = !S.cfg.loop; saveCfg(); render(); } }),
    ));

    body.append(el("div", { className: "yr-row" },
      el("button", { textContent: "📋 " + T("copyPrompt") + " EN", onclick: () => copyPrompt("en") }),
      el("button", { textContent: "📋 日本語", onclick: () => copyPrompt("ja") })));

    // Status
    const b = S.blocks[S.cur];
    let st = S.msg;
    if (!st) {
      if (b && S.active) {
        st = T("status", S.cur + 1, S.round, rateFor().toFixed(2));
        if (S.round === 3) st += T("status3", Math.min(S.clip + 1, Math.max(1, (S.clips[S.cur] || []).length)), S.pass + 1, S.cfg.r3.passes);
      } else st = b ? T("stopped") : T("pick");
    }
    body.append(el("div", { className: "yr-status", textContent: st }));

    // Blocks
    body.append(el("div", { className: "yr-sec", textContent: T("blocks") }));
    const bl = el("div", { className: "yr-list" });
    S.blocks.forEach((blk, i) => bl.append(el("button", { className: "yr-blk" + (i === S.cur ? " yr-on" : ""), onclick: () => start(i) },
      el("span", { textContent: blk.label || `${T("blocks")} ${i + 1}` }),
      el("small", { textContent: `${fmt(blk.s)}–${fmt(blk.e)}` }),
      el("div", { className: "yr-prog" }))));
    if (!S.blocks.length) bl.append(el("div", { className: "yr-hint", textContent: T("noBlocks") }));
    body.append(bl);

    // Clips
    body.append(el("div", { className: "yr-sec", textContent: T("clips") }));
    const cl = el("div", { className: "yr-list" });
    const cs = S.clips[S.cur] || [];
    cs.forEach((c, i) => cl.append(el("div", { className: "yr-clip" },
      el("button", { className: S.round === 3 && S.active && i === S.clip ? "yr-on" : "", textContent: `${i + 1}: ${fmt(c.s)}–${fmt(c.e)}`,
        onclick: () => { S.round = 3; S.clip = i; S.pass = 0; S.active = true; seekPlay(); setCC(ROUND_CC[3]); render(); } }),
      el("button", { className: "yr-ic", textContent: "✕", onclick: () => { cs.splice(i, 1); S.clip = 0; saveVid(); render(); } }))));
    if (!cs.length) cl.append(el("div", { className: "yr-hint", textContent: T("noClips") }));
    body.append(cl,
      el("div", { className: "yr-row" }, el("button", { textContent: "＋ " + T("markClip") + " (Alt+M)", onclick: markClip })),
      el("div", { className: "yr-hint", textContent: T("markHint") }));

    // Settings
    const d = el("details", {});
    d.append(el("summary", { textContent: "⚙ " + T("settings") }));
    d.append(
      el("div", { className: "yr-sec", textContent: T("r3cfg") }),
      el("div", { className: "yr-row" },
        T("from"), numInput(S.cfg.r3.from, 0.25, 2, 0.05, (v) => { S.cfg.r3.from = v; saveCfg(); render(); }),
        T("to"), numInput(S.cfg.r3.to, 0.25, 2, 0.05, (v) => { S.cfg.r3.to = v; saveCfg(); render(); }),
        T("passes"), numInput(S.cfg.r3.passes, 1, 10, 1, (v) => { S.cfg.r3.passes = Math.max(1, v | 0); saveCfg(); render(); })),
      el("div", { className: "yr-sec", textContent: T("mask") }),
      el("div", { className: "yr-row" }, numInput(S.cfg.maskH, 0, 60, 2, (v) => { S.cfg.maskH = v; saveCfg(); applyView(); }), T("maskUnit")),
      el("div", { className: "yr-sec", textContent: T("edit") }),
      el("div", { className: "yr-hint", textContent: T("format") }),
    );
    const ta = el("textarea", { id: "yr-text", value: editVal ?? S.text });
    d.append(ta, el("div", { className: "yr-row" },
      el("button", { textContent: T("save"), onclick: () => {
        S.text = ta.value; S.blocks = parseBlocks(S.text); S.cur = -1; S.active = false; saveVid(); render(); } }),
      el("button", { textContent: T("fromDesc"), onclick: () => {
        const txt = $("ytd-watch-metadata #description-inline-expander, #description")?.innerText || "";
        const lines = txt.split("\n").filter((l) => /^\d+(:\d+){1,2}\s+\S/.test(l.trim()));
        if (!lines.length) { S.msg = T("noChapters"); return render(); }
        ta.value = lines.join("\n"); } })));
    d.open = !!openDetails[0] || !S.blocks.length;
    body.append(d, el("div", { className: "yr-hint", textContent: T("keys") }));

    panel.append(head, body);
  }

  // ---------- Shortcuts ----------
  addEventListener("keydown", (e) => {
    if (!S.on || !e.altKey || e.ctrlKey || e.metaKey) return;
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    const k = e.key;
    if (["1", "2", "3", "4"].includes(k)) { e.preventDefault(); S.round = Number(k); S.cur >= 0 ? start(S.cur, S.round) : render(); }
    else if (k === "ArrowRight") { e.preventDefault(); start(Math.min(S.blocks.length - 1, S.cur + 1)); }
    else if (k === "ArrowLeft") { e.preventDefault(); start(Math.max(0, S.cur - 1)); }
    else if (k.toLowerCase() === "r") { e.preventDefault(); if (S.cur >= 0) start(S.cur); }
    else if (k.toLowerCase() === "m") { e.preventDefault(); markClip(); }
  }, true);

  // ---------- Per-video init (YouTube is a SPA) ----------
  function ensureMask() {
    const player = $("#movie_player");
    if (!player || $("#yr-mask")) return;
    player.append(el("div", { id: "yr-mask" }));
  }
  async function init() {
    const id = vidId();
    if (location.pathname !== "/watch" || !id) {
      panel?.remove(); tab?.remove(); panel = tab = null; S.vid = null; return;
    }
    if (id === S.vid) return;
    S.vid = id; S.cur = -1; S.active = false; S.markStart = null; S.msg = null;
    const cfg = await store.get("cfg");
    if (cfg) S.cfg = { ...DEFAULT_CFG, ...cfg, speed: { ...DEFAULT_CFG.speed, ...cfg.speed }, r3: { ...DEFAULT_CFG.r3, ...cfg.r3 } };
    if (S.cfg.lang) lang = S.cfg.lang;
    const saved = await store.get("vid:" + id);
    S.on = !!saved?.on;
    S.text = saved?.text ?? "";
    S.clips = saved?.clips ?? {};
    if (S.on) for (let i = 0; i < 50 && !(video()?.duration > 0); i++) await new Promise((r) => setTimeout(r, 200));
    if (id !== S.vid) return;
    S.blocks = parseBlocks(S.text);
    mount();
  }
  addEventListener("yt-navigate-finish", init);
  init();
})();
