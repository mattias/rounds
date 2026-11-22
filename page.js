// Runs in the PAGE (world MAIN) on Netflix at document_start.
// 1) Listens to the text responses the player already downloads and forwards subtitle files
//    (TTML / WebVTT) to the extension. It never fetches anything itself.
// 2) Seeks / plays / pauses through Netflix's own player API (setting video.currentTime breaks Netflix).
(() => {
  if (window.__yrPage) return;
  window.__yrPage = true;
  const MAX = 3000000;
  const buf = [];
  const post = (m) => window.postMessage(Object.assign({ source: "yr-page" }, m), "*");

  function sniff(t) {
    const head = t.replace(/^﻿/, "").trimStart().slice(0, 600);
    if (/^WEBVTT/.test(head)) return "vtt";
    if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<(\w+:)?tt[\s>]/.test(head)) return "ttml";
    return null;
  }
  function offer(url, text) {
    const format = sniff(text);
    if (!format) return;
    const m = { kind: "subs", format, url: String(url).split("?")[0], path: location.pathname, body: text };
    buf.push(m);
    if (buf.length > 40) buf.shift();
    post(m);
  }
  function looksBinary(b) {
    const c = new Uint8Array(b, 0, Math.min(b.byteLength, 4))[0];
    return !(c === 0x3c || c === 0x57 || c === 0xef || c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09);
  }
  function offerBuffer(url, b) {
    if (!b || !b.byteLength || b.byteLength > MAX || looksBinary(b)) return;
    offer(url, new TextDecoder("utf-8").decode(b));
  }

  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (...args) {
      const p = origFetch.apply(this, args);
      p.then((r) => {
        try {
          const ct = (r.headers.get("content-type") || "").toLowerCase();
          if (/^(video|audio|image)\/|javascript|css|html|font/.test(ct)) return;
          const len = parseInt(r.headers.get("content-length") || "0", 10);
          if (len > MAX) return;
          r.clone().arrayBuffer().then((b) => offerBuffer(r.url, b)).catch(() => {});
        } catch (e) { /* never break the page */ }
      }).catch(() => {});
      return p;
    };
  }
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    try {
      this.addEventListener("load", () => {
        try {
          const t = this.responseType;
          if (t === "" || t === "text") {
            const s = this.responseText;
            if (s && s.length <= MAX) offer(this.responseURL || url, s);
          } else if (t === "arraybuffer") offerBuffer(this.responseURL || url, this.response);
        } catch (e) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }
    return origOpen.call(this, method, url, ...rest);
  };

  function player() {
    const vp = window.netflix.appContext.state.playerApp.getAPI().videoPlayer;
    const ids = vp.getAllPlayerSessionIds();
    if (!ids.length) throw new Error("no player session");
    return vp.getVideoPlayerBySessionId(ids[ids.length - 1]);
  }
  const video = () => document.querySelector("video");

  window.addEventListener("message", (ev) => {
    const d = ev.data;
    if (ev.source !== window || !d || d.source !== "yr-cmd") return;
    try {
      if (d.op === "replay") buf.forEach(post);
      else if (d.op === "seek") player().seek(Math.round(d.t * 1000));
      else if (d.op === "play") player().play();
      else if (d.op === "pause") player().pause();
    } catch (e) {
      const v = video();
      if (!v) return;
      if (d.op === "seek") v.currentTime = d.t;
      else if (d.op === "play") v.play();
      else if (d.op === "pause") v.pause();
    }
  });
})();
