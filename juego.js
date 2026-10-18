if (typeof RECURSOS === 'undefined' && typeof require !== 'undefined') {
  Object.assign(globalThis, require('./tablero.js'), require('./reglas.js'), require('./animaciones.js'));
}

let estado = {};
let modoElegido = 'azar';
let cantidadJugadores = 3;
let temporizadorEnfriamiento = null;
let idPartida = 0;
const CLAVE_GUARDADO = 'catan_partida_local_v1';

function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function voltear(elemento, evento) {
  if (evento) evento.stopPropagation();
  if (elemento) elemento.classList.toggle('revelada-tactil');
}

function guardar() {
  try {
    if (typeof localStorage === 'undefined' || !estado || !estado.jugadores) return;
    if (estado.fase === 'fin') {
      localStorage.removeItem(CLAVE_GUARDADO);
      return;
    }
    const instantanea = {
      modoElegido,
      cantidadJugadores: estado.jugadores.length,
      estado: {
        ...estado,
        enfriamiento: false,
        repartiendo: false,
        girandoDados: false
      }
    };
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(instantanea));
    const botonGuardada = typeof document !== 'undefined' ? document.getElementById('botonGuardada') : null;
    if (botonGuardada) botonGuardada.classList.remove('oculto');
  } catch (_) {}
}

function cargar(accion = 'verificar') {
  try {
    if (typeof localStorage === 'undefined') return false;
    const bruto = localStorage.getItem(CLAVE_GUARDADO);
    if (!bruto) return false;
    const datos = JSON.parse(bruto);
    if (!datos || !datos.estado || !Array.isArray(datos.estado.jugadores)) return false;
    if (accion === 'verificar') return true;

    idPartida++;
    if (temporizadorEnfriamiento) clearTimeout(temporizadorEnfriamiento);
    const capa = typeof document !== 'undefined' ? document.getElementById('capaAnimacion') : null;
    if (capa) capa.innerHTML = '';

    modoElegido = datos.modoElegido || 'azar';
    cantidadJugadores = datos.cantidadJugadores || datos.estado.jugadores.length;
    estado = datos.estado;
    estado.enfriamiento = false;
    estado.repartiendo = false;
    estado.girandoDados = false;

    const inicioEl = document.getElementById('inicio');
    const continuarEl = document.getElementById('botonContinuar');
    if (inicioEl) inicioEl.classList.add('oculto');
    if (continuarEl) continuarEl.classList.remove('oculto');
    cerrar();
    dibujar('todo');
    if (estado.fase === 'descarte') abrir('descarte');
    if (estado.fase === 'robo') abrir('robo');
    return true;
  } catch (_) {
    return false;
  }
}

function enfriar(ms = 1000) {
  const tieneDomReal = typeof window !== 'undefined' && document.getElementById('lienzo') && document.getElementById('lienzo').getBoundingClientRect;
  if (!tieneDomReal) return;
  estado.enfriamiento = true;
  if (temporizadorEnfriamiento) clearTimeout(temporizadorEnfriamiento);
  dibujar('panel');
  temporizadorEnfriamiento = setTimeout(() => {
    estado.enfriamiento = false;
    dibujar('panel');
  }, ms);
}

function cambiarCantidad() {
  cantidadJugadores = cantidadJugadores === 3 ? 4 : 3;
  const contador = document.getElementById('contadorJugadores');
  const bloque3 = document.getElementById('bloqueJugador3');
  const botonExtra = document.getElementById('botonJugadorExtra');
  if (contador) contador.textContent = String(cantidadJugadores);
  if (bloque3) bloque3.classList.toggle('oculto', cantidadJugadores === 3);
  if (botonExtra) {
    botonExtra.textContent = cantidadJugadores === 3
      ? '➕ Añadir 4.º Jugador'
      : '➖ Quitar 4.º Jugador';
  }
}

function configurar(modo) {
  modoElegido = modo;
  ['azar', 'principiante', 'rapido'].forEach(m => {
    const el = document.getElementById(`modo-${ m }`);
    if (el) el.classList.toggle('activo', m === modo);
  });
}

function iniciar() {
  for (let i = 0; i < 4; i++) {
    const campo = document.getElementById(`nombre${ i }`);
    if (campo && campo.value.trim()) {
      JUGADORES[i].nombre = campo.value.trim().slice(0, 16);
    }
  }
  const inicioEl = document.getElementById('inicio');
  const continuarEl = document.getElementById('botonContinuar');
  if (inicioEl) inicioEl.classList.add('oculto');
  if (continuarEl) continuarEl.classList.remove('oculto');
  reiniciar(modoElegido);
}

function alternar(panel) {
  const inicioEl = document.getElementById('inicio');
  const reservaEl = document.getElementById('panelReserva') || document.getElementById('cajonReserva');
  const guiaEl = document.getElementById('panelGuia') || document.getElementById('cajonGuia');

  if (panel === 'inicio' && inicioEl) {
    cerrar();
    inicioEl.classList.toggle('oculto');
  } else if (panel === 'reserva' && reservaEl) {
    if (guiaEl) guiaEl.classList.add('oculto');
    reservaEl.classList.toggle('oculto');
  } else if (panel === 'guia' && guiaEl) {
    if (reservaEl) reservaEl.classList.add('oculto');
    guiaEl.classList.toggle('oculto');
  }
}

function terminar() {
  if (!estado.jugadores || estado.jugadores.length === 0) return;
  const maxPuntos = Math.max(...estado.jugadores.map(j => puntuar(j.id, true)));
  const empatados = estado.jugadores.filter(j => puntuar(j.id, true) === maxPuntos);

  if (empatados.length === 1) {
    estado.fase = 'fin';
    estado.ganador = empatados[0].id;
    estado.mensaje = `Partida finalizada: gana ${ empatados[0].nombre } con ${ maxPuntos } PV.`;
    guardar();
    dibujar('todo');
    abrir('victoria');
  } else {
    estado.desempate = {
      candidatos: empatados.map(j => j.id),
      maxPuntos,
      tiradas: {},
      rodando: false,
      ganador: null
    };
    abrir('desempate');
  }
}

function desempatar() {
  if (!estado.desempate || estado.desempate.rodando) return;
  const d = estado.desempate;
  d.rodando = true;
  d.ganador = null;

  const generarTiradasUnicas = () => {
    let intento = 0;
    while (intento < 100) {
      intento++;
      const mapa = {};
      let maxSuma = -1;
      d.candidatos.forEach(jid => {
        const a = Math.floor(Math.random() * 6) + 1;
        const b = Math.floor(Math.random() * 6) + 1;
        mapa[jid] = [a, b, a + b];
        if (a + b > maxSuma) maxSuma = a + b;
      });
      const lideres = d.candidatos.filter(jid => mapa[jid][2] === maxSuma);
      if (lideres.length === 1) {
        return { mapa, ganador: lideres[0] };
      }
    }
    const mapa = {};
    d.candidatos.forEach((jid, idx) => {
      const a = Math.min(6, idx + 2);
      const b = Math.min(6, idx + 3);
      mapa[jid] = [a, b, a + b];
    });
    return { mapa, ganador: d.candidatos[d.candidatos.length - 1] };
  };

  const resultadoFinal = generarTiradasUnicas();
  const tieneDomReal = typeof window !== 'undefined' && document.getElementById('lienzo') && document.getElementById('lienzo').getBoundingClientRect;

  if (!tieneDomReal) {
    d.rodando = false;
    d.tiradas = resultadoFinal.mapa;
    d.ganador = resultadoFinal.ganador;
    estado.fase = 'fin';
    estado.ganador = d.ganador;
    guardar();
    abrir('desempate');
    return;
  }

  let pasos = 0;
  const intervalo = setInterval(() => {
    pasos++;
    d.candidatos.forEach(jid => {
      const a = Math.floor(Math.random() * 6) + 1;
      const b = Math.floor(Math.random() * 6) + 1;
      d.tiradas[jid] = [a, b, a + b];
    });
    abrir('desempate');
    if (pasos >= 9) {
      clearInterval(intervalo);
      d.rodando = false;
      d.tiradas = resultadoFinal.mapa;
      d.ganador = resultadoFinal.ganador;
      estado.fase = 'fin';
      estado.ganador = d.ganador;
      const nom = estado.jugadores[d.ganador].nombre;
      estado.mensaje = `¡${ nom } gana el desempate con un ${ d.tiradas[d.ganador][2] } en los dados!`;
      guardar();
      dibujar('todo');
      abrir('desempate');
    }
  }, 95);
}

