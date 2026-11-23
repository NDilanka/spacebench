/* Drawing helpers for sheets: plotter alphabet, dot numerals, title block. Global SBDraw. plot() needs js/sb-hershey.js. */
(function (root) {
  'use strict';
  var SBDraw = {};
  function f(v) { var s = (Math.round(v * 100) / 100).toString(); return s === '-0' ? '0' : s; }
  SBDraw.f = f;
  SBDraw.esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  /* ---- Plotter alphabet: Hershey Roman Simplex, one stroke per line, as a pen plotter writes. size = cap height in px. ---- */
  var CAP = 21, TOP = -12;
  SBDraw.plotW = function (str, size, track) {
    var H = root.SB_HERSHEY, k = size / CAP, w = 0;
    String(str).split('').forEach(function (ch) { w += ((H[ch] || H[' ']).w + (track || 0)) * k; });
    return w;
  };
  /* returns an SVG <g>. (x, y) is the left end of the baseline unless anchor is 'middle' or 'end'. */
  SBDraw.plot = function (str, o) {
    o = o || {};
    var H = root.SB_HERSHEY, size = o.size || 14, k = size / CAP, tr = o.track || 0, x0 = 0, d = '';
    var W = SBDraw.plotW(str, size, tr), ox = o.anchor === 'middle' ? -W / 2 : o.anchor === 'end' ? -W : 0;
    String(str).split('').forEach(function (ch) {
      var g = H[ch] || H[' '];
      g.s.forEach(function (st) { st.forEach(function (p, i) { d += (i ? 'L' : 'M') + f(ox + x0 + p[0] * k) + ' ' + f((p[1] - 9) * k); }); });
      x0 += (g.w + tr) * k;
    });
    var tf = 'translate(' + f(o.x || 0) + ' ' + f(o.y || 0) + ')' + (o.rot ? ' rotate(' + o.rot + ')' : '') + (o.slant ? ' skewX(' + (-o.slant) + ')' : '');
    return '<g class="plot" data-t="' + SBDraw.esc(str).slice(0, 30) + '" transform="' + tf + '"><path d="' + d + '" stroke="' + (o.color || 'currentColor') + '" stroke-width="' + (o.sw || Math.max(0.9, size / 13)) + '"/></g>';
  };

  /* ---- Dot numerals as SVG. Open zero. Display sizes only: pitch 10 or more. ---- */
  var DG = {
    '0': '.###. #...# #...# #...# #...# #...# .###.', '1': '.#. ##. .#. .#. .#. .#. ###', '2': '.###. #...# ....# ...#. ..#.. .#... #####',
    '3': '.###. #...# ....# ..##. ....# #...# .###.', '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.', '5': '##### #.... ####. ....# ....# #...# .###.',
    '6': '..##. .#... #.... ####. #...# #...# .###.', '7': '##### ....# ...#. ..#.. .#... .#... .#...', '8': '.###. #...# #...# .###. #...# #...# .###.',
    '9': '.###. #...# #...# .#### ....# ...#. .##..', '.': '. . . . . . #', ',': '. . . . . # #', ':': '. . # . # . .', '/': '....# ....# ...#. ..#.. .#... #.... #....',
    '-': '.... .... .... #### .... .... ....', ' ': '.. .. .. .. .. .. ..'
  };
  SBDraw.dots = function (text, o) {
    o = o || {};
    var p = o.pitch || 10, r = p * (o.fill || 0.4), x = 0, s = '';
    String(text).split('').forEach(function (ch) {
      var rows = (DG[ch] || DG[' ']).split(' '), w = rows[0].length, tight = ch === '.' || ch === ',' || ch === ':';
      if (tight) x -= p * 0.45;
      rows.forEach(function (row, iy) { for (var ix = 0; ix < w; ix++) if (row[ix] === '#') s += '<circle cx="' + f(x + (ix + 0.5) * p) + '" cy="' + f((iy + 0.5) * p + (ch === ',' && iy === 6 ? 0 : 0)) + '" r="' + f(r) + '"/>'; });
      x += (w + (tight ? 0.55 : 1)) * p;
    });
    var W = x - p;
    return '<svg class="dots" data-t="' + SBDraw.esc(text) + '" xmlns="http://www.w3.org/2000/svg" width="' + f(W) + '" height="' + f(7 * p) + '" viewBox="0 0 ' + f(W) + ' ' + f(7 * p) + '" fill="' + (o.fg || 'currentColor') + '">' + s + '</svg>';
  };

  /* ---- Title block. cells: [[label, value, width fr], ...] ---- */
  SBDraw.titleBlock = function (cells, style) {
    return '<div class="tb" style="grid-template-columns:' + cells.map(function (c) { return (c[2] || 1) + 'fr'; }).join(' ') + ';' + (style || '') + '">' +
      cells.map(function (c) { return '<div><i>' + c[0] + '</i><b>' + c[1] + '</b></div>'; }).join('') + '</div>';
  };

  /* dimension line with end ticks, value centred on the line in a gap */
  SBDraw.dimH = function (x0, x1, y, o) {
    o = o || {};
    return '<path class="dim" d="M' + f(x0) + ' ' + f(y) + 'H' + f(x1) + 'M' + f(x0) + ' ' + f(y - 5) + 'v10M' + f(x1) + ' ' + f(y - 5) + 'v10"/>';
  };
  root.SBDraw = SBDraw;
})(window);
