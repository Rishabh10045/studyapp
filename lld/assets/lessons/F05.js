/* Lesson F05: Singleton */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  H.pattern({
    code: "F05", name: "Singleton",
    summary: "Singleton guarantees one instance of a class and gives a global access point to it. This lesson covers eager, lazy, synchronized, double-checked locking (and why `volatile`), the holder idiom and enum singletons; how reflection, serialization and cloning break singletons; a logger and ID-generator design; Singleton vs Spring singleton scope vs static classes; and why dependency injection is usually the better answer.",
    intent: "Ensure a class has **exactly one instance** in the process, and provide a **global point of access** to it.",
    problem: {
      text: "Some resources must be unique: one configuration loaded once, one connection pool, one in-process cache, one ID sequence. If every caller does `new`, you get several pools fighting for connections, configs that drift apart, or duplicate IDs.",
      points: [
        "The class itself controls instantiation: a **private constructor** stops `new` from outside",
        "A **static accessor** (`getInstance()`) creates the instance once and returns it every time",
        "Hard parts: lazy creation under **concurrency**, and attacks via reflection, serialization and cloning",
        "In modern Java code the *one-instance* need is usually met by a DI container (Spring beans are singletons by default) rather than the pattern itself"],
      code: `class ConfigLoader {                       // no control: anyone can create more
    final Map<String, String> props = new HashMap<>();
    ConfigLoader() { System.out.println("reading config file..."); props.put("db.url", "jdbc:x"); }
}

new ConfigLoader();          // OrderService loads it
new ConfigLoader();          // PaymentService loads it again
new ConfigLoader();          // ...and again: three reads, three copies that can drift` },
    analogy: "A country's president (at any given time) or the single Reserve Bank of India: everyone who needs \"the\" central bank refers to the same one, and nobody can just create another.",
    structure: {
      text: "One class, one static field holding the instance, a private constructor, and a static accessor. That's the whole pattern; the variants differ only in **when** and **how safely** the field is set.",
      m: H.cd(["classDiagram",
        "  class Singleton { -Singleton instance$; -Singleton(); +getInstance()$ Singleton; +operation() void }",
        "  class Client",
        "  Client ..> Singleton : getInstance()",
        "  Singleton --> Singleton : instance"]),
      roles: [["Singleton", "Holds the one instance in a static field, hides its constructor, exposes `getInstance()`"], ["Client", "Calls `Singleton.getInstance()` instead of `new`; it never controls the lifecycle"]],
      points: ["Mermaid underlines static members (`$`)", "The self-association shows the class holding a reference to its own single instance"] },
    impl: {
      title: "Java implementation: eager and enum (the two safe defaults)",
      text: "If the instance is cheap or always needed, create it **eagerly**: the JVM's class initialisation is thread-safe, so there's nothing to get wrong. If you also want protection against reflection and serialization, use a single-element **enum**, which *Effective Java* (Item 3) calls the best way to implement a singleton.",
      points: [
        "Eager: `static final` field initialised at class-load time; thread-safe for free, no locks",
        "Enum: the JVM guarantees one instance per constant, blocks reflective construction, and handles serialization",
        "Enum can't extend another class (it can implement interfaces), and it's always eager"],
      code: `final class AppConfig {
    private static final AppConfig INSTANCE = new AppConfig();   // eager, thread-safe via class init
    private final Map<String, String> props = new HashMap<>();
    private AppConfig() { props.put("db.url", "jdbc:postgresql://db/app"); props.put("pool.size", "10"); }
    static AppConfig getInstance() { return INSTANCE; }
    String get(String key) { return props.get(key); }
}

enum IdGenerator {                                            // enum singleton
    INSTANCE;
    private final AtomicLong next = new AtomicLong(1000);
    long nextId() { return next.getAndIncrement(); }
}

System.out.println(AppConfig.getInstance() == AppConfig.getInstance());   // true
System.out.println(AppConfig.getInstance().get("pool.size"));            // 10
System.out.println(IdGenerator.INSTANCE.nextId() + ", " + IdGenerator.INSTANCE.nextId());   // 1000, 1001` },
    variants: [
      { title: "Lazy initialisation and the thread-safety ladder",
        text: "When creation is expensive and might not be needed, create it **on first use**. The naive version is broken under concurrency; each step up the ladder fixes something at a cost. In interviews, walk this ladder out loud and finish on the holder idiom or enum.",
        table: [
          ["Variant", "Thread-safe?", "Lazy?", "Cost / catch"],
          ["Naive lazy `if (i == null) i = new …`", "No", "Yes", "two threads can both see null and create two instances"],
          ["`synchronized` getInstance()", "Yes", "Yes", "every call takes a lock, even after creation"],
          ["Double-checked locking + `volatile`", "Yes (Java 5+)", "Yes", "subtle; without `volatile` another thread can see a half-constructed object"],
          ["Holder idiom (static nested class)", "Yes", "Yes", "no locks; relies on lazy class init; the recommended lazy form"],
          ["Eager `static final`", "Yes", "No", "created at class load even if never used"],
          ["Enum", "Yes", "No", "also safe from reflection and serialization; can't extend a class"]],
        code: `class NaiveLazy {                                        // BROKEN under concurrency
    private static NaiveLazy instance;
    private NaiveLazy() {}
    static NaiveLazy getInstance() {
        if (instance == null) instance = new NaiveLazy();     // check-then-act race
        return instance;
    }
}

class SyncLazy {                                         // correct but locks on every call
    private static SyncLazy instance;
    private SyncLazy() {}
    static synchronized SyncLazy getInstance() {
        if (instance == null) instance = new SyncLazy();
        return instance;
    }
}

class DclLazy {                                          // double-checked locking
    private static volatile DclLazy instance;           // volatile is essential
    private DclLazy() {}
    static DclLazy getInstance() {
        DclLazy local = instance;                        // one volatile read on the fast path
        if (local == null) {
            synchronized (DclLazy.class) {
                local = instance;
                if (local == null) instance = local = new DclLazy();
            }
        }
        return local;
    }
}

class HolderLazy {                                       // initialization-on-demand holder
    private HolderLazy() { System.out.println("HolderLazy created"); }
    private static class Holder { static final HolderLazy INSTANCE = new HolderLazy(); }
    static HolderLazy getInstance() { return Holder.INSTANCE; }   // Holder loads on first call
}

System.out.println("before first call");
System.out.println(HolderLazy.getInstance() == HolderLazy.getInstance());` },
      { title: "Why double-checked locking needs volatile",
        text: "`instance = new DclLazy()` is not one step. The JVM allocates memory, runs the constructor, and publishes the reference, and without a happens-before edge it may **reorder** publication before construction finishes. A second thread on the unsynchronized fast path can then see a non-null reference to an object whose fields are still default values. `volatile` forbids that reordering and makes the write visible to all threads.",
        points: [
          "Step 1: allocate memory. Step 2: run the constructor. Step 3: assign the reference. Steps 2 and 3 can be reordered without `volatile`",
          "Thread B's outer `if (instance == null)` is **outside** the lock, so the lock gives B no visibility guarantee",
          "Java 5's memory model (JSR-133) made `volatile` publication safe; before that DCL was simply broken",
          "Copying into a local (`local = instance`) halves the volatile reads on the fast path, a small optimisation you can mention",
          "Simplest answer in an interview: \"I'd use the holder idiom or an enum, which avoid this entirely\""],
        m: M(["sequenceDiagram",
          "  participant A as Thread A",
          "  participant Mem as Heap / instance field",
          "  participant B as Thread B",
          "  A->>Mem: lock, instance == null",
          "  A->>Mem: allocate object",
          "  A->>Mem: instance = ref (reordered early!)",
          "  B->>Mem: instance != null (no lock)",
          "  B->>B: use object, fields not yet set",
          "  A->>Mem: run constructor (too late)",
          "  Note over A,B: volatile forbids this reorder:<br/>the constructor finishes before the reference is visible"]) },
      { title: "Breaking a singleton: reflection, serialization, cloning",
        text: "A private constructor only stops polite callers. Interviewers like to ask how a singleton can be broken and how to defend it. The enum form defends against all three automatically, which is the main argument for it.",
        table: [
          ["Attack", "How", "Defence (class-based)", "Enum?"],
          ["Reflection", "`getDeclaredConstructor().setAccessible(true).newInstance()`", "throw from the constructor if the instance already exists", "Safe: `Constructor.newInstance` refuses enums"],
          ["Serialization", "serialize, then deserialize, which creates a new object", "implement `readResolve()` returning the instance", "Safe: enums deserialize to the same constant"],
          ["Cloning", "`clone()` if the class (or a parent) is `Cloneable`", "don't implement `Cloneable`, or override `clone()` to throw", "Safe: enums can't be cloned"],
          ["Multiple class loaders", "the same class loaded by two loaders gives two \"singletons\"", "load from a common parent loader", "Same problem (one per loader)"]],
        code: `class Guarded implements Serializable {
    private static final Guarded INSTANCE = new Guarded();
    private static boolean created;
    private Guarded() {
        synchronized (Guarded.class) {
            if (created) throw new IllegalStateException("use getInstance()");   // reflection guard
            created = true;
        }
    }
    static Guarded getInstance() { return INSTANCE; }
    private Object readResolve() { return INSTANCE; }                          // serialization guard
}

var ctor = Guarded.class.getDeclaredConstructor();
ctor.setAccessible(true);
try { ctor.newInstance(); } catch (java.lang.reflect.InvocationTargetException e) { System.out.println("reflection blocked: " + e.getCause().getMessage()); }

ByteArrayOutputStream bytes = new ByteArrayOutputStream();
try (ObjectOutputStream out = new ObjectOutputStream(bytes)) { out.writeObject(Guarded.getInstance()); }
Object copy = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray())).readObject();
System.out.println("same after deserialization: " + (copy == Guarded.getInstance()));` }
    ],
    designs: [
      { title: "Mini LLD: an application logger",
        text: "A logger is the classic legitimate singleton: there should be one ordered sink per process, it has no business state, and everyone needs it. The design keeps the **singleton thin**: the single instance just routes to pluggable `Appender`s (Strategy/Observer-like), so output targets and formats can change without touching callers.",
        points: [
          "`Logger.get()` returns the one instance (holder idiom); `log(level, msg)` is thread-safe",
          "`Appender` interface: `ConsoleAppender`, `FileAppender`, `InMemoryAppender` (for tests)",
          "A minimum `Level` filters messages cheaply before formatting",
          "`CopyOnWriteArrayList` for appenders: reads (every log call) vastly outnumber writes (configuration)",
          "Real libraries (SLF4J/Logback) use a *factory* of named loggers rather than one global object: a Multiton keyed by class name"],
        m: H.cd(["classDiagram",
          "  class Logger { -Logger INSTANCE$; -Level min; -List~Appender~ appenders; +get()$ Logger; +log(Level l, String msg) void; +addAppender(Appender a) void }",
          "  class Appender { <<interface>>; +append(String line) void }",
          "  class Level { <<enumeration>>; DEBUG; INFO; WARN; ERROR }",
          "  Logger \"1\" --> \"*\" Appender",
          "  Logger ..> Level",
          "  Appender <|.. ConsoleAppender",
          "  Appender <|.. InMemoryAppender"]),
        code: `enum Level { DEBUG, INFO, WARN, ERROR }
interface Appender { void append(String line); }
class ConsoleAppender implements Appender { public void append(String line) { System.out.println(line); } }
class InMemoryAppender implements Appender {
    final List<String> lines = new CopyOnWriteArrayList<>();
    public void append(String line) { lines.add(line); }
}

final class Logger {
    private final List<Appender> appenders = new CopyOnWriteArrayList<>();
    private volatile Level min = Level.INFO;
    private Logger() {}
    private static class Holder { static final Logger INSTANCE = new Logger(); }
    static Logger get() { return Holder.INSTANCE; }

    void addAppender(Appender a) { appenders.add(a); }
    void setLevel(Level l) { min = l; }
    void log(Level level, String msg) {
        if (level.ordinal() < min.ordinal()) return;                  // cheap filter first
        String line = "[" + level + "] " + Thread.currentThread().getName() + " " + msg;
        for (Appender a : appenders) a.append(line);
    }
}

InMemoryAppender mem = new InMemoryAppender();
Logger.get().addAppender(new ConsoleAppender());
Logger.get().addAppender(mem);
Logger.get().log(Level.DEBUG, "hidden");
Thread t = new Thread(() -> Logger.get().log(Level.WARN, "slow query"), "worker-1");
t.start(); t.join();
Logger.get().log(Level.INFO, "server started");
System.out.println(mem.lines.size() + " lines captured");` },
      { title: "Mini LLD: a parking-lot ticket ID generator, and the DI alternative",
        text: "Interview scenario: \"Ticket IDs must be unique across all entry gates.\" A singleton `TicketIdGenerator` works, but every gate now calls a **hidden global**, which makes tests share state and order-dependent. The better design keeps **one instance** but gets it to the gates by **constructor injection**: same uniqueness, explicit dependency, and tests can pass a fake.",
        points: [
          "Pattern singleton: `TicketIdGenerator.getInstance().next()` inside `EntryGate`, a hidden dependency",
          "Injected single instance: `new EntryGate(idGenerator)` for each gate, created once in `main` (the composition root)",
          "Both give one generator per process; only the second is testable and swappable (DIP from F02)",
          "Uniqueness across *several* JVMs/servers needs a different design entirely (DB sequence, Snowflake IDs): a singleton is per JVM (per class loader)"],
        m: H.cd(["classDiagram",
          "  direction LR",
          "  class IdGenerator { <<interface>>; +next() String }",
          "  class AtomicIdGenerator { -AtomicLong seq; +next() String }",
          "  class EntryGate { -IdGenerator ids; +issue(String plate) String }",
          "  IdGenerator <|.. AtomicIdGenerator",
          "  EntryGate --> IdGenerator : injected",
          "  ParkingApp ..> AtomicIdGenerator : creates ONE",
          "  ParkingApp ..> EntryGate : creates N"]),
        code: `interface IdGenerator { String next(); }
class AtomicIdGenerator implements IdGenerator {
    private final AtomicLong seq = new AtomicLong();
    public String next() { return "T-" + seq.incrementAndGet(); }
}

class EntryGate {
    private final String name; private final IdGenerator ids;
    EntryGate(String name, IdGenerator ids) { this.name = name; this.ids = ids; }   // explicit dependency
    String issue(String plate) { return ids.next() + "@" + name + ":" + plate; }
}

// Composition root: exactly one generator, shared by all gates
IdGenerator shared = new AtomicIdGenerator();
List<EntryGate> gates = List.of(new EntryGate("G1", shared), new EntryGate("G2", shared));
ExecutorService pool = Executors.newFixedThreadPool(4);
Set<String> issued = ConcurrentHashMap.newKeySet();
for (int i = 0; i < 1000; i++) { int n = i; pool.submit(() -> issued.add(gates.get(n % 2).issue("KA" + n).split("@")[0])); }
pool.shutdown(); pool.awaitTermination(5, TimeUnit.SECONDS);
System.out.println("unique ids: " + issued.size());   // 1000

// In a test: a deterministic fake, no global state to reset
EntryGate testGate = new EntryGate("T", () -> "FIXED");
System.out.println(testGate.issue("X"));` }
    ],
    extraSlides: [
      { title: "Singleton pattern vs Spring singleton scope vs Multiton",
        text: "\"Singleton\" means different things in different places, and interviewers check that you know the difference.",
        table: [
          ["", "GoF Singleton", "Spring singleton scope", "Multiton"],
          ["Uniqueness", "one per class loader (≈ per JVM)", "one per bean definition per `ApplicationContext`", "one per key"],
          ["Who enforces it", "the class itself (private constructor)", "the container", "the class's static map"],
          ["Access", "static `getInstance()`", "injected into constructors", "`get(key)`"],
          ["Can you still `new` it?", "no", "yes; it's an ordinary class", "no"],
          ["Testability", "poor (global state)", "good (inject fakes)", "poor"],
          ["Example", "`Runtime.getRuntime()`", "`@Service class OrderService`", "a pool per tenant, `Charset.forName`-style caches"]],
        points: [
          "Spring beans are singletons by default, but stateless: keep mutable per-request data out of them, because one instance serves all threads",
          "Need one-per-something? That's a Multiton (or just a `ConcurrentHashMap.computeIfAbsent` cache)"],
        code: `final class TenantPool {                           // Multiton: one instance per key
    private static final ConcurrentHashMap<String, TenantPool> POOLS = new ConcurrentHashMap<>();
    private final String tenant;
    private TenantPool(String tenant) { this.tenant = tenant; System.out.println("open pool for " + tenant); }
    static TenantPool of(String tenant) { return POOLS.computeIfAbsent(tenant, TenantPool::new); }
}

System.out.println(TenantPool.of("acme") == TenantPool.of("acme"));     // true, opened once
System.out.println(TenantPool.of("acme") == TenantPool.of("globex"));   // false` }
    ],
    usages: [
      ["`java.lang.Runtime.getRuntime()`", "The textbook JDK singleton: one `Runtime` per JVM, eagerly created, private constructor."],
      ["`java.awt.Desktop.getDesktop()`", "One `Desktop` per application context, created lazily through a static accessor."],
      ["`Collections.emptyList()` / `emptyMap()`", "Return one shared immutable instance instead of allocating a new empty list each time (a singleton instance, though the class isn't a singleton)."],
      ["`Comparator.naturalOrder()`", "In OpenJDK it returns an enum-singleton comparator (`NaturalOrderComparator.INSTANCE`)."],
      ["Spring beans (default `singleton` scope)", "One instance per container, created and injected by Spring; the class itself isn't a GoF singleton and can still be instantiated in tests."],
      ["SLF4J `LoggerFactory.getLogger(Class)`", "Returns cached named loggers: a Multiton keyed by name, sitting behind a factory."]
    ],
    avoid: {
      text: "Singleton is the most overused pattern, and many teams treat it as an anti-pattern. A global instance is **global mutable state** with a nicer name.",
      points: [
        "Don't use it just to get **global access** to an object; pass the object in (DI)",
        "Don't use it for anything with per-user or per-request state",
        "Avoid it where tests need isolation: state leaks between tests and order starts to matter",
        "Don't rely on it for uniqueness across servers, containers or class loaders",
        "Legitimate uses: truly process-wide, stateless or append-only resources (runtime, logging sink, metrics registry), or when a framework hands you no DI"],
      pros: ["Guaranteed single instance (pool, cache, registry)", "Lazy creation of expensive resources", "Simple global access when there is no DI framework"],
      cons: ["Hidden dependencies: signatures lie about what a class needs", "Hard to mock and to reset between tests", "Concurrency bugs in lazy variants", "Violates SRP (manages its own lifecycle as well as its job)", "Per class loader, not per cluster"] },
    compare: [
      ["Static utility class", "Group stateless functions (`Math`, `Collections`)", "No instance at all, so it can't implement an interface, be injected or be mocked; Singleton is an object that can"],
      ["Monostate", "Many instances share static state", "Callers `new` it freely but every instance sees the same data; uniqueness of *state*, not of *object*"],
      ["Flyweight (F16)", "Share many fine-grained immutable objects", "Many shared instances keyed by intrinsic state; Singleton is exactly one"],
      ["Multiton / Object pool", "One instance per key / a bounded set reused", "Controlled multiplicity rather than one"],
      ["Spring singleton scope", "One bean per container", "The container enforces it and injects it; the class stays an ordinary, testable class"],
      ["Factory (F06)", "Decide which object to create", "A factory may *return* a singleton, but its intent is choosing the type"]],
    widget: { heading: "Interactive: will this singleton survive?", caption: "Ten singleton implementations. Decide whether each one is correct under concurrency and attacks, or what breaks it. Your answers are saved.",
      render: H.widgets.picker({
        intro: "For each snippet, pick the **most important** verdict. Think about two threads calling `getInstance()` at once, and about reflection and serialization.",
        question: "Verdict?", noun: "Snippets",
        options: ["Correct", "Race: two instances possible", "Unsafe publication", "Broken by serialization", "Not a singleton at all", "Thread-unsafe state inside"],
        items: [
          { title: "Naive lazy", code: "static Cache instance;\nstatic Cache getInstance() {\n    if (instance == null) instance = new Cache();\n    return instance;\n}", answer: "Race: two instances possible", why: "Check-then-act without a lock: two threads can both see `null`.", fix: "Holder idiom, `synchronized`, or eager init." },
          { title: "Eager static final", code: "private static final Cache INSTANCE = new Cache();\nprivate Cache() {}\nstatic Cache getInstance() { return INSTANCE; }", answer: "Correct", why: "Class initialisation is thread-safe and happens once." },
          { title: "DCL without volatile", code: "private static Cache instance;\nstatic Cache getInstance() {\n    if (instance == null) {\n        synchronized (Cache.class) {\n            if (instance == null) instance = new Cache();\n        }\n    }\n    return instance;\n}", answer: "Unsafe publication", why: "Without `volatile`, another thread can see a non-null reference to a partly constructed object.", fix: "Declare `private static volatile Cache instance;`." },
          { title: "Holder idiom", code: "private Cache() {}\nprivate static class Holder { static final Cache I = new Cache(); }\nstatic Cache getInstance() { return Holder.I; }", answer: "Correct", why: "Lazy (Holder loads on first call) and thread-safe via class init, with no locks." },
          { title: "Serializable, no readResolve", code: "class Settings implements Serializable {\n    private static final Settings I = new Settings();\n    private Settings() {}\n    static Settings get() { return I; }\n}", answer: "Broken by serialization", why: "Deserializing creates a fresh object, so you'd have two.", fix: "Add `private Object readResolve() { return I; }` or use an enum." },
          { title: "Public constructor", code: "class Registry {\n    private static final Registry I = new Registry();\n    public Registry() {}\n    static Registry get() { return I; }\n}", answer: "Not a singleton at all", why: "Anyone can call `new Registry()`. The constructor must be private." },
          { title: "Enum", code: "enum Registry {\n    INSTANCE;\n    private final Map<String, String> m = new ConcurrentHashMap<>();\n    void put(String k, String v) { m.put(k, v); }\n}", answer: "Correct", why: "The JVM guarantees one constant, and blocks reflection and serialization copies. The internal map is also thread-safe." },
          { title: "synchronized accessor", code: "private static Cache instance;\nstatic synchronized Cache getInstance() {\n    if (instance == null) instance = new Cache();\n    return instance;\n}", answer: "Correct", why: "Correct, just slower: every call locks. Fine unless it's on a hot path." },
          { title: "Lock on the wrong object", code: "private static volatile Cache instance;\nstatic Cache getInstance() {\n    if (instance == null) {\n        synchronized (new Object()) {\n            if (instance == null) instance = new Cache();\n        }\n    }\n    return instance;\n}", answer: "Race: two instances possible", why: "Each thread locks a brand-new object, so there's no mutual exclusion at all.", fix: "Lock on `Cache.class` or a `private static final Object LOCK`." },
          { title: "Mutable state inside a correct singleton", code: "enum Counter {\n    INSTANCE;\n    private int count;\n    void inc() { count++; }\n}", answer: "Thread-unsafe state inside", why: "There's exactly one instance, but `count++` from many threads loses updates. A correct singleton can still hold thread-unsafe state.", fix: "Use `AtomicInteger` or synchronize `inc()`." }
        ]
      }) },
    pitfalls: [
      "Naive lazy initialisation without any synchronization",
      "Double-checked locking without `volatile`",
      "Forgetting `readResolve()` on a `Serializable` singleton (or just use an enum)",
      "Thinking the instance is thread-safe because the *creation* is; mutable fields inside still need synchronization",
      "Using Singleton for global access instead of passing dependencies, which makes the code hard to test",
      "Assuming one instance per cluster: it's one per class loader",
      "Singletons holding request or user state in a web app (one instance serves every thread)",
      "Confusing Spring's singleton scope with the GoF pattern",
      "Making every service a singleton in a machine-coding round; the interviewer then asks how you'd test it"
    ],
    quiz: [
      { q: "Why must the instance field be `volatile` in double-checked locking?", options: ["To make the getter faster", "To stop the JVM from publishing the reference before the constructor finishes, and to make the write visible to other threads", "Because `synchronized` doesn't work on static methods", "It isn't needed after Java 8"], answer: 1, why: "Without `volatile` there's no happens-before edge for the unsynchronized first read, so a thread can see a half-built object." },
      { q: "Which singleton form is lazy, thread-safe and lock-free?", options: ["Eager `static final`", "`synchronized getInstance()`", "Initialization-on-demand holder", "Naive lazy"], answer: 2, why: "The nested holder class isn't initialised until `getInstance()` first touches it, and class init is thread-safe." },
      { q: "Which form is safe against reflection **and** serialization without extra code?", options: ["Holder idiom", "Enum singleton", "DCL with volatile", "Eager static final"], answer: 1, why: "The JVM forbids reflective enum construction and deserializes enum constants to the same instance." },
      { q: "A Spring `@Service` bean in default scope is…", options: ["A GoF singleton with a private constructor", "One instance per container, injected by Spring; the class can still be instantiated directly", "One instance per request", "One instance per thread"], answer: 1, why: "Singleton *scope* is container-managed; the class itself isn't a singleton." },
      { q: "Your `TicketIdGenerator` singleton must give unique IDs across 3 app servers. Is it enough?", options: ["Yes, a singleton is unique everywhere", "No: a singleton is one per JVM (class loader); use a DB sequence or a distributed ID scheme", "Yes, if it's an enum", "Yes, if `getInstance` is synchronized"], answer: 1, why: "Each server has its own JVM and its own instance." },
      { q: "What is the main testability problem with singletons?", options: ["They use too much memory", "They're global state accessed through hidden static calls, so tests can't substitute them and state leaks between tests", "They can't have methods", "JUnit can't load them"], answer: 1, why: "The dependency isn't visible in the constructor, so it can't be replaced with a fake, and its state persists across tests." },
      { q: "Which JDK method is a genuine GoF singleton accessor?", options: ["`new Object()`", "`Runtime.getRuntime()`", "`List.of()`", "`Thread.currentThread()`"], answer: 1, why: "There's exactly one `Runtime` per JVM, with a private constructor. `Thread.currentThread()` returns a different object per thread." },
      { q: "How does a Monostate differ from a Singleton?", options: ["It's the same", "Many instances can be created, but they all share static state", "It's one instance per key", "It's always an enum"], answer: 1, why: "Monostate enforces shared state, not a single object." }
    ],
    cheatsheet: {
      table: [
        ["Variant", "Lazy", "Thread-safe", "Reflection/serialization safe", "Use when"],
        ["Eager `static final`", "No", "Yes", "No / needs `readResolve`", "cheap object, always needed"],
        ["`synchronized` getter", "Yes", "Yes", "No", "rarely called"],
        ["DCL + `volatile`", "Yes", "Yes", "No", "legacy code; know it for interviews"],
        ["Holder idiom", "Yes", "Yes", "No", "expensive object, default lazy choice"],
        ["Enum", "No", "Yes", "Yes", "default choice when you can use it"]],
      cards: [
        { title: "Recipe", items: ["`private` constructor", "`static` field with the instance", "`static` accessor", "`final` class (prevent subclass copies)", "`readResolve()` if `Serializable`"] },
        { title: "Say this in interviews", items: ["\"I'd prefer DI with one instance created in main\"", "\"If I need a true singleton: enum or holder idiom\"", "\"volatile is required for DCL\"", "\"It's per class loader, not per cluster\""] },
        { title: "Legit uses", items: ["Runtime/environment access", "Logging sink, metrics registry", "In-process cache or registry", "Hardware gateway (one printer spooler)"] }]
    },
    practice: [
      { level: "Easy", q: "Write three thread-safe singleton implementations and say which you'd use in production code and why.",
        a: ["**Enum**: `enum Config { INSTANCE; ... }`. Shortest, thread-safe, and immune to reflection and serialization. Default choice unless you need lazy creation or inheritance.",
          "**Holder idiom**: lazy and lock-free. Use it when creation is expensive and might not be needed.",
          "**Eager `static final`**: simple and safe when the object is cheap.",
          "Production answer: \"I'd usually avoid a hand-written singleton and create one instance in the composition root (or let Spring do it), injecting it where needed. If I must, enum.\""],
        code: `enum ConfigA { INSTANCE; String env() { return "prod"; } }

final class ConfigB {
    private ConfigB() {}
    private static class Holder { static final ConfigB I = new ConfigB(); }
    static ConfigB get() { return Holder.I; }
}

final class ConfigC {
    private static final ConfigC I = new ConfigC();
    private ConfigC() {}
    static ConfigC get() { return I; }
}

System.out.println(ConfigA.INSTANCE.env() + " " + (ConfigB.get() == ConfigB.get()) + " " + (ConfigC.get() == ConfigC.get()));` },
      { level: "Easy", q: "Singleton vs a class with only static methods: give at least four differences.",
        a: ["A singleton is an **object**: it can implement interfaces, be passed as a parameter, be injected and be mocked. A static class can't.",
          "A singleton can be **lazily** created; static members initialise when the class loads.",
          "A singleton can hold state with a lifecycle (open or close resources); static utilities should be stateless.",
          "A singleton can be swapped for a subclass or a different implementation behind an interface; static calls are bound at compile time.",
          "Use a static utility class for pure functions (`Math.max`, `Collections.sort`); use a single *object* for anything with state or dependencies."] },
      { level: "Medium", q: "This class uses a singleton and is hard to unit-test. Refactor it so a test can control the clock and the exchange rate without touching global state.",
        qcode: `class InvoiceService {
    long totalInInr(long usdCents) {
        double rate = RateCache.getInstance().usdToInr();      // hidden singleton
        if (LocalDate.now().getDayOfWeek() == DayOfWeek.SUNDAY) rate *= 0.99;
        return Math.round(usdCents * rate);
    }
}
final class RateCache {
    private static final RateCache I = new RateCache();
    private RateCache() {}
    static RateCache getInstance() { return I; }
    double usdToInr() { return 83.2; }   // imagine an HTTP call
}`,
        a: "Introduce an interface for what the service needs (`RateProvider`), inject it and a `Clock` through the constructor, and keep the singleton (if at all) as one implementation wired in `main`. The test passes a lambda and a fixed clock.",
        code: `interface RateProvider { double usdToInr(); }

class InvoiceService {
    private final RateProvider rates; private final Clock clock;
    InvoiceService(RateProvider rates, Clock clock) { this.rates = rates; this.clock = clock; }
    long totalInInr(long usdCents) {
        double rate = rates.usdToInr();
        if (LocalDate.now(clock).getDayOfWeek() == DayOfWeek.SUNDAY) rate *= 0.99;
        return Math.round(usdCents * rate);
    }
}

// test: fixed rate, fixed Sunday
Clock sunday = Clock.fixed(Instant.parse("2026-11-08T10:00:00Z"), ZoneOffset.UTC);
InvoiceService svc = new InvoiceService(() -> 80.0, sunday);
System.out.println(svc.totalInInr(100));   // 100 * 80 * 0.99 = 7920` },
      { level: "Medium", q: "Implement a thread-safe in-memory **LRU cache** that's shared by the whole app, with a fixed capacity.",
        steps: [["Single instance", "An enum or holder singleton (or one injected instance)."], ["LRU", "`LinkedHashMap` with `accessOrder = true` and `removeEldestEntry` evicts the least recently used entry."], ["Thread safety", "`LinkedHashMap` isn't thread-safe and even `get` mutates the access order, so guard all operations with one lock (or use Caffeine in real code)."]],
        code: `enum LruCache {
    INSTANCE;
    private static final int CAPACITY = 3;
    private final Map<String, String> map = new LinkedHashMap<>(16, 0.75f, true) {
        protected boolean removeEldestEntry(Map.Entry<String, String> e) { return size() > CAPACITY; }
    };
    synchronized String get(String k) { return map.get(k); }          // get reorders, so it must lock too
    synchronized void put(String k, String v) { map.put(k, v); }
    synchronized Set<String> keys() { return new LinkedHashSet<>(map.keySet()); }
}

LruCache c = LruCache.INSTANCE;
c.put("a", "1"); c.put("b", "2"); c.put("c", "3");
c.get("a");                 // a becomes most recent
c.put("d", "4");            // evicts b
System.out.println(c.keys());   // [c, a, d]`,
        follow: "How would you reduce lock contention? Shard into N segments by key hash, each with its own lock, or use a concurrent cache library (Caffeine)." },
      { level: "Medium", q: "Design a **database connection pool** that should exist once per application. Show acquiring and releasing connections under concurrency.",
        steps: [["One pool", "A single instance created at startup (singleton or injected)."], ["Bounded", "A `BlockingQueue<Connection>` pre-filled with N connections; `acquire()` waits with a timeout; `release()` puts the connection back."], ["Safety", "No locks needed beyond the queue; validate connections on release; never hand out the same one twice."]],
        m: H.cd(["classDiagram", "  direction LR",
          "  class ConnectionPool { -BlockingQueue~Conn~ idle; +get()$ ConnectionPool; +acquire(long ms) Conn; +release(Conn c) void }",
          "  class Conn { -int id; +query(String sql) String }",
          "  ConnectionPool \"1\" *-- \"N\" Conn"]),
        code: `record Conn(int id) { String query(String sql) { return "conn" + id + ": " + sql; } }

final class ConnectionPool {
    private static final int SIZE = 2;
    private final BlockingQueue<Conn> idle = new ArrayBlockingQueue<>(SIZE);
    private ConnectionPool() { for (int i = 1; i <= SIZE; i++) idle.add(new Conn(i)); }
    private static class Holder { static final ConnectionPool I = new ConnectionPool(); }
    static ConnectionPool get() { return Holder.I; }

    Conn acquire(long timeoutMs) throws InterruptedException {
        Conn c = idle.poll(timeoutMs, TimeUnit.MILLISECONDS);
        if (c == null) throw new IllegalStateException("pool exhausted");
        return c;
    }
    void release(Conn c) { idle.offer(c); }
    int available() { return idle.size(); }
}

ExecutorService ex = Executors.newFixedThreadPool(4);
List<Future<String>> out = new ArrayList<>();
for (int i = 0; i < 4; i++) {
    int n = i;
    out.add(ex.submit(() -> {
        Conn c = ConnectionPool.get().acquire(1000);
        try { Thread.sleep(50); return c.query("q" + n); } finally { ConnectionPool.get().release(c); }
    }));
}
for (Future<String> f : out) System.out.println(f.get());
ex.shutdown();
System.out.println("available after: " + ConnectionPool.get().available());` },
      { level: "Medium", q: "Write a reusable, thread-safe `Lazy<T>` holder so any expensive object can be created once on first use, without writing DCL by hand each time.",
        a: "Wrap a `Supplier<T>` and apply double-checked locking once, inside the generic class. Each `Lazy` field then gives \"singleton-per-owner\" semantics without static state, and it's injectable and testable.",
        code: `final class Lazy<T> implements Supplier<T> {
    private final Supplier<T> factory;
    private volatile T value;
    Lazy(Supplier<T> factory) { this.factory = factory; }
    public T get() {
        T v = value;
        if (v == null) {
            synchronized (this) {
                v = value;
                if (v == null) value = v = Objects.requireNonNull(factory.get());
            }
        }
        return v;
    }
}

AtomicInteger builds = new AtomicInteger();
Lazy<String> heavy = new Lazy<>(() -> { builds.incrementAndGet(); return "parsed-rules"; });
ExecutorService ex = Executors.newFixedThreadPool(8);
for (int i = 0; i < 100; i++) ex.submit(heavy::get);
ex.shutdown(); ex.awaitTermination(2, TimeUnit.SECONDS);
System.out.println(heavy.get() + " built " + builds.get() + " time(s)");   // built 1 time(s)` },
      { level: "Hard", q: "A holder-idiom singleton's constructor throws because a config file is missing. What happens on the first and second call to `getInstance()`? How should you design for it?",
        a: ["First call: class initialisation of `Holder` fails, so the caller gets an **`ExceptionInInitializerError`** wrapping the original exception.",
          "Second call: the JVM marks the class as erroneous and throws **`NoClassDefFoundError`**. It never retries, so the singleton is permanently broken for the life of the JVM.",
          "Eager singletons fail even earlier: when the outer class is first used, often far from the real cause.",
          "Design: keep singleton constructors trivial and side-effect free; load config explicitly at startup (fail fast with a clear message), or use a `Lazy<T>` that can retry; prefer DI where construction errors surface in `main`."],
        code: `final class Fragile {
    private Fragile() { throw new IllegalStateException("config.yml missing"); }
    private static class Holder { static final Fragile I = new Fragile(); }
    static Fragile get() { return Holder.I; }
}

for (int i = 1; i <= 2; i++) {
    try { Fragile.get(); }
    catch (Throwable t) { System.out.println("call " + i + ": " + t.getClass().getSimpleName()); }
}` },
      { level: "Hard", q: "You're designing a **rate limiter** for an API gateway that runs as 6 instances behind a load balancer. A teammate proposes a `RateLimiter` singleton holding per-user counters. Critique it and propose a design.",
        a: ["The singleton is per JVM, so each of the 6 instances has its own counters and a user effectively gets **6× the limit**, depending on how the load balancer spreads requests.",
          "In-process state also disappears on restart and complicates horizontal scaling.",
          "Design: keep a `RateLimiter` **interface** (Strategy: token bucket, sliding window) with an implementation backed by a shared store (Redis `INCR` + `EXPIRE`, or a Lua script for atomic token buckets). Each gateway instance holds one injected limiter object (a singleton *scope* is fine) that is stateless locally.",
          "An in-memory limiter is still useful as a local first line (per-instance burst protection) or for single-node interview implementations; say which you're building.",
          "Mention per-key locks or `ConcurrentHashMap.compute` for the in-memory version."],
        m: H.cd(["classDiagram", "  direction LR",
          "  class RateLimiter { <<interface>>; +allow(String userId) boolean }",
          "  class RedisTokenBucket { -RedisClient redis; -int capacity; -int refillPerSec }",
          "  class InMemorySlidingWindow { -Map~String, Deque~ hits }",
          "  class GatewayFilter { -RateLimiter limiter; +handle(Request r) Response }",
          "  RateLimiter <|.. RedisTokenBucket",
          "  RateLimiter <|.. InMemorySlidingWindow",
          "  GatewayFilter --> RateLimiter"]) }
    ],
    recap: [
      "Singleton = one instance per class loader + a global access point: private constructor, static field, static accessor.",
      "Safe forms: eager `static final`, the holder idiom (lazy, lock-free), and enum (also reflection- and serialization-proof). DCL needs `volatile`.",
      "Defences: throw on a second construction, `readResolve()`, no `Cloneable`, or just use an enum.",
      "A correct singleton can still hold thread-unsafe state; synchronize or use atomics for its fields.",
      "Prefer one injected instance (DI / Spring singleton scope) over static access: same uniqueness, honest dependencies, testable code. A singleton is never per cluster."
    ]
  });
})();
