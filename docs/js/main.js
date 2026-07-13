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

  /* Contact form: no backend — sending composes an email instead */
  var form = document.getElementById("contact-form");
  if (form) {
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
