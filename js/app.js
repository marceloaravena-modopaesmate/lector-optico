/*
 * Pantallas de la app. Cada pantalla es una función que devuelve HTML;
 * los botones llevan data-accion="..." y se atienden en ACCIONES.
 */
(() => {
  const raiz = document.getElementById('app');
  const E = {
    pantalla: 'inicio',
    revision: null,      // hoja que se está revisando
    cola: [],            // fotos subidas que faltan por leer
    filtro: 'todos',
    ensayoEditado: null, // borrador del ensayo en edición
    cursoAbierto: null,
    hojaPregunta: null,  // pregunta abierta en la hoja inferior
    confirmar: null,     // { texto, accion }
    texto: null,         // { titulo, contenido } para mostrar LaTeX
    procesando: false,
    camara: { stream: null, auto: true, aciertos: 0, timer: null, mensaje: '' },
  };

  // ---------- Utilidades ----------
  const h = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (x) => Math.round(x * 100) + '%';
  const iniciales = (n) => {
    const p = n.split(/\s+/).filter(Boolean);
    const apellido = (p.length >= 3 ? p[p.length - 2] : p[1]) || '';
    return ((p[0] || '?').charAt(0) + apellido.charAt(0)).toUpperCase();
  };
  const corto = (n) => { const p = n.split(/\s+/); return p.length > 2 ? p[0] + ' ' + p[p.length - 2] : n; };

  const ICONO = {
    camara: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    casa: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l9-7 9 7v11H3z"/></svg>',
    grafico: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
    doc: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>',
    grupo: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    informe: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><path d="M9 17v-3"/><path d="M12 17v-6"/><path d="M15 17v-2"/></svg>',
    atras: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    ajustes: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
    bajar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
    subir: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
    galeria: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
    alerta: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    cerrar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
  };

  let temporizadorToast = null;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => { t.hidden = true; }, 3500);
  }

  const capacidades = {};
  async function capacidad(nombre) {
    if (!(nombre in capacidades)) {
      capacidades[nombre] = (window.claude && window.claude.use) ? window.claude.use(nombre).catch(() => null) : Promise.resolve(null);
    }
    return capacidades[nombre];
  }

  async function descargar(nombre, blob) {
    const dl = await capacidad('downloads');
    if (dl) {
      try { await dl.save({ filename: nombre, data: blob }); } catch (e) {
        if (e && e.code === 'declined') return;
        toast('No se pudo descargar ' + nombre + (e && e.message ? ': ' + e.message : ''));
      }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  // ---------- Datos ----------
  const config = () => Almacen.obtener('config', 'app') || {};
  async function fijarConfig(cambios) { await Almacen.guardar('config', 'app', { ...config(), ...cambios }); }
  const ensayos = () => Almacen.lista('ensayos').sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
  // Perfiles de docente (sin contraseña): cada uno ve solo sus cursos. El perfil activo se recuerda en este equipo.
  const CLAVE_PERFIL = 'lector-optico:perfil';
  const docentes = () => config().docentes || [];
  function perfilActivo() {
    let id = null; try { id = localStorage.getItem(CLAVE_PERFIL); } catch (e) { /* sin almacenamiento */ }
    return docentes().find((d) => d.id === id) || null;
  }
  const todosLosCursos = () => Almacen.lista('cursos').sort((a, b) => a.nombre.localeCompare(b.nombre));
  const cursos = () => { const p = perfilActivo(); return !p || p.todos ? todosLosCursos() : todosLosCursos().filter((c) => (p.cursos || []).includes(c.id)); };
  // Sin elección no hay ensayo ni curso activos: al abrir la app el docente los elige en Inicio
  function ensayoActivo() { const c = config(); return (c.ensayo && Almacen.obtener('ensayos', c.ensayo)) || null; }
  function cursoActivo() { const c = config(); const cur = (c.curso && Almacen.obtener('cursos', c.curso)) || null; return cur && cursos().some((x) => x.id === cur.id) ? cur : null; }
  const hayDatos = () => ensayos().length > 0 && cursos().length > 0;
  // Ensayos que se están corrigiendo a la vez: el elegido en Inicio y los que se sumen
  function ensayosEnCorreccion() {
    const act = ensayoActivo();
    if (!act) return [];
    const extra = (config().ensayosExtra || []).filter((id) => id !== act.id).map((id) => Almacen.obtener('ensayos', id)).filter(Boolean);
    return [act, ...extra];
  }
  const idResultados = (ensayoId, cursoId) => Almacen.id(ensayoId + '__' + cursoId);
  function hojasDe(ensayo, curso) {
    if (!ensayo || !curso) return {};
    const r = Almacen.obtener('resultados', idResultados(ensayo.id, curso.id));
    return (r && r.hojas) || {};
  }
  function idEstudiante(curso, e) { return e.rut ? Almacen.id(e.rut) : Almacen.id(curso.nombre) + '-' + e.lista; }

  // El QR trae el id del estudiante: se busca en todos los cursos
  function buscarEstudiante(textoId) {
    const buscado = Almacen.id(textoId);
    for (const c of cursos()) {
      const e = c.estudiantes.find((x) => x.id === buscado || (x.rut && Almacen.id(x.rut) === buscado)
        || Almacen.id(c.nombre) + '-' + x.lista === buscado);
      if (e) return { curso: c, estudiante: e };
    }
    return null;
  }

  async function cargarEjemplo() {
    const ejes = ['Números', 'Álgebra y funciones', 'Geometría', 'Probabilidad y estadística'];
    const habs = ['Resolver problemas', 'Modelar', 'Representar', 'Argumentar'];
    const ensayo = {
      id: 'PAES-M1-2026-01', nombre: 'Ensayo PAES M1 N°1 (ejemplo)', tipo: 'PAES',
      asignatura: 'PAES Competencia Matemática (M1)', nivel: 'IV medio', fecha: '10-11-2026', alternativas: 4,
      creado: new Date().toISOString(), ejemplo: true,
      tablaPaes: Estad.TABLAS_PAES.m1.puntajes.slice(),
      preguntas: Array.from({ length: 65 }, (_, i) => ({
        n: i + 1, clave: 'ABCD'[((i + 1) * 7) % 4], eje: ejes[Math.min(Math.floor(i * 4 / 65), 3)], habilidad: habs[(i + 1) % 4], contenido: '',
        ...((i + 1) % 13 === 0 ? { piloto: true } : {}),
      })),
    };
    const nombres = ['Camila Andrea Rojas Muñoz', 'Benjamín Soto Pérez', 'Valentina Fuentes Lagos', 'Matías Ignacio Vera Díaz'];
    const curso = { id: 'IVA-ejemplo', nombre: 'IV°A', ejemplo: true, estudiantes: [] };
    curso.estudiantes = nombres.map((nombre, i) => ({ lista: i + 1, nombre, rut: i === 0 ? '12345678-9' : '' }));
    curso.estudiantes.forEach((e) => { e.id = idEstudiante(curso, e); });
    await Almacen.guardar('ensayos', ensayo.id, ensayo);
    await Almacen.guardar('cursos', curso.id, curso);
    await fijarConfig({ ensayo: ensayo.id, curso: curso.id });
    toast('Listo: ensayo y curso de ejemplo cargados');
  }

  // ---------- Pantallas ----------
  function nav(actual) {
    const b = (id, icono, texto) => `<button data-accion="ir" data-a="${id}" ${actual === id ? 'aria-current="page"' : ''}>${icono}${texto}</button>`;
    return `<nav class="nav" aria-label="Navegación"><div>
      ${b('inicio', ICONO.casa, 'Inicio')}${b('camara', ICONO.camara, 'Corregir')}${b('curso', ICONO.grafico, 'Resultados')}${b('ensayos', ICONO.doc, 'Ensayos')}
    </div></nav>`;
  }

  function cabecera(titulo, sub, volver = 'inicio', extra = '') {
    return `<header class="cabecera">
      <button class="btn-redondo" data-accion="ir" data-a="${volver}" aria-label="Volver">${ICONO.atras}</button>
      <div class="titulos"><h1>${h(titulo)}</h1>${sub ? `<span class="sub">${h(sub)}</span>` : ''}</div>${extra}
    </header>`;
  }

  // Instalar la app: botón directo donde el navegador lo permite (Android) e instrucciones en iPhone
  let pedidoInstalar = null;
  addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); pedidoInstalar = ev; if (E.pantalla === 'inicio') render(); });
  addEventListener('appinstalled', () => { pedidoInstalar = null; render(); });
  const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const enIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  // ---------- Protección de datos ----------
  // En el navegador, los datos viven solo en este equipo: se cuentan los cambios desde el último respaldo
  // y se pide al navegador que no borre el almacenamiento de la app.
  const RESP = { cambios: 'lector-optico:cambios-sin-respaldo', fecha: 'lector-optico:ultimo-respaldo' };
  const leerLocal = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const escribirLocal = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const cambiosSinRespaldo = () => parseInt(leerLocal(RESP.cambios) || '0', 10) || 0;
  const ultimoRespaldo = () => leerLocal(RESP.fecha);
  const guardarAlmacen = Almacen.guardar;
  Almacen.guardar = async (col, id, valor) => {
    const nuevoCurso = col === 'cursos' && !Almacen.obtener('cursos', id);
    const r = await guardarAlmacen(col, id, valor);
    // Un curso nuevo queda asignado al docente que lo creó
    const p = nuevoCurso && perfilActivo();
    if (p && !p.todos && !(p.cursos || []).includes(id)) await guardarAlmacen('config', 'app', { ...config(), docentes: docentes().map((d) => (d.id === p.id ? { ...d, cursos: [...(d.cursos || []), id] } : d)) });
    if (col !== 'config') escribirLocal(RESP.cambios, String(cambiosSinRespaldo() + 1));
    return r;
  };
  let almacenamientoProtegido = null;
  async function protegerAlmacenamiento() {
    try {
      if (!navigator.storage || !navigator.storage.persist) return;
      almacenamientoProtegido = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    } catch (e) { /* el navegador no lo permite */ }
  }
  async function respaldarAhora() {
    await descargar(`respaldo_lector_${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(Almacen.respaldo())], { type: 'application/json' }));
    escribirLocal(RESP.cambios, '0'); escribirLocal(RESP.fecha, new Date().toISOString());
    E.ocultarRespaldo = false; toast('Respaldo descargado. Guárdalo en Drive, OneDrive o un correo para tenerlo fuera de este equipo.');
    E.mantenerScroll = true; render();
  }
  function avisoRespaldo() {
    if (Almacen.modo === 'nube' || E.ocultarRespaldo) return '';
    const n = cambiosSinRespaldo(), f = ultimoRespaldo();
    const dias = f ? Math.floor((Date.now() - new Date(f).getTime()) / 86400000) : null;
    const hayDatosPropios = Almacen.lista('resultados').some((r) => Object.keys(r.hojas || {}).length && !(Almacen.obtener('cursos', r.curso) || {}).ejemplo);
    if (!hayDatosPropios || n === 0) return '';
    if (!(n >= 15 || (dias != null && dias >= 7) || (f == null && n >= 5))) return '';
    const cuando = f ? `Tu último respaldo fue ${dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`}` : 'Aún no has descargado un respaldo';
    return `<div class="aviso rev respaldo">${ICONO.alerta}<span><b>Respalda tus datos.</b> ${cuando} y ${f ? 'desde entonces hay' : 'ya llevas'} ${n} cambio${n === 1 ? '' : 's'} (hojas, cursos o ensayos). Tus datos están solo en este equipo: si se borra el navegador, se pierden.</span>
      <div class="fila-botones"><button class="btn primario" data-accion="respaldo">${ICONO.bajar} Respaldar ahora</button><button class="btn" data-accion="ocultar-respaldo">Más tarde</button></div></div>`;
  }

  function avisoInstalar() {
    if (instalada() || location.protocol === 'file:' || E.ocultarInstalar) return '';
    if (pedidoInstalar) return `<div class="aviso ok instalar">${ICONO.bajar}<span>Instala la app en este equipo para abrirla como una aplicación, incluso sin internet.</span><div class="fila-botones"><button class="btn primario" data-accion="instalar">Instalar app</button><button class="btn" data-accion="ocultar-instalar">Ahora no</button></div></div>`;
    if (enIphone()) return `<div class="aviso ok instalar">${ICONO.bajar}<span>Para instalar la app en el iPhone, ábrela en <b>Safari</b>, toca Compartir (el cuadrado con la flecha) y elige <b>Agregar a inicio</b>.</span><div class="fila-botones"><button class="btn" data-accion="ocultar-instalar">Entendido</button></div></div>`;
    return '';
  }

  function pInicio() {
    const ens = ensayoActivo(), cur = cursoActivo();
    const col = config().colegio || {};
    const totalHojas = Almacen.lista('resultados').reduce((n, r) => n + Object.keys(r.hojas || {}).length, 0);
    // Ilustración: una hoja de respuestas con una línea de lectura que la recorre
    const hojaIlustrada = (() => {
      const llenas = new Set([1, 6, 8, 15, 18, 22, 25, 31]);
      let c = '';
      for (let f = 0; f < 8; f++) for (let k = 0; k < 4; k++) {
        const i = f * 4 + k, x = 22 + k * 15, y = 34 + f * 13;
        c += llenas.has(i) ? `<circle cx="${x}" cy="${y}" r="4.6" class="b-llena"/>` : `<circle cx="${x}" cy="${y}" r="4.2" class="b-vacia"/>`;
      }
      return `<svg class="hoja-ilustrada" viewBox="0 0 92 150" aria-hidden="true">
        <rect x="2" y="2" width="88" height="146" rx="9" class="h-papel"/>
        <rect x="8" y="8" width="7" height="7" class="h-marca"/><rect x="77" y="8" width="7" height="7" class="h-marca"/><rect x="8" y="135" width="7" height="7" class="h-marca"/><rect x="77" y="135" width="7" height="7" class="h-marca"/>
        <rect x="22" y="10" width="44" height="5" rx="2.5" class="h-linea"/>${c}
        <g class="h-escaner"><rect x="4" y="0" width="84" height="16" class="h-brillo"/><rect x="4" y="15" width="84" height="2" rx="1" class="h-rayo"/></g>
      </svg>`;
    })();
    const logo = '<svg class="logo-app" viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="6" width="28" height="36" rx="4" fill="#fff"/><g fill="#1A4080"><circle cx="24" cy="15" r="2.6"/><circle cx="31" cy="22" r="2.6"/><circle cx="17" cy="29" r="2.6"/><circle cx="24" cy="35" r="2.6"/></g><g fill="none" stroke="#1A4080" stroke-width="1.3"><circle cx="17" cy="15" r="2.3"/><circle cx="31" cy="15" r="2.3"/><circle cx="17" cy="22" r="2.3"/><circle cx="24" cy="22" r="2.3"/><circle cx="24" cy="29" r="2.3"/><circle cx="31" cy="29" r="2.3"/><circle cx="17" cy="35" r="2.3"/><circle cx="31" cy="35" r="2.3"/></g></svg>';
    let tarjeta;
    if ((!ens || !cur) && hayDatos()) {
      tarjeta = `<section class="tarjeta-inicio elegir">
        <span class="eyebrow">Para empezar</span>
        <span class="nombre">¿Con qué ensayo y curso trabajas hoy?</span>
        <label class="campo" for="sel-ensayo">Ensayo<select id="sel-ensayo" data-cambio="ensayo"><option value="" ${ens ? '' : 'selected'}>Selecciona un ensayo…</option>${ensayos().map((e) => `<option value="${h(e.id)}" ${ens && e.id === ens.id ? 'selected' : ''}>${h(e.nombre)}</option>`).join('')}</select></label>
        <label class="campo" for="sel-curso">Curso<select id="sel-curso" data-cambio="curso"><option value="" ${cur ? '' : 'selected'}>Selecciona un curso…</option>${cursos().map((c) => `<option value="${h(c.id)}" ${cur && c.id === cur.id ? 'selected' : ''}>${h(c.nombre)}</option>`).join('')}</select></label>
        <button class="btn grande cta" disabled>${ICONO.camara} Corregir hojas</button>
      </section>`;
    } else if (!ens || !cur) {
      tarjeta = `<section class="tarjeta-inicio vacia">
        <span class="eyebrow">Para empezar</span>
        <span class="nombre">Crea un ensayo y carga tu curso</span>
        <span class="detalle">Necesitas la clave del ensayo y la lista del curso, ambas desde las plantillas Excel. También puedes probar la app con datos de ejemplo.</span>
        <div class="fila-botones"><button class="btn primario" data-accion="ir" data-a="${!ens ? 'ensayo-nuevo' : 'cursos'}">${!ens ? 'Crear ensayo' : 'Cargar curso'}</button>
        <button class="btn" data-accion="ejemplo">Usar ejemplo</button></div>
      </section>`;
    } else {
      const hojas = hojasDe(ens, cur);
      const hechas = cur.estudiantes.filter((e) => hojas[e.id]).length, total = cur.estudiantes.length;
      const fr = total ? hechas / total : 0, C = 2 * Math.PI * 30;
      tarjeta = `<section class="tarjeta-inicio">
        <div class="ti-fila">
          <div class="anillo" role="img" aria-label="${hechas} de ${total} hojas corregidas">
            <svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" class="a-pista"/><circle cx="36" cy="36" r="30" class="a-valor" stroke-dasharray="${(fr * C).toFixed(1)} ${C.toFixed(1)}"/></svg>
            <span><b class="num">${hechas}</b><small>de ${total}</small></span>
          </div>
          <div class="ti-texto">
            <span class="eyebrow">Ensayo en curso</span>
            <span class="nombre">${h(ens.nombre)}</span>
            <span class="detalle">${h(cur.nombre)} · ${ens.preguntas.length} preguntas${ens.fecha ? ' · ' + h(ens.fecha) : ''}</span>
          </div>
        </div>
        <button class="btn grande cta" data-accion="ir" data-a="camara">${ICONO.camara} Corregir hojas${ensayosEnCorreccion().length > 1 ? ` de ${ensayosEnCorreccion().length} ensayos` : ''}</button>
        <div class="dos">
          <label class="oculto-visual" for="sel-ensayo">Ensayo</label>
          <select id="sel-ensayo" data-cambio="ensayo">${ensayos().map((e) => `<option value="${h(e.id)}" ${e.id === ens.id ? 'selected' : ''}>${h(e.nombre)}</option>`).join('')}</select>
          <label class="oculto-visual" for="sel-curso">Curso</label>
          <select id="sel-curso" data-cambio="curso">${cursos().map((c) => `<option value="${h(c.id)}" ${c.id === cur.id ? 'selected' : ''}>${h(c.nombre)}</option>`).join('')}</select>
        </div>
        ${ensayos().length > 1 ? `<div class="corregir-tambien"><span class="etiqueta">También corrijo en esta sesión</span>
          <div class="filtros">${ensayos().filter((e) => e.id !== ens.id).map((e) => `<button data-accion="extra-ensayo" data-a="${h(e.id)}" aria-pressed="${ensayosEnCorreccion().some((x) => x.id === e.id)}">${h(e.nombre)}</button>`).join('')}</div>
          ${ensayosEnCorreccion().length > 1 ? '<span class="nota">Las hojas con QR se guardan solas en su ensayo. En las hojas sin QR eliges el ensayo al revisarlas.</span>' : ''}</div>` : ''}
      </section>`;
    }
    let recientes = '';
    if (ens && cur) {
      const hojas = hojasDe(ens, cur);
      const ult = cur.estudiantes.filter((e) => hojas[e.id]).sort((a, b) => hojas[b.id].fecha.localeCompare(hojas[a.id].fecha)).slice(0, 3);
      if (ult.length) {
        recientes = `<section style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:baseline"><h2 class="titulo-seccion">Últimas corregidas</h2>
          <button class="btn" style="min-height:36px;border:0;background:none" data-accion="ir" data-a="curso">Ver todas</button></div>
          <div class="tarjeta lista">${ult.map((e) => {
            const r = hojas[e.id];
            return `<button class="item" data-accion="ver-hoja" data-a="${h(e.id)}"><span class="iniciales">${h(iniciales(e.nombre))}</span>
              <span class="principal"><b>${h(e.nombre)}</b><span>${h(hace(r.fecha))} · N° ${e.lista}</span></span>
              <span class="chip ok num">${pct(Estad.contar(ens, r.respuestas).logro)}</span></button>`;
          }).join('')}</div></section>`;
      }
    }
    const tile = (accion, a, icono, tono, titulo, sub) => `<button data-accion="${accion}" data-a="${a}"><span class="icono-tile tono-${tono}">${icono}</span><b>${titulo}</b><span>${sub}</span></button>`;
    return `<div class="pantalla inicio">
      <header class="portada">
        <div class="portada-fila">
          <div class="portada-marca">${logo}<div><span class="saludo">${saludo()}</span><span class="marca">Lector óptico</span>${perfilActivo() ? `<button class="perfil-chip" data-accion="cambiar-perfil">${h(perfilActivo().nombre)} · cambiar</button>` : ''}</div></div>
          <button class="btn-redondo" data-accion="ir" data-a="ajustes" aria-label="Ajustes y respaldo">${ICONO.ajustes}</button>
        </div>
        <div class="portada-centro">
          <div class="portada-titular">
            <h1>Corrige.<br>Analiza.<br><em>Decide.</em></h1>
            <p>Ensayos PAES y SIMCE corregidos con la cámara y convertidos en informes para cada destinatario.</p>
          </div>
          ${hojaIlustrada}
        </div>
        ${col.nombre ? `<span class="portada-colegio">${col.logo ? `<img src="${col.logo.src}" alt="">` : ''}${h(col.nombre)}</span>` : ''}
        ${ensayos().length || cursos().length ? `<div class="portada-cifras"><span><b class="num">${ensayos().length}</b> ${ensayos().length === 1 ? 'ensayo' : 'ensayos'}</span><span><b class="num">${cursos().length}</b> ${cursos().length === 1 ? 'curso' : 'cursos'}</span><span><b class="num">${totalHojas}</b> hojas</span></div>` : ''}
      </header>
      <div class="cuerpo">${avisoRespaldo()}${avisoInstalar()}${tarjeta}
        <button class="destacado-informes" data-accion="ir" data-a="informes">
          <span class="di-icono">${ICONO.informe}</span>
          <span class="di-texto"><b>Informes y análisis</b><span>Directivo, docente, estudiante y apoderados en PDF</span></span>
          <span class="di-flecha" aria-hidden="true">›</span>
        </button>
        <h2 class="titulo-seccion">Explorar</h2>
        <div class="mosaico">
          ${tile('ir-tab', 'curso', ICONO.grafico, 2, 'Estadísticas', 'Curso, preguntas y estudiantes')}
          ${tile('ir-tab', 'nivel', ICONO.grupo, 3, 'Paralelos', 'Compara los cursos del nivel')}
          ${tile('ir-tab', 'alertas', ICONO.alerta, 5, 'Alertas', 'Riesgo y reforzamiento')}
          ${tile('ir', 'colegio', ICONO.informe, 1, 'Colegio', 'Todos los niveles')}
          ${tile('ir', 'ensayos', ICONO.doc, 4, 'Ensayos', 'Claves, ejes y habilidades')}
          ${tile('ir', 'cursos', ICONO.grupo, 6, 'Cursos', 'Listas y hojas con QR')}
        </div>${recientes}
      </div>${nav('inicio')}</div>`;
  }

  function saludo() { const hr = new Date().getHours(); return hr < 12 ? 'Buenos días' : hr < 20 ? 'Buenas tardes' : 'Buenas noches'; }
  function hace(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'Recién';
    if (s < 3600) return 'Hace ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'Hace ' + Math.round(s / 3600) + ' h';
    return new Date(iso).toLocaleDateString('es-CL');
  }

  function pCamara() {
    const ens = ensayoActivo(), cur = cursoActivo();
    const hojas = hojasDe(ens, cur);
    const hechas = cur ? cur.estudiantes.filter((e) => hojas[e.id]).length : 0;
    const vivo = !!E.camara.stream;
    return `<div class="pantalla sin-nav camara">
      ${(() => { const set = ensayosEnCorreccion(); return set.length > 1
        ? cabecera(`${set.length} ensayos en corrección`, cur ? `${cur.nombre} · ${set.map((e) => `${etiquetaEnsayo(e)}: ${cur.estudiantes.filter((x) => hojasDe(e, cur)[x.id]).length}/${cur.estudiantes.length}`).join(' · ')}` : '', 'inicio')
        : cabecera(ens ? ens.nombre : 'Sin ensayo', cur ? `${cur.nombre} · ${hechas} de ${cur.estudiantes.length} corregidas` : '', 'inicio'); })()}
      <div class="visor">
        ${vivo ? '<video id="video" playsinline muted autoplay></video><canvas class="overlay" id="overlay"></canvas>' : `
        <div class="sin-camara">
          <label class="btn primario grande" for="foto-camara">${ICONO.camara} Tomar foto de la hoja</label>
          <div class="consejos">
            <span>Encuadra la hoja completa, con las 4 marcas negras de las esquinas a la vista.</span>
            <span>Busca buena luz, sin reflejos ni sombras fuertes encima.</span>
            <span>La hoja puede estar algo inclinada: la app la endereza.</span>
          </div>
        </div>`}
        ${vivo ? `<div class="estado" id="estado-camara">${h(E.camara.mensaje || 'Buscando la hoja…')}</div>` : ''}
        ${E.procesando ? `<div class="procesando" role="status">Leyendo la hoja…${E.cola.length ? ` (quedan ${E.cola.length})` : ''}</div>` : ''}
      </div>
      <input type="file" id="foto-camara" accept="image/*,.heic,.heif" capture="environment" class="oculto-visual" data-archivo="foto">
      <input type="file" id="foto-galeria" accept="image/*,.heic,.heif" multiple class="oculto-visual" data-archivo="foto">
      <div class="controles-camara">
        ${vivo ? `<div class="lado"><button class="interruptor" role="switch" aria-checked="${E.camara.auto}" data-accion="auto" aria-label="Captura automática"></button><span>Captura automática</span></div>
        <button class="disparador" data-accion="capturar" aria-label="Tomar foto"></button>` : `<div class="lado"></div><label class="disparador" for="foto-camara" aria-label="Tomar foto"></label>`}
        <label class="lado" for="foto-galeria">${ICONO.galeria}<span>Subir fotos</span></label>
      </div>
    </div>`;
  }

  function estadoCelda(rev, i) {
    const r = rev.respuestas[i];
    if (rev.estados[i] === 'doble' || rev.estados[i] === 'revisar') return 'rev';
    if (!r) return 'blanco';
    return r === rev.ensayo.preguntas[i].clave ? 'ok' : 'mal';
  }

  function pRevision() {
    const rev = E.revision;
    const ens = rev.ensayo;
    const n = Estad.puntuables(ens).length;
    let correctas = 0, pendientes = 0;
    const celdas = ens.preguntas.map((p, i) => {
      const est = estadoCelda(rev, i);
      if (est === 'ok' && !p.piloto) correctas++;
      if (est === 'rev') pendientes++;
      const marca = est === 'rev' ? (rev.estados[i] === 'doble' ? '?' : rev.respuestas[i] + '?') : (rev.respuestas[i] || '–');
      const desc = { ok: 'correcta', mal: 'incorrecta', blanco: 'en blanco', rev: 'por revisar' }[est];
      return `<button class="celda ${est}" data-accion="pregunta" data-a="${i}" aria-label="Pregunta ${p.n}: ${h(rev.respuestas[i] || 'sin marca')}, ${desc}"><small>${p.n}</small><b>${h(marca)}</b></button>`;
    }).join('');
    const est = rev.estudiante;
    const avisos = [];
    if (rev.error) avisos.push(`<div class="aviso mal">${ICONO.alerta}<span>${h(rev.error)}</span></div>`);
    if (pendientes) avisos.push(`<div class="aviso rev">${ICONO.alerta}<span><b>${pendientes} por revisar:</b> toca la pregunta y elige la respuesta.</span></div>`);
    if (rev.sugerido && est && rev.sugerido.estudiante.id !== est.id) avisos.push(`<div class="aviso rev respaldo">${ICONO.alerta}<span>El N° de lista marcado es de <b>${h(est.nombre)}</b>, pero el nombre escrito en la hoja parece ser <b>${h(rev.sugerido.estudiante.nombre)}</b> (${h(rev.sugerido.curso.nombre)}).</span><div class="fila-botones"><button class="btn" data-accion="usar-nombre">Es de ${h(Estad.nombres(rev.sugerido.estudiante.nombre).pila)}</button></div></div>`);
    if (rev.yaExistia) avisos.push(`<div class="aviso rev respaldo">${ICONO.alerta}<span>Este estudiante ya tenía una hoja corregida. Al guardar se reemplaza.</span>${rev.origen !== 'guardada' ? `<div class="fila-botones"><button class="btn" data-accion="omitir-hoja">${E.cola.length ? 'Omitir y seguir con la siguiente' : 'Omitir y dejar la guardada'}</button></div>` : ''}</div>`);
    let selector = '';
    // Sin QR del ensayo, el docente puede indicar a qué ensayo corresponde la hoja
    if (!rev.ensayoQR && rev.origen !== 'guardada' && ensayos().length > 1) {
      const opciones = ensayosEnCorreccion().length > 1 ? ensayosEnCorreccion() : ensayos();
      if (!opciones.some((e) => e.id === ens.id)) opciones.unshift(ens);
      selector += `<div class="tarjeta pad"><label class="campo" for="rev-ensayo">Ensayo de esta hoja<select id="rev-ensayo" data-cambio="rev-ensayo">${opciones.map((e) => `<option value="${h(e.id)}" ${e.id === ens.id ? 'selected' : ''}>${h(e.nombre)}</option>`).join('')}</select></label></div>`;
    }
    if (!est) {
      const cur = rev.curso || cursoActivo();
      selector = `<div class="tarjeta pad"><span class="etiqueta">¿De quién es esta hoja?</span>
        <span style="font-size:14px;color:var(--texto-2)">${rev.leyendoNombre ? 'No pude leer el QR. Estoy leyendo el nombre escrito en la hoja…' : h(rev.motivoSinEstudiante || 'No pude leer el QR ni el N° de lista.')}</span>
        ${(rev.candidatosNombre || []).length ? `<div class="fila-botones" style="flex-wrap:wrap">${rev.candidatosNombre.map((c, i) => `<button class="btn" data-accion="elegir-candidato" data-a="${i}">${h(c.estudiante.nombre)}${c.curso.id !== (cur && cur.id) ? ' · ' + h(c.curso.nombre) : ''}</button>`).join('')}</div>` : ''}
        <label class="campo" for="sel-estudiante">${(rev.candidatosNombre || []).length ? 'O elige otro estudiante' : 'Estudiante'} de ${h(cur ? cur.nombre : '')}
        <select id="sel-estudiante" data-cambio="estudiante"><option value="">Elige…</option>${(cur ? cur.estudiantes : []).map((e) => `<option value="${h(e.id)}">${e.lista}. ${h(e.nombre)}</option>`).join('')}</select></label></div>`;
    }
    const sub = est ? `N° ${est.lista} · ${rev.curso.nombre} · ${{ qr: 'leído por QR', lista: 'por N° de lista', nombre: 'leído por el nombre', manual: 'elegido a mano', guardada: 'hoja guardada' }[rev.origen]}` : 'Estudiante sin identificar';
    const puedeGuardar = !pendientes && est;
    return `<div class="pantalla sin-nav">
      <header class="cabecera" style="background:var(--superficie);border-bottom:1px solid var(--borde)">
        <button class="btn-redondo" data-accion="${rev.origen === 'guardada' ? 'ir' : 'repetir'}" data-a="curso" aria-label="Volver">${ICONO.atras}</button>
        <div class="titulos"><h1 style="font-size:17px">${h(est ? est.nombre : 'Hoja sin nombre')}</h1><span class="sub">${h(sub)}</span></div>
        <div class="puntaje"><b class="num">${pct(correctas / n)}</b><span class="num">${correctas} de ${n}</span></div>
      </header>
      <div class="cuerpo" style="padding-top:12px">
        ${avisos.join('')}${selector}
        <div class="leyenda"><span><i style="background:var(--ok-fondo);border:1px solid var(--ok-borde)"></i>Correcta</span><span><i style="background:var(--mal-fondo);border:1px solid var(--mal-borde)"></i>Incorrecta</span><span><i style="background:var(--blanco-fondo);border:1px solid var(--blanco-borde)"></i>En blanco</span><span><i style="background:var(--rev-fondo);border:2px solid var(--rev-borde)"></i>Revisar</span></div>
        <div class="grilla">${celdas}</div>
        <span style="font-size:13px;color:var(--texto-2)">${h(ens.nombre)}. Toca cualquier pregunta para cambiar la respuesta leída.</span>
      </div>
      <div class="barra-acciones">
        ${rev.origen === 'guardada' ? '<button class="btn" data-accion="ir" data-a="curso">Volver</button>' : '<button class="btn" data-accion="repetir">Repetir foto</button>'}
        <button class="btn primario" style="flex:1.6" data-accion="guardar" ${puedeGuardar ? '' : 'disabled'}>${puedeGuardar ? (rev.origen === 'guardada' ? 'Guardar cambios' : E.cola.length ? 'Guardar y seguir' : 'Guardar y siguiente') : !est ? 'Elige el estudiante' : `Resuelve ${pendientes} pendiente${pendientes > 1 ? 's' : ''}`}</button>
      </div>
      ${E.hojaPregunta != null ? hojaInferiorPregunta() : ''}
    </div>`;
  }

  function hojaInferiorPregunta() {
    const rev = E.revision, i = E.hojaPregunta, p = rev.ensayo.preguntas[i];
    const actual = rev.respuestas[i];
    const leida = rev.lectura ? rev.lectura[i] : null;
    let detalle = 'Clave: ' + p.clave;
    if (leida) {
      if (leida.estado === 'doble') detalle = `Doble marca (${(leida.opciones || []).join(' y ')}) · clave ${p.clave}`;
      else if (leida.estado === 'revisar') detalle = `Leí ${leida.letra} con dudas (${leida.motivo}) · clave ${p.clave}`;
      else detalle = `Leí: ${leida.letra || 'en blanco'} · clave ${p.clave}`;
    }
    const letras = 'ABCDE'.slice(0, rev.ensayo.alternativas).split('');
    const pendiente = rev.estados[i] === 'doble' || rev.estados[i] === 'revisar';
    return `<div class="velo" data-accion="cerrar-hoja"><div class="hoja-inferior" role="dialog" aria-label="Pregunta ${p.n}" data-dentro="1">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div style="display:flex;flex-direction:column;gap:2px"><h2 style="font-size:18px">Pregunta ${p.n}</h2><span style="font-size:13px;color:var(--texto-2)">${h(detalle)}</span>
        ${p.eje || p.habilidad ? `<span style="font-size:12px;color:var(--texto-2)">${h([p.eje, p.habilidad].filter(Boolean).join(' · '))}</span>` : ''}</div>
        <button class="btn-redondo" data-accion="cerrar-hoja" aria-label="Cerrar">${ICONO.cerrar}</button>
      </div>
      ${rev.hoja ? '<canvas id="recorte" aria-label="Recorte de la foto en esta pregunta"></canvas>' : ''}
      <div class="opciones">${letras.map((l) => `<button data-accion="elegir" data-a="${l}" aria-pressed="${!pendiente && actual === l}">${l}</button>`).join('')}
        <button data-accion="elegir" data-a="" aria-pressed="${!pendiente && !actual}" aria-label="En blanco">–</button></div>
    </div></div>`;
  }

  function pCurso() {
    const ens = ensayoActivo(), cur = cursoActivo();
    if (!ens || !cur) return pVacio('Resultados', 'Primero crea un ensayo y carga un curso.');
    const hojas = hojasDe(ens, cur);
    const c = Excel.calcular(ens, cur, hojas);
    const filas = c.filasEst.filter((f) => E.filtro === 'todos' || (E.filtro === 'hechas' ? f.h : !f.h));
    const pend = cur.estudiantes.length - c.corregidas.length;
    const filtro = (id, t) => `<button data-accion="filtro" data-a="${id}" aria-pressed="${E.filtro === id}">${t}</button>`;
    return `<div class="pantalla">
      ${cabecera(`${cur.nombre} · ${ens.nombre}`, `${cur.estudiantes.length} estudiantes · ${ens.preguntas.length} preguntas`)}
      <div class="cuerpo">
        <div class="cifras">
          <div class="tarjeta"><span>Corregidas</span><b class="num">${c.corregidas.length}<span style="font-size:14px">/${cur.estudiantes.length}</span></b></div>
          <div class="tarjeta"><span>Logro promedio</span><b class="num" style="color:var(--azul-texto)">${c.corregidas.length ? pct(c.promedio) : '–'}</b></div>
          <div class="tarjeta"><span>Pendientes</span><b class="num">${pend}</b></div>
        </div>
        <div class="filtros">${filtro('todos', `Todos (${cur.estudiantes.length})`)}${filtro('hechas', `Corregidas (${c.corregidas.length})`)}${filtro('pend', `Pendientes (${pend})`)}</div>
        <div class="tarjeta lista">${filas.length ? filas.map((f) => f.h
          ? `<button class="item" data-accion="ver-hoja" data-a="${h(f.e.id)}"><span class="n num">${f.e.lista}</span><span class="principal"><b>${h(f.e.nombre)}</b><span class="num">${f.correctas} correctas · ${f.omitidas} omitidas</span></span><span class="chip ok num">${pct(f.logro)}</span></button>`
          : `<div class="item"><span class="n num">${f.e.lista}</span><span class="principal"><b>${h(f.e.nombre)}</b></span><span class="chip pend">Pendiente</span></div>`).join('')
          : '<div class="vacio">No hay estudiantes en este filtro.</div>'}</div>
      </div>
      <div class="barra-acciones" style="bottom:calc(68px + env(safe-area-inset-bottom, 0px))">
        <button class="btn" data-accion="excel" ${c.corregidas.length ? '' : 'disabled'}>${ICONO.bajar} Exportar Excel</button>
        <button class="btn primario" data-accion="ir" data-a="camara">${ICONO.camara} Seguir corrigiendo</button>
      </div>${nav('curso')}</div>`;
  }

  function pVacio(titulo, texto) {
    if (hayDatos()) return `<div class="pantalla">${cabecera(titulo, '')}<div class="cuerpo"><div class="tarjeta vacio">Elige primero el ensayo y el curso en Inicio.
      <div class="fila-botones" style="margin-top:12px"><button class="btn primario" data-accion="ir" data-a="inicio">Ir a Inicio</button></div></div></div>${nav('')}</div>`;
    return `<div class="pantalla">${cabecera(titulo, '')}<div class="cuerpo"><div class="tarjeta vacio">${h(texto)}
      <div class="fila-botones" style="margin-top:12px"><button class="btn" data-accion="ir" data-a="ensayo-nuevo">Crear ensayo</button><button class="btn" data-accion="ejemplo">Usar ejemplo</button></div></div></div>${nav('')}</div>`;
  }

  function pEnsayos() {
    const lista = ensayos();
    return `<div class="pantalla">${cabecera('Ensayos', `${lista.length} guardado${lista.length === 1 ? '' : 's'}`)}
      <div class="cuerpo">
        <button class="btn primario grande" data-accion="ir" data-a="ensayo-nuevo">Nuevo ensayo</button>
        <div class="tarjeta lista">${lista.length ? lista.map((e) => `<button class="item" data-accion="editar-ensayo" data-a="${h(e.id)}">
          <span class="iniciales" style="border-radius:10px">${h(e.tipo === 'SIMCE' ? 'S' : 'P')}</span>
          <span class="principal"><b>${h(e.nombre)}</b><span>${h([e.asignatura, e.preguntas.length + ' preguntas', 'A–' + 'ABCDE'[e.alternativas - 1]].filter(Boolean).join(' · '))}</span></span></button>`).join('')
          : '<div class="vacio">Aún no hay ensayos. Crea uno con la plantilla Excel o escribiendo la clave.</div>'}</div>
      </div>${nav('ensayos')}</div>`;
  }

  function pEnsayo() {
    const e = E.ensayoEditado;
    const nuevo = !Almacen.obtener('ensayos', e.id);
    const asignaturas = Temarios.NOMBRES;
    const filas = e.preguntas.map((p) => `<tr${p.piloto ? ' class="piloto"' : ''}><td class="num">${p.n}</td><td class="clave">${h(p.clave)}</td><td>${h(p.eje)}</td><td>${h(p.habilidad)}</td><td>${h(p.contenido || '')}</td><td class="centro">${p.piloto ? 'sí' : ''}</td></tr>`).join('');
    const ejes = new Set(e.preguntas.map((p) => p.eje).filter(Boolean)).size;
    const habs = new Set(e.preguntas.map((p) => p.habilidad).filter(Boolean)).size;
    const clave = e.preguntas.map((p) => p.clave).join('');
    return `<div class="pantalla sin-nav">${cabecera(nuevo ? 'Nuevo ensayo' : 'Editar ensayo', '', 'ensayos')}
      <div class="cuerpo">
        <section class="tarjeta pad"><span class="etiqueta">1 · Datos</span>
          <div class="segmento" role="group" aria-label="Tipo de ensayo">${['SIMCE', 'PAES'].map((t) => `<button data-accion="tipo" data-a="${t}" aria-pressed="${e.tipo === t}">${t}</button>`).join('')}</div>
          <label class="campo" for="e-nombre">Nombre del ensayo<input id="e-nombre" data-campo="nombre" value="${h(e.nombre)}" placeholder="Ej.: Ensayo PAES M1 N°2"></label>
          <label class="campo" for="e-asig">Asignatura<input id="e-asig" data-campo="asignatura" list="asignaturas" value="${h(e.asignatura)}"></label>
          <datalist id="asignaturas">${asignaturas.map((a) => `<option value="${h(a)}"></option>`).join('')}</datalist>
          <div class="dos">
            <label class="campo" for="e-fecha">Fecha<input id="e-fecha" data-campo="fecha" value="${h(e.fecha)}" placeholder="dd-mm-aaaa"></label>
            <label class="campo" for="e-alt">Alternativas<select id="e-alt" data-campo="alternativas"><option value="4" ${e.alternativas === 4 ? 'selected' : ''}>4 (A–D)</option><option value="5" ${e.alternativas === 5 ? 'selected' : ''}>5 (A–E)</option></select></label>
          </div>
        </section>
        <section class="tarjeta pad"><span class="etiqueta">2 · Clave, ejes y habilidades</span>
          <label class="btn punteado grande" for="e-excel">${ICONO.subir} Cargar plantilla Excel</label>
          <input type="file" id="e-excel" accept=".xlsx,.xls" class="oculto-visual" data-archivo="ensayo">
          ${e.preguntas.length ? `<div class="aviso ok">${ICONO.check}<span>${e.preguntas.length} preguntas · ${ejes} ejes · ${habs} habilidades</span></div>
          <div class="tabla-claves" tabindex="0" aria-label="Clave del ensayo"><table><thead><tr><th>N°</th><th>Clave</th><th>Eje / Contenido</th><th>Habilidad</th><th>Contenido específico</th><th>Piloto</th></tr></thead><tbody>${filas}</tbody></table></div>` : ''}
          <label class="campo" for="e-clave">O escribe la clave seguida (una letra por pregunta)
            <input id="e-clave" data-campo="clave" value="${h(clave)}" placeholder="ABDCA…" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font-family:ui-monospace,monospace;letter-spacing:0.08em"></label>
          <label class="campo" for="e-pilotos">Preguntas piloto (no cuentan para el puntaje, la nota ni el logro)
            <input id="e-pilotos" data-campo="pilotos" value="${h(e.preguntas.filter((p) => p.piloto).map((p) => p.n).join(', '))}" placeholder="Ej.: 12, 25, 38, 51, 64" inputmode="numeric"></label>
          <span class="nota">${e.preguntas.length ? `${e.preguntas.filter((p) => p.piloto).length} piloto${e.preguntas.filter((p) => p.piloto).length === 1 ? '' : 's'} · ${Estad.puntuables(e).length} preguntas cuentan.` : ''} Se pueden marcar también en la columna "Piloto" de la plantilla Excel.</span>
        </section>
        ${seccionTemario(e)}
        ${seccionConversion(e)}
        <section class="tarjeta pad"><span class="etiqueta">4 · Hojas para un curso</span>
          ${cursos().length ? `<label class="campo" for="e-curso">Curso<select id="e-curso">${cursos().map((c) => `<option value="${h(c.id)}">${h(c.nombre)} · ${c.estudiantes.length} estudiantes</option>`).join('')}</select></label>
          <div class="fila-botones"><button class="btn" data-accion="hojas-pdf" ${e.preguntas.length ? '' : 'disabled'}>Hojas con QR (PDF)</button><button class="btn" data-accion="hojas-tex" ${e.preguntas.length ? '' : 'disabled'}>Hojas en LaTeX</button></div>`
          : '<span style="font-size:14px;color:var(--texto-2)">Carga un curso para generar sus hojas personales con QR.</span> <button class="btn" data-accion="ir" data-a="cursos">Ir a Cursos</button>'}
        </section>
        ${nuevo ? '' : '<button class="btn" style="color:var(--mal-texto)" data-accion="borrar-ensayo">Borrar ensayo</button>'}
      </div>
      <div class="barra-acciones"><button class="btn primario grande" data-accion="guardar-ensayo">Guardar ensayo</button></div>
    </div>`;
  }

  // Temario de la asignatura: ejes, contenidos y habilidades que conviene usar en la plantilla
  function seccionTemario(e) {
    const t = Temarios.de(e.asignatura);
    if (!t) return '';
    const rev = e.preguntas.length ? Temarios.revisar(e) : null;
    const aviso = rev && (rev.ejes.length || rev.habs.length)
      ? `<div class="aviso rev">${ICONO.alerta}<span>${rev.ejes.length ? `Ejes que no están en el temario: ${h(rev.ejes.join(', '))}. ` : ''}${rev.habs.length ? `Habilidades que no están en el temario: ${h(rev.habs.join(', '))}. ` : ''}Usa los nombres del temario para que el informe recomiende los contenidos correctos.</span></div>` : '';
    return `<details class="tarjeta pad temario"><summary><span class="etiqueta">Temario de ${h(e.asignatura)}</span></summary>
      ${aviso}
      ${t.ejes.map((x) => `<div><b>${h(x.nombre)}</b><ul>${x.contenidos.map((c) => `<li>${h(c)}</li>`).join('')}</ul></div>`).join('')}
      <div><b>Habilidades</b><ul>${t.habilidades.map((x) => `<li><b>${h(x.nombre)}</b>: ${h(x.descripcion)}</li>`).join('')}</ul></div>
      <span class="nota">Escribe en la plantilla Excel el eje y la habilidad de cada pregunta con estos nombres, y si quieres el contenido. El informe los usa para decir qué reforzar.</span>
    </details>`;
  }

  // Estándares SIMCE o tabla de puntaje PAES, y la referencia oficial con que comparar
  function seccionConversion(e) {
    const pc = (v) => (v == null || v === '' ? '' : Math.round(v * 1000) / 10);
    const ref = e.referencia || {};
    const esSimce = e.tipo === 'SIMCE';
    const tabla = (e.tablaPaes || []).join(', ');
    return `<section class="tarjeta pad"><span class="etiqueta">3 · ${esSimce ? 'Estándares de aprendizaje' : 'Puntaje PAES'}</span>
      ${esSimce ? `<span style="font-size:14px;color:var(--texto-2)">Desde qué % de logro un estudiante queda en Elemental y en Adecuado. Usa los cortes que trae el ensayo; si no trae, define los tuyos.</span>
        <div class="dos">
          <label class="campo" for="e-elemental">Elemental desde (%)<input id="e-elemental" data-campo="cortes.elemental" inputmode="decimal" value="${pc(e.cortes && e.cortes.elemental)}" placeholder="Ej.: 45"></label>
          <label class="campo" for="e-adecuado">Adecuado desde (%)<input id="e-adecuado" data-campo="cortes.adecuado" inputmode="decimal" value="${pc(e.cortes && e.cortes.adecuado)}" placeholder="Ej.: 70"></label>
        </div>
        <span class="etiqueta" style="margin-top:4px">Referencia oficial (opcional)</span>
        <div class="dos">
          <label class="campo" for="e-ref1">% Adecuado del colegio en el SIMCE<input id="e-ref1" data-campo="referencia.colegio" inputmode="decimal" value="${pc(ref.colegio)}"></label>
          <label class="campo" for="e-ref2">% Adecuado de colegios similares<input id="e-ref2" data-campo="referencia.similar" inputmode="decimal" value="${pc(ref.similar)}"></label>
        </div>`
      : `${(() => {
        const idActual = Object.keys(Estad.TABLAS_PAES).find((id) => tabla && Estad.TABLAS_PAES[id].puntajes.join(', ') === tabla) || (tabla ? 'propia' : '');
        const sugerida = Estad.tablaParaAsignatura(e.asignatura);
        const n = Estad.puntuables(e).length;
        const desajuste = e.tablaPaes && e.tablaPaes.length && n && e.tablaPaes.length - 1 !== n;
        return `<label class="campo" for="e-tabla-id">Tabla de puntajes<select id="e-tabla-id" data-campo="tablaId">
          <option value="" ${!idActual ? 'selected' : ''}>${sugerida ? `Automática según la asignatura (${Estad.TABLAS_PAES[sugerida].nombre})` : 'Elige una tabla…'}</option>
          ${Object.entries(Estad.TABLAS_PAES).map(([id, t]) => `<option value="${id}" ${idActual === id ? 'selected' : ''}>${t.nombre} · hasta ${t.puntajes.length - 1} correctas</option>`).join('')}
          <option value="propia" ${idActual === 'propia' ? 'selected' : ''}>Otra tabla (la pego abajo)</option></select></label>
        ${desajuste ? `<div class="aviso rev">${ICONO.alerta}<span>La tabla llega hasta ${e.tablaPaes.length - 1} correctas, pero en este ensayo cuentan ${n} preguntas. ${n > e.tablaPaes.length - 1 ? `Marca las ${n - (e.tablaPaes.length - 1)} preguntas piloto en la sección 2.` : 'Revisa la tabla o las preguntas piloto.'}</span></div>` : ''}
        <label class="campo" for="e-tabla">Puntajes de otra tabla: el de 0 correctas, 1, 2… en orden, separados por coma${e.tablaPaes && e.tablaPaes.length ? ` (ahora: ${e.tablaPaes.length} valores, de 0 a ${e.tablaPaes.length - 1} correctas)` : ''}<textarea id="e-tabla" data-campo="tablaPaes" placeholder="100, 150, 187, …">${h(tabla)}</textarea></label>`;
      })()}
        <span class="etiqueta" style="margin-top:4px">Referencia oficial (opcional)</span>
        <div class="dos">
          <label class="campo" for="e-ref1">Puntaje oficial del colegio<input id="e-ref1" data-campo="referencia.colegio" inputmode="numeric" value="${ref.colegio == null ? '' : ref.colegio}"></label>
          <label class="campo" for="e-ref2">Referencia nacional<input id="e-ref2" data-campo="referencia.similar" inputmode="numeric" value="${ref.similar == null ? '' : ref.similar}"></label>
        </div>`}
      <span class="nota">El estándar y el puntaje que muestra la app son estimaciones: el SIMCE y la PAES oficiales usan modelos que un ensayo no replica.</span>
    </section>`;
  }

  function pCursos() {
    const lista = cursos();
    return `<div class="pantalla">${cabecera('Cursos', `${lista.length} curso${lista.length === 1 ? '' : 's'}`)}
      <div class="cuerpo">
        <label class="btn primario grande" for="c-excel">${ICONO.subir} Cargar lista desde Excel</label>
        <input type="file" id="c-excel" accept=".xlsx,.xls" class="oculto-visual" data-archivo="curso">
        <span style="font-size:13px;color:var(--texto-2)">Usa la plantilla de lista de curso: N° de lista, nombre, RUT (opcional) y curso. Si el curso ya existe, se actualiza.</span>
        <div class="tarjeta lista">${lista.length ? lista.map((c) => `<button class="item" data-accion="abrir-curso" data-a="${h(c.id)}">
          <span class="iniciales">${h(c.nombre.replace(/[^A-Za-z0-9]/g, '').slice(0, 3))}</span>
          <span class="principal"><b>${h(c.nombre)}</b><span>${h([nivelDe(c).nivel || 'Nivel sin indicar', nivelDe(c).letra ? 'letra ' + nivelDe(c).letra : '', c.estudiantes.length + ' estudiantes'].filter(Boolean).join(' · '))}</span></span></button>`).join('')
          : '<div class="vacio">Aún no hay cursos.</div>'}</div>
      </div>${nav('')}</div>`;
  }

  function pCursoDetalle() {
    const c = Almacen.obtener('cursos', E.cursoAbierto);
    if (!c) return pCursos();
    const lista = ensayos();
    return `<div class="pantalla sin-nav">${cabecera(c.nombre, `${c.estudiantes.length} estudiantes`, 'cursos')}
      <div class="cuerpo">
        <section class="tarjeta pad"><span class="etiqueta">Nivel y paralelo</span>
          <span style="font-size:14px;color:var(--texto-2)">Los cursos del mismo nivel se comparan entre sí. ${c.nivel ? '' : nivelDe(c).nivel ? `Lo deduje del nombre: ${h(nivelDe(c).nivel)}${nivelDe(c).letra ? ', letra ' + h(nivelDe(c).letra) : ''}.` : 'No pude deducirlo del nombre.'}</span>
          <div class="dos">
            <label class="campo" for="cd-nivel">Nivel<input id="cd-nivel" list="niveles" value="${h(nivelDe(c).nivel)}" placeholder="Ej.: II medio"></label>
            <label class="campo" for="cd-letra">Letra<input id="cd-letra" value="${h(nivelDe(c).letra)}" maxlength="3" placeholder="Ej.: B" autocapitalize="characters"></label>
          </div>
          <datalist id="niveles">${['1° básico', '2° básico', '3° básico', '4° básico', '5° básico', '6° básico', '7° básico', '8° básico', 'I medio', 'II medio', 'III medio', 'IV medio'].map((n) => `<option value="${n}"></option>`).join('')}</datalist>
          <button class="btn" data-accion="guardar-nivel">Guardar nivel</button>
        </section>
        <section class="tarjeta pad"><span class="etiqueta">Hojas personales con QR</span>
          ${lista.length ? `<label class="campo" for="cd-ensayo">Ensayo<select id="cd-ensayo">${lista.map((e) => `<option value="${h(e.id)}">${h(e.nombre)}</option>`).join('')}</select></label>
          <div class="fila-botones"><button class="btn" data-accion="hojas-pdf-curso">PDF</button><button class="btn" data-accion="hojas-tex-curso">LaTeX</button></div>`
          : '<span style="font-size:14px;color:var(--texto-2)">Crea un ensayo para generar las hojas.</span>'}
        </section>
        <button class="btn grande cta" data-accion="envio-curso">✉ Enviar resultados por correo a todo el curso</button>
        <label class="btn punteado grande" for="cd-excel">${ICONO.subir} Actualizar lista desde Excel (correos, RUT, nombres)</label>
        <input type="file" id="cd-excel" accept=".xlsx,.xls" class="oculto-visual" data-archivo="curso">
        <span class="nota">Usa la plantilla de lista de curso con este curso escrito igual en la columna D (${h(c.nombre)}). Las hojas corregidas se conservan.</span>
        <div style="display:flex;justify-content:space-between;align-items:baseline"><h2 class="titulo-seccion">Estudiantes</h2>
          <button class="btn" style="min-height:36px" data-accion="nuevo-est">+ Agregar</button></div>
        <span class="nota">Toca un estudiante para editar su perfil: nombre, curso, RUT y correos.</span>
        <div class="tarjeta lista">${[...c.estudiantes].sort((a, b) => a.lista - b.lista).map((e) => `<button class="item" data-accion="editar-est" data-a="${h(e.id)}"><span class="n num">${e.lista}</span><span class="principal"><b>${h(e.nombre)}</b><span>${h([e.rut || 'Sin RUT', e.correo ? '✉ estudiante' : '', e.correoApoderado ? '✉ apoderado' : ''].filter(Boolean).join(' · '))}</span></span><span class="di-flecha" style="font-size:22px;color:var(--texto-2)" aria-hidden="true">›</span></button>`).join('')}</div>
        <button class="btn" style="color:var(--mal-texto)" data-accion="borrar-curso">Borrar curso</button>
      </div></div>`;
  }

  // Perfil editable de un estudiante (o uno nuevo) del curso abierto
  function pPerfilEstudiante() {
    const c = Almacen.obtener('cursos', E.cursoAbierto);
    if (!c) return pCursos();
    const nuevo = !E.estEditado;
    const e = nuevo ? { lista: Math.max(0, ...c.estudiantes.map((x) => x.lista || 0)) + 1, nombre: '', rut: '' } : c.estudiantes.find((x) => x.id === E.estEditado);
    if (!e) return pCursoDetalle();
    const conHojas = nuevo ? 0 : ensayos().filter((en) => hojasDe(en, c)[e.id]).length;
    return `<div class="pantalla sin-nav">${cabecera(nuevo ? 'Nuevo estudiante' : e.nombre, c.nombre, 'curso-detalle')}
      <div class="cuerpo">
        <section class="tarjeta pad perfil-est">
          <span class="etiqueta">Datos del estudiante</span>
          <label class="campo" for="pe-nombre">Nombre completo<input id="pe-nombre" autocomplete="off" value="${h(e.nombre)}" placeholder="Nombres y apellidos"></label>
          <div class="dos">
            <label class="campo" for="pe-lista">N° de lista<input id="pe-lista" type="number" min="1" inputmode="numeric" value="${h(String(e.lista || ''))}"></label>
            <label class="campo" for="pe-rut">RUT<input id="pe-rut" autocomplete="off" value="${h(e.rut || '')}" placeholder="12.345.678-9"></label>
          </div>
          <label class="campo" for="pe-curso">Curso<select id="pe-curso">${cursos().map((x) => `<option value="${h(x.id)}" ${x.id === c.id ? 'selected' : ''}>${h(x.nombre)}</option>`).join('')}</select></label>
          <span class="etiqueta" style="margin-top:6px">Correos</span>
          <label class="campo" for="pe-correo">Correo del estudiante<input id="pe-correo" type="email" inputmode="email" autocomplete="off" value="${h(e.correo || '')}" placeholder="nombre@correo.cl"></label>
          <label class="campo" for="pe-correo-apo">Correo del apoderado<input id="pe-correo-apo" type="email" inputmode="email" autocomplete="off" value="${h(e.correoApoderado || '')}" placeholder="apoderado@correo.cl"></label>
          <button class="btn primario" data-accion="guardar-est">${nuevo ? 'Agregar estudiante' : 'Guardar cambios'}</button>
          ${nuevo ? '' : `<span class="nota">Código del estudiante: ${h(e.id)}. No cambia al editar, así sus hojas corregidas y el QR de su hoja siguen funcionando.${conHojas ? ` Tiene hojas en ${conHojas} ensayo${conHojas === 1 ? '' : 's'}; si lo cambias de curso, sus hojas se van con él.` : ''}</span>`}
        </section>
        ${nuevo ? '' : seccionEnvio(e, c)}
        ${nuevo ? '' : `<button class="btn" style="color:var(--mal-texto)" data-accion="borrar-est">Quitar del curso</button>`}
      </div></div>`;
  }
  // Envío individual del informe desde el perfil: incluye todos los ensayos que rindió en este curso
  function seccionEnvio(e, c) {
    const n = ensayosDelEstudiante(e.id, c).length;
    const boton = (modo, correo, quien) => correo
      ? `<button class="btn" style="flex-direction:column;gap:2px;padding:10px" data-accion="enviar-desde-perfil" data-a="${modo}" ${n ? '' : 'disabled'}>✉ Enviar informe ${quien}<small style="display:block;font-weight:500;color:var(--texto-2)">${h(correo)}</small></button>`
      : `<button class="btn" style="flex-direction:column;gap:2px;padding:10px" disabled>✉ Enviar informe ${quien}<small style="display:block;font-weight:500">Falta su correo</small></button>`;
    return `<section class="tarjeta pad"><span class="etiqueta">Enviar resultados por correo</span>
      <span class="nota">${n ? `El informe incluye ${n === 1 ? 'el ensayo que rindió' : `los ${n} ensayos que rindió`}. Se descarga el PDF y luego eliges cómo abrir tu correo (tu app, Gmail u Outlook), con el destinatario, el asunto y el mensaje listos: solo adjuntas el PDF y envías.` : 'Todavía no tiene hojas corregidas en este curso.'}</span>
      ${boton('estudiante', e.correo, 'al estudiante')}
      ${boton('apoderado', e.correoApoderado, 'al apoderado')}
      <span class="nota">Para elegir qué ensayos incluir, usa su ficha en Estadísticas.</span>
    </section>`;
  }
  async function guardarPerfilEstudiante() {
    const val = (id) => document.getElementById(id).value.trim();
    const nombre = val('pe-nombre').replace(/\s+/g, ' '), lista = parseInt(val('pe-lista'), 10), rut = val('pe-rut');
    const correo = val('pe-correo'), correoApoderado = val('pe-correo-apo'), destino = val('pe-curso');
    if (!nombre) { toast('Escribe el nombre del estudiante.'); return; }
    if (!(lista > 0)) { toast('El N° de lista debe ser un número mayor que 0.'); return; }
    if ((correo && !correoValido(correo)) || (correoApoderado && !correoValido(correoApoderado))) { toast('Revisa el correo: debe tener la forma nombre@dominio.cl'); return; }
    const origen = Almacen.obtener('cursos', E.cursoAbierto), dest = Almacen.obtener('cursos', destino) || origen;
    const otro = dest.estudiantes.find((x) => x.lista === lista && x.id !== E.estEditado);
    if (otro) { toast(`El N° ${lista} ya es de ${otro.nombre} en ${dest.nombre}.`); return; }
    let est;
    if (E.estEditado) {
      est = origen.estudiantes.find((x) => x.id === E.estEditado);
      if (!est) return;
    } else {
      est = {};
    }
    Object.assign(est, { nombre, lista, rut });
    if (correo) est.correo = correo; else delete est.correo;
    if (correoApoderado) est.correoApoderado = correoApoderado; else delete est.correoApoderado;
    if (!E.estEditado) {
      let id = idEstudiante(dest, est), k = 2;
      const usados = new Set(cursos().flatMap((x) => x.estudiantes.map((y) => y.id)));
      while (usados.has(id)) id = idEstudiante(dest, est) + '-' + k++;
      est.id = id;
      dest.estudiantes.push(est);
      await Almacen.guardar('cursos', dest.id, dest);
      toast(`${corto(nombre)} agregado a ${dest.nombre}`);
    } else if (dest.id !== origen.id) {
      // Cambio de curso: el estudiante y sus hojas corregidas pasan al curso nuevo
      origen.estudiantes = origen.estudiantes.filter((x) => x.id !== est.id);
      dest.estudiantes.push(est);
      for (const en of ensayos()) {
        const r = Almacen.obtener('resultados', idResultados(en.id, origen.id));
        if (!r || !r.hojas || !r.hojas[est.id]) continue;
        const idD = idResultados(en.id, dest.id);
        const rd = Almacen.obtener('resultados', idD) || { ensayo: en.id, curso: dest.id, hojas: {} };
        rd.hojas = { ...rd.hojas, [est.id]: r.hojas[est.id] };
        const resto = { ...r.hojas }; delete resto[est.id];
        await Almacen.guardar('resultados', idD, rd);
        await Almacen.guardar('resultados', idResultados(en.id, origen.id), { ...r, hojas: resto });
      }
      await Almacen.guardar('cursos', origen.id, origen);
      await Almacen.guardar('cursos', dest.id, dest);
      toast(`${corto(nombre)} pasó a ${dest.nombre}`);
    } else {
      await Almacen.guardar('cursos', origen.id, origen);
      toast('Cambios guardados');
    }
    E.cursoAbierto = dest.id; E.estEditado = null; E.pantalla = 'curso-detalle'; render();
  }

  // ---------- Estadísticas ----------
  function tarjetaGrafico(titulo, contenido, nota) {
    return `<section class="tarjeta pad"><span class="etiqueta">${h(titulo)}</span>${contenido}${nota ? `<span class="nota">${nota}</span>` : ''}</section>`;
  }

  function historialDelCurso(ens, cur) {
    return Estad.historial(ensayos(), cur, (e) => hojasDe(e, cur), Estad.grupoEnsayo(ens));
  }

  const etiquetaEnsayo = (e) => (e.fecha ? e.fecha.slice(0, 5) : '') || e.nombre.slice(0, 10);
  const notaTx = (n) => Estad.notaTexto(n);
  const signo = (d) => (d > 0 ? '+' : '') + Math.round(d * 100);

  // Paralelos: cursos del mismo nivel, ordenados por letra. El color de cada uno depende de su lugar en esa lista.
  const nivelDe = (c) => Estad.nivelDe(c);
  function paralelosDe(cur) {
    const nv = nivelDe(cur).nivel;
    if (!nv) return [cur];
    return cursos().filter((c) => nivelDe(c).nivel === nv)
      .sort((a, b) => (nivelDe(a).letra || a.nombre).localeCompare(nivelDe(b).letra || b.nombre));
  }
  const colorDe = (cur) => Graficos.colorCurso(Math.max(0, paralelosDe(cur).findIndex((c) => c.id === cur.id)));
  const nombreNivel = (cur) => nivelDe(cur).nivel || cur.nombre;
  function analisisNivel(ens, cur) {
    return Estad.nivel(ens, paralelosDe(cur), (c) => hojasDe(ens, c), nombreNivel(cur));
  }
  // Todo lo que necesita un informe PDF del curso activo. ens es el ensayo principal; elegidos, los ids de los ensayos a incluir.
  function contextoInforme(ens, elegidos, curElegido) {
    const cur = curElegido || cursoActivo();
    const A = Estad.analizar(ens, cur, hojasDe(ens, cur));
    const H = historialDelCurso(ens, cur);
    const nv = nivelDe(cur).nivel;
    const N = nv ? analisisNivel(ens, cur) : null;
    const HN = N && N.porCurso.length >= 2 ? Estad.historialNivel(ensayos(), paralelosDe(cur), (e, c) => hojasDe(e, c), Estad.grupoEnsayo(ens), nv) : null;
    const seleccion = (elegidos || [ens.id]).map((id) => Almacen.obtener('ensayos', id)).filter(Boolean)
      .map((e) => ({ ens: e, A: e.id === ens.id ? A : Estad.analizar(e, cur, hojasDe(e, cur)) })).filter((x) => x.A.hechas.length)
      .sort((a, b) => Estad.fechaOrden(a.ens).localeCompare(Estad.fechaOrden(b.ens)));
    return { ens, cur, A, H, AL: Estad.alertas(A, H), G: Estad.grupos(A, E.grupoPor || 'eje'), N, HN, nivel: nombreNivel(cur), colegio: config().colegio || {}, seleccion, validacion: Estad.validar(ens, cur, hojasDe(ens, cur)) };
  }
  // Ensayos con hojas corregidas del curso activo, del más reciente al más antiguo
  function ensayosConHojas(cur) {
    return ensayos().filter((e) => Object.keys(hojasDe(e, cur)).length)
      .sort((a, b) => Estad.fechaOrden(b).localeCompare(Estad.fechaOrden(a)));
  }
  // Antes de generar un informe se eligen los ensayos que entran (si hay más de uno con hojas)
  function elegirEnsayos(tipo, ids) {
    const ens = ensayoActivo(), cur = cursoActivo();
    const lista = ensayosConHojas(cur);
    if (lista.length <= 1) { descargarInforme(tipo, ids, [ens.id]); return; }
    const grupo = Estad.grupoEnsayo(ens);
    E.elegirInforme = { tipo, ids, marcados: lista.filter((e) => e.id === ens.id || Estad.grupoEnsayo(e) === grupo).map((e) => e.id) };
    render();
  }
  function capaElegirInformes() {
    const S = E.elegirInforme, cur = cursoActivo(), act = ensayoActivo();
    const lista = ensayosConHojas(cur);
    const n = S.marcados.length;
    return `<div class="velo"><div class="hoja-inferior elegir-ensayos" role="dialog" aria-label="Elegir ensayos">
      <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:18px">¿Qué ensayos incluir?</h2><button class="btn-redondo" data-accion="cancelar-informe" aria-label="Cerrar">${ICONO.cerrar}</button></div>
      <span class="nota">El análisis detallado es del ensayo principal${act ? `: ${h(act.nombre)}` : ''}. Los demás aparecen en la evolución del curso y en la ficha de cada estudiante.</span>
      <div class="filtros"><button data-accion="marcar-grupo" data-a="este">Solo el principal</button><button data-accion="marcar-grupo" data-a="asig">Misma asignatura</button><button data-accion="marcar-grupo" data-a="todos">Todos</button></div>
      <div class="lista-elegir">${lista.map((e) => {
        const on = S.marcados.includes(e.id), hechas = Object.keys(hojasDe(e, cur)).length;
        return `<button class="opcion" data-accion="marcar-ensayo" data-a="${h(e.id)}" aria-pressed="${on}"><span class="caja">${on ? ICONO.check : ''}</span>
          <span class="principal"><b>${h(e.nombre)}${e.id === act.id ? ' · principal' : ''}</b><span>${h([e.asignatura, e.fecha, `${hechas} hojas`].filter(Boolean).join(' · '))}</span></span></button>`;
      }).join('')}</div>
      <button class="btn primario grande" data-accion="generar-informe" ${n ? '' : 'disabled'}>Generar PDF con ${n} ensayo${n === 1 ? '' : 's'}</button>
    </div></div>`;
  }
  async function descargarInforme(tipo, ids, elegidos) {
    toast('Preparando el informe…');
    try {
      // ensayo principal: el activo si está elegido; si no, el más reciente de los elegidos
      const act = ensayoActivo();
      const candidatos = (elegidos || [act.id]).map((id) => Almacen.obtener('ensayos', id)).filter(Boolean);
      const principal = candidatos.find((e) => e.id === act.id) || candidatos.sort((a, b) => Estad.fechaOrden(b).localeCompare(Estad.fechaOrden(a)))[0] || act;
      const ctx = contextoInforme(principal, candidatos.map((e) => e.id));
      const base = `${Almacen.id(ctx.cur.nombre)}_${Almacen.id(ctx.ens.nombre).slice(0, 30)}${ctx.seleccion.length > 1 ? `_y_${ctx.seleccion.length - 1}_mas` : ''}`;
      const blob = tipo === 'curso' ? Informe.curso(ctx) : Informe.estudiantes(ctx, ids);
      const nombre = tipo === 'curso' ? `informe_docente_${base}.pdf`
        : ids && ids.length === 1 ? `ficha_${Almacen.id(ctx.A.estudiantes.find((x) => x.e.id === ids[0]).e.nombre)}_${base}.pdf` : `fichas_estudiantes_${base}.pdf`;
      await descargar(nombre, blob);
    } catch (e) { console.error(e); toast('No se pudo crear el informe: ' + e.message); }
  }

  // Aviso cuando falta el dato que convierte el logro en estándar o puntaje
  function avisoConversion(ens) {
    if (ens.tipo === 'SIMCE' && !Estad.cortesDe(ens)) return `<div class="aviso rev">${ICONO.alerta}<span>Para ver los estándares (Insuficiente, Elemental y Adecuado) define los cortes de este ensayo. <button class="btn" style="min-height:34px;margin-top:6px" data-accion="editar-ensayo" data-a="${h(ens.id)}">Definir cortes</button></span></div>`;
    if (ens.tipo === 'PAES' && !Estad.tieneTabla(ens)) return `<div class="aviso rev">${ICONO.alerta}<span>Para ver el puntaje PAES estimado carga la tabla de puntajes del ensayo. <button class="btn" style="min-height:34px;margin-top:6px" data-accion="editar-ensayo" data-a="${h(ens.id)}">Cargar tabla</button></span></div>`;
    return '';
  }
  // Cifra de estándar o puntaje para un resumen
  function cifraConversion(ens, R) {
    if (Estad.cortesDe(ens) && R.adecuado != null) return `<div class="tarjeta"><span>En Adecuado <span class="estimado">est.</span></span><b class="num">${pct(R.adecuado)}</b><small>estándar estimado</small></div>`;
    if (Estad.tieneTabla(ens) && R.puntajeMedia != null) return `<div class="tarjeta"><span>Puntaje PAES <span class="estimado">est.</span></span><b class="num">${R.puntajeMedia}</b><small class="num">rango ${R.puntajeMin}–${R.puntajeMax}</small></div>`;
    return `<div class="tarjeta"><span>Desv. estándar</span><b class="num">${Math.round(R.desviacion * 100)}</b><small>puntos de logro</small></div>`;
  }
  const partesEst = (A) => A.estandares.map((s) => ({ nombre: s.nombre, n: s.n }));
  const leyendaEstandares = `<div class="leyenda-graf">${Estad.ESTANDARES.map((s, i) => `<span><i style="background:var(--tramo-${i + 1})"></i>${s.nombre}</span>`).join('')}</div>`;
  const conversionDe = (x) => [x.estandar ? x.estandar.nombre : '', x.puntaje != null ? x.puntaje + ' pts.' : ''].filter(Boolean).join(' · ');

  function pEstadisticas() {
    const ens = ensayoActivo(), cur = cursoActivo();
    if (!ens || !cur) return pVacio('Estadísticas', 'Primero crea un ensayo y carga un curso.');
    const A = Estad.analizar(ens, cur, hojasDe(ens, cur));
    const tab = E.tabEst || 'curso';
    const pest = (id, t) => `<button role="tab" aria-selected="${tab === id}" data-accion="tab-est" data-a="${id}">${t}</button>`;
    const encabezado = `<div class="pestanas" role="tablist">${pest('curso', 'Curso')}${pest('nivel', 'Nivel')}${pest('alertas', 'Alertas')}${pest('preguntas', 'Preguntas')}${pest('estudiantes', 'Estudiantes')}${pest('historial', 'Historial')}</div>`;
    let cuerpo = '';
    const sinHojas = A.hechas.length ? '' : 'disabled';
    let exportar = `<div class="acciones-exportar"><button class="btn" data-accion="excel" ${sinHojas}>${ICONO.bajar} Exportar el curso a Excel</button>
      <button class="btn" data-accion="informe-curso" ${sinHojas}>${ICONO.bajar} Informe PDF para docentes (curso y estudiantes)</button>${tab === 'estudiantes' ? `
      <button class="btn" data-accion="informe-estudiantes" ${sinHojas}>${ICONO.bajar} Fichas PDF para estudiantes y apoderados</button>` : ''}</div>`;
    if (!A.hechas.length && tab !== 'historial' && tab !== 'nivel') {
      cuerpo = '<div class="tarjeta vacio">Cuando corrijas las primeras hojas de este ensayo verás aquí los gráficos.</div>';
    } else if (tab === 'curso') {
      const R = A.resumen, esc = Estad.conf.escala;
      cuerpo = `
        <div class="cifras cuatro">
          <div class="tarjeta"><span>Logro promedio</span><b class="num" style="color:var(--azul-texto)">${pct(R.media)}</b><span class="num">mediana ${pct(R.mediana)}</span></div>
          <div class="tarjeta"><span>Nota promedio</span><b class="num">${notaTx(R.notaMedia)}</b><span class="num">aprueban ${R.aprobados} de ${R.corregidas} (${pct(R.aprobados / R.corregidas)})</span></div>
          ${cifraConversion(ens, R)}
          <div class="tarjeta"><span>Preguntas críticas</span><b class="num" style="color:var(--mal-texto)">${R.criticas}</b><span>bajo ${pct(Estad.CRITICA)} de acierto</span></div>
        </div>
        <span class="nota num">${R.corregidas} de ${R.total} hojas corregidas · rango ${pct(R.min)}–${pct(R.max)} · omisión media ${pct(R.omision)}.${A.pilotos ? ` Se calcula sobre ${A.n} preguntas: las ${A.pilotos} piloto no cuentan.` : ''}</span>
        ${avisoConversion(ens)}
        ${A.estandares ? tarjetaGrafico('Estudiantes por estándar', Graficos.apilado100([{ nombre: cur.nombre, partes: partesEst(A) }]) + leyendaEstandares, 'Estándar estimado con los cortes del ensayo. Compara este curso con sus paralelos en la pestaña Nivel.') : ''}
        ${tarjetaGrafico('Distribución de notas', Graficos.histNotas(A.histNotas, esc.aprobacion), `Escala con ${pct(esc.exigencia)} de exigencia: con ${Math.ceil(esc.exigencia * A.n - 1e-9)} de ${A.n} correctas se obtiene un ${notaTx(esc.aprobacion)}. Se cambia en Ajustes.`)}
        ${tarjetaGrafico('Distribución del logro', Graficos.histograma(A.histograma, R.media), 'Cuántos estudiantes hay en cada tramo de 10 puntos. La línea punteada es la media del curso.')}
        ${tarjetaGrafico('Logro por eje', Graficos.barrasLogro(A.porEje.slice().sort((a, b) => a.logro - b.logro)), 'Promedio de acierto en las preguntas de cada eje, de menor a mayor.')}
        ${tarjetaGrafico('Logro por habilidad', Graficos.barrasLogro(A.porHabilidad.slice().sort((a, b) => a.logro - b.logro)))}
        ${tarjetaGrafico('Eje × habilidad', Graficos.mapaCalor(A.porEje, A.porHabilidad, A.matriz), 'Cada celda es el acierto promedio de las preguntas que combinan ese eje y esa habilidad; "p" indica cuántas preguntas son. Más oscuro, mejor logro.')}`;
    } else if (tab === 'nivel') {
      ({ cuerpo, exportar } = cuerpoNivel(ens, cur));
    } else if (tab === 'alertas') {
      cuerpo = cuerpoAlertas(ens, cur, A);
    } else if (tab === 'preguntas') {
      const orden = E.ordenPreg || 'dificiles';
      const lista = orden === 'n' ? A.preguntas : A.preguntas.slice().sort((a, b) => a.acierto - b.acierto);
      const btn = (id, t) => `<button data-accion="orden-preg" data-a="${id}" aria-pressed="${orden === id}">${t}</button>`;
      cuerpo = `
        ${tarjetaGrafico('Acierto por pregunta', Graficos.aciertoPreguntas(A.preguntas, Estad.CRITICA) + `<div class="leyenda-graf"><span><i style="background:var(--serie)"></i>Acierto</span><span><i style="background:var(--critico)"></i>Crítica (bajo ${pct(Estad.CRITICA)})</span>${A.pilotos ? '<span><i style="background:var(--distractor)"></i>Piloto</span>' : ''}</div>`, 'Toca una barra para ver la pregunta.')}
        <div class="filtros">${btn('dificiles', 'Más difíciles primero')}${btn('n', 'En orden')}</div>
        <div class="leyenda-graf"><span><i style="background:var(--serie)"></i>Respuesta correcta</span><span><i style="background:var(--distractor)"></i>Otra alternativa</span><span><i style="background:var(--omitida)"></i>Omitida</span></div>
        <div class="tarjeta">${lista.map((p) => `<div class="pregunta-fila">
          <div class="encab"><b>Pregunta ${p.n} · clave ${p.clave}</b><span class="num" style="font-weight:700">${pct(p.acierto)}</span></div>
          ${Graficos.opciones(p, A.letras)}
          <span class="meta">${h([p.eje, p.habilidad].filter(Boolean).join(' · '))}${p.distractor ? ` · más elegida entre las incorrectas: ${p.distractor.letra} (${pct(p.distractor.n / (p.total || 1))})` : ''}${p.discriminacion != null ? ` · discriminación ${p.discriminacion.toFixed(2)}${p.discriminacion < 0.2 ? ' (baja)' : ''}` : ''}</span>
          ${p.critica ? '<span><span class="etiqueta-critica">Crítica</span></span>' : ''}${p.piloto ? '<span><span class="estimado">Piloto · no cuenta</span></span>' : ''}
        </div>`).join('')}</div>
        <span class="nota">Discriminación: diferencia de acierto entre el 27% de mejor y el 27% de menor logro. Sobre 0,3 la pregunta distingue bien; bajo 0,2 conviene revisarla. Para ver si una pregunta le fue mal a todo el nivel o solo a este curso, abre la pestaña Nivel.</span>`;
    } else if (tab === 'estudiantes') {
      const filas = A.hechas.slice().sort((a, b) => b.logro - a.logro);
      cuerpo = `
        ${tarjetaGrafico('Ranking del curso', Graficos.barrasLogro(filas.map((x) => ({ nombre: `${x.e.lista}. ${corto(x.e.nombre)}`, logro: x.logro, preguntas: A.n }))), 'Toca un nombre de la lista de abajo para ver su ficha.')}
        <div class="tarjeta lista">${filas.map((x, i) => `<button class="item" data-accion="ficha" data-a="${h(x.e.id)}"><span class="n num">${i + 1}°</span>
          <span class="principal"><b>${h(x.e.nombre)}</b><span class="num">nota ${notaTx(x.nota)} · ${x.correctas} correctas · ${x.omitidas} omitidas${conversionDe(x) ? ' · ' + h(conversionDe(x)) : ''}</span></span>
          <span class="chip ok num">${pct(x.logro)}</span></button>`).join('')}</div>`;
    } else {
      const H = historialDelCurso(ens, cur);
      if (H.puntos.length < 2) {
        cuerpo = `<div class="tarjeta vacio">El historial compara los ensayos de ${h(Estad.grupoEnsayo(ens))} de este curso. Necesitas al menos dos ensayos corregidos; por ahora hay ${H.puntos.length}.</div>`;
      } else {
        const et = H.puntos.map((p) => etiquetaEnsayo(p.ensayo));
        const ultimo = H.puntos.length - 1;
        const desde = Math.max(0, H.puntos.length - 3);
        const pares = H.estudiantes.filter((s) => s.serie[ultimo - 1] != null && s.serie[ultimo] != null)
          .map((s) => ({ nombre: corto(s.e.nombre), a: s.serie[ultimo - 1], b: s.serie[ultimo] }));
        const suben = pares.filter((p) => p.b - p.a >= 0.03).length, bajan = pares.filter((p) => p.b - p.a <= -0.03).length;
        cuerpo = `
          ${tarjetaGrafico('Logro promedio del curso', Graficos.linea(H.puntos.map((p) => p.media), et), `${H.puntos.length} ensayos de ${h(Estad.grupoEnsayo(ens))}: ${H.puntos.map((p) => h(p.ensayo.nombre)).join(', ')}.`)}
          ${pares.length ? tarjetaGrafico('Quién subió y quién bajó', Graficos.pendientes(pares, et[ultimo - 1], et[ultimo]) + `<div class="leyenda-graf"><span><i style="background:var(--serie)"></i>Subió 3 pts o más (${suben})</span><span><i style="background:var(--critico)"></i>Bajó 3 pts o más (${bajan})</span><span><i style="background:var(--distractor)"></i>Se mantuvo (${pares.length - suben - bajan})</span></div>`, 'Una línea por estudiante entre los dos últimos ensayos. Toca una línea para ver el nombre.') : ''}
          ${tarjetaGrafico('Por eje', H.ejes.map((e) => `<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600">${h(e.nombre)}</span>${Graficos.linea(e.serie, et, { alto: 110 })}</div>`).join(''))}
          <section class="tarjeta pad"><span class="etiqueta">Estudiantes</span>
            <div class="tabla-mini tabla-hist"><table><thead><tr><th>Estudiante</th>${et.slice(desde).map((x) => `<th class="num">${h(x)}</th>`).join('')}<th class="num" title="Cambio respecto del ensayo anterior">±</th></tr></thead><tbody>
            ${H.estudiantes.map((s) => {
              const a = s.serie[ultimo - 1], b = s.serie[ultimo];
              const d = a != null && b != null ? Math.round((b - a) * 100) : null;
              return `<tr><td>${h(corto(s.e.nombre))}</td>${s.serie.slice(desde).map((v) => `<td class="num">${v == null ? '–' : pct(v)}</td>`).join('')}<td class="num ${d > 0 ? 'sube' : d < 0 ? 'baja' : ''}">${d == null ? '–' : (d > 0 ? '+' : '') + d}</td></tr>`;
            }).join('')}</tbody></table></div>
            <span class="nota">${desde ? `Se muestran los últimos 3 ensayos; el Excel trae todos. ` : ''}La columna ± muestra cuántos puntos subió o bajó cada estudiante entre los dos últimos ensayos.</span></section>`;
      }
    }
    return `<div class="pantalla">${cabecera('Estadísticas', `${cur.nombre} · ${ens.nombre}`)}
      <div class="cuerpo">${encabezado}${cuerpo}${exportar}
      </div>${nav('')}</div>`;
  }

  // Pestaña Nivel: el mismo ensayo en todos los paralelos
  function cuerpoNivel(ens, cur) {
    const nv = nivelDe(cur).nivel;
    const sinExportar = '';
    if (!nv) {
      return { exportar: sinExportar, cuerpo: `<div class="tarjeta vacio">No sé a qué nivel pertenece ${h(cur.nombre)}. Indícalo en Cursos (por ejemplo "II medio", letra "B") para compararlo con sus paralelos.
        <div class="fila-botones" style="margin-top:12px"><button class="btn" data-accion="abrir-curso" data-a="${h(cur.id)}">Indicar nivel</button></div></div>` };
    }
    const N = analisisNivel(ens, cur);
    const paralelos = paralelosDe(cur);
    if (N.porCurso.length < 2) {
      const faltan = paralelos.filter((c) => !N.porCurso.some((x) => x.curso.id === c.id)).map((c) => c.nombre);
      return { exportar: sinExportar, cuerpo: `<div class="tarjeta vacio">La comparación de ${h(nv)} aparece cuando al menos dos paralelos tienen hojas corregidas de ${h(ens.nombre)}.
        ${paralelos.length < 2 ? `Por ahora ${h(cur.nombre)} es el único curso de ${h(nv)}: carga la lista de los otros paralelos en Cursos.` : `Faltan resultados de ${h(faltan.join(', '))}.`}</div>` };
    }
    const NA = N.A, cs = N.porCurso.map((x) => ({ ...x, nombre: x.curso.nombre, color: Graficos.colorCurso(x.idx) }));
    const conv = Estad.cortesDe(ens) ? 'adecuado' : Estad.tieneTabla(ens) ? 'puntaje' : null;
    const celdaConv = (R) => (conv === 'adecuado' ? `<td class="num">${pct(R.adecuado)}</td>` : conv === 'puntaje' ? `<td class="num">${R.puntajeMedia}</td>` : '');
    const tabla = `<div class="tabla-mini"><table><thead><tr><th>Curso</th><th class="num">Hojas</th><th class="num">Logro</th><th class="num">Nota</th><th class="num">Aprueban</th>${conv === 'adecuado' ? '<th class="num">Adecuado</th>' : conv === 'puntaje' ? '<th class="num">Puntaje</th>' : ''}</tr></thead><tbody>
      ${cs.map((x) => { const R = x.A.resumen; return `<tr><td><b style="color:var(--texto)"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${x.color};margin-right:6px"></i>${h(x.nombre)}</b></td><td class="num">${R.corregidas}/${R.total}</td><td class="num">${pct(R.media)}</td><td class="num">${notaTx(R.notaMedia)}</td><td class="num">${pct(R.aprobados / R.corregidas)}</td>${celdaConv(R)}</tr>`; }).join('')}
      <tr><td><b>${h(nv)}</b></td><td class="num">${NA.resumen.corregidas}</td><td class="num"><b>${pct(NA.resumen.media)}</b></td><td class="num"><b>${notaTx(NA.resumen.notaMedia)}</b></td><td class="num"><b>${pct(NA.resumen.aprobados / NA.resumen.corregidas)}</b></td>${conv ? celdaConv(NA.resumen).replace('<td class="num">', '<td class="num" style="font-weight:700">') : ''}</tr>
      </tbody></table></div>`;
    const caja = Graficos.cajaPuntos(cs.map((x) => ({
      nombre: x.nombre, color: x.color, media: x.A.resumen.media, mediana: x.A.resumen.mediana, q1: x.A.resumen.q1, q3: x.A.resumen.q3,
      puntos: x.A.hechas.map((y) => ({ v: y.logro, nombre: `${corto(y.e.nombre)} (${x.nombre})` })),
    })), NA.resumen.media);
    const grupo = E.nivelGrupo || 'eje';
    const fuenteNivel = grupo === 'eje' ? NA.porEje : NA.porHabilidad;
    const mapa = Graficos.mapaCursos(fuenteNivel.map((g) => g.nombre), cs.map((x) => x.nombre),
      fuenteNivel.map((g) => cs.map((x) => { const y = (grupo === 'eje' ? x.A.porEje : x.A.porHabilidad).find((z) => z.nombre === g.nombre); return y ? y.logro : null; })),
      fuenteNivel.map((g) => g.logro));
    const btnG = (id, t) => `<button data-accion="nivel-grupo" data-a="${id}" aria-pressed="${grupo === id}">${t}</button>`;
    // Referencia oficial
    let referencia = '';
    const ref = ens.referencia || {};
    if (ref.colegio != null || ref.similar != null) {
      if (conv === 'adecuado') {
        referencia = tarjetaGrafico('Comparación con el SIMCE oficial', Graficos.barrasRef([
          { nombre: `${ens.nombre} (${nv})`, valor: NA.resumen.adecuado, destacado: true },
          ...(ref.colegio != null ? [{ nombre: 'SIMCE oficial del colegio', valor: ref.colegio }] : []),
          ...(ref.similar != null ? [{ nombre: 'Colegios similares', valor: ref.similar }] : []),
        ], Math.max(0.5, NA.resumen.adecuado, ref.colegio || 0, ref.similar || 0), pct), '% de estudiantes en Adecuado. El dato del ensayo es una estimación; los oficiales los ingresaste en el ensayo.');
      } else if (conv === 'puntaje') {
        referencia = tarjetaGrafico('Comparación con resultados oficiales', Graficos.barrasRef([
          { nombre: `${ens.nombre} (${nv})`, valor: NA.resumen.puntajeMedia, destacado: true },
          ...(ref.colegio != null ? [{ nombre: 'Puntaje oficial del colegio', valor: ref.colegio }] : []),
          ...(ref.similar != null ? [{ nombre: 'Referencia nacional', valor: ref.similar }] : []),
        ], 1000, (v) => String(Math.round(v))), 'Puntaje promedio. El del ensayo es una estimación con la tabla del ensayo.');
      }
    }
    // Evolución del nivel
    const HN = Estad.historialNivel(ensayos(), paralelos, (e, c) => hojasDe(e, c), Estad.grupoEnsayo(ens), nv);
    let evolucion = '';
    if (HN.length >= 2) {
      const et = HN.map((p) => etiquetaEnsayo(p.ensayo));
      const series = paralelos.map((c, i) => ({ nombre: c.nombre, color: Graficos.colorCurso(i), valores: HN.map((p) => p.porCurso[i]) })).filter((s) => s.valores.some((v) => v != null));
      series.push({ nombre: 'Nivel', color: 'var(--texto-2)', valores: HN.map((p) => p.A.resumen.media), punteada: true });
      evolucion += tarjetaGrafico(`Evolución de ${nv}`, Graficos.lineas(series, et), `Logro promedio de cada paralelo en los ensayos de ${h(Estad.grupoEnsayo(ens))}. La línea punteada es el nivel.`);
      const conCortes = HN.filter((p) => p.A.estandares);
      if (conCortes.length >= 2) {
        evolucion += tarjetaGrafico('Estándares en el tiempo', Graficos.columnas100(conCortes.map((p) => ({ etiqueta: etiquetaEnsayo(p.ensayo), partes: partesEst(p.A) }))) + leyendaEstandares, `% de estudiantes de ${h(nv)} en cada estándar estimado, ensayo a ensayo.`);
      }
    }
    const brechas = N.brechas.slice(0, 8);
    const cuerpo = `
      <span class="nota">${h(nv)} · ${cs.length} paralelos con resultados de ${h(ens.nombre)}.</span>
      ${tarjetaGrafico('Resumen por curso', tabla)}
      ${tarjetaGrafico('Comparación de paralelos', caja + `<div class="leyenda-graf"><span><i style="background:var(--azul-suave);border:1px solid var(--azul)"></i>Mitad central</span><span><i style="background:var(--texto);width:3px"></i>Mediana</span><span><i class="linea-key" style="color:var(--texto)"></i>Promedio del nivel</span></div>`, 'Cada punto es un estudiante: así se ve si un promedio lo levantan o lo bajan unos pocos.')}
      ${tarjetaGrafico(grupo === 'eje' ? 'Ejes por curso' : 'Habilidades por curso', `<div class="filtros">${btnG('eje', 'Ejes')}${btnG('habilidad', 'Habilidades')}</div>` + mapa, 'Bajo cada valor, la diferencia en puntos con el nivel.')}
      ${NA.estandares ? tarjetaGrafico('Estándares por curso', Graficos.apilado100([...cs.map((x) => ({ nombre: x.nombre, partes: partesEst(x.A) })), { nombre: 'Nivel', partes: partesEst(NA), destacado: true }]) + leyendaEstandares, 'Estándar estimado con los cortes del ensayo.') : avisoConversion(ens)}
      ${referencia}
      ${tarjetaGrafico('Preguntas con brecha entre paralelos', Graficos.puntosPreguntas(N.preguntas, cs, Estad.BRECHA) + `<div class="leyenda-graf">${cs.map((x) => `<span><i style="background:${x.color}"></i>${h(x.nombre)}</span>`).join('')}</div>` +
        (brechas.length ? `<div class="tabla-mini"><table><thead><tr><th>Preg.</th><th>Eje</th>${cs.map((x) => `<th class="num">${h(x.nombre)}</th>`).join('')}<th class="num">Brecha</th></tr></thead><tbody>${brechas.map((p) => `<tr><td class="num">${p.n}</td><td class="ajusta">${h(p.eje)}</td>${p.porCurso.map((v) => `<td class="num">${pct(v)}</td>`).join('')}<td class="num alta">${Math.round(p.brecha * 100)}</td></tr>`).join('')}</tbody></table></div>` : '<span class="nota">Ninguna pregunta tiene una brecha de 25 puntos o más entre paralelos.</span>'),
        `Se destacan las preguntas con ${Math.round(Estad.BRECHA * 100)} puntos o más de diferencia entre el mejor y el peor paralelo: suelen apuntar a un contenido que no se trabajó igual.`)}
      ${evolucion}`;
    return { cuerpo, exportar: `<button class="btn" data-accion="excel-nivel">${ICONO.bajar} Exportar el nivel a Excel</button>` };
  }

  // Pestaña Alertas: a quién reforzar y en qué
  function cuerpoAlertas(ens, cur, A) {
    const u = Estad.conf.umbrales;
    const H = historialDelCurso(ens, cur);
    const AL = Estad.alertas(A, H);
    const conCambio = AL.filter((a) => a.cambio != null);
    const conAlerta = AL.filter((a) => a.alertas.length).sort((a, b) => b.gravedad - a.gravedad || a.x.logro - b.x.logro);
    const grupoPor = E.grupoPor || 'eje';
    const G = Estad.grupos(A, grupoPor);
    const btnG = (id, t) => `<button data-accion="grupo-por" data-a="${id}" aria-pressed="${grupoPor === id}">${t}</button>`;
    const enRiesgo = AL.filter((a) => a.alertas.some((x) => x.id === 'riesgo')).length;
    return `
      <div class="cifras">
        <div class="tarjeta"><span>En riesgo</span><b class="num" style="color:var(--mal-texto)">${enRiesgo}</b></div>
        <div class="tarjeta"><span>Con alguna alerta</span><b class="num">${conAlerta.length}</b></div>
        <div class="tarjeta"><span>En grupos</span><b class="num">${G.reduce((s, g) => s + g.estudiantes.length, 0)}</b></div>
      </div>
      ${conCambio.length ? tarjetaGrafico('Logro y cambio', Graficos.cuadrante(AL.filter((a) => a.cambio != null).map((a) => ({ x: a.x.logro, y: a.cambio, nombre: corto(a.x.e.nombre), riesgo: a.x.logro < u.riesgo && a.cambio < 0 })), u.riesgo) + `<div class="leyenda-graf"><span><i style="background:var(--critico)"></i>Bajo ${pct(u.riesgo)} y bajando</span><span><i style="background:var(--serie)"></i>Resto del curso</span></div>`, 'Cada punto es un estudiante: a la derecha, más logro; arriba, mejoró respecto del ensayo anterior de la misma asignatura.')
        : '<div class="tarjeta pad"><span class="etiqueta">Logro y cambio</span><span class="nota">El gráfico de logro y cambio aparece cuando el curso tiene otro ensayo corregido de la misma asignatura antes de este.</span></div>'}
      <section class="tarjeta pad"><span class="etiqueta">Estudiantes con alertas (${conAlerta.length})</span>
        ${conAlerta.length ? `<div class="lista">${conAlerta.map((a) => `<button class="item" data-accion="ficha" data-a="${h(a.x.e.id)}" style="padding-left:0;padding-right:0">
          <span class="principal"><b>${h(a.x.e.nombre)}</b><span class="num">${pct(a.x.logro)} · nota ${notaTx(a.x.nota)}${a.cambio != null ? ` · ${signo(a.cambio)} pts` : ''}</span>
          <span class="chips">${a.alertas.map((x) => `<span class="chip ${x.id}">${h(x.texto)}</span>`).join('')}</span></span></button>`).join('')}</div>`
          : '<span class="nota">Ningún estudiante cumple los criterios de alerta.</span>'}
      </section>
      <section class="tarjeta pad"><span class="etiqueta">Grupos de reforzamiento</span>
        <div class="filtros">${btnG('eje', 'Por eje')}${btnG('habilidad', 'Por habilidad')}</div>
        ${G.length ? G.map((g) => `<div class="grupo-ref"><div class="encab"><b>${h(g.nombre)}</b><span class="chip ok num">${g.estudiantes.length} est.</span></div>
          <span class="nombres">${g.estudiantes.map((s) => `${h(corto(s.x.e.nombre))} (${pct(s.logro)})`).join(', ')}</span>
          <span class="nota num">${g.preguntas} preguntas · el curso logra ${pct(g.logroCurso)}</span></div>`).join('')
          : `<span class="nota">Nadie tiene un ${grupoPor === 'eje' ? 'eje' : 'habilidad'} bajo ${pct(u.riesgo)}.</span>`}
        <span class="nota">Cada estudiante va al ${grupoPor === 'eje' ? 'eje' : 'habilidad'} donde tiene su logro más bajo, si está bajo ${pct(u.riesgo)}. Los grupos salen también en el Excel.</span>
      </section>
      <span class="nota">Criterios: en riesgo si tiene menos de ${pct(u.riesgo)} y bajó respecto del ensayo anterior, o si lleva tres ensayos bajo ${pct(u.riesgo)}; baja si perdió ${Math.round(u.baja * 100)} puntos o más; omisión si dejó en blanco más de ${pct(u.omision)} de las preguntas. Los cambias en Ajustes.</span>`;
  }

  function pFicha() {
    const ens = ensayoActivo(), cur = cursoActivo();
    if (!ens || !cur) return pVacio('Estadísticas', '');
    const A = Estad.analizar(ens, cur, hojasDe(ens, cur));
    const N = nivelDe(cur).nivel ? analisisNivel(ens, cur) : null;
    const conNivel = N && N.porCurso.length >= 2;
    const P = Estad.perfil(A, E.estAbierto, conNivel ? N.A : null);
    if (!P) { E.pantalla = 'estadisticas'; return pEstadisticas(); }
    const H = historialDelCurso(ens, cur);
    const serie = (H.estudiantes.find((s) => s.e.id === P.e.id) || { serie: [] }).serie;
    const al = Estad.alertas(A, H).find((a) => a.x.e.id === P.e.id);
    const falladas = A.preguntas.filter((p) => !P.aciertos[p.i]);
    const cuarta = P.estandar ? `<div class="tarjeta"><span>Estándar <span class="estimado">est.</span></span><b style="font-size:18px">${P.estandar.nombre}</b></div>`
      : P.puntaje != null ? `<div class="tarjeta"><span>Puntaje <span class="estimado">est.</span></span><b class="num">${P.puntaje}</b></div>`
        : `<div class="tarjeta"><span>Tramo</span><b style="font-size:18px">${P.tramo.nombre}</b></div>`;
    const leyenda = `<div class="leyenda-graf"><span><i style="background:var(--serie);border-radius:50%"></i>${h(corto(P.e.nombre))}</span><span><i style="background:var(--texto);width:3px"></i>Su curso</span>${conNivel ? `<span><i style="background:var(--distractor);width:3px"></i>${h(nivelDe(cur).nivel)}</span>` : ''}</div>`;
    return `<div class="pantalla sin-nav">${cabecera(P.e.nombre, `N° ${P.e.lista} · ${cur.nombre} · ${ens.nombre}`, 'estadisticas')}
      <div class="cuerpo">
        <div class="cifras cuatro">
          <div class="tarjeta"><span>Logro</span><b class="num" style="color:var(--azul-texto)">${pct(P.logro)}</b></div>
          <div class="tarjeta"><span>Nota</span><b class="num">${notaTx(P.nota)}</b></div>
          <div class="tarjeta"><span>Lugar en el curso</span><b class="num">${P.posicion}°<span style="font-size:14px">/${A.hechas.length}</span></b></div>
          ${cuarta}
        </div>
        ${al && al.alertas.length ? `<div class="chips">${al.alertas.map((x) => `<span class="chip ${x.id}">${h(x.texto)}</span>`).join('')}</div>` : ''}
        <span class="nota num">${P.correctas} correctas, ${P.incorrectas} incorrectas y ${P.omitidas} omitidas. Promedio del curso: ${pct(A.resumen.media)}${conNivel ? `; del nivel: ${pct(N.A.resumen.media)}` : ''}.</span>
        ${leyenda}
        ${tarjetaGrafico('Por eje', Graficos.puntosGrupo(P.porEje), conNivel ? 'Si el punto está a la izquierda de la raya negra, está bajo su curso; la raya gris es el nivel.' : '')}
        ${tarjetaGrafico('Por habilidad', Graficos.puntosGrupo(P.porHabilidad))}
        ${H.puntos.length >= 2 ? tarjetaGrafico('Evolución', Graficos.linea(serie, H.puntos.map((p) => etiquetaEnsayo(p.ensayo)), { resaltar: H.puntos.map((p) => p.media) }) + '<div class="leyenda-graf"><span><i style="background:var(--serie)"></i>Estudiante</span><span><i class="linea-key" style="color:var(--distractor)"></i>Promedio del curso</span></div>') : ''}
        <section class="tarjeta pad"><span class="etiqueta">Preguntas incorrectas u omitidas (${falladas.length})</span>
          <div class="tabla-mini"><table><thead><tr><th>N°</th><th>Marcó</th><th>Clave</th><th>Eje</th><th class="num">% curso</th></tr></thead><tbody>
          ${falladas.map((p) => `<tr><td class="num">${p.n}${p.piloto ? '<small> (piloto)</small>' : ''}</td><td>${P.r[p.i] || '–'}</td><td>${p.clave}</td><td class="ajusta">${h(p.eje)}</td><td class="num">${pct(p.acierto)}</td></tr>`).join('')}</tbody></table></div>
        </section>
        <button class="btn" data-accion="ver-hoja" data-a="${h(P.e.id)}">Ver o corregir su hoja</button>
        ${seccionContacto(P.e)}
        ${seccionInformeEstudiante(P.e, cur)}
      </div></div>`;
  }

  const correoValido = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  // En el perfil: correos del estudiante y del apoderado, editables
  function seccionContacto(est) {
    return `<section class="tarjeta pad contacto"><span class="etiqueta">Correos</span>
      <label class="campo" for="correo-est">Correo del estudiante<input type="email" id="correo-est" inputmode="email" autocomplete="off" placeholder="nombre@correo.cl" value="${h(est.correo || '')}"></label>
      <label class="campo" for="correo-apo">Correo del apoderado<input type="email" id="correo-apo" inputmode="email" autocomplete="off" placeholder="apoderado@correo.cl" value="${h(est.correoApoderado || '')}"></label>
      <div class="fila-botones"><button class="btn" data-accion="guardar-contacto" data-a="${h(est.id)}">Guardar correos</button><button class="btn" data-accion="perfil-desde-ficha" data-a="${h(est.id)}">Editar perfil</button></div>
      <span class="nota">También puedes cargarlos en la lista del curso (columnas E y F de la plantilla).</span>
    </section>`;
  }
  async function guardarContacto(idEst) {
    const cur = cursoActivo(), est = cur && cur.estudiantes.find((e) => e.id === idEst);
    if (!est) return;
    const ce = document.getElementById('correo-est').value.trim(), ca = document.getElementById('correo-apo').value.trim();
    if ((ce && !correoValido(ce)) || (ca && !correoValido(ca))) { toast('Revisa el correo: debe tener la forma nombre@dominio.cl'); return; }
    if (ce) est.correo = ce; else delete est.correo;
    if (ca) est.correoApoderado = ca; else delete est.correoApoderado;
    await Almacen.guardar('cursos', cur.id, cur);
    toast('Correos guardados'); E.mantenerScroll = true; render();
  }

  // Ensayos que rindió un estudiante en el curso activo, del más reciente al más antiguo
  function ensayosDelEstudiante(idEst, cur) {
    return ensayosConHojas(cur).filter((e) => hojasDe(e, cur)[idEst]).map((e) => {
      const x = Estad.analizar(e, cur, hojasDe(e, cur)).estudiantes.find((y) => y.e.id === idEst);
      return { e, x };
    }).filter((o) => o.x && o.x.corregida);
  }
  // En el perfil: elegir ensayos y versión, y descargar el informe del estudiante
  function seccionInformeEstudiante(est, cur) {
    const suyos = ensayosDelEstudiante(est.id, cur);
    if (!E.fichaSel || E.fichaSel.id !== est.id || E.fichaSel.cur) E.fichaSel = { id: est.id, marcados: suyos.map((o) => o.e.id), modo: 'estudiante' };
    const S = E.fichaSel, n = S.marcados.filter((id) => suyos.some((o) => o.e.id === id)).length;
    return `<section class="tarjeta pad informe-estudiante"><span class="etiqueta">Informe PDF de ${h(corto(est.nombre))}</span>
      <span class="nota">Marca los ensayos que quieres incluir. Con más de uno, el informe parte con un resumen de todos y sigue con el detalle de cada ensayo.</span>
      <div class="filtros"><button data-accion="marcar-perfil" data-a="todos">Todos</button>${[...new Set(suyos.map((o) => Estad.grupoEnsayo(o.e)))].length > 1 ? `<button data-accion="marcar-perfil" data-a="asig">Solo ${h(Estad.grupoEnsayo(ensayoActivo()))}</button>` : ''}<button data-accion="marcar-perfil" data-a="ninguno">Ninguno</button></div>
      <div class="lista-elegir">${suyos.map(({ e, x }) => {
        const on = S.marcados.includes(e.id);
        return `<button class="opcion" data-accion="marcar-perfil" data-a="${h(e.id)}" aria-pressed="${on}"><span class="caja">${on ? ICONO.check : ''}</span>
          <span class="principal"><b>${h(e.nombre)}</b><span>${h([e.asignatura, e.fecha].filter(Boolean).join(' · '))}</span></span>
          <span class="resultado num"><b>${pct(x.logro)}</b><span>nota ${notaTx(x.nota)}</span></span></button>`;
      }).join('')}</div>
      <span class="etiqueta">¿Para quién es?</span>
      <div class="segmento tres"><button data-accion="modo-perfil" data-a="estudiante" aria-pressed="${S.modo === 'estudiante'}">Estudiante</button><button data-accion="modo-perfil" data-a="apoderado" aria-pressed="${S.modo === 'apoderado'}">Apoderado</button><button data-accion="modo-perfil" data-a="docente" aria-pressed="${S.modo === 'docente'}">Docente</button></div>
      <span class="nota">${S.modo === 'estudiante' ? 'Resultado acumulado, evolución y plan personal de mejora. Sin rankings.' : S.modo === 'apoderado' ? 'Lenguaje sencillo, fortalezas, evolución y orientaciones para la familia. Sin comparaciones con compañeros.' : 'Una ficha técnica por ensayo, con lugar en el curso, percentil y análisis técnico.'} Para filtrar por temática o período usa Informes.</span>
      <button class="btn primario" data-accion="informe-perfil" ${n ? '' : 'disabled'}>${ICONO.bajar} Descargar informe (${n} ensayo${n === 1 ? '' : 's'})</button>
      ${S.modo === 'docente' ? '' : (() => {
        const dest = S.modo === 'apoderado' ? est.correoApoderado : est.correo;
        return dest ? `<button class="btn" data-accion="enviar-perfil" ${n ? '' : 'disabled'}>✉ Enviar por correo a ${h(dest)}</button>
          <span class="nota">Se descarga el PDF y luego eliges cómo abrir tu correo (tu app, Gmail u Outlook), con todo escrito. Solo tienes que adjuntar el PDF y enviar.</span>`
          : `<span class="nota">Para enviarlo por correo, agrega arriba el correo ${S.modo === 'apoderado' ? 'del apoderado' : 'del estudiante'}.</span>`;
      })()}
    </section>`;
  }
  // Arma el PDF del perfil según los ensayos marcados y el destinatario elegido
  function crearInformeEstudiante() {
    const S = E.fichaSel, cur = (S.cur && Almacen.obtener('cursos', S.cur)) || cursoActivo();
    const elegidos = ensayosDelEstudiante(S.id, cur).map((o) => o.e).filter((e) => S.marcados.includes(e.id))
      .sort((a, b) => Estad.fechaOrden(a).localeCompare(Estad.fechaOrden(b)));
    if (!elegidos.length) return null;
    const ultimo = elegidos[elegidos.length - 1];
    const est = cur.estudiantes.find((e) => e.id === S.id);
    const sufijo = elegidos.length === 1 ? Almacen.id(ultimo.nombre).slice(0, 30) : `${elegidos.length}_ensayos`;
    if (S.modo !== 'docente') {
      const ctxS = contextoEstudiante(cur, est, { ensayosEst: elegidos.map((e) => e.id), ejes: S.ejes || null, desde: '', hasta: '' });
      return { est, cur, elegidos, nombre: `informe_${S.modo}_${Almacen.id(Estad.nombres(est.nombre).completo)}_${sufijo}.pdf`, blob: Informe.acumulado(ctxS, S.modo) };
    }
    const base = contextoInforme(ultimo, elegidos.map((e) => e.id));
    const porEnsayo = elegidos.map((e) => (e.id === ultimo.id ? base : contextoInforme(e, [e.id])));
    return { est, cur, elegidos, nombre: `informe_docente_${Almacen.id(Estad.nombres(est.nombre).completo)}_${sufijo}.pdf`, blob: Informe.estudiante(base, porEnsayo, S.id, S.modo) };
  }
  async function descargarInformeEstudiante() {
    toast('Preparando el informe…');
    try {
      const r = crearInformeEstudiante();
      if (r) await descargar(r.nombre, r.blob);
    } catch (e) { console.error(e); toast('No se pudo crear el informe: ' + e.message); }
  }
  // Correo con destinatario, asunto y mensaje listos; el PDF queda descargado para adjuntarlo
  async function enviarInformeEstudiante() {
    const S = E.fichaSel;
    try {
      const r = crearInformeEstudiante();
      if (!r) return;
      const apo = S.modo === 'apoderado';
      const para = apo ? r.est.correoApoderado : r.est.correo;
      if (!para) { toast('Falta el correo.'); return; }
      const col = config().colegio || {};
      const ens = r.elegidos.length === 1 ? `el ensayo ${r.elegidos[0].nombre}` : `${r.elegidos.length} ensayos (${r.elegidos.map((e) => e.nombre).join(', ')})`;
      const nombre = Estad.nombres(r.est.nombre).corto;
      const asunto = `Informe de resultados${apo ? ' de ' + Estad.nombres(r.est.nombre).completo : ''} - ${r.elegidos.length === 1 ? r.elegidos[0].nombre : r.elegidos.length + ' ensayos'}`;
      const cuerpo = apo
        ? `Estimado(a) apoderado(a):\n\nLe envío adjunto el informe de resultados de ${Estad.nombres(r.est.nombre).completo} (${r.cur.nombre}) en ${ens}. Incluye sus fortalezas, los aspectos por reforzar y orientaciones para acompañarlo(a) desde la casa.\n\nQuedo atento(a) a sus consultas.\n\nSaludos cordiales${col.nombre ? ',\n' + col.nombre : ''}`
        : `Hola ${nombre}:\n\nTe envío adjunto tu informe de resultados en ${ens}. Ahí puedes ver en qué te fue bien, qué preguntas conviene repasar y un plan para seguir mejorando.\n\nCualquier duda, me preguntas en clases.\n\nSaludos${col.nombre ? ',\n' + col.nombre : ''}`;
      await descargar(r.nombre, r.blob);
      // El correo se abre con un toque del docente en la ventana siguiente: abrirlo solo tras la descarga lo bloquean muchos navegadores
      const q = encodeURIComponent, dest = q(para).replace(/%40/g, '@');
      E.correoListo = { para, asunto, cuerpo, archivo: r.nombre,
        mailto: `mailto:${dest}?subject=${q(asunto)}&body=${q(cuerpo)}`,
        gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${dest}&su=${q(asunto)}&body=${q(cuerpo)}`,
        outlook: `https://outlook.office.com/mail/deeplink/compose?to=${dest}&subject=${q(asunto)}&body=${q(cuerpo)}` };
      render();
      return true;
    } catch (e) { console.error(e); toast('No se pudo preparar el correo: ' + e.message); }
    return false;
  }

  // Envío a todo el curso: una fila por estudiante, cada una prepara su correo con su propio informe
  function pEnvioCurso() {
    const c = Almacen.obtener('cursos', E.cursoAbierto);
    if (!c) return pCursos();
    const V = E.envio = E.envio && E.envio.cur === c.id ? E.envio : { cur: c.id, modo: 'estudiante', grupo: '__todos', enviados: {} };
    const filtroInf = V.filtro ? (o) => V.filtro.ensayos.includes(o.e.id) : () => true;
    const grupos = [...new Set(ensayosConHojas(c).map((e) => Estad.grupoEnsayo(e)))];
    if (V.grupo !== '__todos' && !grupos.includes(V.grupo)) V.grupo = '__todos';
    const apo = V.modo === 'apoderado';
    const filas = [...c.estudiantes].sort((a, b) => a.lista - b.lista).map((e) => {
      const suyos = ensayosDelEstudiante(e.id, c).filter((o) => filtroInf(o) && (V.grupo === '__todos' || Estad.grupoEnsayo(o.e) === V.grupo));
      return { e, n: suyos.length, correo: apo ? e.correoApoderado : e.correo, enviado: V.enviados[`${V.modo}:${e.id}`] };
    });
    const listos = filas.filter((f) => f.correo && f.n), sinCorreo = filas.filter((f) => !f.correo).length, hechos = filas.filter((f) => f.enviado).length;
    return `<div class="pantalla sin-nav">${cabecera('Enviar resultados por correo', c.nombre, V.volver || 'curso-detalle')}
      <div class="cuerpo">
        <section class="tarjeta pad"><span class="etiqueta">¿A quién le envías?</span>
          <div class="segmento"><button data-accion="envio-modo" data-a="estudiante" aria-pressed="${!apo}">Estudiantes</button><button data-accion="envio-modo" data-a="apoderado" aria-pressed="${apo}">Apoderados</button></div>
          ${V.filtro ? `<span class="nota">Incluye ${V.filtro.ensayos.length === 1 ? 'el ensayo elegido' : `los ${V.filtro.ensayos.length} ensayos elegidos`} en Informes y análisis${V.filtro.ejes ? ` (temáticas: ${h(V.filtro.ejes.join(', '))})` : ''}.</span>` : ''}
          ${grupos.length > 1 && !V.filtro ? `<span class="etiqueta">Ensayos que incluye</span><div class="filtros">${['__todos', ...grupos].map((g) => `<button data-accion="envio-grupo" data-a="${h(g)}" aria-pressed="${V.grupo === g}">${g === '__todos' ? 'Todos' : h(g)}</button>`).join('')}</div>` : ''}
          <span class="nota">Toca <b>Enviar</b> en cada fila: se descarga el PDF de ese estudiante y aparece una ventana para abrir tu correo (tu app, Gmail u Outlook) con el destinatario, el asunto y el mensaje listos. Adjuntas el PDF, envías y vuelves aquí para el siguiente. La app no puede enviar correos sola porque no tiene un servidor de correo.</span>
        </section>
        <div class="cifras">
          <div class="tarjeta"><span>Listos para enviar</span><b class="num">${listos.length}</b></div>
          <div class="tarjeta"><span>Preparados</span><b class="num" style="color:var(--azul-texto)">${hechos}</b></div>
          <div class="tarjeta"><span>Sin correo</span><b class="num">${sinCorreo}</b></div>
        </div>
        <div class="tarjeta lista">${filas.map((f) => `<div class="item">
          <span class="n num">${f.e.lista}</span>
          <span class="principal"><b>${h(f.e.nombre)}</b><span>${f.correo ? h(f.correo) : `<button class="btn-texto" data-accion="editar-est" data-a="${h(f.e.id)}">Sin correo: agregar</button>`}${f.correo && !f.n ? ' · sin hojas corregidas' : ''}</span></span>
          ${f.correo && f.n ? `<button class="btn ${f.enviado ? '' : 'primario'}" style="min-height:38px;padding:0 14px" data-accion="envio-uno" data-a="${h(f.e.id)}">${f.enviado ? '✓ Preparado' : 'Enviar'}</button>` : ''}
        </div>`).join('')}</div>
        <span class="nota">Los correos se cargan en la lista del curso (columnas E y F de la plantilla) o en el perfil de cada estudiante.</span>
      </div></div>`;
  }

  // Tablero del colegio: cada nivel y asignatura con resultados
  function tablero() {
    const niveles = new Map();
    cursos().forEach((c) => { const nv = nombreNivel(c); if (!niveles.has(nv)) niveles.set(nv, []); niveles.get(nv).push(c); });
    const grupos = [...new Set(ensayos().map((e) => Estad.grupoEnsayo(e)))];
    const filas = [];
    for (const [nv, cs] of niveles) {
      const paralelos = cs.length > 1 ? paralelosDe(cs[0]) : cs;
      for (const g of grupos) {
        const HN = Estad.historialNivel(ensayos(), paralelos, (e, c) => hojasDe(e, c), g, nv);
        if (!HN.length) continue;
        const u = HN[HN.length - 1];
        const cursoConDatos = paralelos.find((c) => Object.keys(hojasDe(u.ensayo, c)).length) || paralelos[0];
        filas.push({
          nivel: nv, grupo: g, ensayos: HN.length, ultimo: u, serie: HN.map((p) => p.A.resumen.media), curso: cursoConDatos,
          bajo: u.A.hechas.filter((x) => x.logro < Estad.conf.umbrales.riesgo).length,
        });
      }
    }
    const orden = (nv) => { const m = /^(\d+)° básico/.exec(nv); if (m) return +m[1]; const r = /^(I{1,3}|IV) medio/.exec(nv); return r ? 8 + { I: 1, II: 2, III: 3, IV: 4 }[r[1]] : 99; };
    return filas.sort((a, b) => orden(a.nivel) - orden(b.nivel) || a.nivel.localeCompare(b.nivel) || a.grupo.localeCompare(b.grupo));
  }

  function pColegio() {
    const filas = tablero();
    const u = Estad.conf.umbrales;
    const conv = (f) => {
      const R = f.ultimo.A.resumen;
      if (R.adecuado != null) return `${pct(R.adecuado)} en Adecuado`;
      if (R.puntajeMedia != null) return `${R.puntajeMedia} pts. promedio`;
      return `nota ${notaTx(R.notaMedia)}`;
    };
    return `<div class="pantalla">${cabecera('Colegio', 'Todos los niveles y asignaturas')}
      <div class="cuerpo">
        ${filas.length ? `<div class="tarjeta lista">${filas.map((f, i) => `<button class="item" data-accion="abrir-tablero" data-a="${i}">
          <span class="principal"><b>${h(f.nivel)} · ${h(f.grupo)}</b>
          <span class="num">${pct(f.ultimo.A.resumen.media)} de logro · ${h(conv(f))} · ${f.ensayos} ensayo${f.ensayos === 1 ? '' : 's'}</span>
          <span class="num" style="color:${f.bajo ? 'var(--mal-texto)' : 'var(--texto-2)'};font-weight:${f.bajo ? 700 : 400}">${f.bajo} estudiante${f.bajo === 1 ? '' : 's'} bajo ${pct(u.riesgo)}</span></span>
          ${Graficos.sparkline(f.serie)}</button>`).join('')}</div>
          <span class="nota">Cada fila resume el último ensayo de esa asignatura en el nivel, con todos sus paralelos juntos. La línea muestra el logro del nivel ensayo a ensayo. Toca una fila para ver la comparación de paralelos.</span>
          <button class="btn" data-accion="excel-colegio">${ICONO.bajar} Exportar el tablero a Excel</button>`
          : '<div class="tarjeta vacio">Cuando haya hojas corregidas, aquí verás cada nivel y asignatura del colegio en una tabla.</div>'}
      </div>${nav('')}</div>`;
  }
  // ---------- Informes y análisis de resultados ----------
  const DESTINOS = [
    { id: 'directivo', nombre: 'Equipo directivo', detalle: 'Visión global, comparación entre cursos y prioridades, sin datos individuales' },
    { id: 'docente', nombre: 'Docente', detalle: 'Diagnóstico del curso, pregunta por pregunta, estudiantes y plan de acción' },
    { id: 'estudiante', nombre: 'Estudiante', detalle: 'Informe personal del ensayo, con la opción de sumar más ensayos rendidos' },
    { id: 'apoderado', nombre: 'Padres y apoderados', detalle: 'Resumen breve del resultado, fortalezas y cómo apoyar desde la casa' },
    { id: 'completo', nombre: 'Informe completo', detalle: 'Todo en un PDF: directivo, docente, estudiante y apoderados de un curso' },
  ];
  const TIPOS = {
    directivo: [
      { id: 'A', nombre: 'A. Todos los cursos que rindieron el ensayo', detalle: 'Un ensayo con todos sus cursos, de cualquier nivel: comparación, cada pregunta por curso y, si quieres, la nómina' },
      { id: 'B', nombre: 'B. Cursos del mismo nivel', detalle: 'Un ensayo y los paralelos de un nivel: resumen ejecutivo, curvas por curso, brechas y prioridades' },
      { id: 'C', nombre: 'C. Cursos y ensayos a elección', detalle: 'Varios ensayos y los cursos que elijas: tabla curso por ensayo, evolución, ejes y alertas' },
    ],
    docente: [
      { id: 'A', nombre: 'A. Informe del curso', detalle: 'Un curso: resultados con la curva, ejes, preguntas, estudiantes que requieren apoyo y plan de acción' },
      { id: 'B', nombre: 'B. Informe comparativo', detalle: 'Los cursos que elijas, lado a lado: curvas, ejes por curso, preguntas con brecha y recomendaciones' },
      { id: 'C', nombre: 'C. Informe del curso y análisis de cada estudiante', detalle: 'El informe del curso más una ficha técnica por estudiante' },
    ],
  };
  const modoInforme = (S) => (S.dest === 'directivo' ? 'dir' + (S.tipoDir || 'A') : S.dest === 'docente' ? 'doc' + (S.tipoDoc || 'A') : S.dest);
  const conHojasEn = (e, c) => Object.keys(hojasDe(e, c)).length > 0;
  const enRango = (e, S) => { const f = Estad.fechaOrden(e); return (!S.desde || f >= S.desde) && (!S.hasta || f <= S.hasta); };

  // Estado del módulo, con valores por defecto a partir del ensayo y curso activos
  function estadoInformes() {
    if (E.inf) return E.inf;
    const ens = ensayoActivo(), cur = cursoActivo();
    E.inf = { asig: ens ? Estad.grupoEnsayo(ens) : null, ens: ens ? ens.id : null, nivel: cur ? nombreNivel(cur) : null, cursos: cur ? [cur.id] : [], cursoDoc: cur ? cur.id : null,
      dest: 'docente', est: null, ensayosEst: null, ejes: null, desde: '', hasta: '', fichas: false, todos: false };
    return E.inf;
  }
  function datosInformes() {
    const S = estadoInformes();
    if (S.dest === 'ensayo') { S.dest = 'directivo'; S.tipoDir = 'A'; }
    if (S.dest === 'directivo' && !S.tipoDir) S.tipoDir = 'C';
    if (S.dest === 'docente' && !S.tipoDoc) S.tipoDoc = S.fichas ? 'C' : 'A';
    const conDatos = ensayos().filter((e) => cursos().some((c) => conHojasEn(e, c)));
    const asigs = [...new Set(conDatos.map((e) => Estad.grupoEnsayo(e)))];
    if (!asigs.includes(S.asig)) S.asig = asigs[0] || null;
    const delGrupo = conDatos.filter((e) => Estad.grupoEnsayo(e) === S.asig).sort((a, b) => Estad.fechaOrden(b).localeCompare(Estad.fechaOrden(a)));
    if (!delGrupo.some((e) => e.id === S.ens)) S.ens = delGrupo[0] ? delGrupo[0].id : null;
    const ens = S.ens && Almacen.obtener('ensayos', S.ens);
    const cursosEns = ens ? cursos().filter((c) => conHojasEn(ens, c)) : [];
    const niveles = [...new Set(cursosEns.map((c) => nombreNivel(c)))];
    if (!niveles.includes(S.nivel)) S.nivel = niveles[0] || null;
    const delNivel = cursosEns.filter((c) => nombreNivel(c) === S.nivel);
    S.cursos = S.cursos.filter((id) => delNivel.some((c) => c.id === id));
    if (!S.cursos.length && delNivel.length) S.cursos = delNivel.map((c) => c.id);
    if (!delNivel.some((c) => c.id === S.cursoDoc)) { const act = cursoActivo(); S.cursoDoc = (delNivel.find((c) => act && c.id === act.id) || delNivel[0] || {}).id || null; }
    const curDoc = S.cursoDoc && Almacen.obtener('cursos', S.cursoDoc);
    return { S, asigs, delGrupo, ens, delNivel, curDoc };
  }
  // Ensayos que rindió un estudiante (todas las asignaturas), filtrados por período
  function ensayosEst(cur, idEst, S) {
    return ensayos().filter((e) => hojasDe(e, cur)[idEst] && enRango(e, S)).sort((a, b) => Estad.fechaOrden(a).localeCompare(Estad.fechaOrden(b)));
  }
  // Directivo: ensayos del tipo elegido (todos por defecto) y todos los cursos que los rindieron
  function seleccionDirectiva(S, delGrupo) {
    const ensSel = (S.ensDir ? delGrupo.filter((e) => S.ensDir.includes(e.id)) : delGrupo).slice().sort((a, b) => Estad.fechaOrden(a).localeCompare(Estad.fechaOrden(b)));
    const disponibles = cursos().filter((c) => ensSel.some((e) => conHojasEn(e, c))).sort((a, b) => nombreNivel(a).localeCompare(nombreNivel(b)) || a.nombre.localeCompare(b.nombre));
    const cursosSel = S.cursosDir ? disponibles.filter((c) => S.cursosDir.includes(c.id)) : disponibles;
    return { ensSel, disponibles, cursosSel };
  }
  function contextoDirectivoVarios(S, delGrupo) {
    const { ensSel, cursosSel } = seleccionDirectiva(S, delGrupo);
    const bloques = [];
    ensSel.forEach((e) => {
      const niveles = new Map();
      cursosSel.filter((c) => conHojasEn(e, c)).forEach((c) => { const nv = nombreNivel(c); if (!niveles.has(nv)) niveles.set(nv, []); niveles.get(nv).push(c); });
      for (const [nv, cs] of niveles) bloques.push(contextoDirectivo(e, cs, nv));
    });
    return { tipo: S.asig, ensayos: ensSel, bloques: bloques.filter((b) => b.porCurso.length), colegio: config().colegio || {} };
  }
  // Informe del ensayo: todos los cursos que lo rindieron, de cualquier nivel (se pueden quitar)
  function cursosDelEnsayo(S, ens) {
    const disponibles = ens ? cursos().filter((c) => conHojasEn(ens, c)).sort((a, b) => nombreNivel(a).localeCompare(nombreNivel(b)) || a.nombre.localeCompare(b.nombre)) : [];
    const sel = S.cursosEns && S.cursosEns.ens === (ens && ens.id) ? disponibles.filter((c) => S.cursosEns.ids.includes(c.id)) : disponibles;
    return { disponibles, sel: sel.length ? sel : disponibles };
  }
  function contextoEnsayo(S, ens) {
    const { sel } = cursosDelEnsayo(S, ens);
    const niveles = [...new Set(sel.map((c) => nombreNivel(c)))];
    return contextoDirectivo(ens, sel, niveles.length === 1 ? niveles[0] : 'Todos los cursos');
  }
  function contextoDirectivo(ens, cursosSel, nivel, sinAnterior = false) {
    const porCurso = cursosSel.map((c, idx) => ({ curso: c, idx, A: Estad.analizar(ens, c, hojasDe(ens, c)) })).filter((x) => x.A.hechas.length);
    const N = Estad.nivel(ens, porCurso.map((x) => x.curso), (c) => hojasDe(ens, c), nivel || 'Cursos seleccionados');
    const vals = porCurso.map((x) => Estad.validar(ens, x.curso, hojasDe(ens, x.curso)));
    const validacion = { errores: [...new Set(vals.flatMap((v) => v.errores))], avisos: [...new Set(vals.flatMap((v) => v.avisos))] };
    validacion.ok = !validacion.errores.length;
    // Ensayo anterior del mismo tipo que rindió alguno de estos cursos (para comparar)
    let anterior = null;
    if (!sinAnterior) {
      const previo = ensayos().filter((e) => e.id !== ens.id && Estad.grupoEnsayo(e) === Estad.grupoEnsayo(ens) && Estad.fechaOrden(e) < Estad.fechaOrden(ens) && porCurso.some((x) => conHojasEn(e, x.curso)))
        .sort((a, b) => Estad.fechaOrden(b).localeCompare(Estad.fechaOrden(a)))[0];
      if (previo) { const D = contextoDirectivo(previo, porCurso.map((x) => x.curso).filter((c) => conHojasEn(previo, c)), nivel, true); if (D.porCurso.length) anterior = { ens: previo, porCurso: D.porCurso, inst: D.inst }; }
    }
    return { ens, nivel, porCurso, inst: N.A, brechas: N.brechas, colegio: config().colegio || {}, validacion, anterior };
  }
  // Contexto del informe docente con los cursos elegidos para comparar
  // Sin comparación (cursosSel con solo el curso), el informe es solo del curso
  function contextoDocente(ens, cur, cursosSel) {
    const ctx = contextoInforme(ens, [ens.id], cur);
    if (cursosSel.length >= 2) ctx.N = Estad.nivel(ens, cursosSel, (c) => hojasDe(ens, c), nombreNivel(cur));
    else { ctx.N = null; ctx.HN = null; }
    return ctx;
  }
  // Cursos del informe docente o completo: el curso elegido y, si se pidió comparar, los otros marcados
  function cursosComparados(S, curDoc) {
    if (!curDoc) return [];
    if (!S.comparar) return [curDoc];
    return [curDoc, ...S.cursos.filter((id) => id !== curDoc.id).map((id) => Almacen.obtener('cursos', id)).filter(Boolean)];
  }
  function contextoEstudiante(cur, est, S) {
    const ids = S.ensayosEst || ensayosEst(cur, est.id, S).map((e) => e.id);
    const sel = ids.map((id) => Almacen.obtener('ensayos', id)).filter((e) => e && hojasDe(e, cur)[est.id] && enRango(e, S))
      .map((e) => ({ ens: e, A: Estad.analizar(e, cur, hojasDe(e, cur)) })).sort((a, b) => Estad.fechaOrden(a.ens).localeCompare(Estad.fechaOrden(b.ens)));
    return { cur, est, sel, ejes: S.ejes, colegio: config().colegio || {} };
  }

  function pInformes() {
    const { S, asigs, delGrupo, ens, delNivel, curDoc } = datosInformes();
    if (!ens) return `<div class="pantalla">${cabecera('Informes y análisis', '')}<div class="cuerpo"><div class="tarjeta vacio">Cuando tengas hojas corregidas podrás generar aquí los informes.</div></div>${nav('')}</div>`;
    const guardadas = config().informesGuardados || [];
    const modo = modoInforme(S);
    let n = 0;
    const paso = (t, cuerpo) => `<section class="tarjeta pad paso-inf"><span class="etiqueta"><b class="num">${++n}</b> ${h(t)}</span>${cuerpo}</section>`;
    const chip = (accion, a, on, texto) => `<button data-accion="${accion}" data-a="${h(a)}" aria-pressed="${on}">${h(texto)}</button>`;
    const opcion = (accion, a, on, titulo, sub, extra = '') => `<button class="opcion" data-accion="${accion}" data-a="${h(a)}" aria-pressed="${on}"><span class="caja">${on ? ICONO.check : ''}</span><span class="principal"><b>${h(titulo)}</b>${sub ? `<span>${h(sub)}</span>` : ''}</span>${extra}</button>`;
    const interruptor = (accion, on, titulo, sub) => `<div class="lista-elegir"><button class="opcion" data-accion="${accion}" aria-pressed="${on}"><span class="caja">${on ? ICONO.check : ''}</span><span class="principal"><b>${h(titulo)}</b><span>${h(sub)}</span></span></button></div>`;
    const individual = ['estudiante', 'apoderado', 'completo'].includes(S.dest);
    const cursosSel = S.cursos.map((id) => Almacen.obtener('cursos', id)).filter(Boolean);
    const pasoEnsayo = () => paso('Ensayo', `<div class="lista-elegir">${delGrupo.map((e) => opcion('inf-ens', e.id, e.id === S.ens, e.nombre, [e.fecha, `${cursos().filter((c) => conHojasEn(e, c)).length} cursos con hojas`].filter(Boolean).join(' · '))).join('')}</div>`);
    const chipsNivel = () => { const nvs = [...new Set(cursos().filter((c) => conHojasEn(ens, c)).map((c) => nombreNivel(c)))]; return nvs.length > 1 ? `<div class="filtros">${nvs.map((x) => chip('inf-nivel', x, x === S.nivel, x)).join('')}</div>` : ''; };
    const pasoCurso = () => paso('Curso', `${chipsNivel()}<span class="nota">Elige el curso del informe.</span>
        <div class="filtros">${delNivel.map((c) => chip('inf-curso-doc', c.id, c.id === S.cursoDoc, c.nombre)).join('')}</div>`);
    const pasoCursosNivel = (nota) => paso('Nivel y cursos', `${chipsNivel()}<span class="nota">${h(nota)}</span>
        <div class="filtros">${delNivel.map((c) => chip('inf-curso', c.id, S.cursos.includes(c.id), c.nombre)).join('')}</div>`);

    // Estudiante y apoderado: el ensayo elegido y, si se pide, más ensayos rendidos
    let opcionesEst = '', conEst = [];
    if (individual && curDoc) {
      const masEns = S.dest === 'completo' || !!S.masEns;
      conEst = curDoc.estudiantes.filter((e) => (masEns ? ensayos().some((x) => hojasDe(x, curDoc)[e.id]) : hojasDe(ens, curDoc)[e.id]));
      if (!S.todos && !conEst.some((e) => e.id === S.est)) S.est = conEst[0] ? conEst[0].id : null;
      opcionesEst += `<label class="campo" for="inf-est">Estudiante<select id="inf-est" data-cambio="inf-est">
          <option value="__todos" ${S.todos ? 'selected' : ''}>Todos los estudiantes del curso (${conEst.length})</option>
          ${conEst.map((e) => `<option value="${h(e.id)}" ${!S.todos && e.id === S.est ? 'selected' : ''}>${e.lista}. ${h(e.nombre)}</option>`).join('')}</select></label>`;
      if (S.dest !== 'completo') opcionesEst += interruptor('inf-mas-ens', masEns, 'Incluir más ensayos rendidos', `Sin esta opción, el informe es solo de ${ens.nombre}. Con ella, puedes sumar otros ensayos del período y ver la evolución.`);
      if (!masEns) S.ensayosEst = [ens.id];
      else {
        const ref = S.todos ? conEst[0] : conEst.find((e) => e.id === S.est);
        const disponibles = ref ? (S.todos ? [...new Map(conEst.flatMap((e) => ensayosEst(curDoc, e.id, S)).map((x) => [x.id, x])).values()].sort((a, b) => Estad.fechaOrden(a).localeCompare(Estad.fechaOrden(b))) : ensayosEst(curDoc, ref.id, S)) : [];
        if (!S.ensayosEst) S.ensayosEst = disponibles.filter((e) => Estad.grupoEnsayo(e) === S.asig).map((e) => e.id);
        S.ensayosEst = S.ensayosEst.filter((id) => disponibles.some((e) => e.id === id));
        const ejes = [...new Set(disponibles.filter((e) => S.ensayosEst.includes(e.id)).flatMap((e) => e.preguntas.filter((p) => !p.piloto).map((p) => p.eje || 'Sin dato')))];
        if (S.ejes) S.ejes = S.ejes.filter((x) => ejes.includes(x));
        opcionesEst += `<div class="dos"><label class="campo" for="inf-desde">Desde<input type="date" id="inf-desde" data-cambio="inf-desde" value="${h(S.desde)}"></label>
        <label class="campo" for="inf-hasta">Hasta<input type="date" id="inf-hasta" data-cambio="inf-hasta" value="${h(S.hasta)}"></label></div>
        <span class="nota">Ensayos ${S.todos ? 'del curso' : 'que rindió'} en el período. Puedes mezclar asignaturas: cada instrumento se informa por separado, con su escala.</span>
        <div class="filtros"><button data-accion="inf-ens-grupo" data-a="todos">Todos</button><button data-accion="inf-ens-grupo" data-a="asig">Solo ${h(S.asig)}</button><button data-accion="inf-ens-grupo" data-a="ninguno">Ninguno</button></div>
        <div class="lista-elegir">${disponibles.map((e) => opcion('inf-ens-est', e.id, S.ensayosEst.includes(e.id), e.nombre, [e.asignatura, e.fecha, `${e.preguntas.filter((p) => !p.piloto).length} preguntas`].filter(Boolean).join(' · '))).join('') || '<span class="nota">No hay ensayos en ese período.</span>'}</div>
        ${ejes.length > 1 ? `<span class="etiqueta">Temáticas</span><div class="filtros">${chip('inf-eje', '__todas', !S.ejes, 'Todas')}${ejes.map((x) => chip('inf-eje', x, !!S.ejes && S.ejes.includes(x), x)).join('')}</div>` : ''}`;
      }
    }

    // Pasos según el informe
    let pasos = '';
    if (modo === 'dirC') {
      const D2 = seleccionDirectiva(S, delGrupo);
      pasos += paso('Ensayos', `<span class="nota">Marca los ensayos de ${h(S.asig)} que quieres incluir. Por defecto van todos.</span>
          <div class="filtros"><button data-accion="inf-dir-ens-todos" data-a="todos">Todos</button><button data-accion="inf-dir-ens-todos" data-a="ultimo">Solo el más reciente</button></div>
          <div class="lista-elegir">${delGrupo.map((e) => opcion('inf-dir-ens', e.id, D2.ensSel.some((x) => x.id === e.id), e.nombre, [e.fecha, `${cursos().filter((c) => conHojasEn(e, c)).length} cursos con hojas`].filter(Boolean).join(' · '))).join('')}</div>`);
      pasos += paso('Cursos', `<span class="nota">Todos los cursos que rindieron los ensayos marcados${[...new Set(D2.disponibles.map((c) => nombreNivel(c)))].length > 1 ? ', de todos los niveles' : ''}. Quita los que no quieras incluir.</span>
          <div class="filtros">${D2.disponibles.map((c) => chip('inf-dir-curso', c.id, D2.cursosSel.some((x) => x.id === c.id), c.nombre)).join('')}</div>`);
      pasos += paso('Opciones', interruptor('inf-dir-detalle', !!S.detalleDir, 'Incluir el detalle de cada ensayo', 'Agrega, después del resumen, el informe completo de cada ensayo por nivel. Sin esta opción, el informe queda en pocas páginas.') + '<span class="nota">El informe directivo no incluye nombres de estudiantes.</span>');
    } else if (modo === 'dirA') {
      const CE = cursosDelEnsayo(S, ens);
      pasos += pasoEnsayo();
      pasos += paso('Cursos', `<span class="nota">Todos los cursos que rindieron ${h(ens.nombre)}${[...new Set(CE.disponibles.map((c) => nombreNivel(c)))].length > 1 ? ', de todos los niveles' : ''}. Quita los que no quieras incluir.</span>
        <div class="filtros">${CE.disponibles.map((c) => chip('inf-ens-curso', c.id, CE.sel.some((x) => x.id === c.id), c.nombre)).join('')}</div>`);
      pasos += paso('Opciones', interruptor('inf-ens-nomina', S.nominaEns !== false, 'Incluir la nómina de cada curso', 'Una tabla por curso con cada estudiante: correctas, logro, puntaje y nivel. Sin esta opción, el informe no lleva nombres de estudiantes.'));
    } else if (modo === 'dirB') {
      pasos += pasoEnsayo() + pasoCursosNivel('Van todos los cursos del nivel que rindieron el ensayo. Quita los que no quieras incluir.');
    } else if (modo === 'docB') {
      pasos += pasoEnsayo() + pasoCursosNivel('Marca los cursos que quieres comparar (al menos dos).');
    } else if (modo === 'docA' || modo === 'docC') {
      pasos += pasoEnsayo() + pasoCurso();
    } else {
      pasos += pasoEnsayo() + pasoCurso();
      let op = opcionesEst;
      if (S.dest === 'completo') {
        if (delNivel.length > 1) {
          op += interruptor('inf-comparar', !!S.comparar, 'Agregar comparación con otros cursos', `Suma una sección que compara ${curDoc ? curDoc.nombre : 'el curso'} con los cursos que marques. Sin esta opción, el informe es solo del curso.`);
          if (S.comparar) op += `<span class="etiqueta">Cursos para comparar</span><div class="filtros">${delNivel.filter((c) => !curDoc || c.id !== curDoc.id).map((c) => chip('inf-curso', c.id, S.cursos.includes(c.id), c.nombre)).join('')}</div>`;
        }
        op += interruptor('inf-fichas', !!S.fichas, 'Incluir fichas técnicas de cada estudiante', 'Agrega una página por estudiante, con su lugar en el curso y su análisis técnico.');
      }
      if (op) pasos += paso(S.dest === 'completo' ? 'Opciones' : 'Estudiante y ensayos', op);
    }

    // Observaciones de la aplicación (solo informes institucionales y del docente)
    if (!['estudiante', 'apoderado'].includes(S.dest)) {
      const grupos = modo === 'dirC' ? (() => { const D2 = seleccionDirectiva(S, delGrupo); return D2.ensSel.map((e) => ({ ens: e, cs: D2.cursosSel.filter((c) => conHojasEn(e, c)) })); })()
        : modo === 'dirA' ? [{ ens, cs: cursosDelEnsayo(S, ens).sel }]
          : modo === 'dirB' || modo === 'docB' ? [{ ens, cs: delNivel }]
            : [{ ens, cs: curDoc ? [curDoc] : [] }];
      const cuerpo = grupos.filter((g) => g.cs.length).map(({ ens: e, cs }) => {
        const o = e.obs || {}, oc = o.cursos || {};
        return `${grupos.length > 1 ? `<span class="etiqueta">${h(e.nombre)}</span>` : ''}
          <label class="campo">Comentario general del ensayo<textarea rows="3" data-cambio="obs-general" data-ens="${h(e.id)}" placeholder="Ej.: se aplicó el viernes en la última hora y varios cursos lo respondieron sin compromiso.">${h(o.general || '')}</textarea></label>
          ${cs.map((c) => { const x = oc[c.id] || {}; return `<div class="obs-curso"><div class="lista-elegir"><button class="opcion" data-accion="obs-irregular" data-a="${h(e.id + '|' + c.id)}" aria-pressed="${!!x.irregular}"><span class="caja">${x.irregular ? ICONO.check : ''}</span><span class="principal"><b>${h(c.nombre)}: aplicación irregular</b><span>Márcalo si el curso no rindió el ensayo como correspondía.</span></span></button></div>
            <input data-cambio="obs-curso" data-ens="${h(e.id)}" data-curso="${h(c.id)}" value="${h(x.texto || '')}" placeholder="Comentario sobre ${h(c.nombre)} (opcional)" aria-label="Comentario sobre ${h(c.nombre)}"></div>`; }).join('')}`;
      }).join('');
      if (cuerpo) {
        const hay = grupos.some(({ ens: e }) => e.obs && (e.obs.general || Object.values(e.obs.cursos || {}).some((x) => x.irregular || x.texto)));
        pasos += paso('Observaciones de la aplicación', `<details class="obs-ensayo"${hay || S.obsAbierto ? ' open' : ''}><summary>${hay ? 'Ver o editar las observaciones' : 'Agregar comentarios sobre cómo se rindió el ensayo'}</summary>
          <span class="nota">Lo que anotes aparece en los informes para directivos y docentes, y se considera en el análisis: por ejemplo, un curso marcado como irregular se advierte en la comparación, las alertas y las prioridades. No aparece en los informes de estudiantes ni apoderados.</span>${cuerpo}</details>`);
      }
    }

    // Vista previa
    let previa = '';
    try {
      if (individual && curDoc && (S.est || S.todos)) {
        const est = S.todos ? null : curDoc.estudiantes.find((e) => e.id === S.est);
        if (est) {
          const cs = contextoEstudiante(curDoc, est, S), C2 = Estad.consolidar(est.id, cs.sel, S.ejes);
          previa += `<span class="nota">${h(Estad.nombres(est.nombre).corto)}: ${cs.sel.length} ensayo${cs.sel.length === 1 ? '' : 's'} seleccionado${cs.sel.length === 1 ? '' : 's'}${S.ejes ? `, temáticas: ${h(S.ejes.join(', '))}` : ''}.</span>
            <div class="tabla-mini"><table><thead><tr><th>Instrumento</th><th class="num">Ensayos</th><th class="num">Correctas</th><th class="num">Logro</th></tr></thead><tbody>
            ${C2.map((g) => `<tr><td class="ajusta">${h(g.nombre)}</td><td class="num">${g.cantidad}</td><td class="num">${g.correctas}/${g.preguntas}</td><td class="num">${pct(g.logro)}</td></tr>`).join('') || '<tr><td colspan="4">Sin datos para esa selección</td></tr>'}</tbody></table></div>`;
        } else previa += `<span class="nota">Se generará un informe por cada uno de los ${conEst.length} estudiantes, en un solo PDF.</span>`;
      }
      if (modo === 'dirC') {
        const M2 = contextoDirectivoVarios(S, delGrupo);
        const ev = M2.bloques.reduce((a, b) => a + b.inst.resumen.corregidas, 0), media = ev ? M2.bloques.reduce((a, b) => a + b.inst.resumen.media * b.inst.resumen.corregidas, 0) / ev : 0;
        const ncur = new Set(M2.bloques.flatMap((b) => b.porCurso.map((x) => x.curso.id))).size;
        previa += `<div class="cifras cuatro"><div class="tarjeta"><span>Ensayos</span><b class="num">${M2.ensayos.length}</b></div><div class="tarjeta"><span>Cursos</span><b class="num">${ncur}</b></div>
          <div class="tarjeta"><span>Hojas corregidas</span><b class="num">${ev}</b></div><div class="tarjeta"><span>Logro promedio</span><b class="num">${pct(media)}</b></div></div>
          <span class="nota">${M2.bloques.length > 1 ? `Resumen de todos los cursos y ensayos: tabla curso por ensayo, participación, curva, evolución, ejes y alertas.${S.detalleDir ? ` Después, el detalle de cada ensayo por nivel (${M2.bloques.length} secciones).` : ''}` : 'Un solo ensayo y un nivel: se genera el informe directivo de ese ensayo.'}</span>`;
      } else if (!individual || S.dest === 'completo') {
        const D = modo === 'dirA' ? contextoEnsayo(S, ens) : modo === 'dirB' || modo === 'docB' ? contextoDirectivo(ens, cursosSel, S.nivel) : contextoDirectivo(ens, cursosComparados(S, curDoc), S.nivel);
        const R = D.inst.resumen, al = Informe.vistaPrevia(D).alertas;
        previa += `<div class="cifras cuatro"><div class="tarjeta"><span>Evaluados</span><b class="num">${R.corregidas}<span style="font-size:14px">/${R.total}</span></b></div>
          <div class="tarjeta"><span>Participación</span><b class="num">${pct(R.participacion)}</b></div><div class="tarjeta"><span>${R.puntajeMedia != null ? 'Puntaje promedio' : 'Logro promedio'}</span><b class="num">${R.puntajeMedia != null ? R.puntajeMedia : pct(R.media)}</b></div>
          <div class="tarjeta"><span>Alertas</span><b class="num">${al.length}</b></div></div>
          ${D.porCurso.length >= 2 ? `<div class="tabla-mini"><table><thead><tr><th>Curso</th><th class="num">Evaluados</th><th class="num">Promedio</th><th class="num">Dif.</th></tr></thead><tbody>${D.porCurso.map((x) => `<tr><td>${h(x.curso.nombre)}</td><td class="num">${x.A.resumen.corregidas}/${x.A.resumen.total}</td><td class="num">${pct(x.A.resumen.media)}</td><td class="num">${Math.round((x.A.resumen.media - R.media) * 100)} pp</td></tr>`).join('')}</tbody></table></div>` : ''}
          ${modo === 'docB' && D.porCurso.length < 2 ? '<div class="aviso rev">' + ICONO.alerta + '<span>Marca al menos dos cursos con hojas corregidas para comparar.</span></div>' : ''}
          ${D.validacion.errores.length ? `<div class="aviso mal">${ICONO.alerta}<span><b>Problemas en los datos:</b> ${h(D.validacion.errores.join(' '))}</span></div>` : ''}
          ${D.validacion.avisos.length ? `<div class="aviso rev">${ICONO.alerta}<span>${h(D.validacion.avisos.join(' '))}</span></div>` : ''}`;
      }
    } catch (e) { console.error(e); previa = `<span class="nota">No se pudo calcular la vista previa: ${h(e.message)}</span>`; }
    const tipos = TIPOS[S.dest];
    const tipoSel = S.dest === 'directivo' ? S.tipoDir : S.tipoDoc;
    return `<div class="pantalla">${cabecera('Informes y análisis', 'Resultados para cada destinatario')}<div class="cuerpo informes">
      ${guardadas.length ? `<section class="tarjeta pad"><span class="etiqueta">Configuraciones guardadas</span><div class="filtros">${guardadas.map((g, i) => `<button data-accion="inf-cargar" data-a="${i}">${h(g.nombre)}</button>`).join('')}</div>
        <button class="btn-texto" data-accion="inf-borrar-guardadas">Borrar las configuraciones guardadas</button></section>` : ''}
      ${paso('¿Para quién es el informe?', `<div class="lista-elegir">${DESTINOS.map((d) => opcion('inf-dest', d.id, d.id === S.dest, d.nombre, d.detalle)).join('')}</div>`)}
      ${tipos ? paso('Tipo de informe', `<div class="lista-elegir">${tipos.map((t) => opcion('inf-tipo', t.id, t.id === tipoSel, t.nombre, t.detalle)).join('')}</div>`) : ''}
      ${paso('Tipo de evaluación', `<div class="filtros">${asigs.map((a) => chip('inf-asig', a, a === S.asig, a)).join('')}</div>`)}
      ${pasos}
      ${paso('Vista previa', previa || '<span class="nota">Elige las opciones de arriba.</span>')}
      <button class="btn primario grande" data-accion="inf-generar">${ICONO.bajar} Generar PDF</button>
      ${(S.dest === 'estudiante' || S.dest === 'apoderado') && curDoc ? `<button class="btn grande cta" data-accion="inf-enviar">✉ Enviar por correo a cada ${S.dest === 'apoderado' ? 'apoderado' : 'estudiante'} de ${h(curDoc.nombre)}</button>
      <span class="nota">Cada uno recibe su propio informe, con ${S.masEns ? `los ensayos${S.ejes ? ' y temáticas' : ''} que elegiste arriba` : `el ensayo ${h(ens.nombre)}`}.</span>` : ''}
      <div class="fila-guardar"><input id="inf-nombre" placeholder="Nombre de la configuración, ej.: II medio M1 directivo"><button class="btn" data-accion="inf-guardar">Guardar</button></div>
    </div>${nav('')}</div>`;
  }

  // Guarda las observaciones de la aplicación dentro del ensayo
  async function guardarObs(idEns, cambiar) {
    const e = Almacen.obtener('ensayos', idEns); if (!e) return;
    const obs = JSON.parse(JSON.stringify(e.obs || {})); obs.cursos = obs.cursos || {};
    cambiar(obs);
    await Almacen.guardar('ensayos', idEns, { ...e, obs });
  }
  async function generarInformeModulo() {
    const { S, ens, curDoc, delGrupo } = datosInformes();
    if (!ens) return;
    const modo = modoInforme(S);
    const cursosSel = S.cursos.map((id) => Almacen.obtener('cursos', id)).filter(Boolean);
    toast('Preparando el informe…');
    try {
      const nombre = (s) => Almacen.id(s).slice(0, 30);
      const estudiantesSel = () => {
        const lista = S.todos ? curDoc.estudiantes.filter((e) => ensayos().some((x) => hojasDe(x, curDoc)[e.id])) : curDoc.estudiantes.filter((e) => e.id === S.est);
        return lista.map((e) => contextoEstudiante(curDoc, e, S)).filter((c) => c.sel.length);
      };
      let blob, archivo;
      if (modo === 'dirC') {
        const M2 = contextoDirectivoVarios(S, delGrupo);
        if (!M2.bloques.length) { toast('No hay hojas corregidas para esa selección.'); return; }
        if (M2.bloques.length === 1) { blob = Informe.directivo(M2.bloques[0]); archivo = `informe_directivo_${nombre(M2.bloques[0].nivel || 'cursos')}_${nombre(M2.bloques[0].ens.nombre)}.pdf`; }
        else { M2.detalle = !!S.detalleDir; blob = Informe.directivoConsolidado(M2, { detalle: M2.detalle }); archivo = `informe_directivo_${nombre(S.asig || 'ensayos')}_${M2.ensayos.length}_ensayos.pdf`; }
      } else if (modo === 'dirA') {
        const D = contextoEnsayo(S, ens);
        if (!D.porCurso.length) { toast('No hay hojas corregidas de ese ensayo.'); return; }
        blob = Informe.ensayoCursos(D, { nomina: S.nominaEns !== false });
        archivo = `informe_directivo_${nombre(ens.nombre)}_${D.porCurso.length}_cursos.pdf`;
      } else if (modo === 'dirB') {
        const D = contextoDirectivo(ens, cursosSel, S.nivel);
        if (!D.porCurso.length) { toast('No hay hojas corregidas para esos cursos.'); return; }
        blob = Informe.directivo(D);
        archivo = `informe_directivo_${nombre(S.nivel || 'nivel')}_${nombre(ens.nombre)}.pdf`;
      } else if (modo === 'docB') {
        const D = contextoDirectivo(ens, cursosSel, S.nivel);
        if (D.porCurso.length < 2) { toast('Marca al menos dos cursos con hojas corregidas para comparar.'); return; }
        blob = Informe.comparativo(D);
        archivo = `informe_comparativo_${nombre(S.nivel || 'cursos')}_${nombre(ens.nombre)}.pdf`;
      } else if (modo === 'docA' || modo === 'docC') {
        if (!curDoc) return;
        blob = Informe.docente(contextoDocente(ens, curDoc, [curDoc]), { fichas: modo === 'docC' });
        archivo = `informe_docente_${nombre(curDoc.nombre)}_${nombre(ens.nombre)}.pdf`;
      } else if (S.dest === 'completo') {
        blob = Informe.completo({ dir: contextoDirectivo(ens, cursosComparados(S, curDoc), S.nivel), doc: contextoDocente(ens, curDoc, cursosComparados(S, curDoc)), estudiantes: estudiantesSel(), fichas: S.fichas });
        archivo = `informe_completo_${nombre(curDoc.nombre)}_${nombre(ens.nombre)}.pdf`;
      } else {
        const lista = estudiantesSel();
        if (!lista.length) { toast('No hay ensayos para esa selección.'); return; }
        blob = Informe.acumulado(lista.length === 1 ? lista[0] : lista, S.dest);
        archivo = `informe_${S.dest}_${lista.length === 1 ? nombre(lista[0].est.nombre) : nombre(curDoc.nombre) + '_todos'}.pdf`;
      }
      await descargar(archivo, blob);
    } catch (e) { console.error(e); toast('No se pudo crear el informe: ' + e.message); }
  }

  // Perfiles de docente: nombre, cursos asignados y si ve todo (UTP)
  function seccionDocentes() {
    const ds = docentes(), p = perfilActivo(), todos = todosLosCursos();
    const chip = (accion, a, on, texto) => `<button data-accion="${accion}" data-a="${h(a)}" aria-pressed="${on}">${h(texto)}</button>`;
    return `<section class="tarjeta pad" id="docentes"><span class="etiqueta">Docentes</span>
      <span style="font-size:14px;color:var(--texto-2)">Crea un perfil por docente y asígnale sus cursos. Al abrir la app, cada uno elige su nombre y ve solo sus cursos. No hay contraseñas: sirve para ordenar, no para proteger datos.</span>
      ${p ? `<span class="nota">En este equipo estás como <b>${h(p.nombre)}</b>. <button class="btn-texto" data-accion="cambiar-perfil">Cambiar</button></span>` : ''}
      ${ds.map((d) => `<div class="docente-fila">
        <div class="docente-cab"><b>${h(d.nombre)}</b><button class="btn-texto" style="color:var(--mal-texto)" data-accion="docente-borrar" data-a="${h(d.id)}">Quitar</button></div>
        <div class="lista-elegir"><button class="opcion" data-accion="docente-todos" data-a="${h(d.id)}" aria-pressed="${!!d.todos}"><span class="caja">${d.todos ? ICONO.check : ''}</span><span class="principal"><b>Ve todos los cursos</b><span>Para UTP o dirección.</span></span></button></div>
        ${d.todos ? '' : `<div class="filtros">${todos.map((c) => chip('docente-curso', `${d.id}|${c.id}`, (d.cursos || []).includes(c.id), c.nombre)).join('') || '<span class="nota">Todavía no hay cursos.</span>'}</div>`}
      </div>`).join('')}
      <div class="fila-guardar"><input id="a-docente" placeholder="Nombre del docente, ej.: Marcelo Aravena" aria-label="Nombre del docente"><button class="btn" data-accion="docente-agregar">Agregar</button></div>
    </section>`;
  }
  const fijarDocentes = (ds) => fijarConfig({ docentes: ds });

  // Datos del colegio para los informes: nombre, responsable, logo y metas
  function seccionColegio() {
    const c = config().colegio || {};
    return `<section class="tarjeta pad"><span class="etiqueta">Colegio e informes</span>
      <label class="campo" for="a-colegio">Nombre del colegio<input id="a-colegio" value="${h(c.nombre || '')}" placeholder="Ej.: Liceo Bicentenario de Temuco"></label>
      <label class="campo" for="a-responsable">Responsable de los informes<input id="a-responsable" value="${h(c.responsable || '')}" placeholder="Ej.: Marcelo Aravena, UTP"></label>
      <div class="dos">
        <label class="campo" for="a-meta-logro">Meta de logro (%)<input id="a-meta-logro" inputmode="decimal" value="${c.metaLogro != null ? Math.round(c.metaLogro * 100) : ''}" placeholder="Ej.: 60"></label>
        <label class="campo" for="a-meta-puntaje">Meta de puntaje PAES<input id="a-meta-puntaje" inputmode="numeric" value="${c.metaPuntaje != null ? c.metaPuntaje : ''}" placeholder="Ej.: 600"></label>
      </div>
      <div class="logo-fila">${c.logo ? `<img src="${c.logo.src}" alt="Logo del colegio">` : '<span class="nota">Sin logo</span>'}
        <label class="btn" for="a-logo">${ICONO.subir} ${c.logo ? 'Cambiar logo' : 'Subir logo'}</label>${c.logo ? '<button class="btn" data-accion="quitar-logo">Quitar</button>' : ''}</div>
      <input type="file" id="a-logo" accept="image/png,image/jpeg" class="oculto-visual" data-archivo="logo">
      <span class="nota">Aparecen en la portada y el pie de los informes PDF. Las metas se comparan con el resultado de cada curso.</span>
      <button class="btn" data-accion="guardar-colegio">Guardar</button>
    </section>`;
  }
  // Achica el logo para que no pese en el almacenamiento ni en los PDF
  function leerLogo(archivo) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 240 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(img.src);
        ok({ src: cv.toDataURL('image/jpeg', 0.9), w: cv.width, h: cv.height });
      };
      img.onerror = () => mal(new Error('No se pudo leer la imagen'));
      img.src = URL.createObjectURL(archivo);
    });
  }

  // Versión instalada (nombre de la caché del service worker), para comprobar que la app se actualizó
  function mostrarVersion() {
    if (!window.caches) return;
    caches.keys().then((k) => { const v = k.find((x) => x.startsWith('lector-')); const el = document.getElementById('version-app'); if (el) el.textContent = v ? `Versión ${v.slice(7, 14)}` : 'Versión sin instalar'; }).catch(() => {});
  }

  function pAjustes() {
    setTimeout(mostrarVersion, 0);
    return `<div class="pantalla">${cabecera('Ajustes y respaldo', Almacen.modo === 'nube' ? 'Tus datos se guardan en tu cuenta de Claude' : 'Tus datos se guardan en este navegador')}
      <div class="cuerpo">
        ${seccionColegio()}
        ${seccionDocentes()}
        <section class="tarjeta pad"><span class="etiqueta">Respaldo</span>
          <span style="font-size:14px;color:var(--texto-2)">Descarga todos tus ensayos, cursos y resultados en un archivo. Sirve para cambiar de equipo o recuperar datos. Guárdalo fuera de este equipo (Drive, OneDrive o un correo a ti mismo).</span>
          ${Almacen.modo === 'nube' ? '' : `<span class="nota">${ultimoRespaldo() ? `Último respaldo: ${new Date(ultimoRespaldo()).toLocaleDateString('es-CL')}. Cambios desde entonces: ${cambiosSinRespaldo()}.` : 'Todavía no has descargado un respaldo en este equipo.'} ${almacenamientoProtegido === true ? 'El navegador mantendrá los datos de la app aunque necesite espacio.' : almacenamientoProtegido === false ? 'El navegador podría borrar los datos si se queda sin espacio: instalar la app y respaldar seguido ayuda a evitarlo.' : ''}</span>`}
          <div class="fila-botones"><button class="btn" data-accion="respaldo">${ICONO.bajar} Descargar</button><label class="btn" for="a-respaldo">${ICONO.subir} Restaurar</label></div>
          <input type="file" id="a-respaldo" accept=".json" class="oculto-visual" data-archivo="respaldo">
        </section>
        <section class="tarjeta pad"><span class="etiqueta">Nombres de los estudiantes</span>
          <label class="campo" for="a-nombres">¿Cómo vienen escritos en tus listas?<select id="a-nombres" data-cambio="formato-nombre">
            ${[['auto', 'Detectar automáticamente'], ['nombre', 'Nombres y luego apellidos (Josefa Morales Tapia)'], ['apellido', 'Apellidos y luego nombres (Morales Tapia Josefa)']].map(([v, t]) => `<option value="${v}" ${(config().formatoNombre || 'auto') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <span class="nota">Los informes del estudiante y del apoderado siempre se dirigen al estudiante por su nombre y lo escriben como "Nombres Apellidos".</span>
        </section>
        <section class="tarjeta pad"><span class="etiqueta">Plantillas Excel</span>
          <div class="fila-botones"><button class="btn" data-accion="plantilla" data-a="plantilla_ensayo.xlsx">Ensayo</button><button class="btn" data-accion="plantilla" data-a="plantilla_lista_curso.xlsx">Lista de curso</button></div>
        </section>
        <section class="tarjeta pad"><span class="etiqueta">Notas y alertas</span>
          <div class="dos">
            <label class="campo" for="a-exigencia">Exigencia para el 4,0 (%)<input id="a-exigencia" inputmode="decimal" value="${Math.round(Estad.conf.escala.exigencia * 100)}"></label>
            <label class="campo" for="a-aprobacion">Nota de aprobación<input id="a-aprobacion" inputmode="decimal" value="${notaTx(Estad.conf.escala.aprobacion)}"></label>
            <label class="campo" for="a-riesgo">Bajo logro: menos de (%)<input id="a-riesgo" inputmode="decimal" value="${Math.round(Estad.conf.umbrales.riesgo * 100)}"></label>
            <label class="campo" for="a-baja">Baja: pierde (puntos)<input id="a-baja" inputmode="decimal" value="${Math.round(Estad.conf.umbrales.baja * 100)}"></label>
            <label class="campo" for="a-omision">Omisión: más de (%)<input id="a-omision" inputmode="decimal" value="${Math.round(Estad.conf.umbrales.omision * 100)}"></label>
          </div>
          <span class="nota">La nota usa la escala de 1,0 a 7,0. Bajo logro también define quién entra a los grupos de reforzamiento.</span>
          <span class="etiqueta">Niveles de desempeño (no son cortes oficiales)</span>
          <div class="dos">
            <label class="campo" for="a-nv-medio">Medio desde (%)<input id="a-nv-medio" inputmode="decimal" value="${Math.round(Estad.conf.niveles.medio * 100)}"></label>
            <label class="campo" for="a-nv-alto">Alto desde (%)<input id="a-nv-alto" inputmode="decimal" value="${Math.round(Estad.conf.niveles.alto * 100)}"></label>
          </div>
          <span class="etiqueta">Alertas del informe directivo</span>
          <div class="dos">
            <label class="campo" for="a-i-brecha">Curso bajo el promedio por (pp)<input id="a-i-brecha" inputmode="decimal" value="${Math.round(Estad.conf.institucional.brechaCurso * 100)}"></label>
            <label class="campo" for="a-i-eje">Eje bajo (%)<input id="a-i-eje" inputmode="decimal" value="${Math.round(Estad.conf.institucional.ejeBajo * 100)}"></label>
            <label class="campo" for="a-i-part">Participación baja: menos de (%)<input id="a-i-part" inputmode="decimal" value="${Math.round(Estad.conf.institucional.participacion * 100)}"></label>
            <label class="campo" for="a-i-disp">Dispersión alta: desv. desde (pp)<input id="a-i-disp" inputmode="decimal" value="${Math.round(Estad.conf.institucional.dispersion * 100)}"></label>
            <label class="campo" for="a-i-conc">Nivel Bajo: desde (% del curso)<input id="a-i-conc" inputmode="decimal" value="${Math.round(Estad.conf.institucional.concentracionBaja * 100)}"></label>
          </div>
          <button class="btn" data-accion="guardar-ajustes">Guardar</button>
        </section>
        <section class="tarjeta pad"><span class="etiqueta">Datos de ejemplo</span>
          <span style="font-size:14px;color:var(--texto-2)">El ejemplo simple agrega un ensayo PAES M1 de 65 preguntas y un curso de 4 estudiantes, que coinciden con las hojas de ejemplo en PDF. El ejemplo de colegio agrega tres paralelos de II medio con tres ensayos SIMCE de Matemática ya corregidos, para recorrer todos los análisis.</span>
          <div class="fila-botones"><button class="btn" data-accion="ejemplo">Ejemplo simple</button><button class="btn" data-accion="ejemplo-colegio">Ejemplo de colegio</button></div>
          ${Almacen.lista('cursos').some((c) => c.ejemplo) || Almacen.lista('ensayos').some((e) => e.ejemplo) ? '<button class="btn" style="color:var(--mal-texto)" data-accion="borrar-ejemplo">Borrar los datos de ejemplo</button>' : ''}
        </section>
        <span class="nota" id="version-app" style="text-align:center"></span>
      </div>${nav('')}</div>`;
  }

  function capaCorreo() {
    const K = E.correoListo;
    return `<div class="velo"><div class="hoja-inferior capa-correo" role="dialog" aria-label="Enviar por correo">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="font-size:18px">Correo para ${h(K.para)}</h2><button class="btn-redondo" data-accion="cerrar-correo" aria-label="Cerrar">${ICONO.cerrar}</button></div>
      <span class="nota">1. El PDF <b>${h(K.archivo)}</b> ya se descargó.<br>2. Elige cómo abrir tu correo: el destinatario, el asunto y el mensaje van escritos.<br>3. Adjunta el PDF y envía.</span>
      <a class="btn primario grande" href="${h(K.mailto)}" target="_top" data-accion="correo-abierto">✉ Abrir mi aplicación de correo</a>
      <div class="dos"><a class="btn" href="${h(K.gmail)}" target="_blank" rel="noopener" data-accion="correo-abierto">Gmail</a><a class="btn" href="${h(K.outlook)}" target="_blank" rel="noopener" data-accion="correo-abierto">Outlook</a></div>
      <button class="btn" data-accion="copiar-correo">Copiar destinatario, asunto y mensaje</button>
      <span class="nota">Si no se abre nada, usa Gmail u Outlook (se abren en el navegador con tu cuenta) o copia el mensaje y pégalo en un correo nuevo.</span>
    </div></div>`;
  }

  function capas() {
    let html = '';
    if (E.correoListo) html += capaCorreo();
    if (E.elegirInforme) html += capaElegirInformes();
    if (E.confirmar) {
      html += `<div class="velo"><div class="hoja-inferior" role="alertdialog" aria-label="Confirmar">
        <h2 style="font-size:18px">${h(E.confirmar.texto)}</h2>
        <div class="fila-botones"><button class="btn" data-accion="no-confirmar">Cancelar</button><button class="btn primario" data-accion="si-confirmar">${h(E.confirmar.boton || 'Sí, borrar')}</button></div></div></div>`;
    }
    if (E.texto) {
      html += `<div class="velo"><div class="hoja-inferior" role="dialog" aria-label="${h(E.texto.titulo)}">
        <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:18px">${h(E.texto.titulo)}</h2><button class="btn-redondo" data-accion="cerrar-texto" aria-label="Cerrar">${ICONO.cerrar}</button></div>
        <span style="font-size:13px;color:var(--texto-2)">Pégalo en Overleaf o guárdalo como .tex y compílalo dos veces con pdflatex.</span>
        <textarea id="texto-latex" readonly style="width:100%;height:40vh;font:12px/1.4 ui-monospace,monospace;border-radius:10px;border:1px solid var(--borde);padding:10px;background:var(--fondo);color:var(--texto)">${h(E.texto.contenido)}</textarea>
        <div class="fila-botones"><button class="btn" data-accion="copiar-texto">Copiar</button><button class="btn primario" data-accion="bajar-texto">Descargar</button></div></div></div>`;
    }
    return html;
  }

  const PANTALLAS = {
    inicio: pInicio, camara: pCamara, revision: pRevision, curso: pCurso, ensayos: pEnsayos,
    'ensayo': pEnsayo, cursos: pCursos, 'curso-detalle': pCursoDetalle, 'perfil-est': pPerfilEstudiante, 'envio-curso': pEnvioCurso, estadisticas: pEstadisticas,
    informes: pInformes, ajustes: pAjustes, ficha: pFicha, colegio: pColegio,
  };

  // ¿Quién eres? Aparece al abrir la app cuando hay docentes creados y este equipo aún no eligió
  function pElegirPerfil() {
    return `<div class="pantalla"><header class="cabecera"><div class="titulos"><h1>¿Quién eres?</h1><span class="sub">Elige tu nombre para ver tus cursos</span></div></header>
      <div class="cuerpo"><section class="tarjeta pad"><div class="lista-elegir">
        ${docentes().map((d) => `<button class="opcion" data-accion="elegir-perfil" data-a="${h(d.id)}"><span class="principal"><b>${h(d.nombre)}</b><span>${d.todos ? 'Ve todos los cursos del colegio' : `${(d.cursos || []).length} curso${(d.cursos || []).length === 1 ? '' : 's'}: ${h(todosLosCursos().filter((c) => (d.cursos || []).includes(c.id)).map((c) => c.nombre).join(', ') || 'todavía sin cursos')}`}</span></span></button>`).join('')}
      </div><span class="nota">La app recordará tu elección en este equipo. Puedes cambiarla desde Inicio o Ajustes. Los perfiles se crean en Ajustes › Docentes.</span></section></div></div>`;
  }

  function render() {
    const y = window.scrollY;
    ocultarTipSeguro();
    Estad.configurar(config());
    const pantalla = docentes().length && !perfilActivo() ? pElegirPerfil : (PANTALLAS[E.pantalla] || pInicio);
    raiz.innerHTML = '<div class="app">' + pantalla() + '</div>' + capas();
    if (E.pantalla === 'revision' && E.hojaPregunta != null) dibujarRecorte();
    if (E.pantalla === 'camara' && E.camara.stream) conectarVideo();
    window.scrollTo(0, E.mantenerScroll ? y : 0);
    E.mantenerScroll = false;
  }

  function ocultarTipSeguro() { const t = document.querySelector('.tip'); if (t) t.hidden = true; }

  function dibujarRecorte() {
    const c = document.getElementById('recorte');
    const rev = E.revision;
    if (!c || !rev.hoja) return;
    const img = Lector.recortePregunta(rev.hoja, E.hojaPregunta + 1, rev.ensayo.alternativas);
    c.width = img.width; c.height = img.height;
    c.getContext('2d').putImageData(img, 0, 0);
  }

  async function ir(pantalla) {
    if (pantalla !== 'camara') apagarCamara();
    if (pantalla === 'ensayo-nuevo') {
      E.ensayoEditado = { id: '', nombre: '', tipo: 'PAES', asignatura: '', nivel: '', fecha: '', alternativas: 4, preguntas: [] };
      pantalla = 'ensayo';
    }
    E.pantalla = pantalla;
    E.hojaPregunta = null;
    if (pantalla === 'camara') {
      if (!ensayoActivo() || !cursoActivo()) { toast(hayDatos() ? 'Primero elige el ensayo y el curso.' : 'Primero crea un ensayo y carga un curso.'); E.pantalla = hayDatos() ? 'inicio' : 'ensayos'; render(); return; }
      render();
      await encenderCamara();
    }
    render();
  }

  // ---------- Cámara ----------
  async function encenderCamara() {
    if (E.camara.stream || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    try {
      E.camara.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 2560 }, height: { ideal: 1440 } }, audio: false });
      E.camara.aciertos = 0;
    } catch (e) { E.camara.stream = null; }
  }

  function apagarCamara() {
    clearInterval(E.camara.timer); E.camara.timer = null;
    if (E.camara.stream) E.camara.stream.getTracks().forEach((t) => t.stop());
    E.camara.stream = null;
  }

  function conectarVideo() {
    const v = document.getElementById('video');
    if (!v) return;
    v.srcObject = E.camara.stream;
    v.play().catch(() => {});
    clearInterval(E.camara.timer);
    const cuadro = document.createElement('canvas');
    E.camara.timer = setInterval(() => {
      if (E.procesando || !v.videoWidth || E.pantalla !== 'camara') return;
      const escala = 640 / Math.max(v.videoWidth, v.videoHeight);
      cuadro.width = Math.round(v.videoWidth * escala); cuadro.height = Math.round(v.videoHeight * escala);
      const ctx = cuadro.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(v, 0, 0, cuadro.width, cuadro.height);
      const pts = Lector.detectar(ctx.getImageData(0, 0, cuadro.width, cuadro.height));
      dibujarGuia(v, pts, escala);
      const estado = document.getElementById('estado-camara');
      if (pts) {
        E.camara.aciertos++;
        if (estado) estado.textContent = E.camara.auto ? 'Hoja detectada · mantén el celular quieto' : 'Hoja detectada · toca el botón para capturar';
        if (E.camara.auto && E.camara.aciertos >= 3) { E.camara.aciertos = 0; capturarVideo(); }
      } else {
        E.camara.aciertos = 0;
        if (estado) estado.textContent = 'Buscando las 4 marcas negras de las esquinas…';
      }
    }, 450);
  }

  function dibujarGuia(v, pts, escala) {
    const o = document.getElementById('overlay');
    if (!o) return;
    const r = o.getBoundingClientRect();
    o.width = r.width; o.height = r.height;
    const ctx = o.getContext('2d');
    ctx.clearRect(0, 0, o.width, o.height);
    if (!pts) return;
    // object-fit: cover -> misma transformación que el video
    const s = Math.max(r.width / v.videoWidth, r.height / v.videoHeight);
    const dx = (r.width - v.videoWidth * s) / 2, dy = (r.height - v.videoHeight * s) / 2;
    ctx.strokeStyle = '#2BB673'; ctx.lineWidth = 4; ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const px = (x / escala) * s + dx, py = (y / escala) * s + dy;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.closePath(); ctx.stroke();
  }

  function capturarVideo() {
    const v = document.getElementById('video');
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0);
    leerImagen(ctx.getImageData(0, 0, c.width, c.height));
  }

  async function leerArchivos(archivos) {
    E.cola = Array.from(archivos);
    siguienteDeCola();
  }

  // Lectura del nombre escrito en la hoja (si falla el QR), con Tesseract.js. Se carga solo cuando hace falta.
  const OCR = (() => {
    const LOCAL = 'lib/ocr/';
    const CDN = {
      js: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
      worker: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
      core: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
      lang: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/spa@1.0.0/4.0.0_best_int',
    };
    const script = (url) => new Promise((ok, mal) => {
      const sc = document.createElement('script'); sc.src = url;
      sc.onload = () => (window.Tesseract ? ok() : mal(new Error('sin Tesseract')));
      sc.onerror = () => { sc.remove(); mal(new Error('no cargó ' + url)); };
      document.head.appendChild(sc);
    });
    let trabajador = null;
    function iniciar() {
      if (trabajador) return trabajador;
      trabajador = (async () => {
        let local = true;
        if (!window.Tesseract) { try { await script(LOCAL + 'tesseract.min.js'); } catch (e) { local = false; await script(CDN.js); } }
        const abs = (u) => new URL(u, location.href).href;
        const rutas = local ? { workerPath: abs(LOCAL + 'worker.min.js'), corePath: abs(LOCAL), langPath: abs(LOCAL) }
          : { workerPath: CDN.worker, corePath: CDN.core, langPath: CDN.lang };
        const w = await window.Tesseract.createWorker('spa', 1, { ...rutas, gzip: true });
        await w.setParameters({ tessedit_pageseg_mode: '7' });
        return w;
      })().catch((e) => { trabajador = null; throw e; });
      return trabajador;
    }
    async function leer(imageData) {
      const w = await iniciar();
      const c = document.createElement('canvas'); c.width = imageData.width; c.height = imageData.height;
      c.getContext('2d').putImageData(imageData, 0, 0);
      const { data } = await w.recognize(c);
      return (data.text || '').replace(/\s+/g, ' ').trim();
    }
    return { leer, iniciar };
  })();

  const sinTildes = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]+/g, ' ').trim();
  function parecido(a, b) {
    if (a === b) return 1;
    const m = a.length, n = b.length; if (!m || !n) return 0;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return 1 - prev[n] / Math.max(m, n);
  }
  // Busca al estudiante cuyo nombre se parece más al texto leído. Devuelve null si no hay uno claro.
  function emparejarNombre(texto, candidatos) {
    const leidas = sinTildes(texto).split(' ').filter((w) => w.length >= 3);
    if (!leidas.length) return null;
    const puntajes = candidatos.map((c) => {
      const propias = sinTildes(c.estudiante.nombre).split(' ').filter((w) => w.length >= 2);
      const pares = [];
      leidas.forEach((l, i) => propias.forEach((p, j) => pares.push([parecido(l, p), i, j])));
      pares.sort((a, b) => b[0] - a[0]);
      const usadaL = new Set(), usadaP = new Set(), mejores = [];
      for (const [v, i, j] of pares) { if (usadaL.has(i) || usadaP.has(j)) continue; usadaL.add(i); usadaP.add(j); mejores.push(v); }
      const k = Math.min(3, leidas.length, propias.length);
      const top = mejores.slice(0, k);
      return { ...c, puntaje: top.reduce((a, b) => a + b, 0) / Math.max(1, k), palabras: k };
    }).sort((a, b) => b.puntaje - a.puntaje);
    const [mejor, segundo] = puntajes;
    if (!mejor || mejor.puntaje < 0.72) return null;
    if (segundo && mejor.puntaje - segundo.puntaje < 0.12) {
      return { dudosos: puntajes.filter((c) => c.puntaje >= mejor.puntaje - 0.12).slice(0, 3) };
    }
    return mejor;
  }
  async function identificarPorNombre(rev) {
    rev.leyendoNombre = true;
    let texto = '';
    try { texto = await OCR.leer(Lector.recorteNombre(rev.hoja)); } catch (e) { console.warn('No pude leer el nombre', e); }
    rev.leyendoNombre = false;
    rev.nombreLeido = texto;
    const delCurso = (c) => (c ? c.estudiantes.map((e) => ({ curso: c, estudiante: e })) : []);
    let m = texto ? emparejarNombre(texto, delCurso(rev.curso || cursoActivo())) : null;
    if (!m && texto) m = emparejarNombre(texto, cursos().flatMap(delCurso));
    if (m && m.dudosos) {
      if (!rev.estudiante) {
        rev.candidatosNombre = m.dudosos;
        rev.motivoSinEstudiante = `No pude leer el QR. En el nombre leí "${texto}". ¿Es alguno de estos estudiantes?`;
      }
    } else if (m) {
      if (!rev.estudiante) {
        rev.curso = m.curso; rev.estudiante = m.estudiante; rev.origen = 'nombre';
        rev.yaExistia = !!hojasDe(rev.ensayo, m.curso)[m.estudiante.id];
      } else if (rev.origen === 'lista' && rev.estudiante.id !== m.estudiante.id) {
        rev.sugerido = m;
      }
    } else if (!rev.estudiante && texto) {
      rev.motivoSinEstudiante = `No pude leer el QR. En el nombre leí "${texto}", pero no sé con seguridad de quién es. Elige al estudiante.`;
    }
    if (E.revision === rev && E.pantalla === 'revision') { E.mantenerScroll = true; render(); }
  }

  // Fotos HEIC/HEIF (iPhone): si el navegador no las abre, se convierten a JPEG con heic2any
  const esHeic = (f) => /image\/hei[cf]/i.test(f.type || '') || /\.hei[cf]$/i.test(f.name || '');
  let cargaHeic = null;
  function cargarHeic2any() {
    if (window.heic2any) return Promise.resolve(window.heic2any);
    if (cargaHeic) return cargaHeic;
    const fuentes = ['lib/heic2any.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js', 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'];
    cargaHeic = fuentes.reduce((prev, url) => prev.catch(() => new Promise((ok, mal) => {
      const sc = document.createElement('script'); sc.src = url;
      sc.onload = () => (window.heic2any ? ok(window.heic2any) : mal(new Error('sin heic2any')));
      sc.onerror = () => { sc.remove(); mal(new Error('no cargó ' + url)); };
      document.head.appendChild(sc);
    })), Promise.reject(new Error('inicio'))).catch((e) => { cargaHeic = null; throw e; });
    return cargaHeic;
  }
  async function abrirFoto(archivo) {
    const heic = esHeic(archivo);
    if (!heic) return createImageBitmap(archivo, { imageOrientation: 'from-image' });
    try { return await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch (e) { /* el navegador no lee HEIC: convertir */ }
    toast('Convirtiendo foto HEIC…');
    const conv = await cargarHeic2any();
    let jpg = await conv({ blob: archivo, toType: 'image/jpeg', quality: 0.92 });
    if (Array.isArray(jpg)) jpg = jpg[0];
    return createImageBitmap(jpg, { imageOrientation: 'from-image' });
  }

  async function siguienteDeCola() {
    const archivo = E.cola.shift();
    if (!archivo) return;
    E.procesando = true; render();
    try {
      const bmp = await abrirFoto(archivo);
      const esc = Math.min(1, 3200 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * esc); c.height = Math.round(bmp.height * esc);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      leerImagen(ctx.getImageData(0, 0, c.width, c.height));
    } catch (e) {
      E.procesando = false; render();
      toast('No pude abrir la foto ' + (archivo.name || '') + '. Prueba con otra.');
      siguienteDeCola();
    }
  }

  function leerImagen(imageData) {
    E.procesando = true; render();
    setTimeout(() => {
      const activo = ensayoActivo();
      let r;
      try {
        const set = ensayosEnCorreccion();
        r = Lector.procesar(imageData, { preguntas: Math.max(...set.map((e) => e.preguntas.length)), alternativas: Math.max(...set.map((e) => e.alternativas)) });
      } catch (e) { r = { ok: false, error: 'Ocurrió un error al leer la hoja: ' + e.message }; }
      E.procesando = false;
      if (!r.ok) {
        toast(r.error);
        render();
        if (E.cola.length) siguienteDeCola();
        return;
      }
      prepararRevision(r);
    }, 30);
  }

  function prepararRevision(r) {
    let ensayo = (r.qr && r.qr.ensayo && Almacen.obtener('ensayos', Almacen.id(r.qr.ensayo))) || ensayoActivo();
    let curso = null, estudiante = null, origen = 'manual', motivo = '';
    let error = '';
    if (r.qr && r.qr.ensayo && Almacen.id(r.qr.ensayo) !== ensayo.id) {
      error = `La hoja es del ensayo "${r.qr.ensayo}", que no está guardado. La corrijo con ${ensayo.nombre}.`;
    }
    if (r.qr && r.qr.estudiante) {
      const enc = buscarEstudiante(r.qr.estudiante);
      if (enc) { curso = enc.curso; estudiante = enc.estudiante; origen = 'qr'; }
      else motivo = `El QR dice "${r.qr.estudiante}", pero ese código no está en tus cursos.`;
    } else if (r.numeroLista && r.numeroLista.numero) {
      curso = cursoActivo();
      estudiante = curso && curso.estudiantes.find((e) => e.lista === r.numeroLista.numero);
      if (estudiante) origen = 'lista';
      else motivo = `Leí el N° de lista ${r.numeroLista.numero}, pero no está en ${curso ? curso.nombre : 'el curso'}.`;
    } else if (!r.qr) {
      motivo = 'No pude leer el código QR. Elige al estudiante.';
    }
    if (!curso) curso = cursoActivo();
    const n = ensayo.preguntas.length;
    if (r.respuestas.length < n) error = (error ? error + ' ' : '') + `La hoja tiene ${r.respuestas.length} preguntas y el ensayo ${n}.`;
    const respuestas = [], estados = [];
    for (let i = 0; i < n; i++) {
      const x = r.respuestas[i] || { letra: '', estado: 'blanco' };
      respuestas.push(x.estado === 'doble' ? '' : x.letra);
      estados.push(x.estado);
    }
    const ensayoQR = !!(r.qr && r.qr.ensayo && Almacen.id(r.qr.ensayo) === ensayo.id);
    E.revision = {
      ensayo, curso, estudiante, origen, motivoSinEstudiante: motivo, error, ensayoQR,
      respuestas, estados, lectura: r.respuestas, hoja: r.hoja, cambios: 0,
      yaExistia: !!(estudiante && hojasDe(ensayo, curso)[estudiante.id]),
    };
    E.pantalla = 'revision';
    if (origen !== 'qr' && r.hoja && cursos().some((c) => c.estudiantes.length)) identificarPorNombre(E.revision);
    render();
  }

  function abrirGuardada(idEst) {
    const ens = ensayoActivo(), cur = cursoActivo();
    const hoja = hojasDe(ens, cur)[idEst];
    const est = cur.estudiantes.find((e) => e.id === idEst);
    if (!hoja || !est) return;
    E.revision = {
      ensayo: ens, curso: cur, estudiante: est, origen: 'guardada', error: '',
      respuestas: ens.preguntas.map((_, i) => hoja.respuestas[i] || ''), estados: ens.preguntas.map(() => 'ok'),
      lectura: null, hoja: null, cambios: 0, yaExistia: false,
    };
    E.pantalla = 'revision';
    render();
  }

  async function guardarRevision() {
    const rev = E.revision;
    const id = idResultados(rev.ensayo.id, rev.curso.id);
    const doc = Almacen.obtener('resultados', id) || { ensayo: rev.ensayo.id, curso: rev.curso.id, hojas: {} };
    const { correctas, n } = Estad.contar(rev.ensayo, rev.respuestas);
    doc.hojas = { ...doc.hojas, [rev.estudiante.id]: {
      respuestas: rev.respuestas, correctas, fecha: new Date().toISOString(),
      origen: rev.origen === 'guardada' ? (doc.hojas[rev.estudiante.id] || {}).origen || 'qr' : rev.origen,
      cambiosManuales: rev.cambios + ((doc.hojas[rev.estudiante.id] || {}).cambiosManuales || 0) * (rev.origen === 'guardada' ? 1 : 0),
    } };
    try { await Almacen.guardar('resultados', id, doc); } catch (e) { toast(e.message); return; }
    // Al corregir varios ensayos a la vez, guardar una hoja de otro de ellos no cambia el ensayo elegido
    const enSet = ensayosEnCorreccion().some((e) => e.id === rev.ensayo.id);
    if (rev.curso.id !== config().curso || (!enSet && rev.ensayo.id !== config().ensayo)) await fijarConfig({ curso: rev.curso.id, ...(enSet ? {} : { ensayo: rev.ensayo.id }) });
    toast(`Guardado: ${corto(rev.estudiante.nombre)}, ${correctas} de ${n}`);
    const venia = rev.origen;
    E.revision = null;
    if (venia === 'guardada') { E.pantalla = 'curso'; render(); return; }
    if (E.cola.length) { E.pantalla = 'camara'; render(); siguienteDeCola(); return; }
    await ir('camara');
  }

  // ---------- Ensayos y cursos ----------
  function leerFormularioEnsayo() {
    const e = E.ensayoEditado;
    const selTabla = document.getElementById('e-tabla-id');
    const tablaId = selTabla ? selTabla.value : 'propia';
    let pilotos = null;
    document.querySelectorAll('[data-campo]').forEach((el) => {
      const k = el.dataset.campo;
      if (k === 'alternativas') e.alternativas = parseInt(el.value, 10);
      else if (k === 'tablaId') {
        if (Estad.TABLAS_PAES[el.value]) e.tablaPaes = Estad.TABLAS_PAES[el.value].puntajes.slice();
        else if (el.value === '') delete e.tablaPaes;
      } else if (k === 'pilotos') {
        pilotos = new Set(el.value.split(/[^0-9]+/).map((x) => parseInt(x, 10)).filter((x) => x > 0));
      } else if (k === 'tablaPaes') {
        if (tablaId !== 'propia') return;
        const nums = el.value.split(/[\s,;]+/).map((x) => parseFloat(x)).filter((x) => !isNaN(x));
        if (nums.length) e.tablaPaes = nums.map(Math.round); else delete e.tablaPaes;
      } else if (k.includes('.')) {
        // cortes.elemental, referencia.colegio…: los % se guardan como fracción; los puntajes PAES tal cual
        const [obj, campo] = k.split('.');
        const v = parseFloat(el.value.replace(',', '.'));
        e[obj] = { ...(e[obj] || {}) };
        const comoPuntaje = obj === 'referencia' && e.tipo === 'PAES';
        if (isNaN(v)) delete e[obj][campo]; else e[obj][campo] = comoPuntaje ? v : v / 100;
        if (!Object.keys(e[obj]).length) delete e[obj];
      } else if (k === 'clave') {
        const letras = el.value.toUpperCase().replace(/[^A-E]/g, '');
        if (letras !== e.preguntas.map((p) => p.clave).join('')) {
          e.preguntas = letras.split('').map((l, i) => ({ n: i + 1, clave: l, eje: (e.preguntas[i] || {}).eje || '', habilidad: (e.preguntas[i] || {}).habilidad || '', contenido: (e.preguntas[i] || {}).contenido || '', ...((e.preguntas[i] || {}).piloto ? { piloto: true } : {}) }));
        }
      } else e[k] = el.value.trim();
    });
    if (pilotos) e.preguntas = e.preguntas.map(({ piloto, ...p }) => (pilotos.has(p.n) ? { ...p, piloto: true } : p));
  }

  async function guardarEnsayo() {
    leerFormularioEnsayo();
    const e = E.ensayoEditado;
    if (!e.nombre) { toast('Ponle nombre al ensayo.'); return; }
    if (!e.preguntas.length) { toast('Falta la clave: carga la plantilla Excel o escribe las letras.'); return; }
    if (e.preguntas.length > Diseno.RESP.max) { toast(`La hoja admite hasta ${Diseno.RESP.max} preguntas.`); return; }
    if (e.tipo === 'PAES' && !(e.tablaPaes && e.tablaPaes.length)) {
      const id = Estad.tablaParaAsignatura(e.asignatura);
      if (id) e.tablaPaes = Estad.TABLAS_PAES[id].puntajes.slice();
    }
    if (e.tipo !== 'PAES') delete e.tablaPaes;
    if (e.tipo !== 'SIMCE') delete e.cortes;
    if (e.cortes && (e.cortes.elemental == null) !== (e.cortes.adecuado == null)) { toast('Completa los dos cortes de estándar, o deja ambos vacíos.'); return; }
    if (e.cortes && e.cortes.elemental != null && !(e.cortes.elemental > 0 && e.cortes.elemental < e.cortes.adecuado && e.cortes.adecuado <= 1)) { toast('El corte de Elemental debe ser menor que el de Adecuado, ambos entre 1 y 100.'); return; }
    const malas = e.preguntas.filter((p) => 'ABCDE'.indexOf(p.clave) >= e.alternativas);
    if (malas.length) { toast(`La pregunta ${malas[0].n} tiene clave ${malas[0].clave}, pero el ensayo usa ${e.alternativas} alternativas.`); return; }
    if (!e.id) {
      let base = Almacen.id(e.nombre).slice(0, 40), id = base, k = 2;
      while (Almacen.obtener('ensayos', id)) id = base + '-' + k++;
      e.id = id;
    } else e.id = Almacen.id(e.id);
    e.creado = e.creado || new Date().toISOString();
    try { await Almacen.guardar('ensayos', e.id, e); } catch (err) { toast(err.message); return; }
    await fijarConfig({ ensayo: e.id });
    toast('Ensayo guardado');
    ir('ensayos');
  }

  async function guardarCursosDesdeLista(estudiantes, nombreArchivo) {
    const grupos = {};
    estudiantes.forEach((e) => {
      const nombre = e.curso || nombreArchivo.replace(/\.[^.]+$/, '');
      (grupos[nombre] = grupos[nombre] || []).push(e);
    });
    let ultimo = null, conservados = 0;
    for (const [nombre, lista] of Object.entries(grupos)) {
      // Si ya hay un curso con ese nombre (aunque su código sea otro), se actualiza ese mismo curso
      const mismo = cursos().find((c2) => Almacen.id(c2.nombre) === Almacen.id(nombre));
      const id = mismo ? mismo.id : Almacen.id(nombre);
      const previo = Almacen.obtener('cursos', id);
      const curso = { ...(previo || {}), id, nombre: previo ? previo.nombre : nombre, estudiantes: [] };
      const antes = new Map(((previo && previo.estudiantes) || []).map((e) => [e.id, e]));
      curso.estudiantes = lista.map((e) => ({ lista: e.lista, nombre: e.nombre, rut: e.rut }));
      const norm = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
      const previos = [...antes.values()], tomados = new Set();
      const nombresNuevos = new Set(lista.map((e) => norm(e.nombre)));
      // Reconoce a cada estudiante que ya existía para conservar su código y así sus hojas corregidas.
      // Orden: RUT, luego nombre y, solo si nada de eso calza, el mismo N° de lista (si ese estudiante no aparece con su nombre en la planilla).
      const buscar = (e) => {
        const libre = (x) => x && !tomados.has(x.id);
        return previos.find((x) => libre(x) && e.rut && x.rut && Almacen.id(x.rut) === Almacen.id(e.rut))
          || previos.find((x) => libre(x) && norm(x.nombre) === norm(e.nombre))
          || [antes.get(idEstudiante(curso, e))].find((x) => libre(x) && !nombresNuevos.has(norm(x.nombre)));
      };
      const usados = new Set(cursos().filter((c2) => c2.id !== id).flatMap((c2) => c2.estudiantes.map((y) => y.id)));
      curso.estudiantes.forEach((e, k) => {
        const ya = buscar(e);
        if (ya) e.id = ya.id;
        else { let nid = idEstudiante(curso, e), j = 2; while (usados.has(nid) || tomados.has(nid) || antes.has(nid)) nid = idEstudiante(curso, e) + '-' + j++; e.id = nid; }
        tomados.add(e.id);
        // Los correos de la planilla mandan; si vienen vacíos se conservan los que ya estaban guardados
        const a = (ya || {});
        const correo = lista[k].correo || a.correo, correoApoderado = lista[k].correoApoderado || a.correoApoderado;
        if (correo) e.correo = correo;
        if (correoApoderado) e.correoApoderado = correoApoderado;
      });
      // Quien ya tenía hojas corregidas y no viene en la planilla se mantiene, para no perder sus resultados
      const conHojas = new Set(Almacen.lista('resultados').filter((r) => r.curso === id).flatMap((r) => Object.keys(r.hojas || {})));
      const mantenidos = previos.filter((x) => !tomados.has(x.id) && conHojas.has(x.id));
      curso.estudiantes.push(...mantenidos);
      conservados += mantenidos.length;
      await Almacen.guardar('cursos', id, curso);
      ultimo = id;
    }
    if (!config().curso && ultimo) await fijarConfig({ curso: ultimo });
    const n = Object.keys(grupos).length;
    const malos = estudiantes.correosInvalidos ? `. ${estudiantes.correosInvalidos} correo${estudiantes.correosInvalidos === 1 ? ' no es válido y quedó' : 's no son válidos y quedaron'} en blanco` : '';
    const extra = conservados ? `. ${conservados === 1 ? 'Mantuve a 1 estudiante que no venía en la planilla porque tiene' : `Mantuve a ${conservados} estudiantes que no venían en la planilla porque tienen`} hojas corregidas` : '';
    toast((n === 1 ? `Curso ${Object.keys(grupos)[0]} cargado con ${estudiantes.length} estudiantes` : `${n} cursos cargados`) + malos + extra);
  }

  async function generarHojas(ensayo, curso, formato) {
    if (!ensayo.id) { toast('Guarda el ensayo antes de generar las hojas.'); return; }
    const nombre = `hojas_${Almacen.id(curso.nombre)}_${Almacen.id(ensayo.nombre).slice(0, 30)}`;
    if (formato === 'pdf') {
      toast('Generando PDF…');
      await descargar(nombre + '.pdf', Hojas.pdf(ensayo, curso, curso.estudiantes, 3));
    } else {
      E.texto = { titulo: 'Hojas en LaTeX', contenido: Hojas.latex(ensayo, curso, curso.estudiantes, 3), archivo: nombre };
      render();
    }
  }

  // ---------- Acciones ----------
  const ACCIONES = {
    ir: (a) => ir(a),
    ejemplo: async () => { await cargarEjemplo(); ir('inicio'); },
    'ver-hoja': (a) => abrirGuardada(a),
    filtro: (a) => { E.filtro = a; E.mantenerScroll = true; render(); },
    'tab-est': (a) => { E.tabEst = a; render(); },
    'ir-tab': (a) => { E.tabEst = a; ir('estadisticas'); },
    'nivel-grupo': (a) => { E.nivelGrupo = a; E.mantenerScroll = true; render(); },
    'grupo-por': (a) => { E.grupoPor = a; E.mantenerScroll = true; render(); },
    'abrir-tablero': async (a) => {
      const f = tablero()[parseInt(a, 10)];
      if (!f) return;
      await fijarConfig({ ensayo: f.ultimo.ensayo.id, curso: f.curso.id });
      E.tabEst = 'nivel'; ir('estadisticas');
    },
    'excel-nivel': async () => {
      const ens = ensayoActivo(), cur = cursoActivo(), nv = nombreNivel(cur);
      const HN = Estad.historialNivel(ensayos(), paralelosDe(cur), (e, c) => hojasDe(e, c), Estad.grupoEnsayo(ens), nv);
      await descargar(`nivel_${Almacen.id(nv)}_${Almacen.id(ens.nombre).slice(0, 30)}.xlsx`, Excel.exportarNivel(ens, analisisNivel(ens, cur), nv, paralelosDe(cur), HN));
    },
    'excel-colegio': async () => { await descargar(`tablero_colegio_${new Date().toISOString().slice(0, 10)}.xlsx`, Excel.exportarTablero(tablero())); },
    'guardar-nivel': async () => {
      const c = Almacen.obtener('cursos', E.cursoAbierto);
      const nivel = document.getElementById('cd-nivel').value.trim(), letra = document.getElementById('cd-letra').value.trim().toUpperCase();
      try { await Almacen.guardar('cursos', c.id, { ...c, nivel, letra }); } catch (e) { toast(e.message); return; }
      toast(nivel ? `${c.nombre}: ${nivel}${letra ? ' ' + letra : ''}` : 'Nivel borrado'); E.mantenerScroll = true; render();
    },
    'guardar-colegio': async () => {
      const v = (id) => document.getElementById(id).value.trim();
      const ml = parseFloat(v('a-meta-logro').replace(',', '.')), mp = parseInt(v('a-meta-puntaje'), 10);
      if (v('a-meta-logro') && !(ml > 0 && ml <= 100)) { toast('La meta de logro va entre 1 y 100.'); return; }
      if (v('a-meta-puntaje') && !(mp >= 100 && mp <= 1000)) { toast('La meta de puntaje va entre 100 y 1000.'); return; }
      await fijarConfig({ colegio: { ...(config().colegio || {}), nombre: v('a-colegio'), responsable: v('a-responsable'), metaLogro: v('a-meta-logro') ? ml / 100 : null, metaPuntaje: v('a-meta-puntaje') ? mp : null } });
      toast('Datos del colegio guardados'); E.mantenerScroll = true; render();
    },
    'quitar-logo': async () => { const c = { ...(config().colegio || {}) }; delete c.logo; await fijarConfig({ colegio: c }); E.mantenerScroll = true; render(); },
    'guardar-ajustes': async () => {
      const num = (id) => parseFloat(document.getElementById(id).value.replace(',', '.'));
      const exigencia = num('a-exigencia') / 100, aprobacion = num('a-aprobacion');
      const riesgo = num('a-riesgo') / 100, baja = num('a-baja') / 100, omision = num('a-omision') / 100;
      if (!(exigencia > 0 && exigencia < 1) || !(aprobacion > 1 && aprobacion < 7)) { toast('Revisa la exigencia (entre 1 y 99%) y la nota de aprobación (entre 1,0 y 7,0).'); return; }
      if (![riesgo, baja, omision].every((v) => v >= 0 && v <= 1)) { toast('Los umbrales de alerta van entre 0 y 100.'); return; }
      const medio = num('a-nv-medio') / 100, alto = num('a-nv-alto') / 100;
      if (!(medio > 0 && alto > medio && alto < 1)) { toast('Revisa los niveles: Medio debe ser menor que Alto, ambos entre 1 y 99%.'); return; }
      const inst = { brechaCurso: num('a-i-brecha') / 100, ejeBajo: num('a-i-eje') / 100, participacion: num('a-i-part') / 100, dispersion: num('a-i-disp') / 100, concentracionBaja: num('a-i-conc') / 100 };
      if (!Object.values(inst).every((v) => v >= 0 && v <= 1)) { toast('Las alertas del informe directivo van entre 0 y 100.'); return; }
      await fijarConfig({ escala: { ...Estad.conf.escala, exigencia, aprobacion }, umbrales: { riesgo, baja, omision }, niveles: { medio, alto }, institucional: inst });
      toast('Ajustes guardados'); E.mantenerScroll = true; render();
    },
    'ejemplo-colegio': async () => { toast('Creando el ejemplo…'); await Ejemplo.colegio(); await fijarConfig({ ensayo: Ejemplo.ULTIMO_ENSAYO, curso: Ejemplo.CURSO_INICIAL }); toast('Listo: II medio A, B y C con tres ensayos corregidos'); E.tabEst = 'nivel'; ir('estadisticas'); },
    'borrar-ejemplo': () => {
      E.confirmar = { texto: '¿Borrar todos los ensayos, cursos y resultados de ejemplo? Tus datos no se tocan.', accion: async () => {
        const ens = Almacen.lista('ensayos').filter((e) => e.ejemplo).map((e) => e.id);
        const cur = Almacen.lista('cursos').filter((c) => c.ejemplo).map((c) => c.id);
        for (const r of Almacen.lista('resultados').filter((x) => ens.includes(x.ensayo) || cur.includes(x.curso))) await Almacen.borrar('resultados', idResultados(r.ensayo, r.curso));
        for (const id of ens) await Almacen.borrar('ensayos', id);
        for (const id of cur) await Almacen.borrar('cursos', id);
        const c = config();
        if (ens.includes(c.ensayo) || cur.includes(c.curso)) await fijarConfig({ ensayo: null, curso: null });
        toast('Datos de ejemplo borrados'); ir('ajustes');
      } };
      render();
    },
    'orden-preg': (a) => { E.ordenPreg = a; E.mantenerScroll = true; render(); },
    ficha: (a) => { E.estAbierto = a; E.pantalla = 'ficha'; render(); },
    auto: () => { E.camara.auto = !E.camara.auto; const b = document.querySelector('.interruptor'); if (b) b.setAttribute('aria-checked', E.camara.auto); },
    capturar: () => capturarVideo(),
    repetir: () => { E.revision = null; ir('camara'); },
    'omitir-hoja': async () => {
      const rev = E.revision; if (!rev) return;
      toast(`Dejé la hoja que ya estaba guardada${rev.estudiante ? ' de ' + Estad.nombres(rev.estudiante.nombre).pila : ''}`);
      E.revision = null;
      if (E.cola.length) { E.pantalla = 'camara'; render(); siguienteDeCola(); return; }
      await ir('camara');
    },
    'elegir-candidato': (a) => {
      const rev = E.revision, c = rev && (rev.candidatosNombre || [])[Number(a)]; if (!c) return;
      rev.curso = c.curso; rev.estudiante = c.estudiante; rev.origen = 'nombre'; rev.candidatosNombre = null;
      rev.yaExistia = !!hojasDe(rev.ensayo, rev.curso)[rev.estudiante.id];
      E.mantenerScroll = true; render();
    },
    'usar-nombre': () => {
      const rev = E.revision; if (!rev || !rev.sugerido) return;
      rev.curso = rev.sugerido.curso; rev.estudiante = rev.sugerido.estudiante; rev.origen = 'nombre'; rev.sugerido = null;
      rev.yaExistia = !!hojasDe(rev.ensayo, rev.curso)[rev.estudiante.id];
      E.mantenerScroll = true; render();
    },
    pregunta: (a) => { E.hojaPregunta = parseInt(a, 10); E.mantenerScroll = true; render(); },
    'cerrar-hoja': (a, ev) => { if (ev.target.closest('[data-dentro]') && !ev.target.closest('.btn-redondo')) return; E.hojaPregunta = null; E.mantenerScroll = true; render(); },
    elegir: (a) => {
      const rev = E.revision, i = E.hojaPregunta;
      if (rev.respuestas[i] !== a || rev.estados[i] !== 'ok') rev.cambios++;
      rev.respuestas[i] = a; rev.estados[i] = a ? 'ok' : 'blanco';
      E.hojaPregunta = null; E.mantenerScroll = true; render();
    },
    guardar: () => guardarRevision(),
    instalar: async () => { if (!pedidoInstalar) return; pedidoInstalar.prompt(); await pedidoInstalar.userChoice; pedidoInstalar = null; render(); },
    'ocultar-instalar': () => { E.ocultarInstalar = true; render(); },
    'informe-curso': () => elegirEnsayos('curso'),
    'informe-estudiantes': () => elegirEnsayos('estudiantes'),
    'informe-estudiante': () => elegirEnsayos('estudiantes', [E.estAbierto]),
    'marcar-perfil': (a) => {
      const S = E.fichaSel, suyos = ensayosDelEstudiante(S.id, cursoActivo()).map((o) => o.e);
      if (a === 'todos') S.marcados = suyos.map((e) => e.id);
      else if (a === 'ninguno') S.marcados = [];
      else if (a === 'asig') S.marcados = suyos.filter((e) => Estad.grupoEnsayo(e) === Estad.grupoEnsayo(ensayoActivo())).map((e) => e.id);
      else S.marcados = S.marcados.includes(a) ? S.marcados.filter((x) => x !== a) : [...S.marcados, a];
      E.mantenerScroll = true; render();
    },
    'modo-perfil': (a) => { E.fichaSel.modo = a; E.mantenerScroll = true; render(); },
    'informe-perfil': () => descargarInformeEstudiante(),
    'enviar-perfil': () => enviarInformeEstudiante(),
    'guardar-contacto': (a) => guardarContacto(a),
    'inf-asig': (a) => { const S = estadoInformes(); S.asig = a; S.ens = null; S.ensayosEst = null; S.ensDir = null; S.cursosDir = null; E.mantenerScroll = true; render(); },
    'inf-ens': (a) => { estadoInformes().ens = a; E.mantenerScroll = true; render(); },
    'inf-dir-ens': (a) => {
      const S = estadoInformes(), { delGrupo } = datosInformes(), act = seleccionDirectiva(S, delGrupo).ensSel.map((e) => e.id);
      const nuevo = act.includes(a) ? act.filter((x) => x !== a) : [...act, a];
      S.ensDir = nuevo.length ? nuevo : [a]; E.mantenerScroll = true; render();
    },
    'inf-dir-ens-todos': (a) => {
      const S = estadoInformes(), { delGrupo } = datosInformes();
      S.ensDir = a === 'todos' ? null : [delGrupo[0].id]; S.cursosDir = null; E.mantenerScroll = true; render();
    },
    'inf-ens-curso': (a) => {
      const S = estadoInformes(), { ens } = datosInformes(), act = cursosDelEnsayo(S, ens).sel.map((c) => c.id);
      const nuevo = act.includes(a) ? act.filter((x) => x !== a) : [...act, a];
      S.cursosEns = { ens: ens.id, ids: nuevo.length ? nuevo : [a] }; E.mantenerScroll = true; render();
    },
    'inf-ens-nomina': () => { const S = estadoInformes(); S.nominaEns = S.nominaEns === false; E.mantenerScroll = true; render(); },
    'inf-dir-detalle': () => { const S = estadoInformes(); S.detalleDir = !S.detalleDir; E.mantenerScroll = true; render(); },
    'inf-dir-curso': (a) => {
      const S = estadoInformes(), { delGrupo } = datosInformes(), act = seleccionDirectiva(S, delGrupo).cursosSel.map((c) => c.id);
      const nuevo = act.includes(a) ? act.filter((x) => x !== a) : [...act, a];
      S.cursosDir = nuevo.length ? nuevo : [a]; E.mantenerScroll = true; render();
    },
    'inf-nivel': (a) => { const S = estadoInformes(); S.nivel = a; S.cursos = []; E.mantenerScroll = true; render(); },
    'inf-curso': (a) => { const S = estadoInformes(); S.cursos = S.cursos.includes(a) ? S.cursos.filter((x) => x !== a) : [...S.cursos, a]; if (!S.cursos.length) S.cursos = [a]; E.mantenerScroll = true; render(); },
    'inf-comparar': () => { const S = estadoInformes(); S.comparar = !S.comparar; if (S.comparar) S.cursos = datosInformes().delNivel.map((c) => c.id); E.mantenerScroll = true; render(); },
    'inf-curso-doc': (a) => { const S = estadoInformes(); S.cursoDoc = a; S.est = null; S.ensayosEst = null; E.mantenerScroll = true; render(); },
    'inf-dest': (a) => { const S = estadoInformes(); S.dest = a; if (a === 'directivo') S.tipoDir = S.tipoDir || 'A'; if (a === 'docente') S.tipoDoc = S.tipoDoc || 'A'; S.ensayosEst = null; E.mantenerScroll = true; render(); },
    'inf-tipo': (a) => { const S = estadoInformes(); if (S.dest === 'directivo') S.tipoDir = a; else S.tipoDoc = a; if (a === 'B') S.cursos = datosInformes().delNivel.map((c) => c.id); E.mantenerScroll = true; render(); },
    'elegir-perfil': (a) => { try { localStorage.setItem(CLAVE_PERFIL, a); } catch (e) { /* nada */ } E.inf = null; E.pantalla = 'inicio'; render(); },
    'cambiar-perfil': () => { try { localStorage.removeItem(CLAVE_PERFIL); } catch (e) { /* nada */ } E.inf = null; render(); },
    'docente-agregar': async () => {
      const el = document.getElementById('a-docente'), nombre = el && el.value.trim();
      if (!nombre) { toast('Escribe el nombre del docente'); return; }
      const id = 'doc-' + Almacen.id(nombre).slice(0, 24) + '-' + Date.now().toString(36).slice(-4);
      const primero = !docentes().length;
      await fijarDocentes([...docentes(), { id, nombre, cursos: [], todos: primero }]);
      if (primero) { try { localStorage.setItem(CLAVE_PERFIL, id); } catch (e) { /* nada */ } toast(`${nombre} creado. Como es el primero, ve todos los cursos.`); }
      else toast(`${nombre} creado. Ahora márcale sus cursos.`);
      E.mantenerScroll = true; render();
    },
    'docente-borrar': async (a) => {
      const d = docentes().find((x) => x.id === a); if (!d) return;
      if (!confirm(`¿Quitar el perfil de ${d.nombre}? Sus cursos y resultados no se borran.`)) return;
      await fijarDocentes(docentes().filter((x) => x.id !== a)); E.mantenerScroll = true; render();
    },
    'docente-todos': async (a) => { await fijarDocentes(docentes().map((d) => (d.id === a ? { ...d, todos: !d.todos } : d))); E.mantenerScroll = true; render(); },
    'docente-curso': async (a) => {
      const [idD, idC] = a.split('|');
      await fijarDocentes(docentes().map((d) => (d.id === idD ? { ...d, cursos: (d.cursos || []).includes(idC) ? d.cursos.filter((x) => x !== idC) : [...(d.cursos || []), idC] } : d)));
      E.mantenerScroll = true; render();
    },
    'obs-irregular': async (a) => {
      const [idE, idC] = a.split('|');
      await guardarObs(idE, (o) => { const x = o.cursos[idC] || {}; o.cursos[idC] = { ...x, irregular: !x.irregular }; });
      estadoInformes().obsAbierto = true; E.mantenerScroll = true; render();
    },
    'inf-mas-ens': () => { const S = estadoInformes(); S.masEns = !S.masEns; S.ensayosEst = null; S.ejes = null; E.mantenerScroll = true; render(); },
    'inf-fichas': () => { const S = estadoInformes(); S.fichas = !S.fichas; E.mantenerScroll = true; render(); },
    'inf-ens-est': (a) => { const S = estadoInformes(); S.ensayosEst = (S.ensayosEst || []).includes(a) ? S.ensayosEst.filter((x) => x !== a) : [...(S.ensayosEst || []), a]; E.mantenerScroll = true; render(); },
    'inf-ens-grupo': (a) => {
      const S = estadoInformes(), cur = Almacen.obtener('cursos', S.cursoDoc);
      const est = S.todos ? cur.estudiantes : cur.estudiantes.filter((e) => e.id === S.est);
      const disp = [...new Map(est.flatMap((e) => ensayosEst(cur, e.id, S)).map((x) => [x.id, x])).values()];
      S.ensayosEst = a === 'ninguno' ? [] : disp.filter((e) => a === 'todos' || Estad.grupoEnsayo(e) === S.asig).map((e) => e.id);
      E.mantenerScroll = true; render();
    },
    'inf-eje': (a) => {
      const S = estadoInformes();
      if (a === '__todas') S.ejes = null;
      else { const actual = S.ejes || []; S.ejes = actual.includes(a) ? actual.filter((x) => x !== a) : [...actual, a]; if (!S.ejes.length) S.ejes = null; }
      E.mantenerScroll = true; render();
    },
    'inf-generar': () => generarInformeModulo(),
    'inf-guardar': async () => {
      const el = document.getElementById('inf-nombre'), nombre = (el && el.value.trim()) || `Configuración ${(config().informesGuardados || []).length + 1}`;
      const { est, ...resto } = estadoInformes();
      await fijarConfig({ informesGuardados: [...(config().informesGuardados || []), { nombre, estado: JSON.parse(JSON.stringify({ ...resto, est })) }] });
      toast('Configuración guardada'); E.mantenerScroll = true; render();
    },
    'inf-cargar': (a) => { const g = (config().informesGuardados || [])[+a]; if (g) { E.inf = JSON.parse(JSON.stringify(g.estado)); toast(`Cargada: ${g.nombre}`); render(); } },
    'inf-borrar-guardadas': async () => { await fijarConfig({ informesGuardados: [] }); toast('Configuraciones borradas'); render(); },
    'marcar-ensayo': (a) => { const m = E.elegirInforme.marcados; E.elegirInforme.marcados = m.includes(a) ? m.filter((x) => x !== a) : [...m, a]; E.mantenerScroll = true; render(); },
    'marcar-grupo': (a) => {
      const act = ensayoActivo(), lista = ensayosConHojas(cursoActivo());
      E.elegirInforme.marcados = a === 'este' ? [act.id] : a === 'asig' ? lista.filter((e) => e.id === act.id || Estad.grupoEnsayo(e) === Estad.grupoEnsayo(act)).map((e) => e.id) : lista.map((e) => e.id);
      E.mantenerScroll = true; render();
    },
    'generar-informe': () => { const S = E.elegirInforme; E.elegirInforme = null; render(); descargarInforme(S.tipo, S.ids, S.marcados); },
    'cancelar-informe': () => { E.elegirInforme = null; render(); },
    excel: async () => {
      const ens = ensayoActivo(), cur = cursoActivo();
      await descargar(`resultados_${Almacen.id(cur.nombre)}_${Almacen.id(ens.nombre).slice(0, 30)}.xlsx`, Excel.exportarResultados(ens, cur, hojasDe(ens, cur), historialDelCurso(ens, cur)));
    },
    'editar-ensayo': (a) => { E.ensayoEditado = JSON.parse(JSON.stringify(Almacen.obtener('ensayos', a))); E.pantalla = 'ensayo'; render(); },
    tipo: (a) => { leerFormularioEnsayo(); E.ensayoEditado.tipo = a; E.mantenerScroll = true; render(); },
    'guardar-ensayo': () => guardarEnsayo(),
    'borrar-ensayo': () => {
      E.confirmar = { texto: `¿Borrar "${E.ensayoEditado.nombre}"? Sus resultados también se borran.`, accion: async () => {
        const id = E.ensayoEditado.id;
        for (const r of Almacen.lista('resultados').filter((x) => x.ensayo === id)) await Almacen.borrar('resultados', idResultados(r.ensayo, r.curso));
        await Almacen.borrar('ensayos', id);
        toast('Ensayo borrado'); ir('ensayos');
      } };
      render();
    },
    'hojas-pdf': () => { leerFormularioEnsayo(); generarHojas(E.ensayoEditado, Almacen.obtener('cursos', document.getElementById('e-curso').value), 'pdf'); },
    'hojas-tex': () => { leerFormularioEnsayo(); generarHojas(E.ensayoEditado, Almacen.obtener('cursos', document.getElementById('e-curso').value), 'tex'); },
    'abrir-curso': (a) => { E.cursoAbierto = a; E.pantalla = 'curso-detalle'; render(); },
    'editar-est': (a) => { E.estEditado = a; E.pantalla = 'perfil-est'; window.scrollTo(0, 0); render(); },
    'nuevo-est': () => { E.estEditado = null; E.pantalla = 'perfil-est'; window.scrollTo(0, 0); render(); },
    'guardar-est': () => guardarPerfilEstudiante(),
    'extra-ensayo': async (a) => {
      const act = (config().ensayosExtra || []);
      await fijarConfig({ ensayosExtra: act.includes(a) ? act.filter((x) => x !== a) : [...act, a] });
      E.mantenerScroll = true; render();
    },
    'cerrar-correo': () => { E.correoListo = null; E.mantenerScroll = true; render(); },
    'correo-abierto': () => { toast('Recuerda adjuntar el PDF antes de enviar'); },
    'copiar-correo': async () => {
      const K = E.correoListo, t = `Para: ${K.para}\nAsunto: ${K.asunto}\n\n${K.cuerpo}`;
      try { await navigator.clipboard.writeText(t); toast('Copiado: pégalo en un correo nuevo'); }
      catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copiado: pégalo en un correo nuevo'); } catch (e2) { toast('No se pudo copiar'); } ta.remove(); }
    },
    'envio-curso': () => { if (E.envio && (E.envio.filtro || E.envio.cur !== E.cursoAbierto)) E.envio = null; E.pantalla = 'envio-curso'; window.scrollTo(0, 0); render(); },
    'inf-enviar': () => {
      const { S, curDoc } = datosInformes();
      if (!curDoc) return;
      // Los ensayos marcados en el paso 5 (con "Todos los estudiantes" es la unión; cada uno recibe los que rindió)
      E.cursoAbierto = curDoc.id;
      E.envio = { cur: curDoc.id, modo: S.dest, grupo: '__todos', enviados: {}, volver: 'informes', filtro: { ensayos: [...(S.ensayosEst || [])], ejes: S.ejes ? [...S.ejes] : null } };
      E.pantalla = 'envio-curso'; window.scrollTo(0, 0); render();
    },
    'envio-modo': (a) => { E.envio.modo = a; E.mantenerScroll = true; render(); },
    'envio-grupo': (a) => { E.envio.grupo = a; E.mantenerScroll = true; render(); },
    'envio-uno': async (a) => {
      const V = E.envio, c = Almacen.obtener('cursos', V.cur);
      const fi = V.filtro ? (o) => V.filtro.ensayos.includes(o.e.id) : () => true;
      E.fichaSel = { id: a, cur: c.id, modo: V.modo, ejes: V.filtro ? V.filtro.ejes : null, marcados: ensayosDelEstudiante(a, c).filter((o) => fi(o) && (V.grupo === '__todos' || Estad.grupoEnsayo(o.e) === V.grupo)).map((o) => o.e.id) };
      if (await enviarInformeEstudiante()) { V.enviados[`${V.modo}:${a}`] = true; E.mantenerScroll = true; render(); }
    },
    'enviar-desde-perfil': (a) => {
      const c = Almacen.obtener('cursos', E.cursoAbierto);
      E.fichaSel = { id: E.estEditado, cur: c.id, modo: a, marcados: ensayosDelEstudiante(E.estEditado, c).map((o) => o.e.id) };
      enviarInformeEstudiante();
    },
    'perfil-desde-ficha': (a) => { const c = cursoActivo(); if (!c) return; E.cursoAbierto = c.id; E.estEditado = a; E.pantalla = 'perfil-est'; window.scrollTo(0, 0); render(); },
    'borrar-est': () => {
      const c = Almacen.obtener('cursos', E.cursoAbierto), est = c && c.estudiantes.find((x) => x.id === E.estEditado);
      if (!est) return;
      const n = ensayos().filter((en) => hojasDe(en, c)[est.id]).length;
      E.confirmar = { texto: `¿Quitar a ${est.nombre} de ${c.nombre}?${n ? ` Sus hojas corregidas en ${n} ensayo${n === 1 ? '' : 's'} también se borran.` : ''}`, accion: async () => {
        for (const en of ensayos()) {
          const r = Almacen.obtener('resultados', idResultados(en.id, c.id));
          if (r && r.hojas && r.hojas[est.id]) { const resto = { ...r.hojas }; delete resto[est.id]; await Almacen.guardar('resultados', idResultados(en.id, c.id), { ...r, hojas: resto }); }
        }
        c.estudiantes = c.estudiantes.filter((x) => x.id !== est.id);
        await Almacen.guardar('cursos', c.id, c);
        toast('Estudiante quitado'); E.estEditado = null; E.pantalla = 'curso-detalle'; render();
      } };
      render();
    },
    'hojas-pdf-curso': () => generarHojas(Almacen.obtener('ensayos', document.getElementById('cd-ensayo').value), Almacen.obtener('cursos', E.cursoAbierto), 'pdf'),
    'hojas-tex-curso': () => generarHojas(Almacen.obtener('ensayos', document.getElementById('cd-ensayo').value), Almacen.obtener('cursos', E.cursoAbierto), 'tex'),
    'borrar-curso': () => {
      const c = Almacen.obtener('cursos', E.cursoAbierto);
      E.confirmar = { texto: `¿Borrar el curso ${c.nombre}? Sus resultados también se borran.`, accion: async () => {
        for (const r of Almacen.lista('resultados').filter((x) => x.curso === c.id)) await Almacen.borrar('resultados', idResultados(r.ensayo, r.curso));
        await Almacen.borrar('cursos', c.id);
        toast('Curso borrado'); ir('cursos');
      } };
      render();
    },
    'si-confirmar': async () => { const f = E.confirmar.accion; E.confirmar = null; await f(); },
    'no-confirmar': () => { E.confirmar = null; render(); },
    'cerrar-texto': () => { E.texto = null; render(); },
    'copiar-texto': () => {
      const ta = document.getElementById('texto-latex');
      navigator.clipboard.writeText(E.texto.contenido).then(() => toast('Copiado'), () => { ta.focus(); ta.select(); toast('Selecciona y copia el texto'); });
    },
    'bajar-texto': async () => {
      const blob = new Blob([E.texto.contenido], { type: 'text/plain' });
      const dl = await capacidad('downloads');
      // Dentro de claude.ai no se permiten archivos .tex: se baja como .txt
      await descargar(E.texto.archivo + (dl ? '.tex.txt' : '.tex'), blob);
    },
    respaldo: () => respaldarAhora(),
    'ocultar-respaldo': () => { E.ocultarRespaldo = true; E.mantenerScroll = true; render(); },
    plantilla: async (a) => {
      const b64 = (typeof PLANTILLAS_XLSX !== 'undefined') && PLANTILLAS_XLSX[a];
      if (!b64) { toast('No encontré la plantilla.'); return; }
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      await descargar(a, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    },
  };

  raiz.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-accion]');
    if (!el || el.disabled) return;
    const f = ACCIONES[el.dataset.accion];
    if (f) f(el.dataset.a, ev);
  });

  raiz.addEventListener('change', async (ev) => {
    const el = ev.target;
    if (el.dataset.cambio === 'ensayo') { await fijarConfig({ ensayo: el.value || null }); E.inf = null; render(); }
    if (el.dataset.cambio === 'curso') { await fijarConfig({ curso: el.value || null }); E.inf = null; render(); }
    if (el.dataset.cambio === 'formato-nombre') { await fijarConfig({ formatoNombre: el.value }); toast('Guardado'); E.mantenerScroll = true; render(); }
    if (el.dataset.cambio === 'obs-general') { await guardarObs(el.dataset.ens, (o) => { o.general = el.value.trim(); }); estadoInformes().obsAbierto = true; toast('Observación guardada'); }
    if (el.dataset.cambio === 'obs-curso') { await guardarObs(el.dataset.ens, (o) => { const x = o.cursos[el.dataset.curso] || {}; o.cursos[el.dataset.curso] = { ...x, texto: el.value.trim() }; }); estadoInformes().obsAbierto = true; toast('Observación guardada'); }
    if (el.dataset.cambio === 'inf-est') { const S = estadoInformes(); S.todos = el.value === '__todos'; S.est = S.todos ? null : el.value; S.ensayosEst = null; S.ejes = null; E.mantenerScroll = true; render(); }
    if (el.dataset.cambio === 'inf-desde' || el.dataset.cambio === 'inf-hasta') { const S = estadoInformes(); S[el.dataset.cambio.slice(4)] = el.value; S.ensayosEst = null; E.mantenerScroll = true; render(); }
    if (el.dataset.cambio === 'rev-ensayo') {
      const rev = E.revision, ens = Almacen.obtener('ensayos', el.value);
      if (!rev || !ens) return;
      const n = ens.preguntas.length;
      rev.ensayo = ens; rev.respuestas = []; rev.estados = []; rev.cambios = 0;
      for (let i = 0; i < n; i++) { const x = (rev.lectura || [])[i] || { letra: '', estado: 'blanco' }; rev.respuestas.push(x.estado === 'doble' ? '' : x.letra); rev.estados.push(x.estado); }
      rev.error = (rev.lectura || []).length < n ? `La hoja tiene ${(rev.lectura || []).length} preguntas y el ensayo ${n}.` : '';
      rev.yaExistia = !!(rev.estudiante && hojasDe(ens, rev.curso)[rev.estudiante.id]);
      E.mantenerScroll = true; render();
    }
    if (el.dataset.cambio === 'estudiante' && el.value) {
      const rev = E.revision;
      const cur = rev.curso || cursoActivo();
      rev.curso = cur; rev.estudiante = cur.estudiantes.find((e) => e.id === el.value); rev.origen = 'manual';
      rev.yaExistia = !!hojasDe(rev.ensayo, cur)[rev.estudiante.id];
      render();
    }
    if (el.dataset.archivo && el.files && el.files.length) {
      const archivos = Array.from(el.files);
      el.value = '';
      try {
        if (el.dataset.archivo === 'foto') leerArchivos(archivos);
        if (el.dataset.archivo === 'ensayo') {
          leerFormularioEnsayo();
          const leido = await Excel.leerEnsayo(archivos[0]);
          const e = E.ensayoEditado;
          E.ensayoEditado = { ...e, ...Object.fromEntries(Object.entries(leido).filter(([k, v]) => v !== '' && v != null && (k !== 'id' || !e.id))) };
          toast(`Leí ${leido.preguntas.length} preguntas${leido.cortes ? ' y los cortes de estándar' : ''}${leido.tablaPaes ? ` y ${leido.tablaPaes.length} puntajes` : ''}`);
          E.mantenerScroll = true; render();
        }
        if (el.dataset.archivo === 'curso') { await guardarCursosDesdeLista(await Excel.leerLista(archivos[0]), archivos[0].name); render(); }
        if (el.dataset.archivo === 'logo') { const logo = await leerLogo(archivos[0]); await fijarConfig({ colegio: { ...(config().colegio || {}), logo } }); toast('Logo guardado'); E.mantenerScroll = true; render(); }
        if (el.dataset.archivo === 'respaldo') { await Almacen.restaurar(JSON.parse(await archivos[0].text())); escribirLocal(RESP.cambios, '0'); escribirLocal(RESP.fecha, new Date().toISOString()); toast('Respaldo restaurado'); render(); }
      } catch (e) { toast(e.message || 'No pude leer ese archivo.'); }
    }
  });

  // Globo con el valor de una marca del gráfico (al tocarla, pasar el mouse o enfocarla)
  let globo = null, marcaActiva = null;
  function mostrarTip(el, x, y) {
    if (!globo) { globo = document.createElement('div'); globo.className = 'tip'; globo.setAttribute('role', 'tooltip'); document.body.appendChild(globo); }
    if (marcaActiva) marcaActiva.classList.remove('activo');
    marcaActiva = el; el.classList.add('activo');
    globo.textContent = el.getAttribute('data-tip');
    globo.hidden = false;
    const r = globo.getBoundingClientRect();
    globo.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, x - r.width / 2)) + 'px';
    globo.style.top = Math.max(8, y - r.height - 14) + 'px';
  }
  function ocultarTip() { if (globo) globo.hidden = true; if (marcaActiva) marcaActiva.classList.remove('activo'); marcaActiva = null; }
  raiz.addEventListener('pointerover', (ev) => { const el = ev.target.closest && ev.target.closest('[data-tip]'); if (el && ev.pointerType === 'mouse') mostrarTip(el, ev.clientX, ev.clientY); });
  raiz.addEventListener('pointerout', (ev) => { if (ev.pointerType === 'mouse' && ev.target.closest && ev.target.closest('[data-tip]')) ocultarTip(); });
  raiz.addEventListener('pointerdown', (ev) => { const el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) mostrarTip(el, ev.clientX, ev.clientY); else ocultarTip(); });
  raiz.addEventListener('focusin', (ev) => { const el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); mostrarTip(el, r.left + r.width / 2, r.top); } });
  raiz.addEventListener('focusout', ocultarTip);
  window.addEventListener('scroll', ocultarTip, { passive: true });

  window.addEventListener('pagehide', apagarCamara);

  // Cada vez que se abre la app parte sin ensayo ni curso elegidos. Una recarga dentro de la misma sesión
  // (por ejemplo, al actualizarse la app a mitad de una corrección) mantiene la elección.
  const sesionNueva = (() => { try { if (sessionStorage.getItem('lector-sesion')) return false; sessionStorage.setItem('lector-sesion', '1'); } catch (e) { /* sin sessionStorage */ } return true; })();
  protegerAlmacenamiento();
  Almacen.iniciar().then(async () => { if (sesionNueva && (config().ensayo || config().curso || (config().ensayosExtra || []).length)) await fijarConfig({ ensayo: null, curso: null, ensayosExtra: [] }); render(); }, () => render());
  render();
})();
