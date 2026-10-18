const tablaGlobal = typeof RECURSOS !== 'undefined'
  ? { RECURSOS, NOMBRES, ICONOS }
  : require('./tablero.js');

function puntuar(jugadorId, ocultos = false, blanco = estado) {
  const j = blanco.jugadores[jugadorId];
  if (!j) return 0;
  let total = 0;
  blanco.nodos.forEach(n => {
    if (n.dueno === jugadorId) total += n.edificio === 'ciudad' ? 2 : 1;
  });
  if (blanco.ruta === jugadorId) total += 2;
  if (blanco.ejercito === jugadorId) total += 2;
  if (ocultos) {
    total += j.desarrollos.filter(d => d.tipo === 'punto').length;
  }
  return total;
}

function contar(lista) {
  const mapa = { madera: 0, arcilla: 0, lana: 0, trigo: 0, mineral: 0 };
  lista.forEach(r => { mapa[r] = (mapa[r] || 0) + 1; });
  return mapa;
}

function pagar(accion, jugadorId, coste, blanco = estado) {
  const mano = blanco.jugadores[jugadorId].recursos;
  if (accion === 'verificar') {
    const conteo = contar(mano);
    return Object.entries(coste).every(([rec, cant]) => (conteo[rec] || 0) >= cant);
  }
  if (accion === 'cobrar') {
    Object.entries(coste).forEach(([rec, cant]) => {
      for (let i = 0; i < cant; i++) {
        const idx = mano.indexOf(rec);
        if (idx !== -1) {
          mano.splice(idx, 1);
          blanco.banca[rec]++;
        }
      }
    });
  }
}

function validar(tipo, jugadorId, extra = null, blanco = estado) {
  if (tipo === 'poblado') {
    return blanco.nodos
      .filter(n => {
        if (n.dueno !== null) return false;
        if (n.vecinos.some(vid => blanco.nodos[vid].dueno !== null)) return false;
        if (extra === true) return true;
        return n.caminos.some(cid => blanco.caminos[cid].dueno === jugadorId);
      })
      .map(n => n.id);
  }
  if (tipo === 'carretera') {
    return blanco.caminos
      .filter(c => {
        if (c.dueno !== null) return false;
        if (extra !== null) return c.nodos.includes(extra);
        return c.nodos.some(nid => {
          const nodo = blanco.nodos[nid];
          if (nodo.dueno === jugadorId) return true;
          if (nodo.dueno !== null && nodo.dueno !== jugadorId) return false;
          return nodo.caminos.some(otroId => blanco.caminos[otroId].dueno === jugadorId);
        });
      })
      .map(c => c.id);
  }
  if (tipo === 'ciudad') {
    return blanco.nodos
      .filter(n => n.dueno === jugadorId && n.edificio === 'poblado')
      .map(n => n.id);
  }
  return [];
}

