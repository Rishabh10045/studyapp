/* Lesson F03: Back-of-the-envelope estimation */
(function () {
  "use strict";
  var H = window.HLD;

  function fmtNum(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + " T";
    if (n >= 1e9) return (n / 1e9).toFixed(1) + " B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + " M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + " K";
    return n.toFixed(n < 10 ? 1 : 0);
  }
  function fmtBytes(b) {
    var u = ["B", "KB", "MB", "GB", "TB", "PB", "EB"], i = 0;
    while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; }
    return b.toFixed(b < 10 ? 1 : 0) + " " + u[i];
  }

  function widget(el, ctx) {
    var s = ctx.state;
    var F = [
      ["dau", "Daily active users", 10000000],
      ["reads", "Reads per user per day", 20],
      ["writes", "Writes per user per day", 2],
      ["peak", "Peak factor (peak ÷ average)", 3],
      ["size", "Bytes per write (stored item)", 500],
      ["resp", "Bytes per read response", 2000],
      ["years", "Retention (years)", 5],
      ["rf", "Replication factor", 3]
    ];
    F.forEach(function (f) { if (s[f[0]] === undefined) s[f[0]] = f[2]; });
    el.innerHTML = "<div class='card'><div class='grid3' data-r='in'></div><div class='btnrow' style='margin-top:12px'><button type='button' class='btn' data-r='ex1'>Example: URL shortener</button><button type='button' class='btn' data-r='ex2'>Example: chat app</button><button type='button' class='btn' data-r='rs'>Reset</button></div></div><div class='metrics' data-r='out'></div><p class='caption' data-r='note'></p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("in").innerHTML = F.map(function (f) { return "<label class='field'>" + f[1] + "<input type='text' inputmode='decimal' data-k='" + f[0] + "'></label>"; }).join("");
    function sync() { F.forEach(function (f) { el.querySelector("[data-k='" + f[0] + "']").value = String(s[f[0]]); }); }
    function draw() {
      var day = 86400;
      var rq = s.dau * s.reads / day, wq = s.dau * s.writes / day;
      var storeDay = s.dau * s.writes * s.size;
      var total = storeDay * 365 * s.years * s.rf;
      var bw = rq * s.peak * s.resp;
      var cache = s.dau * s.reads * s.resp * 0.2;
      var M = [
        [fmtNum(rq), "Average read QPS"], [fmtNum(rq * s.peak), "Peak read QPS"],
        [fmtNum(wq), "Average write QPS"], [fmtNum(wq * s.peak), "Peak write QPS"],
        [fmtBytes(storeDay), "New data per day (1 copy)"], [fmtBytes(total), "Storage over retention × replicas"],
        [fmtBytes(bw) + "/s", "Peak egress bandwidth"], [fmtBytes(cache), "Cache for 20% of a day's reads"]
      ];
      q("out").innerHTML = M.map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      q("note").textContent = "Read:write ratio " + (s.writes ? (s.reads / s.writes).toFixed(0) + ":1" : "n/a") + ". Formulas: QPS = users × actions ÷ 86,400; storage = writes/day × size × 365 × years × replicas; cache uses the common 80/20 heuristic. Decimal units (1 KB = 1,000 B) for easy mental maths.";
    }
    q("in").addEventListener("input", function (e) {
      var k = e.target.getAttribute("data-k"); var v = parseFloat(String(e.target.value).replace(/,/g, ""));
      if (k && !isNaN(v) && v >= 0) { s[k] = v; ctx.save(); draw(); }
    });
    function set(o) { Object.keys(o).forEach(function (k) { s[k] = o[k]; }); ctx.save(); sync(); draw(); }
    q("ex1").addEventListener("click", function () { set({ dau: 100000000, reads: 10, writes: 1, peak: 2, size: 500, resp: 500, years: 10, rf: 3 }); });
    q("ex2").addEventListener("click", function () { set({ dau: 500000000, reads: 40, writes: 40, peak: 3, size: 100, resp: 100, years: 5, rf: 3 }); });
    q("rs").addEventListener("click", function () { var o = {}; F.forEach(function (f) { o[f[0]] = f[2]; }); set(o); });
    sync(); draw();
  }

  H.registerLesson({
    code: "F03",
    summary: "Turn 'a lot of users' into numbers that drive design decisions: QPS, peak load, storage, bandwidth, cache size and server counts, using a small toolkit of rounded constants.",
    slides: [
      { t: "Why estimate at all?", x: "Estimates decide the architecture. 50 writes per second fits on one database; 500,000 does not. The goal is the right order of magnitude, not precision.",
        p: ["Done in the first 5 minutes of an interview, after requirements", "Answers: is it read- or write-heavy? Does data fit on one machine? Do we need a cache, sharding, a CDN?", "Round aggressively and say your assumptions out loud", "Being within 2–5x is usually good enough"],
        m: "flowchart LR\n  A[\"Assumptions<br/>DAU, actions, sizes\"]:::s1 --> B[\"Estimates<br/>QPS, storage, bandwidth\"]:::s0 --> C[\"Decisions<br/>cache? shard? CDN?\"]:::s2" },
      { t: "Toolkit: powers of ten and two", x: "Memorise a few anchors and the rest is multiplication.",
        table: [["Anchor", "Value", "Handy approximation"], ["Seconds per day", "86,400", "≈ 10^5 (100K)"], ["Seconds per month", "≈ 2.6 million", "≈ 2.5 × 10^6"], ["Seconds per year", "≈ 31.5 million", "≈ 3 × 10^7"], ["2^10 / 2^20 / 2^30 / 2^40", "KB / MB / GB / TB", "thousand / million / billion / trillion"], ["1 million req/day", "≈ 11.6 req/s", "≈ 12 QPS"], ["1 billion req/day", "≈ 11,600 req/s", "≈ 12K QPS"]],
        p: ["Using 10^5 s/day overestimates QPS by about 15%, which is a safe direction", "Character ≈ 1 byte (ASCII) to 4 bytes (UTF-8 worst case); a UUID is 16 bytes binary, 36 as text"],
        m: "flowchart LR\n  D[\"1 day ≈ 10^5 s\"]:::s0 --> M[\"1M/day ≈ 12/s\"] --> B[\"1B/day ≈ 12K/s\"]:::s1" },
      { t: "Toolkit: latency numbers", x: "Order-of-magnitude costs tell you what to avoid on the hot path. These are the classic figures; modern hardware varies, but the ratios still hold roughly.",
        table: [["Operation", "Approx. time"], ["L1 cache reference", "0.5 ns"], ["Main memory reference", "100 ns"], ["Read 1 MB sequentially from memory", "250 µs"], ["Round trip within a datacenter", "500 µs"], ["Disk seek (spinning disk)", "10 ms"], ["Packet California → Netherlands → California", "150 ms"]],
        p: ["Memory is about 100,000x faster than a disk seek: that's why caches exist", "Cross-continent round trips cost ~150 ms: that's why CDNs and regional deployments exist", "SSDs are much faster than spinning disks for random reads"],
        m: "flowchart LR\n  R[\"RAM ~100 ns\"]:::s2 --> N[\"Same-DC network ~0.5 ms\"]:::s0 --> D[\"Disk seek ~10 ms\"]:::s1 --> W[\"Cross-continent ~150 ms\"]:::bad" },
      { t: "Step 1: users → QPS", x: "Start from daily active users (DAU) and how often each one acts.",
        p: ["Average QPS = DAU × actions per user per day ÷ 86,400", "Example: 100M DAU × 10 reads = 1B reads/day ≈ 11.6K reads/s", "Split reads and writes; they stress different parts of the system", "Ask: what counts as one request? A page view can be many API calls"],
        table: [["Input", "Value"], ["DAU", "100 million"], ["Reads per user per day", "10"], ["Reads per day", "1 billion"], ["Average read QPS", "≈ 11,600"]],
        m: "flowchart LR\n  U[\"DAU 100M\"] --> X[\"× 10 reads/user\"] --> D[\"1B reads/day\"] --> Q[\"÷ 86,400 ≈ 11.6K QPS\"]:::s0" },
      { t: "Step 2: peak load and read:write ratio", x: "Traffic is not flat. Design for the peak, and let the read:write ratio steer the architecture.",
        p: ["Peak QPS = average × peak factor; the factor is an assumption, so state it (2–3x is a common starting guess; events can be far spikier)", "Read-heavy (e.g. 100:1): caches, CDNs, read replicas", "Write-heavy (e.g. logging, chat, IoT): queues, LSM-based stores, partitioning", "Peak write QPS on one relational primary is a key number to sanity-check"],
        m: "flowchart LR\n  A[\"Average QPS\"] --> P[\"× peak factor\"] --> K[\"Peak QPS\"]:::s0\n  K --> R{\"Read:write?\"}\n  R -- \"read-heavy\" --> C[\"Cache, CDN, replicas\"]:::s2\n  R -- \"write-heavy\" --> W[\"Queues, sharding, LSM stores\"]:::s1" },
      { t: "Step 3: storage", x: "Storage = new items per day × size per item × retention, then multiply by replicas and add indexes and overhead.",
        p: ["Example: 100M new items/day × 500 B = 50 GB/day", "× 365 × 5 years ≈ 91 TB for one copy; × 3 replicas ≈ 274 TB", "Separate small metadata (database) from large blobs (object storage)", "Media dominates: one photo (hundreds of KB to MB) outweighs thousands of text rows"],
        m: "flowchart LR\n  N[\"Items/day\"] --> S[\"× bytes/item\"] --> R[\"× days retained\"] --> X[\"× replicas\"] --> T[\"Total storage\"]:::s0" },
      { t: "Step 4: bandwidth", x: "Bandwidth = QPS × payload size. Compute ingress (uploads) and egress (downloads) separately.",
        p: ["Example: 12K reads/s × 2 KB = 24 MB/s ≈ 192 Mbit/s", "Video and images dominate egress: this is what CDNs are for", "Remember bytes vs bits: multiply MB/s by 8 for Mbit/s"],
        m: "flowchart LR\n  Q[\"Read QPS\"] --> M[\"× response size\"] --> E[\"Egress MB/s\"]:::s0 --> B[\"× 8 = Mbit/s\"]" },
      { t: "Step 5: memory for caching", x: "A common heuristic (80/20 rule): a small share of items gets most of the traffic, so caching about 20% of a day's read data often captures most hits.",
        p: ["Example: 1B reads/day × 500 B ≈ 500 GB of read traffic; 20% ≈ 100 GB of cache", "100 GB fits in RAM across a few cache nodes", "The 80/20 split is a heuristic: real access skew should be measured", "Cache hit ratio drives database load: 90% hits means only 10% of reads reach the DB"],
        m: "flowchart LR\n  D[\"Daily read volume\"] --> H[\"× 20% hot set (heuristic)\"] --> C[\"Cache RAM needed\"]:::s1" },
      { t: "Step 6: how many servers?", x: "Servers needed ≈ peak QPS ÷ QPS one server can handle, plus headroom and redundancy. Per-server capacity is an assumption you must state.",
        p: ["Example: 35K peak QPS ÷ an assumed 5K QPS per server = 7, round up and add redundancy → about 10", "Capacity depends heavily on request cost: a cached lookup vs a heavy query differ by orders of magnitude", "Keep headroom (servers well below 100% busy) to avoid queueing delays", "Plan N+1 or N+2 so you survive losing servers or a zone"],
        m: "flowchart LR\n  P[\"Peak QPS\"] --> D[\"÷ QPS per server (assumed)\"] --> H[\"+ headroom\"] --> R[\"+ redundancy N+1\"] --> S[\"Server count\"]:::s0" },
      { t: "Worked example: URL shortener", x: "A common interview setup. Assumptions: 100M new URLs per day, read:write 10:1, 10-year retention, ~500 bytes per record.",
        table: [["Metric", "Calculation", "Result"], ["Write QPS", "100M ÷ 86,400", "≈ 1,160/s"], ["Read QPS", "× 10", "≈ 11,600/s"], ["Records in 10 years", "100M × 365 × 10", "365 billion"], ["Storage (1 copy)", "365B × 500 B", "≈ 183 TB"], ["Cache (80/20)", "1B reads/day × 500 B × 20%", "≈ 100 GB"]],
        p: ["Conclusion: read-heavy, needs a cache; 365B rows means a horizontally scalable store", "Key space check: 7 Base62 characters give 62^7 ≈ 3.5 trillion codes, enough for 365B"],
        m: "flowchart LR\n  W[\"1.16K writes/s\"] --> DB[\"Sharded / NoSQL store ~183 TB\"]:::s2\n  R[\"11.6K reads/s\"] --> C[\"Cache ~100 GB\"]:::s1 --> DB" },
      { t: "Presenting estimates in an interview", x: "Clear, quick, and tied to decisions. Interviewers care more about your reasoning than your arithmetic.",
        p: ["Write assumptions on the board first", "Round numbers: 86,400 → 10^5, 1,160 → ~1K", "Show units at every step (requests/s, bytes, GB/day)", "Finish each number with 'so this means …' (e.g. 'so one DB primary can't take this write load')", "Sanity check: does the result match known systems of similar scale?"],
        m: "flowchart LR\n  A[\"State assumptions\"] --> B[\"Round & compute\"] --> C[\"Units at each step\"] --> D[\"So this means…\"]:::s0" }
    ],
    widget: { heading: "Estimation calculator", caption: "Type your own assumptions or load an example. Outputs are rough orders of magnitude.", render: widget },
    examples: [
      ["'Latency numbers every programmer should know'", "Popularised by Jeff Dean's talks at Google; the table of memory, network and disk costs is the standard reference for estimation."],
      ["Jeff Dean's back-of-the-envelope talks", "His 'Designs, Lessons and Advice from Building Large Distributed Systems' (LADIS 2009) walks through estimating designs, e.g. generating image thumbnails, using these numbers."],
      ["Capacity planning in practice", "Production teams combine the same arithmetic with load tests and monitoring of real peaks; interview estimates are the first, rough version of that process."],
      ["Base62 short codes", "Short-link services encode IDs in 62 characters (a–z, A–Z, 0–9); 7 characters give about 3.5 trillion combinations."]
    ],
    pitfalls: [
      "Spending ten minutes on precise arithmetic instead of rounding",
      "Forgetting peak traffic and designing only for the average",
      "Mixing up bits and bytes, or MB and Mbit",
      "Forgetting replication and indexes when sizing storage",
      "Producing numbers but never saying what decision they lead to",
      "Assuming per-server capacity without stating it as an assumption",
      "Ignoring media: images and video dwarf text storage and bandwidth"
    ],
    quiz: [
      ["About how many requests per second is 1 billion requests per day?", ["1,160", "11,600", "116,000", "1.16 million"], 1, "1,000,000,000 ÷ 86,400 ≈ 11,574 ≈ 11.6K per second."],
      ["Which approximation for seconds in a day is commonly used for quick maths?", ["10^3", "10^4", "10^5", "10^6"], 2, "86,400 ≈ 10^5. It slightly overestimates QPS, which is a safe direction."],
      ["A service stores 10M new items/day at 1 KB each for 3 years with 3 replicas. Roughly how much storage?", ["11 TB", "33 TB", "100 GB", "3 PB"], 1, "10M × 1 KB = 10 GB/day; × 365 × 3 ≈ 11 TB; × 3 replicas ≈ 33 TB."],
      ["Read QPS is 20K and each response is 5 KB. What is the egress bandwidth?", ["100 KB/s", "100 MB/s (≈ 800 Mbit/s)", "100 GB/s", "4 MB/s"], 1, "20,000 × 5 KB = 100,000 KB/s = 100 MB/s; × 8 = 800 Mbit/s."],
      ["What is the purpose of the peak factor?", ["To convert bytes to bits", "To design for the busiest period, not the daily average", "To estimate replication overhead", "To size the CDN only"], 1, "Traffic follows daily and event-driven patterns; capacity must cover peaks."],
      ["Your read:write ratio is 200:1. Which design direction does that suggest first?", ["Sharding for writes", "Caching, CDN and read replicas", "A write-ahead log", "Bigger message queues"], 1, "Read-heavy workloads benefit most from serving reads cheaply: caches, CDNs and replicas."],
      ["Using the 80/20 heuristic, a system reads 400 GB of data per day. About how much cache would you plan for first?", ["8 GB", "80 GB", "400 GB", "4 TB"], 1, "20% of the daily read volume: 0.2 × 400 GB = 80 GB. Validate with real access patterns later."],
      ["How many unique codes do 7 Base62 characters give?", ["About 62 million", "About 3.5 billion", "About 3.5 trillion", "About 7 trillion"], 2, "62^7 ≈ 3.52 × 10^12."]
    ],
    practice: {
      q: "Estimate the scale for a photo-sharing app with 50M DAU. Each user views 30 photos and uploads 0.2 photos per day; an average photo is 300 KB after compression, and photos are kept forever. What do the numbers tell you about the design?",
      a: [
        ["State assumptions", "50M DAU, 30 views and 0.2 uploads per user per day, 300 KB per photo, peak factor 3, metadata ~1 KB per photo, 3 replicas for metadata."],
        ["Uploads", "50M × 0.2 = 10M photos/day ≈ 116 uploads/s average, ~350/s at peak."],
        ["Views", "50M × 30 = 1.5B views/day ≈ 17K/s average, ~52K/s at peak; read:write ≈ 150:1."],
        ["Storage", "10M × 300 KB = 3 TB/day ≈ 1.1 PB/year of photos (object storage handles durability). Metadata: 10M × 1 KB = 10 GB/day ≈ 3.65 TB/year, ×3 ≈ 11 TB/year."],
        ["Bandwidth", "Peak 52K views/s × 300 KB ≈ 15.6 GB/s ≈ 125 Gbit/s of egress: this must come from a CDN, not origin servers."],
        ["Cache", "Metadata reads: 1.5B × 1 KB ≈ 1.5 TB/day; 20% ≈ 300 GB of cache for hot metadata, spread over a cache cluster."],
        ["So this means", "Object storage + CDN for photos; a horizontally scalable metadata store; heavy caching; async processing for uploads (resizing) via a queue."]
      ]
    },
    recap: [
      "Anchor numbers: 1 day ≈ 10^5 s, 1M/day ≈ 12/s, 1B/day ≈ 12K/s.",
      "QPS = DAU × actions ÷ 86,400; multiply by a stated peak factor.",
      "Storage = items/day × size × retention × replicas; media dominates.",
      "Bandwidth = QPS × payload; ×8 for bits; big egress means a CDN.",
      "Always end with 'so this means…' and the design decision."
    ]
  });
})();
