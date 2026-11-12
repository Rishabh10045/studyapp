/* Lesson J24: ThreadLocal, context propagation, scoped values */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Semantics checked on Java 21 with two single-thread executors as workers W1 and W2 and the request sequence
  // alice@W1, bob@W2, anonymous@W1, anonymous@W2, carol@W1, anonymous@W1:
  //   no remove → anonymous requests saw alice, bob, carol; remove() in finally → null; ScopedValue → unbound.
  var MODES = {
    leak: { label: "ThreadLocal, no cleanup", code: "static final ThreadLocal<String> USER = new ThreadLocal<>();\n\nvoid handle(Request r) {\n    if (r.user() != null) USER.set(r.user());   // anonymous requests set nothing\n    audit(\"request by \" + USER.get());\n}" },
    remove: { label: "ThreadLocal + remove() in finally", code: "static final ThreadLocal<String> USER = new ThreadLocal<>();\n\nvoid handle(Request r) {\n    try {\n        if (r.user() != null) USER.set(r.user());\n        audit(\"request by \" + USER.get());\n    } finally {\n        USER.remove();                          // the pool thread goes back clean\n    }\n}" },
    scoped: { label: "ScopedValue (Java 21 preview)", code: "static final ScopedValue<String> USER = ScopedValue.newInstance();\n\nvoid handle(Request r) {\n    Runnable body = () -> audit(\"request by \" + (USER.isBound() ? USER.get() : \"unbound\"));\n    if (r.user() == null) body.run();\n    else ScopedValue.where(USER, r.user()).run(body);   // binding ends with the call\n}" }
  };
  var USERS = ["alice", "bob", "carol", "anonymous"];
  function tlWidget(el, ctx) {
    var s = ctx.state; if (!s.mode) { s.mode = "leak"; s.user = "alice"; s.w = 1; s.sim = null; }
    el.innerHTML = "<div class='seg' data-r='mode'>" + Object.keys(MODES).map(function (k) { return "<button type='button' data-v='" + k + "'>" + MODES[k].label + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='code' style='margin-top:10px'></pre>" +
      "<div class='seg' data-r='user' style='margin-top:4px'>" + USERS.map(function (u) { return "<button type='button' data-v='" + u + "'>" + u + "</button>"; }).join("") + "</div>" +
      "<div class='seg' data-r='w' style='margin-top:8px'><button type='button' data-v='1'>on pool thread W1</button><button type='button' data-v='2'>on pool thread W2</button></div>" +
      "<div class='btnrow' style='margin-top:8px'><button type='button' class='btn primary' data-r='send'>handle request</button><button type='button' class='btn' data-r='demo'>replay the recorded sequence</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><div class='tablewrap' data-r='log'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function fresh() { return { slot: { 1: null, 2: null }, log: [], n: 0 }; }
    function handle(user, w) {
      var S = s.sim, u = user === "anonymous" ? null : user, seen;
      S.n++;
      if (s.mode === "scoped") seen = u || "unbound";
      else { if (u) S.slot[w] = u; seen = S.slot[w]; if (s.mode === "remove") S.slot[w] = null; }
      var leak = !u && seen && seen !== "unbound";
      S.log.push({ n: S.n, user: user, w: w, seen: seen === null ? "null" : seen, leak: leak });
    }
    function draw() {
      if (!s.sim) s.sim = fresh();
      var S = s.sim;
      ["mode", "user", "w"].forEach(function (k) { q(k).querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", String(s[k]) === b.dataset.v); }); });
      q("code").innerHTML = ctx.H.highlight(MODES[s.mode].code, "java");
      var L = ["flowchart LR"];
      [1, 2].forEach(function (w) {
        var v = s.mode === "scoped" ? "no per-thread slot" : (S.slot[w] === null ? "USER = null" : "USER = " + S.slot[w]);
        L.push("  W" + w + "[\"pool thread W" + w + "<br/>" + v + "\"]:::" + (s.mode !== "scoped" && S.slot[w] ? "s4" : "s0"));
      });
      L.push("  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s4 fill:#fff3e0,stroke:#ef6c00");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var leaks = S.log.filter(function (x) { return x.leak; }).length;
      q("res").innerHTML = ctx.md(leaks ? "**" + leaks + " request(s) ran as someone else.** Pool threads are reused, so a value set by one request is still there for the next request on that thread. With security or tenant context this is a data leak." :
        s.mode === "leak" ? "Send an anonymous request to a thread that served a logged-in user." : s.mode === "remove" ? "`remove()` in `finally` returns each thread to the pool clean." : "A scoped value is bound only for the duration of `run`/`call`: nothing to forget, nothing to leak.");
      q("log").innerHTML = S.log.length ? "<table><thead><tr><th>#</th><th>request user</th><th>thread</th><th>USER seen inside</th></tr></thead><tbody>" + S.log.slice(-8).map(function (x) {
        return "<tr><td>" + x.n + "</td><td>" + x.user + "</td><td>W" + x.w + "</td><td" + (x.leak ? " style='color:#c62828;font-weight:600'" : "") + ">" + x.seen + (x.leak ? " ← leaked" : "") + "</td></tr>";
      }).join("") + "</tbody></table>" : "";
    }
    ["mode", "user", "w"].forEach(function (k) { q(k).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s[k] = k === "w" ? +b.dataset.v : b.dataset.v; if (k === "mode") s.sim = fresh(); ctx.save(); draw(); }); });
    q("send").addEventListener("click", function () { handle(s.user, s.w); ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.sim = fresh(); ctx.save(); draw(); });
    q("demo").addEventListener("click", function () {
      s.sim = fresh();
      [["alice", 1], ["bob", 2], ["anonymous", 1], ["anonymous", 2], ["carol", 1], ["anonymous", 1]].forEach(function (r) { handle(r[0], r[1]); });
      ctx.save(); draw();
    });
    draw();
  }

  var SLIDES = [
    { title: "ThreadLocal: one variable, a value per thread",
      text: "A `ThreadLocal<T>` looks like one variable, but each thread that reads it sees **its own copy**. Internally every `Thread` object has a `ThreadLocalMap`; the `ThreadLocal` instance is the key (weakly referenced) and your value is the (strongly referenced) entry. `get()` looks up the current thread's map, `set()` writes it, `remove()` deletes the entry, and `ThreadLocal.withInitial(supplier)` provides a lazy per-thread default. Since nothing is shared, no synchronization is needed.",
      m: M(["flowchart LR",
        "  TL[\"static ThreadLocal USER\"]:::s1",
        "  subgraph T1[\"Thread http-1\"]", "    M1[\"threadLocals map: USER → alice\"]:::s2", "  end",
        "  subgraph T2[\"Thread http-2\"]", "    M2[\"threadLocals map: USER → bob\"]:::s2", "  end",
        "  TL -. key .-> M1", "  TL -. key .-> M2",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `ThreadLocal<String> user = new ThreadLocal<>();
ThreadLocal<Integer> counter = ThreadLocal.withInitial(() -> 0);
Runnable task = () -> {
    user.set(Thread.currentThread().getName().equals("t1") ? "alice" : "bob");
    for (int i = 0; i < 3; i++) counter.set(counter.get() + 1);
    System.out.println(Thread.currentThread().getName() + " sees user " + user.get() + ", counter " + counter.get());
};
Thread t1 = new Thread(task, "t1"), t2 = new Thread(task, "t2");
t1.start(); t1.join(); t2.start(); t2.join();
System.out.println("main sees user " + user.get() + ", counter " + counter.get());`,
      analogy: "A ThreadLocal is a hotel's room safe: every guest uses \"the safe\", but each room has its own, and the next guest must find it emptied." },
    { title: "What ThreadLocal is used for",
      text: "Two families of uses. **Per-thread instances of non-thread-safe objects**: legacy `SimpleDateFormat`, `MessageDigest`, reusable buffers, so each thread gets one without locking. **Implicit request context** that would otherwise be passed through every method: logging MDC (trace id), Spring's `SecurityContextHolder`, `RequestContextHolder`, `LocaleContextHolder`, transaction synchronization, Hibernate's current session. The second family is where most bugs live, because the context silently doesn't follow work onto other threads and silently stays behind on pooled ones.",
      code: `ThreadLocal<java.text.SimpleDateFormat> fmt = ThreadLocal.withInitial(() -> new java.text.SimpleDateFormat("yyyy-MM-dd"));   // legacy, not thread-safe
Set<String> results = ConcurrentHashMap.newKeySet();
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    for (int i = 1; i <= 28; i++) {
        int day = i;
        pool.submit(() -> results.add(fmt.get().format(new GregorianCalendar(2026, Calendar.NOVEMBER, day).getTime())));
    }
}
System.out.println("formatted " + results.size() + " distinct dates safely with one formatter per thread");
System.out.println("modern alternative needs no ThreadLocal: " + java.time.format.DateTimeFormatter.ISO_LOCAL_DATE.format(java.time.LocalDate.of(2026, 11, 12)) + " (DateTimeFormatter is immutable)");` },
    { title: "Pools reuse threads: always remove()",
      text: "In a servlet container or executor, threads outlive requests. A value set during one request is **still there** when that thread serves the next one, unless you `remove()` it. The widget replays this with two pool threads: an anonymous request ran \"as\" the previous user. Rule: **set in `try`, remove in `finally`**, at the boundary where the context is established (a filter, interceptor or task wrapper). Frameworks do this for their own holders (Spring clears `SecurityContextHolder` after each request); your own ThreadLocals are your responsibility.",
      code: `ThreadLocal<String> tenant = new ThreadLocal<>();
ExecutorService pool = Executors.newSingleThreadExecutor();                 // one reused worker makes it obvious
BiFunction<String, Boolean, String> handle = (t, cleanup) -> {
    try {
        return pool.submit(() -> {
            try { if (t != null) tenant.set(t); return "request(" + t + ") ran for tenant " + tenant.get(); }
            finally { if (cleanup) tenant.remove(); }
        }).get();
    } catch (Exception e) { throw new RuntimeException(e); }
};
System.out.println(handle.apply("acme", false));
System.out.println(handle.apply(null, false) + "   ← leaked from the previous request");
pool.submit(tenant::remove);
System.out.println(handle.apply("acme", true));
System.out.println(handle.apply(null, true) + "   ← clean with remove() in finally");
pool.shutdown();` },
    { title: "ThreadLocal memory leaks",
      text: "Entries live in the **thread's** map. The key is weak, so an unreachable `ThreadLocal` instance can be collected, but the **value stays strongly referenced** until the map happens to clean stale entries or the thread dies. Pool threads live for the whole application, so values that are never removed accumulate: large caches per thread, or, in app servers, a value whose class came from a redeployed web app, which pins the entire old **class loader** (the classic Tomcat \"PermGen/Metaspace leak\" warnings). Remedies: `static final` ThreadLocals (one key, not one per instance), `remove()` in `finally`, and small values.",
      code: `ThreadLocal<byte[]> buffer = ThreadLocal.withInitial(() -> new byte[1_000_000]);    // 1 MB per thread
ExecutorService pool = Executors.newFixedThreadPool(8);
for (int i = 0; i < 100; i++) pool.submit(() -> buffer.get()[0] = 1);              // each worker allocates its own buffer once
pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS);
System.out.println("8 pool threads keep 8 MB alive until they die or call remove()");

class PerInstance { final ThreadLocal<String> tl = new ThreadLocal<>(); }       // anti-pattern: a new key per object
List<PerInstance> objects = new ArrayList<>();
for (int i = 0; i < 1_000; i++) { PerInstance p = new PerInstance(); p.tl.set("value " + i); objects.add(p); }
System.out.println("main thread now holds 1000 ThreadLocal entries (use static final ThreadLocals)");` },
    { title: "InheritableThreadLocal and its trap",
      text: "`InheritableThreadLocal` copies the parent's value into a **child thread when the child is created** (override `childValue` to transform it). That works for `new Thread(...)` but not for pools: pool threads are created **once**, by whichever thread first triggers creation, and keep that snapshot forever, so tasks see a **stale** or **wrong** parent's value. Don't rely on it for request context with executors; use explicit capture-and-restore wrappers (next slide). Virtual threads inherit by default; `Thread.ofVirtual().inheritInheritableThreadLocals(false)` turns it off.",
      code: `InheritableThreadLocal<String> requestId = new InheritableThreadLocal<>();
requestId.set("req-1");
Thread child = new Thread(() -> System.out.println("new Thread inherits: " + requestId.get()));
child.start(); child.join();

ExecutorService pool = Executors.newSingleThreadExecutor();
pool.submit(() -> {}).get();                                          // worker thread created now, during req-1
requestId.set("req-2");
System.out.println("pool task during req-2 sees: " + pool.submit(requestId::get).get() + "   ← stale snapshot from thread creation");
pool.shutdown();` },
    { title: "Propagating context across threads",
      text: "When work hops threads (executors, `CompletableFuture`, `@Async`, reactive), context must be carried explicitly: **capture** on the submitting thread, **restore** on the worker before the task, **restore the previous value / clear** afterwards. Wrap the executor once and use it everywhere (J16's decorator). Libraries: Spring's `TaskDecorator`, `DelegatingSecurityContextExecutor`, Micrometer **context-propagation** (`ContextSnapshot`, used by Spring Boot 3 for tracing/MDC), and Reactor's `Context` for reactive code, where ThreadLocals don't work at all.",
      code: `ThreadLocal<Map<String, String>> mdc = ThreadLocal.withInitial(HashMap::new);    // stand-in for SLF4J's MDC
Function<Runnable, Runnable> withContext = task -> {
    Map<String, String> captured = new HashMap<>(mdc.get());                     // capture on the caller
    return () -> {
        Map<String, String> previous = mdc.get();
        mdc.set(new HashMap<>(captured));                                        // restore on the worker
        try { task.run(); } finally { mdc.set(previous); }                       // and put back what was there
    };
};
mdc.get().put("traceId", "a1b2c3");
ExecutorService pool = Executors.newFixedThreadPool(2);
pool.submit(() -> System.out.println("raw task log  [traceId=" + mdc.get().get("traceId") + "]")).get();
pool.submit(withContext.apply(() -> System.out.println("wrapped task log [traceId=" + mdc.get().get("traceId") + "]"))).get();
CompletableFuture.runAsync(withContext.apply(() -> System.out.println("async stage log [traceId=" + mdc.get().get("traceId") + "]")), pool).join();
pool.shutdown();` },
    { title: "Per-thread state for performance",
      text: "Thread confinement also avoids contention: `ThreadLocalRandom.current()` gives each thread its own generator instead of all threads CAS-ing one shared `Random` seed; `LongAdder` (J19) uses per-thread-ish cells; logging frameworks reuse per-thread buffers. Use `ThreadLocalRandom` for random numbers in concurrent code (but `SecureRandom` for security tokens).",
      code: `Random shared = new Random(42);
int threads = 8, perThread = 2_000_000;
for (String kind : List.of("shared Random", "ThreadLocalRandom", "shared Random", "ThreadLocalRandom")) {
    long t0 = System.nanoTime();
    try (ExecutorService pool = Executors.newFixedThreadPool(threads)) {
        for (int t = 0; t < threads; t++) pool.submit(() -> {
            long sum = 0;
            for (int i = 0; i < perThread; i++) sum += kind.startsWith("shared") ? shared.nextInt(100) : ThreadLocalRandom.current().nextInt(100);
            return sum;
        });
    }
    System.out.println(kind + ": " + (System.nanoTime() - t0) / 1_000_000 + " ms");
}` },
    { title: "ThreadLocal and virtual threads",
      text: "ThreadLocals **work** on virtual threads, but the trade-offs change. With a million virtual threads, a ThreadLocal holding a 1 MB buffer means a million buffers; and **caching** expensive objects in ThreadLocals is pointless because virtual threads aren't reused (each task gets a fresh one, so the cache is built every time). Keep per-request context small, avoid ThreadLocal caches on virtual threads (use a shared pool of objects instead), and look at **scoped values** for context.",
      code: `AtomicInteger creations = new AtomicInteger();
ThreadLocal<StringBuilder> cache = ThreadLocal.withInitial(() -> { creations.incrementAndGet(); return new StringBuilder(1024); });
try (ExecutorService platform = Executors.newFixedThreadPool(4)) {
    for (int i = 0; i < 1_000; i++) platform.submit(() -> cache.get().setLength(0));
}
long platformCreations = creations.getAndSet(0);
try (ExecutorService virtual = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 1_000; i++) virtual.submit(() -> cache.get().setLength(0));
}
System.out.println("1000 tasks → ThreadLocal values created: platform pool " + platformCreations + ", virtual threads " + creations.get());` },
    { title: "Scoped values (Java 21 preview)",
      text: "`ScopedValue<T>` (JEP 446, preview in Java 21, finalised in Java 25 by JEP 506) is designed to replace ThreadLocal for **context**. A value is **bound for the duration of a call**: `ScopedValue.where(USER, alice).run(() -> …)`; code inside (at any depth) reads `USER.get()`; when `run` returns the binding is gone, so nothing can leak to the next request. Values are **immutable** (no `set`), lookups are cheap, and they're automatically **inherited by subtasks forked in a `StructuredTaskScope`** (J25) without copying. Needs `--enable-preview` on Java 21.",
      lang: "java",
      code: `static final ScopedValue<String> USER = ScopedValue.newInstance();

void handle(Request req) {
    ScopedValue.where(USER, req.user())             // bind for this call only
               .run(() -> service.book(req));       // everything inside sees USER
}

class BookingService {
    void book(Request req) {
        audit("booking by " + USER.get());          // no parameter threading
        if (!USER.isBound()) throw new IllegalStateException("no user");
    }
}
// The widget's ScopedValue mode was recorded with: java --enable-preview --source 21`, noCompile: true,
      points: ["`USER.get()` outside any binding throws `NoSuchElementException`; check `isBound()` or use `orElse`"] },
    { title: "Rebinding and nesting",
      text: "A scoped value can't be changed inside its scope, but a nested call can **rebind** it for a narrower scope (for example, running part of a request as a system user); when the inner `run` returns, the outer binding is visible again. This gives a clear, one-way flow of context down the call stack, unlike ThreadLocal where any method can `set` and surprise its callers. `where(...).call(...)` returns a value; you can bind several values in one `where(A, a).where(B, b)` chain.",
      lang: "java",
      code: `static final ScopedValue<String> USER = ScopedValue.newInstance();
static final ScopedValue<String> TENANT = ScopedValue.newInstance();

String result = ScopedValue.where(USER, "alice").where(TENANT, "acme").call(() -> {
    String outer = USER.get();                                        // alice
    String inner = ScopedValue.where(USER, "system").call(USER::get);  // rebound only inside: system
    String after = USER.get();                                        // alice again
    return outer + " / " + inner + " / " + after + " @ " + TENANT.get();
});
// result = "alice / system / alice @ acme"`, noCompile: true },
    { title: "Choosing: parameters, ThreadLocal or ScopedValue",
      text: "Implicit context is convenient but hides dependencies. Prefer **explicit parameters** for business data (the booking, the user id your method needs). Use implicit context for **cross-cutting** concerns that would otherwise pollute every signature: tracing, security principal, tenant, locale. Within that, prefer **ScopedValue** for new code on recent Java (especially with virtual threads and structured concurrency), and **ThreadLocal** where frameworks require it or you need per-thread mutable state, always with disciplined cleanup.",
      table: [
        ["", "Method parameters", "ThreadLocal", "ScopedValue"],
        ["Visibility of dependency", "Explicit", "Hidden", "Hidden but bounded"],
        ["Mutability", "As designed", "Any code can set()", "Immutable; rebind in nested scope"],
        ["Lifetime", "The call", "Until remove() or thread death", "The bound call"],
        ["Leaks on pooled threads", "No", "Yes if not removed", "No"],
        ["Crosses threads", "Pass it", "Manual capture/restore", "Inherited by StructuredTaskScope forks"],
        ["Availability", "Always", "Always", "Java 21 preview, final in Java 25"]],
      code: `record RequestContext(String traceId, String user) { }
BiFunction<RequestContext, String, String> priceQuote = (ctx, route) -> "[" + ctx.traceId() + "] " + ctx.user() + " quoted " + route;   // explicit and testable
System.out.println(priceQuote.apply(new RequestContext("t-77", "alice"), "DEL-BOM"));` }
  ];

  H.registerLesson({
    code: "J24",
    summary: "Per-thread state and implicit context: how `ThreadLocal` stores a value per thread, its two families of uses (per-thread instances and request context such as MDC and security), why pooled threads require `remove()` in `finally`, memory and class-loader leaks, `InheritableThreadLocal` and why it breaks with pools, capturing and restoring context across executors and `CompletableFuture`, `ThreadLocalRandom` and other per-thread performance tricks, ThreadLocals on virtual threads, and Java 21's `ScopedValue` with rebinding, plus how to choose between parameters, ThreadLocal and scoped values.",
    slides: SLIDES,
    widget: { heading: "Interactive: request context on reused pool threads", caption: "Send requests from different users to two pool threads and watch the per-thread slot. Without cleanup, anonymous requests run as the previous user on that thread. The replayed sequence and all three behaviours were recorded on Java 21 (ScopedValue with `--enable-preview`).", render: tlWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Logging and tracing", "SLF4J MDC carries trace and request ids; it disappears in async tasks unless propagated (Micrometer context-propagation in Spring Boot 3)."],
      ["Security", "Spring Security's `SecurityContextHolder` is ThreadLocal-based; `@Async` methods need `DelegatingSecurityContextExecutor` or a TaskDecorator."],
      ["Multi-tenancy", "A tenant id in a ThreadLocal selects the schema or datasource; leaking it across requests exposes another tenant's data."],
      ["Transactions", "Spring's transaction manager binds connections to the current thread, so work moved to another thread runs outside the transaction."],
      ["App server leaks", "Tomcat warns about ThreadLocals not removed on undeploy, which pin old class loaders in Metaspace."],
      ["Virtual-thread migrations", "Per-thread caches stop working and per-thread memory multiplies; scoped values are the new direction."]
    ],
    pitfalls: [
      "Setting a ThreadLocal in a pooled thread without `remove()` in `finally`",
      "Expecting context to follow work into executors, CompletableFuture or @Async",
      "Relying on InheritableThreadLocal with thread pools",
      "Non-static ThreadLocal fields (a new key per instance)",
      "Large values in ThreadLocals on many (virtual) threads",
      "ThreadLocal caches with virtual threads (never reused)",
      "Using ThreadLocal to pass business data that should be a parameter",
      "Calling ScopedValue.get() outside a binding",
      "Using a shared `Random` across many threads instead of ThreadLocalRandom"
    ],
    quiz: [
      { q: "Where are ThreadLocal values stored?", options: ["In the ThreadLocal object, keyed by thread id", "In each Thread's ThreadLocalMap, keyed by the ThreadLocal instance", "In a global ConcurrentHashMap", "On the stack"], answer: 1, why: "The map lives in the thread; the key is a weak reference to the ThreadLocal, the value a strong reference." },
      { q: "Why must you call `remove()` when using ThreadLocal in a web app?", options: ["Performance only", "Server threads are pooled; leftover values leak into later requests and keep memory alive", "ThreadLocal values expire otherwise", "It's required to call get()"], answer: 1, why: "The widget shows an anonymous request running as the previous user." },
      { q: "What does this print?", code: `ThreadLocal<String> tl = new ThreadLocal<>();
tl.set("main-value");
Thread t = new Thread(() -> System.out.println(tl.get()));
t.start(); t.join();`, options: ["main-value", "null", "Exception", "Empty string"], answer: 1, why: "A plain ThreadLocal isn't inherited; the new thread has no value. InheritableThreadLocal would print main-value." },
      { q: "Why is InheritableThreadLocal unreliable with thread pools?", options: ["It's deprecated", "Values are copied only when a thread is created; pool threads are created once and keep stale values", "It isn't thread-safe", "Pools clear it"], answer: 1, why: "Use explicit capture/restore wrappers instead." },
      { q: "A Spring `@Async` method logs without the request's trace id. Why?", options: ["Logging is disabled in async methods", "MDC is ThreadLocal-based and the method runs on an executor thread without that context", "Trace ids are per class", "@Async clears all logs"], answer: 1, why: "Configure a TaskDecorator or context-propagation to copy the MDC." },
      { q: "What leaks when a ThreadLocal in a redeployed web app isn't removed?", options: ["Nothing", "The value (and its class loader, with all classes of the old app) stays reachable from long-lived server threads", "Only the key", "Only stack frames"], answer: 1, why: "A classic Metaspace leak on application servers." },
      { q: "How does a ScopedValue binding end?", options: ["When you call remove()", "When the run/call it was bound for returns", "When the thread dies", "After a timeout"], answer: 1, why: "That bounded lifetime is why scoped values can't leak between requests." },
      { q: "Why is caching an expensive object in a ThreadLocal ineffective with virtual threads?", options: ["Virtual threads don't support ThreadLocal", "Virtual threads are created per task and not reused, so every task builds a new cached object", "The cache is shared", "It causes pinning"], answer: 1, why: "The slide's measurement: 4 creations on a platform pool vs 1000 on virtual threads for 1000 tasks." },
      { q: "Which is best for random numbers in highly concurrent code?", options: ["A shared java.util.Random", "ThreadLocalRandom.current()", "Math.random() under a lock", "new Random() per call"], answer: 1, why: "No contention on a shared seed. Use SecureRandom for security-sensitive values." }
    ],
    cheatsheet: {
      table: [
        ["Task", "Code"],
        ["Declare", "`static final ThreadLocal<Ctx> CTX = new ThreadLocal<>();`"],
        ["Lazy default", "`ThreadLocal.withInitial(() -> new Buffer())`"],
        ["Safe use", "`CTX.set(c); try { … } finally { CTX.remove(); }`"],
        ["Propagate", "capture `CTX.get()` on submit; set/restore around the task"],
        ["Random", "`ThreadLocalRandom.current().nextInt(100)`"],
        ["Scoped value", "`ScopedValue.where(USER, u).run(() -> …)`; `USER.get()`"],
        ["Spring", "`TaskDecorator`, `DelegatingSecurityContextExecutor`, Micrometer context-propagation"]],
      cards: [
        { title: "ThreadLocal rules", items: ["static final", "remove() in finally", "Small values", "Not across threads", "No Inheritable with pools"] },
        { title: "ScopedValue", items: ["Immutable", "Bound for a call", "Rebind in nested scope", "Inherited by StructuredTaskScope", "Preview in 21, final in 25"] },
        { title: "Say in interviews", items: ["Map lives in the Thread", "Weak key, strong value", "Pool reuse → leaks", "Capture/restore for async", "Scoped values for virtual threads"] }]
    },
    practice: [
      { level: "Easy", q: "What is ThreadLocal and when would you use it?",
        a: ["A variable with an independent value per thread; get/set/remove act on the current thread's copy.",
          "Uses: per-thread instances of non-thread-safe objects (legacy formatters, buffers) and implicit context (trace ids, security principal, tenant, transaction resources).",
          "Avoids passing cross-cutting context through every method and avoids locking for per-thread objects.",
          "Costs: hidden dependencies, cleanup discipline, and it doesn't cross threads."] },
      { level: "Easy", q: "How does ThreadLocal work internally?",
        a: ["Each Thread has a ThreadLocalMap field.",
          "The ThreadLocal instance is the key (WeakReference); the value is strongly referenced.",
          "get() hashes the ThreadLocal into the current thread's map; set() stores; remove() deletes.",
          "Stale entries (collected keys) are cleaned opportunistically during later operations; values remain until then or thread death."] },
      { level: "Easy", q: "Write a filter-style wrapper that sets a request id in a ThreadLocal and guarantees cleanup.",
        a: ["Set at the start of the request boundary.",
          "Run the handler in try.",
          "remove() in finally, even when the handler throws."],
        code: `ThreadLocal<String> requestId = new ThreadLocal<>();
BiConsumer<String, Runnable> withRequestId = (id, handler) -> {
    requestId.set(id);
    try { handler.run(); } finally { requestId.remove(); }
};
withRequestId.accept("req-9", () -> System.out.println("handling " + requestId.get()));
try { withRequestId.accept("req-10", () -> { throw new IllegalStateException("boom"); }); } catch (IllegalStateException e) { }
System.out.println("after both requests: " + requestId.get());` },
      { level: "Medium", q: "Explain how ThreadLocal can cause memory leaks.",
        a: ["Values are strongly referenced from long-lived threads' maps; pool threads live as long as the app.",
          "Without remove(), every pool thread keeps its last value (possibly large) forever.",
          "If a ThreadLocal instance is lost (non-static field), its key is cleared but the value stays until the map cleans it.",
          "In app servers, values whose classes come from an undeployed app pin its class loader and all its classes (Metaspace leak).",
          "Fix: static final ThreadLocals, remove() in finally, small values, framework-managed cleanup."] },
      { level: "Medium", q: "How do you propagate MDC/trace context to tasks running on an executor?",
        a: ["Capture the context map on the submitting thread at submit time.",
          "In the task wrapper, set the captured map before running and restore the previous map (or clear) in finally.",
          "Apply it once by decorating the executor (Spring TaskDecorator, ContextExecutorService from context-propagation).",
          "For CompletableFuture pass the decorated executor to every async stage."],
        code: `ThreadLocal<String> traceId = new ThreadLocal<>();
Function<ExecutorService, Executor> propagating = ex -> task -> {
    String captured = traceId.get();
    ex.execute(() -> { String prev = traceId.get(); traceId.set(captured); try { task.run(); } finally { if (prev == null) traceId.remove(); else traceId.set(prev); } });
};
ExecutorService pool = Executors.newFixedThreadPool(2);
Executor ctxPool = propagating.apply(pool);
traceId.set("trace-123");
CompletableFuture.supplyAsync(() -> "fare for " + traceId.get(), ctxPool)
    .thenApplyAsync(s -> s + " | priced under " + traceId.get(), ctxPool)
    .thenAccept(System.out::println).join();
pool.shutdown();` },
      { level: "Medium", q: "What's the difference between ThreadLocal and InheritableThreadLocal?",
        a: ["InheritableThreadLocal copies the parent thread's value into a child thread at creation (childValue can transform it).",
          "Plain ThreadLocal starts empty in new threads.",
          "Inheritance happens only at thread creation, so with pools (created once) children keep stale values.",
          "Virtual threads inherit by default; this can be disabled per builder."] },
      { level: "Medium", q: "What are scoped values and how do they improve on ThreadLocal?",
        a: ["ScopedValue (JEP 446 preview in 21, final in 25): a value bound with `where(SV, v).run(...)` visible to code called within that run.",
          "Immutable: no set; nested scopes can rebind temporarily.",
          "Bounded lifetime: binding ends when run/call returns, so no cleanup and no leaks on reused threads.",
          "Efficient lookups and automatic inheritance into StructuredTaskScope subtasks without copying maps, which suits millions of virtual threads."] },
      { level: "Hard", q: "After an incident, logs show user A's requests occasionally processed with user B's tenant id. The code stores tenant in a ThreadLocal set by a filter. Diagnose and fix.",
        a: ["The filter sets the tenant but some path doesn't clear it (exception before cleanup, early return, or cleanup only in the happy path), or some requests don't set it at all and read the leftover value.",
          "Async work may also read a stale value on an executor thread that served another tenant.",
          "Fix: set in try / remove in finally in a single filter that runs for every request; fail closed if the tenant is missing (throw rather than read null/stale).",
          "Propagate explicitly to async work; add a test that sends tenant-less requests after tenant requests on the same thread.",
          "Consider passing tenant explicitly or using ScopedValue."] },
      { level: "Hard", q: "Explain why Spring's @Transactional behaviour changes when you call a repository from a CompletableFuture.supplyAsync inside a transactional method.",
        a: ["Spring binds the transaction's connection/EntityManager to the current thread via ThreadLocals (TransactionSynchronizationManager).",
          "Code running on another thread doesn't see that binding: it runs without the transaction (or opens its own), so it can't see uncommitted changes and isn't rolled back with the outer transaction.",
          "The outer method may even commit before the async work runs.",
          "Fix: keep transactional work on the calling thread, or make the async task its own transactional unit (call a @Transactional bean method), and design for eventual consistency."] },
      { level: "Hard", q: "Design request-context handling for a Java 21 service migrating to virtual threads.",
        steps: ["Inventory ThreadLocal usage: framework holders (security, MDC, transactions) and custom caches.",
          "Remove ThreadLocal caches of expensive objects (virtual threads aren't reused); use shared pools or immutable shared instances.",
          "Keep context small; establish it at the boundary with try/finally cleanup.",
          "For fan-out use structured concurrency, and scoped values (preview in 21, final in 25) for user/tenant/trace so subtasks inherit automatically.",
          "Use Micrometer context-propagation where frameworks still rely on ThreadLocals (MDC, tracing), and test that context appears in async logs."] }
    ],
    recap: [
      "ThreadLocal stores a value per thread in the thread's own map: great for per-thread objects and implicit context.",
      "Pooled threads are reused: set in try, remove in finally, or context and memory leak.",
      "Context doesn't follow work to other threads; capture and restore it (TaskDecorator, context-propagation).",
      "InheritableThreadLocal copies only at thread creation; it doesn't fit pools.",
      "ScopedValue binds immutable context for a call, can't leak, and suits virtual threads and structured concurrency."
    ]
  });
})();
