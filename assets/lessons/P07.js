/* Lesson P07: Distributed cache */
(function () {
  "use strict";
  var H = window.HLD;
  function Hn(n, a) { if (n < 1) return 0; return Math.abs(a - 1) < 1e-6 ? Math.log(n) + 0.5772 : 1 + (Math.pow(n, 1 - a) - 1) / (1 - a); }

  function widget(el, ctx) {
    var s = ctx.state; if (!s.keys) { s.keys = 500; s.pct = 10; s.z = 0.9; s.val = 1; s.qps = 1000; s.node = 64; }
    var F = [["keys", "Distinct keys (millions)", 10, 5000, 10], ["pct", "Cache holds % of keys", 1, 100, 1], ["z", "Popularity skew (Zipf α)", 0.5, 1.4, 0.05], ["val", "Avg item size (KB)", 0.1, 20, 0.1], ["qps", "Reads (thousands/s)", 10, 5000, 10], ["node", "RAM per cache node (GB)", 16, 512, 16]];
    el.innerHTML = "<div class='grid3'>" + F.map(function (f) { return "<label class='field'>" + f[1] + ": <strong data-v='" + f[0] + "' style='color:var(--text)'></strong><input type='range' min='" + f[2] + "' max='" + f[3] + "' step='" + f[4] + "' data-k='" + f[0] + "'></label>"; }).join("") + "</div>" +
      "<div class='metrics' data-r='m'></div><div class='bars' data-r='b'></div><p class='caption'>Model: requests follow a Zipf distribution and the cache holds the most popular keys (ideal LFU), so the hit ratio is an upper bound. Memory adds ~50% overhead for keys, metadata and fragmentation; nodes are sized at 70% RAM use. Approximate harmonic sums.</p>";
    function draw() {
      F.forEach(function (f) { el.querySelector("[data-k='" + f[0] + "']").value = s[f[0]]; el.querySelector("[data-v='" + f[0] + "']").textContent = s[f[0]]; });
      var n = s.keys * 1e6, c = n * s.pct / 100, hit = Math.min(1, Hn(c, s.z) / Hn(n, s.z)), mem = c * s.val * 1024 * 1.5, nodes = Math.max(1, Math.ceil(mem / (s.node * 0.7 * 1e9)));
      var miss = s.qps * 1000 * (1 - hit);
      el.querySelector("[data-r='m']").innerHTML = [[(hit * 100).toFixed(1) + "%", "Hit ratio (upper bound)"], [(mem / 1e9).toFixed(0) + " GB", "Cache memory"], [nodes + " (+ replicas)", "Cache nodes"], [Math.round(miss).toLocaleString() + "/s", "Misses hitting the DB"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var pts = [1, 5, 10, 20, 50, 100];
      el.querySelector("[data-r='b']").innerHTML = pts.map(function (p) { var h = Math.min(1, Hn(n * p / 100, s.z) / Hn(n, s.z)); return "<div class='bar'><span>cache " + p + "% of keys</span><div class='track'><div class='fill' style='width:" + (h * 100) + "%;background:" + (p === s.pct ? "var(--c0)" : "var(--other)") + "'></div></div><span>" + (h * 100).toFixed(0) + "% hits</span></div>"; }).join("");
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P07",
    summary: "Design the caching tier itself (think Memcached/Redis Cluster): requirements, sizing, the get/set/delete API, in-memory data layout and eviction, partitioning with consistent hashing, replication and failover, hot keys, stampedes and consistency with the database.",
    slides: [
      { t: "1. Requirements", x: "A shared in-memory key-value cache in front of databases and services.",
        p: ["Functional: get(key), set(key, value, ttl), delete(key); optionally atomic increments, multi-get", "Non-functional: sub-millisecond to ~1 ms latency; millions of ops/s; horizontally scalable; survives node failures (data loss acceptable? usually yes — it's a cache)", "Eviction when full (LRU/LFU) and TTL expiry", "Ask: strong consistency with DB needed? Persistence? Multi-region?"],
        m: "flowchart LR\n  APP[\"App servers\"] -->|\"get/set\"| C[(\"Distributed cache\")]:::s2\n  APP -->|\"on miss\"| DB[(\"Database\")]:::s0" },
      { t: "2. Estimates", x: "Example: 1 M reads/s, 500 M keys of 1 KB, cache the hottest 20%.",
        table: [["Quantity", "Estimate"], ["Data cached", "100 M keys × 1 KB ≈ 100 GB (+ ~50% overhead → ~150 GB)"], ["Nodes (64 GB RAM, ~70% used)", "≈ 4 primaries; plus replicas"], ["Throughput", "1 M ops/s ÷ ~100k ops/s per Redis core → ~10+ shards anyway"], ["Network", "1 M × 1 KB ≈ 1 GB/s ≈ 8 Gbit/s total"]],
        p: ["Often throughput, not memory, decides the shard count"],
        m: "flowchart LR\n  MEM[\"Memory: ~4 nodes\"]:::s1 --> MAX[\"Take the max\"]:::s0\n  THR[\"Throughput: ~10 shards\"]:::s2 --> MAX" },
      { t: "3. API", x: "Small and fast; usually a binary or text protocol over TCP, not HTTP.",
        p: ["GET key → value | miss", "SET key value [TTL] [NX|XX] → ok", "DELETE key; MGET k1 k2…; INCR key", "CAS / versioned set for safe concurrent updates (Memcached gets/cas)", "Client libraries hide partitioning: they hash the key to find the node"],
        m: "sequenceDiagram\n  participant A as App\n  participant C as Cache node 3\n  A->>C: GET user:42\n  C-->>A: miss\n  Note over A: read DB\n  A->>C: SET user:42 {…} EX 300\n  C-->>A: OK" },
      { t: "4. Data layout on a node", x: "Each node is a single-machine cache: hash table + eviction structure.",
        p: ["Hash table key → item pointer for O(1) lookup", "LRU: doubly linked list; move to head on access, evict from tail (approximations are common: Redis samples keys)", "TTL: lazy expiry on access + periodic sampling of expired keys", "Memory allocator matters: Memcached uses slab classes to avoid fragmentation", "Single-threaded event loop (Redis) vs multi-threaded (Memcached)"],
        m: "flowchart LR\n  HT[\"Hash table: key → item\"]:::s0 --> IT[\"item: value, ttl, lru pointers\"]\n  IT --> LRU[\"LRU list: head (recent) … tail (evict)\"]:::s1" },
      { t: "5. High-level architecture", x: "A cluster of shards, each a primary with replicas, plus a way to route keys.",
        m: "flowchart LR\n  APP[\"App + smart client (hash ring)\"]:::s0 --> S1[\"Shard 1 primary\"]:::s2\n  APP --> S2[\"Shard 2 primary\"]:::s2\n  APP --> S3[\"Shard 3 primary\"]:::s2\n  S1 --> R1[\"replica\"]\n  S2 --> R2[\"replica\"]\n  S3 --> R3[\"replica\"]\n  CFG[(\"Cluster config / membership\")]:::s1 --> APP\n  CFG -.-> S1",
        p: ["Routing: smart client (Redis Cluster, ketama for Memcached) or a proxy tier (twemproxy, mcrouter, Envoy)", "Config service tracks membership and slot ownership"] },
      { t: "6. Deep dive: partitioning", x: "Spread keys so adding or removing nodes moves few keys.",
        p: ["Consistent hashing with virtual nodes (F13): adding a node moves ~1/N of keys", "Redis Cluster: 16,384 hash slots; CRC16(key) mod 16384; slots assigned to nodes and moved during resharding", "Hash tags {user42}:profile keep related keys on one slot for multi-key ops", "Avoid mod-N hashing — a resize would miss almost everything (cold cache stampede on the DB)"],
        m: "flowchart LR\n  K[\"key user:42\"] --> H[\"CRC16 mod 16384 = slot 9,182\"]:::s1 --> M[\"slot map: 8192–12287 → node B\"]:::s0 --> NB[\"Node B\"]:::s2" },
      { t: "7. Deep dive: replication and failover", x: "Losing a cache node shouldn't send a flood of misses to the database.",
        p: ["Async replication primary → replicas (fast, may lose recent writes — fine for a cache)", "Failure detection by gossip or a sentinel/coordinator; promote a replica", "Read from replicas to scale hot reads (accept slightly stale data)", "Warm-up: new or restarted nodes start cold → stagger restarts, pre-warm hot keys", "Multi-AZ placement of replicas"],
        m: "sequenceDiagram\n  participant P as Primary B\n  participant R as Replica B'\n  participant S as Sentinel / cluster\n  P->>R: async replication\n  Note over P: crashes\n  S->>R: promote to primary\n  S-->>S: update slot map, clients refresh" },
      { t: "8. Deep dive: hot keys, stampedes, consistency", x: "The hard parts of running a cache.",
        p: ["Hot key (celebrity profile): replicate it to several keys/nodes (key#1..#n) or keep a tiny local in-process cache", "Stampede when a hot key expires: request coalescing (single flight), locks, early probabilistic refresh, stale-while-revalidate (F07)", "Consistency: cache-aside with delete-on-write; set TTLs as a safety net; races can leave stale data → versioned values or delayed second delete", "Facebook's memcache paper introduced leases to fix stale sets and thundering herds"],
        m: "flowchart LR\n  E[\"hot key expires\"] --> Q{\"first request?\"}\n  Q -->|\"yes\"| L[\"get lease → rebuild\"]:::s0\n  Q -->|\"no\"| W[\"wait / serve stale\"]:::s1\n  L --> SET[\"set fresh value\"]:::s2" },
      { t: "9. Bottlenecks and trade-offs", x: "Discussion points.",
        table: [["Choice", "Trade-off"], ["Smart client vs proxy", "Fewer hops vs simpler clients and central control"], ["Replicas", "Availability + read scale vs memory cost and staleness"], ["LRU vs LFU", "Recency vs frequency; LFU resists scans"], ["Persistence (RDB/AOF)", "Faster warm restart vs write overhead"], ["Large values", "Network-bound; compress or store in object storage"]],
        m: "flowchart LR\n  AV[\"Availability\"]:::s0 <--> MEM[\"Memory cost\"]:::s1 <--> FR[\"Freshness\"]:::s2" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Sharded in-memory KV with hash table + LRU/LFU + TTL per node", "Consistent hashing or hash slots; smart client or proxy routing", "Async replicas with automatic failover; multi-AZ", "Handle hot keys, stampedes and invalidation races explicitly", "Size for max(memory, throughput) and monitor hit ratio, evictions, latency"],
        m: "flowchart LR\n  C[\"Client routing\"]:::s1 --> SH[\"Shards + replicas\"]:::s2 --> OPS[\"Eviction, TTL, failover\"]:::s0" }
    ],
    widget: { heading: "Cache sizing and hit-ratio explorer", caption: "See how skewed popularity lets a small cache absorb most reads, and how many nodes you need.", render: widget },
    examples: [
      ["Facebook memcache", "The NSDI 2013 paper 'Scaling Memcache at Facebook' described regional pools, leases, mcrouter-style routing and cross-region invalidation via the database's replication stream."],
      ["Redis Cluster", "Partitions keys into 16,384 hash slots across primaries with replicas and automatic failover."],
      ["Twitter", "Ran large Memcached and Redis fleets and open-sourced twemproxy, a proxy for sharding them."],
      ["Amazon ElastiCache", "Managed Redis/Valkey and Memcached clusters on AWS."]
    ],
    pitfalls: [
      "mod-N hashing, so any resize flushes most of the cache",
      "No plan for hot keys or stampedes",
      "Treating the cache as the source of truth",
      "Ignoring memory overhead and fragmentation in sizing",
      "Sizing only by memory, not throughput",
      "Restarting all cache nodes at once (cold cache hits the DB)"
    ],
    quiz: [
      ["How many hash slots does Redis Cluster use?", ["1,024", "4,096", "16,384", "65,536"], 2, "CRC16(key) mod 16384."],
      ["Why consistent hashing (or slots) instead of hash mod N?", ["Faster hashing", "Adding a node moves only a fraction of keys", "Uses less memory", "Encrypts keys"], 1, "mod N remaps almost every key on resize."],
      ["A cache node dies. Biggest risk?", ["Data corruption in the DB", "A flood of misses to the database", "Clients crash", "TTLs reset"], 1, "Replicas and gradual warm-up help."],
      ["Best fix for one extremely hot key?", ["Delete it", "Replicate it across nodes or cache it locally in app servers", "Bigger TTL only", "Move it to disk"], 1, "Spread its reads."],
      ["What did Facebook's memcache leases address?", ["Encryption", "Stale sets and thundering herds", "Disk failures", "DNS"], 1, "Only the lease holder may fill the key."],
      ["Typical replication mode for a cache?", ["Synchronous 2PC", "Asynchronous", "None ever", "Paxos per write"], 1, "Speed over durability; it's a cache."],
      ["Hit ratio is high with a small cache because…", ["Keys are small", "Popularity is skewed: few keys get most reads", "TTLs are long", "Networks are fast"], 1, "Zipf-like access patterns."],
      ["Redis {user42} in a key name is a…", ["Comment", "Hash tag keeping related keys in the same slot", "Wildcard", "TTL"], 1, "Enables multi-key operations on one node."]
    ],
    practice: {
      q: "Your cache cluster sits in front of the product catalog for a sale. Two problems appear: one product page key gets 500k reads/s, and after a deploy restart the DB is overwhelmed. Fix both.",
      a: [
        ["Hot key detection", "Track top keys per node (sampling or Redis hotkeys/LFU stats)."],
        ["Hot key mitigation", "In-process L1 cache in app servers with a short TTL (1–5 s), plus replicating the key as product:123#0..#9 across shards and picking one randomly."],
        ["Stampede", "Single-flight request coalescing per key in each app server; stale-while-revalidate on expiry."],
        ["Restarts", "Rolling restarts one node at a time; replicas promoted rather than cold nodes; persistence (RDB) or pre-warming from a list of hot keys before taking traffic."],
        ["DB protection", "Rate-limit or queue cache-miss reads to the DB; serve stale or a degraded page if needed."],
        ["Trade-offs", "L1 caches and stale serving add staleness (prices!) → short TTLs and invalidation broadcasts for price changes."]
      ]
    },
    recap: [
      "Cache = sharded in-memory KV with eviction and TTL.",
      "Partition with consistent hashing or hash slots; route via smart client or proxy.",
      "Async replicas + automatic failover; avoid cold restarts.",
      "Plan for hot keys, stampedes and invalidation races.",
      "Size by max(memory with overhead, throughput); watch hit ratio."
    ]
  });
})();
