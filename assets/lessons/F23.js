/* Lesson F23: Consensus & leader election */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.n) { s.n = 5; s.down = []; s.part = false; s.term = 1; s.leader = 0; }
    el.innerHTML = "<div class='seg' data-r='n'><button data-n='3'>3 nodes</button><button data-n='5'>5 nodes</button><button data-n='7'>7 nodes</button></div>" +
      "<label class='toggle'><input type='checkbox' data-r='part'> Network partition: split the cluster into two sides</label>" +
      "<p class='caption'>Click a node to crash or restart it.</p><div data-r='nodes' style='display:flex;flex-wrap:wrap;gap:10px;margin:8px 0'></div>" +
      "<div class='metrics' data-r='m'></div><div class='callout' data-r='c'></div>" +
      "<p class='caption'>Simplified Raft model: a candidate wins if a majority of all N nodes can vote for it; here the lowest-numbered reachable node wins. Real Raft uses randomized election timeouts and up-to-date-log checks.</p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function sides() {
      var a = [], b = [];
      for (var i = 0; i < s.n; i++) (s.part && i >= Math.ceil(s.n / 2) - (s.n === 3 ? 0 : 0) ? b : a).push(i);
      if (s.part) { a = []; b = []; for (var j = 0; j < s.n; j++) (j < Math.floor(s.n / 2) ? a : b).push(j); }
      return s.part ? [a, b] : [a];
    }
    function elect() {
      var maj = Math.floor(s.n / 2) + 1, winner = -1;
      sides().forEach(function (side) { var up = side.filter(function (i) { return s.down.indexOf(i) < 0; }); if (up.length >= maj && winner < 0) winner = up[0]; });
      if (winner !== s.leader) { s.term += 1; s.leader = winner; }
      return { maj: maj, winner: winner };
    }
    function draw() {
      el.querySelectorAll("[data-n]").forEach(function (b) { b.className = +b.getAttribute("data-n") === s.n ? "active" : ""; });
      q("part").checked = s.part;
      var r = elect(), sd = sides();
      q("nodes").innerHTML = sd.map(function (side, si) {
        return "<div style='display:flex;gap:8px;padding:8px;border:1px dashed " + (s.part ? "var(--border-strong)" : "transparent") + ";border-radius:10px'>" + (s.part ? "<span class='caption' style='align-self:center'>Side " + (si ? "B" : "A") + "</span>" : "") + side.map(function (i) {
          var dn = s.down.indexOf(i) >= 0, ld = i === r.winner;
          return "<button data-i='" + i + "' style='min-width:74px;padding:10px;border-radius:50px;border:2px solid " + (ld ? "var(--c0)" : "var(--border-strong)") + ";background:" + (dn ? "var(--bg-subtle)" : ld ? "var(--c0)" : "transparent") + ";color:" + (ld ? "#fff" : dn ? "var(--text-3)" : "var(--text)") + "'>N" + (i + 1) + "<br><small>" + (dn ? "down" : ld ? "leader" : "follower") + "</small></button>";
        }).join("") + "</div>";
      }).join("");
      var up = s.n - s.down.length;
      q("m").innerHTML = [[r.maj, "Majority (quorum)"], [Math.floor((s.n - 1) / 2), "Failures tolerated"], [up + " / " + s.n, "Nodes up"], [s.term, "Current term"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var c = q("c");
      if (r.winner >= 0) { c.className = "callout success"; c.innerHTML = "<strong>N" + (r.winner + 1) + " is leader</strong> and can commit writes: each entry needs acks from " + r.maj + " nodes." + (s.part ? " The minority side can't elect a leader, so it rejects writes — no split brain." : ""); }
      else { c.className = "callout"; c.style.borderColor = "var(--danger)"; c.innerHTML = "<strong>No leader.</strong> No group of " + r.maj + " reachable nodes, so the cluster is unavailable for writes (it chooses consistency over availability)."; }
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-n")) { s.n = +b.getAttribute("data-n"); s.down = s.down.filter(function (i) { return i < s.n; }); }
      else if (b.hasAttribute("data-i")) { var i = +b.getAttribute("data-i"), k = s.down.indexOf(i); if (k >= 0) s.down.splice(k, 1); else s.down.push(i); }
      else return;
      ctx.save(); draw();
    });
    q("part").addEventListener("change", function (e) { s.part = e.target.checked; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F23",
    summary: "How a cluster of machines agrees on one value, one log or one leader despite crashes and network partitions: majority quorums, Raft's leader election and log replication, Paxos, ZooKeeper/etcd, leases and fencing tokens.",
    slides: [
      { t: "Why consensus?", x: "Replicated systems need nodes to agree: who is the leader, which writes are committed, who holds a lock, what the configuration is.",
        p: ["Without agreement you get split brain: two leaders accepting conflicting writes", "Consensus = nodes agree on a value even if some crash or messages are delayed", "Used in: database failover, Kafka (KRaft), Kubernetes (etcd), distributed locks, configuration", "Classic algorithms: Paxos (Lamport) and Raft (Ongaro & Ousterhout, 2014)"],
        m: "flowchart LR\n  A[\"Node A: I'm leader!\"]:::bad --- B[\"Node B: No, I'm leader!\"]:::bad\n  A --> C[\"Conflicting writes\"]\n  B --> C" },
      { t: "Majority quorums", x: "Decisions need a majority of the N nodes. Any two majorities overlap in at least one node, so two conflicting decisions can't both win.",
        table: [["Nodes (N)", "Majority", "Failures tolerated"], ["3", "2", "1"], ["5", "3", "2"], ["7", "4", "3"], ["4", "3", "1 (no better than 3)"]],
        p: ["2f + 1 nodes tolerate f failures", "Use odd sizes; 3 or 5 is typical", "More nodes = more fault tolerance but slower writes (more acks)"],
        m: "flowchart LR\n  M1[\"Majority 1: N1 N2 N3\"]:::s0 --> O[\"overlap: N3\"]:::s1\n  M2[\"Majority 2: N3 N4 N5\"]:::s2 --> O" },
      { t: "Raft roles and terms", x: "Raft was designed to be understandable. Each node is a follower, candidate or leader. Time is divided into numbered terms with at most one leader each.",
        p: ["Followers expect heartbeats from the leader", "If a follower hears nothing for a randomized election timeout, it becomes a candidate, increments the term and requests votes", "A node votes for at most one candidate per term", "Majority of votes → leader; it sends heartbeats to keep authority"],
        m: "stateDiagram-v2\n  [*] --> Follower\n  Follower --> Candidate: election timeout\n  Candidate --> Leader: wins majority\n  Candidate --> Follower: sees higher term / other leader\n  Candidate --> Candidate: split vote, new term\n  Leader --> Follower: sees higher term" },
      { t: "Raft leader election", x: "Randomized timeouts make it likely one node times out first and wins before others start.",
        p: ["Candidates must have an up-to-date log to win votes (so committed entries aren't lost)", "Split vote → nobody wins → new term with new random timeouts", "Typical election timeouts: hundreds of milliseconds", "An old leader that rejoins sees the higher term and steps down"],
        m: "sequenceDiagram\n  participant N1 as N1 (leader)\n  participant N2\n  participant N3\n  Note over N1: crashes\n  Note over N2: timeout first\n  N2->>N3: RequestVote (term 5)\n  N3-->>N2: vote granted\n  Note over N2: 2 of 3 votes → leader of term 5\n  N2->>N3: heartbeat (AppendEntries)" },
      { t: "Raft log replication", x: "Clients send writes to the leader. The leader appends to its log and replicates to followers; an entry is committed once stored on a majority.",
        p: ["Committed entries are applied to each node's state machine in the same order", "A replicated state machine: same log in → same state out", "Followers with gaps are repaired by the leader", "Reads can be linearizable if served by the leader after confirming it is still leader (or via leases)"],
        m: "sequenceDiagram\n  participant C as Client\n  participant L as Leader\n  participant F1 as Follower 1\n  participant F2 as Follower 2\n  C->>L: SET x=5\n  L->>F1: AppendEntries [x=5]\n  L->>F2: AppendEntries [x=5]\n  F1-->>L: ok\n  Note over L: 2 of 3 stored → committed\n  L-->>C: success\n  F2-->>L: ok (later)" },
      { t: "Partitions and safety", x: "During a partition only the side with a majority can elect a leader and commit. The minority side stops accepting writes.",
        p: ["This is a CP choice (F04): consistent, but the minority is unavailable", "Old leader in the minority can't commit (no majority acks)", "When the partition heals, minority nodes catch up from the new leader", "Consensus can't guarantee progress in every possible timing (FLP result), so practical systems rely on timeouts"],
        m: "flowchart LR\n  subgraph A[\"Minority side\"]\n    O[\"Old leader N1\"]:::bad\n    N2[\"N2\"]\n  end\n  subgraph B[\"Majority side\"]\n    L[\"New leader N3\"]:::s0\n    N4[\"N4\"]\n    N5[\"N5\"]\n  end\n  O -. \"writes can't commit\" .-> X[\"rejected\"]\n  L --> OK[\"writes commit with 3 of 5\"]:::s2" },
      { t: "Paxos and friends", x: "Paxos (Lamport, published 1998) was the first widely known practical consensus algorithm; Raft is equivalent in fault tolerance but easier to implement.",
        table: [["Algorithm / system", "Where you see it"], ["Paxos / Multi-Paxos", "Google Chubby, Spanner"], ["Raft", "etcd, Consul, CockroachDB, TiKV, Kafka KRaft"], ["Zab", "Apache ZooKeeper"]],
        p: ["You rarely implement consensus yourself — use etcd, ZooKeeper or a database that has it built in"],
        m: "flowchart LR\n  P[\"Paxos (1998)\"]:::s1 --> MP[\"Multi-Paxos\"]\n  R[\"Raft (2014)\"]:::s0 --> E[\"etcd, Consul, CockroachDB\"]\n  Z[\"Zab\"]:::s2 --> ZK[\"ZooKeeper\"]" },
      { t: "Leader election with a coordination service", x: "Applications get leader election from etcd or ZooKeeper instead of running Raft themselves.",
        p: ["ZooKeeper: create an ephemeral sequential node; the lowest sequence number is leader; the node disappears if the session dies", "etcd: acquire a key with a lease; keep the lease alive; it expires if the holder dies", "Kubernetes controllers use Lease objects for leader election", "Use for: one scheduler, one cron runner, one partition owner"],
        m: "flowchart LR\n  W1[\"Worker 1\"] -->|\"acquire /leader with lease\"| ETCD[(\"etcd cluster (Raft)\")]:::s1\n  W2[\"Worker 2\"] -->|\"watch /leader\"| ETCD\n  W3[\"Worker 3\"] -->|\"watch /leader\"| ETCD\n  ETCD -->|\"lease expired → new leader\"| W2" },
      { t: "Leases and fencing tokens", x: "A leader may pause (GC, VM freeze) and wake up after its lease expired, still thinking it's leader. Fencing prevents its stale writes.",
        p: ["Each new leadership/lock grant gets a higher number (fencing token), e.g. etcd revision or ZooKeeper zxid", "The storage system rejects writes with a token lower than one it has seen", "Clocks drift, so lease safety needs margins", "Described clearly by Martin Kleppmann in 'Designing Data-Intensive Applications'"],
        m: "sequenceDiagram\n  participant A as Old leader (token 33)\n  participant B as New leader (token 34)\n  participant S as Storage\n  Note over A: long GC pause, lease expires\n  B->>S: write (token 34)\n  S-->>B: ok\n  A->>S: write (token 33)\n  S-->>A: rejected: token 33 < 34" },
      { t: "Consensus in interviews", x: "Mention it where correctness depends on a single leader or a single owner.",
        p: ["'Metadata stored in etcd/ZooKeeper (Raft/Zab) for consistent config and leader election.'", "'Each shard is a Raft group of 3 replicas; writes commit on majority.'", "'A single scheduler is elected with a lease; fencing tokens guard writes.'", "Know: 2f+1 nodes for f failures; minority partition becomes unavailable", "Don't put high-volume data through consensus; it's for small, critical state"],
        m: "flowchart LR\n  APP[\"Services\"] --> KV[(\"Data shards<br/>each a 3-node Raft group\")]:::s0\n  APP --> CO[(\"etcd: config, leader election\")]:::s1" }
    ],
    widget: { heading: "Quorum and leader election simulator", caption: "Crash nodes or split the network and see when the cluster can still elect a leader and commit writes.", render: widget },
    examples: [
      ["Kubernetes", "Stores all cluster state in etcd, a Raft-based key-value store; controllers use Lease objects for leader election."],
      ["Kafka KRaft", "Kafka replaced ZooKeeper with its own Raft-based metadata quorum (KRaft); ZooKeeper mode was removed in Kafka 4.0."],
      ["Google Chubby", "Google's lock service (paper, 2006) uses Paxos; it inspired ZooKeeper."],
      ["CockroachDB", "Splits data into ranges, each replicated by its own Raft group."]
    ],
    pitfalls: [
      "Using an even number of nodes (4 tolerates no more failures than 3)",
      "Expecting a minority partition to keep accepting writes",
      "Implementing your own consensus instead of using etcd/ZooKeeper",
      "Trusting leases without fencing tokens",
      "Putting large or high-volume data through the consensus log",
      "Spreading a 3-node cluster across 2 sites (losing the site with 2 nodes stops the cluster)"
    ],
    quiz: [
      ["How many failures can a 5-node Raft cluster tolerate?", ["1", "2", "3", "4"], 1, "Majority is 3, so 2 nodes can fail."],
      ["Why are majorities used?", ["They're fastest", "Any two majorities overlap, so conflicting decisions can't both succeed", "They save disk", "They avoid networking"], 1, "The overlapping node prevents split brain."],
      ["In Raft, when is a log entry committed?", ["When the leader writes it", "When stored on a majority of nodes", "When all nodes store it", "After 1 second"], 1, "Majority replication makes it durable across leader changes."],
      ["What triggers a Raft election?", ["A client request", "A follower's election timeout with no heartbeat", "A timer every hour", "Disk full"], 1, "Randomized timeouts reduce split votes."],
      ["During a partition 2 | 3 nodes, which side can commit writes?", ["Both", "The side with 3 nodes", "The side with 2 nodes", "Neither"], 1, "Only the majority side can form a quorum."],
      ["What is a fencing token for?", ["Encrypting logs", "Rejecting writes from a stale leader/lock holder", "Load balancing", "Compressing data"], 1, "Storage refuses tokens lower than the latest seen."],
      ["Which system uses Zab rather than Raft?", ["etcd", "ZooKeeper", "Consul", "CockroachDB"], 1, "ZooKeeper Atomic Broadcast."],
      ["Why is a 4-node cluster a poor choice?", ["Too slow to boot", "It needs 3 for a majority, so it still tolerates only 1 failure", "Raft forbids it", "It can't elect a leader"], 1, "Odd sizes give better fault tolerance per node."]
    ],
    practice: {
      q: "You run a job scheduler with 3 instances for high availability. Exactly one instance must trigger each scheduled job (e.g. billing runs). Design leader election and make it safe against pauses and partitions.",
      a: [
        ["Coordination", "Use a 3- or 5-node etcd (or ZooKeeper) cluster across 3 availability zones, not your own consensus."],
        ["Election", "Each scheduler tries to create /scheduler/leader with a lease (e.g. 10 s TTL) and keeps it alive; others watch and take over when it expires."],
        ["Fencing", "The leader gets the key's revision as a fencing token; job runs and writes include it; the job store rejects lower tokens."],
        ["Idempotency", "Each job run has a unique id (job_id + scheduled_time) with a unique constraint, so a duplicate trigger during failover is harmless."],
        ["Partitions", "A scheduler cut off from the etcd majority loses its lease and must stop scheduling; the majority side elects a new leader."],
        ["Monitoring", "Alert on leader flaps, lease renewal latency and missed schedules."],
        ["Trade-offs", "Shorter leases = faster failover but more false failovers on slow networks."]
      ]
    },
    recap: [
      "Consensus lets nodes agree on a leader or log despite failures.",
      "Majority quorums: 2f + 1 nodes tolerate f failures; use odd sizes.",
      "Raft: randomized election timeouts, terms, entries commit on majority.",
      "In a partition, only the majority side makes progress (CP).",
      "Use etcd/ZooKeeper for election; protect with leases + fencing tokens."
    ]
  });
})();
