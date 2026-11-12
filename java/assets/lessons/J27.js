/* Lesson J27: Classic problems: producer–consumer, philosophers, odd-even, bounded queue */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Grounded on JDK 21 with 5 philosopher threads and ReentrantLock forks, 1,000 meals each:
  //   naive (left fork first, all holding left at once via a barrier) → 0 meals, findDeadlockedThreads = 5;
  //   ordered (lower-numbered fork first) → 5,000 meals; waiter (Semaphore with 4 seats) → 5,000 meals.
  // The JS model was checked over every interleaving for 3 to 5 philosophers: only "naive" can deadlock.
  var N = 5;
  var STRATS = {
    naive: { label: "everyone takes left fork first", code: "void dine(int p) {\n    Lock left = forks[p], right = forks[(p + 1) % N];\n    left.lock();\n    right.lock();          // all five hold their left fork → everyone waits forever\n    try { eat(); } finally { right.unlock(); left.unlock(); }\n}" },
    ordered: { label: "fix: lower-numbered fork first", code: "void dine(int p) {\n    int a = p, b = (p + 1) % N;\n    Lock first = forks[Math.min(a, b)], second = forks[Math.max(a, b)];   // P4 takes fork 0 before fork 4\n    first.lock(); second.lock();\n    try { eat(); } finally { second.unlock(); first.unlock(); }\n}" },
    waiter: { label: "fix: waiter allows 4 at the table", code: "Semaphore seats = new Semaphore(N - 1);   // at most 4 philosophers reach for forks\n\nvoid dine(int p) throws InterruptedException {\n    seats.acquire();\n    try {\n        forks[p].lock(); forks[(p + 1) % N].lock();\n        try { eat(); } finally { forks[(p + 1) % N].unlock(); forks[p].unlock(); }\n    } finally { seats.release(); }\n}" }
  };
  function forksOf(st, p, n) { var a = p, b = (p + 1) % n; return st === "ordered" ? [Math.min(a, b), Math.max(a, b)] : [a, b]; }
  function fresh(n) { var S = { n: n, fork: [], ph: [], seats: n - 1, meals: 0, log: [] }; for (var i = 0; i < n; i++) { S.fork.push(null); S.ph.push({ pc: 0, wait: null, meals: 0, seat: false }); } return S; }
  // pc: 0 think → (waiter: take seat) → 1 has seat/ready → take first fork → 2 → take second fork → 3 eating → release → 0
  function step(st, S, p) {
    var P = S.ph[p], f = forksOf(st, p, S.n);
    if (P.pc === 0) {
      if (st === "waiter") { if (S.seats > 0) { S.seats--; P.seat = true; P.pc = 1; P.wait = null; S.log.push("P" + p + " sits down (" + S.seats + " seat(s) left)"); } else { P.wait = "seat"; S.log.push("P" + p + " waits for a seat"); } }
      else { P.pc = 1; S.log.push("P" + p + " gets hungry"); }
    } else if (P.pc === 1 || P.pc === 2) {
      var k = f[P.pc - 1];
      if (S.fork[k] === null) { S.fork[k] = p; P.pc++; P.wait = null; S.log.push("P" + p + " picks up fork " + k); }
      else { P.wait = k; S.log.push("P" + p + " waits for fork " + k + " (held by P" + S.fork[k] + ")"); }
    } else {
      S.fork[f[0]] = null; S.fork[f[1]] = null; P.meals++; S.meals++; P.pc = 0; P.wait = null;
      if (P.seat) { P.seat = false; S.seats++; }
      S.log.push("P" + p + " eats and puts down forks " + f[1] + " and " + f[0]);
    }
  }
  function deadlocked(st, S) {
    // every philosopher is blocked and no step can change state
    for (var p = 0; p < S.n; p++) {
      var P = S.ph[p];
      if (P.pc === 0) { if (st !== "waiter" || S.seats > 0) return false; }
      else if (P.pc === 3) return false;
      else if (S.fork[forksOf(st, p, S.n)[P.pc - 1]] === null) return false;
    }
    return true;
  }
  function dpWidget(el, ctx) {
    var s = ctx.state; if (!s.st) { s.st = "naive"; s.sim = null; }
    el.innerHTML = "<div class='seg' data-r='st'>" + Object.keys(STRATS).map(function (k) { return "<button type='button' data-v='" + k + "'>" + STRATS[k].label + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='code' style='margin-top:10px'></pre><div class='btnrow' data-r='steps' style='margin-top:6px'></div>" +
      "<div class='btnrow' style='margin-top:6px'><button type='button' class='btn primary' data-r='worst'>everyone grabs at once</button><button type='button' class='btn' data-r='rand'>random 200 steps</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><div class='tablewrap' data-r='log'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      if (!s.sim) s.sim = fresh(N);
      var S = s.sim, dl = deadlocked(s.st, S);
      q("st").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", s.st === b.dataset.v); });
      q("code").innerHTML = ctx.H.highlight(STRATS[s.st].code, "java");
      q("steps").innerHTML = S.ph.map(function (P, p) { return "<button type='button' class='btn' data-p='" + p + "'" + (dl ? " disabled" : "") + ">step P" + p + "</button>"; }).join("");
      var G = ["flowchart TB"];
      for (var p = 0; p < N; p++) {
        var P = S.ph[p], need = (P.pc === 1 || P.pc === 2) ? forksOf(s.st, p, N)[P.pc - 1] : null, blocked = need !== null && S.fork[need] !== null && S.fork[need] !== p;
        var state = P.pc === 3 ? "eating" : blocked ? "waiting for fork " + need : P.wait === "seat" ? "waiting for seat" : P.pc === 0 ? "thinking" : "hungry";
        var held = S.fork.map(function (h, k) { return h === p ? k : null; }).filter(function (k) { return k !== null; });
        G.push("  P" + p + "[\"P" + p + ": " + state + "<br/>holds " + (held.length ? "fork " + held.join(" + ") : "nothing") + " · meals " + P.meals + "\"]:::" + (dl ? "bad" : P.pc === 3 ? "ok" : blocked || P.wait === "seat" ? "wt" : "th"));
        if (blocked) G.push("  P" + p + " -.->|needs fork " + need + "| P" + S.fork[need]);
      }
      G.push("  classDef th fill:#dbeafe,stroke:#2563eb", "  classDef ok fill:#e8f5e9,stroke:#2e7d32", "  classDef wt fill:#fff3e0,stroke:#ef6c00", "  classDef bad fill:#ffebee,stroke:#c62828", "  classDef fk fill:#f3f4f6,stroke:#6b7280");
      ctx.H.renderDiagram(q("dg"), G.join("\n"));
      var holds = S.fork.map(function (h, k) { return "fork " + k + ": " + (h === null ? "free" : "P" + h); }).join(" · ");
      q("res").innerHTML = ctx.md((dl ? "**Deadlock:** every philosopher holds one fork and waits for the next one, a cycle of five. On JDK 21 this run ate 0 meals and `findDeadlockedThreads()` reported 5 threads. " :
        "**Meals eaten: " + S.meals + ".** " + (s.st === "naive" ? "Try \"everyone grabs at once\"." : s.st === "ordered" ? "P4 reaches for fork 0 first, so the cycle can't close (JDK 21: all 5,000 meals)." : "With at most 4 seated, one of them always gets both forks (JDK 21: all 5,000 meals). Seats free: " + S.seats + ".")) + " " + holds);
      q("log").innerHTML = S.log.length ? "<table><thead><tr><th>#</th><th>event</th></tr></thead><tbody>" + S.log.slice(-6).map(function (x, i, arr) { return "<tr><td>" + (S.log.length - arr.length + i + 1) + "</td><td>" + x + "</td></tr>"; }).join("") + "</tbody></table>" : "";
    }
    q("st").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.st = b.dataset.v; s.sim = fresh(N); ctx.save(); draw(); });
    q("steps").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || b.disabled) return; step(s.st, s.sim, +b.dataset.p); ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.sim = fresh(N); ctx.save(); draw(); });
    q("worst").addEventListener("click", function () {
      s.sim = fresh(N);
      for (var r = 0; r < 4; r++) for (var p = 0; p < N && !deadlocked(s.st, s.sim); p++) step(s.st, s.sim, p);
      ctx.save(); draw();
    });
    q("rand").addEventListener("click", function () {
      s.sim = s.sim || fresh(N);
      for (var k = 0; k < 200 && !deadlocked(s.st, s.sim); k++) step(s.st, s.sim, Math.floor(Math.random() * N));
      ctx.save(); draw();
    });
    draw();
  }

  var SLIDES = [
    { title: "The classic concurrency problems and one template",
      text: "Most concurrency coding rounds draw from a small set: **producer–consumer**, a **bounded blocking queue**, **odd-even / ABC printing** with several threads, **multithreaded FizzBuzz**, **dining philosophers**, plus warm-ups (counter, singleton, cache, rate limiter). Nearly all are solved by one template: identify the **shared state**, the **condition** each thread waits for, and **who signals** when it changes. Then pick a tool: `BlockingQueue` if one exists, `synchronized` + `wait`/`notifyAll`, `ReentrantLock` + `Condition`s, or `Semaphore`s. Always **wait in a `while` loop**, signal after every state change, and make termination explicit.",
      m: M(["flowchart LR",
        "  S[\"shared state<br/>(buffer, turn, counter)\"]:::s1 --> C[\"condition per thread<br/>(not full, my turn)\"]:::s3",
        "  C --> W[\"wait while condition false\"]:::s3",
        "  W --> A[\"act, change state\"]:::s2",
        "  A --> N[\"signal waiters\"]:::s2",
        "  N --> C",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s3 fill:#fff3e0,stroke:#ef6c00"]),
      table: [["Problem", "Shared state", "Condition", "Typical tool"],
        ["Producer–consumer", "Buffer", "Not full / not empty", "BlockingQueue, Conditions"],
        ["Odd-even, ABC", "Counter, turn", "It's my turn", "wait/notifyAll, Semaphores"],
        ["FizzBuzz (4 threads)", "Current number", "Number matches my rule", "synchronized + notifyAll"],
        ["Dining philosophers", "Forks", "Both forks free", "Lock ordering, Semaphore waiter"],
        ["Rate limiter", "Tokens, timestamp", "Token available", "synchronized, atomics"]],
      analogy: "Every one of these is a meeting room with a sign on the door: check the sign (condition), wait in the lobby if it's not for you, and when you leave, update the sign and tell the lobby." },
    { title: "Producer–consumer with BlockingQueue",
      text: "The production answer: an **`ArrayBlockingQueue`** (bounded) between producers and consumers. `put` blocks when full, giving **backpressure**; `take` blocks when empty. Shut down with a **poison pill** per consumer (a sentinel value), or with `poll(timeout)` plus a done flag, or by interrupting. Bounded queues matter: an unbounded `LinkedBlockingQueue` hides slow consumers until memory runs out. Mention this version first in an interview, then build one from scratch if asked.",
      code: `BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(5);
int POISON = -1, consumers = 2;
AtomicInteger sum = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(3)) {
    pool.submit(() -> {
        for (int i = 1; i <= 100; i++) queue.put(i);              // blocks while 5 items are waiting
        for (int c = 0; c < consumers; c++) queue.put(POISON);    // one pill per consumer
        return null;
    });
    for (int c = 0; c < consumers; c++) pool.submit(() -> {
        while (true) { int v = queue.take(); if (v == POISON) return null; sum.addAndGet(v); }
    });
}
System.out.println("consumed sum = " + sum.get() + " (expected 5050)");` },
    { title: "Bounded buffer from scratch: wait / notifyAll",
      text: "The classic implementation with an intrinsic lock: both `put` and `take` are `synchronized`; each **waits in a `while` loop** for its condition (not full / not empty), because of spurious wake-ups and because another thread may have changed the state first; after changing the buffer it calls **`notifyAll()`**. Why not `notify()`? Producers and consumers wait on the **same monitor**, so `notify` could wake another producer when only a consumer can proceed, which can stall everyone. J20 showed this in its widget.",
      code: `class BoundedBuffer<T> {
    private final Object[] items; private int head, tail, count;
    BoundedBuffer(int capacity) { items = new Object[capacity]; }
    synchronized void put(T x) throws InterruptedException {
        while (count == items.length) wait();          // while, never if
        items[tail] = x; tail = (tail + 1) % items.length; count++;
        notifyAll();                                    // wake consumers (and producers, harmlessly)
    }
    @SuppressWarnings("unchecked")
    synchronized T take() throws InterruptedException {
        while (count == 0) wait();
        T x = (T) items[head]; items[head] = null; head = (head + 1) % items.length; count--;
        notifyAll();
        return x;
    }
}
BoundedBuffer<Integer> buf = new BoundedBuffer<>(3);
Thread producer = new Thread(() -> { try { for (int i = 1; i <= 10; i++) buf.put(i); } catch (InterruptedException e) { } });
List<Integer> got = new ArrayList<>();
Thread consumer = new Thread(() -> { try { for (int i = 0; i < 10; i++) got.add(buf.take()); } catch (InterruptedException e) { } });
producer.start(); consumer.start(); producer.join(); consumer.join();
System.out.println("received in order: " + got);` },
    { title: "Bounded blocking queue with Lock and two Conditions",
      text: "The better from-scratch version, essentially how `ArrayBlockingQueue` works: one `ReentrantLock` and two `Condition`s, **`notFull`** for producers and **`notEmpty`** for consumers. Each side waits on its own condition and **signals only the other side**, so `signal()` (not `signalAll`) is safe and avoids waking threads that can't proceed. You also get `lockInterruptibly`, timed waits (`awaitNanos`) for `offer(e, timeout)`, and optional fairness. This is a favourite \"implement it\" question.",
      m: M(["flowchart LR",
        "  P[\"producer put()\"]:::s1 -->|full → await| NF[\"notFull condition\"]:::s3",
        "  C[\"consumer take()\"]:::s1 -->|empty → await| NE[\"notEmpty condition\"]:::s3",
        "  P -->|after insert: signal| NE",
        "  C -->|after remove: signal| NF",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00"]),
      code: `class BlockingQ<T> {
    private final ArrayDeque<T> q = new ArrayDeque<>(); private final int cap;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();
    BlockingQ(int cap) { this.cap = cap; }
    void put(T x) throws InterruptedException {
        lock.lockInterruptibly();
        try { while (q.size() == cap) notFull.await(); q.addLast(x); notEmpty.signal(); } finally { lock.unlock(); }
    }
    T take() throws InterruptedException {
        lock.lockInterruptibly();
        try { while (q.isEmpty()) notEmpty.await(); T x = q.removeFirst(); notFull.signal(); return x; } finally { lock.unlock(); }
    }
    boolean offer(T x, long ms) throws InterruptedException {
        long nanos = TimeUnit.MILLISECONDS.toNanos(ms);
        lock.lockInterruptibly();
        try { while (q.size() == cap) { if (nanos <= 0) return false; nanos = notFull.awaitNanos(nanos); } q.addLast(x); notEmpty.signal(); return true; } finally { lock.unlock(); }
    }
}
BlockingQ<String> bq = new BlockingQ<>(2);
bq.put("a"); bq.put("b");
System.out.println("offer when full (50 ms): " + bq.offer("c", 50));
LongAdder taken = new LongAdder();
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int p = 0; p < 2; p++) pool.submit(() -> { for (int i = 0; i < 500; i++) bq.put("x"); return null; });
    for (int c = 0; c < 2; c++) pool.submit(() -> { for (int i = 0; i < 501; i++) { bq.take(); taken.increment(); } return null; });
}
System.out.println("taken " + taken.sum() + " items (the 2 already queued + 1000 produced) with 2 producers and 2 consumers");` },
    { title: "Print odd and even numbers with two threads",
      text: "Thread A prints odd numbers, thread B even ones, alternating 1..N. Shared state: the **next number**. Condition: \"the next number has my parity\". Each thread loops: lock, `while (not my turn) wait()`, print, increment, `notifyAll()`. Termination: both stop when the counter passes N, and the waiting loop must also check for the end, or the last thread waits forever. Variants: `Semaphore`s handing a permit back and forth, or `SynchronousQueue`. The interviewer watches for `while` vs `if`, missed termination and printing outside the lock.",
      code: `int max = 10;
int[] next = {1};
Object lock = new Object();
StringBuilder out = new StringBuilder();
Function<Integer, Runnable> printer = parity -> () -> {
    while (true) {
        synchronized (lock) {
            while (next[0] <= max && next[0] % 2 != parity) {
                try { lock.wait(); } catch (InterruptedException e) { return; }
            }
            if (next[0] > max) { lock.notifyAll(); return; }   // let the other thread exit too
            out.append(Thread.currentThread().getName()).append(':').append(next[0]).append(' ');
            next[0]++;
            lock.notifyAll();
        }
    }
};
Thread odd = new Thread(printer.apply(1), "odd"), even = new Thread(printer.apply(0), "even");
odd.start(); even.start(); odd.join(); even.join();
System.out.println(out.toString().trim());`,
      analogy: "Two people sharing one microphone with a sign showing whose turn it is: you only pick it up when the sign shows your name, and you flip the sign as you put it down." },
    { title: "N threads in round robin (ABC) with semaphores",
      text: "Generalise to N threads printing in turn (A, B, C, A, B, C …). With **semaphores**: one semaphore per thread, only the first starts with a permit; each thread `acquire`s its own, prints, then `release`s the **next** thread's. No shared counter or lock needed, and no wasted wake-ups because each thread only ever waits for its own permit. The same structure solves \"print in order\" (LeetCode 1114) and the FooBar alternation problem.",
      m: M(["flowchart LR",
        "  A[\"thread A<br/>acquire semA\"]:::s1 -->|release semB| B[\"thread B<br/>acquire semB\"]:::s1",
        "  B -->|release semC| C[\"thread C<br/>acquire semC\"]:::s1",
        "  C -->|release semA| A",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb"]),
      code: `int n = 3, rounds = 4;
Semaphore[] turn = new Semaphore[n];
for (int i = 0; i < n; i++) turn[i] = new Semaphore(i == 0 ? 1 : 0);     // A goes first
StringBuffer out = new StringBuffer();                                    // synchronized appends
List<Thread> threads = new ArrayList<>();
for (int i = 0; i < n; i++) {
    int me = i;
    threads.add(new Thread(() -> {
        for (int r = 0; r < rounds; r++) {
            turn[me].acquireUninterruptibly();
            out.append((char) ('A' + me));
            turn[(me + 1) % n].release();                                  // hand over to the next thread
        }
    }));
}
threads.forEach(Thread::start);
for (Thread t : threads) t.join();
System.out.println(out);` },
    { title: "Multithreaded FizzBuzz (four threads)",
      text: "Four threads share a counter from 1 to n: one prints `fizz` (divisible by 3 only), one `buzz` (5 only), one `fizzbuzz` (15), one the number. Each thread's condition is \"the current number belongs to me\". With `synchronized` + `wait`/`notifyAll`: every thread waits while the number isn't its kind, acts, increments, and notifies all (several threads with different conditions share the monitor, so `notify` isn't safe). The end condition is checked in the wait loop so all four exit. Alternatives: one `Condition` or `Semaphore` per kind, signalling exactly the right next thread.",
      code: `class FizzBuzz {
    private final int n; private int cur = 1; private final List<String> out = new ArrayList<>();
    FizzBuzz(int n) { this.n = n; }
    private synchronized void run(IntPredicate mine, IntFunction<String> say) throws InterruptedException {
        while (true) {
            while (cur <= n && !mine.test(cur)) wait();
            if (cur > n) { notifyAll(); return; }
            out.add(say.apply(cur)); cur++;
            notifyAll();
        }
    }
    synchronized List<String> result() { return out; }
    Runnable worker(IntPredicate mine, IntFunction<String> say) { return () -> { try { run(mine, say); } catch (InterruptedException e) { } }; }
}
FizzBuzz fb = new FizzBuzz(15);
List<Thread> ts = List.of(
    new Thread(fb.worker(i -> i % 3 == 0 && i % 5 != 0, i -> "fizz")),
    new Thread(fb.worker(i -> i % 5 == 0 && i % 3 != 0, i -> "buzz")),
    new Thread(fb.worker(i -> i % 15 == 0, i -> "fizzbuzz")),
    new Thread(fb.worker(i -> i % 3 != 0 && i % 5 != 0, String::valueOf)));
ts.forEach(Thread::start);
for (Thread t : ts) t.join();
System.out.println(String.join(" ", fb.result()));` },
    { title: "Dining philosophers: deadlock and three fixes",
      text: "Five philosophers sit around a table with one fork between neighbours; each needs both adjacent forks to eat. If everyone picks up the left fork first, all five can hold one fork and wait for the next forever (the widget's \"everyone grabs at once\"; on JDK 21: 0 meals, 5 deadlocked threads). Fixes: **resource ordering** (always take the lower-numbered fork first, so one philosopher reaches the other way and the cycle can't close), a **waiter** (`Semaphore(N-1)`: at most four reach for forks, so one always gets both), or **`tryLock` with back-off** (put the first fork down if the second is busy). Both ordering and the waiter completed all 5,000 meals in the recorded runs.",
      m: M(["flowchart LR",
        "  P0[\"P0 holds fork 0\"]:::s4 -->|waits fork 1| P1[\"P1 holds fork 1\"]:::s4",
        "  P1 -->|waits fork 2| P2[\"P2 holds fork 2\"]:::s4",
        "  P2 -->|waits fork 3| P3[\"P3 holds fork 3\"]:::s4",
        "  P3 -->|waits fork 4| P4[\"P4 holds fork 4\"]:::s4",
        "  P4 -->|waits fork 0| P0",
        "  classDef s4 fill:#ffebee,stroke:#c62828"]),
      code: `int n = 5;
ReentrantLock[] forks = new ReentrantLock[n];
for (int i = 0; i < n; i++) forks[i] = new ReentrantLock();
int[] meals = new int[n];
List<Thread> ts = new ArrayList<>();
for (int p = 0; p < n; p++) {
    int me = p, a = p, b = (p + 1) % n;
    ReentrantLock first = forks[Math.min(a, b)], second = forks[Math.max(a, b)];   // resource ordering
    ts.add(new Thread(() -> {
        for (int m = 0; m < 1_000; m++) {
            first.lock(); second.lock();
            try { meals[me]++; } finally { second.unlock(); first.unlock(); }
        }
    }));
}
ts.forEach(Thread::start);
for (Thread t : ts) t.join();
System.out.println("meals per philosopher: " + Arrays.toString(meals));` },
    { title: "Warm-ups: counter, lazy singleton, cache",
      text: "Quick questions that open many rounds. **Thread-safe counter**: `AtomicLong` (or `LongAdder` under heavy contention), not `volatile long` (`count++` is not atomic). **Lazy singleton**: the **holder idiom** (class initialisation is thread-safe and lazy) or an `enum`; double-checked locking only with a `volatile` field. **Cache**: `ConcurrentHashMap.computeIfAbsent` computes each key once, but keep the function short and don't modify the map inside it; for expiry and size limits use Caffeine.",
      code: `class Config {
    private Config() { System.out.println("Config created once"); }
    private static class Holder { static final Config INSTANCE = new Config(); }   // initialised on first access, thread-safe
    static Config get() { return Holder.INSTANCE; }
}
LongAdder hits = new LongAdder();
ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();
AtomicInteger loads = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 1_000; i++) {
        String key = "route-" + (i % 4);
        pool.submit(() -> {
            Config.get();
            hits.increment();
            cache.computeIfAbsent(key, k -> { loads.incrementAndGet(); return k.toUpperCase(); });
        });
    }
}
System.out.println("hits " + hits.sum() + ", cache loads " + loads.get() + " for " + cache.size() + " keys");` },
    { title: "Thread-safe rate limiter (token bucket)",
      text: "A **token bucket** allows bursts up to a capacity and refills at a steady rate. State: tokens and the last refill time. `tryAcquire()` refills based on elapsed time, then takes a token if one is available. The simplest correct version makes the method `synchronized`, which is fine at most rates; a lock-free version packs state into an `AtomicLong` or `AtomicReference` with CAS. Use `System.nanoTime()` (monotonic), not `currentTimeMillis()`. In production use Resilience4j or Bucket4j; distributed limits need Redis (HLD lessons).",
      code: `class TokenBucket {
    private final long capacity; private final double perNano; private double tokens; private long last;
    TokenBucket(long capacity, double perSecond) { this.capacity = capacity; this.perNano = perSecond / 1e9; this.tokens = capacity; this.last = System.nanoTime(); }
    synchronized boolean tryAcquire() {
        long now = System.nanoTime();
        tokens = Math.min(capacity, tokens + (now - last) * perNano);   // refill for the elapsed time
        last = now;
        if (tokens >= 1) { tokens -= 1; return true; }
        return false;
    }
}
TokenBucket bucket = new TokenBucket(10, 5);                 // burst 10, then 5 per second
AtomicInteger allowed = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 100; i++) pool.submit(() -> { if (bucket.tryAcquire()) allowed.incrementAndGet(); });
}
System.out.println("burst of 100 requests: allowed " + allowed.get() + " (capacity 10)");
Thread.sleep(400);
System.out.println("after 400 ms: " + (bucket.tryAcquire() ? "allowed again (refilled ~2 tokens)" : "still empty"));` },
    { title: "Solving these in an interview, and testing them",
      text: "A reliable sequence: **clarify** (how many threads, ordering, termination, bounded?), say the **simplest correct tool** first (`BlockingQueue`, semaphores), then write the from-scratch version if asked; state **shared state, conditions and signals** out loud; use **`while` around waits**, `notifyAll` or separate `Condition`s, `try/finally` around `unlock`; handle **termination** and `InterruptedException`. To test, run many iterations, start threads together with a **latch as a start gate**, assert invariants (totals, order), and add timeouts so a deadlock fails the test instead of hanging. For memory-model questions, OpenJDK's **jcstress** tests interleavings properly.",
      code: `int threads = 8, perThread = 10_000;
CountDownLatch startGate = new CountDownLatch(1), done = new CountDownLatch(threads);
AtomicLong counter = new AtomicLong();
for (int t = 0; t < threads; t++) new Thread(() -> {
    try { startGate.await(); for (int i = 0; i < perThread; i++) counter.incrementAndGet(); }
    catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    finally { done.countDown(); }
}).start();
startGate.countDown();                                                    // release all threads at once
boolean finished = done.await(5, TimeUnit.SECONDS);                       // a deadlock fails instead of hanging
System.out.println("finished=" + finished + ", counter=" + counter.get() + ", expected=" + threads * perThread);` }
  ];

  H.registerLesson({
    code: "J27",
    summary: "The coding problems concurrency interviews draw from, solved with one template (shared state, condition, signal): producer–consumer with `BlockingQueue` and poison pills, a bounded buffer with `wait`/`notifyAll`, a bounded blocking queue with `ReentrantLock` and two `Condition`s, odd-even printing, N-thread round robin with semaphores, multithreaded FizzBuzz, dining philosophers with three fixes, warm-ups (counter, lazy singleton, cache), a token-bucket rate limiter, and how to present and test these solutions.",
    slides: SLIDES,
    widget: { heading: "Interactive: dining philosophers", caption: "Step philosophers or let everyone grab at once. With left-fork-first the five can deadlock in a cycle; ordering forks or a waiter with four seats prevents it. Matches JDK 21 runs (naive: 0 meals, 5 deadlocked threads; both fixes: 5,000 meals) and an exhaustive check of every interleaving.", render: dpWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Ingestion pipelines", "Reader threads feed a bounded queue drained by parser workers; the bound gives backpressure."],
      ["Logging and metrics", "Async appenders are producer–consumer queues with a policy for when the queue is full."],
      ["Resource pools", "Connection pools are bounded blocking queues of connections with timed `offer`/`poll`."],
      ["Lock ordering", "Dining philosophers is the textbook version of transfers between two accounts (J26)."],
      ["API gateways", "Token-bucket rate limiters protect services per client."],
      ["Interviews", "\"Print odd/even with two threads\" and \"implement a blocking queue\" are perennial questions."]
    ],
    pitfalls: [
      "`if` instead of `while` around wait()",
      "`notify()` when threads with different conditions share a monitor",
      "Forgetting termination so the last thread waits forever",
      "Calling wait/notify without holding the monitor (IllegalMonitorStateException)",
      "Unbounded queues hiding slow consumers",
      "Unlocking outside finally",
      "Swallowing InterruptedException without restoring the flag",
      "Sleep-based coordination instead of real signals",
      "Tests without timeouts that hang on deadlock"
    ],
    quiz: [
      { q: "Why must `wait()` be called in a while loop?", options: ["It's faster", "Spurious wake-ups and other threads may change state before the woken thread reacquires the lock", "wait() returns a boolean", "Compiler requirement"], answer: 1, why: "Re-check the condition after every wake-up." },
      { q: "In a bounded buffer with one monitor, why prefer `notifyAll()` over `notify()`?", options: ["notify is deprecated", "Producers and consumers wait on the same monitor; notify might wake a thread that still can't proceed, stalling the system", "notifyAll is faster", "notify releases the lock"], answer: 1, why: "With separate Conditions (notFull/notEmpty) a targeted signal() is safe." },
      { q: "What does `ArrayBlockingQueue.put` do when the queue is full?", options: ["Throws", "Blocks until space is available", "Drops the element", "Grows the array"], answer: 1, why: "offer() returns false; add() throws; put() blocks." },
      { q: "In the semaphore round-robin solution, which semaphore starts with a permit?", options: ["All of them", "Only the first thread's", "None", "The last thread's"], answer: 1, why: "Each thread releases the next thread's semaphore after printing." },
      { q: "What does this print?", code: `Semaphore a = new Semaphore(1), b = new Semaphore(0);
StringBuffer sb = new StringBuffer();
Thread t1 = new Thread(() -> { for (int i = 0; i < 3; i++) { a.acquireUninterruptibly(); sb.append("ping "); b.release(); } });
Thread t2 = new Thread(() -> { for (int i = 0; i < 3; i++) { b.acquireUninterruptibly(); sb.append("pong "); a.release(); } });
t2.start(); t1.start(); t1.join(); t2.join();
System.out.println(sb.toString().trim());`, options: ["pong ping pong ping pong ping", "ping pong ping pong ping pong", "Unpredictable", "Deadlock"], answer: 1, why: "Start order doesn't matter: only t1 can go first because only `a` has a permit." },
      { q: "Which fix does NOT prevent deadlock in dining philosophers?", options: ["Lower-numbered fork first", "Semaphore allowing N-1 philosophers", "Making each fork a fair lock", "tryLock and put the first fork down on failure"], answer: 2, why: "Fairness doesn't break the cycle; everyone can still hold their left fork." },
      { q: "Best lazy, thread-safe singleton in Java?", options: ["Unsynchronized null check", "Initialization-on-demand holder class (or enum)", "synchronized on every get without volatile", "Double-checked locking without volatile"], answer: 1, why: "Class initialisation is lazy and guaranteed thread-safe by the JVM." },
      { q: "In a token bucket limiter, why use System.nanoTime()?", options: ["Higher precision only", "It's monotonic, unaffected by wall-clock adjustments", "It's cheaper than currentTimeMillis", "It returns UTC"], answer: 1, why: "currentTimeMillis can jump with NTP or manual changes." },
      { q: "How do you stop consumers cleanly in a BlockingQueue pipeline?", options: ["System.exit", "Send one poison-pill sentinel per consumer (or interrupt / poll with timeout + flag)", "Thread.stop()", "Clear the queue"], answer: 1, why: "Each consumer exits when it takes the pill." }
    ],
    cheatsheet: {
      table: [
        ["Problem", "Core of the solution"],
        ["Producer–consumer", "`ArrayBlockingQueue` put/take + poison pill"],
        ["Bounded buffer", "`synchronized`, `while (full) wait()`, `notifyAll()`"],
        ["Blocking queue", "Lock + `notFull`/`notEmpty` Conditions, `signal` the other side"],
        ["Odd-even", "shared `next`; wait while parity isn't mine; notifyAll"],
        ["Round robin", "Semaphore per thread; acquire mine, release next"],
        ["FizzBuzz", "one counter, per-thread predicate, notifyAll, exit check in loop"],
        ["Philosophers", "order forks by number or `Semaphore(N-1)`"],
        ["Rate limiter", "tokens = min(cap, tokens + elapsed × rate)"]],
      cards: [
        { title: "Template", items: ["Shared state", "Condition per thread", "Wait in while", "Change state, then signal", "Explicit termination"] },
        { title: "Choose the tool", items: ["Queue exists? BlockingQueue", "Turn-taking? Semaphores", "Multiple conditions? Lock + Conditions", "Counters? atomics"] },
        { title: "Say in interviews", items: ["while, not if", "notifyAll vs Conditions", "Backpressure via bounds", "Ordering breaks cycles", "Test with start gate + timeouts"] }]
    },
    practice: [
      { level: "Easy", q: "Implement producer–consumer with a BlockingQueue, including shutdown.",
        a: ["Use a bounded ArrayBlockingQueue for backpressure.",
          "Producer puts items, then one poison pill per consumer.",
          "Consumers take until they see the pill."],
        code: `BlockingQueue<String> q = new ArrayBlockingQueue<>(3);
String PILL = "__END__";
List<String> processed = Collections.synchronizedList(new ArrayList<>());
Thread producer = new Thread(() -> { try { for (String s : List.of("a", "b", "c", "d", "e")) q.put(s); q.put(PILL); } catch (InterruptedException e) { } });
Thread consumer = new Thread(() -> { try { for (String s; !(s = q.take()).equals(PILL); ) processed.add(s.toUpperCase()); } catch (InterruptedException e) { } });
producer.start(); consumer.start(); producer.join(); consumer.join();
System.out.println(processed);` },
      { level: "Easy", q: "Why do wait/notify need to be called inside synchronized, and why in a loop?",
        a: ["They operate on the monitor's wait set; the caller must own the monitor or IllegalMonitorStateException is thrown.",
          "Holding the lock makes checking the condition and waiting atomic (no lost wake-up).",
          "A loop re-checks the condition after waking: spurious wake-ups, notifyAll waking several threads, or state changed by another thread first."] },
      { level: "Easy", q: "Print 1..10 alternately from two threads using semaphores.",
        a: ["oddTurn starts with 1 permit, evenTurn with 0.",
          "Odd thread: acquire oddTurn, print, release evenTurn; even thread mirrors it.",
          "Each thread loops a fixed number of times, so termination is automatic."],
        code: `Semaphore oddTurn = new Semaphore(1), evenTurn = new Semaphore(0);
StringBuffer out = new StringBuffer();
Thread odd = new Thread(() -> { for (int i = 1; i <= 9; i += 2) { oddTurn.acquireUninterruptibly(); out.append(i).append(' '); evenTurn.release(); } });
Thread even = new Thread(() -> { for (int i = 2; i <= 10; i += 2) { evenTurn.acquireUninterruptibly(); out.append(i).append(' '); oddTurn.release(); } });
even.start(); odd.start(); odd.join(); even.join();
System.out.println(out.toString().trim());` },
      { level: "Medium", q: "Implement a bounded blocking queue with ReentrantLock and Conditions.",
        a: ["State: deque + capacity, guarded by one ReentrantLock.",
          "put: while full await notFull; add; signal notEmpty.",
          "take: while empty await notEmpty; remove; signal notFull.",
          "Unlock in finally; lockInterruptibly for cancellation; awaitNanos for timed offer/poll."],
        code: `class BQ<T> {
    private final Deque<T> d = new ArrayDeque<>(); private final int cap;
    private final ReentrantLock lock = new ReentrantLock(); private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();
    BQ(int cap) { this.cap = cap; }
    void put(T x) throws InterruptedException { lock.lockInterruptibly(); try { while (d.size() == cap) notFull.await(); d.addLast(x); notEmpty.signal(); } finally { lock.unlock(); } }
    T take() throws InterruptedException { lock.lockInterruptibly(); try { while (d.isEmpty()) notEmpty.await(); T x = d.removeFirst(); notFull.signal(); return x; } finally { lock.unlock(); } }
}
BQ<Integer> bq = new BQ<>(4);
AtomicLong sum = new AtomicLong();
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int p = 0; p < 2; p++) pool.submit(() -> { for (int i = 1; i <= 1000; i++) bq.put(i); return null; });
    for (int c = 0; c < 2; c++) pool.submit(() -> { for (int i = 0; i < 1000; i++) sum.addAndGet(bq.take()); return null; });
}
System.out.println("sum " + sum.get() + " (expected " + 2 * 500500 + ")");` },
      { level: "Medium", q: "Print A, B, C in order repeatedly using three threads with a single lock and conditions.",
        a: ["Shared state: whose turn (0, 1, 2), one ReentrantLock, one Condition per thread.",
          "Each thread: lock, while turn != me await my condition, print, turn = (me+1)%3, signal the next thread's condition, unlock.",
          "Targeted signals avoid waking threads that can't proceed."],
        code: `ReentrantLock lock = new ReentrantLock();
Condition[] myTurn = { lock.newCondition(), lock.newCondition(), lock.newCondition() };
int[] turn = {0};
StringBuilder out = new StringBuilder();
List<Thread> ts = new ArrayList<>();
for (int t = 0; t < 3; t++) {
    int me = t;
    ts.add(new Thread(() -> {
        for (int r = 0; r < 3; r++) {
            lock.lock();
            try {
                while (turn[0] != me) myTurn[me].awaitUninterruptibly();
                out.append((char) ('A' + me));
                turn[0] = (me + 1) % 3;
                myTurn[turn[0]].signal();
            } finally { lock.unlock(); }
        }
    }));
}
ts.forEach(Thread::start);
for (Thread t : ts) t.join();
System.out.println(out);` },
      { level: "Medium", q: "Explain dining philosophers and how to avoid deadlock.",
        a: ["N philosophers, N forks between them; eating needs both adjacent forks.",
          "If all take the left fork first they can all hold one and wait forever: circular wait.",
          "Fixes: order resources (lower-numbered first, so one philosopher reverses), limit diners with Semaphore(N-1), tryLock and release on failure, or a central arbiter.",
          "Also consider starvation: fair locks or ticketing if a philosopher rarely eats."] },
      { level: "Medium", q: "Implement a thread-safe lazy singleton and explain why it's safe.",
        a: ["Initialization-on-demand holder: a private static nested class holds the instance.",
          "The JVM initialises a class lazily on first use and guarantees initialisation happens once with proper visibility (class init lock).",
          "No synchronization on the fast path. An enum singleton is equally safe and serialization-proof."],
        code: `class Registry {
    static final AtomicInteger created = new AtomicInteger();
    private Registry() { created.incrementAndGet(); }
    private static class Holder { static final Registry I = new Registry(); }
    static Registry get() { return Holder.I; }
}
try (ExecutorService pool = Executors.newFixedThreadPool(16)) {
    for (int i = 0; i < 1_000; i++) pool.submit(Registry::get);
}
System.out.println("instances created: " + Registry.created.get());` },
      { level: "Hard", q: "Implement multithreaded FizzBuzz (fizz, buzz, fizzbuzz, number threads) for n = 15.",
        a: ["One monitor guards the current number.",
          "Each thread waits while the number isn't its kind and the end hasn't been reached.",
          "On its turn: output, increment, notifyAll (different conditions share the monitor).",
          "When cur > n every thread notifies and exits."],
        code: `int n = 15;
int[] cur = {1};
Object m = new Object();
List<String> out = new ArrayList<>();
BiFunction<IntPredicate, IntFunction<String>, Thread> worker = (mine, say) -> new Thread(() -> {
    synchronized (m) {
        while (true) {
            while (cur[0] <= n && !mine.test(cur[0])) { try { m.wait(); } catch (InterruptedException e) { return; } }
            if (cur[0] > n) { m.notifyAll(); return; }
            out.add(say.apply(cur[0])); cur[0]++; m.notifyAll();
        }
    }
});
List<Thread> ts = List.of(worker.apply(i -> i % 15 == 0, i -> "fizzbuzz"), worker.apply(i -> i % 3 == 0 && i % 5 != 0, i -> "fizz"),
    worker.apply(i -> i % 5 == 0 && i % 3 != 0, i -> "buzz"), worker.apply(i -> i % 3 != 0 && i % 5 != 0, String::valueOf));
ts.forEach(Thread::start);
for (Thread t : ts) t.join();
System.out.println(String.join(",", out));` },
      { level: "Hard", q: "Design and implement a thread-safe token-bucket rate limiter; discuss a lock-free variant.",
        a: ["State: tokens (double) and last refill timestamp (nanoTime); capacity and refill rate.",
          "tryAcquire: refill by elapsed × rate capped at capacity, then take one if available; synchronized keeps refill+take atomic.",
          "Lock-free: store state in an AtomicReference to an immutable record and CAS-loop; or a nanosecond 'next free slot' in an AtomicLong (GCRA).",
          "Per-client limiters in a ConcurrentHashMap with eviction; distributed limits via Redis Lua scripts."],
        code: `record State(double tokens, long last) { }
class LockFreeBucket {
    private final AtomicReference<State> st; private final double cap, perNano;
    LockFreeBucket(double cap, double perSec) { this.cap = cap; this.perNano = perSec / 1e9; st = new AtomicReference<>(new State(cap, System.nanoTime())); }
    boolean tryAcquire() {
        while (true) {
            State s = st.get(); long now = System.nanoTime();
            double t = Math.min(cap, s.tokens() + (now - s.last()) * perNano);
            if (t < 1) return false;
            if (st.compareAndSet(s, new State(t - 1, now))) return true;      // retry if another thread won
        }
    }
}
LockFreeBucket b = new LockFreeBucket(20, 1);
AtomicInteger ok = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 500; i++) pool.submit(() -> { if (b.tryAcquire()) ok.incrementAndGet(); }); }
System.out.println("allowed " + ok.get() + " of 500 (capacity 20)");` },
      { level: "Hard", q: "How would you test a concurrent data structure you just wrote in an interview?",
        steps: ["State invariants: no lost or duplicated items, order where promised, sizes within bounds.",
          "Stress test: many producers/consumers, many iterations, released together by a CountDownLatch start gate.",
          "Assert invariants at the end (sums, counts, sorted per producer) and fail on timeouts instead of hanging.",
          "Vary thread counts and capacities (capacity 1 finds signalling bugs); run repeatedly.",
          "For memory-model subtleties use jcstress; also review for while-around-wait, finally-unlock and interruption."] }
    ],
    recap: [
      "One template: shared state, a condition per thread, wait in a while loop, change state, signal.",
      "Prefer BlockingQueue and semaphores; build from scratch with Lock + two Conditions when asked.",
      "Turn-taking problems (odd-even, ABC, FizzBuzz) need explicit termination checks in the wait loop.",
      "Dining philosophers is lock-order deadlock: fix with ordering, a waiter, or tryLock.",
      "Test with start gates, many iterations, invariants and timeouts."
    ]
  });
})();
