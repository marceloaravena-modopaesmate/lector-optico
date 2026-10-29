/*
 * Ejemplo de colegio: tres paralelos de II medio con tres ensayos SIMCE de Matemática ya corregidos.
 * Los datos son simulados (siempre los mismos) y quedan marcados con ejemplo: true para poder borrarlos.
 */
const Ejemplo = (() => {
  const EJES = ['Números', 'Álgebra y funciones', 'Geometría', 'Probabilidad y estadística'];
  const HABS = ['Resolver problemas', 'Modelar', 'Representar', 'Argumentar'];
  const NOMBRES = ['Agustina', 'Benjamín', 'Catalina', 'Diego', 'Emilia', 'Fernanda', 'Gaspar', 'Isidora', 'Joaquín', 'Josefa', 'Lucas', 'Martina',
    'Matías', 'Antonia', 'Tomás', 'Florencia', 'Vicente', 'Sofía', 'Maximiliano', 'Valentina', 'Ignacio', 'Amanda', 'Cristóbal', 'Trinidad', 'Felipe', 'Javiera', 'Sebastián', 'Constanza'];
  const APELLIDOS = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López',
    'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Vera', 'Lagos', 'Navarro'];
  const CURSOS = [
    { letra: 'A', media: 0.4, n: 26 },   // capacidad media (en logits) de cada paralelo
    { letra: 'B', media: -0.25, n: 25 },
    { letra: 'C', media: 0.1, n: 27 },
  ];
  const ENSAYOS = [
    { n: 1, fecha: '15-05-2026', avance: 0 },
    { n: 2, fecha: '17-07-2026', avance: 0.2 },
    { n: 3, fecha: '25-09-2026', avance: 0.38 },
  ];
  const ULTIMO_ENSAYO = 'ejemplo-SIMCE-MAT-II-3';
  const CURSO_INICIAL = 'ejemplo-IIA';

  function azar(semilla) {
    let s = semilla % 2147483647; if (s <= 0) s += 2147483646;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  async function colegio() {
    const r = azar(20261029);
    const normal = () => { const u = r() || 1e-6, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const nPreg = 30;
    // Dificultad por pregunta: Geometría más difícil; en II°B hay un contenido de Geometría que no se pasó (preguntas 17 y 19)
    const preguntas = Array.from({ length: nPreg }, (_, i) => ({
      n: i + 1, clave: 'ABCD'[Math.floor(r() * 4)], eje: EJES[Math.floor(i * 4 / nPreg)], habilidad: HABS[(i * 3 + 1) % 4], contenido: '',
      dif: (Math.floor(i * 4 / nPreg) === 2 ? 0.5 : 0) + normal() * 0.8 - 0.1,
    }));
    const cursos = CURSOS.map((c) => {
      const curso = { id: `ejemplo-II${c.letra}`, nombre: `II°${c.letra}`, nivel: 'II medio', letra: c.letra, ejemplo: true, estudiantes: [] };
      for (let k = 0; k < c.n; k++) {
        const nombre = `${NOMBRES[Math.floor(r() * NOMBRES.length)]} ${APELLIDOS[Math.floor(r() * APELLIDOS.length)]} ${APELLIDOS[Math.floor(r() * APELLIDOS.length)]}`;
        // mismo cálculo de id que la app (sin RUT: curso + N° de lista)
        curso.estudiantes.push({ lista: k + 1, nombre, rut: '', id: Almacen.id(curso.nombre) + '-' + (k + 1), theta: c.media + normal() * 0.9, ritmo: normal() * 0.25 });
      }
      return curso;
    });
    for (const curso of cursos) {
      await Almacen.guardar('cursos', curso.id, { ...curso, estudiantes: curso.estudiantes.map(({ theta, ritmo, ...e }) => e) });
    }
    for (const en of ENSAYOS) {
      const ensayo = {
        id: `ejemplo-SIMCE-MAT-II-${en.n}`, nombre: `Ensayo SIMCE Matemática II medio N°${en.n} (ejemplo)`, tipo: 'SIMCE',
        asignatura: 'SIMCE Matemática', nivel: 'II medio', fecha: en.fecha, alternativas: 4, ejemplo: true,
        creado: new Date(Date.now() - (4 - en.n) * 1000).toISOString(),
        cortes: { elemental: 0.45, adecuado: 0.7 },
        ...(en.n === 3 ? { referencia: { colegio: 0.24, similar: 0.21 } } : {}),
        preguntas: preguntas.map(({ dif, ...p }) => p),
      };
      await Almacen.guardar('ensayos', ensayo.id, ensayo);
      for (const curso of cursos) {
        const hojas = {};
        curso.estudiantes.forEach((e) => {
          const theta = e.theta + en.avance + e.ritmo * en.n + (curso.letra === 'B' && en.n === 3 ? -0.1 : 0);
          const respuestas = preguntas.map((p, i) => {
            const brecha = curso.letra === 'B' && (i === 16 || i === 18) ? 1.6 : 0;
            const pr = 1 / (1 + Math.exp(-(theta - p.dif - brecha)));
            if (r() < 0.04 + (theta < -0.8 ? 0.06 : 0)) return '';
            if (r() < pr) return p.clave;
            const otras = 'ABCD'.split('').filter((l) => l !== p.clave);
            return otras[Math.floor(r() * otras.length)];
          });
          const correctas = respuestas.filter((x, i) => x === preguntas[i].clave).length;
          hojas[e.id] = { respuestas, correctas, fecha: new Date().toISOString(), origen: 'ejemplo', cambiosManuales: 0 };
        });
        // mismo id de resultados que la app
        const id = Almacen.id(ensayo.id + '__' + curso.id);
        await Almacen.guardar('resultados', id, { ensayo: ensayo.id, curso: curso.id, hojas });
      }
    }
  }

  return { colegio, ULTIMO_ENSAYO, CURSO_INICIAL };
})();
