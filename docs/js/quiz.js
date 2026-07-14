/* Quiz engine: renders a JSON-defined micro-quiz into #quiz.
   UI strings live in STRINGS below; when a second language lands,
   they move to the locale files (see superpowers/architecture.md). */
(function () {
  "use strict";

  var host = document.getElementById("quiz");
  if (!host) { return; }

  var STRINGS = {
    progress: "Question {current} of {total}",
    correct: "Correct.",
    incorrect: "Not quite.",
    next: "Next question",
    finish: "See your score",
    retry: "Try again",
    score: "You got {score} of {total}.",
    perfect: "Perfect — your instincts are sharp.",
    good: "Solid — worth rereading the explanations you missed.",
    start: "Good start — read “Understanding passwords” next, then come back.",
    error: "This lesson could not load. Refresh the page to try again."
  };

  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      return String(values[key]);
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text) { node.textContent = text; }
    return node;
  }

  /* Focus re-rendered content so keyboard users stay in the quiz and
     screen readers announce each transition. */
  function focusInto(node) {
    node.setAttribute("tabindex", "-1");
    node.focus();
  }

  function isValid(data) {
    if (!data || typeof data.title !== "string" || !Array.isArray(data.questions) || data.questions.length === 0) {
      return false;
    }
    return data.questions.every(function (q) {
      return typeof q.prompt === "string" &&
        Array.isArray(q.choices) && q.choices.length >= 2 &&
        Number.isInteger(q.answerIndex) &&
        q.answerIndex >= 0 && q.answerIndex < q.choices.length &&
        typeof q.explanation === "string";
    });
  }

  function fail() {
    host.textContent = "";
    host.appendChild(el("p", "quiz-error", STRINGS.error));
  }

  function start(data) {
    var index = 0;
    var score = 0;
    var total = data.questions.length;

    function renderQuestion(moveFocus) {
      var q = data.questions[index];
      host.textContent = "";
      var progress = el("p", "quiz-progress", fill(STRINGS.progress, { current: index + 1, total: total }));
      host.appendChild(progress);

      /* visual progress track (the text above already announces it) */
      var bar = el("div", "quiz-bar");
      bar.setAttribute("aria-hidden", "true");
      var barFill = el("span", "quiz-bar-fill");
      bar.appendChild(barFill);
      host.appendChild(bar);
      window.requestAnimationFrame(function () {
        barFill.style.width = (((index + 1) / total) * 100) + "%";
      });

      host.appendChild(el("p", "quiz-question", q.prompt));

      var list = el("ul", "quiz-choices");
      var buttons = [];
      q.choices.forEach(function (choice, i) {
        var item = el("li");
        var button = el("button", "quiz-choice", choice);
        button.type = "button";
        button.addEventListener("click", function () { answer(i, buttons, q); });
        buttons.push(button);
        item.appendChild(button);
        list.appendChild(item);
      });
      host.appendChild(list);
      /* only on transitions — never steal focus on page load */
      if (moveFocus) { focusInto(progress); }
    }

    function answer(chosen, buttons, q) {
      var right = chosen === q.answerIndex;
      buttons.forEach(function (button) { button.disabled = true; });
      /* mark with glyphs as well as color */
      buttons[q.answerIndex].classList.add("is-correct");
      buttons[q.answerIndex].textContent = "✓ " + buttons[q.answerIndex].textContent;
      if (right) {
        score += 1;
      } else {
        buttons[chosen].classList.add("is-incorrect");
        buttons[chosen].textContent = "✗ " + buttons[chosen].textContent;
      }

      var explain = el("div", "quiz-explain");
      explain.appendChild(el("p", null, (right ? STRINGS.correct : STRINGS.incorrect) + " " + q.explanation));
      host.appendChild(explain);

      var last = index === total - 1;
      var next = el("button", "btn btn-primary quiz-next", last ? STRINGS.finish : STRINGS.next);
      next.type = "button";
      next.addEventListener("click", function () {
        if (last) {
          renderScore();
        } else {
          index += 1;
          renderQuestion(true);
        }
      });
      host.appendChild(next);
      focusInto(explain);
    }

    function renderScore() {
      host.textContent = "";
      var scoreLine = el("p", "quiz-score", fill(STRINGS.score, { score: score, total: total }));
      host.appendChild(scoreLine);
      var verdict = score === total ? STRINGS.perfect : (score >= Math.ceil(total * 0.6) ? STRINGS.good : STRINGS.start);
      host.appendChild(el("p", null, verdict));
      var retry = el("button", "btn quiz-next", STRINGS.retry);
      retry.type = "button";
      retry.addEventListener("click", function () {
        index = 0;
        score = 0;
        renderQuestion(true);
      });
      host.appendChild(retry);
      focusInto(scoreLine);
    }

    renderQuestion(false);
  }

  fetch(host.getAttribute("data-src"))
    .then(function (response) {
      if (!response.ok) { throw new Error("HTTP " + response.status); }
      return response.json();
    })
    .then(function (data) {
      if (!isValid(data)) { throw new Error("invalid quiz data"); }
      start(data);
    })
    .catch(fail);
})();
