// Service worker (registered in production only, by components/nav/OfflineSales.tsx).
// Lets the register open and show the menu without Wi-Fi. Sales made offline wait in the page's
// localStorage and are sent later (lib/offline-sales.ts); this file never caches money or stock data.
const CACHE = "cafe-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/register"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Try the network; if it fails, use the last copy we saw.
async function networkFirst(request, key = request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Built files have their hash in the name, so a cached copy is always right.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }
  // The register page and its menu. Stock and Money always need the live data.
  if (request.mode === "navigate" && url.pathname === "/register") {
    event.respondWith(networkFirst(request, "/register"));
  } else if (url.pathname === "/api/menu") {
    event.respondWith(networkFirst(request));
  }
});
