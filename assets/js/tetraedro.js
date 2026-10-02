// Tetraedro de los cuatro modelos relacionales de Fiske, girando despacio.
// Datos: assets/data/tetraedro.json (186 sociedades del SCCS, composición CLR centrada).
(function () {
  var svg = document.getElementById('tetraedro');
  if (!svg || !window.fetch) return;

  var NS = 'http://www.w3.org/2000/svg';
  var COLORES = ['#d9f99d', '#ff8f73', '#ffffff', '#ffc6b8']; // comunal, autoridad, igualación, mercado
  var FONDO = '#1d2bff';
  var ESCALA = 420, CX = 300, CY = 316;
  var INCL = 24 * Math.PI / 180;         // elevación de la cámara
  var VUELTA = 90000;                     // ms por vuelta completa
  var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }

  fetch(svg.getAttribute('data-src')).then(function (r) { return r.json(); }).then(function (d) {
    var V = d.vertices, P = d.points, MODOS = d.modes;
    var R = Math.hypot(V[0][0], V[0][1], V[0][2]);
    var cosI = Math.cos(INCL), sinI = Math.sin(INCL);

    var caras = [0, 1, 2, 3].map(function () { return el('polygon', { fill: '#fff', 'fill-opacity': '.06' }); });
    var gA = el('g', { stroke: '#fff', 'stroke-linecap': 'round' });
    var aristas = [];
    for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) {
      var otros = [0, 1, 2, 3].filter(function (m) { return m !== i && m !== j; });
      aristas.push({
        i: i, j: j, k: otros[0], l: otros[1],
        oculta: el('line', { 'stroke-width': 1.6, 'stroke-dasharray': '5 6', 'stroke-opacity': .55 }, gA),
        visible: el('line', { 'stroke-width': 3 }, gA)
      });
    }
    var gP = el('g', { stroke: FONDO, 'stroke-width': 1 });
    var puntos = P.map(function (p) { return el('circle', { fill: COLORES[p[3]] }, gP); });
    var vertices = V.map(function () { return el('circle', { r: 5, fill: '#fff' }); });
    var etiquetas = MODOS.map(function (m, n) {
      var t = el('text', {
        'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: COLORES[n],
        'font-size': 19, 'font-weight': 600, 'font-family': 'Instrument Sans, sans-serif',
        'paint-order': 'stroke', stroke: FONDO, 'stroke-width': 6
      });
      t.textContent = m;
      return t;
    });

    function dibuja(phi) {
      var c = Math.cos(phi), s = Math.sin(phi);
      var lejos = [s * cosI, c * cosI, -sinI];
      function proy(p) {
        var u = p[0] * c - p[1] * s, d = p[0] * s + p[1] * c;
        return [CX + ESCALA * u, CY - ESCALA * (p[2] * cosI + d * sinI)];
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
        // la arista se ve si alguna de sus dos caras mira a la cámara
        var vis = prof(V[a.k]) > 1e-9 || prof(V[a.l]) > 1e-9;
        a.visible.setAttribute('stroke-opacity', vis ? 1 : 0);
      });
      puntos.forEach(function (circ, n) {
        var p = P[n], q = proy(p), t = (prof(p) + R) / (2 * R); // 0 = cerca, 1 = lejos
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

    if (quieto) { dibuja(0.6); return; }

    var enPantalla = true, t0 = null, acumulado = 0;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { enPantalla = e[0].isIntersecting; }).observe(svg);
    }
    function paso(t) {
      if (t0 !== null && enPantalla && !document.hidden) acumulado += Math.min(t - t0, 100);
      t0 = t;
      if (enPantalla && !document.hidden) dibuja(2 * Math.PI * acumulado / VUELTA);
      requestAnimationFrame(paso);
    }
    dibuja(0);
    requestAnimationFrame(paso);
  }).catch(function () { /* sin datos, el bloque azul queda con el pie de figura */ });
})();
