// Portada: tres escenas que se turnan en el bloque azul.
// 1. Culturas: 186 sociedades del SCCS en el tetraedro de Fiske (assets/data/tetraedro.json).
// 2. Redes personales: 30 redes de MapCDPerNets que se transforman una en otra (assets/data/redes.json).
// 3. Pesca artesanal: el campo pesquero, pescadores y actores por sector (assets/data/pesca.json).
(function () {
  var svg = document.getElementById('figura');
  if (!svg || !window.fetch || !window.Promise) return;
  var fig = svg.closest('figure');
  var botones = [].slice.call(fig.querySelectorAll('.escenas button'));
  var pies = [].slice.call(fig.querySelectorAll('figcaption [data-i]'));

  var NS = 'http://www.w3.org/2000/svg';
  var FONDO = '#1d2bff';
  var PAL = ['#d9f99d', '#ff8f73', '#ffffff', '#ffc6b8'];
  var DUR = 16000;                       // ms por escena
  var CX = 300, CY = 286;                // centro del dibujo en el viewBox
  var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var base = svg.getAttribute('data-base');

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  function texto(t, attrs, parent) {
    var e = el('text', attrs, parent);
    e.textContent = t;
    return e;
  }
  function datos(nombre) { return fetch(base + nombre).then(function (r) { return r.json(); }); }

  // ---------- 1. Tetraedro ----------
  function tetraedro(d) {
    var g = el('g', { 'class': 'esc', style: 'display:none;opacity:0' });
    var V = d.vertices, P = d.points;
    var ESCALA = 420, CYt = 316, INCL = 24 * Math.PI / 180, VUELTA = 90000;
    var R = Math.hypot(V[0][0], V[0][1], V[0][2]), cosI = Math.cos(INCL), sinI = Math.sin(INCL);
    var caras = [0, 1, 2, 3].map(function () { return el('polygon', { fill: '#fff', 'fill-opacity': '.06' }, g); });
    var gA = el('g', { stroke: '#fff', 'stroke-linecap': 'round' }, g), aristas = [];
    for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) {
      var o = [0, 1, 2, 3].filter(function (m) { return m !== i && m !== j; });
      aristas.push({ i: i, j: j, k: o[0], l: o[1],
        oculta: el('line', { 'stroke-width': 1.6, 'stroke-dasharray': '5 6', 'stroke-opacity': .55 }, gA),
        visible: el('line', { 'stroke-width': 3 }, gA) });
    }
    var gP = el('g', { stroke: FONDO, 'stroke-width': 1 }, g);
    var puntos = P.map(function (p) { return el('circle', { fill: PAL[p[3]] }, gP); });
    var vertices = V.map(function () { return el('circle', { r: 5, fill: '#fff' }, g); });
    var etiquetas = d.modes.map(function (m, n) {
      return texto(m, { 'class': 'et', 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: PAL[n],
        'font-size': 19, 'font-weight': 600, 'paint-order': 'stroke', stroke: FONDO, 'stroke-width': 6 }, g);
    });
    var acum = 0;
    function dibuja(phi) {
      var c = Math.cos(phi), s = Math.sin(phi), lejos = [s * cosI, c * cosI, -sinI];
      function proy(p) {
        var u = p[0] * c - p[1] * s, dd = p[0] * s + p[1] * c;
        return [CX + ESCALA * u, CYt - ESCALA * (p[2] * cosI + dd * sinI)];
      }
      function prof(p) { return p[0] * lejos[0] + p[1] * lejos[1] + p[2] * lejos[2]; }
      var PV = V.map(proy);
      caras.forEach(function (f, k) {
        f.setAttribute('points', PV.filter(function (_, n) { return n !== k; }).map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '));
      });
      aristas.forEach(function (a) {
        [a.oculta, a.visible].forEach(function (ln) {
          ln.setAttribute('x1', PV[a.i][0]); ln.setAttribute('y1', PV[a.i][1]);
          ln.setAttribute('x2', PV[a.j][0]); ln.setAttribute('y2', PV[a.j][1]);
        });
        a.visible.setAttribute('stroke-opacity', prof(V[a.k]) > 1e-9 || prof(V[a.l]) > 1e-9 ? 1 : 0);
      });
      puntos.forEach(function (circ, n) {
        var p = P[n], q = proy(p), t = (prof(p) + R) / (2 * R);
        circ.setAttribute('cx', q[0].toFixed(1)); circ.setAttribute('cy', q[1].toFixed(1));
        circ.setAttribute('r', (6.4 - 3 * t).toFixed(2));
        circ.setAttribute('fill-opacity', (1 - .5 * t).toFixed(2));
      });
      vertices.forEach(function (v, n) { v.setAttribute('cx', PV[n][0]); v.setAttribute('cy', PV[n][1]); });
      etiquetas.forEach(function (t, n) {
        var q = proy(V[n].map(function (x) { return x * 1.16; }));
        t.setAttribute('x', q[0].toFixed(1)); t.setAttribute('y', q[1].toFixed(1));
      });
    }
    return { g: g, paso: function (dt) { acum += dt; dibuja(quieto ? 0.6 : 2 * Math.PI * acum / VUELTA); } };
  }

  // ---------- 2. Redes personales ----------
  function redes(d) {
    var g = el('g', { 'class': 'esc', style: 'display:none;opacity:0' });
    var RAD = 228, QUIETA = 2600, CAMBIO = 1500, GIRO = 150000;
    var gE = el('g', { stroke: '#fff', 'stroke-width': 1 }, g);
    var gN = el('g', { stroke: FONDO, 'stroke-width': 1.2 }, g);
    var nodos = []; for (var k = 0; k < 30; k++) nodos.push(el('circle', { r: 6.5 }, gN));
    var N = d.redes, i = 0, reloj = 0, giro = 0, lA = lineas(N[0]), lB = [];
    function lineas(red) { return red.e.map(function (e) { return { a: e[0], b: e[1], ln: el('line', {}, gE) }; }); }
    function quita(ls) { ls.forEach(function (x) { gE.removeChild(x.ln); }); }
    function color(red, k) { var v = red.g[k]; return v < 4 ? PAL[v] : 'rgba(255,255,255,.5)'; }
    return { g: g, paso: function (dt) {
      reloj += dt; giro += dt;
      if (reloj >= QUIETA + CAMBIO) { quita(lA); lA = lB.length ? lB : lineas(N[(i + 1) % N.length]); lB = []; i = (i + 1) % N.length; reloj -= QUIETA + CAMBIO; }
      var A = N[i], B = N[(i + 1) % N.length];
      var m = quieto ? 0 : Math.max(0, Math.min(1, (reloj - QUIETA) / CAMBIO)), s = m * m * (3 - 2 * m);
      if (m > 0 && !lB.length) lB = lineas(B);
      var th = quieto ? 0 : 2 * Math.PI * giro / GIRO, c = Math.cos(th), sn = Math.sin(th), P = [];
      for (var k = 0; k < 30; k++) {
        var x = A.p[k][0] + (B.p[k][0] - A.p[k][0]) * s, y = A.p[k][1] + (B.p[k][1] - A.p[k][1]) * s;
        P.push([CX + RAD * (x * c - y * sn), CY + RAD * (x * sn + y * c)]);
        nodos[k].setAttribute('cx', P[k][0].toFixed(1)); nodos[k].setAttribute('cy', P[k][1].toFixed(1));
        nodos[k].setAttribute('fill', color(s < .5 ? A : B, k));
      }
      [[lA, (1 - s) * .3], [lB, s * .3]].forEach(function (par) {
        par[0].forEach(function (x) {
          x.ln.setAttribute('x1', P[x.a][0].toFixed(1)); x.ln.setAttribute('y1', P[x.a][1].toFixed(1));
          x.ln.setAttribute('x2', P[x.b][0].toFixed(1)); x.ln.setAttribute('y2', P[x.b][1].toFixed(1));
          x.ln.setAttribute('stroke-opacity', par[1].toFixed(3));
        });
      });
    } };
  }

  // ---------- 3. Campo pesquero ----------
  function pesca(d) {
    var g = el('g', { 'class': 'esc', style: 'display:none;opacity:0' });
    var RAD = 205, TURNO = 1700;
    var A = d.actores.map(function (a) { return [CX + RAD * Math.cos(a.a), CY + RAD * Math.sin(a.a)]; });
    var gE = el('g', { stroke: '#fff', 'stroke-width': 1, 'stroke-opacity': .1 }, g);
    var pesc = d.pescadores.map(function (p) {
      var xy = [CX + RAD * p.p[0], CY + RAD * p.p[1]];
      return { xy: xy, r: p.r, v: p.v, lineas: p.v.map(function (k) {
        return el('line', { x1: xy[0].toFixed(1), y1: xy[1].toFixed(1), x2: A[k][0].toFixed(1), y2: A[k][1].toFixed(1) }, gE);
      }) };
    });
    var cuadros = A.map(function (q) { return el('rect', { x: q[0] - 6, y: q[1] - 6, width: 12, height: 12, fill: '#fff' }, g); });
    d.sectores.forEach(function (s) {
      var c = Math.cos(s.a), sn = Math.sin(s.a), r = RAD + 22;
      texto(s.t, { 'class': 'sec', x: (CX + r * c).toFixed(1), y: (CY + r * sn).toFixed(1), 'font-size': 15,
        fill: 'rgba(255,255,255,.85)', 'dominant-baseline': 'middle',
        'text-anchor': c > .3 ? 'start' : c < -.3 ? 'end' : 'middle' }, g);
    });
    var gN = el('g', { stroke: FONDO, 'stroke-width': 1.2 }, g);
    pesc.forEach(function (p) { p.nodo = el('circle', { cx: p.xy[0].toFixed(1), cy: p.xy[1].toFixed(1), r: 5.5, fill: p.r ? PAL[3] : PAL[0] }, gN); });
    [['Valparaíso', PAL[0]], ['Biobío', PAL[3]]].forEach(function (l, n) {
      el('circle', { cx: -22, cy: 40 + n * 24, r: 6, fill: l[1] }, g);
      texto(l[0], { 'class': 'ley', x: -8, y: 40 + n * 24, 'font-size': 15, fill: '#fff', 'dominant-baseline': 'middle' }, g);
    });
    var orden = pesc.map(function (_, n) { return n; }).sort(function (a, b) { return ((a * 37) % 61) - ((b * 37) % 61); });
    var reloj = 0, turno = -1;
    function resalta(n, on) {
      var p = pesc[n];
      p.lineas.forEach(function (ln) { ln.setAttribute('stroke-opacity', on ? .95 : .1); ln.setAttribute('stroke-width', on ? 2 : 1); });
      p.v.forEach(function (k) { cuadros[k].setAttribute('fill', on ? (p.r ? PAL[3] : PAL[0]) : '#fff'); });
      p.nodo.setAttribute('r', on ? 10 : 5.5);
      if (on) gN.appendChild(p.nodo);
    }
    return { g: g, paso: function (dt) {
      reloj += dt;
      var t = quieto ? 0 : Math.floor(reloj / TURNO) % orden.length;
      if (t !== turno) { if (turno >= 0) resalta(orden[turno], false); turno = t; resalta(orden[turno], true); }
    } };
  }

  Promise.all([datos('tetraedro.json'), datos('redes.json'), datos('pesca.json')]).then(function (d) {
    var escenas = [tetraedro(d[0]), redes(d[1]), pesca(d[2])];
    escenas.forEach(function (e) { e.paso(0); });
    var activa = 0, tEsc = 0, t0 = null, enPantalla = true;
    // Visibilidad de cada escena (0 a 1). Las inactivas quedan con display:none: nunca se ven dos a la vez.
    var vis = escenas.map(function (_, j) { return j === 0 ? 1 : 0; });
    var APAGA = 350, ENCIENDE = 500;
    function aplica() {
      escenas.forEach(function (e, j) { e.g.style.opacity = vis[j].toFixed(3); e.g.style.display = vis[j] > 0 ? '' : 'none'; });
    }
    function funde(dt) {
      var otras = vis.some(function (v, j) { return j !== activa && v > 0; });
      vis.forEach(function (v, j) { if (j !== activa) vis[j] = Math.max(0, v - dt / APAGA); });
      if (!otras) vis[activa] = Math.min(1, vis[activa] + dt / ENCIENDE);   // la nueva entra cuando la anterior ya se ha ido
      aplica();
    }
    function barra(k, v) { var b = botones[k] && botones[k].querySelector('i'); if (b) b.style.transform = 'scaleX(' + v + ')'; }
    function muestra(k) {
      activa = k; tEsc = 0;
      if (quieto) { vis = vis.map(function (_, j) { return j === k ? 1 : 0; }); aplica(); escenas[k].paso(0); }
      botones.forEach(function (b, j) { b.setAttribute('aria-selected', j === k ? 'true' : 'false'); barra(j, 0); });
      pies.forEach(function (p, j) { p.hidden = j !== k; });
    }
    botones.forEach(function (b, j) { b.addEventListener('click', function () { if (j !== activa) muestra(j); }); });
    aplica();
    muestra(0);
    if (quieto) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { enPantalla = e[0].isIntersecting; }).observe(svg);
    function paso(t) {
      var dt = t0 === null ? 0 : Math.min(t - t0, 100); t0 = t;
      if (enPantalla && !document.hidden) {
        funde(dt);
        escenas[activa].paso(dt); tEsc += dt; barra(activa, Math.min(tEsc / DUR, 1));
        if (tEsc >= DUR) muestra((activa + 1) % escenas.length);
      }
      requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }).catch(function () { /* sin datos, queda el bloque azul con el pie de figura */ });
})();
