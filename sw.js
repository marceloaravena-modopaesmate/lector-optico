// Service worker del lector óptico: guarda la app en el celular para que funcione sin internet.
// Generado por construir.py (la versión cambia sola cuando cambia algún archivo).
const VERSION = 'lector-5d5327fa1d';
const ARCHIVOS = ["./", "index.html", "manifest.webmanifest", "css/app.css", "js/diseno.js", "js/lector.js", "js/almacen.js", "js/excel.js", "js/estadisticas.js", "js/graficos.js", "js/plantilla_tex.js", "js/plantillas_xlsx.js", "js/hojas.js", "js/temarios.js", "js/informe.js", "js/ejemplo.js", "js/app.js", "lib/jsQR.js", "lib/xlsx.full.min.js", "lib/jspdf.umd.min.js", "lib/qrcode.js", "icono-192.png", "icono-512.png", "apple-touch-icon.png"];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Archivos de la app: primero lo guardado. Fuentes de Google: se guardan la primera vez que se usan.
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  const url = new URL(ev.request.url);
  const fuente = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fuente) return;
  ev.respondWith(caches.match(ev.request, { ignoreSearch: true }).then((guardado) => guardado || fetch(ev.request).then((r) => {
    if (r.ok || r.type === 'opaque') { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(ev.request, copia)); }
    return r;
  })));
});
