// Offline shell for the app files; YouTube itself always goes to the network.
const CACHE = "rounds-v4";
const FILES = ["./", "index.html", "style.css", "shared.js", "core.js", "subs.js", "embed.js", "sync.js", "app.js", "manifest.webmanifest", "icons/icon128.png", "icons/icon192.png", "icons/icon512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // network first (so updates arrive), cache as fallback when offline
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
