/* SpaceBench graphics. Every device here is drawn from scenario constants or from the simulation core's
   own tables. None of them invents a flight or a result: with no data they draw an empty state.
   All functions return an SVG string. Colours default to CSS custom properties
   from tokens.css; pass { colors: { fg, muted, line, accent } } for fixed values. */
(function (root) {
  'use strict';

  var DEF = {
    fg: 'currentColor',
    muted: 'var(--sb-fg-3, #7C8493)',
    line: 'var(--sb-line-strong, #A9B0BC)',
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
    { n: 4, name: 'Stuck thruster', note: 'With actuator errors' },
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
    return '<text x="' + f(x) + '" y="' + f(y) + '" fill="' + (o.fill || c.muted) + '" font-family=\'' + c.mono + '\' font-size="' + (o.size || 11) +
      '" font-weight="500" letter-spacing="' + (o.track == null ? 0.7 : o.track) + '" text-anchor="' + (o.anchor || 'start') + '">' + text + '</text>';
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
      if (row.k === 'dot') s += '<circle cx="' + f(x) + '" cy="' + base + '" r="3" fill="var(--sb-bg, #ECEEF1)" stroke="' + col + '"/>';
      else s += '<circle cx="' + f(x) + '" cy="' + base + '" r="3" fill="' + col + '"/>';
      if (row.k === 'dot') {
        s += label(x + rad, base - rad + 18, row.t + ' ' + row.r + ' M', c, { anchor: 'middle' });
      } else {
        s += label(x, base + 20, row.r + ' M', c, { anchor: 'middle', fill: here ? c.accent : c.fg });
        s += label(x, base + 35, row.t, c, { anchor: 'middle' });
      }
    });
    s += '<circle cx="' + port + '" cy="' + base + '" r="8" stroke="' + c.accent + '"/><circle cx="' + port + '" cy="' + base + '" r="3.5" fill="' + c.accent + '"/>';
    s += label(port, base + 20, '0 M', c, { anchor: 'middle', fill: c.fg }) + label(port, base + 35, 'CONTACT', c, { anchor: 'end' });
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
    s += '<circle cx="' + f(qx) + '" cy="' + f(qy) + '" r="4.5" fill="var(--sb-bg, #ECEEF1)" stroke="' + c.fg + '" stroke-width="1.2"/>';
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

  /* Range scale: a log ruler from 400 m to contact. Holds are the long ticks. */
  function rangeScale(o) {
    o = o || {};
    var W = o.width || 640, H = 54, c = colors(o), x0 = 14, x1 = W - 8, s = open(W, H, 'role="img" aria-label="Range scale"');
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400].forEach(function (v) {
      var x = xScale(v, x0, x1), major = HOLDS.indexOf(v) >= 0;
      s += '<line x1="' + f(x) + '" y1="' + (major ? 8 : 20) + '" x2="' + f(x) + '" y2="34" stroke="' + (major ? c.fg : c.muted) + '"/>';
      if (major || v === 400 || v === 100) s += label(x, 48, String(v), c, { anchor: 'middle', fill: major ? c.fg : c.muted });
    });
    s += '<line x1="' + x1 + '" y1="8" x2="' + x1 + '" y2="34" stroke="' + c.fg + '" stroke-width="2"/>' + label(x1, 48, '0', c, { anchor: 'end', fill: c.fg });
    if (o.value != null) {
      var vx = xScale(o.value, x0, x1);
      s += '<path d="M' + f(vx - 5) + ' 0H' + f(vx + 5) + 'L' + f(vx) + ' 8Z" fill="' + c.accent + '"/><line x1="' + f(vx) + '" y1="8" x2="' + f(vx) + '" y2="34" stroke="' + c.accent + '" stroke-width="1.5"/>';
    }
    return s + '</svg>';
  }

  /* Lidar noise at 10 m range, as an ellipse: about 34 mm along the line of sight (drawn across) and 6 mm sideways.
     Figures from DESIGN.md 4.4 (Madonna et al., Aerospace 2025, a simulation study). scale: px per mm. */
  function lidarNoise(o) {
    o = o || {};
    var W = o.width || 640, k = o.scale || 5, c = colors(o), rx = 34 * k, ry = 6 * k, H = 2 * ry + 96, cx = W / 2, cy = ry + 30;
    var s = open(W, H, 'role="img" aria-label="Lidar noise at 10 m: 34 mm along the line of sight, 6 mm sideways"');
    s += '<path d="M' + f(cx - rx) + ' ' + cy + 'H' + f(cx + rx) + 'M' + cx + ' ' + f(cy - ry) + 'V' + f(cy + ry) + '" stroke="' + c.muted + '" stroke-width=".45" stroke-dasharray="16 4 2 4"/>';
    s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" stroke="' + c.fg + '" stroke-width="1.25"/><circle cx="' + cx + '" cy="' + cy + '" r="4" fill="' + c.accent + '"/>';
    var yd = cy + ry + 22, xd = cx - rx - 22;
    s += '<path d="M' + cx + ' ' + yd + 'H' + f(cx + rx) + 'M' + cx + ' ' + (yd - 5) + 'v10M' + f(cx + rx) + ' ' + (yd - 5) + 'v10M' + xd + ' ' + f(cy - ry) + 'V' + cy + 'M' + (xd - 5) + ' ' + f(cy - ry) + 'h10M' + (xd - 5) + ' ' + cy + 'h10" stroke="' + c.fg + '" stroke-width=".35"/>';
    s += label(cx + rx / 2, yd + 22, '34 MM', c, { anchor: 'middle', fill: c.fg }) + label(xd - 14, cy - ry / 2 + 4, '6 MM', c, { anchor: 'end', fill: c.fg });
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
    var S = o.size || 200, c = colors(o), m = S / 2, R = S * 0.42, lim = o.limit == null ? 4 : o.limit, full = o.full || lim * 3, v = o.value;
    var ang = function (x) { return (clamp(x / full, -1, 1) * 135 - 90) * Math.PI / 180; };
    var s = open(S, S, 'role="img" aria-label="Error dial"');
    for (var i = 0; i <= 54; i++) {
      var a = (-135 + i * 5 - 90) * Math.PI / 180, long = i % 9 === 0, r0 = R - (long ? 12 : 6);
      s += '<line x1="' + f(m + r0 * Math.cos(a)) + '" y1="' + f(m + r0 * Math.sin(a)) + '" x2="' + f(m + R * Math.cos(a)) + '" y2="' + f(m + R * Math.sin(a)) + '" stroke="' + (long ? c.fg : c.muted) + '"/>';
    }
    var a0 = ang(-lim), a1 = ang(lim), Rb = R + 7;
    s += '<path d="M' + f(m + Rb * Math.cos(a0)) + ' ' + f(m + Rb * Math.sin(a0)) + 'A' + f(Rb) + ' ' + f(Rb) + ' 0 0 1 ' + f(m + Rb * Math.cos(a1)) + ' ' + f(m + Rb * Math.sin(a1)) + '" stroke="' + c.accent + '" stroke-width="3"/>';
    if (v == null) return s + '<circle cx="' + m + '" cy="' + m + '" r="4" fill="' + c.fg + '"/></svg>';
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
    s += '<circle cx="' + f(x(w.lo)) + '" cy="8" r="2.2" fill="var(--sb-surface, #F6F7F9)" stroke="' + c.fg + '"/><circle cx="' + f(x(w.hi)) + '" cy="8" r="2.2" fill="var(--sb-surface, #F6F7F9)" stroke="' + c.fg + '"/>';
    return s + '</svg>';
  }

  /* Thruster set, seen along the capsule's long axis. The layout is the simulation core's own table
     (crates/core, PLACEHOLDER_THRUSTERS): four pods at a radius of 2 m, four thrusters each. It is a
     placeholder and not Dragon's layout; say so wherever this is shown. Index = pod * 4 + k.
     In each pod, k 0 and 1 push along the long axis (drawn on the radius), k 2 and 3 push across it.
     stuck: fires continuously (accent, with its exhaust line). failed: a ring. pair: accent, no exhaust. */
  var PODS = [[2, 0], [-2, 0], [0, 2], [0, -2]];            /* y, z in metres */
  function thrusters(o) {
    o = o || {};
    var S = o.size || 320, c = colors(o), m = S / 2, R = S * 0.33, r = S * 0.022, d = S * 0.062, stuck = o.stuck || [], failed = o.failed || [], pair = o.pair || [];
    var s = open(S, S, 'role="img" aria-label="Thruster set, placeholder layout"');
    s += '<circle cx="' + m + '" cy="' + m + '" r="' + f(R) + '" stroke="' + c.line + '"/>';
    s += '<path d="M' + f(m - S * 0.47) + ' ' + m + 'H' + f(m + S * 0.47) + 'M' + m + ' ' + f(m - S * 0.47) + 'V' + f(m + S * 0.47) + '" stroke="' + c.muted + '" stroke-width=".45" stroke-dasharray="16 4 2 4"/>';
    PODS.forEach(function (p, pi) {
      var ux = p[0] / 2, uy = -p[1] / 2, tx = -uy, ty = ux, px = m + ux * R, py = m + uy * R;   /* u: outward on screen, t: across */
      [[-d, 0], [d, 0], [0, d], [0, -d]].forEach(function (q, k) {
        var i = pi * 4 + k, x = px + ux * q[0] + tx * q[1], y = py + uy * q[0] + ty * q[1];
        if (stuck.indexOf(i) >= 0) {
          var ex = k < 2 ? ux : (k === 2 ? -tx : tx), ey = k < 2 ? uy : (k === 2 ? -ty : ty);
          s += '<line x1="' + f(x) + '" y1="' + f(y) + '" x2="' + f(x + ex * S * 0.1) + '" y2="' + f(y + ey * S * 0.1) + '" stroke="' + c.accent + '" stroke-width="2"/><circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * 1.25) + '" fill="' + c.accent + '"/>';
        } else if (failed.indexOf(i) >= 0) s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" stroke="' + c.muted + '" stroke-width="1.25"/>';
        else s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(pair.indexOf(i) >= 0 ? r * 1.25 : r) + '" fill="' + (pair.indexOf(i) >= 0 ? c.accent : c.fg) + '"/>';
      });
    });
    return s + '</svg>';
  }

  /* Contact figure: the seven contact limits as seven spokes, each scaled so that its limit lies on one circle.
     The shaded sector is the closing-speed floor (0.05 of 0.10 m/s = half the radius).
     values: seven numbers as a share of each limit, in LIMITS order starting at the top and going clockwise:
     closing, sideways speed, pitch and yaw rate, roll rate, roll angle, pitch and yaw angle, sideways offset.
     Leave values out until a flight exists: the figure is then drawn empty. */
  function contactFigure(o) {
    o = o || {};
    var S = o.size || 64, c = colors(o), m = S / 2, R = S * 0.36, big = S >= 60;
    var pt = function (k, i) { var a = (-90 + i * 360 / 7) * Math.PI / 180; return [m + R * k * Math.cos(a), m + R * k * Math.sin(a)]; };
    var a0 = pt(0.5, -0.5), a1 = pt(0.5, 0.5), s = open(S, S, 'role="img" aria-label="Contact figure' + (o.values ? '' : ', empty') + '"');
    s += '<path d="M' + m + ' ' + m + 'L' + f(a0[0]) + ' ' + f(a0[1]) + 'A' + f(R / 2) + ' ' + f(R / 2) + ' 0 0 1 ' + f(a1[0]) + ' ' + f(a1[1]) + 'Z" fill="' + c.accent + '" fill-opacity=".55"/>';
    for (var i = 0; i < 7; i++) { var e = pt(1.24, i); s += '<line x1="' + m + '" y1="' + m + '" x2="' + f(e[0]) + '" y2="' + f(e[1]) + '" stroke="' + c.fg + '" stroke-width="' + (big ? 0.8 : 0.7) + '"/>'; }
    s += '<circle cx="' + m + '" cy="' + m + '" r="' + f(R) + '" stroke="' + c.accent + '" stroke-width="' + (big ? 2 : 1.6) + '"/>';
    if (o.values) s += '<path d="M' + o.values.map(function (v, i) { var q = pt(clamp(v, 0, 1.4), i); return f(q[0]) + ' ' + f(q[1]); }).join('L') + 'Z" stroke="' + c.fg + '" stroke-width="' + (big ? 1.6 : 1.25) + '" stroke-linejoin="round"/>';
    return s + '</svg>';
  }

  /* Seed field: one leaderboard row is 6 tiers by 30 hidden seeds. outcomes: optional 6 arrays of 30 entries,
     each 'pass', 'hold' (failed, reached a hold point), 'abort', or null for not flown. Left out, every seed is not flown. */
  function seedField(o) {
    o = o || {};
    var c = colors(o), px = o.pitch || 22, py = px + 2, rr = px * 0.3, W = 30 * px, H = 6 * py, s = open(W, H, 'role="img" aria-label="Seed field, 6 tiers by 30 seeds"');
    for (var t = 0; t < 6; t++) for (var k = 0; k < 30; k++) {
      var x = k * px + px / 2, y = t * py + py / 2, v = o.outcomes && o.outcomes[t] ? o.outcomes[t][k] : null;
      if (v === 'pass') s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(rr * 1.15) + '" fill="' + c.accent + '"/>';
      else if (v === 'abort') s += '<path d="M' + f(x - rr * 0.85) + ' ' + f(y - rr * 0.85) + 'l' + f(rr * 1.7) + ' ' + f(rr * 1.7) + 'm0 ' + f(-rr * 1.7) + 'l' + f(-rr * 1.7) + ' ' + f(rr * 1.7) + '" stroke="' + c.fg + '" stroke-width="1.6"/>';
      else {
        s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(rr) + '" stroke="' + (v === 'hold' ? c.muted : c.fg) + '"/>';
        if (v === 'hold') s += '<path d="M' + f(x) + ' ' + f(y - rr) + 'A' + f(rr) + ' ' + f(rr) + ' 0 0 1 ' + f(x + rr * 0.866) + ' ' + f(y + rr * 0.5) + '" stroke="' + c.fg + '" stroke-width="2.6"/>';
      }
    }
    return s + '</svg>';
  }

  /* The rows a board will hold at launch, before anything has flown. Baselines come from DESIGN.md 4.3.
     Model rows carry no names: the launch lineup is not fixed. k is null until a row has flown. */
  function emptyBoard() {
    return [['Random policy', 'baseline'], ['PID controller', 'baseline'], ['LQR controller', 'baseline'], ['Human pilots', 'matched board'],
      ['Model', 'reasoning level'], ['Model', 'reasoning level'], ['Model', 'reasoning level'], ['Model', 'reasoning level']].map(function (x) {
      return { name: x[0], level: x[1], k: null, n: 30 };
    });
  }
  /* rows: {name, level, k, n, score, turns, tokens, cost, think}. A row with k == null has not flown and shows no numbers. */
  function boardTable(rows, o) {
    o = o || {};
    var focus = o.focus == null ? -1 : o.focus, c = colors(o), bw = o.barWidth || 200;
    var dash = '<td class="num sb-dim">–</td>';
    return '<thead><tr><th>#</th><th>Entry</th><th class="num">Docked</th><th>Success</th><th>95% interval</th><th class="num">Score</th><th class="num">Turns</th><th class="num">Tokens, k</th><th class="num">Cost / episode</th><th class="num">Think / step</th></tr></thead><tbody>' +
      rows.map(function (x, i) {
        var head = '<tr' + (i === focus ? ' data-focus' : '') + '><td class="rank">' + (x.k == null ? '–' : String(i + 1).padStart(2, '0')) + '</td><td class="name"><b>' + x.name + '</b><span>' + x.level + '</span></td>';
        if (x.k == null) return head + '<td class="num sb-dim">– of ' + x.n + '</td><td class="rate sb-dim">–</td><td>' + open(bw, 16) + '<line x1="4" y1="8" x2="' + (bw - 4) + '" y2="8" stroke="' + c.line + '"/></svg></td>' + dash + dash + dash + dash + dash + '</tr>';
        var w = wilson(x.k, x.n);
        return head + '<td class="num">' + x.k + ' of ' + x.n + '</td><td class="rate">' + Math.round(w.p * 100) + '%</td><td>' + rateBar(x.k, x.n, { width: bw, accent: i === focus }) +
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
    wilson: wilson, approachArcs: approachArcs, orbit: orbit, dockingRing: dockingRing, rangeScale: rangeScale,
    lidarNoise: lidarNoise, tierDots: tierDots, dial: dial, rateBar: rateBar, icon: icon, thrusters: thrusters,
    contactFigure: contactFigure, seedField: seedField, emptyBoard: emptyBoard, boardTable: boardTable,
    /* <div data-sb="arcs" data-opts='{"height":330}'></div> */
    mount: function (scope) {
      (scope || document).querySelectorAll('[data-sb]').forEach(function (el) {
        var kind = el.getAttribute('data-sb'), o = {};
        try { o = JSON.parse(el.getAttribute('data-opts') || '{}'); } catch (e) { o = {}; }
        var out = '';
        if (kind === 'arcs') out = approachArcs(o);
        else if (kind === 'orbit') out = orbit(o);
        else if (kind === 'ring') out = dockingRing(o);
        else if (kind === 'scale') out = rangeScale(o);
        else if (kind === 'noise') out = lidarNoise(o);
        else if (kind === 'tier') out = tierDots(+(el.getAttribute('data-tier') || 3), o);
        else if (kind === 'dial') out = dial(o);
        else if (kind === 'rate') out = rateBar(o.k || 0, o.n || 30, o);
        else if (kind === 'thrusters') out = thrusters(o);
        else if (kind === 'contact') out = contactFigure(o);
        else if (kind === 'seeds') out = seedField(o);
        else if (kind === 'icon') out = icon(el.getAttribute('data-name'), o);
        el.innerHTML = out;
      });
    }
  };
  root.SBGraphics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
