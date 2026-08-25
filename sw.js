const LUMI_CACHE_VERSION = 'lumi-pwa-v2';
const LUMI_STATIC_CACHE = `${LUMI_CACHE_VERSION}-static`;
const LUMI_PAGES_CACHE = `${LUMI_CACHE_VERSION}-pages`;

const CORE_ASSETS = [
  '/',
  '/arlista/',
  '/galeria/',
  '/offline.html',
  '/manifest.webmanifest',
  '/style.css',
  '/script.js',
  '/supabase-config.js',
  '/kepek/favicon-192.png',
  '/kepek/favicon-512.png',
  '/kepek/apple-touch-icon.png'
];

const NETWORK_ONLY_PATH_PREFIXES = ['/admin', '/fiokom', '/foglalas'];

function isNetworkOnlyPath(pathname) {
  return NETWORK_ONLY_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(LUMI_STATIC_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('lumi-pwa-') && ![LUMI_STATIC_CACHE, LUMI_PAGES_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isNetworkOnlyPath(url.pathname)) {
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request).catch(() => caches.match('/offline.html'))
      );
    }
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstPage(request) {
  const cache = await caches.open(LUMI_PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await caches.match('/offline.html'));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(LUMI_STATIC_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || Response.error();
}

self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'Lumi Nails';
  const options = {
    body: payload.body || 'Új értesítés érkezett.',
    icon: payload.icon || '/kepek/favicon-192.png',
    badge: payload.badge || '/kepek/favicon-96.png',
    tag: payload.tag || 'lumi-notification',
    data: {
      url: payload.url || '/',
      ...(payload.data || {})
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification?.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    })
  );
});
