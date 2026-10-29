/*
 * Diseño de la hoja de respuestas (versión 1).
 * Mismas medidas que codigo/diseno_hoja.py y que hojas_respuesta.tex.
 * Todo en milímetros, con origen en la esquina superior izquierda de la hoja.
 * Si cambias algo aquí, cámbialo también en esos archivos.
 */
const Diseno = (() => {
  const ANCHO = 215.9;
  const ALTO = 279.4;
  const MARCA_LADO = 8;
  const MARGEN = 10;

  // Centros de las cuatro marcas negras de las esquinas
  const c = MARGEN + MARCA_LADO / 2;
  const MARCAS = {
    supIzq: [c, c],
    supDer: [ANCHO - c, c],
    infDer: [ANCHO - c, ALTO - c],
    infIzq: [c, ALTO - c],
  };

  const QR = { x: ANCHO - MARGEN - 4 - 34, y: 28, lado: 34 };

  const LISTA = { x: 46, y: 58, paso: 6.5, fila: 6.5 };

  const RESP = {
    max: 80, filas: 20, y0: 96, paso_fila: 8, x0: 16,
    ancho_col: 46.5, ancho_num: 9, paso: 7, radio: 2.6,
  };

  const LETRAS = 'ABCDE';

  function centroBurbuja(pregunta, alternativa) {
    const i = pregunta - 1;
    const col = Math.floor(i / RESP.filas);
    const fila = i % RESP.filas;
    return [
      RESP.x0 + col * RESP.ancho_col + RESP.ancho_num + RESP.radio + alternativa * RESP.paso,
      RESP.y0 + fila * RESP.paso_fila,
    ];
  }

  // fila 0 = decenas, fila 1 = unidades
  function centroLista(fila, digito) {
    return [LISTA.x + digito * LISTA.paso, LISTA.y + fila * LISTA.fila];
  }

  return { VERSION: 1, ANCHO, ALTO, MARCA_LADO, MARGEN, MARCAS, QR, LISTA, RESP, LETRAS,
    centroBurbuja, centroLista };
})();
