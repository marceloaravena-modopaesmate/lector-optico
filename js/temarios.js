/*
 * Temarios por asignatura: ejes con sus contenidos y habilidades con una descripción breve.
 * Sirven para sugerir ejes y habilidades al crear un ensayo y para que los informes digan qué contenidos reforzar.
 * Es una estructura base según los temarios PAES (DEMRE) y las Bases Curriculares evaluadas en SIMCE.
 * Para usar el temario del colegio, cambia los textos aquí.
 */
const Temarios = (() => {
  const MAT_HABS = [
    { nombre: 'Resolver problemas', descripcion: 'elegir y aplicar una estrategia para llegar a la solución de un problema' },
    { nombre: 'Modelar', descripcion: 'traducir una situación a una expresión, ecuación, función o gráfico' },
    { nombre: 'Representar', descripcion: 'pasar la información de una forma a otra: tablas, gráficos, símbolos o figuras' },
    { nombre: 'Argumentar', descripcion: 'justificar un resultado y decidir si una afirmación es verdadera' },
  ];
  const LEC_HABS = [
    { nombre: 'Localizar', descripcion: 'encontrar información explícita en el texto' },
    { nombre: 'Interpretar', descripcion: 'inferir ideas, relacionar partes del texto y comprender su sentido global' },
    { nombre: 'Evaluar', descripcion: 'juzgar el propósito, la forma y la validez de lo que dice el texto' },
  ];
  const CIE_HABS = [
    { nombre: 'Reconocer', descripcion: 'identificar conceptos, hechos y procesos científicos' },
    { nombre: 'Comprender', descripcion: 'explicar fenómenos y relacionar conceptos entre sí' },
    { nombre: 'Aplicar', descripcion: 'usar conceptos y fórmulas en situaciones nuevas' },
    { nombre: 'Analizar, sintetizar y evaluar', descripcion: 'interpretar datos, diseños experimentales y conclusiones' },
  ];
  const HIS_HABS = [
    { nombre: 'Pensamiento temporal y espacial', descripcion: 'ubicar procesos en el tiempo y el espacio, y reconocer continuidades y cambios' },
    { nombre: 'Análisis de fuentes', descripcion: 'obtener e interpretar información de textos, imágenes, mapas y datos' },
    { nombre: 'Pensamiento crítico', descripcion: 'comparar visiones, evaluar argumentos y fundamentar una postura' },
  ];

  const T = {
    'PAES Competencia Matemática (M1)': {
      ejes: [
        { nombre: 'Números', contenidos: ['Números enteros y racionales: operatoria y orden', 'Porcentaje', 'Potencias y raíces enésimas'] },
        { nombre: 'Álgebra y funciones', contenidos: ['Expresiones algebraicas: reducción, productos notables y factorización', 'Proporcionalidad directa e inversa', 'Ecuaciones e inecuaciones de primer grado', 'Sistemas de ecuaciones lineales 2×2', 'Función lineal y afín', 'Función cuadrática'] },
        { nombre: 'Geometría', contenidos: ['Teorema de Pitágoras', 'Perímetro y área de figuras planas', 'Área y volumen de prismas y cilindros', 'Transformaciones isométricas en el plano', 'Semejanza y proporcionalidad de figuras'] },
        { nombre: 'Probabilidad y estadística', contenidos: ['Tablas y gráficos de datos', 'Medidas de tendencia central y de posición', 'Reglas de las probabilidades'] },
      ],
      habilidades: MAT_HABS,
    },
    'PAES Competencia Matemática (M2)': {
      ejes: [
        { nombre: 'Números', contenidos: ['Números reales: operatoria y orden', 'Matemática financiera', 'Logaritmos'] },
        { nombre: 'Álgebra y funciones', contenidos: ['Sistemas de ecuaciones lineales 2×2 (análisis de soluciones)', 'Función potencia', 'Funciones exponencial y logarítmica', 'Ecuaciones de segundo grado'] },
        { nombre: 'Geometría', contenidos: ['Homotecia de figuras planas', 'Razones trigonométricas en el triángulo rectángulo', 'Rectas en el plano cartesiano', 'Esfera y cono: área y volumen'] },
        { nombre: 'Probabilidad y estadística', contenidos: ['Medidas de dispersión', 'Probabilidad condicional', 'Permutaciones y combinatoria', 'Modelo binomial y distribución normal'] },
      ],
      habilidades: MAT_HABS,
    },
    'PAES Competencia Lectora': {
      ejes: [
        { nombre: 'Textos literarios', contenidos: ['Narrativa: narrador, personajes, conflicto y mundo representado', 'Lírica: hablante, figuras literarias', 'Drama: conflicto y acción dramática'] },
        { nombre: 'Textos no literarios', contenidos: ['Textos informativos y expositivos', 'Textos argumentativos: tesis, argumentos y contraargumentos', 'Textos de los medios de comunicación', 'Vocabulario contextual'] },
      ],
      habilidades: LEC_HABS,
    },
    'PAES Ciencias': {
      ejes: [
        { nombre: 'Biología', contenidos: ['Organización, estructura y actividad celular', 'Procesos y funciones biológicas', 'Herencia y evolución', 'Organismo y ambiente'] },
        { nombre: 'Química', contenidos: ['Estructura atómica y tabla periódica', 'Enlace químico', 'Química orgánica', 'Reacciones químicas y estequiometría', 'Disoluciones'] },
        { nombre: 'Física', contenidos: ['Ondas: sonido y luz', 'Mecánica: movimiento y fuerzas', 'Energía y su conservación', 'Electricidad y magnetismo', 'La Tierra y el Universo'] },
      ],
      habilidades: CIE_HABS,
    },
    'PAES Historia y Ciencias Sociales': {
      ejes: [
        { nombre: 'Historia: mundo, América y Chile', contenidos: ['Estado nación y sociedad en el siglo XIX', 'Configuración del territorio chileno', 'Crisis, totalitarismo y guerra en la primera mitad del siglo XX', 'Guerra Fría y América Latina', 'Dictadura militar y recuperación de la democracia en Chile'] },
        { nombre: 'Formación ciudadana', contenidos: ['Estado de derecho y Constitución', 'Democracia y participación', 'Derechos humanos'] },
        { nombre: 'Sistema económico', contenidos: ['El problema económico y el mercado', 'Rol del Estado en la economía', 'Educación financiera y consumo responsable'] },
      ],
      habilidades: HIS_HABS,
    },
    'SIMCE Matemática': {
      ejes: [
        { nombre: 'Números', contenidos: ['Operatoria con números enteros y racionales', 'Porcentaje', 'Potencias y raíces'] },
        { nombre: 'Álgebra y funciones', contenidos: ['Expresiones algebraicas', 'Ecuaciones e inecuaciones lineales', 'Función lineal y afín', 'Sistemas de ecuaciones'] },
        { nombre: 'Geometría', contenidos: ['Área y volumen', 'Teorema de Pitágoras', 'Transformaciones isométricas', 'Semejanza y homotecia'] },
        { nombre: 'Probabilidad y estadística', contenidos: ['Tablas y gráficos', 'Medidas de tendencia central y de posición', 'Probabilidades'] },
      ],
      habilidades: [...MAT_HABS.slice(0, 3), { nombre: 'Argumentar y comunicar', descripcion: 'explicar y justificar procedimientos y resultados' }],
    },
    'SIMCE Lectura': {
      ejes: [
        { nombre: 'Textos literarios', contenidos: ['Narraciones, poemas y obras dramáticas', 'Personajes, acciones y ambiente', 'Lenguaje figurado'] },
        { nombre: 'Textos no literarios', contenidos: ['Textos informativos', 'Textos argumentativos', 'Textos discontinuos: infografías, tablas y avisos', 'Vocabulario en contexto'] },
      ],
      habilidades: [
        { nombre: 'Localizar', descripcion: 'encontrar información explícita en el texto' },
        { nombre: 'Interpretar y relacionar', descripcion: 'inferir ideas y relacionar partes del texto' },
        { nombre: 'Reflexionar', descripcion: 'opinar sobre el contenido y la forma del texto con fundamentos' },
      ],
    },
    'SIMCE Ciencias Naturales': {
      ejes: [
        { nombre: 'Biología', contenidos: ['Célula y organismo', 'Sistemas del cuerpo humano', 'Ecosistemas', 'Genética y evolución'] },
        { nombre: 'Física', contenidos: ['Fuerza y movimiento', 'Energía', 'Ondas, luz y sonido', 'Tierra y Universo'] },
        { nombre: 'Química', contenidos: ['Materia y sus transformaciones', 'Átomo y tabla periódica', 'Reacciones químicas'] },
      ],
      habilidades: CIE_HABS,
    },
    'SIMCE Historia': {
      ejes: [
        { nombre: 'Historia', contenidos: ['Procesos históricos de Chile, América y el mundo', 'Continuidad y cambio'] },
        { nombre: 'Geografía', contenidos: ['Territorio y paisaje', 'Población y recursos', 'Lectura de mapas'] },
        { nombre: 'Formación ciudadana', contenidos: ['Democracia e instituciones', 'Derechos y deberes', 'Participación'] },
      ],
      habilidades: HIS_HABS,
    },
  };

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const NOMBRES = Object.keys(T);

  // Temario de una asignatura (busca por nombre exacto y luego por palabras clave)
  function de(asignatura) {
    if (T[asignatura]) return T[asignatura];
    const a = norm(asignatura);
    if (!a) return null;
    const pruebas = [
      [/m2|matematica 2/, 'PAES Competencia Matemática (M2)'], [/paes.*(m1|matematica)|m1/, 'PAES Competencia Matemática (M1)'],
      [/paes.*(lector|lectura)/, 'PAES Competencia Lectora'], [/paes.*historia|historia.*sociales/, 'PAES Historia y Ciencias Sociales'],
      [/paes.*ciencias/, 'PAES Ciencias'], [/matematica/, 'SIMCE Matemática'], [/lector|lectura|lenguaje/, 'SIMCE Lectura'],
      [/ciencias/, 'SIMCE Ciencias Naturales'], [/historia|geografia/, 'SIMCE Historia'],
    ];
    const m = pruebas.find(([r]) => r.test(a));
    return m ? T[m[1]] : null;
  }

  const parecido = (a, b) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
  function eje(asignatura, nombre) { const t = de(asignatura); return t ? t.ejes.find((e) => parecido(e.nombre, nombre)) || null : null; }
  function habilidad(asignatura, nombre) { const t = de(asignatura); return t ? t.habilidades.find((h) => parecido(h.nombre, nombre)) || null : null; }

  // Ejes y habilidades de un ensayo que no aparecen en el temario de su asignatura
  function revisar(ensayo) {
    const t = de(ensayo.asignatura);
    if (!t) return null;
    const ejes = [...new Set(ensayo.preguntas.map((p) => p.eje).filter(Boolean))].filter((x) => !eje(ensayo.asignatura, x));
    const habs = [...new Set(ensayo.preguntas.map((p) => p.habilidad).filter(Boolean))].filter((x) => !habilidad(ensayo.asignatura, x));
    return { ejes, habs };
  }

  return { T, NOMBRES, de, eje, habilidad, revisar, norm };
})();
