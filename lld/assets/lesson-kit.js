/* Lesson kit: shared builders so every pattern lesson has the same structure, plus reusable widgets. */
(function () {
  "use strict";
  var H = window.LLD, esc = H.esc;
  H.M = function (lines) { return lines.join("\n"); };
  H.bad = function (name) { return "  style " + name + " stroke:#dc2626,stroke-width:2px"; };
  /* Compact class diagrams: "class X { -int a; +m() void }" lines expand to Mermaid's multi-line form. */
  H.cd = function (lines) {
    return lines.map(function (l) {
      var m = /^(\s*)class (\S+) \{(.*)\}\s*$/.exec(l);
      if (!m) return l;
      var ind = m[1], body = m[3].split(";").map(function (x) { return x.trim(); }).filter(Boolean);
      return ind + "class " + m[2] + " {\n" + body.map(function (b) { return ind + "  " + b; }).join("\n") + "\n" + ind + "}";
    }).join("\n");
  };
  H.good = function (name) { return "  style " + name + " stroke:#15803d,stroke-width:2px"; };

  /* Build a design-pattern lesson from a structured spec and register it.
     spec: code, name, summary, intent, problem{text?,points,code,m}, analogy,
           structure{text,m,roles[[participant, role]],points?}, impl{text,points,code,m?},
           variants[slide], designs[slide], usages[[where, how]], avoid{points,pros,cons},
           compare[[pattern, intent, tell-apart]], compareNotes[], extraSlides[], + standard lesson fields */
  H.pattern = function (spec) {
    var slides = [];
    slides.push({ title: "Intent: what problem " + spec.name + " solves",
      text: "**Intent.** " + spec.intent + (spec.problem.text ? " " + spec.problem.text : ""),
      points: spec.problem.points, analogy: spec.analogy, code: spec.problem.code, m: spec.problem.m });
    slides.push({ title: "Structure: the UML", text: spec.structure.text, m: spec.structure.m,
      table: [["Participant", "Role"]].concat(spec.structure.roles), points: spec.structure.points || [] });
    slides.push(Object.assign({ title: "Java implementation" }, spec.impl));
    (spec.variants || []).forEach(function (v) { slides.push(v); });
    (spec.designs || []).forEach(function (d) { slides.push(d); });
    (spec.extraSlides || []).forEach(function (d) { slides.push(d); });
    if (spec.usages) slides.push({ title: "Where you've already used it: JDK and Spring",
      text: "Recognising " + spec.name + " in libraries you use daily is a strong interview signal: name one, and say what varies.",
      table: [["Where", "How it uses " + spec.name]].concat(spec.usages), points: spec.usageNotes || [] });
    if (spec.avoid) slides.push({ title: "When NOT to use it", text: spec.avoid.text || "Every pattern has a cost in classes and indirection. Use it when that cost buys something real.",
      points: spec.avoid.points, pros: spec.avoid.pros, cons: spec.avoid.cons });
    if (spec.compare) slides.push({ title: "Look-alikes: how " + spec.name + " differs", text: spec.compareText || "Many patterns share the same class-diagram shape. What separates them is **intent**: the problem each one solves.",
      table: [["Pattern", "Intent", "How to tell them apart"]].concat(spec.compare), points: spec.compareNotes || [] });
    var lesson = {
      code: spec.code, summary: spec.summary, slides: slides, widget: spec.widget,
      examplesHeading: spec.examplesHeading || "Real-world analogies and usages",
      examples: spec.examples || (spec.usages || []).map(function (u) { return [u[0], u[1]]; }),
      pitfalls: spec.pitfalls, quiz: spec.quiz, cheatsheet: spec.cheatsheet, practice: spec.practice, recap: spec.recap
    };
    H.registerLesson(lesson);
    return lesson;
  };

  H.widgets = {};

  /* Classify snippets: cfg {intro, options[], full[], items[{title, code, answer, why, fix}], noun} */
  H.widgets.picker = function (cfg) {
    return function (el, ctx) {
      var s = ctx.state, items = cfg.items, opts = cfg.options, full = cfg.full || cfg.options;
      items.forEach(function (it) { if (typeof it.answer === "string") it.answer = opts.indexOf(it.answer); if (it.answer < 0) throw new Error("picker: unknown answer in " + it.title); });
      if (s.i === undefined) { s.i = 0; s.picks = {}; }
      el.innerHTML = (cfg.intro ? "<p>" + ctx.md(cfg.intro) + "</p>" : "") + "<div class='metrics' data-r='score'></div><div class='dots' data-r='dots'></div>" +
        "<h3 data-r='title' style='margin-top:6px'></h3><div data-r='code'></div>" +
        "<div><div class='field' style='margin-bottom:6px'>" + esc(cfg.question || "Which one is it?") + "</div><div class='btnrow qopts-inline' data-r='opts'></div></div>" +
        "<div class='result' data-r='res' hidden></div>" +
        "<div class='btnrow'><button type='button' class='btn' data-r='prev'>← Previous</button><button type='button' class='btn primary' data-r='next'>Next →</button><button type='button' class='btn' data-r='reset'>Reset</button></div>";
      var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
      function draw() {
        var it = items[s.i], pick = s.picks[s.i], keys = Object.keys(s.picks);
        var right = keys.filter(function (k) { return s.picks[k] === items[k].answer; }).length;
        q("score").innerHTML = "<div class='metric'><div class='v'>" + right + " / " + keys.length + "</div><div class='l'>Correct so far</div></div><div class='metric'><div class='v'>" + keys.length + " / " + items.length + "</div><div class='l'>" + esc(cfg.noun || "Items") + " answered</div></div>";
        q("dots").innerHTML = items.map(function (x, k) {
          var p = s.picks[k], bg = p === undefined ? "" : p === x.answer ? "background:var(--success)" : "background:var(--danger)";
          return "<button type='button' data-k='" + k + "' aria-label='Item " + (k + 1) + "' class='" + (k === s.i ? "cur" : "") + "' style='" + bg + "'></button>";
        }).join("");
        q("title").textContent = (cfg.noun ? cfg.noun.replace(/s$/, "") : "Item") + " " + (s.i + 1) + " of " + items.length + ": " + it.title;
        q("code").innerHTML = it.code ? ctx.H.codeBlock(it.code) : "<p>" + ctx.md(it.text || "") + "</p>";
        q("opts").innerHTML = opts.map(function (o, j) {
          var cls = pick === undefined ? "" : j === it.answer ? " correct" : j === pick ? " wrong" : "";
          return "<button type='button' class='btn" + cls + "' data-j='" + j + "'" + (pick !== undefined ? " disabled" : "") + " title='" + esc(full[j]) + "'>" + esc(o) + "</button>";
        }).join("");
        var res = q("res");
        if (pick === undefined) res.hidden = true;
        else {
          var ok = pick === it.answer; res.hidden = false; res.className = "result " + (ok ? "ok" : "err");
          res.innerHTML = "<div class='out'>" + (ok ? "Correct: " : "Not quite. It's ") + esc(full[it.answer]) + "</div><p style='margin-top:6px'>" + ctx.md(it.why) + "</p>" + (it.fix ? "<p style='margin-top:6px'><strong>Note:</strong> " + ctx.md(it.fix) + "</p>" : "");
        }
        q("prev").disabled = s.i === 0; q("next").disabled = s.i === items.length - 1;
      }
      q("opts").addEventListener("click", function (e) { var b = e.target.closest("button[data-j]"); if (!b || b.disabled) return; s.picks[s.i] = Number(b.getAttribute("data-j")); ctx.save(); draw(); });
      q("dots").addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (!b) return; s.i = Number(b.getAttribute("data-k")); ctx.save(); draw(); });
      q("prev").addEventListener("click", function () { if (s.i > 0) { s.i--; ctx.save(); draw(); } });
      q("next").addEventListener("click", function () { if (s.i < items.length - 1) { s.i++; ctx.save(); draw(); } });
      q("reset").addEventListener("click", function () { s.i = 0; s.picks = {}; ctx.save(); draw(); });
      draw();
    };
  };

  /* Step-through simulation: cfg {intro, steps[{label, text, m?, log?[], state?{k:v}}]} */
  H.widgets.stepper = function (cfg) {
    return function (el, ctx) {
      var s = ctx.state; if (s.k === undefined) s.k = 0;
      el.innerHTML = (cfg.intro ? "<p>" + ctx.md(cfg.intro) + "</p>" : "") + "<div class='seg' data-r='tabs'></div><div class='diagram' data-r='dg'></div><p data-r='txt'></p><div class='tablewrap' data-r='st'></div><pre class='code' data-r='log'></pre>" +
        "<div class='btnrow'><button type='button' class='btn' data-r='prev'>← Back</button><button type='button' class='btn primary' data-r='next'>Next step →</button></div>";
      var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
      function draw() {
        var st = cfg.steps[s.k];
        q("tabs").innerHTML = cfg.steps.map(function (x, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.k ? "on" : "") + "'>" + (i + 1) + ". " + esc(x.label) + "</button>"; }).join("");
        q("txt").innerHTML = ctx.md(st.text || "");
        var dg = q("dg"); if (st.m) { dg.hidden = false; ctx.H.renderDiagram(dg, st.m); } else { dg.hidden = true; dg.innerHTML = ""; }
        var stEl = q("st"); if (st.state) { stEl.hidden = false; stEl.innerHTML = "<table><thead><tr><th>Object</th><th>State after this step</th></tr></thead><tbody>" + Object.keys(st.state).map(function (k) { return "<tr><td>" + ctx.md(k) + "</td><td>" + ctx.md(String(st.state[k])) + "</td></tr>"; }).join("") + "</tbody></table>"; } else { stEl.hidden = true; }
        var all = []; for (var i = 0; i <= s.k; i++) (cfg.steps[i].log || []).forEach(function (l) { all.push((i === s.k ? "▶ " : "  ") + l); });
        q("log").hidden = !all.length; q("log").textContent = all.join("\n");
        q("prev").disabled = s.k === 0; q("next").disabled = s.k === cfg.steps.length - 1;
      }
      q("tabs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.k = Number(b.getAttribute("data-i")); ctx.save(); draw(); });
      q("prev").addEventListener("click", function () { if (s.k > 0) { s.k--; ctx.save(); draw(); } });
      q("next").addEventListener("click", function () { if (s.k < cfg.steps.length - 1) { s.k++; ctx.save(); draw(); } });
      draw();
    };
  };
})();
