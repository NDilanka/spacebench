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
    done: function () { document.querySelectorAll('[data-follow-sim]').forEach(function (el) { el.setAttribute('data-sim', window.SBParams.sim); }); SBLogo.mount(); SBGraphics.mount(); }
  };
})();
