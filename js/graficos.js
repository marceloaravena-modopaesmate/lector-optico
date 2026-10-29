/*
 * Gráficos en SVG, dibujados a mano para que funcionen sin librerías y en modo claro u oscuro.
 * Cada marca lleva data-tip con su valor: al tocarla (o pasar el mouse) se muestra.
 * Los colores salen de las variables de css/app.css.
 */
const Graficos = (() => {
  const h = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (x) => Math.round(x * 100) + '%';

  // Barra con extremo de datos redondeado (4px) y base recta
  function barraV(x, y, w, alto, base, estilo, tip) {
    if (alto <= 0) return '';
    const r = Math.min(4, w / 2, alto);
    const d = `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
    return `<path d="${d}" style="${estilo}" data-tip="${h(tip)}" tabindex="0"></path>`;
  }
  function barraH(x, y, largo, alto, estilo, tip) {
    if (largo <= 0) return '';
    const r = Math.min(4, alto / 2, largo);
    const d = `M${x},${y}H${x + largo - r}Q${x + largo},${y} ${x + largo},${y + r}V${y + alto - r}Q${x + largo},${y + alto} ${x + largo - r},${y + alto}H${x}Z`;
    return `<path d="${d}" style="${estilo}" data-tip="${h(tip)}" tabindex="0"></path>`;
  }

  function svg(w, alto, contenido, etiqueta) {
    return `<svg viewBox="0 0 ${w} ${alto}" width="100%" role="img" aria-label="${h(etiqueta)}" class="grafico">${contenido}</svg>`;
  }

  // Distribución de logro del curso (histograma en tramos de 10 puntos) con la media marcada
  function histograma(bins, media) {
    const W = 340, H = 170, izq = 26, abajo = 22, arr = 18;
    const max = Math.max(1, ...bins.map((b) => b.n));
    const paso = Math.max(1, Math.ceil(max / 4));
    const tope = Math.ceil(max / paso) * paso;
    const ancho = (W - izq) / bins.length;
    const y = (v) => arr + (H - arr - abajo) * (1 - v / tope);
    let g = '';
    for (let v = 0; v <= tope; v += paso) {
      g += `<line x1="${izq}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="grid"></line><text x="${izq - 6}" y="${y(v) + 4}" class="eje" text-anchor="end">${v}</text>`;
    }
    bins.forEach((b, i) => {
      const x = izq + i * ancho + 1;
      g += barraV(x, y(b.n), ancho - 2, y(0) - y(b.n), y(0), 'fill:var(--serie)', `${Math.round(b.desde * 100)}–${Math.round(b.hasta * 100) - 1}% de logro: ${b.n} estudiante${b.n === 1 ? '' : 's'}`);
      if (i % 2 === 0) g += `<text x="${izq + i * ancho}" y="${H - 6}" class="eje" text-anchor="middle">${i * 10}%</text>`;
    });
    g += `<text x="${W}" y="${H - 6}" class="eje" text-anchor="end">100%</text>`;
    const xm = izq + media * (W - izq);
    g += `<line x1="${xm}" x2="${xm}" y1="${arr - 6}" y2="${y(0)}" class="marca-media"></line>`;
    g += `<text x="${Math.min(W - 2, Math.max(izq + 30, xm))}" y="${arr - 8}" class="rotulo" text-anchor="middle">media ${pct(media)}</text>`;
    return svg(W, H, g, `Distribución del logro del curso. Media ${pct(media)}.`);
  }

  // % de acierto por pregunta, con la línea de pregunta crítica
  function aciertoPreguntas(preguntas, critica) {
    const W = 340, H = 170, izq = 30, abajo = 22, arr = 10;
    const n = preguntas.length;
    const ancho = (W - izq) / n;
    const y = (v) => arr + (H - arr - abajo) * (1 - v);
    let g = '';
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
      g += `<line x1="${izq}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="grid"></line><text x="${izq - 6}" y="${y(v) + 4}" class="eje" text-anchor="end">${v * 100}%</text>`;
    });
    preguntas.forEach((p, i) => {
      const x = izq + i * ancho + (ancho > 4 ? 0.5 : 0.15);
      const w = Math.max(1, ancho - (ancho > 4 ? 1 : 0.3));
      const estilo = p.piloto ? 'fill:var(--distractor)' : p.critica ? 'fill:var(--critico)' : 'fill:var(--serie)';
      g += barraV(x, y(p.acierto), w, y(0) - y(p.acierto), y(0), estilo,
        `Pregunta ${p.n}${p.piloto ? ' (piloto, no cuenta)' : ''}: ${pct(p.acierto)} de acierto · clave ${p.clave}${p.eje ? ' · ' + p.eje : ''}`);
    });
    const marcas = n <= 20 ? 1 : n <= 40 ? 5 : 10;
    preguntas.forEach((p, i) => {
      if (i === 0 || (i + 1) % marcas === 0) g += `<text x="${izq + (i + 0.5) * ancho}" y="${H - 6}" class="eje" text-anchor="middle">${p.n}</text>`;
    });
    g += `<line x1="${izq}" x2="${W}" y1="${y(critica)}" y2="${y(critica)}" class="umbral"></line>`;
    return svg(W, H, g, `Porcentaje de acierto de cada una de las ${n} preguntas.`);
  }

  // Barras horizontales de logro; con "comparar" dibuja la barra del estudiante y la marca del curso
  function barrasLogro(grupos, comparar) {
    const W = 340, filaH = comparar ? 54 : 38, H = grupos.length * filaH + 4;
    let g = '';
    grupos.forEach((gr, i) => {
      const y0 = i * filaH;
      const valor = comparar ? gr.propio : gr.logro;
      g += `<text x="0" y="${y0 + 13}" class="rotulo-izq">${h(gr.nombre)}</text>`;
      g += `<text x="${W}" y="${y0 + 13}" class="valor" text-anchor="end">${pct(valor)}</text>`;
      g += `<rect x="0" y="${y0 + 19}" width="${W}" height="10" rx="5" class="pista"></rect>`;
      g += barraH(0, y0 + 19, W * valor, 10, 'fill:var(--serie)',
        comparar ? `${gr.nombre}: ${pct(gr.propio)} (curso ${pct(gr.curso)}) · ${gr.preguntas} preguntas` : `${gr.nombre}: ${pct(gr.logro)} · ${gr.preguntas} preguntas`);
      if (comparar) {
        const xc = Math.max(1.5, Math.min(W - 1.5, W * gr.curso));
        g += `<line x1="${xc}" x2="${xc}" y1="${y0 + 15}" y2="${y0 + 33}" class="marca-curso" data-tip="${h(`Promedio del curso en ${gr.nombre}: ${pct(gr.curso)}`)}"></line>`;
        g += `<text x="0" y="${y0 + 41}" class="eje">${gr.preguntas} preg. · curso ${pct(gr.curso)}</text>`;
      }
    });
    return svg(W, H, g, comparar ? 'Logro del estudiante comparado con el curso.' : 'Logro por grupo de preguntas.');
  }

  // Estudiantes por tramo de logro: una barra al 100% con tres tonos de un mismo color
  function tramos(lista, total) {
    if (!total) return '';
    const W = 340, H = 26;
    let x = 0, g = '';
    lista.forEach((t, i) => {
      const w = (t.n / total) * W;
      if (w > 0) {
        g += `<rect x="${x}" y="0" width="${Math.max(0, w - 2)}" height="${H}" rx="4" style="fill:var(--tramo-${i + 1})" data-tip="${h(`${t.nombre} (${t.texto}): ${t.n} estudiante${t.n === 1 ? '' : 's'}`)}" tabindex="0"></rect>`;
        if (w > 34) g += `<text x="${x + w / 2 - 1}" y="${H / 2 + 5}" text-anchor="middle" class="${i === 2 ? 'sobre-oscuro' : 'sobre-claro'}">${t.n}</text>`;
      }
      x += w;
    });
    return svg(W, H, g, 'Estudiantes por tramo de logro.');
  }

  // Cómo respondió el curso una pregunta: la clave en azul, los distractores en gris
  function opciones(p, letras) {
    const W = 340, H = 28;
    const total = p.total || 1;
    const orden = [p.clave, ...letras.filter((l) => l !== p.clave), ''];
    let x = 0, g = '';
    orden.forEach((l) => {
      const v = (p.cuenta[l] || 0) / total;
      const w = v * W;
      if (w <= 0) return;
      const estilo = l === p.clave ? 'fill:var(--serie)' : l === '' ? 'fill:var(--omitida)' : 'fill:var(--distractor)';
      const nombre = l === '' ? 'Omitida' : l === p.clave ? `${l} (correcta)` : l;
      g += `<rect x="${x}" y="0" width="${Math.max(0.5, w - 2)}" height="${H}" rx="4" style="${estilo}" data-tip="${h(`${nombre}: ${pct(v)} (${p.cuenta[l] || 0})`)}" tabindex="0"></rect>`;
      const rotulo = w > 46 ? `${l || '–'} ${pct(v)}` : w > 16 ? (l || '–') : '';
      if (rotulo) g += `<text x="${x + w / 2 - 1}" y="${H / 2 + 4.5}" text-anchor="middle" class="${l === p.clave ? 'sobre-oscuro' : 'sobre-claro'}">${rotulo}</text>`;
      x += w;
    });
    return svg(W, H, g, `Respuestas a la pregunta ${p.n}.`);
  }

  // Línea de logro a lo largo de los ensayos (eje Y de 0 a 100%)
  function linea(valores, etiquetas, { alto = 170, resaltar = null } = {}) {
    const W = 340, H = alto, izq = 34, der = 14, abajo = 24, arr = 14;
    const n = valores.length;
    const x = (i) => (n === 1 ? (izq + W - der) / 2 : izq + (i * (W - izq - der)) / (n - 1));
    const y = (v) => arr + (H - arr - abajo) * (1 - v);
    let g = '';
    [0, 0.5, 1].forEach((v) => {
      g += `<line x1="${izq}" x2="${W - der}" y1="${y(v)}" y2="${y(v)}" class="grid"></line><text x="${izq - 6}" y="${y(v) + 4}" class="eje" text-anchor="end">${v * 100}%</text>`;
    });
    if (resaltar) {
      const pts = resaltar.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean);
      if (pts.length > 1) g += `<polyline points="${pts.join(' ')}" class="linea-ref"></polyline>`;
    }
    let tramo = [];
    const tramosLinea = [];
    valores.forEach((v, i) => { if (v == null) { if (tramo.length) tramosLinea.push(tramo); tramo = []; } else tramo.push(`${x(i)},${y(v)}`); });
    if (tramo.length) tramosLinea.push(tramo);
    tramosLinea.forEach((t) => { if (t.length > 1) g += `<polyline points="${t.join(' ')}" class="linea"></polyline>`; });
    valores.forEach((v, i) => {
      if (v == null) return;
      g += `<circle cx="${x(i)}" cy="${y(v)}" r="4.5" class="punto" data-tip="${h(`${etiquetas[i]}: ${pct(v)}${resaltar && resaltar[i] != null ? ` (curso ${pct(resaltar[i])})` : ''}`)}" tabindex="0"></circle>`;
    });
    const ult = valores.map((v, i) => [v, i]).filter(([v]) => v != null).pop();
    if (ult) g += `<text x="${Math.min(W - der, x(ult[1]))}" y="${y(ult[0]) - 9}" class="valor" text-anchor="${n > 1 ? 'end' : 'middle'}">${pct(ult[0])}</text>`;
    etiquetas.forEach((e, i) => {
      if (n <= 6 || i === 0 || i === n - 1) g += `<text x="${x(i)}" y="${H - 6}" class="eje" text-anchor="${n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${h(e)}</text>`;
    });
    return svg(W, H, g, 'Evolución del logro entre ensayos.');
  }

  // Mapa de calor eje × habilidad (HTML), tono de azul según el logro
  const RAMPA = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
  function colorLogro(v) {
    const i = Math.min(RAMPA.length - 1, Math.floor(v * RAMPA.length));
    return { fondo: RAMPA[i], texto: i >= 3 ? '#FFFFFF' : '#0d2a52' };
  }
  function mapaCalor(ejes, habilidades, matriz) {
    const cols = `minmax(78px, 1.2fr) repeat(${habilidades.length}, minmax(52px, 1fr))`;
    let html = `<div class="mapa-scroll"><div class="mapa" style="grid-template-columns:${cols}"><span></span>`;
    habilidades.forEach((hb) => { html += `<span class="mapa-col">${h(hb.nombre)}</span>`; });
    ejes.forEach((e, i) => {
      html += `<span class="mapa-fila">${h(e.nombre)}</span>`;
      habilidades.forEach((hb, j) => {
        const c = matriz[i][j];
        if (!c) { html += '<span class="mapa-celda vacia" aria-label="sin preguntas">·</span>'; return; }
        const col = colorLogro(c.logro);
        html += `<span class="mapa-celda" tabindex="0" style="background:${col.fondo};color:${col.texto}" data-tip="${h(`${e.nombre} × ${hb.nombre}: ${pct(c.logro)} · ${c.preguntas} pregunta${c.preguntas === 1 ? '' : 's'}`)}">${pct(c.logro)}<small>${c.preguntas}p</small></span>`;
      });
    });
    html += '</div></div>';
    html += `<div class="mapa-leyenda"><span>0%</span>${RAMPA.map((c) => `<i style="background:${c}"></i>`).join('')}<span>100%</span></div>`;
    return html;
  }


  // ---------- Comparaciones entre cursos y en el tiempo ----------
  // Color fijo de cada paralelo según su posición en el nivel (A, B, C…). Desde el sexto se usa gris con rótulo.
  const colorCurso = (idx) => (idx < 5 ? `var(--cat-${idx + 1})` : 'var(--distractor)');
  const pts = (v) => (v > 0 ? '+' : '') + Math.round(v * 100);

  // Caja con puntos por curso: la caja es la mitad central, la raya la mediana, la línea punteada el promedio del nivel
  function cajaPuntos(filas, mediaNivel) {
    const W = 340, izq = 50, der = 8, fila = 58, arr = 22, H = arr + filas.length * fila + 22;
    const x = (v) => izq + (W - izq - der) * v;
    let g = '';
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => { g += `<line class="grid" x1="${x(v)}" x2="${x(v)}" y1="${arr - 6}" y2="${H - 22}"></line><text x="${x(v)}" y="${H - 6}" class="eje" text-anchor="middle">${v * 100}%</text>`; });
    filas.forEach((f, i) => {
      const yc = arr + i * fila + fila / 2;
      g += `<text x="${izq - 8}" y="${yc + 4}" class="rotulo-izq" text-anchor="end" style="font-weight:700">${h(f.nombre)}</text>`;
      g += `<rect x="${x(f.q1)}" y="${yc - 12}" width="${Math.max(2, x(f.q3) - x(f.q1))}" height="24" rx="4" class="caja" data-tip="${h(`${f.nombre}: la mitad central está entre ${pct(f.q1)} y ${pct(f.q3)}`)}" tabindex="0"></rect>`;
      f.puntos.forEach((p, k) => {
        g += `<circle cx="${x(p.v)}" cy="${yc + ((k % 5) - 2) * 4.2}" r="3.4" style="fill:${f.color}" class="punto-est" data-tip="${h(`${p.nombre}: ${pct(p.v)}`)}" tabindex="0"></circle>`;
      });
      g += `<line x1="${x(f.mediana)}" x2="${x(f.mediana)}" y1="${yc - 15}" y2="${yc + 15}" class="marca-curso" data-tip="${h(`${f.nombre}: mediana ${pct(f.mediana)} · promedio ${pct(f.media)} · ${f.puntos.length} estudiantes`)}"></line>`;
      const xt = Math.min(W - der, x(f.q3) + 4);
      g += `<text x="${xt}" y="${yc - 15}" class="rotulo" text-anchor="${xt > W - 60 ? 'end' : 'start'}">prom. ${pct(f.media)}</text>`;
    });
    if (mediaNivel != null) {
      g += `<line x1="${x(mediaNivel)}" x2="${x(mediaNivel)}" y1="${arr - 8}" y2="${H - 22}" class="marca-media"></line>`;
      g += `<text x="${Math.min(W - 30, Math.max(izq + 30, x(mediaNivel)))}" y="${arr - 11}" class="rotulo" text-anchor="middle">nivel ${pct(mediaNivel)}</text>`;
    }
    return svg(W, H, g, 'Distribución del logro de cada paralelo comparada con el promedio del nivel.');
  }

  // Mapa grupo × curso con la columna del nivel; marca las celdas 10 puntos o más bajo el nivel
  function mapaCursos(filas, cursos, valores, nivel) {
    const cols = `minmax(84px, 1.4fr) repeat(${cursos.length + 1}, minmax(48px, 1fr))`;
    let html = `<div class="mapa-scroll"><div class="mapa" style="grid-template-columns:${cols}"><span></span>`;
    cursos.forEach((c) => { html += `<span class="mapa-col">${h(c)}</span>`; });
    html += '<span class="mapa-col" style="font-weight:800">Nivel</span>';
    filas.forEach((f, i) => {
      html += `<span class="mapa-fila">${h(f)}</span>`;
      cursos.forEach((c, j) => {
        const v = valores[i][j];
        if (v == null) { html += '<span class="mapa-celda vacia">·</span>'; return; }
        const d = v - nivel[i], col = colorLogro(v);
        html += `<span class="mapa-celda${d <= -0.1 ? ' alerta' : ''}" tabindex="0" style="background:${col.fondo};color:${col.texto}" data-tip="${h(`${c} · ${f}: ${pct(v)} (${pts(d)} contra el nivel)`)}">${pct(v)}<small>${pts(d)}</small></span>`;
      });
      const col = colorLogro(nivel[i]);
      html += `<span class="mapa-celda" tabindex="0" style="background:${col.fondo};color:${col.texto}" data-tip="${h(`Nivel · ${f}: ${pct(nivel[i])}`)}">${pct(nivel[i])}<small>nivel</small></span>`;
    });
    html += '</div></div>';
    html += `<div class="mapa-leyenda"><span>0%</span>${RAMPA.map((c) => `<i style="background:${c}"></i>`).join('')}<span>100%</span><span style="margin-left:8px"><i class="borde-alerta"></i> 10 pts o más bajo el nivel</span></div>`;
    return html;
  }

  // Barras horizontales apiladas al 100% (estándares por curso). partes: [{nombre, n}]
  function apilado100(filas) {
    const W = 340, izq = 54, alto = 28, paso = 40, H = filas.length * paso;
    const ancho = W - izq;
    let g = '';
    filas.forEach((f, i) => {
      const y = i * paso + 4, total = f.partes.reduce((s, p) => s + p.n, 0) || 1;
      g += `<text x="${izq - 8}" y="${y + alto / 2 + 5}" class="rotulo-izq" text-anchor="end" style="font-weight:${f.destacado ? 800 : 600}">${h(f.nombre)}</text>`;
      let x = izq;
      f.partes.forEach((p, k) => {
        const w = (p.n / total) * ancho;
        if (w > 0) {
          g += `<rect x="${x}" y="${y}" width="${Math.max(0.5, w - 2)}" height="${alto}" rx="3" style="fill:var(--tramo-${k + 1})" data-tip="${h(`${f.nombre} · ${p.nombre}: ${p.n} estudiante${p.n === 1 ? '' : 's'} (${pct(p.n / total)})`)}" tabindex="0"></rect>`;
          if (w > 34) g += `<text x="${x + w / 2 - 1}" y="${y + alto / 2 + 4.5}" text-anchor="middle" class="${k === 0 ? 'sobre-claro' : 'sobre-oscuro'}">${pct(p.n / total)}</text>`;
        }
        x += w;
      });
    });
    return svg(W, H, g, 'Porcentaje de estudiantes en cada estándar.');
  }

  // Columnas apiladas al 100% a lo largo de los ensayos
  function columnas100(cols) {
    const W = 340, H = 190, izq = 34, abajo = 22, arr = 6;
    const paso = (W - izq) / cols.length, ancho = Math.min(52, paso - 10);
    const y = (v) => (H - arr - abajo) * v;
    let g = '';
    [0, 0.5, 1].forEach((v) => { const yy = H - abajo - y(v); g += `<line class="grid" x1="${izq}" x2="${W}" y1="${yy}" y2="${yy}"></line><text x="${izq - 6}" y="${yy + 4}" class="eje" text-anchor="end">${v * 100}%</text>`; });
    cols.forEach((c, i) => {
      const bx = izq + i * paso + (paso - ancho) / 2, total = c.partes.reduce((s, p) => s + p.n, 0) || 1;
      let base = H - abajo;
      c.partes.forEach((p, k) => {
        const alto = y(p.n / total);
        if (alto > 0) {
          g += `<rect x="${bx}" y="${base - alto + (k < c.partes.length - 1 ? 0 : 0)}" width="${ancho}" height="${Math.max(0.5, alto - 2)}" rx="3" style="fill:var(--tramo-${k + 1})" data-tip="${h(`${c.etiqueta} · ${p.nombre}: ${pct(p.n / total)} (${p.n})`)}" tabindex="0"></rect>`;
          if (alto > 18) g += `<text x="${bx + ancho / 2}" y="${base - alto / 2 + 3}" text-anchor="middle" class="${k === 0 ? 'sobre-claro' : 'sobre-oscuro'}">${pct(p.n / total)}</text>`;
        }
        base -= alto;
      });
      g += `<text x="${bx + ancho / 2}" y="${H - 6}" class="eje" text-anchor="middle">${h(c.etiqueta)}</text>`;
    });
    return svg(W, H, g, 'Porcentaje de estudiantes en cada estándar a lo largo de los ensayos.');
  }

  // Histograma de notas con la línea de aprobación
  function histNotas(bins, aprobacion) {
    const W = 340, H = 186, izq = 24, abajo = 22, arr = 40;   // franja superior para el rótulo de aprobación
    const max = Math.max(1, ...bins.map((b) => b.n));
    const paso = Math.max(1, Math.ceil(max / 4)), tope = Math.ceil(max / paso) * paso;
    const ancho = (W - izq) / bins.length, y = (v) => arr + (H - arr - abajo) * (1 - v / tope);
    const nt = (v) => String(v.toFixed(1)).replace('.', ',');
    let g = '';
    for (let v = 0; v <= tope; v += paso) g += `<line class="grid" x1="${izq}" x2="${W}" y1="${y(v)}" y2="${y(v)}"></line><text x="${izq - 6}" y="${y(v) + 4}" class="eje" text-anchor="end">${v}</text>`;
    bins.forEach((b, i) => {
      const bx = izq + i * ancho + 3;
      const etiqueta = `${nt(b.desde)}–${nt(i === bins.length - 1 ? b.hasta : b.hasta - 0.1)}`;
      g += barraV(bx, y(b.n), ancho - 6, y(0) - y(b.n), y(0), b.desde < aprobacion ? 'fill:var(--critico)' : 'fill:var(--serie)', `Notas ${etiqueta}: ${b.n} estudiante${b.n === 1 ? '' : 's'}`);
      if (b.n) g += `<text x="${bx + (ancho - 6) / 2}" y="${y(b.n) - 5}" class="rotulo" text-anchor="middle">${b.n}</text>`;
      g += `<text x="${izq + (i + 0.5) * ancho}" y="${H - 6}" class="eje" text-anchor="middle" style="font-size:10px">${etiqueta}</text>`;
    });
    const k = bins.findIndex((b) => b.desde >= aprobacion);
    if (k > 0) {
      const xa = izq + k * ancho;
      g += `<line x1="${xa}" x2="${xa}" y1="6" y2="${y(0)}" class="marca-media"></line><text x="${xa + 5}" y="14" class="rotulo">aprobación ${nt(aprobacion)}</text>`;
    }
    return svg(W, H, g, 'Cuántos estudiantes hay en cada tramo de nota.');
  }

  // Cuadrante: logro actual (x) contra cambio respecto del ensayo anterior (y)
  function cuadrante(puntos, umbral) {
    const W = 340, H = 250, izq = 34, der = 8, arr = 10, abajo = 24;
    const lim = Math.max(0.2, Math.ceil(Math.max(...puntos.map((p) => Math.abs(p.y)), 0) * 10) / 10);
    const x = (v) => izq + (W - izq - der) * v, y = (v) => arr + (H - arr - abajo) * (1 - (v + lim) / (2 * lim));
    let g = `<rect x="${izq}" y="${y(0)}" width="${x(umbral) - izq}" height="${y(-lim) - y(0)}" class="zona-riesgo"></rect>`;
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => { g += `<line class="grid" x1="${x(v)}" x2="${x(v)}" y1="${arr}" y2="${H - abajo}"></line><text x="${x(v)}" y="${H - 8}" class="eje" text-anchor="middle">${v * 100}%</text>`; });
    [-lim, -lim / 2, 0, lim / 2, lim].forEach((v) => { g += `<line class="grid" x1="${izq}" x2="${W - der}" y1="${y(v)}" y2="${y(v)}"></line><text x="${izq - 6}" y="${y(v) + 4}" class="eje" text-anchor="end">${pts(v)}</text>`; });
    g += `<line x1="${x(umbral)}" x2="${x(umbral)}" y1="${arr}" y2="${H - abajo}" class="eje-fuerte"></line><line x1="${izq}" x2="${W - der}" y1="${y(0)}" y2="${y(0)}" class="eje-fuerte"></line>`;
    g += `<text x="${izq + 5}" y="${arr + 13}" class="rotulo">Repuntando</text><text x="${W - der - 5}" y="${arr + 13}" class="rotulo" text-anchor="end">Consolidados</text>`;
    g += `<text x="${izq + 5}" y="${H - abajo - 7}" class="rotulo" style="fill:var(--mal-texto)">En riesgo</text><text x="${W - der - 5}" y="${H - abajo - 7}" class="rotulo" text-anchor="end">Bajando</text>`;
    puntos.forEach((p) => {
      g += `<circle cx="${x(p.x)}" cy="${y(Math.max(-lim, Math.min(lim, p.y)))}" r="5" class="punto" style="${p.riesgo ? 'fill:var(--critico)' : ''}" data-tip="${h(`${p.nombre}: ${pct(p.x)}, ${pts(p.y)} puntos contra el ensayo anterior`)}" tabindex="0"></circle>`;
    });
    return svg(W, H, g, 'Cada estudiante según su logro actual y su cambio respecto del ensayo anterior.');
  }

  // Varias líneas (una por paralelo) con el nombre al final de cada una
  function lineas(series, etiquetas) {
    const W = 340, H = 190, izq = 34, der = 46, arr = 14, abajo = 24;
    const vals = series.flatMap((s) => s.valores).filter((v) => v != null);
    let lo = Math.max(0, Math.floor((Math.min(...vals) - 0.05) * 10) / 10), hi = Math.min(1, Math.ceil((Math.max(...vals) + 0.05) * 10) / 10);
    if (hi - lo < 0.2) { lo = Math.max(0, lo - 0.1); hi = Math.min(1, hi + 0.1); }
    const n = etiquetas.length;
    const x = (i) => (n === 1 ? (izq + W - der) / 2 : izq + (i * (W - izq - der)) / (n - 1));
    const y = (v) => arr + (H - arr - abajo) * (1 - (v - lo) / (hi - lo));
    let g = '';
    const marcas = [lo, (lo + hi) / 2, hi];
    marcas.forEach((v) => { g += `<line class="grid" x1="${izq}" x2="${W - der}" y1="${y(v)}" y2="${y(v)}"></line><text x="${izq - 6}" y="${y(v) + 4}" class="eje" text-anchor="end">${pct(v)}</text>`; });
    etiquetas.forEach((e, i) => { if (n <= 6 || i === 0 || i === n - 1) g += `<text x="${x(i)}" y="${H - 6}" class="eje" text-anchor="middle">${h(e)}</text>`; });
    const finales = [];
    series.forEach((s) => {
      let tramo = [];
      const partes = [];
      s.valores.forEach((v, i) => { if (v == null) { if (tramo.length) partes.push(tramo); tramo = []; } else tramo.push(`${x(i)},${y(v)}`); });
      if (tramo.length) partes.push(tramo);
      partes.forEach((t) => { if (t.length > 1) g += `<polyline points="${t.join(' ')}" style="fill:none;stroke:${s.color};stroke-width:${s.grueso ? 2.5 : 2};stroke-linejoin:round${s.punteada ? ';stroke-dasharray:4 3' : ''}"></polyline>`; });
      s.valores.forEach((v, i) => { if (v != null && !s.punteada) g += `<circle cx="${x(i)}" cy="${y(v)}" r="4" style="fill:${s.color};stroke:var(--superficie);stroke-width:2" data-tip="${h(`${s.nombre} · ${etiquetas[i]}: ${pct(v)}`)}" tabindex="0"></circle>`; });
      const ult = s.valores.map((v, i) => [v, i]).filter(([v]) => v != null).pop();
      if (ult) finales.push({ nombre: s.nombre, y: y(ult[0]), x: x(ult[1]) });
    });
    // Rótulos finales sin superponerse
    finales.sort((a, b) => a.y - b.y);
    for (let i = 1; i < finales.length; i++) if (finales[i].y - finales[i - 1].y < 13) finales[i].y = finales[i - 1].y + 13;
    finales.forEach((f) => { g += `<text x="${f.x + 8}" y="${f.y + 4}" class="rotulo">${h(f.nombre)}</text>`; });
    return svg(W, H, g, 'Logro promedio de cada paralelo a lo largo de los ensayos.');
  }

  // Pendientes: una línea por estudiante entre dos ensayos
  function pendientes(pares, etiquetaA, etiquetaB) {
    const W = 340, H = Math.max(200, Math.min(360, pares.length * 9 + 60)), xa = 90, xb = 250, arr = 26, abajo = 12;
    const vals = pares.flatMap((p) => [p.a, p.b]);
    const lo = Math.max(0, Math.floor(Math.min(...vals) * 10) / 10), hi = Math.min(1, Math.ceil(Math.max(...vals) * 10) / 10 || 1);
    const y = (v) => arr + (H - arr - abajo) * (1 - (v - lo) / ((hi - lo) || 1));
    let g = `<text x="${xa}" y="12" class="rotulo" text-anchor="middle">${h(etiquetaA)}</text><text x="${xb}" y="12" class="rotulo" text-anchor="middle">${h(etiquetaB)}</text>`;
    g += `<line x1="${xa}" x2="${xa}" y1="${arr}" y2="${H - abajo}" class="grid"></line><line x1="${xb}" x2="${xb}" y1="${arr}" y2="${H - abajo}" class="grid"></line>`;
    [lo, (lo + hi) / 2, hi].forEach((v) => { g += `<text x="${xa - 8}" y="${y(v) + 4}" class="eje" text-anchor="end">${pct(v)}</text>`; });
    const tipo = (d) => (d >= 0.03 ? 'sube' : d <= -0.03 ? 'baja' : 'igual');
    const color = { sube: 'var(--serie)', baja: 'var(--critico)', igual: 'var(--distractor)' };
    const orden = pares.slice().sort((p, q) => (tipo(p.b - p.a) === 'igual' ? -1 : 0) - (tipo(q.b - q.a) === 'igual' ? -1 : 0));
    orden.forEach((p) => {
      const c = color[tipo(p.b - p.a)], t = `${p.nombre}: ${pct(p.a)} → ${pct(p.b)} (${pts(p.b - p.a)})`;
      g += `<line x1="${xa}" y1="${y(p.a)}" x2="${xb}" y2="${y(p.b)}" style="stroke:${c};stroke-width:2" data-tip="${h(t)}" tabindex="0"></line>`;
      g += `<circle cx="${xa}" cy="${y(p.a)}" r="3.5" style="fill:${c}"></circle><circle cx="${xb}" cy="${y(p.b)}" r="3.5" style="fill:${c}" data-tip="${h(t)}"></circle>`;
    });
    // Rótulos para el que más subió y el que más bajó
    const porCambio = pares.slice().sort((p, q) => (q.b - q.a) - (p.b - p.a));
    const rot = [porCambio[0], porCambio[porCambio.length - 1]].filter((p, i, a) => p && a.indexOf(p) === i && Math.abs(p.b - p.a) >= 0.03)
      .map((p) => ({ texto: `${p.nombre} ${pts(p.b - p.a)}`, y: y(p.b) })).sort((a, b) => a.y - b.y);
    if (rot.length === 2 && rot[1].y - rot[0].y < 13) rot[1].y = rot[0].y + 13;
    rot.forEach((r) => { g += `<text x="${xb + 8}" y="${r.y + 4}" class="rotulo">${h(r.texto)}</text>`; });
    return svg(W, H, g, 'Logro de cada estudiante en los dos últimos ensayos.');
  }

  // Ficha: punto del estudiante con las marcas del curso y del nivel, por grupo
  function puntosGrupo(filas) {
    const W = 340, izq = 118, der = 12, fila = 40, H = filas.length * fila + 22;
    const x = (v) => izq + (W - izq - der) * v;
    let g = '';
    [0, 0.5, 1].forEach((v) => { g += `<line class="grid" x1="${x(v)}" x2="${x(v)}" y1="0" y2="${H - 22}"></line><text x="${x(v)}" y="${H - 6}" class="eje" text-anchor="middle">${v * 100}%</text>`; });
    filas.forEach((f, i) => {
      const yc = i * fila + fila / 2;
      const nombre = f.nombre.length > 18 ? f.nombre.slice(0, 17) + '…' : f.nombre;
      g += `<text x="${izq - 8}" y="${yc + 4}" class="rotulo-izq" text-anchor="end" style="font-size:12px"><title>${h(f.nombre)}</title>${h(nombre)}</text>`;
      g += `<line x1="${x(Math.min(f.propio, f.curso))}" x2="${x(Math.max(f.propio, f.curso))}" y1="${yc}" y2="${yc}" class="tramo-dif"></line>`;
      if (f.nivel != null) g += `<line x1="${x(f.nivel)}" x2="${x(f.nivel)}" y1="${yc - 10}" y2="${yc + 10}" class="marca-nivel" data-tip="${h(`Nivel · ${f.nombre}: ${pct(f.nivel)}`)}" tabindex="0"></line>`;
      g += `<line x1="${x(f.curso)}" x2="${x(f.curso)}" y1="${yc - 10}" y2="${yc + 10}" class="marca-curso" data-tip="${h(`Curso · ${f.nombre}: ${pct(f.curso)}`)}" tabindex="0"></line>`;
      g += `<circle cx="${x(f.propio)}" cy="${yc}" r="6.5" class="punto" data-tip="${h(`${f.nombre}: ${pct(f.propio)} (${pts(f.propio - f.curso)} contra el curso${f.nivel != null ? `, ${pts(f.propio - f.nivel)} contra el nivel` : ''}) · ${f.preguntas} preguntas`)}" tabindex="0"></circle>`;
    });
    return svg(W, H, g, 'Logro del estudiante por grupo de preguntas, comparado con su curso y su nivel.');
  }

  // Acierto por pregunta en cada paralelo; destaca las preguntas con brecha grande
  function puntosPreguntas(preguntas, cursos, brecha) {
    const W = 340, H = 190, izq = 30, der = 6, arr = 22, abajo = 22;
    const n = preguntas.length, paso = (W - izq - der) / n;
    const x = (i) => izq + paso * (i + 0.5), y = (v) => arr + (H - arr - abajo) * (1 - v);
    let g = '';
    [0, 0.5, 1].forEach((v) => { g += `<line class="grid" x1="${izq}" x2="${W - der}" y1="${y(v)}" y2="${y(v)}"></line><text x="${izq - 6}" y="${y(v) + 4}" class="eje" text-anchor="end">${v * 100}%</text>`; });
    const r = Math.max(2, Math.min(4.2, paso / 3));
    preguntas.forEach((p, i) => {
      if (p.brecha >= brecha) g += `<rect x="${x(i) - paso / 2 + 0.5}" y="${arr - 16}" width="${Math.max(1, paso - 1)}" height="${H - arr - abajo + 16}" rx="3" class="zona-riesgo"></rect>${paso > 9 ? `<text x="${x(i)}" y="${arr - 5}" class="rotulo" text-anchor="middle" style="fill:var(--mal-texto);font-size:10px">${Math.round(p.brecha * 100)}</text>` : ''}`;
      const vs = p.porCurso;
      if (vs.length > 1) g += `<line x1="${x(i)}" x2="${x(i)}" y1="${y(Math.max(...vs))}" y2="${y(Math.min(...vs))}" class="tramo-dif" style="stroke-width:2"></line>`;
      vs.forEach((v, k) => { g += `<circle cx="${x(i)}" cy="${y(v)}" r="${r}" style="fill:${cursos[k].color};stroke:var(--superficie);stroke-width:1.2" data-tip="${h(`Pregunta ${p.n} · ${cursos[k].nombre}: ${pct(v)}`)}" tabindex="0"></circle>`; });
      const marcas = n <= 20 ? 1 : n <= 40 ? 5 : 10;
      if (i === 0 || (i + 1) % marcas === 0) g += `<text x="${x(i)}" y="${H - 6}" class="eje" text-anchor="middle" style="font-size:10px">${p.n}</text>`;
    });
    return svg(W, H, g, 'Acierto de cada pregunta en cada paralelo.');
  }

  // Barras simples con valor al final (referencias externas). formato(v) da el texto
  function barrasRef(filas, max, formato) {
    const W = 340, fila = 44, H = filas.length * fila;
    const x = (v) => (W - 46) * Math.min(1, v / max);
    let g = '';
    filas.forEach((f, i) => {
      const y = i * fila;
      g += `<text x="0" y="${y + 13}" class="rotulo-izq" style="font-size:12.5px">${h(f.nombre)}</text>`;
      g += `<rect x="0" y="${y + 20}" width="${W - 46}" height="14" rx="7" class="pista"></rect>`;
      g += barraH(0, y + 20, x(f.valor), 14, f.destacado ? 'fill:var(--serie)' : 'fill:var(--distractor)', `${f.nombre}: ${formato(f.valor)}`);
      g += `<text x="${x(f.valor) + 6}" y="${y + 32}" class="valor">${formato(f.valor)}</text>`;
    });
    return svg(W, H, g, 'Comparación con referencias externas.');
  }

  // Línea mínima para tablas
  function sparkline(valores) {
    const W = 80, H = 24, v = valores.filter((x) => x != null);
    if (v.length < 2) return '<span class="nota">–</span>';
    const lo = Math.min(...v) - 0.03, hi = Math.max(...v) + 0.03;
    const x = (i) => 4 + (W - 8) * i / (valores.length - 1), y = (a) => 3 + (H - 6) * (1 - (a - lo) / (hi - lo));
    const p = valores.map((a, i) => (a == null ? null : `${x(i)},${y(a)}`)).filter(Boolean);
    const u = valores.length - 1;
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="grafico" aria-hidden="true"><polyline points="${p.join(' ')}" class="linea"></polyline><circle cx="${x(u)}" cy="${y(valores[u])}" r="3" class="punto" style="stroke-width:0"></circle></svg>`;
  }

  return { histograma, aciertoPreguntas, barrasLogro, tramos, opciones, linea, mapaCalor,
    colorCurso, cajaPuntos, mapaCursos, apilado100, columnas100, histNotas, cuadrante, lineas, pendientes, puntosGrupo, puntosPreguntas, barrasRef, sparkline };
})();
