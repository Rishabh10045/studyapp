/* Lesson F29: Thread-safe Singleton */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  // step: [from, to, message, note, status]   participants: T1, F (static field), O (object memory), T2
  var MODES = [
    { k: "naive", name: "Naive lazy", code: "if (instance == null) instance = new Config();\nreturn instance;", steps: [
      ["T1", "F", "read instance → null", "", ""],
      ["T2", "F", "read instance → null", "both passed the check", "warn"],
      ["T1", "O", "new Config() #1", "", ""],
      ["T1", "F", "instance = #1", "", ""],
      ["T2", "O", "new Config() #2", "", ""],
      ["T2", "F", "instance = #2 (overwrites #1)", "TWO instances: T1 keeps using #1, everyone else #2", "bad"]] },
    { k: "sync", name: "synchronized getter", code: "static synchronized Config get() {\n    if (instance == null) instance = new Config();\n    return instance;\n}", steps: [
      ["T1", "F", "lock Config.class, read null", "", ""],
      ["T2", "F", "wants lock → BLOCKED", "", "warn"],
      ["T1", "O", "new Config(), fully constructed", "", ""],
      ["T1", "F", "instance = obj, unlock", "unlock happens-before T2's lock", ""],
      ["T2", "F", "lock, read obj (non-null), unlock", "correct, but EVERY later call also locks", "ok"]] },
    { k: "dclbad", name: "DCL without volatile", code: "if (instance == null) {\n    synchronized (Config.class) {\n        if (instance == null) instance = new Config();\n    }\n}\nreturn instance;   // instance NOT volatile", steps: [
      ["T1", "F", "read null → lock → read null", "", ""],
      ["T1", "O", "allocate memory (fields still 0/null)", "", ""],
      ["T1", "F", "instance = ref   (reordered BEFORE the constructor!)", "allowed: no happens-before for T2's unsynchronised read", "warn"],
      ["T2", "F", "first check: instance != null → skip lock", "", ""],
      ["T2", "O", "read config.url → null", "T2 uses a PARTIALLY CONSTRUCTED object", "bad"],
      ["T1", "O", "constructor runs: url = …", "too late for T2", "bad"]] },
    { k: "dclok", name: "DCL + volatile", code: "private static volatile Config instance;\n...\nConfig local = instance;\nif (local == null) { synchronized (Config.class) { ... } }\nreturn local;", steps: [
      ["T1", "F", "read null → lock → read null", "", ""],
      ["T1", "O", "new Config(): constructor completes", "", ""],
      ["T1", "F", "volatile write instance = obj", "volatile write can't be reordered before the constructor's writes", ""],
      ["T2", "F", "volatile read → obj", "volatile write happens-before this read", ""],
      ["T2", "O", "read config.url → \"jdbc:…\"", "fully constructed; later calls take no lock", "ok"]] },
    { k: "holder", name: "Holder idiom / enum", code: "private static class Holder { static final Config I = new Config(); }\nstatic Config get() { return Holder.I; }", steps: [
      ["T1", "F", "get() → first use of Holder → JVM initialises Holder", "class init runs under a JVM lock, once", ""],
      ["T2", "F", "get() → Holder being initialised → waits", "", "warn"],
      ["T1", "O", "Holder.I = new Config() completes", "", ""],
      ["T2", "O", "sees Holder initialised → reads Holder.I", "class-init completion happens-before every use", ""],
      ["T2", "F", "later calls: plain static read, no locks", "lazy, thread-safe, no volatile needed", "ok"]] }
  ];
  function dclWidget(el, ctx) {
    var s = ctx.state; if (s.m === undefined) { s.m = 2; s.i = 0; }
    el.innerHTML = "<p>" + ctx.md("Step through two threads calling `Config.get()` at the same time under each implementation. **F** is the static `instance` field, **Obj** is the object's memory.") + "</p>" +
      "<div class='seg' data-r='m'></div><pre class='code' data-r='code'></pre>" +
      "<div class='btnrow'><button type='button' class='btn' data-r='prev'>◀ back</button><button type='button' class='btn primary' data-r='next'>step ▶</button></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var md = MODES[s.m], st = md.steps.slice(0, s.i + 1), cur = st[st.length - 1];
      q("m").innerHTML = MODES.map(function (x, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.m ? "on" : "") + "'>" + x.name + "</button>"; }).join("");
      q("code").textContent = md.code;
      q("prev").disabled = s.i === 0; q("next").disabled = s.i === md.steps.length - 1;
      var L = ["sequenceDiagram", "  participant T1", "  participant F as static instance", "  participant O as Obj memory", "  participant T2"];
      st.forEach(function (x) {
        L.push("  " + x[0] + "->>" + x[1] + ": " + x[2].replace(/[;#]/g, " "));
        if (x[3]) L.push("  Note over " + (x[0] === "T1" ? "T1,F" : "O,T2") + ": " + x[3].replace(/[;#]/g, " "));
      });
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var res = q("res"), last = s.i === md.steps.length - 1;
      res.className = "result " + (cur[4] === "bad" ? "err" : cur[4] === "ok" ? "ok" : cur[4] === "warn" ? "warn" : "");
      res.innerHTML = "<div class='out'>Step " + (s.i + 1) + " / " + md.steps.length + (last ? (cur[4] === "bad" ? ": BROKEN" : ": SAFE") : "") + "</div><p>" + ctx.md(cur[3] || cur[2]) + "</p>";
    }
    q("m").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b) return; s.m = Number(b.getAttribute("data-i")); s.i = 0; ctx.save(); draw(); });
    q("next").addEventListener("click", function () { s.i++; ctx.save(); draw(); });
    q("prev").addEventListener("click", function () { s.i--; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Why this question keeps coming up",
      text: "\"Write a thread-safe singleton\" is a favourite follow-up because a 5-line answer exposes whether you understand **races**, **visibility**, **instruction reordering** and **class initialisation**. F05 introduced the Singleton ladder; this lesson goes under the hood with the Java Memory Model, shows each failure happening, and covers what interviewers ask next: lazy initialisation of expensive resources, init failures, per-key singletons, testing, and why a singleton's **state** must be thread-safe too.",
      table: [
        ["Implementation", "Lazy?", "Thread-safe?", "Cost per call", "Verdict"],
        ["Eager `static final`", "No (at class init)", "Yes", "None", "Best when creation is cheap"],
        ["Naive lazy (`if null → new`)", "Yes", "**No**: two instances, unsafe publication", "None", "Broken"],
        ["`synchronized` getter", "Yes", "Yes", "Lock on every call", "Correct, slower under contention"],
        ["Double-checked locking, no `volatile`", "Yes", "**No**: partially constructed object", "Mostly none", "Broken"],
        ["DCL + `volatile`", "Yes", "Yes", "One volatile read", "Correct; verbose"],
        ["Holder idiom", "Yes", "Yes (JVM class-init lock)", "None", "Best lazy option"],
        ["`enum` singleton", "At enum init", "Yes; serialization- and reflection-safe", "None", "Best when you can use an enum"]],
      points: ["Two separate bugs: **atomicity** (two threads both create) and **visibility/ordering** (a thread sees a reference before the object is fully built)", "Most real code should prefer DI-managed singletons (Spring beans) over hand-rolled ones"] },
    { title: "Bug 1: naive lazy initialisation creates two instances",
      text: "`if (instance == null) instance = new X()` is **check-then-act**. Two threads can both see `null` and both construct. With a slow constructor (loading config, opening a pool) the window is wide. Consequences: two connection pools, two caches with different contents, or an ID generator that hands out duplicates.",
      code: `class IdGenerator {
    private static IdGenerator instance;
    static final AtomicInteger constructed = new AtomicInteger();
    private long next = 1_000;
    private IdGenerator() { constructed.incrementAndGet(); try { Thread.sleep(20); } catch (InterruptedException e) { } }   // slow init
    static IdGenerator get() {
        if (instance == null) instance = new IdGenerator();                      // check-then-act race
        return instance;
    }
}
CountDownLatch go = new CountDownLatch(1);
ExecutorService pool = Executors.newFixedThreadPool(8);
Set<IdGenerator> seen = ConcurrentHashMap.newKeySet();
for (int i = 0; i < 8; i++) pool.submit(() -> { go.await(); seen.add(IdGenerator.get()); return null; });
go.countDown(); pool.shutdown(); pool.awaitTermination(2, TimeUnit.SECONDS);
System.out.println("constructor ran " + IdGenerator.constructed.get() + " times; distinct instances seen: " + seen.size());`,
      points: ["A race that \"never happens in tests\" happens at startup in production when 200 request threads arrive together", "Fixes: eager init, synchronized getter, DCL + volatile, holder, enum"] },
    { title: "Bug 2: unsafe publication and reordering (why DCL needs volatile)",
      text: "`instance = new Config()` is not one step. The JVM allocates memory, runs the constructor, and stores the reference, and without a happens-before edge, compilers and CPUs may make the **store visible before the constructor's writes**. A second thread doing the unsynchronised first check of double-checked locking can see a non-null reference to an object whose fields are still default values. Declaring the field `volatile` forbids that reordering and creates the happens-before edge between the writer and every reader.",
      m: M(["sequenceDiagram",
        "  participant T1", "  participant Heap", "  participant T2",
        "  T1->>Heap: 1 allocate Config (url = null)",
        "  T1->>Heap: 3 instance = ref (reordered)",
        "  T2->>Heap: if (instance != null) return instance",
        "  T2->>Heap: instance.url → null !",
        "  T1->>Heap: 2 constructor sets url",
        "  Note over T1,T2: with volatile, step 3 cannot move before step 2, and T2's read sees everything before it"]),
      code: `class Config {
    private static volatile Config instance;                                     // volatile is essential
    private final String url; private final int poolSize;
    private Config() { url = "jdbc:postgresql://db:5432/shop"; poolSize = 20; }
    static Config get() {
        Config local = instance;                                                 // one volatile read on the fast path
        if (local == null) {
            synchronized (Config.class) {
                local = instance;
                if (local == null) instance = local = new Config();
            }
        }
        return local;
    }
    String url() { return url; }
}
ExecutorService pool = Executors.newFixedThreadPool(8);
Set<Config> seen = ConcurrentHashMap.newKeySet();
for (int i = 0; i < 100; i++) pool.submit(() -> seen.add(Config.get()));
pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS);
System.out.println("instances: " + seen.size() + ", url: " + Config.get().url());`,
      points: ["`final` fields get special JMM guarantees: once the constructor finishes, any thread that sees the reference sees the `final` fields' values, even through a racy publication. They don't protect non-final fields or objects reachable from them that are later mutated", "The local variable avoids a second volatile read on the fast path (a micro-optimisation from *Effective Java*)", "You usually can't reproduce this bug on x86 in a demo: the memory model allows it, and ARM CPUs or JIT changes make it real"] },
    { title: "The holder idiom and the enum singleton",
      text: "**Initialization-on-demand holder**: the JVM initialises a class lazily, on first active use, under an internal lock, exactly once, and completion of class initialisation **happens-before** any use by other threads (JLS §12.4.2). Put the instance in a nested class and you get lazy, thread-safe, lock-free access with zero ceremony. **Enum singleton**: also initialised by the class-init mechanism, plus the JVM guarantees one instance even against serialization and reflection attacks.",
      code: `class Metrics {
    static boolean loaded = false;
    private Metrics() { loaded = true; System.out.println("  Metrics constructed on " + Thread.currentThread().getName()); }
    private static final class Holder { static final Metrics INSTANCE = new Metrics(); }   // created on first get()
    static Metrics get() { return Holder.INSTANCE; }
    static void unrelatedStatic() { }                                           // doesn't trigger Holder init
}
enum FeatureFlags {
    INSTANCE;
    private final Map<String, Boolean> flags = new ConcurrentHashMap<>(Map.of("upi-autopay", true));
    boolean on(String f) { return flags.getOrDefault(f, false); }
}
Metrics.unrelatedStatic();
System.out.println("after unrelated static call, constructed? " + Metrics.loaded);
ExecutorService pool = Executors.newFixedThreadPool(4);
Set<Metrics> seen = ConcurrentHashMap.newKeySet();
for (int i = 0; i < 20; i++) pool.submit(() -> seen.add(Metrics.get()));
pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS);
System.out.println("instances: " + seen.size());
System.out.println("flag upi-autopay: " + FeatureFlags.INSTANCE.on("upi-autopay"));`,
      points: ["Holder works only for **static** singletons; for per-instance lazy fields use DCL + volatile or a memoising `Lazy<T>`", "Enums can't extend classes (they can implement interfaces) and are eagerly created when the enum class initialises", "Both are immune to the \"two instances\" and \"partially constructed\" bugs without any explicit locking"] },
    { title: "When initialisation fails",
      text: "Interviewers like asking: \"what if the constructor throws?\" The answer differs by implementation. With **DCL or a synchronized getter**, the field stays `null` and the next call simply **retries**. With the **holder or enum**, a failed class initialisation is permanent: the first caller gets `ExceptionInInitializerError` and every later caller gets `NoClassDefFoundError` until the JVM restarts. For resources that may be temporarily unavailable (a remote config service), prefer a retrying lazy initialiser.",
      code: `class RemoteConfig {
    static int attempts = 0;
    private RemoteConfig() { if (++attempts < 3) throw new IllegalStateException("config service down"); }
    private static final class Holder { static final RemoteConfig I = new RemoteConfig(); }
    static RemoteConfig viaHolder() { return Holder.I; }
    private static volatile RemoteConfig dcl;
    static RemoteConfig viaDcl() {
        RemoteConfig r = dcl;
        if (r == null) synchronized (RemoteConfig.class) { r = dcl; if (r == null) dcl = r = new RemoteConfig(); }
        return r;
    }
}
for (int i = 1; i <= 2; i++) {
    try { RemoteConfig.viaHolder(); } catch (Throwable t) { System.out.println("holder call " + i + ": " + t.getClass().getSimpleName()); }
}
RemoteConfig.attempts = 0;
for (int i = 1; i <= 3; i++) {
    try { RemoteConfig.viaDcl(); System.out.println("dcl call " + i + ": ok"); } catch (IllegalStateException e) { System.out.println("dcl call " + i + ": " + e.getMessage() + " (will retry next call)"); }
}`,
      points: ["Don't do slow or failure-prone I/O inside static initialisers", "Add back-off if many callers would retry a failing initialiser at once"] },
    { title: "Lazy<T>, per-key singletons and thread-safe singleton state",
      text: "Two generalisations come up in LLD rounds. A reusable **`Lazy<T>`** memoises any expensive supplier with DCL + volatile. A **per-key singleton** (multiton: one rate limiter per user, one connection pool per tenant) is `ConcurrentHashMap.computeIfAbsent`, which runs the factory at most once per key. And whatever the creation mechanism, a singleton is **shared by every thread**, so its mutable state needs the same care as any shared object.",
      code: `final class Lazy<T> implements Supplier<T> {
    private final Supplier<? extends T> init; private volatile T value;
    Lazy(Supplier<? extends T> init) { this.init = init; }
    public T get() {
        T v = value;
        if (v == null) synchronized (this) { v = value; if (v == null) value = v = Objects.requireNonNull(init.get()); }
        return v;
    }
}
AtomicInteger builds = new AtomicInteger();
Lazy<Map<String, Integer>> gstRates = new Lazy<>(() -> { builds.incrementAndGet(); return Map.of("electronics", 18, "books", 0); });

ConcurrentHashMap<String, AtomicInteger> perTenantCounters = new ConcurrentHashMap<>();   // multiton
ExecutorService pool = Executors.newFixedThreadPool(8);
for (int i = 0; i < 1000; i++) {
    String tenant = "tenant-" + (i % 3);
    pool.submit(() -> { gstRates.get(); perTenantCounters.computeIfAbsent(tenant, k -> new AtomicInteger()).incrementAndGet(); });
}
pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS);
System.out.println("GST table built " + builds.get() + " time(s); per-tenant: " + new TreeMap<>(perTenantCounters));`,
      points: ["Classic stateful-singleton bug: a shared `SimpleDateFormat` (not thread-safe) in a singleton formatter; use `DateTimeFormatter` (immutable) instead", "Spring beans are singletons by default: never keep per-request data in a bean's fields", "`computeIfAbsent`'s function must be quick and must not modify the same map"] },
    { title: "Mini LLD: an application-wide order-ID generator",
      text: "Every service instance needs unique, roughly time-ordered 64-bit order IDs without a database round-trip (a Snowflake-style generator). Inside one JVM there must be exactly **one** generator (two would hand out duplicates for the same millisecond), it is called from every request thread, and it must handle the clock moving backwards after an NTP adjustment.",
      m: M(["flowchart LR",
        "  A[\"41 bits: ms since custom epoch\"]:::s0 --- B[\"10 bits: machine id (0–1023)\"]:::s1 --- C[\"12 bits: sequence within the ms (0–4095)\"]:::s2"]),
      code: `enum OrderIds {
    INSTANCE;                                                                  // one per JVM, safe lazy init
    private static final long EPOCH = 1_704_067_200_000L;                      // 2024-01-01T00:00:00Z
    private final long machineId = 42;                                         // from config / pod ordinal in real life
    private long lastMs = -1, seq = 0;
    synchronized long next(long nowMs) {                                       // state is shared: guard it
        if (nowMs < lastMs) throw new IllegalStateException("clock moved back " + (lastMs - nowMs) + " ms");
        if (nowMs == lastMs) {
            seq = (seq + 1) & 4095;
            if (seq == 0) { do { nowMs = System.currentTimeMillis(); } while (nowMs <= lastMs); }   // 4096 used: wait for next ms
        } else seq = 0;
        lastMs = nowMs;
        return ((nowMs - EPOCH) << 22) | (machineId << 12) | seq;
    }
    synchronized long next() { return next(System.currentTimeMillis()); }   // read the clock UNDER the lock
}
ExecutorService pool = Executors.newFixedThreadPool(8);
Set<Long> ids = ConcurrentHashMap.newKeySet();
List<Future<?>> fs = new ArrayList<>();
for (int t = 0; t < 8; t++) fs.add(pool.submit(() -> { for (int i = 0; i < 5_000; i++) ids.add(OrderIds.INSTANCE.next()); }));
for (Future<?> f : fs) f.get(); pool.shutdown();
System.out.println("40,000 ids generated concurrently, unique: " + ids.size());
long id = OrderIds.INSTANCE.next();
System.out.println("decoded: machine=" + ((id >> 12) & 1023) + " seq=" + (id & 4095) + " ms since epoch > 0: " + ((id >> 22) > 0));
try { OrderIds.INSTANCE.next(1_704_067_200_500L); } catch (IllegalStateException e) { System.out.println("clock check: " + e.getMessage().replaceAll("\\\\d+", "N")); }`,
      points: ["Reading the clock **outside** the lock is a real bug: a thread can read 100 ms, get descheduled, and enter after another thread stored 107 ms, which looks like the clock going backwards. It is an easy mistake to make and only shows up under load.", "`synchronized` on a tiny method is fine here: contention is short; for extreme throughput use a CAS on a packed `AtomicLong` (time + seq)", "\"Singleton\" here means one per JVM; uniqueness **across** instances comes from distinct machine ids (assigned by config, ZooKeeper or pod ordinal)", "Clock moving backwards: refuse (as here), wait until the clock catches up, or keep using `lastMs` and borrow from the sequence"] },
    { title: "Singletons, DI and testing",
      text: "Hand-rolled singletons are global state: hard to replace in tests, hidden dependencies, and they live for the whole JVM. In most applications, let the container own the lifecycle (Spring beans are singletons per application context) and inject an interface. Keep the hand-rolled patterns for libraries, low-level infrastructure, and interview answers.",
      table: [
        ["Concern", "Hand-rolled singleton", "DI-managed singleton"],
        ["Creation thread-safety", "You must get it right (holder/enum/DCL)", "Container creates it once at startup"],
        ["Swapping in tests", "Hard (static access); needs reset hooks", "Inject a fake or mock"],
        ["Hidden dependency", "`X.getInstance()` anywhere", "Constructor parameter, visible"],
        ["Lifecycle (close, shutdown)", "Manual (shutdown hooks)", "`@PreDestroy`, context close"],
        ["State thread-safety", "Your job", "Still your job"]],
      code: `interface Clock { long now(); }
enum SystemClock implements Clock { INSTANCE; public long now() { return 1_700_000_000_000L; } }   // fixed for the demo
class OtpService {
    private final Clock clock;                                                // depend on the interface
    OtpService(Clock clock) { this.clock = clock; }
    boolean expired(long issuedAt) { return clock.now() - issuedAt > 300_000; }
}
OtpService prod = new OtpService(SystemClock.INSTANCE);
OtpService test = new OtpService(() -> 1_700_000_400_000L);                 // a fake clock 400 s later
System.out.println("prod expired? " + prod.expired(1_699_999_900_000L) + ", test expired? " + test.expired(1_700_000_000_000L));`,
      points: ["An enum singleton implementing an interface gives you both: one instance, and injectability", "Spring's \"singleton\" is per container, not per JVM: two contexts mean two beans"] }
  ];

  H.registerLesson({
    code: "F29",
    summary: "The thread-safe Singleton under the Java Memory Model: why naive lazy initialisation creates two instances (shown live), unsafe publication and reordering that make double-checked locking need `volatile`, `final`-field guarantees, the holder idiom and class-initialisation lock, enum singletons, what happens when initialisation fails (retry vs permanent `NoClassDefFoundError`), a reusable `Lazy<T>`, per-key singletons with `computeIfAbsent`, thread-safe singleton state, a Snowflake-style order-ID generator, and singletons vs dependency injection for testing.",
    slides: SLIDES,
    widget: { heading: "Interactive: two threads call getInstance()", caption: "Pick an implementation and step through a worst-case interleaving the Java Memory Model allows.", render: dclWidget },
    examplesHeading: "Where thread-safe singletons show up",
    examples: [
      ["`Runtime.getRuntime()`", "An eagerly created JDK singleton (`private static final Runtime currentRuntime = new Runtime()`)."],
      ["`java.util.logging.LogManager`, SLF4J `LoggerFactory`", "Global registries created once and shared by every thread; loggers themselves must be thread-safe."],
      ["Spring singleton beans", "One instance per application context, created at startup by a single thread and safely published to request threads; their fields must not hold per-request state."],
      ["Connection pools (HikariCP), HTTP clients (`HttpClient`, OkHttp)", "Expensive, thread-safe objects meant to be created once and shared, usually managed by DI."],
      ["`Collections.emptyList()`, `Comparator.naturalOrder()`", "Immutable shared instances: trivially thread-safe because nothing can change."]
    ],
    pitfalls: [
      "Naive lazy `if (instance == null)` in multi-threaded code",
      "Double-checked locking without `volatile`",
      "Synchronising the getter but mutating singleton state without locks",
      "Non-thread-safe collaborators inside a singleton (`SimpleDateFormat`, `HashMap`)",
      "Doing remote I/O in a static initialiser (permanent failure via `NoClassDefFoundError`)",
      "Leaking `this` from the constructor (registering a listener) before construction finishes",
      "Assuming \"singleton\" means one per cluster (it's one per class loader / container)",
      "Breaking singletons through serialization or reflection (use enum or `readResolve`, see F05)"
    ],
    quiz: [
      { q: "What are the two distinct bugs in naive lazy initialisation?", options: ["Slow and verbose", "Two threads can both create an instance, and a thread may see a partially constructed object", "Memory leak and deadlock", "None in Java 21"], answer: 1, why: "Atomicity and visibility/ordering." },
      { q: "Why does double-checked locking need `volatile`?", options: ["Speed", "Without it the reference can become visible before the constructor's writes, so the unsynchronised first check may return a half-built object", "Java syntax requires it", "To allow reflection"], answer: 1, why: "volatile gives happens-before and forbids that reordering." },
      { q: "Why is the holder idiom thread-safe without locks in your code?", options: ["It isn't", "The JVM initialises the nested class once, under its own lock, and class-init completion happens-before use", "Because it's private", "Because of `final` methods"], answer: 1, why: "JLS class initialisation rules." },
      { q: "If a holder's static initialiser throws, later calls get…", options: ["A retry", "`NoClassDefFoundError`", "null", "A new instance"], answer: 1, why: "Class init failure is permanent for that class loader." },
      { q: "Which singleton is safe against serialization and reflection by default?", options: ["DCL", "Enum singleton", "Holder", "Synchronized getter"], answer: 1, why: "JVM guarantees enum constants are unique." },
      { q: "A thread-safe singleton holds a `HashMap` cache that request threads update. Is it thread-safe?", options: ["Yes, singletons are thread-safe", "No: creation is safe, but the shared map needs a `ConcurrentHashMap` or locking", "Only with enum", "Only in Spring"], answer: 1, why: "Thread-safe creation ≠ thread-safe state." },
      { q: "Best way to have one lazily created object per tenant?", options: ["One holder class per tenant", "`ConcurrentHashMap.computeIfAbsent(tenant, factory)`", "DCL per tenant with a HashMap", "Synchronise on the tenant string"], answer: 1, why: "Atomic per-key creation." },
      { q: "What do `final` fields guarantee?", options: ["Nothing about threads", "Threads that see the constructed object's reference see the final fields' constructor values (if `this` didn't escape)", "Atomic updates", "Immutability of referenced objects"], answer: 1, why: "Final-field semantics in the JMM." }
    ],
    cheatsheet: {
      table: [
        ["Situation", "Use"],
        ["Cheap to create", "`private static final X INSTANCE = new X();`"],
        ["Expensive, static, lazy", "Holder idiom"],
        ["Need serialization/reflection safety", "`enum X { INSTANCE; }`"],
        ["Lazy instance field / may fail and retry", "DCL + `volatile` (or `Lazy<T>`)"],
        ["One per key", "`ConcurrentHashMap.computeIfAbsent`"],
        ["Application code", "DI container singleton + interface"]],
      cards: [
        { title: "DCL checklist", items: ["`volatile` field", "Check, lock, re-check", "Local variable for one read", "Construct fully before publishing"] },
        { title: "Say in interviews", items: ["Check-then-act", "Unsafe publication", "Happens-before", "Class-init lock (JLS 12.4.2)", "Final-field semantics"] },
        { title: "State inside", items: ["Immutable where possible", "Atomics / concurrent maps", "No per-request fields", "`DateTimeFormatter`, not `SimpleDateFormat`"] }]
    },
    practice: [
      { level: "Easy", q: "Which of these are thread-safe: (a) eager static final, (b) naive lazy, (c) synchronized getter, (d) DCL without volatile, (e) DCL with volatile, (f) holder, (g) enum? Justify each in one line.",
        a: ["(a) Safe: created during class initialisation, which the JVM serialises and publishes safely.",
          "(b) Unsafe: check-then-act race (two instances) and unsafe publication.",
          "(c) Safe: the lock gives atomicity and visibility; cost is a lock on every call.",
          "(d) Unsafe: the unsynchronised first read may see the reference before the constructor's writes.",
          "(e) Safe: volatile write/read creates happens-before and forbids the reordering.",
          "(f) Safe and lazy: relies on the class-initialisation lock of the nested holder.",
          "(g) Safe: enum constants are created in class init; also serialization/reflection safe."] },
      { level: "Easy", q: "Is a `static synchronized getInstance()` good enough? What would you say if the interviewer asks about performance?",
        a: ["It is correct. Uncontended locking is cheap on modern JVMs, so for most code it's fine.",
          "Under heavy contention (hundreds of threads calling it in a hot path) every call serialises on the class lock, which can show up in profiles.",
          "Better options with no per-call lock: eager init if creation is cheap, the holder idiom if laziness matters, DCL + volatile for instance fields or retryable init.",
          "Best of all, fetch it once and keep the reference (inject it) instead of calling `getInstance()` in a loop."] },
      { level: "Medium", q: "A singleton `DateUtil` holds one `SimpleDateFormat` and occasionally returns garbled dates under load. Explain and fix.",
        code: `class DateUtil {
    static final DateUtil INSTANCE = new DateUtil();
    private final java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd-MMM-yyyy");   // immutable, thread-safe
    String format(LocalDate d) { return fmt.format(d); }
}
ExecutorService pool = Executors.newFixedThreadPool(8);
Set<String> out = ConcurrentHashMap.newKeySet();
for (int i = 0; i < 1000; i++) { LocalDate d = LocalDate.of(2026, 1 + i % 12, 15); pool.submit(() -> out.add(DateUtil.INSTANCE.format(d))); }
pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS);
System.out.println(out.size() + " distinct formatted dates (one per month, none garbled)");`,
        follow: "`SimpleDateFormat` keeps intermediate parsing/formatting state in fields (a shared `Calendar`), so concurrent calls corrupt each other. The singleton's creation was thread-safe; its **state** wasn't. Use `DateTimeFormatter` (immutable) or, on legacy code, a `ThreadLocal<SimpleDateFormat>`." },
      { level: "Medium", q: "What does \"leaking `this`\" mean and why does it break thread-safe singletons?",
        code: `interface Listener { void onEvent(String e); }
class EventBus { static final List<Listener> listeners = new CopyOnWriteArrayList<>(); }
class AuditService implements Listener {
    private final List<String> log;
    private AuditService() { log = new ArrayList<>(); }                       // no 'this' escapes during construction
    static AuditService create() { AuditService s = new AuditService(); EventBus.listeners.add(s); return s; }   // register after
    public void onEvent(String e) { synchronized (log) { log.add(e); } }
    int size() { synchronized (log) { return log.size(); } }
}
AuditService audit = AuditService.create();
EventBus.listeners.forEach(l -> l.onEvent("order placed"));
System.out.println("audit entries: " + audit.size());`,
        follow: "If the constructor did `EventBus.listeners.add(this)` before assigning `log`, another thread could call `onEvent` on a half-constructed object (null `log`), and even `final`-field guarantees are void when `this` escapes. Register in a factory method after construction." },
      { level: "Medium", q: "\"Our singleton scheduler runs the nightly settlement job twice.\" The app runs on 3 pods. What's going on and how do you fix it?",
        a: ["A Java singleton is one instance per class loader per JVM. Three pods = three singletons = the job runs on each (here, two pods fired).",
          "Fixes: a distributed lock (ShedLock with a DB table, Redis `SET NX PX`, ZooKeeper/etcd lease), leader election (Kubernetes Lease, ZooKeeper), or move the job to a single scheduler service / Kubernetes CronJob.",
          "Make the job **idempotent** anyway (settlement keyed by date) so a double run is harmless.",
          "Use fencing tokens so a paused old leader can't write after losing its lease."] },
      { level: "Medium", q: "Make a hand-rolled singleton testable without changing its callers much.",
        a: ["Extract an interface (`PaymentGateway`) and have the singleton implement it.",
          "Change callers to receive the interface via constructor injection; production wiring passes `RealGateway.INSTANCE`.",
          "If you can't change callers yet: add a package-private `static void setForTesting(PaymentGateway fake)` backed by a `volatile` field, and reset it in `@AfterEach`. It's a stopgap that keeps tests isolated.",
          "Avoid tests that depend on singleton state from other tests (order-dependent failures)."] },
      { level: "Hard", q: "Design a hot-reloadable configuration singleton: readers on every request must never lock; reloads happen every 30 s; listeners get notified of changes.",
        code: `record AppConfig(int version, Map<String, String> values) {
    AppConfig { values = Map.copyOf(values); }                                 // immutable snapshot
}
enum ConfigRegistry {
    INSTANCE;
    private final AtomicReference<AppConfig> current = new AtomicReference<>(new AppConfig(0, Map.of("max-cart-items", "50")));
    private final List<Consumer<AppConfig>> listeners = new CopyOnWriteArrayList<>();
    AppConfig get() { return current.get(); }                                  // lock-free read of a consistent snapshot
    void onChange(Consumer<AppConfig> l) { listeners.add(l); }
    boolean reload(Map<String, String> fresh) {
        AppConfig old = current.get();
        if (old.values().equals(fresh)) return false;
        AppConfig next = new AppConfig(old.version() + 1, fresh);
        if (!current.compareAndSet(old, next)) return false;                    // a concurrent reload won
        listeners.forEach(l -> l.accept(next));
        return true;
    }
}
ConfigRegistry.INSTANCE.onChange(c -> System.out.println("listener: now v" + c.version() + " " + c.values()));
System.out.println("reader sees max-cart-items=" + ConfigRegistry.INSTANCE.get().values().get("max-cart-items"));
ConfigRegistry.INSTANCE.reload(Map.of("max-cart-items", "75"));
System.out.println("no-op reload changed? " + ConfigRegistry.INSTANCE.reload(Map.of("max-cart-items", "75")));`,
        follow: "Readers grab one immutable snapshot per request, so a request never sees half old and half new values. The scheduler thread calls `reload`. Listeners run on the reloading thread: keep them fast or hand off to an executor." },
      { level: "Hard", q: "Compare holder, enum and DCL + volatile on laziness, failure handling, serialization, and when you'd choose each.",
        a: ["**Laziness**: holder is lazy (on first `get()`); enum is created when the enum class initialises (usually first use of the enum, effectively lazy but you can't separate other static uses); DCL is lazy per field.",
          "**Failure**: holder and enum failures are permanent (`NoClassDefFoundError`); DCL can retry on the next call.",
          "**Serialization/reflection**: enum is safe by design; holder and DCL classes need `readResolve` and a constructor guard (F05).",
          "**Scope**: holder/enum work for static singletons only; DCL works for instance fields too (lazy per object).",
          "Choose: enum for simple global services; holder for an expensive static object of a normal class; DCL/`Lazy<T>` when init may fail and should retry, or for lazy instance fields; DI for application services."] }
    ],
    recap: [
      "Naive lazy init has two bugs: check-then-act (two instances) and unsafe publication (half-built object).",
      "DCL is correct only with a `volatile` field; the holder idiom and enum get thread safety from JVM class initialisation.",
      "Holder/enum init failures are permanent; DCL and synchronized getters can retry.",
      "Thread-safe creation is not thread-safe state: make singleton state immutable, atomic or concurrent.",
      "One per JVM, not per cluster: use distributed locks/leader election for cluster-wide singletons; prefer DI for testability."
    ]
  });
})();
