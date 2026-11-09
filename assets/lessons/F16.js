/* Lesson F16: Message queues & pub/sub */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.rate) { s.rate = 500; s.cons = 3; s.each = 150; s.parts = 6; s.spike = true; }
    el.innerHTML = "<div class='grid2'>" +
      [["rate", "Producer rate (msg/s)", 50, 2000, 50], ["each", "Each consumer handles (msg/s)", 50, 500, 10], ["cons", "Consumers in group", 1, 12, 1], ["parts", "Partitions", 1, 12, 1]].map(function (f) {
        return "<label class='field'>" + f[1] + ": <strong data-v='" + f[0] + "' style='color:var(--text)'></strong><input type='range' min='" + f[2] + "' max='" + f[3] + "' step='" + f[4] + "' data-k='" + f[0] + "'></label>";
      }).join("") + "</div><label class='toggle'><input type='checkbox' data-r='spike'> 3× traffic spike from t=20s to t=40s</label>" +
      "<div class='metrics' data-r='m'></div><div data-r='chart'></div><p class='caption' data-r='note'></p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      ["rate", "each", "cons", "parts"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; el.querySelector("[data-v='" + k + "']").textContent = s[k]; });
      q("spike").checked = s.spike;
      var active = Math.min(s.cons, s.parts), cap = active * s.each, backlog = 0, pts = [], peak = 0;
      for (var t = 0; t < 60; t++) {
        var inR = s.rate * (s.spike && t >= 20 && t < 40 ? 3 : 1);
        backlog = Math.max(0, backlog + inR - cap); pts.push(backlog); peak = Math.max(peak, backlog);
      }
      var lag = cap ? backlog / cap : 0;
      q("m").innerHTML = [[cap + "/s", "Consumer capacity"], [active + " / " + s.cons, "Active consumers"], [Math.round(peak).toLocaleString(), "Peak backlog (msgs)"], [backlog ? lag.toFixed(0) + " s" : "0 s", "Time to drain at t=60s"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var W = 600, Hh = 140, mx = Math.max(peak, 1);
      var path = pts.map(function (v, i) { return (i ? "L" : "M") + (i * W / 59).toFixed(1) + "," + (Hh - v / mx * (Hh - 10)).toFixed(1); }).join(" ");
      q("chart").innerHTML = "<svg viewBox='0 0 " + W + " " + (Hh + 18) + "' width='100%' role='img' aria-label='Backlog over 60 seconds'>" +
        (s.spike ? "<rect x='" + (20 * W / 59) + "' y='0' width='" + (20 * W / 59) + "' height='" + Hh + "' fill='var(--c1)' opacity='.15'/>" : "") +
        "<path d='" + path + "' fill='none' stroke='var(--c0)' stroke-width='2.5'/><line x1='0' y1='" + Hh + "' x2='" + W + "' y2='" + Hh + "' stroke='var(--border-strong)'/>" +
        "<text x='0' y='" + (Hh + 14) + "' font-size='11' fill='var(--text-3)'>0s</text><text x='" + (W - 24) + "' y='" + (Hh + 14) + "' font-size='11' fill='var(--text-3)'>60s</text><text x='4' y='12' font-size='11' fill='var(--text-3)'>backlog (peak " + Math.round(peak).toLocaleString() + ")</text></svg>";
      q("note").textContent = (s.cons > s.parts ? "In a Kafka-style consumer group each partition goes to one consumer, so " + (s.cons - s.parts) + " consumer(s) sit idle. " : "") +
        "The queue absorbs bursts: producers never wait, the backlog grows, then drains when traffic drops if capacity exceeds the normal rate. Simplified fluid model.";
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    q("spike").addEventListener("change", function (e) { s.spike = e.target.checked; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F16",
    summary: "Asynchronous messaging: why queues decouple services and absorb bursts, point-to-point queues vs pub/sub topics, Kafka-style partitioned logs, delivery guarantees, ordering, dead-letter queues and backpressure.",
    slides: [
      { t: "Why asynchronous messaging?", x: "With direct synchronous calls, a slow or down service slows or breaks its callers. A queue in between lets the producer hand off work and move on.",
        p: ["Decoupling: producer doesn't need to know who consumes or whether they are up", "Buffering: absorbs traffic spikes (load levelling)", "Scaling: add consumers to process faster", "Reliability: messages persist until processed"],
        m: "flowchart LR\n  A[\"Order service\"] -->|\"publish OrderPlaced\"| Q[(\"Queue\")]:::s1\n  Q --> E[\"Email worker\"]:::s0\n  Q --> E2[\"Email worker\"]:::s0" },
      { t: "Point-to-point queue", x: "Each message is processed by one consumer among many competing consumers. Classic work queue.",
        p: ["Examples: Amazon SQS, RabbitMQ queues", "Consumer receives, processes, then acknowledges (deletes)", "If not acked within a visibility timeout, the message becomes visible again and is redelivered", "Great for background jobs: emails, thumbnails, reports"],
        m: "flowchart LR\n  P[\"Producer\"] --> Q[(\"Work queue\")]:::s1\n  Q -->|\"msg 1\"| W1[\"Worker 1\"]:::s0\n  Q -->|\"msg 2\"| W2[\"Worker 2\"]:::s0\n  Q -->|\"msg 3\"| W3[\"Worker 3\"]:::s0" },
      { t: "Publish/subscribe", x: "A message published to a topic is delivered to every subscriber. Each subscriber gets its own copy.",
        p: ["Examples: Amazon SNS, Google Pub/Sub, Kafka topics with multiple consumer groups, Redis Pub/Sub", "Fan-out an event to independent services", "Adding a new subscriber doesn't change the publisher", "Common combo: SNS topic fanning out to several SQS queues"],
        m: "flowchart LR\n  P[\"Order service\"] --> T{{\"Topic: OrderPlaced\"}}:::s1\n  T --> A[\"Email\"]:::s0\n  T --> B[\"Analytics\"]:::s0\n  T --> C[\"Inventory\"]:::s0" },
      { t: "Kafka: a partitioned, replicated log", x: "Kafka stores messages in an append-only log per partition and keeps them for a retention period. Consumers track their own offset.",
        p: ["Topic = N partitions; ordering is guaranteed only within a partition", "Producers choose a partition by key hash (e.g. user_id) so one key stays ordered", "In a consumer group, each partition is read by exactly one consumer → max useful consumers = partitions", "Messages are retained (e.g. 7 days) and can be replayed by resetting offsets", "Partitions are replicated across brokers"],
        m: "flowchart LR\n  P[\"Producer (key=user_id)\"] --> P0[\"Partition 0: m0 m3 m6 …\"]:::s0\n  P --> P1[\"Partition 1: m1 m4 m7 …\"]:::s0\n  P --> P2[\"Partition 2: m2 m5 m8 …\"]:::s0\n  P0 --> C1[\"Consumer A1\"]:::s2\n  P1 --> C2[\"Consumer A2\"]:::s2\n  P2 --> C2" },
      { t: "Queue vs log", x: "Two families of brokers with different strengths.",
        table: [["", "Message queue (SQS, RabbitMQ)", "Log (Kafka, Kinesis, Pulsar)"], ["After consume", "Message deleted on ack", "Kept until retention expires"], ["Replay", "No (usually)", "Yes, by offset"], ["Ordering", "Best-effort (FIFO options exist)", "Per partition"], ["Scaling consumers", "Any number compete", "Up to #partitions per group"], ["Typical use", "Task/job queues", "Event streaming, CDC, analytics pipelines"]],
        m: "flowchart LR\n  Q[\"Queue: consume → delete\"]:::s1\n  L[\"Log: consume → advance offset; data stays\"]:::s0" },
      { t: "Delivery guarantees", x: "Networks and crashes force a choice about duplicates vs loss.",
        p: ["At-most-once: ack before processing; a crash loses the message", "At-least-once: ack after processing; a crash causes redelivery → duplicates (most common)", "Exactly-once: possible only within limited scopes (e.g. Kafka transactions for read-process-write within Kafka)", "Practical rule: at-least-once delivery + idempotent consumers"],
        m: "sequenceDiagram\n  participant Q as Queue\n  participant W as Worker\n  Q->>W: deliver msg 42\n  W->>W: process (email sent)\n  Note over W: crash before ack\n  Q->>W: redeliver msg 42 after timeout\n  W->>W: dedupe by message id → skip" },
      { t: "Failures: retries and dead-letter queues", x: "A 'poison' message that always fails would be retried forever and block progress.",
        p: ["Retry with exponential backoff", "After N attempts, move to a dead-letter queue (DLQ) for inspection", "Alert on DLQ size; provide a redrive tool", "Make handlers idempotent since retries repeat work"],
        m: "flowchart LR\n  Q[(\"Main queue\")]:::s1 --> W[\"Worker\"]:::s0\n  W -->|\"fail, retry w/ backoff\"| Q\n  W -->|\"after 5 failures\"| DLQ[(\"Dead-letter queue\")]:::bad\n  DLQ --> OPS[\"Alert + inspect + redrive\"]" },
      { t: "Backpressure and consumer lag", x: "If consumers are slower than producers on average, the backlog grows without bound. Queues absorb bursts, not permanent overload.",
        p: ["Monitor queue depth / consumer lag and message age", "Autoscale consumers on lag (e.g. KEDA, SQS-based scaling)", "Kafka: more partitions are needed to add more consumers", "If you can't keep up: shed load, sample, or rate-limit producers"],
        m: "flowchart LR\n  P[\"Producers 1,000/s\"] --> Q[(\"Backlog growing\")]:::bad --> C[\"Consumers 600/s\"]\n  Q -. \"lag alert\" .-> AS[\"Autoscaler adds consumers\"]:::s2 --> C" },
      { t: "Patterns that rely on queues", x: "Queues appear in almost every large design.",
        p: ["Async jobs: video transcoding, image resizing, email", "Event-driven microservices: publish domain events", "Fan-out on write for feeds and notifications", "CDC pipelines: DB changes → Kafka → search, cache, warehouse", "Transactional outbox: write the event to a DB table in the same transaction, a relay publishes it"],
        m: "flowchart LR\n  APP[\"Service\"] -->|\"one DB transaction\"| DB[\"orders + outbox table\"]:::s0\n  DB --> RL[\"Outbox relay\"] --> K[\"Kafka\"]:::s1 --> S1[\"Search indexer\"]\n  K --> S2[\"Notifications\"]" },
      { t: "Queues in interviews", x: "Use a queue whenever work can happen later or bursts must be smoothed.",
        p: ["'Upload returns immediately; a queue triggers transcoding workers.'", "'Kafka topic partitioned by user_id preserves per-user order.'", "'At-least-once delivery, so consumers are idempotent using a message id.'", "'DLQ after 5 retries; autoscale workers on lag.'", "Don't put a queue where the user needs the answer synchronously"],
        m: "flowchart LR\n  C[\"Client\"] --> API[\"API\"] -->|\"202 Accepted\"| C\n  API --> Q[(\"Queue\")]:::s1 --> W[\"Workers\"]:::s0 --> DB[\"DB\"]\n  W --> N[\"Notify when done\"]:::s2" }
    ],
    widget: { heading: "Queue backlog simulator", caption: "Tune producer rate, consumers and partitions; add a burst and watch the backlog grow and drain. Simplified fluid model.", render: widget },
    examples: [
      ["LinkedIn and Kafka", "Kafka was created at LinkedIn (open-sourced in 2011) to move activity data and logs; it's now an Apache project used widely for event streaming."],
      ["Amazon SQS", "One of the earliest AWS services (generally available 2006). Standard queues are at-least-once with best-effort ordering; FIFO queues add ordering and deduplication."],
      ["Uber", "Uber has written about running one of the largest Kafka deployments, carrying trillions of messages per day for trips, logs and analytics."],
      ["Fan-out with SNS + SQS", "A common AWS pattern: one SNS topic fans out each event to multiple SQS queues, one per consuming service."]
    ],
    pitfalls: [
      "Assuming exactly-once delivery and writing non-idempotent consumers",
      "Expecting global ordering across Kafka partitions",
      "Adding more consumers than partitions and expecting more throughput",
      "No dead-letter queue, so one poison message blocks or loops",
      "Using a queue to hide permanent overload instead of scaling consumers",
      "Dual-writing to DB and queue without an outbox (event lost if one fails)"
    ],
    quiz: [
      ["Main benefit of putting a queue between two services?", ["Lower storage cost", "Decoupling and absorbing bursts so the producer isn't blocked", "Strong consistency", "Fewer servers"], 1, "The producer hands off and continues; consumers work at their own pace."],
      ["In pub/sub, a message published to a topic goes to…", ["Exactly one subscriber", "Every subscriber", "The fastest subscriber", "Nobody until polled by the publisher"], 1, "Each subscription receives its own copy."],
      ["Kafka guarantees ordering…", ["Across the whole topic", "Within a single partition", "Never", "Only for keys without hashing"], 1, "Use a key (e.g. user_id) to keep related messages in one partition."],
      ["A Kafka topic has 6 partitions and a consumer group has 10 consumers. How many consume?", ["10", "6", "1", "16"], 1, "Each partition is assigned to one consumer in the group; 4 sit idle."],
      ["The most common delivery guarantee in practice is…", ["At-most-once", "At-least-once with idempotent consumers", "Exactly-once over any network", "Best-effort with no retries"], 1, "Redelivery after crashes causes duplicates, so make processing idempotent."],
      ["What is a dead-letter queue for?", ["Storing deleted users", "Holding messages that failed repeatedly, for inspection", "Speeding up delivery", "Archiving successful messages"], 1, "It stops poison messages from blocking or looping forever."],
      ["Which feature distinguishes a log (Kafka) from a classic queue (SQS)?", ["Messages are retained and can be replayed by offset", "Messages are encrypted", "Only one consumer ever", "It is synchronous"], 0, "Consumers track offsets; data stays until retention expires."],
      ["Producers send 1,000 msg/s on average, consumers handle 800 msg/s. What happens?", ["Backlog stays flat", "Backlog grows without bound until you scale consumers or reduce load", "The queue speeds up consumers", "Messages are processed twice as fast"], 1, "Queues absorb bursts, not sustained overload."]
    ],
    practice: {
      q: "An e-commerce site must, after each order, send a confirmation email, update inventory, award loyalty points and feed analytics. Peaks are 20× normal on sale days. Design the messaging.",
      a: [
        ["Event", "Order service writes the order and an OrderPlaced row to an outbox table in one transaction; a relay publishes it to a topic."],
        ["Topology", "Kafka topic 'orders' partitioned by order_id (or customer_id), or SNS → one SQS queue per consumer. Separate consumer groups: email, inventory, loyalty, analytics."],
        ["Guarantees", "At-least-once delivery; each consumer is idempotent using event_id (e.g. a processed_events table or unique constraint)."],
        ["Failures", "Retries with exponential backoff; DLQ after N attempts with alerting and a redrive tool."],
        ["Peaks", "Queue absorbs the 20× burst; autoscale consumers on lag; enough partitions provisioned ahead for peak consumer count."],
        ["Ordering", "Per-order ordering via key; no global ordering needed."],
        ["Trade-offs", "Emails/points arrive seconds later (eventual consistency); inventory may need a synchronous reservation step before payment if overselling is unacceptable."]
      ]
    },
    recap: [
      "Queues decouple services and level bursts; they don't fix sustained overload.",
      "Work queue = one consumer per message; pub/sub = every subscriber gets a copy.",
      "Kafka is a retained, partitioned log: order per partition, replay by offset.",
      "Assume at-least-once delivery and make consumers idempotent.",
      "Use retries with backoff, a DLQ, lag monitoring and the outbox pattern."
    ]
  });
})();
