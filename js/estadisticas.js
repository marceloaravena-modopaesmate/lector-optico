/*
 * Cálculos estadísticos de los resultados.
 * No dibuja nada: entrega números para las pantallas, los gráficos y el Excel.
 */
const Estad = (() => {
  // Tramos de logro (% de respuestas correctas). Cámbialos aquí si usas otros cortes.
  const TRAMOS = [
    { id: 'bajo', nombre: 'Bajo', desde: 0, hasta: 0.5, texto: 'menos de 50%' },
    { id: 'medio', nombre: 'Medio', desde: 0.5, hasta: 0.75, texto: '50% a 74%' },
    { id: 'alto', nombre: 'Alto', desde: 0.75, hasta: 1.01, texto: '75% o más' },
  ];
  const ESTANDARES = [
    { id: 'insuficiente', nombre: 'Insuficiente' },
    { id: 'elemental', nombre: 'Elemental' },
    { id: 'adecuado', nombre: 'Adecuado' },
  ];
  const CRITICA = 0.4;          // pregunta crítica: menos de 40% de acierto
  const GRUPO_EXTREMO = 0.27;   // grupos superior e inferior para el índice de discriminación
  const BRECHA = 0.25;          // brecha entre paralelos que se destaca en una pregunta

  // Escala de notas y umbrales de alerta. La app los cambia desde Ajustes con configurar().
  const POR_DEFECTO = {
    escala: { exigencia: 0.6, minima: 1, maxima: 7, aprobacion: 4 },
    umbrales: { riesgo: 0.5, baja: 0.1, omision: 0.25 },
  };
  let conf = JSON.parse(JSON.stringify(POR_DEFECTO));
  function configurar(c) {
    conf = {
      escala: { ...POR_DEFECTO.escala, ...((c && c.escala) || {}) },
      umbrales: { ...POR_DEFECTO.umbrales, ...((c && c.umbrales) || {}) },
    };
  }

  function media(xs) { return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0; }
  function mediana(xs) {
    if (!xs.length) return 0;
    const o = xs.slice().sort((a, b) => a - b), m = Math.floor(o.length / 2);
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  }
  function cuantil(xs, q) {
    if (!xs.length) return 0;
    const o = xs.slice().sort((a, b) => a - b), p = (o.length - 1) * q, i = Math.floor(p);
    return o[i] + (o[Math.min(i + 1, o.length - 1)] - o[i]) * (p - i);
  }
  function desviacion(xs) {
    if (xs.length < 2) return 0;
    const m = media(xs);
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
  }

  function tramoDe(logro) { return TRAMOS.find((t) => logro >= t.desde && logro < t.hasta) || TRAMOS[0]; }

  // Nota chilena: lineal hasta la exigencia (nota de aprobación) y lineal desde ahí hasta la máxima
  function nota(logro) {
    const { exigencia: e, minima, maxima, aprobacion } = conf.escala;
    const n = logro < e ? minima + (aprobacion - minima) * (logro / e) : aprobacion + (maxima - aprobacion) * ((logro - e) / (1 - e));
    return Math.round(Math.min(maxima, Math.max(minima, n)) * 10 + 1e-9) / 10;
  }
  const notaTexto = (n) => (n == null ? '–' : n.toFixed(1).replace('.', ','));

  // Cortes de estándar del ensayo (fracciones de 0 a 1), o null si no están definidos
  function cortesDe(ensayo) {
    const c = ensayo && ensayo.cortes;
    if (!c || c.elemental == null || c.adecuado == null || c.elemental === '' || c.adecuado === '') return null;
    return { elemental: +c.elemental, adecuado: +c.adecuado };
  }
  function estandarDe(logro, ensayo) {
    const c = cortesDe(ensayo);
    if (!c) return null;
    return logro >= c.adecuado ? ESTANDARES[2] : logro >= c.elemental ? ESTANDARES[1] : ESTANDARES[0];
  }
  // Puntaje PAES según la tabla de conversión del ensayo (posición = n° de correctas)
  function tieneTabla(ensayo) { return !!(ensayo && Array.isArray(ensayo.tablaPaes) && ensayo.tablaPaes.length); }
  function puntajeDe(correctas, ensayo) {
    if (!tieneTabla(ensayo)) return null;
    const t = ensayo.tablaPaes;
    return t[Math.min(correctas, t.length - 1)];
  }

  // Tablas de conversión PAES (n° de respuestas correctas → puntaje), sin contar las preguntas piloto
  const TABLAS_PAES = {
    m1: { nombre: 'Competencia Matemática 1 (M1)', buscar: /\bM1\b|matem[aá]tica\s*1/i, puntajes: [100, 173, 196, 216, 236, 255, 273, 290, 305, 318, 331, 345, 360, 375, 389, 399, 408, 417, 426, 438, 452, 467, 480, 490, 498, 504, 511, 519, 530, 543, 558, 571, 582, 590, 597, 603, 611, 622, 635, 650, 664, 676, 685, 694, 704, 716, 730, 746, 761, 775, 789, 804, 821, 840, 860, 880, 903, 927, 955, 986, 1000] },
    lectora: { nombre: 'Competencia Lectora', buscar: /lector|lectura/i, puntajes: [100, 149, 172, 193, 214, 234, 253, 269, 284, 298, 313, 330, 347, 361, 373, 383, 393, 404, 417, 432, 447, 461, 472, 480, 487, 495, 504, 516, 531, 546, 560, 571, 580, 587, 594, 603, 614, 629, 644, 659, 671, 680, 689, 699, 711, 725, 741, 758, 772, 786, 799, 814, 832, 852, 871, 892, 913, 936, 963, 991, 1000] },
    m2: { nombre: 'Competencia Matemática 2 (M2)', buscar: /\bM2\b|matem[aá]tica\s*2/i, puntajes: [100, 204, 231, 255, 278, 298, 317, 336, 354, 371, 386, 399, 412, 426, 441, 456, 470, 481, 491, 501, 512, 525, 540, 553, 565, 574, 583, 592, 603, 616, 630, 644, 656, 666, 676, 687, 699, 714, 729, 744, 757, 770, 785, 801, 819, 837, 856, 876, 898, 1000] },
    ciencias: { nombre: 'Ciencias', buscar: /ciencias(?!\s*sociales)/i, puntajes: [100, 127, 144, 165, 185, 204, 221, 236, 250, 264, 278, 293, 306, 318, 327, 335, 345, 355, 368, 381, 393, 402, 409, 415, 420, 426, 435, 445, 458, 470, 481, 489, 494, 499, 503, 507, 513, 521, 533, 545, 558, 568, 575, 581, 585, 589, 593, 600, 610, 621, 634, 646, 656, 663, 669, 674, 681, 690, 701, 714, 728, 739, 749, 759, 769, 780, 795, 810, 825, 840, 856, 874, 893, 915, 938, 1000] },
    historia: { nombre: 'Historia y Ciencias Sociales', buscar: /historia/i, puntajes: [100, 132, 158, 181, 203, 224, 244, 263, 279, 294, 308, 324, 341, 357, 372, 383, 393, 402, 413, 426, 441, 457, 471, 482, 490, 497, 504, 513, 525, 539, 555, 569, 581, 590, 597, 604, 612, 623, 637, 653, 668, 681, 692, 701, 711, 722, 736, 753, 770, 785, 799, 814, 829, 848, 868, 888, 910, 932, 957, 985, 1000] },
  };
  // Tabla que corresponde a una asignatura PAES (o null si no se reconoce)
  function tablaParaAsignatura(asignatura) {
    const t = String(asignatura || '');
    for (const id of ['m1', 'm2', 'historia', 'lectora', 'ciencias']) if (TABLAS_PAES[id].buscar.test(t)) return id;
    return null;
  }

  // Preguntas que cuentan para el puntaje (todas menos las piloto)
  const puntuables = (ensayo) => ensayo.preguntas.filter((p) => !p.piloto);
  function contar(ensayo, respuestas) {
    let correctas = 0, n = 0;
    ensayo.preguntas.forEach((p, i) => { if (p.piloto) return; n++; if ((respuestas[i] || '') === p.clave) correctas++; });
    return { correctas, n, logro: n ? correctas / n : 0 };
  }

  // Fecha del ensayo para ordenar el historial (acepta dd-mm-aaaa o la fecha de creación)
  function fechaOrden(ensayo) {
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(ensayo.fecha || '');
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return (ensayo.creado || '').slice(0, 10);
  }

  // Nivel y letra de un curso. Si no están guardados, se deducen del nombre: "II°A", "4° básico B", "IV medio C".
  const ROMANOS = { I: 1, II: 2, III: 3, IV: 4 };
  function nivelDe(curso) {
    if (curso.nivel) return { nivel: curso.nivel, letra: curso.letra || '' };
    const t = String(curso.nombre || '').trim();
    const m = /^(\d{1,2}|I{1,3}|IV)\s*(?:°|º|o\b)?\s*(b[aá]sico|medio)?\s*([A-Za-z])?$/i.exec(t);
    if (!m) return { nivel: '', letra: '' };
    const romano = /^[IV]+$/i.test(m[1]);
    const num = romano ? ROMANOS[m[1].toUpperCase()] : parseInt(m[1], 10);
    let tipo = m[2] ? m[2].toLowerCase().replace('á', 'a') : (romano ? 'medio' : 'basico');
    if (tipo === 'basico') return { nivel: `${num}° básico`, letra: (m[3] || '').toUpperCase() };
    return { nivel: `${['', 'I', 'II', 'III', 'IV'][num] || num} medio`, letra: (m[3] || '').toUpperCase() };
  }

  /**
   * Análisis completo de un ensayo en un curso.
   * hojas: { idEstudiante: { respuestas: ['A', '', ...] } }
   */
  function analizar(ensayo, curso, hojas) {
    // Las preguntas piloto se muestran en el análisis por pregunta, pero no cuentan para el logro, la nota ni el puntaje
    const cuentan = ensayo.preguntas.map((p) => !p.piloto);
    const n = cuentan.filter(Boolean).length || 1;
    const pilotos = ensayo.preguntas.length - cuentan.filter(Boolean).length;
    const letras = 'ABCDE'.slice(0, ensayo.alternativas).split('');

    const estudiantes = curso.estudiantes.map((e) => {
      const h = hojas[e.id];
      if (!h) return { e, corregida: false };
      const r = ensayo.preguntas.map((_, i) => h.respuestas[i] || '');
      const aciertos = ensayo.preguntas.map((p, i) => r[i] === p.clave);
      const correctas = aciertos.filter((a, i) => a && cuentan[i]).length;
      const omitidas = r.filter((x, i) => !x && cuentan[i]).length;
      const logro = correctas / n;
      return {
        e, corregida: true, r, aciertos, correctas, omitidas, incorrectas: n - correctas - omitidas, logro,
        nota: nota(logro), estandar: estandarDe(logro, ensayo), puntaje: puntajeDe(correctas, ensayo),
      };
    });
    const hechas = estudiantes.filter((x) => x.corregida);
    const logros = hechas.map((x) => x.logro);

    // Grupos superior e inferior (27%) para discriminación
    const orden = hechas.slice().sort((a, b) => b.logro - a.logro);
    const k = Math.max(1, Math.round(orden.length * GRUPO_EXTREMO));
    const sup = orden.slice(0, k), inf = orden.slice(-k);

    const preguntas = ensayo.preguntas.map((p, i) => {
      const cuenta = Object.fromEntries([...letras, ''].map((l) => [l, 0]));
      hechas.forEach((x) => { cuenta[x.r[i]] = (cuenta[x.r[i]] || 0) + 1; });
      const total = hechas.length;
      const acierto = total ? cuenta[p.clave] / total : 0;
      const pSup = sup.length ? sup.filter((x) => x.aciertos[i]).length / sup.length : 0;
      const pInf = inf.length ? inf.filter((x) => x.aciertos[i]).length / inf.length : 0;
      const distractores = letras.filter((l) => l !== p.clave).map((l) => ({ letra: l, n: cuenta[l] })).sort((a, b) => b.n - a.n);
      return {
        ...p, i, cuenta, total, acierto, omision: total ? cuenta[''] / total : 0,
        discriminacion: hechas.length >= 4 ? pSup - pInf : null,
        distractor: distractores[0] && distractores[0].n ? distractores[0] : null,
        critica: !p.piloto && total > 0 && acierto < CRITICA,
      };
    });
    const validas = preguntas.filter((p) => !p.piloto);

    const agrupar = (campo) => {
      const g = new Map();
      validas.forEach((p) => {
        const clave = p[campo] || 'Sin dato';
        if (!g.has(clave)) g.set(clave, { nombre: clave, indices: [] });
        g.get(clave).indices.push(p.i);
      });
      return [...g.values()].map((x) => ({
        ...x, preguntas: x.indices.length,
        logro: media(x.indices.map((i) => preguntas[i].acierto)),
      }));
    };
    const porEje = agrupar('eje');
    const porHabilidad = agrupar('habilidad');

    // Mapa eje × habilidad
    const matriz = porEje.map((eje) => porHabilidad.map((hab) => {
      const idx = eje.indices.filter((i) => hab.indices.includes(i));
      return idx.length ? { preguntas: idx.length, logro: media(idx.map((i) => preguntas[i].acierto)) } : null;
    }));

    // Histograma de logro en tramos de 10 puntos
    const histograma = Array.from({ length: 10 }, (_, b) => ({ desde: b / 10, hasta: (b + 1) / 10, n: 0 }));
    logros.forEach((l) => { histograma[Math.min(9, Math.floor(l * 10))].n++; });

    // Histograma de notas: 1,0–1,9 · 2,0–2,9 · … · 6,0–7,0
    const { minima, maxima, aprobacion } = conf.escala;
    const histNotas = [];
    for (let d = Math.floor(minima); d < maxima; d++) histNotas.push({ desde: d, hasta: d + 1, n: 0 });
    hechas.forEach((x) => { const b = histNotas.find((t) => x.nota >= t.desde && (x.nota < t.hasta || t.hasta >= maxima)); if (b) b.n++; });

    const tramos = TRAMOS.map((t) => ({ ...t, n: hechas.filter((x) => tramoDe(x.logro).id === t.id).length }));
    const estandares = cortesDe(ensayo) ? ESTANDARES.map((s) => ({ ...s, n: hechas.filter((x) => x.estandar.id === s.id).length })) : null;
    const puntajes = tieneTabla(ensayo) ? hechas.map((x) => x.puntaje).filter((v) => v != null) : [];

    return {
      ensayo, curso, n, pilotos, letras, estudiantes, hechas, preguntas, porEje, porHabilidad, matriz, histograma, histNotas, tramos, estandares,
      resumen: {
        corregidas: hechas.length, total: curso.estudiantes.length,
        media: media(logros), mediana: mediana(logros), desviacion: desviacion(logros),
        q1: cuantil(logros, 0.25), q3: cuantil(logros, 0.75),
        min: logros.length ? Math.min(...logros) : 0, max: logros.length ? Math.max(...logros) : 0,
        criticas: preguntas.filter((p) => p.critica).length,
        omision: media(hechas.map((x) => x.omitidas / n)),
        notaMedia: hechas.length ? Math.round(media(hechas.map((x) => x.nota)) * 10) / 10 : null,
        aprobados: hechas.filter((x) => x.nota >= aprobacion).length,
        puntajeMedia: puntajes.length ? Math.round(media(puntajes)) : null,
        puntajeMin: puntajes.length ? Math.min(...puntajes) : null,
        puntajeMax: puntajes.length ? Math.max(...puntajes) : null,
        adecuado: estandares && hechas.length ? estandares[2].n / hechas.length : null,
      },
    };
  }

  // Perfil de un estudiante comparado con su curso (y con el nivel, si se entrega su análisis)
  function perfil(analisis, idEst, analisisNivel) {
    const x = analisis.estudiantes.find((y) => y.e.id === idEst);
    if (!x || !x.corregida) return null;
    const comparar = (grupos, gruposNivel) => grupos.map((g) => {
      const gn = gruposNivel && gruposNivel.find((y) => y.nombre === g.nombre);
      return {
        nombre: g.nombre, preguntas: g.preguntas, curso: g.logro, nivel: gn ? gn.logro : null,
        propio: media(g.indices.map((i) => (x.aciertos[i] ? 1 : 0))),
      };
    });
    const posicion = analisis.hechas.filter((y) => y.logro > x.logro).length + 1;
    return {
      ...x, porEje: comparar(analisis.porEje, analisisNivel && analisisNivel.porEje),
      porHabilidad: comparar(analisis.porHabilidad, analisisNivel && analisisNivel.porHabilidad), posicion, tramo: tramoDe(x.logro),
    };
  }

  // Ensayos comparables con uno dado: misma asignatura (o mismo tipo si no tiene asignatura)
  const grupoEnsayo = (e) => e.asignatura || e.tipo;

  /**
   * Historial de un curso: ensayos de la misma asignatura (o tipo) con resultados, en orden de fecha.
   * obtenerHojas(ensayo) devuelve las hojas del curso para ese ensayo.
   */
  function historial(ensayos, curso, obtenerHojas, filtro) {
    const lista = ensayos
      .filter((e) => !filtro || grupoEnsayo(e) === filtro)
      .map((e) => ({ ensayo: e, analisis: analizar(e, curso, obtenerHojas(e)) }))
      .filter((x) => x.analisis.hechas.length)
      .sort((a, b) => fechaOrden(a.ensayo).localeCompare(fechaOrden(b.ensayo)));
    const ejes = [...new Set(lista.flatMap((x) => x.analisis.porEje.map((g) => g.nombre)))];
    return {
      puntos: lista.map((x) => ({ ensayo: x.ensayo, media: x.analisis.resumen.media, corregidas: x.analisis.hechas.length, porEje: x.analisis.porEje })),
      ejes: ejes.map((nombre) => ({
        nombre,
        serie: lista.map((x) => { const g = x.analisis.porEje.find((y) => y.nombre === nombre); return g ? g.logro : null; }),
      })),
      estudiantes: curso.estudiantes.map((e) => ({
        e,
        serie: lista.map((x) => { const y = x.analisis.estudiantes.find((z) => z.e.id === e.id); return y && y.corregida ? y.logro : null; }),
      })),
    };
  }

  // Une los cursos de un nivel en un curso virtual para analizarlos como uno solo
  function cursoNivel(cursos, nombre) {
    return { id: 'nivel', nombre, estudiantes: cursos.flatMap((c) => c.estudiantes) };
  }
  function hojasNivel(cursos, obtenerHojas) {
    return Object.assign({}, ...cursos.map((c) => obtenerHojas(c)));
  }

  /**
   * Un ensayo en todos los paralelos de un nivel.
   * cursos: los cursos del nivel (en orden). obtenerHojas(curso) da las hojas de ese curso en el ensayo.
   */
  function nivel(ensayo, cursos, obtenerHojas, nombreNivel) {
    const porCurso = cursos.map((c, idx) => ({ curso: c, idx, A: analizar(ensayo, c, obtenerHojas(c)) })).filter((x) => x.A.hechas.length);
    const conDatos = porCurso.map((x) => x.curso);
    const A = analizar(ensayo, cursoNivel(conDatos, nombreNivel), hojasNivel(conDatos, obtenerHojas));
    // Brecha entre paralelos en cada pregunta
    const preguntas = A.preguntas.map((p) => {
      const vals = porCurso.map((x) => x.A.preguntas[p.i].acierto);
      return { n: p.n, i: p.i, eje: p.eje, acierto: p.acierto, porCurso: vals, brecha: vals.length > 1 ? Math.max(...vals) - Math.min(...vals) : 0 };
    });
    return { ensayo, porCurso, A, preguntas, brechas: preguntas.filter((p) => p.brecha >= BRECHA).sort((a, b) => b.brecha - a.brecha) };
  }

  /**
   * Evolución de un nivel: ensayos de la misma asignatura con resultados en algún paralelo.
   * obtenerHojas(ensayo, curso)
   */
  function historialNivel(ensayos, cursos, obtenerHojas, filtro, nombreNivel) {
    return ensayos
      .filter((e) => !filtro || grupoEnsayo(e) === filtro)
      .map((e) => {
        const N = nivel(e, cursos, (c) => obtenerHojas(e, c), nombreNivel);
        return {
          ensayo: e, A: N.A,
          porCurso: cursos.map((c) => { const x = N.porCurso.find((y) => y.curso.id === c.id); return x ? x.A.resumen.media : null; }),
        };
      })
      .filter((x) => x.A.hechas.length)
      .sort((a, b) => fechaOrden(a.ensayo).localeCompare(fechaOrden(b.ensayo)));
  }

  /**
   * Alertas de los estudiantes de un curso en un ensayo.
   * H: historial del curso (para el cambio respecto del ensayo anterior y los últimos tres).
   */
  function alertas(A, H) {
    const u = conf.umbrales;
    const idx = H ? H.puntos.findIndex((p) => p.ensayo.id === A.ensayo.id) : -1;
    return A.hechas.map((x) => {
      const serie = idx >= 0 ? (H.estudiantes.find((s) => s.e.id === x.e.id) || { serie: [] }).serie.slice(0, idx + 1) : [];
      const previo = serie.slice(0, -1).filter((v) => v != null).pop();
      const cambio = previo == null ? null : x.logro - previo;
      const ultimos = serie.filter((v) => v != null).slice(-3);
      const lista = [];
      if (x.logro < u.riesgo && cambio != null && cambio < 0) lista.push({ id: 'riesgo', texto: 'Bajo logro y bajando' });
      else if (ultimos.length >= 3 && ultimos.every((v) => v < u.riesgo)) lista.push({ id: 'riesgo', texto: `Bajo ${Math.round(u.riesgo * 100)}% en los tres últimos ensayos` });
      else if (x.logro < u.riesgo) lista.push({ id: 'bajo', texto: `Bajo ${Math.round(u.riesgo * 100)}% de logro` });
      else if (x.nota < conf.escala.aprobacion) lista.push({ id: 'bajo', texto: `Nota bajo ${notaTexto(conf.escala.aprobacion)}` });
      if (cambio != null && cambio <= -u.baja) lista.push({ id: 'baja', texto: `Bajó ${Math.round(-cambio * 100)} puntos` });
      if (x.omitidas / A.n > u.omision) lista.push({ id: 'omision', texto: `${x.omitidas} preguntas en blanco` });
      const peso = { riesgo: 3, baja: 2, bajo: 1, omision: 1 };
      return { x, cambio, previo, alertas: lista, gravedad: lista.reduce((s, a) => s + peso[a.id], 0) };
    });
  }

  // Grupos de reforzamiento: cada estudiante va al eje (o habilidad) donde tiene su logro más bajo, si está bajo el umbral
  function grupos(A, campo = 'eje') {
    const u = conf.umbrales;
    const fuente = campo === 'habilidad' ? A.porHabilidad : A.porEje;
    const g = new Map(fuente.map((f) => [f.nombre, { nombre: f.nombre, preguntas: f.preguntas, logroCurso: f.logro, estudiantes: [] }]));
    A.hechas.forEach((x) => {
      let peor = null;
      fuente.forEach((f) => {
        const propio = media(f.indices.map((i) => (x.aciertos[i] ? 1 : 0)));
        if (!peor || propio < peor.propio) peor = { nombre: f.nombre, propio };
      });
      if (peor && peor.propio < u.riesgo) g.get(peor.nombre).estudiantes.push({ x, logro: peor.propio });
    });
    return [...g.values()].filter((x) => x.estudiantes.length)
      .map((x) => ({ ...x, estudiantes: x.estudiantes.sort((a, b) => a.logro - b.logro) }))
      .sort((a, b) => b.estudiantes.length - a.estudiantes.length);
  }

  // Confiabilidad del ensayo en el grupo (KR-20). Sobre 0,7 los resultados son consistentes; necesita al menos 5 hojas.
  function confiabilidad(A) {
    const validas = A.preguntas.filter((p) => !p.piloto);
    const k = validas.length, totales = A.hechas.map((x) => x.correctas);
    if (k < 2 || totales.length < 5) return null;
    const m = media(totales), v = totales.reduce((s, x) => s + (x - m) ** 2, 0) / totales.length;
    if (!v) return null;
    const spq = validas.reduce((s, p) => s + p.acierto * (1 - p.acierto), 0);
    return Math.max(0, Math.min(1, (k / (k - 1)) * (1 - spq / v)));
  }

  // Clasificación de una pregunta por dificultad (acierto) y discriminación
  function calidadPregunta(p) {
    const dif = p.acierto >= 0.75 ? 'fácil' : p.acierto >= 0.4 ? 'media' : 'difícil';
    const d = p.discriminacion;
    const disc = d == null ? null : d >= 0.3 ? 'buena' : d >= 0.2 ? 'aceptable' : 'baja';
    return { dif, disc, revisar: d != null && d < 0.2 };
  }

  /**
   * Análisis técnico de un estudiante: posición en el curso, fortalezas y debilidades por eje y habilidad,
   * patrón de respuestas y cuánto le falta para el siguiente tramo.
   */
  function tecnico(A, idEst, AN) {
    const P = perfil(A, idEst, AN);
    if (!P) return null;
    const logros = A.hechas.map((x) => x.logro);
    const bajo = logros.filter((v) => v < P.logro).length, igual = logros.filter((v) => v === P.logro).length;
    const percentil = Math.round(((bajo + igual / 2) / logros.length) * 100);
    const de = A.resumen.desviacion;
    const z = de ? (P.logro - A.resumen.media) / de : 0;
    const validas = A.preguntas.filter((p) => !p.piloto);
    const marcar = (gs) => gs.filter((g) => g.nombre !== 'Sin dato').map((g) => ({ ...g, dif: g.propio - g.curso }));
    const ejes = marcar(P.porEje), habs = marcar(P.porHabilidad);
    const fuerte = (g) => g.propio >= 0.75 || (g.dif >= 0.1 && g.propio >= 0.5);
    const debil = (g) => g.propio < 0.5 || g.dif <= -0.1;
    // Fáciles para el curso que falló (posible descuido) y difíciles que acertó
    const falloFaciles = validas.filter((p) => p.acierto >= 0.7 && !P.aciertos[p.i] && P.r[p.i]);
    const aciertoDificiles = validas.filter((p) => p.acierto < 0.4 && P.aciertos[p.i]);
    // Coincidencia con el error más común del curso
    const conDistractor = validas.filter((p) => p.distractor && P.r[p.i] === p.distractor.letra);
    const erradas = validas.filter((p) => P.r[p.i] && !P.aciertos[p.i]);
    // Siguiente meta
    let meta = null;
    if (tieneTabla(A.ensayo) && P.puntaje != null) {
      const objetivo = Math.floor(P.puntaje / 50) * 50 + 50;
      for (let c = P.correctas + 1; c <= A.n; c++) {
        const pt = puntajeDe(c, A.ensayo);
        if (pt != null && pt >= objetivo) { meta = { faltan: c - P.correctas, texto: `${pt} puntos`, valor: pt }; break; }
      }
    } else if (cortesDe(A.ensayo)) {
      const c = cortesDe(A.ensayo);
      const sig = P.logro < c.elemental ? ['Elemental', c.elemental] : P.logro < c.adecuado ? ['Adecuado', c.adecuado] : null;
      if (sig) meta = { faltan: Math.ceil(sig[1] * A.n - 1e-9) - P.correctas, texto: `el nivel ${sig[0]}` };
    }
    if (!meta) {
      const ap = conf.escala.aprobacion;
      if (P.nota < ap) { let c = P.correctas; while (c < A.n && nota((c) / A.n) < ap) c++; meta = { faltan: c - P.correctas, texto: `nota ${notaTexto(ap)}` }; }
    }
    // Contenidos de las preguntas falladas (si el ensayo los trae)
    const contenidos = new Map();
    validas.filter((p) => !P.aciertos[p.i] && p.contenido).forEach((p) => contenidos.set(p.contenido, (contenidos.get(p.contenido) || 0) + 1));
    return {
      ...P, percentil, z, ejes, habs,
      fortalezas: { ejes: ejes.filter(fuerte).sort((a, b) => b.propio - a.propio), habs: habs.filter(fuerte).sort((a, b) => b.propio - a.propio) },
      debilidades: { ejes: ejes.filter(debil).sort((a, b) => a.propio - b.propio), habs: habs.filter(debil).sort((a, b) => a.propio - b.propio) },
      falloFaciles, aciertoDificiles, conDistractor, erradas, meta,
      contenidosFallados: [...contenidos].sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ contenido: c, n })),
    };
  }

  return {
    TABLAS_PAES, tablaParaAsignatura, puntuables, contar,
    TRAMOS, ESTANDARES, CRITICA, BRECHA, POR_DEFECTO, configurar, get conf() { return conf; },
    analizar, perfil, tecnico, confiabilidad, calidadPregunta, historial, nivel, historialNivel, alertas, grupos,
    tramoDe, nota, notaTexto, cortesDe, estandarDe, tieneTabla, puntajeDe, nivelDe, grupoEnsayo, fechaOrden, media,
  };
})();
