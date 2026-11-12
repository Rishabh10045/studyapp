/* Java Teaching App: generic lesson player. Lesson content lives in assets/lessons/<CODE>.js.
   Same player as the LLD app: Java code blocks, analogies, a cheat sheet and collapsible practice questions. */
(function () {
  "use strict";
  var H = window.JAVA, $ = function (id) { return document.getElementById(id); }, esc = H.esc, md = H.md;

  var LESSONS = H.TOPICS.map(function (t) {
    var c = H.code(t);
    return { id: t.id, code: c, name: t.name, kind: t.kind, deps: t.deps || [], group: t.kind === "prob" ? t.group + " problems" : t.group, ready: H.isReady(c) };
  });
  function lessonBy(c) { return LESSONS.filter(function (l) { return l.code === c; })[0]; }
  function nextReady(after) {
    var i = LESSONS.indexOf(lessonBy(after));
    for (var j = i + 1; j < LESSONS.length; j++) if (LESSONS[j].ready) return LESSONS[j];
    return null;
  }

  /* ---------- Persisted state ---------- */
  var SKEY = "java.app.state.v1";
  var S = H.load(SKEY, null) || {};
  ["steps", "picked", "open", "widgets"].forEach(function (k) { if (!S[k] || typeof S[k] !== "object") S[k] = {}; });
  if (!S.lesson) S.lesson = "J01";
  var m = /lesson=([A-Z]\d\d)/.exec(location.hash);
  if (m && lessonBy(m[1])) S.lesson = m[1];
  if (!lessonBy(S.lesson)) S.lesson = "J01";
  function save() { H.save(SKEY, S); }

  /* ---------- Normalisers (lesson files may use short keys) ---------- */
  function slideOf(s) {
    return { title: s.title || s.t, text: s.text || s.x || "", points: s.points || s.p || [], pros: s.pros, cons: s.cons, table: s.table,
      nodes: s.nodes, edges: s.edges, d: s.d, m: s.m, svg: s.svg, dir: s.dir, code: s.code, lang: s.lang, analogy: s.analogy };
  }
  function quizOf(q) { return Array.isArray(q) ? { q: q[0], options: q[1], answer: q[2], why: q[3] } : q; }
  function exOf(e) { return Array.isArray(e) ? { title: e[0], detail: e[1] } : e; }
  function diagramSource(s) {
    if (s.m) return /^\s*flowchart|^\s*graph/.test(s.m) ? s.m + "\n  classDef s0 stroke:#3b82f6,stroke-width:2px;\n  classDef s1 stroke:#eab308,stroke-width:2px;\n  classDef s2 stroke:#06b6d4,stroke-width:2px;\n  classDef bad stroke:#dc2626,stroke-width:2px;" : s.m;
    if (s.d) {
      var nodes = s.d.n.map(function (n) { return Array.isArray(n) ? { id: n[0], label: n[1], detail: n[2] || undefined, series: n[3] === null || n[3] === undefined ? undefined : n[3], kind: n[4] } : n; });
      var edges = (s.d.e || []).map(function (e) { return Array.isArray(e) ? { from: e[0], to: e[1], label: e[2] || undefined, dashed: !!e[3] } : e; });
      return H.flow(nodes, edges, s.d.dir || s.dir || "LR");
    }
    if (s.nodes) return H.flow(s.nodes, s.edges || [], s.dir || "LR");
    return null;
  }

  /* ---------- Sidebar ---------- */
  function renderList() {
    var html = "", last = "";
    LESSONS.forEach(function (l) {
      if (l.group !== last) { html += "<div class='g'>" + esc(l.group) + "</div>"; last = l.group; }
      var done = H.isDone(l.id);
      var st = done ? "<span class='st done'>Done ✓</span>" : l.ready ? "<span class='st'>Ready</span>" : "<span class='st soon' title='Coming soon'>🔒 Soon</span>";
      html += "<button type='button' class='lesson" + (l.ready ? " ready" : " locked") + (l.code === S.lesson ? " on" : "") + "' data-code='" + l.code + "'><span class='c'>" + l.code + "</span><span class='n'>" + esc(l.name) + "</span>" + st + "</button>";
    });
    $("lesson-list").innerHTML = html;
    var on = $("lesson-list").querySelector(".lesson.on");
    if (on && on.scrollIntoView && $("lesson-list").dataset.scrolled !== S.lesson) { $("lesson-list").dataset.scrolled = S.lesson; on.scrollIntoView({ block: "nearest" }); }
  }
  function open(code, scroll) {
    S.lesson = code; save(); history.replaceState(null, "", "#lesson=" + code); renderLesson();
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $("lesson-list").addEventListener("click", function (e) {
    var b = e.target.closest(".lesson"); if (!b) return;
    open(b.getAttribute("data-code"), true);
  });
  $("back-l1").addEventListener("click", function () {
    var n = LESSONS.filter(function (l) { return l.ready; }); var after = LESSONS.indexOf(lessonBy(S.lesson));
    var pick = n.filter(function (l) { return LESSONS.indexOf(l) > after; })[0] || n[n.length - 1];
    open(pick.code, true);
  });

  /* ---------- Loading lesson files ---------- */
  var loading = {};
  function loadLesson(code) {
    if (H.lessons[code]) return Promise.resolve(H.lessons[code]);
    if (!loading[code]) loading[code] = new Promise(function (res, rej) {
      var sc = document.createElement("script");
      sc.src = "assets/lessons/" + code + ".js";
      sc.onload = function () { H.lessons[code] ? res(H.lessons[code]) : rej(new Error("Lesson " + code + " did not register")); };
      sc.onerror = function () { rej(new Error("Could not load lesson " + code)); };
      document.head.appendChild(sc);
    });
    return loading[code];
  }

  var LES = null, CUR = null;
  function renderLesson() {
    var cur = lessonBy(S.lesson);
    renderList();
    if (!cur.ready) {
      var t = H.byCode(cur.code);
      $("lesson").hidden = true; $("loading").hidden = true; $("coming").hidden = false;
      $("coming-title").textContent = cur.code + " · " + (t.kind === "prob" ? "Design: " : "") + cur.name;
      $("coming-why").innerHTML = md(t.why);
      $("coming-concepts").innerHTML = t.concepts.map(function (c) { return "<li>" + md(c) + "</li>"; }).join("");
      document.body.setAttribute("data-slide-rendered", cur.code + ":locked");
      return;
    }
    $("coming").hidden = true; $("loading").hidden = false;
    loadLesson(cur.code).then(function (les) {
      if (S.lesson !== cur.code) return;
      LES = les; CUR = cur; $("loading").hidden = true; $("lesson").hidden = false;
      fillLesson();
    }).catch(function (err) { $("loading").textContent = err.message; console.error(err); });
  }

  function fillLesson() {
    var t = H.byCode(CUR.code);
    $("lesson-kicker").textContent = CUR.code + " · " + CUR.group + (t.kind === "prob" ? " · Machine coding" : " · Java");
    $("lesson-title").textContent = (t.kind === "prob" ? "Design: " : "") + CUR.name;
    $("lesson-summary").textContent = LES.summary || t.why;
    var deps = t.deps || [];
    var used = H.usedBy(t.id);
    var depHtml = "";
    if (deps.length) depHtml = "<h3>Builds on these lessons</h3><div class='btnrow'>" + deps.map(function (d) { var dt = H.BY_ID[d]; return "<button type='button' class='btn' data-go='" + H.code(dt) + "'>" + H.code(dt) + " · " + esc(dt.name) + "</button>"; }).join("") + "</div>";
    else if (used.length) depHtml = "<h3>Used in these machine-coding problems</h3><div class='btnrow'>" + used.map(function (p) { return "<button type='button' class='btn' data-go='" + H.code(p) + "'>" + H.code(p) + " · " + esc(p.name) + "</button>"; }).join("") + "</div>";
    if (t.xref && t.xref.length) depHtml += "<h3>Related lessons in the LLD / HLD apps</h3><div class='links'>" + t.xref.map(function (x) { return "<a href='" + esc(x[1]) + "'>" + esc(x[0]) + "<span class='s'>Opens in the combined study site</span></a>"; }).join("") + "</div>";
    $("lesson-deps").innerHTML = depHtml; $("lesson-deps").hidden = !depHtml;

    var toc = [["slides", "Step-by-step slides"]];
    if (LES.widget) toc.push(["widget", LES.widget.heading]);
    toc.push(["examples", LES.examplesHeading || "Real-world examples"], ["pitfalls", "Common interview pitfalls"], ["quiz", "Quiz"]);
    if (LES.cheatsheet) toc.push(["cheatsheet", "Cheat sheet"]);
    toc.push(["practice", "Practice questions"], ["recap", "Recap card"]);
    $("lesson-toc").innerHTML = toc.map(function (x) { return "<li><a href='#" + x[0] + "'>" + esc(x[1]) + "</a></li>"; }).join("");

    renderSlide();
    var w = $("widget");
    if (LES.widget) {
      w.hidden = false; $("widget-title").textContent = LES.widget.heading; $("widget-caption").innerHTML = md(LES.widget.caption || "");
      $("widget-caption").hidden = !LES.widget.caption;
      var body = $("widget-body"); body.innerHTML = "";
      S.widgets[CUR.code] = S.widgets[CUR.code] || {};
      try { LES.widget.render(body, { state: S.widgets[CUR.code], save: save, esc: esc, md: md, H: H }); } catch (err) { console.error(err); body.textContent = "Interactive model failed to load."; }
    } else { w.hidden = true; }
    $("examples-title").textContent = LES.examplesHeading || "Real-world examples";
    $("examples-list").innerHTML = (LES.examples || []).map(exOf).map(function (e) { return "<div class='row'><div><div class='t'>" + md(e.title) + "</div><div class='dt'>" + md(e.detail) + "</div></div></div>"; }).join("");
    $("pitfalls-list").innerHTML = (LES.pitfalls || []).map(function (p) { return "<li>" + md(p) + "</li>"; }).join("");
    renderQuiz();
    renderCheat();
    renderPractice();
    $("recap-list").innerHTML = LES.recap.map(function (r) { return "<li>" + md(r) + "</li>"; }).join("");
    renderComplete();
    var nx = nextReady(CUR.code);
    var upcoming = LESSONS[LESSONS.indexOf(CUR) + 1];
    $("next-lesson").hidden = !(nx || upcoming);
    if (nx) { $("next-lesson").textContent = "Next lesson: " + nx.code + " · " + nx.name + " →"; $("next-lesson").disabled = false; }
    else if (upcoming) { $("next-lesson").textContent = "Up next: " + upcoming.code + " · " + upcoming.name + " (🔒 coming soon)"; $("next-lesson").disabled = false; }
  }
  $("lesson-deps").addEventListener("click", function (e) { var b = e.target.closest("[data-go]"); if (b) open(b.getAttribute("data-go"), true); });
  $("next-lesson").addEventListener("click", function () { var nx = nextReady(CUR.code) || LESSONS[LESSONS.indexOf(CUR) + 1]; if (nx) open(nx.code, true); });

  /* ---------- Slides ---------- */
  function slides() { return LES.slides.map(slideOf); }
  function step() { var n = LES.slides.length; var v = S.steps[CUR.code] || 0; return Math.max(0, Math.min(n - 1, v)); }
  function renderSlide() {
    var all = slides(), i = step(), s = all[i];
    $("slide-title").textContent = "Step " + (i + 1) + " of " + all.length + ": " + s.title;
    $("dots").innerHTML = all.map(function (_, k) { return "<button type='button' data-i='" + k + "' aria-label='Go to step " + (k + 1) + "' class='" + (k < i ? "past" : k === i ? "cur" : "") + "'></button>"; }).join("");
    $("slide-text").innerHTML = md(s.text);
    $("slide-points").innerHTML = s.points.map(function (p) { return "<li>" + md(p) + "</li>"; }).join("");
    $("slide-points").hidden = !s.points.length;
    var an = $("slide-analogy");
    if (s.analogy) { an.hidden = false; an.innerHTML = "<span class='lead'>Analogy</span>" + md(s.analogy); } else { an.hidden = true; an.innerHTML = ""; }
    var cd = $("slide-code");
    if (s.code) { cd.hidden = false; cd.innerHTML = H.codeBlock(s.code, s.lang); } else { cd.hidden = true; cd.innerHTML = ""; }
    var pc = $("slide-proscons");
    if (s.pros) { pc.hidden = false; pc.innerHTML = "<div class='card pro'><h3>" + esc(s.prosTitle || "Pros") + "</h3><ul>" + s.pros.map(function (p) { return "<li>" + md(p) + "</li>"; }).join("") + "</ul></div><div class='card con'><h3>Cons</h3><ul>" + (s.cons || []).map(function (p) { return "<li>" + md(p) + "</li>"; }).join("") + "</ul></div>"; }
    else { pc.hidden = true; pc.innerHTML = ""; }
    var tb = $("slide-table");
    if (s.table) { tb.hidden = false; tb.innerHTML = tableHtml(s.table); }
    else { tb.hidden = true; tb.innerHTML = ""; }
    $("prev").disabled = i === 0;
    var last = i === all.length - 1;
    $("next").disabled = last;
    $("next").textContent = last ? "Finished: try the rest of the lesson below" : "Next";
    var el = $("slide-diagram"), code = CUR.code;
    var src = diagramSource(s);
    var done = function () { document.body.setAttribute("data-slide-rendered", code + ":" + i); };
    if (s.svg) { el.hidden = false; el.innerHTML = typeof s.svg === "function" ? s.svg() : s.svg; done(); }
    else if (src) { el.hidden = false; H.renderDiagram(el, src).then(done); }
    else { el.hidden = true; el.innerHTML = ""; done(); }
  }
  function tableHtml(t) {
    return "<table><thead><tr>" + t[0].map(function (c) { return "<th>" + md(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + t.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + md(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
  }
  function go(k) { S.steps[CUR.code] = Math.max(0, Math.min(LES.slides.length - 1, k)); save(); renderSlide(); }
  $("prev").addEventListener("click", function () { go(step() - 1); });
  $("next").addEventListener("click", function () { go(step() + 1); });
  $("dots").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) go(Number(b.getAttribute("data-i"))); });
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea" || $("lesson").hidden || !LES) return;
    if (e.key === "ArrowRight") go(step() + 1);
    if (e.key === "ArrowLeft") go(step() - 1);
  });

  /* ---------- Quiz ---------- */
  function L(j) { return String.fromCharCode(65 + j); }
  function picks() { S.picked[CUR.code] = S.picked[CUR.code] || {}; return S.picked[CUR.code]; }
  function renderQuiz() {
    var Q = LES.quiz.map(quizOf), P = picks();
    var answered = Object.keys(P).length;
    var score = Q.filter(function (q, i) { return P[i] === q.answer; }).length;
    $("quiz-title").textContent = "Quiz · " + score + " of " + Q.length + " correct" + (answered < Q.length ? " (" + answered + " answered)" : "");
    $("quiz-list").innerHTML = Q.map(function (q, i) {
      var p = P[i], done = p !== undefined;
      var opts = q.options.map(function (o, j) {
        var cls = done ? (j === q.answer ? " correct" : j === p ? " wrong" : "") : "";
        return "<button type='button' class='btn" + cls + "' data-q='" + i + "' data-o='" + j + "'" + (done ? " disabled" : "") + ">" + L(j) + ". " + md(o) + "</button>";
      }).join("");
      var fb = done ? "<div><span class='pill " + (p === q.answer ? "success'>Correct" : "danger'>Not quite: the answer is " + L(q.answer)) + "</span></div><p>" + md(q.why) + "</p>" : "";
      return "<div class='quizq'><h3>Q" + (i + 1) + ". " + md(q.q) + "</h3>" + (q.code ? H.codeBlock(q.code) : "") + "<div class='qopts'>" + opts + "</div>" + fb + "</div>";
    }).join("");
  }
  $("quiz-list").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-q]"); if (!b || b.disabled) return;
    var P = picks(), i = b.getAttribute("data-q");
    if (P[i] !== undefined) return;
    P[i] = Number(b.getAttribute("data-o")); save(); renderQuiz();
  });
  $("reset-quiz").addEventListener("click", function () { S.picked[CUR.code] = {}; save(); renderQuiz(); });

  /* ---------- Cheat sheet ---------- */
  function renderCheat() {
    var c = LES.cheatsheet;
    $("cheatsheet").hidden = !c;
    if (!c) return;
    $("cheat-table").hidden = !c.table; $("cheat-table").innerHTML = c.table ? tableHtml(c.table) : "";
    $("cheat-cards").innerHTML = (c.cards || []).map(function (k) {
      return "<div class='card'><h3>" + md(k.title) + "</h3><ul>" + k.items.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul></div>";
    }).join("");
  }

  /* ---------- Practice questions (collapsible model answers) ---------- */
  function openState() { S.open[CUR.code] = S.open[CUR.code] || {}; return S.open[CUR.code]; }
  function renderPractice() {
    var O = openState();
    $("practice-list").innerHTML = (LES.practice || []).map(function (p, i) {
      var body = "<div class='ma'>Model answer</div>";
      if (p.steps) body += "<ol class='steps'>" + p.steps.map(function (s) { return "<li><div class='t'>" + md(s[0]) + "</div><div class='dt'>" + md(s[1]) + "</div></li>"; }).join("") + "</ol>";
      if (p.a) body += (Array.isArray(p.a) ? "<ul>" + p.a.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul>" : "<p>" + md(p.a) + "</p>");
      if (p.code) body += H.codeBlock(p.code, p.lang);
      if (p.m) body += "<div class='diagram' data-pm='" + i + "'></div>";
      if (p.follow) body += "<div class='callout'><span class='lead'>Follow-up the interviewer may ask</span>" + md(p.follow) + "</div>";
      return "<details class='pq' data-i='" + i + "'" + (O[i] ? " open" : "") + "><summary><span>Q" + (i + 1) + ". " + md(p.q) + "</span>" + (p.level ? "<span class='pill lvl " + (p.level === "Hard" ? "danger" : p.level === "Medium" ? "warning" : "success") + "'>" + esc(p.level) + "</span>" : "") + "</summary><div class='body'>" + (p.qcode ? H.codeBlock(p.qcode) : "") + body + "</div></details>";
    }).join("");
    Array.prototype.forEach.call(document.querySelectorAll("#practice-list details.pq"), function (d) {
      d.addEventListener("toggle", function () {
        var i = d.getAttribute("data-i"); O[i] = d.open; save();
        if (d.open) drawPracticeDiagram(d, Number(i));
      });
      if (d.open) drawPracticeDiagram(d, Number(d.getAttribute("data-i")));
    });
  }
  function drawPracticeDiagram(d, i) {
    var el = d.querySelector("[data-pm]"); if (!el || el.dataset.drawn) return;
    el.dataset.drawn = "1"; H.renderDiagram(el, LES.practice[i].m);
  }
  function setAll(on) {
    var O = openState();
    Array.prototype.forEach.call(document.querySelectorAll("#practice-list details.pq"), function (d) { d.open = on; O[d.getAttribute("data-i")] = on; });
    save();
  }
  $("open-all").addEventListener("click", function () { setAll(true); });
  $("close-all").addEventListener("click", function () { setAll(false); });

  /* ---------- Completion ---------- */
  function renderComplete() { var d = H.isDone(CUR.id); $("complete").textContent = d ? "Lesson complete ✓ (click to undo)" : "Mark this lesson complete"; $("complete").className = "btn" + (d ? "" : " primary"); }
  $("complete").addEventListener("click", function () { H.setDone(CUR.id, !H.isDone(CUR.id)); renderComplete(); renderList(); });
  window.addEventListener("storage", function () { if (CUR) renderComplete(); renderList(); });

  renderLesson();
})();
