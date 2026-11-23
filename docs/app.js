// Rounds for mobile: the same rounds as the browser extension, on top of the YouTube IFrame player.
(() => {
  const { LANGS, UI_LANGS, mergeCfg, makeT, codeOf } = YR;
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
      syncT: "Subtitle timing",
      syncHint: "Subtitles too early or too late? Fix it here. It is saved for this file.",
      syncOffset: "Shift (s)",
      syncReset: "Reset",
      syncScale: "Speed correction ×{0}",
      syncLine: "Sync to a line you hear",
      syncNearest: "Line at current position",
      syncHere: "This line is playing now",
      syncOne: "Shifted. For drift, play on, pick a line much later in the video and press the button again.",
      syncTwo: "Synced with both shift and speed.",
      syncAuto: "Automatic",
      syncAutoRef: "Match the embedded track",
      syncAutoListen: "Match by listening (about a minute)",
      syncListening: "Listening… {0}%",
      syncCancel: "Cancel",
      syncOk: "Synced: shift {0} s, speed ×{1}",
      syncFail: "No reliable match found. Try the manual sync.",
      syncNoRef: "There is no embedded track to compare with.",
      taglineLocal: "Local player: your own videos and subtitles",
      embeddedT: "embedded",
      scanning: "Reading embedded subtitles… {0}%",
      subsNone: "No subtitles yet. Add an .srt, .vtt or .ass file. Text subtitles inside mkv/mp4 files are found automatically (picture-based ones are not supported).",
      barsLocalOnly: "Used for local files only (YouTube does not allow covering its player). Shown in rounds 1 and 4.",
      localT: "Local",
      pickFiles: "Choose video + subtitles",
      dropHint: "On a computer you can also drop the files here.",
      localHint: "Your own video or audio file, with .srt, .vtt or .ass subtitles. Plays in your browser: mp4 (H.264/AAC) works everywhere, mkv mostly in Chrome on a computer. Nothing is uploaded.",
      localErr: "The browser cannot play this file (format or codec). Converting it to mp4 (H.264/AAC) usually helps.",
      subsT: "Subtitles",
      subsAdd: "Add subtitles / change files",
      encT: "Encoding",
      reopen: "Choose the same file again to continue ({0}).",
      noVideoYet: "Choose a video (or audio) file first.",
      localSubs: "{0} · {1} lines",
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
      syncT: "字幕のタイミング",
      syncHint: "字幕が早い・遅い場合はここで直します。このファイルに保存されます。",
      syncOffset: "ずらし（秒）",
      syncReset: "リセット",
      syncScale: "速度補正 ×{0}",
      syncLine: "聞こえているセリフに合わせる",
      syncNearest: "現在位置のセリフ",
      syncHere: "このセリフが今流れている",
      syncOne: "ずらしました。ズレが広がる場合は、動画のかなり後ろでセリフを選んでもう一度押してください。",
      syncTwo: "ずれと速度の両方を補正しました。",
      syncAuto: "自動",
      syncAutoRef: "内蔵トラックに合わせる",
      syncAutoListen: "音を聞いて合わせる（約1分）",
      syncListening: "聞き取り中… {0}%",
      syncCancel: "キャンセル",
      syncOk: "補正しました：ずらし {0} 秒、速度 ×{1}",
      syncFail: "確かな一致が見つかりませんでした。手動で合わせてください。",
      syncNoRef: "比較できる内蔵トラックがありません。",
      taglineLocal: "ローカルプレーヤー：自分の動画と字幕",
      embeddedT: "内蔵",
      scanning: "内蔵字幕を読み込み中… {0}%",
      subsNone: "字幕がありません。.srt / .vtt / .ass ファイルを追加してください。mkv/mp4内のテキスト字幕は自動で検出されます（画像形式の字幕は非対応）。",
      barsLocalOnly: "ローカルファイルのみで使用します（YouTubeはプレーヤーを覆うことを許可していません）。ラウンド1と4で表示されます。",
      localT: "ローカル",
      pickFiles: "動画と字幕を選ぶ",
      dropHint: "パソコンではファイルをここにドロップすることもできます。",
      localHint: "お持ちの動画・音声ファイルと、.srt / .vtt / .ass の字幕を使えます。ブラウザ内で再生されます。mp4（H.264/AAC）はどこでも、mkvは主にパソコンのChromeで再生できます。何もアップロードされません。",
      localErr: "このファイルはブラウザで再生できません（形式またはコーデック）。mp4（H.264/AAC）に変換すると解決することが多いです。",
      subsT: "字幕",
      subsAdd: "字幕を追加／ファイルを変更",
      encT: "文字コード",
      reopen: "続けるには同じファイルをもう一度選んでください（{0}）。",
      noVideoYet: "まず動画（または音声）ファイルを選んでください。",
      localSubs: "{0} · {1}行",
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
      syncT: "Undertextens timing",
      syncHint: "Undertexten för tidig eller för sen? Fixa det här. Det sparas för den här filen.",
      syncOffset: "Förskjutning (s)",
      syncReset: "Återställ",
      syncScale: "Hastighetskorrigering ×{0}",
      syncLine: "Synka mot en replik du hör",
      syncNearest: "Repliken vid nuvarande plats",
      syncHere: "Den här repliken spelas nu",
      syncOne: "Förskjuten. Vid glidning: spela vidare, välj en replik långt senare i videon och tryck igen.",
      syncTwo: "Synkad med både förskjutning och hastighet.",
      syncAuto: "Automatiskt",
      syncAutoRef: "Matcha mot det inbyggda spåret",
      syncAutoListen: "Matcha genom att lyssna (cirka en minut)",
      syncListening: "Lyssnar… {0}%",
      syncCancel: "Avbryt",
      syncOk: "Synkad: förskjutning {0} s, hastighet ×{1}",
      syncFail: "Hittade ingen säker matchning. Prova den manuella synken.",
      syncNoRef: "Det finns inget inbyggt spår att jämföra med.",
      taglineLocal: "Lokal spelare: dina egna videor och undertexter",
      embeddedT: "inbyggd",
      scanning: "Läser inbyggda undertexter… {0}%",
      subsNone: "Inga undertexter än. Lägg till en .srt-, .vtt- eller .ass-fil. Textundertexter inuti mkv/mp4 hittas automatiskt (bildbaserade stöds inte).",
      barsLocalOnly: "Används bara för lokala filer (YouTube tillåter inte att man täcker spelaren). Visas i runda 1 och 4.",
      localT: "Lokal",
      pickFiles: "Välj video + undertexter",
      dropHint: "På dator kan du också släppa filerna här.",
      localHint: "Din egen video- eller ljudfil, med undertexter i .srt, .vtt eller .ass. Spelas i webbläsaren: mp4 (H.264/AAC) fungerar överallt, mkv mest i Chrome på dator. Inget laddas upp.",
      localErr: "Webbläsaren kan inte spela den här filen (format eller codec). Att konvertera till mp4 (H.264/AAC) hjälper oftast.",
      subsT: "Undertexter",
      subsAdd: "Lägg till undertexter / byt filer",
      encT: "Teckenkodning",
      reopen: "Välj samma fil igen för att fortsätta ({0}).",
      noVideoYet: "Välj först en video- (eller ljud-)fil.",
      localSubs: "{0} · {1} rader",
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
  const saveVid = () => S.vid && setJ(VID_PREFIX + S.vid, { text: S.text, clips: S.clips, ...(S.mode === "local" ? { sync: S.sync } : {}) });

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
  // One state per source: a YouTube video and a local file can both be "open" while you switch tabs.
  const newState = (mode) => ({
    mode, vid: null, text: "", blocks: [], clips: {}, cur: -1, round: 1, active: false, pass: 0, clip: 0,
    markStart: null, msg: null, lock: 0, ready: false, dur: 0, rateSeen: null, noEmbed: false,
    local: null, // local files: { name, url, tracks: [{ name, buf, enc, base, cues, sync }], sel, err }
    sync: {}, // local files: subtitle timing per track name: { offset, scale }
  });
  const states = { youtube: newState("youtube"), local: newState("local") };
  // Inside the browser extension (local.html) the same code runs without YouTube; boot.js shares the storage.
  const EXT = !!(window.chrome && chrome.runtime && chrome.runtime.id);
  let S = EXT ? states.local : states.youtube;
  window.__rounds = { states, get S() { return S; }, get yt() { return yt; } }; // handy for debugging in the console
  const ROUND_COVER = { 1: true, 2: false, 3: false, 4: true }; // rounds that hide text / cover hard-coded subtitles

  // The rounds only need these few operations, so YouTube's player and a plain <video> are interchangeable.
  const lv = () => $("#lv");
  const E = {
    seek: (t) => (S.mode === "local" ? (lv().currentTime = t) : yt.seekTo(t, true)),
    play: () => (S.mode === "local" ? lv().play().catch(() => {}) : yt.playVideo()),
    pause: () => (S.mode === "local" ? lv().pause() : yt && yt.pauseVideo()),
    setRate: (r) => (S.mode === "local" ? (lv().playbackRate = r) : yt.setPlaybackRate(r)),
    rate: () => (S.mode === "local" ? lv().playbackRate : yt.getPlaybackRate()),
    time: () => (S.mode === "local" ? lv().currentTime : yt.getCurrentTime()),
    playing: () => (S.mode === "local" ? !lv().paused && !lv().ended : !!yt && yt.getPlayerState && yt.getPlayerState() === 1),
    ok: () => S.ready && (S.mode === "local" || !!yt),
  };
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
        onReady: () => { states.youtube.ready = true; updateDur(); noteTitle(); render(); },
        onStateChange: (e) => { if (e.data === 1 || e.data === 5) { updateDur(); noteTitle(); } },
        onError: () => { states.youtube.noEmbed = true; render(); },
      },
    });
  }
  function updateDur() {
    const Y = states.youtube;
    const d = yt && yt.getDuration && yt.getDuration();
    if (d > 0 && d !== Y.dur) {
      Y.dur = d;
      if (S === Y) self.__dur = d;
      if (Y.text) Y.blocks = parseBlocks(Y.text);
      render();
    }
  }
  // ---------- History (the last 10 videos) ----------
  const HIST_KEY = "rounds:history", HIST_MAX = 10;
  let view = EXT ? "local" : "player"; // "player" | "local" | "history"
  const getHist = () => (Array.isArray(getJ(HIST_KEY)) ? getJ(HIST_KEY) : []);
  function touchHist(id, extra = {}) {
    const all = getHist(), old = all.find((e) => e.id === id);
    setJ(HIST_KEY, [{ id, title: old?.title || "", ...extra, ts: Date.now() }, ...all.filter((e) => e.id !== id)].slice(0, HIST_MAX));
  }
  function noteTitle() {
    const vd = yt && yt.getVideoData && yt.getVideoData();
    const id = states.youtube.vid;
    if (!vd || !vd.title || vd.video_id !== id) return;
    const all = getHist(), e = all.find((x) => x.id === id);
    if (e && e.title !== vd.title) { e.title = vd.title; setJ(HIST_KEY, all); }
  }
  // Tabs: "player" (YouTube), "local" (own files), "history". Leaving a tab pauses what was playing.
  function setView(v) {
    if (v === view) return;
    if (E.ok() && E.playing()) { E.pause(); S.active = false; }
    view = v;
    if (v === "player") S = states.youtube;
    if (v === "local") S = states.local;
    render();
  }
  function historyView() {
    const all = getHist(), wrap = el("div", { className: "list" });
    if (!all.length) wrap.append(el("p", { className: "hint", textContent: A("histEmpty") }));
    for (const e of all) {
      const rec = getJ(VID_PREFIX + e.id);
      const n = rec && rec.text ? parseBlocks(rec.text).length : 0;
      wrap.append(el("div", { className: "hist" },
        el("button", { className: "histbtn", onclick: () => (e.kind === "local" ? reopenLocal(e) : loadVideo(e.id)) },
          e.kind === "local" ? el("span", { className: "thumb-local", textContent: "🎞" })
            : el("img", { src: `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`, alt: "", loading: "lazy" }),
          el("span", { className: "histtxt" }, el("b", { textContent: e.title || e.id }),
            el("small", { textContent: `${new Date(e.ts).toLocaleDateString(cfg.uiLang)} · ${A("histBlocks", n)}` }))),
        el("button", { textContent: "✕", title: A("histRemove"), onclick: () => { setJ(HIST_KEY, getHist().filter((x) => x.id !== e.id)); render(); } })));
    }
    if (all.length) wrap.append(el("button", { textContent: A("histClear"), onclick: () => { setJ(HIST_KEY, []); render(); } }));
    return wrap;
  }

  function loadVideo(id) {
    touchHist(id);
    S = states.youtube;
    if (id === S.vid && yt && S.ready) { view = "player"; render(); return; }
    if (lv() && !lv().paused) lv().pause();
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

  // ---------- Local files (own video/audio + .srt/.vtt/.ass) ----------
  const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|ogv|ogg|mp3|m4a|aac|wav|flac|opus)$/i;
  const SUB_EXT = /\.(srt|vtt|ass|ssa)$/i;
  const langCode = () => codeOf(cfg.langs.target);
  const subsText = (cues) => cues.map((c) => `[${fmtH(c.s)}] ${c.text.replace(/\n/g, " ")}`).join("\n");
  function fmtH(s) { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`; }
  function cuesAt(cues, t) { // cues are sorted by start; overlapping ones are shown together
    let lo = 0, hi = cues.length - 1, idx = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (cues[m].s <= t) { idx = m; lo = m + 1; } else hi = m - 1; }
    const out = [];
    for (let i = idx; i >= 0 && i > idx - 10; i--) if (cues[i].e > t) out.unshift(cues[i].text);
    return out;
  }
  function addSubFile(name, buf) {
    const L = states.local.local;
    if (!L) return;
    const tr = { name, buf, enc: "auto", cues: [] };
    reparse(tr);
    L.tracks.push(tr);
    L.sel = L.tracks.length - 1;
  }
  function reparse(tr) {
    const d = Subs.decode(tr.buf, tr.enc, langCode());
    tr.used = d.enc;
    tr.base = Subs.parse(d.text, tr.name);
    tr.sync = states.local.sync[tr.name];
    tr.cues = Sync.applySync(tr.base, tr.sync);
  }
  function loadLocalVideo(file) {
    S = states.local;
    if (S.local && S.local.url) URL.revokeObjectURL(S.local.url);
    if (!lv().paused) lv().pause();
    const key = `local:${file.name}|${file.size}`;
    S.vid = key; S.cur = -1; S.active = false; S.msg = null; S.ready = false; S.dur = 0; self.__dur = 0;
    S.local = { name: file.name, url: URL.createObjectURL(file), tracks: [], sel: -1, err: false };
    const rec = getJ(VID_PREFIX + key);
    S.text = rec?.text || ""; S.clips = rec?.clips || {}; S.blocks = []; S.sync = rec?.sync || {};
    touchHist(key, { kind: "local", title: file.name });
    lv().src = S.local.url;
    lv().load();
    view = "local";
    history.replaceState(null, "", location.pathname);
    render();
    scanEmbedded(file);
  }

  // Text subtitles inside mkv/mp4 files (read in the background, with progress)
  const ISO3 = { ja: ["jpn"], en: ["eng"], sv: ["swe"], zh: ["chi", "zho"], yue: ["yue"], ko: ["kor"], es: ["spa"], fr: ["fre", "fra"], de: ["ger", "deu"], it: ["ita"], pt: ["por"], ru: ["rus"], ar: ["ara"], hi: ["hin"], nl: ["dut", "nld"], pl: ["pol"], tr: ["tur"], th: ["tha"], vi: ["vie"], id: ["ind"], fi: ["fin"], da: ["dan"], no: ["nor", "nob", "nno"], uk: ["ukr"] };
  const langMatches = (tl, code) => {
    if (!tl || !code) return false;
    const l = String(tl).toLowerCase();
    return l.split(/[-_]/)[0] === code || (ISO3[code] || []).includes(l.slice(0, 3));
  };
  async function scanEmbedded(file) {
    if (!/\.(mkv|webm|mp4|m4v|mov)$/i.test(file.name)) return;
    const L = S.local;
    L.scan = 0;
    let shown = -1, res = null;
    try {
      res = await Embed.extract(file, {
        cancelled: () => states.local.local !== L,
        onProgress: (p) => { L.scan = p; const step = Math.floor(p * 20); if (step !== shown && states.local.local === L) { shown = step; render(); } },
      });
    } catch { res = null; }
    if (states.local.local !== L) return; // another file was loaded meanwhile
    L.scan = null;
    if (res) {
      for (const t of res.tracks) {
        const name = `${t.lang || "?"}${t.name ? " · " + t.name : ""} (${A("embeddedT")})`;
        const sync = states.local.sync[name];
        L.tracks.push({ name, buf: null, enc: "auto", base: t.cues, sync, cues: Sync.applySync(t.cues, sync), lang: t.lang, embedded: true });
      }
      if (L.sel < 0 && L.tracks.length) { // prefer the study language, then the track with most lines
        const want = langCode(), emb = L.tracks.filter((t) => t.embedded);
        const pool = emb.filter((t) => langMatches(t.lang, want));
        const best = (pool.length ? pool : emb).slice().sort((a, b) => b.cues.length - a.cues.length)[0];
        L.sel = L.tracks.indexOf(best);
      }
    }
    render();
  }
  // ---------- Subtitle timing (local files): by hand, against an embedded track, or by listening ----------
  const CONF_MIN = 4.5; // how clearly the subtitles must match the speech (standard deviations above chance)
  function setTrackSync(tr, sync) {
    const L = states.local, k = (sync && sync.scale) || 1;
    if (!sync || (!sync.offset && k === 1)) delete L.sync[tr.name];
    else L.sync[tr.name] = { offset: +sync.offset.toFixed(3), scale: +k.toFixed(6) };
    tr.sync = L.sync[tr.name];
    tr.cues = Sync.applySync(tr.base, tr.sync);
    saveVid();
  }
  // a further correction  K * shown + c  on top of what is shown now
  const compose = (tr, K, c) => ({ offset: K * ((tr.sync && tr.sync.offset) || 0) + c, scale: K * ((tr.sync && tr.sync.scale) || 1) });
  const nearestCue = (cues, t) => { // the cue whose start is closest to t (you press just after a line begins)
    let lo = 0, hi = cues.length - 1, idx = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (cues[m].s <= t + 1e-6) { idx = m; lo = m + 1; } else hi = m - 1; }
    const next = cues[idx + 1];
    return next && Math.abs(next.s - t) < Math.abs(cues[idx].s - t) ? idx + 1 : idx;
  };
  function syncHere(tr, idx) { // "this line is playing right now" (once, or twice far apart to fix drift too)
    const L = states.local, t = lv().currentTime, b = tr.base[idx].s, a = L.anchor1, k0 = (tr.sync && tr.sync.scale) || 1;
    if (a && Math.abs(b - a.b) > 60) {
      const k = (t - a.t) / (b - a.b);
      if (k > 0.9 && k < 1.1) { setTrackSync(tr, { scale: k, offset: a.t - a.b * k }); L.anchor1 = null; L.syncMsg = A("syncTwo"); return render(); }
    }
    L.anchor1 = { b, t };
    setTrackSync(tr, { scale: k0, offset: t - b * k0 });
    L.syncMsg = A("syncOne");
    render();
  }
  function autoRef(tr) {
    const L = states.local, ref = L.local.tracks.find((t) => t !== tr && t.embedded);
    if (!ref) { L.syncMsg = A("syncNoRef"); return render(); }
    const r = Sync.alignToReference(tr.base, ref.base);
    if (!r) { L.syncMsg = A("syncFail"); return render(); }
    setTrackSync(tr, { offset: r.offset, scale: r.scale });
    L.syncMsg = A("syncOk", r.offset.toFixed(2), r.scale.toFixed(4));
    render();
  }
  // Listening: play a few minutes fast and silent, measure how loud the speech is, compare with when cues are shown.
  let actx = null, tap = null;
  function audioTap() {
    if (tap) return tap;
    const v = lv();
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = actx.createMediaElementSource(v), gain = actx.createGain();
    const hp = actx.createBiquadFilter(), lp = actx.createBiquadFilter(), proc = actx.createScriptProcessor(1024, 1, 1);
    hp.type = "highpass"; hp.frequency.value = 300; lp.type = "lowpass"; lp.frequency.value = 3400; // roughly the speech band
    src.connect(gain); gain.connect(actx.destination); // normal playback goes through here from now on
    src.connect(hp); hp.connect(lp); lp.connect(proc); proc.connect(actx.destination);
    tap = { gain, on: false, vals: [], t0: 0 };
    proc.onaudioprocess = (e) => {
      if (!tap.on) return;
      const d = e.inputBuffer.getChannelData(0);
      let s = 0;
      for (let i = 0; i < d.length; i++) s += d[i] * d[i];
      if (!tap.vals.length) tap.t0 = lv().currentTime;
      tap.vals.push(Math.sqrt(s / d.length));
    };
    return tap;
  }
  async function captureWindow(w0, w1, rate, cancelled, onPct) {
    const v = lv(), t = audioTap();
    await actx.resume();
    v.pause(); v.currentTime = w0;
    if (v.seeking) await new Promise((r) => v.addEventListener("seeked", r, { once: true }));
    t.vals = []; t.on = true; v.playbackRate = rate;
    try { await v.play(); } catch { /* blocked: nothing to measure */ }
    while (!cancelled() && !v.ended && !v.paused && v.currentTime < w1) { onPct((v.currentTime - w0) / (w1 - w0)); await new Promise((r) => setTimeout(r, 200)); }
    t.on = false; v.pause();
    return { vals: t.vals.slice(), t0: t.t0, bin: (1024 / actx.sampleRate) * rate };
  }
  async function listenSync(tr) {
    const L = states.local, v = lv();
    if (!L.local || !(v.duration > 20)) return;
    const prev = { t: v.currentTime, rate: v.playbackRate, playing: !v.paused };
    L.listen = { pct: 0, cancel: false }; L.syncMsg = null; render();
    const dur = v.duration, span = Math.min(150, dur * 0.4);
    const centers = dur > 900 ? [dur * 0.25, dur * 0.7] : [dur * 0.5], found = [];
    let shown = -1;
    try {
      audioTap().gain.gain.value = 0; // silent while measuring
      for (let i = 0; i < centers.length; i++) {
        const w0 = Math.max(0, centers[i] - span / 2), w1 = Math.min(dur, w0 + span);
        const cap = await captureWindow(w0, w1, 4, () => L.listen.cancel, (p) => {
          L.listen.pct = (i + p) / centers.length;
          const s = Math.floor(L.listen.pct * 20);
          if (s !== shown) { shown = s; render(); }
        });
        if (L.listen.cancel) break;
        const r = Sync.correlate(cap.vals, cap.bin, cap.t0, tr.cues);
        if (r) found.push({ T: cap.t0 + (cap.vals.length * cap.bin) / 2, d: r.offset, conf: r.confidence });
      }
    } catch { /* reported below as "no reliable match" */ }
    if (tap) tap.gain.gain.value = 1;
    v.playbackRate = prev.rate; v.currentTime = prev.t; if (!prev.playing) v.pause();
    const cancelled = L.listen.cancel;
    L.listen = null;
    const good = found.filter((f) => f.conf >= CONF_MIN);
    if (cancelled) L.syncMsg = null;
    else if (!good.length) L.syncMsg = A("syncFail");
    else {
      let next;
      if (good.length === 2 && Math.abs(good[1].d - good[0].d) >= 0.6 && good[1].T - good[0].T > 300) {
        const tp = Sync.fromTwoPoints(good[0].T, good[0].d, good[1].T, good[1].d);
        next = tp.scale > 0.9 && tp.scale < 1.1 ? compose(tr, tp.scale, tp.offset) : compose(tr, 1, good[0].d);
      } else next = compose(tr, 1, good.reduce((s, g) => s + g.d, 0) / good.length);
      setTrackSync(tr, next);
      L.syncMsg = A("syncOk", next.offset.toFixed(2), next.scale.toFixed(4));
    }
    render();
  }
  function syncSection(tr) {
    const L = states.local, sy = tr.sync || { offset: 0, scale: 1 };
    const nudge = (d) => el("button", { textContent: (d > 0 ? "+" : "") + d, onclick: () => { setTrackSync(tr, { offset: (sy.offset || 0) + d, scale: sy.scale || 1 }); render(); } });
    const input = el("input", { type: "number", step: 0.1, value: +(sy.offset || 0).toFixed(2), style: "width:84px",
      onchange: () => { setTrackSync(tr, { offset: Number(input.value) || 0, scale: sy.scale || 1 }); render(); } });
    const idx = Math.min(L.anchorIdx != null ? L.anchorIdx : nearestCue(tr.cues, lv().currentTime), Math.max(0, tr.cues.length - 1));
    const line = tr.cues[idx];
    const parts = [
      el("p", { className: "hint", textContent: A("syncHint") }),
      el("div", { className: "row" }, el("label", { textContent: A("syncOffset") }), nudge(-1), nudge(-0.1), input, nudge(0.1), nudge(1),
        el("button", { textContent: A("syncReset"), onclick: () => { setTrackSync(tr, null); L.anchor1 = null; L.syncMsg = null; render(); } })),
    ];
    if (sy.scale && sy.scale !== 1) parts.push(el("p", { className: "hint", textContent: A("syncScale", sy.scale.toFixed(4)) }));
    if (line) {
      parts.push(el("h3", { textContent: A("syncLine") }),
        el("div", { className: "row" },
          el("button", { textContent: "◀", onclick: () => { L.anchorIdx = Math.max(0, idx - 1); render(); } }),
          el("span", { className: "grow hint", textContent: `${fmt(line.s)} · ${line.text.replace(/\n/g, " ")}` }),
          el("button", { textContent: "▶", onclick: () => { L.anchorIdx = Math.min(tr.cues.length - 1, idx + 1); render(); } })),
        el("div", { className: "row" },
          el("button", { textContent: "🎯 " + A("syncNearest"), onclick: () => { L.anchorIdx = null; render(); } }),
          el("button", { className: "primary", textContent: A("syncHere"), onclick: () => syncHere(tr, idx) })));
    }
    if (L.listen) {
      parts.push(el("div", { className: "row" }, el("span", { className: "grow hint", textContent: A("syncListening", Math.round(L.listen.pct * 100)) }),
        el("button", { textContent: A("syncCancel"), onclick: () => { L.listen.cancel = true; } })));
    } else {
      parts.push(el("h3", { textContent: A("syncAuto") }), el("div", { className: "row" },
        ...(!tr.embedded && L.local.tracks.some((t) => t.embedded && t !== tr) ? [el("button", { textContent: A("syncAutoRef"), onclick: () => autoRef(tr) })] : []),
        el("button", { textContent: "🎧 " + A("syncAutoListen"), onclick: () => listenSync(tr) })));
    }
    if (L.syncMsg) parts.push(el("p", { className: "warn", textContent: L.syncMsg }));
    return section("sync", A("syncT"), ...parts);
  }

  async function handleFiles(list) {
    const files = [...list];
    const video = files.find((f) => VIDEO_EXT.test(f.name) || /^(video|audio)\//.test(f.type));
    const subs = files.filter((f) => SUB_EXT.test(f.name));
    if (video) loadLocalVideo(video);
    if (!states.local.local) { states.local.msg = A("noVideoYet"); view = "local"; S = states.local; render(); return; }
    for (const f of subs) addSubFile(f.name, await f.arrayBuffer());
    view = "local"; S = states.local;
    render();
  }
  function reopenLocal(e) { // browsers cannot reopen a file by themselves: ask for it again
    view = "local"; S = states.local;
    states.local.msg = A("reopen", e.title || e.id);
    render();
    $("#lfile").click();
  }
  function wireLocalVideo() {
    const v = lv();
    v.addEventListener("loadedmetadata", () => {
      const L = states.local;
      L.ready = true; L.dur = v.duration; if (S === L) self.__dur = v.duration;
      L.blocks = parseBlocks(L.text);
      render();
    });
    v.addEventListener("error", () => { if (states.local.local) { states.local.local.err = true; states.local.ready = false; render(); } });
    v.addEventListener("ratechange", () => { if (S === states.local) S.rateSeen = v.playbackRate; });
    // Subtitle overlay: our own text, hidden in the "blind" rounds.
    let last = null;
    setInterval(() => {
      const L = states.local, box = $("#lsub");
      if (!box) return;
      const tr = L.local && L.local.tracks[L.local.sel];
      const hide = L.active && ROUND_COVER[L.round];
      const txt = !tr || hide ? "" : cuesAt(tr.cues, v.currentTime).join("\n");
      if (txt !== last) { last = txt; box.textContent = txt; box.style.display = txt ? "block" : "none"; }
    }, 100);
  }
  function applyLocalView() {
    const L = states.local, cover = view === "local" && L.active && ROUND_COVER[L.round];
    for (const pos of ["top", "bottom"]) {
      const b = $("#lbar-" + pos);
      if (!b) continue;
      b.style.display = cover && cfg.bars[pos] > 0 ? "block" : "none";
      b.style.height = cfg.bars[pos] + "%";
    }
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
    // YouTube's embedded player works in 0.05 steps; a local file takes any rate
    const q = S.mode === "local" ? (x) => Math.round(x * 100) / 100 : (x) => Math.round(x * 20) / 20;
    if (S.round !== 3) return q(cfg.speed[S.round]);
    const { from, to, passes } = cfg.r3;
    // a clip looped on its own keeps going at the ramp's final speed
    return q(passes <= 1 ? to : from + ((to - from) * Math.min(S.pass, passes - 1)) / (passes - 1));
  }
  function start(i, round) {
    if (!E.ok() || !S.blocks[i]) return;
    if (round) S.round = round;
    S.cur = i; S.pass = 0; S.clip = 0; S.solo = false; S.editClip = null; S.active = true; S.msg = null;
    seekPlay();
    render();
  }
  // Fine-tune a clip's start or end. If that clip is looping, the loop restarts at once so you hear the change.
  function setClipEdge(i, edge, value) {
    const c = (S.clips[S.cur] || [])[i];
    if (!c || !isFinite(value)) return;
    const MIN = 0.3;
    value = Math.max(0, Math.round(value * 100) / 100);
    if (edge === "s") c.s = Math.min(value, c.e - MIN);
    else c.e = Math.max(value, c.s + MIN);
    if (S.dur > 0 && c.e > S.dur) c.e = S.dur;
    saveVid();
    if (S.active && S.round === 3 && S.clip === i) seekPlay();
    render();
  }
  function clipEditor(i, c) {
    const wrap = el("div", { className: "list" });
    for (const [edge, label] of [["s", T("clipStartL")], ["e", T("clipEndL")]]) {
      const nudge = (d) => el("button", { textContent: (d > 0 ? "+" : "") + d, onclick: () => setClipEdge(i, edge, c[edge] + d) });
      wrap.append(el("div", { className: "transport" }, el("span", { textContent: label, className: "hint", style: "min-width:44px;align-self:center" }),
        nudge(-0.5), nudge(-0.1), el("b", { textContent: c[edge].toFixed(1), style: "min-width:46px;text-align:center;align-self:center" }), nudge(0.1), nudge(0.5),
        el("button", { textContent: T("clipNow"), onclick: () => setClipEdge(i, edge, E.time()) })));
    }
    // Deleting is kept away from replay/edit and needs a second, explicit confirmation.
    wrap.append(S.confirmDel === i
      ? el("div", { className: "transport" }, el("span", { className: "hint", style: "align-self:center", textContent: T("clipDelAsk") }),
        el("button", { className: "danger", textContent: T("clipDelYes"), onclick: () => deleteClip(i) }),
        el("button", { textContent: T("clipDelNo"), onclick: () => { S.confirmDel = null; render(); } }))
      : el("button", { className: "danger-o", textContent: "🗑 " + T("clipDel"), onclick: () => { S.confirmDel = i; render(); } }));
    return wrap;
  }
  function deleteClip(i) {
    if (S.active && S.round === 3 && S.clip === i) { E.pause(); S.active = false; }
    (S.clips[S.cur] || []).splice(i, 1);
    S.clip = 0; S.editClip = null; S.confirmDel = null;
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
    render();
  }
  // The main "replay" button: the clip you are working on if there is one, otherwise the block.
  function replayCurrent() {
    if (S.round === 3 && S.solo && (S.clips[S.cur] || [])[S.clip]) return replayClip(S.clip);
    if (S.cur >= 0) start(S.cur);
  }
  function seekPlay() {
    const seg = segment();
    if (!seg || !E.ok()) return;
    S.lock = Date.now() + 600;
    E.seek(seg.s);
    E.setRate(rateFor());
    E.play();
    const mine = S;
    setTimeout(() => { if (S === mine && E.ok()) { S.rateSeen = E.rate(); render(); } }, 500);
  }
  function halt() {
    E.ok() && E.pause();
    S.active = false;
    render();
  }
  function onEnd() {
    if (S.round === 3) {
      const cs = S.clips[S.cur] || [];
      S.pass++;
      if (!S.solo && S.pass >= cfg.r3.passes) {
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
    if (!S.active || !E.ok() || (S.mode === "youtube" && view !== "player") || (S.mode === "local" && view !== "local")) return;
    const seg = segment();
    if (!seg) return;
    const t = E.time();
    const bar = $(".blk.on .prog");
    if (bar) bar.style.width = Math.min(100, Math.max(0, ((t - seg.s) / (seg.e - seg.s)) * 100)) + "%";
    if (Date.now() < S.lock) return;
    if (E.playing() && t >= seg.e - 0.05) onEnd();
  }, 80);


  // ---------- Clips ----------
  const blockAt = (t) => S.blocks.findIndex((b) => t >= b.s && t < b.e);
  function addClip(s, e) {
    (S.clips[S.cur] ||= []).push({ s, e });
    S.clips[S.cur].sort((a, b) => a.s - b.s); // keep the clips in video order
    saveVid();
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
    S.active = false;
    if (seg) { S.lock = Date.now() + 600; E.seek(seg.e); E.play(); }
    S.msg = T("loopReleased");
    render();
    return true;
  }
  function markClip() {
    if (!E.ok()) { S.msg = T("pick"); return render(); }
    if (releaseLoop()) return;
    const t = E.time();
    if (S.cur < 0) {
      const i = blockAt(t);
      if (i < 0) { S.msg = T("pick"); return render(); }
      S.cur = i;
    }
    if (S.markStart == null) { S.markStart = t; S.active = false; S.msg = T("clipStart", fmt(t)); }
    else {
      const s = Math.min(S.markStart, t), e = Math.max(S.markStart, t);
      S.markStart = null; S.msg = null;
      if (e - s > 0.5) { addClip(s, e); S.msg = T("clipAdded", S.clips[S.cur].length); }
    }
    render();
  }
  // Local files with subtitles: the whole spoken line as a clip, in one press.
  function clipLine() {
    const tr = S.local && S.local.tracks[S.local.sel];
    if (!E.ok() || !tr || !tr.cues.length) { S.msg = T("needSubs"); return render(); }
    if (releaseLoop()) return;
    const t = E.time();
    if (S.cur < 0) {
      const i = blockAt(t);
      if (i < 0) { S.msg = T("pick"); return render(); }
      S.cur = i;
    }
    let c = tr.cues.find((x) => t >= x.s && t < x.e);
    if (!c) c = tr.cues.reduce((a, x) => (Math.abs(x.s - t) < Math.abs(a.s - t) ? x : a), tr.cues[0]);
    const s = Math.max(0, c.s - 0.15), e = c.e + 0.15;
    const list = (S.clips[S.cur] ||= []);
    if (!list.some((x) => Math.abs(x.s - s) < 0.3 && Math.abs(x.e - e) < 0.3)) addClip(s, e);
    S.active = false;
    S.msg = T("clipAdded", S.clips[S.cur].length);
    render();
  }

  // ---------- Prompt ----------
  async function copyPrompt(thenOpen) {
    const pl = cfg.promptIn === "ja" ? "ja" : "en";
    const { target, native } = cfg.langs;
    let tail;
    if (S.mode === "local") { // a local file has no link: send the whole subtitle text instead
      const tr = S.local && S.local.tracks[S.local.sel];
      if (!tr || !tr.cues.length) { S.msg = T("needSubs"); return render(); }
      tail = `${TAILS[pl].subs} (${S.local.name}; ${target}; "[h:mm:ss] line"):\n\n${subsText(tr.cues)}`;
    } else tail = `${TAILS[pl].link}\nhttps://www.youtube.com/watch?v=${S.vid}`;
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
        imported[id] = { text: rec.text || "", clips: rec.clips || {}, ...(rec.sync ? { sync: rec.sync } : {}) };
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
    $("#tagline").textContent = A(EXT ? "taglineLocal" : "tagline");
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

    // Tabs: YouTube player / local files / history
    const tabs = $("#tabs");
    tabs.replaceChildren(
      ...(EXT ? [] : [el("button", { className: view === "player" ? "on" : "", textContent: "▶ " + A("playerT"), onclick: () => setView("player") })]),
      el("button", { className: view === "local" ? "on" : "", textContent: "🎞 " + A("localT"), onclick: () => setView("local") }),
      el("button", { className: view === "history" ? "on" : "", textContent: "🕘 " + A("histT"), onclick: () => setView("history") }));
    tabs.style.display = "flex";
    $("#form").style.display = EXT || view === "local" ? "none" : "flex";
    $("#player-wrap").style.display = view === "player" && states.youtube.vid ? "block" : "none";
    $("#local-wrap").style.display = view === "local" && states.local.vid ? "block" : "none";
    applyLocalView();
    if (view === "history") {
      root.append(historyView());
      return;
    }

    if (view === "player" && !S.vid) root.append(el("p", { className: "hint", textContent: A("intro") }));
    if (view === "local" && !S.vid) {
      root.append(el("div", { className: "card" },
        el("p", { className: "hint", textContent: A("localHint") }),
        el("button", { className: "primary", textContent: "📂 " + A("pickFiles"), onclick: () => $("#lfile").click() }),
        el("p", { className: "hint", textContent: A("dropHint") }),
        S.msg ? el("p", { className: "warn", textContent: S.msg }) : ""));
    }
    if (S.noEmbed) root.append(el("p", { className: "warn", textContent: A("noEmbed") }));
    if (S.mode === "local" && S.local && S.local.err) root.append(el("p", { className: "warn", textContent: A("localErr") }));

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
        el("button", { textContent: "↻", title: T("replay"), onclick: replayCurrent }),
        el("button", { textContent: "⏭", title: T("next"), onclick: () => start(Math.min(S.blocks.length - 1, S.cur + 1)) }),
        el("button", { textContent: "⏹", title: T("stop"), onclick: halt }),
        el("button", { className: cfg.loop ? "on" : "", textContent: "🔁 " + T("loop"), onclick: () => { cfg.loop = !cfg.loop; saveCfg(); render(); } })));

      // Status
      const b = S.blocks[S.cur];
      let st = S.msg;
      if (!st) {
        if (b && S.active) {
          st = T("status", S.cur + 1, S.round, rateFor().toFixed(2));
          if (S.round === 3) st += T("status3", Math.min(S.clip + 1, Math.max(1, (S.clips[S.cur] || []).length)), Math.min(S.pass + 1, cfg.r3.passes), cfg.r3.passes);
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
        cs.forEach((c, i) => {
          cl.append(el("div", { className: "clip" },
            el("button", { className: S.round === 3 && S.active && i === S.clip ? "on" : "", textContent: `${i + 1}: ${fmt(c.s)}–${fmt(c.e)}`,
              title: T("clipTap"), onclick: () => tapClip(i) }),
            el("button", { textContent: "↻", title: T("clipReplay"), onclick: () => replayClip(i) }),
            el("button", { className: S.editClip === i ? "on" : "", textContent: "✎", title: T("clipEdit"),
              onclick: () => { S.editClip = S.editClip === i ? null : i; S.confirmDel = null; render(); } })));
          if (S.editClip === i) cl.append(clipEditor(i, c));
        });
        if (!cs.length) cl.append(el("p", { className: "hint", textContent: T("noClips") }));
        cl.append(el("button", { textContent: "＋ " + T("markClip"), onclick: markClip }));
        if (S.mode === "local" && S.local && S.local.tracks[S.local.sel]) cl.append(el("button", { textContent: "＋ " + T("clipLine"), onclick: clipLine }));
        cl.append(el("p", { className: "hint", textContent: T("clipTap") }), el("p", { className: "hint", textContent: T("markHint") }));
        root.append(cl);
      }

      // Gemini
      root.append(el("div", { className: "transport" },
        el("button", { className: "primary", textContent: "📋 " + T("copyPrompt"), onclick: () => copyPrompt(false) }),
        el("button", { textContent: "✦ " + A("gemini"), onclick: () => copyPrompt(true) })));

      // Local files: which subtitle track, which text encoding, add more files
      if (S.mode === "local" && S.local) {
        const L = S.local, tr = L.tracks[L.sel];
        const box = el("div", { className: "list" }, el("h3", { textContent: A("subsT") }));
        if (L.scan != null) box.append(el("p", { className: "hint", textContent: A("scanning", Math.round(L.scan * 100)) }));
        if (!L.tracks.length) { if (L.scan == null) box.append(el("p", { className: "hint", textContent: A("subsNone") })); }
        else {
          const sel = el("select", { className: "grow", onchange: () => { L.sel = Number(sel.value); render(); } });
          L.tracks.forEach((t, i) => sel.append(el("option", { value: i, selected: i === L.sel, textContent: A("localSubs", t.name, t.cues.length) })));
          const enc = el("select", { title: A("encT"), onchange: () => { tr.enc = enc.value; reparse(tr); render(); } });
          ["auto", ...Subs.ENCODINGS].forEach((e) => enc.append(el("option", { value: e, selected: e === tr.enc, textContent: e === "auto" ? `${A("encT")}: auto (${tr.used})` : e })));
          box.append(el("div", { className: "row" }, sel));
          if (tr && tr.buf) box.append(el("div", { className: "row" }, enc)); // text encoding only matters for files, not embedded tracks
        }
        box.append(el("button", { textContent: "📂 " + A("subsAdd"), onclick: () => $("#lfile").click() }));
        root.append(box);
        if (tr && !tr.embedded) root.append(syncSection(tr)); // embedded tracks are already in step with the video
      }

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
      el("h3", { textContent: T("sBars") }),
      row(T("barTop"), num(cfg.bars.top, 0, 60, 1, (v) => { cfg.bars.top = Math.min(60, Math.max(0, v || 0)); })),
      row(T("barBottom"), num(cfg.bars.bottom, 0, 60, 1, (v) => { cfg.bars.bottom = Math.min(60, Math.max(0, v || 0)); })),
      el("p", { className: "hint", textContent: A("barsLocalOnly") })));

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
  if (!EXT && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

  // Local files: picker button, and drag & drop anywhere on the page (computers)
  wireLocalVideo();
  $("#lfile").onchange = (e) => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ""; };
  addEventListener("dragover", (e) => e.preventDefault());
  addEventListener("drop", (e) => { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });

  // ?v=ID (reload), or a link shared to the installed app (?url= / ?text=)
  const qs = new URLSearchParams(location.search);
  render();
  const first = qs.get("v") || qs.get("url") || qs.get("text") || qs.get("title");
  if (first && cfg.onboarded && !EXT) go(first);
  // From the extension popup's recent list: a local file must be picked again
  const reopenKey = EXT && decodeURIComponent((location.hash.match(/reopen=([^&]*)/) || [])[1] || "");
  if (reopenKey) {
    const e = getHist().find((x) => x.id === reopenKey);
    states.local.msg = A("reopen", e ? e.title || e.id : reopenKey);
    render();
  }
})();
