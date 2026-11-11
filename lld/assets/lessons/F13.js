/* Lesson F13: Proxy */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  H.pattern({
    code: "F13", name: "Proxy",
    summary: "Proxy provides a stand-in for another object to control access to it. This lesson covers the proxy kinds (virtual, protection, remote, caching, smart reference), static proxies, JDK dynamic proxies and CGLIB/ByteBuddy subclass proxies, how Spring AOP uses proxies for `@Transactional`, `@Cacheable` and `@Async` (and the self-invocation trap that's a classic interview question), Hibernate lazy-loading proxies, a caching proxy for a rate-limited API, a protection proxy for documents, and how Proxy differs from Decorator, Adapter and Facade.",
    intent: "Provide a **surrogate or placeholder** for another object to **control access** to it. The proxy has the same interface as the real subject, so clients can't tell them apart.",
    problem: {
      text: "A `ReportService.generate(id)` call is expensive (30 s of SQL), the external exchange-rate API allows 100 calls a day, the high-resolution product image takes 2 s to load but most pages never display it, and only admins may delete accounts. In each case the client should keep calling the **same interface**; *something in between* decides whether, when and how the real object is reached.",
      points: [
        "**Virtual proxy**: create the expensive object only when first needed (lazy loading)",
        "**Protection proxy**: check permissions before forwarding",
        "**Remote proxy**: make a remote object look local (RMI stubs, gRPC/Feign clients)",
        "**Caching proxy**: return a stored result instead of calling again",
        "**Smart reference**: count references, log, lock, or meter each call"],
      code: `interface Image { void draw(); }
class HiResImage implements Image {
    private final String file;
    HiResImage(String file) { this.file = file; System.out.println("loading " + file + " (2 s)"); }   // expensive constructor
    public void draw() { System.out.println("draw " + file); }
}
// Every product card creates every image up front, even if it's never drawn:
List<Image> gallery = List.of(new HiResImage("a.jpg"), new HiResImage("b.jpg"), new HiResImage("c.jpg"));
gallery.get(0).draw();` },
    analogy: "A cheque (or a UPI handle) is a proxy for money in your bank account. Shops accept it wherever they'd accept cash (same interface), but the bank checks your balance and authorisation before any money moves. A personal assistant who screens your calls is a protection proxy too.",
    structure: {
      text: "**Subject** is the shared interface. **RealSubject** does the work. **Proxy** implements Subject, holds (or knows how to obtain) a RealSubject, and adds control around forwarding. Clients depend only on Subject. Unlike Decorator, a proxy usually **manages the real object's lifecycle or access**, and is often created by a framework rather than composed by the client.",
      m: H.cd(["classDiagram",
        "  class Client",
        "  class Image { <<interface>>; +draw() }",
        "  class HiResImage { -String file; +draw() }",
        "  class LazyImageProxy { -String file; -HiResImage real; +draw() }",
        "  Client --> Image",
        "  Image <|.. HiResImage",
        "  Image <|.. LazyImageProxy",
        "  LazyImageProxy --> HiResImage : creates on first use"]),
      roles: [["Subject", "Interface shared by proxy and real object"], ["RealSubject", "The object that does the real work"], ["Proxy", "Same interface; controls access, creation, location or caching, then delegates"], ["Client", "Uses Subject; unaware whether it holds a proxy"]],
      points: ["Same interface is what makes proxies transparent", "Proxies can be hand-written (static) or generated at runtime (dynamic)"] },
    impl: {
      title: "Java implementation: virtual and protection proxies",
      text: "`LazyImageProxy` defers the expensive constructor until `draw()` is first called. `SecuredAccounts` checks the caller's role before forwarding. Both implement the same interface as the real object, so the gallery and the admin screen don't change.",
      code: `interface Image { void draw(); }
class HiResImage implements Image {
    private final String file;
    HiResImage(String file) { this.file = file; System.out.println("  loading " + file); }
    public void draw() { System.out.println("  draw " + file); }
}
class LazyImageProxy implements Image {                       // virtual proxy
    private final String file; private HiResImage real;
    LazyImageProxy(String file) { this.file = file; }
    public void draw() { if (real == null) real = new HiResImage(file); real.draw(); }
}

interface Accounts { void close(String id); }
class AccountStore implements Accounts { public void close(String id) { System.out.println("  closed " + id); } }
record User(String name, Set<String> roles) {}
class SecuredAccounts implements Accounts {                    // protection proxy
    private final Accounts real; private final java.util.function.Supplier<User> current;
    SecuredAccounts(Accounts real, java.util.function.Supplier<User> current) { this.real = real; this.current = current; }
    public void close(String id) {
        if (!current.get().roles().contains("ADMIN")) throw new SecurityException(current.get().name() + " may not close accounts");
        real.close(id);
    }
}

List<Image> gallery = List.of(new LazyImageProxy("a.jpg"), new LazyImageProxy("b.jpg"), new LazyImageProxy("c.jpg"));
System.out.println("gallery built, nothing loaded yet");
gallery.get(0).draw(); gallery.get(0).draw();                  // loads once

User[] who = { new User("ravi", Set.of("SUPPORT")) };
Accounts acc = new SecuredAccounts(new AccountStore(), () -> who[0]);
try { acc.close("AC-9"); } catch (SecurityException e) { System.out.println("  denied: " + e.getMessage()); }
who[0] = new User("meera", Set.of("ADMIN"));
acc.close("AC-9");` },
    variants: [
      { title: "Dynamic proxies: JDK `Proxy` vs subclass proxies (CGLIB / ByteBuddy)",
        text: "Hand-writing a proxy per interface doesn't scale when you want the same control (timing, caching, transactions) on hundreds of classes. Java can **generate** proxies at runtime. `java.lang.reflect.Proxy` creates a class that implements given **interfaces** and routes every call to an `InvocationHandler`. Libraries like CGLIB or ByteBuddy generate a **subclass** instead, so they also work for classes without interfaces.",
        table: [
          ["", "JDK dynamic proxy", "Subclass proxy (CGLIB/ByteBuddy)"],
          ["Requires", "an interface", "a non-final class with an accessible constructor"],
          ["Can intercept", "interface methods only", "non-final, non-private methods"],
          ["Cast to the concrete class", "fails (`ClassCastException`)", "works (it *is* a subclass)"],
          ["Spring default", "used if `proxyTargetClass=false` and an interface exists", "Spring Boot default (`proxyTargetClass=true`)"]],
        points: [
          "`final` classes or methods, and `private` methods, can't be intercepted by subclass proxies",
          "Both forward to the target **object**; calls the target makes on `this` bypass the proxy (see next slide)",
          "Dynamic proxies are how Mockito mocks, Feign/Retrofit clients and Spring Data repositories work"],
        code: `interface PriceService { long price(String sku); }
class DbPriceService implements PriceService {
    public long price(String sku) { try { Thread.sleep(20); } catch (InterruptedException e) { } return sku.length() * 100L; }
}
@SuppressWarnings("unchecked")
static <T> T caching(Class<T> iface, T target) {
    Map<String, Object> cache = new HashMap<>();
    return (T) java.lang.reflect.Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[]{iface}, (proxy, m, args) -> {
        String key = m.getName() + Arrays.toString(args);
        if (cache.containsKey(key)) { System.out.println("  hit  " + key); return cache.get(key); }
        Object v = m.invoke(target, args);
        System.out.println("  miss " + key); cache.put(key, v); return v;
    });
}

PriceService p = caching(PriceService.class, new DbPriceService());
System.out.println(p.price("PEN") + " " + p.price("PEN") + " " + p.price("NOTEBOOK"));
System.out.println("proxy class: " + p.getClass().getSimpleName().startsWith("$Proxy"));
try { DbPriceService d = (DbPriceService) (Object) p; } catch (ClassCastException e) { System.out.println("can't cast a JDK proxy to the concrete class"); }` },
      { title: "Spring AOP proxies and the self-invocation trap",
        text: "`@Transactional`, `@Cacheable`, `@Async`, `@Retryable` and `@PreAuthorize` all work because Spring injects a **proxy** instead of your bean. The proxy starts the transaction (or checks the cache) and then calls your object. But when your object calls **its own** annotated method via `this`, the call never passes through the proxy, so the annotation silently does nothing. This is one of the most frequently asked Spring questions.",
        m: M(["sequenceDiagram",
          "  participant C as Controller",
          "  participant P as OrderService proxy",
          "  participant T as OrderService target",
          "  C->>P: placeOrder()",
          "  Note over P: no annotation on placeOrder",
          "  P->>T: placeOrder()",
          "  T->>T: this.saveWithAudit()",
          "  Note over T: @Transactional ignored, the call never reached the proxy"]),
        bad: `@Service
class OrderService {
    public void placeOrder(Order o) {
        validate(o);
        saveWithAudit(o);           // this.saveWithAudit(): bypasses the proxy, NO transaction
    }
    @Transactional
    public void saveWithAudit(Order o) { orders.save(o); audit.save(o); }
}`,
        good: `@Service
class OrderService {
    private final OrderPersistence persistence;     // separate bean -> call goes through its proxy
    public void placeOrder(Order o) { validate(o); persistence.saveWithAudit(o); }
}
@Service
class OrderPersistence {
    @Transactional public void saveWithAudit(Order o) { orders.save(o); audit.save(o); }
}`,
        points: [
          "Fixes: move the method to another bean (cleanest), annotate the outer public method, or (rarely) inject the bean's own proxy / use `AopContext.currentProxy()`",
          "Also ignored: annotations on `private` methods, and on `final` methods with subclass proxies",
          "`@Transactional` on a method called from a constructor or `@PostConstruct` won't run in a transaction either",
          "AspectJ compile-time or load-time weaving avoids the trap because it modifies the class itself instead of proxying"] }
    ],
    designs: [
      { title: "Mini LLD: caching + quota proxy for an exchange-rate API",
        text: "The finance dashboard calls `RateService.rate(\"USD\", \"INR\")` hundreds of times a minute; the vendor allows 100 calls/day and rates only change every few minutes. A `CachingRateProxy` serves cached values for a TTL, collapses requests per currency pair, enforces the daily quota, and serves a **stale** value (flagged) when the quota is exhausted rather than failing the page.",
        points: [
          "Same `RateService` interface, so the dashboard and tests are unchanged",
          "Cache entry = value + fetchedAt; fresh if `now - fetchedAt < ttl`",
          "Quota counter resets daily; when exhausted, return stale data with `stale=true`, or fail if nothing is cached",
          "Clock is injected so the TTL is testable",
          "Concurrency: in production use `ConcurrentHashMap.compute` (or a `Caffeine` loading cache) so 50 concurrent misses make one vendor call"],
        m: H.cd(["classDiagram",
          "  class RateService { <<interface>>; +rate(String from, String to) Rate }",
          "  class VendorRateClient { +rate(String from, String to) Rate }",
          "  class CachingRateProxy { -RateService vendor; -Map cache; -Duration ttl; -int quotaLeft; -Clock clock; +rate(String from, String to) Rate }",
          "  class Rate { <<record>>; double value; Instant at; boolean stale }",
          "  RateService <|.. VendorRateClient",
          "  RateService <|.. CachingRateProxy",
          "  CachingRateProxy --> RateService : vendor",
          "  CachingRateProxy ..> Rate"]),
        code: `record Rate(double value, long at, boolean stale) {}
interface RateService { Rate rate(String from, String to); }
class VendorRateClient implements RateService {
    int calls = 0; long now = 0;
    public Rate rate(String f, String t) { calls++; return new Rate(83.0 + calls / 10.0, now, false); }
}
class QuotaExceeded extends RuntimeException { QuotaExceeded() { super("daily quota used up and nothing cached"); } }

class CachingRateProxy implements RateService {
    private final RateService vendor; private final long ttl; private final java.util.function.LongSupplier clock;
    private final Map<String, Rate> cache = new HashMap<>(); private int quotaLeft;
    CachingRateProxy(RateService v, long ttlSeconds, int quota, java.util.function.LongSupplier clock) { vendor = v; ttl = ttlSeconds; quotaLeft = quota; this.clock = clock; }
    public Rate rate(String f, String t) {
        String key = f + t; Rate c = cache.get(key); long now = clock.getAsLong();
        if (c != null && now - c.at() < ttl) return c;                           // fresh hit
        if (quotaLeft == 0) {
            if (c == null) throw new QuotaExceeded();
            return new Rate(c.value(), c.at(), true);                               // stale but useful
        }
        quotaLeft--;
        Rate r = new Rate(vendor.rate(f, t).value(), now, false);
        cache.put(key, r); return r;
    }
}

long[] clock = {0};
VendorRateClient vendor = new VendorRateClient();
RateService rates = new CachingRateProxy(vendor, 300, 2, () -> clock[0]);
System.out.println(rates.rate("USD", "INR") + " " + rates.rate("USD", "INR"));      // one vendor call
clock[0] = 400; System.out.println(rates.rate("USD", "INR"));                     // expired -> second call
clock[0] = 800; System.out.println(rates.rate("USD", "INR"));                     // quota gone -> stale
try { rates.rate("EUR", "INR"); } catch (QuotaExceeded e) { System.out.println(e.getMessage()); }
System.out.println("vendor calls: " + vendor.calls);` },
      { title: "Mini LLD: protection proxy for shared documents",
        text: "A Google-Docs-like service: `Document` has `read()`, `edit(text)`, `share(user, role)` and `delete()`. Roles are `VIEWER`, `COMMENTER`, `EDITOR`, `OWNER`. Instead of sprinkling permission checks into `DocumentImpl`, a `DocumentAccessProxy` is created per (user, document) by a factory and checks a permission table before forwarding. The real document stays focused on content.",
        points: [
          "Permission matrix lives in one place: `Map<Role, Set<Op>>` (or a policy object)",
          "The proxy is created by `DocumentService.open(docId, user)`; callers never get the raw `DocumentImpl`",
          "Denials throw `AccessDenied` with the op and role, and are audited",
          "Alternative in Spring: method security (`@PreAuthorize`) is the same idea, implemented by an AOP proxy",
          "Keep the check **in the proxy**, not the UI: hidden buttons are not security"],
        code: `enum Role { VIEWER, COMMENTER, EDITOR, OWNER }
enum Op { READ, COMMENT, EDIT, SHARE, DELETE }
interface Document { String read(); void edit(String t); void share(String user, Role r); void delete(); }
class DocumentImpl implements Document {
    private final StringBuilder body = new StringBuilder("Q3 plan"); final Map<String, Role> acl = new HashMap<>(Map.of("asha", Role.OWNER));
    public String read() { return body.toString(); }
    public void edit(String t) { body.append(" | ").append(t); }
    public void share(String u, Role r) { acl.put(u, r); }
    public void delete() { body.setLength(0); }
}
class AccessDenied extends RuntimeException { AccessDenied(String m) { super(m); } }

class DocumentAccessProxy implements Document {
    private static final Map<Role, Set<Op>> ALLOWED = Map.of(
        Role.VIEWER, EnumSet.of(Op.READ), Role.COMMENTER, EnumSet.of(Op.READ, Op.COMMENT),
        Role.EDITOR, EnumSet.of(Op.READ, Op.COMMENT, Op.EDIT), Role.OWNER, EnumSet.allOf(Op.class));
    private final DocumentImpl real; private final String user;
    DocumentAccessProxy(DocumentImpl real, String user) { this.real = real; this.user = user; }
    private void check(Op op) {
        Role r = real.acl.get(user);
        if (r == null || !ALLOWED.get(r).contains(op)) throw new AccessDenied(user + " (" + r + ") cannot " + op);
    }
    public String read() { check(Op.READ); return real.read(); }
    public void edit(String t) { check(Op.EDIT); real.edit(t); }
    public void share(String u, Role r) { check(Op.SHARE); real.share(u, r); }
    public void delete() { check(Op.DELETE); real.delete(); }
}

DocumentImpl doc = new DocumentImpl();
Document asOwner = new DocumentAccessProxy(doc, "asha"), asRavi = new DocumentAccessProxy(doc, "ravi");
asOwner.share("ravi", Role.VIEWER);
System.out.println(asRavi.read());
try { asRavi.edit("hack"); } catch (AccessDenied e) { System.out.println(e.getMessage()); }
asOwner.share("ravi", Role.EDITOR); asRavi.edit("add hiring");
System.out.println(asOwner.read());
try { asRavi.delete(); } catch (AccessDenied e) { System.out.println(e.getMessage()); }` }
    ],
    usages: [
      ["`java.lang.reflect.Proxy` + `InvocationHandler`", "Runtime-generated proxies for interfaces; the basis of many frameworks."],
      ["Spring AOP (`@Transactional`, `@Cacheable`, `@Async`, `@PreAuthorize`)", "Beans are wrapped in JDK or CGLIB proxies that begin transactions, check caches, hand off to executors, or check permissions."],
      ["Spring `@Configuration` classes", "CGLIB-proxied so calling a `@Bean` method twice returns the same singleton."],
      ["Hibernate / JPA lazy loading", "`getReference()` and lazy `@ManyToOne` return a subclass proxy that loads the row on first access (virtual proxy). Touching it after the session closes gives `LazyInitializationException`."],
      ["Spring Data repositories, Feign, Retrofit", "You declare an interface; the framework generates a proxy that turns calls into queries or HTTP requests (remote proxy)."],
      ["Java RMI stubs, gRPC client stubs", "Local objects that marshal calls over the network to a remote implementation."],
      ["`Collections.unmodifiableList` / `synchronizedList`", "Wrappers that control access to the same `List` interface (protection and synchronisation)."],
      ["Mockito mocks and spies", "Generated proxies (subclasses) that record and stub calls."]
    ],
    avoid: {
      points: [
        "The object is cheap and always used: a lazy proxy only adds a null check and complexity",
        "You're adding general behaviour the client composes (compression, retries): that's Decorator in spirit, even if the shape is the same",
        "Hidden network calls behind a local-looking interface in hot loops (remote proxies hide latency: N+1 calls)",
        "Security checks only in a proxy that some code paths bypass (internal calls via `this`, or direct access to the real object)",
        "Generated proxies for `final` classes or methods: they can't intercept them"],
      pros: ["Control access without changing the real class or clients", "Lazy creation saves memory and startup time", "Caching and quota protection for expensive or limited resources", "Frameworks add cross-cutting concerns declaratively"],
      cons: ["Extra indirection and harder debugging (stack traces through `$Proxy12`, `CGLIB$$`)", "Self-invocation and `final` methods silently bypass proxies", "Remote proxies hide latency and partial failure", "Identity and `equals` surprises (proxy vs target, Hibernate proxy class names)"] },
    compare: [
      ["Decorator (F11)", "Add behaviour; client composes the stack", "Same shape. Proxy **controls access/lifecycle** of its subject, usually decided by the system (often generated); Decorator **adds features** and is stacked by the client"],
      ["Adapter (F10)", "Change the interface", "A proxy keeps exactly the same interface"],
      ["Facade (F12)", "Simplify many classes", "Facade has a new interface over a subsystem; a proxy fronts one object with the same interface"],
      ["Flyweight (F16)", "Share many fine-grained objects", "A flyweight factory caches **instances**; a caching proxy caches **results** of calls"],
      ["Interceptor / AOP aspect", "Cross-cutting concerns", "Aspects are typically **implemented** with proxies; the advice is the handler logic"]],
    widget: { heading: "Interactive: which kind of proxy?", caption: "Eight proxies from real systems. Name the kind of control each adds. Your answers are saved.",
      render: H.widgets.picker({
        intro: "All of these implement the same interface as the real object. Ask what the proxy is **controlling**: *when* the object is created (virtual), *who* may call it (protection), *where* it lives (remote), *whether* to call it at all because a result is stored (caching), or *bookkeeping* around each call (smart reference: counting, locking, logging, metering).",
        question: "Which kind?", noun: "Proxies",
        options: ["Virtual", "Protection", "Remote", "Caching", "Smart reference"],
        items: [
          { title: "Hibernate lazy association", code: "Order o = em.find(Order.class, 7L);\nCustomer c = o.getCustomer();      // a Customer$HibernateProxy; no SQL yet\nc.getName();                        // now it selects the customer row", answer: "Virtual", why: "The real entity is loaded only on first use." },
          { title: "Feign client", code: "@FeignClient(\"inventory\")\ninterface InventoryClient { @GetMapping(\"/stock/{sku}\") int stock(@PathVariable String sku); }\n\nint n = inventoryClient.stock(\"PEN\");   // HTTP call", answer: "Remote", why: "A local interface whose generated proxy performs an HTTP call to another service." },
          { title: "@PreAuthorize", code: "@PreAuthorize(\"hasRole('ADMIN')\")\npublic void deleteUser(String id) { ... }", answer: "Protection", why: "Spring's method-security proxy checks the caller's authorities before invoking the method." },
          { title: "@Cacheable", code: "@Cacheable(\"products\")\npublic Product find(String sku) { return repo.load(sku); }", answer: "Caching", why: "The proxy returns a cached value for the same key and skips the method." },
          { title: "Reference-counted connection", code: "class PooledConnection implements Connection {\n    public void close() { pool.giveBack(real); }    // don't really close\n    // other methods forward to real, after checking not returned\n}", answer: "Smart reference", why: "It manages the real connection's lifecycle (return to pool, guard against use after close). Pool libraries such as HikariCP use proxy connections like this." },
          { title: "Thumbnail placeholder", code: "class VideoPreview implements Media {\n    public void play() { if (video == null) video = Video.decode(path); video.play(); }\n    public String title() { return title; }   // answered without loading\n}", answer: "Virtual", why: "Cheap metadata answered directly; the expensive decode happens on first `play()`." },
          { title: "gRPC stub", code: "PaymentGrpc.PaymentBlockingStub stub = PaymentGrpc.newBlockingStub(channel);\nChargeReply r = stub.charge(ChargeRequest.newBuilder().setPaise(49900).build());", answer: "Remote", why: "The stub marshals the call over the network to a server-side implementation." },
          { title: "Synchronised list", code: "List<String> safe = Collections.synchronizedList(new ArrayList<>());\nsafe.add(\"x\");   // locks a mutex, then calls the real add", answer: "Smart reference", why: "Same `List` interface; adds locking around every call to the real list." }
        ]
      }) },
    pitfalls: [
      "Self-invocation: calling an `@Transactional`/`@Cacheable`/`@Async` method via `this` bypasses the Spring proxy",
      "Annotating `private` or `final` methods, which proxies can't intercept",
      "Casting an injected bean to its concrete class when Spring created a JDK interface proxy (`ClassCastException`)",
      "Hibernate proxies: `LazyInitializationException` after the session closes; `getClass()` returns the proxy class, so `equals` using `getClass()` breaks",
      "Remote proxies in loops: what looks like a local call is a network round trip (N+1)",
      "Lazy proxies that aren't thread-safe (two threads both create the real object)",
      "Caching proxies with no TTL or size bound (memory leak, stale data forever)",
      "Protection only in the proxy while other code holds the raw object"
    ],
    quiz: [
      { q: "What is Proxy's intent?", options: ["Add responsibilities", "Provide a surrogate with the same interface to control access to an object", "Simplify a subsystem", "Convert an interface"], answer: 1, why: "Control access: when, who, where, whether." },
      { q: "A Spring bean method `a()` calls `this.b()`, and `b()` is `@Transactional`. What happens?", options: ["A new transaction starts for `b()`", "No transaction: the call bypasses the proxy", "Compile error", "Spring throws at startup"], answer: 1, why: "Only calls through the proxy are intercepted. Move `b()` to another bean or annotate `a()`." },
      { q: "A JDK dynamic proxy can only be created for…", options: ["Any class", "Interfaces", "Final classes", "Records"], answer: 1, why: "`Proxy.newProxyInstance` takes interfaces; subclass proxies (CGLIB/ByteBuddy) are needed for classes." },
      { q: "Hibernate's lazy `@ManyToOne` returns what kind of proxy?", options: ["Remote", "Virtual", "Protection", "Caching"], answer: 1, why: "It defers loading the entity until first access." },
      { q: "Decorator vs Proxy: the best distinguishing statement is…", options: ["Different interfaces", "Same shape; Proxy controls access/lifecycle of its subject (often system-created), Decorator adds features stacked by the client", "Proxy can't wrap interfaces", "Decorator is creational"], answer: 1, why: "Intent and who composes it." },
      { q: "Why can't a CGLIB proxy intercept a `final` method?", options: ["It can", "The proxy is a subclass, and final methods can't be overridden", "Final methods are static", "Because of generics"], answer: 1, why: "Subclass proxies work by overriding." },
      { q: "A Feign client interface is an example of…", options: ["Virtual proxy", "Remote proxy", "Flyweight", "Facade"], answer: 1, why: "Calls become HTTP requests to another service." },
      { q: "Your lazy proxy does `if (real == null) real = new Heavy();` and is used by many threads. Risk?", options: ["None", "Two threads may both create `Heavy`; use synchronisation, a holder, or `AtomicReference`/double-checked locking with `volatile`", "Deadlock", "Stack overflow"], answer: 1, why: "Same race as a lazy singleton (F05)." }
    ],
    cheatsheet: {
      table: [
        ["Kind", "Controls", "Example"],
        ["Virtual", "when the real object is created", "lazy image, Hibernate lazy entity"],
        ["Protection", "who may call", "`@PreAuthorize`, document ACL proxy"],
        ["Remote", "where it runs", "Feign, gRPC stub, RMI"],
        ["Caching", "whether to call at all", "`@Cacheable`, rate-limited API cache"],
        ["Smart reference", "bookkeeping per call", "pooled connection, `synchronizedList`, metrics"]],
      cards: [
        { title: "Mechanics", items: ["Same interface as subject", "Static (hand-written) or dynamic", "JDK proxy: interfaces", "CGLIB/ByteBuddy: subclasses"] },
        { title: "Spring traps", items: ["Self-invocation bypasses proxy", "private/final not intercepted", "Cast to concrete class fails (JDK proxy)", "Self-calls from `@PostConstruct` aren't proxied either"] },
        { title: "vs look-alikes", items: ["Decorator: adds features", "Adapter: changes interface", "Facade: simplifies many", "Flyweight: shares instances"] }]
    },
    practice: [
      { level: "Easy", q: "Name five kinds of proxy and give a one-line example of each.",
        a: ["**Virtual**: lazy-load a heavy object (Hibernate lazy entity, lazy image).",
          "**Protection**: check permissions before forwarding (`@PreAuthorize`, document ACL).",
          "**Remote**: local stand-in for a remote object (Feign, gRPC stub, RMI).",
          "**Caching**: return stored results (`@Cacheable`, exchange-rate cache).",
          "**Smart reference**: extra bookkeeping per call (ref counting, pooled-connection close, locking, metrics)."] },
      { level: "Easy", q: "Write a thread-safe virtual proxy for an expensive `Report` that's built at most once, even under concurrent access.",
        code: `interface Report { String render(); }
class HeavyReport implements Report {
    static final java.util.concurrent.atomic.AtomicInteger built = new java.util.concurrent.atomic.AtomicInteger();
    HeavyReport() { built.incrementAndGet(); try { Thread.sleep(50); } catch (InterruptedException e) { } }
    public String render() { return "report"; }
}
class LazyReport implements Report {
    private volatile Report real;                                   // volatile for safe publication
    public String render() {
        Report r = real;
        if (r == null) {
            synchronized (this) { r = real; if (r == null) real = r = new HeavyReport(); }   // double-checked locking
        }
        return r.render();
    }
}

Report lazy = new LazyReport();
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<String>> fs = new ArrayList<>();
for (int i = 0; i < 20; i++) fs.add(pool.submit(lazy::render));
for (Future<String> f : fs) f.get();
pool.shutdown();
System.out.println("built " + HeavyReport.built.get() + " time(s)");` },
      { level: "Medium", q: "Write a generic timing proxy with `java.lang.reflect.Proxy` that logs method name and duration for any interface, and unwraps `InvocationTargetException` so callers see the original exception.",
        code: `interface Search { List<String> find(String q); }
class SlowSearch implements Search {
    public List<String> find(String q) {
        if (q.isBlank()) throw new IllegalArgumentException("empty query");
        return List.of(q + "-1", q + "-2");
    }
}
@SuppressWarnings("unchecked")
static <T> T timed(Class<T> iface, T target) {
    return (T) java.lang.reflect.Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[]{iface}, (p, m, args) -> {
        long t0 = System.nanoTime();
        try { return m.invoke(target, args); }
        catch (java.lang.reflect.InvocationTargetException e) { throw e.getCause(); }      // unwrap
        finally { System.out.println("  " + m.getName() + " took " + (System.nanoTime() - t0) / 1_000 + " µs"); }
    });
}

Search s = timed(Search.class, new SlowSearch());
System.out.println(s.find("pen"));
try { s.find(" "); } catch (IllegalArgumentException e) { System.out.println("caller sees: " + e.getMessage()); }`,
        follow: "Without unwrapping, callers get `UndeclaredThrowableException` for checked exceptions or an `InvocationTargetException` wrapper, which breaks their `catch` blocks." },
      { level: "Medium", q: "Explain why this `@Cacheable` never hits the cache, and fix it.",
        qcode: `@Service
class ProductService {
    public List<Product> page(List<String> skus) {
        return skus.stream().map(this::find).toList();
    }
    @Cacheable("products")
    public Product find(String sku) { return repo.load(sku); }
}`, qNoCompile: true,
        a: ["`page()` calls `this.find()`, which goes straight to the target object and skips the caching proxy.",
          "Fix 1 (preferred): move `find` into a separate `ProductLookup` bean and inject it; calls then go through that bean's proxy.",
          "Fix 2: callers call `find` directly on the injected `ProductService` (through the proxy).",
          "Fix 3 (last resort): inject a self-reference (`@Lazy ProductService self`) and call `self.find(sku)`, or use AspectJ weaving.",
          "Same issue applies to `@Transactional`, `@Async`, `@Retryable`."] },
      { level: "Medium", q: "Design a rate-limiting proxy that allows each API key at most N calls per minute to an internal `SearchService`. Where does state live, and what happens across multiple instances?",
        a: ["`RateLimitedSearch implements SearchService`, holds the real service and a `RateLimiter` (token bucket per key: `Map<String, Bucket>`).",
          "On each call: `if (!limiter.tryAcquire(key)) throw new TooManyRequests(retryAfter)`; otherwise forward.",
          "Single instance: in-memory `ConcurrentHashMap` of buckets with eviction for idle keys.",
          "Multiple instances: buckets in Redis (atomic Lua script or `INCR` + `EXPIRE` for fixed windows), or a gateway in front does it.",
          "This is a protection/smart-reference proxy; the same idea at the edge is an API gateway policy."],
        m: H.cd(["classDiagram",
          "  class SearchService { <<interface>>; +search(String key, String q) List }",
          "  class RealSearch",
          "  class RateLimitedSearch { -SearchService real; -RateLimiter limiter }",
          "  class RateLimiter { <<interface>>; +tryAcquire(String key) boolean }",
          "  SearchService <|.. RealSearch", "  SearchService <|.. RateLimitedSearch",
          "  RateLimitedSearch --> SearchService : real", "  RateLimitedSearch --> RateLimiter",
          "  RateLimiter <|.. TokenBucketLimiter", "  RateLimiter <|.. RedisWindowLimiter"]) },
      { level: "Medium", q: "Hibernate: `order.getCustomer().getClass()` prints `Customer$HibernateProxy$x9k`, and `customer.equals(other)` returns false for the same row. Why, and how should `equals` be written for entities?",
        a: ["Lazy associations return a **subclass proxy** (virtual proxy) that loads the row on first access.",
          "An `equals` that compares `getClass()` sees the proxy class vs the real class and returns false; reading fields directly (`other.id`) on a proxy may also read uninitialised fields.",
          "Write `equals` with `instanceof Customer` and compare **getter** values of the identifier (`getId()`), or use `Hibernate.getClass(obj)`.",
          "Use a stable business key or the ID (handling the null-ID transient case), and a constant `hashCode` or one based on the business key."] },
      { level: "Hard", q: "Build a **remote proxy** illusion: a `Calculator` interface where the proxy serialises calls to a fake \"wire\" (a string), and a server dispatches them to the real object. Show how a network failure surfaces to the caller.",
        code: `interface Calculator { int add(int a, int b); int mul(int a, int b); }
class RealCalculator implements Calculator { public int add(int a, int b) { return a + b; } public int mul(int a, int b) { return a * b; } }

class Server {                                                    // skeleton: wire -> real object
    private final Calculator real = new RealCalculator();
    String handle(String wire) {
        String[] p = wire.split(":"); int a = Integer.parseInt(p[1]), b = Integer.parseInt(p[2]);
        return String.valueOf(p[0].equals("add") ? real.add(a, b) : real.mul(a, b));
    }
}
class RemoteCallFailed extends RuntimeException { RemoteCallFailed(String m) { super(m); } }

class CalculatorStub implements Calculator {                       // remote proxy (client side)
    private final Server server; boolean networkUp = true;
    CalculatorStub(Server s) { server = s; }
    private int call(String op, int a, int b) {
        if (!networkUp) throw new RemoteCallFailed(op + " failed: connection refused");
        String wire = op + ":" + a + ":" + b;                      // marshal
        System.out.println("  -> " + wire);
        return Integer.parseInt(server.handle(wire));              // unmarshal
    }
    public int add(int a, int b) { return call("add", a, b); }
    public int mul(int a, int b) { return call("mul", a, b); }
}

CalculatorStub calc = new CalculatorStub(new Server());
System.out.println(calc.add(2, 3) + " " + calc.mul(4, 5));
calc.networkUp = false;
try { calc.add(1, 1); } catch (RemoteCallFailed e) { System.out.println(e.getMessage()); }`,
        follow: "Talking point: \"location transparency\" is a leaky abstraction. Remote proxies need timeouts, retries with idempotency, and callers must handle partial failure, which a local object never has." },
      { level: "Hard", q: "You're asked to add audit logging, caching and authorisation to a `PatientRecords` service. Which are proxies, which decorators, and in what order do you stack them?",
        a: ["Authorisation is a **protection proxy**: it must be outermost, so unauthorised callers never hit the cache (otherwise the cache could leak another user's record).",
          "Audit is a **smart-reference proxy/decorator**: put it outside the cache so every access is recorded, including cache hits (regulatory requirement for medical data).",
          "Caching is a **caching proxy**: innermost, closest to the real repository; keys must include the patient ID, and entries should be evicted on update.",
          "Order: `Auth(Audit(Cache(RealRecords)))`. In Spring, control order with `@Order` on aspects or by explicit composition.",
          "Mention: deny-by-default, log the denial too, and never cache across tenants."],
        m: M(["flowchart LR",
          "  C([\"caller\"]) --> A[\"<b>AuthProxy</b><br/><span class='d'>protection</span>\"]:::s1",
          "  A --> L[\"<b>AuditProxy</b><br/><span class='d'>records every access</span>\"]:::s1",
          "  L --> K[\"<b>CacheProxy</b><br/><span class='d'>per-patient keys</span>\"]:::s1",
          "  K --> R[\"<b>RealRecords</b>\"]:::s0"]) }
    ],
    recap: [
      "Proxy = same interface as the real object, plus control over **when** (virtual), **who** (protection), **where** (remote), **whether** (caching), or **bookkeeping** (smart reference).",
      "Dynamic proxies: JDK `Proxy` for interfaces, CGLIB/ByteBuddy subclasses for classes; frameworks build on them.",
      "Spring AOP is proxy-based: self-invocation, `private` and `final` methods bypass it. Classic interview question.",
      "Hibernate lazy loading uses virtual proxies: watch `LazyInitializationException` and `equals`/`getClass()`.",
      "Proxy vs Decorator: same shape, different intent (access control vs added features)."
    ]
  });
})();
