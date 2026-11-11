/* Lesson F11: Decorator */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  function layers(names) {
    var out = ["flowchart LR", "  C([\"client\"])"], prev = "C";
    names.forEach(function (n, i) { var id = "L" + i; out.push("  " + id + "[\"<b>" + n[0] + "</b><br/><span class='d'>" + n[1] + "</span>\"]" + (i === names.length - 1 ? ":::s0" : ":::s1")); out.push("  " + prev + " -->|\"cost()\"| " + id); prev = id; });
    out.push("  classDef s0 fill:#e8f5e9,stroke:#2e7d32", "  classDef s1 fill:#e3f2fd,stroke:#1565c0");
    return out.join("\n");
  }
  var coffeeWidget = H.widgets.stepper({
    intro: "Build an order by wrapping a base coffee in decorators, one layer per step. Each wrapper **is a** `Beverage` and **has a** `Beverage`, so `cost()` and `description()` pass inward and add on the way out.",
    steps: [
      { label: "Espresso", m: layers([["Espresso", "base: ₹120"]]), text: "Start with a concrete component. `new Espresso()` costs ₹120.", log: ["Beverage b = new Espresso();", "b.cost() = 120   \"Espresso\""], state: { "cost()": "₹120", "description()": "Espresso", "classes needed": "1 (no subclass per combination)" } },
      { label: "+ Milk", m: layers([["Milk", "+₹30"], ["Espresso", "₹120"]]), text: "Wrap it: `new Milk(b)`. `Milk.cost()` returns `inner.cost() + 30`. The client still holds a `Beverage`.", log: ["b = new Milk(b);", "b.cost() = 120 + 30 = 150"], state: { "cost()": "₹150", "description()": "Espresso, milk" } },
      { label: "+ Caramel", m: layers([["Caramel", "+₹40"], ["Milk", "+₹30"], ["Espresso", "₹120"]]), text: "Wrap again. Order matters only when a decorator's logic depends on the inner result (a percentage discount, say); for add-ons it doesn't.", log: ["b = new Caramel(b);", "b.cost() = 150 + 40 = 190"], state: { "cost()": "₹190", "description()": "Espresso, milk, caramel" } },
      { label: "+ Caramel again", m: layers([["Caramel", "+₹40"], ["Caramel", "+₹40"], ["Milk", "+₹30"], ["Espresso", "₹120"]]), text: "The same decorator can wrap twice (double caramel). With subclassing you'd need `EspressoWithMilkAndDoubleCaramel`: the class explosion Decorator avoids.", log: ["b = new Caramel(b);", "b.cost() = 190 + 40 = 230"], state: { "cost()": "₹230", "description()": "Espresso, milk, caramel, caramel" } },
      { label: "+ Large size", m: layers([["Large", "×1.25"], ["Caramel", "+₹40"], ["Caramel", "+₹40"], ["Milk", "+₹30"], ["Espresso", "₹120"]]), text: "A multiplying decorator. Here **order matters**: `Large` outside multiplies everything (₹230 × 1.25); inside it would multiply only the espresso.", log: ["b = new Large(b);", "b.cost() = round(230 * 1.25) = 288"], state: { "cost()": "₹288", "description()": "Espresso, milk, caramel, caramel, large" } },
      { label: "+ Loyalty discount", m: layers([["Loyalty10", "-10%"], ["Large", "×1.25"], ["Caramel", "+₹40"], ["Caramel", "+₹40"], ["Milk", "+₹30"], ["Espresso", "₹120"]]), text: "Pricing rules can be decorators too, but be careful: a discount is a pricing **policy**, which many teams keep in a separate Strategy instead of the beverage chain. Mention the trade-off in interviews.", log: ["b = new Loyalty10(b);", "b.cost() = round(288 * 0.9) = 259"], state: { "cost()": "₹259", "description()": "Espresso, milk, caramel, caramel, large, loyalty -10%" } }
    ]
  });

  H.pattern({
    code: "F11", name: "Decorator",
    summary: "Decorator attaches responsibilities to an object dynamically by wrapping it in objects that share its interface. This lesson covers the coffee-shop classic, Java I/O streams as a decorator stack, order sensitivity, decorators vs subclassing (class explosion), functional decorators with lambdas, a resilient HTTP/payment client (logging, retry, caching, metrics) and a notification pipeline, JDK and Spring usages (`BufferedInputStream`, `Collections.unmodifiableList`, Spring AOP proxies, servlet `HttpServletRequestWrapper`), and comparisons with Proxy, Adapter, Composite, Chain of Responsibility and Strategy.",
    intent: "Attach **additional responsibilities** to an object **dynamically**. Decorators provide a flexible alternative to subclassing for extending functionality.",
    problem: {
      text: "A café sells 4 coffees and 6 add-ons, in any combination and quantity. One subclass per combination (`EspressoWithMilkAndCaramel`) explodes combinatorially, can't express \"double caramel\", and is fixed at compile time. Boolean flags on one big class (`hasMilk`, `hasCaramel`…) violate OCP: every new add-on edits the class and its `cost()` method.",
      points: [
        "Subclass per combination: 4 bases × 2⁶ add-on subsets = 256 classes, and still no doubles",
        "Flags: one god class edited for every new add-on",
        "Decorator: each add-on is **one** class that wraps any `Beverage`; combinations are built at runtime by nesting",
        "Same idea for cross-cutting behaviour on services: logging, retries, caching, metrics, auth"],
      code: `class Coffee {                                    // the flag approach
    boolean milk, caramel, soy, whip;                // every new add-on = edit here
    long cost() {
        long c = 120;
        if (milk) c += 30;
        if (caramel) c += 40;                        // ... and here
        if (soy) c += 35;
        if (whip) c += 25;
        return c;                                    // and double caramel? another field?
    }
}

Coffee c = new Coffee(); c.milk = true; c.caramel = true;
System.out.println(c.cost());` },
    analogy: "Dressing for the weather. You (the component) put on a sweater, then a jacket, then a raincoat. Each layer adds something (warmth, wind, rain protection) without changing who you are, you can add or remove layers at runtime, and the outermost layer is what the world sees first.",
    structure: {
      text: "**Component** is the interface. **ConcreteComponent** is the plain object. **Decorator** (often abstract) implements Component *and* holds a Component; it forwards calls to the wrapped object. **ConcreteDecorators** add behaviour before or after forwarding. Because decorators are Components, they can wrap each other in any order.",
      m: H.cd(["classDiagram",
        "  class Beverage { <<interface>>; +cost() long; +description() String }",
        "  class Espresso { +cost() long; +description() String }",
        "  class AddOn { <<abstract>>; #Beverage inner; +AddOn(Beverage inner) }",
        "  class Milk { +cost() long; +description() String }",
        "  class Caramel { +cost() long; +description() String }",
        "  class Large { +cost() long; +description() String }",
        "  Beverage <|.. Espresso",
        "  Beverage <|.. AddOn",
        "  AddOn o-- Beverage : wraps",
        "  AddOn <|-- Milk", "  AddOn <|-- Caramel", "  AddOn <|-- Large"]),
      roles: [["Component", "Interface shared by plain objects and decorators (`Beverage`, `InputStream`, `PaymentGateway`)"], ["ConcreteComponent", "The object being decorated (`Espresso`, `FileInputStream`)"], ["Decorator", "Implements Component and holds one; forwards by default"], ["ConcreteDecorator", "Adds behaviour around the forwarded call (`Milk`, `BufferedInputStream`, `RetryingGateway`)"]],
      points: ["The key shape: **is-a** Component and **has-a** Component", "The client builds the stack once and then talks only to the outermost Component"] },
    impl: {
      title: "Java implementation: the coffee shop",
      text: "This code runs the exact numbers the widget below shows. Note how `Large` and `Loyalty10` use the inner result, which makes their position in the stack matter.",
      code: `interface Beverage { long cost(); String description(); }

final class Espresso implements Beverage {
    public long cost() { return 120; }
    public String description() { return "Espresso"; }
}

abstract class AddOn implements Beverage {
    protected final Beverage inner;
    AddOn(Beverage inner) { this.inner = Objects.requireNonNull(inner); }
}
final class Milk extends AddOn {
    Milk(Beverage b) { super(b); }
    public long cost() { return inner.cost() + 30; }
    public String description() { return inner.description() + ", milk"; }
}
final class Caramel extends AddOn {
    Caramel(Beverage b) { super(b); }
    public long cost() { return inner.cost() + 40; }
    public String description() { return inner.description() + ", caramel"; }
}
final class Large extends AddOn {
    Large(Beverage b) { super(b); }
    public long cost() { return Math.round(inner.cost() * 1.25); }        // depends on everything inside
    public String description() { return inner.description() + ", large"; }
}
final class Loyalty10 extends AddOn {
    Loyalty10(Beverage b) { super(b); }
    public long cost() { return Math.round(inner.cost() * 0.9); }
    public String description() { return inner.description() + ", loyalty -10%"; }
}

Beverage b = new Loyalty10(new Large(new Caramel(new Caramel(new Milk(new Espresso())))));
System.out.println(b.description() + " = ₹" + b.cost());                                 // 259
System.out.println("Large inside: ₹" + new Caramel(new Caramel(new Milk(new Large(new Espresso())))).cost());   // 260` },
    variants: [
      { title: "Java I/O: the decorator stack you already use",
        text: "`java.io` is the textbook Decorator: `InputStream` is the component; `FileInputStream` and `ByteArrayInputStream` are concrete components; `FilterInputStream` is the abstract decorator; `BufferedInputStream`, `DataInputStream`, `GZIPInputStream`, `CipherInputStream` and `DigestInputStream` are concrete decorators. Each layer adds one capability.",
        points: [
          "Read outward-in: `new DataInputStream(new BufferedInputStream(new GZIPInputStream(new FileInputStream(f))))` means file → decompress → buffer → typed reads",
          "Closing the outermost stream closes the whole chain (each `close()` forwards inward)",
          "Order matters: buffer *outside* GZIP to buffer decompressed bytes; compress *before* encrypting (encrypted data doesn't compress)",
          "`InputStreamReader` in the middle of a chain is an **Adapter** (bytes → chars), not a decorator"],
        m: M(["flowchart LR",
          "  APP([\"your code\"]) --> D[\"<b>DataInputStream</b><br/><span class='d'>readInt, readUTF</span>\"]:::s1",
          "  D --> B[\"<b>BufferedInputStream</b><br/><span class='d'>fewer syscalls</span>\"]:::s1",
          "  B --> G[\"<b>GZIPInputStream</b><br/><span class='d'>decompress</span>\"]:::s1",
          "  G --> F[\"<b>ByteArrayInputStream</b><br/><span class='d'>concrete component</span>\"]:::s0"]),
        code: `ByteArrayOutputStream raw = new ByteArrayOutputStream();
try (DataOutputStream out = new DataOutputStream(new BufferedOutputStream(new java.util.zip.GZIPOutputStream(raw)))) {
    out.writeInt(42);                         // typed write -> buffered -> compressed -> bytes
    out.writeUTF("parking-lot-report");
}
try (DataInputStream in = new DataInputStream(new BufferedInputStream(new java.util.zip.GZIPInputStream(new ByteArrayInputStream(raw.toByteArray()))))) {
    System.out.println(in.readInt() + " " + in.readUTF() + " (" + raw.size() + " compressed bytes)");
}` },
      { title: "Functional decorators and the rules every decorator must follow",
        text: "With Java 8+ a decorator can be a **higher-order function**: take a `Function`/`Supplier` and return a new one that adds behaviour. Great for small cross-cutting concerns (timing, retry, memoisation). Whatever the style, decorators must be transparent to the client.",
        points: [
          "Keep the **contract**: same inputs accepted, same exceptions semantics, no surprising side effects (a decorator is still LSP-bound, F02)",
          "Don't rely on identity or `instanceof` on the decorated object; `b instanceof Espresso` is false once wrapped",
          "Forward **every** interface method; abstract base decorators that forward by default prevent forgetting one",
          "Decorators should be small and single-purpose; compose them rather than writing one that does logging + retry + caching",
          "Document order dependencies (auth before caching, or you cache other users' data!)"],
        code: `static <T, R> Function<T, R> timed(String name, Function<T, R> f) {
    return x -> { long t = System.nanoTime(); try { return f.apply(x); } finally { System.out.println(name + " took " + (System.nanoTime() - t) / 1_000_000 + "ms"); } };
}
static <T, R> Function<T, R> memoized(Function<T, R> f) {
    Map<T, R> cache = new ConcurrentHashMap<>();
    return x -> cache.computeIfAbsent(x, f);
}

Function<Integer, Long> slowSquare = n -> { try { Thread.sleep(50); } catch (InterruptedException e) { } return (long) n * n; };
Function<Integer, Long> fast = timed("square", memoized(slowSquare));     // decorators compose
System.out.println(fast.apply(12));     // ~50ms
System.out.println(fast.apply(12));     // ~0ms: served from the memo layer` }
    ],
    designs: [
      { title: "Mini LLD: a resilient product-catalog client",
        text: "The storefront calls a `CatalogClient.product(id)` backed by a remote service that's sometimes slow or flaky. Requirements: log every call, retry transient failures up to 3 times, cache results for 60 seconds, and record latency metrics. Each concern is a decorator around the same interface, composed in `main`. Removing caching in tests or adding a circuit breaker later is a wiring change.",
        points: [
          "Order (outside → in): `Metrics → Logging → Caching → Retrying → Http`. Cache hits skip retries and the network; metrics see the user-facing latency",
          "Each decorator is ~10 lines and testable alone with a fake inner client",
          "Retry only **transient** errors and only **idempotent** calls (a GET is fine; a POST charge needs an idempotency key)",
          "Libraries: Resilience4j's `Decorators.ofSupplier(..).withRetry(..).withCircuitBreaker(..)` is exactly this pattern"],
        m: H.cd(["classDiagram",
          "  class CatalogClient { <<interface>>; +product(String id) Product }",
          "  class HttpCatalogClient",
          "  class ClientDecorator { <<abstract>>; #CatalogClient inner }",
          "  class RetryingClient { -int maxAttempts }",
          "  class CachingClient { -Map~String, Entry~ cache; -Duration ttl; -Clock clock }",
          "  class LoggingClient",
          "  class MetricsClient { -List~Long~ latencies }",
          "  CatalogClient <|.. HttpCatalogClient", "  CatalogClient <|.. ClientDecorator",
          "  ClientDecorator o-- CatalogClient",
          "  ClientDecorator <|-- RetryingClient", "  ClientDecorator <|-- CachingClient", "  ClientDecorator <|-- LoggingClient", "  ClientDecorator <|-- MetricsClient"]),
        code: `record Product(String id, String name, long price) {}
class TransientException extends RuntimeException { TransientException(String m) { super(m); } }
interface CatalogClient { Product product(String id); }

class FlakyHttpClient implements CatalogClient {              // concrete component (simulated)
    private int calls;
    public Product product(String id) {
        calls++;
        if (calls % 3 == 1) throw new TransientException("503 from catalog");   // every 3rd call starting with the first fails
        return new Product(id, "Notebook", 99);
    }
    int calls() { return calls; }
}
abstract class ClientDecorator implements CatalogClient {
    protected final CatalogClient inner;
    ClientDecorator(CatalogClient inner) { this.inner = inner; }
}
class RetryingClient extends ClientDecorator {
    private final int max;
    RetryingClient(CatalogClient c, int max) { super(c); this.max = max; }
    public Product product(String id) {
        for (int attempt = 1; ; attempt++) {
            try { return inner.product(id); }
            catch (TransientException e) { if (attempt == max) throw e; System.out.println("  retry " + attempt + " after: " + e.getMessage()); }
        }
    }
}
class CachingClient extends ClientDecorator {
    private record Entry(Product p, Instant at) {}
    private final Map<String, Entry> cache = new ConcurrentHashMap<>();
    private final Duration ttl; private final Clock clock;
    CachingClient(CatalogClient c, Duration ttl, Clock clock) { super(c); this.ttl = ttl; this.clock = clock; }
    public Product product(String id) {
        Entry e = cache.get(id);
        if (e != null && e.at().plus(ttl).isAfter(clock.instant())) return e.p();
        Product p = inner.product(id);
        cache.put(id, new Entry(p, clock.instant()));
        return p;
    }
}
class LoggingClient extends ClientDecorator {
    LoggingClient(CatalogClient c) { super(c); }
    public Product product(String id) { System.out.println("GET product " + id); return inner.product(id); }
}

FlakyHttpClient http = new FlakyHttpClient();
CatalogClient client = new LoggingClient(new CachingClient(new RetryingClient(http, 3), Duration.ofSeconds(60), Clock.systemUTC()));
System.out.println(client.product("P1"));
System.out.println(client.product("P1"));                    // cache hit: no network
System.out.println("network calls: " + http.calls());       // 2 (one failure + one success)` },
      { title: "Mini LLD: secure file storage (compress + encrypt + checksum)",
        text: "A document vault stores files through `BlobStore.write(name, bytes)` / `read(name)`. Compliance requires encryption at rest, the team wants compression to cut storage costs, and integrity checks must detect corruption. Each is a decorator; **order is a correctness issue**: compress *then* encrypt on write, and reverse on read. The decorators mirror each other.",
        points: [
          "Write path: `Checksum → Compress → Encrypt → disk`; read path runs the inverse transforms",
          "Encryption keys are injected into `EncryptingStore`, never into the base store",
          "Getting the order wrong (encrypt then compress) still \"works\" but saves nothing; flipping read and write order breaks reads",
          "Real implementations would use AES-GCM via `javax.crypto`; the toy XOR below keeps the example self-contained"],
        code: `interface BlobStore { void write(String name, byte[] data); byte[] read(String name); }
class MemoryStore implements BlobStore {
    final Map<String, byte[]> disk = new HashMap<>();
    public void write(String n, byte[] d) { disk.put(n, d.clone()); }
    public byte[] read(String n) { return disk.get(n).clone(); }
}
abstract class StoreDecorator implements BlobStore {
    protected final BlobStore inner;
    StoreDecorator(BlobStore inner) { this.inner = inner; }
}
class CompressingStore extends StoreDecorator {
    CompressingStore(BlobStore s) { super(s); }
    public void write(String n, byte[] d) {
        try { var bos = new ByteArrayOutputStream(); try (var gz = new java.util.zip.GZIPOutputStream(bos)) { gz.write(d); } inner.write(n, bos.toByteArray()); }
        catch (IOException e) { throw new UncheckedIOException(e); }
    }
    public byte[] read(String n) {
        try (var gz = new java.util.zip.GZIPInputStream(new ByteArrayInputStream(inner.read(n)))) { return gz.readAllBytes(); }
        catch (IOException e) { throw new UncheckedIOException(e); }
    }
}
class EncryptingStore extends StoreDecorator {                      // toy cipher for the demo; use AES-GCM in real code
    private final byte key;
    EncryptingStore(BlobStore s, byte key) { super(s); this.key = key; }
    private byte[] xor(byte[] d) { byte[] o = d.clone(); for (int i = 0; i < o.length; i++) o[i] ^= key; return o; }
    public void write(String n, byte[] d) { inner.write(n, xor(d)); }
    public byte[] read(String n) { return xor(inner.read(n)); }
}
class ChecksumStore extends StoreDecorator {
    private final Map<String, Long> sums = new HashMap<>();
    ChecksumStore(BlobStore s) { super(s); }
    private static long crc(byte[] d) { var c = new java.util.zip.CRC32(); c.update(d); return c.getValue(); }
    public void write(String n, byte[] d) { sums.put(n, crc(d)); inner.write(n, d); }
    public byte[] read(String n) { byte[] d = inner.read(n); if (crc(d) != sums.get(n)) throw new IllegalStateException("corrupt: " + n); return d; }
}

MemoryStore disk = new MemoryStore();
BlobStore vault = new ChecksumStore(new CompressingStore(new EncryptingStore(disk, (byte) 0x5A)));
byte[] doc = "invoice ".repeat(200).getBytes();
vault.write("inv-1", doc);
System.out.println("plain " + doc.length + " bytes, on disk " + disk.disk.get("inv-1").length + " bytes");
System.out.println("round trip ok: " + Arrays.equals(doc, vault.read("inv-1")));
disk.disk.get("inv-1")[20] ^= 1;                               // flip a bit on disk
try { vault.read("inv-1"); } catch (RuntimeException e) { System.out.println("detected: " + e.getClass().getSimpleName()); }` }
    ],
    usages: [
      ["`java.io` streams", "`BufferedInputStream`, `DataInputStream`, `GZIPInputStream`, `CipherInputStream`, `PrintStream` all extend `FilterInputStream`/`FilterOutputStream` and wrap another stream."],
      ["`Collections.unmodifiableList/synchronizedMap/checkedList`", "Wrap a collection with the same interface and add read-only enforcement, locking or runtime type checks."],
      ["`java.util.zip.CheckedInputStream`, `java.security.DigestInputStream`", "Compute checksums or hashes as bytes flow through."],
      ["Servlet `HttpServletRequestWrapper` / `ResponseWrapper`", "Filters wrap requests and responses to add or alter behaviour (caching the body, changing headers)."],
      ["Spring `TransactionAwareDataSourceProxy`, `LazyConnectionDataSourceProxy`", "Wrap a `DataSource` with the same interface to add transaction awareness or laziness (decorator/proxy hybrids)."],
      ["Spring AOP, `@Transactional`, `@Cacheable`, `@Retryable`", "The container wraps your bean in a proxy that adds behaviour around method calls; conceptually decorators applied by the framework."],
      ["Resilience4j `Decorators`, Micrometer `TimedSupplier`", "Wrap suppliers/functions with retry, circuit breaker, rate limiter and timing."]
    ],
    avoid: {
      points: [
        "Only one fixed combination is ever needed: a single class is simpler",
        "The added behaviour needs internals of the wrapped object (private state); decorators only see the interface",
        "Deep stacks (10+ layers) become hard to debug: stack traces and identity get confusing",
        "When clients need to *query* or *remove* a specific layer later, a list of handlers (Chain or Pipeline) is easier than nested wrappers",
        "Cross-cutting concerns across *many* classes are better handled by AOP or a framework interceptor than hand-written decorators per interface"],
      pros: ["Add behaviour without editing or subclassing the original (OCP)", "Combine behaviours at runtime in any order", "Each decorator has a single responsibility (SRP)", "Avoids class explosion from subclass combinations"],
      cons: ["Many small objects; harder debugging and stack traces", "Order dependencies that must be documented", "Identity/`instanceof` checks break", "Interfaces with many methods need lots of forwarding (an abstract base helps)"] },
    compare: [
      ["Proxy (F13)", "Control **access** to an object", "Same structure. A proxy usually manages the real object's lifecycle or access (lazy, remote, security) and is fixed; decorators **add behaviour** and are stacked by the client"],
      ["Adapter (F10)", "Change the interface", "Decorator keeps the interface identical so it can stack"],
      ["Composite (F14)", "Tree of components", "A decorator is like a composite with exactly one child, and adds behaviour instead of aggregating results"],
      ["Chain of Responsibility (F22)", "Pass a request along handlers until one handles it", "In a chain, handlers may **stop** the request; decorators always forward (and add something)"],
      ["Strategy (F17)", "Swap the **inside** (the algorithm)", "Decorator changes the **skin** (wraps from outside); Strategy changes the guts (injected algorithm)"],
      ["Inheritance", "Extend behaviour statically", "Decorator is composition at runtime; inheritance is fixed at compile time and explodes with combinations"]],
    widget: { heading: "Interactive: wrap a coffee", caption: "Step through building an order with decorators. Watch the wrapper stack grow, the cost recompute, and the order-sensitive layers change the result.", render: coffeeWidget },
    examplesHeading: "Real-world analogies and usages",
    examples: [
      ["Analogy: clothing layers", "Sweater, jacket, raincoat: each adds a capability, any combination, and you remain the same person underneath."],
      ["Analogy: gift wrapping", "Box, then paper, then ribbon, then a card. Each layer adds something; the gift doesn't change."],
      ["Java I/O", "`new BufferedReader(new InputStreamReader(new GZIPInputStream(socket.getInputStream())))`: three decorators and one adapter."],
      ["Spring `@Transactional` / `@Cacheable`", "The bean you inject is a wrapper that starts transactions or checks a cache around your method."],
      ["HTTP clients", "OkHttp interceptors and Spring `ClientHttpRequestInterceptor` wrap calls with auth headers, logging and retries."],
      ["Resilience4j", "`Decorators.ofSupplier(call).withCircuitBreaker(cb).withRetry(retry).decorate()` composes resilience decorators."]
    ],
    pitfalls: [
      "Forgetting to forward some interface methods, so the decorated object silently loses behaviour",
      "Order bugs: caching before authorisation, encrypting before compressing, retrying outside a circuit breaker",
      "Decorators that change the contract (throw new exception types, reject valid inputs), violating LSP",
      "`instanceof` or identity checks on a decorated object",
      "Retrying non-idempotent operations (double charges)",
      "One decorator doing many jobs (logging + retry + cache)",
      "Using subclassing for optional features, then hitting the combinatorial explosion",
      "Calling Decorator \"Proxy\" or vice versa without being able to explain the intent difference"
    ],
    quiz: [
      { q: "The defining structural feature of a decorator is that it…", options: ["Extends the concrete class", "Implements the component interface **and** holds a reference to a component it forwards to", "Is a singleton", "Has a different interface from the component"], answer: 1, why: "is-a + has-a the same type, so decorators stack." },
      { q: "`new BufferedReader(new InputStreamReader(in))`: which part is the decorator?", options: ["`InputStreamReader`", "`BufferedReader` (it adds buffering to a `Reader`); `InputStreamReader` is an adapter", "Both are adapters", "Neither"], answer: 1, why: "BufferedReader keeps the Reader interface; InputStreamReader converts bytes to chars." },
      { q: "Why is Decorator better than subclassing for coffee add-ons?", options: ["It's faster", "Combinations are built at runtime by nesting, so you need one class per add-on instead of one per combination", "Subclasses can't override cost()", "It uses less memory"], answer: 1, why: "Avoids the combinatorial class explosion and allows doubles." },
      { q: "In a client stack `Logging → Caching → Retrying → Http`, what happens on a cache hit?", options: ["The request is retried", "Caching returns immediately; Retrying and Http are never called", "Http is called anyway", "Logging is skipped"], answer: 1, why: "Outer layers run first; the cache short-circuits the inner ones." },
      { q: "Which statement about Decorator vs Proxy is most accurate?", options: ["They have different class diagrams", "Same structure; Decorator adds behaviour and is composed by clients in stacks, while Proxy controls access or lifecycle of a real subject", "Proxy changes the interface", "Decorators can't be nested"], answer: 1, why: "Intent separates them." },
      { q: "You wrap a payment `charge()` with a retry decorator. What must be true for this to be safe?", options: ["Nothing", "The operation is idempotent (e.g. uses an idempotency key) and only transient errors are retried", "The decorator is a singleton", "The gateway is synchronous"], answer: 1, why: "Otherwise a timeout-then-retry can charge twice." },
      { q: "`Collections.unmodifiableList(list)` is a decorator because…", options: ["It copies the list", "It returns a `List` that wraps the original and blocks mutations, delegating reads", "It sorts the list", "It's a subclass of ArrayList"], answer: 1, why: "Same interface, added restriction, backed by the original (changes to the original show through)." },
      { q: "When is a Chain of Responsibility a better fit than nested decorators?", options: ["Never", "When handlers may stop the request, or the set of steps must be inspected or reordered at runtime as a list", "When there is one step", "When the interface changes"], answer: 1, why: "Decorators always forward; chains can short-circuit and are easier to manage as data." }
    ],
    cheatsheet: {
      table: [
        ["Element", "Rule", "Example"],
        ["Component", "the interface everyone implements", "`Beverage`, `InputStream`, `CatalogClient`"],
        ["Base decorator", "abstract, holds `inner`, forwards by default", "`AddOn`, `FilterInputStream`"],
        ["Concrete decorator", "one behaviour, before/after forwarding", "`Milk`, `BufferedInputStream`, `RetryingClient`"],
        ["Composition", "built once in `main` or config, outermost first", "`new Logging(new Caching(new Retrying(http)))`"],
        ["Order", "document it; it can change results", "compress → encrypt; auth → cache"]],
      cards: [
        { title: "Use for", items: ["Optional add-ons in any combination", "Cross-cutting: logging, metrics, retry, cache, auth", "Stream transforms: buffer, compress, encrypt, checksum", "Read-only / synchronized views"] },
        { title: "Rules", items: ["Same contract as inner (LSP)", "Forward every method", "One job per decorator", "Retry only idempotent calls", "No `instanceof` on wrapped objects"] },
        { title: "Tell apart", items: ["Interface changes → Adapter", "Access control/lazy/remote → Proxy", "May stop the request → Chain", "Swap the algorithm inside → Strategy"] }]
    },
    practice: [
      { level: "Easy", q: "Explain Decorator with the Java I/O example, and list which classes are components, decorators and adapters in `new BufferedReader(new InputStreamReader(new FileInputStream(\"a.txt\"), UTF_8))`.",
        a: ["`FileInputStream`: concrete component (byte source).", "`InputStreamReader`: **adapter** (bytes → chars, `InputStream` → `Reader`).", "`BufferedReader`: **decorator** on `Reader` (adds buffering and `readLine()`).", "Each wrapper adds one capability; closing the outer reader closes the chain."] },
      { level: "Easy", q: "Add a `Whip` (+₹25) and a `HalfSugar` (no price change, description only) decorator to the coffee example and build \"Espresso, milk, whip, half sugar\".",
        code: `interface Beverage { long cost(); String description(); }
record Espresso() implements Beverage { public long cost() { return 120; } public String description() { return "Espresso"; } }
abstract class AddOn implements Beverage {
    protected final Beverage inner; AddOn(Beverage b) { inner = b; }
    public long cost() { return inner.cost(); }                       // forward by default
    public String description() { return inner.description(); }
}
class Milk extends AddOn { Milk(Beverage b) { super(b); } public long cost() { return inner.cost() + 30; } public String description() { return inner.description() + ", milk"; } }
class Whip extends AddOn { Whip(Beverage b) { super(b); } public long cost() { return inner.cost() + 25; } public String description() { return inner.description() + ", whip"; } }
class HalfSugar extends AddOn { HalfSugar(Beverage b) { super(b); } public String description() { return inner.description() + ", half sugar"; } }   // cost forwarded

Beverage b = new HalfSugar(new Whip(new Milk(new Espresso())));
System.out.println(b.description() + " = ₹" + b.cost());   // 175` },
      { level: "Medium", q: "Write a `RateLimitedNotifier` decorator that allows at most N notifications per user per minute (others are dropped and counted), and a `DedupNotifier` that suppresses identical messages to the same user within 5 minutes. Use an injected `Clock`.",
        code: `interface Notifier { void send(String user, String msg); }
class ConsoleNotifier implements Notifier { public void send(String u, String m) { System.out.println("-> " + u + ": " + m); } }

class RateLimitedNotifier implements Notifier {
    private final Notifier inner; private final int perMinute; private final Clock clock;
    private final Map<String, Deque<Instant>> sent = new HashMap<>(); int dropped;
    RateLimitedNotifier(Notifier inner, int perMinute, Clock clock) { this.inner = inner; this.perMinute = perMinute; this.clock = clock; }
    public synchronized void send(String user, String msg) {
        Instant now = clock.instant();
        Deque<Instant> q = sent.computeIfAbsent(user, k -> new ArrayDeque<>());
        while (!q.isEmpty() && q.peekFirst().isBefore(now.minusSeconds(60))) q.pollFirst();   // sliding window
        if (q.size() >= perMinute) { dropped++; return; }
        q.addLast(now); inner.send(user, msg);
    }
}
class DedupNotifier implements Notifier {
    private final Notifier inner; private final Clock clock; private final Map<String, Instant> last = new HashMap<>();
    DedupNotifier(Notifier inner, Clock clock) { this.inner = inner; this.clock = clock; }
    public synchronized void send(String user, String msg) {
        String key = user + "|" + msg; Instant now = clock.instant(), prev = last.get(key);
        if (prev != null && prev.plus(Duration.ofMinutes(5)).isAfter(now)) return;
        last.put(key, now); inner.send(user, msg);
    }
}

Clock clock = Clock.fixed(Instant.parse("2026-11-11T10:00:00Z"), ZoneOffset.UTC);
RateLimitedNotifier limited = new RateLimitedNotifier(new ConsoleNotifier(), 2, clock);
Notifier n = new DedupNotifier(limited, clock);
n.send("u1", "OTP 1111"); n.send("u1", "OTP 1111"); n.send("u1", "OTP 2222"); n.send("u1", "OTP 3333");
System.out.println("dropped by rate limit: " + limited.dropped);`,
        follow: "Which order is right: Dedup outside RateLimit, or inside? Outside, so duplicates don't consume rate-limit budget." },
      { level: "Medium", q: "Implement a `MetricsRepository` decorator for `interface OrderRepository { Optional<Order> find(String id); void save(Order o); }` that counts calls and records the max latency per method, without touching the real repository.",
        code: `record Order(String id) {}
interface OrderRepository { Optional<Order> find(String id); void save(Order o); }
class InMemoryOrders implements OrderRepository {
    private final Map<String, Order> m = new HashMap<>();
    public Optional<Order> find(String id) { return Optional.ofNullable(m.get(id)); }
    public void save(Order o) { m.put(o.id(), o); }
}
class MetricsRepository implements OrderRepository {
    private final OrderRepository inner;
    final Map<String, Long> calls = new TreeMap<>(), maxNanos = new TreeMap<>();
    MetricsRepository(OrderRepository inner) { this.inner = inner; }
    private <T> T timed(String name, Supplier<T> s) {
        long t = System.nanoTime();
        try { return s.get(); }
        finally { calls.merge(name, 1L, Long::sum); maxNanos.merge(name, System.nanoTime() - t, Math::max); }
    }
    public Optional<Order> find(String id) { return timed("find", () -> inner.find(id)); }
    public void save(Order o) { timed("save", () -> { inner.save(o); return null; }); }
}

MetricsRepository repo = new MetricsRepository(new InMemoryOrders());
repo.save(new Order("o1")); repo.find("o1"); repo.find("o2");
System.out.println("calls " + repo.calls + ", has max latency for " + repo.maxNanos.keySet());` },
      { level: "Medium", q: "Text processing pipeline: a `TextSource` returns text; add decorators that trim whitespace, mask emails (`a***@x.com`), and truncate to N characters. Show that order changes the result.",
        code: `interface TextSource { String text(); }
record Raw(String s) implements TextSource { public String text() { return s; } }
record Trim(TextSource in) implements TextSource { public String text() { return in.text().strip(); } }
record MaskEmails(TextSource in) implements TextSource {
    public String text() { return in.text().replaceAll("([A-Za-z0-9._])[A-Za-z0-9._]*@", "$1***@"); }
}
record Truncate(TextSource in, int n) implements TextSource {
    public String text() { String t = in.text(); return t.length() <= n ? t : t.substring(0, n) + "…"; }
}

TextSource raw = new Raw("   Contact asha.k@shop.in for refunds   ");
System.out.println(new Truncate(new MaskEmails(new Trim(raw)), 14).text());   // mask, then truncate: "Contact a***@s…"
System.out.println(new MaskEmails(new Truncate(new Trim(raw), 14)).text());   // truncate first: "@" is cut off, so the name leaks unmasked`,
        follow: "Records make tiny decorators very compact: the component is the record's one field." },
      { level: "Hard", q: "Design pizza/menu pricing for a food-delivery app where items have add-ons (decorators), but discounts and taxes are applied at the **cart** level. Explain why you would *not* make discounts decorators on items, and sketch the classes.",
        a: ["Item add-ons (extra cheese, toppings, size) are properties of one item: decorators (or simply a list of add-ons) fit.",
          "Discounts depend on the **whole cart** (min order value, buy-2-get-1, coupon caps across items) and on business rules that change weekly; they're **policies**, so model them as `DiscountRule` strategies applied by a `PricingEngine` over the cart (Strategy/Chain, F17/F22).",
          "Taxes depend on item category and jurisdiction; a `TaxCalculator` strategy over line items keeps tax logic out of the menu model.",
          "Wrapping an item in `Discount10(item)` would apply per item, make caps impossible, and mix catalog data with pricing policy.",
          "Result: `MenuItem` (+ add-on decorators) → `CartLine` → `Cart` → `PricingEngine(List<DiscountRule>, TaxCalculator)` → `Bill`."],
        m: H.cd(["classDiagram",
          "  class MenuItem { <<interface>>; +price() long; +name() String }",
          "  class AddOnDecorator { <<abstract>>; #MenuItem inner }",
          "  class Cart { -List~CartLine~ lines }",
          "  class PricingEngine { -List~DiscountRule~ rules; -TaxCalculator tax; +bill(Cart c) Bill }",
          "  class DiscountRule { <<interface>>; +apply(Cart c, long subtotal) long }",
          "  MenuItem <|.. Pizza", "  MenuItem <|.. AddOnDecorator", "  AddOnDecorator o-- MenuItem",
          "  AddOnDecorator <|-- ExtraCheese", "  Cart *-- CartLine", "  CartLine --> MenuItem",
          "  PricingEngine --> DiscountRule", "  DiscountRule <|.. FlatOffAboveMin", "  DiscountRule <|.. BuyTwoGetOne"]) },
      { level: "Hard", q: "Spring's `@Transactional` and `@Cacheable` are applied by wrapping your bean. Why does calling a `@Transactional` method from another method **of the same class** not start a transaction? How do decorators explain it?",
        a: ["Spring injects a **wrapper** (a proxy that decorates your bean) into other beans. Calls *from outside* go through the wrapper, which starts the transaction and then forwards to your object.",
          "A call from inside the same object (`this.save()`) goes directly to the target, **bypassing** the wrapper, so no transaction or caching happens. Self-invocation never passes through an outer decorator.",
          "Fixes: move the method to another bean, inject the proxy of itself (`@Lazy` self-injection), use `TransactionTemplate` programmatically, or use AspectJ weaving (which modifies bytecode instead of wrapping).",
          "Same lesson for hand-written decorators: behaviour added by a wrapper applies only to calls made through the wrapper reference."] },
      { level: "Hard", q: "Implement a generic **decorator factory** with `java.lang.reflect.Proxy` that adds logging to *any* interface without writing a class per interface. When is this better than hand-written decorators, and what are the costs?",
        code: `@SuppressWarnings("unchecked")
static <T> T logged(Class<T> iface, T target) {
    return (T) java.lang.reflect.Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[]{iface}, (proxy, method, args) -> {
        System.out.println("-> " + method.getName() + Arrays.toString(args == null ? new Object[0] : args));
        try { Object r = method.invoke(target, args); System.out.println("<- " + r); return r; }
        catch (java.lang.reflect.InvocationTargetException e) { throw e.getCause(); }   // rethrow the real exception
    });
}
interface Calculator { int add(int a, int b); int div(int a, int b); }
class BasicCalculator implements Calculator { public int add(int a, int b) { return a + b; } public int div(int a, int b) { return a / b; } }

Calculator c = logged(Calculator.class, new BasicCalculator());
c.add(2, 3);
try { c.div(1, 0); } catch (ArithmeticException e) { System.out.println("caught " + e.getMessage()); }`,
        follow: "Better when one concern applies to many interfaces (that's how Spring AOP's JDK proxies work). Costs: reflection overhead, interface-only (no classes without bytecode libraries), harder debugging, and the self-invocation limitation from the previous question." }
    ],
    recap: [
      "Decorator = wrap an object in another with the same interface to add behaviour; wrappers stack in any order at runtime.",
      "Shape: is-a + has-a Component; an abstract base decorator forwards by default; each concrete decorator does one thing.",
      "Java I/O is the canonical example (`Buffered…`, `GZIP…`, `Cipher…` streams); `InputStreamReader` in the chain is an adapter.",
      "Use it for add-ons and cross-cutting concerns (logging, metrics, retry, cache, auth, compression, encryption); document order, and retry only idempotent calls.",
      "Same structure as Proxy, different intent; Chain can stop requests; Strategy swaps internals. Spring AOP wrappers explain the self-invocation trap."
    ]
  });
})();
