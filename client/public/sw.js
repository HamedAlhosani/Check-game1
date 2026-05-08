/* Check game — service worker
 *
 * Minimal SW: handles incoming Web Push messages (friend invite, friend
 * request, daily reward ready, clan war closing, etc) and routes a click
 * back to the relevant in-app URL. We deliberately do NOT cache any
 * routes — the app is online-first, and the build hash lives in the JS
 * filenames so versioning Just Works without a cache layer.
 */

self.addEventListener('install', (event) => {
  // Activate immediately — no need to wait for old tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* noop */ }
  const title = data.title || 'Check';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || data.icon || '/favicon.ico',
    tag: data.tag || 'check-game',
    data: { url: data.url || '/' },
    dir: 'rtl',
    lang: 'ar',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Focus an existing tab if it's already on the right URL — otherwise
      // navigate the first available tab, falling back to opening a fresh
      // window.
      for (const c of list) {
        if (c.url.endsWith(url) && 'focus' in c) return c.focus();
      }
      for (const c of list) {
        if ('navigate' in c) { c.navigate(url); return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
