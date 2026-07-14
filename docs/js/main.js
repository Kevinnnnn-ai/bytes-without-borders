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
    /* announce filter results to screen readers */
    var filterStatus = document.createElement("p");
    filterStatus.className = "visually-hidden";
    filterStatus.setAttribute("aria-live", "polite");
    filterBar.parentNode.insertBefore(filterStatus, filterBar.nextSibling);
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        Array.prototype.forEach.call(buttons, function (other) {
          other.setAttribute("aria-pressed", String(other === btn));
        });
        var topic = btn.getAttribute("data-topic");
        var shown = 0;
        Array.prototype.forEach.call(cards, function (card) {
          card.hidden = topic !== "all" && card.getAttribute("data-topic") !== topic;
          if (!card.hidden) { shown += 1; }
        });
        filterStatus.textContent = "Showing " + shown + " of " + cards.length + " lessons";
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
          var node = entry.target;
          node.classList.add("in-view");
          observer.unobserve(node);
          /* tear the reveal machinery down once the entrance finishes
             (650ms transition + up to 350ms stagger) so the element's own
             hover/component transitions take over again */
          setTimeout(function () {
            node.classList.remove("reveal", "in-view");
            node.style.removeProperty("--reveal-delay");
          }, 1100);
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

  /* Back to top — appears after most of a screen has scrolled by */
  var toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.textContent = "↑";
  document.body.appendChild(toTop);
  var toTopTick = false;
  window.addEventListener("scroll", function () {
    if (toTopTick) { return; }
    toTopTick = true;
    window.requestAnimationFrame(function () {
      toTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.8);
      toTopTick = false;
    });
  }, { passive: true });
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0 });
    var skip = document.querySelector(".skip-link");
    if (skip) { skip.focus({ preventScroll: true }); }
  });

  /* Share — lessons are written to be passed along */
  var article = document.querySelector("article.prose");
  var canCopy = navigator.clipboard && navigator.clipboard.writeText;
  if (article && (navigator.share || canCopy)) {
    var SHARE_LABEL = "Share this lesson";
    var share = document.createElement("button");
    share.type = "button";
    share.className = "btn share-btn";
    share.textContent = SHARE_LABEL;
    article.appendChild(share);
    share.addEventListener("click", function () {
      if (navigator.share) {
        navigator.share({ title: document.title, url: window.location.href })
          .catch(function () { /* user closed the share sheet */ });
      } else {
        navigator.clipboard.writeText(window.location.href).then(function () {
          share.textContent = "Link copied ✓";
          setTimeout(function () { share.textContent = SHARE_LABEL; }, 2000);
        }).catch(function () { /* clipboard unavailable */ });
      }
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
