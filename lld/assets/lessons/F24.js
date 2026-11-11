/* Lesson F24: Mediator */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var NAMES = ["Asha", "Ravi", "Meera", "Kabir", "Zoya", "Dev", "Isha", "Arjun"];
  function meshWidget(el, ctx) {
    var s = ctx.state; if (s.n === undefined) { s.n = 4; s.hub = false; }
    el.innerHTML = "<p>" + ctx.md("Without a mediator, every colleague keeps references to the others it talks to: up to **n(n−1)/2** links, and adding one participant touches everyone. With a mediator, each colleague knows only the hub: **n** links, and the interaction rules live in one place.") + "</p>" +
      "<div class='field'>Participants</div><div class='seg' data-r='n'></div>" +
      "<div class='field' style='margin-top:8px'>Wiring</div><div class='seg' data-r='mode'></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("n").innerHTML = [3, 4, 5, 6, 8].map(function (v) { return "<button type='button' data-n='" + v + "' class='" + (v === s.n ? "on" : "") + "'>" + v + "</button>"; }).join("");
      q("mode").innerHTML = ["Direct references (mesh)", "Through a ChatRoom mediator"].map(function (t, i) { return "<button type='button' data-m='" + i + "' class='" + ((i === 1) === s.hub ? "on" : "") + "'>" + t + "</button>"; }).join("");
      var names = NAMES.slice(0, s.n), lines = [s.hub ? "flowchart TB" : "flowchart LR"], links = 0;
      if (s.hub) {
        lines.push("  R{{\"<b>ChatRoom</b><br/><span class='d'>mediator</span>\"}}:::s0");
        names.forEach(function (n, i) { lines.push("  p" + i + "([\"" + n + "\"]):::s1", "  p" + i + " <--> R"); links++; });
      } else {
        names.forEach(function (n, i) { lines.push("  p" + i + "([\"" + n + "\"]):::s1"); });
        for (var i = 0; i < s.n; i++) for (var j = i + 1; j < s.n; j++) { lines.push("  p" + i + " --- p" + j); links++; }
      }
      lines.push("  classDef s0 fill:#dbeafe,stroke:#2563eb,stroke-width:2px", "  classDef s1 fill:#fff3e0,stroke:#ef6c00");
      ctx.H.renderDiagram(q("dg"), lines.join("\n"));
      var mesh = s.n * (s.n - 1) / 2, res = q("res");
      res.className = "result " + (s.hub ? "ok" : "warn");
      res.innerHTML = "<div class='out'>" + links + " links for " + s.n + " participants</div><p>" + ctx.md(s.hub
        ? "Adding participant " + (s.n + 1) + " adds **1** link and changes no existing class. Rules such as muting, blocking or \"only admins can broadcast\" live in `ChatRoom`. Watch that it doesn't turn into a god object."
        : "Adding participant " + (s.n + 1) + " adds **" + s.n + "** links (mesh would have " + ((s.n + 1) * s.n / 2) + "). Every user class knows about the others, and a rule like \"blocked users can't message\" must be copied into each one.") + "</p>";
    }
    q("n").addEventListener("click", function (e) { var b = e.target.closest("button[data-n]"); if (!b) return; s.n = Number(b.getAttribute("data-n")); ctx.save(); draw(); });
    q("mode").addEventListener("click", function (e) { var b = e.target.closest("button[data-m]"); if (!b) return; s.hub = b.getAttribute("data-m") === "1"; ctx.save(); draw(); });
    draw();
  }

  H.pattern({
    code: "F24", name: "Mediator",
    summary: "Mediator moves the interaction logic between many objects into one hub, so colleagues talk to the mediator instead of to each other. This lesson covers turning a many-to-many mesh into a star, colleague and mediator interfaces, a chat room with mute and block rules, UI dialog coordination, an air-traffic-control runway allocator, event-bus and orchestrator variants, JDK and Spring examples (`ExecutorService`, `Timer`, `ApplicationEventPublisher`, Spring MVC's `DispatcherServlet`), the god-object risk, and how Mediator differs from Observer, Facade and Chain of Responsibility.",
    intent: "Define an object that **encapsulates how a set of objects interact**. Mediator promotes loose coupling by keeping objects from referring to each other explicitly, and it lets you **vary their interaction independently**.",
    problem: {
      text: "A checkout form has a payment-method dropdown, a UPI ID field, a card section, a \"save card\" checkbox, a coupon box and a Pay button. Choosing UPI must hide the card section; an invalid coupon disables Pay; \"save card\" only makes sense for cards. Each widget holds references to the others and pokes them directly. Adding a wallet option meant editing five classes, and nobody can say where the rule \"Pay is enabled when…\" lives.",
      points: [
        "Many-to-many references: n widgets × n rules = tangled, untestable code",
        "Collaboration rules are scattered across the colleagues",
        "Colleagues can't be reused in another form because they know their neighbours",
        "Fix: each colleague reports events to a **mediator**; the mediator decides what others should do"],
      code: `class PaymentDropdown {
    CardSection card; UpiField upi; SaveCardBox save; PayButton pay;            // knows everyone
    void select(String method) {
        card.visible = method.equals("CARD"); upi.visible = method.equals("UPI");
        save.enabled = method.equals("CARD"); pay.enabled = upi.valid || card.valid;   // rule copied elsewhere too
        System.out.println(method + ": card=" + card.visible + " upi=" + upi.visible + " pay=" + pay.enabled);
    }
}
class CardSection { boolean visible, valid; } class UpiField { boolean visible, valid; }
class SaveCardBox { boolean enabled; } class PayButton { boolean enabled; }
PaymentDropdown d = new PaymentDropdown();
d.card = new CardSection(); d.upi = new UpiField(); d.save = new SaveCardBox(); d.pay = new PayButton();
d.select("UPI");` },
    analogy: "An airport control tower. Pilots don't negotiate runways with each of the other forty aircraft; they talk only to the tower, which knows the whole picture and decides who lands, who holds and who taxis. Add a new airline and nothing changes for existing pilots.",
    structure: {
      text: "**Colleagues** hold a reference to the **Mediator** interface only. When something happens they call `mediator.notify(this, event)` (or a specific method like `send`). The **ConcreteMediator** knows all colleagues and contains the coordination rules: it reacts to one colleague's event by calling methods on others. Colleagues never reference each other.",
      m: H.cd(["classDiagram",
        "  class ChatMediator { <<interface>>; +join(User u); +send(User from, String to, String text) }",
        "  class ChatRoom { -Map~String,User~ members; -Set~String~ muted; -Map~String,Set~ blocked; +join(User u); +send(User from, String to, String text); +mute(String name) }",
        "  class User { -String name; -ChatMediator room; +say(String text); +dm(String to, String text); +receive(String from, String text) }",
        "  ChatMediator <|.. ChatRoom",
        "  User --> ChatMediator : talks to",
        "  ChatRoom --> User : delivers to"]),
      roles: [["Mediator", "Interface colleagues talk to (`ChatMediator`)"], ["Concrete mediator", "Holds colleagues and interaction rules (`ChatRoom`)"], ["Colleague", "Knows only the mediator; reports events, receives instructions (`User`)"], ["Client", "Creates the mediator and registers colleagues"]],
      points: ["Mesh of n(n−1)/2 links becomes a star of n links", "Rules (mute, block, broadcast permissions) live in exactly one class"] },
    impl: {
      title: "Java implementation: a chat room with mute and block rules",
      text: "Users never hold references to other users. `say` and `dm` go through the room, which enforces policies: muted users can't post, a blocked sender's messages are not delivered to the blocker, and DMs to unknown users are rejected. New policies (rate limits, profanity filter, admin-only announcements) change only `ChatRoom`.",
      code: `interface ChatMediator { void join(User u); void send(User from, String to, String text); }
class User {
    final String name; private ChatMediator room;
    User(String name) { this.name = name; }
    void joined(ChatMediator r) { room = r; }
    void say(String text) { room.send(this, null, text); }                     // null = everyone
    void dm(String to, String text) { room.send(this, to, text); }
    void receive(String from, String text) { System.out.println("  [" + name + "] " + from + ": " + text); }
}
class ChatRoom implements ChatMediator {
    private final Map<String, User> members = new LinkedHashMap<>();
    private final Set<String> muted = new HashSet<>();
    private final Map<String, Set<String>> blocked = new HashMap<>();          // blocker -> blocked senders
    public void join(User u) { members.put(u.name, u); u.joined(this); }
    void mute(String name) { muted.add(name); }
    void block(String blocker, String sender) { blocked.computeIfAbsent(blocker, k -> new HashSet<>()).add(sender); }
    public void send(User from, String to, String text) {
        if (muted.contains(from.name)) { System.out.println("  (" + from.name + " is muted)"); return; }
        if (to != null && !members.containsKey(to)) { System.out.println("  (no such user " + to + ")"); return; }
        for (User u : to == null ? members.values() : List.of(members.get(to))) {
            if (u == from || blocked.getOrDefault(u.name, Set.of()).contains(from.name)) continue;
            u.receive(from.name, text);
        }
    }
}

ChatRoom room = new ChatRoom();
User asha = new User("Asha"), ravi = new User("Ravi"), meera = new User("Meera");
room.join(asha); room.join(ravi); room.join(meera);
System.out.println("Asha says hi:"); asha.say("Standup in 5?");
room.block("Meera", "Ravi");
System.out.println("Ravi replies (Meera blocked him):"); ravi.say("Joining now");
System.out.println("DM:"); meera.dm("Asha", "Can you share the doc?");
room.mute("Ravi"); System.out.println("Ravi muted:"); ravi.say("hello?");
asha.dm("Kabir", "hi");`,
      points: ["`User` is reusable in any room implementation (it only knows the interface)", "The mediator is also the natural place for logging, persistence and analytics of messages"] },
    variants: [
      { title: "UI dialog mediator (the GoF example)",
        text: "In forms, widgets fire events (\"selection changed\") to a dialog mediator, which updates the other widgets. This is how the checkout problem above is fixed: one `CheckoutForm.changed(widget)` method owns every enable/visible rule.",
        code: `interface FormMediator { void changed(Object source); }
class Field { final String name; String value = ""; boolean visible = true, enabled = true; FormMediator m;
    Field(String n) { name = n; } void set(String v) { value = v; m.changed(this); } }
class CheckoutForm implements FormMediator {
    final Field method = new Field("method"), upi = new Field("upi"), card = new Field("card"), saveCard = new Field("saveCard"), pay = new Field("pay");
    CheckoutForm() { for (Field f : List.of(method, upi, card, saveCard, pay)) f.m = this; changed(method); }
    public void changed(Object src) {                                           // every rule in one place
        boolean isCard = method.value.equals("CARD"), isUpi = method.value.equals("UPI");
        card.visible = isCard; saveCard.enabled = isCard; upi.visible = isUpi;
        pay.enabled = (isUpi && upi.value.matches("[\\\\w.]+@\\\\w+")) || (isCard && card.value.length() == 16);
    }
    String show() { return "card=" + card.visible + " upi=" + upi.visible + " saveCard=" + saveCard.enabled + " pay=" + pay.enabled; }
}
CheckoutForm f = new CheckoutForm();
f.method.set("UPI");          System.out.println("UPI selected:   " + f.show());
f.upi.set("asha@okbank");     System.out.println("UPI id entered: " + f.show());
f.method.set("CARD");         System.out.println("switch to card: " + f.show());`,
        points: ["Widgets become reusable: a `Field` knows nothing about payment rules", "Frameworks hide this: React's parent component state, Angular reactive forms, Swing `ActionListener`s wired to a controller"] },
      { title: "Mediator flavours: hub with logic, event bus, orchestrator",
        text: "The term covers a spectrum from a smart hub to a dumb pipe.",
        table: [
          ["Flavour", "Who holds the rules", "Example"],
          ["Classic mediator", "The mediator (knows colleagues, decides)", "`ChatRoom`, `CheckoutForm`, control tower"],
          ["Event bus / pub-sub broker", "Subscribers (bus just routes by topic)", "Guava `EventBus`, Spring `ApplicationEventPublisher`, Kafka"],
          ["Orchestrator (saga)", "A central workflow service", "Checkout orchestrator calling inventory, payment, shipping"],
          ["Request mediator (CQRS)", "Handlers registered per request type", "MediatR-style `mediator.send(new PlaceOrder(...))`"]],
        points: ["An event bus is Mediator implemented with Observer: colleagues publish, others subscribe, nobody references anybody", "Orchestration (central brain) vs choreography (services react to each other's events) is the distributed-systems version of the same trade-off"] }
    ],
    designs: [
      { title: "Mini LLD: air-traffic control runway allocation (frequently asked)",
        text: "Aircraft request to land or take off. Runways can hold one aircraft at a time; landing aircraft low on fuel get priority; others wait in a queue and are told when they're cleared. Aircraft never talk to each other: the `ControlTower` mediator owns runway state and the waiting queue, and calls back `cleared(runway)` or `hold()`.",
        points: [
          "`Aircraft` colleague: `requestLanding()`, `requestTakeoff()`, `cleared(Runway)`, `hold(int queued)`, `vacated()`",
          "`ControlTower` mediator: free runways, a `PriorityQueue<Request>` (emergency/fuel first, then FIFO by sequence number)",
          "When a runway is vacated the tower assigns it to the next request: rules in one place",
          "Thread safety: requests arrive concurrently; make tower methods `synchronized` or run the tower on a single event-loop thread",
          "Extensions: runway maintenance, wake-turbulence spacing, separate landing/take-off runways: all tower changes, none in `Aircraft`"],
        m: H.cd(["classDiagram",
          "  class Tower { <<interface>>; +request(Aircraft a, Op op); +vacate(Aircraft a, Runway r) }",
          "  class ControlTower { -Deque~Runway~ free; -PriorityQueue~Request~ waiting; +request(Aircraft a, Op op); +vacate(Aircraft a, Runway r) }",
          "  class Aircraft { -String callSign; -int fuelMinutes; -Tower tower; +cleared(Runway r); +hold(int queued) }",
          "  class Request { +Aircraft aircraft; +Op op; +boolean urgent; +long seq }",
          "  Tower <|.. ControlTower",
          "  Aircraft --> Tower",
          "  ControlTower --> Aircraft : clears / holds",
          "  ControlTower *-- Request"]),
        code: `enum Op { LAND, TAKEOFF }
record Runway(String id) {}
interface Tower { void request(Aircraft a, Op op); void vacate(Aircraft a, Runway r); }
class Aircraft {
    final String callSign; final int fuelMinutes; private final Tower tower;
    Aircraft(String cs, int fuel, Tower t) { callSign = cs; fuelMinutes = fuel; tower = t; }
    void land() { tower.request(this, Op.LAND); }
    void takeOff() { tower.request(this, Op.TAKEOFF); }
    void cleared(Runway r, Op op) { System.out.println(callSign + ": cleared to " + op + " on " + r.id()); }
    void hold(int queued) { System.out.println(callSign + ": holding (" + queued + " in queue)"); }
    void done(Runway r) { tower.vacate(this, r); }
}
class ControlTower implements Tower {
    private record Req(Aircraft a, Op op, boolean urgent, long seq) {}
    private final Deque<Runway> free = new ArrayDeque<>();
    private final PriorityQueue<Req> waiting = new PriorityQueue<>(
        Comparator.comparing((Req r) -> !r.urgent()).thenComparingLong(Req::seq));   // urgent first, then FIFO
    private long seq = 0;
    ControlTower(String... runways) { for (String r : runways) free.add(new Runway(r)); }
    public synchronized void request(Aircraft a, Op op) {
        boolean urgent = op == Op.LAND && a.fuelMinutes < 15;
        if (!free.isEmpty() && waiting.isEmpty()) { a.cleared(free.poll(), op); return; }
        waiting.add(new Req(a, op, urgent, seq++));
        a.hold(waiting.size());
    }
    public synchronized void vacate(Aircraft a, Runway r) {
        System.out.println("tower: " + a.callSign + " vacated " + r.id());
        Req next = waiting.poll();
        if (next == null) free.add(r); else next.a().cleared(r, next.op());
    }
}

ControlTower tower = new ControlTower("09L");
Aircraft ai101 = new Aircraft("AI101", 60, tower), sg8 = new Aircraft("SG8", 45, tower), uk955 = new Aircraft("UK955", 9, tower);
ai101.land(); sg8.takeOff(); uk955.land();                                    // UK955 is low on fuel
ai101.done(new Runway("09L"));
System.out.println("(next cleared was the urgent UK955, not SG8 who asked first)");`,
        follow: "`cleared` gets the op so the aircraft knows what it was cleared for. In an interview, mention that real systems run the tower as a single-threaded event loop to avoid lock contention." },
      { title: "Mini LLD: checkout orchestrator (mediator across services)",
        text: "Placing an order touches Inventory, Payment, Coupon and Shipping services. If they call each other (payment calls shipping, shipping calls inventory), failures and retries become impossible to reason about. A `CheckoutOrchestrator` mediates: it calls each service in order and runs **compensations** when a later step fails (release stock, refund payment). Services stay unaware of each other.",
        points: [
          "Steps: reserve stock → apply coupon → charge payment → create shipment; each step has a compensating action",
          "Failure at step k runs compensations k−1…1 in reverse (saga pattern)",
          "Orchestrator persists saga state (`STARTED`, `PAID`, `FAILED_COMPENSATED`) so it can resume after a crash; this is a State machine (F20)",
          "Each service exposes idempotent operations keyed by order id so retries are safe",
          "Trade-off: a central point to scale and keep simple; the alternative is choreography via events (each service reacts to `OrderPaid`, etc.)"],
        m: M(["flowchart LR",
          "  O{{\"<b>CheckoutOrchestrator</b><br/><span class='d'>mediator + saga state</span>\"}}:::s0",
          "  O -->|\"1 reserve\"| I[\"Inventory\"]:::s1",
          "  O -->|\"2 apply\"| C[\"Coupons\"]:::s1",
          "  O -->|\"3 charge\"| P[\"Payments\"]:::s1",
          "  O -->|\"4 ship\"| S[\"Shipping\"]:::s1",
          "  P -.->|\"failure: compensate (release stock, revert coupon)\"| O"]) }
    ],
    usages: [
      ["`java.util.concurrent.ExecutorService` / `Executor`", "Tasks don't coordinate threads with each other; they are submitted to the executor, which decides scheduling."],
      ["`java.util.Timer`, `ScheduledExecutorService`", "Scheduled tasks are coordinated by the timer rather than knowing each other."],
      ["Spring `ApplicationEventPublisher` / `@EventListener`", "Beans publish events to the context, which routes them to listeners (mediator via events)."],
      ["Spring MVC `DispatcherServlet`", "Coordinates handler mappings, adapters, view resolvers and exception resolvers so they never call each other."],
      ["Swing/JavaFX controllers, dialog classes", "A controller reacts to widget events and updates other widgets."],
      ["Message brokers (Kafka, RabbitMQ), Guava `EventBus`", "Producers and consumers never reference each other; the broker routes."]
    ],
    avoid: {
      points: [
        "Two or three objects with a simple, stable interaction: direct calls are clearer",
        "When the mediator would just forward calls without rules (needless indirection)",
        "When it starts knowing every detail of every colleague: split it per use case before it becomes a god object",
        "Performance-critical paths where an extra hop per interaction matters",
        "When notification-only is needed and no coordination logic: plain Observer is enough"],
      pros: ["Replaces many-to-many coupling with one-to-many", "Interaction rules centralised, easy to change and test", "Colleagues become reusable", "Easier to add participants"],
      cons: ["The mediator can become a complex god object", "Single point of failure / bottleneck (in distributed settings)", "Indirection makes flows harder to trace", "Colleagues depend on the mediator's protocol"] },
    compare: [
      ["Observer (F18)", "One-to-many notification", "Observer distributes events; Mediator coordinates colleagues with rules. Mediators are often implemented using Observer"],
      ["Facade (F12)", "Simplified interface to a subsystem", "Facade is one-way (client → subsystem) and subsystem classes don't know it; Mediator is two-way and colleagues know the mediator"],
      ["Chain of Responsibility (F22)", "Pass a request along handlers", "A chain decides who handles a request by passing it along; a mediator decides centrally"],
      ["Command (F19)", "Requests as objects", "Request mediators (CQRS) dispatch command objects to their handlers"],
      ["State (F20)", "Behaviour changes with state", "An orchestrator mediator usually keeps saga state as a state machine"]],
    widget: { heading: "Interactive: mesh vs mediator", caption: "Change the number of participants and the wiring. Count the links each approach needs.", render: meshWidget },
    pitfalls: [
      "The god mediator: every rule of the application in one class (split by feature or use case)",
      "Colleagues still calling each other \"just this once\", defeating the pattern",
      "Mediator depending on concrete colleague classes when interfaces would do",
      "Synchronous mediators that block: one slow colleague stalls everyone (consider async/event queues)",
      "Circular notifications: a mediator update fires another `changed` event, looping forever",
      "No thread safety in a mediator that is called from many threads",
      "Using a global static mediator (hidden dependency, hard to test)",
      "Hiding real business workflows in UI mediators instead of domain services"
    ],
    quiz: [
      { q: "What problem does Mediator solve?", options: ["Object creation", "Many objects referring to each other directly (many-to-many coupling)", "Slow algorithms", "Undo"], answer: 1, why: "Star instead of mesh." },
      { q: "How many links do 6 colleagues need fully meshed vs with a mediator?", options: ["6 vs 6", "15 vs 6", "36 vs 1", "30 vs 6"], answer: 1, why: "n(n−1)/2 = 15 vs n = 6." },
      { q: "In the chat room, where do mute and block rules belong?", options: ["In `User`", "In the `ChatRoom` mediator", "In `main`", "In every message"], answer: 1, why: "Interaction rules are the mediator's job." },
      { q: "Mediator vs Facade?", options: ["Same", "Facade is one-way into a subsystem; Mediator coordinates two-way, and colleagues know the mediator", "Facade has rules", "Mediator hides a subsystem from clients"], answer: 1, why: "Direction and awareness differ." },
      { q: "Main risk of Mediator?", options: ["Too many classes", "The mediator becomes a god object", "Memory leaks only", "No polymorphism"], answer: 1, why: "Centralisation can go too far." },
      { q: "An event bus is…", options: ["Unrelated", "A mediator where routing is by topic and logic lives in subscribers (Mediator + Observer)", "A Singleton", "A Builder"], answer: 1, why: "Publishers and subscribers never reference each other." },
      { q: "In air-traffic control, why can't aircraft negotiate with each other?", options: ["They can", "Each would need to know all others and agree on priority; the tower has the full picture", "Radio limits", "Java forbids it"], answer: 1, why: "Central knowledge and rules." },
      { q: "A saga orchestrator is the distributed counterpart of…", options: ["Flyweight", "Mediator (central coordination); choreography is the event-driven alternative", "Iterator", "Proxy"], answer: 1, why: "Orchestration vs choreography." }
    ],
    cheatsheet: {
      table: [
        ["Part", "Knows", "Example"],
        ["Mediator interface", "nothing concrete", "`ChatMediator`, `Tower`"],
        ["Concrete mediator", "all colleagues + rules", "`ChatRoom`, `ControlTower`, `CheckoutForm`"],
        ["Colleague", "only the mediator", "`User`, `Aircraft`, `Field`"],
        ["Client", "wires them", "`room.join(user)`"]],
      cards: [
        { title: "Use when", items: ["Mesh of interactions", "Rules span many objects", "Colleagues should be reusable", "UI forms, chat, ATC, orchestration"] },
        { title: "Keep it healthy", items: ["One mediator per use case", "Interfaces both ways", "Guard against event loops", "Thread-safe or single-threaded loop"] },
        { title: "Relatives", items: ["Observer: broadcast", "Facade: one-way", "Event bus = Mediator + Observer", "Saga orchestrator"] }]
    },
    practice: [
      { level: "Easy", q: "Define Mediator and give three examples from real systems.",
        a: ["An object that encapsulates how a set of objects interact, so they refer to the mediator instead of to each other.",
          "Examples: air-traffic control tower, chat room server, UI dialog/controller coordinating widgets, Spring's `DispatcherServlet`, a message broker, a saga orchestrator for checkout."] },
      { level: "Easy", q: "Mediator vs Observer: when would you use each?",
        a: ["**Observer**: a subject broadcasts changes to any number of subscribers; the subject has no rules about what they do.",
          "**Mediator**: colleagues report events and the mediator decides **what should happen to the others** (enable this, clear that, assign a runway).",
          "They combine: colleagues notify the mediator via Observer, and an event bus is a mediator built on publish-subscribe."] },
      { level: "Medium", q: "Design a group chat with rooms, admins who can mute members, and DMs. What are the classes?",
        a: ["`User` (colleague) with `send(roomId, text)`, `dm(userId, text)` and `receive(Message)`; knows only `ChatService`.",
          "`ChatRoom` (mediator per room): members, admins, muted set, message history; `post(from, text)` applies rules (muted? member?) and fans out.",
          "`ChatService` routes to rooms and handles DMs (a 1:1 room).",
          "`Message` (id, from, room, text, timestamp); `MessageStore` for history and pagination (Iterator, F23).",
          "Delivery: online users via WebSocket sessions (`Session` per device); offline users get push notifications (Observer)."],
        m: H.cd(["classDiagram",
          "  class ChatService { +createRoom(String name, User admin) ChatRoom; +dm(User from, User to, String text) }",
          "  class ChatRoom { -Set~User~ members; -Set~User~ admins; -Set~User~ muted; +post(User from, String text); +mute(User admin, User target) }",
          "  class User { -String id; +receive(Message m) }",
          "  class Message { +String id; +String roomId; +String from; +String text; +Instant at }",
          "  ChatService *-- ChatRoom",
          "  ChatRoom o-- User",
          "  ChatRoom ..> Message"]) },
      { level: "Medium", q: "Refactor: `Light`, `Thermostat`, `Blinds` and `MotionSensor` reference each other (motion at night turns on the light; above 30 °C, blinds close and AC starts). Show a smart-home hub mediator.",
        code: `interface Hub { void event(String device, String what, int value); }
class Device { final String name; final Hub hub; Device(String n, Hub h) { name = n; hub = h; }
    void command(String c) { System.out.println("  " + name + " <- " + c); } }
class HomeHub implements Hub {
    final Map<String, Device> d = new HashMap<>(); boolean night;
    void add(Device x) { d.put(x.name, x); }
    public void event(String device, String what, int v) {
        System.out.println(device + ": " + what + "=" + v);
        if (device.equals("motion") && night) d.get("light").command("ON");            // rules live here
        if (device.equals("thermo") && v > 30) { d.get("blinds").command("CLOSE"); d.get("ac").command("COOL 24"); }
    }
}
HomeHub hub = new HomeHub();
for (String n : List.of("light", "blinds", "ac", "motion", "thermo")) hub.add(new Device(n, hub));
hub.night = true;
hub.event("motion", "detected", 1);
hub.event("thermo", "temp", 33);`,
        follow: "As rules grow, load them from configuration (\"when X then Y\") instead of hard-coding: the hub becomes a small rules engine, the devices stay dumb." },
      { level: "Medium", q: "How do you stop a mediator from becoming a god object?",
        a: ["Split by **use case**: `CheckoutForm`, `AddressForm`, not one `AppMediator`.",
          "Delegate the actual work to colleagues or domain services; the mediator decides **who** acts, not **how**.",
          "Model rules as data or small strategy objects registered with the mediator.",
          "Use events for pure notifications so the mediator only handles coordination.",
          "Watch metrics: if the mediator's change frequency and size dwarf everything else, split it."] },
      { level: "Medium", q: "An auction house: bidders place bids; all bidders learn the new highest bid; bids lower than current + minimum increment are rejected; the auction closes at a deadline. Which pattern(s) and why?",
        a: ["**Mediator**: `Auction` coordinates bidders; bidders never talk to each other. It validates bids against the current highest and the increment rule.",
          "**Observer** inside it: after an accepted bid, the auction notifies all registered bidders (or their UI sessions).",
          "**State**: `OPEN → CLOSING → CLOSED` controls which actions are allowed (F20).",
          "Concurrency: two bids arriving together must be serialised (lock per auction, or a single-threaded actor/queue per auction).",
          "Anti-sniping extension: a bid in the last 30 s extends the deadline: another mediator rule."] },
      { level: "Hard", q: "In microservices, compare orchestration (central mediator) and choreography (events). When would you choose each for order checkout?",
        a: ["**Orchestration**: one orchestrator calls services and runs compensations. Pros: the workflow is visible in one place, easier to debug, explicit timeouts. Cons: central service to scale; risk of a smart-orchestrator, dumb-services design.",
          "**Choreography**: services react to events (`OrderPlaced` → Inventory reserves → `StockReserved` → Payment charges…). Pros: loose coupling, independent scaling. Cons: the flow is implicit; cyclic dependencies and \"who failed?\" are hard to trace.",
          "Choose orchestration for complex, multi-step flows with compensations and SLAs (payments, bookings); choreography for simple fan-out reactions (send email, update analytics).",
          "Either way: idempotent handlers, an outbox for reliable events, a correlation id per order."] },
      { level: "Hard", q: "Make the chat room mediator safe for concurrent senders without serialising all rooms behind one lock.",
        a: ["Lock (or single-thread) **per room**, not globally: each `ChatRoom` has its own lock or its own executor queue (actor model).",
          "Membership sets as `ConcurrentHashMap.newKeySet()` for safe reads while members join/leave (weakly consistent iteration, F23/F31).",
          "Fan-out off the lock: copy the recipient list under the lock, deliver after releasing it, so a slow receiver doesn't block senders.",
          "Per-user outbound queues (bounded) with back-pressure so one slow client can't exhaust memory (F30).",
          "Message ordering per room via a sequence number assigned under the room lock."] }
    ],
    recap: [
      "Mediator centralises interaction rules; colleagues know only the mediator, turning an n(n−1)/2 mesh into n links.",
      "Classic uses: chat rooms (mute/block), UI dialogs, air-traffic control, smart-home hubs, checkout orchestrators.",
      "Flavours range from a smart hub to an event bus (Mediator + Observer) to saga orchestration.",
      "Main risk: the god mediator; split per use case and push work back to colleagues.",
      "Differs from Facade (one-way), Observer (broadcast, no rules) and Chain (pass along vs decide centrally)."
    ]
  });
})();
