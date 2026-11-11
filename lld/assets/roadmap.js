(function () {
  "use strict";
  var H = window.LLD, $ = function (id) { return document.getElementById(id); };
  var TOPICS = H.TOPICS, FUNDS = H.FUNDS, PROBS = H.PROBS, PHASES = H.PHASES, LEVELS = H.LEVELS, GROUPS = H.GROUPS;
  var esc = H.esc, md = H.md, code = H.code;

  var FKEY = "lld.roadmap.filters.v1";
  var st = H.load(FKEY, { track: "all", group: "all", q: "", hideDone: false });

  $("hub-summary").textContent = "Deepak's hub for low-level design and machine-coding rounds: " + FUNDS.length + " lessons in " + PHASES.length + " modules (OOP, SOLID, UML, 22 design patterns, concurrency and the machine-coding playbook), plus " + PROBS.length + " classic machine-coding problems by difficulty. Code is in Java.";

  function groupLabel(g) { return LEVELS.indexOf(g) >= 0 ? g + " problems" : g; }
  function linkText(t) {
    return t.kind === "prob" ? (t.deps || []).map(function (d) { return H.BY_ID[d].name; }).join(", ") : H.usedBy(t.id).length + " problems";
  }
  function bar(label, value, max, display, cls) {
    var pct = max ? Math.round(value / max * 100) : 0;
    return "<div class='bar'><span>" + esc(label) + "</span><span class='track'><span class='fill " + (cls || "") + "' style='width:" + pct + "%'></span></span><span class='val'>" + esc(display) + "</span></div>";
  }
  function lessonPill(t) { return H.isReady(code(t)) ? "<span class='pill accent'>Lesson ready</span>" : "<span class='pill'>🔒 Coming soon</span>"; }

  /* ---------- Module cards ---------- */
  function renderModules() {
    $("module-cards").innerHTML = GROUPS.map(function (g, gi) {
      var items = TOPICS.filter(function (t) { return t.group === g; });
      var title = LEVELS.indexOf(g) >= 0 ? "Problems · " + g : "Module " + (gi + 1) + " · " + g;
      return "<div class='card'><h3>" + esc(title) + "</h3><ul style='list-style:none;padding:0'>" + items.map(function (t) {
        var c = code(t), ready = H.isReady(c), done = H.isDone(t.id);
        var label = "<span style='font-family:var(--mono);font-size:12px;color:var(--text-3)'>" + c + "</span> " + esc(t.name);
        var tag = done ? " <span class='pill success'>Done</span>" : ready ? "" : " <span title='Coming soon' style='color:var(--text-3)'>🔒</span>";
        return "<li>" + (ready ? "<a href='index.html#lesson=" + c + "'>" + label + "</a>" : "<span style='color:var(--text-2)'>" + label + "</span>") + tag + "</li>";
      }).join("") + "</ul></div>";
    }).join("");
  }

  /* ---------- Progress ---------- */
  function renderProgress() {
    var done = H.getDone();
    var fd = FUNDS.filter(function (t) { return done.indexOf(t.id) >= 0; }).length;
    var pd = PROBS.filter(function (t) { return done.indexOf(t.id) >= 0; }).length;
    var pct = Math.round((fd + pd) / TOPICS.length * 100);
    var ready = TOPICS.filter(function (t) { return H.isReady(code(t)); }).length;
    $("progress-lead").textContent = fd + pd === 0 ? "Nothing marked done yet; the first stop is Lesson F01, OOP fundamentals." : "Overall progress across all " + TOPICS.length + " topics.";
    $("metrics").innerHTML = [[fd + " / " + FUNDS.length, "Lessons done"], [pd + " / " + PROBS.length, "Machine-coding problems done"], [pct + "%", "Overall"], [ready + " / " + TOPICS.length, "Lessons published"]]
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
    var opts = [["all", "All", TOPICS.length], ["fund", "Lessons", FUNDS.length], ["prob", "Machine-coding problems", PROBS.length]];
    $("track").innerHTML = opts.map(function (o) {
      return "<button type='button' data-v='" + o[0] + "' class='" + (st.track === o[0] ? "on" : "") + "'>" + o[1] + "<span class='count'>" + o[2] + "</span></button>";
    }).join("");
    var groups = GROUPS.filter(function (g) { return st.track === "all" || (st.track === "prob") === (LEVELS.indexOf(g) >= 0); });
    $("group").innerHTML = "<option value='all'>All modules & levels</option>" + groups.map(function (g) {
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
      $("table-wrap").innerHTML = "<table><thead><tr><th>Done</th><th>#</th><th>Topic</th><th>Module / level</th><th>Builds on / used by</th><th>Lesson</th><th>Status</th></tr></thead><tbody>" +
        list.map(function (t) {
          var c = code(t), name = H.isReady(c) ? "<a href='index.html#lesson=" + c + "'>" + esc(t.name) + "</a>" : esc(t.name);
          return "<tr><td><input type='checkbox' class='mark' data-id='" + t.id + "'" + (H.isDone(t.id) ? " checked" : "") + " aria-label='Mark " + esc(t.name) + " done'></td><td class='mono'>" + c + "</td><td>" + name + "</td><td>" + esc(t.group) + "</td><td>" + esc(linkText(t)) + "</td><td>" + lessonPill(t) + "</td><td>" + statusPill(t) + "</td></tr>";
        }).join("") + "</tbody></table>";
    }
    $("details").innerHTML = list.map(function (t) {
      var link = t.kind === "prob"
        ? ["Builds on", (t.deps || []).map(function (d) { return code(H.BY_ID[d]) + " " + H.BY_ID[d].name; }).join(" · ")]
        : ["Used by", H.usedBy(t.id).length ? H.usedBy(t.id).map(function (p) { return p.name; }).join(" · ") : "General knowledge; not a direct dependency of the listed problems"];
      var lesson = H.isReady(code(t)) ? "<a href='index.html#lesson=" + code(t) + "'>Open lesson " + code(t) + " in the Teaching App →</a>" : "<span style='color:var(--text-3)'>🔒 Lesson coming soon</span>";
      return "<details class='topic' data-id='" + t.id + "'" + (openIds.indexOf(t.id) >= 0 ? " open" : "") + "><summary><span class='mono' style='font-family:var(--mono);color:var(--text-3);font-weight:400'>" + code(t) + "</span>" + esc(t.name) + " " + statusPill(t) + " " + lessonPill(t) + "</summary><div class='body'>" +
        "<p>" + md(t.why) + "</p><ul>" + t.concepts.map(function (c) { return "<li>" + md(c) + "</li>"; }).join("") + "</ul>" +
        "<div class='props'><span class='k'>" + (t.kind === "fund" ? "Module" : "Difficulty") + "</span><span>" + esc(t.group) + "</span><span class='k'>" + link[0] + "</span><span>" + esc(link[1]) + "</span><span class='k'>Status</span><span><label class='toggle' style='padding:0'><input type='checkbox' class='mark' data-id='" + t.id + "'" + (H.isDone(t.id) ? " checked" : "") + "> Mark done</label></span></div>" +
        "<p>" + lesson + "</p></div></details>";
    }).join("");
  }
  function persist() { H.save(FKEY, st); }
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
    renderProgress(); renderExplorer(); renderModules();
  });
  $("reset-progress").addEventListener("click", function () {
    if (window.confirm("Clear all saved LLD progress in this browser?")) { H.getDone().forEach(function (id) { H.setDone(id, false); }); renderProgress(); renderExplorer(); renderModules(); }
  });
  window.addEventListener("storage", function () { renderProgress(); renderExplorer(); renderModules(); });

  /* ---------- Static charts ---------- */
  var reuse = FUNDS.map(function (f) { return { f: f, n: H.usedBy(f.id).length }; }).filter(function (x) { return x.n > 0; })
    .sort(function (a, b) { return b.n - a.n; }).slice(0, 10);
  $("reuse-bars").innerHTML = reuse.map(function (x, i) { return bar(code(x.f) + " " + x.f.name, x.n, reuse[0].n, x.n + " problems", i === 0 ? "" : "muted"); }).join("");

  var FW = [
    ["Clarify requirements", "List must-have features and explicitly park nice-to-haves. Ask about scale only where it changes the code (e.g. concurrency)."],
    ["Entities & relationships", "Nouns become classes, verbs become methods. Decide is-a vs has-a and multiplicities."],
    ["Class diagram", "Sketch classes, interfaces and relationships. Mark where behaviour will vary: that's where patterns go."],
    ["Interfaces & patterns", "Define interfaces for the variation points (Strategy, State, Factory...). Keep it SOLID, not pattern-stuffed."],
    ["Code the core flow", "Models → services → a driver/`main` that demos the happy path. Working code beats perfect diagrams."],
    ["Edge cases & concurrency", "Validation, errors, thread safety where shared state exists (spot allocation, seat holds)."],
    ["Demo, test & extend", "Run the demo, walk through one extension (new vehicle type, new pricing) and state trade-offs out loud."]
  ];
  $("fw-steps").innerHTML = FW.map(function (s) { return "<li><div class='t'>" + esc(s[0]) + "</div><div class='dt'>" + md(s[1]) + "</div></li>"; }).join("");
  var split = [["Requirements", 10], ["Entities & diagram", 15], ["Interfaces & patterns", 10], ["Core code", 35], ["Edge cases & concurrency", 10], ["Demo & extensions", 10]];
  $("fw-bars").innerHTML = split.map(function (s) { return bar(s[0], s[1], 35, s[1] + " min", "muted"); }).join("");

  var UMLT = [
    ["Relationship", "Mermaid / UML", "Meaning", "Java hint"],
    ["Inheritance (generalization)", "`Animal <|-- Dog`", "Dog is-a Animal", "`class Dog extends Animal`"],
    ["Realization", "`Payable <|.. Invoice`", "Invoice implements the Payable contract", "`class Invoice implements Payable`"],
    ["Composition", "`House *-- Room`", "Owns-a: the part dies with the whole", "Created and held privately inside the owner"],
    ["Aggregation", "`Team o-- Player`", "Has-a: the part can live on its own", "Passed in from outside, shared"],
    ["Association", "`Driver --> Car`", "Knows about / uses over time", "A field referencing the other object"],
    ["Dependency", "`Order ..> Mailer`", "Uses briefly", "Method parameter or local variable"]
  ];
  $("uml-table").innerHTML = "<table><thead><tr>" + UMLT[0].map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" +
    UMLT.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + md(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";

  var PICK = [
    ["Smell in your design", "Pattern", "Typical problem"],
    ["`if/else` or `switch` choosing an algorithm", "Strategy (F17)", "Parking fee, spot allocation, rate-limit algorithm"],
    ["`switch (status)` in every method", "State (F20)", "Vending machine, ATM, elevator"],
    ["Many objects must react to one change", "Observer (F18)", "Notifications, pub-sub, stock tickers"],
    ["Constructor with 8 parameters, most optional", "Builder (F08)", "Building a Pizza, HTTP request, Config"],
    ["`new ConcreteX()` scattered across clients", "Factory Method (F06)", "Vehicle / Piece / Split creation"],
    ["Subclass explosion for add-on features", "Decorator (F11)", "Toppings, logging/retry wrappers"],
    ["Third-party API doesn't match your interface", "Adapter (F10)", "Payment gateways, legacy services"],
    ["Request handled by one of several handlers in order", "Chain of Responsibility (F22)", "Logger levels, ATM note dispenser, approvals"],
    ["Need undo/redo or a queue of actions", "Command (F19) / Memento (F26)", "Chess moves, text editor"],
    ["Tree of parts treated like one part", "Composite (F14)", "File system, menus, org chart"],
    ["Exactly one shared instance", "Singleton (F05), or DI scope", "Logger, ParkingLot, config"]
  ];
  $("picker-table").innerHTML = "<table><thead><tr>" + PICK[0].map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" +
    PICK.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + md(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";

  /* ---------- Diagrams ---------- */
  var rmNodes = PHASES.map(function (p, i) { return { id: "ph" + i, label: "Module " + (i + 1) + ": " + p, detail: FUNDS.filter(function (t) { return t.group === p; }).length + " lessons", series: 0 }; })
    .concat(LEVELS.map(function (l, i) { return { id: "lv" + i, label: l + " problems", detail: PROBS.filter(function (t) { return t.group === l; }).length + " machine-coding problems", series: 2 }; }));
  var rmEdges = [["ph0", "ph1"], ["ph1", "ph2"], ["ph1", "ph3"], ["ph1", "ph4"], ["ph0", "ph5"], ["ph2", "ph6"], ["ph3", "ph6"], ["ph4", "ph6"], ["ph6", "lv0"], ["lv0", "lv1"], ["ph5", "lv1"], ["lv1", "lv2"]]
    .map(function (e) { return { from: e[0], to: e[1] }; });

  var fwNodes = FW.map(function (s, i) { return { id: "s" + (i + 1), label: (i + 1) + ". " + s[0] }; });
  var fwEdges = [1, 2, 3, 4, 5, 6].map(function (i) { return { from: "s" + i, to: "s" + (i + 1) }; }).concat([{ from: "s7", to: "s4", label: "new requirement", dashed: true }]);

  var umlSrc = [
    "classDiagram",
    "  direction LR",
    "  class Payable {",
    "    <<interface>>",
    "    +pay(Money amount) Receipt",
    "  }",
    "  class Animal",
    "  Animal <|-- Dog : inheritance",
    "  Payable <|.. Invoice : realization",
    "  House *-- Room : composition",
    "  Team o-- Player : aggregation",
    "  Driver --> Car : association",
    "  Order ..> Mailer : dependency"
  ].join("\n");

  var seqSrc = [
    "sequenceDiagram",
    "  actor D as Driver",
    "  participant G as EntryGate",
    "  participant L as ParkingLot",
    "  participant S as SpotAllocationStrategy",
    "  participant T as TicketService",
    "  D->>G: arrive(vehicle)",
    "  G->>L: findSpot(vehicle.type)",
    "  L->>S: allocate(floors, type)",
    "  alt spot available",
    "    S-->>L: spot F2-17",
    "    L->>T: issueTicket(vehicle, spot)",
    "    T-->>G: Ticket #482",
    "    G-->>D: print ticket, open barrier",
    "  else lot full",
    "    S-->>L: none",
    "    L-->>G: LotFullException",
    "    G-->>D: show FULL sign",
    "  end"
  ].join("\n");

  renderControls(); renderExplorer(); renderProgress(); renderModules();

  function drawAll() {
    H.renderDiagram($("dg-roadmap"), H.flow(rmNodes, rmEdges, "LR"))
      .then(function () { return H.renderDiagram($("dg-framework"), H.flow(fwNodes, fwEdges, "LR")); })
      .then(function () { return H.renderDiagram($("dg-uml"), umlSrc); })
      .then(function () { return H.renderDiagram($("dg-seq"), seqSrc); })
      .then(function () { document.body.setAttribute("data-diagrams", "done"); });
  }
  drawAll();
})();
