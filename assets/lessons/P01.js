/* Lesson P01: URL shortener (TinyURL) */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.w) { s.w = 100; s.ratio = 100; s.yrs = 10; s.len = 7; s.peak = 3; }
    var F = [["w", "New short URLs per day (millions)", 1, 1000, 1], ["ratio", "Reads per write", 1, 1000, 1], ["yrs", "Retention (years)", 1, 20, 1], ["len", "Code length (base62 chars)", 5, 9, 1], ["peak", "Peak ÷ average traffic", 1, 10, 1]];
    el.innerHTML = "<div class='grid3'>" + F.map(function (f) { return "<label class='field'>" + f[1] + ": <strong data-v='" + f[0] + "' style='color:var(--text)'></strong><input type='range' min='" + f[2] + "' max='" + f[3] + "' step='" + f[4] + "' data-k='" + f[0] + "'></label>"; }).join("") + "</div>" +
      "<div class='metrics' data-r='m'></div><div class='callout' data-r='c'></div><p class='caption'>Assumptions: ~500 bytes per record (long URL, code, owner, timestamps, index overhead); cache the hottest 20% of a day's reads. Round numbers, as you would in an interview.</p>";
    function fmt(n) { return n >= 1e12 ? (n / 1e12).toFixed(1) + " T" : n >= 1e9 ? (n / 1e9).toFixed(1) + " B" : n >= 1e6 ? (n / 1e6).toFixed(1) + " M" : n >= 1e3 ? (n / 1e3).toFixed(1) + " K" : Math.round(n) + ""; }
    function bytes(b) { return b >= 1e15 ? (b / 1e15).toFixed(1) + " PB" : b >= 1e12 ? (b / 1e12).toFixed(1) + " TB" : b >= 1e9 ? (b / 1e9).toFixed(1) + " GB" : (b / 1e6).toFixed(0) + " MB"; }
    function draw() {
      F.forEach(function (f) { el.querySelector("[data-k='" + f[0] + "']").value = s[f[0]]; });
      el.querySelector("[data-v='w']").textContent = s.w + " M"; el.querySelector("[data-v='ratio']").textContent = s.ratio + ":1"; el.querySelector("[data-v='yrs']").textContent = s.yrs; el.querySelector("[data-v='len']").textContent = s.len; el.querySelector("[data-v='peak']").textContent = s.peak + "×";
      var wps = s.w * 1e6 / 86400, rps = wps * s.ratio, total = s.w * 1e6 * 365 * s.yrs, store = total * 500, space = Math.pow(62, s.len), cache = s.w * 1e6 * s.ratio * 0.2 * 500;
      el.querySelector("[data-r='m']").innerHTML = [[fmt(wps) + "/s", "Avg writes"], [fmt(rps) + "/s", "Avg redirects"], [fmt(rps * s.peak) + "/s", "Peak redirects"], [fmt(total), "Total URLs stored"], [bytes(store), "Storage"], [bytes(cache), "Cache for hot 20%"], [fmt(space), "Codes available"], [(total / space * 100).toFixed(2) + "%", "Keyspace used"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var c = el.querySelector("[data-r='c']"), used = total / space;
      if (used > 0.5) { c.className = "callout"; c.style.borderColor = "var(--danger)"; c.innerHTML = "<strong>Keyspace too small.</strong> Over half the codes would be used — increase the code length."; }
      else { c.className = "callout success"; c.style.borderColor = ""; c.innerHTML = "<strong>Fits.</strong> " + s.len + "-char codes leave plenty of room. Reads dominate (" + s.ratio + ":1), so cache and CDN design matter most."; }
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P01",
    summary: "The classic warm-up design: turn long URLs into short codes and redirect at very high read volume. Walks the full interview framework — requirements, estimates, API, data model, architecture, ID generation, caching, redirects, analytics and trade-offs.",
    slides: [
      { t: "1. Requirements", x: "Clarify scope before drawing anything.",
        p: ["Functional: create a short URL for a long URL; redirect short → long; optional custom alias and expiry; optional click analytics", "Non-functional: very high availability for redirects; low latency (tens of ms); codes unpredictable enough not to be trivially enumerated (ask!)", "Read-heavy: e.g. 100 reads per write", "Out of scope unless asked: user accounts UI, link editing, spam detection details"],
        m: "flowchart LR\n  U[\"User\"] -->|\"long URL\"| S[\"Shortener\"]:::s0 -->|\"sho.rt/aZ3k9Qx\"| U\n  V[\"Visitor\"] -->|\"GET /aZ3k9Qx\"| S -->|\"301/302 → long URL\"| V" },
      { t: "2. Back-of-the-envelope estimates", x: "Example numbers (state your assumptions; use the calculator below to vary them).",
        table: [["Quantity", "Estimate"], ["Writes", "100 M/day ≈ 1,200/s"], ["Reads (100:1)", "10 B/day ≈ 115,000/s avg, ~350,000/s peak"], ["Records over 10 years", "100 M × 365 × 10 ≈ 365 B"], ["Storage (500 B each)", "≈ 183 TB"], ["Keyspace, 7 base62 chars", "62⁷ ≈ 3.5 trillion — enough"]],
        m: "flowchart LR\n  W[\"1.2k writes/s\"]:::s1 --> SYS[\"Service\"]\n  R[\"115k reads/s\"]:::s0 --> SYS\n  SYS --> ST[(\"≈ 180 TB over 10 years\")]:::s2" },
      { t: "3. API", x: "Two core endpoints.",
        p: ["POST /v1/urls {long_url, custom_alias?, expires_at?} → 201 {short_url, code}", "GET /{code} → 301 or 302 with Location: long_url; 404 if unknown; 410 if expired", "Optional: GET /v1/urls/{code}/stats → click counts", "Auth via API key for creators; rate-limit creation (F19) to stop abuse"],
        m: "sequenceDiagram\n  participant C as Client\n  participant A as API\n  C->>A: POST /v1/urls {long_url}\n  A-->>C: 201 {short_url: sho.rt/aZ3k9Qx}\n  C->>A: GET /aZ3k9Qx\n  A-->>C: 302 Location: https://example.com/very/long/path" },
      { t: "4. Data model", x: "A single, simple table — a key-value access pattern.",
        table: [["Column", "Type", "Note"], ["code", "varchar(8) PK", "lookup key"], ["long_url", "text", "up to ~2 KB"], ["owner_id", "bigint", "optional"], ["created_at", "timestamp", ""], ["expires_at", "timestamp", "nullable"]],
        p: ["Access is almost only 'get by code' → a key-value / wide-column store (DynamoDB, Cassandra) or sharded SQL both work", "Shard by code (hash) for even spread (F12)", "Optional index long_url → code to return existing codes (dedupe), if required"],
        m: "flowchart LR\n  K[\"code (partition key)\"]:::s1 --> V[\"long_url, owner_id, created_at, expires_at\"]:::s0" },
      { t: "5. High-level architecture", x: "Separate the write path from the much hotter read path.",
        m: "flowchart LR\n  U[\"Clients\"] --> LB[\"Load balancer\"]:::s1\n  LB --> WS[\"Write service\"]:::s0\n  LB --> RS[\"Redirect service\"]:::s0\n  WS --> IDG[\"ID generator (ranges)\"]:::s2\n  WS --> DB[(\"URL store (sharded)\")]\n  RS --> CA[(\"Redis cache\")]:::s2\n  CA -. \"miss\" .-> DB\n  RS -->|\"click event\"| K[(\"Kafka\")] --> AN[\"Analytics\"]",
        p: ["Stateless services behind load balancers, scaled horizontally (F01)", "Cache-aside in Redis for hot codes (F07)", "Click events sent asynchronously so analytics never slows redirects (F16)"] },
      { t: "6. Deep dive: generating codes", x: "Three common approaches.",
        table: [["Approach", "How", "Trade-off"], ["Counter + base62", "Unique numeric ID (range allocation or Snowflake, F25) → base62", "No collisions; sequential codes are guessable unless shuffled"], ["Hash + truncate", "MD5/SHA-256(long_url) → first 7 base62 chars", "Same URL → same code; collisions must be checked and resolved"], ["Random + check", "Random 7 chars, insert if not exists", "Simple; collision checks grow as space fills"]],
        p: ["Common answer: range-allocated counter → optionally permute (e.g. with a reversible bijection) → base62 → 7 chars"],
        m: "flowchart LR\n  RG[\"Range server: block 5,000,000–5,009,999\"]:::s1 --> W[\"Write service picks 5,000,123\"] --> B62[\"base62 → '0lAt'… padded to 7\"]:::s0 --> DB[(\"insert code\")]" },
      { t: "7. Deep dive: redirects and caching", x: "The redirect path must be fast and cheap.",
        pros: ["301 Moved Permanently: browsers and proxies can cache it → fewer hits on you"], cons: ["301: you lose click analytics and can't change the target easily; 302/307 hits you every time"],
        p: ["Most shorteners with analytics use 302 (or 301 with short cache lifetimes)", "Redis cache of code → long_url; LRU; ~20% of daily hot codes fit in memory", "CDN/edge caching of redirects possible with short TTLs", "Negative caching for unknown codes to absorb scans"],
        m: "flowchart LR\n  V[\"Visitor\"] --> RS[\"Redirect service\"]:::s0 --> C{\"Redis hit?\"}:::s2\n  C -->|\"yes (~90%+)\"| R[\"302 Location\"]\n  C -->|\"no\"| DB[(\"URL store\")] --> FILL[\"fill cache\"] --> R" },
      { t: "8. Deep dive: analytics, expiry, abuse", x: "Supporting features without hurting the hot path.",
        p: ["Analytics: redirect service emits {code, time, referrer, country} to Kafka; stream job aggregates counts per code per hour into an OLAP store", "Expiry: check expires_at on read; TTL in the store or a background cleanup job", "Abuse: rate-limit creation per key/IP; scan long URLs against malware/phishing lists; allow takedowns", "Custom aliases: insert with a uniqueness check; reserve offensive/system words"],
        m: "flowchart LR\n  RS[\"Redirect service\"] --> K[(\"Kafka clicks\")]:::s1 --> SP[\"Stream aggregation\"]:::s0 --> OL[(\"OLAP store\")]:::s2 --> D[\"Stats API\"]" },
      { t: "9. Bottlenecks and trade-offs", x: "What to say when the interviewer pushes.",
        p: ["Hot links (a viral code): cache + CDN; replicate hot keys", "DB growth (~180 TB): shard by code; old/expired data to cheaper storage", "ID generator as SPOF: range allocation with several servers; blocks survive brief outages", "Multi-region: replicate the URL store; reads served locally; writes go to any region with region-partitioned ID ranges", "Consistency: a new link must work immediately for its creator → write-through to cache or read from primary briefly"],
        m: "flowchart LR\n  HOT[\"Viral code\"] --> CDN[\"CDN / edge cache\"]:::s2\n  GROW[\"Growth\"] --> SH[\"Shard by code\"]:::s0\n  SPOF[\"ID SPOF\"] --> RNG[\"Range allocation\"]:::s1" },
      { t: "10. Wrap-up", x: "A 30-second summary for the end of the interview.",
        p: ["Write path: API → range-based ID → base62 code → sharded KV store", "Read path: redirect service → Redis (cache-aside) → store; 302 for analytics", "Clicks to Kafka → aggregated stats", "Scales horizontally; hot links absorbed by cache/CDN; keyspace sized for 10+ years"],
        m: "flowchart LR\n  C[\"Create\"] --> ID[\"ID → base62\"]:::s1 --> KV[(\"KV store\")]:::s0\n  G[\"Redirect\"] --> RC[(\"Redis\")]:::s2 --> KV\n  G --> K[\"Kafka → stats\"]" }
    ],
    widget: { heading: "URL shortener capacity estimator", caption: "Change traffic, retention and code length to see QPS, storage, cache size and keyspace usage.", render: widget },
    examples: [
      ["TinyURL", "Launched in 2002, one of the first widely used URL shorteners."],
      ["Bitly", "Offers branded short links with click analytics; analytics is a core product, which favours redirects that reach its servers."],
      ["t.co", "X/Twitter wraps every link in t.co to measure clicks and check links for malicious content."],
      ["goo.gl", "Google shut down its shortener for new links in 2019 and announced that existing goo.gl links would stop redirecting in August 2025 — a reminder that 'forever' links are a product promise."]
    ],
    pitfalls: [
      "Skipping estimates — the 100:1 read ratio drives the whole design",
      "Hash-and-truncate without collision handling",
      "Choosing 301 without noting it breaks analytics",
      "One global counter as a bottleneck/SPOF",
      "Counting clicks synchronously in the redirect path",
      "Ignoring abuse (phishing links) and rate limiting"
    ],
    quiz: [
      ["How many 7-character base62 codes exist?", ["~56 billion", "~3.5 trillion", "~800 million", "~62 million"], 1, "62⁷ ≈ 3.52 × 10¹²."],
      ["100 M new URLs/day is roughly how many writes per second?", ["~120", "~1,200", "~12,000", "~100,000"], 1, "100,000,000 ÷ 86,400 ≈ 1,157."],
      ["Why might a shortener use 302 instead of 301?", ["302 is faster", "Every click reaches the service, enabling analytics and changing targets", "301 is deprecated", "302 is cached forever"], 1, "301 can be cached by browsers."],
      ["Main risk of hash-and-truncate codes?", ["Too long", "Collisions between different URLs", "Can't use base62", "Requires 2PC"], 1, "Check for an existing different URL and retry/salt."],
      ["Best place for click counting?", ["Synchronously in the redirect before responding", "Asynchronously via events to a stream processor", "In the browser only", "In DNS"], 1, "Keeps redirects fast."],
      ["Which store fits 'get long URL by code' at huge scale?", ["Graph database", "Key-value / wide-column store sharded by code", "Single MySQL table on one server", "Object storage only"], 1, "Simple key lookups, easy horizontal scaling."],
      ["How do you avoid an ID-generator bottleneck?", ["One counter row locked per write", "Range allocation: each server takes blocks of IDs", "Random IDs with no checks", "Use timestamps only"], 1, "One coordination call per block."],
      ["A viral short link gets 1M hits/minute. First defence?", ["Bigger database", "Cache (Redis) and CDN/edge caching", "More write servers", "Email the user"], 1, "Reads of one hot key are perfect for caching."]
    ],
    practice: {
      q: "Your interviewer adds: 'Links must be created and resolved in three regions (US, EU, India), with redirects under 50 ms worldwide, and a link created in India must work in the US within a second.' How do you change the design?",
      a: [
        ["IDs", "Partition the ID space by region (e.g. region bits or separate ranges) so each region generates codes locally without coordination."],
        ["Storage", "Globally replicated KV store (e.g. DynamoDB global tables, Cassandra multi-DC) with async replication, typically sub-second."],
        ["Reads", "Redirect service and Redis in each region; GeoDNS/anycast routes visitors to the nearest region; cache miss reads the local replica."],
        ["Fresh links", "If a local replica lacks the code yet, fall back to the owning region (known from the code's region bits) before returning 404."],
        ["Edge", "Cache redirects at the CDN for popular codes with short TTLs."],
        ["Analytics", "Regional Kafka → aggregated globally in batch."],
        ["Trade-offs", "Async replication gives brief inconsistency, handled by the owner-region fallback; synchronous global writes would add 100+ ms to creation."]
      ]
    },
    recap: [
      "Requirements: shorten + redirect; read-heavy (~100:1); highly available and fast.",
      "Estimates: ~1.2k writes/s, ~115k reads/s, ~180 TB over 10 years, 7-char base62.",
      "Codes from range-allocated IDs + base62 (or hash with collision checks).",
      "Redirect path: Redis cache-aside + CDN; 302 if analytics matter.",
      "Clicks async via Kafka; shard by code; rate-limit creation."
    ]
  });
})();
