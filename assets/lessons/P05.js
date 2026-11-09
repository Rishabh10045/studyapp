/* Lesson P05: Search autocomplete (typeahead) */
(function () {
  "use strict";
  var H = window.HLD;
  var LOG = [["weather today", 980], ["weather tomorrow", 610], ["weather mumbai", 540], ["web whatsapp", 900], ["wedding dresses", 220], ["webcam test", 180], ["west bengal news", 260], ["world cup score", 870], ["word counter", 300], ["wordle", 760], ["work from home jobs", 340], ["wikipedia", 650], ["wifi password", 150], ["windows 11 update", 410]];

  function build(k) {
    var root = { c: {}, top: [] }, nodes = 1;
    LOG.forEach(function (e) {
      var n = root; add(n, e);
      for (var i = 0; i < e[0].length; i++) { var ch = e[0][i]; if (!n.c[ch]) { n.c[ch] = { c: {}, top: [] }; nodes++; } n = n.c[ch]; add(n, e); }
    });
    function add(n, e) { n.top.push(e); n.top.sort(function (a, b) { return b[1] - a[1]; }); if (n.top.length > k) n.top.length = k; }
    return { root: root, nodes: nodes };
  }

  function widget(el, ctx) {
    var s = ctx.state; if (s.q == null) { s.q = "we"; s.k = 5; }
    el.innerHTML = "<div class='grid2'><label class='field'>Type a prefix<input type='text' data-r='q' autocomplete='off'></label><label class='field'>Top-k stored per node: <strong data-v='k' style='color:var(--text)'></strong><input type='range' min='1' max='10' data-k='k'></label></div>" +
      "<div class='grid2'><div class='card'><strong>Suggestions</strong><div class='rows' data-r='sug'></div></div><div class='card'><strong>Trie path walked</strong><div data-r='path' style='font-family:ui-monospace,monospace;font-size:13px;margin-top:6px'></div><div class='metrics' data-r='m'></div></div></div>" +
      "<p class='caption'>A trie built from a tiny query log (counts are made up). Each node stores its precomputed top-k completions, so a lookup is just walking the prefix — no scanning of the subtree at query time.</p>";
    var qi = el.querySelector("[data-r='q']"); qi.value = s.q;
    function draw() {
      el.querySelector("[data-k='k']").value = s.k; el.querySelector("[data-v='k']").textContent = s.k;
      var t = build(s.k), n = t.root, path = ["root"], q = s.q.toLowerCase(), miss = false;
      for (var i = 0; i < q.length; i++) { if (!n.c[q[i]]) { miss = true; break; } n = n.c[q[i]]; path.push(q[i] === " " ? "␣" : q[i]); }
      el.querySelector("[data-r='path']").textContent = path.join(" → ") + (miss ? " → ✗ (no match)" : "");
      el.querySelector("[data-r='sug']").innerHTML = miss || !q ? "<p class='caption'>" + (q ? "No completions." : "Type something.") + "</p>" : n.top.map(function (e) {
        return "<div class='row'><span class='t'><strong>" + ctx.esc(e[0].slice(0, q.length)) + "</strong>" + ctx.esc(e[0].slice(q.length)) + "</span><span class='dt'>" + e[1] + " searches</span></div>"; }).join("");
      el.querySelector("[data-r='m']").innerHTML = [[path.length - 1, "Nodes visited"], [t.nodes, "Trie nodes"], [t.nodes * s.k, "Stored top-k entries"]].map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    }
    qi.addEventListener("input", function () { s.q = qi.value; ctx.save(); draw(); });
    el.addEventListener("input", function (e) { if (e.target.getAttribute("data-k")) { s.k = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P05",
    summary: "Suggest completions as the user types, in under ~100 ms, for billions of queries a day: requirements, estimates, a trie with precomputed top-k, offline building from query logs, sharding, multi-layer caching and filtering.",
    slides: [
      { t: "1. Requirements", x: "Clarify what to suggest and how fresh it must be.",
        p: ["Functional: given a prefix, return the top 5–10 completions ranked by popularity; support for many languages (ask); optionally personalised and trending", "Non-functional: very low latency (results must appear while typing, ~100 ms end to end); highly available; suggestions can be minutes to hours stale", "Filter offensive or unsafe suggestions", "Read-heavy: one request per keystroke (debounced)"],
        m: "flowchart LR\n  U[\"user types 'wea'\"] --> AC[\"Autocomplete\"]:::s0 --> R[\"weather today<br/>weather tomorrow<br/>weather mumbai\"]:::s2" },
      { t: "2. Estimates", x: "Example: 10 M DAU, 10 searches each, ~6 requests per search after debouncing.",
        table: [["Quantity", "Estimate"], ["Requests/day", "10 M × 10 × 6 = 600 M"], ["Average QPS", "≈ 7,000/s; peak ≈ 20,000/s"], ["Distinct queries kept", "e.g. top 100 M queries × ~30 B ≈ 3 GB of strings"], ["Trie with top-k at each node", "tens of GB → shard or keep only short prefixes"]],
        m: "flowchart LR\n  K[\"keystrokes\"] --> D[\"debounce ~100–150 ms\"]:::s1 --> Q[\"≈ 20k QPS peak\"]:::s0" },
      { t: "3. API", x: "One read endpoint; logging happens via the search path.",
        p: ["GET /v1/suggest?q=wea&limit=8&lang=en → {suggestions: [\"weather today\", …]}", "Responses are tiny and highly cacheable (Cache-Control with a short max-age)", "Client: debounce keystrokes, cancel stale requests, cache results per prefix locally", "Search submissions are logged separately to feed the builder"],
        m: "sequenceDiagram\n  participant B as Browser\n  participant E as Edge/CDN\n  participant S as Suggest service\n  B->>E: GET /suggest?q=wea\n  E->>S: miss\n  S-->>E: [weather today, …] (max-age 60s)\n  E-->>B: suggestions" },
      { t: "4. Data structure: trie with top-k", x: "A trie (prefix tree) where each node caches its k most popular completions.",
        p: ["Lookup = walk the prefix's characters → return the node's stored list: O(prefix length)", "Without the cache you'd scan the whole subtree per request — too slow", "Cost: memory (k entries per node) and rebuild time", "Limit prefix depth (e.g. first 20 chars); long prefixes are rare", "Alternative: a key-value map prefix → top-k list (same idea, easy to store in Redis/KV)"],
        m: "flowchart TB\n  R[\"root\"] --> W[\"w: top: web whatsapp, weather today…\"]:::s0\n  W --> WE[\"we: top: weather today, web whatsapp, weather tomorrow\"]:::s0\n  WE --> WEA[\"wea: top: weather today, weather tomorrow, weather mumbai\"]:::s2\n  W --> WO[\"wo: top: world cup score, wordle…\"]:::s0" },
      { t: "5. High-level architecture", x: "Split into a read path (serve) and a build path (aggregate logs → build tries).",
        m: "flowchart LR\n  U[\"Users\"] --> CDN[\"CDN / edge cache\"]:::s2 --> LB[\"LB\"] --> SS[\"Suggest servers: trie in memory\"]:::s0\n  SRCH[\"Search service\"] --> K[(\"Kafka: query log\")]:::s1 --> AGG[\"Aggregator: counts per query per window\"] --> DB[(\"Query counts\")] --> BLD[\"Trie builder\"]:::s1 --> OBJ[(\"Trie snapshots\")] --> SS",
        p: ["Suggest servers load immutable trie snapshots into memory and swap atomically", "Builder runs e.g. hourly/daily; a fast path can merge trending queries more often"] },
      { t: "6. Deep dive: building from logs", x: "Popularity comes from what people actually searched.",
        p: ["Stream job counts queries per hour (sampling is fine at huge scale)", "Score = decayed sum of counts (recent searches count more)", "Normalise (lowercase, trim), drop rare queries (privacy and noise: e.g. need ≥ N distinct users)", "Filter: blocklist of unsafe terms, legal removals, personal data", "Build trie(s), serialize, upload; servers download and hot-swap"],
        m: "flowchart LR\n  L[\"query log\"] --> C[\"count per hour\"]:::s1 --> SC[\"decayed score\"] --> F[\"filters + min-user threshold\"]:::bad --> T[\"build trie\"]:::s0 --> S[\"snapshot v42\"]:::s2" },
      { t: "7. Deep dive: sharding and replication", x: "When the trie no longer fits on one server, or for throughput.",
        p: ["Replicate full tries across many servers for read throughput (simplest when it fits in RAM)", "Shard by prefix range (a–f, g–m…) — but letters are uneven ('s' is huge), so split by measured load", "Or shard by hash of the first 2–3 characters", "A thin router maps prefix → shard", "Per-language / per-region tries"],
        m: "flowchart LR\n  RT[\"Router: prefix → shard\"]:::s1 --> S1[\"Shard a–c ×3 replicas\"]:::s0\n  RT --> S2[\"Shard d–m ×3\"]:::s0\n  RT --> S3[\"Shard n–r ×3\"]:::s0\n  RT --> S4[\"Shard s ×3 (hot)\"]:::s2" },
      { t: "8. Deep dive: caching layers", x: "Most traffic is for short, common prefixes — perfect for caching.",
        p: ["Browser: cache prefix → results for the session", "CDN/edge: cache GET /suggest?q=… for 1–5 minutes; huge hit rate for 1–3 character prefixes", "Server: trie in memory is itself the cache", "Personalised suggestions can't be shared-cached → merge a small per-user list client-side or in a separate call"],
        m: "flowchart LR\n  B[\"Browser cache\"]:::s2 --> E[\"Edge cache\"]:::s2 --> SS[\"Suggest server (in-memory trie)\"]:::s0" },
      { t: "9. Bottlenecks and trade-offs", x: "Discussion points.",
        p: ["Freshness vs cost: daily rebuild + small trending trie merged at query time", "Memory vs latency: storing top-k everywhere vs computing on the fly", "Personalisation breaks shared caching", "Abuse: people try to push offensive suggestions → thresholds and filters", "Typos: fuzzy matching (edit distance) is expensive; often handled by a spell-correction step"],
        m: "flowchart LR\n  BIG[\"Base trie (daily)\"]:::s0 --> MRG[\"merge at query time\"]:::s1\n  TR[\"Trending trie (every 5–15 min)\"]:::s2 --> MRG --> OUT[\"top-k\"]" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Read path: debounced client → CDN → suggest servers with in-memory trie storing top-k per node", "Build path: query logs → Kafka → counts with time decay → filters → trie snapshots → hot swap", "Shard by prefix load; replicate for throughput", "Trending overlay for freshness; personal results merged separately", "Filter unsafe suggestions; minimum-user thresholds for privacy"],
        m: "flowchart LR\n  R[\"Serve: CDN → trie\"]:::s0\n  W[\"Build: logs → counts → trie\"]:::s1\n  W --> R" }
    ],
    widget: { heading: "Trie with top-k per node", caption: "Type a prefix to walk a small trie; each node already stores its top completions.", render: widget },
    examples: [
      ["Google Autocomplete", "Google describes predictions as based on real searches, with policies that remove violent, hateful, sexually explicit and other unsafe predictions."],
      ["LinkedIn Cleo", "LinkedIn open-sourced Cleo (2012), a typeahead library for searching people, companies and groups."],
      ["Elasticsearch completion suggester", "Uses an in-memory FST (finite state transducer) for fast prefix completions."],
      ["Client debouncing", "Most search boxes wait ~100–300 ms after the last keystroke before requesting suggestions, cutting request volume a lot."]
    ],
    pitfalls: [
      "Querying the main database with LIKE 'prefix%' per keystroke",
      "Scanning the trie subtree at query time instead of precomputing top-k",
      "Rebuilding the trie in place while serving (inconsistent reads)",
      "Sharding by first letter without accounting for skew",
      "No filtering of offensive or private suggestions",
      "Forgetting client debouncing and caching"
    ],
    quiz: [
      ["Why store top-k completions at each trie node?", ["To save memory", "So a lookup only walks the prefix — no subtree scan", "For security", "To support deletes"], 1, "Trades memory for very fast reads."],
      ["How fresh do suggestions usually need to be?", ["Real-time per keystroke", "Minutes to hours is fine; trending can be faster", "Weekly", "Never updated"], 1, "Batch rebuilds + a trending overlay."],
      ["Best way to update the serving trie?", ["Edit it in place", "Build a new snapshot offline and swap atomically", "Rebuild on every query", "Restart all servers at once"], 1, "Immutable snapshots avoid partial states."],
      ["Why is sharding by first letter tricky?", ["Letters are unordered", "Load is very uneven across letters", "Tries can't be sharded", "Unicode"], 1, "Split by measured load instead."],
      ["Which cache layer gets huge hit rates for 1–2 character prefixes?", ["Database", "CDN/edge and browser caches", "Disk", "None"], 1, "Few distinct short prefixes, many requests."],
      ["Why require a minimum number of distinct users per suggestion?", ["Speed", "Privacy and resistance to manipulation", "Memory", "Sorting"], 1, "Rare queries can contain personal data."],
      ["What does debouncing do?", ["Encrypts requests", "Waits briefly after typing stops before sending", "Retries failed requests", "Sorts results"], 1, "Fewer requests per search."],
      ["Personalised suggestions affect caching how?", ["No effect", "They can't be shared in CDN caches", "They make CDNs faster", "They require SQL"], 1, "Merge personal results separately."]
    ],
    practice: {
      q: "Extend the design so that a breaking news topic (e.g. 'earthquake delhi') shows up in suggestions within 10 minutes, without rebuilding the full trie that often.",
      a: [
        ["Trending pipeline", "Stream processor (Flink/Kafka Streams) counts queries in sliding windows (e.g. 5–15 min) and compares to a baseline to detect spikes."],
        ["Trending store", "Small prefix → top trending list map (Redis or a mini-trie), refreshed every few minutes."],
        ["Serving", "Suggest server merges base top-k with trending top-k for the prefix, with a boost and dedupe."],
        ["Safety", "Trending candidates pass stricter filters (and possibly human review for sensitive topics) and a minimum distinct-user threshold."],
        ["Caching", "Lower CDN TTL (e.g. 60 s) so new trending suggestions appear quickly."],
        ["Trade-offs", "More moving parts and some manipulation risk vs freshness; base trie stays daily."]
      ]
    },
    recap: [
      "Requirements: top-k completions per prefix in ~100 ms; staleness OK.",
      "Trie (or prefix map) with precomputed top-k per node.",
      "Build offline from query logs with decay, thresholds and filters; hot-swap snapshots.",
      "Shard by measured prefix load; replicate for throughput.",
      "Cache in browser and CDN; add a trending overlay for freshness."
    ]
  });
})();
