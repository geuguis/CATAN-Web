function ubicar(referencia) {
  if (!referencia) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  if (typeof referencia === 'object' && typeof referencia.x === 'number') return referencia;
  const el = typeof referencia === 'string' ? document.querySelector(referencia) : referencia;
  if (!el || !el.getBoundingClientRect) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function animar(tipo, datos = {}) {
  const capa = typeof document !== 'undefined' ? document.getElementById('capaAnimacion') : null;
  if (!capa) {
    if (typeof datos.alLlegar === 'function') datos.alLlegar();
    if (typeof datos.alTerminar === 'function') datos.alTerminar();
    return;
  }

  if (tipo === 'dados') {
    const tieneDomReal = typeof window !== 'undefined' && document.getElementById('lienzo') && document.getElementById('lienzo').getBoundingClientRect;
    if (!tieneDomReal) {
      if (typeof datos.alTerminar === 'function') datos.alTerminar();
      return;
    }

    const caja = document.createElement('div');
    caja.className = 'dados-emergentes';
    caja.innerHTML = `
      <div class="dado-grande agitando">🎲</div>
      <div class="dado-grande rojo agitando">🎲</div>
    `;
    capa.appendChild(caja);
    const [el1, el2] = caja.querySelectorAll('.dado-grande');

    let giros = 0;
    const int = setInterval(() => {
      giros++;
      if (el1 && el2) {
        if (giros < 6) {
          el1.textContent = Math.floor(Math.random() * 6) + 1;
          el2.textContent = Math.floor(Math.random() * 6) + 1;
        } else {
          clearInterval(int);
          el1.classList.remove('agitando');
          el2.classList.remove('agitando');
          el1.textContent = datos.d1;
          el2.textContent = datos.d2;
          setTimeout(() => {
            caja.remove();
            if (typeof datos.alTerminar === 'function') datos.alTerminar();
          }, 360);
        }
      } else {
        clearInterval(int);
        if (typeof datos.alTerminar === 'function') datos.alTerminar();
      }
    }, 65);
  } else if (tipo === 'vuelo') {
    const inicio = ubicar(datos.origen);
    const fin = ubicar(datos.destino);
    const rec = datos.recurso || 'trigo';
    const demora = datos.demora || 0;
    const pausaHex = Boolean(datos.pausaHex);
    const desfaseX = datos.desfaseX || 0;
    const desfaseY = datos.desfaseY || 0;

    const sx = inicio.x + desfaseX;
    const sy = inicio.y + desfaseY;

    const carta = document.createElement('div');
    carta.className = 'carta-voladora';
    carta.style.background = COLORES[rec] || '#334155';
    carta.style.opacity = '0';
    carta.innerHTML = `
      <span class="icono-vuelo">${ ICONOS[rec] || '🎴' }</span>
      <span>${ NOMBRES[rec] || '' }</span>
    `;
    capa.appendChild(carta);

    const mx = (sx + fin.x) / 2;
    const my = Math.min(sy, fin.y) - 65;

    const cuadros = pausaHex
      ? [
          { transform: `translate(${ sx }px, ${ sy }px) scale(0.3)`, opacity: 0, offset: 0, easing: 'ease-out' },
          { transform: `translate(${ sx }px, ${ sy - 10 }px) scale(1.16)`, opacity: 1, offset: 0.07, easing: 'ease-in-out' },
          { transform: `translate(${ sx }px, ${ sy - 15 }px) scale(1.2)`, opacity: 1, offset: 0.32, easing: 'ease-in-out' },
          { transform: `translate(${ sx }px, ${ sy - 12 }px) scale(1.16)`, opacity: 1, offset: 0.571, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
          { transform: `translate(${ mx }px, ${ my }px) scale(1.05) rotate(4deg)`, opacity: 1, offset: 0.78 },
          { transform: `translate(${ fin.x }px, ${ fin.y }px) scale(0.65) rotate(0deg)`, opacity: 0.9, offset: 0.95 },
          { transform: `translate(${ fin.x }px, ${ fin.y }px) scale(0.2) rotate(0deg)`, opacity: 0, offset: 1 }
        ]
      : [
          { transform: `translate(${ sx }px, ${ sy }px) scale(0.5)`, opacity: 0, offset: 0, easing: 'ease-out' },
          { transform: `translate(${ sx }px, ${ sy - 12 }px) scale(1.15)`, opacity: 1, offset: 0.15, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
          { transform: `translate(${ mx }px, ${ my }px) scale(1.05) rotate(4deg)`, opacity: 1, offset: 0.58 },
          { transform: `translate(${ fin.x }px, ${ fin.y }px) scale(0.65) rotate(0deg)`, opacity: 0.9, offset: 0.93 },
          { transform: `translate(${ fin.x }px, ${ fin.y }px) scale(0.2) rotate(0deg)`, opacity: 0, offset: 1 }
        ];

    const duracion = pausaHex ? 3500 : 1500;
    let completado = false;

    const cerrarVuelo = () => {
      if (completado) return;
      completado = true;
      carta.remove();
      if (typeof datos.alLlegar === 'function') datos.alLlegar();
      if (typeof datos.destino === 'string') {
        const destinoEl = document.querySelector(datos.destino);
        if (destinoEl) {
          destinoEl.classList.remove('impulso');
          void destinoEl.offsetWidth;
          destinoEl.classList.add('impulso');
        }
      }
      if (typeof datos.alTerminar === 'function') datos.alTerminar();
    };

    if (carta.animate) {
      const anim = carta.animate(cuadros, {
        duration: duracion,
        delay: demora,
        easing: 'linear',
        fill: 'forwards'
      });
      anim.onfinish = cerrarVuelo;
      setTimeout(cerrarVuelo, duracion + demora + 80);
    } else {
      cerrarVuelo();
    }
  } else if (tipo === 'lote') {
    const lista = datos.lista || [];
    if (lista.length === 0) {
      if (typeof datos.alTerminar === 'function') datos.alTerminar();
      return;
    }
    const conteoPorOrigen = {};
    let pendientes = lista.length;
    lista.forEach((item, idx) => {
      const clave = typeof item.origen === 'string' ? item.origen : idx;
      const n = conteoPorOrigen[clave] || 0;
      conteoPorOrigen[clave] = n + 1;
      const desfaseX = n === 0 ? 0 : (n % 2 === 1 ? 22 : -22) * Math.ceil(n / 2);
      const desfaseY = n * -6;
      animar('vuelo', {
        origen: item.origen,
        destino: item.destino,
        recurso: item.recurso,
        pausaHex: item.pausaHex,
        desfaseX,
        desfaseY,
        demora: item.pausaHex ? idx * 60 : idx * 140,
        alLlegar: item.alLlegar,
        alTerminar: () => {
          pendientes--;
          if (pendientes <= 0 && typeof datos.alTerminar === 'function') {
            datos.alTerminar();
          }
        }
      });
    });
  } else if (tipo === 'ladron') {
    const inicio = ubicar(datos.origen);
    const fin = ubicar(datos.destino);

    const figura = document.createElement('div');
    figura.className = 'ladron-epico';
    figura.textContent = '🦹';
    capa.appendChild(figura);

    const mx = (inicio.x + fin.x) / 2;
    const my = Math.min(inicio.y, fin.y) - 110;

    if (figura.animate) {
      const anim = figura.animate(
        [
          { transform: `translate(${ inicio.x }px, ${ inicio.y }px) scale(0.7)`, opacity: 0.9, offset: 0 },
          { transform: `translate(${ inicio.x }px, ${ inicio.y - 30 }px) scale(1.45) rotate(-12deg)`, opacity: 1, offset: 0.22 },
          { transform: `translate(${ mx }px, ${ my }px) scale(1.85) rotate(8deg)`, opacity: 1, offset: 0.58 },
          { transform: `translate(${ fin.x }px, ${ fin.y }px) scale(1.05) rotate(0deg)`, opacity: 1, offset: 0.88 },
          { transform: `translate(${ fin.x }px, ${ fin.y }px) scale(0.4)`, opacity: 0, offset: 1 }
        ],
        {
          duration: 1450,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards'
        }
      );

      setTimeout(() => {
        const onda = document.createElement('div');
        onda.className = 'onda-ladron';
        capa.appendChild(onda);
        if (onda.animate) {
          const animOnda = onda.animate(
            [
              { transform: `translate(${ fin.x }px, ${ fin.y }px) scale(0.25)`, opacity: 1 },
              { transform: `translate(${ fin.x }px, ${ fin.y }px) scale(2.1)`, opacity: 0 }
            ],
            { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
          );
          animOnda.onfinish = () => onda.remove();
        } else {
          onda.remove();
        }
      }, 1150);

      anim.onfinish = () => figura.remove();
    } else {
      figura.remove();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ubicar, animar };
}
