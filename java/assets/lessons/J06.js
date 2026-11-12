/* Lesson J06: Generics: bounds, wildcards (PECS), type erasure */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // PECS checker: [declared type, explanation]; ops: [code, results per type: "ok" | "warn" | "err", reason per type]
  var TYPES = ["List<Number>", "List<Integer>", "List<? extends Number>", "List<? super Integer>", "List<?>", "List (raw)"];
  var OPS = [
    ["list.add(1)", ["ok", "ok", "err", "ok", "err", "warn"]],
    ["list.add(2.5)", ["ok", "err", "err", "err", "err", "warn"]],
    ["list.add(null)", ["ok", "ok", "ok", "ok", "ok", "warn"]],
    ["Number n = list.get(0)", ["ok", "ok", "ok", "err", "err", "err"]],
    ["Integer i = list.get(0)", ["err", "ok", "err", "err", "err", "err"]],
    ["Object o = list.get(0)", ["ok", "ok", "ok", "ok", "ok", "ok"]],
    ["list = new ArrayList<Integer>()", ["err", "ok", "ok", "ok", "ok", "ok"]],
    ["list = new ArrayList<Object>()", ["err", "err", "err", "ok", "ok", "ok"]]
  ];
  var WHY = {
    "List<Number>": "Exactly `Number`. You can add any Number subtype and read Numbers, but generics are **invariant**: a `List<Integer>` is **not** a `List<Number>`, so it can't be assigned.",
    "List<Integer>": "Exactly `Integer`: add and read Integers. Can't hold a `Double`; can't be assigned a `List<Object>`.",
    "List<? extends Number>": "\"Some list of an **unknown** subtype of Number\" (could be `List<Double>`). Reading gives a `Number` (safe). Adding anything but `null` is rejected: the compiler can't know the element type. **Producer → extends.**",
    "List<? super Integer>": "\"Some list whose element type is Integer **or a supertype**\" (`List<Integer>`, `List<Number>`, `List<Object>`). Adding an Integer is always safe. Reading only gives `Object`. **Consumer → super.**",
    "List<?>": "\"A list of **unknown** type\". Read as `Object`, add only `null`. Good for methods that only use `size()`, `clear()`, or print elements.",
    "List (raw)": "A **raw type**: generics switched off. Everything compiles with *unchecked* warnings, `get` returns `Object`, and type errors surface later as `ClassCastException`. Only for legacy code."
  };
  var MSG = { ok: "✓ compiles", warn: "⚠ compiles with unchecked warning", err: "✗ compile error" };
  function pecsWidget(el, ctx) {
    var s = ctx.state; if (typeof s.t !== "number" || s.t >= TYPES.length) s.t = 2;
    el.innerHTML = "<div class='field'>Declared type of <code>list</code></div><div class='seg' data-r='t'></div><p data-r='why' style='margin-top:10px'></p><div data-r='tbl'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("t").innerHTML = TYPES.map(function (t, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.t ? "on" : "") + "'>" + ctx.esc(t) + "</button>"; }).join("");
      var t = TYPES[s.t];
      q("why").innerHTML = ctx.md(WHY[t]);
      var okN = 0;
      q("tbl").innerHTML = "<div class='tablewrap'><table><thead><tr><th>Statement</th><th>Result with <code>" + ctx.esc(t) + " list</code></th></tr></thead><tbody>" + OPS.map(function (o) {
        var r = o[1][s.t]; if (r !== "err") okN++;
        var col = r === "ok" ? "var(--success)" : r === "warn" ? "var(--warning)" : "var(--danger)";
        return "<tr><td><code>" + ctx.esc(o[0]) + "</code></td><td style='color:" + col + ";font-weight:600'>" + MSG[r] + "</td></tr>";
      }).join("") + "</tbody></table></div>";
      var res = q("res"); res.className = "result ok";
      res.innerHTML = "<p>" + ctx.md(okN + " of " + OPS.length + " statements compile. **PECS**: Producer `extends`, Consumer `super`. If you only *read* T from a structure, use `? extends T`; if you only *write* T into it, use `? super T`; if you do both, use exactly `T`.") + "</p>";
    }
    q("t").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b) return; s.t = Number(b.getAttribute("data-i")); ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Why generics: type safety at compile time",
      text: "Before Java 5, collections held `Object`: you cast on the way out and found mistakes at **run time** as `ClassCastException`, often far from where the wrong object was inserted. **Generics** let you say `List<String>`, so the compiler rejects wrong inserts and inserts the casts for you. They're a **compile-time** feature: at run time the type arguments are mostly erased (slide 8).",
      code: `List raw = new ArrayList();                    // pre-Java 5 style (raw type)
raw.add("DEL-BLR");
raw.add(4850);                                 // nothing stops this
try {
    for (Object o : raw) { String route = (String) o; System.out.println(route.toLowerCase()); }
} catch (ClassCastException e) { System.out.println("found at run time: " + e.getMessage().split(" \\\\(")[0]); }

List<String> routes = new ArrayList<>();
routes.add("DEL-BLR");
// routes.add(4850);                           // compile error: found at compile time
for (String r : routes) System.out.println(r.toLowerCase());   // no casts needed`,
      table: [
        ["Benefit", "How"],
        ["Errors at compile time", "`List<String>` rejects `add(4850)`"],
        ["No manual casts", "The compiler inserts checked casts where values come out"],
        ["Reusable, type-safe code", "One `Box<T>` or `Cache<K, V>` for every type"],
        ["Self-documenting APIs", "`Map<CustomerId, List<Order>>` says what it holds"]],
      analogy: "Labelled containers in a warehouse. A raw box accepts anything and you only discover a shoe in the spice box when you cook. A labelled box (\"spices only\") is checked at the loading dock (the compiler)." },
    { title: "Generic classes and interfaces",
      text: "Declare type parameters in angle brackets after the class name and use them like types inside. Conventions: `T` (type), `E` (element), `K`/`V` (key/value), `R` (result), `S`, `U` for extra types. Since Java 7 the **diamond** `<>` lets the compiler infer arguments on construction.",
      code: `final class Result<T> {                              // success value OR error message
    private final T value;
    private final String error;
    private Result(T value, String error) { this.value = value; this.error = error; }
    static <T> Result<T> ok(T value) { return new Result<>(value, null); }
    static <T> Result<T> fail(String error) { return new Result<>(null, error); }
    boolean isOk() { return error == null; }
    T get() { if (!isOk()) throw new IllegalStateException(error); return value; }
    <R> Result<R> map(java.util.function.Function<? super T, ? extends R> f) {
        return isOk() ? ok(f.apply(value)) : fail(error);
    }
    @Override public String toString() { return isOk() ? "Ok(" + value + ")" : "Fail(" + error + ")"; }
}
record Pair<A, B>(A first, B second) {}              // generic record

Result<Integer> fare = Result.ok(4850);
Result<String> label = fare.map(f -> "₹" + f);
Result<Integer> broken = Result.fail("fares API timeout");
System.out.println(label + " " + broken.map(f -> f * 2));
Pair<String, Integer> p = new Pair<>("DEL-BLR", 4850);
Map<String, List<Pair<String, Integer>>> byAirline = new HashMap<>();   // diamond on the right
byAirline.computeIfAbsent("IndiGo", k -> new ArrayList<>()).add(p);
System.out.println(byAirline);`,
      points: ["A class can have several type parameters: `Map<K, V>`, `Function<T, R>`", "Type arguments must be reference types: `List<int>` is illegal; use `List<Integer>` (boxing, J02) or primitive specialisations"] },
    { title: "Generic methods and type inference",
      text: "A method can declare its own type parameters, written **before the return type**: `static <T> T firstOr(List<T> list, T fallback)`. The compiler **infers** `T` from the arguments and the target type, so you rarely write it. When inference needs help, use a **type witness**: `Collections.<String>emptyList()`. Static methods can't use the class's type parameters, so static factories declare their own.",
      code: `static <T> T firstOr(List<T> list, T fallback) { return list.isEmpty() ? fallback : list.get(0); }
static <K, V> Map<V, K> invert(Map<K, V> map) {
    Map<V, K> out = new HashMap<>();
    map.forEach((k, v) -> out.put(v, k));
    return out;
}
static <T> List<T> repeat(T item, int n) { return Collections.nCopies(n, item); }

String route = firstOr(List.of("DEL-BLR", "BOM-GOI"), "none");      // T = String
Integer fare = firstOr(List.<Integer>of(), 0);                         // explicit witness (optional here)
System.out.println(route + " " + fare);
System.out.println(invert(Map.of("DEL", "Delhi", "BLR", "Bengaluru")).get("Delhi"));
List<String> empty = Collections.emptyList();                          // inferred from the target type
var seats = repeat('A', 3);                                            // var + inference: List<Character>
System.out.println(empty.size() + " " + seats);`,
      points: ["Inference uses arguments **and** the assignment/return/argument target (Java 8 improved this a lot)", "`var list = new ArrayList<>();` infers `ArrayList<Object>`: don't combine `var` with a bare diamond"] },
    { title: "Bounded type parameters",
      text: "An **upper bound** `<T extends Bound>` restricts `T` to `Bound` or its subtypes and lets you call `Bound`'s methods on a `T`. (`extends` is used for both classes and interfaces.) **Multiple bounds** are joined with `&`: one class first, then interfaces. The famous signature `<T extends Comparable<? super T>>` means \"T can be compared with itself or with something it inherits comparison from\".",
      code: `static <T extends Comparable<? super T>> T max(Collection<? extends T> items) {
    Iterator<? extends T> it = items.iterator();
    T best = it.next();
    while (it.hasNext()) { T x = it.next(); if (x.compareTo(best) > 0) best = x; }
    return best;
}
static <T extends Number & Comparable<T>> T clampMax(T value, T limit) {   // multiple bounds
    return value.compareTo(limit) > 0 ? limit : value;
}
static double total(List<? extends Number> amounts) {                     // bounded wildcard (slide 6)
    double sum = 0;
    for (Number n : amounts) sum += n.doubleValue();                      // Number's method available
    return sum;
}

System.out.println(max(List.of(4850, 5120, 4100)) + " " + max(List.of("IndiGo", "Akasa", "Vistara")));
System.out.println(max(List.of(LocalDate.of(2026, 11, 12), LocalDate.of(2026, 12, 25))));   // LocalDate is Comparable<ChronoLocalDate>: needs '? super T'
System.out.println(clampMax(12, 9) + " " + clampMax(2.5, 9.0));
System.out.println(total(List.of(1, 2.5, 3L)));`,
      points: ["Without `? super T`, `max` wouldn't accept `LocalDate`, because `LocalDate` implements `Comparable<ChronoLocalDate>`, not `Comparable<LocalDate>`", "There are no lower bounds on type **parameters**; `super` exists only on wildcards"] },
    { title: "Invariance: a List<Integer> is not a List<Number>",
      text: "Even though `Integer` is a subtype of `Number`, `List<Integer>` is **not** a subtype of `List<Number>`. Generics are **invariant**. If it were allowed, you could add a `Double` through the `List<Number>` view and corrupt the integer list. **Arrays** are covariant (`Integer[]` *is* an `Object[]`), so the same mistake compiles and fails at run time with `ArrayStoreException`.",
      m: M(["flowchart LR",
        "  I[\"Integer\"]:::s2 -- \"is a\" --> N[\"Number\"]:::s2",
        "  LI[\"List#lt;Integer#gt;\"]:::s1 -. \"NOT a\" .-> LN[\"List#lt;Number#gt;\"]:::bad",
        "  LI -- \"is a\" --> LE[\"List#lt;? extends Number#gt;\"]:::s0",
        "  LN -- \"is a\" --> LE",
        "  AI[\"Integer[]\"]:::bad -- \"is a (covariant, unsafe)\" --> AO[\"Object[]\"]:::bad"]),
      code: `List<Integer> ints = new ArrayList<>(List.of(1, 2));
// List<Number> nums = ints;              // compile error: incompatible types
List<? extends Number> view = ints;      // OK: read-only view of "some Number subtype"
System.out.println("first via view: " + view.get(0));

Object[] objects = new Integer[2];       // arrays are covariant: compiles
try { objects[0] = "not a number"; }
catch (ArrayStoreException e) { System.out.println("ArrayStoreException: " + e.getMessage()); }`,
      points: ["That's why generic code prefers `List<T>` over `T[]`", "Wildcards (next slide) give you safe flexibility instead of covariance"] },
    { title: "Wildcards and PECS: producer extends, consumer super",
      text: "A wildcard `?` stands for an unknown type. **`? extends T`**: the structure **produces** T's you can read (but you can't add, except `null`). **`? super T`**: the structure **consumes** T's you can add (but reading only gives `Object`). Mnemonic **PECS** (Joshua Bloch): *Producer Extends, Consumer Super*. Look at `Collections.copy(List<? super T> dest, List<? extends T> src)`: read from `src`, write into `dest`.",
      m: M(["flowchart LR",
        "  SRC[\"src: List#lt;? extends Number#gt;<br/>PRODUCER: you read Numbers\"]:::s0 -- \"get()\" --> M[\"your method\"]",
        "  M -- \"add(Integer)\" --> DST[\"dest: List#lt;? super Integer#gt;<br/>CONSUMER: you write Integers\"]:::s1"]),
      code: `static double sum(Collection<? extends Number> producer) {          // reads Numbers
    double s = 0; for (Number n : producer) s += n.doubleValue(); return s;
}
static void addSeats(Collection<? super Integer> consumer, int n) {    // writes Integers
    for (int i = 1; i <= n; i++) consumer.add(i);
}
static <T> void copyInto(List<? super T> dest, List<? extends T> src) { for (T t : src) dest.add(t); }

List<Integer> ints = new ArrayList<>(List.of(1, 2, 3));
List<Double> doubles = List.of(2.5, 3.5);
System.out.println(sum(ints) + " " + sum(doubles));                   // both accepted
List<Number> numbers = new ArrayList<>();
List<Object> objects = new ArrayList<>();
addSeats(numbers, 2); addSeats(objects, 2); addSeats(ints, 1);         // all accepted
copyInto(objects, doubles);
System.out.println(numbers + " " + objects + " " + ints);`,
      points: ["Use wildcards in **parameters** of APIs for flexibility; avoid them in **return types** (callers would have to deal with them)", "Try every combination in the widget below; each verdict was checked against `javac`"] },
    { title: "Unbounded wildcards and wildcard capture",
      text: "`List<?>` means \"a list of some unknown type\". It's not the same as `List<Object>`: a `List<String>` *is* a `List<?>` but *isn't* a `List<Object>`. You can read elements as `Object`, call type-independent methods (`size`, `clear`, `remove`) and add only `null`. To write back elements you read from a `List<?>` (e.g. swap), delegate to a private generic helper that **captures** the wildcard as a type variable.",
      code: `static void printAll(List<?> anything) { System.out.println(anything.size() + " items: " + anything); }
static void swapFirstLast(List<?> list) { swapHelper(list); }          // public API stays simple
private static <T> void swapHelper(List<T> list) {                     // captures ? as T
    T first = list.get(0);
    list.set(0, list.get(list.size() - 1));
    list.set(list.size() - 1, first);
}

List<String> legs = new ArrayList<>(List.of("DEL", "BLR", "GOI"));
printAll(legs);
printAll(List.of(1, 2));
swapFirstLast(legs);
System.out.println(legs);
List<Object> objs = new ArrayList<>();
// objs = legs;                       // compile error: List<String> is not a List<Object>
List<?> any = legs;                   // fine
System.out.println(any.get(0) instanceof String);`,
      points: ["`Class<?>` is the idiomatic way to say \"some class\" (`obj.getClass()` returns `Class<? extends X>`)", "Prefer `List<?>` over raw `List` when the element type doesn't matter: same flexibility, still type-checked"] },
    { title: "Type erasure: what the JVM actually sees",
      text: "Generics are implemented by **erasure**: after type-checking, `javac` replaces type parameters with their **bound** (`Object` if unbounded), inserts casts where values come out, and generates **bridge methods** to keep overriding working. The bytecode for `List<String>` and `List<Integer>` is the same `List`. This kept Java 5 compatible with older code, at the cost of some limitations.",
      m: M(["flowchart LR",
        "  S[\"Source<br/>List#lt;String#gt; l; String s = l.get(0);<br/>class Box#lt;T extends Number#gt; { T v; }\"]:::s1 --> J[\"javac: type-check, then erase\"]",
        "  J --> B[\"Bytecode<br/>List l; String s = (String) l.get(0);<br/>class Box { Number v; }\"]:::s0",
        "  B --> R[\"Runtime: one List class<br/>no T information on objects\"]:::s2"]),
      code: `class Box<T extends Comparable<T>> {
    T value;
    Box(T value) { this.value = value; }
    boolean greaterThan(T other) { return value.compareTo(other) > 0; }
}
class Fare implements Comparable<Fare> {
    final int rupees; Fare(int r) { rupees = r; }
    public int compareTo(Fare o) { return Integer.compare(rupees, o.rupees); }   // javac adds bridge compareTo(Object)
}

List<String> a = new ArrayList<>();
List<Integer> b = new ArrayList<>();
System.out.println("same runtime class: " + (a.getClass() == b.getClass()));
System.out.println("Box.value erased to: " + Box.class.getDeclaredField("value").getType().getSimpleName());
for (var m : Fare.class.getDeclaredMethods())
    System.out.println("Fare." + m.getName() + "(" + m.getParameterTypes()[0].getSimpleName() + ")" + (m.isBridge() ? "  ← bridge" : ""));
System.out.println(new Box<>(new Fare(5120)).greaterThan(new Fare(4850)));`,
      points: ["Generic **signatures** are kept in class files (for reflection and compilers): `getGenericSuperclass()` can see `Comparable<Fare>`; objects don't carry their type arguments", "Contrast: C# keeps generics at run time (reification); Kotlin offers `reified` only for inline functions"] },
    { title: "Erasure limitations and their workarounds",
      text: "Because type arguments don't exist at run time, a few things are impossible. Each has a standard workaround: pass a `Class<T>` token, a `Supplier<T>` or `IntFunction<T[]>`, or restructure the API.",
      table: [
        ["You can't…", "Why", "Instead"],
        ["`new T()`", "No T at run time", "Pass `Supplier<T>` (`ArrayList::new`) or `Class<T>` + reflection"],
        ["`new T[n]` / `new List<String>[n]`", "Arrays need a reified element type", "`List<T>`, or `IntFunction<T[]>` (`String[]::new`), or `(T[]) new Object[n]` internally"],
        ["`obj instanceof List<String>`", "Can't check erased argument", "`instanceof List<?>` and check elements"],
        ["Overload `m(List<String>)` and `m(List<Integer>)`", "Same erasure: `m(List)`", "Different method names"],
        ["`static T field`", "Statics are shared by all parameterisations", "Static generic methods"],
        ["`List<int>`", "Type arguments must be references", "`List<Integer>`, `IntStream`, primitive collections"],
        ["`catch (T e)` / generic exception classes", "Catch needs a runtime type", "Concrete exception types"]],
      code: `static <T> List<T> fill(int n, Supplier<T> factory) {           // instead of new T()
    List<T> out = new ArrayList<>();
    for (int i = 0; i < n; i++) out.add(factory.get());
    return out;
}
static <T> T parse(String s, Class<T> type) {                     // class token
    if (type == Integer.class) return type.cast(Integer.valueOf(s));
    if (type == LocalDate.class) return type.cast(LocalDate.parse(s));
    return type.cast(s);
}

List<StringBuilder> buffers = fill(3, StringBuilder::new);
System.out.println(buffers.size() + " builders");
Integer seats = parse("3", Integer.class);
LocalDate travel = parse("2026-12-25", LocalDate.class);
System.out.println(seats + 1 + " seats on " + travel.getDayOfWeek());
String[] codes = List.of("DEL", "BLR").toArray(String[]::new);   // IntFunction<T[]> gives a real String[]
System.out.println(codes.getClass().getSimpleName() + " " + Arrays.toString(codes));`,
      points: ["Jackson `TypeReference<List<Order>>` and Spring `ParameterizedTypeReference<List<Order>>` use an anonymous subclass to capture the full generic type: the \"super type token\" trick (slide 11)"] },
    { title: "Heap pollution and @SafeVarargs",
      text: "**Heap pollution** happens when a variable of a parameterised type refers to an object that isn't of that type, possible only through raw types, unchecked casts or generic varargs (the compiler warns about each). The failure shows up later as a `ClassCastException` at an innocent-looking line. Generic varargs methods create a `T[]` under the hood; if the method doesn't store into or expose that array, annotate it `@SafeVarargs` (on `static`, `final` or `private` methods) to suppress the warning for callers.",
      code: `@SuppressWarnings("unchecked")
static void pollute(List<String> strings) {
    List raw = strings;                 // raw type: the compiler stops checking
    raw.add(42);                        // an Integer inside a List<String>
}
@SafeVarargs
static <T> List<T> listOf(T... items) { return new ArrayList<>(Arrays.asList(items)); }   // only reads the array: safe

List<String> names = new ArrayList<>(List.of("Deepak"));
pollute(names);
System.out.println("size " + names.size() + " (no error yet)");
try { for (String n : names) System.out.println(n.toUpperCase()); }
catch (ClassCastException e) { System.out.println("ClassCastException far from the cause"); }
System.out.println(listOf("DEL", "BLR"));`,
      points: ["Treat unchecked warnings as errors in your build, or justify each `@SuppressWarnings(\"unchecked\")` with a comment and the narrowest scope", "`Collections.checkedList(list, String.class)` fails fast at the insertion point when hunting a pollution bug"] },
    { title: "Generics patterns you'll meet at work",
      text: "A few idioms show up constantly in frameworks and interviews: **type tokens** to recover full generic types for deserialisation, **recursive bounds** for fluent builders and `Enum<E extends Enum<E>>`, and generic interfaces for repositories and handlers (`JpaRepository<Order, Long>`, `Converter<S, T>`).",
      code: `abstract class TypeRef<T> {                                       // "super type token"
    final java.lang.reflect.Type type;
    protected TypeRef() { type = ((java.lang.reflect.ParameterizedType) getClass().getGenericSuperclass()).getActualTypeArguments()[0]; }
}
abstract class Builder<B extends Builder<B>> {                     // recursive bound: fluent subclasses
    protected final StringBuilder sb = new StringBuilder();
    @SuppressWarnings("unchecked") B self() { return (B) this; }
    B with(String k, Object v) { sb.append(k).append('=').append(v).append(' '); return self(); }
}
final class RequestBuilder extends Builder<RequestBuilder> {
    RequestBuilder header(String h) { sb.append("H:").append(h).append(' '); return this; }
    String build() { return sb.toString().strip(); }
}
interface Repository<T, ID> { Optional<T> findById(ID id); void save(T t); }

System.out.println(new TypeRef<Map<String, List<Integer>>>() {}.type);
System.out.println(new RequestBuilder().with("route", "DEL-BLR").header("trace").with("pax", 2).build());   // with() returns RequestBuilder
Map<Long, String> store = new HashMap<>();
Repository<String, Long> repo = new Repository<>() {
    public Optional<String> findById(Long id) { return Optional.ofNullable(store.get(id)); }
    public void save(String s) { store.put((long) store.size() + 1, s); }
};
repo.save("booking X7Q2");
System.out.println(repo.findById(1L).orElse("none") + " / " + repo.findById(9L).orElse("none"));`,
      points: ["Spring: `restClient.get().retrieve().body(new ParameterizedTypeReference<List<Order>>() {})`; Jackson: `mapper.readValue(json, new TypeReference<List<Order>>() {})`", "`enum Seat` compiles to `class Seat extends Enum<Seat>`, so `compareTo` only accepts the same enum"] }
  ];

  H.registerLesson({
    code: "J06",
    summary: "Generics from first principles to framework idioms: why they exist (compile-time safety, no casts), generic classes, records and methods with type inference and witnesses, bounded types including `<T extends Comparable<? super T>>` and multiple bounds, invariance vs covariant arrays, wildcards and PECS (producer extends, consumer super), unbounded wildcards and capture helpers, type erasure with bridge methods, what erasure forbids (`new T()`, generic arrays, `instanceof List<String>`) and the workarounds, heap pollution with `@SafeVarargs`, and type tokens, recursive bounds and generic repositories.",
    slides: SLIDES,
    widget: { heading: "Interactive: PECS checker", caption: "Pick the declared type of `list` and see which of 8 statements compile. Every verdict was verified with javac (Java 21).", render: pecsWidget },
    examplesHeading: "Where generics show up at work",
    examples: [
      ["Spring Data repositories", "`interface OrderRepository extends JpaRepository<Order, Long>`: the generic parameters drive query methods and ID types (S06)."],
      ["HTTP clients and JSON", "`ParameterizedTypeReference<List<Order>>` (Spring) and `TypeReference<...>` (Jackson) recover erased types for deserialisation."],
      ["Event handlers", "`interface Handler<E extends DomainEvent> { void handle(E event); }` with a registry `Map<Class<?>, Handler<?>>`."],
      ["Utility APIs", "`Collections.max`, `Comparator.comparing`, `Stream.map` all use bounded wildcards so they accept the widest set of callers."],
      ["Result/Either types", "Service layers return `Result<T>` or `Optional<T>` instead of nulls; generic `map`/`flatMap` keep the code fluent."],
      ["Builders", "Lombok `@SuperBuilder` and many SDK builders use recursive bounds so subclass builders stay fluent."]
    ],
    pitfalls: [
      "Using raw types (`List`, `Map`) in new code",
      "Expecting `List<Integer>` to be assignable to `List<Number>`",
      "Wildcards in return types (pushes complexity to every caller)",
      "Trying `new T()`, `new T[]`, or `instanceof List<String>`",
      "Ignoring unchecked warnings (heap pollution surfaces later as ClassCastException)",
      "`var list = new ArrayList<>()` (infers `ArrayList<Object>`)",
      "Overloading methods whose parameters differ only in type arguments (same erasure)",
      "Generic arrays exposed from varargs methods marked `@SafeVarargs` incorrectly"
    ],
    quiz: [
      { q: "Is `List<Integer>` a subtype of `List<Number>`?", options: ["Yes", "No, generics are invariant", "Only at run time", "Only with a cast"], answer: 1, why: "Use `List<? extends Number>` for a read-only view." },
      { q: "Which can you add an `Integer` to?", options: ["`List<? extends Number>`", "`List<? super Integer>`", "`List<?>`", "None of them"], answer: 1, why: "Consumer super." },
      { q: "What does `List<? extends Number>.get(0)` return?", options: ["Object", "Number", "Integer", "Compile error"], answer: 1, why: "Producer extends: you read the bound." },
      { q: "Signature of `Collections.copy`?", options: ["`copy(List<T> dest, List<T> src)`", "`copy(List<? super T> dest, List<? extends T> src)`", "`copy(List<? extends T> dest, List<? super T> src)`", "`copy(List<?> dest, List<?> src)`"], answer: 1, why: "Read from the producer, write to the consumer." },
      { q: "`new ArrayList<String>().getClass() == new ArrayList<Integer>().getClass()` is…", options: ["true", "false", "Compile error", "Depends on JVM"], answer: 0, why: "Type erasure: one runtime class." },
      { q: "Why can't you write `new T()`?", options: ["T might be abstract and the type is erased at run time", "Constructors can't be generic", "It's allowed", "Only for interfaces"], answer: 0, why: "Pass a Supplier<T> or Class<T>." },
      { q: "What does `Object[] a = new String[1]; a[0] = 1;` do?", options: ["Compile error", "Throws ArrayStoreException", "Works", "Throws ClassCastException"], answer: 1, why: "Arrays are covariant and checked at run time." },
      { q: "Why `<T extends Comparable<? super T>>` instead of `<T extends Comparable<T>>`?", options: ["Style only", "So types that inherit compareTo from a supertype (e.g. LocalDate) qualify", "For performance", "To allow primitives"], answer: 1, why: "LocalDate implements Comparable<ChronoLocalDate>." },
      { q: "When is `@SafeVarargs` appropriate?", options: ["Any generic varargs method", "When the method doesn't store into or expose the varargs array", "Only on abstract methods", "To allow primitives"], answer: 1, why: "It promises the method is safe for callers." }
    ],
    cheatsheet: {
      table: [
        ["Syntax", "Meaning"],
        ["`class Box<T>`", "Generic class"],
        ["`<T> T m(T x)`", "Generic method (type params before return type)"],
        ["`<T extends A & B>`", "Bounded: T is A (class first) and B"],
        ["`List<? extends T>`", "Read T's (producer); add only null"],
        ["`List<? super T>`", "Add T's (consumer); read Object"],
        ["`List<?>`", "Unknown type; read Object; add null"],
        ["`Class<T>`, `Supplier<T>`", "Work around erasure"],
        ["`@SafeVarargs`", "Generic varargs that don't leak the array"]],
      cards: [
        { title: "PECS", items: ["Producer → extends", "Consumer → super", "Both → exact T", "Wildcards in params, not returns"] },
        { title: "Erasure forbids", items: ["`new T()`", "`new T[n]`", "`instanceof List<String>`", "Overloads differing only in type args", "Static fields of type T", "Primitives as type args"] },
        { title: "Say in interviews", items: ["Compile-time safety, erased at run time", "Invariance vs covariant arrays", "Bridge methods", "Super type tokens", "Raw types = legacy"] }]
    },
    practice: [
      { level: "Easy", q: "What is type erasure and what are its consequences?",
        a: ["After type-checking, the compiler removes type arguments: parameters become their bound (`Object` by default), casts are inserted at use sites, and bridge methods preserve polymorphism.",
          "Consequences: `List<String>` and `List<Integer>` share one runtime class; no `new T()`, no `new T[]`, no `instanceof List<String>`; overloads can't differ only by type arguments; primitives can't be type arguments.",
          "Benefit: binary compatibility with pre-generics code and no runtime overhead per parameterisation.",
          "Generic signatures remain in class metadata, which is how frameworks recover them via reflection (`getGenericSuperclass`)."] },
      { level: "Easy", q: "Explain PECS with `Collections.copy` and write `addAll(Collection<? super T>, T...)`.",
        code: `@SafeVarargs
static <T> boolean addAll(Collection<? super T> target, T... items) {
    boolean changed = false;
    for (T t : items) changed |= target.add(t);
    return changed;
}

List<Number> numbers = new ArrayList<>();
addAll(numbers, 1, 2, 3);           // T = Integer, target is a consumer of Integers
addAll(numbers, 2.5);               // T = Double
List<Object> objects = new ArrayList<>();
addAll(objects, "DEL", "BLR");
System.out.println(numbers + " " + objects);`,
        a: ["PECS: if a parameter **produces** T values for you to read, type it `? extends T`; if it **consumes** T values you write, type it `? super T`.",
          "`Collections.copy(List<? super T> dest, List<? extends T> src)` reads from `src` and writes into `dest`, so you can copy a `List<Integer>` into a `List<Number>`.",
          "`addAll` writes into `target`, so `? super T` makes it accept `List<Number>` and `List<Object>` as well as `List<Integer>` (the JDK's `Collections.addAll` has exactly this signature)."] },
      { level: "Easy", q: "Why does this not compile, and how do you fix it?",
        qcode: `static double sum(List<Number> nums) { double s = 0; for (Number n : nums) s += n.doubleValue(); return s; }
List<Integer> seats = List.of(1, 2, 3);
// sum(seats);   // error: incompatible types: List<Integer> cannot be converted to List<Number>
System.out.println("see the answer");`,
        a: ["Generics are invariant: `List<Integer>` isn't a `List<Number>` (otherwise `sum` could add a `Double` into the integer list).",
          "Fix: `static double sum(List<? extends Number> nums)`. It only reads, so a producer wildcard is exactly right.",
          "Alternative: make it generic `static <T extends Number> double sum(List<T> nums)`; equivalent here."] },
      { level: "Medium", q: "Implement a type-safe heterogeneous container: store one value per type and get it back without casts at the call site.",
        code: `final class Favorites {
    private final Map<Class<?>, Object> map = new HashMap<>();
    <T> void put(Class<T> type, T value) { map.put(Objects.requireNonNull(type), type.cast(value)); }
    <T> T get(Class<T> type) { return type.cast(map.get(type)); }        // Class.cast: checked, no unchecked warning
}

Favorites f = new Favorites();
f.put(String.class, "DEL-BLR");
f.put(Integer.class, 4850);
f.put(LocalDate.class, LocalDate.of(2026, 12, 25));
String route = f.get(String.class);
int fare = f.get(Integer.class);
System.out.println(route + " ₹" + fare + " on " + f.get(LocalDate.class));`,
        a: ["Key the map by `Class<T>` (a **type token**) and use `type.cast` on the way in and out, so types are checked at run time without unchecked casts.",
          "Callers get compile-time types from the generic method signature: `f.get(Integer.class)` is an `Integer`.",
          "Limitation: `Class` can't represent `List<String>` (erasure); use a super type token (`TypeRef<List<String>>`) if you need that.",
          "This pattern (Effective Java Item 33) underlies Spring's `getBean(Class<T>)` and `ApplicationContext` APIs."] },
      { level: "Medium", q: "Write a generic `LruCache<K, V>` with a bounded size and explain the type parameters.",
        code: `final class LruCache<K, V> {
    private final int capacity;
    private final LinkedHashMap<K, V> map;
    LruCache(int capacity) {
        this.capacity = capacity;
        this.map = new LinkedHashMap<>(16, 0.75f, true) {          // access order
            @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) { return size() > LruCache.this.capacity; }
        };
    }
    Optional<V> get(K key) { return Optional.ofNullable(map.get(key)); }
    void put(K key, V value) { map.put(key, value); }
    <R> Optional<R> getAs(K key, Function<? super V, ? extends R> f) { return get(key).map(f); }
    @Override public String toString() { return map.keySet().toString(); }
}

LruCache<String, Integer> fares = new LruCache<>(2);
fares.put("DEL-BLR", 4850); fares.put("BOM-GOI", 3200);
fares.get("DEL-BLR");                       // touch: most recently used
fares.put("CCU-MAA", 5100);                 // evicts BOM-GOI
System.out.println(fares + " " + fares.getAs("DEL-BLR", f -> "₹" + f).orElse("miss"));`,
        a: ["`K` and `V` make the cache reusable for any key/value types while keeping `get` type-safe (no casts at call sites).",
          "`getAs` uses PECS on the `Function`: it consumes a `V` (`? super V`) and produces an `R` (`? extends R`), the same as `Optional.map`.",
          "`LinkedHashMap` in access order with `removeEldestEntry` gives LRU eviction (J08 covers the internals); the anonymous subclass refers to the outer `capacity` via `LruCache.this`.",
          "For production use Caffeine, which is concurrent and smarter (S11)."] },
      { level: "Medium", q: "Why can't you create a generic array, and how does `ArrayList<E>` store its elements?",
        a: ["Arrays know their element type at run time and check every store (`ArrayStoreException`); a `T[]` can't be created because `T` is erased, and `List<String>[]` would defeat the store check (heap pollution).",
          "`ArrayList<E>` keeps an `Object[] elementData` internally and casts on `get`: `return (E) elementData[index];` with an unchecked warning suppressed, which is safe because only `E`s are ever stored via the typed `add`.",
          "`toArray()` returns `Object[]`; `toArray(String[]::new)` or `toArray(new String[0])` returns a correctly typed array.",
          "In your own code prefer `List<T>`; if you must, take an `IntFunction<T[]>` from the caller."] },
      { level: "Medium", q: "What are bridge methods? Show one.",
        a: ["When a class implements a generic interface with a concrete type (e.g. `Comparable<Fare>`), its method `compareTo(Fare)` doesn't override the erased interface method `compareTo(Object)`.",
          "`javac` generates a synthetic **bridge** `compareTo(Object o) { return compareTo((Fare) o); }` so virtual dispatch through the erased interface still reaches your method.",
          "You can see it with `javap -p Fare` or reflection (`Method.isBridge()`), as in slide 8.",
          "Bridges are also generated for covariant return types."] },
      { level: "Hard", q: "Explain heap pollution with a concrete bug and how you'd prevent it in a codebase.",
        a: ["Heap pollution: a variable of type `List<String>` refers to a list containing a non-String. It's only possible through raw types, unchecked casts or generic varargs; the compiler warns about each.",
          "Bug example: a legacy method takes a raw `List` and adds an `Integer`; much later `for (String s : names)` throws `ClassCastException` at a line with no casts in sight (the compiler-inserted cast).",
          "Prevention: compile with `-Xlint:unchecked -Werror` (or Error Prone), forbid raw types, keep `@SuppressWarnings(\"unchecked\")` on the smallest scope with a justification, use `Collections.checkedList` at boundaries with legacy code, and mark only truly safe varargs with `@SafeVarargs`."] },
      { level: "Hard", q: "Design a type-safe event bus: `subscribe(Class<E>, Consumer<? super E>)` and `publish(Object)`, where handlers for a supertype also receive subtype events.",
        code: `final class EventBus {
    private final Map<Class<?>, List<Consumer<Object>>> handlers = new LinkedHashMap<>();
    <E> void subscribe(Class<E> type, Consumer<? super E> handler) {
        handlers.computeIfAbsent(type, k -> new ArrayList<>()).add(o -> handler.accept(type.cast(o)));
    }
    void publish(Object event) {
        handlers.forEach((type, hs) -> { if (type.isInstance(event)) hs.forEach(h -> h.accept(event)); });
    }
}
sealed interface BookingEvent permits Booked, Cancelled {}
record Booked(String pnr) implements BookingEvent {}
record Cancelled(String pnr, String reason) implements BookingEvent {}

EventBus bus = new EventBus();
bus.subscribe(Booked.class, e -> System.out.println("email confirmation for " + e.pnr()));
bus.subscribe(BookingEvent.class, e -> System.out.println("audit: " + e));
Consumer<Object> metrics = e -> System.out.println("metrics +1 " + e.getClass().getSimpleName());
bus.subscribe(Cancelled.class, metrics);                         // Consumer<Object> accepted thanks to ? super E
bus.publish(new Booked("X7Q2"));
bus.publish(new Cancelled("K9M1", "schedule change"));`,
        a: ["`subscribe` uses a `Class<E>` token plus `Consumer<? super E>`, so a generic `Consumer<Object>` (metrics) can listen to `Cancelled` events.",
          "Internally handlers are stored erased (`Consumer<Object>`) behind a wrapper that does `type.cast`, so there are no unchecked casts.",
          "`publish` dispatches with `type.isInstance(event)`, so subscribers to `BookingEvent` see both subtypes.",
          "Production versions add thread safety (`CopyOnWriteArrayList`), async dispatch and error isolation; Spring's `ApplicationEventPublisher` with `@EventListener` does this with generics resolution built in."] },
      { level: "Hard", q: "How do Jackson's `TypeReference` and Spring's `ParameterizedTypeReference` get around erasure?",
        a: ["`new TypeReference<List<Order>>() {}` creates an **anonymous subclass**. A class's generic superclass is recorded in the class file, so `getClass().getGenericSuperclass()` returns `TypeReference<List<Order>>` as a `ParameterizedType`.",
          "The library reads the actual type argument (`List<Order>`, including the nested `Order`) and uses it to deserialise correctly.",
          "That's why you need the `{}`: without a subclass, the type argument would be erased.",
          "The same trick (\"super type token\", Neal Gafter) appears in Guice `TypeLiteral` and Guava `TypeToken`."] }
    ],
    recap: [
      "Generics give compile-time type safety and remove casts; type arguments must be reference types.",
      "Generic classes, records and methods; inference + diamond; bounds with `extends` (and `&` for multiple).",
      "Generics are invariant; arrays are covariant (and unsafe). Use wildcards: Producer Extends, Consumer Super; `?` for unknown.",
      "Erasure: bounds replace T, casts are inserted, bridges keep overriding working. No `new T()`, generic arrays or `instanceof List<String>`; use Class/Supplier/IntFunction tokens.",
      "Avoid raw types and unchecked warnings (heap pollution); know type tokens and recursive bounds from frameworks."
    ]
  });
})();
