/*
 * Genera las hojas de respuestas de un curso:
 *  - PDF (jsPDF + qrcode-generator), mismo diseño que hojas_respuesta.tex
 *  - código LaTeX (a partir de la plantilla hojas_respuesta.tex)
 * El contenido del QR es: LO1;P=<preguntas>;A=<alternativas>;E=<id ensayo>;S=<id estudiante>
 */
const Hojas = (() => {
  const D = Diseno;
  const AZUL = [26, 64, 128];
  const GRIS_LINEA = [115, 115, 115];
  const GRIS_LETRA = [140, 140, 140];
  const FONDO = [237, 242, 250];

  function textoQR(ensayo, estudiante) {
    return ['LO' + D.VERSION, 'P=' + ensayo.preguntas.length, 'A=' + ensayo.alternativas,
      'E=' + (ensayo.id || ''), 'S=' + (estudiante ? estudiante.id : '')].join(';');
  }

  function burbuja(doc, x, y, letra, rellena) {
    doc.setLineWidth(0.21);
    doc.setDrawColor(...GRIS_LINEA);
    doc.setFillColor(...(rellena ? [0, 0, 0] : [255, 255, 255]));
    doc.circle(x, y, D.RESP.radio, 'FD');
    if (letra) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRIS_LETRA);
      doc.text(letra, x, y + 0.9, { align: 'center' });
    }
  }

  function texto(doc, s, x, y, { tam = 9, negrita = false, color = [0, 0, 0], alinear = 'left' } = {}) {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal');
    doc.setFontSize(tam);
    doc.setTextColor(...color);
    doc.text(String(s), x, y, { align: alinear });
  }

  function dibujarHoja(doc, ensayo, curso, estudiante) {
    const n = ensayo.preguntas.length, alt = ensayo.alternativas;
    // Marcas de esquina
    doc.setFillColor(0, 0, 0);
    Object.values(D.MARCAS).forEach(([cx, cy]) => doc.rect(cx - D.MARCA_LADO / 2, cy - D.MARCA_LADO / 2, D.MARCA_LADO, D.MARCA_LADO, 'F'));
    texto(doc, 'HOJA DE RESPUESTAS', D.ANCHO / 2, 15.5, { tam: 14, negrita: true, color: AZUL, alinear: 'center' });
    texto(doc, 'Lector óptico · ' + (ensayo.tipo || 'SIMCE · PAES'), D.ANCHO / 2, 20.5, { tam: 8, color: GRIS_LETRA, alinear: 'center' });

    doc.setDrawColor(...GRIS_LINEA); doc.setLineWidth(0.21);
    doc.roundedRect(10, 24, D.ANCHO - 20, 50, 2, 2, 'S');
    const fin = D.QR.x - 5;
    const campo = (etiqueta, x1, xLinea, x2, y, valor) => {
      texto(doc, etiqueta, x1, y, { tam: 8.5, negrita: true, color: AZUL });
      doc.setDrawColor(...GRIS_LINEA); doc.setLineWidth(0.14);
      doc.line(xLinea, y + 1, x2, y + 1);
      if (valor) texto(doc, valor, xLinea + 1, y - 0.3, { tam: 10 });
    };
    campo('Nombre:', 14, 28, fin, 32, estudiante ? estudiante.nombre : '');
    campo('Curso:', 14, 26, 80, 41, estudiante ? curso.nombre : '');
    campo('Fecha:', 86, 98, fin, 41, ensayo.fecha || '');
    campo('Ensayo:', 14, 28, fin, 50, [ensayo.nombre, ensayo.asignatura].filter(Boolean).join(' · '));

    if (estudiante) {
      texto(doc, 'N° de lista:', 14, 61, { tam: 8.5, negrita: true, color: AZUL });
      texto(doc, estudiante.lista, 34, 61, { tam: 11, negrita: true });
      texto(doc, 'Hoja personal: el código QR identifica al estudiante.', 46, 61, { tam: 7.5, color: GRIS_LETRA });
    } else {
      texto(doc, 'N° de lista', 14, 58.9, { tam: 8.5, negrita: true, color: AZUL });
      texto(doc, 'rellena 2 dígitos', 14, 62.8, { tam: 6.5, color: GRIS_LETRA });
      ['Decena', 'Unidad'].forEach((et, fila) => {
        const [, yf] = D.centroLista(fila, 0);
        texto(doc, et, D.LISTA.x - 5, yf + 1, { tam: 6.5, color: GRIS_LETRA, alinear: 'right' });
        for (let d = 0; d < 10; d++) { const [x, y] = D.centroLista(fila, d); burbuja(doc, x, y, String(d)); }
      });
      texto(doc, 'Ej.: N° 7 = decena 0,', 113, 60, { tam: 6.5, color: GRIS_LETRA });
      texto(doc, 'unidad 7', 113, 63.5, { tam: 6.5, color: GRIS_LETRA });
    }

    // QR
    const qr = qrcode(0, 'M');
    qr.addData(textoQR(ensayo, estudiante));
    qr.make();
    const m = qr.getModuleCount(), lado = D.QR.lado / m;
    doc.setFillColor(0, 0, 0);
    for (let r = 0; r < m; r++) for (let c = 0; c < m; c++) {
      if (qr.isDark(r, c)) doc.rect(D.QR.x + c * lado, D.QR.y + r * lado, lado + 0.02, lado + 0.02, 'F');
    }
    texto(doc, 'no rayar el código', D.QR.x + D.QR.lado / 2, D.QR.y + D.QR.lado + 3.5, { tam: 6, color: GRIS_LETRA, alinear: 'center' });

    // Instrucciones
    texto(doc, 'Usa lápiz grafito y rellena el círculo completo.', 14, 81, { tam: 8 });
    texto(doc, 'Si te equivocas, borra bien. No dobles ni manches la hoja.', 14, 85, { tam: 8 });
    texto(doc, 'Correcto:', 112, 82.5, { tam: 8, negrita: true, color: AZUL });
    burbuja(doc, 130, 81.5, '', true);
    texto(doc, 'Incorrecto:', 145, 82.5, { tam: 8, negrita: true, color: AZUL });
    [166, 174, 182].forEach((x) => burbuja(doc, x, 81.5, ''));
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.32);
    doc.lines([[1.2, 1.2], [2.2, -3.2]], 164.4, 81.6);
    doc.line(172.4, 79.9, 175.6, 83.1); doc.line(172.4, 83.1, 175.6, 79.9);
    doc.setFillColor(0, 0, 0); doc.circle(182, 81.5, 0.8, 'F');

    // Respuestas
    for (let p = 1; p <= n; p++) {
      const col = Math.floor((p - 1) / D.RESP.filas), fila = (p - 1) % D.RESP.filas;
      const x0 = D.RESP.x0 + col * D.RESP.ancho_col;
      const [, y] = D.centroBurbuja(p, 0);
      if (Math.floor(fila / 5) % 2 === 0) {
        doc.setFillColor(...FONDO);
        doc.rect(x0 - 1.5, y - D.RESP.paso_fila / 2, D.RESP.ancho_num + alt * D.RESP.paso + 0.5, D.RESP.paso_fila, 'F');
      }
      texto(doc, p, x0 + D.RESP.ancho_num - 2, y + 1.2, { tam: 8.5, negrita: true, alinear: 'right' });
      for (let a = 0; a < alt; a++) { const [bx, by] = D.centroBurbuja(p, a); burbuja(doc, bx, by, D.LETRAS[a]); }
    }
    texto(doc, `Hoja v${D.VERSION} · ${n} preguntas · alternativas A–${D.LETRAS[alt - 1]}`, D.ANCHO / 2, D.ALTO - 13,
      { tam: 6.5, color: GRIS_LETRA, alinear: 'center' });
  }

  // estudiantes: lista de estudiantes del curso; respaldo: cuántas hojas sin nombre agregar al final
  function pdf(ensayo, curso, estudiantes, respaldo = 0) {
    const doc = new jspdf.jsPDF({ unit: 'mm', format: 'letter' });
    const paginas = [...estudiantes, ...Array(respaldo).fill(null)];
    paginas.forEach((e, i) => { if (i) doc.addPage(); dibujarHoja(doc, ensayo, curso, e); });
    doc.setProperties({ title: 'Hojas de respuestas · ' + ensayo.nombre });
    return doc.output('blob');
  }

  function escaparTex(s) {
    return String(s || '').replace(/\\/g, '\\textbackslash{}').replace(/([&%$#_{}])/g, '\\$1')
      .replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
  }

  function latex(ensayo, curso, estudiantes, respaldo = 1) {
    const [cabeza] = PLANTILLA_TEX.split('\\begin{document}');
    const poner = (nombre, valor) => {
      const re = new RegExp('(\\\\newcommand\\{\\\\' + nombre + '\\}\\{)[^}]*(\\})');
      return (t) => t.replace(re, (_, a, b) => a + valor + b);
    };
    let t = cabeza;
    [
      poner('NumPreguntas', ensayo.preguntas.length),
      poner('NumAlternativas', ensayo.alternativas),
      poner('IDEnsayo', escaparTex(ensayo.id)),
      poner('NombreEnsayo', escaparTex([ensayo.nombre, ensayo.asignatura].filter(Boolean).join(' · '))),
      poner('TipoEnsayo', escaparTex(ensayo.tipo)),
      poner('FechaEnsayo', escaparTex(ensayo.fecha)),
    ].forEach((f) => { t = f(t); });
    const lineas = estudiantes.map((e) =>
      `\\hojaPersonal{${e.lista}}{${escaparTex(e.nombre)}}{${escaparTex(curso.nombre)}}{${escaparTex(e.id)}}`);
    return t + '\\begin{document}\n% ' + curso.nombre + ': una línea por estudiante (el último dato va dentro del QR)\n'
      + lineas.join('\n') + '\n\n% Hojas de respaldo sin nombre\n' + '\\hojaRespaldo\n'.repeat(respaldo) + '\\end{document}\n';
  }

  return { pdf, latex, textoQR };
})();
