const test = require('node:test');
const assert = require('node:assert/strict');
const { JUGADORES, generar } = require('../tablero.js');
const {
  puntuar,
  validar,
  producir,
  puertosJugador,
  tasar,
  medir,
  evaluar
} = require('../reglas.js');

function crearEstadoPrueba(modo = 'principiante', numJugadores = 3) {
  const blanco = {
    modo,
    ladron: 0,
    ruta: null,
    ejercito: null,
    hexActivos: [],
    mensaje: '',
    banca: { madera: 19, arcilla: 19, lana: 19, trigo: 19, mineral: 19 },
    jugadores: JUGADORES.slice(0, numJugadores).map(j => ({
      ...j,
      recursos: [],
      desarrollos: [],
      caballeros: 0,
      tramo: 0,
      piezas: { carretera: 15, poblado: 5, ciudad: 4 }
    })),
    hexagonos: [],
    nodos: [],
    caminos: [],
    puertos: []
  };
  generar(modo, blanco);
  return blanco;
}

test('generar construye 19 hexagonos, 54 nodos, 72 caminos y 9 puertos sin 6 ni 8 adyacentes', () => {
  for (let i = 0; i < 15; i++) {
    const e = crearEstadoPrueba('azar', 4);
    assert.equal(e.hexagonos.length, 19);
    assert.equal(e.nodos.length, 54);
    assert.equal(e.caminos.length, 72);
    assert.equal(e.puertos.length, 9);

    const rojos = e.hexagonos.filter(h => h.numero === 6 || h.numero === 8);
    assert.equal(rojos.length, 4);
    for (let a = 0; a < rojos.length; a++) {
      for (let b = a + 1; b < rojos.length; b++) {
        const dq = Math.abs(rojos[a].q - rojos[b].q);
        const dr = Math.abs(rojos[a].r - rojos[b].r);
        const ds = Math.abs((rojos[a].q + rojos[a].r) - (rojos[b].q + rojos[b].r));
        assert.notEqual(Math.max(dq, dr, ds), 1);
      }
    }
  }
});

test('validar aplica la Regla de la Distancia y exige conexion a carretera propia', () => {
  const e = crearEstadoPrueba('principiante', 3);
  e.nodos[10].dueno = 0;
  e.nodos[10].edificio = 'poblado';

  const iniciales = validar('poblado', 1, true, e);
  assert.equal(iniciales.includes(10), false);
  e.nodos[10].vecinos.forEach(vid => {
    assert.equal(iniciales.includes(vid), false);
  });

  const sinCamino = validar('poblado', 0, false, e);
  assert.equal(sinCamino.length, 0);

  const c1 = e.nodos[10].caminos[0];
  const nodoIntermedio = e.caminos[c1].nodos.find(nid => nid !== 10);
  const c2 = e.nodos[nodoIntermedio].caminos.find(cid => cid !== c1);
  const nodoDestino = e.caminos[c2].nodos.find(nid => nid !== nodoIntermedio);

  e.caminos[c1].dueno = 0;
  e.caminos[c2].dueno = 0;

  const conCamino = validar('poblado', 0, false, e);
  assert.equal(conCamino.includes(nodoDestino), true);
});

test('producir respeta la regla oficial de escasez de la banca', () => {
  const e = crearEstadoPrueba('principiante', 3);
  const hex = e.hexagonos.find(h => h.numero === 6 && h.terreno !== 'desierto');
  const recurso = hex.terreno;
  const [nA, , nB] = hex.nodos;

  e.nodos[nA].dueno = 0;
  e.nodos[nA].edificio = 'ciudad';
  e.nodos[nB].dueno = 1;
  e.nodos[nB].edificio = 'poblado';

  e.banca[recurso] = 2;
  producir(6, false, null, e);
  assert.equal(e.jugadores[0].recursos.length, 0);
  assert.equal(e.jugadores[1].recursos.length, 0);
  assert.equal(e.banca[recurso], 2);

  e.nodos[nB].dueno = null;
  e.nodos[nB].edificio = null;
  e.banca[recurso] = 1;
  producir(6, false, null, e);
  assert.equal(e.jugadores[0].recursos.length, 1);
  assert.equal(e.banca[recurso], 0);
});

test('medir y evaluar calculan la Gran Ruta Comercial, cortes rivales y empates', () => {
  const e = crearEstadoPrueba('principiante', 3);
  const anillo = e.hexagonos[9].nodos;
  const caminosAnillo = [];
  for (let i = 0; i < 6; i++) {
    const a = anillo[i];
    const b = anillo[(i + 1) % 6];
    const cam = e.caminos.find(c => c.nodos.includes(a) && c.nodos.includes(b));
    caminosAnillo.push(cam.id);
  }

  caminosAnillo.slice(0, 5).forEach(cid => { e.caminos[cid].dueno = 0; });
  evaluar('ruta', e);
  assert.equal(e.jugadores[0].tramo, 5);
  assert.equal(e.ruta, 0);
  assert.equal(puntuar(0, false, e), 2);

  const anilloRival = e.hexagonos[0].nodos;
  for (let i = 0; i < 5; i++) {
    const a = anilloRival[i];
    const b = anilloRival[(i + 1) % 6];
    const cam = e.caminos.find(c => c.nodos.includes(a) && c.nodos.includes(b));
    cam.dueno = 1;
  }
  evaluar('ruta', e);
  assert.equal(e.jugadores[1].tramo, 5);
  assert.equal(e.ruta, 0);

  const nodoCorte = anillo[2];
  e.nodos[nodoCorte].dueno = 2;
  e.nodos[nodoCorte].edificio = 'poblado';
  evaluar('ruta', e);
  assert.equal(e.jugadores[0].tramo, 3);
  assert.equal(e.ruta, 1);
});

test('tasar exige tener poblado o ciudad en un puerto para habilitar el comercio naval', () => {
  const e = crearEstadoPrueba('principiante', 3);
  assert.equal(puertosJugador(0, e).length, 0);
  assert.equal(tasar(0, 'madera', e), null);

  const puertoGenerico = e.puertos.find(p => p.tipo === '3:1');
  const nodoGenerico = puertoGenerico.nodos[0];
  e.nodos[nodoGenerico].dueno = 0;
  e.nodos[nodoGenerico].edificio = 'poblado';
  assert.equal(tasar(0, 'madera', e), 3);
  assert.equal(tasar(0, 'mineral', e), 3);

  const puertoEspecial = e.puertos.find(p => p.tipo !== '3:1');
  const nodoEspecial = puertoEspecial.nodos[0];
  e.nodos[nodoEspecial].dueno = 0;
  e.nodos[nodoEspecial].edificio = 'ciudad';
  assert.equal(tasar(0, puertoEspecial.tipo, e), 2);
});
