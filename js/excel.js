/*
 * Excel: leer las plantillas (ensayo y lista de curso) y exportar resultados.
 * Usa SheetJS (XLSX).
 */
const Excel = (() => {
  function libroDesdeArchivo(archivo) {
    return archivo.arrayBuffer().then((buf) => XLSX.read(buf, { type: 'array', cellDates: true }));
  }

  function hoja(libro, nombres, porDefecto) {
    for (const n of nombres) {
      const encontrada = libro.SheetNames.find((s) => s.toLowerCase() === n.toLowerCase());
      if (encontrada) return libro.Sheets[encontrada];
    }
    return libro.Sheets[libro.SheetNames[porDefecto]];
  }

  function filas(sh) { return XLSX.utils.sheet_to_json(sh, { header: 1, defval: '', raw: true }); }

  function texto(v) {
    if (v instanceof Date) {
      return String(v.getDate()).padStart(2, '0') + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + v.getFullYear();
    }
    return String(v == null ? '' : v).trim();
  }

  // plantilla_ensayo.xlsx -> ensayo
  async function leerEnsayo(archivo) {
    const libro = await libroDesdeArchivo(archivo);
    const datos = {};
    filas(hoja(libro, ['Ensayo'], 0)).slice(1).forEach((f) => { if (f[0]) datos[texto(f[0]).toLowerCase()] = f[1]; });
    const buscar = (prefijo) => {
      const k = Object.keys(datos).find((x) => x.startsWith(prefijo));
      return k ? datos[k] : '';
    };
    const preguntas = [];
    filas(hoja(libro, ['Preguntas'], 1)).slice(1).forEach((f) => {
      const n = parseInt(f[0], 10);
      const clave = texto(f[1]).toUpperCase();
      if (!n || !/^[A-E]$/.test(clave)) return;
      const piloto = /^(s|x|1|p|y)/i.test(texto(f[5]));
      preguntas.push({ n, clave, eje: texto(f[2]), habilidad: texto(f[3]), contenido: texto(f[4]), ...(piloto ? { piloto: true } : {}) });
    });
    preguntas.sort((a, b) => a.n - b.n);
    if (!preguntas.length) throw new Error('No encontré preguntas con clave (A a E) en la hoja "Preguntas".');
    // Hojas opcionales: "Estándares" (cortes de % de logro) y "Puntajes" (correctas → puntaje PAES)
    const fraccion = (v) => { const n = parseFloat(String(v).replace(',', '.').replace('%', '')); return isNaN(n) ? null : n > 1 ? n / 100 : n; };
    let cortes = null;
    if (libro.SheetNames.some((s) => /^est[aá]ndares$/i.test(s))) {
      const c = {};
      filas(libro.Sheets[libro.SheetNames.find((s) => /^est[aá]ndares$/i.test(s))]).forEach((f) => {
        const k = texto(f[0]).toLowerCase();
        if (k.startsWith('elemental')) c.elemental = fraccion(f[1]);
        if (k.startsWith('adecuado')) c.adecuado = fraccion(f[1]);
      });
      if (c.elemental != null && c.adecuado != null) cortes = c;
    }
    let tablaPaes = null;
    const hp = libro.SheetNames.find((s) => /^puntajes?$/i.test(s));
    if (hp) {
      const t = [];
      filas(libro.Sheets[hp]).slice(1).forEach((f) => {
        const c = parseInt(f[0], 10), p = parseFloat(f[1]);
        if (!isNaN(c) && !isNaN(p) && c >= 0) t[c] = Math.round(p);
      });
      if (t.length) {
        for (let i = 0; i < t.length; i++) if (t[i] == null) t[i] = i ? t[i - 1] : t.find((v) => v != null);
        tablaPaes = t;
      }
    }
    const tipo = texto(buscar('tipo')).toUpperCase().includes('SIMCE') ? 'SIMCE' : 'PAES';
    return {
      cortes: tipo === 'SIMCE' ? cortes : null, tablaPaes: tipo === 'PAES' ? tablaPaes : null,
      id: texto(buscar('id ensayo')),
      nombre: texto(buscar('nombre')),
      tipo,
      asignatura: texto(buscar('asignatura')),
      nivel: texto(buscar('nivel')),
      fecha: texto(buscar('fecha')),
      alternativas: parseInt(buscar('alternativas'), 10) === 5 ? 5 : 4,
      preguntas,
    };
  }

  // plantilla_lista_curso.xlsx -> [{lista, nombre, rut, curso}]
  async function leerLista(archivo) {
    const libro = await libroDesdeArchivo(archivo);
    const estudiantes = [];
    filas(hoja(libro, ['Lista'], 0)).slice(1).forEach((f, i) => {
      const nombre = texto(f[1]);
      if (!nombre) return;
      estudiantes.push({ lista: parseInt(f[0], 10) || i + 1, nombre, rut: texto(f[2]), curso: texto(f[3]) });
    });
    if (!estudiantes.length) throw new Error('No encontré estudiantes: la columna B debe tener los nombres.');
    return estudiantes;
  }

  // Estadísticas de un ensayo en un curso (las usa la exportación y la pantalla de avance)
  function calcular(ensayo, curso, hojas) {
    const n = Estad.puntuables(ensayo).length || 1;
    const letras = 'ABCDE'.slice(0, ensayo.alternativas);
    const filasEst = curso.estudiantes.map((e) => {
      const h = hojas[e.id];
      if (!h) return { e, h: null };
      let correctas = 0, omitidas = 0;
      ensayo.preguntas.forEach((p, i) => {
        if (p.piloto) return;
        const r = h.respuestas[i] || '';
        if (!r) omitidas++; else if (r === p.clave) correctas++;
      });
      return { e, h, correctas, omitidas, incorrectas: n - correctas - omitidas, logro: correctas / n };
    });
    const corregidas = filasEst.filter((f) => f.h);
    const porPregunta = ensayo.preguntas.map((p, i) => {
      const cuenta = {}; letras.split('').forEach((l) => { cuenta[l] = 0; }); cuenta[''] = 0;
      corregidas.forEach((f) => { const r = f.h.respuestas[i] || ''; cuenta[r] = (cuenta[r] || 0) + 1; });
      const total = corregidas.length || 1;
      return { ...p, acierto: (cuenta[p.clave] || 0) / total, cuenta, total: corregidas.length };
    });
    const agrupar = (campo) => {
      const g = {};
      porPregunta.forEach((p) => {
        const k = p[campo] || 'Sin dato';
        g[k] = g[k] || { nombre: k, preguntas: 0, suma: 0 };
        g[k].preguntas++; g[k].suma += p.acierto;
      });
      return Object.values(g).map((x) => ({ ...x, logro: x.suma / x.preguntas }));
    };
    const promedio = corregidas.length ? corregidas.reduce((s, f) => s + f.logro, 0) / corregidas.length : 0;
    return { filasEst, corregidas, porPregunta, porEje: agrupar('eje'), porHabilidad: agrupar('habilidad'), promedio };
  }

  function pct(x) { return Math.round(x * 1000) / 10; }

  // historial (opcional): resultado de Estad.historial para agregar la hoja "Historial"
  function exportarResultados(ensayo, curso, hojas, historial) {
    const A = Estad.analizar(ensayo, curso, hojas);
    const letras = A.letras;
    const libro = XLSX.utils.book_new();
    const agregar = (nombre, aoa, anchos) => {
      const sh = XLSX.utils.aoa_to_sheet(aoa);
      if (anchos) sh['!cols'] = anchos.map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(libro, sh, nombre);
    };
    const R = A.resumen;
    const conCortes = !!A.estandares, conTabla = Estad.tieneTabla(ensayo);
    const nt = (n) => (n == null ? '' : n);
    agregar('Resumen', [
      ['Ensayo', ensayo.nombre], ['Asignatura', ensayo.asignatura || ''], ['Curso', curso.nombre], ['Fecha', ensayo.fecha || ''],
      ['Hojas corregidas', R.corregidas], ['Estudiantes del curso', R.total],
      ['Preguntas que cuentan', A.n], ['Preguntas piloto (no cuentan)', A.pilotos],
      ['% logro promedio', pct(R.media)], ['% logro mediana', pct(R.mediana)], ['Desviación estándar (pts)', pct(R.desviacion)],
      ['% logro mínimo', pct(R.min)], ['% logro máximo', pct(R.max)], ['% omisión promedio', pct(R.omision)],
      [`Preguntas críticas (bajo ${pct(Estad.CRITICA)}% de acierto)`, R.criticas],
      [`Nota promedio (exigencia ${pct(Estad.conf.escala.exigencia)}%)`, nt(R.notaMedia)],
      ['Estudiantes que aprueban', R.aprobados], ['% que aprueba', R.corregidas ? pct(R.aprobados / R.corregidas) : ''],
      ...(conTabla ? [['Puntaje PAES estimado promedio', R.puntajeMedia], ['Puntaje PAES estimado mínimo', R.puntajeMin], ['Puntaje PAES estimado máximo', R.puntajeMax]] : []),
      [],
      ['Tramo', 'Criterio', 'Estudiantes'], ...A.tramos.map((t) => [t.nombre, t.texto, t.n]),
      ...(conCortes ? [[], ['Estándar (estimado)', 'Desde % de logro', 'Estudiantes'],
        ...A.estandares.map((s, i) => [s.nombre, i === 0 ? 0 : pct(i === 1 ? ensayo.cortes.elemental : ensayo.cortes.adecuado), s.n])] : []),
    ], [34, 30, 12]);
    agregar('Resultados', [
      ['N° lista', 'Estudiante', 'RUT', 'Correctas', 'Incorrectas', 'Omitidas', '% logro', 'Nota', 'Tramo', ...(conCortes ? ['Estándar (est.)'] : []), ...(conTabla ? ['Puntaje (est.)'] : []), 'Lugar'],
      ...A.estudiantes.map((x) => x.corregida
        ? [x.e.lista, x.e.nombre, x.e.rut || '', x.correctas, x.incorrectas, x.omitidas, pct(x.logro), x.nota, Estad.tramoDe(x.logro).nombre,
          ...(conCortes ? [x.estandar.nombre] : []), ...(conTabla ? [x.puntaje] : []),
          A.hechas.filter((y) => y.logro > x.logro).length + 1]
        : [x.e.lista, x.e.nombre, x.e.rut || '', '', '', '', '', '', 'Sin hoja', ...(conCortes ? [''] : []), ...(conTabla ? [''] : []), '']),
    ], [9, 34, 14, 10, 11, 10, 9, 7, 8, 14, 13, 7]);
    agregar('Respuestas', [
      ['N° lista', 'Estudiante', ...ensayo.preguntas.map((p) => 'P' + p.n)],
      ['', 'CLAVE', ...ensayo.preguntas.map((p) => p.clave)],
      ...A.hechas.map((x) => [x.e.lista, x.e.nombre, ...x.r]),
    ], [9, 34]);
    agregar('Por pregunta', [
      ['Pregunta', 'Clave', 'Eje / Contenido', 'Habilidad', 'Contenido específico', 'Piloto', '% acierto', 'Discriminación', 'Crítica', ...letras.map((l) => '% ' + l), '% omitida'],
      ...A.preguntas.map((p) => [p.n, p.clave, p.eje, p.habilidad, p.contenido || '', p.piloto ? 'Sí (no cuenta)' : '', pct(p.acierto),
        p.discriminacion == null ? '' : Math.round(p.discriminacion * 100) / 100, p.critica ? 'Sí' : '',
        ...letras.map((l) => pct((p.cuenta[l] || 0) / (p.total || 1))), pct(p.omision)]),
    ], [9, 7, 28, 22, 26, 10, 13, 8]);
    agregar('Por eje', [['Eje / Contenido', 'Preguntas', '% logro'], ...A.porEje.map((g) => [g.nombre, g.preguntas, pct(g.logro)])], [30, 10, 10]);
    agregar('Por habilidad', [['Habilidad', 'Preguntas', '% logro'], ...A.porHabilidad.map((g) => [g.nombre, g.preguntas, pct(g.logro)])], [30, 10, 10]);
    agregar('Eje x habilidad', [
      ['Eje \\ Habilidad', ...A.porHabilidad.map((g) => g.nombre)],
      ...A.porEje.map((e, i) => [e.nombre, ...A.matriz[i].map((c) => (c ? pct(c.logro) : ''))]),
    ], [30]);
    agregar('Estudiante por eje', [
      ['N° lista', 'Estudiante', ...A.porEje.map((g) => g.nombre), ...A.porHabilidad.map((g) => g.nombre)],
      ...A.hechas.map((x) => {
        const P = Estad.perfil(A, x.e.id);
        return [x.e.lista, x.e.nombre, ...P.porEje.map((g) => pct(g.propio)), ...P.porHabilidad.map((g) => pct(g.propio))];
      }),
    ], [9, 34]);
    if (historial && historial.puntos.length > 1) {
      agregar('Historial', [
        ['N° lista', 'Estudiante', ...historial.puntos.map((p) => p.ensayo.nombre)],
        ['', 'PROMEDIO DEL CURSO', ...historial.puntos.map((p) => pct(p.media))],
        ...historial.estudiantes.map((s) => [s.e.lista, s.e.nombre, ...s.serie.map((v) => (v == null ? '' : pct(v)))]),
      ], [9, 34]);
    }
    // Alertas y grupos de reforzamiento
    const AL = Estad.alertas(A, historial).filter((a) => a.alertas.length).sort((a, b) => b.gravedad - a.gravedad || a.x.logro - b.x.logro);
    agregar('Alertas', [
      ['N° lista', 'Estudiante', '% logro', 'Nota', 'Cambio (pts)', 'Alertas'],
      ...AL.map((a) => [a.x.e.lista, a.x.e.nombre, pct(a.x.logro), a.x.nota, a.cambio == null ? '' : Math.round(a.cambio * 100), a.alertas.map((y) => y.texto).join('; ')]),
    ], [9, 34, 9, 7, 12, 50]);
    const grupos = (campo) => Estad.grupos(A, campo).flatMap((g) => g.estudiantes.map((s) => [g.nombre, s.x.e.lista, s.x.e.nombre, pct(s.logro), pct(g.logroCurso)]));
    agregar('Grupos', [
      ['Grupo por eje', 'N° lista', 'Estudiante', '% logro en el eje', '% del curso en el eje'], ...grupos('eje'), [],
      ['Grupo por habilidad', 'N° lista', 'Estudiante', '% logro en la habilidad', '% del curso en la habilidad'], ...grupos('habilidad'),
    ], [30, 9, 34, 16, 18]);
    return libroABlob(libro);
  }

  function libroABlob(libro) {
    const datos = XLSX.write(libro, { type: 'array', bookType: 'xlsx' });
    return new Blob([datos], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function hojaEn(libro, nombre, aoa, anchos) {
    const sh = XLSX.utils.aoa_to_sheet(aoa);
    if (anchos) sh['!cols'] = anchos.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(libro, sh, nombre);
  }

  // Un ensayo en todos los paralelos del nivel. N: Estad.nivel; HN: Estad.historialNivel
  function exportarNivel(ensayo, N, nombreNivel, paralelos, HN) {
    const libro = XLSX.utils.book_new();
    const cs = N.porCurso, NA = N.A;
    const conCortes = !!NA.estandares, conTabla = Estad.tieneTabla(ensayo);
    const fila = (nombre, A) => {
      const R = A.resumen;
      return [nombre, R.corregidas, R.total, pct(R.media), pct(R.mediana), pct(R.desviacion), R.notaMedia, R.corregidas ? pct(R.aprobados / R.corregidas) : '',
        ...(conCortes ? A.estandares.map((s) => s.n).concat([pct(R.adecuado)]) : []), ...(conTabla ? [R.puntajeMedia] : [])];
    };
    hojaEn(libro, 'Paralelos', [
      ['Ensayo', ensayo.nombre], ['Nivel', nombreNivel], [],
      ['Curso', 'Hojas', 'Estudiantes', '% logro', '% mediana', 'Desv. estándar', 'Nota promedio', '% aprueba',
        ...(conCortes ? ['Insuficiente', 'Elemental', 'Adecuado', '% Adecuado'] : []), ...(conTabla ? ['Puntaje promedio (est.)'] : [])],
      ...cs.map((x) => fila(x.curso.nombre, x.A)), fila(nombreNivel.toUpperCase(), NA),
    ], [22, 8, 11, 9, 10, 13, 13, 10]);
    const porGrupo = (campo) => {
      const fuente = campo === 'eje' ? NA.porEje : NA.porHabilidad;
      return [[campo === 'eje' ? 'Eje' : 'Habilidad', 'Preguntas', ...cs.map((x) => x.curso.nombre), nombreNivel],
        ...fuente.map((g) => [g.nombre, g.preguntas, ...cs.map((x) => { const y = (campo === 'eje' ? x.A.porEje : x.A.porHabilidad).find((z) => z.nombre === g.nombre); return y ? pct(y.logro) : ''; }), pct(g.logro)])];
    };
    hojaEn(libro, 'Ejes por curso', porGrupo('eje'), [30, 10]);
    hojaEn(libro, 'Habilidades por curso', porGrupo('habilidad'), [30, 10]);
    hojaEn(libro, 'Preguntas por curso', [
      ['Pregunta', 'Eje', ...cs.map((x) => x.curso.nombre), nombreNivel, 'Brecha (pts)'],
      ...N.preguntas.map((p) => [p.n, p.eje, ...p.porCurso.map(pct), pct(p.acierto), Math.round(p.brecha * 100)]),
    ], [9, 28]);
    if (HN && HN.length > 1) {
      hojaEn(libro, 'Evolución', [
        ['Ensayo', 'Fecha', ...paralelos.map((c) => c.nombre), nombreNivel, ...(HN.some((p) => p.A.estandares) ? ['% Insuficiente', '% Elemental', '% Adecuado'] : [])],
        ...HN.map((p) => [p.ensayo.nombre, p.ensayo.fecha || '', ...p.porCurso.map((v) => (v == null ? '' : pct(v))), pct(p.A.resumen.media),
          ...(p.A.estandares ? p.A.estandares.map((s) => pct(s.n / (p.A.hechas.length || 1))) : [])]),
      ], [40, 12]);
    }
    return libroABlob(libro);
  }

  // Tablero del colegio: una fila por nivel y asignatura
  function exportarTablero(filas) {
    const libro = XLSX.utils.book_new();
    hojaEn(libro, 'Tablero', [
      ['Nivel', 'Asignatura', 'Ensayos', 'Último ensayo', '% logro', 'Nota promedio', '% Adecuado (est.)', 'Puntaje promedio (est.)', `Estudiantes bajo ${pct(Estad.conf.umbrales.riesgo)}%`, 'Logro por ensayo'],
      ...filas.map((f) => {
        const R = f.ultimo.A.resumen;
        return [f.nivel, f.grupo, f.ensayos, f.ultimo.ensayo.nombre, pct(R.media), R.notaMedia, R.adecuado == null ? '' : pct(R.adecuado), R.puntajeMedia == null ? '' : R.puntajeMedia, f.bajo, f.serie.map((v) => pct(v)).join(' → ')];
      }),
    ], [14, 30, 9, 40, 9, 13, 16, 20, 18, 30]);
    return libroABlob(libro);
  }

  return { leerEnsayo, leerLista, calcular, exportarResultados, exportarNivel, exportarTablero };
})();
