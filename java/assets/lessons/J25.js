/* Lesson J25: Virtual threads & structured concurrency */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded on JDK 21 with 4 carrier threads (-Djdk.virtualThreadScheduler.parallelism=4, maxPoolSize=4).
  // Each task sleeps 100 ms (simulated I/O), submitted N times; wall-clock ms, try-with-resources executor.
  // CPU rows: 40 tasks of fixed CPU work pinned to 4 cores with taskset.
  var MEASURED = {
    "io|f20|100": 506, "io|f200|100": 113, "io|vt|100": 108, "pin|vt|100": 2505,
    "io|f20|1000": 5014, "io|f200|1000": 514, "io|vt|1000": 104, "pin|vt|1000": 25038, "lock|vt|1000": 113,
    "io|f20|10000": 50056, "io|f200|10000": 5020, "io|vt|10000": 119,
    "cpu|f4|40": 819, "cpu|vt|40": 861, "cpu|f200|40": 828
  };
  var TASKS = {
    io: { label: "blocking I/O (sleep 100 ms)", code: "Runnable task = () -> sleep(100);          // stands in for an HTTP or DB call" },
    pin: { label: "I/O inside synchronized", code: "Runnable task = () -> {\n    Object lock = new Object();             // uncontended, one per task\n    synchronized (lock) { sleep(100); }     // Java 21: the virtual thread PINS its carrier\n};" },
    lock: { label: "I/O inside ReentrantLock", code: "Runnable task = () -> {\n    var lock = new ReentrantLock();          // uncontended, one per task\n    lock.lock();\n    try { sleep(100); } finally { lock.unlock(); }   // parks and unmounts: no pinning\n};" },
    cpu: { label: "CPU-bound work", code: "Runnable task = () -> crunchNumbers();     // ~80 ms of pure CPU per task" }
  };
  var EXECS = {
    f20: { label: "fixed pool of 20", conc: 20, code: "Executors.newFixedThreadPool(20)" },
    f200: { label: "fixed pool of 200", conc: 200, code: "Executors.newFixedThreadPool(200)" },
    vt: { label: "virtual thread per task", conc: Infinity, code: "Executors.newVirtualThreadPerTaskExecutor()" }
  };
  var CARRIERS = 4;
  function model(task, ex, n) {
    if (task === "cpu") return { ms: Math.round(n * 82 / CARRIERS), conc: CARRIERS, why: "CPU work needs cores. 4 cores finish the same amount of work in the same time, whatever kind of thread runs it." };
    var conc = EXECS[ex].conc;
    if (ex === "vt" && task === "pin") conc = CARRIERS;
    var waves = conc === Infinity ? 1 : Math.ceil(n / conc);
    var ms = waves * 100 + (conc === Infinity ? Math.round(n / 1000) : 0);
    var why = ex === "vt" ? (task === "pin" ? "Each sleeping virtual thread is stuck to its carrier because it holds a monitor. Only 4 tasks (one per carrier) can wait at a time: " + waves + " waves of 100 ms." :
      "Every task gets its own virtual thread. When it blocks it unmounts and the carrier runs another one, so all " + n + " waits overlap: about one 100 ms wave.") :
      (task === "pin" ? "Platform threads aren't affected by pinning: a monitor around the sleep just holds one of the " + conc + " threads, as before." : "") +
      (task !== "pin" ? "At most " + conc + " tasks can be waiting at once because each holds an OS thread while blocked: " + waves + " wave(s) of 100 ms." : " " + waves + " wave(s) of 100 ms.");
    return { ms: ms, conc: conc, waves: waves, why: why };
  }
  function vtWidget(el, ctx) {
    var s = ctx.state; if (!s.task) { s.task = "io"; s.ex = "vt"; s.n = "1000"; }
    function seg(r, obj) { return "<div class='seg' data-r='" + r + "' style='margin-top:6px'>" + Object.keys(obj).map(function (k) { return "<button type='button' data-v='" + k + "'>" + (obj[k].label || obj[k]) + "</button>"; }).join("") + "</div>"; }
    el.innerHTML = seg("task", TASKS) + seg("ex", EXECS) + seg("n", { "100": "100 tasks", "1000": "1,000 tasks", "10000": "10,000 tasks" }) +
      "<pre class='code' data-r='code' style='margin-top:10px'></pre><div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div>" +
      "<div class='btnrow' style='margin-top:8px'><button type='button' class='btn' data-r='table'>show all recorded runs</button></div><div class='tablewrap' data-r='all'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      ["task", "ex", "n"].forEach(function (k) { q(k).querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", s[k] === b.dataset.v); }); });
      var n = s.task === "cpu" ? 40 : +s.n;
      q("n").style.opacity = s.task === "cpu" ? 0.4 : 1;
      var ex = s.task === "cpu" && s.ex === "f20" ? "f4" : s.ex;
      q("code").innerHTML = ctx.H.highlight(TASKS[s.task].code + "\ntry (var ex = " + (ex === "f4" ? "Executors.newFixedThreadPool(4)" : EXECS[ex].code) + ") {\n    for (int i = 0; i < " + n + "; i++) ex.submit(task);\n}   // close() waits for all tasks", "java");
      var r = model(s.task, ex, n), meas = MEASURED[s.task + "|" + ex + "|" + n];
      var L = ["flowchart LR"];
      if (ex === "vt") {
        L.push("  C[\"4 carrier threads (ForkJoinPool)<br/>" + (s.task === "pin" ? "all 4 pinned: each holds a sleeping VT" : s.task === "cpu" ? "each runs a CPU-bound VT" : "run whichever VTs are ready") + "\"]:::" + (s.task === "pin" ? "bad" : "ok"));
        L.push("  P[\"" + (s.task === "pin" ? (n - CARRIERS) + " VTs queued, not started" : s.task === "cpu" ? (n - CARRIERS) + " VTs waiting for a core" : n + " parked VTs<br/>(stacks on the heap)") + "\"]:::" + (s.task === "io" || s.task === "lock" ? "ok" : "bad"));
        L.push("  P -->|mount| C", "  C -.->|unmount on blocking| P");
      } else {
        var conc = ex === "f4" ? 4 : EXECS[ex].conc;
        L.push("  Q[\"queue: " + Math.max(0, n - conc) + " tasks waiting\"]:::" + (n > conc ? "bad" : "ok"), "  T[\"" + conc + " platform threads<br/>= " + conc + " OS threads, ~1 MB stack each\"]:::ok", "  Q -->|next task when a thread frees| T");
      }
      L.push("  classDef ok fill:#e8f5e9,stroke:#2e7d32", "  classDef bad fill:#ffebee,stroke:#c62828");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("res").innerHTML = ctx.md("**Model: ≈ " + r.ms.toLocaleString() + " ms.** " + (meas ? "**Recorded on JDK 21: " + meas.toLocaleString() + " ms.** " : "(not run on JDK 21; it follows the same pattern) ") + r.why);
    }
    ["task", "ex", "n"].forEach(function (k) { q(k).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s[k] = b.dataset.v; ctx.save(); draw(); }); });
    q("table").addEventListener("click", function () {
      var name = { io: "sleep 100 ms", pin: "sleep in synchronized", lock: "sleep in ReentrantLock", cpu: "CPU work" }, exn = { f4: "fixed 4", f20: "fixed 20", f200: "fixed 200", vt: "virtual" };
      q("all").innerHTML = "<table><thead><tr><th>task</th><th>executor</th><th>tasks</th><th>recorded ms</th><th>model ms</th></tr></thead><tbody>" + Object.keys(MEASURED).map(function (k) {
        var p = k.split("|"); return "<tr><td>" + name[p[0]] + "</td><td>" + exn[p[1]] + "</td><td>" + p[2] + "</td><td>" + MEASURED[k] + "</td><td>" + model(p[0], p[1], +p[2]).ms + "</td></tr>";
      }).join("") + "</tbody></table>";
    });
    draw();
  }

  var SLIDES = [
    { title: "Platform threads vs virtual threads",
      text: "A **platform thread** is a thin wrapper around an OS thread: about 1 MB of reserved stack, kernel scheduling, a few thousand per JVM at most. A **virtual thread** (Java 21, JEP 444) is a `Thread` managed by the JVM: its stack lives on the heap as chunks that grow and shrink, creating one costs about as much as creating a small object, and a JVM can hold **millions**. Same `Thread` API, same blocking code, same debugger and stack traces. What changes is that blocking becomes cheap, so **thread-per-request** scales again without callbacks.",
      m: M(["flowchart LR",
        "  subgraph P[\"Platform threads\"]", "    PT[\"java.lang.Thread\"]:::s1 --> OS1[\"OS thread<br/>~1 MB stack\"]:::s3", "  end",
        "  subgraph V[\"Virtual threads\"]", "    VT1[\"virtual thread\"]:::s2", "    VT2[\"virtual thread\"]:::s2", "    VT3[\"... millions\"]:::s2", "    CT[\"few carrier threads<br/>(ForkJoinPool)\"]:::s1", "    VT1 -.-> CT", "    VT2 -.-> CT", "    VT3 -.-> CT", "    CT --> OS2[\"OS threads = cores\"]:::s3", "  end",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s3 fill:#f3f4f6,stroke:#6b7280"]),
      code: `long t0 = System.nanoTime();
AtomicInteger done = new AtomicInteger();
List<Thread> threads = new ArrayList<>();
for (int i = 0; i < 100_000; i++) threads.add(Thread.ofVirtual().start(() -> { try { Thread.sleep(50); } catch (InterruptedException e) { } done.incrementAndGet(); }));
for (Thread t : threads) t.join();
System.out.println(done.get() + " virtual threads slept 50 ms each in " + (System.nanoTime() - t0) / 1_000_000 + " ms total");`,
      analogy: "Platform threads are taxis: each passenger occupies a car and driver even while waiting at a shop. Virtual threads are passengers with a ride app: when they stop, the car (carrier) leaves to serve someone else and a car picks them up when they're ready." },
    { title: "Carriers, mounting and unmounting",
      text: "Virtual threads run on **carrier threads**: platform threads of a dedicated `ForkJoinPool` sized to the number of cores (`jdk.virtualThreadScheduler.parallelism`). To run, a virtual thread is **mounted** on a carrier. When it blocks on a JDK operation that supports it (sleep, socket I/O, `BlockingQueue`, `ReentrantLock`, `Future.get`), the JVM copies its stack frames to the heap and **unmounts** it; the carrier picks up another ready virtual thread. When the I/O completes, the virtual thread is scheduled again, possibly on a different carrier. Your code sees ordinary blocking calls.",
      m: M(["flowchart LR",
        "  R[\"virtual thread runs<br/>(mounted on carrier)\"]:::s2 -->|blocking call: socket read, sleep, lock| U[\"unmount: frames copied to heap\"]:::s1",
        "  U --> W[\"parked; carrier is free<br/>for other virtual threads\"]:::s3",
        "  W -->|I/O ready / unparked| S[\"scheduled on any free carrier\"]:::s1",
        "  S --> R",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s3 fill:#f3f4f6,stroke:#6b7280"]),
      code: `Thread vt = Thread.ofVirtual().name("order-42").start(() -> {
    Thread me = Thread.currentThread();
    System.out.println("isVirtual=" + me.isVirtual() + ", name=" + me.getName() + ", daemon=" + me.isDaemon());
    System.out.println("toString shows the carrier: " + me.toString().replaceAll("#\\\\d+", "#N").replaceAll("worker-\\\\d+", "worker-K"));
});
vt.join();` },
    { title: "Creating virtual threads",
      text: "Four ways, all returning ordinary `Thread`s. `Thread.startVirtualThread(r)` for one-offs; the **builder** `Thread.ofVirtual().name(\"job-\", 0).start(r)` for names and settings; `Thread.ofVirtual().factory()` for APIs that take a `ThreadFactory`; and most commonly **`Executors.newVirtualThreadPerTaskExecutor()`**, which starts a new virtual thread for every submitted task and fits existing `ExecutorService` code. Virtual threads are always **daemon** threads with normal priority; `setDaemon(false)` throws and priority changes are ignored.",
      code: `Thread a = Thread.startVirtualThread(() -> System.out.println("one-off on " + (Thread.currentThread().isVirtual() ? "virtual" : "platform")));
a.join();
Thread.Builder builder = Thread.ofVirtual().name("job-", 0);
Thread b = builder.start(() -> System.out.println("builder named " + Thread.currentThread().getName()));
Thread c = builder.start(() -> System.out.println("builder named " + Thread.currentThread().getName()));
b.join(); c.join();
ThreadFactory factory = Thread.ofVirtual().name("io-", 1).factory();
try (ExecutorService ex = Executors.newThreadPerTaskExecutor(factory)) { ex.submit(() -> System.out.println("factory thread " + Thread.currentThread().getName())); }
try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
    Future<String> f = ex.submit(() -> "executor task virtual=" + Thread.currentThread().isVirtual());
    System.out.println(f.get());
}` },
    { title: "When they help, and when they don't",
      text: "Virtual threads raise **throughput** for **I/O-bound** work, where tasks spend most time waiting. Little's law: concurrency = throughput × latency; with 200 ms calls and a target of 10,000 requests/s you need 2,000 requests in flight, which a 200-thread pool can't hold but virtual threads can. The widget's recorded runs: 10,000 sleeping tasks took 50 s on 20 threads, 5 s on 200 and 0.12 s on virtual threads. They do **not** make code faster: each task's latency is unchanged, and **CPU-bound** work finishes no sooner, because cores are the limit (all three executors took ~0.82 s for the same CPU work on 4 cores).",
      table: [["Workload", "Virtual threads?", "Why"],
        ["HTTP/DB calls, thread-per-request servers", "Yes", "Blocking is cheap; concurrency no longer capped by pool size"],
        ["Fan-out to many remote services", "Yes", "Simple blocking code instead of async chains"],
        ["CPU-heavy computation", "No gain", "Use a pool sized to cores or parallel streams (J23)"],
        ["Short in-memory tasks", "No gain", "Nothing to wait for; overhead similar"],
        ["Code holding monitors while blocking (Java 21)", "Careful", "Pinning, next slide"]],
      code: `int n = 2_000;
long t0 = System.nanoTime();
try (ExecutorService pool = Executors.newFixedThreadPool(200)) { for (int i = 0; i < n; i++) pool.submit(() -> { Thread.sleep(100); return null; }); }
long pooled = (System.nanoTime() - t0) / 1_000_000;
t0 = System.nanoTime();
try (ExecutorService vt = Executors.newVirtualThreadPerTaskExecutor()) { for (int i = 0; i < n; i++) vt.submit(() -> { Thread.sleep(100); return null; }); }
long virtual = (System.nanoTime() - t0) / 1_000_000;
System.out.println(n + " I/O tasks of 100 ms: pool of 200 → " + (pooled >= 900 ? "~1000 ms (10 waves)" : pooled + " ms") + ", virtual → " + (virtual < 600 ? "under 600 ms (one wave)" : virtual + " ms"));` },
    { title: "Pinning: when a virtual thread can't unmount",
      text: "In Java 21 a virtual thread is **pinned** to its carrier when it blocks **inside a `synchronized` block or method** or inside a **native/foreign call**. It then holds the carrier like a platform thread would. With few carriers this destroys throughput: the widget's recorded run took 25 s instead of 0.1 s for 1,000 tasks on 4 carriers. Fixes: replace `synchronized` around blocking calls with **`ReentrantLock`** (which parks and unmounts), keep critical sections free of I/O, and find culprits with **`-Djdk.tracePinnedThreads=full`** (Java 21) or the JFR event `jdk.VirtualThreadPinned`. **Java 24 (JEP 491)** lets virtual threads unmount inside `synchronized`, so this mostly disappears on newer JDKs; native frames can still pin.",
      m: M(["flowchart LR",
        "  A[\"VT enters synchronized<br/>and calls socket.read()\"]:::s3 --> B{\"Java 21?\"}",
        "  B -->|yes| C[\"pinned: carrier blocked<br/>until read returns\"]:::s4",
        "  B -->|Java 24+| D[\"unmounts normally\"]:::s2",
        "  E[\"same code with ReentrantLock\"]:::s3 --> D",
        "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s3 fill:#f3f4f6,stroke:#6b7280", "  classDef s4 fill:#ffebee,stroke:#c62828"]),
      code: `ReentrantLock lock = new ReentrantLock();
Map<String, String> cache = new HashMap<>();
Function<String, String> loadThroughCache = key -> {
    lock.lock();                           // instead of synchronized: parks and unmounts while waiting
    try {
        return cache.computeIfAbsent(key, k -> { try { Thread.sleep(20); } catch (InterruptedException e) { } return k.toUpperCase(); });   // slow load, e.g. a DB call
    } finally { lock.unlock(); }
};
try (ExecutorService vt = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> fs = new ArrayList<>();
    for (String k : List.of("del", "bom", "del", "blr")) fs.add(vt.submit(() -> loadThroughCache.apply(k)));
    for (Future<String> f : fs) System.out.print(f.get() + " ");
}
System.out.println("| cache size " + cache.size());` },
    { title: "Don't pool virtual threads; limit with semaphores",
      text: "Pools exist because platform threads are expensive. Virtual threads are cheap and meant to be **created per task and discarded**; pooling them adds nothing and breaks assumptions. But pools also quietly **limited concurrency**: a pool of 50 meant at most 50 calls to the database. With virtual threads, 10,000 requests can all hit the downstream at once, so limit resources explicitly: a **`Semaphore`** (J21) as a bulkhead, the connection pool's size (HikariCP still caps connections), or a rate limiter. Limit the **resource**, not the threads.",
      code: `Semaphore dbPermits = new Semaphore(10);                     // the DB tolerates 10 concurrent queries
AtomicInteger inFlight = new AtomicInteger(), maxSeen = new AtomicInteger();
try (ExecutorService vt = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 1_000; i++) vt.submit(() -> {
        dbPermits.acquire();
        try {
            maxSeen.accumulateAndGet(inFlight.incrementAndGet(), Math::max);
            Thread.sleep(5);                                      // query
        } finally { inFlight.decrementAndGet(); dbPermits.release(); }
        return null;
    });
}
System.out.println("1000 virtual threads, max concurrent queries: " + maxSeen.get());`,
      analogy: "Virtual threads remove the bouncer at the restaurant door (the pool). You still need a limit on how many people crowd the kitchen (the database): that's the semaphore." },
    { title: "Migration checklist and pitfalls",
      text: "Switching an executor is one line; the surprises are elsewhere. Review **ThreadLocal** usage (J24): caches of expensive objects no longer work and per-thread values multiply. Look for **pinning** (`synchronized` around I/O on Java 21, native calls). Check **downstream limits**: connection pools, rate limits, file handles. Keep **CPU-bound** work on a bounded platform pool. Thread dumps get huge: use `jcmd <pid> Thread.dump_to_file -format=json file.json`, which includes virtual threads (classic `jstack` doesn't list them). Don't rely on thread priorities or non-daemon behaviour.",
      table: [["Area", "Risk", "Action"],
        ["ThreadLocal caches", "Rebuilt per task, memory grows", "Remove caches, keep context small, consider ScopedValue"],
        ["synchronized + I/O (Java 21)", "Pinning, throughput collapse", "ReentrantLock, -Djdk.tracePinnedThreads=full, or Java 24+"],
        ["Downstream resources", "Overload without the pool limit", "Semaphore, connection pool size, rate limits"],
        ["CPU-heavy tasks", "Starve carriers", "Separate bounded platform pool"],
        ["Observability", "jstack misses virtual threads", "jcmd Thread.dump_to_file, JFR events"]],
      code: `ExecutorService cpuPool = Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());   // CPU work stays bounded
try (ExecutorService io = Executors.newVirtualThreadPerTaskExecutor()) {
    Future<String> result = io.submit(() -> {
        Thread.sleep(30);                                                // remote call on a virtual thread
        Future<Integer> score = cpuPool.submit(() -> IntStream.rangeClosed(1, 1_000_000).map(i -> i % 7).sum());   // hand CPU work to the bounded pool
        return "fetched and scored " + score.get();
    });
    System.out.println(result.get());
}
cpuPool.shutdown();` },
    { title: "Virtual threads in Spring Boot",
      text: "Spring Boot 3.2+ on Java 21 switches its thread usage with one property: **`spring.threads.virtual.enabled=true`**. Tomcat/Jetty then handle each request on a virtual thread, and `@Async`, `@Scheduled`, Kafka/RabbitMQ listeners and `SimpleAsyncTaskExecutor` use virtual threads too. Your controllers keep their blocking style (JDBC, `RestClient`). Measure before and after: the gains come when request threads were mostly waiting on I/O; a CPU-bound service sees none. WebFlux (reactive) solves the same scalability problem with a different, non-blocking programming model (covered in the Spring lessons).",
      lang: "properties",
      noCompile: true,
      code: `# application.properties (Spring Boot 3.2+, Java 21+)
spring.threads.virtual.enabled=true

# keep the DB from being overwhelmed: the connection pool is now the real limit
spring.datasource.hikari.maximum-pool-size=20` },
    { title: "Structured concurrency: StructuredTaskScope",
      text: "Unstructured fan-out (submit tasks, collect futures) leaks: if one subtask fails, the others keep running, and if the parent is cancelled, its children don't know. **Structured concurrency** (JEP 453, preview in Java 21) treats subtasks like a code block: they are **forked inside a scope**, the scope **joins** them all, and the scope ends only when they are done. `StructuredTaskScope.ShutdownOnFailure` cancels the remaining subtasks as soon as one fails and rethrows its exception from `throwIfFailed()`. Thread dumps show the parent-child tree, and scoped values (J24) are inherited by subtasks. Requires `--enable-preview` on 21; in Java 25 the API became `StructuredTaskScope.open()` with `Joiner`s (still preview).",
      m: M(["flowchart TB",
        "  P[\"handle(request) opens scope\"]:::s1 --> F1[\"fork: fetchUser\"]:::s2",
        "  P --> F2[\"fork: fetchOrders\"]:::s2",
        "  F1 --> J[\"scope.join(): wait for both\"]:::s1",
        "  F2 --> J",
        "  F2 -.->|fails| X[\"ShutdownOnFailure cancels fetchUser<br/>throwIfFailed() rethrows\"]:::s4",
        "  J --> R[\"combine results; scope closes<br/>no subtask outlives it\"]:::s2",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#ffebee,stroke:#c62828"]),
      noCompile: true,
      code: `// Java 21 with --enable-preview
record Page(String user, List<String> orders) { }

Page handle(String id) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        StructuredTaskScope.Subtask<String> user = scope.fork(() -> fetchUser(id));
        StructuredTaskScope.Subtask<List<String>> orders = scope.fork(() -> fetchOrders(id));
        scope.join()                 // wait for both (or the first failure)
             .throwIfFailed();       // rethrow the failure; the other subtask is already cancelled
        return new Page(user.get(), orders.get());
    }
}` },
    { title: "First success, deadlines and cancellation",
      text: "`StructuredTaskScope.ShutdownOnSuccess<T>` races subtasks and keeps the **first successful result**, cancelling the rest: query three replicas, take the fastest. `joinUntil(Instant)` adds a **deadline**: when it expires the scope shuts down, interrupting subtasks, and throws `TimeoutException`. Cancellation in both cases is **interruption**, so subtasks must respond to it (blocking JDK calls do). Compared with `CompletableFuture.anyOf`, losers are actually stopped and the code reads top to bottom.",
      noCompile: true,
      code: `// Java 21 with --enable-preview
String fastestQuote(String route) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnSuccess<String>()) {
        scope.fork(() -> quoteFrom("replica-a", route));
        scope.fork(() -> quoteFrom("replica-b", route));
        scope.fork(() -> quoteFrom("replica-c", route));
        scope.joinUntil(Instant.now().plusMillis(500));   // TimeoutException after 500 ms
        return scope.result();                            // first success; the others were interrupted
    }
}` },
    { title: "Without preview: the same shape with executors",
      text: "On a production JDK 21 without preview features, get most of the benefit with a **virtual-thread executor in try-with-resources**: `close()` waits for all tasks, so no task outlives the block. `invokeAll` with a timeout cancels unfinished tasks; `invokeAny` returns the first success and cancels the rest. What you lose versus structured concurrency: automatic cancellation of siblings on failure (do it yourself), and parent-child relationships in thread dumps. Choosing: blocking code on virtual threads for I/O fan-out, `CompletableFuture` (J22) for pipelines and non-blocking APIs, bounded pools or parallel streams for CPU work.",
      code: `try (ExecutorService vt = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Callable<String>> calls = List.of(
        () -> { Thread.sleep(40); return "user=asha"; },
        () -> { Thread.sleep(60); return "orders=3"; },
        () -> { Thread.sleep(5_000); return "recommendations"; });   // too slow
    List<Future<String>> results = vt.invokeAll(calls, 300, TimeUnit.MILLISECONDS);   // unfinished tasks are cancelled
    for (Future<String> f : results) System.out.print((f.isCancelled() ? "timed out" : f.get()) + "; ");
    String fastest = vt.invokeAny(List.of(
        () -> { Thread.sleep(80); return "replica-a"; },
        () -> { Thread.sleep(20); return "replica-b"; }));
    System.out.println("fastest " + fastest);
}` }
  ];

  H.registerLesson({
    code: "J25",
    summary: "Java 21's virtual threads and structured concurrency: platform vs virtual threads, carriers and mounting, the ways to create virtual threads, when they raise throughput (I/O-bound) and when they don't (CPU-bound), pinning and its fixes, why you don't pool them but limit resources with semaphores, a migration checklist, Spring Boot's one-line switch, `StructuredTaskScope` for fork/join with cancellation and deadlines, and how to get the same shape on JDK 21 without preview features.",
    slides: SLIDES,
    widget: { heading: "Interactive: thread pools vs virtual threads", caption: "Pick a task type, an executor and a task count. The model (waves of 100 ms limited by how many tasks can wait at once) matches every run recorded on JDK 21 with 4 carrier threads, including pinning inside `synchronized` and CPU-bound work.", render: vtWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["REST services", "Spring Boot 3.2+ with `spring.threads.virtual.enabled=true` serves many concurrent slow requests without tuning Tomcat's thread pool."],
      ["Aggregator endpoints", "A booking page calls fares, seats and loyalty services in parallel with plain blocking code on virtual threads."],
      ["Batch I/O jobs", "Downloading or calling an API for 100,000 records with one virtual thread each and a semaphore for the rate limit."],
      ["Library upgrades", "JDBC drivers and libraries replaced `synchronized` with `ReentrantLock` around I/O to avoid pinning."],
      ["Incident analysis", "A service migrated to virtual threads overwhelmed its database because the old pool had been an implicit limit."],
      ["Interviews", "\"What are virtual threads, when would you use them, what is pinning?\" is now standard for Java 21 roles."]
    ],
    pitfalls: [
      "Expecting virtual threads to speed up CPU-bound work",
      "Pooling virtual threads or capping them with a fixed pool",
      "Losing the implicit concurrency limit a pool gave the database",
      "Blocking inside synchronized on Java 21 (pinning)",
      "Expensive ThreadLocal caches on per-task virtual threads",
      "Long CPU loops on virtual threads starving carriers",
      "Using jstack and missing virtual threads in dumps",
      "Using preview APIs (StructuredTaskScope, ScopedValue) without --enable-preview",
      "Ignoring interruption in subtasks so cancellation doesn't work"
    ],
    quiz: [
      { q: "What runs a virtual thread's code?", options: ["A dedicated OS thread per virtual thread", "A carrier platform thread it is mounted on while running", "The GC thread", "A separate process"], answer: 1, why: "When it blocks it unmounts, freeing the carrier for other virtual threads." },
      { q: "Which workload benefits most from virtual threads?", options: ["Matrix multiplication", "A service where each request waits on several HTTP and DB calls", "Image compression", "Sorting an in-memory array"], answer: 1, why: "Throughput rises for I/O-bound work; CPU-bound work is limited by cores (the widget's CPU runs all took ~0.82 s)." },
      { q: "On Java 21, what is pinning?", options: ["A virtual thread fixed to one CPU core by affinity", "A virtual thread that can't unmount while blocked inside synchronized or native code, holding its carrier", "Thread priority boosting", "A GC root"], answer: 1, why: "Fix with ReentrantLock or upgrade to Java 24+ (JEP 491)." },
      { q: "10,000 tasks each block for 100 ms. Roughly how long on a fixed pool of 200 platform threads?", options: ["100 ms", "5 seconds", "50 seconds", "1 second"], answer: 1, why: "50 waves of 200 × 100 ms. Recorded: 5,020 ms; virtual threads: 119 ms." },
      { q: "How should you limit concurrent DB queries when using virtual threads?", options: ["Use a fixed pool of virtual threads", "A semaphore or the connection pool's size around the resource", "Thread priorities", "Fewer carriers"], answer: 1, why: "Limit the resource, not the threads." },
      { q: "What does this print?", code: `Thread t = Thread.ofVirtual().unstarted(() -> { });
System.out.println(t.isVirtual() + " " + t.isDaemon());`, options: ["true false", "true true", "false true", "Exception"], answer: 1, why: "Virtual threads are always daemon threads." },
      { q: "What does `StructuredTaskScope.ShutdownOnFailure` do when one subtask throws?", options: ["Ignores it", "Cancels (interrupts) the other subtasks; throwIfFailed() rethrows the failure", "Retries it", "Restarts the JVM"], answer: 1, why: "Subtasks never outlive the scope, and failure stops siblings." },
      { q: "What's the effect of `try (var ex = Executors.newVirtualThreadPerTaskExecutor()) { ... }`?", options: ["Tasks are abandoned on exit", "close() waits for all submitted tasks before the block exits", "close() kills tasks immediately", "Nothing; executors aren't AutoCloseable"], answer: 1, why: "ExecutorService is AutoCloseable since Java 19; close() shuts down and awaits termination." },
      { q: "How do you enable virtual threads for request handling in Spring Boot 3.2+?", options: ["@EnableVirtualThreads", "spring.threads.virtual.enabled=true", "server.tomcat.threads.max=0", "-XX:+VirtualThreads"], answer: 1, why: "Tomcat, @Async, @Scheduled and messaging listeners then use virtual threads." }
    ],
    cheatsheet: {
      table: [
        ["Task", "Code"],
        ["One virtual thread", "`Thread.startVirtualThread(r)` / `Thread.ofVirtual().start(r)`"],
        ["Named", "`Thread.ofVirtual().name(\"job-\", 0).start(r)`"],
        ["Executor", "`try (var ex = Executors.newVirtualThreadPerTaskExecutor()) { … }`"],
        ["Limit a resource", "`Semaphore permits = new Semaphore(10)`"],
        ["Find pinning (21)", "`-Djdk.tracePinnedThreads=full`, JFR `jdk.VirtualThreadPinned`"],
        ["Thread dump", "`jcmd <pid> Thread.dump_to_file -format=json out.json`"],
        ["Spring Boot", "`spring.threads.virtual.enabled=true`"],
        ["Structured (21 preview)", "`new StructuredTaskScope.ShutdownOnFailure()`, fork, join, throwIfFailed"]],
      cards: [
        { title: "Use virtual threads for", items: ["Thread-per-request servers", "I/O fan-out", "Blocking-style code at scale", "Many concurrent waits"] },
        { title: "Watch out for", items: ["CPU-bound work", "synchronized + I/O on 21", "ThreadLocal caches", "Downstream overload", "Pooling them"] },
        { title: "Say in interviews", items: ["Cheap, JVM-scheduled, heap stacks", "Unmount on blocking", "Throughput not latency", "Pinning and JEP 491", "Structured concurrency = scoped fork/join"] }]
    },
    practice: [
      { level: "Easy", q: "What are virtual threads and how do they differ from platform threads?",
        a: ["Virtual threads (Java 21, JEP 444) are `Thread`s scheduled by the JVM, not the OS.",
          "Their stacks live on the heap and grow as needed; creation is cheap; millions can exist.",
          "They run mounted on a small pool of carrier platform threads and unmount when they block.",
          "Platform threads map 1:1 to OS threads with ~1 MB stacks, so only thousands are practical.",
          "Same API and blocking programming model; always daemon."] },
      { level: "Easy", q: "Run 10,000 tasks that each call a slow service (sleep 100 ms) and report the total time.",
        a: ["Use a virtual-thread-per-task executor in try-with-resources.",
          "close() waits for all tasks.",
          "All waits overlap, so the total is close to one wait."],
        code: `long t0 = System.nanoTime();
AtomicInteger ok = new AtomicInteger();
try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 10_000; i++) ex.submit(() -> { Thread.sleep(100); ok.incrementAndGet(); return null; });
}
long ms = (System.nanoTime() - t0) / 1_000_000;
System.out.println(ok.get() + " calls finished " + (ms < 2_000 ? "in well under 2 s" : "in " + ms + " ms"));` },
      { level: "Easy", q: "When would virtual threads not help?",
        a: ["CPU-bound work: cores are the limit, so use a pool sized to cores or parallel streams.",
          "When the bottleneck is a downstream resource (DB with 20 connections).",
          "Short in-memory tasks with no blocking.",
          "Code that pins carriers heavily on Java 21 until fixed."] },
      { level: "Medium", q: "Explain pinning, how to detect it, and how to fix it.",
        a: ["A pinned virtual thread can't unmount when it blocks, so it holds its carrier.",
          "Java 21 causes: blocking inside synchronized blocks/methods, and native/foreign frames.",
          "Detect: -Djdk.tracePinnedThreads=full prints stack traces; JFR event jdk.VirtualThreadPinned.",
          "Fix: use ReentrantLock around blocking work, keep I/O out of critical sections, update libraries, or run Java 24+ where synchronized no longer pins (JEP 491)."] },
      { level: "Medium", q: "Your team enables virtual threads and the database starts timing out. Why, and what do you do?",
        a: ["The old Tomcat pool (e.g. 200 threads) implicitly capped concurrent DB work.",
          "With virtual threads every request proceeds, so thousands wait for connections or hit the DB at once.",
          "Fix: bound access explicitly (semaphore bulkhead, HikariCP pool size with a sensible connection timeout), add rate limiting and load shedding.",
          "Monitor pool wait time and DB load; size limits from the DB's capacity."],
        code: `Semaphore db = new Semaphore(20);
AtomicInteger peak = new AtomicInteger(), now = new AtomicInteger(), shed = new AtomicInteger();
try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 2_000; i++) ex.submit(() -> {
        if (!db.tryAcquire(50, TimeUnit.MILLISECONDS)) { shed.incrementAndGet(); return null; }   // fail fast instead of piling up
        try { peak.accumulateAndGet(now.incrementAndGet(), Math::max); Thread.sleep(2); }
        finally { now.decrementAndGet(); db.release(); }
        return null;
    });
}
System.out.println("peak concurrent queries " + peak.get() + " (limit 20); shed " + shed.get() + " requests that waited over 50 ms");` },
      { level: "Medium", q: "Why shouldn't you pool virtual threads?",
        a: ["Pools amortise expensive creation; virtual threads are cheap.",
          "Pooling caps concurrency and reintroduces queueing, losing the benefit.",
          "Reuse brings back ThreadLocal leakage problems.",
          "If the goal is limiting concurrency, use a semaphore around the resource."] },
      { level: "Medium", q: "What is structured concurrency, and what problem does it solve?",
        a: ["Subtasks are forked inside a scope and joined before the scope exits, like a block of code.",
          "If one fails (ShutdownOnFailure) the others are cancelled; on success (ShutdownOnSuccess) losers are cancelled.",
          "Cancelling the parent cancels children; nothing leaks or runs orphaned.",
          "Observability: thread dumps show the task tree; scoped values are inherited.",
          "Preview in Java 21 (JEP 453); API reshaped with Joiners in Java 25, still preview."] },
      { level: "Hard", q: "Implement a fan-out on JDK 21 without preview APIs: call three services in parallel, fail fast if any fails, cancelling the others.",
        a: ["Submit the calls to a virtual-thread executor.",
          "Use an ExecutorCompletionService to take results as they finish.",
          "On the first failure, cancel the remaining futures (interrupting them) and rethrow.",
          "try-with-resources ensures nothing outlives the block."],
        code: `try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
    CompletionService<String> cs = new ExecutorCompletionService<>(ex);
    List<Future<String>> fs = List.of(
        cs.submit(() -> { Thread.sleep(30); return "user"; }),
        cs.submit(() -> { Thread.sleep(10); throw new IllegalStateException("orders service down"); }),
        cs.submit(() -> { Thread.sleep(5_000); return "recommendations"; }));
    try {
        for (int i = 0; i < fs.size(); i++) System.out.println("got " + cs.take().get());
    } catch (ExecutionException e) {
        fs.forEach(f -> f.cancel(true));                          // stop the siblings
        System.out.println("failed fast: " + e.getCause().getMessage() + "; slow call cancelled=" + fs.get(2).isCancelled());
    }
}` },
      { level: "Hard", q: "Compare virtual threads with reactive programming (WebFlux, CompletableFuture chains).",
        a: ["Both scale I/O-bound concurrency without one OS thread per waiting request.",
          "Virtual threads keep imperative, blocking code: readable stack traces, debugging, try/catch, existing JDBC.",
          "Reactive needs non-blocking libraries end to end, adds operators and backpressure, and is harder to debug, but offers streaming and backpressure natively.",
          "Neither helps CPU-bound work.",
          "For new request/response services on Java 21, virtual threads are usually simpler; reactive still fits streaming and event pipelines."] },
      { level: "Hard", q: "Plan the migration of a Spring Boot service to virtual threads.",
        steps: ["Baseline: measure throughput, latency, thread counts and DB pool waits under load.",
          "Upgrade to Java 21+ and Spring Boot 3.2+; set spring.threads.virtual.enabled=true in a test environment.",
          "Scan for pinning with -Djdk.tracePinnedThreads=full / JFR; replace synchronized around I/O or move to Java 24+.",
          "Review ThreadLocal caches and context propagation; keep CPU-heavy work on a bounded pool.",
          "Add explicit limits for downstreams (Hikari size, semaphores, rate limits); load test, compare to baseline, roll out gradually with monitoring."] }
    ],
    recap: [
      "Virtual threads are cheap JVM-scheduled threads that unmount from carriers when they block.",
      "They raise throughput for I/O-bound work; they don't make code or CPU work faster.",
      "On Java 21 avoid blocking inside synchronized (pinning); Java 24 removes most of it.",
      "Don't pool them; limit resources with semaphores and connection pools.",
      "Structured concurrency scopes subtasks: fork, join, cancel siblings, no orphans."
    ]
  });
})();
