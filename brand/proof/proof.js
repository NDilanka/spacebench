/* Proof round shared code. Everything is drawn from seeded SPECIMEN flights and from
   the scenario constants in DESIGN.md. Specimen data is not a result. */
(function (root) {
  'use strict';
  var SBP = {};
  var HOLDS = [250, 30, 10], KEEP_OUT = 200, START = 400, MIN_PULSE = 0.035;
  var LIMITS = [
    { key: 'closing', label: 'Closing speed', unit: 'm/s', min: 0.05, max: 0.10, text: '0.05 to 0.10 m/s' },
    { key: 'lateral', label: 'Sideways speed', unit: 'm/s', max: 0.04, text: '0.04 m/s' },
    { key: 'pyRate', label: 'Pitch and yaw rate', unit: 'deg/s', max: 0.20, text: '0.20 deg/s' },
    { key: 'rollRate', label: 'Roll rate', unit: 'deg/s', max: 0.20, text: '0.20 deg/s' },
    { key: 'offset', label: 'Sideways misalignment', unit: 'm', max: 0.10, text: '0.10 m' },
    { key: 'pyAngle', label: 'Pitch and yaw misalignment', unit: 'deg', max: 4.0, text: '4.0 deg' },
    { key: 'rollAngle', label: 'Roll misalignment', unit: 'deg', max: 4.0, text: '4.0 deg' }
  ];
  var TIERS = ['Aligned approach, no noise', 'Full six-axis offset', 'Sensor noise and a fuel limit', 'Actuator errors and one stuck thruster', 'Several thruster failures mid-approach', 'Tumbling target, orbital dynamics on'];
  SBP.HOLDS = HOLDS; SBP.KEEP_OUT = KEEP_OUT; SBP.START = START; SBP.LIMITS = LIMITS; SBP.TIERS = TIERS;

  function f(v) { var s = (Math.round(v * 100) / 100).toString(); return s === '-0' ? '0' : s; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
  SBP.rng = rng; SBP.gauss = gauss; SBP.f = f; SBP.clamp = clamp;

  /* ---------- Mark, second form ----------
     A surveyor's bench mark: a datum bar and a broad arrow of three cut strokes that
     meet at one point. Each stroke is a wedge, as a chisel leaves it. 120 unit canvas. */
  var MARK = { bar: [[10, 16], [110, 16], [110, 28], [10, 28]], apex: [60, 34], base: 108, wedges: [[14, 33], [52, 68], [87, 106]] };
  SBP.MARK = MARK;
  var uid = 0;
  function pts(a) { return a.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' '); }
  function mix(a, b, t) { return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ')'; }
  function hex(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  SBP.hex = hex; SBP.mix = mix;
  function wedgePolys() { return MARK.wedges.map(function (w) { return [MARK.apex, [w[0], MARK.base], [w[1], MARK.base]]; }); }
  function inPoly(x, y, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  SBP.inMark = function (x, y) { return inPoly(x, y, MARK.bar) || wedgePolys().some(function (p) { return inPoly(x, y, p); }); };

  /* variant: solid | cut | stencil | outline | dot | arrow (no bar). rot in degrees. */
  SBP.mark = function (o) {
    o = o || {};
    var v = o.variant || 'solid', deg = o.rot || 0, fg = o.fg || 'currentColor', size = o.size || 120, id = 'm' + (++uid);
    var W = wedgePolys(), s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="' + size + '" height="' + size + '" style="overflow:visible">';
    s += '<g transform="rotate(' + deg + ' 60 60)">';
    var bar = o.noBar ? '' : '<polygon points="' + pts(MARK.bar) + '"/>';
    var wed = W.map(function (p) { return '<polygon points="' + pts(p) + '"/>'; }).join('');
    if (v === 'solid') s += '<g fill="' + fg + '">' + bar + wed + '</g>';
    else if (v === 'outline') {
      var sw = o.stroke || 2.4;
      s += '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="-10" y="-10" width="140" height="140"><rect x="-10" y="-10" width="140" height="140" fill="#000"/>' +
        '<g fill="#fff" stroke="#fff" stroke-width="' + (sw * 2) + '" stroke-linejoin="miter" stroke-miterlimit="8">' + bar + wed + '</g><g fill="#000">' + bar + wed + '</g></mask>' +
        '<rect x="-10" y="-10" width="140" height="140" fill="' + fg + '" mask="url(#' + id + ')"/>';
    } else if (v === 'stencil') {
      s += '<clipPath id="' + id + '"><rect x="0" y="' + (MARK.apex[1] + 15) + '" width="120" height="120"/></clipPath>';
      s += '<g fill="' + fg + '">';
      if (!o.noBar) s += '<rect x="10" y="16" width="28" height="12"/><rect x="43" y="16" width="34" height="12"/><rect x="82" y="16" width="28" height="12"/>';
      s += '<g clip-path="url(#' + id + ')">' + wed + '</g></g>';
    } else if (v === 'dot') {
      var n = o.n || 19, st = 120 / n, r = st * 0.43;
      s += '<g fill="' + fg + '">';
      for (var iy = 0; iy < n; iy++) for (var ix = 0; ix < n; ix++) {
        var x = (ix + 0.5) * st, y = (iy + 0.5) * st;
        if (SBP.inMark(x, y) && !(o.noBar && y < 30)) s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '"/>';
        else if (o.ghost) s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * 0.28) + '" opacity=".35"/>';
      }
      s += '</g>';
    } else if (v === 'cut') {
      /* V-cut: the wall on the far side from the light is lit. Light comes from the upper left of the page. */
      var ground = hex(o.ground || '#C9CDD4'), dark = hex(o.dark || '#4E5563'), light = hex(o.light || '#FFFFFF');
      var L = [-0.5, -0.87], a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      var tone = function (sx, sy) {
        var rx = sx * ca - sy * sa, ry = sx * sa + sy * ca, d = rx * L[0] + ry * L[1];
        return d > 0 ? mix(ground, dark, 0.35 + 0.65 * d) : mix(ground, light, 0.3 + 0.7 * -d);
      };
      if (!o.noBar) {
        s += '<polygon points="10,16 110,16 104,22 16,22" fill="' + tone(0, -1) + '"/><polygon points="10,28 110,28 104,22 16,22" fill="' + tone(0, 1) + '"/>';
        s += '<polygon points="10,16 16,22 10,28" fill="' + tone(-1, 0) + '"/><polygon points="110,16 104,22 110,28" fill="' + tone(1, 0) + '"/>';
      }
      W.forEach(function (p) {
        var mx = (p[1][0] + p[2][0]) / 2, ax = mx - p[0][0], ay = MARK.base - p[0][1], len = Math.hypot(ax, ay);
        var nx = ay / len, ny = -ax / len; /* points to the +x side of the stroke */
        var foot = [mx - ax / len * 7, MARK.base - ay / len * 7];
        s += '<polygon points="' + pts([p[0], p[1], foot]) + '" fill="' + tone(-nx, -ny) + '"/>';
        s += '<polygon points="' + pts([p[0], foot, p[2]]) + '" fill="' + tone(nx, ny) + '"/>';
        s += '<polygon points="' + pts([p[1], p[2], foot]) + '" fill="' + tone(ax / len, ay / len) + '"/>';
      });
    }
    return s + '</g></svg>';
  };

  /* Compound emblems from the same arrow. n arrows around one datum, pointing in. */
  SBP.emblem = function (o) {
    o = o || {};
    var n = o.n || 4, size = o.size || 200, fg = o.fg || 'currentColor', gap = o.gap == null ? 7 : o.gap, len = o.len || 46;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200" width="' + size + '" height="' + size + '" style="overflow:visible">';
    var k = len / 74, wd = MARK.wedges, phase = o.phase || 0;
    for (var i = 0; i < n; i++) {
      s += '<g transform="rotate(' + f(phase + i * 360 / n) + ')" fill="' + fg + '">';
      wd.forEach(function (w) {
        s += '<polygon points="0,' + f(gap) + ' ' + f((w[0] - 60) * k) + ',' + f(gap + len) + ' ' + f((w[1] - 60) * k) + ',' + f(gap + len) + '"/>';
      });
      s += '</g>';
    }
    if (o.ring) s += '<circle r="' + o.ring + '" fill="none" stroke="' + fg + '" stroke-width="' + (o.ringW || 3) + '"/>';
    if (o.hooks) for (var h = 0; h < o.hooks; h++) s += '<rect x="-2.2" y="' + f(-(o.ring + 9)) + '" width="4.4" height="9" fill="' + fg + '" transform="rotate(' + f(h * 360 / o.hooks + 15) + ')"/>';
    if (o.dot) s += '<circle r="' + o.dot + '" fill="' + fg + '"/>';
    return s + '</svg>';
  };

  /* ---------- SPECIMEN flight ----------
     A plausible seeded action log for layout work. Turns are pulse-then-coast decisions.
     Sixteen thrusters; the layout is schematic until the vehicle model is fixed. */
  SBP.flight = function (seed, tier) {
    tier = tier || 1;
    var r = rng(((seed >>> 0) * 7919 + tier * 977 + 13) >>> 0);
    var T = Math.round(1500 + r() * 1400 + tier * 160);
    var th = [T * (0.16 + r() * 0.06), T * (0.50 + r() * 0.08), T * (0.74 + r() * 0.06)];
    var knots = [[0, START], [th[0], 250], [th[1], 30], [th[2], 10], [T, 0]];
    function rangeAt(t) {
      for (var i = 1; i < knots.length; i++) if (t <= knots[i][0]) {
        var u = (t - knots[i - 1][0]) / (knots[i][0] - knots[i - 1][0]); u = u * u * (3 - 2 * u);
        var a = Math.log(1 + knots[i - 1][1]), b = Math.log(1 + knots[i][1]);
        return Math.exp(a + (b - a) * u) - 1;
      }
      return 0;
    }
    var q = function (lo, hi) { return Math.round((lo + r() * (hi - lo)) * 1000) / 1000; }, hard = tier * 0.035;
    var contact = {
      closing: q(0.055, 0.092 + hard * 0.35), lateral: q(0.004, 0.022 + hard * 0.2), pyRate: q(0.01, 0.1 + hard), rollRate: q(0.01, 0.09 + hard),
      offset: q(0.005, 0.05 + hard * 0.5), pyAngle: q(0.1, 1.6 + tier * 0.55), rollAngle: q(0.1, 1.4 + tier * 0.6)
    };
    var early = r() < 0.035 * tier ? ['FUEL OUT', 'LEFT CORRIDOR', 'TIME OUT'][Math.floor(r() * 3)] : null;
    var endU = early ? 0.45 + r() * 0.45 : 1;
    var pass = !early && LIMITS.every(function (l) { var v = contact[l.key]; return v <= l.max && (l.min == null || v >= l.min); });
    var r0 = tier >= 2 ? 6 + r() * 20 : 0.5 + r() * 1.3, th0 = r() * 6.283, turns = (0.2 + r() * 0.75) * (r() < 0.5 ? -1 : 1);
    var k1 = 2 + r() * 4, p1 = r() * 6.283, k2 = 1 + r() * 3, p2 = r() * 6.283, kick = tier >= 4 ? 0.35 + r() * 0.4 : -1, kickA = 1.2 + r() * 2.2;
    function lateralAt(t) {
      var rg = rangeAt(t), p = 1 - Math.log(1 + rg) / Math.log(1 + START), u = t / T;
      var rho = Math.exp((1 - p) * Math.log(r0) + p * Math.log(contact.offset));
      rho *= 1 + 0.32 * Math.sin(k1 * 6.283 * u + p1) * (1 - 0.6 * p);
      if (kick > 0) rho *= 1 + kickA * Math.exp(-Math.pow((u - kick) / 0.07, 2));
      var ang = th0 + turns * 6.283 * Math.pow(p, 1.25) + 0.4 * Math.sin(k2 * 6.283 * u + p2);
      return [rho * Math.cos(ang), rho * Math.sin(ang), rho];
    }
    var N = Math.round(90 + tier * 22 + r() * 60), cdf = [], acc = 0, M = 400;
    for (var i = 0; i < M; i++) {
      var u = (i + 0.5) / M, d = 0.7 + 3.2 * Math.pow(u, 3);
      th.forEach(function (h) { d += 2.4 * Math.exp(-Math.pow((u - h / T) / 0.03, 2)); });
      acc += d; cdf.push(acc);
    }
    var times = [];
    for (i = 0; i < N; i++) {
      var target = (i + r() * 0.8) / N * acc, lo = 0;
      while (cdf[lo] < target && lo < M - 1) lo++;
      times.push(clamp((lo + r()) / M * T, 1, T - 1));
    }
    times.sort(function (a, b) { return a - b; });
    var stuck = tier >= 4 ? { th: 14, from: kick * T } : null, failed = tier >= 5 ? [2, 11] : [];
    var steps = [], prevV = [0, 0, 0], groups = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9], [10, 11], [12, 13], [14, 15]], fuel = 0;
    for (i = 0; i < N; i++) {
      var t = times[i], tn = i < N - 1 ? times[i + 1] : T, dt = Math.max(1, tn - t);
      if (t / T > endU) break;
      var a0 = lateralAt(t), a1 = lateralAt(tn), rg0 = rangeAt(t), rg1 = rangeAt(tn);
      var v = [(rg1 - rg0) / dt, (a1[0] - a0[0]) / dt, (a1[1] - a0[1]) / dt], dv = [v[0] - prevV[0], v[1] - prevV[1], v[2] - prevV[2]];
      prevV = v;
      var pulses = [];
      [0, 1, 2].forEach(function (c) {
        var w = Math.abs(dv[c]) / (c === 0 ? 0.05 : 0.012);
        if (r() < clamp(0.18 + 0.3 * w, 0, 0.92)) {
          var g = groups[c * 2 + (dv[c] > 0 ? 0 : 1)], lvl = clamp(Math.round(Math.log(1 + w * 3) / Math.LN2 + gauss(r) * 0.6), 0, 6), cnt = c === 0 ? 2 + (r() < 0.4 ? 2 : 0) : 1 + (r() < 0.5 ? 1 : 0);
          for (var k = 0; k < cnt && k < g.length; k++) pulses.push({ th: g[k], dur: MIN_PULSE * Math.pow(2, lvl), lvl: lvl });
        }
      });
      if (r() < 0.22) { var gA = Math.floor(r() * 16), lv = Math.floor(r() * 3); pulses.push({ th: gA, dur: MIN_PULSE * Math.pow(2, lv), lvl: lv }, { th: (gA + 8) % 16, dur: MIN_PULSE * Math.pow(2, lv), lvl: lv }); }
      if (stuck && t >= stuck.from && r() < 0.7) { var lv2 = 2 + Math.floor(r() * 4); pulses.push({ th: 14, dur: MIN_PULSE * Math.pow(2, lv2), lvl: lv2 }); }
      pulses = pulses.filter(function (p) { return failed.indexOf(p.th) < 0 || t < 0.4 * T; });
      pulses.forEach(function (p) { fuel += p.dur; });
      steps.push({ i: i, t: t, coast: dt, range: rg0, y: a0[0], z: a0[1], rho: a0[2], closing: -v[0], pulses: pulses });
    }
    var last = steps[steps.length - 1], endLat = early ? lateralAt(last.t) : lateralAt(T);
    var hash = ''; for (i = 0; i < 16; i++) hash += '0123456789ABCDEF'[Math.floor(r() * 16)];
    return { specimen: true, seed: seed, tier: tier, duration: early ? last.t + last.coast : T, T: T, holds: th, steps: steps, contact: contact, pass: pass, early: early, stuck: stuck, failed: failed,
      end: { y: endLat[0], z: endLat[1], rho: endLat[2], range: early ? last.range : 0 }, burn: fuel, rangeAt: rangeAt, lateralAt: lateralAt, hash: hash,
      bracket: 'SB-D' + tier + '-' + ('0000' + seed).slice(-4) };
  };
  SBP.fmtT = function (t) { var m = Math.floor(t / 60), s = Math.floor(t % 60); return 'T+' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; };

  /* Hand-drawn marks: a wobbly ellipse, an arrow, a tick, an underline. Seeded so they do not change. */
  SBP.pen = {
    ring: function (cx, cy, rx, ry, seed, o) {
      o = o || {}; var r = rng(seed || 1), d = '', n = 44, over = 1.13, st = r() * 6.283;
      for (var i = 0; i <= n * over; i++) {
        var a = st + i / n * 6.283, k = 1 + 0.05 * Math.sin(a * 2 + r()) + (i / n) * 0.04 + (r() - 0.5) * 0.02;
        d += (i ? 'L' : 'M') + f(cx + rx * k * Math.cos(a)) + ' ' + f(cy + ry * k * Math.sin(a));
      }
      return '<path d="' + d + '" fill="none" stroke="' + (o.c || 'var(--pen)') + '" stroke-width="' + (o.w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    },
    line: function (x0, y0, x1, y1, seed, o) {
      o = o || {}; var r = rng(seed || 2), n = 10, d = '', dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, bow = (o.bow == null ? 0.06 : o.bow) * len;
      for (var i = 0; i <= n; i++) { var u = i / n, w = Math.sin(u * 3.1416) * bow + (r() - 0.5) * 1.6; d += (i ? 'L' : 'M') + f(x0 + dx * u + nx * w) + ' ' + f(y0 + dy * u + ny * w); }
      var s = '<path d="' + d + '" fill="none" stroke="' + (o.c || 'var(--pen)') + '" stroke-width="' + (o.w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round"/>';
      if (o.arrow) {
        var a = Math.atan2(y1 - (y0 + dy * 0.9 + ny * bow * 0.3), x1 - (x0 + dx * 0.9 + nx * bow * 0.3)), h = o.head || 11;
        s += '<path d="M' + f(x1 + h * Math.cos(a + 2.6)) + ' ' + f(y1 + h * Math.sin(a + 2.6)) + 'L' + f(x1) + ' ' + f(y1) + 'L' + f(x1 + h * Math.cos(a - 2.5)) + ' ' + f(y1 + h * Math.sin(a - 2.5)) + '" fill="none" stroke="' + (o.c || 'var(--pen)') + '" stroke-width="' + (o.w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round"/>';
      }
      return s;
    },
    tick: function (x, y, s, seed, o) { o = o || {}; return '<path d="M' + f(x) + ' ' + f(y) + 'l' + f(s * 0.32) + ' ' + f(s * 0.36) + 'l' + f(s * 0.62) + ' ' + f(-s * 0.95) + '" fill="none" stroke="' + (o.c || 'var(--pen)') + '" stroke-width="' + (o.w || 2) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  };

  /* Stencil lettering. Draws the word, finds each closed counter, and cuts one slot through it,
     as wide as the gap in the mark. Raster, for the proof round only. */
  SBP.stencil = function (canvas, text, o) {
    o = o || {};
    var px = o.size || 200, wt = o.weight || 800, sc = o.scale || 2, track = o.track == null ? -0.045 : o.track, slot = (o.slot == null ? 0.05 : o.slot) * px * sc;
    var ctx = canvas.getContext('2d'), font = wt + ' ' + (px * sc) + 'px Geist';
    ctx.font = font; ctx.letterSpacing = (track * px * sc) + 'px';
    var w = Math.ceil(ctx.measureText(text).width + px * sc * 0.1), h = Math.ceil(px * sc * 1.25);
    canvas.width = w; canvas.height = h; canvas.style.width = (w / sc) + 'px'; canvas.style.height = (h / sc) + 'px';
    ctx = canvas.getContext('2d'); ctx.font = font; ctx.letterSpacing = (track * px * sc) + 'px'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#000';
    ctx.fillText(text, px * sc * 0.03, px * sc * 0.96);
    var im = ctx.getImageData(0, 0, w, h), a = im.data, bg = new Uint8Array(w * h), stack = [];
    function push(x, y) { var k = y * w + x; if (bg[k] || a[k * 4 + 3] > 100) return; bg[k] = 1; stack.push(k); }
    for (var x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (var y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) { var k = stack.pop(), kx = k % w, ky = (k / w) | 0; if (kx > 0) push(kx - 1, ky); if (kx < w - 1) push(kx + 1, ky); if (ky > 0) push(kx, ky - 1); if (ky < h - 1) push(kx, ky + 1); }
    var holes = [];
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var k0 = y * w + x;
      if (bg[k0] || a[k0 * 4 + 3] > 100) continue;
      var minx = x, maxx = x, miny = y, maxy = y, cnt = 0; bg[k0] = 2; stack.push(k0);
      while (stack.length) {
        var c = stack.pop(), cx = c % w, cy = (c / w) | 0; cnt++; if (cx < minx) minx = cx; if (cx > maxx) maxx = cx; if (cy < miny) miny = cy; if (cy > maxy) maxy = cy;
        [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]].forEach(function (p) { var kk = p[1] * w + p[0]; if (p[0] >= 0 && p[0] < w && p[1] >= 0 && p[1] < h && !bg[kk] && a[kk * 4 + 3] <= 100) { bg[kk] = 2; stack.push(kk); } });
      }
      if (cnt > px * sc * 0.6) holes.push({ x: (minx + maxx) / 2, y0: miny, y1: maxy });
    }
    holes.sort(function (p, q2) { return p.x - q2.x; });
    var cuts = [];
    holes.forEach(function (hl) {
      var last = cuts[cuts.length - 1];
      if (last && hl.x - last.x < px * sc * 0.2) { last.y0 = Math.min(last.y0, hl.y0); last.y1 = Math.max(last.y1, hl.y1); last.x = (last.x + hl.x) / 2; }
      else cuts.push({ x: hl.x, y0: hl.y0, y1: hl.y1 });
    });
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
    cuts.forEach(function (c) {
      if (o.wedge) {
        /* chisel cuts: two wedges that taper to a point inside the counter */
        var bw = slot * (o.wedge === true ? 1.9 : o.wedge), mid = (c.y0 + c.y1) / 2, top = c.y0 - px * sc * 0.3, bot = c.y1 + px * sc * 0.3;
        ctx.beginPath(); ctx.moveTo(c.x - bw / 2, top); ctx.lineTo(c.x + bw / 2, top); ctx.lineTo(c.x, c.y0 + (mid - c.y0) * 0.9); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(c.x - bw / 2, bot); ctx.lineTo(c.x + bw / 2, bot); ctx.lineTo(c.x, c.y1 - (c.y1 - mid) * 0.9); ctx.closePath(); ctx.fill();
      } else ctx.fillRect(Math.round(c.x - slot / 2), 0, Math.round(slot), h);
    });
    ctx.globalCompositeOperation = 'source-over';
    if (o.color && o.color !== '#000') { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = o.color; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over'; }
    if (o.split) {
      var sx = ctx.measureText(o.split[0]).width + px * sc * 0.03 - px * sc * 0.02;
      ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = o.split[1]; ctx.fillRect(0, 0, sx, h); ctx.fillStyle = o.split[2]; ctx.fillRect(sx, 0, w, h);
      if (o.split[3]) { var sx2 = ctx.measureText(o.split[3]).width + px * sc * 0.03 - px * sc * 0.02; ctx.fillStyle = o.split[4]; ctx.fillRect(sx2, 0, w, h); }
      ctx.globalCompositeOperation = 'source-over';
    }
    return { width: w / sc, height: h / sc, baseline: px * 0.96, left: px * 0.03 };
  };

  /* Dot numerals drawn as SVG, so every dot stays round at any size. The zero is open. */
  var DG = {
    '0': '.###. #...# #...# #...# #...# #...# .###.', '1': '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.', '2': '.###. #...# ....# ...#. ..#.. .#... #####',
    '3': '.###. #...# ....# ..##. ....# #...# .###.', '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.', '5': '##### #.... ####. ....# ....# #...# .###.',
    '6': '..##. .#... #.... ####. #...# #...# .###.', '7': '##### ....# ...#. ..#.. .#... .#... .#...', '8': '.###. #...# #...# .###. #...# #...# .###.',
    '9': '.###. #...# #...# .#### ....# ...#. .##..', '.': '. . . . . . #', ':': '. . # . # . .', '/': '....# ....# ...#. ..#.. .#... #.... #....',
    '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....', '-': '.... .... .... #### .... .... ....', ' ': '.. .. .. .. .. .. ..', '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
    'T': '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..', 'D': '####. #...# #...# #...# #...# #...# ####.', 'M': '#...# ##.## #.#.# #...# #...# #...# #...#', 'S': '.#### #.... #.... .###. ....# ....# ####.'
  };
  SBP.dots = function (text, o) {
    o = o || {};
    var p = o.pitch || 10, r = p * (o.fill || 0.44), fg = o.fg || 'currentColor', x = 0, s = '', ghost = o.ghost;
    String(text).split('').forEach(function (ch) {
      var rows = (DG[ch] || DG[' ']).split(' '), w = rows[0].length;
      rows.forEach(function (row, iy) { for (var ix = 0; ix < w; ix++) {
        if (row[ix] === '#') s += '<circle cx="' + f(x + (ix + 0.5) * p) + '" cy="' + f((iy + 0.5) * p) + '" r="' + f(r) + '"/>';
        else if (ghost) s += '<circle cx="' + f(x + (ix + 0.5) * p) + '" cy="' + f((iy + 0.5) * p) + '" r="' + f(r * 0.22) + '" opacity="' + ghost + '"/>';
      } });
      x += (w + 1) * p;
    });
    var W = x - p;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + f(W) + '" height="' + f(7 * p) + '" viewBox="0 0 ' + f(W) + ' ' + f(7 * p) + '" fill="' + fg + '" style="overflow:visible">' + s + '</svg>';
  };

  /* Capsule seen from the side, nose to the right. Schematic: our own shape, not a real vehicle. Unit length 100. */
  SBP.capsule = function (o) {
    o = o || {};
    var st = o.stroke || 'currentColor', sw = o.sw || 1, fill = o.fill || 'none';
    return '<g fill="' + fill + '" stroke="' + st + '" stroke-width="' + sw + '" stroke-linejoin="round">' +
      '<path d="M0 -25H46V25H0Z"/><path d="M46 -25L84 -12V12L46 25"/><path d="M84 -9H96V9H84"/><path d="M96 -11H100V11H96Z"/>' +
      (o.detail ? '<path d="M12 -25V25M34 -25V25" opacity=".5"/><circle cx="62" cy="0" r="4.5" opacity=".7"/>' : '') + '</g>';
  };
  root.SBP = SBP;
})(typeof window !== 'undefined' ? window : globalThis);
