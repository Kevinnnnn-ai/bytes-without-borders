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
    }, { passive: true });
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
    }, { passive: true });
    card.addEventListener("pointerleave", function () {
      rect = null;
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
      card.style.removeProperty("--mx");
      card.style.removeProperty("--my");
    }, { passive: true });
  });

  /* ----- magnetic pull: chips and floating buttons lean toward the pointer ----- */
  var MAGNET_RANGE = 0.25;
  var MAGNET_MAX = 6; /* px */
  function clampMag(value) { return Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, value)); }
  Array.prototype.forEach.call(document.querySelectorAll(".filter-btn, .to-top, .share-btn"), function (btn) {
    var rect = null;
    var frame = 0;
    btn.addEventListener("pointerenter", function () {
      if (reduce.matches || !desktopFine.matches) { return; }
      rect = btn.getBoundingClientRect();
    }, { passive: true });
    btn.addEventListener("pointermove", function (event) {
      if (!rect || frame) { return; }
      var x = event.clientX;
      var y = event.clientY;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        if (!rect) { return; }
        btn.style.setProperty("--magx", clampMag((x - (rect.left + rect.width / 2)) * MAGNET_RANGE).toFixed(1) + "px");
        btn.style.setProperty("--magy", clampMag((y - (rect.top + rect.height / 2)) * MAGNET_RANGE).toFixed(1) + "px");
      });
    }, { passive: true });
    btn.addEventListener("pointerleave", function () {
      rect = null;
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      btn.style.removeProperty("--magx");
      btn.style.removeProperty("--magy");
    }, { passive: true });
  });

  /* ----- stamp confetti: celebrate correct quiz answers ----- */
  function themeColors() {
    var styles = window.getComputedStyle(document.documentElement);
    return ["--indigo", "--coral", "--topic-literacy", "--topic-inclusion"].map(function (name) {
      return styles.getPropertyValue(name).trim() || "#4f46e5";
    });
  }

  function burst(origin, count) {
    var canvas = document.createElement("canvas");
    try {
      var rect = origin.getBoundingClientRect();
      var scale = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * scale;
      canvas.height = window.innerHeight * scale;
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "90";
      canvas.setAttribute("aria-hidden", "true");
      var context = canvas.getContext("2d");
      if (!context) { return; }
      document.body.appendChild(canvas);
      context.scale(scale, scale);
      var colors = themeColors();
      var particles = [];
      var originX = rect.left + rect.width / 2;
      var originY = rect.top + rect.height / 2;
      for (var i = 0; i < count; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 3 + Math.random() * 7;
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          w: 10 + Math.random() * 8,
          h: 7 + Math.random() * 5,
          color: colors[i % colors.length]
        });
      }
      var started = null;
      function tick(now) {
        try {
          if (!started) { started = now; }
          var life = now - started;
          context.clearRect(0, 0, window.innerWidth, window.innerHeight);
          particles.forEach(function (p) {
            p.vy += 0.16;
            p.vx *= 0.992;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            context.save();
            context.translate(p.x, p.y);
            context.rotate(p.rot);
            context.globalAlpha = Math.max(0, 1 - life / 1600);
            context.fillStyle = p.color;
            context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            /* perforated stamp edge */
            context.strokeStyle = "rgba(255, 255, 255, 0.85)";
            context.setLineDash([2, 2]);
            context.strokeRect(-p.w / 2 + 1.5, -p.h / 2 + 1.5, p.w - 3, p.h - 3);
            context.restore();
          });
          if (life < 1600) {
            window.requestAnimationFrame(tick);
          } else {
            canvas.remove();
          }
        } catch (error) {
          canvas.remove();
        }
      }
      window.requestAnimationFrame(tick);
    } catch (error) {
      canvas.remove();
    }
  }

  document.addEventListener("bwb:quiz:correct", function (event) {
    if (reduce.matches || !event.detail || !event.detail.button) { return; }
    burst(event.detail.button, 90);
  });

  /* ----- score finale: decorative count-up + DELIVERED postmark ----- */
  document.addEventListener("bwb:quiz:done", function (event) {
    var detail = event.detail || {};
    if (!detail.scoreLine || !detail.scoreLine.parentNode || reduce.matches) { return; }
    var dict = window.bwbDict || {};
    var word = Object.prototype.hasOwnProperty.call(dict, "quiz.delivered") ? dict["quiz.delivered"] : "DELIVERED";
    var finale = document.createElement("div");
    finale.className = "quiz-finale";
    finale.setAttribute("aria-hidden", "true");
    var count = document.createElement("span");
    count.className = "quiz-finale-count";
    count.textContent = "0";
    var mark = document.createElement("span");
    mark.className = "quiz-finale-mark";
    mark.textContent = word;
    finale.appendChild(count);
    finale.appendChild(mark);
    detail.scoreLine.parentNode.insertBefore(finale, detail.scoreLine);
    var start = null;
    function step(now) {
      if (!start) { start = now; }
      var t = Math.min(1, (now - start) / 900);
      var eased = 1 - Math.pow(1 - t, 3);
      count.textContent = String(Math.round(eased * detail.score));
      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        mark.classList.add("is-stamped");
        if (detail.score === detail.total) { burst(count, 140); }
      }
    }
    window.requestAnimationFrame(step);
  });
})();
