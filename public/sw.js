const VERSION = 'mapventure-v3'
const APP_CACHE = `${VERSION}-app`
const TILE_CACHE = `${VERSION}-tiles`
const CORE_ASSETS = [
  '/MapVenture/',
  '/MapVenture/index.html',
  '/MapVenture/app-icon.svg',
  '/MapVenture/manifest.webmanifest'
]
const MAX_TILE_ENTRIES = 800

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('mapventure-') && key !== APP_CACHE && key !== TILE_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

async function networkFirstNavigation(request) {
  const cache = await caches.open(APP_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put('/MapVenture/index.html', response.clone())
    return response
  } catch {
    return (
      await cache.match('/MapVenture/index.html')
      ?? await cache.match('/MapVenture/')
      ?? new Response('MapVenture is unavailable offline until it has loaded once.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      })
    )
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(APP_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached ?? network
}

async function trimTiles(cache) {
  const keys = await cache.keys()
  if (keys.length <= MAX_TILE_ENTRIES) return
  await Promise.all(keys.slice(0, keys.length - MAX_TILE_ENTRIES).map((key) => cache.delete(key)))
}

async function cacheFirstTile(request) {
  const cache = await caches.open(TILE_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone())
    void trimTiles(cache)
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (
    url.hostname === 'tiles.openfreemap.org'
    || url.hostname === 'tile.openstreetmap.org'
  ) {
    event.respondWith(cacheFirstTile(request))
    return
  }

  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})
