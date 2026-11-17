/* SpaceBench graphics. Every device here is drawn from simulator quantities:
   pulses, coast times, ranges, hold points, tolerances. Nothing is decorative.
   All functions return an SVG string. Colours default to CSS custom properties
   from tokens.css; pass { colors: { fg, muted, line, accent } } for fixed values. */
(function (root) {
  'use strict';

  var DEF = {
    fg: 'currentColor',
    muted: 'var(--sb-fg-3, #8A8A84)',
    line: 'var(--sb-line-strong, #C2C2BD)',
    accent: 'var(--sb-accent, currentColor)',
    mono: 'var(--sb-font-mono, "Geist Mono", ui-monospace, monospace)'
  };

  /* Scenario constants, from DESIGN.md section 4.2 (NASA press kits, IDSS IDD Rev F table 3.3.1.1-2). */
  var HOLDS = [250, 30, 10];
  var KEEP_OUT = 200;
  var START = 400;
  var LIMITS = [
    { key: 'closing', label: 'Closing speed', unit: 'm/s', min: 0.05, max: 0.10, text: '0.05 to 0.10 m/s' },
    { key: 'lateral', label: 'Sideways speed', unit: 'm/s', max: 0.04, text: '0.04 m/s' },
    { key: 'pyRate', label: 'Pitch and yaw rate', unit: 'deg/s', max: 0.20, text: '0.20 deg/s' },
    { key: 'rollRate', label: 'Roll rate', unit: 'deg/s', max: 0.20, text: '0.20 deg/s' },
    { key: 'offset', label: 'Sideways misalignment', unit: 'm', max: 0.10, text: '0.10 m' },
    { key: 'pyAngle', label: 'Pitch and yaw misalignment', unit: 'deg', max: 4.0, text: '4.0 deg' },
    { key: 'rollAngle', label: 'Roll misalignment', unit: 'deg', max: 4.0, text: '4.0 deg' }
  ];
  var TIERS = [
    { n: 1, name: 'Aligned approach', note: 'No noise' },
    { n: 2, name: 'Six-axis offset', note: 'Full offset in every axis' },
    { n: 3, name: 'Noise and fuel', note: 'Sensor noise, fuel limit' },
    { n: 4, name: 'Stuck thruster', note: 'Actuator errors, one stuck thruster' },
    { n: 5, name: 'Failures mid-approach', note: 'Several thruster failures' },
    { n: 6, name: 'Tumbling target', note: 'Orbital dynamics on' }
  ];
  var AXES = ['X', 'Y', 'Z', 'ROLL', 'PITCH', 'YAW'];

  function colors(o) { return Object.assign({}, DEF, (o && o.colors) || {}); }
  function f(v) { var s = (Math.round(v * 100) / 100).toString(); return s === '-0' ? '0' : s; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function open(w, h, extra) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + f(w) + ' ' + f(h) + '" fill="none" ' + (extra || '') + '>';
  }
  function label(x, y, text, c, o) {
    o = o || {};
    return '<text x="' + f(x) + '" y="' + f(y) + '" fill="' + (o.fill || c.muted) + '" font-family=\'' + c.mono + '\' font-size="' + (o.size || 9) +
      '" font-weight="500" letter-spacing="' + (o.track == null ? 0.7 : o.track) + '" text-anchor="' + (o.anchor || 'start') + '">' + text + '</text>';
  }

  /* Deterministic generator (mulberry32). Same seed, same picture, on every machine. */
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

  /* A SPECIMEN flight: a plausible action log for layout work until real replays exist.
     It is not a result and must be labelled as a specimen wherever it is shown. */
  function specimenFlight(seed, tier) {
    tier = tier || 1;
    var r = rng((seed >>> 0) * 31 + tier * 977 + 7);
    var T = Math.round(1500 + r() * 1500 + tier * 180);
    var events = [
      { name: 'HOLD 250', range: 250, t: T * (0.16 + r() * 0.06) },
      { name: 'HOLD 30', range: 30, t: T * (0.52 + r() * 0.08) },
      { name: 'HOLD 10', range: 10, t: T * (0.76 + r() * 0.06) },
      { name: 'CONTACT', range: 0, t: T }
    ];
    var knots = [[0, START]].concat(events.map(function (e) { return [e.t, e.range]; }));
    function rangeAt(t) {
      for (var i = 1; i < knots.length; i++) {
        if (t <= knots[i][0]) {
          var u = (t - knots[i - 1][0]) / (knots[i][0] - knots[i - 1][0]);
          u = u * u * (3 - 2 * u);
          var a = Math.log(1 + knots[i - 1][1]), b = Math.log(1 + knots[i][1]);
          return Math.exp(a + (b - a) * u) - 1;
        }
      }
      return 0;
    }
    var pulses = [], n = 46 + tier * 22 + Math.floor(r() * 20);
    for (var i = 0; i < n; i++) {
      var t;
      if (r() < 0.65) { var e = events[Math.floor(r() * events.length)]; t = e.t + gauss(r) * T * 0.035 - T * 0.02; }
      else t = r() * T;
      t = clamp(t, 2, T - 1);
      var axis = r() < 0.62 ? Math.floor(r() * 3) : 3 + Math.floor(r() * 3);
      var dur = 0.035 * Math.pow(2, Math.floor(r() * r() * 7));
      pulses.push({ t: Math.round(t * 10) / 10, dur: Math.round(dur * 1000) / 1000, axis: axis, dir: r() < 0.5 ? -1 : 1 });
    }
    pulses.sort(function (a, b) { return a.t - b.t; });
    var amp = tier >= 2 ? 0.55 + r() * 0.35 : 0.12 + r() * 0.1, ph = r() * 6.283, w = 2.5 + r() * 3.5, path = [];
    for (var k = 0; k <= 180; k++) {
      var tt = T * k / 180, rg = rangeAt(tt);
      var env = Math.pow(rg / START, 0.55);
      path.push({ t: tt, range: rg, off: amp * env * Math.cos(w * 6.283 * k / 180 + ph) + 0.05 * env * gauss(r) * (tier >= 3 ? 1 : 0) });
    }
    var q = function (lo, hi) { return Math.round((lo + r() * (hi - lo)) * 1000) / 1000; };
    var hard = tier * 0.035;
    var contact = {
      closing: q(0.055, 0.092 + hard * 0.35), lateral: q(0.004, 0.022 + hard * 0.2),
      pyRate: q(0.01, 0.1 + hard), rollRate: q(0.01, 0.09 + hard),
      offset: q(0.005, 0.05 + hard * 0.5), pyAngle: q(0.1, 1.6 + tier * 0.55), rollAngle: q(0.1, 1.4 + tier * 0.6)
    };
    var pass = LIMITS.every(function (l) { var v = contact[l.key]; return v <= l.max && (l.min == null || v >= l.min); });
    var fuel = Math.round(pulses.reduce(function (s, p) { return s + p.dur; }, 0) * 100) / 100;
    return { specimen: true, seed: seed, tier: tier, duration: T, events: events, pulses: pulses, path: path, contact: contact, pass: pass, burn: fuel, rangeAt: rangeAt };
  }

  /* Flight signature: the action log as a barcode. One bar per thruster pulse.
     x = time of the pulse, bar width = pulse length (log scale), bar height = axis group
     (approach axis full height, cross axes 82%, rotations 60%). Accent bars are events. */
  function flightSignature(flight, o) {
    o = o || {};
    var W = o.width || 640, H = o.height || 96, c = colors(o), labels = o.labels !== false;
    var barH = labels ? H - 20 : H, x0 = 12, x1 = W - 12, T = flight.duration;
    var hs = [1, 0.82, 0.82, 0.6, 0.6, 0.6], s = open(W, H, 'role="img" aria-label="Flight signature, seed ' + flight.seed + '"');
    s += '<g fill="' + c.fg + '">';
    [0, 4, W - 5.5, W - 1.5].forEach(function (x) { s += '<rect x="' + f(x) + '" width="1.5" height="' + f(barH) + '"/>'; });
    flight.pulses.forEach(function (p) {
      var w = clamp(0.9 + Math.log(p.dur / 0.035) / Math.LN2 * 0.6, 0.9, 5.2);
      s += '<rect x="' + f(x0 + p.t / T * (x1 - x0) - w / 2) + '" width="' + f(w) + '" height="' + f(barH * hs[p.axis]) + '"/>';
    });
    s += '</g>';
    flight.events.forEach(function (e, i) {
      var x = x0 + e.t / T * (x1 - x0), last = i === flight.events.length - 1;
      s += '<rect x="' + f(x - 1.25) + '" width="2.5" height="' + f(barH + (labels ? 6 : 0)) + '" fill="' + c.accent + '"/>';
      if (labels) s += label(last ? x + 1.25 : x, H - 2, e.range ? e.range + ' M' : 'CONTACT', c, { anchor: last ? 'end' : 'middle', size: 8 });
    });
    if (labels) s += label(0, H - 2, 'T+0', c, { size: 8 });
    return s + '</svg>';
  }

  function xScale(range, x0, x1) { return x1 - (x1 - x0) * Math.log(1 + range / 4) / Math.log(1 + START / 4); }

  /* Approach arcs: every approach ends at the same point. Each arc starts at a hold
     distance (log scale) and lands on the port. The keep-out sphere is dotted. */
  function approachArcs(o) {
    o = o || {};
    var W = o.width || 640, H = o.height || 380, c = colors(o), base = H - 46, port = W - 46, x0 = 30;
    var reached = o.reached == null ? 0 : o.reached;
    var s = open(W, H, 'role="img" aria-label="Approach arcs from each hold point to the port"');
    var rows = [{ r: START, t: 'START', k: 'muted' }, { r: 250, t: 'HOLD' }, { r: KEEP_OUT, t: 'KEEP-OUT', k: 'dot' }, { r: 30, t: 'HOLD' }, { r: 10, t: 'HOLD' }];
    s += '<line x1="' + x0 + '" y1="' + base + '" x2="' + (W - 14) + '" y2="' + base + '" stroke="' + c.line + '"/>';
    rows.forEach(function (row) {
      var x = xScale(row.r, x0 + 16, port), rad = (port - x) / 2;
      var done = row.r >= reached, here = o.reached != null && row.r === reached;
      var col = here ? c.accent : (done && row.k !== 'muted' ? c.fg : c.muted);
      s += '<path d="M' + f(x) + ' ' + base + 'A' + f(rad) + ' ' + f(rad) + ' 0 0 1 ' + port + ' ' + base + '" stroke="' + col + '" stroke-width="' + (here ? 1.5 : 1) + '"' +
        (row.k === 'dot' ? ' stroke-dasharray="1 5" stroke-linecap="round" stroke-width="1.6"' : '') + '/>';
      if (row.k === 'dot') s += '<circle cx="' + f(x) + '" cy="' + base + '" r="3" fill="var(--sb-bg, #F3F3F1)" stroke="' + col + '"/>';
      else s += '<circle cx="' + f(x) + '" cy="' + base + '" r="3" fill="' + col + '"/>';
      if (row.k === 'dot') {
        s += label(x + rad, base - rad + 16, row.t + ' ' + row.r + ' M', c, { anchor: 'middle', size: 8 });
      } else {
        s += label(x, base + 18, row.r + ' M', c, { anchor: 'middle', fill: here ? c.accent : c.fg });
        s += label(x, base + 30, row.t, c, { anchor: 'middle', size: 8 });
      }
    });
    s += '<circle cx="' + port + '" cy="' + base + '" r="8" stroke="' + c.accent + '"/><circle cx="' + port + '" cy="' + base + '" r="3.5" fill="' + c.accent + '"/>';
    s += label(port, base + 18, '0 M', c, { anchor: 'middle', fill: c.fg }) + label(port, base + 30, 'CONTACT', c, { anchor: 'middle', size: 8 });
    return s + '</svg>';
  }

  /* Approach chart: one flight, side view. Range runs right to left on a log scale and
     ends on the datum bar (the port), the same bar as in the logo. Not to scale. */
  function approachChart(flight, o) {
    o = o || {};
    var W = o.width || 760, H = o.height || 300, c = colors(o), cy = H / 2 - 6, x0 = 28, port = W - 40;
    var half = function (x) { var u = (port - x) / (port - x0); return 5 + u * (H / 2 - 44); };
    var s = open(W, H, 'role="img" aria-label="Approach chart, seed ' + flight.seed + '"');
    s += '<line x1="' + (x0 - 14) + '" y1="' + cy + '" x2="' + (W - 8) + '" y2="' + cy + '" stroke="' + c.line + '"/>';
    s += '<circle cx="' + (x0 - 14) + '" cy="' + cy + '" r="2.2" fill="' + c.line + '"/><circle cx="' + (W - 8) + '" cy="' + cy + '" r="2.2" fill="' + c.line + '"/>';
    [-1, 1].forEach(function (sg) {
      s += '<line x1="' + x0 + '" y1="' + f(cy + sg * half(x0)) + '" x2="' + port + '" y2="' + f(cy + sg * half(port)) + '" stroke="' + c.muted + '" stroke-dasharray="5 4"/>';
    });
    HOLDS.concat([KEEP_OUT]).forEach(function (rg) {
      var x = xScale(rg, x0, port), h = half(x) + 10, ko = rg === KEEP_OUT;
      s += '<line x1="' + f(x) + '" y1="' + f(cy - h) + '" x2="' + f(x) + '" y2="' + f(cy + h) + '" stroke="' + (ko ? c.muted : c.fg) + '"' + (ko ? ' stroke-dasharray="1 4" stroke-linecap="round" stroke-width="1.4"' : '') + '/>';
      s += ko ? label(x + 5, cy + h + 4, 'KEEP-OUT ' + rg + ' M', c, { size: 8 }) : label(x, cy - h - 7, rg + ' M', c, { anchor: 'middle', fill: c.fg });
      if (!ko) s += '<circle cx="' + f(x) + '" cy="' + f(cy - h) + '" r="2" fill="' + c.fg + '"/><circle cx="' + f(x) + '" cy="' + f(cy + h) + '" r="2" fill="' + c.fg + '"/>';
    });
    var d = '';
    flight.path.forEach(function (p, i) {
      var x = xScale(p.range, x0, port);
      d += (i ? 'L' : 'M') + f(x) + ' ' + f(cy + clamp(p.off, -0.95, 0.95) * half(x));
    });
    s += '<path d="' + d + '" stroke="' + c.accent + '" stroke-width="1.6" stroke-linejoin="round"/>';
    var p0 = flight.path[0], sx = xScale(p0.range, x0, port), sy = cy + p0.off * half(sx);
    s += '<circle cx="' + f(sx) + '" cy="' + f(sy) + '" r="3.5" fill="' + c.accent + '"/>';
    s += '<rect x="' + port + '" y="' + f(cy - 26) + '" width="6" height="52" fill="' + c.fg + '"/>';
    s += label(port + 3, cy + 42, 'PORT', c, { anchor: 'middle', fill: c.fg });
    var by = H - 16;
    s += '<g fill="' + c.fg + '">';
    flight.pulses.forEach(function (p) {
      s += '<rect x="' + f(xScale(flight.rangeAt(p.t), x0, port) - 0.4) + '" y="' + f(by - (p.axis < 3 ? 9 : 5)) + '" width="0.8" height="' + (p.axis < 3 ? 9 : 5) + '"/>';
    });
    s += '</g><line x1="' + x0 + '" y1="' + by + '" x2="' + port + '" y2="' + by + '" stroke="' + c.line + '"/>';
    s += label(x0, H - 3, 'PULSES BY RANGE', c, { size: 8 }) + label(port, H - 3, 'LOG RANGE. NOT TO SCALE', c, { size: 8, anchor: 'end' });
    return s + '</svg>';
  }

  /* Orbit: target on the solid ellipse, chaser on the dotted one. Used for tier 6. */
  function orbit(o) {
    o = o || {};
    var S = o.size || 360, c = colors(o), m = S / 2, rx = S * 0.4, ry = S * 0.19, tilt = o.tilt == null ? -28 : o.tilt;
    var s = open(S, S, 'role="img" aria-label="Target and chaser orbits"');
    s += '<line x1="12" y1="' + m + '" x2="' + (S - 12) + '" y2="' + m + '" stroke="' + c.line + '"/><line x1="' + m + '" y1="12" x2="' + m + '" y2="' + (S - 12) + '" stroke="' + c.line + '"/>';
    [[12, m], [S - 12, m], [m, 12], [m, S - 12]].forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.4" fill="' + c.fg + '"/>'; });
    s += '<ellipse cx="' + m + '" cy="' + m + '" rx="' + f(rx) + '" ry="' + f(ry) + '" stroke="' + c.fg + '" stroke-width="1.2"/>';
    s += '<ellipse cx="' + m + '" cy="' + m + '" rx="' + f(rx * 0.96) + '" ry="' + f(ry * 1.5) + '" stroke="' + c.fg + '" stroke-width="1.6" stroke-dasharray="0.5 5" stroke-linecap="round" transform="rotate(' + tilt + ' ' + m + ' ' + m + ')"/>';
    var a = -0.62, tx = m + rx * Math.cos(a), ty = m + ry * Math.sin(a);
    s += '<circle cx="' + f(tx) + '" cy="' + f(ty) + '" r="5" fill="' + c.accent + '"/>';
    s += '<line x1="' + f(tx + 6) + '" y1="' + f(ty - 6) + '" x2="' + f(S - 30) + '" y2="' + f(ty - 46) + '" stroke="' + c.muted + '"/>' + label(S - 28, ty - 50, 'TARGET', c, { anchor: 'end', fill: c.fg });
    var b = 2.5, tr = tilt * Math.PI / 180, ex = rx * 0.96 * Math.cos(b), ey = ry * 1.5 * Math.sin(b);
    var qx = m + ex * Math.cos(tr) - ey * Math.sin(tr), qy = m + ex * Math.sin(tr) + ey * Math.cos(tr);
    s += '<circle cx="' + f(qx) + '" cy="' + f(qy) + '" r="4.5" fill="var(--sb-bg, #F3F3F1)" stroke="' + c.fg + '" stroke-width="1.2"/>';
    s += '<line x1="' + f(qx - 6) + '" y1="' + f(qy + 6) + '" x2="34" y2="' + f(qy + 44) + '" stroke="' + c.muted + '"/>' + label(30, qy + 56, 'CHASER', c, { fill: c.fg });
    return s + '</svg>';
  }

  /* Docking interface, seen along the approach axis: 12 hooks, 3 alignment petals. */
  function dockingRing(o) {
    o = o || {};
    var S = o.size || 320, c = colors(o), m = S / 2, hi = o.highlight == null ? -1 : o.highlight;
    var s = open(S, S, 'role="img" aria-label="Docking interface: twelve hooks, three petals"');
    s += '<circle cx="' + m + '" cy="' + m + '" r="' + f(S * 0.47) + '" stroke="' + c.line + '"/><circle cx="' + m + '" cy="' + m + '" r="' + f(S * 0.33) + '" stroke="' + c.fg + '" stroke-width="1.2"/>';
    s += '<circle cx="' + m + '" cy="' + m + '" r="' + f(S * 0.2) + '" stroke="' + c.line + '" stroke-dasharray="3 4"/>';
    for (var i = 0; i < 12; i++) {
      var ang = i * 30 - 90 + 15;
      s += '<rect x="' + f(m - S * 0.018) + '" y="' + f(m - S * 0.435) + '" width="' + f(S * 0.036) + '" height="' + f(S * 0.07) + '" rx="1.5" fill="' + (i === hi ? c.accent : c.fg) + '" transform="rotate(' + ang + ' ' + m + ' ' + m + ')"/>';
    }
    for (var k = 0; k < 3; k++) {
      var a0 = (k * 120 - 90 - 20) * Math.PI / 180, a1 = (k * 120 - 90 + 20) * Math.PI / 180, R = S * 0.265;
      s += '<path d="M' + f(m + R * Math.cos(a0)) + ' ' + f(m + R * Math.sin(a0)) + 'A' + f(R) + ' ' + f(R) + ' 0 0 1 ' + f(m + R * Math.cos(a1)) + ' ' + f(m + R * Math.sin(a1)) + '" stroke="' + c.fg + '" stroke-width="' + f(S * 0.05) + '"/>';
    }
    s += '<line x1="' + f(m - 9) + '" y1="' + m + '" x2="' + f(m + 9) + '" y2="' + m + '" stroke="' + c.fg + '"/><line x1="' + m + '" y1="' + f(m - 9) + '" x2="' + m + '" y2="' + f(m + 9) + '" stroke="' + c.fg + '"/>';
    return s + '</svg>';
  }

  function inside(pt, poly) {
    var x = pt[0], y = pt[1], inP = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inP = !inP;
    }
    return inP;
  }

  /* The mark sampled on a dot matrix. Unlit cells stay visible as rings. */
  function dotMark(sim, o) {
    o = o || {};
    var n = o.cells || 24, S = o.size || 360, c = colors(o), g = root.SBLogo && root.SBLogo.data.geometry;
    if (!g) return '';
    var deg = g.rotation[sim || 'parent'] * Math.PI / 180, cx = g.canvas / 2, p = S / n, rad = p * 0.34;
    var s = open(S, S, 'role="img" aria-label="SpaceBench mark on a dot matrix"');
    for (var r = 0; r < n; r++) for (var q = 0; q < n; q++) {
      var px = (q + 0.5) * g.canvas / n - cx, py = (r + 0.5) * g.canvas / n - cx;
      var ux = cx + px * Math.cos(-deg) - py * Math.sin(-deg), uy = cx + px * Math.sin(-deg) + py * Math.cos(-deg);
      var lit = inside([ux, uy], g.bar) || inside([ux, uy], g.arrow);
      s += lit ? '<circle cx="' + f((q + 0.5) * p) + '" cy="' + f((r + 0.5) * p) + '" r="' + f(rad) + '" fill="' + c.accent + '"/>'
        : '<circle cx="' + f((q + 0.5) * p) + '" cy="' + f((r + 0.5) * p) + '" r="' + f(rad - 0.5) + '" stroke="' + c.line + '"/>';
    }
    return s + '</svg>';
  }

  /* Limb: the planet's edge as a particle field. Dense at the edge, thinning inward. */
  function limbPoints(o) {
    o = o || {};
    var W = o.width || 1200, H = o.height || 600, n = o.count || 2600, r = rng(o.seed == null ? 1 : o.seed);
    var R = o.radius || W * 1.15, cx = o.cx == null ? W / 2 : o.cx, top = o.top == null ? H * 0.38 : o.top, cy = top + R;
    var span = Math.asin(Math.min(0.99, (W * 0.62) / R)), lam = H * 0.11, pts = [];
    for (var i = 0; i < n; i++) {
      var th = (r() * 2 - 1) * span, u = r(), d, a, rad;
      if (u < 0.16) { d = r() * 2.5; a = 1; rad = 1.1 + r() * 0.7; }
      else if (u < 0.2) { d = -(-Math.log(1 - r()) * 7); a = 0.45; rad = 0.7; }
      else { d = -Math.log(1 - r()) * lam; a = clamp(1 - d / (lam * 3.4), 0.06, 1); rad = 0.5 + 1.1 * a * r(); }
      var x = cx + (R - d) * Math.sin(th), y = cy - (R - d) * Math.cos(th);
      if (x < -4 || x > W + 4 || y > H + 4 || y < -4) continue;
      pts.push([x, y, rad, a]);
    }
    return pts;
  }
  function limb(o) {
    o = o || {};
    var W = o.width || 1200, H = o.height || 600, c = colors(o), s = open(W, H, 'role="img" aria-label="Planet limb"') + '<g fill="' + c.fg + '">';
    limbPoints(o).forEach(function (p) { s += '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f(p[2]) + '" opacity="' + f(p[3]) + '"/>'; });
    return s + '</g></svg>';
  }

  /* Range scale: a log ruler from 400 m to contact. Holds are the long ticks. */
  function rangeScale(o) {
    o = o || {};
    var W = o.width || 640, H = 54, c = colors(o), x0 = 8, x1 = W - 8, s = open(W, H, 'role="img" aria-label="Range scale"');
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400].forEach(function (v) {
      var x = xScale(v, x0, x1), major = HOLDS.indexOf(v) >= 0;
      s += '<line x1="' + f(x) + '" y1="' + (major ? 8 : 20) + '" x2="' + f(x) + '" y2="34" stroke="' + (major ? c.fg : c.muted) + '"/>';
      if (major || v === 400 || v === 100 || v === 1) s += label(x, 48, String(v), c, { anchor: 'middle', fill: major ? c.fg : c.muted });
    });
    s += '<line x1="' + x1 + '" y1="8" x2="' + x1 + '" y2="34" stroke="' + c.fg + '" stroke-width="2"/>' + label(x1, 48, '0', c, { anchor: 'end', fill: c.fg });
    if (o.value != null) {
      var vx = xScale(o.value, x0, x1);
      s += '<path d="M' + f(vx - 5) + ' 0H' + f(vx + 5) + 'L' + f(vx) + ' 8Z" fill="' + c.accent + '"/><line x1="' + f(vx) + '" y1="8" x2="' + f(vx) + '" y2="34" stroke="' + c.accent + '" stroke-width="1.5"/>';
    }
    return s + '</svg>';
  }

  /* Tier: six dots, n lit. Tier is never encoded by colour. */
  function tierDots(n, o) {
    o = o || {};
    var r = o.r || 3.5, gap = o.gap || 4, c = colors(o), W = 6 * 2 * r + 5 * gap + 2, s = open(W, 2 * r + 2, 'role="img" aria-label="Tier ' + n + ' of 6"');
    for (var i = 0; i < 6; i++) {
      var cx = 1 + r + i * (2 * r + gap);
      s += i < n ? '<circle cx="' + f(cx) + '" cy="' + f(r + 1) + '" r="' + r + '" fill="' + c.fg + '"/>' : '<circle cx="' + f(cx) + '" cy="' + f(r + 1) + '" r="' + f(r - 0.5) + '" stroke="' + c.muted + '"/>';
    }
    return s + '</svg>';
  }

  /* Error dial: a pointer against a tolerance band. value and limit share one unit. */
  function dial(o) {
    o = o || {};
    var S = o.size || 200, c = colors(o), m = S / 2, R = S * 0.42, lim = o.limit == null ? 4 : o.limit, full = o.full || lim * 3, v = o.value || 0;
    var ang = function (x) { return (clamp(x / full, -1, 1) * 135 - 90) * Math.PI / 180; };
    var s = open(S, S, 'role="img" aria-label="Error dial"');
    for (var i = 0; i <= 54; i++) {
      var a = (-135 + i * 5 - 90) * Math.PI / 180, long = i % 9 === 0, r0 = R - (long ? 12 : 6);
      s += '<line x1="' + f(m + r0 * Math.cos(a)) + '" y1="' + f(m + r0 * Math.sin(a)) + '" x2="' + f(m + R * Math.cos(a)) + '" y2="' + f(m + R * Math.sin(a)) + '" stroke="' + (long ? c.fg : c.muted) + '"/>';
    }
    var a0 = ang(-lim), a1 = ang(lim), Rb = R + 7;
    s += '<path d="M' + f(m + Rb * Math.cos(a0)) + ' ' + f(m + Rb * Math.sin(a0)) + 'A' + f(Rb) + ' ' + f(Rb) + ' 0 0 1 ' + f(m + Rb * Math.cos(a1)) + ' ' + f(m + Rb * Math.sin(a1)) + '" stroke="' + c.accent + '" stroke-width="3"/>';
    var av = ang(v);
    s += '<line x1="' + m + '" y1="' + m + '" x2="' + f(m + (R - 16) * Math.cos(av)) + '" y2="' + f(m + (R - 16) * Math.sin(av)) + '" stroke="' + c.fg + '" stroke-width="2"/><circle cx="' + m + '" cy="' + m + '" r="4" fill="' + c.fg + '"/>';
    return s + '</svg>';
  }

  /* Wilson score interval for a success rate. z = 1.96 gives 95 percent. */
  function wilson(k, n, z) {
    z = z || 1.96;
    if (!n) return { p: 0, lo: 0, hi: 0 };
    var p = k / n, d = 1 + z * z / n, mid = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
    return { p: p, lo: Math.max(0, mid - h), hi: Math.min(1, mid + h) };
  }

  /* Success rate with its interval: a bar, a whisker, two dot terminals. */
  function rateBar(k, n, o) {
    o = o || {};
    var W = o.width || 220, H = 16, c = colors(o), w = wilson(k, n), x = function (p) { return 4 + p * (W - 8); };
    var s = open(W, H, 'role="img" aria-label="' + k + ' of ' + n + ' passed"');
    s += '<line x1="4" y1="8" x2="' + (W - 4) + '" y2="8" stroke="' + c.line + '"/>';
    s += '<rect x="4" y="5" width="' + f(x(w.p) - 4) + '" height="6" fill="' + (o.accent ? c.accent : c.fg) + '"/>';
    s += '<line x1="' + f(x(w.lo)) + '" y1="8" x2="' + f(x(w.hi)) + '" y2="8" stroke="' + c.fg + '"/>';
    s += '<circle cx="' + f(x(w.lo)) + '" cy="8" r="2.2" fill="var(--sb-surface, #FAFAF8)" stroke="' + c.fg + '"/><circle cx="' + f(x(w.hi)) + '" cy="8" r="2.2" fill="var(--sb-surface, #FAFAF8)" stroke="' + c.fg + '"/>';
    return s + '</svg>';
  }

  /* Thruster set seen along the approach axis: n dots on a ring. stuck fires continuously
     (accent, with a plume line); failed is a ring. Count follows the public figure of 16. */
  function thrusters(o) {
    o = o || {};
    var S = o.size || 320, c = colors(o), m = S / 2, n = o.count || 16, R = S * 0.36, stuck = o.stuck || [], failed = o.failed || [];
    var s = open(S, S, 'role="img" aria-label="Thruster set"');
    s += '<circle cx="' + m + '" cy="' + m + '" r="' + f(R) + '" stroke="' + c.line + '"/><circle cx="' + m + '" cy="' + m + '" r="' + f(R * 0.56) + '" stroke="' + c.line + '" stroke-dasharray="3 4"/>';
    s += '<line x1="' + f(m - 9) + '" y1="' + m + '" x2="' + f(m + 9) + '" y2="' + m + '" stroke="' + c.fg + '"/><line x1="' + m + '" y1="' + f(m - 9) + '" x2="' + m + '" y2="' + f(m + 9) + '" stroke="' + c.fg + '"/>';
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 2 * Math.PI - Math.PI / 2 + Math.PI / n, x = m + R * Math.cos(a), y = m + R * Math.sin(a), r = S * 0.024;
      if (stuck.indexOf(i) >= 0) {
        s += '<line x1="' + f(x) + '" y1="' + f(y) + '" x2="' + f(m + (R + S * 0.11) * Math.cos(a)) + '" y2="' + f(m + (R + S * 0.11) * Math.sin(a)) + '" stroke="' + c.accent + '" stroke-width="2"/>';
        s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * 1.25) + '" fill="' + c.accent + '"/>';
      } else if (failed.indexOf(i) >= 0) {
        s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="var(--sb-bg, #F3F3F1)" stroke="' + c.muted + '" stroke-width="1.2"/>';
      } else s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + c.fg + '"/>';
    }
    return s + '</svg>';
  }

  /* SPECIMEN leaderboard rows from a seeded generator. Entries are named "Model A" on purpose. */
  function specimenBoard(seed) {
    var r = rng(seed == null ? 20261115 : seed);
    return [['Model A', 'high', 24], ['Model A', 'low', 17], ['Model B', 'high', 21], ['Model C', 'medium', 12],
      ['PID controller', 'baseline', 29], ['Model D', 'high', 6], ['Random policy', 'baseline', 0]].map(function (x) {
      var turns = Math.round(110 + r() * 180), base = x[1] === 'baseline';
      return { name: x[0], level: x[1], k: x[2], n: 30, score: Math.round(18 + x[2] / 30 * 70 + r() * 8), turns: turns,
        tokens: base ? null : Math.round(turns * (2.2 + r() * 6)) / 10, cost: base ? null : 4 + r() * 60, think: base ? null : 2 + r() * 40 };
    }).sort(function (a, b) { return b.k - a.k; });
  }
  function boardTable(rows, o) {
    o = o || {};
    var focus = o.focus == null ? 1 : o.focus;
    return '<thead><tr><th>#</th><th>Entry</th><th class="num">Passed</th><th>Success</th><th>95% interval</th><th class="num">Score</th><th class="num">Turns</th><th class="num">Tokens, k</th><th class="num">Cost / episode</th><th class="num">Think / step</th></tr></thead><tbody>' +
      rows.map(function (x, i) {
        var w = wilson(x.k, x.n);
        return '<tr' + (i === focus ? ' data-focus' : '') + '><td class="rank">' + String(i + 1).padStart(2, '0') + '</td><td class="name"><b>' + x.name + '</b><span>' + x.level + '</span></td><td class="num">' + x.k + ' of ' + x.n + '</td><td class="rate">' + Math.round(w.p * 100) + '%</td><td>' + rateBar(x.k, x.n, { width: o.barWidth || 200, accent: i === focus }) +
          '</td><td class="num">' + x.score + '</td><td class="num">' + x.turns + '</td><td class="num">' + (x.tokens == null ? '–' : x.tokens.toFixed(1)) + '</td><td class="num">' + (x.cost == null ? '–' : '$' + x.cost.toFixed(2)) + '</td><td class="num">' + (x.think == null ? '–' : x.think.toFixed(1) + ' s') + '</td></tr>';
      }).join('') + '</tbody>';
  }

  /* Pictograms on a 24 grid, 1.5 stroke, round caps. */
  var ICONS = {
    tx: '<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
    ty: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
    tz: '<path d="M5 19L19 5M5 13v6h6M13 5h6v6"/>',
    roll: '<path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7M17.5 2.5v4h-4"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    pitch: '<path d="M3 12h18"/><path d="M16 5.5a8 8 0 0 1 0 13M17.5 15v4h-4"/>',
    yaw: '<path d="M12 3v18"/><path d="M5.5 16a8 8 0 0 0 13 0M15 17.5h4v-4"/>',
    pulse: '<path d="M4 5v14M8 5v14M11.5 5v9M15 5v14M18 5v9M20.5 5v14"/>',
    coast: '<path d="M3 12h2M8 12h2M13 12h2"/><circle cx="19" cy="12" r="2.2"/>',
    hold: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>',
    contact: '<path d="M4 6l7 6-7 6M12 12H4M19 4v16"/>',
    fuel: '<rect x="7" y="3.5" width="10" height="17" rx="1"/><path d="M7 13h10" /><path d="M9.5 16h5M9.5 18.2h5" stroke-width="1"/>',
    time: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    seed: '<path d="M9 4L7 20M17 4l-2 16M4.5 9h16M3.5 15h16"/>',
    tier: '<path d="M4 19h16M4 14h12M4 9h8M4 4h4"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 3.5v4h4"/><path d="M10.5 9l4.5 3-4.5 3z" fill="currentColor" stroke="none"/>',
    human: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
    model: '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"/>',
    vision: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.500 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
    pass: '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>',
    fail: '<circle cx="12" cy="12" r="6.6"/>',
    partial: '<circle cx="12" cy="12" r="6.6"/><path d="M12 5.400a6.600 6.600 0 0 0 0 13.200z" fill="currentColor" stroke="none"/>',
    abort: '<path d="M6.500 6.500l11 11M17.500 6.500l-11 11"/>'
  };
  function icon(name, o) {
    o = o || {};
    var size = o.size || 24;
    return '<svg xmlns="http://www.w3.org/2000/svg" class="sb-icon" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  var api = {
    HOLDS: HOLDS, KEEP_OUT: KEEP_OUT, START: START, LIMITS: LIMITS, TIERS: TIERS, AXES: AXES, ICONS: ICONS,
    rng: rng, wilson: wilson, specimenFlight: specimenFlight,
    flightSignature: flightSignature, approachArcs: approachArcs, approachChart: approachChart, orbit: orbit,
    dockingRing: dockingRing, dotMark: dotMark, limb: limb, limbPoints: limbPoints, rangeScale: rangeScale,
    tierDots: tierDots, dial: dial, rateBar: rateBar, icon: icon, thrusters: thrusters,
    specimenBoard: specimenBoard, boardTable: boardTable,
    /* <div data-sb="signature" data-seed="421" data-tier="3" data-opts='{"height":80}'></div> */
    mount: function (scope) {
      (scope || document).querySelectorAll('[data-sb]').forEach(function (el) {
        var kind = el.getAttribute('data-sb'), o = {};
        try { o = JSON.parse(el.getAttribute('data-opts') || '{}'); } catch (e) { o = {}; }
        var seed = +(el.getAttribute('data-seed') || 421), tier = +(el.getAttribute('data-tier') || 3);
        var out = '';
        if (kind === 'signature') out = flightSignature(specimenFlight(seed, tier), o);
        else if (kind === 'chart') out = approachChart(specimenFlight(seed, tier), o);
        else if (kind === 'arcs') out = approachArcs(o);
        else if (kind === 'orbit') out = orbit(o);
        else if (kind === 'ring') out = dockingRing(o);
        else if (kind === 'dotmark') out = dotMark(el.getAttribute('data-sim') || 'parent', o);
        else if (kind === 'limb') out = limb(Object.assign({ seed: seed }, o));
        else if (kind === 'scale') out = rangeScale(o);
        else if (kind === 'tier') out = tierDots(tier, o);
        else if (kind === 'dial') out = dial(o);
        else if (kind === 'rate') out = rateBar(o.k || 0, o.n || 30, o);
        else if (kind === 'thrusters') out = thrusters(o);
        else if (kind === 'icon') out = icon(el.getAttribute('data-name'), o);
        el.innerHTML = out;
      });
    }
  };
  root.SBGraphics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
