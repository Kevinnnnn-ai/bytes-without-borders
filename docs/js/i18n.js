/* Dictionary-swap localization.
   English is authored inline in the HTML and is always complete;
   other languages are drop-in files at locales/<code>.json plus an
   <option> in the switcher. Missing file or key: inline English stays. */
(function () {
  "use strict";

  var STORAGE_KEY = "bwb-lang";
  var root = document.body.getAttribute("data-root") || "./";
  var select = document.getElementById("lang-switch");

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

  function apply(dict) {
    var nodes = document.querySelectorAll("[data-i18n]");
    Array.prototype.forEach.call(nodes, function (node) {
      var key = node.getAttribute("data-i18n");
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        node.textContent = dict[key];
      }
    });
  }

  function load(lang) {
    if (lang === "en") { return; } /* English lives inline */
    fetch(root + "locales/" + lang + ".json")
      .then(function (response) {
        if (!response.ok) { throw new Error("HTTP " + response.status); }
        return response.json();
      })
      .then(function (data) {
        apply(flatten(data, "", {}));
        document.documentElement.lang = lang;
      })
      .catch(function () { /* fall back silently to inline English */ });
  }

  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
  var lang = saved || "en";

  if (select) {
    var known = Array.prototype.some.call(select.options, function (option) {
      return option.value === lang;
    });
    if (!known) { lang = "en"; }
    select.value = lang;
    select.addEventListener("change", function () {
      try { localStorage.setItem(STORAGE_KEY, select.value); } catch (e) { /* ignore */ }
      window.location.reload();
    });
  }

  load(lang);
})();
