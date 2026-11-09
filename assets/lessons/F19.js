/* Lesson F19: Rate limiting */
(function () {
  "use strict";
  var H = window.HLD;
  var PATTERNS = {
    steady: function (t) { return 8; },
    burst: function (t) { return t % 10 === 5 ? 40 : 3; },
    edge: function (t) { return (t % 10 === 9 || t % 10 === 0) ? 25 : 0; }
  };

  function simulate(s) {
    var out = [], tokens = s.cap, winCount = 0, log = [];
    for (var t = 0; t < 30; t++) {
      var n = PATTERNS[s.pat](t), ok = 0;
      if (s.algo === "tb") { tokens = Math.min(s.cap, tokens + (t ? s.rate : 0)); ok = Math.min(n, Math.floor(tokens)); tokens -= ok; }
      else if (s.algo === "fw") { if (t % 10 === 0) winCount = 0; var lim = s.rate * 10; ok = Math.max(0, Math.min(n, lim - winCount)); winCount += ok; }
      else { log = log.filter(function (x) { return x[0] > t - 10; }); var used = log.reduce(function (a, x) { return a + x[1]; }, 0); ok = Math.max(0, Math.min(n, s.rate * 10 - used)); log.push([t, ok]); }
      out.push([n, ok]);
    }
    return out;
  }

  function widget(el, ctx) {
    var s = ctx.state; if (!s.algo) { s.algo = "tb"; s.pat = "burst"; s.cap = 20; s.rate = 5; }
    el.innerHTML = "<div class='seg' data-g='algo'><button data-v='tb'>Token bucket</button><button data-v='fw'>Fixed window (10 s)</button><button data-v='sw'>Sliding window log (10 s)</button></div>" +
      "<div class='seg' data-g='pat'><button data-v='steady'>Steady 8/s</button><button data-v='burst'>Burst of 40 every 10 s</button><button data-v='edge'>Bursts at window edges</button></div>" +
      "<div class='grid2'><label class='field'>Rate (tokens/s, or limit ÷ 10 s): <strong data-o='rate' style='color:var(--text)'></strong><input type='range' min='1' max='20' data-k='rate'></label>" +
      "<label class='field'>Bucket capacity (token bucket only): <strong data-o='cap' style='color:var(--text)'></strong><input type='range' min='1' max='60' data-k='cap'></label></div>" +
      "<div class='metrics' data-r='m'></div><div data-r='chart'></div><p class='caption' data-r='note'></p>";
    function draw() {
      ["algo", "pat"].forEach(function (g) { el.querySelectorAll("[data-g='" + g + "'] button").forEach(function (b) { b.className = b.getAttribute("data-v") === s[g] ? "active" : ""; }); });
      ["rate", "cap"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; el.querySelector("[data-o='" + k + "']").textContent = s[k]; });
      var r = simulate(s), tot = 0, ok = 0, peak10 = 0;
      r.forEach(function (x) { tot += x[0]; ok += x[1]; });
      for (var i = 0; i + 10 <= 30; i++) { var w = 0; for (var j = i; j < i + 10; j++) w += r[j][1]; peak10 = Math.max(peak10, w); }
      el.querySelector("[data-r='m']").innerHTML = [[tot, "Requests sent (30 s)"], [ok, "Allowed"], [tot - ok, "Rejected (429)"], [peak10, "Max allowed in any 10 s"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var W = 600, Hh = 120, mx = Math.max.apply(null, r.map(function (x) { return x[0]; })) || 1, bw = W / 30;
      el.querySelector("[data-r='chart']").innerHTML = "<svg viewBox='0 0 " + W + " " + (Hh + 30) + "' width='100%' role='img' aria-label='Allowed and rejected requests per second'>" +
        r.map(function (x, t) { var hA = x[1] / mx * Hh, hR = (x[0] - x[1]) / mx * Hh; return "<rect x='" + (t * bw + 2) + "' y='" + (Hh - hA) + "' width='" + (bw - 4) + "' height='" + hA + "' fill='var(--c0)'/><rect x='" + (t * bw + 2) + "' y='" + (Hh - hA - hR) + "' width='" + (bw - 4) + "' height='" + hR + "' fill='var(--danger)' opacity='.7'/>"; }).join("") +
        [10, 20].map(function (x) { return "<line x1='" + x * bw + "' y1='0' x2='" + x * bw + "' y2='" + Hh + "' stroke='var(--border-strong)' stroke-dasharray='4 3'/>"; }).join("") +
        "<text x='0' y='" + (Hh + 16) + "' font-size='11' fill='var(--text-3)'>0 s</text><text x='" + (W - 30) + "' y='" + (Hh + 16) + "' font-size='11' fill='var(--text-3)'>30 s</text>" +
        "<rect x='200' y='" + (Hh + 8) + "' width='10' height='10' fill='var(--c0)'/><text x='214' y='" + (Hh + 17) + "' font-size='11' fill='var(--text-2)'>allowed</text><rect x='280' y='" + (Hh + 8) + "' width='10' height='10' fill='var(--danger)' opacity='.7'/><text x='294' y='" + (Hh + 17) + "' font-size='11' fill='var(--text-2)'>rejected</text></svg>";
      var lim = s.rate * 10;
      el.querySelector("[data-r='note']").textContent = s.algo === "tb" ? "Token bucket: allows bursts up to the capacity (" + s.cap + "), then the long-run rate of " + s.rate + "/s." :
        s.algo === "fw" ? "Fixed window: " + lim + " per 10 s window (dashed lines). With 'bursts at window edges', up to 2× the limit can pass in a short span around a boundary." :
        "Sliding window log: at most " + lim + " in ANY 10 s span — accurate, but stores a timestamp per request. Simulated per second.";
    }
    el.addEventListener("click", function (e) { var g = e.target.parentNode && e.target.parentNode.getAttribute && e.target.parentNode.getAttribute("data-g"); if (g) { s[g] = e.target.getAttribute("data-v"); ctx.save(); draw(); } });
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "F19",
    summary: "Protecting services from overload and abuse: where to rate limit, token bucket, leaky bucket, fixed and sliding windows, distributed counters in Redis, and how to respond with 429 and Retry-After.",
    slides: [
      { t: "Why rate limit?", x: "A rate limiter caps how many requests a client can make in a time period. Excess requests are rejected or delayed.",
        p: ["Protect services from overload and noisy neighbours", "Stop abuse: brute-force logins, scraping, spam", "Enforce fair use and pricing tiers (e.g. 1,000 API calls/hour on a free plan)", "Control cost of expensive downstream calls"],
        m: "flowchart LR\n  C[\"Clients\"] --> RL{\"Rate limiter\"}:::s1\n  RL -->|\"within limit\"| API[\"API servers\"]:::s0\n  RL -->|\"over limit\"| R[\"429 Too Many Requests\"]:::bad" },
      { t: "Where to put it", x: "Rate limits can live at several layers; most systems use more than one.",
        p: ["Client-side: polite throttling, but never trust it", "Edge / CDN / WAF: block floods early (IP-based)", "API gateway: per API key or user, per route", "Inside services: protect a specific dependency (e.g. per-tenant DB quota)"],
        m: "flowchart LR\n  C[\"Client\"] --> E[\"CDN / WAF<br/>per IP\"]:::s2 --> G[\"API gateway<br/>per user / key\"]:::s1 --> S[\"Service<br/>per tenant / dependency\"]:::s0" },
      { t: "Choosing the key", x: "What you count against decides fairness.",
        table: [["Key", "Good for", "Watch out"], ["IP address", "Anonymous traffic, floods", "Many users behind one NAT; attackers rotate IPs"], ["User ID / API key", "Authenticated APIs, pricing tiers", "Needs auth first"], ["Route + user", "Expensive endpoints (search, login)", "More counters"], ["Tenant", "Multi-tenant SaaS fairness", "Big tenants may need custom limits"]],
        m: "flowchart LR\n  R[\"Request\"] --> K[\"key = user:42:POST /search\"]:::s1 --> CNT[(\"Counter\")]:::s0" },
      { t: "Token bucket", x: "A bucket holds up to C tokens and refills at r tokens per second. Each request takes a token; no token → reject.",
        p: ["Allows short bursts up to the capacity C", "Long-run average limited to r per second", "Only two values per key: tokens and last refill time", "Used widely, e.g. AWS API Gateway throttling is described in terms of a token bucket (rate + burst)"],
        m: "flowchart LR\n  REF[\"Refill r tokens/s\"]:::s2 --> B[(\"Bucket: up to C tokens\")]:::s1\n  REQ[\"Request\"] --> B\n  B -->|\"token available\"| OK[\"Allow\"]:::s0\n  B -->|\"empty\"| NO[\"Reject 429\"]:::bad" },
      { t: "Leaky bucket", x: "Requests enter a queue that drains at a fixed rate, smoothing output to a constant flow.",
        p: ["Output rate is perfectly smooth", "Bursts are queued (adding delay) or dropped if the queue is full", "Good for protecting a downstream that needs steady load", "Token bucket allows bursts through; leaky bucket smooths them"],
        m: "flowchart LR\n  IN[\"Bursty requests\"] --> Q[(\"Queue (bounded)\")]:::s1 -->|\"fixed rate\"| OUT[\"Steady processing\"]:::s0\n  Q -->|\"full\"| DROP[\"Drop\"]:::bad" },
      { t: "Fixed window counter", x: "Count requests in fixed windows (e.g. per minute starting at :00). Reset at each boundary.",
        pros: ["Very simple: one counter per key per window (INCR + EXPIRE)", "Low memory"], cons: ["Boundary burst: a client can send the full limit at 0:59 and again at 1:00 — up to 2× in a short span"],
        m: "flowchart LR\n  W1[\"Window 12:00–12:01<br/>count 100/100\"]:::s1 --> W2[\"Window 12:01–12:02<br/>count reset to 0\"]:::s0\n  W1 -. \"100 at 12:00:59 + 100 at 12:01:00\" .-> BAD[\"200 in 2 seconds\"]:::bad" },
      { t: "Sliding windows", x: "Fix the boundary problem by looking at the last N seconds from now.",
        p: ["Sliding window log: store each request timestamp (e.g. Redis sorted set), count those in the last window — exact but memory per request", "Sliding window counter: weight the previous window's count by overlap, e.g. current + previous × (1 − elapsed fraction) — approximate, but cheap", "Cloudflare described using the sliding window counter approximation at scale"],
        m: "flowchart LR\n  PREV[\"Previous window: 80\"]:::s1 --> EST[\"Estimate = 30 + 80 × 0.75 = 90\"]:::s0\n  CUR[\"Current window: 30<br/>25% elapsed\"]:::s2 --> EST\n  EST --> D{\"≤ 100 limit?\"}" },
      { t: "Distributed rate limiting", x: "With many gateway servers, counters must be shared or carefully split.",
        p: ["Central store: Redis with atomic INCR/EXPIRE or a Lua script for token bucket", "Race conditions: read-then-write must be atomic", "Latency: one Redis call per request (keep it in-region; pipeline)", "Alternatives: local limits per node (limit ÷ N), sync periodically — faster, less exact", "Fail open or fail closed if Redis is down? Usually fail open for availability, except security-critical limits"],
        m: "flowchart LR\n  G1[\"Gateway 1\"] --> R[(\"Redis<br/>atomic Lua script\")]:::s1\n  G2[\"Gateway 2\"] --> R\n  G3[\"Gateway 3\"] --> R\n  R --> RULES[\"Rules: user tier → limits\"]:::s0" },
      { t: "Responding to clients", x: "Tell clients they are limited and when to try again.",
        p: ["HTTP 429 Too Many Requests", "Retry-After header (seconds or a date)", "Commonly also: X-RateLimit-Limit / -Remaining / -Reset headers (conventions, e.g. GitHub's API)", "Clients should back off exponentially with jitter", "Optionally queue or degrade (serve cached data) instead of rejecting"],
        m: "sequenceDiagram\n  participant C as Client\n  participant G as Gateway\n  C->>G: GET /search\n  G-->>C: 429 Too Many Requests, Retry-After: 30\n  Note over C: wait 30 s (plus jitter)\n  C->>G: GET /search\n  G-->>C: 200 OK" },
      { t: "Rate limiting in interviews", x: "Usually a component in a larger design, or a full problem (P03).",
        p: ["'Token bucket per API key at the gateway, state in Redis via a Lua script.'", "'Rules config: free 100/min, paid 1,000/min; stricter for /login.'", "'Return 429 with Retry-After; fail open if Redis is unavailable.'", "'Edge/WAF per-IP limits stop floods before they reach us.'", "Explain the algorithm's burst behaviour"],
        m: "flowchart LR\n  C[\"Client\"] --> WAF[\"WAF per IP\"]:::s2 --> GW[\"Gateway + limiter\"]:::s1 --> SVC[\"Services\"]:::s0\n  GW --> R[(\"Redis\")]\n  GW --> CFG[\"Rules\"]" }
    ],
    widget: { heading: "Rate limiter simulator", caption: "Compare token bucket, fixed window and sliding window on different traffic patterns over 30 seconds. Simulated in 1-second steps.", render: widget },
    examples: [
      ["GitHub API", "Authenticated REST requests are limited per hour (5,000/hour for a typical personal token), with x-ratelimit-* response headers showing remaining quota."],
      ["Stripe", "Stripe's engineering blog described using token-bucket rate limiters plus load shedders to protect its API."],
      ["Cloudflare", "Cloudflare described counting with a sliding window approximation based on the previous and current window counts."],
      ["Login protection", "Most sites limit login attempts per account and per IP to slow password-guessing attacks."]
    ],
    pitfalls: [
      "Only limiting by IP (punishes NAT users, easy to evade)",
      "Non-atomic read-modify-write on shared counters",
      "Ignoring the fixed-window boundary burst",
      "No Retry-After, so clients hammer immediately",
      "Rate limiter becoming a single point of failure (decide fail-open vs fail-closed)",
      "Trusting client-side throttling"
    ],
    quiz: [
      ["A token bucket with capacity 20 and refill 5/s, starting full. How many requests can pass in the first instant?", ["5", "20", "25", "Unlimited"], 1, "Bursts up to the capacity, then 5/s."],
      ["Main weakness of a fixed window counter?", ["High memory", "Bursts at window boundaries can allow ~2× the limit", "Needs a queue", "Can't be distributed"], 1, "Full limit at the end of one window and the start of the next."],
      ["What does a leaky bucket do with bursts?", ["Passes them through", "Queues them and processes at a constant rate (or drops if full)", "Doubles the rate", "Ignores them"], 1, "It smooths output."],
      ["Which is exact but stores a timestamp per request?", ["Fixed window", "Sliding window log", "Token bucket", "Sliding window counter"], 1, "Memory grows with request volume."],
      ["With many gateway servers sharing Redis counters, what matters most?", ["Atomic updates (INCR or Lua script)", "Using HTTP/1.0", "Storing counters in cookies", "Sorting keys alphabetically"], 0, "Otherwise concurrent requests race past the limit."],
      ["Correct response for a limited request?", ["500 Internal Server Error", "429 Too Many Requests with Retry-After", "404", "200 with empty body"], 1, "Tells clients to back off and when to retry."],
      ["Why is IP-only limiting often unfair?", ["IPs are encrypted", "Many users can share one IP behind NAT/proxies", "IPv6 is not supported", "It is too exact"], 1, "Use user/API key when authenticated."],
      ["If the shared limiter store is down, a typical non-security API chooses to…", ["Fail open (allow) and alert", "Reject everything forever", "Restart all servers", "Switch to short polling"], 0, "Availability first; security-sensitive limits may fail closed."]
    ],
    practice: {
      q: "Design rate limiting for a public API with free (100 req/min) and paid (2,000 req/min) tiers, served from 50 gateway nodes in 3 regions, at 500k requests/second total.",
      a: [
        ["Algorithm", "Token bucket per API key: capacity = a short burst allowance, refill = tier rate. Explain burst behaviour."],
        ["State", "Redis cluster per region, key 'rl:{api_key}' with tokens + last_refill, updated atomically by a Lua script; TTL to expire idle keys."],
        ["Latency", "Limiter runs in the gateway; Redis in the same region (~sub-ms); pipeline calls. Optionally local in-memory pre-check for very hot keys."],
        ["Multi-region", "Simplest: per-region limits (e.g. limit split by region traffic share), accepting slight over-allowance; or route each key to a home region."],
        ["Rules", "Config service with tier → limits and per-route overrides (e.g. /search stricter), cached in gateways and refreshed."],
        ["Responses", "429 + Retry-After + remaining-quota headers; log and metric rejections per key."],
        ["Failure", "If Redis is unavailable, fail open with local coarse limits and alert; WAF per-IP limits at the edge as a safety net."]
      ]
    },
    recap: [
      "Rate limit at the edge (IP), the gateway (user/key) and around fragile dependencies.",
      "Token bucket = bursts up to capacity, average up to refill rate.",
      "Fixed windows are cheap but allow boundary bursts; sliding windows fix that.",
      "Shared counters need atomic Redis operations; decide fail-open vs fail-closed.",
      "Respond with 429 + Retry-After; clients back off with jitter."
    ]
  });
})();
