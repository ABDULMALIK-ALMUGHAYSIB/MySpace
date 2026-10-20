// Minimal service worker: no caching, just a passthrough fetch handler.
// Having a registered service worker with a fetch listener is part of what
// lets Chrome on Android offer a real "Install app" instead of a plain
// home-screen shortcut.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
