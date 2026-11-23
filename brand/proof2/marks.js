/* Round two mark candidates. Each is a datum line and a broad arrow of three cuts, drawn on a 120 unit square.
   draw() returns SVG shapes filled with currentColor. Nothing here is final. */
(function (root) {
  'use strict';
  function f(v) { var s = (Math.round(v * 100) / 100).toString(); return s === '-0' ? '0' : s; }
  function poly(p) { return '<polygon points="' + p.map(function (q) { return f(q[0]) + ',' + f(q[1]); }).join(' ') + '"/>'; }
  function rect(x, y, w, h) { return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '"/>'; }
  /* one cut: a wedge from the apex A toward base centre (cx, by). t0 = where it starts along that line, h0 and h1 = half widths at start and base */
  function cut(A, cx, by, t0, h0, h1) {
    var sx = A[0] + (cx - A[0]) * t0, sy = A[1] + (by - A[1]) * t0;
    return t0 === 0 && h0 === 0 ? [[A[0], A[1]], [cx + h1, by], [cx - h1, by]] : [[sx - h0, sy], [sx + h0, sy], [cx + h1, by], [cx - h1, by]];
  }
  var uid = 0;
  var C = {};
  C.K0 = { name: 'Round one', note: 'Control. Three wedges that meet under a bar.',
    draw: function () { var A = [60, 34]; return rect(10, 16, 100, 12) + [[23.5, 9.5], [60, 8], [96.5, 9.5]].map(function (w) { return poly(cut(A, w[0], 108, 0, 0, w[1])); }).join(''); } };
  C.A1 = { name: 'Open cut', note: 'The three cuts stop short of the point, as chisel cuts do. The bar stands clear.',
    draw: function () { var A = [60, 32]; return rect(6, 12, 108, 10) + [18, 60, 102].map(function (cx) { return poly(cut(A, cx, 110, 0.27, 2.6, 8.5)); }).join(''); } };
  C.A2 = { name: 'Long datum', note: 'The line is longer than the arrow and runs off to one side. On a sheet it runs on as the datum.',
    wide: true,
    draw: function (o) { var A = [38, 34], len = o && o.free ? 196 : 120; return rect(4, 14, len - 4, 10) + [10, 38, 66].map(function (cx) { return poly(cut(A, cx, 110, 0, 0, 7.5)); }).join(''); } };
  C.A3 = { name: 'Broad arrow', note: 'The arrow alone. The line is supplied by the page, or by the wordmark.',
    draw: function () { var A = [60, 8]; return [15, 60, 105].map(function (cx) { return poly(cut(A, cx, 112, 0, 0, 10.5)); }).join(''); } };
  /* a disc with shapes knocked out of it */
  function knock(cx, cy, r, holes) {
    var id = 'mk' + (++uid);
    return '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="124"><rect width="120" height="124" fill="#fff"/><g fill="#000">' + holes + '</g></mask>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" mask="url(#' + id + ')"/>';
  }
  C.A4 = { name: 'Benched circle', note: 'The line, the gap, and under it the circle of 0.10 m, with the arrow cut into it like a survey disc.',
    draw: function (o) {
      var A = [60, 25], holes = o && o.plain ? '' : [35, 60, 85].map(function (x) { return poly(cut(A, x, 99, 0, 0, 4.8)); }).join('');
      return rect(8, 8, 104, 9) + knock(60, 71, 43, holes);
    } };
  C.A5 = { name: 'Cut disc', note: 'One disc. The line and the arrow are both cut into it.',
    draw: function (o) {
      var A = [60, 33.5], holes = rect(0, 25, 120, 8.5) + (o && o.plain ? '' : [34, 60, 86].map(function (x) { return poly(cut(A, x, 103, 0, 0, 5)); }).join(''));
      return knock(60, 60, 53, holes);
    } };
  function svg(id, o) {
    o = o || {};
    var c = C[id], size = o.size || 120, rot = o.rot || 0, w = o.free && c.wide ? 200 : 120;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' 120" width="' + f(size * w / 120) + '" height="' + f(size) + '" fill="' + (o.fg || 'currentColor') + '" style="display:block;overflow:visible' + (o.fg ? '' : '') + '">' +
      '<g transform="rotate(' + rot + ' 60 60)">' + c.draw(o) + '</g></svg>';
  }
  root.SBM = { cands: C, svg: svg, cut: cut, poly: poly, rect: rect, f: f };
})(window);
