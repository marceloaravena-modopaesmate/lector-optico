/*
 * Informes en PDF (jsPDF), pensados para leerse y explicarse: frases en lenguaje simple y pocos gráficos grandes.
 *  - curso(ctx): informe del curso en un ensayo, con comparación de paralelos y evolución si hay datos.
 *  - estudiantes(ctx, ids): una página por estudiante, para entregar a cada uno o a su apoderado.
 * ctx lo arma la app: { ens, cur, A, H, AL, G, N, HN, nivel, paralelos }.
 * Todo se dibuja como vector: los gráficos se ven nítidos al imprimir.
 */
const Informe = (() => {
  const C = {
    azul: '#1A4080', serie: '#2a78d6', critico: '#c4561d', texto: '#18202E', texto2: '#535D72', suave: '#E6ECF7',
    grid: '#E3E7EE', pista: '#ECEEF2', gris: '#A9B1BF', t1: '#9ec5f4', t2: '#2a78d6', t3: '#104281',
    cat: ['#2a78d6', '#1baf7a', '#6250d6', '#eda100', '#e87ba4'],
  };
  const ANCHO = 215.9, ALTO = 279.4, M = 18, W = ANCHO - 2 * M, PIE = 14;

  const pct = (x) => Math.round(x * 100) + '%';
  const pts = (d) => Math.abs(Math.round(d * 100)) + (Math.abs(Math.round(d * 100)) === 1 ? ' punto' : ' puntos');
  const nt = (n) => (n == null ? '–' : n.toFixed(1).replace('.', ','));
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const nombrePila = (n) => String(n || '').split(/\s+/)[0];
  const lista = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1]);
  const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- Página y cursor ----------
  function nuevoDoc(pie) {
    const doc = new jspdf.jsPDF({ unit: 'mm', format: 'letter' });
    const P = { doc, y: M, pie };
    P.cabe = (alto) => { if (P.y + alto > ALTO - M - PIE) { doc.addPage(); P.y = M; return false; } return true; };
    return P;
  }
  function fuente(doc, tam, estilo = 'normal', color = C.texto) { doc.setFont('helvetica', estilo); doc.setFontSize(tam); doc.setTextColor(color); }
  const altoLinea = (tam) => tam * 0.3528 * 1.38;

  function piePaginas(P) {
    const { doc } = P, n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(C.grid); doc.setLineWidth(0.3); doc.line(M, ALTO - M - 4, ANCHO - M, ALTO - M - 4);
      fuente(doc, 8, 'normal', C.texto2);
      doc.text(P.pie, M, ALTO - M + 1);
      doc.text(`Página ${i} de ${n}`, ANCHO - M, ALTO - M + 1, { align: 'right' });
    }
  }

  function banda(P, titulo, sub, detalle) {
    const { doc } = P;
    const alto = detalle ? 38 : 32;
    doc.setFillColor(C.azul); doc.rect(0, 0, ANCHO, alto, 'F');
    fuente(doc, 20, 'bold', '#FFFFFF'); doc.text(titulo, M, 15);
    fuente(doc, 11.5, 'normal', '#FFFFFF'); doc.text(doc.splitTextToSize(sub, W)[0], M, 23);
    if (detalle) { fuente(doc, 9.5, 'normal', '#C9D6F0'); doc.text(detalle, M, 30); }
    P.y = alto + 10;
  }

  // sigue: alto mínimo del contenido que viene, para que el título no quede solo al pie de la página
  function titulo(P, texto, antes = 6, sigue = 30) {
    P.cabe(antes + 6 + sigue);
    P.y += antes;
    fuente(P.doc, 13, 'bold', C.azul); P.doc.text(texto, M, P.y);
    P.y += 6;
  }

  function parrafo(P, texto, { tam = 10.5, color = C.texto, estilo = 'normal', ancho = W, x = M } = {}) {
    const { doc } = P;
    fuente(doc, tam, estilo, color);
    const lineas = doc.splitTextToSize(texto, ancho);
    const lh = altoLinea(tam);
    lineas.forEach((l) => { P.cabe(lh); doc.text(l, x, P.y + lh * 0.75); P.y += lh; });
    P.y += 1.5;
  }

  function vinetas(P, items, { tam = 10.5 } = {}) {
    const { doc } = P;
    items.forEach((t) => {
      fuente(doc, tam);
      const lineas = doc.splitTextToSize(t, W - 6);
      const lh = altoLinea(tam);
      P.cabe(lh * Math.min(lineas.length, 3));
      doc.setFillColor(C.azul); doc.circle(M + 1.3, P.y + lh * 0.5, 0.9, 'F');
      lineas.forEach((l) => { P.cabe(lh); fuente(doc, tam); doc.text(l, M + 5, P.y + lh * 0.75); P.y += lh; });
      P.y += 1.6;
    });
  }

  // Cifras grandes en una fila
  function cifras(P, items) {
    const { doc } = P, gap = 4, n = items.length, w = (W - gap * (n - 1)) / n, alto = 22;
    P.cabe(alto + 4);
    items.forEach((it, i) => {
      const x = M + i * (w + gap);
      doc.setFillColor(C.suave); doc.roundedRect(x, P.y, w, alto, 2.5, 2.5, 'F');
      fuente(doc, 8.5, 'normal', C.texto2); doc.text(it.etiqueta, x + 4, P.y + 6);
      fuente(doc, 17, 'bold', C.azul); doc.text(String(it.valor), x + 4, P.y + 14.5);
      if (it.detalle) { fuente(doc, 7.8, 'normal', C.texto2); doc.text(doc.splitTextToSize(it.detalle, w - 8)[0], x + 4, P.y + 19.3); }
    });
    P.y += alto + 5;
  }

  // ---------- Gráficos ----------
  // Barras horizontales 0–100% con valor al final; ref dibuja una marca (promedio del curso o del nivel)
  // x y ancho permiten dibujar dos gráficos lado a lado
  function barras(P, filas, { refNombre = '', alto = 6.5, gap = 4.2, etiquetaAncho = 58, formato = pct, max = 1, x = M, ancho = W, tam = 9.5 } = {}) {
    const { doc } = P, x0 = x + etiquetaAncho, largo = ancho - etiquetaAncho - 14;
    const total = filas.length * (alto + gap) + (refNombre ? 8 : 2);
    P.cabe(total);
    filas.forEach((f, i) => {
      const y = P.y + i * (alto + gap);
      fuente(doc, tam, f.destacado ? 'bold' : 'normal');
      const et = doc.splitTextToSize(f.nombre, etiquetaAncho - 3);
      doc.text(et[0], x0 - 3, y + alto * 0.7, { align: 'right' });
      doc.setFillColor(C.pista); doc.roundedRect(x0, y, largo, alto, 1.2, 1.2, 'F');
      const w = Math.max(0, Math.min(1, f.valor / max)) * largo;
      if (w > 0.5) { doc.setFillColor(f.color || C.serie); doc.roundedRect(x0, y, w, alto, 1.2, 1.2, 'F'); }
      if (f.ref != null) {
        const xr = x0 + Math.max(0, Math.min(1, f.ref / max)) * largo;
        doc.setDrawColor(C.texto); doc.setLineWidth(0.7); doc.line(xr, y - 1.2, xr, y + alto + 1.2);
      }
      fuente(doc, tam, 'bold'); doc.text(formato(f.valor), x0 + largo + 2, y + alto * 0.7);
    });
    P.y += filas.length * (alto + gap);
    if (refNombre) {
      doc.setDrawColor(C.texto); doc.setLineWidth(0.7); doc.line(x0, P.y + 1.5, x0, P.y + 4.5);
      fuente(doc, 8.5, 'normal', C.texto2); doc.text(refNombre, x0 + 2, P.y + 4.2);
      P.y += 7;
    }
    P.y += 2;
  }

  // Columnas con su cantidad encima; linea = índice de la columna desde donde se marca un corte
  function columnas(P, bins, { alto = 50, linea = null, lineaTexto = '' } = {}) {
    P.cabe(alto + 14);
    const { doc } = P, izq = M + 8, ancho = W - 8, base = P.y + alto;
    const max = Math.max(1, ...bins.map((b) => b.n));
    const paso = ancho / bins.length, wb = Math.min(22, paso * 0.7);
    doc.setDrawColor(C.grid); doc.setLineWidth(0.3); doc.line(izq, base, izq + ancho, base);
    bins.forEach((b, i) => {
      const cx = izq + paso * (i + 0.5), h = (b.n / max) * (alto - 8);
      if (h > 0) { doc.setFillColor(b.color || C.serie); doc.roundedRect(cx - wb / 2, base - h, wb, h, 1, 1, 'F'); doc.rect(cx - wb / 2, base - Math.min(h, 1.2), wb, Math.min(h, 1.2), 'F'); }
      fuente(doc, 10, 'bold'); doc.text(String(b.n), cx, base - h - 1.8, { align: 'center' });
      fuente(doc, 8.5, 'normal', C.texto2); doc.text(b.etiqueta, cx, base + 5, { align: 'center' });
    });
    if (linea != null) {
      const xl = izq + paso * linea;
      doc.setDrawColor(C.texto); doc.setLineWidth(0.5); doc.setLineDashPattern([1.2, 1], 0);
      doc.line(xl, P.y - 1, xl, base); doc.setLineDashPattern([], 0);
      fuente(doc, 8.5, 'bold'); doc.text(lineaTexto, xl + 1.5, P.y + 2);
    }
    P.y = base + 10;
  }

  // Barras apiladas al 100% (estándares)
  function apiladas(P, filas, nombres) {
    const { doc } = P, et = 30, x0 = M + et, largo = W - et, alto = 9, gap = 3.5;
    P.cabe(filas.length * (alto + gap) + 10);
    filas.forEach((f, i) => {
      const y = P.y + i * (alto + gap), total = f.partes.reduce((s, x) => s + x, 0) || 1;
      fuente(doc, 9.5, f.destacado ? 'bold' : 'normal'); doc.text(f.nombre, x0 - 3, y + alto * 0.68, { align: 'right' });
      let x = x0;
      f.partes.forEach((n, k) => {
        const w = (n / total) * largo;
        if (w > 0.3) {
          doc.setFillColor([C.t1, C.t2, C.t3][k]); doc.rect(x, y, Math.max(0.3, w - 0.6), alto, 'F');
          if (w > 12) { fuente(doc, 9, 'bold', k === 0 ? C.texto : '#FFFFFF'); doc.text(pct(n / total), x + w / 2, y + alto * 0.68, { align: 'center' }); }
        }
        x += w;
      });
    });
    P.y += filas.length * (alto + gap) + 1;
    leyenda(P, nombres.map((n, k) => ({ nombre: n, color: [C.t1, C.t2, C.t3][k] })), x0);
  }

  function leyenda(P, items, x0 = M) {
    const { doc } = P;
    let x = x0;
    fuente(doc, 8.5, 'normal', C.texto2);
    items.forEach((it) => {
      doc.setFillColor(it.color); doc.roundedRect(x, P.y, 3.2, 3.2, 0.6, 0.6, 'F');
      doc.text(it.nombre, x + 4.5, P.y + 2.8);
      x += 9 + doc.getTextWidth(it.nombre);
    });
    P.y += 8;
  }

  // Líneas en el tiempo (0–100%), con nombre al final de cada una
  function lineas(P, series, etiquetas, { alto = 48 } = {}) {
    P.cabe(alto + 12);
    const { doc } = P, izq = M + 12, der = 26, ancho = W - 12 - der, base = P.y + alto;
    const vals = series.flatMap((s) => s.valores).filter((v) => v != null);
    const lo = Math.max(0, Math.floor((Math.min(...vals) - 0.05) * 10) / 10), hi = Math.min(1, Math.ceil((Math.max(...vals) + 0.05) * 10) / 10);
    const x = (i) => (etiquetas.length === 1 ? izq + ancho / 2 : izq + (ancho * i) / (etiquetas.length - 1));
    const y = (v) => base - ((v - lo) / ((hi - lo) || 1)) * alto;
    fuente(doc, 8, 'normal', C.texto2);
    [lo, (lo + hi) / 2, hi].forEach((v) => { doc.setDrawColor(C.grid); doc.setLineWidth(0.25); doc.line(izq, y(v), izq + ancho, y(v)); doc.text(pct(v), izq - 2, y(v) + 1, { align: 'right' }); });
    etiquetas.forEach((e, i) => doc.text(e, x(i), base + 5, { align: 'center' }));
    const finales = [];
    series.forEach((s) => {
      doc.setDrawColor(s.color); doc.setLineWidth(s.grueso ? 1 : 0.7);
      if (s.punteada) doc.setLineDashPattern([1.5, 1.2], 0);
      let prev = null;
      s.valores.forEach((v, i) => { if (v == null) { prev = null; return; } if (prev) doc.line(x(prev[0]), y(prev[1]), x(i), y(v)); prev = [i, v]; });
      doc.setLineDashPattern([], 0);
      if (!s.punteada) s.valores.forEach((v, i) => { if (v != null) { doc.setFillColor(s.color); doc.circle(x(i), y(v), 1.1, 'F'); } });
      const u = s.valores.map((v, i) => [v, i]).filter(([v]) => v != null).pop();
      if (u) finales.push({ texto: `${s.nombre} ${pct(u[0])}`, y: y(u[0]), x: x(u[1]), color: s.color });
    });
    finales.sort((a, b) => a.y - b.y);
    for (let i = 1; i < finales.length; i++) if (finales[i].y - finales[i - 1].y < 4) finales[i].y = finales[i - 1].y + 4;
    finales.forEach((f) => { fuente(doc, 8.5, 'bold', C.texto); doc.text(f.texto, f.x + 2.5, f.y + 1.2); });
    P.y = base + 10;
  }

  // Tabla simple con encabezado que se repite en cada página
  function tabla(P, cols, filas) {
    const { doc } = P, lh = 6.4;
    const encabezado = () => {
      doc.setFillColor(C.suave); doc.rect(M, P.y, W, lh, 'F');
      fuente(doc, 8.5, 'bold', C.texto2);
      let x = M;
      cols.forEach((c) => { doc.text(c.titulo, c.der ? x + c.ancho - 2 : x + 2, P.y + lh * 0.68, { align: c.der ? 'right' : 'left' }); x += c.ancho; });
      P.y += lh;
    };
    P.cabe(lh * 6); encabezado();
    filas.forEach((f, i) => {
      if (!P.cabe(lh)) encabezado();
      if (f.resaltar) { doc.setFillColor('#FBE3D6'); doc.rect(M, P.y, W, lh, 'F'); } else if (i % 2) { doc.setFillColor('#F7F8FB'); doc.rect(M, P.y, W, lh, 'F'); }
      let x = M;
      cols.forEach((c, k) => {
        fuente(doc, 8.8, k === 1 ? 'bold' : 'normal');
        const v = doc.splitTextToSize(String(f.celdas[k] == null ? '' : f.celdas[k]), c.ancho - 3)[0] || '';
        doc.text(v, c.der ? x + c.ancho - 2 : x + 2, P.y + lh * 0.68, { align: c.der ? 'right' : 'left' });
        x += c.ancho;
      });
      P.y += lh;
    });
    P.y += 3;
  }

  // ---------- Relato del curso ----------
  function conversion(ens, R) {
    if (R.puntajeMedia != null) return `un puntaje PAES estimado de ${R.puntajeMedia} puntos`;
    return null;
  }

  function lineasPrincipales(ctx) {
    const { ens, cur, A, H, AL, N } = ctx, R = A.resumen, esc = Estad.conf.escala;
    const out = [];
    const conv = conversion(ens, R);
    out.push(`Se corrigieron ${R.corregidas} de ${R.total} hojas. En promedio, el curso respondió bien el ${pct(R.media)} de las preguntas, lo que equivale a una nota ${nt(R.notaMedia)}${conv ? ' y ' + conv : ''}.`);
    out.push(`${R.aprobados} de ${R.corregidas} estudiantes (${pct(R.aprobados / R.corregidas)}) obtuvo nota ${nt(esc.aprobacion)} o superior, con una exigencia de ${pct(esc.exigencia)}.`);
    if (A.estandares) {
      const [ins, ele, ade] = A.estandares.map((s) => s.n / R.corregidas);
      out.push(`Según los cortes del ensayo, el ${pct(ade)} del curso quedaría en el nivel Adecuado, el ${pct(ele)} en Elemental y el ${pct(ins)} en Insuficiente.`);
    }
    const ejes = A.porEje.filter((g) => g.nombre !== 'Sin dato').slice().sort((a, b) => b.logro - a.logro);
    if (ejes.length >= 2) {
      const a = ejes[0], b = ejes[ejes.length - 1];
      out.push(`El eje con mejor resultado fue ${a.nombre} (${pct(a.logro)}) y el más descendido, ${b.nombre} (${pct(b.logro)}): hay ${pts(a.logro - b.logro)} de diferencia entre ambos.`);
    }
    if (N && N.porCurso.length >= 2) {
      const d = R.media - N.A.resumen.media;
      out.push(Math.abs(d) < 0.02 ? `El curso quedó en línea con el promedio de ${ctx.nivel} (${pct(N.A.resumen.media)}).`
        : `El curso quedó ${pts(d)} ${d > 0 ? 'sobre' : 'bajo'} el promedio de ${ctx.nivel} (${pct(N.A.resumen.media)}).`);
    }
    const idx = H ? H.puntos.findIndex((p) => p.ensayo.id === ens.id) : -1;
    if (idx > 0) {
      const d = R.media - H.puntos[idx - 1].media;
      out.push(Math.abs(d) < 0.02 ? `Respecto del ensayo anterior, ${H.puntos[idx - 1].ensayo.nombre}, el resultado se mantuvo.`
        : `Respecto del ensayo anterior, ${H.puntos[idx - 1].ensayo.nombre}, el curso ${d > 0 ? 'subió' : 'bajó'} ${pts(d)}.`);
    }
    const riesgo = AL.filter((a) => a.alertas.some((x) => x.id === 'riesgo')).length;
    const conAlerta = AL.filter((a) => a.alertas.length).length;
    if (conAlerta) out.push(`${plural(conAlerta, 'estudiante necesita', 'estudiantes necesitan')} atención${riesgo ? `; ${riesgo === 1 ? 'uno está' : riesgo + ' están'} en riesgo` : ''}. El detalle está en la sección "Estudiantes que requieren apoyo".`);
    if (A.pilotos) out.push(`El análisis considera ${A.n} preguntas: las ${A.pilotos} preguntas piloto no cuentan para el logro, la nota ni el puntaje.`);
    return out;
  }

  function sugerencias(ctx) {
    const { A, G } = ctx;
    const out = [];
    const ejes = A.porEje.filter((g) => g.nombre !== 'Sin dato').slice().sort((a, b) => a.logro - b.logro);
    if (ejes.length && ejes[0].logro < 0.6) out.push(`Dar prioridad a ${ejes[0].nombre} en las próximas clases: es el eje con menor logro (${pct(ejes[0].logro)}).`);
    const habs = A.porHabilidad.filter((g) => g.nombre !== 'Sin dato').slice().sort((a, b) => a.logro - b.logro);
    if (habs.length && habs[0].logro < 0.6) out.push(`Incluir actividades que pidan ${habs[0].nombre.toLowerCase()}, la habilidad más débil del curso (${pct(habs[0].logro)}).`);
    const dificiles = A.preguntas.filter((p) => !p.piloto && p.distractor && p.distractor.n / (p.total || 1) >= 0.3).sort((a, b) => a.acierto - b.acierto).slice(0, 3);
    if (dificiles.length) out.push(`Revisar en clases ${dificiles.length === 1 ? 'la pregunta' : 'las preguntas'} ${lista(dificiles.map((p) => String(p.n)))}: muchos estudiantes eligieron la misma alternativa incorrecta, lo que suele indicar un error de concepto compartido.`);
    if (G.length) out.push(`Formar ${G.length === 1 ? 'un grupo' : G.length + ' grupos'} de reforzamiento: ${lista(G.slice(0, 3).map((g) => `${g.nombre} (${plural(g.estudiantes.length, 'estudiante', 'estudiantes')})`))}.`);
    const omision = A.resumen.omision;
    if (omision > 0.1) out.push(`Conversar sobre la estrategia frente a la prueba: en promedio se dejó en blanco el ${pct(omision)} de las preguntas.`);
    if (!out.length) out.push('Mantener el trabajo actual: el curso no muestra un eje ni una habilidad especialmente descendidos.');
    return out;
  }

  // Distribución: por tramos de puntaje en PAES, por nota en el resto
  function distribucion(P, A) {
    if (A.resumen.puntajeMedia != null) {
      const cortes = [[100, 399, '100–399'], [400, 499, '400–499'], [500, 599, '500–599'], [600, 699, '600–699'], [700, 799, '700–799'], [800, 1000, '800–1000']];
      const bins = cortes.map(([a, b, et]) => ({ etiqueta: et, n: A.hechas.filter((x) => x.puntaje >= a && x.puntaje <= b).length, color: C.serie }));
      columnas(P, bins);
      const moda = bins.reduce((m, b) => (b.n > m.n ? b : m), bins[0]);
      const sobre = A.hechas.filter((x) => x.puntaje >= 600).length;
      parrafo(P, `La mayor parte del curso se ubica entre ${moda.etiqueta.replace('–', ' y ')} puntos. ${plural(sobre, 'estudiante supera', 'estudiantes superan')} los 600 puntos estimados, y el rango va de ${A.resumen.puntajeMin} a ${A.resumen.puntajeMax}.`, { color: C.texto2, tam: 10 });
    } else {
      const ap = Estad.conf.escala.aprobacion;
      const bins = A.histNotas.map((b, i) => ({ etiqueta: `${nt(b.desde)}–${nt(i === A.histNotas.length - 1 ? b.hasta : b.hasta - 0.1)}`, n: b.n, color: b.desde < ap ? C.critico : C.serie }));
      const k = A.histNotas.findIndex((b) => b.desde >= ap);
      columnas(P, bins, { linea: k > 0 ? k : null, lineaTexto: `aprobación ${nt(ap)}` });
      const reprob = A.resumen.corregidas - A.resumen.aprobados;
      const moda = bins.reduce((m, b) => (b.n > m.n ? b : m), bins[0]);
      parrafo(P, `La mayoría del curso obtuvo notas entre ${moda.etiqueta.replace('–', ' y ')}. ${reprob ? `${plural(reprob, 'estudiante quedó', 'estudiantes quedaron')} bajo ${nt(ap)} (columnas naranjas).` : 'Todos los estudiantes alcanzaron la nota de aprobación.'}`, { color: C.texto2, tam: 10 });
    }
  }

  // ---------- Informe del curso ----------
  function curso(ctx) {
    const { ens, cur, A, H, AL, G, N, HN } = ctx, R = A.resumen;
    const P = nuevoDoc(`Lector óptico · ${ens.nombre} · ${cur.nombre}`);
    banda(P, 'Informe de resultados', `${ens.nombre} · ${cur.nombre}`, [ens.fecha, `${R.corregidas} de ${R.total} hojas corregidas`, `generado el ${new Date().toLocaleDateString('es-CL')}`].filter(Boolean).join(' · '));

    titulo(P, 'Lo principal', 0);
    vinetas(P, lineasPrincipales(ctx));

    const tarjetas = [
      { etiqueta: 'Logro promedio', valor: pct(R.media), detalle: `mediana ${pct(R.mediana)}` },
      { etiqueta: 'Nota promedio', valor: nt(R.notaMedia), detalle: `exigencia ${pct(Estad.conf.escala.exigencia)}` },
      { etiqueta: 'Aprueban', valor: pct(R.aprobados / R.corregidas), detalle: `${R.aprobados} de ${R.corregidas}` },
    ];
    if (R.puntajeMedia != null) tarjetas.push({ etiqueta: 'Puntaje PAES (est.)', valor: R.puntajeMedia, detalle: `rango ${R.puntajeMin}–${R.puntajeMax}` });
    else if (R.adecuado != null) tarjetas.push({ etiqueta: 'En Adecuado (est.)', valor: pct(R.adecuado), detalle: 'estándar estimado' });
    P.y += 2; cifras(P, tarjetas);

    titulo(P, R.puntajeMedia != null ? '¿Cómo se distribuyen los puntajes?' : '¿Cómo se distribuyen las notas?', 6, 70);
    distribucion(P, A);

    if (A.estandares) {
      titulo(P, 'Estudiantes por estándar de aprendizaje');
      const filas = [{ nombre: cur.nombre, partes: A.estandares.map((s) => s.n), destacado: true }];
      if (N && N.porCurso.length >= 2) {
        N.porCurso.filter((x) => x.curso.id !== cur.id).forEach((x) => filas.push({ nombre: x.curso.nombre, partes: x.A.estandares.map((s) => s.n) }));
        filas.push({ nombre: ctx.nivel, partes: N.A.estandares.map((s) => s.n) });
      }
      apiladas(P, filas, Estad.ESTANDARES.map((s) => s.nombre));
      parrafo(P, 'El estándar es una estimación hecha con los cortes del ensayo; el SIMCE oficial usa otro modelo de cálculo.', { color: C.texto2, tam: 9 });
    }

    const conNivel = N && N.porCurso.length >= 2;
    const grupo = (nombre, fuente, fuenteNivel) => {
      const filas = fuente.filter((g) => g.nombre !== 'Sin dato').slice().sort((a, b) => b.logro - a.logro).map((g) => {
        const gn = fuenteNivel && fuenteNivel.find((y) => y.nombre === g.nombre);
        return { nombre: g.nombre, valor: g.logro, ref: gn ? gn.logro : null, color: g.logro < 0.5 ? C.critico : C.serie };
      });
      if (!filas.length) return;
      titulo(P, nombre);
      barras(P, filas, { refNombre: conNivel ? `Raya negra: promedio de ${ctx.nivel}` : '' });
      const a = filas[0], b = filas[filas.length - 1];
      if (filas.length >= 2) {
        let t = `${mayus(nombre === 'Resultados por eje' ? 'el punto más fuerte del curso es' : 'la habilidad mejor lograda es')} ${a.nombre} (${pct(a.valor)}), y ${nombre === 'Resultados por eje' ? 'el más débil' : 'la más débil'}, ${b.nombre} (${pct(b.valor)}).`;
        const bajoNivel = filas.filter((f) => f.ref != null && f.valor - f.ref <= -0.05).map((f) => f.nombre);
        if (bajoNivel.length) t += ` Respecto del nivel, el curso está bajo el promedio en ${lista(bajoNivel)}.`;
        if (filas.some((f) => f.valor < 0.5)) t += ' Las barras naranjas marcan lo que está bajo 50%.';
        parrafo(P, t, { color: C.texto2, tam: 10 });
      }
    };
    grupo('Resultados por eje', A.porEje, conNivel ? N.A.porEje : null);
    grupo('Resultados por habilidad', A.porHabilidad, conNivel ? N.A.porHabilidad : null);

    const dificiles = A.preguntas.filter((p) => !p.piloto).sort((a, b) => a.acierto - b.acierto).slice(0, 5);
    if (dificiles.length) {
      titulo(P, 'Preguntas que más costaron');
      barras(P, dificiles.map((p) => ({ nombre: `Pregunta ${p.n}${p.eje ? ' · ' + p.eje : ''}`, valor: p.acierto, color: p.acierto < 0.4 ? C.critico : C.serie })), { etiquetaAncho: 72 });
      vinetas(P, dificiles.slice(0, 3).map((p) => {
        let t = `Pregunta ${p.n}${p.eje ? ` (${p.eje}${p.habilidad ? ', ' + p.habilidad.toLowerCase() : ''})` : ''}: respondió bien el ${pct(p.acierto)} del curso.`;
        if (p.distractor && p.distractor.n / (p.total || 1) >= 0.25) t += ` La alternativa ${p.distractor.letra} la eligió el ${pct(p.distractor.n / p.total)}: conviene revisar por qué parecía correcta.`;
        else if (p.omision >= 0.2) t += ` El ${pct(p.omision)} la dejó en blanco.`;
        return t;
      }), { tam: 10 });
    }

    if (conNivel) {
      titulo(P, `Comparación con los paralelos de ${ctx.nivel}`);
      const filas = N.porCurso.map((x) => ({ nombre: x.curso.nombre, valor: x.A.resumen.media, color: C.cat[x.idx] || C.gris, destacado: x.curso.id === cur.id, ref: N.A.resumen.media }));
      barras(P, filas, { refNombre: `Raya negra: promedio de ${ctx.nivel} (${pct(N.A.resumen.media)})`, etiquetaAncho: 30 });
      const orden = N.porCurso.slice().sort((a, b) => b.A.resumen.media - a.A.resumen.media);
      const lugar = orden.findIndex((x) => x.curso.id === cur.id) + 1;
      let t = `${cur.nombre} quedó en el lugar ${lugar} de ${orden.length} paralelos. La diferencia entre el mejor y el más bajo es de ${pts(orden[0].A.resumen.media - orden[orden.length - 1].A.resumen.media)}.`;
      if (N.brechas.length) t += ` Hay ${plural(N.brechas.length, 'pregunta', 'preguntas')} con 25 puntos o más de diferencia entre paralelos (${lista(N.brechas.slice(0, 4).map((p) => String(p.n)))}), lo que puede indicar contenidos que no se trabajaron igual en todos los cursos.`;
      parrafo(P, t, { color: C.texto2, tam: 10 });
    }

    if (H && H.puntos.length >= 2) {
      titulo(P, 'Evolución en los ensayos', 6, 75);
      const et = H.puntos.map((p) => (p.ensayo.fecha ? p.ensayo.fecha.slice(0, 5) : p.ensayo.nombre.slice(0, 8)));
      const series = [{ nombre: cur.nombre, color: C.serie, valores: H.puntos.map((p) => p.media), grueso: true }];
      if (HN && HN.length >= 2) {
        const porId = new Map(HN.map((p) => [p.ensayo.id, p.A.resumen.media]));
        series.push({ nombre: ctx.nivel, color: C.gris, valores: H.puntos.map((p) => (porId.has(p.ensayo.id) ? porId.get(p.ensayo.id) : null)), punteada: true });
      }
      lineas(P, series, et);
      const d = H.puntos[H.puntos.length - 1].media - H.puntos[0].media;
      parrafo(P, `Entre el primer ensayo, ${H.puntos[0].ensayo.nombre}, y el último, el logro promedio ${Math.abs(d) < 0.02 ? 'se mantuvo estable' : `${d > 0 ? 'subió' : 'bajó'} ${pts(d)}`}.${series.length > 1 ? ' La línea punteada es el promedio del nivel.' : ''}`, { color: C.texto2, tam: 10 });
    }

    const conAlerta = AL.filter((a) => a.alertas.length).sort((a, b) => b.gravedad - a.gravedad || a.x.logro - b.x.logro);
    titulo(P, 'Estudiantes que requieren apoyo');
    if (conAlerta.length) {
      parrafo(P, 'Estudiantes con bajo logro, que bajaron respecto del ensayo anterior o que dejaron muchas preguntas en blanco. Las filas destacadas están en riesgo.', { color: C.texto2, tam: 10 });
      tabla(P, [{ titulo: 'N°', ancho: 10 }, { titulo: 'Estudiante', ancho: 62 }, { titulo: 'Logro', ancho: 16, der: true }, { titulo: 'Nota', ancho: 14, der: true }, { titulo: 'Motivo', ancho: W - 102 }],
        conAlerta.map((a) => ({ resaltar: a.alertas.some((x) => x.id === 'riesgo'), celdas: [a.x.e.lista, a.x.e.nombre, pct(a.x.logro), nt(a.x.nota), a.alertas.map((x) => x.texto).join('; ')] })));
    } else parrafo(P, 'Ningún estudiante cumple los criterios de alerta en este ensayo.', { color: C.texto2 });
    if (G.length) {
      titulo(P, 'Grupos de reforzamiento sugeridos', 3);
      vinetas(P, G.map((g) => `${g.nombre}: ${lista(g.estudiantes.map((s) => nombreCorto(s.x.e.nombre)))}.`), { tam: 10 });
    }

    titulo(P, 'Sugerencias para el trabajo en clases');
    vinetas(P, sugerencias(ctx));

    titulo(P, 'Resultados por estudiante');
    const conPuntaje = R.puntajeMedia != null, conEst = !!A.estandares;
    const cols = [{ titulo: 'N°', ancho: 10 }, { titulo: 'Estudiante', ancho: 70 }, { titulo: 'Correctas', ancho: 22, der: true }, { titulo: 'Logro', ancho: 18, der: true }, { titulo: 'Nota', ancho: 16, der: true }];
    if (conPuntaje) cols.push({ titulo: 'Puntaje est.', ancho: W - 136, der: true });
    else if (conEst) cols.push({ titulo: 'Estándar est.', ancho: W - 136 });
    else cols.push({ titulo: 'Lugar', ancho: W - 136, der: true });
    tabla(P, cols, A.estudiantes.map((x) => ({
      celdas: x.corregida ? [x.e.lista, x.e.nombre, `${x.correctas}/${A.n}`, pct(x.logro), nt(x.nota),
        conPuntaje ? x.puntaje : conEst ? x.estandar.nombre : `${A.hechas.filter((y) => y.logro > x.logro).length + 1}°`] : [x.e.lista, x.e.nombre, 'sin hoja', '', '', ''],
    })));
    if (conPuntaje || conEst) parrafo(P, `${conPuntaje ? 'El puntaje se estima con la tabla de conversión del ensayo' : 'El estándar se estima con los cortes del ensayo'}; los resultados oficiales pueden ser distintos.`, { color: C.texto2, tam: 8.5 });

    piePaginas(P);
    return P.doc.output('blob');
  }

  const nombreCorto = (n) => { const p = String(n).split(/\s+/); return p.length > 2 ? p[0] + ' ' + p[p.length - 2] : n; };

  // ---------- Informe por estudiante ----------
  function paginaEstudiante(P, ctx, x, primera) {
    const { ens, cur, A, H, AL, N } = ctx;
    if (!primera) { P.doc.addPage(); P.y = M; }
    const conNivel = N && N.porCurso.length >= 2;
    const Pf = Estad.perfil(A, x.e.id, conNivel ? N.A : null);
    banda(P, x.e.nombre, `${cur.nombre} · ${ens.nombre}`, ens.fecha || '');
    const t = [
      { etiqueta: 'Respuestas correctas', valor: `${x.correctas} de ${A.n}`, detalle: `${x.omitidas} en blanco` },
      { etiqueta: 'Logro', valor: pct(x.logro), detalle: `curso: ${pct(A.resumen.media)}` },
      { etiqueta: 'Nota', valor: nt(x.nota), detalle: `exigencia ${pct(Estad.conf.escala.exigencia)}` },
    ];
    if (x.puntaje != null) t.push({ etiqueta: 'Puntaje PAES (est.)', valor: x.puntaje, detalle: `curso: ${A.resumen.puntajeMedia}` });
    else if (x.estandar) t.push({ etiqueta: 'Estándar (est.)', valor: x.estandar.nombre, detalle: 'según cortes del ensayo' });
    cifras(P, t);

    const pila = nombrePila(x.e.nombre);
    const d = x.logro - A.resumen.media;
    const frases = [];
    frases.push(`${pila} respondió correctamente ${x.correctas} de ${A.n} preguntas (${pct(x.logro)}), lo que corresponde a nota ${nt(x.nota)}${x.puntaje != null ? ` y a un puntaje estimado de ${x.puntaje} puntos` : x.estandar ? `, en el nivel ${x.estandar.nombre} según los cortes del ensayo` : ''}.`);
    frases.push(Math.abs(d) < 0.02 ? 'Su resultado está en línea con el promedio del curso.' : `Su resultado está ${pts(d)} ${d > 0 ? 'sobre' : 'bajo'} el promedio del curso.`);
    const ejes = Pf.porEje.filter((g) => g.nombre !== 'Sin dato').slice().sort((a, b) => b.propio - a.propio);
    if (ejes.length >= 2) {
      const a = ejes[0], b = ejes[ejes.length - 1];
      frases.push(`Su eje más fuerte es ${a.nombre} (${pct(a.propio)}) y donde más le conviene reforzar es ${b.nombre} (${pct(b.propio)}${b.propio < b.curso - 0.04 ? `, ${pts(b.curso - b.propio)} bajo el curso` : ''}).`);
    }
    const serie = H ? (H.estudiantes.find((s) => s.e.id === x.e.id) || { serie: [] }).serie : [];
    const idx = H ? H.puntos.findIndex((p) => p.ensayo.id === ens.id) : -1;
    const previo = idx > 0 ? serie.slice(0, idx).filter((v) => v != null).pop() : null;
    if (previo != null) {
      const c = x.logro - previo;
      frases.push(Math.abs(c) < 0.02 ? 'Respecto del ensayo anterior, mantuvo su resultado.' : `Respecto del ensayo anterior, ${c > 0 ? 'subió' : 'bajó'} ${pts(c)}.`);
    }
    if (x.omitidas / A.n > 0.15) frases.push(`Dejó ${plural(x.omitidas, 'pregunta', 'preguntas')} en blanco; responder todas puede mejorar su resultado.`);
    parrafo(P, frases.join(' '), { tam: 10.5 });

    // Eje y habilidad lado a lado para que todo quepa en una página
    const habs = Pf.porHabilidad.filter((g) => g.nombre !== 'Sin dato').slice().sort((a, b) => b.propio - a.propio);
    const filasDe = (gs) => gs.map((g) => ({ nombre: g.nombre, valor: g.propio, ref: g.curso, color: g.propio < 0.5 ? C.critico : C.serie }));
    const dos = habs.length >= 2 && habs.length <= 8 && ejes.length <= 8;
    const media = (W - 8) / 2, op = { alto: 5.6, gap: 3.4, etiquetaAncho: 40, tam: 8.5 };
    P.cabe(14 + Math.max(ejes.length, dos ? habs.length : 0) * 9 + 8);
    P.y += 3;
    fuente(P.doc, 12, 'bold', C.azul); P.doc.text('Resultado por eje', M, P.y);
    if (dos) P.doc.text('Resultado por habilidad', M + media + 8, P.y);
    P.y += 5;
    const y0 = P.y;
    barras(P, filasDe(ejes), { ...op, ancho: dos ? media : W });
    const y1 = P.y;
    if (dos) { P.y = y0; barras(P, filasDe(habs), { ...op, x: M + media + 8, ancho: media }); }
    P.y = Math.max(y1, P.y);
    fuente(P.doc, 8.5, 'normal', C.texto2);
    P.doc.setDrawColor(C.texto); P.doc.setLineWidth(0.7); P.doc.line(M, P.y - 2.5, M, P.y + 0.5);
    P.doc.text('Raya negra: promedio del curso. Naranjo: bajo 50%.', M + 2, P.y);
    P.y += 4;
    if (H && H.puntos.length >= 2 && serie.filter((v) => v != null).length >= 2) {
      titulo(P, 'Evolución', 2, 36);
      lineas(P, [{ nombre: pila, color: C.serie, valores: serie, grueso: true }, { nombre: 'Curso', color: C.gris, valores: H.puntos.map((p) => p.media), punteada: true }],
        H.puntos.map((p) => (p.ensayo.fecha ? p.ensayo.fecha.slice(0, 5) : p.ensayo.nombre.slice(0, 8))), { alto: 30 });
    }
    // Preguntas para repasar, agrupadas por eje
    const falladas = A.preguntas.filter((p) => !p.piloto && !x.aciertos[p.i]);
    if (falladas.length) {
      titulo(P, 'Preguntas para repasar', 2, 10);
      const porEje = new Map();
      falladas.forEach((p) => { const k = p.eje || 'Otras'; if (!porEje.has(k)) porEje.set(k, []); porEje.get(k).push(p.n); });
      vinetas(P, [...porEje].map(([k, ns]) => `${k}: ${ns.join(', ')}`), { tam: 9.5 });
    }
  }

  function estudiantes(ctx, ids) {
    const { ens, cur, A } = ctx;
    const P = nuevoDoc(`Lector óptico · ${ens.nombre} · ${cur.nombre}`);
    const lista = A.hechas.filter((x) => !ids || ids.includes(x.e.id)).sort((a, b) => a.e.lista - b.e.lista);
    lista.forEach((x, i) => paginaEstudiante(P, ctx, x, i === 0));
    piePaginas(P);
    return P.doc.output('blob');
  }

  return { curso, estudiantes };
})();
