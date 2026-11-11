/* Lesson F30: Producer–consumer */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var CAP = 4;
  function bufferWidget(el, ctx) {
    var s = ctx.state; if (!s.buf) { s.buf = []; s.n = 1; s.pw = 0; s.cw = 0; s.log = []; s.done = 0; s.stopped = 0; s.pending = []; }
    el.innerHTML = "<p>" + ctx.md("An `ArrayBlockingQueue` of capacity **4** between order producers (checkout threads) and two kitchen consumer threads. `put()` **blocks** when the queue is full; `take()` **blocks** when it is empty. Blocked threads are woken when the other side makes room or adds work.") + "</p>" +
      "<div class='btnrow'><button type='button' class='btn primary' data-a='put'>producer: put(order)</button><button type='button' class='btn primary' data-a='take'>consumer: take()</button>" +
      "<button type='button' class='btn' data-a='offer'>producer: offer(order, 100 ms)</button><button type='button' class='btn' data-a='pill'>put(POISON_PILL)</button><button type='button' class='btn' data-a='reset'>reset</button></div>" +
      "<div class='diagram' data-r='dg'></div><pre class='code' data-r='log'></pre><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function add(item) {                                     // a waiting consumer takes it immediately
      if (s.cw > 0) { s.cw--; s.log.push("  ↳ woke a waiting consumer, which takes " + item + " at once"); if (item === "PILL") { s.stopped++; s.log.push("  ↳ consumer got POISON_PILL → exits its loop"); } else s.done++; return; }
      s.buf.push(item);
    }
    function act(a) {
      if (a === "reset") { s.buf = []; s.n = 1; s.pw = 0; s.cw = 0; s.log = []; s.done = 0; s.stopped = 0; s.pending = []; return; }
      if (a === "put" || a === "offer" || a === "pill") {
        var item = a === "pill" ? "PILL" : "O" + s.n;
        if (s.buf.length < CAP) { if (a !== "pill") s.n++; s.log.push((a === "offer" ? "offer(" : "put(") + item + ") → " + (s.cw ? "handed over" : "queued")); add(item); }
        else if (a === "offer") { s.log.push("offer(O" + s.n + ", 100 ms) → queue full, timed out → returns false: caller sheds load (\"kitchen busy, try later\")"); s.n++; }
        else { s.pw++; if (a !== "pill") s.n++; s.log.push("put(" + item + ") → queue FULL → producer thread BLOCKS (back-pressure)"); s.pending = (s.pending || []).concat([item]); }
      } else if (a === "take") {
        if (s.stopped >= 2) { s.log.push("take() → both consumers already exited"); return; }
        if (!s.buf.length) { s.cw++; s.log.push("take() → queue EMPTY → consumer thread BLOCKS (no busy-waiting)"); return; }
        var it = s.buf.shift();
        if (it === "PILL") { s.stopped++; s.log.push("take() → POISON_PILL → this consumer exits its loop"); }
        else { s.done++; s.log.push("take() → " + it + " → cooking"); }
        if (s.pw > 0) { s.pw--; var p = s.pending.shift(); s.buf.push(p); s.log.push("  ↳ room freed: blocked producer wakes and enqueues " + p); }
      }
      if (s.log.length > 8) s.log = s.log.slice(-8);
    }
    function draw() {
      var L = ["flowchart LR", "  P([\"producers" + (s.pw ? "<br/><b>" + s.pw + " BLOCKED in put()</b>" : "") + "\"]):::" + (s.pw ? "bad" : "s0"), "  subgraph Q[\"ArrayBlockingQueue " + s.buf.length + "/" + CAP + "\"]", "    direction LR"];
      for (var i = 0; i < CAP; i++) L.push("    b" + i + "[\"" + (s.buf[i] ? (s.buf[i] === "PILL" ? "☠ PILL" : s.buf[i]) : "·") + "\"]:::" + (s.buf[i] ? (s.buf[i] === "PILL" ? "bad" : "s1") : "s4"));
      L.push("  end", "  C([\"consumers (2)" + (s.cw ? "<br/><b>" + s.cw + " BLOCKED in take()</b>" : "") + (s.stopped ? "<br/>" + s.stopped + " exited" : "") + "\"]):::" + (s.cw ? "s2" : "s0"), "  P -->|put| Q", "  Q -->|take| C");
      L.push("  classDef s0 fill:#dbeafe,stroke:#2563eb", "  classDef s1 fill:#fff3e0,stroke:#ef6c00", "  classDef s2 fill:#ede9fe,stroke:#7c3aed", "  classDef s4 fill:#f8fafc,stroke:#cbd5e1,color:#94a3b8", "  classDef bad fill:#ffebee,stroke:#c62828");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("log").textContent = s.log.join("\n") || "Try: put five orders, then take one.";
      var res = q("res");
      res.className = "result " + (s.pw ? "warn" : s.stopped >= 2 ? "ok" : "");
      res.innerHTML = "<p>" + ctx.md("Cooked " + s.done + " order(s). " + (s.pw ? "Producers are blocked: the bounded queue is pushing back on checkout instead of letting memory grow without limit." : s.stopped >= 2 ? "Both consumers received a poison pill and stopped cleanly: one pill per consumer." : "Shutdown: put **one poison pill per consumer** after the last real order; each consumer exits when it takes one.")) + "</p>";
    }
    el.querySelector(".btnrow").addEventListener("click", function (e) { var b = e.target.closest("button[data-a]"); if (!b) return; act(b.getAttribute("data-a")); ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "The producer–consumer problem",
      text: "Producers create work (orders, log lines, events, video chunks); consumers process it. Putting a **bounded buffer** between them decouples their speeds and lifecycles: producers don't wait for slow processing, consumers don't poll, and the bound turns overload into **back-pressure** instead of an out-of-memory crash. The coordination rules: producers wait when the buffer is full, consumers wait when it is empty, and neither busy-waits.",
      m: M(["flowchart LR",
        "  P1([\"checkout thread\"]):::s0 --> Q", "  P2([\"checkout thread\"]):::s0 --> Q", "  P3([\"admin import\"]):::s0 --> Q",
        "  Q[(\"bounded queue<br/>capacity N\")]:::s1",
        "  Q --> C1([\"kitchen worker\"]):::s2", "  Q --> C2([\"kitchen worker\"]):::s2"]),
      points: [
        "**Full** → producers block, time out or are rejected (back-pressure)",
        "**Empty** → consumers block (sleeping, not spinning)",
        "Shutdown must drain or hand back remaining work and stop consumers cleanly",
        "Same shape at every scale: a `BlockingQueue` in a JVM, Kafka/SQS between services"],
      analogy: "A restaurant's order rail. Waiters (producers) clip tickets onto a rail with room for 12; cooks (consumers) pull the oldest ticket. If the rail is full, waiters stop taking new orders for a moment; if it's empty, cooks wait rather than pacing around asking every few seconds." },
    { title: "From scratch: a bounded buffer with wait() / notifyAll()",
      text: "The classic interview implementation uses an object's monitor. `wait()` releases the lock and sleeps until notified; on waking it re-acquires the lock. Two rules matter: **wait in a `while` loop** (spurious wake-ups, and another thread may have consumed the condition first) and use **`notifyAll()`** (producers and consumers wait on the same monitor, so `notify()` might wake the wrong kind of thread and stall everyone).",
      code: `class BoundedBuffer<T> {
    private final Object[] items; private int head, tail, count;
    BoundedBuffer(int capacity) { items = new Object[capacity]; }
    synchronized void put(T x) throws InterruptedException {
        while (count == items.length) wait();                                  // full: release lock and sleep
        items[tail] = x; tail = (tail + 1) % items.length; count++;
        notifyAll();                                                           // wake consumers (and producers)
    }
    @SuppressWarnings("unchecked")
    synchronized T take() throws InterruptedException {
        while (count == 0) wait();                                             // empty
        T x = (T) items[head]; items[head] = null; head = (head + 1) % items.length; count--;
        notifyAll();
        return x;
    }
}
BoundedBuffer<Integer> buf = new BoundedBuffer<>(3);
AtomicLong sum = new AtomicLong();
Thread producer = new Thread(() -> { try { for (int i = 1; i <= 1000; i++) buf.put(i); buf.put(-1); } catch (InterruptedException e) { } });
Thread consumer = new Thread(() -> { try { for (int x; (x = buf.take()) != -1; ) sum.addAndGet(x); } catch (InterruptedException e) { } });
producer.start(); consumer.start(); producer.join(); consumer.join();
System.out.println("consumed sum = " + sum.get() + " (expected 500500)");`,
      points: ["`wait`/`notify` must be called while holding the object's monitor, or you get `IllegalMonitorStateException`", "Using `if` instead of `while` is the most common bug: two consumers wake, the first takes the item, the second reads an empty slot"] },
    { title: "Better: one lock, two conditions (how ArrayBlockingQueue works)",
      text: "With `ReentrantLock` you can keep **separate wait sets**: producers wait on `notFull`, consumers on `notEmpty`. Each side signals only the other side, so `signal()` (not `signalAll()`) is enough and nobody is woken needlessly. This is essentially the JDK's `ArrayBlockingQueue`.",
      code: `class TwoConditionBuffer<T> {
    private final ArrayDeque<T> q = new ArrayDeque<>(); private final int cap;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();
    TwoConditionBuffer(int cap) { this.cap = cap; }
    void put(T x) throws InterruptedException {
        lock.lockInterruptibly();
        try { while (q.size() == cap) notFull.await(); q.addLast(x); notEmpty.signal(); }
        finally { lock.unlock(); }
    }
    boolean offer(T x, long ms) throws InterruptedException {                  // timed version for back-pressure
        long nanos = TimeUnit.MILLISECONDS.toNanos(ms);
        lock.lockInterruptibly();
        try {
            while (q.size() == cap) { if (nanos <= 0) return false; nanos = notFull.awaitNanos(nanos); }
            q.addLast(x); notEmpty.signal(); return true;
        } finally { lock.unlock(); }
    }
    T take() throws InterruptedException {
        lock.lockInterruptibly();
        try { while (q.isEmpty()) notEmpty.await(); T x = q.removeFirst(); notFull.signal(); return x; }
        finally { lock.unlock(); }
    }
}
TwoConditionBuffer<String> b = new TwoConditionBuffer<>(2);
b.put("O1"); b.put("O2");
System.out.println("offer when full: " + b.offer("O3", 50));
Thread kitchen = new Thread(() -> { try { Thread.sleep(30); System.out.println("kitchen took " + b.take()); } catch (InterruptedException e) { } });
kitchen.start();
System.out.println("offer while kitchen frees a slot: " + b.offer("O3", 500));
kitchen.join();`,
      points: ["`lockInterruptibly()` + `await()` make put/take cancellable via interruption", "`LinkedBlockingQueue` goes further: separate put and take **locks**, so a producer and a consumer can proceed in parallel"] },
    { title: "The BlockingQueue toolbox",
      text: "In real code, use `java.util.concurrent.BlockingQueue` rather than writing your own. Each operation comes in four flavours depending on what should happen when the queue is full (or empty).",
      table: [
        ["When full / empty…", "Insert", "Remove", "Examine"],
        ["Throw exception", "`add(e)`", "`remove()`", "`element()`"],
        ["Return special value", "`offer(e)` → false", "`poll()` → null", "`peek()`"],
        ["Block", "`put(e)`", "`take()`", "n/a"],
        ["Block with timeout", "`offer(e, t, unit)`", "`poll(t, unit)`", "n/a"]],
      code: `record Order(String id, int prepMinutes) {}
BlockingQueue<Order> rail = new ArrayBlockingQueue<>(10);
ExecutorService kitchen = Executors.newFixedThreadPool(2);
AtomicInteger cooked = new AtomicInteger();
Order POISON = new Order("POISON", 0);
for (int c = 0; c < 2; c++) kitchen.submit(() -> {
    try {
        while (true) {
            Order o = rail.take();
            if (o == POISON) return;                                            // stop signal (identity check)
            cooked.incrementAndGet();
        }
    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
});
for (int i = 1; i <= 50; i++) rail.put(new Order("ORD-" + i, 5));             // blocks whenever the rail is full
rail.put(POISON); rail.put(POISON);                                          // one pill per consumer
kitchen.shutdown(); kitchen.awaitTermination(2, TimeUnit.SECONDS);
System.out.println("cooked " + cooked.get() + " orders, queue left: " + rail.size());`,
      points: [
        "`ArrayBlockingQueue`: fixed capacity array, one lock; predictable memory",
        "`LinkedBlockingQueue`: optionally bounded (**default capacity is `Integer.MAX_VALUE`**: always pass a bound), two locks",
        "`PriorityBlockingQueue`: unbounded, ordered by a comparator (VIP orders first)",
        "`DelayQueue`: elements become available after a delay (retries, scheduled reminders)",
        "`SynchronousQueue`: capacity zero, a direct hand-off (used by `newCachedThreadPool`)",
        "`LinkedTransferQueue`: producers can wait until a consumer actually receives the item (`transfer`)"] },
    { title: "Back-pressure: what to do when consumers can't keep up",
      text: "If producers are faster than consumers for long enough, **something** has to give. An unbounded queue just delays the failure (latency climbs, then the heap fills). Choose the behaviour deliberately for each queue.",
      table: [
        ["Strategy", "How", "Good for", "Cost"],
        ["Block the producer", "`put()` / `CallerRunsPolicy`", "Internal pipelines where slowing upstream is fine", "Upstream threads stall (can cascade to request threads)"],
        ["Time out and reject", "`offer(e, 100, ms)` → false → 429/\"try later\"", "User-facing APIs", "Some requests fail fast"],
        ["Drop", "`offer(e)` → false; or drop oldest", "Metrics, telemetry, live location pings (latest value wins)", "Data loss (count it!)"],
        ["Batch / coalesce", "`drainTo(list, 500)`, merge updates per key", "Logging, DB writes, notifications", "Slight delay"],
        ["Scale consumers", "More workers / partitions", "Sustained higher load", "Needs capacity; ordering may suffer"],
        ["Spill to durable queue", "Write to Kafka/SQS/outbox table", "Must-not-lose work", "Infrastructure"]],
      code: `BlockingQueue<String> pings = new ArrayBlockingQueue<>(3);
int accepted = 0, dropped = 0;
for (int i = 1; i <= 6; i++) {                                                // rider location pings, no consumer yet
    if (pings.offer("ping-" + i)) accepted++;
    else { pings.poll(); pings.offer("ping-" + i); dropped++; }               // drop OLDEST: latest location matters most
}
System.out.println("accepted " + accepted + ", dropped-oldest " + dropped + ", queue now " + pings);

BlockingQueue<String> api = new ArrayBlockingQueue<>(1);
api.put("job-1");
boolean ok = api.offer("job-2", 50, TimeUnit.MILLISECONDS);
System.out.println(ok ? "accepted" : "HTTP 429: queue full after 50 ms, retry later");`,
      points: ["Expose queue depth, enqueue/dequeue rates, wait time and drop counts as metrics: they're your early warning", "Little's law: items in system = arrival rate × time in system; a queue that keeps growing means arrival rate > service rate"] },
    { title: "Graceful shutdown: poison pills, interruption, draining",
      text: "Stopping consumers cleanly is half the problem. Common techniques: a **poison pill** (special sentinel item, one per consumer, placed after the last real item so everything before it is processed); **interruption** (`shutdownNow()` interrupts `take()`, good for \"stop now\"); a **volatile running flag** with `poll(timeout)` so consumers check it periodically; and **draining** (`drainTo`) to persist leftovers.",
      code: `BlockingQueue<String> q = new LinkedBlockingQueue<>(100);
ExecutorService workers = Executors.newFixedThreadPool(3);
AtomicInteger processed = new AtomicInteger();
for (int w = 0; w < 3; w++) workers.submit(() -> {
    try {
        for (String job; !(job = q.take()).equals("__STOP__"); ) processed.incrementAndGet();
    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
});
for (int i = 0; i < 30; i++) q.put("email-" + i);
for (int w = 0; w < 3; w++) q.put("__STOP__");                               // one pill per worker, after real work
workers.shutdown();
System.out.println("clean stop: " + workers.awaitTermination(2, TimeUnit.SECONDS) + ", processed " + processed.get());

BlockingQueue<String> q2 = new LinkedBlockingQueue<>(List.of("a", "b", "c"));
ExecutorService stuck = Executors.newSingleThreadExecutor();
stuck.submit(() -> { try { while (true) { Thread.sleep(10_000); q2.take(); } } catch (InterruptedException e) { } });   // slow consumer
List<String> leftovers = new ArrayList<>();
stuck.shutdownNow();                                                           // interrupts the sleep / take
q2.drainTo(leftovers);                                                         // hand back unprocessed work
System.out.println("forced stop; leftovers saved for retry: " + leftovers);`,
      points: ["With N consumers you need N pills; with multiple producers, send pills only after **all** producers finish (use a `CountDownLatch` or a coordinator)", "Never use a pill value that could be a real item; compare by identity or use a dedicated type", "Add a JVM shutdown hook or `@PreDestroy` that stops producers first, then drains consumers"] },
    { title: "Mini LLD: an asynchronous logger",
      text: "Request threads must never wait for disk. An async logger (like Log4j2's async appenders or Logback's `AsyncAppender`) puts log events on a bounded queue; a **single** background writer drains it in batches and writes them in order. When the queue is full, DEBUG/INFO events are dropped (and counted) but WARN/ERROR block briefly so important events are never lost. `close()` flushes everything.",
      m: H.cd(["classDiagram",
        "  class AsyncLogger { -BlockingQueue~LogEvent~ queue; -Thread writer; -LongAdder dropped; +log(Level l, String msg); +close() }",
        "  class LogEvent { <<record>>; +long ts; +Level level; +String thread; +String msg }",
        "  class Sink { <<interface>>; +write(List~LogEvent~ batch) }",
        "  class FileSink", "  class ConsoleSink",
        "  AsyncLogger ..> LogEvent", "  AsyncLogger --> Sink", "  Sink <|.. FileSink", "  Sink <|.. ConsoleSink"]),
      code: `enum Level { DEBUG, INFO, WARN, ERROR }
record LogEvent(Level level, String thread, String msg) {}
interface Sink { void write(List<LogEvent> batch); }
class AsyncLogger implements AutoCloseable {
    private static final LogEvent STOP = new LogEvent(Level.INFO, "", "");
    private final BlockingQueue<LogEvent> q;
    private final LongAdder dropped = new LongAdder();
    private final Thread writer;
    AsyncLogger(int capacity, Sink sink) {
        q = new ArrayBlockingQueue<>(capacity);
        writer = new Thread(() -> {
            List<LogEvent> batch = new ArrayList<>();
            try {
                while (true) {
                    batch.add(q.take());                                       // wait for at least one
                    q.drainTo(batch, 255);                                     // then grab up to 255 more
                    boolean stop = batch.remove(STOP);
                    if (!batch.isEmpty()) sink.write(List.copyOf(batch));
                    batch.clear();
                    if (stop) return;
                }
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }, "log-writer");
        writer.start();
    }
    void log(Level l, String msg) {
        LogEvent e = new LogEvent(l, Thread.currentThread().getName(), msg);
        try {
            boolean ok = l.compareTo(Level.WARN) >= 0 ? q.offer(e, 200, TimeUnit.MILLISECONDS) : q.offer(e);
            if (!ok) dropped.increment();
        } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
    }
    long dropped() { return dropped.sum(); }
    public void close() throws InterruptedException { q.put(STOP); writer.join(); }
}

List<Integer> batchSizes = Collections.synchronizedList(new ArrayList<>());
AtomicInteger written = new AtomicInteger();
Sink slowDisk = batch -> { batchSizes.add(batch.size()); written.addAndGet(batch.size()); try { Thread.sleep(2); } catch (InterruptedException e) { } };
AsyncLogger log = new AsyncLogger(1024, slowDisk);
ExecutorService requests = Executors.newFixedThreadPool(8);
for (int i = 0; i < 5000; i++) { int n = i; requests.submit(() -> log.log(n % 100 == 0 ? Level.ERROR : Level.INFO, "req " + n)); }
requests.shutdown(); requests.awaitTermination(2, TimeUnit.SECONDS);
log.close();
System.out.println("written " + written.get() + " + dropped " + log.dropped() + " = 5000: " + (written.get() + log.dropped() == 5000));
System.out.println("batched writes: " + batchSizes.size() + " batches for " + written.get() + " events");`,
      points: ["Single consumer = ordering preserved and no locking inside the sink", "`take()` then `drainTo()` batches naturally under load and stays responsive when idle", "Log the dropped count periodically (and alert on it)"] },
    { title: "Mini LLD: kitchen dispatch with priorities and delayed retries",
      text: "A cloud kitchen receives orders from several apps. Priority customers and orders close to their promised time should be cooked first; when no rider is available for a ready order, assignment is retried after a back-off. Producers: order intake threads. Consumers: cooks (priority queue) and a rider-assignment worker (delay queue).",
      code: `record KitchenOrder(String id, boolean priority, long promisedAt) {}
Comparator<KitchenOrder> urgency = Comparator.comparing((KitchenOrder o) -> !o.priority()).thenComparingLong(KitchenOrder::promisedAt);
PriorityBlockingQueue<KitchenOrder> cookQueue = new PriorityBlockingQueue<>(16, urgency);
cookQueue.addAll(List.of(new KitchenOrder("A", false, 1300), new KitchenOrder("B", true, 1330), new KitchenOrder("C", false, 1245), new KitchenOrder("D", true, 1310)));
List<String> order = new ArrayList<>();
while (!cookQueue.isEmpty()) order.add(cookQueue.take().id());
System.out.println("cook order: " + order + " (priority first, then earliest promise)");

class Retry implements Delayed {
    final String orderId; final int attempt; final long readyAtNanos;
    Retry(String id, int attempt, long delayMs) { orderId = id; this.attempt = attempt; readyAtNanos = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(delayMs); }
    public long getDelay(TimeUnit u) { return u.convert(readyAtNanos - System.nanoTime(), TimeUnit.NANOSECONDS); }
    public int compareTo(Delayed o) { return Long.compare(getDelay(TimeUnit.NANOSECONDS), o.getDelay(TimeUnit.NANOSECONDS)); }
}
DelayQueue<Retry> riderRetries = new DelayQueue<>();
long t0 = System.nanoTime();
riderRetries.put(new Retry("B", 1, 60)); riderRetries.put(new Retry("D", 2, 20));
System.out.println("poll now (nothing due): " + riderRetries.poll());
Retry first = riderRetries.take(), second = riderRetries.take();               // blocks until each delay expires
System.out.println("retried " + first.orderId + " then " + second.orderId + " after ≥ " + (System.nanoTime() - t0) / 1_000_000 / 10 * 10 + " ms");`,
      points: ["`PriorityBlockingQueue` is unbounded: bound admissions upstream (e.g. a `Semaphore` on intake)", "Priority queues can starve low-priority work; age-based boosts (promisedAt) keep it fair", "`DelayQueue` avoids a scheduler thread per retry; in distributed systems use delayed messages (SQS delay, Kafka retry topics)"] },
    { title: "Beyond one JVM: message queues",
      text: "The same pattern between services uses a broker. The concepts map directly, with extra guarantees and failure modes to discuss in interviews.",
      table: [
        ["In-JVM", "Distributed equivalent", "New concern"],
        ["`BlockingQueue`", "Kafka topic, RabbitMQ queue, SQS", "Durability, replication"],
        ["Multiple consumers on one queue", "Consumer group (Kafka partitions), competing consumers (SQS)", "Ordering only within a partition / FIFO group"],
        ["`take()` removes the item", "Consume then **ack/commit offset**", "Crash before ack → redelivery (at-least-once) → idempotent consumers"],
        ["Poison pill", "Graceful consumer shutdown + rebalancing", "In-flight messages during rebalance"],
        ["Bounded capacity", "Retention limits, consumer lag alerts, producer quotas", "Lag monitoring"],
        ["`DelayQueue` retries", "Retry topics, SQS delay/visibility timeout, dead-letter queue", "Poison messages that always fail → DLQ"]],
      points: ["Exactly-once end-to-end usually means at-least-once delivery + idempotent processing (dedupe by message id)", "Transactional outbox: write the DB change and the outgoing event in one transaction, publish later"] }
  ];

  H.registerLesson({
    code: "F30",
    summary: "Producer–consumer from first principles to production: why a bounded buffer decouples producers and consumers, a from-scratch buffer with `wait()`/`notifyAll()` (and why `while` and `notifyAll`), the two-condition `ReentrantLock` version behind `ArrayBlockingQueue`, the `BlockingQueue` method matrix and implementations, back-pressure strategies (block, time out, drop oldest, batch, spill), graceful shutdown with poison pills, interruption and `drainTo`, mini designs for an async logger and a kitchen dispatcher with priority and delayed retries, and how the pattern maps to Kafka/SQS.",
    slides: SLIDES,
    widget: { heading: "Interactive: a bounded blocking queue", caption: "Capacity 4, two consumers. Fill it until producers block, drain it until consumers block, try a timed offer, then shut down with poison pills.", render: bufferWidget },
    examplesHeading: "Where producer–consumer shows up",
    examples: [
      ["`ThreadPoolExecutor`", "Submitters are producers, worker threads are consumers, and the work queue is a `BlockingQueue`: F27's pool is this pattern."],
      ["Logback `AsyncAppender`, Log4j2 async loggers", "Application threads enqueue log events; a background thread writes them (Log4j2 uses the LMAX Disruptor ring buffer)."],
      ["Kafka producers and consumer groups", "Services publish events to partitions; consumer groups process them at their own pace, with lag as the back-pressure signal."],
      ["Servlet containers and Netty", "Acceptor threads hand connections/requests to worker pools through queues."],
      ["Video/image pipelines", "Download → decode → resize → upload stages connected by bounded queues, each stage with its own pool sized for CPU or I/O."]
    ],
    pitfalls: [
      "Unbounded queues (`new LinkedBlockingQueue<>()` defaults to `Integer.MAX_VALUE`)",
      "`if` instead of `while` around `wait()` / `await()`",
      "`notify()` with mixed producers and consumers on one monitor (lost wake-ups)",
      "Busy-waiting (`while (queue.isEmpty()) {}`) instead of blocking",
      "One poison pill for several consumers (the rest hang forever)",
      "Swallowing `InterruptedException` in consumer loops so shutdown never completes",
      "Slow work inside the lock (process the item **after** `take()` returns, not inside the critical section)",
      "Losing in-flight items on shutdown: drain and persist, or use a durable queue"
    ],
    quiz: [
      { q: "Why bound the buffer?", options: ["Speed", "So overload creates back-pressure instead of unbounded memory growth", "Java requires it", "To keep order"], answer: 1, why: "Unbounded queues fail later and worse." },
      { q: "Why must `wait()` be inside a `while` loop?", options: ["Style", "Spurious wake-ups and other threads may have changed the condition before this thread re-acquires the lock", "Performance", "To avoid exceptions"], answer: 1, why: "Always re-check the predicate." },
      { q: "With producers and consumers waiting on one monitor, why `notifyAll()` over `notify()`?", options: ["Faster", "`notify()` may wake a thread of the wrong kind, leaving the right one asleep", "`notify()` is deprecated", "No reason"], answer: 1, why: "Separate Conditions fix this more efficiently." },
      { q: "`BlockingQueue.offer(e, 100, MILLISECONDS)` returns false when…", options: ["e is null", "The queue stayed full for 100 ms", "The queue is empty", "Always"], answer: 1, why: "Timed insert for back-pressure." },
      { q: "Default capacity of `new LinkedBlockingQueue<>()`?", options: ["16", "`Integer.MAX_VALUE` (effectively unbounded)", "0", "1024"], answer: 1, why: "Always pass a bound." },
      { q: "How many poison pills for 4 consumers?", options: ["1", "4", "0", "Depends on producers"], answer: 1, why: "Each consumer must receive one." },
      { q: "Which queue makes items available only after a delay?", options: ["`SynchronousQueue`", "`DelayQueue`", "`ArrayBlockingQueue`", "`ConcurrentLinkedQueue`"], answer: 1, why: "Good for retries and reminders." },
      { q: "With Kafka, a consumer crashes after processing a message but before committing the offset. What happens?", options: ["The message is lost", "It's redelivered, so processing must be idempotent", "Kafka deletes it", "The producer resends"], answer: 1, why: "At-least-once delivery." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Use"],
        ["Bounded FIFO hand-off", "`ArrayBlockingQueue` / bounded `LinkedBlockingQueue`"],
        ["Priority order", "`PriorityBlockingQueue` (unbounded: limit intake)"],
        ["Delayed retries", "`DelayQueue`"],
        ["Direct hand-off", "`SynchronousQueue`"],
        ["Batching", "`take()` + `drainTo(list, max)`"],
        ["Stop consumers", "One poison pill each, or `shutdownNow()` + interruption"],
        ["Between services", "Kafka/SQS + idempotent consumers + DLQ"]],
      cards: [
        { title: "Coordination rules", items: ["Full → producer waits/rejects", "Empty → consumer waits", "while + await", "Signal the other side"] },
        { title: "Back-pressure menu", items: ["Block", "Time out → 429", "Drop (count it)", "Batch/coalesce", "Scale consumers", "Spill to durable queue"] },
        { title: "Shutdown", items: ["Stop producers first", "Pills after the last item", "Restore interrupt flag", "drainTo leftovers"] }]
    },
    practice: [
      { level: "Easy", q: "Implement producer–consumer with a `BlockingQueue`: one producer generating 1..20, two consumers summing, stopping cleanly.",
        code: `BlockingQueue<Integer> q = new ArrayBlockingQueue<>(5);
final Integer PILL = Integer.MIN_VALUE;
LongAdder total = new LongAdder();
Runnable consumer = () -> {
    try { for (Integer x; !(x = q.take()).equals(PILL); ) total.add(x); }
    catch (InterruptedException e) { Thread.currentThread().interrupt(); }
};
Thread c1 = new Thread(consumer), c2 = new Thread(consumer);
c1.start(); c2.start();
for (int i = 1; i <= 20; i++) q.put(i);
q.put(PILL); q.put(PILL);                                                     // one per consumer
c1.join(); c2.join();
System.out.println("total = " + total.sum() + " (expected 210)");`,
        follow: "`ArrayBlockingQueue(5)` means the producer blocks when consumers fall 5 items behind: built-in back-pressure." },
      { level: "Easy", q: "What goes wrong with `if (count == 0) wait();` and with `notify()` in a buffer shared by 2 producers and 2 consumers?",
        a: ["**`if`**: consumer C1 and C2 both wait on empty. A producer adds one item and calls `notifyAll()`. C1 wakes, takes the item. C2 wakes too, doesn't re-check, and removes from an empty buffer (exception or garbage).",
          "**`notify()`**: buffer full, both producers waiting; a consumer takes and `notify()` wakes... the other consumer, which finds it empty and waits again. Now everyone may be waiting with nobody to wake them: a lost wake-up that looks like a deadlock.",
          "Fix: `while` loops, and `notifyAll()` or separate `Condition`s for not-full and not-empty."] },
      { level: "Medium", q: "Design a multi-stage image pipeline: download (I/O), resize (CPU), upload (I/O). How do you connect and size the stages?",
        a: ["Three stages connected by **bounded** queues: `downloadQ → resizeQ → uploadQ`. Bounds keep memory predictable (images are big).",
          "Pool sizes per stage: download/upload are I/O-bound (larger pools or virtual threads), resize is CPU-bound (≈ cores).",
          "Back-pressure flows upstream automatically: if upload is slow, `uploadQ` fills, resizers block on `put`, `resizeQ` fills, downloaders block.",
          "Shutdown: when the source is exhausted, send pills to stage 1; each stage, when all its workers have stopped, sends pills downstream (count workers with a latch).",
          "Errors: failed items go to a retry `DelayQueue` or a dead-letter list with the reason; metrics per stage (queue depth, throughput)."],
        m: M(["flowchart LR",
          "  S([\"URLs\"]) --> D[\"download pool<br/>(I/O, 32)\"]:::s0",
          "  D -->|\"bounded q (50)\"| R[\"resize pool<br/>(CPU, 8)\"]:::s1",
          "  R -->|\"bounded q (50)\"| U[\"upload pool<br/>(I/O, 16)\"]:::s0",
          "  U --> DONE([\"CDN\"])",
          "  R -.->|\"failures\"| DLQ[\"dead letters\"]:::bad"]) },
      { level: "Medium", q: "Implement a batching consumer that writes to the DB in batches of up to 100 or every 50 ms, whichever comes first.",
        code: `BlockingQueue<String> events = new LinkedBlockingQueue<>(10_000);
List<Integer> batches = new ArrayList<>();
Thread writer = new Thread(() -> {
    List<String> batch = new ArrayList<>();
    long deadline = System.nanoTime() + 50_000_000L;
    try {
        while (!Thread.currentThread().isInterrupted() || !events.isEmpty()) {
            String e = events.poll(Math.max(0, deadline - System.nanoTime()), TimeUnit.NANOSECONDS);
            if (e != null) { batch.add(e); events.drainTo(batch, 100 - batch.size()); }
            if (batch.size() >= 100 || System.nanoTime() >= deadline) {
                if (!batch.isEmpty()) { batches.add(batch.size()); batch.clear(); }   // "INSERT ... VALUES (...), (...)"
                deadline = System.nanoTime() + 50_000_000L;
            }
        }
    } catch (InterruptedException ie) { /* stop requested */ }
    if (!batch.isEmpty()) batches.add(batch.size());                           // final flush
});
writer.start();
for (int i = 0; i < 250; i++) events.put("click-" + i);                       // burst
Thread.sleep(120);
for (int i = 0; i < 7; i++) events.put("late-" + i);                          // trickle
Thread.sleep(120);
writer.interrupt(); writer.join();
System.out.println("batch sizes: " + batches + ", total " + batches.stream().mapToInt(Integer::intValue).sum());`,
        follow: "Size-or-time batching bounds both throughput overhead (few large writes under load) and latency (no event waits longer than ~50 ms when traffic is light). Kafka producers do the same with `batch.size` and `linger.ms`." },
      { level: "Medium", q: "An order service drops orders during deploys. Consumers use a `BlockingQueue` in memory. What's wrong and how do you fix it?",
        a: ["In-memory queues lose everything on restart: queued orders and the ones being processed vanish when the pod stops.",
          "Short term: graceful shutdown (stop intake, process or drain and persist the queue, then exit; Kubernetes `preStop` + termination grace period).",
          "Proper fix: make the queue durable: write orders to the DB (outbox) or a broker (Kafka/SQS) first, acknowledge only after processing, and make processing idempotent.",
          "Monitor: queue depth at shutdown, number of drained items, redeliveries."] },
      { level: "Medium", q: "When would you choose `SynchronousQueue`, `LinkedTransferQueue` or `ArrayBlockingQueue`?",
        a: ["`SynchronousQueue`: no buffering; a producer waits until a consumer takes. Good for hand-off pools (cached thread pool) where a task should either be picked up now or trigger a new thread.",
          "`LinkedTransferQueue`: buffering when convenient, but `transfer(e)` lets a producer wait for delivery when it must know the item was received.",
          "`ArrayBlockingQueue`: classic bounded buffer with fixed memory: the default choice for back-pressure."] },
      { level: "Hard", q: "Implement a bounded blocking queue using two `Semaphore`s and explain why it works.",
        code: `class SemaphoreQueue<T> {
    private final Semaphore slots, items = new Semaphore(0);
    private final Queue<T> q = new ArrayDeque<>();
    SemaphoreQueue(int cap) { slots = new Semaphore(cap); }
    void put(T x) throws InterruptedException {
        slots.acquire();                                                       // wait for a free slot
        synchronized (q) { q.add(x); }
        items.release();                                                       // one more item available
    }
    T take() throws InterruptedException {
        items.acquire();                                                       // wait for an item
        T x; synchronized (q) { x = q.remove(); }
        slots.release();
        return x;
    }
}
SemaphoreQueue<Integer> sq = new SemaphoreQueue<>(2);
Thread prod = new Thread(() -> { try { for (int i = 1; i <= 5; i++) { sq.put(i); } } catch (InterruptedException e) { } });
prod.start();
StringBuilder got = new StringBuilder();
for (int i = 0; i < 5; i++) got.append(sq.take()).append(' ');
prod.join();
System.out.println("took: " + got.toString().trim());`,
        follow: "`slots` counts free capacity and `items` counts available elements, so `slots + items + in-flight = capacity` always holds. The short `synchronized` block protects the `ArrayDeque` itself; the semaphores do the blocking. Acquire before locking so a blocked thread never holds the lock." },
      { level: "Hard", q: "Design a rate-limited outbound SMS sender: producers enqueue messages from many services; the provider allows 50 SMS/second and 5 concurrent connections; OTPs must jump the queue.",
        a: ["Two queues (or a `PriorityBlockingQueue` with a type rank): **OTP** and **bulk**. Consumers always check OTP first.",
          "Concurrency cap: 5 consumer threads (or a `Semaphore(5)` around provider calls).",
          "Throughput cap: a shared token bucket (F28) at 50/s; consumers take a token before sending; OTPs could have a reserved share.",
          "Back-pressure: bulk queue bounded; when full, producers get \"accepted later\" (store in DB) rather than blocking request threads. OTP queue small but never dropped.",
          "Retries: transient failures to a `DelayQueue` with exponential back-off; permanent failures (invalid number) to a dead-letter store.",
          "Idempotency key per message so retries after timeouts don't double-send; metrics: queue depth per type, send latency, provider errors."] }
    ],
    recap: [
      "A bounded buffer decouples producers and consumers and turns overload into back-pressure.",
      "From scratch: `synchronized` + `while`/`wait()` + `notifyAll()`, or one lock with `notFull`/`notEmpty` conditions.",
      "In practice use `BlockingQueue`: `put`/`take` block, `offer`/`poll` with timeouts bound waiting; always bound `LinkedBlockingQueue`.",
      "Choose back-pressure deliberately: block, time out and reject, drop (and count), batch, scale, or spill to a durable queue.",
      "Stop cleanly: one poison pill per consumer after the last item, or interruption + `drainTo`; across services use brokers with idempotent consumers."
    ]
  });
})();
