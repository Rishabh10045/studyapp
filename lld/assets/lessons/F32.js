/* Lesson F32: How to approach a machine-coding round */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var PHASES = [
    { k: "clarify", label: "Clarify requirements", def: 8, lo: 5, hi: 12 },
    { k: "design", label: "Entities + class diagram", def: 10, lo: 6, hi: 15 },
    { k: "core", label: "Code the core flow", def: 45, lo: 35, hi: 60 },
    { k: "edge", label: "Edge cases, patterns, concurrency", def: 17, lo: 8, hi: 25 },
    { k: "demo", label: "Demo + walk-through", def: 10, lo: 5, hi: 15 }
  ];
  var picker = H.widgets.picker({
    intro: "Mid-round situations. Pick the move that maximises **working, extensible code by the deadline**.",
    question: "Best next move?", noun: "Situations",
    options: ["Ask / confirm scope", "Sketch entities first", "Code the happy path", "Add an interface/pattern", "Handle the edge case", "Defer it (say so)"],
    items: [
      { title: "Minute 2", text: "Prompt: \"Design a parking lot.\" Nothing else. You're itching to open the editor.", answer: "Ask / confirm scope", why: "Vehicle types, floors, pricing, payment, multiple gates, concurrency? Two minutes of questions decide what \"done\" means. Write the agreed must-haves at the top of the file." },
      { title: "Minute 10", text: "Requirements agreed. You know you'll need ParkingLot, Floor, Spot, Ticket… but haven't written them down.", answer: "Sketch entities first", why: "A 5-minute outline (nouns → classes, verbs → methods, relationships) prevents rewrites and gives the interviewer something to agree with." },
      { title: "Minute 20", text: "You're designing a plugin system for 6 future pricing models; `park()` doesn't exist yet.", answer: "Code the happy path", why: "Nothing runs yet. Get park → exit → fee working end to end; a single `PricingStrategy` interface with one implementation is enough extensibility for now." },
      { title: "Minute 45", text: "The fee is computed by a 40-line `switch (vehicleType)` and the interviewer says \"we'll add EV and weekend pricing next quarter\".", answer: "Add an interface/pattern", why: "That's a stated axis of change: extract `PricingStrategy` (plus a decorator for discounts). Patterns earn their place when a requirement asks for variation." },
      { title: "Minute 55", text: "The happy path works. `park()` on a full lot returns `null`, and the driver code NPEs.", answer: "Handle the edge case", why: "Full lot, unknown ticket, double exit, invalid input are graded. Throw a domain exception (`LotFullException`) or return `Optional`, and show it in the demo." },
      { title: "Minute 70", text: "Interviewer: \"Two gates might grab the same spot.\" Concurrency was listed as a must-have.", answer: "Handle the edge case", why: "Fix the race: allocate under a per-floor lock or poll from a concurrent queue of free spots. Explain the check-then-act problem in one sentence." },
      { title: "Minute 78", text: "You'd love to add a reservation system, a REST API and a database before the demo.", answer: "Defer it (say so)", why: "Out of scope. Say how it would plug in (a `ReservationService`, a JPA repository behind the same interface) and spend the time on a clean demo." },
      { title: "Minute 30", text: "You aren't sure whether a ticket should be lost-ticket-penalised or not.", answer: "Ask / confirm scope", why: "A 10-second question beats 10 minutes of guessing. If the interviewer says \"your call\", state the assumption in a comment." },
      { title: "Minute 50", text: "`ParkingLotService` now has 450 lines: allocation, pricing, payment, printing receipts and display boards.", answer: "Add an interface/pattern", why: "Split responsibilities (SRP): allocation strategy, pricing strategy, payment gateway interface, display as an observer. Small classes are easier to extend and to explain." },
      { title: "Minute 85", text: "The demo works but there's no persistence, and you have 5 minutes.", answer: "Defer it (say so)", why: "In-memory repositories behind interfaces *are* the right call for a machine-coding round. Explain that a DB-backed repository would implement the same interface." }
    ]
  });

  function widget(el, ctx) {
    var s = ctx.state;
    if (!s.t) { s.t = {}; PHASES.forEach(function (p) { s.t[p.k] = p.def; }); }
    s.pk = s.pk || {};
    el.innerHTML = "<p>" + ctx.md("**Part 1: budget a 90-minute round.** Move the sliders and see what risks your plan carries.") + "</p><div class='controls' data-r='sl'></div>" +
      "<div class='metrics' data-r='m' style='margin-top:12px'></div><div class='diagram' data-r='bar' style='text-align:left;min-height:0'></div><div class='result' data-r='res'></div>" +
      "<div class='btnrow'><button type='button' class='btn' data-r='def'>Use the recommended plan</button></div>" +
      "<h3 style='margin-top:26px'>Part 2: what's your next move?</h3><div data-r='pk'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("sl").innerHTML = PHASES.map(function (p) {
      return "<label class='field' style='min-width:200px'>" + ctx.esc(p.label) + " <span data-v='" + p.k + "'></span><input type='range' min='0' max='70' step='1' data-k='" + p.k + "'></label>";
    }).join("");
    var COLORS = ["#3b82f6", "#eab308", "#16a34a", "#06b6d4", "#a855f7"];
    function draw() {
      var total = 0, warn = [];
      PHASES.forEach(function (p) {
        var v = s.t[p.k]; total += v;
        el.querySelector("input[data-k='" + p.k + "']").value = v;
        el.querySelector("[data-v='" + p.k + "']").textContent = v + " min";
        if (v < p.lo) warn.push(p.label + ": " + v + " min is under the usual " + p.lo + "–" + p.hi + " min.");
        if (v > p.hi) warn.push(p.label + ": " + v + " min is over the usual " + p.lo + "–" + p.hi + " min.");
      });
      if (s.t.clarify < 3) warn.unshift("Almost no clarification: you risk building the wrong thing.");
      if (s.t.design + s.t.clarify > 30) warn.unshift("Over 30 minutes before any code: the most common reason candidates finish with nothing runnable.");
      if (s.t.core < 30) warn.unshift("Under 30 minutes of core coding: a full happy path is unlikely.");
      if (s.t.demo < 3) warn.unshift("No demo time: interviewers grade code that runs.");
      q("m").innerHTML = "<div class='metric'><div class='v'>" + total + " min</div><div class='l'>Planned (target 90)</div></div><div class='metric'><div class='v'>" + (s.t.core + s.t.edge) + " min</div><div class='l'>Hands on keyboard</div></div><div class='metric'><div class='v'>" + Math.round(100 * (s.t.core + s.t.edge) / Math.max(total, 1)) + "%</div><div class='l'>Of the round spent coding</div></div>";
      q("bar").innerHTML = "<div style='display:flex;height:34px;border-radius:8px;overflow:hidden'>" + PHASES.map(function (p, i) {
        return s.t[p.k] ? "<div title='" + ctx.esc(p.label) + "' style='flex:" + s.t[p.k] + ";background:" + COLORS[i] + ";color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;white-space:nowrap;overflow:hidden'>" + s.t[p.k] + "</div>" : "";
      }).join("") + "</div><div class='legend' style='margin-top:8px'>" + PHASES.map(function (p, i) { return "<span><i style='background:" + COLORS[i] + "'></i>" + ctx.esc(p.label) + "</span>"; }).join("") + "</div>";
      if (total !== 90) warn.unshift("Plan adds up to " + total + " min; the round is 90.");
      var res = q("res");
      res.className = "result " + (warn.length ? "warn" : "ok");
      res.innerHTML = warn.length ? "<div class='out'>Risks in this plan</div><ul>" + warn.map(function (w) { return "<li>" + ctx.esc(w) + "</li>"; }).join("") + "</ul>"
        : "<div class='out'>Solid plan</div><p>" + ctx.md("Enough clarity to build the right thing, most of the time on code, and a demo slot. Keep a **working build** at every checkpoint so an overrun costs polish, not the demo.") + "</p>";
    }
    q("sl").addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (!k) return; s.t[k] = +e.target.value; ctx.save(); draw(); });
    q("def").addEventListener("click", function () { PHASES.forEach(function (p) { s.t[p.k] = p.def; }); ctx.save(); draw(); });
    draw();
    picker(q("pk"), { state: s.pk, save: ctx.save, esc: ctx.esc, md: ctx.md, H: ctx.H });
  }

  var SLIDES = [
    { title: "What a machine-coding round actually grades",
      text: "You get a prompt (\"design a parking lot / Splitwise / rate limiter\"), 60–120 minutes and an IDE. Unlike an HLD round, the output is **running code**. Interviewers grade a handful of things, and a perfect diagram with no working code loses to a plain design that runs. This lesson gives you a repeatable playbook and walks one problem (a parking lot) through every step.",
      table: [
        ["Criterion", "What they look for", "How to show it"],
        ["Working code", "Happy path runs end to end; demo in `main` or tests", "Code the core flow first; keep it compiling"],
        ["Modelling", "Right entities, clear responsibilities, sensible names", "Nouns → classes, verbs → methods; small classes"],
        ["Extensibility", "New requirement = new class, not edits everywhere", "Interfaces at the axes of change (Strategy, State)"],
        ["Correctness", "Edge cases, validation, invariants", "Domain exceptions, guard clauses, a demo of failures"],
        ["Concurrency (if asked)", "No double booking / lost updates", "Locks or atomic ops at the exact shared state"],
        ["Communication", "Explains trade-offs, asks good questions", "State assumptions in comments; narrate decisions"]],
      points: ["Typical formats: 90 min solo + 15–30 min review, or pair-style with the interviewer watching", "Usually no DB, no framework, no UI: in-memory repositories and a driver class are expected", "Code quality is read line by line in the review: naming, encapsulation, no god classes"] },
    { title: "The 90-minute timeline",
      text: "Budget the round before you start and **keep a working build at every checkpoint**. Then an overrun costs polish, not the demo.",
      m: M(["flowchart LR",
        "  A[\"1. Clarify<br/><span class='d'>5–10 min</span>\"]:::s0 --> B[\"2. Entities + diagram<br/><span class='d'>5–10 min</span>\"]:::s1",
        "  B --> C[\"3. Core flow<br/><span class='d'>35–45 min</span>\"]:::s2",
        "  C --> D[\"4. Edge cases, patterns,<br/>concurrency<br/><span class='d'>10–20 min</span>\"]:::s3",
        "  D --> E[\"5. Demo + extensions<br/><span class='d'>5–10 min</span>\"]:::s4",
        "  C -. checkpoint: runs .-> C",
        "  classDef s3 stroke:#16a34a,stroke-width:2px;",
        "  classDef s4 stroke:#a855f7,stroke-width:2px;"]),
      points: ["Checkpoint 1 (~25 min in): models + one service method run from `main`", "Checkpoint 2 (~55 min): full happy path", "Checkpoint 3 (~75 min): edge cases + the one extension they asked for", "If you're behind, cut scope out loud (\"I'll skip payments and stub them\") rather than silently"] },
    { title: "Step 1: clarify requirements (and write them down)",
      text: "Turn a one-line prompt into a short, agreed list. Ask about **actors, core use cases, scale/concurrency, variations, and what's out of scope**. Then write the list as a comment at the top of your main file: it's your contract and your demo script.",
      table: [
        ["Question to ask", "Parking-lot answer (example)"],
        ["Who uses it? Main use cases?", "Driver parks and exits; admin adds floors/spots"],
        ["What varies?", "Vehicle types (bike, car, truck); pricing may change (hourly now, weekend later)"],
        ["Rules?", "Bike fits any spot, car fits car/large, truck only large; pay on exit"],
        ["Concurrency?", "Multiple entry gates simultaneously: must not double-assign a spot"],
        ["Out of scope?", "Payment gateway, UI, persistence, reservations"]],
      code: `/*
 * Parking lot: agreed scope
 * MUST: park(vehicle) -> ticket (nearest suitable spot), exit(ticket) -> fee, multiple floors,
 *       vehicle types BIKE/CAR/TRUCK, hourly pricing, safe with several gates at once.
 * NICE: weekend pricing, EV spots, display board of free spots.
 * OUT:  payments, UI, persistence (in-memory repos behind interfaces).
 * ASSUMPTIONS: partial hours round up; lost ticket = not handled.
 */`,
      lang: "text",
      points: ["Prioritise: MUST / NICE / OUT", "Ask for an example input/output; it becomes your demo", "If the interviewer says \"your call\", decide and write the assumption down"] },
    { title: "Step 2: nouns → classes, verbs → methods",
      text: "Underline nouns and verbs in the agreed requirements. Nouns that hold state or rules become **classes** (or enums/records); verbs become **methods on the class that owns the data**. Things that vary become **interfaces**.",
      table: [
        ["From the requirements", "Becomes", "Kind"],
        ["parking lot, floor, spot", "`ParkingLot`, `Floor`, `Spot`", "classes (composition)"],
        ["vehicle, vehicle type, spot size", "`Vehicle` (record), `VehicleType`, `SpotSize`", "record + enums"],
        ["ticket", "`Ticket` (record: id, vehicle, spot, entry time)", "immutable value"],
        ["park, exit", "`ParkingService.park()`, `.exit()`", "service methods"],
        ["nearest suitable spot", "`SpotAllocationStrategy`", "interface (varies)"],
        ["hourly / weekend pricing", "`PricingStrategy`", "interface (varies)"],
        ["store tickets", "`TicketRepository` (in-memory)", "interface + impl"]],
      points: ["Enums for closed sets (vehicle types), interfaces for open sets (pricing rules)", "Records for immutable values (`Ticket`, `Money`, `Vehicle`)", "Watch for \"manager\" or \"handler\" names: usually a sign of a god class"] },
    { title: "Step 3: draw the class diagram outline",
      text: "Five minutes, boxes and arrows, just enough to agree on. Mark which relationships are composition (the lot owns floors, floors own spots), which are associations (a ticket refers to a spot), and where the interfaces sit.",
      m: H.cd(["classDiagram",
        "  class ParkingService { -List~Floor~ floors; -SpotAllocationStrategy alloc; -PricingStrategy pricing; -TicketRepository tickets; +park(Vehicle v) Ticket; +exit(String ticketId) long }",
        "  class Floor { -int number; -List~Spot~ spots }",
        "  class Spot { -String id; -SpotSize size; -boolean free; +fits(VehicleType t) boolean }",
        "  class Ticket { <<record>>; String id; Vehicle vehicle; Spot spot; Instant entry }",
        "  class SpotAllocationStrategy { <<interface>>; +allocate(List~Floor~ floors, VehicleType t) Optional~Spot~ }",
        "  class PricingStrategy { <<interface>>; +fee(Ticket t, Instant exit) long }",
        "  class TicketRepository { <<interface>>; +save(Ticket t); +remove(String id) Optional~Ticket~ }",
        "  ParkingService *-- Floor",
        "  Floor *-- Spot",
        "  ParkingService --> SpotAllocationStrategy",
        "  ParkingService --> PricingStrategy",
        "  ParkingService --> TicketRepository",
        "  Ticket --> Spot",
        "  SpotAllocationStrategy <|.. NearestSpotStrategy",
        "  PricingStrategy <|.. HourlyPricing",
        "  TicketRepository <|.. InMemoryTicketRepository"]),
      points: ["Draw only what you'll code; skip getters/setters", "Interfaces exactly where requirements said \"may change\"", "This diagram is also what you'll walk through in the review"] },
    { title: "Step 4: layer the code",
      text: "A predictable layout lets the interviewer find things and keeps responsibilities apart. In a single-file round use nested sections in the same order; in an IDE use packages.",
      m: M(["flowchart TB",
        "  D[\"driver / Main<br/><span class='d'>demo scenarios</span>\"]:::s0 --> S[\"service<br/><span class='d'>ParkingService: use cases, orchestration</span>\"]:::s1",
        "  S --> ST[\"strategy<br/><span class='d'>allocation, pricing</span>\"]:::s2",
        "  S --> R[\"repository<br/><span class='d'>TicketRepository (in-memory)</span>\"]:::s2",
        "  S --> MD[\"model<br/><span class='d'>Vehicle, Spot, Floor, Ticket, enums</span>\"]:::s3",
        "  ST --> MD",
        "  R --> MD",
        "  S --> X[\"exception<br/><span class='d'>LotFullException, InvalidTicketException</span>\"]:::bad",
        "  classDef s3 stroke:#16a34a,stroke-width:2px;"]),
      points: ["Models hold data and their own invariants (`Spot.occupy()` refuses if taken)", "Services coordinate; they don't contain pricing math (strategies do)", "Repositories hide storage: swapping in a DB later is a new class", "The driver is your demo and your quick test"] },
    { title: "Step 5: code the core flow first (models → service → driver)",
      text: "Write the smallest end-to-end slice that runs: models, one allocation rule, one pricing rule, an in-memory repository and a `main` that parks and exits. Interfaces are in place from the start, but each has **one** implementation. This is checkpoint 2: everything after this is improvement on running code.",
      code: `enum VehicleType { BIKE, CAR, TRUCK }
enum SpotSize { SMALL, MEDIUM, LARGE;
    boolean fits(VehicleType t) {                                            // bike: any, car: medium+, truck: large
        return switch (t) { case BIKE -> true; case CAR -> this != SMALL; case TRUCK -> this == LARGE; };
    }
}
record Vehicle(String plate, VehicleType type) { }
final class Spot {
    final String id; final SpotSize size; private boolean free = true;
    Spot(String id, SpotSize size) { this.id = id; this.size = size; }
    boolean isFree() { return free; }
    void occupy() { if (!free) throw new IllegalStateException(id + " already taken"); free = false; }
    void release() { free = true; }
}
record Floor(int number, List<Spot> spots) { }
record Ticket(String id, Vehicle vehicle, Spot spot, Instant entry) { }

interface SpotAllocationStrategy { Optional<Spot> allocate(List<Floor> floors, VehicleType t); }
interface PricingStrategy { long fee(Ticket t, Instant exit); }
interface TicketRepository { void save(Ticket t); Optional<Ticket> remove(String id); }

class NearestSpotStrategy implements SpotAllocationStrategy {
    public Optional<Spot> allocate(List<Floor> floors, VehicleType t) {
        return floors.stream().flatMap(f -> f.spots().stream()).filter(s -> s.isFree() && s.size.fits(t)).findFirst();
    }
}
class HourlyPricing implements PricingStrategy {
    private final Map<VehicleType, Long> perHour;
    HourlyPricing(Map<VehicleType, Long> perHour) { this.perHour = perHour; }
    public long fee(Ticket t, Instant exit) {
        long minutes = Duration.between(t.entry(), exit).toMinutes();
        long hours = Math.max(1, (minutes + 59) / 60);                       // partial hours round up
        return hours * perHour.get(t.vehicle().type());
    }
}
class InMemoryTicketRepository implements TicketRepository {
    private final Map<String, Ticket> byId = new HashMap<>();
    public void save(Ticket t) { byId.put(t.id(), t); }
    public Optional<Ticket> remove(String id) { return Optional.ofNullable(byId.remove(id)); }
}
class ParkingService {
    private final List<Floor> floors; private final SpotAllocationStrategy alloc;
    private final PricingStrategy pricing; private final TicketRepository tickets; private final Clock clock;
    private int seq = 0;
    ParkingService(List<Floor> floors, SpotAllocationStrategy a, PricingStrategy p, TicketRepository r, Clock c) {
        this.floors = floors; alloc = a; pricing = p; tickets = r; clock = c;
    }
    Ticket park(Vehicle v) {
        Spot s = alloc.allocate(floors, v.type()).orElseThrow(() -> new IllegalStateException("lot full for " + v.type()));
        s.occupy();
        Ticket t = new Ticket("T" + (++seq), v, s, clock.instant());
        tickets.save(t);
        return t;
    }
    long exit(String ticketId) {
        Ticket t = tickets.remove(ticketId).orElseThrow(() -> new IllegalArgumentException("unknown ticket " + ticketId));
        t.spot().release();
        return pricing.fee(t, clock.instant());
    }
}

// driver: the demo you'll run at the end
List<Floor> floors = List.of(new Floor(0, List.of(new Spot("0-S1", SpotSize.SMALL), new Spot("0-M1", SpotSize.MEDIUM))),
                             new Floor(1, List.of(new Spot("1-L1", SpotSize.LARGE))));
Clock clock = Clock.fixed(Instant.parse("2026-11-12T10:00:00Z"), ZoneOffset.UTC);
ParkingService lot = new ParkingService(floors, new NearestSpotStrategy(),
        new HourlyPricing(Map.of(VehicleType.BIKE, 20L, VehicleType.CAR, 50L, VehicleType.TRUCK, 100L)),
        new InMemoryTicketRepository(), clock);
Ticket car = lot.park(new Vehicle("KA01AB1234", VehicleType.CAR));
Ticket bike = lot.park(new Vehicle("KA02X9", VehicleType.BIKE));
System.out.println(car.id() + " -> " + car.spot().id + ", " + bike.id() + " -> " + bike.spot().id);
System.out.println("car fee = Rs " + lot.exit(car.id()));`,
      points: ["A fixed `Clock` makes the demo (and tests) deterministic", "Every collaborator is injected through the constructor: easy to swap in the review", "Note what's *not* here yet: domain exceptions, thread safety, a second pricing rule. Those come next, on top of running code"] },
    { title: "Step 6: add patterns where a requirement asks for variation",
      text: "Now the \"may change\" requirements earn their abstractions. Weekend pricing is another `PricingStrategy`; discounts (EV, members) stack on top of any pricing as a **Decorator**; choosing a rule by date is a small policy object. Every addition is a new class: nothing in `ParkingService` changes (Open/Closed).",
      code: `interface PricingStrategy { long fee(long minutes, LocalDate day); }
class HourlyPricing implements PricingStrategy {
    private final long perHour; HourlyPricing(long perHour) { this.perHour = perHour; }
    public long fee(long minutes, LocalDate day) { return Math.max(1, (minutes + 59) / 60) * perHour; }
}
class FlatPricing implements PricingStrategy {
    private final long flat; FlatPricing(long flat) { this.flat = flat; }
    public long fee(long minutes, LocalDate day) { return flat; }
}
class DiscountedPricing implements PricingStrategy {                      // Decorator: wraps any strategy
    private final PricingStrategy inner; private final int percentOff;
    DiscountedPricing(PricingStrategy inner, int percentOff) { this.inner = inner; this.percentOff = percentOff; }
    public long fee(long minutes, LocalDate day) { return inner.fee(minutes, day) * (100 - percentOff) / 100; }
}
class WeekendAwarePricing implements PricingStrategy {                    // policy: pick a rule by date
    private final PricingStrategy weekday, weekend;
    WeekendAwarePricing(PricingStrategy weekday, PricingStrategy weekend) { this.weekday = weekday; this.weekend = weekend; }
    public long fee(long minutes, LocalDate day) {
        DayOfWeek d = day.getDayOfWeek();
        return (d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY ? weekend : weekday).fee(minutes, day);
    }
}
PricingStrategy car = new WeekendAwarePricing(new HourlyPricing(50), new FlatPricing(120));
PricingStrategy ev = new DiscountedPricing(car, 20);
LocalDate thu = LocalDate.of(2026, 11, 12), sat = LocalDate.of(2026, 11, 14);
System.out.println("car 150 min Thu = " + car.fee(150, thu) + ", Sat = " + car.fee(150, sat));
System.out.println("EV  150 min Thu = " + ev.fee(150, thu) + ", Sat = " + ev.fee(150, sat));`,
      table: [
        ["Requirement smell", "Pattern that usually fits"],
        ["\"different ways to calculate / choose\"", "Strategy"],
        ["\"add-ons that combine\"", "Decorator"],
        ["\"behaves differently in each status\"", "State"],
        ["\"notify X when Y happens\"", "Observer"],
        ["\"undo / queue / log actions\"", "Command"],
        ["\"create one of several types from input\"", "Factory (registry of suppliers)"],
        ["\"approval / filter pipeline\"", "Chain of Responsibility"],
        ["\"one shared instance\"", "Inject a single instance (avoid hand-rolled Singleton)"]],
      points: ["Name the pattern only after it solves a stated problem", "Three patterns used well beat eight used for show"] },
    { title: "Step 7: edge cases, validation and domain exceptions",
      text: "List edge cases per use case and handle them **explicitly**: guard clauses at the boundary, domain exceptions with clear messages (or `Optional`/result types), and invariants inside the models. Show at least one failure in the demo.",
      table: [
        ["Use case", "Edge cases to handle"],
        ["park", "Lot full for that type; null/blank plate; same vehicle parked twice"],
        ["exit", "Unknown ticket; ticket used twice; exit time before entry (clock skew)"],
        ["admin", "Duplicate spot ids; removing an occupied spot"],
        ["pricing", "Zero/partial durations; overnight; missing rate for a type"]],
      code: `class ParkingException extends RuntimeException { ParkingException(String m) { super(m); } }
class LotFullException extends ParkingException { LotFullException(String type) { super("no free spot for " + type); } }
class InvalidTicketException extends ParkingException { InvalidTicketException(String id) { super("unknown or used ticket " + id); } }
class AlreadyParkedException extends ParkingException { AlreadyParkedException(String plate) { super(plate + " is already parked"); } }

class Gate {
    private final Set<String> parked = new HashSet<>(); private final Set<String> open = new HashSet<>();
    private int free; private int seq;
    Gate(int capacity) { free = capacity; }
    String park(String plate) {
        if (plate == null || plate.isBlank()) throw new IllegalArgumentException("plate required");
        if (parked.contains(plate)) throw new AlreadyParkedException(plate);
        if (free == 0) throw new LotFullException("CAR");
        free--; parked.add(plate);
        String id = "T" + (++seq) + ":" + plate; open.add(id); return id;
    }
    void exit(String ticketId) {
        if (!open.remove(ticketId)) throw new InvalidTicketException(ticketId);
        parked.remove(ticketId.substring(ticketId.indexOf(':') + 1)); free++;
    }
}
Gate g = new Gate(1);
String t = g.park("KA01");
for (Runnable r : List.<Runnable>of(() -> g.park("KA01"), () -> g.park("KA02"), () -> g.exit("T9:KA09"))) {
    try { r.run(); } catch (ParkingException e) { System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage()); }
}
g.exit(t);
try { g.exit(t); } catch (ParkingException e) { System.out.println("second exit -> " + e.getMessage()); }`,
      points: ["One base `ParkingException` lets the driver/API layer handle all domain errors in one place", "`IllegalArgumentException` for programmer/input errors, domain exceptions for business rules", "Invariants live in the model (`Spot.occupy()` refuses twice), not only in the service"] },
    { title: "Step 8: concurrency, exactly where state is shared",
      text: "If concurrency is in scope, find the **check-then-act** on shared state. In a parking lot it's \"find a free spot, then occupy it\": two gates can find the same spot. Fix it at that point: an atomic claim (CAS) on the spot, a lock around find+occupy, or a concurrent queue of free spots per size so `poll()` hands each spot to one thread.",
      code: `class Spot {
    final String id; private final AtomicBoolean taken = new AtomicBoolean();
    Spot(String id) { this.id = id; }
    boolean tryClaim() { return taken.compareAndSet(false, true); }        // atomic check-and-act
    void release() { taken.set(false); }
}
class Allocator {
    private final List<Spot> spots;
    Allocator(List<Spot> spots) { this.spots = spots; }
    Optional<Spot> claim() {                                                 // scan, claim atomically; losers move on
        for (Spot s : spots) if (s.tryClaim()) return Optional.of(s);
        return Optional.empty();
    }
}
List<Spot> spots = new ArrayList<>();
for (int i = 0; i < 100; i++) spots.add(new Spot("S" + i));
Allocator alloc = new Allocator(spots);
Set<String> handedOut = ConcurrentHashMap.newKeySet();
AtomicInteger duplicates = new AtomicInteger(), full = new AtomicInteger();
ExecutorService gates = Executors.newFixedThreadPool(8);
List<Future<?>> fs = new ArrayList<>();
for (int i = 0; i < 150; i++) fs.add(gates.submit(() -> {
    Optional<Spot> s = alloc.claim();
    if (s.isEmpty()) full.incrementAndGet();
    else if (!handedOut.add(s.get().id)) duplicates.incrementAndGet();
}));
for (Future<?> f : fs) f.get(); gates.shutdown();
System.out.println("assigned=" + handedOut.size() + " full=" + full.get() + " duplicates=" + duplicates.get());`,
      points: ["Say the race out loud: \"two gates read the same free spot, both occupy it\"", "Keep locks small and on the shared state; never lock the whole service if a per-spot or per-floor claim will do", "Mention the production version: a DB row lock / unique constraint / optimistic version column"] },
    { title: "Step 9: demo, tests and the review conversation",
      text: "Finish with a driver that reads like the requirements: happy path, one variation, one failure. If time allows, a few assertion-style checks. Then **walk the interviewer through it**: the diagram, one request through the code, where each requirement lives, and how you'd extend it.",
      code: `record Result(String name, boolean ok) { }
static Result check(String name, boolean condition) { return new Result(name, condition); }

Map<String, Integer> free = new HashMap<>(Map.of("CAR", 1));
java.util.function.Function<String, String> park = type -> {
    if (free.getOrDefault(type, 0) == 0) return "FULL";
    free.merge(type, -1, Integer::sum); return "OK";
};
List<Result> results = List.of(
    check("first car parks", park.apply("CAR").equals("OK")),
    check("second car sees FULL", park.apply("CAR").equals("FULL")),
    check("unknown type is FULL", park.apply("TRUCK").equals("FULL")));
results.forEach(r -> System.out.println((r.ok() ? "PASS " : "FAIL ") + r.name()));`,
      table: [
        ["Review question", "Good answer shape"],
        ["\"How would you add EV charging spots?\"", "New `SpotSize`/feature flag + allocation strategy that prefers EV spots; no service changes"],
        ["\"Make it multi-lot / distributed\"", "Lot id on every entity; repository backed by a DB; seat-style row locking; IDs from a generator"],
        ["\"Why this pattern here?\"", "Name the requirement it serves and the change it absorbs"],
        ["\"What would you test first?\"", "Allocation rules, pricing boundaries (59/60/61 min), double exit, full lot, concurrent park"],
        ["\"What would you change with more time?\"", "Be honest: e.g. extract a payment port, add an observer for display boards"]],
      points: ["Run the demo live; don't just describe it", "Mention tests you'd write even if you only had time for a driver", "Admit shortcuts explicitly (\"in-memory, single JVM\"); hidden shortcuts read as gaps"] },
    { title: "Reusable skeleton for any prompt",
      text: "The same skeleton fits most prompts: swap the nouns. Memorise the order, not the code.",
      table: [
        ["Prompt", "Core entities", "Axes of change (interfaces)", "State machine?", "Concurrency hotspot"],
        ["Parking lot", "Lot, Floor, Spot, Ticket", "Allocation, pricing", "Spot free/taken", "Claiming a spot"],
        ["Splitwise", "User, Group, Expense, Split", "Split type", "No", "Balance updates"],
        ["Vending machine", "Machine, Slot, Product, Coin", "Payment", "Idle → HasMoney → Dispensing", "One customer at a time"],
        ["BookMyShow", "Show, Seat, Booking", "Pricing, payment", "Seat available → held → booked", "Holding seats"],
        ["Rate limiter", "Limiter, Rule, Bucket", "Algorithm", "No", "Per-key counters"],
        ["Elevator", "Car, Request, Dispatcher", "Dispatch policy", "Idle/Moving/DoorsOpen", "Request queues"]],
      points: ["model / repository / strategy / service / driver, in that order", "Enums for closed sets, interfaces for open ones, records for values", "One working slice first; then variation; then edge cases; then concurrency"] }
  ];

  H.registerLesson({
    code: "F32",
    summary: "A repeatable playbook for the 60–120 minute machine-coding round: what interviewers grade, how to budget the time, how to turn a one-line prompt into agreed requirements, nouns-to-classes modelling, a five-minute class diagram, a model/repository/strategy/service/driver layout, coding the happy path first, adding patterns only where a requirement asks for variation, edge cases with domain exceptions, fixing the one real race condition, and running the demo and review. One worked example (a parking lot) goes through every step in compiling Java.",
    slides: SLIDES,
    widget: { heading: "Interactive: plan the round, then make the right call", caption: "Part 1 budgets 90 minutes and flags risky plans. Part 2 has ten mid-round situations; pick your next move. Your answers are saved.", render: widget },
    examplesHeading: "Prompts this playbook fits",
    examples: [
      ["Games", "Tic-Tac-Toe, Snake & Ladder, Chess: board + players + turn loop + rules as strategies; win checks are the edge cases."],
      ["Booking systems", "BookMyShow, hotel, meeting rooms, cab booking: inventory over time, holds, and a concurrency hotspot on claiming a slot."],
      ["State machines", "Vending machine, ATM, elevator, order lifecycle: model states explicitly; invalid transitions are the edge cases."],
      ["Infrastructure components", "LRU cache, rate limiter, logger, pub-sub, task scheduler: data structures + concurrency + a pluggable policy."],
      ["Money and ledgers", "Splitwise, wallet, expense approval: integer paise, validation, and simplification algorithms."]
    ],
    pitfalls: [
      "Spending 30+ minutes on requirements and diagrams, then running out of time to code",
      "Starting to code before agreeing what \"done\" means",
      "A god class (`ParkingLotManager`) holding every rule; logic in `main`",
      "Pattern-stuffing: factories and builders nobody needed; or `switch` on type strings where a strategy was asked for",
      "Public mutable fields and setters everywhere (no invariants)",
      "Never running the code until the end; one compile error breaks the demo",
      "Ignoring the concurrency requirement, or locking the whole service when a per-item claim suffices",
      "Silently cutting scope instead of saying what you skipped and how it would plug in",
      "Using `double` for money; time from `Instant.now()` everywhere (untestable)"
    ],
    quiz: [
      { q: "You have 90 minutes. Roughly how much should go to coding (core + edge cases)?", options: ["15–20 min", "30 min", "55–65 min", "All 90"], answer: 2, why: "Clarify and design in ~15–20, demo in ~10; the rest is code." },
      { q: "The prompt is just \"Design a parking lot\". First move?", options: ["Open the IDE and write `class ParkingLot`", "Ask about vehicle types, pricing, gates/concurrency and what's out of scope", "Draw a full UML diagram with every getter", "Pick a database"], answer: 1, why: "Agree on scope; write it down as the contract." },
      { q: "Where should interfaces go in your design?", options: ["On every class", "Nowhere; they slow you down", "Where requirements say something varies or will change, plus storage boundaries", "Only on the main class"], answer: 2, why: "Abstractions at the axes of change and at repositories." },
      { q: "When should you introduce the Decorator for EV discounts?", options: ["Before writing anything else", "When a requirement asks for add-ons that combine with any pricing", "Never in a machine-coding round", "Only if the interviewer names it"], answer: 1, why: "Patterns earn their place by absorbing a stated change." },
      { q: "How should the service get the current time?", options: ["`System.currentTimeMillis()` inline", "An injected `Clock`", "A static global", "Ask the user"], answer: 1, why: "Deterministic demos and tests." },
      { q: "Two gates can be assigned the same spot. The minimal correct fix?", options: ["`synchronized` on every service method and the repository", "Make the claim atomic at the spot (CAS) or lock around find+occupy", "Add `volatile` to the spot list", "Sleep randomly between find and occupy"], answer: 1, why: "Fix the check-then-act exactly where the shared state is." },
      { q: "You're 10 minutes from the end and payments aren't done.", options: ["Rush them in untested", "Say it's out of scope for now, show the `PaymentGateway` interface where it would plug in, and run the demo", "Delete the demo to save time", "Stay silent"], answer: 1, why: "Explicit scope cuts with a plug-in point read as judgement." },
      { q: "Which layout is most expected?", options: ["Everything in `main`", "model / repository / strategy / service / driver", "One class per method", "Controllers and JSP"], answer: 1, why: "Predictable, testable, easy to review." }
    ],
    cheatsheet: {
      table: [
        ["Phase", "Minutes (of 90)", "Output"],
        ["Clarify", "5–10", "MUST / NICE / OUT list + assumptions comment"],
        ["Model", "5–10", "Entities, relationships, interfaces (diagram outline)"],
        ["Core flow", "35–45", "Happy path runs from `main`"],
        ["Harden", "10–20", "Edge cases, domain exceptions, requested pattern(s), concurrency fix"],
        ["Demo + review", "5–10", "Live run, walk-through, extensions, trade-offs"]],
      cards: [
        { title: "Clarifying questions", items: ["Actors and use cases", "What varies / will change", "Rules and limits", "Concurrency / scale", "Out of scope", "Example input → output"] },
        { title: "Code checklist", items: ["Enums, records, interfaces", "Constructor injection", "Injected `Clock`, ID generator", "Integer money", "Domain exceptions", "No public mutable fields"] },
        { title: "Review lines", items: ["\"This interface absorbs …\"", "\"The race is … fixed by …\"", "\"I skipped … it plugs in at …\"", "\"I'd test … first\""] }]
    },
    practice: [
      { level: "Easy", q: "Write the clarifying questions (and the scope comment) for \"Design Splitwise\".",
        a: ["Split types needed: equal, exact amounts, percentages? Shares?", "Groups and individual expenses? Multiple currencies?", "Should balances be simplified (minimum transfers)?", "Who can add/edit/delete expenses; is history needed?", "Concurrency: many users adding expenses at once?", "Out of scope: payments, notifications, auth, persistence."],
        code: `/*
 * Splitwise: agreed scope
 * MUST: users, groups; add expense (payer, amount in paise, split EQUAL/EXACT/PERCENT);
 *       show balances per user; simplify debts within a group.
 * NICE: edit/delete expense, activity log.
 * OUT:  payments, currencies, auth, persistence.
 * ASSUMPTIONS: rounding remainder goes to the payer's share.
 */`, lang: "text", noCompile: true,
        follow: "Which of these questions changes your class design the most? (Split types: they become a `SplitStrategy` per type.)" },
      { level: "Easy", q: "List the entities, value objects and interfaces for a library management system using nouns → classes, verbs → methods.",
        a: ["Entities: `Book` (ISBN, title, author), `BookCopy` (barcode, status), `Member`, `Loan`, `Reservation`.", "Values/enums: `CopyStatus`, `Money` for fines, `LoanPeriod`.", "Services: `LendingService.checkout(member, barcode)`, `.returnCopy(barcode)`, `SearchService.byTitle()`.", "Interfaces (vary): `FinePolicy`, repositories (`BookRepository`, `LoanRepository`), `Notifier` for reservation alerts."],
        follow: "Why separate `Book` from `BookCopy`? (Many physical copies share one catalogue record; status belongs to the copy.)" },
      { level: "Medium", q: "Budget a 60-minute round (not 90). What do you cut, and what never gets cut?",
        steps: [["Clarify: 5 min", "Fewer questions; state assumptions faster."], ["Model: 5 min", "Entity list + interfaces in comments instead of a drawn diagram."], ["Core: 30 min", "Happy path only, one implementation per interface."], ["Harden: 12 min", "Top 2–3 edge cases and the requested concurrency fix."], ["Demo: 8 min", "Run it and explain one extension."]],
        follow: "Never cut: agreed scope, a running happy path, and the demo." },
      { level: "Medium", q: "Refactor this god method so a new vehicle type or pricing rule doesn't require editing it.",
        qcode: `long fee(String type, long minutes, boolean weekend, boolean ev) {
    long h = Math.max(1, (minutes + 59) / 60), base;
    if (type.equals("BIKE")) base = weekend ? 30 : h * 20;
    else if (type.equals("CAR")) base = weekend ? 120 : h * 50;
    else base = h * 100;
    if (ev) base = base * 80 / 100;
    return base;
}`,
        code: `enum VehicleType { BIKE, CAR, TRUCK }
interface Pricing { long fee(long minutes); }
record Hourly(long perHour) implements Pricing { public long fee(long m) { return Math.max(1, (m + 59) / 60) * perHour; } }
record Flat(long amount) implements Pricing { public long fee(long m) { return amount; } }
record Discount(Pricing inner, int pctOff) implements Pricing { public long fee(long m) { return inner.fee(m) * (100 - pctOff) / 100; } }
class PricingPolicy {
    private final Map<VehicleType, Pricing> weekday, weekend;
    PricingPolicy(Map<VehicleType, Pricing> weekday, Map<VehicleType, Pricing> weekend) { this.weekday = weekday; this.weekend = weekend; }
    Pricing forVehicle(VehicleType t, boolean isWeekend, boolean ev) {
        Pricing p = (isWeekend ? weekend : weekday).getOrDefault(t, weekday.get(t));
        return ev ? new Discount(p, 20) : p;
    }
}
PricingPolicy policy = new PricingPolicy(
    Map.of(VehicleType.BIKE, new Hourly(20), VehicleType.CAR, new Hourly(50), VehicleType.TRUCK, new Hourly(100)),
    Map.of(VehicleType.BIKE, new Flat(30), VehicleType.CAR, new Flat(120)));
System.out.println(policy.forVehicle(VehicleType.CAR, false, false).fee(150));   // 150
System.out.println(policy.forVehicle(VehicleType.CAR, true, true).fee(150));     // 96
System.out.println(policy.forVehicle(VehicleType.TRUCK, true, false).fee(61));   // 200`,
        follow: "Rates are now data (a map built from config); new types or rules are new entries or classes, and `fee` code never changes." },
      { level: "Medium", q: "Draw the class-diagram outline for a vending machine before coding. Which pattern carries the design?",
        m: H.cd(["classDiagram",
          "  class VendingMachine { -State state; -Inventory inventory; -int balance; +insert(Coin c); +select(String code); +cancel() }",
          "  class State { <<interface>>; +insert(VendingMachine m, Coin c); +select(VendingMachine m, String code); +cancel(VendingMachine m) }",
          "  class Inventory { -Map~String,Slot~ slots; +take(String code) Product }",
          "  class Slot { -Product product; -int count }",
          "  VendingMachine --> State",
          "  VendingMachine *-- Inventory",
          "  Inventory *-- Slot",
          "  State <|.. IdleState",
          "  State <|.. HasMoneyState",
          "  State <|.. SoldOutState"]),
        a: ["State pattern: each state handles `insert/select/cancel` and decides the next state.", "`Coin` enum for denominations; integer paise for money.", "Change-making and refunds are edge cases for the hardening phase."] },
      { level: "Medium", q: "Your BookMyShow solution must not double-book a seat. Where's the race and what's your in-memory fix?",
        code: `enum SeatStatus { AVAILABLE, HELD, BOOKED }
class ShowSeats {
    private final Map<String, SeatStatus> seats = new HashMap<>(); private final Map<String, String> holder = new HashMap<>();
    ShowSeats(List<String> ids) { ids.forEach(id -> seats.put(id, SeatStatus.AVAILABLE)); }
    synchronized boolean hold(String user, List<String> ids) {             // all-or-nothing under one lock per show
        for (String id : ids) if (seats.get(id) != SeatStatus.AVAILABLE) return false;
        for (String id : ids) { seats.put(id, SeatStatus.HELD); holder.put(id, user); }
        return true;
    }
    synchronized void confirm(String user, List<String> ids) {
        for (String id : ids) if (!user.equals(holder.get(id))) throw new IllegalStateException("not your hold: " + id);
        ids.forEach(id -> seats.put(id, SeatStatus.BOOKED));
    }
}
ShowSeats show = new ShowSeats(List.of("A1", "A2", "A3"));
ExecutorService pool = Executors.newFixedThreadPool(2);
Future<Boolean> u1 = pool.submit(() -> show.hold("asha", List.of("A1", "A2")));
Future<Boolean> u2 = pool.submit(() -> show.hold("ravi", List.of("A2", "A3")));
System.out.println("asha=" + u1.get() + " ravi=" + u2.get() + " (exactly one wins A2)");
pool.shutdown();`,
        follow: "The race is check-all-available then mark-held across several seats. A per-show lock makes it atomic; in a DB, `SELECT … FOR UPDATE` or a conditional update with a version column does the same. Add a hold expiry for abandoned checkouts." },
      { level: "Hard", q: "You have 15 minutes left and three things undone: concurrency (a MUST), a second pricing rule (NICE) and unit tests. What do you do, in order?",
        a: ["1. Concurrency: it's a MUST and usually a small, targeted change (atomic claim or one lock). Add a quick multi-thread demo.", "2. Run the full demo end to end; fix anything broken.", "3. Say explicitly: \"The second pricing rule is a new `PricingStrategy` class; here's where it plugs in\" (maybe write the 6-line class if time).", "4. Tests: describe the first five you'd write; the driver is your smoke test.", "Throughout: keep the build green; commit mentally to stopping new features at T-5 minutes."] },
      { level: "Hard", q: "The interviewer asks: \"How would this design change for 100 parking lots and a mobile app?\" Answer in the review.",
        a: ["Domain stays: entities, strategies and services don't change; add `lotId` to `Spot`, `Ticket` and repositories.", "Repositories move from in-memory to a database behind the same interfaces; spot claims become row-level locks or conditional updates.", "Ticket IDs from a distributed generator (Snowflake-style), not a counter.", "Expose services through an API layer (controllers translate DTOs → service calls).", "Display boards and the app subscribe to spot events (Observer → message broker).", "Point out what stays the same: that's the payoff of the interfaces you introduced."] },
      { level: "Easy", q: "Name five things a reviewer will read in your code in the first two minutes.",
        a: ["Class names and package/section layout: do they mirror the domain?", "Size of the biggest class (god class?)", "Field visibility and mutability (private/final, records)", "How variation is handled (`switch` on strings vs interfaces)", "Whether `main` reads like the requirements and actually runs"] }
    ],
    recap: [
      "Machine-coding rounds grade working code first, then modelling, extensibility, correctness, concurrency and communication.",
      "Budget the time: clarify 5–10, model 5–10, core 35–45, harden 10–20, demo 5–10. Keep a running build at each checkpoint.",
      "Write the agreed scope (MUST / NICE / OUT + assumptions) as a comment; it's your contract and demo script.",
      "Nouns → classes, verbs → methods, varying things → interfaces; enums for closed sets, records for values.",
      "Code the happy path end to end first; add patterns only where a requirement asks for variation.",
      "Handle edge cases with domain exceptions; fix the one real race at the shared state; demo live and explain extensions."
    ]
  });
})();
