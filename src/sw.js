// src/sw.js - Offline Service Worker for AppFlowy Lean Mobile & Desktop Web
'use strict';

const CACHE_NAME = 'appflowy-lean-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './i18n.js',
  './store.js',
  './renderer.js',
  './components/io.js',
  './components/ai.js',
  './components/editor.js',
  './components/database.js',
  './components/palette.js',
  './components/settings.js',
  './components/shell.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
