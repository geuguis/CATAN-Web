const RECURSOS = ['madera', 'arcilla', 'lana', 'trigo', 'mineral'];
const NOMBRES = {
  madera: 'Madera',
  arcilla: 'Arcilla',
  lana: 'Lana',
  trigo: 'Trigo',
  mineral: 'Mineral',
  desierto: 'Desierto',
  desarrollo: 'Desarrollo'
};
const ICONOS = {
  madera: '🌲',
  arcilla: '🧱',
  lana: '🐑',
  trigo: '🌾',
  mineral: '⛰️',
  desierto: '🏜️',
  desarrollo: '📜'
};
const COLORES = {
  madera: '#15803d',
  arcilla: '#c2410c',
  lana: '#65a30d',
  trigo: '#eab308',
  mineral: '#64748b',
  desierto: '#d6b888',
  desarrollo: '#6d28d9'
};
const JUGADORES = [
  { id: 0, nombre: 'Jugador 1', color: '#ef4444' },
  { id: 1, nombre: 'Jugador 2', color: '#3b82f6' },
  { id: 2, nombre: 'Jugador 3', color: '#f8fafc' },
  { id: 3, nombre: 'Jugador 4', color: '#f97316' }
];
const COSTES = {
  carretera: { arcilla: 1, madera: 1 },
  poblado: { arcilla: 1, madera: 1, lana: 1, trigo: 1 },
  ciudad: { mineral: 3, trigo: 2 },
  desarrollo: { mineral: 1, lana: 1, trigo: 1 }
};
const DESARROLLOS = {
  caballero: { titulo: 'Caballero', icono: '⚔️', detalle: 'Mueve al ladrón y roba 1 recurso' },
  carreteras: { titulo: 'Carreteras', icono: '🛣️', detalle: 'Construye 2 carreteras gratis' },
  invento: { titulo: 'Año Abundancia', icono: '🎁', detalle: 'Toma 2 recursos de la banca' },
  monopolio: { titulo: 'Monopolio', icono: '👑', detalle: 'Reclama todo 1 tipo de recurso' },
  punto: { titulo: '1 Punto Victoria', icono: '🏛️', detalle: 'Suma 1 PV para ganar con 10' }
};

function barajar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function distribuir(coords, terrenos, base) {
  for (let intento = 0; intento < 250; intento++) {
    const mezcla = barajar(base);
    let ptr = 0;
    const resultado = terrenos.map(t => (t === 'desierto' ? null : mezcla[ptr++]));
    let valido = true;
    for (let i = 0; i < coords.length; i++) {
      if (resultado[i] !== 6 && resultado[i] !== 8) continue;
      for (let j = i + 1; j < coords.length; j++) {
        if (resultado[j] !== 6 && resultado[j] !== 8) continue;
        const dq = Math.abs(coords[i][0] - coords[j][0]);
        const dr = Math.abs(coords[i][1] - coords[j][1]);
        const ds = Math.abs((coords[i][0] + coords[i][1]) - (coords[j][0] + coords[j][1]));
        if (Math.max(dq, dr, ds) === 1) valido = false;
      }
    }
    if (valido) return resultado;
  }
  let ptr = 0;
  return terrenos.map(t => (t === 'desierto' ? null : base[ptr++]));
}

