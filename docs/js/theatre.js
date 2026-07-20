/* Bytes Without Borders — theatre.js: the theatrical enhancement layer.
   Everything here is decorative garnish; every page is complete without
   this file (and without JavaScript entirely). Modules guard themselves:
   reduced motion disables everything, tilt/magnet additionally require a
   fine pointer on a desktop viewport. Styling happens only through CSSOM
   custom properties (style.setProperty) — the CSP forbids style attrs. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var desktopFine = window.matchMedia("(pointer: fine) and (min-width: 46em)");

  /* ----- watermark words resolve from the active locale ----- */
  /* English is the EMPTY dictionary (i18n.js restoreEnglish sets
     window.bwbDict = {}), so the authored English word must be stashed
     on first run and restored whenever the key is absent — mirroring
     i18n.js's own dataset.i18nOriginal pattern. */
  function applyWatermarks() {
    var dict = window.bwbDict || {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-watermark][data-watermark-key]"), function (node) {
      if (!node.dataset.wmDefault) { node.dataset.wmDefault = node.getAttribute("data-watermark"); }
      var key = node.getAttribute("data-watermark-key");
      node.setAttribute("data-watermark",
        Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : node.dataset.wmDefault);
    });
  }
  document.addEventListener("bwb:langchange", applyWatermarks);
  applyWatermarks();

  /* modules land here in later tasks */
  void reduce; void desktopFine;
})();
