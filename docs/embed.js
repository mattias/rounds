// Embedded text subtitles from MKV and MP4 files, read in the browser without uploading anything.
//   MKV/WebM: S_TEXT/UTF8 (srt), S_TEXT/ASS, S_TEXT/SSA        MP4/MOV: tx3g (mov_text), wvtt
// Image-based subtitles (PGS, VobSub) are not text and are skipped.
// Needs subs.js first. Result: { tracks: [{ name, lang, codec, cues }] } or null if cancelled.
(() => {
  const dec = new TextDecoder("utf-8");
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const asSrtTime = (t) => { const ms = Math.round((t % 1) * 1000), s = Math.floor(t); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)},${pad(ms, 3)}`; };
  const asAssTime = (t) => { const cs = Math.round((t % 1) * 100), s = Math.floor(t); return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}.${pad(cs)}`; };

  // Small random-access reader: only the bytes we look at are read from the file.
  function makeReader(file) {
    const WIN = 16384;
    let wStart = 0, wBuf = new Uint8Array(0);
    return {
      size: file.size,
      async bytes(pos, len) {
        if (!(pos >= wStart && pos + len <= wStart + wBuf.length)) {
          const end = Math.min(file.size, pos + Math.max(len, WIN));
          wBuf = new Uint8Array(await file.slice(pos, end).arrayBuffer());
          wStart = pos;
        }
        const o = pos - wStart;
        return wBuf.subarray(o, o + len);
      },
    };
  }

  // Turns [{t, dur, text}] into final cues through the shared subtitle parsers.
  function fillDurations(list) {
    list.sort((a, b) => a.t - b.t);
    list.forEach((c, i) => {
      if (c.dur > 0) return;
      let j = i + 1; // the next cue that starts later (two lines shown at once start together)
      while (j < list.length && list[j].t - c.t <= 1e-6) j++;
      c.dur = Math.min(j < list.length ? list[j].t - c.t : 5, 5);
    });
    return list;
  }
  function toCues(list, codec) {
    fillDurations(list);
    if (codec === "S_TEXT/ASS" || codec === "S_TEXT/SSA") {
      // Matroska stores "ReadOrder,Layer,Style,Name,MarginL,MarginR,MarginV,Effect,Text" without the times.
      let txt = "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n";
      for (const c of list) {
        const p = c.text.split(",");
        if (p.length < 9) continue;
        txt += `Dialogue: ${p[1]},${asAssTime(c.t)},${asAssTime(c.t + c.dur)},${p[2]},${p[3]},${p[4]},${p[5]},${p[6]},${p[7]},${p.slice(8).join(",")}\n`;
      }
      return Subs.parseAss(txt);
    }
    let srt = "";
    list.forEach((c, i) => { srt += `${i + 1}\n${asSrtTime(c.t)} --> ${asSrtTime(c.t + c.dur)}\n${c.text}\n\n`; });
    return Subs.parseSrtVtt(srt);
  }

  // ---------- MKV / WebM (EBML) ----------
  function readId(b, o) {
    const f = b[o];
    const len = f >= 0x80 ? 1 : f >= 0x40 ? 2 : f >= 0x20 ? 3 : f >= 0x10 ? 4 : 0;
    if (!len || o + len > b.length) return null;
    let id = 0;
    for (let i = 0; i < len; i++) id = id * 256 + b[o + i];
    return { id, len };
  }
  function readSize(b, o) {
    const f = b[o];
    let len = 1, mask = 0x80;
    while (len <= 8 && !(f & mask)) { len++; mask >>= 1; }
    if (len > 8 || o + len > b.length) return null;
    let v = f & (mask - 1), unknown = v === mask - 1;
    for (let i = 1; i < len; i++) { v = v * 256 + b[o + i]; if (b[o + i] !== 0xff) unknown = false; }
    return { size: unknown ? -1 : v, len };
  }
  const TEXT_CODECS = new Set(["S_TEXT/UTF8", "S_TEXT/ASS", "S_TEXT/SSA"]);

  async function mkv(file, opts) {
    const R = makeReader(file);
    // Containers we walk into (everything else is skipped by its size).
    const ENTER = new Set([0x18538067, 0x1f43b675, 0xa0, 0x1654ae6b, 0xae, 0x1549a966]); // Segment, Cluster, BlockGroup, Tracks, TrackEntry, Info
    const tracks = [];
    let pos = 0, tsScale = 1000000, cluster = 0, cur = null, last = null, n = 0;
    const subs = new Map(); // track number -> { track, list }
    // Sizes come from the file, so a damaged file must not be able to ask for absurd reads.
    const uint = async (p, len) => { len = Math.min(len, 8); const b = await R.bytes(p, len); let v = 0; for (let i = 0; i < len; i++) v = v * 256 + b[i]; return v; };
    const str = async (p, len) => dec.decode(await R.bytes(p, Math.min(len, 4096))).replace(/\0+$/, "");
    const prepare = () => {
      for (const t of tracks) if (t.type === 17 && TEXT_CODECS.has(t.codec)) subs.set(t.num, { track: t, list: [] });
    };
    let prepared = false;

    while (pos < R.size) {
      const h = await R.bytes(pos, 16);
      if (h.length < 2) break;
      const idr = readId(h, 0);
      const szr = idr && readSize(h, idr.len);
      if (!idr || !szr) break;
      const id = idr.id, size = szr.size, body = pos + idr.len + szr.len;
      if (ENTER.has(id)) {
        if (id === 0xae) { cur = { num: 0, type: 0, codec: "", name: "", lang: "", priv: "" }; tracks.push(cur); }
        if (id === 0x1f43b675) { if (!prepared) { prepare(); prepared = true; } cur = null; }
        pos = body;
        continue;
      }
      if (size < 0) break; // unknown size on a non-container: cannot continue safely
      if (id === 0x2ad7b1) tsScale = await uint(body, Math.min(size, 6));
      else if (id === 0xe7) cluster = await uint(body, Math.min(size, 6));
      else if (cur && id === 0xd7) cur.num = await uint(body, size);
      else if (cur && id === 0x83) cur.type = await uint(body, size);
      else if (cur && id === 0x86) cur.codec = await str(body, size);
      else if (cur && id === 0x536e) cur.name = await str(body, size);
      else if (cur && id === 0x22b59c) cur.lang = await str(body, size);
      else if (cur && id === 0x22b59d) cur.ietf = await str(body, size);
      else if ((id === 0xa3 || id === 0xa1) && prepared && size > 4 && size < 4000000) { // a subtitle block is tiny
        const hd = await R.bytes(body, 12);
        const tn = readSize(hd, 0); // the track number is a vint
        if (tn) {
          const s = subs.get(tn.size);
          if (s) {
            let rel = (hd[tn.len] << 8) | hd[tn.len + 1];
            if (rel & 0x8000) rel -= 0x10000;
            const hl = tn.len + 3;
            const text = dec.decode(await R.bytes(body + hl, size - hl)).replace(/\r/g, "");
            last = { t: ((cluster + rel) * tsScale) / 1e9, dur: 0, text };
            s.list.push(last);
          }
        }
      } else if (id === 0x9b && last) last.dur = ((await uint(body, Math.min(size, 6))) * tsScale) / 1e9; // BlockDuration
      pos = body + size;
      if ((++n & 511) === 0) {
        if (opts.cancelled && opts.cancelled()) return null;
        if (opts.onProgress) opts.onProgress(Math.min(1, pos / R.size));
        await new Promise((r) => setTimeout(r)); // let the page breathe
      }
    }
    const out = [];
    for (const { track, list } of subs.values()) {
      const cues = toCues(list, track.codec);
      if (cues.length) out.push({ name: track.name, lang: track.ietf || track.lang || "", codec: track.codec, cues });
    }
    return { tracks: out };
  }

  // ---------- MP4 / MOV (ISO base media) ----------
  const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const u16 = (b, o) => (b[o] << 8) | b[o + 1];
  const cc = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  function* boxes(b, start, end) {
    let p = start;
    while (p + 8 <= end) {
      let size = u32(b, p), hl = 8;
      const type = cc(b, p + 4);
      if (size === 1) { size = u32(b, p + 8) * 4294967296 + u32(b, p + 12); hl = 16; }
      else if (size === 0) size = end - p;
      if (size < hl || p + size > end) break;
      yield { type, body: p + hl, end: p + size };
      p += size;
    }
  }
  const find = (b, box, type) => { for (const c of boxes(b, box.body, box.end)) if (c.type === type) return c; return null; };

  function mp4Track(b, trak) {
    const mdia = find(b, trak, "mdia"), hdlr = mdia && find(b, mdia, "hdlr"), mdhd = mdia && find(b, mdia, "mdhd");
    if (!hdlr || !mdhd) return null;
    const handler = cc(b, hdlr.body + 8);
    if (!["text", "sbtl", "subt"].includes(handler)) return null;
    const v1 = b[mdhd.body] === 1;
    const timescale = u32(b, mdhd.body + (v1 ? 20 : 12));
    const lp = u16(b, mdhd.body + (v1 ? 32 : 20));
    const lang = String.fromCharCode(((lp >> 10) & 31) + 0x60, ((lp >> 5) & 31) + 0x60, (lp & 31) + 0x60);
    const stbl = find(b, find(b, mdia, "minf") || mdia, "stbl");
    const stsd = stbl && find(b, stbl, "stsd");
    if (!stsd) return null;
    const codec = cc(b, stsd.body + 12);
    if (codec !== "tx3g" && codec !== "wvtt") return null;
    const stts = find(b, stbl, "stts"), stsz = find(b, stbl, "stsz"), stsc = find(b, stbl, "stsc");
    const co = find(b, stbl, "stco") || find(b, stbl, "co64");
    if (!stts || !stsz || !stsc || !co) return null;
    // Every count below comes from the file: never trust it further than the box it sits in (and a sane maximum).
    const MAX = 2000000, room = (box, head, each) => Math.max(0, Math.floor((box.end - box.body - head) / each));
    // sample sizes
    const fixed = u32(b, stsz.body + 4);
    const count = Math.min(u32(b, stsz.body + 8), MAX, fixed ? MAX : room(stsz, 12, 4));
    const sizes = new Array(count);
    for (let i = 0; i < count; i++) sizes[i] = fixed || u32(b, stsz.body + 12 + i * 4);
    // chunk offsets
    const big = co.type === "co64", nChunks = Math.min(u32(b, co.body + 4), room(co, 8, big ? 8 : 4)), chunk = [];
    for (let i = 0; i < nChunks; i++) chunk.push(big ? u32(b, co.body + 8 + i * 8) * 4294967296 + u32(b, co.body + 12 + i * 8) : u32(b, co.body + 8 + i * 4));
    // samples per chunk -> offsets
    const nsc = Math.min(u32(b, stsc.body + 4), room(stsc, 8, 12)), runs = [];
    for (let i = 0; i < nsc; i++) runs.push({ first: u32(b, stsc.body + 8 + i * 12), per: u32(b, stsc.body + 12 + i * 12) });
    const offsets = [];
    for (let c = 0; c < nChunks; c++) {
      let per = 0;
      for (const r of runs) if (r.first <= c + 1) per = r.per;
      let off = chunk[c];
      for (let k = 0; k < per && offsets.length < count; k++) { offsets.push(off); off += sizes[offsets.length - 1]; }
    }
    // times
    const nts = Math.min(u32(b, stts.body + 4), room(stts, 8, 8)), times = [];
    let t = 0;
    for (let i = 0; i < nts && times.length < count; i++) {
      const cnt = u32(b, stts.body + 8 + i * 8), delta = u32(b, stts.body + 12 + i * 8);
      for (let k = 0; k < cnt && times.length < count; k++) { times.push([t / (timescale || 1), delta / (timescale || 1)]); t += delta; }
    }
    return { codec, lang, offsets, sizes, times };
  }

  async function mp4(file, opts) {
    const R = makeReader(file);
    let pos = 0, moov = null, moovHl = 8;
    while (pos + 8 <= R.size) {
      const h = await R.bytes(pos, 16);
      let size = u32(h, 0), hl = 8;
      const type = cc(h, 4);
      if (size === 1) { size = u32(h, 8) * 4294967296 + u32(h, 12); hl = 16; }
      else if (size === 0) size = R.size - pos;
      if (size < hl) break;
      if (type === "moov") { moov = new Uint8Array(await file.slice(pos, pos + size).arrayBuffer()); moovHl = hl; break; }
      pos += size;
    }
    if (!moov) return { tracks: [] };
    const out = [];
    const root = { body: moovHl, end: moov.length };
    for (const trak of boxes(moov, root.body, root.end)) {
      if (trak.type !== "trak") continue;
      const tr = mp4Track(moov, trak);
      if (!tr) continue;
      const list = [];
      for (let i = 0; i < tr.offsets.length; i++) {
        if (opts.cancelled && opts.cancelled()) return null;
        if ((i & 255) === 0) { if (opts.onProgress) opts.onProgress(i / tr.offsets.length); await new Promise((r) => setTimeout(r)); }
        const sz = tr.sizes[i], tm = tr.times[i];
        if (!tm || !(sz >= 3) || sz > 1000000) continue; // no time (truncated table) or not a subtitle sample
        const s = await R.bytes(tr.offsets[i], sz);
        if (s.length < sz) continue;
        let text = "";
        if (tr.codec === "tx3g") text = dec.decode(s.subarray(2, 2 + Math.min(u16(s, 0), sz - 2)));
        else for (const bx of boxes(s, 0, s.length)) if (bx.type === "vttc") for (const c of boxes(s, bx.body, bx.end)) if (c.type === "payl") text = dec.decode(s.subarray(c.body, c.end));
        text = text.replace(/\r/g, "").trim();
        if (text) list.push({ t: tm[0], dur: tm[1], text });
      }
      const cues = toCues(list, "S_TEXT/UTF8");
      if (cues.length) out.push({ name: "", lang: tr.lang === "und" ? "" : tr.lang, codec: tr.codec, cues });
    }
    return { tracks: out };
  }

  // Looks at the first bytes, not the file name.
  async function extract(file, opts = {}) {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return mkv(file, opts);
    if (cc(head, 4) === "ftyp" || cc(head, 4) === "moov" || cc(head, 4) === "free" || cc(head, 4) === "mdat") return mp4(file, opts);
    return { tracks: [] };
  }

  self.Embed = { extract };
})();
