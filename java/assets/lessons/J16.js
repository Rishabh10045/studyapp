/* Lesson J16: ExecutorService & thread pools */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // ThreadPoolExecutor(core 2, max 4, queue …) submit rules. Pool size / queue size after each submit
  // match what java.util.concurrent.ThreadPoolExecutor reported on Java 21 for all queue types and policies here.
  var QUEUES = { bounded: { label: "ArrayBlockingQueue(2)", cap: 2 }, unbounded: { label: "LinkedBlockingQueue() (unbounded)", cap: Infinity }, sync: { label: "SynchronousQueue (hand-off)", cap: 0 } };
  var POLICIES = { abort: "AbortPolicy (throw)", caller: "CallerRunsPolicy", discard: "DiscardPolicy", oldest: "DiscardOldestPolicy" };
  function poolWidget(el, ctx) {
    var s = ctx.state; if (!s.q) { s.q = "bounded"; s.p = "abort"; s.sim = null; }
    el.innerHTML = "<p>" + ctx.md("`new ThreadPoolExecutor(2, 4, 30, SECONDS, queue, policy)`: **core 2, max 4**. On each `execute`: (1) fewer than core threads → start a thread; (2) else try to **queue** the task; (3) queue full → start a thread up to max; (4) still no room → **reject**. Submit tasks (each runs until you finish it) and watch where they go.") + "</p>" +
      "<div class='seg' data-r='q'>" + Object.keys(QUEUES).map(function (k) { return "<button type='button' data-v='" + k + "'>" + QUEUES[k].label + "</button>"; }).join("") + "</div>" +
      "<div class='seg' data-r='p' style='margin-top:8px'>" + Object.keys(POLICIES).map(function (k) { return "<button type='button' data-v='" + k + "'>" + POLICIES[k] + "</button>"; }).join("") + "</div>" +
      "<div class='btnrow' style='margin-top:8px'><button type='button' class='btn primary' data-r='sub'>execute(next task)</button><button type='button' class='btn' data-r='fin'>a running task finishes</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><pre class='code' data-r='log'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function fresh() { return { next: 1, workers: [], idle: 0, queue: [], log: [], caller: [], dropped: [] }; }
    function submit() {
      var S = s.sim, t = "t" + S.next++, cap = QUEUES[s.q].cap;
      var size = S.workers.length + S.idle;
      if (size < 2) { S.workers.push(t); S.log.push(t + ": pool < core → new thread runs it (pool=" + (size + 1) + ", q=" + S.queue.length + ")"); return; }
      if (S.idle > 0) { S.idle--; S.workers.push(t); S.log.push(t + ": pool ≥ core → offered to the queue and an idle thread takes it at once (pool=" + size + ", q=" + S.queue.length + ")"); return; }
      if (S.queue.length < cap) { S.queue.push(t); S.log.push(t + ": core busy → queued (pool=" + S.workers.length + ", q=" + S.queue.length + ")"); return; }
      if (size < 4) { S.workers.push(t); S.log.push(t + ": queue full → extra thread up to max runs it NOW, ahead of queued tasks (pool=" + (size + 1) + ", q=" + S.queue.length + ")"); return; }
      if (s.p === "abort") { S.log.push(t + ": pool at max and queue full → RejectedExecutionException"); S.dropped.push(t); }
      else if (s.p === "caller") { S.log.push(t + ": rejected → CallerRunsPolicy runs it on the submitting thread (slows the producer: back-pressure)"); S.caller.push(t); }
      else if (s.p === "discard") { S.log.push(t + ": rejected → silently dropped"); S.dropped.push(t); }
      else { if (S.queue.length) { var old = S.queue.shift(); S.dropped.push(old); S.queue.push(t); S.log.push(t + ": rejected → oldest queued task " + old + " dropped, " + t + " queued"); } else { S.dropped.push(t); S.log.push(t + ": rejected, queue empty (hand-off) → dropped"); } }
    }
    function finish() {
      var S = s.sim; if (!S.workers.length) return;
      var done = S.workers.shift();
      if (S.queue.length) { var nx = S.queue.shift(); S.workers.push(nx); S.log.push(done + " finished → its thread takes " + nx + " from the queue"); }
      else { S.idle++; S.log.push(done + " finished → thread idles (threads above core die after 30 s keep-alive)"); }
    }
    function draw() {
      if (!s.sim) s.sim = fresh();
      q("q").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.q); });
      q("p").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.p); });
      var S = s.sim, L = ["flowchart LR", "  SUB([\"execute()\"]):::s0"];
      L.push("  subgraph QQ[\"" + QUEUES[s.q].label + "\"]");
      if (S.queue.length) S.queue.forEach(function (t, i) { L.push("    q" + i + "[\"" + t + "\"]:::s4"); }); else L.push("    qe[\"(empty)\"]:::s0");
      L.push("  end", "  subgraph W[\"workers (core 2, max 4)\"]");
      for (var i = 0; i < 4; i++) { var t = S.workers[i]; L.push("    w" + i + "[\"thread " + (i + 1) + (i >= 2 ? " (non-core)" : "") + "<br/>" + (t ? "running " + t : (i < S.workers.length + S.idle ? "idle, polling queue" : "—")) + "\"]:::" + (t ? (i >= 2 ? "s2" : "s1") : "s0")); }
      L.push("  end", "  SUB --> QQ", "  QQ --> W");
      if (S.dropped.length) L.push("  rej[\"rejected / dropped:<br/>" + S.dropped.join(", ") + "\"]:::bad", "  SUB -.-> rej");
      if (S.caller.length) L.push("  cr[\"ran on caller:<br/>" + S.caller.join(", ") + "\"]:::s4", "  SUB -.-> cr");
      L.push("  classDef s0 fill:#f3f4f6,stroke:#9ca3af", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00", "  classDef bad fill:#fdecea,stroke:#c62828");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var note = s.q === "unbounded" ? "With an unbounded queue the pool **never grows past core** (max is ignored) and nothing is rejected: the queue just grows. That's `Executors.newFixedThreadPool`, and why it can run out of memory under overload." : s.q === "sync" ? "A `SynchronousQueue` holds nothing: every task needs a free thread, so the pool grows to max quickly and then rejects. That's how `newCachedThreadPool` works (with max = Integer.MAX_VALUE: unbounded threads)." : "Surprise: once the queue is full, new tasks get **extra threads and run before** the tasks already waiting in the queue.";
      q("res").innerHTML = ctx.md("Pool size **" + (S.workers.length + S.idle) + "** (" + S.idle + " idle), queued **" + S.queue.length + "**. " + note);
      q("log").textContent = S.log.slice(-8).join("\n") || "Submit tasks.";
    }
    q("q").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.q = b.dataset.v; s.sim = fresh(); ctx.save(); draw(); });
    q("p").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.p = b.dataset.v; s.sim = fresh(); ctx.save(); draw(); });
    q("sub").addEventListener("click", function () { if (s.sim.next <= 12) submit(); ctx.save(); draw(); });
    q("fin").addEventListener("click", function () { finish(); ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.sim = fresh(); ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Why thread pools",
      text: "Creating a platform thread per task is slow (OS thread creation, 1 MB stack) and unbounded (a traffic spike creates thousands of threads and the JVM dies). An **executor** separates *what* to run (tasks) from *how* (threads): a pool keeps a bounded set of worker threads that take tasks from a queue. You get reuse, a cap on concurrency, a place to queue or reject overload, and lifecycle management. `Executor` (one method, `execute`) ← `ExecutorService` (submit, futures, shutdown) ← `ScheduledExecutorService` (delays, periodic tasks).",
      m: M(["flowchart LR",
        "  C[\"callers submit tasks\"]:::s0 --> Q[\"work queue\"]:::s4",
        "  Q --> W1[\"worker 1\"]:::s1",
        "  Q --> W2[\"worker 2\"]:::s1",
        "  Q --> W3[\"worker 3\"]:::s1",
        "  W1 --> R[\"Futures complete\"]:::s2",
        "  W2 --> R",
        "  W3 --> R",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `try (ExecutorService pool = Executors.newFixedThreadPool(3)) {
    Set<String> threadsUsed = ConcurrentHashMap.newKeySet();
    for (int i = 0; i < 20; i++) pool.execute(() -> threadsUsed.add(Thread.currentThread().getName()));
    pool.shutdown();
    pool.awaitTermination(5, TimeUnit.SECONDS);
    System.out.println("20 tasks ran on " + threadsUsed.size() + " reused threads: " + new TreeSet<>(threadsUsed));
}`,
      analogy: "A pool is a taxi stand: a fixed number of taxis serve a queue of passengers. You don't buy a new car for every ride, and when the queue gets too long you turn people away instead of blocking the road." },
    { title: "execute, submit, invokeAll, invokeAny",
      text: "`execute(Runnable)` is fire-and-forget (exceptions go to the worker's uncaught handler). `submit(Runnable | Callable)` returns a `Future` (exceptions captured inside). `invokeAll(tasks)` runs a collection and waits for all, returning futures in the same order (with an optional timeout that cancels stragglers). `invokeAny(tasks)` returns the result of the **first task to succeed** and cancels the rest: handy for querying redundant replicas.",
      code: `try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    pool.execute(() -> System.out.println("fire-and-forget on " + Thread.currentThread().getName()));
    Future<Integer> f = pool.submit(() -> 4850);
    System.out.println("submit → " + f.get());

    List<Callable<String>> lookups = List.of(
        () -> { Thread.sleep(60); return "6E:4850"; },
        () -> { Thread.sleep(20); return "AI:5300"; },
        () -> { Thread.sleep(40); return "UK:6100"; });
    List<Future<String>> all = pool.invokeAll(lookups);                       // waits for all; same order as input
    System.out.println("invokeAll → " + all.stream().map(Future::resultNow).toList());

    List<Callable<String>> replicas = List.of(
        () -> { Thread.sleep(200); return "replica-A"; },
        () -> { Thread.sleep(30); return "replica-B"; },
        () -> { throw new IOException("replica-C down"); });
    System.out.println("invokeAny → " + pool.invokeAny(replicas));            // first success wins, others cancelled
}`,
      points: ["`invokeAny` throws `ExecutionException` only if every task fails"] },
    { title: "Shutting down correctly",
      text: "Executor threads are usually non-daemon, so a pool you never shut down keeps the JVM alive. `shutdown()` stops accepting new tasks and lets queued ones finish; `shutdownNow()` interrupts running tasks and returns the queued ones; `awaitTermination(timeout)` waits. The standard two-phase pattern is: shutdown, await, then shutdownNow if it's taking too long. Since Java 19 `ExecutorService` is `AutoCloseable`: `close()` does shutdown + wait in try-with-resources. In Spring, let the container manage executor beans.",
      code: `ExecutorService pool = Executors.newFixedThreadPool(2);
for (int i = 0; i < 6; i++) {
    int id = i;
    pool.submit(() -> { try { Thread.sleep(id < 2 ? 50 : 5_000); } catch (InterruptedException e) { System.out.println("task " + id + " interrupted"); } return id; });
}
pool.shutdown();                                                // no new tasks; queued ones still run
try { pool.submit(() -> 1); } catch (RejectedExecutionException e) { System.out.println("rejected after shutdown"); }
if (!pool.awaitTermination(200, TimeUnit.MILLISECONDS)) {       // phase 1: polite wait
    List<Runnable> neverRan = pool.shutdownNow();               // phase 2: interrupt running, drain queue
    System.out.println("forced; never started: " + neverRan.size());
    pool.awaitTermination(1, TimeUnit.SECONDS);
}
System.out.println("terminated: " + pool.isTerminated());`,
      points: ["Tasks that ignore interruption make `shutdownNow` ineffective", "Register a shutdown hook (or use Spring's lifecycle) so pools drain on SIGTERM"] },
    { title: "ThreadPoolExecutor: the real engine",
      text: "Every factory method builds a `ThreadPoolExecutor(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue, threadFactory, handler)`. The submit algorithm is: fewer than **core** threads running → start a new thread for the task; otherwise **offer** to the queue; if the queue refuses (full) and fewer than **max** threads → start a non-core thread; otherwise **reject**. Threads above core die after **keepAlive** idle time (`allowCoreThreadTimeOut(true)` applies it to core threads too). The counter-intuitive consequence: with a bounded queue, the pool grows past core only **after** the queue is full.",
      m: M(["flowchart TB",
        "  S[\"execute(task)\"]:::s0 --> A{\"running #lt; core?\"}",
        "  A -->|yes| N1[\"start core thread with task\"]:::s1",
        "  A -->|no| B{\"queue.offer(task)?\"}",
        "  B -->|accepted| QD[\"task waits in queue\"]:::s4",
        "  B -->|full| C{\"running #lt; max?\"}",
        "  C -->|yes| N2[\"start extra thread with task\"]:::s2",
        "  C -->|no| R[\"RejectedExecutionHandler\"]:::bad",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00", "  classDef bad fill:#fdecea,stroke:#c62828"]),
      table: [
        ["Parameter", "Meaning", "Typical value"],
        ["`corePoolSize`", "Threads kept even when idle", "Steady-state concurrency"],
        ["`maximumPoolSize`", "Upper bound (used only when the queue is full)", "Burst capacity"],
        ["`keepAliveTime`", "Idle time before non-core threads exit", "30–60 s"],
        ["`workQueue`", "Where tasks wait", "Bounded `ArrayBlockingQueue` in services"],
        ["`threadFactory`", "Names, daemon flag, handlers", "Named threads"],
        ["`handler`", "What happens on rejection", "Abort (fail fast) or CallerRuns (back-pressure)"]] },
    { title: "Queues and rejection policies",
      text: "The queue decides the pool's behaviour under load. **Bounded** (`ArrayBlockingQueue`): limits memory and makes overload visible via rejection. **Unbounded** (`LinkedBlockingQueue()`): the pool never grows past core and the queue can grow until OutOfMemoryError; latency explodes silently. **Hand-off** (`SynchronousQueue`): no queueing, threads grow to max. The rejection policy decides what overload looks like: **Abort** throws `RejectedExecutionException` (default; map to HTTP 503), **CallerRuns** runs the task on the submitting thread (natural back-pressure), **Discard** / **DiscardOldest** drop work silently (only for best-effort tasks like metrics).",
      code: `ThreadPoolExecutor pool = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(1),
    new ThreadPoolExecutor.CallerRunsPolicy());
CountDownLatch hold = new CountDownLatch(1);
List<String> ranOn = Collections.synchronizedList(new ArrayList<>());
for (int i = 1; i <= 3; i++) {
    int id = i;
    pool.execute(() -> {
        ranOn.add("t" + id + "@" + Thread.currentThread().getName());
        if (id == 1) try { hold.await(); } catch (InterruptedException e) { }
    });
}
System.out.println("after 3 submits: " + ranOn + " (t3 ran on the caller because the pool and queue were full)");
hold.countDown();
pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS);
System.out.println("all: " + ranOn);

ThreadPoolExecutor strict = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(1));
CountDownLatch hold2 = new CountDownLatch(1);
try { for (int i = 0; i < 3; i++) strict.execute(() -> { try { hold2.await(); } catch (InterruptedException e) { } }); }
catch (RejectedExecutionException e) { System.out.println("AbortPolicy: " + e.getClass().getSimpleName() + " → respond 503 / retry later"); }
hold2.countDown(); strict.shutdown();` },
    { title: "The Executors factory methods (and their traps)",
      text: "`Executors` gives convenient presets, but two of them hide unbounded resources. `newFixedThreadPool(n)` and `newSingleThreadExecutor()` use an **unbounded** `LinkedBlockingQueue`; `newCachedThreadPool()` allows **unbounded threads** (`max = Integer.MAX_VALUE`, `SynchronousQueue`). Fine for tools, tests and known-small workloads; for production services build a `ThreadPoolExecutor` with explicit bounds (or Spring's `ThreadPoolTaskExecutor` with `queueCapacity`). Static analysis tools such as Alibaba's Java guidelines flag the factories for this reason.",
      table: [
        ["Factory", "Core / max", "Queue", "Risk"],
        ["`newFixedThreadPool(n)`", "n / n", "Unbounded LinkedBlockingQueue", "Queue grows → OOM, huge latency"],
        ["`newSingleThreadExecutor()`", "1 / 1", "Unbounded", "Same; but guarantees sequential order"],
        ["`newCachedThreadPool()`", "0 / ∞", "SynchronousQueue", "Thread explosion under load"],
        ["`newScheduledThreadPool(n)`", "n / ∞*", "DelayedWorkQueue (unbounded)", "Long backlog of scheduled tasks"],
        ["`newWorkStealingPool()`", "ForkJoinPool (cores)", "Per-worker deques", "Not for blocking tasks"],
        ["`newVirtualThreadPerTaskExecutor()`", "Virtual thread per task", "None", "Must limit downstream concurrency yourself"]],
      code: `ThreadPoolExecutor fixed = (ThreadPoolExecutor) Executors.newFixedThreadPool(4);
ThreadPoolExecutor cached = (ThreadPoolExecutor) Executors.newCachedThreadPool();
System.out.println("fixed: core " + fixed.getCorePoolSize() + ", max " + fixed.getMaximumPoolSize() + ", queue " + fixed.getQueue().getClass().getSimpleName() + " remaining capacity " + fixed.getQueue().remainingCapacity());
System.out.println("cached: core " + cached.getCorePoolSize() + ", max " + cached.getMaximumPoolSize() + ", queue " + cached.getQueue().getClass().getSimpleName());
fixed.shutdown(); cached.shutdown();

ThreadPoolExecutor production = new ThreadPoolExecutor(8, 16, 60, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(200),
    Thread.ofPlatform().name("pricing-", 0).factory(),
    new ThreadPoolExecutor.AbortPolicy());
System.out.println("explicit: " + production.getCorePoolSize() + "/" + production.getMaximumPoolSize() + ", queue capacity " + production.getQueue().remainingCapacity());
production.shutdown();`,
      points: ["* scheduled pools effectively run with core threads only"] },
    { title: "Sizing pools: CPU-bound vs I/O-bound",
      text: "**CPU-bound** tasks (parsing, hashing, compression) can't run faster than the cores allow: size ≈ number of cores (maybe +1). **I/O-bound** tasks spend most of their time waiting, so more threads keep the CPUs busy: threads ≈ cores × (1 + wait time / compute time) (from *Java Concurrency in Practice*). Cross-check with **Little's law**: concurrency = throughput × latency (e.g. 200 requests/s × 0.25 s = 50 concurrent calls). Then measure under load; the downstream (DB connections, API rate limits) is often the real ceiling. Separate pools per workload (bulkheads) so slow calls can't starve fast ones.",
      code: `int cores = Runtime.getRuntime().availableProcessors();
double computeMs = 5, waitMs = 95;
long ioThreads = Math.round(cores * (1 + waitMs / computeMs));
double throughputPerSec = 200, latencySec = 0.25;
System.out.println("cores " + cores + " | CPU pool " + cores + " | I/O pool ≈ " + ioThreads + " | Little's law concurrency " + (int) (throughputPerSec * latencySec));

ExecutorService cpu = Executors.newFixedThreadPool(cores);
long t0 = System.nanoTime();
List<Future<Long>> fs = new ArrayList<>();
for (int i = 0; i < cores * 2; i++) fs.add(cpu.submit(() -> { long x = 0; for (int k = 0; k < 20_000_000; k++) x += k % 7; return x; }));
long sum = 0; for (Future<Long> f : fs) sum += f.get();
System.out.println("CPU batch on " + cores + " threads: " + (System.nanoTime() - t0) / 1_000_000 + " ms (checksum " + sum % 1000 + ")");
cpu.shutdown();`,
      analogy: "Cooks (threads) who mostly wait for the oven (I/O) can share a kitchen in large numbers; cooks who chop constantly (CPU) just bump into each other once every counter (core) is taken." },
    { title: "Scheduled executors: fixed rate vs fixed delay",
      text: "`ScheduledExecutorService` runs tasks after a delay or periodically. **`scheduleAtFixedRate`** aims for a start every *period* (if a run takes longer than the period, the next starts immediately after; runs never overlap). **`scheduleWithFixedDelay`** waits *delay* after each run **finishes**. If a periodic task throws, **all future runs are silently cancelled**: always catch exceptions inside periodic tasks. For production scheduling prefer Spring `@Scheduled` or a job scheduler (Quartz, ShedLock for clusters).",
      code: `ScheduledExecutorService ses = Executors.newScheduledThreadPool(2);
long start = System.nanoTime();
List<String> rate = Collections.synchronizedList(new ArrayList<>()), delay = Collections.synchronizedList(new ArrayList<>());
ses.scheduleAtFixedRate(() -> { rate.add("" + (System.nanoTime() - start) / 1_000_000); sleepQuietly(30); }, 0, 50, TimeUnit.MILLISECONDS);
ses.scheduleWithFixedDelay(() -> { delay.add("" + (System.nanoTime() - start) / 1_000_000); sleepQuietly(30); }, 0, 50, TimeUnit.MILLISECONDS);
AtomicInteger runs = new AtomicInteger();
ses.scheduleAtFixedRate(() -> { if (runs.incrementAndGet() == 2) throw new IllegalStateException("boom"); }, 0, 20, TimeUnit.MILLISECONDS);
ScheduledFuture<String> once = ses.schedule(() -> "refresh fares", 100, TimeUnit.MILLISECONDS);
System.out.println(once.get());
Thread.sleep(320);
ses.shutdownNow();
System.out.println("fixed rate starts (ms):  " + rate.subList(0, 5));
System.out.println("fixed delay starts (ms): " + delay.subList(0, 4));
System.out.println("task that threw ran " + runs.get() + " times, then stopped forever");

static void sleepQuietly(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }`,
      points: ["Fixed rate ≈ every 50 ms; fixed delay ≈ every 80 ms (30 ms work + 50 ms delay)"] },
    { title: "Thread factories and naming",
      text: "A `ThreadFactory` creates the pool's threads: give them **descriptive names** (`pricing-3` beats `pool-7-thread-3` in a thread dump), set the daemon flag deliberately, and install an `UncaughtExceptionHandler`. Java 21's `Thread.ofPlatform().name(\"pricing-\", 0).factory()` does this in one line; Guava's `ThreadFactoryBuilder` and Spring's `CustomizableThreadFactory` are common alternatives.",
      code: `ThreadFactory named = Thread.ofPlatform()
    .name("pricing-", 1)
    .daemon(false)
    .uncaughtExceptionHandler((t, e) -> System.out.println("[" + t.getName() + "] " + e))
    .factory();
try (ExecutorService pool = Executors.newFixedThreadPool(2, named)) {
    pool.submit(() -> System.out.println("running on " + Thread.currentThread().getName())).get();
    pool.execute(() -> { throw new IllegalStateException("fare feed malformed"); });
    Thread.sleep(50);
}
try (ExecutorService defaults = Executors.newSingleThreadExecutor()) {
    defaults.submit(() -> System.out.println("default name: " + Thread.currentThread().getName())).get();
}` },
    { title: "Propagating context to pool threads",
      text: "Request context often lives in `ThreadLocal`s: the logging MDC (trace id, user), security context, tenant id, locale. Tasks run on **different threads**, so that context is missing (or worse, a stale value from a previous task is still there). The fix is to **capture** the context when submitting and **restore + clear** it around the task, usually with a decorating executor. Spring offers `TaskDecorator` for `ThreadPoolTaskExecutor`, and Micrometer's context-propagation library handles MDC/tracing across executors and `CompletableFuture`. J24 covers ThreadLocal in depth.",
      code: `ThreadLocal<String> traceId = new ThreadLocal<>();
class ContextExecutor implements Executor {
    private final Executor delegate;
    private final ThreadLocal<String> traceId;
    ContextExecutor(Executor delegate, ThreadLocal<String> traceId) { this.delegate = delegate; this.traceId = traceId; }
    public void execute(Runnable task) {
        String captured = traceId.get();                          // capture on the submitting thread
        delegate.execute(() -> {
            String previous = traceId.get();
            traceId.set(captured);                                 // restore on the worker
            try { task.run(); }
            finally { if (previous == null) traceId.remove(); else traceId.set(previous); }   // never leak into the next task
        });
    }
}
try (ExecutorService raw = Executors.newFixedThreadPool(1)) {
    traceId.set("req-42");
    raw.submit(() -> System.out.println("plain pool sees trace " + traceId.get())).get();
    Executor withCtx = new ContextExecutor(raw, traceId);
    CompletableFuture.runAsync(() -> System.out.println("decorated pool sees trace " + traceId.get()), withCtx).get();
    raw.submit(() -> System.out.println("after the decorated task the worker has " + traceId.get())).get();
}` },
    { title: "Monitoring pools and Spring's executors",
      text: "A pool is a queue plus workers, so watch both: **active count** vs max (saturation), **queue size** (backlog = latency), **completed task count** (throughput), and **rejections**. Micrometer's `ExecutorServiceMetrics` exports these; Spring Boot auto-configures a `ThreadPoolTaskExecutor` (`spring.task.execution.pool.*`) for `@Async`, and with virtual threads enabled uses a `SimpleAsyncTaskExecutor` on virtual threads instead. Alert on sustained queue growth and rejections; they mean the pool or its downstream is undersized.",
      code: `ThreadPoolExecutor pool = new ThreadPoolExecutor(2, 2, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(10));
CountDownLatch slow = new CountDownLatch(1);
for (int i = 0; i < 6; i++) pool.execute(() -> { try { slow.await(); } catch (InterruptedException e) { } });
Runnable report = () -> System.out.println("active " + pool.getActiveCount() + "/" + pool.getMaximumPoolSize()
    + ", queued " + pool.getQueue().size() + ", completed " + pool.getCompletedTaskCount() + ", largest " + pool.getLargestPoolSize());
report.run();
slow.countDown();
pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS);
report.run();
// Spring Boot: spring.task.execution.pool.core-size=8, max-size=16, queue-capacity=200, thread-name-prefix=app-`,
      points: ["`getActiveCount` and friends are approximate snapshots, fine for metrics"] }
  ];

  H.registerLesson({
    code: "J16",
    summary: "Running tasks instead of managing threads: the `Executor` / `ExecutorService` / `ScheduledExecutorService` hierarchy, `execute` vs `submit`, `invokeAll` / `invokeAny`, correct two-phase shutdown and `close()`, how `ThreadPoolExecutor` really decides between starting threads, queueing and rejecting, queue types and rejection policies, the hidden unbounded resources in the `Executors` factories, sizing CPU- vs I/O-bound pools, fixed-rate vs fixed-delay scheduling, thread factories, context (MDC) propagation and pool monitoring.",
    slides: SLIDES,
    widget: { heading: "Interactive: ThreadPoolExecutor simulator", caption: "A pool with `core 2`, `max 4`. Pick the work queue and the rejection policy, then submit tasks and finish them. The decisions follow `ThreadPoolExecutor.execute` and were checked against Java 21: with a bounded queue the pool grows past core only after the queue is full.", render: poolWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["@Async and background jobs", "Spring's `ThreadPoolTaskExecutor` (core, max, queue capacity, name prefix) runs `@Async` methods and event listeners."],
      ["Fan-out calls", "An aggregator calls 5 downstream services in parallel on a dedicated I/O pool and waits with a timeout."],
      ["Bulkheads", "Separate pools for payments, search and reporting so a slow dependency can't exhaust every thread."],
      ["Back-pressure", "A Kafka or SQS consumer uses a bounded queue with `CallerRunsPolicy` so polling slows down when workers are busy."],
      ["Scheduled refresh", "Cache warmers and token refreshers run with `scheduleWithFixedDelay` and catch every exception."],
      ["Incidents", "Thread dumps showing all `pool-3-thread-*` threads WAITING on a DB pool, or a huge queue behind a fixed pool, drive sizing fixes."]
    ],
    pitfalls: [
      "Never shutting down a pool, so the JVM won't exit",
      "Using `newFixedThreadPool` with an unbounded queue for overloadable work",
      "Using `newCachedThreadPool` for unbounded incoming traffic",
      "Expecting a pool to grow to max while the queue is unbounded",
      "Ignoring Futures from `submit`, so exceptions vanish",
      "Periodic tasks that throw and silently stop forever",
      "Blocking I/O on a CPU-sized or common ForkJoin pool",
      "Default thread names that make dumps unreadable",
      "Losing MDC/security context on pool threads (or leaking it between tasks)"
    ],
    quiz: [
      { q: "What is the main difference between `execute` and `submit`?", options: ["None", "`submit` returns a Future and captures exceptions in it; `execute` returns nothing and exceptions go to the uncaught handler", "`execute` is asynchronous, `submit` is synchronous", "`submit` only accepts Callable"], answer: 1, why: "`submit` wraps the task in a FutureTask, so an exception surfaces only when you call `get()`. With `execute` an exception kills the worker (which the pool replaces) and is passed to the thread's UncaughtExceptionHandler." },
      { q: "A `ThreadPoolExecutor(2, 4, 60s, new ArrayBlockingQueue<>(2))` has 2 busy threads and an empty queue. A third task arrives. What happens?", options: ["A third thread starts", "The task is queued", "It is rejected", "It runs on the caller"], answer: 1, why: "Once core threads are running the pool offers to the queue first. It starts extra threads only when the queue refuses (full)." },
      { q: "Why does `Executors.newFixedThreadPool(10)` never use more than 10 threads, and what's the risk?", options: ["max is 10 and the queue is unbounded, so overload accumulates in memory", "It throws when more than 10 tasks are submitted", "It uses a SynchronousQueue", "It has no risk"], answer: 0, why: "core = max = 10 with an unbounded LinkedBlockingQueue. The queue never fills, so tasks pile up: latency grows and memory can run out." },
      { q: "Which rejection policy provides natural back-pressure?", options: ["AbortPolicy", "DiscardPolicy", "CallerRunsPolicy", "DiscardOldestPolicy"], answer: 2, why: "The submitting thread runs the task itself, so it can't submit more until it finishes, slowing the producer." },
      { q: "What does this print?", code: `ExecutorService pool = Executors.newSingleThreadExecutor();
Future<?> f = pool.submit(() -> { throw new IllegalStateException("x"); });
Thread.sleep(100);
System.out.println("done=" + f.isDone());
try { f.get(); } catch (ExecutionException e) { System.out.println(e.getCause().getMessage()); }
pool.shutdown();`, options: ["Nothing, the exception kills main", "done=true then x", "done=false then x", "A stack trace from the worker thread"], answer: 1, why: "The exception is captured in the Future, which is done (exceptionally). `get()` wraps it in ExecutionException." },
      { q: "What is the difference between `shutdown()` and `shutdownNow()`?", options: ["Identical", "shutdown rejects new tasks but runs queued ones; shutdownNow also interrupts running tasks and returns the queued ones", "shutdownNow waits for completion", "shutdown kills threads immediately"], answer: 1, why: "Neither waits; follow with `awaitTermination`. shutdownNow only interrupts, so tasks must respond to interruption." },
      { q: "A periodic task in `scheduleAtFixedRate` throws an exception on its 3rd run. What happens next?", options: ["It runs again next period", "Subsequent runs are suppressed and the exception sits in the ScheduledFuture", "The JVM exits", "The executor shuts down"], answer: 1, why: "Periodic execution stops silently. Wrap the body in try/catch and log." },
      { q: "A service makes blocking HTTP calls taking ~95 ms of waiting and ~5 ms of CPU, on 8 cores. Roughly how many platform threads keep the CPUs busy?", options: ["8", "9", "~160", "Integer.MAX_VALUE"], answer: 2, why: "cores × (1 + wait/compute) = 8 × (1 + 19) = 160. Downstream limits often cap it lower; virtual threads are the modern alternative." },
      { q: "Why might a log line written inside a pool task lack the request's trace id?", options: ["Loggers aren't thread-safe", "MDC is ThreadLocal-based, so the worker thread doesn't have the submitting thread's values", "Pools disable logging", "Trace ids are only for virtual threads"], answer: 1, why: "Capture the context on submit and restore/clear it in the task (Spring TaskDecorator, context-propagation library)." }
    ],
    cheatsheet: {
      table: [
        ["Task", "Code"],
        ["Bounded pool", "`new ThreadPoolExecutor(8, 16, 60, SECONDS, new ArrayBlockingQueue<>(200), factory, new AbortPolicy())`"],
        ["Result + errors", "`Future<V> f = pool.submit(callable); f.get(2, SECONDS)`"],
        ["All / first", "`pool.invokeAll(tasks, timeout, unit)` / `pool.invokeAny(tasks)`"],
        ["Shut down", "`shutdown(); if (!awaitTermination(t)) shutdownNow();` or try-with-resources (Java 19+)"],
        ["Schedule", "`ses.scheduleWithFixedDelay(task, 0, 30, SECONDS)` and catch inside"],
        ["Name threads", "`Thread.ofPlatform().name(\"pricing-\", 0).factory()`"],
        ["Monitor", "`getActiveCount()`, `getQueue().size()`, `getCompletedTaskCount()`"]],
      cards: [
        { title: "TPE algorithm", items: ["< core → new thread", "else → queue", "queue full and < max → new thread", "else → reject"] },
        { title: "Sizing", items: ["CPU-bound ≈ cores", "I/O ≈ cores × (1 + wait/compute)", "Little's law: λ × latency", "Measure; respect downstream limits"] },
        { title: "Say in interviews", items: ["Bounded queues + explicit rejection", "Factories hide unbounded resources", "submit captures exceptions", "Two-phase shutdown", "Bulkheads per workload"] }]
    },
    practice: [
      { level: "Easy", q: "Why use an ExecutorService instead of creating threads directly?",
        a: ["Thread reuse: creating platform threads is expensive (OS thread, stack memory).",
          "Bounded concurrency: a pool caps threads, so a spike can't create thousands of them.",
          "Queueing and rejection give a defined behaviour under overload.",
          "Futures give results, exceptions, timeouts and cancellation; invokeAll/invokeAny handle groups.",
          "Lifecycle (shutdown, awaitTermination) and central configuration: names, handlers, metrics."] },
      { level: "Easy", q: "Explain execute vs submit and what happens to exceptions in each.",
        a: ["`execute(Runnable)` returns void. An exception propagates out of `run`, the worker thread dies (the pool creates a replacement) and the UncaughtExceptionHandler prints/logs it.",
          "`submit(...)` returns a Future. The exception is stored in it and rethrown, wrapped in `ExecutionException`, from `get()`.",
          "So with submit, an unchecked future means a silently lost exception: always call get or attach handling (or use CompletableFuture with exceptionally/whenComplete)."],
        code: `try (ExecutorService pool = Executors.newFixedThreadPool(1, Thread.ofPlatform().name("w").uncaughtExceptionHandler((t, e) -> System.out.println("handler: " + e.getMessage())).factory())) {
    pool.execute(() -> { throw new IllegalStateException("from execute"); });
    Future<?> f = pool.submit(() -> { throw new IllegalStateException("from submit"); });
    try { f.get(); } catch (ExecutionException e) { System.out.println("get(): " + e.getCause().getMessage()); }
}` },
      { level: "Easy", q: "How do you shut down an ExecutorService properly?",
        a: ["Call `shutdown()` to stop accepting tasks and let queued ones finish.",
          "`awaitTermination(timeout)`; if it returns false call `shutdownNow()` to interrupt running tasks (and get the never-started ones), then await again briefly.",
          "If the current thread is interrupted while waiting, call shutdownNow and re-set the interrupt flag.",
          "Java 19+: `try (var pool = ...) { }` calls `close()`, which shuts down and waits.",
          "In Spring, define executors as beans so the container shuts them down."] },
      { level: "Medium", q: "Walk through how ThreadPoolExecutor handles a new task.",
        a: ["If fewer than `corePoolSize` threads are running, start a new thread with this task as its first task (even if others are idle).",
          "Otherwise try `workQueue.offer(task)`. If accepted, an idle worker will take it (the pool re-checks that at least one thread is alive).",
          "If the queue rejects (full) and fewer than `maximumPoolSize` threads run, start a non-core thread for it.",
          "Otherwise call the `RejectedExecutionHandler`. Also rejected after shutdown.",
          "Non-core threads idle longer than keepAlive exit. `prestartAllCoreThreads()` warms up the pool."],
        code: `ThreadPoolExecutor pool = new ThreadPoolExecutor(2, 4, 60, TimeUnit.SECONDS, new ArrayBlockingQueue<>(2));
CountDownLatch hold = new CountDownLatch(1);
for (int i = 1; i <= 7; i++) {
    try {
        pool.execute(() -> { try { hold.await(); } catch (InterruptedException e) { } });
        System.out.println("t" + i + ": threads " + pool.getPoolSize() + ", queued " + pool.getQueue().size());
    } catch (RejectedExecutionException e) { System.out.println("t" + i + ": rejected"); }
}
hold.countDown(); pool.shutdown();` },
      { level: "Medium", q: "What are the risks of the Executors factory methods? What do you use instead?",
        a: ["`newFixedThreadPool` / `newSingleThreadExecutor`: unbounded `LinkedBlockingQueue`; overload becomes unbounded memory and latency.",
          "`newCachedThreadPool`: max threads = Integer.MAX_VALUE; a spike of slow tasks creates thousands of threads.",
          "`newScheduledThreadPool`: unbounded delay queue.",
          "Instead build `ThreadPoolExecutor` with a bounded queue, explicit max, named threads and a deliberate rejection policy (or Spring `ThreadPoolTaskExecutor` with queueCapacity).",
          "For I/O-heavy request work on Java 21 consider virtual threads plus a Semaphore to limit downstream concurrency."] },
      { level: "Medium", q: "How do you choose a pool size?",
        a: ["CPU-bound: about the number of cores (`availableProcessors()`), since more threads only add context switching.",
          "I/O-bound: cores × (1 + wait time / compute time), or Little's law: required concurrency = arrival rate × time per task.",
          "Cap by downstream resources: no point having 200 threads sharing a 20-connection DB pool.",
          "Separate pools per workload (bulkheads); keep the common ForkJoinPool for CPU work.",
          "Validate with load tests and metrics (queue size, active count, latency percentiles) and adjust."] },
      { level: "Medium", q: "scheduleAtFixedRate vs scheduleWithFixedDelay: when do you use each, and what happens with exceptions?",
        a: ["Fixed rate: runs start at initialDelay + n × period; if a run overruns, the next starts right after it (never concurrently). Use for clock-like work (metrics every 10 s).",
          "Fixed delay: the next run starts delay after the previous one ends. Use when runs vary in length and must not bunch up (polling, cache refresh).",
          "An exception cancels all future executions silently; the ScheduledFuture holds it. Always catch Throwable inside, log, and continue.",
          "In clusters, add a distributed lock (ShedLock) or a job scheduler so every node doesn't run the job."] },
      { level: "Hard", q: "Your service's latency climbs slowly during a traffic spike, with no errors, and memory grows. Threads look fine. What could be happening with its executor, and how would you fix it?",
        a: ["Likely a fixed pool with an unbounded queue: all threads busy, tasks queue without limit; latency = queue wait + work, memory = queued tasks. No errors because nothing is rejected.",
          "Confirm with metrics: queue size growing, active count = max, completed rate flat.",
          "Fix: bounded queue + rejection (fail fast with 503 / retry-after) or CallerRuns for back-pressure; add timeouts so stale queued work is dropped.",
          "Address capacity: right-size the pool for I/O, scale out, or move to virtual threads with a downstream Semaphore.",
          "Add alerts on queue depth and rejections."] },
      { level: "Hard", q: "Implement a decorator that propagates a ThreadLocal request id to tasks run on any Executor and never leaks it.",
        a: ["Capture the value on the submitting thread in `execute`.",
          "In the wrapped task, save the worker's previous value, set the captured one, run, and restore/remove in `finally`.",
          "The finally is essential: pool threads are reused, so a leftover value would leak into the next request.",
          "In Spring use `TaskDecorator`; for MDC copy `MDC.getCopyOfContextMap()` and `MDC.setContextMap()`."],
        code: `ThreadLocal<String> requestId = new ThreadLocal<>();
Function<Executor, Executor> propagating = delegate -> task -> {
    String captured = requestId.get();
    delegate.execute(() -> {
        String previous = requestId.get();
        requestId.set(captured);
        try { task.run(); } finally { if (previous == null) requestId.remove(); else requestId.set(previous); }
    });
};
try (ExecutorService pool = Executors.newSingleThreadExecutor()) {
    Executor ex = propagating.apply(pool);
    for (String id : List.of("req-1", "req-2")) {
        requestId.set(id);
        CompletableFuture.runAsync(() -> System.out.println("task sees " + requestId.get()), ex).join();
    }
    pool.submit(() -> System.out.println("worker afterwards: " + requestId.get())).get();
}` },
      { level: "Hard", q: "Design the executors for a fare-aggregation service that calls 6 airline APIs per search, then ranks results (CPU).",
        steps: ["Separate pools: an I/O pool for airline calls (or virtual threads) and a small CPU pool (≈ cores) for ranking.",
          "Bulkhead per airline (or a Semaphore per airline) so one slow airline can't consume all I/O threads.",
          "Bound the I/O queue and reject with a fast fallback; every call has a timeout and the search returns partial results.",
          "Use CompletableFuture.allOf with orTimeout/completeOnTimeout on the I/O executor; rank on the CPU executor (J22).",
          "Name threads (`airline-io-`, `rank-`), propagate trace context, export pool metrics, and shut down gracefully on deploy."] }
    ],
    recap: [
      "Submit tasks to executors; don't manage raw threads. `submit` returns a Future that holds exceptions.",
      "ThreadPoolExecutor: core threads first, then the queue, then extra threads up to max, then rejection.",
      "Prefer bounded queues and explicit rejection; beware the unbounded resources in the Executors factories.",
      "Size CPU pools ≈ cores and I/O pools by wait/compute or Little's law, and isolate workloads with bulkheads.",
      "Shut down in two phases, catch exceptions in periodic tasks, name threads, propagate and clear context, monitor queue and active counts."
    ]
  });
})();
