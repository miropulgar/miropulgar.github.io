// Herramienta a): una red sociocéntrica y una variable de las personas.
(function () {
  'use strict';
  var R = window.Redes, I = window.I18N, NPERM = 2000;
  var MEDIDAS = ['grado', 'intermediacion', 'cercania', 'vector', 'clustering', 'restriccion'];
  var raiz = document.getElementById('herramienta');
  if (!raiz) return;
  var BASE = raiz.getAttribute('data-base');
  var EJEMPLOS = {
    zachary: { v: 'zachary_vinculos.csv', a: 'zachary_atributos.csv', d: 'g.dataset.zachary' },
    flor: { v: 'florentinas_vinculos.csv', a: 'florentinas_atributos.csv', d: 'g.dataset.flor' },
    samp: { v: 'sampson_vinculos.csv', a: 'sampson_atributos.csv', d: 'g.dataset.samp' }
  };
  var E = null;   // estado: grafo, atributos, medidas, disposición, resultados
  function $(s) { return raiz.querySelector(s); }
  function el(tag, attrs, padre, texto) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) e.setAttribute(k, attrs[k]);
    if (texto !== undefined) e.textContent = texto;
    if (padre) padre.appendChild(e);
    return e;
  }
  function aviso(msg) { $('#aviso').textContent = msg || ''; }

  // ---------- carga ----------
  function carga(textoV, textoA, conjunto) {
    var V = R.leeCSV(textoV);
    if (V.cols.length < 2) { aviso(I.t('err.vinculos')); return; }
    var A = textoA ? R.leeCSV(textoA) : { cols: [], filas: [] };
    var idCol = A.cols[0];
    var G = R.grafo(V.filas.map(function (f) { return [f[V.cols[0]], f[V.cols[1]]]; }),
      A.filas.map(function (f) { return f[idCol]; }).filter(function (x) { return String(x).trim() !== ''; }));
    var attrs = {};
    A.cols.slice(1).forEach(function (c) { attrs[c] = G.ids.map(function () { return ''; }); });
    A.filas.forEach(function (f) {
      var v = G.idx[String(f[idCol]).trim()];
      if (v !== undefined) A.cols.slice(1).forEach(function (c) { attrs[c][v] = String(f[c]).trim(); });
    });
    var med = {
      grado: R.grado(G), intermediacion: R.intermediacion(G), cercania: R.cercania(G),
      vector: R.vectorPropio(G), clustering: R.clustering(G), restriccion: R.restriccion(G)
    };
    E = { G: G, attrs: attrs, cols: A.cols.slice(1), med: med, conjunto: conjunto, resumen: R.resumen(G),
          disp: R.disposicion(G, 640, 440, 350, 11), vd: A.cols[1] || null, tam: 'grado', graf: 'grado', nombres: false };
    aviso('');
    $('#trabajo').hidden = false;
    rellenaSelects(); calcula(); pinta();
  }
  function cargaEjemplo(clave) {
    var ej = EJEMPLOS[clave];
    aviso(I.t('h.cargando'));
    Promise.all([fetch(BASE + ej.v).then(function (r) { return r.text(); }), fetch(BASE + ej.a).then(function (r) { return r.text(); })])
      .then(function (t) { carga(t[0], t[1], ej.d); })
      .catch(function () { aviso(I.t('err.leer')); });
  }
  function cargaPropios() {
    Promise.all([R.leeArchivo($('#f-vinculos')), R.leeArchivo($('#f-atributos'))])
      .then(function (t) { if (!t[0]) { aviso(I.t('err.vinculos')); return; } carga(t[0], t[1], 'g.dataset.propios'); })
      .catch(function () { aviso(I.t('err.leer')); });
  }

  // ---------- cálculo ----------
  function tipoVD() { return E.vd && R.esNumerica(E.attrs[E.vd]) ? 'num' : 'cat'; }
  function calcula() {
    E.res = null; E.hom = null;
    if (!E.vd) return;
    var tipo = tipoVD(), vals = E.attrs[E.vd], rnd = R.azar(20261004);
    var validos = vals.map(function (v) { return tipo === 'num' ? !isNaN(R.numero(v)) : v !== ''; });
    if (validos.filter(Boolean).length < 4) { E.error = I.t('err.pocos', { v: E.vd }); return; }
    E.error = null;
    E.res = MEDIDAS.map(function (m) {
      var x = [], y = [];
      E.med[m].forEach(function (mv, i) { if (validos[i] && !isNaN(mv)) { x.push(mv); y.push(tipo === 'num' ? R.numero(vals[i]) : vals[i]); } });
      if (tipo === 'num') { var s = R.spearmanPerm(x, y, NPERM, rnd); return { m: m, a: s.r, p: s.p }; }
      var e = R.eta2Perm(x, y, NPERM, rnd), medias = R.mediasPorGrupo(x, y);
      var mejor = Object.keys(medias).sort(function (a, b) { return medias[b] - medias[a]; })[0];
      return { m: m, a: e.e, p: e.p, medias: medias, mejor: mejor };
    });
    if (tipo === 'num') E.hom = R.asortPerm(E.G, vals.map(R.numero), NPERM, rnd);
    else E.hom = R.eiPerm(E.G, vals.map(function (v) { return v === '' ? null : v; }), NPERM, rnd);
    E.tipo = tipo;
  }

  // ---------- pintar ----------
  function rellenaSelects() {
    var s = $('#sel-vd'); s.textContent = '';
    E.cols.forEach(function (c) { var o = el('option', { value: c }, s, c); if (c === E.vd) o.selected = true; });
    ['#sel-tam', '#sel-graf'].forEach(function (id) {
      var t = $(id), actual = id === '#sel-tam' ? E.tam : E.graf; t.textContent = '';
      MEDIDAS.forEach(function (m) { var o = el('option', { value: m }, t, I.t('m.' + m)); if (m === actual) o.selected = true; });
    });
  }
  function colores() {
    var vals = E.vd ? E.attrs[E.vd] : E.G.ids.map(function () { return ''; });
    if (!E.vd) return { color: function () { return '#fff'; }, leyenda: [] };
    if (tipoVD() === 'num') {
      var nums = vals.map(R.numero), ok = nums.filter(function (x) { return !isNaN(x); });
      var mn = Math.min.apply(null, ok), mx = Math.max.apply(null, ok);
      return { color: function (i) { return isNaN(nums[i]) ? 'rgba(255,255,255,.3)' : R.degradado((nums[i] - mn) / ((mx - mn) || 1)); },
               leyenda: [[R.degradado(0), I.num(mn, mn % 1 ? 1 : 0)], [R.degradado(1), I.num(mx, mx % 1 ? 1 : 0)]], num: true };
    }
    var cats = []; vals.forEach(function (v) { if (v !== '' && cats.indexOf(v) < 0) cats.push(v); });
    return { color: function (i) { var k = cats.indexOf(vals[i]); return k < 0 ? 'rgba(255,255,255,.3)' : R.PALETA[k % R.PALETA.length]; },
             leyenda: cats.map(function (c, k) { return [R.PALETA[k % R.PALETA.length], c]; }) };
  }
  function pintaRed() {
    var svg = $('#red'); svg.textContent = '';
    var G = E.G, P = E.disp, col = colores(), tam = E.med[E.tam];
    var ok = tam.filter(function (x) { return !isNaN(x); }), mx = Math.max.apply(null, ok.concat([0])), mn = Math.min.apply(null, ok.concat([0]));
    var gA = R.svg('g', { stroke: '#fff', 'stroke-opacity': .35, 'stroke-width': 1 }, svg);
    G.ady.forEach(function (a, u) { a.forEach(function (v) { if (u < v) R.svg('line', { x1: P[u][0], y1: P[u][1], x2: P[v][0], y2: P[v][1] }, gA); }); });
    var gN = R.svg('g', { stroke: '#1d2bff', 'stroke-width': 1.2 }, svg);
    G.ids.forEach(function (id, i) {
      var t = isNaN(tam[i]) ? 0 : (tam[i] - mn) / ((mx - mn) || 1);
      if (E.tam === 'restriccion') t = 1 - t;          // poca restricción = posición de puente: punto grande
      var c = R.svg('circle', { cx: P[i][0], cy: P[i][1], r: (4 + 9 * Math.sqrt(t)).toFixed(1), fill: col.color(i) }, gN);
      R.svg('title', {}, c).textContent = id + (E.vd ? ' – ' + E.vd + ': ' + (E.attrs[E.vd][i] || '–') : '');
    });
    if (E.nombres) {
      var gT = R.svg('g', { 'font-size': 11, fill: '#fff', 'font-family': 'Instrument Sans, sans-serif', 'paint-order': 'stroke', stroke: '#1d2bff', 'stroke-width': 3 }, svg);
      G.ids.forEach(function (id, i) { R.svg('text', { x: P[i][0] + 8, y: P[i][1] + 4 }, gT).textContent = id; });
    }
    var ley = $('#leyenda'); ley.textContent = '';
    if (E.vd) {
      el('span', { 'class': 'ley-tit' }, ley, E.vd + ':');
      if (col.num) {
        var g = el('span', { 'class': 'ley-grad' }, ley);
        el('span', {}, g, col.leyenda[0][1]);
        el('i', { style: 'background:linear-gradient(90deg,' + col.leyenda[0][0] + ',' + col.leyenda[1][0] + ')' }, g);
        el('span', {}, g, col.leyenda[1][1]);
      } else col.leyenda.forEach(function (c) { var s = el('span', { 'class': 'ley-item' }, ley); el('i', { style: 'background:' + c[0] }, s); el('span', {}, s, c[1]); });
    }
  }
  function pintaResultados() {
    var r = E.resumen, box = $('#resumen'); box.textContent = '';
    [['r.nodos', r.n, 0], ['r.vinculos', r.m, 0], ['r.densidad', r.densidad, 3], ['r.componentes', r.componentes, 0], ['r.gradomedio', r.gradoMedio, 2], ['r.transitividad', r.transitividad, 3]]
      .forEach(function (x) { var d = el('div', {}, box); el('b', {}, d, I.num(x[1], x[2])); el('span', {}, d, I.t(x[0])); });
    var tb = $('#tabla tbody'); tb.textContent = '';
    $('#tabla thead').innerHTML = '<tr><th>' + I.t('t.medida') + '</th><th>' + I.t('t.asoc') + '</th><th>' + I.t('t.p') + '</th><th>' + I.t('t.lectura') + '</th></tr>';
    $('#hom').textContent = ''; $('#notas-tabla').textContent = '';
    if (E.error) { aviso(E.error); return; }
    if (!E.res) return;
    E.res.forEach(function (x) {
      var tr = el('tr', x.p < .05 ? { 'class': 'sig' } : {}, tb);
      el('td', { title: I.t('m.' + x.m + '.d') }, tr, I.t('m.' + x.m));
      el('td', {}, tr, (E.tipo === 'num' ? 'rho = ' : 'eta² = ') + I.num(x.a, 2));
      el('td', {}, tr, I.p(x.p));
      el('td', {}, tr, lectura(x));
    });
    $('#notas-tabla').textContent = I.t(E.tipo === 'num' ? 'asoc.num' : 'asoc.cat') + ' ' + I.t('perm', { n: NPERM }) + ' ' + I.t('sig.nota');
    var h = $('#hom'); el('h3', {}, h, I.t('hom.titulo'));
    if (E.tipo === 'cat') {
      el('p', {}, h, I.t('hom.ei', { v: E.vd, ei: I.num(E.hom.ei, 2), esp: I.num(E.hom.esperado, 2), p: I.pe(E.hom.p) }) + ' ' +
        I.t(E.hom.p < .05 && E.hom.ei < E.hom.esperado ? 'hom.ei.si' : 'hom.ei.no'));
    } else {
      el('p', {}, h, I.t('hom.as', { v: E.vd, r: I.num(E.hom.r, 2), p: I.pe(E.hom.p) }) + ' ' +
        I.t(E.hom.p < .05 ? (E.hom.r > 0 ? 'hom.as.si' : 'hom.as.neg') : 'hom.as.no'));
    }
  }
  function lectura(x) {
    if (!(x.p < .05)) return I.t('l.nada');
    if (E.tipo === 'num') return I.t(x.a > 0 ? 'l.mas' : 'l.menos', { m: I.t('m.' + x.m), v: E.vd });
    return I.t('l.grupos', { g: x.mejor });
  }
  function pintaGrafico() {
    var svg = $('#grafico'); svg.textContent = '';
    $('#graf-titulo').textContent = I.t('g.titulo', { m: I.t('m.' + E.graf), v: E.vd || '' });
    if (!E.res) return;
    var W = 520, H = 300, M = { l: 50, r: 16, t: 14, b: 40 }, vals = E.attrs[E.vd], med = E.med[E.graf];
    var ejes = R.svg('g', { stroke: '#111', 'stroke-opacity': .25 }, svg);
    var txt = R.svg('g', { 'font-size': 12, fill: '#555', 'font-family': 'Instrument Sans, sans-serif' }, svg);
    var ptos = [];
    if (E.tipo === 'num') {
      vals.forEach(function (v, i) { var y = R.numero(v); if (!isNaN(y) && !isNaN(med[i])) ptos.push([med[i], y, E.G.ids[i]]); });
      var x0 = Math.min.apply(null, ptos.map(function (p) { return p[0]; })), x1 = Math.max.apply(null, ptos.map(function (p) { return p[0]; }));
      var y0 = Math.min.apply(null, ptos.map(function (p) { return p[1]; })), y1 = Math.max.apply(null, ptos.map(function (p) { return p[1]; }));
      var sx = function (v) { return M.l + (v - x0) / ((x1 - x0) || 1) * (W - M.l - M.r); }, sy = function (v) { return H - M.b - (v - y0) / ((y1 - y0) || 1) * (H - M.t - M.b); };
      R.svg('line', { x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }, ejes); R.svg('line', { x1: M.l, x2: M.l, y1: M.t, y2: H - M.b }, ejes);
      ptos.forEach(function (p) { var c = R.svg('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 5, fill: '#1d2bff', 'fill-opacity': .75 }, svg); R.svg('title', {}, c).textContent = p[2]; });
      R.svg('text', { x: (W + M.l) / 2, y: H - 8, 'text-anchor': 'middle' }, txt).textContent = I.t('m.' + E.graf);
      R.svg('text', { x: 14, y: (H - M.b + M.t) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (H - M.b + M.t) / 2 + ')' }, txt).textContent = E.vd;
      [[x0, sx(x0)], [x1, sx(x1)]].forEach(function (a) { R.svg('text', { x: a[1], y: H - M.b + 16, 'text-anchor': 'middle' }, txt).textContent = I.num(a[0], 2); });
      [[y0, sy(y0)], [y1, sy(y1)]].forEach(function (a) { R.svg('text', { x: M.l - 6, y: a[1] + 4, 'text-anchor': 'end' }, txt).textContent = I.num(a[0], a[0] % 1 ? 1 : 0); });
    } else {
      var cats = []; vals.forEach(function (v) { if (v !== '' && cats.indexOf(v) < 0) cats.push(v); });
      vals.forEach(function (v, i) { if (v !== '' && !isNaN(med[i])) ptos.push([cats.indexOf(v), med[i], E.G.ids[i]]); });
      var lo = Math.min.apply(null, ptos.map(function (p) { return p[1]; })), hi = Math.max.apply(null, ptos.map(function (p) { return p[1]; }));
      var bw = (W - M.l - M.r) / cats.length, sy2 = function (v) { return H - M.b - (v - lo) / ((hi - lo) || 1) * (H - M.t - M.b); }, rnd = R.azar(3);
      R.svg('line', { x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }, ejes); R.svg('line', { x1: M.l, x2: M.l, y1: M.t, y2: H - M.b }, ejes);
      cats.forEach(function (c, k) {
        var cx = M.l + bw * (k + .5), xs = ptos.filter(function (p) { return p[0] === k; });
        xs.forEach(function (p) { var e = R.svg('circle', { cx: cx + (rnd() - .5) * bw * .45, cy: sy2(p[1]), r: 5, fill: R.PALETA[k % R.PALETA.length], stroke: '#1d2bff', 'stroke-width': 1 }, svg); R.svg('title', {}, e).textContent = p[2]; });
        var m = R.media(xs.map(function (p) { return p[1]; }));
        R.svg('line', { x1: cx - bw * .3, x2: cx + bw * .3, y1: sy2(m), y2: sy2(m), stroke: '#111', 'stroke-width': 2.5 }, svg);
        R.svg('text', { x: cx, y: H - M.b + 18, 'text-anchor': 'middle' }, txt).textContent = c;
      });
      R.svg('text', { x: 14, y: (H - M.b + M.t) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (H - M.b + M.t) / 2 + ')' }, txt).textContent = I.t('m.' + E.graf);
      [[lo, sy2(lo)], [hi, sy2(hi)]].forEach(function (a) { R.svg('text', { x: M.l - 6, y: a[1] + 4, 'text-anchor': 'end' }, txt).textContent = I.num(a[0], 2); });
    }
  }
  function pintaPrompt() {
    var ta = $('#prompt');
    if (!E.res) { ta.value = ''; return; }
    var r = E.resumen, tipo = I.t(E.tipo === 'num' ? 'h.tipo.num' : 'h.tipo.cat');
    if (E.tipo === 'cat') {
      var cats = []; E.attrs[E.vd].forEach(function (v) { if (v !== '' && cats.indexOf(v) < 0) cats.push(v); });
      tipo += '; ' + I.t('g.grupos', { g: cats.join(', ') });
    }
    var L = [I.t('g.intro'), '',
      I.t('g.datos.socio', { d: I.t(E.conjunto), n: r.n, m: r.m, v: E.vd, tipo: tipo }) +
        (E.conjunto !== 'g.dataset.propios' && I.t('v.' + E.vd) !== 'v.' + E.vd ? ' ' + I.t('v.' + E.vd) : ''),
      I.t('g.resumen', { r: [I.t('r.densidad') + ' ' + I.num(r.densidad, 3), I.t('r.componentes') + ' ' + r.componentes, I.t('r.gradomedio') + ' ' + I.num(r.gradoMedio, 2), I.t('r.transitividad') + ' ' + I.num(r.transitividad, 3)].join('; ') }),
      '', I.t('g.asoc', { v: E.vd, metodo: E.tipo === 'num' ? 'Spearman' : 'eta²' })];
    E.res.forEach(function (x) {
      var extra = '';
      if (E.tipo === 'cat') extra = ' [' + Object.keys(x.medias).map(function (g) { return g + ' ' + I.num(x.medias[g], 3); }).join('; ') + ']';
      L.push('- ' + I.t('m.' + x.m) + ': ' + (E.tipo === 'num' ? 'rho' : 'eta²') + ' = ' + I.num(x.a, 2) + ', p ' + I.pe(x.p) + ' (' + lectura(x) + ')' + extra);
    });
    L.push('');
    if (E.tipo === 'cat') L.push(I.t('hom.ei', { v: E.vd, ei: I.num(E.hom.ei, 2), esp: I.num(E.hom.esperado, 2), p: I.pe(E.hom.p) }));
    else L.push(I.t('hom.as', { v: E.vd, r: I.num(E.hom.r, 2), p: I.pe(E.hom.p) }));
    L.push('', I.t('g.preguntas'));
    ['g.q1', 'g.q2', 'g.q3', 'g.q4', 'g.q5'].forEach(function (q, k) { L.push((k + 1) + '. ' + I.t(q, { v: E.vd })); });
    ta.value = L.join('\n');
  }
  function pintaNotaVariable() {
    var caja = $('#var-desc'), clave = 'v.' + E.vd, txt = I.t(clave);
    caja.textContent = '';
    if (!E.vd || E.conjunto === 'g.dataset.propios' || txt === clave) { caja.hidden = true; return; }
    caja.hidden = false;
    el('b', {}, caja, I.t('h.var.nota') + ': ');
    el('span', {}, caja, txt);
  }
  function pinta() {
    if (!E) return;
    pintaNotaVariable(); pintaRed(); pintaResultados(); pintaGrafico(); pintaPrompt();
    var met = $('#metodo-lista'); met.textContent = '';
    MEDIDAS.forEach(function (m) { var li = el('li', {}, met); el('b', {}, li, I.t('m.' + m) + ': '); el('span', {}, li, I.t('m.' + m + '.d')); });
  }

  // ---------- eventos ----------
  raiz.querySelectorAll('[data-ejemplo]').forEach(function (b) { b.addEventListener('click', function () { cargaEjemplo(b.getAttribute('data-ejemplo')); }); });
  $('#cargar').addEventListener('click', cargaPropios);
  $('#sel-vd').addEventListener('change', function (e) { E.vd = e.target.value; calcula(); pinta(); });
  $('#sel-tam').addEventListener('change', function (e) { E.tam = e.target.value; pintaRed(); });
  $('#sel-graf').addEventListener('change', function (e) { E.graf = e.target.value; pintaGrafico(); });
  $('#ver-nombres').addEventListener('change', function (e) { E.nombres = e.target.checked; pintaRed(); });
  $('#copiar').addEventListener('click', function () {
    var ta = $('#prompt'), b = $('#copiar');
    function hecho() { b.textContent = I.t('h.copiado'); setTimeout(function () { b.textContent = I.t('h.copiar'); }, 1600); }
    if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(hecho, function () { ta.select(); document.execCommand('copy'); hecho(); });
    else { ta.select(); document.execCommand('copy'); hecho(); }
  });
  $('#descargar').addEventListener('click', function () {
    if (!E) return;
    var cab = ['id'].concat(E.cols, MEDIDAS), filas = [cab.join(',')];
    E.G.ids.forEach(function (id, i) {
      filas.push([id].concat(E.cols.map(function (c) { return '"' + String(E.attrs[c][i]).replace(/"/g, '""') + '"'; }),
        MEDIDAS.map(function (m) { return isNaN(E.med[m][i]) ? '' : E.med[m][i].toFixed(4); })).join(','));
    });
    R.descarga('medidas_red.csv', filas.join('\n'));
  });
  I.alCambiar(function () { if (E) { calcula(); rellenaSelects(); pinta(); } });
  // enlace directo a un ejemplo: ?ejemplo=zachary, ?ejemplo=flor o ?ejemplo=samp
  var pedido = (location.search.match(/[?&]ejemplo=(zachary|flor|samp)/) || [])[1];
  if (pedido) cargaEjemplo(pedido);
})();
