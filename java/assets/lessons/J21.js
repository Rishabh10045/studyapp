/* Lesson J21: Synchronizers: CountDownLatch, CyclicBarrier, Semaphore, Phaser, Exchanger */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Event timelines recorded from one run on Java 21 (times rounded to 10 ms). Sleeps set the task durations.
  var RUNS = {
    latch: { label: "CountDownLatch(3)", rows: ["main", "W1", "W2", "W3"],
      code: "CountDownLatch latch = new CountDownLatch(3);\nfor (Worker w : workers) pool.submit(() -> { w.warmUp(); latch.countDown(); });  // 30, 90, 60 ms\nlatch.await();   // main waits for all three",
      ev: [[0, "main", "await()", "count 3", "main blocks until the count reaches zero."], [40, "W1", "countDown()", "count 2", "Workers don't wait: countDown never blocks."], [70, "W3", "countDown()", "count 1", ""], [100, "W2", "countDown()", "count 0", "The last count-down opens the latch."], [100, "main", "released", "count 0 (open forever)", "A latch can't be reset: later await() calls return immediately."]] },
    barrier: { label: "CyclicBarrier(3, action)", rows: ["T1", "T2", "T3", "action"],
      code: "CyclicBarrier barrier = new CyclicBarrier(3, () -> mergeResults());\n// each thread, twice: work (different durations); barrier.await();",
      ev: [[30, "T1", "await() phase 0", "1 of 3 waiting", "T1 is done first and waits for its peers."], [50, "T3", "await() phase 0", "2 of 3 waiting", ""], [80, "T2", "await() phase 0", "3 of 3 → trip", "The last arrival trips the barrier."], [80, "action", "barrier action", "runs once, in the last thread", "The action runs before anyone is released: a good place to merge partial results."], [80, "T1", "passes phase 0", "barrier reset", "All three continue together, and the barrier **resets automatically** (cyclic)."], [100, "T2", "await() phase 1", "1 of 3 waiting", ""], [120, "T3", "await() phase 1", "2 of 3 waiting", ""], [140, "T1", "await() phase 1", "3 of 3 → trip", ""], [140, "action", "barrier action", "", ""], [140, "T2", "passes phase 1", "", "Same barrier object, second generation."]] },
    semaphore: { label: "Semaphore(2)", rows: ["C1", "C2", "C3", "C4"],
      code: "Semaphore permits = new Semaphore(2);   // at most 2 concurrent calls\npermits.acquire();\ntry { callAirlineApi(); } finally { permits.release(); }   // 60 ms each",
      ev: [[0, "C1", "acquire() → got permit", "1 permit left", ""], [10, "C2", "acquire() → got permit", "0 permits left", ""], [20, "C3", "acquire() blocks", "0 left, 1 waiting", "No permits: C3 waits."], [30, "C4", "acquire() blocks", "0 left, 2 waiting", ""], [60, "C1", "release()", "permit handed to C3", "A release gives the permit to a waiter."], [60, "C3", "got permit", "0 left, 1 waiting", ""], [70, "C2", "release()", "permit handed to C4", ""], [70, "C4", "got permit", "0 left", ""], [120, "C3", "release()", "1 left", ""], [130, "C4", "release()", "2 left", "Never more than 2 calls in flight."]] },
    phaser: { label: "Phaser(3)", rows: ["T1", "T2", "T3", "phaser"],
      code: "Phaser phaser = new Phaser(3);   // parties can join (register) and leave (deregister)\n// T1, T3: arriveAndAwaitAdvance(); work; arriveAndDeregister();\n// T2:     arriveAndDeregister();   // leaves after phase 0",
      ev: [[20, "T1", "arriveAndAwaitAdvance() phase 0", "1 of 3 arrived", ""], [40, "T3", "arriveAndAwaitAdvance() phase 0", "2 of 3 arrived", ""], [50, "T2", "arriveAndDeregister()", "3 of 3 → advance; parties now 2", "T2 counts as arrived and leaves, without waiting."], [50, "phaser", "onAdvance(0, parties 2)", "phase 1", "Override onAdvance to run code between phases, or return true to terminate."], [50, "T1", "passes phase 0", "", "T1 and T3 continue."], [80, "T1", "arriveAndDeregister()", "parties 1", ""], [110, "T3", "arriveAndDeregister()", "parties 0 → terminated", "When the last party leaves, onAdvance returns true and the phaser terminates."]] },
    exchanger: { label: "Exchanger<Buffer>", rows: ["producer", "consumer"],
      code: "Exchanger<Buffer> ex = new Exchanger<>();\n// producer: fill a buffer, then  full = ex.exchange(full)  → gets an empty one back\n// consumer: drain a buffer, then  empty = ex.exchange(empty) → gets a full one",
      ev: [[30, "producer", "exchange(full [b1,b2])", "waiting for partner", "The first thread to arrive blocks."], [70, "consumer", "exchange(empty [])", "pair formed", ""], [70, "consumer", "got full [b1,b2]", "", "Both receive the other's object at the same moment."], [70, "producer", "got empty []", "", "Double buffering without copying: each side keeps working on its own buffer."]] }
  };
  function syncWidget(el, ctx) {
    var s = ctx.state; if (!s.k) { s.k = "latch"; s.i = 0; }
    el.innerHTML = "<div class='seg' data-r='k'>" + Object.keys(RUNS).map(function (k) { return "<button type='button' data-v='" + k + "'>" + RUNS[k].label + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='code' style='margin-top:10px'></pre>" +
      "<div class='btnrow'><button type='button' class='btn' data-r='prev'>◀ back</button><button type='button' class='btn primary' data-r='next'>next event ▶</button><button type='button' class='btn' data-r='all'>show all</button><span data-r='pos' style='margin-left:8px'></span></div>" +
      "<div data-r='tl' style='margin-top:10px;overflow-x:auto'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var R = RUNS[s.k], n = R.ev.length, i = Math.min(s.i, n - 1), cur = R.ev[i];
      q("k").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.k); });
      q("code").innerHTML = ctx.H.highlight(R.code, "java");
      q("pos").textContent = "event " + (i + 1) + " / " + n;
      var maxT = R.ev[n - 1][0] + 20, W = 560, X = function (t) { return 90 + t / maxT * (W - 100); };
      var svg = "<svg width='" + W + "' height='" + (R.rows.length * 34 + 30) + "' style='font:12px sans-serif'>";
      R.rows.forEach(function (r, ri) { var y = 20 + ri * 34; svg += "<text x='4' y='" + (y + 4) + "'>" + ctx.esc(r) + "</text><line x1='90' x2='" + (W - 10) + "' y1='" + y + "' y2='" + y + "' stroke='#d1d5db'/>"; });
      for (var t = 0; t <= maxT; t += 20) svg += "<text x='" + X(t) + "' y='" + (R.rows.length * 34 + 22) + "' fill='#6b7280' text-anchor='middle'>" + t + "</text>";
      R.ev.slice(0, i + 1).forEach(function (e, ei) {
        var y = 20 + R.rows.indexOf(e[1]) * 34, last = ei === i;
        svg += "<circle cx='" + X(e[0]) + "' cy='" + y + "' r='" + (last ? 7 : 5) + "' fill='" + (last ? "#2563eb" : "#93c5fd") + "'><title>" + ctx.esc(e[0] + " ms " + e[1] + ": " + e[2]) + "</title></circle>";
      });
      svg += "</svg><div style='font-size:12px;color:#6b7280'>time (ms) →</div>";
      q("tl").innerHTML = svg;
      q("res").innerHTML = ctx.md("**" + cur[0] + " ms · " + cur[1] + "**: `" + cur[2] + "`" + (cur[3] ? " · state: " + cur[3] : "") + ". " + cur[4]);
    }
    q("k").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.k = b.dataset.v; s.i = 0; ctx.save(); draw(); });
    q("next").addEventListener("click", function () { s.i = Math.min(RUNS[s.k].ev.length - 1, s.i + 1); ctx.save(); draw(); });
    q("prev").addEventListener("click", function () { s.i = Math.max(0, s.i - 1); ctx.save(); draw(); });
    q("all").addEventListener("click", function () { s.i = RUNS[s.k].ev.length - 1; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Synchronizers: coordinating control flow",
      text: "Locks protect **data**; synchronizers coordinate **when threads proceed**. A synchronizer holds some state (a count, permits, a phase) that decides whether a thread arriving at it passes or waits. `java.util.concurrent` ships five, all built on the same engine (`AbstractQueuedSynchronizer`, except Exchanger and Phaser). Picking the right one turns pages of wait/notify code (J20) into one line.",
      table: [
        ["Synchronizer", "Question it answers", "Reusable?", "Typical use"],
        ["`CountDownLatch`", "Have N things happened?", "No (one-shot)", "Wait for startup tasks, start gate in tests"],
        ["`CyclicBarrier`", "Have all N threads reached this point?", "Yes (auto-resets)", "Iterative parallel algorithms, simulations"],
        ["`Semaphore`", "Is one of N permits free?", "Yes", "Limit concurrent access (bulkhead, pool)"],
        ["`Phaser`", "Has every registered party finished this phase?", "Yes, dynamic parties", "Multi-phase work with joining/leaving tasks"],
        ["`Exchanger`", "Has my partner arrived to swap?", "Yes", "Double buffering between two threads"]],
      m: M(["flowchart LR",
        "  L[\"CountDownLatch: count 3 → 0\"]:::s1 -->|opens once| W1[\"waiters released\"]:::s2",
        "  B[\"CyclicBarrier: 3 parties\"]:::s1 -->|all arrived| W2[\"all continue, barrier resets\"]:::s2",
        "  S[\"Semaphore: 2 permits\"]:::s1 -->|permit free| W3[\"one more thread enters\"]:::s2",
        "  P[\"Phaser: phase n\"]:::s1 -->|registered parties arrived| W4[\"phase n+1\"]:::s2",
        "  E[\"Exchanger\"]:::s1 -->|partner arrived| W5[\"objects swapped\"]:::s2",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32"]),
      analogy: "A latch is a starting pistol (fires once), a barrier is a tour guide waiting for the whole group at each stop, a semaphore is a car park with N spaces, a phaser is a guide whose group can grow or shrink, and an exchanger is two spies swapping briefcases." },
    { title: "CountDownLatch: wait for N events",
      text: "A latch starts with a count. `countDown()` decrements it (never blocks); `await()` blocks until it reaches **zero**, then the latch stays open forever: it's **one-shot** and can't be reset. The counting threads and the waiting threads are independent: one thread can count down several times, and many threads can await. Always `countDown()` in a `finally`, and prefer `await(timeout)` so a failed worker can't hang the waiter.",
      code: `CountDownLatch ready = new CountDownLatch(3);
List<String> loaded = Collections.synchronizedList(new ArrayList<>());
try (ExecutorService pool = Executors.newFixedThreadPool(3)) {
    for (String cache : List.of("airports", "airlines", "fare-rules")) {
        pool.submit(() -> {
            try { Thread.sleep(20); loaded.add(cache); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            finally { ready.countDown(); }                     // always, even if loading failed
        });
    }
    boolean ok = ready.await(2, TimeUnit.SECONDS);
    System.out.println("all caches warm: " + ok + " " + new TreeSet<>(loaded) + ", count " + ready.getCount());
    System.out.println("await() again returns immediately: " + ready.await(0, TimeUnit.SECONDS));
}`,
      points: ["Spring Boot readiness: don't report READY until the warm-up latch opens"] },
    { title: "Start gates: releasing threads together",
      text: "Two latches make a classic test harness: a **start gate** (`CountDownLatch(1)`) that all workers await so they begin at the same instant, and an **end gate** (`CountDownLatch(n)`) that the main thread awaits. This maximises contention when testing thread-safety (all threads hit the code at once) and gives clean timing measurements.",
      code: `int n = 8;
CountDownLatch startGate = new CountDownLatch(1), endGate = new CountDownLatch(n);
Map<String, Integer> unsafe = new HashMap<>();
ConcurrentHashMap<String, Integer> safe = new ConcurrentHashMap<>();
for (int t = 0; t < n; t++) {
    Thread.ofPlatform().start(() -> {
        try {
            startGate.await();                               // everyone waits here…
            for (int i = 0; i < 10_000; i++) {
                safe.merge("k" + (i % 100), 1, Integer::sum);
                try { unsafe.merge("k" + (i % 100), 1, Integer::sum); } catch (RuntimeException e) { }   // HashMap may even throw
            }
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        finally { endGate.countDown(); }
    });
}
long t0 = System.nanoTime();
startGate.countDown();                                       // …and starts at once
endGate.await();
int unsafeTotal = unsafe.values().stream().mapToInt(Integer::intValue).sum();
int safeTotal = safe.values().stream().mapToInt(Integer::intValue).sum();
System.out.println("expected " + n * 10_000 + " | HashMap " + unsafeTotal + " | ConcurrentHashMap " + safeTotal + " | " + (System.nanoTime() - t0) / 1_000_000 + " ms");` },
    { title: "CyclicBarrier: meet, then continue together",
      text: "A barrier is created for a fixed number of **parties**. Each thread calls `await()` when it reaches the meeting point and blocks until **all** parties have arrived; then all are released and the barrier **resets** for the next round. An optional **barrier action** runs once per round (in the last arriving thread) before anyone continues: perfect for merging per-thread results of an iteration. If one party is interrupted, times out or the action throws, the barrier **breaks** and everyone else gets `BrokenBarrierException`.",
      code: `int workers = 3;
double[] partial = new double[workers];
List<String> rounds = Collections.synchronizedList(new ArrayList<>());
double[] total = {0};
CyclicBarrier barrier = new CyclicBarrier(workers, () -> {            // runs once per round, before release
    double sum = Arrays.stream(partial).sum();
    total[0] += sum;
    rounds.add(String.format("round sum %.0f", sum));
});
List<Thread> ts = new ArrayList<>();
for (int w = 0; w < workers; w++) {
    int id = w;
    ts.add(Thread.ofPlatform().start(() -> {
        try {
            for (int round = 1; round <= 3; round++) {
                partial[id] = (id + 1) * 100 * round;                    // this round's slice of work
                barrier.await();                                          // wait for the others
            }
        } catch (InterruptedException | BrokenBarrierException e) { Thread.currentThread().interrupt(); }
    }));
}
for (Thread t : ts) t.join();
System.out.println(rounds + ", total " + total[0]);` },
    { title: "Semaphore: limit concurrency",
      text: "A semaphore holds **permits**. `acquire()` takes one (blocking while none are free), `release()` returns one. It limits **how many threads** do something at once: calls to a fragile downstream API, open files, expensive reports. Release in `finally`. Use `tryAcquire(timeout)` to fail fast instead of queueing forever. Permits are **not owned**: any thread can release, and releasing more than acquired silently increases the limit, so keep acquire/release symmetric. `new Semaphore(n, true)` is fair (FIFO).",
      code: `Semaphore airlineApi = new Semaphore(3);                      // at most 3 concurrent calls
AtomicInteger inFlight = new AtomicInteger(), maxSeen = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(10)) {
    for (int i = 0; i < 30; i++) {
        pool.submit(() -> {
            airlineApi.acquire();
            try {
                maxSeen.accumulateAndGet(inFlight.incrementAndGet(), Math::max);
                Thread.sleep(10);                                  // the remote call
            } finally {
                inFlight.decrementAndGet();
                airlineApi.release();
            }
            return null;
        });
    }
}
System.out.println("10 threads, 30 calls, max concurrent calls: " + maxSeen.get());

Semaphore oops = new Semaphore(1);
oops.release();                                                    // release without acquire
System.out.println("permits after an extra release: " + oops.availablePermits() + " (limit silently became 2)");` },
    { title: "Semaphores as bulkheads",
      text: "With **virtual threads** (J25) you no longer size thread pools, so pools stop acting as an accidental limit. A semaphore becomes the explicit **bulkhead**: thousands of virtual threads may run, but only N call the payment gateway at once. Combine with `tryAcquire(timeout)` to shed load: if no permit within 100 ms, return a fallback rather than piling up waiters. Resilience4j's `Bulkhead` is a semaphore with metrics and configuration.",
      code: `Semaphore gateway = new Semaphore(5);
AtomicInteger served = new AtomicInteger(), shed = new AtomicInteger();
try (ExecutorService vts = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 200; i++) {
        vts.submit(() -> {
            if (!gateway.tryAcquire(20, TimeUnit.MILLISECONDS)) { shed.incrementAndGet(); return null; }   // fail fast
            try { Thread.sleep(15); served.incrementAndGet(); }
            finally { gateway.release(); }
            return null;
        });
    }
}
System.out.println("served " + served.get() + ", shed with fallback " + shed.get() + " (sum " + (served.get() + shed.get()) + ")");`,
      points: ["A semaphore limits concurrency, not rate: 5 permits ≠ 5 requests per second (use a rate limiter for that)"] },
    { title: "Phaser: flexible multi-phase coordination",
      text: "`Phaser` generalises latch and barrier: parties can **register** and **deregister** at any time, and it counts **phases** (0, 1, 2…). `arriveAndAwaitAdvance()` works like a barrier; `arrive()` signals without waiting; `arriveAndDeregister()` leaves; `awaitAdvance(phase)` waits like a latch. Override `onAdvance(phase, parties)` to run code between phases and return `true` to terminate. Phasers can be **tiered** into trees to reduce contention with many parties.",
      code: `Phaser phaser = new Phaser(1) {                                 // main registers itself
    @Override protected boolean onAdvance(int phase, int parties) {
        System.out.println("phase " + phase + " done with " + parties + " parties");
        return phase >= 2 || parties == 0;                         // terminate after phase 2
    }
};
for (String task : List.of("search", "price", "rank")) {
    phaser.register();                                             // dynamic registration
    Thread.ofPlatform().start(() -> {
        int phases = task.equals("search") ? 1 : 3;                // search leaves early
        for (int p = 0; p < phases; p++) phaser.arriveAndAwaitAdvance();
        phaser.arriveAndDeregister();
    });
}
while (!phaser.isTerminated()) phaser.arriveAndAwaitAdvance();   // main takes part in each phase
System.out.println("terminated at phase " + phaser.getPhase() + " (negative once terminated)");` },
    { title: "Exchanger: swapping with a partner",
      text: "An `Exchanger<V>` is a rendezvous for **two** threads: each calls `exchange(x)` and blocks until the partner arrives, then each receives the other's object. The classic use is **double buffering**: a producer fills buffer A while the consumer drains buffer B, then they swap, with no copying and no shared mutable buffer at any moment. `exchange(x, timeout, unit)` avoids waiting forever. Rarely needed in business code; know it for interviews.",
      code: `Exchanger<List<String>> exchanger = new Exchanger<>();
Thread producer = Thread.ofPlatform().start(() -> {
    List<String> buffer = new ArrayList<>();
    try {
        for (int batch = 1; batch <= 2; batch++) {
            for (int i = 1; i <= 3; i++) buffer.add("b" + batch + "-" + i);
            buffer = exchanger.exchange(buffer);                 // hand the full buffer over, get an empty one
        }
    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
});
List<String> buffer = new ArrayList<>();
for (int batch = 1; batch <= 2; batch++) {
    buffer = exchanger.exchange(buffer);                         // hand over an empty buffer, get a full one
    System.out.println("consumer drained " + buffer);
    buffer.clear();
}
producer.join();` },
    { title: "Choosing a synchronizer",
      text: "Ask what you are waiting for. **Events** → latch (or a `CompletableFuture`). **Peers at a point, repeatedly** → barrier. **Capacity** → semaphore. **Phases with changing membership** → phaser. **Results of tasks** → don't use a synchronizer at all: `invokeAll`, `CompletableFuture.allOf`, or structured concurrency (J25) give you results and exceptions too.",
      table: [
        ["", "CountDownLatch", "CyclicBarrier", "Phaser", "Semaphore"],
        ["Who waits", "Any threads, for the count", "The parties themselves", "Registered parties (or anyone via awaitAdvance)", "Threads wanting a permit"],
        ["Parties fixed?", "Count fixed", "Fixed", "Dynamic", "Permits adjustable"],
        ["Reset", "Never", "Automatic each round", "Automatic, numbered phases", "n/a"],
        ["Action between rounds", "✘", "Barrier action", "`onAdvance`", "✘"],
        ["Failure behaviour", "Waiter hangs unless timed", "BrokenBarrierException for all", "Termination", "Permit leak if not released"]],
      code: `ExecutorService pool = Executors.newFixedThreadPool(3);
List<Callable<String>> lookups = List.of(() -> "6E:4850", () -> "AI:5300", () -> "UK:6100");
List<String> fares = pool.invokeAll(lookups).stream().map(Future::resultNow).toList();     // no latch needed
System.out.println("results directly: " + fares);
pool.shutdown();` },
    { title: "Failure modes",
      text: "Synchronizers turn bugs into **hangs**. A worker that throws before `countDown()` leaves the latch above zero forever; a barrier created for 4 parties with only 3 threads never trips; an exception that skips `release()` leaks a permit until the semaphore is exhausted. Defend with `finally`, **timeouts on every wait** (`await(timeout)`, `tryAcquire(timeout)`), and by handling `BrokenBarrierException` / `TimeoutException`. A thread dump of such a hang shows threads parked in `CountDownLatch.await`, `CyclicBarrier.dowait` or `Semaphore.acquire`.",
      code: `CyclicBarrier barrier = new CyclicBarrier(3);                   // 3 parties, but only 2 threads show up
List<String> outcomes = Collections.synchronizedList(new ArrayList<>());
List<Thread> ts = new ArrayList<>();
for (int i = 0; i < 2; i++) {
    int id = i;
    ts.add(Thread.ofPlatform().start(() -> {
        try { barrier.await(100 + id * 100L, TimeUnit.MILLISECONDS); outcomes.add("T" + id + " passed"); }
        catch (TimeoutException e) { outcomes.add("T" + id + " timed out (breaks the barrier)"); }
        catch (BrokenBarrierException e) { outcomes.add("T" + id + " BrokenBarrierException"); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }));
}
for (Thread t : ts) t.join();
System.out.println(outcomes + ", broken=" + barrier.isBroken());
barrier.reset();
System.out.println("after reset(): broken=" + barrier.isBroken());` },
    { title: "Under the hood: AbstractQueuedSynchronizer",
      text: "`ReentrantLock`, `ReentrantReadWriteLock`, `Semaphore`, `CountDownLatch` and `ThreadPoolExecutor`'s workers are built on **AQS**: one `int state` changed with CAS, plus a FIFO queue of parked threads. A subclass only defines what *acquire* and *release* mean for `state`, in **exclusive** mode (`tryAcquire`/`tryRelease`: locks) or **shared** mode (`tryAcquireShared`/`tryReleaseShared`: latches, semaphores). AQS handles queueing, parking, timeouts, interruption and fairness. Writing your own is rare but a good way to understand the library.",
      m: M(["flowchart LR",
        "  A[\"acquire()\"]:::s0 --> T{\"tryAcquire: CAS on state\"}",
        "  T -->|success| R[\"proceed\"]:::s2",
        "  T -->|fail| Q[\"enqueue node, park()\"]:::s4",
        "  REL[\"release(): tryRelease, CAS state\"]:::s1 --> U[\"unpark next queued thread\"]:::s1",
        "  U --> T",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `class OneShotLatch {                                              // a binary latch (JCIP 14.6)
    private final Sync sync = new Sync();
    void signal() { sync.releaseShared(0); }
    void await() throws InterruptedException { sync.acquireSharedInterruptibly(0); }
    private static class Sync extends java.util.concurrent.locks.AbstractQueuedSynchronizer {
        protected int tryAcquireShared(int ignored) { return getState() == 1 ? 1 : -1; }   // ≥ 0 means pass
        protected boolean tryReleaseShared(int ignored) { setState(1); return true; }     // open; wake all waiters
    }
}
OneShotLatch gate = new OneShotLatch();
List<Thread> waiters = new ArrayList<>();
for (int i = 0; i < 3; i++) waiters.add(Thread.ofPlatform().start(() -> { try { gate.await(); } catch (InterruptedException e) { } }));
Thread.sleep(50);
System.out.println("before signal: " + waiters.stream().map(t -> t.getState().toString()).toList());
gate.signal();
for (Thread t : waiters) t.join();
System.out.println("after signal: all " + waiters.size() + " passed");` }
  ];

  H.registerLesson({
    code: "J21",
    summary: "The `java.util.concurrent` synchronizers that coordinate when threads proceed: `CountDownLatch` (one-shot event counts, start and end gates), `CyclicBarrier` (parties meeting repeatedly, barrier actions, broken barriers), `Semaphore` (permits, concurrency limits, bulkheads for virtual threads), `Phaser` (dynamic parties and numbered phases), `Exchanger` (double buffering), how to choose between them and higher-level alternatives, their failure modes and timeouts, and the `AbstractQueuedSynchronizer` they are built on.",
    slides: SLIDES,
    widget: { heading: "Interactive: synchronizer timelines from a real run", caption: "Each timeline is one run recorded on Java 21 (times rounded to 10 ms). Step through the events to see who blocks, who is released, and what state the synchronizer is in.", render: syncWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Startup warm-up", "A latch holds readiness until caches, connections and feature flags are loaded."],
      ["Concurrency tests", "Start gates release all threads at once to expose races; end gates collect results."],
      ["Bulkheads", "Semaphores (or Resilience4j Bulkhead) cap concurrent calls to payment gateways, airline APIs or report generation."],
      ["Batch simulations", "Barriers synchronise iterations of parallel simulations, ML-style mini-batches or grid computations."],
      ["Pipelines", "Phasers coordinate multi-stage jobs where workers join and finish at different stages."],
      ["Hang analysis", "Thread dumps showing threads parked in `CountDownLatch.await` or `Semaphore.acquire` point to a missing countDown/release."]
    ],
    pitfalls: [
      "`countDown()` / `release()` not in `finally`",
      "Waiting without a timeout on latches, barriers and semaphores",
      "Expecting a CountDownLatch to reset",
      "A barrier whose party count doesn't match the threads that use it",
      "Releasing a semaphore more times than acquired (silently raises the limit)",
      "Treating a semaphore as a rate limiter",
      "Using synchronizers where you need task results (use futures)",
      "Ignoring BrokenBarrierException",
      "Running barrier tasks on a pool smaller than the number of parties (deadlock)"
    ],
    quiz: [
      { q: "Which synchronizer is one-shot and cannot be reset?", options: ["CyclicBarrier", "CountDownLatch", "Semaphore", "Phaser"], answer: 1, why: "Once the count reaches zero it stays open; create a new latch (or use a barrier/phaser) for repeated rounds." },
      { q: "A CyclicBarrier(3) is used by tasks on `Executors.newFixedThreadPool(2)`. What happens?", options: ["Works, slightly slower", "The two running tasks wait at the barrier forever; the third task never gets a thread (deadlock)", "BrokenBarrierException immediately", "The pool grows to 3"], answer: 1, why: "All parties must run concurrently. Use at least as many threads as parties (or a timeout)." },
      { q: "What does `semaphore.release()` do if the thread never acquired a permit?", options: ["Throws IllegalMonitorStateException", "Adds a permit, increasing the effective limit", "Nothing", "Blocks"], answer: 1, why: "Semaphores have no ownership. Keep acquire/release symmetric with try/finally." },
      { q: "Which runs the barrier action of a CyclicBarrier?", options: ["A new thread", "The last thread to arrive, before any party is released", "The first thread to arrive", "The main thread"], answer: 1, why: "It runs once per round in the last arriving thread." },
      { q: "What does this print?", code: `CountDownLatch latch = new CountDownLatch(2);
latch.countDown();
latch.countDown();
latch.countDown();
System.out.println(latch.getCount() + " " + latch.await(0, TimeUnit.SECONDS));`, options: ["-1 true", "0 true", "0 false", "IllegalStateException"], answer: 1, why: "countDown at zero has no effect; the count never goes negative, and await returns true immediately." },
      { q: "You need to cap concurrent calls to a downstream service at 10 while running on virtual threads. What do you use?", options: ["A fixed thread pool of 10", "A Semaphore(10), ideally with tryAcquire(timeout)", "CountDownLatch(10)", "CyclicBarrier(10)"], answer: 1, why: "Virtual threads aren't pooled for limiting; a semaphore is the explicit bulkhead." },
      { q: "What makes Phaser different from CyclicBarrier?", options: ["It's one-shot", "Parties can register/deregister dynamically and phases are numbered; onAdvance can terminate it", "It doesn't block", "It only supports two threads"], answer: 1, why: "It also supports arrive-without-waiting and tiering." },
      { q: "One party waiting at a CyclicBarrier times out. What happens to the others?", options: ["They keep waiting", "The barrier breaks: waiting and future await() calls throw BrokenBarrierException until reset()", "They pass", "The barrier shrinks to fewer parties"], answer: 1, why: "A broken barrier is all-or-nothing; handle the exception and reset if appropriate." },
      { q: "What is Exchanger used for?", options: ["Swapping objects between two threads at a rendezvous point, e.g. double buffering", "Exchanging locks", "Message passing between many threads", "Transactions"], answer: 0, why: "Each thread blocks in exchange() until its partner arrives, then both receive the other's object." }
    ],
    cheatsheet: {
      table: [
        ["Task", "Code"],
        ["Wait for N events", "`latch = new CountDownLatch(n); … finally { latch.countDown(); } … latch.await(5, SECONDS)`"],
        ["Start all at once", "`start = new CountDownLatch(1); workers: start.await(); main: start.countDown()`"],
        ["Rounds of parallel work", "`new CyclicBarrier(n, () -> merge()); barrier.await()`"],
        ["Limit concurrency", "`sem.acquire(); try { … } finally { sem.release(); }`"],
        ["Shed load", "`if (!sem.tryAcquire(100, MILLISECONDS)) return fallback();`"],
        ["Dynamic phases", "`phaser.register(); phaser.arriveAndAwaitAdvance(); phaser.arriveAndDeregister()`"],
        ["Swap buffers", "`buffer = exchanger.exchange(buffer)`"]],
      cards: [
        { title: "Pick by question", items: ["Events happened? latch", "Peers arrived? barrier", "Capacity free? semaphore", "Phase done? phaser", "Partner here? exchanger"] },
        { title: "Safety", items: ["countDown/release in finally", "Timeouts everywhere", "Threads ≥ barrier parties", "Symmetric permits"] },
        { title: "Say in interviews", items: ["Latch one-shot vs barrier cyclic", "Barrier action in last thread", "Semaphore has no owner", "Built on AQS", "Futures when you need results"] }]
    },
    practice: [
      { level: "Easy", q: "CountDownLatch vs CyclicBarrier?",
        a: ["Latch: waits for a count of events; countDown never blocks; any threads can await; one-shot.",
          "Barrier: a fixed number of parties wait for each other at a point; all are released together; resets automatically for the next round; optional barrier action.",
          "Latch failure: waiters hang (use timeouts). Barrier failure: BrokenBarrierException for all parties."] },
      { level: "Easy", q: "What is a Semaphore? Give two real uses.",
        a: ["A set of permits: acquire takes one (blocking if none), release returns one.",
          "Bulkhead: limit concurrent calls to a downstream service or an expensive operation.",
          "Resource pool: bound the number of borrowed connections/buffers.",
          "A Semaphore(1) is a non-reentrant mutex that any thread can release."] },
      { level: "Easy", q: "Use a CountDownLatch to wait for three services to initialise, with a timeout.",
        a: ["Create `new CountDownLatch(3)`.",
          "Each initialiser calls `countDown()` in finally.",
          "The main thread calls `await(timeout)` and fails startup if it returns false."],
        code: `CountDownLatch init = new CountDownLatch(3);
try (ExecutorService pool = Executors.newFixedThreadPool(3)) {
    for (int i = 0; i < 3; i++) { int ms = 10 * (i + 1); pool.submit(() -> { try { Thread.sleep(ms); } catch (InterruptedException e) { } finally { init.countDown(); } }); }
    System.out.println(init.await(1, TimeUnit.SECONDS) ? "all services up" : "startup timed out");
}` },
      { level: "Medium", q: "Implement a resource pool of N connections with a Semaphore.",
        a: ["A semaphore with N permits plus a concurrent queue of idle connections.",
          "borrow: acquire (or tryAcquire with timeout), then poll a connection from the queue.",
          "release: offer the connection back, then release the permit, in finally on the caller side.",
          "The semaphore guarantees the queue is never empty when a permit is held."],
        code: `class Pool<T> {
    private final Semaphore permits;
    private final ConcurrentLinkedQueue<T> idle;
    Pool(List<T> items) { idle = new ConcurrentLinkedQueue<>(items); permits = new Semaphore(items.size()); }
    T borrow(long ms) throws InterruptedException {
        if (!permits.tryAcquire(ms, TimeUnit.MILLISECONDS)) throw new IllegalStateException("pool exhausted");
        return idle.poll();
    }
    void giveBack(T item) { idle.offer(item); permits.release(); }
}
Pool<String> pool = new Pool<>(List.of("conn-1", "conn-2"));
AtomicInteger maxBorrowed = new AtomicInteger(), borrowed = new AtomicInteger();
try (ExecutorService ex = Executors.newFixedThreadPool(6)) {
    for (int i = 0; i < 20; i++) ex.submit(() -> {
        String c = pool.borrow(1_000);
        try { maxBorrowed.accumulateAndGet(borrowed.incrementAndGet(), Math::max); Thread.sleep(5); }
        finally { borrowed.decrementAndGet(); pool.giveBack(c); }
        return c;
    });
}
System.out.println("max borrowed at once: " + maxBorrowed.get());` },
      { level: "Medium", q: "When would you use a Phaser instead of a CyclicBarrier or CountDownLatch?",
        a: ["When the number of parties changes over time (tasks join late or finish early).",
          "When you need numbered phases and logic between phases (onAdvance) or a termination condition.",
          "When some parties should signal arrival without waiting (`arrive()`).",
          "When very many parties need tiered phasers to reduce contention."] },
      { level: "Medium", q: "Write a test that checks a counter is thread-safe by starting 8 threads at the same moment.",
        a: ["Start gate latch(1) so threads begin together and maximise interleaving.",
          "End gate latch(8) to wait for completion.",
          "Compare the final count with the expected total; repeat the test several times since races are probabilistic."],
        code: `AtomicLong counter = new AtomicLong();
CountDownLatch start = new CountDownLatch(1), end = new CountDownLatch(8);
for (int t = 0; t < 8; t++) Thread.ofPlatform().start(() -> {
    try { start.await(); for (int i = 0; i < 10_000; i++) counter.incrementAndGet(); }
    catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    finally { end.countDown(); }
});
start.countDown();
end.await();
System.out.println(counter.get() == 80_000 ? "PASS" : "FAIL " + counter.get());` },
      { level: "Medium", q: "Why is a Semaphore not a rate limiter?",
        a: ["A semaphore limits how many operations run concurrently, not how many start per unit of time.",
          "With 5 permits and 10 ms calls you could do 500 calls per second; with 2 s calls only 2.5 per second.",
          "For rates use a token bucket (Guava RateLimiter, Bucket4j, Resilience4j RateLimiter).",
          "Often you want both: a rate limit and a concurrency limit."] },
      { level: "Hard", q: "A nightly job hangs forever; the dump shows main in `CountDownLatch.await` and no worker threads alive. Diagnose and fix.",
        a: ["Some worker finished without calling countDown: most likely an exception was thrown before it and countDown wasn't in finally (or a task was rejected/never submitted).",
          "Check logs for exceptions swallowed by executor futures, and rejected executions.",
          "Fix: countDown in finally; await with a timeout and report which tasks didn't finish; better, use invokeAll/CompletableFuture.allOf which carry exceptions.",
          "Add metrics/alerts on job duration."] },
      { level: "Hard", q: "Implement parallel iterative computation with CyclicBarrier: each of N workers updates its slice each round, and the barrier action checks convergence.",
        a: ["Shared arrays for current values; each worker computes its slice for the round.",
          "barrier.await() at the end of each round; the barrier action (single thread, all others waiting) swaps buffers and checks convergence, setting a volatile done flag.",
          "Workers loop while !done.",
          "Thread count must equal parties; handle BrokenBarrierException by stopping."],
        code: `int workers = 4, n = 8;
double[] values = new double[n];
Arrays.fill(values, 100);
AtomicInteger rounds = new AtomicInteger();
boolean[] done = {false};
CyclicBarrier barrier = new CyclicBarrier(workers, () -> {
    rounds.incrementAndGet();
    done[0] = Arrays.stream(values).allMatch(v -> v < 1);           // runs while all workers wait: safe
});
List<Thread> ts = new ArrayList<>();
for (int w = 0; w < workers; w++) {
    int from = w * n / workers, to = (w + 1) * n / workers;
    ts.add(Thread.ofPlatform().start(() -> {
        try {
            while (!done[0]) {
                for (int i = from; i < to; i++) values[i] /= 2;              // this round's work on my slice
                barrier.await();
            }
        } catch (InterruptedException | BrokenBarrierException e) { Thread.currentThread().interrupt(); }
    }));
}
for (Thread t : ts) t.join();
System.out.println("converged after " + rounds.get() + " rounds, max " + Arrays.stream(values).max().getAsDouble());` },
      { level: "Hard", q: "Design load shedding for a fare-search API calling a slow partner, using synchronizers.",
        steps: ["Semaphore bulkhead per partner sized from the partner's concurrency budget (e.g. 20).",
          "`tryAcquire(50 ms)`: on failure return cached or partial results immediately (HTTP 200 with a 'partial' flag) instead of queueing.",
          "Release in finally, with a call timeout so slow calls return permits.",
          "Export metrics: available permits, rejections, wait time; alert when rejections rise.",
          "Combine with a circuit breaker and a rate limiter (Resilience4j) for the full picture."] }
    ],
    recap: [
      "Synchronizers coordinate when threads proceed; locks protect data.",
      "CountDownLatch: one-shot event count; CyclicBarrier: parties meet each round, with an optional action.",
      "Semaphore: N permits for concurrency limits and bulkheads; release in finally; not a rate limiter.",
      "Phaser: dynamic parties and phases; Exchanger: two-thread swap.",
      "Use timeouts and finally to avoid hangs; prefer futures when you need results; all are built on AQS."
    ]
  });
})();
