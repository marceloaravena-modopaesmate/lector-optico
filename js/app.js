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
  const cursos = () => Almacen.lista('cursos').sort((a, b) => a.nombre.localeCompare(b.nombre));
  function ensayoActivo() { const c = config(); return Almacen.obtener('ensayos', c.ensayo) || ensayos()[0] || null; }
  function cursoActivo() { const c = config(); return Almacen.obtener('cursos', c.curso) || cursos()[0] || null; }
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
      // Tabla de puntaje ilustrativa (no es la oficial de DEMRE): 100 puntos con 0 correctas y 1000 con 65
      tablaPaes: Array.from({ length: 66 }, (_, c) => Math.round(100 + 900 * Math.pow(c / 65, 0.85))),
      preguntas: Array.from({ length: 65 }, (_, i) => ({
        n: i + 1, clave: 'ABCD'[((i + 1) * 7) % 4], eje: ejes[Math.min(Math.floor(i * 4 / 65), 3)], habilidad: habs[(i + 1) % 4], contenido: '',
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

  function pInicio() {
    const ens = ensayoActivo(), cur = cursoActivo();
    let tarjeta;
    if (!ens || !cur) {
      tarjeta = `<section class="destacado">
        <span class="eyebrow">Para empezar</span>
        <span class="nombre">Crea un ensayo y carga tu curso</span>
        <span class="detalle">Necesitas la clave del ensayo y la lista del curso, ambas desde las plantillas Excel. También puedes probar la app con datos de ejemplo.</span>
        <div class="fila-botones"><button class="btn" data-accion="ir" data-a="${!ens ? 'ensayo-nuevo' : 'cursos'}">${!ens ? 'Crear ensayo' : 'Cargar curso'}</button>
        <button class="btn" data-accion="ejemplo">Usar ejemplo</button></div>
      </section>`;
    } else {
      const hojas = hojasDe(ens, cur);
      const hechas = cur.estudiantes.filter((e) => hojas[e.id]).length;
      const total = cur.estudiantes.length;
      tarjeta = `<section class="destacado">
        <div style="display:flex;flex-direction:column;gap:4px">
          <span class="eyebrow">Ensayo en curso</span>
          <span class="nombre">${h(ens.nombre)}</span>
          <span class="detalle">${h(cur.nombre)} · ${ens.preguntas.length} preguntas${ens.fecha ? ' · ' + h(ens.fecha) : ''}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;justify-content:space-between;font-size:13px"><span>Hojas corregidas</span><b class="num">${hechas} de ${total}</b></div>
          <div class="progreso"><div style="width:${total ? (hechas / total) * 100 : 0}%"></div></div>
        </div>
        <button class="btn grande" data-accion="ir" data-a="camara">${ICONO.camara} Corregir hojas</button>
        <div class="dos">
          <label class="oculto-visual" for="sel-ensayo">Ensayo</label>
          <select id="sel-ensayo" data-cambio="ensayo">${ensayos().map((e) => `<option value="${h(e.id)}" ${e.id === ens.id ? 'selected' : ''}>${h(e.nombre)}</option>`).join('')}</select>
          <label class="oculto-visual" for="sel-curso">Curso</label>
          <select id="sel-curso" data-cambio="curso">${cursos().map((c) => `<option value="${h(c.id)}" ${c.id === cur.id ? 'selected' : ''}>${h(c.nombre)}</option>`).join('')}</select>
        </div>
      </section>`;
    }
    let recientes = '';
    if (ens && cur) {
      const hojas = hojasDe(ens, cur);
      const ult = cur.estudiantes.filter((e) => hojas[e.id]).sort((a, b) => hojas[b.id].fecha.localeCompare(hojas[a.id].fecha)).slice(0, 3);
      if (ult.length) {
        recientes = `<section style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:baseline"><h2 style="font-size:16px">Últimas corregidas</h2>
          <button class="btn" style="min-height:36px;border:0;background:none" data-accion="ir" data-a="curso">Ver todas</button></div>
          <div class="tarjeta lista">${ult.map((e) => {
            const r = hojas[e.id];
            return `<button class="item" data-accion="ver-hoja" data-a="${h(e.id)}"><span class="iniciales">${h(iniciales(e.nombre))}</span>
              <span class="principal"><b>${h(e.nombre)}</b><span>${h(hace(r.fecha))} · N° ${e.lista}</span></span>
              <span class="chip ok num">${pct(r.correctas / ens.preguntas.length)}</span></button>`;
          }).join('')}</div></section>`;
      }
    }
    return `<div class="pantalla">
      <header class="cabecera"><div class="titulos"><span class="saludo">${saludo()}</span><span class="marca">Lector óptico</span></div>
      <button class="btn-redondo" data-accion="ir" data-a="ajustes" aria-label="Ajustes y respaldo">${ICONO.ajustes}</button></header>
      <div class="cuerpo">${tarjeta}
        <div class="mosaico">
          <button data-accion="ir" data-a="ensayos">${ICONO.doc}<b>Ensayos</b><span>Claves, ejes y habilidades</span></button>
          <button data-accion="ir" data-a="cursos">${ICONO.grupo}<b>Cursos</b><span>Listas y hojas con QR</span></button>
          <button data-accion="ir-tab" data-a="curso">${ICONO.grafico}<b>Estadísticas</b><span>Curso, preguntas, estudiantes e historial</span></button>
          <button data-accion="ir-tab" data-a="nivel">${ICONO.grupo}<b>Paralelos</b><span>Compara los cursos del nivel</span></button>
          <button data-accion="ir-tab" data-a="alertas">${ICONO.alerta}<b>Alertas</b><span>Estudiantes en riesgo y grupos de reforzamiento</span></button>
          <button data-accion="ir" data-a="colegio">${ICONO.informe}<b>Colegio</b><span>Todos los niveles y asignaturas</span></button>
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
      ${cabecera(ens ? ens.nombre : 'Sin ensayo', cur ? `${cur.nombre} · ${hechas} de ${cur.estudiantes.length} corregidas` : '', 'inicio')}
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
      <input type="file" id="foto-camara" accept="image/*" capture="environment" class="oculto-visual" data-archivo="foto">
      <input type="file" id="foto-galeria" accept="image/*" multiple class="oculto-visual" data-archivo="foto">
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
    const n = ens.preguntas.length;
    let correctas = 0, pendientes = 0;
    const celdas = ens.preguntas.map((p, i) => {
      const est = estadoCelda(rev, i);
      if (est === 'ok') correctas++;
      if (est === 'rev') pendientes++;
      const marca = est === 'rev' ? (rev.estados[i] === 'doble' ? '?' : rev.respuestas[i] + '?') : (rev.respuestas[i] || '–');
      const desc = { ok: 'correcta', mal: 'incorrecta', blanco: 'en blanco', rev: 'por revisar' }[est];
      return `<button class="celda ${est}" data-accion="pregunta" data-a="${i}" aria-label="Pregunta ${p.n}: ${h(rev.respuestas[i] || 'sin marca')}, ${desc}"><small>${p.n}</small><b>${h(marca)}</b></button>`;
    }).join('');
    const est = rev.estudiante;
    const avisos = [];
    if (rev.error) avisos.push(`<div class="aviso mal">${ICONO.alerta}<span>${h(rev.error)}</span></div>`);
    if (pendientes) avisos.push(`<div class="aviso rev">${ICONO.alerta}<span><b>${pendientes} por revisar:</b> toca la pregunta y elige la respuesta.</span></div>`);
    if (rev.yaExistia) avisos.push(`<div class="aviso rev">${ICONO.alerta}<span>Este estudiante ya tenía una hoja corregida. Al guardar se reemplaza.</span></div>`);
    let selector = '';
    if (!est) {
      const cur = rev.curso || cursoActivo();
      selector = `<div class="tarjeta pad"><span class="etiqueta">¿De quién es esta hoja?</span>
        <span style="font-size:14px;color:var(--texto-2)">${h(rev.motivoSinEstudiante || 'No pude leer el QR ni el N° de lista.')}</span>
        <label class="campo" for="sel-estudiante">Estudiante de ${h(cur ? cur.nombre : '')}
        <select id="sel-estudiante" data-cambio="estudiante"><option value="">Elige…</option>${(cur ? cur.estudiantes : []).map((e) => `<option value="${h(e.id)}">${e.lista}. ${h(e.nombre)}</option>`).join('')}</select></label></div>`;
    }
    const sub = est ? `N° ${est.lista} · ${rev.curso.nombre} · ${{ qr: 'leído por QR', lista: 'por N° de lista', manual: 'elegido a mano', guardada: 'hoja guardada' }[rev.origen]}` : 'Estudiante sin identificar';
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
    const asignaturas = ['PAES Competencia Matemática (M1)', 'PAES Competencia Matemática (M2)', 'PAES Competencia Lectora', 'PAES Ciencias', 'PAES Historia y Ciencias Sociales', 'SIMCE Lectura', 'SIMCE Matemática', 'SIMCE Ciencias Naturales', 'SIMCE Historia'];
    const filas = e.preguntas.slice(0, 6).map((p) => `<tr><td class="num">${p.n}</td><td><b>${h(p.clave)}</b></td><td>${h(p.eje)}</td><td>${h(p.habilidad)}</td></tr>`).join('');
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
          <div class="tabla-mini"><table><thead><tr><th>N°</th><th>Clave</th><th>Eje</th><th>Habilidad</th></tr></thead><tbody>${filas}</tbody></table></div>
          ${e.preguntas.length > 6 ? `<span style="font-size:13px;color:var(--texto-2)">y ${e.preguntas.length - 6} preguntas más.</span>` : ''}` : ''}
          <label class="campo" for="e-clave">O escribe la clave seguida (una letra por pregunta)
            <input id="e-clave" data-campo="clave" value="${h(clave)}" placeholder="ABDCA…" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font-family:ui-monospace,monospace;letter-spacing:0.08em"></label>
        </section>
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
      : `<span style="font-size:14px;color:var(--texto-2)">Pega la tabla de conversión del ensayo: el puntaje para 0 correctas, 1 correcta, 2… en orden, separados por coma o uno por línea. También se carga desde la hoja "Puntajes" de la plantilla Excel.</span>
        <label class="campo" for="e-tabla">Puntajes${e.tablaPaes && e.tablaPaes.length ? ` (${e.tablaPaes.length} valores: de 0 a ${e.tablaPaes.length - 1} correctas)` : ''}<textarea id="e-tabla" data-campo="tablaPaes" placeholder="100, 150, 187, …">${h(tabla)}</textarea></label>
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
        <div class="tarjeta lista">${c.estudiantes.map((e) => `<div class="item"><span class="n num">${e.lista}</span><span class="principal"><b>${h(e.nombre)}</b><span>${h(e.rut || 'Sin RUT')} · código ${h(e.id)}</span></span></div>`).join('')}</div>
        <button class="btn" style="color:var(--mal-texto)" data-accion="borrar-curso">Borrar curso</button>
      </div></div>`;
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
    let exportar = `<button class="btn" data-accion="excel" ${A.hechas.length ? '' : 'disabled'}>${ICONO.bajar} Exportar el curso a Excel</button>`;
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
        <span class="nota num">${R.corregidas} de ${R.total} hojas corregidas · rango ${pct(R.min)}–${pct(R.max)} · omisión media ${pct(R.omision)}.</span>
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
        ${tarjetaGrafico('Acierto por pregunta', Graficos.aciertoPreguntas(A.preguntas, Estad.CRITICA) + `<div class="leyenda-graf"><span><i style="background:var(--serie)"></i>Acierto</span><span><i style="background:var(--critico)"></i>Crítica (bajo ${pct(Estad.CRITICA)})</span></div>`, 'Toca una barra para ver la pregunta.')}
        <div class="filtros">${btn('dificiles', 'Más difíciles primero')}${btn('n', 'En orden')}</div>
        <div class="leyenda-graf"><span><i style="background:var(--serie)"></i>Respuesta correcta</span><span><i style="background:var(--distractor)"></i>Otra alternativa</span><span><i style="background:var(--omitida)"></i>Omitida</span></div>
        <div class="tarjeta">${lista.map((p) => `<div class="pregunta-fila">
          <div class="encab"><b>Pregunta ${p.n} · clave ${p.clave}</b><span class="num" style="font-weight:700">${pct(p.acierto)}</span></div>
          ${Graficos.opciones(p, A.letras)}
          <span class="meta">${h([p.eje, p.habilidad].filter(Boolean).join(' · '))}${p.distractor ? ` · más elegida entre las incorrectas: ${p.distractor.letra} (${pct(p.distractor.n / (p.total || 1))})` : ''}${p.discriminacion != null ? ` · discriminación ${p.discriminacion.toFixed(2)}${p.discriminacion < 0.2 ? ' (baja)' : ''}` : ''}</span>
          ${p.critica ? '<span><span class="etiqueta-critica">Crítica</span></span>' : ''}
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
          ${falladas.map((p) => `<tr><td class="num">${p.n}</td><td>${P.r[p.i] || '–'}</td><td>${p.clave}</td><td class="ajusta">${h(p.eje)}</td><td class="num">${pct(p.acierto)}</td></tr>`).join('')}</tbody></table></div>
        </section>
        <button class="btn" data-accion="ver-hoja" data-a="${h(P.e.id)}">Ver o corregir su hoja</button>
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
  function pInformes() {
    return `<div class="pantalla">${cabecera('Informes', '')}<div class="cuerpo"><div class="tarjeta pad">
      <span class="etiqueta">Próximamente</span>
      <span>Los informes en PDF y Word por curso y por estudiante llegan en el paso 4. Por ahora puedes exportar los resultados a Excel desde Resultados.</span>
      <button class="btn" data-accion="ir" data-a="curso">Ir a Resultados</button></div></div>${nav('')}</div>`;
  }

  function pAjustes() {
    return `<div class="pantalla">${cabecera('Ajustes y respaldo', Almacen.modo === 'nube' ? 'Tus datos se guardan en tu cuenta de Claude' : 'Tus datos se guardan en este navegador')}
      <div class="cuerpo">
        <section class="tarjeta pad"><span class="etiqueta">Respaldo</span>
          <span style="font-size:14px;color:var(--texto-2)">Descarga todos tus ensayos, cursos y resultados en un archivo. Sirve para cambiar de equipo o recuperar datos.</span>
          <div class="fila-botones"><button class="btn" data-accion="respaldo">${ICONO.bajar} Descargar</button><label class="btn" for="a-respaldo">${ICONO.subir} Restaurar</label></div>
          <input type="file" id="a-respaldo" accept=".json" class="oculto-visual" data-archivo="respaldo">
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
          <button class="btn" data-accion="guardar-ajustes">Guardar</button>
        </section>
        <section class="tarjeta pad"><span class="etiqueta">Datos de ejemplo</span>
          <span style="font-size:14px;color:var(--texto-2)">El ejemplo simple agrega un ensayo PAES M1 de 65 preguntas y un curso de 4 estudiantes, que coinciden con las hojas de ejemplo en PDF. El ejemplo de colegio agrega tres paralelos de II medio con tres ensayos SIMCE de Matemática ya corregidos, para recorrer todos los análisis.</span>
          <div class="fila-botones"><button class="btn" data-accion="ejemplo">Ejemplo simple</button><button class="btn" data-accion="ejemplo-colegio">Ejemplo de colegio</button></div>
          ${Almacen.lista('cursos').some((c) => c.ejemplo) || Almacen.lista('ensayos').some((e) => e.ejemplo) ? '<button class="btn" style="color:var(--mal-texto)" data-accion="borrar-ejemplo">Borrar los datos de ejemplo</button>' : ''}
        </section>
      </div>${nav('')}</div>`;
  }

  function capas() {
    let html = '';
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
    'ensayo': pEnsayo, cursos: pCursos, 'curso-detalle': pCursoDetalle, estadisticas: pEstadisticas,
    informes: pInformes, ajustes: pAjustes, ficha: pFicha, colegio: pColegio,
  };

  function render() {
    const y = window.scrollY;
    ocultarTipSeguro();
    Estad.configurar(config());
    raiz.innerHTML = '<div class="app">' + (PANTALLAS[E.pantalla] || pInicio)() + '</div>' + capas();
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
      if (!ensayoActivo()) { toast('Primero crea o elige un ensayo.'); E.pantalla = 'ensayos'; render(); return; }
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

  async function siguienteDeCola() {
    const archivo = E.cola.shift();
    if (!archivo) return;
    E.procesando = true; render();
    try {
      const bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
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
        r = Lector.procesar(imageData, { preguntas: activo.preguntas.length, alternativas: activo.alternativas });
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
    E.revision = {
      ensayo, curso, estudiante, origen, motivoSinEstudiante: motivo, error,
      respuestas, estados, lectura: r.respuestas, hoja: r.hoja, cambios: 0,
      yaExistia: !!(estudiante && hojasDe(ensayo, curso)[estudiante.id]),
    };
    E.pantalla = 'revision';
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
    const correctas = rev.ensayo.preguntas.filter((p, i) => rev.respuestas[i] === p.clave).length;
    doc.hojas = { ...doc.hojas, [rev.estudiante.id]: {
      respuestas: rev.respuestas, correctas, fecha: new Date().toISOString(),
      origen: rev.origen === 'guardada' ? (doc.hojas[rev.estudiante.id] || {}).origen || 'qr' : rev.origen,
      cambiosManuales: rev.cambios + ((doc.hojas[rev.estudiante.id] || {}).cambiosManuales || 0) * (rev.origen === 'guardada' ? 1 : 0),
    } };
    try { await Almacen.guardar('resultados', id, doc); } catch (e) { toast(e.message); return; }
    if (rev.curso.id !== config().curso || rev.ensayo.id !== config().ensayo) await fijarConfig({ curso: rev.curso.id, ensayo: rev.ensayo.id });
    toast(`Guardado: ${corto(rev.estudiante.nombre)}, ${correctas} de ${rev.ensayo.preguntas.length}`);
    const venia = rev.origen;
    E.revision = null;
    if (venia === 'guardada') { E.pantalla = 'curso'; render(); return; }
    if (E.cola.length) { E.pantalla = 'camara'; render(); siguienteDeCola(); return; }
    await ir('camara');
  }

  // ---------- Ensayos y cursos ----------
  function leerFormularioEnsayo() {
    const e = E.ensayoEditado;
    document.querySelectorAll('[data-campo]').forEach((el) => {
      const k = el.dataset.campo;
      if (k === 'alternativas') e.alternativas = parseInt(el.value, 10);
      else if (k === 'tablaPaes') {
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
          e.preguntas = letras.split('').map((l, i) => ({ n: i + 1, clave: l, eje: (e.preguntas[i] || {}).eje || '', habilidad: (e.preguntas[i] || {}).habilidad || '', contenido: (e.preguntas[i] || {}).contenido || '' }));
        }
      } else e[k] = el.value.trim();
    });
  }

  async function guardarEnsayo() {
    leerFormularioEnsayo();
    const e = E.ensayoEditado;
    if (!e.nombre) { toast('Ponle nombre al ensayo.'); return; }
    if (!e.preguntas.length) { toast('Falta la clave: carga la plantilla Excel o escribe las letras.'); return; }
    if (e.preguntas.length > Diseno.RESP.max) { toast(`La hoja admite hasta ${Diseno.RESP.max} preguntas.`); return; }
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
    let ultimo = null;
    for (const [nombre, lista] of Object.entries(grupos)) {
      const id = Almacen.id(nombre);
      const curso = { id, nombre, estudiantes: [] };
      curso.estudiantes = lista.map((e) => ({ lista: e.lista, nombre: e.nombre, rut: e.rut }));
      curso.estudiantes.forEach((e) => { e.id = idEstudiante(curso, e); });
      await Almacen.guardar('cursos', id, curso);
      ultimo = id;
    }
    if (!config().curso && ultimo) await fijarConfig({ curso: ultimo });
    const n = Object.keys(grupos).length;
    toast(n === 1 ? `Curso ${Object.keys(grupos)[0]} cargado con ${estudiantes.length} estudiantes` : `${n} cursos cargados`);
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
    'guardar-ajustes': async () => {
      const num = (id) => parseFloat(document.getElementById(id).value.replace(',', '.'));
      const exigencia = num('a-exigencia') / 100, aprobacion = num('a-aprobacion');
      const riesgo = num('a-riesgo') / 100, baja = num('a-baja') / 100, omision = num('a-omision') / 100;
      if (!(exigencia > 0 && exigencia < 1) || !(aprobacion > 1 && aprobacion < 7)) { toast('Revisa la exigencia (entre 1 y 99%) y la nota de aprobación (entre 1,0 y 7,0).'); return; }
      if (![riesgo, baja, omision].every((v) => v >= 0 && v <= 1)) { toast('Los umbrales de alerta van entre 0 y 100.'); return; }
      await fijarConfig({ escala: { ...Estad.conf.escala, exigencia, aprobacion }, umbrales: { riesgo, baja, omision } });
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
    pregunta: (a) => { E.hojaPregunta = parseInt(a, 10); E.mantenerScroll = true; render(); },
    'cerrar-hoja': (a, ev) => { if (ev.target.closest('[data-dentro]') && !ev.target.closest('.btn-redondo')) return; E.hojaPregunta = null; E.mantenerScroll = true; render(); },
    elegir: (a) => {
      const rev = E.revision, i = E.hojaPregunta;
      if (rev.respuestas[i] !== a || rev.estados[i] !== 'ok') rev.cambios++;
      rev.respuestas[i] = a; rev.estados[i] = a ? 'ok' : 'blanco';
      E.hojaPregunta = null; E.mantenerScroll = true; render();
    },
    guardar: () => guardarRevision(),
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
    respaldo: () => descargar(`respaldo_lector_${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(Almacen.respaldo())], { type: 'application/json' })),
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
    if (el.dataset.cambio === 'ensayo') { await fijarConfig({ ensayo: el.value }); render(); }
    if (el.dataset.cambio === 'curso') { await fijarConfig({ curso: el.value }); render(); }
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
        if (el.dataset.archivo === 'respaldo') { await Almacen.restaurar(JSON.parse(await archivos[0].text())); toast('Respaldo restaurado'); render(); }
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

  Almacen.iniciar().then(() => render(), () => render());
  render();
})();
