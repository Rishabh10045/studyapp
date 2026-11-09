/* Lesson F24: Idempotency & retries */
(function () {
  "use strict";
  var H = window.HLD;
  function rng(seed) { return function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }

  function widget(el, ctx) {
    var s = ctx.state; if (!s.pol) { s.pol = "jitter"; s.fail = 30; s.max = 4; s.key = true; }
    el.innerHTML = "<div class='seg' data-g='pol'><button data-v='none'>No retries</button><button data-v='fixed'>Fixed 1 s retries</button><button data-v='exp'>Exponential backoff</button><button data-v='jitter'>Exponential + full jitter</button></div>" +
      "<div class='grid2'><label class='field'>Chance a request fails or times out: <strong data-o='fail' style='color:var(--text)'></strong><input type='range' min='0' max='90' data-k='fail'></label>" +
      "<label class='field'>Max retries: <strong data-o='max' style='color:var(--text)'></strong><input type='range' min='1' max='8' data-k='max'></label></div>" +
      "<label class='toggle'><input type='checkbox' data-r='key'> Requests carry an idempotency key (server dedupes)</label>" +
      "<div class='metrics' data-r='m'></div><div data-r='chart'></div><p class='caption'>Timeline: when 20 clients that all failed at t = 0 send their retries (first 4 retries shown). Without jitter they retry in synchronized waves. Expected values assume independent failures; for duplicates we assume half of failures are timeouts where the server did the work but the response was lost.</p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function delay(k, rnd) { var base = Math.min(32, Math.pow(2, k)); return s.pol === "fixed" ? 1 * (k + 1) : s.pol === "exp" ? base : rnd() * base; }
    function draw() {
      el.querySelectorAll("[data-g='pol'] button").forEach(function (b) { b.className = b.getAttribute("data-v") === s.pol ? "active" : ""; });
      ["fail", "max"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      el.querySelector("[data-o='fail']").textContent = s.fail + "%"; el.querySelector("[data-o='max']").textContent = s.max; q("key").checked = s.key;
      var p = s.fail / 100, r = s.pol === "none" ? 0 : s.max, att = 0;
      for (var k = 0; k <= r; k++) att += Math.pow(p, k);
      var success = 1 - Math.pow(p, r + 1), dup = s.key ? 0 : (att - 1) * 0.5;
      q("m").innerHTML = [[(success * 100).toFixed(2) + "%", "Eventual success rate"], [att.toFixed(2) + "×", "Load amplification"], [s.key ? "0" : dup.toFixed(2), "Duplicate side effects / request"], [r ? "~" + (s.pol === "fixed" ? r : Math.min(63, Math.pow(2, r) - 1)) + " s" : "0 s", "Worst-case retry wait"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var W = 600, Hh = 150, R = rng(7), maxT = 16, dots = "";
      if (s.pol !== "none") for (var c = 0; c < 20; c++) { var t = 0; for (var k2 = 0; k2 < Math.min(4, s.max); k2++) { t += delay(k2, R); if (t <= maxT) dots += "<circle cx='" + (t / maxT * (W - 20) + 10).toFixed(1) + "' cy='" + (10 + c * 6.5).toFixed(1) + "' r='3.5' fill='var(--c" + (k2 % 3) + ")'/>"; } }
      var ticks = ""; for (var x = 0; x <= maxT; x += 2) ticks += "<line x1='" + (x / maxT * (W - 20) + 10) + "' y1='0' x2='" + (x / maxT * (W - 20) + 10) + "' y2='" + Hh + "' stroke='var(--border)'/><text x='" + (x / maxT * (W - 20) + 4) + "' y='" + (Hh + 14) + "' font-size='10' fill='var(--text-3)'>" + x + "s</text>";
      q("chart").innerHTML = "<svg viewBox='0 0 " + W + " " + (Hh + 20) + "' width='100%' role='img' aria-label='Retry timeline for 20 clients'>" + ticks + dots + (s.pol === "none" ? "<text x='200' y='80' font-size='13' fill='var(--text-3)'>No retries: failed requests stay failed</text>" : "") + "</svg>";
    }
    el.addEventListener("click", function (e) { var g = e.target.parentNode && e.target.parentNode.getAttribute && e.target.parentNode.getAttribute("data-g"); if (g) { s[g] = e.target.getAttribute("data-v"); ctx.save(); draw(); } });
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    q("key").addEventListener("change", function (e) { s.key = e.target.checked; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F24",
    summary: "Making retries safe: what idempotency means, why timeouts make outcomes unknown, idempotency keys, deduplication in consumers, exponential backoff with jitter, retry budgets, and the 'effectively once' pattern.",
    slides: [
      { t: "The uncertain outcome", x: "A client sends a request and the network times out. Did the server do the work? The client can't know.",
        p: ["Request lost before the server → nothing happened", "Server processed it but the response was lost → it DID happen", "Retrying is the only way to make progress — but it can repeat the effect", "So operations must be safe to repeat: idempotent"],
        m: "sequenceDiagram\n  participant C as Client\n  participant S as Payment API\n  C->>S: POST /charge ₹500\n  Note over S: charges card ✓\n  S--xC: response lost (timeout)\n  C->>S: retry POST /charge ₹500\n  Note over S: charges again ✗ double charge" },
      { t: "What idempotent means", x: "An operation is idempotent if doing it many times has the same effect as doing it once.",
        table: [["Operation", "Idempotent?"], ["GET /orders/7", "Yes (no change)"], ["PUT /users/42 {name:'Asha'}", "Yes (same final state)"], ["DELETE /cart/items/9", "Yes (gone either way)"], ["SET balance = 100", "Yes"], ["POST /orders", "No — each call creates an order"], ["balance = balance − 50", "No — each call subtracts again"]],
        p: ["Same effect, not necessarily the same response (a second DELETE may return 404)"],
        m: "flowchart LR\n  A[\"Do it once\"] --> S1[\"State X\"]:::s0\n  B[\"Do it 3 times\"] --> S2[\"State X\"]:::s0\n  C[\"increment ×3\"] --> S3[\"State X + 3\"]:::bad" },
      { t: "Idempotency keys", x: "Make non-idempotent operations safe by giving each logical request a unique key chosen by the client.",
        p: ["Client generates a UUID per logical operation and reuses it on every retry", "Server stores key → status + response, with a unique constraint", "First request: process, then save the response", "Repeat with the same key: return the saved response without re-executing", "Keys expire after a window (Stripe keeps them at least 24 hours)"],
        m: "sequenceDiagram\n  participant C as Client\n  participant S as API\n  participant D as DB\n  C->>S: POST /charge (Idempotency-Key: k1)\n  S->>D: insert key k1 (unique)\n  S->>S: charge card\n  S->>D: save response for k1\n  S--xC: response lost\n  C->>S: retry (Idempotency-Key: k1)\n  S->>D: k1 exists → stored response\n  S-->>C: 200 same charge, no new charge" },
      { t: "Implementing it safely", x: "The tricky part is concurrency and partial failure.",
        p: ["Insert the key first with status 'in progress' inside a transaction or with a unique index", "A concurrent duplicate sees 'in progress' → return 409 or wait", "Check that the repeated request body matches (same key, different body → error)", "Store the business result and key in the same transaction when possible", "If calling an external provider, pass your key through (many providers accept one)"],
        m: "flowchart LR\n  R[\"Request with key\"] --> I{\"INSERT key (unique)\"}:::s1\n  I -->|\"new\"| P[\"Process + save result\"]:::s0\n  I -->|\"exists, done\"| RET[\"Return saved response\"]:::s2\n  I -->|\"exists, in progress\"| W[\"409 / retry later\"]" },
      { t: "Idempotent consumers", x: "Message queues deliver at least once (F16), so consumers see duplicates and must dedupe.",
        p: ["Each message carries a unique event id", "Keep a processed_events table (or a unique constraint on the effect, e.g. one ledger row per payment_id)", "Process + record the id in one transaction", "Or design the effect to be naturally idempotent (upserts, SET not INCREMENT)", "At-least-once delivery + idempotent processing = effectively once"],
        m: "flowchart LR\n  Q[(\"Queue: event e7 delivered twice\")]:::s1 --> C[\"Consumer\"]\n  C --> T{\"e7 in processed_events?\"}\n  T -->|\"no\"| A[\"apply + record e7 (one transaction)\"]:::s0\n  T -->|\"yes\"| SK[\"skip\"]:::s2" },
      { t: "When to retry", x: "Not every failure should be retried.",
        table: [["Failure", "Retry?"], ["Timeout, connection reset", "Yes, if idempotent"], ["503 Service Unavailable, 429 Too Many Requests", "Yes, with backoff / honour Retry-After"], ["500 Internal Server Error", "Maybe, a few times"], ["400 Bad Request, 401, 403, 404, 422", "No — retrying won't help"]],
        p: ["Set a timeout on every call; retries without timeouts just hang"],
        m: "flowchart LR\n  E[\"Error\"] --> T{\"Transient? (timeout, 503, 429)\"}\n  T -->|\"yes + idempotent\"| R[\"Retry with backoff\"]:::s0\n  T -->|\"no (4xx)\"| F[\"Fail fast, report\"]:::bad" },
      { t: "Exponential backoff with jitter", x: "Wait longer after each failure, and randomize the wait so clients don't retry in sync.",
        p: ["Backoff: wait base × 2^attempt (1 s, 2 s, 4 s, 8 s…), capped", "Without jitter, many clients that failed together retry together → synchronized load spikes", "Full jitter: wait random(0, base × 2^attempt) — recommended in the AWS Architecture Blog post 'Exponential Backoff and Jitter'", "Cap the number of retries and the total time"],
        m: "flowchart LR\n  A1[\"Attempt 1 fails\"] --> W1[\"wait rand(0,1s)\"] --> A2[\"Attempt 2 fails\"] --> W2[\"wait rand(0,2s)\"] --> A3[\"Attempt 3 fails\"] --> W3[\"wait rand(0,4s)\"] --> A4[\"Attempt 4\"]:::s2" },
      { t: "Retry storms and budgets", x: "Retries multiply load exactly when the system is weakest.",
        p: ["3 layers each retrying 3 times → up to 4 × 4 × 4 = 64 attempts at the bottom layer", "Retry at one layer only (usually closest to the client or the failing call)", "Retry budgets: allow retries to be at most ~10% of requests (a policy described in Google's SRE book)", "Combine with circuit breakers (F20) and load shedding"],
        m: "flowchart LR\n  C[\"Client ×4 attempts\"] --> A[\"Service A ×4\"] --> B[\"Service B ×4\"] --> D[\"DB: up to 64 attempts\"]:::bad" },
      { t: "Idempotency in interviews", x: "Say it whenever money, orders, messages or external side effects are involved.",
        p: ["'POST /payments requires an Idempotency-Key; stored with a unique index and the response.'", "'Kafka consumers are idempotent: unique constraint on (payment_id) in the ledger.'", "'Clients retry 3× with exponential backoff and full jitter, only on timeouts/5xx/429.'", "'Webhooks we receive are deduped by event id.'", "Explain the timeout ambiguity in one sentence"],
        m: "flowchart LR\n  C[\"Client + idempotency key\"] --> API[\"API\"]:::s0 --> K[(\"keys table (unique)\")]:::s1\n  API --> Q[(\"Queue\")] --> W[\"Idempotent consumer\"]:::s2" }
    ],
    widget: { heading: "Retry policy simulator", caption: "Compare retry policies: success rate, load amplification, duplicates without idempotency keys, and how jitter spreads retries.", render: widget },
    examples: [
      ["Stripe", "Stripe's API accepts an Idempotency-Key header on POST requests and returns the saved result for repeats; its blog explains designing robust APIs with idempotency."],
      ["AWS SDKs", "AWS SDKs retry throttling and transient errors with exponential backoff and jitter by default; many AWS APIs take a ClientToken for idempotent creates."],
      ["Kafka", "The idempotent producer (on by default since Kafka 3.0) uses producer ids and sequence numbers so broker retries don't duplicate messages within a partition."],
      ["Payment webhooks", "Providers retry webhooks until acknowledged, so receivers dedupe by event id."]
    ],
    pitfalls: [
      "Retrying non-idempotent POSTs without keys (double charges, duplicate orders)",
      "Generating a new idempotency key on each retry instead of reusing one",
      "Retrying 4xx errors that will never succeed",
      "Backoff without jitter, causing synchronized retry waves",
      "Retries at every layer multiplying load",
      "Dedupe check and the effect in separate, non-atomic steps"
    ],
    quiz: [
      ["Which operation is idempotent?", ["POST /orders", "balance = balance − 50", "PUT /users/42 with the full new profile", "Append a log line"], 2, "Applying the same replacement twice leaves the same state."],
      ["A client times out calling POST /charge. What does it know?", ["The charge failed", "The charge succeeded", "Nothing — it may or may not have happened", "The server is down"], 2, "Hence retries plus idempotency."],
      ["How should a client use an idempotency key across retries?", ["New key each retry", "Same key for every retry of the same logical operation", "No key on retries", "Key only on the first attempt"], 1, "The server recognises the repeat by the key."],
      ["Why add jitter to backoff?", ["To make retries faster", "To spread retries so clients don't hit the server in synchronized waves", "To encrypt requests", "To reduce payload size"], 1, "Randomness de-synchronizes clients."],
      ["Which error should NOT be retried?", ["503", "Timeout", "429 (after Retry-After)", "400 Bad Request"], 3, "The request itself is wrong."],
      ["What gives 'effectively once' processing from a queue?", ["Exactly-once networks", "At-least-once delivery + idempotent consumers", "At-most-once delivery", "Larger partitions"], 1, "Duplicates arrive but have no extra effect."],
      ["Three layers each retry up to 3 times. Worst-case attempts at the bottom?", ["9", "12", "27", "64"], 3, "(1 + 3)³ = 64."],
      ["Best place to enforce dedupe for a consumer writing ledger entries?", ["In memory only", "A unique constraint on the business id in the same transaction", "A log message", "The load balancer"], 1, "Atomic with the write, survives restarts."]
    ],
    practice: {
      q: "Design 'Place order' for a food-delivery app on flaky mobile networks: users tap once, but the app may retry; the order service calls a payment provider and publishes an OrderPlaced event. Make sure nobody is charged twice or gets two orders.",
      a: [
        ["Client", "Generates an idempotency key (UUID) when the user taps 'Place order'; stores it locally and reuses it on every retry; retries on timeout/5xx with exponential backoff + jitter (max ~3)."],
        ["API", "orders table with unique(idempotency_key); insert order in 'PENDING' with the key; a duplicate returns the existing order and status."],
        ["Payment", "Call the provider with our own idempotency key derived from order_id, so provider-side retries don't double charge; handle the async webhook deduped by provider event id."],
        ["Events", "Write OrderPlaced to an outbox in the same transaction as the order; a relay publishes it; consumers dedupe by event_id."],
        ["Concurrency", "Concurrent duplicates hit the unique index; the loser returns the winner's result (or 409 while 'in progress')."],
        ["Cleanup", "Expire keys after e.g. 24–48 h; reconcile pending orders against payment status."],
        ["Trade-offs", "Extra storage and a lookup per request in exchange for correctness; retries add latency on bad networks."]
      ]
    },
    recap: [
      "Timeouts make outcomes unknown, so retries must be safe.",
      "Idempotent = repeating has the same effect as doing once.",
      "Idempotency keys + a unique index turn POSTs into safe retries.",
      "Retry only transient errors, with exponential backoff, jitter and caps.",
      "At-least-once delivery + idempotent consumers = effectively once."
    ]
  });
})();
