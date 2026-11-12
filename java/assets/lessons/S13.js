/* Lesson S13: Messaging with Kafka & Spring */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded from a real Kafka 3.8 broker (spring-kafka-test EmbeddedKafkaKraftBroker) and a Spring Boot 3.4 app:
  // topic "orders" with 3 partitions, @KafkaListener groups "billing" (concurrency 3) and "analytics" (1 consumer),
  // offsets/lag read with AdminClient, a DefaultErrorHandler (FixedBackOff 300 ms x 2) with DeadLetterPublishingRecoverer,
  // and an idempotent consumer. Partitions come from the real murmur2 hash of each key.
  var REC = {"sends":[{"key":"asha","value":"dosa","partition":0,"offset":0},{"key":"meera","value":"idli","partition":2,"offset":0},{"key":"asha","value":"vada","partition":0,"offset":1},{"key":"priya","value":"chai","partition":1,"offset":0},{"key":"meera","value":"upma","partition":2,"offset":1},{"key":"asha","value":"coffee","partition":0,"offset":2},{"key":"ravi","value":"poha","partition":0,"offset":3},{"key":"priya","value":"lassi","partition":1,"offset":1},{"key":"neha","value":"samosa","partition":2,"offset":2}],"consumed":["analytics|analytics-0-C-1|0|0|asha|asha ordered dosa","billing|billing-2-C-1|0|0|asha|asha ordered dosa","billing|billing-2-C-1|2|0|meera|meera ordered idli","analytics|analytics-0-C-1|0|1|asha|asha ordered vada","analytics|analytics-0-C-1|0|2|asha|asha ordered coffee","analytics|analytics-0-C-1|0|3|ravi|ravi ordered poha","analytics|analytics-0-C-1|1|0|priya|priya ordered chai","analytics|analytics-0-C-1|1|1|priya|priya ordered lassi","analytics|analytics-0-C-1|2|0|meera|meera ordered idli","analytics|analytics-0-C-1|2|1|meera|meera ordered upma","billing|billing-2-C-1|0|1|asha|asha ordered vada","billing|billing-2-C-1|0|2|asha|asha ordered coffee","billing|billing-2-C-1|0|3|ravi|ravi ordered poha","billing|billing-2-C-1|1|0|priya|priya ordered chai","billing|billing-2-C-1|1|1|priya|priya ordered lassi","billing|billing-2-C-1|2|1|meera|meera ordered upma","analytics|analytics-0-C-1|2|2|neha|neha ordered samosa","billing|billing-2-C-1|2|2|neha|neha ordered samosa"],"lag":[{"group":"billing","partition":0,"committed":4,"end":4,"lag":0},{"group":"billing","partition":1,"committed":2,"end":2,"lag":0},{"group":"billing","partition":2,"committed":7,"end":7,"lag":0},{"group":"analytics","partition":0,"committed":4,"end":4,"lag":0},{"group":"analytics","partition":1,"committed":2,"end":2,"lag":0},{"group":"analytics","partition":2,"committed":3,"end":7,"lag":4}],"catchup":["analytics|analytics-0-C-2|2|3|kiran|kiran ordered thali 0","analytics|analytics-0-C-2|2|4|kiran|kiran ordered thali 1","analytics|analytics-0-C-2|2|5|kiran|kiran ordered thali 2","analytics|analytics-0-C-2|2|6|kiran|kiran ordered thali 3"],"errors":["pay|9|o-1 pay 120 INR|attempt 1","pay|12|o-2 pay 80 INR bank-down|attempt 1","pay|321|o-2 pay 80 INR bank-down|attempt 2","pay|824|o-2 pay 80 INR bank-down|attempt 3","DLT|1336|o-2 pay 80 INR bank-down|IllegalStateException: bank API 503|orig partition 0 offset 1","pay|1340|o-3 pay -5 INR bad-amount|attempt 1","DLT|1846|o-3 pay -5 INR bad-amount|IllegalArgumentException: amount must be positive|orig partition 0 offset 2","pay|1849|o-4 pay 60 INR|attempt 1"],"dupes":["ship|0|evt-1,ship order 11|processed","ship|1|evt-2,ship order 12|processed","ship|2|evt-1,ship order 11|duplicate eventId evt-1 skipped","ship|3|evt-3,ship order 13|processed","ship|4|evt-2,ship order 12|duplicate eventId evt-2 skipped"]};
  var TABS = [
    { k: "parts", label: "Keys → partitions" },
    { k: "groups", label: "Consumer groups" },
    { k: "lag", label: "Offsets & lag" },
    { k: "errors", label: "Retries & dead letters" },
    { k: "dupes", label: "Duplicate delivery" }
  ];
  var KC = { asha: "#dbeafe", meera: "#fce7f3", priya: "#dcfce7", ravi: "#fef3c7", neha: "#ede9fe", kiran: "#e0f2fe" };
  function cell(key, txt, ctx) { return "<div style='margin:3px 0;padding:4px 8px;border-radius:6px;background:" + (KC[key] || "#f1f5f9") + ";font-size:12px'>" + ctx.esc(txt) + "</div>"; }
  function s13Widget(el, ctx) {
    var s = ctx.state; if (!s.k) s.k = "groups";
    el.innerHTML = "<div class='btnrow'>" + TABS.map(function (x) { return "<button type='button' class='btn' data-k='" + x.k + "'>" + x.label + "</button>"; }).join("") + "</div><div data-r='out' style='margin-top:10px'></div>";
    var out = el.querySelector("[data-r='out']");
    function cols(fn) { var h = "<div style='display:grid;grid-template-columns:repeat(3,1fr);gap:8px'>"; for (var p = 0; p < 3; p++) h += "<div style='border:1px solid #e2e8f0;border-radius:8px;padding:6px'>" + fn(p) + "</div>"; return h + "</div>"; }
    function draw() {
      el.querySelectorAll("button[data-k]").forEach(function (b) { b.classList.toggle("primary", b.dataset.k === s.k); });
      var h = "", note = "";
      if (s.k === "parts") {
        h = "<div style='font-size:13px;margin-bottom:6px'>Sent in this order: " + REC.sends.map(function (x) { return "<code>" + x.key + ":" + x.value + "</code>"; }).join(" → ") + "</div>" +
          cols(function (p) { return "<b>orders-" + p + "</b>" + REC.sends.filter(function (x) { return x.partition === p; }).map(function (x) { return cell(x.key, "offset " + x.offset + " · " + x.key + " · " + x.value, ctx); }).join(""); });
        note = "`kafkaTemplate.send(\"orders\", key, value)` hashes the **key** (murmur2 mod 3). Every order from **asha** went to partition 0 with offsets 0, 1, 2 in the order sent, so one customer's events stay **ordered**. Ordering is guaranteed only **within** a partition; across partitions there is none. Offsets are per partition.";
      } else if (s.k === "groups") {
        var g = function (name) { var by = {}; REC.consumed.filter(function (l) { return l.indexOf(name + "|") === 0; }).forEach(function (l) { var p = l.split("|"); (by[p[1]] = by[p[1]] || []).push(p); }); return by; };
        ["billing", "analytics"].forEach(function (name) {
          var by = g(name), th = Object.keys(by).sort();
          h += "<div style='font-weight:600;margin:8px 0 4px'>group <code>" + name + "</code> (" + th.length + " consumer" + (th.length > 1 ? "s" : "") + ")</div><div style='display:grid;grid-template-columns:repeat(" + th.length + ",1fr);gap:8px'>" +
            th.map(function (t) { var parts = []; by[t].forEach(function (p) { if (parts.indexOf(p[2]) < 0) parts.push(p[2]); }); return "<div style='border:1px solid #e2e8f0;border-radius:8px;padding:6px'><code style='font-size:11px'>" + t + "</code> · partition " + parts.sort().join(", ") + by[t].map(function (p) { return cell(p[4], "p" + p[2] + "@" + p[3] + " " + p[5], ctx); }).join("") + "</div>"; }).join("") + "</div>";
        });
        note = "Two groups read the **same** topic independently: each group gets **every** message (publish–subscribe between groups). Inside `billing` (`concurrency = \"3\"`) each consumer owns **one partition**, so work is shared (queue semantics within a group). `analytics` has one consumer, so it gets all three partitions. A group can't use more consumers than there are partitions.";
      } else if (s.k === "lag") {
        h = "<div class='tablewrap'><table style='font-size:13px'><tr><th>group</th><th>partition</th><th>committed offset</th><th>log end offset</th><th>lag</th></tr>" +
          REC.lag.map(function (r) { return "<tr><td>" + r.group + "</td><td>" + r.partition + "</td><td>" + r.committed + "</td><td>" + r.end + "</td><td style='font-weight:700;color:" + (r.lag ? "#b91c1c" : "#166534") + "'>" + r.lag + "</td></tr>"; }).join("") + "</table></div>" +
          "<div style='margin-top:8px;font-size:13px'>After restarting <code>analytics</code>:</div><pre class='code' style='font-size:12px'>" + ctx.esc(REC.catchup.map(function (l) { var p = l.split("|"); return p[1] + "  partition " + p[2] + " offset " + p[3] + "  " + p[5]; }).join("\n")) + "</pre>";
        note = "We stopped the `analytics` listener and sent 4 orders for **kiran** (partition 2). `billing` committed up to the end (lag 0); `analytics` stayed at offset 3 while the log end moved to 7: **lag 4**. On restart it resumed from its **committed offset** and read exactly offsets 3–6. Consumer lag is the key Kafka health metric.";
      } else if (s.k === "errors") {
        h = "<pre class='code' style='font-size:12px;white-space:pre-wrap'>" + ctx.esc(REC.errors.map(function (l) { var p = l.split("|"); return (p[1] + " ms").padStart(8) + "  " + (p[0] === "DLT" ? "→ payments-dlt  " + p[2] + "\n            " + p[3] + " (" + p[4] + ")" : "payments  " + p[2] + "  [" + p[3] + "]"); }).join("\n")) + "</pre>";
        note = "`DefaultErrorHandler(new DeadLetterPublishingRecoverer(template), new FixedBackOff(300, 2))`. **o-2** (bank 503, transient) was retried twice ~300 ms and ~500 ms apart, then published to **`payments-dlt`** with headers holding the exception, original partition and offset. **o-3** threw `IllegalArgumentException`, marked **not retryable**, so it went straight to the DLT. Note **o-4 waited** ~1.8 s behind them: blocking retries stall the partition (use `@RetryableTopic` for non-blocking retries).";
      } else {
        h = "<div class='tablewrap'><table style='font-size:13px'><tr><th>offset</th><th>event</th><th>consumer action</th></tr>" + REC.dupes.map(function (l) { var p = l.split("|"); return "<tr><td>" + p[1] + "</td><td><code>" + ctx.esc(p[2]) + "</code></td><td style='color:" + (p[3] === "processed" ? "#166534" : "#b45309") + "'>" + ctx.esc(p[3]) + "</td></tr>"; }).join("") + "</table></div>";
        note = "Kafka gives **at-least-once** delivery in practice: a producer retry or a consumer crash before committing its offset re-delivers a message. The consumer stores processed **event ids** and skips repeats, so evt-1 and evt-2 had effect only once. In production keep the ids in the database, in the same transaction as the side effect.";
      }
      out.innerHTML = h + "<div class='result'>" + ctx.md(note) + "</div>";
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (!b) return; s.k = b.dataset.k; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Why messaging between services",
      text: "With synchronous REST, the order service calls billing, inventory, email and analytics **one by one**, waits for each, and fails if any is down. With **messaging**, it publishes one event (`OrderPlaced`) and returns; each interested service consumes it **in its own time**. This gives loose coupling (the producer doesn't know who listens), resilience (a consumer that is down catches up later) and load levelling (bursts wait in the log). The costs: **eventual consistency**, duplicate and out-of-order delivery to handle, and harder debugging. **Kafka** is a distributed, durable, append-only **log**: messages are kept for days and each reader tracks its own position (offset), unlike a classic queue that deletes messages once consumed.",
      m: M(["flowchart LR",
        "  O[\"order-service\"]:::s1 -->|OrderPlaced| T[(\"topic: orders\")]:::s2",
        "  T --> B[\"billing\"]:::s4",
        "  T --> I[\"inventory\"]:::s4",
        "  T --> A[\"analytics\"]:::s4",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `List<String> log = new ArrayList<>();                  // an append-only log
Map<String, Integer> offsets = new HashMap<>();         // each reader's position
for (String e : List.of("OrderPlaced#1", "OrderPlaced#2", "OrderPlaced#3")) log.add(e);
java.util.function.BiConsumer<String, Integer> read = (reader, max) -> {
    int from = offsets.getOrDefault(reader, 0), to = Math.min(log.size(), from + max);
    System.out.println(reader + " reads offsets " + from + ".." + (to - 1) + ": " + log.subList(from, to));
    offsets.put(reader, to);
};
read.accept("billing", 3);
read.accept("analytics", 1);        // slower reader, same data, own offset
log.add("OrderPlaced#4");
read.accept("billing", 3);
read.accept("analytics", 3);
System.out.println("log still has " + log.size() + " messages; offsets " + offsets);`,
      analogy: "A newspaper archive rather than a letterbox: issues aren't destroyed when one person reads them, and each reader keeps a bookmark of where they got to." },
    { title: "Topics, partitions, offsets and replication",
      text: "A **topic** is a named stream, split into **partitions** for parallelism. Each partition is an ordered, append-only log where every record gets an increasing **offset**. A record's **key** decides its partition (hash of key mod partitions), so all events for one key are **in order**; there is no order across partitions. Partitions are spread over **brokers** and **replicated** (replication factor 3 in production): one leader takes writes, followers copy, and `min.insync.replicas` plus `acks=all` decide how many copies must confirm a write. Records are kept for a **retention** period (or compacted to the latest value per key), not deleted on read.",
      m: M(["flowchart LR",
        "  P[\"producer<br/>key=asha\"]:::s1 -->|\"hash(key) mod 3 = 0\"| P0[\"orders-0<br/>0 1 2 3 …\"]:::s2",
        "  P1[\"orders-1<br/>0 1 …\"]:::s3",
        "  P2[\"orders-2<br/>0 1 2 …\"]:::s3",
        "  P0 -.->|replicated| R[\"follower on broker 2\"]:::s4",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#fff3e0,stroke:#ef6c00", "  classDef s3 fill:#f1f5f9,stroke:#64748b", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `var broker = new EmbeddedKafkaKraftBroker(1, 3); broker.afterPropertiesSet();
try (var admin = AdminClient.create(Map.of("bootstrap.servers", broker.getBrokersAsString()))) {
    admin.createTopics(List.of(TopicBuilder.name("orders").partitions(3).replicas(1).config("retention.ms", "604800000").build())).all().get();
    var d = admin.describeTopics(List.of("orders")).allTopicNames().get().get("orders");
    d.partitions().forEach(p -> System.out.println("partition " + p.partition() + " leader=broker " + p.leader().id() + " replicas=" + p.replicas().size()));
}
for (String key : List.of("asha", "meera", "priya", "asha"))
    System.out.println(key + " -> partition " + org.apache.kafka.common.utils.Utils.toPositive(org.apache.kafka.common.utils.Utils.murmur2(key.getBytes())) % 3);
broker.destroy();`,
      analogy: "A topic is a multi-lane highway: each lane (partition) keeps its cars in order, the number plate (key) decides the lane, and the lanes let more cars travel at once." },
    { title: "Producing with KafkaTemplate",
      text: "Add `spring-kafka`, set `spring.kafka.bootstrap-servers`, and Boot gives you a **`KafkaTemplate`**. `send(topic, key, value)` is **asynchronous**: it returns a `CompletableFuture<SendResult>` that completes when the broker acknowledges, with the partition and offset. Don't fire and forget: handle failures in `whenComplete` (or `get()` with a timeout when you must know before replying). Choose the **key** carefully (order id, customer id): it decides ordering and spreads load; a `null` key spreads records across partitions with no ordering. Serializers turn keys and values into bytes (`StringSerializer` by default; JSON in the next slides).",
      code: `@SpringBootApplication class App {
    @Bean NewTopic orders() { return TopicBuilder.name("orders").partitions(3).build(); }
}
var broker = new EmbeddedKafkaKraftBroker(1, 3); broker.afterPropertiesSet();
var ctx = new SpringApplicationBuilder(App.class).properties("spring.kafka.bootstrap-servers=" + broker.getBrokersAsString()).run();
KafkaTemplate<String, String> kafka = ctx.getBean(KafkaTemplate.class);
for (String[] o : new String[][] {{"asha", "dosa"}, {"meera", "idli"}, {"asha", "vada"}}) {
    kafka.send("orders", o[0], o[1]).whenComplete((res, ex) -> {
        if (ex != null) System.out.println("FAILED " + ex);
        else System.out.println(o[0] + "/" + o[1] + " -> partition " + res.getRecordMetadata().partition() + ", offset " + res.getRecordMetadata().offset());
    }).get();
}
ctx.close(); broker.destroy();`,
      analogy: "Posting a registered letter: you hand it over and carry on, and the acknowledgement slip (the future) arrives later saying which sorting office took it." },
    { title: "Consuming with @KafkaListener and consumer groups",
      text: "Annotate a bean method with **`@KafkaListener(topics = \"orders\", groupId = \"billing\")`**; Spring runs a listener container that polls the broker and calls your method per record (or per batch). Consumers with the same **groupId** share the partitions, each partition going to exactly one consumer in the group; different groups each get **all** records. `concurrency = \"3\"` starts three consumers in this app; more consumers than partitions sit idle, so partitions cap parallelism. When consumers join or leave, the group **rebalances** partitions. The widget shows `billing` with one consumer per partition and `analytics` reading everything.",
      code: `@Component class Billing {
    final List<String> seen = Collections.synchronizedList(new ArrayList<>());
    @KafkaListener(topics = "orders", groupId = "billing", concurrency = "2")
    void onOrder(ConsumerRecord<String, String> r) { seen.add("billing p" + r.partition() + " " + r.value()); }
    @KafkaListener(topics = "orders", groupId = "analytics")
    void analytics(String value) { seen.add("analytics " + value); }
    public List<String> seen() { return seen; }
}
@SpringBootApplication class App { @Bean NewTopic orders() { return TopicBuilder.name("orders").partitions(2).build(); } }
var broker = new EmbeddedKafkaKraftBroker(1, 2); broker.afterPropertiesSet();
var ctx = new SpringApplicationBuilder(App.class).properties("spring.kafka.bootstrap-servers=" + broker.getBrokersAsString(), "spring.kafka.consumer.auto-offset-reset=earliest").run();
KafkaTemplate<String, String> kafka = ctx.getBean(KafkaTemplate.class);
for (String k : List.of("asha", "arjun", "meera", "cust-7")) kafka.send("orders", k, k + "-order").get();
Thread.sleep(4000);
var seen = new ArrayList<>(ctx.getBean(Billing.class).seen()); Collections.sort(seen);
seen.forEach(System.out::println);
ctx.close(); broker.destroy();`,
      analogy: "Two teams each get a full copy of the post (two groups); within a team the letters are split by postcode so no two people handle the same street (partitions)." },
    { title: "Serialization: JSON, types and poison pills",
      text: "Messages are bytes; both sides must agree on the format. Spring Kafka's **`JsonSerializer`/`JsonDeserializer`** map objects to JSON, adding a `__TypeId__` header by default; consumers must list **trusted packages** (or set a default type) before deserializing. A record that can't be deserialized is a **poison pill**: without protection the consumer fails on it forever. Wrap the deserializer in **`ErrorHandlingDeserializer`** so the failure reaches the error handler and the record can go to a dead-letter topic. For many teams and long-lived topics, use a **schema registry** with Avro or Protobuf so producers and consumers evolve compatibly.",
      code: `record OrderPlaced(String orderId, String customer, int amount) { }
var ser = new org.springframework.kafka.support.serializer.JsonSerializer<OrderPlaced>();
var headers = new org.apache.kafka.common.header.internals.RecordHeaders();
byte[] bytes = ser.serialize("orders", headers, new OrderPlaced("o-1", "asha", 240));
System.out.println("wire: " + new String(bytes) + "  header __TypeId__=" + new String(headers.lastHeader("__TypeId__").value()));
var de = new org.springframework.kafka.support.serializer.JsonDeserializer<>(OrderPlaced.class, false);
System.out.println("read: " + de.deserialize("orders", bytes));
var safe = new org.springframework.kafka.support.serializer.ErrorHandlingDeserializer<>(de);
var h2 = new org.apache.kafka.common.header.internals.RecordHeaders();
Object bad = safe.deserialize("orders", h2, "{not json".getBytes());
System.out.println("poison pill -> value " + bad + ", error header present: " + (h2.lastHeader("springDeserializerExceptionValue") != null));`,
      analogy: "Parcels between countries need a customs form both sides understand; a parcel with an unreadable form is set aside for inspection rather than blocking the whole conveyor belt." },
    { title: "Offsets, commits and delivery semantics",
      text: "A consumer group **commits** the offset of the next record to read; after a restart or rebalance, consumption resumes there. **When** you commit decides the guarantee. Commit **before** processing: a crash loses the message (**at-most-once**). Commit **after** processing (Spring's default, `AckMode.BATCH`): a crash re-delivers it (**at-least-once**, the practical default, so consumers must be **idempotent**). **Exactly-once** exists inside Kafka (idempotent producer plus transactions, read-process-write between topics) but not for side effects such as calling a bank. `AckMode.MANUAL` lets you acknowledge only after your own work succeeds.",
      table: [["Semantics", "How", "Risk"],
        ["At-most-once", "commit, then process", "lost messages"],
        ["At-least-once", "process, then commit (default)", "duplicates → idempotent consumers"],
        ["Exactly-once (Kafka→Kafka)", "transactions + read_committed", "complexity; not for external side effects"]],
      code: `@Component class Mailer {
    final List<String> log = Collections.synchronizedList(new ArrayList<>());
    @KafkaListener(id = "mailer", topics = "mails", groupId = "mailer", properties = "enable.auto.commit=false")
    void on(String v, Acknowledgment ack) { log.add(v); if (!v.contains("fail")) ack.acknowledge(); }
    public List<String> log() { return log; }
}
@SpringBootApplication class App { }
var broker = new EmbeddedKafkaKraftBroker(1, 1, "mails"); broker.afterPropertiesSet();
var ctx = new SpringApplicationBuilder(App.class).properties("spring.kafka.bootstrap-servers=" + broker.getBrokersAsString(), "spring.kafka.consumer.auto-offset-reset=earliest", "spring.kafka.listener.ack-mode=manual").run();
KafkaTemplate<String, String> kafka = ctx.getBean(KafkaTemplate.class);
for (String m : List.of("welcome", "invoice", "receipt-fail")) kafka.send("mails", m).get();
Thread.sleep(3000);
System.out.println("first run read: " + ctx.getBean(Mailer.class).log());
var reg = ctx.getBean(KafkaListenerEndpointRegistry.class);
reg.getListenerContainer("mailer").stop(); ctx.getBean(Mailer.class).log().clear(); reg.getListenerContainer("mailer").start();
Thread.sleep(3000);
System.out.println("after restart read again: " + ctx.getBean(Mailer.class).log() + "  (unacknowledged record redelivered)");
ctx.close(); broker.destroy();`,
      analogy: "Ticking a task off before doing it means it may never get done; ticking it off after means that if you're interrupted you may do it twice." },
    { title: "Idempotent producers and consumers",
      text: "Duplicates come from both ends. **Producer** retries after a lost acknowledgement could write a record twice; since Kafka 3.0 producers default to **`enable.idempotence=true`** and **`acks=all`**, so the broker de-duplicates retries per partition using a producer id and sequence numbers. **Consumers** still see redeliveries (crash before commit, rebalance), so make processing idempotent: carry a unique **event id** and record processed ids (a table with a unique constraint, written in the **same database transaction** as the effect), or make the operation naturally idempotent (`UPDATE … SET status = 'PAID'`, upserts). The widget's *Duplicate delivery* tab shows the consumer side.",
      code: `var cfg = new org.apache.kafka.clients.producer.ProducerConfig(Map.of("bootstrap.servers", "localhost:9092",
    "key.serializer", org.apache.kafka.common.serialization.StringSerializer.class, "value.serializer", org.apache.kafka.common.serialization.StringSerializer.class));
System.out.println("producer defaults: acks=" + cfg.getString("acks") + ", enable.idempotence=" + cfg.getBoolean("enable.idempotence") + ", retries=" + cfg.getInt("retries") + ", max.in.flight=" + cfg.getInt("max.in.flight.requests.per.connection"));
Set<String> processed = new HashSet<>();      // in production: a DB table with a unique key
int charged = 0;
for (String evt : List.of("pay:o-1", "pay:o-2", "pay:o-1")) {
    if (!processed.add(evt)) { System.out.println(evt + " duplicate, skipped"); continue; }
    charged++; System.out.println(evt + " charged");
}
System.out.println("charges made: " + charged);`,
      analogy: "A cashier who stamps every bill 'PAID' with its number: if the same bill comes round again, the stamp says not to charge twice." },
    { title: "Error handling: retries and dead-letter topics",
      text: "When a listener throws, Spring's **`DefaultErrorHandler`** retries the record in place with a **back-off** (default 9 retries, no delay), then hands it to a **recoverer**. The usual recoverer is **`DeadLetterPublishingRecoverer`**, which publishes the record to `<topic>-dlt` with headers (exception, stack trace, original topic, partition, offset), then commits and moves on. Mark exceptions that won't succeed on retry (validation, deserialization) as **not retryable**. In-place retries **block the partition**: in the widget the healthy order o-4 waited ~1.8 s behind o-2's retries. Someone must monitor and replay the DLT.",
      m: M(["flowchart LR",
        "  T[\"payments\"]:::s1 --> L[\"listener\"]:::s2",
        "  L -->|ok| C[\"commit\"]:::s4",
        "  L -->|exception| R{\"retryable &<br/>attempts left?\"}:::s2",
        "  R -->|yes, after back-off| L",
        "  R -->|no| D[\"payments-dlt<br/>+ error headers\"]:::s3",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#fff3e0,stroke:#ef6c00", "  classDef s3 fill:#ffebee,stroke:#c62828", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `@Component class Payments {
    final List<String> log = Collections.synchronizedList(new ArrayList<>());
    @KafkaListener(topics = "pay", groupId = "pay") void pay(String v) { log.add("try " + v); if (v.startsWith("bad")) throw new IllegalStateException("bank 503"); }
    @KafkaListener(topics = "pay-dlt", groupId = "dlt") void dlt(ConsumerRecord<String, String> r) { log.add("DLT " + r.value() + " (" + new String(r.headers().lastHeader(KafkaHeaders.DLT_EXCEPTION_MESSAGE).value()).replaceAll(".*; ", "") + ")"); }
    public List<String> log() { return log; }
}
@SpringBootApplication class App {
    @Bean DefaultErrorHandler errors(KafkaTemplate<Object, Object> t) { return new DefaultErrorHandler(new DeadLetterPublishingRecoverer(t), new FixedBackOff(200, 2)); }
}
var broker = new EmbeddedKafkaKraftBroker(1, 1, "pay", "pay-dlt"); broker.afterPropertiesSet();
var ctx = new SpringApplicationBuilder(App.class).properties("spring.kafka.bootstrap-servers=" + broker.getBrokersAsString(), "spring.kafka.consumer.auto-offset-reset=earliest").run();
KafkaTemplate<String, String> kafka = ctx.getBean(KafkaTemplate.class);
for (String v : List.of("ok-1", "bad-2", "ok-3")) kafka.send("pay", v).get();
Thread.sleep(5000);
ctx.getBean(Payments.class).log().forEach(System.out::println);
ctx.close(); broker.destroy();`,
      analogy: "A postman tries a stubborn door three times, then leaves the parcel at the depot with a note saying why, and carries on with the round." },
    { title: "Non-blocking retries with @RetryableTopic",
      text: "To avoid blocking a partition, **`@RetryableTopic`** moves a failing record to **retry topics** (`orders-retry-0`, `orders-retry-1`, …) with increasing delays, consumed by separate listeners, and finally to the **DLT** handled by a `@DltHandler` method. The main topic keeps flowing, at the cost of **losing ordering** for retried records and extra topics. Use it when one slow dependency shouldn't stall everything and per-key order doesn't matter; keep blocking retries when order matters (e.g. account balance updates).",
      code: `@Component class Notify {
    final List<String> log = Collections.synchronizedList(new ArrayList<>());
    @RetryableTopic(attempts = "3", backoff = @Backoff(delay = 200, multiplier = 2.0))
    @KafkaListener(topics = "sms", groupId = "sms")
    void send(String v, @org.springframework.messaging.handler.annotation.Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        log.add(topic + ": " + v);
        if (v.startsWith("bad")) throw new IllegalStateException("gateway down");
    }
    @DltHandler void dlt(String v, @org.springframework.messaging.handler.annotation.Header(KafkaHeaders.RECEIVED_TOPIC) String topic) { log.add(topic + ": " + v + " (gave up)"); }
    public List<String> log() { return log; }
}
@SpringBootApplication class App { }
var broker = new EmbeddedKafkaKraftBroker(1, 1); broker.afterPropertiesSet();
var ctx = new SpringApplicationBuilder(App.class).properties("spring.kafka.bootstrap-servers=" + broker.getBrokersAsString(), "spring.kafka.consumer.auto-offset-reset=earliest").run();
Thread.sleep(2000);
KafkaTemplate<String, String> kafka = ctx.getBean(KafkaTemplate.class);
for (String v : List.of("bad-1", "ok-2", "ok-3")) kafka.send("sms", v).get();
Thread.sleep(8000);
ctx.getBean(Notify.class).log().forEach(System.out::println);
ctx.close(); broker.destroy();`,
      analogy: "Instead of the whole queue waiting while one customer sorts out a card problem, they are sent to a side counter and called back later." },
    { title: "The transactional outbox pattern",
      text: "A classic bug: save the order in the database, then `kafkaTemplate.send(...)`. If the app crashes between the two, or the send fails, the database and the event stream **disagree** (a **dual write**). The **outbox pattern** fixes it: in the **same database transaction** as the business change, insert the event into an `outbox` table. A separate relay (a scheduled poller, or **change data capture** with Debezium reading the database log) publishes outbox rows to Kafka and marks them sent. Delivery becomes at-least-once, so consumers stay idempotent. Kafka transactions alone can't fix this, because they don't include your database.",
      m: M(["sequenceDiagram",
        "  participant S as OrderService",
        "  participant DB as Database",
        "  participant R as Outbox relay",
        "  participant K as Kafka",
        "  S->>DB: BEGIN, INSERT order, INSERT outbox row, COMMIT",
        "  R->>DB: SELECT unsent outbox rows",
        "  R->>K: publish OrderPlaced",
        "  K-->>R: ack",
        "  R->>DB: mark sent"]),
      code: `@SpringBootApplication class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var jdbc = ctx.getBean(JdbcTemplate.class); var tx = new TransactionTemplate(ctx.getBean(PlatformTransactionManager.class));
jdbc.execute("CREATE TABLE orders(id VARCHAR(10) PRIMARY KEY, amount INT)");
jdbc.execute("CREATE TABLE outbox(id IDENTITY, event VARCHAR(200), sent BOOLEAN DEFAULT FALSE)");
tx.executeWithoutResult(s -> { jdbc.update("INSERT INTO orders VALUES ('o-1', 240)"); jdbc.update("INSERT INTO outbox(event) VALUES ('OrderPlaced o-1 240')"); });
try { tx.executeWithoutResult(s -> { jdbc.update("INSERT INTO orders VALUES ('o-2', 99)"); jdbc.update("INSERT INTO outbox(event) VALUES ('OrderPlaced o-2 99')"); throw new IllegalStateException("crash before commit"); }); }
catch (IllegalStateException e) { System.out.println("tx 2 rolled back: " + e.getMessage()); }
List<String> published = new ArrayList<>();      // stands in for kafkaTemplate.send(...).get()
for (var row : jdbc.queryForList("SELECT id, event FROM outbox WHERE sent = FALSE ORDER BY id")) {
    published.add((String) row.get("EVENT")); jdbc.update("UPDATE outbox SET sent = TRUE WHERE id = ?", row.get("ID"));
}
System.out.println("orders: " + jdbc.queryForList("SELECT id FROM orders", String.class) + ", published: " + published);
ctx.close();`,
      analogy: "Instead of promising to phone the customer after saving the order (and forgetting when interrupted), you write the call on the same order slip; a clerk works through the slips and ticks off each call made." },
    { title: "Testing Kafka code",
      text: "Test listeners and producers against a **real broker**, not mocks of `KafkaTemplate`: serialization, headers, error handlers and group behaviour only show up for real. **`@EmbeddedKafka`** (spring-kafka-test) starts an in-process KRaft broker in milliseconds and sets `spring.kafka.bootstrap-servers` for `@SpringBootTest`. **Testcontainers** runs the real Kafka image (`@ServiceConnection` wires Boot automatically), closer to production but needs Docker. Assert asynchronously: wait for the effect with a timeout (Awaitility, `KafkaTestUtils.getSingleRecord`, or a latch) instead of `Thread.sleep`.",
      code: `@Component class Greeter {
    final java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(1); volatile String last;
    @KafkaListener(topics = "greetings", groupId = "g") void on(String v) { last = v.toUpperCase(); latch.countDown(); }
    public boolean await() throws InterruptedException { return latch.await(10, java.util.concurrent.TimeUnit.SECONDS); }
    public String last() { return last; }
}
@SpringBootApplication class App { }
@SpringBootTest(classes = App.class, properties = "spring.kafka.consumer.auto-offset-reset=earliest")
@EmbeddedKafka(kraft = true, partitions = 1, topics = "greetings", bootstrapServersProperty = "spring.kafka.bootstrap-servers")
class GreeterTest {
    @Autowired KafkaTemplate<String, String> kafka; @Autowired Greeter greeter;
    @Test void consumesAndTransforms() throws Exception {
        kafka.send("greetings", "namaste").get();
        assertThat(greeter.await()).isTrue();
        assertThat(greeter.last()).isEqualTo("NAMASTE");
    }
}
var summary = new SummaryGeneratingListener();
LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(GreeterTest.class)).build(), summary);
System.out.println(summary.getSummary().getTestsSucceededCount() + " passed, " + summary.getSummary().getTestsFailedCount() + " failed");
summary.getSummary().getFailures().forEach(f -> System.out.println(f.getException()));
System.exit(0);   // the cached test context (and its broker) would otherwise keep the JVM alive`,
      analogy: "A flight simulator with the real cockpit controls: much closer to flying than reading the manual, and much cheaper than a real plane." }
  ];

  H.registerLesson({
    code: "S13",
    summary: "Event-driven integration with Kafka and Spring: why messaging, topics, partitions, keys, offsets and replication, producing with `KafkaTemplate`, consuming with `@KafkaListener` and consumer groups, JSON serialization and poison pills, commits and delivery semantics, idempotent producers and consumers, blocking retries with dead-letter topics and non-blocking `@RetryableTopic`, the transactional outbox pattern, and testing with embedded Kafka.",
    slides: SLIDES,
    widget: { heading: "Interactive: a real Kafka cluster at work", caption: "Recorded from a real Kafka 3.8 broker and a Spring Boot 3.4 app: where keyed records landed, which consumer in each group read them, consumer lag after stopping a listener, retries and dead-lettering, and an idempotent consumer handling duplicates.", render: s13Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Order pipeline", "order-service publishes `OrderPlaced` keyed by order id; billing, inventory, notifications and analytics each consume it in their own group."],
      ["Payment events", "Payment updates are keyed by payment id so `AUTHORIZED` is always processed before `CAPTURED`; consumers are idempotent on event id."],
      ["Activity tracking", "Clickstream events go to a 48-partition topic consumed by real-time dashboards and a data-lake sink."],
      ["Lag incident", "A consumer's downstream API slows down; lag on `orders` climbs to 2 million and alerts fire before customers notice missing emails."],
      ["Poison pill", "A producer deploys a new JSON field type; consumers without `ErrorHandlingDeserializer` crash-loop on the same record until someone skips the offset."],
      ["Dual-write bug", "Orders saved but `OrderPlaced` never sent after a crash; the team introduces an outbox table with Debezium."]
    ],
    pitfalls: [
      "Using no key (or a random key) when per-entity order matters",
      "More consumers than partitions, expecting more throughput",
      "Non-idempotent consumers under at-least-once delivery",
      "Fire-and-forget sends with no failure handling",
      "Infinite in-place retries blocking a partition",
      "No ErrorHandlingDeserializer: poison pills stall consumers",
      "Saving to the database and sending to Kafka as two separate writes",
      "Nobody monitoring consumer lag or the dead-letter topic"
    ],
    quiz: [
      { q: "In the widget, why did all of asha's orders land in partition 0?", options: ["Round robin", "The key's hash decides the partition", "Partition 0 is the default", "Alphabetical order"], answer: 1, why: "murmur2(key) mod 3." },
      { q: "Where does Kafka guarantee ordering?", options: ["Across the topic", "Within a partition", "Across consumer groups", "Nowhere"], answer: 1, why: "Same key → same partition → ordered." },
      { q: "Groups billing (3 consumers) and analytics (1) read a 3-partition topic. Who gets each record?", options: ["One consumer overall", "One consumer in each group", "All four consumers", "Only billing"], answer: 1, why: "Groups are independent; within a group a partition has one owner." },
      { q: "A topic has 3 partitions and a group has 5 consumers. How many are active?", options: ["5", "3", "1", "0"], answer: 1, why: "Extra consumers sit idle." },
      { q: "What is consumer lag?", options: ["Network latency", "Log end offset minus the group's committed offset", "Time since last deploy", "Number of partitions"], answer: 1, why: "Recorded: committed 3, end 7 → lag 4." },
      { q: "Spring Kafka's default commit behaviour gives…", options: ["At-most-once", "At-least-once", "Exactly-once for everything", "No guarantees"], answer: 1, why: "Offsets are committed after the listener returns." },
      { q: "In the widget, why did o-3 go to the DLT after a single attempt?", options: ["Bad luck", "IllegalArgumentException was marked not retryable", "The DLT was full", "Back-off was 0"], answer: 1, why: "addNotRetryableExceptions(IllegalArgumentException.class)." },
      { q: "Main drawback of in-place (blocking) retries?", options: ["Lose messages", "Later records in the partition wait", "Need extra topics", "Break serialization"], answer: 1, why: "o-4 waited behind o-2's retries." },
      { q: "What problem does the transactional outbox solve?", options: ["Slow consumers", "Dual writes: DB change and event publish getting out of sync", "Partition skew", "Serialization"], answer: 1, why: "The event is written in the same DB transaction." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Code / config"],
        ["Connect", "`spring.kafka.bootstrap-servers=broker:9092`"],
        ["Create topic", "`@Bean NewTopic t() { return TopicBuilder.name(\"orders\").partitions(6).replicas(3).build(); }`"],
        ["Send", "`kafkaTemplate.send(\"orders\", key, value).whenComplete(...)`"],
        ["Listen", "`@KafkaListener(topics = \"orders\", groupId = \"billing\", concurrency = \"3\")`"],
        ["Start position", "`spring.kafka.consumer.auto-offset-reset=earliest`"],
        ["JSON", "`JsonSerializer` / `JsonDeserializer` + `spring.json.trusted.packages`"],
        ["Poison pills", "`ErrorHandlingDeserializer`"],
        ["Retry + DLT", "`new DefaultErrorHandler(new DeadLetterPublishingRecoverer(t), new FixedBackOff(1000, 3))`"],
        ["Non-blocking retry", "`@RetryableTopic(attempts = \"4\")` + `@DltHandler`"],
        ["Manual ack", "`spring.kafka.listener.ack-mode=manual` + `Acknowledgment`"],
        ["Test", "`@EmbeddedKafka` or Testcontainers `KafkaContainer`"]],
      cards: [
        { title: "Concepts", items: ["Topic → partitions", "Key → partition → order", "Offsets per group", "Retention, not delete-on-read", "Replication + acks"] },
        { title: "Reliability", items: ["At-least-once default", "Idempotent consumers", "DLT + monitoring", "Outbox for dual writes"] },
        { title: "Say in interviews", items: ["Partitions cap parallelism", "Rebalancing", "Lag as health metric", "Blocking vs non-blocking retries", "Exactly-once limits"] }]
    },
    practice: [
      { level: "Easy", q: "Explain topic, partition, offset and consumer group.",
        a: ["Topic: named stream of records.",
          "Partition: ordered append-only log; unit of parallelism and ordering.",
          "Offset: position of a record within a partition.",
          "Consumer group: consumers sharing work; each partition is read by one member; each group gets all records."] },
      { level: "Easy", q: "Show that the same key always maps to the same partition.",
        a: ["Kafka's default partitioner uses murmur2(key) mod partitions.", "Compute it for a few keys."],
        code: `for (String key : List.of("order-17", "order-42", "order-17", "order-99", "order-42"))
    System.out.println(key + " -> " + org.apache.kafka.common.utils.Utils.toPositive(org.apache.kafka.common.utils.Utils.murmur2(key.getBytes())) % 6);` },
      { level: "Easy", q: "Kafka vs a traditional message queue (RabbitMQ)?",
        a: ["Kafka: durable partitioned log, consumers track offsets, replay possible, very high throughput, ordering per partition.",
          "RabbitMQ: broker routes and deletes messages after ack, flexible routing, per-message acks, priority queues.",
          "Kafka for event streams and replay; queues for task distribution and complex routing."] },
      { level: "Medium", q: "How do you choose the number of partitions?",
        a: ["Target throughput / per-consumer throughput gives a minimum; partitions cap consumer parallelism.",
          "Leave headroom: increasing partitions later changes key → partition mapping (breaks ordering for existing keys).",
          "Too many partitions cost broker memory, file handles and rebalance time.",
          "Watch skew from hot keys."] },
      { level: "Medium", q: "How does Spring Kafka handle a listener exception by default, and how would you change it?",
        a: ["DefaultErrorHandler retries in place (up to 9 retries with no delay by default), then logs and skips.",
          "Configure back-off (FixedBackOff / ExponentialBackOff), not-retryable exceptions, and a DeadLetterPublishingRecoverer.",
          "Or use @RetryableTopic for non-blocking retries."] },
      { level: "Medium", q: "Make a consumer idempotent with a processed-events table.",
        a: ["Insert the event id into a table with a primary key in the same transaction as the effect.",
          "A duplicate insert fails, so skip the event."],
        code: `@SpringBootApplication class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var jdbc = ctx.getBean(JdbcTemplate.class); var tx = new TransactionTemplate(ctx.getBean(PlatformTransactionManager.class));
jdbc.execute("CREATE TABLE processed(event_id VARCHAR(20) PRIMARY KEY)"); jdbc.execute("CREATE TABLE wallet(id INT PRIMARY KEY, balance INT)"); jdbc.update("INSERT INTO wallet VALUES (1, 0)");
for (String evt : List.of("e1:100", "e2:50", "e1:100")) {
    String id = evt.split(":")[0]; int amt = Integer.parseInt(evt.split(":")[1]);
    try { tx.executeWithoutResult(s -> { jdbc.update("INSERT INTO processed VALUES (?)", id); jdbc.update("UPDATE wallet SET balance = balance + ? WHERE id = 1", amt); }); System.out.println(id + " applied"); }
    catch (org.springframework.dao.DuplicateKeyException e) { System.out.println(id + " duplicate, skipped"); }
}
System.out.println("balance = " + jdbc.queryForObject("SELECT balance FROM wallet", Integer.class));
ctx.close();` },
      { level: "Medium", q: "What happens during a consumer group rebalance and how do you reduce its impact?",
        a: ["When members join/leave or time out, partitions are reassigned; consumption pauses for affected partitions.",
          "Uncommitted work may be redelivered to the new owner.",
          "Use cooperative-sticky assignment, static membership (group.instance.id), keep processing under max.poll.interval.ms, and commit regularly."] },
      { level: "Hard", q: "Design reliable publishing of OrderPlaced from an order service backed by Postgres.",
        a: ["Transactional outbox: insert order and outbox row in one DB transaction.",
          "Relay via Debezium CDC (or a poller with SKIP LOCKED) publishes to Kafka with key = orderId, acks=all, idempotent producer.",
          "Consumers idempotent on event id; DLT and lag monitoring; outbox cleanup job."] },
      { level: "Hard", q: "Explain exactly-once in Kafka and its limits.",
        a: ["Idempotent producer removes duplicates from producer retries.",
          "Transactions let a read-process-write cycle atomically write output records and consumer offsets; consumers use isolation.level=read_committed.",
          "Doesn't cover external side effects (DB writes, HTTP calls): those still need idempotency or the outbox."] },
      { level: "Hard", q: "Consume a batch and see partition and offset metadata, using an embedded broker.",
        a: ["Enable batch listening with `batch = \"true\"` and take `List<ConsumerRecord>`.",
          "Print the partitions and offsets in each batch."],
        code: `@Component class Batch {
    final List<String> log = Collections.synchronizedList(new ArrayList<>());
    @KafkaListener(topics = "clicks", groupId = "b", batch = "true") void on(List<ConsumerRecord<String, String>> recs) { log.add("batch of " + recs.size() + ": " + recs.stream().map(r -> "p" + r.partition() + "@" + r.offset()).toList()); }
    public List<String> log() { return log; }
}
@SpringBootApplication class App { }
var broker = new EmbeddedKafkaKraftBroker(1, 1, "clicks"); broker.afterPropertiesSet();
KafkaTemplate<String, String> kafka = new KafkaTemplate<>(new org.springframework.kafka.core.DefaultKafkaProducerFactory<>(Map.of("bootstrap.servers", broker.getBrokersAsString(),
    "key.serializer", org.apache.kafka.common.serialization.StringSerializer.class, "value.serializer", org.apache.kafka.common.serialization.StringSerializer.class)));
for (int i = 0; i < 6; i++) kafka.send("clicks", "c" + i).get();
var ctx = new SpringApplicationBuilder(App.class).properties("spring.kafka.bootstrap-servers=" + broker.getBrokersAsString(), "spring.kafka.consumer.auto-offset-reset=earliest").run();
Thread.sleep(3000);
ctx.getBean(Batch.class).log().forEach(System.out::println);
ctx.close(); broker.destroy();` }
    ],
    recap: [
      "Kafka is a partitioned, replicated, durable log; consumers track offsets and can replay.",
      "Keys choose partitions and give per-key order; partitions cap a group's parallelism.",
      "Delivery is at-least-once in practice, so make consumers idempotent.",
      "Use error handlers with back-off and dead-letter topics; @RetryableTopic avoids blocking.",
      "Avoid dual writes with the outbox; test against an embedded or containerised broker."
    ]
  });
})();
