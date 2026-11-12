/* Lesson J13: Java 9-17 features: var, records, sealed, switch, text blocks */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Each pair was compiled and run on Java 21; both versions print the same output (shown)
  var CASES = [{"id": "inst", "title": "instanceof pattern", "ver": "16", "old": "Object o = 4850;\nString r;\nif (o instanceof Integer) {\n    Integer i = (Integer) o;\n    r = i > 4000 ? \"premium \" + i : \"saver \" + i;\n} else {\n    r = \"unknown\";\n}\nSystem.out.println(r);", "neu": "Object o = 4850;\nString r = o instanceof Integer i && i > 4000 ? \"premium \" + i\n         : o instanceof Integer i ? \"saver \" + i\n         : \"unknown\";\nSystem.out.println(r);", "note": "The pattern variable `i` is declared, cast and scoped by the test itself. It's in scope only where the match is definitely true, so `&& i > 4000` works.", "oldOut": "premium 4850", "neuOut": "premium 4850"}, {"id": "sw", "title": "switch expression", "ver": "14", "old": "String cabin = \"J\";\nint bags;\nswitch (cabin) {\n    case \"F\":\n    case \"J\":\n        bags = 2;\n        break;\n    case \"Y\":\n        bags = 1;\n        break;\n    default:\n        bags = 0;\n}\nSystem.out.println(bags);", "neu": "String cabin = \"J\";\nint bags = switch (cabin) {\n    case \"F\", \"J\" -> 2;\n    case \"Y\" -> 1;\n    default -> 0;\n};\nSystem.out.println(bags);", "note": "Arrow labels never fall through, several labels share one case, and the switch yields a value, so the compiler checks every path assigns it.", "oldOut": "2", "neuOut": "2"}, {"id": "tb", "title": "text block", "ver": "15", "old": "String json = \"{\\n\" +\n    \"  \\\"pnr\\\": \\\"P1\\\",\\n\" +\n    \"  \\\"route\\\": \\\"DEL-BLR\\\"\\n\" +\n    \"}\";\nSystem.out.println(json);", "neu": "String json = \"\"\"\n    {\n      \"pnr\": \"P1\",\n      \"route\": \"DEL-BLR\"\n    }\"\"\";\nSystem.out.println(json);", "note": "Text blocks strip the common indentation (the closing delimiter's position counts), keep line breaks, and need no escaping for quotes.", "oldOut": "{\n  \"pnr\": \"P1\",\n  \"route\": \"DEL-BLR\"\n}", "neuOut": "{\n  \"pnr\": \"P1\",\n  \"route\": \"DEL-BLR\"\n}"}, {"id": "rec", "title": "record", "ver": "16", "old": "final class Fare {\n    private final String route; private final int amount;\n    Fare(String route, int amount) { this.route = route; this.amount = amount; }\n    String route() { return route; }\n    int amount() { return amount; }\n    @Override public boolean equals(Object o) { return o instanceof Fare f && f.route.equals(route) && f.amount == amount; }\n    @Override public int hashCode() { return Objects.hash(route, amount); }\n    @Override public String toString() { return \"Fare[route=\" + route + \", amount=\" + amount + \"]\"; }\n}\nSystem.out.println(new Fare(\"DEL-BLR\", 4850) + \" \" + new Fare(\"DEL-BLR\", 4850).equals(new Fare(\"DEL-BLR\", 4850)));", "neu": "record Fare(String route, int amount) {}\nSystem.out.println(new Fare(\"DEL-BLR\", 4850) + \" \" + new Fare(\"DEL-BLR\", 4850).equals(new Fare(\"DEL-BLR\", 4850)));", "note": "A record generates the canonical constructor, accessors, `equals`, `hashCode` and `toString` from its components; fields are private and final.", "oldOut": "Fare[route=DEL-BLR, amount=4850] true", "neuOut": "Fare[route=DEL-BLR, amount=4850] true"}, {"id": "var", "title": "var", "ver": "10", "old": "Map<String, List<Integer>> faresByRoute = new HashMap<String, List<Integer>>();\nfaresByRoute.computeIfAbsent(\"DEL-BLR\", k -> new ArrayList<Integer>()).add(4850);\nfor (Map.Entry<String, List<Integer>> e : faresByRoute.entrySet()) System.out.println(e.getKey() + \" \" + e.getValue());", "neu": "var faresByRoute = new HashMap<String, List<Integer>>();\nfaresByRoute.computeIfAbsent(\"DEL-BLR\", k -> new ArrayList<>()).add(4850);\nfor (var e : faresByRoute.entrySet()) System.out.println(e.getKey() + \" \" + e.getValue());", "note": "`var` infers the static type of a local from its initializer; the variable is still strongly typed (`HashMap<String, List<Integer>>` here).", "oldOut": "DEL-BLR [4850]", "neuOut": "DEL-BLR [4850]"}, {"id": "sealed", "title": "sealed + pattern switch", "ver": "17 / 21", "old": "abstract class Payment {}\nfinal class Card extends Payment { final int amount; Card(int a) { amount = a; } }\nfinal class Upi extends Payment { final String vpa; Upi(String v) { vpa = v; } }\nPayment p = new Upi(\"asha@okbank\");\nString d;\nif (p instanceof Card) d = \"card \" + ((Card) p).amount;\nelse if (p instanceof Upi) d = \"upi \" + ((Upi) p).vpa;\nelse throw new IllegalStateException();\nSystem.out.println(d);", "neu": "sealed interface Payment permits Card, Upi {}\nrecord Card(int amount) implements Payment {}\nrecord Upi(String vpa) implements Payment {}\nPayment p = new Upi(\"asha@okbank\");\nString d = switch (p) {\n    case Card c -> \"card \" + c.amount();\n    case Upi u -> \"upi \" + u.vpa();\n};\nSystem.out.println(d);", "note": "`sealed ... permits` (Java 17) closes the hierarchy, so a pattern `switch` (Java 21) over it is exhaustive with no `default`: add a new subtype and every such switch fails to compile until handled.", "oldOut": "upi asha@okbank", "neuOut": "upi asha@okbank"}];
  function modernWidget(el, ctx) {
    var s = ctx.state; if (!s.id) { s.id = "sw"; s.view = "both"; }
    el.innerHTML = "<p>" + ctx.md("Pick a feature to see typical pre-Java-9 code next to its modern equivalent. Both versions compile and print the same thing on Java 21; the counter shows how much code disappears.") + "</p>" +
      "<div class='seg' data-r='c'>" + CASES.map(function (c) { return "<button type='button' data-v='" + c.id + "'>" + ctx.esc(c.title) + "</button>"; }).join("") + "</div>" +
      "<div data-r='body' style='margin-top:12px'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function lines(t) { return t.split("\n").filter(function (l) { return l.trim(); }).length; }
    function draw() {
      q("c").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.id); });
      var c = CASES.filter(function (x) { return x.id === s.id; })[0];
      var lo = lines(c.old), ln = lines(c.neu), chars = function (t) { return t.replace(/\s+/g, "").length; };
      q("body").innerHTML =
        "<h4 style='margin:4px 0'>Before (Java 8 style): " + lo + " lines, " + chars(c.old) + " non-space chars</h4><pre class='code'>" + ctx.H.highlight(c.old) + "</pre>" +
        "<h4 style='margin:12px 0 4px'>After (Java " + ctx.esc(c.ver) + "): " + ln + " lines, " + chars(c.neu) + " non-space chars (" + Math.round(100 - 100 * chars(c.neu) / chars(c.old)) + "% less)</h4><pre class='code'>" + ctx.H.highlight(c.neu) + "</pre>" +
        "<div class='result'>" + ctx.md("Both print: `" + c.neuOut.replace(/\n/g, " ⏎ ") + "`. " + c.note) + "</div>";
    }
    q("c").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.id = b.dataset.v; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "What changed between Java 8 and 17",
      text: "Java moved to a release every six months in 2018, with an LTS every two years (11, 17, 21, 25). Java 17 bundles the main language upgrades since 8: less boilerplate (`var`, records, text blocks, switch expressions) and better modelling of data (sealed types, pattern matching). Spring Boot 3 requires Java 17, so this is the baseline most teams now write against; Java 21 features follow in J14.",
      table: [
        ["Version", "Year", "Highlights you'll use"],
        ["9", "2017", "`List.of`/`Set.of`/`Map.of`, private interface methods, JShell, modules, `Optional.stream`, `Stream.takeWhile`"],
        ["10", "2018", "`var` for locals, `List.copyOf`, `orElseThrow()`"],
        ["11 (LTS)", "2018", "`String.isBlank/strip/lines/repeat`, `Files.readString`, `HttpClient`, `var` in lambdas, `java File.java`"],
        ["14", "2020", "Switch expressions, helpful NullPointerExceptions"],
        ["15–16", "2020–21", "Text blocks, records, `instanceof` patterns, `Stream.toList()`"],
        ["17 (LTS)", "2021", "Sealed classes and interfaces, stronger encapsulation of JDK internals"]],
      m: M(["flowchart LR",
        "  J8[\"8 (2014)<br/>lambdas, streams\"]:::s0 --> J11[\"11 LTS<br/>var, String API, HttpClient\"]:::s1",
        "  J11 --> J17[\"17 LTS<br/>records, sealed, switch, text blocks\"]:::s2",
        "  J17 --> J21[\"21 LTS<br/>pattern switch, virtual threads (J14)\"]:::s4",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]) },
    { title: "var: local variable type inference",
      text: "`var` (Java 10) lets the compiler infer a **local variable's** type from its initializer. The variable is still statically typed; `var` is not dynamic typing. It works for locals with initializers, enhanced-for and try-with-resources variables, and lambda parameters (Java 11). It doesn't work for fields, method parameters, return types, `null` initializers or array initializers without `new`. Use it when the type is obvious from the right-hand side; avoid it when it hides important information.",
      code: `var fares = new ArrayList<Integer>();               // ArrayList<Integer>
fares.add(4850);
// fares.add("x");                                    // still a compile error: static typing
for (var f : fares) System.out.print(f + " ");
var byRoute = new TreeMap<String, List<Integer>>();
byRoute.computeIfAbsent("DEL-BLR", k -> new ArrayList<>()).add(4850);
for (var e : byRoute.entrySet()) System.out.print(e.getKey() + "=" + e.getValue() + " ");

var list = new ArrayList<>();                          // careful: ArrayList<Object>
list.add("DEL"); list.add(42);
var n = 10;                                            // int, not long
var big = 10L;                                         // long
var anon = new Object() { int seats = 3; };            // var can hold anonymous types
System.out.println("| " + list + " " + ((Object) n).getClass().getSimpleName() + " " + ((Object) big).getClass().getSimpleName() + " " + anon.seats);
// var x;  var y = null;  var arr = {1, 2};          // none of these compile`,
      points: ["Readability rule of thumb: fine for `var users = new ArrayList<User>()`; avoid for `var result = service.process(x)` where the type matters", "`var` is a reserved type name, not a keyword: variables called `var` still compile"] },
    { title: "Switch expressions",
      text: "Java 14 made `switch` usable as an **expression** with arrow labels: no fall-through, several constants per case (`case \"F\", \"J\" ->`), and a value produced by each branch. Multi-statement branches use a block with `yield`. A switch expression must be **exhaustive** (all enum constants or a `default`), which the compiler checks. Arrow syntax also works in classic switch statements.",
      code: `enum Cabin { ECONOMY, PREMIUM, BUSINESS, FIRST }
Cabin c = Cabin.BUSINESS;
int bags = switch (c) {                               // exhaustive over the enum: no default needed
    case ECONOMY -> 1;
    case PREMIUM, BUSINESS -> 2;
    case FIRST -> 3;
};
String lounge = switch (c) {
    case BUSINESS, FIRST -> {
        String tier = c == Cabin.FIRST ? "first-class" : "business";
        yield tier + " lounge";                         // yield returns from a block branch
    }
    default -> "no lounge";
};
System.out.println(bags + " " + lounge);

String day = "SAT";
switch (day) {                                          // arrow form in a statement: no break needed
    case "SAT", "SUN" -> System.out.println("weekend fares");
    default -> System.out.println("weekday fares");
}`,
      analogy: "The old switch was a staircase: once you stepped on a case you kept falling down unless you grabbed a `break`. The arrow switch is a set of separate doors." },
    { title: "Text blocks",
      text: "A text block (Java 15) starts with `\"\"\"` followed by a newline and ends with `\"\"\"`. Incidental indentation (the common leading whitespace, including the closing delimiter's position) is removed; line breaks are kept; quotes need no escaping. `\\` at a line end joins lines, `\\s` keeps a trailing space. Use `formatted(...)` for values. Ideal for JSON, SQL, HTML and test fixtures.",
      code: `String sql = """
    SELECT pnr, route, fare
    FROM bookings
    WHERE route = ?
      AND fare < ?
    ORDER BY fare""";
System.out.println(sql);

String json = """
    {"pnr": "%s", "route": "%s", "fare": %d}
    """.formatted("P1", "DEL-BLR", 4850);
System.out.print(json);

String oneLine = """
    a very long message \\
    on one line""";
System.out.println(oneLine + " | lines in sql: " + sql.lines().count());`,
      points: ["A text block is just a `String`: same type, same interning of the constant", "Place the closing `\"\"\"` on its own line to keep a trailing newline"] },
    { title: "Records: transparent data carriers",
      text: "`record Fare(String route, int amount) {}` (Java 16) declares an immutable data class: private final fields, a canonical constructor, accessors named after the components (`route()`, not `getRoute()`), and `equals`/`hashCode`/`toString` based on all components. Records are final, can't extend classes (they extend `java.lang.Record`), but can implement interfaces, have static fields and methods, extra constructors and instance methods, and nest locally.",
      code: `record Fare(String route, int amount) implements Comparable<Fare> {
    static final int MAX = 500_000;                        // static fields allowed
    Fare {                                                 // compact constructor: validate / normalise
        Objects.requireNonNull(route, "route");
        route = route.strip().toUpperCase();
        if (amount <= 0 || amount > MAX) throw new IllegalArgumentException("bad amount " + amount);
    }
    Fare(String route) { this(route, 999); }               // extra constructor delegates
    Fare withAmount(int a) { return new Fare(route, a); }  // "wither" for immutable updates
    public int compareTo(Fare o) { return Integer.compare(amount, o.amount); }
    static Fare of(String s) { String[] p = s.split(":"); return new Fare(p[0], Integer.parseInt(p[1])); }
}
Fare f = new Fare(" del-blr ", 4850);
System.out.println(f + " " + f.route() + " " + f.equals(Fare.of("DEL-BLR:4850")) + " " + f.withAmount(4200) + " " + new Fare("bom-goi"));
try { new Fare("X", -1); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
System.out.println(new TreeSet<>(List.of(f, Fare.of("BOM-GOI:3200"))));`,
      analogy: "A record is a labelled, sealed envelope: you declare what goes inside, Java prints the label, checks equality by contents, and nobody can swap the contents later." },
    { title: "Record caveats",
      text: "Records are **shallowly** immutable: a `List` component can still be mutated unless you copy it (`List.copyOf`) in the compact constructor. Accessors can be overridden (e.g. to return a copy) but must keep the contract. Records aren't a fit for JPA entities (entities need no-arg constructors, mutable state and proxies) but are great for DTOs, value objects, events, keys in maps and results. Jackson (2.12+) and Spring bind records out of the box.",
      code: `record Itinerary(String pnr, List<String> legs) {}
List<String> legs = new ArrayList<>(List.of("DEL-BOM"));
Itinerary leaky = new Itinerary("P1", legs);
legs.add("BOM-GOI");                                        // changes the "immutable" record
System.out.println(leaky);

record SafeItinerary(String pnr, List<String> legs) {
    SafeItinerary { legs = List.copyOf(legs); }             // defensive, unmodifiable copy
}
List<String> legs2 = new ArrayList<>(List.of("DEL-BOM"));
SafeItinerary safe = new SafeItinerary("P2", legs2);
legs2.add("BOM-GOI");
System.out.println(safe);
try { safe.legs().add("X"); } catch (UnsupportedOperationException e) { System.out.println("legs are unmodifiable"); }

record Point(int x, int y) {}
Map<Point, String> seatMap = new HashMap<>(Map.of(new Point(12, 1), "12A"));
System.out.println(seatMap.get(new Point(12, 1)));          // value-based equals/hashCode make great keys`,
      points: ["Arrays as components compare by reference in `equals`; prefer lists", "Records can be local (declared inside a method) for intermediate results"] },
    { title: "Sealed classes and interfaces",
      text: "`sealed interface Payment permits Card, Upi, NetBanking` (Java 17) restricts which classes may implement or extend a type. Each permitted subclass must be `final`, `sealed` or `non-sealed`, and live in the same module (or package, in the unnamed module). Sealing turns an open hierarchy into a **closed set of alternatives** (an algebraic data type), so the compiler can check that a `switch` handles every case (J14). Records are implicitly final, so they pair perfectly with sealed interfaces.",
      m: M(["classDiagram",
        "  class Payment { <<sealed interface>> }",
        "  class Card { <<record>> int amount; String last4 }",
        "  class Upi { <<record>> String vpa }",
        "  class NetBanking { <<non-sealed>> String bank }",
        "  Payment <|.. Card",
        "  Payment <|.. Upi",
        "  Payment <|.. NetBanking"]),
      code: `sealed interface Payment permits Card, Upi, NetBanking {}
record Card(int amount, String last4) implements Payment {}
record Upi(int amount, String vpa) implements Payment {}
non-sealed class NetBanking implements Payment {            // re-opens this branch for extension
    final int amount; NetBanking(int amount) { this.amount = amount; }
}
final class CorporateNetBanking extends NetBanking { CorporateNetBanking(int a) { super(a); } }
// record Cash(int amount) implements Payment {}            // compile error: not in the permits list

static int fee(Payment p) {
    if (p instanceof Card c) return c.amount() * 2 / 100;
    if (p instanceof Upi) return 0;
    if (p instanceof NetBanking nb) return 15;
    throw new AssertionError("unreachable: Payment is sealed");
}
List<Payment> ps = List.of(new Card(5000, "4242"), new Upi(3200, "asha@okbank"), new CorporateNetBanking(9000));
ps.forEach(p -> System.out.print(p.getClass().getSimpleName() + " fee " + fee(p) + " | "));
System.out.println(Payment.class.isSealed() + " " + Arrays.stream(Payment.class.getPermittedSubclasses()).map(Class::getSimpleName).toList());` },
    { title: "Pattern matching for instanceof",
      text: "`if (obj instanceof Fare f)` (Java 16) tests the type, casts and binds `f` in one step. The binding is in scope wherever the compiler knows the test succeeded: inside the `if`, after `&&`, or after an early-return on the negated test (**flow scoping**). It removes the classic test-then-cast duplication, especially in `equals` implementations.",
      code: `record Fare(String route, int amount) {}
Object[] inputs = {new Fare("DEL-BLR", 4850), "BOM-GOI", 42, null};
for (Object o : inputs) {
    if (o instanceof Fare f && f.amount() > 4000) System.out.print("premium " + f.route() + " | ");
    else if (o instanceof String s) System.out.print("route string " + s.length() + " | ");
    else System.out.print("other " + o + " | ");               // null instanceof X is always false
}
System.out.println();

static String describe(Object o) {
    if (!(o instanceof Fare f)) return "not a fare";              // flow scoping:
    return f.route() + " at " + f.amount();                      // f is in scope after the early return
}
System.out.println(describe(new Fare("CCU-DEL", 6100)) + " / " + describe("x"));

final class Seat {
    final String no; Seat(String no) { this.no = no; }
    @Override public boolean equals(Object o) { return o instanceof Seat s && s.no.equals(no); }   // concise equals
    @Override public int hashCode() { return no.hashCode(); }
}
System.out.println(new Seat("12A").equals(new Seat("12A")));` },
    { title: "Helpful NullPointerExceptions",
      text: "Since Java 14 (on by default from 15) an NPE message names exactly **what** was null: `Cannot invoke \"String.length()\" because the return value of \"Booking.route()\" is null`. For local variables the name appears when compiled with `-g` (debug info, which build tools include by default); otherwise you see `<local1>`. This turns many chained-call NPE hunts into one-line fixes.",
      code: `record Passenger(String name) {}
record Booking(String pnr, Passenger lead) {}
Booking b = new Booking("P1", null);
try {
    System.out.println(b.lead().name().length());
} catch (NullPointerException e) {
    System.out.println(e.getMessage());
}
int[] seats = null;
try { System.out.println(seats[0]); } catch (NullPointerException e) { System.out.println(e.getMessage()); }`,
      points: ["Locals show as `<local4>` without `-g`; parameters and fields are always named", "Still fix the design: validate with `Objects.requireNonNull` at boundaries"] },
    { title: "Everyday API additions (9–17)",
      text: "Small methods that remove utility classes: immutable collection factories (`List.of`, `Map.of`, `Map.entry`, `copyOf`), `String.isBlank`, `strip` (Unicode-aware `trim`), `lines`, `repeat`, `indent`, `transform`, `formatted`; `Files.readString/writeString`; `Stream.toList`, `takeWhile/dropWhile`, `iterate` with a predicate, `Collectors.teeing`; `Optional.isEmpty/or/stream/orElseThrow`; `Objects.requireNonNullElse`; private methods in interfaces; and `java Hello.java` to run a single file without compiling.",
      code: `System.out.println("   ".isBlank() + " [" + "\\u2003 DEL \\u2003".strip() + "] [" + "\\u2003 DEL \\u2003".trim() + "]");
System.out.println("DEL\\nBOM\\nBLR".lines().map(String::toLowerCase).toList() + " " + "-".repeat(5) + " " + "p1".transform(String::toUpperCase));
System.out.print("route:\\n  fare".indent(4));
System.out.println("%s → %s".formatted("DEL", "BLR"));

Path p = Files.createTempFile("fare", ".txt");
Files.writeString(p, "4850");
System.out.println(Files.readString(p) + " " + List.copyOf(new ArrayList<>(List.of(1, 2))) + " " + Map.entry("DEL", 1));

interface Pricing {
    default int withTax(int f) { return round(f * 1.05); }
    private int round(double v) { return (int) Math.round(v); }   // private interface method (Java 9)
}
System.out.println(new Pricing() {}.withTax(4850));`,
      points: ["`strip()` removes all Unicode whitespace; `trim()` only characters ≤ U+0020", "`Map.of` allows at most 10 pairs; use `Map.ofEntries(entry(...), …)` beyond that"] },
    { title: "Modelling data the modern way",
      text: "Put the features together: **records** for immutable values, **sealed interfaces** for a closed set of alternatives, **switch** and **patterns** to process them, **text blocks** for embedded formats. This \"data-oriented programming\" style keeps business rules in one readable place and lets the compiler find missing cases. The full payoff (exhaustive pattern `switch`, record deconstruction) comes in Java 21 (J14).",
      code: `sealed interface Event permits Booked, Cancelled, Rescheduled {}
record Booked(String pnr, int fare) implements Event {}
record Cancelled(String pnr, String reason) implements Event {}
record Rescheduled(String pnr, String from, String to) implements Event {}

static String toAudit(Event e) {
    if (e instanceof Booked b) return "BOOKED %s ₹%d".formatted(b.pnr(), b.fare());
    if (e instanceof Cancelled c) return "CANCELLED %s (%s)".formatted(c.pnr(), c.reason());
    if (e instanceof Rescheduled r) return "MOVED %s %s→%s".formatted(r.pnr(), r.from(), r.to());
    throw new AssertionError(e);
}
var events = List.of(new Booked("P1", 4850), new Rescheduled("P1", "06:10", "09:30"), new Cancelled("P2", "duplicate"));
events.stream().map(e -> toAudit(e)).forEach(System.out::println);
String report = """
    Events: %d
    Bookings: %d""".formatted(events.size(), events.stream().filter(e -> e instanceof Booked).count());
System.out.println(report);` },
    { title: "Migrating code and teams to Java 17",
      text: "Upgrading from 8 usually means: build with the new JDK and `--release 17`, update libraries (Spring Boot 3, Hibernate 6, Lombok, Mockito, bytecode tools), replace removed modules (`javax.xml.bind`/JAXB, `javax.annotation`, Java EE → Jakarta `jakarta.*` namespace), fix illegal reflective access to JDK internals (strong encapsulation in 17), and review GC/JVM flags (CMS is gone; G1 is default). Then adopt features gradually: records for new DTOs, switch expressions and `instanceof` patterns in touched code, text blocks in tests.",
      table: [
        ["Step", "What breaks / what to do"],
        ["Compile on 17", "`--release 17`; fix removed APIs (JAXB, `javax.annotation`, `sun.misc` uses)"],
        ["Dependencies", "Spring Boot 3 (Jakarta EE 9+ `jakarta.*`), Hibernate 6, newer Lombok/Mockito/ASM"],
        ["Runtime", "`--add-opens` only as a temporary fix for reflective access"],
        ["JVM flags", "Remove CMS/PermGen flags; G1 default; container-aware memory settings"],
        ["Code style", "Records for DTOs, switch expressions, patterns, text blocks; static analysis rules (OpenRewrite recipes can automate much of it)"]],
      points: ["OpenRewrite has recipes for Java 8 → 17 and Spring Boot 2 → 3 migrations"] }
  ];

  H.registerLesson({
    code: "J13",
    summary: "The Java 9–17 language and API upgrades you'll use daily: the release cadence and LTS versions, `var` and its limits, switch expressions with arrows and `yield`, text blocks, records (compact constructors, validation, withers, shallow immutability caveats), sealed classes and interfaces, pattern matching for `instanceof` with flow scoping, helpful NullPointerExceptions, everyday API additions (`List.of`, `String.strip/lines/repeat/formatted`, `Files.readString`, private interface methods), data-oriented modelling, and migrating a codebase from 8 to 17.",
    slides: SLIDES,
    widget: { heading: "Interactive: old Java vs modern Java", caption: "Six features shown as before/after pairs. Every pair was compiled and run on Java 21 and both versions print the same output.", render: modernWidget },
    examplesHeading: "Where these features show up at work",
    examples: [
      ["DTOs and events", "Records for request/response bodies, Kafka events and value objects; Jackson and Spring bind them directly."],
      ["Domain modelling", "Sealed interfaces for payment methods, booking states or API results (`Success`/`Failure`)."],
      ["Mapping code", "Switch expressions for status → HTTP code, enum → label, cabin → baggage rules."],
      ["Tests", "Text blocks for JSON fixtures and SQL in integration tests; `var` in setup code."],
      ["Debugging", "Helpful NPE messages pinpoint the null link in chained calls in production logs."],
      ["Upgrades", "Spring Boot 3 needs Java 17: migrations to `jakarta.*`, new library versions, and OpenRewrite recipes."]
    ],
    pitfalls: [
      "`var` that hides an important type, or `var list = new ArrayList<>()` giving `ArrayList<Object>`",
      "Forgetting `yield` in a block branch of a switch expression",
      "Assuming records are deeply immutable (copy collection components)",
      "Using records as JPA entities",
      "Arrays as record components (reference equality)",
      "Unexpected indentation or trailing newline in text blocks",
      "`default` branches in switches over sealed types that hide new cases",
      "Thinking `trim()` and `strip()` are identical",
      "Upgrading the JDK without upgrading libraries (illegal reflective access, javax → jakarta)"
    ],
    quiz: [
      { q: "Which is valid?", options: ["var x;", "var x = null;", "var list = new ArrayList<String>();", "private var count = 0; (a field)"], answer: 2, why: "var needs an initializer with a type, and only for locals." },
      { q: "What does `var list = new ArrayList<>();` infer?", options: ["ArrayList<String>", "ArrayList<Object>", "List<?>", "Compile error"], answer: 1, why: "Nothing to infer the element type from." },
      { q: "In a switch expression, a block branch returns its value with…", options: ["return", "break value", "yield", "->"], answer: 2, why: "return would exit the method." },
      { q: "What does a record NOT generate?", options: ["Accessors", "equals/hashCode", "Setters", "toString"], answer: 2, why: "Records are immutable." },
      { q: "A compact constructor…", options: ["Has no parameter list and assigns fields automatically after it runs", "Replaces accessors", "Must call super()", "Is only for static fields"], answer: 0, why: "Validate or normalise the parameters; fields are assigned at the end." },
      { q: "A permitted subclass of a sealed class must be…", options: ["abstract", "final, sealed or non-sealed", "a record", "in a different package"], answer: 1, why: "One of the three modifiers (records are implicitly final)." },
      { q: "What does this print?", code: `Object o = "DEL";
if (o instanceof String s && s.length() == 3) System.out.println(s.toLowerCase());
else System.out.println("no");`, options: ["DEL", "del", "no", "Compile error"], answer: 1, why: "s is in scope after &&." },
      { q: "`\"\\u2003 DEL \\u2003\".trim()` vs `.strip()`?", options: ["Same result", "strip removes the em-space too; trim doesn't", "trim removes more", "Both throw"], answer: 1, why: "strip is Unicode-aware." },
      { q: "Which Java version is the minimum for Spring Boot 3?", options: ["8", "11", "17", "21"], answer: 2, why: "Boot 3 / Spring 6 baseline." }
    ],
    cheatsheet: {
      table: [
        ["Feature", "Syntax", "Since"],
        ["Local inference", "`var x = new HashMap<String, Integer>();`", "10"],
        ["Switch expression", "`int n = switch (c) { case A, B -> 1; default -> { yield 2; } };`", "14"],
        ["Text block", "`\"\"\"` newline … `\"\"\"`, `.formatted(...)`", "15"],
        ["Record", "`record P(int x, int y) { P { /* validate */ } }`", "16"],
        ["instanceof pattern", "`if (o instanceof Fare f && f.amount() > 0)`", "16"],
        ["Sealed", "`sealed interface S permits A, B {}`", "17"],
        ["Collections", "`List.of`, `Map.of`, `copyOf`, `Stream.toList()`", "9 / 10 / 16"],
        ["Strings", "`isBlank`, `strip`, `lines`, `repeat`, `formatted`", "11 / 15"]],
      cards: [
        { title: "Records", items: ["Immutable, final", "Compact constructor validates", "Copy mutable components", "DTOs/values, not entities"] },
        { title: "Sealed + patterns", items: ["Closed set of subtypes", "final / sealed / non-sealed", "instanceof binds a variable", "Exhaustive switch in 21"] },
        { title: "Say in interviews", items: ["var is static typing", "Arrow switch: no fall-through", "Helpful NPEs (14)", "LTS: 11, 17, 21, 25"] }]
    },
    practice: [
      { level: "Easy", q: "What are records? How do they differ from a regular class and from Lombok's @Value?",
        a: ["A record is a language-level, immutable data carrier: `record Fare(String route, int amount) {}` generates private final fields, a canonical constructor, accessors, `equals`, `hashCode` and `toString`.",
          "Unlike a regular class it can't extend another class, its fields are fixed by the header, and it has no setters; it can implement interfaces and add methods, static members and constructors.",
          "Lombok `@Value` generates similar code via annotation processing (with `getX()` names); records need no library, are understood by the compiler (patterns, deconstruction in Java 21) and by frameworks via reflection APIs (`getRecordComponents`)."] },
      { level: "Easy", q: "Convert this switch statement to a switch expression.",
        qcode: `String status = "CNF";
String label;
switch (status) {
    case "CNF": label = "Confirmed"; break;
    case "WL": case "RAC": label = "Waiting"; break;
    case "CAN": label = "Cancelled"; break;
    default: label = "Unknown";
}
System.out.println(label);`,
        code: `String status = "RAC";
String label = switch (status) {
    case "CNF" -> "Confirmed";
    case "WL", "RAC" -> "Waiting";
    case "CAN" -> "Cancelled";
    default -> "Unknown";
};
System.out.println(label);`,
        a: ["Arrow cases don't fall through, so no `break`s.",
          "Several labels share a case with commas.",
          "The switch yields the value directly into `label`, and the compiler guarantees every path assigns it."] },
      { level: "Easy", q: "When should you use `var`, and when not?",
        a: ["Use when the type is obvious from the right side (`var users = new ArrayList<User>()`, `var e : map.entrySet()`), for long generic types, and in try-with-resources.",
          "Avoid when the initializer is a method call whose type matters to the reader (`var r = process(x)`), with numeric literals where `int`/`long` matters, and with diamond `new ArrayList<>()` (gives `ArrayList<Object>`).",
          "It's only for local variables (and lambda parameters); fields, parameters and return types need explicit types.",
          "Good variable names matter more with `var`."] },
      { level: "Medium", q: "Write a record `Money(long paise, String currency)` that validates input, supports addition, and formats as rupees.",
        code: `record Money(long paise, String currency) {
    Money {
        if (paise < 0) throw new IllegalArgumentException("negative amount");
        currency = Objects.requireNonNull(currency, "currency").toUpperCase();
        if (currency.length() != 3) throw new IllegalArgumentException("ISO code expected");
    }
    static Money inr(long rupees) { return new Money(rupees * 100, "INR"); }
    Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("currency mismatch");
        return new Money(Math.addExact(paise, other.paise), currency);
    }
    @Override public String toString() { return "%s %d.%02d".formatted(currency, paise / 100, paise % 100); }
}
Money fare = Money.inr(4850).plus(new Money(25050, "inr"));
System.out.println(fare + " " + fare.equals(new Money(510050, "INR")));
try { new Money(-1, "INR"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }`,
        a: ["The compact constructor validates and normalises (`currency` upper-cased) before fields are assigned.",
          "Money as a long of the smallest unit avoids floating-point errors; `Math.addExact` detects overflow.",
          "Operations return new instances; overriding `toString` is allowed and keeps logs readable."] },
      { level: "Medium", q: "What are sealed classes? Why would you use them instead of an enum or an open interface?",
        a: ["A sealed type lists the only classes allowed to extend/implement it (`permits`); subclasses must be `final`, `sealed` or `non-sealed`.",
          "Versus an **enum**: each alternative can carry different data (a `Card` has `last4`, a `Upi` has `vpa`), and there can be many instances.",
          "Versus an **open interface**: the set of cases is known, so code can handle them exhaustively and the compiler (pattern switch in Java 21) flags missing cases when a new subtype is added.",
          "Typical uses: payment methods, API results (`Success`/`Error`), commands/events, AST nodes, state machines."] },
      { level: "Medium", q: "Records are said to be shallowly immutable. Demonstrate the problem and fix it.",
        code: `record Order(String id, List<String> items) {}
List<String> items = new ArrayList<>(List.of("seat 12A"));
Order o = new Order("O1", items);
items.add("meal");
System.out.println("leaked: " + o);

record SafeOrder(String id, List<String> items) {
    SafeOrder { items = List.copyOf(items); }
}
List<String> items2 = new ArrayList<>(List.of("seat 12A"));
SafeOrder s = new SafeOrder("O2", items2);
items2.add("meal");
System.out.println("safe: " + s);`,
        a: ["Record fields are final, but final references can point to mutable objects; the caller kept a reference to the list.",
          "Copy in the compact constructor with `List.copyOf` (also rejects nulls and makes the list unmodifiable).",
          "Same for arrays, `Date`, maps; prefer immutable component types (`LocalDate`, `List.copyOf`)."] },
      { level: "Medium", q: "Use pattern matching for instanceof to simplify an `equals` and a polymorphic `area` function.",
        code: `record Circle(double r) {}
record Rect(double w, double h) {}
static double area(Object shape) {
    if (shape instanceof Circle c) return Math.PI * c.r() * c.r();
    if (shape instanceof Rect r && r.w() > 0 && r.h() > 0) return r.w() * r.h();
    throw new IllegalArgumentException("unsupported: " + shape);
}
final class Pnr {
    private final String code;
    Pnr(String code) { this.code = code; }
    @Override public boolean equals(Object o) { return this == o || (o instanceof Pnr p && p.code.equals(code)); }
    @Override public int hashCode() { return code.hashCode(); }
}
System.out.printf("%.2f %.1f %s%n", area(new Circle(1)), area(new Rect(2, 3)), new Pnr("AB12").equals(new Pnr("AB12")));`,
        a: ["`instanceof Type name` both tests and binds; no separate cast line.",
          "The binding is usable in the same condition after `&&` (where the match is known true).",
          "In Java 21 the `area` function becomes a pattern `switch` over a sealed `Shape` (J14)."] },
      { level: "Hard", q: "How do switch expressions handle exhaustiveness and what happens when a new enum constant is added?",
        code: `enum Status { CONFIRMED, WAITLISTED, CANCELLED }
static String label(Status s) {
    return switch (s) {                 // no default: compiler checks all constants are covered
        case CONFIRMED -> "✓";
        case WAITLISTED -> "…";
        case CANCELLED -> "✗";
    };
}
System.out.println(Arrays.stream(Status.values()).map(s -> label(s)).toList());`,
        a: ["A switch **expression** over an enum without `default` must cover every constant, or it doesn't compile.",
          "If a new constant is added and the code is recompiled, every such switch fails to compile, pointing to each place to update. That's why omitting `default` is often better than adding one.",
          "If the enum changes without recompiling the switch (separately compiled library), the compiler-inserted default throws `MatchException` (Java 21; `IncompatibleClassChangeError` before) at runtime.",
          "Switch **statements** with arrows are not required to be exhaustive (except with patterns, J14)."] },
      { level: "Hard", q: "Model API results with a sealed interface and records, then process them.",
        code: `sealed interface Result<T> permits Ok, Err {}
record Ok<T>(T value) implements Result<T> {}
record Err<T>(int status, String message) implements Result<T> {}

static Result<Integer> fetchFare(String route) {
    return switch (route) {
        case "DEL-BLR" -> new Ok<>(4850);
        case "XYZ-ABC" -> new Err<>(404, "unknown route");
        default -> new Err<>(503, "pricing service unavailable");
    };
}
static String render(Result<Integer> r) {
    if (r instanceof Ok<Integer> ok) return "₹" + ok.value();
    if (r instanceof Err<Integer> err) return "error " + err.status() + ": " + err.message();
    throw new AssertionError();
}
for (String route : List.of("DEL-BLR", "XYZ-ABC", "BOM-GOI")) System.out.println(route + " → " + render(fetchFare(route)));`,
        a: ["The sealed `Result` makes success and failure explicit in the type, without exceptions for expected failures.",
          "Records carry the case-specific data; generic records work like generic classes.",
          "In Java 21, `render` becomes an exhaustive `switch (r) { case Ok<Integer>(var v) -> …; case Err<Integer>(var s, var m) -> …; }` with no `AssertionError` fallback."] },
      { level: "Hard", q: "Your team is moving a Spring Boot 2 / Java 8 service to Spring Boot 3 / Java 17. What's your plan?",
        steps: ["Upgrade to the latest Boot 2.7 on Java 8 first; fix deprecations. Then switch the JDK to 17 while still on Boot 2.7 (it supports 17) to isolate JDK issues.",
          "Fix JDK-level breakages: removed JAXB/`javax.annotation` (add dependencies), illegal reflective access to JDK internals (upgrade libraries; `--add-opens` only temporarily), removed GC flags (CMS).",
          "Upgrade to Boot 3: `javax.*` → `jakarta.*` (servlet, persistence, validation), Hibernate 6 query/ID changes, Spring Security 6 configuration (lambda DSL, no `WebSecurityConfigurerAdapter`), Micrometer Observation for tracing.",
          "Automate with OpenRewrite recipes (`UpgradeSpringBoot_3_x`, `Java8toJava17`), then review the diff.",
          "Run the full test suite, contract tests and a canary deployment; watch GC, memory (container awareness) and latency dashboards.",
          "Adopt new language features incrementally in touched code: records for DTOs, switch expressions, text blocks in tests."] }
    ],
    recap: [
      "Java 17 is the modern baseline (Spring Boot 3); LTS releases are 11, 17, 21, 25.",
      "`var` infers local types (still static typing); switch expressions remove fall-through and yield values; text blocks handle multi-line strings.",
      "Records are immutable data carriers with generated members; validate in compact constructors and copy mutable components.",
      "Sealed types close a hierarchy; `instanceof` patterns test-and-bind with flow scoping.",
      "Helpful NPEs and many small APIs (`List.of`, `strip`, `lines`, `formatted`, `Files.readString`) make everyday code shorter and safer."
    ]
  });
})();
