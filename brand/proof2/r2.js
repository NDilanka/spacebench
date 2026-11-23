/* Round two proof helpers. Global SB2. Needs data/hershey.js for plot() and data/geist-outlines.js for word(). */
(function (root) {
  'use strict';
  var SB2 = {};
  function f(v) { var s = (Math.round(v * 100) / 100).toString(); return s === '-0' ? '0' : s; }
  SB2.f = f;
  SB2.esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  /* ---- Plotter alphabet: Hershey Roman Simplex, one stroke per line, as a pen plotter writes. size = cap height in px. ---- */
  var CAP = 21, TOP = -12;
  SB2.plotW = function (str, size, track) {
    var H = root.SB_HERSHEY, k = size / CAP, w = 0;
    String(str).split('').forEach(function (ch) { w += ((H[ch] || H[' ']).w + (track || 0)) * k; });
    return w;
  };
  /* returns an SVG <g>. (x, y) is the left end of the baseline unless anchor is 'middle' or 'end'. */
  SB2.plot = function (str, o) {
    o = o || {};
    var H = root.SB_HERSHEY, size = o.size || 14, k = size / CAP, tr = o.track || 0, x0 = 0, d = '';
    var W = SB2.plotW(str, size, tr), ox = o.anchor === 'middle' ? -W / 2 : o.anchor === 'end' ? -W : 0;
    String(str).split('').forEach(function (ch) {
      var g = H[ch] || H[' '];
      g.s.forEach(function (st) { st.forEach(function (p, i) { d += (i ? 'L' : 'M') + f(ox + x0 + p[0] * k) + ' ' + f((p[1] - 9) * k); }); });
      x0 += (g.w + tr) * k;
    });
    var tf = 'translate(' + f(o.x || 0) + ' ' + f(o.y || 0) + ')' + (o.rot ? ' rotate(' + o.rot + ')' : '') + (o.slant ? ' skewX(' + (-o.slant) + ')' : '');
    return '<g class="plot" data-t="' + SB2.esc(str).slice(0, 30) + '" transform="' + tf + '"><path d="' + d + '" stroke="' + (o.color || 'currentColor') + '" stroke-width="' + (o.sw || Math.max(0.9, size / 13)) + '"/></g>';
  };

  /* ---- Dot numerals as SVG. Open zero. Display sizes only: pitch 10 or more. ---- */
  var DG = {
    '0': '.###. #...# #...# #...# #...# #...# .###.', '1': '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.', '2': '.###. #...# ....# ...#. ..#.. .#... #####',
    '3': '.###. #...# ....# ..##. ....# #...# .###.', '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.', '5': '##### #.... ####. ....# ....# #...# .###.',
    '6': '..##. .#... #.... ####. #...# #...# .###.', '7': '##### ....# ...#. ..#.. .#... .#... .#...', '8': '.###. #...# #...# .###. #...# #...# .###.',
    '9': '.###. #...# #...# .#### ....# ...#. .##..', '.': '. . . . . . #', ',': '. . . . . # #', ':': '. . # . # . .', '/': '....# ....# ...#. ..#.. .#... #.... #....',
    '-': '.... .... .... #### .... .... ....', ' ': '.. .. .. .. .. .. ..'
  };
  SB2.dots = function (text, o) {
    o = o || {};
    var p = o.pitch || 10, r = p * (o.fill || 0.4), x = 0, s = '';
    String(text).split('').forEach(function (ch) {
      var rows = (DG[ch] || DG[' ']).split(' '), w = rows[0].length, tight = ch === '.' || ch === ',' || ch === ':';
      if (tight) x -= p * 0.45;
      rows.forEach(function (row, iy) { for (var ix = 0; ix < w; ix++) if (row[ix] === '#') s += '<circle cx="' + f(x + (ix + 0.5) * p) + '" cy="' + f((iy + 0.5) * p + (ch === ',' && iy === 6 ? 0 : 0)) + '" r="' + f(r) + '"/>'; });
      x += (w + (tight ? 0.55 : 1)) * p;
    });
    var W = x - p;
    return '<svg class="dots" data-t="' + SB2.esc(text) + '" xmlns="http://www.w3.org/2000/svg" width="' + f(W) + '" height="' + f(7 * p) + '" viewBox="0 0 ' + f(W) + ' ' + f(7 * p) + '" fill="' + (o.fg || 'currentColor') + '">' + s + '</svg>';
  };

  /* ---- Vector wordmark from Geist outlines. Cuts are placed by hand, per letter, where a bowl meets its stem. ----
     Font units, weight 800. Each cut is [x, width]; it runs the full height of the letter. Open letters (c, e, S, k, n, i) are never cut. */
  var CUTS = { p: [[236, 24]], B: [[248, 24]], D: [[248, 24]], a: [[398, 24]], d: [[386, 24]], g: [[386, 24]] };
  var uid = 0;
  /* parts: [[text, colour], ...]. size is the font size in px. */
  SB2.word = function (parts, o) {
    o = o || {};
    var G = root.SB_GEIST, wt = String(o.weight || 800), font = G[wt].glyphs, size = o.size || 100, k = size / 1000, tr = (o.track == null ? -0.04 : o.track) * 1000;
    var x = 0, body = '', holes = '', id = 'wm' + (++uid), label = '';
    parts.forEach(function (pt) {
      label += pt[0];
      String(pt[0]).split('').forEach(function (ch) {
        var g = font[ch];
        if (!g) { x += 300; return; }
        body += '<path transform="translate(' + f(x) + ' 0)" d="' + g.d + '" fill="' + (pt[1] || 'currentColor') + '"/>';
        if (o.cuts && CUTS[ch] && wt === '800') CUTS[ch].forEach(function (c) { holes += '<rect x="' + f(x + c[0]) + '" y="-320" width="' + c[1] + '" height="1100"/>'; });
        x += g.adv + tr;
      });
    });
    var W = x - tr, asc = 760, desc = 240;
    var s = '<svg class="wm" data-t="' + SB2.esc(label) + '" xmlns="http://www.w3.org/2000/svg" width="' + f(W * k) + '" height="' + f((asc + desc) * k) + '" viewBox="0 ' + (-asc) + ' ' + f(W) + ' ' + (asc + desc) + '">';
    if (holes) s += '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="-50" y="-800" width="' + f(W + 100) + '" height="1200"><rect x="-50" y="-800" width="' + f(W + 100) + '" height="1200" fill="#fff"/><g fill="#000" transform="scale(1 -1)">' + holes + '</g></mask>';
    s += '<g' + (holes ? ' mask="url(#' + id + ')"' : '') + '><g transform="scale(1 -1)">' + body + '</g></g></svg>';
    return s;
  };

  /* ---- Title block. cells: [[label, value, width fr], ...] ---- */
  SB2.titleBlock = function (cells, style) {
    return '<div class="tb" style="grid-template-columns:' + cells.map(function (c) { return (c[2] || 1) + 'fr'; }).join(' ') + ';' + (style || '') + '">' +
      cells.map(function (c) { return '<div><i>' + c[0] + '</i><b>' + c[1] + '</b></div>'; }).join('') + '</div>';
  };

  /* dimension line with end ticks, value centred on the line in a gap */
  SB2.dimH = function (x0, x1, y, o) {
    o = o || {};
    return '<path class="dim" d="M' + f(x0) + ' ' + f(y) + 'H' + f(x1) + 'M' + f(x0) + ' ' + f(y - 5) + 'v10M' + f(x1) + ' ' + f(y - 5) + 'v10"/>';
  };
  root.SB2 = SB2;
})(window);
