/* Service worker del panel: guarda el cascarón de la app para que se instale y abra como app.
   Los datos (/api y /mcp) nunca se guardan aquí: siempre van a la red. */
const CACHE = 'mi-agente-v1';
const CASCARON = ['/', '/manifest.webmanifest', '/iconos/192.png', '/iconos/512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CASCARON))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* Trae de la red y, si salió bien, guarda una copia. */
async function redYGuardar(pedido) {
  const respuesta = await fetch(pedido);
  if (respuesta.ok && respuesta.type === 'basic') {
    const copia = respuesta.clone();
    caches.open(CACHE).then((c) => c.put(pedido, copia)).catch(() => {});
  }
  return respuesta;
}

self.addEventListener('fetch', (e) => {
  const pedido = e.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/mcp') return;

  // Los archivos compilados no cambian de nombre: caché primero.
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(caches.match(pedido).then((r) => r || redYGuardar(pedido)));
    return;
  }

  // Páginas: red primero; sin conexión, la última copia (o la portada).
  if (pedido.mode === 'navigate') {
    e.respondWith(redYGuardar(pedido).catch(() => caches.match(pedido).then((r) => r || caches.match('/'))));
    return;
  }

  // Lo demás (manifiesto, íconos, letras): red primero y caché si falla.
  e.respondWith(redYGuardar(pedido).catch(() => caches.match(pedido)));
});
