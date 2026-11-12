/* Lesson J03: OOP in Java: the Java-specific parts */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Dispatch explorer: which method / field is used for a given declared type, runtime type and argument type
  var DECL = ["Animal", "Dog"], RT = ["Animal", "Dog"], ARG = ["Object", "String"];
  var CLASSES = [
    "class Animal {",
    "    String name = \"animal\";",
    "    static String kind() { return \"Animal.kind\"; }",
    "    String speak() { return \"...\"; }",
    "    String greet(Object o) { return \"Animal.greet(Object)\"; }",
    "    private String secret() { return \"Animal.secret\"; }",
    "    String callSecret() { return secret(); }",
    "}",
    "class Dog extends Animal {",
    "    String name = \"dog\";                      // hides Animal.name",
    "    static String kind() { return \"Dog.kind\"; }   // hides, doesn't override",
    "    @Override String speak() { return \"Woof\"; }",
    "    String greet(String s) { return \"Dog.greet(String)\"; }  // overload, NOT override",
    "    private String secret() { return \"Dog.secret\"; }",
    "}"];
  function dispatchWidget(el, ctx) {
    var s = ctx.state; if (s.d === undefined) { s.d = 0; s.r = 1; s.a = 1; }
    el.innerHTML = "<pre class='code' data-r='cls' style='font-size:12px'></pre>" +
      "<div class='field'>Declared (static) type of the variable</div><div class='seg' data-r='d'></div>" +
      "<div class='field'>Runtime class of the object</div><div class='seg' data-r='r'></div>" +
      "<div class='field'>Static type of the argument passed to greet</div><div class='seg' data-r='a'></div>" +
      "<pre class='code' data-r='stmt' style='margin-top:12px'></pre><div data-r='out'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("cls").innerHTML = ctx.H.highlight(CLASSES.join("\n"));
    function seg(r, opts) { q(r).innerHTML = opts.map(function (o, i) { return "<button type='button' data-i='" + i + "' class='" + (s[r] === i ? "on" : "") + "'>" + o + "</button>"; }).join(""); }
    function draw() {
      seg("d", DECL); seg("r", RT); seg("a", ARG);
      var d = DECL[s.d], r = RT[s.r], a = ARG[s.a];
      if (d === "Dog" && r === "Animal") {
        q("stmt").innerHTML = ctx.H.highlight("Dog ref = new Animal();");
        q("out").innerHTML = "<div class='result err'><div class='out'>Compile error</div><p>" + ctx.md("`incompatible types: Animal cannot be converted to Dog`. A `Dog` variable can only refer to a `Dog` (or subclass). Even with a cast, `(Dog) new Animal()` compiles but throws `ClassCastException` at run time.") + "</p></div>";
        return;
      }
      q("stmt").innerHTML = ctx.H.highlight(d + " ref = new " + r + "();\n" + a + " arg = \"hi\";\nref.speak();  ref.greet(arg);  ref.kind();  ref.name;  ref.callSecret();");
      var rows = [];
      rows.push(["ref.speak()", r === "Dog" ? "\"Woof\"" : "\"...\"", "Instance method, **overridden**: chosen at **run time** from the object's class (" + r + "). Dynamic dispatch."]);
      var g;
      if (d === "Animal") g = ["\"Animal.greet(Object)\"", "Overloads are chosen at **compile time** from the declared type. `Animal` only knows `greet(Object)`, so that's the signature compiled in. `Dog.greet(String)` is a different method (not an override), so it never runs here even when the object is a Dog."];
      else if (a === "String") g = ["\"Dog.greet(String)\"", "Declared type `Dog` sees both `greet(Object)` and `greet(String)`; the **most specific** applicable overload for a `String` argument is `greet(String)`."];
      else g = ["\"Animal.greet(Object)\"", "The argument's **static** type is `Object`, so only `greet(Object)` applies, even though the object is really a String. Overload resolution never looks at runtime types."];
      rows.push(["ref.greet(arg)", g[0], g[1]]);
      rows.push(["ref.kind()", "\"" + d + ".kind\"", "**Static** methods aren't overridden, only **hidden**: the call is bound to the declared type " + d + ". (Calling statics through an instance is legal but misleading; write `" + d + ".kind()`.)"]);
      rows.push(["ref.name", "\"" + (d === "Dog" ? "dog" : "animal") + "\"", "**Fields** are never polymorphic: the declared type decides. Dog's `name` **hides** Animal's; a Dog object actually contains both fields."]);
      rows.push(["ref.callSecret()", "\"Animal.secret\"", "`private` methods aren't inherited or overridden. `callSecret` is in Animal, so `secret()` there is bound to `Animal.secret` even for a Dog."]);
      q("out").innerHTML = "<div class='tablewrap'><table><thead><tr><th>Expression</th><th>Result</th><th>Why</th></tr></thead><tbody>" + rows.map(function (x) { return "<tr><td><code>" + ctx.esc(x[0]) + "</code></td><td><code>" + ctx.esc(x[1]) + "</code></td><td>" + ctx.md(x[2]) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
        "<div class='result ok'><p>" + ctx.md("Rule of thumb: **which method signature** is decided at compile time from declared types; **which implementation** of an overridden instance method is decided at run time from the object. Fields, statics and privates have no run-time dispatch.") + "</p></div>";
    }
    ["d", "r", "a"].forEach(function (r) { q(r).addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b) return; s[r] = Number(b.getAttribute("data-i")); ctx.save(); draw(); }); });
    draw();
  }

  var SLIDES = [
    { title: "OOP concepts vs Java mechanics",
      text: "The LLD app teaches the **ideas**: encapsulation, abstraction, inheritance, polymorphism, SOLID (LLD F01, F02). This lesson is the **Java rulebook** behind them: which keyword does what, how the compiler and JVM pick a method, how objects are constructed, and the nested-class and interface features interviewers love to probe. If you can explain *why* a snippet prints what it prints, you've got it.",
      table: [
        ["OOP idea", "Java mechanism", "Slide"],
        ["Encapsulation", "`private` fields, package-private, accessors, immutability with `final`", "2, 4"],
        ["Abstraction", "`interface`, `abstract class`, default methods", "8"],
        ["Inheritance", "`extends` (one class), `implements` (many interfaces), `super`", "5, 7"],
        ["Polymorphism", "Overriding + dynamic dispatch; overloading is compile-time", "6, 7"],
        ["Composition", "Fields referencing collaborators; nested classes", "9, 11"]],
      analogy: "LLD is the architecture plan of a building; this lesson is the building code: the exact rules for doors (access), load-bearing walls (final), and which floor a lift stops at (dispatch)." },
    { title: "Access modifiers, including package-private",
      text: "Java has **four** access levels. Leaving the modifier out is **package-private** (\"default\"): visible to every class in the same package and nobody else, which is a great way to hide implementation classes. `protected` adds subclasses in other packages. Top-level classes can only be `public` or package-private.",
      table: [
        ["Modifier", "Same class", "Same package", "Subclass (other package)", "Everyone"],
        ["`private`", "✓", "✗", "✗", "✗"],
        ["(none) package-private", "✓", "✓", "✗", "✗"],
        ["`protected`", "✓", "✓", "✓ (through inheritance)", "✗"],
        ["`public`", "✓", "✓", "✓", "✓"]],
      code: `class Wallet {
    private long balancePaise;                 // only Wallet touches it
    final String owner;                        // package-private, immutable
    Wallet(String owner) { this.owner = owner; }
    public void credit(long paise) {           // the public API enforces the rules
        if (paise <= 0) throw new IllegalArgumentException("amount must be positive");
        balancePaise += paise;
    }
    public long balance() { return balancePaise; }
    protected void audit(String event) { System.out.println("[" + owner + "] " + event); }
}

Wallet w = new Wallet("Deepak");
w.credit(50_000);
w.audit("credited ₹500");                       // same package, so protected is visible here
System.out.println(w.balance() + " paise");
// w.balancePaise = 1_000_000;                 // compile error: private`,
      points: ["Start every member as `private`; widen only with a reason", "Private members are visible to the **whole top-level class**, including nested classes", "Java modules (`exports`) add a layer above packages: a public class in a non-exported package is hidden from other modules"] },
    { title: "static vs instance",
      text: "An **instance** member belongs to each object; a **static** member belongs to the class: one copy shared by all instances, available without creating an object. Static methods have no `this`, so they can't touch instance fields directly. Static state is effectively global: handy for constants and factories, risky for mutable data (shared across threads and tests).",
      code: `class Booking {
    private static int created = 0;                 // one counter for the class
    static final String PREFIX = "PNR";             // constant
    private final String pnr;                       // one per object

    Booking() { created++; pnr = PREFIX + created; }
    static int createdCount() { return created; }   // no 'this' here
    static Booking of() { return new Booking(); }   // static factory method
    String pnr() { return pnr; }
}

Booking a = new Booking(), b = Booking.of();
System.out.println(a.pnr() + " " + b.pnr() + " total=" + Booking.createdCount());
// static String bad() { return pnr; }   // would not compile: non-static field from static context`,
      table: [
        ["", "Instance", "Static"],
        ["Belongs to", "Each object", "The class (one copy per class loader)"],
        ["Access to `this`", "Yes", "No"],
        ["Polymorphic?", "Yes (methods can be overridden)", "No: static methods are hidden, not overridden"],
        ["Typical use", "State and behaviour of an entity", "Constants, factories, pure utilities (`Math.max`)"]],
      points: ["`static` nested class ≠ static object: it just doesn't hold a reference to an outer instance (slide 9)", "Mutable static state + multiple threads = race conditions; + tests = order-dependent failures"] },
    { title: "final: variables, fields, methods, classes",
      text: "`final` means \"can't be changed after it's set\", but what is fixed depends on where it's used. A `final` **reference** can't be re-pointed; the **object** it points to can still change unless the class itself is immutable.",
      table: [
        ["On", "Meaning", "Example"],
        ["Local variable / parameter", "Assigned once", "`final int max = 3;`"],
        ["Field", "Assigned once, by the end of the constructor; safe publication to other threads", "`private final String pnr;`"],
        ["Method", "Can't be overridden", "Template-method steps you must protect"],
        ["Class", "Can't be subclassed", "`String`, `Integer`, records"]],
      code: `final class Money {                                  // can't be subclassed
    private final long paise;                         // set once
    private final String currency;
    Money(long paise, String currency) { this.paise = paise; this.currency = currency; }
    Money plus(Money o) {
        if (!currency.equals(o.currency)) throw new IllegalArgumentException("currency mismatch");
        return new Money(paise + o.paise, currency);    // returns a NEW object
    }
    @Override public String toString() { return currency + " " + paise / 100 + "." + String.format("%02d", paise % 100); }
}

final Money fare = new Money(485_000, "INR");
Money total = fare.plus(new Money(87_300, "INR"));
System.out.println(fare + " + GST = " + total);
final List<String> seats = new ArrayList<>();
seats.add("12A");                                     // allowed: final reference, mutable list
System.out.println(seats);`,
      points: ["Immutable class recipe: `final` class, `private final` fields, no setters, defensive copies of mutable inputs/outputs, methods return new objects", "`final` fields get special guarantees in the Java Memory Model: other threads see their constructed values (J17)", "Records (J13) are a concise way to get a final class with final fields"] },
    { title: "Constructors, this() / super() and initialisation order",
      text: "A constructor's first statement is (explicitly or implicitly) a call to **another constructor**: `this(...)` in the same class or `super(...)` in the parent. If you write neither, the compiler inserts `super()`, which fails to compile if the parent has no no-arg constructor. If you write no constructor at all, you get a default no-arg one. Then field initialisers and instance blocks run, then the rest of the constructor body.",
      m: M(["flowchart TB",
        "  A[\"new Child(args)\"]:::s0 --> B[\"Class init (once): Parent statics, then Child statics\"]:::s1",
        "  B --> C[\"Child(...) calls this(...) or super(...)\"]",
        "  C --> D[\"Parent: field initialisers + instance blocks, top to bottom\"]:::s2",
        "  D --> E[\"Parent constructor body\"]:::s2",
        "  E --> F[\"Child: field initialisers + instance blocks\"]:::s1",
        "  F --> G[\"Child constructor body\"]:::s1"]),
      code: `class Vehicle {
    protected final String id;
    private String status = log("Vehicle field initialiser");
    Vehicle(String id) { this.id = id; log("Vehicle(" + id + ")"); describe(); }
    void describe() { log("Vehicle.describe"); }
    static String log(String s) { System.out.println(s); return s; }
}
class Cab extends Vehicle {
    private String driver = log("Cab field initialiser");
    Cab(String id, String driver) { super(id); this.driver = driver; log("Cab(" + id + ", " + driver + ")"); }
    Cab(String id) { this(id, "unassigned"); }           // chains to the other constructor
    @Override void describe() { log("Cab.describe sees driver=" + driver); }
}

new Cab("KA01");`,
      points: ["Notice `Cab.describe sees driver=null`: the parent constructor called an overridden method **before** the child's fields were initialised. Never call overridable methods from constructors", "Java 25 finalised **flexible constructor bodies** (JEP 513): statements (e.g. validation) may appear before `super(...)`, as long as they don't use `this`. On 17/21, `super()` must come first", "Constructors aren't inherited; a private constructor + static factory controls creation"] },
    { title: "Overloading: resolved at compile time",
      text: "**Overloading** = same name, different parameter lists in one class (or inherited). The **compiler** picks the method from the **static types** of the arguments, in three phases: (1) exact match or primitive widening, (2) then boxing/unboxing, (3) then varargs. Within a phase the **most specific** method wins; if none is more specific, the call is **ambiguous** (compile error). Return type alone can't distinguish overloads.",
      code: `static String pay(int amount)        { return "int"; }
static String pay(long amount)       { return "long"; }
static String pay(Integer amount)    { return "Integer"; }
static String pay(Object amount)     { return "Object"; }
static String pay(int... amounts)    { return "varargs"; }
static String find(String s)         { return "String"; }
static String find(Object o)         { return "Object"; }

byte b = 5; short sh = 7; long l = 9L; Integer boxed = 11;
System.out.println(pay(5) + " " + pay(b) + " " + pay(sh) + " " + pay(l));   // int int int long  (widening beats boxing)
System.out.println(pay(boxed) + " " + pay(5.0) + " " + pay() + " " + pay(1, 2));   // Integer Object varargs varargs
Object o = "hello";
System.out.println(find("hello") + " " + find(o) + " " + find(null));        // String Object String (most specific)`,
      table: [
        ["Call", "Chosen", "Why"],
        ["`pay(b)` with a `byte`", "`pay(int)`", "Phase 1: widening byte→int is preferred over boxing"],
        ["`pay(5.0)`", "`pay(Object)`", "No double/Double overload: box to `Double`, then widen to `Object`"],
        ["`find(o)` where `o` holds a String", "`find(Object)`", "Static type of `o` is `Object`; runtime type is irrelevant"],
        ["`find(null)`", "`find(String)`", "Both apply; `String` is more specific than `Object`"]],
      points: ["Overloading `m(Integer)` and `m(Long)` then calling `m(null)` is ambiguous", "`List.remove(int index)` vs `remove(Object o)`: `list.remove(1)` removes **index 1**, `list.remove(Integer.valueOf(1))` removes the value"] },
    { title: "Overriding rules and dynamic dispatch",
      text: "**Overriding** = a subclass provides its own implementation of an inherited **instance** method with the **same signature**. The JVM picks the implementation at **run time** from the object's actual class (virtual dispatch via a method table). The override must not weaken the contract.",
      table: [
        ["Rule", "Allowed in the override?"],
        ["Same name + parameter types", "Required (otherwise it's an overload)"],
        ["Return type", "Same or a **subtype** (covariant return)"],
        ["Visibility", "Same or **wider** (`protected` → `public` OK; `public` → `protected` ✗)"],
        ["Checked exceptions", "Same, narrower or none; never new/broader checked ones"],
        ["`static` method", "Can't override, only hide"],
        ["`private` / `final` method", "Can't override"],
        ["`@Override`", "Optional but always use it: the compiler checks you really override"]],
      m: M(["flowchart LR",
        "  V[\"Animal a = new Dog()\"]:::s0 --> C[\"Compile time: does Animal have speak()? pick signature speak()\"]:::s1",
        "  C --> R[\"Run time: object is Dog → look up speak() in Dog's method table\"]:::s2",
        "  R --> O[\"Dog.speak() runs\"]"]),
      code: `class Report {
    protected Object build() throws java.io.IOException { return "generic"; }
    static String type() { return "Report"; }
}
class SalesReport extends Report {
    @Override public String build() { return "sales"; }      // wider access, covariant return, no checked exception
    static String type() { return "SalesReport"; }             // hides Report.type()
}

Report r = new SalesReport();
System.out.println(r.build());                // sales: dynamic dispatch
System.out.println(Report.type() + " " + SalesReport.type());
SalesReport s = new SalesReport();
String typed = s.build();                     // covariant return: no cast needed
System.out.println(typed.toUpperCase());`,
      points: ["Use the widget below to try declared vs runtime types, overloads, statics, fields and private methods side by side"] },
    { title: "Abstract classes vs interfaces (default, static, private methods)",
      text: "An **interface** defines a capability; since Java 8 it can carry `default` methods (inherited behaviour) and `static` helpers, and since Java 9 `private` methods to share code between defaults. It still has **no instance state** (only constants). An **abstract class** can hold state, constructors and protected helpers, but a class can extend only one. If a class inherits the same default method from two interfaces it must **override it** and may pick one with `X.super.m()`.",
      table: [
        ["", "Interface", "Abstract class"],
        ["State", "Constants only (`public static final`)", "Any fields"],
        ["Constructors", "No", "Yes"],
        ["Multiple inheritance", "A class implements many", "A class extends one"],
        ["Methods", "abstract, `default`, `static`, `private`", "Any"],
        ["Use for", "Capabilities/roles (`Comparable`, `PaymentGateway`)", "Shared base implementation with state (template method)"]],
      code: `interface Notifier {
    void send(String to, String msg);
    default void sendAll(List<String> to, String msg) { to.forEach(t -> send(t, prefix() + msg)); }
    private String prefix() { return "[StudyApp] "; }                 // Java 9+
    static Notifier console() { return (to, msg) -> System.out.println(to + " ← " + msg); }
}
interface Logger { default String name() { return "logger"; } }
interface Auditor { default String name() { return "auditor"; } }
class AuditLog implements Logger, Auditor {
    @Override public String name() { return Logger.super.name() + "+" + Auditor.super.name(); }   // must resolve the diamond
}

Notifier.console().sendAll(List.of("deepak@", "rishabh@"), "J03 published");
System.out.println(new AuditLog().name());`,
      points: ["Resolution rules: **class wins** (a method from a superclass beats an interface default), then the **more specific interface** wins, otherwise you must override", "Default methods let library authors evolve interfaces (`List.sort`, `Collection.removeIf`) without breaking implementers", "Sealed interfaces (J13) restrict who may implement them"] },
    { title: "Nested classes: static nested, inner, local, anonymous",
      text: "Java lets you declare classes inside classes. The key difference is whether the nested class holds a hidden reference to an **instance of the outer class**. Inner (non-static) classes do, which gives them access to outer fields but can **leak memory** when the inner object outlives the outer one. Default to `static` nested classes.",
      table: [
        ["Kind", "Declared", "Outer instance reference?", "Typical use"],
        ["Static nested", "`static class Node` inside a class", "No", "Builders, map entries (`Map.Entry` impls), helper types"],
        ["Inner", "`class Itr` inside a class", "Yes (`Outer.this`)", "Iterators over the outer object's data"],
        ["Local", "Inside a method", "Yes if in an instance method", "Rare; one-off helper"],
        ["Anonymous", "`new Interface() { ... }`", "Yes if in an instance method", "Pre-Java 8 callbacks; now mostly lambdas"]],
      code: `class Itinerary {
    private final List<String> legs = new ArrayList<>();
    private final String owner;
    Itinerary(String owner) { this.owner = owner; }

    static class Builder {                                   // static nested: no Itinerary needed
        private final Itinerary it;
        Builder(String owner) { it = new Itinerary(owner); }
        Builder leg(String l) { it.legs.add(l); return this; }   // can touch private members of the outer class
        Itinerary build() { return it; }
    }
    class LegIterator implements Iterator<String> {          // inner: uses the outer instance's legs
        private int i = 0;
        public boolean hasNext() { return i < legs.size(); }
        public String next() { return owner + ": " + legs.get(i++); }
    }
    Iterator<String> iterator() { return new LegIterator(); }
}

Itinerary trip = new Itinerary.Builder("Deepak").leg("DEL-BLR").leg("BLR-GOI").build();
for (Iterator<String> it = trip.iterator(); it.hasNext(); ) System.out.println(it.next());
Runnable anon = new Runnable() { public void run() { System.out.println("anonymous class: " + getClass().getName()); } };
anon.run();`,
      points: ["Creating an inner object from outside: `outer.new Inner()`", "Lambdas don't create a new scope for `this`; anonymous classes do (J10)", "Inner classes and anonymous listeners capturing an Activity/Controller are a classic leak"] },
    { title: "Casting, instanceof and the Object class",
      text: "Every class ultimately extends `java.lang.Object`, which provides `equals`, `hashCode`, `toString`, `getClass`, `wait`/`notify` and (protected) `clone`/`finalize`. **Upcasting** (Dog → Animal) is implicit and always safe. **Downcasting** needs an explicit cast and is checked at run time: a wrong cast throws `ClassCastException`. Since Java 16, **pattern matching for `instanceof`** combines the test and the cast.",
      code: `sealed interface Payment permits Card, Upi, Wallet2 {}
record Card(String last4) implements Payment {}
record Upi(String vpa) implements Payment {}
record Wallet2(long balance) implements Payment {}

static String describe(Payment p) {
    if (p instanceof Card c) return "card ending " + c.last4();        // test + cast + bind
    if (p instanceof Upi u && u.vpa().endsWith("@okaxis")) return "Axis UPI " + u.vpa();
    return p.getClass().getSimpleName();
}

Object o = new Card("4242");                       // upcast: implicit
Payment p = (Payment) o;                           // downcast: checked at run time
System.out.println(describe(p) + " | " + describe(new Upi("deepak@okaxis")) + " | " + describe(new Wallet2(100)));
try { Upi wrong = (Upi) o; }
catch (ClassCastException e) { System.out.println("ClassCastException: " + e.getMessage().split(" \\\\(")[0]); }`,
      points: ["Lots of `instanceof` chains in business code often mean a missing polymorphic method; for closed hierarchies, sealed types + switch patterns (J14) are the modern answer", "`clone()` and `Cloneable` are widely considered broken: prefer copy constructors or static factories", "`finalize()` is deprecated for removal; use try-with-resources or `Cleaner`"] },
    { title: "Composition over inheritance: the fragile base class",
      text: "Inheritance couples a subclass to its parent's **implementation details**, not just its API. The classic demonstration (from *Effective Java*): count elements added to a `HashSet` by overriding `add` and `addAll`. Because `HashSet.addAll` internally calls `add`, the subclass double-counts. Wrapping (composition + forwarding) avoids the problem: the wrapper depends only on the public interface.",
      code: `class CountingSet<E> extends HashSet<E> {                // inheritance: fragile
    int added = 0;
    @Override public boolean add(E e) { added++; return super.add(e); }
    @Override public boolean addAll(Collection<? extends E> c) { added += c.size(); return super.addAll(c); }
}
class CountingSet2<E> {                                     // composition: robust
    private final Set<E> inner = new HashSet<>();
    int added = 0;
    boolean add(E e) { added++; return inner.add(e); }
    boolean addAll(Collection<? extends E> c) { added += c.size(); return inner.addAll(c); }
    int size() { return inner.size(); }
}

CountingSet<String> s1 = new CountingSet<>();
s1.addAll(List.of("DEL", "BOM", "BLR"));
CountingSet2<String> s2 = new CountingSet2<>();
s2.addAll(List.of("DEL", "BOM", "BLR"));
System.out.println("inheritance counted " + s1.added + ", composition counted " + s2.added);`,
      points: ["Inherit only for a genuine **is-a** relationship where the parent is designed for extension (documented self-use), otherwise compose", "Design classes for inheritance or prohibit it (`final`)", "More in LLD F01 (composition) and F17+ (Decorator, Strategy)"] }
  ];

  H.registerLesson({
    code: "J03",
    summary: "The Java rules behind OOP: the four access levels (including package-private), static vs instance members, every meaning of `final` and how to build an immutable class, constructor chaining with `this()`/`super()` and initialisation order (and why calling overridable methods from constructors bites), compile-time overload resolution (widening → boxing → varargs), overriding rules and dynamic dispatch (covariant returns, visibility, exceptions, hidden statics and fields), interfaces with default/static/private methods vs abstract classes and the diamond rule, the four kinds of nested classes, casting with pattern-matching `instanceof`, and composition over inheritance.",
    slides: SLIDES,
    widget: { heading: "Interactive: which method actually runs?", caption: "Choose the variable's declared type, the object's runtime class and the argument's static type. The table shows what overridden methods, overloads, static methods, fields and private methods resolve to, and why.", render: dispatchWidget },
    examplesHeading: "Where these rules show up at work",
    examples: [
      ["Spring proxies and `final`", "Spring AOP / `@Transactional` creates subclass (CGLIB) proxies: `final` classes or methods, and `private` methods, can't be intercepted, so the annotation silently does nothing (S07)."],
      ["Package-private implementation classes", "Libraries expose an interface + a public factory and keep implementations package-private, so they can change freely."],
      ["Builders as static nested classes", "Lombok `@Builder`, Protobuf and most SDKs generate `Outer.Builder` static nested classes."],
      ["Overload surprises in APIs", "`list.remove(1)` on a `List<Integer>` removes index 1, not the value 1; `assertEquals(long, long)` vs `(Object, Object)` overloads in JUnit."],
      ["Default methods evolving interfaces", "`Collection.removeIf`, `Map.computeIfAbsent`, `Iterable.forEach` were added as defaults so millions of existing implementations kept compiling."],
      ["Inner-class leaks", "Anonymous listeners or inner `Runnable`s capturing a large outer object keep it alive in a long-lived executor or event bus."]
    ],
    pitfalls: [
      "Thinking overloads are chosen by the runtime type of the argument",
      "Expecting static methods or fields to be polymorphic",
      "Calling overridable methods from a constructor (subclass fields still null/0)",
      "Forgetting `@Override` and accidentally overloading (`equals(Point p)` instead of `equals(Object o)`)",
      "Assuming `final` makes the referenced object immutable",
      "Mutable `public static` fields (global state, thread-unsafe)",
      "Non-static inner classes where a static nested class would do (hidden outer reference, leaks, serialization issues)",
      "Extending concrete library classes (`HashSet`, `ArrayList`) instead of composing"
    ],
    quiz: [
      { q: "A field with no access modifier is visible to…", options: ["Only its class", "Classes in the same package", "Subclasses anywhere", "Everyone"], answer: 1, why: "Package-private (default) access." },
      { q: "When is the overload in `obj.m(arg)` chosen?", options: ["At run time, from the argument's object", "At compile time, from the static types", "By the JIT", "Randomly when ambiguous"], answer: 1, why: "Overload resolution is static; only the implementation of an overridden method is chosen at run time." },
      { q: "What does this print?", code: `class A { String f = "A"; String m() { return "A"; } static String s() { return "A"; } }
class B extends A { String f = "B"; String m() { return "B"; } static String s() { return "B"; } }
A x = new B();
System.out.println(x.f + x.m() + x.s());`, options: ["BBB", "ABA", "AAA", "ABB"], answer: 1, why: "Field and static use the declared type A; the instance method dispatches to B." },
      { q: "Which override is legal for `protected Number calc() throws IOException` in the parent?", options: ["`private Number calc()`", "`public Integer calc()`", "`protected Number calc() throws Exception`", "`protected int calc()`"], answer: 1, why: "Wider access and covariant return; no broader checked exceptions." },
      { q: "A class implements two interfaces with the same `default String name()`. What happens?", options: ["The first interface wins", "Compile error unless the class overrides `name()`", "Run-time exception", "The JVM picks randomly"], answer: 1, why: "It must override; it may call `A.super.name()`." },
      { q: "Main difference between a static nested class and an inner class?", options: ["Static nested can't have methods", "An inner class instance holds a reference to an outer instance", "Inner classes can't access private members", "There is none"], answer: 1, why: "Hence the potential leak and the `outer.new Inner()` syntax." },
      { q: "What prints?", code: `static String f(Object o) { return "Object"; }
static String f(String s) { return "String"; }
Object o = "hi";
System.out.println(f(o) + " " + f("hi") + " " + f(null));`, options: ["String String String", "Object String String", "Object String Object", "Compile error"], answer: 1, why: "Static types decide; for null the most specific applicable overload (String) wins." },
      { q: "If a class declares only `Engine(int hp)`, what does `class Turbo extends Engine { Turbo() {} }` do?", options: ["Compiles; hp = 0", "Compile error: implicit super() has no matching constructor", "Run-time error", "Calls Engine(int) with 0"], answer: 1, why: "The compiler inserts `super()`, and `Engine` has no no-arg constructor." },
      { q: "Why might `CountingSet extends HashSet` double-count with `addAll`?", options: ["HashSet is final", "HashSet.addAll calls add internally, which is also overridden", "Generics bug", "Thread safety"], answer: 1, why: "Self-use of overridable methods: the fragile base class problem." }
    ],
    cheatsheet: {
      table: [
        ["Topic", "Rule"],
        ["Access", "private < package-private < protected < public"],
        ["static", "Per class, no `this`, hidden not overridden"],
        ["final", "Variable: assign once; method: no override; class: no subclass"],
        ["Constructor", "First line `this(...)`/`super(...)` (implicit `super()`); parent first"],
        ["Overload", "Compile time; widening → boxing → varargs; most specific wins"],
        ["Override", "Run time; same signature, covariant return, ≥ visibility, ≤ checked exceptions"],
        ["Not polymorphic", "Fields, static methods, private methods, constructors"],
        ["Interfaces", "abstract + default + static + private methods; no state; diamond → override"],
        ["Nested", "Prefer static nested; inner holds `Outer.this`"]],
      cards: [
        { title: "Immutable class", items: ["`final` class", "`private final` fields", "No setters", "Defensive copies", "Return new objects"] },
        { title: "Interview one-liners", items: ["Overloading = compile-time polymorphism", "Overriding = run-time polymorphism", "Abstract class for shared state, interface for capability", "Composition over inheritance"] },
        { title: "Spring gotchas", items: ["No proxy on `final`/`private`", "Self-invocation bypasses proxy", "Prefer constructor injection with `final` fields"] }]
    },
    practice: [
      { level: "Easy", q: "Explain all four access modifiers and give a real use for package-private.",
        a: ["`private`: only inside the top-level class (including its nested classes).",
          "Package-private (no keyword): any class in the same package.",
          "`protected`: same package plus subclasses in other packages (through inheritance).",
          "`public`: everywhere (subject to module exports).",
          "Use for package-private: a `PaymentService` interface and public factory in `com.acme.payment`, with `RazorpayGateway` and `StripeGateway` implementations package-private so callers can't depend on them; tests in the same package can still reach them."] },
      { level: "Easy", q: "What's the difference between overloading and overriding? Give one example of each.",
        a: ["**Overloading**: same method name, different parameter lists; chosen by the compiler from static argument types. Example: `println(int)`, `println(String)`, `println(Object)`.",
          "**Overriding**: a subclass re-implements an inherited instance method with the same signature; chosen at run time from the object's class. Example: `toString()` in your class overriding `Object.toString()`.",
          "Overloading is sometimes called compile-time (static) polymorphism; overriding is run-time (dynamic) polymorphism.",
          "Return type alone doesn't create an overload; an override may narrow the return type (covariant)."] },
      { level: "Easy", q: "Can you override a static method? A private method? A final method?",
        a: ["**Static**: no. Declaring the same static method in a subclass **hides** it; the call is bound to the declared type at compile time.",
          "**Private**: no. It isn't inherited; a same-named method in the subclass is a new, unrelated method.",
          "**Final**: no. Compile error.",
          "`@Override` on any of these fails to compile, which is exactly why you should always use it."] },
      { level: "Medium", q: "Predict the output and explain each line.",
        qcode: `class Base {
    Base() { System.out.println("Base sees " + value()); }
    int value() { return 1; }
}
class Derived extends Base {
    private int v = 42;
    Derived() { System.out.println("Derived sees " + value()); }
    @Override int value() { return v; }
}

new Derived();`,
        a: ["Output: `Base sees 0` then `Derived sees 42`.",
          "`new Derived()` first runs `Base()` (implicit `super()`). `value()` is overridden, so dynamic dispatch calls `Derived.value()` even inside the Base constructor.",
          "At that moment `Derived`'s field initialiser (`v = 42`) hasn't run yet, so `v` is 0.",
          "Then Derived's initialisers run (`v = 42`) and its constructor body prints 42.",
          "Lesson: never call overridable methods from constructors; make them `private` or `final`, or use a static factory that calls them after construction."] },
      { level: "Medium", q: "Write an immutable `Itinerary` class holding a passenger name and a list of flight codes. Show why each line matters.",
        code: `final class Itinerary {
    private final String passenger;
    private final List<String> flights;

    Itinerary(String passenger, List<String> flights) {
        this.passenger = Objects.requireNonNull(passenger, "passenger");
        this.flights = List.copyOf(flights);          // defensive, unmodifiable copy
    }
    String passenger() { return passenger; }
    List<String> flights() { return flights; }         // already unmodifiable: safe to return
    Itinerary withFlight(String code) {                // "modification" returns a new object
        List<String> next = new ArrayList<>(flights);
        next.add(code);
        return new Itinerary(passenger, next);
    }
    @Override public String toString() { return passenger + " " + flights; }
}

List<String> input = new ArrayList<>(List.of("AI-101"));
Itinerary a = new Itinerary("Deepak", input);
input.add("HACK-1");                                   // caller mutates its own list
Itinerary b = a.withFlight("6E-202");
System.out.println(a + " | " + b);
try { a.flights().add("X"); } catch (UnsupportedOperationException e) { System.out.println("can't mutate flights()"); }`,
        a: ["`final` class: no subclass can add mutable state or override accessors.",
          "`private final` fields, assigned once in the constructor; null-checked.",
          "`List.copyOf` makes a defensive **unmodifiable** copy, so later changes to the caller's list don't leak in, and `flights()` can return it without another copy.",
          "No setters; `withFlight` returns a new instance (\"wither\").",
          "On Java 16+ a `record Itinerary(String passenger, List<String> flights)` with a compact constructor doing the copy is the shorter equivalent (J13)."] },
      { level: "Medium", q: "Abstract class or interface? Design the types for payment methods (card, UPI, wallet) that share validation logic and a retry counter.",
        a: ["Expose an **interface** `PaymentMethod { PaymentResult pay(Money amount); }` for callers: a capability, mockable, and implementable by unrelated classes.",
          "Put shared **state and steps** in an `abstract class AbstractPaymentMethod implements PaymentMethod` with a `final pay()` template method: validate → `doPay()` (abstract) → retry with a counter field. (Template Method, LLD F21.)",
          "Concrete `CardPayment`, `UpiPayment`, `WalletPayment` extend the abstract class and implement `doPay()`.",
          "If there's no shared state, skip the abstract class and use default methods or composition (a `RetryPolicy` collaborator) instead: easier to test and avoids a deep hierarchy.",
          "If the set of payment types is closed, make the interface `sealed` (J13/J14) so switches over it are exhaustive."] },
      { level: "Medium", q: "Show that overloads are resolved at compile time while overrides are resolved at run time, in one program.",
        code: `class Animal {
    String speak() { return "..."; }
    String greet(Object o) { return "Animal.greet(Object)"; }
}
class Dog extends Animal {
    @Override String speak() { return "Woof"; }
    String greet(String s) { return "Dog.greet(String)"; }   // overload, not override
}

Animal a = new Dog();
Dog d = new Dog();
Object arg = "hi";
System.out.println(a.speak() + " | " + a.greet("hi") + " | " + d.greet("hi") + " | " + d.greet(arg));`,
        a: ["`a.speak()` → `Woof`: overridden instance method, dispatched on the runtime class.",
          "`a.greet(\"hi\")` → `Animal.greet(Object)`: declared type `Animal` only has `greet(Object)`; `Dog.greet(String)` is an overload the compiler can't see through an `Animal` reference.",
          "`d.greet(\"hi\")` → `Dog.greet(String)`: through a `Dog` reference both overloads are visible and `String` is most specific.",
          "`d.greet(arg)` → `Animal.greet(Object)`: the argument's **static** type is `Object`."] },
      { level: "Medium", q: "Why can a non-static inner class cause a memory leak? How do you fix it?",
        a: ["Every inner-class instance holds a hidden `Outer.this` reference. If the inner object is stored somewhere long-lived (a static registry, an executor queue, an event bus, a cache), the whole outer object (and everything it references) stays reachable.",
          "Anonymous classes and lambdas in instance methods capture `this` the same way when they use instance members.",
          "Fixes: make the nested class `static` and pass only what it needs; unregister listeners in a lifecycle hook (`@PreDestroy`, `close()`); use weak references for registries of callbacks.",
          "Diagnose with a heap dump: the path to GC roots shows `this$0` (the synthetic outer reference)."] },
      { level: "Hard", q: "`@Transactional` on a method has no effect. The method is `private`, or it's called from another method in the same class. Explain using Java's OOP rules.",
        a: ["Spring implements `@Transactional` with a **proxy**: either a JDK dynamic proxy implementing your interfaces, or a CGLIB **subclass** that **overrides** your public methods to start/commit the transaction around `super.method()`.",
          "A `private` method can't be overridden (and `final` methods/classes can't be either), so the proxy can't intercept it: the annotation is ignored.",
          "**Self-invocation**: inside the bean, `this.save()` calls the method on the target object, not on the proxy, so no advice runs, even for public methods.",
          "Fixes: make the method public and call it through another bean; inject the proxy (`self`) lazily; or use programmatic `TransactionTemplate`. Detailed in S07.",
          "This is an interview favourite because it combines overriding, access modifiers and proxies."] },
      { level: "Hard", q: "Explain how the JVM implements virtual dispatch, and what the JIT does to make it cheap.",
        a: ["Each class has a **virtual method table** (vtable): an array of pointers to method implementations, with overridden methods occupying the same slot as in the parent. `invokevirtual` looks up the slot in the object's class: one indirection.",
          "Interface calls (`invokeinterface`) use itables, which are slightly more expensive to search.",
          "The JIT profiles call sites. A **monomorphic** site (only one receiver class seen) is inlined directly behind a cheap type guard; **bimorphic** sites get two inlined paths; **megamorphic** sites fall back to the table lookup.",
          "Class Hierarchy Analysis: if only one implementation is loaded, calls can be devirtualised; loading a new subclass later triggers **deoptimisation**.",
          "Takeaway: polymorphism is usually free in hot code; don't avoid interfaces for performance without a profiler."] }
    ],
    recap: [
      "Access: private → package-private → protected → public; start private, and use package-private to hide implementations.",
      "static = per class, no `this`, hidden not overridden; `final` fixes the variable, not the object; immutable classes need final fields, no setters and defensive copies.",
      "Construction runs parent first: `this()`/`super()`, then initialisers, then body. Don't call overridable methods from constructors.",
      "Overloads: compile time, static types, widening → boxing → varargs. Overrides: run time, same signature, covariant return, ≥ visibility, ≤ checked exceptions. Fields, statics and privates aren't polymorphic.",
      "Interfaces = capabilities with default/static/private methods; abstract classes = shared state. Prefer static nested classes and composition over inheritance."
    ]
  });
})();
