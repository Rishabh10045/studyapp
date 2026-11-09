/* Lesson F25: Distributed unique IDs */
(function () {
  "use strict";
  var H = window.HLD;
  var EPOCH = 1288834974657n; // Twitter Snowflake epoch (Nov 4, 2010)
  var B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  function base62(n) { if (n === 0n) return "0"; var s = ""; while (n > 0n) { s = B62[Number(n % 62n)] + s; n = n / 62n; } return s; }

  function widget(el, ctx) {
    var s = ctx.state; if (s.dc == null) { s.dc = 3; s.wk = 17; s.seq = 0; s.ms = 0; s.log = []; }
    el.innerHTML = "<div class='grid2'><label class='field'>Datacenter id (5 bits, 0–31): <strong data-v='dc' style='color:var(--text)'></strong><input type='range' min='0' max='31' data-k='dc'></label>" +
      "<label class='field'>Worker id (5 bits, 0–31): <strong data-v='wk' style='color:var(--text)'></strong><input type='range' min='0' max='31' data-k='wk'></label></div>" +
      "<div class='controls'><button class='btn primary' data-a='gen'>Generate ID</button><button class='btn' data-a='burst'>Generate 5 in the same millisecond</button><button class='btn' data-a='clear'>Clear</button></div>" +
      "<div data-r='bits' style='margin:10px 0;font-family:ui-monospace,monospace;font-size:12px;word-break:break-all'></div>" +
      "<div class='rows' data-r='log'></div><div class='metrics' data-r='m'></div>" +
      "<p class='caption'>Layout follows Twitter's Snowflake: 1 unused sign bit + 41-bit milliseconds since a custom epoch + 10-bit machine id (here 5 datacenter + 5 worker) + 12-bit sequence. Uses your browser clock.</p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function make() {
      var now = Date.now();
      if (now === s.ms) s.seq = (s.seq + 1) & 4095; else { s.seq = 0; s.ms = now; }
      var id = ((BigInt(now) - EPOCH) << 22n) | (BigInt(s.dc) << 17n) | (BigInt(s.wk) << 12n) | BigInt(s.seq);
      s.log.unshift([id.toString(), s.seq]); s.log = s.log.slice(0, 6);
      return id;
    }
    function draw() {
      ["dc", "wk"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; el.querySelector("[data-v='" + k + "']").textContent = s[k]; });
      if (!s.log.length) { q("bits").innerHTML = "<span class='caption'>Press Generate.</span>"; q("log").innerHTML = ""; q("m").innerHTML = ""; return; }
      var id = BigInt(s.log[0][0]), bin = id.toString(2).padStart(64, "0");
      var parts = [[bin.slice(0, 1), "sign", "var(--text-3)"], [bin.slice(1, 42), "timestamp (41)", "var(--c0)"], [bin.slice(42, 47), "dc (5)", "var(--c1)"], [bin.slice(47, 52), "worker (5)", "var(--c2)"], [bin.slice(52), "sequence (12)", "var(--danger)"]];
      q("bits").innerHTML = parts.map(function (p) { return "<span title='" + p[1] + "' style='color:" + p[2] + ";font-weight:600'>" + p[0] + "</span>"; }).join(" ") +
        "<div style='display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;font-family:inherit'>" + parts.map(function (p) { return "<span style='color:" + p[2] + "'>■ " + p[1] + "</span>"; }).join("") + "</div>";
      q("log").innerHTML = s.log.map(function (r) { var b = BigInt(r[0]); var ts = Number((b >> 22n) + EPOCH); return "<div class='row'><span class='t'><code>" + r[0] + "</code> · base62 <code>" + base62(b) + "</code></span><span class='dt'>" + new Date(ts).toISOString().replace("T", " ").slice(0, 23) + " UTC · seq " + r[1] + "</span></div>"; }).join("");
      var yrs = Math.pow(2, 41) / (1000 * 3600 * 24 * 365.25);
      q("m").innerHTML = [["4,096", "IDs per ms per worker"], ["1,024", "Machine ids"], [yrs.toFixed(1) + " yrs", "Timestamp range from epoch"], [base62(id).length + " chars", "Base62 length"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    }
    el.addEventListener("click", function (e) {
      var a = e.target.getAttribute("data-a"); if (!a) return;
      if (a === "gen") make();
      if (a === "burst") { var t = Date.now(); s.ms = t; s.seq = -1; for (var i = 0; i < 5; i++) { s.seq = (s.seq + 1) & 4095; var id = ((BigInt(t) - EPOCH) << 22n) | (BigInt(s.dc) << 17n) | (BigInt(s.wk) << 12n) | BigInt(s.seq); s.log.unshift([id.toString(), s.seq]); } s.log = s.log.slice(0, 6); }
      if (a === "clear") s.log = [];
      ctx.save(); draw();
    });
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "F25",
    summary: "Generating unique IDs across many machines without a single bottleneck: auto-increment and its limits, UUIDs (v4 and time-ordered v7), Snowflake-style 64-bit IDs, ticket servers and range allocation, and base62 for short codes.",
    slides: [
      { t: "Why IDs get hard at scale", x: "One database's AUTO_INCREMENT works until you have many shards, regions or services creating records at the same time.",
        p: ["Requirements to clarify: unique? sortable by time? size (64 vs 128 bit)? guessable OK? throughput?", "Single counter = bottleneck and single point of failure", "Per-shard auto-increment collides across shards", "IDs often double as sort keys (feeds, logs) and URL codes"],
        m: "flowchart LR\n  S1[\"Shard 1: id 1,2,3\"]:::bad --> C[\"collision!\"]\n  S2[\"Shard 2: id 1,2,3\"]:::bad --> C" },
      { t: "Option 1: database auto-increment tricks", x: "Keep using database counters but avoid collisions.",
        p: ["Step/offset: with 2 servers, one issues odd IDs, the other even (auto_increment_increment / offset in MySQL)", "Hard to add servers later; IDs not globally time-ordered", "Ticket server: a dedicated DB that only hands out IDs (Flickr described this in 2010, using two servers with odd/even)"],
        m: "flowchart LR\n  A[\"Ticket server A: 1,3,5,…\"]:::s0 --> APP[\"App servers\"]\n  B[\"Ticket server B: 2,4,6,…\"]:::s0 --> APP" },
      { t: "Option 2: range (block) allocation", x: "A coordinator hands each server a block of IDs (e.g. 10,000 at a time); the server issues them from memory.",
        p: ["Very fast: one coordinator call per block", "Coordinator can be a DB row updated transactionally, or etcd/ZooKeeper", "If a server crashes, the rest of its block is skipped (gaps are fine)", "IDs are unique but only roughly ordered across servers"],
        m: "sequenceDiagram\n  participant S as App server\n  participant C as Coordinator (DB row)\n  S->>C: give me a block\n  C-->>S: 50,001 – 60,000\n  Note over S: issue IDs from memory\n  S->>C: next block (when nearly used)\n  C-->>S: 90,001 – 100,000" },
      { t: "Option 3: UUIDs", x: "128-bit identifiers that any machine can generate independently with negligible collision risk.",
        table: [["Version", "How", "Sortable?"], ["v4", "122 random bits", "No"], ["v7 (RFC 9562, 2024)", "48-bit Unix ms timestamp + random bits", "Yes, by creation time"], ["v1", "Timestamp + MAC address", "Not lexically; leaks MAC"]],
        pros: ["No coordination at all", "Unguessable (v4)"], cons: ["128 bits: bigger indexes", "Random v4 keys scatter B-tree inserts (page splits, poor locality)", "Long in URLs (36 chars)"],
        m: "flowchart LR\n  A[\"Any server\"] --> U[\"550e8400-e29b-41d4-a716-446655440000\"]:::s1\n  B[\"Any other server\"] --> U2[\"019a6b2c-…  (v7: time-ordered)\"]:::s0" },
      { t: "Option 4: Snowflake IDs", x: "Twitter's Snowflake (2010) packs a timestamp, machine id and sequence into 64 bits.",
        p: ["1 sign bit + 41 bits ms since a custom epoch (~69 years) + 10 bits machine id (1,024 machines) + 12 bits sequence (4,096 IDs per ms per machine)", "Roughly time-sortable; fits in a BIGINT", "No coordination per ID; machine ids assigned once (config or ZooKeeper)", "Variants: Instagram's sharded IDs, Discord, Sonyflake"],
        m: "flowchart LR\n  T[\"41 bits: timestamp (ms)\"]:::s0 --- M[\"10 bits: machine\"]:::s1 --- Q[\"12 bits: sequence\"]:::s2" },
      { t: "Clock problems", x: "Snowflake-style IDs depend on each machine's clock.",
        p: ["If the clock moves backwards (NTP correction), the generator could repeat IDs → refuse to generate until it catches up, or wait", "Sequence overflow within one ms → wait for the next millisecond", "Ordering across machines is only as good as clock sync ('roughly sorted' / k-sorted)", "Duplicate machine ids break uniqueness → assign them centrally"],
        m: "flowchart LR\n  N[\"now < last timestamp?\"] -->|\"yes (clock went back)\"| W[\"wait / raise error\"]:::bad\n  N -->|\"no\"| S{\"same ms?\"}\n  S -->|\"yes\"| INC[\"sequence + 1 (wait if 4096)\"]:::s1\n  S -->|\"no\"| RST[\"sequence = 0\"]:::s0" },
      { t: "Instagram's approach", x: "Instagram (2012) generated IDs inside PostgreSQL shards with a PL/pgSQL function.",
        p: ["41 bits time in ms since a custom epoch", "13 bits logical shard id", "10 bits per-shard auto-increment sequence (mod 1024)", "The ID itself tells you which shard holds the row"],
        m: "flowchart LR\n  T[\"41 bits time\"]:::s0 --- SH[\"13 bits shard id\"]:::s1 --- SQ[\"10 bits sequence\"]:::s2\n  SH --> L[\"route queries to shard\"]" },
      { t: "Short codes: base62", x: "For URLs (P01) encode a numeric ID with 62 characters [0-9a-zA-Z].",
        table: [["Length", "Combinations"], ["6", "62⁶ ≈ 56.8 billion"], ["7", "62⁷ ≈ 3.5 trillion"], ["8", "62⁸ ≈ 218 trillion"]],
        p: ["Sequential IDs make codes guessable/enumerable; shuffle or encrypt the number first if that matters", "Alternative: hash the long URL and take a prefix, handling collisions"],
        m: "flowchart LR\n  ID[\"ID 125\"] --> B[\"125 = 2×62 + 1\"] --> C[\"code '21'\"]:::s2" },
      { t: "Choosing in interviews", x: "Pick based on stated needs.",
        table: [["Need", "Choice"], ["Simple, single DB", "Auto-increment"], ["No coordination, unguessable", "UUID v4"], ["Time-ordered, no coordination", "UUID v7 or Snowflake"], ["64-bit, sortable, huge throughput", "Snowflake-style"], ["Short URL codes", "Range allocation / counter + base62"]],
        p: ["Say why: 'Snowflake IDs so tweets sort by time and fit in BIGINT; machine ids from ZooKeeper.'"],
        m: "flowchart LR\n  Q{\"Must sort by time?\"} -->|\"no\"| U4[\"UUID v4\"]:::s1\n  Q -->|\"yes\"| Z{\"64-bit needed?\"}\n  Z -->|\"yes\"| SF[\"Snowflake\"]:::s0\n  Z -->|\"no\"| U7[\"UUID v7\"]:::s2" }
    ],
    widget: { heading: "Snowflake ID generator", caption: "Generate real 64-bit Snowflake-layout IDs in your browser and see how the bits split into timestamp, machine and sequence.", render: widget },
    examples: [
      ["Twitter Snowflake", "Announced in 2010 when Twitter moved off MySQL auto-increment; tweet IDs are still Snowflake-style 64-bit numbers."],
      ["Discord", "Uses Snowflake IDs with a 2015 epoch for messages, users and channels."],
      ["Instagram", "Its 2012 engineering post described 64-bit IDs generated in PostgreSQL: time + logical shard + sequence."],
      ["Flickr ticket servers", "Flickr's 2010 post described MySQL 'ticket servers' using REPLACE INTO and odd/even offsets."]
    ],
    pitfalls: [
      "One global auto-increment counter at massive scale",
      "Random UUID v4 as a clustered primary key on write-heavy tables (index fragmentation)",
      "Assuming Snowflake IDs are perfectly ordered across machines",
      "Ignoring clock rollback and duplicate machine ids",
      "Exposing sequential IDs where enumeration is a security issue",
      "Not stating requirements (size, ordering, guessability) before choosing"
    ],
    quiz: [
      ["How many bits does a UUID have?", ["32", "64", "128", "256"], 2, "128 bits, usually shown as 36 characters with hyphens."],
      ["Main advantage of UUID v7 over v4?", ["More random", "Time-ordered, so better index locality and sorting", "Shorter", "Includes MAC address"], 1, "Leading timestamp bits make IDs increase over time."],
      ["In Twitter's Snowflake, how many IDs can one worker generate per millisecond?", ["256", "1,024", "4,096", "Unlimited"], 2, "12-bit sequence → 4,096."],
      ["What problem must a Snowflake generator handle?", ["Disk full", "Clock moving backwards", "DNS failures", "TLS expiry"], 1, "It could otherwise reuse timestamps and produce duplicates."],
      ["How does range allocation stay fast?", ["Calls the coordinator for every ID", "Fetches a block of IDs at once and issues them from memory", "Uses random numbers", "Uses the client's clock"], 1, "One coordination call per block."],
      ["About how many 7-character base62 codes exist?", ["56 million", "3.5 billion", "3.5 trillion", "62 thousand"], 2, "62⁷ ≈ 3.52 × 10¹²."],
      ["Why might random UUID v4 primary keys hurt a B-tree database?", ["They're too short", "Inserts land at random pages, causing splits and poor cache locality", "They can't be indexed", "They're not unique"], 1, "Sequential-ish keys append to the right edge."],
      ["What does Instagram's ID embed that helps routing?", ["User's IP", "A logical shard id", "A hash of the photo", "The region name"], 1, "The shard id tells you where the row lives."]
    ],
    practice: {
      q: "Design ID generation for a chat service: 2 million messages per second at peak across 3 regions, IDs must sort messages by time within a conversation, fit in 64 bits, and never collide.",
      a: [
        ["Choice", "Snowflake-style 64-bit IDs: time-sortable, BIGINT-friendly, no per-ID coordination."],
        ["Layout", "41-bit ms timestamp (custom epoch) + 10-bit generator id (e.g. 2 bits region + 8 bits node) + 12-bit sequence → 4,096/ms per generator."],
        ["Capacity", "2M msg/s = 2,000 per ms; even 2 generators suffice in theory; use many for availability and locality (run in-process in each chat server)."],
        ["Machine ids", "Leased from etcd/ZooKeeper at startup so no two live nodes share an id; released on shutdown or lease expiry."],
        ["Clocks", "NTP/chrony; if the clock goes backwards, wait or refuse; sequence overflow waits for the next ms."],
        ["Ordering", "IDs are k-sorted across nodes; for exact per-conversation order, the conversation's owning server assigns IDs (single writer per conversation) or a per-conversation sequence number is added."],
        ["Alternatives", "UUID v7 if 128 bits is acceptable; it avoids machine-id management."]
      ]
    },
    recap: [
      "Clarify uniqueness, ordering, size and guessability first.",
      "Auto-increment is fine for one DB; ticket servers and range allocation extend it.",
      "UUID v4 = random, no coordination; v7 = time-ordered.",
      "Snowflake = 41-bit time + 10-bit machine + 12-bit sequence in 64 bits.",
      "Watch clock rollback and machine-id uniqueness; base62 for short codes."
    ]
  });
})();
