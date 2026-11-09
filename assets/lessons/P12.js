/* Lesson P12: Key-value store (Dynamo-style) */
(function () {
  "use strict";
  var H = window.HLD;
  var LAT = [2, 3, 5, 8, 12, 20, 35];

  function widget(el, ctx) {
    var s = ctx.state; if (!s.n) { s.n = 3; s.r = 2; s.w = 2; s.down = 0; s.hh = true; }
    el.innerHTML = "<div class='grid2'>" + [["n", "Replication factor N", 1, 7], ["w", "Write quorum W", 1, 7], ["r", "Read quorum R", 1, 7], ["down", "Replicas of this key that are down", 0, 7]].map(function (f) {
      return "<label class='field'>" + f[1] + ": <strong data-v='" + f[0] + "' style='color:var(--text)'></strong><input type='range' min='" + f[2] + "' max='" + f[3] + "' data-k='" + f[0] + "'></label>"; }).join("") + "</div>" +
      "<label class='toggle'><input type='checkbox' data-r='hh'> Sloppy quorum + hinted handoff (healthy nodes outside the preference list accept writes)</label>" +
      "<div data-r='ring' style='display:flex;gap:8px;flex-wrap:wrap;margin:10px 0'></div><div class='metrics' data-r='m'></div><div class='callout' data-r='c'></div>" +
      "<p class='caption'>Replica latencies are illustrative (2, 3, 5, 8, 12, 20, 35 ms); a request waits for the W-th (or R-th) fastest live replica. R + W > N means read and write sets overlap — but sloppy quorums and concurrent writes still need conflict handling, so this is not full linearizability.</p>";
    function draw() {
      if (s.w > s.n) s.w = s.n; if (s.r > s.n) s.r = s.n; if (s.down > s.n) s.down = s.n;
      ["n", "w", "r", "down"].forEach(function (k) { var i = el.querySelector("[data-k='" + k + "']"); i.max = k === "n" ? 7 : s.n; i.value = s[k]; el.querySelector("[data-v='" + k + "']").textContent = s[k]; });
      el.querySelector("[data-r='hh']").checked = s.hh;
      var live = s.n - s.down, eff = s.hh ? s.n : live;
      el.querySelector("[data-r='ring']").innerHTML = Array.from({ length: s.n }).map(function (_, i) { var dn = i >= live; return "<span class='pill " + (dn ? "danger" : "success") + "'>replica " + (i + 1) + (dn ? " down" + (s.hh ? " → hint stored elsewhere" : "") : " " + LAT[i] + " ms") + "</span>"; }).join("");
      var wOk = eff >= s.w, rOk = live >= s.r, overlap = s.r + s.w > s.n;
      el.querySelector("[data-r='m']").innerHTML = [[wOk ? "Yes" : "No", "Writes succeed"], [rOk ? "Yes" : "No", "Reads succeed"], [wOk ? LAT[s.w - 1] + " ms" : "–", "Write latency"], [rOk ? LAT[s.r - 1] + " ms" : "–", "Read latency"], [overlap ? "Yes" : "No", "R + W > N (overlap)"], [Math.min(s.n - s.w, s.n - s.r) + "", "Failures tolerated by both"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var c = el.querySelector("[data-r='c']");
      if (!wOk || !rOk) { c.className = "callout"; c.style.borderColor = "var(--danger)"; c.innerHTML = "<strong>Unavailable</strong> for " + (!wOk && !rOk ? "reads and writes" : !wOk ? "writes" : "reads") + ": not enough live replicas."; }
      else if (overlap) { c.className = "callout success"; c.style.borderColor = ""; c.innerHTML = "<strong>Overlapping quorums:</strong> every read contacts at least one replica that has the latest acknowledged write" + (s.hh && s.down ? " (once hinted writes are handed back)" : "") + "."; }
      else { c.className = "callout"; c.style.borderColor = "var(--c1)"; c.innerHTML = "<strong>Fast but eventually consistent:</strong> a read may hit only replicas that missed the latest write; read repair and anti-entropy fix them later."; }
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    el.querySelector("[data-r='hh']").addEventListener("change", function (e) { s.hh = e.target.checked; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "P12",
    summary: "Design a distributed key-value store like Amazon Dynamo or Cassandra: requirements, the get/put API, partitioning with consistent hashing, replication with tunable N/R/W quorums, versioning and conflicts, failure handling (hinted handoff, Merkle-tree anti-entropy, gossip) and LSM-tree storage.",
    slides: [
      { t: "1. Requirements", x: "A highly available store for small values accessed by key.",
        p: ["Functional: put(key, value), get(key), delete(key); values up to ~1 MB", "Non-functional: always writable (availability over strict consistency — ask!), low latency (single-digit ms), horizontally scalable to PB, no single point of failure, tunable consistency", "Automatic handling of node failures and additions"],
        m: "flowchart LR\n  C[\"Client\"] -->|\"put / get\"| KV[(\"Distributed KV store\")]:::s0\n  KV --- N1[\"node\"]\n  KV --- N2[\"node\"]\n  KV --- N3[\"node\"]" },
      { t: "2. Estimates and API", x: "Example: 10 TB of data growing to 1 PB, 1 M ops/s.",
        table: [["Quantity", "Estimate"], ["Nodes (2 TB usable each, N=3)", "1 PB × 3 ÷ 2 TB ≈ 1,500 nodes"], ["Ops per node", "1 M ÷ 1,500 ≈ 700/s — easy; latency is the focus"]],
        p: ["get(key) → (value(s), context) — may return several conflicting versions", "put(key, context, value) — context carries version info from the read", "Per-request consistency level (e.g. ONE, QUORUM, ALL in Cassandra)"],
        m: "sequenceDiagram\n  participant C as Client\n  participant K as Coordinator\n  C->>K: get(cart:42)\n  K-->>C: value + context (version)\n  C->>K: put(cart:42, context, new value)\n  K-->>C: ok" },
      { t: "3. Partitioning", x: "Consistent hashing with virtual nodes (F13).",
        p: ["Hash the key onto a ring; walk clockwise to find the first N distinct physical nodes: the key's preference list", "Virtual nodes spread load and let bigger machines take more", "Adding a node moves only ~1/N of keys, streamed from neighbours", "Any node can act as coordinator for a request (or the client routes directly)"],
        m: "flowchart LR\n  K[\"hash(cart:42)\"] --> RING[\"ring position\"]:::s1 --> A[\"node A (coordinator)\"]:::s0 --> B[\"node B\"]:::s0 --> C[\"node C\"]:::s0\n  A -. \"N = 3 replicas\" .- C" },
      { t: "4. Replication and quorums", x: "Each key is stored on N replicas; operations wait for W (write) or R (read) acknowledgements.",
        table: [["Setting", "Behaviour"], ["N=3, W=2, R=2", "Common default; tolerates 1 failure; R + W > N"], ["W=1, R=1", "Fastest, most available, weakest consistency"], ["W=3, R=1", "Fast reads, writes fail if any replica is down"], ["W=1, R=3", "Fast writes, slow reads"]],
        p: ["Latency = the W-th / R-th fastest replica, not the slowest"],
        m: "sequenceDiagram\n  participant C as Coordinator\n  participant A as Replica A\n  participant B as Replica B\n  participant D as Replica C\n  C->>A: write v2\n  C->>B: write v2\n  C->>D: write v2\n  A-->>C: ack\n  B-->>C: ack\n  Note over C: W = 2 reached → success\n  D-->>C: ack (later)" },
      { t: "5. Architecture of a node", x: "Every node is identical (no master).",
        m: "flowchart TB\n  REQ[\"Request handler / coordinator\"]:::s0 --> PART[\"Partitioner (ring)\"]\n  REQ --> REPL[\"Replication + quorum logic\"]:::s0\n  REPL --> ST[\"Storage engine (LSM tree)\"]:::s2\n  GOS[\"Gossip membership + failure detector\"]:::s1 --> PART\n  AE[\"Anti-entropy (Merkle trees)\"]:::s1 --> ST\n  HH[\"Hinted handoff store\"] --> REPL",
        p: ["Decentralised: membership and failure detection via gossip", "Seed nodes help new nodes join"] },
      { t: "6. Deep dive: versions and conflicts", x: "With always-writable replicas, two clients can update the same key concurrently on different replicas.",
        p: ["Last-write-wins (LWW) by timestamp: simple (Cassandra), but can silently drop a concurrent update and depends on clocks", "Vector clocks (original Dynamo): track [node, counter] pairs; detect concurrent versions and return siblings for the client to merge (e.g. union of shopping carts)", "CRDTs: data types that merge automatically (counters, sets) — used by Riak and others", "Read repair: when a read sees stale replicas, write the newest value back"],
        m: "flowchart LR\n  V1[\"v1 [A:1]\"] --> V2[\"v2 [A:2] (client X via A)\"]:::s0\n  V1 --> V3[\"v3 [A:1, B:1] (client Y via B)\"]:::s1\n  V2 --> M[\"concurrent → siblings → merge → v4 [A:2, B:1]\"]:::s2\n  V3 --> M" },
      { t: "7. Deep dive: handling failures", x: "Temporary and permanent failures need different tools.",
        p: ["Sloppy quorum + hinted handoff: if a preference-list node is down, write to the next healthy node with a hint; hand the data back when the node recovers", "Anti-entropy: replicas compare Merkle trees (hash trees per key range) to find and sync only differing ranges", "Gossip: nodes exchange membership and heartbeat info every second; failure detectors (e.g. phi accrual in Cassandra) mark nodes down", "Permanent removal/addition is an explicit admin operation that moves ranges"],
        m: "flowchart LR\n  W[\"write for C\"] -->|\"C down\"| D[\"node D stores with hint 'for C'\"]:::s1\n  D -->|\"C back\"| C[\"hand off to C\"]:::s0\n  MT[\"Merkle trees compare ranges\"]:::s2 --> SYNC[\"sync only differing keys\"]" },
      { t: "8. Deep dive: storage engine", x: "Write-optimised LSM tree (F10).",
        p: ["Write: append to commit log (durability) + insert into memtable (in memory)", "Memtable full → flush to an immutable sorted SSTable on disk", "Read: memtable → SSTables newest to oldest; Bloom filters (F26) skip files without the key", "Compaction merges SSTables, drops overwritten values and tombstones (deletes)", "Examples: Cassandra, RocksDB, LevelDB, HBase"],
        m: "flowchart LR\n  PUT[\"put\"] --> CL[(\"commit log\")]:::s1\n  PUT --> MT[\"memtable\"]:::s0 -->|\"flush\"| SS1[(\"SSTable\")]:::s2\n  SS1 --> CP[\"compaction\"] --> SS2[(\"merged SSTable\")]\n  GET[\"get\"] --> MT\n  GET --> BF{\"Bloom filter\"} --> SS1" },
      { t: "9. Trade-offs", x: "Dynamo-style systems are AP by default (F04) with tunable consistency.",
        table: [["Technique", "Purpose", "Cost"], ["Consistent hashing + vnodes", "Scale, even load", "Rebalancing traffic"], ["N/R/W quorums", "Tunable consistency/latency", "Reasoning complexity"], ["Vector clocks / CRDTs", "Detect/merge conflicts", "Client merge logic, metadata"], ["LWW", "Simplicity", "Lost concurrent updates"], ["Hinted handoff", "Write availability", "Temporary inconsistency"], ["Merkle trees", "Efficient repair", "CPU/IO for tree builds"]],
        m: "flowchart LR\n  AV[\"Availability\"]:::s0 <--> CO[\"Consistency\"]:::s1 <--> LA[\"Latency\"]:::s2" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Consistent hashing with vnodes; N replicas on the preference list", "Tunable quorums (N=3, W=2, R=2 typical); latency from the fastest W/R", "Conflicts via vector clocks/CRDTs or LWW; read repair", "Failures: sloppy quorum + hinted handoff, Merkle anti-entropy, gossip membership", "LSM-tree storage with commit log, memtables, SSTables, Bloom filters, compaction"],
        m: "flowchart LR\n  P[\"Partition\"]:::s1 --> R[\"Replicate (quorum)\"]:::s0 --> V[\"Version + repair\"]:::s2 --> S[\"LSM storage\"]" }
    ],
    widget: { heading: "Quorum playground (N, R, W)", caption: "Change replication factor, quorums and failed replicas to see availability, latency and whether reads overlap the latest write.", render: widget },
    examples: [
      ["Amazon Dynamo (2007)", "The SOSP paper described consistent hashing, sloppy quorums, hinted handoff, vector clocks and Merkle trees for Amazon's shopping cart, built to stay writable."],
      ["Apache Cassandra", "Created at Facebook (2008) combining Dynamo's distribution with Bigtable's data model; uses LWW timestamps and tunable consistency levels."],
      ["Amazon DynamoDB", "A managed service (2012) inspired by Dynamo but with a different, leader-based replication design per partition."],
      ["Riak", "An open-source Dynamo-style store that offered vector clocks (later dotted version vectors) and CRDT data types."]
    ],
    pitfalls: [
      "Claiming R + W > N gives full linearizability in every failure case",
      "Using LWW where concurrent updates must not be lost",
      "Forgetting how replicas get repaired (read repair, anti-entropy)",
      "No plan for temporary failures (hinted handoff)",
      "Ignoring tombstones and compaction for deletes",
      "Mod-N partitioning instead of consistent hashing"
    ],
    quiz: [
      ["With N=3, W=2, R=2, how many replica failures can reads and writes tolerate?", ["0", "1", "2", "3"], 1, "Two live replicas are needed for each."],
      ["Why does R + W > N matter?", ["It reduces storage", "Read and write replica sets overlap, so a read sees at least one up-to-date replica", "It speeds up writes", "It disables conflicts"], 1, "Overlap is the basis of quorum consistency."],
      ["What does hinted handoff do?", ["Encrypts data", "A healthy node temporarily stores writes for a down replica and hands them back later", "Moves leaders", "Compacts SSTables"], 1, "Keeps writes available during short outages."],
      ["What are Merkle trees used for here?", ["Routing", "Efficiently finding differing key ranges between replicas", "Compression", "Authentication"], 1, "Compare hashes top-down, sync only differences."],
      ["Main risk of last-write-wins?", ["Too slow", "Concurrent updates can be silently lost; depends on clocks", "Can't delete", "Needs vector clocks"], 1, "Only one version survives."],
      ["What do vector clocks let the system detect?", ["Node failures", "Concurrent (conflicting) versions", "Disk errors", "Hot keys"], 1, "Neither version descends from the other."],
      ["Why Bloom filters in the LSM read path?", ["Compression", "Skip SSTables that definitely don't contain the key", "Sorting", "Replication"], 1, "Avoid needless disk reads."],
      ["How do nodes learn membership without a master?", ["DNS", "Gossip protocol", "2PC", "Polling a central DB"], 1, "Periodic peer-to-peer exchange."]
    ],
    practice: {
      q: "Use this key-value store for a shopping cart that must always accept 'add to cart', even during network partitions between data centres. How do you avoid losing items?",
      a: [
        ["Availability", "Low write quorum (W=1 or local quorum) with sloppy quorum and hinted handoff so adds always succeed."],
        ["Conflict model", "Represent the cart as a CRDT: an observed-remove set (OR-Set) of items with quantities as counters, so concurrent adds merge without loss."],
        ["Alternative", "Vector clocks with siblings returned to the application, which merges by union (Dynamo's original approach); deletes may reappear, so track removals explicitly."],
        ["Reads", "R=1 for speed, with read repair; checkout reads with a stronger quorum before payment."],
        ["Repair", "Anti-entropy with Merkle trees after partitions heal."],
        ["Trade-offs", "A removed item could briefly reappear; more metadata per cart; but no lost adds."]
      ]
    },
    recap: [
      "Consistent hashing + virtual nodes; N replicas per key.",
      "Tunable N/R/W quorums trade consistency, latency and availability.",
      "Detect conflicts with vector clocks/CRDTs, or accept LWW losses.",
      "Hinted handoff, read repair, Merkle-tree anti-entropy and gossip handle failures.",
      "LSM storage: commit log, memtable, SSTables, Bloom filters, compaction."
    ]
  });
})();
