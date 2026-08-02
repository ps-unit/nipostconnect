// NiPOST Connect Service Worker v2
const STATIC_CACHE = "nipost-static-v2";
const SHELL_ASSETS = ["/","/offline.html","/manifest.json","/icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/socket.io")) return;
  if (request.url.startsWith("chrome-extension")) return;

  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(request).catch(() =>
      new Response(JSON.stringify({ error: "You are offline." }), { headers: { "Content-Type": "application/json" }, status: 503 })
    ));
    return;
  }

  if (url.pathname.startsWith("/uploads/")) {
    e.respondWith(caches.open(STATIC_CACHE).then(async c => {
      const cached = await c.match(request);
      if (cached) return cached;
      const res = await fetch(request);
      if (res.ok) c.put(request, res.clone());
      return res;
    }));
    return;
  }

  if (request.mode === "navigate") {
    e.respondWith(fetch(request).catch(async () => {
      const cached = await caches.match("/");
      return cached || caches.match("/offline.html");
    }));
    return;
  }

  if (url.pathname.match(/\.(js|css|woff2?|png|jpg|svg|ico)$/)) {
    e.respondWith(caches.open(STATIC_CACHE).then(async c => {
      const cached = await c.match(request);
      const fp = fetch(request).then(r => { if (r.ok) c.put(request, r.clone()); return r; });
      return cached || fp;
    }));
  }
});

self.addEventListener("push", e => {
  let data = { title: "NiPOST Connect", body: "New notification", icon: "/icons/icon-192.png" };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/badge-72.png", tag: data.tag || "nipost",
    renotify: data.renotify || false, requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200], data: data.data || {},
    actions: [{ action: "open", title: "Open" }, { action: "dismiss", title: "Dismiss" }],
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  if (e.action === "dismiss") return;
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && "focus" in c) {
          c.focus(); c.postMessage({ type: "NOTIFICATION_CLICK", url }); return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
