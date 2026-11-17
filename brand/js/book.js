/* Renders the dynamic parts of the brand standard from tokens, logo geometry and graphics. */
(function () {
  'use strict';
  var T = window.SBTokens, L = window.SBLogo, G = window.SBGraphics, root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  var sections = $$('section.sheet');
  var total = String(sections.length - 1).padStart(2, '0');

  /* ---- sheet headers, index numerals, nav ---- */
  sections.forEach(function (s) {
    var n = s.dataset.n, name = s.dataset.name;
    s.insertAdjacentHTML('afterbegin', '<div class="sb-meta sb-meta--rule" style="position:relative"><span>SpaceBench brand standard</span><span>' + name + '</span><span>' + n + '/' + total + '</span><span>Ref. SB-BS-' + n + ' · Rev. A</span></div>');
    var t = $('.sheet__title', s);
    if (t) t.insertAdjacentHTML('afterbegin', '<span class="idx">' + n + '/</span>');
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

  /* ---- static blocks ---- */
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
  ladder('#violet', T.color.violet, 'violet', { '500': 'Paper', '400': 'Ink' });
  ladder('#orange', T.color.orange, 'orange', { '500': 'Paper', '400': 'Ink' });
  $('#reserve').innerHTML = Object.keys(T.color.reserve).map(function (k) {
    return '<span class="sb-chip"><i style="width:10px;height:10px;border-radius:50%;background:' + T.color.reserve[k] + '"></i>' + k + ' ' + T.color.reserve[k] + '</span>';
  }).join('');

  $('#contrast').innerHTML = '<thead><tr><th>Pair</th><th>Ground</th><th class="num">Ratio</th><th class="num">Use</th></tr></thead>' + T.contrast.filter(function (c) {
    return /on bg$|on accent$/.test(c.pair);
  }).map(function (c) {
    var use = c.ratio >= 4.5 ? 'Text' : c.ratio >= 3 ? 'Display' : 'Graphics only';
    return '<tr><th style="font-weight:500"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;background:' + c.fg + ';box-shadow:0 0 0 3px ' + c.bg + ',0 0 0 4px var(--sb-line)"></i>' + c.pair + '</th><td>' + (c.theme === 'light' ? 'Paper' : 'Ink') + '</td><td class="num">' + c.ratio.toFixed(2) + '</td><td class="num">' + use + '</td></tr>';
  }).join('');

  $('#scale').innerHTML = Object.keys(T.type).map(function (k) {
    var t = T.type[k];
    var sample = t.family === 'matrix' ? '0.08 M/S' : t.family === 'mono' ? (k === 'code' ? 'fire(axis="+x", seconds=0.20)' : 'Ref. SBD-T3-0421 · Tier 3 · Seed 0421') :
      (t.size >= 100 ? 'Contact.' : t.size >= 40 ? 'Approach, hold, contact.' : t.size >= 20 ? 'Six axes, one attempt, thirty hidden seeds.' : 'Thruster pulses plus a coast time. The simulator interrupts a coast on important events.');
    var cls = 'sb-' + k;
    return '<div class="scale-row"><span class="sb-label">' + k + '</span><span class="sb-label sb-dim">' + t.size + ' / ' + t.lineHeight + ' / ' + (t.tracking ? t.tracking + ' em' : '0') + ' · ' + t.weight + '</span><span class="s ' + cls + '">' + sample + '</span></div>';
  }).join('');

  $('#words-yes').innerHTML = ['seed', 'tier', 'pulse', 'coast', 'hold', 'contact', 'datum', 'corridor', 'keep-out', 'matched', 'specimen'].map(function (w) { return '<span class="sb-chip">' + w + '</span>'; }).join('');
  $('#words-no').innerHTML = ['revolutionary', 'crushes', 'superhuman', 'state of the art', 'exact', 'first', 'realistic', 'perfect'].map(function (w) { return '<span class="sb-chip" style="text-decoration:line-through;color:var(--sb-fg-2)">' + w + '</span>'; }).join('');

  $('#icon-grid').innerHTML = Object.keys(G.ICONS).map(function (n) { return '<div>' + G.icon(n, { size: 28 }) + '<span>' + n + '</span></div>'; }).join('');
  $('#tiers').innerHTML = G.TIERS.map(function (t) {
    return '<div><div style="display:flex;justify-content:space-between;align-items:center"><span class="t">T' + t.n + '</span>' + G.tierDots(t.n) + '</div><div><h4>' + t.name + '</h4><p>' + t.note + '</p></div></div>';
  }).join('');

  var RO = [
    ['Range', '', '12.40', 'm'], ['Y offset', '≤ 0.10', '+0.14', 'm', 1], ['Z offset', '≤ 0.10', '-0.03', 'm'],
    ['Roll error', '≤ 4.0', '+0.8', 'deg'], ['Pitch error', '≤ 4.0', '-1.2', 'deg'], ['Yaw error', '≤ 4.0', '+0.4', 'deg'],
    ['Closing', '0.05–0.10', '0.08', 'm/s'], ['Sideways', '≤ 0.04', '0.01', 'm/s'], ['Roll rate', '≤ 0.20', '0.05', 'deg/s']
  ];
  $('#readouts').innerHTML = RO.map(function (r) {
    return '<div' + (r[4] ? ' data-out' : '') + '><div class="k"><span>' + r[0] + '</span><span>' + r[1] + '</span></div><div class="v">' + r[2] + '<small>' + r[3] + '</small></div></div>';
  }).join('');
  $('#limits').innerHTML = '<thead><tr><th>At first contact</th><th class="num">Limit</th></tr></thead>' + G.LIMITS.map(function (l) { return '<tr><th style="font-weight:500">' + l.label + '</th><td class="num">' + l.text + '</td></tr>'; }).join('');

  $('#board').innerHTML = G.boardTable(G.specimenBoard());

  $('#cols').innerHTML = new Array(13).join('<i></i>');
  $('#spacebars').innerHTML = Object.keys(T.space).filter(function (k) { return T.space[k] > 0; }).map(function (k) {
    return '<div><span>space-' + k + '</span><span>' + T.space[k] + ' px</span><i style="width:' + T.space[k] * 2 + 'px"></i></div>';
  }).join('');

  var APPS = [
    ['og-parent-ink.png', 'Share card, parent', '1200 × 630', 6], ['og-dock-paper.png', 'Share card, Dock', '1200 × 630', 6],
    ['flight-sheet-paper.png', 'Flight sheet, paper', '1200 × 1500', 3], ['flight-sheet-ink.png', 'Flight sheet, ink', '1200 × 1500', 3], ['leaderboard-dock.png', 'Leaderboard card', '1600 × 1000', 6],
    ['tier-1.png', 'Tier 1', '1080 × 1350', 2], ['tier-2.png', 'Tier 2', '1080 × 1350', 2], ['tier-3.png', 'Tier 3', '1080 × 1350', 2], ['tier-4.png', 'Tier 4', '1080 × 1350', 2], ['tier-5.png', 'Tier 5', '1080 × 1350', 2], ['tier-6.png', 'Tier 6', '1080 × 1350', 2],
    ['banner-dock.png', 'Profile banner', '1500 × 500', 8], ['og-landing-ink.png', 'Share card, Landing', '1200 × 630', 4]
  ];
  $('#apps').innerHTML = APPS.map(function (a) {
    return '<figure style="grid-column:span ' + a[3] + '"><img loading="lazy" src="exports/' + a[0] + '" alt="' + a[1] + '"><figcaption><span>' + a[1] + '</span><span>' + a[2] + '</span></figcaption></figure>';
  }).join('');

  $('#tree').innerHTML = [
    '<b>index.html</b>            this standard',
    '<b>tokens/</b>',
    '  tokens.css          custom properties, light and dark, per simulation',
    '  tokens.json         the same values for any other tool',
    '  tokens.ts           typed export for the web app',
    '<b>css/</b>brand.css         components (sb- classes)',
    '<b>js/</b>',
    '  sb-logo.js          inline, themeable logos',
    '  sb-graphics.js      flight signature, arcs, chart, limb, icons',
    '  sb-tokens.js        tokens as a script, for file:// pages',
    '<b>fonts/</b>              Geist, Geist Mono (OFL), SB Matrix (ours)',
    '<b>logo/</b>',
    '  svg/                mark, lockup, stacked, wordmark, app icons, favicon',
    '  png/                the same at fixed sizes, plus favicon.ico',
    '  geometry.json       the numbers behind the mark',
    '<b>graphics/</b>           static SVG of each device, both grounds',
    '<b>templates/</b>          share card, flight sheet, tier poster, leaderboard, banner',
    '<b>exports/</b>            templates rendered to PNG',
    '<b>build/</b>              build_font.py, build_logo.py, build_tokens.py, export.py'
  ].join('\n');
  $('#snip').textContent = [
    '<html data-theme="dark" data-sim="dock">',
    '<link rel="stylesheet" href="brand/tokens/tokens.css">',
    '<link rel="stylesheet" href="brand/css/brand.css">',
    '',
    '<span data-sb-logo="lockup" data-sim="dock" data-height="28"></span>',
    '<div data-sb="signature" data-seed="421" data-tier="3"></div>',
    '<span class="sb-readout">0.08</span> <span class="sb-label">m/s</span>',
    '<span class="sb-status" data-state="pass">Pass</span>',
    '',
    '<script src="brand/js/sb-logo.js"></scr' + 'ipt>',
    '<script src="brand/js/sb-graphics.js"></scr' + 'ipt>',
    '<script>SBLogo.mount(); SBGraphics.mount();</scr' + 'ipt>'
  ].join('\n');

  /* ---- logo blocks ---- */
  function construction() {
    var g = L.data.geometry, m = g.stroke, C = g.canvas, s = '<svg viewBox="-66 -34 258 190" style="width:100%;max-width:640px" role="img" aria-label="Construction of the mark">';
    for (var i = 0; i <= 8; i++) {
      s += '<line x1="' + i * m + '" y1="0" x2="' + i * m + '" y2="' + C + '" stroke="var(--sb-line)" stroke-width=".4"/><line x1="0" y1="' + i * m + '" x2="' + C + '" y2="' + i * m + '" stroke="var(--sb-line)" stroke-width=".4"/>';
    }
    s += '<rect x="0" y="0" width="' + C + '" height="' + C + '" stroke="var(--sb-fg-3)" stroke-width=".5" fill="none"/>';
    s += '<rect x="' + m + '" y="' + m + '" width="' + (C - 2 * m) + '" height="' + (C - 2 * m) + '" stroke="var(--sb-accent)" stroke-width=".5" stroke-dasharray="2 2" fill="none"/>';
    s += '<path d="' + L.data.lockups.parent.mark.mark + '" fill="var(--sb-fg)" fill-opacity=".92"/>';
    var aim = g.aim, a = g.arrow;
    s += '<line x1="' + a[0][0] + '" y1="' + a[0][1] + '" x2="' + aim[0] + '" y2="' + aim[1] + '" stroke="var(--sb-accent)" stroke-width=".6" stroke-dasharray="1.5 1.5"/><line x1="' + a[1][0] + '" y1="' + a[1][1] + '" x2="' + aim[0] + '" y2="' + aim[1] + '" stroke="var(--sb-accent)" stroke-width=".6" stroke-dasharray="1.5 1.5"/>';
    s += '<circle cx="' + aim[0] + '" cy="' + aim[1] + '" r="1.8" fill="var(--sb-accent)" stroke="var(--sb-surface)" stroke-width=".6"/>';
    g.bar.concat(a).forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.1" fill="var(--sb-surface)" stroke="var(--sb-fg)" stroke-width=".5"/>'; });
    function dim(x1, y1, x2, y2, text, tx, ty, anchor) {
      var v = x1 === x2;
      return '<g stroke="var(--sb-fg-2)" stroke-width=".5"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>' +
        (v ? '<line x1="' + (x1 - 2) + '" y1="' + y1 + '" x2="' + (x1 + 2) + '" y2="' + y1 + '"/><line x1="' + (x1 - 2) + '" y1="' + y2 + '" x2="' + (x1 + 2) + '" y2="' + y2 + '"/>'
          : '<line x1="' + x1 + '" y1="' + (y1 - 2) + '" x2="' + x1 + '" y2="' + (y1 + 2) + '"/><line x1="' + x2 + '" y1="' + (y1 - 2) + '" x2="' + x2 + '" y2="' + (y1 + 2) + '"/>') +
        '</g><text x="' + tx + '" y="' + ty + '" font-family="var(--sb-font-mono)" font-size="4.4" letter-spacing=".3" fill="var(--sb-fg-2)" text-anchor="' + (anchor || 'middle') + '">' + text + '</text>';
    }
    s += dim(0, -12, C, -12, 'CANVAS 8 M', C / 2, -16);
    s += dim(m, 134, C - m, 134, 'MARK 6 M', C / 2, 143);
    s += dim(-12, g.bar[0][1], -12, g.bar[2][1], 'STROKE 1 M', -16, 24, 'end');
    s += dim(132, g.bar[2][1], 132, a[0][1], 'GAP ½ M', 136, 35.5, 'start');
    s += dim(-12, a[0][1], -12, a[2][1], 'ARROW 4½ M', -16, 73, 'end');
    s += '<text x="' + (aim[0] + 4) + '" y="' + (aim[1] - 9.5) + '" font-family="var(--sb-font-mono)" font-size="4.4" letter-spacing=".3" fill="var(--sb-accent-text)" text-anchor="middle"></text>';
    s += '<text x="136" y="' + (aim[1] + 1.5) + '" font-family="var(--sb-font-mono)" font-size="4.4" letter-spacing=".3" fill="var(--sb-accent-text)">LEGS AIM HERE</text><line x1="' + (aim[0] + 3) + '" y1="' + aim[1] + '" x2="134" y2="' + aim[1] + '" stroke="var(--sb-accent)" stroke-width=".4"/>';
    return s + '</svg>';
  }
  $('#construction').innerHTML = construction();

  var SIMS = ['parent', 'dock', 'landing'];
  $('#lockups').innerHTML = SIMS.map(function (sim) {
    var name = T.sim[sim].label;
    return '<div class="panel logo-tile c4" data-theme="light" data-sim="' + sim + '"><div class="cap"><b>' + name + '</b><span>On paper</span></div><div class="fill">' + L.lockup(sim) + '</div></div>' +
      '<div class="panel logo-tile c4" data-theme="dark" data-sim="' + sim + '"><div class="cap"><b>' + name + '</b><span>On ink</span></div><div class="fill">' + L.lockup(sim) + '</div></div>' +
      '<div class="panel logo-tile c2" data-theme="light" data-sim="' + sim + '"><div class="cap"><b>Stacked</b></div><div class="fill">' + L.stacked(sim, { className: 'wide' }) + '</div></div>' +
      '<div class="panel logo-tile c2" data-theme="dark" data-sim="' + sim + '"><div class="cap"><b>One colour</b></div><div class="fill">' + L.stacked(sim, { className: 'wide', mono: true }) + '</div></div>';
  }).join('');

  $('#sizes').innerHTML = [64, 32, 24, 16].map(function (h) {
    return '<div style="display:grid;gap:10px;justify-items:center"><span style="font-size:' + h + 'px" data-sb-logo="mark" data-follow-sim></span><span class="sb-micro sb-dim">' + h + '</span></div>';
  }).join('') + '<div style="display:grid;gap:10px;justify-items:start;margin-left:16px"><span style="font-size:16px" data-sb-logo="lockup" data-follow-sim></span><span class="sb-micro sb-dim">Lockup 16</span></div>';

  (function () {
    var g = L.data.geometry, pts = function (p, dy) { return 'M' + p.map(function (q) { return q[0] + ' ' + (q[1] + (dy || 0)); }).join('L') + 'Z'; };
    var closed = '<svg class="sb-logo" viewBox="0 0 120 120"><path fill="currentColor" d="' + pts(g.bar) + pts(g.arrow, -g.gap) + '"/></svg>';
    var plain = L.mark('parent', { mono: true });
    var items = [
      ['Stretched', '<span style="transform:scaleX(1.55)">' + plain + '</span>'],
      ['Off axis', '<span style="transform:rotate(32deg)">' + plain + '</span>'],
      ['Gap closed', closed],
      ['Outlined', plain.replace('class="sb-logo__mark"', 'class="sb-logo__mark" style="fill:none;stroke:currentColor;stroke-width:3"')],
      ['Unassigned colour', plain.replace('class="sb-logo__mark"', 'class="sb-logo__mark" style="fill:#1FA34A"')],
      ['Effects', '<span style="filter:drop-shadow(0 7px 5px rgba(0,0,0,.5)) blur(.4px)">' + plain + '</span>']
    ];
    $('#misuse').innerHTML = items.map(function (it) {
      return '<div class="panel panel--board misuse c2"><div class="fill">' + it[1] + '</div><span class="sb-status" data-state="abort">' + it[0] + '</span></div>';
    }).join('');
  })();

  /* ---- switches ---- */
  function mountAll() {
    var sim = root.dataset.sim;
    $$('.rail__logo,.cover__mid [data-sb-logo],[data-follow-sim]').forEach(function (el) { el.setAttribute('data-sim', sim); });
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
  var q = new URLSearchParams(location.search);
  if (q.get('theme')) root.setAttribute('data-theme', q.get('theme'));
  if (q.get('sim')) root.setAttribute('data-sim', q.get('sim'));
  $$('#theme-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === root.dataset.theme)); });
  $$('#sim-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === root.dataset.sim)); });
  bind('theme-tabs', 'data-theme');
  bind('sim-tabs', 'data-sim');
  mountAll(); roles();
})();
