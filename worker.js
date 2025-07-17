// public/worker.js

// Skip waiting so the SW activates immediately
self.addEventListener('install', () => self.skipWaiting());

// Take control of all clients as soon as it activates
self.addEventListener('activate', () => self.clients.claim());

// A fetch handler is required for some browsers to consider you “installable”,
// even if you don’t actually cache anything yet.
self.addEventListener('fetch', event => {
  // we’re not caching yet—just letting requests pass through
  return;
});