function producir(suma, diferirEntrega = false, alRecibir = null, blanco = estado) {
  const recLista = tablaGlobal.RECURSOS;
  const iconosMapa = tablaGlobal.ICONOS;
  const nombresMapa = tablaGlobal.NOMBRES;
  const nJug = blanco.jugadores.length;
  const ganancias = {
    madera: Array(nJug).fill(0),
    arcilla: Array(nJug).fill(0),
    lana: Array(nJug).fill(0),
    trigo: Array(nJug).fill(0),
    mineral: Array(nJug).fill(0)
  };
  const origenesPorRecurso = {
    madera: [],
    arcilla: [],
    lana: [],
    trigo: [],
    mineral: []
  };
  blanco.hexActivos = [];

  blanco.hexagonos.forEach(hex => {
    if (hex.numero !== suma || hex.id === blanco.ladron || hex.terreno === 'desierto') return;
    blanco.hexActivos.push(hex.id);
    hex.nodos.forEach(nid => {
      const nodo = blanco.nodos[nid];
      if (nodo.dueno !== null) {
        const cant = nodo.edificio === 'ciudad' ? 2 : 1;
        ganancias[hex.terreno][nodo.dueno] += cant;
        for (let k = 0; k < cant; k++) {
          origenesPorRecurso[hex.terreno].push({
            hexId: hex.id,
            jugadorId: nodo.dueno,
            recurso: hex.terreno
          });
        }
      }
    });
  });

  const resumen = [];
  const vuelos = [];

  recLista.forEach(rec => {
    const lista = ganancias[rec];
    const pedido = lista.reduce((a, b) => a + b, 0);
    if (pedido === 0) return;
    const beneficiados = lista.filter(c => c > 0).length;

    if (pedido <= blanco.banca[rec]) {
      lista.forEach((cant, jid) => {
        for (let i = 0; i < cant; i++) {
          blanco.banca[rec]--;
          if (!diferirEntrega) {
            blanco.jugadores[jid].recursos.push(rec);
          }
        }
        if (cant > 0) resumen.push(`${ blanco.jugadores[jid].nombre } +${ cant } ${ nombresMapa[rec] }`);
      });
      origenesPorRecurso[rec].forEach(ev => {
        vuelos.push({
          origen: `#hex-${ ev.hexId }`,
          destino: `#perfil-${ ev.jugadorId }`,
          recurso: ev.recurso,
          pausaHex: true,
          alLlegar: diferirEntrega
            ? () => {
                if (typeof alRecibir === 'function') alRecibir(ev.jugadorId, ev.recurso);
              }
            : null
        });
      });
    } else if (beneficiados === 1) {
      const jid = lista.findIndex(c => c > 0);
      const entregadas = blanco.banca[rec];
      for (let i = 0; i < entregadas; i++) {
        blanco.banca[rec]--;
        if (!diferirEntrega) {
          blanco.jugadores[jid].recursos.push(rec);
        }
        const ev = origenesPorRecurso[rec][i] || origenesPorRecurso[rec][0];
        vuelos.push({
          origen: `#hex-${ ev.hexId }`,
          destino: `#perfil-${ jid }`,
          recurso: rec,
          pausaHex: true,
          alLlegar: diferirEntrega
            ? () => {
                if (typeof alRecibir === 'function') alRecibir(jid, rec);
              }
            : null
        });
      }
      if (entregadas > 0) resumen.push(`${ blanco.jugadores[jid].nombre } +${ entregadas } ${ nombresMapa[rec] }`);
    } else {
      resumen.push(`Escasez de ${ nombresMapa[rec] }`);
    }
  });

  blanco.mensaje = resumen.length > 0
    ? `Salió ${ suma }: ${ resumen.join(' · ') }.`
    : `Salió ${ suma }: ningún terreno produjo recursos.`;

  return vuelos;
}

function puertosJugador(jugadorId, blanco = estado) {
  return [...new Set(
    blanco.nodos
      .filter(n => n.dueno === jugadorId && n.puerto)
      .map(n => n.puerto)
  )];
}

function tasar(jugadorId, recurso, blanco = estado) {
  const puertos = puertosJugador(jugadorId, blanco);
  if (puertos.includes(recurso)) return 2;
  if (puertos.includes('3:1')) return 3;
  return null;
}

function medir(jugadorId, blanco = estado) {
  const propios = blanco.caminos.filter(c => c.dueno === jugadorId);
  let mejor = 0;

  function explorar(nodoActual, usados) {
    if (usados.size > mejor) mejor = usados.size;
    const nodo = blanco.nodos[nodoActual];
    if (usados.size > 0 && nodo.dueno !== null && nodo.dueno !== jugadorId) return;

    nodo.caminos.forEach(cid => {
      const cam = blanco.caminos[cid];
      if (cam.dueno === jugadorId && !usados.has(cid)) {
        const siguiente = cam.nodos[0] === nodoActual ? cam.nodos[1] : cam.nodos[0];
        usados.add(cid);
        explorar(siguiente, usados);
        usados.delete(cid);
      }
    });
  }

  propios.forEach(c => {
    explorar(c.nodos[0], new Set([c.id]));
    explorar(c.nodos[1], new Set([c.id]));
  });

  return mejor;
}

function evaluar(insignia, blanco = estado) {
  if (insignia === 'ejercito') {
    const actual = blanco.ejercito;
    const minimo = actual !== null ? blanco.jugadores[actual].caballeros + 1 : 3;
    blanco.jugadores.forEach(j => {
      if (j.caballeros >= minimo) {
        blanco.ejercito = j.id;
      }
    });
  }

  if (insignia === 'ruta') {
    blanco.jugadores.forEach(j => {
      j.tramo = medir(j.id, blanco);
    });
    const maximo = Math.max(...blanco.jugadores.map(j => j.tramo));
    if (maximo < 5) {
      blanco.ruta = null;
      return;
    }
    const lideres = blanco.jugadores.filter(j => j.tramo === maximo).map(j => j.id);
    if (lideres.length === 1) {
      blanco.ruta = lideres[0];
    } else if (!lideres.includes(blanco.ruta)) {
      blanco.ruta = null;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    puntuar,
    contar,
    pagar,
    validar,
    producir,
    puertosJugador,
    tasar,
    medir,
    evaluar
  };
}
