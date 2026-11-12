/* Lesson J14: Java 21 features: pattern matching, sequenced collections, virtual threads */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Inputs and the results printed by Java 21 for the switch below; the two compile errors are javac 21's messages
  var INPUTS = [
    { label: "new Card(15000, \"4242\")", type: "Card", amt: 15000, out: "card, 3-D Secure required (…4242)" },
    { label: "new Card(500, \"1881\")", type: "Card", amt: 500, out: "card, frictionless (…1881)" },
    { label: "new Upi(3200, \"asha@okbank\")", type: "Upi", vpa: "asha@okbank", out: "UPI, partner bank, ₹3200" },
    { label: "new Upi(900, \"ravi@ybl\")", type: "Upi", vpa: "ravi@ybl", out: "UPI collect request to ravi@ybl" },
    { label: "\"  DEL-BLR \"", type: "String", blank: false, out: "text: DEL-BLR" },
    { label: "\"  \"", type: "String", blank: true, out: "rejected: blank text" },
    { label: "42", type: "Integer", out: "unsupported Integer" },
    { label: "null", type: "null", out: "rejected: null" }
  ];
  var CASES = [
    { src: "case null -> \"rejected: null\";", type: "null" },
    { src: "case Card(int amt, String l4) when amt > 10000 -> \"card, 3-D Secure required (…\" + l4 + \")\";", type: "Card", guard: function (x) { return x.amt > 10000; }, gtxt: "amt > 10000" },
    { src: "case Card c -> \"card, frictionless (…\" + c.last4() + \")\";", type: "Card" },
    { src: "case Upi(var amt, var vpa) when vpa.endsWith(\"@okbank\") -> \"UPI, partner bank, ₹\" + amt;", type: "Upi", guard: function (x) { return /@okbank$/.test(x.vpa); }, gtxt: "vpa.endsWith(\"@okbank\")" },
    { src: "case Upi u -> \"UPI collect request to \" + u.vpa();", type: "Upi" },
    { src: "case String s when s.isBlank() -> \"rejected: blank text\";", type: "String", guard: function (x) { return x.blank; }, gtxt: "s.isBlank()" },
    { src: "case String s -> \"text: \" + s.strip();", type: "String" },
    { src: "default -> \"unsupported \" + o.getClass().getSimpleName();", type: "*" }
  ];
  var VARIANTS = {
    ok: { label: "as written", order: [0, 1, 2, 3, 4, 5, 6, 7] },
    swap: { label: "unguarded Card case first", order: [0, 2, 1, 3, 4, 5, 6, 7], err: "error: this case label is dominated by a preceding case label\n      case Card(int amt, String l4) when amt > 10000 -> …\n           ^", why: "`case Card c` matches every Card, so the guarded Card pattern after it could never be reached. Order cases from most specific to least specific." },
    nodef: { label: "remove default", order: [0, 1, 2, 3, 4, 5, 6], err: "error: the switch expression does not cover all possible input values\n    return switch (o) {\n           ^", why: "The selector is `Object`, an open type, so only `default` (or `case Object o`) can make it exhaustive. Over the sealed `Payment` type, the Card and Upi cases alone would be exhaustive." }
  };
  function switchWidget(el, ctx) {
    var s = ctx.state; if (s.i == null) { s.i = 0; s.v = "ok"; }
    el.innerHTML = "<p>" + ctx.md("A Java 21 pattern `switch` routes payments: **record patterns** take values apart, **guards** (`when`) add conditions, `case null` handles null explicitly. Cases are tried **top to bottom**; the first match wins. Pick an input, or break the switch to see what javac says.") + "</p>" +
      "<div class='seg' data-r='in'>" + INPUTS.map(function (x, i) { return "<button type='button' data-v='" + i + "'>" + ctx.esc(x.label) + "</button>"; }).join("") + "</div>" +
      "<div class='seg' data-r='var' style='margin-top:8px'>" + Object.keys(VARIANTS).map(function (k) { return "<button type='button' data-v='" + k + "'>" + VARIANTS[k].label + "</button>"; }).join("") + "</div>" +
      "<div data-r='src' style='margin-top:12px'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("in").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", +b.dataset.v === s.i); });
      q("var").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.v); });
      var V = VARIANTS[s.v], x = INPUTS[s.i], matched = -1, notes = {};
      if (!V.err) V.order.forEach(function (ci) {
        if (matched >= 0) { notes[ci] = "not tried"; return; }
        var c = CASES[ci];
        if (c.type === "*") { if (x.type !== "null") { matched = ci; notes[ci] = "✓ matches"; } return; }
        if (c.type !== x.type) { notes[ci] = "✗ type doesn't match"; return; }
        if (c.guard && !c.guard(x)) { notes[ci] = "✗ type matches, guard " + c.gtxt + " is false"; return; }
        matched = ci; notes[ci] = "✓ matches" + (c.guard ? " (guard true)" : "");
      });
      var rows = ["static String route(Object o) {", "    return switch (o) {"].map(function (l) { return "<div>" + ctx.H.highlight(l) + "</div>"; });
      V.order.forEach(function (ci) {
        var hit = ci === matched;
        rows.push("<div style='display:flex;gap:12px;align-items:baseline;padding:0 6px;border-radius:4px;" + (hit ? "background:var(--accent-subtle);outline:1px solid var(--accent)" : "") + "'><span style='flex:1'>" + ctx.H.highlight("        " + CASES[ci].src) + "</span><small style='white-space:nowrap;color:var(--text-2)'>" + ctx.esc(notes[ci] || "") + "</small></div>");
      });
      rows.push("<div>" + ctx.H.highlight("    };\n}") + "</div>");
      q("src").innerHTML = "<pre class='code' style='white-space:pre-wrap'>" + rows.join("") + "</pre>";
      q("res").innerHTML = V.err ? "<pre class='code'>" + ctx.esc(V.err) + "</pre>" + ctx.md(V.why) : ctx.md("`route(" + x.label + ")` returns `\"" + x.out + "\"`." + (x.type === "null" ? " Without `case null`, a null selector throws `NullPointerException` (as switch always did)." : ""));
    }
    q("in").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.i = +b.dataset.v; ctx.save(); draw(); });
    q("var").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.v = b.dataset.v; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Java 21 at a glance",
      text: "Java 21 (September 2023) is the LTS most teams are moving to after 17, and Spring Boot 3.2+ makes good use of it. It finalised **pattern matching for switch** and **record patterns** (completing the data-oriented features from J13), added **sequenced collections**, and shipped **virtual threads**, the biggest change to Java concurrency in decades. Several APIs arrived as previews and have since evolved (Java 25 is the next LTS).",
      table: [
        ["Feature", "JEP", "Status in 21", "What it gives you"],
        ["Pattern matching for switch", "441", "Final", "`case Type t when cond ->`, `case null`, exhaustive over sealed types"],
        ["Record patterns", "440", "Final", "`case Card(int amt, var last4)`, nested deconstruction"],
        ["Sequenced collections", "431", "Final", "`getFirst`, `getLast`, `reversed`, `addFirst` across List/Deque/LinkedHashSet/LinkedHashMap"],
        ["Virtual threads", "444", "Final", "Millions of cheap threads for blocking I/O code"],
        ["Unnamed patterns and variables `_`", "443", "Preview (final in 22)", "Ignore components and unused variables"],
        ["Structured concurrency, scoped values", "453, 446", "Preview", "Task scopes and immutable per-request context"],
        ["String templates", "430", "Preview (withdrawn in 23)", "Removed; use `formatted` / builders"]] },
    { title: "Pattern matching for switch",
      text: "`switch` now accepts any reference type and **type patterns** as labels: `case Card c ->`. Cases are tried top to bottom; **guards** (`case String s when s.isBlank()`) refine a pattern; `case null` handles null explicitly (otherwise null still throws NPE). A pattern switch must be **exhaustive**, and the compiler rejects **dominated** labels (a case that can never match because an earlier one covers it). This replaces long `if (x instanceof A a) … else if …` chains.",
      code: `static String describe(Object o) {
    return switch (o) {
        case null -> "null!";
        case Integer i when i > 1000 -> "big number " + i;
        case Integer i -> "number " + i;
        case String s when s.isBlank() -> "blank string";
        case String s -> "string of length " + s.length();
        case int[] arr -> "int array of " + arr.length;
        case List<?> l -> "list with " + l.size() + " items";
        default -> "something else: " + o.getClass().getSimpleName();
    };
}
for (Object o : new Object[]{4850, 7, " ", "DEL", new int[3], List.of(1, 2), 3.5, null}) System.out.print(describe(o) + " | ");`,
      points: ["Old-style `case` constants still work and mix with patterns for enums and strings", "Put specific (guarded) cases before general ones, or javac reports \"dominated by a preceding case label\""] },
    { title: "Exhaustiveness with sealed types",
      text: "Over a **sealed** hierarchy, a switch that covers every permitted subtype is exhaustive **without** `default`. That's the key benefit: when someone adds a new subtype, every such switch stops compiling until it's handled. Keep `default` out of these switches so you don't lose that safety net. If a class file changes without recompiling the switch, the compiler-inserted fallback throws `MatchException` at runtime.",
      m: M(["flowchart LR",
        "  S[\"sealed interface Shape\"]:::s0 --> C[\"record Circle\"]:::s1",
        "  S --> R[\"record Rect\"]:::s1",
        "  S --> T[\"record Triangle (new!)\"]:::s4",
        "  SW[\"switch (shape)<br/>case Circle, case Rect\"]:::bad -.->|\"compile error: not exhaustive\"| T",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s4 fill:#fff3e0,stroke:#ef6c00", "  classDef bad fill:#fdecea,stroke:#c62828"]),
      code: `sealed interface Shape permits Circle, Rect, Triangle {}
record Circle(double r) implements Shape {}
record Rect(double w, double h) implements Shape {}
record Triangle(double b, double h) implements Shape {}

static double area(Shape s) {
    return switch (s) {                       // no default: exhaustive over the sealed type
        case Circle c -> Math.PI * c.r() * c.r();
        case Rect r -> r.w() * r.h();
        case Triangle t -> 0.5 * t.b() * t.h();   // remove this line and javac reports the switch isn't exhaustive
    };
}
System.out.printf("%.2f %.1f %.1f%n", area(new Circle(1)), area(new Rect(2, 3)), area(new Triangle(4, 5)));` },
    { title: "Record patterns and nested deconstruction",
      text: "A **record pattern** `Card(int amount, String last4)` matches a record and binds its components in one step, in both `instanceof` and `switch`. Patterns **nest**: `Booking(var pnr, Flight(var no, Route(var from, var to)))` reaches deep into a structure. Use `var` for component types. Combined with sealed types this gives concise, type-safe processing of tree-shaped data (events, ASTs, API responses).",
      code: `record Route(String from, String to) {}
record Flight(String no, Route route) {}
record Booking(String pnr, Flight flight, int pax) {}
Object o = new Booking("P1", new Flight("6E-201", new Route("DEL", "BLR")), 2);

if (o instanceof Booking(var pnr, Flight(var no, Route(var from, var to)), var pax))
    System.out.println(pnr + ": " + pax + " pax on " + no + " " + from + "→" + to);

static String fareRule(Booking b) {
    return switch (b) {
        case Booking(var p, Flight(var no, Route(var from, var to)), var pax) when from.equals(to) -> "invalid route";
        case Booking(var p, Flight(var no, Route(var from, var to)), var pax) when pax > 9 -> "group desk for " + p;
        case Booking(var p, Flight(var no, Route(String from, String to)), var pax) -> p + " standard fare " + from + "-" + to;
    };
}
System.out.println(fareRule(new Booking("P2", new Flight("AI-505", new Route("BOM", "GOI")), 12)) + " | " + fareRule((Booking) o));`,
      points: ["Generic records infer type arguments: `case Box(var v)` on a `Box<String>`", "Java 22 adds `_` to ignore components: `case Booking(var p, _, var pax)`"] },
    { title: "Data-oriented programming in Java 21",
      text: "Records model data, sealed interfaces model choices, pattern switches model operations over them. Logic that used to be spread across a class hierarchy (visitor pattern, `instanceof` chains) becomes one readable, compiler-checked function per operation. Use it for domain events, commands, API results, state machines and expression trees; keep classic OOP polymorphism where behaviour truly belongs with the type.",
      code: `sealed interface Expr permits Num, Add, Mul, Neg {}
record Num(int v) implements Expr {}
record Add(Expr l, Expr r) implements Expr {}
record Mul(Expr l, Expr r) implements Expr {}
record Neg(Expr e) implements Expr {}

static int eval(Expr e) {
    return switch (e) {
        case Num n -> n.v();
        case Add(var l, var r) -> eval(l) + eval(r);
        case Mul(var l, var r) -> eval(l) * eval(r);
        case Neg(var x) -> -eval(x);
    };
}
static String show(Expr e) {
    return switch (e) {
        case Num n -> String.valueOf(n.v());
        case Add(var l, var r) -> "(" + show(l) + " + " + show(r) + ")";
        case Mul(Num(var a), Num(var b)) when a == 1 -> show(new Num(b));     // nested pattern + guard: 1 * x → x
        case Mul(var l, var r) -> show(l) + " * " + show(r);
        case Neg(var x) -> "-" + show(x);
    };
}
Expr fare = new Add(new Mul(new Num(1), new Num(4850)), new Neg(new Num(500)));
System.out.println(show(fare) + " = " + eval(fare));`,
      analogy: "OOP puts each operation inside every type (each shape knows its area). Data-oriented code puts each operation in one place that knows every type (one area function for all shapes). Sealed types make the second style safe." },
    { title: "Sequenced collections",
      text: "Before 21, \"first\" and \"last\" had different spellings everywhere: `list.get(0)`, `deque.peekFirst()`, `sortedSet.first()`, `linkedHashSet.iterator().next()`, and no easy last element of a `LinkedHashSet`. Java 21 adds `SequencedCollection` (`getFirst`, `getLast`, `addFirst`, `addLast`, `removeFirst`, `removeLast`, `reversed()`), `SequencedSet` and `SequencedMap` (`firstEntry`, `lastEntry`, `pollFirstEntry`, `putFirst`, `sequencedKeySet`…), implemented by `List`, `Deque`, `LinkedHashSet`, `SortedSet`, `LinkedHashMap` and `SortedMap`.",
      m: M(["flowchart TB",
        "  SC[\"SequencedCollection<br/>getFirst · getLast · reversed\"]:::s2 --> L[\"List\"]:::s1",
        "  SC --> D[\"Deque\"]:::s1",
        "  SC --> SS[\"SequencedSet\"]:::s2",
        "  SS --> LHS[\"LinkedHashSet\"]:::s1",
        "  SS --> SOS[\"SortedSet / TreeSet\"]:::s1",
        "  SM[\"SequencedMap<br/>firstEntry · lastEntry · putFirst\"]:::s2 --> LHM[\"LinkedHashMap\"]:::s1",
        "  SM --> SOM[\"SortedMap / TreeMap\"]:::s1",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `List<String> legs = new ArrayList<>(List.of("DEL-BOM", "BOM-GOI", "GOI-BLR"));
System.out.println(legs.getFirst() + " … " + legs.getLast() + " | reversed view " + legs.reversed());
legs.addFirst("CCU-DEL");
legs.removeLast();
System.out.println(legs);

LinkedHashSet<String> recent = new LinkedHashSet<>(List.of("DEL", "BOM", "BLR"));
System.out.println(recent.getLast() + " " + recent.reversed());          // last of a LinkedHashSet: finally easy
recent.addFirst("GOI");
System.out.println(recent);

LinkedHashMap<String, Integer> fares = new LinkedHashMap<>();
fares.put("DEL-BLR", 4850); fares.put("BOM-GOI", 3200);
fares.putFirst("CCU-DEL", 6100);
System.out.println(fares.firstEntry() + " " + fares.lastEntry() + " " + fares.reversed() + " " + fares.sequencedKeySet().reversed());`,
      points: ["`reversed()` is a live view, not a copy", "Unmodifiable lists (`List.of`) throw on `addFirst`/`removeLast`"] },
    { title: "Virtual threads: the idea",
      text: "A classic (platform) thread maps 1:1 to an OS thread: about 1 MB of stack reserved, expensive to create, and a few thousand per JVM. Thread-per-request servers block a whole OS thread on every DB or HTTP call. A **virtual thread** is a lightweight thread managed by the JVM: it runs *mounted* on a small pool of carrier threads, and when it blocks on I/O, the JVM **unmounts** it, freeing the carrier for other work. You keep simple blocking code and get the scalability of async code. Details, pinning and best practices are in the multithreading module (J25).",
      m: M(["flowchart TB",
        "  V1[\"virtual thread 1<br/>(waiting on DB)\"]:::s0",
        "  V2[\"virtual thread 2<br/>(running)\"]:::s2",
        "  V3[\"virtual thread 3<br/>(running)\"]:::s2",
        "  V4[\"… 100,000 more\"]:::s0",
        "  V2 --> C1[\"carrier thread 1 (OS thread)\"]:::s1",
        "  V3 --> C2[\"carrier thread 2 (OS thread)\"]:::s1",
        "  V1 -.->|\"unmounted: stack saved on heap\"| H[\"heap\"]:::s4",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `long t0 = System.nanoTime();
try (ExecutorService exec = Executors.newVirtualThreadPerTaskExecutor()) {    // one new virtual thread per task
    List<Future<Integer>> results = new ArrayList<>();
    for (int i = 0; i < 10_000; i++) {
        int id = i;
        results.add(exec.submit(() -> { Thread.sleep(100); return id; }));    // blocking sleep: the carrier is released
    }
    long sum = 0;
    for (Future<Integer> f : results) sum += f.get();
    System.out.println("10,000 blocking tasks, sum " + sum + " in " + (System.nanoTime() - t0) / 1_000_000 + " ms");
}
Thread vt = Thread.ofVirtual().name("booking-", 1).start(() -> System.out.println(Thread.currentThread().isVirtual() + " " + Thread.currentThread().getName()));
vt.join();`,
      points: ["With 10,000 platform threads sleeping 100 ms you'd need 10,000 OS threads; with a fixed pool of 200 it would take ~5 s", "Spring Boot 3.2+: `spring.threads.virtual.enabled=true` runs request handling on virtual threads"] },
    { title: "Virtual threads: when they help (and when not)",
      text: "Virtual threads raise **throughput** for workloads that spend most of their time **waiting** (HTTP calls, JDBC, messaging), letting one thread per request scale to tens of thousands of concurrent requests. They don't make CPU-bound work faster, and they're not a reason to pool threads: create one per task. Watch out for **pinning** (in Java 21, blocking inside `synchronized` keeps the carrier occupied; fixed in Java 24), `ThreadLocal`-heavy code (millions of threads × caches), and downstream limits (a DB pool of 20 connections still allows only 20 queries at a time: use a `Semaphore`).",
      table: [
        ["Situation", "Virtual threads?"],
        ["Thread-per-request web app calling DBs/APIs", "Yes: the main use case"],
        ["Fan-out to many slow HTTP calls", "Yes, with a limit (Semaphore) per downstream"],
        ["CPU-bound computation (image processing, parsing)", "No: use a platform pool sized to cores"],
        ["Code holding `synchronized` locks while blocking (Java 21)", "Careful: pinning; use `ReentrantLock` or Java 24+"],
        ["Pooling virtual threads", "Never: they're cheap, create per task"],
        ["Reactive code already non-blocking", "Optional: simpler code is the benefit"]] },
    { title: "Previews in 21 and what happened next",
      text: "Java 21 also previewed features you'll see in articles and newer code. **Unnamed variables and patterns** (`_`) became final in Java 22. **Scoped values** (immutable, inheritable per-task context; a better `ThreadLocal` for virtual threads) became final in Java 25. **Structured concurrency** (`StructuredTaskScope`: fork subtasks, join them as a unit, cancel siblings on failure) is still a preview in 25. **String templates** were withdrawn in Java 23. Preview features need `--enable-preview` and may change, so avoid them in production code.",
      code: `// Java 21 without preview: what structured concurrency simplifies
record Quote(String airline, int fare) {}
try (ExecutorService exec = Executors.newVirtualThreadPerTaskExecutor()) {
    Future<Quote> a = exec.submit(() -> { Thread.sleep(50); return new Quote("6E", 4850); });
    Future<Quote> b = exec.submit(() -> { Thread.sleep(80); return new Quote("AI", 5300); });
    Quote best = Stream.of(a.get(), b.get()).min(Comparator.comparingInt(Quote::fare)).orElseThrow();
    System.out.println("best " + best);            // if one call failed, the other would keep running: scopes fix that
}
// Java 25 with --enable-preview (shape of the API; still evolving):
// try (var scope = StructuredTaskScope.open()) {
//     var a = scope.fork(() -> quote("6E"));
//     var b = scope.fork(() -> quote("AI"));
//     scope.join();                                   // waits for both; cancels the other if one fails
//     return min(a.get(), b.get());
// }
// Unnamed variables (final in Java 22):  for (var _ : list) count++;   case Booking(var pnr, _, _) -> pnr;`,
      points: ["`ScopedValue.where(USER, u).run(() -> …)` replaces many `ThreadLocal` uses (final in 25)"] },
    { title: "Other notable 21 changes",
      text: "**Generational ZGC** (`-XX:+UseZGC -XX:+ZGenerational`, default generational from 23) gives sub-millisecond pauses with better throughput. **Key encapsulation (KEM) API** for post-quantum-ready crypto. `String`/`StringBuilder` got `indexOf(ch, from, to)` and `repeat`; `Character.isEmoji`; `Math.clamp`; `StringBuilder.repeat`; `HttpClient` became `AutoCloseable`; dynamic agent loading now warns. Plus every improvement since 17: `ExecutorService` is `AutoCloseable` (19), `HashMap.newHashMap(n)` (19), UTF-8 is the default charset (18), simple web server `jwebserver` (18).",
      code: `System.out.println(Math.clamp(12_500, 1_000, 10_000) + " " + Math.clamp(-5, 0, 9));
StringBuilder sb = new StringBuilder().repeat("=", 10).repeat('*', 3);
System.out.println(sb + " " + "DEL-BLR-DEL".indexOf('-', 4, 11));
System.out.println(java.nio.charset.Charset.defaultCharset() + " " + Character.isEmoji("✈".codePointAt(0)));
var m = HashMap.<String, Integer>newHashMap(100);       // sized for 100 entries without resizing
m.put("DEL", 1);
System.out.println(m);`,
      points: ["Upgrading 17 → 21 is usually smooth: few removals, mostly new features"] },
    { title: "Adopting Java 21 in a codebase",
      text: "Start by running on 21 (performance and GC gains for free), then adopt features where they pay off: pattern switches over sealed result/event types, record patterns in mapping code, sequenced-collection methods instead of `get(0)`/`get(size() - 1)`, and virtual threads for blocking I/O services (benchmark, check for pinning with `-Djdk.tracePinnedThreads=full` on 21, and protect downstreams with limits). Avoid preview APIs in production. Keep the build on `--release 21` and update libraries that use bytecode tricks (Mockito, Byte Buddy, Lombok).",
      table: [
        ["Change", "Benefit", "Risk"],
        ["Run on 21", "GC/JIT improvements", "Library compatibility; test first"],
        ["Pattern switch + sealed", "Exhaustive, readable branching", "Team familiarity"],
        ["Sequenced collections", "Clearer first/last code", "None"],
        ["Virtual threads", "Throughput for I/O-bound services", "Pinning on 21, ThreadLocal growth, overloaded downstreams"],
        ["Preview features", "Try the future", "API changes; needs --enable-preview"]] }
  ];

  H.registerLesson({
    code: "J14",
    summary: "What Java 21 (LTS) adds on top of 17: pattern matching for `switch` (type patterns, guards with `when`, `case null`, dominance and exhaustiveness), exhaustive switches over sealed hierarchies, record patterns and nested deconstruction, data-oriented programming, sequenced collections (`getFirst`, `getLast`, `reversed`, `putFirst`), virtual threads (idea, when they help, pinning), the 21 previews and what became of them (unnamed `_`, scoped values, structured concurrency, string templates), other notable 21 APIs, and how to adopt 21 in a codebase.",
    slides: SLIDES,
    widget: { heading: "Interactive: step through a pattern switch", caption: "Pick an input to see which case matches and why the others didn't; results are what Java 21 returned. The two broken variants show javac 21's actual error messages.", render: switchWidget },
    examplesHeading: "Where Java 21 features show up at work",
    examples: [
      ["Event handling", "`switch (event) { case Booked b -> …; case Cancelled(var pnr, var reason) -> …; }` over a sealed event type in Kafka consumers."],
      ["API results", "Sealed `Result`/`Outcome` types processed with exhaustive switches in service layers."],
      ["Payment routing", "Guards in pattern switches for amount thresholds, providers and fallbacks."],
      ["Web services", "Spring Boot 3.2+ with `spring.threads.virtual.enabled=true` for blocking JDBC/HTTP-heavy apps."],
      ["Recent-items UIs", "`LinkedHashSet.getLast`/`reversed` for recent searches, `LinkedHashMap.pollFirstEntry` for eviction."],
      ["Code review", "Spotting `default` branches that defeat sealed exhaustiveness, and `synchronized` blocking calls on virtual threads."]
    ],
    pitfalls: [
      "Ordering a general case before a guarded specific case (dominance error)",
      "Adding `default` to switches over sealed types (hides new subtypes)",
      "Forgetting that null still throws NPE without `case null`",
      "Pooling virtual threads or using them for CPU-bound work",
      "Blocking inside `synchronized` on virtual threads in Java 21 (pinning)",
      "Unbounded fan-out to a downstream with virtual threads (no Semaphore)",
      "Heavy `ThreadLocal` caches with millions of virtual threads",
      "Using preview APIs (structured concurrency, string templates) in production",
      "Assuming `reversed()` returns a copy"
    ],
    quiz: [
      { q: "What does `case String s when s.isBlank() ->` mean?", options: ["Matches any String", "Matches Strings for which the guard is true", "A compile error", "Matches null"], answer: 1, why: "`when` adds a guard to the pattern." },
      { q: "Without `case null`, `switch (o)` with o == null…", options: ["Goes to default", "Throws NullPointerException", "Returns null", "Matches the first case"], answer: 1, why: "Same as before; `case null` opts in." },
      { q: "Why does javac reject `case Card c -> …` followed by `case Card(int a, var l) when a > 10000 -> …`?", options: ["Records can't be in switch", "The second label is dominated by the first", "Guards are not allowed", "Missing default"], answer: 1, why: "It could never match." },
      { q: "A switch over a sealed interface covering all permitted records…", options: ["Needs default", "Is exhaustive without default", "Only works with enums", "Must use instanceof"], answer: 1, why: "The compiler knows the closed set." },
      { q: "What does `if (o instanceof Point(var x, var y))` do?", options: ["Creates a Point", "Matches a Point record and binds its components", "Compares references", "Requires a cast"], answer: 1, why: "A record pattern." },
      { q: "Which method gets the last element of a LinkedHashSet in Java 21?", options: ["last()", "getLast()", "peekLast()", "get(size()-1)"], answer: 1, why: "SequencedCollection." },
      { q: "Virtual threads mainly improve…", options: ["CPU-bound speed", "Throughput of I/O-bound, blocking workloads", "GC pauses", "Startup time"], answer: 1, why: "Waiting no longer ties up an OS thread." },
      { q: "In Java 21, a virtual thread blocking inside a `synchronized` block…", options: ["Unmounts normally", "Pins its carrier thread", "Throws", "Deadlocks always"], answer: 1, why: "Fixed in Java 24 (JEP 491)." },
      { q: "What happened to string templates?", options: ["Final in 21", "Withdrawn in Java 23", "Final in 25", "Renamed text blocks"], answer: 1, why: "Removed for redesign." }
    ],
    cheatsheet: {
      table: [
        ["Feature", "Syntax"],
        ["Type pattern case", "`case Card c -> …`"],
        ["Guard", "`case Card c when c.amount() > 10000 -> …`"],
        ["Null", "`case null -> …` / `case null, default -> …`"],
        ["Record pattern", "`case Card(int amt, var last4) -> …`"],
        ["Nested", "`case Booking(var p, Flight(var no, var r), var pax) -> …`"],
        ["Sequenced", "`getFirst()`, `getLast()`, `reversed()`, `addFirst`, `putFirst`, `firstEntry()`"],
        ["Virtual threads", "`Executors.newVirtualThreadPerTaskExecutor()`, `Thread.ofVirtual().start(r)`"],
        ["Spring Boot", "`spring.threads.virtual.enabled=true` (3.2+)"]],
      cards: [
        { title: "Pattern switch rules", items: ["Top to bottom, first match wins", "Specific before general", "Exhaustive (sealed or default)", "No default for sealed types"] },
        { title: "Virtual threads", items: ["For blocking I/O", "One per task, never pooled", "Limit downstream concurrency", "Pinning in 21 with synchronized"] },
        { title: "Say in interviews", items: ["Data-oriented programming", "Sealed + records + switch", "Sequenced collections fix first/last", "Previews: scoped values (final 25), structured concurrency"] }]
    },
    practice: [
      { level: "Easy", q: "What is pattern matching for switch? Give an example with a guard.",
        code: `static String classify(Object o) {
    return switch (o) {
        case Integer i when i < 0 -> "negative";
        case Integer i -> "int " + i;
        case String s when s.length() == 3 -> "airport code " + s;
        case String s -> "text";
        case null, default -> "other";
    };
}
System.out.println(classify(-1) + ", " + classify(7) + ", " + classify("DEL") + ", " + classify("hello") + ", " + classify(null));`,
        a: ["`switch` can test the selector's type with patterns (`case Integer i`) and bind a variable, instead of only matching constants.",
          "Guards (`when`) refine a pattern; cases are checked top to bottom.",
          "`case null, default` handles null and everything else together; a pattern switch must be exhaustive."] },
      { level: "Easy", q: "What are sequenced collections and which problem do they solve?",
        a: ["Java 21 interfaces `SequencedCollection`, `SequencedSet`, `SequencedMap` give every ordered collection a uniform API: `getFirst`, `getLast`, `addFirst`, `addLast`, `removeFirst`, `removeLast`, `reversed()`; maps add `firstEntry`, `lastEntry`, `pollFirstEntry`, `putFirst`, `putLast`.",
          "Before, each type had its own spelling (`get(0)`, `peekFirst`, `first()`, iterator tricks) and some operations were missing (last element of a `LinkedHashSet`, reverse iteration of a `LinkedHashMap`).",
          "Implemented by List, Deque, LinkedHashSet, SortedSet, LinkedHashMap, SortedMap; `reversed()` returns a view."] },
      { level: "Easy", q: "What are virtual threads? How are they different from platform threads?",
        a: ["Virtual threads are lightweight `java.lang.Thread` instances scheduled by the JVM onto a small pool of carrier (platform) threads.",
          "Platform threads are 1:1 with OS threads: large stacks, expensive to create, limited to thousands.",
          "When a virtual thread blocks on I/O or `sleep`, it unmounts and its stack is stored on the heap, so millions can wait concurrently while carriers keep running other work.",
          "Same programming model (blocking code, `Thread`, `ExecutorService`); best for I/O-bound concurrency."] },
      { level: "Medium", q: "Rewrite an instanceof chain over a sealed type as an exhaustive pattern switch with record patterns.",
        qcode: `if (p instanceof Card) { Card c = (Card) p; fee = c.amount() * 2 / 100; }
else if (p instanceof Upi) { fee = 0; }
else if (p instanceof Wallet) { Wallet w = (Wallet) p; fee = w.provider().equals("PAYTM") ? 5 : 10; }
else throw new IllegalStateException();`,
        qNoCompile: true,
        code: `sealed interface Payment permits Card, Upi, Wallet {}
record Card(int amount, String last4) implements Payment {}
record Upi(int amount, String vpa) implements Payment {}
record Wallet(int amount, String provider) implements Payment {}

static int fee(Payment p) {
    return switch (p) {
        case Card(var amount, var last4) -> amount * 2 / 100;
        case Upi u -> 0;
        case Wallet(var amount, var provider) when provider.equals("PAYTM") -> 5;
        case Wallet w -> 10;
    };
}
System.out.println(List.of(new Card(5000, "4242"), new Upi(3200, "a@ok"), new Wallet(800, "PAYTM"), new Wallet(800, "OTHER")).stream().map(p -> fee(p)).toList());`,
        a: ["No casts and no unreachable `else throw`: the compiler proves the switch covers Card, Upi and Wallet.",
          "Adding a fourth payment type makes this method fail to compile until handled.",
          "Guarded `Wallet` case precedes the unguarded one (dominance)."] },
      { level: "Medium", q: "Explain dominance and exhaustiveness in pattern switches with examples.",
        a: ["**Dominance**: a case label is dominated if an earlier label matches everything it matches. `case CharSequence cs` before `case String s`, or `case Card c` before `case Card c when …`, is a compile error.",
          "Constant labels must come before a type pattern of the same type (`case \"DEL\"` before `case String s`).",
          "**Exhaustiveness**: a pattern switch (statement or expression) must cover every possible value: via `default`, a total pattern (`case Object o`), all enum constants, or all permitted subtypes of a sealed type.",
          "Null is separate: it's only matched by `case null`; otherwise it throws NPE."] },
      { level: "Medium", q: "Implement a tiny state machine for a booking with sealed states and a pattern switch.",
        code: `sealed interface State permits Held, Paid, Ticketed, Cancelled {}
record Held(String pnr, long expiresAt) implements State {}
record Paid(String pnr, int amount) implements State {}
record Ticketed(String pnr, String eticket) implements State {}
record Cancelled(String pnr, String reason) implements State {}
sealed interface Cmd permits Pay, Issue, Cancel {}
record Pay(int amount) implements Cmd {}
record Issue() implements Cmd {}
record Cancel(String reason) implements Cmd {}

static State apply(State s, Cmd c, long now) {
    return switch (s) {
        case Held h when now > h.expiresAt() -> new Cancelled(h.pnr(), "hold expired");
        case Held h when c instanceof Pay(var amt) -> new Paid(h.pnr(), amt);
        case Paid p when c instanceof Issue -> new Ticketed(p.pnr(), "ET-" + p.pnr());
        case Held h when c instanceof Cancel(var r) -> new Cancelled(h.pnr(), r);
        case Paid p when c instanceof Cancel(var r) -> new Cancelled(p.pnr(), r + " (refund " + p.amount() + ")");
        case Ticketed t -> t;                                 // terminal states ignore commands
        case Cancelled x -> x;
        default -> throw new IllegalStateException(s.getClass().getSimpleName() + " can't handle " + c);
    };
}
State s = new Held("P1", 100);
for (Cmd c : List.of(new Pay(4850), new Issue())) s = apply(s, c, 50);
System.out.println(s + " | " + apply(new Held("P2", 10), new Pay(1), 50) + " | " + apply(new Paid("P3", 3200), new Cancel("user"), 0));`,
        a: ["States and commands are records in sealed hierarchies; the transition function is one switch.",
          "Guards combine state and command (`c instanceof Pay(var amt)` inside `when`).",
          "A `default` is needed here because guarded cases don't count toward exhaustiveness for `Held` and `Paid`; invalid transitions fail loudly."] },
      { level: "Medium", q: "Use sequenced collections to implement \"recent searches\" (most recent first, no duplicates, max 3).",
        code: `final class RecentSearches {
    private final LinkedHashSet<String> items = new LinkedHashSet<>();
    void add(String q) {
        items.remove(q);
        items.addLast(q);                                   // newest at the end
        if (items.size() > 3) items.removeFirst();          // evict the oldest
    }
    List<String> newestFirst() { return List.copyOf(items.reversed()); }
}
RecentSearches r = new RecentSearches();
for (String q : List.of("DEL-BLR", "BOM-GOI", "DEL-BLR", "CCU-DEL", "MAA-HYD")) r.add(q);
System.out.println(r.newestFirst());`,
        a: ["`LinkedHashSet` keeps insertion order and uniqueness; re-adding moves an item to the end.",
          "Java 21's `removeFirst()` and `reversed()` replace iterator gymnastics.",
          "`List.copyOf` returns an immutable snapshot rather than the live reversed view."] },
      { level: "Hard", q: "When would you NOT use virtual threads? What is pinning?",
        a: ["Not for CPU-bound work (no more cores appear; use a platform pool sized to cores or parallel streams).",
          "Not as a pool: never `Executors.newFixedThreadPool(n, virtualFactory)` to limit concurrency; use a `Semaphore` around the scarce resource instead.",
          "Pinning: in Java 21 a virtual thread that blocks while inside `synchronized` (or a native frame) can't unmount, so it holds its carrier thread; with few carriers this can stall the app. Diagnose with `-Djdk.tracePinnedThreads=full` or JFR `jdk.VirtualThreadPinned`; fix by using `ReentrantLock` or upgrading to Java 24+, where `synchronized` no longer pins.",
          "Beware of `ThreadLocal`-based caches (one per thread becomes millions) and libraries that assume a small, fixed number of threads."] },
      { level: "Hard", q: "Call three fare providers concurrently with virtual threads, with a timeout and a cap on concurrent calls.",
        code: `record Quote(String provider, int fare) {}
Semaphore permits = new Semaphore(2);                          // downstream allows 2 concurrent calls
Function<String, Quote> callProvider = name -> {
    try {
        permits.acquire();
        try { Thread.sleep(name.equals("slowAir") ? 2_000 : 100); return new Quote(name, name.length() * 900); }
        finally { permits.release(); }
    } catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException("cancelled"); }
};
try (ExecutorService exec = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<Quote>> fs = Stream.of("6E", "AirIndia", "slowAir").map(n -> exec.submit(() -> callProvider.apply(n))).toList();
    List<Quote> got = new ArrayList<>();
    for (Future<Quote> f : fs) {
        try { got.add(f.get(500, TimeUnit.MILLISECONDS)); }
        catch (TimeoutException e) { f.cancel(true); }                 // interrupt the slow call
        catch (ExecutionException e) { /* log and skip */ }
    }
    System.out.println(got.stream().min(Comparator.comparingInt(Quote::fare)).map(Quote::toString).orElse("no quotes") + " from " + got.size() + " providers");
}`,
        a: ["One virtual thread per call keeps code blocking-style and cheap.",
          "A `Semaphore` limits concurrent calls to a downstream regardless of how many virtual threads exist.",
          "`Future.get(timeout)` + `cancel(true)` interrupts stragglers; `close()` on the executor waits for remaining tasks.",
          "Structured concurrency (preview) would express \"fork, join with deadline, cancel the rest\" as one scope."] },
      { level: "Hard", q: "Compare the visitor pattern with sealed types + pattern switch for operations over a type hierarchy.",
        a: ["**Visitor**: double dispatch via `accept(visitor)`; adding an operation means a new visitor class; adding a type means changing the visitor interface and every implementation. Lots of boilerplate, but works on any Java version.",
          "**Sealed + switch**: each operation is a function with an exhaustive switch; adding an operation is one new method; adding a type makes the compiler flag every switch that must handle it. Record patterns make nested data easy to destructure.",
          "Both are closed-world approaches (the set of types is fixed); open hierarchies with behaviour on the types (classic polymorphism) remain better when new types are added often by other teams/plugins.",
          "In Java 21 the sealed approach is usually clearer for data (events, ASTs, DTO variants)."] }
    ],
    recap: [
      "Java 21 finalises pattern matching for switch: type patterns, guards (`when`), `case null`, dominance checks and exhaustiveness.",
      "Over sealed hierarchies, switches are exhaustive without `default`; record patterns destructure (and nest) in one step.",
      "Records + sealed + switch = data-oriented programming: one compiler-checked function per operation.",
      "Sequenced collections give a uniform first/last/reversed API across lists, deques, linked and sorted sets and maps.",
      "Virtual threads make blocking I/O code scale; avoid for CPU work, never pool them, mind pinning (21) and downstream limits; previews evolved after 21."
    ]
  });
})();
