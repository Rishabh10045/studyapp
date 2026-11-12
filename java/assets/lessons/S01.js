/* Lesson S01: Spring core: IoC, DI, beans, scopes & lifecycle */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded with Spring Framework 6.2 (Boot 3.4.1), AnnotationConfigApplicationContext + @EnableAspectJAutoProxy:
  //   prototype Cart injected directly into a singleton → "direct 1 1 1" (one Cart created at startup);
  //   via ObjectProvider<Cart>.getObject() → "provider 2 3 4", each with constructor + @PostConstruct;
  //   scoped proxy (proxyMode = TARGET_CLASS) → "proxy 1 2 3" (a new target per method call on the proxy);
  //   @PreDestroy was never called for prototypes when the context closed.
  //   @Around aspect on Svc: outer() → aspect logs "outer" only; outerViaSelf() (calls self.inner()) → "outer", "inner".
  var INJ = {
    direct: { label: "@Autowired Cart (direct)", code: "@Component @Scope(\"prototype\")\nclass Cart { … }\n\n@Component                       // singleton\nclass Shop {\n    @Autowired Cart cart;        // injected once, when Shop is created\n    int handle() { return cart.id; }\n}" },
    provider: { label: "ObjectProvider<Cart>", code: "@Component\nclass Shop {\n    @Autowired ObjectProvider<Cart> carts;\n    int handle() { return carts.getObject().id; }   // asks the container each time\n}" },
    proxy: { label: "scoped proxy", code: "@Component\n@Scope(value = \"prototype\", proxyMode = ScopedProxyMode.TARGET_CLASS)\nclass Cart { … }\n\n@Component\nclass Shop {\n    @Autowired Cart cart;        // actually a CGLIB proxy\n    int handle() { return cart.id(); }   // every call on the proxy fetches a NEW Cart\n}" }
  };
  var CALLS = {
    outer: { label: "svc.outer()", code: "public String outer() { return \"outer>\" + inner(); }   // this.inner(): bypasses the proxy", aspects: ["outer"] },
    self: { label: "svc.outerViaSelf()", code: "@Autowired @Lazy Svc self;                       // the proxy, injected into itself\npublic String outerViaSelf() { return \"outer>\" + self.inner(); }", aspects: ["outerViaSelf", "inner"] },
    inner: { label: "svc.inner()", code: "public String inner() { return \"inner\"; }", aspects: ["inner"] }
  };
  function s01Widget(el, ctx) {
    var s = ctx.state; if (!s.tab) { s.tab = "scope"; s.inj = "direct"; s.sim = null; s.call = "outer"; s.alog = []; }
    el.innerHTML = "<div class='seg' data-r='tab'><button type='button' data-v='scope'>Scopes: prototype in a singleton</button><button type='button' data-v='aop'>Proxies: self-invocation</button></div><div data-r='body' style='margin-top:10px'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function freshSim() { return { next: 1, log: [], results: [], direct: null, started: false }; }
    function create(S) { var id = S.next++; S.log.push("new Cart#" + id, "@PostConstruct Cart#" + id); return id; }
    function startup(S) { if (S.started) return; S.started = true; S.log.push("context refresh: singletons created"); if (s.inj === "direct") { S.direct = create(S); S.log.push("Cart#" + S.direct + " injected into Shop"); } else if (s.inj === "proxy") S.log.push("proxy injected into Shop (no Cart yet)"); }
    function handle(S) {
      startup(S);
      var id = s.inj === "direct" ? S.direct : s.inj === "provider" ? create(S) : S.next++;
      if (s.inj === "proxy") S.log.push("proxy call cart.id() → new Cart#" + id);
      S.results.push(id);
    }
    function draw() {
      q("tab").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", s.tab === b.dataset.v); });
      var body = q("body");
      if (s.tab === "scope") {
        if (!s.sim) s.sim = freshSim();
        var S = s.sim;
        body.innerHTML = "<div class='seg' data-r='inj'>" + Object.keys(INJ).map(function (k) { return "<button type='button' data-v='" + k + "'" + (s.inj === k ? " class='on'" : "") + ">" + INJ[k].label + "</button>"; }).join("") + "</div>" +
          "<pre class='code' style='margin-top:10px'>" + ctx.H.highlight(INJ[s.inj].code, "java") + "</pre>" +
          "<div class='btnrow'><button type='button' class='btn primary' data-r='call'>call shop.handle()</button><button type='button' class='btn' data-r='close'>close context</button><button type='button' class='btn' data-r='reset'>restart context</button></div>" +
          "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><div class='tablewrap' data-r='log'></div>";
        var L = ["flowchart LR", "  C[\"ApplicationContext\"]:::c", "  SH[\"Shop<br/>singleton\"]:::s", "  C --> SH"];
        var distinct = S.results.filter(function (v, i, a) { return a.indexOf(v) === i; });
        if (s.inj === "proxy") L.push("  PX[\"Cart proxy (CGLIB)\"]:::p", "  SH --> PX");
        (distinct.length ? distinct.slice(-4) : (S.direct ? [S.direct] : [])).forEach(function (id) { L.push("  K" + id + "[\"Cart#" + id + "<br/>prototype\"]:::k", "  " + (s.inj === "proxy" ? "PX" : s.inj === "provider" ? "C" : "SH") + " --> K" + id); });
        L.push("  classDef c fill:#dbeafe,stroke:#2563eb", "  classDef s fill:#e8f5e9,stroke:#2e7d32", "  classDef p fill:#fff3e0,stroke:#ef6c00", "  classDef k fill:#f3e8ff,stroke:#7c3aed");
        ctx.H.renderDiagram(q("dg"), L.join("\n"));
        var why = { direct: "A prototype injected into a singleton is created **once**, when the singleton is built, so every call sees the same Cart. This is the classic scope-mismatch bug.", provider: "`ObjectProvider.getObject()` asks the container for a fresh prototype on each call, with full lifecycle callbacks. Usually the right fix.", proxy: "The scoped proxy fetches a new target for **every method call on the proxy**, so two calls inside one request already see two different Carts. Fine for request/session scope, surprising for prototypes." }[s.inj];
        q("res").innerHTML = ctx.md((S.results.length ? "**Cart ids seen: " + S.results.join(", ") + ".** " : "") + why + " Recorded with Spring 6.2: direct 1 1 1, provider 2 3 4, proxy 1 2 3.");
        q("log").innerHTML = S.log.length ? "<table><thead><tr><th>container log</th></tr></thead><tbody>" + S.log.slice(-8).map(function (x) { return "<tr><td>" + ctx.esc(x) + "</td></tr>"; }).join("") + "</tbody></table>" : "";
        q("inj").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.inj = b.dataset.v; s.sim = freshSim(); ctx.save(); draw(); });
        q("call").addEventListener("click", function () { if (S.closed) return; handle(S); ctx.save(); draw(); });
        q("close").addEventListener("click", function () { if (S.closed) return; startup(S); S.closed = true; S.log.push("context closed: singleton destroy callbacks run", "no @PreDestroy for any Cart: the container doesn't track prototypes after handing them out"); ctx.save(); draw(); });
        q("reset").addEventListener("click", function () { s.sim = freshSim(); ctx.save(); draw(); });
      } else {
        body.innerHTML = "<pre class='code'>" + ctx.H.highlight("@Aspect @Component\nclass Timing {\n    @Around(\"execution(* demo.Svc.*(..))\")\n    Object around(ProceedingJoinPoint pjp) throws Throwable {\n        log(\"aspect \" + pjp.getSignature().getName());\n        return pjp.proceed();\n    }\n}", "java") + "</pre>" +
          "<div class='seg' data-r='call'>" + Object.keys(CALLS).map(function (k) { return "<button type='button' data-v='" + k + "'" + (s.call === k ? " class='on'" : "") + ">" + CALLS[k].label + "</button>"; }).join("") + "</div>" +
          "<pre class='code' style='margin-top:10px'>" + ctx.H.highlight(CALLS[s.call].code, "java") + "</pre><div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div>";
        var c = CALLS[s.call], L2 = ["flowchart LR", "  Caller[\"caller\"]:::c --> PX[\"Svc proxy (CGLIB subclass)<br/>runs the aspect\"]:::p", "  PX -->|aspect: " + c.aspects[0] + "| T[\"Svc target<br/>" + c.aspects[0] + "()\"]:::s"];
        if (s.call === "outer") L2.push("  T -->|this.inner(): no aspect| T");
        if (s.call === "self") L2.push("  T -->|self.inner()| PX2[\"proxy again\"]:::p", "  PX2 -->|aspect: inner| T2[\"target inner()\"]:::s");
        L2.push("  classDef c fill:#dbeafe,stroke:#2563eb", "  classDef s fill:#e8f5e9,stroke:#2e7d32", "  classDef p fill:#fff3e0,stroke:#ef6c00");
        ctx.H.renderDiagram(q("dg"), L2.join("\n"));
        q("res").innerHTML = ctx.md("**Aspect fired for: " + c.aspects.join(", ") + "** (recorded with Spring 6.2). " + (s.call === "outer" ? "The internal call `inner()` goes straight to `this`, the target object, so no advice runs. The same trap disables `@Transactional`, `@Async` and `@Cacheable` on self-calls." : s.call === "self" ? "Calling through the injected proxy runs advice on the inner call too. Cleaner fix: move `inner()` to another bean." : "External calls always go through the proxy."));
        q("call").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.call = b.dataset.v; ctx.save(); draw(); });
      }
    }
    q("tab").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.tab = b.dataset.v; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Inversion of control: the container builds your objects",
      text: "Without a framework your code creates its own dependencies (`new PaymentService(new HttpClient(...))`) and wires the whole graph by hand. With **inversion of control**, you declare *what* objects exist and what they need, and the **Spring container** (`ApplicationContext`) creates them, injects dependencies, manages their lifecycle and wraps them in proxies for cross-cutting features (transactions, security, caching). Objects managed by the container are **beans**. The payoff: loose coupling (depend on interfaces), easy testing (inject fakes), and a single place where infrastructure is configured.",
      m: M(["flowchart LR",
        "  CFG[\"configuration metadata<br/>@Component, @Bean, properties\"]:::s1 --> CTX[\"ApplicationContext<br/>(IoC container)\"]:::s2",
        "  POJO[\"your classes\"]:::s1 --> CTX",
        "  CTX --> B1[\"OrderService bean\"]:::s3",
        "  CTX --> B2[\"PaymentClient bean\"]:::s3",
        "  B1 -->|injected| B2",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `interface PaymentClient { String charge(int rupees); }
@Component
class FakePaymentClient implements PaymentClient { public String charge(int rupees) { return "charged ₹" + rupees; } }
@Component
class OrderService {
    private final PaymentClient payments;
    OrderService(PaymentClient payments) { this.payments = payments; }      // the container supplies it
    String checkout(int amount) { return "order placed, " + payments.charge(amount); }
}
@Configuration
@ComponentScan
class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    System.out.println(ctx.getBean(OrderService.class).checkout(499));
    System.out.println("beans of mine: " + Arrays.stream(ctx.getBeanDefinitionNames()).filter(n -> !n.startsWith("org.")).sorted().toList());
}`,
      analogy: "Without IoC, every dish's cook also farms the vegetables. With IoC, there's a kitchen manager (the container) who stocks every station with exactly what its recipe card says it needs." },
    { title: "Defining beans: component scanning vs @Bean methods",
      text: "Two ways to declare beans. **Component scanning**: annotate your own classes with `@Component` or a stereotype (`@Service`, `@Repository`, which also translates persistence exceptions, `@Controller`/`@RestController`), and `@ComponentScan` (included in `@SpringBootApplication`) finds them in the package and sub-packages. **`@Bean` methods** in a `@Configuration` class: for third-party classes you can't annotate or objects needing construction logic. `@Configuration` classes are CGLIB-proxied so calling one `@Bean` method from another returns the **same singleton** rather than a new object.",
      code: `@Service
class PriceService { int price(String sku) { return sku.length() * 100; } }
record Clock(String zone) { }                                   // imagine a third-party class
@Configuration
@ComponentScan
class AppConfig {
    @Bean Clock clock() { return new Clock("Asia/Kolkata"); }
    @Bean String banner() { return "clock zone " + clock().zone() + ", same instance: " + (clock() == clock()); }   // proxied: returns the singleton
}
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    System.out.println(ctx.getBean(PriceService.class).price("TSHIRT"));
    System.out.println(ctx.getBean("banner", String.class));
}` },
    { title: "Injection styles: constructor, setter, field",
      text: "**Constructor injection** is the recommended default: dependencies are explicit, fields can be `final`, the object is never half-initialised, and tests just call the constructor. With a single constructor no `@Autowired` is needed. **Setter injection** suits optional dependencies or reconfiguration. **Field injection** (`@Autowired` on a field) is concise but hides dependencies, prevents `final`, and requires reflection or a container to test. A constructor with many parameters is a design signal: the class does too much.",
      table: [["Style", "Pros", "Cons", "Use for"],
        ["Constructor", "Immutable, explicit, testable, fails fast", "Verbose with many deps", "Required dependencies (default)"],
        ["Setter", "Optional, can change", "Mutable, may be unset", "Optional dependencies"],
        ["Field", "Concise", "Hidden deps, no final, hard to test", "Tests, quick demos"]],
      code: `@Component class Inventory { boolean inStock(String sku) { return !sku.isBlank(); } }
@Component class Audit { String note(String s) { return "[audit] " + s; } }
@Component
class CheckoutService {
    private final Inventory inventory;                      // constructor: required, final
    private Audit audit;                                    // setter: optional
    CheckoutService(Inventory inventory) { this.inventory = inventory; }
    @Autowired(required = false) void setAudit(Audit audit) { this.audit = audit; }
    String buy(String sku) {
        String r = inventory.inStock(sku) ? "bought " + sku : "out of stock";
        return audit == null ? r : audit.note(r);
    }
}
@Configuration @ComponentScan class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) { System.out.println(ctx.getBean(CheckoutService.class).buy("MUG-1")); }
System.out.println("plain object in a test: " + new CheckoutService(new Inventory()).buy("PEN"));` },
    { title: "Several candidates: @Primary, @Qualifier, collections",
      text: "If two beans implement the same type, injecting that type fails with `NoUniqueBeanDefinitionException`. Resolve with **`@Primary`** (the default choice), **`@Qualifier(\"name\")`** at the injection point (explicit choice), or a parameter name matching the bean name. Injecting **`List<T>`** or **`Map<String, T>`** gives you every implementation, which is how strategy patterns are wired in Spring (order with `@Order`). `ObjectProvider<T>` lets you resolve lazily or optionally.",
      code: `interface Notifier { String send(String msg); }
@Component("sms") class SmsNotifier implements Notifier { public String send(String m) { return "SMS: " + m; } }
@Component("email") @Primary class EmailNotifier implements Notifier { public String send(String m) { return "EMAIL: " + m; } }
@Component
class Alerts {
    final Notifier defaultOne, chosen; final Map<String, Notifier> all;
    Alerts(Notifier defaultOne, @Qualifier("sms") Notifier chosen, Map<String, Notifier> all) { this.defaultOne = defaultOne; this.chosen = chosen; this.all = all; }
}
@Configuration @ComponentScan class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    Alerts a = ctx.getBean(Alerts.class);
    System.out.println(a.defaultOne.send("hi") + " | " + a.chosen.send("hi") + " | all: " + new TreeMap<>(a.all).keySet());
}` },
    { title: "Circular dependencies",
      text: "A needs B and B needs A. With **constructor injection** Spring cannot build either and fails at startup with `BeanCurrentlyInCreationException`, which is good: the cycle is a design problem. With field/setter injection the core container can resolve it using early references, but **Spring Boot 2.6+ forbids circular references by default** (`spring.main.allow-circular-references=false`). Fixes: extract the shared logic into a third bean, invert one dependency with an event or callback, or as a last resort inject `@Lazy` (a proxy resolved on first use).",
      m: M(["flowchart LR",
        "  A[\"OrderService\"]:::s4 -->|needs| B[\"CustomerService\"]:::s4",
        "  B -->|needs| A",
        "  F[\"fix: extract PricingRules<br/>both depend on it\"]:::s2",
        "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#ffebee,stroke:#c62828"]),
      code: `@Component class OrderSvc { final CustomerSvc c; OrderSvc(CustomerSvc c) { this.c = c; } }
@Component class CustomerSvc { final OrderSvc o; CustomerSvc(OrderSvc o) { this.o = o; } }
@Configuration @ComponentScan class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    System.out.println("started?");
} catch (org.springframework.beans.factory.BeanCreationException e) {
    Throwable root = e; while (root.getCause() != null) root = root.getCause();
    System.out.println("startup failed: " + root.getClass().getSimpleName());
}` },
    { title: "Bean scopes",
      text: "**Singleton** (default): one instance per container, shared by all threads, so it must be stateless or thread-safe (J15–J18). **Prototype**: a new instance every time one is requested; the container doesn't manage its destruction. Web-aware scopes: **request** (one per HTTP request), **session** (per HTTP session), **application** (per `ServletContext`), and **websocket**. Note that a Spring singleton is per container, not the GoF Singleton pattern (one per class loader).",
      table: [["Scope", "Instances", "Destroy callbacks", "Typical use"],
        ["singleton", "One per container", "Yes", "Services, repositories, clients"],
        ["prototype", "New per lookup/injection", "No", "Stateful helpers, builders"],
        ["request", "One per HTTP request", "Yes", "Request context holders"],
        ["session", "One per HTTP session", "Yes", "Shopping cart, user prefs"],
        ["application", "One per ServletContext", "Yes", "Rare: web-app-wide state"]],
      code: `@Component class Catalog { }
@Component @Scope("prototype") class Draft { }
@Configuration @ComponentScan class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    System.out.println("singleton same instance: " + (ctx.getBean(Catalog.class) == ctx.getBean(Catalog.class)));
    System.out.println("prototype same instance: " + (ctx.getBean(Draft.class) == ctx.getBean(Draft.class)));
}` },
    { title: "Prototype (or request) beans inside singletons",
      text: "A singleton is created once, so whatever is injected into it is injected **once**. A prototype dependency is therefore effectively a singleton too; a request-scoped bean can't be injected at all without help (there's no request at startup). Fixes: **`ObjectProvider<T>`** (call `getObject()` when you need one), **`@Lookup`** methods (Spring overrides the method to return a new bean), or a **scoped proxy** (`proxyMode = TARGET_CLASS`), the standard for request/session beans; with prototypes it yields a new target on every method call, as the widget's recorded run shows (1, 2, 3).",
      code: `@Component @Scope("prototype")
class Ticket { static final AtomicInteger seq = new AtomicInteger(); final int no = seq.incrementAndGet(); }
@Component
abstract class Counter {                        // Spring subclasses it to implement the @Lookup method
    @Autowired ObjectProvider<Ticket> tickets;
    int viaProvider() { return tickets.getObject().no; }
    @Lookup abstract Ticket newTicket();
    int viaLookup() { return newTicket().no; }
}
@Configuration @ComponentScan class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    Counter c = ctx.getBean(Counter.class);
    System.out.println("ObjectProvider: " + c.viaProvider() + ", " + c.viaProvider() + " | @Lookup: " + c.viaLookup() + ", " + c.viaLookup());
}` },
    { title: "Bean lifecycle",
      text: "For each singleton at startup: **instantiate** (constructor injection), **populate** properties (field/setter injection), call **Aware** interfaces (`BeanNameAware`, `ApplicationContextAware`), run **`BeanPostProcessor.postProcessBeforeInitialization`**, then **init callbacks** in order `@PostConstruct` → `InitializingBean.afterPropertiesSet()` → `@Bean(initMethod)`, then **`postProcessAfterInitialization`** (where AOP proxies are created), and the bean is ready. On shutdown: `@PreDestroy` → `DisposableBean.destroy()` → `destroyMethod`. **`SmartLifecycle`** beans additionally get `start()`/`stop()` in phase order once the context is refreshed: use it for things like message listeners that should begin only when everything is wired.",
      m: M(["flowchart LR",
        "  I[\"instantiate\"]:::s1 --> P[\"inject properties\"]:::s1 --> AW[\"Aware callbacks\"]:::s1 --> B1[\"BPP before init\"]:::s3",
        "  B1 --> IN[\"@PostConstruct<br/>afterPropertiesSet<br/>initMethod\"]:::s2 --> B2[\"BPP after init<br/>(proxies created)\"]:::s3 --> R[\"ready\"]:::s2",
        "  R --> D[\"@PreDestroy<br/>destroy()\"]:::s4",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s3 fill:#dbeafe,stroke:#2563eb", "  classDef s4 fill:#ffebee,stroke:#c62828"]),
      code: `class Pool implements BeanNameAware, InitializingBean, DisposableBean {
    @Autowired Environment env;
    Pool() { System.out.println("1 constructor (env injected yet? " + (env != null) + ")"); }
    public void setBeanName(String n) { System.out.println("2 BeanNameAware: " + n + " (env injected? " + (env != null) + ")"); }
    @PostConstruct void post() { System.out.println("3 @PostConstruct"); }
    public void afterPropertiesSet() { System.out.println("4 afterPropertiesSet"); }
    void customInit() { System.out.println("5 initMethod"); }
    @PreDestroy void pre() { System.out.println("6 @PreDestroy"); }
    public void destroy() { System.out.println("7 DisposableBean.destroy"); }
    void customDestroy() { System.out.println("8 destroyMethod"); }
}
@Configuration
class AppConfig { @Bean(initMethod = "customInit", destroyMethod = "customDestroy") Pool pool() { return new Pool(); } }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) { System.out.println("-- ready --"); }` },
    { title: "Extension points: BeanPostProcessor and BeanFactoryPostProcessor",
      text: "Most Spring \"magic\" is built on two hooks. A **`BeanFactoryPostProcessor`** runs before any bean is created and can change **bean definitions** (e.g. `PropertySourcesPlaceholderConfigurer` resolving `${...}`). A **`BeanPostProcessor`** sees every **bean instance** around initialisation and may return a different object: `AutowiredAnnotationBeanPostProcessor` performs `@Autowired`, `CommonAnnotationBeanPostProcessor` calls `@PostConstruct`, and the AOP auto-proxy creator returns a **proxy** in place of your bean. That's why a bean's runtime class can be `MyService$$SpringCGLIB$$0`.",
      code: `interface Greeter { String greet(String n); }
@Component class SimpleGreeter implements Greeter { public String greet(String n) { return "hello " + n; } }
@Component
class TimingPostProcessor implements BeanPostProcessor {
    public Object postProcessAfterInitialization(Object bean, String name) {
        if (bean instanceof Greeter g) {
            System.out.println("wrapping bean '" + name + "'");
            return (Greeter) n -> { long t = System.nanoTime(); String r = g.greet(n); return r + " (took " + ((System.nanoTime() - t) >= 0 ? "measured" : "?") + ")"; };
        }
        return bean;
    }
}
@Configuration @ComponentScan class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    Greeter g = ctx.getBean(Greeter.class);
    System.out.println(g.greet("asha") + " | runtime class is SimpleGreeter? " + (g instanceof SimpleGreeter));
}` },
    { title: "AOP proxies: JDK dynamic proxies vs CGLIB",
      text: "Spring adds behaviour (transactions, security, caching, async, your `@Aspect`s) by putting a **proxy** in front of the bean. A **JDK dynamic proxy** implements the bean's interfaces, so callers must depend on the interface; a **CGLIB proxy** is a generated **subclass** of the bean's class. Spring Boot defaults to CGLIB (`spring.aop.proxy-target-class=true`). Consequences of subclassing: **`final` classes and methods can't be advised**, and private methods are never intercepted. Advice runs only for calls that go **through the proxy**.",
      m: M(["flowchart LR",
        "  C[\"caller\"]:::s1 --> PX[\"proxy<br/>(JDK: implements interface<br/>CGLIB: subclass)\"]:::s3",
        "  PX -->|before advice: start tx| T[\"target bean\"]:::s2",
        "  T -->|return| PX",
        "  PX -->|after: commit / rollback| C",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s3 fill:#fff3e0,stroke:#ef6c00"]),
      code: `interface Quotes { String quote(String route); }
@Component class QuoteService implements Quotes { public String quote(String r) { return r + " ₹4,500"; } }
@Aspect @Component
class LogAspect { @Before("execution(* *..QuoteService.*(..))") void log(JoinPoint jp) { System.out.println("advice before " + jp.getSignature().getName()); } }
@Configuration @ComponentScan @EnableAspectJAutoProxy(proxyTargetClass = false) class JdkConfig { }
try (var ctx = new AnnotationConfigApplicationContext(JdkConfig.class)) {
    Quotes q = ctx.getBean(Quotes.class);
    System.out.println(q.quote("DEL-BOM") + " | JDK proxy? " + AopUtils.isJdkDynamicProxy(q) + " | CGLIB? " + AopUtils.isCglibProxy(q));
}` },
    { title: "The self-invocation trap",
      text: "Because advice lives in the proxy, a method calling **another method of the same bean** (`this.inner()`) bypasses it. So `@Transactional`, `@Async`, `@Cacheable`, `@Retryable` or your aspect on `inner()` silently do nothing when called from `outer()` in the same class; the widget's recorded run logs the aspect for `outer` only. Fixes: **move the method to another bean** (cleanest), inject the bean's own proxy (`@Lazy` self-injection) or use `TransactionTemplate` programmatically. Interviewers love this together with \"why doesn't `@Transactional` work on a private method?\" (proxies can't intercept private methods).",
      code: `@Service
class ReportService {
    String outer() { return "outer → " + inner(); }       // this.inner(): no proxy, no advice
    String inner() { return "inner"; }
}
@Service
class Facade { final ReportService reports; Facade(ReportService r) { reports = r; } String run() { return "facade → " + reports.inner(); } }
@Aspect @Component
class Trace { @Before("execution(* *..ReportService.*(..))") void before(JoinPoint jp) { System.out.println("advice: " + jp.getSignature().getName()); } }
@Configuration @ComponentScan @EnableAspectJAutoProxy class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    System.out.println(ctx.getBean(ReportService.class).outer());
    System.out.println(ctx.getBean(Facade.class).run());
}` }
  ];

  H.registerLesson({
    code: "S01",
    summary: "The Spring container that every other Spring feature builds on: inversion of control and the `ApplicationContext`, declaring beans with component scanning or `@Bean` methods, constructor vs setter vs field injection, resolving multiple candidates with `@Primary`, `@Qualifier` and collections, circular dependencies, bean scopes and the prototype-in-singleton problem, the bean lifecycle and `SmartLifecycle`, the post-processor extension points, JDK vs CGLIB AOP proxies, and the self-invocation trap.",
    slides: SLIDES,
    widget: { heading: "Interactive: scopes and proxies in a real container", caption: "Inject a prototype into a singleton three ways and call it, or call advised methods with and without self-invocation. Every result shown was recorded with Spring Framework 6.2 (Spring Boot 3.4).", render: s01Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Service wiring", "Controllers depend on service interfaces; tests swap in fakes or mocks through constructors."],
      ["Strategy selection", "All `PaymentGateway` implementations injected as a `Map<String, PaymentGateway>` and chosen by key at runtime."],
      ["Startup failures", "`NoUniqueBeanDefinitionException` after adding a second `DataSource`; fixed with `@Primary` and `@Qualifier`."],
      ["Silent no-ops", "`@Transactional` on a method called from the same class never starts a transaction (self-invocation)."],
      ["Lifecycle hooks", "Warming caches in `@PostConstruct`, starting Kafka consumers with `SmartLifecycle` after the context is ready."],
      ["Upgrades", "Spring Boot 2.6 started rejecting circular references, breaking apps that relied on field-injection cycles."]
    ],
    pitfalls: [
      "Field injection everywhere, making classes hard to test",
      "Injecting a prototype or request bean directly into a singleton",
      "Mutable state in singleton beans (shared by all threads)",
      "Calling an advised method from inside the same bean",
      "Expecting @Transactional/@Async on private or final methods",
      "Circular dependencies hidden by field injection",
      "Expecting @PreDestroy on prototype beans",
      "Heavy work or remote calls in constructors and @PostConstruct slowing startup",
      "Two beans of the same type without @Primary/@Qualifier"
    ],
    quiz: [
      { q: "What is the default bean scope in Spring?", options: ["prototype", "singleton", "request", "session"], answer: 1, why: "One instance per container, shared across threads." },
      { q: "Why is constructor injection preferred?", options: ["It's faster at runtime", "Dependencies are explicit and final, the object is fully initialised, and tests can construct it without Spring", "Field injection is deprecated", "It enables AOP"], answer: 1, why: "It also exposes cycles at startup." },
      { q: "A prototype bean is injected with @Autowired into a singleton. How many prototype instances does the singleton use?", options: ["A new one per method call", "One, created when the singleton was created", "One per thread", "None"], answer: 1, why: "The widget's recorded run: 1 1 1. Use ObjectProvider, @Lookup or a scoped proxy." },
      { q: "Which runs first for a bean?", options: ["@PostConstruct", "BeanPostProcessor.postProcessBeforeInitialization", "afterPropertiesSet", "postProcessAfterInitialization"], answer: 1, why: "Then @PostConstruct, afterPropertiesSet, initMethod, then postProcessAfterInitialization." },
      { q: "outer() calls inner() in the same bean; inner() is @Transactional. What happens when a client calls outer()?", options: ["inner runs in a new transaction", "No transaction from inner's annotation: the call bypasses the proxy", "Spring throws an exception", "Both methods get transactions"], answer: 1, why: "Self-invocation goes to `this`, not the proxy." },
      { q: "Two beans implement Notifier and a constructor asks for Notifier. With neither @Primary nor @Qualifier, what happens?", options: ["The first one alphabetically is used", "Startup fails with NoUniqueBeanDefinitionException (unless the parameter name matches a bean name)", "A random one is chosen", "Both are injected"], answer: 1, why: "Use @Primary, @Qualifier, or inject a List/Map." },
      { q: "How does a CGLIB proxy differ from a JDK dynamic proxy?", options: ["CGLIB needs an interface", "CGLIB subclasses the target class; JDK proxies implement its interfaces", "JDK proxies are subclasses", "No difference"], answer: 1, why: "So final classes/methods can't be advised with CGLIB." },
      { q: "Where are AOP proxies created in the lifecycle?", options: ["In the constructor", "In a BeanPostProcessor's postProcessAfterInitialization", "In @PreDestroy", "In BeanFactoryPostProcessor"], answer: 1, why: "The auto-proxy creator returns the proxy in place of the bean." },
      { q: "Two beans need each other via constructors. What happens at startup?", options: ["Spring resolves it with early references", "Startup fails with BeanCurrentlyInCreationException", "One gets null", "Spring creates two instances of each"], answer: 1, why: "Constructor cycles can't be resolved; redesign or use @Lazy." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Use"],
        ["Declare own class", "`@Component` / `@Service` / `@Repository` / `@RestController`"],
        ["Third-party object", "`@Bean` method in a `@Configuration` class"],
        ["Required dependency", "constructor parameter (`final` field)"],
        ["Pick among candidates", "`@Primary`, `@Qualifier(\"name\")`, `List<T>`, `Map<String,T>`"],
        ["Fresh prototype", "`ObjectProvider<T>.getObject()`, `@Lookup`"],
        ["Request/session bean in singleton", "`@Scope(value = \"request\", proxyMode = TARGET_CLASS)` (`@RequestScope`)"],
        ["Init / cleanup", "`@PostConstruct` / `@PreDestroy`"],
        ["Start after wiring", "`SmartLifecycle` or `ApplicationReadyEvent` listener"]],
      cards: [
        { title: "Lifecycle order", items: ["Constructor", "Property injection", "Aware callbacks", "BPP before", "@PostConstruct → afterPropertiesSet → initMethod", "BPP after (proxy)", "@PreDestroy → destroy → destroyMethod"] },
        { title: "Proxy rules", items: ["Advice only via the proxy", "No self-invocation", "No private methods", "No final with CGLIB", "Boot defaults to CGLIB"] },
        { title: "Say in interviews", items: ["IoC = container builds the graph", "Constructor injection", "Singleton ≠ GoF singleton", "Scope mismatch fixes", "BeanPostProcessor powers AOP"] }]
    },
    practice: [
      { level: "Easy", q: "What are IoC and dependency injection, and what does the ApplicationContext do?",
        a: ["IoC: objects don't create or look up their dependencies; a container provides them.",
          "DI is the mechanism: dependencies are passed in via constructor, setter or field.",
          "ApplicationContext is Spring's container: reads configuration (annotations, @Bean, properties), creates and wires beans, manages lifecycle and scopes, publishes events, resolves messages and resources, and applies post-processors (AOP proxies).",
          "Benefits: loose coupling, testability, centralised configuration."] },
      { level: "Easy", q: "Define the same dependency with @Component scanning and with a @Bean method.",
        a: ["@Component on your own class plus @ComponentScan.",
          "@Bean method in a @Configuration class for classes you don't own or need custom construction.",
          "Both end up as bean definitions in the same container."],
        code: `interface Tax { int on(int amount); }
@Component class GstTax implements Tax { public int on(int a) { return a * 18 / 100; } }
@Configuration @ComponentScan
class AppConfig { @Bean java.text.NumberFormat inr() { return java.text.NumberFormat.getIntegerInstance(new Locale("en", "IN")); } }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    int amount = 100000;
    System.out.println("tax on " + ctx.getBean(java.text.NumberFormat.class).format(amount) + " = " + ctx.getBean(Tax.class).on(amount));
}` },
      { level: "Easy", q: "Explain the differences between constructor, setter and field injection.",
        a: ["Constructor: required deps, final fields, object always valid, easy to unit test; preferred.",
          "Setter: optional or changeable deps; object may be partially configured.",
          "Field: concise but hides dependencies, no final, needs reflection/container in tests.",
          "Many constructor params signal a class with too many responsibilities."] },
      { level: "Medium", q: "How do you inject a prototype-scoped bean into a singleton so you get a new instance each time?",
        a: ["Direct injection happens once, so the singleton keeps one instance.",
          "Use ObjectProvider<T>.getObject() (or Provider<T>), a @Lookup method, or a scoped proxy.",
          "ObjectProvider is the most explicit; scoped proxies are the standard for request/session scope.",
          "Remember prototypes don't get destroy callbacks."],
        code: `@Component @Scope("prototype") class Builder { final StringBuilder sb = new StringBuilder(); }
@Component class ReportJob {
    final ObjectProvider<Builder> builders;
    ReportJob(ObjectProvider<Builder> builders) { this.builders = builders; }
    String run(String title) { Builder b = builders.getObject(); return b.sb.append(title).toString(); }
}
@Configuration @ComponentScan class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    ReportJob job = ctx.getBean(ReportJob.class);
    System.out.println(job.run("daily") + " | " + job.run("weekly") + "   (no leftover text: a new Builder each time)");
}` },
      { level: "Medium", q: "Describe the Spring bean lifecycle.",
        a: ["Bean definitions loaded; BeanFactoryPostProcessors may modify them.",
          "Instantiate (constructor injection), populate properties (field/setter injection).",
          "Aware callbacks; BeanPostProcessor before-init; @PostConstruct, afterPropertiesSet, initMethod.",
          "BeanPostProcessor after-init (AOP proxy may replace the bean); bean ready; SmartLifecycle start.",
          "Shutdown: SmartLifecycle stop, @PreDestroy, DisposableBean.destroy, destroyMethod (singletons only)."] },
      { level: "Medium", q: "Why doesn't @Transactional work when called from another method of the same class, and how do you fix it?",
        a: ["Spring implements @Transactional with a proxy around the bean.",
          "An internal call this.method() goes directly to the target, skipping the proxy's interceptor.",
          "Fix: move the transactional method to another bean; or self-inject the proxy (@Lazy); or use TransactionTemplate.",
          "Also: private methods aren't intercepted; final methods can't be with CGLIB."] },
      { level: "Medium", q: "Wire a strategy pattern: choose a payment gateway by name at runtime.",
        a: ["Each gateway is a bean implementing one interface, named by key.",
          "Inject Map<String, Gateway>; Spring fills it with bean name → bean.",
          "Look up by key, fail clearly for unknown keys."],
        code: `interface Gateway { String pay(int amt); }
@Component("upi") class Upi implements Gateway { public String pay(int a) { return "UPI ₹" + a; } }
@Component("card") class Card implements Gateway { public String pay(int a) { return "card ₹" + a; } }
@Component class Payments {
    private final Map<String, Gateway> gateways;
    Payments(Map<String, Gateway> gateways) { this.gateways = gateways; }
    String pay(String method, int amt) {
        Gateway g = gateways.get(method);
        if (g == null) throw new IllegalArgumentException("unknown method " + method + ", known " + new TreeSet<>(gateways.keySet()));
        return g.pay(amt);
    }
}
@Configuration @ComponentScan class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    Payments p = ctx.getBean(Payments.class);
    System.out.println(p.pay("upi", 250) + " | " + p.pay("card", 999));
    try { p.pay("cash", 10); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
}` },
      { level: "Hard", q: "Explain how Spring creates AOP proxies and the limitations that follow.",
        a: ["An auto-proxy creator (a BeanPostProcessor) checks each bean after initialisation against advisors (aspects, @Transactional, @Async, @Cacheable).",
          "If any apply, it returns a proxy: JDK dynamic proxy (interfaces) or CGLIB subclass (Boot default).",
          "The proxy runs the interceptor chain, then calls the target.",
          "Limits: only external calls through the proxy are advised (no self-invocation), no private methods, no final methods/classes with CGLIB, and the bean's runtime class differs (instanceof on the concrete class can fail with JDK proxies).",
          "For field access or constructors, AspectJ weaving is needed instead."] },
      { level: "Hard", q: "Write a BeanPostProcessor that logs slow methods on beans annotated with a custom @Timed annotation.",
        a: ["Define a runtime annotation.",
          "In postProcessAfterInitialization, wrap matching beans in a JDK proxy over their interfaces.",
          "The handler times each call and logs those above a threshold.",
          "In real projects use Spring AOP or Micrometer's @Timed instead."],
        code: `@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) @interface Timed { }
interface Search { String find(String q) throws InterruptedException; }
@Component @Timed class SlowSearch implements Search { public String find(String q) throws InterruptedException { Thread.sleep(30); return "results for " + q; } }
@Component class TimedPostProcessor implements BeanPostProcessor {
    public Object postProcessAfterInitialization(Object bean, String name) {
        if (!bean.getClass().isAnnotationPresent(Timed.class)) return bean;
        return java.lang.reflect.Proxy.newProxyInstance(bean.getClass().getClassLoader(), bean.getClass().getInterfaces(), (proxy, m, args) -> {
            long t = System.nanoTime();
            try { return m.invoke(bean, args); }
            finally { long ms = (System.nanoTime() - t) / 1_000_000; if (ms >= 20) System.out.println("SLOW " + name + "." + m.getName() + " ≥ 20 ms"); }
        });
    }
}
@Configuration @ComponentScan class AppConfig { }
try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
    System.out.println(ctx.getBean(Search.class).find("flights"));
}` },
      { level: "Hard", q: "Your app fails at startup after adding a second DataSource and also shows a circular dependency. How do you approach both?",
        steps: ["Read the failure analysis: NoUniqueBeanDefinitionException lists the candidates and the injection point.",
          "Mark the main DataSource @Primary and inject the other with @Qualifier; give each its own config (properties prefix, EntityManagerFactory, transaction manager).",
          "For the cycle, read the reported chain (A → B → A) and find the shared responsibility.",
          "Extract it into a new bean, or invert one dependency with events/callbacks; avoid allow-circular-references=true.",
          "Prefer constructor injection everywhere so cycles surface immediately, and add a context-load test (@SpringBootTest) to CI."] }
    ],
    recap: [
      "The ApplicationContext creates and wires beans; you declare them with @Component or @Bean.",
      "Prefer constructor injection; resolve multiple candidates with @Primary, @Qualifier or collections.",
      "Singletons are shared and created once: inject prototypes via ObjectProvider, @Lookup or scoped proxies.",
      "Lifecycle: construct, inject, Aware, BPP before, init callbacks, BPP after (proxies), destroy.",
      "AOP works through proxies: no self-invocation, no private or final methods."
    ]
  });
})();
