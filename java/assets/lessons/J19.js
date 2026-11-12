/* Lesson J19: Atomics, CAS, LongAdder, VarHandle */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // ABA on a Treiber stack: states printed by Java 21 replaying the same interleaving
  // with AtomicReference and with AtomicStampedReference.
  var ABA = {
    ref: [
      { who: "T1", act: "pop() starts: reads top = A and A.next = B, then is descheduled", stack: ["A", "B", "C"], note: "T1 plans `compareAndSet(A, B)`." },
      { who: "T2", act: "pop() → A", stack: ["B", "C"], note: "" },
      { who: "T2", act: "pop() → B", stack: ["C"], note: "B is now out of the stack (its slot may be reused)." },
      { who: "T2", act: "push(A): the same node A is reused, A.next = C", stack: ["A", "C"], note: "The top is A again: **A → B → A** from T1's point of view." },
      { who: "T1", act: "compareAndSet(A, B) → true", stack: ["B", "C"], bad: true, note: "**ABA bug:** the CAS only compares references, sees A and succeeds. The stack now starts at **B, which was already popped**, and A is lost." }
    ],
    stamped: [
      { who: "T1", act: "pop() starts: reads top = A, stamp 0, next = B", stack: ["A", "B", "C"], stamp: 0, note: "T1 plans `compareAndSet(A, B, 0, 1)`." },
      { who: "T2", act: "pop() → A", stack: ["B", "C"], stamp: 1, note: "Every successful CAS bumps the stamp." },
      { who: "T2", act: "pop() → B", stack: ["C"], stamp: 2, note: "" },
      { who: "T2", act: "push(A): same node reused", stack: ["A", "C"], stamp: 3, note: "Reference is A again, but the stamp is 3." },
      { who: "T1", act: "compareAndSet(A, B, 0, 1) → false", stack: ["A", "C"], stamp: 3, note: "**Detected:** reference matches but the stamp doesn't, so T1 retries with fresh values and the stack stays correct." }
    ]
  };
  function atomicWidget(el, ctx) {
    var s = ctx.state; if (!s.mode) { s.mode = "cas"; s.k = "ref"; s.i = 0; s.c = null; }
    el.innerHTML = "<div class='seg' data-r='mode'><button type='button' data-v='cas'>CAS retry loop</button><button type='button' data-v='aba'>ABA problem</button></div><div data-r='body' style='margin-top:10px'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function freshCas() { return { value: 0, t: { 1: { pc: 0, v: null, done: false, retries: 0 }, 2: { pc: 0, v: null, done: false, retries: 0 } }, log: [] }; }
    var SRC = ["int v = count.get();                      // step A: read", "if (count.compareAndSet(v, v + 1))         // step B: CAS", "    return v + 1;                          // success", "// else: someone changed it, loop and retry"];
    function stepCas(id) {
      var C = s.c, T = C.t[id];
      if (T.done) return;
      if (T.pc === 0) { T.v = C.value; T.pc = 1; C.log.push("T" + id + " reads " + T.v); }
      else {
        if (C.value === T.v) { C.value = T.v + 1; T.done = true; C.log.push("T" + id + " CAS(" + T.v + " → " + (T.v + 1) + ") ✔ value is " + C.value); }
        else { T.retries++; T.pc = 0; C.log.push("T" + id + " CAS(" + T.v + " → " + (T.v + 1) + ") ✘ value is " + C.value + ", retry"); }
      }
    }
    function drawCas() {
      if (!s.c) s.c = freshCas();
      var C = s.c;
      q("body").innerHTML = "<p>" + ctx.md("`AtomicInteger.incrementAndGet()` is a **compare-and-set loop**: read, then atomically *set to v+1 only if the value is still v*. Interleave the two threads any way you like: unlike `count++` in J15, an update can never be lost; a thread that loses the race just retries.") + "</p>" +
        "<pre class='code'>" + ctx.H.highlight(SRC.join("\n"), "java") + "</pre>" +
        "<div class='btnrow'><button type='button' class='btn primary' data-s='1'" + (C.t[1].done ? " disabled" : "") + ">step T1</button><button type='button' class='btn primary' data-s='2'" + (C.t[2].done ? " disabled" : "") + ">step T2</button><button type='button' class='btn' data-s='0'>reset</button></div>" +
        "<div class='tablewrap' style='margin-top:10px'><table><thead><tr><th></th><th>next step</th><th>local v</th><th>retries</th></tr></thead><tbody>" +
        [1, 2].map(function (i) { var T = C.t[i]; return "<tr><td><b>T" + i + "</b></td><td>" + (T.done ? "done" : T.pc === 0 ? "A: read" : "B: CAS") + "</td><td>" + (T.v === null ? "—" : T.v) + "</td><td>" + T.retries + "</td></tr>"; }).join("") +
        "</tbody></table></div>" +
        "<div class='result'>" + ctx.md("Shared value **" + C.value + "**. " + (C.t[1].done && C.t[2].done ? "Both increments landed: **2**, whatever the interleaving. Under heavy contention many threads keep retrying, which is why `LongAdder` spreads the counter over cells." : "Try: T1 read, T2 read, T2 CAS, T1 CAS.")) + "</div>" +
        "<pre class='code'>" + ctx.esc(C.log.slice(-6).join("\n") || "Click step T1 / step T2.") + "</pre>";
      q("body").querySelectorAll("[data-s]").forEach(function (b) { b.addEventListener("click", function () { var id = +b.dataset.s; if (id) stepCas(id); else s.c = freshCas(); ctx.save(); draw(); }); });
    }
    function drawAba() {
      var steps = ABA[s.k], cur = steps[Math.min(s.i, steps.length - 1)];
      var L = ["flowchart LR", "  top([\"top" + (cur.stamp !== undefined ? ", stamp " + cur.stamp : "") + "\"]):::s0"];
      cur.stack.forEach(function (n, i) { L.push("  n" + i + "[\"" + n + "\"]:::" + (cur.bad && n === "B" ? "bad" : "s1")); });
      L.push("  top --> n0"); for (var i = 1; i < cur.stack.length; i++) L.push("  n" + (i - 1) + " --> n" + i);
      L.push("  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef bad fill:#fdecea,stroke:#c62828");
      q("body").innerHTML = "<div class='seg' data-r='k'><button type='button' data-v='ref'>AtomicReference</button><button type='button' data-v='stamped'>AtomicStampedReference</button></div>" +
        "<div class='btnrow' style='margin-top:8px'><button type='button' class='btn' data-n='-1'>◀ back</button><button type='button' class='btn primary' data-n='1'>next step ▶</button><span style='margin-left:8px'>step " + (s.i + 1) + " / " + steps.length + "</span></div>" +
        "<div class='diagram' data-r='dg'></div>" +
        "<div class='result'>" + ctx.md("**" + cur.who + "**: " + cur.act + ". " + cur.note) + "</div>" +
        "<pre class='code'>" + ctx.esc(steps.slice(0, s.i + 1).map(function (x) { return x.who + ": " + x.act + "   stack " + x.stack.join("→") + (x.stamp !== undefined ? " (stamp " + x.stamp + ")" : ""); }).join("\n")) + "</pre>";
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("k").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.k); b.addEventListener("click", function () { s.k = b.dataset.v; s.i = 0; ctx.save(); draw(); }); });
      q("body").querySelectorAll("[data-n]").forEach(function (b) { b.addEventListener("click", function () { s.i = Math.max(0, Math.min(steps.length - 1, s.i + +b.dataset.n)); ctx.save(); draw(); }); });
    }
    function draw() {
      q("mode").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.mode); });
      if (s.mode === "cas") drawCas(); else drawAba();
    }
    q("mode").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.mode = b.dataset.v; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Compare-and-set: lock-free updates",
      text: "Modern CPUs offer an atomic **compare-and-swap** instruction (`lock cmpxchg` on x86, LL/SC or CAS on ARM): *if memory still holds the expected value, replace it with the new value, atomically; tell me whether it worked.* Java exposes it as `compareAndSet(expected, newValue)`. Building on it, an update becomes an **optimistic retry loop**: read, compute, CAS; if another thread got there first, re-read and try again. No thread ever blocks, so there are no deadlocks and no context switches, and the atomic variables have **volatile** memory semantics.",
      m: M(["flowchart LR",
        "  R[\"v = value.get()\"]:::s1 --> C[\"next = f(v)\"]:::s1 --> S{\"compareAndSet(v, next)\"}",
        "  S -->|true| D[\"done\"]:::s2",
        "  S -->|false: someone changed it| R",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `AtomicInteger seats = new AtomicInteger(10);
System.out.println("CAS(10 → 9): " + seats.compareAndSet(10, 9) + ", now " + seats.get());
System.out.println("CAS(10 → 8): " + seats.compareAndSet(10, 8) + " (expected value is stale), still " + seats.get());

AtomicInteger counter = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int t = 0; t < 4; t++) pool.submit(() -> { for (int i = 0; i < 100_000; i++) counter.incrementAndGet(); });
}
System.out.println("4 × 100000 increments → " + counter.get() + " (count++ on an int lost updates in J15/J17)");`,
      analogy: "CAS is editing a shared document with \"only save if nobody changed it since I opened it\". If the save is refused, you reopen, redo your small edit and save again." },
    { title: "The atomic classes",
      text: "`java.util.concurrent.atomic` wraps single variables: `AtomicInteger`, `AtomicLong`, `AtomicBoolean`, `AtomicReference<V>`, array versions (`AtomicIntegerArray`, …, each element atomic), field updaters, `LongAdder`/`LongAccumulator`, and stamped/markable references. They share a vocabulary: `get`/`set` (volatile), `getAndX` returns the **old** value, `xAndGet` returns the **new** one, `compareAndSet`, and functional `updateAndGet` / `accumulateAndGet`.",
      table: [
        ["Method", "Returns", "Example"],
        ["`incrementAndGet()` / `getAndIncrement()`", "new / old", "sequence numbers"],
        ["`addAndGet(d)` / `getAndAdd(d)`", "new / old", "byte counters"],
        ["`compareAndSet(exp, new)`", "boolean", "state transitions"],
        ["`getAndSet(new)`", "old", "swap a buffer, read-and-reset a metric"],
        ["`updateAndGet(f)` / `getAndUpdate(f)`", "new / old", "`x -> Math.max(x, 0)`"],
        ["`accumulateAndGet(x, op)`", "new", "`max.accumulateAndGet(price, Math::max)`"],
        ["`setRelease`, `getAcquire`, `getPlain`, `setPlain`", "weaker memory modes", "expert tuning (VarHandle modes)"]],
      code: `AtomicLong bookingSeq = new AtomicLong(1000);
System.out.println("getAndIncrement → " + bookingSeq.getAndIncrement() + ", incrementAndGet → " + bookingSeq.incrementAndGet());
AtomicInteger maxFare = new AtomicInteger(Integer.MIN_VALUE);
for (int fare : List.of(4850, 5300, 4999)) maxFare.accumulateAndGet(fare, Math::max);
System.out.println("max fare " + maxFare.get());
AtomicIntegerArray perHour = new AtomicIntegerArray(24);
perHour.incrementAndGet(9); perHour.incrementAndGet(9); perHour.addAndGet(18, 5);
System.out.println("bookings at 9h " + perHour.get(9) + ", 18h " + perHour.get(18));
AtomicLong bytes = new AtomicLong(512);
System.out.println("read-and-reset metric: " + bytes.getAndSet(0) + " then " + bytes.get());` },
    { title: "updateAndGet: the function may run more than once",
      text: "`updateAndGet(f)` is the CAS loop packaged for you: it calls `f` with the current value and tries to CAS the result in, **re-running `f` on failure**. So `f` must be a **pure function**: no side effects (logging, sending, incrementing other counters), quick, and based only on its argument. Side effects inside will happen a surprising number of times under contention.",
      code: `AtomicInteger value = new AtomicInteger();
LongAdder functionCalls = new LongAdder();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int t = 0; t < 8; t++) pool.submit(() -> {
        for (int i = 0; i < 50_000; i++) value.updateAndGet(v -> { functionCalls.increment(); return v + 1; });
    });
}
System.out.println("updates applied: " + value.get());
System.out.println("function invocations: " + functionCalls.sum() + " (extra calls = CAS retries under contention)");`,
      points: ["Same rule for `accumulateAndGet`, `getAndUpdate` and `ConcurrentHashMap.compute`-style lambdas when they can retry"] },
    { title: "AtomicReference to immutable state",
      text: "An atomic variable covers **one** value. To update **several fields together** without a lock, put them in an **immutable** object (a record) and CAS the reference: build the next state from the current one, then `compareAndSet(current, next)` (or `updateAndGet`). Readers always see a consistent snapshot. This is the lock-free version of J17's volatile snapshot, and it works for updates that depend on the old state.",
      code: `record FareStats(int count, int min, int max) {
    FareStats add(int fare) { return new FareStats(count + 1, Math.min(min, fare), Math.max(max, fare)); }
}
AtomicReference<FareStats> stats = new AtomicReference<>(new FareStats(0, Integer.MAX_VALUE, Integer.MIN_VALUE));
int[] fares = {4850, 5300, 4999, 3100, 6100, 4200};
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int rep = 0; rep < 1_000; rep++) for (int f : fares) pool.submit(() -> stats.updateAndGet(s -> s.add(f)));
}
System.out.println(stats.get() + " (count, min and max always consistent with each other)");` },
    { title: "AtomicBoolean and one-time transitions",
      text: "`compareAndSet(false, true)` lets exactly **one** thread win a transition: run initialisation once, make `close()` idempotent, send a notification only once, or claim a job. Losers learn immediately that someone else won and can skip or wait. For state machines with several states use an `AtomicReference<State>` (an enum) and CAS from the expected state to the next one.",
      code: `AtomicBoolean closed = new AtomicBoolean(false);
AtomicInteger closeActions = new AtomicInteger();
Runnable close = () -> { if (closed.compareAndSet(false, true)) closeActions.incrementAndGet(); };   // only the first caller closes
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 100; i++) pool.submit(close); }
System.out.println("close() called 100 times, resources released " + closeActions.get() + " time(s)");

enum BookingState { HELD, CONFIRMED, CANCELLED }
AtomicReference<BookingState> state = new AtomicReference<>(BookingState.HELD);
boolean confirmed = state.compareAndSet(BookingState.HELD, BookingState.CONFIRMED);
boolean cancelled = state.compareAndSet(BookingState.HELD, BookingState.CANCELLED);    // too late: no longer HELD
System.out.println("confirm " + confirmed + ", cancel " + cancelled + ", final " + state.get());` },
    { title: "Contention and LongAdder",
      text: "When many threads hammer one atomic variable, the cache line holding it bounces between cores and CAS failures multiply. **`LongAdder`** (Java 8) spreads the count over several **cells** (one per contending thread, roughly); `increment()` touches a cell, and `sum()` adds the base and all cells. Writes scale almost linearly; the trade-offs are more memory and a `sum()` that is **not an atomic snapshot** while updates are in flight. Use it for statistics and metrics; use `AtomicLong` when you need the exact current value or compare-and-set (sequence numbers, IDs). `LongAccumulator` generalises it (max, min, any associative op).",
      m: M(["flowchart TB",
        "  T1[\"thread 1\"]:::s1 --> C1[\"cell 1\"]:::s4",
        "  T2[\"thread 2\"]:::s1 --> C2[\"cell 2\"]:::s4",
        "  T3[\"thread 3\"]:::s1 --> C3[\"cell 3\"]:::s4",
        "  T4[\"thread 4\"]:::s1 --> B[\"base\"]:::s4",
        "  C1 --> S[\"sum() = base + cells\"]:::s2",
        "  C2 --> S",
        "  C3 --> S",
        "  B --> S",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `int threads = 8, perThread = 2_000_000;
AtomicLong atomic = new AtomicLong();
LongAdder adder = new LongAdder();
for (String kind : List.of("AtomicLong", "LongAdder", "AtomicLong", "LongAdder")) {
    long t0 = System.nanoTime();
    try (ExecutorService pool = Executors.newFixedThreadPool(threads)) {
        for (int t = 0; t < threads; t++) pool.submit(() -> {
            for (int i = 0; i < perThread; i++) { if (kind.equals("AtomicLong")) atomic.incrementAndGet(); else adder.increment(); }
        });
    }
    System.out.println(kind + ": " + (System.nanoTime() - t0) / 1_000_000 + " ms");
}
System.out.println("totals " + atomic.get() + " / " + adder.sum());
LongAccumulator maxLatency = new LongAccumulator(Math::max, 0);
List.of(120L, 340L, 95L).forEach(maxLatency::accumulate);
System.out.println("max latency " + maxLatency.get() + " ms");`,
      points: ["Timings vary; on this 8-core box LongAdder was several times faster under full contention"] },
    { title: "The ABA problem",
      text: "CAS checks that the value **is** the expected one, not that it **never changed**. If a value goes A → B → A between your read and your CAS, the CAS succeeds on stale assumptions. It bites lock-free structures that **reuse nodes** (pools, off-heap memory): the widget shows a stack corrupted this way. Fixes: **`AtomicStampedReference`** (reference + int version, both compared), `AtomicMarkableReference` (reference + boolean), or never reusing nodes. In Java, GC makes classic ABA rarer: a freshly allocated node can't have the same identity as one still referenced.",
      code: `AtomicStampedReference<String> price = new AtomicStampedReference<>("A:4850", 0);
int[] holder = new int[1];
String seen = price.get(holder);
int seenStamp = holder[0];                                                  // T1 reads value and version
price.compareAndSet("A:4850", "B:5100", 0, 1);                              // T2: A → B
price.compareAndSet("B:5100", "A:4850", 1, 2);                              // T2: B → A again
AtomicReference<String> plain = new AtomicReference<>("A:4850");
String plainSeen = plain.get();
plain.set("B:5100"); plain.set("A:4850");                                   // same A → B → A on a plain AtomicReference
System.out.println("plain CAS after A→B→A: " + plain.compareAndSet(plainSeen, "C:4000") + " (cannot tell anything happened)");
System.out.println("stamped CAS with stamp " + seenStamp + ": " + price.compareAndSet(seen, "C:4000", seenStamp, seenStamp + 1) + ", current stamp " + price.getStamp());`,
      points: ["Note: `compareAndSet` compares references with `==`, so use the exact object you read, not an equal string or boxed value"] },
    { title: "Lock-free data structures",
      text: "Combining CAS loops gives **non-blocking** structures. A **Treiber stack** pushes by CAS-ing the top from `old` to a new node pointing at `old`. The JDK's `ConcurrentLinkedQueue` (Michael-Scott queue), `ConcurrentLinkedDeque` and `ConcurrentSkipListMap` are lock-free. Progress guarantees: **lock-free** means some thread always makes progress (no deadlock; individual threads can retry indefinitely); **wait-free** means every thread finishes in a bounded number of steps (`getAndAdd` on x86 is wait-free). Writing your own is hard: prefer the JDK's.",
      code: `class TreiberStack<T> {
    private record Node<T>(T value, Node<T> next) { }
    private final AtomicReference<Node<T>> top = new AtomicReference<>();
    void push(T v) {
        Node<T> old;
        do { old = top.get(); } while (!top.compareAndSet(old, new Node<>(v, old)));
    }
    T pop() {
        Node<T> old;
        do { old = top.get(); if (old == null) return null; } while (!top.compareAndSet(old, old.next()));
        return old.value();
    }
}
TreiberStack<Integer> stack = new TreiberStack<>();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 10_000; i++) { int v = i; pool.submit(() -> stack.push(v)); } }
Set<Integer> popped = new HashSet<>();
for (Integer v = stack.pop(); v != null; v = stack.pop()) popped.add(v);
System.out.println("pushed 10000 concurrently, popped " + popped.size() + " distinct values");` },
    { title: "VarHandle and field updaters",
      text: "Atomic classes are separate objects. When you have **millions of objects** with one atomically updated field, or need atomic ops on **array elements** or existing fields, use a **`VarHandle`** (Java 9): a typed handle to a field or array element with `compareAndSet`, `getAndAdd` and explicit memory modes: **plain**, **opaque** (no tearing, eventually visible), **acquire/release** (one-way ordering, cheaper than volatile) and **volatile**. The older `AtomicIntegerFieldUpdater` does the same for `volatile` fields. These are what the JDK's own concurrent classes are built on.",
      code: `class Seat {
    volatile int state;                                 // 0 = free, 1 = held: no extra AtomicInteger object per seat
    static final java.lang.invoke.VarHandle STATE;
    static {
        try { STATE = java.lang.invoke.MethodHandles.lookup().findVarHandle(Seat.class, "state", int.class); }
        catch (ReflectiveOperationException e) { throw new ExceptionInInitializerError(e); }
    }
    boolean hold() { return STATE.compareAndSet(this, 0, 1); }
}
Seat seat = new Seat();
AtomicInteger winners = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 50; i++) pool.submit(() -> { if (seat.hold()) winners.incrementAndGet(); }); }
System.out.println("threads that got the seat: " + winners.get() + ", state " + seat.state);

java.lang.invoke.VarHandle ints = java.lang.invoke.MethodHandles.arrayElementVarHandle(int[].class);
int[] buckets = new int[4];
ints.getAndAdd(buckets, 2, 5);
ints.setRelease(buckets, 0, 7);
System.out.println(Arrays.toString(buckets) + " acquire-read " + (int) ints.getAcquire(buckets, 0));`,
      points: ["`VarHandle` and `MethodHandles` live in `java.lang.invoke`"] },
    { title: "Atomics or locks?",
      text: "Atomics shine for **single-variable** state: counters, sequences, flags, max/min, one reference to an immutable snapshot. They are non-blocking and scale well at low to moderate contention. Use a **lock** when an invariant spans several mutable variables or collections, when the critical section is long, or when threads must **wait** for a condition (atomics can only spin). Under very high contention on one variable, CAS loops waste CPU retrying; partition (`LongAdder`, striping) or batch updates.",
      table: [
        ["Situation", "Best fit"],
        ["Hit counter, metrics", "`LongAdder`"],
        ["Unique IDs / sequence", "`AtomicLong.incrementAndGet()`"],
        ["Run once / close once", "`AtomicBoolean.compareAndSet(false, true)`"],
        ["Several fields updated together", "`AtomicReference<ImmutableRecord>` or a lock"],
        ["Multiple collections kept consistent", "Lock"],
        ["Wait until something happens", "Lock + Condition, or a j.u.c. synchronizer (J20, J21)"],
        ["Per-key counts", "`ConcurrentHashMap<K, LongAdder>` with `computeIfAbsent(k, x -> new LongAdder()).increment()`"]],
      code: `ConcurrentHashMap<String, LongAdder> searchesByRoute = new ConcurrentHashMap<>();
List<String> routes = List.of("DEL-BOM", "BLR-GOI", "DEL-BOM", "DEL-BOM", "BLR-GOI");
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int i = 0; i < 1_000; i++) for (String r : routes) pool.submit(() -> searchesByRoute.computeIfAbsent(r, k -> new LongAdder()).increment());
}
TreeMap<String, Long> totals = new TreeMap<>();
searchesByRoute.forEach((k, v) -> totals.put(k, v.sum()));
System.out.println(totals);` },
    { title: "Putting it together: a lock-free rate limiter",
      text: "A fixed-window rate limiter needs *window start* and *count* to change together, so keep them in an immutable record behind an `AtomicReference` and update with a CAS loop: if the window expired, start a new one with count 1; if under the limit, increment; otherwise reject without changing state. The function is pure, so retries are harmless. In production use a tested library (Resilience4j, Bucket4j) and, across instances, Redis.",
      code: `record Window(long startMillis, int count) { }
class RateLimiter {
    private final int limit; private final long windowMillis;
    private final AtomicReference<Window> window;
    RateLimiter(int limit, long windowMillis, long now) { this.limit = limit; this.windowMillis = windowMillis; window = new AtomicReference<>(new Window(now, 0)); }
    boolean tryAcquire(long now) {
        while (true) {
            Window w = window.get();
            Window next = now - w.startMillis() >= windowMillis ? new Window(now, 1)
                        : w.count() < limit ? new Window(w.startMillis(), w.count() + 1)
                        : null;
            if (next == null) return false;                        // over the limit: no state change
            if (window.compareAndSet(w, next)) return true;        // else another thread updated it: retry
        }
    }
}
RateLimiter rl = new RateLimiter(100, 1_000, 0);
AtomicInteger allowed = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 1_000; i++) pool.submit(() -> { if (rl.tryAcquire(500)) allowed.incrementAndGet(); }); }
System.out.println("window 1: allowed " + allowed.get() + " of 1000; next window: " + rl.tryAcquire(1_500));` }
  ];

  H.registerLesson({
    code: "J19",
    summary: "Lock-free programming with atomics: compare-and-set and the optimistic retry loop, the `java.util.concurrent.atomic` classes and their method vocabulary, why `updateAndGet` functions must be pure, `AtomicReference` to immutable state for multi-field updates, `AtomicBoolean` one-time transitions and CAS state machines, contention and `LongAdder`/`LongAccumulator`, the ABA problem and stamped references, lock-free structures (Treiber stack) and progress guarantees, `VarHandle` memory modes and field updaters, and when to choose atomics or locks.",
    slides: SLIDES,
    widget: { heading: "Interactive: CAS retries and the ABA problem", caption: "**CAS retry loop**: interleave two `incrementAndGet` calls step by step; a lost race causes a retry, never a lost update. **ABA problem**: replay an interleaving on a lock-free stack; the states are the ones Java 21 printed for `AtomicReference` (corrupted) and `AtomicStampedReference` (detected).", render: atomicWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Metrics", "Request counts and latency histograms use `LongAdder` (Micrometer, Dropwizard) because many threads write and few read."],
      ["IDs and sequences", "In-process sequence numbers, correlation counters and round-robin load-balancer indices use `AtomicLong`/`AtomicInteger`."],
      ["Idempotent lifecycle", "`AtomicBoolean` guards `start()`/`close()` and \"send once\" notifications."],
      ["Status transitions", "Booking/payment state machines CAS from the expected state, rejecting late or duplicate transitions."],
      ["Snapshots", "Circuit breakers and rate limiters keep their state in an immutable record behind an `AtomicReference`."],
      ["Libraries", "Netty, Caffeine, Disruptor and the JDK's concurrent collections are built on CAS and VarHandles."]
    ],
    pitfalls: [
      "`if (a.get() == x) a.set(y)`: a check-then-act race; use `compareAndSet`",
      "Side effects inside `updateAndGet`/`accumulateAndGet` (they can run many times)",
      "Two atomics for one invariant (each is atomic, the pair isn't)",
      "Using `LongAdder.sum()` as an exact snapshot or for IDs",
      "Spinning CAS loops under extreme contention",
      "`compareAndSet` on `AtomicReference<Integer>`/`<String>` with an equal but different object",
      "Ignoring ABA when nodes or objects are reused",
      "Mutating the object inside an `AtomicReference` instead of replacing it",
      "Writing custom lock-free structures when the JDK has one"
    ],
    quiz: [
      { q: "What does `compareAndSet(expected, update)` do?", options: ["Sets the value and returns the old one", "Atomically sets the value to update only if the current value equals expected, returning whether it did", "Compares two atomics", "Locks the variable"], answer: 1, why: "It's a single atomic hardware operation; the caller retries on false." },
      { q: "What does this print?", code: `AtomicInteger a = new AtomicInteger(5);
int x = a.getAndIncrement();
int y = a.incrementAndGet();
System.out.println(x + " " + y + " " + a.get());`, options: ["5 7 7", "6 7 7", "5 6 7", "6 6 7"], answer: 0, why: "`getAndIncrement` returns the old value 5 (now 6); `incrementAndGet` returns the new value 7." },
      { q: "Why must the function passed to `updateAndGet` be side-effect free?", options: ["It runs on another thread", "It may be invoked several times when the CAS fails under contention", "It's cached", "Java forbids lambdas with side effects"], answer: 1, why: "Each failed CAS re-runs the function with the fresh value." },
      { q: "When is `LongAdder` a better choice than `AtomicLong`?", options: ["For unique ID generation", "For a heavily contended counter that is read rarely, such as metrics", "When you need compareAndSet", "Never"], answer: 1, why: "It spreads updates over cells; `sum()` isn't an atomic snapshot and there's no CAS, so not for IDs." },
      { q: "What is the ABA problem?", options: ["Deadlock between two atomics", "A CAS succeeds because the value returned to the expected one, even though it changed in between", "Two threads reading the same value", "A lost update with volatile"], answer: 1, why: "Fix with a version stamp (`AtomicStampedReference`) or by not reusing objects." },
      { q: "You need to update `count`, `min` and `max` together without locks. What do you do?", options: ["Three AtomicIntegers", "An immutable record in an AtomicReference updated with a CAS loop/updateAndGet", "Mark them volatile", "LongAdder"], answer: 1, why: "Three atomics are individually atomic but a reader can see them out of sync; one reference to an immutable snapshot is atomic as a whole." },
      { q: "What does \"lock-free\" guarantee?", options: ["Every thread finishes in bounded steps", "Some thread always makes progress; no thread can block others indefinitely by holding a lock", "No CPU is used", "No retries"], answer: 1, why: "Wait-free is the stronger guarantee that every thread finishes in bounded steps." },
      { q: "Is this thread-safe?", code: `AtomicInteger stock = new AtomicInteger(1);
// called concurrently by many threads
boolean buy() {
    if (stock.get() > 0) { stock.decrementAndGet(); return true; }
    return false;
}`, noCompile: true, options: ["Yes, AtomicInteger is thread-safe", "No: check-then-act; two threads can both see 1 and oversell", "Yes because decrement is atomic", "Only with volatile"], answer: 1, why: "Each call is atomic, the combination isn't. Use a CAS loop: `stock.getAndUpdate(s -> s > 0 ? s - 1 : s) > 0`." },
      { q: "Why would you use a VarHandle or AtomicIntegerFieldUpdater instead of an AtomicInteger field?", options: ["They're simpler", "To do atomic operations on a plain volatile field or array element without an extra object per instance, and to choose memory modes", "They avoid the JMM", "They lock"], answer: 1, why: "Useful for millions of objects or low-level library code; otherwise atomics are clearer." }
    ],
    cheatsheet: {
      table: [
        ["Task", "Code"],
        ["Counter (exact)", "`AtomicLong id = new AtomicLong(); id.incrementAndGet()`"],
        ["Counter (hot, metrics)", "`LongAdder hits; hits.increment(); hits.sum()`"],
        ["Conditional update", "`stock.getAndUpdate(s -> s > 0 ? s - 1 : s) > 0`"],
        ["Max so far", "`max.accumulateAndGet(v, Math::max)`"],
        ["Once only", "`if (done.compareAndSet(false, true)) { … }`"],
        ["Multi-field state", "`ref.updateAndGet(s -> s.with(…))` on an immutable record"],
        ["ABA-safe", "`AtomicStampedReference.compareAndSet(ref, next, stamp, stamp + 1)`"],
        ["Per-key counts", "`map.computeIfAbsent(k, x -> new LongAdder()).increment()`"]],
      cards: [
        { title: "CAS loop", items: ["Read", "Compute (pure)", "compareAndSet", "Retry on failure", "Volatile semantics"] },
        { title: "Watch out", items: ["Check-then-act still races", "Pure update functions", "One atomic = one variable", "ABA with reused nodes", "Spinning under contention"] },
        { title: "Say in interviews", items: ["CAS = optimistic concurrency", "getAndX old / xAndGet new", "LongAdder cells", "AtomicStampedReference for ABA", "Lock-free vs wait-free"] }]
    },
    practice: [
      { level: "Easy", q: "What is CAS and how do atomic classes use it?",
        a: ["Compare-and-swap: a CPU instruction that atomically replaces a memory value only if it still equals an expected value, reporting success.",
          "Atomic classes expose it as `compareAndSet` and build operations like `incrementAndGet` as a retry loop: read, compute, CAS, retry on failure (or a single `lock xadd` instruction for getAndAdd on x86).",
          "It's non-blocking: no lock, no context switch, no deadlock.",
          "Atomic variables have volatile read/write semantics."] },
      { level: "Easy", q: "Make this ticket counter thread-safe without locks and explain why the original is broken.",
        qcode: `class Tickets {
    private int sold;
    int sell() { return ++sold; }
}`, qNoCompile: true,
        a: ["`++sold` is read-modify-write; two threads can read the same value and both write the same result (lost update, duplicate numbers).",
          "Replace with an AtomicInteger and `incrementAndGet()`, which is atomic and returns a unique new value per call."],
        code: `class Tickets {
    private final AtomicInteger sold = new AtomicInteger();
    int sell() { return sold.incrementAndGet(); }
}
Tickets t = new Tickets();
Set<Integer> numbers = ConcurrentHashMap.newKeySet();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 10_000; i++) pool.submit(() -> numbers.add(t.sell())); }
System.out.println("distinct ticket numbers: " + numbers.size());` },
      { level: "Easy", q: "AtomicLong vs LongAdder?",
        a: ["AtomicLong: one variable; exact current value; supports compareAndSet and getAndIncrement for IDs; degrades under heavy contention.",
          "LongAdder: base + array of cells; increments go to different cells, so it scales under contention.",
          "`sum()` adds them up and isn't an atomic snapshot if updates are concurrent; no CAS; more memory.",
          "Rule: metrics/statistics → LongAdder; IDs, sequences, conditional updates → AtomicLong."] },
      { level: "Medium", q: "Implement a thread-safe 'decrement stock only if positive' with atomics.",
        a: ["A check followed by a decrement is a race even with an AtomicInteger.",
          "Use a CAS loop or `getAndUpdate` so the check and the update happen atomically.",
          "Return value tells the caller whether it got an item."],
        code: `AtomicInteger stock = new AtomicInteger(5);
Supplier<Boolean> buy = () -> stock.getAndUpdate(s -> s > 0 ? s - 1 : s) > 0;
AtomicInteger sold = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 100; i++) pool.submit(() -> { if (buy.get()) sold.incrementAndGet(); }); }
System.out.println("sold " + sold.get() + ", stock " + stock.get());` },
      { level: "Medium", q: "Explain the ABA problem and how to solve it in Java.",
        a: ["Thread 1 reads A and plans CAS(A → X). Meanwhile others change A → B → A. Thread 1's CAS succeeds although the structure changed.",
          "Dangerous for lock-free structures with node reuse: e.g. a stack's top is A again but A.next is now different, so the pop installs a stale next.",
          "`AtomicStampedReference` pairs the reference with a version number incremented on every change; CAS compares both.",
          "`AtomicMarkableReference` pairs it with a boolean (used for logical deletion).",
          "With GC, allocating new nodes instead of reusing avoids most ABA."] },
      { level: "Medium", q: "How can you update several related fields atomically without a lock?",
        a: ["Put them in an immutable object (record) and hold it in an `AtomicReference`.",
          "Update with `updateAndGet(old -> old.with(...))` or a CAS loop that builds a new object from the current one.",
          "Readers get a consistent snapshot with a single `get()`.",
          "Keep objects small and the function pure; for large state or high write contention a lock may be better."] },
      { level: "Medium", q: "What do lock-free and wait-free mean? Give JDK examples.",
        a: ["Blocking: a thread holding a lock can stop everyone (descheduled, slow).",
          "Lock-free: at any time some thread completes its operation; individual threads may retry repeatedly. Examples: ConcurrentLinkedQueue, Treiber stack, CAS loops.",
          "Wait-free: every thread completes in a bounded number of its own steps. Example: `getAndAdd` implemented with an atomic fetch-and-add instruction.",
          "Obstruction-free: progress only if a thread runs in isolation (weakest)."] },
      { level: "Hard", q: "Design a thread-safe in-process ID generator producing unique, roughly time-ordered 64-bit IDs (like Snowflake).",
        a: ["Layout: timestamp (ms since custom epoch) | node id | sequence within the millisecond.",
          "Keep the last (timestamp, sequence) as a single long or immutable record in an atomic; on each call compute next: same ms → sequence + 1; new ms → sequence 0; sequence overflow → wait for the next ms.",
          "Use a CAS loop so concurrent callers never produce duplicates; clock going backwards → wait or use the last timestamp.",
          "Node id must be unique across instances (config, coordinator)."],
        code: `class IdGen {
    private final long node;
    private final AtomicLong last = new AtomicLong();            // packs (millis << 12) | sequence
    IdGen(long node) { this.node = node; }
    long next(long nowMillis) {
        while (true) {
            long prev = last.get();
            long prevMs = prev >>> 12, seq = prev & 0xFFF;
            long ms = Math.max(nowMillis, prevMs);
            long next = ms == prevMs ? (seq == 0xFFF ? ((ms + 1) << 12) : prev + 1) : (ms << 12);
            if (last.compareAndSet(prev, next)) return ((next >>> 12) << 22) | (node << 12) | (next & 0xFFF);
        }
    }
}
IdGen gen = new IdGen(7);
Set<Long> ids = ConcurrentHashMap.newKeySet();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 20_000; i++) pool.submit(() -> ids.add(gen.next(1_000))); }
System.out.println("unique ids: " + ids.size());` },
      { level: "Hard", q: "A metrics counter based on AtomicLong shows high CPU in a profiler under load. Why, and what do you change?",
        a: ["All cores CAS the same cache line; failed CASes retry and the line ping-pongs between cores (cache coherence traffic). Throughput falls as threads increase.",
          "Switch to LongAdder (striped cells, contention-adaptive) or per-thread counters aggregated on read.",
          "Reduce frequency: batch increments locally and add periodically.",
          "Beware false sharing in custom per-thread arrays (pad or use @Contended in JDK internals)."] },
      { level: "Hard", q: "Implement a lock-free circuit breaker state (CLOSED → OPEN after N failures, OPEN → HALF_OPEN after a cooldown) using atomics.",
        steps: ["Model the state as an immutable record `(State state, int failures, long openedAt)` in an `AtomicReference`.",
          "onFailure: `updateAndGet(s -> s.state == CLOSED ? (s.failures + 1 >= N ? open(now) : s.withFailures(+1)) : s)`.",
          "allowRequest: if OPEN and cooldown passed, CAS OPEN → HALF_OPEN so exactly one trial request wins; others are rejected.",
          "onSuccess in HALF_OPEN: CAS to CLOSED with failures 0; onFailure in HALF_OPEN: back to OPEN with a new openedAt.",
          "Keep update functions pure, pass the clock in for testability; production systems use Resilience4j."] }
    ],
    recap: [
      "CAS = atomic compare-and-set; updates become optimistic retry loops with no blocking.",
      "Atomic classes have volatile semantics; getAndX returns old, xAndGet new; update functions must be pure.",
      "One atomic covers one variable: use an AtomicReference to an immutable record for multi-field state.",
      "LongAdder beats AtomicLong for hot counters; AtomicLong for IDs and CAS.",
      "Beware check-then-act and ABA (stamped references); use locks when you must wait or protect several structures."
    ]
  });
})();
