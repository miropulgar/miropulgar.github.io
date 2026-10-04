// Portada: tres escenas que se turnan en el bloque azul.
// 1. Culturas: 186 sociedades del SCCS en el tetraedro de Fiske (assets/data/tetraedro.json).
// 2. Redes personales: 30 redes de MapCDPerNets que se transforman una en otra (assets/data/redes.json).
// 3. Mercado: la caleta de la simulación de Pulgar y Molina (2026), en versión ilustrativa (sin datos).
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

  // ---------- 3. Mercado: la caleta de Pulgar y Molina (2026), en versión ilustrativa ----------
  // Simplificación en el navegador: no reproduce las corridas del artículo, solo sus mecanismos.
  // Mar (FOLLOW): cada barco sigue al vecino de su red que mejor pescó ayer; en las celdas se forman camarillas.
  // Llegada (ANCHOR): los barcos llegan en fila; cada vendedor mira a los dos que llegaron antes y acerca su precio.
  // Venta (PEEK): en cada ronda, quien está por encima de la mediana de sus vecinos de fila baja su precio.
  function mercado() {
    var g = el('g', { 'class': 'esc', style: 'display:none;opacity:0' });
    var N = 50, G = 12, CEL = 26, X0 = -20, Y0 = 44, BX = 340, BW = 290, BH = 4.2, BP = 6.15;
    var P_MIN = 1800, P_CAP = 4200, P_MAX = 3500, W_ANCLA = 0.8, ETA = 0.3, RONDAS = 6;
    var T_MAR = 4400, T_LLEGA = 4200, T_VENTA = 4800, PASO = 3000 / N, VUELO = 500;   // ms
    var M_RED = 900, M_MUEVE = 1900, M_PESCA = 3200;   // en el mar: aparece la red, se mueven por ella, pescan
    var T_FIN = T_MAR + T_LLEGA + T_VENTA, DIA = DUR;   // el día dura lo mismo que las otras escenas: al final, unos segundos quieto
    var semilla = 20260101;
    function azar() { semilla |= 0; semilla = semilla + 0x6D2B79F5 | 0; var t = Math.imul(semilla ^ semilla >>> 15, 1 | semilla); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    function mediana(v) { var s = v.slice().sort(function (a, b) { return a - b; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
    function suave(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
    function centro(c) { return [X0 + (c[0] + .5) * CEL, Y0 + (c[1] + .5) * CEL]; }
    function ranura(q) { return [BX - 8, Y0 + q * BP + BH / 2]; }
    function largo(p) { return Math.max(4, (p - P_MIN) / (P_CAP - P_MIN) * BW); }

    // red de información entre barcos: anillo con dos vecinos a cada lado y algunos atajos (mundo pequeño)
    var red = []; for (var i = 0; i < N; i++) red.push([(i + 1) % N, (i + N - 1) % N, (i + 2) % N, (i + N - 2) % N]);
    for (i = 0; i < N; i++) if (azar() < .12) red[i][2 + (azar() < .5 ? 0 : 1)] = Math.floor(azar() * N);
    // dos manchas de merluza que derivan despacio
    var manchas = [{ x: 3, y: 8, a: 5000, s: 1.5 }, { x: 8.5, y: 3.5, a: 8000, s: 1.7 }];
    function biomasa(cx, cy) { return manchas.reduce(function (t, m) { var dx = cx - m.x, dy = cy - m.y; return t + m.a * Math.exp(-(dx * dx + dy * dy) / (2 * m.s * m.s)); }, 0); }

    var celdas = [];
    for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) celdas.push(el('rect', { x: X0 + x * CEL + 1, y: Y0 + y * CEL + 1, width: CEL - 2, height: CEL - 2, fill: '#fff' }, g));
    texto('mar', { 'class': 'ley', x: X0, y: Y0 - 14, 'font-size': 15, fill: 'rgba(255,255,255,.8)' }, g);
    texto('caleta: por orden de llegada', { 'class': 'ley', x: BX - 12, y: Y0 - 14, 'font-size': 15, fill: 'rgba(255,255,255,.8)' }, g);
    function miles(n) { n = Math.round(n); return n >= 1000 ? Math.floor(n / 1000) + '.' + String(n % 1000).padStart(3, '0') : String(n); }
    // la red de información entre botes: todos los vínculos, finos; los que se usan para seguir, en rosa
    var pares = [], vistoPar = {};
    red.forEach(function (vs, k) { vs.forEach(function (j) { var c = Math.min(k, j) + '-' + Math.max(k, j); if (j !== k && !vistoPar[c]) { vistoPar[c] = 1; pares.push([k, j]); } }); });
    var gRed = el('g', { stroke: '#fff', 'stroke-width': 1, 'stroke-opacity': .3 }, g);
    var lineasRed = pares.map(function () { return el('line', {}, gRed); });
    var gSig = el('g', { stroke: PAL[3], 'stroke-width': 2.2, 'stroke-linecap': 'round' }, g);   // FOLLOW: a quién sigue cada bote
    var gCam = el('g', { fill: 'none', stroke: PAL[0], 'stroke-width': 2 }, g); // camarillas: celdas con dos o más barcos
    var gB = el('g', {}, g), barras = [], cortes = [], marcas = [];
    for (i = 0; i < N; i++) {
      barras.push(el('rect', { x: BX, y: Y0 + i * BP, height: BH, width: 0, fill: '#fff' }, gB));
      cortes.push(el('rect', { y: Y0 + i * BP, height: BH, width: 0, fill: PAL[1] }, gB));
      marcas.push(el('line', { y1: Y0 + i * BP - 1.5, y2: Y0 + i * BP + BH + 1.5, stroke: PAL[1], 'stroke-width': 2, 'stroke-opacity': 0 }, gB));   // dónde estaba su precio
    }
    // ANCHOR: al llegar, una línea rosa une el final de su barra con el de los dos que llegaron antes
    var gMira = el('g', { fill: 'none', stroke: PAL[3], 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g), miradas = [];
    for (i = 0; i < N; i++) miradas.push(el('polyline', { 'stroke-opacity': 0 }, gMira));
    var gN = el('g', { stroke: FONDO, 'stroke-width': 1 }, g), botes = [];
    for (i = 0; i < N; i++) botes.push(el('circle', { r: 4.2, fill: '#fff' }, gN));
    // eje de precios bajo las barras
    var EJE = Y0 + N * BP + 6;
    el('line', { x1: BX, x2: BX + BW, y1: EJE, y2: EJE, stroke: 'rgba(255,255,255,.55)', 'stroke-width': 1 }, g);
    [2000, 2500, 3000, 3500, 4000].forEach(function (pp) {
      var xx = BX + largo(pp);
      el('line', { x1: xx, x2: xx, y1: EJE, y2: EJE + 4, stroke: 'rgba(255,255,255,.55)', 'stroke-width': 1 }, g);
      texto(miles(pp), { 'class': 'eje', x: xx, y: EJE + 17, 'font-size': 12, fill: 'rgba(255,255,255,.75)', 'text-anchor': 'middle' }, g);
    });
    texto('$/kg', { 'class': 'eje', x: BX - 14, y: EJE + 17, 'font-size': 12, fill: 'rgba(255,255,255,.75)', 'text-anchor': 'end' }, g);
    // promedio de precios: en lima al llegar todos; en naranja, después de mirar al vecino en la venta
    var promIni = el('line', { y1: Y0 - 4, y2: EJE, stroke: PAL[0], 'stroke-width': 2, 'stroke-dasharray': '4 3', 'stroke-opacity': 0 }, g);
    var promFin = el('line', { y1: Y0 - 4, y2: EJE, stroke: PAL[1], 'stroke-width': 2, 'stroke-opacity': 0 }, g);
    var promT = el('text', { 'class': 'prom', x: BX, y: EJE + 38, 'font-size': 15, 'font-weight': 600, fill: '#fff' }, g);
    var promA = el('tspan', { fill: '#fff' }, promT), promB = el('tspan', { fill: PAL[0] }, promT), promC = el('tspan', { fill: '#fff' }, promT), promD = el('tspan', { fill: PAL[1] }, promT), promE = el('tspan', { fill: '#fff' }, promT);
    // leyenda (en pantallas estrechas se oculta)
    var LY = EJE + 64, LP = 21, gLey = el('g', { 'class': 'leyenda' }, g);
    el('rect', { x: BX - 1, y: LY - 10, width: 5, height: 10, fill: '#fff', 'fill-opacity': .12 }, gLey);
    el('rect', { x: BX + 5, y: LY - 10, width: 5, height: 10, fill: '#fff', 'fill-opacity': .45 }, gLey);
    texto('banco de merluza: se mueve cada día', { 'class': 'nota', x: BX + 16, y: LY, 'font-size': 14, fill: 'rgba(255,255,255,.85)' }, gLey);
    el('circle', { cx: BX + 4, cy: LY + LP - 4, r: 4.2, fill: '#fff' }, gLey);
    texto('bote: su tamaño es la pesca', { 'class': 'nota', x: BX + 16, y: LY + LP, 'font-size': 14, fill: 'rgba(255,255,255,.85)' }, gLey);
    el('line', { x1: BX - 1, x2: BX + 10, y1: LY + 2 * LP - 4, y2: LY + 2 * LP - 4, stroke: '#fff', 'stroke-width': 1, 'stroke-opacity': .6 }, gLey);
    texto('red: de quién se informa cada bote', { 'class': 'nota', x: BX + 16, y: LY + 2 * LP, 'font-size': 14, fill: 'rgba(255,255,255,.85)' }, gLey);
    el('line', { x1: BX - 1, x2: BX + 10, y1: LY + 3 * LP - 4, y2: LY + 3 * LP - 4, stroke: PAL[3], 'stroke-width': 2 }, gLey);
    texto('rosa: seguir o mirar a otro', { 'class': 'nota', x: BX + 16, y: LY + 3 * LP, 'font-size': 14, fill: 'rgba(255,255,255,.85)' }, gLey);
    el('rect', { x: BX - 1, y: LY + 4 * LP - 10, width: 10, height: 10, fill: 'none', stroke: PAL[0], 'stroke-width': 2 }, gLey);
    texto('camarilla: botes en la misma celda', { 'class': 'nota', x: BX + 16, y: LY + 4 * LP, 'font-size': 14, fill: 'rgba(255,255,255,.85)' }, gLey);
    el('rect', { x: BX - 1, y: LY + 5 * LP - 7, width: 7, height: 4.2, fill: '#fff' }, gLey);
    el('rect', { x: BX + 6, y: LY + 5 * LP - 7, width: 5, height: 4.2, fill: PAL[1] }, gLey);
    texto('precio: en naranja, lo que bajó en la venta', { 'class': 'nota', x: BX + 16, y: LY + 5 * LP, 'font-size': 14, fill: 'rgba(255,255,255,.85)' }, gLey);
    var fases = ['1. Mar: pescan y siguen a quien pescó bien', '2. Caleta: precio mirando a los anteriores', '3. Venta: quien está sobre sus vecinos baja'].map(function (t, k) {
      return texto(t, { 'class': 'ley', x: X0, y: 402 + k * 27, 'font-size': 15, fill: '#fff' }, g);
    });
    var rotDia = texto('', { 'class': 'ley', x: X0, y: 402 + 3 * 27 + 4, 'font-size': 14, fill: 'rgba(255,255,255,.7)' }, g);

    var barco = []; for (i = 0; i < N; i++) barco.push({ celda: [Math.floor(azar() * G), Math.floor(azar() * G)], ayer: 50 + azar() * 350, cap: 200 + azar() * 400, ranura: ranura(i) });   // ayer al azar: desde el primer día hay a quién seguir
    var dia = 0, hoy = null, ayer = null, reloj = 0;

    function nuevoDia() {
      dia++;
      manchas.forEach(function (m) { m.x = Math.max(1, Math.min(G - 2, m.x + (azar() - .5) * 1.2)); m.y = Math.max(1, Math.min(G - 2, m.y + (azar() - .5) * 1.2)); });
      var cmaxAyer = Math.max.apply(null, barco.map(function (b) { return b.ayer; })) || 1;
      barco.forEach(function (b) {                       // dónde pescó ayer y cuánto: desde ahí decide hoy
        b.posAyer = b.pos || centro(b.celda); b.rAyer = 2.8 + 4 * b.ayer / cmaxAyer;
      });
      var sigue = [];
      barco.forEach(function (b, k) {                    // FOLLOW / quedarse / explorar
        var mejor = red[k].reduce(function (a, j) { return barco[j].ayer > barco[a].ayer ? j : a; }, red[k][0]);
        var nueva;
        if (azar() < .1) nueva = [Math.max(0, Math.min(G - 1, b.celda[0] + Math.round((azar() - .5) * 6))), Math.max(0, Math.min(G - 1, b.celda[1] + Math.round((azar() - .5) * 6)))];
        else if (.4 * barco[mejor].ayer > .5 * b.ayer) { nueva = barco[mejor].celda.slice(); sigue.push([k, mejor]); }
        else nueva = b.celda.slice();
        b.nueva = nueva; b.desde = b.ranura;              // sale desde su puesto en la fila de ayer
      });
      var cuenta = {};
      barco.forEach(function (b) { b.celda = b.nueva; var c = b.celda.join(); cuenta[c] = (cuenta[c] || 0) + 1; });
      var bmax = 0, B = [];
      for (var cy = 0; cy < G; cy++) for (var cx = 0; cx < G; cx++) { var v = biomasa(cx, cy); B.push(v); bmax = Math.max(bmax, v); }
      celdas.forEach(function (c, n) { c.setAttribute('fill-opacity', (.05 + .4 * B[n] / bmax).toFixed(3)); });
      var orden = [], vistos = {};
      barco.forEach(function (b, k) {                    // captura con congestión, sitio dentro de la celda y hora de llegada
        var c = b.celda.join(), n = cuenta[c];
        b.ayer = Math.min(b.cap, b.cap * 1.6 * biomasa(b.celda[0], b.celda[1]) / bmax / Math.pow(n, .8));
        b.enCamarilla = n > 1;
        vistos[c] = (vistos[c] || 0) + 1;
        var ang = vistos[c] * 2.4, rad = n > 1 ? 6 : 0, ctr = centro(b.celda);
        b.pos = [ctr[0] + rad * Math.cos(ang), ctr[1] + rad * Math.sin(ang)];
        b.llegada = Math.hypot(b.celda[0], b.celda[1]) / 10 + azar() * .4;
        orden.push(k);
      });
      orden.sort(function (a, b) { return barco[a].llegada - barco[b].llegada; });
      orden.forEach(function (k, q) { barco[k].fila = q; barco[k].ranura = ranura(q); });
      var cmax = Math.max.apply(null, barco.map(function (b) { return b.ayer; })) || 1;
      barco.forEach(function (b) { b.rPesca = 2.8 + 4 * b.ayer / cmax; });   // tamaño del punto según la captura
      var propio = [], pide = [];                          // ANCHOR: precio propio mezclado con la mediana de los dos anteriores
      orden.forEach(function (k, q) {
        var pr = Math.min(P_CAP, P_MAX * (1 - .35 * barco[k].ayer / cmax) * (1 + (azar() - .5) * .3));
        var p = q === 0 ? pr : W_ANCLA * mediana(pide.slice(Math.max(0, q - 2))) + (1 - W_ANCLA) * pr;
        propio.push(pr); pide.push(Math.min(P_CAP, p * (1 + (azar() - .5) * .04)));
      });
      var rondas = [pide.slice()], stock = [orden.map(function (k) { return barco[k].ayer; })];
      for (var r = 1; r <= RONDAS; r++) {                 // PEEK solo a la baja + ventas
        var prev = rondas[r - 1], ahora = prev.slice(), st = stock[r - 1].slice();
        for (var q = 0; q < N; q++) {
          var vec = []; if (q > 0) vec.push(prev[q - 1]); if (q < N - 1) vec.push(prev[q + 1]);
          var med = mediana(vec);
          if (prev[q] > med) ahora[q] = prev[q] - ETA * (prev[q] - med);
          st[q] = st[q] * (1 - Math.max(.05, Math.min(.55, .45 - (ahora[q] - 1800) / 6000 + r * .03)));
        }
        rondas.push(ahora); stock.push(st);
      }
      var miraVenta = [];
      for (r = 0; r < RONDAS; r++) {
        miraVenta.push(rondas[r].map(function (v, q) { return [v - rondas[r + 1][q], q]; })
          .filter(function (x) { return x[0] > 1; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 5).map(function (x) { return x[1]; }));
      }
      gCam.textContent = ''; gSig.textContent = '';
      Object.keys(cuenta).filter(function (c) { return cuenta[c] > 1; }).forEach(function (c) {
        var ctr = centro(c.split(',').map(Number));
        el('rect', { x: ctr[0] - CEL / 2 + 1, y: ctr[1] - CEL / 2 + 1, width: CEL - 2, height: CEL - 2 }, gCam);
      });
      if (hoy) ayer = hoy.rondas[RONDAS];
      hoy = { orden: orden, propio: propio, rondas: rondas, stock: stock, miraVenta: miraVenta,
              sigue: sigue.map(function (par) { return { a: par[0], b: par[1], ln: el('line', {}, gSig) }; }) };
      barco.forEach(function (b, k) { botes[k].setAttribute('fill', b.enCamarilla ? PAL[0] : '#fff'); });
      rotDia.textContent = 'día ' + dia;
    }
    nuevoDia();

    function dibuja() {
      var t = Math.min(reloj, T_FIN - 1), tV = t - T_MAR - T_LLEGA;
      fases.forEach(function (f, k) { f.setAttribute('fill-opacity', (k === 0 ? t < T_MAR : k === 1 ? t >= T_MAR && tV < 0 : tV >= 0) ? 1 : .4); });
      // botes: salen de la fila al sitio de ayer (tamaño = pesca de ayer); se mueven por la red; pescan (tamaño = pesca de hoy)
      var ida = suave(t / M_RED), mueve = suave((t - M_MUEVE) / (M_PESCA - M_MUEVE - 200)), crece = suave((t - M_PESCA) / 700);
      barco.forEach(function (b, k) {
        var x, y, r;
        if (t < T_MAR) {
          if (t < M_MUEVE) { x = b.desde[0] + (b.posAyer[0] - b.desde[0]) * ida; y = b.desde[1] + (b.posAyer[1] - b.desde[1]) * ida; }
          else { x = b.posAyer[0] + (b.pos[0] - b.posAyer[0]) * mueve; y = b.posAyer[1] + (b.pos[1] - b.posAyer[1]) * mueve; }
          r = 2.6 + (b.rAyer - 2.6) * ida + (b.rPesca - b.rAyer) * crece;
        }
        else { var v = suave((t - T_MAR - b.fila * PASO) / VUELO); x = b.pos[0] + (b.ranura[0] - b.pos[0]) * v; y = b.pos[1] + (b.ranura[1] - b.pos[1]) * v; r = b.rPesca + (2.6 - b.rPesca) * v; }
        botes[k].setAttribute('cx', x.toFixed(1)); botes[k].setAttribute('cy', y.toFixed(1)); botes[k].setAttribute('r', r.toFixed(2));
      });
      var vRed = t >= T_MAR ? 0 : Math.min(1, Math.max(0, (t - M_RED) / 500)) * (1 - suave((t - M_PESCA) / 900));
      gRed.setAttribute('opacity', vRed.toFixed(2));
      if (vRed > 0) pares.forEach(function (pr, n) {
        var a = botes[pr[0]], b = botes[pr[1]], ln = lineasRed[n];
        ln.setAttribute('x1', a.getAttribute('cx')); ln.setAttribute('y1', a.getAttribute('cy'));
        ln.setAttribute('x2', b.getAttribute('cx')); ln.setAttribute('y2', b.getAttribute('cy'));
      });
      var vSig = t >= T_MAR ? 0 : Math.min(1, Math.max(0, (t - M_RED - 400) / 500)) * (1 - suave((t - M_PESCA) / 700)) * .95;
      hoy.sigue.forEach(function (s) {
        var a = botes[s.a], b = botes[s.b];
        s.ln.setAttribute('x1', a.getAttribute('cx')); s.ln.setAttribute('y1', a.getAttribute('cy'));
        s.ln.setAttribute('x2', b.getAttribute('cx')); s.ln.setAttribute('y2', b.getAttribute('cy'));
        s.ln.setAttribute('stroke-opacity', vSig.toFixed(2));
      });
      gCam.setAttribute('stroke-opacity', t < M_PESCA ? 0 : tV < 0 ? Math.min(1, (t - M_PESCA) / 500) : Math.max(0, 1 - tV / 800));
      if (t < T_MAR) {                                    // mientras se pesca: los precios de ayer, en tenue
        for (var q0 = 0; q0 < N; q0++) {
          barras[q0].setAttribute('fill', '#fff'); barras[q0].setAttribute('fill-opacity', .18);
          barras[q0].setAttribute('width', ayer ? largo(ayer[q0]).toFixed(1) : 0);
          cortes[q0].setAttribute('width', 0); marcas[q0].setAttribute('stroke-opacity', 0);
          miradas[q0].setAttribute('stroke-opacity', 0);
        }
        promIni.setAttribute('stroke-opacity', 0); promFin.setAttribute('stroke-opacity', 0); promT.setAttribute('opacity', 0);
        return;
      }
      // cada ronda de venta: primero miran (rosa), luego bajan (la barra se acorta y lo recortado queda en naranja)
      var durR = T_VENTA / RONDAS, r = Math.max(0, Math.min(RONDAS - 1, Math.floor(tV / durR)));
      var loc = tV - r * durR, fr = tV < 0 ? 0 : suave((loc - .3 * durR) / (.45 * durR));
      var vMira = Math.max(0, Math.min(1, loc / 100)) * Math.max(0, Math.min(1, (.5 * durR - loc) / 120));
      var suma = 0;

      for (var q = 0; q < N; q++) {
        var yq = Y0 + q * BP + BH / 2;
        barras[q].setAttribute('fill', barco[hoy.orden[q]].enCamarilla ? PAL[0] : '#fff');
        if (tV < 0) {                                    // llegada: aparece con su precio propio y se acerca al de los anteriores
          var tau = t - T_MAR - q * PASO - VUELO;
          var p = hoy.propio[q] + (hoy.rondas[0][q] - hoy.propio[q]) * suave((tau - 200) / 450);
          barras[q].setAttribute('width', tau < 0 ? 0 : (largo(p) * suave(tau / 150)).toFixed(1));
          barras[q].setAttribute('fill-opacity', 1);
          cortes[q].setAttribute('width', 0); marcas[q].setAttribute('stroke-opacity', 0);
          var vis = q === 0 ? 0 : Math.max(0, Math.min(1, (tau - 100) / 80)) * Math.max(0, Math.min(1, 1 - (tau - 380) / 140));
          var puntos = [[BX + largo(p) + 3, yq]];
          for (var j = q - 1; j >= Math.max(0, q - 2); j--) puntos.push([BX + largo(hoy.rondas[0][j]) + 3, Y0 + j * BP + BH / 2]);
          miradas[q].setAttribute('points', puntos.map(function (c) { return c[0].toFixed(1) + ',' + c[1].toFixed(1); }).join(' '));
          miradas[q].setAttribute('stroke-opacity', vis.toFixed(2));
          continue;
        }
        var p0 = hoy.rondas[r][q], p1 = hoy.rondas[r + 1][q], pv = p0 + (p1 - p0) * fr;
        suma += pv;
        barras[q].setAttribute('width', largo(pv).toFixed(1));
        barras[q].setAttribute('fill-opacity', 1);
        var ini = hoy.rondas[0][q];                       // lo bajado desde que empezó la venta queda en naranja
        cortes[q].setAttribute('x', (BX + largo(pv)).toFixed(1));
        cortes[q].setAttribute('width', Math.max(0, largo(ini) - largo(pv)).toFixed(1));
        cortes[q].setAttribute('fill-opacity', 1);
        var xi = (BX + largo(ini) + 1).toFixed(1);
        marcas[q].setAttribute('x1', xi); marcas[q].setAttribute('x2', xi);
        marcas[q].setAttribute('stroke-opacity', largo(ini) - largo(pv) > 1.5 ? 1 : 0);
        if (hoy.miraVenta[r].indexOf(q) >= 0) {           // los que más bajan: miran a sus dos vecinos de fila
          var pts = [];
          [q - 1, q, q + 1].forEach(function (j) { if (j >= 0 && j < N) pts.push((BX + largo(hoy.rondas[r][j]) + 3).toFixed(1) + ',' + (Y0 + j * BP + BH / 2).toFixed(1)); });
          miradas[q].setAttribute('points', pts.join(' '));
          miradas[q].setAttribute('stroke-opacity', vMira.toFixed(2));
        } else miradas[q].setAttribute('stroke-opacity', 0);
      }
      // promedio: lima el de llegada; naranja el de ahora, en cuanto empiezan a mirar al vecino
      if (tV < 0) { promIni.setAttribute('stroke-opacity', 0); promFin.setAttribute('stroke-opacity', 0); promT.setAttribute('opacity', 0); return; }
      var m0 = hoy.rondas[0].reduce(function (a, b) { return a + b; }, 0) / N, m1 = suma / N, ya = tV > .3 * durR;
      var x0 = (BX + largo(m0)).toFixed(1), x1 = (BX + largo(m1)).toFixed(1);
      promIni.setAttribute('x1', x0); promIni.setAttribute('x2', x0); promIni.setAttribute('stroke-opacity', Math.min(1, tV / 300).toFixed(2));
      promFin.setAttribute('x1', x1); promFin.setAttribute('x2', x1); promFin.setAttribute('stroke-opacity', ya ? 1 : 0);
      promT.setAttribute('opacity', Math.min(1, tV / 300).toFixed(2));
      promA.textContent = 'promedio '; promB.textContent = miles(m0);
      promC.textContent = ya ? ' → ' : ' $/kg'; promD.textContent = ya ? miles(m1) : ''; promE.textContent = ya ? ' $/kg' : '';
    }
    return {
      g: g, dur: DIA,
      entra: function () { if (!quieto && reloj > 0) { reloj = 0; nuevoDia(); } },   // cada vez que aparece, empieza un día nuevo
      paso: function (dt) {
        reloj = quieto ? DIA - 1 : reloj + dt;
        if (reloj >= DIA) { reloj -= DIA; nuevoDia(); }
        dibuja();
      }
    };
  }

  Promise.all([datos('tetraedro.json'), datos('redes.json')]).then(function (d) {
    var escenas = [tetraedro(d[0]), redes(d[1]), mercado()];
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
      if (escenas[k].entra) escenas[k].entra();
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
        var dur = escenas[activa].dur || DUR;
        escenas[activa].paso(dt); tEsc += dt; barra(activa, Math.min(tEsc / dur, 1));
        if (tEsc >= dur) muestra((activa + 1) % escenas.length);
      }
      requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }).catch(function () { /* sin datos, queda el bloque azul con el pie de figura */ });
})();
