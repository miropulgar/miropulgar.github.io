// Redes: lectura de CSV, medidas de red, pruebas por permutaciones y disposición.
// Todo se calcula en el navegador; nada se envía a ningún servidor.
(function () {
  'use strict';
  var R = {};

  // ---------- CSV (coma, punto y coma o tabulador; comillas dobles) ----------
  R.leeCSV = function (texto) {
    texto = String(texto || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    var lineas = texto.split('\n').filter(function (l) { return l.trim() !== ''; });
    if (!lineas.length) return { cols: [], filas: [] };
    var sep = [',', ';', '\t'].map(function (s) { return [s, lineas[0].split(s).length]; })
      .sort(function (a, b) { return b[1] - a[1]; })[0][0];
    function parte(l) {
      var out = [], cur = '', dentro = false;
      for (var i = 0; i < l.length; i++) {
        var c = l[i];
        if (dentro) {
          if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; }
          else if (c === '"') dentro = false;
          else cur += c;
        } else if (c === '"') dentro = true;
        else if (c === sep) { out.push(cur.trim()); cur = ''; }
        else cur += c;
      }
      out.push(cur.trim());
      return out;
    }
    var cols = parte(lineas[0]);
    var filas = lineas.slice(1).map(function (l) {
      var v = parte(l), o = {};
      cols.forEach(function (c, k) { o[c] = v[k] === undefined ? '' : v[k]; });
      return o;
    });
    return { cols: cols, filas: filas };
  };

  // ¿Es numérica una columna? (admite coma decimal)
  R.numero = function (s) {
    if (s === null || s === undefined) return NaN;
    s = String(s).trim().replace(',', '.');
    return s === '' ? NaN : Number(s);
  };
  R.esNumerica = function (valores) {
    var v = valores.filter(function (x) { return String(x).trim() !== ''; });
    if (!v.length) return false;
    var nums = v.filter(function (x) { return !isNaN(R.numero(x)); }).length;
    var distintos = {}; v.forEach(function (x) { distintos[x] = 1; });
    return nums === v.length && Object.keys(distintos).length > 2;
  };

  // ---------- Grafo no dirigido, sin bucles ni duplicados ----------
  R.grafo = function (aristas, nodosExtra) {
    var ids = [], idx = {}, ady = [];
    function nodo(id) {
      id = String(id).trim();
      if (!(id in idx)) { idx[id] = ids.length; ids.push(id); ady.push([]); }
      return idx[id];
    }
    (nodosExtra || []).forEach(nodo);
    var visto = {}, m = 0;
    aristas.forEach(function (e) {
      if (e[0] === undefined || e[1] === undefined || String(e[0]).trim() === '' || String(e[1]).trim() === '') return;
      var a = nodo(e[0]), b = nodo(e[1]);
      if (a === b) return;
      var c = a < b ? a + '-' + b : b + '-' + a;
      if (visto[c]) return;
      visto[c] = 1; ady[a].push(b); ady[b].push(a); m++;
    });
    return { ids: ids, idx: idx, ady: ady, n: ids.length, m: m };
  };

  function bfs(G, s) {
    var d = new Array(G.n).fill(-1), cola = [s]; d[s] = 0;
    for (var h = 0; h < cola.length; h++) {
      var v = cola[h];
      G.ady[v].forEach(function (w) { if (d[w] < 0) { d[w] = d[v] + 1; cola.push(w); } });
    }
    return d;
  }

  R.grado = function (G) { return G.ady.map(function (a) { return a.length; }); };

  // Intermediación (Brandes), normalizada entre 0 y 1
  R.intermediacion = function (G) {
    var n = G.n, CB = new Array(n).fill(0);
    for (var s = 0; s < n; s++) {
      var S = [], P = [], sigma = new Array(n).fill(0), d = new Array(n).fill(-1), cola = [s];
      for (var i = 0; i < n; i++) P.push([]);
      sigma[s] = 1; d[s] = 0;
      for (var h = 0; h < cola.length; h++) {
        var v = cola[h]; S.push(v);
        G.ady[v].forEach(function (w) {
          if (d[w] < 0) { cola.push(w); d[w] = d[v] + 1; }
          if (d[w] === d[v] + 1) { sigma[w] += sigma[v]; P[w].push(v); }
        });
      }
      var delta = new Array(n).fill(0);
      while (S.length) {
        var w = S.pop();
        P[w].forEach(function (v) { delta[v] += sigma[v] / sigma[w] * (1 + delta[w]); });
        if (w !== s) CB[w] += delta[w];
      }
    }
    var norm = n > 2 ? (n - 1) * (n - 2) : 1;      // no dirigida: /2 por pares contados dos veces, y /((n-1)(n-2)/2)
    return CB.map(function (x) { return x / norm; });
  };

  // Cercanía armónica: sirve también con redes desconectadas
  R.cercania = function (G) {
    return G.ids.map(function (_, s) {
      var d = bfs(G, s), t = 0;
      d.forEach(function (x, k) { if (k !== s && x > 0) t += 1 / x; });
      return G.n > 1 ? t / (G.n - 1) : 0;
    });
  };

  // Centralidad de vector propio (iteración de potencia sobre A + I), máximo = 1
  R.vectorPropio = function (G) {
    var x = new Array(G.n).fill(1);
    for (var it = 0; it < 300; it++) {
      var y = x.map(function (xi, v) { return xi + G.ady[v].reduce(function (t, w) { return t + x[w]; }, 0); });
      var mx = Math.max.apply(null, y) || 1;
      var dif = 0;
      y = y.map(function (yi, k) { var z = yi / mx; dif += Math.abs(z - x[k]); return z; });
      x = y;
      if (dif < 1e-9) break;
    }
    return x;
  };

  function vecinos(G) { return G.ady.map(function (a) { var s = {}; a.forEach(function (w) { s[w] = 1; }); return s; }); }

  R.clustering = function (G) {
    var V = vecinos(G);
    return G.ady.map(function (a) {
      var k = a.length, t = 0;
      if (k < 2) return 0;
      for (var i = 0; i < k; i++) for (var j = i + 1; j < k; j++) if (V[a[i]][a[j]]) t++;
      return t / (k * (k - 1) / 2);
    });
  };

  // Restricción de Burt (sin pesos): baja = posición de puente entre grupos
  R.restriccion = function (G) {
    var V = vecinos(G);
    return G.ady.map(function (a, i) {
      if (!a.length) return NaN;
      var p = 1 / a.length, c = 0;
      a.forEach(function (j) {
        var ind = 0;
        a.forEach(function (q) { if (q !== j && V[q][j]) ind += p * (1 / G.ady[q].length); });
        c += Math.pow(p + ind, 2);
      });
      return c;
    });
  };

  R.componentes = function (G) {
    var c = new Array(G.n).fill(-1), k = 0, tam = [];
    for (var s = 0; s < G.n; s++) {
      if (c[s] >= 0) continue;
      var cola = [s]; c[s] = k;
      for (var h = 0; h < cola.length; h++) G.ady[cola[h]].forEach(function (w) { if (c[w] < 0) { c[w] = k; cola.push(w); } });
      tam.push(cola.length); k++;
    }
    return { etiqueta: c, n: k, tam: tam };
  };

  R.resumen = function (G) {
    var V = vecinos(G), tri = 0, trip = 0;
    G.ady.forEach(function (a) {
      var k = a.length; trip += k * (k - 1) / 2;
      for (var i = 0; i < k; i++) for (var j = i + 1; j < k; j++) if (V[a[i]][a[j]]) tri++;
    });
    var comp = R.componentes(G);
    return {
      n: G.n, m: G.m,
      densidad: G.n > 1 ? 2 * G.m / (G.n * (G.n - 1)) : 0,
      componentes: comp.n, mayor: Math.max.apply(null, comp.tam.concat([0])),
      gradoMedio: G.n ? 2 * G.m / G.n : 0,
      transitividad: trip ? tri / trip : 0            // cada triángulo se cuenta 3 veces en tri
    };
  };

  // ---------- Estadística ----------
  R.azar = function (semilla) {
    var s = semilla >>> 0;
    return function () { s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  R.baraja = function (a, rnd) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  };
  R.media = function (x) { return x.reduce(function (t, v) { return t + v; }, 0) / (x.length || 1); };
  R.rangos = function (x) {
    var o = x.map(function (v, i) { return [v, i]; }).sort(function (a, b) { return a[0] - b[0]; }), r = new Array(x.length);
    for (var i = 0; i < o.length;) {
      var j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++;
      for (var k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return r;
  };
  R.pearson = function (x, y) {
    var mx = R.media(x), my = R.media(y), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < x.length; i++) { var a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
  };
  // Spearman con prueba por permutaciones (se barajan los valores de la variable)
  R.spearmanPerm = function (x, y, nPerm, rnd) {
    var rx = R.rangos(x), ry = R.rangos(y), obs = R.pearson(rx, ry);
    if (isNaN(obs)) return { r: NaN, p: NaN };
    var ext = 0;
    for (var k = 0; k < nPerm; k++) if (Math.abs(R.pearson(rx, R.baraja(ry, rnd))) >= Math.abs(obs) - 1e-12) ext++;
    return { r: obs, p: (ext + 1) / (nPerm + 1) };
  };
  // Eta cuadrado (parte de la variación de x que separan los grupos) con permutaciones
  function eta2(x, g) {
    var m = R.media(x), st = 0, sb = 0, por = {};
    x.forEach(function (v, i) { st += (v - m) * (v - m); (por[g[i]] = por[g[i]] || []).push(v); });
    Object.keys(por).forEach(function (k) { var mk = R.media(por[k]); sb += por[k].length * (mk - m) * (mk - m); });
    return st ? sb / st : NaN;
  }
  R.eta2Perm = function (x, g, nPerm, rnd) {
    var obs = eta2(x, g);
    if (isNaN(obs)) return { e: NaN, p: NaN };
    var ext = 0;
    for (var k = 0; k < nPerm; k++) if (eta2(x, R.baraja(g, rnd)) >= obs - 1e-12) ext++;
    return { e: obs, p: (ext + 1) / (nPerm + 1) };
  };
  R.mediasPorGrupo = function (x, g) {
    var por = {};
    x.forEach(function (v, i) { (por[g[i]] = por[g[i]] || []).push(v); });
    var out = {}; Object.keys(por).forEach(function (k) { out[k] = R.media(por[k]); });
    return out;
  };
  // Homofilia en una red completa. Categórica: índice E-I (−1 = todo dentro del grupo; +1 = todo fuera)
  R.eiPerm = function (G, etiqueta, nPerm, rnd) {
    var con = G.ids.map(function (_, v) { return etiqueta[v] !== null && etiqueta[v] !== undefined && etiqueta[v] !== ''; });
    function ei(lab) {
      var E = 0, I = 0;
      G.ady.forEach(function (a, v) { a.forEach(function (w) { if (v < w && con[v] && con[w]) { if (lab[v] === lab[w]) I++; else E++; } }); });
      return E + I ? (E - I) / (E + I) : NaN;
    }
    var obs = ei(etiqueta), quien = [], val = [];
    con.forEach(function (c, v) { if (c) { quien.push(v); val.push(etiqueta[v]); } });
    var sum = 0, ext = 0;
    for (var k = 0; k < nPerm; k++) {
      var b = R.baraja(val, rnd), lab = etiqueta.slice();
      quien.forEach(function (v, i) { lab[v] = b[i]; });
      var e = ei(lab); sum += e; if (e <= obs + 1e-12) ext++;
    }
    return { ei: obs, esperado: sum / nPerm, p: (ext + 1) / (nPerm + 1) };   // p unilateral: ¿más dentro del grupo que al azar?
  };
  // Numérica: asortatividad (correlación de la variable entre los dos extremos de cada vínculo)
  R.asortPerm = function (G, valor, nPerm, rnd) {
    var con = valor.map(function (v) { return !isNaN(v); });
    function asort(val) {
      var a = [], b = [];
      G.ady.forEach(function (ad, v) { ad.forEach(function (w) { if (con[v] && con[w]) { a.push(val[v]); b.push(val[w]); } }); });
      return a.length > 2 ? R.pearson(a, b) : NaN;
    }
    var obs = asort(valor), quien = [], vs = [];
    con.forEach(function (c, v) { if (c) { quien.push(v); vs.push(valor[v]); } });
    var ext = 0;
    for (var k = 0; k < nPerm; k++) {
      var bar = R.baraja(vs, rnd), val = valor.slice();
      quien.forEach(function (v, i) { val[v] = bar[i]; });
      if (Math.abs(asort(val)) >= Math.abs(obs) - 1e-12) ext++;
    }
    return { r: obs, p: (ext + 1) / (nPerm + 1) };
  };
  // Diversidad de categorías (índice de variación cualitativa): 0 = todos iguales, 1 = máxima mezcla
  R.iqv = function (cats) {
    var c = {}, n = 0;
    cats.forEach(function (x) { if (x !== '' && x !== undefined) { c[x] = (c[x] || 0) + 1; n++; } });
    var k = Object.keys(c).length;
    if (n === 0 || k < 2) return 0;
    var s = 0; Object.keys(c).forEach(function (x) { s += Math.pow(c[x] / n, 2); });
    return (1 - s) * k / (k - 1);
  };

  // ---------- Disposición (Fruchterman-Reingold con algo de gravedad) ----------
  R.disposicion = function (G, ancho, alto, iter, semilla) {
    var n = G.n, rnd = R.azar(semilla || 7), area = ancho * alto, k = Math.sqrt(area / Math.max(n, 1)) * .75;
    var x = [], y = [];
    for (var i = 0; i < n; i++) { var a = 2 * Math.PI * i / Math.max(n, 1); x.push(ancho / 2 + ancho / 3 * Math.cos(a) + rnd() * 2); y.push(alto / 2 + alto / 3 * Math.sin(a) + rnd() * 2); }
    var t = ancho / 8;
    for (var it = 0; it < (iter || 300); it++) {
      var dx = new Array(n).fill(0), dy = new Array(n).fill(0);
      for (var u = 0; u < n; u++) for (var v = u + 1; v < n; v++) {
        var ex = x[u] - x[v], ey = y[u] - y[v], d = Math.sqrt(ex * ex + ey * ey) || .01, f = k * k / d;
        dx[u] += ex / d * f; dy[u] += ey / d * f; dx[v] -= ex / d * f; dy[v] -= ey / d * f;
      }
      G.ady.forEach(function (ad, u) {
        ad.forEach(function (v) {
          if (v < u) return;
          var ex = x[u] - x[v], ey = y[u] - y[v], d = Math.sqrt(ex * ex + ey * ey) || .01, f = d * d / k;
          dx[u] -= ex / d * f; dy[u] -= ey / d * f; dx[v] += ex / d * f; dy[v] += ey / d * f;
        });
      });
      for (u = 0; u < n; u++) {
        dx[u] += (ancho / 2 - x[u]) * .03 * k / 10; dy[u] += (alto / 2 - y[u]) * .03 * k / 10;   // gravedad: los aislados no se van lejos
        var dd = Math.sqrt(dx[u] * dx[u] + dy[u] * dy[u]) || .01;
        x[u] += dx[u] / dd * Math.min(dd, t); y[u] += dy[u] / dd * Math.min(dd, t);
      }
      t *= .985;
    }
    // encajar en la caja: centro y escala según el componente mayor; lo que quede fuera, al borde
    var M = 16, hw = ancho / 2 - M, hh = alto / 2 - M;
    var comp = R.componentes(G), cuenta = {}, mayor = 0;
    comp.etiqueta.forEach(function (c) { cuenta[c] = (cuenta[c] || 0) + 1; if (cuenta[c] > (cuenta[mayor] || 0)) mayor = c; });
    var cx = 0, cy = 0, nc = 0;
    for (i = 0; i < n; i++) if (comp.etiqueta[i] === mayor) { cx += x[i]; cy += y[i]; nc++; }
    cx /= nc || 1; cy /= nc || 1;
    var dmax = 0;                                      // el componente mayor llena la caja; los demás se acercan o van al borde
    for (i = 0; i < n; i++) if (comp.etiqueta[i] === mayor) dmax = Math.max(dmax, Math.abs(x[i] - cx) / hw, Math.abs(y[i] - cy) / hh);
    var s = nc > 1 ? .82 / (dmax || 1) : 1;
    return x.map(function (_, i) {
      var dx = (x[i] - cx) * s, dy = (y[i] - cy) * s, f = Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh, 1);
      return [ancho / 2 + dx / f, alto / 2 + dy / f];
    });
  };

  // ---------- Colores ----------
  R.PALETA = ['#d9f99d', '#ff8f73', '#ffffff', '#ffc6b8', '#8fd4ff', '#ffe27a', '#c7b8ff', '#9be3c4'];
  R.degradado = function (t) {        // de azul claro a lima, para variables numéricas
    t = Math.max(0, Math.min(1, t));
    var a = [143, 160, 255], b = [217, 249, 157];
    return 'rgb(' + a.map(function (c, i) { return Math.round(c + (b[i] - c) * t); }).join(',') + ')';
  };

  R.svg = function (tag, attrs, padre) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(e);
    return e;
  };
  R.descarga = function (nombre, texto) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
    a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  R.leeArchivo = function (input) {
    return new Promise(function (ok, mal) {
      var f = input.files && input.files[0];
      if (!f) return ok(null);
      var r = new FileReader();
      r.onload = function () { ok(r.result); };
      r.onerror = function () { mal(r.error); };
      r.readAsText(f, 'utf-8');
    });
  };

  window.Redes = R;
})();
