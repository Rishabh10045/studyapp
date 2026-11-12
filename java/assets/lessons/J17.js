/* Lesson J17: Java Memory Model, synchronized & volatile */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Litmus tests run on this course's box: JDK 21, x86-64, 8 cores, 400,000 trials each (two spinning threads per trial).
  var TESTS = {
    sb: { label: "Store buffering", trials: 400000,
      code: {
        plain: "int x = 0, y = 0;                // plain fields\n// Thread 1          // Thread 2\nx = 1;                y = 1;\nr1 = y;               r2 = x;",
        volatile: "volatile int x = 0, y = 0;\n// Thread 1          // Thread 2\nx = 1;                y = 1;\nr1 = y;               r2 = x;",
        synchronized: "int x = 0, y = 0;   // guarded by lock\n// Thread 1                          // Thread 2\nsynchronized (lock) { x = 1; r1 = y; }   synchronized (lock) { y = 1; r2 = x; }" },
      outcomes: ["(0,0)", "(0,1)", "(1,0)", "(1,1)"],
      allowed: { plain: [1, 1, 1, 1], volatile: [0, 1, 1, 1], synchronized: [0, 1, 1, 0] },
      seen: { plain: [29820, 52152, 317874, 154], volatile: [0, 268655, 117092, 14253], synchronized: [0, 400000, 0, 0] },
      why: {
        plain: "**(0,0) really happened** 29,820 times: each CPU parked its write in a store buffer and read the other variable before the write became visible. Nothing in the program creates a happens-before edge, so the JMM allows every outcome.",
        volatile: "Volatile accesses are **sequentially consistent**: all of them fit one global order. In any order, the later write is seen by the read after it, so **(0,0) is impossible** (the JIT emits a fence after volatile stores).",
        synchronized: "The two blocks are mutually exclusive, so one runs entirely first: only (0,1) or (1,0). Here thread 1 always won the race because it was released first." } },
    stop: { label: "Stop flag (visibility)", trials: 1,
      code: {
        plain: "boolean stop;                         // plain\nnew Thread(() -> { long n = 0; while (!stop) n++; }).start();\nThread.sleep(500);\nstop = true;                          // worker may never see this",
        volatile: "volatile boolean stop;\nnew Thread(() -> { long n = 0; while (!stop) n++; }).start();\nThread.sleep(500);\nstop = true;                          // guaranteed to become visible",
        synchronized: "boolean stop;   // read and written only inside synchronized getters/setters\nnew Thread(() -> { long n = 0; while (!isStopped()) n++; }).start();\nThread.sleep(500);\nrequestStop();" },
      outcomes: ["loop ends", "loop runs forever"],
      allowed: { plain: [1, 1], volatile: [1, 0], synchronized: [1, 0] },
      result: { plain: "Still spinning 2 s after `stop = true` (in every run). The JIT hoisted the read out of the loop: `if (!stop) while (true) n++;`, which is legal because no other thread is *required* to be visible.", volatile: "Stopped about 0.1–0.3 ms after the write.", synchronized: "Stops: each `isStopped()` call acquires the same lock the writer released, which creates a happens-before edge (but costs a lock per iteration; `volatile` is the idiomatic fix)." },
      why: {
        plain: "Without happens-before the reader may *never* see the write. This is the classic broken `while (!stop)` loop.",
        volatile: "A volatile write **happens-before** every later read of that variable, and the JIT must re-read it each iteration.",
        synchronized: "Unlock of a monitor happens-before every later lock of the same monitor." } },
    mp: { label: "Publishing data via a flag", trials: 400000,
      code: {
        plain: "int data; boolean ready;              // plain\n// Writer                  // Reader\ndata = 42;                  if (ready)\nready = true;                   use(data);   // may see 0!",
        volatile: "int data; volatile boolean ready;\n// Writer                  // Reader\ndata = 42;                  if (ready)\nready = true;                   use(data);   // guaranteed 42",
        synchronized: "int data; boolean ready;   // both guarded by lock\n// Writer                               // Reader\nsynchronized (lock) { data = 42;        synchronized (lock) {\n                      ready = true; }     if (ready) use(data); }" },
      outcomes: ["not ready", "ready, data = 42", "ready, data = 0"],
      allowed: { plain: [1, 1, 1], volatile: [1, 1, 0], synchronized: [1, 1, 0] },
      seen: { plain: [0, 400000, 0], volatile: [0, 400000, 0], synchronized: [0, 400000, 0] },
      why: {
        plain: "The JMM **allows** `ready, data = 0`: compiler or CPU may reorder the two writes (or the two reads). It was **never observed here** because x86 keeps stores in order; on ARM (AWS Graviton, Apple silicon) or after JIT reordering it can happen. *Passing a test on your laptop proves nothing.*",
        volatile: "Everything the writer did **before** the volatile write to `ready` is visible to a reader that sees `ready == true` (program order + volatile write→read edge). This is safe publication.",
        synchronized: "Same guarantee through unlock → lock of the same monitor." } }
  };
  var MODES = ["plain", "volatile", "synchronized"];
  function sbEdge(m, when) { return m === "plain" ? "-.->|\"no happens-before\"|" : "-->|\"" + (m === "volatile" ? "volatile write → read, " : "unlock → lock, ") + when + "\"|"; }
  function hbDiagram(t, m) {
    var edge = m === "plain" ? "-.->|\"no happens-before\"|" : "-->|\"" + (m === "volatile" ? "volatile write → read" : "unlock → lock") + "\"|";
    var L = ["flowchart LR"];
    if (t === "mp") L.push("  subgraph W[\"Writer\"]", "    a[\"data = 42\"]:::s1 -->|program order| b[\"ready = true\"]:::s1", "  end", "  subgraph R[\"Reader\"]", "    c[\"reads ready == true\"]:::s2 -->|program order| d[\"reads data\"]:::s2", "  end", "  b " + edge + " c");
    else if (t === "stop") L.push("  a[\"main: stop = true\"]:::s1 " + edge + " b[\"worker: reads stop\"]:::s2", "  b -->|program order| c[\"loop exits\"]:::s2");
    else L.push("  subgraph T1[\"Thread 1\"]", "    a[\"x = 1\"]:::s1 -->|program order| b[\"r1 = y\"]:::s1", "  end", "  subgraph T2[\"Thread 2\"]", "    c[\"y = 1\"]:::s2 -->|program order| d[\"r2 = x\"]:::s2", "  end", "  a " + sbEdge(m, "if thread 1 is first") + " d", "  c " + sbEdge(m, "if thread 2 is first") + " b");
    L.push("  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32");
    return L.join("\n");
  }
  function jmmWidget(el, ctx) {
    var s = ctx.state; if (!s.t) { s.t = "sb"; s.m = "plain"; }
    el.innerHTML = "<div class='seg' data-r='t'>" + Object.keys(TESTS).map(function (k) { return "<button type='button' data-v='" + k + "'>" + TESTS[k].label + "</button>"; }).join("") + "</div>" +
      "<div class='seg' data-r='m' style='margin-top:8px'>" + MODES.map(function (k) { return "<button type='button' data-v='" + k + "'>" + k + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='code' style='margin-top:10px'></pre><div class='diagram' data-r='dg'></div><div data-r='tbl'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("t").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.t); });
      q("m").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.m); });
      var T = TESTS[s.t];
      q("code").innerHTML = ctx.H.highlight(T.code[s.m], "java");
      ctx.H.renderDiagram(q("dg"), hbDiagram(s.t, s.m));
      var rows = T.outcomes.map(function (o, i) {
        var ok = T.allowed[s.m][i], obs;
        if (T.seen) { var n = T.seen[s.m][i], pct = n / T.trials * 100; obs = "<div style='display:flex;align-items:center;gap:8px'><div style='height:10px;width:" + Math.max(pct * 1.6, n ? 2 : 0) + "px;background:" + (ok ? "#2563eb" : "#c62828") + ";border-radius:3px'></div>" + n.toLocaleString("en-US") + "</div>"; }
        else obs = (s.m === "plain" ? i === 1 : i === 0) ? "✔ observed" : "";
        return "<tr><td><code>" + ctx.esc(o) + "</code></td><td>" + (ok ? "allowed" : "<b>forbidden</b>") + "</td><td>" + obs + "</td></tr>";
      }).join("");
      q("tbl").innerHTML = "<div class='tablewrap' style='margin-top:10px'><table><thead><tr><th>Outcome</th><th>JMM</th><th>Observed (JDK 21, x86-64" + (T.seen ? ", " + T.trials.toLocaleString("en-US") + " trials" : "") + ")</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
      q("res").innerHTML = ctx.md((T.result ? T.result[s.m] + " " : "") + T.why[s.m]);
    }
    q("t").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.t = b.dataset.v; ctx.save(); draw(); });
    q("m").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.m = b.dataset.v; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Why Java needs a memory model",
      text: "Your code is not executed as written. The **compiler and JIT** reorder, cache values in registers and hoist reads out of loops; **CPUs** buffer stores, reorder memory operations and keep per-core caches. Within one thread none of this is visible (*as-if-serial*). Across threads, it causes three problems: **atomicity** (a read-modify-write gets interleaved), **visibility** (a write is never seen, or seen late) and **ordering** (writes are seen in a different order). The **Java Memory Model** (JLS chapter 17) defines which values a read may return, and gives you tools (`synchronized`, `volatile`, `final`, `java.util.concurrent`) that create guarantees.",
      m: M(["flowchart LR",
        "  subgraph C1[\"Core 1\"]", "    T1[\"Thread A\"]:::s1 --> SB1[\"store buffer\"]:::s4 --> L1[\"L1/L2 cache\"]:::s4", "  end",
        "  subgraph C2[\"Core 2\"]", "    T2[\"Thread B\"]:::s2 --> SB2[\"store buffer\"]:::s4 --> L2[\"L1/L2 cache\"]:::s4", "  end",
        "  L1 --> RAM[\"shared memory (L3, RAM)\"]:::s0", "  L2 --> RAM",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `int[] x = new int[1], y = new int[1];
int bothZero = 0;
for (int round = 0; round < 5_000; round++) {
    x[0] = 0; y[0] = 0;
    int[] r = new int[2];
    Thread a = new Thread(() -> { x[0] = 1; r[0] = y[0]; });
    Thread b = new Thread(() -> { y[0] = 1; r[1] = x[0]; });
    a.start(); b.start(); a.join(); b.join();
    if (r[0] == 0 && r[1] == 0) bothZero++;
}
// In sequential intuition (0,0) is impossible. The JMM allows it; the widget shows ~7% with tighter timing.
System.out.println("rounds where both threads read 0: " + bothZero + " (any number ≥ 0 is legal)");`,
      analogy: "Each core keeps notes on a private notepad and only occasionally copies them to the shared whiteboard. Without rules about *when* notes must be copied, two people can each act on an outdated whiteboard." },
    { title: "Happens-before: the one rule to remember",
      text: "If action A **happens-before** B, then A's effects are **visible** to B and appear ordered before it. If two threads access the same variable, at least one writes, and there is **no happens-before** between them, you have a **data race** and almost anything can be observed. Happens-before is built from a few edges, and it is **transitive**: everything a thread did before releasing a lock or writing a volatile is visible to the thread that next acquires it or reads it.",
      table: [
        ["Edge", "A happens-before B when…"],
        ["Program order", "A comes before B in the same thread"],
        ["Monitor", "Unlock of a monitor → every later lock of the **same** monitor"],
        ["Volatile", "Write of a volatile field → every later read of that field"],
        ["Thread start", "`t.start()` → every action in `t`"],
        ["Thread termination", "Every action in `t` → another thread returning from `t.join()` (or seeing `isAlive() == false`)"],
        ["Interruption", "`t.interrupt()` → `t` detecting the interrupt"],
        ["Final fields", "End of constructor (freeze) → any thread reading the object via a reference obtained afterwards"],
        ["j.u.c.", "Put into a concurrent collection / submit to executor / complete a future → the take / task body / `get`"],
        ["Transitivity", "A → B and B → C ⇒ A → C"]],
      code: `int[] data = new int[1];
Thread t = new Thread(() -> data[0] = 42);           // plain write in t
t.start();
t.join();                                           // join edge: everything t did is visible now
System.out.println("after join: " + data[0]);

Map<String, Integer> plainMap = new HashMap<>();
BlockingQueue<Map<String, Integer>> handoff = new ArrayBlockingQueue<>(1);
Thread producer = new Thread(() -> { plainMap.put("fare", 4850); handoff.add(plainMap); });
producer.start();
System.out.println("received via queue: " + handoff.take());   // queue put → take edge publishes the plain HashMap`,
      points: ["Happens-before is about visibility and ordering, not about time: \"earlier\" on the clock is not enough"] },
    { title: "synchronized: mutual exclusion + visibility",
      text: "Every object has an intrinsic lock (**monitor**). `synchronized (obj) { … }` acquires it, runs the block and releases it, even on exceptions. A `synchronized` instance method locks `this`; a `static synchronized` method locks the `Class` object. It gives **atomicity** (only one thread in any block guarded by that lock) and **visibility** (unlock → lock happens-before). Intrinsic locks are **reentrant**: a thread holding the lock can enter again. Rule: **all** accesses to shared mutable state, reads included, must hold the **same** lock.",
      code: `class Seats {
    private final Object lock = new Object();
    private int available = 100;
    boolean book(int n) {
        synchronized (lock) {                       // check-then-act is atomic
            if (available < n) return false;
            available -= n;
            return true;
        }
    }
    int available() { synchronized (lock) { return available; } }   // reads need the lock too (visibility)
}
Seats seats = new Seats();
AtomicInteger booked = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 1_000; i++) pool.submit(() -> { if (seats.book(1)) booked.incrementAndGet(); });
}
System.out.println("booked " + booked.get() + ", left " + seats.available() + " (never oversold)");`,
      analogy: "A monitor is the single key to a meeting room. Whoever has the key works undisturbed, and the whiteboard they leave behind is exactly what the next key-holder sees." },
    { title: "synchronized pitfalls",
      text: "Locks only work if everyone uses the **same object**. Classic bugs: locking on a new object each time; mixing `synchronized` methods (lock `this`) with blocks on another lock; locking on **boxed values or interned strings** (shared JVM-wide and changing when reassigned); locking on a field that gets reassigned; and exposing `this` as the lock so outside code can hold it. Prefer a `private final Object lock`. Keep critical sections **short**: no I/O or remote calls while holding a lock.",
      code: `class BrokenCounter {
    private int count;
    void inc() { synchronized (new Object()) { count++; } }    // a different lock every call = no lock
    int get() { return count; }
}
class FixedCounter {
    private final Object lock = new Object();
    private int count;
    void inc() { synchronized (lock) { count++; } }
    int get() { synchronized (lock) { return count; } }
}
BrokenCounter broken = new BrokenCounter(); FixedCounter fixed = new FixedCounter();
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int t = 0; t < 4; t++) pool.submit(() -> { for (int i = 0; i < 100_000; i++) { broken.inc(); fixed.inc(); } });
}
System.out.println("expected 400000 | broken " + broken.get() + " | fixed " + fixed.get());
Integer boxedLock = 127;
System.out.println("Integer.valueOf(127) is cached and shared JVM-wide: " + (boxedLock == Integer.valueOf(127)) + " → never lock on it");`,
      points: ["Locking on a reassigned field (`lock = new Object()`) splits threads across two locks", "Holding a lock while calling unknown code (callbacks, listeners) invites deadlock (J26)"] },
    { title: "volatile: visibility and ordering, not atomicity",
      text: "A `volatile` field is always read from and written to memory as seen by all threads: a write **happens-before** every later read, the JIT cannot hoist or cache it, and the accesses can't be reordered with the surrounding code across it. Volatile reads and writes of `long`/`double` are atomic. But a compound action like `count++` is still **read, add, write**: two threads can read the same value. For counters use `AtomicInteger`/`LongAdder` (J19) or a lock.",
      code: `class Stats { volatile int volatileCount; final AtomicInteger atomicCount = new AtomicInteger(); }
Stats s = new Stats();
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int t = 0; t < 4; t++) pool.submit(() -> {
        for (int i = 0; i < 100_000; i++) { s.volatileCount++; s.atomicCount.incrementAndGet(); }
    });
}
System.out.println("expected 400000 | volatile++ " + s.volatileCount + " | AtomicInteger " + s.atomicCount.get());`,
      points: ["`volatile` makes the *reference* visible, not the contents of the object or array it points to"] },
    { title: "When volatile is the right tool",
      text: "Use `volatile` when **one thread writes** (or writes don't depend on the current value) and others read: **stop flags**, **status fields**, and **publishing an immutable snapshot** through a volatile reference (copy-on-write config, routing tables). The writer builds a new immutable object and swaps the reference; readers grab the reference once and see a fully built object. If the new value depends on the old (check-then-act, increment) you need a lock or CAS (`AtomicReference.updateAndGet`).",
      code: `record FareConfig(int markupPercent, Set<String> blockedRoutes) {
    FareConfig { blockedRoutes = Set.copyOf(blockedRoutes); }
}
class ConfigHolder {
    private volatile FareConfig current = new FareConfig(5, Set.of());
    FareConfig get() { return current; }                         // lock-free read of a consistent snapshot
    void reload(FareConfig next) { current = next; }             // single writer swaps the whole object
}
ConfigHolder holder = new ConfigHolder();
Thread reloader = new Thread(() -> holder.reload(new FareConfig(7, Set.of("DEL-BOM"))));
reloader.start(); reloader.join();
FareConfig snapshot = holder.get();                              // read once, use consistently
System.out.println("markup " + snapshot.markupPercent() + "%, blocked " + snapshot.blockedRoutes());

AtomicReference<FareConfig> ref = new AtomicReference<>(snapshot);   // when updates depend on the old value
ref.updateAndGet(c -> new FareConfig(c.markupPercent() + 1, c.blockedRoutes()));
System.out.println("after CAS update: " + ref.get().markupPercent() + "%");` },
    { title: "Reordering and safe publication",
      text: "Publishing an object means making a reference to it visible to another thread. **Unsafe publication** (assigning to a plain shared field) lets another thread see the reference **before** the constructor's writes: fields at default values, a half-built object. **Safe publication** idioms all create a happens-before edge: (1) initialise from a **static initializer**; (2) store the reference in a **volatile** field or `AtomicReference`; (3) store it in a **final** field of a properly constructed object; (4) store it in a field guarded by a **lock**; (5) put it in a **concurrent collection** or hand it over via an executor, queue or future.",
      table: [
        ["Idiom", "Why it is safe"],
        ["`static final Foo FOO = new Foo();`", "Class initialization is done under a JVM lock"],
        ["`volatile Foo foo;` / `AtomicReference<Foo>`", "Volatile write → read"],
        ["`final Foo foo;` in a constructor", "Final field freeze"],
        ["Guarded by `synchronized`", "Unlock → lock"],
        ["`ConcurrentHashMap.put`, `BlockingQueue.put`, `executor.submit`, `future.complete`", "Documented j.u.c. memory-consistency effects"]],
      code: `ConcurrentMap<String, List<String>> routes = new ConcurrentHashMap<>();
Thread loader = new Thread(() -> {
    List<String> fresh = new ArrayList<>(List.of("DEL-BOM", "BLR-GOI"));   // built privately
    routes.put("IN", Collections.unmodifiableList(fresh));                  // safely published by the CHM
});
loader.start(); loader.join();
System.out.println("reader sees " + routes.get("IN"));` },
    { title: "Double-checked locking",
      text: "Lazy singletons often use double-checked locking: check without the lock, then lock and check again. **Without `volatile` it's broken**: `instance = new Fare()` can be reordered so the reference is published before the constructor's writes, and the unlocked first check can return a half-built object. With `volatile` (Java 5+) it's correct. Simpler and just as lazy: the **holder class idiom** (JVM class initialisation is lazy and thread-safe) or an **enum** singleton. In Spring, beans are singletons already.",
      code: `class Registry {
    private static volatile Registry instance;                 // volatile is essential
    final Map<String, String> airlines;
    private Registry() { airlines = Map.of("6E", "IndiGo", "AI", "Air India"); }
    static Registry get() {
        Registry r = instance;                                  // one volatile read on the fast path
        if (r == null) {
            synchronized (Registry.class) {
                r = instance;
                if (r == null) instance = r = new Registry();
            }
        }
        return r;
    }
}
class LazyHolder {
    private LazyHolder() { System.out.println("LazyHolder created on first use"); }
    private static class Holder { static final LazyHolder INSTANCE = new LazyHolder(); }   // JVM guarantees once + safe publication
    static LazyHolder get() { return Holder.INSTANCE; }
}
Set<Registry> seen = ConcurrentHashMap.newKeySet();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 100; i++) pool.submit(() -> seen.add(Registry.get())); }
System.out.println("distinct instances: " + seen.size() + ", " + Registry.get().airlines.get("6E"));
System.out.println("holder: " + (LazyHolder.get() == LazyHolder.get()));`,
      points: ["Prefer `enum Singleton { INSTANCE; }` when you need serialization/reflection safety"] },
    { title: "final fields and immutability",
      text: "The JMM gives **final fields** a special guarantee: once the constructor finishes, any thread that obtains a reference to the object (even through a data race) sees the final fields, and everything reachable through them as of the end of the constructor, correctly initialized. That makes **immutable objects** thread-safe without any synchronization. Recipe: all fields `private final`; no setters; defensive copies of mutable inputs and outputs (`List.copyOf`); don't let `this` escape; make the class `final` (or a **record**).",
      code: `record Itinerary(String pnr, List<String> legs) {
    Itinerary { legs = List.copyOf(legs); }                    // defensive copy: callers can't mutate it later
}
List<String> input = new ArrayList<>(List.of("DEL-BOM"));
Itinerary it = new Itinerary("PNR42", input);
input.add("BOM-GOI");                                          // has no effect on the record
List<String> seenByThreads = Collections.synchronizedList(new ArrayList<>());
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int i = 0; i < 4; i++) pool.submit(() -> seenByThreads.add(it.legs().toString()));
}
System.out.println(it + " | all threads saw " + new HashSet<>(seenByThreads));
try { it.legs().add("X"); } catch (UnsupportedOperationException e) { System.out.println("legs are unmodifiable"); }`,
      analogy: "An immutable object is a printed ticket: anyone can read it at the same time and nobody needs to coordinate, because nobody can change it." },
    { title: "Don't let this escape during construction",
      text: "If a constructor publishes `this` (registers a listener, starts a thread, stores itself in a static map) another thread can see the object **before the constructor finishes**, when even final fields may still be unset. Fix: keep constructors free of publication; use a **static factory** that constructs first and registers afterwards. Starting a thread in a constructor is the same trap: create it there if you must, but `start()` it from a separate method.",
      code: `List<Object> registry = new CopyOnWriteArrayList<>();
class Listener {
    private final String name;
    private Listener(String name) { this.name = name; }                       // no publication inside
    static Listener create(String name, List<Object> reg) {
        Listener l = new Listener(name);                                    // fully constructed…
        reg.add(l);                                                          // …then published
        return l;
    }
    @Override public String toString() { return "Listener(" + name + ")"; }
}
Listener.create("fare-updates", registry);
System.out.println(registry);` },
    { title: "Word tearing, 64-bit values and choosing a tool",
      text: "Reads and writes of references and of primitives up to 32 bits are atomic. Non-volatile `long` and `double` **may** be split into two 32-bit writes (JLS 17.7), so a reader could see half of each; on 64-bit JVMs this doesn't happen in practice, but `volatile` or atomics make it guaranteed. Then pick the simplest tool that is correct: **confinement** (don't share), **immutability**, **volatile** for flags and snapshot references, **atomics** for single-variable updates, **locks** for invariants spanning several variables, and **concurrent collections** instead of hand-rolled locking.",
      table: [
        ["Need", "Tool"],
        ["Don't share at all", "Thread confinement: locals, per-request objects, ThreadLocal"],
        ["Share read-only data", "Immutable objects, records, `List.copyOf`"],
        ["Flag / latest snapshot", "`volatile` reference to an immutable object"],
        ["Counter / single-variable update", "`AtomicInteger`, `LongAdder`, `AtomicReference.updateAndGet`"],
        ["Invariant across several fields", "`synchronized` or `ReentrantLock` (J18)"],
        ["Shared maps, queues", "`ConcurrentHashMap`, `BlockingQueue`"]],
      code: `class Window {
    private final Object lock = new Object();
    private int low = 0, high = 10;                                  // invariant: low <= high
    void shift(int d) { synchronized (lock) { low += d; high += d; } }
    String read() { synchronized (lock) { return low + ".." + high; } }
}
Window w = new Window();
Set<String> invalid = ConcurrentHashMap.newKeySet();
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int t = 0; t < 2; t++) pool.submit(() -> { for (int i = 0; i < 50_000; i++) w.shift(1); });
    for (int t = 0; t < 2; t++) pool.submit(() -> { for (int i = 0; i < 50_000; i++) { String[] p = w.read().split("\\\\.\\\\."); if (Integer.parseInt(p[1]) - Integer.parseInt(p[0]) != 10) invalid.add(w.read()); } });
}
System.out.println("final window " + w.read() + ", invariant violations seen: " + invalid.size());`,
      points: ["Two volatile fields can't keep a multi-field invariant: a reader may see one updated and not the other"] }
  ];

  H.registerLesson({
    code: "J17",
    summary: "What the Java Memory Model guarantees and why you need it: compiler and CPU reordering, store buffers and caches; atomicity, visibility and ordering; the happens-before rules; `synchronized` for mutual exclusion and visibility (and its pitfalls); `volatile` for visibility and ordering but not atomicity, and where it is the right tool; safe publication idioms; double-checked locking and the holder idiom; final-field semantics and immutable objects; `this` escape; 64-bit tearing; and how to choose between confinement, immutability, volatile, atomics and locks.",
    slides: SLIDES,
    widget: { heading: "Interactive: litmus tests on a real JVM", caption: "Pick a classic memory-model test and a modifier. The table shows what the JMM allows and what actually happened on JDK 21 (x86-64, 8 cores). The diagram shows whether a happens-before edge exists. Plain fields really produced `(0,0)` and a loop that never stops.", render: jmmWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Shutdown flags", "Consumers and schedulers loop on `while (running)`: without `volatile` they may never stop on deploy."],
      ["Hot-reloaded config", "Feature flags, rate limits and routing tables are swapped as immutable snapshots behind a volatile/AtomicReference."],
      ["Lazy caches and singletons", "Hand-written lazy init (DCL) in older code; prefer holder idiom, `ConcurrentHashMap.computeIfAbsent` or Spring beans."],
      ["Spring beans", "Singleton beans are shared by all request threads: mutable fields in a @Service are a data race."],
      ["Flaky tests", "Tests that pass on x86 laptops and fail on ARM CI (Graviton, Apple silicon) usually have a missing happens-before."],
      ["DTOs and events", "Records and immutable value objects passed between threads and over queues need no locking."]
    ],
    pitfalls: [
      "Assuming a write is visible to other threads just because it happened earlier",
      "`volatile int count; count++` as a thread-safe counter",
      "Reading shared state without the lock that guards writes",
      "Locking on a new object, a reassigned field, a boxed value or a string literal",
      "Double-checked locking without `volatile`",
      "Publishing `this` from a constructor (listeners, threads)",
      "Mutable fields in Spring singleton beans",
      "Two volatile fields used to maintain one invariant",
      "Calling slow I/O or alien code while holding a lock"
    ],
    quiz: [
      { q: "What three problems does the memory model address?", options: ["Speed, memory, CPU", "Atomicity, visibility, ordering", "Deadlock, livelock, starvation", "Allocation, GC, finalization"], answer: 1, why: "Interleaved read-modify-writes (atomicity), writes not seen (visibility), and writes seen in a different order (ordering)." },
      { q: "Thread A writes a plain field then calls `t.start()` on thread B. B reads the field. Is the value guaranteed visible?", options: ["Yes, start() is a happens-before edge", "No, the field must be volatile", "Only on x86", "Only if B sleeps first"], answer: 0, why: "Everything before `t.start()` happens-before every action in the started thread. Similarly everything in a thread happens-before `join()` returning." },
      { q: "What does this print, and is it reliable?", code: `class Counter { volatile int n; }
Counter c = new Counter();
Thread a = new Thread(() -> { for (int i = 0; i < 100_000; i++) c.n++; });
Thread b = new Thread(() -> { for (int i = 0; i < 100_000; i++) c.n++; });
a.start(); b.start(); a.join(); b.join();
System.out.println(c.n == 200_000 ? "200000" : "less than 200000");`, options: ["Always 200000", "Usually less than 200000: volatile doesn't make ++ atomic", "A compile error", "Always less, exactly 100000"], answer: 1, why: "Each `++` is a volatile read followed by a volatile write; two threads can read the same value and one increment is lost." },
      { q: "Why is double-checked locking broken without `volatile`?", options: ["synchronized is too slow", "The reference can become visible before the constructor's writes, so the unlocked check may return a partly built object", "Two instances are always created", "It deadlocks"], answer: 1, why: "Without a happens-before edge between the writer's constructor and the reader's unlocked read, reordering is allowed. `volatile` adds the edge." },
      { q: "Which statement about `synchronized` is true?", options: ["It only provides mutual exclusion, not visibility", "Unlock of a monitor happens-before a later lock of the same monitor, so it provides visibility too", "Intrinsic locks are not reentrant", "A static synchronized method locks `this`"], answer: 1, why: "It gives both atomicity and visibility, it is reentrant, and static synchronized methods lock the Class object." },
      { q: "A reader thread loops `while (!stop) n++;` and `stop` is a plain boolean set by another thread. What can happen?", options: ["It always stops within microseconds", "It may never stop, because the JIT can hoist the read out of the loop", "It throws IllegalMonitorStateException", "It stops only on ARM"], answer: 1, why: "With no happens-before, the JIT may read `stop` once. This was observed: the loop still ran 2 s after the write. Make it volatile." },
      { q: "Which is NOT a safe publication idiom?", options: ["Storing the reference in a volatile field", "Initialising it in a static initializer", "Assigning it to a plain non-final shared field", "Putting it into a ConcurrentHashMap"], answer: 2, why: "A plain field has no happens-before edge, so other threads may see the reference before the object's fields." },
      { q: "Why are immutable objects thread-safe without locks?", options: ["The JVM locks them automatically", "Final-field semantics guarantee they're fully visible once constructed, and their state never changes", "They live on the stack", "Because they're always cached"], answer: 1, why: "Nothing changes after construction, and the final-field freeze guarantees every thread sees the constructed values (if `this` didn't escape)." },
      { q: "A class keeps `low` and `high` with invariant `low <= high`. Is marking both `volatile` enough?", options: ["Yes", "No: a reader can see one updated and the other not, and updates aren't atomic together; use a lock or an immutable pair behind one reference", "Yes if they're longs", "Only with final"], answer: 1, why: "Volatile works per variable. Invariants across variables need atomic updates of both: lock, or swap a single immutable object." }
    ],
    cheatsheet: {
      table: [
        ["Situation", "Use"],
        ["Stop / status flag", "`volatile boolean running`"],
        ["Swap a config snapshot", "`volatile Config cfg` or `AtomicReference<Config>` with immutable Config"],
        ["Check-then-act, multi-field invariant", "`synchronized (lock) { … }` on a `private final Object lock`"],
        ["Counter", "`AtomicInteger` / `LongAdder` (J19)"],
        ["Lazy singleton", "Holder class idiom, enum, or DCL with `volatile`"],
        ["Share data read-only", "Records / final fields + `List.copyOf`"],
        ["Hand data to another thread", "BlockingQueue, executor submit, CompletableFuture, ConcurrentHashMap"]],
      cards: [
        { title: "Happens-before edges", items: ["Program order", "Unlock → lock (same monitor)", "Volatile write → read", "start() / join()", "Final field freeze", "j.u.c. hand-offs", "Transitive"] },
        { title: "volatile", items: ["Visibility + ordering", "No atomic ++", "Atomic long/double", "Per variable only"] },
        { title: "Say in interviews", items: ["Data race = no happens-before", "synchronized = exclusion + visibility", "DCL needs volatile", "Safe publication idioms", "Immutable = free thread safety"] }]
    },
    practice: [
      { level: "Easy", q: "What is the Java Memory Model and why is it needed?",
        a: ["It's the part of the JLS (chapter 17) that defines which values a read of a shared variable may see in a multi-threaded program.",
          "Needed because compilers, the JIT and CPUs reorder operations and cache values (registers, store buffers, per-core caches) for performance.",
          "It defines happens-before: if a write happens-before a read, the read sees it. Otherwise there is a data race.",
          "It gives portable guarantees across x86, ARM and different JVMs through synchronized, volatile, final and j.u.c. classes."] },
      { level: "Easy", q: "What does `volatile` guarantee and what doesn't it?",
        a: ["Visibility: a write is visible to every later read of the field; reads aren't cached or hoisted.",
          "Ordering: writes before a volatile write can't move after it, and reads after a volatile read can't move before it, so it can publish other data.",
          "Atomic reads/writes of long and double.",
          "Not atomicity of compound actions (`count++`, check-then-act). Use atomics or locks for those."],
        code: `class Flag { volatile boolean stop; }
Flag f = new Flag();
Thread worker = new Thread(() -> { long n = 0; while (!f.stop) n++; System.out.println("worker saw stop"); });
worker.start();
Thread.sleep(100);
f.stop = true;
worker.join(1000);
System.out.println("worker alive: " + worker.isAlive());` },
      { level: "Easy", q: "synchronized vs volatile?",
        a: ["synchronized: mutual exclusion and visibility; can make compound actions and multi-variable invariants atomic; can block.",
          "volatile: visibility and ordering for one variable; never blocks; no atomicity of compound actions.",
          "Use volatile for flags and immutable snapshot references written by one thread; synchronized (or locks/atomics) when updates depend on current state."] },
      { level: "Medium", q: "Explain happens-before with examples.",
        a: ["A happens-before B means A's effects are visible to B and ordered before it.",
          "Program order within a thread; unlock → later lock of the same monitor; volatile write → later read; `start()` → thread body; thread body → `join()` returns.",
          "Final-field freeze at end of construction; j.u.c. hand-offs (queue put → take, submit → task, complete → get).",
          "Transitive: writes before a volatile write are visible after the matching volatile read.",
          "Two conflicting accesses without a happens-before chain form a data race."] },
      { level: "Medium", q: "Write a thread-safe lazy singleton. Discuss the options.",
        a: ["Eager `static final` instance: simplest; class init is thread-safe.",
          "Holder class idiom: lazy (inner class loads on first `get`) and thread-safe with no synchronization cost.",
          "Enum singleton: also handles serialization and reflection attacks.",
          "Double-checked locking: needs `volatile`; read the field into a local to avoid a second volatile read.",
          "`synchronized` getter: correct but locks on every call."],
        code: `enum Clock { INSTANCE; long now() { return 1_700_000_000_000L; } }
class Holder {
    private Holder() { }
    private static class Lazy { static final Holder I = new Holder(); }
    static Holder get() { return Lazy.I; }
}
System.out.println(Clock.INSTANCE.now() + " " + (Holder.get() == Holder.get()));` },
      { level: "Medium", q: "What is safe publication? List the ways to do it.",
        a: ["Making an object visible to other threads such that they also see its fully initialized state.",
          "Static initializer; volatile field or AtomicReference; final field of a properly constructed object; field guarded by a lock; concurrent collection or another j.u.c. hand-off.",
          "Immutable objects with final fields are safe even if published through a race, as long as `this` didn't escape the constructor.",
          "Unsafe: assigning to a plain shared field."] },
      { level: "Medium", q: "How do you make a class immutable, and why does it help with concurrency?",
        a: ["Make the class final (or a record); all fields private final; no setters.",
          "Defensively copy mutable inputs in the constructor and mutable outputs in getters (`List.copyOf`).",
          "Don't let `this` escape during construction.",
          "Benefits: no synchronization needed, freely shareable and cacheable, safe as map keys, and final-field semantics guarantee visibility."] },
      { level: "Hard", q: "A test passes on developer laptops but fails intermittently on ARM CI machines. It publishes results through a plain boolean `done` flag. Explain and fix.",
        a: ["x86 has a strong memory model (stores aren't reordered with other stores), which hides missing happens-before edges; ARM allows more reordering.",
          "The reader can see `done == true` before the result fields are visible, or the JIT can hoist the flag read.",
          "Fix: make `done` volatile (write results first, then the flag), or better use a CountDownLatch / CompletableFuture whose get/await provides the edge.",
          "Lesson: memory-model bugs can't be ruled out by testing on one machine; reason with happens-before. Tools like jcstress test these explicitly."] },
      { level: "Hard", q: "Review this Spring service for thread-safety issues and fix it.",
        qcode: `@Service
class RateLimiter {
    private Map<String, Integer> counts = new HashMap<>();
    private boolean enabled = true;
    boolean allow(String user) {
        if (!enabled) return true;
        int c = counts.getOrDefault(user, 0);
        if (c >= 100) return false;
        counts.put(user, c + 1);
        return true;
    }
    void disable() { enabled = false; }
}`, qNoCompile: true,
        a: ["The bean is a singleton shared by all request threads.",
          "`HashMap` accessed concurrently: corrupt structure and lost updates.",
          "get-then-put is check-then-act: two requests can both see 99 and both pass.",
          "`enabled` is a plain field: `disable()` may never become visible.",
          "Fix: `ConcurrentHashMap` with an atomic `compute`/`merge`, the check inside the atomic update; `volatile boolean enabled`; and in production a proper rate limiter (Bucket4j, Redis)."],
        code: `class RateLimiter {
    private final ConcurrentHashMap<String, Integer> counts = new ConcurrentHashMap<>();
    private volatile boolean enabled = true;
    boolean allow(String user) {
        if (!enabled) return true;
        boolean[] ok = new boolean[1];
        counts.compute(user, (k, c) -> { int n = c == null ? 0 : c; ok[0] = n < 100; return ok[0] ? n + 1 : n; });
        return ok[0];
    }
    void disable() { enabled = false; }
}
RateLimiter rl = new RateLimiter();
AtomicInteger allowed = new AtomicInteger();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 1_000; i++) pool.submit(() -> { if (rl.allow("u1")) allowed.incrementAndGet(); });
}
System.out.println("allowed " + allowed.get() + " of 1000 (limit 100)");` },
      { level: "Hard", q: "Explain why `this` escaping from a constructor breaks final-field guarantees, and how to design around it.",
        a: ["Final-field guarantees apply to threads that obtain the reference after the constructor finishes (the freeze).",
          "If the constructor registers `this` with a listener list, starts a thread, or stores it in a static field, another thread can use the object before construction completes and see default values, even in final fields.",
          "Inner classes and lambdas capturing `this` created in the constructor also leak it.",
          "Design: private constructor + static factory that constructs then registers; start threads in a separate `start()` method; or let a framework (Spring lifecycle callbacks) do registration after construction."] }
    ],
    recap: [
      "Compilers and CPUs reorder and cache; the JMM defines what other threads may see, through happens-before.",
      "Without a happens-before edge between a write and a read you have a data race: stale values, reordered writes, loops that never end.",
      "`synchronized` gives exclusion and visibility on the same lock; guard reads too, and lock on a private final object.",
      "`volatile` gives visibility and ordering for one variable, not atomic compound actions; ideal for flags and immutable snapshots.",
      "Publish safely (static init, volatile, final, locks, j.u.c.), use the holder idiom or volatile DCL, and prefer immutable objects."
    ]
  });
})();
