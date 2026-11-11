/* Lesson F17: Strategy */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var DIST = [5, 12, 25], HOURS = [["10 am", 10], ["7 pm", 19], ["1 am", 1]], DEMAND = [["normal", 1.0], ["high", 1.8]];
  var STRATS = [
    { id: "std", name: "StandardFare", cls: "new StandardFare()", calc: function (d) { return 50 + 12 * d.km; }, how: "₹50 base + ₹12/km" },
    { id: "peak", name: "PeakHourFare", cls: "new PeakHourFare(Set.of(8, 9, 18, 19, 20))", calc: function (d) { var b = 50 + 12 * d.km; return [8, 9, 18, 19, 20].indexOf(d.h) >= 0 ? b * 1.25 : b; }, how: "standard × 1.25 in rush hours" },
    { id: "night", name: "NightFare", cls: "new NightFare()", calc: function (d) { var b = 50 + 12 * d.km; return (d.h >= 23 || d.h < 5) ? b * 1.5 : b; }, how: "standard × 1.5 from 11 pm to 5 am" },
    { id: "surge", name: "SurgeFare", cls: "new SurgeFare(demandService)", calc: function (d) { return (50 + 12 * d.km) * Math.min(d.dm, 2.0); }, how: "standard × demand multiplier (capped at 2×)" },
    { id: "flat", name: "AirportFlatFare", cls: "new AirportFlatFare(799)", calc: function () { return 799; }, how: "fixed ₹799 regardless of distance" }
  ];
  function fareWidget(el, ctx) {
    var s = ctx.state; if (!s.st) { s.st = "std"; s.d = 1; s.h = 0; s.dm = 0; }
    el.innerHTML = "<p>" + ctx.md("A ride-hailing `FareCalculator` (the **context**) holds a `FareStrategy`. Pick a strategy and a trip. The context code never changes; only the injected object does. Compare all strategies for the same trip in the table.") + "</p>" +
      "<div class='field'>Strategy injected into the context</div><div class='seg' data-r='st'></div>" +
      "<div class='grid2' style='margin-top:8px'><div><div class='field'>Distance</div><div class='seg' data-r='d'></div></div><div><div class='field'>Pickup time</div><div class='seg' data-r='h'></div></div></div>" +
      "<div class='field' style='margin-top:8px'>Demand</div><div class='seg' data-r='dm'></div>" +
      "<pre class='code' data-r='code' style='margin-top:10px'></pre><div class='metrics' data-r='m'></div><div class='tablewrap' data-r='t'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function seg(r, items, cur, lab) { q(r).innerHTML = items.map(function (x, i) { return "<button type='button' data-i='" + i + "' class='" + (i === cur ? "on" : "") + "'>" + ctx.esc(lab(x)) + "</button>"; }).join(""); }
    function draw() {
      var trip = { km: DIST[s.d], h: HOURS[s.h][1], dm: DEMAND[s.dm][1] };
      var cur = STRATS.filter(function (x) { return x.id === s.st; })[0];
      q("st").innerHTML = STRATS.map(function (x) { return "<button type='button' data-s='" + x.id + "' class='" + (x.id === s.st ? "on" : "") + "'>" + x.name + "</button>"; }).join("");
      seg("d", DIST, s.d, function (x) { return x + " km"; }); seg("h", HOURS, s.h, function (x) { return x[0]; }); seg("dm", DEMAND, s.dm, function (x) { return x[0] + " (" + x[1] + "×)"; });
      q("code").textContent = "FareCalculator calc = new FareCalculator(" + cur.cls + ");\nlong fare = calc.fare(new Trip(" + trip.km + ", LocalTime.of(" + trip.h + ", 0)));   // unchanged for every strategy";
      q("m").innerHTML = "<div class='metric'><div class='v'>₹" + Math.round(cur.calc(trip)) + "</div><div class='l'>" + ctx.esc(cur.name) + ": " + ctx.esc(cur.how) + "</div></div>";
      q("t").innerHTML = "<table><thead><tr><th>Strategy</th><th>Rule</th><th>Fare for this trip</th></tr></thead><tbody>" + STRATS.map(function (x) {
        return "<tr" + (x.id === s.st ? " style='font-weight:600'" : "") + "><td><code>" + x.name + "</code></td><td>" + ctx.esc(x.how) + "</td><td>₹" + Math.round(x.calc(trip)) + "</td></tr>"; }).join("") + "</tbody></table>";
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var wrap = b.parentElement.getAttribute("data-r");
      if (wrap === "st") s.st = b.getAttribute("data-s"); else if (wrap === "d" || wrap === "h" || wrap === "dm") s[wrap] = Number(b.getAttribute("data-i")); else return;
      ctx.save(); draw();
    });
    draw();
  }
  H.pattern({
    code: "F17", name: "Strategy",
    summary: "Strategy defines a family of interchangeable algorithms behind one interface and lets the client choose one at runtime. It is the single most useful pattern in machine-coding rounds. This lesson covers context/strategy roles, replacing `if/else` and `switch` chains, lambdas and `Comparator` as strategies, selecting strategies with a registry or Spring-injected `List`, a payment-method checkout, ride-fare pricing with composed strategies, parking-spot allocation, JDK and Spring usages, Strategy vs State, Template Method and Bridge, and when a simple `switch` is better.",
    intent: "Define a **family of algorithms**, encapsulate each one, and make them **interchangeable**. Strategy lets the algorithm vary independently from the clients that use it.",
    problem: {
      text: "Checkout supports cards, UPI and wallets. Each has its own validation, fee and API call. The first version is a `switch (method)` inside `CheckoutService.pay()`. Then EMI arrives, then BNPL, then a promotional \"pay with points\". Every addition edits the same method, tests for unrelated methods break, and the method reaches 300 lines.",
      points: [
        "A `switch`/`if` chain selecting an **algorithm** is the smell (especially when repeated in several methods)",
        "Each branch becomes a class implementing one `Strategy` interface",
        "The **context** holds a strategy reference and delegates to it; it doesn't know which one it has",
        "New algorithm = new class; the context and other strategies are untouched (OCP)"],
      code: `class CheckoutService {
    String pay(String method, long paise) {
        switch (method) {
            case "CARD":   if (paise < 100) throw new IllegalArgumentException("min ₹1"); return "card charged " + (paise + paise * 2 / 100);   // 2% fee
            case "UPI":    return "upi collect " + paise;                                                                               // no fee
            case "WALLET": if (paise > 1_000_000) throw new IllegalArgumentException("wallet limit"); return "wallet debited " + paise;
            default: throw new IllegalArgumentException("unknown method " + method);                                                   // EMI? BNPL? edit here again
        }
    }
}
System.out.println(new CheckoutService().pay("CARD", 49_900));` },
    analogy: "Getting to the airport. The goal is fixed (be at the terminal by 6 pm); the strategy varies: cab, metro, or your own scooter. You pick based on traffic, budget and luggage, and you can switch tomorrow without changing the goal. The trip planner (context) just says \"execute the chosen route\".",
    structure: {
      text: "The **Context** holds a reference to a **Strategy** and calls it to do the variable work. **ConcreteStrategies** implement the interface. The client (or a factory/config) chooses the strategy and gives it to the context, usually via the constructor. Strategies are often stateless and can be shared; in Java 8+ a strategy with one method can be a lambda.",
      m: H.cd(["classDiagram",
        "  class Checkout { -PaymentStrategy strategy; +Checkout(PaymentStrategy s); +pay(long paise) Receipt }",
        "  class PaymentStrategy { <<interface>>; +validate(long paise); +fee(long paise) long; +charge(long paise) String }",
        "  class CardPayment", "  class UpiPayment", "  class WalletPayment",
        "  Checkout o-- PaymentStrategy",
        "  PaymentStrategy <|.. CardPayment", "  PaymentStrategy <|.. UpiPayment", "  PaymentStrategy <|.. WalletPayment"]),
      roles: [["Strategy", "Common interface for all algorithms"], ["Concrete strategy", "One algorithm (card, UPI, wallet; standard, surge fare)"], ["Context", "Holds a strategy, delegates the variable step, may pass data the strategy needs"], ["Client / factory", "Chooses which strategy the context gets"]],
      points: ["Strategy is composition-based: swap behaviour by swapping an object, not by subclassing the context", "The interface should be small; if strategies need many context fields, pass a parameter object"] },
    impl: {
      title: "Java implementation: payment strategies in checkout",
      text: "Each payment method owns its validation, fee and charging. `Checkout` contains no method-specific code. A registry (`Map<String, PaymentStrategy>`) replaces the `switch` for runtime selection, and adding EMI is one class plus one registry entry.",
      code: `record Receipt(String method, long amount, long fee, String ref) {}
interface PaymentStrategy {
    String id();
    default void validate(long paise) { if (paise <= 0) throw new IllegalArgumentException("amount must be positive"); }
    long fee(long paise);
    String charge(long paise);
}
class CardPayment implements PaymentStrategy {
    public String id() { return "CARD"; }
    public void validate(long p) { PaymentStrategy.super.validate(p); if (p < 100) throw new IllegalArgumentException("card minimum is ₹1"); }
    public long fee(long p) { return p * 2 / 100; }                                  // 2% MDR
    public String charge(long p) { return "card-" + p; }
}
class UpiPayment implements PaymentStrategy {
    public String id() { return "UPI"; }
    public long fee(long p) { return 0; }
    public String charge(long p) { return "upi-" + p; }
}
class WalletPayment implements PaymentStrategy {
    public String id() { return "WALLET"; }
    public void validate(long p) { PaymentStrategy.super.validate(p); if (p > 1_000_000) throw new IllegalArgumentException("wallet limit ₹10,000"); }
    public long fee(long p) { return 0; }
    public String charge(long p) { return "wallet-" + p; }
}
class Checkout {                                                                     // context
    private final PaymentStrategy strategy;
    Checkout(PaymentStrategy s) { strategy = s; }
    Receipt pay(long paise) {
        strategy.validate(paise);
        long fee = strategy.fee(paise);
        return new Receipt(strategy.id(), paise + fee, fee, strategy.charge(paise + fee));
    }
}

Map<String, PaymentStrategy> registry = new HashMap<>();
for (PaymentStrategy s : List.of(new CardPayment(), new UpiPayment(), new WalletPayment())) registry.put(s.id(), s);
for (String m : List.of("CARD", "UPI", "WALLET")) System.out.println(new Checkout(registry.get(m)).pay(49_900));
try { new Checkout(registry.get("WALLET")).pay(2_000_000); } catch (IllegalArgumentException e) { System.out.println("rejected: " + e.getMessage()); }` },
    variants: [
      { title: "Lambdas as strategies, and choosing a strategy at runtime",
        text: "If a strategy has **one method and no state**, a lambda or method reference is a complete strategy: `Comparator`, `Predicate`, `Function`, `Supplier` are all strategy interfaces in the JDK. For runtime selection, replace the `switch` with a **registry** (`Map<Key, Strategy>`, or an enum whose constants carry the strategy), and validate unknown keys in one place.",
        code: `record Product(String name, long price, double rating, int sold) {}
List<Product> ps = new ArrayList<>(List.of(new Product("Pen", 40, 4.1, 900), new Product("Bag", 1299, 4.6, 120), new Product("Mug", 349, 3.9, 400)));

Map<String, Comparator<Product>> sorts = Map.of(                                   // strategies as lambdas
    "price_asc", Comparator.comparingLong(Product::price),
    "rating", Comparator.comparingDouble(Product::rating).reversed(),
    "popular", Comparator.comparingInt(Product::sold).reversed());
for (String key : List.of("price_asc", "rating", "popular")) {
    ps.sort(sorts.get(key));
    System.out.println(key + ": " + ps.stream().map(Product::name).toList());
}

enum Shipping {                                                                     // enum constants carrying a strategy
    STANDARD(kg -> 40 + 10 * kg), EXPRESS(kg -> 99 + 20 * kg), FREE(kg -> 0);
    private final java.util.function.IntUnaryOperator cost;
    Shipping(java.util.function.IntUnaryOperator c) { cost = c; }
    int cost(int kg) { return cost.applyAsInt(kg); }
}
System.out.println(Shipping.valueOf("EXPRESS").cost(3) + " " + Shipping.STANDARD.cost(3));`,
        points: [
          "Use a class (not a lambda) when the strategy has state, several methods, dependencies, or needs a name in logs",
          "**Spring**: inject `List<PaymentStrategy>` (all beans implementing it) and build the registry in the constructor; adding a strategy = adding a `@Component`",
          "Keep the selection logic (which strategy for this order?) separate: often a small factory (F06) or a policy table in config"] },
      { title: "Strategy vs State vs Template Method",
        text: "These three are confused more than any other trio. All three vary behaviour; they differ in **who chooses** and **how**.",
        table: [
          ["", "Strategy", "State (F20)", "Template Method (F21)"],
          ["Mechanism", "composition: context holds an interface", "composition: context holds current state object", "inheritance: subclass overrides steps"],
          ["Who picks the behaviour", "the client/config, from outside", "the states themselves, by transitioning", "fixed at compile time by the subclass"],
          ["Do implementations know each other?", "no", "often yes (a state creates the next state)", "no"],
          ["Changes at runtime?", "can be swapped, usually set once", "changes as events arrive", "no"],
          ["Example", "payment method, fare rule, sort order", "vending machine Idle → HasMoney → Dispensing", "report export: fixed steps, custom formatting"]],
        points: [
          "Interview one-liner: \"Strategy is *how* to do one thing, chosen from outside. State is *what I am now*, changed from inside.\"",
          "Strategy vs Bridge (F15): same shape; Bridge separates whole hierarchies for platform independence"] }
    ],
    designs: [
      { title: "Mini LLD: ride-fare pricing with composable strategies",
        text: "A ride-hailing app prices trips differently per city and product: base fare by distance and time, then **modifiers** (peak hours, night, surge from live demand, airport flat fare), then **caps and floors**, then promotions. Each rule is a strategy; a `CompositeFare` applies them in order. Product managers change the rule set per city through config, not code.",
        points: [
          "`FareStrategy.apply(Trip trip, long currentPaise)` returns the new amount, so rules can be chained (base first, then modifiers)",
          "`BaseFare(baseRs, perKm, perMin)` is the first strategy; `PeakMultiplier`, `NightMultiplier`, `SurgeMultiplier(DemandService)` follow",
          "`AirportFlatFare` **replaces** the computed fare when the drop is an airport (order matters, so it goes last before caps)",
          "`MinMaxCap(min, max)` keeps fares sane; surge always capped (regulation in many cities)",
          "Configuration per city: `Map<String, List<FareStrategy>>` built by a factory from JSON",
          "Every strategy is unit-tested alone; the composite is tested with a few golden trips"],
        m: H.cd(["classDiagram",
          "  class FareCalculator { -Map~String,FareStrategy~ byCity; +quote(Trip t) Quote }",
          "  class FareStrategy { <<interface>>; +apply(Trip t, long current) long; +name() String }",
          "  class CompositeFare { -List~FareStrategy~ steps }",
          "  class BaseFare { -long base; -long perKm; -long perMin }",
          "  class PeakMultiplier", "  class SurgeMultiplier { -DemandService demand }", "  class AirportFlatFare", "  class MinMaxCap",
          "  FareCalculator --> FareStrategy",
          "  FareStrategy <|.. CompositeFare", "  FareStrategy <|.. BaseFare", "  FareStrategy <|.. PeakMultiplier",
          "  FareStrategy <|.. SurgeMultiplier", "  FareStrategy <|.. AirportFlatFare", "  FareStrategy <|.. MinMaxCap",
          "  CompositeFare o-- FareStrategy : steps"]),
        code: `record Trip(String city, double km, int minutes, int hour, String drop) {}
interface FareStrategy { long apply(Trip t, long current); String name(); }
record BaseFare(long base, long perKm, long perMin) implements FareStrategy {
    public long apply(Trip t, long c) { return base + Math.round(perKm * t.km()) + perMin * t.minutes(); }
    public String name() { return "base"; }
}
record PeakMultiplier(Set<Integer> hours, double x) implements FareStrategy {
    public long apply(Trip t, long c) { return hours.contains(t.hour()) ? Math.round(c * x) : c; }
    public String name() { return "peak"; }
}
record SurgeMultiplier(java.util.function.ToDoubleFunction<String> demand, double cap) implements FareStrategy {
    public long apply(Trip t, long c) { return Math.round(c * Math.min(cap, Math.max(1.0, demand.applyAsDouble(t.city())))); }
    public String name() { return "surge"; }
}
record AirportFlatFare(long flat) implements FareStrategy {
    public long apply(Trip t, long c) { return t.drop().endsWith("Airport") ? flat : c; }
    public String name() { return "airport"; }
}
record MinMaxCap(long min, long max) implements FareStrategy {
    public long apply(Trip t, long c) { return Math.max(min, Math.min(max, c)); }
    public String name() { return "cap"; }
}
record CompositeFare(List<FareStrategy> steps) implements FareStrategy {
    public long apply(Trip t, long c) {
        long v = c;
        for (FareStrategy s : steps) { long next = s.apply(t, v); if (next != v) System.out.println("    " + s.name() + ": " + v + " -> " + next); v = next; }
        return v;
    }
    public String name() { return "composite"; }
}

Map<String, Double> liveDemand = Map.of("Pune", 1.4, "Indore", 0.8);
Map<String, FareStrategy> byCity = Map.of(
    "Pune", new CompositeFare(List.of(new BaseFare(50, 12, 1), new PeakMultiplier(Set.of(9, 18, 19), 1.2),
                                      new SurgeMultiplier(c -> liveDemand.getOrDefault(c, 1.0), 2.0), new AirportFlatFare(650), new MinMaxCap(80, 3000))),
    "Indore", new CompositeFare(List.of(new BaseFare(40, 10, 1), new MinMaxCap(60, 2000))));
for (Trip t : List.of(new Trip("Pune", 12, 30, 19, "Baner"), new Trip("Pune", 18, 40, 11, "Pune Airport"), new Trip("Indore", 3, 8, 10, "Vijay Nagar"))) {
    System.out.println(t.city() + " " + t.km() + " km -> ₹" + byCity.get(t.city()).apply(t, 0));
}` },
      { title: "Mini LLD: parking-spot allocation strategies",
        text: "A multi-level parking lot must pick a spot when a vehicle enters. Malls want the **nearest to the entrance**, office lots want **fill floors bottom-up** (so upper floors can be closed off-peak), and EV owners should get **charging spots first**. The `ParkingLot` (context) asks an `AllocationStrategy` for a spot; the operator chooses the strategy per lot.",
        points: [
          "`AllocationStrategy.pick(Vehicle v, List<Spot> free) → Optional<Spot>`",
          "`NearestToEntrance`: min by `distanceFromEntrance`; `LowestFloorFirst`: min by (floor, number); `EvFirst`: prefers charging spots for EVs and falls back to a delegate strategy (strategies can wrap strategies)",
          "Spot size compatibility (bike/car/truck) is a filter applied **before** the strategy, so every strategy respects it",
          "For speed: keep free spots in per-size `TreeSet`s ordered by the strategy's comparator (O(log n) pick) instead of scanning",
          "Concurrency follow-up: two gates allocating at once need an atomic `tryReserve(spot)` (F28)"],
        code: `enum Size { BIKE, CAR, TRUCK }
record Spot(String id, int floor, int distance, Size size, boolean charger) {}
record Vehicle(String plate, Size size, boolean ev) {}
interface AllocationStrategy { Optional<Spot> pick(Vehicle v, List<Spot> free); }
class NearestToEntrance implements AllocationStrategy {
    public Optional<Spot> pick(Vehicle v, List<Spot> free) { return free.stream().min(Comparator.comparingInt(Spot::distance)); }
}
class LowestFloorFirst implements AllocationStrategy {
    public Optional<Spot> pick(Vehicle v, List<Spot> free) { return free.stream().min(Comparator.comparingInt(Spot::floor).thenComparing(Spot::id)); }
}
class EvFirst implements AllocationStrategy {
    private final AllocationStrategy fallback;
    EvFirst(AllocationStrategy fallback) { this.fallback = fallback; }
    public Optional<Spot> pick(Vehicle v, List<Spot> free) {
        if (v.ev()) { Optional<Spot> c = fallback.pick(v, free.stream().filter(Spot::charger).toList()); if (c.isPresent()) return c; }
        return fallback.pick(v, free.stream().filter(s -> !s.charger() || v.ev()).toList());          // keep chargers for EVs
    }
}
class ParkingLot {
    private final List<Spot> free; private final AllocationStrategy strategy;
    ParkingLot(List<Spot> spots, AllocationStrategy s) { free = new ArrayList<>(spots); strategy = s; }
    Optional<Spot> park(Vehicle v) {
        List<Spot> fits = free.stream().filter(s -> s.size() == v.size()).toList();         // compatibility first
        Optional<Spot> s = strategy.pick(v, fits);
        s.ifPresent(free::remove);
        return s;
    }
}

List<Spot> spots = List.of(new Spot("G-01", 0, 5, Size.CAR, true), new Spot("G-09", 0, 40, Size.CAR, false),
                           new Spot("1-02", 1, 12, Size.CAR, false), new Spot("1-03", 1, 3, Size.CAR, false));
for (AllocationStrategy st : List.of(new NearestToEntrance(), new LowestFloorFirst(), new EvFirst(new NearestToEntrance()))) {
    ParkingLot lot = new ParkingLot(spots, st);
    System.out.println(st.getClass().getSimpleName() + ": petrol -> " + lot.park(new Vehicle("MH12", Size.CAR, false)).map(Spot::id).orElse("full")
        + ", ev -> " + lot.park(new Vehicle("MH14", Size.CAR, true)).map(Spot::id).orElse("full"));
}` }
    ],
    usages: [
      ["`java.util.Comparator` passed to `sort`, `TreeMap`, `PriorityQueue`", "The ordering algorithm is a strategy; the collection is the context."],
      ["`java.util.function` (`Predicate`, `Function`, `Supplier`) in Streams", "`filter`, `map`, `collect(Collector)` take behaviour as strategy objects."],
      ["`ThreadPoolExecutor` `RejectedExecutionHandler`", "`AbortPolicy`, `CallerRunsPolicy`, `DiscardPolicy`, `DiscardOldestPolicy`: pluggable strategies for a full queue."],
      ["`javax.crypto.Cipher.getInstance(\"AES/GCM/NoPadding\")`, `MessageDigest`", "Algorithm chosen by name; the API stays the same."],
      ["`java.util.zip.Deflater` levels/strategies, `java.text.Collator`", "Interchangeable compression and string-comparison algorithms."],
      ["Spring Security `PasswordEncoder` (`BCrypt`, `Argon2`, `Pbkdf2`)", "Inject the algorithm; `DelegatingPasswordEncoder` picks by an `{id}` prefix stored with each hash (a strategy registry)."],
      ["Spring Security `AuthenticationProvider`s, Spring Retry `BackOffPolicy`", "Several interchangeable algorithms behind one interface, selected by configuration."]
    ],
    avoid: {
      points: [
        "Only one algorithm exists and no second is in sight: an interface with one implementation is ceremony (YAGNI)",
        "The variants differ by a constant (rate 2% vs 3%): pass the number, don't create classes",
        "A closed, small, stable set chosen by a value: a `switch` expression over an enum (or `sealed` types) is clearer",
        "Clients have to know too much to choose the right strategy: hide the choice in a factory or policy",
        "The behaviour depends on internal state that changes over time: that's State (F20)"],
      pros: ["Removes conditional branches; each algorithm is isolated and testable", "Open/closed: add algorithms without touching the context", "Swap behaviour at runtime or by configuration", "Composition over inheritance; lambdas make small strategies cheap"],
      cons: ["More classes or objects for small variations", "Clients (or a factory) must know which strategy to pick", "A shared interface may force strategies to accept data some don't need", "Over-applied, it scatters simple logic across many files"] },
    compare: [
      ["State (F20)", "Behaviour changes with internal state", "Same shape. Strategy is chosen from outside and usually fixed; State objects replace themselves as events arrive"],
      ["Template Method (F21)", "Fixed skeleton, varying steps", "Template Method varies steps by inheritance at compile time; Strategy varies the whole algorithm by composition at runtime"],
      ["Bridge (F15)", "Abstraction and implementation vary independently", "Bridge is structural and splits two hierarchies; Strategy is about one interchangeable algorithm"],
      ["Command (F19)", "Encapsulate a request as an object", "A command is *what to do* (often with its own receiver and undo); a strategy is *how* to do a step the context needs"],
      ["Decorator (F11)", "Add behaviour around an object", "Decorator changes the *skin* (wraps); Strategy changes the *guts* (replaces the algorithm inside)"]],
    widget: { heading: "Interactive: swap the fare strategy", caption: "Choose a strategy and a trip. The context call stays the same while the injected algorithm changes the fare.", render: fareWidget },
    pitfalls: [
      "Replacing a two-line `if` with three classes and a factory",
      "Strategies that reach back into the context's internals (tight coupling); pass what they need as parameters",
      "Selection logic duplicated in many places instead of one factory/registry",
      "Stateful strategies shared between threads or requests (a \"stateless\" strategy that caches per-user data)",
      "Interface bloat: every strategy implements methods only one of them needs",
      "Confusing Strategy with State and letting strategies switch the context's strategy",
      "Unknown keys falling through silently (`registry.get(key)` returning `null`); fail fast with a clear error",
      "Ordering bugs in composed strategies (flat airport fare applied before surge, or caps applied before modifiers)"
    ],
    quiz: [
      { q: "What is Strategy's intent?", options: ["Create objects", "Encapsulate interchangeable algorithms behind one interface so they can vary independently of clients", "Notify dependents of changes", "Change behaviour as internal state changes"], answer: 1, why: "A family of algorithms, one interface." },
      { q: "The clearest smell that suggests Strategy:", options: ["A long constructor", "A `switch`/`if` chain choosing between algorithms, repeated or growing", "Many getters", "A static method"], answer: 1, why: "Each branch becomes a strategy class." },
      { q: "`list.sort(Comparator.comparing(Product::price))`: which part is the strategy?", options: ["`list`", "The `Comparator`", "`sort`", "`Product`"], answer: 1, why: "The comparison algorithm is plugged into the sort (context)." },
      { q: "Strategy vs State: who changes the behaviour?", options: ["Both the client", "Strategy: chosen from outside; State: the state objects transition the context themselves", "Both internal", "Neither can change"], answer: 1, why: "Outside choice vs internal transitions." },
      { q: "Strategy vs Template Method?", options: ["Same", "Strategy uses composition (swap an object at runtime); Template Method uses inheritance (override steps)", "Template Method is runtime", "Strategy needs abstract classes"], answer: 1, why: "Composition vs inheritance." },
      { q: "When is a `switch` over an enum better than Strategy?", options: ["Never", "Small, closed, stable set of tiny behaviours that won't be extended by others", "When there are 20 cases", "When behaviour comes from plugins"], answer: 1, why: "Patterns should remove pain, not add it." },
      { q: "In Spring, the simplest way to build a strategy registry is…", options: ["Reflection over the classpath", "Inject `List<PaymentStrategy>` (all beans) and map them by `id()`", "A static `switch`", "XML only"], answer: 1, why: "Adding a strategy becomes adding a component." },
      { q: "`ThreadPoolExecutor.CallerRunsPolicy` is an example of…", options: ["Observer", "Strategy (a rejection-handling policy)", "Singleton", "Builder"], answer: 1, why: "The executor delegates the 'queue full' decision to a pluggable handler." }
    ],
    cheatsheet: {
      table: [
        ["Part", "Role", "Example"],
        ["Strategy", "algorithm interface", "`PaymentStrategy`, `FareStrategy`, `Comparator`"],
        ["Concrete strategy", "one algorithm", "`UpiPayment`, `SurgeMultiplier`, `NearestToEntrance`"],
        ["Context", "holds and calls the strategy", "`Checkout`, `FareCalculator`, `ParkingLot`"],
        ["Selector", "picks the strategy", "registry `Map`, enum, factory, config"]],
      cards: [
        { title: "Use when", items: ["if/switch choosing an algorithm", "Algorithms vary by city, tenant, plan", "Need to test algorithms alone", "Runtime/config choice"] },
        { title: "Java idioms", items: ["Lambdas for one-method strategies", "Enum constants carrying behaviour", "`Map<Key, Strategy>` registry", "Spring `List<Strategy>` injection"] },
        { title: "Machine-coding classics", items: ["Parking fee and spot allocation", "Payment methods", "Pricing / discounts", "Rate-limit algorithm", "Elevator scheduling", "Split rules (equal/exact/percent)"] }]
    },
    practice: [
      { level: "Easy", q: "Define Strategy, draw it, and give two JDK examples.",
        a: ["Strategy encapsulates a family of interchangeable algorithms behind one interface; a context holds one and delegates to it, and the client chooses which.",
          "JDK: `Comparator` (sorting), `RejectedExecutionHandler` (thread pools), `Predicate`/`Function` in Streams, `Cipher.getInstance(algorithm)`."],
        m: H.cd(["classDiagram",
          "  class Context { -Strategy strategy; +execute() }",
          "  class Strategy { <<interface>>; +run(Input in) Output }",
          "  Context o-- Strategy",
          "  Strategy <|.. ConcreteA", "  Strategy <|.. ConcreteB", "  Strategy <|.. ConcreteC"]) },
      { level: "Easy", q: "Parking fee: implement `HourlyFee` (₹20/hour, rounded up), `FlatFee` (₹100 per entry) and `WeekendFee` (₹30/hour on Sat/Sun, else hourly), and a `ParkingLot` that uses whichever it's given.",
        code: `interface FeeStrategy { long fee(LocalDateTime in, LocalDateTime out); }
class HourlyFee implements FeeStrategy {
    private final long perHour; HourlyFee(long p) { perHour = p; }
    public long fee(LocalDateTime in, LocalDateTime out) { long mins = Duration.between(in, out).toMinutes(); return Math.max(1, (mins + 59) / 60) * perHour; }
}
class FlatFee implements FeeStrategy { public long fee(LocalDateTime in, LocalDateTime out) { return 100; } }
class WeekendFee implements FeeStrategy {
    private final FeeStrategy weekday = new HourlyFee(20), weekend = new HourlyFee(30);
    public long fee(LocalDateTime in, LocalDateTime out) {
        DayOfWeek d = in.getDayOfWeek();
        return (d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY ? weekend : weekday).fee(in, out);
    }
}
class ParkingLot {
    private final FeeStrategy fees; ParkingLot(FeeStrategy f) { fees = f; }
    long exit(LocalDateTime in, LocalDateTime out) { return fees.fee(in, out); }
}

LocalDateTime sat = LocalDateTime.of(2026, 11, 14, 10, 0), mon = LocalDateTime.of(2026, 11, 16, 10, 0);
for (FeeStrategy f : List.of(new HourlyFee(20), new FlatFee(), new WeekendFee()))
    System.out.println(f.getClass().getSimpleName() + ": Sat 2h10m=₹" + new ParkingLot(f).exit(sat, sat.plusMinutes(130)) + ", Mon 45m=₹" + new ParkingLot(f).exit(mon, mon.plusMinutes(45)));` },
      { level: "Medium", q: "Splitwise-style expense splitting (frequently asked): implement `EqualSplit`, `ExactSplit` and `PercentSplit` strategies that return each person's share in paise, validate inputs, and handle rounding so shares add up to the total.",
        code: `interface SplitStrategy { Map<String, Long> split(long total, List<String> people, Map<String, Long> input); }
class EqualSplit implements SplitStrategy {
    public Map<String, Long> split(long total, List<String> people, Map<String, Long> in) {
        Map<String, Long> r = new LinkedHashMap<>(); long each = total / people.size(), rem = total % people.size();
        for (int i = 0; i < people.size(); i++) r.put(people.get(i), each + (i < rem ? 1 : 0));   // spread leftover paise
        return r;
    }
}
class ExactSplit implements SplitStrategy {
    public Map<String, Long> split(long total, List<String> people, Map<String, Long> in) {
        long sum = in.values().stream().mapToLong(Long::longValue).sum();
        if (sum != total) throw new IllegalArgumentException("exact amounts add to " + sum + ", expected " + total);
        return new LinkedHashMap<>(in);
    }
}
class PercentSplit implements SplitStrategy {
    public Map<String, Long> split(long total, List<String> people, Map<String, Long> pct) {
        if (pct.values().stream().mapToLong(Long::longValue).sum() != 100) throw new IllegalArgumentException("percentages must add to 100");
        Map<String, Long> r = new LinkedHashMap<>(); long given = 0;
        for (int i = 0; i < people.size(); i++) {
            String p = people.get(i);
            long share = i == people.size() - 1 ? total - given : total * pct.get(p) / 100;    // last person absorbs rounding
            r.put(p, share); given += share;
        }
        return r;
    }
}

List<String> ppl = List.of("asha", "ravi", "meera");
System.out.println(new EqualSplit().split(100_000, ppl, Map.of()));
System.out.println(new PercentSplit().split(99_999, ppl, Map.of("asha", 50L, "ravi", 30L, "meera", 20L)));
try { new ExactSplit().split(1000, ppl, Map.of("asha", 500L, "ravi", 400L)); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }`,
        follow: "Next steps in the full Splitwise design: `Expense(paidBy, total, SplitStrategy, inputs)`, a balance sheet `Map<String, Map<String, Long>>`, and a simplify-debts step (greedy max-creditor/max-debtor)." },
      { level: "Medium", q: "A `DiscountService` has a 120-line `switch (couponType)` with 9 coupon types. Describe the refactor to Strategy step by step, in a Spring app, without a big-bang change.",
        a: ["Define `interface DiscountRule { String type(); boolean applies(Cart c); long discount(Cart c); }`.",
          "Move one `case` at a time into a `@Component` implementing it (e.g. `FlatOffRule`, `PercentOffRule`, `BuyXGetYRule`), with its own unit tests copied from the old ones.",
          "In `DiscountService`, inject `List<DiscountRule>` and build `Map<String, DiscountRule>`; for migrated types delegate, for the rest keep the old `switch` temporarily.",
          "When all cases are moved, delete the `switch`; unknown types throw a clear error at startup or request time.",
          "Stacking rules (best-of vs cumulative) is a separate policy, which can itself be a strategy (`CombinePolicy`)."] },
      { level: "Medium", q: "Implement rate-limiting algorithms as strategies: `FixedWindow` and `TokenBucket` behind `RateLimitStrategy.allow(key, nowMillis)`, and show they behave differently on a burst.",
        code: `interface RateLimitStrategy { boolean allow(String key, long now); }
class FixedWindow implements RateLimitStrategy {
    private final int limit; private final long windowMs; private final Map<String, long[]> s = new HashMap<>();   // [windowStart, count]
    FixedWindow(int limit, long windowMs) { this.limit = limit; this.windowMs = windowMs; }
    public boolean allow(String k, long now) {
        long[] w = s.computeIfAbsent(k, x -> new long[]{now - now % windowMs, 0});
        if (now - w[0] >= windowMs) { w[0] = now - now % windowMs; w[1] = 0; }
        return ++w[1] <= limit;
    }
}
class TokenBucket implements RateLimitStrategy {
    private final double capacity, perMs; private final Map<String, double[]> s = new HashMap<>();             // [tokens, lastRefill]
    TokenBucket(int capacity, double perSecond) { this.capacity = capacity; this.perMs = perSecond / 1000; }
    public boolean allow(String k, long now) {
        double[] b = s.computeIfAbsent(k, x -> new double[]{capacity, now});
        b[0] = Math.min(capacity, b[0] + (now - b[1]) * perMs); b[1] = now;
        if (b[0] >= 1) { b[0] -= 1; return true; }
        return false;
    }
}
static String run(RateLimitStrategy r) {
    StringBuilder sb = new StringBuilder();
    long[] times = {900, 950, 990, 1000, 1010, 1050, 1100};          // a burst around a window boundary at 1000 ms
    for (long t : times) sb.append(r.allow("u1", t) ? "Y" : "n");
    return sb.toString();
}

System.out.println("fixed window (3/s): " + run(new FixedWindow(3, 1000)));
System.out.println("token bucket (cap 3, 3/s): " + run(new TokenBucket(3, 3)));`,
        follow: "The fixed window lets 6 requests through in ~100 ms around the boundary; the token bucket smooths it. Choosing the algorithm per API plan is exactly a Strategy decision." },
      { level: "Medium", q: "Elevator system: how would you use Strategy for request scheduling? Name three strategies and where the strategy sits in the design.",
        a: ["`ElevatorController` (context) receives hall calls and asks a `DispatchStrategy` which car should serve each: `ElevatorCar assign(Request r, List<ElevatorCar> cars)`.",
          "**NearestCar**: least distance, preferring cars already moving towards the floor in the same direction.",
          "**LeastLoaded**: fewest pending stops; good in office lobbies at 9 am.",
          "**ZoneBased**: cars 1–2 serve floors 0–10, cars 3–4 serve 11–20 (express zones).",
          "Inside each car, the order of stops is a separate strategy (SCAN/LOOK: keep going in one direction while requests remain). Car movement by state (Idle/MovingUp/DoorsOpen) is State (F20)."],
        m: H.cd(["classDiagram",
          "  class ElevatorController { -List~ElevatorCar~ cars; -DispatchStrategy dispatch; +call(int floor, Direction d) }",
          "  class DispatchStrategy { <<interface>>; +assign(Request r, List~ElevatorCar~ cars) ElevatorCar }",
          "  class ElevatorCar { -int floor; -TreeSet~Integer~ stops; -CarState state }",
          "  ElevatorController o-- ElevatorCar",
          "  ElevatorController --> DispatchStrategy",
          "  DispatchStrategy <|.. NearestCar", "  DispatchStrategy <|.. LeastLoaded", "  DispatchStrategy <|.. ZoneBased"]) },
      { level: "Hard", q: "Product wants to A/B test two pricing algorithms for 10% of users in Bengaluru, with instant rollback. Design the strategy selection.",
        a: ["Keep both algorithms as `PricingStrategy` implementations; neither knows about experiments.",
          "Add a `PricingStrategyResolver` (a factory) that takes `(user, city)` and returns a strategy: it consults an experiment service / feature flag (`bucket = hash(userId + experimentId) % 100 < 10`).",
          "Deterministic bucketing keeps a user's price stable across requests; log `strategyId` on every quote and order for analysis.",
          "Rollback = flip the flag; no deploy. Default to the control strategy on any resolver error.",
          "Guardrails: a `MinMaxCap` step after either strategy, and alerts on conversion/complaints per variant.",
          "Don't leak the experiment into the context (`PriceService` just calls `resolver.forUser(u).price(cart)`)."] },
      { level: "Hard", q: "A strategy needs data the context has (cart, user tier, city, time) and some strategies need a DB lookup. How do you design the interface so it doesn't keep growing, and how do you test it?",
        a: ["Pass a **parameter object** (`PricingContext` record: cart, user, city, now) instead of growing the method signature; adding a field doesn't break other strategies.",
          "Inject heavy dependencies (repositories, demand service) into the **strategy's constructor**, not through the method; strategies that don't need them stay simple.",
          "Inject a `Clock` so time-based strategies are deterministic in tests.",
          "Test each strategy alone with table-driven tests; test the resolver separately; one integration test checks that the context uses whatever resolver returns.",
          "Avoid strategies calling back into the context (`context.getSomething()`), which couples them and makes them order-dependent."] }
    ],
    recap: [
      "Strategy = an interface for an algorithm, several implementations, and a context that delegates to the one it's given.",
      "It replaces growing `if/switch` chains and is the workhorse of machine-coding rounds: payments, pricing, parking fees and spots, split rules, rate limits, elevator dispatch.",
      "In Java, small strategies are lambdas (`Comparator`), enums can carry them, and registries/Spring `List<Strategy>` handle runtime selection.",
      "Compose strategies (base + modifiers + caps) for real pricing; keep selection in one resolver.",
      "Strategy (chosen from outside) vs State (changes from inside) vs Template Method (inheritance): know the one-liners."
    ]
  });
})();
