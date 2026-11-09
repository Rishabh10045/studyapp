(function () {
  "use strict";
  var H = window.HLD, $ = function (id) { return document.getElementById(id); };
  var TOPICS = H.TOPICS, FUNDS = H.FUNDS, PROBS = H.PROBS, PHASES = H.PHASES, LEVELS = H.LEVELS, GROUPS = H.GROUPS;
  var esc = H.esc, md = H.md, code = H.code;

  var st = H.load("hld.roadmap.filters.v1", { track: "all", group: "all", q: "", hideDone: false });

  function groupLabel(g) { return LEVELS.indexOf(g) >= 0 ? g + " problems" : g; }
  function linkText(t) {
    return t.kind === "prob" ? (t.deps || []).map(function (d) { return H.BY_ID[d].name.split(":")[0]; }).join(", ") : H.usedBy(t.id).length + " problems";
  }
  function bar(label, value, max, display, cls) {
    var pct = max ? Math.round(value / max * 100) : 0;
    return "<div class='bar'><span>" + esc(label) + "</span><span class='track'><span class='fill " + (cls || "") + "' style='width:" + pct + "%'></span></span><span class='val'>" + esc(display) + "</span></div>";
  }

  /* ---------- Progress ---------- */
  function renderProgress() {
    var done = H.getDone();
    var fd = FUNDS.filter(function (t) { return done.indexOf(t.id) >= 0; }).length;
    var pd = PROBS.filter(function (t) { return done.indexOf(t.id) >= 0; }).length;
    var pct = Math.round((fd + pd) / TOPICS.length * 100);
    $("progress-lead").textContent = fd + pd === 0 ? "Nothing marked done yet; the first stop is Phase 1, Foundations." : "Overall progress across all " + TOPICS.length + " topics.";
    $("metrics").innerHTML = [[fd + " / " + FUNDS.length, "Fundamentals done"], [pd + " / " + PROBS.length, "Design problems done"], [pct + "%", "Overall"]]
      .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    $("progress-bars").innerHTML = GROUPS.map(function (g) {
      var all = TOPICS.filter(function (t) { return t.group === g; });
      var d = all.filter(function (t) { return done.indexOf(t.id) >= 0; }).length;
      var p = Math.round(d / all.length * 100);
      return "<div class='bar'><span>" + esc(groupLabel(g)) + "</span><span class='track'><span class='fill' style='width:" + p + "%'></span><span class='fill rest' style='width:" + (100 - p) + "%'></span></span><span class='val'>" + d + " / " + all.length + "</span></div>";
    }).join("");
  }

  /* ---------- Explorer ---------- */
  function renderControls() {
    var opts = [["all", "All", TOPICS.length], ["fund", "Fundamentals", FUNDS.length], ["prob", "Design problems", PROBS.length]];
    $("track").innerHTML = opts.map(function (o) {
      return "<button type='button' data-v='" + o[0] + "' class='" + (st.track === o[0] ? "on" : "") + "'>" + o[1] + "<span class='count'>" + o[2] + "</span></button>";
    }).join("");
    var groups = GROUPS.filter(function (g) { return st.track === "all" || (st.track === "prob") === (LEVELS.indexOf(g) >= 0); });
    $("group").innerHTML = "<option value='all'>All phases & levels</option>" + groups.map(function (g) {
      return "<option value='" + esc(g) + "'" + (st.group === g ? " selected" : "") + ">" + esc(groupLabel(g)) + "</option>";
    }).join("");
    $("q").value = st.q;
    $("hide-done").checked = st.hideDone;
  }
  function filtered() {
    var q = st.q.trim().toLowerCase();
    return TOPICS.filter(function (t) {
      if (st.track !== "all" && t.kind !== st.track) return false;
      if (st.group !== "all" && t.group !== st.group) return false;
      if (st.hideDone && H.isDone(t.id)) return false;
      if (!q) return true;
      var hay = [t.name, t.why, t.group].concat(t.concepts, (t.deps || []).map(function (d) { return H.BY_ID[d].name; })).join(" ").toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function statusPill(t) { return H.isDone(t.id) ? "<span class='pill success'>Done</span>" : "<span class='pill'>Not started</span>"; }
  function renderExplorer() {
    var list = filtered();
    var openIds = Array.prototype.map.call(document.querySelectorAll("details.topic[open]"), function (d) { return d.getAttribute("data-id"); });
    if (!list.length) {
      $("table-wrap").hidden = true; $("nomatch").hidden = false;
      $("nomatch").textContent = "No topic matches \"" + st.q + "\" with these filters; press Reset to clear them.";
    } else {
      $("table-wrap").hidden = false; $("nomatch").hidden = true;
      $("table-wrap").innerHTML = "<table><thead><tr><th>Done</th><th>#</th><th>Topic</th><th>Phase / level</th><th>Builds on / used by</th><th>Status</th></tr></thead><tbody>" +
        list.map(function (t) {
          return "<tr><td><input type='checkbox' class='mark' data-id='" + t.id + "'" + (H.isDone(t.id) ? " checked" : "") + " aria-label='Mark " + esc(t.name) + " done'></td><td class='mono'>" + code(t) + "</td><td>" + esc(t.name) + "</td><td>" + esc(t.group) + "</td><td>" + esc(linkText(t)) + "</td><td>" + statusPill(t) + "</td></tr>";
        }).join("") + "</tbody></table>";
    }
    $("details").innerHTML = list.map(function (t) {
      var link = t.kind === "prob"
        ? ["Builds on", (t.deps || []).map(function (d) { return code(H.BY_ID[d]) + " " + H.BY_ID[d].name; }).join(" · ")]
        : ["Used by", H.usedBy(t.id).length ? H.usedBy(t.id).map(function (p) { return p.name; }).join(" · ") : "General knowledge; not a core dependency of the listed problems"];
      var lesson = t.id === "scale" ? "<a href='index.html#lesson=F01'>Open Lesson 1 in the Teaching App →</a>" : "";
      return "<details class='topic' data-id='" + t.id + "'" + (openIds.indexOf(t.id) >= 0 ? " open" : "") + "><summary><span class='mono' style='font-family:var(--mono);color:var(--text-3);font-weight:400'>" + code(t) + "</span>" + esc(t.name) + " " + statusPill(t) + "</summary><div class='body'>" +
        "<p>" + md(t.why) + "</p><ul>" + t.concepts.map(function (c) { return "<li>" + md(c) + "</li>"; }).join("") + "</ul>" +
        "<div class='props'><span class='k'>" + (t.kind === "fund" ? "Phase" : "Difficulty") + "</span><span>" + esc(t.group) + "</span><span class='k'>" + link[0] + "</span><span>" + esc(link[1]) + "</span><span class='k'>Status</span><span><label class='toggle' style='padding:0'><input type='checkbox' class='mark' data-id='" + t.id + "'" + (H.isDone(t.id) ? " checked" : "") + "> Mark done</label></span></div>" +
        (lesson ? "<p>" + lesson + "</p>" : "") + "</div></details>";
    }).join("");
  }
  function persist() { H.save("hld.roadmap.filters.v1", st); }
  function rerender() { persist(); renderControls(); renderExplorer(); }

  $("track").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    st.track = b.getAttribute("data-v"); st.group = "all"; rerender();
  });
  $("group").addEventListener("change", function (e) { st.group = e.target.value; persist(); renderExplorer(); });
  $("q").addEventListener("input", function (e) { st.q = e.target.value; persist(); renderExplorer(); });
  $("hide-done").addEventListener("change", function (e) { st.hideDone = e.target.checked; persist(); renderExplorer(); });
  $("reset").addEventListener("click", function () { st = { track: "all", group: "all", q: "", hideDone: false }; rerender(); });
  document.addEventListener("change", function (e) {
    if (!e.target.classList || !e.target.classList.contains("mark")) return;
    H.setDone(e.target.getAttribute("data-id"), e.target.checked);
    renderProgress(); renderExplorer();
  });
  $("reset-progress").addEventListener("click", function () {
    if (window.confirm("Clear all saved progress in this browser?")) { H.getDone().forEach(function (id) { H.setDone(id, false); }); renderProgress(); renderExplorer(); }
  });
  window.addEventListener("storage", function () { renderProgress(); renderExplorer(); });

  /* ---------- Static charts ---------- */
  var reuse = FUNDS.map(function (f) { return { f: f, n: H.usedBy(f.id).length }; }).filter(function (x) { return x.n > 0; })
    .sort(function (a, b) { return b.n - a.n; }).slice(0, 10);
  $("reuse-bars").innerHTML = reuse.map(function (x, i) { return bar(x.f.name, x.n, reuse[0].n, x.n + " problems", i === 0 ? "" : "muted"); }).join("");

  var FW = [
    ["Requirements", "3–5 core functional features; non-functional: scale, latency, availability, consistency. Agree on scope."],
    ["Estimation", "Users → average and peak QPS, storage per year, bandwidth, read:write ratio."],
    ["API", "Core endpoints or RPCs with request and response; pagination, auth, idempotency."],
    ["Data model", "Entities and access patterns → SQL or NoSQL, keys, indexes, partition key."],
    ["High-level design", "Boxes and arrows for the main flows: client, LB, services, cache, DB, queue, storage."],
    ["Deep dives", "The 2–3 hardest parts: hot path scaling, consistency, sharding, failure handling."],
    ["Bottlenecks & trade-offs", "Single points of failure, hot keys, monitoring, what breaks at 10x; state trade-offs out loud."]
  ];
  $("fw-steps").innerHTML = FW.map(function (s) { return "<li><div class='t'>" + esc(s[0]) + "</div><div class='dt'>" + esc(s[1]) + "</div></li>"; }).join("");
  var split = [["Requirements", 5], ["Estimation", 5], ["API", 5], ["Data model", 5], ["High-level design", 10], ["Deep dives", 10], ["Bottlenecks", 5]];
  $("fw-bars").innerHTML = split.map(function (s) { return bar(s[0], s[1], 10, s[1] + " min", "muted"); }).join("");

  /* Hash ring */
  (function () {
    var cx = 300, cy = 165, r = 110;
    function pt(deg, rad) { return { x: cx + rad * Math.sin(deg * Math.PI / 180), y: cy - rad * Math.cos(deg * Math.PI / 180) }; }
    var s = "<svg class='ring' width='100%' viewBox='0 0 600 330' role='img' aria-label='Consistent hashing ring'>";
    s += "<circle cx='" + cx + "' cy='" + cy + "' r='" + r + "' fill='none' style='stroke:var(--border-strong)' stroke-width='1.5'/>";
    [["Node A", 20], ["Node B", 140], ["Node C", 250]].forEach(function (n) {
      var p = pt(n[1], r), q = pt(n[1], r + 30);
      s += "<circle cx='" + p.x + "' cy='" + p.y + "' r='10' style='fill:var(--c0)'/><text x='" + q.x + "' y='" + (q.y + 4) + "' text-anchor='middle' style='fill:var(--text)'>" + n[0] + "</text>";
    });
    [["k1 → B", 65], ["k4 → B", 105], ["k2 → C", 190], ["k3 → A", 315]].forEach(function (k) {
      var p = pt(k[1], r), q = pt(k[1], r - 32);
      s += "<circle cx='" + p.x + "' cy='" + p.y + "' r='5' style='fill:var(--c1)'/><text x='" + q.x + "' y='" + (q.y + 4) + "' text-anchor='middle' style='fill:var(--text-2)'>" + k[0] + "</text>";
    });
    s += "<text x='" + cx + "' y='" + (cy + 4) + "' text-anchor='middle' style='fill:var(--text-3)'>clockwise →</text></svg>";
    $("ring-svg").innerHTML = s;
  })();

  /* ---------- Diagrams ---------- */
  var rmNodes = PHASES.map(function (p, i) { return { id: "ph" + i, label: "Phase " + (i + 1) + ": " + p, detail: FUNDS.filter(function (t) { return t.group === p; }).length + " topics", series: 0 }; })
    .concat([{ id: "fw", label: "Interview framework", detail: "7 steps, practise on every problem", series: 1 }])
    .concat(LEVELS.map(function (l, i) { return { id: "lv" + i, label: l + " problems", detail: PROBS.filter(function (t) { return t.group === l; }).length + " designs", series: 2 }; }));
  var rmEdges = [["ph0", "ph1"], ["ph1", "ph2"], ["ph1", "ph3"], ["ph2", "ph5"], ["ph3", "ph5"], ["ph3", "ph4"], ["ph0", "fw"], ["fw", "lv0"], ["ph2", "lv0"], ["lv0", "lv1"], ["ph4", "lv1"], ["lv1", "lv2"], ["ph5", "lv2"]]
    .map(function (e) { return { from: e[0], to: e[1] }; });

  var fwNodes = ["1. Requirements", "2. Estimation", "3. API", "4. Data model", "5. High-level design", "6. Deep dives", "7. Bottlenecks & trade-offs"].map(function (l, i) { return { id: "s" + (i + 1), label: l }; });
  var fwEdges = [1, 2, 3, 4, 5, 6].map(function (i) { return { from: "s" + i, to: "s" + (i + 1) }; }).concat([{ from: "s7", to: "s5", label: "revise", dashed: true }]);

  var archNodes = [
    { id: "client", label: "Client", detail: "Web or mobile app", kind: "terminal" },
    { id: "dns", label: "DNS", detail: "Resolves domain to CDN / LB" },
    { id: "cdn", label: "CDN", detail: "Static assets and media at the edge" },
    { id: "lb", label: "Load balancer", detail: "L7 routing, health checks, TLS" },
    { id: "app", label: "App servers", detail: "Stateless, autoscaled", series: 0 },
    { id: "cache", label: "Cache", detail: "Redis / Memcached", series: 1 },
    { id: "dbp", label: "DB primary", detail: "Handles writes", series: 2 },
    { id: "dbr", label: "DB read replicas", detail: "Serve reads", series: 2 },
    { id: "mq", label: "Message queue", detail: "Kafka / SQS" },
    { id: "wk", label: "Workers", detail: "Async jobs: email, resize, fan-out" },
    { id: "obj", label: "Object storage", detail: "Media and files (S3-style)" }
  ];
  var archEdges = [
    { from: "client", to: "dns", label: "lookup" }, { from: "client", to: "cdn", label: "static" }, { from: "client", to: "lb", label: "API" },
    { from: "cdn", to: "obj", label: "origin fetch", dashed: true }, { from: "lb", to: "app" }, { from: "app", to: "cache", label: "read first" },
    { from: "app", to: "dbp", label: "writes" }, { from: "app", to: "dbr", label: "reads" }, { from: "dbp", to: "dbr", label: "replication", dashed: true },
    { from: "app", to: "mq", label: "publish" }, { from: "mq", to: "wk", label: "consume" }, { from: "wk", to: "obj" }, { from: "wk", to: "dbp" }
  ];
  var seqSrc = [
    "sequenceDiagram",
    "  participant C as Client", "  participant A as App server", "  participant K as Cache", "  participant D as Database",
    "  C->>A: GET /users/42", "  A->>K: get user:42", "  K-->>A: miss", "  A->>D: SELECT user 42", "  D-->>A: row",
    "  A->>K: set user:42 with TTL", "  A-->>C: 200 OK",
    "  Note over K: Later reads hit the cache until the TTL expires or a write deletes the key."
  ].join("\n");

  renderControls(); renderExplorer(); renderProgress();

  function drawAll() {
    H.renderDiagram($("dg-roadmap"), H.flow(rmNodes, rmEdges, "LR"))
      .then(function () { return H.renderDiagram($("dg-framework"), H.flow(fwNodes, fwEdges, "LR")); })
      .then(function () { return H.renderDiagram($("dg-arch"), H.flow(archNodes, archEdges, "LR")); })
      .then(function () { return H.renderDiagram($("dg-seq"), seqSrc); })
      .then(function () { document.body.setAttribute("data-diagrams", "done"); });
  }
  drawAll();
})();
