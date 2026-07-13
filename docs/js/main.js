/* Bytes Without Borders — progressive enhancement only.
   Everything on the site works without this file. */
(function () {
  "use strict";

  /* Mobile navigation toggle */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
  }

  /* Lessons hub topic filter — the bar ships hidden; JS reveals it */
  var filterBar = document.querySelector("[data-filter-bar]");
  if (filterBar) {
    filterBar.hidden = false;
    var buttons = filterBar.querySelectorAll("button[data-topic]");
    var cards = document.querySelectorAll("[data-lesson-card]");
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        Array.prototype.forEach.call(buttons, function (other) {
          other.setAttribute("aria-pressed", String(other === btn));
        });
        var topic = btn.getAttribute("data-topic");
        Array.prototype.forEach.call(cards, function (card) {
          card.hidden = topic !== "all" && card.getAttribute("data-topic") !== topic;
        });
      });
    });
  }

  /* Scroll-driven reveals: cards and section content rise in as they
     enter the viewport. Pure enhancement — without JS (or with reduced
     motion) nothing is ever hidden. */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealTargets = document.querySelectorAll(
      ".topic-card, .postcard, .section-title, .band h2, .band p, .band .btn, .prose > h2, .quiz-frame, .form-grid > div"
    );
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });

    var siblingCount = [];
    Array.prototype.forEach.call(revealTargets, function (node) {
      var slot = -1;
      for (var i = 0; i < siblingCount.length; i++) {
        if (siblingCount[i].parent === node.parentNode) { slot = i; break; }
      }
      if (slot === -1) {
        slot = siblingCount.length;
        siblingCount.push({ parent: node.parentNode, seen: 0 });
      }
      var delay = Math.min(siblingCount[slot].seen * 70, 350);
      siblingCount[slot].seen += 1;
      node.style.setProperty("--reveal-delay", delay + "ms");
      node.classList.add("reveal");
      observer.observe(node);
    });
  }

  /* Contact form: no backend — sending composes an email instead.
     The form ships hidden (its Send is useless without JS); reveal it. */
  var form = document.getElementById("contact-form");
  if (form) {
    form.hidden = false;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = document.getElementById("c-name").value;
      var email = document.getElementById("c-email").value;
      var message = document.getElementById("c-message").value;
      var body = message + "\n\n— " + name + " (" + email + ")";
      window.location.href =
        "mailto:hello@byteswithoutborders.example" +
        "?subject=" + encodeURIComponent("I want to help — " + name) +
        "&body=" + encodeURIComponent(body);
    });
  }
})();
