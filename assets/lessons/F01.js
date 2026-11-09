/* Lesson F01: Scalability: vertical vs horizontal */
(function () {
  "use strict";
  var H = window.HLD, esc = H.esc;
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

  /* Interactive: which component breaks first (illustrative model). */
  function sim(el, ctx) {
    var s = ctx.state; if (s.stage === undefined) { s.stage = 0; s.tier = 0; }
    el.innerHTML = "<div class='seg' data-r='stages'></div><div><label class='field'>Daily active users: <strong data-r='tl' style='color:var(--text)'></strong></label>" +
      "<input type='range' data-r='tier' min='0' max='5' step='1' aria-label='Traffic level'><div class='rangeends'><span>Hundreds</span><span>Tens of millions</span></div></div>" +
      "<div class='rows' data-r='rows'></div><p data-r='txt'></p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("stages").innerHTML = STAGES.map(function (st, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.stage ? "on" : "") + "'>" + esc(st.label) + "</button>"; }).join("");
      q("tier").value = String(s.tier); q("tl").textContent = TIERS[s.tier];
      var comps = STAGES[s.stage].comps, tier = s.tier;
      q("rows").innerHTML = comps.map(function (c) {
        var st = tier <= c.ok ? ["OK", "success"] : tier === c.ok + 1 ? ["Strained", "warning"] : ["Breaks", "danger"];
        return "<div class='row'><div><div class='t'>" + esc(c.name) + "</div><div class='dt'>" + (c.spof ? "Single point of failure" : "Redundant") + "</div></div><span class='pill " + st[1] + "'>" + st[0] + "</span></div>";
      }).join("");
      var broken = comps.filter(function (c) { return tier > c.ok; }).sort(function (a, b) { return a.ok - b.ok; });
      var fix = -1;
      for (var i = 0; i < STAGES.length; i++) { if (STAGES[i].comps.every(function (c) { return tier <= c.ok; })) { fix = i; break; } }
      q("txt").textContent = broken.length
        ? "First to give out: " + broken[0].name + ". " + (fix >= 0 ? "Move to the '" + STAGES[fix].label + "' architecture to cope at this traffic." : "")
        : "This architecture copes at this traffic." + (comps.some(function (c) { return c.spof; }) ? " It still has a single point of failure, though." : "");
    }
    q("stages").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.stage = Number(b.getAttribute("data-i")); ctx.save(); draw(); });
    q("tier").addEventListener("input", function (e) { s.tier = Number(e.target.value); ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F01",
    summary: "How systems grow from one server to many: vertical vs horizontal scaling, stateless services, load balancers, caching, read replicas, a sharding preview, and finding bottlenecks and single points of failure.",
    slides: SLIDES,
    widget: { heading: "Traffic simulator: what breaks first?", caption: "An illustrative teaching model, not benchmarks: real limits depend on hardware, request cost and read/write mix.", render: sim },
    examples: [
      ["Stack Overflow: scaling up goes far", "Has publicly described serving its very large traffic from a small number of powerful web and SQL Server machines: proof that vertical scaling plus good caching can last a long time."],
      ["Facebook: caching at massive scale", "The paper 'Scaling Memcache at Facebook' (NSDI 2013) describes a huge Memcached tier that absorbs reads in front of MySQL."],
      ["Instagram: sharding PostgreSQL", "Its 2012 engineering post 'Sharding & IDs at Instagram' describes many logical shards mapped onto fewer physical PostgreSQL servers, with IDs that embed the shard."],
      ["Netflix: stateless services that expect failure", "Runs stateless services on AWS with autoscaling, and built Chaos Monkey to randomly terminate instances so every service must survive losing one."]
    ],
    pitfalls: [
      "Jumping to sharding or microservices before estimating the load",
      "Saying 'add more servers' while sessions still live in server memory",
      "Forgetting that the load balancer itself needs redundancy",
      "Scaling the app tier and ignoring that the database becomes the bottleneck",
      "Adding a cache without a TTL or invalidation story",
      "Sending reads to replicas without mentioning replication lag",
      "Naming components without saying the trade-off each one brings"
    ],
    quiz: QUIZ,
    practice: {
      q: "Your photo-sharing startup runs its API and PostgreSQL on one server. Traffic is expected to grow 50x over the next year, and about 95% of requests are reads. How would you evolve the architecture?",
      a: [
        ["Clarify and estimate", "Ask for current DAU, peak QPS and data growth; 50x growth and 95% reads tells you reads are the main pressure."],
        ["Scale up and separate the DB", "Quick win: move PostgreSQL to its own, larger machine; add indexes for slow queries."],
        ["Make the app stateless", "Sessions to Redis or tokens; uploaded photos to object storage (e.g. S3) instead of local disk."],
        ["Load balancer + multiple app servers", "Redundant LB, autoscaled app servers across availability zones, health checks."],
        ["CDN and cache", "Serve photos via a CDN; cache hot metadata (profiles, feeds) with cache-aside and TTLs."],
        ["Read replicas", "Route reads to replicas, writes to the primary; handle lag with read-your-writes; set up automatic failover."],
        ["Plan for sharding, but don't start there", "Choose a likely shard key (user_id) and shard only if write volume or data size outgrows one primary."],
        ["Close with trade-offs and monitoring", "Name the remaining SPOFs, stale-cache and replica-lag trade-offs, and the metrics you'd watch (p99 latency, DB CPU, cache hit ratio)."]
      ]
    },
    recap: [
      "Scale up first for simplicity; scale out when you hit the ceiling or need redundancy.",
      "Horizontal scaling needs stateless servers behind a redundant load balancer.",
      "Then the database is the bottleneck: indexes, cache, read replicas, in that order.",
      "Shard only when writes or data size outgrow one primary; it brings real costs.",
      "Every fix moves the bottleneck: name it, remove SPOFs, and state the trade-off."
    ]
  });
})();
