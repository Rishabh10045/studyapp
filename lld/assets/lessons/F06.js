/* Lesson F06: Factory Method (plus Simple Factory and static factory methods) */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  H.pattern({
    code: "F06", name: "Factory Method",
    summary: "Factory Method moves the decision of *which concrete class to instantiate* out of client code. This lesson covers the three things people call \"factory\": static factory methods (`List.of`, `valueOf`), the Simple Factory (one class with a switch or registry), and the GoF Factory Method (a creator subclass overrides the creation step). It also includes notification and parking-lot vehicle designs, a registry-based factory that's open for extension, JDK and Spring usages, and how it differs from Abstract Factory, Builder and Strategy.",
    intent: "Define an interface for creating an object, but let **subclasses decide which class to instantiate**. Factory Method lets a class defer instantiation to subclasses. More broadly: keep `new ConcreteType()` out of the code that *uses* the object.",
    problem: {
      text: "When `new EmailSender()`, `new SmsSender()` and the `if/else` choosing between them are scattered through business code, every new channel means editing every place that creates one, and the business code depends on every concrete class (an OCP and DIP violation).",
      points: [
        "Client code should depend on the **product interface** (`Notifier`), not on concrete classes",
        "The **creation decision** (which class, which config) should live in one place",
        "Three levels, from light to heavy: static factory method → Simple Factory → GoF Factory Method (subclass decides)",
        "In interviews, \"factory\" usually means Simple Factory; know that the GoF version uses inheritance"],
      code: `interface Notifier { void send(String to, String msg); }
class EmailNotifier implements Notifier { public void send(String to, String m) { System.out.println("email " + to + ": " + m); } }
class SmsNotifier implements Notifier { public void send(String to, String m) { System.out.println("sms " + to + ": " + m); } }

class OrderService {
    void confirm(String channel, String to) {
        Notifier n;
        if (channel.equals("EMAIL")) n = new EmailNotifier();          // creation logic leaks into
        else if (channel.equals("SMS")) n = new SmsNotifier();         // business code, and is repeated
        else throw new IllegalArgumentException(channel);              // in every service that notifies
        n.send(to, "order confirmed");
    }
}

new OrderService().confirm("SMS", "+91-98xxxx");`,
      m: H.cd(["classDiagram", "  direction LR",
        "  class OrderService { +confirm(String channel, String to) void }",
        "  class Notifier { <<interface>> }",
        "  OrderService ..> EmailNotifier : new",
        "  OrderService ..> SmsNotifier : new",
        "  OrderService ..> PushNotifier : new",
        "  Notifier <|.. EmailNotifier", "  Notifier <|.. SmsNotifier", "  Notifier <|.. PushNotifier",
        H.bad("OrderService")]) },
    analogy: "A restaurant kitchen. You order \"a pizza\" from the menu (the product interface); the kitchen (factory) decides which chef and recipe produce it. A Domino's franchise and a Pizza Hut franchise each override \"make pizza\" in their own way: that's the GoF Factory Method, where the subclass decides.",
    structure: {
      text: "**Creator** declares `factoryMethod()` returning the **Product** interface and usually has an operation that *uses* the product. **ConcreteCreator** overrides `factoryMethod()` to return a **ConcreteProduct**. The creator's main logic never names a concrete product.",
      m: H.cd(["classDiagram",
        "  class Creator { <<abstract>>; +operation() void; #createProduct()* Product }",
        "  class ConcreteCreatorA { #createProduct() Product }",
        "  class ConcreteCreatorB { #createProduct() Product }",
        "  class Product { <<interface>>; +use() void }",
        "  Creator <|-- ConcreteCreatorA",
        "  Creator <|-- ConcreteCreatorB",
        "  Product <|.. ProductA",
        "  Product <|.. ProductB",
        "  Creator ..> Product : uses",
        "  ConcreteCreatorA ..> ProductA : creates",
        "  ConcreteCreatorB ..> ProductB : creates"]),
      roles: [["Product", "Interface of the objects created (`Notifier`, `Vehicle`, `Document`)"], ["ConcreteProduct", "One implementation (`SmsNotifier`)"], ["Creator", "Declares the factory method; its template code calls it and works only with `Product`"], ["ConcreteCreator", "Overrides the factory method to pick the concrete product"]],
      points: ["`operation()` in the creator is often a Template Method (F21) whose one varying step is creation", "The factory method may have a default implementation (not abstract)"] },
    impl: {
      title: "Java implementation: GoF Factory Method",
      text: "A document-export workflow: the `Exporter` creator owns the algorithm (open, write the header, write rows, close) and lets subclasses decide which `Document` to create. Adding XLSX export means one new creator and one new product; nothing existing changes.",
      code: `interface Document { void header(String h); void row(List<String> cells); String close(); }

class CsvDocument implements Document {
    private final StringBuilder sb = new StringBuilder();
    public void header(String h) { sb.append("# ").append(h).append('\\n'); }
    public void row(List<String> c) { sb.append(String.join(",", c)).append('\\n'); }
    public String close() { return sb.toString(); }
}
class HtmlDocument implements Document {
    private final StringBuilder sb = new StringBuilder("<table>");
    public void header(String h) { sb.append("<caption>").append(h).append("</caption>"); }
    public void row(List<String> c) { sb.append("<tr><td>").append(String.join("</td><td>", c)).append("</td></tr>"); }
    public String close() { return sb.append("</table>").toString(); }
}

abstract class Exporter {                                   // Creator
    protected abstract Document createDocument();          // the factory method
    final String export(String title, List<List<String>> rows) {   // uses only the Product interface
        Document d = createDocument();
        d.header(title);
        rows.forEach(d::row);
        return d.close();
    }
}
class CsvExporter extends Exporter { protected Document createDocument() { return new CsvDocument(); } }
class HtmlExporter extends Exporter { protected Document createDocument() { return new HtmlDocument(); } }

List<List<String>> rows = List.of(List.of("KA01", "2h"), List.of("KA02", "5h"));
for (Exporter e : List.of(new CsvExporter(), new HtmlExporter())) System.out.println(e.export("Parking report", rows));` },
    variants: [
      { title: "Static factory methods (Effective Java, Item 1)",
        text: "Not the GoF pattern, but the most common factory in Java: a `static` method that returns an instance instead of a public constructor. *Effective Java* Item 1: \"Consider static factory methods instead of constructors.\"",
        points: [
          "**Names**: `Money.ofRupees(5)` and `Money.ofPaise(500)` say what a pair of `Money(long)` constructors can't",
          "**Caching**: `Integer.valueOf(127)` and `Boolean.valueOf(true)` return shared instances; a constructor always allocates",
          "**Subtypes**: `EnumSet.of(...)` returns `RegularEnumSet` or `JumboEnumSet` depending on size; callers only see `EnumSet`",
          "**Hidden classes**: `List.of()` returns private immutable implementations you can't name",
          "Naming conventions: `of`, `from`, `valueOf`, `getInstance`, `newInstance`, `create`, `getType`/`newType`",
          "Downsides: classes with only private constructors can't be subclassed; static factories are harder to find in docs than constructors"],
        code: `final class Money {
    private static final Money ZERO = new Money(0);
    private final long paise;
    private Money(long paise) { this.paise = paise; }
    static Money ofRupees(long r) { return r == 0 ? ZERO : new Money(r * 100); }    // named + cached
    static Money ofPaise(long p) { return p == 0 ? ZERO : new Money(p); }
    static Money parse(String s) { return ofPaise(Math.round(Double.parseDouble(s.replace("₹", "")) * 100)); }
    public String toString() { return "₹" + paise / 100 + "." + String.format("%02d", paise % 100); }
}

enum Day { MON, TUE, WED }

System.out.println(Money.ofRupees(5) + " " + Money.parse("₹12.50") + " " + (Money.ofPaise(0) == Money.ofRupees(0)));
System.out.println(Integer.valueOf(127) == Integer.valueOf(127));        // true: cached
System.out.println(EnumSet.of(Day.MON).getClass().getSimpleName());     // RegularEnumSet
System.out.println(List.of(1, 2).getClass().getSimpleName());          // List12 (hidden impl)` },
      { title: "Simple Factory, and making it open for extension",
        text: "A **Simple Factory** is one class with a creation method that picks the concrete type from a parameter. It centralises the `switch`, which is already a big improvement. The `switch` still has to be edited for each new type, so in a machine-coding round upgrade it to a **registry**: a `Map` from key to `Supplier`, where new types register themselves and the factory never changes.",
        points: [
          "Simple Factory: `NotifierFactory.create(Channel.SMS)`. It's not a GoF pattern, but it's what interviewers usually mean",
          "Prefer an **enum** key over strings: compile-time safety and exhaustive `switch` expressions (Java 17+)",
          "Registry factory: `register(Channel.PUSH, PushNotifier::new)` in `main`, so the factory is closed for modification",
          "Make the factory an instance (injected), not static, so tests can register fakes"],
        m: H.cd(["classDiagram", "  direction LR",
          "  class NotifierFactory { -Map~Channel, Supplier~ registry; +register(Channel c, Supplier s) void; +create(Channel c) Notifier }",
          "  class Notifier { <<interface>>; +send(String to, String msg) void }",
          "  class OrderService { -NotifierFactory factory }",
          "  OrderService --> NotifierFactory",
          "  NotifierFactory ..> Notifier : creates",
          "  Notifier <|.. EmailNotifier", "  Notifier <|.. SmsNotifier", "  Notifier <|.. PushNotifier",
          H.good("NotifierFactory")]),
        code: `enum Channel { EMAIL, SMS, PUSH }
interface Notifier { String send(String to, String msg); }
record EmailNotifier() implements Notifier { public String send(String to, String m) { return "email->" + to; } }
record SmsNotifier() implements Notifier { public String send(String to, String m) { return "sms->" + to; } }
record PushNotifier() implements Notifier { public String send(String to, String m) { return "push->" + to; } }

// 1) Simple Factory with an exhaustive switch expression
final class SimpleNotifierFactory {
    static Notifier create(Channel c) {
        return switch (c) {                         // compile error if a constant is missing
            case EMAIL -> new EmailNotifier();
            case SMS -> new SmsNotifier();
            case PUSH -> new PushNotifier();
        };
    }
}

// 2) Registry factory: closed for modification, open for extension
final class NotifierFactory {
    private final Map<Channel, Supplier<? extends Notifier>> registry = new EnumMap<>(Channel.class);
    NotifierFactory register(Channel c, Supplier<? extends Notifier> s) { registry.put(c, s); return this; }
    Notifier create(Channel c) {
        Supplier<? extends Notifier> s = registry.get(c);
        if (s == null) throw new IllegalArgumentException("no notifier for " + c);
        return s.get();
    }
}

NotifierFactory f = new NotifierFactory()
        .register(Channel.EMAIL, EmailNotifier::new)
        .register(Channel.SMS, SmsNotifier::new);
System.out.println(SimpleNotifierFactory.create(Channel.PUSH).send("u1", "hi"));
System.out.println(f.create(Channel.SMS).send("u2", "hi"));
f.register(Channel.PUSH, PushNotifier::new);                 // new type: no factory edit
System.out.println(f.create(Channel.PUSH).send("u3", "hi"));` },
      { title: "Choosing: constructor, static factory, Simple Factory or Factory Method",
        text: "These solve related but different problems. Pick the lightest one that removes the coupling you actually have.",
        table: [
          ["Approach", "Who decides the class", "Extension", "Use when"],
          ["Constructor `new X()`", "the caller, at compile time", "n/a", "one obvious implementation, no variation"],
          ["Static factory `X.of(..)`", "the class itself", "edit the method", "naming, caching, hidden subtypes, validation"],
          ["Simple Factory `Factory.create(type)`", "one factory, from a parameter", "edit the switch, or register (registry)", "runtime choice among a family by config or input"],
          ["Factory Method (GoF)", "a creator **subclass**", "add a subclass", "a framework or base class owns an algorithm and lets subclasses supply the product"],
          ["Abstract Factory (F07)", "a factory **object** for a whole family", "add a factory class", "several related products that must match (UI theme, cloud provider)"],
          ["Builder (F08)", "the caller, step by step", "add builder methods", "one complex object with many optional parts"]],
        m: M(["flowchart LR",
          "  Q1{\"many implementations?\"} -->|no| C[\"<b>constructor</b>\"]",
          "  Q1 -->|yes| Q2{\"choice made at runtime<br/>from input/config?\"}",
          "  Q2 -->|yes| SF[\"<b>Simple / registry factory</b>\"]:::s0",
          "  Q2 -->|no, by subclass| FM[\"<b>Factory Method</b>\"]:::s1",
          "  Q1 -->|related family| AF[\"<b>Abstract Factory</b>\"]:::s2",
          "  C -.-> N{\"need a name, caching,<br/>or hidden subtype?\"} -->|yes| ST[\"<b>static factory</b>\"]"]) }
    ],
    designs: [
      { title: "Mini LLD: a notification system",
        text: "Requirements: send order updates to users over their preferred channels (email, SMS, push, WhatsApp later); each channel needs its own config (API key, sender ID); a failed channel shouldn't block the others. The **factory** owns *which class and how to configure it*; the **service** owns *when and to whom*.",
        points: [
          "`NotifierFactory` is built once in `main` with each channel's config: creation knowledge lives in one place",
          "`NotificationService` asks the factory for each of the user's preferred channels and sends; it never names a concrete class",
          "Adding WhatsApp: one class + one `register` line. `NotificationService` doesn't change (OCP)",
          "Failure isolation per channel (try/catch per send) and an optional fallback channel",
          "Follow-ups interviewers ask: retries with backoff (decorator), templates per event type, rate limiting, async sending through a queue"],
        m: H.cd(["classDiagram",
          "  class NotificationService { -NotifierFactory factory; -PreferenceStore prefs; +notify(String userId, String event) List~String~ }",
          "  class NotifierFactory { -Map~Channel, Function~ creators; +register(Channel c, Function f) void; +create(Channel c) Notifier }",
          "  class Notifier { <<interface>>; +send(String to, String msg) void }",
          "  class PreferenceStore { <<interface>>; +channelsFor(String userId) List~Channel~ }",
          "  class ChannelConfig { -String apiKey; -String sender }",
          "  NotificationService --> NotifierFactory",
          "  NotificationService --> PreferenceStore",
          "  NotifierFactory ..> ChannelConfig : reads",
          "  NotifierFactory ..> Notifier : creates",
          "  Notifier <|.. EmailNotifier", "  Notifier <|.. SmsNotifier", "  Notifier <|.. PushNotifier"]),
        code: `enum Channel { EMAIL, SMS, PUSH }
record ChannelConfig(String apiKey, String sender) {}
interface Notifier { void send(String to, String msg); }
class EmailNotifier implements Notifier {
    private final ChannelConfig cfg; EmailNotifier(ChannelConfig c) { cfg = c; }
    public void send(String to, String msg) { System.out.println("[email from " + cfg.sender() + "] " + to + ": " + msg); }
}
class SmsNotifier implements Notifier {
    private final ChannelConfig cfg; SmsNotifier(ChannelConfig c) { cfg = c; }
    public void send(String to, String msg) { if (to.isBlank()) throw new IllegalStateException("no phone"); System.out.println("[sms " + cfg.sender() + "] " + to + ": " + msg); }
}

class NotifierFactory {
    private final Map<Channel, Supplier<Notifier>> creators = new EnumMap<>(Channel.class);
    void register(Channel c, Supplier<Notifier> s) { creators.put(c, s); }
    Notifier create(Channel c) { return Optional.ofNullable(creators.get(c)).orElseThrow(() -> new IllegalArgumentException(c + " not configured")).get(); }
}
interface PreferenceStore { List<Channel> channelsFor(String userId); String address(String userId, Channel c); }

class NotificationService {
    private final NotifierFactory factory; private final PreferenceStore prefs;
    NotificationService(NotifierFactory f, PreferenceStore p) { factory = f; prefs = p; }
    List<String> notify(String userId, String msg) {
        List<String> failures = new ArrayList<>();
        for (Channel c : prefs.channelsFor(userId)) {
            try { factory.create(c).send(prefs.address(userId, c), msg); }     // never names a concrete class
            catch (RuntimeException e) { failures.add(c + ": " + e.getMessage()); }   // isolate failures
        }
        return failures;
    }
}

NotifierFactory factory = new NotifierFactory();               // composition root
factory.register(Channel.EMAIL, () -> new EmailNotifier(new ChannelConfig("k1", "orders@shop.in")));
factory.register(Channel.SMS, () -> new SmsNotifier(new ChannelConfig("k2", "SHOPIN")));
PreferenceStore prefs = new PreferenceStore() {
    public List<Channel> channelsFor(String u) { return List.of(Channel.EMAIL, Channel.SMS, Channel.PUSH); }
    public String address(String u, Channel c) { return c == Channel.EMAIL ? "asha@mail.com" : ""; }
};
System.out.println(new NotificationService(factory, prefs).notify("u1", "Order #42 shipped"));` },
      { title: "Mini LLD: vehicles and spots in a parking lot",
        text: "The entry gate receives raw input (a plate and a type code from a camera or a form). A **VehicleFactory** turns it into the right `Vehicle` subtype, and a **SpotFactory** builds each floor's spots from a layout config. Creation rules (validation, which subclass, defaults) stay out of `ParkingLot` and `EntryGate`.",
        points: [
          "`VehicleFactory.from(\"CAR\", \"KA01AB1234\")` validates the plate and picks the subtype; unknown types fail fast at the edge",
          "`SpotFactory.floor(n, \"S:4,M:10,L:2\")` builds spots from config, so a new layout is data, not code",
          "`ParkingLot` only ever sees `Vehicle` and `ParkingSpot` abstractions",
          "If the lot must support electric cars later: register `EV` → `ElectricCar::new` and add an `EV` spot type in config"],
        m: H.cd(["classDiagram",
          "  class VehicleFactory { -Map~String, Function~ byType; +from(String type, String plate) Vehicle }",
          "  class SpotFactory { +floor(int n, String layout)$ List~ParkingSpot~ }",
          "  class Vehicle { <<abstract>>; -String plate; +size()* Size }",
          "  class EntryGate { -VehicleFactory vehicles; -ParkingLot lot; +onArrival(String type, String plate) Ticket }",
          "  EntryGate --> VehicleFactory",
          "  VehicleFactory ..> Vehicle : creates",
          "  Vehicle <|-- Bike", "  Vehicle <|-- Car", "  Vehicle <|-- Truck",
          "  SpotFactory ..> ParkingSpot : creates"]),
        code: `enum Size { S, M, L }
abstract class Vehicle { final String plate; Vehicle(String p) { plate = p; } abstract Size size();
    public String toString() { return getClass().getSimpleName() + "(" + plate + ")"; } }
class Bike extends Vehicle { Bike(String p) { super(p); } Size size() { return Size.S; } }
class Car extends Vehicle { Car(String p) { super(p); } Size size() { return Size.M; } }
class Truck extends Vehicle { Truck(String p) { super(p); } Size size() { return Size.L; } }
record ParkingSpot(String id, Size size) {}

final class VehicleFactory {
    private static final java.util.regex.Pattern PLATE = java.util.regex.Pattern.compile("[A-Z]{2}\\\\d{2}[A-Z]{0,2}\\\\d{4}");
    private final Map<String, Function<String, Vehicle>> byType = new HashMap<>(Map.of(
            "BIKE", Bike::new, "CAR", Car::new, "TRUCK", Truck::new));
    void register(String type, Function<String, Vehicle> creator) { byType.put(type, creator); }
    Vehicle from(String type, String plate) {
        String p = plate.replaceAll("\\\\s", "").toUpperCase();
        if (!PLATE.matcher(p).matches()) throw new IllegalArgumentException("bad plate " + plate);
        Function<String, Vehicle> f = byType.get(type.toUpperCase());
        if (f == null) throw new IllegalArgumentException("unknown type " + type);
        return f.apply(p);
    }
}

final class SpotFactory {
    static List<ParkingSpot> floor(int n, String layout) {          // e.g. "S:2,M:3,L:1"
        List<ParkingSpot> out = new ArrayList<>();
        for (String part : layout.split(",")) {
            String[] kv = part.split(":");
            for (int i = 1; i <= Integer.parseInt(kv[1]); i++) out.add(new ParkingSpot(n + kv[0] + i, Size.valueOf(kv[0])));
        }
        return out;
    }
}

VehicleFactory vf = new VehicleFactory();
System.out.println(vf.from("car", "ka 01 ab 1234") + " " + vf.from("BIKE", "MH12XY0001").size());
System.out.println(SpotFactory.floor(1, "S:2,M:3,L:1"));
try { vf.from("BUS", "KA01AB1234"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }` }
    ],
    usages: [
      ["`java.util.Collection.iterator()`", "A GoF Factory Method: each collection subclass decides which `Iterator` implementation to return; callers see only `Iterator`."],
      ["`java.net.URLStreamHandler.openConnection()`", "Subclasses per protocol (http, file, jar) create the matching `URLConnection` subtype."],
      ["`Calendar.getInstance()`, `NumberFormat.getInstance(locale)`", "Static factories that return a locale-appropriate subclass (`GregorianCalendar`, `DecimalFormat`) behind the abstract type."],
      ["`List.of`, `Map.of`, `EnumSet.of`, `Integer.valueOf`, `Optional.of`", "Static factory methods: hidden implementation classes, caching and validation."],
      ["`DocumentBuilderFactory.newInstance()`, `HttpClient.newHttpClient()`", "Factories that pick a provider implementation at runtime (JAXP looks up the configured parser)."],
      ["Spring `@Bean` methods and `FactoryBean<T>`", "A `@Bean` method is a factory method the container calls; `FactoryBean.getObject()` lets a bean decide what object is exposed (used for proxies, `SqlSessionFactoryBean`, etc.)."],
      ["Spring `BeanFactory.getBean(...)`", "The IoC container itself is a giant registry factory: it decides which implementation to create and wires its dependencies."]
    ],
    avoid: {
      points: [
        "Only one implementation exists and none is planned: `new` is clearer (YAGNI)",
        "Creation is trivial and the caller legitimately knows the concrete type (value objects, DTOs, test data)",
        "Don't add a GoF creator hierarchy just to vary creation; a `Supplier<T>` or a registry is lighter than a parallel class hierarchy",
        "Don't hide **required dependencies** inside a factory that reaches for globals; inject them into the factory",
        "If construction has many optional parameters, you need a Builder, not a factory"],
      pros: ["Clients depend on the interface, not concrete classes (DIP)", "Creation logic (validation, config, caching) lives in one place (SRP)", "New products without editing clients (OCP), especially with a registry"],
      cons: ["More classes and indirection", "The GoF form creates parallel hierarchies (one creator per product)", "A Simple Factory's `switch` still changes for every new type unless you use a registry", "Overuse makes \"find where this object is created\" harder"] },
    compare: [
      ["Abstract Factory (F07)", "Create **families** of related objects that must match", "A factory *object* with several creation methods (`createButton`, `createCheckbox`); Factory Method is *one* method, usually varied by subclassing"],
      ["Builder (F08)", "Construct **one complex** object step by step", "Builder is about *how* to assemble many parts; Factory is about *which* class to instantiate, in one call"],
      ["Prototype (F09)", "Create by **copying** a configured instance", "No subclass per product; clone a registered prototype instead"],
      ["Strategy (F17)", "Choose an **algorithm** at runtime", "Same `Map<Key, Impl>` shape, but Strategy selects *behaviour* to run; a factory produces *objects*. Factories often return strategies"],
      ["Template Method (F21)", "Fix an algorithm's skeleton, vary steps in subclasses", "Factory Method is a Template Method whose varying step is *creation*"],
      ["Service Locator", "Look up dependencies from a global registry", "Callers *pull* dependencies from a global (hidden coupling); a factory is usually injected and creates new objects"]],
    widget: { heading: "Interactive: which creational approach?", caption: "Ten design situations. Pick the lightest approach that fits; the explanation shows the trade-off. Your answers are saved.",
      render: H.widgets.picker({
        intro: "Factories are easy to overuse. For each situation pick what you'd actually write in a machine-coding round.",
        question: "Best fit?", noun: "Situations",
        options: ["Constructor", "Static factory method", "Simple / registry factory", "Factory Method (GoF)", "Abstract Factory", "Builder"],
        items: [
          { title: "Money from rupees or paise", text: "`Money` needs creation from rupees, from paise and from a string like `\"₹12.50\"`. All three take one number or string, so constructors would clash, and `ZERO` should be cached.", answer: "Static factory method", why: "Names (`ofRupees`, `ofPaise`, `parse`) disambiguate same-typed parameters, and a static factory can cache." },
          { title: "Payment method chosen at checkout", text: "The user picks UPI, card or net banking at checkout. Each needs a different `PaymentProcessor` with its own config; new methods arrive every quarter.", answer: "Simple / registry factory", why: "A runtime choice from input among one product family; a registry keeps it open for new methods.", fix: "`processors.create(method)`, with each processor registered in `main`." },
          { title: "A Point(x, y)", text: "A small immutable value class with two required ints and one obvious implementation.", answer: "Constructor", why: "Nothing varies. A record with a canonical constructor is the clearest option." },
          { title: "HTTP request with 12 optional settings", text: "Headers, timeouts, retries, body, auth, query params, proxy... most optional, and some combinations are invalid.", answer: "Builder", why: "Many optional parts and validation at the end: that's Builder's job (F08). `HttpRequest.newBuilder()` is exactly this." },
          { title: "Light and dark UI themes", text: "Each theme needs a matching `Button`, `TextField` and `Dialog`. Mixing a dark button with a light dialog must be impossible.", answer: "Abstract Factory", why: "A *family* of products that must be consistent: one factory object per theme (F07)." },
          { title: "Report framework base class", text: "`ReportGenerator` (in a shared library) implements fetch → format → write. Teams subclass it to produce PDF, Excel or CSV; the library can't know their document classes.", answer: "Factory Method (GoF)", why: "A base class owns the algorithm and defers *creation* to subclasses, which is the textbook Factory Method." },
          { title: "Vehicle from the entry camera", text: "The camera sends a type string (`CAR`, `BIKE`, `TRUCK`) and a plate. The gate must create the right `Vehicle` subtype and reject unknown types.", answer: "Simple / registry factory", why: "A runtime choice from input; validation at the edge.", fix: "`VehicleFactory.from(type, plate)`." },
          { title: "Board for a 3×3 or N×N tic-tac-toe", text: "A `Board` needs a size and initial empty cells. There's one implementation.", answer: "Constructor", why: "No family, no options. `new Board(n)` is fine; don't add a factory just because it's a design round." },
          { title: "AWS vs GCP storage + queue + DB clients", text: "The app runs on either cloud. When on AWS, *all three* clients must be AWS ones, chosen once at startup.", answer: "Abstract Factory", why: "A family of related products swapped together: one `CloudFactory` per provider." },
          { title: "Immutable `Pizza` with size, crust and 0–10 toppings", text: "Size and crust are required; toppings, extra cheese and a coupon are optional.", answer: "Builder", why: "Required fields in the builder's constructor, optional ones as fluent methods, validated in `build()`." }
        ]
      }) },
    pitfalls: [
      "Calling every `switch` that creates objects a \"Factory Method\"; know the GoF meaning (subclass decides) vs Simple Factory",
      "A factory that still forces callers to cast the result to a concrete type, which defeats the purpose",
      "A Simple Factory with string keys and a growing `if/else` chain; use an enum and a registry",
      "Static factories reaching for globals (`System.getenv`, singletons) instead of getting config injected",
      "Creating a factory for a class with one implementation and no variation",
      "Returning `null` for unknown types instead of failing fast with a clear exception",
      "Mixing creation with business logic (the factory also sends the notification)",
      "Confusing Factory with Strategy; they often appear together (a factory that returns strategies)"
    ],
    quiz: [
      { q: "In the GoF Factory Method pattern, who decides which concrete product is instantiated?", options: ["The client, via `new`", "A subclass of the creator, by overriding the factory method", "A static map", "The product itself"], answer: 1, why: "\"Let subclasses decide which class to instantiate.\" The base creator works only with the product interface." },
      { q: "`Collection.iterator()` is an example of…", options: ["Abstract Factory", "Factory Method: each collection subclass returns its own `Iterator` implementation", "Builder", "Singleton"], answer: 1, why: "`ArrayList` and `HashSet` each override `iterator()` to create a matching iterator." },
      { q: "Which is **not** an advantage of static factory methods over constructors?", options: ["They have descriptive names", "They can return cached instances", "They can return a subtype", "They let subclasses override them polymorphically"], answer: 3, why: "Static methods aren't polymorphic. That's what the GoF (instance) Factory Method gives you." },
      { q: "Your `NotifierFactory` has a `switch` you edit for every new channel. What makes it closed for modification?", options: ["Make it a singleton", "A registry: `Map<Channel, Supplier<Notifier>>` filled in `main`", "Add `default -> null`", "Use reflection with class names from strings everywhere"], answer: 1, why: "New types register themselves; the factory's code never changes." },
      { q: "What's the key difference between Factory Method and Abstract Factory?", options: ["None", "Factory Method creates one product via an overridable method; Abstract Factory is an object creating a family of related products", "Abstract Factory can only create one product", "Factory Method always uses reflection"], answer: 1, why: "Method + inheritance vs object + composition, and one product vs a consistent family." },
      { q: "A Spring `@Bean` method in a `@Configuration` class is best described as…", options: ["A singleton pattern", "A factory method the container calls to create a bean", "An observer", "A decorator"], answer: 1, why: "It encapsulates creation and configuration; Spring calls it and manages the result." },
      { q: "When is a factory overkill?", options: ["Several implementations chosen at runtime", "Creation needs validation and config", "A value class with one implementation and two required fields", "A framework needs subclasses to supply products"], answer: 2, why: "Use a constructor (or a record). Patterns should remove a real coupling." },
      { q: "`EnumSet.of(...)` returns `RegularEnumSet` for ≤64 constants and `JumboEnumSet` otherwise. Which advantage of static factories is this?", options: ["Naming", "Returning different subtypes depending on parameters, hidden from the caller", "Caching", "Thread safety"], answer: 1, why: "Callers program to `EnumSet`, and the JDK can change implementations freely." }
    ],
    cheatsheet: {
      table: [
        ["Form", "Shape", "Extension", "Example"],
        ["Static factory", "`static X of(...)` on the class", "edit the class", "`List.of`, `Integer.valueOf`, `Money.ofRupees`"],
        ["Simple Factory", "`Factory.create(type)` with a switch", "edit the switch", "`NotifierFactory.create(SMS)`"],
        ["Registry factory", "`Map<Key, Supplier<T>>` + `register`", "register in `main`", "`VehicleFactory.register(\"EV\", ElectricCar::new)`"],
        ["GoF Factory Method", "abstract `createX()` in a creator, overridden by subclasses", "add a creator subclass", "`Collection.iterator()`, `Exporter.createDocument()`"]],
      cards: [
        { title: "Recipe (registry)", items: ["Product interface", "Enum key", "`EnumMap<Key, Supplier>`", "`register()` in main", "`create()` fails fast on unknown keys"] },
        { title: "Static factory names", items: ["`of` / `from` / `valueOf`", "`getInstance` (maybe cached)", "`newInstance` (always new)", "`parse`", "`getType` / `newType`"] },
        { title: "Interview signals", items: ["\"Clients see only the interface\"", "\"Adding a type is one class + one line\"", "\"I'd use a constructor here: one impl\"", "Factory often returns Strategies"] }]
    },
    practice: [
      { level: "Easy", q: "Give four advantages and two disadvantages of static factory methods compared with public constructors, with a JDK example of each advantage.",
        a: ["**Names**: `BigInteger.probablePrime(bits, rnd)` says more than a constructor would.",
          "**Caching / instance control**: `Boolean.valueOf(b)` never allocates; `Integer.valueOf` caches −128..127.",
          "**Return any subtype**: `Collections.unmodifiableList` returns a private wrapper class; `EnumSet.of` picks Regular or Jumbo.",
          "**Type inference and validation**: `Optional.of(x)` rejects `null` immediately; `List.of` rejects null elements.",
          "Disadvantages: a class with only private constructors can't be subclassed (arguably good: composition over inheritance), and static factories are less discoverable than constructors in docs (hence the naming conventions)."] },
      { level: "Easy", q: "Refactor this shape-creation code so clients don't depend on concrete classes and an unknown type fails clearly.",
        qcode: `String type = "circle";
double area;
if (type.equals("circle")) area = Math.PI * 2 * 2;
else if (type.equals("square")) area = 3 * 3;
else area = 0;   // silently wrong for "triangle"
System.out.println(area);`,
        a: "Introduce a `Shape` interface, implementations, and a factory keyed by an enum. Parsing the string happens once at the edge (`ShapeType.valueOf`), which throws for unknown types instead of silently returning 0.",
        code: `interface Shape { double area(); }
record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }
record Square(double s) implements Shape { public double area() { return s * s; } }
enum ShapeType { CIRCLE, SQUARE }

final class ShapeFactory {
    static Shape create(ShapeType t, double size) {
        return switch (t) { case CIRCLE -> new Circle(size); case SQUARE -> new Square(size); };
    }
}

System.out.printf("%.2f%n", ShapeFactory.create(ShapeType.valueOf("circle".toUpperCase()), 2).area());
try { ShapeType.valueOf("TRIANGLE"); } catch (IllegalArgumentException e) { System.out.println("rejected: " + e.getMessage()); }` },
      { level: "Medium", q: "Design a `PaymentProcessorFactory` for UPI, card and net banking, where each processor needs gateway credentials, new methods can be added without editing the factory, and checkout code never names a concrete class.",
        m: H.cd(["classDiagram", "  direction LR",
          "  class CheckoutService { -PaymentProcessorFactory factory; +pay(PaymentMethod m, long amount) Receipt }",
          "  class PaymentProcessorFactory { -Map~PaymentMethod, Supplier~ registry; +register(PaymentMethod m, Supplier s) void; +get(PaymentMethod m) PaymentProcessor }",
          "  class PaymentProcessor { <<interface>>; +charge(long amount) Receipt }",
          "  CheckoutService --> PaymentProcessorFactory",
          "  PaymentProcessorFactory ..> PaymentProcessor",
          "  PaymentProcessor <|.. UpiProcessor", "  PaymentProcessor <|.. CardProcessor", "  PaymentProcessor <|.. NetBankingProcessor"]),
        code: `enum PaymentMethod { UPI, CARD, NETBANKING }
record Receipt(String ref, long amount) {}
record GatewayCreds(String merchantId, String key) {}
interface PaymentProcessor { Receipt charge(long amount); }
class UpiProcessor implements PaymentProcessor {
    private final GatewayCreds c; UpiProcessor(GatewayCreds c) { this.c = c; }
    public Receipt charge(long amt) { return new Receipt("UPI-" + c.merchantId(), amt); } }
class CardProcessor implements PaymentProcessor {
    private final GatewayCreds c; CardProcessor(GatewayCreds c) { this.c = c; }
    public Receipt charge(long amt) { return new Receipt("CARD-" + c.merchantId(), amt + amt * 2 / 100); } }   // 2% fee

class PaymentProcessorFactory {
    private final Map<PaymentMethod, Supplier<PaymentProcessor>> registry = new EnumMap<>(PaymentMethod.class);
    PaymentProcessorFactory register(PaymentMethod m, Supplier<PaymentProcessor> s) { registry.put(m, s); return this; }
    PaymentProcessor get(PaymentMethod m) {
        var s = registry.get(m);
        if (s == null) throw new UnsupportedOperationException(m + " not enabled");
        return s.get();
    }
}
class CheckoutService {
    private final PaymentProcessorFactory factory;
    CheckoutService(PaymentProcessorFactory f) { factory = f; }
    Receipt pay(PaymentMethod m, long amount) { return factory.get(m).charge(amount); }
}

GatewayCreds creds = new GatewayCreds("M-77", "secret");
CheckoutService checkout = new CheckoutService(new PaymentProcessorFactory()
        .register(PaymentMethod.UPI, () -> new UpiProcessor(creds))
        .register(PaymentMethod.CARD, () -> new CardProcessor(creds)));
System.out.println(checkout.pay(PaymentMethod.UPI, 500) + " " + checkout.pay(PaymentMethod.CARD, 500));
try { checkout.pay(PaymentMethod.NETBANKING, 500); } catch (UnsupportedOperationException e) { System.out.println(e.getMessage()); }` },
      { level: "Medium", q: "Use the **GoF Factory Method** for a game: each level spawns enemies through the same `spawnWave()` algorithm, but Level 1 creates goblins and Level 2 creates orcs (and a boss every third wave).",
        code: `interface Enemy { int hp(); String name(); }
record Goblin() implements Enemy { public int hp() { return 30; } public String name() { return "goblin"; } }
record Orc() implements Enemy { public int hp() { return 80; } public String name() { return "orc"; } }
record OrcBoss() implements Enemy { public int hp() { return 300; } public String name() { return "ORC BOSS"; } }

abstract class Level {
    protected abstract Enemy createEnemy(int wave, int index);     // factory method
    final List<Enemy> spawnWave(int wave) {                         // template using it
        List<Enemy> out = new ArrayList<>();
        for (int i = 0; i < 2 + wave; i++) out.add(createEnemy(wave, i));
        return out;
    }
}
class Level1 extends Level { protected Enemy createEnemy(int w, int i) { return new Goblin(); } }
class Level2 extends Level {
    protected Enemy createEnemy(int w, int i) { return (w % 3 == 0 && i == 0) ? new OrcBoss() : new Orc(); }
}

for (Level l : List.of(new Level1(), new Level2()))
    System.out.println(l.getClass().getSimpleName() + " wave 3: " + l.spawnWave(3).stream().map(Enemy::name).toList());`,
        follow: "Why is this better than `if (level == 1)` inside `spawnWave`? Each level's creation rules live in its own class, and adding Level 3 doesn't touch existing levels." },
      { level: "Medium", q: "Combine Factory and Strategy: parking fees differ by vehicle type (bike ₹10/h, car ₹20/h, truck ₹50/h with a 2-hour minimum). Pick the pricing strategy through a factory so `ExitGate` stays unchanged when a new type arrives.",
        a: "The factory decides **which** strategy object to use; the strategy encapsulates **how** to compute the fee. `ExitGate` only calls `factory.forType(t).fee(hours)`.",
        code: `interface PricingStrategy { long fee(long hours); }
record HourlyPricing(long perHour) implements PricingStrategy { public long fee(long h) { return perHour * Math.max(1, h); } }
record MinimumHoursPricing(long perHour, long minHours) implements PricingStrategy { public long fee(long h) { return perHour * Math.max(minHours, h); } }
enum VehicleType { BIKE, CAR, TRUCK }

class PricingFactory {
    private final Map<VehicleType, PricingStrategy> byType = new EnumMap<>(VehicleType.class);
    PricingFactory() {
        byType.put(VehicleType.BIKE, new HourlyPricing(10));
        byType.put(VehicleType.CAR, new HourlyPricing(20));
        byType.put(VehicleType.TRUCK, new MinimumHoursPricing(50, 2));
    }
    PricingStrategy forType(VehicleType t) { return byType.get(t); }   // strategies are stateless: share them
}
class ExitGate {
    private final PricingFactory pricing;
    ExitGate(PricingFactory p) { pricing = p; }
    long charge(VehicleType t, long hours) { return pricing.forType(t).fee(hours); }
}

ExitGate gate = new ExitGate(new PricingFactory());
System.out.println(gate.charge(VehicleType.BIKE, 3) + " " + gate.charge(VehicleType.CAR, 3) + " " + gate.charge(VehicleType.TRUCK, 1));   // 30 60 100` },
      { level: "Medium", q: "\"We use Spring, so do we still need factories?\" Discuss, and show how a runtime choice among beans works without a hand-written `switch`.",
        a: ["Spring removes most factories for **wiring** (which implementation of a dependency to inject); that's configuration, decided at startup.",
          "You still need a factory-like lookup for a **runtime** choice per request (the user picked UPI). In Spring you can inject `Map<String, PaymentProcessor>` (bean name → bean) or `List<PaymentProcessor>`, and build an `EnumMap` keyed by a `method()` each processor reports. That's a registry factory with no `switch`.",
          "Use `@Bean` methods or `FactoryBean` for complex construction (third-party clients) and `ObjectProvider<T>` when you need a new prototype-scoped instance each time.",
          "The plain-Java equivalent below is what you'd write in a machine-coding round without Spring."],
        code: `enum Method { UPI, CARD }
interface Processor { Method method(); String pay(long amt); }
class Upi implements Processor { public Method method() { return Method.UPI; } public String pay(long a) { return "upi " + a; } }
class Card implements Processor { public Method method() { return Method.CARD; } public String pay(long a) { return "card " + a; } }

class ProcessorRegistry {                               // what Spring's injected List<Processor> enables
    private final Map<Method, Processor> byMethod = new EnumMap<>(Method.class);
    ProcessorRegistry(List<Processor> all) {
        for (Processor p : all)
            if (byMethod.put(p.method(), p) != null) throw new IllegalStateException("duplicate " + p.method());
    }
    Processor get(Method m) { return Objects.requireNonNull(byMethod.get(m), "unsupported " + m); }
}

ProcessorRegistry reg = new ProcessorRegistry(List.of(new Upi(), new Card()));   // Spring would pass the beans
System.out.println(reg.get(Method.CARD).pay(250));` },
      { level: "Hard", q: "Write a factory that builds chess pieces from a FEN board row (e.g. `\"rnbqkbnr\"` or `\"4P3\"`): letters map to piece types (uppercase is white), digits mean empty squares.",
        steps: [["Product", "`Piece(type, color)`; empty squares are `null` (or an `Optional`)."], ["Factory map", "`Map<Character, PieceType>` from the lowercase letter; colour from the case."], ["Parsing", "Expand digits into empty squares; validate that the row has exactly 8 squares."], ["Extension", "A Chess960 or fairy-chess variant registers extra letters (e.g. `a` for archbishop) without changing the parser."]],
        code: `enum PieceType { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN }
enum Color { WHITE, BLACK }
record Piece(PieceType type, Color color) {
    public String toString() { return (color == Color.WHITE ? "w" : "b") + (type == PieceType.KNIGHT ? 'N' : type.name().charAt(0)); }
}

final class PieceFactory {
    private final Map<Character, PieceType> byLetter = new HashMap<>(Map.of(
            'k', PieceType.KING, 'q', PieceType.QUEEN, 'r', PieceType.ROOK,
            'b', PieceType.BISHOP, 'n', PieceType.KNIGHT, 'p', PieceType.PAWN));
    Piece create(char c) {
        PieceType t = byLetter.get(Character.toLowerCase(c));
        if (t == null) throw new IllegalArgumentException("unknown piece '" + c + "'");
        return new Piece(t, Character.isUpperCase(c) ? Color.WHITE : Color.BLACK);
    }
    List<Piece> row(String fen) {
        List<Piece> squares = new ArrayList<>();
        for (char c : fen.toCharArray()) {
            if (Character.isDigit(c)) for (int i = 0; i < c - '0'; i++) squares.add(null);
            else squares.add(create(c));
        }
        if (squares.size() != 8) throw new IllegalArgumentException("row has " + squares.size() + " squares");
        return squares;
    }
}

PieceFactory f = new PieceFactory();
System.out.println(f.row("rnbqkbnr"));
System.out.println(f.row("4P3"));
try { f.row("rnbqkbnrx"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }` },
      { level: "Hard", q: "Design a **document converter** that supports plugins (PDF→DOCX, MD→HTML, …) shipped as separate JARs that you don't know at compile time. How does the factory discover them?",
        a: ["Define an SPI interface `Converter { boolean supports(String from, String to); byte[] convert(byte[] in); }` in a small API module.",
          "Plugins implement it and declare themselves in `META-INF/services/<fqcn of Converter>` (or `provides … with …` in `module-info.java`).",
          "The factory uses **`java.util.ServiceLoader`** to discover implementations on the classpath at startup, and builds a registry keyed by `(from, to)`.",
          "`ConverterFactory.get(from, to)` returns the matching converter or throws `UnsupportedConversionException`. Optionally chain converters (MD→HTML→PDF) by searching the graph.",
          "This is how JDBC drivers, `java.nio.charset` providers and SLF4J bindings are found: a factory over a plugin registry."],
        code: `interface Converter { boolean supports(String from, String to); String convert(String in); }
record MdToHtml() implements Converter {
    public boolean supports(String f, String t) { return f.equals("md") && t.equals("html"); }
    public String convert(String in) { return in.replaceAll("^# (.*)$", "<h1>$1</h1>"); }
}

final class ConverterFactory {
    private final List<Converter> converters = new ArrayList<>();
    ConverterFactory(Iterable<Converter> builtIns) {
        builtIns.forEach(converters::add);
        ServiceLoader.load(Converter.class).forEach(converters::add);    // plugins from META-INF/services
    }
    Converter get(String from, String to) {
        return converters.stream().filter(c -> c.supports(from, to)).findFirst()
                .orElseThrow(() -> new UnsupportedOperationException(from + " -> " + to));
    }
}

ConverterFactory f = new ConverterFactory(List.of(new MdToHtml()));
System.out.println(f.get("md", "html").convert("# Hello"));
try { f.get("pdf", "docx"); } catch (UnsupportedOperationException e) { System.out.println("no plugin for " + e.getMessage()); }` }
    ],
    recap: [
      "\"Factory\" means three things: static factory methods (`List.of`), a Simple/registry factory (`create(type)`), and the GoF Factory Method (a creator subclass overrides `createX()`).",
      "The goal is the same: clients depend on the product interface, and creation knowledge (which class, config, validation) lives in one place.",
      "Make factories open for extension with an `EnumMap<Key, Supplier>` registry filled in `main`; fail fast on unknown keys.",
      "JDK and Spring examples: `Collection.iterator()`, `Calendar.getInstance()`, `EnumSet.of`, `@Bean` methods, `FactoryBean`, `ServiceLoader`.",
      "Don't use one when there's a single implementation; use Abstract Factory for families and Builder for many optional parts."
    ]
  });
})();
