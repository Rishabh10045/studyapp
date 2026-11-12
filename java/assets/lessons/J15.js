/* Lesson J15: Threads, Runnable & Callable, thread lifecycle */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Lifecycle: the states main observed with t.getState() on Java 21 at each checkpoint
  var LIFE = [
    { st: "NEW", line: 0, why: "The `Thread` object exists but `start()` hasn't been called. No OS thread yet." },
    { st: "RUNNABLE", line: 1, why: "After `start()` the JVM creates the OS thread and schedules it. RUNNABLE covers both *running on a CPU* and *ready, waiting for a CPU*; Java doesn't distinguish them." },
    { st: "BLOCKED", line: 2, why: "The worker reached `synchronized (lock)` while main still holds `lock`. BLOCKED means waiting to **enter a monitor**, and only that." },
    { st: "WAITING", line: 3, why: "Inside the block it called `lock.wait()`, which releases the monitor and waits with **no timeout** until notified (also `join()` and `LockSupport.park()`)." },
    { st: "TIMED_WAITING", line: 4, why: "After `notifyAll()` it re-acquired the lock, left the block and called `Thread.sleep(300)`: waiting **with a timeout** (also `wait(ms)`, `join(ms)`, `parkNanos`)." },
    { st: "TERMINATED", line: 5, why: "`run()` returned, so the thread is finished. `join()` in main returned at this point. A terminated thread can't be restarted (`start()` again throws `IllegalThreadStateException`)." }
  ];
  var LIFE_SRC = ["Thread t = new Thread(task, \"booking-worker\");   // NEW", "t.start();                                         // RUNNABLE (busy loop)", "synchronized (lock) { … }                          // BLOCKED: main holds lock", "lock.wait();                                       // WAITING until notifyAll", "Thread.sleep(300);                                 // TIMED_WAITING", "// run() returns                                  // TERMINATED"];
  var EDGES = [["NEW", "RUNNABLE", "start()"], ["RUNNABLE", "BLOCKED", "enter synchronized (lock held)"], ["BLOCKED", "RUNNABLE", "lock acquired"], ["RUNNABLE", "WAITING", "wait() / join() / park()"], ["WAITING", "RUNNABLE", "notify / thread ends / unpark"], ["RUNNABLE", "TIMED_WAITING", "sleep(ms) / wait(ms) / join(ms)"], ["TIMED_WAITING", "RUNNABLE", "timeout / notify"], ["RUNNABLE", "TERMINATED", "run() returns or throws"]];
  // Race: each thread runs count++ as load → add → store (see the bytecode slide)
  function threadWidget(el, ctx) {
    var s = ctx.state; if (!s.mode) { s.mode = "life"; s.i = 0; s.race = null; }
    el.innerHTML = "<div class='seg' data-r='mode'><button type='button' data-m='life'>Thread lifecycle</button><button type='button' data-m='race'>Race on count++</button></div><div data-r='body' style='margin-top:12px'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function newRace() { return { count: 0, t: [{ pc: 0, reg: null, done: 0 }, { pc: 0, reg: null, done: 0 }], log: [] }; }
    function drawLife() {
      var cur = LIFE[s.i];
      q("body").innerHTML = "<p>" + ctx.md("A worker thread walks through all six `Thread.State` values. Main sampled `t.getState()` at each checkpoint; these are the states Java 21 reported.") + "</p>" +
        "<div class='btnrow'><button type='button' class='btn' data-r='prev'>◀ back</button><button type='button' class='btn primary' data-r='next'>next checkpoint ▶</button></div>" +
        "<div class='diagram' data-r='dg'></div><pre class='code' data-r='src'></pre><div class='result' data-r='res'></div>";
      var L = ["stateDiagram-v2", "  [*] --> NEW"];
      EDGES.forEach(function (e) { L.push("  " + e[0] + " --> " + e[1] + " : " + e[2]); });
      L.push("  TERMINATED --> [*]", "  classDef cur fill:#fff3e0,stroke:#ef6c00,stroke-width:3px", "  class " + cur.st + " cur");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("src").innerHTML = LIFE_SRC.map(function (l, i) { return "<div style='padding:0 6px;border-radius:4px;" + (i === cur.line ? "background:var(--accent-subtle);outline:1px solid var(--accent)" : "") + "'>" + ctx.H.highlight(l) + "</div>"; }).join("");
      q("res").innerHTML = ctx.md("Checkpoint " + (s.i + 1) + "/6: `t.getState()` → **" + cur.st + "**. " + cur.why);
      q("prev").addEventListener("click", function () { s.i = Math.max(0, s.i - 1); ctx.save(); drawLife(); });
      q("next").addEventListener("click", function () { s.i = Math.min(LIFE.length - 1, s.i + 1); ctx.save(); drawLife(); });
    }
    function drawRace() {
      if (!s.race) s.race = newRace();
      var R = s.race, OPS = ["load count → reg", "reg = reg + 1", "store reg → count"];
      q("body").innerHTML = "<p>" + ctx.md("Two threads each run `count++` once. It compiles to three steps (`getfield`, `iadd`, `putfield`), and the scheduler may switch threads between any of them. Step the threads in different orders: run one fully then the other (count = 2), or interleave the loads (count = 1, a **lost update**).") + "</p>" +
        "<div class='btnrow'><button type='button' class='btn primary' data-r='s0'>step T1</button><button type='button' class='btn primary' data-r='s1'>step T2</button><button type='button' class='btn' data-r='bad'>replay lost update</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
        "<div class='tablewrap'><table><thead><tr><th></th><th>T1</th><th>T2</th></tr></thead><tbody>" +
        [0, 1, 2].map(function (k) { return "<tr><td><code>" + OPS[k] + "</code></td>" + R.t.map(function (t) { return "<td>" + (t.pc > k ? "✓" : t.pc === k ? "◀ next" : "") + "</td>"; }).join("") + "</tr>"; }).join("") +
        "<tr><td>register</td>" + R.t.map(function (t) { return "<td><code>" + (t.reg == null ? "–" : t.reg) + "</code></td>"; }).join("") + "</tr></tbody></table></div>" +
        "<div class='result' data-r='res'></div><pre class='code' data-r='log'></pre>";
      var done = R.t[0].pc === 3 && R.t[1].pc === 3;
      q("res").innerHTML = ctx.md("Shared `count` = **" + R.count + "**." + (done ? (R.count === 2 ? " Correct: the increments didn't overlap." : " **Lost update:** both threads loaded 0, so both stored 1. Two increments, one effect. Fix with `synchronized`, `AtomicInteger.incrementAndGet()` or a `LongAdder` (J17–J19).") : ""));
      q("log").textContent = R.log.join("\n") || "count = 0. Step a thread.";
      function step(i) {
        var t = R.t[i]; if (t.pc >= 3) return;
        var n = "T" + (i + 1) + ": ";
        if (t.pc === 0) { t.reg = R.count; R.log.push(n + "load count (" + R.count + ") into register"); }
        else if (t.pc === 1) { t.reg += 1; R.log.push(n + "register = " + t.reg); }
        else { R.count = t.reg; R.log.push(n + "store " + t.reg + " into count"); }
        t.pc++; ctx.save(); drawRace();
      }
      q("s0").addEventListener("click", function () { step(0); });
      q("s1").addEventListener("click", function () { step(1); });
      q("reset").addEventListener("click", function () { s.race = newRace(); ctx.save(); drawRace(); });
      q("bad").addEventListener("click", function () { s.race = newRace(); [0, 1, 0, 0, 1, 1].forEach(function (i) { var t = s.race.t[i], R2 = s.race, n = "T" + (i + 1) + ": "; if (t.pc === 0) { t.reg = R2.count; R2.log.push(n + "load count (" + R2.count + ") into register"); } else if (t.pc === 1) { t.reg += 1; R2.log.push(n + "register = " + t.reg); } else { R2.count = t.reg; R2.log.push(n + "store " + t.reg + " into count"); } t.pc++; }); ctx.save(); drawRace(); });
    }
    function draw() { q("mode").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.m === s.mode); }); if (s.mode === "race") drawRace(); else drawLife(); }
    q("mode").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.mode = b.dataset.m; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Processes and threads",
      text: "A **process** is a running program with its own memory space; a JVM is one process. A **thread** is an independent path of execution inside a process. All threads of a JVM **share the heap** (objects, static fields) but each has its **own stack** (local variables, call frames) and program counter. Sharing makes communication cheap and is also the source of every concurrency bug: two threads touching the same object at the same time. A Java program starts with the `main` thread plus JVM threads (GC, JIT compiler, finalizer/reference handler).",
      m: M(["flowchart TB",
        "  subgraph P[\"JVM process\"]",
        "    HEAP[\"Heap: objects, static fields<br/>(shared by all threads)\"]:::s4",
        "    T1[\"main thread<br/>stack + PC\"]:::s1",
        "    T2[\"worker-1<br/>stack + PC\"]:::s1",
        "    T3[\"GC / JIT threads\"]:::s0",
        "    T1 --> HEAP",
        "    T2 --> HEAP",
        "    T3 --> HEAP",
        "  end",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `System.out.println("running in: " + Thread.currentThread().getName() + ", cores: " + Runtime.getRuntime().availableProcessors());
Map<Thread, StackTraceElement[]> all = Thread.getAllStackTraces();
System.out.println("live threads at startup: " + all.size());
all.keySet().stream().map(Thread::getName).sorted().limit(6).forEach(n -> System.out.print(n + " | "));`,
      analogy: "A process is a restaurant kitchen; threads are the cooks. They share the fridge and the counters (the heap) but each has their own notepad (the stack). Two cooks grabbing the same pan at once is a race condition." },
    { title: "Creating and starting threads",
      text: "A thread runs a `Runnable` (a functional interface: `void run()`). Create one by passing a `Runnable` (usually a lambda) to `new Thread(...)` or the Java 21 builders `Thread.ofPlatform()` / `Thread.ofVirtual()`; subclassing `Thread` works but mixes the task with the mechanism. **`start()`** asks the JVM to create a new thread that calls `run()`; calling **`run()` directly** just runs the code on the current thread, with no concurrency. A thread can be started only once.",
      code: `Runnable task = () -> System.out.println("task on " + Thread.currentThread().getName());

Thread a = new Thread(task, "worker-a");
a.start();                                         // new thread
a.join();

Thread b = new Thread(task, "worker-b");
b.run();                                           // NOT concurrent: runs on main

class Ticker extends Thread {                      // works, but prefer passing a Runnable
    @Override public void run() { System.out.println("subclass on " + getName()); }
}
Thread c = new Ticker(); c.setName("ticker"); c.start(); c.join();

Thread d = Thread.ofPlatform().name("pricing-", 1).start(task);   // Java 21 builder
d.join();
try { a.start(); } catch (IllegalThreadStateException e) { System.out.println("can't start twice"); }`,
      points: ["Prefer `Runnable`/`Callable` tasks handed to an executor (J16) over managing threads yourself", "Always name threads: thread dumps and logs become readable"] },
    { title: "Thread states",
      text: "`Thread.getState()` returns one of six states. **NEW** before `start`; **RUNNABLE** when running or ready to run (Java doesn't separate the two, and a thread blocked in native I/O also shows RUNNABLE); **BLOCKED** waiting to enter a `synchronized` monitor; **WAITING** indefinitely (`wait()`, `join()`, `LockSupport.park()`, which `ReentrantLock` uses); **TIMED_WAITING** with a timeout (`sleep`, `wait(ms)`, `join(ms)`); **TERMINATED** after `run()` ends. Thread dumps show these states, so knowing them is how you read a stuck production system. The interactive model below walks one thread through all six.",
      table: [
        ["State", "Entered by", "Left by"],
        ["NEW", "`new Thread(...)`", "`start()`"],
        ["RUNNABLE", "`start()`, lock acquired, wake-up", "Blocking, waiting, finishing"],
        ["BLOCKED", "Entering `synchronized` held by another thread", "Monitor acquired"],
        ["WAITING", "`wait()`, `join()`, `park()`", "`notify/notifyAll`, target thread ends, `unpark`, interrupt"],
        ["TIMED_WAITING", "`sleep(ms)`, `wait(ms)`, `join(ms)`, `parkNanos`", "Timeout, notify, interrupt"],
        ["TERMINATED", "`run()` returns or throws", "Never"]],
      points: ["Threads waiting on a `ReentrantLock` show WAITING (parked), not BLOCKED", "Many threads RUNNABLE in `socketRead` usually means slow downstream I/O, not CPU work"] },
    { title: "Callable and Future: results and exceptions",
      text: "`Runnable.run()` returns nothing and can't throw checked exceptions. **`Callable<V>`** (`V call() throws Exception`) returns a value. Submit it to an `ExecutorService` and you get a **`Future<V>`**: `get()` blocks until the result is ready (or `get(timeout, unit)`), rethrowing any task exception wrapped in `ExecutionException`; `cancel(true)` interrupts the task; `isDone()` polls. Java 19 added `resultNow()`, `exceptionNow()` and `state()`.",
      code: `Callable<Integer> quote = () -> { Thread.sleep(50); return 4850; };
Callable<Integer> failing = () -> { throw new IOException("pricing service down"); };
try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
    Future<Integer> f1 = pool.submit(quote);
    Future<Integer> f2 = pool.submit(failing);
    System.out.println("done yet? " + f1.isDone());
    System.out.println("fare " + f1.get(1, TimeUnit.SECONDS));                  // blocks up to 1 s
    try { f2.get(); }
    catch (ExecutionException e) { System.out.println("task failed: " + e.getCause()); }   // original exception is the cause
    Future<Integer> slow = pool.submit(() -> { Thread.sleep(5_000); return 1; });
    try { slow.get(100, TimeUnit.MILLISECONDS); }
    catch (TimeoutException e) { System.out.println("timeout, cancel: " + slow.cancel(true) + ", state " + slow.state()); }
}`,
      points: ["A `Future` from `submit(Runnable)` returns null from `get()`", "Composing futures (then-this, then-that) is what `CompletableFuture` is for (J22)"] },
    { title: "join, sleep and yield",
      text: "`t.join()` makes the current thread wait until `t` terminates (and guarantees it sees everything `t` wrote: a happens-before edge, J17). `join(ms)` waits at most that long. `Thread.sleep(ms)` pauses the current thread without releasing any locks it holds. `Thread.yield()` is only a hint to the scheduler and is almost never useful in application code; `Thread.onSpinWait()` is the hint for busy-wait loops.",
      code: `List<String> results = Collections.synchronizedList(new ArrayList<>());
Thread[] ws = new Thread[3];
for (int i = 0; i < ws.length; i++) {
    int id = i;
    ws[i] = new Thread(() -> {
        try { Thread.sleep(100 - id * 30); } catch (InterruptedException e) { return; }
        results.add("worker-" + id);
    });
    ws[i].start();
}
for (Thread w : ws) w.join();                      // wait for all three
System.out.println("all done: " + results);        // order depends on sleep times, not start order

Thread slow = new Thread(() -> { try { Thread.sleep(2_000); } catch (InterruptedException e) { } });
slow.start();
slow.join(100);                                    // give up waiting after 100 ms
System.out.println("slow alive after join(100)? " + slow.isAlive());
slow.interrupt();`,
      analogy: "`join` is waiting at the door until your colleague comes back with the answer. `sleep` is a nap at your desk while still holding the office keys." },
    { title: "Interruption: cooperative cancellation",
      text: "Java has no safe way to kill a thread (`Thread.stop` is deprecated and removed). Instead, `t.interrupt()` sets the thread's **interrupt flag**. Blocking methods (`sleep`, `wait`, `join`, `BlockingQueue.take`, `Future.get`) respond by throwing `InterruptedException` and **clearing the flag**; busy code should check `Thread.currentThread().isInterrupted()`. When you catch `InterruptedException` and can't propagate it, **restore the flag** with `Thread.currentThread().interrupt()` so callers can still see the cancellation. Never swallow it silently.",
      code: `Thread poller = new Thread(() -> {
    int polls = 0;
    while (!Thread.currentThread().isInterrupted()) {           // check the flag in loops
        polls++;
        try { Thread.sleep(20); }
        catch (InterruptedException e) {
            System.out.println("interrupted during sleep after " + polls + " polls, flag now " + Thread.currentThread().isInterrupted());
            Thread.currentThread().interrupt();                  // restore so the loop condition sees it
        }
    }
    System.out.println("poller exiting cleanly");
}, "fare-poller");
poller.start();
Thread.sleep(110);
poller.interrupt();
poller.join();

Thread busy = new Thread(() -> { long n = 0; while (!Thread.interrupted()) n++; System.out.println("busy loop stopped"); });
busy.start(); Thread.sleep(20); busy.interrupt(); busy.join();`,
      points: ["`Thread.interrupted()` (static) reads **and clears** the flag; `isInterrupted()` only reads it", "Executors cancel tasks via interruption: tasks that ignore it can't be cancelled"] },
    { title: "Names, daemon threads and priorities",
      text: "Give every thread a meaningful **name** (or use a thread factory that does, J16). **Daemon** threads don't keep the JVM alive: when only daemon threads remain, the JVM exits without waiting for them, so never use daemons for work that must finish (writes, flushing). `setDaemon` must be called before `start`; threads inherit daemon status from their creator. **Priorities** (1–10) are hints that most OS schedulers largely ignore; don't rely on them for correctness.",
      code: `Thread housekeeping = new Thread(() -> {
    while (true) { try { Thread.sleep(1_000); } catch (InterruptedException e) { return; } }
}, "cache-cleaner");
housekeeping.setDaemon(true);                     // won't block JVM shutdown
housekeeping.start();
System.out.println(housekeeping.getName() + " daemon=" + housekeeping.isDaemon() + " priority=" + housekeeping.getPriority());
Thread child = new Thread(() -> {});
System.out.println("child of main is daemon? " + child.isDaemon() + ", main group: " + Thread.currentThread().getThreadGroup().getName());
try { housekeeping.setDaemon(false); } catch (IllegalThreadStateException e) { System.out.println("can't change daemon flag after start"); }
System.out.println("main ends; the JVM exits even though cache-cleaner is still running");`,
      points: ["Shutdown hooks (`Runtime.addShutdownHook`) run on normal exit and SIGTERM, not on `kill -9`"] },
    { title: "Uncaught exceptions in threads",
      text: "An exception that escapes `run()` terminates **that thread only**; the default handler prints the stack trace to stderr and the rest of the program carries on, often silently broken. Set an `UncaughtExceptionHandler` per thread or globally (`Thread.setDefaultUncaughtExceptionHandler`) to log and alert. Note that tasks submitted with `ExecutorService.submit` **capture** exceptions in the `Future`: if nobody calls `get()`, the failure is invisible.",
      code: `Thread.UncaughtExceptionHandler logIt = (t, e) -> System.out.println("[" + t.getName() + "] died: " + e);
Thread t = new Thread(() -> { throw new IllegalStateException("bad fare data"); }, "importer");
t.setUncaughtExceptionHandler(logIt);
t.start(); t.join();
System.out.println("main still running, importer state " + t.getState());

try (ExecutorService pool = Executors.newSingleThreadExecutor()) {
    Future<?> f = pool.submit(() -> { throw new IllegalStateException("swallowed until get()"); });
    pool.execute(() -> System.out.println("execute() tasks go to the thread's handler instead"));
    try { f.get(); } catch (ExecutionException e) { System.out.println("surfaced via get(): " + e.getCause().getMessage()); }
}`,
      points: ["In Spring, `@Async` void methods use an `AsyncUncaughtExceptionHandler`", "Always log or propagate failures from background threads"] },
    { title: "Race conditions: why count++ isn't atomic",
      text: "`count++` looks like one operation but compiles to three: read the field, add one, write it back. If two threads interleave those steps, both can read the same old value and one increment is **lost**. This is a **race condition**: the result depends on timing. It's invisible in tests that run fast or on one core and appears under load. The same applies to check-then-act (`if (!map.containsKey(k)) map.put(k, v)`) and read-modify-write on any shared state.",
      lang: "text",
      code: `$ javap -c C            // class C { int count; void inc() { count++; } }
  void inc();
       0: aload_0
       1: dup
       2: getfield  count     // 1. read
       5: iconst_1
       6: iadd                // 2. add
       7: putfield  count     // 3. write  (another thread can run between any two steps)
      10: return` },
    { title: "Seeing the race, and three ways to fix it",
      text: "Four threads incrementing a plain `int` 100,000 times each almost never reach 400,000. Fixes, in the order this module covers them: make the read-modify-write **mutually exclusive** (`synchronized`, locks: J17–J18), make it a single **atomic** hardware operation (`AtomicInteger`, `LongAdder`: J19), or **don't share** (each thread counts locally, combine at the end: thread confinement). Making the field `volatile` does **not** help: it fixes visibility, not atomicity.",
      code: `class Counters {
    int plain;
    volatile int vol;
    int synced;
    final AtomicInteger atomic = new AtomicInteger();
    synchronized void incSynced() { synced++; }
}
Counters c = new Counters();
int threads = 4, perThread = 100_000;
long[] local = new long[threads];
List<Thread> ts = new ArrayList<>();
for (int t = 0; t < threads; t++) {
    int id = t;
    Thread th = new Thread(() -> {
        for (int i = 0; i < perThread; i++) { c.plain++; c.vol++; c.incSynced(); c.atomic.incrementAndGet(); local[id]++; }
    });
    ts.add(th); th.start();
}
for (Thread th : ts) th.join();
System.out.println("expected " + threads * perThread + " | plain " + c.plain + " | volatile " + c.vol + " | synchronized " + c.synced
    + " | atomic " + c.atomic.get() + " | confined " + Arrays.stream(local).sum());`,
      points: ["`local[id]++` is safe because each thread only touches its own slot, and `join()` publishes the results to main"] },
    { title: "How many threads, and what they cost",
      text: "Each platform thread is an OS thread with a reserved stack (default 1 MB on 64-bit Linux, `-Xss`), kernel scheduling cost and context-switch overhead. Creating one per task is slow and unbounded creation exhausts memory (`OutOfMemoryError: unable to create native thread`). Hence **thread pools** (J16) for platform threads, sized by workload, and **virtual threads** (J25) when tasks mostly wait on I/O.",
      table: [
        ["Workload", "Rule of thumb", "Tool"],
        ["CPU-bound", "≈ number of cores", "`newFixedThreadPool(cores)`, ForkJoinPool"],
        ["Blocking I/O, platform threads", "cores × (1 + wait time / compute time)", "Bounded `ThreadPoolExecutor`"],
        ["Blocking I/O, Java 21+", "One virtual thread per task, limit downstreams", "`newVirtualThreadPerTaskExecutor()`"],
        ["Periodic jobs", "1–2 threads", "`ScheduledExecutorService`"]],
      code: `int cores = Runtime.getRuntime().availableProcessors();
double waitMs = 90, computeMs = 10;
System.out.println("cores " + cores + ", CPU pool " + cores + ", I/O pool ≈ " + Math.round(cores * (1 + waitMs / computeMs)));
long t0 = System.nanoTime();
for (int i = 0; i < 1_000; i++) { Thread t = new Thread(() -> {}); t.start(); t.join(); }
System.out.println("1,000 platform threads created and joined in " + (System.nanoTime() - t0) / 1_000_000 + " ms");` }
  ];

  H.registerLesson({
    code: "J15",
    summary: "The foundation of Java concurrency: processes vs threads and what they share, creating threads from `Runnable` (and why `start()` not `run()`), the six thread states and how to read them, `Callable` and `Future` for results and exceptions, `join`/`sleep`/`yield`, cooperative cancellation with interruption, names, daemon threads and priorities, uncaught exception handlers, race conditions (why `count++` isn't atomic, at the bytecode level), the three families of fixes, and what threads cost.",
    slides: SLIDES,
    widget: { heading: "Interactive: thread states and a lost update", caption: "Lifecycle mode walks a worker through all six `Thread.State` values that Java 21 reported at each checkpoint. Race mode lets you schedule the three bytecode steps of `count++` for two threads.", render: threadWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Thread dumps", "`jstack <pid>` or `jcmd <pid> Thread.print` during an incident: many threads BLOCKED on one monitor, or WAITING in a pool's queue."],
      ["Background work", "Schedulers, cache refreshers and consumers run on named threads; daemon status decides whether they block shutdown."],
      ["Cancellation", "Request timeouts and shutdown interrupt worker threads; code that swallows `InterruptedException` hangs deployments."],
      ["Silent failures", "A background importer thread dies on an exception and nobody notices until data is stale: install handlers, log futures."],
      ["Counters and caches", "Request counters, in-memory caches and lazy initialisation are the usual places races hide."],
      ["Sizing", "Choosing pool sizes for CPU vs I/O work, or moving I/O-heavy services to virtual threads."]
    ],
    pitfalls: [
      "Calling `run()` instead of `start()`",
      "Swallowing `InterruptedException` (empty catch) without restoring the flag",
      "Busy loops that never check the interrupt flag",
      "Daemon threads doing work that must complete",
      "Ignoring `Future`s, so task exceptions vanish",
      "Assuming `volatile` makes `count++` atomic",
      "Check-then-act on shared collections",
      "Relying on thread priorities or `yield` for correctness",
      "Creating a new platform thread per request"
    ],
    quiz: [
      { q: "What is the difference between `t.start()` and `t.run()`?", options: ["None", "start creates a new thread that calls run; run executes on the current thread", "run creates a thread", "start is deprecated"], answer: 1, why: "Calling run is just a method call." },
      { q: "A thread waiting to enter a synchronized block held by another thread is in state…", options: ["WAITING", "BLOCKED", "TIMED_WAITING", "RUNNABLE"], answer: 1, why: "BLOCKED is only for monitor entry." },
      { q: "Which state does `Thread.sleep(500)` put a thread in?", options: ["BLOCKED", "WAITING", "TIMED_WAITING", "TERMINATED"], answer: 2, why: "Waiting with a timeout." },
      { q: "Does `Thread.sleep` release locks the thread holds?", options: ["Yes", "No", "Only synchronized locks", "Only after 1 second"], answer: 1, why: "wait() releases the monitor; sleep doesn't." },
      { q: "You catch InterruptedException in a Runnable and can't rethrow it. Best practice?", options: ["Ignore it", "Call Thread.currentThread().interrupt()", "Call System.exit", "Throw RuntimeException always"], answer: 1, why: "Restore the flag for callers." },
      { q: "When only daemon threads remain…", options: ["The JVM waits for them", "The JVM exits", "They become user threads", "An exception is thrown"], answer: 1, why: "Daemons don't keep the JVM alive." },
      { q: "A task submitted with `submit()` throws. What happens?", options: ["The pool crashes", "The exception is stored in the Future; get() throws ExecutionException", "It's printed and lost", "The JVM exits"], answer: 1, why: "Call get() or the failure stays invisible." },
      { q: "Why can `count++` lose updates with two threads?", options: ["It's three steps (read, add, write) that can interleave", "int overflows", "The JIT removes it", "It isn't compiled"], answer: 0, why: "Read-modify-write race." },
      { q: "Does making `count` volatile fix `count++` races?", options: ["Yes", "No: volatile gives visibility, not atomicity", "Only on x86", "Only for long"], answer: 1, why: "Use synchronized or AtomicInteger." }
    ],
    cheatsheet: {
      table: [
        ["Task", "Code"],
        ["Start a thread", "`Thread.ofPlatform().name(\"w-\", 0).start(runnable)`"],
        ["Value + exceptions", "`Future<V> f = pool.submit(callable); f.get(timeout, unit)`"],
        ["Wait for finish", "`t.join()` / `t.join(ms)`"],
        ["Cancel", "`t.interrupt()`; check `isInterrupted()`; restore flag on catch"],
        ["Background", "`setDaemon(true)` before start"],
        ["Failures", "`setUncaughtExceptionHandler`, always check Futures"],
        ["Inspect", "`getState()`, `jstack`, `jcmd Thread.print`"]],
      cards: [
        { title: "States", items: ["NEW", "RUNNABLE (running or ready)", "BLOCKED (monitor entry)", "WAITING / TIMED_WAITING", "TERMINATED"] },
        { title: "Interruption", items: ["A request, not a kill", "Blocking calls throw and clear the flag", "Restore with interrupt()", "Thread.interrupted() clears"] },
        { title: "Say in interviews", items: ["Shared heap, private stacks", "start vs run", "Runnable vs Callable", "count++ is read-modify-write", "volatile ≠ atomic"] }]
    },
    practice: [
      { level: "Easy", q: "What are the ways to create a thread in Java? Which do you prefer?",
        a: ["Pass a `Runnable` (lambda) to `new Thread(r)` or a builder `Thread.ofPlatform().start(r)` / `Thread.ofVirtual().start(r)` (Java 21).",
          "Subclass `Thread` and override `run()` (couples the task to the thread; can't extend another class).",
          "Submit `Runnable`/`Callable` tasks to an `ExecutorService` (the usual choice in real code): threads are reused, named via a factory, and results/exceptions come back as Futures.",
          "Prefer tasks + executors; use raw threads only for long-lived dedicated workers."] },
      { level: "Easy", q: "Runnable vs Callable?",
        a: ["`Runnable.run()` returns `void` and can't throw checked exceptions.",
          "`Callable<V>.call()` returns a value and declares `throws Exception`.",
          "Both are functional interfaces; `ExecutorService.submit` accepts both and returns a `Future` (null result for Runnable).",
          "`Thread` itself only accepts `Runnable`; wrap a Callable in a `FutureTask` to run it on a raw thread."] },
      { level: "Easy", q: "Explain the thread lifecycle and states.",
        a: ["NEW → `start()` → RUNNABLE (running or ready).",
          "From RUNNABLE: BLOCKED when trying to enter a synchronized monitor held by another thread; WAITING on `wait()`, `join()`, `park()`; TIMED_WAITING on `sleep`, `wait(ms)`, `join(ms)`; each returns to RUNNABLE when the condition clears.",
          "TERMINATED when `run()` completes or throws; it can't be restarted.",
          "Thread dumps show these states, which is how you diagnose hangs."] },
      { level: "Medium", q: "Write a worker that processes a queue until interrupted, handling interruption correctly.",
        code: `BlockingQueue<String> jobs = new LinkedBlockingQueue<>(List.of("PNR1", "PNR2", "PNR3"));
List<String> done = Collections.synchronizedList(new ArrayList<>());
Thread worker = new Thread(() -> {
    try {
        while (!Thread.currentThread().isInterrupted()) {
            String job = jobs.take();                        // blocks; throws InterruptedException when interrupted
            done.add("ticketed " + job);
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();                  // preserve the status for whoever owns this thread
    } finally {
        System.out.println("worker stopping, processed " + done.size());
    }
}, "ticketing-worker");
worker.start();
Thread.sleep(100);                                           // queue drained; worker now blocked in take()
System.out.println("state while idle: " + worker.getState());
worker.interrupt();
worker.join();
System.out.println(done);`,
        a: ["The loop checks the interrupt flag; `take()` responds to interruption by throwing.",
          "The catch restores the flag and lets the thread exit; `finally` does cleanup.",
          "An idle worker in `take()` is WAITING (parked), which is what you'd see in a thread dump."] },
      { level: "Medium", q: "What happens to exceptions thrown in threads and in executor tasks?",
        a: ["In a raw thread, an uncaught exception terminates that thread and goes to its `UncaughtExceptionHandler` (default: print to stderr). Other threads keep running.",
          "With `executor.execute(r)`, the exception also reaches the worker thread's handler (and the pool replaces the worker).",
          "With `executor.submit(...)`, the exception is captured in the `Future`; it surfaces only as `ExecutionException` from `get()`. Unchecked futures = silent failures.",
          "Remedies: always consume futures (or use `CompletableFuture` with `exceptionally`/`whenComplete`), set default handlers, and log in task code."] },
      { level: "Medium", q: "Demonstrate a check-then-act race and fix it.",
        code: `Map<String, Integer> seats = new HashMap<>();
ConcurrentHashMap<String, Integer> safeSeats = new ConcurrentHashMap<>();
AtomicInteger racyWins = new AtomicInteger(), safeWins = new AtomicInteger();
CountDownLatch go = new CountDownLatch(1);
List<Thread> ts = new ArrayList<>();
for (int i = 0; i < 8; i++) {
    int pax = i;
    Thread t = new Thread(() -> {
        try { go.await(); } catch (InterruptedException e) { return; }
        if (!seats.containsKey("12A")) { Thread.yield();   // deliberate race: check, then act
            seats.put("12A", pax); racyWins.incrementAndGet(); }
        if (safeSeats.putIfAbsent("12A", pax) == null) safeWins.incrementAndGet();   // atomic check-then-act
    });
    ts.add(t); t.start();
}
go.countDown();
for (Thread t : ts) t.join();
System.out.println("racy: " + racyWins.get() + " passengers think they got 12A (often > 1) | atomic: " + safeWins.get());`,
        a: ["`containsKey` then `put` is two operations; several threads can pass the check before any of them puts.",
          "`putIfAbsent` (or `computeIfAbsent`) on a `ConcurrentHashMap` performs the check and the write atomically.",
          "Alternative: guard both calls with the same lock. Never use a plain `HashMap` across threads."] },
      { level: "Medium", q: "Run three pricing calls in parallel and return the cheapest, with a 1-second overall limit.",
        code: `record Quote(String airline, int fare) {}
List<Callable<Quote>> calls = List.of(
    () -> { Thread.sleep(80); return new Quote("6E", 4850); },
    () -> { Thread.sleep(40); return new Quote("AI", 5300); },
    () -> { Thread.sleep(3_000); return new Quote("SLOW", 100); });
try (ExecutorService pool = Executors.newFixedThreadPool(3)) {
    List<Future<Quote>> fs = pool.invokeAll(calls, 1, TimeUnit.SECONDS);   // cancels tasks still running at the deadline
    Optional<Quote> best = fs.stream().filter(f -> f.state() == Future.State.SUCCESS).map(Future::resultNow).min(Comparator.comparingInt(Quote::fare));
    System.out.println(best.orElseThrow() + ", cancelled: " + fs.stream().filter(Future::isCancelled).count());
}`,
        a: ["`invokeAll(tasks, timeout)` runs all tasks and cancels (interrupts) those not finished by the deadline.",
          "`Future.state()`/`resultNow()` (Java 19) read completed results without checked-exception noise.",
          "The slow provider is dropped rather than delaying the response; `CompletableFuture` offers a more composable version (J22)."] },
      { level: "Hard", q: "Why was Thread.stop deprecated, and how should long-running tasks be cancelled?",
        a: ["`stop()` threw `ThreadDeath` at an arbitrary point, releasing all monitors the thread held while objects were half-updated, corrupting shared state. It's deprecated for removal and throws `UnsupportedOperationException` in recent JDKs; `suspend`/`resume` were deadlock-prone and removed too.",
          "Use cooperative cancellation: `interrupt()` plus code that checks `isInterrupted()` in loops and lets `InterruptedException` propagate from blocking calls.",
          "For non-interruptible blocking (old `java.io` sockets), close the resource from another thread to unblock it.",
          "Higher-level: `Future.cancel(true)`, `ExecutorService.shutdownNow()`, `CompletableFuture` timeouts, and structured concurrency scopes all build on interruption."] },
      { level: "Hard", q: "A service occasionally reports fewer bookings than were made. The counter is `private int bookings; void onBooked() { bookings++; }` called from request threads. Diagnose and fix, and discuss trade-offs.",
        code: `class Stats {
    private int racy;
    private final LongAdder adder = new LongAdder();
    void onBooked() { racy++; adder.increment(); }
    String report() { return "racy=" + racy + " adder=" + adder.sum(); }
}
Stats s = new Stats();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 200_000; i++) pool.execute(s::onBooked);
}
System.out.println(s.report() + " (expected 200000)");`,
        a: ["`bookings++` is a non-atomic read-modify-write; concurrent request threads lose updates, and without synchronization other threads may also read stale values.",
          "Fixes: `synchronized` methods (simple, serialises callers), `AtomicInteger.incrementAndGet()` (CAS, lock-free), or `LongAdder` (striped cells, best under heavy contention; `sum()` is not an atomic snapshot).",
          "For metrics, use Micrometer counters (built on adders) instead of hand-rolled fields.",
          "Test with many threads and a `CountDownLatch` start gate, or with jcstress for rigorous concurrency testing."] },
      { level: "Hard", q: "How do you diagnose a Java service that has stopped responding?",
        steps: ["Take 2–3 thread dumps a few seconds apart: `jcmd <pid> Thread.print` (or `jstack <pid>`, `kill -3`). For virtual threads: `jcmd <pid> Thread.dump_to_file -format=json file`.",
          "Look at request-handling threads: are they BLOCKED on the same monitor (lock contention or deadlock; jstack reports Java-level deadlocks explicitly), WAITING in a pool/queue (exhausted connection pool), or RUNNABLE in `socketRead` (slow downstream without timeouts)?",
          "Compare dumps: threads stuck at the same frame across dumps are the bottleneck; changing frames mean slow but progressing work.",
          "Check CPU (`top -H` + convert thread ids to hex to match `nid=` in the dump) to separate CPU-bound loops from blocked threads.",
          "Fix the cause: add timeouts to every remote call, size pools, remove long work from synchronized sections, fix lock ordering. J26 covers deadlocks in depth."] }
    ],
    recap: [
      "Threads share the heap but have private stacks; shared mutable state is where bugs live.",
      "Start threads with `start()`; prefer tasks (`Runnable`/`Callable`) on executors; name your threads.",
      "Six states: NEW, RUNNABLE, BLOCKED (monitor entry), WAITING, TIMED_WAITING, TERMINATED; thread dumps show them.",
      "Cancel cooperatively with interruption and never swallow `InterruptedException`; handle uncaught exceptions and check Futures.",
      "`count++` is read-modify-write: fix races with locks, atomics or confinement; `volatile` alone isn't enough."
    ]
  });
})();
