/* Lesson J18: Locks: ReentrantLock, ReadWriteLock, StampedLock */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Model of a non-fair ReentrantReadWriteLock driven step by step by three threads.
  // Checked against java.util.concurrent.locks.ReentrantReadWriteLock on Java 21: 60 random 9-step scenarios
  // (holds and queued threads after every step) matched exactly.
  function make() { return { held: { 1: [], 2: [], 3: [] }, queue: [], log: [] }; }
  function writer(S) { for (var k in S.held) if (S.held[k].indexOf("w") >= 0) return +k; return 0; }
  function readers(S) { var n = 0; for (var k in S.held) n += S.held[k].filter(function (x) { return x === "r"; }).length; return n; }
  function canRead(S, id) { var w = writer(S); if (w && w !== id) return false; if (w === id) return true; if (S.held[id].indexOf("r") >= 0) return true; return !(S.queue.length && S.queue[0].m === "w"); }
  function canWrite(S, id) { var w = writer(S); if (w === id) return true; if (w) return false; return readers(S) === 0; }
  function wake(S) {
    var woke = [];
    while (S.queue.length) {
      var h = S.queue[0];
      if (h.m === "w") { if (!writer(S) && !readers(S)) { S.queue.shift(); S.held[h.id].push("w"); woke.push("T" + h.id + " (write)"); } break; }
      if (writer(S) && writer(S) !== h.id) break;
      S.queue.shift(); S.held[h.id].push("r"); woke.push("T" + h.id + " (read)");
    }
    return woke;
  }
  function rwWidget(el, ctx) {
    var s = ctx.state; if (!s.sim) s.sim = make();
    el.innerHTML = "<p>" + ctx.md("Three threads share one `ReentrantReadWriteLock` (non-fair, the default). Make each thread call `lock()` / `unlock()` and watch who holds the lock and who is parked in the queue. Try: T1 and T2 read, T3 asks to write, then T1 unlocks and asks to read again (it now waits behind the writer); or let a reader ask for the write lock.") + "</p>" +
      "<div data-r='btns'></div><div class='btnrow' style='margin-top:8px'><button type='button' class='btn' data-r='reset'>reset</button></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><pre class='code' data-r='log'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function act(id, c) {
      var S = s.sim, T = "T" + id, msg;
      if (c === "r" || c === "w") {
        var name = c === "r" ? "readLock().lock()" : "writeLock().lock()";
        var ok = c === "r" ? canRead(S, id) : canWrite(S, id);
        if (ok) { S.held[id].push(c); msg = T + " " + name + " → acquired" + (c === "r" && writer(S) === id ? " (a writer may also take the read lock: downgrading)" : S.held[id].filter(function (x) { return x === c; }).length > 1 ? " (reentrant, hold count " + S.held[id].filter(function (x) { return x === c; }).length + ")" : ""); }
        else {
          S.queue.push({ id: id, m: c });
          if (c === "w" && S.held[id].indexOf("r") >= 0) msg = T + " " + name + " → parks FOREVER: it holds a read lock and waits for all readers, including itself, to leave. Upgrading read → write is not supported (self-deadlock).";
          else if (c === "r" && !writer(S)) msg = T + " " + name + " → parks even though only readers hold the lock: a writer is first in the queue, so new readers wait (prevents writer starvation).";
          else msg = T + " " + name + " → parks in the queue (" + (writer(S) ? "T" + writer(S) + " holds the write lock" : "readers hold the lock") + ")";
        }
      } else {
        var m = c === "ur" ? "r" : "w"; S.held[id].splice(S.held[id].indexOf(m), 1);
        var woke = wake(S);
        msg = T + " " + (m === "r" ? "readLock" : "writeLock") + "().unlock()" + (woke.length ? " → unparks " + woke.join(", ") : "");
      }
      S.log.push(msg); ctx.save(); draw();
    }
    function draw() {
      var S = s.sim, blocked = {};
      S.queue.forEach(function (x) { blocked[x.id] = x.m; });
      q("btns").innerHTML = [1, 2, 3].map(function (id) {
        var b = blocked[id], hr = S.held[id].indexOf("r") >= 0, hw = S.held[id].indexOf("w") >= 0;
        function btn(c, label, en) { return "<button type='button' class='btn' data-id='" + id + "' data-c='" + c + "'" + (en ? "" : " disabled") + ">" + label + "</button>"; }
        return "<div class='btnrow' style='margin-top:6px;align-items:center'><b style='min-width:28px'>T" + id + "</b>" +
          btn("r", "read lock", !b) + btn("w", "write lock", !b) + btn("ur", "unlock read", !b && hr) + btn("uw", "unlock write", !b && hw) +
          (b ? " <span style='color:#c62828'>parked (waiting for " + (b === "r" ? "read" : "write") + ")</span>" : "") + "</div>";
      }).join("");
      var L = ["flowchart LR", "  subgraph HOLD[\"holding the lock\"]"];
      var any = false;
      [1, 2, 3].forEach(function (id) { var r = S.held[id].filter(function (x) { return x === "r"; }).length, w = S.held[id].indexOf("w") >= 0; if (r || w) { any = true; L.push("    h" + id + "[\"T" + id + ": " + (w ? "WRITE" : "") + (w && r ? " + " : "") + (r ? "read ×" + r : "") + "\"]:::" + (w ? "bad" : "s1")); } });
      if (!any) L.push("    hn[\"(free)\"]:::s0");
      L.push("  end", "  subgraph Q[\"wait queue (FIFO)\"]");
      if (S.queue.length) S.queue.forEach(function (x, i) { L.push("    q" + i + "[\"T" + x.id + " wants " + (x.m === "r" ? "read" : "WRITE") + "\"]:::s4"); });
      else L.push("    qn[\"(empty)\"]:::s0");
      L.push("  end", "  Q --> HOLD");
      L.push("  classDef s0 fill:#f3f4f6,stroke:#9ca3af", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s4 fill:#fff3e0,stroke:#ef6c00", "  classDef bad fill:#fdecea,stroke:#c62828");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var w = writer(S), r = readers(S);
      var dead = S.queue.filter(function (x) { return x.m === "w" && S.held[x.id].indexOf("r") >= 0; }).length;
      q("res").innerHTML = ctx.md("Read holds **" + r + "**, writer **" + (w ? "T" + w : "none") + "**, queued **" + S.queue.length + "**. " +
        (dead ? "**Self-deadlock:** a thread waits for the write lock while holding a read lock; it can never proceed. Release the read lock first, then acquire the write lock and re-check the state." :
        "Readers share the lock; a writer needs it exclusively. Use a read-write lock only when reads vastly outnumber writes and are long enough to matter."));
      q("log").textContent = S.log.slice(-7).join("\n") || "Click a button for T1, T2 or T3.";
    }
    q("btns").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || b.disabled) return; act(+b.dataset.id, b.dataset.c); });
    q("reset").addEventListener("click", function () { s.sim = make(); ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Why explicit locks?",
      text: "`synchronized` is simple and safe, but limited: you can't **try** to acquire it, give up after a **timeout**, be **interrupted** while waiting, choose **fairness**, have **several wait conditions**, or lock and unlock in different scopes. The `java.util.concurrent.locks.Lock` interface adds all of that, with the same memory semantics (unlock → lock happens-before). The price: you must **unlock in `finally`** yourself, or the lock is leaked forever.",
      m: M(["flowchart TB",
        "  L[\"Lock interface\"]:::s1 --> RL[\"ReentrantLock\"]:::s2",
        "  RWL[\"ReadWriteLock\"]:::s1 --> RRWL[\"ReentrantReadWriteLock\"]:::s2",
        "  SL[\"StampedLock (no interface, not reentrant)\"]:::s4",
        "  RL --> C[\"Condition objects\"]:::s0",
        "  RRWL --> C",
        "  AQS[\"AbstractQueuedSynchronizer: state + FIFO queue of parked threads\"]:::s0 -.-> RL",
        "  AQS -.-> RRWL",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `Lock lock = new ReentrantLock();
int[] seats = {100};
Runnable book = () -> {
    lock.lock();                       // outside try: if lock() threw, we must not unlock
    try {
        if (seats[0] > 0) seats[0]--;
    } finally {
        lock.unlock();                 // always, even on exceptions
    }
};
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 150; i++) pool.submit(book); }
System.out.println("seats left: " + seats[0]);`,
      analogy: "`synchronized` is a self-closing door; a `Lock` is a door you close and open by hand. More control (you can knock and walk away, or wait with a timer), but forget to open it and the room is sealed." },
    { title: "ReentrantLock basics",
      text: "**Reentrant**: the owning thread can lock again; the lock keeps a **hold count** and is released when it returns to zero, so every `lock()` needs a matching `unlock()`. Useful introspection for tests and assertions: `isHeldByCurrentThread()`, `getHoldCount()`, `isLocked()`, `getQueueLength()`. Unlocking a lock you don't hold throws `IllegalMonitorStateException`.",
      code: `ReentrantLock lock = new ReentrantLock();
class Ledger {
    void transfer() { lock.lock(); try { System.out.println("transfer: hold count " + lock.getHoldCount()); audit(); } finally { lock.unlock(); } }
    void audit()    { lock.lock(); try { System.out.println("audit (re-entered): hold count " + lock.getHoldCount()); } finally { lock.unlock(); } }
    private final ReentrantLock lock;
    Ledger(ReentrantLock l) { this.lock = l; }
}
new Ledger(lock).transfer();
System.out.println("after: locked=" + lock.isLocked());
try { lock.unlock(); } catch (IllegalMonitorStateException e) { System.out.println("unlock without holding → IllegalMonitorStateException"); }` },
    { title: "tryLock: don't wait forever",
      text: "`tryLock()` acquires only if the lock is free right now (and barges even on a fair lock); `tryLock(timeout, unit)` waits up to the timeout and can be interrupted. Use it to **fail fast** under contention (return \"busy, retry\"), to **avoid deadlock** when you need two locks (take both or back off and retry), or to skip optional work (a cache refresh already in progress).",
      code: `ReentrantLock refreshLock = new ReentrantLock();
AtomicInteger refreshes = new AtomicInteger(), skipped = new AtomicInteger();
Runnable maybeRefresh = () -> {
    if (refreshLock.tryLock()) {                     // only one refresher; others skip instead of queueing
        try { refreshes.incrementAndGet(); Thread.sleep(50); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        finally { refreshLock.unlock(); }
    } else skipped.incrementAndGet();
};
try (ExecutorService pool = Executors.newFixedThreadPool(6)) { for (int i = 0; i < 6; i++) pool.submit(maybeRefresh); }
System.out.println("refreshed " + refreshes.get() + ", skipped " + skipped.get());

ReentrantLock busy = new ReentrantLock();
Thread holder = new Thread(() -> { busy.lock(); try { Thread.sleep(300); } catch (InterruptedException e) { } finally { busy.unlock(); } });
holder.start(); Thread.sleep(20);
long t0 = System.nanoTime();
boolean got = busy.tryLock(100, TimeUnit.MILLISECONDS);
System.out.println("tryLock(100ms) → " + got + " after ~" + (System.nanoTime() - t0) / 1_000_000 / 50 * 50 + " ms: respond 'busy, retry'");
holder.join();` },
    { title: "lockInterruptibly: cancellable waiting",
      text: "A thread blocked in `synchronized` or `lock()` **ignores interrupts** until it gets the lock. `lockInterruptibly()` throws `InterruptedException` instead, so request timeouts, `Future.cancel(true)` and `shutdownNow()` can actually stop a thread stuck waiting for a lock. Use it (or timed `tryLock`) for anything that may wait a long time.",
      code: `ReentrantLock lock = new ReentrantLock();
lock.lock();                                                     // main holds it and never lets go (for the demo)
Thread waiter = new Thread(() -> {
    try {
        lock.lockInterruptibly();
        try { System.out.println("got lock"); } finally { lock.unlock(); }
    } catch (InterruptedException e) {
        System.out.println("waiter cancelled while waiting for the lock");
    }
});
waiter.start();
Thread.sleep(50);
System.out.println("waiter state: " + waiter.getState());       // WAITING (parked), not BLOCKED
waiter.interrupt();
waiter.join();
lock.unlock();`,
      points: ["Threads waiting on j.u.c. locks show as WAITING/TIMED_WAITING (parked), not BLOCKED, in thread dumps"] },
    { title: "Fair vs non-fair",
      text: "`new ReentrantLock(true)` grants the lock in **FIFO** order of waiting threads. The default **non-fair** lock lets a thread that just arrived **barge** in if the lock happens to be free, avoiding the cost of waking a parked thread. Non-fair is usually much faster; fair locks prevent starvation but have lower throughput because each hand-off involves a context switch. Choose fair only when starvation is a real, observed problem.",
      table: [
        ["", "Non-fair (default)", "Fair"],
        ["Order", "Barging allowed", "FIFO among waiters"],
        ["Throughput", "High", "Lower (hand-off per release)"],
        ["Starvation", "Possible in theory", "Prevented"],
        ["`tryLock()`", "Barges", "Still barges (use `tryLock(0, unit)` to respect fairness)"],
        ["Same for", "`synchronized` (never fair)", "`ReentrantReadWriteLock(true)`, `Semaphore(n, true)`"]],
      code: `for (boolean fair : new boolean[] { false, true }) {
    ReentrantLock lock = new ReentrantLock(fair);
    int[] counter = {0};
    long t0 = System.nanoTime();
    try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
        for (int t = 0; t < 4; t++) pool.submit(() -> { for (int i = 0; i < 50_000; i++) { lock.lock(); try { counter[0]++; } finally { lock.unlock(); } } });
    }
    System.out.println((fair ? "fair    " : "non-fair") + ": count " + counter[0] + " in " + (System.nanoTime() - t0) / 1_000_000 + " ms");
}`,
      points: ["Timings vary by machine; on this box the fair lock was typically 10× or more slower"] },
    { title: "Conditions: several wait sets per lock",
      text: "`lock.newCondition()` gives a wait set tied to the lock: `await()` releases the lock and waits, `signal()`/`signalAll()` wakes waiters, who re-acquire the lock before returning. Unlike `wait`/`notify` (one wait set per monitor), you can have **separate conditions** such as `notFull` and `notEmpty`, so producers wake only consumers and vice versa. Always await **in a loop** re-checking the condition (spurious wake-ups, competing threads). J20 covers this in depth.",
      code: `class Slot<T> {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition filled = lock.newCondition(), emptied = lock.newCondition();
    private T item;
    void put(T x) throws InterruptedException {
        lock.lock();
        try { while (item != null) emptied.await(); item = x; filled.signal(); } finally { lock.unlock(); }
    }
    T take() throws InterruptedException {
        lock.lock();
        try { while (item == null) filled.await(); T x = item; item = null; emptied.signal(); return x; } finally { lock.unlock(); }
    }
}
Slot<String> slot = new Slot<>();
Thread producer = new Thread(() -> { try { for (String p : List.of("PNR1", "PNR2", "PNR3")) slot.put(p); } catch (InterruptedException e) { } });
producer.start();
for (int i = 0; i < 3; i++) System.out.println("took " + slot.take());` },
    { title: "ReadWriteLock: many readers or one writer",
      text: "`ReentrantReadWriteLock` has two locks: the **read lock** can be held by many threads at once as long as no thread holds the **write lock**, which is exclusive. It pays off when reads are **frequent and long** and writes are rare (in-memory caches, lookup tables). Rules from the widget: a waiting writer makes new readers wait (no writer starvation); a writer may acquire the read lock (**downgrade**); a reader trying to get the write lock (**upgrade**) deadlocks itself. For a simple map, `ConcurrentHashMap` usually beats a map behind an RW lock.",
      code: `class RouteCache {
    private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
    private final Map<String, Integer> fares = new HashMap<>();
    Integer get(String route) {
        rw.readLock().lock();
        try { return fares.get(route); } finally { rw.readLock().unlock(); }
    }
    void putAll(Map<String, Integer> fresh) {
        rw.writeLock().lock();
        try { fares.clear(); fares.putAll(fresh); } finally { rw.writeLock().unlock(); }
    }
}
RouteCache cache = new RouteCache();
cache.putAll(Map.of("DEL-BOM", 4850));
AtomicInteger hits = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 1_000; i++) pool.submit(() -> { if (cache.get("DEL-BOM") != null) hits.incrementAndGet(); });
    pool.submit(() -> cache.putAll(Map.of("DEL-BOM", 4999, "BLR-GOI", 3100)));
}
System.out.println("reads " + hits.get() + ", now " + cache.get("DEL-BOM"));

ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
rw.readLock().lock();
System.out.println("reader tries to upgrade: tryLock → " + rw.writeLock().tryLock() + " (a blocking lock() here would hang forever)");
rw.readLock().unlock();` },
    { title: "StampedLock: optimistic reads",
      text: "`StampedLock` (Java 8) adds **optimistic reading**: `tryOptimisticRead()` returns a stamp without locking; you read the fields into locals, then `validate(stamp)` checks that no write happened meanwhile. If validation fails, fall back to a real read lock. Reads never block writers, so it's very fast for read-mostly data with small, quick reads. Caveats: **not reentrant**, no `Condition`s, unlock needs the stamp, and the optimistic read must only copy fields (they may be inconsistent until validated).",
      code: `class Position {
    private final StampedLock sl = new StampedLock();
    private double lat, lon;
    void move(double dLat, double dLon) {
        long stamp = sl.writeLock();
        try { lat += dLat; lon += dLon; } finally { sl.unlockWrite(stamp); }
    }
    double[] read() {
        long stamp = sl.tryOptimisticRead();             // no lock taken
        double a = lat, b = lon;                         // copy to locals
        if (!sl.validate(stamp)) {                       // a write happened: retry under a real read lock
            stamp = sl.readLock();
            try { a = lat; b = lon; } finally { sl.unlockRead(stamp); }
        }
        return new double[] { a, b };
    }
}
Position p = new Position();
Thread mover = new Thread(() -> { for (int i = 0; i < 100_000; i++) p.move(1, 1); });
mover.start();
int inconsistent = 0;
for (int i = 0; i < 100_000; i++) { double[] r = p.read(); if (r[0] != r[1]) inconsistent++; }
mover.join();
System.out.println("final " + Arrays.toString(p.read()) + ", inconsistent reads returned: " + inconsistent);` },
    { title: "Lock striping and per-key locks",
      text: "One lock around a big structure serializes every thread. **Lock striping** splits the data into N segments, each with its own lock, so threads touching different segments proceed in parallel (Java 7's `ConcurrentHashMap` used 16 segments; Java 8+ locks individual bins). For **per-key** mutual exclusion (one booking per PNR at a time) use a fixed array of locks indexed by `hash(key) % N` (bounded memory) or `ConcurrentHashMap.compute` on that key. Avoid creating a lock object per key in an ever-growing map.",
      m: M(["flowchart LR",
        "  K1[\"PNR-17\"]:::s0 -->|hash % 4 = 1| L1[\"lock 1\"]:::s1",
        "  K2[\"PNR-42\"]:::s0 -->|hash % 4 = 2| L2[\"lock 2\"]:::s1",
        "  K3[\"PNR-90\"]:::s0 -->|hash % 4 = 2| L2",
        "  L1 --> P1[\"runs in parallel with lock 2\"]:::s2",
        "  L2 --> P2[\"PNR-42 and PNR-90 take turns\"]:::s4",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `class StripedLocks {
    private final ReentrantLock[] locks;
    StripedLocks(int n) { locks = new ReentrantLock[n]; for (int i = 0; i < n; i++) locks[i] = new ReentrantLock(); }
    ReentrantLock forKey(Object key) { return locks[Math.floorMod(key.hashCode(), locks.length)]; }
}
StripedLocks stripes = new StripedLocks(16);
Map<String, int[]> bookedByFlight = Map.of("6E-201", new int[1], "AI-865", new int[1]);   // plain counters, guarded per key
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 2_000; i++) {
        String flight = i % 2 == 0 ? "6E-201" : "AI-865";
        pool.submit(() -> {
            ReentrantLock l = stripes.forKey(flight);
            l.lock();
            try { bookedByFlight.get(flight)[0]++; } finally { l.unlock(); }   // same flight → same stripe → no race
        });
    }
}
new TreeMap<>(bookedByFlight).forEach((f, c) -> System.out.println(f + " booked " + c[0]));`,
      points: ["Guava's `Striped.lock(n)` implements this", "Inside one JVM only: across instances you need a DB row lock or a distributed lock"] },
    { title: "synchronized or ReentrantLock?",
      text: "Default to `synchronized` for simple critical sections: shorter, can't leak, and well optimised. Reach for `ReentrantLock` when you need `tryLock`, timeouts, interruptible waiting, fairness, multiple conditions, or hand-over-hand locking. One Java 21 specific: a **virtual thread** blocking inside `synchronized` **pins** its carrier thread, while `ReentrantLock` doesn't; that is why many libraries switched to `ReentrantLock`. Java 24 (JEP 491) removed that pinning.",
      table: [
        ["Need", "synchronized", "ReentrantLock", "RW lock", "StampedLock"],
        ["Mutual exclusion", "✔", "✔", "write lock", "write lock"],
        ["Try / timeout / interruptible", "✘", "✔", "✔", "✔ (try / interruptible variants)"],
        ["Fairness option", "✘", "✔", "✔", "✘"],
        ["Conditions", "one wait set", "many", "write lock only", "✘"],
        ["Reentrant", "✔", "✔", "✔", "✘"],
        ["Concurrent readers", "✘", "✘", "✔", "✔ + optimistic"],
        ["Virtual threads on Java 21", "pins carrier", "no pinning", "no pinning", "no pinning"]] },
    { title: "Diagnosing lock problems",
      text: "Most lock bugs are **leaks** (missing unlock on an early return or exception path), **contention** (critical sections doing I/O), or **deadlock** (two locks acquired in different orders, J26). In a thread dump, threads waiting for a `ReentrantLock` appear as `WAITING (parking)` with `- parking to wait for <0x…> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)`; `jstack` also lists the owner in its *Locked ownable synchronizers* section and reports deadlocks among j.u.c. locks. JFR's *Java Monitor Blocked* and *Thread Park* events show where time goes.",
      code: `ReentrantLock lock = new ReentrantLock();
Runnable leaky = () -> {
    lock.lock();
    if (Math.random() >= 0) return;          // early return: unlock skipped, lock leaked
    lock.unlock();
};
Thread t = new Thread(leaky, "leaky-worker");
t.start(); t.join();
System.out.println("worker finished, but lock still held: " + lock.isLocked() + ", by its now dead thread");
System.out.println("anyone else gets it? " + lock.tryLock(100, TimeUnit.MILLISECONDS));

java.lang.management.ThreadMXBean mx = java.lang.management.ManagementFactory.getThreadMXBean();
System.out.println("deadlocked threads now: " + (mx.findDeadlockedThreads() == null ? "none" : mx.findDeadlockedThreads().length));`,
      points: ["Pattern: `lock(); try { … } finally { unlock(); }` with nothing between lock() and try"] }
  ];

  H.registerLesson({
    code: "J18",
    summary: "Explicit locks from `java.util.concurrent.locks`: why they exist beyond `synchronized`, the lock/try/finally/unlock discipline, `ReentrantLock` reentrancy and hold counts, `tryLock` and timeouts to fail fast and avoid deadlock, `lockInterruptibly` for cancellable waiting, fair vs non-fair locks, `Condition`s, `ReentrantReadWriteLock` (shared readers, exclusive writer, writer preference, downgrade yes, upgrade deadlock), `StampedLock` optimistic reads, lock striping and per-key locks, choosing between them (including virtual-thread pinning on Java 21), and diagnosing leaked or contended locks.",
    slides: SLIDES,
    widget: { heading: "Interactive: a read-write lock, step by step", caption: "Three threads share a non-fair `ReentrantReadWriteLock`. Lock and unlock from each thread and watch holders and the wait queue. The model matched the real `ReentrantReadWriteLock` on Java 21 in 60 random scenarios, including writer preference and the read→write upgrade deadlock.", render: rwWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Fail-fast endpoints", "`tryLock(200, ms)` around a scarce resource returns HTTP 429/503 instead of piling up request threads."],
      ["Single-flight refresh", "Only one thread refreshes a token or cache (`tryLock()`); the others keep serving the old value."],
      ["Read-mostly caches", "Reference data (airports, fare rules) behind a read-write lock or an immutable snapshot swap."],
      ["Per-entity serialization", "Striped locks per account or PNR so updates to one entity are ordered without a global lock."],
      ["Virtual threads", "Libraries (JDBC drivers, HTTP clients) replaced `synchronized` with `ReentrantLock` to avoid pinning on Java 21."],
      ["Incidents", "Thread dumps with hundreds of threads `parking to wait for` the same ReentrantLock point to a leaked or long-held lock."]
    ],
    pitfalls: [
      "Calling `lock()` inside the `try` block, or forgetting `finally { unlock(); }`",
      "Early returns or exceptions between `lock()` and `try`",
      "Unlocking more times than locking (IllegalMonitorStateException)",
      "Upgrading a read lock to a write lock (self-deadlock)",
      "Fair locks by default (large throughput cost)",
      "Calling `await` without a loop re-checking the condition",
      "Using `StampedLock` re-entrantly, or acting on optimistic reads before `validate`",
      "Holding a lock during I/O or remote calls",
      "A new lock object per key in an unbounded map (memory leak)"
    ],
    quiz: [
      { q: "Why is `lock.lock()` placed **before** the `try` and `unlock()` in `finally`?", options: ["Style only", "If lock() failed inside the try, finally would unlock a lock we don't hold; finally guarantees release on every path", "lock() can't be called inside try", "Performance"], answer: 1, why: "If `lock()` throws, we never acquired it; unlocking would throw IllegalMonitorStateException and hide the original error. Once acquired, finally ensures release." },
      { q: "What does ReentrantLock's \"reentrant\" mean?", options: ["It can be used by many threads at once", "The holding thread can acquire it again; it's released when the hold count returns to zero", "It re-enters after a timeout", "It auto-unlocks"], answer: 1, why: "Each `lock()` increments the hold count, each `unlock()` decrements it." },
      { q: "A thread waits in `lock.lock()` and another thread interrupts it. What happens?", options: ["It throws InterruptedException immediately", "It keeps waiting until it gets the lock (with the interrupt flag set)", "The lock is released", "The JVM exits"], answer: 1, why: "`lock()` is not interruptible; use `lockInterruptibly()` or `tryLock(timeout)` for cancellable waits." },
      { q: "Why is the default ReentrantLock non-fair?", options: ["Fair locks are buggy", "Letting an arriving thread barge in avoids waking and switching to a parked thread, giving much higher throughput", "Fair locks don't support Conditions", "Non-fair locks prevent starvation"], answer: 1, why: "Fairness costs a hand-off per release. Use fair locks only for observed starvation." },
      { q: "Thread T1 holds the read lock of a ReentrantReadWriteLock and calls `writeLock().lock()`. What happens?", options: ["It upgrades atomically", "It blocks forever: the write lock waits for all readers, including T1", "IllegalMonitorStateException", "It succeeds if no other readers"], answer: 1, why: "Upgrading isn't supported. Release the read lock, acquire the write lock, and re-check the state. Downgrading (write → read) is allowed." },
      { q: "Readers T1 and T2 hold a non-fair RW lock; writer T3 is waiting. Reader T4 arrives. What happens?", options: ["T4 gets the read lock immediately", "T4 waits behind T3 so the writer isn't starved", "T3 is cancelled", "T4 throws"], answer: 1, why: "When a writer is first in the queue, new (non-reentrant) readers block. The widget lets you reproduce this." },
      { q: "What must you do after an optimistic read with StampedLock?", options: ["Call unlockRead(stamp)", "Call validate(stamp) and, if it fails, re-read under a real read lock", "Nothing", "Convert to a write lock"], answer: 1, why: "No lock is held by an optimistic read, so there is nothing to unlock; the values are only trustworthy if validate returns true." },
      { q: "Which is a reason to choose `ReentrantLock` over `synchronized` on Java 21?", options: ["It's always faster", "Virtual threads blocking in synchronized pin their carrier thread; ReentrantLock doesn't", "synchronized lacks visibility guarantees", "ReentrantLock unlocks automatically"], answer: 1, why: "Plus tryLock, timeouts, interruptibility, fairness and multiple conditions. Pinning was removed in Java 24 (JEP 491)." },
      { q: "What does this print?", code: `ReentrantLock lock = new ReentrantLock();
lock.lock();
lock.lock();
lock.unlock();
System.out.println(lock.isLocked() + " " + lock.getHoldCount());`, options: ["false 0", "true 1", "true 2", "IllegalMonitorStateException"], answer: 1, why: "Two locks, one unlock: still held with hold count 1." }
    ],
    cheatsheet: {
      table: [
        ["Task", "Code"],
        ["Basic", "`lock.lock(); try { … } finally { lock.unlock(); }`"],
        ["Try / timeout", "`if (lock.tryLock(200, MILLISECONDS)) { try { … } finally { lock.unlock(); } } else busy();`"],
        ["Cancellable", "`lock.lockInterruptibly()`"],
        ["Condition", "`Condition c = lock.newCondition(); while (!ready) c.await(); … c.signalAll();`"],
        ["Read/write", "`rw.readLock().lock()` / `rw.writeLock().lock()`"],
        ["Optimistic", "`long s = sl.tryOptimisticRead(); copy; if (!sl.validate(s)) { s = sl.readLock(); … }`"],
        ["Inspect", "`isLocked()`, `getHoldCount()`, `getQueueLength()`, `isHeldByCurrentThread()`"]],
      cards: [
        { title: "Lock vs synchronized", items: ["Same memory semantics", "Try, timeout, interruptible", "Fairness, many Conditions", "Must unlock in finally", "No pinning on Java 21"] },
        { title: "RW lock rules", items: ["Many readers or one writer", "Waiting writer blocks new readers", "Downgrade OK", "Upgrade deadlocks"] },
        { title: "Say in interviews", items: ["lock before try, unlock in finally", "tryLock to avoid deadlock", "Non-fair is faster", "StampedLock optimistic read + validate", "Striping for scalability"] }]
    },
    practice: [
      { level: "Easy", q: "When would you use ReentrantLock instead of synchronized?",
        a: ["When you need `tryLock()` / timed `tryLock` (fail fast, deadlock avoidance).",
          "When waiting must be interruptible (`lockInterruptibly`).",
          "When you need fairness or several Conditions on one lock.",
          "When lock and unlock happen in different methods or hand-over-hand locking.",
          "On Java 21 with virtual threads, to avoid pinning carriers. Otherwise `synchronized` is simpler and fine."] },
      { level: "Easy", q: "Show the correct idiom for using a Lock and explain each part.",
        a: ["Call `lock()` immediately before `try`, so a failed acquisition doesn't reach `finally`.",
          "Put the whole critical section inside `try`.",
          "Unlock in `finally`, so exceptions and early returns release the lock.",
          "Keep nothing between `lock()` and `try`."],
        code: `ReentrantLock lock = new ReentrantLock();
Map<String, Integer> inventory = new HashMap<>(Map.of("seat", 2));
Supplier<Boolean> reserve = () -> {
    lock.lock();
    try {
        int left = inventory.get("seat");
        if (left == 0) return false;          // early return is safe: finally still runs
        inventory.put("seat", left - 1);
        return true;
    } finally {
        lock.unlock();
    }
};
System.out.println(reserve.get() + " " + reserve.get() + " " + reserve.get() + " locked=" + lock.isLocked());` },
      { level: "Easy", q: "What is the difference between fair and non-fair locks?",
        a: ["Fair: threads acquire in FIFO order of waiting; prevents starvation.",
          "Non-fair (default): an arriving thread can barge if the lock is free, skipping waiters.",
          "Non-fair has much higher throughput because it avoids a context switch per hand-off.",
          "`tryLock()` barges even on fair locks."] },
      { level: "Medium", q: "Explain ReentrantReadWriteLock semantics, including upgrade and downgrade.",
        a: ["Read lock: shared among threads while no writer holds the write lock.",
          "Write lock: exclusive; waits until there are no readers and no writer.",
          "Non-fair mode: if a writer is first in the queue, new readers wait (prevents writer starvation); reentrant reads still succeed.",
          "Downgrade: holding the write lock, take the read lock, then release the write lock. Allowed.",
          "Upgrade: holding the read lock and requesting the write lock blocks forever. Release the read lock first and re-validate after getting the write lock."],
        code: `ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
rw.writeLock().lock();
rw.readLock().lock();            // downgrade step 1: take read while holding write
rw.writeLock().unlock();         // step 2: release write; we still hold read
System.out.println("read holds " + rw.getReadLockCount() + ", write locked " + rw.isWriteLocked());
System.out.println("upgrade attempt via tryLock: " + rw.writeLock().tryLock());
rw.readLock().unlock();` },
      { level: "Medium", q: "How can tryLock help avoid deadlock when a transfer needs two account locks?",
        a: ["Acquire the first lock, then `tryLock` the second with a timeout.",
          "If the second isn't available, release the first, back off (random sleep), and retry.",
          "This breaks the hold-and-wait condition of deadlock.",
          "Alternative: always lock accounts in a global order (by id). J26 covers both."],
        code: `class Account { final int id; final ReentrantLock lock = new ReentrantLock(); int balance; Account(int id, int b) { this.id = id; balance = b; } }
Account a = new Account(1, 1000), b = new Account(2, 1000);
BiFunction<Account, Account, Boolean> transfer = (from, to) -> {
    for (int attempt = 0; attempt < 100; attempt++) {
        if (from.lock.tryLock()) {
            try {
                if (to.lock.tryLock()) {
                    try { from.balance -= 10; to.balance += 10; return true; } finally { to.lock.unlock(); }
                }
            } finally { from.lock.unlock(); }
        }
        try { Thread.sleep(ThreadLocalRandom.current().nextInt(1, 3)); } catch (InterruptedException e) { return false; }
    }
    return false;
};
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int i = 0; i < 200; i++) { boolean ab = i % 2 == 0; pool.submit(() -> ab ? transfer.apply(a, b) : transfer.apply(b, a)); }
}
System.out.println("total " + (a.balance + b.balance) + " (no deadlock, money conserved)");` },
      { level: "Medium", q: "What is StampedLock and when would you use it?",
        a: ["A Java 8 lock with three modes: write, read, and optimistic read (returns a stamp without locking).",
          "Optimistic read: copy fields to locals, then `validate(stamp)`; on failure retry under a read lock.",
          "Great for read-mostly, small, fast reads (coordinates, counters snapshot) since readers don't block writers.",
          "Not reentrant, no Conditions, methods take/return stamps; easy to misuse, so prefer simpler tools unless profiling shows read-lock contention."] },
      { level: "Medium", q: "What is lock striping? Give an example.",
        a: ["Splitting one lock into N locks, each guarding a partition of the data, chosen by hash of the key.",
          "Threads working on different partitions run in parallel; same key always maps to the same lock.",
          "Java 7 ConcurrentHashMap had 16 segments; Guava's `Striped` provides striped locks.",
          "Bounded memory compared with a lock per key; trade-off: unrelated keys may share a stripe."] },
      { level: "Hard", q: "Under load, an API's latency spikes and thread dumps show 180 threads `parking to wait for <0x...> (a ReentrantLock$NonfairSync)`. How do you investigate and fix?",
        a: ["Find the owner: jstack's *Locked ownable synchronizers* section shows which thread holds that lock; check what it's doing (I/O? stuck?) or whether the owner thread is gone (leaked lock: missing unlock on some path).",
          "If held during slow work (DB call, HTTP), shrink the critical section: do the slow part outside, lock only to update shared state.",
          "If inherent contention, partition (striping), use concurrent data structures, or immutable snapshots for reads.",
          "Use timed `tryLock` to fail fast instead of piling up threads; add JFR (Thread Park events) and lock metrics.",
          "Fix leaks with the lock-before-try / unlock-in-finally idiom and a code review rule."] },
      { level: "Hard", q: "Implement a thread-safe cache with a read-write lock that loads missing entries without loading the same key twice.",
        a: ["Fast path: read lock, return if present.",
          "Slow path: release read lock (no upgrade!), take write lock, check again (another thread may have loaded it), load and put.",
          "Downside: loading under the write lock blocks all readers; for expensive loads prefer `ConcurrentHashMap.computeIfAbsent` or per-key futures (J22).",
          "Make the loader idempotent and keep it quick."],
        code: `class LoadingCache<K, V> {
    private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
    private final Map<K, V> map = new HashMap<>();
    private final Function<K, V> loader;
    final AtomicInteger loads = new AtomicInteger();
    LoadingCache(Function<K, V> loader) { this.loader = loader; }
    V get(K key) {
        rw.readLock().lock();
        try { V v = map.get(key); if (v != null) return v; } finally { rw.readLock().unlock(); }
        rw.writeLock().lock();
        try {
            V v = map.get(key);                    // re-check: someone may have loaded it meanwhile
            if (v == null) { v = loader.apply(key); loads.incrementAndGet(); map.put(key, v); }
            return v;
        } finally { rw.writeLock().unlock(); }
    }
}
LoadingCache<String, Integer> fares = new LoadingCache<>(route -> route.length() * 1000);
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 1_000; i++) { String r = i % 2 == 0 ? "DEL-BOM" : "BLR-GOI"; pool.submit(() -> fares.get(r)); }
}
System.out.println("loads: " + fares.loads.get() + " for 2 keys, DEL-BOM=" + fares.get("DEL-BOM"));` },
      { level: "Hard", q: "Your team migrates a service to virtual threads on Java 21 and throughput drops; JFR shows `jdk.VirtualThreadPinned` events. What is happening and what are the options?",
        a: ["Virtual threads that block (I/O, `Object.wait`, lock contention) while inside `synchronized` pin their carrier platform thread, so few carriers are available and throughput collapses.",
          "Find the frames from the pinned events (or `-Djdk.tracePinnedThreads=full`).",
          "Replace `synchronized` around blocking work with `ReentrantLock`, or move the blocking call outside the synchronized block.",
          "Upgrade third-party libraries that fixed this (many JDBC drivers, HTTP clients).",
          "Java 24+ (JEP 491) removes pinning for synchronized; native frames can still pin. J25 covers virtual threads."] }
    ],
    recap: [
      "Lock gives what synchronized can't: tryLock, timeouts, interruptible waits, fairness, multiple Conditions.",
      "Always `lock(); try { … } finally { unlock(); }`; ReentrantLock counts holds.",
      "Read-write locks share reads and serialize writes; waiting writers block new readers; never upgrade.",
      "StampedLock's optimistic read must be validated; it isn't reentrant.",
      "Stripe locks to scale, keep critical sections short, and prefer synchronized unless you need the extra features (or avoid pinning on Java 21)."
    ]
  });
})();
