/* VIP interview question bank for the LLD Study app.
   Each item: id, g (group), lv (Easy/Medium/Hard), faq (frequently asked across LLD interviews; not a company claim),
   l (related lesson code), q, a (answer bullets), optional code (Java) and m (Mermaid class-diagram outline). */
(function () {
  "use strict";
  var QS = [];
  function Q(g, lv, faq, l, q, a, extra) {
    var o = { id: "q" + (QS.length + 1), g: g, lv: lv, faq: !!faq, l: l, q: q, a: a };
    if (extra) { if (extra.code) o.code = extra.code; if (extra.m) o.m = extra.m; }
    QS.push(o);
  }
  function cd(lines) { return ["classDiagram"].concat(lines.map(function (s) { return "  " + s; })); }   // expanded with LLD.cd at render time

  /* ---------------- OOP ---------------- */
  Q("OOP", "Easy", true, "F01", "What are the four pillars of OOP? Give a one-line Java example of each.", [
    "**Encapsulation**: hide state behind methods that guard invariants: `private long balance` with `withdraw()` that rejects overdrafts.",
    "**Abstraction**: expose *what*, hide *how*: `PaymentGateway.charge(amount)` without revealing the bank API.",
    "**Inheritance**: is-a reuse: `class SavingsAccount extends Account`.",
    "**Polymorphism**: one call, many behaviours: `for (Shape s : shapes) s.area()` dispatches to each subclass at runtime."]);
  Q("OOP", "Easy", true, "F01", "Abstract class vs interface in modern Java (8+). When do you pick each?", [
    "Interface: a capability/contract; a class can implement many; can have `default`, `static` and `private` methods but **no instance state**.",
    "Abstract class: a partial implementation with **state**, constructors and `protected` members; single inheritance only.",
    "Pick an interface for roles that unrelated classes may play (`Comparable`, `PaymentMethod`), and for anything you want to mock or swap.",
    "Pick an abstract class when subclasses share state and a fixed skeleton (Template Method, F21).",
    "A common combo: interface for the type, abstract base class implementing it for shared code (`List` + `AbstractList`)."]);
  Q("OOP", "Medium", true, "F01", "Composition vs inheritance: why is \"favour composition\" the default advice? Give an example where inheritance goes wrong.", [
    "Inheritance couples the subclass to the parent's implementation (fragile base class): a change in the parent can break subclasses.",
    "Classic bug: `class CountingSet extends HashSet` overriding `add` and `addAll` double-counts, because `HashSet.addAll` calls `add` internally.",
    "Composition (has-a + delegation) depends only on the public interface, can be changed at runtime and combined freely (Strategy, Decorator).",
    "Use inheritance for genuine is-a relationships where the parent is designed for extension (or is abstract)."],
    { code: "class CountingSet<E> {                               // composition: wraps instead of extends\n    private final Set<E> inner = new HashSet<>();\n    private int added;\n    boolean add(E e) { added++; return inner.add(e); }\n    boolean addAll(Collection<? extends E> c) { added += c.size(); return inner.addAll(c); }\n    int added() { return added; }\n}" });
  Q("OOP", "Easy", true, "F01", "Overloading vs overriding: which is resolved at compile time, and what does that mean for `print(Object)` vs `print(String)`?", [
    "**Overloading**: same name, different parameter lists, chosen at **compile time** from the declared (static) argument types.",
    "**Overriding**: same signature in a subclass, chosen at **runtime** from the receiver's actual type (dynamic dispatch).",
    "So `Object o = \"hi\"; print(o);` calls `print(Object)` even though `o` holds a `String`.",
    "This is exactly why Visitor needs double dispatch (F25)."]);
  Q("OOP", "Medium", false, "F01", "What is an invariant, and how does encapsulation protect it? Show an example with a bank account.", [
    "An invariant is a condition that must always hold for an object to be valid: \"balance ≥ 0\", \"end date after start date\".",
    "Encapsulation keeps fields private so the only way to change them is through methods that check the invariant.",
    "Constructors must establish the invariant; every mutator must preserve it; getters must not leak mutable internals."],
    { code: "final class Account {\n    private long balancePaise;\n    Account(long opening) { if (opening < 0) throw new IllegalArgumentException(); balancePaise = opening; }\n    void withdraw(long p) {\n        if (p <= 0 || p > balancePaise) throw new IllegalArgumentException(\"invalid amount\");\n        balancePaise -= p;                         // invariant balance >= 0 preserved\n    }\n    long balance() { return balancePaise; }\n}" });
  Q("OOP", "Medium", true, "F01", "Why should value objects (Money, Email, DateRange) be immutable? How do you build one in Java?", [
    "Immutable objects are thread-safe, can be shared and cached, are safe as map keys, and their invariants are checked once in the constructor.",
    "In Java: a `record` (or `final` class with `private final` fields), validation in the (compact) constructor, defensive copies of mutable inputs, no setters; \"modifiers\" return new instances.",
    "Money: store minor units (`long paise`) plus currency; never `double`."],
    { code: "record Money(long paise, String currency) {\n    Money {\n        if (paise < 0) throw new IllegalArgumentException(\"negative\");\n        Objects.requireNonNull(currency);\n    }\n    Money plus(Money o) {\n        if (!currency.equals(o.currency)) throw new IllegalArgumentException(\"currency mismatch\");\n        return new Money(paise + o.paise, currency);\n    }\n}" });
  Q("OOP", "Easy", false, "F01", "What is the difference between association, aggregation and composition? Give a code example of each.", [
    "**Association**: one object uses/knows another (`Driver` drives `Car`), independent lifecycles.",
    "**Aggregation**: whole–part with independent parts (`Team` has `Player`s who can exist without the team); the part is usually passed in.",
    "**Composition**: whole owns parts and controls their lifecycle (`Order` creates its `OrderLine`s; they die with it).",
    "In code the difference shows up as **who creates** the part and **whether it's shared**."], { m: cd(["Driver --> Car : drives", "Team o-- Player", "Order *-- OrderLine"]) });
  Q("OOP", "Medium", true, "F01", "How do you identify classes, attributes and methods from a problem statement in an LLD round?", [
    "Underline **nouns** → candidate classes/attributes; **verbs** → methods/services; **adjectives / rules that vary** → strategies or enums.",
    "Drop nouns that are just values (attributes) or out of scope; merge synonyms.",
    "Assign each behaviour to the class that owns the data it needs (information expert).",
    "Look for things that will change (pricing rules, notification channels) and put them behind interfaces.",
    "Validate by walking a use case end-to-end (a sequence diagram) before coding."]);
  Q("OOP", "Hard", false, "F01", "What is the Liskov-breaking \"Square extends Rectangle\" problem, and how would you model shapes instead?", [
    "If `Rectangle` has `setWidth`/`setHeight`, a `Square` must keep both equal, so code that sets width then height on a `Rectangle` reference gets surprising results.",
    "The subclass weakens the parent's postconditions → violates LSP (F02).",
    "Fix: make shapes immutable (`new Rectangle(w, h)`, `new Square(side)`), or model a common `Shape` interface with `area()` and no setters, so neither inherits the other's mutators."]);
  Q("OOP", "Medium", false, "F01", "Tell, don't ask: what does it mean and how does it improve a design?", [
    "Instead of pulling data out of an object and deciding for it (`if (account.getBalance() >= x) account.setBalance(...)`), tell the object what you want (`account.withdraw(x)`).",
    "Behaviour moves next to the data, invariants are enforced in one place, and callers are less coupled to internals.",
    "Related: Law of Demeter (\"talk to friends, not strangers\"): avoid `order.getCustomer().getAddress().getCity()` chains."]);

  /* ---------------- SOLID ---------------- */
  Q("SOLID", "Easy", true, "F02", "Explain SOLID in one line each, with a violation you'd spot in code review.", [
    "**S**RP: one reason to change. Violation: `OrderService` that calculates tax, saves to DB and sends emails.",
    "**O**CP: extend without modifying. Violation: `switch (paymentType)` edited for every new method.",
    "**L**SP: subtypes must honour the parent's contract. Violation: `ReadOnlyList.add()` throwing.",
    "**I**SP: small, client-specific interfaces. Violation: `Machine { print(); scan(); fax(); }` forcing a printer to stub fax.",
    "**D**IP: depend on abstractions. Violation: `new MySqlOrderRepository()` inside business logic."]);
  Q("SOLID", "Medium", true, "F02", "Refactor a payment `switch` to follow the Open/Closed Principle.", [
    "Introduce `PaymentMethod` with `pay(amount)`; one class per method (UPI, card, wallet).",
    "Register implementations in a map or let DI collect them (`Map<String, PaymentMethod>` in Spring).",
    "Adding net banking = a new class + registration; existing code is untouched and its tests still pass.",
    "OCP doesn't mean \"never edit code\": it means the *likely* axis of change is an extension point."],
    { code: "interface PaymentMethod { String type(); String pay(long paise); }\nclass Upi implements PaymentMethod { public String type() { return \"UPI\"; } public String pay(long p) { return \"UPI collect ₹\" + p / 100; } }\nclass Card implements PaymentMethod { public String type() { return \"CARD\"; } public String pay(long p) { return \"3DS card charge ₹\" + p / 100; } }\nclass Checkout {\n    private final Map<String, PaymentMethod> methods = new HashMap<>();\n    Checkout(List<PaymentMethod> all) { all.forEach(m -> methods.put(m.type(), m)); }\n    String pay(String type, long paise) { return methods.get(type).pay(paise); }   // no switch\n}" });
  Q("SOLID", "Medium", false, "F02", "What does \"one reason to change\" mean in SRP? How do you decide where to split a class?", [
    "A reason to change is an **actor** (stakeholder group) whose requests change the code: finance changes tax rules, ops changes logging.",
    "Split when two parts change for different actors or at different rates; don't split by method count.",
    "Signals: unrelated imports (SMTP + JDBC + PDF), tests that need lots of unrelated setup, merge conflicts between teams in one file."]);
  Q("SOLID", "Medium", true, "F02", "Give the LSP rules for preconditions, postconditions and exceptions, with an example.", [
    "A subtype may **not strengthen preconditions** (accept less): a `PremiumAccount.withdraw` requiring amount ≥ ₹1000 breaks callers.",
    "May **not weaken postconditions** (promise less): a `cache.put` that sometimes doesn't store breaks callers relying on it.",
    "May not throw new **checked/unexpected exceptions** the base doesn't declare.",
    "Must preserve **invariants** and history constraints (an immutable base must stay immutable).",
    "Test: can every test written against the base pass with the subtype substituted?"]);
  Q("SOLID", "Easy", false, "F02", "How does the Interface Segregation Principle help testing and evolution?", [
    "Clients depend only on methods they use, so a change to an unrelated method doesn't recompile/redeploy them.",
    "Fakes and mocks are smaller: implement `OrderReader` (2 methods) instead of `OrderRepository` (20).",
    "Role interfaces (`Readable`, `Writable`, `Searchable`) let one class play several roles without forcing them on others."]);
  Q("SOLID", "Medium", true, "F02", "DIP vs dependency injection vs inversion of control: what's the difference?", [
    "**DIP** (principle): high-level policy and low-level details both depend on abstractions; the abstraction is owned by the high-level module.",
    "**DI** (technique): objects receive their dependencies (constructor/setter) instead of creating them.",
    "**IoC** (broader idea): the framework calls your code and manages lifecycles (Spring container, servlet container, Template Method).",
    "You can do DI without DIP (inject a concrete class) and DIP without a container (wire by hand in `main`)."]);
  Q("SOLID", "Hard", false, "F02", "Can applying SOLID make a design worse? Give an example of over-engineering and how you'd push back.", [
    "Yes: interfaces with a single implementation \"just in case\", factories for objects that never vary, ten tiny classes for a 30-line script.",
    "Costs: indirection, harder navigation, slower onboarding, more code to maintain.",
    "Apply principles where change is **likely or already happening** (YAGNI); refactor towards patterns when the second or third variant appears.",
    "In interviews: say what you'd extract later and why, rather than building everything up front."]);
  Q("SOLID", "Medium", false, "F02", "A `ReportGenerator` reads from MySQL, formats PDF and emails it. Redesign it with SOLID and draw the classes.", [
    "Split responsibilities: `ReportDataSource` (fetch), `ReportFormatter` (PDF/CSV), `ReportDelivery` (email/S3).",
    "`ReportService` orchestrates and depends only on the three interfaces (DIP), injected via the constructor.",
    "New format or channel = new implementation (OCP); each piece tested with fakes (ISP keeps interfaces tiny)."],
    { m: cd(["class ReportService { +generate(ReportRequest r) }", "class ReportDataSource { <<interface>>; +fetch(ReportRequest r) Data }", "class ReportFormatter { <<interface>>; +format(Data d) byte[] }", "class ReportDelivery { <<interface>>; +deliver(byte[] file, String to) }", "ReportService --> ReportDataSource", "ReportService --> ReportFormatter", "ReportService --> ReportDelivery", "ReportDataSource <|.. MySqlDataSource", "ReportFormatter <|.. PdfFormatter", "ReportFormatter <|.. CsvFormatter", "ReportDelivery <|.. EmailDelivery"]) });

  /* ---------------- Patterns: general ---------------- */
  Q("Patterns (general)", "Easy", true, "F05", "What are the three GoF pattern categories? Name three patterns in each.", [
    "**Creational** (how objects are made): Singleton, Factory Method, Abstract Factory, Builder, Prototype.",
    "**Structural** (how objects are composed): Adapter, Decorator, Facade, Proxy, Composite, Bridge, Flyweight.",
    "**Behavioral** (how objects interact and divide work): Strategy, Observer, Command, State, Template Method, Chain of Responsibility, Iterator, Mediator, Visitor, Memento."]);
  Q("Patterns (general)", "Medium", true, "F17", "Strategy vs State: the class diagrams look identical. How do you tell them apart?", [
    "**Strategy**: the client picks an algorithm; strategies don't know each other and don't change the context's mode (pricing, sorting, routing).",
    "**State**: the context's behaviour changes as its internal state changes; states trigger **transitions** to other states (vending machine IDLE → HAS_MONEY → DISPENSING).",
    "Ask: who switches the object, and why? Client choice → Strategy. Lifecycle event → State."]);
  Q("Patterns (general)", "Medium", true, "F11", "Decorator vs Proxy vs Adapter: all wrap an object. What is the intent of each?", [
    "**Adapter**: change the interface so incompatible code fits (`LegacyPaymentAdapter implements PaymentGateway`).",
    "**Decorator**: same interface, **add behaviour**, stackable (`new Gzip(new Encrypt(new FileStream()))`).",
    "**Proxy**: same interface, **control access** (lazy loading, caching, auth, remote calls); the client usually doesn't know.",
    "Tell-tale: different interface → Adapter; stacking extras → Decorator; deciding whether/when/how the real call happens → Proxy."]);

  /* ---------------- Creational ---------------- */
  Q("Singleton", "Medium", true, "F05", "Write a thread-safe lazy Singleton. Why does double-checked locking need `volatile`?", [
    "Best lazy option: the **holder idiom**: a nested class's static field is initialised on first access under the JVM's class-init lock.",
    "DCL without `volatile` can publish the reference before the constructor's writes are visible, so another thread may use a half-built object.",
    "`volatile` forbids that reordering and creates a happens-before edge from the write to every read.",
    "Enum singleton is also safe and resists serialization/reflection (F29 goes deep)."],
    { code: "class Config {\n    private Config() { }\n    private static final class Holder { static final Config INSTANCE = new Config(); }\n    static Config get() { return Holder.INSTANCE; }\n}\n\nclass Registry {\n    private static volatile Registry instance;\n    static Registry get() {\n        Registry r = instance;\n        if (r == null) synchronized (Registry.class) { r = instance; if (r == null) instance = r = new Registry(); }\n        return r;\n    }\n}" });
  Q("Singleton", "Medium", true, "F05", "Why is Singleton often called an anti-pattern, and what would you use instead?", [
    "It's global mutable state: hidden dependencies, order-dependent tests, hard to replace with fakes.",
    "It couples callers to a concrete class (`X.getInstance()` everywhere).",
    "\"One per JVM\" isn't \"one per cluster\"; scaled services need distributed coordination anyway.",
    "Prefer DI-managed singletons (Spring beans) injected through interfaces; keep hand-rolled singletons for truly global infrastructure."]);
  Q("Factory Method", "Easy", true, "F06", "Simple factory vs Factory Method vs static factory method: what's the difference?", [
    "**Static factory method** (Effective Java Item 1): a named static constructor like `List.of()`, `Optional.empty()`.",
    "**Simple factory**: one class with a `create(type)` switch/registry; not a GoF pattern, but common.",
    "**Factory Method** (GoF): a superclass defines an abstract `createX()` step; **subclasses** decide which concrete product to create.",
    "Registry factories (`Map<String, Supplier<T>>`) keep a simple factory open for extension."]);
  Q("Factory Method", "Medium", false, "F06", "Design a notification factory that creates Email/SMS/Push senders and can add WhatsApp without editing existing code.", [
    "`NotificationSender` interface; one implementation per channel.",
    "`SenderFactory` with a `Map<Channel, Supplier<NotificationSender>>` registry; `register(channel, supplier)` at startup (or Spring collects beans).",
    "Callers ask for `factory.forChannel(user.preferredChannel())` and never `new` a sender.",
    "Unknown channel → explicit exception or default channel."]);
  Q("Abstract Factory", "Medium", false, "F07", "When do you need Abstract Factory rather than several Factory Methods?", [
    "When products come in **families** that must be used together: UI widgets per theme, `Connection` + `Statement` per database, payment + tax + invoice per country.",
    "One factory object guarantees consistency (you can't mix an India tax calculator with a US invoice format).",
    "Trade-off: adding a new **family** is easy (new factory), adding a new **product type** means changing every factory."]);
  Q("Abstract Factory", "Hard", false, "F07", "Design a multi-cloud storage + queue abstraction (AWS vs GCP) with Abstract Factory. Show the classes.", [
    "`CloudFactory` creates `BlobStore` and `MessageQueue`; `AwsFactory` → `S3BlobStore`, `SqsQueue`; `GcpFactory` → `GcsBlobStore`, `PubSubQueue`.",
    "The factory is chosen once at startup from configuration; the app depends only on the interfaces.",
    "Tests use an `InMemoryFactory`."],
    { m: cd(["class CloudFactory { <<interface>>; +blobStore() BlobStore; +queue() MessageQueue }", "class BlobStore { <<interface>>; +put(String key, byte[] data) }", "class MessageQueue { <<interface>>; +publish(String topic, String msg) }", "CloudFactory <|.. AwsFactory", "CloudFactory <|.. GcpFactory", "BlobStore <|.. S3BlobStore", "BlobStore <|.. GcsBlobStore", "MessageQueue <|.. SqsQueue", "MessageQueue <|.. PubSubQueue", "AwsFactory ..> S3BlobStore", "AwsFactory ..> SqsQueue", "GcpFactory ..> GcsBlobStore", "GcpFactory ..> PubSubQueue"]) });
  Q("Builder", "Easy", true, "F08", "What problem does Builder solve? Implement a validating builder for an `Order`.", [
    "Telescoping constructors (many optional parameters) and half-initialised JavaBeans with setters.",
    "Builder collects parameters fluently, validates once in `build()`, and returns an immutable object.",
    "Mandatory fields can go in the builder's constructor (or use a step builder to force order)."],
    { code: "final class Order {\n    private final String customerId; private final List<String> items; private final String coupon;\n    private Order(Builder b) { customerId = b.customerId; items = List.copyOf(b.items); coupon = b.coupon; }\n    static Builder forCustomer(String id) { return new Builder(id); }\n    static final class Builder {\n        private final String customerId; private final List<String> items = new ArrayList<>(); private String coupon;\n        private Builder(String id) { customerId = Objects.requireNonNull(id); }\n        Builder item(String sku) { items.add(sku); return this; }\n        Builder coupon(String c) { coupon = c; return this; }\n        Order build() { if (items.isEmpty()) throw new IllegalStateException(\"order needs items\"); return new Order(this); }\n    }\n}" });
  Q("Builder", "Medium", false, "F08", "Builder vs Lombok `@Builder` vs records with static factories: what would you use in production?", [
    "Records + static factories (`Money.ofRupees(10)`) for small immutable values: simplest.",
    "Hand-written builder when you need validation across fields, defaults, or a step builder enforcing order.",
    "Lombok `@Builder` saves boilerplate but validation must go into the constructor (`@Builder` on a constructor) and it hides code from reviewers.",
    "For tests: test-data builders with sensible defaults (`anOrder().withCoupon(\"X\").build()`)."]);
  Q("Prototype", "Medium", false, "F09", "Shallow vs deep copy: when does a shallow copy cause bugs? How do you copy safely in Java?", [
    "Shallow copy shares referenced objects: copying a `Board` but sharing its `List<Piece>` means a move on the copy changes the original.",
    "Deep copy duplicates the object graph (watch for cycles and shared references that *should* stay shared).",
    "Prefer copy constructors/static `copyOf` methods over `Cloneable` (`clone()` is shallow, bypasses constructors, awkward with `final` fields).",
    "Immutable parts can be shared safely; copy only the mutable parts."]);
  Q("Prototype", "Easy", false, "F09", "Where is Prototype useful in LLD problems?", [
    "Copy-paste in a diagram editor; \"duplicate\" for documents/templates.",
    "Game units or enemies spawned from configured archetypes (a registry of prototypes cloned per spawn).",
    "Chess AI \"what-if\" boards: copy the board, try a move, discard.",
    "When construction is expensive (parsed config) and copies differ only slightly."]);

  /* ---------------- Structural ---------------- */
  Q("Adapter", "Easy", true, "F10", "Integrate a legacy payment SDK whose API is `makePayment(String card, double rupees)` into your `PaymentGateway.charge(Money)` interface.", [
    "Write `LegacyPayAdapter implements PaymentGateway` that holds the SDK object and translates calls (Money → rupees, result codes → your result type, exceptions → your exceptions).",
    "Business code depends only on `PaymentGateway`; replacing the vendor touches only the adapter.",
    "Object adapter (composition) is preferred over class adapter (inheritance)."],
    { code: "class LegacySdk { int makePayment(String card, double rupees) { return rupees > 0 ? 0 : 41; } }   // 0 = OK\ninterface PaymentGateway { boolean charge(String card, long paise); }\nclass LegacyPayAdapter implements PaymentGateway {\n    private final LegacySdk sdk;\n    LegacyPayAdapter(LegacySdk sdk) { this.sdk = sdk; }\n    public boolean charge(String card, long paise) { return sdk.makePayment(card, paise / 100.0) == 0; }\n}" });
  Q("Adapter", "Medium", false, "F10", "Name three adapters in the JDK and explain what each converts.", [
    "`Arrays.asList(array)`: array → `List` view.",
    "`InputStreamReader`: byte stream (`InputStream`) → character stream (`Reader`).",
    "`Collections.enumeration(collection)` / `Collections.list(enumeration)`: modern collections ↔ legacy `Enumeration`.",
    "Also `Executors.callable(runnable)`: `Runnable` → `Callable`."]);
  Q("Decorator", "Easy", true, "F11", "Design pricing add-ons for a coffee order (milk, extra shot, whipped cream) with Decorator.", [
    "`Beverage` interface with `cost()` and `description()`; concrete `Espresso`, `Filter`.",
    "Abstract `AddOn implements Beverage` wraps another `Beverage`; `Milk`, `ExtraShot`, `Whip` add their cost and text.",
    "Orders compose at runtime: `new Whip(new Milk(new Espresso()))`.",
    "Same shape as `BufferedInputStream(new FileInputStream(...))`."],
    { m: cd(["class Beverage { <<interface>>; +cost() int; +description() String }", "class AddOn { <<abstract>>; #Beverage inner }", "Beverage <|.. Espresso", "Beverage <|.. AddOn", "AddOn <|-- Milk", "AddOn <|-- ExtraShot", "AddOn <|-- Whip", "AddOn o-- Beverage : wraps"]) });
  Q("Decorator", "Medium", false, "F11", "Decorator vs inheritance for optional features: why does inheritance explode?", [
    "With 3 independent options you'd need up to 2³ = 8 subclasses (`MilkWhipEspresso`…), and every new option doubles them.",
    "Decorators are combined at runtime: n options = n classes.",
    "Watch-outs: order of decorators can matter (encrypt then compress ≠ compress then encrypt), identity checks fail on wrapped objects, deep stacks are harder to debug."]);
  Q("Facade", "Easy", false, "F12", "What is a Facade? How is it different from a service layer or an API gateway?", [
    "A Facade gives a **simple entry point** to a complex subsystem: `CheckoutFacade.placeOrder()` hides inventory, pricing, payment and shipping calls.",
    "Subsystem classes don't know the facade exists; clients can still use them directly when needed.",
    "Application service layers are often facades; an API gateway is a network-level facade (plus routing, auth, rate limiting)."]);
  Q("Proxy", "Medium", true, "F13", "Explain virtual, protection, caching and remote proxies with an example each.", [
    "**Virtual**: lazy-load an expensive object on first use (Hibernate lazy associations, a high-res image loaded on view).",
    "**Protection**: check permissions before delegating (`AdminOnlyReportService`).",
    "**Caching**: return cached results for repeated calls (Spring `@Cacheable` proxies).",
    "**Remote**: a local stub that forwards calls over the network (gRPC stubs, RMI).",
    "JDK: `java.lang.reflect.Proxy` for interface-based dynamic proxies; Spring AOP uses JDK proxies or CGLIB subclasses."]);
  Q("Proxy", "Hard", false, "F13", "Why does `@Transactional` not work when a method calls another `@Transactional` method on `this` in Spring?", [
    "Spring applies transactions through a **proxy** wrapped around the bean. External calls go through the proxy; `this.method()` is a direct call on the target object, bypassing it.",
    "So the inner method's annotation (e.g. `REQUIRES_NEW`) is ignored.",
    "Fixes: move the method to another bean, inject the proxy (self-injection), or use `TransactionTemplate` explicitly."]);
  Q("Composite", "Easy", true, "F14", "Model a file system where folders contain files and folders, and compute total size.", [
    "`Node` interface with `size()` and `name()`; `File` (leaf) returns its size; `Folder` (composite) holds `List<Node>` and sums children.",
    "Clients treat files and folders uniformly; recursion lives in `Folder`.",
    "Same shape: org charts, menus, UI component trees, order bundles."],
    { code: "interface Node { long size(); }\nrecord FileNode(String name, long bytes) implements Node { public long size() { return bytes; } }\nrecord Folder(String name, List<Node> children) implements Node {\n    public long size() { return children.stream().mapToLong(Node::size).sum(); }\n}" });
  Q("Composite", "Medium", false, "F14", "Where should `add(child)` live in Composite: on the component interface or only on the composite? Trade-offs?", [
    "**Transparency** (on the interface): clients treat everything uniformly, but leaves must throw `UnsupportedOperationException` (an LSP smell).",
    "**Safety** (only on the composite): type-safe, but clients must know whether they have a composite (cast or `instanceof`).",
    "Modern Java: a sealed `Node` with `File`/`Folder` records and pattern matching makes the safe option pleasant."]);
  Q("Bridge", "Medium", false, "F15", "Explain Bridge with remote controls and devices. Why is it m + n instead of m × n classes?", [
    "Two independent dimensions: abstractions (`BasicRemote`, `AdvancedRemote`) and implementations (`Tv`, `Radio`, `Projector`).",
    "Inheritance alone needs a class per combination (m × n). Bridge composes: the remote **has a** `Device` reference, so you need m + n classes.",
    "Also: JDBC (`DriverManager`/`Connection` API over vendor drivers), notification type × delivery channel."]);
  Q("Flyweight", "Medium", false, "F16", "What is intrinsic vs extrinsic state in Flyweight? Give a Java example.", [
    "**Intrinsic**: shared, immutable state stored in the flyweight (a glyph's font and shape; a tree type's texture).",
    "**Extrinsic**: per-use context passed in by the client (position, colour override).",
    "A factory caches flyweights by key so millions of uses share a few objects.",
    "JDK: `Integer.valueOf` caches −128..127; string interning; `Boolean.TRUE/FALSE`."]);
  Q("Facade", "Medium", false, "F12", "A facade is turning into a 3,000-line god class. How do you fix it?", [
    "A facade should **delegate**, not hold business rules. Move logic back into the subsystem classes.",
    "Split it by use case (`CheckoutFacade`, `ReturnsFacade`) rather than one facade per subsystem.",
    "Keep it thin: orchestration, translation of DTOs, transaction boundaries."]);
  Q("Flyweight", "Hard", false, "F16", "Design rendering for a map with 1 million trees using Flyweight. How much memory do you save?", [
    "`TreeType(name, colour, texture)` is the flyweight (maybe 20 types, each holding a ~1 MB texture).",
    "`Tree(x, y, TreeType type)` stores only coordinates plus a reference (~24 bytes each).",
    "`TreeFactory.get(name, colour, texture)` caches types in a `Map` (`ConcurrentHashMap.computeIfAbsent` if multi-threaded).",
    "Without sharing: 1M × 1 MB ≈ 1 TB. With it: about 20 MB of textures plus 24 MB of trees."]);
  Q("Bridge", "Hard", false, "F15", "Design notifications where message types (Alert, Reminder, Promo) and channels (Email, SMS, Push) vary independently.", [
    "Abstraction hierarchy: `Notification` (abstract) with `AlertNotification`, `ReminderNotification`, `PromoNotification`; each builds its own content and rules (e.g. promos respect quiet hours).",
    "Implementor hierarchy: `Channel` interface with `EmailChannel`, `SmsChannel`, `PushChannel`.",
    "`Notification` **has a** `Channel` (the bridge): 3 + 3 classes instead of 9, and either side grows independently.",
    "Bridge is designed up front; Adapter is retrofitted to make existing interfaces fit."],
    { m: cd(["class Notification { <<abstract>>; #Channel channel; +send(User u) }", "class Channel { <<interface>>; +deliver(String to, String body) }", "Notification <|-- AlertNotification", "Notification <|-- ReminderNotification", "Notification <|-- PromoNotification", "Channel <|.. EmailChannel", "Channel <|.. SmsChannel", "Channel <|.. PushChannel", "Notification o-- Channel : bridge"]) });

  /* ---------------- Behavioral ---------------- */
  Q("Strategy", "Easy", true, "F17", "Replace an `if/else` on payment type with Strategy. How are strategies selected?", [
    "`PaymentStrategy` interface with `pay(amount)`; `UpiPayment`, `CardPayment`, `WalletPayment` implement it.",
    "The checkout holds a `PaymentStrategy` and delegates; selection happens once via a `Map<PaymentType, PaymentStrategy>` (or Spring injecting all beans into a map).",
    "Strategies can be lambdas when they're one method: `Comparator` is the JDK's classic strategy."]);
  Q("Strategy", "Medium", true, "F17", "Design a parking-fee calculator that supports hourly, flat weekend and EV-discount pricing.", [
    "`PricingStrategy.fee(Ticket t, Instant exit)`; implementations `HourlyPricing`, `WeekendFlatPricing`.",
    "EV discount is a **decorator** over any strategy (`DiscountedPricing(inner, 20%)`) so rules combine.",
    "A `PricingPolicy` picks the strategy by day/vehicle type; tests inject a fixed `Clock`."],
    { m: cd(["class PricingStrategy { <<interface>>; +fee(Ticket t, Instant exit) Money }", "PricingStrategy <|.. HourlyPricing", "PricingStrategy <|.. WeekendFlatPricing", "PricingStrategy <|.. DiscountedPricing", "DiscountedPricing o-- PricingStrategy : inner", "class ParkingLot { -PricingPolicy policy; +exit(Ticket t) Receipt }", "ParkingLot --> PricingPolicy", "PricingPolicy ..> PricingStrategy : selects"]) });
  Q("Observer", "Easy", true, "F18", "Implement Observer for a stock-price ticker. What memory and threading problems should you mention?", [
    "Subject keeps a list of `PriceListener`s, `subscribe/unsubscribe`, notifies each on change.",
    "**Memory leak**: forgotten subscriptions keep listeners alive (lapsed listener problem). Return a handle/`AutoCloseable` to unsubscribe.",
    "**Threading**: use `CopyOnWriteArrayList` so listeners can (un)subscribe during notification; a slow listener blocks others unless you dispatch asynchronously.",
    "A listener throwing shouldn't stop the others: catch and log per listener."],
    { code: "class Ticker {\n    private final List<Consumer<Double>> listeners = new CopyOnWriteArrayList<>();\n    AutoCloseable subscribe(Consumer<Double> l) { listeners.add(l); return () -> listeners.remove(l); }\n    void publish(double price) {\n        for (Consumer<Double> l : listeners) {\n            try { l.accept(price); } catch (RuntimeException e) { System.err.println(\"listener failed: \" + e); }\n        }\n    }\n}" });
  Q("Observer", "Medium", false, "F18", "Observer vs Pub-Sub: what's the difference?", [
    "**Observer**: subjects know their observers directly (in-process, synchronous by default).",
    "**Pub-Sub**: publishers and subscribers are decoupled by a **broker/topic**; they don't know each other, delivery is often async and can cross processes (Kafka, Redis, an in-memory event bus).",
    "Pub-Sub adds topics, filtering, buffering, back-pressure and delivery guarantees (at-least-once, ordering)."]);
  Q("Command", "Medium", true, "F19", "Design undo/redo for a text editor using Command.", [
    "`Command` with `execute()` and `undo()`; `InsertText`, `DeleteText` store what they need to reverse themselves.",
    "Two stacks: run → push on undo stack and clear redo; undo → pop, `undo()`, push on redo; redo → reverse.",
    "Group commands into a `MacroCommand` for multi-step actions; cap history size.",
    "Alternative: Memento snapshots (simpler, more memory) (see F26)."],
    { m: cd(["class Command { <<interface>>; +execute(); +undo() }", "Command <|.. InsertText", "Command <|.. DeleteText", "Command <|.. MacroCommand", "MacroCommand o-- Command", "class History { -Deque~Command~ undo; -Deque~Command~ redo; +run(Command c); +undo(); +redo() }", "History o-- Command", "InsertText --> Document", "DeleteText --> Document"]) });
  Q("Command", "Medium", false, "F19", "Where does Command show up outside of undo?", [
    "Task queues and thread pools: `Runnable`/`Callable` are commands.",
    "Job scheduling, retries and audit logs (serialise commands; replay them).",
    "GUI actions/menu items and remote controls (bind buttons to command objects).",
    "CQRS command handlers; transactional outbox entries."]);
  Q("State", "Medium", true, "F20", "Design a vending machine with the State pattern.", [
    "States: `Idle`, `HasMoney`, `Dispensing`, `OutOfStock`; each implements `insertCoin`, `select`, `dispense`, `refund`.",
    "Each state handles only valid actions and returns/sets the next state; invalid actions give a clear error.",
    "The machine (context) holds inventory, balance and current state; transitions are explicit and testable.",
    "Concurrency: one customer at a time, so synchronise the context's public methods."],
    { m: cd(["class VendingMachine { -State state; -Inventory inventory; -int balance; +insertCoin(int c); +select(String code) }", "class State { <<interface>>; +insertCoin(VendingMachine m, int c); +select(VendingMachine m, String code); +dispense(VendingMachine m) }", "VendingMachine --> State", "State <|.. Idle", "State <|.. HasMoney", "State <|.. Dispensing", "State <|.. OutOfStock"]) });
  Q("State", "Hard", false, "F20", "State pattern vs an enum + switch vs a transition table: when is each best?", [
    "**Enum + switch**: few states, simple behaviour; everything visible in one place. Sealed types + switch give exhaustiveness checks.",
    "**State classes**: behaviour differs a lot per state; adding a state means adding a class, not touching every switch.",
    "**Transition table** (`Map<State, Map<Event, State>>`): rules are data; good for workflow engines and config-driven flows, and easy to validate/visualise.",
    "Persist state as an enum/string either way; rebuild state objects on load."]);
  Q("Template Method", "Easy", false, "F21", "Explain Template Method using a data-import job (CSV, JSON, XML).", [
    "Abstract `DataImporter.run()` is `final` and fixes the algorithm: open → parse → validate → save → report.",
    "Subclasses implement only the varying steps (`parse`), and can override optional **hooks** (`beforeSave`).",
    "JDK/Spring: `AbstractList`, `HttpServlet.service → doGet`, `JdbcTemplate` (callback flavour)."]);
  Q("Template Method", "Medium", false, "F21", "Template Method vs Strategy: inheritance vs composition. Which would you choose for a new framework?", [
    "Template Method: simple when the skeleton is stable and variants are few; but binds variants at compile time and shares the base class's fields.",
    "Strategy: swap at runtime, test steps independently, combine steps freely.",
    "Modern frameworks lean to **callbacks/strategies** (`JdbcTemplate` with `RowMapper` lambdas) for flexibility; keep Template Method for internal skeletons."]);
  Q("Chain of Responsibility", "Medium", true, "F22", "Design an expense-approval chain: Manager (≤10k), Director (≤1L), CFO (above).", [
    "`Approver` with `next` and `handle(Expense)`; each approver approves within its limit or forwards.",
    "Build the chain from configuration so limits change without code changes.",
    "Decide what happens at the end of the chain (reject/escalate) and log who handled it.",
    "Variants: every handler runs (servlet filters, logging levels) vs the first match wins."]);
  Q("Chain of Responsibility", "Medium", false, "F22", "Where does Chain of Responsibility appear in Java frameworks?", [
    "Servlet `FilterChain` and Spring Security's filter chain.",
    "Spring `HandlerInterceptor`s; OkHttp/Retrofit interceptors.",
    "`java.util.logging` loggers passing records to parent handlers.",
    "Exception handling itself: the stack unwinds until a matching `catch`."]);
  Q("Iterator", "Easy", false, "F23", "Implement an iterator for a binary search tree that returns values in sorted order with O(h) memory.", [
    "Keep a stack; push the leftmost path. `next()` pops a node, then pushes the leftmost path of its right child.",
    "`hasNext()` = stack not empty. Each node is pushed/popped once: amortised O(1) per `next()`."],
    { code: "class BstIterator implements Iterator<Integer> {\n    record N(int v, N left, N right) { }\n    private final Deque<N> stack = new ArrayDeque<>();\n    BstIterator(N root) { pushLeft(root); }\n    private void pushLeft(N n) { while (n != null) { stack.push(n); n = n.left(); } }\n    public boolean hasNext() { return !stack.isEmpty(); }\n    public Integer next() {\n        if (stack.isEmpty()) throw new NoSuchElementException();\n        N n = stack.pop(); pushLeft(n.right()); return n.v();\n    }\n}" });
  Q("Iterator", "Medium", true, "F23", "Fail-fast vs fail-safe vs weakly consistent iterators: what's the difference?", [
    "**Fail-fast** (`ArrayList`, `HashMap`): `modCount` check throws `ConcurrentModificationException` if the collection changes outside the iterator (best effort, not a guarantee).",
    "**Fail-safe / snapshot** (`CopyOnWriteArrayList`): iterates over a snapshot; never throws, doesn't see new changes.",
    "**Weakly consistent** (`ConcurrentHashMap`, `ConcurrentLinkedQueue`): never throws, may or may not reflect concurrent updates.",
    "Removing while iterating: use `iterator.remove()` or `removeIf`."]);
  Q("Mediator", "Medium", false, "F24", "Design an air-traffic control tower with Mediator. Why not let planes talk directly?", [
    "With n planes talking directly there are n(n−1)/2 links and rules spread everywhere.",
    "`Tower` (mediator) owns runway state and the landing queue; `Aircraft` only calls `tower.requestLanding(this)` and receives instructions.",
    "Rules (priority for emergencies, one plane per runway) live in one place.",
    "Risk: the mediator becomes a god object; split by responsibility."]);
  Q("Mediator", "Medium", false, "F24", "Mediator vs Observer vs Facade: how are they different?", [
    "**Mediator**: colleagues talk *through* it, and it coordinates them in both directions.",
    "**Observer**: one-to-many notifications; the subject doesn't coordinate the listeners.",
    "**Facade**: one-way simplification; subsystems don't know about it.",
    "Mediators are often built *with* observer-style events."]);
  Q("Visitor", "Hard", false, "F25", "What is double dispatch and why does Visitor need it in Java?", [
    "Java picks overloads at **compile time** by static type; only the receiver is dispatched at runtime.",
    "`node.accept(visitor)` dispatches on the node type, then the node calls `visitor.visit(this)`, where `this` has the concrete static type, selecting the right overload.",
    "Adding an operation = a new visitor; adding a node type = change every visitor (the trade-off).",
    "Java 21: sealed interfaces + pattern-matching `switch` give exhaustiveness without accept/visit boilerplate."]);
  Q("Visitor", "Medium", false, "F25", "Design tax and shipping calculation over a cart of Book, Electronics and Grocery items using Visitor.", [
    "`Item.accept(ItemVisitor v)`; `TaxVisitor` and `ShippingVisitor` hold the per-type rules and accumulate totals.",
    "Item classes stay data-only; new calculations (export, discount audit) are new visitors.",
    "Mention the sealed-switch alternative and when it's simpler."],
    { m: cd(["class Item { <<interface>>; +accept(ItemVisitor v) }", "class ItemVisitor { <<interface>>; +visit(Book b); +visit(Electronics e); +visit(Grocery g) }", "Item <|.. Book", "Item <|.. Electronics", "Item <|.. Grocery", "ItemVisitor <|.. TaxVisitor", "ItemVisitor <|.. ShippingVisitor", "Cart o-- Item"]) });
  Q("Memento", "Medium", false, "F26", "Implement game checkpoints with Memento while keeping the game's internals encapsulated.", [
    "`Game.save()` returns an opaque, immutable `Snapshot` (e.g. a record with private-package fields or a nested class only `Game` can read).",
    "`Caretaker` (`SaveSlots`) stores snapshots but can't inspect or change them.",
    "`Game.restore(snapshot)` resets state; copy mutable collections when saving."]);
  Q("Memento", "Medium", false, "F26", "Memento vs Command for undo: trade-offs?", [
    "**Memento** stores whole snapshots: simple and robust, but memory-heavy for large state.",
    "**Command** stores inverse operations: compact, but every command must implement a correct `undo` (harder for complex edits).",
    "Hybrids: periodic snapshots + commands since the last snapshot (like event sourcing).",
    "Persistent/immutable data structures make snapshots cheap via structural sharing."]);

  /* ---------------- Concurrency ---------------- */
  Q("Concurrency", "Easy", true, "F27", "Process vs thread; `Runnable` vs `Callable`; `start()` vs `run()`.", [
    "Processes have separate memory; threads share the process heap (cheap to create, need synchronisation).",
    "`Runnable.run()` returns nothing and can't throw checked exceptions; `Callable.call()` returns a value and can throw; submit either to an executor for a `Future`.",
    "`start()` creates a new thread that calls `run()`; calling `run()` directly just runs it on the current thread."]);
  Q("Concurrency", "Medium", true, "F27", "How does `ThreadPoolExecutor` decide whether to run, queue or reject a task?", [
    "1. Fewer than `corePoolSize` threads → start a new thread.",
    "2. Otherwise offer to the work queue.",
    "3. Queue full → start a thread if fewer than `maximumPoolSize`.",
    "4. Still no room → `RejectedExecutionHandler` (Abort, CallerRuns, Discard, DiscardOldest).",
    "Gotcha: with an unbounded `LinkedBlockingQueue` the pool never grows past core and the queue can eat memory: `Executors.newFixedThreadPool` does exactly this."]);
  Q("Concurrency", "Medium", true, "F27", "How would you call 3 fare APIs in parallel with a timeout and take whatever returns in time?", [
    "`CompletableFuture.supplyAsync(..., ioPool)` for each call, with `.completeOnTimeout(fallback, 800, ms)` or `.orTimeout(...)` + `exceptionally`.",
    "`CompletableFuture.allOf(...)` then join the results; filter failures.",
    "Use a dedicated bounded executor for I/O (not the common pool), and propagate cancellation.",
    "Java 21: virtual threads with plain blocking calls are another option."]);
  Q("Concurrency", "Medium", true, "F27", "What are virtual threads (Java 21) and when do they help?", [
    "Lightweight threads scheduled by the JVM on a few carrier threads; blocking I/O unmounts them, so you can have millions.",
    "They help **I/O-bound** thread-per-request code; they don't speed up CPU-bound work.",
    "Don't pool them; limit concurrency to downstream resources with semaphores.",
    "Pinning: blocking inside `synchronized` (before JDK 24) or native code pins the carrier; prefer `ReentrantLock` around blocking calls there."]);
  Q("Concurrency", "Easy", true, "F28", "What is a race condition? Show the `count++` problem and three ways to fix it.", [
    "`count++` is read → add → write; two threads can read the same value and lose an update.",
    "Fixes: `synchronized` method/block; `AtomicInteger.incrementAndGet()` (CAS); `LongAdder` for high-contention counters.",
    "Or avoid sharing: confine state to one thread / use immutable messages."],
    { code: "class Counter {\n    private final AtomicInteger count = new AtomicInteger();\n    void hit() { count.incrementAndGet(); }\n    int get() { return count.get(); }\n}" });
  Q("Concurrency", "Medium", true, "F28", "`synchronized` vs `ReentrantLock`: when do you need the lock?", [
    "Both are reentrant mutual-exclusion locks with the same memory-visibility guarantees.",
    "`ReentrantLock` adds `tryLock` (with timeout), `lockInterruptibly`, fairness, and multiple `Condition`s.",
    "`synchronized` is simpler and can't be forgotten to unlock; prefer it unless you need those features.",
    "Always `unlock()` in `finally`."]);
  Q("Concurrency", "Hard", true, "F28", "What are the four conditions for deadlock? How do you prevent it in a bank-transfer system?", [
    "Coffman conditions: mutual exclusion, hold and wait, no preemption, circular wait.",
    "Break circular wait: always lock accounts in a **global order** (by account id).",
    "Or `tryLock` with timeout and back off with jitter; or a single-threaded executor per shard.",
    "Detect: thread dumps / `ThreadMXBean.findDeadlockedThreads()`."],
    { code: "static void transfer(Account a, Account b, long amt) {\n    Account first = a.id() < b.id() ? a : b, second = first == a ? b : a;\n    synchronized (first) { synchronized (second) { a.debit(amt); b.credit(amt); } }\n}\ninterface Account { long id(); void debit(long x); void credit(long x); }" });
  Q("Concurrency", "Hard", false, "F28", "Explain `volatile`, happens-before, and when `volatile` is not enough.", [
    "`volatile` guarantees visibility and ordering: a write happens-before every later read of that variable.",
    "It doesn't make compound actions atomic (`v++`, check-then-act).",
    "Good for flags (`running`), safely publishing immutable objects, DCL.",
    "Other happens-before edges: unlock → lock of the same monitor, `Thread.start`, `Thread.join`, executor submit → task, final fields after construction."]);
  Q("Concurrency", "Medium", true, "F29", "Design a thread-safe unique ID generator (Snowflake-style).", [
    "64-bit: timestamp (41 bits) | machine id (10) | sequence (12).",
    "`synchronized long next()`: read time; same millisecond → increment sequence, on overflow wait for the next ms; new ms → reset sequence.",
    "Clock moved backwards → wait or fail loudly. Machine ids from config/ZooKeeper.",
    "Read the clock **inside** the lock, or two threads can see times out of order."]);
  Q("Concurrency", "Medium", true, "F30", "Implement a bounded blocking queue using `wait/notifyAll` (or `Condition`).", [
    "`put` waits while full; `take` waits while empty; both in `while` loops (spurious wakeups).",
    "With two `Condition`s (`notFull`, `notEmpty`) you wake only the right side.",
    "In production use `ArrayBlockingQueue`/`LinkedBlockingQueue`."],
    { code: "class BoundedQueue<T> {\n    private final Deque<T> q = new ArrayDeque<>(); private final int cap;\n    BoundedQueue(int cap) { this.cap = cap; }\n    synchronized void put(T t) throws InterruptedException {\n        while (q.size() == cap) wait();\n        q.addLast(t); notifyAll();\n    }\n    synchronized T take() throws InterruptedException {\n        while (q.isEmpty()) wait();\n        T t = q.removeFirst(); notifyAll(); return t;\n    }\n}" });
  Q("Concurrency", "Medium", false, "F30", "How do you shut down a producer–consumer pipeline cleanly?", [
    "Poison pill: producers finish, then put one sentinel per consumer; consumers exit on it.",
    "Or `executor.shutdown()` + interrupt consumers blocked in `take()` and let them drain.",
    "Back-pressure: bounded queues so a slow consumer slows producers instead of exhausting memory; `offer` with timeout to shed load."]);
  Q("Concurrency", "Medium", true, "F31", "How does `ConcurrentHashMap` work in Java 8+? Why is `get-then-put` still unsafe?", [
    "Array of bins; empty bins filled by CAS, non-empty bins locked per bin (`synchronized` on the first node); long bins become trees; reads are lock-free.",
    "Each call is atomic, but `if (!map.containsKey(k)) map.put(k, v)` is two calls: another thread can act in between.",
    "Use atomic methods: `putIfAbsent`, `computeIfAbsent`, `merge`, `compute`.",
    "Nulls are not allowed (ambiguity between absent and null)."],
    { code: "Map<String, Long> hits = new ConcurrentHashMap<>();\nhits.merge(\"home\", 1L, Long::sum);   // atomic increment per key" });
  Q("Concurrency", "Hard", true, "F31", "Design a thread-safe LRU cache.", [
    "Single lock: `LinkedHashMap(accessOrder=true)` + `removeEldestEntry`, all methods `synchronized`. Simple; fine for moderate load.",
    "Higher throughput: stripe into N segments by key hash, each a locked LRU (approximate global LRU).",
    "Or a `ConcurrentHashMap` + concurrent deque with lazy reordering (what Caffeine does with buffers).",
    "Watch out: `get` mutates order in an LRU, so reads need the lock too."],
    { m: cd(["class LruCache~K,V~ { -int capacity; -Map~K,Node~ map; -Node head; -Node tail; +get(K key) V; +put(K key, V value) }", "class Node { K key; V value; Node prev; Node next }", "LruCache *-- Node"]) });
  Q("Concurrency", "Medium", false, "F31", "When would you use `CopyOnWriteArrayList`, `ConcurrentSkipListMap` and `LongAdder`?", [
    "`CopyOnWriteArrayList`: read-mostly lists like listeners; writes copy the array (expensive), iteration never throws.",
    "`ConcurrentSkipListMap`: sorted concurrent map (leaderboards, time-ordered events, range queries).",
    "`LongAdder`: hot counters/metrics; spreads updates across cells, sums on read."]);

  /* ---------------- Java-specific ---------------- */
  Q("Java", "Easy", true, "F01", "Explain the `equals`/`hashCode` contract. What breaks if you override only `equals`?", [
    "Equal objects must have equal hash codes; `hashCode` must be stable while the object is in a hash collection.",
    "Override only `equals` → two equal keys land in different buckets: `HashSet` holds duplicates, `HashMap.get` misses.",
    "Use immutable fields for both; records generate them correctly."]);
  Q("Java", "Medium", true, "F01", "How does `HashMap` work internally (Java 8+)?", [
    "Array of buckets; index = `(n − 1) & (h ^ (h >>> 16))`.",
    "Collisions chain in a linked list; a bucket turns into a red-black tree beyond 8 entries (when capacity ≥ 64).",
    "Resizes ×2 when size > capacity × load factor (0.75); entries split between the old index and old index + old capacity.",
    "Not thread-safe; mutable keys break lookups."]);
  Q("Java", "Medium", true, "F01", "How do you make a class immutable? Why is `String` immutable?", [
    "`final` class (or private constructor), `private final` fields, no setters, defensive copies in and out (`List.copyOf`), no leaking `this` in the constructor.",
    "`String` immutability enables the string pool, cached hash codes, safe use as map keys, and security (class names, file paths can't change after checks).",
    "Immutable objects are thread-safe without locks."]);
  Q("Java", "Medium", false, "F01", "What are records and sealed classes good for in LLD?", [
    "**Records**: concise immutable data carriers with generated `equals/hashCode/toString`; ideal for value objects (`Money`, `Position`), DTOs, events.",
    "**Sealed** interfaces restrict implementations (`sealed interface Shape permits Circle, Rect`), enabling exhaustive pattern-matching `switch`.",
    "Together they model algebraic data types: commands, events, AST nodes, results."],
    { code: "sealed interface PaymentResult permits Paid, Declined { }\nrecord Paid(String txnId) implements PaymentResult { }\nrecord Declined(String reason) implements PaymentResult { }\nstatic String show(PaymentResult r) {\n    return switch (r) {\n        case Paid p -> \"paid \" + p.txnId();\n        case Declined d -> \"declined: \" + d.reason();\n    };\n}" });
  Q("Java", "Medium", false, "F01", "What is type erasure? What can't you do with generics because of it?", [
    "Generic type arguments are removed at compile time; `List<String>` and `List<Integer>` are the same class at runtime.",
    "You can't `new T()`, create `new T[]`, use `instanceof List<String>`, or overload methods differing only by type argument.",
    "Workarounds: pass `Class<T>` or a `Supplier<T>`; super type tokens.",
    "PECS: `? extends T` to read (producer), `? super T` to write (consumer)."]);
  Q("Java", "Easy", true, "F01", "Checked vs unchecked exceptions: how do you design exceptions for a booking service?", [
    "Checked (`IOException`) must be declared/handled; unchecked (`RuntimeException`) don't.",
    "Domain errors the caller can act on: specific exception types (`SeatUnavailableException`) or result types (`sealed BookingResult`).",
    "Programming errors: unchecked (`IllegalArgumentException`, `IllegalStateException`).",
    "Wrap low-level exceptions at boundaries; keep the cause; don't swallow."]);
  Q("Java", "Easy", true, "F01", "`Comparable` vs `Comparator`: when do you use each?", [
    "`Comparable.compareTo` defines the class's **natural order** (one per class).",
    "`Comparator` defines external orders, many per class: `Comparator.comparing(Player::score).reversed().thenComparing(Player::name)`.",
    "Keep `compareTo` consistent with `equals` (otherwise `TreeSet`/`TreeMap` treat unequal objects as duplicates)."]);
  Q("Java", "Medium", false, "F01", "Static nested class vs inner class vs anonymous class vs lambda?", [
    "**Static nested**: no reference to the outer instance; use by default (builders, nodes).",
    "**Inner**: holds a hidden reference to the outer instance; can leak memory (e.g. a listener outliving its activity).",
    "**Anonymous**: one-off subclass/implementation; `this` refers to itself.",
    "**Lambda**: only for functional interfaces; no new scope for `this`; captures effectively final variables."]);
  Q("Java", "Easy", true, "F01", "Is Java pass-by-value or pass-by-reference?", [
    "Always **pass-by-value**. For objects, the value is a copy of the reference.",
    "So a method can mutate the object the reference points to, but reassigning the parameter doesn't affect the caller's variable.",
    "Classic demo: a `swap(a, b)` method can't swap the caller's references."]);
  Q("Java", "Medium", false, "F01", "How should you use `Optional`? What are the anti-patterns?", [
    "Use as a **return type** for \"maybe absent\" results: `findById` → `Optional<User>`.",
    "Chain: `map`, `filter`, `orElseThrow`, `orElseGet` (lazy) vs `orElse` (always evaluated).",
    "Anti-patterns: `Optional` fields or parameters, `Optional` of collections (return an empty collection), `opt.get()` without a check, `Optional` holding null."]);
  Q("Java", "Medium", false, "F01", "What should you watch for when using streams in production code?", [
    "Lazy: nothing runs until a terminal operation; streams are single-use.",
    "Side effects in `map`/`filter` are bugs waiting to happen; use collectors (`groupingBy`, `toMap` with a merge function).",
    "`parallel()` uses the common ForkJoinPool: fine for CPU-bound bulk work on large data, bad for blocking I/O or small inputs.",
    "Readability first: a plain loop is fine when the stream would be convoluted."]);
  Q("Java", "Easy", false, "F01", "`final` vs `finally` vs `finalize`; and what does try-with-resources do?", [
    "`final`: variable can't be reassigned / method can't be overridden / class can't be extended.",
    "`finally`: block that always runs after try/catch (except on JVM exit).",
    "`finalize`: deprecated GC hook; use `Cleaner` or explicit `close()` instead.",
    "Try-with-resources closes `AutoCloseable` resources in reverse order and records close-time failures as suppressed exceptions."]);

  /* ---------------- Machine coding ---------------- */
  Q("Machine coding", "Medium", true, "F32", "How do you structure a 60–90 minute machine-coding round?", [
    "**5–10 min**: clarify requirements, write down in-scope/out-of-scope, agree on a CLI/main-method demo.",
    "**5–10 min**: entities, relationships and the 2–3 key interfaces (class diagram outline).",
    "**40–50 min**: code the happy path end to end first, in-memory repositories, then edge cases.",
    "**Last 10 min**: demo, tests or a driver, then talk through extensions, concurrency and patterns used.",
    "Graded on: working code, separation of concerns, extensibility (interfaces + Strategy/State), naming, edge cases."]);
  Q("Machine coding", "Easy", true, "F32", "What are common mistakes in machine-coding rounds?", [
    "Designing for 40 minutes and running out of time to code; or coding without agreeing scope.",
    "God classes (`ParkingLotManager` doing everything), logic in `main`, public mutable fields.",
    "Pattern-stuffing: patterns without a reason; switches on type strings instead of polymorphism.",
    "Ignoring edge cases (invalid input, full lot, double booking) and concurrency when it's obviously asked.",
    "Not running the code: always leave time for a demo."]);
  Q("Machine coding", "Easy", true, "P01", "Design Tic-Tac-Toe for an N×N board with 2+ players.", [
    "**Requirements**: N×N board, players take turns, detect win/draw, reject invalid moves.",
    "**Entities**: `Game`, `Board`, `Player`, `Move`, `Symbol`; `GameStatus` enum.",
    "**Key idea**: O(1) win check with row/column/diagonal counters per player instead of scanning the board.",
    "**Patterns**: Strategy for `WinRule`/bot moves; State or a status enum for the game.",
    "**Extensions**: undo (Command), AI player, K-in-a-row, replay."],
    { m: cd(["class Game { -Board board; -List~Player~ players; -int turn; -GameStatus status; +play(int r, int c) GameStatus }", "class Board { -int n; -Symbol[][] cells; +place(int r, int c, Symbol s) }", "class Player { -String name; -Symbol symbol }", "class WinRule { <<interface>>; +isWin(Board b, Move m) boolean }", "Game *-- Board", "Game o-- Player", "Game --> WinRule", "WinRule <|.. CounterWinRule"]) });
  Q("Machine coding", "Easy", false, "P02", "Design Snake & Ladder.", [
    "**Entities**: `Game`, `Board` (size, `Map<Integer,Integer>` jumps for snakes and ladders), `Player` (position), `Dice`.",
    "**Flow**: turn queue (`Deque<Player>`), roll, move, apply jump, check exact-100 win rule.",
    "**Patterns**: Strategy for `Dice` (normal, crooked, multiple dice) and for movement rules.",
    "**Validation**: no cycles, no jump starting at 100, snakes go down/ladders up.",
    "**Extensions**: rolling a 6 gives another turn, 3 sixes forfeit, multiple boards."],
    { m: cd(["class Game { -Board board; -Deque~Player~ turns; -Dice dice; +playTurn() Player }", "class Board { -int size; -Map~Integer,Integer~ jumps; +finalPosition(int p) int }", "class Dice { <<interface>>; +roll() int }", "Dice <|.. StandardDice", "Dice <|.. CrookedDice", "Game *-- Board", "Game o-- Player", "Game --> Dice"]) });
  Q("Machine coding", "Easy", true, "P03", "Design an LRU cache with O(1) `get` and `put`.", [
    "`HashMap<K, Node>` + doubly linked list (head = most recent, tail = eviction).",
    "`get`: lookup, move node to head. `put`: update or insert at head; over capacity → remove tail and its map entry.",
    "Sentinel head/tail nodes remove null checks.",
    "**Extensions**: eviction policy Strategy (LRU/LFU/FIFO), TTL, thread safety (see Concurrency), stats."],
    { m: cd(["class Cache~K,V~ { <<interface>>; +get(K key) V; +put(K key, V value) }", "class LruCache~K,V~ { -int capacity; -Map~K,Node~ map; -DoublyLinkedList list }", "class EvictionPolicy { <<interface>>; +touch(K key); +evict() K }", "Cache <|.. LruCache", "LruCache --> EvictionPolicy", "EvictionPolicy <|.. LruPolicy", "EvictionPolicy <|.. LfuPolicy"]) });
  Q("Machine coding", "Easy", true, "P04", "Design a logging framework (levels, multiple sinks, async).", [
    "**Entities**: `Logger` (per name), `LogLevel` enum, `LogRecord`, `Appender` (Console, File, Remote), `Formatter`.",
    "Level filtering + Chain of Responsibility or a list of appenders each with its own min level.",
    "**Patterns**: Singleton/registry for `LoggerFactory`, Strategy for formatters, Observer-like fan-out to appenders.",
    "**Concurrency**: async appender = bounded queue + background writer thread; decide drop vs block when full; flush on shutdown."],
    { m: cd(["class LoggerFactory { +getLogger(String name) Logger }", "class Logger { -String name; -LogLevel min; -List~Appender~ appenders; +log(LogLevel l, String msg) }", "class Appender { <<interface>>; +append(LogRecord r) }", "class Formatter { <<interface>>; +format(LogRecord r) String }", "LoggerFactory ..> Logger", "Logger o-- Appender", "Appender <|.. ConsoleAppender", "Appender <|.. FileAppender", "Appender <|.. AsyncAppender", "AsyncAppender o-- Appender : delegate", "Appender --> Formatter"]) });
  Q("Machine coding", "Easy", false, "P05", "Design a library management system.", [
    "**Entities**: `Book` (title/ISBN) vs `BookCopy` (barcode, status), `Member`, `Loan`, `Reservation`, `Fine`.",
    "**Rules**: max loans per member, due dates, fines per day late, reservation queue per book.",
    "**Patterns**: Strategy for fine calculation, Observer to notify the next reserver when a copy returns, Repository interfaces for storage.",
    "**Search**: by title/author/ISBN through an index service; keep it separate from loans."],
    { m: cd(["class Book { -String isbn; -String title; -String author }", "class BookCopy { -String barcode; -CopyStatus status }", "class Member { -String id; -int maxLoans }", "class Loan { -BookCopy copy; -Member member; -LocalDate due; -LocalDate returned }", "class LibraryService { +checkout(String memberId, String barcode) Loan; +returnCopy(String barcode) Fine }", "class FinePolicy { <<interface>>; +fine(Loan l, LocalDate d) Money }", "Book *-- BookCopy", "Loan --> BookCopy", "Loan --> Member", "LibraryService --> FinePolicy"]) });
  Q("Machine coding", "Medium", true, "P06", "Design a parking lot (multiple floors, vehicle types, tickets, payment).", [
    "**Entities**: `ParkingLot` → `Floor` → `Spot` (type: bike/car/truck/EV), `Vehicle`, `Ticket`, `Gate`, `Payment`.",
    "**Strategies**: `SpotAllocationStrategy` (nearest, by floor, EV first) and `PricingStrategy` (hourly, flat).",
    "**Concurrency**: two entry gates must not get the same spot: allocate under a lock per floor, or `ConcurrentLinkedQueue`/`BlockingQueue` of free spots per type.",
    "**Extensions**: display boards (Observer), reservations, multiple lots, lost ticket."],
    { m: cd(["class ParkingLot { -List~Floor~ floors; -SpotAllocationStrategy alloc; -PricingStrategy pricing; +park(Vehicle v) Ticket; +exit(Ticket t) Receipt }", "class Floor { -int number; -Map~SpotType,SpotQueue~ free }", "class Spot { -String id; -SpotType type; -boolean occupied }", "class Ticket { -String id; -Vehicle vehicle; -Spot spot; -Instant entry }", "class SpotAllocationStrategy { <<interface>>; +find(List~Floor~ f, VehicleType t) Spot }", "class PricingStrategy { <<interface>>; +fee(Ticket t, Instant exit) Money }", "ParkingLot *-- Floor", "Floor *-- Spot", "ParkingLot --> SpotAllocationStrategy", "ParkingLot --> PricingStrategy", "Ticket --> Spot"]) });
  Q("Machine coding", "Medium", true, "P07", "Design a vending machine.", [
    "**States**: Idle → HasMoney → Dispensing → Idle, plus OutOfStock/Maintenance (State pattern; see the State question).",
    "**Entities**: `Inventory` (`Map<String code, Slot>`), `Product`, `Coin`/`Note` enums, `CashBox` for change.",
    "**Change-making**: greedy over denominations, but check availability; if exact change impossible, refuse the sale and refund.",
    "**Extensions**: card payments (Strategy), admin restock, sales reports."]);
  Q("Machine coding", "Medium", false, "P08", "Design an ATM.", [
    "**States**: Idle → CardInserted → Authenticated → Transaction → Idle (State pattern).",
    "**Cash dispensing**: Chain of Responsibility over note dispensers (2000 → 500 → 100); plan first, commit only if the full amount can be paid.",
    "**Entities**: `Atm`, `CardReader`, `Keypad`, `CashDispenser`, `BankService` (interface to the bank), `Transaction` types (Withdraw, Balance, Deposit).",
    "**Rules**: PIN retries and card retention, daily limit, idempotent bank debit and reversal if dispensing fails."]);
  Q("Machine coding", "Medium", true, "P09", "Design an in-memory rate limiter (per user / per API).", [
    "**Algorithms** (Strategy): token bucket (bursts allowed), fixed window, sliding-window log, sliding-window counter.",
    "`RateLimiter.allow(key)`; limiters per key in a `ConcurrentHashMap` (`computeIfAbsent`).",
    "**Concurrency**: token bucket with `synchronized` refill+take per bucket, or CAS on an `AtomicLong` state.",
    "**Testability**: inject a `Clock`/time source. **Extensions**: per-tier rules from config, distributed version with Redis."],
    { code: "class TokenBucket {\n    private final long capacity; private final double refillPerNano; private double tokens; private long last;\n    TokenBucket(long capacity, long perSecond, long now) { this.capacity = capacity; this.refillPerNano = perSecond / 1e9; tokens = capacity; last = now; }\n    synchronized boolean tryAcquire(long now) {\n        tokens = Math.min(capacity, tokens + (now - last) * refillPerNano); last = now;\n        if (tokens < 1) return false;\n        tokens -= 1; return true;\n    }\n}",
      m: cd(["class RateLimiter { <<interface>>; +allow(String key) boolean }", "RateLimiter <|.. TokenBucketLimiter", "RateLimiter <|.. SlidingWindowLimiter", "class LimiterRegistry { -Map~String,RateLimiter~ byKey; -RuleProvider rules; +allow(String user, String api) boolean }", "LimiterRegistry o-- RateLimiter", "TokenBucketLimiter --> Clock"]) });
  Q("Machine coding", "Medium", true, "P10", "Design Splitwise (equal, exact and percentage splits, simplify debts).", [
    "**Entities**: `User`, `Group`, `Expense` (payer, amount, `List<Split>`), `Split` subtypes (Equal/Exact/Percent), `BalanceSheet`.",
    "**Strategy** per split type validates and computes shares (exact splits must sum to the total; percents to 100; handle rounding paise).",
    "**Balances**: `Map<User, Map<User, Long>>` or net balance per user.",
    "**Simplify debts**: net balances, then greedily match the biggest creditor with the biggest debtor (heaps) → at most n−1 transfers."],
    { m: cd(["class Expense { -User paidBy; -long amount; -List~Split~ splits; -SplitType type }", "class Split { <<abstract>>; -User user; -long share }", "Split <|-- EqualSplit", "Split <|-- ExactSplit", "Split <|-- PercentSplit", "class SplitStrategy { <<interface>>; +compute(long amount, List~Split~ s) List~Split~ }", "class ExpenseService { +addExpense(Expense e); +balances(User u) Map~User,Long~; +simplify(Group g) List~Transfer~ }", "Expense *-- Split", "ExpenseService --> SplitStrategy", "ExpenseService --> BalanceSheet"]) });
  Q("Machine coding", "Medium", true, "P11", "Design an in-memory Pub-Sub / message queue (Kafka-lite).", [
    "**Entities**: `Topic` (append-only list/partitions), `Message`, `Publisher`, `Subscriber`/`ConsumerGroup` with **offsets**.",
    "Push model: each subscriber has a worker thread waiting for new messages; pull model: `poll(topic, offset)`.",
    "**Concurrency**: per-topic lock or `CopyOnWriteArrayList` of messages; `wait/notify` or `BlockingQueue` to wake consumers.",
    "**Extensions**: retries + dead-letter queue, offset reset/replay, retention, partitions with ordering per key."],
    { m: cd(["class Broker { -Map~String,Topic~ topics; +publish(String topic, Message m); +subscribe(String topic, Subscriber s) }", "class Topic { -String name; -List~Message~ log; -Map~Subscriber,Integer~ offsets }", "class Subscriber { <<interface>>; +onMessage(Message m) }", "Broker *-- Topic", "Topic o-- Message", "Topic o-- Subscriber", "Broker --> SubscriberWorker"]) });
  Q("Machine coding", "Hard", true, "P12", "Design an elevator system (multiple cars).", [
    "**Entities**: `ElevatorSystem`, `Elevator` (current floor, direction, state, stop sets), `Request` (hall call with direction, car call), `Dispatcher`.",
    "**Scheduling** (Strategy): nearest car moving in the same direction, LOOK/SCAN algorithm per car (serve all stops in one direction, then reverse).",
    "**States**: Idle, MovingUp, MovingDown, DoorsOpen, Maintenance.",
    "**Concurrency**: requests arrive from many threads; a single controller loop or per-car thread with thread-safe request queues.",
    "**Extensions**: capacity/weight, VIP/fire mode, energy-saving parking."],
    { m: cd(["class ElevatorSystem { -List~Elevator~ cars; -DispatchStrategy dispatch; +hallCall(int floor, Direction d); +carCall(int car, int floor) }", "class Elevator { -int floor; -Direction dir; -ElevatorState state; -TreeSet~Integer~ upStops; -TreeSet~Integer~ downStops; +step() }", "class DispatchStrategy { <<interface>>; +choose(List~Elevator~ cars, Request r) Elevator }", "ElevatorSystem *-- Elevator", "ElevatorSystem --> DispatchStrategy", "DispatchStrategy <|.. NearestSameDirection", "Elevator --> ElevatorState"]) });
  Q("Machine coding", "Hard", true, "P13", "Design BookMyShow: how do you stop two users from booking the same seat?", [
    "**Entities**: `City`, `Theatre`, `Screen`, `Seat`, `Movie`, `Show`, `ShowSeat` (status AVAILABLE/LOCKED/BOOKED, lockedBy, lockExpiry), `Booking`, `Payment`.",
    "**Flow**: select seats → **temporary hold** (e.g. 5–10 min) → pay → confirm; holds expire automatically.",
    "**Concurrency**: lock all requested seats atomically: sort seat ids and lock per seat, or CAS status AVAILABLE→LOCKED, rolling back on any failure. In a DB: `SELECT … FOR UPDATE` or a version column (optimistic locking).",
    "**Patterns**: Strategy for pricing (weekday/premium) and payment; Observer for notifications.",
    "**Extensions**: seat-hold expiry scheduler, cancellations/refunds, offers."],
    { m: cd(["class Show { -Movie movie; -Screen screen; -Instant start; -Map~String,ShowSeat~ seats }", "class ShowSeat { -Seat seat; -SeatStatus status; -String heldBy; -Instant holdExpiry }", "class BookingService { +hold(String showId, List~String~ seatIds, String user) Hold; +confirm(String holdId, Payment p) Booking }", "class SeatLockProvider { <<interface>>; +lock(Show s, List~String~ ids, String user) boolean; +unlock(Show s, List~String~ ids, String user) }", "Show *-- ShowSeat", "Show --> Movie", "Show --> Screen", "BookingService --> SeatLockProvider", "BookingService ..> Booking", "SeatLockProvider <|.. InMemorySeatLockProvider"]) });
  Q("Machine coding", "Hard", false, "P14", "Design a chess game.", [
    "**Entities**: `Game`, `Board` (8×8 `Cell`s), `Piece` (abstract) with `King`, `Queen`, `Rook`, `Bishop`, `Knight`, `Pawn`, `Player`, `Move`.",
    "Each piece implements `canMove(board, from, to)` (polymorphism, not a type switch); sliding pieces share a path-is-clear helper.",
    "**Game rules**: turn order, check (is the king attacked after the move?), checkmate/stalemate, castling, en passant, promotion.",
    "**Patterns**: Command for moves (undo, history, PGN), State for game status, Factory for initial setup.",
    "**Extensions**: clocks, AI player (Strategy), network play."],
    { m: cd(["class Game { -Board board; -Player white; -Player black; -Deque~Move~ history; +move(Position from, Position to) }", "class Piece { <<abstract>>; -Colour colour; +canMove(Board b, Position from, Position to) boolean }", "Piece <|-- King", "Piece <|-- Queen", "Piece <|-- Rook", "Piece <|-- Bishop", "Piece <|-- Knight", "Piece <|-- Pawn", "class Move { -Position from; -Position to; -Piece captured; +undo(Board b) }", "Game *-- Board", "Board o-- Piece", "Game o-- Move"]) });
  Q("Machine coding", "Hard", true, "P15", "Design a hotel booking system (rooms over date ranges).", [
    "**Entities**: `Hotel`, `RoomType`, `Room`, `Guest`, `Reservation` (room, check-in, check-out, status), `Payment`, `Invoice`.",
    "**Availability**: a room is free if no active reservation overlaps `[in, out)`: overlap iff `a.in < b.out && b.in < a.out`. Index per room with a `TreeMap` by check-in date.",
    "**Concurrency**: lock per room (or per room-type inventory count per night) when booking; optimistic locking in a DB.",
    "**Patterns**: Strategy for pricing (seasonal, weekend), State for reservation lifecycle (Pending → Confirmed → CheckedIn → CheckedOut / Cancelled), Observer for notifications.",
    "**Extensions**: overbooking policy, cancellation fees, loyalty points."],
    { m: cd(["class Hotel { -List~Room~ rooms; +search(LocalDate in, LocalDate out, RoomType t) List~Room~ }", "class Room { -String number; -RoomType type; -TreeMap~LocalDate,Reservation~ bookings; +isFree(LocalDate in, LocalDate out) boolean }", "class Reservation { -Guest guest; -Room room; -LocalDate in; -LocalDate out; -ReservationState state }", "class PricingStrategy { <<interface>>; +price(RoomType t, LocalDate night) Money }", "Hotel *-- Room", "Room o-- Reservation", "Reservation --> Guest", "Hotel --> PricingStrategy"]) });
  Q("Machine coding", "Hard", true, "", "Design a food-delivery app (restaurants, menus, cart, orders, delivery partners).", [
    "**Entities**: `Restaurant` (menu, open hours, location), `MenuItem`, `Cart` (single restaurant), `Order`, `OrderItem`, `DeliveryPartner`, `Customer`, `Payment`.",
    "**Order lifecycle** (State): PLACED → ACCEPTED → PREPARING → PICKED_UP → DELIVERED / CANCELLED, with allowed transitions only.",
    "**Assignment** (Strategy): nearest available partner, or batched by area; partner status AVAILABLE/BUSY changed atomically (CAS/lock) so two orders can't grab the same partner.",
    "**Observer**: notify customer/restaurant/partner on status changes. **Strategy** for pricing (delivery fee, surge, coupons).",
    "**Extensions**: ratings, scheduled orders, multi-restaurant carts, ETA estimates."],
    { m: cd(["class Restaurant { -String id; -Location loc; -List~MenuItem~ menu; -boolean open }", "class Cart { -Restaurant restaurant; -Map~MenuItem,Integer~ items; +checkout(PaymentMethod p) Order }", "class Order { -String id; -List~OrderItem~ items; -OrderState state; -DeliveryPartner partner; +advance(OrderEvent e) }", "class AssignmentStrategy { <<interface>>; +assign(Order o, List~DeliveryPartner~ free) DeliveryPartner }", "class OrderListener { <<interface>>; +onStatus(Order o) }", "Restaurant *-- MenuItem", "Cart --> Restaurant", "Order *-- OrderItem", "Order --> DeliveryPartner", "OrderService --> AssignmentStrategy", "OrderService o-- OrderListener"]) });
  Q("Machine coding", "Hard", true, "", "Design a cab-booking system (Uber/Ola style).", [
    "**Entities**: `Rider`, `Driver` (location, status, vehicle type), `Ride` (pickup, drop, fare, state), `Vehicle`, `Location`, `Payment`.",
    "**Matching** (Strategy): nearest available driver of the requested type within a radius; a grid/geohash index of drivers instead of scanning all.",
    "**Concurrency**: offer a ride to one driver at a time with a timeout; set driver AVAILABLE→ON_TRIP with CAS so two rides can't book one driver.",
    "**Ride states**: REQUESTED → DRIVER_ASSIGNED → STARTED → COMPLETED / CANCELLED. **Fare** (Strategy): base + per km + per minute × surge.",
    "**Extensions**: ride sharing/pool, scheduled rides, ratings, driver earnings."],
    { m: cd(["class Driver { -String id; -Location loc; -AtomicReference~DriverStatus~ status; -VehicleType type }", "class Ride { -Rider rider; -Driver driver; -Location pickup; -Location drop; -RideState state; -Money fare }", "class MatchingStrategy { <<interface>>; +match(RideRequest r, DriverIndex idx) Optional~Driver~ }", "class FareStrategy { <<interface>>; +fare(Ride r) Money }", "class RideService { +request(RideRequest r) Ride; +start(String rideId); +complete(String rideId) }", "RideService --> MatchingStrategy", "RideService --> FareStrategy", "RideService --> DriverIndex", "Ride --> Driver", "Ride --> Rider"]) });
  Q("Machine coding", "Medium", true, "", "Design a notification service (email, SMS, push) with templates, preferences and retries.", [
    "**Entities**: `Notification` (user, template id, params, priority), `Template`, `UserPreferences` (channels, quiet hours), `Channel` senders.",
    "**Patterns**: Strategy/Factory per channel (`ChannelSender` registry), Template rendering, Decorator for retry/rate-limit around senders, Observer/event entry point.",
    "**Delivery**: queue per priority, worker pool, exponential backoff with jitter, dead-letter after N attempts; idempotency key to avoid duplicates.",
    "**Extensions**: digests/batching, user opt-out, delivery tracking callbacks."],
    { m: cd(["class NotificationService { +send(Notification n) }", "class ChannelSender { <<interface>>; +send(Message m) DeliveryResult }", "ChannelSender <|.. EmailSender", "ChannelSender <|.. SmsSender", "ChannelSender <|.. PushSender", "ChannelSender <|.. RetryingSender", "RetryingSender o-- ChannelSender : inner", "class TemplateEngine { +render(String templateId, Map~String,String~ p) Message }", "NotificationService --> TemplateEngine", "NotificationService --> PreferenceStore", "NotificationService --> ChannelSender"]) });
  Q("Machine coding", "Medium", false, "", "Design a meeting-room scheduler.", [
    "**Entities**: `Room` (capacity, features), `Meeting` (organiser, attendees, interval), `Interval`, `Scheduler`.",
    "**Availability**: per room `TreeMap<start, Meeting>`; a new interval fits if the floor entry ends before it starts and the ceiling entry starts after it ends: O(log n).",
    "**Room choice** (Strategy): smallest room that fits capacity and features.",
    "**Concurrency**: lock per room while checking+inserting (check-then-act).",
    "**Extensions**: recurring meetings, invites/RSVP (Observer), cancellations, calendar sync."],
    { code: "class RoomCalendar {\n    private final TreeMap<Long, Long> booked = new TreeMap<>();   // start -> end (half-open)\n    synchronized boolean book(long start, long end) {\n        Map.Entry<Long, Long> before = booked.floorEntry(start);\n        if (before != null && before.getValue() > start) return false;\n        Long after = booked.ceilingKey(start);\n        if (after != null && after < end) return false;\n        booked.put(start, end); return true;\n    }\n}" });
  Q("Machine coding", "Hard", false, "", "Design a task scheduler that runs jobs at a time, after a delay, or repeatedly.", [
    "**Entities**: `Job` (id, `Runnable`, next run time, `Schedule`), `Schedule` (Strategy: once, fixed rate, fixed delay, cron), `Scheduler`.",
    "**Core**: a `PriorityQueue` ordered by next run time + a dispatcher thread that waits until the head is due (`Condition.awaitNanos`) and hands work to a worker pool.",
    "Re-schedule recurring jobs after (fixed delay) or relative to (fixed rate) each run; new earlier jobs must wake the dispatcher.",
    "**Extensions**: cancellation, retries, persistence across restarts, missed-run policy.",
    "JDK reference: `ScheduledThreadPoolExecutor` / `DelayQueue`."]);
  Q("Machine coding", "Medium", false, "", "Design an in-memory key-value store with TTL and transactions (BEGIN/COMMIT/ROLLBACK).", [
    "**Core**: `Map<String, Entry(value, expiresAt)>`; lazy expiry on read + periodic sweeper for memory.",
    "**Transactions**: a stack of change logs (or overlay maps); writes go to the top layer; `ROLLBACK` drops it, `COMMIT` merges into the layer below; reads check layers top-down.",
    "**Patterns**: Command for each operation (parse → execute), Memento-like snapshots for nested transactions.",
    "**Concurrency**: `ConcurrentHashMap` for the store; transactions per client session.",
    "**Extensions**: counting values (`NUMEQUALTO`), persistence via append-only log, eviction policies."]);

  window.LLD_IQ = QS;
})();
