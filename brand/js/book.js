/* Renders the dynamic parts of the brand standard from tokens, logo geometry and graphics. */
(function () {
  'use strict';
  var T = window.SBTokens, L = window.SBLogo, G = window.SBGraphics, D = window.SBDraw, root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var f = D.f;
  var sections = $$('section.sheet');
  var total = String(sections.length - 1).padStart(2, '0');
  /* The gate run: the one run of the core that exists. Figures from textures/textures.json and data/flight1.js. */
  var GATE = { seed: 1, ticks: '200,000', hash: 'afbdc94cf80ce4e1', firings: '114,332', points: '1,600,648' };

  /* ---- sheet headers, index numerals, nav ---- */
  sections.forEach(function (s) {
    var n = s.dataset.n, name = s.dataset.name;
    s.insertAdjacentHTML('afterbegin', '<div class="sb-meta sb-meta--rule" style="position:relative"><span>SpaceBench brand standard</span><span>' + name + '</span><span>' + n + '/' + total + '</span><span>Ref. SB-BS-' + n + ' · Rev. B</span></div>');
    var t = $('.sheet__title', s);
    if (t) t.insertAdjacentHTML('afterbegin', '<span class="idx">' + n + '</span>');
    $('#nav').insertAdjacentHTML('beforeend', '<a href="#' + s.id + '"><span>' + n + '</span><span>' + name + '</span></a>');
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        $$('#nav a').forEach(function (a) { a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---- cover ---- */
  $('#cover-plate').innerHTML = window.SBPlate('parent', { dark: true, size: 420, bare: true, base: 'textures/plume-square' });

  /* ---- colour ---- */
  function textOn(hex) {
    var h = hex.replace('#', ''), l = 0, w = [0.2126, 0.7152, 0.0722];
    for (var i = 0; i < 3; i++) { var c = parseInt(h.substr(i * 2, 2), 16) / 255; l += w[i] * (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)); }
    return l > 0.36 ? T.color.neutral['950'] : T.color.neutral['100'];
  }
  function rgb(hex) { var h = hex.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(' '); }
  function ladder(id, scale, prefix, flags) {
    $(id).innerHTML = Object.keys(scale).map(function (k) {
      var hex = scale[k], name = flags ? (flags[k] || '') : (T.color.names[prefix + '-' + k] || '');
      return '<div style="background:' + hex + ';color:' + textOn(hex) + '"><div class="k">' + k + (name ? '<b>' + name + '</b>' : '') + '</div><div class="v">' + hex + (flags ? '' : '<br>' + rgb(hex)) + '</div></div>';
    }).join('');
  }
  ladder('#ladder', T.color.neutral, 'n');
  ladder('#violet', T.color.violet, 'violet', { '500': 'Film', '400': 'Ink' });
  ladder('#orange', T.color.orange, 'orange', { '500': 'Film', '400': 'Ink' });
  $('#reserve').innerHTML = Object.keys(T.color.reserve).map(function (k) {
    return '<span class="sb-chip"><i style="width:10px;height:10px;border-radius:50%;background:' + T.color.reserve[k] + '"></i>' + k + ' ' + T.color.reserve[k] + '</span>';
  }).join('');
  $('#contrast').innerHTML = '<thead><tr><th>Pair</th><th>Ground</th><th class="num">Ratio</th><th class="num">Use</th></tr></thead>' + T.contrast.filter(function (c) {
    return /on bg$|on accent$/.test(c.pair);
  }).map(function (c) {
    var use = c.ratio >= 4.5 ? 'Text' : c.ratio >= 3 ? 'Display' : 'Graphics only';
    return '<tr><th style="font-weight:500"><i class="pair" style="background:' + c.fg + ';border-color:' + c.bg + '"></i>' + c.pair + '</th><td>' + (c.theme === 'light' ? 'Film' : 'Ink') + '</td><td class="num">' + c.ratio.toFixed(2) + '</td><td class="num">' + use + '</td></tr>';
  }).join('');

  /* ---- type ---- */
  $('#plot-spec').innerHTML = '<svg viewBox="0 0 250 120" style="width:100%;max-width:250px" role="img" aria-label="Plotter alphabet specimen">' +
    D.plot('no flights drawn.', { x: 6, y: 36, size: 19 }) + D.plot('none flown yet.', { x: 6, y: 72, size: 19 }) + D.plot('abcdefghijklmnopqrstuvwxyz 0123456789', { x: 6, y: 106, size: 8.6, sw: 0.9 }) + '</svg>';
  $('#scale').innerHTML = Object.keys(T.type).map(function (k) {
    var t = T.type[k];
    var sample = t.family === 'matrix' ? '0.10' : t.family === 'mono' ? (k === 'figure' ? '4,001.52 thruster-seconds' : k === 'code' ? 'seed 1 · tick 200000 · ' + GATE.hash : 'Fig. 01 · Sixteen · Placeholder layout') :
      (t.size >= 100 ? 'Contact.' : t.size >= 60 ? 'Hold, contact.' : t.size >= 40 ? 'Approach, hold, contact.' : t.size >= 20 ? 'Six axes, one attempt, thirty hidden seeds.' : 'Thruster pulses plus a coast time. The simulator interrupts a coast on important events.');
    return '<div class="scale-row"><span class="sb-label">' + k + '</span><span class="sb-label sb-dim">' + t.size + ' / ' + t.lineHeight + ' / ' + (t.tracking ? t.tracking + ' em' : '0') + ' · ' + t.weight + '</span><span class="s sb-' + k + '">' + sample + '</span></div>';
  }).join('');

  /* ---- voice ---- */
  $('#words-yes').innerHTML = ['seed', 'tier', 'pulse', 'coast', 'hold', 'contact', 'bench mark', 'corridor', 'keep-out', 'matched', 'gate run'].map(function (w) { return '<span class="sb-chip">' + w + '</span>'; }).join('');
  $('#words-no').innerHTML = ['revolutionary', 'crushes', 'superhuman', 'state of the art', 'exact', 'first', 'realistic', 'perfect'].map(function (w) { return '<span class="sb-chip" style="text-decoration:line-through;color:var(--sb-fg-2)">' + w + '</span>'; }).join('');

  /* ---- drawing rules ---- */
  $('#lines').innerHTML = [['Cut', T.line.cut, '', 'The thing itself'], ['Axis', T.line.axis, '16 4 2 4', 'Centre lines, chain'], ['Dim', T.line.dim, '', 'Dimensions, leaders, grids']].map(function (r) {
    return '<div class="lw"><span class="sb-label">' + r[0] + '</span><svg viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="7" x2="300" y2="7" stroke="currentColor" stroke-width="' + r[1] + '" vector-effect="non-scaling-stroke"' + (r[2] ? ' stroke-dasharray="' + r[2] + '"' : '') + '/></svg><span class="sb-label sb-dim">' + r[1] + ' px · ' + r[3] + '</span></div>';
  }).join('');

  /* ---- texture ---- */
  $('#texfacts').innerHTML = [['Source', 'Seed ' + GATE.seed + ' gate run, ' + GATE.ticks + ' ticks'], ['Firings', GATE.firings], ['Points plotted', GATE.points],
    ['Map', 'Equal-area sky map, centred on the nose at tick 0'], ['Grain seed', 'Final state hash ' + GATE.hash], ['Check', 'Replay hash equals scripted_run at 5 tick counts']
  ].map(function (r) { return '<tr><th>' + r[0] + '</th><td class="num">' + r[1] + '</td></tr>'; }).join('');

  /* ---- pictograms ---- */
  $('#icon-grid').innerHTML = Object.keys(G.ICONS).map(function (n) { return '<div>' + G.icon(n, { size: 28 }) + '<span>' + n + '</span></div>'; }).join('');
  $('#tiers').innerHTML = G.TIERS.map(function (t) {
    return '<div><div style="display:flex;justify-content:space-between;align-items:center"><span class="t">T' + t.n + '</span>' + G.tierDots(t.n) + '</div><div><h4>' + t.name + '</h4><p>' + t.note + '</p></div></div>';
  }).join('');

  /* ---- components ---- */
  var RO = [['Range', '400 to 0', 'm'], ['Y offset', '≤ 0.10', 'm'], ['Z offset', '≤ 0.10', 'm'], ['Roll error', '≤ 4.0', 'deg'], ['Pitch error', '≤ 4.0', 'deg'], ['Yaw error', '≤ 4.0', 'deg'],
    ['Closing', '0.05–0.10', 'm/s'], ['Sideways', '≤ 0.04', 'm/s'], ['Roll rate', '≤ 0.20', 'deg/s']];
  $('#readouts').innerHTML = RO.map(function (r) {
    return '<div><div class="k"><span>' + r[0] + '</span><span>' + r[1] + '</span></div><div class="v sb-dim">–<small>' + r[2] + '</small></div></div>';
  }).join('');
  $('#limits').innerHTML = '<thead><tr><th>At first contact</th><th class="num">Limit</th></tr></thead>' + G.LIMITS.map(function (l) { return '<tr><th style="font-weight:500">' + l.label + '</th><td class="num">' + l.text + '</td></tr>'; }).join('');
  $('#board').innerHTML = G.boardTable(G.emptyBoard());

  /* ---- layout ---- */
  $('#cols').innerHTML = new Array(13).join('<i></i>');
  $('#spacebars').innerHTML = Object.keys(T.space).filter(function (k) { return T.space[k] > 0; }).map(function (k) {
    return '<div><span>space-' + k + '</span><span>' + T.space[k] + ' px</span><i style="width:' + T.space[k] * 2 + 'px"></i></div>';
  }).join('');

  /* ---- sheets and applications ---- */
  function figures(list) {
    return list.map(function (a) {
      if (!a[0]) return '<div class="panel" style="grid-column:span ' + a[3] + '"><div class="cap"><b>' + a[1] + '</b></div><p class="note">' + a[2] + '</p></div>';
      return '<figure style="grid-column:span ' + a[3] + '"><a href="exports/' + a[0] + '"><img loading="lazy" src="exports/' + a[0] + '" alt="' + a[1] + '"></a><figcaption><span>' + a[1] + '</span><span>' + a[2] + '</span></figcaption>' + (a[4] ? '<p class="note">' + a[4] + '</p>' : '') + '</figure>';
    }).join('');
  }
  $('#sheetlist').innerHTML = figures([
    ['sheet-mark.png', 'SB-D-000 · The mark', '1600 × 1100', 6, 'Drawn from logo/geometry.json, the same numbers that make the logo files.'],
    ['sheet-sixteen.png', 'SB-D-001 · Sixteen', '1600 × 1100', 6, 'The core\u2019s thruster table. A placeholder layout, not Dragon\u2019s. Firing thrusters 2 and 7 together gives 1,600 N·m of pure roll.'],
    ['sheet-contact.png', 'SB-D-011 · Contact figure', '1600 × 1290', 6, 'The seven contact limits of the docking standard as one figure. No flights are drawn because none exist.'],
    ['sheet-gate-run.png', 'SB-F-000 · Gate run, seed 1', '1600 × 1316', 6, 'The scripted run behind the determinism gate. No pilot and no target. The replay\u2019s hash equals the core\u2019s at five tick counts.'],
    ['sheet-circle.png', 'SB-D-010 · The circle', 'A2 · 1191 × 1684', 4, 'The 0.10 m sideways limit at actual size when printed at A2.'],
    ['sheet-bits.png', 'SB-P-020 · Two builds', '1200 × 1946', 4, 'State hashes of ticks 0 to 160 for three seeds: the native build and the WebAssembly build agree on all 161.'],
    [null, 'What is real', 'Limits come from IDSS IDD Rev F, table 3.3.1.1-2. Hashes, the negative control and the gate run come from runs of crates/core made by build/gen/. The 125,801 of 1,000,000 figure is quoted from AGENTS.md and was not rerun. No docking flight, scenario, station or model result exists, so none is drawn.', 4]
  ]);
  $('#apps').innerHTML = figures([
    ['x-avatar-film.png', 'Profile picture, film', '800 × 800', 3], ['x-avatar-ink.png', 'Profile picture, ink', '800 × 800', 3], ['x-avatar-dock-film.png', 'Dock, film', '800 × 800', 3], ['x-avatar-dock-ink.png', 'Dock, ink', '800 × 800', 3],
    ['x-banner-ink.png', 'Profile banner, ink, with partners', '1500 × 500', 6], ['x-banner-film.png', 'Profile banner, film', '1500 × 500', 6],
    ['og-parent-ink.png', 'Share card, parent', '1200 × 630', 6], ['og-parent-film.png', 'Share card, parent', '1200 × 630', 6],
    ['og-dock-ink.png', 'Share card, Dock', '1200 × 630', 4], ['og-dock-film.png', 'Share card, Dock', '1200 × 630', 4], ['og-landing-ink.png', 'Share card, Landing', '1200 × 630', 4],
    ['post-dock-ink.png', 'Post image, Dock', '1600 × 900', 5], ['post-landing-field.png', 'Post image, Landing, one field', '1600 × 900', 5],
    [null, 'Post image', 'Made by <a href="tools/post-image.html" style="color:var(--sb-fg)">tools/post-image.html</a>: type a line, choose the simulation, the ground and the size, and save a picture set in SB Display. It also gives the alt text and a plain-text signature for display names.', 2],
    ['leaderboard-dock-film.png', 'Leaderboard card, empty', '1600 × 1000', 6], ['leaderboard-dock-ink.png', 'Leaderboard card, empty', '1600 × 1000', 6],
    ['tier-1.png', 'Tier 1', '1080 × 1350', 2], ['tier-2.png', 'Tier 2', '1080 × 1350', 2], ['tier-3.png', 'Tier 3', '1080 × 1350', 2], ['tier-4.png', 'Tier 4', '1080 × 1350', 2], ['tier-5.png', 'Tier 5', '1080 × 1350', 2], ['tier-6.png', 'Tier 6', '1080 × 1350', 2]
  ]);

  /* ---- files ---- */
  $('#tree').innerHTML = [
    '<b>index.html</b>            this standard',
    '<b>README.md</b>             build order, what is real, credits',
    '<b>tokens/</b>               tokens.css, tokens.json, tokens.ts',
    '<b>css/</b>',
    '  brand.css           components (sb- classes)',
    '  sheet.css           drawing sheets',
    '<b>js/</b>',
    '  sb-logo.js          inline, themeable logos',
    '  sb-graphics.js      devices, icons, the empty board',
    '  sb-draw.js          plotter text, dot numerals, title block',
    '  sb-hershey.js       the plotter alphabet\u2019s strokes',
    '  sb-tokens.js        tokens as a script, for file:// pages',
    '<b>fonts/</b>                Geist, Geist Mono (OFL), SB Matrix (ours),',
    '                      SB Display (Geist with our cuts, OFL)',
    '<b>logo/</b>                 svg/, png/, geometry.json',
    '<b>textures/</b>             the plume field, six crops, textures.json',
    '<b>data/</b>                 hashes, negative control, gate run, vehicle',
    '<b>graphics/</b>             static SVG of each device, both grounds',
    '<b>partners/</b>             Factory and GMI Cloud logos, unmodified',
    '<b>templates/</b>            six sheets, avatar, banner, share card,',
    '                      tier poster, leaderboard',
    '<b>tools/</b>                post-image.html: a typed line as a picture',
    '<b>exports/</b>              templates rendered to PNG',
    '<b>build/</b>                build_tokens, build_font, cuts, build_logo,',
    '                      build_display_font, build_texture,',
    '                      build_tools, export, check, gen/'
  ].join('\n');
  $('#snip').textContent = [
    '<html data-theme="dark" data-sim="dock">',
    '<link rel="stylesheet" href="brand/tokens/tokens.css">',
    '<link rel="stylesheet" href="brand/css/brand.css">',
    '',
    '<span data-sb-logo="lockup" data-sim="dock" data-height="28"></span>',
    '<div data-sb="arcs"></div>',
    '<div data-sb="contact" data-opts=\'{"size":64}\'></div>',
    '<span class="sb-status" data-state="pass">Pass</span>',
    '',
    '<script src="brand/js/sb-logo.js"></scr' + 'ipt>',
    '<script src="brand/js/sb-graphics.js"></scr' + 'ipt>',
    '<script>SBLogo.mount(); SBGraphics.mount();</scr' + 'ipt>'
  ].join('\n');

  /* ---- logo blocks ---- */
  (function () {
    var g = L.data.geometry, K = 3.4, ox = 70, oy = 50, R = g.radius, c0 = g.centre;
    var U = function (x) { return ox + x * K; }, V = function (y) { return oy + y * K; };
    var tx = function (x, y, t, a) { return '<text x="' + f(x) + '" y="' + f(y) + '" text-anchor="' + (a || 'start') + '" style="font:500 11px var(--sb-font-mono);letter-spacing:.05em" fill="var(--sb-fg-2)">' + t + '</text>'; };
    var dim = 'stroke="var(--sb-fg-2)" stroke-width="' + T.line.dim * 1.6 + '" fill="none"';
    var edge = function (y) { return c0[0] + Math.sqrt(R * R - (y - c0[1]) * (y - c0[1])); };
    var s = '<svg viewBox="0 0 560 520" style="width:100%;max-width:560px" role="img" aria-label="Construction of the mark">';
    s += '<rect x="' + U(0) + '" y="' + V(0) + '" width="' + g.canvas * K + '" height="' + g.canvas * K + '" ' + dim + '/>';
    s += '<path d="M' + f(U(0) - 14) + ' ' + f(V(c0[1])) + 'H' + f(U(c0[0] - R) - 6) + 'M' + f(U(c0[0] + R) + 6) + ' ' + f(V(c0[1])) + 'H' + f(U(g.canvas) + 14) + 'M' + f(U(c0[0])) + ' ' + f(V(0) - 14) + 'V' + f(V(c0[1] - R) - 6) + 'M' + f(U(c0[0])) + ' ' + f(V(c0[1] + R) + 6) + 'V' + f(V(g.canvas) + 10) +
      '" stroke="var(--sb-fg-2)" stroke-width="' + T.line.axis * 1.6 + '" stroke-dasharray="16 4 2 4" fill="none"/>';
    s += '<path fill="var(--sb-fg)" transform="translate(' + ox + ' ' + oy + ') scale(' + K + ')" d="' + L.data.lockups.parent.mark.mark + '"/>';
    var xd = U(g.canvas) + 30;
    [[g.slot[0], '25'], [g.slot[1], '33.5'], [g.baseY, '100']].forEach(function (h) {
      s += '<path d="M' + f(U(edge(h[0])) + 6) + ' ' + f(V(h[0])) + 'H' + f(xd + 5) + '" ' + dim + '/>' + tx(xd + 11, V(h[0]) + 4, h[1]);
    });
    s += '<path d="M' + f(xd) + ' ' + f(V(g.slot[0]) - 12) + 'V' + f(V(g.baseY) + 12) + '" ' + dim + '/>';
    var yd = V(g.canvas) + 28;
    [c0[0] - R, g.cutX[0], g.cutX[1], g.cutX[2], c0[0] + R].forEach(function (x) {
      s += '<path d="M' + f(U(x)) + ' ' + f(V(g.canvas) + 14) + 'V' + f(yd + 5) + '" ' + dim + '/>' + tx(U(x), yd + 20, String(x), 'middle');
    });
    s += '<path d="M' + f(U(c0[0] - R) - 12) + ' ' + f(yd) + 'H' + f(U(c0[0] + R) + 12) + '" ' + dim + '/>';
    var yt = V(0) - 28;
    s += '<path d="M' + f(U(c0[0] - R)) + ' ' + f(yt) + 'H' + f(U(c0[0]) - 56) + 'M' + f(U(c0[0]) + 56) + ' ' + f(yt) + 'H' + f(U(c0[0] + R)) + 'M' + f(U(c0[0] - R)) + ' ' + f(yt - 5) + 'v10M' + f(U(c0[0] + R)) + ' ' + f(yt - 5) + 'v10" ' + dim + '/>' + tx(U(c0[0]), yt + 4, '106 ACROSS', 'middle');
    s += '<g style="color:var(--sb-fg-2)">' + D.plot('the line', { x: U(95), y: V(13), size: 11 }) + D.plot('the arrow', { x: U(93), y: V(111), size: 11 }) + '</g>';
    $('#construction').innerHTML = s + '</svg>';
    $('#geometry').innerHTML = [['Canvas', g.canvas + ' × ' + g.canvas], ['Disc', 'centre ' + c0.join(', ') + ' · radius ' + R], ['Clear space', g.clearance + ', the canvas edge'], ['Line', 'y ' + g.slot.join(' to ')],
      ['Arrow point', g.apex.join(', ')], ['Arrow feet', 'y ' + g.baseY + ' · x ' + g.cutX.join(', ') + ' · ' + g.cutHalf * 2 + ' wide'], ['Turn', 'Parent 0 · Dock 90 · Landing 180 deg']
    ].map(function (r) { return '<tr><th>' + r[0] + '</th><td class="num">' + r[1] + '</td></tr>'; }).join('');
  })();

  var SIMS = ['parent', 'dock', 'landing'];
  $('#lockups').innerHTML = SIMS.map(function (sim) {
    var name = T.sim[sim].label;
    return '<div class="panel logo-tile c4" data-theme="light" data-sim="' + sim + '"><div class="cap"><b>' + name + '</b><span>On film</span></div><div class="fill">' + L.lockup(sim) + '</div></div>' +
      '<div class="panel logo-tile c4" data-theme="dark" data-sim="' + sim + '"><div class="cap"><b>' + name + '</b><span>On ink</span></div><div class="fill">' + L.lockup(sim) + '</div></div>' +
      '<div class="panel logo-tile c2" data-theme="light" data-sim="' + sim + '"><div class="cap"><b>Stacked</b></div><div class="fill">' + L.stacked(sim, { className: 'wide' }) + '</div></div>' +
      '<div class="panel logo-tile c2" data-theme="dark" data-sim="' + sim + '"><div class="cap"><b>One colour</b></div><div class="fill">' + L.stacked(sim, { className: 'wide', mono: true }) + '</div></div>';
  }).join('');

  $('#sizes').innerHTML = [64, 48, 32, 24, 16].map(function (h) {
    return '<div style="display:grid;gap:10px;justify-items:center"><span style="font-size:' + h + 'px" data-sb-logo="mark" data-follow-sim></span><span class="sb-micro sb-dim">' + h + '</span></div>';
  }).join('') + '<div style="display:grid;gap:10px;justify-items:start;margin-left:16px"><span style="font-size:20px" data-sb-logo="lockup" data-follow-sim></span><span class="sb-micro sb-dim">Lockup 20</span></div>';

  (function () {
    var g = L.data.geometry, plain = L.mark('parent', { mono: true });
    var filled = '<svg class="sb-logo" viewBox="0 0 120 120"><circle cx="' + g.centre[0] + '" cy="' + g.centre[1] + '" r="' + g.radius + '" fill="currentColor"/></svg>';
    var backed = '<span style="background:#fff;padding:6px;display:block">' + plain + '</span>';
    var items = [
      ['Stretched', '<span style="transform:scaleX(1.55)">' + plain + '</span>'],
      ['Off axis', '<span style="transform:rotate(32deg)">' + plain + '</span>'],
      ['Cuts filled', filled],
      ['Outlined', plain.replace('class="sb-logo__mark"', 'class="sb-logo__mark" style="fill:none;stroke:currentColor;stroke-width:3"')],
      ['Wrong colour', plain.replace('class="sb-logo__mark"', 'class="sb-logo__mark" style="fill:#1FA34A"')],
      ['White backing', backed]
    ];
    $('#misuse').innerHTML = items.map(function (it) {
      return '<div class="panel panel--board misuse c2"><div class="fill">' + it[1] + '</div><span class="sb-status" data-state="abort">' + it[0] + '</span></div>';
    }).join('');
  })();

  /* ---- switches ---- */
  function mountAll() {
    var sim = root.dataset.sim;
    $$('.rail__logo,[data-follow-sim]').forEach(function (el) { el.setAttribute('data-sim', sim); });
    L.mount();
    G.mount();
  }
  function bind(id, attr) {
    $$('#' + id + ' button').forEach(function (b) {
      b.addEventListener('click', function () {
        root.setAttribute(attr, b.dataset.v);
        $$('#' + id + ' button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        mountAll(); roles();
      });
    });
  }
  function roles() {
    var sim = root.dataset.sim, keys = Object.keys(T.theme.light).concat(Object.keys(T.sim[sim].light));
    $('#roles').innerHTML = keys.map(function (k) {
      var lv = T.theme.light[k] || T.sim[sim].light[k], dv = T.theme.dark[k] || T.sim[sim].dark[k];
      return '<div class="swatch-row"><code>--sb-' + k + '</code><span class="sw"><i style="background:' + lv + '"></i>' + lv + '</span><span class="sw"><i style="background:' + dv + '"></i>' + dv + '</span></div>';
    }).join('');
  }
  $$('#theme-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === root.dataset.theme)); });
  $$('#sim-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === root.dataset.sim)); });
  bind('theme-tabs', 'data-theme');
  bind('sim-tabs', 'data-sim');
  mountAll(); roles();
  window.SBParams.ready();
})();
