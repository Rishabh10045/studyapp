/* Lesson F28: Locks & synchronized */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  // each step: [T1 holds, T2 holds, T1 waits, T2 waits, text, status]
  var SCEN = {
    naive: { name: "Naive: lock(from) then lock(to)", steps: [
      [[], [], null, null, "T1 calls transfer(A → B, ₹500); T2 calls transfer(B → A, ₹300) at the same moment.", ""],
      [["A"], [], null, null, "T1: synchronized (from = A) ✓ acquired.", ""],
      [["A"], ["B"], null, null, "T2: synchronized (from = B) ✓ acquired.", ""],
      [["A"], ["B"], "B", null, "T1: synchronized (to = B) … B is held by T2 → T1 BLOCKED.", ""],
      [["A"], ["B"], "B", "A", "T2: synchronized (to = A) … A is held by T1 → T2 BLOCKED. Each waits for the other forever: a cycle in the wait-for graph = DEADLOCK.", "dead"]] },
    ordered: { name: "Lock ordering: always lock the lower account id first", steps: [
      [[], [], null, null, "Same two transfers, but both lock min(id) first, then max(id): both start with A.", ""],
      [["A"], [], null, null, "T1: lock(A) ✓ (A < B).", ""],
      [["A"], [], null, "A", "T2: wants B → A, but also locks A first → waits for T1. It holds nothing, so no cycle is possible.", ""],
      [["A", "B"], [], null, "A", "T1: lock(B) ✓, moves ₹500, then unlocks B and A.", ""],
      [[], ["A"], null, null, "T2: lock(A) ✓.", ""],
      [[], ["A", "B"], null, null, "T2: lock(B) ✓, moves ₹300, unlocks. Both transfers done; balances consistent.", "ok"]] },
    trylock: { name: "tryLock with timeout and back-off", steps: [
      [[], [], null, null, "Both use ReentrantLock.tryLock(50 ms) for the second lock.", ""],
      [["A"], ["B"], null, null, "T1 holds A, T2 holds B (same unlucky interleaving as the naive case).", ""],
      [["A"], ["B"], "B", "A", "Both call tryLock on the other's lock and wait up to 50 ms…", "warn"],
      [[], ["B"], null, "A", "T1 times out first: releases A, backs off for a random 0–20 ms, and will retry.", ""],
      [[], ["B", "A"], null, null, "T2's tryLock(A) succeeds: it completes its transfer and unlocks both.", ""],
      [["A", "B"], [], null, null, "T1 retries: gets A and B, completes. No deadlock, at the cost of retries (and a risk of livelock without random back-off).", "ok"]] }
  };
  var KEYS = ["naive", "ordered", "trylock"];
  function deadlockWidget(el, ctx) {
    var s = ctx.state; if (s.k === undefined) { s.k = 0; s.i = 0; }
    el.innerHTML = "<p>" + ctx.md("Two threads transfer money in opposite directions between accounts **A** and **B**. Step through each strategy. Solid arrows: a lock is **held by** a thread. Dashed red arrows: a thread **waits for** a lock.") + "</p>" +
      "<div class='seg' data-r='k'></div>" +
      "<div class='btnrow' style='margin-top:8px'><button type='button' class='btn' data-r='prev'>◀ back</button><button type='button' class='btn primary' data-r='next'>step ▶</button></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var sc = SCEN[KEYS[s.k]], st = sc.steps[s.i];
      q("k").innerHTML = KEYS.map(function (k, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.k ? "on" : "") + "'>" + SCEN[k].name + "</button>"; }).join("");
      q("prev").disabled = s.i === 0; q("next").disabled = s.i === sc.steps.length - 1;
      var L = ["flowchart LR", "  T1([\"T1: A → B\"]):::" + (st[2] ? (st[5] === "dead" ? "bad" : "s1") : "s0"), "  LA[\"lock A\"]:::s4", "  LB[\"lock B\"]:::s4", "  T2([\"T2: B → A\"]):::" + (st[3] ? (st[5] === "dead" ? "bad" : "s1") : "s0")];
      var links = [];
      st[0].forEach(function (l) { L.push("  L" + l + " -->|holds| T1"); links.push("h"); });
      st[1].forEach(function (l) { L.push("  L" + l + " -->|holds| T2"); links.push("h"); });
      if (st[2]) { L.push("  T1 -.->|waits for| L" + st[2]); links.push("w"); }
      if (st[3]) { L.push("  T2 -.->|waits for| L" + st[3]); links.push("w"); }
      links.forEach(function (k, i) { if (k === "w") L.push("  linkStyle " + i + " stroke:#c62828,stroke-width:2px"); });
      L.push("  classDef s0 fill:#dbeafe,stroke:#2563eb", "  classDef s1 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#f8fafc,stroke:#64748b", "  classDef bad fill:#ffebee,stroke:#c62828,stroke-width:2px");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var res = q("res");
      res.className = "result " + (st[5] === "dead" ? "err" : st[5] === "ok" ? "ok" : st[5] === "warn" ? "warn" : "");
      res.innerHTML = "<div class='out'>Step " + (s.i + 1) + " / " + sc.steps.length + "</div><p>" + ctx.md(st[4]) + "</p>";
    }
    q("k").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b) return; s.k = Number(b.getAttribute("data-i")); s.i = 0; ctx.save(); draw(); });
    q("next").addEventListener("click", function () { s.i++; ctx.save(); draw(); });
    q("prev").addEventListener("click", function () { s.i--; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Critical sections and synchronized",
      text: "A **critical section** is code that touches shared mutable state and must not interleave with other threads doing the same. Every Java object has an intrinsic lock (**monitor**). `synchronized` acquires it on entry and releases it on exit (even on exceptions), which gives **mutual exclusion** and **visibility**: everything a thread wrote before releasing the lock is visible to the next thread that acquires it.",
      code: `class Wallet {
    private long balancePaise;
    private final List<String> ledger = new ArrayList<>();
    synchronized void credit(long p, String ref) { balancePaise += p; ledger.add("+" + p + " " + ref); }   // locks 'this'
    synchronized boolean debit(long p, String ref) {                            // check-then-act made atomic
        if (balancePaise < p) return false;
        balancePaise -= p; ledger.add("-" + p + " " + ref); return true;
    }
    synchronized long balance() { return balancePaise; }                         // reads need the lock too (visibility)
}
Wallet w = new Wallet(); w.credit(100_000, "topup");
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<Boolean>> res = new ArrayList<>();
for (int i = 0; i < 50; i++) { int n = i; res.add(pool.submit(() -> w.debit(3_000, "order-" + n))); }
int ok = 0; for (Future<Boolean> f : res) if (f.get()) ok++;
pool.shutdown();
System.out.println(ok + " debits of ₹30 succeeded; balance ₹" + w.balance() / 100 + " (never negative)");`,
      points: ["Synchronized **instance** methods lock `this`; **static** synchronized methods lock the `Class` object: they don't exclude each other", "Monitors are **reentrant**: a thread holding a lock can re-enter other synchronized methods on the same object", "Keep critical sections short: no I/O, remote calls or `Thread.sleep` while holding a lock"],
      analogy: "A single-occupancy changing room with one key. Whoever holds the key is inside; others queue at the door. When the key is handed back, the next person also sees whatever the previous one left on the bench (visibility)." },
    { title: "synchronized blocks: choosing the lock object",
      text: "A synchronized **block** lets you lock less code and choose the lock. Prefer a `private final Object lock` so outside code can't lock your object and interfere (or deadlock you). Use separate locks for independent state (lock striping), but then every invariant must be guarded by **one** consistent lock.",
      table: [
        ["Lock on", "Good?", "Why"],
        ["`private final Object lock = new Object()`", "Yes", "Nobody else can acquire it"],
        ["`this`", "OK internally", "Any caller can `synchronized (yourObj)` and hold your lock"],
        ["`SomeClass.class`", "For static state", "Global: one lock for every instance"],
        ["String literals, boxed `Integer`, `Boolean`", "Never", "Interned/cached: unrelated code may share the same object"],
        ["A field that gets reassigned", "Never", "Threads may lock different objects"],
        ["`ReentrantLock` / `ReadWriteLock`", "When you need tryLock, timeouts, fairness or conditions", "See the next slides"]],
      code: `class ShowInventory {
    private final Object seatLock = new Object(), statsLock = new Object();   // independent state, separate locks
    private final Set<String> booked = new HashSet<>(); private long views;
    boolean book(String seat) { synchronized (seatLock) { return booked.add(seat); } }
    void viewed() { synchronized (statsLock) { views++; } }                    // page views don't block bookings
    String report() { synchronized (seatLock) { synchronized (statsLock) { return booked.size() + " booked, " + views + " views"; } } }   // fixed order
}
ShowInventory inv = new ShowInventory();
System.out.println(inv.book("A1") + " " + inv.book("A1")); inv.viewed(); inv.viewed();
System.out.println(inv.report());`,
      points: ["If you take two locks, always in the **same order** everywhere (here seatLock then statsLock)", "Synchronizing on a `ConcurrentHashMap` doesn't lock its internal state: use its atomic methods instead (F31)"] },
    { title: "volatile vs synchronized vs atomics (CAS)",
      text: "Not every shared variable needs a lock. `volatile` gives visibility for single reads/writes. **Atomic classes** (`AtomicInteger`, `AtomicLong`, `AtomicReference`) give lock-free atomic read-modify-write via the CPU's **compare-and-set (CAS)** instruction: \"set to new if it is still old\", retried in a loop on contention.",
      table: [
        ["Tool", "Visibility", "Atomic compound ops", "Blocks?", "Use for"],
        ["`volatile`", "Yes", "No (`count++` still races)", "No", "Flags, publishing an immutable object"],
        ["`AtomicInteger`/`AtomicLong`", "Yes", "Yes (one variable)", "No (CAS retry)", "Counters, ids, sequence numbers"],
        ["`LongAdder`", "Yes", "Add/sum only", "No", "Hot counters (metrics) under heavy contention"],
        ["`AtomicReference` + immutable state", "Yes", "Yes (swap whole object)", "No", "Config snapshots, small state machines"],
        ["`synchronized` / `Lock`", "Yes", "Yes (any code, many variables)", "Yes", "Invariants across several fields"]],
      code: `static boolean placeBid(AtomicLong best, long bid) {                                  // CAS loop
    while (true) {
        long cur = best.get();
        if (bid <= cur) return false;                                          // someone already bid higher
        if (best.compareAndSet(cur, bid)) return true;                         // succeeds only if unchanged since get()
    }
}
AtomicLong highestBid = new AtomicLong(0);
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<?>> fs = new ArrayList<>();
for (long b = 1; b <= 1000; b++) { long bid = b * 10; fs.add(pool.submit(() -> placeBid(highestBid, bid))); }
for (Future<?> f : fs) f.get(); pool.shutdown();
System.out.println("highest bid: ₹" + highestBid.get());
System.out.println("same with accumulateAndGet: ₹" + new AtomicLong(500).accumulateAndGet(9_990, Math::max));`,
      points: ["`updateAndGet` / `accumulateAndGet` wrap the CAS loop for you (the function must be side-effect free: it may run several times)", "ABA problem: a value changes A → B → A and CAS can't tell; `AtomicStampedReference` adds a version", "Atomics protect **one** variable; two related variables need a lock or one immutable object in an `AtomicReference`"] },
    { title: "ReentrantLock: tryLock, timeouts, interruptibility, conditions",
      text: "`java.util.concurrent.locks.ReentrantLock` does what `synchronized` does, plus: **`tryLock()`** (don't wait), **`tryLock(timeout)`**, **`lockInterruptibly()`** (cancellable waiting), optional **fairness** (longest waiter goes first), and multiple **`Condition`** queues per lock. The price: you must `unlock()` in a `finally` block yourself.",
      code: `class ParkingLevel {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition spotFreed = lock.newCondition();
    private int free;
    ParkingLevel(int spots) { free = spots; }
    boolean park(String car, long waitMs) throws InterruptedException {
        if (!lock.tryLock(waitMs, TimeUnit.MILLISECONDS)) return false;          // couldn't even get the lock
        try {
            long nanos = TimeUnit.MILLISECONDS.toNanos(waitMs);
            while (free == 0) {                                                // always re-check in a loop
                if (nanos <= 0) return false;
                nanos = spotFreed.awaitNanos(nanos);                           // releases the lock while waiting
            }
            free--; System.out.println(car + " parked, free=" + free); return true;
        } finally { lock.unlock(); }                                           // ALWAYS in finally
    }
    void leave(String car) {
        lock.lock();
        try { free++; System.out.println(car + " left, free=" + free); spotFreed.signal(); }
        finally { lock.unlock(); }
    }
}
ParkingLevel level = new ParkingLevel(1);
level.park("KA-01-1111", 50);
Thread waiting = new Thread(() -> { try { System.out.println("MH-12-2222 waited: " + level.park("MH-12-2222", 500)); } catch (InterruptedException e) { } });
waiting.start(); Thread.sleep(50);
level.leave("KA-01-1111"); waiting.join();
System.out.println("DL-3C-3333 gave up: " + !level.park("DL-3C-3333", 30));`,
      points: ["Use `synchronized` by default (simpler, can't forget to unlock); reach for `ReentrantLock` when you need its extra features", "`await()` must be in a `while` loop: spurious wake-ups and other threads may consume the condition first", "Fair locks reduce starvation but lower throughput"] },
    { title: "ReadWriteLock and StampedLock for read-mostly data",
      text: "When reads vastly outnumber writes (a product catalogue, feature flags, exchange rates), a `ReentrantReadWriteLock` lets **many readers** proceed together while a **writer** gets exclusive access. `StampedLock` (Java 8) adds **optimistic reads**: read without locking, then `validate(stamp)` and retry under a real read lock only if a write happened meanwhile.",
      code: `class PriceBook {
    private final ReadWriteLock rw = new ReentrantReadWriteLock();
    private final Map<String, Integer> prices = new HashMap<>();
    Integer price(String sku) { rw.readLock().lock(); try { return prices.get(sku); } finally { rw.readLock().unlock(); } }
    void reprice(Map<String, Integer> changes) { rw.writeLock().lock(); try { prices.putAll(changes); } finally { rw.writeLock().unlock(); } }
}
class Location {                                                               // StampedLock: optimistic read
    private final StampedLock sl = new StampedLock(); private double lat, lng;
    void move(double la, double ln) { long st = sl.writeLock(); try { lat = la; lng = ln; } finally { sl.unlockWrite(st); } }
    String read() {
        long st = sl.tryOptimisticRead();
        double la = lat, ln = lng;                                             // may be torn
        if (!sl.validate(st)) { st = sl.readLock(); try { la = lat; ln = lng; } finally { sl.unlockRead(st); } }
        return la + "," + ln;
    }
}
PriceBook pb = new PriceBook(); pb.reprice(Map.of("MILK-1L", 66, "BREAD", 45));
System.out.println("milk ₹" + pb.price("MILK-1L"));
Location rider = new Location(); rider.move(12.9716, 77.5946); System.out.println("rider at " + rider.read());`,
      points: ["Read-write locks pay off only when reads dominate **and** critical sections are non-trivial; otherwise a plain lock is faster", "You can't upgrade a read lock to a write lock in `ReentrantReadWriteLock` (it deadlocks); release and re-acquire", "Often simpler: an immutable map in a `volatile`/`AtomicReference` field, replaced wholesale on update (copy-on-write)"] },
    { title: "Deadlock: the four conditions, and seeing one happen",
      text: "A deadlock needs all four **Coffman conditions**: **mutual exclusion** (locks), **hold and wait** (holding one lock while waiting for another), **no preemption** (locks can't be taken away), and **circular wait** (T1 waits for T2 waits for T1). Break any one and deadlock is impossible. The code below deliberately deadlocks two daemon threads and detects it with `ThreadMXBean`, the same information a `jstack` thread dump shows.",
      code: `// imports: java.lang.management.*
class Account { final int id; long balance; Account(int id, long b) { this.id = id; balance = b; } }
static void transfer(Account from, Account to, long amt, CountDownLatch bothHoldFirst) throws InterruptedException {
    synchronized (from) {
        bothHoldFirst.countDown(); bothHoldFirst.await();                       // force the bad interleaving
        synchronized (to) { from.balance -= amt; to.balance += amt; }
    }
}
Account a = new Account(1, 1000), b = new Account(2, 1000);
CountDownLatch latch = new CountDownLatch(2);
Thread t1 = new Thread(() -> { try { transfer(a, b, 500, latch); } catch (InterruptedException e) { } }, "T1 a->b");
Thread t2 = new Thread(() -> { try { transfer(b, a, 300, latch); } catch (InterruptedException e) { } }, "T2 b->a");
t1.setDaemon(true); t2.setDaemon(true); t1.start(); t2.start();
Thread.sleep(200);
java.lang.management.ThreadMXBean mx = java.lang.management.ManagementFactory.getThreadMXBean();
long[] ids = mx.findDeadlockedThreads();
System.out.println("deadlocked threads: " + (ids == null ? 0 : ids.length));
for (java.lang.management.ThreadInfo ti : mx.getThreadInfo(ids)) System.out.println("  " + ti.getThreadName() + " BLOCKED on " + ti.getLockName().replaceAll("@.*", "") + " held by " + ti.getLockOwnerName());`,
      points: ["`synchronized` deadlocks can't be broken from inside the JVM: the threads stay stuck until restart", "Detection in production: thread dumps (`jstack`, `jcmd Thread.print`), APM tools, `findDeadlockedThreads()` in a health check"] },
    { title: "Preventing deadlock: lock ordering and tryLock",
      text: "**Lock ordering** breaks circular wait: give every lock a global order (account id, then a tie-breaker) and always acquire in that order. **tryLock with timeout** breaks hold-and-wait: if the second lock isn't available soon, release the first and retry after a random back-off. Other options: one coarse lock (simple but serialises everything), or avoiding nested locks entirely (e.g. single-threaded owner per account, or a database transaction).",
      code: `class Account {
    final int id; private long balance; final ReentrantLock lock = new ReentrantLock();
    Account(int id, long b) { this.id = id; balance = b; }
    long balance() { return balance; }
    void add(long d) { balance += d; }
}
static void transferOrdered(Account from, Account to, long amt) {
    Account first = from.id < to.id ? from : to, second = first == from ? to : from;   // global order by id
    synchronized (first) { synchronized (second) {
        if (from.balance() >= amt) { from.add(-amt); to.add(amt); }
    } }
}
static boolean transferTry(Account from, Account to, long amt) throws InterruptedException {
    for (int attempt = 0; attempt < 50; attempt++) {
        if (from.lock.tryLock(10, TimeUnit.MILLISECONDS)) {
            try {
                if (to.lock.tryLock(10, TimeUnit.MILLISECONDS)) {
                    try { if (from.balance() >= amt) { from.add(-amt); to.add(amt); } return true; }
                    finally { to.lock.unlock(); }
                }
            } finally { from.lock.unlock(); }
        }
        Thread.sleep(ThreadLocalRandom.current().nextInt(5));                 // random back-off avoids livelock
    }
    return false;
}
Account a = new Account(1, 100_000), b = new Account(2, 100_000);
ExecutorService pool = Executors.newFixedThreadPool(4);
List<Future<?>> fs = new ArrayList<>();
for (int i = 0; i < 2_000; i++) {
    boolean dir = i % 2 == 0;
    fs.add(pool.submit(() -> transferOrdered(dir ? a : b, dir ? b : a, 7)));
    fs.add(pool.submit(() -> transferTry(dir ? b : a, dir ? a : b, 3)));
}
for (Future<?> f : fs) f.get(1, TimeUnit.SECONDS);
pool.shutdown();
System.out.println("no deadlock; total money conserved: " + (a.balance() + b.balance() == 200_000));`,
      points: ["Mixing `synchronized` (ordered) and `ReentrantLock` here is only for the demo; in real code pick one locking scheme per object", "If two objects can have equal keys, add a tie-breaker lock (or compare `System.identityHashCode` + a global lock for ties)"] },
    { title: "Livelock, starvation and contention",
      text: "Deadlock isn't the only liveness failure.",
      table: [
        ["Problem", "What happens", "Typical cause", "Fix"],
        ["Deadlock", "Threads wait for each other forever", "Circular lock acquisition", "Lock ordering, tryLock, fewer nested locks"],
        ["Livelock", "Threads keep running but make no progress", "Both back off and retry in lockstep (two people side-stepping in a corridor)", "Randomised back-off, priority/ordering"],
        ["Starvation", "A thread never gets the resource", "Unfair locks, greedy readers starving writers, low priority", "Fair locks, bounded waiting, `StampedLock`/write preference"],
        ["Contention", "Correct but slow: threads queue on one hot lock", "Coarse lock around everything", "Shorter critical sections, lock striping, concurrent collections, atomics, sharding"]],
      points: ["Measure before optimising: JFR \"Java Monitor Blocked\" events and thread dumps show which lock is hot", "Lock striping example: `ConcurrentHashMap` locks per bin, not the whole map (F31)", "Holding a lock while calling unknown code (listeners, callbacks) invites deadlock: copy what you need, release, then call"] },
    { title: "Mini LLD: seat booking without double-booking",
      text: "A movie booking system (BookMyShow-style) must never sell one seat twice, even when thousands of users click at once, and must let different seats be booked in parallel. Users hold seats for 5 minutes while paying. Options: one lock per **show** (simple; serialises only that show), per-**seat** atomic state transitions (more parallel), or optimistic **versioned** updates in the database.",
      m: M(["stateDiagram-v2", "  [*] --> AVAILABLE", "  AVAILABLE --> HELD : hold(user) CAS", "  HELD --> BOOKED : confirm(user) after payment", "  HELD --> AVAILABLE : hold expired / cancel", "  BOOKED --> [*]"]),
      code: `enum SeatState { AVAILABLE, HELD, BOOKED }
record Seat(SeatState state, String user, long heldUntil) {}
class Show {
    private final ConcurrentHashMap<String, AtomicReference<Seat>> seats = new ConcurrentHashMap<>();
    Show(List<String> ids) { ids.forEach(id -> seats.put(id, new AtomicReference<>(new Seat(SeatState.AVAILABLE, null, 0)))); }
    boolean hold(String seat, String user, long now) {                          // per-seat CAS, no global lock
        AtomicReference<Seat> ref = seats.get(seat);
        while (true) {
            Seat cur = ref.get();
            boolean free = cur.state() == SeatState.AVAILABLE || (cur.state() == SeatState.HELD && cur.heldUntil() < now);
            if (!free) return false;
            if (ref.compareAndSet(cur, new Seat(SeatState.HELD, user, now + 300_000))) return true;
        }
    }
    boolean holdAll(List<String> ids, String user, long now) {                  // all-or-nothing for a group
        List<String> got = new ArrayList<>();
        for (String id : ids) { if (hold(id, user, now)) got.add(id); else { got.forEach(g -> release(g, user)); return false; } }
        return true;
    }
    void release(String seat, String user) { seats.get(seat).updateAndGet(s -> user.equals(s.user()) && s.state() == SeatState.HELD ? new Seat(SeatState.AVAILABLE, null, 0) : s); }
    boolean confirm(String seat, String user) {
        Seat cur = seats.get(seat).get();
        return cur.state() == SeatState.HELD && user.equals(cur.user()) && seats.get(seat).compareAndSet(cur, new Seat(SeatState.BOOKED, user, 0));
    }
    String who(String seat) { return seats.get(seat).get().toString(); }
}
Show show = new Show(List.of("F7", "F8", "F9"));
ExecutorService pool = Executors.newFixedThreadPool(16);
List<Future<Boolean>> tries = new ArrayList<>();
for (int u = 0; u < 100; u++) { String user = "u" + u; tries.add(pool.submit(() -> show.holdAll(List.of("F7", "F8"), user, 0))); }
int winners = 0; for (Future<Boolean> f : tries) if (f.get()) winners++;
pool.shutdown();
System.out.println("100 users raced for F7+F8: winners = " + winners + (winners <= 1 ? " (never more than one)" : " BUG"));
System.out.println("F9 still free for others: " + show.hold("F9", "late-user", 0));`,
      points: ["Holding seats in a fixed order (sorted ids) inside `holdAll` avoids two groups grabbing seats in opposite orders and rolling each other back repeatedly", "In a real system the source of truth is the database: `UPDATE seat SET state='HELD', user=?, version=version+1 WHERE id=? AND version=?` (optimistic locking) or Redis `SET NX PX`", "Expired holds are treated as free lazily (checked in `hold`), so no sweeper thread is required"] }
  ];

  H.registerLesson({
    code: "F28",
    summary: "Locks and synchronized for LLD interviews: critical sections and intrinsic monitors, synchronized methods vs blocks and choosing the lock object, `volatile` vs atomics vs locks, CAS loops and the ABA problem, `ReentrantLock` with `tryLock`, timeouts and `Condition`s (a parking level), `ReadWriteLock` and `StampedLock` for read-mostly data, the four deadlock conditions with a live `ThreadMXBean` detection, lock ordering and tryLock back-off for money transfers, livelock, starvation and contention, and a mini design for seat booking without double-booking.",
    slides: SLIDES,
    widget: { heading: "Interactive: deadlock and how to avoid it", caption: "Two opposite transfers between accounts A and B. Step through the naive approach, lock ordering and tryLock with back-off.", render: deadlockWidget },
    examplesHeading: "Where locks show up in real Java systems",
    examples: [
      ["`Collections.synchronizedList` / `Vector` / `Hashtable`", "Every method synchronised on one lock: thread-safe for single calls but iteration and check-then-act still need external locking."],
      ["`ConcurrentHashMap`", "Fine-grained locking per bin plus CAS for empty bins: far less contention than one map-wide lock."],
      ["`LinkedBlockingQueue`", "Two `ReentrantLock`s (put lock and take lock) with `Condition`s `notFull`/`notEmpty`: producers and consumers rarely block each other."],
      ["Database row locks and optimistic versions", "`SELECT … FOR UPDATE` is a pessimistic lock; JPA `@Version` is CAS on a version column. Distributed services usually lock in the DB or Redis, not in the JVM."],
      ["Redis `SET key value NX PX 30000`", "A lease-style distributed lock for multi-instance services; needs fencing tokens for safety."]
    ],
    pitfalls: [
      "Forgetting `unlock()` in `finally` with `ReentrantLock`",
      "Synchronising writes but not reads (readers may see stale values)",
      "Locking on `this`, strings, boxed values or reassigned fields",
      "Nested locks acquired in different orders in different code paths",
      "Holding locks during I/O, remote calls or callbacks",
      "Using `volatile` for compound actions (`count++`, check-then-act)",
      "`Condition.await()`/`wait()` in an `if` instead of a `while`",
      "JVM locks in a horizontally scaled service: they don't protect against other instances (use DB/Redis locks or optimistic versions)"
    ],
    quiz: [
      { q: "A `static synchronized` method locks…", options: ["`this`", "The `Class` object", "Nothing", "All instances"], answer: 1, why: "So it doesn't exclude instance synchronized methods." },
      { q: "What does releasing a monitor guarantee besides mutual exclusion?", options: ["Fairness", "Visibility: writes before unlock are seen by the next thread that locks it", "Faster code", "Ordering of all threads"], answer: 1, why: "Monitor unlock happens-before subsequent lock." },
      { q: "Why is `synchronized (\"LOCK\")` dangerous?", options: ["Syntax error", "String literals are interned; unrelated code may lock the same object", "Strings are immutable", "It's slower"], answer: 1, why: "Shared hidden lock → contention or deadlock." },
      { q: "Which removes the circular-wait condition for transfers?", options: ["`volatile`", "Always locking accounts in a global order (e.g. by id)", "Bigger thread pool", "`Thread.yield()`"], answer: 1, why: "No cycle can form." },
      { q: "`AtomicLong.compareAndSet(expect, update)` …", options: ["Always sets", "Sets only if the current value equals `expect`, atomically", "Locks the variable", "Sleeps on failure"], answer: 1, why: "Basis of lock-free algorithms." },
      { q: "When does `ReentrantReadWriteLock` help?", options: ["Write-heavy data", "Read-mostly data with non-trivial read sections", "Single-threaded code", "Never"], answer: 1, why: "Readers share, writers exclusive." },
      { q: "What's a livelock?", options: ["Threads blocked forever", "Threads actively retrying but making no progress", "A lock that's alive", "Starvation of GC"], answer: 1, why: "Fix with randomised back-off." },
      { q: "Why must `await()` be called in a loop?", options: ["Style", "Spurious wake-ups and other threads may change the condition before you re-acquire the lock", "Performance", "It returns a boolean"], answer: 1, why: "Re-check the predicate." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Tool"],
        ["Simple mutual exclusion", "`synchronized` on a private final lock"],
        ["Try / timeout / interruptible lock", "`ReentrantLock.tryLock(t)` / `lockInterruptibly()`"],
        ["Wait for a condition", "`Condition.await()` in a while loop (or `wait/notifyAll`)"],
        ["Read-mostly shared data", "`ReadWriteLock`, `StampedLock`, or immutable snapshot in `AtomicReference`"],
        ["Single counter / max", "`AtomicLong`, `LongAdder`, `accumulateAndGet`"],
        ["Two locks", "Global order, or tryLock + random back-off"],
        ["Many service instances", "DB row lock / optimistic `@Version` / Redis lock"]],
      cards: [
        { title: "Deadlock conditions", items: ["Mutual exclusion", "Hold and wait", "No preemption", "Circular wait: break one"] },
        { title: "Lock hygiene", items: ["unlock in finally", "Short critical sections", "No I/O or callbacks under lock", "Same lock for reads and writes"] },
        { title: "Interview lines", items: ["volatile ≠ atomic", "CAS + ABA", "Lock ordering by id", "Optimistic vs pessimistic locking"] }]
    },
    practice: [
      { level: "Easy", q: "`synchronized` vs `ReentrantLock`: when would you use each?",
        a: ["Both give mutual exclusion, reentrancy and happens-before visibility.",
          "`synchronized`: less code, can't forget to unlock, JVM-optimised; the default choice.",
          "`ReentrantLock`: `tryLock` (avoid deadlock, fail fast), timeouts, `lockInterruptibly` (cancellable waits), fairness, several `Condition`s per lock (e.g. `notFull` and `notEmpty`), and querying (`isLocked`, queue length).",
          "On JDKs before 24, `ReentrantLock` also avoids pinning virtual threads during long blocking sections."] },
      { level: "Easy", q: "Find the thread-safety bugs.",
        code: `class Inventory {
    private final Map<String, Integer> stock = new HashMap<>();
    synchronized void add(String sku, int n) { stock.merge(sku, n, Integer::sum); }
    boolean reserve(String sku, int n) {                                         // BUG 1: not synchronized
        Integer have = stock.get(sku);                                           // BUG 2: check-then-act race
        if (have == null || have < n) return false;
        stock.put(sku, have - n); return true;
    }
}
Inventory inv = new Inventory(); inv.add("IPHONE-15", 1);
System.out.println("single-threaded it looks fine: " + inv.reserve("IPHONE-15", 1) + " " + inv.reserve("IPHONE-15", 1));`,
        follow: "Fix: make `reserve` synchronized on the same lock as `add` (reads and writes must share a lock), or use a `ConcurrentHashMap` with one atomic call: `stock.computeIfPresent(sku, (k, v) -> v >= n ? v - n : v)` plus a way to report success (F31)." },
      { level: "Medium", q: "Two threads print numbers 1..10 alternately (odd thread and even thread). Implement it with a lock and a condition.",
        code: `ReentrantLock lock = new ReentrantLock(); Condition turn = lock.newCondition();
int[] next = {1};
StringBuffer out = new StringBuffer();
Thread odd = new Thread(() -> loop(lock, turn, next, 1, out)), even = new Thread(() -> loop(lock, turn, next, 0, out));
odd.start(); even.start(); odd.join(); even.join();
System.out.println(out.toString().trim());

static void loop(ReentrantLock lock, Condition turn, int[] next, int parity, StringBuffer out) {
    while (true) {
        lock.lock();
        try {
            while (next[0] <= 10 && next[0] % 2 != parity) turn.awaitUninterruptibly();   // not my turn
            if (next[0] > 10) { turn.signalAll(); return; }
            out.append(parity == 1 ? "odd:" : "even:").append(next[0]++).append(' ');
            turn.signalAll();
        } finally { lock.unlock(); }
    }
}`,
        follow: "Same with `synchronized` + `wait()`/`notifyAll()`, or two `Semaphore`s handing a permit back and forth. The key ideas: a shared `next`, waiting in a loop, and signalling after each step." },
      { level: "Medium", q: "Implement a thread-safe token-bucket rate limiter: capacity 5, refill 5 tokens per second.",
        code: `class TokenBucket {
    private final long capacity; private final double refillPerNano;
    private double tokens; private long last;
    TokenBucket(long capacity, double perSecond, long now) { this.capacity = capacity; refillPerNano = perSecond / 1e9; tokens = capacity; last = now; }
    synchronized boolean tryAcquire(long now) {                                // refill + check + take: one atomic step
        tokens = Math.min(capacity, tokens + (now - last) * refillPerNano); last = now;
        if (tokens < 1) return false;
        tokens -= 1; return true;
    }
}
long t0 = 0; TokenBucket b = new TokenBucket(5, 5, t0);
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 7; i++) sb.append(b.tryAcquire(t0) ? "✓" : "✗");           // burst of 7 at t=0
sb.append(" | after 400 ms: ");
for (int i = 0; i < 3; i++) sb.append(b.tryAcquire(t0 + 400_000_000L) ? "✓" : "✗");   // 2 tokens refilled
System.out.println(sb);`,
        follow: "Passing `now` in makes it testable (inject a clock). For per-user limits keep a `ConcurrentHashMap<String, TokenBucket>` with `computeIfAbsent`; for many instances use Redis with a Lua script so refill-and-take is atomic across servers." },
      { level: "Medium", q: "`AtomicLong` vs `LongAdder` for a request counter hit by 64 threads: which and why?",
        a: ["`AtomicLong.incrementAndGet` is a CAS on one memory location: under heavy contention most CAS attempts fail and retry, and the cache line bounces between cores.",
          "`LongAdder` keeps several cells and threads update different cells; `sum()` adds them up. Much higher write throughput under contention.",
          "Trade-off: `sum()` is not an atomic snapshot and there's no `compareAndSet`. Use `LongAdder` for metrics/statistics; `AtomicLong` when you need the exact current value for decisions (ids, sequence numbers, limits)."] },
      { level: "Medium", q: "Design `transfer(from, to, amount)` for a wallet service that's thread-safe, deadlock-free and correct when the service runs on 10 instances.",
        a: ["Single JVM: lock both accounts in id order (or tryLock with back-off), check balance, debit, credit, release.",
          "Multiple instances: JVM locks don't help. Use a DB transaction: `SELECT … FOR UPDATE` both rows **in id order**, or optimistic `@Version` updates with retry.",
          "Idempotency key per transfer request so client retries don't double-debit; store it in the same transaction.",
          "Ledger: write two entries (debit and credit) in the same transaction; balances derived or updated atomically.",
          "Isolation level and deadlock handling: databases also detect deadlocks and abort one transaction; retry it."] },
      { level: "Hard", q: "Solve dining philosophers (5 philosophers, 5 forks) without deadlock, and say which Coffman condition you broke.",
        code: `int N = 5; ReentrantLock[] forks = new ReentrantLock[N];
for (int i = 0; i < N; i++) forks[i] = new ReentrantLock();
AtomicInteger meals = new AtomicInteger();
List<Thread> ps = new ArrayList<>();
for (int p = 0; p < N; p++) {
    int left = p, right = (p + 1) % N;
    int first = Math.min(left, right), second = Math.max(left, right);        // resource ordering
    Thread t = new Thread(() -> {
        for (int m = 0; m < 200; m++) {
            forks[first].lock();
            try { forks[second].lock(); try { meals.incrementAndGet(); } finally { forks[second].unlock(); } }
            finally { forks[first].unlock(); }
        }
    });
    ps.add(t); t.start();
}
for (Thread t : ps) t.join();
System.out.println("meals eaten: " + meals.get() + " (5 × 200, no deadlock)");`,
        follow: "Ordering forks by number breaks **circular wait**: philosopher 4 picks fork 0 before fork 4, so the cycle can't close. Alternatives: a waiter `Semaphore(N - 1)` (at most 4 try to eat; breaks hold-and-wait for the cycle), or `tryLock` and put the first fork back (breaks hold-and-wait)." },
      { level: "Hard", q: "Explain optimistic vs pessimistic locking with a booking example, and when each wins.",
        a: ["**Pessimistic**: lock first, then work (`synchronized`, `SELECT … FOR UPDATE`). Conflicts wait. Good when conflicts are frequent or retries are expensive (popular seats at a launch).",
          "**Optimistic**: read a version, do the work, then commit only if the version is unchanged (CAS, `UPDATE … WHERE version = ?`, JPA `@Version`). Conflicts fail and retry. Good when conflicts are rare and you want no lock waits (editing a profile, most bookings).",
          "Booking: hold a seat with an optimistic CAS from AVAILABLE to HELD (cheap, scalable); confirm with the same CAS from HELD(user) to BOOKED. The losers get \"seat just taken\" immediately.",
          "Under very high contention optimistic retries waste work (thundering herd); queue requests per hot resource or switch to pessimistic locking."] }
    ],
    recap: [
      "`synchronized` gives mutual exclusion and visibility on an object's monitor; lock a private final object, keep sections short.",
      "`volatile` = visibility only; atomics = lock-free single-variable updates via CAS; locks for invariants across fields.",
      "`ReentrantLock` adds tryLock, timeouts, interruptibility, fairness and conditions; always unlock in `finally`.",
      "Deadlock needs four conditions; break circular wait with lock ordering or hold-and-wait with tryLock + random back-off.",
      "In scaled-out services, lock in the database or Redis (pessimistic or optimistic) rather than in one JVM."
    ]
  });
})();
