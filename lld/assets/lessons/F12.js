/* Lesson F12: Facade */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  H.pattern({
    code: "F12", name: "Facade",
    summary: "Facade gives a simple, unified entry point to a complex subsystem of many classes. This lesson covers the classic structure, a checkout facade over inventory, pricing, payment and shipping, a booking facade with compensation (undo on failure), facades vs service layers vs API gateways, JDK and Spring usages (`JdbcTemplate`, `RestTemplate`, SLF4J), how to keep a facade from becoming a god class, and how Facade differs from Adapter, Mediator and Proxy.",
    intent: "Provide a **unified, higher-level interface** to a set of interfaces in a subsystem. The facade makes the subsystem easier to use for the common case, without hiding it from clients that need the details.",
    problem: {
      text: "Placing an order touches five services in the right order: reserve stock, price the cart (with coupons and tax), charge the payment, book a courier, and send a receipt. Every caller (web controller, mobile API, admin tool) repeats that choreography, including the error handling, and every caller breaks when one step changes.",
      points: [
        "Clients are coupled to **many** subsystem classes and their call order",
        "Workflow and error handling are duplicated across callers",
        "A **facade** owns the common workflow behind one method: `checkout(cart, user)`",
        "Subsystem classes stay public: power users can still call them directly"],
      code: `// Every controller repeats this choreography (and its bugs):
class WebController {
    String placeOrder(String user, List<String> skus) {
        System.out.println("inventory.reserve " + skus);
        long total = skus.size() * 499L;
        System.out.println("pricing total=" + total);
        System.out.println("payment.charge " + user + " " + total);
        System.out.println("shipping.book");
        System.out.println("email.receipt " + user);
        return "ORD-1";
    }
}
// ...and MobileController, AdminController copy it with small differences.
System.out.println(new WebController().placeOrder("asha", List.of("PEN", "INK")));` },
    analogy: "A hotel concierge. You say \"book me dinner and a cab at 8\". The concierge calls the restaurant, the taxi firm and the front desk in the right order. You can still phone the restaurant yourself if you want, but most guests don't need to.",
    structure: {
      text: "The **Facade** knows which subsystem classes handle a request and delegates to them in the right order. **Subsystem classes** do the real work and don't know the facade exists. **Clients** call the facade for the common path. There's no shared interface between facade and subsystem: the facade defines a **new, simpler** one.",
      m: H.cd(["classDiagram",
        "  class Client",
        "  class CheckoutFacade { +checkout(Cart cart, String user) Receipt }",
        "  class Inventory { +reserve(Cart c) String; +release(String holdId) }",
        "  class Pricing { +total(Cart c) long }",
        "  class Payments { +charge(String user, long paise) String; +refund(String paymentId) }",
        "  class Shipping { +book(Cart c) String }",
        "  class Notifier { +receipt(String user, Receipt r) }",
        "  Client --> CheckoutFacade",
        "  CheckoutFacade --> Inventory", "  CheckoutFacade --> Pricing", "  CheckoutFacade --> Payments",
        "  CheckoutFacade --> Shipping", "  CheckoutFacade --> Notifier"]),
      roles: [["Facade", "Simple entry point; knows the workflow and which subsystem class does what"], ["Subsystem classes", "Do the actual work; unaware of the facade; still usable directly"], ["Client", "Uses the facade for the common case"], ["(Optional) additional facades", "Split by use case so no single facade grows into a god class"]],
      points: ["A facade **adds no new capability**: everything it does, a client could do by calling the subsystem", "Facades are usually stateless and often a single instance per subsystem"] },
    impl: {
      title: "Java implementation: a checkout facade with compensation",
      text: "The facade runs the steps in order and **compensates** if a later step fails: release the stock hold if payment fails, refund if shipping can't be booked. That rollback logic is exactly what callers used to duplicate (and get wrong). Subsystem classes are injected, so the facade is easy to test with fakes.",
      code: `record Cart(String user, Map<String, Integer> items) {}
record Receipt(String orderId, long paise, String paymentId, String awb) {}
class CheckoutFailed extends RuntimeException { CheckoutFailed(String m) { super(m); } }

class Inventory {
    String reserve(Cart c) { System.out.println("  reserve " + c.items()); return "hold-7"; }
    void release(String hold) { System.out.println("  release " + hold); }
}
class Pricing { long total(Cart c) { return c.items().values().stream().mapToLong(q -> q * 49_900L).sum(); } }
class Payments {
    String charge(String user, long paise) {
        if (user.equals("broke")) throw new IllegalStateException("card declined");
        System.out.println("  charge " + paise); return "pay-" + user;
    }
    void refund(String id) { System.out.println("  refund " + id); }
}
class Shipping { String book(Cart c) { System.out.println("  book courier"); return "AWB123"; } }
class Notifier { void receipt(String user, Receipt r) { System.out.println("  email " + user + " " + r.orderId()); } }

class CheckoutFacade {
    private final Inventory inv; private final Pricing pricing; private final Payments pay; private final Shipping ship; private final Notifier notify;
    CheckoutFacade(Inventory i, Pricing p, Payments pa, Shipping s, Notifier n) { inv = i; pricing = p; pay = pa; ship = s; notify = n; }

    Receipt checkout(Cart cart) {
        String hold = inv.reserve(cart);
        long total = pricing.total(cart);
        String paymentId;
        try { paymentId = pay.charge(cart.user(), total); }
        catch (RuntimeException e) { inv.release(hold); throw new CheckoutFailed("payment: " + e.getMessage()); }   // compensate
        String awb;
        try { awb = ship.book(cart); }
        catch (RuntimeException e) { pay.refund(paymentId); inv.release(hold); throw new CheckoutFailed("shipping: " + e.getMessage()); }
        Receipt r = new Receipt("ORD-" + Math.abs(hold.hashCode() % 1000), total, paymentId, awb);
        notify.receipt(cart.user(), r);                       // best-effort: a failed email shouldn't undo the order
        return r;
    }
}

CheckoutFacade shop = new CheckoutFacade(new Inventory(), new Pricing(), new Payments(), new Shipping(), new Notifier());
System.out.println(shop.checkout(new Cart("asha", Map.of("PEN", 2))));
try { shop.checkout(new Cart("broke", Map.of("PEN", 1))); } catch (CheckoutFailed e) { System.out.println("failed -> " + e.getMessage()); }` },
    variants: [
      { title: "Facade vs service layer vs API gateway",
        text: "The same idea shows up at three scales. Knowing the names helps you talk about it in HLD and LLD rounds without confusion.",
        table: [
          ["", "Facade (GoF)", "Application service layer", "API gateway / BFF"],
          ["Scale", "classes in one process", "use-case classes over the domain", "network edge over many microservices"],
          ["Example", "`CheckoutFacade.checkout(cart)`", "`OrderService.placeOrder(cmd)`", "`/mobile/home` aggregating 4 services"],
          ["Adds", "simplified entry point", "transactions, security, orchestration", "routing, auth, rate limits, aggregation"],
          ["Risk", "god class", "anaemic domain / fat services", "a distributed monolith at the edge"]],
        points: [
          "In practice, a Spring `@Service` that orchestrates several repositories and clients for one use case **is** a facade",
          "**Backend-for-frontend (BFF)**: one facade per client type (web, mobile), so each gets the shape it needs",
          "Split facades **by use case** (`CheckoutFacade`, `ReturnsFacade`), not one `ShopFacade` with 40 methods"] },
      { title: "Keeping facades thin (and not god classes)",
        text: "A facade should **coordinate**, not **compute**. Pricing rules belong in `Pricing`, stock rules in `Inventory`. If the facade starts accumulating `if` branches about business rules, push them down into the subsystem or into a domain object.",
        bad: `class ShopFacade {                         // grows forever
    Receipt checkout(Cart c) { ... }
    void applyCoupon(...) { /* 60 lines of coupon rules */ }
    void returnItem(...) { ... }
    void exportGstReport(...) { ... }
    void recalcLoyaltyTier(...) { ... }
}`,
        good: `class CheckoutFacade { Receipt checkout(Cart c) { ... } }        // one use case
class ReturnsFacade  { Refund startReturn(String orderId, String sku) { ... } }
class Pricing { long total(Cart c) { /* coupon rules live here */ } }`,
        points: [
          "Signs of a god facade: many unrelated methods, business rules inside, every team edits it",
          "Facades can be **layered**: a `CheckoutFacade` may call a `PaymentsFacade` that hides PSP details",
          "Don't force clients through the facade; the subsystem stays available (unlike an encapsulating wrapper)"] }
    ],
    designs: [
      { title: "Mini LLD: a notification facade",
        text: "Product teams want to write `notifications.orderShipped(order)` and nothing else. Behind it: user preferences (channels, quiet hours), a template engine, per-channel senders (SMS, email, push), and an audit log. The facade resolves *who, what, which channel*, then delegates. Each piece stays independently testable and reusable.",
        points: [
          "`NotificationFacade` exposes **use-case methods** (`orderShipped`, `otp`), not a generic `send(Map)`",
          "Preferences decide channels; quiet hours suppress non-critical messages (OTP is critical and always sent)",
          "Senders are adapters (F10) behind a `ChannelSender` interface, so the facade never sees vendor SDKs",
          "Audit is a side concern; it could also be a decorator (F11) around each sender"],
        m: H.cd(["classDiagram",
          "  class NotificationFacade { +orderShipped(String user, String orderId); +otp(String user, String code) }",
          "  class Preferences { +channelsFor(String user) List~Channel~; +inQuietHours(String user) boolean }",
          "  class Templates { +render(String key, Map vars) String }",
          "  class ChannelSender { <<interface>>; +channel() Channel; +send(String user, String text) }",
          "  class AuditLog { +record(String user, Channel c, String key) }",
          "  NotificationFacade --> Preferences", "  NotificationFacade --> Templates",
          "  NotificationFacade --> ChannelSender", "  NotificationFacade --> AuditLog",
          "  ChannelSender <|.. SmsSender", "  ChannelSender <|.. EmailSender", "  ChannelSender <|.. PushSender"]),
        code: `enum Channel { SMS, EMAIL, PUSH }
interface ChannelSender { Channel channel(); void send(String user, String text); }
record Sender(Channel channel) implements ChannelSender {
    public void send(String user, String text) { System.out.println("  [" + channel + "] " + user + ": " + text); }
}
class Preferences {
    List<Channel> channelsFor(String user) { return user.equals("ravi") ? List.of(Channel.PUSH) : List.of(Channel.SMS, Channel.EMAIL); }
    boolean inQuietHours(String user) { return user.equals("ravi"); }
}
class Templates {
    private final Map<String, String> t = Map.of("shipped", "Order {id} is on its way", "otp", "Your OTP is {code}");
    String render(String key, Map<String, String> vars) {
        String s = t.get(key);
        for (var e : vars.entrySet()) s = s.replace("{" + e.getKey() + "}", e.getValue());
        return s;
    }
}
class AuditLog { final List<String> rows = new ArrayList<>(); void record(String u, Channel c, String k) { rows.add(u + "/" + c + "/" + k); } }

class NotificationFacade {
    private final Preferences prefs; private final Templates templates; private final Map<Channel, ChannelSender> senders = new EnumMap<>(Channel.class); private final AuditLog audit;
    NotificationFacade(Preferences p, Templates t, List<ChannelSender> s, AuditLog a) { prefs = p; templates = t; audit = a; s.forEach(x -> senders.put(x.channel(), x)); }

    void orderShipped(String user, String orderId) { deliver(user, "shipped", Map.of("id", orderId), false); }
    void otp(String user, String code) { deliver(user, "otp", Map.of("code", code), true); }

    private void deliver(String user, String key, Map<String, String> vars, boolean critical) {
        if (!critical && prefs.inQuietHours(user)) { System.out.println("  (quiet hours, deferred) " + user + " " + key); return; }
        List<Channel> chans = critical ? List.of(Channel.SMS) : prefs.channelsFor(user);
        String text = templates.render(key, vars);
        for (Channel c : chans) { senders.get(c).send(user, text); audit.record(user, c, key); }
    }
}

AuditLog audit = new AuditLog();
NotificationFacade n = new NotificationFacade(new Preferences(), new Templates(),
        List.of(new Sender(Channel.SMS), new Sender(Channel.EMAIL), new Sender(Channel.PUSH)), audit);
n.orderShipped("asha", "ORD-42");
n.orderShipped("ravi", "ORD-43");
n.otp("ravi", "9135");
System.out.println(audit.rows);` },
      { title: "Mini LLD: a video upload facade",
        text: "A creator uploads a video. Behind the scenes: virus scan, store the original in blob storage, transcode to 1080p/720p/480p, generate thumbnails, extract captions, then publish to the catalogue and warm the CDN. The upload API calls one facade method; the facade returns a `VideoId` and status. In a real system the heavy steps would be async jobs, so the facade **kicks off a pipeline** and returns immediately.",
        points: [
          "Facade method: `VideoId upload(InputStream data, UploadMeta meta)`; status queried with `status(VideoId)`",
          "Synchronous part (fast, must succeed): scan + store original + create catalogue entry in `PROCESSING`",
          "Asynchronous part (slow): transcode, thumbnails, captions; each job updates the catalogue entry; when all finish, mark `LIVE`",
          "Clients don't know about the transcoder, queue, or CDN; the subsystem can change (FFmpeg → cloud transcoder) without touching callers",
          "Interview follow-up: \"what if transcode of 480p fails?\" Retry the job; publish with available renditions; alert after N failures"],
        m: M(["sequenceDiagram",
          "  participant C as UploadController",
          "  participant F as VideoFacade",
          "  participant S as Scanner",
          "  participant B as BlobStore",
          "  participant K as Catalogue",
          "  participant Q as JobQueue",
          "  C->>F: upload(data, meta)",
          "  F->>S: scan(data)",
          "  F->>B: put(original)",
          "  F->>K: create(id, PROCESSING)",
          "  F->>Q: enqueue transcode, thumbs, captions",
          "  F-->>C: VideoId (202 Accepted)",
          "  Q-->>K: each job marks its rendition ready",
          "  K-->>K: all ready, status LIVE"]) }
    ],
    usages: [
      ["`java.net.URL.openStream()`", "`URL.openStream()` hides `URLConnection`, protocol handlers, sockets and streams behind one call."],
      ["`java.nio.file.Files`", "`Files.readString(path)`, `Files.copy`, `Files.walk`: static facade methods over channels, file-system providers and attributes."],
      ["`java.net.http.HttpClient`", "`client.send(request, BodyHandlers.ofString())` hides connection pooling, HTTP/2 negotiation, TLS and body decoding."],
      ["Spring `JdbcTemplate`", "One call (`query`, `update`) over connection, statement, result set, exception translation and resource cleanup."],
      ["Spring `RestTemplate` / `RestClient`, `JmsTemplate`, `KafkaTemplate`", "Template classes are facades over verbose client APIs (plus Template Method for the callback hooks)."],
      ["SLF4J `LoggerFactory` / `Logger`", "A simple logging facade over Logback, Log4j2 or JUL (the name says it: Simple Logging **Facade** for Java)."],
      ["Spring Boot `SpringApplication.run(...)`", "One line that sets up the environment, context, auto-configuration, embedded server and listeners."]
    ],
    avoid: {
      points: [
        "The subsystem is already simple (one or two classes): a facade is just an extra hop",
        "Different clients need genuinely different workflows; one facade with many flags is worse than several small ones",
        "You're tempted to put business rules in it: push them into the domain or subsystem classes",
        "You need to **change** an interface to fit an existing one: that's Adapter",
        "Components need to talk **to each other** through a hub: that's Mediator"],
      pros: ["Decouples clients from subsystem internals and call order", "One place for the common workflow and its error handling", "Easier onboarding: a small API for the 90% case", "Subsystem can be refactored behind it"],
      cons: ["Can grow into a god class that every team edits", "Another layer of indirection to debug", "May hide useful subsystem options; keep the subsystem accessible", "Tempting to add logic that belongs elsewhere"] },
    compare: [
      ["Adapter (F10)", "Make one object fit an **existing** interface", "Adapter conforms to a target someone else defined; Facade **invents a simpler** interface over many objects"],
      ["Mediator (F24)", "Centralise communication **between** colleagues", "In Mediator, colleagues know the mediator and talk through it; in Facade, subsystem classes don't know the facade exists (one-way)"],
      ["Proxy (F13)", "Control access, **same** interface as one subject", "Facade has a different, simpler interface and fronts many classes"],
      ["Decorator (F11)", "Add behaviour, same interface", "Decorator wraps one object of the same type; Facade wraps a subsystem"],
      ["Abstract Factory (F07)", "Create families of objects", "Often used **with** a facade to create subsystem objects in a platform-independent way"]],
    widget: { heading: "Interactive: facade or something else?", caption: "Eight snippets that put a class in front of other classes. Decide from intent which pattern each one is. Your answers are saved.",
      render: H.widgets.picker({
        intro: "Ask: does it **simplify many classes** behind a new interface (Facade)? **Translate** one interface to an expected one (Adapter)? **Route messages between peers** that know it (Mediator)? Keep the **same interface** and add behaviour (Decorator)? Or is it a **god class** full of business rules?",
        question: "Which is it?", noun: "Snippets",
        options: ["Facade", "Adapter", "Mediator", "Decorator", "God class (smell)"],
        items: [
          { title: "Start a movie", code: "class HomeTheater {\n    void watch(String film) { lights.dim(); screen.down(); amp.on(); amp.volume(5); player.play(film); }\n}", answer: "Facade", why: "One simple method over several subsystem objects, which don't know `HomeTheater` exists." },
          { title: "Chat room", code: "class ChatRoom {\n    void send(User from, String msg) { users.stream().filter(u -> u != from).forEach(u -> u.receive(msg)); }\n}\nclass User { ChatRoom room; void say(String m) { room.send(this, m); } }", answer: "Mediator", why: "Colleagues (`User`) know the hub and talk to each other **through** it. That two-way relationship is Mediator, not Facade." },
          { title: "Vendor SDK behind a port", code: "class S3BlobStore implements BlobStore {\n    public void put(String key, byte[] b) { s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).build(), RequestBody.fromBytes(b)); }\n}", answer: "Adapter", why: "Implements an existing `BlobStore` interface by translating to the S3 API." },
          { title: "JdbcTemplate call", code: "List<User> users = jdbc.query(\"select * from users where city = ?\", userMapper, \"Pune\");", answer: "Facade", why: "One call hides connection handling, statements, result sets, exception translation and cleanup." },
          { title: "Timed repository", code: "class TimedRepo implements OrderRepo {\n    private final OrderRepo inner;\n    public Order find(String id) { long t = System.nanoTime(); try { return inner.find(id); } finally { metrics.record(t); } }\n}", answer: "Decorator", why: "Same interface, adds timing around one wrapped object." },
          { title: "Everything shop", code: "class ShopManager {\n    void checkout(...)  { /* 80 lines */ }\n    void applyCoupon(...) { /* coupon rules */ }\n    void gstReport(...)   { /* SQL here */ }\n    void loyaltyTier(...) { /* tier rules */ }\n    // 35 more methods\n}", answer: "God class (smell)", why: "Unrelated responsibilities and business rules in one class. Split into use-case facades and push rules into the domain." },
          { title: "Read a file", code: "String text = Files.readString(Path.of(\"notes.txt\"));", answer: "Facade", why: "`Files` offers one-line operations over channels, providers, charsets and buffers." },
          { title: "Air-traffic control", code: "class Tower {\n    void requestLanding(Plane p) { if (runwayFree()) { p.land(); others(p).forEach(Plane::hold); } }\n}\nclass Plane { Tower tower; void approach() { tower.requestLanding(this); } }", answer: "Mediator", why: "Planes coordinate with each other via the tower and know it. Facade's subsystem classes would not know the facade." }
        ]
      }) },
    pitfalls: [
      "Turning the facade into a god class with unrelated use cases and business rules",
      "Hiding the subsystem completely so advanced clients can't reach options they need",
      "Forgetting compensation: a multi-step facade that leaves stock held after a payment failure",
      "Making notifications or analytics failures roll back the main operation (they should be best-effort or async)",
      "Calling it Facade when it's really Mediator (peers that talk through it) or Adapter (conforming to an existing interface)",
      "A facade per class (thin pass-through wrappers) that adds hops without simplifying anything",
      "Creating subsystem objects inside the facade with `new`, which makes it untestable; inject them",
      "Long synchronous chains in one request when slow steps should be async jobs"
    ],
    quiz: [
      { q: "What is Facade's intent?", options: ["Convert an interface", "Provide a simple, unified interface to a complex subsystem", "Control access to an object", "Add behaviour dynamically"], answer: 1, why: "Simplify the common path through many classes." },
      { q: "Do subsystem classes know about the facade?", options: ["Yes, they call back into it", "No: the dependency is one-way, facade to subsystem", "Only in Java", "Only when it's a singleton"], answer: 1, why: "If they did, and talked through it, it would be a Mediator." },
      { q: "Can clients still call subsystem classes directly?", options: ["Never", "Yes: a facade simplifies the common case but doesn't forbid direct access", "Only via reflection", "Only in tests"], answer: 1, why: "GoF facades are a convenience, not an enforced boundary." },
      { q: "Payment succeeded but courier booking failed inside `checkout()`. The facade should…", options: ["Ignore it", "Compensate: refund the payment and release the stock hold, then report failure", "Retry forever", "Throw and leave things as they are"], answer: 1, why: "Owning the workflow means owning its rollback too." },
      { q: "Which is a facade?", options: ["`BufferedReader`", "Spring `JdbcTemplate`", "`Collections.unmodifiableList`", "`InputStreamReader`"], answer: 1, why: "It hides connection, statement, result set and cleanup. The others are decorator, proxy-like view, and adapter." },
      { q: "Facade vs Mediator: the main difference is…", options: ["Facade is creational", "Facade is one-way (clients → facade → subsystem); in Mediator colleagues know the mediator and communicate through it", "Mediator has a simpler interface", "No difference"], answer: 1, why: "Direction of knowledge." },
      { q: "A `ShopFacade` has 45 methods and coupon logic. The fix is…", options: ["Make it a singleton", "Split it into use-case facades and move rules into domain/subsystem classes", "Add an interface", "Make methods static"], answer: 1, why: "Facades coordinate; they shouldn't own business rules." },
      { q: "SLF4J is best described as…", options: ["An adapter only", "A logging facade (with bindings that adapt to concrete loggers)", "A proxy", "A builder"], answer: 1, why: "Simple Logging Facade for Java; its bindings/bridges are adapters." }
    ],
    cheatsheet: {
      table: [
        ["Aspect", "Facade"],
        ["Intent", "simplify a subsystem for the common case"],
        ["Interface", "new, higher-level (not the subsystem's)"],
        ["Knowledge", "facade → subsystem, one-way"],
        ["Owns", "call order, compensation, wiring"],
        ["Doesn't own", "business rules (those live in the subsystem/domain)"]],
      cards: [
        { title: "Use when", items: ["Many classes for one common task", "Callers duplicate a workflow", "You want a seam to refactor a subsystem", "Layering: one facade per layer"] },
        { title: "Watch out", items: ["God class", "Business rules creeping in", "Missing compensation", "Sync chain of slow steps"] },
        { title: "JDK/Spring", items: ["`Files`, `URL.openStream`", "`HttpClient`", "`JdbcTemplate`, `RestClient`", "SLF4J", "`SpringApplication.run`"] }]
    },
    practice: [
      { level: "Easy", q: "Define Facade and give two JDK/Spring examples. How is it different from Adapter in one sentence?",
        a: ["Facade provides a simple, unified interface over a complex subsystem of many classes, for the common case.",
          "Examples: `java.nio.file.Files`, `HttpClient`, Spring `JdbcTemplate`, SLF4J.",
          "Adapter makes one object conform to an **existing** interface; Facade **defines a new, simpler** interface over many objects."] },
      { level: "Easy", q: "Write a `HomeTheaterFacade` with `watchMovie(title)` and `endMovie()` over `Lights`, `Screen`, `Projector`, `Amplifier` and `Player`.",
        code: `class Lights { void dim(int pct) { System.out.println("lights " + pct + "%"); } }
class Screen { void down() { System.out.println("screen down"); } void up() { System.out.println("screen up"); } }
class Projector { void on() { System.out.println("projector on"); } void off() { System.out.println("projector off"); } }
class Amplifier { void on() { System.out.println("amp on"); } void volume(int v) { System.out.println("volume " + v); } void off() { System.out.println("amp off"); } }
class Player { void play(String t) { System.out.println("playing " + t); } void stop() { System.out.println("stop"); } }

class HomeTheaterFacade {
    private final Lights l = new Lights(); private final Screen s = new Screen(); private final Projector p = new Projector();
    private final Amplifier a = new Amplifier(); private final Player pl = new Player();
    void watchMovie(String title) { l.dim(20); s.down(); p.on(); a.on(); a.volume(6); pl.play(title); }
    void endMovie() { pl.stop(); a.off(); p.off(); s.up(); l.dim(100); }        // reverse order
}

HomeTheaterFacade ht = new HomeTheaterFacade();
ht.watchMovie("Sholay");
ht.endMovie();`,
        follow: "For production code, inject the five devices through the constructor so tests can pass fakes." },
      { level: "Medium", q: "Design a `TripBookingFacade.book(trip)` that books a flight, a hotel and a cab. If the hotel fails, cancel the flight; if the cab fails, keep flight and hotel but report a partial booking. Write it.",
        code: `record Trip(String user, String city) {}
record Booking(String flight, String hotel, String cab, boolean partial) {}
class Flights { String book(Trip t) { return "FL-" + t.city(); } void cancel(String id) { System.out.println("cancel " + id); } }
class Hotels { String book(Trip t) { if (t.city().equals("Leh")) throw new IllegalStateException("no rooms"); return "HT-" + t.city(); } }
class Cabs { String book(Trip t) { if (t.city().equals("Goa")) throw new IllegalStateException("no cabs"); return "CB-" + t.city(); } }

class TripBookingFacade {
    private final Flights f = new Flights(); private final Hotels h = new Hotels(); private final Cabs c = new Cabs();
    Booking book(Trip t) {
        String fl = f.book(t);
        String ht;
        try { ht = h.book(t); }
        catch (RuntimeException e) { f.cancel(fl); throw new IllegalStateException("trip failed: " + e.getMessage()); }   // essential step: compensate
        try { return new Booking(fl, ht, c.book(t), false); }
        catch (RuntimeException e) { return new Booking(fl, ht, null, true); }                                          // optional step: degrade
    }
}

TripBookingFacade tb = new TripBookingFacade();
System.out.println(tb.book(new Trip("asha", "Jaipur")));
System.out.println(tb.book(new Trip("asha", "Goa")));
try { tb.book(new Trip("asha", "Leh")); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }`,
        follow: "Across real services this becomes a **saga**: each step has a compensating action, and an orchestrator (the facade) drives them. Mention idempotency keys so retries don't double-book." },
      { level: "Medium", q: "Your team's `OrderFacade` has grown to 38 methods. How do you refactor it without breaking callers?",
        a: ["Group methods by use case (checkout, returns, invoices, admin); create `CheckoutFacade`, `ReturnsFacade`, etc.",
          "Move business rules found inside the facade down into domain or subsystem classes (`Pricing`, `ReturnPolicy`).",
          "Keep `OrderFacade` temporarily as a thin delegator to the new facades, marked `@Deprecated`, so callers migrate gradually.",
          "Add tests around each new facade first (characterisation tests on the old one help).",
          "Remove the old facade once callers have moved. This is the strangler approach applied at class level."] },
      { level: "Medium", q: "Draw a facade for a \"smart home: good night\" scene: lock doors, turn off lights except the porch, set AC to 26°C, arm the alarm, and send a summary push. Which steps are critical, and what happens if one fails?",
        a: ["`SmartHomeFacade.goodNight()` calls `Locks.lockAll()`, `Lights.offExcept(\"porch\")`, `Climate.set(26)`, `Alarm.arm()`, `Notifier.push(summary)`.",
          "Critical: locks and alarm. If a lock fails, **don't arm** (alarm would trigger on an open door); push an alert instead.",
          "Non-critical: lights, AC, push. Log and include in the summary but continue.",
          "Return a `SceneResult` listing each step's outcome; the facade owns this policy, devices don't."],
        m: H.cd(["classDiagram",
          "  class SmartHomeFacade { +goodNight() SceneResult }",
          "  class Locks { +lockAll() boolean }",
          "  class Lights { +offExcept(String zone) }",
          "  class Climate { +set(int celsius) }",
          "  class Alarm { +arm() }",
          "  class Notifier { +push(String msg) }",
          "  SmartHomeFacade --> Locks", "  SmartHomeFacade --> Lights", "  SmartHomeFacade --> Climate",
          "  SmartHomeFacade --> Alarm", "  SmartHomeFacade --> Notifier"]) },
      { level: "Medium", q: "Is a Spring `@Service` that orchestrates three repositories and two HTTP clients a facade? What makes it a good or bad one?",
        a: ["Yes: an application service exposing use-case methods over several collaborators is a facade.",
          "Good: one use case per method, transaction boundaries (`@Transactional`) at the facade, collaborators injected, rules delegated to domain objects.",
          "Bad: queries, pricing rules and HTTP payload mapping all inline; dozens of unrelated methods; called by other services' internals (cyclic dependencies).",
          "Keep external HTTP calls out of DB transactions (or use an outbox) so a slow vendor doesn't hold DB locks."] },
      { level: "Hard", q: "Design a `PaymentsFacade` that hides three PSPs (Razorpay, Stripe, PayU) from the checkout team. Which patterns combine with Facade here?",
        a: ["**Facade**: `PaymentsFacade.pay(order, method)` and `refund(paymentId, amount)`, the only API checkout sees.",
          "**Adapter** (F10): one adapter per PSP implementing your `PaymentGateway` port.",
          "**Strategy** (F17): routing strategy chooses the PSP (by method, success rate, cost, or a feature flag).",
          "**Decorator** (F11): retries with idempotency keys, timeouts, metrics around each gateway.",
          "**Factory** (F06): build the configured gateways from config.",
          "Inside the facade: create a `PaymentAttempt`, choose PSP, call, persist result, and fall back to the next PSP on retriable errors only (never after an ambiguous timeout without checking status first)."],
        m: H.cd(["classDiagram", "  direction LR",
          "  class PaymentsFacade { +pay(Order o, Method m) PaymentResult; +refund(String paymentId, long paise) }",
          "  class RoutingStrategy { <<interface>>; +choose(Order o, Method m) List~PaymentGateway~ }",
          "  class PaymentGateway { <<interface>>; +charge(long paise, String key) ChargeResult }",
          "  PaymentsFacade --> RoutingStrategy",
          "  PaymentsFacade --> PaymentGateway",
          "  PaymentGateway <|.. RazorpayAdapter", "  PaymentGateway <|.. StripeAdapter", "  PaymentGateway <|.. RetryingGateway",
          "  RetryingGateway o-- PaymentGateway"]) },
      { level: "Hard", q: "The facade's `checkout()` now takes 3 s because shipping and email are slow. Redesign so the API returns quickly without losing reliability.",
        a: ["Keep the **must-succeed** steps synchronous: reserve stock, charge payment, persist the order (one local transaction for the DB part).",
          "Write an **outbox** row (`OrderPlaced`) in the same DB transaction; a relay publishes it to a queue.",
          "Shipping booking and receipt email become **consumers** of `OrderPlaced`, with retries and idempotency (keyed by order ID).",
          "The facade returns `202`/order ID immediately; status is queried or pushed later.",
          "Facade still owns the workflow definition; it just hands slow, retryable steps to async workers. Mention monitoring of stuck orders (a sweeper job)."] }
    ],
    recap: [
      "Facade = one simple, use-case-shaped entry point over a complex subsystem; the subsystem doesn't know it exists.",
      "It coordinates call order, wiring and compensation; it should not hold business rules.",
      "Split facades by use case to avoid god classes; inject subsystem classes for testability.",
      "JDK/Spring: `Files`, `HttpClient`, `JdbcTemplate`, `RestClient`, SLF4J, `SpringApplication.run`.",
      "Facade invents a simpler interface (vs Adapter conforming to one); one-way knowledge (vs Mediator); many objects (vs Proxy/Decorator wrapping one)."
    ]
  });
})();
