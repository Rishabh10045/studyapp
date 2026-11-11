/* Lesson F27: Threads & executors */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var CORE = 2, MAX = 4, QCAP = 2;
  function poolWidget(el, ctx) {
    var s = ctx.state; if (!s.w) { s.w = []; s.q = []; s.rej = []; s.next = 1; s.log = []; s.pol = 0; s.done = 0; }
    var POL = ["AbortPolicy", "CallerRunsPolicy", "DiscardOldestPolicy"];
    el.innerHTML = "<p>" + ctx.md("A `ThreadPoolExecutor(core = 2, max = 4, queue = ArrayBlockingQueue(2))`. On `execute(task)` it: **1)** starts a new core thread if fewer than 2 are running; **2)** otherwise queues the task if the queue has room; **3)** otherwise starts a non-core thread up to 4; **4)** otherwise applies the rejection policy. Surprise for most people: extra threads are created only when the **queue is full**.") + "</p>" +
      "<div class='field'>Rejection policy</div><div class='seg' data-r='pol'></div>" +
      "<div class='btnrow' style='margin-top:8px'><button type='button' class='btn primary' data-r='sub'>execute(task)</button><button type='button' class='btn' data-r='fin'>a worker finishes its task</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
      "<div class='diagram' data-r='dg'></div><pre class='code' data-r='log'></pre><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    var last = "";
    function submit() {
      var t = "T" + s.next++;
      if (s.w.length < CORE) { s.w.push({ t: t, core: true }); last = t + ": workers < core → new core thread runs it"; }
      else if (s.q.length < QCAP && s.w.some(function (x) { return !x.t; })) { s.w.filter(function (x) { return !x.t; })[0].t = t; last = t + ": offered to the queue → an idle worker blocked in take() picks it up at once"; }
      else if (s.q.length < QCAP) { s.q.push(t); last = t + ": core threads busy → queued (" + s.q.length + "/" + QCAP + ")"; }
      else if (s.w.length < MAX) { s.w.push({ t: t, core: false }); last = t + ": queue full, workers < max → new NON-core thread runs it"; }
      else if (s.pol === 0) { s.rej.push(t); last = t + ": queue full and max threads → RejectedExecutionException"; }
      else if (s.pol === 1) { last = t + ": saturated → CallerRunsPolicy: the submitting thread runs it itself (slows the producer: back-pressure)"; s.done++; }
      else { var old = s.q.shift(); s.q.push(t); s.rej.push(old); last = t + ": saturated → DiscardOldestPolicy drops queued " + old + " and queues " + t; }
      s.log.push(last);
    }
    function finish() {
      var busy = s.w.filter(function (x) { return x.t; });
      if (!busy.length) { last = "no running task to finish"; s.log.push(last); return; }
      var w = busy[0], was = w.t; s.done++;
      if (s.q.length) { w.t = s.q.shift(); last = was + " done → its thread takes " + w.t + " from the queue"; }
      else if (!w.core) { s.w.splice(s.w.indexOf(w), 1); last = was + " done → queue empty; idle non-core thread exits after keepAliveTime"; }
      else { w.t = null; last = was + " done → core thread waits on queue.take()"; }
      s.log.push(last);
    }
    function draw() {
      q("pol").innerHTML = POL.map(function (p, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.pol ? "on" : "") + "'>" + p + "</button>"; }).join("");
      var L = ["flowchart LR", "  S([\"submit\"]) --> Q", "  subgraph Q[\"queue " + s.q.length + "/" + QCAP + "\"]"];
      if (!s.q.length) L.push("    qe[\"(empty)\"]:::s4");
      s.q.forEach(function (t, i) { L.push("    q" + i + "[\"" + t + "\"]:::s1"); });
      L.push("  end", "  subgraph P[\"workers " + s.w.length + "/" + MAX + " (core " + CORE + ")\"]");
      s.w.forEach(function (w, i) { L.push("    w" + i + "[\"" + (w.core ? "core-" : "extra-") + (i + 1) + "<br/><b>" + (w.t || "idle") + "</b>\"]:::" + (w.t ? (w.core ? "s0" : "s2") : "s4")); });
      if (!s.w.length) L.push("    we[\"(no threads yet)\"]:::s4");
      L.push("  end", "  Q --> P");
      if (s.rej.length) L.push("  R[\"rejected / dropped<br/>" + s.rej.slice(-4).join(", ") + "\"]:::bad", "  S -.-> R");
      L.push("  classDef s0 fill:#dbeafe,stroke:#2563eb", "  classDef s1 fill:#fff3e0,stroke:#ef6c00", "  classDef s2 fill:#ede9fe,stroke:#7c3aed", "  classDef s4 fill:#f5f5f5,stroke:#bdbdbd,color:#888", "  classDef bad fill:#ffebee,stroke:#c62828");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("log").textContent = (s.log.slice(-7).join("\n")) || "Press execute(task) a few times.";
      var res = q("res"), sat = s.w.length === MAX && s.q.length === QCAP;
      res.className = "result " + (s.rej.length ? "err" : sat ? "warn" : "");
      res.innerHTML = "<p>" + ctx.md("Running " + s.w.filter(function (x) { return x.t; }).length + ", queued " + s.q.length + ", completed " + s.done + ", rejected/dropped " + s.rej.length + ". " + (sat ? "The pool is **saturated**: the next task triggers the rejection policy." : "With an **unbounded** queue (`Executors.newFixedThreadPool`) step 3 never happens and the queue can grow until memory runs out.")) + "</p>";
    }
    q("pol").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b) return; s.pol = Number(b.getAttribute("data-i")); ctx.save(); draw(); });
    q("sub").addEventListener("click", function () { submit(); ctx.save(); draw(); });
    q("fin").addEventListener("click", function () { finish(); ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.w = []; s.q = []; s.rej = []; s.next = 1; s.log = []; s.done = 0; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Why concurrency shows up in LLD rounds",
      text: "Machine-coding rounds increasingly end with **\"now make it thread-safe\"** or **\"what if 1,000 users book at once?\"**. Parking lots, booking systems, rate limiters, caches, loggers and wallets all have shared mutable state. You need the vocabulary (thread, pool, race, visibility, lock) and a handful of JDK tools to answer confidently. This module covers them in five lessons: threads and executors (here), locks (F28), thread-safe singletons (F29), producer–consumer (F30) and concurrent collections (F31).",
      table: [
        ["", "Process", "Thread"],
        ["Memory", "Own address space", "Shares heap with other threads of the process; own stack"],
        ["Creation cost", "High (fork/exec, new JVM)", "Lower (but a platform thread still reserves ~1 MB stack by default)"],
        ["Communication", "IPC: sockets, pipes, files", "Shared objects (needs synchronisation)"],
        ["Failure isolation", "A crash doesn't kill others", "An uncaught `OutOfMemoryError` can bring down the whole JVM"],
        ["Java", "`ProcessBuilder`, separate JVMs/services", "`Thread`, executors, virtual threads"]],
      points: [
        "**Concurrency**: dealing with many things at once (interleaving); **parallelism**: doing many things at the same instant (multiple cores)",
        "Threads share the heap: objects reachable from two threads need a thread-safety story",
        "Each Java platform thread maps to an OS thread; Java 21 **virtual threads** are cheap JVM-managed threads multiplexed over a few carriers"],
      analogy: "A restaurant (process) with several cooks (threads) sharing one kitchen, fridge and order rail (the heap). More cooks get more done, until two reach for the same pan at once. Another restaurant across the road is a separate process: it has its own kitchen and must phone in to share anything." },
    { title: "Thread lifecycle",
      text: "`Thread.getState()` reports one of six states. Knowing which calls move a thread between them helps diagnose hangs from a thread dump (`jstack`): many threads `BLOCKED` on one monitor means lock contention; `WAITING` in `take()` means idle workers; `RUNNABLE` in a loop means a busy thread.",
      m: M(["stateDiagram-v2",
        "  [*] --> NEW",
        "  NEW --> RUNNABLE : start()",
        "  RUNNABLE --> BLOCKED : waiting to enter synchronized",
        "  BLOCKED --> RUNNABLE : monitor acquired",
        "  RUNNABLE --> WAITING : wait() / join() / park()",
        "  WAITING --> RUNNABLE : notify() / target ends / unpark()",
        "  RUNNABLE --> TIMED_WAITING : sleep(ms) / wait(ms) / join(ms)",
        "  TIMED_WAITING --> RUNNABLE : timeout / notify",
        "  RUNNABLE --> TERMINATED : run() returns or throws",
        "  TERMINATED --> [*]"]),
      code: `Object lock = new Object();
Thread sleeper = new Thread(() -> { try { Thread.sleep(300); } catch (InterruptedException e) { } }, "sleeper");
Thread waiter = new Thread(() -> { synchronized (lock) { try { lock.wait(); } catch (InterruptedException e) { } } }, "waiter");
System.out.println("before start: " + sleeper.getState());
sleeper.start(); waiter.start();
Thread.sleep(100);
System.out.println("sleeping: " + sleeper.getState() + ", waiting: " + waiter.getState());
synchronized (lock) { lock.notifyAll(); }
sleeper.join(); waiter.join();
System.out.println("after join: " + sleeper.getState() + ", " + waiter.getState());`,
      points: ["`RUNNABLE` includes \"ready but not scheduled\" and \"blocked in I/O\"; Java doesn't distinguish them", "Calling `run()` instead of `start()` runs the code on the **current** thread: a classic bug", "`start()` twice throws `IllegalThreadStateException`"] },
    { title: "Runnable, Callable and Future",
      text: "`Runnable` is a task that returns nothing and can't throw checked exceptions. `Callable<V>` returns a value and may throw. Submitting a `Callable` to an executor gives a `Future<V>`: a handle to a result that may not exist yet. `get()` blocks (use the timeout overload), `cancel(true)` interrupts, and exceptions thrown by the task come back wrapped in `ExecutionException`.",
      code: `ExecutorService pool = Executors.newFixedThreadPool(2);
Callable<Integer> fareA = () -> { Thread.sleep(50); return 4_850; };          // IndiGo quote
Callable<Integer> fareB = () -> { Thread.sleep(80); return 5_120; };          // Air India quote
Callable<Integer> broken = () -> { throw new IllegalStateException("quote API 503"); };

Future<Integer> a = pool.submit(fareA), b = pool.submit(fareB), c = pool.submit(broken);
System.out.println("cheapest: ₹" + Math.min(a.get(1, TimeUnit.SECONDS), b.get(1, TimeUnit.SECONDS)));
try { c.get(); } catch (ExecutionException e) { System.out.println("task failed: " + e.getCause().getMessage()); }

Runnable audit = () -> System.out.println("audit log on " + Thread.currentThread().getName());
pool.submit(audit).get();                                                      // Future<?> just signals completion
pool.shutdown();
System.out.println("terminated: " + pool.awaitTermination(1, TimeUnit.SECONDS));`,
      points: ["Prefer `ExecutorService` over `new Thread()` in application code: pooling, naming, shutdown, futures", "`Future.get()` without a timeout can hang forever if the task never finishes", "Extending `Thread` couples the task to the thread mechanism: implement `Runnable`/`Callable` instead"] },
    { title: "ExecutorService and the standard pools",
      text: "An executor decouples **submitting** work from **how** it runs (which thread, when, how many at once). The `Executors` factory methods are convenient, but read what they build: two of them hide unbounded queues or unbounded thread counts.",
      table: [
        ["Factory", "Builds", "Watch out"],
        ["`newFixedThreadPool(n)`", "n threads, **unbounded** `LinkedBlockingQueue`", "Queue can grow without limit under overload → OOM"],
        ["`newCachedThreadPool()`", "0..∞ threads, `SynchronousQueue`, 60 s idle timeout", "Unbounded threads under a burst of slow tasks"],
        ["`newSingleThreadExecutor()`", "1 thread, unbounded queue", "Serial execution, ordering guaranteed; same OOM risk"],
        ["`newScheduledThreadPool(n)`", "Delayed and periodic tasks", "A periodic task that throws silently stops repeating"],
        ["`newWorkStealingPool()` / `ForkJoinPool`", "Work-stealing for many small CPU tasks", "Backs parallel streams and default `CompletableFuture` async"],
        ["`newVirtualThreadPerTaskExecutor()` (Java 21)", "One cheap virtual thread per task", "Great for blocking I/O; still limit downstream concurrency with a semaphore"]],
      code: `ExecutorService pool = Executors.newFixedThreadPool(3, r -> {
    Thread t = new Thread(r); t.setName("invoice-" + t.getId()); return t;   // name your threads
});
List<Callable<String>> jobs = new ArrayList<>();
for (String order : List.of("ORD-1", "ORD-2", "ORD-3", "ORD-4", "ORD-5"))
    jobs.add(() -> { Thread.sleep(30); return order + " invoiced"; });
long t0 = System.nanoTime();
for (Future<String> f : pool.invokeAll(jobs)) System.out.println(f.get());     // waits for all, keeps order
long ms = (System.nanoTime() - t0) / 1_000_000;
System.out.println("5 jobs × 30 ms on 3 threads: " + (ms < 120 ? "about two rounds (~60 ms)" : ms + " ms") + ", not 150 ms sequentially");

pool.shutdown();                                                               // stop accepting, finish queued
if (!pool.awaitTermination(2, TimeUnit.SECONDS)) pool.shutdownNow();         // then interrupt stragglers`,
      points: ["Always shut pools down: non-daemon worker threads keep the JVM alive", "`shutdown()` = graceful; `shutdownNow()` = interrupt running tasks and return the queued ones", "`invokeAll` waits for all; `invokeAny` returns the first successful result and cancels the rest"] },
    { title: "Inside ThreadPoolExecutor: core, max, queue, rejection",
      text: "Every standard pool is a `ThreadPoolExecutor` with five knobs. Production services should build one explicitly with a **bounded** queue and a deliberate rejection policy, so overload produces back-pressure or fast failure instead of an out-of-memory crash. Try the widget at the end of the lesson to see the order of decisions.",
      m: M(["flowchart TB",
        "  A([\"execute(task)\"]) --> B{\"running &lt; core?\"}",
        "  B -->|yes| C[\"start core thread with task\"]:::s0",
        "  B -->|no| D{\"queue.offer(task)?\"}",
        "  D -->|yes| E[\"queued; a worker will take() it\"]:::s1",
        "  D -->|\"no (full)\"| F{\"running &lt; max?\"}",
        "  F -->|yes| G[\"start non-core thread with task\"]:::s2",
        "  F -->|no| H[\"RejectedExecutionHandler\"]:::bad"]),
      code: `ThreadPoolExecutor pool = new ThreadPoolExecutor(
    2, 4,                                       // core, max threads
    30, TimeUnit.SECONDS,                       // idle non-core threads die after 30 s
    new ArrayBlockingQueue<>(2),                // bounded queue
    new ThreadPoolExecutor.CallerRunsPolicy()); // saturated: submitter runs the task (back-pressure)
CountDownLatch release = new CountDownLatch(1);
for (int i = 1; i <= 7; i++) {
    int id = i;
    pool.execute(() -> {
        if (id <= 6) try { release.await(); } catch (InterruptedException e) { }    // keep pool threads busy
        System.out.println("task " + id + " ran on " + (Thread.currentThread().getName().startsWith("main") ? "main (caller runs)" : "pool"));
    });
}
System.out.println("threads=" + pool.getPoolSize() + " queued=" + pool.getQueue().size());
release.countDown(); pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS);`,
      points: ["Tasks 1–2 start core threads, 3–4 queue, 5–6 start extra threads, 7 is run by the caller", "Policies: `AbortPolicy` (default, throws), `CallerRunsPolicy`, `DiscardPolicy`, `DiscardOldestPolicy`, or your own (log + metric + 429)", "Size CPU-bound pools ≈ number of cores; I/O-bound pools ≈ cores × (1 + wait time / compute time)"] },
    { title: "CompletableFuture: composing async work",
      text: "`Future` can only block. `CompletableFuture` lets you **chain** (`thenApply`, `thenCompose`), **combine** (`thenCombine`, `allOf`, `anyOf`), **recover** (`exceptionally`, `handle`) and **time out** (`orTimeout`, `completeOnTimeout`) without blocking threads in between. Pass your own executor for I/O work; the default is the shared `ForkJoinPool.commonPool()`, sized for CPU tasks.",
      code: `static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { throw new RuntimeException(e); } }

ExecutorService io = Executors.newFixedThreadPool(4);
record Quote(String airline, int fare) {}
CompletableFuture<Quote> indigo = CompletableFuture.supplyAsync(() -> { sleep(60); return new Quote("IndiGo", 4850); }, io);
CompletableFuture<Quote> airIndia = CompletableFuture.supplyAsync(() -> { sleep(90); return new Quote("Air India", 5120); }, io);
CompletableFuture<Quote> akasa = CompletableFuture.supplyAsync(() -> { sleep(2000); return new Quote("Akasa", 4300); }, io)
    .completeOnTimeout(new Quote("Akasa", Integer.MAX_VALUE), 200, TimeUnit.MILLISECONDS);   // too slow: ignore
CompletableFuture<Quote> spice = CompletableFuture.<Quote>supplyAsync(() -> { throw new RuntimeException("503"); }, io)
    .exceptionally(ex -> new Quote("SpiceJet", Integer.MAX_VALUE));                           // failed: ignore

List<CompletableFuture<Quote>> all = List.of(indigo, airIndia, akasa, spice);
Quote best = CompletableFuture.allOf(all.toArray(new CompletableFuture[0]))
    .thenApply(v -> all.stream().map(CompletableFuture::join).min(Comparator.comparingInt(Quote::fare)).orElseThrow())
    .get(1, TimeUnit.SECONDS);
System.out.println("best fare: " + best.airline() + " ₹" + best.fare());
CompletableFuture<String> withTax = indigo.thenApply(q -> q.fare() * 105 / 100).thenApply(f -> "IndiGo with 5% GST: ₹" + f);
System.out.println(withTax.join());
io.shutdownNow();`,
      points: ["`thenApply` maps a value; `thenCompose` flattens a function that itself returns a future (like `flatMap`)", "`join()` throws unchecked `CompletionException`; `get()` throws checked `ExecutionException`", "Every stage after a failure is skipped until an `exceptionally`/`handle`: always end chains with error handling"] },
    { title: "Race conditions: lost updates and check-then-act",
      text: "A **race condition** is a bug whose outcome depends on thread timing. `count++` looks atomic but is three steps (read, add, write); two threads can read the same value and one increment is lost. **Check-then-act** (`if (seat.isFree()) seat.book(user)`) is the LLD version: two users both see the seat free and both book it. The fix is to make the compound action **atomic**: a lock, an atomic class, or a single atomic operation on a concurrent collection.",
      code: `class Counter { int n; void inc() { n++; } }                                   // read-modify-write: not atomic
class SafeCounter { private final AtomicInteger n = new AtomicInteger(); void inc() { n.incrementAndGet(); } int get() { return n.get(); } }
Counter c = new Counter(); SafeCounter s = new SafeCounter();
Runnable work = () -> { for (int i = 0; i < 100_000; i++) { c.inc(); s.inc(); } };
Thread t1 = new Thread(work), t2 = new Thread(work); t1.start(); t2.start(); t1.join(); t2.join();
System.out.println("plain int: " + c.n + (c.n < 200_000 ? "  (lost updates!)" : "  (got lucky this run)"));
System.out.println("AtomicInteger: " + s.get());

Map<String, String> seats = new ConcurrentHashMap<>();                       // check-then-act fixed with one atomic call
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<Boolean>> tries = new ArrayList<>();
for (int u = 0; u < 8; u++) { String user = "user" + u; tries.add(pool.submit(() -> seats.putIfAbsent("A12", user) == null)); }
int winners = 0; for (Future<Boolean> f : tries) if (f.get()) winners++;
System.out.println("seat A12 booked by " + seats.get("A12").replaceAll("\\\\d", "#") + ", winners = " + winners);
pool.shutdown();`,
      points: ["Data race (unsynchronised access to shared memory, a Java Memory Model term) vs race condition (logic bug from timing): related but not identical", "Races may not show in tests; reason about them, don't rely on running the code", "Shared **immutable** objects need no synchronisation: prefer immutability (records, `List.copyOf`)"] },
    { title: "Visibility and happens-before",
      text: "Even without lost updates, one thread may **never see** another's write: the JIT can keep a field in a register, and CPUs reorder memory operations. The Java Memory Model guarantees visibility only along **happens-before** edges. If thread A's write happens-before thread B's read, B sees it; otherwise anything goes.",
      table: [
        ["Happens-before rule", "Meaning"],
        ["Program order", "Within one thread, earlier actions happen-before later ones"],
        ["Monitor lock", "Unlocking a monitor happens-before every later lock of the same monitor"],
        ["`volatile`", "A write to a volatile field happens-before every later read of it"],
        ["Thread start / join", "`t.start()` happens-before t's actions; t's actions happen-before `t.join()` returns"],
        ["Executor / concurrent collections", "Submitting a task happens-before it runs; `queue.put` happens-before the matching `take`; `future.get()` sees the task's writes"],
        ["Transitivity", "A hb B and B hb C ⇒ A hb C"]],
      code: `class Worker implements Runnable {
    private volatile boolean running = true;                                    // without volatile the loop may never stop
    long iterations;
    public void run() { while (running) iterations++; }
    void stop() { running = false; }
}
Worker w = new Worker(); Thread t = new Thread(w); t.start();
Thread.sleep(50); w.stop(); t.join(1000);
System.out.println("stopped: " + !t.isAlive() + " after " + (w.iterations > 0 ? "many" : "no") + " iterations");`,
      points: ["`volatile` gives visibility and ordering, **not** atomicity: `volatile int count; count++` still loses updates", "Publishing an object safely: final fields, a volatile/atomic reference, a lock, or a concurrent collection", "More on locks and atomics in F28; the DCL singleton (F29) is the classic visibility bug"] },
    { title: "Interruption, cancellation and virtual threads",
      text: "Java has no safe way to kill a thread. Cancellation is **cooperative**: `thread.interrupt()` (or `future.cancel(true)`, `shutdownNow()`) sets a flag; blocking calls like `sleep`, `wait`, `join` and `BlockingQueue.take` throw `InterruptedException`; loops should check `Thread.currentThread().isInterrupted()`. Never swallow the exception silently: either propagate it or restore the flag.",
      code: `Thread downloader = new Thread(() -> {
    int chunks = 0;
    try {
        while (!Thread.currentThread().isInterrupted()) { Thread.sleep(20); chunks++; }   // blocking call is an interruption point
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();                                       // restore the flag for callers
    }
    System.out.println("download cancelled after " + (chunks > 0 ? "some" : "zero") + " chunks, cleaned up temp file");
});
downloader.start(); Thread.sleep(70); downloader.interrupt(); downloader.join();

try (ExecutorService vt = Executors.newVirtualThreadPerTaskExecutor()) {         // Java 21: a thread per task is cheap
    List<Future<Integer>> calls = new ArrayList<>();
    for (int i = 0; i < 10_000; i++) calls.add(vt.submit(() -> { Thread.sleep(50); return 1; }));   // 10k blocking "I/O" calls
    int ok = 0; for (Future<Integer> f : calls) ok += f.get();
    System.out.println(ok + " blocking calls completed on virtual threads");
}`,
      points: ["Virtual threads (Java 21) make thread-per-request cheap for **blocking I/O**; they don't make CPU-bound work faster", "Don't pool virtual threads; limit concurrency to a downstream resource with a `Semaphore`", "Prior to JDK 24, blocking inside `synchronized` pins the carrier thread; prefer `ReentrantLock` around long blocking calls on older JDKs"] },
    { title: "Mini LLD: an async notification dispatcher",
      text: "After an order is placed, the service must send SMS, email and push notifications without slowing the checkout API. Requirements: checkout returns immediately; at most 8 concurrent provider calls; retries with back-off for transient failures; overload must not crash the JVM; graceful shutdown drains in-flight work.",
      m: H.cd(["classDiagram",
        "  class NotificationDispatcher { -ThreadPoolExecutor pool; -Map~Channel,Sender~ senders; +dispatch(Notification n) CompletableFuture~Result~; +shutdown(Duration grace) }",
        "  class Sender { <<interface>>; +send(Notification n) Result }",
        "  class SmsSender", "  class EmailSender", "  class PushSender",
        "  class RetryPolicy { -int maxAttempts; -Duration baseDelay; +delay(int attempt) Duration }",
        "  class Notification { <<record>>; +String orderId; +Channel channel; +String to; +String body }",
        "  Sender <|.. SmsSender", "  Sender <|.. EmailSender", "  Sender <|.. PushSender",
        "  NotificationDispatcher --> Sender", "  NotificationDispatcher --> RetryPolicy", "  NotificationDispatcher ..> Notification"]),
      code: `enum Channel { SMS, EMAIL, PUSH }
record Notification(String orderId, Channel channel, String to) {}
interface Sender { void send(Notification n) throws Exception; }
class NotificationDispatcher {
    private final ThreadPoolExecutor pool = new ThreadPoolExecutor(4, 8, 30, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(100), r -> { Thread t = new Thread(r, "notify"); t.setDaemon(true); return t; },
        new ThreadPoolExecutor.AbortPolicy());                                  // overload: fail fast, caller decides
    private final Map<Channel, Sender> senders;
    NotificationDispatcher(Map<Channel, Sender> s) { senders = s; }
    CompletableFuture<String> dispatch(Notification n) {
        return CompletableFuture.supplyAsync(() -> {
            for (int attempt = 1; ; attempt++) {
                try { senders.get(n.channel()).send(n); return n.channel() + " ok (attempt " + attempt + ")"; }
                catch (Exception e) {
                    if (attempt == 3) return n.channel() + " FAILED after 3 attempts: " + e.getMessage();
                    try { Thread.sleep(10L << attempt); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); return "interrupted"; }
                }
            }
        }, pool);
    }
    void shutdown() throws InterruptedException { pool.shutdown(); if (!pool.awaitTermination(2, TimeUnit.SECONDS)) pool.shutdownNow(); }
}

AtomicInteger smsCalls = new AtomicInteger();
Sender flakySms = n -> { if (smsCalls.incrementAndGet() < 3) throw new IOException("gateway timeout"); };
Sender email = n -> { };
Sender push = n -> { throw new IllegalStateException("device token expired"); };
NotificationDispatcher d = new NotificationDispatcher(Map.of(Channel.SMS, flakySms, Channel.EMAIL, email, Channel.PUSH, push));
List<CompletableFuture<String>> fs = Stream.of(Channel.values()).map(ch -> d.dispatch(new Notification("ORD-77", ch, "asha"))).toList();
System.out.println("checkout returned immediately; results:");
for (CompletableFuture<String> f : fs) System.out.println("  " + f.get(2, TimeUnit.SECONDS));
d.shutdown();`,
      points: [
        "Bounded queue + `AbortPolicy`: when the queue is full, `dispatch` throws `RejectedExecutionException`; the caller can store the notification in an outbox table to retry later",
        "Retry only transient errors (timeouts, 5xx); an expired device token should not be retried (classify exceptions)",
        "Idempotency key (`orderId + channel`) so a retry after a timeout doesn't send two SMSes",
        "Per-provider limits: a `Semaphore` per channel if SMS allows only 2 concurrent calls",
        "Graceful shutdown hook: `shutdown()`, wait, then `shutdownNow()`; persist anything not sent"] }
  ];

  H.registerLesson({
    code: "F27",
    summary: "Threads and executors for LLD interviews: processes vs threads, the thread lifecycle, `Runnable`/`Callable`/`Future`, the standard `Executors` pools and their hidden unbounded queues, `ThreadPoolExecutor` internals (core, max, queue, rejection), `CompletableFuture` composition with timeouts and fallbacks, race conditions (lost updates, check-then-act), visibility and happens-before, cooperative interruption, Java 21 virtual threads, and a mini design of an async notification dispatcher with retries, back-pressure and graceful shutdown.",
    slides: SLIDES,
    widget: { heading: "Interactive: feed a ThreadPoolExecutor", caption: "core = 2, max = 4, bounded queue of 2. Submit tasks and finish them to see when threads are created, when tasks queue and when the rejection policy kicks in.", render: poolWidget },
    examplesHeading: "Where you meet threads and executors",
    examples: [
      ["Tomcat / Jetty request threads", "Each HTTP request is handled by a worker from a bounded pool (`server.tomcat.threads.max`); a slow DB call ties up a worker. Spring Boot 3.2+ can use virtual threads (`spring.threads.virtual.enabled=true`)."],
      ["Spring `@Async` and `TaskExecutor`", "Methods annotated `@Async` run on a `ThreadPoolTaskExecutor`; configure core/max/queue capacity rather than relying on defaults."],
      ["Spring `@Scheduled`", "Periodic jobs run on a task scheduler (one thread by default), so a slow job delays the others."],
      ["Parallel streams and `CompletableFuture.supplyAsync()`", "Both default to `ForkJoinPool.commonPool()`; blocking I/O there starves every other user of the common pool."],
      ["Kafka consumers, JDBC connection pools", "Consumers are single-threaded per instance; connection pools (HikariCP) cap concurrency to the database, often the real bottleneck."]
    ],
    pitfalls: [
      "Calling `run()` instead of `start()`",
      "Using `Executors.newFixedThreadPool` / `newCachedThreadPool` in servers without thinking about the unbounded queue / thread count",
      "Forgetting to shut down executors (the JVM won't exit; threads leak in tests)",
      "Blocking I/O on `ForkJoinPool.commonPool()` (default for parallel streams and `supplyAsync`)",
      "`future.get()` with no timeout",
      "Swallowing `InterruptedException` (catch and ignore) so cancellation never works",
      "Exceptions in `execute()`d tasks vanish into the uncaught handler; in `submit()`ted ones they hide inside the `Future` until `get()`",
      "Assuming `volatile` makes `count++` atomic"
    ],
    quiz: [
      { q: "What do threads in one process share?", options: ["Nothing", "The heap (objects); each thread has its own stack", "Only static fields", "Only the stack"], answer: 1, why: "Shared heap is why synchronisation matters." },
      { q: "`Executors.newFixedThreadPool(10)` under a sustained overload will…", options: ["Reject tasks", "Queue tasks in an unbounded queue, possibly until OutOfMemoryError", "Create more threads", "Block submitters"], answer: 1, why: "It uses an unbounded LinkedBlockingQueue." },
      { q: "In a ThreadPoolExecutor with core 2, max 4 and a bounded queue of 2, when is the 3rd thread created?", options: ["On the 3rd task", "When the queue is full (5th task while all are busy)", "Never", "Immediately at start"], answer: 1, why: "Core → queue → extra threads → reject." },
      { q: "Difference between `Runnable` and `Callable`?", options: ["None", "`Callable` returns a value and can throw checked exceptions", "`Runnable` returns a Future", "`Callable` can't be pooled"], answer: 1, why: "Submit a Callable to get a typed Future." },
      { q: "Why might `count++` from two threads give less than the expected total?", options: ["JIT bug", "It's read-modify-write; interleaved threads lose updates", "Integer overflow", "Threads run sequentially"], answer: 1, why: "Use AtomicInteger or a lock." },
      { q: "What does `volatile` guarantee?", options: ["Atomic compound operations", "Visibility and ordering of reads/writes of that field", "Mutual exclusion", "Faster code"], answer: 1, why: "Not atomicity." },
      { q: "Correct way to stop a worker thread?", options: ["`Thread.stop()`", "Interrupt it (or set a volatile flag) and let it exit cooperatively", "`System.exit`", "Set its priority to 0"], answer: 1, why: "Cancellation in Java is cooperative." },
      { q: "Best fit for Java 21 virtual threads?", options: ["CPU-heavy image processing", "Many concurrent blocking I/O calls (HTTP, DB)", "Replacing all locks", "Real-time systems"], answer: 1, why: "Cheap blocking; CPU work still needs cores." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Use"],
        ["Run tasks on a pool", "`ExecutorService` (explicit `ThreadPoolExecutor` in servers)"],
        ["Get a result later", "`Callable` + `Future.get(timeout)`"],
        ["Compose async calls", "`CompletableFuture` + own executor + `orTimeout`/`exceptionally`"],
        ["Periodic jobs", "`ScheduledExecutorService.scheduleAtFixedRate` (catch exceptions inside)"],
        ["Thousands of blocking calls", "Virtual threads (Java 21) + `Semaphore` for limits"],
        ["Atomic counter", "`AtomicInteger` / `LongAdder`"],
        ["Stop flag", "`volatile boolean` or interruption"]],
      cards: [
        { title: "Pool sizing", items: ["CPU-bound ≈ cores", "I/O-bound ≈ cores × (1 + wait/compute)", "Bounded queue + rejection policy", "Name threads"] },
        { title: "Shutdown", items: ["`shutdown()` then `awaitTermination`", "`shutdownNow()` interrupts", "Try-with-resources (Java 19+)", "Restore interrupt flag"] },
        { title: "Say in interviews", items: ["Race vs data race", "Check-then-act", "Happens-before", "Back-pressure", "Idempotent retries"] }]
    },
    practice: [
      { level: "Easy", q: "Explain the difference between `start()` and `run()`, and between `shutdown()` and `shutdownNow()`.",
        a: ["`start()` creates a new thread that then calls `run()`; calling `run()` directly just executes the method on the current thread (no concurrency).",
          "`shutdown()`: stop accepting new tasks, let queued and running tasks finish. `shutdownNow()`: stop accepting, interrupt running tasks, and return the list of tasks that never started.",
          "Typical pattern: `shutdown()`, `awaitTermination(timeout)`, then `shutdownNow()` if still running."] },
      { level: "Easy", q: "Name the six thread states and what causes BLOCKED vs WAITING.",
        a: ["NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED.",
          "**BLOCKED**: trying to enter a `synchronized` block/method whose monitor another thread holds.",
          "**WAITING**: parked indefinitely by `wait()`, `join()`, `LockSupport.park()` (which `ReentrantLock` and `BlockingQueue` use), until notified/unparked.",
          "**TIMED_WAITING**: the same with a timeout, or `sleep(ms)`."] },
      { level: "Medium", q: "Fetch a user's profile, orders and wallet balance from three services in parallel, each with a 300 ms budget, and render a page even if the wallet call fails.",
        code: `static String call(String what, long ms, boolean fail) {
    try { Thread.sleep(ms); } catch (InterruptedException e) { throw new RuntimeException(e); }
    if (fail) throw new RuntimeException(what + " down");
    return what;
}

ExecutorService io = Executors.newFixedThreadPool(3);
var profile = CompletableFuture.supplyAsync(() -> call("Asha (Gold)", 40, false), io).orTimeout(300, TimeUnit.MILLISECONDS);
var orders = CompletableFuture.supplyAsync(() -> call("3 orders", 60, false), io).orTimeout(300, TimeUnit.MILLISECONDS);
var wallet = CompletableFuture.supplyAsync(() -> call("₹1,240", 30, true), io)
    .orTimeout(300, TimeUnit.MILLISECONDS)
    .exceptionally(ex -> "wallet unavailable");                               // degrade gracefully
String page = profile.thenCombine(orders, (p, o) -> p + " | " + o).thenCombine(wallet, (po, w) -> po + " | " + w).join();
System.out.println(page);
io.shutdown();`,
        follow: "Total latency ≈ the slowest call, not the sum. Required parts (profile) fail the page; optional parts (wallet) get a fallback. Use your own executor, not the common pool, for blocking calls." },
      { level: "Medium", q: "Your service uses `Executors.newFixedThreadPool(20)` for report generation and dies with OutOfMemoryError during a traffic spike. Diagnose and fix.",
        a: ["`newFixedThreadPool` uses an unbounded `LinkedBlockingQueue`: when tasks arrive faster than 20 threads can finish them, the queue (and every captured request object) grows until the heap is exhausted.",
          "Fix: build a `ThreadPoolExecutor` with a **bounded** queue (e.g. 200) and an explicit rejection policy: `AbortPolicy` → return 429/\"try later\", or `CallerRunsPolicy` → slow the producers.",
          "Add metrics: active threads, queue size, rejected count, task latency.",
          "Long-term: move heavy reports to an async job queue (Kafka/SQS) with workers that scale independently."] },
      { level: "Medium", q: "Implement a simple `ScheduledExecutorService` job that refreshes an exchange-rate cache every 100 ms and keeps running even when one refresh fails.",
        code: `ScheduledExecutorService ses = Executors.newSingleThreadScheduledExecutor();
AtomicReference<Double> usdInr = new AtomicReference<>(83.0);
AtomicInteger runs = new AtomicInteger();
ses.scheduleAtFixedRate(() -> {
    try {
        int n = runs.incrementAndGet();
        if (n == 2) throw new IllegalStateException("rates API 500");           // one bad run
        usdInr.set(83.0 + n / 100.0);
    } catch (RuntimeException e) {
        System.out.println("refresh failed, keeping old rate: " + e.getMessage());   // without this catch, the schedule stops forever
    }
}, 0, 100, TimeUnit.MILLISECONDS);
Thread.sleep(450);
ses.shutdown();
System.out.println("runs ≥ 4: " + (runs.get() >= 4) + ", latest rate " + usdInr.get());`,
        follow: "If a periodic task throws, `scheduleAtFixedRate` suppresses all future runs silently. `AtomicReference` publishes the new value safely to reader threads." },
      { level: "Medium", q: "How do you size a thread pool? Work through an example.",
        a: ["CPU-bound tasks: about the number of cores (`Runtime.getRuntime().availableProcessors()`), maybe +1. More threads only add context switching.",
          "I/O-bound tasks: threads ≈ cores × (1 + wait time / compute time). With 8 cores, 90 ms waiting and 10 ms computing per task: 8 × (1 + 9) = 80 threads.",
          "Then cap by downstream limits: if the DB pool has 20 connections, 80 threads just queue on the pool.",
          "Validate with load tests and metrics; or use virtual threads for blocking I/O and limit downstream concurrency with a `Semaphore`."] },
      { level: "Hard", q: "Design a parallel file indexer: crawl a directory tree, parse files concurrently (CPU-bound), and write results to a search index (single writer). What concurrency structure would you use?",
        a: ["Stage 1: a single thread walks the tree (`Files.walk`) and submits paths to a bounded **parse pool** sized ≈ cores (CPU-bound). Bounded queue + `CallerRunsPolicy` so the walker slows down when parsers lag.",
          "Stage 2: parsers put `Document`s into a bounded `BlockingQueue` consumed by **one writer thread** (the index isn't thread-safe; single writer avoids locking).",
          "Completion: count submitted vs finished with a `Phaser`/`CountDownLatch` or `CompletableFuture.allOf`; then send a **poison pill** to the writer (F30).",
          "Errors: a failing file is logged and counted, not fatal; cancellation via interruption.",
          "Measure: parse throughput vs writer throughput decides whether to batch writes."],
        m: M(["flowchart LR",
          "  W[\"walker thread\"]:::s1 -->|\"submit(path)\"| P[\"parse pool<br/>(cores threads, bounded queue)\"]:::s0",
          "  P -->|\"put(doc)\"| Q[(\"BlockingQueue&lt;Document&gt;\")]:::s2",
          "  Q -->|\"take()\"| X[\"single index writer\"]:::s1"]) },
      { level: "Hard", q: "Explain happens-before with an example of a bug it explains, and three ways to fix it.",
        a: ["Happens-before is the JMM's ordering guarantee: if action A happens-before B, B sees A's effects. Without an hb edge, a thread may see stale or partially constructed values.",
          "Bug: thread A sets `config = new Config(...)` (a plain field) and `ready = true`; thread B loops `while (!ready) {}` and then reads `config`. B may loop forever (never sees `ready`), or see `ready` but a stale `config` because writes were reordered.",
          "Fix 1: make `ready` `volatile`: the write to `ready` happens-before the read that sees it, so `config` (written earlier in program order) is visible too.",
          "Fix 2: guard both with the same lock (`synchronized`).",
          "Fix 3: hand the object over through a concurrent structure (`BlockingQueue`, `CompletableFuture.complete`, `AtomicReference`), each of which provides hb edges.",
          "Also: make `Config` immutable with `final` fields so even a racy publication shows fully constructed fields."] }
    ],
    recap: [
      "Threads share the heap; any shared mutable state needs a thread-safety plan.",
      "Use executors, not raw threads: `Callable`/`Future`, `invokeAll`, explicit `ThreadPoolExecutor` with bounded queues and a rejection policy in servers.",
      "Pool decisions: core threads → queue → extra threads → reject; size CPU pools ≈ cores, I/O pools larger or use virtual threads.",
      "`CompletableFuture` composes async work with timeouts and fallbacks; avoid blocking the common pool.",
      "Races (lost updates, check-then-act) need atomicity; visibility needs happens-before (`volatile`, locks, concurrent handoffs); cancellation is cooperative via interruption."
    ]
  });
})();
