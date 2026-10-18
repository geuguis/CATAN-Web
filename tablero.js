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

function iconoSVG(tipo, clase = 'icono-svg') {
  const trazos = {
    madera: `<polygon points="12,2 5,12 9,12 4,19 20,19 15,12 19,12" fill="currentColor"/><rect x="10.5" y="19" width="3" height="3.5" fill="currentColor"/>`,
    arcilla: `<rect x="2" y="5" width="9" height="5" rx="1" fill="currentColor"/><rect x="13" y="5" width="9" height="5" rx="1" fill="currentColor"/><rect x="6" y="12" width="12" height="5" rx="1" fill="currentColor"/><rect x="2" y="19" width="8" height="3" rx="0.8" fill="currentColor"/><rect x="12" y="19" width="10" height="3" rx="0.8" fill="currentColor"/>`,
    lana: `<circle cx="9" cy="10" r="4.5" fill="currentColor"/><circle cx="15" cy="10" r="4.5" fill="currentColor"/><circle cx="12" cy="7.5" r="4.5" fill="currentColor"/><circle cx="12" cy="13" r="4.5" fill="currentColor"/><rect x="8" y="16" width="2" height="5" rx="1" fill="currentColor"/><rect x="14" y="16" width="2" height="5" rx="1" fill="currentColor"/>`,
    trigo: `<path d="M12 2v20M12 6l-4-2.5M12 6l4-2.5M12 10.5l-4.5-2.5M12 10.5l4.5-2.5M12 15l-4.5-2.5M12 15l4.5-2.5" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><ellipse cx="9" cy="6" rx="2" ry="1.2" transform="rotate(-30 9 6)" fill="currentColor"/><ellipse cx="15" cy="6" rx="2" ry="1.2" transform="rotate(30 15 6)" fill="currentColor"/><ellipse cx="8.5" cy="10.5" rx="2" ry="1.2" transform="rotate(-30 8.5 10.5)" fill="currentColor"/><ellipse cx="15.5" cy="10.5" rx="2" ry="1.2" transform="rotate(30 15.5 10.5)" fill="currentColor"/>`,
    mineral: `<polygon points="2,20 9,6 15,15 18,10 22,20" fill="currentColor"/><polygon points="9,6 12,11 6.5,11" fill="rgba(255,255,255,0.35)"/>`,
    desierto: `<path d="M2 18q5-6 10 0t10 0v3H2z" fill="currentColor"/><circle cx="17" cy="7" r="3" fill="currentColor"/>`,
    desarrollo: `<rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
    caballero: `<path d="M6 19l12-12M14 5h5v5M5 14l5 5M4 20l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    carreteras: `<path d="M4 19L9 5h6l5 14" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M12 7v3M12 14v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
    invento: `<path d="M12 3l2.6 5.4L20 9.2l-4 3.9.9 5.6L12 16l-4.9 2.7.9-5.6-4-3.9 5.4-.8z" fill="currentColor"/>`,
    monopolio: `<path d="M3 18h18l-2-10-5 4-2-6-2 6-5-4z" fill="currentColor"/>`,
    punto: `<path d="M4 19h16M6 19v-8h12v8M4 11l8-6 8 6M9 19v-5M15 19v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    puerto: `<circle cx="12" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.2v11.8M8 11h8M5 15c1.5 3.5 4.2 5 7 5s5.5-1.5 7-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
    jugadores: `<circle cx="9" cy="8" r="3.2" fill="currentColor"/><circle cx="16" cy="9" r="2.6" fill="currentColor"/><path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2M14 19c.2-2.2 1.8-4 4.2-4 1.5 0 2.8.8 3.3 2.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    banca: `<rect x="3" y="8" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M8 8V5h8v3" fill="none" stroke="currentColor" stroke-width="2"/>`,
    guia: `<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 7h8M8 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
    menu: `<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`,
    carta: `<rect x="5" y="3" width="14" height="18" rx="2.2" fill="none" stroke="currentColor" stroke-width="2.2"/><polygon points="12,8 15,12 12,16 9,12" fill="currentColor"/>`,
    ladron: `<circle cx="12" cy="7.5" r="4" fill="currentColor"/><path d="M5.5 20c.8-5.5 3.5-8 6.5-8s5.7 2.5 6.5 8z" fill="currentColor"/>`,
    trofeo: `<path d="M7 4h10v5a5 5 0 0 1-10 0V4zM4 5h3v3a3 3 0 0 1-3-3zm16 0h-3v3a3 3 0 0 0 3-3zM12 14v4M8 20h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    dado: `<rect x="3" y="3" width="18" height="18" rx="3.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.5" fill="currentColor"/>`
  };
  return `<svg class="${ clase }" viewBox="0 0 24 24" aria-hidden="true">${ trazos[tipo] || trazos.carta }</svg>`;
}

function piezaSVG(tipo, color = 'currentColor', clase = 'pieza-svg') {
  if (tipo === 'carretera') {
    return `<svg class="${ clase }" viewBox="-14 -8 28 16" aria-hidden="true">
      <rect x="-11" y="-4" width="22" height="8" rx="2" fill="${ color }" stroke="#2b1d0e" stroke-width="2"/>
    </svg>`;
  }
  if (tipo === 'ciudad') {
    return `<svg class="${ clase }" viewBox="-16 -16 32 30" aria-hidden="true">
      <polygon points="-13,10 -13,-2 -5,-13 3,-2 13,-2 13,10" fill="${ color }" stroke="#2b1d0e" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="-3" y="2" width="6" height="8" fill="rgba(43,29,14,0.45)"/>
    </svg>`;
  }
  return `<svg class="${ clase }" viewBox="-14 -15 28 28" aria-hidden="true">
    <polygon points="0,-12 10.5,-3 10.5,9.5 -10.5,9.5 -10.5,-3" fill="${ color }" stroke="#2b1d0e" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="-10.5" y1="-3" x2="10.5" y2="-3" stroke="rgba(43,29,14,0.45)" stroke-width="1.6"/>
  </svg>`;
}

