/* Lesson F04: CAP theorem & PACELC */
(function () {
  "use strict";
  var H = window.HLD, esc = H.esc;

  function widget(el, ctx) {
    var s = ctx.state;
    function reset() { s.mode = s.mode || "CP"; s.part = false; s.v = { A: 1, B: 1, C: 1 }; s.t = { A: 0, B: 0, C: 0 }; s.clock = 0; s.log = ["Cluster of 3 replicas (A, B, C), x = 1 everywhere."]; }
    if (!s.v) reset();
    el.innerHTML = "<div class='controls'><div class='seg' data-r='mode'></div><button type='button' class='btn' data-r='part'></button><button type='button' class='btn' data-r='reset'>Reset</button></div>" +
      "<div data-r='pic'></div><div class='btnrow' data-r='acts'></div><div class='rows' data-r='log'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function log(t) { s.log.unshift(t); s.log = s.log.slice(0, 6); }
    function side(n) { return s.part && n === "C" ? "minority" : "majority"; }
    function act(a) {
      var m = s.mode;
      if (a === "wA" || a === "wC") {
        var n = a === "wA" ? "A" : "C";
        s.clock++;
        var nv = s.v[n] + 1;
        if (!s.part) { ["A", "B", "C"].forEach(function (k) { s.v[k] = nv; s.t[k] = s.clock; }); log("Write x = " + nv + " via " + n + ": replicated to A, B, C."); }
        else if (side(n) === "majority") { s.v.A = s.v.B = nv; s.t.A = s.t.B = s.clock; log("Write x = " + nv + " via A: A and B (a majority) accept; C can't be reached."); }
        else if (m === "CP") { log("CP: write via C REJECTED (error/timeout): C can't reach a majority, so it refuses rather than risk inconsistency."); }
        else { s.v.C = nv; s.t.C = s.clock; log("AP: write x = " + nv + " via C ACCEPTED locally: now replicas disagree (conflict to resolve later)."); }
      } else if (a === "rA") {
        log("Read via A → x = " + s.v.A + (s.part ? " (A is on the majority side)" : "") + ".");
      } else if (a === "rC") {
        if (!s.part) log("Read via C → x = " + s.v.C + " (latest).");
        else if (m === "CP") log("CP: read via C REFUSED (error/timeout): it can't confirm it has the latest value.");
        else log("AP: read via C → x = " + s.v.C + (s.v.C !== s.v.A ? " (STALE: majority has " + s.v.A + ")" : "") + ". Available, but maybe not the latest.");
      } else if (a === "heal") {
        if (!s.part) return;
        s.part = false;
        var win = ["A", "B", "C"].reduce(function (b, k) { return s.t[k] > s.t[b] ? k : b; }, "A");
        var val = s.v[win];
        var conflict = s.v.C !== s.v.A;
        ["A", "B", "C"].forEach(function (k) { s.v[k] = val; s.t[k] = s.t[win]; });
        log("Partition healed. " + (conflict ? "Replicas reconciled using last-write-wins (one simple strategy): x = " + val + ". The other write was lost." : "C catches up: x = " + val + "."));
      }
      ctx.save(); draw();
    }
    function node(n, x) {
      var stale = s.v[n] !== Math.max(s.v.A, s.v.B, s.v.C);
      return "<g><rect x='" + (x - 60) + "' y='40' width='120' height='70' rx='12' style='fill:var(--bg);stroke:" + (stale ? "var(--c1)" : "var(--c0)") + ";stroke-width:2'/><text x='" + x + "' y='68' text-anchor='middle' style='fill:var(--text);font-weight:600;font-size:15px'>Node " + n + "</text><text x='" + x + "' y='92' text-anchor='middle' style='fill:var(--text-2);font-size:14px'>x = " + s.v[n] + (stale ? " (behind)" : "") + "</text></g>";
    }
    function draw() {
      q("mode").innerHTML = ["CP", "AP"].map(function (m) { return "<button type='button' data-m='" + m + "' class='" + (s.mode === m ? "on" : "") + "'>" + (m === "CP" ? "CP: prefer consistency" : "AP: prefer availability") + "</button>"; }).join("");
      q("part").textContent = s.part ? "Heal partition" : "Cut the network (partition C)";
      var svg = "<svg width='100%' viewBox='0 0 640 150' role='img' aria-label='Three replicas and a network partition'>";
      svg += "<line x1='160' y1='75' x2='320' y2='75' style='stroke:var(--border-strong);stroke-width:2'/>";
      svg += "<line x1='380' y1='75' x2='480' y2='75' style='stroke:" + (s.part ? "var(--danger)" : "var(--border-strong)") + ";stroke-width:2;stroke-dasharray:" + (s.part ? "6 6" : "0") + "'/>";
      if (s.part) svg += "<text x='430' y='130' text-anchor='middle' style='fill:var(--danger);font-size:13px'>partition</text><line x1='420' y1='55' x2='440' y2='95' style='stroke:var(--danger);stroke-width:3'/><line x1='440' y1='55' x2='420' y2='95' style='stroke:var(--danger);stroke-width:3'/>";
      svg += node("A", 100) + node("B", 340) + node("C", 560) + "</svg>";
      q("pic").innerHTML = svg;
      q("acts").innerHTML = [["wA", "Write via A"], ["wC", "Write via C"], ["rA", "Read via A"], ["rC", "Read via C"]].map(function (b) { return "<button type='button' class='btn' data-a='" + b[0] + "'>" + b[1] + "</button>"; }).join("");
      q("log").innerHTML = s.log.map(function (l, i) { return "<div class='row'><div class='dt' style='" + (i === 0 ? "color:var(--text)" : "") + "'>" + esc(l) + "</div></div>"; }).join("");
    }
    q("mode").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.mode = b.getAttribute("data-m"); log("Switched to " + s.mode + " behaviour."); ctx.save(); draw(); });
    q("part").addEventListener("click", function () { if (s.part) act("heal"); else { s.part = true; log("Network partition: C can no longer talk to A and B."); ctx.save(); draw(); } });
    q("reset").addEventListener("click", function () { var m = s.mode; reset(); s.mode = m; ctx.save(); draw(); });
    q("acts").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) act(b.getAttribute("data-a")); });
    draw();
  }

  H.registerLesson({
    code: "F04",
    summary: "What really happens to replicated data when the network splits: the CAP theorem, how CP and AP systems behave, common misconceptions, and PACELC's extra trade-off between latency and consistency when there is no partition.",
    slides: [
      { t: "The setting: replicated data", x: "To survive failures and serve users quickly, data is copied to several nodes (replicas). Keeping those copies in agreement over an unreliable network is the core problem CAP describes.",
        p: ["Replicas may be in different racks, zones or regions", "Networks drop, delay and reorder messages", "A node can't tell a slow peer from a dead one or an unreachable one"],
        m: "flowchart LR\n  C[\"Clients\"]:::s0 --> A[\"Replica A\"]\n  C --> B[\"Replica B\"]\n  C --> D[\"Replica C\"]\n  A <--> B\n  B <--> D\n  A <--> D" },
      { t: "C, A and P, precisely", x: "CAP was conjectured by Eric Brewer (2000) and proved by Gilbert and Lynch (2002). Its terms are narrower than everyday usage.",
        table: [["Letter", "Meaning in CAP"], ["C: Consistency", "Linearizability: every read returns the most recent write, as if there were one copy"], ["A: Availability", "Every request to a non-failed node gets a non-error response (no time limit specified)"], ["P: Partition tolerance", "The system keeps working even if the network drops messages between nodes"]],
        p: ["CAP's 'C' is not the 'C' in ACID (which is about integrity constraints)", "CAP's 'A' is a strict, theoretical definition, not '99.9% uptime'"],
        m: "flowchart LR\n  C[\"Consistency<br/>linearizable reads\"]:::s0 --- A[\"Availability<br/>every live node answers\"]:::s1\n  A --- P[\"Partition tolerance<br/>survives lost messages\"]:::s2\n  P --- C" },
      { t: "The theorem: during a partition, choose", x: "If the network splits, a node that can't reach the others must either refuse the request (stay consistent) or answer with possibly stale data (stay available). It can't do both.",
        p: ["Partitions are not optional in real networks, so 'P' is a given", "The real choice is what to do during a partition: CP or AP", "When there is no partition, a system can be both consistent and available"],
        m: "flowchart LR\n  P[\"Network partition happens\"]:::bad --> Q{\"Node can't reach peers\"}\n  Q -- \"refuse / wait\" --> CP[\"CP: consistent, not available\"]:::s0\n  Q -- \"answer anyway\" --> AP[\"AP: available, maybe stale\"]:::s1" },
      { t: "CP behaviour", x: "CP systems prefer correctness: the minority side of a partition stops serving writes (and often reads) until it can reach a majority.",
        p: ["Usually built on majority quorums or consensus (Raft, Paxos, ZAB)", "Clients on the minority side see errors or timeouts", "Examples commonly cited: ZooKeeper, etcd, HBase, Spanner-style databases", "Good for: locks, leader election, configuration, account balances, inventory"],
        m: "flowchart LR\n  subgraph Majority\n    A[\"A ✓ serves\"]:::s0\n    B[\"B ✓ serves\"]:::s0\n  end\n  subgraph Minority\n    C[\"C ✗ refuses\"]:::bad\n  end\n  A <--> B\n  B -. \"partition\" .- C" },
      { t: "AP behaviour", x: "AP systems prefer staying up: every reachable node keeps accepting reads and writes, and replicas are reconciled after the partition heals.",
        p: ["Reads may return stale data; concurrent writes may conflict", "Conflict resolution: last-write-wins (simple, can lose writes), vector clocks with app-level merge, CRDTs", "Examples commonly cited: Cassandra, Riak, Amazon's Dynamo, DynamoDB with eventually consistent reads", "Good for: shopping carts, likes, feeds, presence, metrics"],
        m: "flowchart LR\n  A[\"A: x=2\"]:::s0 -. \"partition\" .- C[\"C: x=1 (stale)\"]:::s1\n  A --> M[\"After heal: reconcile<br/>LWW / vector clocks / CRDTs\"]:::s2\n  C --> M" },
      { t: "Misconceptions to avoid", x: "'Pick two of three' is a catchy but misleading summary. Brewer himself revisited it in 'CAP Twelve Years Later' (2012).",
        p: ["'CA' isn't a real option for a distributed system: you can't opt out of partitions", "The choice is only forced during a partition, and can differ per operation or per data type", "Many systems are tunable: Cassandra and DynamoDB let you pick consistency per request", "Being 'CP' doesn't mean fast or highly available in practice; being 'AP' doesn't mean always correct"],
        m: "flowchart LR\n  W[\"'Pick 2 of 3'\"]:::bad --> R[\"Better: during a partition,<br/>per operation, choose C or A\"]:::s2" },
      { t: "PACELC: the trade-off without partitions", x: "Daniel Abadi (2012) pointed out that even when the network is healthy, replication forces a choice between latency and consistency.",
        p: ["If Partition: choose Availability or Consistency", "Else (normal operation): choose Latency or Consistency", "Strong consistency needs coordination (waiting for other replicas), which adds latency", "Returning the local replica's value is fast but may be stale"],
        m: "flowchart LR\n  S{\"Partition?\"} -- \"yes\" --> PA{\"A or C?\"}\n  S -- \"no (else)\" --> EL{\"L or C?\"}\n  PA --> X1[\"PA: stay available\"]:::s1\n  PA --> X2[\"PC: stay consistent\"]:::s0\n  EL --> Y1[\"EL: low latency\"]:::s1\n  EL --> Y2[\"EC: consistent, slower\"]:::s0" },
      { t: "PACELC in real systems", x: "Classifications from Abadi's paper and common usage. Many systems are configurable, so treat these as defaults, not laws.",
        table: [["System", "Typical class", "Why"], ["Dynamo, Cassandra, Riak", "PA/EL", "Stay available and answer from nearby replicas; consistency is tunable"], ["HBase, BigTable", "PC/EC", "One server owns each key range; consistent, waits on failover"], ["VoltDB / H-Store", "PC/EC", "Strongly consistent, coordinated transactions"], ["Yahoo PNUTS", "PC/EL", "Per-record master; low latency normally, unavailable under some partitions"], ["MongoDB (as classified by Abadi)", "PA/EC", "Primary-based; behaviour depends on read/write concern settings"]],
        m: "flowchart LR\n  PAEL[\"PA/EL<br/>Cassandra, Riak, Dynamo\"]:::s1\n  PCEC[\"PC/EC<br/>HBase, BigTable, VoltDB\"]:::s0\n  PCEL[\"PC/EL<br/>PNUTS\"]:::s2" },
      { t: "Choosing per feature", x: "In an interview, don't pick CP or AP for the whole system. Pick per piece of data, based on the cost of being wrong versus being unavailable.",
        table: [["Data", "Prefer", "Reason"], ["Bank balance, payments", "CP", "A wrong balance is worse than a brief error"], ["Seat / inventory booking", "CP", "Double-selling must not happen"], ["Shopping cart", "AP", "Dynamo's famous example: always writable, merge later"], ["Likes, view counts", "AP", "Slightly stale counts are fine"], ["Leader election, locks", "CP", "Two leaders would corrupt data"], ["Social feed, presence", "AP", "Freshness can lag a few seconds"]],
        m: "flowchart LR\n  Q{\"Cost of stale or conflicting data?\"} -- \"high\" --> CP[\"CP\"]:::s0\n  Q -- \"low\" --> AP[\"AP\"]:::s1" },
      { t: "How to say it in an interview", x: "Show you understand the trade-off and connect it to requirements.",
        p: ["'During a partition, for the booking table we choose consistency: the minority side rejects writes.'", "'For the feed we choose availability: users may see slightly stale posts, reconciled later.'", "'In normal operation we read from local replicas for latency, except for read-your-writes cases.'", "Name the mechanism: quorums, consensus, LWW, vector clocks or CRDTs"],
        m: "flowchart LR\n  R[\"Requirement\"] --> D[\"CP or AP per data type\"]:::s0 --> M[\"Mechanism: quorum, consensus, LWW, CRDT\"]:::s2" }
    ],
    widget: { heading: "CAP playground: partition a cluster", caption: "Simplified model with 3 replicas. Cut the network, then try writes and reads via each node in CP and AP mode.", render: widget },
    examples: [
      ["Amazon Dynamo (2007)", "The SOSP paper 'Dynamo: Amazon's Highly Available Key-value Store' describes an always-writable shopping cart that may hold conflicting versions, merged later."],
      ["Apache ZooKeeper and etcd", "Coordination services built on consensus (ZAB and Raft). A minority partition stops accepting writes, which is why they're used for leader election and configuration."],
      ["Amazon DynamoDB read options", "DynamoDB offers eventually consistent reads by default and strongly consistent reads on request: a per-request consistency choice."],
      ["Google Spanner", "A globally distributed, strongly consistent database. Google describes it as technically CP, made highly available in practice by a very reliable private network."]
    ],
    pitfalls: [
      "Saying 'we pick CA' for a distributed system",
      "Treating CAP as a choice for the whole system rather than per operation or data type",
      "Confusing CAP consistency (linearizability) with ACID consistency",
      "Forgetting PACELC: even without partitions, strong consistency costs latency",
      "Choosing AP without explaining how conflicts are resolved",
      "Choosing CP without saying what users see during a partition (errors, timeouts)"
    ],
    quiz: [
      ["What does 'C' mean in the CAP theorem?", ["ACID consistency (constraints hold)", "Linearizability: reads see the most recent write", "Data is compressed", "Caches are consistent with the database"], 1, "CAP's consistency is linearizability, a much stronger and different idea from ACID's consistency."],
      ["When does CAP force a choice between consistency and availability?", ["Always", "Only during a network partition", "Only during deployments", "Only for write-heavy systems"], 1, "Without a partition, a system can be both. The theorem is about what happens when nodes can't communicate."],
      ["A 5-node cluster splits into groups of 3 and 2. In a CP system using majority quorums, what happens on the 2-node side?", ["It keeps accepting writes", "It refuses writes (and usually linearizable reads)", "It elects its own leader and continues", "It deletes its data"], 1, "Only the side with a majority (3 of 5) can make progress; the minority refuses to avoid divergence."],
      ["Which is a typical AP conflict-resolution strategy that can silently lose updates?", ["Two-phase commit", "Last-write-wins", "Raft", "Read repair with quorums"], 1, "Last-write-wins keeps the write with the latest timestamp and discards the other."],
      ["What does the 'ELC' in PACELC add?", ["Else, choose Latency or Consistency when there's no partition", "Every Leader Commits", "Eventual Linearizable Consistency", "Elastic Load Control"], 0, "Even without partitions, waiting for replicas (consistency) costs latency."],
      ["Which data is the best fit for an AP design?", ["Account balances", "Distributed locks", "Like counts on posts", "Seat reservations"], 2, "Slightly stale or temporarily divergent like counts are acceptable; the others need strong consistency."],
      ["Why is 'CA' not a meaningful choice for a distributed database?", ["Because consistency is impossible", "Because you can't prevent network partitions, so a design must say what it does during one", "Because availability is always 100%", "Because CA systems are too slow"], 1, "Partitions happen whether you like it or not; ignoring them doesn't make a design 'CA'."],
      ["Amazon DynamoDB lets you choose between eventually consistent and strongly consistent reads. What does this show?", ["CAP doesn't apply to DynamoDB", "Consistency can be a per-request choice", "DynamoDB is always CP", "Strong reads are always faster"], 1, "Many modern systems make the trade-off tunable per operation."]
    ],
    practice: {
      q: "You're designing a global e-commerce platform with users in three regions. Which data would you make CP and which AP, what happens during a cross-region network partition, and how does PACELC affect normal operation?",
      a: [
        ["Classify the data", "CP: payments, order placement, inventory decrement. AP: product catalogue reads, reviews, recommendations, shopping cart, view counts."],
        ["CP mechanics", "Inventory and orders use a consensus- or primary-based store with majority quorums; a region cut off from the majority rejects or queues order placement and shows a clear 'try again' message."],
        ["AP mechanics", "Carts and reviews accept writes locally in every region; conflicts are merged after the partition (e.g. union of cart items, as in Dynamo; LWW for profile fields)."],
        ["Normal operation (PACELC)", "Serve catalogue and reviews from the local region for low latency (EL). Orders pay the cross-region coordination latency (EC) because correctness matters."],
        ["Read-your-writes", "After a user updates their cart or profile, route their reads to where they wrote, or use session tokens with a version, so they don't see stale data."],
        ["Trade-offs", "More regions = more latency for CP operations; AP merges can surprise users (an item reappearing in a cart). Say these out loud."]
      ]
    },
    recap: [
      "CAP: during a network partition, a replica must choose consistency or availability.",
      "Partitions are unavoidable, so 'CA' isn't an option; choose per data type or operation.",
      "CP: minority side refuses (quorums, consensus). AP: everyone answers, reconcile later.",
      "PACELC: without partitions, it's latency vs consistency.",
      "In interviews: name the choice, what users see, and the mechanism (quorum, LWW, CRDT)."
    ]
  });
})();
