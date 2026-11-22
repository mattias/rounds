// Öppnar Gemini i ett litet fristående fönster bredvid videon.
// (gemini.google.com går inte att bädda in i en iframe på YouTube.)
let geminiWin = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "gemini") return;
  const w = 460, h = Math.min(msg.availH || 900, 900);
  const left = Math.max(0, (msg.availW || 1920) - w - 10);
  const open = () =>
    chrome.windows.create(
      { url: "https://gemini.google.com/app", type: "popup", width: w, height: h, left, top: 20 },
      (win) => { geminiWin = win?.id ?? null; }
    );
  if (geminiWin == null) return open();
  chrome.windows.update(geminiWin, { focused: true }, () => {
    if (chrome.runtime.lastError) { geminiWin = null; open(); }
  });
});

chrome.windows.onRemoved.addListener((id) => { if (id === geminiWin) geminiWin = null; });
