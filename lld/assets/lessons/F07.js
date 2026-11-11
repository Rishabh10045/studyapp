/* Lesson F07: Abstract Factory */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  H.pattern({
    code: "F07", name: "Abstract Factory",
    summary: "Abstract Factory provides an interface for creating **families of related objects** without naming their concrete classes, so the products you get always match each other. This lesson covers the UML, a UI-theme implementation, a regional checkout kit (India vs US: payment, tax and formatting), a multi-cloud storage and queue design, choosing the factory once at the composition root, JDK and Spring usages, and how it differs from Factory Method, Builder and plain DI.",
    intent: "Provide an interface for creating **families of related or dependent objects** without specifying their concrete classes.",
    problem: {
      text: "Some objects only make sense together: a dark-theme button with a dark-theme dialog; an AWS storage client with an AWS queue client; Indian GST with an INR formatter and UPI. If each one is created separately with its own `if (theme == DARK)`, nothing stops a mismatched mix, and the `if` is copied into every place that creates any product.",
      points: [
        "One **factory object per family** (`DarkThemeFactory`, `AwsCloudFactory`, `IndiaCheckoutKit`) creates every product of that family",
        "The client receives **one factory** and asks it for all products, so consistency is guaranteed by construction",
        "Switching the whole family is a **one-line change** where the factory is chosen (usually `main` or config)",
        "Adding a new *family* is easy (one new factory); adding a new *product type* is hard (every factory changes)"],
      code: `enum Theme { LIGHT, DARK }

class SettingsScreen {
    String render(Theme t) {
        String button = t == Theme.DARK ? "DarkButton" : "LightButton";      // decided here...
        String dialog = t == Theme.LIGHT ? "LightDialog" : "LightDialog";    // ...and here (bug: always light)
        return button + " + " + dialog;
    }
}

System.out.println(new SettingsScreen().render(Theme.DARK));   // DarkButton + LightDialog: a mismatched family` },
    analogy: "IKEA furniture collections. Pick \"HEMNES\" and the bed, wardrobe and nightstand all come in the same style and finish. You choose the collection once, and every piece you get from it matches. The factory is the collection; the products are the pieces.",
    structure: {
      text: "**AbstractFactory** declares one creation method per product type. Each **ConcreteFactory** implements all of them for one family. **AbstractProduct** interfaces define each product type, and the client only ever uses the abstract interfaces.",
      m: H.cd(["classDiagram",
        "  class GuiFactory { <<interface>>; +createButton() Button; +createDialog() Dialog }",
        "  class LightFactory { +createButton() Button; +createDialog() Dialog }",
        "  class DarkFactory { +createButton() Button; +createDialog() Dialog }",
        "  class Button { <<interface>>; +render() String }",
        "  class Dialog { <<interface>>; +render() String }",
        "  class Client { -GuiFactory factory }",
        "  GuiFactory <|.. LightFactory",
        "  GuiFactory <|.. DarkFactory",
        "  Button <|.. LightButton", "  Button <|.. DarkButton",
        "  Dialog <|.. LightDialog", "  Dialog <|.. DarkDialog",
        "  LightFactory ..> LightButton", "  LightFactory ..> LightDialog",
        "  DarkFactory ..> DarkButton", "  DarkFactory ..> DarkDialog",
        "  Client --> GuiFactory"]),
      roles: [["AbstractFactory", "Interface with one `createX()` per product type"], ["ConcreteFactory", "Implements all creation methods for one family"], ["AbstractProduct", "Interface per product type (`Button`, `Dialog`)"], ["ConcreteProduct", "One family's implementation of a product type"], ["Client", "Holds a factory reference; uses only abstract types"]],
      points: ["Each `createX()` is itself a factory method; Abstract Factory is often implemented as a set of factory methods", "Concrete factories are usually stateless, so share one instance"] },
    impl: {
      title: "Java implementation: UI themes",
      text: "The screen receives a `GuiFactory` and never mentions a theme. Choosing the factory happens once, in `main`. A high-contrast theme for accessibility would be one new factory plus its products; `SettingsScreen` doesn't change.",
      code: `interface Button { String render(); }
interface Dialog { String render(); }
interface GuiFactory { Button createButton(String label); Dialog createDialog(String title); }

record LightButton(String label) implements Button { public String render() { return "[" + label + "] (black on white)"; } }
record LightDialog(String title) implements Dialog { public String render() { return "┌ " + title + " ┐ (white)"; } }
record DarkButton(String label) implements Button { public String render() { return "[" + label + "] (white on #121212)"; } }
record DarkDialog(String title) implements Dialog { public String render() { return "┌ " + title + " ┐ (#1e1e1e)"; } }

final class LightFactory implements GuiFactory {
    public Button createButton(String l) { return new LightButton(l); }
    public Dialog createDialog(String t) { return new LightDialog(t); }
}
final class DarkFactory implements GuiFactory {
    public Button createButton(String l) { return new DarkButton(l); }
    public Dialog createDialog(String t) { return new DarkDialog(t); }
}

class SettingsScreen {
    private final GuiFactory ui;
    SettingsScreen(GuiFactory ui) { this.ui = ui; }
    String render() { return ui.createDialog("Settings").render() + " " + ui.createButton("Save").render(); }
}

boolean osDarkMode = true;                                        // composition root decides once
GuiFactory factory = osDarkMode ? new DarkFactory() : new LightFactory();
System.out.println(new SettingsScreen(factory).render());` },
    variants: [
      { title: "The extension trade-off: new families vs new products",
        text: "Abstract Factory makes one axis of change cheap and the other expensive. Know this trade-off before using it, because interviewers ask \"what if we add a Checkbox?\"",
        table: [
          ["Change", "Cost", "Why"],
          ["New family (High-contrast theme, Azure cloud)", "**Cheap**: add 1 factory + its products", "Existing factories and clients are untouched (OCP)"],
          ["New product type (Checkbox, Cache client)", "**Expensive**: edit the interface and *every* factory", "The abstract factory interface fixes the set of products"],
          ["Mix of families (dark buttons, light dialogs)", "Impossible by design", "That's the point; if you need mixing, it's not a family"]],
        points: [
          "Mitigation for new products: a Java `default` method in the factory interface (with a sensible fallback) avoids breaking every factory at once",
          "A parameterised `create(Class<T> type)` factory is more flexible but loses compile-time safety",
          "If families rarely change but product types grow often, plain DI of each product (or separate factories) fits better"],
        code: `interface Button { String render(); }
interface Checkbox { String render(); }
interface GuiFactory {
    Button createButton();
    // added later: a default keeps existing factories compiling, with a neutral fallback
    default Checkbox createCheckbox() { return () -> "[ ] (default style)"; }
}
class DarkFactory implements GuiFactory {
    public Button createButton() { return () -> "[Save] dark"; }
    public Checkbox createCheckbox() { return () -> "[x] dark"; }       // updated family
}
class LegacyFactory implements GuiFactory {
    public Button createButton() { return () -> "[Save] legacy"; }      // not updated yet: still compiles
}

for (GuiFactory f : List.of(new DarkFactory(), new LegacyFactory()))
    System.out.println(f.createButton().render() + " | " + f.createCheckbox().render());` },
      { title: "Choosing and holding the factory",
        text: "The factory is picked **once**, from configuration or environment, at the composition root, then injected. The rest of the code never sees the choice. That single decision point is what makes swapping families safe.",
        points: [
          "Select by config: `factories.get(config.get(\"cloud\"))` using a small registry (a Simple Factory of factories)",
          "Concrete factories are stateless, so a single shared instance is normal (often a Spring bean)",
          "In Spring the same effect comes from `@Profile(\"aws\")` / `@ConditionalOnProperty` on a `@Configuration` that defines the family's beans: an Abstract Factory expressed as configuration",
          "In tests, inject an in-memory family (`FakeCloudFactory`) to run the whole app without real cloud services"],
        m: M(["flowchart LR",
          "  CFG[\"config / env<br/><span class='d'>cloud=aws</span>\"] --> ROOT[\"<b>main / composition root</b><br/><span class='d'>picks ONE factory</span>\"]:::s0",
          "  ROOT --> F[\"<b>AwsCloudFactory</b>\"]:::s1",
          "  F --> S[\"S3Storage\"]",
          "  F --> Q[\"SqsQueue\"]",
          "  F --> K[\"KmsSecrets\"]",
          "  ROOT -->|injects factory or products| APP[\"<b>UploadService, Workers</b><br/><span class='d'>see only interfaces</span>\"]:::s2"]) }
    ],
    designs: [
      { title: "Mini LLD: a regional checkout kit (India vs US)",
        text: "An e-commerce checkout must launch in India and the US. Each region needs a **matching set**: payment processor (UPI vs card-first), tax calculator (GST vs state sales tax), price formatter (₹ with lakh grouping vs $) and invoice numbering. Mixing them (GST on a US order, ₹ formatting with USD) would be a real bug, so this is a genuine family.",
        points: [
          "`CheckoutKit` (abstract factory) creates `TaxCalculator`, `PriceFormatter` and `PaymentProcessor`",
          "`IndiaKit` and `UsKit` are the concrete families; `CheckoutService` receives a kit chosen from the store's region",
          "Adding a UAE store: one `UaeKit` (VAT 5%, AED formatting); nothing else changes",
          "Products are strategies; the factory's job is to hand out a **consistent** set of them"],
        m: H.cd(["classDiagram",
          "  class CheckoutKit { <<interface>>; +tax() TaxCalculator; +formatter() PriceFormatter; +payments() PaymentProcessor }",
          "  class IndiaKit", "  class UsKit",
          "  class TaxCalculator { <<interface>>; +tax(long subtotal) long }",
          "  class PriceFormatter { <<interface>>; +format(long minor) String }",
          "  class PaymentProcessor { <<interface>>; +charge(long amount) String }",
          "  class CheckoutService { -CheckoutKit kit; +checkout(long subtotal) String }",
          "  CheckoutKit <|.. IndiaKit", "  CheckoutKit <|.. UsKit",
          "  IndiaKit ..> GstCalculator", "  IndiaKit ..> InrFormatter", "  IndiaKit ..> UpiProcessor",
          "  UsKit ..> SalesTaxCalculator", "  UsKit ..> UsdFormatter", "  UsKit ..> CardProcessor",
          "  CheckoutService --> CheckoutKit"]),
        code: `interface TaxCalculator { long tax(long subtotal); }
interface PriceFormatter { String format(long minorUnits); }
interface PaymentProcessor { String charge(long amount); }
interface CheckoutKit { TaxCalculator tax(); PriceFormatter formatter(); PaymentProcessor payments(); }

final class IndiaKit implements CheckoutKit {
    public TaxCalculator tax() { return s -> s * 18 / 100; }                              // GST 18%
    public PriceFormatter formatter() { return p -> "₹" + lakhs(p / 100); }              // 1,77,000 style
    static String lakhs(long n) {
        String s = Long.toString(n);
        if (s.length() <= 3) return s;
        String head = s.substring(0, s.length() - 3), tail = s.substring(s.length() - 3);
        return head.replaceAll("\\\\B(?=(\\\\d{2})+$)", ",") + "," + tail;
    }
    public PaymentProcessor payments() { return a -> "UPI collect request for " + a; }
}
final class UsKit implements CheckoutKit {
    private final int stateTaxPct;
    UsKit(int stateTaxPct) { this.stateTaxPct = stateTaxPct; }
    public TaxCalculator tax() { return s -> s * stateTaxPct / 100; }
    public PriceFormatter formatter() { return p -> String.format("$%,d.%02d", p / 100, p % 100); }
    public PaymentProcessor payments() { return a -> "Card auth for " + a; }
}

class CheckoutService {
    private final CheckoutKit kit;
    CheckoutService(CheckoutKit kit) { this.kit = kit; }
    String checkout(long subtotal) {
        long total = subtotal + kit.tax().tax(subtotal);
        return kit.formatter().format(total) + " -> " + kit.payments().charge(total);
    }
}

Map<String, CheckoutKit> kits = Map.of("IN", new IndiaKit(), "US-CA", new UsKit(7));   // chosen per store
System.out.println(new CheckoutService(kits.get("IN")).checkout(1_50_000_00L));      // ₹1,50,000 subtotal
System.out.println(new CheckoutService(kits.get("US-CA")).checkout(2_000_00L));` },
      { title: "Mini LLD: a multi-cloud file-processing service",
        text: "A service accepts uploads, stores them, and queues a processing job. It must run on AWS or GCP, or entirely in memory for tests. **Storage and queue must come from the same provider** (credentials, region and IAM all differ), so they form a family.",
        points: [
          "`CloudFactory` → `BlobStore` + `JobQueue`; `AwsFactory` (S3 + SQS), `GcpFactory` (GCS + Pub/Sub), `InMemoryFactory` (maps and a deque)",
          "`UploadService` depends only on the interfaces; integration tests run against `InMemoryFactory`",
          "Real code would call the vendor SDKs inside the products; the sketch below prints instead"],
        m: H.cd(["classDiagram", "  direction LR",
          "  class CloudFactory { <<interface>>; +blobStore() BlobStore; +jobQueue() JobQueue }",
          "  class BlobStore { <<interface>>; +put(String key, byte[] data) String }",
          "  class JobQueue { <<interface>>; +publish(String job) void }",
          "  class UploadService { -BlobStore store; -JobQueue queue; +upload(String name, byte[] data) String }",
          "  CloudFactory <|.. AwsFactory", "  CloudFactory <|.. GcpFactory", "  CloudFactory <|.. InMemoryFactory",
          "  UploadService ..> CloudFactory : built from"]),
        code: `interface BlobStore { String put(String key, byte[] data); }
interface JobQueue { void publish(String job); List<String> pending(); }
interface CloudFactory { BlobStore blobStore(); JobQueue jobQueue(); }

final class InMemoryFactory implements CloudFactory {
    private final Map<String, byte[]> blobs = new ConcurrentHashMap<>();
    private final Deque<String> jobs = new ConcurrentLinkedDeque<>();
    public BlobStore blobStore() { return (k, d) -> { blobs.put(k, d); return "mem://" + k; }; }
    public JobQueue jobQueue() {
        return new JobQueue() {
            public void publish(String job) { jobs.add(job); }
            public List<String> pending() { return List.copyOf(jobs); }
        };
    }
}
final class AwsFactory implements CloudFactory {
    private final String region;
    AwsFactory(String region) { this.region = region; }
    public BlobStore blobStore() { return (k, d) -> "s3://uploads-" + region + "/" + k; }      // S3 SDK here
    public JobQueue jobQueue() {
        return new JobQueue() {
            public void publish(String job) { System.out.println("SQS(" + region + ") <- " + job); }
            public List<String> pending() { return List.of(); }
        };
    }
}

class UploadService {
    private final BlobStore store; private final JobQueue queue;
    UploadService(CloudFactory cloud) { store = cloud.blobStore(); queue = cloud.jobQueue(); }   // same family
    String upload(String name, byte[] data) {
        String url = store.put(UUID.nameUUIDFromBytes(data) + "-" + name, data);
        queue.publish("thumbnail " + url);
        return url;
    }
}

InMemoryFactory test = new InMemoryFactory();
UploadService svc = new UploadService(test);
System.out.println(svc.upload("cat.png", new byte[]{1, 2, 3}) + " | queued: " + test.jobQueue().pending().size());
System.out.println(new UploadService(new AwsFactory("ap-south-1")).upload("dog.png", new byte[]{4}));` }
    ],
    usages: [
      ["`javax.xml.parsers.DocumentBuilderFactory` / `TransformerFactory`", "`newInstance()` returns a provider-specific factory (Xerces, Saxon…) that creates a matching family of parser objects."],
      ["`java.sql.Connection`", "Acts as a factory for a vendor-consistent family: `createStatement()`, `prepareStatement()`, `createBlob()`; the MySQL connection gives you MySQL statements."],
      ["`javax.swing.UIManager` + `LookAndFeel`", "A look-and-feel supplies a consistent family of UI delegates for every component type (Metal, Nimbus, the system L&F)."],
      ["`java.nio.file.FileSystem`", "Each file system (default, zip, in-memory such as Jimfs) creates matching `Path`, `PathMatcher` and `WatchService` objects."],
      ["Spring `@Profile` / `@ConditionalOnProperty` configurations", "A `@Configuration` per environment that defines a whole family of beans (`aws` profile: S3 + SQS beans; `local`: in-memory ones) is Abstract Factory expressed as configuration."],
      ["Spring `ConnectionFactory` (JMS/AMQP), `RedisConnectionFactory`", "Create provider-consistent connections and sessions (ActiveMQ vs RabbitMQ; Lettuce vs Jedis)."]
    ],
    avoid: {
      points: [
        "Only one family exists, or products are independent (they never need to match): inject each product separately",
        "Product types change often: every new product type touches every factory",
        "You only need to vary one object: that's a Factory Method or a registry, not an Abstract Factory",
        "Don't build a factory hierarchy that just mirrors your DI container's job; with Spring, profile-based configuration often suffices",
        "In a 90-minute round, use it only when the problem has an explicit \"family\" (themes, providers, regions, game difficulty kits)"],
      pros: ["Guarantees consistent families", "Clients are decoupled from all concrete product classes", "Swap a whole family in one place", "Easy to add new families (OCP on that axis)"],
      cons: ["Adding a product type changes every factory", "Many classes (factories × products)", "Extra indirection when there's really one family", "Can overlap with what DI configuration already does"] },
    compare: [
      ["Factory Method (F06)", "One product; a subclass decides the class", "Inheritance and one method vs a factory *object* with a method per product type, ensuring a consistent family"],
      ["Builder (F08)", "Assemble one complex product step by step", "Builder returns one object at the end of several steps; Abstract Factory returns several related objects immediately"],
      ["Prototype (F09)", "Create by cloning", "A prototype-based factory clones registered instances instead of having a subclass per family"],
      ["Strategy (F17)", "Swap one algorithm", "The products of an Abstract Factory are often strategies; the factory ensures a matching *set* of them"],
      ["Bridge (F15)", "Separate an abstraction from its implementation", "An Abstract Factory is often used to create and configure the right Bridge implementation family"],
      ["DI container / profiles", "Wire dependencies from config", "Profiles can replace hand-written abstract factories for app-wide families; you still need one for runtime family choice (per store, per tenant)"]],
    widget: { heading: "Interactive: name that creational pattern", caption: "Ten snippets from real-looking code. Identify which creational pattern (if any) each one uses. Your answers are saved.",
      render: H.widgets.picker({
        intro: "Look at **who decides the concrete class** and **how many objects** come out. A factory object creating several matching products is the tell for Abstract Factory.",
        question: "Which pattern is this?", noun: "Snippets",
        options: ["Static factory", "Simple / registry factory", "Factory Method", "Abstract Factory", "Builder", "Prototype"],
        items: [
          { title: "Theme kit", code: "interface Theme { Button button(); Icon icon(); Font font(); }\nclass DarkTheme implements Theme { /* dark versions of all three */ }\nScreen s = new Screen(new DarkTheme());", answer: "Abstract Factory", why: "One factory object creates a matching family of three product types." },
          { title: "HttpRequest", code: "HttpRequest req = HttpRequest.newBuilder(URI.create(url))\n    .header(\"Accept\", \"application/json\")\n    .timeout(Duration.ofSeconds(5))\n    .POST(BodyPublishers.ofString(json))\n    .build();", answer: "Builder", why: "Step-by-step configuration of one complex object, finished by `build()`." },
          { title: "Collection.iterator()", code: "abstract class AbstractList<E> {\n    public Iterator<E> iterator() { return new Itr(); }   // subclasses may override\n}\nfor (Iterator<String> it = list.iterator(); it.hasNext();) { ... }", answer: "Factory Method", why: "An overridable method lets each subclass decide which `Iterator` to create." },
          { title: "Optional.of", code: "Optional<User> u = Optional.of(user);\nOptional<User> none = Optional.empty();   // shared EMPTY instance", answer: "Static factory", why: "Static creation methods with names, validation and a cached empty instance." },
          { title: "Template documents", code: "Invoice template = invoiceTemplates.get(\"GST-B2B\");\nInvoice inv = template.copy();\ninv.setCustomer(c);", answer: "Prototype", why: "A configured instance is copied and then customised (F09)." },
          { title: "Channel registry", code: "Map<Channel, Supplier<Notifier>> reg = new EnumMap<>(Channel.class);\nreg.put(Channel.SMS, SmsNotifier::new);\nNotifier n = reg.get(user.preferredChannel()).get();", answer: "Simple / registry factory", why: "A runtime choice of one product type from a key, via a registry." },
          { title: "JDBC connection", code: "Connection c = dataSource.getConnection();\nStatement st = c.createStatement();\nPreparedStatement ps = c.prepareStatement(sql);\nBlob b = c.createBlob();", answer: "Abstract Factory", why: "The vendor's `Connection` creates a consistent family of vendor-specific objects." },
          { title: "Game level spawner", code: "abstract class Level {\n    protected abstract Enemy createEnemy();\n    List<Enemy> wave(int n) { /* calls createEnemy() n times */ }\n}\nclass IceLevel extends Level { protected Enemy createEnemy() { return new Yeti(); } }", answer: "Factory Method", why: "The base class's algorithm defers the creation step to subclasses." },
          { title: "Cloud kit", code: "interface Cloud { BlobStore storage(); JobQueue queue(); SecretStore secrets(); }\nCloud cloud = cfg.isAws() ? new AwsCloud(region) : new GcpCloud(project);", answer: "Abstract Factory", why: "A whole provider family is selected once and products always match." },
          { title: "Lombok-style user", code: "User u = User.builder()\n    .name(\"Asha\").email(\"a@x.in\")\n    .roles(Set.of(Role.ADMIN))\n    .build();", answer: "Builder", why: "Named optional parameters assembled into one immutable object." }
        ]
      }) },
    pitfalls: [
      "Using Abstract Factory for a single product type; that's a Factory Method or a registry",
      "Products that don't actually need to match; then it's needless coupling between unrelated creations",
      "Clients that still `instanceof`/cast products to concrete family types, which defeats the abstraction",
      "Choosing the family in many places instead of once at the composition root",
      "Forgetting the cost of adding a product type (every factory changes); mention `default` methods as mitigation",
      "Stateful factories shared across threads; keep factories stateless or create products per call",
      "Calling any class named `XxxFactory` an Abstract Factory",
      "Rebuilding what Spring profiles already give you for app-wide environment switching"
    ],
    quiz: [
      { q: "What is the defining feature of Abstract Factory?", options: ["It creates one object step by step", "It creates **families** of related objects that are guaranteed to match, through one factory interface", "It always uses a static method", "It clones objects"], answer: 1, why: "The point is consistency across several product types." },
      { q: "With Abstract Factory, which change is expensive?", options: ["Adding a new family", "Adding a new product type to all families", "Switching families at startup", "Adding a client"], answer: 1, why: "Every concrete factory must implement the new creation method." },
      { q: "Which JDK type behaves like an Abstract Factory for a vendor-consistent family?", options: ["`java.util.ArrayList`", "`java.sql.Connection` (`createStatement`, `prepareStatement`, `createBlob`)", "`java.lang.String`", "`java.util.Optional`"], answer: 1, why: "A MySQL connection creates MySQL statements: a matching family." },
      { q: "Where should the concrete factory be chosen?", options: ["Inside each product", "In every client method that needs a product", "Once, at the composition root (from config), then injected", "Randomly"], answer: 2, why: "One decision point keeps families consistent and swappable." },
      { q: "How does Abstract Factory relate to Factory Method?", options: ["Unrelated", "An Abstract Factory's creation methods are often factory methods; it groups several of them on one object for a family", "Factory Method creates families", "They're identical"], answer: 1, why: "Abstract Factory = an object with several creation methods; each of those is a factory method." },
      { q: "You can add `createCheckbox()` to `GuiFactory` without breaking 5 existing factories by…", options: ["Making it `static`", "Adding it as a `default` method with a fallback implementation", "Deleting the old factories", "Using reflection"], answer: 1, why: "Java 8 default methods let interfaces evolve compatibly." },
      { q: "Spring's equivalent for an app-wide Abstract Factory chosen by environment is usually…", options: ["`@Profile`-specific `@Configuration` classes defining the family's beans", "`@Autowired` fields", "`@Transactional`", "`@Async`"], answer: 0, why: "A profile picks the whole family of beans at startup." },
      { q: "Which scenario does **not** call for Abstract Factory?", options: ["Light/dark UI kits", "AWS vs GCP storage + queue clients", "Choosing one of three discount strategies per order", "India vs US checkout kit (tax + payment + formatting)"], answer: 2, why: "One product type chosen at runtime is a Strategy (plus maybe a registry), not a family." }
    ],
    cheatsheet: {
      table: [
        ["Element", "In Java", "Example"],
        ["Abstract factory", "interface with `createX()` per product type", "`GuiFactory`, `CloudFactory`, `CheckoutKit`"],
        ["Concrete factory", "one class per family, usually stateless", "`DarkFactory`, `AwsFactory`, `IndiaKit`"],
        ["Abstract products", "one interface per product type", "`Button`, `Dialog`; `BlobStore`, `JobQueue`"],
        ["Selection", "once, in `main` / config / a `Map<String, Factory>`", "`kits.get(store.region())`"],
        ["Testing", "an in-memory family", "`InMemoryFactory`"]],
      cards: [
        { title: "Use it when", items: ["Products must match", "Families swap as a unit", "Clients shouldn't know vendors", "You want an in-memory family for tests"] },
        { title: "Trade-off", items: ["New family: cheap", "New product type: every factory changes", "Mitigate: `default` methods", "Many classes"] },
        { title: "Interview phrasing", items: ["\"Storage and queue must come from the same provider, so one factory per provider\"", "\"Chosen once in main\"", "\"Adding Azure is one class\""] }]
    },
    practice: [
      { level: "Easy", q: "Explain the difference between Factory Method and Abstract Factory with one example each.",
        a: ["**Factory Method**: one product type; a subclass overrides `createX()`. Example: `Exporter.createDocument()` with `CsvExporter`/`HtmlExporter`; or `Collection.iterator()`.",
          "**Abstract Factory**: an object that creates a *family* of products that must match. Example: `CloudFactory` creating `BlobStore` + `JobQueue` for AWS or GCP.",
          "Mechanism: inheritance (override one method) vs composition (inject a factory object).",
          "Tell: if the question says \"these must be consistent with each other\", think Abstract Factory."] },
      { level: "Easy", q: "A cross-platform desktop app needs `Button`, `Menu` and `FileDialog` for Windows, macOS and Linux. Sketch the classes and say how many you need, and what adding a `Tooltip` costs.",
        a: ["1 abstract factory (`PlatformWidgets`) + 3 concrete factories; 3 product interfaces + 9 concrete products (3 per platform). 16 types in total.",
          "Adding `Tooltip`: 1 new interface + 3 concrete tooltips + a new method on the factory interface and all 3 factories (or a `default` fallback).",
          "Adding a 4th platform: 1 factory + 3 products; nothing existing changes."],
        m: H.cd(["classDiagram",
          "  class PlatformWidgets { <<interface>>; +button() Button; +menu() Menu; +fileDialog() FileDialog }",
          "  PlatformWidgets <|.. WindowsWidgets", "  PlatformWidgets <|.. MacWidgets", "  PlatformWidgets <|.. LinuxWidgets",
          "  Editor --> PlatformWidgets"]) },
      { level: "Medium", q: "Game difficulty: Easy and Hard modes each need a matching `EnemySpawner`, `LootTable` and `AiBrain`. Implement it so a mode can't accidentally mix Hard enemies with Easy loot.",
        code: `interface EnemySpawner { int enemiesPerWave(int wave); }
interface LootTable { String drop(int roll); }
interface AiBrain { String decide(int playerHp); }
interface Difficulty { EnemySpawner spawner(); LootTable loot(); AiBrain ai(); }

final class Easy implements Difficulty {
    public EnemySpawner spawner() { return w -> 2 + w; }
    public LootTable loot() { return r -> r < 50 ? "potion" : "gold"; }
    public AiBrain ai() { return hp -> "wander"; }
}
final class Hard implements Difficulty {
    public EnemySpawner spawner() { return w -> 5 + 3 * w; }
    public LootTable loot() { return r -> r < 10 ? "potion" : "nothing"; }
    public AiBrain ai() { return hp -> hp < 30 ? "focus player" : "flank"; }
}

class Game {
    private final EnemySpawner spawner; private final LootTable loot; private final AiBrain ai;
    Game(Difficulty d) { spawner = d.spawner(); loot = d.loot(); ai = d.ai(); }     // one family, always consistent
    String turn(int wave, int roll, int hp) { return spawner.enemiesPerWave(wave) + " enemies, drop=" + loot.drop(roll) + ", ai=" + ai.decide(hp); }
}

System.out.println(new Game(new Easy()).turn(3, 40, 20));
System.out.println(new Game(new Hard()).turn(3, 40, 20));` },
      { level: "Medium", q: "Write an SQL **dialect kit** for MySQL and PostgreSQL: a paginator (`LIMIT/OFFSET` vs `LIMIT … OFFSET` / `FETCH FIRST`), an identifier quoter (backticks vs double quotes) and an upsert builder (`ON DUPLICATE KEY UPDATE` vs `ON CONFLICT … DO UPDATE`). The repository must never mix dialects.",
        code: `interface Paginator { String page(String sql, int page, int size); }
interface Quoter { String quote(String ident); }
interface UpsertBuilder { String upsert(String table, String key, List<String> cols); }
interface Dialect { Paginator paginator(); Quoter quoter(); UpsertBuilder upsert(); }

final class MySqlDialect implements Dialect {
    public Paginator paginator() { return (s, p, n) -> s + " LIMIT " + (p * n) + ", " + n; }
    public Quoter quoter() { return i -> "\`" + i + "\`"; }
    public UpsertBuilder upsert() {
        return (t, k, cols) -> "INSERT INTO " + quoter().quote(t) + " (" + String.join(", ", cols) + ") VALUES (?" + ", ?".repeat(cols.size() - 1)
                + ") ON DUPLICATE KEY UPDATE " + cols.stream().filter(c -> !c.equals(k)).map(c -> c + " = VALUES(" + c + ")").collect(Collectors.joining(", "));
    }
}
final class PostgresDialect implements Dialect {
    public Paginator paginator() { return (s, p, n) -> s + " LIMIT " + n + " OFFSET " + (p * n); }
    public Quoter quoter() { return i -> "\\"" + i + "\\""; }
    public UpsertBuilder upsert() {
        return (t, k, cols) -> "INSERT INTO " + quoter().quote(t) + " (" + String.join(", ", cols) + ") VALUES (?" + ", ?".repeat(cols.size() - 1)
                + ") ON CONFLICT (" + k + ") DO UPDATE SET " + cols.stream().filter(c -> !c.equals(k)).map(c -> c + " = EXCLUDED." + c).collect(Collectors.joining(", "));
    }
}

class UserRepository {
    private final Dialect d;
    UserRepository(Dialect d) { this.d = d; }
    String listSql(int page) { return d.paginator().page("SELECT * FROM " + d.quoter().quote("users"), page, 20); }
    String saveSql() { return d.upsert().upsert("users", "id", List.of("id", "email", "name")); }
}

for (Dialect d : List.of(new MySqlDialect(), new PostgresDialect())) {
    UserRepository r = new UserRepository(d);
    System.out.println(r.listSql(2));
    System.out.println(r.saveSql());
}`,
        follow: "Hibernate does exactly this with its `Dialect` classes. Which product would you add for `RETURNING id` vs `LAST_INSERT_ID()`? An `IdRetriever`, added to every dialect." },
      { level: "Medium", q: "How do you test code built on an Abstract Factory? Show a test that runs `UploadService` against an in-memory family and checks both products were used together.",
        a: "Provide a **fake family** that records what happened, inject it, and assert on the recordings. No mocks framework needed, and the production `UploadService` is untouched. The same fake family can back a local dev profile.",
        code: `interface BlobStore { String put(String key, byte[] data); }
interface JobQueue { void publish(String job); }
interface CloudFactory { BlobStore blobStore(); JobQueue jobQueue(); }

final class RecordingCloud implements CloudFactory {
    final List<String> events = new ArrayList<>();
    public BlobStore blobStore() { return (k, d) -> { events.add("put " + k); return "mem://" + k; }; }
    public JobQueue jobQueue() { return j -> events.add("publish " + j); }
}
class UploadService {
    private final BlobStore store; private final JobQueue queue;
    UploadService(CloudFactory c) { store = c.blobStore(); queue = c.jobQueue(); }
    String upload(String name, byte[] data) { String url = store.put(name, data); queue.publish("thumb " + url); return url; }
}

RecordingCloud cloud = new RecordingCloud();
new UploadService(cloud).upload("a.png", new byte[]{1});
if (!cloud.events.equals(List.of("put a.png", "publish thumb mem://a.png"))) throw new AssertionError(cloud.events);
System.out.println("test passed: " + cloud.events);` },
      { level: "Hard", q: "Design the integration layer for **two payment gateways** (Razorpay and Stripe). Each has its own order creation, signature verification for callbacks, refunds and webhook parsing, and they must never be mixed for one merchant. Draw the classes and explain the selection.",
        steps: [["Family", "`GatewayKit` → `OrderApi`, `SignatureVerifier`, `RefundApi`, `WebhookParser`. Mixing a Stripe verifier with Razorpay webhooks would accept forged or reject valid callbacks, so this is a true family."],
          ["Selection", "Each merchant record stores its gateway; a `GatewayKitRegistry` (`Map<GatewayType, GatewayKit>`) returns the kit per request. That's runtime selection, so it's not just DI config."],
          ["Normalisation", "Products return **your** domain types (`PaymentIntent`, `WebhookEvent`), never SDK classes, so services stay gateway-agnostic."],
          ["Extension", "Adding PayPal: one kit + four products. Adding \"payouts\": a new product in every kit (the known trade-off)."]],
        m: H.cd(["classDiagram",
          "  class GatewayKit { <<interface>>; +orders() OrderApi; +verifier() SignatureVerifier; +refunds() RefundApi; +webhooks() WebhookParser }",
          "  class GatewayKitRegistry { -Map~GatewayType, GatewayKit~ kits; +forMerchant(Merchant m) GatewayKit }",
          "  class PaymentService { -GatewayKitRegistry registry; +createIntent(Merchant m, long amt) PaymentIntent; +onWebhook(Merchant m, String body, String sig) void }",
          "  GatewayKit <|.. RazorpayKit", "  GatewayKit <|.. StripeKit",
          "  GatewayKitRegistry --> GatewayKit",
          "  PaymentService --> GatewayKitRegistry",
          "  RazorpayKit ..> RazorpayOrderApi", "  RazorpayKit ..> RazorpayVerifier",
          "  StripeKit ..> StripeOrderApi", "  StripeKit ..> StripeVerifier"]),
        follow: "Where do retries and idempotency keys go? A decorator around `OrderApi`/`RefundApi` (F11), shared by both kits." },
      { level: "Hard", q: "Implement a registry of regional kits with a **fallback**: stores in `IN-*` use the India kit, `US-<state>` builds a US kit with that state's tax rate, and unknown regions fail at startup, not at checkout.",
        code: `interface TaxCalculator { long tax(long subtotal); }
interface CheckoutKit { String region(); TaxCalculator tax(); }
record IndiaKit() implements CheckoutKit { public String region() { return "IN"; } public TaxCalculator tax() { return s -> s * 18 / 100; } }
record UsKit(String state, int pct) implements CheckoutKit { public String region() { return "US-" + state; } public TaxCalculator tax() { return s -> s * pct / 100; } }

final class KitRegistry {
    private static final Map<String, Integer> US_TAX = Map.of("CA", 7, "NY", 4, "TX", 6);
    private final Map<String, CheckoutKit> byStore = new HashMap<>();

    KitRegistry(Map<String, String> storeRegions) {                  // validate everything at startup
        storeRegions.forEach((store, region) -> byStore.put(store, build(region)));
    }
    private static CheckoutKit build(String region) {
        if (region.startsWith("IN")) return new IndiaKit();
        if (region.startsWith("US-")) {
            String st = region.substring(3);
            Integer pct = US_TAX.get(st);
            if (pct == null) throw new IllegalArgumentException("no tax table for " + region);
            return new UsKit(st, pct);
        }
        throw new IllegalArgumentException("unsupported region " + region);
    }
    CheckoutKit forStore(String store) { return Objects.requireNonNull(byStore.get(store), "unknown store " + store); }
}

KitRegistry reg = new KitRegistry(Map.of("blr-1", "IN-KA", "sf-1", "US-CA"));
System.out.println(reg.forStore("blr-1").tax().tax(1000) + " " + reg.forStore("sf-1").tax().tax(1000));
try { new KitRegistry(Map.of("x", "US-ZZ")); } catch (IllegalArgumentException e) { System.out.println("startup failed: " + e.getMessage()); }` },
      { level: "Hard", q: "An interviewer says: \"Your `CloudFactory` is just dependency injection with extra steps. Why not inject `BlobStore` and `JobQueue` separately?\" Give a balanced answer.",
        a: ["They're right when the family is chosen **once per application**: profile-based DI config (`@Profile(\"aws\")`) can wire matching beans and the factory interface adds little. In that case, inject the products directly and keep the family consistency in one configuration class.",
          "The factory earns its place when (1) the family is chosen **at runtime per request/tenant/store** (multi-tenant SaaS where each tenant has its own cloud account), (2) products must be **created repeatedly** (per job, per connection) rather than once, or (3) you want the type system to make mixing impossible across a large codebase.",
          "A middle ground: keep the `CloudFactory` interface as the *configuration unit*, but have DI call it once and inject the products, so services depend on `BlobStore`/`JobQueue` only (simplest for testing).",
          "Saying \"I'd drop the pattern here\" with that reasoning is a strong signal; patterns are tools, not goals."] }
    ],
    recap: [
      "Abstract Factory = one interface with a `createX()` per product type; each concrete factory produces a consistent family.",
      "Clients hold one factory, chosen once (composition root or a per-tenant/per-store registry), and see only abstract products.",
      "New family: cheap (one factory + products). New product type: expensive (every factory changes; `default` methods help).",
      "JDK/Spring: `java.sql.Connection`, `DocumentBuilderFactory`, `FileSystem`, Swing `LookAndFeel`, profile-specific `@Configuration` classes.",
      "Use it only for real families that must match: themes, cloud providers, regional kits, SQL dialects, gateway SDKs."
    ]
  });
})();
