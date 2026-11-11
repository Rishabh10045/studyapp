/* Lesson F18: Observer */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var TICKS = [2480, 2512, 2495, 2560, 2431, 2605, 2590, 2470];
  var OBS = [
    { id: "board", name: "PriceBoard", react: function (p, prev) { return "shows ₹" + p + (prev ? (p >= prev ? " ▲" : " ▼") : ""); } },
    { id: "alert", name: "AlertRule(> ₹2,550)", react: function (p) { return p > 2550 ? "🔔 notifies Asha: crossed ₹2,550" : null; } },
    { id: "pf", name: "Portfolio(40 shares)", react: function (p) { return "value ₹" + (p * 40).toLocaleString("en-IN"); } },
    { id: "audit", name: "AuditLog", react: function (p) { return "records tick " + p; } }
  ];
  function tickerWidget(el, ctx) {
    var s = ctx.state; if (!s.subs) { s.subs = { board: true, alert: true, pf: false, audit: false }; s.i = -1; s.log = []; }
    el.innerHTML = "<p>" + ctx.md("`Stock(\"INFY\")` is the **subject**. Toggle which **observers** are subscribed, then publish price ticks. The subject loops over whoever is registered right now; it doesn't know what each observer does.") + "</p>" +
      "<div class='field'>Subscribed observers (click to subscribe/unsubscribe)</div><div class='btnrow' data-r='obs'></div>" +
      "<div class='btnrow'><button type='button' class='btn primary' data-r='tick'>Publish next tick</button><button type='button' class='btn' data-r='reset'>Reset</button></div>" +
      "<div class='metrics' data-r='m'></div><pre class='code' data-r='log'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("obs").innerHTML = OBS.map(function (o) { var on = s.subs[o.id]; return "<button type='button' class='btn" + (on ? " correct" : "") + "' data-o='" + o.id + "'>" + (on ? "✓ " : "+ ") + ctx.esc(o.name) + "</button>"; }).join("");
      var n = OBS.filter(function (o) { return s.subs[o.id]; }).length;
      q("m").innerHTML = "<div class='metric'><div class='v'>" + (s.i >= 0 ? "₹" + TICKS[s.i % TICKS.length] : "–") + "</div><div class='l'>INFY last price</div></div><div class='metric'><div class='v'>" + n + "</div><div class='l'>observers registered</div></div>";
      q("log").textContent = s.log.length ? s.log.slice(-14).join("\n") : "// stock.setPrice(...) will call update() on each registered observer";
    }
    q("obs").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-o]"); if (!b) return; var id = b.getAttribute("data-o"), o = OBS.filter(function (x) { return x.id === id; })[0];
      s.subs[id] = !s.subs[id]; s.log.push((s.subs[id] ? "stock.subscribe(" : "stock.unsubscribe(") + o.name + ")"); ctx.save(); draw();
    });
    q("tick").addEventListener("click", function () {
      var prev = s.i >= 0 ? TICKS[s.i % TICKS.length] : null; s.i++; var p = TICKS[s.i % TICKS.length];
      s.log.push("stock.setPrice(" + p + ")  -> notify " + OBS.filter(function (o) { return s.subs[o.id]; }).length + " observer(s)");
      OBS.forEach(function (o) { if (!s.subs[o.id]) return; var r = o.react(p, prev); s.log.push("   " + o.name + ".update(INFY, " + p + "): " + (r || "no action")); });
      ctx.save(); draw();
    });
    q("reset").addEventListener("click", function () { s.subs = { board: true, alert: true, pf: false, audit: false }; s.i = -1; s.log = []; ctx.save(); draw(); });
    draw();
  }
  H.pattern({
    code: "F18", name: "Observer",
    summary: "Observer defines a one-to-many dependency so that when one object (the subject) changes state, all its dependents (observers) are notified automatically. This lesson covers subscribe/unsubscribe/notify, push vs pull models, generic event types, a stock ticker with price alerts, an order-status notification system across email/SMS/push, domain events and Spring's `ApplicationEventPublisher` and `@EventListener`, memory leaks from forgotten listeners, thread safety and exceptions during notification, and Observer vs pub-sub vs Mediator.",
    intent: "Define a **one-to-many dependency** between objects so that when one object changes state, all its dependents are **notified and updated automatically**, without the subject knowing their concrete classes.",
    problem: {
      text: "When an order is shipped, the system must email the customer, send an SMS, push a mobile notification, update the analytics dashboard and award loyalty points. The first version calls all five from `OrderService.ship()`. Each new reaction edits `ship()`, a slow SMS vendor slows shipping, and an analytics exception rolls back a shipment.",
      points: [
        "The subject (order, stock price, sensor) shouldn't know **who** cares about its changes",
        "Observers register (`subscribe`) and deregister (`unsubscribe`) themselves at runtime",
        "On change, the subject calls `update(...)` on each registered observer",
        "New reactions are new observers; the subject is closed for modification (OCP) and loosely coupled (DIP)"],
      code: `class OrderService {
    void ship(String orderId) {
        System.out.println("order " + orderId + " shipped");
        System.out.println("email customer");          // every new reaction edits this method
        System.out.println("sms customer");
        System.out.println("push notification");
        System.out.println("analytics.track");
        System.out.println("loyalty.award");
    }
}
new OrderService().ship("ORD-7");` },
    analogy: "A YouTube channel and its subscribers. The creator uploads once; everyone who pressed Subscribe (and the bell) gets notified. The creator doesn't know or call each viewer individually, and viewers can unsubscribe whenever they like.",
    structure: {
      text: "The **Subject** keeps a list of **Observers** and offers `subscribe`, `unsubscribe` and `notify`. Each **ConcreteObserver** implements `update`. When the **ConcreteSubject**'s state changes, it calls `notify`, which loops over the current observers. In the **push** model the subject sends the changed data in `update(event)`; in the **pull** model it sends only itself and observers query what they need.",
      m: H.cd(["classDiagram",
        "  class Stock { -String symbol; -long price; -List~PriceListener~ listeners; +subscribe(PriceListener l); +unsubscribe(PriceListener l); +setPrice(long p) }",
        "  class PriceListener { <<interface>>; +onPrice(String symbol, long oldP, long newP) }",
        "  class PriceBoard", "  class AlertRule { -long threshold }", "  class Portfolio { -int shares }",
        "  Stock o-- PriceListener : observers",
        "  PriceListener <|.. PriceBoard", "  PriceListener <|.. AlertRule", "  PriceListener <|.. Portfolio"]),
      roles: [["Subject", "Holds observers; subscribe/unsubscribe/notify"], ["Concrete subject", "Has the state; calls notify when it changes (`Stock`)"], ["Observer", "Interface with the update callback (`PriceListener`)"], ["Concrete observer", "Reacts to updates (board, alert rule, portfolio)"]],
      points: ["The subject depends only on the observer **interface**, never on concrete observers", "Notification order is usually unspecified; don't let observers depend on each other's order"] },
    impl: {
      title: "Java implementation: a stock ticker",
      text: "`Stock` notifies only when the price actually changes (push model: symbol, old and new price). Listeners are kept in a `CopyOnWriteArrayList` so a listener can unsubscribe itself during notification without a `ConcurrentModificationException`, and so subscribing from another thread is safe. One failing observer doesn't stop the rest.",
      code: `interface PriceListener { void onPrice(String symbol, long oldP, long newP); }
class Stock {
    private final String symbol; private long price;
    private final List<PriceListener> listeners = new java.util.concurrent.CopyOnWriteArrayList<>();
    Stock(String symbol, long price) { this.symbol = symbol; this.price = price; }
    Runnable subscribe(PriceListener l) { listeners.add(l); return () -> listeners.remove(l); }      // returns an unsubscribe handle
    void setPrice(long p) {
        if (p == price) return;
        long old = price; price = p;
        for (PriceListener l : listeners) {
            try { l.onPrice(symbol, old, p); }
            catch (RuntimeException e) { System.out.println("  listener failed: " + e.getMessage()); }   // isolate failures
        }
    }
}
class PriceBoard implements PriceListener { public void onPrice(String s, long o, long n) { System.out.println("  board " + s + " ₹" + n + (n > o ? " ▲" : " ▼")); } }
class AlertRule implements PriceListener {
    private final long above; private final Runnable[] handle = new Runnable[1];
    AlertRule(long above) { this.above = above; }
    void attach(Stock s) { handle[0] = s.subscribe(this); }
    public void onPrice(String s, long o, long n) {
        if (n > above) { System.out.println("  ALERT " + s + " crossed ₹" + above); handle[0].run(); }      // one-shot: unsubscribe itself
    }
}

Stock infy = new Stock("INFY", 2480);
infy.subscribe(new PriceBoard());
new AlertRule(2550).attach(infy);
infy.subscribe((s, o, n) -> { if (n < 2450) throw new IllegalStateException("risk engine down"); });
for (long p : new long[]{2512, 2560, 2600, 2431}) { System.out.println("tick " + p); infy.setPrice(p); }` },
    variants: [
      { title: "Push vs pull, and typed events",
        text: "**Push**: the subject sends the data observers need (`onPrice(symbol, old, new)`). Simple, but every observer gets everything, and the signature must change when data changes. **Pull**: the subject sends itself (`update(subject)`) and observers call getters for what they need. Flexible, but observers couple to the subject's API and may read inconsistent state if it keeps changing. A common middle ground is an **immutable event object** (`PriceChanged` record): adding a field doesn't break observers, and the event is a consistent snapshot.",
        table: [
          ["", "Push (data in callback)", "Pull (observer queries subject)", "Event object"],
          ["Coupling", "to the callback signature", "to the subject's getters", "to the event type"],
          ["Consistency", "snapshot at notify time", "may read newer state", "immutable snapshot"],
          ["Evolving", "signature changes break all observers", "add getters freely", "add fields to the record"],
          ["Example", "`PropertyChangeListener` (old/new values)", "`java.util.Observer.update(Observable, Object)`", "Spring `ApplicationEvent`, domain events"]],
        code: `sealed interface OrderEvent permits Placed, Shipped, Cancelled { String orderId(); }
record Placed(String orderId, long amount) implements OrderEvent {}
record Shipped(String orderId, String awb) implements OrderEvent {}
record Cancelled(String orderId, String reason) implements OrderEvent {}

class EventBus {                                                           // typed subscriptions
    private final Map<Class<?>, List<java.util.function.Consumer<Object>>> subs = new HashMap<>();
    @SuppressWarnings("unchecked")
    <E> void on(Class<E> type, java.util.function.Consumer<E> handler) { subs.computeIfAbsent(type, k -> new ArrayList<>()).add(e -> handler.accept((E) e)); }
    void publish(Object event) { subs.getOrDefault(event.getClass(), List.of()).forEach(h -> h.accept(event)); }
}

EventBus bus = new EventBus();
bus.on(Shipped.class, e -> System.out.println("sms: your order " + e.orderId() + " is on the way, AWB " + e.awb()));
bus.on(Placed.class, e -> System.out.println("analytics: revenue +" + e.amount()));
bus.on(Cancelled.class, e -> System.out.println("refund started for " + e.orderId() + " (" + e.reason() + ")"));
List<OrderEvent> events = List.of(new Placed("O1", 49_900), new Shipped("O1", "AWB77"), new Cancelled("O2", "customer request"));
events.forEach(bus::publish);`,
        points: [
          "`java.util.Observer`/`Observable` are deprecated since Java 9 (not serialisable-safe, class-based subject, no typed events); write your own interface or use `PropertyChangeSupport` / Flow / an event bus",
          "Typed events with `sealed` interfaces let `switch` handle every event kind exhaustively"] },
      { title: "Observer vs pub-sub (and where Mediator fits)",
        text: "In classic Observer, observers register **directly on the subject**, notification is usually **synchronous and in-process**, and the subject holds references to observers. In **publish-subscribe**, a **broker** (event bus, Kafka, Redis pub/sub, SNS) sits in the middle: publishers and subscribers don't know each other, communicate by **topic**, and delivery is often **asynchronous** and possibly **cross-process**.",
        m: M(["flowchart LR",
          "  subgraph OBS[\"Observer (in-process)\"]",
          "    S1[\"<b>Stock</b><br/><span class='d'>subject keeps the list</span>\"]:::s0 --> O1[\"Board\"]:::s1",
          "    S1 --> O2[\"Alert\"]:::s1",
          "  end",
          "  subgraph PS[\"Pub-sub (broker)\"]",
          "    P1[\"<b>Order service</b><br/><span class='d'>publisher</span>\"]:::s0 --> B[(\"<b>Broker</b><br/>topic: orders\")]:::s2",
          "    B --> C1[\"Email service\"]:::s1",
          "    B --> C2[\"Analytics\"]:::s1",
          "  end"]),
        points: [
          "Observer: simplest, synchronous, same JVM; the subject's lifetime holds observers in memory",
          "Pub-sub: decoupled in time and space; needs delivery guarantees (at-least-once, idempotent consumers), ordering per key, dead-letter queues",
          "Mediator (F24) also centralises communication, but it contains **coordination logic** between colleagues, whereas a broker just routes",
          "In HLD terms: Observer inside a service, pub-sub between services (with the outbox pattern for reliability)"] }
    ],
    designs: [
      { title: "Mini LLD: order-status notifications across channels",
        text: "Customers get updates when their order changes status (PLACED, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED). Channels are email, SMS, push and WhatsApp; users choose channels per event type; marketing-style events must respect quiet hours. `Order` (subject) publishes `OrderStatusChanged`; a `NotificationDispatcher` observer fans out to channel senders **asynchronously**, so a slow SMS vendor never delays the status update.",
        points: [
          "`Order.transitionTo(newStatus)` validates the transition, then publishes `OrderStatusChanged(orderId, from, to, at)`",
          "Observers: `NotificationDispatcher`, `AnalyticsTracker`, `LoyaltyAwarder` (on DELIVERED), `SearchIndexer`. None know each other",
          "Dispatcher looks up `UserPreferences` and sends via each enabled `ChannelSender` on an `ExecutorService`; failures are retried and logged, never thrown back to the order",
          "Idempotency: key = (orderId, status, channel) so a retried event doesn't double-SMS",
          "Across services: publish the same event to Kafka via an **outbox** table written in the same DB transaction as the status change"],
        m: M(["sequenceDiagram",
          "  participant O as Order",
          "  participant D as NotificationDispatcher",
          "  participant A as AnalyticsTracker",
          "  participant P as UserPreferences",
          "  participant X as Executor",
          "  participant S as SmsSender",
          "  O->>O: transitionTo(SHIPPED)",
          "  O->>D: onEvent(OrderStatusChanged)",
          "  D->>P: channelsFor(user, SHIPPED)",
          "  D->>X: submit(send sms), submit(send push)",
          "  D-->>O: returns immediately",
          "  O->>A: onEvent(OrderStatusChanged)",
          "  X->>S: send(user, text)"]),
        code: `enum Status { PLACED, PACKED, SHIPPED, DELIVERED }
record StatusChanged(String orderId, String user, Status from, Status to) {}
interface OrderListener { void onEvent(StatusChanged e); }

class Order {
    private final String id, user; private Status status = Status.PLACED;
    private final List<OrderListener> listeners;
    Order(String id, String user, List<OrderListener> ls) { this.id = id; this.user = user; listeners = ls; }
    void transitionTo(Status next) {
        if (next.ordinal() != status.ordinal() + 1) throw new IllegalStateException(status + " -> " + next + " not allowed");
        StatusChanged e = new StatusChanged(id, user, status, next);
        status = next;
        listeners.forEach(l -> l.onEvent(e));
    }
}
class NotificationDispatcher implements OrderListener {
    private final Map<String, Map<Status, List<String>>> prefs; private final ExecutorService pool; private final Set<String> sent = ConcurrentHashMap.newKeySet();
    NotificationDispatcher(Map<String, Map<Status, List<String>>> prefs, ExecutorService pool) { this.prefs = prefs; this.pool = pool; }
    public void onEvent(StatusChanged e) {
        for (String ch : prefs.getOrDefault(e.user(), Map.of()).getOrDefault(e.to(), List.of())) {
            String key = e.orderId() + "/" + e.to() + "/" + ch;
            if (!sent.add(key)) continue;                                   // idempotent
            pool.submit(() -> System.out.println("  [" + ch + "] " + e.user() + ": order " + e.orderId() + " is " + e.to()));
        }
    }
}
class LoyaltyAwarder implements OrderListener {
    public void onEvent(StatusChanged e) { if (e.to() == Status.DELIVERED) System.out.println("  loyalty: +50 points to " + e.user()); }
}

ExecutorService pool = Executors.newSingleThreadExecutor();
Map<String, Map<Status, List<String>>> prefs = Map.of("asha", Map.of(Status.SHIPPED, List.of("SMS", "PUSH"), Status.DELIVERED, List.of("PUSH")));
Order o = new Order("O-9", "asha", List.of(new NotificationDispatcher(prefs, pool), new LoyaltyAwarder()));
for (Status s : List.of(Status.PACKED, Status.SHIPPED, Status.DELIVERED)) o.transitionTo(s);
pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS);
try { o.transitionTo(Status.SHIPPED); } catch (IllegalStateException ex) { System.out.println(ex.getMessage()); }` },
      { title: "Mini LLD: \"notify me when back in stock\"",
        text: "Users tap *Notify me* on an out-of-stock product. When inventory goes from 0 to > 0, subscribers should be notified once, **in order of subscription**, but only as many as there is stock for (notifying 10,000 people about 20 units creates angry customers). Each `Product` (or SKU) is a subject; subscriptions are persisted because they live for weeks.",
        points: [
          "`StockSubject` per SKU publishes `BackInStock(sku, qty)` only on the **0 → positive** edge (not on every restock)",
          "`WaitlistNotifier` observer pops up to `qty × 3` subscribers from a FIFO queue (over-notify a little since not all will buy) and sends notifications",
          "Subscriptions are stored (`sku, userId, createdAt`), unique per (sku, user); unsubscribe on purchase or after 30 days",
          "Notifying in batches through a queue protects the notification service from spikes when a popular product restocks",
          "Edge cases: stock flaps 0 → 5 → 0 → 5 (debounce), user unsubscribed meanwhile, price changed since subscription (include the current price)"],
        m: H.cd(["classDiagram",
          "  class InventoryService { +restock(String sku, int qty) }",
          "  class StockSubject { -Map~String,Integer~ qty; -List~StockListener~ listeners; +setQty(String sku, int q) }",
          "  class StockListener { <<interface>>; +onBackInStock(String sku, int qty) }",
          "  class WaitlistNotifier { -WaitlistRepo repo; -Notifier notifier; +onBackInStock(String sku, int qty) }",
          "  class PriceWatchNotifier",
          "  class WaitlistRepo { +nextBatch(String sku, int n) List~Subscription~; +remove(Subscription s) }",
          "  InventoryService --> StockSubject",
          "  StockSubject o-- StockListener",
          "  StockListener <|.. WaitlistNotifier", "  StockListener <|.. PriceWatchNotifier",
          "  WaitlistNotifier --> WaitlistRepo"]) }
    ],
    usages: [
      ["`java.beans.PropertyChangeSupport` / `PropertyChangeListener`", "Bean properties notify listeners with old and new values (push model)."],
      ["Swing/AWT listeners (`ActionListener`, `addMouseListener`)", "UI components are subjects; your handlers are observers."],
      ["`java.util.concurrent.Flow` (Publisher/Subscriber), Reactor, RxJava", "Reactive streams: observer plus back-pressure (`request(n)`)."],
      ["`CompletableFuture.thenAccept/whenComplete`", "Callbacks registered on a future run when it completes: a one-shot observer."],
      ["Spring `ApplicationEventPublisher` + `@EventListener` / `@TransactionalEventListener`", "Publish domain events; listeners are found by event type. `@TransactionalEventListener(phase = AFTER_COMMIT)` runs only if the transaction commits."],
      ["Servlet `HttpSessionListener`, `ServletContextListener`", "Container lifecycle events delivered to registered listeners."],
      ["`java.nio.file.WatchService`", "Register directories and receive file-system change events."]
    ],
    avoid: {
      points: [
        "There's exactly one, fixed reaction: a direct method call is clearer and easier to debug",
        "Reactions must happen in a strict order or inside one transaction with the subject: explicit orchestration is safer than hidden listeners",
        "Cross-service communication: use a broker with delivery guarantees (pub-sub), not in-memory observers",
        "Cascades: observers that update subjects that notify other observers (A → B → A) become impossible to reason about",
        "High-frequency updates where observers can't keep up: you need back-pressure (reactive streams) or sampling"],
      pros: ["Loose coupling: subject knows only the observer interface", "Open/closed: add reactions without editing the subject", "Runtime subscribe/unsubscribe", "Natural fit for UIs, events, monitoring"],
      cons: ["Control flow is implicit; harder to trace \"who reacted to what\"", "Memory leaks if observers aren't removed (lapsed listener problem)", "Unexpected cascades and update storms", "Exceptions and slow observers affect the subject unless isolated", "Ordering is unspecified"] },
    compare: [
      ["Pub-sub (broker)", "Decouple publishers and subscribers by topic, often async/distributed", "Observers register on the subject directly; pub-sub adds a broker so neither side knows the other"],
      ["Mediator (F24)", "Central object coordinates colleagues", "Observer just broadcasts changes; a mediator contains the interaction rules between participants (often implemented with observer-style callbacks)"],
      ["Chain of Responsibility (F22)", "Pass a request until one handler handles it", "Observer notifies **all** observers; Chain stops at the first handler that handles the request (typically)"],
      ["Strategy (F17)", "One interchangeable algorithm", "A strategy is called for a result; observers are notified and the subject ignores what they do"],
      ["Command (F19)", "Request as an object", "Events in an event bus are often command-like objects; Observer is about the notification relationship"]],
    widget: { heading: "Interactive: a stock ticker with observers", caption: "Subscribe and unsubscribe observers, then publish price ticks and read the notification log. State is saved.", render: tickerWidget },
    pitfalls: [
      "Lapsed listeners: observers never unsubscribed keep objects (and whole screens) alive: memory leaks",
      "`ConcurrentModificationException` when an observer unsubscribes during notification (use `CopyOnWriteArrayList` or iterate a copy)",
      "One observer's exception stopping notification of the rest, or rolling back the subject's change",
      "Slow observers blocking the subject's thread (dispatch async for slow work)",
      "Notifying before the state change is complete (observers read half-updated state)",
      "Notification storms: notifying on every field change instead of batching or notifying on meaningful edges",
      "Depending on notification order between observers",
      "Using in-memory events for things that must survive a crash (use an outbox + broker)"
    ],
    quiz: [
      { q: "What is Observer's intent?", options: ["Create families of objects", "One-to-many dependency: when the subject changes, dependents are notified automatically", "Undo operations", "Simplify a subsystem"], answer: 1, why: "Broadcast state changes to registered dependents." },
      { q: "Which collection avoids `ConcurrentModificationException` when a listener unsubscribes during notify?", options: ["`ArrayList`", "`CopyOnWriteArrayList`", "`LinkedList`", "`HashSet`"], answer: 1, why: "Iteration works over a snapshot." },
      { q: "Push vs pull model:", options: ["Same", "Push sends the changed data to observers; pull sends the subject and observers query what they need", "Pull is always async", "Push needs a broker"], answer: 1, why: "Who carries the data." },
      { q: "The \"lapsed listener\" problem is…", options: ["Slow listeners", "Observers that were never unsubscribed, keeping objects reachable (memory leak)", "Listeners that throw", "Listeners notified twice"], answer: 1, why: "The subject's list holds strong references." },
      { q: "Observer vs pub-sub:", options: ["Same", "Pub-sub has a broker between publishers and subscribers, often async and cross-process; Observer registers directly on the subject", "Observer is always async", "Pub-sub has no topics"], answer: 1, why: "The broker is the difference." },
      { q: "Spring: listener that must run only if the DB transaction commits?", options: ["`@EventListener`", "`@TransactionalEventListener(phase = AFTER_COMMIT)`", "`@Async` only", "`@PostConstruct`"], answer: 1, why: "Avoids sending emails for rolled-back orders." },
      { q: "An observer throws. Best default behaviour of the subject?", options: ["Propagate and abort the change", "Catch, log/metric, and continue notifying others", "Retry forever", "Remove all observers"], answer: 1, why: "Isolate failures; the subject's change already happened." },
      { q: "Why was `java.util.Observable` deprecated?", options: ["It was too fast", "Class-based subject (must extend it), untyped `Object` args, weak thread-safety and ordering guarantees", "It used generics", "It required Spring"], answer: 1, why: "Prefer your own listener interfaces, `PropertyChangeSupport`, or `Flow`." }
    ],
    cheatsheet: {
      table: [
        ["Part", "Role", "Example"],
        ["Subject", "keeps observers, notifies", "`Stock`, `Order`"],
        ["Observer", "callback interface", "`PriceListener.onPrice`"],
        ["Concrete observer", "reaction", "board, alert, notifier, loyalty"],
        ["Event", "immutable snapshot of the change", "`StatusChanged(orderId, from, to)`"]],
      cards: [
        { title: "Get it right", items: ["Notify after state is consistent", "Isolate observer exceptions", "Async for slow observers", "Unsubscribe handles", "`CopyOnWriteArrayList`"] },
        { title: "Model choices", items: ["Push vs pull vs event record", "Sync vs async", "Edge-triggered (0→1) vs every change", "In-process vs broker"] },
        { title: "Where", items: ["Stock tickers, alerts", "Order notifications", "UI listeners", "Spring events", "Reactive streams"] }]
    },
    practice: [
      { level: "Easy", q: "Define Observer with its participants, and give three real examples from Java or Spring.",
        a: ["Observer: a subject keeps a list of observers and notifies them automatically when its state changes; observers can subscribe and unsubscribe at runtime.",
          "Participants: Subject (subscribe/unsubscribe/notify), ConcreteSubject (state), Observer (update interface), ConcreteObserver (reaction).",
          "Examples: Swing `ActionListener`, `PropertyChangeSupport`, Spring `@EventListener`, `CompletableFuture.thenAccept`, reactive `Flow.Subscriber`."] },
      { level: "Easy", q: "Classic weather station: a `WeatherStation` publishes temperature and humidity; a `CurrentDisplay` shows the latest, and a `StatsDisplay` shows min/avg/max. Implement it with a typed reading record.",
        code: `record Reading(double tempC, int humidity) {}
interface WeatherObserver { void update(Reading r); }
class WeatherStation {
    private final List<WeatherObserver> obs = new ArrayList<>();
    void subscribe(WeatherObserver o) { obs.add(o); }
    void unsubscribe(WeatherObserver o) { obs.remove(o); }
    void publish(Reading r) { obs.forEach(o -> o.update(r)); }
}
class CurrentDisplay implements WeatherObserver { public void update(Reading r) { System.out.println("now " + r.tempC() + "°C, " + r.humidity() + "%"); } }
class StatsDisplay implements WeatherObserver {
    private double min = Double.MAX_VALUE, max = -Double.MAX_VALUE, sum; private int n;
    public void update(Reading r) { min = Math.min(min, r.tempC()); max = Math.max(max, r.tempC()); sum += r.tempC(); n++; }
    String stats() { return String.format("min %.1f / avg %.1f / max %.1f", min, sum / n, max); }
}

WeatherStation st = new WeatherStation(); CurrentDisplay cur = new CurrentDisplay(); StatsDisplay stats = new StatsDisplay();
st.subscribe(cur); st.subscribe(stats);
st.publish(new Reading(31.5, 60)); st.publish(new Reading(34.0, 48));
st.unsubscribe(cur);
st.publish(new Reading(28.5, 70));
System.out.println(stats.stats());` },
      { level: "Medium", q: "Make a subject safe for concurrent subscribe/publish from many threads, and dispatch to slow observers asynchronously without blocking the publisher. Show that one failing observer doesn't affect others.",
        code: `interface Listener<E> { void on(E event); }
class AsyncSubject<E> {
    private final List<Listener<E>> ls = new java.util.concurrent.CopyOnWriteArrayList<>();
    private final ExecutorService pool;
    AsyncSubject(ExecutorService pool) { this.pool = pool; }
    Runnable subscribe(Listener<E> l) { ls.add(l); return () -> ls.remove(l); }
    void publish(E e) {
        for (Listener<E> l : ls) pool.submit(() -> {
            try { l.on(e); } catch (RuntimeException ex) { System.out.println("  listener error: " + ex.getMessage()); }
        });
    }
}

ExecutorService pool = Executors.newFixedThreadPool(4);
AsyncSubject<String> s = new AsyncSubject<>(pool);
java.util.concurrent.atomic.AtomicInteger delivered = new java.util.concurrent.atomic.AtomicInteger();
s.subscribe(e -> delivered.incrementAndGet());
s.subscribe(e -> { if (e.equals("bad")) throw new IllegalStateException("cannot handle " + e); delivered.incrementAndGet(); });
long t0 = System.nanoTime();
for (String e : List.of("a", "b", "bad", "c")) s.publish(e);
System.out.println("publisher returned in < 50 ms: " + ((System.nanoTime() - t0) / 1_000_000 < 50));
pool.shutdown(); pool.awaitTermination(2, TimeUnit.SECONDS);
System.out.println("delivered " + delivered.get() + " of 8 (one failed)");`,
        follow: "Trade-off: async loses ordering across events for the same observer unless you use one single-threaded executor per observer (or per key)." },
      { level: "Medium", q: "A screen registers a listener on a long-lived `SessionManager` and is closed, but its memory is never freed. Why, and what are three fixes?",
        a: ["The subject's listener list holds a **strong reference** to the listener, which (as an inner class or lambda) captures the screen. The screen stays reachable for the subject's lifetime: the lapsed-listener leak.",
          "Fix 1: `subscribe` returns an unsubscribe handle (`AutoCloseable`/`Runnable`) and the screen calls it in its `close()`/`onDestroy()`.",
          "Fix 2: tie subscriptions to a lifecycle owner (Android `LifecycleObserver`, a `CompositeDisposable` in Rx) that removes them automatically.",
          "Fix 3: weak listeners (`WeakReference`), cleaning up cleared references during notify. Use sparingly: a lambda referenced only weakly may be collected immediately and silently stop working.",
          "Detect with a heap dump: look for screen instances retained via the subject's listener list."] },
      { level: "Medium", q: "Online auction: bidders watch an item; when a new highest bid arrives, all watchers except the bidder get \"you've been outbid\" or \"new high bid\" messages, and the auction closes at a deadline. Model it with Observer.",
        a: ["Subject: `AuctionItem` with `placeBid(bidder, amount)` (validates amount > current + increment) and `close()`.",
          "Events: `BidPlaced(item, bidder, amount, previousLeader)`, `AuctionClosed(item, winner, amount)`.",
          "Observers: `WatcherNotifier` (outbid message to the previous leader, info to other watchers), `AntiSnipingExtender` (extends the deadline by 2 min if a bid arrives in the last minute), `AuditLog`, `AnalyticsTracker`.",
          "Concurrency: `placeBid` must be atomic per item (lock per item or CAS on a `(leader, amount)` value); notify **after** releasing the lock to avoid slow observers holding it.",
          "Watchers subscribe per item; unsubscribe when the auction closes."],
        m: H.cd(["classDiagram",
          "  class AuctionItem { -long highest; -String leader; -Instant endsAt; +placeBid(String bidder, long amount); +close(); +watch(AuctionListener l) }",
          "  class AuctionListener { <<interface>>; +onBid(BidPlaced e); +onClosed(AuctionClosed e) }",
          "  class WatcherNotifier", "  class AntiSnipingExtender", "  class AuditLog",
          "  AuctionItem o-- AuctionListener",
          "  AuctionListener <|.. WatcherNotifier", "  AuctionListener <|.. AntiSnipingExtender", "  AuctionListener <|.. AuditLog"]) },
      { level: "Medium", q: "In Spring, `OrderService.place()` publishes `OrderPlaced` and an `@EventListener` sends the confirmation email. Sometimes customers get an email for an order that was rolled back. Why, and how do you fix it?",
        qcode: `@Service
class OrderService {
    @Transactional
    public void place(Order o) {
        repo.save(o);
        events.publishEvent(new OrderPlaced(o.id()));
        inventory.reserve(o);          // may throw -> transaction rolls back
    }
}
@Component
class Mailer {
    @EventListener
    void on(OrderPlaced e) { email.sendConfirmation(e.orderId()); }
}`, qNoCompile: true,
        a: ["`@EventListener` runs **synchronously, immediately** when the event is published, inside the still-open transaction. The email goes out before `inventory.reserve` fails and the transaction rolls back.",
          "Fix: `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`, which defers the listener until the transaction commits (and skips it on rollback).",
          "For slow work, combine with `@Async` so the commit isn't delayed by SMTP.",
          "For guaranteed delivery even if the app crashes right after commit, use the **outbox pattern**: write the event to an outbox table in the same transaction and relay it to a broker."] },
      { level: "Hard", q: "Design a price-alert service: 1M users set alerts like \"notify me when RELIANCE > ₹3,000\" on 5,000 symbols, with ticks arriving 50,000/s. Naively notifying every observer on every tick is impossible. What's the design?",
        a: ["Don't make each alert an observer of the symbol. Index alerts per symbol in two sorted structures: `above` thresholds (ascending) and `below` thresholds (descending), e.g. `TreeMap<Long, List<AlertId>>`.",
          "On a tick for symbol S at price p, fetch only triggered alerts: `above.headMap(p, false)` and `below.tailMap(p, false)`; O(log n + k) per tick.",
          "Remove triggered one-shot alerts atomically so they fire once; persist alert state.",
          "Shard by symbol across instances (consistent hashing); each shard consumes its symbols' ticks from a partitioned stream (Kafka by symbol).",
          "Notifications go to a queue with per-user rate limits and dedupe; observers of **that** queue (email, push) work asynchronously.",
          "This is Observer at the right granularity: the symbol's tick stream notifies one `AlertMatcher` per shard, which does indexed matching."] },
      { level: "Hard", q: "A sensor publishes 100 readings per second, but the dashboard observer only needs one update per second and the alerting observer needs every reading above a threshold. Implement a **coalescing** observer wrapper that forwards at most one update per interval (the latest), without changing the subject.",
        code: `interface Obs { void update(double v, long tMillis); }
class Coalescing implements Obs {                                  // decorator around an observer
    private final Obs target; private final long intervalMs; private long lastSent = Long.MIN_VALUE / 2; private Double pending; private long pendingT;
    Coalescing(Obs target, long intervalMs) { this.target = target; this.intervalMs = intervalMs; }
    public void update(double v, long t) {
        pending = v; pendingT = t;
        if (t - lastSent >= intervalMs) flush();
    }
    void flush() { if (pending != null) { target.update(pending, pendingT); lastSent = pendingT; pending = null; } }
}

List<String> dash = new ArrayList<>(), alerts = new ArrayList<>();
Obs dashboard = (v, t) -> dash.add(t + "ms:" + v);
Obs alerting = (v, t) -> { if (v > 90) alerts.add(t + "ms:" + v); };
List<Obs> observers = List.of(new Coalescing(dashboard, 1000), alerting);
for (int i = 0; i < 300; i++) {                                    // 3 seconds at 100 Hz
    double v = 50 + (i % 97 == 0 ? 45 : i % 10);
    long t = i * 10L;
    for (Obs o : observers) o.update(v, t);
}
System.out.println("dashboard got " + dash.size() + " updates: " + dash);
System.out.println("alerts: " + alerts);`,
        follow: "In production, a timer also calls `flush()` so the last value isn't stuck until the next reading. Reactive libraries provide this as `sample`/`throttleLast`, and `debounce` for \"quiet period\" semantics." }
    ],
    recap: [
      "Observer = a subject notifies all registered observers when it changes; it knows only the observer interface.",
      "Choose push, pull, or immutable event records; notify after state is consistent; isolate observer failures; go async for slow work.",
      "Watch for lapsed-listener leaks, concurrent modification, cascades, and unspecified ordering.",
      "Spring: `ApplicationEventPublisher`, `@EventListener`, `@TransactionalEventListener(AFTER_COMMIT)`; across services use pub-sub with an outbox.",
      "Interview designs: stock ticker and price alerts, order-status notifications, back-in-stock waitlists, auctions."
    ]
  });
})();
