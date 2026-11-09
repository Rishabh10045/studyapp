/* Lesson F13: Consistent hashing */
(function () {
  "use strict";
  var H = window.HLD;
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15; return h >>> 0; }
  var MAX = 4294967296;
  var KEYS = []; for (var i = 0; i < 3000; i++) KEYS.push("key" + i);
  var COLORS = ["var(--c0)", "var(--c1)", "var(--c2)", "#a855f7", "#f97316", "#ec4899", "#22c55e", "#64748b"];

  function ring(nodes, vn) {
    var pts = [];
    nodes.forEach(function (n) { for (var v = 0; v < vn; v++) pts.push({ h: hash(n + "#" + v), n: n }); });
    pts.sort(function (a, b) { return a.h - b.h; });
    return pts;
  }
  function owner(pts, h) { var lo = 0, hi = pts.length; while (lo < hi) { var m = (lo + hi) >> 1; if (pts[m].h < h) lo = m + 1; else hi = m; } return pts[lo % pts.length].n; }

  function widget(el, ctx) {
    var s = ctx.state; if (!s.n) { s.n = 4; s.vn = 1; s.mode = "ring"; }
    el.innerHTML = "<div class='controls'><div class='seg' data-r='mode'></div><label class='field'>Servers: <strong data-r='nl' style='color:var(--text)'></strong><input type='range' min='2' max='8' data-r='n'></label><label class='field'>Virtual nodes per server: <strong data-r='vl' style='color:var(--text)'></strong><input type='range' min='1' max='200' data-r='vn'></label></div>" +
      "<div class='grid2'><div class='card' data-r='pic'></div><div class='card'><div class='bars' data-r='bars'></div></div></div><div class='metrics' data-r='out'></div><p class='caption'>3,000 keys. 'Keys moved' compares the current server count with one more server added.</p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function names(n) { var a = []; for (var i = 0; i < n; i++) a.push("S" + (i + 1)); return a; }
    function assign(n) {
      if (s.mode === "mod") return KEYS.map(function (k) { return "S" + (hash(k) % n + 1); });
      var pts = ring(names(n), s.vn); return KEYS.map(function (k) { return owner(pts, hash(k)); });
    }
    function draw() {
      q("mode").innerHTML = [["ring", "Consistent hashing"], ["mod", "hash mod N"]].map(function (m) { return "<button type='button' data-m='" + m[0] + "' class='" + (s.mode === m[0] ? "on" : "") + "'>" + m[1] + "</button>"; }).join("");
      q("n").value = s.n; q("vn").value = s.vn; q("nl").textContent = s.n; q("vl").textContent = s.mode === "mod" ? "n/a" : s.vn; q("vn").disabled = s.mode === "mod";
      var a = assign(s.n), b = assign(s.n + 1);
      var counts = {}; names(s.n).forEach(function (n) { counts[n] = 0; }); a.forEach(function (n) { counts[n]++; });
      var moved = a.filter(function (x, i) { return x !== b[i]; }).length;
      var vals = names(s.n).map(function (n) { return counts[n]; }), max = Math.max.apply(null, vals), avg = KEYS.length / s.n;
      q("bars").innerHTML = "<h3>Keys per server</h3>" + names(s.n).map(function (n, i) { return "<div class='bar'><span><i style='display:inline-block;width:10px;height:10px;border-radius:50%;background:" + COLORS[i] + ";margin-right:6px'></i>" + n + "</span><span class='track'><span class='fill' style='width:" + counts[n] / max * 100 + "%;background:" + COLORS[i] + "'></span></span><span class='val'>" + counts[n] + "</span></div>"; }).join("");
      q("out").innerHTML = [[Math.round(moved / KEYS.length * 100) + "%", "Keys moved when adding server S" + (s.n + 1)], [Math.round(100 / (s.n + 1)) + "%", "Ideal share to move (1 ÷ new server count)"], [(max / avg).toFixed(2) + "x", "Busiest server vs average"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var cx = 160, cy = 160, r = 120, svg = "<svg width='100%' viewBox='0 0 320 320' role='img' aria-label='Hash ring'>";
      svg += "<circle cx='" + cx + "' cy='" + cy + "' r='" + r + "' fill='none' style='stroke:var(--border-strong)' stroke-width='2'/>";
      if (s.mode === "ring") {
        var pts = ring(names(s.n), Math.min(s.vn, 40));
        KEYS.slice(0, 120).forEach(function (k) { var t = hash(k) / MAX * 2 * Math.PI, o = owner(pts, hash(k)); var ix = names(s.n).indexOf(o); svg += "<circle cx='" + (cx + (r - 14) * Math.sin(t)).toFixed(1) + "' cy='" + (cy - (r - 14) * Math.cos(t)).toFixed(1) + "' r='2.5' style='fill:" + COLORS[ix] + ";opacity:.7'/>"; });
        pts.forEach(function (p) { var t = p.h / MAX * 2 * Math.PI, ix = names(s.n).indexOf(p.n); svg += "<circle cx='" + (cx + r * Math.sin(t)).toFixed(1) + "' cy='" + (cy - r * Math.cos(t)).toFixed(1) + "' r='" + (s.vn > 10 ? 3.5 : 7) + "' style='fill:" + COLORS[ix] + "'/>"; });
        svg += "<text x='160' y='156' text-anchor='middle' style='fill:var(--text-2);font-size:12px'>big dots: server positions</text><text x='160' y='172' text-anchor='middle' style='fill:var(--text-2);font-size:12px'>small dots: keys (owner colour)</text>";
        if (s.vn > 40) svg += "<text x='160' y='310' text-anchor='middle' style='fill:var(--text-3);font-size:11px'>showing 40 virtual nodes per server</text>";
      } else svg += "<text x='160' y='164' text-anchor='middle' style='fill:var(--text-2);font-size:13px'>mod N has no ring: server = hash(key) % N</text>";
      q("pic").innerHTML = svg + "</svg>";
    }
    q("mode").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.mode = b.getAttribute("data-m"); ctx.save(); draw(); });
    q("n").addEventListener("input", function (e) { s.n = +e.target.value; ctx.save(); draw(); });
    q("vn").addEventListener("input", function (e) { s.vn = +e.target.value; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F13",
    summary: "How to spread keys over a changing set of servers without reshuffling everything: the hash ring, why adding a node moves only about K/N keys, virtual nodes for even load, replication on the ring, and alternatives like rendezvous hashing.",
    slides: [
      { t: "The problem with hash mod N", x: "To spread keys over N cache or database servers, the obvious approach is server = hash(key) mod N. It works until N changes.",
        p: ["Add or remove one server and almost every key maps to a different server", "Going from 4 to 5 servers remaps about 80% of keys", "For a cache: a sudden wave of misses hits the database", "For a datastore: massive data migration"],
        m: "flowchart LR\n  K[\"key → hash 1,234,567\"] --> A[\"mod 4 = 3 → S4\"]:::s0\n  K --> B[\"mod 5 = 2 → S3\"]:::bad\n  A -. \"server added: key moves\" .-> B" },
      { t: "The hash ring", x: "Consistent hashing (Karger et al., 1997) maps both servers and keys onto the same circular hash space, e.g. 0 to 2^32 − 1.",
        p: ["Hash each server's ID to a position on the ring", "Hash each key to a position on the ring", "A key belongs to the first server found moving clockwise", "Lookup: binary search over the sorted server positions, O(log N)"],
        m: "flowchart LR\n  R[\"Ring 0 … 2^32−1\"]:::s0 --> P1[\"S1 at 10%\"]\n  R --> P2[\"S2 at 45%\"]\n  R --> P3[\"S3 at 80%\"]\n  K1[\"key at 30%\"] -->|\"clockwise\"| P2\n  K2[\"key at 90%\"] -->|\"wraps around\"| P1" },
      { t: "Adding a server", x: "A new server takes over only the keys between itself and its counter-clockwise neighbour. Everything else stays put.",
        p: ["On average only K/N keys move (K keys, N servers)", "Only one existing server gives up keys", "For a cache: a small, bounded set of misses", "For a datastore: copy just that range to the new node"],
        m: "flowchart LR\n  A[\"S1 (10%)\"] --> N[\"New S4 (30%)<br/>takes keys 10–30%\"]:::s2 --> B[\"S2 (45%)<br/>keeps 30–45%\"]\n  B --> C[\"S3 (80%)\"]" },
      { t: "Removing or losing a server", x: "When a server leaves, its keys move to the next server clockwise. Other servers are unaffected.",
        p: ["Again only that server's share of keys (about K/N) moves", "But the whole load lands on one neighbour, which can overload it", "Virtual nodes spread that load across many servers (next slide)"],
        m: "flowchart LR\n  A[\"S1\"] --> X[\"S2 fails ✗\"]:::bad --> C[\"S3 absorbs all of S2's keys\"]:::s1" },
      { t: "Virtual nodes", x: "With few servers, random positions split the ring unevenly. The fix: give each physical server many positions (virtual nodes).",
        p: ["Each server is hashed many times: S1#0, S1#1, …, S1#99", "Many small arcs average out, so load evens up", "When a server leaves, its arcs scatter to many different servers", "Heterogeneous hardware: give bigger servers more virtual nodes", "Cassandra historically defaulted to 256 virtual nodes per node (newer versions use fewer, with a smarter allocation)"],
        m: "flowchart LR\n  S1[\"Server S1\"]:::s0 --> V1[\"S1#0\"]\n  S1 --> V2[\"S1#1\"]\n  S1 --> V3[\"S1#2 …\"]\n  S2[\"Server S2\"]:::s1 --> W1[\"S2#0\"]\n  S2 --> W2[\"S2#1 …\"]" },
      { t: "Replication on the ring", x: "Dynamo-style stores replicate each key to the next R distinct servers clockwise, called its preference list.",
        p: ["Replication factor 3: the owner plus the next two distinct physical servers", "Skip virtual nodes of the same physical server so copies land on different machines (and ideally racks/zones)", "Reads and writes use quorums over that list (F05)", "When a node joins or leaves, only neighbouring ranges re-replicate"],
        m: "flowchart LR\n  K[\"key\"] -->|\"clockwise\"| A[\"S2: primary\"]:::s0 --> B[\"S3: replica\"]:::s2 --> C[\"S5: replica\"]:::s2" },
      { t: "Where it's used", x: "Consistent hashing appears wherever keys map to a changing pool of servers.",
        table: [["System", "Use"], ["Amazon Dynamo / DynamoDB lineage", "Partitioning and replicating keys across storage nodes"], ["Apache Cassandra, Riak, ScyllaDB", "Token ring with virtual nodes"], ["Memcached clients (e.g. ketama)", "Mapping cache keys to cache servers"], ["Load balancers (e.g. Google Maglev, Envoy ring hash)", "Keeping a connection or key on the same backend"], ["CDNs", "Mapping URLs to cache servers within a site (Akamai's origins are tied to the 1997 paper)"]],
        m: "flowchart LR\n  CH[\"Consistent hashing\"]:::s0 --> D[\"Datastores\"]\n  CH --> C[\"Caches\"]\n  CH --> L[\"Load balancers\"]\n  CH --> CDN[\"CDNs\"]" },
      { t: "Alternatives", x: "Other schemes solve the same problem with different trade-offs.",
        table: [["Scheme", "Idea", "Trade-off"], ["Rendezvous (highest random weight) hashing", "For each key, score every server with hash(key, server); pick the highest", "Very even and simple; O(N) per lookup"], ["Jump consistent hash (Google, 2014)", "Tiny algorithm mapping keys to numbered buckets 0..N−1", "Fast, no memory; servers can only be added/removed at the end"], ["Fixed logical partitions", "Many partitions (e.g. 1,024) mapped to nodes by a table", "Simple to reason about; needs a mapping service"], ["Maglev hashing", "Lookup table filled with per-backend permutations", "Fast lookups, even load; small disruption on changes"]],
        m: "flowchart LR\n  P[\"Map keys to changing servers\"]:::s0 --> R1[\"Ring + vnodes\"]\n  P --> R2[\"Rendezvous\"]\n  P --> R3[\"Jump hash\"]\n  P --> R4[\"Fixed partitions\"]" },
      { t: "Hot keys still exist", x: "Consistent hashing balances key counts, not traffic. One very popular key still lands on one server.",
        p: ["Replicate hot keys to several nodes and spread reads", "Add a local in-process cache in front", "Split the key (key#0..key#9) when writes are hot", "Bounded-load variants of consistent hashing cap each server's load (Google, 2017)"],
        m: "flowchart LR\n  HK[\"Hot key\"]:::bad --> S[\"One server overloaded\"]:::bad\n  HK -.-> F[\"Replicate / local cache / split key\"]:::s2" },
      { t: "Consistent hashing in interviews", x: "Bring it up whenever you shard a cache or datastore across nodes that come and go.",
        p: ["'Cache keys are placed with consistent hashing and 100+ virtual nodes per server, so adding a node moves about 1/N of keys.'", "'Each key is stored on the next three distinct nodes clockwise; we read and write with quorums.'", "Mention hot keys separately: consistent hashing alone doesn't fix them", "Contrast with mod N to show you know why it matters"],
        m: "flowchart LR\n  W[\"Why: avoid mass remapping\"] --> H[\"How: ring + virtual nodes\"]:::s0 --> R[\"Replication: next R nodes\"] --> T[\"Limits: hot keys\"]:::s1" }
    ],
    widget: { heading: "Hash ring simulator", caption: "Change server count and virtual nodes; compare with mod N. Real deployments also weigh capacity and racks.", render: widget },
    examples: [
      ["Karger et al., 1997", "'Consistent Hashing and Random Trees' (STOC 1997) introduced the technique for distributed web caching; the authors' work led to Akamai."],
      ["Amazon Dynamo (2007)", "Uses a ring with virtual nodes; each key is replicated on the next N nodes of its preference list."],
      ["Apache Cassandra", "Assigns token ranges on a ring to nodes; virtual nodes (num_tokens) spread ranges and speed up rebuilding a failed node."],
      ["Discord", "Discord's engineering blog has described using consistent hashing to route each guild (server) to a process in its Elixir cluster."]
    ],
    pitfalls: [
      "Using hash mod N for a pool of servers that changes",
      "Forgetting virtual nodes, then getting uneven load",
      "Claiming consistent hashing fixes hot keys",
      "Placing replicas on virtual nodes of the same physical server",
      "Not explaining what happens to the keys of a failed node",
      "Over-engineering: a fixed set of shards that never changes may not need it"
    ],
    quiz: [
      ["With hash mod N, about how many keys move when going from 9 to 10 servers?", ["About 10%", "About 50%", "About 90%", "None"], 2, "Most keys get a new remainder; roughly N/(N+1) = 90% move."],
      ["On a consistent hash ring, which server owns a key?", ["The server with the lowest ID", "The first server clockwise from the key's position", "A random server", "The server nearest in network distance"], 1, "Each key belongs to the next server position clockwise, wrapping around."],
      ["When a server is added to a ring of N servers, roughly how many keys move?", ["All keys", "About K/N (one server's share)", "About half", "None"], 1, "Only keys in the new server's arc move."],
      ["What do virtual nodes improve?", ["Encryption", "Evenness of load and spreading a failed node's load", "Write durability", "Query flexibility"], 1, "Many small arcs per server balance load and scatter a departing server's keys."],
      ["Where are a key's replicas placed in Dynamo-style systems?", ["On random nodes", "On the next distinct physical nodes clockwise", "On the same node", "In a separate replica ring"], 1, "The preference list skips virtual nodes of already-chosen physical servers."],
      ["Which problem does consistent hashing NOT solve by itself?", ["Mass remapping when servers change", "Spreading keys over servers", "A single extremely popular key", "Lookup of a key's owner"], 2, "It balances keys, not traffic per key; hot keys need replication, caching or splitting."],
      ["Rendezvous hashing picks a server by…", ["The next server clockwise", "The highest score of hash(key, server) over all servers", "Modulo the server count", "A lookup table"], 1, "Each key computes a score per server and picks the max; removals only affect that server's keys."]
    ],
    practice: {
      q: "Design how a distributed cache cluster assigns keys to 20 cache servers that are frequently added and removed by autoscaling. Explain the hashing, how clients find servers, what happens when a server dies, and how you handle hot keys.",
      a: [
        ["Hashing", "Consistent hashing with ~100–200 virtual nodes per server so each holds about 5% of keys and load stays even."],
        ["Membership", "A small coordination service (e.g. etcd/ZooKeeper) or the cache cluster itself publishes the server list; clients rebuild the ring when it changes."],
        ["Lookup", "Client hashes the key and binary-searches the sorted ring; no extra network hop."],
        ["Server joins", "It takes over about 1/21 of keys; those become cache misses and are refilled from the database gradually."],
        ["Server dies", "Its virtual nodes vanish; its keys spread across many servers (thanks to vnodes). Protect the DB with request coalescing during the miss spike."],
        ["Hot keys", "Detect via metrics; replicate hot keys to several servers (e.g. key#r1..r3, random read), and add a short-lived in-process cache."],
        ["Trade-offs", "Rebuilding rings on every membership change costs CPU; clients with stale membership briefly miss. Optionally use bounded-load consistent hashing."]
      ]
    },
    recap: [
      "hash mod N remaps almost every key when N changes.",
      "Consistent hashing: servers and keys on a ring; key goes to the next server clockwise.",
      "Adding or removing a server moves only about K/N keys.",
      "Virtual nodes even out load; replicas go to the next distinct physical servers.",
      "It doesn't fix hot keys; alternatives include rendezvous and jump hashing."
    ]
  });
})();
