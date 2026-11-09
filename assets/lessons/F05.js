/* Lesson F05: Consistency models */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state;
    if (!s.N) { s.N = 3; s.W = 2; s.R = 2; }
    el.innerHTML = "<div class='grid3'>" + ["N", "W", "R"].map(function (k) {
      var lab = { N: "Replicas (N)", W: "Write quorum (W): acks needed", R: "Read quorum (R): replicas asked" }[k];
      return "<label class='field'>" + lab + ": <strong data-v='" + k + "' style='color:var(--text)'></strong><input type='range' min='1' max='" + (k === "N" ? 7 : 7) + "' data-k='" + k + "'></label>";
    }).join("") + "</div><div data-r='pic'></div><div class='metrics' data-r='out'></div><p data-r='txt'></p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      if (s.W > s.N) s.W = s.N; if (s.R > s.N) s.R = s.N;
      ["N", "W", "R"].forEach(function (k) { var i = el.querySelector("[data-k='" + k + "']"); i.max = k === "N" ? 7 : s.N; i.value = s[k]; el.querySelector("[data-v='" + k + "']").textContent = s[k]; });
      var w = 620, gap = w / s.N, svg = "<svg width='100%' viewBox='0 0 640 150' role='img' aria-label='Replicas written and read'>";
      for (var i = 0; i < s.N; i++) {
        var x = 20 + gap * i + gap / 2, wr = i < s.W, rd = i >= s.N - s.R;
        svg += "<rect x='" + (x - 34) + "' y='40' width='68' height='60' rx='10' style='fill:var(--bg);stroke:var(--border-strong);stroke-width:1.5'/>";
        if (wr) svg += "<rect x='" + (x - 30) + "' y='44' width='60' height='24' rx='6' style='fill:var(--c0);opacity:.85'/><text x='" + x + "' y='61' text-anchor='middle' style='fill:#fff;font-size:12px'>written</text>";
        if (rd) svg += "<rect x='" + (x - 30) + "' y='72' width='60' height='24' rx='6' style='fill:var(--c1);opacity:.9'/><text x='" + x + "' y='89' text-anchor='middle' style='fill:#111;font-size:12px'>read</text>";
        svg += "<text x='" + x + "' y='122' text-anchor='middle' style='fill:var(--text-3);font-size:12px'>R" + (i + 1) + "</text>";
      }
      svg += "<text x='20' y='24' style='fill:var(--text-2);font-size:12px'>Worst case: the write lands on the first W replicas, the read asks the last R</text></svg>";
      q("pic").innerHTML = svg;
      var overlap = s.R + s.W - s.N;
      q("out").innerHTML = [[s.R + s.W > s.N ? "Yes" : "No", "R + W > N (read sees latest write)"], [String(s.N - s.W), "Replica failures writes can tolerate"], [String(s.N - s.R), "Replica failures reads can tolerate"], [String(Math.max(0, overlap)), "Replicas guaranteed in both sets"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      q("txt").textContent = s.R + s.W > s.N
        ? "Every read set overlaps every write set, so at least one replica asked has the latest acknowledged write (with versioning to pick it). Lower W speeds writes; lower R speeds reads."
        : "Read and write sets can miss each other, so reads may be stale: eventual consistency, but faster and more available.";
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (!k) return; s[k] = +e.target.value; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F05",
    summary: "What a reader is guaranteed to see after a write: strong (linearizable), sequential, causal and eventual consistency, session guarantees like read-your-writes, and how quorums (R + W > N) trade consistency for speed.",
    slides: [
      { t: "A consistency model is a contract", x: "It tells application developers which values a read may return when data is replicated. Stronger contracts are easier to program against but cost latency and availability.",
        p: ["Without replication there's one copy and no question", "With replicas, a read may hit a copy that hasn't seen the latest write", "The model defines which of those outcomes are allowed"],
        m: "sequenceDiagram\n  participant W as Writer\n  participant P as Replica 1\n  participant S as Replica 2\n  participant R as Reader\n  W->>P: write x = 2\n  P-->>W: ok\n  R->>S: read x\n  S-->>R: x = 1 or 2?\n  Note over R,S: The consistency model decides which answers are allowed" },
      { t: "Strong consistency (linearizability)", x: "The system behaves as if there were a single copy: once a write completes, every later read (in real time) returns it or something newer.",
        p: ["Easiest to reason about: no stale reads", "Requires coordination: single leader with synchronous replication, or consensus (Raft, Paxos)", "Cost: higher latency and unavailability during partitions (see CAP)", "Needed for: locks, leader election, unique usernames, balances"],
        m: "sequenceDiagram\n  participant A as Client A\n  participant DB as Linearizable store\n  participant B as Client B\n  A->>DB: write x = 2\n  DB-->>A: ok\n  B->>DB: read x\n  DB-->>B: 2 (never 1 after the write completed)" },
      { t: "Sequential consistency", x: "All clients see all operations in the same single order, and each client's own operations appear in the order it issued them, but that order needn't match real time.",
        p: ["Weaker than linearizability: a read may lag real time, as long as everyone agrees on the order", "Classic definition by Leslie Lamport (1979)", "Mostly discussed in multiprocessor memory models; less common as a database product guarantee"],
        m: "flowchart LR\n  O[\"One global order agreed by all\"]:::s0 --> P1[\"Client 1 sees: w1, w2, w3\"]\n  O --> P2[\"Client 2 sees: w1, w2, w3\"]\n  O -. \"may lag real time\" .-> L[\"Not necessarily 'latest'\"]:::s1" },
      { t: "Causal consistency", x: "Operations that are causally related (one could have influenced the other) are seen in that order by everyone; unrelated operations may be seen in different orders.",
        p: ["Example: a reply must never appear before the post it answers", "Concurrent, unrelated posts can appear in different orders to different users", "Tracked with version vectors or dependency metadata", "Stronger than eventual, and still available during partitions"],
        m: "flowchart LR\n  P[\"Alice posts: 'Lost my keys'\"]:::s0 --> R[\"Bob replies: 'Found them!'\"]:::s0\n  R -. \"must be seen after\" .-> P\n  U[\"Carol posts something unrelated\"]:::s1" },
      { t: "Eventual consistency", x: "If no new writes arrive, all replicas eventually converge to the same value. In the meantime, reads may be stale or out of order.",
        p: ["Very available and low latency: any replica can answer", "Convergence via anti-entropy, read repair, gossip", "Conflicting concurrent writes need a resolution rule (LWW, merge, CRDTs)", "Fine for: like counts, feeds, DNS, product catalogues"],
        m: "flowchart LR\n  W[\"Write x=2 to Replica 1\"]:::s0 --> R1[\"Replica 1: 2\"]\n  R1 -. \"async replication\" .-> R2[\"Replica 2: 1 → 2\"]:::s1\n  R1 -. \"async replication\" .-> R3[\"Replica 3: 1 → 2\"]:::s1\n  R2 --> C[\"Converged\"]:::s2\n  R3 --> C" },
      { t: "Session guarantees", x: "Practical guarantees for one user's session, introduced in the Bayou project (Terry et al., 1994). They fix the most visible anomalies of eventual consistency cheaply.",
        table: [["Guarantee", "Promise", "Anomaly it prevents"], ["Read-your-writes", "You see your own writes", "Edit profile, refresh, old profile appears"], ["Monotonic reads", "You never see older data after newer", "A comment appears, then disappears on refresh"], ["Monotonic writes", "Your writes apply in the order you made them", "Later edit overwritten by an earlier one"], ["Writes-follow-reads", "Your write is ordered after what you read", "A reply stored before the post it answers"]],
        p: ["Implementations: sticky sessions to one replica, read from the leader after a write, or client-held version tokens"],
        m: "flowchart LR\n  U[\"User writes\"] --> L[\"Leader\"]:::s0\n  U -->|\"read soon after\"| L\n  U -.->|\"later reads\"| F[\"Follower\"]:::s1" },
      { t: "The spectrum and its cost", x: "Stronger models need more coordination between replicas, which costs latency and availability. Pick the weakest model your feature can tolerate.",
        m: "flowchart LR\n  L[\"Linearizable\"]:::s0 --> S[\"Sequential\"] --> C[\"Causal\"]:::s2 --> RYW[\"Session guarantees\"] --> E[\"Eventual\"]:::s1\n  L -. \"more coordination, more latency\" .-> E",
        p: ["Left: simpler programming, slower, less available under partitions", "Right: faster and always available, more anomalies for the app to handle", "Many systems offer several levels (e.g. Cassandra's ONE, QUORUM, ALL)"] },
      { t: "Quorums: R + W > N", x: "In leaderless (Dynamo-style) systems, each write goes to W of N replicas and each read asks R replicas. If R + W > N, every read set overlaps every write set.",
        p: ["N = 3, W = 2, R = 2 is a common setting: reads overlap writes and one replica can fail", "W = 1, R = 1 is fast but only eventually consistent", "Versions (timestamps or vector clocks) pick the newest value among responses", "Quorums alone don't give full linearizability in every edge case (e.g. concurrent writes, sloppy quorums)"],
        m: "flowchart LR\n  C[\"Client\"] -->|\"write to W=2\"| A[\"Replica A\"]:::s0\n  C -->|\"write\"| B[\"Replica B\"]:::s0\n  C -.->|\"read from R=2\"| B\n  C -.->|\"read\"| D[\"Replica C\"]:::s1\n  B -. \"overlap guarantees a fresh copy\" .- D" },
      { t: "Consistency vs isolation", x: "Two different ideas that are often confused in interviews.",
        table: [["Concept", "About", "Examples"], ["Consistency model", "What reads see across replicas", "Linearizable, causal, eventual"], ["Transaction isolation", "How concurrent transactions interleave", "Read committed, snapshot, serializable"], ["ACID 'C'", "Application invariants hold", "Balance never negative"]],
        p: ["'Strict serializability' combines serializable transactions with linearizable real-time order (e.g. Google Spanner)"],
        m: "flowchart LR\n  R[\"Replicas\"] --> CM[\"Consistency model\"]:::s0\n  T[\"Concurrent transactions\"] --> IL[\"Isolation level\"]:::s1\n  CM --> SS[\"Strict serializability = both\"]:::s2\n  IL --> SS" },
      { t: "Choosing a model in an interview", x: "Map each piece of data to the weakest guarantee that keeps users happy and data correct.",
        table: [["Data", "Model"], ["Username uniqueness, locks, balances", "Strong (linearizable)"], ["Comments and replies, chat messages", "Causal (at least per conversation)"], ["User's own profile edits", "Read-your-writes"], ["Like counts, view counts, feeds", "Eventual"]],
        p: ["Say how you implement it: leader reads, quorums, sticky sessions, version tokens", "Mention what anomalies remain and why they're acceptable"],
        m: "flowchart LR\n  D[\"Data type\"] --> Q{\"Cost of a stale read?\"}\n  Q -- \"high\" --> S[\"Strong\"]:::s0\n  Q -- \"ordering matters\" --> C[\"Causal\"]:::s2\n  Q -- \"low\" --> E[\"Eventual + session guarantees\"]:::s1" }
    ],
    widget: { heading: "Quorum calculator (R + W > N)", caption: "Simplified model: shows the worst case where writes and reads hit replicas as far apart as possible.", render: widget },
    examples: [
      ["Apache Cassandra consistency levels", "Each read and write chooses a level such as ONE, QUORUM or ALL; QUORUM reads with QUORUM writes satisfy R + W > N."],
      ["Amazon S3", "Since December 2020, S3 provides strong read-after-write consistency for all PUT and DELETE operations, replacing its earlier eventual consistency for overwrites."],
      ["Bayou (Xerox PARC, 1994)", "The paper 'Session Guarantees for Weakly Consistent Replicated Data' introduced read-your-writes, monotonic reads, monotonic writes and writes-follow-reads."],
      ["Google Spanner", "Offers externally consistent (strictly serializable) transactions using TrueTime, synchronised clocks with bounded uncertainty."]
    ],
    pitfalls: [
      "Saying 'eventually consistent' without saying how long or what users see meanwhile",
      "Assuming R + W > N gives perfect linearizability in every failure case",
      "Confusing consistency models with transaction isolation levels",
      "Requiring strong consistency everywhere, then wondering why latency is high",
      "Forgetting read-your-writes: users notice their own edits disappearing",
      "Picking last-write-wins without mentioning lost updates"
    ],
    quiz: [
      ["Which model guarantees that once a write completes, all later reads return it?", ["Eventual", "Causal", "Linearizable (strong)", "Monotonic reads"], 2, "Linearizability makes the system behave like a single up-to-date copy in real time."],
      ["A user edits their bio, refreshes, and sees the old bio. Which guarantee was violated?", ["Monotonic writes", "Read-your-writes", "Linearizability of other users", "Writes-follow-reads"], 1, "Read-your-writes promises a user always sees their own completed writes."],
      ["With N = 5, which setting guarantees read and write quorums overlap?", ["W = 2, R = 2", "W = 3, R = 2", "W = 3, R = 3", "W = 1, R = 4"], 2, "Overlap needs R + W > N: 3 + 3 = 6 > 5. The others sum to 5 or less."],
      ["What does causal consistency guarantee?", ["All operations in real-time order", "Causally related operations are seen in the same order by everyone", "Nothing until replicas converge", "Only one writer at a time"], 1, "Replies appear after posts they answer; unrelated operations may be ordered differently."],
      ["With N = 3, W = 2, R = 2, how many replica failures can writes tolerate and still succeed?", ["0", "1", "2", "3"], 1, "Writes need 2 acks out of 3, so one replica can be down."],
      ["Eventual consistency promises…", ["Reads are always fresh", "Replicas converge if writes stop", "Writes are never lost", "Strict ordering of all writes"], 1, "It only promises convergence eventually; reads in between may be stale."],
      ["Which is a transaction isolation level, not a replica consistency model?", ["Causal", "Serializable", "Eventual", "Monotonic reads"], 1, "Serializable describes how concurrent transactions interleave; the rest describe what reads see across replicas."]
    ],
    practice: {
      q: "Design the consistency approach for a social app with: usernames, user profiles, posts with comment threads, and like counts. Which guarantee does each need, and how would you implement it on a replicated database?",
      a: [
        ["Usernames: strong", "Uniqueness must hold globally; use a linearizable store or a unique constraint on a single-leader database (or a consensus-backed service)."],
        ["Profiles: read-your-writes", "Route a user's reads to the leader (or the replica they wrote to) for a short window after an edit, or carry a version token and wait for a replica that has it."],
        ["Comments: causal per thread", "A reply must never appear before its parent; partition comments by thread so one leader orders them, or attach dependency metadata."],
        ["Likes: eventual", "Increment counters asynchronously (e.g. via a queue or CRDT counters); slightly stale counts are acceptable."],
        ["Quorum settings", "In a Dynamo-style store, use QUORUM/QUORUM (R + W > N) for profile reads, ONE for likes to keep them fast."],
        ["Trade-offs", "Strong and read-your-writes paths cost latency; eventual paths may briefly show stale numbers. Monitor replication lag."]
      ]
    },
    recap: [
      "A consistency model is a contract about which values reads may return.",
      "Linearizable = one up-to-date copy; costly. Eventual = converge later; cheap.",
      "Causal keeps cause before effect; session guarantees fix what one user sees.",
      "Quorums: R + W > N makes reads overlap the latest writes.",
      "Pick the weakest model each piece of data can tolerate, and say how you implement it."
    ]
  });
})();
