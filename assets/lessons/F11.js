/* Lesson F11: Replication */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state;
    if (!s.mode) { s.mode = "async"; s.lag = 200; s.readAt = 50; s.rtt = 2; s.where = "follower"; }
    el.innerHTML = "<div class='controls'><div class='seg' data-r='mode'></div><div class='seg' data-r='where'></div></div>" +
      "<div class='grid3'><label class='field'>Replication lag: <strong data-r='ll' style='color:var(--text)'></strong><input type='range' min='0' max='2000' step='50' data-r='lag'></label>" +
      "<label class='field'>User reads again after: <strong data-r='rl' style='color:var(--text)'></strong><input type='range' min='0' max='2000' step='50' data-r='readAt'></label>" +
      "<label class='field'>Leader ↔ follower round trip: <strong data-r='tl' style='color:var(--text)'></strong><input type='range' min='1' max='150' data-r='rtt'></label></div>" +
      "<div class='metrics' data-r='out'></div><p data-r='txt'></p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("mode").innerHTML = [["sync", "Synchronous"], ["semi", "Semi-sync (1 follower)"], ["async", "Asynchronous"]].map(function (m) { return "<button type='button' data-m='" + m[0] + "' class='" + (s.mode === m[0] ? "on" : "") + "'>" + m[1] + "</button>"; }).join("");
      q("where").innerHTML = [["follower", "Read from a follower"], ["leader", "Read from the leader"]].map(function (m) { return "<button type='button' data-w='" + m[0] + "' class='" + (s.where === m[0] ? "on" : "") + "'>" + m[1] + "</button>"; }).join("");
      ["lag", "readAt", "rtt"].forEach(function (k) { q(k).value = s[k]; });
      q("ll").textContent = s.lag + " ms"; q("rl").textContent = s.readAt + " ms"; q("tl").textContent = s.rtt + " ms";
      var writeLat = 1 + (s.mode === "async" ? 0 : s.rtt);
      var effLag = s.mode === "sync" ? 0 : s.lag;
      var stale = s.where === "follower" && s.readAt < effLag && !(s.mode === "semi" && false);
      var lossRisk = s.mode === "async" ? "Yes: writes not yet replicated are lost if the leader dies" : s.mode === "semi" ? "Low: at least one follower has every acknowledged write" : "No: every follower has every acknowledged write";
      q("out").innerHTML = [[writeLat + " ms", "Write latency (simplified)"], [stale ? "Stale" : "Fresh", "What the user sees on re-read"], [s.mode === "sync" ? "Blocks" : "Continues", "If a follower is down, writes…"]]
        .map(function (m, i) { return "<div class='metric'><div class='v' style='" + (i === 1 ? "color:var(--" + (stale ? "danger" : "success") + ")" : "") + "'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      q("txt").textContent = "Data loss on leader crash: " + lossRisk + "." + (s.mode === "semi" && s.where === "follower" ? " Note: semi-sync guarantees one follower has the write, not necessarily the one you read from (this model assumes you might hit a lagging one)." : "");
    }
    q("mode").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.mode = b.getAttribute("data-m"); ctx.save(); draw(); });
    q("where").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.where = b.getAttribute("data-w"); ctx.save(); draw(); });
    ["lag", "readAt", "rtt"].forEach(function (k) { q(k).addEventListener("input", function (e) { s[k] = +e.target.value; ctx.save(); draw(); }); });
    draw();
  }

  H.registerLesson({
    code: "F11",
    summary: "Keeping copies of data on several machines: leader–follower, multi-leader and leaderless replication, synchronous vs asynchronous trade-offs, replication lag and its anomalies, and failover pitfalls like split brain.",
    slides: [
      { t: "Why replicate?", x: "Replication keeps copies of the same data on multiple machines.",
        p: ["High availability: if one node dies, another has the data", "Read scaling: spread reads over many copies", "Lower latency: put copies near users in other regions", "Durability: survive disk or machine loss", "Different from sharding: replication copies the same data; sharding splits different data"],
        m: "flowchart LR\n  W[\"Writes\"] --> L[\"Leader\"]:::s0\n  L --> F1[\"Follower 1\"]:::s2\n  L --> F2[\"Follower 2\"]:::s2\n  R[\"Reads\"] --> F1\n  R --> F2\n  R --> L" },
      { t: "Leader–follower (primary–replica)", x: "One node (the leader) accepts writes and streams changes to followers. Followers serve reads. The most common setup (PostgreSQL, MySQL, MongoDB replica sets, Redis).",
        p: ["Changes shipped as a log: write-ahead log (WAL) shipping, logical/row-based logs", "Simple: no write conflicts, because one node orders all writes", "Write throughput limited by the single leader", "Leader failure requires failover"],
        m: "sequenceDiagram\n  participant C as Client\n  participant L as Leader\n  participant F as Follower\n  C->>L: INSERT order\n  L->>L: append to log\n  L-->>C: OK\n  L->>F: replicate log entry\n  F->>F: apply" },
      { t: "Synchronous vs asynchronous", x: "When does the leader tell the client 'OK'? Before or after followers have the write?",
        table: [["Mode", "Leader replies after", "Pros", "Cons"], ["Synchronous", "All (or required) followers confirm", "No data loss on failover; followers fresh", "Slower writes; a slow or dead follower blocks writes"], ["Semi-synchronous", "At least one follower confirms", "At least two copies of each write", "Some extra latency"], ["Asynchronous", "Local write only", "Fast; followers can't block writes", "Followers lag; unreplicated writes lost if leader dies"]],
        m: "flowchart LR\n  W[\"Write\"] --> L[\"Leader\"]:::s0\n  L -->|\"sync: wait\"| F1[\"Follower 1\"]:::s1\n  L -.->|\"async: don't wait\"| F2[\"Follower 2\"]:::s2" },
      { t: "Replication lag and its anomalies", x: "With asynchronous replication, followers can be milliseconds to minutes behind. Reads from them can show the past.",
        table: [["Anomaly", "Example", "Fix"], ["Not reading your own writes", "Post a comment, refresh, it's gone", "Read your own recent data from the leader; track a write timestamp"], ["Non-monotonic reads", "Data appears, then disappears on next refresh", "Pin a user to one replica (sticky reads)"], ["Out-of-order effects", "See an answer before its question", "Causal ordering, same partition for related data"]],
        m: "sequenceDiagram\n  participant U as User\n  participant L as Leader\n  participant F as Lagging follower\n  U->>L: update bio\n  L-->>U: OK\n  U->>F: read bio\n  F-->>U: old bio (lag)\n  Note over U,F: Fix: read from leader for a short window after writing" },
      { t: "Failover", x: "When the leader fails, a follower is promoted. Automatic failover is fast but tricky.",
        p: ["Detect failure: usually heartbeats + timeout (too short → false failovers; too long → longer outage)", "Choose the most up-to-date follower; often via consensus (e.g. etcd/ZooKeeper, Raft-based managers)", "Reconfigure clients and other followers to the new leader", "With async replication, the old leader's unreplicated writes can be lost", "Tools: Patroni for PostgreSQL, MySQL Group Replication / Orchestrator, managed DBs (RDS Multi-AZ)"],
        m: "flowchart LR\n  L[\"Leader ✗\"]:::bad -.-> D[\"Heartbeat timeout\"]\n  D --> E[\"Elect most up-to-date follower\"]:::s0\n  E --> N[\"New leader\"]:::s2\n  N --> R[\"Clients and followers re-pointed\"]" },
      { t: "Split brain", x: "If the old leader isn't really dead (just partitioned) and keeps accepting writes, you get two leaders and diverging data.",
        p: ["Prevent with quorum-based election: only a majority can elect a leader", "Fencing: give each leader term a token; storage rejects writes with an old token", "STONITH ('shoot the other node in the head'): forcibly power off the old leader", "Covered more in F23 (consensus and leader election)"],
        m: "flowchart LR\n  A[\"Old leader (partitioned)<br/>still accepting writes\"]:::bad\n  B[\"New leader<br/>accepting writes\"]:::s0\n  A -. \"network partition\" .- B\n  A --> X[\"Diverging data\"]:::bad\n  B --> X" },
      { t: "Multi-leader replication", x: "Several nodes accept writes (e.g. one leader per region) and replicate to each other.",
        p: ["Low-latency local writes in every region; tolerates a region going offline", "Write conflicts: two regions edit the same record concurrently", "Conflict handling: avoid (route each record's writes to one home region), last-write-wins, merge functions, CRDTs", "Also the model behind offline-first apps and collaborative editing"],
        m: "flowchart LR\n  U1[\"Users EU\"] --> L1[\"Leader EU\"]:::s0\n  U2[\"Users US\"] --> L2[\"Leader US\"]:::s1\n  L1 <-->|\"async, resolve conflicts\"| L2" },
      { t: "Leaderless replication", x: "Any replica accepts reads and writes; clients (or a coordinator) send each request to several replicas. Popularised by Amazon's Dynamo; used by Cassandra, Riak, ScyllaDB.",
        p: ["Writes go to W of N replicas; reads ask R replicas (R + W > N for overlap, see F05)", "Read repair: fix stale replicas noticed during reads", "Anti-entropy: background comparison with Merkle trees", "Hinted handoff: a healthy node holds writes for a down node temporarily", "No failover needed, but concurrent writes need versioning (vector clocks or LWW)"],
        m: "flowchart LR\n  C[\"Client / coordinator\"] -->|\"write W=2\"| A[\"Replica A\"]:::s0\n  C -->|\"write\"| B[\"Replica B\"]:::s0\n  C -.->|\"read R=2\"| B\n  C -.->|\"read\"| D[\"Replica C (stale → read repair)\"]:::s1" },
      { t: "Replication across regions", x: "Global systems replicate between regions for disaster recovery and local reads.",
        p: ["Cross-region round trips (tens to hundreds of ms) make synchronous replication expensive", "Common: synchronous within a region (across zones), asynchronous across regions", "RPO (recovery point objective): how much data you can lose; RTO (recovery time objective): how long recovery may take", "Async cross-region replication means RPO > 0"],
        m: "flowchart LR\n  subgraph R1[\"Region A\"]\n    L[\"Leader\"]:::s0 -->|\"sync\"| Z[\"Follower, other zone\"]\n  end\n  subgraph R2[\"Region B\"]\n    F[\"Follower (DR, local reads)\"]:::s2\n  end\n  L -.->|\"async\"| F" },
      { t: "Replication in interviews", x: "Every stateful component in your design should say how it's replicated.",
        p: ["'PostgreSQL primary with two replicas in other zones; semi-sync to one; automatic failover with Patroni.'", "'Reads from replicas except a user's own profile right after editing (read-your-writes).'", "'Cassandra with RF = 3, QUORUM reads and writes.'", "Mention lag monitoring and what happens on failover (possible lost writes, client reconnection)"],
        m: "flowchart LR\n  S[\"Stateful component\"] --> M[\"Replication model\"]:::s0 --> T[\"Sync/async\"] --> F[\"Failover + lag handling\"]:::s2" }
    ],
    widget: { heading: "Replication lag explorer", caption: "Simplified model: one write, then the same user re-reads. Real lag varies over time.", render: widget },
    examples: [
      ["Amazon RDS Multi-AZ", "Keeps a synchronous standby in another availability zone and fails over automatically; read replicas are a separate, asynchronous feature."],
      ["GitHub's 2018 incident", "A brief network partition triggered MySQL failover across data centres; GitHub's post-incident analysis describes writes on both sides that had to be reconciled, and about 24 hours of degraded service."],
      ["Cassandra replication factor", "Each keyspace sets a replication factor (often 3) per data centre; consistency levels like LOCAL_QUORUM keep reads and writes in-region."],
      ["MongoDB replica sets", "A primary plus secondaries with automatic election by majority; write concern 'majority' waits for most members."]
    ],
    pitfalls: [
      "Confusing replication (copies) with sharding (splitting)",
      "Reading from async replicas without handling read-your-writes",
      "Assuming failover is free: lost writes, split brain, client reconnection",
      "Using synchronous replication across regions without accounting for latency",
      "Ignoring write conflicts in multi-leader setups",
      "Forgetting to monitor replication lag"
    ],
    quiz: [
      ["What is the main downside of asynchronous replication?", ["Writes are slow", "Followers can lag, and unreplicated writes may be lost on leader failure", "It requires consensus", "It prevents read scaling"], 1, "The leader acknowledges before followers have the data."],
      ["A user posts a comment, refreshes, and it's missing. Reads go to async followers. Which fix fits best?", ["Add more followers", "Read the user's own recent writes from the leader", "Switch to leaderless", "Increase the cache TTL"], 1, "Read-your-writes: route that user's reads to the leader (or a caught-up replica) for a short time after writing."],
      ["What is split brain?", ["A shard with two keys", "Two nodes both acting as leader and accepting writes", "Replication lag above 1 s", "A failed disk"], 1, "Usually caused by a partition plus failover without quorum or fencing."],
      ["Which mechanism prevents an old leader from writing after a new one is elected?", ["Read repair", "Fencing tokens", "Hinted handoff", "Sticky sessions"], 1, "Storage rejects writes carrying an older leader term/token."],
      ["In leaderless replication, what does hinted handoff do?", ["Picks a new leader", "Temporarily stores writes for an unavailable replica and delivers them later", "Compresses the log", "Encrypts replicas"], 1, "It keeps writes available while a replica is down."],
      ["Main challenge of multi-leader replication?", ["No local writes", "Resolving conflicting concurrent writes", "It can't span regions", "It needs synchronous replication"], 1, "Different leaders can accept conflicting updates to the same data."],
      ["What does RPO measure?", ["How long recovery takes", "How much data loss (time window) is acceptable", "Read throughput", "Replica count"], 1, "Recovery Point Objective; RTO is Recovery Time Objective."]
    ],
    practice: {
      q: "Design replication for a banking app's PostgreSQL database in one region with three availability zones, plus disaster recovery in a second region. Requirements: no acknowledged transaction lost if a zone fails, reads scale 5x, recover from a region outage within 1 hour.",
      a: [
        ["In-region topology", "Leader in zone A, synchronous (or quorum-sync) standby in zone B, async read replicas in zones B and C."],
        ["No loss on zone failure", "Commit waits for the sync standby, so every acknowledged transaction exists in two zones (RPO = 0 within the region)."],
        ["Failover", "Automatic failover with a consensus-backed manager (e.g. Patroni + etcd) and fencing to prevent split brain; clients connect via a virtual IP or proxy that follows the leader."],
        ["Read scaling", "Route reporting and non-critical reads to async replicas; balance and account pages read from the leader or sync standby after a write (read-your-writes)."],
        ["Disaster recovery", "Async replica in region 2 plus continuous WAL archiving to object storage; RPO is seconds (lag), RTO within 1 hour via a rehearsed runbook."],
        ["Monitoring", "Alert on replication lag, sync standby health (writes block without it unless you allow degradation), and failover events."],
        ["Trade-offs", "Sync commits add a zone round trip to every write; cross-region sync would be too slow, so accept small cross-region RPO."]
      ]
    },
    recap: [
      "Replication = same data on many nodes, for availability, reads and latency.",
      "Leader–follower is the default; sync is safe but slow, async fast but lossy.",
      "Lag causes stale reads: fix with read-your-writes and sticky reads.",
      "Failover needs quorum and fencing to avoid split brain.",
      "Multi-leader and leaderless add write availability but need conflict handling."
    ]
  });
})();
