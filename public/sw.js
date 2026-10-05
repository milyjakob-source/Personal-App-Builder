// Offline-Cache für MILI. App-Dateien aus dem Cache, Seite und News zuerst aus dem Netz.
const CACHE = 'mili-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Gebaute Dateien haben einen Hash im Namen und ändern sich nie.
  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(
        (treffer) =>
          treffer ||
          fetch(e.request).then((r) => {
            const kopie = r.clone();
            if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, kopie));
            return r;
          }),
      ),
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const kopie = r.clone();
        if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, kopie));
        return r;
      })
      .catch(() => caches.match(e.request).then((t) => t || caches.match('./index.html'))),
  );
});
