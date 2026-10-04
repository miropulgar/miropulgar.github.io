// Herramienta b): un conjunto de redes egocéntricas y una variable de los egos.
(function () {
  'use strict';
  var R = window.Redes, I = window.I18N, NPERM = 2000, MAX_GALERIA = 120;
  var raiz = document.getElementById('herramienta');
  if (!raiz) return;
  var BASE = raiz.getAttribute('data-base');
  var EJEMPLOS = {
    sim: { e: 'ego_egos.csv', a: 'ego_alteri.csv', v: 'ego_vinculos.csv', d: 'g.dataset.ego' },
    mapcd: { e: 'mapcd_egos.csv', a: 'mapcd_alteri.csv', v: 'mapcd_vinculos.csv', d: 'g.dataset.mapcd' }
  };
  var E = null;
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
  function carga(tE, tA, tV, conjunto) {
    var Eg = R.leeCSV(tE), A = R.leeCSV(tA), V = tV ? R.leeCSV(tV) : { cols: [], filas: [] };
    if (Eg.cols.length < 2 || A.cols.length < 2) { aviso(I.t('err.leer')); return; }
    var eId = Eg.cols[0], aEgo = A.cols[0], aId = A.cols[1];
    var egos = Eg.filas.map(function (f) { return String(f[eId]).trim(); }).filter(Boolean);
    var datos = {};
    egos.forEach(function (e) { datos[e] = { alteri: [], attrs: {}, aristas: [] }; });
    A.filas.forEach(function (f) {
      var e = String(f[aEgo]).trim(); if (!datos[e]) return;
      var o = { id: String(f[aId]).trim() };
      A.cols.slice(2).forEach(function (c) { o[c] = String(f[c]).trim(); });
      datos[e].alteri.push(o);
    });
    V.filas.forEach(function (f) {
      var e = String(f[V.cols[0]]).trim(); if (!datos[e]) return;
      datos[e].aristas.push([f[V.cols[1]], f[V.cols[2]]]);
    });
    var redes = egos.map(function (e, k) {
      var d = datos[e], ids = d.alteri.map(function (a) { return a.id; });
      var dentro = {}; ids.forEach(function (x) { dentro[x] = 1; });
      var G = R.grafo(d.aristas.filter(function (x) { return dentro[String(x[0]).trim()] && dentro[String(x[1]).trim()]; }), ids);
      var porId = {}; d.alteri.forEach(function (a) { porId[a.id] = a; });
      return { ego: e, G: G, alteri: G.ids.map(function (id) { return porId[id] || { id: id }; }), disp: null, semilla: k + 1 };
    });
    var egoAttrs = {};
    Eg.cols.slice(1).forEach(function (c) { egoAttrs[c] = Eg.filas.filter(function (f) { return String(f[eId]).trim(); }).map(function (f) { return String(f[c]).trim(); }); });
    E = { redes: redes, egoAttrs: egoAttrs, egoCols: Eg.cols.slice(1), alterCols: A.cols.slice(2), conjunto: conjunto,
          vd: Eg.cols[1], attr: A.cols[2] || null, cat: null, graf: 'densidad' };
    E.vd = E.egoCols.filter(function (c) { return c !== 'genero' && c !== 'edad'; })[0] || E.egoCols[0];
    eligeCat();
    aviso('');
    $('#trabajo').hidden = false;
    calcula(); rellenaSelects(); pinta();
  }
  function eligeCat() {
    if (!E.attr) { E.cat = null; return; }
    var cuenta = {};
    E.redes.forEach(function (r) { r.alteri.forEach(function (a) { var v = a[E.attr]; if (v) cuenta[v] = (cuenta[v] || 0) + 1; }); });
    E.cats = Object.keys(cuenta).sort(function (a, b) { return cuenta[b] - cuenta[a]; });
    if (E.cats.indexOf(E.cat) < 0) E.cat = E.cats[0] || null;
  }
  function cargaEjemplo(clave) {
    var ej = EJEMPLOS[clave] || EJEMPLOS.sim;
    aviso(I.t('h.cargando'));
    Promise.all([ej.e, ej.a, ej.v].map(function (f) { return fetch(BASE + f).then(function (r) { return r.text(); }); }))
      .then(function (t) { carga(t[0], t[1], t[2], ej.d); })
      .catch(function () { aviso(I.t('err.leer')); });
  }
  function cargaPropios() {
    Promise.all([R.leeArchivo($('#f-egos')), R.leeArchivo($('#f-alteri')), R.leeArchivo($('#f-valteri'))])
      .then(function (t) { if (!t[0] || !t[1]) { aviso(I.t('err.leer')); return; } carga(t[0], t[1], t[2], 'g.dataset.propios'); })
      .catch(function () { aviso(I.t('err.leer')); });
  }

  // ---------- medidas por ego ----------
  function medidas() {
    var lista = [
      { k: 'tamano', n: I.t('e.tamano'), d: I.t('e.tamano.d') }, { k: 'densidad', n: I.t('e.densidad'), d: I.t('e.densidad.d') },
      { k: 'componentes', n: I.t('e.componentes'), d: I.t('e.componentes.d') }, { k: 'aislados', n: I.t('e.aislados'), d: I.t('e.aislados.d') },
      { k: 'efectivo', n: I.t('e.efectivo'), d: I.t('e.efectivo.d') }
    ];
    if (E.attr && E.cat) {
      lista.push({ k: 'prop', n: I.t('e.prop', { c: E.cat }), d: I.t('e.prop.d') });
      lista.push({ k: 'iqv', n: I.t('e.iqv', { a: E.attr }), d: I.t('e.iqv.d') });
      if (E.egoAttrs[E.attr]) lista.push({ k: 'ei', n: I.t('e.ei', { a: E.attr }), d: I.t('e.ei.d') });
    }
    return lista;
  }
  function valorMedida(k, r, i) {
    var G = r.G, n = G.n;
    if (k === 'tamano') return n;
    if (k === 'densidad') return n > 1 ? 2 * G.m / (n * (n - 1)) : NaN;
    if (k === 'componentes') return n ? R.componentes(G).n : NaN;
    if (k === 'aislados') return G.ady.filter(function (a) { return !a.length; }).length;
    if (k === 'efectivo') return n ? n - 2 * G.m / n : NaN;
    var vals = r.alteri.map(function (a) { return a[E.attr] || ''; }).filter(Boolean);
    if (k === 'prop') return vals.length ? vals.filter(function (v) { return v === E.cat; }).length / vals.length : NaN;
    if (k === 'iqv') return vals.length ? R.iqv(vals) : NaN;
    if (k === 'ei') {
      var ev = E.egoAttrs[E.attr][i];
      if (!ev || !vals.length) return NaN;
      var I_ = vals.filter(function (v) { return v === ev; }).length;
      return (vals.length - 2 * I_) / vals.length;
    }
    return NaN;
  }

  // ---------- cálculo ----------
  function tipoVD() { return R.esNumerica(E.egoAttrs[E.vd]) ? 'num' : 'cat'; }
  function calcula() {
    E.valores = {};
    E.lista = medidas().filter(function (m) {               // fuera las medidas que no varían (por ejemplo, un tamaño fijo)
      var v = E.redes.map(function (r, i) { return valorMedida(m.k, r, i); });
      E.valores[m.k] = v;
      var ok = v.filter(function (x) { return !isNaN(x); });
      return ok.length && Math.max.apply(null, ok) > Math.min.apply(null, ok);
    });
    if (!E.lista.some(function (m) { return m.k === E.graf; })) E.graf = E.lista.some(function (m) { return m.k === 'densidad'; }) ? 'densidad' : (E.lista[0] || {}).k;
    var tipo = tipoVD(), vals = E.egoAttrs[E.vd], rnd = R.azar(20261004);
    E.tipo = tipo; E.res = null;
    var validos = vals.map(function (v) { return tipo === 'num' ? !isNaN(R.numero(v)) : v !== ''; });
    if (validos.filter(Boolean).length < 4) { E.error = I.t('err.pocos', { v: E.vd }); return; }
    E.error = null;
    E.res = E.lista.map(function (m) {
      var x = [], y = [];
      E.valores[m.k].forEach(function (mv, i) { if (validos[i] && !isNaN(mv)) { x.push(mv); y.push(tipo === 'num' ? R.numero(vals[i]) : vals[i]); } });
      if (x.length < 4) return { m: m, a: NaN, p: NaN };
      if (tipo === 'num') { var s = R.spearmanPerm(x, y, NPERM, rnd); return { m: m, a: s.r, p: s.p }; }
      var e = R.eta2Perm(x, y, NPERM, rnd), medias = R.mediasPorGrupo(x, y);
      return { m: m, a: e.e, p: e.p, medias: medias, mejor: Object.keys(medias).sort(function (a, b) { return medias[b] - medias[a]; })[0] };
    });
  }

  // ---------- pintar ----------
  function rellenaSelects() {
    function llena(id, opciones, actual) {
      var s = $(id); s.textContent = '';
      opciones.forEach(function (o) { var op = el('option', { value: o[0] }, s, o[1]); if (o[0] === actual) op.selected = true; });
    }
    llena('#sel-vd', E.egoCols.map(function (c) { return [c, c]; }), E.vd);
    llena('#sel-attr', E.alterCols.map(function (c) { return [c, c]; }), E.attr);
    llena('#sel-cat', (E.cats || []).map(function (c) { return [c, c]; }), E.cat);
    llena('#sel-graf', (E.lista || medidas()).map(function (m) { return [m.k, m.n]; }), E.graf);
  }
  function pintaGaleria() {
    var gal = $('#galeria'); gal.textContent = '';
    $('#gal-nota').textContent = I.t('e.galeria', { v: E.vd });
    var vals = E.egoAttrs[E.vd], num = E.tipo === 'num';
    var orden = E.redes.map(function (_, i) { return i; }).sort(function (a, b) {
      if (num) { var x = R.numero(vals[a]), y = R.numero(vals[b]); return (isNaN(y) ? -Infinity : y) - (isNaN(x) ? -Infinity : x); }
      return String(vals[a]).localeCompare(String(vals[b]));
    }).slice(0, MAX_GALERIA);
    var cats = E.cats || [];
    orden.forEach(function (i) {
      var r = E.redes[i];
      if (!r.disp) r.disp = R.disposicion(r.G, 120, 120, 150, r.semilla);
      var cel = el('div', { 'class': 'gal-red' }, gal);
      var svg = R.svg('svg', { viewBox: '0 0 120 120', role: 'img', 'aria-label': r.ego }, cel);
      var gA = R.svg('g', { stroke: '#fff', 'stroke-opacity': .4, 'stroke-width': .8 }, svg);
      r.G.ady.forEach(function (a, u) { a.forEach(function (v) { if (u < v) R.svg('line', { x1: r.disp[u][0], y1: r.disp[u][1], x2: r.disp[v][0], y2: r.disp[v][1] }, gA); }); });
      r.alteri.forEach(function (a, k) {
        var ci = E.attr ? cats.indexOf(a[E.attr]) : -1;
        R.svg('circle', { cx: r.disp[k][0], cy: r.disp[k][1], r: 3.4, fill: ci < 0 ? '#fff' : R.PALETA[ci % R.PALETA.length], stroke: '#1d2bff', 'stroke-width': .8 }, svg);
      });
      var pie = el('div', { 'class': 'gal-pie' }, cel);
      el('span', {}, pie, r.ego);
      el('b', {}, pie, num ? I.num(R.numero(vals[i]), 1) : (vals[i] || '–'));
    });
    var ley = $('#leyenda'); ley.textContent = '';
    if (E.attr) {
      el('span', { 'class': 'ley-tit' }, ley, E.attr + ':');
      cats.forEach(function (c, k) { var s = el('span', { 'class': 'ley-item' }, ley); el('i', { style: 'background:' + R.PALETA[k % R.PALETA.length] }, s); el('span', {}, s, c); });
    }
  }
  function lectura(x) {
    if (!(x.p < .05)) return I.t('l.nada');
    if (E.tipo === 'num') return I.t(x.a > 0 ? 'l.mas' : 'l.menos', { m: x.m.n, v: E.vd });
    return I.t('l.grupos', { g: x.mejor });
  }
  function pintaResultados() {
    var box = $('#resumen'); box.textContent = '';
    var tam = E.valores.tamano, den = E.valores.densidad.filter(function (x) { return !isNaN(x); });
    [['r.egos', E.redes.length, 0], ['r.alteri', tam.reduce(function (a, b) { return a + b; }, 0), 0], ['r.tammedio', R.media(tam), 1], ['r.densmedia', R.media(den), 2]]
      .forEach(function (x) { var d = el('div', {}, box); el('b', {}, d, I.num(x[1], x[2])); el('span', {}, d, I.t(x[0])); });
    var tb = $('#tabla tbody'); tb.textContent = '';
    $('#tabla thead').innerHTML = '<tr><th>' + I.t('t.medida') + '</th><th>' + I.t('t.asoc') + '</th><th>' + I.t('t.p') + '</th><th>' + I.t('t.lectura') + '</th></tr>';
    $('#notas-tabla').textContent = '';
    if (E.error) { aviso(E.error); return; }
    aviso('');
    E.res.forEach(function (x) {
      var tr = el('tr', x.p < .05 ? { 'class': 'sig' } : {}, tb);
      el('td', { title: x.m.d }, tr, x.m.n);
      el('td', {}, tr, (E.tipo === 'num' ? 'rho = ' : 'eta² = ') + I.num(x.a, 2));
      el('td', {}, tr, I.p(x.p));
      el('td', {}, tr, lectura(x));
    });
    $('#notas-tabla').textContent = I.t(E.tipo === 'num' ? 'asoc.num' : 'asoc.cat') + ' ' + I.t('perm', { n: NPERM }) + ' ' + I.t('sig.nota');
  }
  function pintaGrafico() {
    var svg = $('#grafico'); svg.textContent = '';
    var m = E.lista.filter(function (x) { return x.k === E.graf; })[0];
    $('#graf-titulo').textContent = I.t('g.titulo', { m: m ? m.n : '', v: E.vd });
    if (!E.res || !m) return;
    var W = 520, H = 300, M = { l: 50, r: 16, t: 14, b: 40 }, vals = E.egoAttrs[E.vd], med = E.valores[E.graf];
    var ejes = R.svg('g', { stroke: '#111', 'stroke-opacity': .25 }, svg);
    var txt = R.svg('g', { 'font-size': 12, fill: '#555', 'font-family': 'Instrument Sans, sans-serif' }, svg), ptos = [];
    R.svg('line', { x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }, ejes); R.svg('line', { x1: M.l, x2: M.l, y1: M.t, y2: H - M.b }, ejes);
    if (E.tipo === 'num') {
      vals.forEach(function (v, i) { var y = R.numero(v); if (!isNaN(y) && !isNaN(med[i])) ptos.push([med[i], y, E.redes[i].ego]); });
      var x0 = Math.min.apply(null, ptos.map(function (p) { return p[0]; })), x1 = Math.max.apply(null, ptos.map(function (p) { return p[0]; }));
      var y0 = Math.min.apply(null, ptos.map(function (p) { return p[1]; })), y1 = Math.max.apply(null, ptos.map(function (p) { return p[1]; }));
      var sx = function (v) { return M.l + (v - x0) / ((x1 - x0) || 1) * (W - M.l - M.r); }, sy = function (v) { return H - M.b - (v - y0) / ((y1 - y0) || 1) * (H - M.t - M.b); };
      ptos.forEach(function (p) { var c = R.svg('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 5, fill: '#1d2bff', 'fill-opacity': .75 }, svg); R.svg('title', {}, c).textContent = p[2]; });
      R.svg('text', { x: (W + M.l) / 2, y: H - 8, 'text-anchor': 'middle' }, txt).textContent = m.n;
      R.svg('text', { x: 14, y: (H - M.b + M.t) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (H - M.b + M.t) / 2 + ')' }, txt).textContent = E.vd;
      [[x0, sx(x0)], [x1, sx(x1)]].forEach(function (a) { R.svg('text', { x: a[1], y: H - M.b + 16, 'text-anchor': 'middle' }, txt).textContent = I.num(a[0], 2); });
      [[y0, sy(y0)], [y1, sy(y1)]].forEach(function (a) { R.svg('text', { x: M.l - 6, y: a[1] + 4, 'text-anchor': 'end' }, txt).textContent = I.num(a[0], a[0] % 1 ? 1 : 0); });
    } else {
      var cats = []; vals.forEach(function (v) { if (v !== '' && cats.indexOf(v) < 0) cats.push(v); });
      vals.forEach(function (v, i) { if (v !== '' && !isNaN(med[i])) ptos.push([cats.indexOf(v), med[i], E.redes[i].ego]); });
      var lo = Math.min.apply(null, ptos.map(function (p) { return p[1]; })), hi = Math.max.apply(null, ptos.map(function (p) { return p[1]; }));
      var bw = (W - M.l - M.r) / cats.length, sy2 = function (v) { return H - M.b - (v - lo) / ((hi - lo) || 1) * (H - M.t - M.b); }, rnd = R.azar(3);
      cats.forEach(function (c, k) {
        var cx = M.l + bw * (k + .5), xs = ptos.filter(function (p) { return p[0] === k; });
        xs.forEach(function (p) { var e = R.svg('circle', { cx: cx + (rnd() - .5) * bw * .45, cy: sy2(p[1]), r: 5, fill: R.PALETA[k % R.PALETA.length], stroke: '#1d2bff', 'stroke-width': 1 }, svg); R.svg('title', {}, e).textContent = p[2]; });
        var mm = R.media(xs.map(function (p) { return p[1]; }));
        R.svg('line', { x1: cx - bw * .3, x2: cx + bw * .3, y1: sy2(mm), y2: sy2(mm), stroke: '#111', 'stroke-width': 2.5 }, svg);
        R.svg('text', { x: cx, y: H - M.b + 18, 'text-anchor': 'middle' }, txt).textContent = c;
      });
      R.svg('text', { x: 14, y: (H - M.b + M.t) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (H - M.b + M.t) / 2 + ')' }, txt).textContent = m.n;
      [[lo, sy2(lo)], [hi, sy2(hi)]].forEach(function (a) { R.svg('text', { x: M.l - 6, y: a[1] + 4, 'text-anchor': 'end' }, txt).textContent = I.num(a[0], 2); });
    }
  }
  function pintaPrompt() {
    var ta = $('#prompt');
    if (!E.res) { ta.value = ''; return; }
    var tipo = I.t(E.tipo === 'num' ? 'h.tipo.num' : 'h.tipo.cat');
    if (E.tipo === 'cat') {
      var cats = []; E.egoAttrs[E.vd].forEach(function (v) { if (v !== '' && cats.indexOf(v) < 0) cats.push(v); });
      tipo += '; ' + I.t('g.grupos', { g: cats.join(', ') });
    }
    var tam = E.valores.tamano;
    var L = [I.t('g.intro'), '',
      I.t('g.datos.ego', { d: I.t(E.conjunto), n: E.redes.length, a: tam.reduce(function (a, b) { return a + b; }, 0), v: E.vd, tipo: tipo }) +
        (E.conjunto !== 'g.dataset.propios' && I.t('v.' + E.vd) !== 'v.' + E.vd ? ' ' + I.t('v.' + E.vd) : ''),
      I.t('g.resumen', { r: I.t('r.tammedio') + ' ' + I.num(R.media(tam), 1) + '; ' + I.t('r.densmedia') + ' ' + I.num(R.media(E.valores.densidad.filter(function (x) { return !isNaN(x); })), 2) + (E.attr ? '; ' + E.attr + ': ' + (E.cats || []).join(', ') : '') }),
      '', I.t('g.asoc', { v: E.vd, metodo: E.tipo === 'num' ? 'Spearman' : 'eta²' })];
    E.res.forEach(function (x) {
      var extra = E.tipo === 'cat' && x.medias ? ' [' + Object.keys(x.medias).map(function (g) { return g + ' ' + I.num(x.medias[g], 2); }).join('; ') + ']' : '';
      L.push('- ' + x.m.n + ' (' + x.m.d.replace(/\.$/, '') + '): ' + (E.tipo === 'num' ? 'rho' : 'eta²') + ' = ' + I.num(x.a, 2) + ', p ' + I.pe(x.p) + ' (' + lectura(x) + ')' + extra);
    });
    L.push('', I.t('g.preguntas'));
    ['g.q1', 'g.q2', 'g.q3', 'g.q4', 'g.q5'].forEach(function (q, k) { L.push((k + 1) + '. ' + I.t(q, { v: E.vd })); });
    ta.value = L.join('\n');
  }
  function pintaNotaVariable() {
    var caja = $('#var-desc'), clave = 'v.' + E.vd, txt = I.t(clave);
    caja.textContent = '';
    if (E.conjunto === 'g.dataset.propios' || txt === clave) { caja.hidden = true; return; }
    caja.hidden = false;
    el('b', {}, caja, I.t('h.var.nota') + ': ');
    el('span', {}, caja, txt);
  }
  function pinta() {
    if (!E) return;
    pintaNotaVariable(); pintaResultados(); pintaGaleria(); pintaGrafico(); pintaPrompt();
    var met = $('#metodo-lista'); met.textContent = '';
    E.lista.forEach(function (m) { var li = el('li', {}, met); el('b', {}, li, m.n + ': '); el('span', {}, li, m.d); });
  }

  // ---------- eventos ----------
  raiz.querySelectorAll('[data-ejemplo]').forEach(function (b) { b.addEventListener('click', function () { cargaEjemplo(b.getAttribute('data-ejemplo')); }); });
  $('#cargar').addEventListener('click', cargaPropios);
  $('#sel-vd').addEventListener('change', function (e) { E.vd = e.target.value; calcula(); pinta(); });
  $('#sel-attr').addEventListener('change', function (e) { E.attr = e.target.value; eligeCat(); calcula(); rellenaSelects(); pinta(); });
  $('#sel-cat').addEventListener('change', function (e) { E.cat = e.target.value; calcula(); rellenaSelects(); pinta(); });
  $('#sel-graf').addEventListener('change', function (e) { E.graf = e.target.value; pintaGrafico(); });
  $('#copiar').addEventListener('click', function () {
    var ta = $('#prompt'), b = $('#copiar');
    function hecho() { b.textContent = I.t('h.copiado'); setTimeout(function () { b.textContent = I.t('h.copiar'); }, 1600); }
    if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(hecho, function () { ta.select(); document.execCommand('copy'); hecho(); });
    else { ta.select(); document.execCommand('copy'); hecho(); }
  });
  $('#descargar').addEventListener('click', function () {
    if (!E) return;
    var cab = ['ego'].concat(E.egoCols, E.lista.map(function (m) { return m.k; })), filas = [cab.join(',')];
    E.redes.forEach(function (r, i) {
      filas.push([r.ego].concat(E.egoCols.map(function (c) { return '"' + String(E.egoAttrs[c][i]).replace(/"/g, '""') + '"'; }),
        E.lista.map(function (m) { var v = E.valores[m.k][i]; return isNaN(v) ? '' : (+v.toFixed(4)); })).join(','));
    });
    R.descarga('medidas_egos.csv', filas.join('\n'));
  });
  I.alCambiar(function () { if (E) { calcula(); rellenaSelects(); pinta(); } });
  // enlace directo a un ejemplo: ?ejemplo=sim o ?ejemplo=mapcd
  var pedido = (location.search.match(/[?&]ejemplo=?(sim|mapcd)?/) || []);
  if (pedido.length) cargaEjemplo(pedido[1] || 'sim');
})();
