/* Lesson F26: Bloom filters & probabilistic structures */
(function () {
  "use strict";
  var H = window.HLD;
  function fnv(str, seed) { var h = 2166136261 ^ seed; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return h >>> 0; }

  function widget(el, ctx) {
    var s = ctx.state; if (!s.m) { s.m = 64; s.k = 3; s.items = ["apple.com", "github.com", "wikipedia.org"]; s.probe = "example.com"; }
    el.innerHTML = "<div class='grid2'><label class='field'>Bits (m): <strong data-v='m' style='color:var(--text)'></strong><input type='range' min='16' max='256' step='8' data-k='m'></label>" +
      "<label class='field'>Hash functions (k): <strong data-v='k' style='color:var(--text)'></strong><input type='range' min='1' max='8' data-k='k'></label></div>" +
      "<div class='grid2'><label class='field'>Add an item<input type='text' data-r='add' placeholder='type and press Enter'></label><label class='field'>Check an item<input type='text' data-r='probe'></label></div>" +
      "<div class='controls'><button class='btn' data-a='fill'>Add 20 random URLs</button><button class='btn' data-a='reset'>Reset</button></div>" +
      "<div data-r='bits' style='display:flex;flex-wrap:wrap;gap:2px;margin:10px 0'></div><div class='callout' data-r='ans'></div><div class='metrics' data-r='met'></div>" +
      "<p class='caption'>Expected false-positive rate ≈ (1 − e^(−kn/m))^k for n items. Optimal k ≈ (m/n)·ln 2. Hashes here are simple seeded FNV-style hashes for teaching.</p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function pos(x) { var p = []; for (var i = 0; i < s.k; i++) p.push(fnv(x, i * 0x9e3779b1) % s.m); return p; }
    function draw() {
      ["m", "k"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; el.querySelector("[data-v='" + k + "']").textContent = s[k]; });
      q("probe").value = s.probe;
      var bits = new Array(s.m).fill(0); s.items.forEach(function (it) { pos(it).forEach(function (p) { bits[p] = 1; }); });
      var pp = s.probe ? pos(s.probe) : [];
      q("bits").innerHTML = bits.map(function (b, i) { var hit = pp.indexOf(i) >= 0; return "<span title='bit " + i + "' style='width:14px;height:14px;border-radius:3px;background:" + (b ? "var(--c0)" : "var(--bg-subtle)") + ";outline:" + (hit ? "2px solid var(--danger)" : "1px solid var(--border)") + "'></span>"; }).join("");
      var maybe = pp.length && pp.every(function (p) { return bits[p]; }), real = s.items.indexOf(s.probe) >= 0, a = q("ans");
      if (!s.probe) { a.className = "callout"; a.textContent = "Type something to check."; }
      else if (!maybe) { a.className = "callout success"; a.innerHTML = "<strong>Definitely not present.</strong> At least one of its bits (" + pp.join(", ") + ") is 0."; }
      else if (real) { a.className = "callout info"; a.innerHTML = "<strong>Probably present</strong> — and it really was added. All bits " + pp.join(", ") + " are 1."; }
      else { a.className = "callout"; a.style.borderColor = "var(--danger)"; a.innerHTML = "<strong>False positive!</strong> '" + ctx.esc(s.probe) + "' was never added, but bits " + pp.join(", ") + " were all set by other items."; }
      var n = s.items.length, fp = Math.pow(1 - Math.exp(-s.k * n / s.m), s.k), set = bits.filter(Boolean).length;
      q("met").innerHTML = [[n, "Items added (n)"], [set + " / " + s.m, "Bits set"], [(fp * 100).toFixed(2) + "%", "Expected false-positive rate"], [n ? Math.max(1, Math.round(s.m / n * Math.LN2)) : "–", "Optimal k for this n"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } if (e.target.getAttribute("data-r") === "probe") { s.probe = e.target.value.trim().toLowerCase(); ctx.save(); draw(); } });
    q("add").addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.value.trim()) { var v = e.target.value.trim().toLowerCase(); if (s.items.indexOf(v) < 0) s.items.push(v); e.target.value = ""; ctx.save(); draw(); } });
    el.addEventListener("click", function (e) { var a = e.target.getAttribute("data-a"); if (a === "fill") { for (var i = 0; i < 20; i++) s.items.push("site" + Math.floor(Math.random() * 1e6) + ".com"); } if (a === "reset") s.items = []; if (a) { ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "F26",
    summary: "Answering 'have I seen this?', 'how many distinct?' and 'how often?' in tiny memory: Bloom filters, their false-positive maths and uses, plus HyperLogLog for cardinality and Count-Min Sketch for frequencies.",
    slides: [
      { t: "Trading exactness for memory", x: "At web scale an exact set of billions of items costs gigabytes. Probabilistic data structures give approximate answers in a tiny, fixed amount of memory.",
        table: [["Question", "Structure", "Error type"], ["Is x in the set?", "Bloom filter", "False positives, no false negatives"], ["How many distinct items?", "HyperLogLog", "~1–2% relative error"], ["How often did x appear?", "Count-Min Sketch", "Over-estimates only"]],
        m: "flowchart LR\n  E[\"Exact set: 1B URLs ≈ tens of GB\"]:::bad --> B[\"Bloom filter: ~1.2 GB at 1% false positives\"]:::s2" },
      { t: "How a Bloom filter works", x: "A bit array of m bits, all 0, plus k hash functions.",
        p: ["Add x: compute k hashes, set those k bits to 1", "Check x: if any of its k bits is 0 → definitely not present", "If all k bits are 1 → probably present (they may have been set by other items)", "No false negatives; tunable false positives", "Standard Bloom filters can't delete (clearing a bit could remove other items)"],
        m: "flowchart LR\n  X[\"add 'github.com'\"] --> H1[\"h1 → 3\"] --> B[\"bits: 0 0 0 1 0 1 0 0 1 0\"]:::s0\n  X --> H2[\"h2 → 5\"] --> B\n  X --> H3[\"h3 → 8\"] --> B\n  Q[\"check 'x.com': h → 3, 6\"] --> B --> R[\"bit 6 = 0 → definitely not\"]:::s2" },
      { t: "Sizing a Bloom filter", x: "False-positive rate p depends on bits per item and the number of hashes.",
        p: ["p ≈ (1 − e^(−kn/m))^k", "Optimal k = (m/n) · ln 2", "About 9.6 bits per item gives 1% false positives; ~14.4 bits gives 0.1%", "Adding more items than planned raises p sharply — size for growth, or use scalable Bloom filters"],
        table: [["Bits per item (m/n)", "Optimal k", "False positives"], ["4.8", "3", "≈ 10%"], ["9.6", "7", "≈ 1%"], ["14.4", "10", "≈ 0.1%"]],
        m: "flowchart LR\n  N[\"n items expected\"] --> M[\"m = −n·ln p / (ln 2)²\"]:::s1 --> K[\"k = (m/n)·ln 2\"]:::s0" },
      { t: "Where Bloom filters are used", x: "Use them to skip expensive work when the answer is usually 'no'.",
        p: ["LSM-tree databases (Cassandra, RocksDB, HBase, Bigtable) keep a Bloom filter per SSTable to avoid disk reads for absent keys", "Web crawlers: skip URLs already seen (P06)", "Caches: avoid caching 'one-hit wonders' (Akamai described this)", "Browsers historically checked a local filter before querying a malicious-URL service", "Mention the false-positive consequence: what happens when it wrongly says 'maybe'?"],
        m: "flowchart LR\n  R[\"read key k\"] --> BF{\"Bloom filter for SSTable\"}:::s1\n  BF -->|\"definitely not\"| SKIP[\"skip disk read\"]:::s2\n  BF -->|\"maybe\"| DISK[\"read SSTable from disk\"]:::s0" },
      { t: "Variants", x: "Variations fix specific limits.",
        p: ["Counting Bloom filter: small counters instead of bits → supports deletes (more memory)", "Scalable Bloom filter: adds new filters as it fills", "Cuckoo filter: supports deletion, often smaller at low false-positive rates", "Redis offers Bloom and Cuckoo filters (RedisBloom module, included in Redis Stack / Redis 8)"],
        m: "flowchart LR\n  BF[\"Bloom: bits, no delete\"]:::s0 --> CBF[\"Counting Bloom: counters, delete\"]:::s1\n  BF --> CF[\"Cuckoo filter: fingerprints, delete\"]:::s2" },
      { t: "HyperLogLog: counting distinct items", x: "Estimate the number of unique visitors, searches or IPs using a few kilobytes, no matter how many items.",
        p: ["Idea: in random hashes, a run of many leading zeros is rare — the longest run hints at how many distinct values you've seen", "Many registers (buckets) are averaged (harmonic mean) to reduce error", "Redis PFADD/PFCOUNT uses at most 12 KB per key with ~0.81% standard error", "Mergeable: union of daily HLLs = weekly unique count"],
        m: "flowchart LR\n  V[\"visitor ids\"] --> H[\"hash\"] --> R[\"bucket by first bits; keep max leading-zero run\"]:::s1 --> EST[\"estimate ≈ distinct count\"]:::s0\n  D1[\"Mon HLL\"] --> U[\"merge → week uniques\"]:::s2\n  D2[\"Tue HLL\"] --> U" },
      { t: "Count-Min Sketch: approximate frequencies", x: "A small 2-D array of counters with one hash function per row. Answers 'how many times did x appear?'.",
        p: ["Add x: increment one counter in each row (chosen by that row's hash)", "Query x: take the minimum of its counters", "Collisions only add, so it over-estimates, never under-estimates", "Used for heavy hitters / trending topics, top-k with a heap, network traffic stats"],
        m: "flowchart LR\n  X[\"x\"] --> R1[\"row 1: counter[h1(x)] += 1\"]:::s0\n  X --> R2[\"row 2: counter[h2(x)] += 1\"]:::s0\n  X --> R3[\"row 3: counter[h3(x)] += 1\"]:::s0\n  R1 --> MIN[\"estimate = min of the 3\"]:::s2\n  R2 --> MIN\n  R3 --> MIN" },
      { t: "Probabilistic structures in interviews", x: "Bring them in when memory or I/O for exact answers is the problem.",
        p: ["Crawler: 'Bloom filter of seen URLs, ~10 bits per URL for ~1% false positives; a false positive just means skipping a page.'", "Analytics: 'Daily unique users per page with HyperLogLog in Redis; merge for weekly.'", "Trending: 'Count-Min Sketch per time window + heap for top-k hashtags.'", "Always say what the error means for the product and why it's acceptable"],
        m: "flowchart LR\n  C[\"Crawler\"] --> BF[\"Bloom: seen URL?\"]:::s0\n  A[\"Analytics\"] --> HLL[\"HLL: unique users\"]:::s1\n  T[\"Trends\"] --> CMS[\"Count-Min: hashtag counts\"]:::s2" }
    ],
    widget: { heading: "Bloom filter playground", caption: "Add items, check others, and change m and k to see false positives appear as the filter fills.", render: widget },
    examples: [
      ["Bloom (1970)", "Burton Howard Bloom introduced the structure in 'Space/Time Trade-offs in Hash Coding with Allowable Errors'."],
      ["Cassandra and RocksDB", "Keep per-SSTable Bloom filters so reads for missing keys skip most files; Cassandra exposes bloom_filter_fp_chance per table."],
      ["Redis HyperLogLog", "PFADD/PFCOUNT/PFMERGE estimate cardinality in at most 12 KB per key with a standard error of 0.81%."],
      ["Akamai", "Described caching an object only on its second request, using Bloom filters to remember first requests, to avoid caching one-hit wonders."]
    ],
    pitfalls: [
      "Claiming Bloom filters can give false negatives (they can't) or can delete (standard ones can't)",
      "Using a Bloom filter where a false positive is unacceptable without a fallback check",
      "Under-sizing the filter, so the false-positive rate explodes as items grow",
      "Using exact sets for billions of items when an estimate is fine",
      "Forgetting that Count-Min over-estimates",
      "Not explaining what the error means for users"
    ],
    quiz: [
      ["A Bloom filter says an item is NOT present. How sure is that?", ["50%", "It's certain", "Depends on k", "Never certain"], 1, "No false negatives: a 0 bit means it was never added."],
      ["Why can't a standard Bloom filter delete items?", ["It's read-only", "Clearing bits could remove other items that share them", "Deletes are too slow", "It stores items in plain text"], 1, "Counting Bloom or Cuckoo filters support deletes."],
      ["Roughly how many bits per item give a 1% false-positive rate?", ["1", "~10", "~100", "~1000"], 1, "About 9.6 bits per item with k ≈ 7."],
      ["What happens as you add far more items than planned?", ["False positives rise sharply", "False negatives appear", "Memory grows automatically", "Nothing"], 0, "More bits are set, so random items match."],
      ["Which structure estimates the number of distinct users?", ["Bloom filter", "HyperLogLog", "Count-Min Sketch", "B-tree"], 1, "Kilobytes of memory for billions of items."],
      ["Count-Min Sketch errors are…", ["Under-estimates only", "Over-estimates only", "Random in both directions", "Zero"], 1, "Collisions only add counts; the minimum limits the error."],
      ["Why do LSM-tree databases keep Bloom filters per SSTable?", ["Compression", "To skip disk reads for keys that aren't in that file", "Encryption", "Replication"], 1, "Most files don't contain a given key."],
      ["A crawler's Bloom filter wrongly says a URL was seen. Consequence?", ["Crash", "That page is skipped — usually acceptable", "Duplicate crawl", "Infinite loop"], 1, "False positives cause skips, not duplicates."]
    ],
    practice: {
      q: "A crawler will discover about 10 billion URLs. Design 'have we already queued this URL?' checks across 200 crawler workers, and estimate memory.",
      a: [
        ["Structure", "Bloom filter over normalized URLs; a false positive means skipping a never-seen page, acceptable at ~1%."],
        ["Memory", "~9.6 bits/URL × 10B ≈ 96 Gbit ≈ 12 GB for 1% (k ≈ 7); ~18 GB for 0.1%."],
        ["Distribution", "Partition by hash(host or URL) across N filter shards (e.g. 16 × ~0.75 GB), each owned by a service or kept in Redis Bloom; workers query the shard for that key."],
        ["Exact fallback (optional)", "For important domains, keep an exact store (e.g. key-value of URL hashes) behind the filter."],
        ["Growth", "Use scalable Bloom filters or rebuild periodically; track estimated fill ratio."],
        ["Related", "Content dedupe with checksums or SimHash; count distinct hosts with HyperLogLog."],
        ["Trade-offs", "Memory vs false-positive rate; no deletes (recrawl scheduling uses a separate store with timestamps)."]
      ]
    },
    recap: [
      "Probabilistic structures trade small, known errors for huge memory savings.",
      "Bloom filter: k hashes set bits; 'no' is certain, 'yes' is probable.",
      "~10 bits per item ≈ 1% false positives; size for growth.",
      "HyperLogLog counts distinct items in KB (Redis: 12 KB, ~0.81% error).",
      "Count-Min Sketch counts frequencies and only over-estimates."
    ]
  });
})();
