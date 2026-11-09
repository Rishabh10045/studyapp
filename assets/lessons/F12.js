/* Lesson F12: Sharding / partitioning */
(function () {
  "use strict";
  var H = window.HLD;

  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  /* Skewed user names: many start with common letters, as in real data. */
  var LETTERS = "aaaaaaabbbcccddeeefghhhijjkkkllmmmmnnoppqrrrsssssstttuvwy";
  var KEYS = []; (function () { var seed = 7; for (var i = 0; i < 6000; i++) { seed = (seed * 48271) % 2147483647; KEYS.push(LETTERS[seed % LETTERS.length] + "user" + i); } })();

  function widget(el, ctx) {
    var s = ctx.state; if (!s.n) { s.n = 4; s.scheme = "hash"; }
    el.innerHTML = "<div class='controls'><div class='seg' data-r='scheme'></div><label class='field'>Shards: <strong data-r='nl' style='color:var(--text)'></strong><input type='range' min='2' max='10' data-r='n'></label></div><div class='card'><div class='bars' data-r='bars'></div></div><div class='metrics' data-r='out'></div><p class='caption'>6,000 user IDs whose first letters are skewed like real names. Hash = hash(id) mod N; Range = alphabetical ranges split evenly by letter (a–f, g–l, …).</p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function shardOf(k, n) {
      if (s.scheme === "hash") return hash(k) % n;
      var idx = k.charCodeAt(0) - 97; return Math.min(n - 1, Math.floor(idx / (26 / n)));
    }
    function draw() {
      q("scheme").innerHTML = [["hash", "Hash partitioning"], ["range", "Range partitioning"]].map(function (m) { return "<button type='button' data-m='" + m[0] + "' class='" + (s.scheme === m[0] ? "on" : "") + "'>" + m[1] + "</button>"; }).join("");
      q("n").value = s.n; q("nl").textContent = s.n;
      var counts = []; for (var i = 0; i < s.n; i++) counts.push(0);
      var moved = 0;
      KEYS.forEach(function (k) { var a = shardOf(k, s.n); counts[a]++; if (shardOf(k, s.n + 1) !== a) moved++; });
      var max = Math.max.apply(null, counts), avg = KEYS.length / s.n;
      q("bars").innerHTML = counts.map(function (c, i) { return "<div class='bar'><span>Shard " + i + "</span><span class='track'><span class='fill' style='width:" + (c / max * 100) + "%'></span></span><span class='val'>" + c + "</span></div>"; }).join("");
      q("out").innerHTML = [[(max / avg).toFixed(2) + "x", "Busiest shard vs average (1.00x = perfectly even)"], [Math.round(moved / KEYS.length * 100) + "%", "Keys that move if you add one shard"], [Math.round(100 / (s.n + 1)) + "%", "Minimum that must move (consistent hashing gets close)"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    }
    q("scheme").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.scheme = b.getAttribute("data-m"); ctx.save(); draw(); });
    q("n").addEventListener("input", function (e) { s.n = +e.target.value; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F12",
    summary: "Splitting data across machines when one database can't hold it or keep up with writes: horizontal vs vertical partitioning, choosing shard keys, hash vs range vs directory schemes, hot spots, cross-shard queries and resharding.",
    slides: [
      { t: "When one database isn't enough", x: "Replication scales reads, but every write still goes to one leader, and every node still stores all the data. Sharding (horizontal partitioning) splits the data so each node owns a subset.",
        p: ["Triggers: write throughput beyond one primary, data size beyond one machine, or working set beyond memory", "Try first: indexes, caching, read replicas, vertical scaling, archiving old data", "Each shard is usually itself replicated", "Cost: complexity in routing, queries, transactions and operations"],
        m: "flowchart LR\n  A[\"App\"] --> R[\"Shard router\"]:::s0\n  R --> S1[\"Shard 1: users A–H\"]:::s2\n  R --> S2[\"Shard 2: users I–P\"]:::s2\n  R --> S3[\"Shard 3: users Q–Z\"]:::s2" },
      { t: "Vertical vs horizontal partitioning", x: "Two ways to split a database.",
        table: [["", "Vertical partitioning", "Horizontal partitioning (sharding)"], ["Splits by", "Columns or tables (features)", "Rows"], ["Example", "Users DB, Orders DB, Analytics DB; or blob columns moved out", "Users 1–10M on shard 1, 10–20M on shard 2"], ["Helps with", "Separating unrelated workloads", "Scaling one huge table"], ["Limit", "One table can still outgrow a machine", "Cross-shard queries and transactions"]],
        m: "flowchart LR\n  T[\"One big DB\"] --> V[\"Vertical: by feature/table\"]:::s1\n  T --> Hh[\"Horizontal: by rows (sharding)\"]:::s0\n  V --> V1[\"Users DB\"]\n  V --> V2[\"Orders DB\"]\n  Hh --> H1[\"Rows 1..N/2\"]\n  Hh --> H2[\"Rows N/2..N\"]" },
      { t: "Choosing the shard key", x: "The shard (partition) key decides which shard holds each row. It is the most important and hardest-to-change decision.",
        p: ["High cardinality: many distinct values so data can spread", "Even load: avoid keys where a few values get most traffic", "Query locality: the most common queries should hit one shard (e.g. 'all orders of user X' → shard by user_id)", "Stable: the key of a row shouldn't change", "Examples: user_id for social apps, tenant_id for SaaS, chat_id for messaging"],
        m: "flowchart LR\n  Q[\"Top query: orders WHERE user_id = 42\"] --> K[\"Shard key: user_id\"]:::s0 --> ONE[\"Hits exactly one shard\"]:::s2" },
      { t: "Hash partitioning", x: "shard = hash(key) mod N. Spreads keys evenly regardless of their values.",
        pros: ["Even distribution of keys", "No hot ranges from sequential keys (e.g. timestamps)"],
        cons: ["Range queries hit every shard", "With plain mod N, changing N moves most keys", "Fix: consistent hashing or many fixed virtual partitions (F13)"],
        m: "flowchart LR\n  K[\"user_id = 42\"] --> H[\"hash(42) mod 4 = 2\"]:::s0 --> S[\"Shard 2\"]:::s2" },
      { t: "Range partitioning", x: "Each shard owns a contiguous key range (A–F, G–L…, or dates). Used by HBase, Bigtable, and range-sharded MongoDB and CockroachDB.",
        pros: ["Efficient range scans (all users A–C, all events in March)", "Easy to split a growing range in two"],
        cons: ["Skew: some ranges are far more popular", "Sequential keys (timestamps, auto-increment) send all new writes to the last shard: a hot spot"],
        m: "flowchart LR\n  K[\"key\"] --> R{\"Range?\"}\n  R -->|\"A–F\"| S1[\"Shard 1\"]\n  R -->|\"G–L\"| S2[\"Shard 2\"]\n  R -->|\"M–Z\"| S3[\"Shard 3 (hot?)\"]:::bad" },
      { t: "Directory-based partitioning", x: "A lookup service maps each key (or key group, e.g. tenant) to its shard. Flexible, at the cost of an extra component.",
        p: ["Move individual tenants or users between shards freely", "Place big customers on dedicated shards", "The directory must be highly available and cached", "Common variant: hash keys into many logical shards (e.g. thousands), then map logical shards to physical servers"],
        m: "flowchart LR\n  A[\"App\"] --> D[\"Directory: tenant → shard\"]:::s1\n  D --> S1[\"Shard 1\"]\n  D --> S2[\"Shard 2\"]\n  D --> S3[\"Dedicated shard for big tenant\"]:::s0" },
      { t: "Hot spots and the celebrity problem", x: "Even with a good key, some keys get far more traffic than others: a celebrity's posts, a viral product, a huge tenant.",
        p: ["Symptoms: one shard at 100% CPU while others idle", "Split hot keys: add a suffix (post_id#0..#9) and fan reads/writes across them", "Cache hot reads in front of the shard", "Isolate big tenants on their own shards", "Time-based keys: prefix with a hash or bucket to spread new writes"],
        m: "flowchart LR\n  C[\"Celebrity key\"]:::bad --> S1[\"Shard 3 overloaded\"]:::bad\n  C -.-> F[\"Fix: key#0..key#9 spread over shards\"]:::s2" },
      { t: "Cross-shard queries and transactions", x: "Anything that doesn't include the shard key becomes expensive.",
        p: ["Scatter-gather: send the query to all shards and merge results (slow, tail latency)", "Secondary indexes become global (separate index service) or local (query every shard)", "Joins across shards: denormalise, or join in the application", "Transactions across shards: two-phase commit or sagas (F27), or design so they're rare", "Unique constraints (e.g. unique email) need a separate lookup table"],
        m: "flowchart LR\n  Q[\"Query without shard key\"] --> SG[\"Scatter\"]:::s1\n  SG --> S1[\"Shard 1\"]\n  SG --> S2[\"Shard 2\"]\n  SG --> S3[\"Shard 3\"]\n  S1 --> G[\"Gather + merge\"]:::s0\n  S2 --> G\n  S3 --> G" },
      { t: "Resharding and rebalancing", x: "Data grows unevenly, so shards must be split or moved. Plan for it from day one.",
        p: ["Plain hash mod N: adding one shard moves roughly N/(N+1) of keys, a huge migration", "Fixed many partitions: create e.g. 1,024 logical partitions and move whole partitions between nodes", "Consistent hashing: adding a node moves only about 1/(N+1) of keys", "Online migration: copy data, dual-write or replay changes, switch routing, verify, then delete", "Try it: the simulator below shows how many keys move"],
        m: "flowchart LR\n  P[\"1,024 logical partitions\"]:::s0 --> N1[\"Node 1: p0–p341\"]\n  P --> N2[\"Node 2: p342–p682\"]\n  P --> N3[\"Node 3: p683–p1023\"]\n  N3 -. \"add node: move some partitions\" .-> N4[\"Node 4\"]:::s2" },
      { t: "Sharding in interviews", x: "Explain the key, the scheme, how queries route, and how you'll handle hot spots and growth.",
        p: ["'Shard messages by chat_id with consistent hashing; a chat's messages live together and sort by time.'", "'Shard by user_id; the email → user_id lookup table is a separate small store for login.'", "'Celebrity accounts get cached and fan-out is pulled on read.'", "Mention that each shard is replicated", "Don't shard prematurely: show the estimate that justifies it"],
        m: "flowchart LR\n  E[\"Estimate shows need\"] --> K[\"Shard key\"]:::s0 --> S[\"Scheme\"] --> R[\"Routing\"] --> HS[\"Hot spots + resharding plan\"]:::s2" }
    ],
    widget: { heading: "Sharding simulator", caption: "Compare how evenly keys spread and how many move when a shard is added. Illustrative data.", render: widget },
    examples: [
      ["Instagram", "'Sharding & IDs at Instagram' (2012) describes thousands of logical shards mapped to fewer PostgreSQL servers, with the shard ID embedded in each generated ID."],
      ["Vitess (YouTube)", "Built at YouTube to shard MySQL; it routes queries by keyspace ID and supports online resharding. Now a CNCF project used by Slack and others."],
      ["Discord", "Partitions messages by channel and a time bucket so a busy channel's history doesn't become one unbounded partition."],
      ["MongoDB sharding", "Supports ranged and hashed shard keys; a balancer migrates chunks between shards as data grows."]
    ],
    pitfalls: [
      "Sharding before showing estimates that require it",
      "Picking a shard key that doesn't match the main query (everything becomes scatter-gather)",
      "Sharding by a monotonically increasing key with range partitioning (one hot shard)",
      "Using hash mod N with no resharding plan",
      "Forgetting global uniqueness and secondary lookups (e.g. find user by email)",
      "Ignoring cross-shard transactions"
    ],
    quiz: [
      ["What does sharding (horizontal partitioning) split?", ["Columns into separate tables", "Rows across multiple databases", "Reads from writes", "Data into replicas"], 1, "Each shard holds a subset of rows; replication, by contrast, copies the same data."],
      ["For a social app where most queries are 'posts by user X', which shard key fits best?", ["post_id with range partitioning", "user_id", "country", "created_at"], 1, "Sharding by user_id keeps a user's posts on one shard, so the common query hits one shard."],
      ["Why can range partitioning on a timestamp create a hot spot?", ["Timestamps can't be hashed", "All new writes have the latest timestamp, so they go to the last range", "Ranges can't be split", "It disables indexes"], 1, "Monotonically increasing keys concentrate writes on one shard."],
      ["With plain hash(key) mod N, roughly what share of keys moves when going from 4 to 5 shards?", ["About 20%", "About 50%", "About 80%", "0%"], 2, "Most keys map to a different remainder; about N/(N+1) = 80% move. Consistent hashing moves about 1/(N+1)."],
      ["What is a scatter-gather query?", ["A query sent to all shards with results merged", "A cached query", "A query on a replica", "A batch insert"], 0, "Queries without the shard key must ask every shard."],
      ["Which technique helps with a single extremely hot key?", ["Add more indexes", "Split the key with suffixes and/or cache it", "Use a bigger shard key", "Switch to range partitioning"], 1, "Spreading or caching the hot key relieves the overloaded shard."],
      ["What does directory-based partitioning add?", ["Automatic joins", "A lookup service mapping keys or tenants to shards", "Strong consistency", "Encryption"], 1, "It's flexible (move tenants freely) but the directory must be highly available."]
    ],
    practice: {
      q: "A multi-tenant SaaS project-management tool has 50,000 companies. Most have under 100 users, but 20 enterprise customers have over 50,000 users each. Data has outgrown one PostgreSQL primary. Design the sharding.",
      a: [
        ["Shard key", "tenant_id: almost every query is within one company, so queries and transactions stay on one shard."],
        ["Scheme", "Directory-based: a tenant → shard map (cached in every app server). Small tenants are packed many per shard; the 20 enterprise tenants get dedicated or lightly shared shards."],
        ["Within big tenants", "If one enterprise tenant outgrows a shard, partition its largest tables further (e.g. by project_id) or move it to a bigger machine first."],
        ["Global data", "Users who belong to several tenants and the login email → user lookup live in a small global database."],
        ["Rebalancing", "Move a tenant by copying its data, replaying changes (logical replication), flipping its directory entry during a brief write pause, then cleaning up."],
        ["Cross-tenant queries", "Internal analytics read from a data warehouse fed by CDC, not from shards."],
        ["Trade-offs", "Directory adds a dependency; uneven tenants need monitoring per shard; schema changes must roll out across all shards."]
      ]
    },
    recap: [
      "Shard when writes or data outgrow one primary, after cheaper options.",
      "The shard key decides everything: high cardinality, even load, query locality.",
      "Hash spreads evenly but breaks ranges; range keeps order but risks hot spots.",
      "Queries without the shard key scatter-gather; cross-shard transactions are costly.",
      "Plan resharding: many logical partitions or consistent hashing, not mod N."
    ]
  });
})();
