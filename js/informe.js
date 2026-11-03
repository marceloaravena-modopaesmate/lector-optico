/*
 * Informes en PDF (jsPDF), pensados para leerse y explicarse: frases en lenguaje simple y pocos gráficos grandes.
 *  - curso(ctx): informe del curso (general, ejes y habilidades, preguntas, paralelos, apoyo) seguido de una ficha por estudiante.
 *  - estudiantes(ctx, ids): solo las fichas detalladas de los estudiantes, para entregar a cada uno o a su apoderado.
 * ctx lo arma la app: { ens, cur, A, H, AL, G, N, HN, nivel, paralelos }.
 * Todo se dibuja como vector: los gráficos se ven nítidos al imprimir.
 */
const Informe = (() => {
  const C = {
    azul: '#1A4080', serie: '#2a78d6', critico: '#c4561d', texto: '#18202E', texto2: '#535D72', suave: '#E6ECF7',
    grid: '#E3E7EE', pista: '#ECEEF2', gris: '#A9B1BF', t1: '#9ec5f4', t2: '#2a78d6', t3: '#104281',
    cat: ['#2a78d6', '#1baf7a', '#6250d6', '#eda100', '#e87ba4'],
  };
  const ANCHO = 210, ALTO = 297, M = 18, W = ANCHO - 2 * M, PIE = 14;

  const pct = (x) => Math.round(x * 100) + '%';
  const pts = (d) => Math.abs(Math.round(d * 100)) + (Math.abs(Math.round(d * 100)) === 1 ? ' punto' : ' puntos');
  const nt = (n) => (n == null ? '–' : n.toFixed(1).replace('.', ','));
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const nombrePila = (n) => String(n || '').split(/\s+/)[0];
  const lista = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1]);
  const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const minus = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  // Bajo este número de hojas no se muestran los análisis de dispersión ni de calidad de preguntas
  const MIN_N = 8;

  // ---------- Página y cursor ----------
  function nuevoDoc(ctx) {
    const doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const col = ctx.colegio || {};
    const pie = [col.nombre || 'Lector óptico', ctx.ens && ctx.ens.nombre, ctx.cur && ctx.cur.nombre].filter(Boolean).join(' · ');
    const P = { doc, y: M, pie, colegio: col };
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

  // Franja de portada con el nombre y el logo del colegio, si están en Ajustes
  function banda(P, titulo, sub, detalle) {
    const { doc } = P, col = P.colegio || {};
    const dy = col.nombre ? 6 : 0, alto = (detalle ? 38 : 32) + dy;
    doc.setFillColor(C.azul); doc.rect(0, 0, ANCHO, alto, 'F');
    let ancho = W;
    if (col.logo && col.logo.src) {
      const lado = alto - 10, k = Math.min(lado / col.logo.w, lado / col.logo.h), w = col.logo.w * k, h = col.logo.h * k;
      doc.setFillColor('#FFFFFF'); doc.roundedRect(ANCHO - M - lado - 2, 5, lado + 2, lado, 2, 2, 'F');
      try { doc.addImage(col.logo.src, 'JPEG', ANCHO - M - lado - 1 + (lado - w) / 2, 5 + (lado - h) / 2, w, h); } catch (e) { /* logo ilegible: se omite */ }
      ancho = W - lado - 6;
    }
    if (col.nombre) { fuente(doc, 9, 'bold', '#C9D6F0'); doc.text(doc.splitTextToSize(col.nombre.toUpperCase(), ancho)[0], M, 9.5); }
    fuente(doc, 20, 'bold', '#FFFFFF'); doc.text(doc.splitTextToSize(titulo, ancho)[0], M, 15 + dy);
    fuente(doc, 11.5, 'normal', '#FFFFFF'); doc.text(doc.splitTextToSize(sub, ancho)[0], M, 23 + dy);
    if (detalle) { fuente(doc, 9.5, 'normal', '#C9D6F0'); doc.text(doc.splitTextToSize(detalle, ancho)[0], M, 30 + dy); }
    P.y = alto + 10;
  }

  // sigue: alto mínimo del contenido que viene, para que el título no quede solo al pie de la página
  function titulo(P, texto, antes = 6, sigue = 30) {
    P.cabe(antes + 6 + sigue);
    P.y += antes;
    fuente(P.doc, 13, 'bold', C.azul); P.doc.text(texto, M, P.y + 4);
    P.y += 10;
  }

  function parrafo(P, texto, { tam = 10.5, color = C.texto, estilo = 'normal', ancho = W, x = M } = {}) {
    const { doc } = P;
    fuente(doc, tam, estilo, color);
    const lineas = doc.splitTextToSize(texto, ancho);
    const lh = altoLinea(tam);
    if (lineas.length <= 5) P.cabe(lh * lineas.length);
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
      let tam = 17;
      fuente(doc, tam, 'bold', C.azul);
      while (tam > 10 && doc.getTextWidth(String(it.valor)) > w - 7) { tam -= 1; doc.setFontSize(tam); }
      doc.text(String(it.valor), x + 4, P.y + 14.5);
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
    P.cabe(alto + 14 + (linea != null ? 7 : 0));
    if (linea != null) P.y += 7;   // franja para el rótulo de la línea, sobre las cifras de las columnas
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
      doc.line(xl, P.y - 7, xl, base); doc.setLineDashPattern([], 0);
      fuente(doc, 8.5, 'bold'); doc.text(lineaTexto, xl + 1.5, P.y - 4);
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
      s.valores.forEach((v, i) => { if (v == null) { if (!s.unir) prev = null; return; } if (prev) doc.line(x(prev[0]), y(prev[1]), x(i), y(v)); prev = [i, v]; });
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
  function tabla(P, cols, filas, { tam = 8.8 } = {}) {
    const { doc } = P, lh = tam >= 8.5 ? 6.4 : 5.6;
    const encabezado = () => {
      doc.setFillColor(C.suave); doc.rect(M, P.y, W, lh, 'F');
      fuente(doc, Math.min(8.5, tam), 'bold', C.texto2);
      let x = M;
      cols.forEach((c) => { doc.text(c.titulo, c.der ? x + c.ancho - 2 : x + 2, P.y + lh * 0.68, { align: c.der ? 'right' : 'left' }); x += c.ancho; });
      P.y += lh;
    };
    P.cabe(lh * 6); encabezado();
    const ll = tam * 0.47;   // alto de cada línea extra en celdas que se envuelven
    filas.forEach((f, i) => {
      const negrita = (c, k) => (c.negrita != null ? c.negrita : k === 1);
      const textos = cols.map((c, k) => { fuente(doc, tam, negrita(c, k) ? 'bold' : 'normal'); const t = doc.splitTextToSize(String(f.celdas[k] == null ? '' : f.celdas[k]), c.ancho - 3); return c.envolver ? t : [t[0] || '']; });
      const alto = lh + (Math.max(...textos.map((t) => t.length)) - 1) * ll;
      if (!P.cabe(alto)) encabezado();
      if (f.resaltar) { doc.setFillColor('#FBE3D6'); doc.rect(M, P.y, W, alto, 'F'); } else if (i % 2) { doc.setFillColor('#F7F8FB'); doc.rect(M, P.y, W, alto, 'F'); }
      let x = M;
      cols.forEach((c, k) => {
        fuente(doc, tam, negrita(c, k) ? 'bold' : 'normal');
        textos[k].forEach((v, j) => doc.text(v, c.der ? x + c.ancho - 2 : x + 2, P.y + lh * 0.68 + j * ll, { align: c.der ? 'right' : 'left' }));
        x += c.ancho;
      });
      P.y += alto;
    });
    P.y += 3;
  }

  // Meta del colegio que corresponde al ensayo: puntaje en PAES con tabla, logro en el resto
  function metaDe(ctx) {
    const col = ctx.colegio || {}, A = ctx.A, R = A.resumen;
    if (R.puntajeMedia != null && col.metaPuntaje) return { valor: col.metaPuntaje, actual: R.puntajeMedia, tolerancia: 5, texto: (v) => `${Math.round(v)} puntos`, cumplen: A.hechas.filter((x) => x.puntaje >= col.metaPuntaje).length, escala: 'puntaje' };
    if (col.metaLogro) return { valor: col.metaLogro, actual: R.media, tolerancia: 0.01, texto: pct, cumplen: A.hechas.filter((x) => x.logro >= col.metaLogro).length, escala: 'logro' };
    return null;
  }

  // ---------- Relato del curso ----------
  function conversion(ens, R) {
    if (R.puntajeMedia != null) return `un puntaje PAES estimado de ${R.puntajeMedia} puntos`;
    return null;
  }

  // Cifras con un decimal, sin ",0"
  const dec = (v) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
  const numeros = (ps) => lista(ps.map((p) => String(p.n ?? p)));
  const validasDe = (A) => A.preguntas.filter((p) => !p.piloto);

  // Correctas que se necesitan para llegar a la nota de aprobación
  function correctasAprobar(A) {
    const ap = Estad.conf.escala.aprobacion;
    let c = 0;
    while (c < A.n && Estad.nota(c / A.n) < ap - 1e-9) c++;
    return c;
  }

  // ¿Las preguntas más difíciles se concentran en un eje?
  function dificilesPorEje(A) {
    const val = validasDe(A).filter((p) => p.eje);
    if (val.length < 10) return null;
    const k = Math.max(4, Math.min(6, Math.round(val.length / 5)));
    const peores = val.slice().sort((a, b) => a.acierto - b.acierto).slice(0, k);
    const cuenta = new Map();
    peores.forEach((p) => cuenta.set(p.eje, (cuenta.get(p.eje) || 0) + 1));
    const [eje, n] = [...cuenta].sort((a, b) => b[1] - a[1])[0];
    const peso = val.filter((p) => p.eje === eje).length / val.length;
    const concentra = n >= Math.ceil(k / 2) && n / k >= peso + 0.15;
    return { peores, k, eje: concentra ? eje : null, n, nums: peores.filter((p) => p.eje === eje).map((p) => p.n).sort((a, b) => a - b) };
  }

  // Preguntas donde una misma alternativa incorrecta reunió a buena parte del curso
  function erroresCompartidos(A) {
    return validasDe(A).filter((p) => p.distractor && p.distractor.n >= 3 && p.distractor.n / (p.total || 1) >= 0.3)
      .sort((a, b) => b.distractor.n / b.total - a.distractor.n / a.total).slice(0, 3);
  }

  // Respuestas en blanco: cuántas y cuántas en el último cuarto de la prueba
  function blancos(A, xs) {
    const val = validasDe(A), corte = Math.floor(val.length * 0.75);
    let total = 0, final = 0;
    xs.forEach((x) => val.forEach((p, j) => { if (!x.r[p.i]) { total++; if (j >= corte) final++; } }));
    return { total, final, alFinal: total >= 4 && final / total >= 0.5 };
  }

  function lineasPrincipales(ctx) {
    const { ens, A, H, AL, N } = ctx, R = A.resumen, esc = Estad.conf.escala;
    const pocos = R.corregidas < MIN_N, out = [];
    if (pocos) out.push(`Hay solo ${plural(R.corregidas, 'hoja corregida', 'hojas corregidas')}. Las cifras sirven de referencia, pero no alcanzan para la nube de puntos, los percentiles ni el análisis técnico de las preguntas.`);
    // Resultado global y dispersión
    const correctasMedia = Estad.media(A.hechas.map((x) => x.correctas));
    let t = `En promedio, el curso contestó bien ${dec(correctasMedia)} de ${A.n} preguntas (${pct(R.media)}), lo que da nota ${nt(R.notaMedia)}${R.puntajeMedia != null ? ` y unos ${R.puntajeMedia} puntos PAES` : ''}.`;
    if (!pocos) {
      t += ` La mitad central del curso quedó entre ${pct(R.q1)} y ${pct(R.q3)}; el resultado más bajo fue ${pct(R.min)} y el más alto, ${pct(R.max)}.`;
      if (R.desviacion >= 0.18) t += ' Son diferencias grandes para un mismo curso, así que el trabajo por grupos rinde más que una clase única de repaso.';
      else if (R.desviacion <= 0.1) t += ' Es un curso bastante parejo.';
    }
    out.push(t);
    // Aprobación y estudiantes cerca del 4,0
    const cAp = correctasAprobar(A);
    const noAprueban = A.hechas.filter((x) => x.nota < esc.aprobacion - 1e-9);
    const cerca = noAprueban.filter((x) => cAp - x.correctas <= 3).sort((a, b) => b.correctas - a.correctas);
    t = R.aprobados === 0 ? `Nadie llegó al ${nt(esc.aprobacion)}, que con exigencia de ${pct(esc.exigencia)} pide ${cAp} correctas de ${A.n}.`
      : `Aprueban ${R.aprobados} de ${R.corregidas} (${pct(R.aprobados / R.corregidas)}). El ${nt(esc.aprobacion)} pide ${cAp} correctas de ${A.n}.`;
    if (cerca.length && noAprueban.length) t += ` De los ${noAprueban.length} que no llegan, ${cerca.length === noAprueban.length ? (cerca.length === 1 ? 'el único está' : 'todos están') : cerca.length === 1 ? 'uno está' : cerca.length + ' están'} a tres respuestas o menos: ${lista(cerca.slice(0, 6).map((x) => nombreCorto(x.e.nombre)))}${cerca.length > 6 ? ' y otros' : ''}.`;
    out.push(t);
    const meta = metaDe(ctx);
    if (meta) {
      const d = meta.actual - meta.valor;
      out.push(Math.abs(d) < meta.tolerancia ? `El curso está en la meta del colegio (${meta.texto(meta.valor)}).`
        : d > 0 ? `El curso supera la meta del colegio: ${meta.texto(meta.actual)}, con la meta en ${meta.texto(meta.valor)}.`
          : `El curso está bajo la meta del colegio (${meta.texto(meta.actual)}, con la meta en ${meta.texto(meta.valor)}); ${meta.cumplen === 0 ? 'ningún estudiante la alcanza todavía' : `${plural(meta.cumplen, 'estudiante la alcanza', 'estudiantes la alcanzan')}`}.`);
    }
    if (A.estandares) {
      const [ins, ele, ade] = A.estandares;
      out.push(`Con los cortes del ensayo, ${ade.n} quedarían en Adecuado, ${ele.n} en Elemental y ${ins.n} en Insuficiente (${pct(ade.n / R.corregidas)}, ${pct(ele.n / R.corregidas)} y ${pct(ins.n / R.corregidas)}).`);
    }
    // Ejes y preguntas difíciles
    const ejes = A.porEje.filter((g) => g.nombre !== 'Sin dato').slice().sort((a, b) => b.logro - a.logro);
    const dif = dificilesPorEje(A);
    if (ejes.length >= 2) {
      const a = ejes[0], b = ejes[ejes.length - 1];
      t = a.logro - b.logro < 0.08 ? `Los ejes quedaron parejos: de ${pct(b.logro)} en ${b.nombre} a ${pct(a.logro)} en ${a.nombre}.`
        : `Por eje, ${a.nombre} fue lo mejor resuelto (${pct(a.logro)}) y ${b.nombre} lo más bajo (${pct(b.logro)}).`;
      if (dif && dif.eje) t += ` De las ${dif.k} preguntas con menos aciertos, ${dif.n} son de ${dif.eje} (${numeros(dif.nums)}).`;
      out.push(t);
    }
    if (dif && !dif.eje) out.push(`Las preguntas con menos aciertos fueron ${lista(dif.peores.slice(0, 3).map((p) => `la ${p.n} (${pct(p.acierto)})`))}, de ejes distintos.`);
    // Errores que se repiten
    const comp = pocos ? [] : erroresCompartidos(A);
    if (comp.length) out.push(`Hay errores que se repiten: ${comp.map((p) => `en la ${p.n}, ${p.distractor.n} de ${p.total} marcaron la ${p.distractor.letra} (la correcta era la ${p.clave})`).join('; ')}. Cuando tantos eligen la misma alternativa, no es azar: hay un razonamiento equivocado en común que vale la pena discutir en clases.`);
    // Respuestas en blanco
    if (R.omision >= 0.04) {
      const b = blancos(A, A.hechas);
      out.push(b.alFinal ? `Quedaron ${b.total} respuestas en blanco en todo el curso y ${b.final} están en el último cuarto de la prueba: a varios no les alcanzó el tiempo.`
        : `En promedio quedó en blanco el ${pct(R.omision)} de las preguntas, repartidas a lo largo de la prueba.`);
    }
    // Comparaciones
    const comp2 = [];
    const idx = H ? H.puntos.findIndex((p) => p.ensayo.id === ens.id) : -1;
    if (idx > 0) {
      const ant = H.puntos[idx - 1], d = R.media - ant.media;
      comp2.push(Math.abs(d) < 0.02 ? `frente a ${ant.ensayo.nombre} el resultado se mantuvo (${pct(ant.media)})` : `frente a ${ant.ensayo.nombre} ${d > 0 ? 'subió' : 'bajó'} ${pts(d)} (venía de ${pct(ant.media)})`);
    }
    if (N && N.porCurso.length >= 2) {
      const d = R.media - N.A.resumen.media;
      comp2.push(Math.abs(d) < 0.02 ? `está en el promedio de ${ctx.nivel} (${pct(N.A.resumen.media)})` : `quedó ${pts(d)} ${d > 0 ? 'sobre' : 'bajo'} el promedio de ${ctx.nivel} (${pct(N.A.resumen.media)})`);
    }
    if (comp2.length) out.push(mayus(lista(comp2)) + '.');
    const riesgo = AL.filter((a) => a.alertas.some((x) => x.id === 'riesgo')).length;
    const conAlerta = AL.filter((a) => a.alertas.length).length;
    if (conAlerta) out.push(`${plural(conAlerta, 'estudiante tiene', 'estudiantes tienen')} alguna alerta${riesgo ? ` y ${riesgo === 1 ? 'uno está' : riesgo + ' están'} en riesgo` : ''}; los nombres están en "Estudiantes que requieren apoyo".`);
    const sel = ctx.seleccion || [];
    if (sel.length > 1) out.push(`El informe incluye ${sel.length} ensayos (${lista(sel.map((x) => x.ens.nombre))}). El análisis detallado es de ${ens.nombre}; los demás aparecen en la evolución y en la ficha de cada estudiante.`);
    if (A.pilotos) out.push(`Se consideran ${A.n} preguntas: ${A.pilotos === 1 ? 'la pregunta piloto no cuenta' : `las ${A.pilotos} preguntas piloto no cuentan`} para el logro, la nota ni el puntaje.`);
    return out;
  }

  function sugerencias(ctx) {
    const { A, G, ens } = ctx, R = A.resumen;
    const out = [];
    const ejes = A.porEje.filter((g) => g.nombre !== 'Sin dato').slice().sort((a, b) => a.logro - b.logro);
    if (ejes.length && ejes[0].logro < 0.6) {
      const e = ejes[0], te = Temarios.eje(ens.asignatura, e.nombre);
      const peores = validasDe(A).filter((p) => p.eje === e.nombre).sort((a, b) => a.acierto - b.acierto).slice(0, 3).map((p) => p.n).sort((a, b) => a - b);
      out.push(`Retomar ${e.nombre} (${pct(e.logro)})${te ? `, partiendo por ${lista(te.contenidos.slice(0, 2).map(minus))}` : ''}. Las preguntas ${numeros(peores)} sirven como ejemplos para la clase.`);
    }
    const habs = A.porHabilidad.filter((g) => g.nombre !== 'Sin dato').slice().sort((a, b) => a.logro - b.logro);
    if (habs.length && habs[0].logro < 0.6) {
      const th = Temarios.habilidad(ens.asignatura, habs[0].nombre);
      out.push(`Dar más espacio a ${minus(habs[0].nombre)} (${pct(habs[0].logro)})${th ? `: ejercicios donde haya que ${th.descripcion}` : ''}.`);
    }
    const comp = R.corregidas >= MIN_N ? erroresCompartidos(A) : [];
    if (comp.length) out.push(`Corregir en voz alta ${comp.length === 1 ? 'la pregunta' : 'las preguntas'} ${numeros(comp)}: que quienes marcaron ${comp.length === 1 ? `la ${comp[0].distractor.letra}` : 'la alternativa más elegida'} expliquen su razonamiento y el curso encuentre dónde falla.`);
    const cAp = correctasAprobar(A), esc = Estad.conf.escala;
    const cerca = A.hechas.filter((x) => x.nota < esc.aprobacion - 1e-9 && cAp - x.correctas <= 3);
    if (cerca.length >= 2) out.push(`Reforzamiento corto para ${plural(cerca.length, 'estudiante', 'los estudiantes')} que ${cerca.length === 1 ? 'está' : 'están'} a tres respuestas o menos del ${nt(esc.aprobacion)}: con poco trabajo cambia la tasa de aprobación.`);
    if (G.length) out.push(`Armar ${G.length === 1 ? 'un grupo' : G.length + ' grupos'} de trabajo según el eje más débil de cada estudiante: ${lista(G.slice(0, 3).map((g) => `${g.nombre} (${plural(g.estudiantes.length, 'estudiante', 'estudiantes')})`))}.`);
    if (R.omision > 0.08) out.push(blancos(A, A.hechas).alFinal ? 'Practicar ensayos con tiempo controlado: buena parte de las respuestas en blanco está al final de la prueba.'
      : `Recordar que una respuesta en blanco no suma: se dejó sin responder el ${pct(R.omision)} de las preguntas.`);
    if (!out.length) out.push('Seguir con la planificación actual y subir la dificultad: no hay un eje ni una habilidad claramente descendidos.');
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
      const inicio = A.hechas.length < MIN_N ? `Cada columna cuenta cuántos de los ${A.hechas.length} estudiantes quedaron en ese tramo.` : `La mayor parte del curso se ubica entre ${moda.etiqueta.replace('–', ' y ')} puntos.`;
      parrafo(P, `${inicio} ${plural(sobre, 'estudiante supera', 'estudiantes superan')} los 600 puntos estimados, y el rango va de ${A.resumen.puntajeMin} a ${A.resumen.puntajeMax}.`, { color: C.texto2, tam: 10 });
    } else {
      const ap = Estad.conf.escala.aprobacion;
      const bins = A.histNotas.map((b, i) => ({ etiqueta: `${nt(b.desde)}–${nt(i === A.histNotas.length - 1 ? b.hasta : b.hasta - 0.1)}`, n: b.n, color: b.desde < ap ? C.critico : C.serie }));
      const k = A.histNotas.findIndex((b) => b.desde >= ap);
      columnas(P, bins, { linea: k > 0 ? k : null, lineaTexto: `aprobación ${nt(ap)}` });
      const reprob = A.resumen.corregidas - A.resumen.aprobados;
      const moda = bins.reduce((m, b) => (b.n > m.n ? b : m), bins[0]);
      parrafo(P, `${A.hechas.length < MIN_N ? `Cada columna cuenta cuántos de los ${A.hechas.length} estudiantes quedaron en ese tramo de nota.` : `La mayoría del curso obtuvo notas entre ${moda.etiqueta.replace('–', ' y ')}.`} ${reprob ? `${plural(reprob, 'estudiante quedó', 'estudiantes quedaron')} bajo ${nt(ap)} (columnas naranjas).` : 'Todos los estudiantes alcanzaron la nota de aprobación.'}`, { color: C.texto2, tam: 10 });
    }
  }

  // ---------- Gráficos técnicos ----------
  // Color de una celda según el logro (de celeste claro a azul oscuro)
  function tono(v) {
    const a = [234, 242, 252], b = [16, 66, 129], t = Math.max(0, Math.min(1, v));
    return a.map((x, i) => Math.round(x + (b[i] - x) * t));
  }

  // Nube de puntos de los estudiantes: cada punto es uno, apilados donde se juntan.
  // Muestra la media, la franja de ±1 desviación estándar y la mitad central (Q1 a Q3).
  function nube(P, puntos, { min, max, formato, media, de, q1, q3, alto = 42, marcas = [], etiquetas = [], meta = null }) {
    P.cabe(alto + 18);
    const { doc } = P, izq = M + 4, ancho = W - 8, eje = P.y + alto / 2 + 2, r = 1.5, d = r * 2 + 0.4;
    const X = (v) => izq + ((v - min) / ((max - min) || 1)) * ancho;
    // franja ±1 DE y caja Q1–Q3
    doc.setFillColor('#EEF3FB'); doc.rect(X(Math.max(min, media - de)), P.y, X(Math.min(max, media + de)) - X(Math.max(min, media - de)), alto, 'F');
    doc.setDrawColor(C.grid); doc.setLineWidth(0.3); doc.line(izq, P.y + alto, izq + ancho, P.y + alto);
    // posición sin choques
    const puestos = [];
    puntos.slice().sort((a, b) => a.valor - b.valor).forEach((p) => {
      const x = X(p.valor);
      for (let k = 0; k < 40; k++) {
        const nivel = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2);
        if (!puestos.some((q) => q.nivel === nivel && Math.abs(q.x - x) < d)) { puestos.push({ ...p, x, nivel }); break; }
      }
    });
    const maxNivel = Math.max(1, ...puestos.map((q) => Math.abs(q.nivel)));
    const paso = Math.min(d, (alto / 2 - 3) / maxNivel);
    puestos.forEach((q) => {
      doc.setFillColor(q.color || C.serie); doc.circle(q.x, eje - q.nivel * paso, r, 'F');
    });
    // media
    doc.setDrawColor(C.texto); doc.setLineWidth(0.6); doc.line(X(media), P.y - 1, X(media), P.y + alto);
    fuente(doc, 8.5, 'bold'); doc.text(`promedio ${formato(media)}`, X(media) + 1.5, P.y + 2);
    if (meta != null) {
      doc.setDrawColor(C.critico); doc.setLineWidth(0.5); doc.setLineDashPattern([1.2, 1], 0); doc.line(X(meta), P.y - 1, X(meta), P.y + alto); doc.setLineDashPattern([], 0);
      fuente(doc, 8.5, 'bold', C.critico); doc.text(`meta ${formato(meta)}`, X(meta) + (meta < media ? -1.5 : 1.5), P.y + alto - 2, { align: meta < media ? 'right' : 'left' });
    }
    // nombres de los extremos
    etiquetas.forEach((e) => {
      const q = puestos.find((x) => x.id === e.id);
      if (!q) return;
      fuente(doc, 7.5, 'normal', C.texto2);
      const y = eje - q.nivel * paso;
      doc.text(e.texto, q.x, y + (q.nivel >= 0 ? -2.5 : 4.5), { align: q.x < izq + 20 ? 'left' : q.x > izq + ancho - 20 ? 'right' : 'center' });
    });
    // eje
    fuente(doc, 8, 'normal', C.texto2);
    marcas.forEach((v) => { doc.line(X(v), P.y + alto, X(v), P.y + alto + 1); doc.text(formato(v), X(v), P.y + alto + 4.5, { align: 'center' }); });
    P.y += alto + 8;
    // leyenda
    doc.setFillColor('#EEF3FB'); doc.rect(M + 4, P.y - 1, 6, 3.2, 'F');
    doc.text('franja: la mayoría del curso (promedio ± 1 desviación estándar)', M + 12, P.y + 1.6);
    P.y += 6;
    return { q1, q3 };
  }

  // Acierto en cada pregunta, coloreado por eje, con la raya de pregunta crítica
  function porPregunta(P, A, ejesColor, nivelA) {
    // Con muchas preguntas se reparten en filas de hasta 33, para que cada barra tenga su número
    const n = A.preguntas.length, nFilas = Math.ceil(n / 33), porFila = Math.ceil(n / nFilas), alto = nFilas > 1 ? 32 : 48;
    const izq = M + 9, ancho = W - 9, paso = ancho / porFila, wb = paso * 0.7;
    for (let f = 0; f < nFilas; f++) {
      P.cabe(alto + 12);
      const { doc } = P, base = P.y + alto;
      fuente(doc, 7.5, 'normal', C.texto2);
      [0, 0.5, 1].forEach((v) => { const y = base - v * alto; doc.setDrawColor(C.grid); doc.setLineWidth(0.25); doc.line(izq, y, izq + ancho, y); doc.text(pct(v), izq - 1.5, y + 1, { align: 'right' }); });
      A.preguntas.slice(f * porFila, (f + 1) * porFila).forEach((p, k) => {
        const x = izq + paso * k + (paso - wb) / 2, h = p.acierto * alto;
        doc.setFillColor(p.piloto ? '#D5D9E0' : ejesColor(p.eje)); doc.rect(x, base - h, wb, h, 'F');
        if (nivelA && !p.piloto) { const v = nivelA.preguntas[p.i].acierto; doc.setDrawColor(C.texto); doc.setLineWidth(0.45); doc.line(x - 0.3, base - v * alto, x + wb + 0.3, base - v * alto); }
        fuente(doc, 7, 'normal', C.texto2); doc.text(String(p.n), x + wb / 2, base + 3.5, { align: 'center' });
      });
      const yc = base - Estad.CRITICA * alto;
      doc.setDrawColor(C.critico); doc.setLineWidth(0.5); doc.setLineDashPattern([1.2, 1], 0); doc.line(izq, yc, izq + ancho, yc); doc.setLineDashPattern([], 0);
      if (f === 0) { fuente(doc, 7.5, 'bold', C.critico); doc.text(`crítica: bajo ${pct(Estad.CRITICA)}`, izq + ancho, P.y - 1, { align: 'right' }); }
      P.y = base + 7;
    }
  }

  // Nube de puntos con dos ejes (un punto por estudiante). diagonal dibuja la línea y = x.
  function nubeXY(P, puntos, { xMin = 0, xMax = 1, yMin = 0, yMax = 1, fx = pct, fy = pct, etX, etY, diagonal = false, alto = 66, marcasX = [0, 0.25, 0.5, 0.75, 1], marcasY = [0, 0.25, 0.5, 0.75, 1], notas = [] }) {
    P.cabe(alto + 16);
    const { doc } = P, izq = M + 14, ancho = Math.min(W - 18, alto * 1.9), top = P.y, base = P.y + alto;
    const X = (v) => izq + ((v - xMin) / ((xMax - xMin) || 1)) * ancho, Y = (v) => base - ((v - yMin) / ((yMax - yMin) || 1)) * alto;
    fuente(doc, 7.5, 'normal', C.texto2);
    marcasY.forEach((v) => { doc.setDrawColor(C.grid); doc.setLineWidth(0.2); doc.line(izq, Y(v), izq + ancho, Y(v)); doc.text(fy(v), izq - 1.5, Y(v) + 1, { align: 'right' }); });
    marcasX.forEach((v) => { doc.setDrawColor(C.grid); doc.line(X(v), top, X(v), base); doc.text(fx(v), X(v), base + 4, { align: 'center' }); });
    if (diagonal) {
      const a = Math.max(xMin, yMin), b = Math.min(xMax, yMax);
      doc.setDrawColor(C.gris); doc.setLineWidth(0.4); doc.setLineDashPattern([1.2, 1], 0); doc.line(X(a), Y(a), X(b), Y(b)); doc.setLineDashPattern([], 0);
    }
    puntos.forEach((p) => { doc.setFillColor(p.color || C.serie); doc.circle(X(p.x), Y(p.y), 1.4, 'F'); });
    // nombre solo para los destacados, sin encimarse
    const usados = [];
    puntos.filter((p) => p.etiqueta).forEach((p) => {
      let y = Y(p.y) + 1;
      while (usados.some((u) => Math.abs(u.y - y) < 3 && Math.abs(u.x - X(p.x)) < 22)) y += 3;
      usados.push({ x: X(p.x), y });
      fuente(doc, 7, 'normal', C.texto); doc.text(p.etiqueta, X(p.x) + 2, y);
    });
    notas.forEach((nn) => { fuente(doc, 7.5, 'bold', nn.color || C.texto2); doc.text(nn.texto, X(nn.x), Y(nn.y), { align: nn.align || 'left' }); });
    fuente(doc, 8, 'bold', C.texto2);
    doc.text(etX, izq + ancho / 2, base + 8.5, { align: 'center' });
    doc.text(etY, izq - 12, top - 2.5);
    P.y = base + 13;
  }

  // Nubes de puntos que se agregan cuando hay datos para ellas
  function nubesExtra(P, ctx) {
    const { ens, A, H } = ctx;
    // Ensayo anterior contra este: sobre la diagonal, mejoró
    const idx = H ? H.puntos.findIndex((p) => p.ensayo.id === ens.id) : -1;
    if (idx > 0) {
      const pares = A.hechas.map((x) => {
        const s = (H.estudiantes.find((y) => y.e.id === x.e.id) || { serie: [] }).serie;
        const prev = s.slice(0, idx).filter((v) => v != null).pop();
        return prev == null ? null : { x: prev, y: x.logro, cambio: x.logro - prev, nombre: nombrePila(x.e.nombre) };
      }).filter(Boolean);
      if (pares.length >= MIN_N) {
        const ordenados = pares.slice().sort((a, b) => a.cambio - b.cambio);
        const destacar = new Set([...ordenados.slice(0, 2), ...ordenados.slice(-2)]);
        titulo(P, 'Nube de puntos: ensayo anterior frente a este ensayo', 6, 82);
        nubeXY(P, pares.map((p) => ({ x: p.x, y: p.y, color: p.cambio <= -0.05 ? C.critico : p.cambio >= 0.05 ? C.t3 : C.gris, etiqueta: destacar.has(p) ? p.nombre : '' })), {
          etX: `logro en ${H.puntos[idx - 1].ensayo.nombre}`, etY: 'logro en este ensayo', diagonal: true,
          notas: [{ texto: 'mejoraron', x: 0.04, y: 0.93, color: C.t3 }, { texto: 'bajaron', x: 0.96, y: 0.05, color: C.critico, align: 'right' }],
        });
        const suben = pares.filter((p) => p.cambio >= 0.05).length, bajan = pares.filter((p) => p.cambio <= -0.05).length;
        parrafo(P, `Cada punto es un estudiante. Los que están sobre la línea punteada mejoraron respecto del ensayo anterior. ${plural(suben, 'estudiante subió', 'estudiantes subieron')} 5 puntos o más (azul oscuro) y ${plural(bajan, 'bajó', 'bajaron')} 5 o más (naranjo). Los nombres marcan los mayores cambios.`, { color: C.texto2, tam: 10 });
      }
    }
    // Logro contra preguntas en blanco: muestra si omitir le está costando puntos al curso
    const omis = A.hechas.map((x) => x.omitidas / A.n);
    if (omis.some((v) => v > Estad.conf.umbrales.omision)) {
      const tope = Math.min(1, Math.ceil(Math.max(...omis) * 10) / 10 + 0.1);
      const marcas = Array.from({ length: Math.round(tope * 10) + 1 }, (_, k) => k / 10).filter((v, k) => k % (tope > 0.5 ? 2 : 1) === 0);
      titulo(P, 'Nube de puntos: logro y preguntas en blanco', 6, 82);
      nubeXY(P, A.hechas.map((x) => ({ x: x.omitidas / A.n, y: x.logro, color: x.omitidas / A.n > Estad.conf.umbrales.omision ? C.critico : C.serie, etiqueta: x.omitidas / A.n > Estad.conf.umbrales.omision ? nombrePila(x.e.nombre) : '' })), {
        xMax: tope, marcasX: marcas, etX: 'preguntas dejadas en blanco', etY: 'logro',
      });
      const muchos = A.hechas.filter((x) => x.omitidas / A.n > Estad.conf.umbrales.omision);
      parrafo(P, `Cada punto es un estudiante: a la derecha, más preguntas en blanco. ${muchos.length ? `${plural(muchos.length, 'estudiante dejó', 'estudiantes dejaron')} en blanco más del ${pct(Estad.conf.umbrales.omision)} de la prueba (en naranjo): conviene conversar con ${muchos.length === 1 ? 'él o ella' : 'ellos'} sobre la estrategia de responder.` : 'Nadie dejó una parte importante de la prueba en blanco.'}`, { color: C.texto2, tam: 10 });
    }
  }

  // Mapa técnico de preguntas: dificultad (acierto) contra discriminación
  function mapaPreguntas(P, A) {
    const alto = 62;
    P.cabe(alto + 16);
    const { doc } = P, izq = M + 12, ancho = W - 16, top = P.y, base = P.y + alto;
    const yMin = -0.2, yMax = 0.8;
    const X = (v) => izq + v * ancho, Y = (v) => base - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * alto;
    doc.setFillColor('#FBE9DF'); doc.rect(izq, Y(0.2), ancho, base - Y(0.2), 'F');
    doc.setFillColor('#F4F6FA'); doc.rect(izq, top, X(0.4) - izq, Y(0.2) - top, 'F');
    fuente(doc, 7.5, 'normal', C.texto2);
    [-0.2, 0, 0.2, 0.4, 0.6, 0.8].forEach((v) => { doc.setDrawColor(C.grid); doc.setLineWidth(0.2); doc.line(izq, Y(v), izq + ancho, Y(v)); doc.text(v.toFixed(1).replace('.', ','), izq - 1.5, Y(v) + 1, { align: 'right' }); });
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => doc.text(pct(v), X(v), base + 4, { align: 'center' }));
    fuente(doc, 8, 'bold', C.texto2);
    doc.text('acierto del curso (más a la derecha, más fácil)', izq + ancho / 2, base + 8.5, { align: 'center' });
    doc.text('discriminación', izq - 10, top - 2);
    fuente(doc, 7.5, 'bold', C.critico); doc.text('Zona a revisar: no distingue a quien sabe de quien no sabe', izq + 2, base - 2);
    fuente(doc, 7.5, 'bold', C.texto2); doc.text('Difíciles que discriminan bien', izq + 2, top + 3.5);
    A.preguntas.filter((p) => !p.piloto && p.discriminacion != null).forEach((p) => {
      const q = Estad.calidadPregunta(p), x = X(p.acierto), y = Y(p.discriminacion);
      doc.setFillColor(q.revisar ? C.critico : C.serie); doc.circle(x, y, 1.3, 'F');
      fuente(doc, 6.5, 'normal', C.texto); doc.text(String(p.n), x + 1.7, y + 0.9);
    });
    P.y = base + 13;
  }

  // Mapa de calor estudiante × eje
  function mapaEstudiantes(P, A, grupos) {
    const filas = A.hechas.slice().sort((a, b) => b.logro - a.logro);
    const et = 52, colW = Math.min(30, (W - et - 16) / grupos.length), lh = 5.2;
    const encabezado = () => {
      const { doc } = P;
      fuente(doc, 7.5, 'bold', C.texto2);
      grupos.forEach((g, k) => { const l = doc.splitTextToSize(g.nombre, colW - 1); doc.text(l.slice(0, 2), M + et + k * colW + colW / 2, P.y + 2.5, { align: 'center' }); });
      doc.text('Total', M + et + grupos.length * colW + 8, P.y + 2.5, { align: 'center' });
      P.y += 8;
    };
    P.cabe(lh * 8); encabezado();
    filas.forEach((x) => {
      if (!P.cabe(lh)) encabezado();
      const { doc } = P;
      fuente(doc, 8, 'normal'); doc.text(doc.splitTextToSize(`${x.e.lista}. ${nombreCorto(x.e.nombre)}`, et - 2)[0], M, P.y + lh * 0.7);
      grupos.forEach((g, k) => {
        const v = Estad.media(g.indices.map((i) => (x.aciertos[i] ? 1 : 0)));
        doc.setFillColor(...tono(v)); doc.rect(M + et + k * colW, P.y, colW - 0.6, lh - 0.6, 'F');
        fuente(doc, 7.5, 'bold', v > 0.55 ? '#FFFFFF' : C.texto); doc.text(pct(v), M + et + k * colW + colW / 2, P.y + lh * 0.68, { align: 'center' });
      });
      fuente(doc, 8, 'bold'); doc.text(pct(x.logro), M + et + grupos.length * colW + 8, P.y + lh * 0.7, { align: 'center' });
      P.y += lh;
    });
    P.y += 2;
    const { doc } = P;
    fuente(doc, 7.5, 'normal', C.texto2); doc.text('0%', M + et, P.y + 2.6);
    for (let i = 0; i <= 10; i++) { doc.setFillColor(...tono(i / 10)); doc.rect(M + et + 6 + i * 4, P.y, 4, 3.2, 'F'); }
    doc.text('100%   (más oscuro, más logro)', M + et + 6 + 44 + 2, P.y + 2.6);
    P.y += 7;
  }

  // Cuadrícula de respuestas de un estudiante
  function cuadricula(P, A, x) {
    const n = A.preguntas.length, porFila = n > 45 ? 15 : 10, celda = (W - (porFila - 1) * 1.2) / porFila, alto = 7.2;
    const filas = Math.ceil(n / porFila);
    P.cabe(filas * (alto + 1.2) + 10);
    const { doc } = P;
    A.preguntas.forEach((p, i) => {
      const c = i % porFila, f = Math.floor(i / porFila);
      const cx = M + c * (celda + 1.2), cy = P.y + f * (alto + 1.2);
      const r = x.r[i], ok = x.aciertos[i];
      if (p.piloto) { doc.setFillColor('#EEF0F3'); doc.roundedRect(cx, cy, celda, alto, 1, 1, 'F'); }
      else if (!r) { doc.setDrawColor(C.gris); doc.setLineWidth(0.3); doc.roundedRect(cx, cy, celda, alto, 1, 1, 'S'); }
      else { doc.setFillColor(ok ? '#D7E7FA' : '#F6D5C3'); doc.roundedRect(cx, cy, celda, alto, 1, 1, 'F'); }
      fuente(doc, 6.5, 'normal', C.texto2); doc.text(String(p.n), cx + 1.2, cy + 2.6);
      fuente(doc, 8.5, 'bold', p.piloto ? C.gris : ok ? C.t3 : r ? C.critico : C.gris);
      doc.text(r || '–', cx + celda / 2 + 1, cy + alto * 0.75, { align: 'center' });
      if (!ok && r && !p.piloto) { fuente(doc, 6, 'normal', C.texto2); doc.text(p.clave, cx + celda - 1, cy + 2.6, { align: 'right' }); }
    });
    P.y += filas * (alto + 1.2) + 1;
    leyenda(P, [{ nombre: 'Correcta', color: '#D7E7FA' }, { nombre: 'Incorrecta (arriba a la derecha, la clave)', color: '#F6D5C3' }, { nombre: 'En blanco', color: '#FFFFFF' }, { nombre: 'Piloto, no cuenta', color: '#EEF0F3' }]);
  }

  // Dos columnas de viñetas en recuadros (lo bueno / lo que debe mejorar)
  function recuadros(P, cajas) {
    const { doc } = P, gap = 5, w = (W - gap) / 2, tam = 9.5, lh = altoLinea(tam);
    const medir = (items) => items.reduce((s, t) => { fuente(doc, tam); return s + doc.splitTextToSize(t, w - 11).length * lh + 1.5; }, 0);
    const alto = Math.max(...cajas.map((c) => medir(c.items))) + 13;
    P.cabe(alto + 3);
    cajas.forEach((c, k) => {
      const x = M + k * (w + gap);
      doc.setFillColor(c.fondo); doc.roundedRect(x, P.y, w, alto, 2.5, 2.5, 'F');
      doc.setFillColor(c.color); doc.rect(x, P.y + 2, 1.4, alto - 4, 'F');
      fuente(doc, 11, 'bold', c.color); doc.text(c.titulo, x + 5, P.y + 7);
      let y = P.y + 12;
      c.items.forEach((t) => {
        fuente(doc, tam);
        const l = doc.splitTextToSize(t, w - 11);
        doc.setFillColor(c.color); doc.circle(x + 6, y + lh * 0.45, 0.8, 'F');
        l.forEach((s) => { doc.text(s, x + 9, y + lh * 0.75); y += lh; });
        y += 1.5;
      });
    });
    P.y += alto + 4;
  }

  // ---------- Informe del curso ----------
  const nombreCorto = (n) => { const p = String(n).split(/\s+/); return p.length > 2 ? p[0] + ' ' + p[p.length - 2] : n; };

  // sigue: alto del primer bloque de la sección, para no dejar la franja sola al pie
  function seccion(P, numero, texto, sigue = 80) {
    P.cabe(17 + sigue);
    P.y += 4;
    const { doc } = P;
    doc.setFillColor(C.azul); doc.roundedRect(M, P.y, W, 9, 1.5, 1.5, 'F');
    fuente(doc, 11.5, 'bold', '#FFFFFF'); doc.text(`${numero}. ${texto}`, M + 4, P.y + 6.2);
    P.y += 13;
  }

  function cuerpoCurso(P, ctx) {
    const { ens, cur, A, H, AL, G, N, HN } = ctx, R = A.resumen;
    banda(P, 'Informe para el docente', `${ens.nombre} · ${cur.nombre}`, [tipoEvaluacion(ens), ens.fecha, `generado el ${hoy()}`].filter(Boolean).join(' · '));
    titulo(P, 'Identificación del curso', 0, 40);
    ficha(P, [['Curso', cur.nombre], ['Asignatura', ens.asignatura || '–'], ['Evaluación aplicada', `${ens.nombre} (${tipoEvaluacion(ens)})`], ['Fecha', ens.fecha || 'sin fecha registrada'],
      ['Estudiantes evaluados', `${R.corregidas} de ${R.total}`], ['Participación', pct1(R.participacion)]]);
    avisoDatos(P, ctx.validacion);
    if (ctx.validacion && !ctx.validacion.ok) { parrafo(P, 'Hay problemas en los datos que afectan los cálculos. Corrígelos y vuelve a generar el informe: no se muestran estadísticas para no entregar cifras engañosas.', { estilo: 'bold', color: C.critico }); return; }
    titulo(P, 'Lo principal', 4);
    vinetas(P, lineasPrincipales(ctx));
    const tarjetas = [
      { etiqueta: 'Logro promedio', valor: pct(R.media), detalle: `mediana ${pct(R.mediana)}` },
      { etiqueta: 'Nota promedio', valor: nt(R.notaMedia), detalle: `exigencia ${pct(Estad.conf.escala.exigencia)}` },
      { etiqueta: 'Aprueban', valor: pct(R.aprobados / R.corregidas), detalle: `${R.aprobados} de ${R.corregidas}` },
    ];
    if (R.puntajeMedia != null) tarjetas.push({ etiqueta: 'Puntaje PAES (est.)', valor: R.puntajeMedia, detalle: `rango ${R.puntajeMin}–${R.puntajeMax}` });
    else if (R.adecuado != null) tarjetas.push({ etiqueta: 'En Adecuado (est.)', valor: pct(R.adecuado), detalle: 'estándar estimado' });
    P.y += 2; cifras(P, tarjetas);

    // 1. Curso en general
    seccion(P, 1, 'El curso en general', 92);
    titulo(P, R.puntajeMedia != null ? '¿Cómo se distribuyen los puntajes?' : '¿Cómo se distribuyen las notas?', 0, 70);
    distribucion(P, A);
    titulo(P, 'Resumen estadístico', 6, 60);
    tablaIndicadores(P, A);
    nivelesDesempeno(P, A);

    const conPuntaje = R.puntajeMedia != null, pocos = R.corregidas < MIN_N, meta = metaDe(ctx);
    if (!pocos) {
    titulo(P, 'Nube de puntos: ¿qué tan disperso está el curso?', 6, 60);
    const vals = A.hechas.map((x) => (conPuntaje ? x.puntaje : x.logro));
    const med = Estad.media(vals);
    const sd = vals.length > 1 ? Math.sqrt(vals.reduce((s, v) => s + (v - med) ** 2, 0) / (vals.length - 1)) : 0;
    const orden = A.hechas.slice().sort((a, b) => a.logro - b.logro);
    const extremos = [...new Set([...orden.slice(0, 2), ...orden.slice(-2)])].map((x) => ({ id: x.e.id, texto: nombrePila(x.e.nombre) }));
    const fmt = conPuntaje ? (v) => String(Math.round(v)) : pct;
    nube(P, A.hechas.map((x) => ({ id: x.e.id, valor: conPuntaje ? x.puntaje : x.logro, color: x.nota < Estad.conf.escala.aprobacion ? C.critico : C.serie })), {
      min: conPuntaje ? 100 : 0, max: conPuntaje ? 1000 : 1, formato: fmt, media: med, de: sd,
      marcas: conPuntaje ? [100, 250, 400, 550, 700, 850, 1000] : [0, 0.2, 0.4, 0.6, 0.8, 1],
      meta: meta && meta.escala === (conPuntaje ? 'puntaje' : 'logro') ? meta.valor : null,
    });
    const cv = med ? sd / med : 0;
    const q1 = conPuntaje ? null : R.q1, q3 = conPuntaje ? null : R.q3;
    parrafo(P, `Cada punto es un estudiante; los naranjos están bajo la nota de aprobación. La desviación estándar es de ${conPuntaje ? Math.round(sd) + ' puntos' : pts(sd)}: ${cv < 0.2 ? 'el curso es bastante parejo, la mayoría rinde parecido' : cv < 0.35 ? 'hay diferencias moderadas entre estudiantes' : 'el curso es muy heterogéneo, conviene trabajar con grupos según nivel'}.${q1 != null ? ` La mitad central del curso está entre ${pct(q1)} y ${pct(q3)} de logro.` : ''} Los resultados extremos son de ${lista(extremos.map((e) => e.texto))}.${meta && meta.escala === (conPuntaje ? 'puntaje' : 'logro') ? ' La línea punteada naranja es la meta del colegio.' : ''}`, { color: C.texto2, tam: 10 });
    nubesExtra(P, ctx);
    }

    if (A.estandares) {
      const filas = [{ nombre: cur.nombre, partes: A.estandares.map((s) => s.n), destacado: true }];
      if (N && N.porCurso.length >= 2) {
        N.porCurso.filter((x) => x.curso.id !== cur.id).forEach((x) => filas.push({ nombre: x.curso.nombre, partes: x.A.estandares.map((s) => s.n) }));
        filas.push({ nombre: ctx.nivel, partes: N.A.estandares.map((s) => s.n) });
      }
      titulo(P, 'Estudiantes por estándar de aprendizaje', 6, filas.length * 12.5 + 22);
      apiladas(P, filas, Estad.ESTANDARES.map((s) => s.nombre));
      parrafo(P, 'El estándar es una estimación hecha con los cortes del ensayo; el SIMCE oficial usa otro modelo de cálculo.', { color: C.texto2, tam: 9 });
    }

    // 2. Ejes y habilidades
    const conNivel = N && N.porCurso.length >= 2;
    seccion(P, 2, 'Comparación por eje y por habilidad', A.porEje.length * 11 + 30);
    const grupo = (nombre, fuente, fuenteNivel, esEje) => {
      const filas = fuente.filter((g) => g.nombre !== 'Sin dato').slice().sort((a, b) => b.logro - a.logro).map((g) => {
        const gn = fuenteNivel && fuenteNivel.find((y) => y.nombre === g.nombre);
        return { nombre: g.nombre, valor: g.logro, ref: gn ? gn.logro : null, color: g.logro < 0.5 ? C.critico : C.serie, preguntas: g.preguntas };
      });
      if (!filas.length) return;
      titulo(P, nombre, 2, filas.length * 11 + 10);
      barras(P, filas, { refNombre: conNivel ? `Raya negra: promedio de ${ctx.nivel}` : '' });
      if (filas.length >= 2) {
        const a = filas[0], b = filas[filas.length - 1];
        let t = `${esEje ? 'El punto más fuerte del curso es' : 'La habilidad mejor lograda es'} ${a.nombre} (${pct(a.valor)}), y ${esEje ? 'el más débil' : 'la más débil'}, ${b.nombre} (${pct(b.valor)}).`;
        const bajoNivel = filas.filter((f) => f.ref != null && f.valor - f.ref <= -0.05).map((f) => f.nombre);
        if (bajoNivel.length) t += ` Respecto del nivel, el curso está bajo el promedio en ${lista(bajoNivel)}.`;
        if (esEje) {
          const te = Temarios.eje(ens.asignatura, b.nombre);
          if (te && b.valor < 0.6) t += ` En ${b.nombre} el temario incluye: ${lista(te.contenidos.map((c) => c.toLowerCase()))}.`;
        } else {
          const th = Temarios.habilidad(ens.asignatura, b.nombre);
          if (th && b.valor < 0.6) t += ` ${b.nombre} consiste en ${th.descripcion}.`;
        }
        parrafo(P, t, { color: C.texto2, tam: 10 });
      }
    };
    grupo('Resultados por eje', A.porEje, conNivel ? N.A.porEje : null, true);
    grupo('Resultados por habilidad', A.porHabilidad, conNivel ? N.A.porHabilidad : null, false);

    const ejesLista = A.porEje.filter((g) => g.nombre !== 'Sin dato');
    if (ejesLista.length >= 1) {
      titulo(P, 'Mapa del curso: cada estudiante en cada eje', 6, 60);
      parrafo(P, 'Ordenado de mayor a menor logro. Permite ver de un vistazo qué estudiantes y qué ejes concentran las dificultades.', { color: C.texto2, tam: 9.5 });
      mapaEstudiantes(P, A, ejesLista);
    }

    // 3. Preguntas
    seccion(P, 3, 'Comparación por pregunta', 85);
    const colorEje = (() => { const m = new Map(ejesLista.map((g, k) => [g.nombre, C.cat[k] || C.gris])); return (e) => m.get(e) || C.gris; })();
    titulo(P, 'Acierto en cada pregunta', 0, 70);
    porPregunta(P, A, colorEje, conNivel ? N.A : null);
    leyenda(P, [...ejesLista.slice(0, 5).map((g, k) => ({ nombre: g.nombre, color: C.cat[k] })), ...(A.pilotos ? [{ nombre: 'Piloto', color: '#D5D9E0' }] : [])]);
    const criticas = A.preguntas.filter((p) => p.critica);
    parrafo(P, `Cada barra es una pregunta, con el color de su eje.${pocos ? ` Con ${R.corregidas} hojas, cada estudiante mueve mucho el porcentaje: tómalo como referencia.` : ''}${conNivel ? ` La rayita negra sobre cada barra es el acierto de ${ctx.nivel}.` : ''} ${criticas.length ? `${plural(criticas.length, 'pregunta quedó', 'preguntas quedaron')} bajo la línea crítica: ${lista(criticas.map((p) => String(p.n)))}.` : 'Ninguna pregunta quedó bajo la línea crítica.'}`, { color: C.texto2, tam: 10 });

    const dificiles = A.preguntas.filter((p) => !p.piloto).sort((a, b) => a.acierto - b.acierto).slice(0, 5);
    if (dificiles.length) {
      titulo(P, 'Las preguntas que más costaron', 6, 70);
      barras(P, dificiles.map((p) => ({ nombre: `Pregunta ${p.n}${p.eje ? ' · ' + p.eje : ''}`, valor: p.acierto, color: p.acierto < 0.4 ? C.critico : C.serie })), { etiquetaAncho: 72 });
      vinetas(P, dificiles.slice(0, 3).map((p) => {
        let t = `Pregunta ${p.n}${p.eje ? ` (${p.eje}${p.habilidad ? ', ' + p.habilidad.toLowerCase() : ''}${p.contenido ? ', ' + p.contenido : ''})` : ''}: respondió bien el ${pct(p.acierto)} del curso.`;
        if (p.distractor && p.distractor.n >= 3 && p.distractor.n / (p.total || 1) >= 0.25) t += ` La alternativa ${p.distractor.letra} la eligió el ${pct(p.distractor.n / p.total)}: conviene revisar por qué parecía correcta.`;
        else if (p.omision >= 0.2) t += ` El ${pct(p.omision)} la dejó en blanco.`;
        return t;
      }), { tam: 10 });
    }

    if (!pocos) {
      titulo(P, 'Mapa técnico de las preguntas', 6, 85);
      mapaPreguntas(P, A);
      const revisar = A.preguntas.filter((p) => !p.piloto && Estad.calidadPregunta(p).revisar);
      const kr = Estad.confiabilidad(A);
      let t = 'La discriminación compara el acierto del 27% con mejor resultado y del 27% con menor resultado: sobre 0,3 la pregunta distingue bien. ';
      t += revisar.length ? `Conviene revisar la redacción o la clave de ${plural(revisar.length, 'la pregunta', 'las preguntas')} ${lista(revisar.slice(0, 8).map((p) => String(p.n)))}${revisar.length > 8 ? ' y otras' : ''}: la respondieron igual quienes saben y quienes no.` : 'Todas las preguntas distinguen razonablemente bien.';
      if (kr != null) t += ` La confiabilidad del ensayo en este curso (KR-20) es ${kr.toFixed(2).replace('.', ',')}: ${kr >= 0.8 ? 'muy buena, los resultados son consistentes' : kr >= 0.7 ? 'aceptable' : 'baja, por lo que conviene tomar los resultados individuales con cautela'}.`;
      parrafo(P, t, { color: C.texto2, tam: 10 });
    }

    // 4. Paralelos y evolución
    const sel = ctx.seleccion || [], conSel = sel.length > 1, conEvol = conSel || (H && H.puntos.length >= 2);
    let ns = 4;
    seccion(P, ns++, 'Contenidos, OA y habilidades', 50);
    contenidosHabilidades(P, A);
    seccion(P, ns++, 'Análisis pregunta por pregunta', 60);
    preguntaPorPregunta(P, A);
    detallePreguntas(P, A);
    if (conNivel || conEvol) seccion(P, ns++, 'Comparación entre cursos y evolución', 60);
    if (conNivel) {
      titulo(P, `Comparación con otros cursos de ${ctx.nivel}`, 0, 40);
      compararCursos(P, N.porCurso, N.A, { propio: cur.id, nombreInst: ctx.nivel });
      const ord = N.porCurso.slice().sort((a, b) => b.A.resumen.media - a.A.resumen.media);
      const lugar = ord.findIndex((x) => x.curso.id === cur.id) + 1;
      let t = `${cur.nombre} quedó en el lugar ${lugar} de ${ord.length} paralelos. La diferencia entre el mejor y el más bajo es de ${pts(ord[0].A.resumen.media - ord[ord.length - 1].A.resumen.media)}.`;
      if (N.brechas.length) t += ` Hay ${plural(N.brechas.length, 'pregunta', 'preguntas')} con 25 puntos o más de diferencia entre paralelos (${lista(N.brechas.slice(0, 4).map((p) => String(p.n)))}), lo que puede indicar contenidos que no se trabajaron igual en todos los cursos.`;
      parrafo(P, t, { color: C.texto2, tam: 10 });
    }
    if (conSel) evolucionSeleccion(P, ctx);
    else if (H && H.puntos.length >= 2) {
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

    // 5. Apoyo y sugerencias
    seccion(P, ns++, 'Diagnóstico, apoyo y plan de trabajo', 50);
    const conAlerta = AL.filter((a) => a.alertas.length).sort((a, b) => b.gravedad - a.gravedad || a.x.logro - b.x.logro);
    titulo(P, 'Estudiantes que requieren apoyo', 0, 30);
    if (conAlerta.length) {
      parrafo(P, 'Estudiantes con bajo logro, que bajaron respecto del ensayo anterior o que dejaron muchas preguntas en blanco. Las filas destacadas están en riesgo.', { color: C.texto2, tam: 10 });
      tabla(P, [{ titulo: 'N°', ancho: 10 }, { titulo: 'Estudiante', ancho: 62 }, { titulo: 'Logro', ancho: 16, der: true }, { titulo: 'Nota', ancho: 14, der: true }, { titulo: 'Motivo', ancho: W - 102 }],
        conAlerta.map((a) => ({ resaltar: a.alertas.some((x) => x.id === 'riesgo'), celdas: [a.x.e.lista, a.x.e.nombre, pct(a.x.logro), nt(a.x.nota), a.alertas.map((x) => x.texto).join('; ')] })));
    } else parrafo(P, 'Ningún estudiante cumple los criterios de alerta en este ensayo.', { color: C.texto2 });
    if (G.length) {
      titulo(P, 'Grupos de reforzamiento sugeridos', 3, 20);
      vinetas(P, G.map((g) => `${g.nombre}: ${lista(g.estudiantes.map((s) => nombreCorto(s.x.e.nombre)))}.`), { tam: 10 });
    }
    titulo(P, 'Acciones sugeridas', 6, 50);
    parrafo(P, 'Una propuesta para acordar en el departamento. El responsable y el plazo se pueden ajustar.', { color: C.texto2, tam: 9.5 });
    const plazos = ['Próximas 2 semanas', 'Próxima clase', 'Próximas 2 semanas', 'Este mes', 'Antes del próximo ensayo', 'Este mes'];
    const resp = (ctx.colegio && ctx.colegio.responsable) || 'Docente de la asignatura';
    tabla(P, [{ titulo: 'Acción', ancho: W - 82, envolver: true }, { titulo: 'Responsable', ancho: 46, envolver: true }, { titulo: 'Plazo', ancho: 36, envolver: true }],
      sugerencias(ctx).map((t, i) => ({ celdas: [t, resp, plazos[i] || 'Este mes'] })));
    planIntervencion(P, ctx);

    titulo(P, 'Resultados por estudiante', 6, 50);
    const conEst = !!A.estandares;
    const cols = [{ titulo: 'N°', ancho: 10 }, { titulo: 'Estudiante', ancho: pocos ? 82 : 64 }, { titulo: 'Correctas', ancho: 20, der: true }, { titulo: 'Logro', ancho: 16, der: true }, { titulo: 'Nota', ancho: 14, der: true }];
    if (!pocos) cols.push({ titulo: 'Percentil', ancho: 18, der: true });
    cols.push(conPuntaje ? { titulo: 'Puntaje est.', ancho: W - 142, der: true } : conEst ? { titulo: 'Estándar est.', ancho: W - 142 } : { titulo: 'Lugar', ancho: W - 142, der: true });
    const percentil = (x) => { const ls = A.hechas.map((y) => y.logro); return Math.round(((ls.filter((v) => v < x.logro).length + ls.filter((v) => v === x.logro).length / 2) / ls.length) * 100); };
    const sinHoja = A.estudiantes.filter((x) => !x.corregida);
    tabla(P, cols, A.estudiantes.filter((x) => x.corregida || sinHoja.length <= 3).map((x) => ({
      celdas: x.corregida ? [x.e.lista, x.e.nombre, `${x.correctas}/${A.n}`, pct(x.logro), nt(x.nota), ...(pocos ? [] : [percentil(x)]),
        conPuntaje ? x.puntaje : conEst ? x.estandar.nombre : `${A.hechas.filter((y) => y.logro > x.logro).length + 1}°`] : [x.e.lista, x.e.nombre, 'sin hoja', '', '', '', ''],
    })));
    if (sinHoja.length > 3) parrafo(P, `Sin hoja corregida (${sinHoja.length}): ${lista(sinHoja.map((x) => `${x.e.lista}. ${nombreCorto(x.e.nombre)}`))}.`, { tam: 9 });
    parrafo(P, `${pocos ? '' : 'El percentil indica qué porcentaje del curso obtuvo un resultado menor.'}${conPuntaje ? ' El puntaje se estima con la tabla de conversión del ensayo.' : conEst ? ' El estándar se estima con los cortes del ensayo.' : ''}`, { color: C.texto2, tam: 8.5 });
    tablaIndividual(P, ctx);
    notaMetodologica(P, { tieneTabla: Estad.tieneTabla(ens), tieneCortes: !!A.estandares });
  }

  // ---------- Varios ensayos ----------
  const etiquetaEns = (e) => (e.fecha ? e.fecha.slice(0, 5) : e.nombre.slice(0, 10));
  const conversionDe = (x) => (x.puntaje != null ? `${x.puntaje} pts.` : x.estandar ? x.estandar.nombre : '');
  // Agrupa los ensayos elegidos por asignatura, conservando el orden por fecha
  function porAsignatura(sel) {
    const g = new Map();
    sel.forEach((s, i) => { const k = Estad.grupoEnsayo(s.ens); if (!g.has(k)) g.set(k, []); g.get(k).push({ ...s, i }); });
    return [...g].map(([nombre, items]) => ({ nombre, items }));
  }
  const cambioTexto = (d) => (Math.abs(d) < 0.02 ? 'se mantuvo' : `${d > 0 ? 'subió' : 'bajó'} ${pts(d)}`);

  function evolucionSeleccion(P, ctx) {
    const { cur, A } = ctx, sel = ctx.seleccion, grupos = porAsignatura(sel);
    titulo(P, 'Resultados en los ensayos seleccionados', 6, 50);
    const conConv = sel.some((s) => s.A.resumen.puntajeMedia != null || s.A.resumen.adecuado != null);
    const cols = [{ titulo: 'Ensayo', ancho: conConv ? 56 : 90, envolver: true, negrita: true }, { titulo: 'Fecha', ancho: 20, negrita: false }, { titulo: 'Hojas', ancho: 14, der: true }, { titulo: 'Logro', ancho: 16, der: true }, { titulo: 'Nota', ancho: 14, der: true }, { titulo: 'Aprueban', ancho: 20, der: true }];
    if (conConv) cols.push({ titulo: 'Puntaje o Adecuado', ancho: W - 140, der: true });
    tabla(P, cols, sel.map((s) => {
      const R = s.A.resumen;
      return { resaltar: false, celdas: [s.ens.nombre + (s.ens.id === ctx.ens.id ? ' (principal)' : ''), s.ens.fecha || '', R.corregidas, pct(R.media), nt(R.notaMedia), pct(R.aprobados / (R.corregidas || 1)),
        ...(conConv ? [R.puntajeMedia != null ? `${R.puntajeMedia} pts.` : R.adecuado != null ? pct(R.adecuado) : '–'] : [])] };
    }));
    titulo(P, 'Evolución del logro promedio', 4, 70);
    const series = grupos.map((g, k) => ({ nombre: grupos.length > 1 ? g.nombre : cur.nombre, color: C.cat[k] || C.gris, grueso: true, unir: true, valores: sel.map((_, i) => { const it = g.items.find((x) => x.i === i); return it ? it.A.resumen.media : null; }) }));
    lineas(P, series, sel.map((s) => etiquetaEns(s.ens)));
    const frases = grupos.filter((g) => g.items.length >= 2).map((g) => {
      const a = g.items[0], b = g.items[g.items.length - 1];
      return `En ${g.nombre}, entre ${a.ens.nombre} y ${b.ens.nombre} el logro promedio ${cambioTexto(b.A.resumen.media - a.A.resumen.media)} (de ${pct(a.A.resumen.media)} a ${pct(b.A.resumen.media)}).`;
    });
    if (grupos.length > 1) frases.push('Cada línea es una asignatura; los ensayos de distintas asignaturas no son directamente comparables.');
    if (frases.length) parrafo(P, frases.join(' '), { color: C.texto2, tam: 10 });
    // Un resumen por asignatura: último ensayo, ejes y evolución
    grupos.forEach((g) => resumenAsignatura(P, ctx, g));
  }

  function resumenAsignatura(P, ctx, g) {
    const u = g.items[g.items.length - 1], prev = g.items.length >= 2 ? g.items[g.items.length - 2] : null, R = u.A.resumen;
    seccionChica(P, `Resumen de ${g.nombre}`, `${plural(g.items.length, 'ensayo', 'ensayos')} · último: ${u.ens.nombre}`);
    const t = [
      { etiqueta: 'Logro promedio', valor: pct(R.media), detalle: prev ? `antes: ${pct(prev.A.resumen.media)}` : `mediana ${pct(R.mediana)}` },
      { etiqueta: 'Nota promedio', valor: nt(R.notaMedia), detalle: prev ? `antes: ${nt(prev.A.resumen.notaMedia)}` : '' },
      { etiqueta: 'Aprueban', valor: pct(R.aprobados / (R.corregidas || 1)), detalle: `${R.aprobados} de ${R.corregidas}` },
    ];
    if (R.puntajeMedia != null) t.push({ etiqueta: 'Puntaje PAES (est.)', valor: R.puntajeMedia, detalle: prev && prev.A.resumen.puntajeMedia != null ? `antes: ${prev.A.resumen.puntajeMedia}` : `rango ${R.puntajeMin}–${R.puntajeMax}` });
    else if (R.adecuado != null) t.push({ etiqueta: 'En Adecuado (est.)', valor: pct(R.adecuado), detalle: prev && prev.A.resumen.adecuado != null ? `antes: ${pct(prev.A.resumen.adecuado)}` : '' });
    cifras(P, t);
    const ejes = u.A.porEje.filter((e) => e.nombre !== 'Sin dato').slice().sort((a, b) => b.logro - a.logro);
    const frases = [];
    if (g.items.length >= 2) { const a = g.items[0]; frases.push(`Desde ${a.ens.nombre}, el logro promedio ${cambioTexto(R.media - a.A.resumen.media)}${prev && prev !== a ? `, y respecto del ensayo anterior ${cambioTexto(R.media - prev.A.resumen.media)}` : ''}.`); }
    if (ejes.length >= 2) frases.push(`En el último ensayo, el eje más fuerte fue ${ejes[0].nombre} (${pct(ejes[0].logro)}) y el más débil, ${ejes[ejes.length - 1].nombre} (${pct(ejes[ejes.length - 1].logro)}).`);
    const habs = u.A.porHabilidad.filter((e) => e.nombre !== 'Sin dato').slice().sort((a, b) => a.logro - b.logro);
    if (habs.length >= 2) frases.push(`La habilidad que más cuesta es ${minus(habs[0].nombre)} (${pct(habs[0].logro)}).`);
    const debil = ejes[ejes.length - 1], te = debil && Temarios.eje(u.ens.asignatura, debil.nombre);
    if (te && debil.logro < 0.6) frases.push(`Para reforzar ${debil.nombre}: ${lista(te.contenidos.slice(0, 4).map(minus))}.`);
    if (frases.length) parrafo(P, frases.join(' '), { tam: 10 });
    if (ejes.length) {
      const antes = prev ? new Map(prev.A.porEje.map((e) => [e.nombre, e.logro])) : null;
      barras(P, ejes.map((e) => ({ nombre: e.nombre, valor: e.logro, ref: antes && antes.has(e.nombre) ? antes.get(e.nombre) : null, color: e.logro < 0.5 ? C.critico : C.serie })),
        { refNombre: prev ? 'Raya negra: resultado en el ensayo anterior de esta asignatura' : '', alto: 5.8, gap: 3.6 });
    }
    if (g.items.length >= 2) {
      const nombres = [...new Set(g.items.flatMap((it) => it.A.porEje.filter((e) => e.nombre !== 'Sin dato').map((e) => e.nombre)))];
      if (nombres.length) {
        const ancho = Math.min(26, (W - 60) / g.items.length);
        tabla(P, [{ titulo: 'Eje', ancho: W - ancho * g.items.length - 22, envolver: true }, ...g.items.map((it) => ({ titulo: etiquetaEns(it.ens), ancho, der: true, negrita: false })), { titulo: 'Cambio', ancho: 22, der: true }],
          nombres.map((nombre) => {
            const v = g.items.map((it) => { const e = it.A.porEje.find((y) => y.nombre === nombre); return e ? e.logro : null; });
            const hay = v.filter((x) => x != null), d = hay.length >= 2 ? hay[hay.length - 1] - hay[0] : null;
            return { resaltar: d != null && d <= -0.05, celdas: [nombre, ...v.map((x) => (x == null ? '–' : pct(x))), d == null ? '–' : `${d > 0 ? '+' : ''}${Math.round(d * 100)}`] };
          }));
        parrafo(P, 'Cambio: del primer al último ensayo de la asignatura, en puntos de logro. Las filas destacadas bajaron 5 puntos o más.', { color: C.texto2, tam: 9 });
      }
    }
  }

  // Encabezado de un bloque dentro de una sección
  function seccionChica(P, texto, sub) {
    P.cabe(70);
    P.y += 5;
    const { doc } = P;
    doc.setFillColor(C.suave); doc.roundedRect(M, P.y, W, sub ? 12 : 8, 1.5, 1.5, 'F');
    doc.setFillColor(C.azul); doc.rect(M, P.y, 1.6, sub ? 12 : 8, 'F');
    fuente(doc, 11.5, 'bold', C.azul); doc.text(texto, M + 5, P.y + 5.5);
    if (sub) { fuente(doc, 8.5, 'normal', C.texto2); doc.text(doc.splitTextToSize(sub, W - 8)[0], M + 5, P.y + 10); }
    P.y += (sub ? 12 : 8) + 5;
  }

  // Ficha: los ensayos elegidos para un estudiante
  function ensayosEstudiante(P, ctx, x, pila) {
    const sel = ctx.seleccion, grupos = porAsignatura(sel);
    const filas = sel.map((s) => ({ s, y: s.A.estudiantes.find((z) => z.e.id === x.e.id) }));
    titulo(P, 'Sus resultados en los ensayos seleccionados', 4, 40);
    tabla(P, [{ titulo: 'Ensayo', ancho: 62, envolver: true, negrita: true }, { titulo: 'Fecha', ancho: 20, negrita: false }, { titulo: 'Correctas', ancho: 20, der: true }, { titulo: 'Logro', ancho: 16, der: true }, { titulo: 'Nota', ancho: 14, der: true }, { titulo: 'Puntaje / nivel', ancho: 22, der: true }, { titulo: 'vs. curso', ancho: W - 154, der: true }],
      filas.map(({ s, y }) => ({ celdas: y && y.corregida ? [s.ens.nombre, s.ens.fecha || '', `${y.correctas}/${s.A.n}`, pct(y.logro), nt(y.nota), conversionDe(y) || '–', `${y.logro - s.A.resumen.media >= 0 ? '+' : ''}${Math.round((y.logro - s.A.resumen.media) * 100)}`]
        : [s.ens.nombre, s.ens.fecha || '', 'no rindió', '', '', '', ''] })));
    const unGrupo = grupos.length === 1;
    const series = grupos.map((g, k) => ({ nombre: unGrupo ? pila : g.nombre, color: C.cat[k] || C.gris, grueso: true, unir: true, valores: sel.map((_, i) => { const it = g.items.find((z) => z.i === i); const y = it && it.A.estudiantes.find((z) => z.e.id === x.e.id); return y && y.corregida ? y.logro : null; }) }));
    if (unGrupo) series.push({ nombre: 'Curso', color: C.gris, punteada: true, unir: true, valores: sel.map((s) => s.A.resumen.media) });
    if (series.some((sr) => sr.valores.filter((v) => v != null).length >= 2)) {
      lineas(P, series, sel.map((s) => etiquetaEns(s.ens)), { alto: 32 });
      const frases = grupos.map((g) => {
        const r = g.items.map((it) => ({ it, y: it.A.estudiantes.find((z) => z.e.id === x.e.id) })).filter((o) => o.y && o.y.corregida);
        if (r.length < 2) return null;
        const a = r[0], b = r[r.length - 1];
        return `En ${g.nombre}, ${pila} ${cambioTexto(b.y.logro - a.y.logro)} entre ${a.it.ens.nombre} y ${b.it.ens.nombre}.`;
      }).filter(Boolean);
      if (frases.length) parrafo(P, frases.join(' ') + (unGrupo ? ' La línea punteada es el promedio del curso.' : ''), { color: C.texto2, tam: 9.5 });
    }
    // Resumen por asignatura con su último ensayo rendido
    titulo(P, 'Resumen por asignatura', 4, 30);
    const items = grupos.map((g) => {
      const r = g.items.map((it) => ({ it, y: it.A.estudiantes.find((z) => z.e.id === x.e.id) })).filter((o) => o.y && o.y.corregida);
      if (!r.length) return `${g.nombre}: no rindió los ensayos seleccionados.`;
      const u = r[r.length - 1], A2 = u.it.A, y = u.y;
      const P2 = Estad.perfil(A2, x.e.id, null);
      const ejes = P2 ? P2.porEje.filter((e) => e.nombre !== 'Sin dato').slice().sort((a, b) => b.propio - a.propio) : [];
      let t = `${g.nombre}: en ${u.it.ens.nombre} logró ${pct(y.logro)} (nota ${nt(y.nota)}${conversionDe(y) ? `, ${conversionDe(y)}` : ''}), ${Math.abs(y.logro - A2.resumen.media) < 0.02 ? 'igual que el promedio del curso' : `${pts(y.logro - A2.resumen.media)} ${y.logro > A2.resumen.media ? 'sobre' : 'bajo'} el promedio del curso`}.`;
      if (r.length >= 2) t += ` Desde el primer ensayo ${cambioTexto(y.logro - r[0].y.logro)}.`;
      if (ejes.length >= 2) {
        const d = ejes[ejes.length - 1], te = Temarios.eje(u.it.ens.asignatura, d.nombre);
        t += ` Su fuerte es ${ejes[0].nombre} (${pct(ejes[0].propio)}) ${d.propio >= 0.75 ? 'y su resultado más bajo, igualmente bueno, es' : 'y lo que más conviene reforzar es'} ${d.nombre} (${pct(d.propio)})${te && d.propio < 0.6 ? `: ${lista(te.contenidos.slice(0, 3).map(minus))}` : ''}.`;
      }
      // Ejes que se repiten como fuertes o débiles en todos los ensayos rendidos de la asignatura
      if (r.length >= 2) {
        const perfiles = r.map((o) => Estad.perfil(o.it.A, x.e.id, null)).filter(Boolean);
        const nombres = [...new Set(perfiles.flatMap((pf) => pf.porEje.map((e) => e.nombre)))].filter((n) => n !== 'Sin dato');
        const valores = (n) => perfiles.map((pf) => (pf.porEje.find((e) => e.nombre === n) || {}).propio).filter((v) => v != null);
        const siempreBajo = nombres.filter((n) => { const v = valores(n); return v.length >= 2 && v.every((z) => z < 0.5); });
        const siempreAlto = nombres.filter((n) => { const v = valores(n); return v.length >= 2 && v.every((z) => z >= 0.7); });
        if (siempreBajo.length) t += ` ${lista(siempreBajo)} ${siempreBajo.length === 1 ? 'quedó' : 'quedaron'} bajo 50% en los ${perfiles.length} ensayos: es lo que más se repite como pendiente.`;
        if (siempreAlto.length) t += ` En ${lista(siempreAlto)} estuvo sobre 70% en todos.`;
      }
      return t;
    });
    vinetas(P, items, { tam: 9.5 });
  }

  // ---------- Informe por estudiante ----------
  // modo 'docente': incluye lugar, percentil y análisis técnico. modo 'familia': para el estudiante y su apoderado, sin ranking.
  function paginaEstudiante(P, ctx, x, modo = 'docente', { sinEvolucion = false } = {}) {
    const { ens, cur, A, H, N } = ctx;
    const familia = modo === 'familia', pocos = A.hechas.length < MIN_N;
    const conNivel = N && N.porCurso.length >= 2;
    const T = Estad.tecnico(A, x.e.id, conNivel ? N.A : null);
    const pila = nombrePila(x.e.nombre);
    banda(P, x.e.nombre, `${familia ? 'Ficha de resultados' : 'Ficha técnica'} · ${cur.nombre} · ${ens.nombre}`, [ens.fecha, `N° de lista ${x.e.lista}`].filter(Boolean).join(' · '));
    const t = [
      { etiqueta: 'Respuestas correctas', valor: `${x.correctas} de ${A.n}`, detalle: `${x.omitidas} en blanco` },
      { etiqueta: 'Logro', valor: pct(x.logro), detalle: `promedio del curso: ${pct(A.resumen.media)}` },
      { etiqueta: 'Nota', valor: nt(x.nota), detalle: `exigencia ${pct(Estad.conf.escala.exigencia)}` },
    ];
    if (x.puntaje != null) t.push({ etiqueta: 'Puntaje PAES (est.)', valor: x.puntaje, detalle: `promedio del curso: ${A.resumen.puntajeMedia}` });
    else if (x.estandar) t.push({ etiqueta: 'Estándar (est.)', valor: x.estandar.nombre, detalle: 'según cortes del ensayo' });
    if (!familia && !pocos) t.push({ etiqueta: 'Lugar en el curso', valor: `${T.posicion}° de ${A.hechas.length}`, detalle: `percentil ${T.percentil}` });
    cifras(P, t);

    // Resumen en palabras, con cifras concretas
    const val = validasDe(A);
    const cuentas = (grupos) => grupos.filter((g) => g.nombre !== 'Sin dato').map((g) => {
      const idx = g.indices;
      return { nombre: g.nombre, total: idx.length, bien: idx.filter((i) => x.aciertos[i]).length, curso: g.logro,
        noLogradas: A.preguntas.filter((p) => idx.includes(p.i) && !x.aciertos[p.i]).map((p) => p.n) };
    });
    const porEje = new Map(cuentas(A.porEje).map((c) => [c.nombre, c])), porHab = new Map(cuentas(A.porHabilidad).map((c) => [c.nombre, c]));
    const de = (c) => `${c.bien} de ${c.total}`;
    const d = x.logro - A.resumen.media;
    const frases = [];
    frases.push(`${pila} contestó bien ${x.correctas} de ${A.n} preguntas (${pct(x.logro)}): nota ${nt(x.nota)}${x.puntaje != null ? ` y unos ${x.puntaje} puntos PAES` : x.estandar ? `, nivel ${x.estandar.nombre} según los cortes del ensayo` : ''}.`);
    let comp = Math.abs(d) < 0.02 ? `Está en el promedio del curso (${pct(A.resumen.media)})` : `Son ${pts(d)} ${d > 0 ? 'sobre' : 'bajo'} el promedio del curso (${pct(A.resumen.media)})`;
    if (!familia && !pocos) comp += ` y queda en el lugar ${T.posicion} de ${A.hechas.length}`;
    const serie = H ? (H.estudiantes.find((s) => s.e.id === x.e.id) || { serie: [] }).serie : [];
    const idx = H ? H.puntos.findIndex((p) => p.ensayo.id === ens.id) : -1;
    const previo = idx > 0 ? serie.slice(0, idx).filter((v) => v != null).pop() : null;
    if (previo != null) { const c = x.logro - previo; comp += Math.abs(c) < 0.02 ? '; respecto del ensayo anterior, se mantuvo' : `; respecto del ensayo anterior, ${c > 0 ? 'subió' : 'bajó'} ${pts(c)}`; }
    frases.push(comp + '.');
    const fallas = A.n - x.correctas;
    if (fallas > 0 && porEje.size >= 2) {
      const reparto = [...porEje.values()].map((c) => ({ nombre: c.nombre, n: c.total - c.bien })).filter((c) => c.n).sort((a, b) => b.n - a.n);
      const blanco = x.omitidas ? ` (${x.omitidas} en blanco)` : '';
      if (reparto.length === 1) frases.push(fallas === 1 ? `La única que no logró${blanco} es de ${reparto[0].nombre}.` : `Las ${fallas} que no logró${blanco} son todas de ${reparto[0].nombre}.`);
      else frases.push(`De las ${fallas} que no logró${blanco}, ${lista(reparto.map((c, i) => `${c.n} ${i === 0 ? `${c.n === 1 ? 'es' : 'son'} de ` : 'de '}${c.nombre}`))}.`);
    }
    const ap = Estad.conf.escala.aprobacion, faltanAp = x.nota < ap - 1e-9 ? correctasAprobar(A) - x.correctas : 0;
    const metaTxt = T.meta ? T.meta.texto.replace(/^el /, 'al ').replace(/^(?!al )/, 'a ') : '';
    if (T.meta && T.meta.faltan > 0) frases.push(`Con ${plural(T.meta.faltan, 'respuesta correcta', 'respuestas correctas')} más llegaría ${metaTxt}${faltanAp > 0 && !/^nota/.test(T.meta.texto) ? ` y con ${faltanAp} a la nota ${nt(ap)}` : ''}.`);
    else if (faltanAp > 0) frases.push(`Con ${plural(faltanAp, 'respuesta correcta', 'respuestas correctas')} más llegaría a la nota ${nt(ap)}.`);
    const col = ctx.colegio || {};
    if (x.puntaje != null && col.metaPuntaje) frases.push(x.puntaje >= col.metaPuntaje ? `Ya está sobre la meta del colegio (${col.metaPuntaje} puntos).` : `La meta del colegio es ${col.metaPuntaje} puntos.`);
    else if (col.metaLogro) frases.push(x.logro >= col.metaLogro ? `Ya está sobre la meta del colegio (${pct(col.metaLogro)} de logro).` : `La meta del colegio es ${pct(col.metaLogro)} de logro.`);
    parrafo(P, frases.join(' '), { tam: 10.5 });

    // Lo que hace bien y lo que debe mejorar
    const hab = (g) => { const th = Temarios.habilidad(ens.asignatura, g.nombre); return th ? th.descripcion : null; };
    const bueno = [], mejorar = [];
    T.fortalezas.ejes.slice(0, 3).forEach((g) => { const c = porEje.get(g.nombre); bueno.push(`${g.nombre}: ${de(c)} correctas (${pct(g.propio)})${g.dif >= 0.05 ? `; el curso logró ${pct(g.curso)}` : ''}.`); });
    T.fortalezas.habs.slice(0, 2).forEach((g) => { const c = porHab.get(g.nombre), ds = hab(g); bueno.push(`Habilidad ${minus(g.nombre)}: ${de(c)}${ds ? `. Sabe ${ds}` : ''}.`); });
    if (T.aciertoDificiles.length) bueno.push(`${T.aciertoDificiles.length === 1 ? 'Acertó la pregunta' : 'Acertó las preguntas'} ${numeros(T.aciertoDificiles.slice(0, 6))}, que menos del 40% del curso respondió bien.`);
    if (x.omitidas === 0 && bueno.length < 4) bueno.push('No dejó preguntas en blanco.');
    if (!bueno.length) {
      const m = T.ejes.slice().sort((a, b) => b.propio - a.propio)[0];
      bueno.push(m ? `Su mejor eje fue ${m.nombre}, con ${de(porEje.get(m.nombre))} correctas.` : `Contestó bien ${x.correctas} preguntas.`);
    }
    T.debilidades.ejes.slice(0, 3).forEach((g, i) => {
      const c = porEje.get(g.nombre), parte = fallas ? (c.total - c.bien) / fallas : 0;
      mejorar.push(`${g.nombre}: ${de(c)} correctas (${pct(g.propio)})${g.dif <= -0.05 ? `; el curso logró ${pct(g.curso)}` : ''}.${i === 0 && parte >= 0.4 && porEje.size >= 3 ? ` Aquí está ${parte >= 0.6 ? 'la mayor parte' : 'buena parte'} de sus errores.` : ''}`);
    });
    T.debilidades.habs.slice(0, 2).forEach((g) => { const c = porHab.get(g.nombre), ds = hab(g); mejorar.push(`Habilidad ${minus(g.nombre)}: ${de(c)}${ds ? `. Le cuesta ${ds}` : ''}.`); });
    if (T.falloFaciles.length) mejorar.push(`${T.falloFaciles.length === 1 ? 'Falló la pregunta' : 'Falló las preguntas'} ${numeros(T.falloFaciles.slice(0, 6))}, que el 70% o más del curso contestó bien. ${familia ? (T.falloFaciles.length === 1 ? 'Conviene mirarla de nuevo: puede ser un descuido.' : 'Conviene mirarlas de nuevo: pueden ser descuidos.') : `Vale la pena revisar${T.falloFaciles.length === 1 ? 'la' : 'las'} con ${pila} para distinguir un descuido de un vacío puntual.`}`);
    if (!familia && !pocos && T.conDistractor.length >= 3) mejorar.push(`En ${T.conDistractor.length} de sus errores marcó la misma alternativa equivocada que más eligió el curso (${T.conDistractor.length > 6 ? 'entre ellas, ' : ''}${numeros(T.conDistractor.slice(0, 6))}). Son confusiones compartidas: se corrigen mejor con todo el curso que en forma individual.`);
    // ¿Rinde menos al final de la prueba?
    if (val.length >= 12) {
      const mitad = Math.floor(val.length / 2), corte = Math.floor(val.length * 0.75);
      const l1 = val.slice(0, mitad).filter((p) => x.aciertos[p.i]).length / mitad;
      const l2 = val.slice(mitad).filter((p) => x.aciertos[p.i]).length / (val.length - mitad);
      const blancoFinal = val.slice(corte).filter((p) => !x.r[p.i]).length;
      if (l1 - l2 >= 0.25) mejorar.push(`Rindió bastante mejor en la primera mitad de la prueba (${pct(l1)}) que en la segunda (${pct(l2)})${blancoFinal >= 2 ? `, y ${blancoFinal} de sus respuestas en blanco están en el último cuarto` : ''}. Puede que le haya faltado tiempo o que se haya cansado.`);
      else if (blancoFinal >= 3 && blancoFinal >= x.omitidas * 0.6) mejorar.push(`${blancoFinal} de sus ${x.omitidas} respuestas en blanco están al final de la prueba: parece que no alcanzó a terminar.`);
      else if (x.omitidas / A.n > 0.1) mejorar.push(`Dejó ${x.omitidas} preguntas en blanco. Una respuesta en blanco no suma: conviene responder todas.`);
    } else if (x.omitidas / A.n > 0.1) mejorar.push(`Dejó ${x.omitidas} preguntas en blanco. Una respuesta en blanco no suma: conviene responder todas.`);
    if (!mejorar.length) mejorar.push('No tiene ejes ni habilidades bajo lo esperado. El paso siguiente es practicar con preguntas más difíciles.');
    recuadros(P, [
      { titulo: 'Lo que hace bien', color: C.t3, fondo: '#EEF4FC', items: bueno },
      { titulo: familia ? 'Sus próximos desafíos' : 'Lo que debe mejorar', color: C.critico, fondo: '#FCF0E9', items: mejorar },
    ]);

    // Eje y habilidad lado a lado
    const ejes = T.ejes.slice().sort((a, b) => b.propio - a.propio), habs = T.habs.slice().sort((a, b) => b.propio - a.propio);
    const filasDe = (gs) => gs.map((g) => ({ nombre: g.nombre, valor: g.propio, ref: g.curso, color: g.propio < 0.5 ? C.critico : C.serie }));
    const dos = habs.length >= 2 && habs.length <= 8 && ejes.length <= 8;
    const media = (W - 8) / 2, op = { alto: 5.6, gap: 3.4, etiquetaAncho: 40, tam: 8.5 };
    if (ejes.length) {
      P.cabe(14 + Math.max(ejes.length, dos ? habs.length : 0) * 9 + 8);
      P.y += 2;
      fuente(P.doc, 12, 'bold', C.azul); P.doc.text('Resultado por eje', M, P.y + 3);
      if (dos) P.doc.text('Resultado por habilidad', M + media + 8, P.y + 3);
      P.y += 8;
      const y0 = P.y;
      barras(P, filasDe(ejes), { ...op, ancho: dos ? media : W });
      const y1 = P.y;
      if (dos) { P.y = y0; barras(P, filasDe(habs), { ...op, x: M + media + 8, ancho: media }); }
      P.y = Math.max(y1, P.y);
      fuente(P.doc, 8.5, 'normal', C.texto2);
      P.doc.setDrawColor(C.texto); P.doc.setLineWidth(0.7); P.doc.line(M, P.y - 2.5, M, P.y + 0.5);
      P.doc.text('Raya negra: promedio del curso. Naranjo: bajo 50%.', M + 2, P.y);
      P.y += 5;
    }

    // Qué estudiar: debilidades o, si no hay, el eje con más espacio para crecer
    const areas = [];
    const repasar = (g) => {
      const falladas = A.preguntas.filter((p) => !p.piloto && p.eje === g.nombre && !x.aciertos[p.i]).map((p) => p.n);
      const propios = [...new Set(A.preguntas.filter((p) => !p.piloto && p.eje === g.nombre && !x.aciertos[p.i] && p.contenido).map((p) => p.contenido))];
      const te = Temarios.eje(ens.asignatura, g.nombre);
      const conts = propios.length ? propios : te ? te.contenidos : [];
      return `${conts.length ? `Repasar ${lista(conts.slice(0, 5).map(minus))}` : `Repasar ${g.nombre}`}${falladas.length ? `, partiendo por las preguntas ${lista(falladas.map(String))}` : ''}.`;
    };
    T.debilidades.ejes.slice(0, 3).forEach((g) => areas.push(`${g.nombre}. ${repasar(g)}`));
    if (!T.debilidades.ejes.length && ejes.length) {
      const g = ejes[ejes.length - 1];
      areas.push(`Para seguir subiendo, su eje con más espacio de mejora es ${g.nombre} (${pct(g.propio)}). ${repasar(g)}`);
    }
    T.debilidades.habs.slice(0, 2).forEach((g) => areas.push(`Practicar ejercicios donde haya que ${hab(g) || minus(g.nombre)}.`));
    if (areas.length) { titulo(P, familia ? '¿Qué estudiar ahora?' : 'Áreas a reforzar', 2, 20); vinetas(P, areas, { tam: 10 }); }

    // Detalle de respuestas
    titulo(P, 'Detalle de sus respuestas', 3, 45);
    cuadricula(P, A, x);

    // Análisis técnico (solo para docentes)
    if (!familia) {
      titulo(P, 'Análisis técnico', 3, 40);
      const tec = [];
      if (!pocos) tec.push(`Percentil ${T.percentil}: obtuvo un resultado mayor que el ${T.percentil}% del curso. Está a ${Math.abs(T.z).toFixed(1).replace('.', ',')} desviaciones estándar ${T.z >= 0 ? 'sobre' : 'bajo'} el promedio (${Math.abs(T.z) < 0.5 ? 'dentro del grupo central' : Math.abs(T.z) < 1 ? 'algo alejado del centro' : 'claramente alejado del centro'}).`);
      else tec.push(`Con ${A.hechas.length} hojas corregidas no se calculan percentil ni desviaciones: la comparación con el curso es solo referencial.`);
      if (T.falloFaciles.length || T.aciertoDificiles.length) {
        const f = T.falloFaciles.length, a = T.aciertoDificiles.length;
        tec.push(`Consistencia: falló ${plural(f, 'pregunta fácil', 'preguntas fáciles')} y acertó ${plural(a, 'difícil', 'difíciles')}. ${f > a + 2 ? 'Los errores en preguntas fáciles le restan más de lo que suman sus aciertos difíciles; con más cuidado al responder, el resultado debería subir.' : a > f + 2 ? 'Resuelve preguntas difíciles con frecuencia: sabe más de lo que muestra su resultado global.' : 'Sus aciertos siguen el orden de dificultad de las preguntas.'}`);
      }
      if (!pocos && T.erradas.length && T.conDistractor.length < 3) tec.push(`De sus ${T.erradas.length} respuestas incorrectas, ${T.conDistractor.length} coinciden con el error más común del curso.`);
      if (T.contenidosFallados.length) tec.push(`Contenidos con más errores: ${lista(T.contenidosFallados.slice(0, 4).map((c) => `${c.contenido} (${c.n})`))}.`);
      vinetas(P, tec, { tam: 9.5 });
    }

    if ((ctx.seleccion || []).length > 1) ensayosEstudiante(P, ctx, x, pila);
    else if (!sinEvolucion && H && H.puntos.length >= 2 && serie.filter((v) => v != null).length >= 2) {
      titulo(P, 'Evolución', 3, 40);
      lineas(P, [{ nombre: pila, color: C.serie, valores: serie, grueso: true }, { nombre: 'Curso', color: C.gris, valores: H.puntos.map((p) => p.media), punteada: true }],
        H.puntos.map((p) => (p.ensayo.fecha ? p.ensayo.fecha.slice(0, 5) : p.ensayo.nombre.slice(0, 8))), { alto: 30 });
    }
    if (familia) parrafo(P, `Los puntajes y niveles son estimaciones a partir de un ensayo; ayudan a orientar el estudio, no son un resultado oficial.${col.responsable ? ` Consultas: ${col.responsable}.` : ''}`, { color: C.texto2, tam: 8.5 });
  }

  function paginasEstudiantes(P, ctx, ids, conPortada, modo) {
    const hechas = ctx.A.hechas.filter((x) => !ids || ids.includes(x.e.id)).sort((a, b) => a.e.lista - b.e.lista);
    hechas.forEach((x, i) => { if (i > 0 || conPortada) { P.doc.addPage(); P.y = M; } paginaEstudiante(P, ctx, x, modo); });
  }

  // Informe completo: el curso y después una ficha por estudiante
  function curso(ctx) {
    const P = nuevoDoc(ctx);
    cuerpoCurso(P, ctx);
    paginasEstudiantes(P, ctx, null, true, 'docente');
    piePaginas(P);
    return P.doc.output('blob');
  }

  function estudiantes(ctx, ids) {
    const P = nuevoDoc(ctx);
    paginasEstudiantes(P, ctx, ids, false, 'familia');
    piePaginas(P);
    return P.doc.output('blob');
  }

  /**
   * Informe de un estudiante con los ensayos elegidos.
   * base: contexto con la selección completa (para el resumen). porEnsayo: un contexto por ensayo (para cada ficha).
   */
  function estudiante(base, porEnsayo, id, modo = 'familia') {
    const P = nuevoDoc(base), familia = modo === 'familia';
    const est = base.cur.estudiantes.find((e) => e.id === id);
    const fichas = porEnsayo.map((c) => ({ c, x: c.A.hechas.find((y) => y.e.id === id) })).filter((f) => f.x);
    if (!est || !fichas.length) throw new Error('El estudiante no tiene hojas corregidas en los ensayos elegidos');
    const varios = fichas.length > 1;
    P.pie = [(base.colegio || {}).nombre || 'Lector óptico', est.nombre, base.cur.nombre, varios ? `${fichas.length} ensayos` : fichas[0].c.ens.nombre].join(' · ');
    if (varios) {
      const pila = nombrePila(est.nombre);
      banda(P, est.nombre, `${familia ? 'Informe para el estudiante y su apoderado' : 'Informe del estudiante para docentes'} · ${base.cur.nombre}`,
        [`N° de lista ${est.lista}`, `${fichas.length} ensayos`, `generado el ${new Date().toLocaleDateString('es-CL')}`].join(' · '));
      const logros = fichas.map((f) => ({ f, l: f.x.logro, d: f.x.logro - f.c.A.resumen.media }));
      const mejor = logros.slice().sort((a, b) => b.d - a.d)[0], peor = logros.slice().sort((a, b) => a.d - b.d)[0];
      const sobre = logros.filter((o) => o.d >= 0.02).length, bajo = logros.filter((o) => o.d <= -0.02).length;
      cifras(P, [
        { etiqueta: 'Ensayos', valor: String(fichas.length), detalle: lista([...new Set(fichas.map((f) => Estad.grupoEnsayo(f.c.ens)))]).slice(0, 40) },
        { etiqueta: 'Logro promedio', valor: pct(Estad.media(logros.map((o) => o.l))), detalle: `curso: ${pct(Estad.media(fichas.map((f) => f.c.A.resumen.media)))}` },
        { etiqueta: 'Sobre el curso', valor: `${sobre} de ${fichas.length}`, detalle: bajo ? `bajo el curso en ${bajo}` : 'en ningún ensayo bajo' },
      ]);
      const frases = [`${pila} rindió ${fichas.length} de los ensayos elegidos.`];
      if (mejor.d - peor.d >= 0.05) frases.push(`Su mejor resultado, comparado con el curso, fue en ${mejor.f.c.ens.nombre} (${pct(mejor.l)}, ${pts(mejor.d)} ${mejor.d >= 0 ? 'sobre' : 'bajo'} el promedio) y el más bajo en ${peor.f.c.ens.nombre} (${pct(peor.l)}, ${pts(peor.d)} ${peor.d >= 0 ? 'sobre' : 'bajo'} el promedio).`);
      else frases.push('Sus resultados frente al curso fueron parecidos en todos los ensayos.');
      const faltan = (base.seleccion || []).filter((s) => !fichas.some((f) => f.c.ens.id === s.ens.id));
      if (faltan.length) frases.push(`No rindió ${lista(faltan.map((s) => s.ens.nombre))}.`);
      frases.push('Después de este resumen viene el detalle de cada ensayo.');
      parrafo(P, frases.join(' '));
      ensayosEstudiante(P, base, { e: est }, pila);
    }
    fichas.forEach((f, i) => {
      if (i > 0 || varios) { P.doc.addPage(); P.y = M; }
      paginaEstudiante(P, { ...f.c, seleccion: [] }, f.x, modo, { sinEvolucion: varios });
    });
    piePaginas(P);
    return P.doc.output('blob');
  }

  // =====================================================================
  // Sistema de informes: piezas comunes, directivo, docente ampliado, estudiante y apoderados
  // =====================================================================
  const dec1 = (v) => (v == null ? '–' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ','));
  const dec2 = (v) => (v == null ? '–' : (Math.round(v * 100) / 100).toFixed(2).replace('.', ','));
  const pct1 = (x) => (x == null ? '–' : (Math.round(x * 1000) / 10).toFixed(1).replace('.', ',') + '%');
  const pp = (d) => (d == null ? '–' : `${Math.round(d * 100) > 0 ? '+' : Math.round(d * 100) < 0 ? '-' : ''}${Math.abs(Math.round(d * 100))} pp`);
  const hoy = () => new Date().toLocaleDateString('es-CL');
  const tipoEvaluacion = (ens) => {
    const a = Temarios.norm(ens.asignatura || '');
    if (/m2|matematica 2/.test(a)) return 'PAES M2';
    if (ens.tipo === 'PAES' && /matematica|m1/.test(a)) return 'PAES M1';
    if (ens.asignatura && ens.tipo && Temarios.norm(ens.asignatura).startsWith(Temarios.norm(ens.tipo))) return ens.asignatura;
    return [ens.tipo, ens.asignatura].filter(Boolean).join(' · ') || 'Ensayo';
  };
  const conDatos = (gs) => gs.filter((g) => g.nombre !== 'Sin dato');
  const estadoLogro = (v) => { const n = Estad.conf.niveles; return v >= n.alto ? 'Consolidado' : v >= n.medio ? 'En desarrollo' : 'Crítico'; };

  // Tabla de dos columnas (dato y valor); omite las filas sin valor
  function ficha(P, filas, anchoDato = 64) {
    tabla(P, [{ titulo: 'Dato', ancho: anchoDato, negrita: true, envolver: true }, { titulo: 'Valor', ancho: W - anchoDato, envolver: true, negrita: false }],
      filas.filter((f) => f[1] != null && f[1] !== '').map((f) => ({ celdas: f })));
  }

  function avisoDatos(P, val) {
    if (!val || (!val.errores.length && !val.avisos.length)) return;
    titulo(P, val.errores.length ? 'Problemas en los datos (revisar antes de usar el informe)' : 'Observaciones sobre los datos', 2, 20);
    vinetas(P, [...val.errores, ...val.avisos], { tam: 9.5 });
  }

  // Indicadores estadísticos generales de un análisis
  function tablaIndicadores(P, A) {
    const R = A.resumen, dC = R.dCorrectas, dL = R.dLogro, n = A.n, esperadas = R.corregidas * n;
    const filas = [
      ['Estudiantes evaluados', `${R.corregidas} de ${R.total} en la lista (${pct1(R.participacion)} de participación); ${R.ausentes} sin hoja`],
      ['Preguntas válidas', `${n}${A.pilotos ? ` (además, ${plural(A.pilotos, 'pregunta piloto que no cuenta', 'preguntas piloto que no cuentan')})` : ''}`],
      ['Promedio de respuestas correctas', `${dec1(dC.media)} de ${n}`],
      ['Promedio de los logros individuales', pct1(dL.media)],
      ['Logro agregado', `${pct1(R.logroAgregado)}: ${R.correctasTotal} respuestas correctas de ${esperadas} esperadas`],
      ['Mediana', `${dec1(dC.mediana)} correctas (${pct1(dL.mediana)})`],
      ['Moda', dC.moda.length ? (dC.moda.length > 3 ? 'varios valores empatados' : `${lista(dC.moda.map(String))} correctas`) : 'no hay: ningún valor se repite'],
      ['Desviación estándar (muestral)', `${dec1(dC.desviacion)} correctas (${dec1(dL.desviacion * 100)} pp de logro)`],
      ['Varianza (muestral)', `${dec2(dC.varianza)} (correctas al cuadrado)`],
      ['Mínimo y máximo', `${dC.min} y ${dC.max} correctas (${pct(dL.min)} y ${pct(dL.max)})`],
      ['Cuartiles Q1 y Q3', `${dec1(dC.q1)} y ${dec1(dC.q3)} correctas (${pct(dL.q1)} y ${pct(dL.q3)})`],
      ['Rango intercuartílico', `${dec1(dC.iqr)} correctas (${dec1(dL.iqr * 100)} pp)`],
      ['Respuestas correctas, incorrectas y omitidas', `${R.correctasTotal}, ${R.incorrectasTotal} y ${R.omitidasTotal} (las omitidas son el ${pct1(esperadas ? R.omitidasTotal / esperadas : 0)} del total)`],
    ];
    if (R.dPuntaje && R.dPuntaje.n) filas.push(['Puntaje PAES estimado', `promedio ${Math.round(R.dPuntaje.media)}, mediana ${Math.round(R.dPuntaje.mediana)}, mínimo ${R.dPuntaje.min} y máximo ${R.dPuntaje.max}. Es una estimación con la tabla de conversión del ensayo, no un puntaje oficial`]);
    ficha(P, filas, 70);
  }

  // Estudiantes por nivel de desempeño (cortes de Ajustes) y por estándar SIMCE si el ensayo trae cortes
  function nivelesDesempeno(P, A, filasExtra = []) {
    const R = A.resumen;
    titulo(P, 'Distribución por niveles de desempeño', 4, 45);
    barras(P, A.tramos.map((t, k) => ({ nombre: `${t.nombre} (${t.texto})`, valor: R.corregidas ? t.n / R.corregidas : 0, color: [C.critico, C.serie, C.t3][k] })),
      { formato: (v) => `${pct(v)} (${Math.round(v * R.corregidas)})`, etiquetaAncho: 54 });
    filasExtra.forEach((f) => f());
    parrafo(P, `Niveles por porcentaje de logro, con los cortes definidos en Ajustes (${pct(Estad.conf.niveles.medio)} y ${pct(Estad.conf.niveles.alto)}). No son los niveles oficiales de PAES ni de SIMCE.`, { color: C.texto2, tam: 9 });
  }

  // Barras agrupadas: una fila por categoría y una barra por curso
  function barrasAgrupadas(P, cats, series) {
    const { doc } = P, et = 54, x0 = M + et, largo = W - et - 14, h = 3.4, g = 0.9;
    P.cabe(14 + Math.min(3, cats.length) * (series.length * (h + g) + 4));
    leyenda(P, series.map((s) => ({ nombre: s.nombre, color: s.color })));
    cats.forEach((c) => {
      const alto = series.length * (h + g) + 3.5;
      P.cabe(alto);
      fuente(doc, 8.8, 'bold');
      const et2 = doc.splitTextToSize(c.nombre, et - 4);
      et2.slice(0, 2).forEach((l, j) => doc.text(l, x0 - 3, P.y + 3 + j * 3.6, { align: 'right' }));
      series.forEach((s, k) => {
        const v = c.valores[k], y = P.y + k * (h + g);
        doc.setFillColor(C.pista); doc.rect(x0, y, largo, h, 'F');
        if (v != null) {
          if (v > 0) { doc.setFillColor(s.color); doc.rect(x0, y, Math.max(0.4, Math.min(1, v) * largo), h, 'F'); }
          fuente(doc, 7.5, 'normal', C.texto2); doc.text(pct(v), x0 + largo + 1.5, y + h * 0.82);
        }
      });
      P.y += alto;
    });
    P.y += 2;
  }

  // Comparación entre cursos que rindieron el mismo ensayo
  function compararCursos(P, porCurso, inst, { propio = null, nombreInst = 'Total' } = {}) {
    const R = inst.resumen, colores = porCurso.map((x, k) => C.cat[k % C.cat.length]);
    titulo(P, 'Tabla comparativa de cursos', 2, 50);
    tabla(P, [{ titulo: 'Curso', ancho: 24, negrita: true }, { titulo: 'Evaluados', ancho: 20, der: true }, { titulo: 'Particip.', ancho: 17, der: true },
      { titulo: 'Promedio', ancho: 18, der: true }, { titulo: 'Mediana', ancho: 17, der: true }, { titulo: 'Desv. est.', ancho: 19, der: true },
      { titulo: 'Bajo · Medio · Alto', ancho: 36, der: true }, { titulo: 'Dif. con total', ancho: W - 151, der: true }],
    [...porCurso.map((x) => {
      const r = x.A.resumen, t = x.A.tramos;
      return { resaltar: x.curso.id === propio, celdas: [x.curso.nombre, `${r.corregidas}/${r.total}`, pct(r.participacion), pct1(r.media), pct1(r.mediana), `${dec1(r.desviacion * 100)} pp`, t.map((z) => z.n).join(' · '), pp(r.media - R.media)] };
    }), { celdas: [nombreInst, `${R.corregidas}/${R.total}`, pct(R.participacion), pct1(R.media), pct1(R.mediana), `${dec1(R.desviacion * 100)} pp`, inst.tramos.map((z) => z.n).join(' · '), '–'] }]);
    parrafo(P, `Promedio y mediana son de los logros individuales. "Bajo · Medio · Alto" es la cantidad de estudiantes en cada nivel de desempeño. pp = puntos porcentuales.${propio ? ' La fila destacada es su curso.' : ''}`, { color: C.texto2, tam: 8.5 });
    titulo(P, 'Rendimiento global por curso', 4, porCurso.length * 11 + 14);
    barras(P, porCurso.map((x, k) => ({ nombre: x.curso.nombre, valor: x.A.resumen.media, color: colores[k], ref: R.media, destacado: x.curso.id === propio })),
      { refNombre: `Raya negra: ${nombreInst} (${pct(R.media)})`, etiquetaAncho: 30 });
    const series = porCurso.map((x, k) => ({ nombre: x.curso.nombre, color: colores[k] }));
    const bloque = (nombre, campo, conGrafico = true) => {
      const nombres = conDatos(inst[campo]).sort((a, b) => b.logro - a.logro).map((g) => g.nombre);
      if (!nombres.length) return;
      const filas = nombres.map((n) => {
        const vals = porCurso.map((x) => { const g = x.A[campo].find((y) => y.nombre === n); return g ? g.logro : null; });
        const hay = vals.filter((v) => v != null), tot = inst[campo].find((y) => y.nombre === n);
        return { nombre: n, vals, total: tot ? tot.logro : null, preguntas: tot ? tot.preguntas : 0, brecha: hay.length >= 2 ? Math.max(...hay) - Math.min(...hay) : null };
      });
      titulo(P, `${nombre} por curso`, 5, 40);
      const k = porCurso.length, ancho = Math.min(19, (W - 70 - 20 - 18) / k);
      tabla(P, [{ titulo: nombre.split(' ')[0], ancho: W - ancho * k - 38 - 12, envolver: true, negrita: true }, { titulo: 'Preg.', ancho: 12, der: true },
        ...porCurso.map((x) => ({ titulo: x.curso.nombre, ancho, der: true, negrita: false })), { titulo: 'Total', ancho: 18, der: true, negrita: false }, { titulo: 'Brecha', ancho: 20, der: true, negrita: false }],
      filas.map((f) => ({ resaltar: f.brecha != null && f.brecha >= 2 * Estad.conf.institucional.brechaCurso, celdas: [f.nombre, f.preguntas, ...f.vals.map((v) => (v == null ? '–' : pct(v))), f.total == null ? '–' : pct(f.total), f.brecha == null ? '–' : `${Math.round(f.brecha * 100)} pp`] })));
      if (conGrafico && filas.length <= 12 && k >= 2) barrasAgrupadas(P, filas.map((f) => ({ nombre: f.nombre, valores: f.vals })), series);
    };
    bloque('Ejes temáticos', 'porEje');
    bloque('Habilidades', 'porHabilidad');
    if (inst.porContenido.length) bloque('Contenidos', 'porContenido', inst.porContenido.length <= 10);
    if (inst.porOA.length) bloque('OA', 'porOA', inst.porOA.length <= 10);
    parrafo(P, `Brecha: diferencia entre el curso con mayor y menor logro, en puntos porcentuales. Se destacan las brechas de ${Math.round(2 * Estad.conf.institucional.brechaCurso * 100)} pp o más. Todos los cursos rindieron el mismo ensayo; las diferencias son descriptivas y no se aplicó una prueba estadística.`, { color: C.texto2, tam: 8.5 });
  }

  function alertasInstitucionales(porCurso, inst) {
    const u = Estad.conf.institucional, R = inst.resumen, out = [];
    porCurso.forEach((x) => {
      const r = x.A.resumen, d = r.media - R.media;
      if (porCurso.length >= 2 && d <= -u.brechaCurso) out.push(`${x.curso.nombre} está ${pts(d)} bajo el promedio del conjunto (${pct(r.media)} frente a ${pct(R.media)}).`);
      if (r.participacion < u.participacion) out.push(`Participación baja en ${x.curso.nombre}: ${r.corregidas} de ${r.total} estudiantes (${pct(r.participacion)}).`);
      if (r.corregidas >= MIN_N && r.desviacion >= u.dispersion) out.push(`Resultados muy dispersos en ${x.curso.nombre}: desviación estándar de ${dec1(r.desviacion * 100)} pp de logro.`);
      const bajo = r.corregidas ? x.A.tramos[0].n / r.corregidas : 0;
      if (bajo >= u.concentracionBaja) out.push(`${pct(bajo)} de ${x.curso.nombre} quedó en el nivel Bajo (${x.A.tramos[0].texto} de logro).`);
    });
    conDatos(inst.porEje).filter((g) => g.logro < u.ejeBajo).sort((a, b) => a.logro - b.logro).forEach((g) => out.push(`Eje con bajo logro en el conjunto: ${g.nombre} (${pct(g.logro)}).`));
    if (porCurso.length >= 2) conDatos(inst.porEje).forEach((g) => {
      const v = porCurso.map((x) => { const e = x.A.porEje.find((y) => y.nombre === g.nombre); return e ? { c: x.curso.nombre, v: e.logro } : null; }).filter(Boolean).sort((a, b) => b.v - a.v);
      if (v.length >= 2 && v[0].v - v[v.length - 1].v >= 2 * u.brechaCurso) out.push(`Diferencia relevante en ${g.nombre}: ${Math.round((v[0].v - v[v.length - 1].v) * 100)} pp entre ${v[0].c} (${pct(v[0].v)}) y ${v[v.length - 1].c} (${pct(v[v.length - 1].v)}).`);
    });
    return out;
  }

  function notaMetodologica(P, { consolidado = false, tieneTabla = false, tieneCortes = false } = {}) {
    titulo(P, 'Nota metodológica', 6, 40);
    const n = Estad.conf.niveles;
    const items = [
      'Logro: respuestas correctas divididas por las preguntas válidas. Las preguntas piloto no cuentan. Las respuestas en blanco cuentan como no logradas, pero se informan aparte de las incorrectas.',
      'Promedio de los logros individuales: el promedio de los porcentajes de cada estudiante. Logro agregado: todas las respuestas correctas del grupo divididas por todas las respuestas esperadas. Con un mismo ensayo ambos coinciden; se informan por separado para no confundirlos.',
      'Desviación estándar y varianza son muestrales (dividen por n - 1). Los cuartiles se calculan por interpolación lineal, igual que CUARTIL.INC de Excel. La moda se informa solo si algún valor se repite.',
      `Niveles de desempeño: Bajo bajo ${pct(n.medio)}, Medio desde ${pct(n.medio)} y Alto desde ${pct(n.alto)} de logro. Son cortes configurables en Ajustes y no corresponden a los niveles oficiales de PAES ni de SIMCE.`,
      tieneTabla ? 'Puntaje PAES estimado: se obtiene con la tabla de conversión (correctas → puntaje) cargada en el ensayo. No es el puntaje oficial del DEMRE.' : 'Este informe no estima puntajes PAES: el ensayo no tiene tabla de conversión cargada y la app no convierte porcentajes en puntajes por reglas arbitrarias.',
      tieneCortes ? 'Estándares SIMCE estimados: se asignan con los cortes de logro que trae el ensayo. No es el puntaje SIMCE ni el estándar oficial de la Agencia de Calidad.' : null,
      'Comparaciones entre cursos: solo entre cursos que rindieron el mismo ensayo. Las diferencias se expresan en puntos porcentuales (pp) y son descriptivas: no se aplicaron pruebas estadísticas. Con menos de 8 estudiantes los resultados son referenciales.',
      'Distractores: la explicación de un error aparece como hipótesis, salvo que el ensayo traiga el error asociado a cada alternativa.',
      consolidado ? 'Resultados acumulados: el logro global es la suma de respuestas correctas dividida por la suma de preguntas válidas de los ensayos elegidos (no es el promedio de los porcentajes). Cada ensayo se cuenta una vez. Los instrumentos distintos (por ejemplo, PAES M1 y M2) se informan por separado. Una diferencia entre ensayos puede deberse en parte a su distinta dificultad.' : null,
    ].filter(Boolean);
    vinetas(P, items, { tam: 8.8 });
  }

  // ---------- 1. Resumen para equipo directivo ----------
  // ctxD: { ens, nivel, porCurso: [{ curso, A }], inst: análisis conjunto, colegio, validacion }
  function seccionDirectivo(P, ctxD) {
    const { ens, porCurso, inst } = ctxD, R = inst.resumen;
    banda(P, 'Resumen para equipo directivo', `${ens.nombre} · ${ctxD.nivel || 'Cursos seleccionados'}`, [tipoEvaluacion(ens), ens.fecha, `generado el ${hoy()}`].filter(Boolean).join(' · '));
    titulo(P, 'Información general', 0, 50);
    ficha(P, [
      ['Establecimiento', (ctxD.colegio || {}).nombre || 'Sin nombre (se define en Ajustes)'],
      ['Asignatura', ens.asignatura || '–'],
      ['Nivel', ctxD.nivel || '–'],
      ['Tipo de evaluación', tipoEvaluacion(ens)],
      ['Fecha de aplicación', ens.fecha || 'sin fecha registrada'],
      ['Cursos participantes', `${porCurso.length}: ${lista(porCurso.map((x) => x.curso.nombre))}`],
      ['Estudiantes en las listas', String(R.total)],
      ['Estudiantes evaluados', String(R.corregidas)],
      ['Estudiantes ausentes (sin hoja)', String(R.ausentes)],
      ['Participación', pct1(R.participacion)],
    ]);
    avisoDatos(P, ctxD.validacion);
    if (ctxD.validacion && !ctxD.validacion.ok) {
      parrafo(P, 'Hay problemas en los datos que afectan los cálculos. Corrígelos y vuelve a generar el informe: no se muestran estadísticas para no entregar cifras engañosas.', { estilo: 'bold', color: C.critico });
      return;
    }
    seccion(P, 1, 'Indicadores generales', 90);
    tablaIndicadores(P, inst);
    nivelesDesempeno(P, inst, inst.estandares ? [() => {
      titulo(P, 'Estándares de aprendizaje SIMCE (estimados)', 3, 40);
      apiladas(P, [...porCurso.map((x) => ({ nombre: x.curso.nombre, partes: x.A.estandares.map((s) => s.n) })), { nombre: 'Total', partes: inst.estandares.map((s) => s.n), destacado: true }], Estad.ESTANDARES.map((s) => s.nombre));
    }] : []);
    if (porCurso.length >= 2) { seccion(P, 2, 'Comparación entre cursos', 70); compararCursos(P, porCurso, inst, { nombreInst: 'Total' }); }
    // Ejes: dominio de contenidos
    seccion(P, porCurso.length >= 2 ? 3 : 2, 'Ejes temáticos y habilidades', 60);
    const ejes = conDatos(inst.porEje).sort((a, b) => b.logro - a.logro), habs = conDatos(inst.porHabilidad).sort((a, b) => b.logro - a.logro);
    if (ejes.length) { titulo(P, 'Logro por eje temático', 0, ejes.length * 11 + 10); barras(P, ejes.map((g) => ({ nombre: g.nombre, valor: g.logro, color: g.logro < Estad.conf.institucional.ejeBajo ? C.critico : C.serie }))); }
    if (inst.porContenido.length >= 2) {
      const c = inst.porContenido.slice().sort((a, b) => b.logro - a.logro), k = Math.min(5, Math.floor(c.length / 2));
      titulo(P, 'Contenidos con mayor y menor dominio', 4, 40);
      tabla(P, [{ titulo: 'Mayor dominio', ancho: W / 2 - 14, envolver: true, negrita: false }, { titulo: '%', ancho: 14, der: true }, { titulo: 'Menor dominio', ancho: W / 2 - 14, envolver: true, negrita: false }, { titulo: '%', ancho: 14, der: true }],
        Array.from({ length: k }, (_, i) => ({ celdas: [c[i].nombre, pct(c[i].logro), c[c.length - 1 - i].nombre, pct(c[c.length - 1 - i].logro)] })));
    } else parrafo(P, 'El ensayo no trae el contenido específico de cada pregunta, así que el análisis llega hasta el eje temático. Para ver contenidos, complétalos en la columna E de la plantilla.', { color: C.texto2, tam: 9 });
    if (habs.length) { titulo(P, 'Logro por habilidad', 5, habs.length * 11 + 10); barras(P, habs.map((g) => ({ nombre: g.nombre, valor: g.logro, color: g.logro < 0.5 ? C.critico : C.serie }))); }
    // Alertas
    const al = alertasInstitucionales(porCurso, inst), u = Estad.conf.institucional;
    seccion(P, porCurso.length >= 2 ? 4 : 3, 'Alertas institucionales', 40);
    vinetas(P, al.length ? al : ['No se activó ninguna alerta con los criterios actuales.'], { tam: 10 });
    parrafo(P, `Criterios (se cambian en Ajustes): curso ${Math.round(u.brechaCurso * 100)} pp o más bajo el promedio; eje bajo ${pct(u.ejeBajo)}; diferencia entre cursos en un eje de ${Math.round(2 * u.brechaCurso * 100)} pp o más; participación bajo ${pct(u.participacion)}; desviación estándar de ${Math.round(u.dispersion * 100)} pp o más; ${pct(u.concentracionBaja)} o más del curso en el nivel Bajo.`, { color: C.texto2, tam: 8.5 });
    // Conclusiones
    seccion(P, porCurso.length >= 2 ? 5 : 4, 'Conclusiones y recomendaciones', 60);
    const fuertes = [...ejes.filter((g) => g.logro >= 0.7).map((g) => `${g.nombre} (${pct(g.logro)})`), ...habs.filter((g) => g.logro >= 0.7).map((g) => `la habilidad ${minus(g.nombre)} (${pct(g.logro)})`)];
    const debiles = [...ejes.filter((g) => g.logro < 0.5).map((g) => `${g.nombre} (${pct(g.logro)})`), ...habs.filter((g) => g.logro < 0.5).map((g) => `la habilidad ${minus(g.nombre)} (${pct(g.logro)})`)];
    const conc = [];
    conc.push(`Resultado global: ${pct1(R.media)} de logro promedio con ${R.corregidas} estudiantes evaluados (${pct(R.participacion)} de participación).`);
    conc.push(fuertes.length ? `Fortalezas: ${lista(fuertes)}.` : ejes.length ? `Ningún eje llega a 70%; el mejor resuelto es ${ejes[0].nombre} (${pct(ejes[0].logro)}).` : 'Sin ejes clasificados.');
    conc.push(debiles.length ? `Dificultades: ${lista(debiles)}.` : ejes.length ? `Ningún eje queda bajo 50%; el más bajo es ${ejes[ejes.length - 1].nombre} (${pct(ejes[ejes.length - 1].logro)}).` : '');
    if (porCurso.length >= 2) {
      const o = porCurso.slice().sort((a, b) => b.A.resumen.media - a.A.resumen.media), d = o[0].A.resumen.media - o[o.length - 1].A.resumen.media;
      conc.push(d >= u.brechaCurso ? `Brecha entre cursos: ${Math.round(d * 100)} pp entre ${o[0].curso.nombre} (${pct(o[0].A.resumen.media)}) y ${o[o.length - 1].curso.nombre} (${pct(o[o.length - 1].A.resumen.media)}).` : `Los cursos tienen resultados parecidos: ${Math.round(d * 100)} pp entre el mejor y el más bajo.`);
    }
    vinetas(P, conc.filter(Boolean), { tam: 10 });
    titulo(P, 'Prioridades de intervención y recomendaciones para UTP', 4, 40);
    const rec = [];
    const e0 = ejes[ejes.length - 1], h0 = habs[habs.length - 1];
    if (e0 && e0.logro < 0.6) { const te = Temarios.eje(ens.asignatura, e0.nombre); rec.push(`Prioridad 1: ${e0.nombre}. Coordinar entre los docentes del nivel una unidad de refuerzo${te ? ` centrada en ${lista(te.contenidos.slice(0, 3).map(minus))}` : ''} y medir su avance en el próximo ensayo.`); }
    if (h0 && h0.logro < 0.6) rec.push(`Prioridad ${rec.length + 1}: la habilidad ${minus(h0.nombre)}. Incluirla de forma explícita en las planificaciones de todas las unidades, no solo en la del eje más bajo.`);
    if (porCurso.length >= 2) {
      const bajos = porCurso.filter((x) => x.A.resumen.media - R.media <= -u.brechaCurso);
      if (bajos.length) rec.push(`Acompañar a ${lista(bajos.map((x) => x.curso.nombre))}: revisar con sus docentes la cobertura curricular y las condiciones de aplicación antes de concluir.`);
      const br = ctxD.brechas || [];
      if (br.length) rec.push(`Revisar en reunión de departamento las preguntas con 25 pp o más de diferencia entre cursos (${lista(br.slice(0, 6).map((p) => String(p.n)))}): suelen indicar contenidos que no se trabajaron igual.`);
    }
    if (porCurso.some((x) => x.A.resumen.participacion < u.participacion)) rec.push('Asegurar la participación en el próximo ensayo: con muchas ausencias los resultados pueden no representar al curso.');
    rec.push('Repetir la medición con un ensayo equivalente en 6 a 8 semanas para verificar si las acciones tuvieron efecto, comparando los mismos ejes.');
    vinetas(P, rec, { tam: 10 });
    notaMetodologica(P, { tieneTabla: Estad.tieneTabla(ens), tieneCortes: !!inst.estandares });
  }

  // ---------- Docente: secciones adicionales ----------
  function contenidosHabilidades(P, A) {
    const n = Estad.conf.niveles;
    const estado = (rows) => tabla(P, [{ titulo: 'Nombre', ancho: W - 74, envolver: true, negrita: true }, { titulo: 'Preguntas', ancho: 20, der: true }, { titulo: 'Logro', ancho: 18, der: true }, { titulo: 'Estado', ancho: 36, negrita: false }],
      rows.map((g) => ({ resaltar: g.logro < n.medio, celdas: [g.nombre, g.preguntas, pct(g.logro), estadoLogro(g.logro)] })));
    if (A.porContenido.length) { titulo(P, 'Logro por contenido', 0, 40); estado(A.porContenido.slice().sort((a, b) => a.logro - b.logro)); }
    else parrafo(P, 'El ensayo no trae contenidos específicos por pregunta (columna E de la plantilla): el análisis llega hasta el eje.', { color: C.texto2, tam: 9 });
    if (A.porOA.length) { titulo(P, 'Logro por objetivo de aprendizaje (OA)', 5, 40); estado(A.porOA.slice().sort((a, b) => a.logro - b.logro)); }
    else parrafo(P, 'No se informa por OA porque el ensayo no tiene OA asignados a sus preguntas (columna G de la plantilla). La app no asigna OA por su cuenta.', { color: C.texto2, tam: 9 });
    parrafo(P, `Estado: Consolidado desde ${pct(n.alto)}, En desarrollo desde ${pct(n.medio)}, Crítico bajo ${pct(n.medio)} de logro.`, { color: C.texto2, tam: 8.5 });
    const habs = conDatos(A.porHabilidad);
    if (habs.length) {
      titulo(P, 'Habilidades: detalle', 5, 40);
      const k = A.hechas.length;
      tabla(P, [{ titulo: 'Habilidad', ancho: W - 108, envolver: true, negrita: true }, { titulo: 'Preguntas', ancho: 20, der: true }, { titulo: 'Correctas', ancho: 26, der: true }, { titulo: 'Logro', ancho: 16, der: true }, { titulo: 'Bajo · Medio · Alto', ancho: 46, der: true }],
        habs.sort((a, b) => b.logro - a.logro).map((g) => {
          const propios = A.hechas.map((x) => g.indices.filter((i) => x.aciertos[i]).length / g.indices.length);
          const dist = [propios.filter((v) => v < n.medio).length, propios.filter((v) => v >= n.medio && v < n.alto).length, propios.filter((v) => v >= n.alto).length];
          const corr = A.hechas.reduce((s, x) => s + g.indices.filter((i) => x.aciertos[i]).length, 0);
          return { celdas: [g.nombre, g.preguntas, `${corr} de ${g.preguntas * k}`, pct(g.logro), dist.join(' · ')] };
        }));
      parrafo(P, 'Correctas: respuestas correctas del curso en esas preguntas, sobre el total posible. Bajo · Medio · Alto: estudiantes según su logro en esa habilidad.', { color: C.texto2, tam: 8.5 });
    }
  }

  function preguntaPorPregunta(P, A) {
    const L = A.letras;
    titulo(P, 'Tabla pregunta por pregunta', 0, 40);
    const fijo = 9 + 8 + 13 + 13 + 13 + 11 + L.length * 9.5;
    const libre = W - fijo, conOA = A.preguntas.some((p) => p.oa);
    tabla(P, [{ titulo: 'N°', ancho: 9, negrita: true }, { titulo: 'Eje · contenido' + (conOA ? ' · OA' : ''), ancho: libre * 0.62, envolver: true, negrita: false }, { titulo: 'Habilidad', ancho: libre * 0.38, envolver: true, negrita: false },
      { titulo: 'Clave', ancho: 8, negrita: true }, { titulo: '%Corr', ancho: 13, der: true }, { titulo: '%Inc', ancho: 13, der: true }, { titulo: '%Omi', ancho: 13, der: true }, { titulo: 'Más', ancho: 11 },
      ...L.map((l) => ({ titulo: l, ancho: 9.5, der: true, negrita: false }))],
    A.preguntas.map((p) => {
      const t = p.total || 1;
      return { resaltar: !p.piloto && p.acierto < Estad.CRITICA, celdas: [p.n + (p.piloto ? '*' : ''), [p.eje, p.contenido, p.oa].filter(Boolean).join(' · ') || '–', p.habilidad || '–', p.clave,
        pct(p.correctas / t), pct(p.incorrectas / t), pct(p.omisiones / t), p.cuenta[p.masElegida] ? p.masElegida : '–', ...L.map((l) => pct((p.cuenta[l] || 0) / t))] };
    }), { tam: 7.6 });
    parrafo(P, `%Corr (índice de dificultad: proporción de respuestas correctas), %Inc y %Omi suman 100%. "Más" es la alternativa más elegida. Las columnas ${L.join(', ')} muestran el porcentaje de estudiantes que marcó cada alternativa. Destacadas: bajo ${pct(Estad.CRITICA)} de acierto.${A.pilotos ? ' * pregunta piloto.' : ''}`, { color: C.texto2, tam: 8.5 });
  }

  // Detalle de las preguntas con más dificultad o con un distractor fuerte
  function detallePreguntas(P, A) {
    const elegidas = A.preguntas.filter((p) => !p.piloto && (p.acierto < 0.5 || (p.distractor && p.distractor.n / (p.total || 1) >= 0.3) || p.enunciado || p.errores))
      .sort((a, b) => a.acierto - b.acierto).slice(0, 6);
    if (!elegidas.length) return;
    titulo(P, 'Detalle de las preguntas que más costaron', 6, 50);
    elegidas.forEach((p) => {
      P.cabe(34);
      const { doc } = P;
      fuente(doc, 10.5, 'bold', C.azul); doc.text(`Pregunta ${p.n}`, M, P.y + 4);
      fuente(doc, 9, 'normal', C.texto2); doc.text([p.eje, p.contenido, p.oa, p.habilidad].filter(Boolean).join(' · ').slice(0, 110), M + 24, P.y + 4);
      P.y += 7;
      if (p.enunciado) parrafo(P, `Enunciado: ${p.enunciado}`, { tam: 9.5 });
      const dist = A.letras.map((l) => `${l}${l === p.clave ? ' (correcta)' : ''}: ${p.cuenta[l] || 0}`).join('  ·  ') + `  ·  En blanco: ${p.omisiones}`;
      parrafo(P, `Respuestas de ${p.total} estudiantes: ${dist}.`, { tam: 9.5 });
      const malas = A.letras.filter((l) => l !== p.clave && (p.cuenta[l] || 0) > 0).sort((a, b) => p.cuenta[b] - p.cuenta[a]);
      const lineasE = malas.slice(0, 2).map((l) => {
        const n = p.cuenta[l], err = p.errores && p.errores[l];
        if (err) return `Alternativa ${l} (${n} estudiante${n === 1 ? '' : 's'}): error asociado según el ensayo: ${minus(err)}.`;
        if (n / (p.total || 1) >= 0.3) return `Alternativa ${l} (${n} de ${p.total}): hipótesis de un error compartido, por ejemplo un paso omitido o una propiedad mal aplicada. Para confirmarlo, pedir a quienes la marcaron que muestren su desarrollo.`;
        return null;
      }).filter(Boolean);
      if (p.omisiones / (p.total || 1) >= 0.2) lineasE.push(`El ${pct(p.omisiones / p.total)} la dejó en blanco: posible falta de tiempo o de una estrategia de entrada.`);
      if (!lineasE.length && p.acierto < 0.5) lineasE.push('Las respuestas incorrectas están repartidas entre varias alternativas: más que un error común, apunta a un contenido poco trabajado.');
      vinetas(P, lineasE, { tam: 9.3 });
      P.y += 1;
    });
  }

  // Tabla privada: fortalezas y contenidos por fortalecer de cada estudiante
  function tablaIndividual(P, ctx) {
    const { A, H, ens } = ctx;
    const idx = H ? H.puntos.findIndex((p) => p.ensayo.id === ens.id) : -1;
    titulo(P, 'Fortalezas y contenidos por fortalecer de cada estudiante', 6, 40);
    tabla(P, [{ titulo: 'N°', ancho: 9 }, { titulo: 'Estudiante', ancho: 44, envolver: true }, { titulo: 'C · I · O', ancho: 22, der: true, negrita: false }, { titulo: 'Logro', ancho: 14, der: true, negrita: false },
      { titulo: 'Fortaleza', ancho: 34, envolver: true, negrita: false }, { titulo: 'Por fortalecer', ancho: 34, envolver: true, negrita: false }, { titulo: 'Evol.', ancho: W - 157, der: true, negrita: false }],
    A.hechas.slice().sort((a, b) => a.e.lista - b.e.lista).map((x) => {
      const pf = Estad.perfil(A, x.e.id, null), ejes = conDatos(pf.porEje).sort((a, b) => b.propio - a.propio);
      const f = ejes[0], d = ejes[ejes.length - 1];
      const serie = idx > 0 ? (H.estudiantes.find((s) => s.e.id === x.e.id) || { serie: [] }).serie : [];
      const prev = idx > 0 ? serie.slice(0, idx).filter((v) => v != null).pop() : null;
      return { celdas: [x.e.lista, x.e.nombre, `${x.correctas} · ${x.incorrectas} · ${x.omitidas}`, pct(x.logro), f && f.propio >= 0.5 ? `${f.nombre} (${pct(f.propio)})` : '–', d && d.propio < 0.75 && d !== f ? `${d.nombre} (${pct(d.propio)})` : '–', prev == null ? '–' : pp(x.logro - prev)] };
    }), { tam: 8 });
    parrafo(P, 'C · I · O: correctas, incorrectas y omitidas. Evol.: cambio de logro respecto del ensayo anterior de la misma asignatura. Uso exclusivo del docente.', { color: C.texto2, tam: 8.5 });
  }

  // Plan de intervención y recomendaciones pedagógicas
  function planIntervencion(P, ctx) {
    const { A, ens } = ctx, n = Estad.conf.niveles, filas = [];
    const ejes = conDatos(A.porEje).sort((a, b) => a.logro - b.logro), habs = conDatos(A.porHabilidad).sort((a, b) => a.logro - b.logro);
    const objetivo = (v) => `Subir de ${pct(v)} a ${pct(Math.min(0.95, Math.max(n.medio, v + 0.15)))}`;
    const conts = A.porContenido.length ? A.porContenido.slice().sort((a, b) => a.logro - b.logro).filter((c) => c.logro < n.medio).slice(0, 3) : [];
    conts.forEach((c) => filas.push(['Alta', c.nombre, objetivo(c.logro), 'Clase de reenseñanza con ejemplos resueltos y práctica guiada en parejas', 'Ticket de salida de 3 preguntas', 'Logro en el ticket y en el próximo ensayo']));
    ejes.filter((e) => e.logro < n.alto).slice(0, conts.length ? 1 : 2).forEach((e, i) => {
      const te = Temarios.eje(ens.asignatura, e.nombre);
      filas.push([e.logro < n.medio ? 'Alta' : 'Media', `${e.nombre}${te ? ': ' + lista(te.contenidos.slice(0, 2).map(minus)) : ''}`, objetivo(e.logro), i === 0 ? 'Guía de ejercitación graduada (de menor a mayor dificultad) y revisión colectiva de errores' : 'Estaciones de práctica por nivel de dominio', 'Mini control quincenal del eje', `Logro del eje sobre ${pct(Math.max(n.medio, e.logro + 0.15))}`]);
    });
    if (habs.length && habs[0].logro < n.alto) { const th = Temarios.habilidad(ens.asignatura, habs[0].nombre); filas.push([habs[0].logro < n.medio ? 'Alta' : 'Media', `Habilidad ${minus(habs[0].nombre)}`, objetivo(habs[0].logro), th ? `Problemas donde haya que ${th.descripcion}, con modelado del docente` : 'Problemas que exijan esa habilidad, con modelado del docente', 'Rúbrica breve en una tarea semanal', 'Logro en preguntas de esa habilidad']); }
    const comp = erroresCompartidos(A);
    if (comp.length) filas.push(['Media', `Errores frecuentes (preguntas ${numeros(comp)})`, 'Que el curso identifique y corrija el error', 'Análisis de errores: mostrar la alternativa más elegida y discutir por qué no sirve', 'Pregunta similar en la clase siguiente', 'Menos del 15% elige el mismo error']);
    titulo(P, 'Plan de intervención', 6, 50);
    if (filas.length) tabla(P, [{ titulo: 'Prioridad', ancho: 17, negrita: true }, { titulo: 'Contenido', ancho: 34, envolver: true, negrita: false }, { titulo: 'Objetivo', ancho: 24, envolver: true, negrita: false }, { titulo: 'Actividad sugerida', ancho: 42, envolver: true, negrita: false }, { titulo: 'Seguimiento', ancho: 28, envolver: true, negrita: false }, { titulo: 'Indicador de avance', ancho: W - 145, envolver: true, negrita: false }],
      filas.map((f) => ({ celdas: f })), { tam: 8 });
    else parrafo(P, 'No hay ejes, contenidos ni habilidades bajo el nivel Alto: el plan puede centrarse en profundizar con problemas de mayor dificultad.', { color: C.texto2 });
    titulo(P, 'Retroalimentación y evaluación formativa', 4, 30);
    vinetas(P, [
      'Devolver el ensayo con la tabla de preguntas: que cada estudiante clasifique sus errores en descuido, concepto o procedimiento antes de corregirlos.',
      comp.length ? `Usar las preguntas ${numeros(comp)} como preguntas bisagra: una pregunta al inicio de la clase para ver quién mantiene el error.` : 'Usar preguntas bisagra al inicio de la clase para comprobar si el contenido reforzado quedó claro.',
      'Cerrar cada clase de refuerzo con un ticket de salida de 2 o 3 preguntas y retomar al día siguiente lo que salió bajo.',
      'Volver a medir los mismos ejes en el próximo ensayo y comparar con este informe.',
    ], { tam: 9.5 });
  }

  // ---------- 3 y 4. Estudiante y apoderados (acumulativo) ----------
  // ctxS: { cur, est, sel: [{ ens, A }], ejes: [..] | null, periodo: { desde, hasta }, colegio }
  function periodoTexto(sel) {
    const f = sel.map((s) => s.ens.fecha).filter(Boolean);
    if (!f.length) return 'sin fechas registradas';
    const o = sel.slice().sort((a, b) => Estad.fechaOrden(a.ens).localeCompare(Estad.fechaOrden(b.ens))).map((s) => s.ens.fecha).filter(Boolean);
    return o.length === 1 || o[0] === o[o.length - 1] ? o[0] : `${o[0]} al ${o[o.length - 1]}`;
  }
  function planMejora(g, ens) {
    const ejes = conDatos(g.porEje), habs = conDatos(g.porHabilidad);
    const fortalezas = [...ejes, ...habs.map((h) => ({ ...h, hab: true }))].filter((o) => o.logro >= 0.6).sort((a, b) => b.logro - a.logro).slice(0, 3);
    const prioridades = [...ejes].filter((o) => o.logro < 0.75).sort((a, b) => a.logro - b.logro).slice(0, 3);
    const habsD = habs.filter((o) => o.logro < 0.75).sort((a, b) => a.logro - b.logro).slice(0, 2);
    const contenidos = [];
    prioridades.forEach((p) => {
      const propios = [...new Set(g.ensayos.flatMap((e) => e.preguntas.filter((q) => q.eje === p.nombre && !e.x.aciertos[q.i] && q.contenido).map((q) => q.contenido)))];
      const te = Temarios.eje(ens.asignatura, p.nombre);
      (propios.length ? propios : te ? te.contenidos : []).slice(0, 3).forEach((c) => { if (!contenidos.includes(c)) contenidos.push(c); });
    });
    return { fortalezas, prioridades, habsD, contenidos: contenidos.slice(0, 6) };
  }

  function seccionEstudiante(P, ctxS) {
    const { cur, est, sel } = ctxS, pila = nombrePila(est.nombre);
    const C2 = Estad.consolidar(est.id, sel, ctxS.ejes);
    banda(P, est.nombre, `Informe personal de resultados · ${cur.nombre}`, [`Período: ${periodoTexto(sel)}`, `${plural(sel.length, 'ensayo', 'ensayos')}`, `generado el ${hoy()}`].join(' · '));
    titulo(P, 'Ficha personal', 0, 40);
    ficha(P, [['Nombre', est.nombre], ['Curso', cur.nombre], ['Período evaluado', periodoTexto(sel)],
      ['Ensayos considerados', sel.map((s) => `${s.ens.nombre}${s.ens.fecha ? ` (${s.ens.fecha})` : ''}`).join('; ')],
      ['Temáticas', ctxS.ejes ? lista(ctxS.ejes) : 'Todas las de los ensayos']]);
    if (!C2.length) { parrafo(P, 'No hay respuestas para las temáticas y ensayos elegidos.', { color: C.critico }); return; }
    if (C2.length > 1) parrafo(P, `Los ensayos son de ${C2.length} instrumentos distintos (${lista(C2.map((g) => g.nombre))}). Cada uno se informa por separado, con su propia escala.`, { color: C.texto2, tam: 9.5 });
    C2.forEach((g) => {
      const ens = g.ensayos[g.ensayos.length - 1].ens;
      seccion(P, C2.indexOf(g) + 1, g.nombre, 70);
      cifras(P, [
        { etiqueta: 'Resultado global', valor: pct(g.logro), detalle: `${g.correctas} de ${g.preguntas} correctas` },
        { etiqueta: 'Ensayos', valor: String(g.cantidad), detalle: `${g.preguntas} preguntas en total` },
        { etiqueta: 'Incorrectas', valor: String(g.incorrectas), detalle: 'respuestas marcadas' },
        { etiqueta: 'En blanco', valor: String(g.omisiones), detalle: 'sin responder' },
      ]);
      if (g.cantidad > 1) parrafo(P, `El resultado global suma las respuestas correctas de los ${g.cantidad} ensayos y las divide por el total de preguntas (${g.correctas} ÷ ${g.preguntas}). No es el promedio de los porcentajes, porque los ensayos no tienen la misma cantidad de preguntas.`, { color: C.texto2, tam: 9 });
      tabla(P, [{ titulo: 'Ensayo', ancho: W - 108, envolver: true, negrita: true }, { titulo: 'Fecha', ancho: 22, negrita: false }, { titulo: 'Preguntas', ancho: 20, der: true }, { titulo: 'Correctas', ancho: 20, der: true }, { titulo: 'Blanco', ancho: 16, der: true }, { titulo: 'Logro', ancho: 30, der: true }],
        g.ensayos.map((e) => ({ celdas: [e.ens.nombre, e.ens.fecha || '', e.preguntas.length, e.correctas, e.omisiones, `${pct(e.logro)}${!ctxS.ejes && e.x.puntaje != null ? ` · ${e.x.puntaje} pts.` : ''}`] })));
      if (g.cantidad >= 2) {
        titulo(P, 'Evolución', 3, 60);
        const ejesS = conDatos(g.porEje).filter((o) => o.serie.filter((v) => v != null).length >= 2).slice(0, 4);
        lineas(P, [{ nombre: 'Global', color: C.azul, grueso: true, unir: true, valores: g.ensayos.map((e) => e.logro) },
          ...ejesS.map((o, k) => ({ nombre: o.nombre.split(' ')[0], color: C.cat[(k + 1) % C.cat.length], unir: true, valores: o.serie }))], g.ensayos.map((e) => etiquetaEns(e.ens)), { alto: 40 });
        const d = g.cambio, rel = g.cambioRelativo;
        const t = Math.abs(d) < 0.03 ? `Entre el primer y el último ensayo, el resultado se mantuvo estable (${pct(g.ensayos[0].logro)} y ${pct(g.ensayos[g.cantidad - 1].logro)}).`
          : `Entre el primer y el último ensayo ${d > 0 ? 'subiste' : 'bajaste'} ${pts(d)} (de ${pct(g.ensayos[0].logro)} a ${pct(g.ensayos[g.cantidad - 1].logro)}).`;
        const rels = rel == null ? '' : Math.sign(rel) !== Math.sign(d) && Math.abs(rel) >= 0.03 ? ' Ojo: los ensayos no tienen la misma dificultad y, tomando eso en cuenta, el cambio va en la dirección contraria. Conviene confirmarlo con el próximo ensayo.' : Math.abs(d) >= 0.03 && Math.abs(rel) < 0.03 ? ' Parte de este cambio puede deberse a que los ensayos tenían distinta dificultad.' : '';
        parrafo(P, t + rels, { tam: 10 });
      }
      const ejes = conDatos(g.porEje), habs = conDatos(g.porHabilidad);
      if (ejes.length) { titulo(P, 'Resultado por temática', 4, ejes.length * 10 + 10); barras(P, ejes.map((o) => ({ nombre: o.nombre, valor: o.logro, color: o.logro < 0.5 ? C.critico : C.serie })), { formato: (v) => `${pct(v)}` }); }
      if (habs.length) { titulo(P, 'Resultado por habilidad', 3, habs.length * 10 + 10); barras(P, habs.map((o) => ({ nombre: o.nombre, valor: o.logro, color: o.logro < 0.5 ? C.critico : C.serie }))); }
      const rec = [];
      if (g.fortalezas.length) rec.push(`Fortalezas que se repiten: en ${lista(g.fortalezas.map((o) => o.nombre))} estuviste sobre 70% en todos los ensayos.`);
      if (g.persistentes.length) rec.push(`Dificultades que se mantienen: ${lista(g.persistentes.map((o) => o.nombre))} quedó bajo 50% en todos los ensayos. Es lo primero que conviene estudiar.`);
      if (rec.length) vinetas(P, rec, { tam: 10 });
      // Preguntas para revisar
      const revisar = g.ensayos.map((e) => ({ e, ns: e.preguntas.filter((q) => !e.x.aciertos[q.i]).map((q) => q.n) })).filter((o) => o.ns.length);
      if (revisar.length) {
        titulo(P, 'Preguntas que conviene revisar', 3, 20);
        vinetas(P, revisar.map((o) => `${o.e.ens.nombre}: ${o.ns.length > 20 ? o.ns.slice(0, 20).join(', ') + ' y otras' : o.ns.join(', ')}.`), { tam: 9.5 });
      }
      // Plan personal de mejora
      const pm = planMejora(g, ens);
      titulo(P, 'Tu plan personal de mejora', 5, 60);
      const hab = (o) => { const th = Temarios.habilidad(ens.asignatura, o.nombre); return th ? th.descripcion : minus(o.nombre); };
      recuadros(P, [
        { titulo: 'Tus fortalezas', color: C.t3, fondo: '#EEF4FC', items: pm.fortalezas.length ? pm.fortalezas.map((o) => (o.hab ? `Habilidad ${minus(o.nombre)}: ${o.correctas} de ${o.preguntas} correctas. Sabes ${hab(o)}.` : `${o.nombre}: ${o.correctas} de ${o.preguntas} correctas (${pct(o.logro)}).`)) : [`Respondiste bien ${g.correctas} preguntas: esa es tu base para avanzar.`] },
        { titulo: 'Tus prioridades', color: C.critico, fondo: '#FCF0E9', items: pm.prioridades.length ? pm.prioridades.map((o, i) => `${i + 1}. ${o.nombre}: ${o.correctas} de ${o.preguntas} correctas (${pct(o.logro)}).`) : ['Mantener el nivel y practicar con preguntas más difíciles.'] },
      ]);
      const act = [];
      if (pm.contenidos.length) act.push(`Contenidos para practicar: ${lista(pm.contenidos.map(minus))}.`);
      if (pm.habsD.length) act.push(`Habilidades para desarrollar: ${lista(pm.habsD.map((o) => `${minus(o.nombre)} (${hab(o)})`))}.`);
      if (pm.prioridades.length) act.push(`Actividad sugerida: resuelve 8 a 10 ejercicios de ${pm.prioridades[0].nombre} por semana y revisa el desarrollo de cada uno, no solo el resultado.`);
      if (revisar.length) act.push('Vuelve a resolver las preguntas que fallaste sin mirar la clave; después compara y anota qué te hizo equivocarte.');
      if (g.omisiones >= 3) act.push('Practica un ensayo con tiempo controlado para no dejar preguntas en blanco: una respuesta en blanco nunca suma.');
      const p0 = pm.prioridades[0];
      act.push(p0 ? `Meta para el próximo ensayo: llegar a ${pct(Math.min(0.95, Math.max(0.5, p0.logro + 0.15)))} en ${p0.nombre} y a ${pct(Math.min(1, g.logro + 0.07))} de resultado global.` : `Meta para el próximo ensayo: mantener o superar ${pct(g.logro)} de resultado global.`);
      vinetas(P, act, { tam: 10 });
    });
    parrafo(P, `${pila}, estos resultados muestran dónde estás hoy, no un límite. Los puntajes y niveles son estimaciones a partir de ensayos y sirven para orientar el estudio.`, { color: C.texto2, tam: 9 });
    notaMetodologica(P, { consolidado: true, tieneTabla: sel.some((s) => Estad.tieneTabla(s.ens)), tieneCortes: sel.some((s) => Estad.cortesDe(s.ens)) });
  }

  function seccionApoderado(P, ctxS) {
    const { cur, est, sel } = ctxS, pila = nombrePila(est.nombre), col = ctxS.colegio || {};
    const C2 = Estad.consolidar(est.id, sel, ctxS.ejes);
    banda(P, est.nombre, `Informe para la familia · ${cur.nombre}`, [`Período: ${periodoTexto(sel)}`, `generado el ${hoy()}`].join(' · '));
    titulo(P, 'Identificación', 0, 30);
    ficha(P, [['Estudiante', est.nombre], ['Curso', cur.nombre], ['Evaluaciones', sel.map((s) => s.ens.nombre).join('; ')], ['Fecha o período', periodoTexto(sel)]]);
    if (!C2.length) { parrafo(P, 'No hay respuestas para los ensayos elegidos.', { color: C.critico }); return; }
    C2.forEach((g) => {
      const ens = g.ensayos[g.ensayos.length - 1].ens, ejes = conDatos(g.porEje), habs = conDatos(g.porHabilidad);
      titulo(P, C2.length > 1 ? `Resultado general en ${g.nombre}` : 'Resultado general', 6, 95);
      cifras(P, [
        { etiqueta: 'Respuestas correctas', valor: `${g.correctas} de ${g.preguntas}`, detalle: g.omisiones ? `${g.omisiones} sin responder` : 'respondió todas' },
        { etiqueta: 'Porcentaje de logro', valor: pct(g.logro), detalle: g.cantidad > 1 ? 'de todos los ensayos juntos' : ens.nombre },
        { etiqueta: 'Ensayos considerados', valor: String(g.cantidad), detalle: g.nombre },
        { etiqueta: 'Temáticas evaluadas', valor: String(ejes.length), detalle: lista(ejes.map((o) => o.nombre)) },
      ]);
      const fuertes = ejes.filter((o) => o.logro >= 0.6).slice(0, 3), debiles = ejes.filter((o) => o.logro < 0.6).sort((a, b) => a.logro - b.logro).slice(0, 3);
      const hab = (o) => { const th = Temarios.habilidad(ens.asignatura, o.nombre); return th ? th.descripcion : minus(o.nombre); };
      const bueno = fuertes.map((o) => `Maneja bien ${o.nombre}: respondió correctamente ${o.correctas} de ${o.preguntas} preguntas.`);
      habs.filter((o) => o.logro >= 0.7).slice(0, 2).forEach((o) => bueno.push(`Sabe ${hab(o)}.`));
      if (!bueno.length) bueno.push(`Respondió bien ${g.correctas} preguntas. Desde ahí se construye el avance.`);
      const mejorar = debiles.map((o) => { const te = Temarios.eje(ens.asignatura, o.nombre); return `${o.nombre} necesita más práctica (${o.correctas} de ${o.preguntas} correctas)${te ? `. Incluye temas como ${lista(te.contenidos.slice(0, 3).map(minus))}` : ''}.`; });
      if (!mejorar.length) mejorar.push('No hay temáticas bajo lo esperado. El desafío es mantener el ritmo y practicar con problemas más exigentes.');
      recuadros(P, [{ titulo: 'Fortalezas', color: C.t3, fondo: '#EEF4FC', items: bueno }, { titulo: 'Aspectos por fortalecer', color: C.critico, fondo: '#FCF0E9', items: mejorar }]);
      if (g.cantidad >= 2) {
        titulo(P, 'Evolución', 4, 55);
        lineas(P, [{ nombre: pila, color: C.azul, grueso: true, unir: true, valores: g.ensayos.map((e) => e.logro) }], g.ensayos.map((e) => etiquetaEns(e.ens)), { alto: 34 });
        const d = g.cambio;
        parrafo(P, `${Math.abs(d) < 0.03 ? `Su resultado se ha mantenido estable entre ${pct(g.ensayos[0].logro)} y ${pct(g.ensayos[g.cantidad - 1].logro)}.` : d > 0 ? `Subió de ${pct(g.ensayos[0].logro)} a ${pct(g.ensayos[g.cantidad - 1].logro)} entre el primer y el último ensayo.` : `Bajó de ${pct(g.ensayos[0].logro)} a ${pct(g.ensayos[g.cantidad - 1].logro)} entre el primer y el último ensayo.`} Los ensayos no siempre tienen la misma dificultad, así que conviene mirar la tendencia más que un resultado aislado.`, { tam: 10 });
      }
    });
    const g0 = C2[0], debil = conDatos(g0.porEje).sort((a, b) => a.logro - b.logro)[0];
    titulo(P, 'Orientaciones para la familia', 6, 50);
    vinetas(P, [
      `Acordar un horario fijo de estudio, por ejemplo 30 a 40 minutos, tres veces por semana${debil && debil.logro < 0.6 ? `, dedicando una parte a ${debil.nombre}` : ''}.`,
      'Acompañar la revisión de las tareas y ensayos: pedirle que explique cómo resolvió un ejercicio ayuda más que revisar solo si la respuesta está buena.',
      'Promover hábitos de estudio: un lugar tranquilo, sin celular cerca, y pausas cortas cada 25 minutos.',
      'Aprovechar situaciones cotidianas para resolver problemas: calcular descuentos, comparar precios, leer gráficos de las noticias o estimar tiempos de viaje.',
      `Mantener contacto con el docente${col.responsable ? ` (${col.responsable})` : ''} para saber qué se está reforzando en clases y cómo apoyar desde la casa.`,
    ], { tam: 10 });
    titulo(P, 'Mensaje final', 5, 25);
    const mejora = C2.find((g) => g.cambio != null && g.cambio >= 0.03);
    const fuerte = conDatos(g0.porEje).sort((a, b) => b.logro - a.logro)[0];
    parrafo(P, `${mejora ? `${pila} mostró un avance en ${mejora.nombre} y eso habla de su esfuerzo. ` : ''}${fuerte && fuerte.logro >= 0.6 ? `Tiene una base sólida en ${fuerte.nombre}. ` : ''}${debil && debil.logro < 0.6 ? `Con práctica constante en ${debil.nombre} puede seguir mejorando. ` : ''}Cada ensayo es una oportunidad para aprender: lo importante es el progreso, y el apoyo de la familia hace una diferencia real.`, { tam: 10.5 });
    parrafo(P, 'Este informe muestra solo los resultados de su estudiante: no incluye rankings ni comparaciones con otros estudiantes. Los porcentajes vienen de ensayos y orientan el estudio; no son resultados oficiales.', { color: C.texto2, tam: 8.5 });
  }

  // ---------- Exportaciones ----------
  const docCon = (ctx, pie) => { const P = nuevoDoc(ctx); P.pie = pie; return P; };
  const nuevaPagina = (P) => { P.doc.addPage(); P.y = M; };
  const pieDe = (ctx, tipo, extra) => [(ctx.colegio || {}).nombre || 'Lector óptico', tipo, extra].filter(Boolean).join(' · ');

  function directivo(ctxD) {
    const P = docCon(ctxD, pieDe(ctxD, 'Resumen para equipo directivo', `${ctxD.ens.nombre}`));
    seccionDirectivo(P, ctxD); piePaginas(P); return P.doc.output('blob');
  }
  function docente(ctx, { fichas = true } = {}) {
    const P = docCon(ctx, pieDe(ctx, 'Informe para el docente', `${ctx.ens.nombre} · ${ctx.cur.nombre}`));
    cuerpoCurso(P, ctx);
    if (fichas) paginasEstudiantes(P, ctx, null, true, 'docente');
    piePaginas(P); return P.doc.output('blob');
  }
  // ctxS puede ser un estudiante o una lista (un informe por estudiante en el mismo PDF)
  function acumulado(ctxS, modo = 'estudiante') {
    const lista2 = Array.isArray(ctxS) ? ctxS : [ctxS], c0 = lista2[0];
    const P = docCon(c0, pieDe(c0, modo === 'apoderado' ? 'Informe para padres y apoderados' : 'Informe del estudiante', lista2.length === 1 ? `${c0.est.nombre} · ${c0.cur.nombre}` : c0.cur.nombre));
    lista2.forEach((c, i) => { if (i) nuevaPagina(P); (modo === 'apoderado' ? seccionApoderado : seccionEstudiante)(P, c); });
    piePaginas(P); return P.doc.output('blob');
  }
  // Las cuatro secciones en un documento: directivo, docente y, por cada estudiante elegido, su informe y el de su familia
  function completo({ dir, doc: ctxDoc, estudiantes: lista2 = [], fichas = false }) {
    const P = docCon(ctxDoc, pieDe(ctxDoc, 'Informe completo', `${ctxDoc.ens.nombre} · ${ctxDoc.cur.nombre}`));
    let primera = true;
    const sig = () => { if (!primera) nuevaPagina(P); primera = false; };
    if (dir) { sig(); seccionDirectivo(P, dir); }
    sig(); cuerpoCurso(P, ctxDoc); if (fichas) paginasEstudiantes(P, ctxDoc, null, true, 'docente');
    lista2.forEach((s) => { sig(); seccionEstudiante(P, s); sig(); seccionApoderado(P, s); });
    piePaginas(P); return P.doc.output('blob');
  }

  // Cifras para la vista previa de la app (sin dibujar)
  function vistaPrevia(ctxD) {
    return { indicadores: ctxD.inst.resumen, alertas: alertasInstitucionales(ctxD.porCurso, ctxD.inst) };
  }

  return { curso, estudiantes, estudiante, directivo, docente, acumulado, completo, vistaPrevia };
})();
