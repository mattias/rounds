(() => {
  if (window.__yrLoaded) return;
  window.__yrLoaded = true;

  const { mergeCfg, makeT, codeOf } = YR;
  const SITE = location.hostname.includes("netflix") ? "netflix" : "youtube";

  // Which rounds show the cover bars / hide subtitles, and the CC state wanted (YouTube only; null = leave).
  const ROUND_COVER = { 1: true, 2: false, 3: false, 4: true };
  const ROUND_CC = { 1: false, 2: true, 3: null, 4: false };

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
    const t = Math.floor(s), ms = Math.round((s - t) * 1000);
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
    vid: null, on: false, text: "", blocks: [], clips: {}, cfg: mergeCfg(null),
    cur: -1, round: 1, active: false, pass: 0, clip: 0, markStart: null, msg: null,
    tracks: new Map(), trackSel: null, lock: 0,
  };
  let T = makeT(S.cfg.uiLang);
  function applyCfg(c) {
    S.cfg = mergeCfg(c);
    T = makeT(S.cfg.uiLang);
  }

  // Tolerant block parser. Accepts what Gemini (or a person) tends to write, one block per line:
  //   0:00 - 3:36 Name              00:00:16 – 00:04:29 | Title        Block 1, 0:00:16 – 0:04:29, Title
  //   | 1 | 0:16 – 4:29 | Title |  * **Block 1 (`00:00 – 03:36`):** Title    1. 0:16-4:29 Title
  //   0:00 Name  (chapters: ends where the next begins)
  // Header rows without times are skipped. Times are m:ss or h:mm:ss; separators - – — ~ 〜 → to.
  const TIME = "\\d{1,2}(?::\\d{1,2}){1,2}(?:[.,]\\d+)?";
  const RANGE_RE = new RegExp(`(${TIME})\\s*(?:[-–—―~〜～→]|->|to|until|から)\\s*(${TIME})`, "i");
  const SINGLE_RE = new RegExp(`^\\W{0,6}(${TIME})\\b`);
  const clean = (s) => s.replace(/[`*_#>|]/g, " ").replace(/\s+/g, " ").replace(/^[\s:：,，;\-–—.)\]]+|[\s:：,，;\-–—.([]+$/g, "").trim();
  function labelFrom(rest, before) {
    // Pieces on both sides of the time range, split on table/CSV separators.
    // Commas only separate the part before the times ("ブロック 1,0:00 – 1:00,Title"); the title keeps its own commas.
    const cells = [...before.split(/[|\t,，]/), ...rest.split(/[|\t]/)].map(clean).filter(Boolean);
    return cells.join(" · ");
  }
  function parseBlocks(text) {
    const dur = video()?.duration || 1e9;
    const out = [];
    for (const raw of text.split(/\r?\n/)) {
      const l = raw.replace(/\([^()]*?(\d{1,2}(?::\d{1,2}){1,2})\s*(?:[-–—~〜→]|to)\s*[^()]*?\)/g, (m) => m.replace(/[()]/g, " ")).trim();
      if (!l) continue;
      let m = l.match(RANGE_RE);
      if (m) {
        const idx = m.index;
        const label = labelFrom(l.slice(idx + m[0].length), l.slice(0, idx));
        out.push({ s: toSec(m[1].replace(",", ".")), e: toSec(m[2].replace(",", ".")), label });
        continue;
      }
      m = l.match(SINGLE_RE);
      if (m) out.push({ s: toSec(m[1].replace(",", ".")), e: null, label: clean(l.slice(m[0].length)) });
    }
    out.forEach((b, i) => { if (b.e == null) b.e = out[i + 1] ? out[i + 1].s : dur; });
    return out.filter((b) => b.e > b.s);
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

  // ---------- Cover bars ----------
  const uiHost = () => {
    const f = document.fullscreenElement;
    return f && f.tagName !== "VIDEO" ? f : document.body;
  };
  function ensureBars() {
    const host = SITE === "youtube" ? $("#movie_player") : uiHost();
    if (!host) return;
    for (const pos of ["top", "bottom"]) {
      let b = $("#yr-bar-" + pos);
      if (!b) b = el("div", { id: "yr-bar-" + pos, className: "yr-bar " + SITE });
      if (b.parentElement !== host) host.append(b);
    }
  }
  function placeBars() {
    if (SITE !== "netflix") return;
    const v = video();
    if (!v) return;
    const r = v.getBoundingClientRect(), b = S.cfg.bars;
    const top = $("#yr-bar-top"), bot = $("#yr-bar-bottom");
    if (top) Object.assign(top.style, { left: r.left + "px", width: r.width + "px", top: r.top + "px", height: (r.height * b.top) / 100 + "px" });
    if (bot) {
      const h = (r.height * b.bottom) / 100;
      Object.assign(bot.style, { left: r.left + "px", width: r.width + "px", top: r.bottom - h + "px", height: h + "px" });
    }
  }
  function applyView() {
    const cover = S.on && S.active && ROUND_COVER[S.round];
    document.documentElement.toggleAttribute("data-yr-hide-subs", SITE === "netflix" && !!cover);
    ensureBars();
    const b = S.cfg.bars;
    for (const pos of ["top", "bottom"]) {
      const bar = $("#yr-bar-" + pos);
      if (!bar) continue;
      bar.style.display = cover && b[pos] > 0 ? "block" : "none";
      if (SITE === "youtube") bar.style.height = b[pos] + "%";
    }
    placeBars();
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
    // a clip looped on its own keeps going at the ramp's final speed
    return passes <= 1 ? to : from + ((to - from) * Math.min(S.pass, passes - 1)) / (passes - 1);
  }
  function setCC(want) {
    if (want == null || SITE !== "youtube") return;
    const btn = $(".ytp-subtitles-button");
    if (!btn || btn.style.display === "none") return;
    if ((btn.getAttribute("aria-pressed") === "true") !== want) btn.click();
  }
  function start(i, round) {
    if (!video() || !S.blocks[i]) return;
    if (round) S.round = round;
    S.cur = i; S.pass = 0; S.clip = 0; S.solo = false; S.editClip = null; S.confirmDel = null; S.markStart = null; S.active = true; S.msg = null;
    seekPlay();
    setCC(ROUND_CC[S.round]);
    render();
  }
  // Fine-tune a clip's start or end. If that clip is looping, the loop restarts at once so you hear the change.
  function setClipEdge(i, edge, value) {
    const c = (S.clips[S.cur] || [])[i];
    if (!c || !isFinite(value)) return;
    const MIN = 0.3, dur = video()?.duration;
    value = Math.max(0, Math.round(value * 100) / 100);
    if (edge === "s") c.s = Math.min(value, c.e - MIN);
    else c.e = Math.max(value, c.s + MIN);
    if (isFinite(dur) && c.e > dur) c.e = dur;
    saveVid();
    if (S.active && S.round === 3 && S.clip === i) seekPlay();
    render();
  }
  function clipEditor(i, c) {
    const wrap = el("div", { className: "yr-edit" });
    for (const [edge, label] of [["s", T("clipStartL")], ["e", T("clipEndL")]]) {
      const nudge = (d) => el("button", { textContent: (d > 0 ? "+" : "") + d, onclick: () => setClipEdge(i, edge, c[edge] + d) });
      wrap.append(el("div", { className: "yr-row" }, el("span", { textContent: label, style: "min-width:38px" }),
        nudge(-0.5), nudge(-0.1), el("b", { textContent: c[edge].toFixed(1), style: "min-width:44px;text-align:center" }), nudge(0.1), nudge(0.5),
        el("button", { textContent: T("clipNow"), onclick: () => setClipEdge(i, edge, video().currentTime) })));
    }
    // Deleting is kept away from replay/edit and needs a second, explicit confirmation.
    wrap.append(S.confirmDel === i
      ? el("div", { className: "yr-row" }, el("span", { textContent: T("clipDelAsk") }),
        el("button", { className: "yr-danger", textContent: T("clipDelYes"), onclick: () => deleteClip(i) }),
        el("button", { textContent: T("clipDelNo"), onclick: () => { S.confirmDel = null; render(); } }))
      : el("button", { className: "yr-danger-o", textContent: "🗑 " + T("clipDel"), onclick: () => { S.confirmDel = i; render(); } }));
    return wrap;
  }
  function deleteClip(i) {
    const list = S.clips[S.cur] || [];
    if (S.active && S.round === 3 && S.clip === i) { pauseV(); S.active = false; applyView(); }
    list.splice(i, 1);
    // The clip that is selected (or looping) must stay the same one when an earlier clip disappears.
    if (S.clip > i) S.clip--;
    else if (S.clip === i) S.clip = 0;
    if (S.clip >= list.length) S.clip = Math.max(0, list.length - 1);
    S.editClip = null; S.confirmDel = null;
    saveVid();
    render();
  }
  // Tap a clip: loop it (until you stop it). Tap it again: stop. Tap another clip while looping: switch to that one.
  function tapClip(i) {
    if (S.round === 3 && S.active && S.clip === i) return halt();
    replayClip(i);
  }
  // Start a clip over from its beginning (back to the ramp's first speed), whether or not it is looping now.
  function replayClip(i) {
    S.round = 3; S.clip = i; S.pass = 0; S.solo = true; S.active = true; S.markStart = null; S.msg = null;
    seekPlay();
    setCC(ROUND_CC[3]);
    render();
  }
  // The main "replay" button: the clip you are working on if there is one, otherwise the block.
  function replayCurrent() {
    if (S.round === 3 && S.solo && (S.clips[S.cur] || [])[S.clip]) return replayClip(S.clip);
    if (S.cur >= 0) start(S.cur);
  }
  function seekPlay() {
    const v = video(), seg = segment();
    if (!v || !seg) return;
    S.lock = Date.now() + 600; // Netflix seeks asynchronously: ignore the old position meanwhile
    S.seekWait = Date.now() + 4000; // ...and until the position has really moved back, a late seek must not count as "end reached"
    seekTo(seg.s);
    v.playbackRate = rateFor();
    playV();
    applyView();
  }
  function halt() {
    pauseV();
    S.active = false; S.msg = null;
    applyView();
    render();
  }
  function onEnd() {
    if (S.round === 3) {
      const cs = S.clips[S.cur] || [];
      S.pass++;
      if (!S.solo && S.pass >= S.cfg.r3.passes) {
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
    placeBars();
    const seg = segment();
    if (!seg) return;
    const bar = $(".yr-blk.yr-on .yr-prog");
    if (bar) bar.style.width = Math.min(100, Math.max(0, ((v.currentTime - seg.s) / (seg.e - seg.s)) * 100)) + "%";
    if (Date.now() < S.lock) return;
    if (S.seekWait) { // the seek back to the start may be slow: wait until we really are back before looking for the end again
      if (v.currentTime >= seg.e - 0.2 && Date.now() < S.seekWait) return;
      S.seekWait = 0;
    }
    // A block whose end is unknown (chapter without end) or beyond the video ends with the video.
    const endAt = Math.min(seg.e, v.duration > 0 ? v.duration - 0.1 : Infinity) - 0.05;
    if ((!v.paused || v.ended) && v.currentTime >= endAt) onEnd();
  }, 80);

  // ---------- Clips ----------
  const blockAt = (t) => S.blocks.findIndex((b) => t >= b.s && t < b.e);
  function addClip(s, e) {
    const list = (S.clips[S.cur] ||= []);
    const keep = list[S.clip]; // the selected / looping clip stays the same one after the sort
    list.push({ s, e });
    list.sort((a, b) => a.s - b.s); // keep the clips in video order
    if (keep) S.clip = list.indexOf(keep);
    S.editClip = null; S.confirmDel = null;
    saveVid();
  }
  // Clips are stored per block number, but each clip has its own absolute time: put every clip into the block
  // it lies in (the nearest one if none does), so editing the block list never moves clips to the wrong block.
  function remapClips(blocks, clips) {
    if (!blocks.length) return clips;
    const out = {};
    for (const list of Object.values(clips || {})) {
      if (!Array.isArray(list)) continue;
      for (const c of list) {
        let j = blocks.findIndex((b) => c.s >= b.s - 0.5 && c.s < b.e);
        if (j < 0) {
          let best = Infinity;
          blocks.forEach((b, i) => { const d = Math.min(Math.abs(c.s - b.s), Math.abs(c.s - b.e)); if (d < best) { best = d; j = i; } });
        }
        (out[j] ||= []).push(c);
      }
    }
    for (const l of Object.values(out)) l.sort((a, b) => a.s - b.s);
    return out;
  }
  // Marking stops the loop, so the video plays on and you can reach the end of the sentence (and the next sentences).
  // No block needs to be picked first: the block is found from where you are.
  // While a loop is running, the first press only stops it and plays on from the end of the clip,
  // so the next press can mark the start of the next sentence (not a spot inside the looped one).
  function releaseLoop() {
    // Only a real clip loop is released. In round 3 without clips the "segment" is the whole block, and
    // jumping to its end would throw you out of the block.
    if (!(S.active && S.round === 3 && S.markStart == null && (S.clips[S.cur] || []).length)) return false;
    const seg = segment();
    S.active = false; applyView();
    if (seg) { S.lock = Date.now() + 600; seekTo(seg.e); playV(); }
    S.msg = T("loopReleased");
    render();
    return true;
  }
  function markClip() {
    const v = video();
    if (!v || !isFinite(v.currentTime)) return;
    if (releaseLoop()) return;
    if (S.cur < 0) {
      const i = blockAt(v.currentTime);
      if (i < 0) { S.msg = T("pick"); return render(); }
      S.cur = i;
    }
    if (S.markStart == null) {
      S.markStart = v.currentTime;
      S.active = false; applyView();
      S.msg = T("clipStart", fmt(S.markStart));
    } else {
      const s = Math.min(S.markStart, v.currentTime), e = Math.max(S.markStart, v.currentTime);
      S.markStart = null; S.msg = null;
      if (e - s > 0.5) { addClip(s, e); S.msg = T("clipAdded", S.clips[S.cur].length); }
    }
    render();
  }
  // With subtitles (Netflix): the whole spoken line as a clip, in one press.
  function clipLine() {
    const v = video(), tr = curTrack();
    if (!v) return;
    if (!tr || !tr.cues.length) { S.msg = T("needSubs"); return render(); }
    if (releaseLoop()) return;
    if (S.cur < 0) {
      const i = blockAt(v.currentTime);
      if (i < 0) { S.msg = T("pick"); return render(); }
      S.cur = i;
    }
    const t = v.currentTime;
    let c = tr.cues.find((x) => t >= x.s && t < x.e);
    if (!c) c = tr.cues.reduce((a, x) => (Math.abs(x.s - t) < Math.abs(a.s - t) ? x : a), tr.cues[0]);
    const s = Math.max(0, c.s - 0.15), e = Math.max(c.e + 0.15, s + 0.5); // never shorter than half a second
    const list = (S.clips[S.cur] ||= []);
    if (!list.some((x) => Math.abs(x.s - s) < 0.3 && Math.abs(x.e - e) < 0.3)) addClip(s, e);
    S.active = false; applyView();
    S.msg = T("clipAdded", S.clips[S.cur].length);
    render();
  }
  function saveVid() {
    if (S.vid) store.set(SITE + ":" + S.vid, { on: S.on, text: S.text, clips: S.clips });
  }
  function saveCfg() { store.set("cfg", S.cfg); }

  // ---------- Recent videos (listed in the toolbar popup) ----------
  // Only videos where the panel is switched on; the last 10, newest first.
  const HIST_MAX = 10;
  function pageTitle() {
    if (SITE === "netflix") return videoTitle();
    return (document.title || "").replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube\s*$/i, "").trim();
  }
  async function touchHistory() {
    if (!S.vid || !S.on) return;
    const o = await new Promise((r) => chrome.storage.local.get("history", r));
    const all = Array.isArray(o.history) ? o.history : [];
    const old = all.find((e) => e.site === SITE && e.id === S.vid);
    let title = pageTitle();
    if (!title || /^netflix$/i.test(title)) title = old?.title || ""; // Netflix often shows only its name
    const next = [{ site: SITE, id: S.vid, title, ts: Date.now() }, ...all.filter((e) => !(e.site === SITE && e.id === S.vid))].slice(0, HIST_MAX);
    chrome.storage.local.set({ history: next });
  }
  function rememberVideo() {
    const id = S.vid;
    touchHistory();
    for (const ms of [3000, 9000]) setTimeout(() => { if (S.vid === id) touchHistory(); }, ms); // the title may arrive late
  }

  // ---------- Gemini prompt ----------
  // The study language and the feedback language are inserted; the instructions are English or Japanese.
  const PROMPTS = {
    en: (p) => `You are my ${p.target} listening-comprehension and conversation coach. I will give you a video link and/or subtitles in ${p.target}. Your job is to help me break the video down and quiz me hard on the content, until I can listen to it and understand everything without subtitles.

Write all explanations, headings and feedback in ${p.native}. Write the quiz questions in natural, everyday ${p.target}.

Do the following when I send the material:

1. **Analyse the material and split it into blocks:**
   - Read the transcript/subtitles and split the video into natural thematic blocks of about 3–5 minutes each (with exact timestamps and a short title in ${p.native}).
   - Briefly point out what makes this particular video hard to hear (e.g. fast spoken-language sentences, specialised vocabulary, dialect, or OCR/ASR errors in the subtitles).
   - Give the block list as ONE code block, exactly one block per line in this format, with nothing else inside the code block (no header row, no numbering, no bold):
     \`\`\`
     h:mm:ss - h:mm:ss | Short title in ${p.native}
     \`\`\`
     Example line: \`0:00:16 - 0:04:29 | Morning meeting\`

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
   - ブロック一覧は**1つのコードブロック**にまとめ、1行に1ブロックで、次の形式にしてください。コードブロックの中には他のもの（見出し行、番号、太字など）を入れないでください：
     \`\`\`
     h:mm:ss - h:mm:ss | ${p.native}の短い見出し
     \`\`\`
     例：\`0:00:16 - 0:04:29 | 朝の集合\`

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
  async function copyPrompt() {
    const pl = S.cfg.promptIn === "ja" ? "ja" : "en";
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
    S.msg = SITE === "netflix" ? T("subsCopied") : T("copied");
    render();
  }

  // ---------- UI ----------
  let panel, tab;
  addEventListener("fullscreenchange", () => {
    const h = uiHost();
    if (panel) h.append(panel);
    if (tab) h.append(tab);
    if (SITE === "netflix") ensureBars();
  });

  function buildTab() {
    tab?.remove(); tab = null;
    // The tab can be turned off in the toolbar popup; videos can still be switched on from there.
    if (S.cfg.onboarded && !S.cfg.showTab) return;
    tab = el("button", { id: "yr-tab", textContent: T("tab"), onclick: () => {
      if (!S.cfg.onboarded) { chrome.runtime.sendMessage({ type: "openOptions" }); return; }
      S.on = true; saveVid(); mount();
    } });
    uiHost().append(tab);
  }

  function mount() {
    panel?.remove(); panel = null;
    if (!S.on) { buildTab(); applyView(); return; }
    tab?.remove(); tab = null;
    panel = el("div", { id: "yr-panel" });
    uiHost().append(panel);
    render();
    applyView();
    rememberVideo();
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

  function render() {
    if (!panel) return;
    const keepMin = panel.classList.contains("yr-min");
    const pos = { l: panel.style.left, t: panel.style.top, r: panel.style.right };
    panel.replaceChildren();
    panel.className = keepMin ? "yr-min" : "";
    if (pos.l) { panel.style.left = pos.l; panel.style.top = pos.t; panel.style.right = pos.r; }

    const head = el("div", { className: "yr-head" },
      el("b", { textContent: T("title") }),
      el("button", { className: "yr-ic", textContent: "✦", title: T("gemini") + ": " + T("geminiTip"), onclick: () =>
        chrome.runtime.sendMessage({ type: "gemini", availW: screen.availWidth, availH: screen.availHeight }) }),
      el("button", { className: "yr-ic", textContent: "–", title: T("min"), onclick: () => panel.classList.toggle("yr-min") }),
      el("button", { className: "yr-ic", textContent: "✕", title: T("off"), onclick: () => { S.on = false; S.active = false; saveVid(); pauseV(); applyView(); mount(); } }),
    );
    dragify(panel, head);

    const body = el("div", { className: "yr-body" });

    // Rounds
    const rounds = el("div", { className: "yr-rounds" });
    for (const r of [1, 2, 3, 4]) {
      const sp = r === 3 ? `${S.cfg.r3.from}→${S.cfg.r3.to}x` : `${S.cfg.speed[r]}x`;
      rounds.append(el("div", { className: "yr-r" + (S.round === r ? " yr-on" : ""),
        onclick: () => { S.round = r; S.cur >= 0 ? start(S.cur, r) : render(); } },
        el("b", { textContent: T("r" + r) }), el("span", { className: "yr-sp", textContent: sp })));
    }
    body.append(rounds);

    // Transport
    body.append(el("div", { className: "yr-row" },
      el("button", { textContent: "⏮", title: T("prev"), onclick: () => start(Math.max(0, S.cur - 1)) }),
      el("button", { textContent: "↻", title: T("replay"), onclick: replayCurrent }),
      el("button", { textContent: "⏭", title: T("next"), onclick: () => start(Math.min(S.blocks.length - 1, S.cur + 1)) }),
      el("button", { textContent: "⏹", title: T("stop"), onclick: halt }),
      el("span", { className: "yr-grow" }),
      el("button", { className: S.cfg.loop ? "yr-on" : "", textContent: "🔁 " + T("loop"),
        onclick: () => { S.cfg.loop = !S.cfg.loop; saveCfg(); render(); } }),
    ));

    // Status
    const b = S.blocks[S.cur];
    let st = S.msg;
    if (!st) {
      if (b && S.active) {
        st = T("status", S.cur + 1, S.round, rateFor().toFixed(2));
        if (S.round === 3) st += T("status3", Math.min(S.clip + 1, Math.max(1, (S.clips[S.cur] || []).length)), Math.min(S.pass + 1, S.cfg.r3.passes), S.cfg.r3.passes);
      } else st = b ? T("stopped") : T("pick");
    }
    body.append(el("div", { className: "yr-status", textContent: st }));

    // Blocks
    const bl = el("div", { className: "yr-list" });
    S.blocks.forEach((blk, i) => bl.append(el("button", { className: "yr-blk" + (i === S.cur ? " yr-on" : ""), onclick: () => start(i) },
      el("span", { textContent: blk.label || `${T("blocks")} ${i + 1}` }),
      el("small", { textContent: `${fmt(blk.s)}–${fmt(blk.e)}` }),
      el("div", { className: "yr-prog" }))));
    if (!S.blocks.length) bl.append(el("div", { className: "yr-hint", textContent: T("noBlocks") }));
    body.append(bl);

    // Clips (round 3 only, or when some exist)
    const cs = S.clips[S.cur] || [];
    if (S.round === 3 || cs.length) {
      body.append(el("div", { className: "yr-sec", textContent: T("clips") }));
      const cl = el("div", { className: "yr-list" });
      cs.forEach((c, i) => {
        cl.append(el("div", { className: "yr-clip" },
          el("button", { className: S.round === 3 && S.active && i === S.clip ? "yr-on" : "", textContent: `${i + 1}: ${fmt(c.s)}–${fmt(c.e)}`,
            title: T("clipTap"), onclick: () => tapClip(i) }),
          el("button", { className: "yr-ic", textContent: "↻", title: T("clipReplay"), onclick: () => replayClip(i) }),
          el("button", { className: "yr-ic" + (S.editClip === i ? " yr-on" : ""), textContent: "✎", title: T("clipEdit"),
            onclick: () => { S.editClip = S.editClip === i ? null : i; S.confirmDel = null; render(); } })));
        if (S.editClip === i) cl.append(clipEditor(i, c));
      });
      if (!cs.length) cl.append(el("div", { className: "yr-hint", textContent: T("noClips") }));
      body.append(cl, el("button", { textContent: "＋ " + T("markClip"), title: "Alt+M", onclick: markClip }));
      if (SITE === "netflix" && curTrack()) body.append(el("button", { textContent: "＋ " + T("clipLine"), onclick: clipLine }));
      body.append(el("div", { className: "yr-hint", textContent: T("clipTap") }), el("div", { className: "yr-hint", textContent: T("markHint") }));
    }

    // Gemini prompt (+ subtitles on Netflix)
    const foot = el("div", { className: "yr-row" }, el("button", { className: "yr-grow", textContent: "📋 " + T("copyPrompt"), onclick: copyPrompt }));
    body.append(foot);
    if (SITE === "netflix") {
      const tracks = [...S.tracks.values()];
      if (!tracks.length) body.append(el("div", { className: "yr-hint", textContent: T("noSubs") }));
      else {
        const sel = el("select", { className: "yr-grow", title: T("subs"), onchange: () => { S.trackSel = sel.value; render(); } });
        tracks.forEach((t) => sel.append(el("option", { value: t.url, selected: t.url === S.trackSel, textContent: T("track", t.lang || "?", t.cues.length) })));
        body.append(el("div", { className: "yr-row" }, sel, el("button", { textContent: "⬇ .srt", title: T("dlSrt"), onclick: downloadSrt })));
      }
    }

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
    else if (k.toLowerCase() === "r") { e.preventDefault(); replayCurrent(); }
    else if (k.toLowerCase() === "m") { e.preventDefault(); markClip(); }
  }, true);

  // ---------- Talking to the toolbar popup ----------
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type === "info") reply({ site: SITE, vid: S.vid, on: S.on, text: S.text });
    else if (msg?.type === "chapters") {
      const txt = $("ytd-watch-metadata #description-inline-expander, #description")?.innerText || "";
      reply({ lines: txt.split("\n").map((l) => l.trim()).filter((l) => /^\d+(:\d+){1,2}\s+\S/.test(l)) });
    }
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    if (ch.cfg) { applyCfg(ch.cfg.newValue); if (S.vid && !S.on) buildTab(); render(); applyView(); }
    const rec = S.vid && ch[SITE + ":" + S.vid];
    if (rec) {
      const v = rec.newValue || {};
      if (typeof v.text === "string" && v.text !== S.text) {
        S.text = v.text; S.blocks = parseBlocks(S.text); S.cur = -1; S.active = false; S.editClip = null; S.confirmDel = null;
        S.clips = remapClips(S.blocks, S.clips); saveVid(); // the block list changed (in the popup): clips follow their time
      }
      if (!!v.on !== S.on) { S.on = !!v.on; mount(); } else render();
    }
  });

  // ---------- Per-video init (both sites are SPAs) ----------
  async function init() {
    const id = vidId();
    if (!id) {
      panel?.remove(); tab?.remove(); panel = tab = null; S.vid = null; S.active = false; applyView(); return;
    }
    if (id === S.vid) return;
    S.vid = id; S.cur = -1; S.active = false; S.markStart = null; S.msg = null; S.tracks = new Map(); S.trackSel = null;
    // Another navigation may start while we wait for storage: every await is followed by a check that this
    // call still belongs to the current video, and only then is anything written into the state.
    const cfg = await store.get("cfg");
    if (id !== S.vid) return;
    applyCfg(cfg);
    // YouTube records used the key "vid:<id>" in 0.2.x; keep reading them.
    const saved = (await store.get(SITE + ":" + id)) || (SITE === "youtube" ? await store.get("vid:" + id) : null);
    if (id !== S.vid) return;
    S.on = !!saved?.on;
    S.text = saved?.text ?? "";
    S.clips = saved?.clips ?? {};
    if (S.on) for (let i = 0; i < 50 && !(video()?.duration > 0); i++) await new Promise((r) => setTimeout(r, 200));
    if (id !== S.vid) return;
    S.blocks = parseBlocks(S.text);
    S.clips = remapClips(S.blocks, S.clips);
    mount();
    if (SITE === "netflix") pageCmd("replay");
  }
  addEventListener("yt-navigate-finish", init);
  setInterval(init, 700); // Netflix has no navigation event; also a safety net on YouTube
  init();
})();
