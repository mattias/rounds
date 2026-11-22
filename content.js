(() => {
  if (window.__yrLoaded) return;
  window.__yrLoaded = true;

  const SITE = location.hostname.includes("netflix") ? "netflix" : "youtube";

  // ---------- i18n (UI: English / 日本語) ----------
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
      mask: "Cover subtitles", maskUnit: "% of height (YouTube bar; Netflix hides its own subtitles)",
      from: "from", to: "to", passes: "passes",
      r3cfg: "Round 3 speed ramp", edit: "Edit blocks", save: "Save", fromDesc: "Get chapters from description",
      noChapters: "No chapters found in the description.",
      format: "One per line:  0:00 - 3:36 Name   (or chapters:  0:00 Name)",
      keys: "Alt+1–4 round · Alt+←/→ block · Alt+R replay · Alt+M mark clip",
      gemini: "Gemini", geminiTip: "Open Gemini in a side window", lang: "Language",
      copyPrompt: "Copy prompt", copied: "Prompt copied. Paste it into Gemini.",
      langs: "Languages", target: "I am learning", native: "My language (feedback)",
      subs: "Subtitles", noSubs: "No subtitles captured yet. In Netflix, turn on subtitles in the language you study, then reload the episode.",
      track: (l, n) => `${l || "?"} · ${n} lines`, dlSrt: "Download .srt",
      needSubs: "No subtitles captured, so the prompt cannot include them. See Subtitles.",
      subsCopiedHint: "Prompt with full subtitles copied. Paste it into Gemini.",
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
      mask: "字幕を隠す", maskUnit: "％（高さ。YouTubeはバー、Netflixは字幕自体を非表示）",
      from: "開始", to: "終了", passes: "回数",
      r3cfg: "ラウンド3の速度ランプ", edit: "ブロックを編集", save: "保存", fromDesc: "概要欄のチャプターを取得",
      noChapters: "概要欄にチャプターが見つかりません。",
      format: "1行に1つ：  0:00 - 3:36 名前  （チャプター形式： 0:00 名前）",
      keys: "Alt+1–4 ラウンド · Alt+←/→ ブロック · Alt+R もう一度 · Alt+M クリップ",
      gemini: "Gemini", geminiTip: "Geminiを別ウィンドウで開く", lang: "言語",
      copyPrompt: "プロンプトをコピー", copied: "コピーしました。Geminiに貼り付けてください。",
      langs: "言語", target: "学習している言語", native: "自分の言語（解説・フィードバック）",
      subs: "字幕", noSubs: "字幕をまだ取得していません。Netflixで学習言語の字幕をオンにして、エピソードを再読み込みしてください。",
      track: (l, n) => `${l || "?"} · ${n}行`, dlSrt: ".srtをダウンロード",
      needSubs: "字幕が取得できていないため、プロンプトに含められません。「字幕」を確認してください。",
      subsCopiedHint: "字幕全文つきのプロンプトをコピーしました。Geminiに貼り付けてください。",
    },
  };
  let lang = (navigator.language || "en").toLowerCase().startsWith("ja") ? "ja" : "en";
  const T = (k, ...a) => {
    const v = I18N[lang][k];
    return typeof v === "function" ? v(...a) : v;
  };

  // Languages offered in the settings (free text is accepted too).
  const LANGS = [
    ["ja", "Japanese"], ["en", "English"], ["sv", "Swedish"], ["zh", "Chinese"], ["ko", "Korean"],
    ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["it", "Italian"], ["pt", "Portuguese"],
    ["ru", "Russian"], ["ar", "Arabic"], ["hi", "Hindi"], ["nl", "Dutch"], ["pl", "Polish"],
    ["tr", "Turkish"], ["th", "Thai"], ["vi", "Vietnamese"], ["id", "Indonesian"], ["fi", "Finnish"],
    ["da", "Danish"], ["no", "Norwegian"], ["uk", "Ukrainian"], ["he", "Hebrew"], ["el", "Greek"],
    ["cs", "Czech"], ["hu", "Hungarian"], ["ro", "Romanian"],
  ];
  const codeOf = (name) => {
    const n = String(name || "").trim().toLowerCase();
    const f = LANGS.find(([c, nm]) => nm.toLowerCase() === n || c === n);
    return f ? f[0] : null;
  };

  // ---------- Defaults ----------
  const DEFAULT_CFG = {
    speed: { 1: 0.85, 2: 1.0, 4: 1.0 },
    r3: { from: 0.9, to: 1.0, passes: 4 },
    maskH: 24,
    loop: false,
    lang: null,
    langs: { target: "Japanese", native: "English" },
  };
  const ROUND_MASK = { 1: true, 2: false, 3: false, 4: true };
  const ROUND_CC = { 1: false, 2: true, 3: null, 4: false }; // null = leave as is (YouTube only)

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
  const fmtH = (s) => {
    s = Math.max(0, Math.floor(s));
    return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  };
  const fmtSrt = (s) => {
    const ms = Math.round((s % 1) * 1000), t = Math.floor(s);
    return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)},${String(ms).padStart(3, "0")}`;
  };
  const vidFromPath = (p) =>
    SITE === "netflix" ? (String(p).match(/\/watch\/(\d+)/) || [])[1] || null : null;
  const vidId = () =>
    SITE === "netflix" ? vidFromPath(location.pathname)
      : location.pathname === "/watch" ? new URLSearchParams(location.search).get("v") : null;
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
    tracks: new Map(), trackSel: null, lock: 0,
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

  // ---------- Player control ----------
  const pageCmd = (op, extra = {}) => window.postMessage({ source: "yr-cmd", op, ...extra }, "*");
  const seekTo = (t) => (SITE === "netflix" ? pageCmd("seek", { t }) : (video().currentTime = t));
  const playV = () => (SITE === "netflix" ? pageCmd("play") : video().play());
  const pauseV = () => (SITE === "netflix" ? pageCmd("pause") : video()?.pause());

  // ---------- Subtitles (Netflix) ----------
  const CJK = /[぀-ヿ㐀-鿿＀-￯]/;
  function joinLines(lines) {
    let out = "";
    for (const raw of lines) {
      const l = raw.trim();
      if (!l) continue;
      if (out && !(CJK.test(out.slice(-1)) || CJK.test(l[0]))) out += " ";
      out += l;
    }
    return out;
  }
  function ttmlTime(v, tick, fps) {
    if (v == null) return null;
    v = String(v).trim();
    let m = v.match(/^(\d+(?:\.\d+)?)(h|ms|m|s|f|t)$/);
    if (m) {
      const n = parseFloat(m[1]);
      return { h: n * 3600, m: n * 60, s: n, ms: n / 1000, t: n / tick, f: n / fps }[m[2]];
    }
    m = v.match(/^(\d+):(\d\d):(\d\d)(?:[.,](\d+)|:(\d+))?$/);
    if (m) {
      let t = +m[1] * 3600 + +m[2] * 60 + +m[3];
      if (m[4]) t += parseFloat("0." + m[4]);
      if (m[5]) t += +m[5] / fps;
      return t;
    }
    return null;
  }
  function nodeText(n) {
    if (n.nodeType === 3) return n.nodeValue;
    if (n.nodeType !== 1) return "";
    const name = n.localName.toLowerCase();
    if (name === "br") return "\n";
    if (name === "rt" || name === "rp") return ""; // ruby readings
    return Array.from(n.childNodes).map(nodeText).join("");
  }
  function parseTTML(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const root = doc.documentElement;
    if (!root || doc.getElementsByTagName("parsererror").length) return null;
    const tick = parseFloat(root.getAttribute("ttp:tickRate")) || 10000000;
    const fps = parseFloat(root.getAttribute("ttp:frameRate")) || 30;
    const lg = root.getAttribute("xml:lang") || root.getAttributeNS("http://www.w3.org/XML/1998/namespace", "lang") || "";
    const cues = [];
    for (const p of Array.from(doc.getElementsByTagName("p"))) {
      const b = ttmlTime(p.getAttribute("begin"), tick, fps);
      let e = ttmlTime(p.getAttribute("end"), tick, fps);
      const d = ttmlTime(p.getAttribute("dur"), tick, fps);
      if (e == null && b != null && d != null) e = b + d;
      if (b == null || e == null) continue;
      const text = joinLines(nodeText(p).split(/\r?\n/));
      if (text) cues.push({ s: b, e, text });
    }
    cues.sort((a, b) => a.s - b.s);
    return { lang: lg.split(/[-_]/)[0].toLowerCase() || null, cues };
  }
  function vttTime(s) {
    const m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/);
    return m ? (+(m[1] || 0)) * 3600 + +m[2] * 60 + +m[3] + parseFloat("0." + m[4]) : null;
  }
  function parseVTT(text) {
    const cues = [];
    for (const block of text.replace(/^﻿/, "").split(/\r?\n\r?\n+/)) {
      const lines = block.split(/\r?\n/);
      const i = lines.findIndex((l) => l.includes("-->"));
      if (i < 0) continue;
      const t = lines[i].match(/^\s*([\d:.,]+)\s*-->\s*([\d:.,]+)/);
      if (!t) continue;
      const b = vttTime(t[1]), e = vttTime(t[2]);
      if (b == null || e == null) continue;
      const body = joinLines(lines.slice(i + 1).join("\n").replace(/<[^>]*>/g, "").split(/\n/));
      if (body) cues.push({ s: b, e, text: body });
    }
    cues.sort((a, b) => a.s - b.s);
    return { lang: null, cues };
  }
  function guessLang(cues) {
    let kana = 0, han = 0, hangul = 0, cyr = 0, latin = 0;
    for (const c of cues.slice(0, 200)) for (const ch of c.text) {
      if (/[぀-ヿ]/.test(ch)) kana++;
      else if (/[㐀-鿿]/.test(ch)) han++;
      else if (/[가-힯]/.test(ch)) hangul++;
      else if (/[Ѐ-ӿ]/.test(ch)) cyr++;
      else if (/[A-Za-z]/.test(ch)) latin++;
    }
    if (kana > 5) return "ja";
    if (hangul > 5) return "ko";
    if (han > 5) return "zh";
    if (cyr > 5) return "ru";
    return latin > 20 ? "latin" : null;
  }
  function addTrack(m) {
    if (SITE !== "netflix" || !S.vid || vidFromPath(m.path) !== S.vid) return;
    let r;
    try { r = m.format === "ttml" ? parseTTML(m.body) : parseVTT(m.body); } catch { return; }
    if (!r || r.cues.length < 3) return;
    S.tracks.set(m.url, { url: m.url, lang: r.lang || guessLang(r.cues), cues: r.cues });
    if (!S.trackSel || !S.tracks.has(S.trackSel)) S.trackSel = autoTrack();
    else if (codeOf(S.cfg.langs.target) && S.tracks.get(m.url).lang === codeOf(S.cfg.langs.target)) S.trackSel = m.url;
    scheduleRender();
  }
  function autoTrack() {
    const want = codeOf(S.cfg.langs.target);
    const all = [...S.tracks.values()];
    return (all.find((t) => t.lang === want) || all.sort((a, b) => b.cues.length - a.cues.length)[0])?.url || null;
  }
  addEventListener("message", (ev) => {
    const d = ev.data;
    if (ev.source === window && d && d.source === "yr-page" && d.kind === "subs") addTrack(d);
  });
  let renderTimer;
  function scheduleRender() { clearTimeout(renderTimer); renderTimer = setTimeout(render, 150); }

  const curTrack = () => S.tracks.get(S.trackSel) || null;
  const subsText = (t) => t.cues.map((c) => `[${fmtH(c.s)}] ${c.text}`).join("\n");
  const toSrt = (t) => t.cues.map((c, i) => `${i + 1}\n${fmtSrt(c.s)} --> ${fmtSrt(c.e)}\n${c.text}\n`).join("\n");
  function videoTitle() {
    const t = $('[data-uia="video-title"]')?.innerText?.replace(/\s*\n\s*/g, " · ").trim();
    return t || document.title.replace(/\s*[-|–]\s*Netflix\s*$/i, "").trim() || "Netflix";
  }
  function downloadSrt() {
    const t = curTrack();
    if (!t) { S.msg = T("needSubs"); return render(); }
    const a = el("a", { href: URL.createObjectURL(new Blob([toSrt(t)], { type: "text/plain" })),
      download: `${videoTitle().replace(/[\\/:*?"<>|]+/g, " ").slice(0, 80)}.${t.lang || "sub"}.srt` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
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
    if (want == null || SITE !== "youtube") return;
    const btn = $(".ytp-subtitles-button");
    if (!btn || btn.style.display === "none") return;
    if ((btn.getAttribute("aria-pressed") === "true") !== want) btn.click();
  }
  function applyView() {
    const hide = S.on && S.active && ROUND_MASK[S.round];
    if (SITE === "netflix") {
      document.documentElement.toggleAttribute("data-yr-hide-subs", !!hide);
      return;
    }
    const mask = $("#yr-mask");
    if (!mask) return;
    mask.style.display = hide ? "block" : "none";
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
    S.lock = Date.now() + 600; // Netflix seeks asynchronously: ignore the old position meanwhile
    seekTo(seg.s);
    v.playbackRate = rateFor();
    playV();
    applyView();
  }
  function halt() {
    pauseV();
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
    if (Date.now() < S.lock) return;
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
    if (S.vid) store.set(SITE + ":" + S.vid, { on: S.on, text: S.text, clips: S.clips });
  }
  function saveCfg() { store.set("cfg", S.cfg); }

  // ---------- Gemini prompt ----------
  // The study language and the user's own language are inserted; instructions come in English or Japanese.
  const PROMPTS = {
    en: (p) => `You are my ${p.target} listening-comprehension and conversation coach. I will give you a video link and/or subtitles in ${p.target}. Your job is to help me break the video down and quiz me hard on the content, until I can listen to it and understand everything without subtitles.

Write all explanations, headings and feedback in ${p.native}. Write the quiz questions in natural, everyday ${p.target}.

Do the following when I send the material:

1. **Analyse the material and split it into blocks:**
   - Read the transcript/subtitles and split the video into natural thematic blocks of about 3–5 minutes each (with exact timestamps and a short title in ${p.native}).
   - Briefly point out what makes this particular video hard to hear (e.g. fast spoken-language sentences, specialised vocabulary, dialect, or OCR/ASR errors in the subtitles).

2. **Start the quiz for Block 1 (entirely in ${p.target}):**
   - Ask 4 questions in natural, everyday ${p.target} that matches the tone of the video (casual or polite, no stiff textbook language):
     - Question 1: Ask me to summarise the block in my own words (active recall).
     - Questions 2–4: Ask detail and nuance questions that test whether I truly understood causality, motives, irony or key lines (not just surface keywords).
   - Do NOT reveal the answers in advance.

3. **After I have answered in ${p.target}:**
   - Correct my listening comprehension (if I misunderstood anything in the video) and give natural feedback on my ${p.target} (grammar, word choice, nuance).
   - Refer to exact timestamps and lines from the subtitles for everything I missed or misunderstood, and break down difficult sentence structures.
   - When we are done with Block 1, move on to Block 2 with the same setup.

${p.tail}`,
    ja: (p) => `あなたは私の${p.target}リスニング・会話コーチです。${p.target}の動画リンクや字幕を渡しますので、動画を分解して内容を徹底的に確認する手伝いをしてください。字幕なしで聞いてすべて理解できるようになるまで、厳しく問いかけてください。

解説・見出し・フィードバックはすべて${p.native}で書いてください。クイズの質問は自然な日常の${p.target}で書いてください。

資料を送ったら、次のことをしてください。

1. **資料を分析してブロックに分ける：**
   - 書き起こし／字幕を読み、動画を3〜5分ほどの自然なテーマ別ブロックに分けてください（正確なタイムスタンプと、${p.native}の短い見出しを付けてください）。
   - この動画が聞き取りにくい理由を簡潔に挙げてください（例：速い話し言葉の文、専門用語、方言、字幕のOCR／音声認識の誤りなど）。

2. **ブロック1のクイズを始める（すべて${p.target}で）：**
   - 動画のトーンに合わせて、自然な日常の${p.target}（くだけた表現または丁寧な表現）で4つ質問してください。教科書のような硬い表現は避けてください。
     - 質問1：このブロックの内容を自分の言葉でまとめるよう求めてください（アクティブ・リコール）。
     - 質問2〜4：因果関係、動機、皮肉、重要なセリフを本当に理解できたかを確かめる、詳細やニュアンスの質問をしてください（表面的なキーワードだけでは答えられないもの）。
   - 答えは先に教えないでください。

3. **私が${p.target}で答えたあと：**
   - 聞き取りの間違い（動画の内容の誤解）を訂正し、私の${p.target}（文法、語の選び方、ニュアンス）に自然なフィードバックをください。
   - 聞き逃した点や誤解した点については、字幕の正確なタイムスタンプとセリフを示し、難しい文の構造を分解して説明してください。
   - ブロック1が終わったら、同じ形式でブロック2に進んでください。

${p.tail}`,
  };
  const TAILS = {
    en: { link: "Here is the video I want to work on now:", subs: "Here are the full subtitles I want to work on now" },
    ja: { link: "これから取り組む動画はこちらです：", subs: "これから取り組む動画の字幕全文はこちらです" },
  };
  async function copyPrompt(pl) {
    const { target, native } = S.cfg.langs;
    let tail;
    if (SITE === "netflix") {
      const t = curTrack();
      if (!t) { S.msg = T("needSubs"); return render(); }
      tail = `${TAILS[pl].subs} (${videoTitle()}; ${t.lang || target}; "[h:mm:ss] line"):\n\n${subsText(t)}`;
    } else {
      tail = `${TAILS[pl].link}\nhttps://www.youtube.com/watch?v=${S.vid}`;
    }
    const text = PROMPTS[pl]({ target, native, tail });
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = el("textarea", { value: text, style: "position:fixed;opacity:0" });
      document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    S.msg = SITE === "netflix" ? T("subsCopiedHint") : T("copied");
    render();
  }

  // ---------- UI ----------
  let panel, tab;
  const uiHost = () => {
    const f = document.fullscreenElement;
    return f && f.tagName !== "VIDEO" ? f : document.body;
  };
  addEventListener("fullscreenchange", () => {
    const h = uiHost();
    if (panel) h.append(panel);
    if (tab) h.append(tab);
  });

  function buildTab() {
    tab?.remove();
    tab = el("button", { id: "yr-tab", onclick: () => { S.on = true; saveVid(); mount(); } });
    uiHost().append(tab);
  }

  function mount() {
    panel?.remove(); panel = null;
    if (!S.on) { buildTab(); tab.textContent = T("tab"); applyView(); return; }
    tab?.remove(); tab = null;
    panel = el("div", { id: "yr-panel" });
    uiHost().append(panel);
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
  const langInput = (key) => {
    const i = el("input", { type: "text", value: S.cfg.langs[key], style: "width:120px" });
    i.setAttribute("list", "yr-langs");
    i.onchange = () => {
      S.cfg.langs[key] = i.value.trim() || DEFAULT_CFG.langs[key];
      saveCfg();
      if (key === "target") S.trackSel = autoTrack();
      render();
    };
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

    const head = el("div", { className: "yr-head" },
      el("b", { textContent: T("title") }),
      el("button", { textContent: T("gemini"), title: T("geminiTip"), onclick: () =>
        chrome.runtime.sendMessage({ type: "gemini", availW: screen.availWidth, availH: screen.availHeight }) }),
      el("button", { className: "yr-ic", textContent: lang === "ja" ? "EN" : "日本語", title: T("lang"), onclick: () => {
        lang = lang === "ja" ? "en" : "ja"; S.cfg.lang = lang; saveCfg(); render(); } }),
      el("button", { className: "yr-ic", textContent: "–", title: T("min"), onclick: () => panel.classList.toggle("yr-min") }),
      el("button", { className: "yr-ic", textContent: "✕", title: T("off"), onclick: () => { S.on = false; S.active = false; saveVid(); pauseV(); applyView(); mount(); } }),
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

    // Gemini prompt (+ subtitles on Netflix)
    body.append(el("div", { className: "yr-row" },
      el("button", { textContent: "📋 " + T("copyPrompt") + " EN", onclick: () => copyPrompt("en") }),
      el("button", { textContent: "📋 日本語", onclick: () => copyPrompt("ja") })));
    if (SITE === "netflix") {
      const tracks = [...S.tracks.values()];
      const row = el("div", { className: "yr-row" });
      if (!tracks.length) row.append(el("div", { className: "yr-hint", textContent: T("noSubs") }));
      else {
        const sel = el("select", { className: "yr-grow", onchange: () => { S.trackSel = sel.value; render(); } });
        tracks.forEach((t) => sel.append(el("option", { value: t.url, selected: t.url === S.trackSel, textContent: T("track", t.lang, t.cues.length) })));
        row.append(el("span", { className: "yr-sec", textContent: T("subs") }), sel,
          el("button", { textContent: "⬇ " + T("dlSrt"), onclick: downloadSrt }));
      }
      body.append(row);
    }

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
    const dl = el("datalist", { id: "yr-langs" });
    LANGS.forEach(([, n]) => dl.append(el("option", { value: n })));
    d.append(
      dl,
      el("div", { className: "yr-sec", textContent: T("langs") }),
      el("div", { className: "yr-row" }, T("target"), langInput("target")),
      el("div", { className: "yr-row" }, T("native"), langInput("native")),
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
      SITE === "youtube" ? el("button", { textContent: T("fromDesc"), onclick: () => {
        const txt = $("ytd-watch-metadata #description-inline-expander, #description")?.innerText || "";
        const lines = txt.split("\n").filter((l) => /^\d+(:\d+){1,2}\s+\S/.test(l.trim()));
        if (!lines.length) { S.msg = T("noChapters"); return render(); }
        ta.value = lines.join("\n"); } }) : ""));
    d.open = !!openDetails[0] || !S.blocks.length;
    body.append(d, el("div", { className: "yr-hint", textContent: T("keys") }));

    panel.append(head, body);
  }

  // ---------- Shortcuts ----------
  addEventListener("keydown", (e) => {
    if (!S.on || !e.altKey || e.ctrlKey || e.metaKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    const k = e.key;
    if (["1", "2", "3", "4"].includes(k)) { e.preventDefault(); S.round = Number(k); S.cur >= 0 ? start(S.cur, S.round) : render(); }
    else if (k === "ArrowRight") { e.preventDefault(); start(Math.min(S.blocks.length - 1, S.cur + 1)); }
    else if (k === "ArrowLeft") { e.preventDefault(); start(Math.max(0, S.cur - 1)); }
    else if (k.toLowerCase() === "r") { e.preventDefault(); if (S.cur >= 0) start(S.cur); }
    else if (k.toLowerCase() === "m") { e.preventDefault(); markClip(); }
  }, true);

  // ---------- Per-video init (both sites are SPAs) ----------
  function ensureMask() {
    if (SITE !== "youtube") return;
    const player = $("#movie_player");
    if (!player || $("#yr-mask")) return;
    player.append(el("div", { id: "yr-mask" }));
  }
  async function init() {
    const id = vidId();
    if (!id) {
      panel?.remove(); tab?.remove(); panel = tab = null; S.vid = null; S.active = false; applyView(); return;
    }
    if (id === S.vid) return;
    S.vid = id; S.cur = -1; S.active = false; S.markStart = null; S.msg = null; S.tracks = new Map(); S.trackSel = null;
    const cfg = await store.get("cfg");
    if (cfg) S.cfg = { ...DEFAULT_CFG, ...cfg, speed: { ...DEFAULT_CFG.speed, ...cfg.speed }, r3: { ...DEFAULT_CFG.r3, ...cfg.r3 }, langs: { ...DEFAULT_CFG.langs, ...cfg.langs } };
    if (S.cfg.lang) lang = S.cfg.lang;
    // YouTube records used the key "vid:<id>" in 0.2.x; keep reading them.
    const saved = (await store.get(SITE + ":" + id)) || (SITE === "youtube" ? await store.get("vid:" + id) : null);
    S.on = !!saved?.on;
    S.text = saved?.text ?? "";
    S.clips = saved?.clips ?? {};
    if (S.on) for (let i = 0; i < 50 && !(video()?.duration > 0); i++) await new Promise((r) => setTimeout(r, 200));
    if (id !== S.vid) return;
    S.blocks = parseBlocks(S.text);
    mount();
    if (SITE === "netflix") pageCmd("replay");
  }
  addEventListener("yt-navigate-finish", init);
  setInterval(init, 700); // Netflix has no navigation event; also a safety net on YouTube
  init();
})();
