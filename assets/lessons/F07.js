/* Lesson F07: Caching & CDN */
(function () {
  "use strict";
  var H = window.HLD;

  /* Deterministic Zipf-like request stream so results are repeatable. */
  function stream(nKeys, nReq, skew) {
    var w = [], sum = 0, i;
    for (i = 1; i <= nKeys; i++) { var x = 1 / Math.pow(i, skew); w.push(x); sum += x; }
    var cdf = [], acc = 0;
    for (i = 0; i < nKeys; i++) { acc += w[i] / sum; cdf.push(acc); }
    var seed = 42, out = [];
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    for (i = 0; i < nReq; i++) {
      var r = rnd(), lo = 0, hi = nKeys - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
      out.push(lo);
    }
    return out;
  }
  function simulate(reqs, size, policy) {
    var hits = 0, map = new Map(), freq = new Map(), t = 0;
    reqs.forEach(function (k) {
      t++;
      if (map.has(k)) {
        hits++;
        if (policy === "LRU") { map.delete(k); map.set(k, t); }
        freq.set(k, (freq.get(k) || 0) + 1);
        return;
      }
      if (size === 0) return;
      if (map.size >= size) {
        var victim;
        if (policy === "LFU") { var best = Infinity; map.forEach(function (_, key) { var f = freq.get(key) || 0; if (f < best) { best = f; victim = key; } }); }
        else victim = map.keys().next().value; /* FIFO and LRU: oldest in insertion order */
        map.delete(victim); freq.delete(victim);
      }
      map.set(k, t); freq.set(k, 1);
    });
    return hits / reqs.length;
  }

  function widget(el, ctx) {
    var s = ctx.state;
    if (s.size === undefined) { s.size = 50; s.skew = 10; s.qps = 10000; }
    el.innerHTML = "<div class='grid3'><label class='field'>Cache size (items, of 1,000 keys): <strong data-v='size' style='color:var(--text)'></strong><input type='range' min='0' max='500' step='10' data-k='size'></label>" +
      "<label class='field'>Access skew (Zipf exponent): <strong data-v='skew' style='color:var(--text)'></strong><input type='range' min='0' max='15' data-k='skew'></label>" +
      "<label class='field'>Read QPS: <strong data-v='qps' style='color:var(--text)'></strong><input type='range' min='1000' max='50000' step='1000' data-k='qps'></label></div>" +
      "<div class='card'><div class='bars' data-r='bars'></div></div><p data-r='txt'></p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    var cache = {};
    function draw() {
      ["size", "skew", "qps"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      el.querySelector("[data-v='size']").textContent = s.size;
      el.querySelector("[data-v='skew']").textContent = (s.skew / 10).toFixed(1) + (s.skew === 0 ? " (uniform)" : "");
      el.querySelector("[data-v='qps']").textContent = s.qps.toLocaleString();
      var key = s.skew;
      if (!cache[key]) cache[key] = stream(1000, 20000, s.skew / 10);
      var res = ["LRU", "LFU", "FIFO"].map(function (p) { return [p, simulate(cache[key], s.size, p)]; });
      q("bars").innerHTML = res.map(function (r) {
        var pct = Math.round(r[1] * 1000) / 10;
        return "<div class='bar'><span>" + r[0] + " hit ratio</span><span class='track'><span class='fill' style='width:" + pct + "%'></span></span><span class='val'>" + pct + "% · DB gets " + Math.round(s.qps * (1 - r[1])).toLocaleString() + " QPS</span></div>";
      }).join("");
      q("txt").textContent = "With skewed (realistic) access, a cache holding a small share of keys absorbs most reads. With uniform access (skew 0), hit ratio is roughly cache size ÷ key count.";
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (!k) return; s[k] = +e.target.value; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F07",
    summary: "Caching is the cheapest way to cut latency and database load: where caches live, read and write strategies, eviction, invalidation, failure modes like stampedes, and how CDNs cache content at the edge.",
    slides: [
      { t: "Why caching works", x: "A cache keeps a copy of frequently used data in faster storage, usually memory, closer to where it's needed. Real workloads are skewed: a small share of items gets most requests.",
        p: ["Memory is orders of magnitude faster than disk or a network round trip to a database", "Every cache hit is a query the database never sees", "Trade-off: cached data can be stale, and memory is limited and costly", "Key metric: hit ratio = hits ÷ (hits + misses)"],
        m: "flowchart LR\n  A[\"App\"] -->|\"1. check\"| C[\"Cache (RAM) ~sub-ms\"]:::s1\n  C -->|\"hit\"| A\n  A -->|\"2. miss\"| D[\"Database ~ms\"]:::s2" },
      { t: "Where caches live", x: "Caching happens at many layers between the user and the data.",
        table: [["Layer", "Example", "Caches"], ["Client", "Browser cache, mobile app", "Static files, API responses (HTTP Cache-Control)"], ["Edge", "CDN (Cloudflare, Akamai, CloudFront)", "Images, video, JS/CSS, some API responses"], ["Reverse proxy", "NGINX, Varnish", "Whole HTTP responses"], ["Application", "In-process map, Guava/Caffeine", "Hot objects, per server"], ["Distributed", "Redis, Memcached", "Shared objects, sessions, counters"], ["Database", "Buffer pool, query cache", "Pages and index blocks"]],
        m: "flowchart LR\n  B[\"Browser cache\"] --> CDN[\"CDN edge\"]:::s0 --> RP[\"Reverse proxy\"] --> APP[\"App in-process cache\"] --> DC[\"Distributed cache\"]:::s1 --> DB[\"DB buffer pool\"]:::s2" },
      { t: "Cache-aside (lazy loading)", x: "The most common pattern: the application checks the cache, and on a miss loads from the database and populates the cache.",
        p: ["Only requested data is cached", "Cache failure isn't fatal: the app falls back to the DB (if it can handle the load)", "First request for each key is slow (cold miss)", "On writes, update the DB, then delete (invalidate) the cache key"],
        m: "sequenceDiagram\n  participant A as App\n  participant C as Cache\n  participant D as Database\n  A->>C: GET user:42\n  C-->>A: miss\n  A->>D: SELECT user 42\n  D-->>A: row\n  A->>C: SET user:42 (TTL 10 min)\n  Note over A,D: On update: write DB, then DELETE user:42" },
      { t: "Read-through and write-through", x: "Here the cache sits in the data path and talks to the database itself, so application code stays simpler.",
        p: ["Read-through: app asks only the cache; on a miss, the cache loads from the DB", "Write-through: writes go to the cache, which synchronously writes to the DB", "Cache stays fresh for written data; writes are slower (two writes)", "May fill the cache with data that's never read"],
        m: "flowchart LR\n  A[\"App\"] -->|\"read / write\"| C[\"Cache\"]:::s1\n  C -->|\"miss: load\"| D[\"Database\"]:::s2\n  C -->|\"write-through: sync write\"| D" },
      { t: "Write-back and write-around", x: "Two more write strategies with sharper trade-offs.",
        table: [["Strategy", "Write path", "Pros", "Cons"], ["Write-through", "Cache and DB synchronously", "Cache always fresh", "Slower writes"], ["Write-back (write-behind)", "Cache now, DB later in batches", "Very fast writes, absorbs bursts", "Data loss if cache dies before flush"], ["Write-around", "DB only; cache filled on read", "No cache pollution from write-once data", "Recent writes miss the cache"], ["Cache-aside + invalidate", "DB, then delete cache key", "Simple, common", "Brief staleness windows, races"]],
        m: "flowchart LR\n  W[\"Write\"] --> WT[\"Write-through: cache + DB now\"]:::s0\n  W --> WB[\"Write-back: cache now, DB later\"]:::s1\n  W --> WA[\"Write-around: DB only\"]:::s2" },
      { t: "Eviction policies", x: "Memory is finite. When the cache is full, an eviction policy picks what to drop.",
        table: [["Policy", "Evicts", "Notes"], ["LRU", "Least recently used", "Most common default; good for recency-heavy access"], ["LFU", "Least frequently used", "Keeps long-term popular items; slow to adapt"], ["FIFO", "Oldest inserted", "Simple, ignores popularity"], ["TTL", "Items past their expiry time", "Bounds staleness; combine with LRU/LFU"], ["Random", "A random item", "Cheap; surprisingly decent"]],
        p: ["Redis supports policies such as allkeys-lru, allkeys-lfu and volatile-ttl", "Try LRU vs LFU vs FIFO in the simulator below"],
        m: "flowchart LR\n  F[\"Cache full + new item\"]:::bad --> P{\"Policy\"}\n  P --> LRU[\"Drop least recently used\"]:::s0\n  P --> LFU[\"Drop least frequently used\"]:::s1\n  P --> TTL[\"Drop expired first\"]:::s2" },
      { t: "Invalidation: the hard part", x: "\"There are only two hard things in Computer Science: cache invalidation and naming things.\" (Phil Karlton). The cache must not serve data that's too stale.",
        p: ["TTL: every entry expires; bounds staleness, simplest safety net", "Delete on write: after updating the DB, delete the key so the next read reloads", "Prefer delete over update: avoids racing writers leaving an old value", "Versioned keys: user:42:v7; bump the version on change", "Event-driven: change data capture (CDC) streams DB changes to invalidate caches"],
        m: "sequenceDiagram\n  participant A as App\n  participant D as Database\n  participant C as Cache\n  A->>D: UPDATE user 42\n  D-->>A: ok\n  A->>C: DELETE user:42\n  Note over C: Next read misses and reloads fresh data" },
      { t: "Failure modes and fixes", x: "Caches introduce their own failure patterns. Interviewers like these.",
        table: [["Problem", "What happens", "Fixes"], ["Stampede (thundering herd)", "A hot key expires; thousands of requests hit the DB at once", "Request coalescing / single-flight, a lock per key, refresh before expiry"], ["Avalanche", "Many keys expire together, or the cache cluster restarts cold", "Add random jitter to TTLs, warm the cache, replicate cache nodes"], ["Penetration", "Requests for keys that don't exist always miss", "Cache negative results briefly, Bloom filter of existing keys"], ["Hot key", "One key gets enormous traffic, overloading one cache node", "Replicate the key, local in-process cache, split the key"]],
        m: "flowchart LR\n  E[\"Hot key expires\"]:::bad --> M[\"1,000 concurrent misses\"]:::bad --> D[\"DB overload\"]:::bad\n  E -.-> L[\"Fix: one request reloads, others wait\"]:::s2" },
      { t: "CDNs: caching at the edge", x: "A Content Delivery Network is a fleet of edge servers worldwide that cache content close to users, cutting latency and origin load.",
        p: ["Pull CDN: edge fetches from your origin on the first miss, then caches (most common)", "Push CDN: you upload content to the CDN ahead of time (large, rarely changing files)", "HTTP headers control caching: Cache-Control: max-age, s-maxage, ETag, no-store", "Invalidate via purge APIs, or use versioned file names (app.3f9a.js) so new content gets new URLs", "Also provide TLS termination, DDoS protection and compression"],
        m: "flowchart LR\n  U1[\"User in Delhi\"] --> E1[\"Edge Mumbai\"]:::s0\n  U2[\"User in London\"] --> E2[\"Edge London\"]:::s0\n  E1 -->|\"miss only\"| O[\"Origin (object storage / app)\"]:::s2\n  E2 -->|\"miss only\"| O" },
      { t: "Distributed caches: Redis and Memcached", x: "A shared cache cluster serves all app servers, so a value cached by one is a hit for all.",
        table: [["", "Memcached", "Redis"], ["Data model", "Simple key → value strings", "Strings, hashes, lists, sets, sorted sets, streams"], ["Persistence", "None (pure cache)", "Optional (snapshots, append-only file)"], ["Replication", "Not built in", "Primary–replica, Redis Cluster sharding"], ["Threads", "Multi-threaded", "Mainly single-threaded command execution"], ["Typical use", "Plain object cache", "Cache plus counters, leaderboards, rate limits, queues"]],
        p: ["Keys are spread over nodes with hashing (often consistent hashing, see F13)"],
        m: "flowchart LR\n  A1[\"App 1\"] --> R[\"Client-side hashing / cluster\"]:::s0\n  A2[\"App 2\"] --> R\n  R --> N1[\"Cache node 1\"]:::s1\n  R --> N2[\"Cache node 2\"]:::s1\n  R --> N3[\"Cache node 3\"]:::s1" },
      { t: "Caching in interviews", x: "Say what you cache, where, with which pattern, how it's invalidated, and what happens when the cache fails.",
        p: ["'Cache-aside in Redis for user profiles, TTL 10 minutes with jitter, delete on update.'", "'Images served via CDN with versioned URLs; origin is object storage.'", "'Hot-key protection with request coalescing.'", "Estimate size: 80/20 rule on daily read volume (lesson F03)", "Say what's acceptable staleness for each data type"],
        m: "flowchart LR\n  W[\"What\"] --> WH[\"Where\"] --> P[\"Pattern\"] --> I[\"Invalidation\"] --> F[\"Failure plan\"]:::s0" }
    ],
    widget: { heading: "Cache hit-ratio simulator", caption: "Simulated stream of 20,000 reads over 1,000 keys with Zipf-distributed popularity (a common model of real access skew). Results are illustrative.", render: widget },
    examples: [
      ["Facebook Memcache", "'Scaling Memcache at Facebook' (NSDI 2013) describes a huge Memcached deployment with leases to prevent stale sets and thundering herds."],
      ["Twitter and Redis", "Twitter has described using Redis heavily for timelines, keeping recent tweet IDs per user in memory."],
      ["Netflix Open Connect", "Netflix runs its own CDN, placing Open Connect appliances inside ISP networks to serve video close to viewers."],
      ["Versioned static assets", "Build tools emit file names with content hashes (e.g. main.3f9a2c.js) so assets can be cached for a year and still update instantly on deploy."]
    ],
    pitfalls: [
      "Adding a cache with no invalidation or TTL plan",
      "Updating the cache on write instead of deleting it (race conditions leave stale data)",
      "Ignoring stampedes on hot keys and avalanches from synchronized TTLs",
      "Caching everything, including data that's rarely read",
      "Assuming the database can handle full load if the cache cluster fails",
      "Forgetting CDNs for media: serving images from app servers"
    ],
    quiz: [
      ["In cache-aside, what should the app usually do after updating a row in the database?", ["Nothing", "Delete the related cache key", "Restart the cache", "Write a new row"], 1, "Deleting forces the next read to load fresh data and avoids races where an older value overwrites a newer one."],
      ["Which write strategy is fastest for writes but risks data loss if the cache node fails?", ["Write-through", "Write-around", "Write-back (write-behind)", "Cache-aside"], 2, "Write-back acknowledges after writing to the cache and persists later, so unflushed writes can be lost."],
      ["A very popular key expires and thousands of requests hit the database simultaneously. What is this called?", ["Cache penetration", "Cache stampede (thundering herd)", "Cache warming", "Write-around"], 1, "Fixes include request coalescing, per-key locks and refreshing ahead of expiry."],
      ["What does adding random jitter to TTLs prevent?", ["Hot keys", "Many keys expiring at the same moment (avalanche)", "Stale reads", "Bloom filter false positives"], 1, "Jitter spreads expiries over time so the DB isn't hit by a wave of misses."],
      ["Requests for user IDs that don't exist keep hitting the database. Which fix fits?", ["Longer TTLs", "Cache negative results or use a Bloom filter of valid IDs", "Write-back caching", "Bigger CDN"], 1, "This is cache penetration; caching 'not found' briefly or filtering with a Bloom filter stops it."],
      ["How do versioned asset file names (app.3f9a.js) help CDN caching?", ["They compress files", "New content gets a new URL, so old copies can be cached for a long time without purging", "They enable push CDNs only", "They disable browser caches"], 1, "Changing the URL on every content change sidesteps invalidation entirely."],
      ["Which statement about Redis vs Memcached is correct?", ["Memcached supports sorted sets", "Redis offers richer data types and optional persistence", "Redis cannot replicate", "Memcached persists to disk by default"], 1, "Redis has strings, hashes, lists, sets, sorted sets, streams and optional persistence; Memcached is a simple in-memory key-value cache."],
      ["With uniform (no-skew) access over 1,000 keys and a cache of 100 items, the hit ratio is about…", ["1%", "10%", "50%", "90%"], 1, "With no popularity skew, the chance a random key is cached is about 100/1,000."]
    ],
    payload: null,
    practice: {
      q: "A product detail page gets 50K reads/s at peak and product data changes a few times a day. Prices must never be more than 1 minute stale. Design the caching.",
      a: [
        ["Layers", "CDN for images and static assets; Redis cluster for product objects; optionally a small in-process cache for the hottest products."],
        ["Pattern", "Cache-aside: read Redis, on miss load from DB and SET with a TTL."],
        ["Freshness for price", "Store price with a short TTL (e.g. 60 s with jitter) or separate the price into its own key; on price change, delete the key immediately (event or CDC)."],
        ["Sizing", "If 1 million products × 5 KB = 5 GB, the whole catalogue fits in RAM across a few nodes; replicate for availability."],
        ["Stampede and hot keys", "Request coalescing for misses; refresh-ahead for top sellers; replicate very hot keys or cache them in-process for a few seconds."],
        ["Failure plan", "If Redis fails, rate-limit DB fallbacks and serve slightly stale data from the in-process cache; monitor hit ratio and DB QPS."],
        ["Trade-offs", "Shorter TTLs = fresher prices but more DB load; delete-on-write adds coupling to the write path."]
      ]
    },
    recap: [
      "Caches exploit skew: a small hot set serves most reads; track hit ratio.",
      "Cache-aside is the default: read cache, load on miss, delete on write.",
      "Eviction (LRU/LFU) handles space; TTL + invalidation handle staleness.",
      "Guard against stampedes, avalanches, penetration and hot keys.",
      "CDNs cache at the edge; use Cache-Control headers and versioned URLs."
    ]
  });
})();
