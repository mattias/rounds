// Subtitle timing: shifting, and finding the shift automatically. Pure functions, no DOM.
//   A track's timing is  shown = original * scale + offset   (seconds).
(() => {
  // Frame-rate mix-ups are the usual cause of drift (a 25 fps subtitle on a 23.976 fps film, and so on).
  const RATIOS = [1, 25 / 23.976, 23.976 / 25, 24 / 23.976, 23.976 / 24, 30 / 29.97, 29.97 / 30, 25 / 24, 24 / 25];

  function applySync(base, sync) {
    const o = (sync && sync.offset) || 0, k = (sync && sync.scale) || 1;
    if (!o && k === 1) return base;
    return base.map((c) => ({ s: c.s * k + o, e: c.e * k + o, text: c.text }));
  }

  // Compare with a reference track (e.g. an embedded one) by matching when cues start.
  // Returns { offset, scale, score } where score is the share of cues that line up (0..1), or null.
  function alignToReference(cues, ref, maxShift = 1200) {
    if (cues.length < 5 || ref.length < 5) return null;
    const BIN = 0.25;
    let best = null;
    for (const k of RATIOS) {
      const hist = new Map(), diffs = [];
      for (const c of cues) {
        const x = c.s * k;
        for (const r of ref) {
          const d = r.s - x;
          if (d < -maxShift || d > maxShift) continue;
          const b = Math.round(d / BIN);
          hist.set(b, (hist.get(b) || 0) + 1);
          diffs.push(d);
        }
      }
      let bb = null, bc = 0;
      for (const [b, n] of hist) {
        const s = n + (hist.get(b - 1) || 0) + (hist.get(b + 1) || 0);
        if (s > bc) { bc = s; bb = b; }
      }
      if (bb == null) continue;
      const near = diffs.filter((d) => Math.abs(d - bb * BIN) <= 0.5).sort((a, b) => a - b);
      const offset = near.length ? near[near.length >> 1] : bb * BIN;
      const score = Math.min(1, bc / Math.min(cues.length, ref.length));
      const adj = k === 1 ? score : score * 0.9; // prefer "no drift" unless drift clearly fits better
      if (!best || adj > best.adj) best = { offset, scale: k, score, adj };
    }
    return best && best.score >= 0.25 ? { offset: best.offset, scale: best.scale, score: best.score } : null;
  }

  // Compare with how loud speech is. env[i] = loudness of the media between t0 + i*bin and t0 + (i+1)*bin.
  // Finds the shift d (seconds) so that cue activity moved by d lines up with the speech. Returns { offset, confidence } or null.
  function correlate(env, bin, t0, cues, maxShift = 90, step = 0.1) {
    const n = env.length;
    if (n < 100) return null;
    let mean = 0;
    for (const v of env) mean += v;
    mean /= n;
    let sd = 0;
    for (const v of env) sd += (v - mean) * (v - mean);
    sd = Math.sqrt(sd / n) || 1;
    const e = env.map((v) => (v - mean) / sd);
    const RES = 0.1, lo = t0 - maxShift - 1, hi = t0 + n * bin + maxShift + 1;
    const N = Math.ceil((hi - lo) / RES) + 2, act = new Uint8Array(N);
    for (const c of cues) {
      if (c.e < lo || c.s > hi) continue;
      const a = Math.max(0, Math.floor((c.s - lo) / RES)), b = Math.min(N - 1, Math.ceil((c.e - lo) / RES));
      for (let i = a; i <= b; i++) act[i] = 1;
    }
    const scores = [];
    let bestI = 0, bestV = -Infinity;
    for (let d = -maxShift; d <= maxShift + 1e-9; d += step) {
      let sc = 0;
      for (let k = 0; k < n; k++) {
        const i = Math.round((t0 + (k + 0.5) * bin - d - lo) / RES);
        if (act[i]) sc += e[k];
      }
      scores.push(sc);
      if (sc > bestV) { bestV = sc; bestI = scores.length - 1; }
    }
    let m = 0;
    for (const s of scores) m += s;
    m /= scores.length;
    let s2 = 0;
    for (const s of scores) s2 += (s - m) * (s - m);
    s2 = Math.sqrt(s2 / scores.length) || 1;
    return { offset: -maxShift + bestI * step, confidence: (bestV - m) / s2 };
  }

  // Two measurements (media time T, correction d) -> offset and scale. d(T) = (scale-1)*T + offset
  function fromTwoPoints(T1, d1, T2, d2) {
    const slope = (d2 - d1) / (T2 - T1);
    return { scale: 1 + slope, offset: d1 - slope * T1 };
  }

  self.Sync = { RATIOS, applySync, alignToReference, correlate, fromTwoPoints };
})();
