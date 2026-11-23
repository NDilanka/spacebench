/* Reads ?theme= and ?sim= (and any other key) so one template serves every variant. */
(function () {
  var q = new URLSearchParams(location.search), r = document.documentElement;
  ['theme', 'sim'].forEach(function (k) { if (q.get(k)) r.setAttribute('data-' + k, q.get(k)); });
  window.SBParams = {
    get: function (k, d) { return q.get(k) || d; },
    num: function (k, d) { return q.get(k) == null ? d : +q.get(k); },
    sim: r.getAttribute('data-sim') || 'parent',
    theme: r.getAttribute('data-theme') || 'light',
    simName: { parent: 'SpaceBench', dock: 'SpaceBench Dock', landing: 'SpaceBench Landing' }[r.getAttribute('data-sim') || 'parent'],
    pad4: function (n) { return String(n).padStart(4, '0'); },
    clock: function (s) { s = Math.round(s); return 'T+' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); },
    done: function () {
      document.querySelectorAll('[data-follow-sim]').forEach(function (el) { el.setAttribute('data-sim', window.SBParams.sim); });
      SBLogo.mount(); if (window.SBGraphics) SBGraphics.mount();
      window.SBParams.ready();
    },
    /* Sets body[data-ready] once the fonts and every image have loaded. The exporter waits for it. */
    ready: function () {
      var srcs = [].map.call(document.querySelectorAll('img[src], image[href]'), function (i) { return i.getAttribute('src') || i.getAttribute('href'); });
      Promise.all([document.fonts.ready].concat(srcs.map(function (s) {
        return new Promise(function (ok) { var t = new Image(); t.onload = t.onerror = ok; t.src = s; });
      }))).then(function () { setTimeout(function () { document.body.dataset.ready = '1'; }, 60); });
    }
  };
  /* The plate: a square of drafting film over the plume field, with the mark as a window through it.
     The window shows the same field on the other ground, so a film plate opens onto ink and an ink plate onto film.
     o.size: artboard side in px. o.plate: plate side as a share of the artboard. o.mark: mark as a share of the plate.
     o.base: path to textures/ and the texture name, for example '../textures/plume-square'.
     o.bare: the plate alone, o.size across, with no ground around it, for laying over a ground the page already has. */
  var uid = 0;
  window.SBPlate = function (sim, o) {
    o = o || {};
    var S = o.size || 800, ps = S * (o.bare ? 1 : o.plate || 0.62), p0 = (S - ps) / 2, ms = ps * (o.mark || 0.7), m0 = (S - ms) / 2, id = 'sbp' + (++uid);
    var d = SBLogo.data.lockups[sim || 'parent'].mark.mark, dark = !!o.dark;
    /* a film plate opens onto ink, so the accent is added as light; an ink plate opens onto film, so it is laid on as ink */
    var accent = { dock: dark ? '#8E6BFF' : '#6B3BFF', landing: dark ? '#FF7A33' : '#FF5A0A' }[sim];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + S + ' ' + S + '" width="' + S + '" height="' + S + '" role="img" aria-label="SpaceBench">' +
      '<defs><clipPath id="' + id + '"><path transform="translate(' + m0 + ' ' + m0 + ') scale(' + ms / 120 + ')" d="' + d + '"/></clipPath></defs>' +
      (o.bare ? '' : '<image href="' + o.base + '-' + (dark ? 'ink' : 'film') + '.jpg" width="' + S + '" height="' + S + '" preserveAspectRatio="xMidYMid slice"/>') +
      '<rect x="' + p0 + '" y="' + p0 + '" width="' + ps + '" height="' + ps + '" fill="' + (dark ? '#0D111A' : '#DDE1E6') + '" fill-opacity="' + (dark ? 0.9 : 0.88) + '"/>' +
      '<g clip-path="url(#' + id + ')" style="isolation:isolate"><image href="' + o.base + '-' + (dark ? 'film' : 'ink') + '.jpg" width="' + S + '" height="' + S + '" preserveAspectRatio="xMidYMid slice"/>' +
      (accent ? '<rect width="' + S + '" height="' + S + '" fill="' + accent + '" style="mix-blend-mode:' + (dark ? 'multiply' : 'screen') + '"/>' : '') + '</g></svg>';
  };
})();
