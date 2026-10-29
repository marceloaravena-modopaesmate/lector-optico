/*
 * Dónde se guardan los datos.
 *  - Publicada en claude.ai: en la base de datos del Artifact (no se pierde al cambiar de equipo).
 *  - Abierta como archivo o en otro servidor: en el navegador (localStorage).
 *
 * Colecciones:
 *   ensayos/<id>      un ensayo con su clave por pregunta
 *   cursos/<id>       un curso con su lista de estudiantes
 *   resultados/<id>   resultados de un ensayo en un curso: { ensayo, curso, hojas: { idEstudiante: {...} } }
 *   config/app        ensayo y curso activos
 *
 * Todo se carga en memoria al abrir la app; cada cambio se escribe enseguida.
 */
const Almacen = (() => {
  const COLECCIONES = ['ensayos', 'cursos', 'resultados', 'config'];
  const datos = { ensayos: {}, cursos: {}, resultados: {}, config: {} };
  let db = null;
  let modo = 'navegador';

  function claveLocal(col) { return 'lector-optico:' + col; }

  async function iniciar() {
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        db = await Promise.race([
          window.claude.use('db'),
          new Promise((r) => setTimeout(() => r(null), 6000)),
        ]);
      }
    } catch (e) { db = null; }

    if (db) {
      modo = 'nube';
      for (const col of COLECCIONES) {
        try {
          const snap = await db.collection(col).limit(1000).get();
          snap.docs.forEach((d) => { datos[col][d.id] = JSON.parse(JSON.stringify(d.data())); });
        } catch (e) { console.warn('No se pudo leer', col, e); }
      }
    } else {
      for (const col of COLECCIONES) {
        try { datos[col] = JSON.parse(localStorage.getItem(claveLocal(col)) || '{}'); } catch (e) { datos[col] = {}; }
      }
    }
    return modo;
  }

  function lista(col) { return Object.values(datos[col]); }
  function obtener(col, id) { return datos[col][id] || null; }

  async function guardar(col, id, valor) {
    datos[col][id] = valor;
    if (db) {
      try { await db.doc(col + '/' + id).set(valor); } catch (e) {
        if (e && e.code === 'quota_exceeded') throw new Error('Se llenó el espacio de datos. Exporta un respaldo y borra ensayos antiguos.');
        throw new Error('No se pudo guardar (' + ((e && e.code) || 'error') + '). Revisa tu conexión e inténtalo de nuevo.');
      }
    } else {
      try { localStorage.setItem(claveLocal(col), JSON.stringify(datos[col])); } catch (e) {
        throw new Error('El navegador no permitió guardar. Exporta un respaldo para no perder los datos.');
      }
    }
  }

  async function borrar(col, id) {
    delete datos[col][id];
    if (db) { try { await db.doc(col + '/' + id).delete(); } catch (e) { /* se reintenta al guardar de nuevo */ } }
    else { try { localStorage.setItem(claveLocal(col), JSON.stringify(datos[col])); } catch (e) { /* nada */ } }
  }

  // Respaldo completo en un solo objeto (para descargar como .json)
  function respaldo() { return { app: 'lector-optico', version: 1, fecha: new Date().toISOString(), datos }; }

  async function restaurar(obj) {
    if (!obj || obj.app !== 'lector-optico' || !obj.datos) throw new Error('Ese archivo no es un respaldo del lector óptico.');
    for (const col of COLECCIONES) {
      for (const [id, valor] of Object.entries(obj.datos[col] || {})) await guardar(col, id, valor);
    }
  }

  // Ids válidos para la base de datos: letras, números y - _ . sin tildes ni espacios
  function id(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/°/g, '').replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'x';
  }

  return { iniciar, lista, obtener, guardar, borrar, respaldo, restaurar, id, get modo() { return modo; } };
})();
