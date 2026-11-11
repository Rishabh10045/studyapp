/* Lesson F10: Adapter */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  H.pattern({
    code: "F10", name: "Adapter",
    summary: "Adapter converts the interface of a class into another interface clients expect, so classes with incompatible interfaces can work together. This lesson covers object vs class adapters, two-way adapters, adapting third-party payment SDKs behind one `PaymentGateway` port, adapting SMS vendors and legacy code, hexagonal architecture (ports and adapters), JDK and Spring usages (`InputStreamReader`, `Arrays.asList`, `HandlerAdapter`), and how Adapter differs from Decorator, Facade, Proxy and Bridge.",
    intent: "Convert the interface of a class into **another interface clients expect**. Adapter lets classes work together that couldn't otherwise because of incompatible interfaces.",
    problem: {
      text: "Your checkout code depends on your own `PaymentGateway.charge(Money, String customerId)`. The business signs with a provider whose SDK exposes `createCharge(Map<String,Object> params)` returning a JSON-ish map, amounts in paise as `int`, and checked exceptions. You can't change the SDK, and you don't want SDK types spreading through your domain.",
      points: [
        "**Target**: the interface your code wants (`PaymentGateway`)",
        "**Adaptee**: the existing class with the wrong interface (`VendorSdk`)",
        "**Adapter**: implements the target and translates calls (names, parameter shapes, units, errors) to the adaptee",
        "Also keeps vendor types out of your domain: if the vendor changes, only the adapter changes"],
      code: `class VendorSdk {                                     // third-party: can't change it
    Map<String, Object> createCharge(Map<String, Object> params) throws java.io.IOException {
        return Map.of("id", "ch_91", "status", "succeeded", "amount", params.get("amount_paise"));
    }
}

// Without an adapter, SDK details leak into business code everywhere:
class CheckoutService {
    String pay(long rupees, String customer) {
        try {
            Map<String, Object> r = new VendorSdk().createCharge(Map.of("amount_paise", (int) (rupees * 100), "customer", customer));
            return "succeeded".equals(r.get("status")) ? (String) r.get("id") : null;
        } catch (java.io.IOException e) { throw new RuntimeException(e); }
    }
}

System.out.println(new CheckoutService().pay(499, "cust_1"));` },
    analogy: "A travel plug adapter. Your Indian charger (client) expects a round-pin socket (target); the UK wall (adaptee) offers square pins. The adapter doesn't generate electricity or change the voltage. It just makes the shapes fit.",
    structure: {
      text: "The **Client** works with the **Target** interface. The **Adapter** implements Target and holds a reference to the **Adaptee** (object adapter, via composition), translating each call. A **class adapter** instead extends the Adaptee and implements Target; in Java that's possible only when the adaptee is a class and the target an interface, and it's rarely the better choice.",
      m: H.cd(["classDiagram",
        "  class Client",
        "  class PaymentGateway { <<interface>>; +charge(long paise, String customer) ChargeResult }",
        "  class VendorAdapter { -VendorSdk sdk; +charge(long paise, String customer) ChargeResult }",
        "  class VendorSdk { +createCharge(Map params) Map }",
        "  Client --> PaymentGateway",
        "  PaymentGateway <|.. VendorAdapter",
        "  VendorAdapter --> VendorSdk : adaptee"]),
      roles: [["Target", "The interface the client expects (your port)"], ["Adaptee", "Existing class with a useful but incompatible interface"], ["Adapter", "Implements Target; converts calls, data formats, units and exceptions to and from the Adaptee"], ["Client", "Uses only Target"]],
      points: ["Prefer the object adapter: it works with any adaptee subclass and keeps the adaptee's API hidden", "An adapter should **translate**, not add business behaviour"] },
    impl: {
      title: "Java implementation: an object adapter for a payment SDK",
      text: "The adapter owns every translation: parameter names and shapes, units (rupees to paise, `long` to `int` with overflow check), status strings to an enum, and checked SDK exceptions to your own exception type. `CheckoutService` depends only on `PaymentGateway`, which also makes it trivial to test with a fake.",
      code: `record ChargeResult(String id, boolean success) {}
class PaymentException extends RuntimeException { PaymentException(String m, Throwable c) { super(m, c); } }
interface PaymentGateway { ChargeResult charge(long paise, String customerId); }       // target (your port)

class VendorSdk {                                                                     // adaptee
    Map<String, Object> createCharge(Map<String, Object> params) throws java.io.IOException {
        if ((int) params.get("amount_paise") <= 0) throw new java.io.IOException("invalid amount");
        return Map.of("id", "ch_" + params.get("customer"), "status", "succeeded");
    }
}

class VendorPaymentAdapter implements PaymentGateway {                               // adapter
    private final VendorSdk sdk;
    VendorPaymentAdapter(VendorSdk sdk) { this.sdk = sdk; }
    public ChargeResult charge(long paise, String customerId) {
        Map<String, Object> params = Map.of("amount_paise", Math.toIntExact(paise), "customer", customerId);   // shape + units
        try {
            Map<String, Object> r = sdk.createCharge(params);
            return new ChargeResult((String) r.get("id"), "succeeded".equals(r.get("status")));            // status mapping
        } catch (java.io.IOException e) {
            throw new PaymentException("vendor charge failed: " + e.getMessage(), e);                     // exception mapping
        }
    }
}

class CheckoutService {
    private final PaymentGateway gateway;
    CheckoutService(PaymentGateway g) { gateway = g; }
    String pay(long rupees, String customer) { return gateway.charge(rupees * 100, customer).id(); }
}

System.out.println(new CheckoutService(new VendorPaymentAdapter(new VendorSdk())).pay(499, "cust_1"));
try { new VendorPaymentAdapter(new VendorSdk()).charge(0, "x"); } catch (PaymentException e) { System.out.println(e.getMessage()); }` },
    variants: [
      { title: "Object adapter vs class adapter (and two-way adapters)",
        text: "Two GoF forms. In Java the **object adapter** (composition) is almost always the right one; know the class adapter for the interview question.",
        table: [
          ["", "Object adapter", "Class adapter"],
          ["Mechanism", "implements Target, **holds** an Adaptee", "**extends** Adaptee, implements Target"],
          ["Works with adaptee subclasses", "yes (any instance passed in)", "no (bound to one class)"],
          ["Can override adaptee behaviour", "no (only wraps)", "yes"],
          ["Exposes adaptee's public API", "no", "yes: callers can bypass the target"],
          ["Java constraint", "none", "adaptee must be a non-final class; target must be an interface"]],
        points: [
          "A **two-way adapter** implements both interfaces so each side can use it, useful during migrations between an old and a new API",
          "**Pluggable adapters**: lambdas and method references are tiny adapters: `Runnable r = service::refresh` adapts a method to `Runnable`"],
        code: `interface Celsius { double celsius(); }
class FahrenheitSensor { double readF() { return 98.6; } }                       // adaptee

class SensorObjectAdapter implements Celsius {                                     // object adapter
    private final FahrenheitSensor s;
    SensorObjectAdapter(FahrenheitSensor s) { this.s = s; }
    public double celsius() { return (s.readF() - 32) * 5 / 9; }
}
class SensorClassAdapter extends FahrenheitSensor implements Celsius {             // class adapter
    public double celsius() { return (readF() - 32) * 5 / 9; }
}

Celsius a = new SensorObjectAdapter(new FahrenheitSensor());
SensorClassAdapter b = new SensorClassAdapter();
System.out.printf("%.1f %.1f, class adapter leaks readF(): %.1f%n", a.celsius(), b.celsius(), b.readF());
Runnable pluggable = () -> System.out.println("lambda adapting a method to Runnable");
pluggable.run();` },
      { title: "Ports and adapters (hexagonal architecture)",
        text: "Adapter at architecture scale. The domain defines **ports** (interfaces it needs: `PaymentGateway`, `OrderRepository`, `Notifier`) and **adapters** implement them for real technologies (Stripe, Postgres, Twilio) or for tests (in-memory). The domain depends on nothing external, which is DIP (F02) applied with adapters.",
        points: [
          "Driven (secondary) adapters: domain → outside world (DB, payment, email)",
          "Driving (primary) adapters: outside world → domain (REST controller, CLI, message consumer)",
          "Swapping a vendor = writing a new adapter; tests use in-memory adapters",
          "In a machine-coding round: `interface Repository` + `InMemoryRepository` is the same idea"],
        m: M(["flowchart LR",
          "  REST[\"<b>REST controller</b><br/><span class='d'>driving adapter</span>\"] --> CORE",
          "  CLI[\"<b>CLI / tests</b>\"] --> CORE",
          "  CORE([\"<b>Domain core</b><br/><span class='d'>CheckoutService<br/>ports: PaymentGateway,<br/>OrderRepository</span>\"]):::s0",
          "  CORE --> PG[\"<b>StripeAdapter</b><br/><span class='d'>implements PaymentGateway</span>\"]:::s1",
          "  CORE --> DB[\"<b>JdbcOrderRepository</b><br/><span class='d'>implements OrderRepository</span>\"]:::s1",
          "  CORE --> MEM[\"<b>InMemoryOrderRepository</b><br/><span class='d'>for tests</span>\"]:::s2"]) }
    ],
    designs: [
      { title: "Mini LLD: one SMS interface over three vendors",
        text: "OTP and order SMS go through whichever vendor is cheapest or healthiest. Vendor A takes `send(phone, text)` and returns a boolean; vendor B takes a JSON body and returns an HTTP-style status code; vendor C is async and returns a `CompletableFuture<String>` message ID, needs `+91` stripped, and limits messages to 140 characters. Each gets an adapter to your `SmsSender`, and a failover sender tries them in order.",
        points: [
          "`SmsSender.send(Sms)` returns your `SendResult(vendor, messageId, ok)`; no vendor types leak",
          "Each adapter handles **its** quirks: number format, length limits, sync vs async, error codes",
          "`FailoverSmsSender` (itself a `SmsSender`, so a Composite/Decorator-like wrapper) tries adapters in order",
          "Adding vendor D: one adapter + one line in the list"],
        m: H.cd(["classDiagram",
          "  class SmsSender { <<interface>>; +send(Sms sms) SendResult }",
          "  class VendorAAdapter { -VendorAClient a }",
          "  class VendorBAdapter { -VendorBHttp b }",
          "  class VendorCAdapter { -VendorCAsync c }",
          "  class FailoverSmsSender { -List~SmsSender~ chain }",
          "  SmsSender <|.. VendorAAdapter", "  SmsSender <|.. VendorBAdapter", "  SmsSender <|.. VendorCAdapter", "  SmsSender <|.. FailoverSmsSender",
          "  FailoverSmsSender o-- SmsSender",
          "  VendorAAdapter --> VendorAClient", "  VendorBAdapter --> VendorBHttp", "  VendorCAdapter --> VendorCAsync"]),
        code: `record Sms(String phone, String text) {}
record SendResult(String vendor, String messageId, boolean ok) {}
interface SmsSender { SendResult send(Sms sms); }

class VendorAClient { boolean send(String phone, String text) { return !phone.endsWith("0"); } }
class VendorBHttp { int post(String json) { return json.contains("\\"to\\":\\"+9198") ? 202 : 500; } }
class VendorCAsync { CompletableFuture<String> submit(String msisdn, String body) { return CompletableFuture.completedFuture("c-" + msisdn.hashCode()); } }

class VendorAAdapter implements SmsSender {
    private final VendorAClient a = new VendorAClient();
    public SendResult send(Sms s) { boolean ok = a.send(s.phone(), s.text()); return new SendResult("A", ok ? "a-" + System.nanoTime() % 1000 : null, ok); }
}
class VendorBAdapter implements SmsSender {
    private final VendorBHttp b = new VendorBHttp();
    public SendResult send(Sms s) {
        String json = "{\\"to\\":\\"" + s.phone() + "\\",\\"msg\\":\\"" + s.text().replace("\\"", "'") + "\\"}";
        int code = b.post(json);
        return new SendResult("B", code == 202 ? "b-accepted" : null, code / 100 == 2);
    }
}
class VendorCAdapter implements SmsSender {
    private final VendorCAsync c = new VendorCAsync();
    public SendResult send(Sms s) {
        String msisdn = s.phone().replace("+91", "");                          // vendor wants a bare number
        String body = s.text().length() > 140 ? s.text().substring(0, 137) + "..." : s.text();
        try { return new SendResult("C", c.submit(msisdn, body).get(2, TimeUnit.SECONDS), true); }   // async -> sync
        catch (Exception e) { return new SendResult("C", null, false); }
    }
}
class FailoverSmsSender implements SmsSender {
    private final List<SmsSender> chain;
    FailoverSmsSender(List<SmsSender> chain) { this.chain = chain; }
    public SendResult send(Sms s) {
        for (SmsSender x : chain) { SendResult r = x.send(s); if (r.ok()) return r; }
        return new SendResult("none", null, false);
    }
}

SmsSender sms = new FailoverSmsSender(List.of(new VendorAAdapter(), new VendorBAdapter(), new VendorCAdapter()));
System.out.println(sms.send(new Sms("+919876543210", "Your OTP is 4821")));   // A fails (ends in 0), B accepts
System.out.println(sms.send(new Sms("+917000000001", "Order shipped")));       // A succeeds` },
      { title: "Mini LLD: wrapping a legacy inventory system",
        text: "A new order service needs `Inventory.available(sku): int` and `reserve(sku, qty)`. The 15-year-old warehouse system exposes `String query(String xmlRequest)` with stock levels per warehouse in XML, and reservations through a separate batch-style `submitHold(String csvLine)`. Rewrite is not an option this quarter. An adapter gives the new code a clean interface now and becomes the seam for replacing the legacy system later (the strangler-fig approach).",
        points: [
          "The adapter builds the XML request, parses the response, and **sums stock across warehouses**: data transformation is a legitimate adapter job",
          "Legacy errors (`<error>` elements) become a domain exception",
          "Keep business rules (\"don't sell the last unit online\") out of the adapter, in the service",
          "When the new inventory service ships, add `NewInventoryAdapter` (or implement `Inventory` directly) and switch in `main`"],
        code: `interface Inventory { int available(String sku); void reserve(String sku, int qty); }

class LegacyWarehouse {                                               // adaptee
    String query(String xml) {
        if (xml.contains("<sku>BAD</sku>")) return "<error>unknown sku</error>";
        return "<stock><wh id='BLR'>4</wh><wh id='PNQ'>7</wh></stock>";
    }
    void submitHold(String csv) { System.out.println("legacy hold: " + csv); }
}
class InventoryNotFound extends RuntimeException { InventoryNotFound(String m) { super(m); } }

class LegacyInventoryAdapter implements Inventory {
    private static final java.util.regex.Pattern WH = java.util.regex.Pattern.compile("<wh id='(\\\\w+)'>(\\\\d+)</wh>");
    private final LegacyWarehouse legacy;
    LegacyInventoryAdapter(LegacyWarehouse l) { legacy = l; }
    public int available(String sku) {
        String resp = legacy.query("<req><sku>" + sku + "</sku></req>");
        if (resp.startsWith("<error>")) throw new InventoryNotFound(sku);
        java.util.regex.Matcher m = WH.matcher(resp);
        int total = 0;
        while (m.find()) total += Integer.parseInt(m.group(2));      // sum across warehouses
        return total;
    }
    public void reserve(String sku, int qty) { legacy.submitHold(String.join(",", "HOLD", sku, String.valueOf(qty), "ONLINE")); }
}

Inventory inv = new LegacyInventoryAdapter(new LegacyWarehouse());
System.out.println("PEN available: " + inv.available("PEN"));
inv.reserve("PEN", 2);
try { inv.available("BAD"); } catch (InventoryNotFound e) { System.out.println("not found: " + e.getMessage()); }` }
    ],
    usages: [
      ["`java.io.InputStreamReader` / `OutputStreamWriter`", "Adapt a byte stream (`InputStream`) to the character-stream interface (`Reader`), decoding with a charset."],
      ["`Arrays.asList(array)`", "Adapts an array to the `List` interface (fixed-size view backed by the array)."],
      ["`Collections.enumeration(c)` / `Collections.list(e)`", "Adapt between the legacy `Enumeration` and modern `Collection`/`Iterator` worlds."],
      ["`java.util.concurrent.Executors.callable(Runnable)`", "Adapts a `Runnable` to a `Callable` that returns null (or a given result)."],
      ["Spring MVC `HandlerAdapter`", "`DispatcherServlet` calls every handler type (annotated controllers, `HttpRequestHandler`, functional endpoints) through a `HandlerAdapter` that knows how to invoke it."],
      ["Spring `MessageListenerAdapter`, `WebMvcConfigurer` (formerly `…Adapter`)", "Adapt a plain POJO method to a JMS/AMQP listener interface; adapters make framework interfaces convenient to implement."],
      ["SLF4J bridges (`jul-to-slf4j`, `log4j-over-slf4j`)", "Adapt other logging APIs to SLF4J so everything flows to one backend."]
    ],
    avoid: {
      points: [
        "You own both sides: change the interface instead of adapting it",
        "The \"adapter\" starts making business decisions; that logic belongs in a service",
        "Adapting a huge interface method by method when you only need two calls; define a small target for what you use (ISP)",
        "Stacking adapters on adapters (A→B→C); fix the boundary instead",
        "Adding behaviour like caching or retries: that's a Decorator or Proxy, even if it lives near the adapter"],
      pros: ["Reuse existing or third-party code without modifying it", "Keeps vendor and legacy types out of the domain (anti-corruption layer)", "Swap vendors by swapping adapters", "Makes testing easy (fake adapters)"],
      cons: ["One more class per adaptee", "Translation can hide performance costs (XML parsing, async-to-sync blocking)", "Leaky adapters (exposing vendor exceptions or IDs) lose most of the benefit", "Lowest-common-denominator targets may hide useful vendor features"] },
    compare: [
      ["Decorator (F11)", "Add responsibilities, **same** interface", "Adapter **changes** the interface; Decorator keeps it and adds behaviour"],
      ["Facade (F12)", "Simplify a **subsystem** of many classes", "Facade defines a new, simpler interface over many objects; Adapter makes one object fit an **existing** expected interface"],
      ["Proxy (F13)", "Control access to an object, **same** interface", "Proxy keeps the interface and adds access control/laziness/remoting"],
      ["Bridge (F15)", "Separate abstraction from implementation **up front**", "Bridge is designed in advance so both sides vary; Adapter is retrofitted to make existing things fit"],
      ["Anti-corruption layer (DDD)", "Protect your model from another system's model", "An ACL is usually built from adapters (plus translators/facades) at a system boundary"]],
    widget: { heading: "Interactive: which structural pattern?", caption: "Ten wrappers that look alike. Decide from intent whether each is an Adapter, Decorator, Facade, Proxy or Bridge. Your answers are saved.",
      render: H.widgets.picker({
        intro: "Structural patterns all wrap something, so the class diagrams look similar. Ask: **does the interface change?** (Adapter), **is behaviour added with the same interface?** (Decorator), **is access controlled?** (Proxy), **is a subsystem simplified?** (Facade), **are two hierarchies kept independent?** (Bridge).",
        question: "Which pattern?", noun: "Wrappers",
        options: ["Adapter", "Decorator", "Facade", "Proxy", "Bridge"],
        items: [
          { title: "Reader over a byte stream", code: "Reader r = new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8);", answer: "Adapter", why: "Converts the `InputStream` (bytes) interface into the `Reader` (chars) interface." },
          { title: "Buffered stream", code: "InputStream in = new BufferedInputStream(new FileInputStream(\"a.log\"));", answer: "Decorator", why: "Same `InputStream` interface, adds buffering." },
          { title: "Lazy image", code: "class LazyImage implements Image {\n    private RealImage real;\n    public void draw() { if (real == null) real = new RealImage(path); real.draw(); }\n}", answer: "Proxy", why: "Same interface, controls *when* the real object is created (virtual proxy)." },
          { title: "One-call checkout", code: "class CheckoutFacade {\n    Receipt checkout(Cart c) {\n        inventory.reserve(c); long t = pricing.total(c);\n        payment.charge(t); shipping.schedule(c); return receipts.issue(c, t);\n    }\n}", answer: "Facade", why: "A simple entry point over a subsystem of five services." },
          { title: "Shapes × renderers", code: "abstract class Shape { protected final Renderer renderer; abstract void draw(); }\nclass Circle extends Shape { void draw() { renderer.circle(x, y, r); } }\ninterface Renderer { void circle(int x, int y, int r); }   // SvgRenderer, CanvasRenderer", answer: "Bridge", why: "Shape hierarchy and renderer hierarchy vary independently, linked by composition." },
          { title: "SDK behind your interface", code: "class StripeGateway implements PaymentGateway {\n    public ChargeResult charge(long paise, String c) {\n        return map(stripe.paymentIntents().create(params(paise, c)));\n    }\n}", answer: "Adapter", why: "Translates your `PaymentGateway` calls to a vendor API with a different shape." },
          { title: "Retrying gateway", code: "class RetryingGateway implements PaymentGateway {\n    private final PaymentGateway inner;\n    public ChargeResult charge(long p, String c) { /* try inner up to 3 times */ }\n}", answer: "Decorator", why: "Same interface, wraps another implementation and adds retries." },
          { title: "Authorisation check", code: "class SecuredAccounts implements Accounts {\n    public void close(String id) {\n        if (!user.hasRole(\"ADMIN\")) throw new SecurityException();\n        real.close(id);\n    }\n}", answer: "Proxy", why: "Same interface, controls access (protection proxy)." },
          { title: "Arrays.asList", code: "String[] arr = {\"a\", \"b\"};\nList<String> list = Arrays.asList(arr);   // a List view over the array", answer: "Adapter", why: "Presents an array through the `List` interface." },
          { title: "Home-theatre start", code: "class HomeTheater {\n    void watch(String movie) { lights.dim(30); screen.down(); projector.on(); amp.setVolume(5); player.play(movie); }\n}", answer: "Facade", why: "One simple method coordinating many subsystem objects." }
        ]
      }) },
    pitfalls: [
      "Putting business logic or policy decisions inside the adapter",
      "Leaking adaptee types (vendor exceptions, DTOs, IDs) through the target interface",
      "Using a class adapter, which exposes the adaptee's whole API and binds to one class",
      "Designing the target as a copy of the vendor API: then it's not your port, it's their interface",
      "Blocking on async vendor APIs without timeouts in a sync adapter",
      "Confusing Adapter (changes interface) with Decorator/Proxy (same interface)",
      "One giant adapter for a whole vendor SDK instead of small adapters per port",
      "Forgetting unit conversions (paise vs rupees, seconds vs millis, time zones)"
    ],
    quiz: [
      { q: "What is Adapter's intent?", options: ["Add behaviour to an object", "Convert one interface into another that clients expect", "Simplify a subsystem", "Control access"], answer: 1, why: "Make incompatible interfaces work together." },
      { q: "Why is the object adapter usually preferred in Java?", options: ["It's faster", "It uses composition, works with any adaptee subclass and doesn't expose the adaptee's API; the class adapter needs inheritance from a concrete class", "Class adapters can't compile", "It allows multiple inheritance"], answer: 1, why: "Composition over inheritance again." },
      { q: "`new InputStreamReader(in, UTF_8)` is…", options: ["A Decorator", "An Adapter from bytes (`InputStream`) to characters (`Reader`)", "A Proxy", "A Facade"], answer: 1, why: "The interface changes from `InputStream` to `Reader`." },
      { q: "Where should a rule like \"don't sell the last unit online\" live?", options: ["In the inventory adapter", "In the domain service that uses the `Inventory` port", "In the vendor SDK", "In the controller"], answer: 1, why: "Adapters translate; services decide." },
      { q: "In hexagonal architecture, a `JdbcOrderRepository implements OrderRepository` is…", options: ["A port", "A (driven) adapter", "A facade", "A domain entity"], answer: 1, why: "The domain owns the port; the adapter implements it for a technology." },
      { q: "Adapter vs Facade: the key difference is…", options: ["None", "Adapter makes one object conform to an **existing** interface; Facade defines a **new simpler** interface over many objects", "Facade changes interfaces of one class", "Adapter always wraps many classes"], answer: 1, why: "Conform vs simplify." },
      { q: "Spring MVC's `HandlerAdapter` exists so that…", options: ["Controllers can be proxied", "`DispatcherServlet` can invoke different handler types through one interface", "Views are cached", "Beans are singletons"], answer: 1, why: "Each handler style gets an adapter that knows how to call it." },
      { q: "An adapter that also caches vendor responses is mixing in which pattern's responsibility?", options: ["Facade", "Decorator / Proxy (caching with the same interface)", "Builder", "Singleton"], answer: 1, why: "Keep translation and caching separate: an adapter, then a caching decorator around it." }
    ],
    cheatsheet: {
      table: [
        ["Part", "Role", "Example"],
        ["Target", "your interface (port)", "`PaymentGateway`, `SmsSender`, `Inventory`"],
        ["Adaptee", "existing/vendor/legacy class", "`VendorSdk`, `LegacyWarehouse`"],
        ["Adapter", "implements Target, holds Adaptee, translates", "`VendorPaymentAdapter`"],
        ["Translations", "names, shapes, units, status codes, exceptions, sync/async", "rupees→paise, `IOException`→`PaymentException`"]],
      cards: [
        { title: "Use when", items: ["Third-party SDK behind your port", "Legacy system with a different API", "Several vendors, one interface", "Tests need fakes for external systems"] },
        { title: "Keep it thin", items: ["Translate, don't decide", "No vendor types in the target", "Small targets (ISP)", "Map every error"] },
        { title: "JDK/Spring", items: ["`InputStreamReader`", "`Arrays.asList`", "`Collections.list/enumeration`", "`Executors.callable`", "`HandlerAdapter`"] }]
    },
    practice: [
      { level: "Easy", q: "Define Adapter, name its four participants, and give two JDK examples.",
        a: ["Adapter converts the interface of an existing class into the interface a client expects.",
          "Participants: **Target** (expected interface), **Adaptee** (existing class), **Adapter** (implements Target, wraps Adaptee), **Client** (uses Target).",
          "JDK: `InputStreamReader` (bytes → chars), `Arrays.asList` (array → `List`), `Collections.list(Enumeration)`, `Executors.callable(Runnable)`."] },
      { level: "Easy", q: "Your code expects `interface Logger { void log(Level l, String msg); }`. A library offers `LegacyLog` with `info(String)`, `warn(String)` and `error(String, Throwable)`. Write the adapter.",
        code: `enum Level { INFO, WARN, ERROR }
interface Logger { void log(Level l, String msg); }
class LegacyLog {
    void info(String m) { System.out.println("I " + m); }
    void warn(String m) { System.out.println("W " + m); }
    void error(String m, Throwable t) { System.out.println("E " + m + (t == null ? "" : " " + t)); }
}
class LegacyLogAdapter implements Logger {
    private final LegacyLog legacy;
    LegacyLogAdapter(LegacyLog l) { legacy = l; }
    public void log(Level l, String msg) {
        switch (l) {
            case INFO -> legacy.info(msg);
            case WARN -> legacy.warn(msg);
            case ERROR -> legacy.error(msg, null);
        }
    }
}

Logger log = new LegacyLogAdapter(new LegacyLog());
log.log(Level.WARN, "disk 85% full");
log.log(Level.ERROR, "payment failed");` },
      { level: "Medium", q: "A map provider returns distances in miles and durations as `\"1h 25m\"` strings; your `RouteService` needs kilometres and a `Duration`. Write an adapter and a test-friendly fake.",
        code: `record Route(double km, Duration eta) {}
interface RouteService { Route route(String from, String to); }

class MilesMapsApi { Map<String, String> directions(String a, String b) { return Map.of("distance_mi", "12.4", "duration", "1h 25m"); } }

class MilesMapsAdapter implements RouteService {
    private final MilesMapsApi api;
    MilesMapsAdapter(MilesMapsApi api) { this.api = api; }
    public Route route(String from, String to) {
        Map<String, String> r = api.directions(from, to);
        double km = Double.parseDouble(r.get("distance_mi")) * 1.609344;
        return new Route(Math.round(km * 10) / 10.0, parse(r.get("duration")));
    }
    static Duration parse(String s) {
        Duration d = Duration.ZERO;
        for (String part : s.split(" ")) {
            long n = Long.parseLong(part.substring(0, part.length() - 1));
            d = part.endsWith("h") ? d.plusHours(n) : d.plusMinutes(n);
        }
        return d;
    }
}
class FakeRouteService implements RouteService {                // for tests: no network
    public Route route(String f, String t) { return new Route(10, Duration.ofMinutes(20)); }
}

System.out.println(new MilesMapsAdapter(new MilesMapsApi()).route("Koramangala", "Whitefield"));
System.out.println(new FakeRouteService().route("a", "b"));` },
      { level: "Medium", q: "You're migrating from `OldCache` (`get(key): Object`, `put(key, val, ttlSeconds)`) to a new `Cache<K,V>` interface. Old and new code must both work during the migration. Write a **two-way adapter**.",
        code: `class OldCache {
    private final Map<String, Object> m = new HashMap<>();
    Object get(String k) { return m.get(k); }
    void put(String k, Object v, int ttlSeconds) { m.put(k, v); }
}
interface Cache<K, V> { Optional<V> find(K key); void store(K key, V value, Duration ttl); }

class TwoWayCacheAdapter extends OldCache implements Cache<String, String> {   // usable as both
    private final OldCache backing;
    TwoWayCacheAdapter(OldCache backing) { this.backing = backing; }
    // new API -> old store
    public Optional<String> find(String k) { return Optional.ofNullable((String) backing.get(k)); }
    public void store(String k, String v, Duration ttl) { backing.put(k, v, (int) ttl.toSeconds()); }
    // old API -> same store
    @Override Object get(String k) { return backing.get(k); }
    @Override void put(String k, Object v, int ttl) { backing.put(k, v, ttl); }
}

TwoWayCacheAdapter c = new TwoWayCacheAdapter(new OldCache());
OldCache legacyView = c; Cache<String, String> newView = c;
legacyView.put("user:1", "Asha", 60);
System.out.println(newView.find("user:1").orElse("miss"));
newView.store("user:2", "Ravi", Duration.ofMinutes(5));
System.out.println(legacyView.get("user:2"));`,
        follow: "Why extend `OldCache` here when we usually prefer object adapters? Old callers take an `OldCache` parameter (a class, not an interface), so the adapter must *be* one. Once callers migrate, delete the adapter." },
      { level: "Medium", q: "The interviewer says: \"We'll switch from Razorpay to Stripe next year.\" How does Adapter shape your payment design? Draw it and list what changes on switch day.",
        a: ["Define the port in **your** terms: `PaymentGateway.createIntent(Money, OrderId)`, `capture`, `refund`, `parseWebhook(body, signature)`, returning your types (`PaymentIntent`, `PaymentEvent`).",
          "`RazorpayAdapter` and later `StripeAdapter` implement it; each maps amounts, statuses, errors, and webhook payloads.",
          "Switch day: add `StripeAdapter`, change wiring in `main`/config, run the shared contract test suite against it. No domain code changes.",
          "Write a **contract test** (one abstract test class) that every adapter must pass; that's what makes the swap safe."],
        m: H.cd(["classDiagram", "  direction LR",
          "  class PaymentGateway { <<interface>>; +createIntent(Money m, String orderId) PaymentIntent; +refund(String paymentId, Money m) Refund; +parseWebhook(String body, String sig) PaymentEvent }",
          "  class CheckoutService { -PaymentGateway gateway }",
          "  CheckoutService --> PaymentGateway",
          "  PaymentGateway <|.. RazorpayAdapter",
          "  PaymentGateway <|.. StripeAdapter",
          "  PaymentGateway <|.. FakeGateway",
          "  RazorpayAdapter --> RazorpaySdk",
          "  StripeAdapter --> StripeSdk"]) },
      { level: "Hard", q: "Adapt a **callback-based** async API (`fetch(url, onSuccess, onError)`) to a `CompletableFuture`-based interface, and adapt `CompletableFuture` back to a blocking call with a timeout.",
        code: `interface Callback<T> { void ok(T value); void fail(Exception e); }
class CallbackHttp {                                        // adaptee
    void fetch(String url, Callback<String> cb) {
        new Thread(() -> { if (url.contains("bad")) cb.fail(new java.io.IOException("404")); else cb.ok("body of " + url); }).start();
    }
}
interface AsyncHttp { CompletableFuture<String> get(String url); }

class FutureHttpAdapter implements AsyncHttp {
    private final CallbackHttp http;
    FutureHttpAdapter(CallbackHttp h) { http = h; }
    public CompletableFuture<String> get(String url) {
        CompletableFuture<String> f = new CompletableFuture<>();
        http.fetch(url, new Callback<>() {
            public void ok(String v) { f.complete(v); }
            public void fail(Exception e) { f.completeExceptionally(e); }
        });
        return f;
    }
}
interface BlockingHttp { String get(String url) throws Exception; }
class BlockingAdapter implements BlockingHttp {
    private final AsyncHttp async; private final Duration timeout;
    BlockingAdapter(AsyncHttp a, Duration t) { async = a; timeout = t; }
    public String get(String url) throws Exception {
        try { return async.get(url).get(timeout.toMillis(), TimeUnit.MILLISECONDS); }
        catch (ExecutionException e) { throw (Exception) e.getCause(); }       // unwrap for callers
    }
}

AsyncHttp async = new FutureHttpAdapter(new CallbackHttp());
System.out.println(async.get("https://a.in/x").thenApply(String::toUpperCase).join());
BlockingHttp sync = new BlockingAdapter(async, Duration.ofSeconds(1));
try { sync.get("https://a.in/bad"); } catch (java.io.IOException e) { System.out.println("unwrapped: " + e.getMessage()); }` },
      { level: "Hard", q: "Design an **anti-corruption layer** for integrating with a partner's order system whose model is very different (orders are \"tickets\" with free-text statuses like \"Dispatched-Partial\", amounts as strings with currency symbols, and customer data embedded). What goes in it, and how do you test it?",
        a: ["**Adapter** for the transport (their REST/SOAP client) behind your `PartnerOrders` port.",
          "**Translator** classes mapping their model to yours: status text → your `OrderStatus` enum (with an explicit `UNKNOWN` + alert for new strings), `\"₹1,299.00\"` → `Money`, embedded customer → your `CustomerRef`.",
          "Optional **Facade** for multi-call workflows (fetch ticket + lines + shipments → one `Order`).",
          "Your domain never sees their types; their model changes break only the ACL.",
          "Test with recorded partner payloads (golden files) through the translators, plus a contract test for the port. Log and count unknown statuses instead of crashing."],
        m: M(["flowchart LR",
          "  P[\"<b>Partner API</b><br/><span class='d'>tickets, free-text status</span>\"] --> AD[\"<b>PartnerClientAdapter</b>\"]:::s1",
          "  AD --> TR[\"<b>Translators</b><br/><span class='d'>status, money, customer</span>\"]:::s1",
          "  TR --> PORT([\"<b>PartnerOrders port</b>\"]):::s0",
          "  PORT --> DOM[\"<b>Your domain</b><br/><span class='d'>Order, OrderStatus, Money</span>\"]:::s2"]) },
      { level: "Hard", q: "Adapter, Facade and Decorator all \"wrap\" things. In one design for a notification module, show where each would appear and why.",
        a: ["**Adapter**: `TwilioSmsAdapter implements SmsSender` and `SesEmailAdapter implements EmailSender`, translating vendor APIs to your ports.",
          "**Decorator**: `RetryingSender`, `RateLimitedSender` and `LoggingSender` wrap any `SmsSender` with the *same* interface to add behaviour.",
          "**Facade**: `NotificationFacade.notifyOrderShipped(order)` picks templates, resolves user preferences, and calls the right senders: one simple call over the subsystem.",
          "Stack: Facade → (Decorators → Adapter → vendor). Each layer has one job, and each can be tested alone."] }
    ],
    recap: [
      "Adapter = make an existing class fit the interface your code expects, by translating calls, shapes, units and errors.",
      "Prefer object adapters (composition); class adapters expose the adaptee and bind to one class.",
      "Define the target in your own terms (a port); adapters keep vendor and legacy types out of the domain. That's hexagonal architecture and anti-corruption layers.",
      "JDK/Spring: `InputStreamReader`, `Arrays.asList`, `Collections.list`, `Executors.callable`, `HandlerAdapter`, logging bridges.",
      "Adapter changes the interface; Decorator and Proxy keep it; Facade simplifies many objects; Bridge is planned separation. Keep adapters thin: translate, don't decide."
    ]
  });
})();
