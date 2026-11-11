/* Lesson F04: UML sequence diagrams (and a quick look at state and activity diagrams) */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var SLIDES = [
    { title: "Why sequence diagrams: behaviour over time",
      text: "A class diagram shows **structure**: who knows whom. A sequence diagram shows **behaviour**: for *one use case*, which object calls which method, in what order, and what comes back. In an LLD round it's how you prove that your classes actually collaborate to deliver a flow, and it hands you the method signatures to code.",
      points: [
        "**Participants / lifelines**: the objects (or actors) taking part, across the top, with a dashed line down",
        "**Messages**: horizontal arrows. A synchronous call is a solid arrow; the return is dashed",
        "**Activation bars**: the thin rectangle while an object is executing a call",
        "Time flows **downwards**; there is no time scale, only order",
        "One diagram = one scenario (e.g. \"park a car\"), happy path first, alternatives as fragments"],
      analogy: "A screenplay. The class diagram is the cast list with relationships; the sequence diagram is one scene's script: who speaks to whom, in which order, and what they say back.",
      m: M(["sequenceDiagram",
        "  actor U as Customer",
        "  participant ATM",
        "  participant B as BankService",
        "  participant A as Account",
        "  U->>ATM: withdraw(1000)",
        "  activate ATM",
        "  ATM->>B: debit(cardNo, 1000)",
        "  activate B",
        "  B->>A: withdraw(1000)",
        "  activate A",
        "  A-->>B: newBalance",
        "  deactivate A",
        "  B-->>ATM: Receipt",
        "  deactivate B",
        "  ATM-->>U: cash + receipt",
        "  deactivate ATM"]) },

    { title: "Message types and their Java meaning",
      text: "Each arrow style means something different, and maps to a different construct in Java. Getting sync vs async right is the most important one, because it changes who waits and how errors come back.",
      table: [
        ["Message", "Mermaid", "Meaning", "Java"],
        ["Synchronous call", "`A->>B: pay(amt)`", "caller blocks until B returns", "a normal method call `b.pay(amt)`"],
        ["Return", "`B-->>A: ok`", "result or control back to caller", "`return ok;`"],
        ["Asynchronous", "`A-)B: publish(evt)`", "fire-and-forget; caller continues", "`executor.submit(...)`, `queue.offer(evt)`, `CompletableFuture.runAsync`"],
        ["Self-call", "`A->>A: validate()`", "an object calls its own method", "`this.validate()`"],
        ["Create", "`create participant T` then `A->>T: new`", "the lifeline starts here", "`new Ticket(...)`"],
        ["Destroy", "`destroy T`", "the object is discarded or closed", "goes out of scope, `close()`"],
        ["Lost / failed", "`A-xB: call`", "message fails or gets no reply", "exception, timeout"]],
      points: [
        "Label messages with the **real method name and arguments** you'll write in code",
        "Show returns only when the value matters to the story (Mermaid draws what you write)",
        "Use `Note over A,B: ...` for invariants, such as \"seat lock held for 10 min\""],
      m: M(["sequenceDiagram",
        "  participant C as Controller",
        "  participant S as OrderService",
        "  participant Q as EventBus",
        "  C->>S: place(cart)",
        "  S->>S: validate(cart)",
        "  create participant O as Order",
        "  S->>O: new Order(items)",
        "  S-)Q: publish(OrderPlaced)",
        "  Note right of Q: email + analytics<br/>handled later",
        "  S-->>C: orderId",
        "  C-xS: cancel(orderId) [times out]"]) },

    { title: "Combined fragments: alt, opt, loop, par, critical, break",
      text: "Real flows branch and repeat. **Combined fragments** are boxes with an operator that tell the reader how to read the messages inside. You need only a handful, and each one maps directly onto Java control flow.",
      table: [
        ["Fragment", "Meaning", "Java"],
        ["`alt` / `else`", "if / else-if / else, exactly one branch runs", "`if … else`"],
        ["`opt`", "optional, runs only if the guard is true", "`if` with no else"],
        ["`loop`", "repeats while the guard holds", "`for` / `while`"],
        ["`par`", "branches run concurrently", "`CompletableFuture.allOf`, parallel tasks"],
        ["`critical`", "atomic region, nothing interleaves", "`synchronized`, a lock, a DB transaction"],
        ["`break`", "the fragment runs instead of the rest of the enclosing flow", "early `return` / `throw`"]],
      m: M(["sequenceDiagram",
        "  actor U as User",
        "  participant A as AuthService",
        "  participant R as UserRepo",
        "  participant O as OtpSender",
        "  U->>A: login(email, pwd)",
        "  A->>R: findByEmail(email)",
        "  R-->>A: user (Optional)",
        "  alt user not found or wrong password",
        "    A-->>U: 401 Invalid credentials",
        "  else locked account",
        "    A-->>U: 423 Locked",
        "  else ok",
        "    opt 2FA enabled",
        "      A->>O: sendOtp(user.phone)",
        "    end",
        "    A-->>U: session token",
        "  end"]) },
    { title: "From sequence diagram to Java code",
      text: "Every synchronous arrow becomes a method call on the receiving object; the receiver's class must have that method (check against your class diagram). The fragments become control flow. Here's the parking-lot **entry** flow, drawn and then coded one-to-one.",
      points: [
        "`Gate->>Lot: park(vehicle)` means `ParkingLot` needs `Ticket park(Vehicle)`",
        "`alt no free spot` becomes the `if (spot.isEmpty()) throw …` branch",
        "`create participant Ticket` is the `new Ticket(...)` line",
        "If a message has no obvious owner, that's a missing class or a misplaced responsibility"],
      m: M(["sequenceDiagram",
        "  participant G as EntryGate",
        "  participant L as ParkingLot",
        "  participant S as SpotAllocationStrategy",
        "  participant P as ParkingSpot",
        "  G->>L: park(vehicle)",
        "  L->>S: pick(floors, vehicle)",
        "  S-->>L: Optional spot",
        "  alt no free spot",
        "    L-->>G: throw LotFullException",
        "  else spot found",
        "    L->>P: occupy(vehicle)",
        "    create participant T as Ticket",
        "    L->>T: new Ticket(vehicle, spot, now)",
        "    L-->>G: ticket",
        "  end"]),
      code: `enum SpotType { SMALL, MEDIUM, LARGE }
record Vehicle(String plate, SpotType type) {}
class LotFullException extends RuntimeException { LotFullException() { super("lot full"); } }

class ParkingSpot {
    final String id; final SpotType type; private Vehicle parked;
    ParkingSpot(String id, SpotType type) { this.id = id; this.type = type; }
    boolean isFree() { return parked == null; }
    void occupy(Vehicle v) { if (!isFree()) throw new IllegalStateException(id + " taken"); parked = v; }
}
record Ticket(String id, Vehicle vehicle, ParkingSpot spot, Instant entry) {}

interface SpotAllocationStrategy { Optional<ParkingSpot> pick(List<ParkingSpot> spots, Vehicle v); }
class FirstFree implements SpotAllocationStrategy {
    public Optional<ParkingSpot> pick(List<ParkingSpot> spots, Vehicle v) {
        return spots.stream().filter(s -> s.isFree() && s.type == v.type()).findFirst();
    }
}

class ParkingLot {
    private final List<ParkingSpot> spots;
    private final SpotAllocationStrategy strategy;
    private final Clock clock;
    private int seq;
    ParkingLot(List<ParkingSpot> spots, SpotAllocationStrategy s, Clock c) { this.spots = spots; strategy = s; clock = c; }

    Ticket park(Vehicle vehicle) {                                   // G->>L: park(vehicle)
        Optional<ParkingSpot> spot = strategy.pick(spots, vehicle);  // L->>S: pick(...)
        if (spot.isEmpty()) throw new LotFullException();            // alt no free spot
        spot.get().occupy(vehicle);                                  // L->>P: occupy(vehicle)
        return new Ticket("T" + (++seq), vehicle, spot.get(), clock.instant());   // create Ticket
    }
}

ParkingLot lot = new ParkingLot(List.of(new ParkingSpot("A1", SpotType.MEDIUM)), new FirstFree(), Clock.systemUTC());
System.out.println(lot.park(new Vehicle("KA01", SpotType.MEDIUM)).spot().id);
try { lot.park(new Vehicle("KA02", SpotType.MEDIUM)); } catch (LotFullException e) { System.out.println(e.getMessage()); }` },

    { title: "Synchronous vs asynchronous in Java",
      text: "An async message (`-)`) means the sender doesn't wait. In Java that's a hand-off: an executor, a queue, a `CompletableFuture`, or an event bus. The diagram should make it obvious **which steps the user waits for** and **where failures go** when nobody is waiting.",
      points: [
        "Draw async for notifications, analytics, audit logging and webhooks: things that mustn't slow or fail the main flow",
        "The async receiver needs its own error handling (retry, dead-letter queue); show it with a `Note` or a separate diagram",
        "`par` shows **concurrent** calls the sender waits for together, e.g. fetching price and inventory at the same time",
        "Order is no longer guaranteed between async messages, so don't draw them as if it were"],
      m: M(["sequenceDiagram",
        "  participant S as CheckoutService",
        "  participant P as PricingService",
        "  participant I as InventoryService",
        "  participant N as Notifier",
        "  par fetch together",
        "    S->>P: price(cart)",
        "    P-->>S: total",
        "  and",
        "    S->>I: reserve(cart)",
        "    I-->>S: reservationId",
        "  end",
        "  S-)N: orderConfirmed(orderId)",
        "  Note over S,N: caller returns now<br/>Notifier retries on failure",
        "  S-->>S: return orderId"]),
      code: `record Cart(List<String> items) {}

class CheckoutService {
    private final ExecutorService pool = Executors.newFixedThreadPool(4);
    private final List<String> sent = new CopyOnWriteArrayList<>();

    long price(Cart c) { return c.items().size() * 100L; }
    String reserve(Cart c) { return "R-" + c.items().size(); }
    void notifyConfirmed(String orderId) { sent.add(orderId); }

    String checkout(Cart cart) {
        // par: both calls run concurrently and we wait for both
        CompletableFuture<Long> total = CompletableFuture.supplyAsync(() -> price(cart), pool);
        CompletableFuture<String> res = CompletableFuture.supplyAsync(() -> reserve(cart), pool);
        CompletableFuture.allOf(total, res).join();
        String orderId = "ORD-" + total.join() + "-" + res.join();
        // async: fire-and-forget, failures handled inside the task
        CompletableFuture.runAsync(() -> notifyConfirmed(orderId), pool)
                .exceptionally(ex -> { System.err.println("notify failed, will retry: " + ex); return null; });
        return orderId;
    }
    void shutdown() throws InterruptedException { pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS); }
}

CheckoutService s = new CheckoutService();
System.out.println(s.checkout(new Cart(List.of("pen", "book"))));
s.shutdown();` },
    { title: "Worked example: booking a movie seat (BookMyShow)",
      text: "A complete interview-grade flow. The interesting parts are the **critical** region (two users must not lock the same seat), the **alt** on lock failure, the **loop** while waiting for payment, and the **break** on payment timeout that releases the seats.",
      points: [
        "`ShowSeat.tryLock(userId, ttl)` is an atomic transition AVAILABLE → LOCKED, so it lives in the `critical` box",
        "Payment is external and slow: the booking service polls or receives a callback (drawn as a `loop`)",
        "On timeout the `break` fragment releases locks, so seats return to the pool",
        "From this one diagram you get the methods: `BookingService.hold(showId, seatIds, userId)`, `ShowSeat.tryLock`, `PaymentGateway.status`, `Booking.confirm`"],
      m: M(["sequenceDiagram",
        "  actor U as User",
        "  participant B as BookingService",
        "  participant SS as ShowSeat",
        "  participant PG as PaymentGateway",
        "  U->>B: hold(showId, [A1, A2], userId)",
        "  critical per-show lock",
        "    B->>SS: tryLock(userId, 10 min) for each seat",
        "    SS-->>B: all locked?",
        "  end",
        "  alt any seat already taken",
        "    B->>SS: release(already locked by us)",
        "    B-->>U: SeatUnavailable",
        "  else all locked",
        "    create participant BK as Booking",
        "    B->>BK: new Booking(PENDING)",
        "    B-->>U: bookingId + payment link",
        "    U->>PG: pay(bookingId)",
        "    loop until paid or lock expires",
        "      B->>PG: status(bookingId)",
        "    end",
        "    break lock expired",
        "      B->>SS: release()",
        "      B->>BK: expire()",
        "    end",
        "    B->>SS: markBooked()",
        "    B->>BK: confirm()",
        "    B-)U: ticket via email/SMS",
        "  end"]) },

    { title: "State diagrams: when an object's lifecycle is the point",
      text: "Sequence diagrams follow **one scenario across many objects**. A **state machine diagram** follows **one object across many scenarios**: its states and the events that move it between them. Draw one whenever an entity has a status enum with rules (Order, Booking, Elevator, VendingMachine). It tells you exactly which transitions to allow in code, and it's the blueprint for the State pattern (F20).",
      points: [
        "States: rounded boxes. `[*]` is start/end. Transitions are labelled `event [guard] / action`",
        "Every transition not drawn must be rejected in code (e.g. you can't ship a cancelled order)",
        "A simple version in Java: an enum with an `allowed` transition map; a richer one uses the State pattern",
        "Mermaid: `stateDiagram-v2`"],
      m: M(["stateDiagram-v2",
        "  [*] --> CREATED",
        "  CREATED --> PAID: pay / reserve stock",
        "  CREATED --> CANCELLED: cancel",
        "  PAID --> SHIPPED: ship",
        "  PAID --> CANCELLED: cancel / refund",
        "  SHIPPED --> DELIVERED: deliver",
        "  DELIVERED --> RETURNED: return [within 7 days]",
        "  DELIVERED --> [*]",
        "  CANCELLED --> [*]",
        "  RETURNED --> [*]"]),
      code: `enum OrderStatus {
    CREATED, PAID, SHIPPED, DELIVERED, CANCELLED, RETURNED;

    private static final Map<OrderStatus, Set<OrderStatus>> NEXT = new EnumMap<>(OrderStatus.class);
    static {
        NEXT.put(CREATED, EnumSet.of(PAID, CANCELLED));
        NEXT.put(PAID, EnumSet.of(SHIPPED, CANCELLED));
        NEXT.put(SHIPPED, EnumSet.of(DELIVERED));
        NEXT.put(DELIVERED, EnumSet.of(RETURNED));
        NEXT.put(CANCELLED, EnumSet.noneOf(OrderStatus.class));
        NEXT.put(RETURNED, EnumSet.noneOf(OrderStatus.class));
    }
    OrderStatus to(OrderStatus target) {
        if (!NEXT.get(this).contains(target)) throw new IllegalStateException(this + " -> " + target + " not allowed");
        return target;
    }
}

OrderStatus s = OrderStatus.CREATED.to(OrderStatus.PAID).to(OrderStatus.SHIPPED);
System.out.println(s);
try { s.to(OrderStatus.CANCELLED); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }` },

    { title: "Which diagram when? Class, sequence, state, activity",
      text: "Interviewers don't want every UML diagram. Pick the one that answers the current question, usually a class diagram first, then one or two sequence diagrams for the core flows, and a state diagram for any entity with a lifecycle.",
      table: [
        ["Diagram", "Answers", "Use it for", "Mermaid"],
        ["Class", "What exists and who knows whom?", "Always: the backbone of LLD", "`classDiagram`"],
        ["Sequence", "Who calls whom, in what order, for one use case?", "Core flows: park/exit, book seat, place order, split expense", "`sequenceDiagram`"],
        ["State machine", "What states can this object be in, and what moves it?", "Entities with a status: Order, Booking, Elevator, Vending machine", "`stateDiagram-v2`"],
        ["Activity", "What steps and decisions make up a process?", "Business workflows, algorithms (often a flowchart is enough)", "`flowchart`"],
        ["Use case", "Which actors do what?", "Scoping in the first 5 minutes; usually just a bullet list", "(list)"]],
      points: [
        "Workflow: requirements → use cases (list) → class diagram → sequence for the 1–2 hardest use cases → code",
        "Sequence diagrams **validate** the class diagram: every message needs a method on the receiver, and every receiver must be reachable (a field or parameter)",
        "If you find yourself drawing a 30-message sequence, split it by use case or zoom out"] },

    { title: "Drawing sequence diagrams in an interview",
      text: "A sequence diagram is cheap insurance: five minutes of drawing catches the missing class or misplaced responsibility before you've written 200 lines. Keep it small, honest and consistent with your classes.",
      points: [
        "Pick the **hardest** use case (concurrency, payment, external calls), not the simplest",
        "Left to right: actor → entry point (controller/gate) → service → domain objects → infrastructure",
        "Happy path first, then add `alt` for the 1–2 failure cases the interviewer cares about",
        "Use the exact method names you'll code; update the class diagram when you invent a new one",
        "Mark async and critical sections explicitly: they lead straight into the concurrency discussion",
        "Avoid UI detail (button clicks, screens) and DB detail (SQL); stay at the object level"],
      table: [
        ["You want", "Mermaid sequenceDiagram syntax"],
        ["Actor / alias", "`actor U as User` / `participant S as Service`"],
        ["Sync call / return", "`A->>B: call()` / `B-->>A: result`"],
        ["Async", "`A-)B: event`"],
        ["Activation", "`activate B` … `deactivate B` (or `A->>+B` / `B-->>-A`)"],
        ["Fragments", "`alt cond` … `else` … `end`, `opt`, `loop`, `par … and … end`, `critical`, `break`"],
        ["Note", "`Note over A,B: text`"],
        ["Create", "`create participant T` before the creating message"]] }
  ];
  /* Widget: build the parking-lot exit sequence one message at a time */
  var HEAD = ["sequenceDiagram", "  actor D as Driver", "  participant G as ExitGate", "  participant L as ParkingLot", "  participant T as Ticket", "  participant PS as PricingStrategy", "  participant PP as PaymentProcessor", "  participant S as ParkingSpot"];
  var MSGS = [
    ["  D->>G: insert(ticketId)"],
    ["  G->>L: exit(ticketId, now)", "  L->>L: find(ticketId)"],
    ["  L->>PS: price(ticket, now)", "  PS-->>L: 150"],
    ["  L->>PP: charge(150, card)", "  alt declined", "    PP-->>L: DECLINED", "    L-->>G: PaymentFailed", "  else approved", "    PP-->>L: APPROVED", "  end"],
    ["  L->>S: release()"],
    ["  L->>T: close(now, 150)"],
    ["  L-->>G: Receipt", "  G-->>D: open barrier + receipt"]];
  function upTo(k) { var out = HEAD.slice(); for (var i = 0; i <= k; i++) out = out.concat(MSGS[i]); return out.join("\n"); }
  var widget = H.widgets.stepper({
    intro: "Step through the **parking-lot exit** use case. Each step adds messages to the sequence diagram, shows the Java call it becomes, and shows the objects' state afterwards. Notice how the diagram forces every class to have the method it receives.",
    steps: [
      { label: "Insert ticket", m: upTo(0), text: "The driver inserts the ticket. `ExitGate` is the entry point (like a controller); it should contain **no business rules**, only translate the hardware event into a call.", log: ["gate.insert(\"T42\")"], state: { "Ticket T42": "ACTIVE, entry 10:00, spot B7", "Spot B7": "occupied by KA-01-1234", "Barrier": "closed" } },
      { label: "Find ticket", m: upTo(1), text: "The gate delegates to `ParkingLot.exit(ticketId, now)`. The lot looks up the ticket (a self-call here; a `TicketRepository` in a bigger design). Passing `now` in (or injecting a `Clock`) keeps pricing testable.", log: ["lot.exit(\"T42\", 12:30)", "Ticket t = tickets.get(\"T42\")"], state: { "Ticket T42": "ACTIVE (found)", "Spot B7": "occupied", "Barrier": "closed" } },
      { label: "Compute price", m: upTo(2), text: "Pricing is **delegated to a strategy**: the lot doesn't know the tariff. 2.5 hours rounds up to 3 hours, and at ₹50 per hour that is ₹150 under the hourly strategy used here. Weekend or EV pricing would be another class (OCP).", log: ["long fee = pricing.price(t, now)   // 150"], state: { "Ticket T42": "ACTIVE, fee due ₹150", "Spot B7": "occupied", "Barrier": "closed" } },
      { label: "Charge payment", m: upTo(3), text: "An `alt` fragment: if the card is declined the flow returns `PaymentFailed` and nothing else changes; the spot stays occupied and the ticket stays active. Only on approval do we continue. In code that's an early return or exception **before** any state change.", log: ["PaymentResult r = payments.charge(150, card)", "if (r == DECLINED) throw new PaymentFailedException()"], state: { "Ticket T42": "ACTIVE, payment APPROVED", "Spot B7": "occupied", "Barrier": "closed" } },
      { label: "Free the spot", m: upTo(4), text: "Only after payment succeeds is the spot released, so it can be allocated to the next car. If this were concurrent (two gates), release and allocation must be thread-safe (covered in F28).", log: ["t.spot().release()"], state: { "Ticket T42": "ACTIVE, paid", "Spot B7": "**free**", "Barrier": "closed" } },
      { label: "Close ticket", m: upTo(5), text: "The ticket records the exit time and amount and moves to `CLOSED`, a state transition your `TicketStatus` state diagram must allow (ACTIVE → CLOSED).", log: ["t.close(now, 150)"], state: { "Ticket T42": "**CLOSED**, exit 12:30, ₹150", "Spot B7": "free", "Barrier": "closed" } },
      { label: "Return receipt", m: upTo(6), text: "The receipt returns up the stack and the gate opens the barrier. Read the arrows back as method signatures: `ExitGate.insert(String)`, `ParkingLot.exit(String, Instant)`, `PricingStrategy.price(Ticket, Instant)`, `PaymentProcessor.charge(long, Card)`, `ParkingSpot.release()`, `Ticket.close(Instant, long)`.", log: ["return new Receipt(\"T42\", 150)", "barrier.open()"], state: { "Ticket T42": "CLOSED", "Spot B7": "free", "Barrier": "**open**" } }
    ]
  });

  var QUIZ = [
    { q: "In Mermaid, which arrow is an asynchronous (fire-and-forget) message?", options: ["`A->>B`", "`A-->>B`", "`A-)B`", "`A-xB`"], answer: 2, why: "`-)` is async. `->>` is a synchronous call, `-->>` a return, and `-x` a lost or failed message." },
    { q: "A sequence diagram shows `Gate->>ParkingLot: park(vehicle)`. What does that require in your class design?", options: ["`Gate` has a `park` method", "`ParkingLot` has a `park(Vehicle)` method and `Gate` holds or receives a reference to the lot", "A `Park` class", "Nothing; sequence diagrams are independent of classes"], answer: 1, why: "The receiver owns the method, and the sender must be able to reach the receiver (a field or parameter)." },
    { q: "Which fragment represents an if/else between mutually exclusive outcomes?", options: ["`opt`", "`loop`", "`alt` with `else`", "`par`"], answer: 2, why: "`alt` is if/else; `opt` is an if with no else." },
    { q: "You need to show two seats being locked so that no other request can interleave. Which fragment fits?", options: ["`par`", "`critical`", "`opt`", "`loop`"], answer: 1, why: "`critical` marks an atomic region: a lock or transaction in Java." },
    { q: "When is a **state** diagram more useful than a sequence diagram?", options: ["To show calls between many objects for one use case", "To show the lifecycle of one entity (e.g. Order CREATED → PAID → SHIPPED) and which events are allowed in each state", "To show class fields", "Never in LLD"], answer: 1, why: "Sequence = one scenario across objects; state machine = one object across scenarios." },
    { q: "In a checkout flow, sending the confirmation email should usually be…", options: ["A synchronous call; if email fails, fail the order", "An asynchronous message (event/queue) with its own retry, so the checkout isn't slowed or failed by email", "Omitted from design", "Done inside the payment gateway"], answer: 1, why: "Side effects that shouldn't block or fail the main flow go async, and the async consumer handles its own failures." },
    { q: "`par` in a sequence diagram maps most naturally to which Java construct?", options: ["`synchronized`", "`CompletableFuture.allOf(a, b).join()`", "A `switch`", "`Thread.sleep`"], answer: 1, why: "Concurrent calls the caller waits for together. `synchronized` would be `critical`." },
    { q: "While drawing a sequence you can't decide which class should receive `calculateFine(loan)`. What does that usually indicate?", options: ["Sequence diagrams are the wrong tool", "A missing class or misplaced responsibility, often a policy/strategy object (`FinePolicy`)", "You should put it in `main`", "It should be static"], answer: 1, why: "An orphan message is a design smell. Give the behaviour to the class that owns the knowledge, or introduce one." }
  ];
  var PRACTICE = [
    { level: "Easy", q: "Draw the sequence diagram for an ATM cash withdrawal, including the **insufficient funds** and **wrong PIN** cases.",
      steps: [["Participants", "Customer (actor), `ATM`, `BankService`, `Account`, `CashDispenser`."],
        ["Happy path", "insert card → enter PIN → `bank.authenticate` → `withdraw(amount)` → `account.debit` → `dispenser.dispense` → receipt."],
        ["Alternatives", "An `alt` after authentication (wrong PIN, with a retry `loop` up to 3), and an `alt` after debit (insufficient funds)."],
        ["Ordering", "Debit **before** dispensing; if the dispenser fails, a compensating credit (show with `break`)."]],
      m: M(["sequenceDiagram",
        "  actor C as Customer",
        "  participant ATM",
        "  participant B as BankService",
        "  participant A as Account",
        "  participant D as CashDispenser",
        "  C->>ATM: insertCard + PIN",
        "  ATM->>B: authenticate(card, pin)",
        "  alt wrong PIN",
        "    B-->>ATM: DENIED",
        "    ATM-->>C: retry (max 3), then retain card",
        "  else ok",
        "    C->>ATM: withdraw(2000)",
        "    ATM->>B: debit(account, 2000)",
        "    B->>A: debit(2000)",
        "    alt insufficient funds",
        "      A-->>B: InsufficientFunds",
        "      B-->>ATM: declined",
        "      ATM-->>C: show error",
        "    else debited",
        "      ATM->>D: dispense(2000)",
        "      break dispenser jam",
        "        ATM->>B: reverse(txnId)",
        "      end",
        "      ATM-->>C: cash + receipt",
        "    end",
        "  end"]) },
    { level: "Easy", q: "Draw the sequence diagram that this method implies.",
      qcode: `class SignupService {
    private final UserRepository repo;
    private final PasswordHasher hasher;
    private final EventBus bus;
    SignupService(UserRepository r, PasswordHasher h, EventBus b) { repo = r; hasher = h; bus = b; }

    String signup(String email, String password) {
        if (repo.existsByEmail(email)) throw new IllegalArgumentException("taken");
        String hash = hasher.hash(password);
        String id = repo.save(email, hash);
        bus.publishAsync("UserSignedUp:" + id);
        return id;
    }
}
interface UserRepository { boolean existsByEmail(String e); String save(String e, String h); }
interface PasswordHasher { String hash(String p); }
interface EventBus { void publishAsync(String evt); }`,
      m: M(["sequenceDiagram",
        "  participant C as Caller",
        "  participant S as SignupService",
        "  participant R as UserRepository",
        "  participant H as PasswordHasher",
        "  participant E as EventBus",
        "  C->>S: signup(email, password)",
        "  S->>R: existsByEmail(email)",
        "  R-->>S: boolean",
        "  opt already exists",
        "    S-->>C: throw IllegalArgumentException",
        "  end",
        "  S->>H: hash(password)",
        "  H-->>S: hash",
        "  S->>R: save(email, hash)",
        "  R-->>S: id",
        "  S-)E: publishAsync(UserSignedUp)",
        "  S-->>C: id"]),
      a: "The `if … throw` is an `opt` (or `alt`) that ends the flow; `publishAsync` is drawn with an async arrow because the caller doesn't wait." },
    { level: "Easy", q: "Explain synchronous vs asynchronous messages. Give two examples of each from an e-commerce checkout.",
      a: ["**Synchronous**: the caller waits for the result and handles errors directly. Examples: `inventory.reserve(cart)` (you can't confirm without stock), `payment.charge(amount)` (you need the result to proceed).",
        "**Asynchronous**: the caller hands off and continues; errors are handled by the receiver (retries, dead-letter queue). Examples: send confirmation email/SMS, update recommendations/analytics, notify the warehouse via an event.",
        "Rule of thumb: sync for anything the user's response depends on, async for side effects. Async improves latency and isolation, but adds eventual consistency and harder debugging."] },
    { level: "Medium", q: "Implement in Java exactly what this sequence diagram describes (a Splitwise \"add expense\").",
      qcode: "sequenceDiagram\n  actor U as User\n  participant G as GroupService\n  participant SS as SplitStrategy\n  participant BS as BalanceSheet\n  U->>G: addExpense(groupId, paidBy, 900, EQUAL, [A,B,C])\n  G->>SS: split(900, [A,B,C])\n  SS-->>G: [A:300, B:300, C:300]\n  alt splits don't add up to amount\n    G-->>U: InvalidSplitException\n  else valid\n    loop each split where user != paidBy\n      G->>BS: add(owes=user, to=paidBy, amount)\n    end\n    G-->>U: expenseId\n  end",
      a: "Each participant becomes a type, each sync arrow a method, `alt` an exception check, `loop` a for-loop. The strategy returns splits; the service validates and then updates the balance sheet.",
      code: `record Split(String user, long amount) {}
interface SplitStrategy { List<Split> split(long amount, List<String> users); }
class EqualSplit implements SplitStrategy {
    public List<Split> split(long amount, List<String> users) {
        long each = amount / users.size(), rem = amount % users.size();
        List<Split> out = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) out.add(new Split(users.get(i), each + (i < rem ? 1 : 0)));
        return out;
    }
}
class InvalidSplitException extends RuntimeException { InvalidSplitException(String m) { super(m); } }

class BalanceSheet {
    private final Map<String, Long> net = new TreeMap<>();      // key "A->B": A owes B
    void add(String owes, String to, long amount) { net.merge(owes + "->" + to, amount, Long::sum); }
    public String toString() { return net.toString(); }
}

class GroupService {
    private final BalanceSheet sheet = new BalanceSheet();
    private final Map<String, SplitStrategy> strategies = Map.of("EQUAL", new EqualSplit());
    private int seq;

    String addExpense(String groupId, String paidBy, long amount, String type, List<String> users) {
        List<Split> splits = strategies.get(type).split(amount, users);           // G->>SS: split
        long sum = splits.stream().mapToLong(Split::amount).sum();
        if (sum != amount) throw new InvalidSplitException(sum + " != " + amount); // alt invalid
        for (Split s : splits)                                                    // loop
            if (!s.user().equals(paidBy)) sheet.add(s.user(), paidBy, s.amount()); // G->>BS: add
        return groupId + "-E" + (++seq);
    }
    BalanceSheet sheet() { return sheet; }
}

GroupService g = new GroupService();
System.out.println(g.addExpense("goa", "A", 900, "EQUAL", List.of("A", "B", "C")));
System.out.println(g.sheet());` },
    { level: "Medium", q: "Draw the **state diagram** for a vending machine (idle, has money, dispensing, out of stock) and write the transition guard in Java.",
      steps: [["States", "`IDLE`, `HAS_MONEY`, `DISPENSING`, `OUT_OF_STOCK`."],
        ["Events", "`insertCoin`, `selectItem`, `cancel` (refund), `dispensed`, `restock`."],
        ["Guards", "`selectItem [balance ≥ price && inStock]`; after dispensing, go to `OUT_OF_STOCK` if the inventory is empty."],
        ["Code", "An enum transition table (as in slide 7) or the State pattern (F20) when each state has a lot of behaviour."]],
      m: M(["stateDiagram-v2",
        "  [*] --> IDLE",
        "  IDLE --> HAS_MONEY: insertCoin",
        "  HAS_MONEY --> HAS_MONEY: insertCoin",
        "  HAS_MONEY --> IDLE: cancel / refund",
        "  HAS_MONEY --> DISPENSING: selectItem [balance >= price]",
        "  DISPENSING --> IDLE: dispensed [stock left]",
        "  DISPENSING --> OUT_OF_STOCK: dispensed [stock empty]",
        "  OUT_OF_STOCK --> IDLE: restock"]),
      code: `enum VmState { IDLE, HAS_MONEY, DISPENSING, OUT_OF_STOCK }

class VendingMachine {
    private VmState state = VmState.IDLE;
    private long balance; private int stock;
    private final long price;
    VendingMachine(int stock, long price) { this.stock = stock; this.price = price; }

    void insertCoin(long amt) {
        if (state != VmState.IDLE && state != VmState.HAS_MONEY) throw new IllegalStateException("cannot insert in " + state);
        balance += amt; state = VmState.HAS_MONEY;
    }
    long select() {
        if (state != VmState.HAS_MONEY || balance < price) throw new IllegalStateException("insert more money");
        state = VmState.DISPENSING;
        stock--; long change = balance - price; balance = 0;
        state = stock == 0 ? VmState.OUT_OF_STOCK : VmState.IDLE;   // dispensed
        return change;
    }
    VmState state() { return state; }
}

VendingMachine vm = new VendingMachine(1, 25);
vm.insertCoin(10); vm.insertCoin(20);
System.out.println("change " + vm.select() + ", state " + vm.state());
try { vm.insertCoin(10); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }` },
    { level: "Medium", q: "Draw the sequence diagram for an **elevator hall call**: someone on floor 7 presses UP.",
      m: M(["sequenceDiagram",
        "  actor P as Person",
        "  participant HB as HallButtonPanel",
        "  participant D as Dispatcher",
        "  participant S as SchedulingStrategy",
        "  participant E as ElevatorCar",
        "  P->>HB: press(UP) on floor 7",
        "  HB->>D: submit(HallRequest(7, UP))",
        "  D->>S: choose(cars, request)",
        "  S-->>D: car 2 (nearest moving up, below 7)",
        "  D-)E: addStop(7)",
        "  D-->>HB: ack (light on)",
        "  loop each tick",
        "    E->>E: step()",
        "  end",
        "  E-)HB: arrived(7, UP)",
        "  Note over HB: light off, doors open"]),
      a: "Note that the dispatcher **hands off** to the car asynchronously: the button returns immediately, and the car's own control loop moves it. That decoupling is the key design point; the strategy is swappable (nearest car, LOOK)." },
    { level: "Hard", q: "Two users try to book seat A1 for the same show at the same moment. Draw the sequence with the `critical` region and implement the seat lock in Java so exactly one wins.",
      steps: [["Diagram", "Both users call `hold`; inside `critical`, `ShowSeat.tryLock(user)` does an atomic AVAILABLE → LOCKED; the loser gets `SeatUnavailable`."],
        ["Java", "An `AtomicReference<String>` holder per seat with `compareAndSet(null, user)`, plus an expiry time so abandoned locks free up."],
        ["Multi-seat holds", "Lock seats in a **sorted** order and roll back on any failure, so two users holding overlapping sets can't deadlock or end up with half a booking."]],
      m: M(["sequenceDiagram",
        "  actor U1 as User 1",
        "  actor U2 as User 2",
        "  participant B as BookingService",
        "  participant S as ShowSeat A1",
        "  par simultaneous",
        "    U1->>B: hold(A1)",
        "  and",
        "    U2->>B: hold(A1)",
        "  end",
        "  critical compareAndSet(null, user)",
        "    B->>S: tryLock(U1)",
        "    S-->>B: true",
        "    B->>S: tryLock(U2)",
        "    S-->>B: false",
        "  end",
        "  B-->>U1: held (10 min)",
        "  B-->>U2: SeatUnavailable"]),
      code: `class ShowSeat {
    final String id;
    private final AtomicReference<String> holder = new AtomicReference<>();
    ShowSeat(String id) { this.id = id; }
    boolean tryLock(String user) { return holder.compareAndSet(null, user); }   // atomic
    void release(String user) { holder.compareAndSet(user, null); }
    String holder() { return holder.get(); }
}

class BookingService {
    private final Map<String, ShowSeat> seats = new ConcurrentHashMap<>();
    BookingService(List<String> ids) { ids.forEach(i -> seats.put(i, new ShowSeat(i))); }

    boolean hold(String user, List<String> seatIds) {
        List<String> sorted = seatIds.stream().sorted().toList();     // fixed order: no deadlock
        List<ShowSeat> got = new ArrayList<>();
        for (String id : sorted) {
            ShowSeat s = seats.get(id);
            if (!s.tryLock(user)) { got.forEach(x -> x.release(user)); return false; }   // roll back
            got.add(s);
        }
        return true;
    }
    String holderOf(String id) { return seats.get(id).holder(); }
}

BookingService svc = new BookingService(List.of("A1", "A2"));
ExecutorService pool = Executors.newFixedThreadPool(2);
CountDownLatch go = new CountDownLatch(1);
Future<Boolean> u1 = pool.submit(() -> { go.await(); return svc.hold("u1", List.of("A1", "A2")); });
Future<Boolean> u2 = pool.submit(() -> { go.await(); return svc.hold("u2", List.of("A2", "A1")); });
go.countDown();
System.out.println("u1=" + u1.get() + " u2=" + u2.get() + " A1=" + svc.holderOf("A1") + " A2=" + svc.holderOf("A2"));
pool.shutdown();`,
      follow: "Exactly one of u1/u2 is true, and both seats have the same holder. How do expired holds get released? Store `lockedUntil` and treat an expired lock as free in `tryLock`, or run a scheduled sweeper." },
    { level: "Hard", q: "Draw the **food-delivery order placement** sequence (Swiggy/Zomato-style): validate cart, price with offers, pay, create the order, then notify the restaurant and assign a delivery partner without blocking the user.",
      m: M(["sequenceDiagram",
        "  actor C as Customer",
        "  participant O as OrderService",
        "  participant R as RestaurantService",
        "  participant P as PricingService",
        "  participant PG as PaymentGateway",
        "  participant EB as EventBus",
        "  participant DA as DeliveryAssigner",
        "  C->>O: placeOrder(cart, couponCode)",
        "  par",
        "    O->>R: isOpenAndItemsAvailable(cart)",
        "  and",
        "    O->>P: quote(cart, couponCode)",
        "  end",
        "  alt closed or item unavailable",
        "    O-->>C: 409 cannot place",
        "  else ok",
        "    O->>PG: charge(total)",
        "    alt payment failed",
        "      O-->>C: payment failed",
        "    else paid",
        "      create participant OR as Order",
        "      O->>OR: new Order(PLACED)",
        "      O-)EB: OrderPlaced(orderId)",
        "      O-->>C: orderId, ETA",
        "      EB-)R: notify kitchen",
        "      EB-)DA: assign partner",
        "    end",
        "  end"]),
      a: ["Validation and pricing are independent, so they run in `par`.",
        "Payment is synchronous: the user needs the answer.",
        "Order creation happens only after payment (or create PENDING_PAYMENT first and confirm; say which, and why).",
        "Kitchen notification and partner assignment are **async** via an event: slow or failing consumers can't fail or slow the checkout, and each retries independently.",
        "Follow-up: what if the restaurant rejects after payment? A compensating refund, shown as a separate sequence (the saga idea)."] },
    { level: "Hard", q: "Your sequence diagram for \"place order\" shows `OrderService` making 9 calls to 7 objects, asking each for data and deciding everything itself. What's wrong, and how would you redraw it?",
      a: ["It's a **god orchestrator** (also an anemic domain model): the service *asks* objects for their data and makes their decisions for them, violating *tell, don't ask* and SRP.",
        "Redraw so behaviour lives with the data: `cart.total(pricingRules)` instead of the service reading every line; `inventory.reserve(cart)` instead of `getStock` + `setStock`; `order.confirm(payment)` validates its own state transition.",
        "Group related calls behind a facade or domain service if one use case still touches many subsystems (e.g. a `CheckoutFacade`).",
        "Move side effects (email, analytics, loyalty points) out to async events.",
        "The redrawn diagram has fewer, higher-level messages, and each arrow is a responsibility the receiver clearly owns. That's also how you justify the class diagram."],
      m: M(["sequenceDiagram",
        "  participant S as OrderService",
        "  participant CT as Cart",
        "  participant I as Inventory",
        "  participant PG as Payment",
        "  participant O as Order",
        "  participant EB as EventBus",
        "  S->>CT: total(pricingRules)",
        "  S->>I: reserve(cart)",
        "  S->>PG: charge(total)",
        "  S->>O: confirm(paymentRef)",
        "  S-)EB: OrderConfirmed"]) }
  ];

  H.registerLesson({
    code: "F04",
    summary: "UML sequence diagrams for LLD interviews: lifelines, sync/async/return/create messages, and the alt, opt, loop, par, critical and break fragments, each mapped to Java. Also turning a diagram into code one-to-one, async with CompletableFuture, a full BookMyShow seat-booking flow, state machine diagrams for entity lifecycles, which diagram to use when, and drawing fast in an interview.",
    slides: SLIDES,
    widget: { heading: "Interactive: trace the parking-lot exit", caption: "Step through one use case. The sequence diagram grows a message at a time, with the Java call it becomes and the state of each object afterwards.", render: widget },
    examplesHeading: "Real-world analogies and where sequence thinking shows up",
    examples: [
      ["Analogy: a restaurant order", "You (actor) → waiter (controller) → kitchen (service) → chef stations (`par`: grill and salad together) → waiter returns the food (return message). The bill printing in the background is async."],
      ["Spring MVC request flow", "`DispatcherServlet` → `HandlerMapping` → `Controller` → `Service` → `Repository` is a sequence diagram you already know; filters and interceptors wrap it."],
      ["`CompletableFuture` pipelines", "`supplyAsync` → `thenCombine` → `thenApply` → `exceptionally` read like a sequence with `par` and async messages."],
      ["Distributed tracing (Zipkin/Jaeger)", "A trace view is literally a sequence diagram of a real request: spans as activations, nesting as calls. Great for checking your mental model against reality."],
      ["Payment gateways", "Razorpay/Stripe docs explain checkout as sequence diagrams: create order → client pays → webhook (async) → verify signature → mark paid."],
      ["Order status in e-commerce", "Every \"track your order\" page shows a state machine: placed → packed → shipped → out for delivery → delivered."]
    ],
    pitfalls: [
      "Drawing one giant diagram for the whole system instead of one per use case",
      "Message names that don't match any method in your class diagram (or code)",
      "Calling an object the sender has no reference to; the diagram reveals a missing association",
      "Making notifications, emails and analytics synchronous, so their failures fail the user's request",
      "Showing async messages as if their order were guaranteed",
      "Changing state before the step that can fail (freeing the spot before payment succeeds)",
      "Only the happy path; interviewers ask \"what if payment fails?\" first",
      "UI and SQL detail (clicks, screens, queries) instead of object messages",
      "A god orchestrator asking every object for data instead of telling objects to act",
      "Using a sequence diagram where a state diagram would be clearer (an entity with many status rules)"
    ],
    quiz: QUIZ,
    cheatsheet: {
      table: [
        ["Element", "Mermaid", "Java"],
        ["Sync call / return", "`A->>B: m(x)` / `B-->>A: r`", "`b.m(x)` / `return r`"],
        ["Async", "`A-)B: evt`", "executor, queue, event bus, `runAsync`"],
        ["Self call", "`A->>A: validate()`", "`this.validate()`"],
        ["Create", "`create participant T` + `A->>T: new`", "`new T(...)`"],
        ["alt / opt", "`alt c` … `else` … `end` / `opt c` … `end`", "`if/else` / `if`"],
        ["loop", "`loop cond` … `end`", "`for` / `while`"],
        ["par", "`par` … `and` … `end`", "`CompletableFuture.allOf`"],
        ["critical", "`critical lock` … `end`", "`synchronized`, lock, CAS, transaction"],
        ["break", "`break cond` … `end`", "early `return` / `throw` + compensation"]],
      cards: [
        { title: "Drawing order", items: ["Pick the hardest use case", "Actor → entry → service → domain → infra", "Happy path first", "Add 1–2 `alt` failures", "Mark async + critical", "Check every arrow against the classes"] },
        { title: "Which diagram?", items: ["Structure → class", "One flow, many objects → sequence", "One object, many events → state", "Process/algorithm → flowchart (activity)"] },
        { title: "Smells a sequence reveals", items: ["Message with no natural owner", "Sender can't reach receiver", "God orchestrator (ask, ask, ask)", "State change before a failing step", "Side effects in the sync path"] }]
    },
    practice: PRACTICE,
    recap: [
      "Sequence diagram = one use case over time: lifelines, sync (`->>`), return (`-->>`), async (`-)`), create and self-call messages.",
      "Fragments map to control flow: alt/opt → if, loop → for, par → concurrent futures, critical → lock/CAS, break → early exit plus compensation.",
      "Each arrow is a method on the receiver, and the sender must hold a reference; use the diagram to validate the class diagram.",
      "Make side effects async with their own retries; never change state before the step that can fail.",
      "Use a state diagram for any entity with a status lifecycle; it becomes an enum transition table or the State pattern."
    ]
  });
})();
