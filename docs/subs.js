// Subtitle files -> cues [{s, e, text}] (text may contain "\n"). Formats: SRT, WebVTT, ASS/SSA. Pure functions, no DOM.
(() => {
  const ENCODINGS = ["utf-8", "shift_jis", "gb18030", "big5", "euc-kr", "windows-1251", "windows-1252"];
  const FOR_LANG = { ja: "shift_jis", zh: "gb18030", yue: "big5", ko: "euc-kr", ru: "windows-1251", uk: "windows-1251", bg: "windows-1251" };

  // Bytes -> text. "auto": BOMs, then strict UTF-8, then the usual legacy encoding for the study language.
  function decode(buf, enc, langCode) {
    const u8 = new Uint8Array(buf);
    if (enc && enc !== "auto") return { text: new TextDecoder(enc).decode(u8), enc };
    if (u8[0] === 0xff && u8[1] === 0xfe) return { text: new TextDecoder("utf-16le").decode(u8), enc: "utf-16le" };
    if (u8[0] === 0xfe && u8[1] === 0xff) return { text: new TextDecoder("utf-16be").decode(u8), enc: "utf-16be" };
    try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(u8), enc: "utf-8" }; } catch { /* not UTF-8 */ }
    const fb = FOR_LANG[langCode] || "windows-1252";
    return { text: new TextDecoder(fb).decode(u8), enc: fb };
  }

  const clean = (t) => t.replace(/<[^>]*>/g, "").replace(/\{\\[^}]*\}/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const finish = (cues) => {
    const seen = new Set(), out = [];
    for (const c of cues) {
      const text = c.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join("\n");
      if (!text || !(c.e > c.s)) continue;
      const k = c.s + "|" + c.e + "|" + text;
      if (seen.has(k)) continue; // ASS often repeats a line on several layers
      seen.add(k); out.push({ s: c.s, e: c.e, text });
    }
    return out.sort((a, b) => a.s - b.s);
  };

  const TIME = String.raw`(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})`;
  const ARROW = new RegExp(`${TIME}\\s*-->\\s*${TIME}`);
  const toS = (h, m, s, f) => (+(h || 0)) * 3600 + +m * 60 + +s + parseFloat("0." + f);

  function parseSrtVtt(text) {
    const cues = [];
    for (const block of text.replace(/^﻿/, "").split(/\r?\n\s*\r?\n/)) {
      const lines = block.split(/\r?\n/);
      const i = lines.findIndex((l) => l.includes("-->"));
      if (i < 0 || /^(NOTE|STYLE|REGION)\b/.test(lines[0])) continue;
      const m = lines[i].match(ARROW);
      if (!m) continue;
      cues.push({ s: toS(m[1], m[2], m[3], m[4]), e: toS(m[5], m[6], m[7], m[8]), text: clean(lines.slice(i + 1).join("\n")) });
    }
    return finish(cues);
  }

  const assTime = (v) => {
    const m = String(v || "").trim().match(/^(\d+):(\d\d):(\d\d)[.:](\d{1,3})$/);
    return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + parseFloat("0." + m[4]) : null;
  };
  function parseAss(text) {
    const cues = [];
    let inEvents = false, fields = null;
    for (const raw of text.replace(/^﻿/, "").split(/\r?\n/)) {
      const l = raw.trim();
      if (/^\[events\]/i.test(l)) { inEvents = true; continue; }
      if (/^\[.+\]$/.test(l)) { inEvents = false; continue; }
      if (!inEvents) continue;
      if (/^format:/i.test(l)) { fields = l.slice(l.indexOf(":") + 1).split(",").map((s) => s.trim().toLowerCase()); continue; }
      const m = l.match(/^dialogue:\s*(.*)$/i);
      if (!m || !fields) continue;
      const ti = fields.indexOf("text");
      if (ti < 0) continue;
      const parts = m[1].split(",");
      const body = parts.slice(ti).join(","); // the text itself may contain commas
      const s = assTime(parts[fields.indexOf("start")]), e = assTime(parts[fields.indexOf("end")]);
      if (s == null || e == null) continue;
      if (/\{[^}]*\\p[1-9]/.test(body)) continue; // vector drawings (signs), not speech
      const t = body.replace(/\{[^}]*\}/g, "").replace(/\\N/g, "\n").replace(/\\n/g, " ").replace(/\\h/g, " ");
      cues.push({ s, e, text: t });
    }
    return finish(cues);
  }

  // Looks at the content, not just the name.
  function parse(text, name) {
    const head = text.slice(0, 2000);
    if (/^\s*\[Script Info\]/i.test(head) || /\.(ass|ssa)$/i.test(name || "") || /^\s*\[events\]/im.test(text)) return parseAss(text);
    return parseSrtVtt(text);
  }

  self.Subs = { ENCODINGS, decode, parse, parseSrtVtt, parseAss };
})();
