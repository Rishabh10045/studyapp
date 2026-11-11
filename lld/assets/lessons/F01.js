/* Lesson F01: OOP fundamentals (classes, encapsulation, abstraction, inheritance, polymorphism, composition vs inheritance) */
(function () {
  "use strict";
  var H = window.LLD, esc = H.esc;

  var SLIDES = [
    { title: "Why OOP is the language of LLD",
      text: "A low-level design round asks you to turn requirements into a set of collaborating objects, then code them. OOP gives you the vocabulary: each object bundles **state** (fields) with the **behaviour** (methods) that is allowed to change it.",
      points: [
        "An object has state, behaviour and identity (two accounts with equal balances are still two accounts)",
        "A quick start: nouns in the requirements become classes, verbs become methods",
        "Interviewers grade your abstractions, how well state is protected, how easy the design is to extend, and how readable the code is",
        "This lesson covers the four pillars (encapsulation, abstraction, inheritance, polymorphism) plus the big trade-off: composition vs inheritance"],
      analogy: "A restaurant kitchen. Each station (grill, pastry, salads) owns its tools and does one job. The head chef coordinates by *asking* stations for dishes, never by grabbing their knives. Objects should work the same way.",
      m: "flowchart LR\n  R([\"<b>Requirement</b><br/><span class='d'>Members borrow and return books; late returns pay a fine</span>\"])\n  N[\"<b>Nouns → classes</b><br/><span class='d'>Member, Book, Loan, Fine</span>\"]:::s0\n  V[\"<b>Verbs → methods</b><br/><span class='d'>borrow(), giveBack(), calculateFine()</span>\"]:::s1\n  C[\"<b>Class diagram</b><br/><span class='d'>relationships + multiplicity</span>\"]:::s2\n  J[\"<b>Java code</b><br/><span class='d'>models → services → main()</span>\"]\n  R --> N\n  R --> V\n  N --> C\n  V --> C\n  C --> J" },

    { title: "Classes and objects",
      text: "A **class** is a blueprint: it declares fields, constructors and methods. An **object** is one instance built from it with `new`, with its own copy of the instance fields. Variables hold *references* to objects, not the objects themselves.",
      points: [
        "Instance fields: one copy per object; `static` fields: one copy shared by the class",
        "The constructor puts a new object into a valid state; `this` refers to the current object",
        "Store money in the smallest unit (`long` paise) or `BigDecimal`, never `double`",
        "Two references can point to the same object: after `BankAccount c = a;`, changes through `c` show up in `a`"],
      analogy: "A class is a cookie cutter; objects are the cookies. Same shape, but each cookie can get its own icing.",
      m: "classDiagram\n  class BankAccount {\n    -String id\n    -String owner\n    -long balancePaise\n    +BankAccount(String id, String owner)\n    +deposit(long paise) void\n    +getBalance() long\n  }",
      code: `public class BankAccount {
    private final String id;          // identity
    private final String owner;
    private long balancePaise;        // state: money in the smallest unit, never double

    public BankAccount(String id, String owner) {
        this.id = id;
        this.owner = owner;
    }

    public void deposit(long paise) { balancePaise += paise; }
    public long getBalance() { return balancePaise; }
}

// Two objects from one class, each with independent state
BankAccount a = new BankAccount("A-1", "Deepak");
BankAccount b = new BankAccount("A-2", "Riya");
a.deposit(50_000);
System.out.println(a.getBalance() + " " + b.getBalance());   // 50000 0` },

    { title: "Encapsulation: protect the invariants",
      m: "flowchart LR\n  C([\"<b>Caller</b>\"])\n  subgraph ACC[\"BankAccount\"]\n    W[\"<b>withdraw(paise)</b><br/><span class='d'>public: validates first</span>\"]:::s0\n    B[\"<b>balancePaise</b><br/><span class='d'>private state</span>\"]:::s2\n    H[\"<b>history</b><br/><span class='d'>private list</span>\"]:::s2\n  end\n  C -->|\"withdraw(500)\"| W\n  W -->|\"only if 0 < amount <= balance\"| B\n  W --> H\n  C -. \"acc.balance = -1 \u2717 no access\" .-> B",
      text: "Encapsulation means keeping state `private` and exposing only behaviour that keeps the object valid. An **invariant** is a rule that must always hold, such as \"balance is never negative\". If anyone can write the field, nobody can guarantee the rule.",
      points: [
        "No blind setters: `setBalance()` lets any caller break the invariant; `withdraw()` can check it",
        "Tell, don't ask: call `account.withdraw(x)`, don't do `if (acc.getBalance() >= x) acc.setBalance(...)` in the caller",
        "Don't leak mutable internals: return `Collections.unmodifiableList(...)` or a copy",
        "Fail fast in the constructor and methods with clear exceptions",
        "Bonus: when the rules live in one place, they change in one place"],
      analogy: "An ATM. You ask for cash and the machine checks your PIN and balance. You never reach into the vault yourself.",
      code: `public class BankAccount {
    private final String id;
    private long balancePaise;
    private final List<Transaction> history = new ArrayList<>();

    public BankAccount(String id) { this.id = Objects.requireNonNull(id); }

    public void deposit(long paise) {
        if (paise <= 0) throw new IllegalArgumentException("Deposit must be positive");
        balancePaise += paise;
        history.add(new Transaction(TxType.CREDIT, paise));
    }

    public void withdraw(long paise) {
        if (paise <= 0) throw new IllegalArgumentException("Withdrawal must be positive");
        if (paise > balancePaise) throw new InsufficientFundsException(id, paise, balancePaise);
        balancePaise -= paise;                       // invariant: balance >= 0 always holds
        history.add(new Transaction(TxType.DEBIT, paise));
    }

    public long getBalance() { return balancePaise; }

    // Callers get a read-only view, not the list itself
    public List<Transaction> getHistory() { return Collections.unmodifiableList(history); }
}` },

    { title: "Immutability and value objects",
      text: "The strongest form of encapsulation is an object that can't change after it is built. **Value objects** (Money, DateRange, Coordinates, SeatNumber) are defined by their values rather than an identity, and should be immutable. Java `record`s make this a one-liner.",
      points: [
        "To make a class immutable: `final` class, `private final` fields, no setters, defensive copies of mutable inputs",
        "Operations return a *new* object (`price.plus(tax)`), so the original never changes",
        "Immutable objects are thread-safe for free and safe as `HashMap` keys",
        "Records generate the constructor, accessors, `equals`, `hashCode` and `toString` from the fields",
        "Entities (Account, Order, User) have identity and change over time; value objects don't"],
      code: `public record Money(long amount, String currency) {
    public Money {                                   // compact constructor: validate once
        if (amount < 0) throw new IllegalArgumentException("negative amount");
        Objects.requireNonNull(currency, "currency");
    }

    public Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("currency mismatch");
        return new Money(amount + other.amount, currency);   // a NEW object
    }
}

Money price   = new Money(49_900, "INR");
Money withTax = price.plus(new Money(8_982, "INR"));
System.out.println(price);                          // Money[amount=49900, currency=INR]: unchanged
System.out.println(withTax.equals(new Money(58_882, "INR")));   // true: compared by value` },

    { title: "Abstraction: depend on what, not how",
      text: "Abstraction exposes *what* an object can do and hides *how* it does it. In Java you express it with an `interface` (a contract) or an `abstract class`. Client code depends on the abstraction, so implementations can change or multiply without touching the client.",
      points: [
        "`CheckoutService` knows only `PaymentMethod.pay()`; it doesn't care about UPI collect requests or card 3-D Secure",
        "Adding a new payment type means adding a class, not editing checkout",
        "Program to an interface: `List<Order> orders = new ArrayList<>();`",
        "Abstraction is about the client's point of view; encapsulation is about protecting the object's insides. They work together"],
      analogy: "Car pedals. The accelerator works the same whether the engine is petrol, diesel or electric. The driver depends on the pedal, not the engine.",
      m: "classDiagram\n  direction LR\n  class PaymentMethod {\n    <<interface>>\n    +pay(Money amount) PaymentResult\n    +supportsRefund() boolean\n  }\n  class UpiPayment {\n    -String vpa\n    +pay(Money amount) PaymentResult\n  }\n  class CardPayment {\n    -String token\n    +pay(Money amount) PaymentResult\n  }\n  class WalletPayment {\n    -String walletId\n    +pay(Money amount) PaymentResult\n  }\n  class CheckoutService {\n    +checkout(Cart cart, PaymentMethod m) Receipt\n  }\n  PaymentMethod <|.. UpiPayment\n  PaymentMethod <|.. CardPayment\n  PaymentMethod <|.. WalletPayment\n  CheckoutService ..> PaymentMethod : uses",
      code: `public interface PaymentMethod {
    PaymentResult pay(Money amount);                   // WHAT, not HOW
    default boolean supportsRefund() { return true; }
}

public class UpiPayment implements PaymentMethod {
    private final String vpa;
    public UpiPayment(String vpa) { this.vpa = vpa; }

    @Override
    public PaymentResult pay(Money amount) {
        // talk to the UPI switch, raise a collect request, poll for status...
        return PaymentResult.success("UPI-" + System.nanoTime());
    }
}

public class CheckoutService {
    public Receipt checkout(Cart cart, PaymentMethod method) {   // depends on the abstraction
        PaymentResult result = method.pay(cart.total());
        return Receipt.from(cart, result);
    }
}` },

    { title: "Interface or abstract class?",
      m: "classDiagram\n  direction LR\n  class Notifier {\n    <<interface>>\n    +send(Message m) void\n  }\n  class Notification {\n    <<abstract>>\n    #String recipient\n    -Instant createdAt\n    +send() void\n    #validate() void\n    #render()* String\n    #deliver(String body)* void\n  }\n  class EmailNotification {\n    #render() String\n    #deliver(String body) void\n  }\n  class SmsNotification {\n    #render() String\n    #deliver(String body) void\n  }\n  Notification <|-- EmailNotification\n  Notification <|-- SmsNotification\n  Notifier <|.. SlackNotifier\n  Notifier <|.. PagerNotifier",
      text: "Both are abstractions. Start with an **interface** for a capability or contract. Reach for an **abstract class** when the implementations genuinely share state or a fixed sequence of steps.",
      points: [
        "Rule of thumb: an interface first; an abstract class when implementations share fields, constructor logic or a fixed algorithm",
        "An abstract class with a `final` method that calls abstract steps is the Template Method pattern (F21)",
        "You can combine them: `interface Notifier` + `abstract class BaseNotifier implements Notifier`"],
      table: [
        ["Aspect", "interface", "abstract class"],
        ["State", "Only constants (`static final`)", "Instance fields"],
        ["Constructor", "No", "Yes, called by subclasses via `super(...)`"],
        ["How many per class", "A class can implement many", "A class can extend only one"],
        ["Methods", "abstract, `default`, `static`, `private` (Java 9+)", "Any kind, including `protected` and `final`"],
        ["Best for", "Capabilities: `Comparable`, `PaymentMethod`, `Notifier`", "A shared base with common state plus a partial implementation"],
        ["Evolving it", "Add `default` methods carefully", "Add concrete methods freely"]],
      code: `public abstract class Notification {
    protected final String recipient;
    private final Instant createdAt = Instant.now();      // shared state

    protected Notification(String recipient) { this.recipient = recipient; }

    // Fixed flow (template method); subclasses fill in the steps that vary
    public final void send() {
        validate();
        deliver(render());
        System.out.println("sent at " + createdAt);
    }

    protected void validate() {
        if (recipient == null || recipient.isBlank()) throw new IllegalStateException("no recipient");
    }
    protected abstract String render();
    protected abstract void deliver(String body);
}` },

    { title: "Inheritance: is-a reuse",
      text: "With inheritance, a subclass `extends` a parent, inherits its non-private members, and can **override** methods to specialize them. Use it for a true **is-a** relationship: every `Truck` is a `Vehicle`, and it works anywhere a `Vehicle` is expected.",
      points: [
        "A subclass constructor must call `super(...)` first, explicitly or implicitly",
        "Always write `@Override`: the compiler catches typos that would silently create a new method",
        "Java allows one superclass but many interfaces",
        "`protected` means visible to subclasses (and the same package); `final` on a class or method blocks overriding",
        "The is-a test is stricter than it sounds: the subclass must keep all of the parent's promises (Liskov, see F02)"],
      analogy: "A job-title hierarchy on paper: every Senior Engineer is an Engineer. It's neat until people change roles. Keep that in mind for later.",
      m: "classDiagram\n  class Vehicle {\n    <<abstract>>\n    -String plate\n    +plate() String\n    +size()* VehicleSize\n  }\n  class Car {\n    +size() VehicleSize\n  }\n  class Bike {\n    +size() VehicleSize\n  }\n  class Truck {\n    -int axles\n    +size() VehicleSize\n  }\n  Vehicle <|-- Car\n  Vehicle <|-- Bike\n  Vehicle <|-- Truck",
      code: `public abstract class Vehicle {
    private final String plate;
    protected Vehicle(String plate) { this.plate = plate; }

    public String plate() { return plate; }
    public abstract VehicleSize size();

    @Override
    public String toString() { return getClass().getSimpleName() + "(" + plate + ")"; }
}

public class Car extends Vehicle {
    public Car(String plate) { super(plate); }              // parent constructor runs first
    @Override public VehicleSize size() { return VehicleSize.MEDIUM; }
}

public class Truck extends Vehicle {
    private final int axles;
    public Truck(String plate, int axles) { super(plate); this.axles = axles; }
    @Override public VehicleSize size() { return VehicleSize.LARGE; }
}` },

    { title: "When inheritance goes wrong",
      m: "sequenceDiagram\n  participant C as Client\n  participant CS as CountingSet (your subclass)\n  participant HS as HashSet / AbstractCollection\n  C->>CS: addAll([a, b, c])\n  Note over CS: addCount += 3  (now 3)\n  CS->>HS: super.addAll([a, b, c])\n  loop for each element\n    HS->>CS: add(e)  (dynamic dispatch: YOUR override)\n    Note over CS: addCount++  (4, 5, 6)\n    CS->>HS: super.add(e)\n  end\n  CS-->>C: getAddCount() = 6",
      text: "Inheritance is the tightest coupling in OOP: a subclass depends on its parent's *implementation*, not just its interface. When the parent changes, or behaves differently than you assumed, the subclass breaks. This is the **fragile base class** problem.",
      points: [
        "Below, `HashSet.addAll()` (inherited from `AbstractCollection`) calls `add()` for each element, so every element is counted twice",
        "Liskov violation: `Square extends Rectangle` breaks callers that set width and height independently",
        "Inheriting just to reuse code: `java.util.Stack extends Vector`, so a stack exposes `get(i)` and `insertElementAt`",
        "Deep hierarchies (more than 2–3 levels) are hard to read and change",
        "Combining features by subclassing leads to a class explosion (try the widget below)"],
      code: `// Goal: count how many elements were ever added
public class CountingSet<E> extends HashSet<E> {
    private int addCount = 0;

    @Override public boolean add(E e) {
        addCount++;
        return super.add(e);
    }

    @Override public boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return super.addAll(c);          // internally calls add() for each element!
    }

    public int getAddCount() { return addCount; }
}

CountingSet<String> s = new CountingSet<>();
s.addAll(List.of("a", "b", "c"));
System.out.println(s.getAddCount());     // 6, not 3` },

    { title: "Polymorphism: one call, many behaviours",
      m: "classDiagram\n  direction LR\n  class Shape {\n    <<interface>>\n    +area() double\n  }\n  class Circle {\n    <<record>>\n    +double r\n    +area() double\n  }\n  class Rect {\n    <<record>>\n    +double w\n    +double h\n    +area() double\n  }\n  class AreaCalculator {\n    +total(List~Shape~ shapes) double\n  }\n  Shape <|.. Circle\n  Shape <|.. Rect\n  AreaCalculator ..> Shape : calls area()",
      text: "Polymorphism lets one piece of code work with many types. **Overriding** is resolved at *runtime* from the object's actual class (dynamic dispatch). **Overloading** is resolved at *compile time* from the declared types of the arguments.",
      points: [
        "The loop below never mentions `Circle` or `Rect`, yet calls the right `area()`",
        "`static` methods are *hidden*, not overridden: the declared type decides",
        "Fields are never polymorphic: `p.name` uses the declared type",
        "Upcasting (`Shape s = new Circle(1)`) is implicit; downcasting needs a cast and can throw `ClassCastException`, so prefer `instanceof` pattern matching"],
      table: [
        ["", "Overloading", "Overriding"],
        ["Also called", "Compile-time (static) polymorphism", "Runtime (dynamic) polymorphism"],
        ["Shape", "Same name, different parameter lists", "Same signature in a subclass"],
        ["Decided by", "The compiler, from declared argument types", "The JVM, from the object's actual class"],
        ["Works for static methods?", "Yes", "No: static methods are hidden"],
        ["Typical use", "Convenience variants: `print(int)`, `print(String)`", "Specialized behaviour: `area()`, `pay()`, `send()`"]],
      code: `public interface Shape { double area(); }
public record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }
public record Rect(double w, double h) implements Shape { public double area() { return w * h; } }

List<Shape> shapes = List.of(new Circle(1), new Rect(2, 3));
double total = 0;
for (Shape s : shapes) total += s.area();      // which area()? decided at RUNTIME

// Overloading: chosen at COMPILE time from the declared argument type
class Printer {
    void print(Shape s)  { System.out.println("some shape"); }
    void print(Circle c) { System.out.println("a circle"); }
}
Shape s = new Circle(1);
new Printer().print(s);                         // "some shape": the declared type is Shape` },

    { title: "Replace conditionals with polymorphism",
      m: "flowchart LR\n  subgraph BEFORE[\"Before: switch on type\"]\n    F[\"<b>fee(vehicle, hours)</b><br/><span class='d'>switch (type)</span>\"]:::bad\n    F --> c1[\"case CAR\"]\n    F --> c2[\"case BIKE\"]\n    F --> c3[\"case TRUCK\"]\n    F -.-> c4[\"case EV? edit here and in every other switch\"]:::bad\n  end\n  subgraph AFTER[\"After: polymorphism\"]\n    P[\"<b>FeePolicy</b><br/><span class='d'>interface: fee(hours)</span>\"]:::s0\n    P --> a1[\"CarFee\"]\n    P --> a2[\"BikeFee\"]\n    P --> a3[\"TruckFee\"]\n    P -.-> a4[\"EvFee: just add a class\"]:::s2\n  end",
      text: "A `switch` on a type code tends to repeat in every method that cares about the type (fee, size, display name...). Each new type means hunting down every switch. Give each type its own class behind an interface instead, and the switch disappears.",
      points: [
        "Adding an `EV` type now means adding one class: the Open/Closed principle (F02)",
        "This is the Strategy pattern (F17) in miniature",
        "One `switch` inside a factory that *creates* the right object is fine; the smell is the same switch copied across many methods",
        "Java 21's sealed interfaces with pattern-matching `switch` are a modern alternative when the set of types is closed and the operations change often"],
      code: `// BEFORE: every new vehicle type means editing this method (and every one like it)
long fee(Vehicle v, long hours) {
    switch (v.type()) {
        case CAR:   return 40 * hours;
        case BIKE:  return 20 * hours;
        case TRUCK: return 100 * hours + 200;
        default: throw new IllegalArgumentException("unknown type " + v.type());
    }
}

// AFTER: each type owns its rule
public interface FeePolicy { long fee(long hours); }
class CarFee   implements FeePolicy { public long fee(long h) { return 40 * h; } }
class BikeFee  implements FeePolicy { public long fee(long h) { return 20 * h; } }
class TruckFee implements FeePolicy { public long fee(long h) { return 100 * h + 200; } }

Map<VehicleType, FeePolicy> policies = Map.of(
        VehicleType.CAR, new CarFee(),
        VehicleType.BIKE, new BikeFee(),
        VehicleType.TRUCK, new TruckFee());
long fee = policies.get(vehicle.type()).fee(hours);` },

    { title: "Composition and delegation: has-a",
      text: "With composition, an object is built from other objects and **delegates** work to them. A `Car` *has an* `Engine`; it isn't one. Inject the parts through the constructor and you can swap behaviour without writing a new subclass.",
      points: [
        "Delegation: `car.start()` forwards to `engine.start()`",
        "Depend on an interface (`Engine`), so a test can pass in a fake engine",
        "New behaviour = a new part, not a new subclass of `Car`",
        "Only the parts' public API is used, so their internals can change freely",
        "In UML, a filled diamond is composition (the part lives and dies with the whole) and a hollow one is aggregation (more in F03)"],
      analogy: "Lego versus a carved sculpture. With Lego you swap one brick to change the model; with a sculpture you start over.",
      m: "classDiagram\n  direction LR\n  class Engine {\n    <<interface>>\n    +start() void\n    +horsepower() int\n  }\n  class Car {\n    -Engine engine\n    -List~Wheel~ wheels\n    +start() void\n  }\n  Car \"1\" *-- \"4\" Wheel : composition\n  Car o-- Engine : injected\n  Engine <|.. PetrolEngine\n  Engine <|.. ElectricEngine",
      code: `public interface Engine { void start(); int horsepower(); }

public class PetrolEngine implements Engine {
    public void start() { System.out.println("vroom"); }
    public int horsepower() { return 120; }
}
public class ElectricEngine implements Engine {
    public void start() { System.out.println("hum"); }
    public int horsepower() { return 150; }
}

public class Car {
    private final Engine engine;                 // has-a
    private final List<Wheel> wheels;

    public Car(Engine engine) {                  // injected: easy to swap and to test
        this.engine = Objects.requireNonNull(engine);
        this.wheels = List.of(new Wheel(), new Wheel(), new Wheel(), new Wheel());
    }

    public void start() { engine.start(); }      // delegation
}

Car city = new Car(new PetrolEngine());
Car ev   = new Car(new ElectricEngine());        // new behaviour, no new Car subclass` },

    { title: "Composition vs inheritance: the trade-off",
      m: "flowchart LR\n  Q1{\"Is it a true is-a?<br/>Does the subclass keep every promise of the base (Liskov)?\"}\n  Q2{\"Is the base designed for extension,<br/>and do you control it?\"}\n  Q3{\"Does behaviour vary, combine,<br/>or need to change at runtime?\"}\n  I[\"<b>Inheritance is fine</b><br/><span class='d'>keep the hierarchy shallow</span>\"]:::s1\n  C[\"<b>Compose</b><br/><span class='d'>interface + delegation</span>\"]:::s0\n  Q1 -- no --> C\n  Q1 -- yes --> Q2\n  Q2 -- no --> C\n  Q2 -- yes --> Q3\n  Q3 -- yes --> C\n  Q3 -- no --> I",
      text: "\"Favour composition over inheritance\" (Gang of Four, 1994; *Effective Java* Item 18) is a default, not a ban. Inheritance is right for a genuine, stable is-a that you control. Composition is right whenever behaviour varies, combines, or must change at runtime.",
      points: [
        "Inherit when there is a true is-a that passes the Liskov test, the base class is designed and documented for extension, and you own both classes",
        "Compose when behaviour varies per instance, features combine (retry + logging + encryption), or a part must be swappable or mockable",
        "A useful middle ground: inherit an *interface* (no implementation coupling) and compose the implementation",
        "Say it in the interview: \"I'll use an interface plus composition here because pricing varies independently of vehicle type\""],
      table: [
        ["Aspect", "Inheritance (is-a)", "Composition (has-a)"],
        ["Coupling", "Tight: the subclass depends on the parent's internals", "Loose: only the part's public interface"],
        ["When it's fixed", "Compile time", "Runtime: swap the part"],
        ["What you expose", "Everything the parent exposes, wanted or not", "Only the methods you choose to forward"],
        ["Combining features", "Class explosion (M × 2ⁿ subclasses)", "Mix and match objects (M + n classes)"],
        ["Testing", "Test through the hierarchy", "Inject fakes or mocks"],
        ["Cost", "Very little code", "Some forwarding boilerplate"],
        ["Good fit", "Stable taxonomies, framework hooks, Template Method", "Strategies, decorators, plug-ins, roles that change"]] },

    { title: "Putting it together: a notification system",
      text: "A small design that uses every idea from this lesson. `Message` is an immutable value object. `Notifier` is the abstraction. Email and SMS are polymorphic implementations. Retry is added by **composition** (it wraps any notifier), and the service holds a polymorphic list.",
      points: [
        "Encapsulation: `Message` is a record; `NotificationService` copies its list with `List.copyOf`",
        "Abstraction + polymorphism: the service calls `send()` without knowing the channel",
        "Composition: `RetryingNotifier` adds retries to *any* channel, so there's no `RetryingEmailNotifier`, `RetryingSmsNotifier`...",
        "That wrapper is the Decorator pattern (F11), and you've just used it"],
      m: "classDiagram\n  direction LR\n  class Notifier {\n    <<interface>>\n    +send(Message m) void\n  }\n  class Message {\n    <<record>>\n    +String to\n    +String subject\n    +String body\n  }\n  class RetryingNotifier {\n    -Notifier inner\n    -int maxAttempts\n    +send(Message m) void\n  }\n  class NotificationService {\n    -List~Notifier~ channels\n    +broadcast(Message m) void\n  }\n  Notifier <|.. EmailNotifier\n  Notifier <|.. SmsNotifier\n  Notifier <|.. RetryingNotifier\n  RetryingNotifier o-- Notifier : wraps\n  NotificationService o-- \"many\" Notifier\n  Notifier ..> Message",
      code: `public record Message(String to, String subject, String body) {}

public interface Notifier { void send(Message m); }

public class EmailNotifier implements Notifier {
    @Override public void send(Message m) { System.out.println("EMAIL to " + m.to() + ": " + m.subject()); }
}
public class SmsNotifier implements Notifier {
    @Override public void send(Message m) { System.out.println("SMS to " + m.to() + ": " + m.body()); }
}

// Composition: adds retry to ANY notifier without subclassing each one
public class RetryingNotifier implements Notifier {
    private final Notifier inner;
    private final int maxAttempts;

    public RetryingNotifier(Notifier inner, int maxAttempts) {
        this.inner = inner;
        this.maxAttempts = maxAttempts;
    }

    @Override public void send(Message m) {
        for (int attempt = 1; ; attempt++) {
            try { inner.send(m); return; }
            catch (RuntimeException e) { if (attempt == maxAttempts) throw e; }
        }
    }
}

public class NotificationService {
    private final List<Notifier> channels;               // a polymorphic collection
    public NotificationService(List<Notifier> channels) { this.channels = List.copyOf(channels); }
    public void broadcast(Message m) { channels.forEach(c -> c.send(m)); }
}

public class Main {
    public static void main(String[] args) {
        var service = new NotificationService(List.of(
                new RetryingNotifier(new EmailNotifier(), 3),
                new SmsNotifier()));
        service.broadcast(new Message("deepak", "Order shipped", "Order #42 is on its way"));
    }
}` },

    { title: "Java object essentials interviewers check",
      text: "A few Java details come up in almost every LLD round: access modifiers, `equals`/`hashCode`, and `==` versus `equals`. Getting them wrong produces bugs that look like design flaws.",
      points: [
        "If you override `equals`, override `hashCode` too, or `HashSet` and `HashMap` will lose your objects",
        "Entities are equal by id (ISBN, accountId); value objects by all their fields (records do this for you)",
        "`==` compares references; `equals` compares meaning",
        "Write `equals(Object o)`, not `equals(Book b)`: the latter is an *overload* that collections never call, and `@Override` catches the mistake",
        "Don't call overridable methods from a constructor: the subclass's fields aren't initialized yet"],
      table: [
        ["Modifier", "Same class", "Same package", "Subclass (other package)", "Everywhere"],
        ["`private`", "✓", "✗", "✗", "✗"],
        ["(none: package-private)", "✓", "✓", "✗", "✗"],
        ["`protected`", "✓", "✓", "✓", "✗"],
        ["`public`", "✓", "✓", "✓", "✓"]],
      code: `public final class Book {
    private final String isbn;
    private final String title;

    public Book(String isbn, String title) { this.isbn = isbn; this.title = title; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Book other)) return false;   // pattern matching (Java 16+)
        return isbn.equals(other.isbn);                 // entity identity = ISBN
    }

    @Override public int hashCode() { return isbn.hashCode(); }   // must agree with equals

    @Override public String toString() { return "Book[" + isbn + ", " + title + "]"; }
}` }
  ];

  /* ---------- Interactive widget: two tools ---------- */
  var CHANNELS = ["Email", "SMS", "Push", "Slack", "WhatsApp"];
  var ADDONS = [["Retry", "RetryingNotifier"], ["Logging", "LoggingNotifier"], ["Encryption", "EncryptingNotifier"], ["RateLimit", "RateLimitedNotifier"], ["Metrics", "MetricsNotifier"]];

  var DECL = ["Animal", "Dog"], RUNT = ["Animal", "Dog", "Puppy"];
  var CALLS = [
    ["a.speak()", "overridden instance method"],
    ["a.kind()", "static method"],
    ["a.name", "field"],
    ["a.fetch()", "Dog-only method"],
    ["((Dog) a).fetch()", "downcast"],
    ["vet.treat(a)", "overloaded method"]
  ];
  var DISPATCH_SRC = [
    "class Animal {",
    "    String name = \"animal\";",
    "    String speak() { return \"...\"; }",
    "    static String kind() { return \"Animal.kind\"; }",
    "}",
    "class Dog extends Animal {",
    "    String name = \"dog\";",
    "    @Override String speak() { return \"Woof\"; }",
    "    static String kind() { return \"Dog.kind\"; }",
    "    String fetch() { return \"fetching!\"; }",
    "}",
    "class Puppy extends Dog {",
    "    @Override String speak() { return \"Yip\"; }",
    "}",
    "class Vet {",
    "    String treat(Animal a) { return \"treat(Animal)\"; }",
    "    String treat(Dog d)    { return \"treat(Dog)\"; }",
    "}"].join("\n");

  function dispatch(decl, run, call) {
    if (decl === "Dog" && run === "Animal") return ["err", "Compile error: incompatible types", "An `Animal` is not necessarily a `Dog`, so `Dog a = new Animal()` doesn't compile. You can only assign a subtype to a supertype variable (upcasting)."];
    var speak = { Animal: "...", Dog: "Woof", Puppy: "Yip" };
    if (call === 0) return ["ok", "\"" + speak[run] + "\"", "**Runtime type** wins. Overridden methods use dynamic dispatch: the JVM looks at the actual object (`" + run + "`), not the variable's type (`" + decl + "`)." + (run === "Puppy" ? " `Puppy` overrides `speak()` itself." : "")];
    if (call === 1) return ["warn", "\"" + decl + ".kind\"", "**Declared type** wins. Static methods are *hidden*, not overridden, so the compiler binds `a.kind()` to `" + decl + ".kind()`. Most IDEs warn you to write `" + decl + ".kind()` instead." + (run !== decl ? " The `" + run + "` object makes no difference." : "")];
    if (call === 2) return ["warn", "\"" + (decl === "Animal" ? "animal" : "dog") + "\"", "**Declared type** wins. Fields are never polymorphic: `Dog.name` *hides* `Animal.name`, and a Dog object contains both fields. One more reason to keep fields private and expose methods."];
    if (call === 3) return decl === "Animal"
      ? ["err", "Compile error: cannot find symbol fetch()", "The compiler only knows that `a` is an `Animal`, and `Animal` has no `fetch()`, even though the object really is a `" + run + "`. The declared type decides which methods you can call."]
      : ["ok", "\"fetching!\"", "The declared type `Dog` has `fetch()`, so it compiles; `" + run + "` inherits it."];
    if (call === 4) return run === "Animal"
      ? ["err", "Runtime error: ClassCastException", "It compiles (the cast tells the compiler to trust you), but at runtime the object is a plain `Animal`, not a `Dog`. Guard it with pattern matching: `if (a instanceof Dog d) d.fetch();`"]
      : ["ok", "\"fetching!\"", "The cast succeeds because the object really is a `" + run + "`" + (run === "Puppy" ? " (a Puppy is a Dog)" : "") + "." + (decl === "Dog" ? " Here the cast isn't even needed." : " Frequent downcasts are a smell: maybe the method belongs on the base type or an interface.")];
    return ["warn", "\"treat(" + decl + ")\"", "**Declared type** wins. The compiler picks the overload from the argument's declared type (`" + decl + "`), even though the object is a `" + run + "`. Overloading is compile-time polymorphism; for a runtime choice, use overriding (or the Visitor pattern, F25)."];
  }

  function widget(el, ctx) {
    var s = ctx.state;
    if (s.tab === undefined) { s.tab = 0; s.ch = 3; s.add = [true, true, false, false, false]; s.decl = 0; s.run = 1; s.call = 0; }
    el.innerHTML = "<div class='seg' data-r='tabs'><button type='button' data-t='0'>Composition vs inheritance</button><button type='button' data-t='1'>Who gets called? (dispatch)</button></div><div data-r='pane'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function pq(r) { return q("pane").querySelector("[data-r='" + r + "']"); }

    function compPane() {
      q("pane").innerHTML = "<p>You're designing notifications. Pick how many channels you support and which cross-cutting features a message can have, in any combination. Then compare how many classes each design needs.</p>" +
        "<div style='margin-top:14px'><label class='field'>Channels: <strong data-r='chn' style='color:var(--text)'></strong></label><input type='range' min='1' max='5' step='1' data-r='ch' aria-label='Number of channels'><div class='rangeends'><span>1</span><span>5</span></div></div>" +
        "<div style='margin-top:14px'><div class='field' style='margin-bottom:6px'>Optional features</div><div class='checks' data-r='adds'></div></div>" +
        "<div class='counter' data-r='counts' style='margin-top:16px'></div><div data-r='bars' class='card' style='margin-top:12px'></div><p data-r='msg' style='margin-top:12px'></p><div data-r='code' style='margin-top:12px'></div>";
      pq("ch").value = String(s.ch);
      pq("adds").innerHTML = ADDONS.map(function (a, i) { return "<label><input type='checkbox' data-i='" + i + "'" + (s.add[i] ? " checked" : "") + "> " + esc(a[0]) + "</label>"; }).join("");
      pq("ch").addEventListener("input", function (e) { s.ch = Number(e.target.value); ctx.save(); compDraw(); });
      pq("adds").addEventListener("change", function (e) { var i = Number(e.target.getAttribute("data-i")); s.add[i] = e.target.checked; ctx.save(); compDraw(); });
      compDraw();
    }
    function compDraw() {
      var n = s.add.filter(Boolean).length, ch = s.ch;
      var inh = ch * Math.pow(2, n), comp = 1 + ch + n;
      pq("chn").textContent = ch + " (" + CHANNELS.slice(0, ch).join(", ") + ")";
      pq("counts").innerHTML =
        "<div class='metric'><div class='v' style='color:var(--danger)'>" + inh + "</div><div class='l'>Classes with inheritance<br>(" + ch + " channels × 2<sup>" + n + "</sup> feature combinations)</div></div>" +
        "<div class='metric'><div class='v' style='color:var(--success)'>" + comp + "</div><div class='l'>Classes with composition<br>(1 interface + " + ch + " channels + " + n + " wrappers)</div></div>";
      var max = Math.max(inh, comp);
      pq("bars").innerHTML = "<div class='bars'>" +
        "<div class='bar'><span>Inheritance</span><span class='track'><span class='fill' style='width:" + Math.round(inh / max * 100) + "%;background:var(--danger)'></span></span><span class='val'>" + inh + "</span></div>" +
        "<div class='bar'><span>Composition</span><span class='track'><span class='fill' style='width:" + Math.max(2, Math.round(comp / max * 100)) + "%;background:var(--success)'></span></span><span class='val'>" + comp + "</span></div></div>";
      var picked = ADDONS.filter(function (_, i) { return s.add[i]; });
      var names = picked.map(function (a) { return a[0]; }).join("");
      pq("msg").innerHTML = n === 0
        ? "With no optional features, both designs are about the same size, so inheritance isn't hurting you yet. Tick a feature."
        : "With inheritance you'd need classes like <code>" + esc(names + CHANNELS[0] + "Notifier") + "</code> for every combination, and one more feature doubles the count to <strong>" + (inh * 2) + "</strong>. With composition, one more feature is just <strong>one</strong> more wrapper class.";
      var inner = "new " + CHANNELS[0] + "Notifier()";
      picked.slice().reverse().forEach(function (a) { inner = "new " + a[1] + "(" + inner + ")"; });
      pq("code").innerHTML = ctx.H.codeBlock("// Composition: stack exactly the features this message needs, at runtime\nNotifier n = " + inner + ";\nn.send(message);");
    }

    function dispPane() {
      q("pane").innerHTML = "<p>Predict the output, then check. Pick the variable's <strong>declared type</strong>, the object's <strong>runtime type</strong> and an expression, as in <code>X a = new Y();</code></p>" +
        "<div style='margin-top:12px'>" + ctx.H.codeBlock(DISPATCH_SRC) + "</div>" +
        "<div class='controls' style='margin-top:14px'><div class='field'>Declared type<span class='seg' data-r='decl'></span></div><div class='field'>Runtime object<span class='seg' data-r='run'></span></div></div>" +
        "<div class='field' style='margin-top:12px'>Expression<span class='seg' data-r='call'></span></div>" +
        "<div data-r='stmt' style='margin-top:14px'></div><div class='result' data-r='res' style='margin-top:12px'></div>" +
        "<div class='tablewrap' data-r='grid' style='margin-top:14px'></div>";
      function segs(r, list, cur, label) {
        pq(r).innerHTML = list.map(function (x, i) { return "<button type='button' data-i='" + i + "' class='" + (i === cur ? "on" : "") + "'>" + esc(label ? label(x) : x) + "</button>"; }).join("");
      }
      function draw() {
        segs("decl", DECL, s.decl); segs("run", RUNT, s.run); segs("call", CALLS, s.call, function (c) { return c[0]; });
        var d = DECL[s.decl], r = RUNT[s.run], c = CALLS[s.call];
        pq("stmt").innerHTML = ctx.H.codeBlock(d + " a = new " + r + "();\n" + (s.call === 5 ? "Vet vet = new Vet();\n" : "") + "System.out.println(" + c[0] + ");   // " + c[1]);
        var out = dispatch(d, r, s.call);
        var res = pq("res");
        res.className = "result " + out[0];
        res.innerHTML = "<div class='out'>" + esc(out[1]) + "</div><p style='margin-top:6px'>" + ctx.md(out[2]) + "</p>";
        pq("grid").innerHTML = "<table><thead><tr><th>What</th><th>Decided by</th></tr></thead><tbody>" +
          [["Overridden method `speak()`", "Runtime type (dynamic dispatch)"], ["Static method `kind()`", "Declared type (hiding)"], ["Field `name`", "Declared type"], ["Which methods compile", "Declared type"], ["Which overload of `treat(...)`", "Declared type of the argument"], ["Whether a cast succeeds", "Runtime type"]]
            .map(function (row) { return "<tr><td>" + ctx.md(row[0]) + "</td><td>" + ctx.md(row[1]) + "</td></tr>"; }).join("") + "</tbody></table>";
      }
      ["decl", "run", "call"].forEach(function (k) {
        pq(k).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s[k] = Number(b.getAttribute("data-i")); ctx.save(); draw(); });
      });
      draw();
    }

    function drawTabs() {
      Array.prototype.forEach.call(q("tabs").querySelectorAll("button"), function (b) { b.className = Number(b.getAttribute("data-t")) === s.tab ? "on" : ""; });
      if (s.tab === 0) compPane(); else dispPane();
    }
    q("tabs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.tab = Number(b.getAttribute("data-t")); ctx.save(); drawTabs(); });
    drawTabs();
  }

  var QUIZ = [
    { q: "Which statement best describes encapsulation?", options: ["Putting every class in its own file", "Bundling state with the behaviour that changes it, and restricting direct access so the object's rules (invariants) always hold", "Making every field `public` so it's easy to test", "Inheriting fields from a parent class"], answer: 1,
      why: "Encapsulation is about protecting invariants: private state plus methods like `withdraw()` that validate before changing it. A getter and setter for every field is not encapsulation." },
    { q: "What does this print?", code: "class Animal { String speak() { return \"...\"; } }\nclass Dog extends Animal { @Override String speak() { return \"Woof\"; } }\n\nAnimal a = new Dog();\nSystem.out.println(a.speak());",
      options: ["`...`", "`Woof`", "Compile error", "`ClassCastException`"], answer: 1,
      why: "Overridden instance methods use dynamic dispatch: the JVM calls the method of the actual object's class (`Dog`), whatever the variable's declared type." },
    { q: "`Parent p = new Child();` and both classes declare `static String who()`. What does `p.who()` call?", options: ["`Child.who()`, because the object is a Child", "`Parent.who()`, because static methods are bound to the declared type", "It doesn't compile", "It depends on the JVM"], answer: 1,
      why: "Static methods are hidden, not overridden. The compiler binds the call to the declared type, `Parent`. Call static methods through the class name to avoid the confusion." },
    { q: "`CountingSet extends HashSet` and overrides both `add()` (counter++) and `addAll()` (counter += size, then `super.addAll`). After `addAll(List.of(\"a\", \"b\", \"c\"))`, what is the count?", options: ["3", "6", "0", "It throws"], answer: 1,
      why: "The inherited `addAll` calls `add()` for each element, and that `add()` is your override, so each element is counted twice. That's the fragile base class problem: you depended on an implementation detail of the parent. Composition (wrapping a Set) avoids it." },
    { q: "A class overrides `equals()` to compare by ISBN but doesn't override `hashCode()`. What's the most likely bug?", options: ["A compile error", "`set.contains(new Book(sameIsbn))` can return false for a book that is in the set", "`equals` stops working", "Nothing: `hashCode` is optional"], answer: 1,
      why: "Hash-based collections use `hashCode()` to pick a bucket first. Equal objects with different hash codes land in different buckets, so lookups miss. The contract: equal objects must have equal hash codes." },
    { q: "A coffee shop has 1 base drink and 4 optional add-ons in any combination. With inheritance alone, how many classes cover every combination, and how many with composition (decorators)?", options: ["4 and 4", "16 and 5", "8 and 8", "5 and 16"], answer: 1,
      why: "Each add-on is either present or not, so you need 2⁴ = 16 subclasses, and a fifth add-on doubles it to 32. With composition it's 1 base + 4 wrapper classes = 5, and a new add-on is one more class." },
    { q: "This compiles. What's the subtle bug?", code: "public class Book {\n    private final String isbn;\n    public Book(String isbn) { this.isbn = isbn; }\n    public boolean equals(Book other) { return isbn.equals(other.isbn); }\n    @Override public int hashCode() { return isbn.hashCode(); }\n}",
      options: ["`hashCode` uses the wrong field", "`equals(Book)` is an overload, not an override of `equals(Object)`, so collections never call it", "The constructor should be private", "There is no bug"], answer: 1,
      why: "Collections call `equals(Object)`. This class adds a new overload and leaves `Object.equals` (reference equality) in place. Putting `@Override` on it would have turned the mistake into a compile error." },
    { q: "In which case is inheritance a better choice than composition?", options: ["A Car needs engines that can be swapped", "Employees move from engineer to manager over time", "A framework gives you an abstract base class designed for extension, with documented hook methods, and every subclass truly is-a base", "You want to add logging to three unrelated services"], answer: 2,
      why: "Inheritance fits a stable is-a hierarchy whose base was designed for extension (for example Template Method hooks). Swappable parts, changing roles and cross-cutting features all point to composition." }
  ];

  H.registerLesson({
    code: "F01",
    summary: "The building blocks of every low-level design: classes and objects, encapsulation and immutability, abstraction with interfaces and abstract classes, inheritance and where it breaks, compile-time vs runtime polymorphism, and composition vs inheritance. Java code throughout.",
    slides: SLIDES,
    widget: { heading: "Interactive: composition vs inheritance, and who gets called", caption: "Two small tools. The first counts the classes a feature-combination problem needs; the second predicts what Java's dispatch rules do. Both follow real Java behaviour.", render: widget },
    examplesHeading: "Real-world analogies and where you'll see it in Java",
    examples: [
      ["Analogy: TV remote (abstraction + encapsulation)", "The buttons are the interface: power, volume, channel. The circuit board is sealed inside the casing so you can't short it. Any TV that understands the signals works with it."],
      ["Analogy: smartphone apps (polymorphism)", "You tap every icon the same way, and each app does its own thing. The home screen never needs a `switch` on app type."],
      ["Java Collections: program to an interface", "Write `List<Order> orders = new ArrayList<>();`. Switching to `LinkedList` or `CopyOnWriteArrayList` changes one line, because callers only know `List`."],
      ["java.io streams: composition (decorators)", "`new BufferedReader(new InputStreamReader(new FileInputStream(f), UTF_8))` stacks buffering and decoding by wrapping, instead of one subclass such as `BufferedUtf8FileReader` per combination."],
      ["java.util.Stack: an inheritance mistake", "`Stack extends Vector`, so a stack also exposes `get(i)`, `add(index, e)` and `remove(i)`, which break LIFO rules. Its Javadoc points you to `Deque` (for example `ArrayDeque`) instead."],
      ["java.util.Properties extends Hashtable", "*Effective Java* (Item 18) cites it: because it inherits `put(Object, Object)`, you can insert non-String keys and values that `getProperty` then can't handle."],
      ["Spring dependency injection", "Services take interfaces through their constructors (composition). Spring wires the real beans in production, and tests pass in fakes or mocks. It's the same idea as `new Car(new ElectricEngine())`."]
    ],
    pitfalls: [
      "Public fields, or a getter and setter for every field (an \"anemic\" class), instead of behaviour that guards invariants",
      "Using inheritance just to reuse code when there's no real is-a (`Stack extends Vector`, or `Manager extends Employee` when roles change)",
      "Forgetting Liskov: `Square extends Rectangle`, or `Penguin extends Bird` with a `fly()` method",
      "Mixing up overloading (compile time) and overriding (runtime), or thinking static methods and fields are polymorphic",
      "Overriding `equals` without `hashCode`, or writing `equals(Book)` instead of `equals(Object)`",
      "Using `double` for money instead of `long` minor units or `BigDecimal`",
      "Returning internal mutable collections from getters",
      "One giant `Manager` or `System` god class that does everything",
      "Deep hierarchies (4+ levels), and calling overridable methods from constructors",
      "Adding design patterns the problem doesn't need, just to show you know them"
    ],
    quiz: QUIZ,
    cheatsheet: {
      table: [
        ["Pillar", "In one line", "Java tools", "What to say in the interview"],
        ["Encapsulation", "Hide state and let only methods change it, so invariants hold", "`private`, `final`, records, unmodifiable views, validation", "\"Balance has no setter; `withdraw()` enforces the rules\""],
        ["Abstraction", "Expose what, hide how", "`interface`, `abstract class`", "\"Checkout depends on `PaymentMethod`, not on the UPI or card classes\""],
        ["Inheritance", "Is-a reuse of an implementation", "`extends`, `super`, `@Override`, `final`, `protected`", "\"Truck passes the substitution test, so inheritance is safe here\""],
        ["Polymorphism", "One call, with the behaviour picked by type", "Overriding (runtime), overloading (compile time)", "\"Each fee policy is its own class, which removes the `switch`\""],
        ["Composition", "Has-a plus delegation", "Fields of interface type, constructor injection", "\"Retry wraps any notifier, so features combine at runtime\""]],
      cards: [
        { title: "Decision rules", items: ["A true, stable is-a that passes Liskov → inheritance is OK", "Behaviour varies or must be swapped → interface + composition", "Features combine freely → wrappers (Decorator)", "Shared state + fixed steps → abstract class (Template Method)", "Default: interface first, then compose"] },
        { title: "Java gotchas", items: ["Static methods and fields: the declared type decides", "Overload choice: the declared argument type decides", "`equals` ⇒ `hashCode`; always write `@Override`", "Never use `double` for money", "No overridable calls in constructors", "Return copies or unmodifiable views"] },
        { title: "Modelling checklist", items: ["Nouns → classes, verbs → methods", "Entity (has an id) or value object (immutable)?", "Who owns this state? Only the owner changes it", "Where will behaviour vary? Put an interface there", "Keep classes small: one reason to change"] }
      ]
    },
    practice: [
      { level: "Easy", q: "Explain the four OOP pillars plus composition, with one parking-lot example for each.",
        steps: [
          ["Encapsulation", "`ParkingSpot` keeps `occupiedBy` private; `park(vehicle)` rejects the vehicle if the spot is taken or too small, so a spot can never hold two cars."],
          ["Abstraction", "`EntryGate` depends on a `SpotAllocator` interface. It asks for *a* spot without knowing whether the nearest-first or the by-floor algorithm runs."],
          ["Inheritance", "`Car`, `Bike` and `Truck` extend an abstract `Vehicle` with a plate and `size()`; each genuinely is a vehicle."],
          ["Polymorphism", "`ticket.fee()` calls `feePolicy.fee(hours)`; the car, bike and EV policies compute differently, with no `switch`."],
          ["Composition", "`ParkingLot` has `Floor`s, which have `ParkingSpot`s; the lot delegates `findSpot()` to its floors and its allocator."]],
        follow: "Why not `class EVSpot extends ParkingSpot` for charging? A charger is a feature that combines with every spot size, so model it as a has-a (`Optional<Charger>`) or a spot attribute, not one subclass per size × feature." },

      { level: "Easy", q: "Fix the encapsulation of this class.",
        qcode: `public class Account {
    public double balance;
    public List<String> transactions = new ArrayList<>();
}

// elsewhere
acc.balance -= 500;          // no checks at all
acc.transactions.clear();    // anyone can wipe the history`,
        a: ["Make the fields `private` (and `final` where possible), and store money as `long` minor units or `BigDecimal`", "Replace direct writes with intention-revealing methods that validate: `deposit()` and `withdraw()`", "Return an unmodifiable view of the history, and use a typed `Transaction` instead of `String`"],
        code: `public class Account {
    private long balancePaise;
    private final List<Transaction> transactions = new ArrayList<>();

    public void withdraw(long paise) {
        if (paise <= 0) throw new IllegalArgumentException("amount must be positive");
        if (paise > balancePaise) throw new IllegalStateException("insufficient funds");
        balancePaise -= paise;
        transactions.add(new Transaction(TxType.DEBIT, paise, Instant.now()));
    }

    public void deposit(long paise) {
        if (paise <= 0) throw new IllegalArgumentException("amount must be positive");
        balancePaise += paise;
        transactions.add(new Transaction(TxType.CREDIT, paise, Instant.now()));
    }

    public long balance() { return balancePaise; }
    public List<Transaction> transactions() { return Collections.unmodifiableList(transactions); }
}`,
        follow: "How would you make `withdraw` safe when two threads call it at once? Make it `synchronized` or guard it with a lock (covered in F28)." },

      { level: "Medium", q: "Predict all four lines of output.",
        qcode: `class Parent {
    String name = "parent";
    static String kind() { return "Parent.kind"; }
    String hello() { return "Parent.hello"; }
}
class Child extends Parent {
    String name = "child";
    static String kind() { return "Child.kind"; }
    @Override String hello() { return "Child.hello"; }
}
class Greeter {
    String greet(Parent p) { return "greet(Parent)"; }
    String greet(Child c)  { return "greet(Child)"; }
}

Parent p = new Child();
System.out.println(p.name);
System.out.println(p.kind());
System.out.println(p.hello());
System.out.println(new Greeter().greet(p));`,
        a: ["`parent`: fields aren't polymorphic, so the declared type `Parent` decides", "`Parent.kind`: static methods are hidden and bound to the declared type", "`Child.hello`: an overridden instance method, so the runtime type decides", "`greet(Parent)`: the overload is chosen at compile time from the argument's declared type"],
        follow: "How would you make `greet` choose by runtime type? Move the behaviour into the class hierarchy as an overridden method, or use double dispatch (the Visitor pattern, F25)." },

      { level: "Medium", q: "`Square extends Rectangle` looks natural. What's wrong with it, and how would you model the shapes instead?",
        qcode: `class Rectangle {
    protected int w, h;
    void setWidth(int w)  { this.w = w; }
    void setHeight(int h) { this.h = h; }
    int area() { return w * h; }
}
class Square extends Rectangle {
    @Override void setWidth(int w)  { this.w = w; this.h = w; }
    @Override void setHeight(int h) { this.w = h; this.h = h; }
}

void stretch(Rectangle r) {
    r.setWidth(5);
    r.setHeight(4);
    assert r.area() == 20;    // fails for a Square: area is 16
}`,
        steps: [
          ["Spot the broken promise", "`Rectangle` promises that width and height change independently. `Square` can't keep that promise, so code written for `Rectangle` breaks when it gets a `Square`. That violates the Liskov Substitution Principle."],
          ["A geometric is-a isn't a behavioural is-a", "A square is a rectangle in geometry, but not a *mutable* rectangle with independent setters. In code, inheritance has to follow behaviour."],
          ["Fix: immutable shapes behind a common interface", "Make both shapes immutable records implementing `Shape`. With no setters there's no promise to break, and \"resize\" returns a new shape."]],
        code: `public sealed interface Shape permits Rectangle, Square {
    int area();
}
public record Rectangle(int w, int h) implements Shape {
    public int area() { return w * h; }
    public Rectangle withWidth(int newW) { return new Rectangle(newW, h); }
}
public record Square(int side) implements Shape {
    public int area() { return side * side; }
}` },

      { level: "Medium", q: "A coffee shop sells Espresso and Tea, with optional Milk, Sugar, Caramel and Whipped cream in any combination. Design classes that compute price and description correctly and make new add-ons easy.",
        steps: [
          ["Reject the subclass explosion", "Classes such as `EspressoWithMilkAndCaramel` mean 2 × 2⁴ = 32 classes, and every new add-on doubles that."],
          ["A common interface", "`Beverage` with `cost()` and `description()`; `Espresso` and `Tea` implement it."],
          ["Add-ons wrap a beverage", "Each add-on implements `Beverage`, holds the inner `Beverage`, and adds to its cost and description (the Decorator pattern, F11)."],
          ["Compose at runtime", "`new Whip(new Caramel(new Milk(new Espresso())))`; the order screen builds this from the customer's choices."],
          ["Trade-offs to mention", "You get many small objects, and wrapper order can matter (for example with a percentage discount). Validate combinations, such as at most one milk, in a builder or factory."]],
        m: "classDiagram\n  direction LR\n  class Beverage {\n    <<interface>>\n    +cost() long\n    +description() String\n  }\n  class AddOn {\n    <<abstract>>\n    #Beverage inner\n  }\n  Beverage <|.. Espresso\n  Beverage <|.. Tea\n  Beverage <|.. AddOn\n  AddOn o-- Beverage : wraps\n  AddOn <|-- Milk\n  AddOn <|-- Sugar\n  AddOn <|-- Caramel\n  AddOn <|-- Whip",
        code: `public interface Beverage { long cost(); String description(); }

public record Espresso() implements Beverage {
    public long cost() { return 120; }
    public String description() { return "Espresso"; }
}

public abstract class AddOn implements Beverage {
    protected final Beverage inner;
    protected AddOn(Beverage inner) { this.inner = Objects.requireNonNull(inner); }
}

public class Milk extends AddOn {
    public Milk(Beverage b) { super(b); }
    public long cost() { return inner.cost() + 30; }
    public String description() { return inner.description() + ", milk"; }
}

public class Caramel extends AddOn {
    public Caramel(Beverage b) { super(b); }
    public long cost() { return inner.cost() + 40; }
    public String description() { return inner.description() + ", caramel"; }
}

Beverage order = new Caramel(new Milk(new Espresso()));
System.out.println(order.description() + " = " + order.cost());   // Espresso, milk, caramel = 190`,
        follow: "Notice that `AddOn` uses inheritance and composition together: it inherits the *interface* and composes the *implementation*. That's the healthy combination." },

      { level: "Medium", q: "Interface or abstract class? (a) `PaymentMethod` for UPI, card and wallet. (b) A `ReportGenerator` where every report fetches data, formats it, and writes a header and footer in the same order.",
        a: ["(a) An **interface**. The implementations share no state and pay in completely different ways. A class may also need other capabilities (`Refundable`), which interfaces allow.", "(b) An **abstract class** with a `final generate()` template method that calls `fetch()`, `format()`, `header()` and `footer()`. The fixed order and the shared helpers belong in one base (Template Method, F21).", "Often both: `interface ReportGenerator` for clients, plus `abstract class BaseReportGenerator implements ReportGenerator` for the shared skeleton. Clients depend only on the interface."],
        follow: "Since Java 8 interfaces can have `default` methods. Why not put the template in one? A default method can't be `final` and an interface can't hold state (a shared formatter or clock), so implementations could override the flow itself." },

      { level: "Hard", q: "HR software has `Manager extends Employee`, `Engineer extends Employee` and `Contractor extends Employee`. Then an engineer is promoted to manager, and some contractors also manage people. What breaks, and how would you redesign it?",
        steps: [
          ["What breaks", "An object can't change its class, so a promotion means creating a new `Manager` and copying fields, which loses ids, references and history. \"Contractor who manages\" needs a `ContractorManager`: the start of a class explosion."],
          ["Separate identity from role", "`Employee` is the entity with a stable id. *What they do* (role) and *how they're employed* (employment type) are two independent dimensions, so each becomes a has-a."],
          ["Roles and employment as composed objects", "`Employee` has a `Role` (`EngineerRole`, or `ManagerRole` with direct reports) and an `EmploymentType` (`FullTime`, `Contract`) that computes pay."],
          ["Behaviour delegates", "`employee.monthlyPay()` delegates to the employment type and `employee.canApproveLeave()` to the role. A promotion is `employee.assignRole(new ManagerRole(...))`: same object, same id, with an audit trail."],
          ["Trade-off", "There's slightly more indirection, but each dimension now varies independently, and new roles or contract types are just new classes."]],
        code: `public interface Role { String title(); boolean canApproveLeave(); }

public record EngineerRole(String level) implements Role {
    public String title() { return level + " Engineer"; }
    public boolean canApproveLeave() { return false; }
}
public record ManagerRole(List<String> reportIds) implements Role {
    public String title() { return "Manager"; }
    public boolean canApproveLeave() { return true; }
}

public interface EmploymentType { long monthlyPay(); }
public record FullTime(long annualSalary) implements EmploymentType {
    public long monthlyPay() { return annualSalary / 12; }
}
public record Contract(long hourlyRate, int hoursPerMonth) implements EmploymentType {
    public long monthlyPay() { return hourlyRate * hoursPerMonth; }
}

public class Employee {
    private final String id;
    private Role role;
    private EmploymentType employment;
    private final List<String> roleHistory = new ArrayList<>();

    public Employee(String id, Role role, EmploymentType employment) {
        this.id = id;
        this.role = role;
        this.employment = employment;
        roleHistory.add(role.title());
    }

    public void assignRole(Role newRole) {            // a promotion: same object, same id
        this.role = Objects.requireNonNull(newRole);
        roleHistory.add(newRole.title());
    }

    public long monthlyPay() { return employment.monthlyPay(); }
    public boolean canApproveLeave() { return role.canApproveLeave(); }
}` },

      { level: "Easy", q: "A `Set<Book>` says it doesn't contain a book you just added, when you check with a new object for the same ISBN. Diagnose it and fix it.",
        a: ["`Book` doesn't override `equals` and `hashCode` (or overrides only `equals`, or writes `equals(Book)`). `HashSet` then falls back to reference identity, so a new object with the same ISBN counts as a different book", "Fix: override `equals(Object)` to compare ISBNs and `hashCode()` to hash the ISBN, both marked `@Override`", "Keep the fields used by `equals` `final`: if a key's hash changes while it's in a `HashSet`, the set can't find it any more", "If `Book` is really a value object, a `record` gives you correct `equals` and `hashCode` for free"],
        code: `@Override public boolean equals(Object o) {
    return o instanceof Book b && isbn.equals(b.isbn);
}
@Override public int hashCode() { return isbn.hashCode(); }` }
    ],
    recap: [
      "Objects = state + behaviour + identity; start modelling from the nouns and verbs.",
      "Encapsulate: private state and validating methods keep invariants; prefer immutable value objects.",
      "Abstract with interfaces so clients depend on what, not how; add an abstract class only for shared state or a fixed flow.",
      "Overriding is runtime dispatch on the object's type; overloads, static methods and fields go by the declared type.",
      "Inherit only for a true, substitutable is-a; otherwise compose and delegate, especially when features combine or change at runtime."
    ]
  });
})();
