/* Lesson P06: Web crawler */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.pages) { s.pages = 1; s.days = 30; s.kb = 100; s.hosts = 10; s.delay = 2; s.perw = 100; }
    var F = [["pages", "Pages to crawl (billions)", 0.1, 20, 0.1], ["days", "Days per full crawl", 1, 90, 1], ["kb", "Average page size (KB)", 20, 500, 10], ["hosts", "Distinct hosts (millions)", 0.1, 50, 0.1], ["delay", "Politeness delay per host (s)", 0.5, 30, 0.5], ["perw", "Pages/s one worker can fetch", 10, 500, 10]];
    el.innerHTML = "<div class='grid3'>" + F.map(function (f) { return "<label class='field'>" + f[1] + ": <strong data-v='" + f[0] + "' style='color:var(--text)'></strong><input type='range' min='" + f[2] + "' max='" + f[3] + "' step='" + f[4] + "' data-k='" + f[0] + "'></label>"; }).join("") + "</div>" +
      "<div class='metrics' data-r='m'></div><div class='callout' data-r='c'></div><p class='caption'>Simplified: pages spread evenly over hosts; real crawls are dominated by a few huge sites, which politeness throttles hardest. Storage is raw HTML before compression.</p>";
    function draw() {
      F.forEach(function (f) { el.querySelector("[data-k='" + f[0] + "']").value = s[f[0]]; el.querySelector("[data-v='" + f[0] + "']").textContent = s[f[0]]; });
      var pps = s.pages * 1e9 / (s.days * 86400), bw = pps * s.kb * 8 / 1e6, store = s.pages * 1e9 * s.kb * 1e3, polite = s.hosts * 1e6 / s.delay, workers = Math.ceil(pps / s.perw);
      el.querySelector("[data-r='m']").innerHTML = [[Math.round(pps).toLocaleString() + "/s", "Required fetch rate"], [bw >= 1000 ? (bw / 1000).toFixed(1) + " Gbit/s" : bw.toFixed(0) + " Mbit/s", "Download bandwidth"], [(store / 1e12).toFixed(0) + " TB", "Raw HTML per crawl"], [workers.toLocaleString(), "Workers needed"], [Math.round(polite).toLocaleString() + "/s", "Max rate allowed by politeness"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var c = el.querySelector("[data-r='c']");
      if (pps > polite) { c.className = "callout"; c.style.borderColor = "var(--danger)"; c.innerHTML = "<strong>Politeness-bound.</strong> Even with infinite workers you can't exceed " + Math.round(polite).toLocaleString() + " pages/s without hammering hosts. Crawl longer, crawl fewer pages, or prioritise."; }
      else { c.className = "callout success"; c.style.borderColor = ""; c.innerHTML = "<strong>Feasible.</strong> About " + workers.toLocaleString() + " fetch workers keep every host under one request per " + s.delay + " s."; }
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P06",
    summary: "Crawl billions of web pages politely and efficiently: requirements, estimates, the URL frontier with priority and per-host politeness, robots.txt and DNS caching, URL and content deduplication, storage, recrawl scheduling and traps.",
    slides: [
      { t: "1. Requirements", x: "Ask what the crawl is for (search index, archive, ML data) — it changes priorities.",
        p: ["Functional: start from seed URLs, fetch pages, extract links, store content, repeat; recrawl pages periodically", "Politeness: obey robots.txt and limit request rate per host", "Non-functional: scale to billions of pages; robust to bad HTML, traps, slow servers; extensible (new content types)", "Out of scope (ask): JavaScript rendering, images/video, login-protected pages"],
        m: "flowchart LR\n  SEED[\"Seed URLs\"] --> F[\"Fetch\"]:::s0 --> P[\"Parse + extract links\"]:::s1 --> ST[(\"Store page\")]:::s2\n  P --> NEW[\"New URLs\"] --> F" },
      { t: "2. Estimates", x: "Example: 1 billion pages per month.",
        table: [["Quantity", "Estimate"], ["Fetch rate", "1 B ÷ (30 × 86,400) ≈ 400 pages/s (peak ~800)"], ["Bandwidth (100 KB pages)", "≈ 40 MB/s ≈ 320 Mbit/s"], ["Storage per crawl", "1 B × 100 KB = 100 TB raw (much less compressed)"], ["URL frontier", "billions of URLs × ~100 B ≈ hundreds of GB → on disk, not RAM"]],
        m: "flowchart LR\n  N[\"1 B pages / month\"] --> R[\"~400 pages/s\"]:::s0 --> B[\"~320 Mbit/s\"]:::s1 --> S[\"~100 TB raw\"]:::s2" },
      { t: "3. Interfaces", x: "A crawler is a pipeline, not a public API; define the internal contracts.",
        p: ["Frontier: enqueue(url, priority), dequeue() → next URL whose host is allowed now", "Fetcher: fetch(url) → status, headers, body (with timeouts and size limits)", "Parser: parse(page) → text, links, metadata", "Storage: put(url_hash, content, fetched_at) and a URL metadata store", "Admin: add seeds, block domains, change priorities"],
        m: "flowchart LR\n  FR[\"Frontier\"]:::s1 -->|\"dequeue\"| FE[\"Fetcher\"]:::s0 -->|\"page\"| PA[\"Parser\"]:::s0 -->|\"links\"| FR\n  PA --> ST[(\"Storage\")]:::s2" },
      { t: "4. Data model", x: "Two main stores.",
        table: [["Store", "Contents"], ["URL metadata (wide-column / KV)", "url_hash → url, host, last_fetched, status, content_hash, next_fetch_at, priority"], ["Content (object storage)", "Compressed page bodies in large files (e.g. WARC format)"], ["Seen-URL filter", "Bloom filter / set of URL hashes"], ["robots.txt cache", "host → rules, fetched_at"]],
        m: "flowchart LR\n  U[\"url_hash\"] --> MD[(\"URL metadata\")]:::s0\n  MD --> OBJ[(\"WARC files in object storage\")]:::s2" },
      { t: "5. High-level architecture", x: "A loop of distributed components.",
        m: "flowchart LR\n  SEED[\"Seeds\"] --> FR[\"URL frontier<br/>priority + per-host queues\"]:::s1\n  FR --> FE[\"Fetchers (many)\"]:::s0\n  FE --> DNS[(\"DNS cache\")]\n  FE --> RB[(\"robots.txt cache\")]\n  FE --> CD{\"Content seen? (hash)\"}:::s2\n  CD -->|\"new\"| ST[(\"Content store\")]\n  CD --> PA[\"Parser / link extractor\"]:::s0\n  PA --> NORM[\"Normalise + filter URLs\"] --> UD{\"URL seen? (Bloom)\"}:::s2\n  UD -->|\"new\"| FR",
        p: ["Partition by host: each worker group owns a set of hosts → politeness is local and easy", "Parsing can be separated from fetching via a queue"] },
      { t: "6. Deep dive: the URL frontier", x: "Decides what to fetch next, balancing priority and politeness.",
        p: ["Front queues by priority (PageRank-ish importance, freshness need, seed lists)", "Back queues: one FIFO per host; a heap keyed by 'next allowed fetch time' per host", "A worker pops the host whose time has come, fetches one URL, reschedules the host after the delay (often scaled by the host's response time)", "Design described in Mercator and the IR textbook by Manning, Raghavan and Schütze", "Stored mostly on disk with in-memory buffers"],
        m: "flowchart LR\n  IN[\"new URLs\"] --> PRI[\"Prioritiser\"]:::s1 --> F1[\"high\"]\n  PRI --> F2[\"medium\"]\n  PRI --> F3[\"low\"]\n  F1 --> RT[\"Router by host\"]\n  F2 --> RT\n  F3 --> RT\n  RT --> B1[\"queue: a.com\"]:::s0\n  RT --> B2[\"queue: b.org\"]:::s0\n  B1 --> HP[\"Heap: next fetch time per host\"]:::s2\n  B2 --> HP --> W[\"Fetch workers\"]" },
      { t: "7. Deep dive: politeness and robots.txt", x: "Don't overload sites; respect their rules.",
        p: ["Fetch and cache /robots.txt per host (e.g. for a day); honour Disallow rules for your user agent (Robots Exclusion Protocol, RFC 9309)", "One connection per host at a time, with a delay between requests; back off on 429/503 and slow responses", "Identify your crawler in User-Agent with a contact URL", "Cache DNS results — DNS lookups can become a bottleneck"],
        m: "sequenceDiagram\n  participant W as Worker\n  participant H as example.com\n  W->>H: GET /robots.txt (cached 24 h)\n  H-->>W: Disallow: /private/\n  W->>H: GET /blog/post-1\n  Note over W: wait ≥ delay before next request to this host\n  W->>H: GET /blog/post-2" },
      { t: "8. Deep dive: deduplication and traps", x: "The web is full of duplicates and infinite spaces.",
        p: ["URL normalisation: lowercase host, remove fragments, sort/strip tracking params, resolve relative links", "URL dedupe: Bloom filter of seen URL hashes (F26) — a false positive just skips a page", "Content dedupe: hash of the body for exact duplicates; SimHash/MinHash for near-duplicates", "Spider traps: infinite calendars, session ids in URLs → max depth, max URLs per host, URL length limits, pattern detection"],
        m: "flowchart LR\n  L[\"link\"] --> N[\"normalise\"]:::s1 --> B{\"Bloom: seen?\"}:::s2\n  B -->|\"maybe yes\"| X[\"skip\"]\n  B -->|\"no\"| T{\"trap rules ok?\"}\n  T -->|\"yes\"| FR[\"frontier\"]:::s0\n  T -->|\"no\"| X" },
      { t: "9. Recrawl, bottlenecks and trade-offs", x: "Pages change at very different rates.",
        p: ["Schedule next_fetch_at by observed change rate and importance (news hourly, archives monthly)", "Use conditional GETs (If-Modified-Since / ETag) to save bandwidth", "Sitemaps tell you about new/changed URLs", "Bottlenecks: DNS, politeness on huge hosts, frontier disk I/O, parsing CPU", "Trade-offs: freshness vs coverage vs politeness; JS rendering (headless browsers) is ~10× more expensive"],
        m: "flowchart LR\n  P[\"page fetched\"] --> CH{\"changed since last time?\"}\n  CH -->|\"often\"| FAST[\"recrawl sooner\"]:::s0\n  CH -->|\"rarely\"| SLOW[\"recrawl later\"]:::s1" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Frontier with priority front queues and per-host back queues + heap", "Fetchers partitioned by host; robots.txt and DNS caches; politeness delays", "Normalise URLs, Bloom-filter dedupe, content hashing, trap limits", "Content in WARC files on object storage; metadata in a wide-column store", "Adaptive recrawl with conditional GETs and sitemaps"],
        m: "flowchart LR\n  FR[\"Frontier\"]:::s1 --> FE[\"Fetch\"]:::s0 --> PA[\"Parse\"]:::s0 --> DD[\"Dedupe\"]:::s2 --> FR" }
    ],
    widget: { heading: "Crawl capacity and politeness calculator", caption: "Set crawl size, duration and politeness to see fetch rate, bandwidth, storage, workers — and whether politeness makes it impossible.", render: widget },
    examples: [
      ["Mercator", "A scalable, extensible crawler from Compaq/DEC research (Heydon & Najork, 1999) whose frontier design is still taught."],
      ["Common Crawl", "A non-profit that publishes monthly-ish crawls of billions of pages in WARC format on public cloud storage."],
      ["Googlebot", "Respects robots.txt and adjusts its crawl rate based on how quickly a site responds and on server errors."],
      ["RFC 9309", "The Robots Exclusion Protocol was standardised as RFC 9309 in 2022, nearly 30 years after robots.txt began (1994)."]
    ],
    pitfalls: [
      "No per-host politeness — your crawler becomes a DDoS",
      "Ignoring robots.txt",
      "Keeping the whole frontier in RAM",
      "No URL normalisation, so the same page is crawled many times",
      "Falling into spider traps (infinite calendars, session ids)",
      "Uncached DNS lookups"
    ],
    quiz: [
      ["What makes per-host politeness easy to enforce?", ["Random URL assignment", "Partitioning hosts to workers and keeping one queue per host", "More bandwidth", "Bigger Bloom filter"], 1, "Each host's rate is controlled in one place."],
      ["1 billion pages in 30 days is roughly…", ["40 pages/s", "400 pages/s", "4,000 pages/s", "40,000 pages/s"], 1, "10⁹ ÷ 2.6 × 10⁶ s ≈ 385."],
      ["A Bloom filter false positive in URL dedupe means…", ["Crawling a page twice", "Skipping a page never crawled", "Crashing", "Ignoring robots.txt"], 1, "Acceptable at a small rate."],
      ["What detects near-duplicate pages?", ["MD5 of the URL", "SimHash/MinHash of the content", "DNS", "robots.txt"], 1, "Exact hashes only catch identical bodies."],
      ["Which saves bandwidth on recrawls?", ["Conditional GET with If-Modified-Since/ETag", "Bigger pages", "Disabling compression", "More workers"], 0, "304 Not Modified skips the body."],
      ["A site has an infinite calendar of links. Defence?", ["Crawl it all", "Depth/URL-count limits per host and pattern detection", "Restart the crawler", "Block DNS"], 1, "Spider-trap protection."],
      ["Where should the frontier mostly live at billions of URLs?", ["Browser", "Disk with in-memory buffers", "CPU cache", "CDN"], 1, "Too big for RAM."],
      ["What standard defines robots.txt?", ["RFC 6455", "RFC 9309", "RFC 7231", "RFC 9562"], 1, "Robots Exclusion Protocol, 2022."]
    ],
    practice: {
      q: "Your crawler must keep a news search index fresh: new articles from 50,000 news sites should be indexed within 5 minutes of publication. How do you adapt the design?",
      a: [
        ["Discovery", "Poll RSS/Atom feeds and news sitemaps frequently (every 1–5 min per site, adaptive to publishing rate) instead of re-crawling whole sites."],
        ["Priority", "Separate high-priority frontier for news hosts; new article URLs go to the front queue."],
        ["Politeness", "Feed polling is cheap (one small request); conditional GETs; respect crawl-delay and back off on errors."],
        ["Push", "Support WebSub (PubSubHubbub) or IndexNow-style pings where publishers offer them."],
        ["Pipeline", "Fetch → parse → dedupe (syndicated copies via SimHash) → stream straight to the indexer (Kafka) rather than batch."],
        ["Trade-offs", "More requests to news hosts and more infrastructure for a small slice of the web; the main crawl stays batch."]
      ]
    },
    recap: [
      "Crawl loop: frontier → fetch → parse → dedupe → frontier.",
      "Frontier = priority front queues + per-host back queues with next-fetch times.",
      "Obey robots.txt, delay per host, cache DNS, identify yourself.",
      "Normalise URLs, Bloom-filter seen URLs, hash content, guard against traps.",
      "Store WARC in object storage; recrawl adaptively with conditional GETs."
    ]
  });
})();
