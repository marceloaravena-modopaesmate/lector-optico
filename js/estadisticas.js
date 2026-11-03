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
    // Niveles de desempeño por % de logro (no son cortes oficiales de PAES ni SIMCE)
    niveles: { medio: 0.5, alto: 0.75 },
    // Alertas institucionales del informe directivo
    institucional: { brechaCurso: 0.08, ejeBajo: 0.5, participacion: 0.85, dispersion: 0.2, concentracionBaja: 0.4 },
  };
  let conf = JSON.parse(JSON.stringify(POR_DEFECTO));
  // Nombres: las listas pueden venir como "Nombres Apellidos" o "Apellidos Nombres".
  // Se detecta con apellidos frecuentes en Chile (o con una coma: "Apellidos, Nombres"); en Ajustes se puede fijar.
  const sinTilde = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const APELLIDOS = new Set(('gonzalez munoz rojas diaz perez soto contreras silva martinez sepulveda morales rodriguez lopez fuentes hernandez torres araya flores espinoza valenzuela castillo tapia reyes gutierrez castro pizarro alvarez vasquez sanchez fernandez ramirez carrasco gomez cortes herrera nunez jara vergara rivera figueroa riquelme garcia miranda bravo vera molina vega campos sandoval orellana cardenas olivares alarcon gallardo ortiz garrido salazar guzman henriquez saavedra navarro aguilera parra romero aravena vargas vidal medina pino lagos mella caceres muñoz leiva cofre zuniga yanez poblete ruiz mendez rios toro alvarado salinas pena ponce paredes palma acuna jimenez venegas escobar cisternas troncoso salas gaete quezada bustos osorio carvajal donoso ibarra arancibia moreno farias ramos godoy diaz lara inostroza quiroz hidalgo meza mora navarrete orellana sole marin burgos cid aguilar sierra lillo correa mardones villalobos ulloa vallejos uribe barra benavides castro calderon espinosa gajardo maldonado mansilla montecinos naranjo neira oyarzun pavez pinto retamal rubio sanhueza toledo urrutia valdes valdebenito vasquez vivanco zamora').split(' '));
  let formatoNombre = 'auto';
  const titulo = (t) => (t === t.toUpperCase() ? t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : t);
  // pila: primer nombre · corto: primer nombre y primer apellido · completo: nombres y apellidos en orden normal
  function nombres(n) {
    const limpio = String(n || '').trim().replace(/\s+/g, ' ');
    if (limpio.includes(',')) {
      const [ap, no] = limpio.split(',').map((x) => titulo(x.trim()));
      const pila = (no || ap).split(' ')[0];
      return { pila, corto: no ? `${pila} ${ap.split(' ')[0]}` : pila, completo: [no, ap].filter(Boolean).join(' ') };
    }
    const p = titulo(limpio).split(' ');
    let apellidoPrimero = formatoNombre === 'apellido';
    if (formatoNombre === 'auto' && p.length >= 3) {
      const es = (w) => APELLIDOS.has(sinTilde(w || ''));
      apellidoPrimero = (es(p[0]) + es(p[1])) > (es(p[p.length - 1]) + es(p[p.length - 2]));
    }
    if (!apellidoPrimero || p.length < 2) {
      const corto = p.length >= 4 ? `${p[0]} ${p[p.length - 2]}` : p.length >= 2 ? `${p[0]} ${p[1]}` : p[0] || '';
      return { pila: p[0] || '', corto, completo: p.join(' ') };
    }
    const k = p.length >= 3 ? 2 : 1; // dos apellidos si hay al menos tres palabras
    return { pila: p[k], corto: `${p[k]} ${p[0]}`, completo: [...p.slice(k), ...p.slice(0, k)].join(' ') };
  }

  function configurar(c) {
    formatoNombre = (c && c.formatoNombre) || 'auto';
    conf = {
      escala: { ...POR_DEFECTO.escala, ...((c && c.escala) || {}) },
      umbrales: { ...POR_DEFECTO.umbrales, ...((c && c.umbrales) || {}) },
      niveles: { ...POR_DEFECTO.niveles, ...((c && c.niveles) || {}) },
      institucional: { ...POR_DEFECTO.institucional, ...((c && c.institucional) || {}) },
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

  // Tramos con los cortes configurados en Ajustes
  function tramos() {
    const { medio, alto } = conf.niveles, p = (v) => Math.round(v * 100);
    return [
      { id: 'bajo', nombre: 'Bajo', desde: 0, hasta: medio, texto: `menos de ${p(medio)}%` },
      { id: 'medio', nombre: 'Medio', desde: medio, hasta: alto, texto: `${p(medio)}% a ${p(alto) - 1}%` },
      { id: 'alto', nombre: 'Alto', desde: alto, hasta: 1.01, texto: `${p(alto)}% o más` },
    ];
  }
  function tramoDe(logro) { const T = tramos(); return T.find((t) => logro >= t.desde && logro < t.hasta) || T[0]; }

  /**
   * Indicadores descriptivos de una lista de números.
   * Varianza y desviación estándar son MUESTRALES (dividen por n − 1), igual en toda la app.
   * Cuartiles por interpolación lineal entre posiciones (método 7 de Hyndman y Fan, el de Excel CUARTIL.INC).
   * Moda: los valores que más se repiten; vacía si ningún valor se repite.
   */
  function describir(xs) {
    const n = xs.length;
    if (!n) return { n: 0, suma: 0, media: null, mediana: null, moda: [], varianza: null, desviacion: null, min: null, max: null, q1: null, q3: null, iqr: null };
    const m = media(xs);
    const varianza = n > 1 ? xs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1) : 0;
    const frec = new Map();
    xs.forEach((x) => { const k = Math.round(x * 1e6) / 1e6; frec.set(k, (frec.get(k) || 0) + 1); });
    const tope = Math.max(...frec.values());
    const moda = tope > 1 ? [...frec].filter(([, f]) => f === tope).map(([v]) => v).sort((a, b) => a - b) : [];
    const q1 = cuantil(xs, 0.25), q3 = cuantil(xs, 0.75);
    return { n, suma: xs.reduce((s, x) => s + x, 0), media: m, mediana: mediana(xs), moda, varianza, desviacion: Math.sqrt(varianza), min: Math.min(...xs), max: Math.max(...xs), q1, q3, iqr: q3 - q1 };
  }

  /**
   * Revisa los datos antes de calcular. errores: impiden un informe confiable. avisos: se informan pero no bloquean.
   */
  function validar(ensayo, curso, hojas) {
    const errores = [], avisos = [];
    const letras = 'ABCDE'.slice(0, ensayo.alternativas || 4);
    const P = ensayo.preguntas || [];
    if (!P.length) errores.push('El ensayo no tiene preguntas.');
    const sinClave = P.filter((p) => !p.clave || !letras.includes(p.clave)).map((p) => p.n);
    if (sinClave.length) errores.push(`Preguntas sin clave válida: ${sinClave.join(', ')}.`);
    const nums = P.map((p) => p.n), rep = nums.filter((v, i) => nums.indexOf(v) !== i);
    if (rep.length) errores.push(`Números de pregunta repetidos: ${[...new Set(rep)].join(', ')}.`);
    const validas = P.filter((p) => !p.piloto);
    const sinEje = validas.filter((p) => !p.eje).map((p) => p.n), sinHab = validas.filter((p) => !p.habilidad).map((p) => p.n);
    if (sinEje.length) avisos.push(`${sinEje.length} pregunta${sinEje.length === 1 ? '' : 's'} sin eje (${sinEje.slice(0, 12).join(', ')}${sinEje.length > 12 ? '…' : ''}): quedan como "Sin dato".`);
    if (sinHab.length) avisos.push(`${sinHab.length} pregunta${sinHab.length === 1 ? '' : 's'} sin habilidad (${sinHab.slice(0, 12).join(', ')}${sinHab.length > 12 ? '…' : ''}).`);
    if (curso) {
      const ids = new Set(curso.estudiantes.map((e) => e.id));
      const ajenas = Object.keys(hojas || {}).filter((id) => !ids.has(id));
      if (ajenas.length) avisos.push(`${ajenas.length} hoja${ajenas.length === 1 ? '' : 's'} de estudiantes que ya no están en la lista del curso: no se cuentan.`);
      const nombres = curso.estudiantes.map((e) => String(e.nombre).trim().toLowerCase());
      const dup = curso.estudiantes.filter((e, i) => nombres.indexOf(nombres[i]) !== i).map((e) => e.nombre);
      if (dup.length) avisos.push(`Estudiantes repetidos en la lista del curso: ${[...new Set(dup)].join(', ')}.`);
    }
    const largo = [], raras = [];
    Object.entries(hojas || {}).forEach(([id, h]) => {
      const r = h.respuestas || [];
      if (r.length !== P.length) largo.push(id);
      if (r.some((x) => x && !letras.includes(x))) raras.push(id);
    });
    const nombre = (id) => { const e = curso && curso.estudiantes.find((x) => x.id === id); return e ? e.nombre : id; };
    if (largo.length) errores.push(`Hojas con una cantidad de respuestas distinta a la de preguntas (${P.length}): ${largo.slice(0, 6).map(nombre).join(', ')}${largo.length > 6 ? '…' : ''}. Revísalas o vuelve a leerlas.`);
    if (raras.length) errores.push(`Hojas con marcas que no son alternativas válidas (${letras.split('').join(', ')}): ${raras.slice(0, 6).map(nombre).join(', ')}${raras.length > 6 ? '…' : ''}.`);
    return { errores, avisos, ok: !errores.length };
  }

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
        // dificultad = proporción de respuestas correctas (convención clásica: más alto = más fácil)
        correctas: cuenta[p.clave] || 0, omisiones: cuenta[''] || 0, incorrectas: total - (cuenta[p.clave] || 0) - (cuenta[''] || 0),
        dificultad: acierto, masElegida: letras.slice().sort((a, b) => cuenta[b] - cuenta[a])[0],
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
    // Contenido y OA solo si el ensayo los trae; nunca se inventan
    const porContenido = validas.some((p) => p.contenido) ? agrupar('contenido').filter((g) => g.nombre !== 'Sin dato') : [];
    const porOA = validas.some((p) => p.oa) ? agrupar('oa').filter((g) => g.nombre !== 'Sin dato') : [];

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

    const porTramo = tramos().map((t) => ({ ...t, n: hechas.filter((x) => tramoDe(x.logro).id === t.id).length }));
    const estandares = cortesDe(ensayo) ? ESTANDARES.map((s) => ({ ...s, n: hechas.filter((x) => x.estandar.id === s.id).length })) : null;
    const puntajes = tieneTabla(ensayo) ? hechas.map((x) => x.puntaje).filter((v) => v != null) : [];

    return {
      ensayo, curso, n, pilotos, letras, estudiantes, hechas, preguntas, porEje, porHabilidad, porContenido, porOA, matriz, histograma, histNotas, tramos: porTramo, estandares,
      resumen: {
        corregidas: hechas.length, total: curso.estudiantes.length,
        ausentes: curso.estudiantes.length - hechas.length,
        participacion: curso.estudiantes.length ? hechas.length / curso.estudiantes.length : 0,
        correctasTotal: hechas.reduce((s, x) => s + x.correctas, 0),
        incorrectasTotal: hechas.reduce((s, x) => s + x.incorrectas, 0),
        omitidasTotal: hechas.reduce((s, x) => s + x.omitidas, 0),
        // Logro agregado: todas las respuestas correctas / todas las respuestas válidas esperadas.
        // Coincide con el promedio de los logros individuales cuando todos responden el mismo ensayo.
        logroAgregado: hechas.length ? hechas.reduce((s, x) => s + x.correctas, 0) / (hechas.length * n) : 0,
        dCorrectas: describir(hechas.map((x) => x.correctas)), dLogro: describir(logros),
        dPuntaje: tieneTabla(ensayo) ? describir(hechas.map((x) => x.puntaje).filter((v) => v != null)) : null,
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
      else if (x.logro < conf.niveles.medio - 1e-9) lista.push({ id: 'bajo', texto: `Nivel Bajo de desempeño (menos de ${Math.round(conf.niveles.medio * 100)}%)` });
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
      // Sin notas: la meta siguiente es el nivel de desempeño superior
      const nv = conf.niveles, sig = P.logro < nv.medio ? ['Medio', nv.medio] : P.logro < nv.alto ? ['Alto', nv.alto] : null;
      if (sig) meta = { faltan: Math.ceil(sig[1] * A.n - 1e-9) - P.correctas, texto: `el nivel ${sig[0]}` };
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

  /**
   * Consolida los resultados de un estudiante en varios ensayos.
   * sel: [{ ens, A }] (A = analizar del ensayo en su curso). ejes: nombres de temáticas a incluir (null = todas).
   * Se agrupa por instrumento (asignatura): PAES M1 y M2, por ejemplo, nunca se mezclan.
   * Logro consolidado = suma de correctas / suma de preguntas válidas (no se promedian porcentajes).
   * Cada ensayo cuenta una sola vez aunque venga repetido.
   */
  function consolidar(idEst, sel, ejes) {
    const vistos = new Set(), grupos = new Map();
    sel.forEach(({ ens, A }) => {
      if (vistos.has(ens.id)) return;
      vistos.add(ens.id);
      const x = A.estudiantes.find((y) => y.e.id === idEst);
      if (!x || !x.corregida) return;
      const incl = A.preguntas.filter((p) => !p.piloto && (!ejes || ejes.includes(p.eje || 'Sin dato')));
      if (!incl.length) return;
      const k = grupoEnsayo(ens);
      if (!grupos.has(k)) grupos.set(k, { nombre: k, ensayos: [] });
      const correctas = incl.filter((p) => x.aciertos[p.i]).length, omisiones = incl.filter((p) => !x.r[p.i]).length;
      const cursoLogro = media(incl.map((p) => p.acierto));
      grupos.get(k).ensayos.push({ ens, A, x, preguntas: incl, correctas, omisiones, incorrectas: incl.length - correctas - omisiones, logro: correctas / incl.length, cursoLogro });
    });
    return [...grupos.values()].map((g) => {
      g.ensayos.sort((a, b) => fechaOrden(a.ens).localeCompare(fechaOrden(b.ens)));
      const suma = (f) => g.ensayos.reduce((s, e) => s + e[f], 0);
      const preguntas = g.ensayos.reduce((s, e) => s + e.preguntas.length, 0);
      const juntar = (campo) => {
        const m = new Map();
        g.ensayos.forEach((e, j) => e.preguntas.forEach((p) => {
          const n = p[campo] || 'Sin dato';
          if (!m.has(n)) m.set(n, { nombre: n, preguntas: 0, correctas: 0, porEnsayo: g.ensayos.map(() => null) });
          const o = m.get(n); o.preguntas++; if (e.x.aciertos[p.i]) o.correctas++;
          const pe = o.porEnsayo[j] || (o.porEnsayo[j] = { preguntas: 0, correctas: 0 }); pe.preguntas++; if (e.x.aciertos[p.i]) pe.correctas++;
        }));
        return [...m.values()].map((o) => ({ ...o, logro: o.correctas / o.preguntas, serie: o.porEnsayo.map((pe) => (pe ? pe.correctas / pe.preguntas : null)) }))
          .sort((a, b) => b.logro - a.logro);
      };
      const porEje = juntar('eje'), porHabilidad = juntar('habilidad');
      const recurrente = (lista, f) => lista.filter((o) => { const v = o.serie.filter((z) => z != null); return v.length >= 2 && v.every(f); });
      const primero = g.ensayos[0], ultimo = g.ensayos[g.ensayos.length - 1];
      return {
        ...g, cantidad: g.ensayos.length, preguntas, correctas: suma('correctas'), incorrectas: suma('incorrectas'), omisiones: suma('omisiones'),
        logro: preguntas ? suma('correctas') / preguntas : 0,
        porEje, porHabilidad,
        fortalezas: recurrente(porEje.filter((o) => o.nombre !== 'Sin dato'), (v) => v >= 0.7),
        persistentes: recurrente(porEje.filter((o) => o.nombre !== 'Sin dato'), (v) => v < 0.5),
        cambio: g.ensayos.length >= 2 ? ultimo.logro - primero.logro : null,
        // Cambio relativo al curso: descuenta en parte la diferencia de dificultad entre ensayos
        cambioRelativo: g.ensayos.length >= 2 ? (ultimo.logro - ultimo.cursoLogro) - (primero.logro - primero.cursoLogro) : null,
      };
    });
  }

  return {
    TABLAS_PAES, tablaParaAsignatura, puntuables, contar,
    TRAMOS, tramos, describir, nombres, validar, consolidar, ESTANDARES, CRITICA, BRECHA, POR_DEFECTO, configurar, get conf() { return conf; },
    analizar, perfil, tecnico, confiabilidad, calidadPregunta, historial, nivel, historialNivel, alertas, grupos,
    tramoDe, nota, notaTexto, cortesDe, estandarDe, tieneTabla, puntajeDe, nivelDe, grupoEnsayo, fechaOrden, media,
  };
})();