const ICONOS = {
  madera: iconoSVG('madera'),
  arcilla: iconoSVG('arcilla'),
  lana: iconoSVG('lana'),
  trigo: iconoSVG('trigo'),
  mineral: iconoSVG('mineral'),
  desierto: iconoSVG('desierto'),
  desarrollo: iconoSVG('desarrollo')
};
const COLORES = {
  madera: '#15803d',
  arcilla: '#c2410c',
  lana: '#65a30d',
  trigo: '#ca8a04',
  mineral: '#475569',
  desierto: '#d6b888',
  desarrollo: '#8b5a2b'
};
const JUGADORES = [
  { id: 0, nombre: 'Jugador 1', color: '#b91c1c' },
  { id: 1, nombre: 'Jugador 2', color: '#1d4ed8' },
  { id: 2, nombre: 'Jugador 3', color: '#f5ebd6' },
  { id: 3, nombre: 'Jugador 4', color: '#d97706' }
];
const COSTES = {
  carretera: { arcilla: 1, madera: 1 },
  poblado: { arcilla: 1, madera: 1, lana: 1, trigo: 1 },
  ciudad: { mineral: 3, trigo: 2 },
  desarrollo: { mineral: 1, lana: 1, trigo: 1 }
};
const DESARROLLOS = {
  caballero: { titulo: 'Caballero', icono: iconoSVG('caballero'), detalle: 'Mueve al ladrón y roba 1 recurso' },
  carreteras: { titulo: 'Carreteras', icono: iconoSVG('carreteras'), detalle: 'Construye 2 carreteras gratis' },
  invento: { titulo: 'Año Abundancia', icono: iconoSVG('invento'), detalle: 'Toma 2 recursos de la banca' },
  monopolio: { titulo: 'Monopolio', icono: iconoSVG('monopolio'), detalle: 'Reclama todo 1 tipo de recurso' },
  punto: { titulo: '1 Punto Victoria', icono: iconoSVG('punto'), detalle: 'Suma 1 PV para ganar con 10' }
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

function miniaturaSVG(modo = 'azar') {
  const mini = { ladron: 0, hexagonos: [], nodos: [], caminos: [], puertos: [] };
  generar(modo === 'azar' ? 'azar' : 'principiante', mini);
  const radio = 52;
  let svg = `<svg class="miniatura-tablero" viewBox="-260 -235 520 470" aria-hidden="true">`;
  svg += `<circle cx="0" cy="0" r="228" fill="#082840" stroke="#d6b888" stroke-width="6"/>`;

  mini.hexagonos.forEach(h => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30);
      pts.push(`${ (h.x + radio * Math.cos(ang)).toFixed(1) },${ (h.y + radio * Math.sin(ang)).toFixed(1) }`);
    }
    svg += `<polygon points="${ pts.join(' ') }" fill="${ COLORES[h.terreno] }" stroke="#d6b888" stroke-width="3.5"/>`;
    if (h.numero) {
      const Destacado = h.numero === 6 || h.numero === 8;
      svg += `<circle cx="${ h.x.toFixed(1) }" cy="${ h.y.toFixed(1) }" r="15" fill="#f5ebd6" stroke="#2b1d0e" stroke-width="2"/>`;
      svg += `<circle cx="${ h.x.toFixed(1) }" cy="${ h.y.toFixed(1) }" r="5.5" fill="${ Destacado ? '#b91c1c' : '#2b1d0e' }"/>`;
    }
  });

  if (modo === 'rapido') {
    const muestras = [
      { nodo: 8, color: JUGADORES[0].color },
      { nodo: 14, color: JUGADORES[0].color },
      { nodo: 19, color: JUGADORES[1].color },
      { nodo: 29, color: JUGADORES[1].color },
      { nodo: 35, color: JUGADORES[2].color },
      { nodo: 42, color: JUGADORES[2].color }
    ];
    muestras.forEach(({ nodo, color }) => {
      const n = mini.nodos[nodo];
      if (!n) return;
      const cid = n.caminos[0];
      const cam = mini.caminos[cid];
      if (cam) {
        const n1 = mini.nodos[cam.nodos[0]];
        const n2 = mini.nodos[cam.nodos[1]];
        svg += `<line x1="${ n1.x }" y1="${ n1.y }" x2="${ n2.x }" y2="${ n2.y }" stroke="#2b1d0e" stroke-width="14" stroke-linecap="round"/>`;
        svg += `<line x1="${ n1.x }" y1="${ n1.y }" x2="${ n2.x }" y2="${ n2.y }" stroke="${ color }" stroke-width="9" stroke-linecap="round"/>`;
      }
      svg += `<g transform="translate(${ n.x }, ${ n.y }) scale(1.65)">
        <polygon points="0,-12 10.5,-3 10.5,9.5 -10.5,9.5 -10.5,-3" fill="${ color }" stroke="#2b1d0e" stroke-width="2.5" stroke-linejoin="round"/>
      </g>`;
    });
  }

  svg += `</svg>`;
  return svg;
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
    iconoSVG,
    piezaSVG,
    miniaturaSVG,
    barajar,
    distribuir,
    generar
  };
}
