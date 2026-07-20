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

  /* modules land here in later tasks */
  void reduce; void desktopFine;
})();
