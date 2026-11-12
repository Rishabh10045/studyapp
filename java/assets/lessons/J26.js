/* Lesson J26: Deadlock, livelock & starvation */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Grounded on JDK 21: T1 locks A then B, T2 locks B then A (100 ms pause between) → jstack prints
  // "Found one Java-level deadlock" with T1 waiting for a lock held by T2 and vice versa, and
  // ThreadMXBean.findDeadlockedThreads() reports both BLOCKED. The 3-thread ring A→B, B→C, C→A reports
  // T1 held by T2, T2 held by T3, T3 held by T1. The JS model was checked over every interleaving:
  // the opposite-order and ring programs can deadlock; lock ordering and tryLock+back-off never do.
  var SCEN = {
    pair: { label: "two transfers, opposite order", progs: { T1: ["A", "B"], T2: ["B", "A"] }, tryLock: false,
      code: "void transfer(Account from, Account to, int amt) {\n    synchronized (from) {\n        synchronized (to) { from.debit(amt); to.credit(amt); }\n    }\n}\n// T1: transfer(A, B)    T2: transfer(B, A)" },
    ring: { label: "three-way ring", progs: { T1: ["A", "B"], T2: ["B", "C"], T3: ["C", "A"] }, tryLock: false,
      code: "// T1: transfer(A, B)   T2: transfer(B, C)   T3: transfer(C, A)\n// each locks 'from' first, then 'to'" },
    ordered: { label: "fix: global lock order", progs: { T1: ["A", "B"], T2: ["B", "C"], T3: ["A", "C"] }, tryLock: false,
      code: "void transfer(Account from, Account to, int amt) {\n    Account first = from.id() < to.id() ? from : to;     // always lock the lower id first\n    Account second = first == from ? to : from;\n    synchronized (first) { synchronized (second) { from.debit(amt); to.credit(amt); } }\n}" },
    trylock: { label: "fix: tryLock + back-off", progs: { T1: ["A", "B"], T2: ["B", "C"], T3: ["C", "A"] }, tryLock: true,
      code: "while (true) {\n    from.lock.lock();\n    try {\n        if (to.lock.tryLock(50, TimeUnit.MILLISECONDS)) {\n            try { from.debit(amt); to.credit(amt); return; } finally { to.lock.unlock(); }\n        }\n    } finally { from.lock.unlock(); }\n    Thread.sleep(ThreadLocalRandom.current().nextInt(1, 20));   // back off with jitter, then retry\n}" }
  };
  function fresh(sc) { var S = { owner: {}, th: {}, log: [] }; Object.keys(SCEN[sc].progs).forEach(function (t) { S.th[t] = { pc: 0, retries: 0, wait: null }; }); return S; }
  function step(sc, S, t) {
    var prog = SCEN[sc].progs[t], T = S.th[t];
    if (T.pc >= 3) return;
    if (T.pc < 2) {
      var L = prog[T.pc], o = S.owner[L];
      if (!o) { S.owner[L] = t; T.pc++; T.wait = null; S.log.push(t + " locks " + L); }
      else if (T.pc === 1 && SCEN[sc].tryLock) { delete S.owner[prog[0]]; T.pc = 0; T.retries++; T.wait = null; S.log.push(t + " tryLock(" + L + ") fails → releases " + prog[0] + ", backs off"); }
      else { T.wait = L; S.log.push(t + " blocked on " + L + " (held by " + o + ")"); }
    } else { delete S.owner[prog[1]]; delete S.owner[prog[0]]; T.pc = 3; S.log.push(t + " transfers, releases " + prog[1] + " and " + prog[0]); }
  }
  function cycle(S) {
    var ts = Object.keys(S.th);
    for (var i = 0; i < ts.length; i++) {
      var seen = [], cur = ts[i];
      while (cur && S.th[cur].wait && seen.indexOf(cur) < 0) { seen.push(cur); cur = S.owner[S.th[cur].wait]; }
      if (cur && seen.indexOf(cur) >= 0) return seen.slice(seen.indexOf(cur));
    }
    return null;
  }
  function dlWidget(el, ctx) {
    var s = ctx.state; if (!s.sc) { s.sc = "pair"; s.sim = null; }
    el.innerHTML = "<div class='seg' data-r='sc'>" + Object.keys(SCEN).map(function (k) { return "<button type='button' data-v='" + k + "'>" + SCEN[k].label + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='code' style='margin-top:10px'></pre><div class='btnrow' data-r='steps' style='margin-top:6px'></div>" +
      "<div class='btnrow' style='margin-top:6px'><button type='button' class='btn primary' data-r='worst'>worst-case schedule</button><button type='button' class='btn' data-r='rand'>random schedule</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><pre class='code' data-r='dump' style='display:none'></pre><div class='tablewrap' data-r='log'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      if (!s.sim) s.sim = fresh(s.sc);
      var S = s.sim, ts = Object.keys(S.th), cyc = cycle(S);
      q("sc").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", s.sc === b.dataset.v); });
      q("code").innerHTML = ctx.H.highlight(SCEN[s.sc].code, "java");
      q("steps").innerHTML = ts.map(function (t) { var T = S.th[t]; return "<button type='button' class='btn' data-t='" + t + "'" + (T.pc >= 3 || cyc ? " disabled" : "") + ">step " + t + (T.pc >= 3 ? " (done)" : "") + "</button>"; }).join("");
      var G = ["flowchart LR"], locks = {};
      ts.forEach(function (t) { SCEN[s.sc].progs[t].forEach(function (l) { locks[l] = 1; }); });
      Object.keys(locks).forEach(function (l) { G.push("  L" + l + "([\"lock " + l + "\"]):::lk"); });
      ts.forEach(function (t) {
        var T = S.th[t], inCyc = cyc && cyc.indexOf(t) >= 0;
        G.push("  " + t + "[\"" + t + "<br/>" + (T.pc >= 3 ? "done" : T.wait ? "BLOCKED" : "RUNNABLE") + (T.retries ? "<br/>retries " + T.retries : "") + "\"]:::" + (inCyc ? "bad" : T.pc >= 3 ? "ok" : "th"));
        if (T.wait) G.push("  " + t + " -.->|waits for| L" + T.wait);
      });
      Object.keys(S.owner).forEach(function (l) { G.push("  L" + l + " -->|held by| " + S.owner[l]); });
      G.push("  classDef th fill:#dbeafe,stroke:#2563eb", "  classDef ok fill:#e8f5e9,stroke:#2e7d32", "  classDef bad fill:#ffebee,stroke:#c62828", "  classDef lk fill:#fff3e0,stroke:#ef6c00");
      ctx.H.renderDiagram(q("dg"), G.join("\n"));
      var done = ts.every(function (t) { return S.th[t].pc >= 3; }), retries = ts.reduce(function (a, t) { return a + S.th[t].retries; }, 0);
      q("res").innerHTML = ctx.md(cyc ? "**Deadlock:** " + cyc.join(" → ") + " → " + cyc[0] + " wait for each other in a cycle. No thread can ever proceed; the JVM won't break it. This is what `jstack` reports:" :
        done ? "**All transfers completed.**" + (retries ? " " + retries + " tryLock failure(s) were resolved by releasing and retrying." : "") + (s.sc === "ordered" ? " With a global order no cycle can form, under any schedule." : "") :
        "Step the threads in any order, or try the worst-case schedule (every thread takes its first lock before any takes its second).");
      var dump = q("dump");
      if (cyc) {
        dump.style.display = "";
        dump.textContent = "Found one Java-level deadlock:\n=============================\n" + cyc.map(function (t) { var L = S.th[t].wait; return "\"" + t + "\":\n  waiting to lock monitor (object for lock " + L + ", a java.lang.Object),\n  which is held by \"" + S.owner[L] + "\""; }).join("\n\n") + "\n\nFound 1 deadlock.";
      } else dump.style.display = "none";
      q("log").innerHTML = S.log.length ? "<table><thead><tr><th>#</th><th>event</th></tr></thead><tbody>" + S.log.slice(-8).map(function (x, i, arr) { return "<tr><td>" + (S.log.length - arr.length + i + 1) + "</td><td>" + x + "</td></tr>"; }).join("") + "</tbody></table>" : "";
    }
    q("sc").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.sc = b.dataset.v; s.sim = fresh(s.sc); ctx.save(); draw(); });
    q("steps").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || b.disabled) return; step(s.sc, s.sim, b.dataset.t); ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.sim = fresh(s.sc); ctx.save(); draw(); });
    q("worst").addEventListener("click", function () {
      s.sim = fresh(s.sc); var ts = Object.keys(s.sim.th);
      for (var k = 0; k < 40 && !cycle(s.sim) && !ts.every(function (t) { return s.sim.th[t].pc >= 3; }); k++) step(s.sc, s.sim, ts[k % ts.length]);
      ctx.save(); draw();
    });
    q("rand").addEventListener("click", function () {
      s.sim = fresh(s.sc); var ts = Object.keys(s.sim.th);
      for (var k = 0; k < 60 && !cycle(s.sim); k++) { var live = ts.filter(function (t) { return s.sim.th[t].pc < 3; }); if (!live.length) break; step(s.sc, s.sim, live[Math.floor(Math.random() * live.length)]); }
      ctx.save(); draw();
    });
    draw();
  }

  var SLIDES = [
    { title: "Liveness failures: deadlock, livelock, starvation",
      text: "Safety bugs (races) give wrong answers; **liveness** bugs mean work stops making progress. **Deadlock**: threads wait for each other forever, CPU idle, threads `BLOCKED`/`WAITING`. **Livelock**: threads keep reacting to each other (retry, back off, retry) and stay busy without progress, so CPU is high. **Starvation**: some threads progress but one rarely or never gets the lock, CPU or permit it needs. All three tend to appear only under load, which is why interviewers ask how you would **prevent** and **diagnose** them.",
      m: M(["flowchart LR",
        "  L[\"Liveness failure\"]:::s1 --> D[\"Deadlock<br/>cycle of waits, CPU idle\"]:::s4",
        "  L --> LL[\"Livelock<br/>busy retrying, no progress\"]:::s3",
        "  L --> S[\"Starvation<br/>one thread never gets its turn\"]:::s3",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#ffebee,stroke:#c62828"]),
      table: [["Failure", "Threads look", "CPU", "Typical cause"],
        ["Deadlock", "BLOCKED / WAITING forever", "Low", "Locks taken in different orders"],
        ["Livelock", "RUNNABLE, retrying", "High", "Symmetric retry without randomness"],
        ["Starvation", "Some waiting very long", "Varies", "Unfair locks, long holders, priorities, greedy readers"]],
      analogy: "Deadlock: two cars nose to nose on a one-lane bridge, both waiting. Livelock: two people in a corridor stepping aside in the same direction again and again. Starvation: the person at the counter who never gets served because others keep pushing in." },
    { title: "The four conditions for deadlock",
      text: "Deadlock requires all four **Coffman conditions** at once: **mutual exclusion** (a resource held by one thread at a time), **hold and wait** (holding one resource while waiting for another), **no preemption** (nobody can take a lock away), and **circular wait** (a cycle of threads each waiting for the next). Prevention means breaking one: in practice you break **circular wait** with a global lock order, or **hold and wait** with `tryLock`/timeouts (release everything and retry) or by taking all locks at once. The widget shows the cycle forming in the wait-for graph and both fixes completing under every schedule.",
      m: M(["flowchart LR",
        "  T1[\"T1 holds A\"]:::s4 -->|waits for B| T2[\"T2 holds B\"]:::s4",
        "  T2 -->|waits for A| T1",
        "  C1[\"mutual exclusion\"]:::s3", "  C2[\"hold and wait\"]:::s3", "  C3[\"no preemption\"]:::s3", "  C4[\"circular wait\"]:::s3",
        "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#ffebee,stroke:#c62828"]),
      table: [["Condition", "How to break it"],
        ["Mutual exclusion", "Lock-free/immutable data, atomics, confinement"],
        ["Hold and wait", "tryLock with timeout, release all and retry; acquire everything up front"],
        ["No preemption", "Timeouts and interruption (lockInterruptibly)"],
        ["Circular wait", "Global lock ordering (by id, by address hierarchy)"]],
      code: `Object a = new Object(), b = new Object();
CountDownLatch bothHoldOne = new CountDownLatch(2);
Thread t1 = new Thread(() -> { synchronized (a) { bothHoldOne.countDown(); try { bothHoldOne.await(); } catch (InterruptedException e) { return; } synchronized (b) { } } }, "T1");
Thread t2 = new Thread(() -> { synchronized (b) { bothHoldOne.countDown(); try { bothHoldOne.await(); } catch (InterruptedException e) { return; } synchronized (a) { } } }, "T2");
t1.setDaemon(true); t2.setDaemon(true);                  // let the JVM exit despite the deadlock
t1.start(); t2.start();
t1.join(500);
System.out.println("after 500 ms: T1 " + t1.getState() + ", T2 " + t2.getState() + " → deadlocked forever");` },
    { title: "Detecting deadlocks: thread dumps and ThreadMXBean",
      text: "Take a **thread dump**: `jstack <pid>`, `jcmd <pid> Thread.print`, `kill -3 <pid>` (dump goes to stdout), or VisualVM/JMC. The JVM finds monitor and `ReentrantLock` cycles itself and prints **\"Found one Java-level deadlock\"** with who holds and who waits, then each thread's stack with `- locked <0x…>` and `- waiting to lock <0x…>` lines (the widget's dump uses that recorded format). Programmatically, **`ThreadMXBean.findDeadlockedThreads()`** returns the ids, which a health check can expose. Take two or three dumps a few seconds apart: a deadlock looks identical every time.",
      code: `ReentrantLock a = new ReentrantLock(), b = new ReentrantLock();
CountDownLatch ready = new CountDownLatch(2);
Thread t1 = new Thread(() -> { a.lock(); ready.countDown(); try { ready.await(); b.lock(); } catch (InterruptedException e) { } }, "payments-1");
Thread t2 = new Thread(() -> { b.lock(); ready.countDown(); try { ready.await(); a.lock(); } catch (InterruptedException e) { } }, "payments-2");
t1.setDaemon(true); t2.setDaemon(true); t1.start(); t2.start();
Thread.sleep(300);
java.lang.management.ThreadMXBean mx = java.lang.management.ManagementFactory.getThreadMXBean();
long[] ids = mx.findDeadlockedThreads();
for (java.lang.management.ThreadInfo ti : mx.getThreadInfo(ids))
    System.out.println(ti.getThreadName() + " is " + ti.getThreadState() + " waiting for a lock held by " + ti.getLockOwnerName());`,
      lang: "java" },
    { title: "Prevention 1: global lock ordering",
      text: "If every thread acquires locks in the **same global order**, a cycle is impossible: whoever holds the \"lower\" lock can always eventually get the \"higher\" one. Order by a stable unique key (account id, primary key). When there is no natural key, `System.identityHashCode` with a tie-breaker lock works. Ordering also applies across layers: if the service locks the order and then the inventory, every code path must do the same. Database row locks follow the same rule (update rows in key order).",
      code: `record Account(int id, AtomicLong balance) { }
static void transfer(Account from, Account to, long amt) {
    Account first = from.id() < to.id() ? from : to, second = first == from ? to : from;   // lower id first, always
    synchronized (first) { synchronized (second) { from.balance().addAndGet(-amt); to.balance().addAndGet(amt); } }
}
List<Account> accts = IntStream.range(0, 5).mapToObj(i -> new Account(i, new AtomicLong(1_000))).toList();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 20_000; i++) {
        int x = i % 5, y = (i * 7 + 3) % 5;
        if (x != y) pool.submit(() -> transfer(accts.get(x), accts.get(y), 1));
    }
}
System.out.println("finished without deadlock, total still " + accts.stream().mapToLong(a -> a.balance().get()).sum());` },
    { title: "Prevention 2: tryLock with timeout and back-off",
      text: "`ReentrantLock.tryLock(timeout)` breaks **hold and wait**: if the second lock isn't available in time, release the first, back off for a **random** interval, and retry. No cycle can persist because someone always lets go. Add a retry limit or overall deadline and report failure rather than spinning forever. `lockInterruptibly()` lets a stuck operation be cancelled. The cost: more complex code, possible wasted work, and livelock if back-off isn't randomised (next slide).",
      code: `ReentrantLock a = new ReentrantLock(), b = new ReentrantLock();
AtomicInteger retries = new AtomicInteger();
BiFunction<ReentrantLock, ReentrantLock, Boolean> both = (first, second) -> {
    for (int attempt = 0; attempt < 100; attempt++) {
        first.lock();
        try {
            try { if (second.tryLock(1, TimeUnit.MILLISECONDS)) { try { return true; } finally { second.unlock(); } } }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); return false; }
        } finally { first.unlock(); }
        retries.incrementAndGet();
        try { Thread.sleep(ThreadLocalRandom.current().nextInt(1, 5)); } catch (InterruptedException e) { return false; }   // jittered back-off
    }
    return false;
};
try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
    Future<Integer> f1 = pool.submit(() -> { int ok = 0; for (int i = 0; i < 200; i++) if (both.apply(a, b)) ok++; return ok; });
    Future<Integer> f2 = pool.submit(() -> { int ok = 0; for (int i = 0; i < 200; i++) if (both.apply(b, a)) ok++; return ok; });   // opposite order, still safe
    System.out.println("completed " + (f1.get() + f2.get()) + "/400 operations, no deadlock");
}` },
    { title: "Livelock and why back-off needs jitter",
      text: "In a **livelock** threads aren't blocked; they are busy responding to each other. Two threads that both take their first lock, fail `tryLock` on the second, release, wait **the same fixed time** and retry can repeat that dance indefinitely. Network protocols hit the same issue (Ethernet collisions), and the fix is the same: **randomised (jittered) exponential back-off**, a retry limit, or breaking symmetry (priorities, ordering). Livelocks show up as high CPU with threads `RUNNABLE` or `TIMED_WAITING` in retry loops, and successive dumps show different stacks but no progress metric moving.",
      m: M(["flowchart LR",
        "  A[\"T1: lock A, tryLock B fails\"]:::s3 --> R1[\"release A, sleep 10 ms\"]:::s3 --> A",
        "  B[\"T2: lock B, tryLock A fails\"]:::s3 --> R2[\"release B, sleep 10 ms\"]:::s3 --> B",
        "  R1 -.->|same timing forever| R2",
        "  J[\"fix: sleep random 1..2^n ms\"]:::s2",
        "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s3 fill:#fff3e0,stroke:#ef6c00"]),
      code: `IntFunction<Long> backoffMs = attempt -> {
    long cap = Math.min(1_000, 10L << Math.min(attempt, 10));            // exponential: 10, 20, 40 … capped at 1 s
    return ThreadLocalRandom.current().nextLong(cap / 2, cap + 1);       // "equal jitter": random in [cap/2, cap]
};
for (int attempt = 0; attempt < 6; attempt++) {
    long ms = backoffMs.apply(attempt);
    long cap = Math.min(1_000, 10L << attempt);
    System.out.println("attempt " + attempt + ": back off within [" + cap / 2 + ", " + cap + "] ms → " + (ms >= cap / 2 && ms <= cap ? "ok" : "bad"));
}`,
      analogy: "Two polite people in a corridor step aside the same way every time. If each flips a coin before stepping, they get past each other within a couple of tries." },
    { title: "Starvation and fairness",
      text: "**Starvation**: a thread is runnable but never gets what it needs. Causes: **unfair locks** where a thread that just released can barge back in, **long lock holders**, a constant stream of **readers** starving writers in a read-write lock (J18), thread **priorities** (rarely respected, avoid), and a saturated pool where low-priority work never runs. Remedies: `new ReentrantLock(true)` or `new Semaphore(n, true)` for FIFO ordering (lower throughput), short critical sections, separate pools or queues per priority, and bounded waits with timeouts so starvation turns into a visible error.",
      code: `Function<Boolean, String> run = fair -> {
    ReentrantLock lock = new ReentrantLock(fair);
    int[] counts = new int[3];
    long end = System.nanoTime() + 200_000_000L;
    List<Thread> ts = new ArrayList<>();
    for (int t = 0; t < 3; t++) { int id = t; ts.add(new Thread(() -> { while (System.nanoTime() < end) { lock.lock(); try { counts[id]++; } finally { lock.unlock(); } } })); }
    ts.forEach(Thread::start);
    for (Thread t : ts) { try { t.join(); } catch (InterruptedException e) { } }
    int min = Arrays.stream(counts).min().getAsInt(), max = Arrays.stream(counts).max().getAsInt();
    return (fair ? "fair  " : "unfair") + " lock: total " + Arrays.stream(counts).sum() + ", max/min share ratio " + String.format("%.1f", max / (double) Math.max(1, min));
};
System.out.println(run.apply(false));
System.out.println(run.apply(true));
System.out.println("(fair hands the lock over in FIFO order: shares stay even but throughput drops sharply; unfair allows barging, which can starve a thread under heavier contention)");` },
    { title: "Alien methods and open calls",
      text: "A common hidden deadlock: calling **code you don't control** (listeners, callbacks, overridable methods, another service's synchronized method) **while holding a lock**. That code may take other locks in the opposite order, or block. Rule: make **open calls**: hold the lock only to read or update your own state, copy what you need, release, then call out. `CopyOnWriteArrayList` for listeners makes this natural. Same for I/O: never do network calls inside a critical section (it also pins virtual threads on Java 21, J25).",
      code: `class Bus {
    private final List<Consumer<String>> listeners = new CopyOnWriteArrayList<>();
    private final List<String> history = new ArrayList<>();
    void subscribe(Consumer<String> l) { listeners.add(l); }
    void publish(String event) {
        synchronized (this) { history.add(event); }          // lock only our own state
        for (Consumer<String> l : listeners) l.accept(event); // open call: no lock held while running alien code
    }
    synchronized int size() { return history.size(); }
}
Bus bus = new Bus();
bus.subscribe(e -> {
    Thread other = new Thread(() -> System.out.println("listener's helper thread reads size " + bus.size()));   // would deadlock if publish held the lock
    other.start();
    try { other.join(); } catch (InterruptedException ex) { }
});
bus.publish("order-placed");
System.out.println("published without deadlock");` },
    { title: "Deadlocks without two locks",
      text: "Not every deadlock is two monitors. **Thread-pool starvation deadlock**: a task submits a subtask to the **same bounded pool** and waits for it; when all workers are waiting, the subtasks never run. **Resource deadlocks**: waiting for a DB connection while holding one when the pool is exhausted. **Database deadlocks**: two transactions lock rows in opposite order; the DB detects it and aborts one (handle by retrying). **Class initialisation deadlocks**: static initialisers of two classes that need each other on different threads. Fixes: never block on work queued to your own pool, use separate pools or `CompletableFuture` composition, and acquire resources in a consistent order.",
      code: `ExecutorService pool = Executors.newSingleThreadExecutor();
Future<String> outer = pool.submit(() -> {
    Future<String> inner = pool.submit(() -> "inner result");   // queued behind the outer task on the only thread
    try { return inner.get(300, TimeUnit.MILLISECONDS); }
    catch (TimeoutException e) { return "starvation deadlock: inner task never ran"; }
});
System.out.println(outer.get());
pool.shutdownNow();
CompletableFuture<String> composed = CompletableFuture.supplyAsync(() -> "outer").thenCompose(o -> CompletableFuture.supplyAsync(() -> o + " + inner composed, no blocking"));
System.out.println(composed.join());` },
    { title: "Diagnosing in production: stuck vs spinning",
      text: "Start from symptoms. **Requests hang, CPU low**: take 2–3 thread dumps a few seconds apart; look for the deadlock section, many threads `BLOCKED` on the same monitor (a hot lock), or threads `WAITING` on a pool, connection or future. **CPU high**: find the hot threads (`top -H -p <pid>`, convert the TID to hex and match `nid=0x…` in the dump, or use `ThreadMXBean.getThreadCpuTime`); look for spinning loops, livelocked retries or GC. **Throughput dropped**: contention (JFR `jdk.JavaMonitorEnter` events) or a starved pool. Tools: jcmd, JFR/JMC, async-profiler, fastThread-style dump analysers.",
      table: [["Symptom", "Dump shows", "Likely problem"],
        ["Hang, low CPU", "\"Found one Java-level deadlock\"", "Deadlock"],
        ["Hang, low CPU", "Many BLOCKED on one lock", "Hot lock / long critical section"],
        ["Hang, low CPU", "Workers WAITING on Future.get / pool", "Pool starvation, slow downstream"],
        ["High CPU", "Same RUNNABLE stacks in retry loops", "Livelock / busy spin"],
        ["High CPU", "GC threads busy", "Memory pressure (J30)"]],
      code: `java.lang.management.ThreadMXBean mx = java.lang.management.ManagementFactory.getThreadMXBean();
Thread spinner = new Thread(() -> { long x = 0; long end = System.nanoTime() + 300_000_000L; while (System.nanoTime() < end) x++; }, "busy-spinner");
Thread sleeper = new Thread(() -> { try { Thread.sleep(300); } catch (InterruptedException e) { } }, "idle-sleeper");
spinner.start(); sleeper.start();
Thread.sleep(250);
long spinCpu = mx.getThreadCpuTime(spinner.threadId()) / 1_000_000, sleepCpu = mx.getThreadCpuTime(sleeper.threadId()) / 1_000_000;
System.out.println("busy-spinner " + spinner.getState() + " cpu " + (spinCpu > 100 ? ">100 ms" : spinCpu + " ms") + " | idle-sleeper " + sleeper.getState() + " cpu " + (sleepCpu < 20 ? "~0 ms" : sleepCpu + " ms"));
spinner.join(); sleeper.join();` },
    { title: "Prevention checklist (the interview answer)",
      text: "When asked \"how do you avoid deadlocks?\": **avoid needing multiple locks** (immutable data, confinement, concurrent collections, single-writer designs); if you must, **acquire in a global order**; use **`tryLock` with timeouts** and jittered back-off where order can't be fixed; keep **critical sections short** with **no alien calls or I/O** inside; **don't block on your own pool**; prefer higher-level tools (`ConcurrentHashMap.compute`, `BlockingQueue`, `CompletableFuture`). Detect with **thread dumps** and `findDeadlockedThreads`, and add **timeouts everywhere** so a stuck system fails visibly instead of hanging.",
      m: M(["flowchart TB",
        "  Q{\"need more than one lock?\"}:::s1 -->|no| OK[\"single lock / lock-free / confinement\"]:::s2",
        "  Q -->|yes| O{\"can you define a global order?\"}:::s1",
        "  O -->|yes| ORD[\"always lock in that order\"]:::s2",
        "  O -->|no| TL[\"tryLock + timeout + jittered back-off\"]:::s2",
        "  ORD --> X[\"plus: short sections, open calls, timeouts, dumps\"]:::s3",
        "  TL --> X",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s3 fill:#f3f4f6,stroke:#6b7280"]),
      code: `ConcurrentHashMap<String, Long> balances = new ConcurrentHashMap<>(Map.of("A", 100L, "B", 100L));
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int i = 0; i < 1_000; i++) {
        boolean ab = i % 2 == 0;
        pool.submit(() -> {                                  // each merge is atomic per key: no lock ordering to get wrong (readers may briefly see money in flight)
            balances.merge(ab ? "A" : "B", -1L, Long::sum);
            balances.merge(ab ? "B" : "A", 1L, Long::sum);
        });
    }
}
System.out.println("balances " + new TreeMap<>(balances) + ", total " + balances.values().stream().mapToLong(Long::longValue).sum());` }
  ];

  H.registerLesson({
    code: "J26",
    summary: "Liveness failures and how seniors handle them: deadlock, livelock and starvation; the four Coffman conditions and which ones you can break; detecting deadlocks with thread dumps, `jstack`/`jcmd` and `ThreadMXBean.findDeadlockedThreads`; global lock ordering and `tryLock` with timeouts; jittered back-off against livelock; fairness and starvation; open calls instead of alien methods under locks; deadlocks without two locks (pool starvation, DB, class init); and diagnosing stuck vs spinning services in production.",
    slides: SLIDES,
    widget: { heading: "Interactive: watch a deadlock form, then fix it", caption: "Step threads that each lock two accounts, or run the worst-case schedule. The wait-for graph shows holds and waits; a cycle is a deadlock, reported in the format `jstack` printed on JDK 21. The model was checked over every interleaving: opposite order and the ring can deadlock; lock ordering and tryLock with back-off never do.", render: dlWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Payments and ledgers", "Transfers lock two accounts; ordering by account id is the standard fix."],
      ["Database deadlocks", "Two transactions update rows in opposite order; the DB aborts one with a deadlock error, so the service retries."],
      ["Hung services", "An on-call engineer takes three thread dumps and finds \"Found one Java-level deadlock\" between a cache and a listener."],
      ["Thread-pool starvation", "A request handler blocks on async work submitted to the same exhausted pool; all requests hang."],
      ["Retry storms", "Clients retrying in lockstep keep a recovering service overloaded until jitter is added."],
      ["Interviews", "\"How would you detect and prevent deadlocks?\" and \"write a deadlock\" are very common."]
    ],
    pitfalls: [
      "Acquiring the same locks in different orders on different paths",
      "Calling listeners, callbacks or remote services while holding a lock",
      "Blocking on a Future of a task queued to your own bounded pool",
      "Retry with fixed back-off (livelock, retry storms)",
      "Relying on thread priorities for fairness",
      "Fair locks everywhere (big throughput cost) instead of shorter critical sections",
      "Taking a single thread dump and concluding nothing",
      "No timeouts, so stuck threads hang forever silently",
      "Nested synchronized on objects from other modules"
    ],
    quiz: [
      { q: "Which is NOT one of the four Coffman conditions?", options: ["Mutual exclusion", "Hold and wait", "Thread priority inversion", "Circular wait"], answer: 2, why: "The four are mutual exclusion, hold and wait, no preemption, circular wait." },
      { q: "T1 locks A then B; T2 locks B then A. What fixes the deadlock most simply?", options: ["Make both locks fair", "Make both threads lock A before B", "Add Thread.yield()", "Increase the thread pool"], answer: 1, why: "A global order breaks circular wait." },
      { q: "A service hangs with CPU near zero. What do you do first?", options: ["Restart and move on", "Take several thread dumps a few seconds apart and look for deadlocks and BLOCKED/WAITING threads", "Increase heap", "Enable GC logging"], answer: 1, why: "Low CPU hang points to waiting: deadlock, hot lock, pool or downstream." },
      { q: "What distinguishes livelock from deadlock?", options: ["Livelock threads are blocked", "Livelocked threads keep running and changing state without progress (CPU busy)", "Livelock only happens in databases", "There is no difference"], answer: 1, why: "Typically symmetric retries; fix with randomised back-off." },
      { q: "What does this print?", code: `ExecutorService pool = Executors.newSingleThreadExecutor();
Future<String> f = pool.submit(() -> {
    Future<String> inner = pool.submit(() -> "x");
    try { return inner.get(200, TimeUnit.MILLISECONDS); } catch (TimeoutException e) { return "stuck"; }
});
System.out.println(f.get()); pool.shutdownNow();`, options: ["x", "stuck", "null", "RejectedExecutionException"], answer: 1, why: "Pool starvation deadlock: the inner task is queued behind the outer one on the only thread." },
      { q: "Which API finds deadlocked threads programmatically?", options: ["Thread.getAllStackTraces().deadlocks()", "ThreadMXBean.findDeadlockedThreads()", "Runtime.findDeadlocks()", "System.gc()"], answer: 1, why: "It covers monitors and ownable synchronizers like ReentrantLock." },
      { q: "Why is calling a listener inside a synchronized method risky?", options: ["Listeners are slow to compile", "The listener may take other locks or block, creating lock-order cycles you can't see", "synchronized forbids method calls", "It disables JIT"], answer: 1, why: "Make open calls: update state under the lock, call out after releasing." },
      { q: "What does `new ReentrantLock(true)` trade?", options: ["Fairness for safety", "Lower throughput for FIFO-ish fairness that reduces starvation", "Nothing", "Reentrancy for speed"], answer: 1, why: "Barging is disabled, so handoffs are slower." },
      { q: "How does tryLock with timeout prevent deadlock?", options: ["It preempts other threads", "A thread that can't get the second lock releases the first and retries, breaking hold-and-wait", "It orders locks automatically", "It makes locks reentrant"], answer: 1, why: "Add jittered back-off and a retry limit to avoid livelock." }
    ],
    cheatsheet: {
      table: [
        ["Task", "How"],
        ["Thread dump", "`jstack <pid>`, `jcmd <pid> Thread.print`, `kill -3 <pid>`"],
        ["Detect in code", "`ManagementFactory.getThreadMXBean().findDeadlockedThreads()`"],
        ["Order locks", "lock lower id first: `first = a.id() < b.id() ? a : b`"],
        ["Timed lock", "`if (lock.tryLock(50, MILLISECONDS)) try { … } finally { lock.unlock(); }`"],
        ["Back-off", "random in [cap/2, cap], cap = min(max, base × 2^attempt)"],
        ["Fair lock", "`new ReentrantLock(true)`, `new Semaphore(n, true)`"],
        ["Hot thread", "`top -H -p <pid>` → hex TID → `nid=0x…` in the dump"]],
      cards: [
        { title: "Prevent", items: ["One lock, or none", "Global lock order", "tryLock + timeout + jitter", "Open calls, no I/O under locks", "Don't block on own pool"] },
        { title: "Detect", items: ["2–3 dumps, seconds apart", "Deadlock section", "BLOCKED on one monitor", "findDeadlockedThreads health check", "JFR contention events"] },
        { title: "Say in interviews", items: ["Four Coffman conditions", "Break circular wait or hold-and-wait", "Livelock = busy, no progress", "Starvation and fairness", "Timeouts make failures visible"] }]
    },
    practice: [
      { level: "Easy", q: "Write a program that deadlocks, and explain why.",
        a: ["Two threads take two locks in opposite order.",
          "A latch makes sure both hold their first lock before trying the second, so the deadlock is reliable.",
          "Each holds what the other needs: circular wait with hold-and-wait, so neither proceeds.",
          "Daemon threads and a timed join let the demo end."],
        code: `Object left = new Object(), right = new Object();
CountDownLatch go = new CountDownLatch(2);
Runnable r1 = () -> { synchronized (left) { go.countDown(); try { go.await(); } catch (InterruptedException e) { return; } synchronized (right) { System.out.println("never printed"); } } };
Runnable r2 = () -> { synchronized (right) { go.countDown(); try { go.await(); } catch (InterruptedException e) { return; } synchronized (left) { System.out.println("never printed"); } } };
Thread t1 = new Thread(r1), t2 = new Thread(r2);
t1.setDaemon(true); t2.setDaemon(true); t1.start(); t2.start();
t1.join(300);
System.out.println("deadlocked: " + (t1.getState() == Thread.State.BLOCKED && t2.getState() == Thread.State.BLOCKED));` },
      { level: "Easy", q: "What are deadlock, livelock and starvation?",
        a: ["Deadlock: a set of threads each waiting for a resource held by another in the set; nobody progresses, CPU idle.",
          "Livelock: threads keep changing state in response to each other (retrying) but make no progress; CPU busy.",
          "Starvation: a thread is perpetually denied a resource (lock, CPU, permit) while others progress."] },
      { level: "Easy", q: "State the four conditions for deadlock and how to break each.",
        a: ["Mutual exclusion → lock-free structures, immutability, confinement.",
          "Hold and wait → acquire all at once, or tryLock and release on failure.",
          "No preemption → timeouts, interruptible locking.",
          "Circular wait → global lock ordering (the usual fix)."] },
      { level: "Medium", q: "Implement a deadlock-free money transfer between accounts.",
        a: ["Order the two locks by a unique, stable id.",
          "Lock the lower id first, then the higher.",
          "Check funds inside the critical section.",
          "Run many opposite-direction transfers concurrently; the total balance must be unchanged."],
        code: `class Acct { final int id; long bal; Acct(int id, long bal) { this.id = id; this.bal = bal; } }
static boolean transfer(Acct from, Acct to, long amt) {
    Acct first = from.id < to.id ? from : to, second = first == from ? to : from;
    synchronized (first) { synchronized (second) {
        if (from.bal < amt) return false;
        from.bal -= amt; to.bal += amt; return true;
    } }
}
Acct a = new Acct(1, 500), b = new Acct(2, 500);
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int i = 0; i < 10_000; i++) { boolean dir = i % 2 == 0; pool.submit(() -> dir ? transfer(a, b, 3) : transfer(b, a, 3)); }
}
synchronized (a) { synchronized (b) { System.out.println("a=" + a.bal + " b=" + b.bal + " total=" + (a.bal + b.bal)); } }` },
      { level: "Medium", q: "How do you detect a deadlock in a running JVM?",
        a: ["jstack <pid> or jcmd <pid> Thread.print (or kill -3) and look for \"Found one Java-level deadlock\".",
          "The report lists each thread, the lock it waits for and who holds it, then stacks with locked/waiting lines.",
          "ThreadMXBean.findDeadlockedThreads() in code or a health endpoint; JMC/VisualVM also flag them.",
          "Take several dumps: identical BLOCKED stacks confirm it."] },
      { level: "Medium", q: "What is a thread-pool starvation deadlock, and how do you avoid it?",
        a: ["Tasks in a bounded pool block waiting for subtasks submitted to the same pool.",
          "When all workers are blocked, queued subtasks never get a thread.",
          "Avoid: compose with CompletableFuture (thenCompose) instead of blocking get, use a separate pool for subtasks, ForkJoinPool's join (work stealing), or virtual threads.",
          "Always use timeouts on get()."] },
      { level: "Medium", q: "How do you prevent livelock in retry logic?",
        a: ["Livelock arises when competitors retry in lockstep with identical delays.",
          "Use exponential back-off with random jitter so attempts desynchronise.",
          "Cap the attempts or total time and surface failure.",
          "Or break symmetry: ordering, a coordinator, or priorities."] },
      { level: "Hard", q: "A production service hangs every few days. Describe your investigation and fix.",
        a: ["Capture evidence before restarting: 3 thread dumps 5–10 s apart (jcmd Thread.print), CPU per thread, pool and connection metrics.",
          "Read the dumps: a deadlock section, many threads BLOCKED on one monitor (find the owner and what it's doing), or workers WAITING on futures/connections.",
          "Map stacks to code paths and find the lock-order inversion, alien call under a lock, or self-pool blocking.",
          "Fix the root cause (order, open calls, separate pools, timeouts), add findDeadlockedThreads to health checks, add a stress test reproducing the interleaving.",
          "Add timeouts so future stalls fail fast with logs."] },
      { level: "Hard", q: "Implement transfer using ReentrantLock.tryLock so it never deadlocks even without ordering.",
        a: ["Lock 'from', then tryLock 'to' with a short timeout.",
          "On failure release 'from', sleep a random back-off, retry.",
          "Give up after a deadline and return false.",
          "Opposite-direction transfers complete without deadlock."],
        code: `class Acc { final ReentrantLock lock = new ReentrantLock(); long bal = 1_000; }
static boolean transfer(Acc from, Acc to, long amt) throws InterruptedException {
    long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
    while (System.nanoTime() < deadline) {
        if (from.lock.tryLock(1, TimeUnit.MILLISECONDS)) {
            try {
                if (to.lock.tryLock(1, TimeUnit.MILLISECONDS)) {
                    try { from.bal -= amt; to.bal += amt; return true; } finally { to.lock.unlock(); }
                }
            } finally { from.lock.unlock(); }
        }
        Thread.sleep(ThreadLocalRandom.current().nextInt(0, 3));
    }
    return false;
}
Acc x = new Acc(), y = new Acc();
AtomicInteger ok = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int i = 0; i < 400; i++) { boolean d = i % 2 == 0; pool.submit(() -> { if (d ? transfer(x, y, 1) : transfer(y, x, 1)) ok.incrementAndGet(); return null; }); }
}
System.out.println("succeeded " + ok.get() + "/400, total " + (x.bal + y.bal));` },
      { level: "Hard", q: "Design a system-wide approach so deadlocks are unlikely and detected quickly.",
        steps: ["Minimise shared mutable state: immutable objects, confinement, concurrent collections, single-writer actors/queues.",
          "Document and enforce a lock hierarchy (by id or layer); code review for nested locks and alien calls.",
          "Use timeouts on every lock acquisition, future and remote call; tryLock with jittered back-off where order can't be fixed.",
          "Separate pools for dependent work; never block on your own pool.",
          "Detection: findDeadlockedThreads in health checks, automatic thread dumps on stuck requests, JFR contention monitoring, stress tests."] }
    ],
    recap: [
      "Deadlock = cycle of waits (CPU idle); livelock = busy retrying (CPU high); starvation = one thread never gets a turn.",
      "Break circular wait with a global lock order, or hold-and-wait with tryLock and timeouts.",
      "Randomised back-off prevents livelock; fair locks reduce starvation at a throughput cost.",
      "Never call alien code or block on your own pool while holding resources.",
      "Diagnose with several thread dumps, findDeadlockedThreads, and CPU per thread."
    ]
  });
})();
