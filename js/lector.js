/*
 * Lector de la hoja de respuestas a partir de una foto.
 *
 * Pasos:
 *   1. Pasa la foto a escala de grises.
 *   2. Busca las cuatro marcas negras de las esquinas.
 *   3. Endereza la hoja (corrige inclinación y perspectiva).
 *   4. Lee el código QR (ensayo y estudiante).
 *   5. Mide cuánto está rellena cada burbuja y decide la respuesta.
 *
 * No depende de nada más que jsQR (para el código QR) y Diseno.
 */
const Lector = (() => {
  const PX_MM = 6;            // resolución de la hoja enderezada: 6 píxeles por milímetro
  const MAX_LADO_BUSQUEDA = 1000;

  // Umbrales de relleno (fracción de la burbuja que está oscura)
  const UMBRAL = {
    llena: 0.42,    // desde aquí la burbuja cuenta como marcada
    duda: 0.20,     // entre duda y llena: marca débil o borrón, se pide revisar
    ventajaClara: 0.30, // si dos están marcadas pero una está mucho más rellena, se sugiere esa
    difTono: 0.18,      // diferencia de tono para sospechar que una marca está borrada
  };

  // ---------- Utilidades de imagen ----------

  function aGris(imageData) {
    const { data, width, height } = imageData;
    const gris = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < gris.length; i++, j += 4) {
      gris[i] = (data[j] * 77 + data[j + 1] * 150 + data[j + 2] * 29) >> 8;
    }
    return { gris, ancho: width, alto: height };
  }

  function reducir(img, maxLado) {
    const escala = Math.min(1, maxLado / Math.max(img.ancho, img.alto));
    if (escala === 1) return { ...img, escala: 1 };
    const ancho = Math.round(img.ancho * escala);
    const alto = Math.round(img.alto * escala);
    const gris = new Uint8ClampedArray(ancho * alto);
    const paso = 1 / escala;
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        // promedio de un bloque para no perder detalle
        const x0 = Math.floor(x * paso), y0 = Math.floor(y * paso);
        const x1 = Math.min(img.ancho, Math.floor((x + 1) * paso));
        const y1 = Math.min(img.alto, Math.floor((y + 1) * paso));
        let s = 0, n = 0;
        for (let yy = y0; yy < y1; yy++) {
          for (let xx = x0; xx < x1; xx++) { s += img.gris[yy * img.ancho + xx]; n++; }
        }
        gris[y * ancho + x] = n ? s / n : 255;
      }
    }
    return { gris, ancho, alto, escala };
  }

  // Binariza comparando cada píxel con el promedio de su vecindario (tolera sombras)
  function binarizar(img) {
    const { gris, ancho, alto } = img;
    const integral = new Float64Array((ancho + 1) * (alto + 1));
    for (let y = 0; y < alto; y++) {
      let fila = 0;
      for (let x = 0; x < ancho; x++) {
        fila += gris[y * ancho + x];
        integral[(y + 1) * (ancho + 1) + x + 1] = integral[y * (ancho + 1) + x + 1] + fila;
      }
    }
    const r = Math.max(8, Math.round(Math.max(ancho, alto) / 25));
    const bin = new Uint8Array(ancho * alto);
    for (let y = 0; y < alto; y++) {
      const ya = Math.max(0, y - r), yb = Math.min(alto, y + r + 1);
      for (let x = 0; x < ancho; x++) {
        const xa = Math.max(0, x - r), xb = Math.min(ancho, x + r + 1);
        const suma = integral[yb * (ancho + 1) + xb] - integral[ya * (ancho + 1) + xb]
          - integral[yb * (ancho + 1) + xa] + integral[ya * (ancho + 1) + xa];
        const media = suma / ((yb - ya) * (xb - xa));
        bin[y * ancho + x] = gris[y * ancho + x] < media * 0.72 ? 1 : 0;
      }
    }
    return bin;
  }

  // Regiones oscuras conectadas, con su tamaño y caja
  function componentes(bin, ancho, alto) {
    const etiqueta = new Int32Array(ancho * alto);
    const pila = new Int32Array(ancho * alto);
    const lista = [];
    let actual = 0;
    for (let inicio = 0; inicio < bin.length; inicio++) {
      if (!bin[inicio] || etiqueta[inicio]) continue;
      actual++;
      let tope = 0, area = 0, sx = 0, sy = 0;
      let minX = ancho, maxX = 0, minY = alto, maxY = 0, borde = false;
      pila[tope++] = inicio;
      etiqueta[inicio] = actual;
      while (tope) {
        const p = pila[--tope];
        const x = p % ancho, y = (p - x) / ancho;
        area++; sx += x; sy += y;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x === 0 || y === 0 || x === ancho - 1 || y === alto - 1) borde = true;
        const vecinos = [p - 1, p + 1, p - ancho, p + ancho];
        for (let k = 0; k < 4; k++) {
          const q = vecinos[k];
          if (k === 0 && x === 0) continue;
          if (k === 1 && x === ancho - 1) continue;
          if (q < 0 || q >= bin.length) continue;
          if (bin[q] && !etiqueta[q]) { etiqueta[q] = actual; pila[tope++] = q; }
        }
      }
      const w = maxX - minX + 1, h = maxY - minY + 1;
      lista.push({ area, cx: sx / area, cy: sy / area, w, h, relleno: area / (w * h), borde });
    }
    return lista;
  }

  // ---------- Búsqueda de las cuatro marcas ----------

  function ordenarHorario(pts) {
    const cx = pts.reduce((s, p) => s + p.cx, 0) / 4;
    const cy = pts.reduce((s, p) => s + p.cy, 0) / 4;
    return pts.slice().sort((a, b) => Math.atan2(a.cy - cy, a.cx - cx) - Math.atan2(b.cy - cy, b.cx - cx));
  }

  function dist(a, b) { return Math.hypot(a.cx - b.cx, a.cy - b.cy); }

  function esConvexo(p) {
    let signo = 0;
    for (let i = 0; i < 4; i++) {
      const a = p[i], b = p[(i + 1) % 4], c = p[(i + 2) % 4];
      const cruz = (b.cx - a.cx) * (c.cy - b.cy) - (b.cy - a.cy) * (c.cx - b.cx);
      const s = Math.sign(cruz);
      if (s === 0) return false;
      if (signo && s !== signo) return false;
      signo = s;
    }
    return true;
  }

  function buscarMarcas(img) {
    const bin = binarizar(img);
    const minArea = Math.max(20, (img.ancho * img.alto) / 40000);
    const candidatos = componentes(bin, img.ancho, img.alto)
      .filter((c) => !c.borde && c.area >= minArea && c.relleno > 0.7
        && c.w / c.h > 0.55 && c.w / c.h < 1.8)
      .sort((a, b) => b.area - a.area)
      .slice(0, 16);

    const razonHoja = (Diseno.MARCAS.supDer[0] - Diseno.MARCAS.supIzq[0])
      / (Diseno.MARCAS.infIzq[1] - Diseno.MARCAS.supIzq[1]);
    let mejor = null, mejorPuntaje = -1;
    const n = candidatos.length;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) {
        const grupo = [candidatos[a], candidatos[b], candidatos[c], candidatos[d]];
        const areas = grupo.map((g) => g.area);
        if (Math.max(...areas) / Math.min(...areas) > 3) continue;
        const p = ordenarHorario(grupo);
        if (!esConvexo(p)) continue;
        const lados = [dist(p[0], p[1]), dist(p[1], p[2]), dist(p[2], p[3]), dist(p[3], p[0])];
        const opuestos1 = lados[0] / lados[2], opuestos2 = lados[1] / lados[3];
        if (opuestos1 < 0.6 || opuestos1 > 1.67 || opuestos2 < 0.6 || opuestos2 > 1.67) continue;
        const l1 = (lados[0] + lados[2]) / 2, l2 = (lados[1] + lados[3]) / 2;
        const razon = Math.min(l1, l2) / Math.max(l1, l2);
        if (Math.abs(razon - razonHoja) > 0.2) continue;
        // El tamaño de cada marca debe calzar con el tamaño de la hoja
        const ladoEsperado = Math.min(l1, l2) * Diseno.MARCA_LADO
          / (Diseno.MARCAS.supDer[0] - Diseno.MARCAS.supIzq[0]);
        const areaEsperada = ladoEsperado * ladoEsperado;
        const media = areas.reduce((s, x) => s + x, 0) / 4;
        if (media / areaEsperada < 0.35 || media / areaEsperada > 2.8) continue;
        const puntaje = media * Math.min(l1, l2);
        if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; mejor = p; }
      }
    return mejor;
  }

  // ---------- Geometría ----------

  // Homografía que lleva 4 puntos origen a 4 puntos destino
  function homografia(origen, destino) {
    const A = [], bvec = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = origen[i], [u, v] = destino[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); bvec.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); bvec.push(v);
    }
    // Eliminación de Gauss con pivoteo
    for (let col = 0; col < 8; col++) {
      let piv = col;
      for (let f = col + 1; f < 8; f++) if (Math.abs(A[f][col]) > Math.abs(A[piv][col])) piv = f;
      [A[col], A[piv]] = [A[piv], A[col]]; [bvec[col], bvec[piv]] = [bvec[piv], bvec[col]];
      for (let f = 0; f < 8; f++) {
        if (f === col) continue;
        const k = A[f][col] / A[col][col];
        for (let c = col; c < 8; c++) A[f][c] -= k * A[col][c];
        bvec[f] -= k * bvec[col];
      }
    }
    const h = bvec.map((v, i) => v / A[i][i]);
    return [...h, 1];
  }

  function aplicar(H, x, y) {
    const w = H[6] * x + H[7] * y + H[8];
    return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
  }

  // Construye la hoja enderezada (en mm * PX_MM) leyendo la foto con interpolación bilineal
  function enderezar(img, H, region) {
    const r = region || { x: 0, y: 0, ancho: Diseno.ANCHO, alto: Diseno.ALTO };
    const W = Math.round(r.ancho * PX_MM), A = Math.round(r.alto * PX_MM);
    const salida = new Uint8ClampedArray(W * A);
    const { gris, ancho, alto } = img;
    for (let y = 0; y < A; y++) {
      const my = r.y + (y + 0.5) / PX_MM;
      for (let x = 0; x < W; x++) {
        const mx = r.x + (x + 0.5) / PX_MM;
        const [u, v] = aplicar(H, mx, my);
        const x0 = Math.floor(u), y0 = Math.floor(v);
        if (x0 < 0 || y0 < 0 || x0 >= ancho - 1 || y0 >= alto - 1) { salida[y * W + x] = 255; continue; }
        const fx = u - x0, fy = v - y0, i = y0 * ancho + x0;
        salida[y * W + x] = (gris[i] * (1 - fx) + gris[i + 1] * fx) * (1 - fy)
          + (gris[i + ancho] * (1 - fx) + gris[i + ancho + 1] * fx) * fy;
      }
    }
    return { gris: salida, ancho: W, alto: A };
  }

  // Ajuste fino: busca el centro real de cada marca en la hoja enderezada
  function afinar(img, H) {
    const hoja = enderezar(img, H);
    const nombres = ['supIzq', 'supDer', 'infDer', 'infIzq'];
    const medidos = nombres.map((nombre) => {
      const [mx, my] = Diseno.MARCAS[nombre];
      const r = 7 * PX_MM;
      const cx = Math.round(mx * PX_MM), cy = Math.round(my * PX_MM);
      const valores = [];
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
        if (x >= 0 && y >= 0 && x < hoja.ancho && y < hoja.alto) valores.push(hoja.gris[y * hoja.ancho + x]);
      }
      const fondo = percentil(valores, 0.9);
      let sx = 0, sy = 0, n = 0;
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= hoja.ancho || y >= hoja.alto) continue;
        if (hoja.gris[y * hoja.ancho + x] < fondo * 0.5) { sx += x; sy += y; n++; }
      }
      if (n < (Diseno.MARCA_LADO * PX_MM) ** 2 * 0.4) return [mx, my];
      return [(sx / n + 0.5) / PX_MM, (sy / n + 0.5) / PX_MM];
    });
    const ideales = nombres.map((n) => Diseno.MARCAS[n]);
    const enFoto = medidos.map(([x, y]) => aplicar(H, x, y));
    return homografia(ideales, enFoto);
  }

  // Corrige sombras y luz dispareja: estima el color del papel por zonas y lo lleva a blanco
  function normalizarLuz(img) {
    const { gris, ancho, alto } = img;
    const B = 3 * PX_MM; // bloques de 3 mm
    const bx = Math.ceil(ancho / B), by = Math.ceil(alto / B);
    const papel = new Float32Array(bx * by);
    for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
      const valores = [];
      for (let y = j * B; y < Math.min(alto, (j + 1) * B); y += 2)
        for (let x = i * B; x < Math.min(ancho, (i + 1) * B); x += 2) valores.push(gris[y * ancho + x]);
      papel[j * bx + i] = percentil(valores, 0.9);
    }
    // Mediana 3x3 de bloques: ignora bloques tapados por una marca o una marca de esquina
    const suave = new Float32Array(bx * by);
    for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
      const vec = [];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const jj = Math.min(by - 1, Math.max(0, j + dj)), ii = Math.min(bx - 1, Math.max(0, i + di));
        vec.push(papel[jj * bx + ii]);
      }
      vec.sort((a, b) => a - b);
      suave[j * bx + i] = Math.max(40, vec[4]);
    }
    const salida = new Uint8ClampedArray(gris.length);
    for (let y = 0; y < alto; y++) {
      const fy = Math.min(by - 1.001, Math.max(0, y / B - 0.5));
      const j0 = Math.floor(fy), ty = fy - j0;
      for (let x = 0; x < ancho; x++) {
        const fx = Math.min(bx - 1.001, Math.max(0, x / B - 0.5));
        const i0 = Math.floor(fx), tx = fx - i0;
        const p = (suave[j0 * bx + i0] * (1 - tx) + suave[j0 * bx + i0 + 1] * tx) * (1 - ty)
          + (suave[(j0 + 1) * bx + i0] * (1 - tx) + suave[(j0 + 1) * bx + i0 + 1] * tx) * ty;
        salida[y * ancho + x] = (gris[y * ancho + x] / p) * 240;
      }
    }
    return { gris: salida, ancho, alto };
  }

  function percentil(valores, p) {
    const orden = Float32Array.from(valores).sort();
    return orden[Math.min(orden.length - 1, Math.floor(p * orden.length))];
  }

  // ---------- Código QR ----------

  function leerQR(img, H) {
    const m = 5;
    const region = { x: Diseno.QR.x - m, y: Diseno.QR.y - m, ancho: Diseno.QR.lado + 2 * m, alto: Diseno.QR.lado + 2 * m };
    const zona = normalizarLuz(enderezar(img, H, region));
    const rgba = new Uint8ClampedArray(zona.ancho * zona.alto * 4);
    for (let i = 0; i < zona.gris.length; i++) {
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = zona.gris[i];
      rgba[i * 4 + 3] = 255;
    }
    const codigo = typeof jsQR === 'function' ? jsQR(rgba, zona.ancho, zona.alto, { inversionAttempts: 'dontInvert' }) : null;
    return codigo && codigo.data.startsWith('LO') ? interpretarQR(codigo.data) : null;
  }

  // "LO1;P=65;A=4;E=PAES-M1;S=12345678-9" -> objeto
  function interpretarQR(texto) {
    const partes = texto.split(';');
    const datos = { version: parseInt(partes[0].slice(2), 10) || 1, texto };
    for (const parte of partes.slice(1)) {
      const i = parte.indexOf('=');
      if (i > 0) datos[parte.slice(0, i)] = parte.slice(i + 1);
    }
    return {
      version: datos.version,
      preguntas: parseInt(datos.P, 10) || null,
      alternativas: parseInt(datos.A, 10) || null,
      ensayo: datos.E || '',
      estudiante: datos.S || '',
      texto,
    };
  }

  // ---------- Burbujas ----------

  // Fracción oscura dentro de una burbuja, comparada con el papel de alrededor
  function relleno(hoja, mx, my) {
    const r = Diseno.RESP.radio * PX_MM;
    const cx = mx * PX_MM, cy = my * PX_MM;
    const fondo = [];
    const dentro = [];
    const lim = Math.ceil(r * 1.6);
    for (let dy = -lim; dy <= lim; dy++) {
      for (let dx = -lim; dx <= lim; dx++) {
        const d = Math.hypot(dx, dy);
        const x = Math.round(cx + dx), y = Math.round(cy + dy);
        if (x < 0 || y < 0 || x >= hoja.ancho || y >= hoja.alto) continue;
        const g = hoja.gris[y * hoja.ancho + x];
        if (d <= r * 0.68) dentro.push(g);
        else if (d >= r * 1.25 && d <= r * 1.6) fondo.push(g);
      }
    }
    const papel = Math.max(60, percentil(fondo, 0.8));
    let oscuros = 0, suma = 0;
    for (const g of dentro) { if (g < papel * 0.62) oscuros++; suma += g; }
    return { fraccion: oscuros / dentro.length, tono: suma / dentro.length / papel };
  }

  // medidas: [{fraccion, tono}] por alternativa. tono: 0 = negro, 1 = papel
  function decidir(medidas, letras) {
    const valores = medidas.map((m) => m.fraccion);
    const orden = valores.map((v, i) => ({ v, i, tono: medidas[i].tono })).sort((a, b) => b.v - a.v);
    const [primera, segunda] = orden;
    const marcadas = orden.filter((o) => o.v >= UMBRAL.llena);
    if (marcadas.length === 0) {
      if (primera.v >= UMBRAL.duda) return { letra: letras[primera.i], estado: 'revisar', motivo: 'marca débil' };
      return { letra: '', estado: 'blanco' };
    }
    if (marcadas.length === 1) {
      if (segunda && segunda.v >= UMBRAL.duda && primera.v - segunda.v < UMBRAL.ventajaClara) {
        return { letra: letras[primera.i], estado: 'revisar', motivo: 'posible borrón' };
      }
      return { letra: letras[primera.i], estado: 'ok' };
    }
    if (primera.v - segunda.v >= UMBRAL.ventajaClara) {
      return { letra: letras[primera.i], estado: 'revisar', motivo: 'posible borrón' };
    }
    // Dos marcas rellenas: si una es claramente más oscura, la otra es probablemente un borrón
    const porTono = marcadas.slice().sort((a, b) => a.tono - b.tono);
    if (porTono[1].tono - porTono[0].tono >= UMBRAL.difTono) {
      return { letra: letras[porTono[0].i], estado: 'revisar', motivo: 'posible borrón' };
    }
    return { letra: '', estado: 'doble', motivo: 'doble marca', opciones: marcadas.map((o) => letras[o.i]) };
  }

  function leerBurbujas(hoja, preguntas, alternativas) {
    const respuestas = [];
    for (let p = 1; p <= preguntas; p++) {
      const medidas = [];
      for (let a = 0; a < alternativas; a++) {
        const [x, y] = Diseno.centroBurbuja(p, a);
        medidas.push(relleno(hoja, x, y));
      }
      respuestas.push({ ...decidir(medidas, Diseno.LETRAS), valores: medidas.map((m) => Math.round(m.fraccion * 100) / 100) });
    }
    return respuestas;
  }

  function leerNumeroLista(hoja) {
    const digitos = [];
    for (let fila = 0; fila < 2; fila++) {
      const medidas = [];
      for (let d = 0; d < 10; d++) {
        const [x, y] = Diseno.centroLista(fila, d);
        medidas.push(relleno(hoja, x, y));
      }
      const r = decidir(medidas, '0123456789');
      digitos.push(r);
    }
    if (digitos.every((d) => d.estado === 'blanco')) return null;
    if (digitos.some((d) => d.estado !== 'ok' && d.estado !== 'blanco')) return { numero: null, dudoso: true };
    const dec = digitos[0].letra || '0', uni = digitos[1].letra || '0';
    return { numero: parseInt(dec + uni, 10), dudoso: false };
  }

  // ---------- Proceso completo ----------

  /**
   * Lee una foto de la hoja.
   * imageData: ImageData de un canvas con la foto.
   * opciones.preguntas / opciones.alternativas: se usan si el QR no se puede leer.
   */
  function procesar(imageData, opciones = {}) {
    const original = aGris(imageData);
    const chica = reducir(original, MAX_LADO_BUSQUEDA);
    const marcas = buscarMarcas(chica);
    if (!marcas) {
      return { ok: false, error: 'No encontré las cuatro marcas negras de las esquinas. Fotografía la hoja completa, con buena luz y sin cortar las esquinas.' };
    }
    const enFoto = marcas.map((m) => [m.cx / chica.escala, m.cy / chica.escala]);
    const esquinasHoja = [Diseno.MARCAS.supIzq, Diseno.MARCAS.supDer, Diseno.MARCAS.infDer, Diseno.MARCAS.infIzq];

    // Probar las 4 orientaciones posibles (la foto puede venir girada); el QR dice cuál es la correcta
    const inicio = enFoto.reduce((mejor, p, i) => (p[0] + p[1] < enFoto[mejor][0] + enFoto[mejor][1] ? i : mejor), 0);
    const lado = (i) => Math.hypot(enFoto[(i + 1) % 4][0] - enFoto[i % 4][0], enFoto[(i + 1) % 4][1] - enFoto[i % 4][1]);
    // Primero las orientaciones en que el borde superior es el lado corto (hoja vertical)
    const giros = [0, 1, 2, 3].map((k) => inicio + k)
      .sort((a, b) => (lado(a) > lado(a + 1)) - (lado(b) > lado(b + 1)));

    let H = null, qr = null;
    for (const g of giros) {
      const destino = esquinasHoja.map((_, i) => enFoto[(g + i) % 4]);
      const prueba = homografia(esquinasHoja, destino);
      const leido = leerQR(original, prueba);
      if (leido) { H = prueba; qr = leido; break; }
      if (!H) H = prueba; // si ningún QR se lee, se usa la orientación más probable
    }

    H = afinar(original, H);
    if (!qr) qr = leerQR(original, H);

    const preguntas = Math.min(Diseno.RESP.max, (qr && qr.preguntas) || opciones.preguntas || Diseno.RESP.max);
    const alternativas = (qr && qr.alternativas) || opciones.alternativas || 5;
    const hoja = normalizarLuz(enderezar(original, H));
    const respuestas = leerBurbujas(hoja, preguntas, alternativas);
    const numeroLista = qr && qr.estudiante ? null : leerNumeroLista(hoja);

    return { ok: true, qr, preguntas, alternativas, respuestas, numeroLista, hoja };
  }

  // Recorte de la fila de una pregunta (para mostrarlo al revisar), como ImageData
  function recortePregunta(hoja, pregunta, alternativas) {
    const [x0, y0] = Diseno.centroBurbuja(pregunta, 0);
    const [x1] = Diseno.centroBurbuja(pregunta, alternativas - 1);
    const izq = Math.round((x0 - Diseno.RESP.radio - 8) * PX_MM);
    const der = Math.round((x1 + Diseno.RESP.radio + 2) * PX_MM);
    const arr = Math.round((y0 - 4) * PX_MM), aba = Math.round((y0 + 4) * PX_MM);
    const W = der - izq, A = aba - arr;
    const datos = new ImageData(W, A);
    for (let y = 0; y < A; y++) for (let x = 0; x < W; x++) {
      const g = hoja.gris[(arr + y) * hoja.ancho + izq + x];
      const i = (y * W + x) * 4;
      datos.data[i] = datos.data[i + 1] = datos.data[i + 2] = g;
      datos.data[i + 3] = 255;
    }
    return datos;
  }

  // Búsqueda rápida de las esquinas en un cuadro de video (para la captura automática)
  function detectar(imageData) {
    const img = reducir(aGris(imageData), 640);
    const marcas = buscarMarcas(img);
    return marcas ? marcas.map((m) => [m.cx / img.escala, m.cy / img.escala]) : null;
  }

  return { procesar, detectar, recortePregunta, interpretarQR, UMBRAL, PX_MM };
})();
