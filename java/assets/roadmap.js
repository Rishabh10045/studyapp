/* Java Study Roadmap hub: modules, progress, explorer, priorities, study plan and reference diagrams. */
(function () {
  "use strict";
  var H = window.JAVA, $ = function (id) { return document.getElementById(id); };
  var TOPICS = H.TOPICS, PHASES = H.PHASES, esc = H.esc, md = H.md, code = H.code;
  var FKEY = "java.roadmap.filters.v1";
  var DEF = { track: "all", group: "all", q: "", hideDone: false };
  var st = Object.assign({}, DEF, H.load(FKEY, {}));
  function byCode(c) { return H.byCode(c); }
  function trackOf(t) { return t.kind === "spring" ? "Spring Boot track" : "Java track"; }

  $("hub-summary").textContent = "Deepak's hub for Java interviews and everyday Java work (Java 17/21): " + H.JAVA_T.length + " Java lessons and " + H.SPRING_T.length +
    " Spring Boot lessons in " + PHASES.length + " modules, including a " + TOPICS.filter(function (t) { return t.group === "Multithreading deep dive"; }).length + "-lesson multithreading deep dive and a Spring AI module. Code runs on Java 21.";

  function bar(label, value, max, display, cls) {
    var pct = max ? Math.round(value / max * 100) : 0;
    return "<div class='bar'><span>" + esc(label) + "</span><span class='track'><span class='fill " + (cls || "") + "' style='width:" + pct + "%'></span></span><span class='val'>" + esc(display) + "</span></div>";
  }
  function lessonPill(t) { return H.isReady(code(t)) ? "<span class='pill accent'>Lesson ready</span>" : "<span class='pill'>🔒 Coming soon</span>"; }
  function lessonLink(t, label) { var c = code(t); return H.isReady(c) ? "<a href='index.html#lesson=" + c + "'>" + label + "</a>" : label; }

  function renderModules() {
    $("module-cards").innerHTML = PHASES.map(function (g, gi) {
      var items = TOPICS.filter(function (t) { return t.group === g; });
      return "<div class='card'><h3>Module " + (gi + 1) + " · " + esc(g) + "</h3><p class='caption' style='margin:0 0 6px'>" + trackOf(items[0]) + "</p><ul style='list-style:none;padding:0'>" + items.map(function (t) {
        var c = code(t), ready = H.isReady(c), done = H.isDone(t.id);
        var label = "<span style='font-family:var(--mono);font-size:12px;color:var(--text-3)'>" + c + "</span> " + esc(t.name);
        var tag = done ? " <span class='pill success'>Done</span>" : ready ? "" : " <span title='Coming soon' style='color:var(--text-3)'>🔒</span>";
        return "<li>" + (ready ? "<a href='index.html#lesson=" + c + "'>" + label + "</a>" : "<span style='color:var(--text-2)'>" + label + "</span>") + tag + "</li>";
      }).join("") + "</ul></div>";
    }).join("");
  }

  function renderProgress() {
    var done = H.getDone();
    var jd = H.JAVA_T.filter(function (t) { return done.indexOf(t.id) >= 0; }).length, sd = H.SPRING_T.filter(function (t) { return done.indexOf(t.id) >= 0; }).length;
    var ready = TOPICS.filter(function (t) { return H.isReady(code(t)); }).length;
    $("progress-lead").textContent = jd + sd === 0 ? "Nothing marked done yet; the first stop is J01, Java basics & the JVM." : "Overall progress across all " + TOPICS.length + " lessons.";
    $("metrics").innerHTML = [[jd + " / " + H.JAVA_T.length, "Java lessons done"], [sd + " / " + H.SPRING_T.length, "Spring lessons done"], [Math.round((jd + sd) / TOPICS.length * 100) + "%", "Overall"], [ready + " / " + TOPICS.length, "Lessons published"]]
      .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    $("progress-bars").innerHTML = PHASES.map(function (g) {
      var all = TOPICS.filter(function (t) { return t.group === g; }), d = all.filter(function (t) { return done.indexOf(t.id) >= 0; }).length, p = Math.round(d / all.length * 100);
      return "<div class='bar'><span>" + esc(g) + "</span><span class='track'><span class='fill' style='width:" + p + "%'></span><span class='fill rest' style='width:" + (100 - p) + "%'></span></span><span class='val'>" + d + " / " + all.length + "</span></div>";
    }).join("");
  }

  function renderControls() {
    var opts = [["all", "All", TOPICS.length], ["java", "Java track", H.JAVA_T.length], ["spring", "Spring Boot track", H.SPRING_T.length]];
    $("track").innerHTML = opts.map(function (o) { return "<button type='button' data-v='" + o[0] + "' class='" + (st.track === o[0] ? "on" : "") + "'>" + o[1] + "<span class='count'>" + o[2] + "</span></button>"; }).join("");
    var groups = PHASES.filter(function (g) { return st.track === "all" || TOPICS.some(function (t) { return t.group === g && t.kind === st.track; }); });
    if (st.group !== "all" && groups.indexOf(st.group) < 0) st.group = "all";
    $("group").innerHTML = "<option value='all'>All modules</option>" + groups.map(function (g) { return "<option value='" + esc(g) + "'" + (st.group === g ? " selected" : "") + ">" + esc(g) + "</option>"; }).join("");
    $("q").value = st.q; $("hide-done").checked = st.hideDone;
  }
  function filtered() {
    var q = st.q.trim().toLowerCase();
    return TOPICS.filter(function (t) {
      if (st.track !== "all" && t.kind !== st.track) return false;
      if (st.group !== "all" && t.group !== st.group) return false;
      if (st.hideDone && H.isDone(t.id)) return false;
      return !q || [t.name, t.why, t.group, code(t)].concat(t.concepts).join(" ").toLowerCase().indexOf(q) >= 0;
    });
  }
  function statusPill(t) { return H.isDone(t.id) ? "<span class='pill success'>Done</span>" : "<span class='pill'>Not started</span>"; }
  function xrefHtml(t) {
    if (!t.xref.length) return "<span style='color:var(--text-3)'>None</span>";
    return t.xref.map(function (x) { return "<a href='" + esc(x[1]) + "'>" + esc(x[0]) + "</a>"; }).join(" · ");
  }
  function renderExplorer() {
    var list = filtered();
    var openIds = Array.prototype.map.call(document.querySelectorAll("details.topic[open]"), function (d) { return d.getAttribute("data-id"); });
    $("table-wrap").hidden = !list.length; $("nomatch").hidden = !!list.length;
    if (!list.length) $("nomatch").textContent = "No topic matches \"" + st.q + "\" with these filters; press Reset to clear them.";
    else $("table-wrap").innerHTML = "<table><thead><tr><th>Done</th><th>#</th><th>Topic</th><th>Module</th><th>Lesson</th><th>Status</th></tr></thead><tbody>" + list.map(function (t) {
      return "<tr><td><input type='checkbox' class='mark' data-id='" + t.id + "'" + (H.isDone(t.id) ? " checked" : "") + " aria-label='Mark " + esc(t.name) + " done'></td><td class='mono'>" + code(t) + "</td><td>" + lessonLink(t, esc(t.name)) + "</td><td>" + esc(t.group) + "</td><td>" + lessonPill(t) + "</td><td>" + statusPill(t) + "</td></tr>";
    }).join("") + "</tbody></table>";
    $("details").innerHTML = list.map(function (t) {
      var lesson = H.isReady(code(t)) ? "<a href='index.html#lesson=" + code(t) + "'>Open lesson " + code(t) + " in the Teaching App →</a>" : "<span style='color:var(--text-3)'>🔒 Lesson coming soon</span>";
      return "<details class='topic' data-id='" + t.id + "'" + (openIds.indexOf(t.id) >= 0 ? " open" : "") + "><summary><span class='mono' style='font-family:var(--mono);color:var(--text-3);font-weight:400'>" + code(t) + "</span>" + esc(t.name) + " " + statusPill(t) + " " + lessonPill(t) + "</summary><div class='body'>" +
        "<p>" + md(t.why) + "</p><ul>" + t.concepts.map(function (c) { return "<li>" + md(c) + "</li>"; }).join("") + "</ul>" +
        "<div class='props'><span class='k'>Module</span><span>" + esc(t.group) + " (" + trackOf(t) + ")</span><span class='k'>Related lessons</span><span>" + xrefHtml(t) + "</span><span class='k'>Status</span><span><label class='toggle' style='padding:0'><input type='checkbox' class='mark' data-id='" + t.id + "'" + (H.isDone(t.id) ? " checked" : "") + "> Mark done</label></span></div>" +
        "<p>" + lesson + "</p></div></details>";
    }).join("");
  }
  function persist() { H.save(FKEY, st); }
  function rerender() { persist(); renderControls(); renderExplorer(); }
  $("track").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; st.track = b.getAttribute("data-v"); st.group = "all"; rerender(); });
  $("group").addEventListener("change", function (e) { st.group = e.target.value; persist(); renderExplorer(); });
  $("q").addEventListener("input", function (e) { st.q = e.target.value; persist(); renderExplorer(); });
  $("hide-done").addEventListener("change", function (e) { st.hideDone = e.target.checked; persist(); renderExplorer(); });
  $("reset").addEventListener("click", function () { st = Object.assign({}, DEF); rerender(); });
  document.addEventListener("change", function (e) {
    if (!e.target.classList || !e.target.classList.contains("mark")) return;
    H.setDone(e.target.getAttribute("data-id"), e.target.checked); renderProgress(); renderExplorer(); renderModules();
  });
  $("reset-progress").addEventListener("click", function () {
    if (window.confirm("Clear all saved Java progress in this browser?")) { H.getDone().forEach(function (id) { H.setDone(id, false); }); renderProgress(); renderExplorer(); renderModules(); }
  });
  window.addEventListener("storage", function () { renderProgress(); renderExplorer(); renderModules(); });

  function table(rows) {
    return "<table><thead><tr>" + rows[0].map(function (c) { return "<th>" + md(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
  }
  function L(c) { var t = byCode(c); return t ? lessonLink(t, c) : c; }
  var PRI = [
    ["Topic", "Typical question", "Lessons", "Priority"],
    ["HashMap internals", "How does `get`/`put` work? What changed in Java 8?", "J08, J04", "Very high"],
    ["String & memory", "Why is String immutable? `==` vs `equals`? String pool?", "J02", "Very high"],
    ["equals/hashCode", "What breaks if you override only one?", "J04", "Very high"],
    ["Concurrency basics", "`synchronized` vs `volatile`; thread-safe counter; deadlock", "J15–J17, J26", "Very high"],
    ["Streams", "Group and count; `map` vs `flatMap`; parallel streams", "J10, J11", "High"],
    ["Collections choice", "ArrayList vs LinkedList; fail-fast iterators; ConcurrentHashMap", "J07, J09", "High"],
    ["Exceptions", "Checked vs unchecked; try-with-resources; custom exceptions", "J05", "High"],
    ["JVM & GC", "Memory areas; how GC works; OOM investigation", "J29–J31", "High (senior)"],
    ["Modern Java", "Records, sealed types, pattern matching, virtual threads", "J13, J14, J25", "Medium–high"],
    ["Spring core", "Bean scopes, DI types, `@Transactional` pitfalls", "S01, S07", "Very high (Spring roles)"],
    ["JPA", "N+1 problem; lazy loading; transactions and isolation", "S06, S07", "High (Spring roles)"]
  ].map(function (r, i) { return i === 0 ? r : [md(r[0]), md(r[1]), r[2].split(/, /).map(function (x) { return x.indexOf("–") > 0 ? x : L(x); }).join(", "), esc(r[3])]; });
  $("priority-table").innerHTML = table(PRI);
  var PLAN = [
    ["Weeks", "Focus", "Lessons", "Milestone"],
    ["1", "Foundations", "J01–J05", "Explain JVM/JDK/JRE, memory and String questions cold"],
    ["2", "Generics & collections", "J06–J09", "Implement an LRU cache; explain HashMap end to end"],
    ["3", "Functional & modern Java", "J10–J14", "Solve 10 stream exercises; refactor a class to records/sealed"],
    ["4–5", "Multithreading deep dive", "J15–J27", "Write producer–consumer, odd-even and a bounded queue from memory"],
    ["6", "JVM, GC & platform APIs", "J28–J34", "Read a GC log; walk through an OOM investigation"],
    ["7", "Working Java", "J35–J36", "Unit-test a service with JUnit 5 + Mockito"],
    ["8–9", "Spring core, web & data", "S01–S07", "Build a REST + JPA service with validation and transactions"],
    ["10", "Security, testing & ops", "S08–S12", "Add JWT auth, Testcontainers tests and Actuator metrics"],
    ["11", "Distributed Spring", "S13–S16", "Kafka events + resilience4j + Docker image"],
    ["12", "Spring AI", "S17–S24", "A RAG + tool-calling assistant with evaluation tests"]
  ].map(function (r, i) { return i === 0 ? r : [esc(r[0]), esc(r[1]), esc(r[2]), esc(r[3])]; });
  $("plan-table").innerHTML = table(PLAN);
  var VER = [
    ["Version", "Released", "Why it matters"],
    ["Java 8 (LTS)", "2014", "Lambdas, streams, `Optional`, `java.time`; still common in legacy code"],
    ["Java 11 (LTS)", "2018", "`var` in lambdas, `HttpClient`, single-file launch, String helpers"],
    ["Java 17 (LTS)", "2021", "Records, sealed classes, text blocks, switch expressions, pattern matching for `instanceof`"],
    ["Java 21 (LTS)", "2023", "Virtual threads, pattern matching for `switch`, record patterns, sequenced collections"],
    ["Java 25 (LTS)", "2025", "Latest LTS; this course targets 17/21 features, which all carry forward"]
  ].map(function (r, i) { return i === 0 ? r : [esc(r[0]), esc(r[1]), md(r[2])]; });
  $("versions-table").innerHTML = table(VER);

  /* ---------- Diagrams ---------- */
  var nodes = PHASES.map(function (p, i) {
    var n = TOPICS.filter(function (t) { return t.group === p; });
    return { id: "m" + i, label: "Module " + (i + 1) + ": " + p, detail: n.length + " lessons · " + code(n[0]) + "–" + code(n[n.length - 1]), series: i < 7 ? 0 : 1 };
  });
  var edges = [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [3, 6], [0, 7], [6, 7], [7, 8], [8, 9], [9, 10], [3, 10], [8, 11]].map(function (e) { return { from: "m" + e[0], to: "m" + e[1] }; });
  var jvmSrc = [
    "flowchart LR",
    "  A[\"Hello.java\"]:::s0 -->|javac| B[\"Hello.class<br/><span class='d'>bytecode</span>\"]:::s0",
    "  B --> C[\"Class loaders<br/><span class='d'>bootstrap · platform · app</span>\"]:::s1",
    "  subgraph R[\"Runtime data areas\"]",
    "    H1[\"Heap<br/><span class='d'>objects · young + old gen</span>\"]",
    "    H2[\"Metaspace<br/><span class='d'>class metadata</span>\"]",
    "    H3[\"Thread stacks<br/><span class='d'>frames · locals</span>\"]",
    "  end",
    "  C --> R",
    "  R --> E[\"Execution engine<br/><span class='d'>interpreter + JIT (C1/C2)</span>\"]:::s2",
    "  E --> G[\"Garbage collector<br/><span class='d'>G1 default · ZGC</span>\"]:::s2",
    "  G -.-> H1",
    "  classDef s0 stroke:#3b82f6,stroke-width:2px;",
    "  classDef s1 stroke:#eab308,stroke-width:2px;",
    "  classDef s2 stroke:#06b6d4,stroke-width:2px;"].join("\n");

  renderControls(); renderExplorer(); renderProgress(); renderModules();
  H.renderDiagram($("dg-roadmap"), H.flow(nodes, edges, "LR"))
    .then(function () { return H.renderDiagram($("dg-jvm"), jvmSrc); })
    .then(function () { document.body.setAttribute("data-diagrams", "done"); });
})();
