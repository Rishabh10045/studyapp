/* Lesson P03: Rate limiter */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.mode) { s.mode = "central"; s.nodes = 20; s.limit = 1000; s.skew = 50; s.rps = 500000; s.sync = 1; }
    el.innerHTML = "<div class='seg' data-r='mode'><button data-m='local'>Local per node (limit ÷ N)</button><button data-m='central'>Central Redis per request</button><button data-m='hybrid'>Local + periodic sync</button></div>" +
      "<div class='grid3'><label class='field'>Gateway nodes: <strong data-v='nodes' style='color:var(--text)'></strong><input type='range' min='2' max='100' data-k='nodes'></label>" +
      "<label class='field'>One client's traffic skew to a single node: <strong data-v='skew' style='color:var(--text)'></strong><input type='range' min='0' max='100' step='5' data-k='skew'></label>" +
      "<label class='field'>Total traffic: <strong data-v='rps' style='color:var(--text)'></strong><input type='range' min='10000' max='2000000' step='10000' data-k='rps'></label></div>" +
      "<label class='field'>Sync interval (hybrid): <strong data-v='sync' style='color:var(--text)'></strong><input type='range' min='0.1' max='10' step='0.1' data-k='sync'></label>" +
      "<div class='metrics' data-r='m'></div><p class='caption' data-r='note'></p>";
    function draw() {
      el.querySelectorAll("[data-m]").forEach(function (b) { b.className = b.getAttribute("data-m") === s.mode ? "active" : ""; });
      ["nodes", "skew", "rps", "sync"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      el.querySelector("[data-v='nodes']").textContent = s.nodes; el.querySelector("[data-v='skew']").textContent = s.skew + "%"; el.querySelector("[data-v='rps']").textContent = s.rps.toLocaleString() + " req/s"; el.querySelector("[data-v='sync']").textContent = s.sync + " s";
      // client sends 2x its limit (2000/min); fraction skew goes to one node, rest spread evenly
      var L = s.limit, sent = 2 * L, N = s.nodes, per = L / N, hot = sent * s.skew / 100 + sent * (1 - s.skew / 100) / N, cold = sent * (1 - s.skew / 100) / N;
      var admitted, redis, lat, note;
      if (s.mode === "local") { admitted = Math.min(hot, per) + (N - 1) * Math.min(cold, per); redis = 0; lat = "0 ms"; note = "No shared state: fast, but a client pinned to one node is cut to limit ÷ N, so it's under-admitted when traffic is skewed."; }
      else if (s.mode === "central") { admitted = L; redis = s.rps; lat = "+~1 ms"; note = "Exact: every request does an atomic Redis op (Lua token bucket). Redis must handle the full request rate; shard keys across a Redis cluster."; }
      else { var over = Math.min(sent - L, (sent / 60) * s.sync * (N - 1) / N); admitted = L + Math.max(0, over); redis = N * 1 / s.sync * 1000; lat = "0 ms"; note = "Nodes count locally and push deltas every " + s.sync + " s; between syncs they can over-admit. Redis load depends on nodes × active keys, not requests (shown for 1,000 active keys)."; }
      el.querySelector("[data-r='m']").innerHTML = [[L + "/min", "Client's limit"], [sent + "/min", "Client sends"], [Math.round(admitted) + "/min", "Admitted"], [((admitted - L) / L * 100).toFixed(0) + "%", "Error vs limit"], [Math.round(redis).toLocaleString() + "/s", "Redis ops"], [lat, "Added latency"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      el.querySelector("[data-r='note']").textContent = note + " Simplified steady-state model.";
    }
    el.querySelector("[data-r='mode']").addEventListener("click", function (e) { var m = e.target.getAttribute("data-m"); if (m) { s.mode = m; ctx.save(); draw(); } });
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P03",
    summary: "Design a distributed rate limiter for an API: requirements, algorithm choice, where it runs, shared counters in Redis with atomic scripts, rules configuration, multi-region accuracy, failure modes and client responses.",
    slides: [
      { t: "1. Requirements", x: "Ask what is being limited and how strictly.",
        p: ["Functional: limit requests per client key (API key / user / IP) per rule (e.g. 100/min free, 2,000/min paid; /login 5/min per account)", "Return 429 with Retry-After and quota headers when exceeded", "Rules changeable without deploys", "Non-functional: adds ≤ ~1–2 ms latency; highly available; accurate enough (small over-admission OK?); scales to 1M+ req/s"],
        m: "flowchart LR\n  C[\"Clients\"] --> RL{\"Limiter\"}:::s1\n  RL -->|\"allowed\"| API[\"API\"]:::s0\n  RL -->|\"429 + Retry-After\"| C" },
      { t: "2. Estimates", x: "Example: 1 M requests/s across 50 gateway nodes; 10 M active API keys.",
        table: [["Quantity", "Estimate"], ["Limiter checks", "1 M/s (one per request)"], ["State per key (token bucket)", "~2 numbers + key ≈ 50–100 bytes"], ["Memory for 10 M keys", "≈ 1 GB — fits in a Redis cluster easily"], ["Redis ops", "~1 M/s → shard across several Redis primaries"]],
        m: "flowchart LR\n  RPS[\"1M req/s\"] --> G[\"50 gateways\"]:::s0 --> R[(\"Redis cluster ~1M ops/s, ~1 GB\")]:::s1" },
      { t: "3. API and rules", x: "The limiter is internal; its 'API' is a check call and a rules config.",
        p: ["allow(key, rule) → {allowed, remaining, reset_at}", "Rules (YAML/DB): {match: route + tier, algorithm: token_bucket, rate: 2000/min, burst: 200}", "Rules service pushes or gateways poll and cache rules", "Response headers to clients: Retry-After, X-RateLimit-Limit / -Remaining / -Reset"],
        m: "flowchart LR\n  ADMIN[\"Admin / config repo\"] --> RS[(\"Rules store\")]:::s1 --> GW[\"Gateways cache rules\"]:::s0\n  GW --> CHK[\"allow(key, rule)\"]" },
      { t: "4. Algorithm choice", x: "Recap of F19 — choose and justify.",
        table: [["Algorithm", "Memory", "Bursts", "Accuracy"], ["Token bucket", "2 values/key", "Allows up to capacity", "Good"], ["Fixed window", "1 counter/key", "2× at boundaries", "Rough"], ["Sliding window log", "1 entry/request", "None", "Exact"], ["Sliding window counter", "2 counters/key", "Smoothed", "Approximate, good"]],
        p: ["Common default: token bucket (bursts OK, cheap) or sliding window counter"],
        m: "flowchart LR\n  N{\"Need bursts?\"} -->|\"yes\"| TB[\"Token bucket\"]:::s0\n  N -->|\"no, smooth\"| SW[\"Sliding window counter\"]:::s2" },
      { t: "5. High-level architecture", x: "Limiter as middleware in the API gateway, backed by Redis.",
        m: "flowchart LR\n  C[\"Clients\"] --> EDGE[\"CDN / WAF (per-IP floods)\"]:::s2 --> LB[\"Load balancer\"]\n  LB --> GW1[\"Gateway + limiter\"]:::s0\n  LB --> GW2[\"Gateway + limiter\"]:::s0\n  GW1 --> R[(\"Redis cluster\")]:::s1\n  GW2 --> R\n  GW1 --> SVC[\"Backend services\"]\n  RULES[\"Rules service\"] --> GW1\n  RULES --> GW2\n  GW1 -.-> MET[\"Metrics: allowed / limited per rule\"]",
        p: ["Alternative: a separate rate-limit service (e.g. Envoy's global rate limit service) called over gRPC", "Layered: coarse per-IP at the edge, precise per-key at the gateway"] },
      { t: "6. Deep dive: atomic counters in Redis", x: "Read-modify-write across many gateways must be atomic.",
        p: ["Token bucket in a Lua script: read tokens + timestamp, refill by elapsed time, take one if available, write back, set TTL — all atomic in Redis", "Fixed window: INCR key; on first increment set EXPIRE", "Use Redis Cluster; key = rl:{api_key}:{rule} so each key lives on one shard", "Pipelining and connection pools keep the extra latency ~sub-millisecond in-region"],
        m: "sequenceDiagram\n  participant G as Gateway\n  participant R as Redis\n  G->>R: EVALSHA token_bucket rl:{k42}:search now rate burst\n  Note over R: refill, check, decrement atomically\n  R-->>G: allowed=1, remaining=37\n  G->>G: forward request" },
      { t: "7. Deep dive: accuracy vs latency", x: "A Redis call per request is exact but adds load and a dependency. Alternatives trade accuracy.",
        p: ["Local-only (limit ÷ N per node): no network, but unfair if traffic is uneven across nodes", "Local + async sync: count locally, push deltas every ~1 s; slight over-admission", "Sticky routing by key (consistent hashing, F13) → each key's counter lives on one node", "Pick based on how strict the limit must be (billing vs abuse protection)"],
        m: "flowchart LR\n  EX[\"Exact: Redis per request\"]:::s0 --- AP[\"Approximate: local + sync\"]:::s1 --- ST[\"Sticky: hash key → node\"]:::s2" },
      { t: "8. Deep dive: failures and multi-region", x: "The limiter must not become the outage.",
        p: ["Redis down or slow: timeout quickly (~5 ms) and fail open with local fallback limits, alert", "Security-critical limits (login, OTP) may fail closed", "Multi-region: per-region limits (split quota by region share) — simple, slight inaccuracy; or route each key to a home region; global exact counts across regions add 100+ ms, usually not worth it", "Hot keys (one huge customer): local pre-aggregation or dedicated shard"],
        m: "flowchart LR\n  G[\"Gateway\"] --> R{\"Redis reachable within 5 ms?\"}\n  R -->|\"yes\"| N[\"normal check\"]:::s0\n  R -->|\"no\"| F[\"fail open + local coarse limit + alert\"]:::s1" },
      { t: "9. Bottlenecks and trade-offs", x: "Summary of the knobs.",
        table: [["Concern", "Choice"], ["Accuracy", "Central Redis (exact) vs local (approximate)"], ["Latency", "Local checks or same-region Redis"], ["Availability", "Fail-open default; fail-closed for security limits"], ["Fairness", "Key by user/API key, not just IP"], ["Operability", "Rules hot-reload, dashboards of limited requests per rule, dry-run mode for new rules"]],
        m: "flowchart LR\n  A[\"Accuracy\"]:::s0 <--> L[\"Latency\"]:::s1\n  L <--> AV[\"Availability\"]:::s2" },
      { t: "10. Wrap-up", x: "30-second summary.",
        p: ["Token bucket per (key, rule) in the API gateway", "State in a Redis cluster updated by an atomic Lua script; TTL for idle keys", "Rules service with hot reload; per-IP limits at the edge", "429 + Retry-After + quota headers; clients back off with jitter", "Fail open with local fallback; per-region quotas for multi-region"],
        m: "flowchart LR\n  E[\"Edge per-IP\"]:::s2 --> G[\"Gateway token bucket\"]:::s0 --> R[(\"Redis Lua\")]:::s1\n  G --> H[\"429 + headers\"]" }
    ],
    widget: { heading: "Distributed limiter accuracy explorer", caption: "One client sends twice its 1,000/min limit. Compare local, central and hybrid counting across many gateway nodes.", render: widget },
    examples: [
      ["Envoy global rate limiting", "Envoy proxies can call an external rate limit service (the open-source Lyft ratelimit service, backed by Redis) over gRPC."],
      ["Stripe", "Described using several limiter types — request rate, concurrent requests, and load shedders — built on Redis."],
      ["GitHub API", "Returns x-ratelimit-limit, -remaining, -used and -reset headers so clients can pace themselves."],
      ["Cloudflare", "Applies rate limiting at its edge network, close to clients, before traffic reaches origin servers."]
    ],
    pitfalls: [
      "Non-atomic GET-then-SET counters across gateways",
      "A single Redis instance as a hard dependency with no timeout or fallback",
      "Only IP-based keys for authenticated APIs",
      "Global synchronous counters across regions (latency explosion)",
      "No visibility: can't tell which rule is rejecting whom",
      "Forgetting TTLs, so idle keys fill memory"
    ],
    quiz: [
      ["Why use a Lua script for a Redis token bucket?", ["It's faster to write", "It makes the read-refill-decrement sequence atomic", "Redis requires it", "To encrypt the key"], 1, "Concurrent gateways can't interleave inside one script."],
      ["Main downside of 'limit ÷ N' local limiting?", ["Needs Redis", "Unfair or inaccurate when a client's traffic is uneven across nodes", "Too slow", "Can't return 429"], 1, "A client pinned to one node gets only 1/N of its quota."],
      ["Redis is unreachable. Typical choice for a general API limit?", ["Fail closed (reject all)", "Fail open with local coarse limits and alert", "Crash the gateway", "Retry forever"], 1, "Don't turn a limiter outage into a full outage."],
      ["How to handle limits across 3 regions cheaply?", ["Synchronous global counter", "Per-region quotas or a home region per key", "No limits", "Client-side limiting only"], 1, "Avoids cross-region latency on every request."],
      ["Which header tells clients when to retry?", ["Location", "Retry-After", "ETag", "Content-Length"], 1, "Sent with 429 (or 503)."],
      ["Memory for 10 M token-bucket keys at ~100 bytes each?", ["~1 MB", "~1 GB", "~1 TB", "~100 GB"], 1, "10⁷ × 100 B = 10⁹ B."],
      ["Where should per-IP flood protection live?", ["Deep inside each service", "At the edge (CDN/WAF)", "In the database", "In the client"], 1, "Stop floods before they cost you."],
      ["Why include the rule in the Redis key (rl:{key}:{rule})?", ["Different rules for the same client need separate counters", "Redis requires two parts", "It compresses data", "For TLS"], 0, "E.g. global limit and /search limit counted separately."]
    ],
    practice: {
      q: "The interviewer asks: 'Some enterprise customers want limits on concurrent in-flight requests (max 50 at once), not just requests per minute. Add that.'",
      a: [
        ["Model", "A concurrency limiter is a counting semaphore per key: increment on request start, decrement on finish."],
        ["Implementation", "Redis sorted set per key with request ids scored by start time: ZADD on start if ZCARD < 50 (atomic Lua), ZREM on completion."],
        ["Leaks", "If a gateway crashes, decrements never happen → entries expire by score (remove ids older than the max request timeout before checking)."],
        ["Response", "Over limit → 429 with a short Retry-After."],
        ["Combination", "Run both limiters: rate (token bucket) and concurrency; reject if either says no."],
        ["Trade-offs", "Two Redis ops per request (start and end); local-only concurrency limits are simpler if requests are sticky per node."]
      ]
    },
    recap: [
      "Clarify keys, rules, strictness, latency budget and fail behaviour.",
      "Token bucket per (key, rule) at the gateway; per-IP limits at the edge.",
      "Atomic Redis Lua scripts for shared state; TTL idle keys.",
      "Trade accuracy for latency with local or hybrid counting.",
      "429 + Retry-After; fail open with local fallback; per-region quotas."
    ]
  });
})();
