/* Lesson F02: SOLID principles (SRP, OCP, LSP, ISP, DIP), with before/after designs in Java */
(function () {
  "use strict";
  var H = window.LLD, esc = H.esc;
  function M(lines) { return lines.join("\n"); }
  var BAD = "  style {X} stroke:#dc2626,stroke-width:2px";
  function bad(name) { return BAD.replace("{X}", name); }

  var SLIDES = [
    { title: "What SOLID is, and why interviewers care",
      text: "SOLID is five design principles, collected by Robert C. Martin around 2000 (the acronym came from Michael Feathers), for keeping object-oriented code **easy to change**. In an LLD round the interviewer usually adds a requirement halfway through. A SOLID design absorbs it by *adding* a class; a fragile one forces you to edit, and re-test, code that already works.",
      points: [
        "**S**ingle Responsibility: a class should have one reason to change (one actor it answers to)",
        "**O**pen/Closed: open for extension, closed for modification",
        "**L**iskov Substitution: a subtype must be usable anywhere its base type is expected",
        "**I**nterface Segregation: clients shouldn't depend on methods they don't use",
        "**D**ependency Inversion: high-level policy and low-level details both depend on abstractions",
        "Symptoms they fight: *rigidity* (one change cascades), *fragility* (changes break far-away code), *immobility* (you can't reuse a part without dragging everything along)"],
      analogy: "A well-run hospital. Each department has one job (SRP). A new specialty adds a wing rather than rebuilding the building (OCP). Any qualified nurse can cover a shift (LSP). Visitors get a visitor pass, not the master key (ISP). Doctors order \"a blood test\", not \"Ravi in lab 3\" (DIP).",
      m: M(["flowchart LR",
        "  G([\"<b>Goal</b><br/><span class='d'>change one thing, touch one place</span>\"])",
        "  S[\"<b>SRP</b><br/><span class='d'>one reason to change</span>\"]:::s0",
        "  O[\"<b>OCP</b><br/><span class='d'>extend by adding code</span>\"]:::s0",
        "  L[\"<b>LSP</b><br/><span class='d'>subtypes keep promises</span>\"]:::s1",
        "  I[\"<b>ISP</b><br/><span class='d'>small, client-shaped interfaces</span>\"]:::s1",
        "  D[\"<b>DIP</b><br/><span class='d'>depend on abstractions</span>\"]:::s2",
        "  G --> S", "  G --> O", "  G --> L", "  G --> I", "  G --> D",
        "  L -. \"safe polymorphism makes\" .-> O",
        "  D -. \"injected abstractions enable\" .-> O"]) },

    /* ---------------- SRP ---------------- */
    { title: "SRP, the violation: one class, four bosses",
      text: "The **Single Responsibility Principle**: *a class should have one, and only one, reason to change.* Martin later restated it as *a module should be responsible to one actor*, meaning one group of people who request changes. `OrderService` below answers to the product team (validation), finance (pricing), the DBAs (SQL) and marketing (emails). A change for any of them risks breaking the others.",
      points: [
        "Count the reasons to change: validation rules, discount rules, the database schema or driver, and email wording are four reasons",
        "To unit-test the discount you need a live database and an email side effect",
        "Two developers editing different features collide in the same file and merge conflicts follow",
        "Smells: names like `Manager`, `Processor` or `Util`; methods with `and` in their name; many unrelated imports (`java.sql` *and* mail *and* PDF)"],
      analogy: "A Swiss Army knife is handy on a hike, but a chef wouldn't use one in a kitchen. When the corkscrew breaks, the whole tool goes to repair, knife included.",
      m: M(["classDiagram",
        "  class OrderService {",
        "    +placeOrder(Order o) void",
        "    -validate() product team",
        "    -applyDiscount() finance",
        "    -insertRow() DBA",
        "    -sendMail() marketing",
        "  }",
        "  OrderService ..> Connection : java.sql",
        "  OrderService ..> SmtpClient : mail",
        "  OrderService ..> Order",
        bad("OrderService")]),
      code: `public class OrderService {
    private static final String DB_URL = "jdbc:mysql://db/shop";

    public void placeOrder(Order order) {
        // 1. validation rules (product team)
        if (order.items().isEmpty()) throw new IllegalArgumentException("empty order");

        // 2. pricing rules (finance)
        long total = 0;
        for (OrderItem i : order.items()) total += i.unitPrice() * i.qty();
        if (total > 100_000) total = total * 90 / 100;           // 10% off above Rs 1,000

        // 3. persistence (DBA / infra)
        try (Connection c = DriverManager.getConnection(DB_URL);
             PreparedStatement ps = c.prepareStatement("INSERT INTO orders(id, total) VALUES (?, ?)")) {
            ps.setString(1, order.id());
            ps.setLong(2, total);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }

        // 4. notification (marketing)
        System.out.println("Mail to " + order.customerEmail() + ": your total is " + total);
    }
}` },

    { title: "SRP, the refactor: one reason to change per class",
      text: "Split along the axes of change. Each rule moves to a class that one actor owns, and `OrderService` becomes a thin **orchestrator** that reads like the use case. Persistence and notification sit behind interfaces, so tests can use in-memory fakes.",
      points: [
        "Finance changes the discount, so only `PriceCalculator` changes, and it can be tested with plain objects",
        "Moving from MySQL to DynamoDB means a new `OrderRepository` implementation; nothing else is touched",
        "**In a machine-coding round:** keep *models* (Order, Ticket, Spot), *services* (use-case orchestration), *repositories* (storage) and *strategies* (rules) in separate classes. Interviewers read this as clean layering",
        "**Parking lot example:** `ParkingLot` shouldn't compute fees, print receipts *and* send SMS; give that work to `FeeCalculator`, `ReceiptPrinter` and `Notifier`",
        "**Pitfall:** SRP is not \"one method per class\". A class with ten cohesive methods about one concept (`Money`, `Board`) is fine; ten classes of one method each is fragmentation",
        "**Pitfall:** splitting by technical layer only (all validation for all features in one giant `Validator`) creates a new god class"],
      m: M(["classDiagram",
        "  direction LR",
        "  class OrderService {",
        "    +placeOrder(Order o) long",
        "  }",
        "  class OrderValidator {",
        "    +validate(Order o) void",
        "  }",
        "  class PriceCalculator {",
        "    +total(Order o) long",
        "  }",
        "  class OrderRepository {",
        "    <<interface>>",
        "    +save(Order o, long total) void",
        "  }",
        "  class OrderNotifier {",
        "    <<interface>>",
        "    +orderPlaced(Order o, long total) void",
        "  }",
        "  OrderService --> OrderValidator",
        "  OrderService --> PriceCalculator",
        "  OrderService --> OrderRepository",
        "  OrderService --> OrderNotifier",
        "  OrderRepository <|.. JdbcOrderRepository",
        "  OrderNotifier <|.. EmailOrderNotifier"]),
      code: `public class OrderValidator {
    public void validate(Order o) {
        if (o.items().isEmpty()) throw new IllegalArgumentException("empty order");
    }
}

public class PriceCalculator {                                    // owned by finance
    public long total(Order o) {
        long total = o.items().stream().mapToLong(i -> i.unitPrice() * i.qty()).sum();
        return total > 100_000 ? total * 90 / 100 : total;
    }
}

public interface OrderRepository { void save(Order o, long total); }       // owned by infra
public interface OrderNotifier   { void orderPlaced(Order o, long total); } // owned by marketing

public class OrderService {                       // orchestrates; each rule lives elsewhere
    private final OrderValidator validator;
    private final PriceCalculator pricing;
    private final OrderRepository repo;
    private final OrderNotifier notifier;

    public OrderService(OrderValidator validator, PriceCalculator pricing,
                        OrderRepository repo, OrderNotifier notifier) {
        this.validator = validator;
        this.pricing = pricing;
        this.repo = repo;
        this.notifier = notifier;
    }

    public long placeOrder(Order order) {
        validator.validate(order);
        long total = pricing.total(order);
        repo.save(order, total);
        notifier.orderPlaced(order, total);
        return total;
    }
}` },

    /* ---------------- OCP ---------------- */
    { title: "OCP, the violation: edit the switch for every new rule",
      text: "The **Open/Closed Principle** (Bertrand Meyer, 1988): *software entities should be open for extension but closed for modification.* You should be able to add behaviour without editing code that already works and is tested. Every new discount below means opening `DiscountService` again, touching every branch, and re-testing all of them.",
      points: [
        "The same `switch (customer.type())` usually reappears in pricing, invoices and loyalty points: shotgun surgery",
        "A requirement like \"Diwali sale: an extra 5% for everyone, stacking with other discounts\" doesn't fit a one-type switch at all",
        "Every edit to a shared class risks regressions in the branches you didn't mean to change",
        "Smells: `switch` or `if/else if` chains on a type code or `instanceof`; a method that grows by one `case` per release"],
      analogy: "A power strip. To use a new appliance you plug it in; you don't rewire the strip. The sockets are the extension point.",
      m: M(["classDiagram",
        "  class DiscountService {",
        "    +discount(Cart cart) long",
        "    switch REGULAR / PREMIUM / EMPLOYEE",
        "  }",
        "  class CustomerType {",
        "    <<enumeration>>",
        "    REGULAR",
        "    PREMIUM",
        "    EMPLOYEE",
        "  }",
        "  DiscountService ..> CustomerType : switches on",
        "  DiscountService ..> Cart",
        bad("DiscountService")]),
      code: `public class DiscountService {
    public long discount(Cart cart) {
        switch (cart.customer().type()) {
            case REGULAR:  return 0;
            case PREMIUM:  return cart.subtotal() * 10 / 100;
            case EMPLOYEE: return cart.subtotal() * 30 / 100;
            default: throw new IllegalStateException("unknown type");
        }
        // New requirement: "festival sale, 5% off for everyone, stacked".
        // Means editing this method again, re-testing every branch, redeploying.
    }
}` },

    { title: "OCP, the refactor: plug in new rules",
      text: "Find the **axis of variation** (here: discount rules) and put an abstraction there. Each rule becomes a class, and the service just applies whatever list of rules it is given. A new rule is a new class plus one line of wiring. `DiscountService` itself is never edited again.",
      points: [
        "Closed against *which* changes? OCP protects you only along the axis you predicted. Pick the axes the requirements hint at: pricing, allocation, payment, notification channels",
        "Wiring (the `main` or a factory that builds the rule list) is *expected* to change; it's the one place that knows the concrete classes",
        "Patterns that deliver OCP: Strategy (F17), Decorator (F11), Observer (F18), Chain of Responsibility (F22), Template Method (F21)",
        "**In a machine-coding round:** the interviewer's \"now add EV charging spots\" or \"add a percentage split\" is an OCP test. Answer: \"that's a new `SplitStrategy` class; nothing else changes\"",
        "**Pitfall:** OCP isn't \"never edit a file\". Bug fixes and refactors are fine. The goal is that *new features* arrive mostly as *new code*",
        "**Pitfall:** abstracting axes that never vary (YAGNI). Wait for the first or second real variation, or a clear hint from the interviewer"],
      m: M(["classDiagram",
        "  direction LR",
        "  class DiscountService {",
        "    -List~DiscountRule~ rules",
        "    +discount(Cart cart) long",
        "  }",
        "  class DiscountRule {",
        "    <<interface>>",
        "    +discountFor(Cart cart) long",
        "  }",
        "  class FestivalSaleRule {",
        "    -LocalDate from",
        "    -LocalDate to",
        "    +discountFor(Cart cart) long",
        "  }",
        "  DiscountService o-- \"many\" DiscountRule",
        "  DiscountRule <|.. PremiumMemberRule",
        "  DiscountRule <|.. EmployeeRule",
        "  DiscountRule <|.. FestivalSaleRule",
        "  style FestivalSaleRule stroke:#15803d,stroke-width:2px"]),
      code: `public interface DiscountRule {
    long discountFor(Cart cart);                       // 0 when the rule doesn't apply
}

public class PremiumMemberRule implements DiscountRule {
    public long discountFor(Cart c) {
        return c.customer().type() == CustomerType.PREMIUM ? c.subtotal() * 10 / 100 : 0;
    }
}

public class EmployeeRule implements DiscountRule {
    public long discountFor(Cart c) {
        return c.customer().type() == CustomerType.EMPLOYEE ? c.subtotal() * 30 / 100 : 0;
    }
}

public class FestivalSaleRule implements DiscountRule {   // NEW: added, nothing edited
    private final LocalDate from, to;
    public FestivalSaleRule(LocalDate from, LocalDate to) { this.from = from; this.to = to; }

    public long discountFor(Cart c) {
        boolean inSale = !c.date().isBefore(from) && !c.date().isAfter(to);
        return inSale ? c.subtotal() * 5 / 100 : 0;
    }
}

public class DiscountService {                            // closed: never edited for new rules
    private final List<DiscountRule> rules;
    public DiscountService(List<DiscountRule> rules) { this.rules = List.copyOf(rules); }

    public long discount(Cart cart) {
        long total = rules.stream().mapToLong(r -> r.discountFor(cart)).sum();
        return Math.min(total, cart.subtotal());          // never discount below zero
    }
}

// Wiring: the one place that changes when a rule is added
DiscountService discounts = new DiscountService(List.of(
        new PremiumMemberRule(), new EmployeeRule(),
        new FestivalSaleRule(LocalDate.of(2026, 10, 20), LocalDate.of(2026, 11, 5))));` },

    /* ---------------- LSP ---------------- */
    { title: "LSP, the violation: Square extends Rectangle",
      text: "The **Liskov Substitution Principle** (Barbara Liskov, 1987): *if S is a subtype of T, objects of type T may be replaced with objects of type S without breaking the program.* Inheritance must model *behaviour*, not just a geometry-textbook \"is-a\". The `Rectangle` contract says width and height change independently; `Square` silently breaks that contract.",
      points: [
        "`resize()` was written and tested against `Rectangle`. Pass it a `Square` and the assertion fails, with no compile error and no exception, just a wrong answer",
        "The bug appears in *client* code that did nothing wrong, which makes LSP violations expensive to find",
        "A tell-tale sign: clients start writing `if (r instanceof Square)`, which also violates OCP",
        "A square *is* a rectangle mathematically, but a *mutable* square is not a substitutable *mutable* rectangle"],
      analogy: "A rubber duck looks like a duck and quacks if you squeeze it, but put it on a pond and expect it to fly south. If it needs batteries to behave like a duck, you probably have the wrong abstraction.",
      m: M(["classDiagram",
        "  class Rectangle {",
        "    #int width",
        "    #int height",
        "    +setWidth(int w) void",
        "    +setHeight(int h) void",
        "    +area() int",
        "  }",
        "  class Square {",
        "    +setWidth(int w) void  sets both",
        "    +setHeight(int h) void  sets both",
        "  }",
        "  Rectangle <|-- Square",
        "  Client ..> Rectangle : resize(r) expects area 20",
        bad("Square")]),
      code: `public class Rectangle {
    protected int width, height;
    public void setWidth(int w)  { this.width = w; }
    public void setHeight(int h) { this.height = h; }
    public int area() { return width * height; }
}

public class Square extends Rectangle {
    @Override public void setWidth(int w)  { this.width = w; this.height = w; }   // keeps it square...
    @Override public void setHeight(int h) { this.width = h; this.height = h; }   // ...breaks the contract
}

// Client code, written and tested against Rectangle
static void resize(Rectangle r) {
    r.setWidth(5);
    r.setHeight(4);
    if (r.area() != 20) throw new AssertionError("expected 20 but got " + r.area());
}

resize(new Rectangle());   // fine
resize(new Square());      // AssertionError: expected 20 but got 16` },

    { title: "LSP, the refactor: model behaviour, not taxonomy",
      text: "Fix the abstraction rather than patching the subclass. Put the shapes behind a common `Shape` interface with only the operations *every* shape can honour, and make them **immutable**. With no setters there's no width-and-height-change-independently promise to break, and \"resize\" returns a new object.",
      points: [
        "`Shape` promises only `area()`, a promise both shapes keep, so any client of `Shape` works with either",
        "If you need resizing, put it where it's valid: `Rectangle.withSize(w, h)` returns a `Rectangle`; `Square.withSide(s)` returns a `Square`",
        "Interesting nuance: with *immutable* types, `Square` could even extend `Rectangle` safely, since no client can observe the broken promise. Mutability is what made the original subclass unsafe",
        "Fixes in order of preference: (1) redesign the hierarchy so the base promises less, (2) composition instead of inheritance, (3) split interfaces (ISP)",
        "**Never** \"fix\" LSP by adding `instanceof` checks in clients; that moves the bug and violates OCP"],
      m: M(["classDiagram",
        "  direction LR",
        "  class Shape {",
        "    <<interface>>",
        "    +area() int",
        "  }",
        "  class Rectangle {",
        "    <<record>>",
        "    +int width",
        "    +int height",
        "    +withSize(int w, int h) Rectangle",
        "  }",
        "  class Square {",
        "    <<record>>",
        "    +int side",
        "    +withSide(int s) Square",
        "  }",
        "  Shape <|.. Rectangle",
        "  Shape <|.. Square",
        "  Client ..> Shape : area() only"]),
      code: `public sealed interface Shape permits Rectangle, Square {
    int area();
}

public record Rectangle(int width, int height) implements Shape {
    public int area() { return width * height; }
    public Rectangle withSize(int w, int h) { return new Rectangle(w, h); }
}

public record Square(int side) implements Shape {
    public int area() { return side * side; }
    public Square withSide(int s) { return new Square(s); }
}

// Every client of Shape now works with every shape
static int totalArea(List<Shape> shapes) {
    return shapes.stream().mapToInt(Shape::area).sum();
}

totalArea(List.of(new Rectangle(5, 4), new Square(4)));   // 36` },

    { title: "LSP in practice: the contract rules",
      text: "LSP is really about **contracts**: what a method requires (preconditions), what it guarantees (postconditions) and what always stays true (invariants). A subtype may accept *more* and promise *more*, but never accept less or promise less. Java's compiler enforces part of this for you; the rest is up to you.",
      points: [
        "Penguin below: `Bird.fly()` promises flight; `Penguin.fly()` throws. Every `for (Bird b : flock) b.fly()` loop now has a landmine",
        "The fix is ISP plus composition: `fly()` lives in a `Flyer` capability that only flying birds implement",
        "Throwing `UnsupportedOperationException` from an override is the most common LSP violation in interviews",
        "Java enforces part of LSP: an override can't reduce visibility, can't throw *broader* checked exceptions, and can return a narrower (covariant) type",
        "The JDK's own compromise: `List.add()` is documented as an *optional operation*, so `List.of(1, 2).add(3)` throws. It's legal by the contract, but it shifts the risk to every client (Kotlin splits `List` and `MutableList` for this reason)"],
      table: [
        ["Rule", "A subtype may…", "A subtype must not…", "Violation example"],
        ["Preconditions", "accept *more* inputs", "demand more (stronger checks)", "`BulkOrderProcessor.process()` rejects orders with fewer than 10 items"],
        ["Postconditions", "guarantee *more*", "guarantee less", "A cache whose `get()` may return stale data when the base promised fresh data"],
        ["Invariants", "add its own", "break the parent's", "`Square` breaking \"width and height are independent\""],
        ["Exceptions", "throw fewer or narrower ones", "throw new kinds callers don't expect", "`Penguin.fly()` throws `UnsupportedOperationException`"],
        ["History", "add new state", "allow changes the base forbids", "A `MutablePoint` subclass of an immutable `Point`"]],
      code: `// VIOLATION: the base type promises something not every subtype can do
abstract class Bird {
    abstract void eat();
    abstract void fly();
}
class Penguin extends Bird {
    void eat() { System.out.println("fish"); }
    void fly() { throw new UnsupportedOperationException("penguins can't fly"); }   // LSP broken
}

// FIX: promise only what's universal; capabilities become separate interfaces
interface Animal { void eat(); }
interface Flyer  { void fly(); }
interface Swimmer { void swim(); }

record Sparrow() implements Animal, Flyer {
    public void eat() { System.out.println("seeds"); }
    public void fly() { System.out.println("flap flap"); }
}
record Emperor() implements Animal, Swimmer {
    public void eat()  { System.out.println("fish"); }
    public void swim() { System.out.println("dive"); }
}

static void migrate(List<? extends Flyer> flock) { flock.forEach(Flyer::fly); }   // can't receive a penguin` },

    /* ---------------- ISP ---------------- */
    { title: "ISP, the violation: the fat interface",
      text: "The **Interface Segregation Principle**: *clients should not be forced to depend on methods they do not use.* A \"one interface for every device\" design forces a basic printer to implement scan, fax and staple with throwing stubs (an LSP violation in waiting), and forces every client that only prints to recompile when the fax signature changes.",
      points: [
        "Stub methods that throw or do nothing are the clearest ISP smell, and an LSP smell too",
        "`PayslipService` only prints, but it depends on all four methods; mocking it in tests means stubbing all four",
        "Fat interfaces grow: each new device feature lands on *everyone*",
        "Smells: interface names like `IManager` or `Operations`, more than 6–8 loosely related methods, implementors with empty methods"],
      analogy: "A restaurant menu. A vegetarian diner gets the veg page, not a 40-page book they have to search. And when the meat supplier changes, the veg page doesn't need reprinting.",
      m: M(["classDiagram",
        "  class MultiFunctionDevice {",
        "    <<interface>>",
        "    +print(Document d) void",
        "    +scan(Document d) Image",
        "    +fax(Document d, String no) void",
        "    +staple(Document d) void",
        "  }",
        "  class BasicInkjet {",
        "    +print(Document d) void",
        "    +scan() throws Unsupported",
        "    +fax() throws Unsupported",
        "    +staple() throws Unsupported",
        "  }",
        "  MultiFunctionDevice <|.. BasicInkjet",
        "  MultiFunctionDevice <|.. OfficeMfp",
        "  PayslipService ..> MultiFunctionDevice : only prints",
        bad("BasicInkjet")]),
      code: `public interface MultiFunctionDevice {
    void print(Document d);
    Image scan(Document d);
    void fax(Document d, String number);
    void staple(Document d);
}

public class BasicInkjet implements MultiFunctionDevice {
    public void print(Document d) { System.out.println("printing " + d.name()); }
    public Image scan(Document d) { throw new UnsupportedOperationException("no scanner"); }
    public void fax(Document d, String n) { throw new UnsupportedOperationException("no fax"); }
    public void staple(Document d) { throw new UnsupportedOperationException("no stapler"); }
}

public class PayslipService {
    private final MultiFunctionDevice device;     // depends on 4 methods, uses 1
    public PayslipService(MultiFunctionDevice device) { this.device = device; }
    public void printPayslip(Document slip) { device.print(slip); }
}` },

    { title: "ISP, the refactor: role interfaces",
      text: "Split the fat interface into small **role interfaces**, shaped by what each *client* needs. Devices implement the roles they genuinely support, and clients depend only on the role they use. A big device is just a class that implements several small interfaces.",
      points: [
        "`PayslipService` depends on `Printer` only, so tests need a one-method fake",
        "No stubs, no `UnsupportedOperationException`: the type system now says what each device can do",
        "If some client really needs \"print + scan\", define `interface Copier extends Printer, DocScanner {}`",
        "**In a machine-coding round:** a vending machine has a customer panel (`selectProduct`, `insertCoin`) and a maintenance panel (`refill`, `collectCash`); an elevator has a hall-call panel and a car panel. Give each client its own interface",
        "**Repositories too:** a `ReadOnlyBookCatalog` for search screens and a `BookInventory` for admins is ISP applied to data access",
        "**Pitfall:** one interface per method everywhere. Group by *client need*, not mechanically. `Comparable`-sized interfaces are great when they match a real role"],
      m: M(["classDiagram",
        "  direction LR",
        "  class Printer {",
        "    <<interface>>",
        "    +print(Document d) void",
        "  }",
        "  class DocScanner {",
        "    <<interface>>",
        "    +scan(Document d) Image",
        "  }",
        "  class FaxMachine {",
        "    <<interface>>",
        "    +fax(Document d, String no) void",
        "  }",
        "  Printer <|.. BasicInkjet",
        "  Printer <|.. OfficeMfp",
        "  DocScanner <|.. OfficeMfp",
        "  FaxMachine <|.. OfficeMfp",
        "  PayslipService ..> Printer",
        "  ArchiveService ..> DocScanner"]),
      code: `public interface Printer    { void print(Document d); }
public interface DocScanner { Image scan(Document d); }
public interface FaxMachine { void fax(Document d, String number); }

public class BasicInkjet implements Printer {                     // only what it can do
    public void print(Document d) { System.out.println("printing " + d.name()); }
}

public class OfficeMfp implements Printer, DocScanner, FaxMachine {
    public void print(Document d) { System.out.println("MFP printing " + d.name()); }
    public Image scan(Document d) { return new Image(d.name() + ".png"); }
    public void fax(Document d, String number) { System.out.println("faxing " + d.name() + " to " + number); }
}

public class PayslipService {
    private final Printer printer;                // depends on exactly what it uses
    public PayslipService(Printer printer) { this.printer = printer; }
    public void printPayslip(Document slip) { printer.print(slip); }
}

new PayslipService(new BasicInkjet()).printPayslip(new Document("slip-nov.pdf"));
new PayslipService(new OfficeMfp()).printPayslip(new Document("slip-nov.pdf"));   // both substitutable` },

    /* ---------------- DIP ---------------- */
    { title: "DIP, the violation: policy welded to details",
      text: "The **Dependency Inversion Principle**: *(a) high-level modules should not depend on low-level modules; both should depend on abstractions. (b) Abstractions should not depend on details; details should depend on abstractions.* `SignupService` holds the business rule (\"no duplicate accounts, welcome new users\"), yet it `new`s a MySQL DAO and an SMTP client itself.",
      points: [
        "You can't unit-test the signup rule without a running MySQL and SMTP server",
        "Moving to Postgres, or from SMTP to SES, means editing the *business* class",
        "The arrows point the wrong way: the important policy depends on replaceable plumbing",
        "Hidden dependencies count too: `LocalDate.now()`, `new Random()`, `System.currentTimeMillis()` and static singletons inside business logic are all DIP leaks",
        "Smells: `new` of infrastructure classes inside services; `static` calls to `Db.getInstance()`; imports of vendor SDKs in domain classes"],
      analogy: "A lamp with its wires soldered straight into the wall. It works, but to move it or swap the bulb type you call an electrician. A plug and socket (the abstraction) let either side change.",
      m: M(["classDiagram",
        "  direction LR",
        "  class SignupService {",
        "    -MySqlUserDao dao",
        "    -SmtpMailer mailer",
        "    +signUp(String email) void",
        "  }",
        "  class MySqlUserDao {",
        "    +findByEmail(String e) User",
        "    +insert(User u) void",
        "  }",
        "  class SmtpMailer {",
        "    +sendMail(String to, String subj, String body) void",
        "  }",
        "  SignupService --> MySqlUserDao : new",
        "  SignupService --> SmtpMailer : new",
        bad("SignupService")]),
      code: `public class SignupService {
    private final MySqlUserDao dao = new MySqlUserDao("jdbc:mysql://db/users");   // concrete detail
    private final SmtpMailer mailer = new SmtpMailer("smtp.corp.local", 587);      // concrete detail

    public void signUp(String email) {
        if (dao.findByEmail(email) != null) throw new IllegalStateException("already registered");
        dao.insert(new User(email));
        mailer.sendMail(email, "Welcome!", "Thanks for signing up");
    }
}` },

    { title: "DIP, the refactor: invert the arrows",
      text: "The high-level module **declares the interfaces it needs**, in its own terms (`UserRepository`, `WelcomeSender`). Low-level classes implement them. The service receives implementations through its constructor (dependency injection), and one **composition root** (`main`, or a DI container) decides which concrete classes to use.",
      points: [
        "Source-code dependencies now point *from* the details *to* the abstraction owned by the policy: that is the \"inversion\"",
        "Ownership matters: the interface belongs with the business logic, named for the business need (`WelcomeSender`, not `SmtpClientWrapper`)",
        "Tests pass in `InMemoryUserRepository` and a recording sender: fast, deterministic, no network",
        "**In a machine-coding round:** keep storage behind repository interfaces with in-memory implementations, inject strategies and `Clock`, and wire everything in `main`. Interviewers often ask \"how would you test this?\", and this is the answer",
        "**Pitfall:** \"header interfaces\" that mirror one concrete class method-for-method (`IMySqlUserDao`) give no inversion; the abstraction must speak the domain's language",
        "**Pitfall:** depending on abstractions for stable things like `String`, `List` or `LocalDate` math is unnecessary. Invert *volatile* dependencies: I/O, time, randomness, vendors"],
      m: M(["classDiagram",
        "  direction LR",
        "  class SignupService {",
        "    +signUp(String email) void",
        "  }",
        "  class UserRepository {",
        "    <<interface>>",
        "    +findByEmail(String e) Optional~User~",
        "    +save(User u) void",
        "  }",
        "  class WelcomeSender {",
        "    <<interface>>",
        "    +sendWelcome(String email) void",
        "  }",
        "  SignupService --> UserRepository",
        "  SignupService --> WelcomeSender",
        "  UserRepository <|.. InMemoryUserRepository",
        "  UserRepository <|.. JdbcUserRepository",
        "  WelcomeSender <|.. ConsoleWelcomeSender",
        "  WelcomeSender <|.. SesWelcomeSender",
        "  Main ..> SignupService : wires",
        "  style UserRepository stroke:#15803d,stroke-width:2px",
        "  style WelcomeSender stroke:#15803d,stroke-width:2px"]),
      code: `// Abstractions owned by the high-level module, named for the business need
public interface UserRepository {
    Optional<User> findByEmail(String email);
    void save(User u);
}
public interface WelcomeSender { void sendWelcome(String email); }

public class SignupService {
    private final UserRepository users;
    private final WelcomeSender welcome;

    public SignupService(UserRepository users, WelcomeSender welcome) {   // constructor injection
        this.users = users;
        this.welcome = welcome;
    }

    public void signUp(String email) {
        if (users.findByEmail(email).isPresent()) throw new IllegalStateException("already registered");
        users.save(new User(email));
        welcome.sendWelcome(email);
    }
}

// Details depend on the abstractions
public class InMemoryUserRepository implements UserRepository {
    private final Map<String, User> byEmail = new ConcurrentHashMap<>();
    public Optional<User> findByEmail(String e) { return Optional.ofNullable(byEmail.get(e)); }
    public void save(User u) { byEmail.put(u.email(), u); }
}
public class ConsoleWelcomeSender implements WelcomeSender {
    public void sendWelcome(String email) { System.out.println("Welcome mail -> " + email); }
}

// Composition root: the ONLY place that names concrete classes
public class Main {
    public static void main(String[] args) {
        SignupService signup = new SignupService(new InMemoryUserRepository(), new ConsoleWelcomeSender());
        signup.signUp("deepak@example.com");
    }
}` },

    { title: "DIP vs DI vs IoC: three different things",
      m: "flowchart LR\n  subgraph NO[\"No DIP: policy \u2192 detail\"]\n    A1[\"<b>SignupService</b><br/><span class='d'>policy</span>\"]:::bad --> B1[\"<b>MySqlUserDao</b><br/><span class='d'>detail</span>\"]\n  end\n  subgraph YES[\"DIP: both \u2192 abstraction owned by policy\"]\n    A2[\"<b>SignupService</b><br/><span class='d'>policy</span>\"]:::s0 --> I2[\"<b>UserRepository</b><br/><span class='d'>interface, policy's package</span>\"]:::s2\n    B2[\"<b>JdbcUserRepository</b><br/><span class='d'>detail</span>\"] -. implements .-> I2\n  end\n  R([\"<b>Composition root / IoC container</b><br/><span class='d'>main() or Spring</span>\"]):::s1 -- \"DI: injects JdbcUserRepository\" --> A2",
      text: "These three get mixed up constantly, and interviewers love asking about them. **DIP** is a *design principle* about which way dependencies point. **DI** is a *technique*: hand an object its collaborators instead of letting it create them. **IoC** is a broader *idea*: a framework controls the flow and calls your code (\"don't call us, we'll call you\"). DI containers such as Spring are one kind of IoC.",
      points: [
        "DI without DIP: `new SignupService(new MySqlUserDao())` is injected, but the parameter type is still the concrete DAO. It helps a little; nothing is inverted",
        "DIP without a DI framework: manual wiring in `main` (like the previous slide) is perfectly good DIP, and it's what you should do in a machine-coding round",
        "IoC without DI: servlet containers calling `doGet()`, JUnit calling your `@Test` methods, Android calling `onCreate()`, and the Template Method pattern",
        "Spring: the IoC container creates beans and injects them (DI); your services depend on interfaces (DIP). Three ideas, one stack",
        "Prefer **constructor** injection: dependencies are explicit, can be `final`, and the object is valid after construction. Field injection (`@Autowired` on fields) hides dependencies and needs reflection to test"],
      table: [
        ["", "DIP", "DI", "IoC"],
        ["What it is", "Design principle", "Technique / pattern", "Architectural idea"],
        ["Question it answers", "Which way should dependencies point?", "How does an object get its collaborators?", "Who controls the flow of the program?"],
        ["Typical form", "Policy depends on an interface it owns; details implement it", "Constructor, setter or method parameters", "Framework calls your code: callbacks, containers, template methods"],
        ["Without the others", "Manual wiring in `main`", "Injecting concrete classes", "JUnit runner, servlet lifecycle"],
        ["Java example", "`SignupService` → `UserRepository`", "`new SignupService(repo, sender)`", "Spring `ApplicationContext`, `@Test`"]],
      code: `// 1) Neither DI nor DIP: creates its own concrete dependency
class ReportService { private final PdfWriter writer = new PdfWriter(); }

// 2) DI but NOT DIP: injected, yet still welded to a concrete type
class ReportService2 {
    private final PdfWriter writer;
    ReportService2(PdfWriter writer) { this.writer = writer; }
}

// 3) DI + DIP: injected AND depends on an abstraction it owns
interface ReportWriter { void write(Report r); }
class ReportService3 {
    private final ReportWriter writer;
    ReportService3(ReportWriter writer) { this.writer = writer; }
}

// 4) IoC: a container (e.g. Spring) builds and injects ReportService3 for you
// @Service class ReportService3 { ReportService3(ReportWriter writer) { ... } }` },

    { title: "SOLID in a machine-coding round: a parking lot",
      text: "Here's how all five show up in the most-asked LLD problem. You don't name-drop principles; you make decisions and *say why* in one sentence. When the interviewer adds \"EV charging\" or \"weekend pricing\", the design absorbs it with new classes.",
      points: [
        "**SRP:** `ParkingLot` manages floors and spots; `FeeCalculator` prices; `TicketRepository` stores tickets; `EntryGate` handles the flow. Each has one reason to change",
        "**OCP:** `SpotAllocationStrategy` and `PricingStrategy` are interfaces; nearest-first, by-floor, weekend or surge pricing are new classes",
        "**LSP:** every `Vehicle` subtype works wherever a `Vehicle` is expected. No `fly()`-style traps: size and fuel type are data, not unsupported methods",
        "**ISP:** `EntryGate` sees only `SpotFinder`; the admin console sees `LotAdmin` (add floor, block spot)",
        "**DIP:** gates depend on interfaces; `main` wires `InMemoryTicketRepository` and the chosen strategies, and a `Clock` is injected so fees are testable",
        "Say it like this: \"Pricing varies independently of allocation, so I've put each behind its own strategy interface\""],
      m: M(["classDiagram",
        "  direction LR",
        "  class EntryGate {",
        "    +admit(Vehicle v) Ticket",
        "  }",
        "  class ExitGate {",
        "    +exit(Ticket t) Receipt",
        "  }",
        "  class SpotAllocationStrategy {",
        "    <<interface>>",
        "    +allocate(List~Floor~ floors, Vehicle v) Optional~Spot~",
        "  }",
        "  class PricingStrategy {",
        "    <<interface>>",
        "    +fee(Ticket t, Instant exit) long",
        "  }",
        "  class TicketRepository {",
        "    <<interface>>",
        "    +save(Ticket t) void",
        "    +find(String id) Optional~Ticket~",
        "  }",
        "  class ParkingLot {",
        "    -List~Floor~ floors",
        "  }",
        "  EntryGate --> SpotAllocationStrategy",
        "  EntryGate --> TicketRepository",
        "  ExitGate --> PricingStrategy",
        "  ExitGate --> TicketRepository",
        "  EntryGate --> ParkingLot",
        "  ParkingLot *-- Floor",
        "  Floor *-- Spot",
        "  SpotAllocationStrategy <|.. NearestFirstStrategy",
        "  PricingStrategy <|.. HourlyPricing",
        "  PricingStrategy <|.. WeekendPricing",
        "  TicketRepository <|.. InMemoryTicketRepository",
        "  Vehicle <|-- Car",
        "  Vehicle <|-- Bike",
        "  Vehicle <|-- Truck"]),
      code: `public interface PricingStrategy { long fee(Ticket ticket, Instant exitTime); }

public class HourlyPricing implements PricingStrategy {
    private final Map<VehicleSize, Long> ratePerHour;
    public HourlyPricing(Map<VehicleSize, Long> ratePerHour) { this.ratePerHour = Map.copyOf(ratePerHour); }

    public long fee(Ticket t, Instant exit) {
        long minutes = Duration.between(t.entryTime(), exit).toMinutes();
        long hours = Math.max(1, (minutes + 59) / 60);                 // round up, minimum 1 hour
        return hours * ratePerHour.get(t.vehicle().size());
    }
}

public class ExitGate {
    private final TicketRepository tickets;      // DIP: interfaces, injected
    private final PricingStrategy pricing;
    private final Clock clock;                   // time is a dependency too

    public ExitGate(TicketRepository tickets, PricingStrategy pricing, Clock clock) {
        this.tickets = tickets; this.pricing = pricing; this.clock = clock;
    }

    public long exit(String ticketId) {
        Ticket t = tickets.find(ticketId).orElseThrow(() -> new IllegalArgumentException("bad ticket"));
        return pricing.fee(t, clock.instant());
    }
}

// main(): the composition root picks implementations
ExitGate gate = new ExitGate(new InMemoryTicketRepository(),
        new HourlyPricing(Map.of(VehicleSize.SMALL, 20L, VehicleSize.MEDIUM, 40L, VehicleSize.LARGE, 100L)),
        Clock.systemDefaultZone());` },

    { title: "Don't over-engineer: SOLID in proportion",
      text: "SOLID is a means, not a score. In a 90-minute round, a design with 30 interfaces and no working `main` loses to a clear, working design with abstractions at the two or three places that will really change. Apply a principle when it removes a *real or clearly coming* pain.",
      points: [
        "**YAGNI** (You Aren't Gonna Need It): don't build extension points for imagined requirements",
        "**KISS:** the simplest design that meets the requirements and the interviewer's likely extensions",
        "**Rule of three:** abstract on the second or third variation, not the first",
        "**DRY** is about duplicated *knowledge*, not similar-looking code. Two rules that look alike but change for different actors should stay separate (SRP beats DRY there)",
        "**Law of Demeter:** talk to friends, not strangers. `order.getCustomer().getAddress().getCity()` couples you to three classes; ask `order.shippingCity()` instead",
        "An interface with one implementation is fine if it's a *seam* (storage, time, external service, or the axis the interviewer will extend). Otherwise, a concrete class is fine"],
      table: [
        ["Principle", "Under-applied (smell)", "Over-applied (smell)"],
        ["SRP", "God class: `ParkingLotManager` does everything", "40 classes of one method; logic scattered so nothing reads as a story"],
        ["OCP", "`switch` on type in five places", "Plug-in frameworks and registries for things that never vary"],
        ["LSP", "Overrides that throw `UnsupportedOperationException`", "Refusing all inheritance, even for a clean, stable hierarchy"],
        ["ISP", "One 20-method `Operations` interface", "An interface per method; clients juggling 6 tiny types"],
        ["DIP", "Services `new` their DB, mailer and clock", "An interface for every POJO and value object; a DI framework in a 90-minute round"]] }
  ];

  /* ---------- Interactive widget: spot the violated principle ---------- */
  var PRINCIPLES = ["SRP", "OCP", "LSP", "ISP", "DIP", "No violation"];
  var FULL = ["Single Responsibility", "Open/Closed", "Liskov Substitution", "Interface Segregation", "Dependency Inversion", "Fine as it is"];
  var SPOT = [
    { title: "Employee", answer: 0,
      code: "public class Employee {\n    public Money calculatePay()  { /* rules from Finance (CFO) */ }\n    public Hours reportHours()   { /* rules from Operations (COO) */ }\n    public void save()           { /* SQL owned by the DBAs (CTO) */ }\n}",
      why: "Three actors (finance, operations, DBAs) can each demand changes to this one class. Martin's classic example: if `calculatePay` and `reportHours` share a helper for overtime, a change for finance silently changes operations' report.",
      fix: "Keep `Employee` as data; move behaviour to `PayCalculator`, `HourReporter` and `EmployeeRepository`." },
    { title: "AreaCalculator", answer: 1,
      code: "public double area(Object shape) {\n    if (shape instanceof Circle c)    return Math.PI * c.r() * c.r();\n    if (shape instanceof Rect r)      return r.w() * r.h();\n    if (shape instanceof Triangle t)  return 0.5 * t.b() * t.h();\n    throw new IllegalArgumentException(\"unknown shape\");\n}",
      why: "Every new shape means editing this method (and every similar `instanceof` chain). It's closed to extension and open to modification: the opposite of OCP.",
      fix: "Put `double area()` on a `Shape` interface and let each shape implement it. (With a sealed interface and a pattern-matching `switch`, the compiler at least flags missing cases.)" },
    { title: "ReadOnlyAccount", answer: 2,
      code: "class Account {\n    void deposit(long amt)  { balance += amt; }\n    void withdraw(long amt) { balance -= amt; }\n}\nclass ReadOnlyAccount extends Account {\n    @Override void withdraw(long amt) {\n        throw new UnsupportedOperationException(\"read-only\");\n    }\n}",
      why: "Code that works with `Account` and calls `withdraw()` blows up when it gets a `ReadOnlyAccount`. The subtype adds an exception the base contract never mentioned.",
      fix: "Split capabilities, e.g. `ViewableAccount` (balance) and `TransactableAccount extends ViewableAccount` (deposit/withdraw); read-only views implement only the first." },
    { title: "Worker", answer: 3,
      code: "interface Worker {\n    void work();\n    void eat();\n    void sleep();\n}\nclass RobotWorker implements Worker {\n    public void work()  { assemble(); }\n    public void eat()   { }   // robots don't eat\n    public void sleep() { }   // ...or sleep\n}",
      why: "`RobotWorker` is forced to implement methods it has no use for. Empty or throwing stubs show the interface is too fat for some of its clients.",
      fix: "Split into `Workable`, `Feedable` and `Restable` (or `Worker` and `LivingBeing`); robots implement only `Workable`." },
    { title: "ReportService", answer: 4,
      code: "public class ReportService {\n    private final PdfWriter writer = new PdfWriter();\n    private final S3Client s3 = S3Client.create();\n\n    public void monthly() {\n        byte[] pdf = writer.write(buildReport());\n        s3.putObject(\"reports\", \"monthly.pdf\", pdf);\n    }\n}",
      why: "The business policy (what goes in a monthly report) creates and depends on concrete PDF and AWS classes. You can't test it without AWS, and you can't switch to CSV or GCS without editing it.",
      fix: "Depend on `ReportFormatter` and `ReportStore` interfaces passed in through the constructor; wire `PdfFormatter` and `S3ReportStore` in `main`." },
    { title: "BulkOrderProcessor", answer: 2,
      code: "class OrderProcessor {\n    /** Processes any non-empty order. */\n    void process(Order o) { ... }\n}\nclass BulkOrderProcessor extends OrderProcessor {\n    @Override void process(Order o) {\n        if (o.items().size() < 10)\n            throw new IllegalArgumentException(\"min 10 items\");\n        ...\n    }\n}",
      why: "The subtype **strengthens a precondition**: the base accepts any non-empty order, the subtype rejects some of them. Callers holding an `OrderProcessor` can't know about the extra rule.",
      fix: "Don't make it a subtype; give it its own type, or make the minimum part of the base contract (for example `canProcess(Order)`) that every implementation honours." },
    { title: "ParkingLot", answer: 0,
      code: "public class ParkingLot {\n    public Ticket park(Vehicle v)         { ... }\n    public long   calculateFee(Ticket t)  { ... }  // pricing rules\n    public void   printReceipt(Ticket t)  { ... }  // formatting\n    public void   smsOwner(Ticket t)      { ... }  // Twilio calls\n    public void   saveToDb(Ticket t)      { ... }  // SQL\n}",
      why: "Allocation, pricing, formatting, messaging and persistence all change for different reasons. This is the god class interviewers watch for.",
      fix: "`ParkingLot` keeps the floors and spots; `PricingStrategy`, `ReceiptPrinter`, `Notifier` and `TicketRepository` take the rest." },
    { title: "PaymentProcessor", answer: 1,
      code: "public void pay(Order o, String method) {\n    switch (method) {\n        case \"UPI\"  -> upiGateway.collect(o.total());\n        case \"CARD\" -> cardGateway.charge(o.total());\n        // product wants \"WALLET\" and \"BNPL\" next quarter\n        default     -> throw new IllegalArgumentException(method);\n    }\n}",
      why: "Payment methods are an obvious, announced axis of variation, and each one means editing this method.",
      fix: "A `PaymentMethod` interface (Strategy) with `UpiPayment`, `CardPayment`, `WalletPayment`...; select it with a map or factory at the edge." },
    { title: "VendingMachineOps", answer: 3,
      code: "interface VendingMachineOps {\n    void selectProduct(String code);\n    void insertCoin(Coin c);\n    Product dispense();\n    void refill(String code, int qty);\n    Money collectCash();\n    Report runDiagnostics();\n}\nclass CustomerPanel implements VendingMachineOps { /* admin methods throw */ }",
      why: "The customer panel and the maintenance app are different clients with different needs, yet both depend on one fat interface.",
      fix: "`CustomerOperations` (select, insert, dispense) and `MaintenanceOperations` (refill, collect, diagnostics); the machine implements both, and each panel sees one." },
    { title: "LateFeeCalculator", answer: 4,
      code: "public class LateFeeCalculator {\n    public long fee(Loan loan) {\n        long daysLate = ChronoUnit.DAYS.between(loan.dueDate(), LocalDate.now());\n        return Math.max(0, daysLate) * 10;\n    }\n}",
      why: "A hidden dependency on the system clock: `LocalDate.now()` is a concrete low-level detail baked into a business rule. Tests depend on the day they run.",
      fix: "Inject a `java.time.Clock` (or pass `today` in): `LocalDate.now(clock)`. Tests use `Clock.fixed(...)`." },
    { title: "VehicleFactory", answer: 5,
      code: "public final class VehicleFactory {\n    public static Vehicle create(VehicleType type, String plate) {\n        return switch (type) {\n            case CAR   -> new Car(plate);\n            case BIKE  -> new Bike(plate);\n            case TRUCK -> new Truck(plate);\n        };\n    }\n}",
      why: "This is fine. One `switch` in a factory, the place whose *job* is mapping a type to a class, is the accepted way to keep the rest of the code free of `switch`es. With an enum and an exhaustive switch expression, the compiler flags any new type you forget.",
      fix: "Nothing to fix. Don't replace it with reflection or a plug-in registry unless types are added at runtime (YAGNI)." },
    { title: "Money", answer: 5,
      code: "public record Money(long amount, String currency) {\n    public Money plus(Money o)  { check(o); return new Money(amount + o.amount, currency); }\n    public Money minus(Money o) { check(o); return new Money(amount - o.amount, currency); }\n    public Money times(int n)   { return new Money(amount * n, currency); }\n    public boolean isZero()     { return amount == 0; }\n    private void check(Money o) { if (!currency.equals(o.currency)) throw new IllegalArgumentException(); }\n}",
      why: "Several methods, one cohesive responsibility: money arithmetic. It doesn't need an interface (a stable value object isn't a volatile dependency), and it isn't too big.",
      fix: "Nothing to fix. Adding `IMoney` and a `MoneyFactory` here would be over-engineering." }
  ];

  function widget(el, ctx) {
    var s = ctx.state;
    if (s.i === undefined) { s.i = 0; s.picks = {}; }
    el.innerHTML = "<div class='metrics' data-r='score'></div>" +
      "<div class='dots' data-r='dots'></div>" +
      "<h3 data-r='title' style='margin-top:6px'></h3>" +
      "<div data-r='code'></div>" +
      "<div><div class='field' style='margin-bottom:6px'>Which principle does this break?</div><div class='btnrow' data-r='opts'></div></div>" +
      "<div class='result' data-r='res' hidden></div>" +
      "<div class='btnrow'><button type='button' class='btn' data-r='prev'>← Previous</button><button type='button' class='btn primary' data-r='next'>Next snippet →</button><button type='button' class='btn' data-r='reset'>Reset exercise</button></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var item = SPOT[s.i], pick = s.picks[s.i];
      var answered = Object.keys(s.picks).length;
      var right = Object.keys(s.picks).filter(function (k) { return s.picks[k] === SPOT[k].answer; }).length;
      q("score").innerHTML = "<div class='metric'><div class='v'>" + right + " / " + answered + "</div><div class='l'>Correct so far</div></div><div class='metric'><div class='v'>" + answered + " / " + SPOT.length + "</div><div class='l'>Snippets answered</div></div>";
      q("dots").innerHTML = SPOT.map(function (it, k) {
        var p = s.picks[k], bg = p === undefined ? "" : p === it.answer ? "background:var(--success)" : "background:var(--danger)";
        return "<button type='button' data-k='" + k + "' aria-label='Snippet " + (k + 1) + "' class='" + (k === s.i ? "cur" : "") + "' style='" + bg + "'></button>";
      }).join("");
      q("title").textContent = "Snippet " + (s.i + 1) + " of " + SPOT.length + ": " + item.title;
      q("code").innerHTML = ctx.H.codeBlock(item.code);
      q("opts").innerHTML = PRINCIPLES.map(function (p, j) {
        var cls = pick === undefined ? "" : j === item.answer ? " correct" : j === pick ? " wrong" : "";
        return "<button type='button' class='btn" + cls + "' data-j='" + j + "'" + (pick !== undefined ? " disabled" : "") + " title='" + esc(FULL[j]) + "'>" + esc(p) + "</button>";
      }).join("");
      q("opts").className = "btnrow qopts-inline";
      var res = q("res");
      if (pick === undefined) { res.hidden = true; }
      else {
        res.hidden = false;
        var ok = pick === item.answer;
        res.className = "result " + (ok ? "ok" : "err");
        res.innerHTML = "<div class='out'>" + (ok ? "Correct: " : "Not quite. It's ") + esc(PRINCIPLES[item.answer]) + (item.answer < 5 ? " (" + esc(FULL[item.answer]) + ")" : "") + "</div><p style='margin-top:6px'>" + ctx.md(item.why) + "</p><p style='margin-top:6px'><strong>Fix:</strong> " + ctx.md(item.fix) + "</p>";
      }
      q("prev").disabled = s.i === 0;
      q("next").disabled = s.i === SPOT.length - 1;
      document.body.setAttribute("data-spot", s.i + ":" + (pick === undefined ? "-" : pick));
    }
    q("opts").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-j]"); if (!b || b.disabled) return;
      s.picks[s.i] = Number(b.getAttribute("data-j")); ctx.save(); draw();
    });
    q("dots").addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (!b) return; s.i = Number(b.getAttribute("data-k")); ctx.save(); draw(); });
    q("prev").addEventListener("click", function () { if (s.i > 0) { s.i--; ctx.save(); draw(); } });
    q("next").addEventListener("click", function () { if (s.i < SPOT.length - 1) { s.i++; ctx.save(); draw(); } });
    q("reset").addEventListener("click", function () { s.i = 0; s.picks = {}; ctx.save(); draw(); });
    draw();
  }

  var QUIZ = [
    { q: "According to Robert C. Martin's later wording, \"one reason to change\" in SRP means…", options: ["Exactly one public method per class", "One actor, or group of stakeholders, whose requests can change the class", "One field per class", "One file per package"], answer: 1,
      why: "SRP is about whom the code answers to. Many cohesive methods serving one actor are fine; one class serving finance *and* operations is not." },
    { q: "Your `DiscountService` has a `switch` on customer type, and product adds a new festival discount every quarter. Which change best satisfies OCP?", options: ["Add another `case` each quarter", "Make `DiscountService` abstract and subclass it per festival", "Introduce a `DiscountRule` interface; each discount is a new class, and the service applies a list of rules", "Move the `switch` into a static utility class"], answer: 2,
      why: "OCP wants new behaviour to arrive as new code. A rule interface (Strategy) turns \"add a discount\" into \"add a class plus one line of wiring\"." },
    { q: "Which override most clearly violates LSP?", options: ["`ArrayList.add()` that grows the backing array", "`Penguin.fly()` that throws `UnsupportedOperationException`", "`Circle.area()` returning `πr²`", "A subclass that adds a new `toString()`"], answer: 1,
      why: "Clients of `Bird` rely on `fly()` working. A subtype that throws a new exception for a base operation can't be substituted safely." },
    { q: "A subclass's overriding method rejects inputs that the base method accepted. In contract terms, the subclass has…", options: ["Weakened a precondition (allowed)", "Strengthened a precondition (an LSP violation)", "Strengthened a postcondition (allowed)", "Changed nothing important"], answer: 1,
      why: "Subtypes may accept more (weaker preconditions) and promise more (stronger postconditions), never the reverse." },
    { q: "`BasicInkjet implements MultiFunctionDevice`, with `scan()`, `fax()` and `staple()` throwing. Which principle is the *root* problem?", options: ["SRP", "OCP", "ISP: the interface forces clients and implementors to depend on methods they don't use", "DIP"], answer: 2,
      why: "The fat interface is the root cause; the throwing stubs are a knock-on LSP problem. Split it into `Printer`, `DocScanner` and `FaxMachine`." },
    { q: "Which statement about DIP, DI and IoC is correct?", options: ["They're three names for the same thing", "You can do DI without DIP, for example by injecting a concrete `MySqlUserDao`", "DIP requires a framework like Spring", "IoC means you must use interfaces"], answer: 1,
      why: "DI is the delivery mechanism; DIP is about depending on abstractions. Injecting a concrete class is DI without DIP. Manual wiring in `main` is DIP without any framework." },
    { q: "In DIP, who should own (define) the `UserRepository` interface?", options: ["The MySQL driver library", "The low-level `JdbcUserRepository` package", "The high-level module that uses it (the business or service layer)", "Whichever team writes it first"], answer: 2,
      why: "Ownership is the \"inversion\": the policy defines the abstraction in its own terms, and details implement it. Then the details depend on the policy, not the other way round." },
    { q: "`LateFeeCalculator.fee()` calls `LocalDate.now()` internally. What's the cleanest fix?", options: ["Make the method `static`", "Inject a `java.time.Clock` and call `LocalDate.now(clock)`", "Catch the exception", "Cache the date in a static field"], answer: 1,
      why: "Time is a volatile, low-level dependency. Injecting `Clock` (DIP via DI) makes the rule deterministic: tests use `Clock.fixed(...)`." },
    { q: "Which is most likely over-engineering in a 90-minute Tic-Tac-Toe round?", options: ["A `Board` class separate from `Game`", "A `WinningStrategy` interface because the interviewer hinted at N×N boards", "`IPlayerFactoryProvider`, `AbstractCellFactory` and a plug-in registry for cell types", "A `Player` record"], answer: 2,
      why: "Factories and registries for things that never vary add cost with no benefit. Abstract where change is likely, such as win rules or board size if hinted." },
    { q: "Which Java rule enforces part of LSP at compile time?", options: ["An override may throw broader checked exceptions than the base", "An override may reduce visibility from `public` to `protected`", "An override may return a subtype of the base method's return type (a covariant return)", "Static methods are overridden polymorphically"], answer: 2,
      why: "Covariant returns are allowed because they strengthen a postcondition. The compiler forbids broader checked exceptions and reduced visibility, both of which would break substitutability." }
  ];

  H.registerLesson({
    code: "F02",
    summary: "The five SOLID principles in depth: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation and Dependency Inversion. Each has a violating Java example, the refactored design, before/after class diagrams, an analogy and how it shows up in machine-coding rounds. Also DIP vs DI vs IoC, SOLID in a parking lot, and how not to over-engineer.",
    slides: SLIDES,
    widget: { heading: "Interactive: spot the violated principle", caption: "12 real-looking snippets. Pick the principle each one breaks, or \"No violation\" if it's fine; a couple are deliberately fine, to train you against over-engineering. Your answers are saved.", render: widget },
    examplesHeading: "Real-world analogies and where SOLID shows up in Java",
    examples: [
      ["SRP: Spring's layering", "Controllers handle HTTP, services hold business rules, repositories handle persistence. Each layer changes for a different reason, which is why the convention exists."],
      ["OCP: Servlet filters and Spring interceptors", "You add cross-cutting behaviour (auth, logging, CORS) by registering a new filter, without editing the servlet container or other filters."],
      ["OCP: `Comparator`", "`Collections.sort(list, comparator)` is closed for modification and open for extension: any ordering is a new `Comparator`, and the sort algorithm never changes."],
      ["LSP: `List.of()` and unmodifiable lists", "`List.add()` is documented as an *optional operation*, so immutable lists can throw. It's legal by the contract, but every client has to remember it. Kotlin's separate `List`/`MutableList` (an ISP-style split) avoids the trap."],
      ["ISP: `java.util.function`", "`Supplier`, `Consumer`, `Function` and `Predicate` are tiny role interfaces. A method that needs \"something that gives me a value\" asks for a `Supplier<T>`, not a whole service."],
      ["ISP: `Readable`, `Closeable`, `Flushable`, `AutoCloseable`", "Small capability interfaces mixed into I/O classes. `try-with-resources` needs only `AutoCloseable`, not a whole stream API."],
      ["DIP: JDBC and SLF4J", "Your code depends on `java.sql.Connection` and `org.slf4j.Logger` (abstractions). The MySQL, Postgres, Logback or Log4j implementations plug in underneath and can be swapped without code changes."],
      ["DIP + IoC: Spring", "Spring's IoC container builds beans and injects them via constructors (DI); you program against interfaces (DIP). In tests you hand in fakes yourself, with no container."]
    ],
    pitfalls: [
      "Reciting the acronym without applying it; interviewers want decisions plus a one-line reason, not definitions",
      "Reading SRP as \"one method per class\" and fragmenting cohesive logic into dozens of tiny classes",
      "\"Fixing\" a `switch` by moving it into another class: the switch on type is still there, still duplicated",
      "LSP via inheritance-by-taxonomy: `Square extends Rectangle`, `Penguin extends Bird`, `ReadOnlyAccount extends Account` with throwing overrides",
      "Patching LSP violations with `instanceof` checks in clients (now you also violate OCP)",
      "Fat interfaces with empty or throwing stub methods (ISP), or the opposite: an interface per method",
      "Confusing DIP, DI and IoC; thinking you need Spring for DIP; field injection hiding dependencies",
      "\"Header interfaces\" that mirror one concrete class (`IMySqlUserDao`), which invert nothing",
      "Hidden concrete dependencies in business logic: `LocalDate.now()`, `new Random()`, static singletons, `System.getenv()`",
      "Over-engineering: factories, registries and interfaces for everything in a 90-minute round, with no working `main` at the end"
    ],
    quiz: QUIZ,
    cheatsheet: {
      table: [
        ["Principle", "In one line", "Smell", "Typical fix", "Machine-coding example"],
        ["SRP", "One reason to change (one actor)", "God class, `Manager`/`Util`, mixed imports", "Split by axis of change; thin orchestrator", "`ParkingLot` vs `FeeCalculator` vs `TicketRepository`"],
        ["OCP", "Add behaviour by adding code", "`switch`/`instanceof` on type, growing every release", "Strategy, Decorator, Observer, Chain; wire in `main`", "New `PricingStrategy` or `SplitType` without edits"],
        ["LSP", "Subtypes keep the base's promises", "Overrides that throw, no-op or reject inputs; `instanceof` in clients", "Redesign the hierarchy; immutability; composition; split capabilities", "Every `Vehicle` and every `Piece` usable via the base type"],
        ["ISP", "Clients depend only on what they use", "Fat interfaces, stub methods", "Role interfaces per client; compose them", "Vending machine: customer vs maintenance interfaces"],
        ["DIP", "Policy and details both depend on abstractions owned by the policy", "`new` of DB, mailer or clock inside services", "Interfaces + constructor injection + a composition root", "Repositories with in-memory implementations; an injected `Clock`"]],
      cards: [
        { title: "DIP vs DI vs IoC", items: ["DIP: *principle*, the direction of dependencies", "DI: *technique*, collaborators passed in", "IoC: *idea*, the framework calls your code", "DI without DIP = injecting concrete classes", "DIP without a framework = manual wiring in `main`"] },
        { title: "LSP contract rules", items: ["Preconditions: the subtype may only *weaken* them", "Postconditions: the subtype may only *strengthen* them", "Invariants: preserve the base's", "No new exception types for base operations", "Java enforces: visibility, checked exceptions, covariant returns"] },
        { title: "Proportion check", items: ["Abstract the 2–3 axes the interviewer will extend", "Seams for I/O, time, randomness and vendors", "Rule of three before generalizing", "SRP over DRY when actors differ", "Working `main` > perfect diagram"] },
        { title: "Say it in the interview", items: ["\"Pricing varies independently, so it's a strategy\"", "\"Storage is behind a repository; in-memory for now\"", "\"I inject a Clock so fees are testable\"", "\"I'd rather not subclass here: it breaks substitutability\"", "\"Not abstracting this yet: no second variation\""] }
      ]
    },
    practice: [
      { level: "Easy", q: "State each SOLID principle in one sentence, and give one concrete Java or LLD example of each.",
        steps: [
          ["SRP", "A class has one reason to change. Example: `Invoice` holds data; `InvoicePrinter` formats it; `InvoiceRepository` stores it."],
          ["OCP", "Add behaviour by adding code, not editing working code. Example: a new `WeekendPricing implements PricingStrategy` for the parking lot."],
          ["LSP", "A subtype must work anywhere its base type is expected. Example: every `Piece` in chess can be asked `legalMoves(board)`; none of them throws."],
          ["ISP", "Clients shouldn't depend on methods they don't use. Example: `Printer`, `DocScanner` and `FaxMachine` instead of one `MultiFunctionDevice`."],
          ["DIP", "Business logic depends on abstractions it owns, and details implement them. Example: `SignupService` → `UserRepository` ← `JdbcUserRepository`."]],
        follow: "Which two principles do the most work in a typical machine-coding round? Usually OCP (via strategies for the extension the interviewer adds) and DIP (repositories and injected dependencies for testability)." },

      { level: "Easy", q: "List the responsibilities in this class, then split it according to SRP.",
        qcode: `public class UserController {
    private static final String URL = "jdbc:mysql://db/users";

    public void register(String email, String password) {
        if (!email.contains("@")) throw new IllegalArgumentException("bad email");      // validation
        String hash = Integer.toHexString((password + "salt").hashCode());            // hashing (!)
        try (Connection c = DriverManager.getConnection(URL)) {                        // persistence
            c.createStatement().executeUpdate("INSERT INTO users VALUES ('" + email + "','" + hash + "')");
        } catch (SQLException e) { throw new IllegalStateException(e); }
        System.out.println("Sending welcome email to " + email);                       // notification
        System.out.println("AUDIT user registered " + email);                          // auditing
    }
}`,
        a: ["Five reasons to change: input validation, password hashing (security team), SQL persistence (DBA), welcome email (marketing) and audit logging (compliance)",
            "Split into `EmailValidator`, `PasswordHasher` (use BCrypt or Argon2, never `hashCode()`), `UserRepository`, `WelcomeSender` and `AuditLog`; `RegistrationService` orchestrates and the controller only maps HTTP to the service",
            "Bonus findings an interviewer will love: SQL injection (string concatenation, so use `PreparedStatement`) and an insecure hash; SRP makes each fix local"],
        code: `public class RegistrationService {
    private final EmailValidator validator;
    private final PasswordHasher hasher;
    private final UserRepository users;
    private final WelcomeSender welcome;
    private final AuditLog audit;

    public RegistrationService(EmailValidator v, PasswordHasher h, UserRepository u,
                               WelcomeSender w, AuditLog a) {
        this.validator = v; this.hasher = h; this.users = u; this.welcome = w; this.audit = a;
    }

    public void register(String email, char[] password) {
        validator.validate(email);
        users.save(new User(email, hasher.hash(password)));
        welcome.sendWelcome(email);
        audit.record("user.registered", email);
    }
}` },

      { level: "Easy", q: "Why is an `instanceof` chain an OCP problem, and how do you remove it? Is a `switch` ever acceptable?",
        qcode: `double area(Object s) {
    if (s instanceof Circle c) return Math.PI * c.r() * c.r();
    if (s instanceof Rect r)   return r.w() * r.h();
    throw new IllegalArgumentException();
}`,
        a: ["Each new shape requires editing this method and every similar chain (perimeter, draw, serialize), so the code is open to modification rather than extension",
            "Fix: put `area()` on a `Shape` interface; each shape implements it and callers just call `s.area()`",
            "A `switch` is acceptable (1) in a factory that maps a type code to a class, once, at the edge; or (2) over a **sealed** hierarchy with pattern matching, where the compiler flags missing cases. That's a deliberate trade-off when *operations* change more often than *types*, the classic Expression Problem"],
        code: `public sealed interface Shape permits Circle, Rect { double area(); }
public record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }
public record Rect(double w, double h) implements Shape { public double area() { return w * h; } }` },

      { level: "Medium", q: "Explain Rectangle/Square in LSP terms. Does making both immutable fix it? Could an immutable `Square` then even extend `Rectangle`?",
        steps: [
          ["The broken contract", "Mutable `Rectangle` implicitly promises that `setWidth` leaves the height unchanged. `Square` must change both, so it breaks the base's postcondition, and `resize(r)` returns area 16 instead of 20."],
          ["Why it's sneaky", "It compiles and doesn't throw; the client gets a wrong answer. The violation lives in *behaviour*, not in method signatures."],
          ["Immutability fixes it", "With no setters, the problematic promise doesn't exist. `Rectangle(5, 4).area()` is 20 and `Square(4).area()` is 16, both correct."],
          ["Could Square extend an immutable Rectangle?", "Yes. If `Rectangle` is immutable, `Square(side)` behaves exactly like `Rectangle(side, side)`, and every observable promise of `Rectangle` holds. In practice, a `Shape` interface with two records is cleaner, and records can't extend classes anyway."],
          ["General lesson", "LSP depends on the *contract* of the base type. Mutability enlarges contracts and makes subtyping harder."]] },

      { level: "Medium", q: "`List.of(1, 2).add(3)` throws `UnsupportedOperationException`. Is that an LSP violation? What would an ISP-minded API look like?",
        a: ["Strictly, no: `List.add()` is documented as an *optional operation* that may throw `UnsupportedOperationException`, so an immutable list honours the (weak) contract",
            "But the contract is weak on purpose (a pragmatic compromise in the Collections API), and it pushes the risk to every caller: any method receiving a `List` can't be sure `add()` works",
            "An ISP-minded design separates capabilities: a read-only `List` and a `MutableList extends List` (Kotlin does this). Methods that only read ask for the read-only type, and mutation becomes a compile-time capability",
            "Interview takeaway: say \"legal by contract, but a design smell; I'd return an unmodifiable view and document it, or use separate read and write interfaces in my own APIs\""] },

      { level: "Medium", q: "Design the interfaces for a smart-home hub. Devices include plain switches (on/off), dimmable bulbs, colour bulbs, thermostats and smart plugs that report power usage. A voice assistant and a scheduling engine use them.",
        steps: [
          ["Reject the fat interface", "A `SmartDevice` with `turnOn`, `setBrightness`, `setColour`, `setTemperature` and `powerUsage` forces plain switches to stub four methods (ISP and LSP problems)."],
          ["Role interfaces by capability", "`Switchable { on(); off(); boolean isOn(); }`, `Dimmable { setBrightness(int pct); }`, `ColourAdjustable { setColour(Rgb c); }`, `TemperatureControl { setTarget(Celsius t); }`, `PowerMetered { Watts currentDraw(); }`."],
          ["Devices compose roles", "`ColourBulb implements Switchable, Dimmable, ColourAdjustable`; `SmartPlug implements Switchable, PowerMetered`; `Thermostat implements TemperatureControl`."],
          ["Clients ask for what they need", "The scheduler's \"turn off at 11 pm\" needs `Switchable`; an energy dashboard needs `PowerMetered`. The voice assistant discovers capabilities with `instanceof` at the *edge* (when parsing commands) or via a `capabilities()` set."],
          ["Extension", "A new \"blinds\" device adds `Positionable { setOpenPercent(int) }`; nothing existing changes (OCP)."]],
        m: M(["classDiagram",
          "  direction LR",
          "  class Switchable {", "    <<interface>>", "    +on() void", "    +off() void", "  }",
          "  class Dimmable {", "    <<interface>>", "    +setBrightness(int pct) void", "  }",
          "  class ColourAdjustable {", "    <<interface>>", "    +setColour(Rgb c) void", "  }",
          "  class PowerMetered {", "    <<interface>>", "    +currentDraw() Watts", "  }",
          "  class TemperatureControl {", "    <<interface>>", "    +setTarget(Celsius t) void", "  }",
          "  Switchable <|.. WallSwitch",
          "  Switchable <|.. ColourBulb",
          "  Dimmable <|.. ColourBulb",
          "  ColourAdjustable <|.. ColourBulb",
          "  Switchable <|.. SmartPlug",
          "  PowerMetered <|.. SmartPlug",
          "  TemperatureControl <|.. Thermostat",
          "  Scheduler ..> Switchable",
          "  EnergyDashboard ..> PowerMetered"]) },

      { level: "Medium", q: "Explain DIP, DI and IoC to an interviewer with code. Show DI without DIP, and DIP without a framework.",
        a: ["**DIP** (principle): high-level policy and low-level details both depend on abstractions, and the abstraction is owned by the policy",
            "**DI** (technique): an object receives its collaborators (constructor, setter or method) instead of creating them",
            "**IoC** (idea): control flow is handed to a framework that calls your code; DI containers, servlet lifecycles, JUnit and Template Method are all forms of it",
            "They are independent: DI can inject a concrete class (no DIP), DIP can be wired by hand (no container), and IoC can exist without DI (a JUnit runner calling `@Test` methods)"],
        code: `// DI without DIP: injected, but welded to a concrete class
class InvoiceService {
    private final MySqlInvoiceDao dao;
    InvoiceService(MySqlInvoiceDao dao) { this.dao = dao; }
}

// DIP without any framework: abstraction owned by the policy, manual wiring in main
interface InvoiceStore { void save(Invoice i); }
class InvoiceService2 {
    private final InvoiceStore store;
    InvoiceService2(InvoiceStore store) { this.store = store; }
}
class InMemoryInvoiceStore implements InvoiceStore {
    private final List<Invoice> saved = new ArrayList<>();
    public void save(Invoice i) { saved.add(i); }
}
// main: new InvoiceService2(new InMemoryInvoiceStore());

// IoC + DI + DIP: Spring constructs InvoiceService2 and injects a JdbcInvoiceStore bean
// @Service class InvoiceService2 { InvoiceService2(InvoiceStore store) { ... } }`,
        follow: "Why prefer constructor injection over field injection? Dependencies are explicit and can be `final`, the object is never half-built, and tests can call the constructor with no reflection or container." },

      { level: "Medium", q: "Make this library late-fee rule unit-testable without waiting for real days to pass.",
        qcode: `public class LateFeeCalculator {
    public long fee(Loan loan) {
        long daysLate = ChronoUnit.DAYS.between(loan.dueDate(), LocalDate.now());
        return Math.max(0, daysLate) * 10;     // Rs 10 per day
    }
}`,
        a: ["The hidden dependency is the system clock, a volatile low-level detail inside a business rule (a DIP leak)",
            "Inject a `java.time.Clock` (the JDK's own abstraction) and use `LocalDate.now(clock)`. Production passes `Clock.systemDefaultZone()`; tests pass `Clock.fixed(...)`",
            "Also make the rate a constructor parameter or a `FeePolicy`, so a change to fines doesn't touch the date logic (SRP and OCP)"],
        code: `public class LateFeeCalculator {
    private final Clock clock;
    private final long perDay;

    public LateFeeCalculator(Clock clock, long perDay) { this.clock = clock; this.perDay = perDay; }

    public long fee(Loan loan) {
        long daysLate = ChronoUnit.DAYS.between(loan.dueDate(), LocalDate.now(clock));
        return Math.max(0, daysLate) * perDay;
    }
}

// Test: deterministic, no sleeping
Clock nov11 = Clock.fixed(Instant.parse("2026-11-11T10:00:00Z"), ZoneOffset.UTC);
LateFeeCalculator calc = new LateFeeCalculator(nov11, 10);
long fee = calc.fee(new Loan("book-1", LocalDate.of(2026, 11, 1)));   // 10 days late -> 100` },

      { level: "Medium", q: "Java's compiler enforces part of LSP. Which override rules are those, and which LSP rules does it *not* check?",
        a: ["Enforced: an override can't **reduce visibility** (`public` → `protected` won't compile)",
            "Enforced: an override can't throw **new or broader checked exceptions** than the overridden method declares; it may throw fewer or narrower ones",
            "Allowed because it's safe: **covariant return types** (an override can return a subtype, which strengthens the postcondition)",
            "Not checked: behavioural rules such as stronger preconditions (`if (x < 10) throw`), weaker postconditions, broken invariants (Square), and *unchecked* exceptions like `UnsupportedOperationException`. Those need design discipline, documented contracts and tests (for example a shared contract test suite that every implementation must pass)"],
        code: `class Repo {
    public Animal find(String id) throws IOException { return new Animal(); }
}
class CachedRepo extends Repo {
    @Override public Dog find(String id) { return new Dog(); }   // OK: covariant return, fewer exceptions
    // protected Animal find(String id)              // won't compile: weaker access
    // public Animal find(String id) throws Exception // won't compile: broader checked exception
}` },

      { level: "Medium", q: "Your Tic-Tac-Toe solution has 14 interfaces and 3 factories, and the interviewer frowns. How do you decide which abstractions to keep?",
        a: ["Keep abstractions only at **axes of likely change**: the interviewer's hints (N×N board, more players, different win rules, a bot player) point to a `WinningStrategy` and a `Player` interface with `HumanPlayer`/`BotPlayer`",
            "Keep **seams** for things that are hard to test: input (a `MoveSource` instead of reading `System.in` directly) and maybe output",
            "Inline everything else: `Board`, `Cell`, `Symbol` and `Game` can be concrete. Remove factories that only call `new`",
            "Apply the rule of three and YAGNI: no abstraction without a second variation or a clear hint",
            "Say it out loud: \"I've kept two extension points, win rules and player type, because those are where this game changes; the rest is deliberately simple\""],
        follow: "What's the cost of an unnecessary interface? More files and indirection, slower reading, jumping around in navigation, and a false signal to the next developer that variation is expected there." },

      { level: "Hard", q: "Mini design: a checkout payment module. It must support UPI, cards and wallets now and BNPL next quarter, retry transient failures, run a fraud check before charging, and be unit-testable. Design it with SOLID and sketch the code.",
        steps: [
          ["Clarify", "Payment methods vary (OCP axis 1), cross-cutting behaviours like retry and fraud checks combine (axis 2), and gateways are external, volatile dependencies (DIP)."],
          ["Abstractions", "`PaymentMethod { PaymentResult pay(Money amount, PaymentContext ctx); }` with `UpiPayment`, `CardPayment` and `WalletPayment`; BNPL later is one new class."],
          ["Cross-cutting by composition", "`RetryingPayment` and `FraudCheckedPayment` *wrap* any `PaymentMethod` (Decorator), so there's no `RetryingUpiPayment`... explosion. `FraudChecker` is an interface (DIP)."],
          ["Orchestrator (SRP)", "`CheckoutService` validates the cart, asks a `PaymentMethodResolver` for the method the user chose, pays, and records the result via a `PaymentRepository`. It contains no gateway code."],
          ["Testability", "All dependencies are interfaces passed through constructors; tests use a fake gateway that fails twice and then succeeds, to prove the retries."],
          ["Extensions to mention", "Idempotency keys so retries don't double-charge, a timeout per attempt, and refunds via a separate `Refundable` role interface (ISP), since not every method supports them."]],
        m: M(["classDiagram",
          "  direction LR",
          "  class PaymentMethod {",
          "    <<interface>>",
          "    +pay(Money amount, PaymentContext ctx) PaymentResult",
          "  }",
          "  class Refundable {",
          "    <<interface>>",
          "    +refund(String paymentId, Money amount) void",
          "  }",
          "  class FraudChecker {",
          "    <<interface>>",
          "    +isSuspicious(PaymentContext ctx, Money amount) boolean",
          "  }",
          "  class RetryingPayment {",
          "    -PaymentMethod inner",
          "    -int maxAttempts",
          "  }",
          "  class FraudCheckedPayment {",
          "    -PaymentMethod inner",
          "    -FraudChecker checker",
          "  }",
          "  class CheckoutService {",
          "    +checkout(Cart cart, String methodId) Receipt",
          "  }",
          "  PaymentMethod <|.. UpiPayment",
          "  PaymentMethod <|.. CardPayment",
          "  Refundable <|.. CardPayment",
          "  PaymentMethod <|.. WalletPayment",
          "  PaymentMethod <|.. RetryingPayment",
          "  PaymentMethod <|.. FraudCheckedPayment",
          "  RetryingPayment o-- PaymentMethod",
          "  FraudCheckedPayment o-- PaymentMethod",
          "  FraudCheckedPayment --> FraudChecker",
          "  CheckoutService --> PaymentMethodResolver",
          "  CheckoutService --> PaymentRepository",
          "  PaymentMethodResolver ..> PaymentMethod"]),
        code: `public interface PaymentMethod { PaymentResult pay(Money amount, PaymentContext ctx); }
public interface FraudChecker  { boolean isSuspicious(PaymentContext ctx, Money amount); }

public class RetryingPayment implements PaymentMethod {
    private final PaymentMethod inner;
    private final int maxAttempts;
    public RetryingPayment(PaymentMethod inner, int maxAttempts) { this.inner = inner; this.maxAttempts = maxAttempts; }

    public PaymentResult pay(Money amount, PaymentContext ctx) {
        PaymentResult last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            last = inner.pay(amount, ctx);                 // same idempotency key on every attempt
            if (last.status() != PaymentStatus.TRANSIENT_FAILURE) return last;
        }
        return last;
    }
}

public class FraudCheckedPayment implements PaymentMethod {
    private final PaymentMethod inner;
    private final FraudChecker checker;
    public FraudCheckedPayment(PaymentMethod inner, FraudChecker checker) { this.inner = inner; this.checker = checker; }

    public PaymentResult pay(Money amount, PaymentContext ctx) {
        if (checker.isSuspicious(ctx, amount)) return PaymentResult.declined("fraud check");
        return inner.pay(amount, ctx);
    }
}

// Wiring (composition root): fraud check first, then retries around the real gateway call
PaymentMethod upi = new FraudCheckedPayment(new RetryingPayment(new UpiPayment(upiGateway), 3), fraudChecker);` },

      { level: "Hard", q: "Mini design: the parking lot is done. The interviewer adds (1) EV spots with chargers billed per kWh, (2) weekend flat pricing, and (3) a VIP floor reserved for members. Show how a SOLID design absorbs each change, and what you'd have to edit.",
        steps: [
          ["Starting point", "`EntryGate` → `SpotAllocationStrategy`; `ExitGate` → `PricingStrategy` and `TicketRepository`; `Spot` has a `SpotType` and size; and a `Clock` is injected."],
          ["(1) EV charging", "Model a charger as a *has-a* on the spot (`Optional<Charger> charger`), not an `EVSpot` subclass per size. Billing becomes `CompositePricing(parkingPricing, new EnergyPricing(ratePerKwh))`, which sums the components. New classes: `Charger`, `EnergyPricing`, `CompositePricing`. Edited: the allocation filter, which now prefers charger spots for EVs, as a *new* strategy `EvAwareAllocation` that wraps the old one."],
          ["(2) Weekend pricing", "`WeekendAwarePricing(weekday, weekend, clock)` delegates by day of week. It's one new class plus wiring. No `if (isWeekend)` inside `HourlyPricing`."],
          ["(3) VIP floor", "Floors get a `FloorPolicy` (`isEligible(Vehicle, Member)`); `ReservedFloorPolicy` checks membership. Allocation asks the policy before choosing a spot (OCP via a new policy). Member lookup is a `MembershipService` interface (DIP)."],
          ["What you edit", "Only `main` (the wiring), plus an `Optional<Member>` in the entry request. Existing strategies and gates stay untouched, which is the OCP payoff to point out to the interviewer."],
          ["Trade-off", "More small classes and composition to follow. Mitigate with clear names, and a `PricingFactory` that builds the pricing chain from configuration."]],
        m: M(["classDiagram",
          "  direction LR",
          "  class PricingStrategy {",
          "    <<interface>>",
          "    +fee(Ticket t, Instant exit) long",
          "  }",
          "  class CompositePricing {",
          "    -List~PricingStrategy~ parts",
          "  }",
          "  class WeekendAwarePricing {",
          "    -PricingStrategy weekday",
          "    -PricingStrategy weekend",
          "    -Clock clock",
          "  }",
          "  class SpotAllocationStrategy {",
          "    <<interface>>",
          "    +allocate(List~Floor~ floors, Vehicle v) Optional~Spot~",
          "  }",
          "  class EvAwareAllocation {",
          "    -SpotAllocationStrategy fallback",
          "  }",
          "  class FloorPolicy {",
          "    <<interface>>",
          "    +isEligible(Vehicle v, Member m) boolean",
          "  }",
          "  PricingStrategy <|.. HourlyPricing",
          "  PricingStrategy <|.. EnergyPricing",
          "  PricingStrategy <|.. CompositePricing",
          "  PricingStrategy <|.. WeekendAwarePricing",
          "  CompositePricing o-- PricingStrategy",
          "  WeekendAwarePricing o-- PricingStrategy",
          "  SpotAllocationStrategy <|.. NearestFirstStrategy",
          "  SpotAllocationStrategy <|.. EvAwareAllocation",
          "  EvAwareAllocation o-- SpotAllocationStrategy",
          "  FloorPolicy <|.. OpenFloorPolicy",
          "  FloorPolicy <|.. ReservedFloorPolicy",
          "  ReservedFloorPolicy --> MembershipService",
          "  Spot o-- Charger : optional",
          "  style EnergyPricing stroke:#15803d,stroke-width:2px",
          "  style WeekendAwarePricing stroke:#15803d,stroke-width:2px",
          "  style EvAwareAllocation stroke:#15803d,stroke-width:2px",
          "  style ReservedFloorPolicy stroke:#15803d,stroke-width:2px"]),
        code: `public class WeekendAwarePricing implements PricingStrategy {
    private final PricingStrategy weekday, weekend;
    private final ZoneId zone;
    public WeekendAwarePricing(PricingStrategy weekday, PricingStrategy weekend, ZoneId zone) {
        this.weekday = weekday; this.weekend = weekend; this.zone = zone;
    }
    public long fee(Ticket t, Instant exit) {
        DayOfWeek d = t.entryTime().atZone(zone).getDayOfWeek();
        boolean isWeekend = d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY;
        return (isWeekend ? weekend : weekday).fee(t, exit);
    }
}

public class CompositePricing implements PricingStrategy {
    private final List<PricingStrategy> parts;
    public CompositePricing(List<PricingStrategy> parts) { this.parts = List.copyOf(parts); }
    public long fee(Ticket t, Instant exit) { return parts.stream().mapToLong(p -> p.fee(t, exit)).sum(); }
}` },

      { level: "Hard", q: "Refactor this `LibraryManager` god class using all five principles. Explain which principle drives each change.",
        qcode: `public class LibraryManager {
    private final Map<String, Book> books = new HashMap<>();
    private final MySqlConnection db = new MySqlConnection("jdbc:mysql://lib");

    public void addBook(Book b) { books.put(b.isbn(), b); db.exec("INSERT ..."); }
    public List<Book> search(String q, String by) {
        if (by.equals("title"))  return books.values().stream().filter(b -> b.title().contains(q)).toList();
        if (by.equals("author")) return books.values().stream().filter(b -> b.author().contains(q)).toList();
        throw new IllegalArgumentException(by);
    }
    public void checkout(String isbn, Member m) {
        if (m.type().equals("STUDENT") && m.loans().size() >= 2) throw new IllegalStateException("limit");
        if (m.type().equals("FACULTY") && m.loans().size() >= 10) throw new IllegalStateException("limit");
        m.loans().add(isbn);
        System.out.println("SMS to " + m.phone() + ": borrowed " + isbn + ", due " + LocalDate.now().plusDays(14));
    }
    public long fine(Loan l) { return Math.max(0, ChronoUnit.DAYS.between(l.due(), LocalDate.now())) * 10; }
}`,
        steps: [
          ["SRP: split by reason to change", "Catalogue (add/search), lending (checkout/return), fines, and notifications become `CatalogService`, `LendingService`, `FineCalculator` and `Notifier`. Storage moves to `BookRepository` and `LoanRepository`."],
          ["OCP: search criteria and borrowing rules", "Search's `if (by.equals(...))` becomes a `SearchCriterion` interface (`ByTitle`, `ByAuthor`, later `ByIsbn` and `ByTag`). Borrowing limits move into a `BorrowingPolicy` per member type (`StudentPolicy` with a limit of 2, `FacultyPolicy` with 10), so a new member type is a new class."],
          ["LSP: member types", "Replace the stringly typed `m.type()` checks with a `Member` holding a `BorrowingPolicy` (composition), so no `Member` subtype throws or needs special-casing. Every policy honours `canBorrow(member)` and `loanPeriod()`."],
          ["ISP: client-shaped interfaces", "The kiosk needs `BookSearch` (read-only); librarians use `CatalogAdmin` (add/remove); members use `Lending`. Each client depends only on its role."],
          ["DIP: invert the infrastructure", "`MySqlConnection`, `System.out` SMS and `LocalDate.now()` become `BookRepository`, `Notifier` and an injected `Clock`. Wiring happens in `main` with in-memory repositories for the interview."],
          ["Result to say out loud", "\"Every requirement change now lands in one class: new search field, new member type, new fine rule or new channel. And every service is testable with fakes.\""]],
        code: `public interface SearchCriterion { boolean matches(Book b); }
public record ByTitle(String q)  implements SearchCriterion { public boolean matches(Book b) { return b.title().contains(q); } }
public record ByAuthor(String q) implements SearchCriterion { public boolean matches(Book b) { return b.author().contains(q); } }

public interface BorrowingPolicy { int maxLoans(); int loanDays(); }
public record StudentPolicy() implements BorrowingPolicy { public int maxLoans() { return 2; }  public int loanDays() { return 14; } }
public record FacultyPolicy() implements BorrowingPolicy { public int maxLoans() { return 10; } public int loanDays() { return 30; } }

public class LendingService {
    private final LoanRepository loans;
    private final Notifier notifier;
    private final Clock clock;
    public LendingService(LoanRepository loans, Notifier notifier, Clock clock) {
        this.loans = loans; this.notifier = notifier; this.clock = clock;
    }

    public Loan checkout(String isbn, Member m) {
        BorrowingPolicy p = m.policy();
        if (loans.activeCount(m.id()) >= p.maxLoans()) throw new IllegalStateException("loan limit reached");
        Loan loan = new Loan(isbn, m.id(), LocalDate.now(clock).plusDays(p.loanDays()));
        loans.save(loan);
        notifier.notify(m, "Borrowed " + isbn + ", due " + loan.due());
        return loan;
    }
}` },

      { level: "Hard", q: "SRP and DRY conflict: two teams' rules currently share one helper. The overtime calculation is used by both payroll (finance) and the hours report (operations), and it looks identical. Should you keep one shared method?",
        a: ["Not by default. DRY is about duplicated **knowledge**, not identical-looking code. If finance and operations can change overtime independently, these are two different pieces of knowledge that happen to coincide today",
            "Sharing them couples two actors: finance's change to overtime silently changes operations' report. That's exactly the accidental-duplication case Martin uses to motivate SRP",
            "Decision rule: ask \"if one changes, *must* the other change too?\" If yes (one business rule, such as tax law), share it in one place. If no, duplicate it deliberately and give each its own home (`PayrollOvertimePolicy`, `ReportingOvertimePolicy`)",
            "Make the choice visible: name both classes for their owner, and add a comment or test that documents that the duplication is intentional"],
        follow: "How do you spot the difference in an interview? Ask who requests changes to each use. Different stakeholders usually means separate code paths." }
    ],
    recap: [
      "SRP: one reason to change, meaning one actor. Split god classes into rules, storage and notification behind a thin orchestrator.",
      "OCP: find the axis of variation and put an interface there. New features arrive as new classes, and only `main` wiring changes.",
      "LSP: subtypes keep the base's contract (no stronger preconditions, weaker postconditions or surprise exceptions). Fix the hierarchy, never `instanceof`.",
      "ISP: small, client-shaped role interfaces; no stub methods. DIP: policy owns the abstractions and details implement them, wired by DI in a composition root.",
      "DIP ≠ DI ≠ IoC, and SOLID is a means: abstract the 2–3 places that will change, keep the rest simple, and finish with working code."
    ]
  });
})();
