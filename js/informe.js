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
  // Al hablar de un estudiante se usa su nombre y primer apellido
  const nombrePila = (n) => Estad.nombres(n).corto;
  const nombreCompleto = (n) => Estad.nombres(n).completo;
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
      if (P.sinPie && P.sinPie.has(i)) continue;
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
      let te = 8.5; fuente(doc, te, 'normal', C.texto2);
      while (te > 6.5 && doc.getTextWidth(it.etiqueta) > w - 8) { te -= 0.5; doc.setFontSize(te); }
      doc.text(doc.getTextWidth(it.etiqueta) > w - 8 ? doc.splitTextToSize(it.etiqueta, w - 10)[0] + '…' : it.etiqueta, x + 4, P.y + 6);
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

  // Histograma con la curva normal (campana) de la misma media y desviación estándar.
  // Sombrea la franja de una desviación estándar alrededor del promedio.
  // Histograma con la curva normal (campana) de la misma media y desviación estándar.
  // Sombrea la franja de una desviación estándar alrededor del promedio.
  // marca: { valor, texto } dibuja la posición de un estudiante.
  // soloCurva: solo la forma de la curva y la marca, sin cifras del grupo (informe para la familia).
  function campana(P, valores, { min, max, paso, formato, alto = 62, unidad = '', marca = null, soloCurva = false, texto = true }) {
    const { doc } = P, n = valores.length;
    if (n < 3) return;
    const media = valores.reduce((a, b) => a + b, 0) / n;
    const de = Math.sqrt(valores.reduce((a, b) => a + (b - media) ** 2, 0) / (n - 1)) || paso / 2;
    const nb = Math.round((max - min) / paso);
    const bins = Array.from({ length: nb }, (_, i) => valores.filter((v) => v >= min + i * paso && (v < min + (i + 1) * paso || (i === nb - 1 && v <= max))).length);
    const pdf = (x) => Math.exp(-0.5 * ((x - media) / de) ** 2) / (de * Math.sqrt(2 * Math.PI));
    const esperadoMax = n * paso * pdf(media);
    const tope = (soloCurva ? esperadoMax : Math.max(...bins, esperadoMax)) * 1.12;
    if (soloCurva) alto = Math.min(alto, 40);
    P.cabe(alto + (soloCurva ? 16 : 26) + (marca ? 6 : 0));
    if (marca) P.y += 6;
    const izq = M + 10, ancho = W - 12, base = P.y + alto, X = (v) => izq + ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * ancho, Y = (c) => base - (c / tope) * alto;
    const a = Math.max(min, media - de), b = Math.min(max, media + de);
    if (!soloCurva) {
      // Franja de ±1 desviación estándar
      doc.setFillColor('#EEF3FB'); doc.rect(X(a), P.y, X(b) - X(a), alto, 'F');
      bins.forEach((c, i) => {
        if (!c) return;
        const x0 = X(min + i * paso) + 0.6, x1 = X(min + (i + 1) * paso) - 0.6;
        doc.setFillColor(C.t1); doc.rect(x0, Y(c), x1 - x0, base - Y(c), 'F');
        fuente(doc, 7.5, 'normal', C.texto2); doc.text(String(c), (x0 + x1) / 2, Y(c) - 1.2, { align: 'center' });
      });
    }
    // Curva normal
    const puntos = [];
    for (let k = 0; k <= 120; k++) { const x = min + ((max - min) * k) / 120; puntos.push([X(x), Y(n * paso * pdf(x))]); }
    if (soloCurva) {
      doc.setFillColor('#E3ECF9');
      for (let k = 1; k < puntos.length; k++) { const [x0, y0] = puntos[k - 1], [x1, y1] = puntos[k]; doc.triangle(x0, base, x0, y0, x1, y1, 'F'); doc.triangle(x0, base, x1, y1, x1, base, 'F'); }
    }
    doc.setDrawColor(C.azul); doc.setLineWidth(0.8);
    for (let k = 1; k < puntos.length; k++) doc.line(puntos[k - 1][0], puntos[k - 1][1], puntos[k][0], puntos[k][1]);
    if (!soloCurva) {
      doc.setDrawColor(C.critico); doc.setLineWidth(0.6); doc.setLineDashPattern([1.2, 1], 0);
      doc.line(X(media), P.y - 2, X(media), base); doc.setLineDashPattern([], 0);
      fuente(doc, 8.5, 'bold', C.critico);
      const tp = `Promedio ${formato(media)}`, xp = X(media);
      if (marca && marca.valor < media) doc.text(tp, Math.min(xp + 1.5, izq + ancho - doc.getTextWidth(tp)), P.y + 1);
      else if (marca) doc.text(tp, Math.max(izq, xp - 1.5 - doc.getTextWidth(tp)), P.y + 1);
      else doc.text(tp, Math.min(xp + 1.5, izq + ancho - 30), P.y + 1);
    }
    if (marca && marca.valor != null) {
      const xm = X(marca.valor), ym = Y(n * paso * pdf(Math.max(min, Math.min(max, marca.valor))));
      const verde = '#0E7A55';
      doc.setDrawColor(verde); doc.setLineWidth(1); doc.line(xm, P.y - 4, xm, base);
      doc.setFillColor(verde); doc.circle(xm, ym, 1.6, 'F');
      fuente(doc, 9, 'bold', verde);
      const tm = `${marca.texto}: ${formato(marca.valor)}`, wm = doc.getTextWidth(tm);
      const derecha = xm + 2 + wm <= izq + ancho;
      doc.text(tm, derecha ? xm + 2 : xm - 2 - wm, P.y - 4.5);
    }
    // Eje
    doc.setDrawColor(C.grid); doc.setLineWidth(0.3); doc.line(izq, base, izq + ancho, base);
    fuente(doc, 7.8, 'normal', C.texto2);
    const cada = Math.max(1, Math.ceil(nb / 10));
    for (let i = 0; i <= nb; i += cada) doc.text(formato(min + i * paso), X(min + i * paso), base + 4.5, { align: 'center' });
    P.y = base + 9;
    if (soloCurva) return;
    leyenda(P, [{ nombre: 'Estudiantes en cada tramo', color: C.t1 }, { nombre: 'Curva normal esperada', color: C.azul }, { nombre: `Franja de ±1 desv. est. (${formato(a)} a ${formato(b)})`, color: '#D5E1F5' }, ...(marca ? [{ nombre: marca.texto, color: '#0E7A55' }] : [])]);
    const ref = n < MIN_N ? ` Con ${n} estudiantes evaluados, la curva es un resultado referencial: cada estudiante cambia mucho su forma.` : '';
    if (!texto) { if (ref) parrafo(P, ref.trim(), { color: C.texto2, tam: 8.5 }); return; }
    const dentro = valores.filter((v) => v >= media - de && v <= media + de).length;
    const asim = valores.reduce((s2, v) => s2 + ((v - media) / de) ** 3, 0) / n;
    const forma = Math.abs(asim) < 0.3 ? 'La distribución es bastante simétrica: se parece a la curva normal.'
      : asim > 0 ? 'La distribución se carga hacia los resultados bajos, con una cola de resultados altos: hay un grupo que se despega hacia arriba.'
        : 'La distribución se carga hacia los resultados altos, con una cola de resultados bajos: hay un grupo que se queda atrás.';
    parrafo(P, `Promedio ${formato(media)}${unidad} y desviación estándar ${formato(de, true)}${unidad}. ${dentro} de ${n} estudiantes (${pct(dentro / n)}) quedan dentro de una desviación estándar del promedio; en una distribución normal se espera cerca del 68%. ${forma}${ref}`, { tam: 9.5 });
  }

  // Curva de un grupo en su escala: puntaje PAES si el ensayo tiene tabla, logro en los demás
  function curvaGrupo(P, A, opciones = {}) {
    const conP = A.resumen.puntajeMedia != null;
    const vals = A.hechas.map((y) => (conP ? y.puntaje : y.logro)).filter((v) => v != null);
    if (vals.length < 3) {
      if (!opciones.soloCurva) parrafo(P, `Con ${plural(vals.length, 'estudiante evaluado', 'estudiantes evaluados')} no se dibuja la curva de distribución: hacen falta al menos 3.`, { color: C.texto2, tam: 9 });
      return null;
    }
    const extra = opciones.marca && opciones.marca.valor != null ? [opciones.marca.valor] : [];
    if (conP) {
      const todos = [...vals, ...extra];
      const lo = Math.max(100, Math.floor((Math.min(...todos) - 25) / 50) * 50), hi = Math.min(1000, Math.ceil((Math.max(...todos) + 25) / 50) * 50);
      campana(P, vals, { min: lo, max: Math.max(hi, lo + 200), paso: 50, formato: (v) => String(Math.round(v)), unidad: ' puntos', ...opciones });
    } else campana(P, vals, { min: 0, max: 1, paso: 0.1, formato: (v, dif) => (dif ? `${Math.round(v * 100)} pp` : pct(v)), ...opciones });
    const media = vals.reduce((s, v) => s + v, 0) / vals.length;
    return { conP, media, n: vals.length, valores: vals };
  }

  // Curvas normales de varios cursos en un mismo eje, para comparar su forma (promedio y dispersión)
  function curvasSuperpuestas(P, porCurso) {
    const conP = porCurso.every((x) => x.A.resumen.puntajeMedia != null);
    const colores = [...C.cat, '#8a5a44', '#3d8fa8'];
    const S2 = porCurso.map((x, k) => {
      const v = x.A.hechas.map((y) => (conP ? y.puntaje : y.logro)).filter((z) => z != null);
      if (v.length < 3) return null;
      const m = v.reduce((a, b) => a + b, 0) / v.length;
      const de = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)) || (conP ? 25 : 0.03);
      return { nombre: x.curso.nombre, color: colores[k % colores.length], m, de, n: v.length };
    }).filter(Boolean);
    if (S2.length < 2) return;
    const fmt = conP ? (v) => String(Math.round(v)) : pct, paso = conP ? 50 : 0.1;
    let lo = Math.min(...S2.map((s) => s.m - 2.6 * s.de)), hi = Math.max(...S2.map((s) => s.m + 2.6 * s.de));
    lo = Math.max(conP ? 100 : 0, Math.floor(lo / paso) * paso); hi = Math.min(conP ? 1000 : 1, Math.ceil(hi / paso) * paso);
    const pdf = (s, x) => Math.exp(-0.5 * ((x - s.m) / s.de) ** 2) / (s.de * Math.sqrt(2 * Math.PI));
    const tope = Math.max(...S2.map((s) => pdf(s, s.m))) * 1.1, alto = 52;
    const { doc } = P;
    P.cabe(alto + 30);
    const izq = M + 10, ancho = W - 12, base = P.y + alto, X = (v) => izq + ((v - lo) / (hi - lo)) * ancho, Y = (d) => base - (d / tope) * alto;
    doc.setDrawColor(C.grid); doc.setLineWidth(0.3); doc.line(izq, base, izq + ancho, base);
    S2.forEach((s) => {
      doc.setDrawColor(s.color); doc.setLineWidth(0.9);
      let prev = null;
      for (let k = 0; k <= 120; k++) { const x = lo + ((hi - lo) * k) / 120, pt = [X(x), Y(pdf(s, x))]; if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]); prev = pt; }
      doc.setLineWidth(0.4); doc.setLineDashPattern([1, 1], 0); doc.line(X(s.m), Y(pdf(s, s.m)), X(s.m), base); doc.setLineDashPattern([], 0);
    });
    fuente(doc, 7.8, 'normal', C.texto2);
    const nb = Math.round((hi - lo) / paso), cada = Math.max(1, Math.ceil(nb / 10));
    for (let i = 0; i <= nb; i += cada) doc.text(fmt(lo + i * paso), X(lo + i * paso), base + 4.5, { align: 'center' });
    P.y = base + 9;
    leyenda(P, S2.map((s) => ({ nombre: `${s.nombre} (${fmt(s.m)})`, color: s.color })));
    const alto2 = S2.slice().sort((a, b) => b.m - a.m), parejo = S2.slice().sort((a, b) => a.de - b.de);
    const dsp = (s) => (conP ? `${Math.round(s.de)} puntos` : `${Math.round(s.de * 100)} pp`);
    let t = `Cada curva resume un curso: su punta está en el promedio y su ancho muestra la dispersión. ${alto2[0].nombre} tiene el promedio más alto (${fmt(alto2[0].m)}) y ${alto2[alto2.length - 1].nombre}, el más bajo (${fmt(alto2[alto2.length - 1].m)}).`;
    t += ` El curso más parejo es ${parejo[0].nombre} (desviación estándar de ${dsp(parejo[0])}) y el más heterogéneo, ${parejo[parejo.length - 1].nombre} (${dsp(parejo[parejo.length - 1])}).`;
    if (S2.some((s) => s.n < MIN_N)) t += ' Los cursos con menos de 8 estudiantes evaluados se muestran como referencia.';
    parrafo(P, t, { color: C.texto2, tam: 9.5 });
  }

  // Barras apiladas al 100% (estándares)
  function apiladas(P, filas, nombres, colores = [C.t1, C.t2, C.t3]) {
    const { doc } = P, et = 30, x0 = M + et, largo = W - et, alto = 9, gap = 3.5;
    P.cabe(filas.length * (alto + gap) + 10);
    filas.forEach((f, i) => {
      const y = P.y + i * (alto + gap), total = f.partes.reduce((s, x) => s + x, 0) || 1;
      fuente(doc, 9.5, f.destacado ? 'bold' : 'normal'); doc.text(f.nombre, x0 - 3, y + alto * 0.68, { align: 'right' });
      let x = x0;
      f.partes.forEach((n, k) => {
        const w = (n / total) * largo;
        if (w > 0.3) {
          doc.setFillColor(colores[k]); doc.rect(x, y, Math.max(0.3, w - 0.6), alto, 'F');
          if (w > 12) { fuente(doc, 9, 'bold', k === 0 || (colores.length > 3 && k === 1) ? C.texto : '#FFFFFF'); doc.text(pct(n / total), x + w / 2, y + alto * 0.68, { align: 'center' }); }
        }
        x += w;
      });
    });
    P.y += filas.length * (alto + gap) + 1;
    leyenda(P, nombres.map((n, k) => ({ nombre: n, color: colores[k] })), x0);
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
  function tabla(P, cols, filas, { tam = 8.8, sinEncabezado = false } = {}) {
    const { doc } = P, lh = tam >= 8.5 ? 6.4 : 5.6;
    const encabezado = () => {
      if (sinEncabezado) return;
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
  const nombreCorto = nombrePila;

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
    if (!ctx.conPortada) titulo(P, 'Identificación del curso', 0, 40);
    if (!ctx.conPortada) ficha(P, [['Curso', cur.nombre], ['Asignatura', ens.asignatura || '–'], ['Evaluación aplicada', `${ens.nombre} (${tipoEvaluacion(ens)})`], ['Fecha', ens.fecha || 'sin fecha registrada'],
      ['Estudiantes evaluados', `${R.corregidas} de ${R.total}`], ['Participación', pct1(R.participacion)]]);
    avisoDatos(P, ctx.validacion);
    if (ctx.validacion && !ctx.validacion.ok) { parrafo(P, 'Hay problemas en los datos que afectan los cálculos. Corrígelos y vuelve a generar el informe: no se muestran estadísticas para no entregar cifras engañosas.', { estilo: 'bold', color: C.critico }); return; }
    titulo(P, 'Lo principal', ctx.conPortada ? 0 : 4);
    vinetas(P, lineasPrincipales(ctx));
    const tarjetas = [
      { etiqueta: 'Logro promedio', valor: pct(R.media), detalle: `mediana ${pct(R.mediana)}` },
      { etiqueta: 'Nota promedio', valor: nt(R.notaMedia), detalle: `exigencia ${pct(Estad.conf.escala.exigencia)}` },
      { etiqueta: 'Aprueban', valor: pct(R.aprobados / R.corregidas), detalle: `${R.aprobados} de ${R.corregidas}` },
    ];
    if (R.puntajeMedia != null) tarjetas.push({ etiqueta: 'Puntaje PAES (est.)', valor: R.puntajeMedia, detalle: `rango ${R.puntajeMin}–${R.puntajeMax}` });
    else if (R.adecuado != null) tarjetas.push({ etiqueta: 'En Adecuado (est.)', valor: pct(R.adecuado), detalle: 'estándar estimado' });
    P.y += 2; cifras(P, tarjetas);

    let ns = 1;
    // 1. Resultados del curso, con la curva
    seccion(P, ns++, 'Resultados del curso', 92);
    titulo(P, 'Distribución y curva normal', 0, 90);
    curvaGrupo(P, A);
    titulo(P, R.puntajeMedia != null ? '¿Cómo se distribuyen los puntajes?' : '¿Cómo se distribuyen las notas?', 6, 70);
    distribucion(P, A);
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
    seccion(P, ns++, 'Ejes y habilidades', A.porEje.length * 11 + 30);
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

    contenidosHabilidades(P, A);
    const ejesLista = A.porEje.filter((g) => g.nombre !== 'Sin dato');

    // 3. Preguntas
    seccion(P, ns++, 'Análisis por pregunta', 85);
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

    preguntaPorPregunta(P, A);
    detallePreguntas(P, A);

    // 5. Apoyo y sugerencias
    seccion(P, ns++, 'Estudiantes', 50);
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
    if (ejesLista.length >= 1) {
      titulo(P, 'Mapa del curso: cada estudiante en cada eje', 6, 60);
      parrafo(P, 'Ordenado de mayor a menor logro. Permite ver de un vistazo qué estudiantes y qué ejes concentran las dificultades.', { color: C.texto2, tam: 9.5 });
      mapaEstudiantes(P, A, ejesLista);
    }

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
    seccion(P, ns++, 'Plan de acción', 60);
    titulo(P, 'Acciones sugeridas', 0, 50);
    parrafo(P, 'Una propuesta para acordar en el departamento. El responsable y el plazo se pueden ajustar.', { color: C.texto2, tam: 9.5 });
    const plazos = ['Próximas 2 semanas', 'Próxima clase', 'Próximas 2 semanas', 'Este mes', 'Antes del próximo ensayo', 'Este mes'];
    const resp = (ctx.colegio && ctx.colegio.responsable) || 'Docente de la asignatura';
    tabla(P, [{ titulo: 'Acción', ancho: W - 82, envolver: true }, { titulo: 'Responsable', ancho: 46, envolver: true }, { titulo: 'Plazo', ancho: 36, envolver: true }],
      sugerencias(ctx).map((t, i) => ({ celdas: [t, resp, plazos[i] || 'Este mes'] })));
    planIntervencion(P, ctx);

    // 4. Paralelos y evolución
    const sel = ctx.seleccion || [], conSel = sel.length > 1, conEvol = conSel || (H && H.puntos.length >= 2);
    if (conNivel || conEvol) seccion(P, ns++, conNivel ? 'Comparación entre cursos y evolución' : 'Evolución', 60);
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

    // Anexo técnico
    nuevaPagina(P);
    seccion(P, ns++, 'Anexo técnico', 60);
    titulo(P, 'Resumen estadístico', 0, 60);
    tablaIndicadores(P, A);
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
    portadaCurso(P, ctx, 'INFORME DEL CURSO');
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
    tabla(P, [{ titulo: '', ancho: anchoDato, negrita: true, envolver: true }, { titulo: '', ancho: W - anchoDato, envolver: true, negrita: false }],
      filas.filter((f) => f[1] != null && f[1] !== '').map((f) => ({ celdas: f })), { sinEncabezado: true });
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
  function compararCursos(P, porCurso, inst, { propio = null, nombreInst = 'Total', partes = 'todo' } = {}) {
    const R = inst.resumen, colores = porCurso.map((x, k) => C.cat[k % C.cat.length]);
    if (partes !== 'bloques') {
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
    }
    if (partes === 'resumen') return;
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
      tieneTabla ? 'Puntaje PAES estimado: se obtiene con la tabla de conversión (de respuestas correctas a puntaje) cargada en el ensayo. No es el puntaje oficial del DEMRE.' : 'Este informe no estima puntajes PAES: el ensayo no tiene tabla de conversión cargada y la app no convierte porcentajes en puntajes por reglas arbitrarias.',
      tieneCortes ? 'Estándares SIMCE estimados: se asignan con los cortes de logro que trae el ensayo. No es el puntaje SIMCE ni el estándar oficial de la Agencia de Calidad.' : null,
      'Comparaciones entre cursos: solo entre cursos que rindieron el mismo ensayo. Las diferencias se expresan en puntos porcentuales (pp) y son descriptivas: no se aplicaron pruebas estadísticas. Con menos de 8 estudiantes los resultados son referenciales.',
      'Distractores: la explicación de un error aparece como hipótesis, salvo que el ensayo traiga el error asociado a cada alternativa.',
      consolidado ? 'Resultados acumulados: el logro global es la suma de respuestas correctas dividida por la suma de preguntas válidas de los ensayos elegidos (no es el promedio de los porcentajes). Cada ensayo se cuenta una vez. Los instrumentos distintos (por ejemplo, PAES M1 y M2) se informan por separado. Una diferencia entre ensayos puede deberse en parte a su distinta dificultad.' : null,
    ].filter(Boolean);
    vinetas(P, items, { tam: 8.8 });
  }

  // ---------- 1. Resumen para equipo directivo ----------
  // ctxD: { ens, nivel, porCurso: [{ curso, A }], inst: análisis conjunto, colegio, validacion }
  // Texto de apertura del informe de un grupo: puntaje, logro, nota y participación en una lectura
  function resumenTexto(ctxD) {
    const { porCurso, inst } = ctxD, R = inst.resumen, t = [];
    if (R.puntajeMedia != null) t.push(`El puntaje PAES promedio estimado es de ${R.puntajeMedia} puntos (mediana ${Math.round(R.dPuntaje.mediana)}), con resultados entre ${R.puntajeMin} y ${R.puntajeMax} puntos.`);
    t.push(`En promedio, cada estudiante respondió bien ${dec1(R.dCorrectas.media)} de ${inst.n} preguntas (${pct(R.media)} de logro)${R.notaMedia != null ? `, equivalente a una nota ${nt(R.notaMedia)}` : ''}.`);
    if (R.notaMedia != null && R.corregidas) t.push(`${R.aprobados} de ${R.corregidas} estudiantes (${pct(R.aprobados / R.corregidas)}) alcanzan nota ${nt(Estad.conf.escala.aprobacion)} o más.`);
    if (porCurso.length >= 2) {
      const campo = R.puntajeMedia != null ? (x) => x.A.resumen.puntajeMedia : (x) => x.A.resumen.media;
      const fmt = R.puntajeMedia != null ? (v) => `${v} puntos` : pct;
      const o = porCurso.slice().sort((a, b) => campo(b) - campo(a));
      t.push(`El curso con mejor resultado es ${o[0].curso.nombre} (${fmt(campo(o[0]))}) y el más bajo, ${o[o.length - 1].curso.nombre} (${fmt(campo(o[o.length - 1]))}).`);
    }
    if (ctxD.anterior) {
      const Ra = ctxD.anterior.inst.resumen;
      if (R.puntajeMedia != null && Ra.puntajeMedia != null) { const d = R.puntajeMedia - Ra.puntajeMedia; t.push(`Frente a ${ctxD.anterior.ens.nombre}, el puntaje promedio ${Math.abs(d) < 5 ? 'se mantuvo' : d > 0 ? `subió ${d} puntos` : `bajó ${-d} puntos`}.`); }
      else { const d = R.media - Ra.media; t.push(`Frente a ${ctxD.anterior.ens.nombre}, el logro promedio ${cambioTexto(d)}.`); }
    }
    const meta = (ctxD.colegio || {});
    if (R.puntajeMedia != null && meta.metaPuntaje) { const c = inst.hechas.filter((x) => x.puntaje >= meta.metaPuntaje).length; t.push(`${c} de ${R.corregidas} estudiantes (${pct(R.corregidas ? c / R.corregidas : 0)}) alcanzan la meta del colegio de ${meta.metaPuntaje} puntos.`); }
    else if (meta.metaLogro) { const c = inst.hechas.filter((x) => x.logro >= meta.metaLogro).length; t.push(`${c} de ${R.corregidas} estudiantes alcanzan la meta del colegio de ${pct(meta.metaLogro)} de logro.`); }
    return t.join(' ');
  }

  // Tramos de puntaje PAES (escala 100 a 1000)
  const TRAMOS_PAES = [[100, 449, 'Menos de 450'], [450, 549, '450 a 549'], [550, 649, '550 a 649'], [650, 749, '650 a 749'], [750, 849, '750 a 849'], [850, 1000, '850 o más']];
  function puntajesYNotas(P, ctxD) {
    const { porCurso, inst } = ctxD, R = inst.resumen, conP = R.puntajeMedia != null, col = ctxD.colegio || {};
    const colores = porCurso.map((x, k) => C.cat[k % C.cat.length]);
    if (conP) {
      const d = R.dPuntaje;
      cifras(P, [
        { etiqueta: 'Puntaje promedio', valor: String(R.puntajeMedia), detalle: `desv. est. ${Math.round(d.desviacion || 0)} pts.` },
        { etiqueta: 'Mediana', valor: String(Math.round(d.mediana)), detalle: `Q1 ${Math.round(d.q1)} · Q3 ${Math.round(d.q3)}` },
        { etiqueta: 'Puntaje más alto', valor: String(R.puntajeMax), detalle: 'en el conjunto' },
        { etiqueta: 'Puntaje más bajo', valor: String(R.puntajeMin), detalle: 'en el conjunto' },
      ]);
      titulo(P, 'Puntaje promedio por curso', 3, porCurso.length * 11 + 14);
      barras(P, porCurso.map((x, k) => ({ nombre: x.curso.nombre, valor: x.A.resumen.puntajeMedia || 0, color: colores[k], ref: R.puntajeMedia })),
        { max: 1000, formato: (v) => `${Math.round(v)} pts.`, refNombre: `Raya negra: promedio del conjunto (${R.puntajeMedia} pts.)`, etiquetaAncho: 30 });
      titulo(P, 'Puntajes por curso', 4, 40);
      const cm = col.metaPuntaje;
      tabla(P, [{ titulo: 'Curso', ancho: 26, negrita: true }, { titulo: 'Evaluados', ancho: 22, der: true }, { titulo: 'Promedio', ancho: 22, der: true, negrita: true }, { titulo: 'Mediana', ancho: 20, der: true },
        { titulo: 'Mínimo', ancho: 20, der: true }, { titulo: 'Máximo', ancho: 20, der: true }, { titulo: cm ? `Meta ${cm}` : 'Dif. total', ancho: W - 130, der: true }],
      [...porCurso.map((x) => { const r = x.A.resumen, dd = r.dPuntaje || {}; const c = cm ? x.A.hechas.filter((y) => y.puntaje >= cm).length : null;
        return { celdas: [x.curso.nombre, `${r.corregidas}/${r.total}`, r.puntajeMedia ?? '–', dd.mediana != null ? Math.round(dd.mediana) : '–', r.puntajeMin ?? '–', r.puntajeMax ?? '–', cm ? `${c} (${pct(r.corregidas ? c / r.corregidas : 0)})` : (r.puntajeMedia != null ? `${r.puntajeMedia - R.puntajeMedia >= 0 ? '+' : ''}${r.puntajeMedia - R.puntajeMedia} pts.` : '–')] }; }),
      { celdas: ['Total', `${R.corregidas}/${R.total}`, R.puntajeMedia, Math.round(d.mediana), R.puntajeMin, R.puntajeMax, cm ? (() => { const c = inst.hechas.filter((y) => y.puntaje >= cm).length; return `${c} (${pct(R.corregidas ? c / R.corregidas : 0)})`; })() : '–'] }]);
      titulo(P, 'Distribución de los puntajes y curva normal', 4, 90);
      const vp = inst.hechas.map((y) => y.puntaje).filter((v) => v != null);
      const lo = Math.max(100, Math.floor((Math.min(...vp) - 25) / 50) * 50), hi = Math.min(1000, Math.ceil((Math.max(...vp) + 25) / 50) * 50);
      campana(P, vp, { min: lo, max: hi, paso: 50, formato: (v, dif) => String(Math.round(v)), unidad: ' puntos' });
      titulo(P, 'Estudiantes por tramo de puntaje', 4, 60);
      const cuenta = (A) => TRAMOS_PAES.map(([a, b]) => A.hechas.filter((y) => y.puntaje != null && y.puntaje >= a && y.puntaje <= b).length);
      apiladas(P, [...porCurso.map((x) => ({ nombre: x.curso.nombre, partes: cuenta(x.A) })), { nombre: 'Total', partes: cuenta(inst), destacado: true }], TRAMOS_PAES.map((t) => t[2]), ['#DCE6F7', '#B3C9EE', '#7FA3E0', '#4A7BCF', '#2558B0', '#123A7E']);
      parrafo(P, 'Cantidad de estudiantes en cada tramo de puntaje. Puntaje PAES estimado con la tabla de conversión del ensayo: no es un puntaje oficial del DEMRE.', { color: C.texto2, tam: 8.5 });
    }
    if (!conP && inst.hechas.length >= 3) {
      titulo(P, 'Distribución del logro y curva normal', 0, 90);
      campana(P, inst.hechas.map((y) => y.logro), { min: 0, max: 1, paso: 0.1, formato: (v, dif) => (dif ? `${Math.round(v * 100)} pp` : pct(v)) });
    }
    if (R.notaMedia != null) {
      const ap = Estad.conf.escala.aprobacion;
      titulo(P, 'Notas por curso', 5, 40);
      tabla(P, [{ titulo: 'Curso', ancho: 26, negrita: true }, { titulo: 'Evaluados', ancho: 22, der: true }, { titulo: 'Nota prom.', ancho: 24, der: true, negrita: true }, { titulo: 'Logro', ancho: 20, der: true },
        { titulo: `Nota ${nt(ap)} o más`, ancho: 34, der: true }, { titulo: `Bajo ${nt(ap)}`, ancho: W - 126, der: true }],
      [...porCurso.map((x) => { const r = x.A.resumen; return { resaltar: r.corregidas && r.aprobados / r.corregidas < 0.5, celdas: [x.curso.nombre, `${r.corregidas}/${r.total}`, nt(r.notaMedia), pct(r.media), `${r.aprobados} (${pct(r.corregidas ? r.aprobados / r.corregidas : 0)})`, `${r.corregidas - r.aprobados}`] }; }),
        { celdas: ['Total', `${R.corregidas}/${R.total}`, nt(R.notaMedia), pct(R.media), `${R.aprobados} (${pct(R.corregidas ? R.aprobados / R.corregidas : 0)})`, `${R.corregidas - R.aprobados}`] }]);
      if (porCurso.length >= 2) barras(P, porCurso.map((x, k) => ({ nombre: x.curso.nombre, valor: x.A.resumen.notaMedia || 1, color: colores[k], ref: R.notaMedia })),
        { max: 7, formato: (v) => nt(v), refNombre: `Raya negra: nota promedio del conjunto (${nt(R.notaMedia)})`, etiquetaAncho: 30 });
      parrafo(P, `Nota calculada con la escala de Ajustes (${pct(Estad.conf.escala.exigencia || 0.6)} de exigencia para el ${nt(ap)}). En color, los cursos donde menos de la mitad alcanza el ${nt(ap)}.`, { color: C.texto2, tam: 8.5 });
    }
  }

  // Mismos cursos en el ensayo anterior del mismo tipo
  function compararAnterior(P, ctxD) {
    const { porCurso, inst, anterior } = ctxD, R = inst.resumen, Ra = anterior.inst.resumen, conP = R.puntajeMedia != null && Ra.puntajeMedia != null;
    parrafo(P, `Ensayo anterior: ${anterior.ens.nombre}${anterior.ens.fecha ? ` (${anterior.ens.fecha})` : ''}. Se comparan los mismos cursos.`, { tam: 10 });
    const filas = porCurso.map((x) => {
      const a = anterior.porCurso.find((y) => y.curso.id === x.curso.id); if (!a) return null;
      const r = x.A.resumen, ra = a.A.resumen;
      return conP ? { celdas: [x.curso.nombre, ra.puntajeMedia ?? '–', r.puntajeMedia ?? '–', ra.puntajeMedia != null && r.puntajeMedia != null ? `${r.puntajeMedia - ra.puntajeMedia >= 0 ? '+' : ''}${r.puntajeMedia - ra.puntajeMedia} pts.` : '–', pct(ra.media), pct(r.media), pp(r.media - ra.media)], resaltar: r.media - ra.media <= -0.05 }
        : { celdas: [x.curso.nombre, pct(ra.media), pct(r.media), pp(r.media - ra.media), nt(ra.notaMedia), nt(r.notaMedia)], resaltar: r.media - ra.media <= -0.05 };
    }).filter(Boolean);
    if (!filas.length) { parrafo(P, 'Ninguno de estos cursos tiene hojas en el ensayo anterior.', { color: C.texto2, tam: 9 }); return; }
    filas.push(conP ? { celdas: ['Total', Ra.puntajeMedia, R.puntajeMedia, `${R.puntajeMedia - Ra.puntajeMedia >= 0 ? '+' : ''}${R.puntajeMedia - Ra.puntajeMedia} pts.`, pct(Ra.media), pct(R.media), pp(R.media - Ra.media)] }
      : { celdas: ['Total', pct(Ra.media), pct(R.media), pp(R.media - Ra.media), nt(Ra.notaMedia), nt(R.notaMedia)] });
    const cols = conP ? [{ titulo: 'Curso', ancho: 28, negrita: true }, { titulo: 'Puntaje ant.', ancho: 26, der: true }, { titulo: 'Puntaje act.', ancho: 26, der: true, negrita: true }, { titulo: 'Cambio', ancho: 24, der: true, negrita: true }, { titulo: 'Logro ant.', ancho: 24, der: true }, { titulo: 'Logro act.', ancho: 24, der: true }, { titulo: 'Cambio', ancho: W - 152, der: true }]
      : [{ titulo: 'Curso', ancho: 30, negrita: true }, { titulo: 'Logro ant.', ancho: 28, der: true }, { titulo: 'Logro act.', ancho: 28, der: true, negrita: true }, { titulo: 'Cambio', ancho: 28, der: true, negrita: true }, { titulo: 'Nota ant.', ancho: 28, der: true }, { titulo: 'Nota act.', ancho: W - 142, der: true }];
    tabla(P, cols, filas);
    parrafo(P, 'En color, los cursos que bajaron 5 pp o más. Los ensayos no tienen necesariamente la misma dificultad: una diferencia puede deberse en parte a eso.', { color: C.texto2, tam: 8.5 });
  }

  // Tres hallazgos para el resumen ejecutivo
  function hallazgos(ctxD, ejes) {
    const { porCurso, inst } = ctxD, u = Estad.conf.institucional, h = [];
    if (ejes.length >= 2) { const a = ejes[0], z = ejes[ejes.length - 1]; h.push(`El eje mejor logrado es ${a.nombre} (${pct(a.logro)}) y el más descendido, ${z.nombre} (${pct(z.logro)}): ${Math.round((a.logro - z.logro) * 100)} pp de diferencia.`); }
    else if (ejes.length === 1) h.push(`El único eje clasificado, ${ejes[0].nombre}, alcanza ${pct(ejes[0].logro)} de logro.`);
    const crit = inst.preguntas.filter((p) => !p.piloto && p.acierto < 0.4);
    h.push(crit.length ? `${plural(crit.length, 'pregunta tiene', 'preguntas tienen')} menos de 40% de acierto (${numeros(crit.slice(0, 8))}${crit.length > 8 ? ' y otras' : ''}): son el punto de partida para la reenseñanza.` : 'Ninguna pregunta quedó bajo 40% de acierto en el conjunto.');
    if (porCurso.length >= 2) {
      const o = porCurso.slice().sort((a, b) => b.A.resumen.media - a.A.resumen.media), d = o[0].A.resumen.media - o[o.length - 1].A.resumen.media, br = (ctxD.brechas || []).length;
      h.push(d >= u.brechaCurso ? `Hay ${Math.round(d * 100)} pp de diferencia entre ${o[0].curso.nombre} y ${o[o.length - 1].curso.nombre}${br ? `, y ${plural(br, 'pregunta muestra', 'preguntas muestran')} 25 pp o más de brecha entre cursos` : ''}.` : `Los cursos tienen resultados parecidos: ${Math.round(d * 100)} pp entre el mejor y el más bajo.`);
    } else {
      const R = inst.resumen;
      if (R.notaMedia != null && R.corregidas) h.push(`${R.corregidas - R.aprobados} de ${R.corregidas} estudiantes quedan bajo la nota ${nt(Estad.conf.escala.aprobacion)}.`);
    }
    return h.slice(0, 3);
  }
  function conclusionesDirectivo(ctxD, ejes, habs) {
    const { porCurso, inst } = ctxD, R = inst.resumen, u = Estad.conf.institucional;
    const fuertes = [...ejes.filter((g) => g.logro >= 0.7).map((g) => `${g.nombre} (${pct(g.logro)})`), ...habs.filter((g) => g.logro >= 0.7).map((g) => `la habilidad ${minus(g.nombre)} (${pct(g.logro)})`)];
    const debiles = [...ejes.filter((g) => g.logro < 0.5).map((g) => `${g.nombre} (${pct(g.logro)})`), ...habs.filter((g) => g.logro < 0.5).map((g) => `la habilidad ${minus(g.nombre)} (${pct(g.logro)})`)];
    const conc = [];
    conc.push(`Resultado global: ${R.puntajeMedia != null ? `${R.puntajeMedia} puntos de puntaje PAES promedio estimado y ` : ''}${pct1(R.media)} de logro promedio${R.notaMedia != null ? ` (nota ${nt(R.notaMedia)})` : ''}, con ${R.corregidas} estudiantes evaluados (${pct(R.participacion)} de participación).`);
    conc.push(fuertes.length ? `Fortalezas: ${lista(fuertes)}.` : ejes.length ? `Ningún eje llega a 70%; el mejor resuelto es ${ejes[0].nombre} (${pct(ejes[0].logro)}).` : 'Sin ejes clasificados.');
    conc.push(debiles.length ? `Dificultades: ${lista(debiles)}.` : ejes.length ? `Ningún eje queda bajo 50%; el más bajo es ${ejes[ejes.length - 1].nombre} (${pct(ejes[ejes.length - 1].logro)}).` : '');
    if (porCurso.length >= 2) {
      const o = porCurso.slice().sort((a, b) => b.A.resumen.media - a.A.resumen.media), d = o[0].A.resumen.media - o[o.length - 1].A.resumen.media;
      conc.push(d >= u.brechaCurso ? `Brecha entre cursos: ${Math.round(d * 100)} pp entre ${o[0].curso.nombre} (${pct(o[0].A.resumen.media)}) y ${o[o.length - 1].curso.nombre} (${pct(o[o.length - 1].A.resumen.media)}).` : `Los cursos tienen resultados parecidos: ${Math.round(d * 100)} pp entre el mejor y el más bajo.`);
    }
    return conc.filter(Boolean);
  }
  function recomendacionesUTP(ctxD, ejes, habs) {
    const { ens, porCurso, inst } = ctxD, R = inst.resumen, u = Estad.conf.institucional, rec = [];
    const e0 = ejes[ejes.length - 1], h0 = habs[habs.length - 1];
    if (e0 && e0.logro < 0.6) { const te = Temarios.eje(ens.asignatura, e0.nombre); rec.push(`${e0.nombre}: coordinar entre los docentes del nivel una unidad de refuerzo${te ? ` centrada en ${lista(te.contenidos.slice(0, 3).map(minus))}` : ''} y medir su avance en el próximo ensayo.`); }
    if (h0 && h0.logro < 0.6) rec.push(`La habilidad ${minus(h0.nombre)}: incluirla de forma explícita en las planificaciones de todas las unidades, no solo en la del eje más bajo.`);
    if (porCurso.length >= 2) {
      const bajos = porCurso.filter((x) => x.A.resumen.media - R.media <= -u.brechaCurso);
      if (bajos.length) rec.push(`Acompañar a ${lista(bajos.map((x) => x.curso.nombre))}: revisar con sus docentes la cobertura curricular y las condiciones de aplicación antes de sacar conclusiones.`);
      const br = ctxD.brechas || [];
      if (br.length) rec.push(`Revisar en reunión de departamento las preguntas con 25 pp o más de diferencia entre cursos (${lista(br.slice(0, 6).map((p) => String(p.n)))}): suelen indicar contenidos que no se trabajaron igual.`);
    }
    if (porCurso.some((x) => x.A.resumen.participacion < u.participacion)) rec.push('Asegurar la participación en el próximo ensayo: con muchas ausencias, los resultados pueden no representar al curso.');
    const crit = inst.preguntas.filter((p) => !p.piloto && p.acierto < 0.4);
    if (crit.length && rec.length < 3) rec.push(`Destinar una clase a reenseñar las preguntas con menos de 40% de acierto (${numeros(crit.slice(0, 6))}), analizando con los estudiantes por qué eligieron cada alternativa.`);
    rec.push('Repetir la medición con un ensayo equivalente en 6 a 8 semanas para verificar si las acciones tuvieron efecto, comparando los mismos ejes.');
    return rec;
  }

  // Preguntas críticas (menor acierto) y, si se pide, la tabla completa de cada pregunta por curso
  function preguntasCriticas(P, ctxD, { completa = false } = {}) {
    const { porCurso, inst } = ctxD, k = porCurso.length;
    if (completa) {
      titulo(P, 'Acierto de cada pregunta por curso', 0, 50);
      const anchoC = Math.max(11, Math.min(17, (W - 12 - 10 - 40 - 16 - 18) / Math.max(1, k)));
      const anchoEje = W - 12 - 10 - anchoC * k - 16 - (k >= 2 ? 18 : 0);
      const cols = [{ titulo: 'N°', ancho: 12, negrita: true }, { titulo: 'Clave', ancho: 10, negrita: false }, { titulo: 'Eje', ancho: anchoEje, negrita: false },
        ...porCurso.map((x) => ({ titulo: x.curso.nombre, ancho: anchoC, der: true, negrita: false })), { titulo: 'Total', ancho: 16, der: true, negrita: true }];
      if (k >= 2) cols.push({ titulo: 'Brecha', ancho: 18, der: true, negrita: false });
      tabla(P, cols, inst.preguntas.map((p) => {
        const vals = porCurso.map((x) => x.A.preguntas[p.i].acierto);
        const br = vals.length >= 2 ? Math.max(...vals) - Math.min(...vals) : 0;
        const celdas = [p.piloto ? `${p.n} (piloto)` : p.n, p.clave, p.eje || '–', ...vals.map((v) => pct(v)), pct(p.acierto)];
        if (k >= 2) celdas.push(`${Math.round(br * 100)} pp`);
        return { resaltar: !p.piloto && p.acierto < 0.4, celdas };
      }), { tam: k > 6 ? 7.6 : 8.4 });
      parrafo(P, `Porcentaje de estudiantes que respondió correctamente cada pregunta. En color, las preguntas con menos de 40% de acierto en el total.${k >= 2 ? ' Brecha: diferencia entre el curso con mayor y menor acierto.' : ''}${inst.preguntas.some((p) => p.piloto) ? ' Las preguntas piloto se muestran, pero no cuentan para el logro.' : ''}`, { color: C.texto2, tam: 8.5 });
    }
    const dif = inst.preguntas.filter((p) => !p.piloto).sort((a, b) => a.acierto - b.acierto).slice(0, 8);
    if (dif.length) {
      titulo(P, 'Preguntas críticas: las de menor acierto', completa ? 5 : 0, 40);
      tabla(P, [{ titulo: 'N°', ancho: 12, negrita: true }, { titulo: 'Eje y habilidad', ancho: W - 12 - 18 - 30 - 34, envolver: true, negrita: false }, { titulo: 'Acierto', ancho: 18, der: true },
        { titulo: 'Más elegida', ancho: 30, der: true, negrita: false }, { titulo: 'En blanco', ancho: 34, der: true, negrita: false }],
      dif.map((p) => ({ resaltar: p.acierto < 0.4, celdas: [p.n, [p.eje, p.habilidad].filter(Boolean).join(' · ') || '–', pct(p.acierto), p.masElegida && p.masElegida !== p.clave ? `${p.masElegida} (clave ${p.clave})` : `la clave ${p.clave}`, pct(p.omision)] })));
      parrafo(P, 'Cuando la alternativa más elegida no es la clave, hay un error compartido que conviene analizar en clases: suele revelar una idea equivocada, no un descuido.', { color: C.texto2, tam: 8.5 });
    }
    if (k >= 2) preguntasBrecha(P, ctxD);
  }
  // Preguntas con 25 pp o más de diferencia entre cursos
  function preguntasBrecha(P, ctxD) {
    const { porCurso, inst } = ctxD, br = (ctxD.brechas || []).slice(0, 10), k = porCurso.length;
    titulo(P, 'Preguntas con mayor brecha entre cursos', 5, 40);
    if (!br.length) { parrafo(P, 'Ninguna pregunta tiene 25 pp o más de diferencia entre cursos: los cursos responden de forma parecida pregunta a pregunta.', { color: C.texto2, tam: 9.5 }); return; }
    const anchoC = Math.max(11, Math.min(17, (W - 12 - 50 - 18) / k));
    tabla(P, [{ titulo: 'N°', ancho: 12, negrita: true }, { titulo: 'Eje', ancho: W - 12 - anchoC * k - 18, envolver: true, negrita: false },
      ...porCurso.map((x) => ({ titulo: x.curso.nombre, ancho: anchoC, der: true, negrita: false })), { titulo: 'Brecha', ancho: 18, der: true, negrita: true }],
    br.map((p) => ({ celdas: [p.n, p.eje || '–', ...p.porCurso.map((v) => pct(v)), `${Math.round(p.brecha * 100)} pp`] })), { tam: k > 6 ? 7.6 : 8.4 });
    parrafo(P, `${plural((ctxD.brechas || []).length, 'pregunta tiene', 'preguntas tienen')} 25 pp o más de diferencia entre el curso con mayor y menor acierto. Una brecha grande en una pregunta suele indicar un contenido que no se trabajó igual en todos los cursos, más que una diferencia entre estudiantes.`, { color: C.texto2, tam: 8.5 });
  }

  function seccionDirectivo(P, ctxD, { sinNota = false, numero = '', tituloBanda = '', conPortada = false, tablaPreguntas = false, antesDelAnexo = null } = {}) {
    const { ens, porCurso, inst } = ctxD, R = inst.resumen, u = Estad.conf.institucional;
    banda(P, numero ? `${numero} ${ens.nombre}` : tituloBanda || 'Resumen para equipo directivo', numero ? `Detalle de ${ctxD.nivel || 'los cursos seleccionados'}` : `${ens.nombre} · ${ctxD.nivel || 'Cursos seleccionados'}`, [tipoEvaluacion(ens), ens.fecha, `generado el ${hoy()}`].filter(Boolean).join(' · '));
    if (!conPortada) {
      titulo(P, 'Información general', 0, 50);
      ficha(P, [
        ['Establecimiento', (ctxD.colegio || {}).nombre || 'Sin nombre (se define en Ajustes)'],
        ['Asignatura', ens.asignatura || '–'],
        ['Nivel', ctxD.nivel || '–'],
        ['Tipo de evaluación', tipoEvaluacion(ens)],
        ['Fecha de aplicación', ens.fecha || 'sin fecha registrada'],
        ['Cursos participantes', `${porCurso.length}: ${lista(porCurso.map((x) => x.curso.nombre))}`],
        ['Estudiantes evaluados', `${R.corregidas} de ${R.total} (${R.ausentes} sin hoja)`],
        ['Participación', pct1(R.participacion)],
      ]);
    }
    avisoDatos(P, ctxD.validacion);
    if (ctxD.validacion && !ctxD.validacion.ok) {
      parrafo(P, 'Hay problemas en los datos que afectan los cálculos. Corrígelos y vuelve a generar el informe: no se muestran estadísticas para no entregar cifras engañosas.', { estilo: 'bold', color: C.critico });
      return;
    }
    const ejes = conDatos(inst.porEje).sort((a, b) => b.logro - a.logro), habs = conDatos(inst.porHabilidad).sort((a, b) => b.logro - a.logro);
    const rec = recomendacionesUTP(ctxD, ejes, habs);
    // Resumen ejecutivo: una página
    titulo(P, 'Resumen ejecutivo', conPortada ? 0 : 4, 60);
    if (!conPortada) cifras(P, cifrasGrupo(inst));
    parrafo(P, resumenTexto(ctxD), { tam: 10.5 });
    titulo(P, 'Hallazgos clave', 4, 30);
    vinetas(P, hallazgos(ctxD, ejes), { tam: 10 });
    titulo(P, 'Prioridades', 4, 30);
    vinetas(P, rec.slice(0, 3).map((t, i) => `${i + 1}. ${t}`), { tam: 10 });
    parrafo(P, 'El detalle de cada punto está en las secciones siguientes; los indicadores estadísticos completos y la metodología, en el anexo técnico.', { color: C.texto2, tam: 8.5 });
    nuevaPagina(P);
    let ns = 1;
    seccion(P, ns++, 'Resultados globales', 90);
    puntajesYNotas(P, ctxD);
    nivelesDesempeno(P, inst, inst.estandares ? [() => {
      titulo(P, 'Estándares de aprendizaje SIMCE (estimados)', 3, 40);
      apiladas(P, [...porCurso.map((x) => ({ nombre: x.curso.nombre, partes: x.A.estandares.map((s) => s.n) })), { nombre: 'Total', partes: inst.estandares.map((s) => s.n), destacado: true }], Estad.ESTANDARES.map((s) => s.nombre));
    }] : []);
    if (porCurso.length >= 2) {
      seccion(P, ns++, 'Comparación entre cursos', 70);
      compararCursos(P, porCurso, inst, { nombreInst: 'Total', partes: 'resumen' });
      if (porCurso.length <= 7) { titulo(P, 'Curvas de distribución por curso', 5, 85); curvasSuperpuestas(P, porCurso); }
    }
    if (ctxD.anterior) { seccion(P, ns++, 'Evolución respecto del ensayo anterior', 60); compararAnterior(P, ctxD); }
    seccion(P, ns++, 'Ejes temáticos, habilidades y contenidos', 60);
    if (ejes.length) { titulo(P, 'Logro por eje temático', 0, ejes.length * 11 + 10); barras(P, ejes.map((g) => ({ nombre: g.nombre, valor: g.logro, color: g.logro < u.ejeBajo ? C.critico : C.serie }))); }
    if (habs.length) { titulo(P, 'Logro por habilidad', 5, habs.length * 11 + 10); barras(P, habs.map((g) => ({ nombre: g.nombre, valor: g.logro, color: g.logro < 0.5 ? C.critico : C.serie }))); }
    if (inst.porContenido.length >= 2) {
      const c = inst.porContenido.slice().sort((a, b) => b.logro - a.logro), k = Math.min(5, Math.floor(c.length / 2));
      titulo(P, 'Contenidos con mayor y menor dominio', 4, 40);
      tabla(P, [{ titulo: 'Mayor dominio', ancho: W / 2 - 14, envolver: true, negrita: false }, { titulo: '%', ancho: 14, der: true }, { titulo: 'Menor dominio', ancho: W / 2 - 14, envolver: true, negrita: false }, { titulo: '%', ancho: 14, der: true }],
        Array.from({ length: k }, (_, i) => ({ celdas: [c[i].nombre, pct(c[i].logro), c[c.length - 1 - i].nombre, pct(c[c.length - 1 - i].logro)] })));
    } else parrafo(P, 'El ensayo no trae el contenido específico de cada pregunta, así que el análisis llega hasta el eje temático. Para ver contenidos, complétalos en la columna E de la plantilla.', { color: C.texto2, tam: 9 });
    if (porCurso.length >= 2) compararCursos(P, porCurso, inst, { nombreInst: 'Total', partes: 'bloques' });
    seccion(P, ns++, porCurso.length >= 2 ? 'Preguntas críticas y brechas entre cursos' : 'Preguntas críticas', 60);
    preguntasCriticas(P, ctxD, { completa: tablaPreguntas });
    const al = alertasInstitucionales(porCurso, inst);
    seccion(P, ns++, 'Alertas y recomendaciones para UTP', 50);
    titulo(P, 'Alertas institucionales', 0, 30);
    vinetas(P, al.length ? al : ['No se activó ninguna alerta con los criterios actuales.'], { tam: 10 });
    parrafo(P, `Criterios (se cambian en Ajustes): curso ${Math.round(u.brechaCurso * 100)} pp o más bajo el promedio; eje bajo ${pct(u.ejeBajo)}; diferencia entre cursos en un eje de ${Math.round(2 * u.brechaCurso * 100)} pp o más; participación bajo ${pct(u.participacion)}; desviación estándar de ${Math.round(u.dispersion * 100)} pp o más; ${pct(u.concentracionBaja)} o más del curso en el nivel Bajo.`, { color: C.texto2, tam: 8.5 });
    titulo(P, 'Conclusiones', 4, 40);
    vinetas(P, conclusionesDirectivo(ctxD, ejes, habs), { tam: 10 });
    titulo(P, 'Recomendaciones para UTP', 4, 40);
    vinetas(P, rec, { tam: 10 });
    if (antesDelAnexo) ns = antesDelAnexo(ns);
    nuevaPagina(P);
    seccion(P, ns++, 'Anexo técnico', 60);
    titulo(P, 'Indicadores estadísticos', 0, 60);
    tablaIndicadores(P, inst);
    if (!sinNota) notaMetodologica(P, { tieneTabla: Estad.tieneTabla(ens), tieneCortes: !!inst.estandares });
    P.siguienteSeccion = ns;
  }

  // Resumen institucional de varios ensayos de un mismo tipo y todos los cursos que los rindieron.
  // bloques: un contexto directivo por cada ensayo y nivel (el mismo de seccionDirectivo).
  function seccionDirectivoConsolidado(P, M2) {
    const { tipo, ensayos: ens, bloques } = M2, u = Estad.conf.institucional;
    const cursos = [...new Map(bloques.flatMap((b) => b.porCurso.map((x) => [x.curso.id, x.curso]))).values()];
    const nivelDe = new Map(bloques.flatMap((b) => b.porCurso.map((x) => [x.curso.id, b.nivel || '–'])));
    cursos.sort((a, b) => (nivelDe.get(a.id) || '').localeCompare(nivelDe.get(b.id) || '') || a.nombre.localeCompare(b.nombre));
    const celda = (e, c) => { for (const b of bloques) if (b.ens.id === e.id) { const x = b.porCurso.find((y) => y.curso.id === c.id); if (x) return x.A; } return null; };
    // Total por ensayo: ponderado por estudiantes evaluados
    const total = (e) => {
      const bs = bloques.filter((b) => b.ens.id === e.id);
      const ev = bs.reduce((s2, b) => s2 + b.inst.resumen.corregidas, 0), lst = bs.reduce((s2, b) => s2 + b.inst.resumen.total, 0);
      return { media: ev ? bs.reduce((s2, b) => s2 + b.inst.resumen.media * b.inst.resumen.corregidas, 0) / ev : null, evaluados: ev, total: lst, cursos: bs.reduce((s2, b) => s2 + b.porCurso.length, 0) };
    };
    const T = ens.map(total);
    const evaluadosTot = T.reduce((s2, t) => s2 + t.evaluados, 0);
    const fechas = ens.map((e) => e.fecha).filter(Boolean);
    banda(P, 'Resumen para equipo directivo', `${tipo} · ${plural(ens.length, 'ensayo', 'ensayos')} · ${plural(cursos.length, 'curso', 'cursos')}`, [fechas.length ? `${fechas[0]}${fechas.length > 1 ? ` al ${fechas[fechas.length - 1]}` : ''}` : '', `generado el ${hoy()}`].filter(Boolean).join(' · '));
    titulo(P, 'Información general', 0, 50);
    const niveles = [...new Set(cursos.map((c) => nivelDe.get(c.id)))];
    ficha(P, [
      ['Establecimiento', (M2.colegio || {}).nombre || 'Sin nombre (se define en Ajustes)'],
      ['Tipo de evaluación', tipo],
      ['Ensayos incluidos', ens.map((e) => `${e.nombre}${e.fecha ? ` (${e.fecha})` : ''}`).join('; ')],
      ['Niveles', lista(niveles)],
      ['Cursos que rindieron', `${cursos.length}: ${lista(cursos.map((c) => c.nombre))}`],
      ['Hojas corregidas', `${evaluadosTot} en total`],
    ]);
    const errores = [...new Set(bloques.flatMap((b) => (b.validacion ? b.validacion.errores : [])))];
    if (errores.length) { avisoDatos(P, { errores, avisos: [] }); }

    // 1. Tabla cursos x ensayos
    seccion(P, 1, 'Resultados por curso y ensayo', 60);
    const maxCols = 6, mostrados = ens.slice(-maxCols);
    if (ens.length > maxCols) parrafo(P, `La tabla muestra los ${maxCols} ensayos más recientes; el promedio considera todos.`, { color: C.texto2, tam: 9 });
    const anchoE = Math.min(22, (W - 62) / (mostrados.length + 1));
    const promCurso = (c) => { const v = ens.map((e) => celda(e, c)).filter(Boolean); return v.length ? v.reduce((s2, A) => s2 + A.resumen.media, 0) / v.length : null; };
    tabla(P, [{ titulo: 'Curso', ancho: W - 32 - anchoE * (mostrados.length + 1), negrita: true, envolver: true }, { titulo: 'Nivel', ancho: 32, negrita: false, envolver: true },
      ...mostrados.map((e, i) => ({ titulo: `E${ens.length - mostrados.length + i + 1}`, ancho: anchoE, der: true, negrita: false })), { titulo: 'Prom.', ancho: anchoE, der: true, negrita: true }],
    [...cursos.map((c) => {
      const pc = promCurso(c), g = T.reduce((s2, t) => s2 + (t.media || 0) * t.evaluados, 0) / (evaluadosTot || 1);
      return { resaltar: pc != null && g - pc >= u.brechaCurso, celdas: [c.nombre, nivelDe.get(c.id), ...mostrados.map((e) => { const A = celda(e, c); return A ? pct(A.resumen.media) : '–'; }), pc == null ? '–' : pct(pc)] };
    }), { celdas: ['Total', '', ...mostrados.map((e) => { const t = T[ens.indexOf(e)]; return t.media == null ? '–' : pct(t.media); }), pct(T.reduce((s2, t) => s2 + (t.media || 0) * t.evaluados, 0) / (evaluadosTot || 1))] }]);
    vinetas(P, mostrados.map((e, i) => `E${ens.length - mostrados.length + i + 1}: ${e.nombre}${e.fecha ? ` (${e.fecha})` : ''}`), { tam: 8.5 });
    parrafo(P, `Logro promedio de cada curso. Total: promedio de todos los estudiantes evaluados. En color, los cursos ${Math.round(u.brechaCurso * 100)} pp o más bajo el total.`, { color: C.texto2, tam: 8.5 });
    // Puntaje PAES promedio por curso y ensayo (solo ensayos con tabla de conversión)
    const conTabla = mostrados.filter((e) => Estad.tieneTabla(e));
    if (conTabla.length) {
      const ptsTot = (e) => { const xs = bloques.filter((b) => b.ens.id === e.id).flatMap((b) => b.inst.hechas.map((y) => y.puntaje)).filter((v) => v != null); return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null; };
      titulo(P, 'Puntaje PAES promedio por curso y ensayo', 5, 40);
      tabla(P, [{ titulo: 'Curso', ancho: W - 32 - anchoE * conTabla.length, negrita: true, envolver: true }, { titulo: 'Nivel', ancho: 32, negrita: false, envolver: true },
        ...conTabla.map((e) => ({ titulo: `E${ens.indexOf(e) + 1}`, ancho: anchoE, der: true, negrita: false }))],
      [...cursos.map((c) => ({ celdas: [c.nombre, nivelDe.get(c.id), ...conTabla.map((e) => { const A = celda(e, c); return A && A.resumen.puntajeMedia != null ? A.resumen.puntajeMedia : '–'; })] })),
        { celdas: ['Total', '', ...conTabla.map((e) => ptsTot(e) ?? '–')] }]);
      parrafo(P, 'Puntaje PAES estimado con la tabla de conversión de cada ensayo; no es un puntaje oficial del DEMRE.', { color: C.texto2, tam: 8.5 });
    }

    // 2. Participación por ensayo
    titulo(P, 'Participación por ensayo', 5, 40);
    tabla(P, [{ titulo: 'Ensayo', ancho: W - 98, envolver: true, negrita: true }, { titulo: 'Cursos', ancho: 18, der: true }, { titulo: 'Evaluados', ancho: 24, der: true }, { titulo: 'Particip.', ancho: 26, der: true }, { titulo: 'Logro', ancho: 30, der: true }],
      ens.map((e, i) => ({ resaltar: T[i].total && T[i].evaluados / T[i].total < u.participacion, celdas: [e.nombre, T[i].cursos, `${T[i].evaluados} de ${T[i].total}`, T[i].total ? pct(T[i].evaluados / T[i].total) : '–', T[i].media == null ? '–' : pct(T[i].media)] })));

    // Curva del ensayo más reciente, por nivel
    const ultimos = bloques.filter((b) => b.ens.id === ens[ens.length - 1].id).slice(0, 3);
    ultimos.forEach((b) => { titulo(P, `Distribución en ${b.ens.nombre}${ultimos.length > 1 || b.nivel ? ` · ${b.nivel || ''}` : ''}`, 5, 90); curvaGrupo(P, b.inst); });
    // 3. Evolución
    let ns = 2;
    if (ens.length >= 2) {
      seccion(P, ns++, 'Evolución', 70);
      const series = niveles.map((nv, k) => ({ nombre: nv, color: C.cat[(k + 1) % C.cat.length], unir: true, valores: ens.map((e) => {
        const b = bloques.find((x) => x.ens.id === e.id && (x.nivel || '–') === nv); return b ? b.inst.resumen.media : null; }) }));
      lineas(P, [{ nombre: 'Total', color: C.azul, grueso: true, unir: true, valores: T.map((t) => t.media) }, ...(niveles.length > 1 ? series : [])], ens.map((e, i) => `E${i + 1}`), { alto: 42 });
      const a = T[0].media, z = T[T.length - 1].media;
      if (a != null && z != null) parrafo(P, `${Math.abs(z - a) < 0.03 ? `El logro total se mantuvo estable entre el primer y el último ensayo (${pct(a)} y ${pct(z)}).` : `El logro total ${z > a ? 'subió' : 'bajó'} de ${pct(a)} a ${pct(z)} entre el primer y el último ensayo.`} Los ensayos no tienen necesariamente la misma dificultad: la tendencia es más confiable que una diferencia aislada.`, { tam: 10 });
      const cambios = cursos.map((c) => { const v = ens.map((e) => celda(e, c)).filter(Boolean); return v.length >= 2 ? { c, d: v[v.length - 1].resumen.media - v[0].resumen.media } : null; }).filter(Boolean);
      const suben = cambios.filter((x) => x.d >= 0.05).sort((p1, p2) => p2.d - p1.d), bajan = cambios.filter((x) => x.d <= -0.05).sort((p1, p2) => p1.d - p2.d);
      const tx = [];
      if (suben.length) tx.push(`Mejoran: ${lista(suben.slice(0, 5).map((x) => `${x.c.nombre} (+${Math.round(x.d * 100)} pp)`))}.`);
      if (bajan.length) tx.push(`Bajan: ${lista(bajan.slice(0, 5).map((x) => `${x.c.nombre} (${Math.round(x.d * 100)} pp)`))}.`);
      if (tx.length) vinetas(P, tx, { tam: 10 });
    }

    // 4. Ejes considerando todos los ensayos
    const ejes = new Map();
    bloques.forEach((b) => conDatos(b.inst.porEje).forEach((g) => {
      const w = g.preguntas * b.inst.resumen.corregidas, o = ejes.get(g.nombre) || { nombre: g.nombre, suma: 0, peso: 0 };
      o.suma += g.logro * w; o.peso += w; ejes.set(g.nombre, o);
    }));
    const ej = [...ejes.values()].filter((o) => o.peso).map((o) => ({ nombre: o.nombre, logro: o.suma / o.peso })).sort((a, b) => b.logro - a.logro);
    if (ej.length) {
      seccion(P, ns++, 'Ejes temáticos en todos los ensayos', ej.length * 11 + 20);
      barras(P, ej.map((g) => ({ nombre: g.nombre, valor: g.logro, color: g.logro < u.ejeBajo ? C.critico : C.serie })));
    }

    // 5. Alertas y prioridades
    seccion(P, ns++, 'Alertas y prioridades', 50);
    const al = [];
    const gTot = T.reduce((s2, t) => s2 + (t.media || 0) * t.evaluados, 0) / (evaluadosTot || 1);
    cursos.forEach((c) => {
      const v = ens.map((e) => { const A = celda(e, c), t = T[ens.indexOf(e)]; return A && t.media != null ? A.resumen.media - t.media : null; }).filter((d) => d != null);
      const bajo = v.filter((d) => d <= -u.brechaCurso).length;
      if (v.length && bajo >= Math.ceil(v.length / 2)) al.push(`${c.nombre} queda ${Math.round(u.brechaCurso * 100)} pp o más bajo el total en ${bajo} de ${plural(v.length, 'ensayo', 'ensayos')}: conviene acompañar al curso y revisar su cobertura curricular.`);
    });
    ej.filter((g) => g.logro < u.ejeBajo).forEach((g) => al.push(`${g.nombre} tiene ${pct(g.logro)} de logro considerando todos los ensayos: es una prioridad a nivel de departamento.`));
    ens.forEach((e, i) => { if (T[i].total && T[i].evaluados / T[i].total < u.participacion) al.push(`Participación baja en ${e.nombre} (${pct(T[i].evaluados / T[i].total)}): los resultados pueden no representar a todos los cursos.`); });
    vinetas(P, al.length ? al : ['No se activó ninguna alerta con los criterios actuales.'], { tam: 10 });
    const rec = [];
    const peor = ej[ej.length - 1];
    if (peor && peor.logro < 0.6) rec.push(`Prioridad institucional: ${peor.nombre}. Coordinar una unidad de refuerzo común en los niveles que rinden ${tipo}.`);
    rec.push(`Logro promedio considerando todos los ensayos: ${pct1(gTot)}, con ${evaluadosTot} hojas corregidas.`);
    if (M2.detalle) rec.push('El detalle de cada ensayo, con sus indicadores, comparación entre cursos y alertas, sigue en las páginas siguientes.');
    titulo(P, 'Síntesis', 4, 30);
    vinetas(P, rec, { tam: 10 });
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
  // Lectura pedagógica de un grupo consolidado (una asignatura), con voz de docente.
  // Destaca primero lo logrado con datos concretos y plantea lo por mejorar como el paso siguiente.
  // modo: 'estudiante' (le habla al estudiante) o 'apoderado' (habla del estudiante por su nombre).
  function lecturaDocente(g, est, modo) {
    const tu = modo === 'estudiante', pila = nombrePila(est.nombre);
    const V = (a, b) => (tu ? a : b);
    const ens = g.ensayos[g.ensayos.length - 1].ens;
    const conCurso = Math.min(...g.ensayos.map((e) => e.A.hechas.length)) >= 5;
    const todas = g.ensayos.flatMap((e) => e.preguntas.map((p) => ({ p, e, ok: !!e.x.aciertos[p.i], blanco: !e.x.r[p.i] })));
    const ejes = conDatos(g.porEje).map((o) => {
      const qs = todas.filter((t) => (t.p.eje || 'Sin dato') === o.nombre);
      const v = o.serie.filter((z) => z != null);
      return { ...o, curso: qs.length ? qs.reduce((s2, t) => s2 + t.p.acierto, 0) / qs.length : null, primero: v[0], ultimo: v[v.length - 1], avance: v.length >= 2 ? v[v.length - 1] - v[0] : 0 };
    });
    const habs = conDatos(g.porHabilidad);
    const desc = (o) => { const th = Temarios.habilidad(ens.asignatura, o.nombre); return th ? th.descripcion : null; };
    const temas = (o, n = 3) => {
      const propios = [...new Set(todas.filter((t) => (t.p.eje || 'Sin dato') === o.nombre && !t.ok && t.p.contenido).map((t) => t.p.contenido))];
      const te = Temarios.eje(ens.asignatura, o.nombre);
      return (propios.length ? propios : te ? te.contenidos : []).slice(0, n).map(minus);
    };
    const de = (o) => `${o.correctas} de ${o.preguntas}`;
    // El verbo acompaña al nivel real: no se dice "domina" con 60%
    const verbo = (l) => (l >= 0.85 ? V('Dominas', 'Domina') : l >= 0.7 ? V('Manejas bien', 'Maneja bien') : V('Tienes un buen desempeño en', 'Tiene un buen desempeño en'));

    // ---- Lo logrado: cada hallazgo tiene una versión para la lista y otra breve para el comentario ----
    const bueno = [], cortos = [], usados = new Set();
    const firmes = ejes.filter((o) => o.logro >= 0.6).sort((a, b) => b.logro - a.logro);
    firmes.slice(0, 2).forEach((o, i) => {
      usados.add(o.nombre);
      const sobre = conCurso && o.curso != null && o.logro - o.curso >= 0.08;
      const siempre = g.cantidad > 1 && g.fortalezas.some((f) => f.nombre === o.nombre);
      bueno.push(`${verbo(o.logro)} ${o.nombre}: ${V('respondiste', 'respondió')} bien ${de(o)} preguntas (${pct(o.logro)})${sobre ? `, cuando el curso logró ${pct(o.curso)} en esas mismas preguntas` : ''}${siempre ? `. Además, ${V('has mantenido', 'ha mantenido')} ese nivel en todos los ensayos` : ''}.`);
      if (i === 0) cortos.push(`${V('tu', 'su')} mejor resultado está en ${o.nombre}, con ${de(o)} respuestas correctas${sobre ? `, ${o.logro - o.curso >= 0.2 ? 'muy ' : ''}por sobre el curso` : ''}${siempre ? ' y de manera constante en todos los ensayos' : ''}`);
      else cortos.push(o.logro >= 0.7 ? `${V('respondes', 'responde')} con seguridad en ${o.nombre} (${pct(o.logro)})` : `${V('te va', 'le va')} bien en ${o.nombre} (${pct(o.logro)})`);
    });
    if (!firmes.length && ejes.length) {
      const m = ejes.slice().sort((a, b) => b.logro - a.logro)[0];
      usados.add(m.nombre);
      const igual = conCurso && m.curso != null && m.logro >= m.curso;
      bueno.push(`${V('Tu', 'Su')} punto más firme es ${m.nombre}, con ${de(m)} respuestas correctas${igual ? `, igual o mejor que el curso en esas preguntas (${pct(m.curso)})` : ''}. Es un buen punto de apoyo para avanzar.`);
      cortos.push(`${V('tu', 'su')} punto más firme es ${m.nombre}, donde ${V('lograste', 'logró')} ${de(m)} respuestas correctas`);
    }
    if (conCurso) {
      const dif = todas.filter((t) => t.ok && t.p.acierto < 0.4);
      if (dif.length) {
        const ejesDif = [...new Set(dif.map((t) => t.p.eje).filter(Boolean))];
        bueno.push(`${V('Resolviste', 'Resolvió')} ${dif.length === 1 ? 'una pregunta' : `${dif.length} preguntas`} que menos del 40% del curso logró responder${ejesDif.length ? ` (${lista(ejesDif.slice(0, 3))})` : ''}. Eso muestra que ${V('puedes', 'puede')} enfrentar problemas exigentes.`);
        cortos.push(`${V('resolviste', 'resolvió')} ${dif.length === 1 ? 'una pregunta que' : `${dif.length} preguntas que`} la mayoría del curso no logró`);
      }
    }
    const sube = ejes.filter((o) => o.avance >= 0.15).sort((a, b) => b.avance - a.avance)[0];
    if (sube) {
      bueno.push(`En ${sube.nombre} se nota ${V('tu', 'su')} avance: ${V('pasaste', 'pasó')} de ${pct(sube.primero)} a ${pct(sube.ultimo)} entre el primer y el último ensayo.`);
      cortos.push(`en ${sube.nombre} ${V('pasaste', 'pasó')} de ${pct(sube.primero)} a ${pct(sube.ultimo)}`);
    } else if (g.cambio != null && g.cambio >= 0.05) {
      const e0 = g.ensayos[0].logro, e1 = g.ensayos[g.cantidad - 1].logro;
      bueno.push(`${V('Tu', 'Su')} resultado global subió de ${pct(e0)} a ${pct(e1)} entre el primer y el último ensayo: el trabajo se está notando.`);
      cortos.push(`${V('tu', 'su')} resultado global subió de ${pct(e0)} a ${pct(e1)}`);
    }
    const hb = habs.filter((o) => o.logro >= 0.65).sort((a, b) => b.logro - a.logro)[0];
    if (hb) {
      const d = desc(hb);
      bueno.push(`En la habilidad de ${minus(hb.nombre)} ${V('acertaste', 'acertó')} ${de(hb)} preguntas${d ? `: ${V('sabes', 'sabe')} ${d}` : ''}.`);
      if (d) cortos.push(`${V('muestras', 'muestra')} facilidad para ${d.split(':')[0]}`);
    }
    if (g.omisiones === 0) {
      bueno.push(`${V('Respondiste', 'Respondió')} todas las preguntas, sin dejar ninguna en blanco: ${V('te atreves', 'se atreve')} a intentarlo, y eso es parte de aprender.`);
      cortos.push(`no ${V('dejaste', 'dejó')} ninguna pregunta en blanco`);
    }
    if (bueno.length < 2) bueno.push(`${V('Lograste', 'Logró')} ${g.correctas} respuestas correctas de ${g.preguntas}. Cada una corresponde a un contenido que ${V('ya manejas', 'ya maneja')} y que sirve de base para lo que viene.`);

    // ---- El paso siguiente: pocos focos, en tono de oportunidad ----
    const mejorar = [];
    let detalle = null;
    const focos = ejes.filter((o) => o.logro < 0.6 && !usados.has(o.nombre)).sort((a, b) => a.logro - b.logro).slice(0, 2);
    focos.forEach((o, i) => {
      const t = temas(o);
      mejorar.push(i === 0
        ? `${o.nombre} es ${V('tu', 'su')} mayor oportunidad de crecer (${de(o)} correctas). ${t.length ? `Conviene afianzar ${lista(t)}` : 'Conviene reforzar sus ejercicios base'}, partiendo por ejercicios sencillos y subiendo la dificultad de a poco.`
        : `También ${V('puedes', 'puede')} sumar puntos en ${o.nombre} (${de(o)} correctas)${t.length ? `, en especial en ${lista(t.slice(0, 2))}` : ''}.`);
    });
    const hd = habs.filter((o) => o.logro < 0.5).sort((a, b) => a.logro - b.logro)[0];
    if (hd) { const d = desc(hd); mejorar.push(`La habilidad de ${minus(hd.nombre)} ${V('te', 'le')} cuesta un poco más (${de(hd)})${d ? `. Ejercitar la capacidad de ${d} ${V('te', 'le')} servirá en todas las temáticas` : ''}.`); }
    if (conCurso) {
      const fac = todas.filter((t) => !t.ok && !t.blanco && t.p.acierto >= 0.75);
      if (fac.length) {
        const uno = fac.length === 1;
        mejorar.push(`${uno ? 'Hay una pregunta que estaba' : `Hay ${fac.length} preguntas que estaban`} a ${V('tu', 'su')} alcance y no ${uno ? 'salió' : 'salieron'} (${fac.slice(0, 5).map((t) => `N° ${t.p.n}${g.cantidad > 1 ? ` del ${etiquetaEns(t.e.ens)}` : ''}`).join(', ')}${fac.length > 5 ? ', entre otras' : ''}). ${uno ? 'Probablemente fue un descuido' : 'Probablemente fueron descuidos'}: leer con calma el enunciado y revisar antes de marcar puede hacer la diferencia.`);
        detalle = V('cuidar los detalles: algunas preguntas que estaban a tu alcance no salieron, y leer con calma antes de marcar te sumaría puntos fácilmente', 'cuidar los detalles: algunas preguntas que estaban a su alcance no salieron, y leer con calma antes de marcar le sumaría puntos fácilmente');
      }
    }
    const cansancio = g.ensayos.some((e) => {
      const v = e.preguntas; if (v.length < 12) return false;
      const m = Math.floor(v.length / 2), a = v.slice(0, m).filter((p) => e.x.aciertos[p.i]).length / m, b = v.slice(m).filter((p) => e.x.aciertos[p.i]).length / (v.length - m);
      return a - b >= 0.25;
    });
    if (cansancio) {
      mejorar.push(`${V('Te fue', 'Le fue')} mejor en la primera mitad de la prueba que en la segunda. Practicar con tiempo controlado ${V('te', 'le')} ayudará a mantener la concentración hasta el final.`);
      detalle = detalle || V('mantener la concentración hasta el final de la prueba, porque en la segunda mitad bajó tu rendimiento', 'mantener la concentración hasta el final de la prueba, porque en la segunda mitad bajó su rendimiento');
    } else if (g.omisiones / g.preguntas > 0.08) {
      mejorar.push(`${V('Dejaste', 'Dejó')} ${g.omisiones} preguntas en blanco. Una respuesta en blanco nunca suma: vale la pena ${V('atreverte', 'atreverse')} a descartar alternativas y responder.`);
      detalle = detalle || V('atreverte a responder todas las preguntas, porque una en blanco nunca suma', 'atreverse a responder todas las preguntas, porque una en blanco nunca suma');
    }
    if (!mejorar.length) mejorar.push(`No hay temáticas bajo lo esperado. El desafío ahora es ${V('ponerte', 'ponerse')} a prueba con problemas más exigentes para seguir creciendo.`);

    // ---- Comentario en prosa: reconoce, orienta y alienta ----
    const p0 = focos[0], meta = Math.min(1, g.logro + 0.07);
    const apertura = g.logro >= 0.75 ? V(`${pila}, tu trabajo en ${g.nombre} es muy bueno y se nota.`, `${pila} tiene un desempeño muy bueno en ${g.nombre}, y es justo reconocerlo.`)
      : g.logro >= 0.5 ? V(`${pila}, en ${g.nombre} hay logros concretos que quiero destacar.`, `${pila} muestra logros concretos en ${g.nombre} que vale la pena destacar.`)
        : V(`${pila}, en ${g.nombre} ya hay avances sobre los cuales seguir construyendo.`, `${pila} ya tiene en ${g.nombre} avances sobre los cuales seguir construyendo.`);
    const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    const elegidos = cortos.slice(0, 3);
    const frases = [apertura];
    if (elegidos.length) frases.push(`${cap(elegidos[0])}${elegidos.length > 1 ? `. Además, ${lista(elegidos.slice(1))}` : ''}.`);
    if (p0) {
      const t = temas(p0, 2);
      frases.push(V(`Para seguir avanzando, te propongo poner el foco en ${p0.nombre}${t.length ? `, sobre todo en ${lista(t)}` : ''}. Con práctica constante ahí, tu resultado puede pasar de ${pct(g.logro)} a ${pct(meta)} o más en el próximo ensayo.`,
        `Para seguir avanzando, el foco está en ${p0.nombre}${t.length ? `, sobre todo en ${lista(t)}` : ''}. Con práctica constante, su resultado puede pasar de ${pct(g.logro)} a ${pct(meta)} o más en el próximo ensayo.`));
      if (detalle) frases.push(V(`También te ayudará ${detalle}.`, `También le ayudará ${detalle}.`));
    } else if (detalle) {
      frases.push(V(`Para llegar aún más alto, solo te pediría ${detalle}.`, `Para llegar aún más alto, lo único que sugeriría es ${detalle}.`));
    } else {
      frases.push(V('El siguiente paso es desafiarte con preguntas más difíciles para consolidar lo que ya sabes.', 'El siguiente paso es que se desafíe con preguntas más difíciles para consolidar lo que ya sabe.'));
    }
    frases.push(V(g.logro >= 0.75 ? 'Sigue así.' : 'Confío en lo que puedes lograr.', 'Con el apoyo de la familia y del colegio, puede seguir progresando.'));
    return { bueno: bueno.slice(0, 5), mejorar: mejorar.slice(0, 4), comentario: frases.join(' ') };
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

  // Portada del informe individual: franja azul con el logo de la hoja, nombre del estudiante y resumen
  // Portada común: franja azul con textura de burbujas, el colegio (si está en Ajustes), etiqueta, título y subtítulos.
  // Devuelve la altura de la franja; el contenido de abajo lo pone cada informe.
  function franjaPortada(P, col, { etiqueta, titulo: tit, sub, linea }) {
    const { doc } = P;
    const alto = 168, mezcla = (a, b, t) => { const h2 = (x) => parseInt(x, 16); const c = [1, 3, 5].map((k) => Math.round(h2(a.substr(k, 2)) + (h2(b.substr(k, 2)) - h2(a.substr(k, 2))) * t)); return c; };
    for (let i = 0; i < 60; i++) { const [r, g, b] = mezcla('#14336A', '#2C5DB3', i / 59); doc.setFillColor(r, g, b); doc.rect(0, (alto / 60) * i, ANCHO, alto / 60 + 0.3, 'F'); }
    const llenas = new Set([2, 9, 11, 17, 22, 26, 31, 37, 40, 46]);
    doc.setDrawColor('#5B82C9'); doc.setLineWidth(0.6);
    for (let f = 0; f < 7; f++) for (let k = 0; k < 7; k++) {
      const x = ANCHO - 70 + k * 10, y = 70 + f * 10, i = f * 7 + k;
      if (llenas.has(i)) { doc.setFillColor('#5B82C9'); doc.circle(x, y, 3, 'F'); } else doc.circle(x, y, 3, 'S');
    }
    // Encabezado: solo los datos del colegio
    if (col.nombre) { fuente(doc, 11, 'bold', '#FFFFFF'); doc.text(doc.splitTextToSize(col.nombre, W - 50)[0], M, 28); }
    if (col.responsable) { fuente(doc, 9, 'normal', '#C9D6F0'); doc.text(doc.splitTextToSize(col.responsable, W - 50)[0], M, 34); }
    if (col.logo && col.logo.src) {
      const lado = 26, k = Math.min(lado / col.logo.w, lado / col.logo.h), w = col.logo.w * k, h = col.logo.h * k;
      doc.setFillColor('#FFFFFF'); doc.roundedRect(ANCHO - M - lado - 4, 17, lado + 4, lado + 4, 3, 3, 'F');
      try { doc.addImage(col.logo.src, 'JPEG', ANCHO - M - lado - 2 + (lado - w) / 2, 19 + (lado - h) / 2, w, h); } catch (e) { /* logo ilegible */ }
    }
    fuente(doc, 11, 'bold', '#9DB8EC'); doc.text(etiqueta, M, 92);
    doc.setDrawColor('#9DB8EC'); doc.setLineWidth(0.8); doc.line(M, 96, M + 24, 96);
    // El título no debe tocar la textura de burbujas de la derecha
    const anchoT = ANCHO - 82 - M;
    let tam = 30; fuente(doc, tam, 'bold', '#FFFFFF');
    while (tam > 18 && doc.getTextWidth(tit) > anchoT) { tam -= 1; doc.setFontSize(tam); }
    const nom = doc.splitTextToSize(tit, anchoT);
    nom.slice(0, 2).forEach((l, i) => doc.text(l, M, 112 + i * tam * 0.42));
    const yy = 112 + Math.min(2, nom.length) * tam * 0.42 + 4;
    if (sub) { fuente(doc, 13, 'normal', '#E3ECFB'); doc.text(doc.splitTextToSize(sub, anchoT)[0], M, yy); }
    if (linea) { fuente(doc, 11, 'normal', '#C9D6F0'); doc.text(doc.splitTextToSize(linea, anchoT)[0] || '', M, yy + 8); }
    return alto;
  }
  function cierrePortada(P, nota) {
    const { doc } = P;
    if (nota) { fuente(doc, 8.5, 'normal', C.texto2); doc.text(doc.splitTextToSize(nota, W)[0], M, ALTO - M); }
    P.sinPie = P.sinPie || new Set(); P.sinPie.add(doc.getNumberOfPages());
    doc.addPage(); P.y = M;
  }
  // Cifras de la portada de un grupo (curso, nivel o todos los cursos): el puntaje primero, si el ensayo tiene tabla
  function cifrasGrupo(A) {
    const R = A.resumen, out = [];
    if (R.puntajeMedia != null) out.push({ etiqueta: 'Puntaje promedio', valor: String(R.puntajeMedia), detalle: `mín. ${R.puntajeMin} · máx. ${R.puntajeMax}` });
    out.push({ etiqueta: 'Logro promedio', valor: pct(R.media), detalle: `${dec1(R.dCorrectas.media)} de ${A.n} correctas` });
    if (R.notaMedia != null) out.push({ etiqueta: 'Nota promedio', valor: nt(R.notaMedia), detalle: `${R.aprobados} de ${R.corregidas} con nota ${nt(Estad.conf.escala.aprobacion)} o más` });
    if (R.adecuado != null && out.length < 4) out.push({ etiqueta: 'Nivel Adecuado', valor: pct(R.adecuado), detalle: 'estándar SIMCE estimado' });
    if (out.length < 4) out.push({ etiqueta: 'Evaluados', valor: `${R.corregidas}/${R.total}`, detalle: `${pct(R.participacion)} de participación` });
    return out.slice(0, 4);
  }
  function portadaGrupo(P, { colegio, etiqueta, titulo: tit, sub, linea, A, filas, nota }) {
    const col = colegio || {};
    const alto = franjaPortada(P, col, { etiqueta, titulo: tit, sub, linea });
    P.y = alto + 14;
    if (A && A.hechas.length) cifras(P, cifrasGrupo(A));
    ficha(P, [...filas, ['Responsable', col.responsable || ''], ['Fecha de emisión', hoy()]], 46);
    cierrePortada(P, nota);
  }

  function portadaEstudiante(P, ctxS, modo) {
    const { doc } = P, { cur, est, sel } = ctxS, col = ctxS.colegio || {};
    const asigs = [...new Set(sel.map((x) => Estad.grupoEnsayo(x.ens)))];
    const alto = franjaPortada(P, col, { etiqueta: modo === 'apoderado' ? 'INFORME PARA LA FAMILIA' : 'INFORME PERSONAL DE RESULTADOS', titulo: nombreCompleto(est.nombre), sub: `${cur.nombre}${est.lista ? ` · N° de lista ${est.lista}` : ''}`, linea: lista(asigs) });
    // Resumen bajo la franja
    P.y = alto + 14;
    const C2 = Estad.consolidar(est.id, sel, ctxS.ejes);
    if (C2.length === 1 && C2[0].cantidad === 1 && !ctxS.ejes) {
      // Un solo ensayo: puntaje, logro y nota en la portada
      const g = C2[0], x = g.ensayos[0].x, t = [];
      if (x.puntaje != null) t.push({ etiqueta: 'Puntaje PAES (est.)', valor: String(x.puntaje), detalle: g.nombre });
      t.push({ etiqueta: 'Logro', valor: pct(g.logro), detalle: `${g.correctas} de ${g.preguntas} correctas` });
      if (x.nota != null) t.push({ etiqueta: 'Nota', valor: nt(x.nota), detalle: `aprobación con ${nt(Estad.conf.escala.aprobacion)}` });
      if (t.length < 4) t.push({ etiqueta: 'En blanco', valor: String(g.omisiones), detalle: 'sin responder' });
      cifras(P, t);
    } else if (C2.length) cifras(P, C2.slice(0, 4).map((g) => ({ etiqueta: g.nombre, valor: pct(g.logro), detalle: `${g.correctas} de ${g.preguntas} correctas · ${plural(g.cantidad, 'ensayo', 'ensayos')}` })));
    ficha(P, [
      ['Período evaluado', periodoTexto(sel)],
      ['Ensayos considerados', sel.map((x) => `${x.ens.nombre}${x.ens.fecha ? ` (${x.ens.fecha})` : ''}`).join('; ')],
      ['Temáticas', ctxS.ejes ? lista(ctxS.ejes) : 'Todas las de los ensayos'],
      ['Responsable', col.responsable || ''],
      ['Fecha de emisión', hoy()],
    ], 46);
    cierrePortada(P, modo === 'apoderado' ? 'Documento para la familia. No incluye rankings ni comparaciones con otros estudiantes.' : 'Documento personal. Los porcentajes vienen de ensayos y sirven para orientar el estudio.');
  }

  // Plan de 4 semanas a partir de las temáticas, contenidos y habilidades por reforzar
  function planSemanal(g, ens, pm, revisar) {
    const p = pm.prioridades, f = [];
    const conts = (eje) => { const te = Temarios.eje(ens.asignatura, eje); return te ? te.contenidos.slice(0, 2).map(minus) : []; };
    if (p[0]) f.push(['Semana 1', p[0].nombre, `Repasa ${lista(pm.contenidos.slice(0, 2).map(minus)) || lista(conts(p[0].nombre)) || 'los contenidos de esta temática'} con tus apuntes y resuelve 8 a 10 ejercicios. Revisa el desarrollo de cada uno, no solo el resultado.`]);
    if (p[1]) f.push(['Semana 2', p[1].nombre, `Resuelve ejercicios de ${p[1].nombre}${conts(p[1].nombre).length ? ` (${lista(conts(p[1].nombre))})` : ''}, de menor a mayor dificultad. Marca los que te costaron para preguntarlos en clases.`]);
    else if (pm.habsD[0]) f.push(['Semana 2', pm.habsD[0].nombre, `Practica la habilidad ${minus(pm.habsD[0].nombre)}: en cada ejercicio, explica por escrito cómo llegaste a la respuesta.`]);
    else if (p[0]) f.push(['Semana 2', p[0].nombre, 'Sigue con la misma temática, ahora con ejercicios tipo ensayo y tiempo controlado.']);
    f.push([`Semana ${f.length + 1}`, 'Preguntas del ensayo', revisar ? 'Vuelve a resolver las preguntas que fallaste sin mirar la clave. Después compara y anota qué te hizo equivocarte.' : 'Resuelve las preguntas más difíciles del ensayo otra vez y explica a alguien cómo las resolviste.']);
    f.push([`Semana ${f.length + 1}`, 'Ensayo de práctica', `Haz un ensayo o mini ensayo con tiempo controlado${g.omisiones >= 3 ? ', sin dejar preguntas en blanco' : ''}, y compara con tu resultado de hoy (${pct(g.logro)}).`]);
    return f.slice(0, 4);
  }

  function seccionEstudiante(P, ctxS) {
    const { cur, est, sel } = ctxS, pila = nombrePila(est.nombre);
    const C2 = Estad.consolidar(est.id, sel, ctxS.ejes);
    banda(P, nombreCompleto(est.nombre), `Informe personal de resultados · ${cur.nombre}`, [`Período: ${periodoTexto(sel)}`, `${plural(sel.length, 'ensayo', 'ensayos')}`, `generado el ${hoy()}`].join(' · '));
    if (!ctxS.conPortada) titulo(P, 'Ficha personal', 0, 40);
    if (!ctxS.conPortada) ficha(P, [['Nombre', nombreCompleto(est.nombre)], ['Curso', cur.nombre], ['Período evaluado', periodoTexto(sel)],
      ['Ensayos considerados', sel.map((s) => `${s.ens.nombre}${s.ens.fecha ? ` (${s.ens.fecha})` : ''}`).join('; ')],
      ['Temáticas', ctxS.ejes ? lista(ctxS.ejes) : 'Todas las de los ensayos']]);
    if (!C2.length) { parrafo(P, 'No hay respuestas para las temáticas y ensayos elegidos.', { color: C.critico }); return; }
    if (C2.length > 1) parrafo(P, `Los ensayos son de ${C2.length} instrumentos distintos (${lista(C2.map((g) => g.nombre))}). Cada uno se informa por separado, con su propia escala.`, { color: C.texto2, tam: 9.5 });
    C2.forEach((g, gi) => {
      const ult = g.ensayos[g.ensayos.length - 1], ens = ult.ens, x = ult.x, A = ult.A;
      if (gi) nuevaPagina(P);
      seccion(P, gi + 1, C2.length > 1 ? g.nombre : `Tu resultado en ${g.nombre}`, 70);
      const tarjetas = g.cantidad === 1
        ? [...(x.puntaje != null && !ctxS.ejes ? [{ etiqueta: 'Puntaje PAES (est.)', valor: String(x.puntaje), detalle: 'con la tabla del ensayo' }] : []),
          { etiqueta: 'Logro', valor: pct(g.logro), detalle: `${g.correctas} de ${g.preguntas} correctas` },
          ...(x.nota != null && !ctxS.ejes ? [{ etiqueta: 'Nota', valor: nt(x.nota), detalle: `exigencia ${pct(Estad.conf.escala.exigencia)}` }] : []),
          { etiqueta: 'En blanco', valor: String(g.omisiones), detalle: 'sin responder' }]
        : [{ etiqueta: 'Resultado global', valor: pct(g.logro), detalle: `${g.correctas} de ${g.preguntas} correctas` },
          { etiqueta: 'Ensayos', valor: String(g.cantidad), detalle: `${g.preguntas} preguntas en total` },
          { etiqueta: 'Último ensayo', valor: pct(ult.logro), detalle: x.puntaje != null && !ctxS.ejes ? `${x.puntaje} pts. estimados` : ens.nombre },
          { etiqueta: 'En blanco', valor: String(g.omisiones), detalle: 'sin responder' }];
      cifras(P, tarjetas.slice(0, 4));
      const L = lecturaDocente(g, est, 'estudiante');
      titulo(P, '¿Cómo te fue?', 4, 30);
      parrafo(P, L.comentario, { tam: 10.5 });
      // Tu lugar en la curva del curso (último ensayo)
      if (!ctxS.ejes && A && x) {
        const conP = A.resumen.puntajeMedia != null, v = conP ? x.puntaje : x.logro;
        titulo(P, `Dónde estás en ${ens.nombre}`, 5, 95);
        const cg = curvaGrupo(P, A, { marca: { valor: v, texto: 'Tú estás aquí' }, texto: false });
        if (cg) {
          const d = v - cg.media, cerca = conP ? Math.abs(d) < 20 : Math.abs(d) < 0.04;
          const fmt = conP ? (z) => `${Math.round(z)} puntos` : pct;
          parrafo(P, cerca ? `Tu resultado (${fmt(v)}) está muy cerca del promedio del curso (${fmt(cg.media)}). La curva muestra cómo se repartieron los resultados del curso en este ensayo.`
            : d > 0 ? `Tu resultado (${fmt(v)}) está sobre el promedio del curso (${fmt(cg.media)}). Es una buena base: el desafío ahora es sostenerlo y subir en las temáticas que te cuestan más.`
              : `Tu resultado (${fmt(v)}) está bajo el promedio del curso (${fmt(cg.media)}). Esa distancia se puede acortar: el plan de abajo te propone por dónde empezar.`, { tam: 10 });
        }
      }
      const ejes = conDatos(g.porEje), habs = conDatos(g.porHabilidad);
      if (ejes.length) { titulo(P, 'Resultado por temática', 4, ejes.length * 10 + 10); barras(P, ejes.map((o) => ({ nombre: o.nombre, valor: o.logro, color: o.logro < 0.5 ? C.critico : C.serie })), { formato: (v) => `${pct(v)}` }); }
      if (habs.length) { titulo(P, 'Resultado por habilidad', 3, habs.length * 10 + 10); barras(P, habs.map((o) => ({ nombre: o.nombre, valor: o.logro, color: o.logro < 0.5 ? C.critico : C.serie }))); }
      // Lo que haces bien y tu siguiente paso
      const pm = planMejora(g, ens);
      titulo(P, 'Lo que haces bien y tu siguiente paso', 5, 70);
      recuadros(P, [
        { titulo: 'Lo que haces bien', color: C.t3, fondo: '#EEF4FC', items: L.bueno },
        { titulo: 'Tu siguiente paso', color: C.critico, fondo: '#FCF0E9', items: L.mejorar },
      ]);
      const hab = (o) => { const th = Temarios.habilidad(ens.asignatura, o.nombre); return th ? th.descripcion : minus(o.nombre); };
      const act = [];
      if (pm.contenidos.length) act.push(`Contenidos para practicar: ${lista(pm.contenidos.map(minus))}.`);
      if (pm.habsD.length) act.push(`Habilidades para desarrollar: ${lista(pm.habsD.map((o) => `${minus(o.nombre)} (${hab(o)})`))}.`);
      if (g.persistentes.length) act.push(`${lista(g.persistentes.map((o) => o.nombre))} ${g.persistentes.length === 1 ? 'ha quedado' : 'han quedado'} bajo 50% en todos los ensayos: ahí es donde más rinde tu esfuerzo.`);
      if (act.length) vinetas(P, act, { tam: 10 });
      // Pregunta por pregunta
      const revisar = g.ensayos.map((e) => ({ e, ns: e.preguntas.filter((q) => !e.x.aciertos[q.i]).map((q) => q.n) })).filter((o) => o.ns.length);
      titulo(P, 'Pregunta por pregunta', 5, 40);
      if (!ctxS.ejes && A && x) { parrafo(P, `Tus respuestas en ${ens.nombre}:`, { tam: 9.5, color: C.texto2 }); cuadricula(P, A, x); }
      if (revisar.length) vinetas(P, revisar.map((o) => `Para revisar en ${o.e.ens.nombre}: ${o.ns.length > 20 ? o.ns.slice(0, 20).join(', ') + ' y otras' : o.ns.join(', ')}.`), { tam: 9.5 });
      // Evolución
      if (g.cantidad >= 2) {
        titulo(P, 'Tu evolución', 5, 60);
        const ejesS = conDatos(g.porEje).filter((o) => o.serie.filter((v) => v != null).length >= 2).slice(0, 4);
        lineas(P, [{ nombre: 'Global', color: C.azul, grueso: true, unir: true, valores: g.ensayos.map((e) => e.logro) },
          ...ejesS.map((o, k) => ({ nombre: o.nombre.split(' ')[0], color: C.cat[(k + 1) % C.cat.length], unir: true, valores: o.serie }))], g.ensayos.map((e) => etiquetaEns(e.ens)), { alto: 40 });
        const d = g.cambio, rel = g.cambioRelativo;
        const t = Math.abs(d) < 0.03 ? `Entre el primer y el último ensayo, tu resultado se mantuvo estable (${pct(g.ensayos[0].logro)} y ${pct(g.ensayos[g.cantidad - 1].logro)}).`
          : `Entre el primer y el último ensayo ${d > 0 ? 'subiste' : 'bajaste'} ${pts(d)} (de ${pct(g.ensayos[0].logro)} a ${pct(g.ensayos[g.cantidad - 1].logro)}).`;
        const rels = rel == null ? '' : Math.sign(rel) !== Math.sign(d) && Math.abs(rel) >= 0.03 ? ' Ojo: los ensayos no tienen la misma dificultad y, tomando eso en cuenta, el cambio va en la dirección contraria. Conviene confirmarlo con el próximo ensayo.' : Math.abs(d) >= 0.03 && Math.abs(rel) < 0.03 ? ' Parte de este cambio puede deberse a que los ensayos tenían distinta dificultad.' : '';
        parrafo(P, t + rels, { tam: 10 });
        tabla(P, [{ titulo: 'Ensayo', ancho: W - 108, envolver: true, negrita: true }, { titulo: 'Fecha', ancho: 22, negrita: false }, { titulo: 'Preguntas', ancho: 20, der: true }, { titulo: 'Correctas', ancho: 20, der: true }, { titulo: 'Blanco', ancho: 16, der: true }, { titulo: 'Logro', ancho: 30, der: true }],
          g.ensayos.map((e) => ({ celdas: [e.ens.nombre, e.ens.fecha || '', e.preguntas.length, e.correctas, e.omisiones, `${pct(e.logro)}${!ctxS.ejes && e.x.puntaje != null ? ` · ${e.x.puntaje} pts.` : ''}`] })));
      }
      // Plan semanal
      titulo(P, 'Tu plan para las próximas 4 semanas', 5, 60);
      tabla(P, [{ titulo: 'Semana', ancho: 22, negrita: true }, { titulo: 'Foco', ancho: 44, envolver: true, negrita: false }, { titulo: 'Qué hacer', ancho: W - 66, envolver: true, negrita: false }],
        planSemanal(g, ens, pm, revisar.length > 0).map((f) => ({ celdas: f })), { tam: 9 });
      const p0 = pm.prioridades[0];
      parrafo(P, p0 ? `Meta para el próximo ensayo: llegar a ${pct(Math.min(0.95, Math.max(0.5, p0.logro + 0.15)))} en ${p0.nombre} y a ${pct(Math.min(1, g.logro + 0.07))} de resultado global.` : `Meta para el próximo ensayo: mantener o superar ${pct(g.logro)} de resultado global.`, { estilo: 'bold', tam: 10 });
    });
    parrafo(P, `${pila}, estos resultados muestran dónde estás hoy, no un límite. Los puntajes y niveles son estimaciones a partir de ensayos y sirven para orientar tu estudio.`, { color: C.texto2, tam: 9 });
  }

  function seccionApoderado(P, ctxS) {
    const { cur, est, sel } = ctxS, pila = nombrePila(est.nombre), col = ctxS.colegio || {};
    const C2 = Estad.consolidar(est.id, sel, ctxS.ejes);
    banda(P, nombreCompleto(est.nombre), `Informe para la familia · ${cur.nombre}`, [`Período: ${periodoTexto(sel)}`, `generado el ${hoy()}`].join(' · '));
    if (!ctxS.conPortada) titulo(P, 'Identificación', 0, 30);
    if (!ctxS.conPortada) ficha(P, [['Estudiante', nombreCompleto(est.nombre)], ['Curso', cur.nombre], ['Evaluaciones', sel.map((s) => s.ens.nombre).join('; ')], ['Fecha o período', periodoTexto(sel)]]);
    if (!C2.length) { parrafo(P, 'No hay respuestas para los ensayos elegidos.', { color: C.critico }); return; }
    C2.forEach((g) => {
      const ult = g.ensayos[g.ensayos.length - 1], ens = ult.ens, x = ult.x, A = ult.A, ejes = conDatos(g.porEje);
      titulo(P, C2.length > 1 ? `Resultado de ${pila} en ${g.nombre}` : `Resultado de ${pila}`, 4, 95);
      cifras(P, [
        { etiqueta: 'Respuestas correctas', valor: `${g.correctas} de ${g.preguntas}`, detalle: g.omisiones ? `${g.omisiones} sin responder` : 'respondió todas' },
        { etiqueta: 'Porcentaje de logro', valor: pct(g.logro), detalle: g.cantidad > 1 ? 'de todos los ensayos juntos' : ens.nombre },
        g.cantidad === 1 && x.puntaje != null && !ctxS.ejes ? { etiqueta: 'Puntaje PAES (est.)', valor: String(x.puntaje), detalle: 'referencial, no oficial' }
          : g.cantidad === 1 && x.nota != null && !ctxS.ejes ? { etiqueta: 'Nota', valor: nt(x.nota), detalle: `aprobación con ${nt(Estad.conf.escala.aprobacion)}` }
            : { etiqueta: 'Ensayos considerados', valor: String(g.cantidad), detalle: g.nombre },
        { etiqueta: 'Temáticas evaluadas', valor: String(ejes.length), detalle: lista(ejes.map((o) => o.nombre)) },
      ]);
      const L = lecturaDocente(g, est, 'apoderado');
      parrafo(P, L.comentario, { tam: 10.5 });
      if (!ctxS.ejes && A && x) {
        const conP = A.resumen.puntajeMedia != null;
        titulo(P, `Su resultado en ${ens.nombre}`, 4, 60);
        const cg = curvaGrupo(P, A, { marca: { valor: conP ? x.puntaje : x.logro, texto: pila }, soloCurva: true });
        if (cg) parrafo(P, `La curva muestra la forma en que suelen repartirse los resultados en una evaluación: la mayoría se concentra al centro y pocos quedan en los extremos. La marca verde es el resultado de ${pila}. No se muestran datos de otros estudiantes.`, { color: C.texto2, tam: 9 });
      }
      titulo(P, 'Fortalezas y qué reforzar', 4, 60);
      recuadros(P, [{ titulo: 'Lo que hace bien', color: C.t3, fondo: '#EEF4FC', items: L.bueno }, { titulo: 'Lo que conviene reforzar', color: C.critico, fondo: '#FCF0E9', items: L.mejorar }]);
      if (g.cantidad >= 2) {
        titulo(P, 'Evolución', 4, 55);
        lineas(P, [{ nombre: pila, color: C.azul, grueso: true, unir: true, valores: g.ensayos.map((e) => e.logro) }], g.ensayos.map((e) => etiquetaEns(e.ens)), { alto: 34 });
        const d = g.cambio;
        parrafo(P, `${Math.abs(d) < 0.03 ? `Su resultado se ha mantenido estable, entre ${pct(g.ensayos[0].logro)} y ${pct(g.ensayos[g.cantidad - 1].logro)}.` : d > 0 ? `Subió de ${pct(g.ensayos[0].logro)} a ${pct(g.ensayos[g.cantidad - 1].logro)} entre el primer y el último ensayo.` : `Bajó de ${pct(g.ensayos[0].logro)} a ${pct(g.ensayos[g.cantidad - 1].logro)} entre el primer y el último ensayo.`} Los ensayos no siempre tienen la misma dificultad, así que conviene mirar la tendencia más que un resultado aislado.`, { tam: 10 });
      }
    });
    const g0 = C2[0], debil = conDatos(g0.porEje).sort((a, b) => a.logro - b.logro)[0];
    titulo(P, 'Cómo apoyar desde la casa', 6, 50);
    vinetas(P, [
      `Acordar un horario fijo de estudio, por ejemplo 30 a 40 minutos, tres veces por semana${debil && debil.logro < 0.6 ? `, dedicando una parte a ${debil.nombre}` : ''}.`,
      `Pedirle a ${pila} que explique cómo resolvió un ejercicio: ayuda más que revisar solo si la respuesta está buena.`,
      'Cuidar las condiciones de estudio (un lugar tranquilo, sin celular cerca) y aprovechar situaciones cotidianas para practicar, como calcular descuentos o leer gráficos de las noticias.',
    ], { tam: 10 });
    titulo(P, 'Mensaje final', 5, 25);
    const mejora = C2.find((g) => g.cambio != null && g.cambio >= 0.03);
    const fuerte = conDatos(g0.porEje).sort((a, b) => b.logro - a.logro)[0];
    parrafo(P, `${mejora ? `${pila} mostró un avance en ${mejora.nombre}, y eso habla de su esfuerzo. ` : ''}${fuerte && fuerte.logro >= 0.6 ? `Tiene una base sólida en ${fuerte.nombre}. ` : ''}${debil && debil.logro < 0.6 ? `Con práctica constante en ${debil.nombre} puede seguir mejorando. ` : ''}Cada ensayo es una oportunidad para aprender: lo importante es el progreso, y el apoyo de la familia hace una diferencia real.`, { tam: 10.5 });
    parrafo(P, `Ante cualquier duda, puede contactar ${col.responsable ? `a ${col.responsable}` : 'al docente de la asignatura'}${col.nombre ? ` en ${col.nombre}` : ''}, para saber qué se está reforzando en clases y cómo acompañar desde la casa.`, { tam: 10 });
    titulo(P, 'Glosario', 5, 22);
    const conP = C2.some((g) => g.ensayos.some((e) => e.x.puntaje != null));
    vinetas(P, [
      'Ensayo: prueba de práctica con el formato de la evaluación oficial. Sirve para orientar el estudio; no es un resultado oficial.',
      'Porcentaje de logro: proporción de preguntas respondidas correctamente.',
      conP ? 'Puntaje PAES estimado: conversión del resultado a la escala de la PAES (100 a 1000) con la tabla del ensayo. Es referencial.' : 'Nota: calificación de 1,0 a 7,0 calculada con la escala de exigencia del colegio.',
      'Temática o eje: grupo de contenidos de la asignatura, por ejemplo números o geometría.',
      'Habilidad: lo que se pide hacer con el contenido, como resolver problemas, representar o argumentar.',
    ], { tam: 9 });
  }


  // ---------- Exportaciones ----------
  const docCon = (ctx, pie) => { const P = nuevoDoc(ctx); P.pie = pie; return P; };
  const nuevaPagina = (P) => { P.doc.addPage(); P.y = M; };
  const pieDe = (ctx, tipo, extra) => [(ctx.colegio || {}).nombre || 'Lector óptico', tipo, extra].filter(Boolean).join(' · ');

  // Portada de un informe de grupo (directivo, del ensayo o completo)
  function portadaDirectivo(P, ctxD, etiqueta) {
    const { ens, porCurso, inst } = ctxD, R = inst.resumen;
    portadaGrupo(P, { colegio: ctxD.colegio, etiqueta, titulo: ens.nombre, sub: `${ctxD.nivel || 'Cursos seleccionados'} · ${plural(porCurso.length, 'curso', 'cursos')}`, linea: [tipoEvaluacion(ens), ens.fecha].filter(Boolean).join(' · '), A: inst,
      filas: [['Establecimiento', (ctxD.colegio || {}).nombre || ''], ['Asignatura', ens.asignatura || ''], ['Fecha de aplicación', ens.fecha || 'sin fecha registrada'],
        ['Cursos', `${porCurso.length}: ${lista(porCurso.map((x) => x.curso.nombre))}`], ['Estudiantes evaluados', `${R.corregidas} de ${R.total} (${pct(R.participacion)} de participación)`]],
      nota: 'Resultados de ensayos: orientan la toma de decisiones y no son resultados oficiales.' });
  }
  function directivo(ctxD) {
    const P = docCon(ctxD, pieDe(ctxD, 'Resumen para equipo directivo', `${ctxD.ens.nombre}`));
    portadaDirectivo(P, ctxD, 'INFORME PARA EQUIPO DIRECTIVO');
    seccionDirectivo(P, ctxD, { conPortada: true }); piePaginas(P); return P.doc.output('blob');
  }
  // Varios ensayos y cursos: resumen consolidado y luego el detalle de cada ensayo por nivel
  function directivoConsolidado(M2, { detalle = false } = {}) {
    const P = docCon({ colegio: M2.colegio, ens: M2.ensayos[0] }, pieDe(M2, 'Resumen para equipo directivo', M2.tipo));
    const cursosM = [...new Map(M2.bloques.flatMap((b) => b.porCurso.map((x) => [x.curso.id, x.curso]))).values()];
    const fechas = M2.ensayos.map((e) => e.fecha).filter(Boolean);
    const ultimo = M2.bloques.filter((b) => b.ens.id === M2.ensayos[M2.ensayos.length - 1].id);
    portadaGrupo(P, { colegio: M2.colegio, etiqueta: 'INFORME PARA EQUIPO DIRECTIVO', titulo: M2.tipo || 'Resultados de ensayos', sub: `${plural(M2.ensayos.length, 'ensayo', 'ensayos')} · ${plural(cursosM.length, 'curso', 'cursos')}`,
      linea: fechas.length ? `${fechas[0]}${fechas.length > 1 ? ` al ${fechas[fechas.length - 1]}` : ''}` : '', A: ultimo.length === 1 ? ultimo[0].inst : null,
      filas: [['Establecimiento', (M2.colegio || {}).nombre || ''], ['Ensayos', M2.ensayos.map((e) => `${e.nombre}${e.fecha ? ` (${e.fecha})` : ''}`).join('; ')], ['Cursos', lista(cursosM.map((c) => c.nombre))],
        ultimo.length === 1 ? ['Cifras de la portada', `del ensayo más reciente (${M2.ensayos[M2.ensayos.length - 1].nombre})`] : ['', '']],
      nota: 'Resultados de ensayos: orientan la toma de decisiones y no son resultados oficiales.' });
    seccionDirectivoConsolidado(P, M2);
    if (detalle) { M2.bloques.forEach((b, i) => { nuevaPagina(P); seccionDirectivo(P, b, { sinNota: true, numero: `Detalle ${i + 1}:` }); }); nuevaPagina(P); }
    notaMetodologica(P, { tieneTabla: M2.ensayos.some((e) => Estad.tieneTabla(e)), tieneCortes: M2.bloques.some((b) => !!b.inst.estandares) });
    piePaginas(P); return P.doc.output('blob');
  }
  // Informe de un ensayo con todos los cursos que lo rindieron (de cualquier nivel):
  // el resumen y la comparación entre cursos, cada pregunta por curso y, si se pide, la nómina de cada curso
  function ensayoCursos(ctxD, { nomina = true } = {}) {
    const P = docCon(ctxD, pieDe(ctxD, 'Informe del ensayo', `${ctxD.ens.nombre}`));
    portadaDirectivo(P, ctxD, 'INFORME PARA EQUIPO DIRECTIVO');
    const { ens, porCurso, inst } = ctxD;
    // La nómina de cada curso va antes del anexo técnico
    const conNomina = (num) => {
      if (!nomina) return num;
      const conPuntaje = Estad.tieneTabla(ens), conEstandar = !!inst.estandares;
      porCurso.forEach((x, idx) => {
        nuevaPagina(P);
        if (idx === 0) seccion(P, num++, 'Resultados de cada estudiante', 40);
        const R = x.A.resumen;
        titulo(P, `${x.curso.nombre}: ${R.corregidas} de ${R.total} evaluados · logro promedio ${pct(R.media)}${conPuntaje && R.puntajeMedia != null ? ` · ${R.puntajeMedia} pts.` : ''}`, 0, 40);
        const filas = x.A.estudiantes.slice().sort((a, b) => (a.e.lista || 0) - (b.e.lista || 0)).map((y) => (y.corregida
          ? { celdas: [y.e.lista, nombreCompleto(y.e.nombre), `${y.correctas}/${x.A.n}`, pct(y.logro), conPuntaje ? (y.puntaje != null ? y.puntaje : '–') : nt(y.nota), conEstandar ? y.estandar.nombre : Estad.tramoDe(y.logro).nombre] }
          : { celdas: [y.e.lista, nombreCompleto(y.e.nombre), 'sin hoja', '', '', ''] }));
        tabla(P, [{ titulo: 'N°', ancho: 11, negrita: false }, { titulo: 'Estudiante', ancho: W - 11 - 22 - 18 - 20 - 36, negrita: true }, { titulo: 'Correctas', ancho: 22, der: true, negrita: false },
          { titulo: 'Logro', ancho: 18, der: true, negrita: false }, { titulo: conPuntaje ? 'Puntaje' : 'Nota', ancho: 20, der: true, negrita: false }, { titulo: conEstandar ? 'Estándar' : 'Nivel', ancho: 36, der: true, negrita: false }],
        filas, { tam: 8.6 });
      });
      parrafo(P, `${conPuntaje ? 'Puntaje PAES estimado con la tabla de conversión del ensayo (no es el puntaje oficial). ' : ''}${conEstandar ? 'Estándar SIMCE estimado con los cortes del ensayo.' : `Nivel según los cortes de Ajustes (Medio desde ${pct(Estad.conf.niveles.medio)}, Alto desde ${pct(Estad.conf.niveles.alto)}).`}`, { color: C.texto2, tam: 8.5 });
      return num;
    };
    seccionDirectivo(P, ctxD, { conPortada: true, tablaPreguntas: true, antesDelAnexo: conNomina });
    piePaginas(P); return P.doc.output('blob');
  }

  // Recomendaciones para el departamento a partir de la comparación entre cursos
  function recDepartamento(ctxD, ejes) {
    const { porCurso } = ctxD, rec = [];
    ejes.slice().reverse().slice(0, 2).forEach((g) => {
      const vals = porCurso.map((x) => ({ c: x.curso.nombre, v: (x.A.porEje.find((y) => y.nombre === g.nombre) || {}).logro })).filter((o) => o.v != null).sort((a, b) => b.v - a.v);
      if (vals.length >= 2 && vals[0].v - vals[vals.length - 1].v >= 0.1) rec.push(`En ${g.nombre}, ${vals[0].c} logra ${pct(vals[0].v)} y ${vals[vals.length - 1].c}, ${pct(vals[vals.length - 1].v)}. Compartir en el departamento las estrategias y materiales usados en ${vals[0].c} para esta temática.`);
      else if (g.logro < 0.6) rec.push(`${g.nombre} es baja en todos los cursos (${pct(g.logro)} en el nivel): planificar en conjunto una unidad de refuerzo común.`);
    });
    const br = ctxD.brechas || [];
    if (br.length) rec.push(`Analizar juntos las preguntas ${lista(br.slice(0, 6).map((p) => String(p.n)))}: tienen 25 pp o más de diferencia entre cursos y pueden indicar diferencias de cobertura.`);
    rec.push('Acordar una evaluación breve común (5 a 8 preguntas) de los ejes más bajos para medir el avance antes del próximo ensayo.');
    rec.push('Revisar las condiciones de aplicación (horario, tiempo, asistencia) si un curso se aleja mucho del resto, antes de sacar conclusiones pedagógicas.');
    return rec;
  }
  // Informe comparativo entre cursos para docentes (opción B del docente)
  function comparativo(ctxD) {
    const P = docCon(ctxD, pieDe(ctxD, 'Informe comparativo entre cursos', ctxD.ens.nombre));
    portadaDirectivo(P, ctxD, 'INFORME COMPARATIVO ENTRE CURSOS');
    const { ens, porCurso, inst } = ctxD;
    banda(P, 'Informe comparativo entre cursos', `${ens.nombre} · ${ctxD.nivel || 'Cursos seleccionados'}`, [tipoEvaluacion(ens), ens.fecha, `generado el ${hoy()}`].filter(Boolean).join(' · '));
    avisoDatos(P, ctxD.validacion);
    if (ctxD.validacion && !ctxD.validacion.ok) { parrafo(P, 'Hay problemas en los datos que afectan los cálculos. Corrígelos y vuelve a generar el informe.', { estilo: 'bold', color: C.critico }); piePaginas(P); return P.doc.output('blob'); }
    const ejes = conDatos(inst.porEje).sort((a, b) => b.logro - a.logro);
    titulo(P, 'Síntesis comparativa', 0, 50);
    parrafo(P, resumenTexto(ctxD), { tam: 10.5 });
    vinetas(P, hallazgos(ctxD, ejes), { tam: 10 });
    let ns = 1;
    seccion(P, ns++, 'Resultados por curso', 70);
    compararCursos(P, porCurso, inst, { nombreInst: ctxD.nivel || 'Total', partes: 'resumen' });
    if (inst.resumen.puntajeMedia != null) {
      titulo(P, 'Puntaje PAES promedio por curso', 4, porCurso.length * 11 + 14);
      barras(P, porCurso.map((x, k) => ({ nombre: x.curso.nombre, valor: x.A.resumen.puntajeMedia || 0, color: C.cat[k % C.cat.length], ref: inst.resumen.puntajeMedia })),
        { max: 1000, formato: (v) => `${Math.round(v)} pts.`, refNombre: `Raya negra: promedio del conjunto (${inst.resumen.puntajeMedia} pts.)`, etiquetaAncho: 30 });
    }
    titulo(P, 'Curvas de distribución por curso', 5, 85);
    curvasSuperpuestas(P, porCurso);
    seccion(P, ns++, 'Ejes, habilidades y contenidos por curso', 60);
    compararCursos(P, porCurso, inst, { nombreInst: ctxD.nivel || 'Total', partes: 'bloques' });
    seccion(P, ns++, 'Preguntas con mayor brecha', 50);
    preguntasBrecha(P, ctxD);
    if (ctxD.anterior) { seccion(P, ns++, 'Evolución del nivel', 60); compararAnterior(P, ctxD); }
    seccion(P, ns++, 'Recomendaciones para el departamento', 50);
    vinetas(P, recDepartamento(ctxD, ejes), { tam: 10 });
    nuevaPagina(P);
    seccion(P, ns++, 'Anexo técnico', 60);
    tablaIndicadores(P, inst);
    notaMetodologica(P, { tieneTabla: Estad.tieneTabla(ens), tieneCortes: !!inst.estandares });
    piePaginas(P); return P.doc.output('blob');
  }

  function portadaCurso(P, ctx, etiqueta) {
    const { ens, cur, A } = ctx, R = A.resumen;
    portadaGrupo(P, { colegio: ctx.colegio, etiqueta, titulo: ens.nombre, sub: cur.nombre, linea: [tipoEvaluacion(ens), ens.fecha].filter(Boolean).join(' · '), A,
      filas: [['Establecimiento', (ctx.colegio || {}).nombre || ''], ['Curso', cur.nombre], ['Asignatura', ens.asignatura || ''], ['Fecha de aplicación', ens.fecha || 'sin fecha registrada'],
        ['Estudiantes evaluados', `${R.corregidas} de ${R.total} (${pct(R.participacion)} de participación)`]],
      nota: 'Documento para el docente: incluye resultados individuales de los estudiantes.' });
  }
  function docente(ctx, { fichas = true } = {}) {
    const P = docCon(ctx, pieDe(ctx, 'Informe para el docente', `${ctx.ens.nombre} · ${ctx.cur.nombre}`));
    portadaCurso(P, ctx, fichas ? 'INFORME DEL CURSO Y DE CADA ESTUDIANTE' : 'INFORME DEL CURSO PARA EL DOCENTE');
    cuerpoCurso(P, { ...ctx, conPortada: true });
    if (fichas) paginasEstudiantes(P, ctx, null, true, 'docente');
    piePaginas(P); return P.doc.output('blob');
  }
  // ctxS puede ser un estudiante o una lista (un informe por estudiante en el mismo PDF)
  function acumulado(ctxS, modo = 'estudiante') {
    const lista2 = Array.isArray(ctxS) ? ctxS : [ctxS], c0 = lista2[0];
    const P = docCon(c0, pieDe(c0, modo === 'apoderado' ? 'Informe para padres y apoderados' : 'Informe del estudiante', lista2.length === 1 ? `${nombreCompleto(c0.est.nombre)} · ${c0.cur.nombre}` : c0.cur.nombre));
    lista2.forEach((c, i) => { if (i) nuevaPagina(P); const cp = c.sel.length > 0; if (cp) portadaEstudiante(P, c, modo); (modo === 'apoderado' ? seccionApoderado : seccionEstudiante)(P, { ...c, conPortada: cp }); });
    piePaginas(P); return P.doc.output('blob');
  }
  // Las cuatro secciones en un documento: directivo, docente y, por cada estudiante elegido, su informe y el de su familia
  function completo({ dir, doc: ctxDoc, estudiantes: lista2 = [], fichas = false }) {
    const P = docCon(ctxDoc, pieDe(ctxDoc, 'Informe completo', `${ctxDoc.ens.nombre} · ${ctxDoc.cur.nombre}`));
    portadaCurso(P, ctxDoc, 'INFORME COMPLETO DE RESULTADOS');
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

  return { curso, estudiantes, estudiante, directivo, directivoConsolidado, ensayoCursos, comparativo, docente, acumulado, completo, vistaPrevia };
})();
