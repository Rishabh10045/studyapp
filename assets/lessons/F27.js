/* Lesson F27: Distributed transactions & locking */
(function () {
  "use strict";
  var H = window.HLD;
  var SC = {
    none: { name: "No protection", steps: [["A", "SELECT status FROM seats WHERE id=12 → 'free'"], ["B", "SELECT status FROM seats WHERE id=12 → 'free'"], ["A", "UPDATE seats SET status='sold', owner='A' WHERE id=12"], ["B", "UPDATE seats SET status='sold', owner='B' WHERE id=12"], ["A", "charge card, send ticket"], ["B", "charge card, send ticket"]], bad: true, out: "Double booking: both A and B were charged; B silently overwrote A (lost update)." },
    pess: { name: "Pessimistic lock", steps: [["A", "BEGIN; SELECT … WHERE id=12 FOR UPDATE → 'free' (row locked)"], ["B", "BEGIN; SELECT … WHERE id=12 FOR UPDATE → waits for A's lock…"], ["A", "UPDATE seats SET status='sold', owner='A'; COMMIT (lock released)"], ["B", "…lock acquired → status 'sold'"], ["B", "ROLLBACK; show 'seat taken'"]], bad: false, out: "Correct: B waited, then saw the seat was sold. Cost: blocking; keep transactions short and lock in a consistent order to avoid deadlocks." },
    opt: { name: "Optimistic (version)", steps: [["A", "SELECT status, version → 'free', v=7"], ["B", "SELECT status, version → 'free', v=7"], ["A", "UPDATE … SET status='sold', owner='A', version=8 WHERE id=12 AND version=7 → 1 row"], ["B", "UPDATE … SET status='sold', owner='B', version=8 WHERE id=12 AND version=7 → 0 rows"], ["B", "conflict detected → re-read → 'sold' → show 'seat taken'"]], bad: false, out: "Correct without locks: B's conditional update matched 0 rows. Best when conflicts are rare; under heavy contention many retries fail." },
    cond: { name: "Atomic conditional update", steps: [["A", "UPDATE seats SET status='held', owner='A', hold_until=now()+10min WHERE id=12 AND status='free' → 1 row"], ["B", "same UPDATE … WHERE id=12 AND status='free' → 0 rows → 'seat taken'"], ["A", "pay within 10 min → UPDATE … SET status='sold' WHERE owner='A' AND status='held'"], ["–", "if A never pays: a sweeper (or the next reader) treats expired holds as free"]], bad: false, out: "Correct and simple: one atomic statement claims the seat; the hold gives A time to pay (the BookMyShow pattern, P17)." }
  };

  function widget(el, ctx) {
    var s = ctx.state; if (!s.sc) { s.sc = "none"; s.step = 0; }
    el.innerHTML = "<div class='seg' data-r='seg'>" + Object.keys(SC).map(function (k) { return "<button data-s='" + k + "'>" + SC[k].name + "</button>"; }).join("") + "</div>" +
      "<p class='caption'>Users A and B click 'Book seat 12' at the same moment. Step through the interleaving.</p>" +
      "<div class='rows' data-r='rows'></div><div class='controls'><button class='btn' data-a='prev'>Back</button><button class='btn primary' data-a='next'>Next step</button><button class='btn' data-a='all'>Show all</button></div><div class='callout' data-r='out'></div>";
    function draw() {
      el.querySelectorAll("[data-s]").forEach(function (b) { b.className = b.getAttribute("data-s") === s.sc ? "active" : ""; });
      var sc = SC[s.sc], n = Math.min(s.step, sc.steps.length);
      el.querySelector("[data-r='rows']").innerHTML = sc.steps.map(function (st, i) {
        var on = i < n;
        return "<div class='row' style='opacity:" + (on ? 1 : 0.25) + "'><span class='t'><span class='pill " + (st[0] === "A" ? "" : st[0] === "B" ? "warning" : "success") + "'>" + st[0] + "</span> step " + (i + 1) + "</span><span class='dt'><code>" + ctx.esc(st[1]) + "</code></span></div>";
      }).join("");
      var o = el.querySelector("[data-r='out']");
      if (n < sc.steps.length) { o.className = "callout"; o.style.borderColor = ""; o.textContent = "Step " + n + " of " + sc.steps.length + "…"; }
      else if (sc.bad) { o.className = "callout"; o.style.borderColor = "var(--danger)"; o.innerHTML = "<strong>Bug.</strong> " + sc.out; }
      else { o.className = "callout success"; o.style.borderColor = ""; o.innerHTML = "<strong>Safe.</strong> " + sc.out; }
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-s")) { s.sc = b.getAttribute("data-s"); s.step = 0; }
      var a = b.getAttribute("data-a"), L = SC[s.sc].steps.length;
      if (a === "next") s.step = Math.min(L, s.step + 1); if (a === "prev") s.step = Math.max(0, s.step - 1); if (a === "all") s.step = L;
      ctx.save(); draw();
    });
    draw();
  }

  H.registerLesson({
    code: "F27",
    summary: "Keeping data correct across concurrent users and multiple services: race conditions, pessimistic vs optimistic locking, distributed locks, two-phase commit, sagas with compensations, and the transactional outbox.",
    slides: [
      { t: "The problem: concurrent and distributed writes", x: "Inside one database, ACID transactions keep data correct. Two things break that comfort: concurrency races, and operations that span several services or databases.",
        p: ["Race: two users book the last seat at the same moment", "Lost update: read-modify-write where the second write overwrites the first", "Cross-service: order DB + payment provider + inventory DB can't share one ACID transaction", "Tools: locks, conditional writes, 2PC, sagas, outbox"],
        m: "flowchart LR\n  A[\"User A: seat 12 free?\"] --> DB[(\"seats\")]:::s0\n  B[\"User B: seat 12 free?\"] --> DB\n  DB --> X[\"both see 'free' → both book\"]:::bad" },
      { t: "Pessimistic locking", x: "Lock the data before changing it, so others wait.",
        p: ["SQL: SELECT … FOR UPDATE locks the rows until commit", "Simple and safe under heavy contention", "Costs: blocked transactions, deadlocks (databases detect and abort one), lower throughput", "Keep lock scope small and transactions short; never hold a DB lock while calling a slow external service"],
        m: "sequenceDiagram\n  participant A as Tx A\n  participant D as DB\n  participant B as Tx B\n  A->>D: SELECT … FOR UPDATE (lock row)\n  B->>D: SELECT … FOR UPDATE\n  Note over B: blocked\n  A->>D: UPDATE + COMMIT\n  D-->>B: lock granted, sees new value" },
      { t: "Optimistic concurrency control", x: "Don't lock; detect conflicts at write time with a version number (or timestamp/ETag).",
        p: ["Read row with version v", "UPDATE … SET …, version = v+1 WHERE id = ? AND version = v", "0 rows updated → someone else changed it → retry or report", "Great when conflicts are rare (profile edits, documents)", "HTTP equivalent: ETag + If-Match → 412 Precondition Failed", "Also: compare-and-set in Redis, DynamoDB condition expressions"],
        m: "flowchart LR\n  R[\"read v=7\"] --> W{\"UPDATE … WHERE version=7\"}:::s1\n  W -->|\"1 row\"| OK[\"success, now v=8\"]:::s2\n  W -->|\"0 rows\"| RT[\"conflict → retry\"]:::bad" },
      { t: "Distributed locks", x: "When the resource isn't one DB row (e.g. 'only one worker processes file X'), use a lock service.",
        p: ["Redis: SET lock:x <token> NX PX 30000; release only if the token matches (Lua script)", "etcd / ZooKeeper: leases or ephemeral nodes backed by consensus (F23) — safer", "Locks must expire (holder may crash) → a paused holder may outlive its lock", "Use fencing tokens so storage rejects stale holders", "Prefer avoiding locks: conditional writes, single-writer partitions, idempotency"],
        m: "flowchart LR\n  W1[\"Worker 1\"] -->|\"SET NX PX 30s → OK, token 41\"| R[(\"Lock store\")]:::s1\n  W2[\"Worker 2\"] -->|\"SET NX → fails\"| R\n  W1 -->|\"write with token 41\"| S[(\"Storage checks token\")]:::s0" },
      { t: "Two-phase commit (2PC)", x: "A coordinator makes several participants commit atomically: all or none.",
        p: ["Phase 1 (prepare): each participant durably prepares and votes yes/no", "Phase 2 (commit/abort): coordinator tells everyone the decision", "Blocking: if the coordinator dies after prepare, participants hold locks and wait", "Higher latency; poorly suited to calls between independent services or external APIs", "Used inside distributed databases and XA transactions"],
        m: "sequenceDiagram\n  participant C as Coordinator\n  participant P1 as Orders DB\n  participant P2 as Inventory DB\n  C->>P1: prepare\n  C->>P2: prepare\n  P1-->>C: yes\n  P2-->>C: yes\n  C->>P1: commit\n  C->>P2: commit" },
      { t: "Sagas", x: "Split a business transaction into a sequence of local transactions; if a step fails, run compensating actions for completed steps.",
        p: ["Example: create order → reserve stock → charge payment → confirm", "Payment fails → compensate: release stock, cancel order", "Compensations are semantic 'undos' (refund, release), not rollbacks", "No isolation: others may see intermediate states → use status fields (PENDING) and design for it", "Each step must be idempotent and retried"],
        m: "flowchart LR\n  O[\"1. Create order (PENDING)\"]:::s0 --> I[\"2. Reserve stock\"]:::s0 --> P[\"3. Charge payment\"]:::bad\n  P -. \"fails\" .-> CI[\"Compensate: release stock\"]:::s1 --> CO[\"Compensate: cancel order\"]:::s1" },
      { t: "Orchestration vs choreography", x: "Two ways to run a saga.",
        table: [["", "Orchestration", "Choreography"], ["Control", "Central orchestrator tells each service what to do", "Services react to each other's events"], ["Visibility", "Workflow in one place", "Spread across services"], ["Coupling", "Orchestrator knows all steps", "Looser, but harder to follow"], ["Tools", "Temporal, AWS Step Functions, Camunda", "Kafka events + outbox"]],
        m: "flowchart LR\n  OR[\"Order saga orchestrator\"]:::s1 --> INV[\"Inventory\"]:::s0\n  OR --> PAY[\"Payments\"]:::s0\n  OR --> SHIP[\"Shipping\"]:::s0\n  E1[\"OrderCreated\"] -.-> INV2[\"Inventory listens\"] -.-> E2[\"StockReserved\"] -.-> PAY2[\"Payments listens\"]" },
      { t: "Transactional outbox", x: "A service must update its DB and publish an event. Doing both separately risks one succeeding and the other failing.",
        p: ["Write the business row and an outbox row in one local transaction", "A relay (poller or CDC, e.g. Debezium) publishes outbox rows to Kafka and marks them sent", "At-least-once publish → consumers dedupe (F24)", "The inbox pattern on the consumer side records processed event ids"],
        m: "flowchart LR\n  S[\"Order service\"] -->|\"one transaction\"| DB[(\"orders + outbox\")]:::s0\n  DB -->|\"CDC / poller\"| RL[\"Relay\"]:::s1 --> K[(\"Kafka\")] --> C[\"Consumers (dedupe)\"]:::s2" },
      { t: "Choosing an approach", x: "Match the tool to the scope.",
        table: [["Situation", "Approach"], ["Same DB, low contention", "Optimistic versioning"], ["Same DB, hot rows (last seats)", "Atomic conditional update or SELECT FOR UPDATE"], ["Exclusive job across workers", "Lease/lock in etcd + fencing; or partition ownership"], ["Across services", "Saga + outbox + idempotent steps"], ["Inside one distributed DB", "Its built-in transactions (Spanner, CockroachDB)"]],
        p: ["Interview line: 'Seat claimed with UPDATE … WHERE status = free; payment via saga with idempotency keys; events via outbox.'"],
        m: "flowchart LR\n  Q{\"One database?\"} -->|\"yes\"| L[\"Locks / versions / conditional writes\"]:::s0\n  Q -->|\"no\"| SG[\"Saga + outbox\"]:::s2" }
    ],
    widget: { heading: "Two users, one seat", caption: "Step through the same race under four strategies and see which ones double-book.", render: widget },
    examples: [
      ["Sagas (1987)", "Hector Garcia-Molina and Kenneth Salem introduced sagas for long-lived transactions; microservices revived the idea."],
      ["Uber Cadence / Temporal", "Uber built Cadence for durable workflows; its creators later founded Temporal, used to orchestrate sagas."],
      ["Google Spanner", "Uses two-phase commit over Paxos-replicated groups plus TrueTime for globally consistent transactions."],
      ["Redlock debate", "Martin Kleppmann's 2016 critique of Redis's Redlock algorithm argued that locks used for correctness need fencing tokens."]
    ],
    pitfalls: [
      "Check-then-act without a lock or conditional write (race conditions)",
      "Holding DB locks while calling a payment provider",
      "Using 2PC across independent microservices or third-party APIs",
      "Sagas without compensations, idempotency or visible PENDING states",
      "Distributed locks without expiry or fencing",
      "Updating the DB and publishing an event as two separate steps"
    ],
    quiz: [
      ["Two requests read 'seat free' and both write 'sold'. This is a…", ["Deadlock", "Race condition / lost update", "Partition", "Cache miss"], 1, "Check-then-act without protection."],
      ["What does SELECT … FOR UPDATE do?", ["Reads without locks", "Locks the selected rows until the transaction ends", "Updates all rows", "Creates an index"], 1, "Pessimistic locking."],
      ["Optimistic concurrency detects conflicts by…", ["Locking first", "A version check in the UPDATE's WHERE clause", "Using 2PC", "Retrying forever"], 1, "0 rows updated means someone changed it."],
      ["Main weakness of two-phase commit?", ["No atomicity", "Blocking if the coordinator fails after prepare, plus extra latency", "Can't work in one DB", "Requires eventual consistency"], 1, "Participants hold locks waiting for the decision."],
      ["In a saga, what happens when step 3 fails?", ["Database rollback of all services", "Compensating actions undo steps 1–2", "Nothing", "The coordinator retries forever"], 1, "Semantic undo: refund, release, cancel."],
      ["What problem does the transactional outbox solve?", ["Slow queries", "Updating the DB and publishing an event atomically", "Cache invalidation", "Leader election"], 1, "Event is written in the same local transaction."],
      ["Why use fencing tokens with distributed locks?", ["To speed them up", "So storage rejects writes from a holder whose lock expired", "To encrypt locks", "To avoid TTLs"], 1, "Pauses can outlive a lock's lease."],
      ["Best fit for 'order → stock → payment' across three services?", ["2PC across services", "Saga with compensations and idempotent steps", "One global lock", "No coordination"], 1, "Sagas suit independently owned services."]
    ],
    practice: {
      q: "Design checkout for a flash sale: 10,000 units of a phone, 1 million users click 'Buy' within a minute; orders, inventory and payments are separate services. Never oversell; never charge without an order.",
      a: [
        ["Front door", "Virtual waiting room / rate limiting to admit users at a sustainable rate; static pages via CDN."],
        ["Claim stock", "Atomic conditional decrement: UPDATE inventory SET available = available − 1 WHERE sku = ? AND available > 0 (or Redis DECR with a Lua check, later reconciled with the DB). 0 rows → sold out."],
        ["Reservation", "Create order PENDING with a 10-minute hold; a sweeper releases expired holds back to stock."],
        ["Payment saga", "Orchestrator: reserve → charge (idempotency key = order_id) → confirm; on payment failure or timeout, compensate by releasing stock and cancelling the order."],
        ["Events", "Outbox in each service; Kafka; idempotent consumers for email, analytics, shipping."],
        ["Hot row", "Single SKU row is a hotspot: split stock into N buckets (sub-counters) claimed randomly, or pre-load tokens into a queue/Redis."],
        ["Trade-offs", "Holds can make stock look sold out briefly; sagas show PENDING states; buckets add complexity for higher throughput."]
      ]
    },
    recap: [
      "Check-then-act races need locks, version checks or atomic conditional writes.",
      "Pessimistic locks block; optimistic versions retry on conflict.",
      "Distributed locks need expiry and fencing tokens.",
      "2PC is atomic but blocking; sagas use local steps + compensations.",
      "Use the outbox to update the DB and publish events reliably."
    ]
  });
})();
