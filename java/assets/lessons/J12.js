/* Lesson J12: Optional done right */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // States and results printed by Java 21 for every input × terminal (see caption)
  var RES = {"0_orElse": {"st": ["Optional[ 6E-201 ]", "Optional[6E-201]", "Optional[6E-201]", "Optional[DEL→BLR 06:10]"], "res": "DEL→BLR 06:10", "fb": true}, "0_orElseGet": {"st": ["Optional[ 6E-201 ]", "Optional[6E-201]", "Optional[6E-201]", "Optional[DEL→BLR 06:10]"], "res": "DEL→BLR 06:10", "fb": false}, "0_orElseThrow": {"st": ["Optional[ 6E-201 ]", "Optional[6E-201]", "Optional[6E-201]", "Optional[DEL→BLR 06:10]"], "res": "DEL→BLR 06:10", "fb": false}, "0_ifPresentOrElse": {"st": ["Optional[ 6E-201 ]", "Optional[6E-201]", "Optional[6E-201]", "Optional[DEL→BLR 06:10]"], "res": "printed DEL→BLR 06:10", "fb": false}, "1_orElse": {"st": ["Optional[ AI-999 ]", "Optional[AI-999]", "Optional[AI-999]", "Optional.empty"], "res": "no flight", "fb": true}, "1_orElseGet": {"st": ["Optional[ AI-999 ]", "Optional[AI-999]", "Optional[AI-999]", "Optional.empty"], "res": "no flight", "fb": true}, "1_orElseThrow": {"st": ["Optional[ AI-999 ]", "Optional[AI-999]", "Optional[AI-999]", "Optional.empty"], "res": "NoSuchElementException: No value present", "fb": false}, "1_ifPresentOrElse": {"st": ["Optional[ AI-999 ]", "Optional[AI-999]", "Optional[AI-999]", "Optional.empty"], "res": "printed: not found", "fb": false}, "2_orElse": {"st": ["Optional[   ]", "Optional[]", "Optional.empty", "Optional.empty"], "res": "no flight", "fb": true}, "2_orElseGet": {"st": ["Optional[   ]", "Optional[]", "Optional.empty", "Optional.empty"], "res": "no flight", "fb": true}, "2_orElseThrow": {"st": ["Optional[   ]", "Optional[]", "Optional.empty", "Optional.empty"], "res": "NoSuchElementException: No value present", "fb": false}, "2_ifPresentOrElse": {"st": ["Optional[   ]", "Optional[]", "Optional.empty", "Optional.empty"], "res": "printed: not found", "fb": false}, "3_orElse": {"st": ["Optional.empty", "Optional.empty", "Optional.empty", "Optional.empty"], "res": "no flight", "fb": true}, "3_orElseGet": {"st": ["Optional.empty", "Optional.empty", "Optional.empty", "Optional.empty"], "res": "no flight", "fb": true}, "3_orElseThrow": {"st": ["Optional.empty", "Optional.empty", "Optional.empty", "Optional.empty"], "res": "NoSuchElementException: No value present", "fb": false}, "3_ifPresentOrElse": {"st": ["Optional.empty", "Optional.empty", "Optional.empty", "Optional.empty"], "res": "printed: not found", "fb": false}};
  var INPUTS = [["\" 6E-201 \"", "known flight"], ["\" AI-999 \"", "unknown flight"], ["\"   \"", "blank"], ["null", "null"]];
  var TERMS = {
    orElse: { code: ".orElse(fallback())", note: "`orElse(x)` takes a **value**, so `fallback()` is evaluated **before** the call, even when the Optional has a value." },
    orElseGet: { code: ".orElseGet(() -> fallback())", note: "`orElseGet(supplier)` calls the supplier **only when empty**: use it when the default is expensive or has side effects." },
    orElseThrow: { code: ".orElseThrow()", note: "`orElseThrow()` (Java 10) returns the value or throws `NoSuchElementException`; it's the honest name for `get()`. Pass a supplier for a domain exception: `orElseThrow(() -> new FlightNotFound(no))`." },
    ifPresentOrElse: { code: ".ifPresentOrElse(v -> print(v), () -> print(\"not found\"))", note: "`ifPresentOrElse` (Java 9) runs one of two actions; no value comes back." }
  };
  var STEPS = ["ofNullable", "map(strip)", "filter(non-empty)", "map(flights::get)"];
  function optWidget(el, ctx) {
    var s = ctx.state; if (s.i == null) { s.i = 0; s.t = "orElse"; }
    el.innerHTML = "<p>" + ctx.md("A lookup `findFlight(input)` written as an Optional chain over `Map.of(\"6E-201\", \"DEL→BLR 06:10\")`. Pick an input and how to get the value out; the diagram shows the Optional after each step. `map` turns a `null` result into empty; `filter` empties on false.") + "</p>" +
      "<div class='seg' data-r='in'>" + INPUTS.map(function (x, i) { return "<button type='button' data-v='" + i + "'>" + ctx.esc(x[0]) + " <small>(" + x[1] + ")</small></button>"; }).join("") + "</div>" +
      "<div class='seg' data-r='t' style='margin-top:8px'>" + Object.keys(TERMS).map(function (k) { return "<button type='button' data-v='" + k + "'>" + k + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='src' style='margin-top:12px'></pre><div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("in").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", +b.dataset.v === s.i); });
      q("t").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.t); });
      var r = RES[s.i + "_" + s.t];
      q("src").innerHTML = ctx.H.highlight("static String fallback() { System.out.println(\"fallback() called\"); return \"no flight\"; }\n\nString input = " + INPUTS[s.i][0] + ";\nOptional.ofNullable(input)\n    .map(String::strip)\n    .filter(s -> !s.isEmpty())\n    .map(flights::get)          // Map.get returns null for unknown keys → empty\n    " + TERMS[s.t].code + ";");
      var L = ["flowchart LR", "  in0[\"" + INPUTS[s.i][0].replace(/"/g, "#quot;") + "\"]:::s0"], prev = "in0";
      r.st.forEach(function (st, i) {
        var empty = st === "Optional.empty";
        L.push("  n" + i + "[\"" + STEPS[i].replace(/"/g, "#quot;").replace(/>/g, "#gt;") + "<br/><small>" + ctx.esc(st).replace(/"/g, "#quot;") + "</small>\"]:::" + (empty ? "s0e" : "s1"), "  " + prev + " --> n" + i); prev = "n" + i;
      });
      var bad = /Exception/.test(r.res);
      L.push("  t[\"" + s.t + "<br/><small>" + ctx.esc(r.res).replace(/"/g, "#quot;") + "</small>\"]:::" + (bad ? "bad" : "s2"), "  " + prev + " --> t");
      if (r.fb) L.push("  fb[\"fallback() ran\"]:::s4", "  fb -.-> t");
      L.push("  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s0e fill:#f3f4f6,stroke:#9ca3af,stroke-dasharray:4 3", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00", "  classDef bad fill:#fdecea,stroke:#c62828");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var warn = s.t === "orElse" && s.i === 0 ? " **Notice:** the value was present, yet `fallback()` still ran." : "";
      q("res").innerHTML = ctx.md("Result: `" + r.res + "`. `fallback()` called: **" + (r.fb ? "yes" : "no") + "**. " + TERMS[s.t].note + warn);
    }
    q("in").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.i = +b.dataset.v; ctx.save(); draw(); });
    q("t").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.t = b.dataset.v; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Why Optional exists",
      text: "A method that returns `null` for \"not found\" hides that possibility in documentation; callers forget the check and get a `NullPointerException` far from the cause. `Optional<T>` (Java 8) is a small, immutable container holding **zero or one** value, designed as a **return type** for \"there may be no result\". The type itself tells the caller to handle the empty case, and its API makes that handling concise. It is not a replacement for every null, and not a general-purpose Maybe for fields or parameters.",
      code: `record Flight(String no, String route) {}
class FlightRepo {
    private final Map<String, Flight> byNo = Map.of("6E-201", new Flight("6E-201", "DEL-BLR"));
    Flight lookupNullable(String no) { return byNo.get(no); }                          // may return null: nothing says so
    Optional<Flight> findFlight(String no) { return Optional.ofNullable(byNo.get(no)); }   // the type says "maybe"
}
FlightRepo repo = new FlightRepo();
try { System.out.println(repo.lookupNullable("AI-999").route()); }
catch (NullPointerException e) { System.out.println("NPE far from the cause"); }
System.out.println(repo.findFlight("AI-999").map(Flight::route).orElse("unknown flight"));
System.out.println(repo.findFlight("6E-201").map(Flight::route).orElse("unknown flight"));`,
      analogy: "A null is an empty envelope that looks exactly like a full one until you open it at the wrong moment. An Optional is an envelope with a window: you can see whether something is inside before you rely on it." },
    { title: "Creating Optionals",
      text: "`Optional.of(value)` for a value you know is non-null (it throws `NullPointerException` immediately otherwise, which is a feature); `Optional.ofNullable(maybeNull)` to wrap a possibly-null value; `Optional.empty()` for no value. **Never return `null` from a method declared to return `Optional`**: that defeats the whole point.",
      code: `Optional<String> a = Optional.of("DEL");
Optional<String> b = Optional.ofNullable(System.getenv("SURELY_NOT_SET_12345"));
Optional<String> c = Optional.empty();
System.out.println(a + " " + b + " " + c + " " + a.isPresent() + " " + b.isEmpty());
try { Optional.of(null); } catch (NullPointerException e) { System.out.println("Optional.of(null) → NPE"); }

Optional<String> seatFor(String pnr) {
    if (pnr.isBlank()) return Optional.empty();          // not return null
    return pnr.equals("PNR1") ? Optional.of("12A") : Optional.empty();
}
System.out.println(seatFor("PNR1") + " " + seatFor("PNR2") + " " + seatFor(" "));`,
      points: ["`Optional` is a value-based class: don't compare with `==`, don't synchronize on it", "`equals` compares contents: `Optional.of(\"A\").equals(Optional.of(\"A\"))` is true"] },
    { title: "Consuming: stop writing isPresent() + get()",
      text: "`if (opt.isPresent()) { x = opt.get(); }` is just a null check with more steps, and a bare `get()` throws `NoSuchElementException` when empty (Java 10 added `orElseThrow()` as the clearer name). Prefer the declarative methods: transform with `map`, pick a default with `orElse`/`orElseGet`, fail with `orElseThrow`, act with `ifPresent`/`ifPresentOrElse`.",
      code: `Map<String, String> seats = Map.of("PNR1", "12A");
Optional<String> seat = Optional.ofNullable(seats.get("PNR1"));

String s1;
if (seat.isPresent()) s1 = seat.get().toLowerCase(); else s1 = "unassigned";        // verbose
String s2 = seat.map(String::toLowerCase).orElse("unassigned");                       // declarative
System.out.println(s1 + " " + s2);

Optional.ofNullable(seats.get("PNR2")).ifPresentOrElse(
    v -> System.out.println("seat " + v),
    () -> System.out.println("no seat yet: offer web check-in"));
seat.ifPresent(v -> System.out.println("boarding pass for " + v));
try { Optional.empty().get(); } catch (NoSuchElementException e) { System.out.println("get() on empty: " + e.getMessage()); }` },
    { title: "map, flatMap and filter",
      text: "`map(f)` applies f if a value is present and wraps the result with `ofNullable` (so a null result becomes empty). `flatMap(f)` is for functions that **already return an Optional**, avoiding `Optional<Optional<T>>`. `filter(p)` keeps the value only if p is true. Chains read top to bottom and short-circuit at the first empty: no nested null checks.",
      m: M(["flowchart LR",
        "  A[\"Optional#lt;Booking#gt;\"]:::s1 -->|\"flatMap(Booking::passenger)\"| B[\"Optional#lt;Passenger#gt;\"]:::s1",
        "  B -->|\"filter(Passenger::isFrequentFlyer)\"| C[\"Optional#lt;Passenger#gt;\"]:::s1",
        "  C -->|\"map(Passenger::tier)\"| D[\"Optional#lt;String#gt;\"]:::s1",
        "  D -->|\"orElse(#quot;NONE#quot;)\"| E[\"String\"]:::s2",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `record Passenger(String name, String tier) { boolean isFrequentFlyer() { return tier != null; } }
record Booking(String pnr, Passenger lead) { Optional<Passenger> passenger() { return Optional.ofNullable(lead); } }
Map<String, Booking> db = Map.of(
    "P1", new Booking("P1", new Passenger("Asha", "GOLD")),
    "P2", new Booking("P2", new Passenger("Ravi", null)),
    "P3", new Booking("P3", null));

for (String pnr : List.of("P1", "P2", "P3", "P9")) {
    String tier = Optional.ofNullable(db.get(pnr))
        .flatMap(Booking::passenger)                  // returns Optional: flatMap, not map
        .filter(Passenger::isFrequentFlyer)
        .map(Passenger::tier)
        .orElse("NONE");
    System.out.print(pnr + "=" + tier + " ");
}
Optional<Optional<Passenger>> nested = Optional.ofNullable(db.get("P1")).map(Booking::passenger);   // the map mistake
System.out.println("| map gives " + nested.get().getClass().getSimpleName() + " inside an Optional");`,
      analogy: "Each step is a checkpoint. If the passenger isn't there at any checkpoint, everyone downstream just waves the empty trolley through." },
    { title: "orElse vs orElseGet vs orElseThrow vs or",
      text: "`orElse(value)` evaluates its argument **eagerly**, whether or not it's needed. `orElseGet(supplier)` evaluates **lazily**, only when empty: use it for anything costly or with side effects (a DB call, creating objects, logging). `orElseThrow(supplier)` maps absence to a domain exception. `or(supplier)` (Java 9) supplies an **alternative Optional** (try the cache, then the database). The interactive model below proves the eager evaluation.",
      table: [
        ["Method", "Returns", "Default evaluated", "Use for"],
        ["`orElse(v)`", "T", "Always (eager)", "Constants, cheap literals"],
        ["`orElseGet(() -> v)`", "T", "Only when empty", "Computed or expensive defaults"],
        ["`orElseThrow()`", "T", "n/a", "Absence is a bug: NoSuchElementException"],
        ["`orElseThrow(() -> ex)`", "T", "Only when empty", "Domain errors (404 Not Found)"],
        ["`or(() -> opt)`", "Optional<T>", "Only when empty", "Fallback lookups"]],
      code: `class Fares {
    int dbCalls;
    int fromDb(String route) { dbCalls++; return 4999; }
}
Fares f = new Fares();
Optional<Integer> cached = Optional.of(4850);
int a = cached.orElse(f.fromDb("DEL-BLR"));               // DB called although cached!
int b = cached.orElseGet(() -> f.fromDb("DEL-BLR"));      // not called
System.out.println(a + " " + b + " dbCalls=" + f.dbCalls);

Optional<String> fromCache = Optional.empty();
Optional<String> seat = fromCache.or(() -> Optional.of("14C"));    // alternative Optional
System.out.println(seat.orElseThrow());
try { Optional.<String>empty().orElseThrow(() -> new IllegalArgumentException("PNR P9 not found")); }
catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }` },
    { title: "Optional and streams",
      text: "Many stream terminals return Optionals: `findFirst`, `findAny`, `min`, `max`, `reduce(op)`. `Optional.stream()` (Java 9) turns an Optional into a stream of zero or one element, so `flatMap(Optional::stream)` drops empties from a stream of Optionals, the clean replacement for `filter(Optional::isPresent).map(Optional::get)`.",
      code: `Map<String, String> seats = Map.of("P1", "12A", "P3", "14C");
Function<String, Optional<String>> seatOf = pnr -> Optional.ofNullable(seats.get(pnr));

List<String> pnrs = List.of("P1", "P2", "P3");
List<String> assigned = pnrs.stream().map(seatOf).flatMap(Optional::stream).toList();
System.out.println(assigned);

Optional<String> firstWindow = assigned.stream().filter(s -> s.endsWith("A")).findFirst();
Optional<Integer> maxRow = assigned.stream().map(s -> Integer.parseInt(s.replaceAll("\\\\D", ""))).max(Integer::compare);
System.out.println(firstWindow + " " + maxRow + " " + Stream.<Integer>empty().reduce(Integer::sum));
System.out.println(seatOf.apply("P2").stream().count() + " " + seatOf.apply("P1").stream().map(String::length).toList());` },
    { title: "Where to use Optional, and where not",
      text: "The JDK designers intended Optional for **method return types** where absence is a normal outcome. Elsewhere it usually adds noise or cost. As **fields** it bloats objects and isn't `Serializable`; as **parameters** it forces callers to wrap (use overloads or a nullable parameter documented as such); in **collections** return an empty collection instead of `Optional<List<T>>` or a list of Optionals; and never use Optional for values that must exist (that's an exception or a non-null contract).",
      table: [
        ["Situation", "Do", "Don't"],
        ["Lookup may find nothing", "`Optional<User> findByEmail(String)`", "Return null"],
        ["Collection result", "Return `List.of()` when nothing", "`Optional<List<User>>`"],
        ["Optional field", "Nullable field + `Optional<T> getX()` accessor", "`private Optional<T> x`"],
        ["Optional argument", "Overload `search(q)` / `search(q, filter)`", "`search(q, Optional<Filter>)`"],
        ["Must exist", "`orElseThrow` at the boundary or a non-null type", "`Optional.get()` everywhere"],
        ["Hot loops / huge collections", "Primitives, sentinel values", "Millions of Optional allocations"]],
      code: `final class Passenger {
    private final String name;
    private final String loyaltyId;                         // nullable field…
    Passenger(String name, String loyaltyId) { this.name = Objects.requireNonNull(name); this.loyaltyId = loyaltyId; }
    Optional<String> loyaltyId() { return Optional.ofNullable(loyaltyId); }   // …Optional accessor
}
List<String> searchFlights(String route) { return route.equals("DEL-BLR") ? List.of("6E-201", "AI-505") : List.of(); }   // empty list, not Optional

System.out.println(new Passenger("Asha", "GOLD-77").loyaltyId().orElse("-") + " " + new Passenger("Ravi", null).loyaltyId().orElse("-"));
System.out.println(searchFlights("DEL-BLR") + " " + searchFlights("XYZ").isEmpty());` },
    { title: "Primitive optionals and value-based rules",
      text: "`OptionalInt`, `OptionalLong` and `OptionalDouble` avoid boxing and come from primitive streams (`IntStream.max()`, `average()`). They have a smaller API (`getAsInt`, `orElse`, `ifPresent`, no `map`/`filter`). All Optionals are **value-based**: identity is meaningless, so don't use `==`, `synchronized`, or identity hash maps with them, and don't assume `Optional.empty()` is a singleton you can compare by reference.",
      code: `OptionalInt maxFare = IntStream.of(4850, 3200, 5300).max();
OptionalDouble avg = IntStream.empty().average();
System.out.println(maxFare.getAsInt() + " " + avg.isPresent() + " " + avg.orElse(0.0));

Optional<String> x = Optional.of("DEL"), y = Optional.of("DEL");
System.out.println("equals: " + x.equals(y) + " (use equals, never ==)");
System.out.println(Optional.of(5).map(v -> v * 2).filter(v -> v > 5).isPresent());` },
    { title: "Other ways to handle null",
      text: "Optional is one tool among several. Validate inputs at the boundary with `Objects.requireNonNull(x, \"msg\")` (fail fast with a clear message), default with `Objects.requireNonNullElse(x, def)` / `requireNonNullElseGet`, return **empty collections** instead of null, use the **Null Object** pattern for behaviour (a `NoDiscount` policy instead of `null`), and annotate APIs with `@Nullable`/`@NonNull` (JSpecify, used by Spring) so IDEs and tools like NullAway catch mistakes at compile time.",
      code: `interface Discount { int apply(int fare); }
final class NoDiscount implements Discount { public int apply(int fare) { return fare; } }     // Null Object
record Promo(String code, int off) implements Discount { public int apply(int fare) { return fare - off; } }
Map<String, Discount> promos = Map.of("FLAT500", new Promo("FLAT500", 500));
Discount d = promos.getOrDefault("UNKNOWN", new NoDiscount());     // no null, no Optional, just behaviour
System.out.println(d.apply(4850) + " " + promos.getOrDefault("FLAT500", new NoDiscount()).apply(4850));

String city = Objects.requireNonNullElse(System.getenv("SURELY_NOT_SET_12345"), "Bengaluru");
try { Objects.requireNonNull(null, "pnr must not be null"); } catch (NullPointerException e) { System.out.println(city + " | " + e.getMessage()); }`,
      points: ["Helpful NullPointerExceptions (Java 14+) name the null variable: `Cannot invoke \"String.length()\" because \"name\" is null`", "Spring Framework 7 / Boot 4 annotate their APIs with JSpecify nullness annotations"] },
    { title: "Optional at API boundaries (Spring and JPA)",
      text: "Spring Data repositories return `Optional<T>` from `findById` and from custom finders you declare as `Optional<User> findByEmail(String email)`. In the service layer, convert absence into a domain exception with `orElseThrow`, and let a controller advice turn that into an HTTP 404. Don't pass Optionals into JPA entities or JSON DTOs: unwrap at the boundary.",
      code: `record User(long id, String email) {}
class NotFoundException extends RuntimeException { NotFoundException(String m) { super(m); } }
interface UserRepository { Optional<User> findById(long id); Optional<User> findByEmail(String email); }

class InMemoryUsers implements UserRepository {
    private final Map<Long, User> data = Map.of(1L, new User(1, "asha@example.com"));
    public Optional<User> findById(long id) { return Optional.ofNullable(data.get(id)); }
    public Optional<User> findByEmail(String email) { return data.values().stream().filter(u -> u.email().equalsIgnoreCase(email)).findFirst(); }
}
class UserService {
    private final UserRepository repo;
    UserService(UserRepository repo) { this.repo = repo; }
    User get(long id) { return repo.findById(id).orElseThrow(() -> new NotFoundException("user " + id)); }   // → 404 in a @ControllerAdvice
    String displayName(String email) { return repo.findByEmail(email).map(User::email).map(e -> e.split("@")[0]).orElse("guest"); }
}

UserService svc = new UserService(new InMemoryUsers());
System.out.println(svc.get(1).email() + " " + svc.displayName("ASHA@example.com") + " " + svc.displayName("x@y.z"));
try { svc.get(42); } catch (NotFoundException e) { System.out.println("404: " + e.getMessage()); }` }
  ];

  H.registerLesson({
    code: "J12",
    summary: "Optional as a return type for \"maybe no result\": why it exists, creating (`of`, `ofNullable`, `empty`), consuming without `isPresent()`+`get()`, chaining with `map`/`flatMap`/`filter`, the eager `orElse` vs lazy `orElseGet` trap, `orElseThrow` and `or`, Optionals in streams (`flatMap(Optional::stream)`), where not to use it (fields, parameters, collections), primitive optionals and value-based rules, other null strategies (`requireNonNull`, empty collections, Null Object, nullness annotations), and Optional at Spring/JPA boundaries.",
    slides: SLIDES,
    widget: { heading: "Interactive: follow a value through an Optional chain", caption: "Pick an input and a way to unwrap it. Each step's Optional, the result and whether `fallback()` ran were printed by Java 21 for all 16 combinations.", render: optWidget },
    examplesHeading: "Where Optional shows up at work",
    examples: [
      ["Repositories", "Spring Data `findById`, `findByEmail` return `Optional<T>`; services call `orElseThrow(() -> new NotFoundException(...))`."],
      ["Config lookups", "`Optional.ofNullable(env.get(\"REGION\")).map(Region::valueOf).orElse(Region.AP_SOUTH_1)`."],
      ["Stream results", "`findFirst`, `max(comparator)` for \"cheapest fare\" or \"latest booking\"."],
      ["Parsing", "`tryParse(String)` helpers returning `Optional<LocalDate>` instead of throwing or returning null."],
      ["Cache then source", "`cache.get(k).or(() -> db.find(k))`."],
      ["Code review", "Spotting `get()` without checks, `orElse(expensiveCall())`, and `Optional` fields in entities/DTOs."]
    ],
    pitfalls: [
      "Returning `null` from a method that returns `Optional`",
      "`isPresent()` + `get()` instead of `map`/`orElse`",
      "`orElse(expensiveCall())` (always evaluated)",
      "`map` with a function that returns Optional (use `flatMap`)",
      "Optional fields, parameters, or `Optional<List<T>>`",
      "Using `Optional.of` on a value that can be null",
      "Comparing Optionals with `==` or synchronizing on them",
      "Wrapping everything in Optional instead of fixing nullable design",
      "Optionals in JPA entities or JSON DTOs"
    ],
    quiz: [
      { q: "What does `Optional.of(null)` do?", options: ["Returns Optional.empty()", "Throws NullPointerException", "Returns Optional[null]", "Compile error"], answer: 1, why: "Use ofNullable for possibly-null values." },
      { q: "What does this print?", code: `Optional<String> o = Optional.of("6E-201");
String v = o.orElse(load());
// where load() prints "load" and returns "x"`, options: ["Nothing", "load", "6E-201", "x"], answer: 1, why: "orElse evaluates its argument eagerly; use orElseGet.", noCompile: true },
      { q: "A function returns `Optional<Passenger>`. To chain it from `Optional<Booking>` use…", options: ["map", "flatMap", "filter", "or"], answer: 1, why: "map would give Optional<Optional<Passenger>>." },
      { q: "`Optional.ofNullable(map.get(k)).map(String::trim)` when the key is missing gives…", options: ["NPE", "Optional.empty", "Optional[null]", "\"\""], answer: 1, why: "Empty short-circuits." },
      { q: "Which is the recommended replacement for `opt.get()`?", options: ["opt.orElse(null)", "opt.orElseThrow()", "opt.isPresent()", "opt.toString()"], answer: 1, why: "Same behaviour, honest name (Java 10)." },
      { q: "Where is Optional intended to be used?", options: ["Entity fields", "Method parameters", "Method return types when a result may be absent", "Collection elements"], answer: 2, why: "That was the design goal." },
      { q: "How do you drop empty Optionals from a Stream<Optional<T>>?", options: ["filter(Objects::nonNull)", "flatMap(Optional::stream)", "map(Optional::get)", "distinct()"], answer: 1, why: "Java 9 Optional.stream()." },
      { q: "A method should return \"no results\" for a search. Best return value?", options: ["null", "Optional<List<T>>", "An empty list", "Optional.empty()"], answer: 2, why: "Empty collections already express absence." },
      { q: "`opt.or(() -> other)` returns…", options: ["T", "Optional<T>", "boolean", "Stream<T>"], answer: 1, why: "An alternative Optional when empty (Java 9)." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Use"],
        ["Wrap maybe-null", "`Optional.ofNullable(x)`"],
        ["Transform", "`map(f)` (f returns T) / `flatMap(f)` (f returns Optional)"],
        ["Keep if", "`filter(p)`"],
        ["Default (cheap)", "`orElse(\"N/A\")`"],
        ["Default (costly)", "`orElseGet(() -> compute())`"],
        ["Absent is an error", "`orElseThrow(() -> new NotFound(id))`"],
        ["Fallback source", "`or(() -> other.find(id))`"],
        ["Side effect", "`ifPresent` / `ifPresentOrElse`"],
        ["In streams", "`flatMap(Optional::stream)`"]],
      cards: [
        { title: "Use for", items: ["Return types of lookups", "Stream terminals", "Chaining nullable navigation"] },
        { title: "Avoid for", items: ["Fields", "Parameters", "Collections", "Values that must exist", "Hot paths"] },
        { title: "Say in interviews", items: ["orElse is eager", "Never return null Optional", "get() → orElseThrow()", "Empty collection over Optional<List>"] }]
    },
    practice: [
      { level: "Easy", q: "What problem does Optional solve, and what doesn't it solve?",
        a: ["It makes \"no result\" explicit in a method's return type and gives a fluent API to handle absence (`map`, `orElse`, `orElseThrow`), reducing forgotten null checks.",
          "It doesn't eliminate null from Java: fields, parameters, collections and legacy APIs can still be null, and `Optional` itself can be null if someone returns it badly.",
          "It isn't free: each Optional is an object (usually cheap, but avoid in hot loops and huge collections).",
          "Use nullness annotations and validation at boundaries alongside it."] },
      { level: "Easy", q: "Rewrite this null-checking code with Optional: `String city = null; if (user != null && user.address() != null) city = user.address().city(); if (city == null) city = \"Unknown\";`",
        code: `record Address(String city) {}
record User(String name, Address address) {}
static String city(User user) {
    return Optional.ofNullable(user).map(User::address).map(Address::city).orElse("Unknown");
}
System.out.println(city(new User("Asha", new Address("Pune"))) + " " + city(new User("Ravi", null)) + " " + city(null));`,
        a: ["Each `map` step is skipped once a null appears (a null result also becomes empty).",
          "`orElse(\"Unknown\")` is fine here because the default is a constant.",
          "If the domain allows, better still: make `address` non-null and give `User` an `Optional<Address> address()` accessor."] },
      { level: "Easy", q: "orElse vs orElseGet: show the difference with output.",
        code: `static String expensive() { System.out.print("[expensive called] "); return "default"; }
Optional<String> present = Optional.of("value");
System.out.println(present.orElse(expensive()));
System.out.println(present.orElseGet(() -> expensive()));
System.out.println(Optional.<String>empty().orElseGet(() -> expensive()));`,
        a: ["`orElse(expensive())`: Java evaluates method arguments before the call, so `expensive()` runs even though the value is present.",
          "`orElseGet(supplier)` only invokes the supplier when the Optional is empty.",
          "Rule: constants → `orElse`; anything computed, allocated, logged or remote → `orElseGet`."] },
      { level: "Medium", q: "When should you use map vs flatMap on Optional? Give an example where map is wrong.",
        code: `record Seat(String no) {}
record Passenger(String name, Seat seat) { Optional<Seat> seatAssignment() { return Optional.ofNullable(seat); } }
Optional<Passenger> p = Optional.of(new Passenger("Asha", new Seat("12A")));

Optional<Optional<Seat>> wrong = p.map(Passenger::seatAssignment);
Optional<String> right = p.flatMap(Passenger::seatAssignment).map(Seat::no);
System.out.println(wrong + " vs " + right);`,
        a: ["`map(f)` when f returns a plain value (or null): the result is wrapped for you.",
          "`flatMap(f)` when f already returns an Optional, to avoid `Optional<Optional<T>>`.",
          "Same distinction as `Stream.map`/`flatMap` and `CompletableFuture.thenApply`/`thenCompose`."] },
      { level: "Medium", q: "Should Optional be used for fields and method parameters? Why or why not?",
        a: ["**Fields**: not recommended. Optional isn't `Serializable` (problematic for JPA, caching, Java serialization), adds an object per field, and JSON mappers need extra modules. Keep a nullable field and expose `Optional<T> getX()`.",
          "**Parameters**: callers must wrap arguments (`Optional.empty()`, `Optional.of(x)`), and the parameter itself can still be null. Prefer overloads, a builder, or a documented nullable parameter.",
          "**Return types**: yes, that's the intended use for \"may be absent\".",
          "**Collections**: return empty collections, never `Optional<List<T>>`."] },
      { level: "Medium", q: "From a list of PNRs, fetch optional seat assignments and return the assigned seats sorted, skipping missing ones.",
        code: `Map<String, String> seatDb = Map.of("P1", "14C", "P3", "12A", "P4", "3F");
Function<String, Optional<String>> findSeat = pnr -> Optional.ofNullable(seatDb.get(pnr));
List<String> seats = Stream.of("P1", "P2", "P3", "P4", "P5")
    .map(findSeat)
    .flatMap(Optional::stream)
    .sorted(Comparator.comparingInt((String s) -> Integer.parseInt(s.replaceAll("\\\\D", ""))).thenComparing(Comparator.naturalOrder()))
    .toList();
System.out.println(seats);`,
        a: ["`map(findSeat)` gives `Stream<Optional<String>>`; `flatMap(Optional::stream)` keeps only present values.",
          "Sort by row number, then seat letter.",
          "Avoid `filter(Optional::isPresent).map(Optional::get)`: same result, noisier."] },
      { level: "Medium", q: "Implement `Optional<LocalDate> tryParseDate(String s)` and use it to validate a booking request.",
        code: `static Optional<LocalDate> tryParseDate(String s) {
    if (s == null || s.isBlank()) return Optional.empty();
    try { return Optional.of(LocalDate.parse(s.strip())); }
    catch (java.time.format.DateTimeParseException e) { return Optional.empty(); }
}
LocalDate today = LocalDate.of(2026, 11, 12);
for (String in : new String[]{"2026-12-01", "2026-02-30", "", null, "2026-11-01"}) {
    String verdict = tryParseDate(in).filter(d -> !d.isBefore(today)).map(d -> "ok " + d).orElse("invalid or past");
    System.out.print(in + " → " + verdict + " | ");
}`,
        a: ["Parsing failures become an empty Optional at one place instead of try/catch at every call site.",
          "`filter` adds the business rule (not in the past); `map` formats; `orElse` handles every failure path uniformly.",
          "If callers need to know *why* it failed, return a result type (sealed `Ok`/`Error`) or throw a validation exception instead."] },
      { level: "Hard", q: "Design a cache-then-database lookup with Optional that only hits the database on a cache miss and populates the cache.",
        code: `class FareService {
    final Map<String, Integer> cache = new HashMap<>();
    final Map<String, Integer> db = Map.of("DEL-BLR", 4850, "BOM-GOI", 3200);
    int dbHits;
    Optional<Integer> fromCache(String route) { return Optional.ofNullable(cache.get(route)); }
    Optional<Integer> fromDb(String route) { dbHits++; return Optional.ofNullable(db.get(route)); }
    Optional<Integer> fare(String route) {
        return fromCache(route).or(() -> fromDb(route).map(f -> { cache.put(route, f); return f; }));
    }
}
FareService s = new FareService();
System.out.println(s.fare("DEL-BLR") + " " + s.fare("DEL-BLR") + " " + s.fare("XYZ") + " dbHits=" + s.dbHits);`,
        a: ["`or(supplier)` is lazy: the database is queried only when the cache Optional is empty.",
          "Populating inside `map` is a side effect; acceptable here, but in production prefer a clear `ifPresent(f -> cache.put(...))` or a cache library (`Caffeine.get(key, loader)`).",
          "Misses aren't cached, so repeated unknown keys hit the DB each time; consider caching negative results with a TTL."] },
      { level: "Hard", q: "Why is `Optional` not Serializable, and what are the consequences in Spring/JPA/JSON code?",
        a: ["It was designed as a return-type idiom, not a general container; the JDK team intentionally didn't make it Serializable to discourage use in fields and to keep the option of turning it into a value class (Project Valhalla).",
          "JPA: entity fields of type Optional aren't supported; keep nullable columns as nullable fields with Optional getters.",
          "JSON (Jackson): needs `jackson-datatype-jdk8` (registered by Spring Boot) to serialise Optional; DTOs are cleaner with nullable fields plus validation annotations.",
          "Java serialization / distributed caches: a class with an Optional field fails to serialise; another reason to avoid Optional fields."] },
      { level: "Hard", q: "Critique this code and rewrite it.",
        qcode: `Optional<User> findUser(String email) {
    User u = repo.find(email);
    if (u == null) return null;
    return Optional.of(u);
}
String name = findUser(email).isPresent() ? findUser(email).get().name() : getDefaultName();`,
        qNoCompile: true,
        code: `record User(String name) {}
Map<String, User> repo = Map.of("asha@example.com", new User("Asha"));
Function<String, Optional<User>> findUser = email -> Optional.ofNullable(repo.get(email));   // never null
Supplier<String> defaultName = () -> "Guest";

String name = findUser.apply("asha@example.com").map(User::name).orElseGet(defaultName);
String other = findUser.apply("x@y.z").map(User::name).orElseGet(defaultName);
System.out.println(name + " " + other);`,
        a: ["Returning `null` from an Optional-returning method causes NPEs exactly where callers thought they were safe; use `Optional.ofNullable(repo.find(email))`.",
          "`findUser` is called twice (two repository queries, and a race if data changes in between).",
          "`isPresent()` + `get()` is a null check in disguise; use `map(User::name)`.",
          "`getDefaultName()` may be costly, so `orElseGet(this::getDefaultName)` rather than `orElse`."] }
    ],
    recap: [
      "Optional is a container of zero or one value, intended for return types where absence is normal.",
      "Create with `of` / `ofNullable` / `empty`; never return null from an Optional method.",
      "Chain with `map`, `flatMap` (for Optional-returning functions) and `filter`; finish with `orElse`, `orElseGet` (lazy), `orElseThrow`, `or`, `ifPresentOrElse`.",
      "Streams: `findFirst`/`max` return Optionals; `flatMap(Optional::stream)` drops empties.",
      "Don't use it for fields, parameters or collections; combine with `requireNonNull`, empty collections, Null Objects and nullness annotations."
    ]
  });
})();
