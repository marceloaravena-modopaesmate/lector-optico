// Service worker del lector óptico: guarda la app en el celular para que funcione sin internet.
// Generado por construir.py (la versión cambia sola cuando cambia algún archivo).
const VERSION = 'lector-a61d57b891';
const ARCHIVOS = ["./", "index.html", "manifest.webmanifest", "css/app.css", "js/diseno.js", "js/lector.js", "js/almacen.js", "js/excel.js", "js/estadisticas.js", "js/graficos.js", "js/plantilla_tex.js", "js/plantillas_xlsx.js", "js/hojas.js", "js/temarios.js", "js/informe.js", "js/ejemplo.js", "js/app.js", "lib/jsQR.js", "lib/xlsx.full.min.js", "lib/jspdf.umd.min.js", "lib/qrcode.js", "icono-192.png", "icono-512.png", "apple-touch-icon.png"];

// Al instalar, baja todo de nuevo sin usar la caché del navegador
self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(ARCHIVOS.map((a) => new Request(a, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const guardar = (req, r) => { if (r.ok || r.type === 'opaque') { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(req, copia)); } return r; };

// Página, código y estilos: primero internet (así siempre se ve la última versión) y, sin conexión, lo guardado.
// Librerías, íconos y fuentes: primero lo guardado, porque casi nunca cambian.
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  const url = new URL(ev.request.url);
  const fuente = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fuente) return;
  const fijo = fuente || /\/lib\/|\.png$/.test(url.pathname);
  if (fijo) {
    ev.respondWith(caches.match(ev.request, { ignoreSearch: true }).then((g) => g || fetch(ev.request).then((r) => guardar(ev.request, r))));
    return;
  }
  ev.respondWith(new Promise((listo) => {
    let hecho = false;
    const desdeCache = () => caches.match(ev.request, { ignoreSearch: true }).then((g) => g || caches.match('index.html'));
    // con internet lento, a los 4 segundos se usa lo guardado
    const reloj = setTimeout(() => desdeCache().then((g) => { if (g && !hecho) { hecho = true; listo(g); } }), 4000);
    fetch(ev.request, { cache: 'no-cache' }).then((r) => {
      clearTimeout(reloj);
      guardar(ev.request, r);
      if (!hecho) { hecho = true; listo(r); }
    }).catch(() => { clearTimeout(reloj); if (!hecho) desdeCache().then((g) => { hecho = true; listo(g || Response.error()); }); });
  }));
});