function generar(modo = 'azar', blanco = estado) {
  const radio = 52;
  const coords = [
    [0, -2], [1, -2], [2, -2],
    [-1, -1], [0, -1], [1, -1], [2, -1],
    [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
    [-2, 1], [-1, 1], [0, 1], [1, 1],
    [-2, 2], [-1, 2], [0, 2]
  ];

  const terrenosBase = [
    'mineral', 'lana', 'madera',
    'trigo', 'arcilla', 'lana', 'arcilla',
    'trigo', 'madera', 'desierto', 'madera', 'mineral',
    'madera', 'mineral', 'trigo', 'lana',
    'arcilla', 'trigo', 'lana'
  ];
  const numerosBase = [
    10, 2, 9,
    12, 6, 4, 10,
    9, 11, null, 3, 8,
    8, 3, 4, 5,
    5, 6, 11
  ];

  let terrenos = [...terrenosBase];
  let fichas = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

  if (modo === 'azar') {
    terrenos = barajar(terrenosBase);
    fichas = distribuir(coords, terrenos, fichas);
  } else {
    fichas = numerosBase;
  }

  blanco.hexagonos = [];
  blanco.nodos = [];
  blanco.caminos = [];
  blanco.puertos = [];

  const mapaNodos = new Map();
  const mapaCaminos = new Map();

  coords.forEach(([q, r], indice) => {
    const cx = radio * Math.sqrt(3) * (q + r / 2);
    const cy = radio * 1.5 * r;
    const terreno = terrenos[indice];
    const numero = fichas[indice];
    if (terreno === 'desierto') blanco.ladron = indice;

    const esquinas = [];
    for (let i = 0; i < 6; i++) {
      const angulo = (Math.PI / 180) * (60 * i - 30);
      const vx = Math.round((cx + radio * Math.cos(angulo)) * 10) / 10;
      const vy = Math.round((cy + radio * Math.sin(angulo)) * 10) / 10;
      const clave = `${ Math.round(vx) },${ Math.round(vy) }`;
      if (!mapaNodos.has(clave)) {
        const id = blanco.nodos.length;
        const nuevo = {
          id,
          x: vx,
          y: vy,
          dueno: null,
          edificio: null,
          puerto: null,
          vecinos: [],
          caminos: [],
          hexagonos: []
        };
        blanco.nodos.push(nuevo);
        mapaNodos.set(clave, nuevo);
      }
      const nodo = mapaNodos.get(clave);
      if (!nodo.hexagonos.includes(indice)) nodo.hexagonos.push(indice);
      esquinas.push(nodo);
    }

    for (let i = 0; i < 6; i++) {
      const a = esquinas[i];
      const b = esquinas[(i + 1) % 6];
      const claveCamino = a.id < b.id ? `${ a.id }-${ b.id }` : `${ b.id }-${ a.id }`;
      if (!mapaCaminos.has(claveCamino)) {
        const id = blanco.caminos.length;
        const camino = {
          id,
          nodos: [a.id, b.id],
          dueno: null,
          hexagonos: [indice]
        };
        blanco.caminos.push(camino);
        mapaCaminos.set(claveCamino, camino);
        a.vecinos.push(b.id);
        b.vecinos.push(a.id);
        a.caminos.push(id);
        b.caminos.push(id);
      } else {
        mapaCaminos.get(claveCamino).hexagonos.push(indice);
      }
    }

    blanco.hexagonos.push({
      id: indice,
      q,
      r,
      x: cx,
      y: cy,
      terreno,
      numero,
      nodos: esquinas.map(n => n.id)
    });
  });

  const costeros = blanco.caminos
    .filter(c => c.hexagonos.length === 1)
    .map(c => {
      const n1 = blanco.nodos[c.nodos[0]];
      const n2 = blanco.nodos[c.nodos[1]];
      const mx = (n1.x + n2.x) / 2;
      const my = (n1.y + n2.y) / 2;
      return { camino: c, mx, my, angulo: Math.atan2(my, mx) };
    })
    .sort((a, b) => a.angulo - b.angulo);

  const puertosBase = ['3:1', 'trigo', 'mineral', '3:1', 'lana', '3:1', '3:1', 'arcilla', 'madera'];
  const tiposPuerto = modo === 'azar' ? barajar(puertosBase) : puertosBase;
  const posiciones = [0, 3, 7, 10, 14, 17, 20, 24, 27];

  posiciones.forEach((pos, idx) => {
    const item = costeros[pos % costeros.length];
    const tipo = tiposPuerto[idx];
    item.camino.nodos.forEach(nid => {
      blanco.nodos[nid].puerto = tipo;
    });
    blanco.puertos.push({
      tipo,
      nodos: item.camino.nodos,
      x: item.mx * 1.18,
      y: item.my * 1.18
    });
  });

  return blanco;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RECURSOS,
    NOMBRES,
    ICONOS,
    COLORES,
    JUGADORES,
    COSTES,
    DESARROLLOS,
    barajar,
    distribuir,
    generar
  };
}
