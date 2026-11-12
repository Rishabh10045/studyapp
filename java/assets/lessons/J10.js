/* Lesson J10: Lambdas & functional interfaces */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  var OPS = {
    strip: { java: "String::strip", label: "strip", fn: function (s) { return s.trim(); } },
    upper: { java: "String::toUpperCase", label: "upper", fn: function (s) { return s.toUpperCase(); } },
    arrow: { java: "s -> s.replace(\"-\", \" → \")", label: "arrow", fn: function (s) { return s.split("-").join(" → "); } },
    wrap: { java: "s -> \"[\" + s + \"]\"", label: "wrap", fn: function (s) { return "[" + s + "]"; } }
  };
  // Outputs printed by Java 21 for each reference (see caption)
  var REFS = [
    { kind: "Static method", ref: "Integer::parseInt", lam: "s -> Integer.parseInt(s)", type: "Function<String, Integer>", call: "f.apply(\"4850\")", out: "4850" },
    { kind: "Bound instance (specific object)", ref: "\"DEL\"::equals", lam: "s -> \"DEL\".equals(s)", type: "Predicate<String>", call: "f.test(\"BOM\")", out: "false" },
    { kind: "Unbound instance (first arg is the receiver)", ref: "String::toUpperCase", lam: "s -> s.toUpperCase()", type: "UnaryOperator<String>", call: "f.apply(\"goi\")", out: "GOI" },
    { kind: "Unbound, two arguments", ref: "String::compareTo", lam: "(a, b) -> a.compareTo(b)", type: "Comparator<String>", call: "f.compare(\"BLR\", \"BOM\")", out: "-3" },
    { kind: "Constructor (no args)", ref: "ArrayList::new", lam: "() -> new ArrayList<>()", type: "Supplier<List<String>>", call: "f.get()", out: "[]" },
    { kind: "Constructor (one arg)", ref: "StringBuilder::new", lam: "s -> new StringBuilder(s)", type: "Function<String, StringBuilder>", call: "f.apply(\"DEL\").reverse()", out: "LED" },
    { kind: "Array constructor", ref: "String[]::new", lam: "n -> new String[n]", type: "IntFunction<String[]>", call: "f.apply(3).length", out: "3" }
  ];
  function lambdaWidget(el, ctx) {
    var s = ctx.state; if (!s.mode) { s.mode = "compose"; s.seq = ["wrap", "strip", "upper"]; s.how = "andThen"; s.ref = 2; }
    el.innerHTML = "<div class='seg' data-r='mode'><button type='button' data-m='compose'>Compose functions</button><button type='button' data-m='refs'>Method reference ↔ lambda</button></div><div data-r='body' style='margin-top:12px'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function seg() { q("mode").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.m === s.mode); b.setAttribute("aria-pressed", b.dataset.m === s.mode); }); }
    function drawCompose() {
      var input = " del-blr ";
      q("body").innerHTML = "<p>" + ctx.md("Build a `Function<String, String>` from small steps. `f.andThen(g)` means **f first, then g**; `f.compose(g)` means **g first, then f**. Add steps, flip the combinator and watch the evaluation order and the result for the input `\" del-blr \"`.") + "</p>" +
        "<div class='btnrow'>" + Object.keys(OPS).map(function (k) { return "<button type='button' class='btn' data-add='" + k + "'>+ " + OPS[k].label + "</button>"; }).join("") + "<button type='button' class='btn' data-r='undo'>remove last</button><button type='button' class='btn' data-r='clear'>clear</button></div>" +
        "<div class='seg' data-r='how' style='margin-top:8px'><button type='button' data-h='andThen'>chain with andThen</button><button type='button' data-h='compose'>chain with compose</button></div>" +
        "<pre class='code' data-r='src' style='margin-top:12px'></pre><div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div>";
      q("how").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.h === s.how); });
      var seq = s.seq, names = seq.map(function (k) { return k; });
      var src = Object.keys(OPS).filter(function (k) { return seq.indexOf(k) >= 0; }).map(function (k) { return "Function<String, String> " + k + " = " + OPS[k].java + ";"; });
      if (seq.length) src.push("Function<String, String> f = " + names[0] + names.slice(1).map(function (n) { return "." + s.how + "(" + n + ")"; }).join("") + ";", "System.out.println(f.apply(\"" + input + "\"));");
      q("src").innerHTML = seq.length ? ctx.H.highlight(src.join("\n")) : ctx.esc("// add a step");
      var order = s.how === "andThen" ? seq.slice() : seq.slice().reverse();
      var L = ["flowchart LR", "  in0[\"#quot;" + input + "#quot;\"]:::s0"], v = input, prev = "in0";
      order.forEach(function (k, i) { v = OPS[k].fn(v); L.push("  n" + i + "[\"step " + (i + 1) + ": " + k + "<br/><small>#quot;" + ctx.esc(v).replace(/"/g, "#quot;") + "#quot;</small>\"]:::s1", "  " + prev + " --> n" + i); prev = "n" + i; });
      L.push("  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var other = (s.how === "andThen" ? seq.slice().reverse() : seq.slice()).reduce(function (a, k) { return OPS[k].fn(a); }, input);
      q("res").innerHTML = seq.length ? ctx.md("Result: `\"" + v + "\"`. Runs in order **" + order.join(" → ") + "**." + (seq.length > 1 ? " With `" + (s.how === "andThen" ? "compose" : "andThen") + "` instead you'd get `\"" + other + "\"`" + (other === v ? " (same here: these steps commute)." : ".") : "")) : "";
      el.querySelectorAll("[data-add]").forEach(function (b) { b.addEventListener("click", function () { if (s.seq.length < 6) s.seq.push(b.dataset.add); ctx.save(); drawCompose(); }); });
      q("undo").addEventListener("click", function () { s.seq.pop(); ctx.save(); drawCompose(); });
      q("clear").addEventListener("click", function () { s.seq = []; ctx.save(); drawCompose(); });
      q("how").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.how = b.dataset.h; ctx.save(); drawCompose(); });
    }
    function drawRefs() {
      var r = REFS[s.ref];
      q("body").innerHTML = "<p>" + ctx.md("Every method reference is shorthand for a lambda. The **target type** (the functional interface on the left) decides which method is called and with which arguments.") + "</p>" +
        "<div class='seg' data-r='refs'>" + REFS.map(function (x, i) { return "<button type='button' data-i='" + i + "'>" + ctx.esc(x.ref) + "</button>"; }).join("") + "</div>" +
        "<div class='tablewrap' style='margin-top:12px'><table><thead><tr><th>Kind</th><th>Method reference</th><th>Equivalent lambda</th><th>Target type</th></tr></thead><tbody><tr><td>" + ctx.esc(r.kind) + "</td><td><code>" + ctx.esc(r.ref) + "</code></td><td><code>" + ctx.esc(r.lam) + "</code></td><td><code>" + ctx.esc(r.type) + "</code></td></tr></tbody></table></div>" +
        "<pre class='code' data-r='src'></pre><div class='result'>" + ctx.md("Prints `" + r.out + "` (Java 21).") + "</div>";
      q("refs").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", +b.dataset.i === s.ref); });
      q("src").innerHTML = ctx.H.highlight(r.type + " f = " + r.ref + ";\n" + r.type + " g = " + r.lam + ";   // same behaviour\nSystem.out.println(" + r.call + ");");
      q("refs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.ref = +b.dataset.i; ctx.save(); drawRefs(); });
    }
    function draw() { seg(); if (s.mode === "refs") drawRefs(); else drawCompose(); }
    q("mode").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.mode = b.dataset.m; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "From anonymous classes to lambdas",
      text: "Before Java 8, passing behaviour meant an anonymous inner class: five lines of ceremony around one expression. A **lambda** is a compact implementation of an interface with exactly one abstract method. The compiler infers the parameter types from the **target type**, so `(a, b) -> a.fare() - b.fare()` becomes a `Comparator<Flight>` because that is what `sort` expects. Lambdas are the entry point to streams (J11), `Optional` (J12), `CompletableFuture` and most Spring APIs.",
      code: `record Flight(String no, int fare) {}
List<Flight> flights = new ArrayList<>(List.of(new Flight("AI-505", 5300), new Flight("6E-201", 4850), new Flight("UK-811", 6100)));

flights.sort(new Comparator<Flight>() {                                  // Java 7 style
    @Override public int compare(Flight a, Flight b) { return Integer.compare(a.fare(), b.fare()); }
});
System.out.println(flights.get(0).no());

flights.sort((a, b) -> Integer.compare(b.fare(), a.fare()));            // lambda: types inferred from Comparator<Flight>
System.out.println(flights.get(0).no());

flights.sort(Comparator.comparingInt(Flight::fare));                    // method reference + combinator
System.out.println(flights.stream().map(Flight::no).toList());`,
      analogy: "An anonymous class is hiring a full-time employee to do one task; a lambda is handing someone a sticky note with the instruction." },
    { title: "Functional interfaces",
      text: "A **functional interface** has exactly **one abstract method** (its *function descriptor*). It may also have any number of `default` and `static` methods, and re-declaring `Object` methods like `equals` doesn't count. `@FunctionalInterface` is optional but makes the compiler reject a second abstract method. Lambdas and method references can only be assigned to functional interfaces, never to classes or to interfaces with two abstract methods.",
      code: `@FunctionalInterface
interface FareRule {
    int apply(int baseFare);                                     // the single abstract method
    default FareRule then(FareRule next) { return f -> next.apply(apply(f)); }
    static FareRule surcharge(int amount) { return f -> f + amount; }
    boolean equals(Object o);                                    // Object method: doesn't count
}

FareRule festive = f -> f * 110 / 100;
FareRule fuel = FareRule.surcharge(250);
FareRule total = festive.then(fuel);
System.out.println(festive.apply(4850) + " " + total.apply(4850));
Runnable r = () -> System.out.println("Runnable, Callable, Comparator are functional interfaces too");
r.run();`,
      points: ["Single abstract method = SAM; lambdas are sometimes called SAM conversions", "Generic methods can't be implemented by lambdas (a lambda can't declare type parameters)"] },
    { title: "The java.util.function toolkit",
      text: "You rarely need your own interfaces: `java.util.function` has 43 of them. Learn the six shapes; everything else is a variant (two arguments with `Bi`, primitives with `Int`/`Long`/`Double`, same in/out types with `Operator`).",
      table: [
        ["Interface", "Method", "Shape", "Example"],
        ["`Function<T, R>`", "`R apply(T)`", "T → R", "`String::length`"],
        ["`BiFunction<T, U, R>`", "`R apply(T, U)`", "(T, U) → R", "`(route, pax) -> fare * pax`"],
        ["`Supplier<T>`", "`T get()`", "() → T", "`LocalDate::now`, `ArrayList::new`"],
        ["`Consumer<T>`", "`void accept(T)`", "T → ()", "`System.out::println`"],
        ["`Predicate<T>`", "`boolean test(T)`", "T → boolean", "`String::isBlank`"],
        ["`UnaryOperator<T>`", "`T apply(T)`", "T → T", "`String::strip`"],
        ["`BinaryOperator<T>`", "`T apply(T, T)`", "(T, T) → T", "`Integer::sum`, `BinaryOperator.minBy(cmp)`"]],
      code: `Function<String, Integer> length = String::length;
BiFunction<Integer, Integer, Integer> total = (fare, pax) -> fare * pax;
Supplier<List<String>> fresh = ArrayList::new;
Consumer<String> log = s -> System.out.print("[log] " + s + " ");
Predicate<String> blank = String::isBlank;
UnaryOperator<String> clean = String::strip;
BinaryOperator<Integer> cheaper = BinaryOperator.minBy(Comparator.naturalOrder());

List<String> l = fresh.get();
l.add(clean.apply("  DEL-BLR "));
log.accept(l.get(0));
System.out.println(length.apply("DEL-BLR") + " " + total.apply(4850, 3) + " " + blank.test("  ") + " " + cheaper.apply(4850, 5300));` },
    { title: "Lambda syntax and target typing",
      text: "Parameters: none `()`, one `x` (parentheses optional), several `(a, b)`, optionally typed `(int a, int b)` or `(var a, var b)` (all or none). Body: an **expression** (its value is returned) or a **block** `{ …; return x; }`. A lambda has no type of its own: the **same text** can be a `Predicate`, a `Function` or your own interface depending on where it appears. When overloads make the target ambiguous, add a cast or use explicit types.",
      code: `Runnable noArgs = () -> System.out.print("hi ");
Function<String, String> one = s -> s.toUpperCase();
BinaryOperator<Integer> two = (a, b) -> a + b;
BiFunction<Integer, Integer, Integer> typed = (Integer a, Integer b) -> a * b;
Comparator<String> withVar = (var a, var b) -> a.length() - b.length();
Function<Integer, String> block = fare -> {
    int withTax = fare * 105 / 100;                  // block body needs an explicit return
    return "₹" + withTax;
};
noArgs.run();
System.out.println(one.apply("bom") + " " + two.apply(2, 3) + " " + typed.apply(2, 3) + " " + withVar.compare("DEL", "GOA") + " " + block.apply(4850));

Predicate<String> p = s -> s.isEmpty();             // same lambda text…
Function<String, Boolean> f = s -> s.isEmpty();     // …different target types
Object o = (Runnable) () -> {};                     // Object isn't functional: a cast supplies the target
System.out.println(p.test("") + " " + f.apply("x") + " " + (o instanceof Runnable));`,
      points: ["A lambda body may throw only the checked exceptions its interface method declares", "`return` in a lambda returns from the lambda, not the enclosing method"] },
    { title: "Capturing variables: effectively final, and `this`",
      text: "A lambda may read local variables of the enclosing method only if they are **effectively final** (never reassigned). The lambda captures a **copy of the value**, which may outlive the method's stack frame (e.g. run later on another thread), so allowing mutation would be confusing and racy. Fields are not copied: a lambda reads them through `this`. Inside a lambda `this` means the **enclosing instance**; inside an anonymous class it means the anonymous object itself.",
      code: `class Desk {
    String name = "desk";
    int bookings;
    void demo() {
        int base = 4850;                                     // effectively final local
        Function<Integer, Integer> forPax = pax -> base * pax;
        // base = 5000;                                      // would make the line above a compile error
        Runnable lambda = () -> System.out.print("lambda this=" + this.name + " ");
        Runnable anon = new Runnable() {
            String name = "anon";
            public void run() { System.out.print("anonymous this=" + this.name + " "); }
        };
        lambda.run(); anon.run();
        Runnable count = () -> bookings++;                   // fields can change: accessed via this
        count.run(); count.run();
        System.out.println("| " + forPax.apply(2) + " bookings=" + bookings);
    }
}
new Desk().demo();

int[] total = {0};                                           // the "array trick" compiles…
List.of(10, 20, 30).forEach(x -> total[0] += x);
System.out.println(total[0] + " (works, but prefer stream().mapToInt(...).sum())");`,
      analogy: "A lambda takes a photo of your local variables when it's created. If the variable could change afterwards, the photo would be lying, so Java only lets you photograph things that never change." },
    { title: "Method references: four kinds",
      text: "`Class::method` or `expr::method` is shorthand for a lambda that just calls one method. **Static** (`Integer::parseInt`), **bound** instance on a specific object (`\"DEL\"::equals`, `System.out::println`), **unbound** instance where the first lambda argument becomes the receiver (`String::toUpperCase`, `String::compareTo`), and **constructor** (`ArrayList::new`, `String[]::new`). Bound receivers are evaluated **once** when the reference is created.",
      table: [
        ["Kind", "Reference", "Equivalent lambda"],
        ["Static", "`Integer::parseInt`", "`s -> Integer.parseInt(s)`"],
        ["Bound", "`prefix::concat`", "`s -> prefix.concat(s)`"],
        ["Unbound", "`String::length`", "`s -> s.length()`"],
        ["Unbound, 2 args", "`String::compareToIgnoreCase`", "`(a, b) -> a.compareToIgnoreCase(b)`"],
        ["Constructor", "`Flight::new`", "`(no, fare) -> new Flight(no, fare)`"],
        ["Array constructor", "`int[]::new`", "`n -> new int[n]`"]],
      code: `record Flight(String no, int fare) {}
Function<String, Integer> parse = Integer::parseInt;
String prefix = "IN-";
UnaryOperator<String> tag = prefix::concat;                 // bound: prefix captured now
Function<String, Integer> len = String::length;             // unbound
Comparator<String> ci = String::compareToIgnoreCase;
BiFunction<String, Integer, Flight> make = Flight::new;     // constructor matching (String, int)
IntFunction<int[]> arr = int[]::new;
System.out.println(parse.apply("4850") + " " + tag.apply("DEL") + " " + len.apply("DEL-BLR") + " " + ci.compare("del", "DEL") + " " + make.apply("AI-505", 5300) + " " + arr.apply(4).length);

StringBuilder sb = new StringBuilder("A");
Supplier<String> bound = sb::toString;                      // receiver evaluated once
sb.append("B");
System.out.println(bound.get());                            // AB: same object, now changed` },
    { title: "Composing functions and predicates",
      text: "Functional interfaces have default methods that build bigger functions from small ones. `f.andThen(g)` runs f then g; `f.compose(g)` runs g then f; `Function.identity()` returns its input. Predicates combine with `and`, `or`, `negate`, and the static `Predicate.not` (handy with method references). `Consumer.andThen` chains side effects; `BinaryOperator.minBy/maxBy` build reducers from comparators.",
      m: M(["flowchart LR",
        "  X[\"x\"]:::s0 --> F[\"f\"]:::s1 --> G[\"g\"]:::s1 --> R1[\"f.andThen(g) = g(f(x))\"]:::s2",
        "  Y[\"x\"]:::s0 --> G2[\"g\"]:::s4 --> F2[\"f\"]:::s4 --> R2[\"f.compose(g) = f(g(x))\"]:::s2",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `Function<Integer, Integer> tax = f -> f * 105 / 100;
Function<Integer, Integer> fee = f -> f + 300;
System.out.println(tax.andThen(fee).apply(1000) + " vs " + tax.compose(fee).apply(1000));   // 1350 vs 1365

Predicate<String> metro = Set.of("DEL", "BOM", "BLR", "MAA", "CCU", "HYD")::contains;
Predicate<String> south = Set.of("BLR", "MAA", "HYD", "COK")::contains;
List<String> codes = List.of("DEL", "BLR", "COK", "GOI", "MAA", " ");
System.out.println(codes.stream().filter(metro.and(south)).toList() + " "
    + codes.stream().filter(metro.negate().and(Predicate.not(String::isBlank))).toList());

Consumer<String> audit = s -> System.out.print("audit:" + s + " ");
audit.andThen(s -> System.out.println("notify:" + s)).accept("PNR123");

List<UnaryOperator<String>> steps = List.of(String::strip, String::toUpperCase, s -> s.replace("-", " → "));
Function<String, String> pipeline = steps.stream().map(u -> (Function<String, String>) u).reduce(Function.identity(), Function::andThen);
System.out.println(pipeline.apply("  del-blr "));` },
    { title: "Comparator combinators",
      text: "`Comparator` is the most-used functional interface in interviews. Build comparators declaratively: `comparing(keyExtractor)`, `comparingInt` (no boxing), `thenComparing` for tie-breaks, `reversed()`, `Comparator.reverseOrder()`, and `nullsFirst/nullsLast` to handle null keys. Beware: `reversed()` applies to the **whole chain built so far**, and lambdas inside `comparing` often need explicit types because inference flows left to right.",
      code: `record Flight(String no, String from, int fare, Integer stops) {}
List<Flight> fs = new ArrayList<>(List.of(
    new Flight("AI-505", "DEL", 5300, 0), new Flight("6E-201", "DEL", 4850, 1),
    new Flight("UK-811", "BOM", 4850, null), new Flight("QP-110", "BOM", 3900, 0)));

fs.sort(Comparator.comparingInt(Flight::fare).thenComparing(Flight::no));
System.out.println(fs.stream().map(Flight::no).toList());

fs.sort(Comparator.comparing(Flight::from).thenComparing(Flight::fare, Comparator.reverseOrder()));
System.out.println(fs.stream().map(f -> f.from() + ":" + f.fare()).toList());

fs.sort(Comparator.comparing(Flight::stops, Comparator.nullsLast(Comparator.naturalOrder())));
System.out.println(fs.stream().map(f -> f.no() + "/" + f.stops()).toList());

Comparator<Flight> byFareDesc = Comparator.comparingInt((Flight f) -> f.fare()).reversed();   // explicit type needed here
System.out.println(fs.stream().sorted(byFareDesc).findFirst().get().no());`,
      points: ["`(a, b) -> a.fare() - b.fare()` can overflow for large values: use `Integer.compare` or `comparingInt`", "`Map.Entry.comparingByValue()` sorts map entries"] },
    { title: "Primitive specialisations and boxing",
      text: "Generic interfaces work on objects, so `Function<Integer, Integer>` boxes every int. The primitive variants avoid that: `IntPredicate`, `IntFunction<R>`, `ToIntFunction<T>`, `IntUnaryOperator`, `IntBinaryOperator`, `IntSupplier`, `IntConsumer`, `ObjIntConsumer<T>` and the `Long`/`Double` families. In hot loops and streams (`mapToInt`, `IntStream`) this cuts allocation and GC work; for business logic called a few times it doesn't matter.",
      code: `IntUnaryOperator addTax = f -> f * 105 / 100;              // int → int, no boxing
IntPredicate cheap = f -> f < 5000;
ToIntFunction<String> fareOf = s -> Integer.parseInt(s.split(":")[1]);
IntBinaryOperator sum = Integer::sum;

List<String> quotes = List.of("DEL-BLR:4850", "BOM-GOI:3200", "CCU-DEL:6100");
int total = quotes.stream().mapToInt(fareOf).map(addTax).filter(cheap).reduce(0, sum);
System.out.println("cheap totals with tax: " + total);

int n = 5_000_000;
long t0 = System.nanoTime();
Function<Integer, Integer> boxed = x -> x + 1;
Integer b = 0; for (int i = 0; i < n; i++) b = boxed.apply(b);
long t1 = System.nanoTime();
IntUnaryOperator prim = x -> x + 1;
int p = 0; for (int i = 0; i < n; i++) p = prim.applyAsInt(p);
long t2 = System.nanoTime();
System.out.println(b + " " + p + " | boxed " + (t1 - t0) / 1_000_000 + " ms vs primitive " + (t2 - t1) / 1_000_000 + " ms (JIT may narrow the gap)");` },
    { title: "Checked exceptions inside lambdas",
      text: "`Function.apply` declares no checked exceptions, so a lambda calling `Files.readString` (throws `IOException`) won't compile. Options: catch inside the lambda and wrap in `UncheckedIOException` (or a domain exception), write a small throwing functional interface plus an adapter, or move the I/O out of the lambda. Don't swallow the exception or return null silently.",
      code: `@FunctionalInterface
interface ThrowingFunction<T, R> { R apply(T t) throws Exception; }

static <T, R> Function<T, R> unchecked(ThrowingFunction<T, R> f) {
    return t -> {
        try { return f.apply(t); }
        catch (RuntimeException e) { throw e; }
        catch (IOException e) { throw new UncheckedIOException(e); }
        catch (Exception e) { throw new IllegalStateException(e); }
    };
}

Path dir = Files.createTempDirectory("fares");
Files.writeString(dir.resolve("DEL-BLR.txt"), "4850");
Files.writeString(dir.resolve("BOM-GOI.txt"), "3200");
// List.of("DEL-BLR").stream().map(r -> Files.readString(dir.resolve(r + ".txt")))   // compile error: unreported IOException
List<String> fares = Stream.of("DEL-BLR", "BOM-GOI").map(r -> dir.resolve(r + ".txt")).map(unchecked(Files::readString)).toList();
System.out.println(fares);
try { Stream.of("MISSING").map(r -> dir.resolve(r + ".txt")).map(unchecked(Files::readString)).toList(); }
catch (UncheckedIOException e) { System.out.println("wrapped: " + e.getCause().getClass().getSimpleName()); }` },
    { title: "How lambdas run: invokedynamic, not inner classes",
      text: "An anonymous class compiles to its own `.class` file (`Outer$1.class`). A lambda's body compiles to a private method (`lambda$main$0`) in the same class, and the creation site becomes an **`invokedynamic`** instruction. On first execution the JVM's `LambdaMetafactory` spins a tiny class implementing the interface; after that, **non-capturing** lambdas typically reuse one singleton instance, and capturing ones allocate a small object holding the captured values (which escape analysis can often remove). Stack traces show `lambda$…` frames.",
      m: M(["flowchart LR",
        "  S[\"source: x -> x * 2\"]:::s0 --> B[\"bytecode: private static lambda$main$0(int)<br/>+ invokedynamic call site\"]:::s1",
        "  B --> FIRST[\"first call: LambdaMetafactory<br/>creates a hidden class\"]:::s4",
        "  FIRST --> LINK[\"call site linked\"]:::s2",
        "  LINK --> NC[\"non-capturing: same instance reused\"]:::s2",
        "  LINK --> CAP[\"capturing: new small object per evaluation\"]:::s1",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `List<Runnable> nonCapturing = new ArrayList<>(), capturing = new ArrayList<>();
for (int i = 0; i < 3; i++) {
    nonCapturing.add(() -> System.out.print(""));
    int id = i;
    capturing.add(() -> System.out.print(id));
}
System.out.println("non-capturing same instance: " + (nonCapturing.get(0) == nonCapturing.get(1))
    + ", capturing same: " + (capturing.get(0) == capturing.get(1)));
Runnable r = () -> { throw new IllegalStateException("boom"); };
try { r.run(); } catch (IllegalStateException e) { System.out.println("top frame: " + e.getStackTrace()[0].getMethodName()); }
System.out.println("class: " + r.getClass().getSimpleName().replaceAll("0x[0-9a-f]+", "…"));`,
      points: ["Identity of lambda objects is unspecified: never use `==` or synchronize on them", "Serializable lambdas are possible (`(Runnable & Serializable) () -> …`) but fragile; avoid"] },
    { title: "Passing and returning behaviour",
      text: "Functions are values: store them in maps, pass them as parameters, return them from methods. This replaces many small strategy classes (`Map<String, BinaryOperator<Integer>>` instead of an `Operation` hierarchy), enables callbacks and template methods without subclassing, and lets you build configurable pipelines. A method returning a lambda that captures its arguments is a **closure** (a simple form of currying).",
      code: `Map<String, IntBinaryOperator> ops = Map.of("+", Integer::sum, "-", (a, b) -> a - b, "*", (a, b) -> a * b, "max", Math::max);
System.out.println(ops.get("+").applyAsInt(4850, 300) + " " + ops.get("max").applyAsInt(4850, 5300));

record Promo(String code, Predicate<Integer> eligible, IntUnaryOperator discount) {}
List<Promo> promos = List.of(
    new Promo("FLAT500", fare -> fare >= 4000, fare -> fare - 500),
    new Promo("TENOFF", fare -> fare >= 8000, fare -> fare * 90 / 100));
int fare = 4850;
promos.stream().filter(p -> p.eligible().test(fare)).forEach(p -> System.out.println(p.code() + " → " + p.discount().applyAsInt(fare)));

Function<Integer, IntUnaryOperator> surcharge = pct -> f -> f + f * pct / 100;   // returns a function (curried)
IntUnaryOperator festive = surcharge.apply(10);
System.out.println(festive.applyAsInt(4850) + " " + surcharge.apply(20).applyAsInt(4850));

static <T> void retry(int times, Supplier<T> action, Consumer<T> onSuccess) {
    for (int i = 1; i <= times; i++) {
        try { onSuccess.accept(action.get()); return; }
        catch (RuntimeException e) { System.out.print("attempt " + i + " failed; "); }
    }
}
int[] calls = {0};
retry(3, () -> { if (++calls[0] < 3) throw new IllegalStateException(); return "PNR-77"; }, pnr -> System.out.println("booked " + pnr));` }
  ];

  H.registerLesson({
    code: "J10",
    summary: "Passing behaviour as values: from anonymous classes to lambdas, what makes an interface functional (one abstract method, `@FunctionalInterface`), the `java.util.function` toolkit (`Function`, `BiFunction`, `Supplier`, `Consumer`, `Predicate`, `UnaryOperator`, `BinaryOperator`), lambda syntax and target typing, effectively final captures and `this`, the four kinds of method references, composition (`andThen`, `compose`, `Predicate.and/or/negate/not`), `Comparator` combinators, primitive specialisations and boxing, checked exceptions in lambdas, how `invokedynamic` creates lambda objects, and higher-order functions as lightweight strategies.",
    slides: SLIDES,
    widget: { heading: "Interactive: compose functions and decode method references", caption: "Compose mode builds a `Function<String, String>` chain; every sequence of up to three steps was checked against Java 21 for both `andThen` and `compose`. Method-reference mode shows the equivalent lambda and the output Java 21 printed.", render: lambdaWidget },
    examplesHeading: "Where lambdas show up at work",
    examples: [
      ["Collections and streams", "`list.sort(comparing(...))`, `removeIf`, `map.computeIfAbsent(k, x -> new ArrayList<>())`, every stream pipeline (J11)."],
      ["Spring", "`@Bean` functional endpoints, `RestClient`/`WebClient` callbacks, `TransactionTemplate.execute(status -> …)`, Spring Cloud Function beans (`Function<In, Out>`)."],
      ["Async code", "`CompletableFuture.supplyAsync(() -> …).thenApply(...)`, executor tasks, scheduled jobs."],
      ["Validation and rules", "Lists of `Predicate<Booking>` or `Function<Fare, Fare>` steps configured per tenant or market."],
      ["Testing", "Mockito `thenAnswer(inv -> …)`, AssertJ `satisfies(x -> …)`, JUnit `assertThrows(…, () -> …)`."],
      ["Logging", "`log.debug(\"…{}\", () -> expensive())` style suppliers that run only when the level is enabled."]
    ],
    pitfalls: [
      "Long multi-line lambdas: extract a named method and use a method reference",
      "Mutating captured state via array or AtomicInteger tricks instead of returning values",
      "Side effects inside lambdas passed to streams",
      "`(a, b) -> a - b` comparators that overflow",
      "`reversed()` applied to more of the chain than intended",
      "Swallowing checked exceptions in lambdas",
      "Boxing-heavy `Function<Integer, Integer>` in hot paths",
      "Relying on lambda object identity or `toString()`",
      "Ambiguous overloads (e.g. `submit(Runnable)` vs `submit(Callable)`) when a lambda fits both"
    ],
    quiz: [
      { q: "Which of these is a functional interface?", options: ["An interface with two abstract methods", "An interface with one abstract method and three default methods", "An abstract class with one abstract method", "Any interface annotated @Override"], answer: 1, why: "Default/static methods don't count." },
      { q: "What does `f.andThen(g).apply(x)` compute?", options: ["f(g(x))", "g(f(x))", "f(x) and g(x) in parallel", "g(x)"], answer: 1, why: "andThen: f first. compose is the reverse." },
      { q: "Why must captured local variables be effectively final?", options: ["For performance only", "The lambda captures a copy of the value and may run later or on another thread", "Lambdas can't read locals at all", "Because of garbage collection"], answer: 1, why: "Mutation would be invisible or racy." },
      { q: "Inside a lambda, `this` refers to…", options: ["The lambda object", "The enclosing instance", "null", "The functional interface"], answer: 1, why: "In an anonymous class it's the anonymous object." },
      { q: "`String::toUpperCase` assigned to `Function<String, String>` is which kind of method reference?", options: ["Static", "Bound", "Unbound instance", "Constructor"], answer: 2, why: "The first argument becomes the receiver." },
      { q: "What does this print?", code: `StringBuilder sb = new StringBuilder("A");
Supplier<String> s = sb::toString;
sb.append("B");
System.out.println(s.get());`, options: ["A", "AB", "Compile error", "null"], answer: 1, why: "The receiver is the same object, evaluated once." },
      { q: "Which interface avoids boxing for int → int?", options: ["Function<Integer, Integer>", "UnaryOperator<Integer>", "IntUnaryOperator", "ToIntFunction<Integer>"], answer: 2, why: "applyAsInt(int)." },
      { q: "A lambda calls a method that throws IOException and is passed to `map`. What happens?", options: ["It compiles; the exception propagates", "Compile error: Function.apply doesn't declare IOException", "It is automatically wrapped", "It is silently ignored"], answer: 1, why: "Catch and wrap (UncheckedIOException) or use an adapter." },
      { q: "How is a lambda implemented in the JVM?", options: ["An anonymous inner class file per lambda", "invokedynamic + LambdaMetafactory creating a hidden class at runtime", "Reflection on every call", "A new thread"], answer: 1, why: "The body is a private synthetic method." }
    ],
    cheatsheet: {
      table: [
        ["Shape", "Interface"],
        ["T → R", "`Function<T, R>` (`IntFunction`, `ToIntFunction`…)"],
        ["(T, U) → R", "`BiFunction<T, U, R>`"],
        ["() → T", "`Supplier<T>`"],
        ["T → void", "`Consumer<T>` / `BiConsumer<T, U>`"],
        ["T → boolean", "`Predicate<T>` / `BiPredicate`"],
        ["T → T", "`UnaryOperator<T>` / `IntUnaryOperator`"],
        ["(T, T) → T", "`BinaryOperator<T>` / `IntBinaryOperator`"],
        ["Compose", "`andThen`, `compose`, `identity`, `and/or/negate`, `Predicate.not`"],
        ["Sort", "`comparing`, `comparingInt`, `thenComparing`, `reversed`, `nullsLast`"]],
      cards: [
        { title: "Method references", items: ["Static `Integer::parseInt`", "Bound `obj::method`", "Unbound `String::length`", "Constructor `ArrayList::new`, `int[]::new`"] },
        { title: "Rules", items: ["One abstract method", "Captured locals effectively final", "`this` = enclosing instance", "No checked exceptions unless declared"] },
        { title: "Say in interviews", items: ["Target typing", "invokedynamic, no inner class files", "Non-capturing lambdas are cheap", "Prefer method refs for one-call lambdas"] }]
    },
    practice: [
      { level: "Easy", q: "What is a functional interface? Name five from the JDK.",
        a: ["An interface with exactly one abstract method, so a lambda or method reference can implement it. `default`, `static` and re-declared `Object` methods don't count.",
          "`@FunctionalInterface` is optional documentation that the compiler enforces.",
          "Examples: `Runnable`, `Callable<V>`, `Comparator<T>`, `Function<T, R>`, `Supplier<T>`, `Consumer<T>`, `Predicate<T>`, `BiFunction`, `UnaryOperator`."] },
      { level: "Easy", q: "Lambda vs anonymous inner class: what are the differences?",
        a: ["**Syntax**: lambdas are concise; anonymous classes need the full method declaration.",
          "**Target**: lambdas only implement functional interfaces; anonymous classes can extend classes and implement interfaces with many methods, and can have state (fields).",
          "**`this`**: in a lambda it's the enclosing instance; in an anonymous class it's the anonymous object. Lambdas can't shadow enclosing locals with their parameters.",
          "**Compilation**: anonymous classes produce `Outer$1.class` and a new object per evaluation; lambdas use `invokedynamic`, and non-capturing ones are typically singletons.",
          "Both can capture only effectively final locals."] },
      { level: "Easy", q: "Write a `Predicate<String>` that accepts valid 3-letter uppercase airport codes, and combine it with a blocklist.",
        code: `Predicate<String> threeUpper = s -> s != null && s.matches("[A-Z]{3}");
Set<String> blocked = Set.of("XXX", "TST");
Predicate<String> valid = threeUpper.and(Predicate.not(blocked::contains));
System.out.println(Stream.of("DEL", "del", "BLRX", "TST", "GOI", null).filter(valid).toList());`,
        a: ["Null check first so the predicate is safe on any input.",
          "`Predicate.not(blocked::contains)` reads better than `x -> !blocked.contains(x)`.",
          "`and` short-circuits, so `contains` only runs for well-formed codes."] },
      { level: "Medium", q: "Sort employees by department, then by salary descending, then by name, putting a null department last.",
        code: `record Emp(String name, String dept, int salary) {}
List<Emp> es = new ArrayList<>(List.of(new Emp("Asha", "Ops", 90), new Emp("Ravi", "Eng", 120),
    new Emp("Meera", "Eng", 120), new Emp("Kabir", null, 70), new Emp("Dev", "Eng", 150)));
es.sort(Comparator.comparing(Emp::dept, Comparator.nullsLast(Comparator.naturalOrder()))
    .thenComparing(Emp::salary, Comparator.reverseOrder())
    .thenComparing(Emp::name));
es.forEach(e -> System.out.print(e.name() + " "));`,
        a: ["`comparing(key, keyComparator)` lets you handle nulls in the key with `nullsLast`.",
          "Pass `Comparator.reverseOrder()` to one `thenComparing` instead of calling `reversed()` (which would reverse the whole chain).",
          "Final tie-break on name makes the order deterministic."] },
      { level: "Medium", q: "Explain the four kinds of method references with examples, and when you can't use one.",
        a: ["Static: `Integer::parseInt` ≡ `s -> Integer.parseInt(s)`.",
          "Bound instance: `System.out::println`, `cache::get` ≡ `x -> cache.get(x)` (receiver evaluated once at creation).",
          "Unbound instance: `String::length` ≡ `s -> s.length()`; `String::compareTo` ≡ `(a, b) -> a.compareTo(b)`.",
          "Constructor: `ArrayList::new`, `Flight::new`, `int[]::new`.",
          "Can't use one when the lambda does more than forward its arguments to one method (e.g. `s -> s.substring(1)` with a constant argument, or reordering parameters); also overloaded methods can make a reference ambiguous."] },
      { level: "Medium", q: "Implement a small rule engine: a list of `Function<Fare, Fare>` adjustments applied in order, built from configuration.",
        code: `record Fare(String route, int amount) { Fare with(int a) { return new Fare(route, a); } }
Map<String, Function<Fare, Fare>> catalogue = Map.of(
    "tax5", f -> f.with(f.amount() * 105 / 100),
    "fuel", f -> f.with(f.amount() + 250),
    "metroDiscount", f -> f.route().startsWith("DEL") ? f.with(f.amount() - 200) : f);
List<String> config = List.of("metroDiscount", "fuel", "tax5");
Function<Fare, Fare> pricing = config.stream().map(catalogue::get).reduce(Function.identity(), Function::andThen);
System.out.println(pricing.apply(new Fare("DEL-BLR", 4850)) + " " + pricing.apply(new Fare("BOM-GOI", 3200)));`,
        a: ["Each rule is a value in a map; the configured order is folded into one function with `reduce(identity(), Function::andThen)`.",
          "Adding a rule is a new map entry, not a new class (open/closed principle without a hierarchy).",
          "Immutable `Fare` records keep rules side-effect free and testable in isolation."] },
      { level: "Medium", q: "Why does this fail to compile, and how do you fix it? `int count = 0; list.forEach(x -> count++);`",
        a: ["`count` is a local that is reassigned, so it isn't effectively final and can't be captured.",
          "Lambdas capture values, not variables; allowing writes would create shared mutable state that may be accessed after the method returns or from another thread.",
          "Fix by computing the value: `long count = list.stream().filter(...).count();` or `mapToInt(...).sum()`.",
          "If you truly need a mutable counter (e.g. a callback API), use a field or an `AtomicInteger`/`LongAdder`, knowing it's shared state."] },
      { level: "Hard", q: "Write a `memoize` higher-order function and explain its thread-safety and pitfalls.",
        code: `static <T, R> Function<T, R> memoize(Function<T, R> f) {
    Map<T, R> cache = new ConcurrentHashMap<>();
    return t -> cache.computeIfAbsent(t, f);                    // f runs at most once per key
}

int[] calls = {0};
Function<String, Integer> slowFare = route -> { calls[0]++; return route.length() * 700; };
Function<String, Integer> fast = memoize(slowFare);
System.out.println(fast.apply("DEL-BLR") + " " + fast.apply("DEL-BLR") + " " + fast.apply("GOI") + " calls=" + calls[0]);`,
        a: ["The returned lambda closes over a private `ConcurrentHashMap`, so callers share one cache per memoized function.",
          "`computeIfAbsent` guarantees one computation per key even under concurrency, but holds a bin lock while `f` runs: keep `f` fast and don't recursively call the memoized function from inside (recursive memoization like Fibonacci needs a different approach).",
          "Unbounded growth: for real caches use Caffeine with size/time eviction.",
          "`f` can't return null (CHM doesn't store nulls; the result is simply not cached)."] },
      { level: "Hard", q: "`executor.submit(() -> { throw new Exception(); })` compiles but `executor.submit(() -> { doWork(); })` picks a different overload. Explain.",
        code: `try (ExecutorService ex = Executors.newSingleThreadExecutor()) {
    Future<?> a = ex.submit(() -> System.out.print(""));              // void body → Runnable
    Future<String> b = ex.submit(() -> "PNR-1");                    // value → Callable<String>
    Future<Object> c = ex.submit(() -> { throw new Exception("checked"); });   // throws checked → only Callable fits
    System.out.println(a.get() + " " + b.get());
    try { c.get(); } catch (ExecutionException e) { System.out.println("cause: " + e.getCause().getMessage()); }
}`,
        a: ["`submit` is overloaded for `Runnable` (void, no checked exceptions) and `Callable<T>` (returns T, `throws Exception`).",
          "The compiler checks which targets the lambda is compatible with: a body that only runs statements is void-compatible (fits `Runnable`); a body that returns a value is value-compatible (fits `Callable`).",
          "A block that always throws is compatible with **both**. Overload resolution then prefers the more specific one: for lambdas, a functional interface with a non-void return beats one returning `void`, so `Callable` wins.",
          "Checked exceptions are not part of choosing the overload; the code compiles because the chosen `Callable.call()` declares `throws Exception`. Forced onto `Runnable` (e.g. with a cast), it would not compile.",
          "When in doubt, cast `(Callable<T>) () -> …` or use a named method to make intent explicit."] },
      { level: "Hard", q: "How are lambdas compiled and what does that mean for performance?",
        a: ["The body becomes a private synthetic method (`lambda$name$N`) in the declaring class; the creation site is an `invokedynamic` instruction bootstrapped by `LambdaMetafactory`.",
          "First execution links the call site and spins a hidden class implementing the interface; later evaluations are cheap.",
          "Non-capturing lambdas usually evaluate to the same cached instance; capturing lambdas allocate a small object per evaluation, often eliminated by the JIT's escape analysis when inlined.",
          "Megamorphic call sites (one interface method called with many different lambdas, like a generic `forEach`) can limit inlining; in practice the cost matters only in very hot loops. Measure with JMH before optimising.",
          "Compared with anonymous classes: no extra class files, less startup and metaspace cost."] }
    ],
    recap: [
      "A lambda implements a functional interface (one abstract method); its type comes from the target.",
      "Know the core shapes: Function, BiFunction, Supplier, Consumer, Predicate, UnaryOperator, BinaryOperator, plus primitive variants.",
      "Captured locals must be effectively final; `this` is the enclosing instance.",
      "Method references: static, bound, unbound, constructor; compose with `andThen`/`compose`, predicates with `and/or/negate/not`, comparators with `comparing/thenComparing`.",
      "Lambdas use invokedynamic, not inner classes; wrap checked exceptions deliberately; use functions as values to replace small strategy hierarchies."
    ]
  });
})();
