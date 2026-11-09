(function () {
  "use strict";
  var H = window.HLD, $ = function (id) { return document.getElementById(id); }, esc = H.esc;

  /* ---------- Lesson 1 content ---------- */
  var U = { id: "u", label: "Users", kind: "terminal" };
  function APPS(s) { return [1, 2, 3].map(function (i) { return { id: "a" + i, label: "App server " + i, detail: "Stateless", series: s || 0 }; }); }
  var LB_TO_APPS = [1, 2, 3].map(function (i) { return { from: "lb", to: "a" + i }; });
  function APPS_TO(to, label) { return [1, 2, 3].map(function (i) { return { from: "a" + i, to: to, label: i === 2 ? label : undefined }; }); }

  var SLIDES = [
    { title: "What scalability means",
      text: "A system is scalable when it can handle more load by adding resources while keeping performance (latency, error rate) acceptable.",
      points: ["Load can mean more users, more requests per second, more data stored, or heavier requests", "Two ways to add resources: scale up (vertical) or scale out (horizontal)", "Scaling is a journey: each fix moves the bottleneck somewhere else", "In this lesson we grow one app from a single server to a sharded database"],
      nodes: [U, { id: "s", label: "Your system", detail: "Keep latency and errors low as load grows", series: 0 }],
      edges: [{ from: "u", to: "s", label: "more and more requests" }] },
    { title: "Stage 1: a single server",
      text: "Everything runs on one machine: web server, application code and database. DNS points the domain at that one server's IP address.",
      points: ["Simplest possible setup; great for a prototype or early product", "App and database compete for the same CPU, memory and disk", "If this machine goes down, the whole product is down: a single point of failure (SPOF)"],
      nodes: [U, { id: "dns", label: "DNS", detail: "example.com → server IP" }, { id: "s", label: "Single server", detail: "Web + app + database", series: 0 }],
      edges: [{ from: "u", to: "dns", label: "1. lookup" }, { from: "u", to: "s", label: "2. HTTP" }] },
    { title: "Vertical scaling (scale up)",
      text: "When the server struggles, the first move is often to buy a bigger machine: more CPU, more RAM, faster disks.",
      points: ["No code or architecture change, which is why it is a sensible first step", "Many relational databases are scaled this way for a long time"],
      pros: ["Simple: no code changes", "No distributed-system complexity", "Strong consistency stays easy"],
      cons: ["Hard ceiling: the biggest machine available", "Cost grows quickly at the high end", "Still a single point of failure", "Upgrades often need downtime"],
      nodes: [{ id: "small", label: "Server", detail: "4 vCPU, 16 GB RAM" }, { id: "big", label: "Bigger server", detail: "64 vCPU, 512 GB RAM", series: 0 }],
      edges: [{ from: "small", to: "big", label: "scale up" }] },
    { title: "Stage 2: separate the database",
      text: "Move the database to its own server so the app tier and the data tier can each be sized and scaled independently.",
      points: ["The app server becomes the web/application tier; the database becomes the data tier", "Each tier can now get hardware suited to it (CPU for app, memory and disk for DB)", "Both are still single points of failure"],
      nodes: [U, { id: "a", label: "App server", detail: "Web + application logic", series: 0 }, { id: "db", label: "Database", detail: "Own machine", series: 2 }],
      edges: [{ from: "u", to: "a" }, { from: "a", to: "db", label: "queries" }] },
    { title: "Horizontal scaling and stateless services",
      text: "Scale out by running many identical app servers. This only works if any server can handle any request, so servers must be stateless.",
      points: ["Stateless: no user session or uploaded file kept only in one server's memory or disk", "Move session data to a shared store (e.g. Redis) or into a signed token (e.g. JWT)", "Move uploaded files to shared object storage (e.g. S3)", "Then add or remove servers freely, including autoscaling"],
      nodes: [U, { id: "lb", label: "Load balancer" }].concat(APPS(0), [{ id: "ss", label: "Session store", detail: "Redis", series: 1 }, { id: "db", label: "Database", series: 2 }]),
      edges: [{ from: "u", to: "lb" }].concat(LB_TO_APPS, APPS_TO("ss", "sessions"), APPS_TO("db")) },
    { title: "Load balancer intro",
      text: "A load balancer is the single entry point that spreads requests across healthy app servers.",
      points: ["Algorithms: round robin, least connections, hashing (e.g. by IP)", "Health checks: an instance that fails them stops receiving traffic until it recovers", "Often terminates TLS (HTTPS) so app servers don't have to", "The load balancer itself must be redundant, e.g. an active–passive pair or a managed cloud LB", "Full details come in lesson F06"],
      nodes: [U, { id: "lb", label: "Load balancer (active)", series: 0 }, { id: "lb2", label: "Load balancer (standby)" }].concat(APPS(0)),
      edges: [{ from: "u", to: "lb" }, { from: "lb", to: "lb2", label: "failover", dashed: true }].concat(LB_TO_APPS.map(function (e, i) { return { from: e.from, to: e.to, label: i === 1 ? "health-checked" : undefined }; })) },
    { title: "Stage 4: add a cache (and a CDN)",
      text: "With many app servers, the database becomes the bottleneck. Most apps are read-heavy, so keep hot data in memory.",
      points: ["Cache-aside: read the cache first; on a miss, read the DB and store the result with a TTL", "A high cache hit ratio means far fewer queries reach the database", "Trade-off: cached data can be stale, so you need TTLs or invalidation on writes", "A CDN serves static files (images, JS, CSS) from servers near the user"],
      nodes: [U, { id: "cdn", label: "CDN", detail: "Static files" }, { id: "lb", label: "Load balancer" }].concat(APPS(0), [{ id: "c", label: "Cache", detail: "Redis / Memcached", series: 1 }, { id: "db", label: "Database", series: 2 }]),
      edges: [{ from: "u", to: "cdn", label: "static" }, { from: "u", to: "lb", label: "API" }].concat(LB_TO_APPS, APPS_TO("c", "1. read"), APPS_TO("db", "2. on miss")) },
    { title: "Stage 5: read replicas",
      text: "Copy the database to replicas. The primary takes all writes; replicas serve reads.",
      points: ["Scales reads, and a replica can be promoted if the primary fails", "Replication is commonly asynchronous, so replicas can lag behind the primary", "Lag problem: a user updates their profile, then reads a stale copy from a replica", "Fix: read-your-writes, e.g. send that user's reads to the primary for a short time", "Writes still all go to one primary"],
      nodes: [{ id: "lb", label: "Load balancer" }].concat(APPS(0), [{ id: "c", label: "Cache", series: 1 }, { id: "p", label: "DB primary", detail: "All writes", series: 2 }, { id: "r1", label: "Replica 1", detail: "Reads", series: 2 }, { id: "r2", label: "Replica 2", detail: "Reads", series: 2 }]),
      edges: LB_TO_APPS.concat(APPS_TO("c"), APPS_TO("p", "writes"), APPS_TO("r1", "reads"), [{ from: "p", to: "r1", label: "replicate", dashed: true }, { from: "p", to: "r2", dashed: true }, { from: "a3", to: "r2" }]) },
    { title: "Stage 6: sharding (preview)",
      text: "When writes or total data outgrow one primary, split the data across several databases (shards), each owning a subset of keys.",
      points: ["Pick a shard key, e.g. user_id; each shard holds a slice of users", "Hash-based (hash(key) mod N) spreads load; range-based keeps ranges together", "Costs: cross-shard queries and joins, rebalancing when adding shards, hot keys", "Plain mod-N remaps most keys when N changes; consistent hashing (F13) fixes that", "Usually the last resort after indexes, caching, replicas and vertical scaling"],
      nodes: APPS(0).concat([{ id: "rt", label: "Shard routing", detail: "hash(user_id) mod 3" }, { id: "s0", label: "Shard 0", detail: "Primary + replicas", series: 2 }, { id: "s1", label: "Shard 1", detail: "Primary + replicas", series: 2 }, { id: "s2", label: "Shard 2", detail: "Primary + replicas", series: 2 }]),
      edges: APPS_TO("rt").concat([{ from: "rt", to: "s0", label: "= 0" }, { from: "rt", to: "s1", label: "= 1" }, { from: "rt", to: "s2", label: "= 2" }]) },
    { title: "Bottlenecks and single points of failure",
      text: "A bottleneck limits throughput; a single point of failure takes the system down. Interviewers expect you to find both.",
      points: ["Find bottlenecks with metrics: CPU, memory, disk I/O, connections, queue depth, p99 latency", "Remove SPOFs with redundancy at every tier: LB pair, several app servers, cache cluster, DB failover", "Spread instances across availability zones so one data-center failure isn't fatal", "Fixing one bottleneck reveals the next: app tier → database reads → database writes"],
      nodes: [U, { id: "lb", label: "Redundant load balancers" }].concat(APPS(0), [{ id: "c", label: "Cache cluster", series: 1 }, { id: "p", label: "DB primary", detail: "Automatic failover", series: 2 }, { id: "r", label: "Read replicas", series: 2 }]),
      edges: [{ from: "u", to: "lb" }].concat(LB_TO_APPS, APPS_TO("c"), APPS_TO("p", "writes"), [{ from: "a2", to: "r", label: "reads" }, { from: "p", to: "r", dashed: true }]) }
  ];

  var TIERS = ["Hundreds", "Thousands", "Tens of thousands", "Hundreds of thousands", "Millions", "Tens of millions"];
  var STAGES = [
    { label: "1 server", comps: [{ name: "Single server (app + DB)", ok: 0, spof: true }] },
    { label: "+ DB tier", comps: [{ name: "App server", ok: 1, spof: true }, { name: "Database", ok: 2, spof: true }] },
    { label: "+ LB & apps", comps: [{ name: "Load balancer", ok: 5 }, { name: "App servers (autoscaled)", ok: 5 }, { name: "Database", ok: 2, spof: true }] },
    { label: "+ cache", comps: [{ name: "Load balancer", ok: 5 }, { name: "App servers (autoscaled)", ok: 5 }, { name: "Cache", ok: 5 }, { name: "Database", ok: 3, spof: true }] },
    { label: "+ replicas", comps: [{ name: "Load balancer", ok: 5 }, { name: "App servers (autoscaled)", ok: 5 }, { name: "Cache", ok: 5 }, { name: "Read replicas", ok: 5 }, { name: "DB primary (all writes)", ok: 4 }] },
    { label: "+ shards", comps: [{ name: "Load balancer", ok: 5 }, { name: "App servers (autoscaled)", ok: 5 }, { name: "Cache", ok: 5 }, { name: "Sharded DB (primaries + replicas)", ok: 5 }] }
  ];

  var QUIZ = [
    { q: "What is the main limitation of vertical scaling?", options: ["It requires rewriting the application", "There is a hardware ceiling and the server remains a single point of failure", "It cannot be used with relational databases", "It always requires a load balancer"], answer: 1, why: "Scaling up needs no code change, but you can't buy an infinitely large machine, and one machine is still one failure away from an outage." },
    { q: "Why must app servers be stateless before you scale them horizontally?", options: ["Stateless servers use less CPU", "So any server can handle any request, because session data lives in a shared store or a token", "Load balancers only accept stateless servers", "It removes the need for a database"], answer: 1, why: "If a session lives in one server's memory, the user breaks when the LB sends them elsewhere or that server is removed. Shared state makes servers interchangeable." },
    { q: "You run 6 app servers behind a load balancer. Traffic is 90% reads and the database CPU sits at 95%. What is the most sensible next step?", options: ["Add more app servers", "Shard the database immediately", "Add a cache for hot reads (and/or read replicas)", "Replace the load balancer with a bigger one"], answer: 2, why: "The DB is the bottleneck and the load is read-heavy, so caching and read replicas take reads off it cheaply. More app servers would add even more DB load; sharding is a heavier step usually saved for write or data-size limits." },
    { q: "A user updates their profile, refreshes, and sees the old data. Reads go to asynchronous read replicas. What happened?", options: ["The cache evicted the data", "Replication lag: the replica had not yet received the write", "The load balancer dropped the request", "The primary lost the write"], answer: 1, why: "Async replicas trail the primary. The usual fix is read-your-writes consistency, e.g. read that user's own data from the primary for a short time after a write." },
    { q: "Setup: one load balancer → 3 app servers → one DB primary with 2 read replicas. Where are the single points of failure?", options: ["The app servers", "The read replicas", "The load balancer, and the primary for writes unless automatic failover is set up", "None: three app servers make it redundant"], answer: 2, why: "Three app servers and two replicas are redundant. A single LB is a SPOF, and writes stop if the only primary dies until a replica is promoted." },
    { q: "When is sharding usually justified?", options: ["As soon as you have more than one app server", "When write volume or data size exceeds what one primary can handle, after cheaper options", "Whenever reads are slow", "To avoid needing indexes"], answer: 1, why: "Sharding adds real complexity (cross-shard queries, rebalancing, hot keys). Reads are usually solved by indexes, caching and replicas first; sharding addresses write and storage limits." },
    { q: "An app server starts failing the load balancer's health checks. What does the LB do?", options: ["Restarts the server", "Stops sending it traffic until it passes health checks again", "Sends it only read requests", "Shuts down all servers"], answer: 1, why: "Health checks let the LB route around unhealthy instances automatically. Replacing or restarting the instance is the job of autoscaling or orchestration." },
    { q: "In the cache-aside pattern, what happens on a cache miss?", options: ["The request fails", "The cache fetches from the DB by itself", "The application reads from the DB, stores the result in the cache, then returns it", "The DB pushes all data into the cache"], answer: 2, why: "In cache-aside the application owns the logic. When the cache loads from the DB itself, that is read-through caching." }
  ];

  /* Lessons: every roadmap topic in order; only F01 is written so far. */
  var READY = { scale: true };
  var LESSONS = H.TOPICS.map(function (t) { return { id: t.id, code: H.code(t), name: t.name, group: t.kind === "prob" ? t.group + " problems" : t.group, ready: !!READY[t.id] }; });

  /* ---------- State (persisted) ---------- */
  var S = H.load("hld.app.state.v1", { lesson: "F01", step: 0, stage: 0, tier: 0, picked: {}, showModel: false });
  var m = /lesson=([A-Z]\d\d)/.exec(location.hash);
  if (m && LESSONS.some(function (l) { return l.code === m[1]; })) S.lesson = m[1];
  function save() { H.save("hld.app.state.v1", S); }

  /* ---------- Sidebar ---------- */
  function renderList() {
    var html = "", last = "";
    LESSONS.forEach(function (l) {
      if (l.group !== last) { html += "<div class='g'>" + esc(l.group) + "</div>"; last = l.group; }
      var done = H.isDone(l.id);
      var stTxt = done ? "Done" : l.ready ? "Ready" : "Next";
      html += "<button type='button' class='lesson" + (l.ready ? " ready" : "") + (l.code === S.lesson ? " on" : "") + "' data-code='" + l.code + "'><span class='c'>" + l.code + "</span><span class='n'>" + esc(l.name) + "</span><span class='st" + (done ? " done" : "") + "'>" + stTxt + "</span></button>";
    });
    $("lesson-list").innerHTML = html;
  }
  $("lesson-list").addEventListener("click", function (e) {
    var b = e.target.closest(".lesson"); if (!b) return;
    S.lesson = b.getAttribute("data-code"); save(); history.replaceState(null, "", "#lesson=" + S.lesson); renderLesson();
    if (window.innerWidth < 900) $("content").scrollIntoView({ behavior: "smooth" });
  });
  function renderLesson() {
    var cur = LESSONS.filter(function (l) { return l.code === S.lesson; })[0] || LESSONS[0];
    $("coming").hidden = cur.ready; $("lesson1").hidden = !cur.ready;
    if (!cur.ready) $("coming-title").textContent = cur.code + " · " + cur.name;
    renderList();
  }
  $("back-l1").addEventListener("click", function () { S.lesson = "F01"; save(); history.replaceState(null, "", "#lesson=F01"); renderLesson(); });

  /* ---------- Slides ---------- */
  function renderSlide() {
    var s = SLIDES[S.step];
    $("slide-title").textContent = "Lesson 1 · Scalability, step " + (S.step + 1) + " of " + SLIDES.length + ": " + s.title;
    $("dots").innerHTML = SLIDES.map(function (_, i) { return "<button type='button' data-i='" + i + "' aria-label='Go to step " + (i + 1) + "' class='" + (i < S.step ? "past" : i === S.step ? "cur" : "") + "'></button>"; }).join("");
    $("slide-text").textContent = s.text;
    $("slide-points").innerHTML = s.points.map(function (p) { return "<li>" + H.md(p) + "</li>"; }).join("");
    var pc = $("slide-proscons");
    if (s.pros) { pc.hidden = false; pc.innerHTML = "<div class='card pro'><h3>Pros</h3><ul>" + s.pros.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div><div class='card con'><h3>Cons</h3><ul>" + s.cons.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>"; }
    else { pc.hidden = true; pc.innerHTML = ""; }
    $("prev").disabled = S.step === 0;
    var last = S.step === SLIDES.length - 1;
    $("next").disabled = last;
    $("next").textContent = last ? "Finished: try the simulator and quiz below" : "Next";
    H.renderDiagram($("slide-diagram"), H.flow(s.nodes, s.edges, "LR")).then(function () { document.body.setAttribute("data-slide-rendered", String(S.step)); });
  }
  function go(i) { S.step = Math.max(0, Math.min(SLIDES.length - 1, i)); save(); renderSlide(); }
  $("prev").addEventListener("click", function () { go(S.step - 1); });
  $("next").addEventListener("click", function () { go(S.step + 1); });
  $("dots").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) go(Number(b.getAttribute("data-i"))); });
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea" || $("lesson1").hidden) return;
    if (e.key === "ArrowRight") go(S.step + 1);
    if (e.key === "ArrowLeft") go(S.step - 1);
  });

  /* ---------- Simulator ---------- */
  function renderSim() {
    $("stages").innerHTML = STAGES.map(function (s, i) { return "<button type='button' data-i='" + i + "' class='" + (i === S.stage ? "on" : "") + "'>" + esc(s.label) + "</button>"; }).join("");
    $("tier").value = String(S.tier);
    $("tier-label").textContent = TIERS[S.tier];
    var comps = STAGES[S.stage].comps, tier = S.tier;
    $("sim-rows").innerHTML = comps.map(function (c) {
      var st = tier <= c.ok ? ["OK", "success"] : tier === c.ok + 1 ? ["Strained", "warning"] : ["Breaks", "danger"];
      return "<div class='row'><div><div class='t'>" + esc(c.name) + "</div><div class='dt'>" + (c.spof ? "Single point of failure" : "Redundant") + "</div></div><span class='pill " + st[1] + "'>" + st[0] + "</span></div>";
    }).join("");
    var broken = comps.filter(function (c) { return tier > c.ok; }).sort(function (a, b) { return a.ok - b.ok; });
    var fix = -1;
    for (var i = 0; i < STAGES.length; i++) { if (STAGES[i].comps.every(function (c) { return tier <= c.ok; })) { fix = i; break; } }
    $("sim-text").textContent = broken.length
      ? "First to give out: " + broken[0].name + ". " + (fix >= 0 ? "Move to the '" + STAGES[fix].label + "' architecture to cope at this traffic." : "")
      : "This architecture copes at this traffic." + (comps.some(function (c) { return c.spof; }) ? " It still has a single point of failure, though." : "");
  }
  $("stages").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; S.stage = Number(b.getAttribute("data-i")); save(); renderSim(); });
  $("tier").addEventListener("input", function (e) { S.tier = Number(e.target.value); save(); renderSim(); });

  /* ---------- Quiz ---------- */
  function L(j) { return String.fromCharCode(65 + j); }
  function renderQuiz() {
    var answered = Object.keys(S.picked).length;
    var score = QUIZ.filter(function (q, i) { return S.picked[i] === q.answer; }).length;
    $("quiz-title").textContent = "Quiz · " + score + " of " + QUIZ.length + " correct" + (answered < QUIZ.length ? " (" + answered + " answered)" : "");
    $("quiz-list").innerHTML = QUIZ.map(function (q, i) {
      var p = S.picked[i], done = p !== undefined;
      var opts = q.options.map(function (o, j) {
        var cls = done ? (j === q.answer ? " correct" : j === p ? " wrong" : "") : "";
        return "<button type='button' class='btn" + cls + "' data-q='" + i + "' data-o='" + j + "'" + (done ? " disabled" : "") + ">" + L(j) + ". " + esc(o) + "</button>";
      }).join("");
      var fb = done ? "<div><span class='pill " + (p === q.answer ? "success'>Correct" : "danger'>Not quite: the answer is " + L(q.answer)) + "</span></div><p>" + esc(q.why) + "</p>" : "";
      return "<div class='quizq'><h3>Q" + (i + 1) + ". " + esc(q.q) + "</h3><div class='qopts'>" + opts + "</div>" + fb + "</div>";
    }).join("");
  }
  $("quiz-list").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-q]"); if (!b || b.disabled) return;
    var i = b.getAttribute("data-q");
    if (S.picked[i] !== undefined) return;
    S.picked[i] = Number(b.getAttribute("data-o")); save(); renderQuiz();
  });
  $("reset-quiz").addEventListener("click", function () { S.picked = {}; save(); renderQuiz(); });

  /* ---------- Practice + completion ---------- */
  function renderModel() { $("model").hidden = !S.showModel; $("toggle-model").textContent = S.showModel ? "Hide model answer" : "Show model answer"; $("toggle-model").className = "btn" + (S.showModel ? "" : " primary"); }
  $("toggle-model").addEventListener("click", function () { S.showModel = !S.showModel; save(); renderModel(); });
  function renderComplete() { var d = H.isDone("scale"); $("complete").textContent = d ? "Lesson 1 complete ✓ (click to undo)" : "Mark Lesson 1 complete"; $("complete").className = "btn" + (d ? "" : " primary"); }
  $("complete").addEventListener("click", function () { H.setDone("scale", !H.isDone("scale")); renderComplete(); renderList(); });
  window.addEventListener("storage", function () { renderComplete(); renderList(); });

  renderLesson(); renderSlide(); renderSim(); renderQuiz(); renderModel(); renderComplete();
})();
