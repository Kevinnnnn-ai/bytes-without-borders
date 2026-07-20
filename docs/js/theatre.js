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

  /* ----- 3D tilt + glare: postcards follow the pointer ----- */
  var MAX_TILT = 8; /* degrees */
  Array.prototype.forEach.call(document.querySelectorAll(".postcard"), function (card) {
    var rect = null;
    var frame = 0;
    card.addEventListener("pointerenter", function () {
      if (reduce.matches || !desktopFine.matches) { return; }
      rect = card.getBoundingClientRect();
    });
    card.addEventListener("pointermove", function (event) {
      if (!rect || frame) { return; }
      var x = event.clientX;
      var y = event.clientY;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        if (!rect) { return; }
        var px = (x - rect.left) / rect.width;
        var py = (y - rect.top) / rect.height;
        card.style.setProperty("--ry", ((px - 0.5) * 2 * MAX_TILT).toFixed(2) + "deg");
        card.style.setProperty("--rx", ((0.5 - py) * 2 * MAX_TILT).toFixed(2) + "deg");
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      });
    });
    card.addEventListener("pointerleave", function () {
      rect = null;
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
      card.style.removeProperty("--mx");
      card.style.removeProperty("--my");
    });
  });

  /* ----- magnetic pull: chips and floating buttons lean toward the pointer ----- */
  var MAGNET_RANGE = 0.25;
  var MAGNET_MAX = 6; /* px */
  function clampMag(value) { return Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, value)); }
  Array.prototype.forEach.call(document.querySelectorAll(".filter-btn, .to-top, .share-btn"), function (btn) {
    btn.addEventListener("pointermove", function (event) {
      if (reduce.matches || !desktopFine.matches) { return; }
      var rect = btn.getBoundingClientRect();
      btn.style.setProperty("--magx", clampMag((event.clientX - (rect.left + rect.width / 2)) * MAGNET_RANGE).toFixed(1) + "px");
      btn.style.setProperty("--magy", clampMag((event.clientY - (rect.top + rect.height / 2)) * MAGNET_RANGE).toFixed(1) + "px");
    });
    btn.addEventListener("pointerleave", function () {
      btn.style.removeProperty("--magx");
      btn.style.removeProperty("--magy");
    });
  });
})();