function reiniciar(modo = 'azar') {
  idPartida++;
  if (temporizadorEnfriamiento) clearTimeout(temporizadorEnfriamiento);
  const capa = typeof document !== 'undefined' ? document.getElementById('capaAnimacion') : null;
  if (capa) capa.innerHTML = '';
  const mazo = barajar([
    ...Array(14).fill('caballero'),
    ...Array(2).fill('carreteras'),
    ...Array(2).fill('invento'),
    ...Array(2).fill('monopolio'),
    ...Array(5).fill('punto')
  ]);

  const activos = JUGADORES.slice(0, cantidadJugadores);
  const secuencia = cantidadJugadores === 3
    ? [0, 1, 2, 2, 1, 0]
    : [0, 1, 2, 3, 3, 2, 1, 0];

  estado = {
    modo,
    ronda: 1,
    turno: 0,
    indice: 0,
    secuencia,
    etapa: 'poblado',
    origen: null,
    fase: 'inicial',
    previa: null,
    tirado: false,
    usado: false,
    enfriamiento: false,
    repartiendo: false,
    herramienta: null,
    gratis: 0,
    dados: ['-', '-'],
    girandoDados: false,
    hexActivos: [],
    recienCreada: null,
    banca: { madera: 19, arcilla: 19, lana: 19, trigo: 19, mineral: 19 },
    mazo,
    ladron: 0,
    ruta: null,
    ejercito: null,
    descartes: [],
    marcadas: [],
    robo: null,
    comercio: null,
    invento: null,
    desempate: null,
    ganador: null,
    mensaje: `Haz clic en un círculo blanco del mapa para colocar tu primer poblado.`,
    jugadores: activos.map(j => ({
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

  generar(modo, estado);
  if (modo === 'rapido') {
    while (estado.fase === 'inicial') {
      const nValidos = validar('poblado', estado.turno, true);
      construir('poblado', nValidos[Math.floor(Math.random() * nValidos.length)]);
      const cValidos = validar('carretera', estado.turno, estado.origen);
      construir('carretera', cValidos[0]);
    }
    estado.recienCreada = null;
  }
  cerrar();
  guardar();
  dibujar('todo');
}

function ganar() {
  const total = puntuar(estado.turno, true);
  if (total >= 10 && estado.fase !== 'fin') {
    estado.fase = 'fin';
    estado.ganador = estado.turno;
    estado.mensaje = `¡${ estado.jugadores[estado.turno].nombre } alcanza ${ total } puntos de victoria y gana la partida!`;
    guardar();
    dibujar('todo');
    abrir('victoria');
    return true;
  }
  return false;
}

function seleccionar(tipo) {
  if (estado.fase !== 'principal') return;
  const j = estado.jugadores[estado.turno];
  if (tipo === 'carretera' && estado.gratis > 0) {
    estado.herramienta = 'carretera';
    estado.mensaje = `Haz clic en un camino iluminado (${ estado.gratis } gratis restante).`;
    dibujar('todo');
    return;
  }
  if (j.piezas[tipo] <= 0) {
    estado.mensaje = `No te quedan piezas de ${ tipo } en tu reserva.`;
    dibujar('panel');
    return;
  }
  if (!pagar('verificar', estado.turno, COSTES[tipo])) {
    estado.mensaje = `No tienes recursos suficientes para construir ${ tipo }.`;
    dibujar('panel');
    return;
  }
  const opciones = validar(tipo, estado.turno, tipo === 'poblado' ? false : null);
  if (opciones.length === 0) {
    estado.mensaje = `No tienes posiciones conectadas válidas para colocar ${ tipo }.`;
    dibujar('panel');
    return;
  }

  estado.herramienta = estado.herramienta === tipo ? null : tipo;
  estado.mensaje = estado.herramienta
    ? `Haz clic en una posición iluminada del mapa para colocar tu ${ tipo }.`
    : 'Elige una acción inferior o termina tu turno.';
  dibujar('todo');
}

function construir(tipo, id) {
  const j = estado.jugadores[estado.turno];
  const numJugadores = estado.jugadores.length;

  if (estado.fase === 'inicial') {
    if (tipo === 'poblado' && estado.etapa === 'poblado') {
      const validos = validar('poblado', estado.turno, true);
      if (!validos.includes(id)) return;
      const nodo = estado.nodos[id];
      nodo.dueno = estado.turno;
      nodo.edificio = 'poblado';
      j.piezas.poblado--;
      estado.origen = id;
      estado.etapa = 'carretera';
      estado.recienCreada = { tipo: 'nodo', id };

      const vuelosIniciales = [];
      if (estado.indice >= numJugadores) {
        nodo.hexagonos.forEach(hid => {
          const hex = estado.hexagonos[hid];
          if (hex.terreno !== 'desierto' && estado.banca[hex.terreno] > 0) {
            estado.banca[hex.terreno]--;
            j.recursos.push(hex.terreno);
            if (estado.modo !== 'rapido') {
              vuelosIniciales.push({
                origen: `#hex-${ hid }`,
                destino: `#perfil-${ j.id }`,
                recurso: hex.terreno,
                pausaHex: true
              });
            }
          }
        });
      }
      estado.mensaje = `Ahora haz clic en una línea blanca junto a tu poblado para colocar tu carretera.`;
      guardar();
      dibujar('todo');
      if (vuelosIniciales.length > 0) {
        animar('lote', { lista: vuelosIniciales });
      }
    } else if (tipo === 'carretera' && estado.etapa === 'carretera') {
      const validos = validar('carretera', estado.turno, estado.origen);
      if (!validos.includes(id)) return;
      estado.caminos[id].dueno = estado.turno;
      j.piezas.carretera--;
      estado.recienCreada = { tipo: 'camino', id };
      evaluar('ruta');

      estado.indice++;
      if (estado.indice < estado.secuencia.length) {
        estado.turno = estado.secuencia[estado.indice];
        estado.etapa = 'poblado';
        estado.origen = null;
        estado.mensaje = `Haz clic en un círculo blanco del mapa para colocar tu ${ estado.indice >= numJugadores ? 'segundo' : 'primer' } poblado.`;
      } else {
        estado.turno = 0;
        estado.fase = 'tirada';
        estado.etapa = null;
        estado.origen = null;
        estado.mensaje = `¡Comienza la partida! Pulsa "Lanzar Dados" para producir recursos.`;
      }
      guardar();
      dibujar('todo');
    }
    return;
  }

  if (estado.fase !== 'principal') return;

  if (tipo === 'carretera') {
    const validos = validar('carretera', estado.turno, null);
    if (!validos.includes(id)) return;
    if (estado.gratis > 0) {
      estado.caminos[id].dueno = estado.turno;
      j.piezas.carretera--;
      estado.recienCreada = { tipo: 'camino', id };
      estado.gratis--;
      evaluar('ruta');
      if (estado.gratis === 0 || j.piezas.carretera === 0 || validar('carretera', estado.turno, null).length === 0) {
        estado.gratis = 0;
        estado.herramienta = null;
        if (estado.previa === 'tirada') {
          estado.fase = 'tirada';
          estado.mensaje = `Carreteras colocadas. Pulsa "Lanzar Dados" para continuar tu turno.`;
        } else {
          estado.mensaje = `Carreteras gratuitas completadas.`;
        }
        estado.previa = null;
      } else {
        estado.mensaje = `Te queda 1 carretera gratuita por colocar.`;
      }
    } else {
      if (!pagar('verificar', estado.turno, COSTES.carretera) || j.piezas.carretera <= 0) return;
      pagar('cobrar', estado.turno, COSTES.carretera);
      estado.caminos[id].dueno = estado.turno;
      j.piezas.carretera--;
      estado.recienCreada = { tipo: 'camino', id };
      estado.herramienta = null;
      evaluar('ruta');
      estado.mensaje = `Carretera construida.`;
    }
  } else if (tipo === 'poblado') {
    const validos = validar('poblado', estado.turno, false);
    if (!validos.includes(id)) return;
    if (!pagar('verificar', estado.turno, COSTES.poblado) || j.piezas.poblado <= 0) return;
    pagar('cobrar', estado.turno, COSTES.poblado);
    estado.nodos[id].dueno = estado.turno;
    estado.nodos[id].edificio = 'poblado';
    j.piezas.poblado--;
    estado.recienCreada = { tipo: 'nodo', id };
    estado.herramienta = null;
    evaluar('ruta');
    estado.mensaje = `Poblado construido (+1 PV).`;
  } else if (tipo === 'ciudad') {
    const validos = validar('ciudad', estado.turno);
    if (!validos.includes(id)) return;
    if (!pagar('verificar', estado.turno, COSTES.ciudad) || j.piezas.ciudad <= 0) return;
    pagar('cobrar', estado.turno, COSTES.ciudad);
    estado.nodos[id].edificio = 'ciudad';
    j.piezas.ciudad--;
    j.piezas.poblado++;
    estado.recienCreada = { tipo: 'nodo', id };
    estado.herramienta = null;
    estado.mensaje = `Poblado mejorado a Ciudad (+1 PV adicional).`;
  }

  guardar();
  if (!ganar()) dibujar('todo');
}

function comprar() {
  if (estado.fase !== 'principal') return;
  if (estado.mazo.length === 0) {
    estado.mensaje = 'El mazo de cartas de desarrollo está agotado.';
    dibujar('panel');
    return;
  }
  if (!pagar('verificar', estado.turno, COSTES.desarrollo)) {
    estado.mensaje = 'Necesitas 1 Mineral, 1 Lana y 1 Trigo para comprar desarrollo.';
    dibujar('panel');
    return;
  }
  pagar('cobrar', estado.turno, COSTES.desarrollo);
  const tipo = estado.mazo.pop();
  estado.jugadores[estado.turno].desarrollos.push({
    tipo,
    comprada: estado.ronda
  });
  estado.herramienta = null;
  estado.mensaje = `Carta de desarrollo añadida a tu atril (pasa el ratón o toca para verla).`;
  guardar();
  if (!ganar()) {
    dibujar('todo');
    animar('vuelo', {
      origen: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      destino: `#perfil-${ estado.turno }`,
      recurso: 'desarrollo',
      demora: 0
    });
  }
}

function usar(indice) {
  if (estado.fase !== 'tirada' && estado.fase !== 'principal') return;
  const j = estado.jugadores[estado.turno];
  const carta = j.desarrollos[indice];
  if (!carta) return;
  if (carta.tipo === 'punto') {
    if (!ganar()) {
      estado.mensaje = 'Las cartas de Punto de Victoria se suman automáticamente para ganar al llegar a 10 PV.';
      dibujar('panel');
    }
    return;
  }
  if (estado.usado) {
    estado.mensaje = 'Solo se permite jugar 1 carta de desarrollo por turno.';
    dibujar('panel');
    return;
  }
  if (carta.comprada === estado.ronda) {
    estado.mensaje = 'No puedes jugar una carta de desarrollo en el mismo turno que la compraste.';
    dibujar('panel');
    return;
  }

  j.desarrollos.splice(indice, 1);
  estado.usado = true;
  estado.herramienta = null;

  if (carta.tipo === 'caballero') {
    j.caballeros++;
    evaluar('ejercito');
    if (ganar()) return;
    estado.previa = estado.fase;
    estado.fase = 'ladron';
    estado.mensaje = `Caballero activado: haz clic en cualquier otro hexágono para mover al ladrón.`;
    guardar();
    dibujar('todo');
  } else if (carta.tipo === 'carreteras') {
    estado.previa = estado.fase;
    estado.fase = 'principal';
    estado.gratis = Math.min(2, j.piezas.carretera);
    if (estado.gratis > 0 && validar('carretera', estado.turno, null).length > 0) {
      estado.herramienta = 'carretera';
      estado.mensaje = 'Haz clic en 2 caminos iluminados para colocar tus carreteras gratuitas.';
    } else {
      estado.gratis = 0;
      estado.fase = estado.previa;
      estado.previa = null;
      estado.mensaje = 'No tienes caminos disponibles para colocar carreteras.';
    }
    guardar();
    dibujar('todo');
  } else if (carta.tipo === 'invento') {
    abrir('invento');
  } else if (carta.tipo === 'monopolio') {
    abrir('monopolio');
  }
}

function lanzar() {
  if (estado.fase !== 'tirada' || estado.tirado || estado.enfriamiento) return;
  const partidaActual = idPartida;
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const suma = d1 + d2;
  estado.tirado = true;
  estado.girandoDados = true;
  estado.repartiendo = true;
  estado.recienCreada = null;
  estado.hexActivos = [];
  estado.dados = ['🎲', '🎲'];
  estado.mensaje = '🎲 Lanzando los dados...';
  enfriar(1000);
  dibujar('panel');

  animar('dados', {
    d1,
    d2,
    alTerminar: () => {
      if (partidaActual !== idPartida) return;
      estado.girandoDados = false;
      estado.dados = [d1, d2];

      if (suma === 7) {
        estado.repartiendo = false;
        estado.hexActivos = [];
        const afectados = estado.jugadores
          .filter(j => j.recursos.length > 7)
          .map(j => ({ id: j.id, cantidad: Math.floor(j.recursos.length / 2) }));

        if (afectados.length > 0) {
          estado.descartes = afectados;
          estado.marcadas = [];
          estado.fase = 'descarte';
          estado.mensaje = `¡Salió un 7! Los jugadores con más de 7 cartas deben descartar la mitad.`;
          guardar();
          dibujar('todo');
          abrir('descarte');
        } else {
          estado.previa = 'principal';
          estado.fase = 'ladron';
          estado.mensaje = `¡Salió un 7! Haz clic en cualquier otro hexágono para mover al ladrón.`;
          guardar();
          dibujar('todo');
        }
      } else {
        estado.fase = 'principal';
        const tieneAnimacion = Boolean(
          typeof window !== 'undefined' &&
          document.getElementById('capaAnimacion') &&
          typeof Element !== 'undefined' &&
          Element.prototype.animate
        );
        const vuelos = producir(
          suma,
          tieneAnimacion,
          (jid, rec) => {
            if (partidaActual !== idPartida) return;
            estado.jugadores[jid].recursos.push(rec);
            guardar();
            dibujar('panel');
          },
          estado
        );
        guardar();
        if (vuelos.length > 0) {
          dibujar('todo');
          animar('lote', {
            lista: vuelos,
            alTerminar: () => {
              if (partidaActual !== idPartida) return;
              estado.repartiendo = false;
              estado.hexActivos = [];
              guardar();
              dibujar('todo');
            }
          });
        } else {
          estado.repartiendo = false;
          dibujar('todo');
        }
      }
    }
  });
}

function mover(hexId) {
  if (estado.fase !== 'ladron') return;
  if (hexId === estado.ladron) {
    estado.mensaje = 'Elige un hexágono distinto al que ocupa actualmente el ladrón.';
    dibujar('panel');
    return;
  }

  const hexAnterior = estado.ladron;
  estado.ladron = hexId;
  estado.recienCreada = { tipo: 'ladron', id: hexId };

  const victimas = [];
  estado.hexagonos[hexId].nodos.forEach(nid => {
    const dueno = estado.nodos[nid].dueno;
    if (
      dueno !== null &&
      dueno !== estado.turno &&
      estado.jugadores[dueno].recursos.length > 0 &&
      !victimas.includes(dueno)
    ) {
      victimas.push(dueno);
    }
  });

  if (victimas.length === 0) {
    estado.fase = estado.previa || 'principal';
    estado.previa = null;
    estado.mensaje = `Ladrón movido. Ningún rival adyacente tiene recursos para robar.`;
    guardar();
    dibujar('todo');
  } else if (victimas.length === 1) {
    robar('iniciar', victimas[0]);
  } else {
    estado.robo = {
      victimas,
      victima: null,
      tapadas: false,
      revelada: null,
      bloqueado: false
    };
    estado.fase = 'robo';
    guardar();
    dibujar('todo');
    abrir('robo');
  }

  animar('ladron', {
    origen: `#hex-${ hexAnterior }`,
    destino: `#hex-${ hexId }`
  });
}

function robar(paso, valor) {
  if (paso === 'iniciar') {
    estado.robo = {
      victimas: [valor],
      victima: valor,
      tapadas: false,
      revelada: null,
      bloqueado: false
    };
    estado.fase = 'robo';
    guardar();
    dibujar('todo');
    abrir('robo');
  } else if (paso === 'tomar') {
    if (!estado.robo || !estado.robo.tapadas || estado.robo.bloqueado) return;
    estado.robo.bloqueado = true;
    estado.robo.revelada = valor;
    abrir('robo');

    const cartaEl = document.getElementById(`carta-robo-${ valor }`);
    const origenCoord = ubicar(cartaEl);
    const victima = estado.jugadores[estado.robo.victima];
    const activo = estado.jugadores[estado.turno];
    const [robada] = victima.recursos.splice(valor, 1);
    if (robada) activo.recursos.push(robada);
    const turnoRobo = estado.turno;

    const finalizar = () => {
      estado.robo = null;
      estado.fase = estado.previa || 'principal';
      estado.previa = null;
      estado.mensaje = `${ activo.nombre } robó 1 ${ ICONOS[robada] } ${ NOMBRES[robada] } a ${ victima.nombre }.`;
      cerrar();
      guardar();
      dibujar('todo');
      animar('vuelo', {
        origen: origenCoord,
        destino: `#perfil-${ turnoRobo }`,
        recurso: robada,
        demora: 0
      });
    };

    if (typeof window !== 'undefined' && window.document && cartaEl && cartaEl.getBoundingClientRect) {
      setTimeout(finalizar, 1100);
    } else {
      finalizar();
    }
  }
}

function ordenar(accion, indice = 0, direccion = 0) {
  if (!estado.robo) return;
  const victima = estado.jugadores[estado.robo.victima];
  if (accion === 'mover' && !estado.robo.tapadas) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= victima.recursos.length) return;
    [victima.recursos[indice], victima.recursos[destino]] = [victima.recursos[destino], victima.recursos[indice]];
  } else if (accion === 'mezclar' && !estado.robo.tapadas) {
    victima.recursos = barajar(victima.recursos);
  } else if (accion === 'tapar') {
    estado.robo.tapadas = true;
  }
  guardar();
  abrir('robo');
}

function pasar() {
  if (estado.fase !== 'principal' || estado.gratis > 0 || estado.enfriamiento || estado.repartiendo) return;
  if (ganar()) return;
  estado.turno = (estado.turno + 1) % estado.jugadores.length;
  estado.ronda++;
  estado.fase = 'tirada';
  estado.tirado = false;
  estado.usado = false;
  estado.repartiendo = false;
  estado.herramienta = null;
  estado.recienCreada = null;
  estado.hexActivos = [];
  estado.dados = ['-', '-'];
  estado.mensaje = `Pulsa "Lanzar Dados" para iniciar la producción de recursos.`;
  enfriar(1000);
  guardar();
  if (!ganar()) dibujar('todo');
}

function abrir(ventanaNombre) {
  const ventana = document.getElementById('ventana');
  const caja = document.getElementById('contenidoVentana');
  ventana.classList.remove('oculto');
  const activo = estado.jugadores[estado.turno];

  if (ventanaNombre === 'menu') {
    caja.innerHTML = `
      <h2>☰ Menú de la Partida</h2>
      <p>La partida está en pausa. Elige una opción:</p>
      <div class="lista-menu-pausa">
        <button class="primario" onclick="cerrar()">
          <span>↩️ Volver Atrás (Continuar Jugando)</span>
          <span>▶</span>
        </button>
        <button onclick="window.open('catan_base_rules_2020.pdf', '_blank')">
          <span>📖 Abrir PDF Oficial de Reglas</span>
          <span>↗</span>
        </button>
        <button class="peligro" onclick="terminar()">
          <span>🏁 Terminar Partida Ahora (Gana quien tenga más PV)</span>
          <span>🏆</span>
        </button>
        <button onclick="alternar('inicio')">
          <span>⚙️ Configurar Nueva Mesa / Jugadores</span>
          <span>👥</span>
        </button>
      </div>
    `;
  } else if (ventanaNombre === 'desempate') {
    const d = estado.desempate;
    if (!d) { cerrar(); return; }
    caja.innerHTML = `
      <h2>🎲 Duelo de Dados por Desempate</h2>
      <p>Hay un empate en cabeza con <strong>${ d.maxPuntos } PV</strong>. ¡Lanzad los dados y el que saque la suma más alta gana la partida!</p>
      <div class="jugadores">
        ${ d.candidatos.map(jid => {
          const j = estado.jugadores[jid];
          const t = d.tiradas[jid];
          const esGanador = d.ganador === jid;
          return `
            <div class="fila-jugador ${ esGanador ? 'ganador-duelo' : '' }">
              <div class="fila-cabecera">
                <span><span class="punto-color" style="background:${ j.color }"></span> ${ escapar(j.nombre) } (${ puntuar(jid, true) } PV)</span>
                <strong>${ t ? `Suma: ${ t[2] } ${ esGanador ? '🏆' : '' }` : 'Listo para tirar' }</strong>
              </div>
              <div class="dados-duelo">
                <div class="dado-grande ${ d.rodando ? 'agitando' : '' }">${ t ? t[0] : '?' }</div>
                <div class="dado-grande rojo ${ d.rodando ? 'agitando' : '' }">${ t ? t[1] : '?' }</div>
              </div>
            </div>
          `;
        }).join('') }
      </div>
      <div class="acciones-ventana">
        ${ d.ganador === null
          ? `<button class="primario" ${ d.rodando ? 'disabled' : '' } onclick="desempatar()">${ d.rodando ? '🎲 Rodando dados...' : '🎲 Lanzar Dados de Desempate' }</button>`
          : `<button class="exito" onclick="abrir('victoria')">🏆 Ver Clasificación Final</button>`
        }
      </div>
    `;
  } else if (ventanaNombre === 'descarte') {
    const actual = estado.descartes[0];
    const j = estado.jugadores[actual.id];
    const faltan = actual.cantidad - estado.marcadas.length;
    caja.innerHTML = `
      <h2>Descarte por Ladrón (7) — ${ escapar(j.nombre) }</h2>
      <p>Tienes ${ j.recursos.length } cartas. Selecciona <strong>${ actual.cantidad }</strong> para descartar (faltan ${ faltan }):</p>
      <div class="fila-orden">
        ${ j.recursos.map((rec, idx) => `
          <div class="carta revelable ${ estado.marcadas.includes(idx) ? 'seleccionada' : '' }" data-tipo="${ rec }" onclick="descartar('marcar', ${ idx })">
            <div class="reverso">🎴</div>
            <div class="frente">
              <span>${ ICONOS[rec] }</span>
              <span>${ NOMBRES[rec] }</span>
            </div>
          </div>
        `).join('') }
      </div>
      <div class="acciones-ventana">
        <button class="primario" ${ faltan !== 0 ? 'disabled' : '' } onclick="descartar('confirmar')">
          Confirmar Descarte
        </button>
      </div>
    `;
  } else if (ventanaNombre === 'robo') {
    if (estado.robo.victima === null) {
      caja.innerHTML = `
        <h2>Elige a quién robar — ${ escapar(activo.nombre) }</h2>
        <p>Selecciona el jugador adyacente al que deseas robar 1 recurso al azar:</p>
        <div class="controles">
          ${ estado.robo.victimas.map(vid => {
            const v = estado.jugadores[vid];
            return `<button class="primario" onclick="robar('iniciar', ${ vid })">${ escapar(v.nombre) } (${ v.recursos.length } cartas)</button>`;
          }).join('') }
        </div>
      `;
      return;
    }

    const victima = estado.jugadores[estado.robo.victima];
    if (!estado.robo.tapadas) {
      caja.innerHTML = `
        <h2>Turno de Defensa: ${ escapar(victima.nombre) }</h2>
        <p><strong>${ escapar(activo.nombre) } no debe mirar.</strong> Pasa el ratón o toca tus cartas para verlas, ordénalas como prefieras y luego pulsa <em>Tapar Cartas</em>.</p>
        <div class="fila-orden">
          ${ victima.recursos.map((rec, idx) => `
            <div class="contenedor-carta-robo">
              <div class="carta revelable" data-tipo="${ rec }" onclick="voltear(this, event)">
                <div class="reverso">🎴</div>
                <div class="frente">
                  <span>${ ICONOS[rec] }</span>
                  <span>${ NOMBRES[rec] }</span>
                </div>
              </div>
              <div class="botones-orden">
                <button onclick="ordenar('mover', ${ idx }, -1)" ${ idx === 0 ? 'disabled' : '' }>◄</button>
                <button onclick="ordenar('mover', ${ idx }, 1)" ${ idx === victima.recursos.length - 1 ? 'disabled' : '' }>►</button>
              </div>
            </div>
          `).join('') }
        </div>
        <div class="acciones-ventana">
          <button onclick="ordenar('mezclar')">Mezclar al Azar</button>
          <button class="primario" onclick="ordenar('tapar')">Tapar Cartas para el Robo</button>
        </div>
      `;
    } else {
      const rev = estado.robo.revelada;
      caja.innerHTML = `
        <h2>Robar Carta — ${ escapar(activo.nombre) }</h2>
        <p>${ rev !== null ? `¡Has robado <strong>${ ICONOS[victima.recursos[rev]] } ${ NOMBRES[victima.recursos[rev]] }</strong>! Enviando a tu perfil...` : `Las cartas de ${ escapar(victima.nombre) } están ordenadas y tapadas. Haz clic en una para robarla:` }</p>
        <div class="fila-orden">
          ${ victima.recursos.map((rec, idx) => {
            const destapada = rev === idx;
            return `
              <div id="carta-robo-${ idx }" class="carta ${ destapada ? 'destapada' : '' }" data-tipo="${ rec }" onclick="robar('tomar', ${ idx })">
                <div class="reverso">🎴</div>
                <div class="frente">
                  <span>${ ICONOS[rec] }</span>
                  <span>${ NOMBRES[rec] }</span>
                </div>
              </div>
            `;
          }).join('') }
        </div>
      `;
    }
  } else if (ventanaNombre === 'maritimo') {
    if (estado.fase !== 'principal') { cerrar(); return; }
    const puertos = puertosJugador(estado.turno);
    const conteo = contar(activo.recursos);
    if (puertos.length === 0) {
      caja.innerHTML = `
        <h2>⚓ Comercio Naval Bloqueado</h2>
        <p>No tienes ningún poblado ni ciudad construido en un puerto marítimo. Debes edificar en una intersección con puerto (<strong>3:1</strong> o <strong>2:1</strong>) para habilitar el comercio naval.</p>
        <div class="acciones-ventana">
          <button class="primario" onclick="cerrar()">Entendido</button>
        </div>
      `;
      return;
    }

    const recursosHabilitados = RECURSOS.filter(r => tasar(estado.turno, r) !== null);
    caja.innerHTML = `
      <h2>⚓ Comercio Naval</h2>
      <p>Puertos controlados por ${ escapar(activo.nombre) }: <strong>${ puertos.map(p => p === '3:1' ? '3:1 Genérico' : `2:1 ${ ICONOS[p] } ${ NOMBRES[p] }`).join(' · ') }</strong></p>
      <div class="jugadores">
        ${ recursosHabilitados.map(entregar => {
          const tasa = tasar(estado.turno, entregar);
          const disponible = conteo[entregar] >= tasa;
          return `
            <div class="fila-jugador">
              <div class="fila-cabecera">
                <span>${ ICONOS[entregar] } Entregar ${ tasa } ${ NOMBRES[entregar] } (Tienes ${ conteo[entregar] })</span>
                <span>Puerto ${ tasa }:1</span>
              </div>
              <div class="controles">
                ${ RECURSOS.filter(r => r !== entregar).map(recibir => `
                  <button ${ !disponible || estado.banca[recibir] <= 0 ? 'disabled' : '' } onclick="comerciar('maritimo', '${ entregar }', '${ recibir }')">
                    +1 ${ ICONOS[recibir] } ${ NOMBRES[recibir] }
                  </button>
                `).join('') }
              </div>
            </div>
          `;
        }).join('') }
      </div>
      <div class="acciones-ventana">
        <button onclick="cerrar()">Cerrar</button>
      </div>
    `;
  } else if (ventanaNombre === 'domestico') {
    if (estado.fase !== 'principal') { cerrar(); return; }
    if (!estado.comercio) {
      estado.comercio = {
        socio: (estado.turno + 1) % estado.jugadores.length,
        da: { madera: 0, arcilla: 0, lana: 0, trigo: 0, mineral: 0 },
        pide: { madera: 0, arcilla: 0, lana: 0, trigo: 0, mineral: 0 }
      };
    }
    const c = estado.comercio;
    const maxActivo = contar(activo.recursos);
    const maxSocio = contar(estado.jugadores[c.socio].recursos);
    const totalDa = Object.values(c.da).reduce((a, b) => a + b, 0);
    const totalPide = Object.values(c.pide).reduce((a, b) => a + b, 0);
    const repetido = RECURSOS.some(r => c.da[r] > 0 && c.pide[r] > 0);
    const puedeConfirmar = totalDa > 0 && totalPide > 0 && !repetido;

    caja.innerHTML = `
      <h2>Comercio entre Jugadores (${ escapar(activo.nombre) })</h2>
      <div class="controles">
        ${ estado.jugadores.filter(j => j.id !== estado.turno).map(j => `
          <button class="${ c.socio === j.id ? 'primario' : '' }" onclick="comerciar('socio', ${ j.id })">
            Con ${ escapar(j.nombre) }
          </button>
        `).join('') }
      </div>
      <p>Tú entregas (${ escapar(activo.nombre) }):</p>
      <div class="selector-recursos">
        ${ RECURSOS.map(r => {
          const sinMenos = c.da[r] <= 0 || maxActivo[r] <= 0;
          const sinMas = c.da[r] >= maxActivo[r] || maxActivo[r] <= 0;
          return `
            <div class="caja-recurso ${ c.da[r] > 0 ? 'activa' : '' }">
              <span>${ ICONOS[r] } ${ NOMBRES[r] }</span>
              <span class="stock-recurso">Tienes: ${ maxActivo[r] }</span>
              <div class="controles-cantidad">
                <button class="boton-ajuste" ${ sinMenos ? 'disabled' : '' } onclick="comerciar('ajustar', 'da', '${ r }', -1)">-</button>
                <strong class="valor-comercio">${ c.da[r] }</strong>
                <button class="boton-ajuste" ${ sinMas ? 'disabled' : '' } onclick="comerciar('ajustar', 'da', '${ r }', 1)">+</button>
              </div>
            </div>
          `;
        }).join('') }
      </div>
      <p>Recibes de ${ escapar(estado.jugadores[c.socio].nombre) }:</p>
      <div class="selector-recursos">
        ${ RECURSOS.map(r => {
          const sinMenos = c.pide[r] <= 0 || maxSocio[r] <= 0;
          const sinMas = c.pide[r] >= maxSocio[r] || maxSocio[r] <= 0;
          return `
            <div class="caja-recurso ${ c.pide[r] > 0 ? 'activa' : '' }">
              <span>${ ICONOS[r] } ${ NOMBRES[r] }</span>
              <span class="stock-recurso">Disp.: ${ maxSocio[r] }</span>
              <div class="controles-cantidad">
                <button class="boton-ajuste" ${ sinMenos ? 'disabled' : '' } onclick="comerciar('ajustar', 'pide', '${ r }', -1)">-</button>
                <strong class="valor-comercio">${ c.pide[r] }</strong>
                <button class="boton-ajuste" ${ sinMas ? 'disabled' : '' } onclick="comerciar('ajustar', 'pide', '${ r }', 1)">+</button>
              </div>
            </div>
          `;
        }).join('') }
      </div>
      <div class="acciones-ventana">
        <button onclick="estado.comercio=null; cerrar()">Cancelar</button>
        <button class="exito" ${ !puedeConfirmar ? 'disabled' : '' } onclick="comerciar('ejecutar')">Confirmar Intercambio</button>
      </div>
    `;
  } else if (ventanaNombre === 'invento') {
    if (!estado.invento) estado.invento = [];
    const faltan = 2 - estado.invento.length;
    caja.innerHTML = `
      <h2>Año de la Abundancia</h2>
      <p>Elige ${ faltan } recurso(s) gratuitos de la banca:</p>
      <div class="selector-recursos">
        ${ RECURSOS.map(r => `
          <button ${ estado.banca[r] <= 0 ? 'disabled' : '' } onclick="progresar('invento', '${ r }')">
            ${ ICONOS[r] } ${ NOMBRES[r] } (${ estado.banca[r] })
          </button>
        `).join('') }
      </div>
    `;
  } else if (ventanaNombre === 'monopolio') {
    caja.innerHTML = `
      <h2>Monopolio</h2>
      <p>Elige 1 recurso. Todos los demás jugadores te entregarán todas sus cartas de ese tipo:</p>
      <div class="selector-recursos">
        ${ RECURSOS.map(r => `
          <button onclick="progresar('monopolio', '${ r }')">
            ${ ICONOS[r] } ${ NOMBRES[r] }
          </button>
        `).join('') }
      </div>
    `;
  } else if (ventanaNombre === 'victoria') {
    const g = estado.jugadores[estado.ganador];
    const clasificacion = [...estado.jugadores].sort((a, b) => {
      if (a.id === estado.ganador) return -1;
      if (b.id === estado.ganador) return 1;
      return puntuar(b.id, true) - puntuar(a.id, true);
    });
    caja.innerHTML = `
      <h2>🏆 ¡Ganador: ${ escapar(g.nombre) }!</h2>
      <p><strong>${ escapar(g.nombre) }</strong> vence con <strong>${ puntuar(g.id, true) } Puntos de Victoria</strong>.</p>
      <div class="jugadores">
        ${ clasificacion.map((j, pos) => `
          <div class="fila-jugador ${ j.id === estado.ganador ? 'ganador-duelo' : '' }">
            <div class="fila-cabecera">
              <span>#${ pos + 1 } · ${ escapar(j.nombre) }</span>
              <span>${ puntuar(j.id, true) } PV Totales</span>
            </div>
            <div>
              <span>Cartas PV ocultas: ${ j.desarrollos.filter(d => d.tipo === 'punto').length } · Caballeros: ${ j.caballeros } · Ruta: ${ j.tramo }</span>
            </div>
          </div>
        `).join('') }
      </div>
      <div class="acciones-ventana">
        <button onclick="alternar('inicio')">Configurar Mesa</button>
        <button class="primario" onclick="reiniciar(estado.modo)">Revancha Inmediata</button>
      </div>
    `;
  }
}

function cerrar() {
  const v = document.getElementById('ventana');
  if (v) v.classList.add('oculto');
}

function descartar(accion, indice = 0) {
  if (accion === 'marcar') {
    const actual = estado.descartes[0];
    const pos = estado.marcadas.indexOf(indice);
    if (pos !== -1) {
      estado.marcadas.splice(pos, 1);
    } else if (estado.marcadas.length < actual.cantidad) {
      estado.marcadas.push(indice);
    }
    abrir('descarte');
  } else if (accion === 'confirmar') {
    const actual = estado.descartes.shift();
    const j = estado.jugadores[actual.id];
    estado.marcadas
      .sort((a, b) => b - a)
      .forEach(idx => {
        const [rec] = j.recursos.splice(idx, 1);
        estado.banca[rec]++;
      });
    estado.marcadas = [];

    if (estado.descartes.length > 0) {
      guardar();
      abrir('descarte');
    } else {
      cerrar();
      estado.previa = 'principal';
      estado.fase = 'ladron';
      estado.mensaje = `Haz clic en cualquier otro hexágono para mover al ladrón.`;
      guardar();
      dibujar('todo');
    }
  }
}

function comerciar(modo, a, b, c) {
  const activo = estado.jugadores[estado.turno];
  if (modo === 'maritimo') {
    const tasa = tasar(estado.turno, a);
    if (tasa === null) {
      estado.mensaje = 'Necesitas un poblado o ciudad en un puerto válido para ese recurso.';
      dibujar('panel');
      return;
    }
    const conteo = contar(activo.recursos);
    if (conteo[a] < tasa || estado.banca[b] <= 0) return;

    pagar('cobrar', estado.turno, { [a]: tasa });
    estado.banca[b]--;
    activo.recursos.push(b);
    estado.mensaje = `Comercio naval (${ tasa }:1): cambiaste ${ tasa } ${ NOMBRES[a] } por 1 ${ NOMBRES[b] }.`;
    guardar();
    dibujar('todo');
    abrir('maritimo');
    animar('vuelo', {
      origen: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      destino: `#perfil-${ estado.turno }`,
      recurso: b,
      demora: 0
    });
  } else if (modo === 'socio') {
    estado.comercio.socio = a;
    estado.comercio.pide = { madera: 0, arcilla: 0, lana: 0, trigo: 0, mineral: 0 };
    abrir('domestico');
  } else if (modo === 'ajustar') {
    const limite = a === 'da'
      ? contar(activo.recursos)[b]
      : contar(estado.jugadores[estado.comercio.socio].recursos)[b];
    if (limite <= 0) return;
    const nuevo = estado.comercio[a][b] + c;
    if (nuevo < 0 || nuevo > limite) return;
    estado.comercio[a][b] = nuevo;
    abrir('domestico');
  } else if (modo === 'ejecutar') {
    const trato = estado.comercio;
    const totalDa = Object.values(trato.da).reduce((x, y) => x + y, 0);
    const totalPide = Object.values(trato.pide).reduce((x, y) => x + y, 0);
    if (totalDa === 0 || totalPide === 0) {
      estado.mensaje = 'No se permite regalar cartas: ambos jugadores deben entregar al menos 1 recurso.';
      dibujar('panel');
      return;
    }
    const repetido = RECURSOS.some(r => trato.da[r] > 0 && trato.pide[r] > 0);
    if (repetido) {
      estado.mensaje = 'No se permite intercambiar el mismo tipo de recurso entre sí.';
      dibujar('panel');
      return;
    }

    const socio = estado.jugadores[trato.socio];
    const vuelos = [];

    RECURSOS.forEach(r => {
      for (let i = 0; i < trato.da[r]; i++) {
        activo.recursos.splice(activo.recursos.indexOf(r), 1);
        socio.recursos.push(r);
        vuelos.push({
          origen: `#perfil-${ activo.id }`,
          destino: `#perfil-${ socio.id }`,
          recurso: r
        });
      }
      for (let i = 0; i < trato.pide[r]; i++) {
        socio.recursos.splice(socio.recursos.indexOf(r), 1);
        activo.recursos.push(r);
        vuelos.push({
          origen: `#perfil-${ socio.id }`,
          destino: `#perfil-${ activo.id }`,
          recurso: r
        });
      }
    });

    estado.comercio = null;
    cerrar();
    estado.mensaje = `Intercambio realizado con ${ socio.nombre }.`;
    guardar();
    dibujar('todo');
    if (vuelos.length > 0) animar('lote', { lista: vuelos });
  }
}

function progresar(tipo, recurso) {
  const activo = estado.jugadores[estado.turno];
  if (tipo === 'invento') {
    if (estado.banca[recurso] <= 0) return;
    estado.banca[recurso]--;
    activo.recursos.push(recurso);
    estado.invento.push(recurso);
    animar('vuelo', {
      origen: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      destino: `#perfil-${ activo.id }`,
      recurso,
      demora: 0
    });
    if (estado.invento.length >= 2 || Object.values(estado.banca).every(v => v === 0)) {
      estado.invento = null;
      cerrar();
      estado.mensaje = 'Tomaste 2 recursos de la banca por Año de la Abundancia.';
      guardar();
      dibujar('todo');
    } else {
      guardar();
      abrir('invento');
    }
  } else if (tipo === 'monopolio') {
    let total = 0;
    const vuelos = [];
    estado.jugadores.forEach(j => {
      if (j.id === estado.turno) return;
      const resto = [];
      j.recursos.forEach(carta => {
        if (carta === recurso) {
          total++;
          activo.recursos.push(recurso);
          vuelos.push({
            origen: `#perfil-${ j.id }`,
            destino: `#perfil-${ activo.id }`,
            recurso
          });
        } else {
          resto.push(carta);
        }
      });
      j.recursos = resto;
    });
    cerrar();
    estado.mensaje = `Monopolio de ${ NOMBRES[recurso] }: recibiste ${ total } carta(s) de los rivales.`;
    guardar();
    dibujar('todo');
    if (vuelos.length > 0) animar('lote', { lista: vuelos });
  }
}

function dibujar(seccion = 'todo') {
  if (seccion === 'todo' || seccion === 'tablero') {
    const svg = document.getElementById('lienzo');
    const radio = 52;
    let html = `
      <defs>
        <radialGradient id="grad-mar" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.45" />
          <stop offset="75%" stop-color="#0369a1" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#082f49" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="grad-madera" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#22c55e" />
          <stop offset="55%" stop-color="#15803d" />
          <stop offset="100%" stop-color="#14532d" />
        </radialGradient>
        <radialGradient id="grad-arcilla" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ea580c" />
          <stop offset="60%" stop-color="#c2410c" />
          <stop offset="100%" stop-color="#7c2d12" />
        </radialGradient>
        <radialGradient id="grad-lana" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#a3e635" />
          <stop offset="55%" stop-color="#65a30d" />
          <stop offset="100%" stop-color="#3f6212" />
        </radialGradient>
        <radialGradient id="grad-trigo" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#fde047" />
          <stop offset="58%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#a16207" />
        </radialGradient>
        <radialGradient id="grad-mineral" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="55%" stop-color="#64748b" />
          <stop offset="100%" stop-color="#334155" />
        </radialGradient>
        <radialGradient id="grad-desierto" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="60%" stop-color="#d6b888" />
          <stop offset="100%" stop-color="#a16207" />
        </radialGradient>
        <filter id="sombraFicha" filterUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="800">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.55" />
        </filter>
        <pattern id="bloqueoRojo" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <rect width="16" height="16" fill="rgba(127, 29, 29, 0.28)" />
          <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(239, 68, 68, 0.85)" stroke-width="5.5" />
          <animateTransform attributeName="patternTransform" type="translate" from="0,0" to="16,0" additive="sum" dur="0.75s" repeatCount="indefinite" />
        </pattern>
      </defs>
      <circle cx="0" cy="0" r="285" fill="url(#grad-mar)" class="decoracion-hex" />
      <circle cx="0" cy="0" r="250" fill="none" stroke="rgba(253, 230, 138, 0.18)" stroke-width="2" stroke-dasharray="8 6" class="decoracion-hex" />
    `;

    const nodosActivos =
      estado.fase === 'inicial' && estado.etapa === 'poblado'
        ? validar('poblado', estado.turno, true)
        : estado.herramienta === 'poblado'
        ? validar('poblado', estado.turno, false)
        : estado.herramienta === 'ciudad'
        ? validar('ciudad', estado.turno)
        : [];

    const caminosActivos =
      estado.fase === 'inicial' && estado.etapa === 'carretera'
        ? validar('carretera', estado.turno, estado.origen)
        : estado.herramienta === 'carretera'
        ? validar('carretera', estado.turno, null)
        : [];

    estado.hexagonos.forEach(h => {
      const verticesCosta = [];
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 180) * (60 * i - 30);
        verticesCosta.push(`${ h.x + (radio + 7) * Math.cos(ang) },${ h.y + (radio + 7) * Math.sin(ang) }`);
      }
      html += `<polygon points="${ verticesCosta.join(' ') }" fill="#fde68a" opacity="0.28" class="decoracion-hex" />`;
    });

    estado.puertos.forEach(p => {
      const n1 = estado.nodos[p.nodos[0]];
      const n2 = estado.nodos[p.nodos[1]];
      const etiqueta = p.tipo === '3:1' ? '3:1' : `2:1 ${ ICONOS[p.tipo] }`;
      html += `
        <line x1="${ p.x }" y1="${ p.y }" x2="${ n1.x }" y2="${ n1.y }" stroke="#78350f" stroke-width="5" stroke-linecap="round" class="decoracion-hex" />
        <line x1="${ p.x }" y1="${ p.y }" x2="${ n1.x }" y2="${ n1.y }" stroke="#fde047" stroke-width="2" stroke-dasharray="4 3" class="decoracion-hex" />
        <line x1="${ p.x }" y1="${ p.y }" x2="${ n2.x }" y2="${ n2.y }" stroke="#78350f" stroke-width="5" stroke-linecap="round" class="decoracion-hex" />
        <line x1="${ p.x }" y1="${ p.y }" x2="${ n2.x }" y2="${ n2.y }" stroke="#fde047" stroke-width="2" stroke-dasharray="4 3" class="decoracion-hex" />
        <g transform="translate(${ p.x }, ${ p.y })" filter="url(#sombraFicha)" class="decoracion-hex">
          <rect x="-26" y="-13" width="52" height="26" rx="8" fill="#0f172a" stroke="#fde047" stroke-width="1.8" />
          <text x="0" y="4" text-anchor="middle" fill="#f8fafc" font-size="10.5" font-weight="bold">${ etiqueta }</text>
        </g>
      `;
    });

    estado.hexagonos.forEach(h => {
      const vertices = [];
      const verticesInternos = [];
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 180) * (60 * i - 30);
        vertices.push(`${ h.x + radio * Math.cos(ang) },${ h.y + radio * Math.sin(ang) }`);
        verticesInternos.push(`${ h.x + (radio * 0.86) * Math.cos(ang) },${ h.y + (radio * 0.86) * Math.sin(ang) }`);
      }
      const clicable = estado.fase === 'ladron' && h.id !== estado.ladron;
      const produciendo = estado.hexActivos && estado.hexActivos.includes(h.id);
      const tieneLadron = estado.ladron === h.id;
      const recienLadron = estado.recienCreada && estado.recienCreada.tipo === 'ladron' && estado.recienCreada.id === h.id;
      html += `
        <g id="hex-${ h.id }" class="grupo-hex ${ clicable ? 'clicable' : '' }" onclick="${ clicable ? `mover(${ h.id })` : '' }">
          <polygon points="${ vertices.join(' ') }" fill="url(#grad-${ h.terreno })" class="hexagono ${ clicable ? 'clicable' : '' } ${ produciendo ? 'produciendo' : '' }" />
          <polygon points="${ verticesInternos.join(' ') }" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.2" class="decoracion-hex" />
          ${ tieneLadron ? `<polygon points="${ vertices.join(' ') }" fill="url(#bloqueoRojo)" class="capa-bloqueo-ladron" />` : '' }
          <text x="${ h.x }" y="${ h.y - 19 }" text-anchor="middle" font-size="17" class="decoracion-hex" filter="url(#sombraFicha)">${ ICONOS[h.terreno] }</text>
      `;

      if (h.numero) {
        const esRojo = h.numero === 6 || h.numero === 8;
        const puntosProb = 6 - Math.abs(7 - h.numero);
        html += `
          <g class="decoracion-hex" filter="url(#sombraFicha)">
            <circle cx="${ h.x }" cy="${ h.y + 5 }" r="16.5" fill="#fef3c7" stroke="#92400e" stroke-width="2" />
            <circle cx="${ h.x }" cy="${ h.y + 5 }" r="13.5" fill="none" stroke="rgba(146, 64, 14, 0.28)" stroke-width="1" />
            <text x="${ h.x }" y="${ h.y + 8 }" text-anchor="middle" font-size="13.5" font-weight="900" fill="${ esRojo ? '#dc2626' : '#0f172a' }">${ h.numero }</text>
            <text x="${ h.x }" y="${ h.y + 16 }" text-anchor="middle" font-size="8.5" fill="${ esRojo ? '#dc2626' : '#0f172a' }">${ '•'.repeat(puntosProb) }</text>
          </g>
        `;
      }

      if (tieneLadron) {
        html += `
          <g transform="translate(${ h.x + 18 }, ${ h.y - 12 })" class="decoracion-hex ${ recienLadron ? 'pieza-mapa' : '' }" filter="url(#sombraFicha)">
            <circle cx="0" cy="-6" r="6.5" fill="#0f172a" stroke="#ef4444" stroke-width="2" />
            <path d="M -8.5 10 Q 0 -4 8.5 10 Z" fill="#0f172a" stroke="#ef4444" stroke-width="2" />
          </g>
        `;
      }
      html += `</g>`;
    });

    estado.caminos.forEach(c => {
      const n1 = estado.nodos[c.nodos[0]];
      const n2 = estado.nodos[c.nodos[1]];
      if (c.dueno !== null) {
        const color = estado.jugadores[c.dueno].color;
        const esNueva = estado.recienCreada && estado.recienCreada.tipo === 'camino' && estado.recienCreada.id === c.id;
        html += `
          <g class="${ esNueva ? 'pieza-mapa' : '' }" filter="url(#sombraFicha)">
            <line x1="${ n1.x }" y1="${ n1.y }" x2="${ n2.x }" y2="${ n2.y }" stroke="#0f172a" stroke-width="9.5" class="camino" />
            <line x1="${ n1.x }" y1="${ n1.y }" x2="${ n2.x }" y2="${ n2.y }" stroke="${ color }" stroke-width="6" class="camino" />
          </g>
        `;
      } else if (caminosActivos.includes(c.id)) {
        html += `
          <g class="grupo-camino-disponible" onclick="construir('carretera', ${ c.id })">
            <line x1="${ n1.x }" y1="${ n1.y }" x2="${ n2.x }" y2="${ n2.y }" stroke="rgba(255,255,255,0.01)" stroke-width="20" stroke-linecap="round" />
            <line x1="${ n1.x }" y1="${ n1.y }" x2="${ n2.x }" y2="${ n2.y }" class="camino disponible" />
          </g>
        `;
      }
    });

    estado.nodos.forEach(n => {
      const disponible = nodosActivos.includes(n.id);
      if (n.dueno !== null) {
        const color = estado.jugadores[n.dueno].color;
        const accion = disponible ? `onclick="construir('ciudad', ${ n.id })"` : '';
        const esNueva = estado.recienCreada && estado.recienCreada.tipo === 'nodo' && estado.recienCreada.id === n.id;
        if (n.edificio === 'poblado') {
          html += `
            <g transform="translate(${ n.x }, ${ n.y })" ${ accion } style="${ disponible ? 'cursor:pointer' : '' }" filter="url(#sombraFicha)">
              <polygon points="0,-12 10.5,-3 10.5,9.5 -10.5,9.5 -10.5,-3" fill="${ color }" stroke="${ disponible ? '#fde047' : '#0f172a' }" stroke-width="${ disponible ? '3.5' : '2.2' }" class="${ esNueva ? 'pieza-mapa' : '' }" />
              <line x1="-10.5" y1="-3" x2="10.5" y2="-3" stroke="rgba(15,23,42,0.45)" stroke-width="1.5" class="decoracion-hex" />
            </g>
          `;
        } else {
          html += `
            <g transform="translate(${ n.x }, ${ n.y })" filter="url(#sombraFicha)">
              <polygon points="-13,10 -13,-2 -5,-13 3,-2 13,-2 13,10" fill="${ color }" stroke="#0f172a" stroke-width="2.2" class="${ esNueva ? 'pieza-mapa' : '' }" />
              <rect x="-3" y="2" width="6" height="8" fill="rgba(15,23,42,0.55)" class="decoracion-hex" />
            </g>
          `;
        }
      } else if (disponible) {
        html += `
          <circle cx="${ n.x }" cy="${ n.y }" r="9" class="nodo disponible" onclick="construir('poblado', ${ n.id })" />
        `;
      }
    });

    svg.innerHTML = html;
  }

  if (seccion === 'todo' || seccion === 'panel') {
    const activo = estado.jugadores[estado.turno];

    document.getElementById('marcador').innerHTML = estado.jugadores
      .map(j => {
        const medallas = `${ estado.ruta === j.id ? '🛣️' : '' }${ estado.ejercito === j.id ? '⚔️' : '' }`;
        const infoReserva = `Reserva: ${ j.piezas.poblado } Pob · ${ j.piezas.ciudad } Ciu · ${ j.piezas.carretera } Car | Caballeros: ${ j.caballeros } | Ruta: ${ j.tramo }`;
        return `
          <div id="perfil-${ j.id }" class="ficha-jugador ${ j.id === estado.turno ? 'activo' : '' }" title="${ infoReserva }">
            <span class="punto-color" style="background:${ j.color }"></span>
            <strong>${ escapar(j.nombre) }</strong>
            <span>${ puntuar(j.id, false) } PV ${ medallas }</span>
            <span class="meta-jugador">🎴 ${ j.recursos.length } · 📜 ${ j.desarrollos.length }</span>
          </div>
        `;
      })
      .join('');

    const etiquetaFase =
      estado.fase === 'inicial' ? `Preparación (${ estado.indice + 1 }/${ estado.secuencia.length })` :
      estado.fase === 'tirada' ? `Paso 1: Tirar Dados` :
      estado.fase === 'ladron' ? `Mover Ladrón` :
      estado.fase === 'principal' ? `Paso 2: Comerciar y Construir` :
      `Partida Finalizada`;

    const pasoEl = document.getElementById('pasoActual');
    const ayudaEl = document.getElementById('ayudaActual');
    if (pasoEl) pasoEl.innerHTML = `<span class="punto-color" style="background:${ activo.color }"></span> ${ escapar(activo.nombre) } · ${ etiquetaFase }`;
    if (ayudaEl) ayudaEl.textContent = estado.mensaje;

    const bancaEl = document.getElementById('banca');
    if (bancaEl) {
      bancaEl.innerHTML = RECURSOS.map(r => `
        <div class="ficha-banca" style="background:${ COLORES[r] }">
          <div>${ ICONOS[r] }</div>
          <div>${ estado.banca[r] }</div>
        </div>
      `).join('');
    }

    const insigniasEl = document.getElementById('insignias');
    if (insigniasEl) {
      insigniasEl.innerHTML = `
        <div class="insignia">
          <span>🛣️ Gran Ruta Comercial (+2 PV)</span>
          <strong>${ estado.ruta !== null ? escapar(estado.jugadores[estado.ruta].nombre) : 'Libre (mín. 5)' }</strong>
        </div>
        <div class="insignia">
          <span>⚔️ Gran Ejército (+2 PV)</span>
          <strong>${ estado.ejercito !== null ? escapar(estado.jugadores[estado.ejercito].nombre) : 'Libre (mín. 3)' }</strong>
        </div>
        <div class="insignia">
          <span>📜 Mazo de Desarrollo</span>
          <strong>${ estado.mazo.length } restantes</strong>
        </div>
      `;
    }

    document.getElementById('tituloMano').textContent = `Atril de ${ activo.nombre }`;

    document.getElementById('manoRecursos').innerHTML =
      activo.recursos.length === 0
        ? `<span class="meta-jugador">0 recursos</span>`
        : activo.recursos
            .map(rec => `
              <div class="carta revelable" data-tipo="${ rec }" onclick="voltear(this, event)">
                <div class="reverso">🎴</div>
                <div class="frente">
                  <span>${ ICONOS[rec] }</span>
                  <span>${ NOMBRES[rec] }</span>
                </div>
              </div>
            `)
            .join('');

    document.getElementById('manoDesarrollo').innerHTML =
      activo.desarrollos.length === 0
        ? `<span class="meta-jugador">0 desarrollos</span>`
        : activo.desarrollos
            .map((d, idx) => {
              const info = DESARROLLOS[d.tipo];
              const nueva = d.comprada === estado.ronda && d.tipo !== 'punto';
              return `
                <div class="carta desarrollo revelable" onclick="usar(${ idx })" title="${ info.detalle }">
                  <div class="reverso">📜</div>
                  <div class="frente">
                    <span>${ info.icono }</span>
                    <span>${ info.titulo }</span>
                    <small>${ nueva ? 'Espera 1 turno' : 'Clic: usar' }</small>
                  </div>
                </div>
              `;
            })
            .join('');

    const barraAcciones = document.getElementById('accionesContextuales');
    if (!barraAcciones) return;

    const claseDado = estado.girandoDados ? 'rodando' : '';
    const bloqueadoCooldown = Boolean(estado.enfriamiento || estado.girandoDados);
    const bloqueadoTurno = Boolean(estado.enfriamiento || estado.repartiendo);

    if (estado.fase === 'inicial') {
      barraAcciones.innerHTML = `
        <span class="meta-jugador">Colocando ${ estado.etapa } inicial en el mapa...</span>
      `;
    } else if (estado.fase === 'tirada') {
      barraAcciones.innerHTML = `
        <div class="dados">
          <div class="dado ${ claseDado }">${ estado.dados[0] }</div>
          <div class="dado rojo ${ claseDado }">${ estado.dados[1] }</div>
        </div>
        <button class="primario" ${ bloqueadoCooldown || estado.tirado ? 'disabled' : '' } onclick="lanzar()">
          ${ estado.girandoDados ? '🎲 Tirando dados...' : bloqueadoCooldown ? '⏳ Espera 1s...' : '🎲 Lanzar Dados' }
        </button>
      `;
    } else if (estado.fase === 'ladron') {
      barraAcciones.innerHTML = `
        <div class="dados">
          <div class="dado ${ claseDado }">${ estado.dados[0] }</div>
          <div class="dado rojo ${ claseDado }">${ estado.dados[1] }</div>
        </div>
        <span class="meta-jugador">Haz clic en cualquier parte de otro hexágono para mover al ladrón</span>
      `;
    } else if (estado.fase === 'principal') {
      if (estado.gratis > 0) {
        barraAcciones.innerHTML = `
          <span class="meta-jugador">🛣️ Coloca ${ estado.gratis } carretera(s) gratuita(s) en el mapa</span>
        `;
      } else {
        const puedeCar = pagar('verificar', estado.turno, COSTES.carretera) && activo.piezas.carretera > 0 && validar('carretera', estado.turno, null).length > 0;
        const puedePob = pagar('verificar', estado.turno, COSTES.poblado) && activo.piezas.poblado > 0 && validar('poblado', estado.turno, false).length > 0;
        const puedeCiu = pagar('verificar', estado.turno, COSTES.ciudad) && activo.piezas.ciudad > 0 && validar('ciudad', estado.turno).length > 0;
        const puedeDes = pagar('verificar', estado.turno, COSTES.desarrollo) && estado.mazo.length > 0;
        const puertosActivos = puertosJugador(estado.turno);
        const tienePuerto = puertosActivos.length > 0;

        barraAcciones.innerHTML = `
          <div class="dados" title="Última tirada">
            <div class="dado ${ claseDado }">${ estado.dados[0] }</div>
            <div class="dado rojo ${ claseDado }">${ estado.dados[1] }</div>
          </div>
          <button class="boton-accion disponible ${ estado.herramienta === 'carretera' ? 'activo' : '' }" ${ !puedeCar ? 'disabled' : '' } onclick="seleccionar('carretera')">
            <span>🛣️ Carretera</span>
            <small>🧱1 🌲1 (${ activo.piezas.carretera })</small>
          </button>
          <button class="boton-accion disponible ${ estado.herramienta === 'poblado' ? 'activo' : '' }" ${ !puedePob ? 'disabled' : '' } onclick="seleccionar('poblado')">
            <span>🏠 Poblado</span>
            <small>🧱1 🌲1 🐑1 🌾1 (${ activo.piezas.poblado })</small>
          </button>
          <button class="boton-accion disponible ${ estado.herramienta === 'ciudad' ? 'activo' : '' }" ${ !puedeCiu ? 'disabled' : '' } onclick="seleccionar('ciudad')">
            <span>🏛️ Ciudad</span>
            <small>⛰️3 🌾2 (${ activo.piezas.ciudad })</small>
          </button>
          <button class="boton-accion disponible" ${ !puedeDes ? 'disabled' : '' } onclick="comprar()">
            <span>📜 Desarrollo</span>
            <small>⛰️1 🐑1 🌾1</small>
          </button>
          <button class="boton-accion ${ tienePuerto ? 'disponible' : '' }" ${ !tienePuerto ? 'disabled title="Requiere tener un poblado o ciudad en un puerto"' : '' } onclick="abrir('maritimo')">
            <span>⚓ Naval</span>
            <small>${ tienePuerto ? 'Puertos activos' : 'Sin puerto' }</small>
          </button>
          <button class="boton-accion" onclick="abrir('domestico')">
            <span>🤝 Jugadores</span>
            <small>Intercambiar</small>
          </button>
          <button class="exito" ${ bloqueadoTurno ? 'disabled' : '' } onclick="pasar()">
            ${ estado.repartiendo ? '🎁 Repartiendo...' : bloqueadoCooldown ? '⏳ 1s...' : 'Terminar Turno ⏭' }
          </button>
        `;
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    reiniciar('azar');
    if (cargar('verificar')) {
      const botonGuardada = document.getElementById('botonGuardada');
      if (botonGuardada) botonGuardada.classList.remove('oculto');
    }
  });
}