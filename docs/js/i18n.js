/* Dictionary-swap localization.
   English is authored inline in the HTML and is always complete;
   other languages are drop-in files at locales/<code>.json plus an
   <option> in the switcher. Missing file or key: inline English stays.
   Switching applies in place (no reload); the original English text is
   stashed on each node so switching back needs no fetch. The choice is
   not persisted: every load starts in the page's own language (English
   for originals), and only an explicit switch changes it.
   Extras for JS-created UI and full page translations:
   - window.bwbDict always holds the active flattened dictionary ({} for
     English); "bwb:langchange" fires on document after every change.
   - A body[data-alt-<code>] attribute marks a real translated copy of
     this page; choosing that language NAVIGATES there instead of
     swapping. Translated pages (html[lang] != "en") never dictionary-swap
     — they only navigate back, but still load their locale file so
     JS-created UI (share, quiz labels) speaks their language. */
(function () {
  "use strict";

  var root = document.body.getAttribute("data-root") || "./";
  var select = document.getElementById("lang-switch");
  var pageLang = document.documentElement.getAttribute("lang") || "en";

  window.bwbDict = {};

  function announce() {
    document.dispatchEvent(new CustomEvent("bwb:langchange"));
  }

  function flatten(obj, prefix, out) {
    Object.keys(obj).forEach(function (k) {
      var value = obj[k];
      var key = prefix ? prefix + "." + k : k;
      if (value && typeof value === "object") {
        flatten(value, key, out);
      } else {
        out[key] = String(value);
      }
    });
    return out;
  }

  function nodes() {
    return document.querySelectorAll("[data-i18n]");
  }

  function apply(dict) {
    Array.prototype.forEach.call(nodes(), function (node) {
      var key = node.getAttribute("data-i18n");
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        if (node.dataset.i18nOriginal === undefined) {
          node.dataset.i18nOriginal = node.textContent;
        }
        node.textContent = dict[key];
      }
    });
  }

  function restoreEnglish() {
    Array.prototype.forEach.call(nodes(), function (node) {
      if (node.dataset.i18nOriginal !== undefined) {
        node.textContent = node.dataset.i18nOriginal;
      }
    });
    document.documentElement.lang = "en";
    window.bwbDict = {};
    announce();
  }

  function load(lang) {
    if (lang === "en") { return; } /* English lives inline */
    fetch(root + "locales/" + lang + ".json")
      .then(function (response) {
        if (!response.ok) { throw new Error("HTTP " + response.status); }
        return response.json();
      })
      .then(function (data) {
        var dict = flatten(data, "", {});
        window.bwbDict = dict;
        if (pageLang === "en") {
          apply(dict);
          document.documentElement.lang = lang;
        }
        announce();
      })
      .catch(function () { /* fall back silently to inline English */ });
  }

  if (select) {
    /* every load starts in the page's own language — English originals
       stay English until the visitor explicitly switches */
    select.value = pageLang;
    select.addEventListener("change", function () {
      var choice = select.value;
      var alt = document.body.getAttribute("data-alt-" + choice);
      if (alt) { window.location.href = alt; return; }
      if (pageLang !== "en") { return; } /* translated page, no swap */
      if (choice === "en") {
        restoreEnglish();
      } else {
        load(choice);
      }
    });
  }

  /* no auto-redirect or auto-swap on load — English pages start in English;
     translated pages still fetch their locale so JS-created UI matches */
  if (pageLang !== "en") { load(pageLang); }
})();
