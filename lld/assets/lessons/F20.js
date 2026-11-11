/* Lesson F20: State */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var ITEMS = { A1: { name: "Chips", price: 25 }, B2: { name: "Water", price: 15 } };
  function vmDiagram(cur) {
    return ["stateDiagram-v2", "  direction LR",
      "  [*] --> Idle",
      "  Idle --> HasMoney : insertCoin",
      "  HasMoney --> HasMoney : insertCoin / select (not enough)",
      "  HasMoney --> Dispensing : select (paid)",
      "  HasMoney --> Idle : cancel / refund",
      "  Dispensing --> Idle : take item (stock left)",
      "  Dispensing --> SoldOut : take item (last unit)",
      "  SoldOut --> Idle : restock",
      "  classDef cur fill:#fff3e0,stroke:#ef6c00,stroke-width:3px",
      "  class " + cur + " cur"].join("\n");
  }
  function vendingWidget(el, ctx) {
    var s = ctx.state; if (!s.st) { s.st = "Idle"; s.bal = 0; s.stock = { A1: 2, B2: 1 }; s.log = []; s.sel = null; }
    el.innerHTML = "<p>" + ctx.md("The `VendingMachine` (context) delegates every button to its **current state object**. The same button does different things in different states, and only states decide transitions. Try pressing buttons that are *not* valid in the current state.") + "</p>" +
      "<div class='diagram' data-r='dg'></div><div class='metrics' data-r='m'></div>" +
      "<div class='btnrow' data-r='ev'></div><pre class='code' data-r='log'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    var EVENTS = [["coin10", "Insert ₹10"], ["coin20", "Insert ₹20"], ["A1", "Select A1 Chips ₹25"], ["B2", "Select B2 Water ₹15"], ["cancel", "Cancel"], ["take", "Take item"], ["restock", "Service: restock"], ["reset", "Reset"]];
    function say(t) { s.log.push(t); }
    function handle(ev) {
      var st = s.st, pre = st + "." ;
      if (ev === "reset") { s.st = "Idle"; s.bal = 0; s.stock = { A1: 2, B2: 1 }; s.log = []; s.sel = null; return; }
      if (ev === "coin10" || ev === "coin20") {
        var amt = ev === "coin10" ? 10 : 20;
        if (st === "Idle" || st === "HasMoney") { s.bal += amt; s.st = "HasMoney"; say(pre + "insertCoin(" + amt + ") -> balance ₹" + s.bal + (st === "Idle" ? ", go to HasMoney" : "")); }
        else if (st === "Dispensing") say(pre + "insertCoin: please take your item first (coin returned)");
        else say(pre + "insertCoin: sold out, coin returned");
        return;
      }
      if (ev === "A1" || ev === "B2") {
        var it = ITEMS[ev];
        if (st === "Idle") say(pre + "select(" + ev + "): insert money first");
        else if (st === "HasMoney") {
          if (!s.stock[ev]) say(pre + "select(" + ev + "): " + it.name + " is out of stock, choose another");
          else if (s.bal < it.price) say(pre + "select(" + ev + "): need ₹" + (it.price - s.bal) + " more");
          else { s.bal -= it.price; s.stock[ev]--; s.sel = ev; s.st = "Dispensing"; say(pre + "select(" + ev + "): dispensing " + it.name + (s.bal ? ", change ₹" + s.bal : "") + ", go to Dispensing"); s.bal = 0; }
        } else if (st === "Dispensing") say(pre + "select: busy dispensing");
        else say(pre + "select: machine is sold out");
        return;
      }
      if (ev === "cancel") {
        if (st === "HasMoney") { say(pre + "cancel(): refund ₹" + s.bal + ", go to Idle"); s.bal = 0; s.st = "Idle"; }
        else say(pre + "cancel(): nothing to cancel");
        return;
      }
      if (ev === "take") {
        if (st === "Dispensing") { var left = s.stock.A1 + s.stock.B2; s.st = left ? "Idle" : "SoldOut"; say(pre + "itemTaken() -> " + s.st); }
        else say(pre + "itemTaken(): nothing in the tray");
        return;
      }
      if (ev === "restock") {
        s.stock = { A1: 2, B2: 1 };
        if (st === "SoldOut") { s.st = "Idle"; say(pre + "restock() -> Idle"); } else say(pre + "restock(): stock refilled, state unchanged");
      }
    }
    function draw() {
      ctx.H.renderDiagram(q("dg"), vmDiagram(s.st));
      q("m").innerHTML = "<div class='metric'><div class='v'>" + s.st + "</div><div class='l'>current state object</div></div><div class='metric'><div class='v'>₹" + s.bal + "</div><div class='l'>balance</div></div><div class='metric'><div class='v'>A1×" + s.stock.A1 + " B2×" + s.stock.B2 + "</div><div class='l'>stock</div></div>";
      q("ev").innerHTML = EVENTS.map(function (e) { return "<button type='button' class='btn" + (e[0] === "reset" ? "" : " primary") + "' data-e='" + e[0] + "'>" + ctx.esc(e[1]) + "</button>"; }).join("");
      q("log").textContent = s.log.length ? s.log.slice(-10).join("\n") : "// press a button: machine.press(...) -> state.handle(machine, ...)";
    }
    q("ev").addEventListener("click", function (e) { var b = e.target.closest("button[data-e]"); if (!b) return; handle(b.getAttribute("data-e")); ctx.save(); draw(); });
    draw();
  }
  H.pattern({
    code: "F20", name: "State",
    summary: "State lets an object change its behaviour when its internal state changes, by delegating to one state object per state. It is the core of vending machines, ATMs, elevators and order lifecycles, all frequently asked machine-coding problems. This lesson covers context and state roles, a full vending machine, who owns transitions, enum-based state machines and transition tables, an ATM and an order lifecycle design, JDK and Spring usages (Spring State Machine, thread states), concurrency concerns, and State vs Strategy.",
    intent: "Allow an object to **alter its behaviour when its internal state changes**. The object will appear to change its class.",
    problem: {
      text: "A vending machine reacts to `insertCoin`, `select`, `cancel` and `dispense`. What each button does depends on whether the machine is idle, has money, is dispensing, or is sold out. The first version has a `status` field and a `switch (status)` in **every** method. Adding a `Maintenance` state means editing every switch, and it's easy to forget one (selecting a product during maintenance dispenses for free).",
      points: [
        "The smell: the **same `switch (status)`** repeated across many methods, plus scattered `status = ...` assignments",
        "Each state becomes a class implementing all the events; the **context** delegates to its current state",
        "Transitions happen by replacing the context's state object",
        "Adding a state = adding a class; invalid actions are handled explicitly per state"],
      code: `class VendingMachine {
    String status = "IDLE"; int balance;
    void insertCoin(int c) {
        switch (status) {
            case "IDLE", "HAS_MONEY" -> { balance += c; status = "HAS_MONEY"; }
            case "DISPENSING" -> System.out.println("wait");
            case "SOLD_OUT" -> System.out.println("refund " + c);
        }
    }
    void select(String item) {
        switch (status) {                     // the same switch again... and again in cancel(), dispense(), restock()
            case "HAS_MONEY" -> { if (balance >= 25) { status = "DISPENSING"; balance -= 25; } }
            default -> System.out.println("not now");
        }
    }
}
VendingMachine vm = new VendingMachine(); vm.insertCoin(20); vm.insertCoin(10); vm.select("A1");
System.out.println(vm.status + " change=" + vm.balance);` },
    analogy: "A traffic light. The same \"timer expired\" event means \"go to yellow\" when green, \"go to red\" when yellow, and \"go to green\" when red. The light doesn't consult a rulebook each time; its current colour knows what comes next.",
    structure: {
      text: "The **Context** holds a reference to its current **State** and delegates state-dependent requests to it. Each **ConcreteState** implements behaviour for that state and decides transitions by setting the context's next state. The context exposes only what states need (balance, inventory, `setState`).",
      m: H.cd(["classDiagram",
        "  class VendingMachine { -State state; -int balance; -Map~String,Integer~ stock; +insertCoin(int c); +select(String code); +cancel(); +itemTaken(); ~setState(State s) }",
        "  class State { <<interface>>; +insertCoin(VendingMachine m, int c); +select(VendingMachine m, String code); +cancel(VendingMachine m); +itemTaken(VendingMachine m) }",
        "  class IdleState", "  class HasMoneyState", "  class DispensingState", "  class SoldOutState",
        "  VendingMachine o-- State : current",
        "  State <|.. IdleState", "  State <|.. HasMoneyState", "  State <|.. DispensingState", "  State <|.. SoldOutState"]),
      roles: [["Context", "Public API; holds the current state and shared data; delegates"], ["State", "Interface with one method per event"], ["Concrete state", "Behaviour for one state; triggers transitions"], ["(Optional) state machine table", "Allowed transitions, if centralised instead of inside states"]],
      points: ["Stateless state objects can be shared singletons (one instance per state)", "Draw the state diagram first (F04); each arrow becomes a transition in code"] },
    impl: {
      title: "Java implementation: a vending machine",
      text: "Each state class handles every event. Invalid events are rejected with a message instead of silently corrupting data. States are stateless singletons; data (balance, stock) lives in the context. The `default` methods give \"not allowed here\" behaviour, so each state overrides only what it supports.",
      code: `interface State {
    default void insertCoin(VendingMachine m, int c) { System.out.println("  [" + name() + "] coin rejected, refund ₹" + c); }
    default void select(VendingMachine m, String code) { System.out.println("  [" + name() + "] can't select now"); }
    default void cancel(VendingMachine m) { System.out.println("  [" + name() + "] nothing to cancel"); }
    default void itemTaken(VendingMachine m) { System.out.println("  [" + name() + "] tray is empty"); }
    default String name() { return getClass().getSimpleName(); }
}
class Idle implements State {
    static final Idle I = new Idle();
    public void insertCoin(VendingMachine m, int c) { m.balance += c; m.setState(HasMoney.I); }
}
class HasMoney implements State {
    static final HasMoney I = new HasMoney();
    public void insertCoin(VendingMachine m, int c) { m.balance += c; }
    public void select(VendingMachine m, String code) {
        int price = m.prices.get(code), left = m.stock.getOrDefault(code, 0);
        if (left == 0) { System.out.println("  " + code + " out of stock"); return; }
        if (m.balance < price) { System.out.println("  need ₹" + (price - m.balance) + " more"); return; }
        m.stock.put(code, left - 1);
        System.out.println("  dispensing " + code + (m.balance > price ? ", change ₹" + (m.balance - price) : ""));
        m.balance = 0; m.setState(Dispensing.I);
    }
    public void cancel(VendingMachine m) { System.out.println("  refund ₹" + m.balance); m.balance = 0; m.setState(Idle.I); }
}
class Dispensing implements State {
    static final Dispensing I = new Dispensing();
    public void itemTaken(VendingMachine m) { m.setState(m.stock.values().stream().allMatch(n -> n == 0) ? SoldOut.I : Idle.I); }
}
class SoldOut implements State { static final SoldOut I = new SoldOut(); }

class VendingMachine {                                                     // context
    private State state = Idle.I; int balance;
    final Map<String, Integer> prices = Map.of("A1", 25, "B2", 15); final Map<String, Integer> stock = new HashMap<>(Map.of("A1", 1, "B2", 1));
    void setState(State s) { System.out.println("  " + state.name() + " -> " + s.name()); state = s; }
    void insertCoin(int c) { state.insertCoin(this, c); }
    void select(String code) { state.select(this, code); }
    void cancel() { state.cancel(this); }
    void itemTaken() { state.itemTaken(this); }
}

VendingMachine vm = new VendingMachine();
vm.select("A1");                                    // Idle: can't select
vm.insertCoin(20); vm.select("A1"); vm.insertCoin(10); vm.select("A1");
vm.insertCoin(10);                                  // Dispensing: coin rejected
vm.itemTaken();
vm.insertCoin(10); vm.cancel();
vm.insertCoin(20); vm.select("B2"); vm.itemTaken();
vm.insertCoin(10);                                  // SoldOut` },
    variants: [
      { title: "Who owns transitions? State classes vs a transition table",
        text: "Two common implementations. **Decentralised**: each state class decides the next state (GoF style; good when states have lots of behaviour). **Centralised**: an `enum` of states plus a **transition table** `Map<State, Map<Event, State>>` (good when behaviour is small and the rules are the main thing, like an order lifecycle). Many production systems use the table for validation and small handlers for side effects.",
        table: [
          ["", "State classes (GoF)", "Enum + transition table"],
          ["Behaviour per state", "rich, in each class", "small, often in handlers/listeners"],
          ["See all transitions at once", "no: spread across classes", "yes: one table (easy to review, draw, test)"],
          ["Adding a state", "new class", "new enum constant + table rows"],
          ["Persisting state", "map class ↔ enum/string", "store the enum directly"],
          ["Typical use", "vending machine, ATM, game AI, TCP connection", "order/payment/booking lifecycles, workflows"]],
        code: `enum OrderState { CREATED, PAID, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURNED }
enum OrderEvent { PAY, PACK, SHIP, DELIVER, CANCEL, RETURN }
final class OrderMachine {
    private static final Map<OrderState, Map<OrderEvent, OrderState>> T = new EnumMap<>(OrderState.class);
    private static void allow(OrderState from, OrderEvent e, OrderState to) { T.computeIfAbsent(from, k -> new EnumMap<>(OrderEvent.class)).put(e, to); }
    static {
        allow(OrderState.CREATED, OrderEvent.PAY, OrderState.PAID);     allow(OrderState.CREATED, OrderEvent.CANCEL, OrderState.CANCELLED);
        allow(OrderState.PAID, OrderEvent.PACK, OrderState.PACKED);     allow(OrderState.PAID, OrderEvent.CANCEL, OrderState.CANCELLED);
        allow(OrderState.PACKED, OrderEvent.SHIP, OrderState.SHIPPED);
        allow(OrderState.SHIPPED, OrderEvent.DELIVER, OrderState.DELIVERED);
        allow(OrderState.DELIVERED, OrderEvent.RETURN, OrderState.RETURNED);
    }
    static OrderState next(OrderState s, OrderEvent e) {
        OrderState n = T.getOrDefault(s, Map.of()).get(e);
        if (n == null) throw new IllegalStateException("can't " + e + " when " + s);
        return n;
    }
}

OrderState s = OrderState.CREATED;
for (OrderEvent e : List.of(OrderEvent.PAY, OrderEvent.PACK, OrderEvent.SHIP)) { s = OrderMachine.next(s, e); System.out.print(s + " "); }
System.out.println();
try { OrderMachine.next(s, OrderEvent.CANCEL); } catch (IllegalStateException ex) { System.out.println(ex.getMessage()); }`,
        points: [
          "Interview tip: draw the state diagram first, then say which implementation you'll use and why",
          "With a table, side effects (refund on CANCEL after PAID) go in transition handlers keyed by (from, event)",
          "Spring State Machine and workflow engines are the table approach with guards, actions and persistence"] },
      { title: "Persistence and concurrency of state",
        text: "In a web app, the state lives in the database row (`orders.status`), and two requests can try to transition the same order at once (a customer cancels while the warehouse ships). The state pattern itself doesn't solve this; your transition code must.",
        points: [
          "Store the state as an enum/string column; rebuild the state object on load (`State.of(status)`)",
          "Make transitions atomic: **conditional update** `UPDATE orders SET status='CANCELLED' WHERE id=? AND status='PAID'` and check the row count; or optimistic locking with a `version` column",
          "In-memory machines shared across threads: guard `handle(event)` with a lock (one event at a time per entity), or confine each entity to one thread/actor",
          "Record a **transition history** table (`from, to, event, at, actor`) for audit and debugging",
          "Side effects (emails, refunds) after the transition commits (outbox, `@TransactionalEventListener`)"],
        m: M(["sequenceDiagram",
          "  participant C as Customer API",
          "  participant W as Warehouse API",
          "  participant DB as orders table",
          "  C->>DB: UPDATE status=CANCELLED WHERE id=7 AND status=PAID",
          "  W->>DB: UPDATE status=PACKED WHERE id=7 AND status=PAID",
          "  DB-->>C: 1 row updated (cancel wins)",
          "  DB-->>W: 0 rows updated, reload and reject"]) }
    ],
    designs: [
      { title: "Mini LLD: ATM (frequently asked)",
        text: "An ATM moves through **Idle → CardInserted → Authenticated → (transaction) → Idle**, with a 3-wrong-PIN rule that retains the card, and an **OutOfService** state when cash runs low or the machine is under maintenance. Each state handles `insertCard`, `enterPin`, `withdraw`, `ejectCard`. Cash dispensing itself is a Chain of Responsibility over note denominations (F22).",
        points: [
          "Context `Atm`: current state, `cashAvailable`, current `Card`, `pinAttempts`, and collaborators `BankService` and `CashDispenser`",
          "`Idle`: accepts `insertCard` only. `CardInserted`: `enterPin` (3 failures → card retained, back to Idle). `Authenticated`: `withdraw`, `balance`, `ejectCard`",
          "`withdraw` checks the ATM's cash and the bank balance, debits via `BankService` (idempotent transaction ID), dispenses, then returns to Idle after ejecting the card",
          "`OutOfService`: everything rejected; entered when cash < minimum or by the operator",
          "Timeouts (customer walks away) are events too: `timeout()` in `Authenticated` ejects/retains the card"],
        m: M(["stateDiagram-v2",
          "  [*] --> Idle",
          "  Idle --> CardInserted : insertCard",
          "  CardInserted --> Authenticated : enterPin ok",
          "  CardInserted --> CardInserted : wrong pin (attempts < 3)",
          "  CardInserted --> Idle : 3rd wrong pin, card retained",
          "  Authenticated --> Idle : withdraw done, eject card",
          "  Authenticated --> Idle : cancel or timeout",
          "  Idle --> OutOfService : cash low or maintenance",
          "  OutOfService --> Idle : refilled"]),
        code: `class Atm {
    AtmState state = new IdleState(); long cash; int attempts; String card;
    final Map<String, Long> accounts = new HashMap<>(Map.of("4111", 5_000L)); final Map<String, String> pins = Map.of("4111", "1234");
    Atm(long cash) { this.cash = cash; }
    void go(AtmState s) { System.out.println("    -> " + s.getClass().getSimpleName()); state = s; }
    void insertCard(String c) { state.insertCard(this, c); }
    void enterPin(String p) { state.enterPin(this, p); }
    void withdraw(long amt) { state.withdraw(this, amt); }
}
interface AtmState {
    default void insertCard(Atm a, String c) { System.out.println("  card not accepted now"); }
    default void enterPin(Atm a, String p) { System.out.println("  no card"); }
    default void withdraw(Atm a, long amt) { System.out.println("  not authenticated"); }
}
class IdleState implements AtmState {
    public void insertCard(Atm a, String c) { a.card = c; a.attempts = 0; a.go(new CardInsertedState()); }
}
class CardInsertedState implements AtmState {
    public void enterPin(Atm a, String p) {
        if (p.equals(a.pins.get(a.card))) { a.go(new AuthenticatedState()); return; }
        if (++a.attempts == 3) { System.out.println("  3 wrong PINs: card retained"); a.card = null; a.go(new IdleState()); }
        else System.out.println("  wrong PIN (" + a.attempts + "/3)");
    }
}
class AuthenticatedState implements AtmState {
    public void withdraw(Atm a, long amt) {
        long bal = a.accounts.get(a.card);
        if (amt % 100 != 0) { System.out.println("  amount must be a multiple of ₹100"); return; }
        if (amt > bal) { System.out.println("  insufficient balance"); return; }
        if (amt > a.cash) { System.out.println("  ATM has insufficient cash"); return; }
        a.accounts.put(a.card, bal - amt); a.cash -= amt;
        System.out.println("  dispensed ₹" + amt + ", balance ₹" + (bal - amt) + ", card ejected");
        a.card = null;
        a.go(a.cash < 1_000 ? new OutOfServiceState() : new IdleState());
    }
}
class OutOfServiceState implements AtmState {}

Atm atm = new Atm(3_000);
atm.withdraw(500);
atm.insertCard("4111"); atm.enterPin("0000"); atm.enterPin("1234");
atm.withdraw(250); atm.withdraw(2_500);
atm.insertCard("4111");` },
      { title: "Mini LLD: document approval workflow",
        text: "Policies at a company go **Draft → InReview → Approved → Published**, may be **Rejected** back to Draft with comments, and published documents can be **Archived**. Who may perform each action depends on the state and the role: authors edit drafts, reviewers approve or reject, admins publish. A centralised transition table with **guards** (role checks) and **actions** (notify, version snapshot) fits well.",
        points: [
          "Transition rows: `(from, event, to, guard, action)`, e.g. `(IN_REVIEW, APPROVE, APPROVED, role==REVIEWER && reviewer != author, notifyAuthor)`",
          "`edit()` is only allowed in DRAFT: the state decides which operations exist, not just the next state",
          "Each transition writes an audit row and, on PUBLISH, a version snapshot (Memento, F26)",
          "Parallel approvals (two reviewers must approve) are a sub-state with a counter, or a composite state",
          "Easy to show in an interview: draw the diagram, then the table, then one handler"],
        m: M(["stateDiagram-v2",
          "  direction LR",
          "  [*] --> Draft",
          "  Draft --> InReview : submit (author)",
          "  InReview --> Approved : approve (reviewer)",
          "  InReview --> Draft : reject with comments",
          "  Approved --> Published : publish (admin)",
          "  Published --> Archived : archive",
          "  Published --> Draft : new revision"]) }
    ],
    usages: [
      ["`java.lang.Thread.State` + the JVM's thread lifecycle", "NEW → RUNNABLE → BLOCKED/WAITING/TIMED_WAITING → TERMINATED; operations like `start()` are only valid in some states (`IllegalThreadStateException`)."],
      ["`java.util.Iterator` / `Scanner` / streams", "Internally stateful: a stream can be consumed once; calling a terminal operation twice throws `IllegalStateException`."],
      ["Spring State Machine (`spring-statemachine`)", "States, events, guards, actions and persistence as a framework: the table approach."],
      ["`java.net.http.WebSocket`, TCP connection (`SocketChannel`)", "Connection objects behave differently when connecting, open, closing or closed."],
      ["`CompletableFuture`", "Incomplete → completed normally / exceptionally / cancelled; completion methods only take effect once."]
    ],
    avoid: {
      points: [
        "Two or three states with trivial behaviour: an enum and a `switch` expression (or a small transition table) is clearer",
        "Behaviour doesn't actually change by state, only data does",
        "The main complexity is the transition **rules**, not behaviour per state: use an enum + table rather than a class per state",
        "States need lots of private data from the context, forcing you to open the context up (consider moving that logic into the context)"],
      pros: ["Removes duplicated `switch (status)` blocks", "Each state's behaviour is localised and testable", "Invalid operations are explicit per state", "Adding states doesn't touch other states much (OCP)", "Maps directly from a state diagram"],
      cons: ["Many small classes for simple machines", "Transitions spread across classes (hard to see the whole machine)", "States may need package-private access to the context", "Persisting state objects needs a mapping to enum/strings"] },
    compare: [
      ["Strategy (F17)", "Interchangeable algorithm chosen from outside", "Same shape. In State, the state objects themselves switch the context to the next state; strategies don't know each other and are chosen by the client"],
      ["Enum + switch", "Simple branching", "Fine for small, stable machines; State scales better when each state has rich behaviour"],
      ["Command (F19)", "Request as an object", "Events driving a state machine are often command objects"],
      ["Memento (F26)", "Snapshot and restore", "Can capture a machine's state for undo or checkpoints"],
      ["Flyweight (F16) / Singleton (F05)", "Share instances", "Stateless state objects are usually shared singletons"]],
    widget: { heading: "Interactive: drive the vending machine", caption: "Press buttons in any order. The highlighted state in the diagram is the current state object; invalid actions are rejected by that state.", render: vendingWidget },
    pitfalls: [
      "Keeping the old `switch (status)` alongside state classes (two sources of truth)",
      "Context methods that check the state themselves instead of delegating",
      "Storing per-entity data in shared singleton state objects",
      "Forgetting to handle an event in some state (silent no-op instead of a clear rejection)",
      "Transitions not atomic under concurrency (two threads both move from PAID)",
      "No audit of transitions, making production debugging guesswork",
      "Side effects (refunds, emails) fired before the transition is committed",
      "Using State when only the transition rules matter (a table is simpler and reviewable)"
    ],
    quiz: [
      { q: "What is State's intent?", options: ["Choose an algorithm from outside", "Let an object change its behaviour when its internal state changes, as if it changed class", "Save and restore state", "Notify dependents"], answer: 1, why: "Behaviour follows the current state object." },
      { q: "The clearest smell for State:", options: ["Long parameter lists", "The same `switch (status)` repeated in many methods", "A deep inheritance tree", "Many getters"], answer: 1, why: "Each case becomes a state class." },
      { q: "In the GoF State pattern, who usually changes the context's state?", options: ["The client", "The concrete state objects (or a central transition table)", "The garbage collector", "A singleton"], answer: 1, why: "States know their successors; clients just send events." },
      { q: "State vs Strategy?", options: ["Same", "Same shape, but states transition among themselves as events arrive; strategies are chosen externally and don't know each other", "Strategy changes on events", "State is creational"], answer: 1, why: "Inside vs outside control." },
      { q: "A vending machine in `Dispensing` receives `insertCoin`. Best behaviour?", options: ["Add to balance", "Reject and return the coin (explicit per-state handling)", "Crash", "Switch to Idle"], answer: 1, why: "Each state defines valid and invalid events." },
      { q: "Two API calls try to transition the same order. The safe approach is…", options: ["Hope for the best", "Conditional update `WHERE status = expected` (or optimistic locking) and check affected rows", "Use a static variable", "Cache the state"], answer: 1, why: "Make transitions atomic in the store." },
      { q: "When is an enum + transition table preferable to state classes?", options: ["Never", "When behaviour per state is small and the rules are the main content (order lifecycles)", "When states have rich behaviour", "When there's only one state"], answer: 1, why: "Centralised, reviewable rules." },
      { q: "Can state objects be singletons?", options: ["No", "Yes, if they're stateless and data lives in the context", "Only in Spring", "Only enums"], answer: 1, why: "Share them like flyweights." }
    ],
    cheatsheet: {
      table: [
        ["Part", "Role", "Vending example"],
        ["Context", "public API, data, current state", "`VendingMachine`"],
        ["State", "one method per event", "`insertCoin`, `select`, `cancel`, `itemTaken`"],
        ["Concrete states", "behaviour + transitions", "`Idle`, `HasMoney`, `Dispensing`, `SoldOut`"],
        ["Transition", "replace current state", "`m.setState(HasMoney.I)`"]],
      cards: [
        { title: "Steps in an interview", items: ["Draw the state diagram", "List events × states", "Pick classes or a table", "Reject invalid events explicitly", "Discuss concurrency + persistence"] },
        { title: "Classic problems", items: ["Vending machine", "ATM", "Elevator car", "Traffic light", "Order / booking lifecycle", "Document workflow"] },
        { title: "Production", items: ["Status column + conditional update", "Transition audit table", "Side effects after commit", "Spring State Machine"] }]
    },
    practice: [
      { level: "Easy", q: "Define State, draw its structure, and explain how it differs from Strategy in one sentence.",
        a: ["State lets an object change behaviour when its internal state changes by delegating to a current state object; states switch the context to the next state.",
          "Structure: Context (holds current state, delegates), State interface (one method per event), ConcreteStates.",
          "Strategy is chosen from outside and stays put; State objects replace each other from inside as events arrive."],
        m: H.cd(["classDiagram",
          "  class Context { -State current; +request(); ~setState(State s) }",
          "  class State { <<interface>>; +handle(Context c) }",
          "  Context o-- State",
          "  State <|.. StateA", "  State <|.. StateB", "  State <|.. StateC",
          "  StateA ..> StateB : transitions to"]) },
      { level: "Easy", q: "Traffic light: Green (30 s) → Yellow (5 s) → Red (30 s) → Green. A pedestrian button pressed during Green shortens it to 10 s remaining; pressing during other states does nothing. Implement with State.",
        code: `interface Light { Light next(); int seconds(); default Light pedestrian(int remaining, int[] out) { out[0] = remaining; return this; } }
enum Green implements Light { I;
    public Light next() { return Yellow.I; } public int seconds() { return 30; }
    public Light pedestrian(int remaining, int[] out) { out[0] = Math.min(remaining, 10); return this; }
}
enum Yellow implements Light { I; public Light next() { return Red.I; } public int seconds() { return 5; } }
enum Red implements Light { I; public Light next() { return Green.I; } public int seconds() { return 30; } }

class Signal {
    Light state = Green.I; int remaining = Green.I.seconds();
    void tick(int s) { remaining -= s; while (remaining <= 0) { state = state.next(); remaining += state.seconds(); System.out.println("  -> " + state.getClass().getSimpleName()); } }
    void press() { int[] r = {remaining}; state = state.pedestrian(remaining, r); remaining = r[0]; }
}

Signal sig = new Signal();
sig.tick(5); sig.press(); System.out.println("after press in green: " + sig.remaining + " s left");
sig.tick(10);
sig.press(); System.out.println("press in " + sig.state.getClass().getSimpleName() + ": " + sig.remaining + " s left (unchanged)");
sig.tick(35);`,
        follow: "Enums implementing an interface are a neat way to get singleton, stateless state objects." },
      { level: "Medium", q: "Media player: `Stopped`, `Playing`, `Paused` with `play()`, `pause()`, `stop()`. `play()` in Paused resumes from the position; `stop()` resets to 0; `pause()` in Stopped is ignored. Implement it.",
        code: `class Player {
    PlayerState state = new Stopped(); int position;
    void play() { state.play(this); } void pause() { state.pause(this); } void stop() { state.stop(this); }
    void tick(int s) { if (state instanceof Playing) position += s; }
    public String toString() { return state.getClass().getSimpleName() + "@" + position + "s"; }
}
interface PlayerState { void play(Player p); void pause(Player p); void stop(Player p); }
class Stopped implements PlayerState {
    public void play(Player p) { p.position = 0; p.state = new Playing(); }
    public void pause(Player p) { }                                       // ignored
    public void stop(Player p) { }
}
class Playing implements PlayerState {
    public void play(Player p) { }
    public void pause(Player p) { p.state = new Paused(); }
    public void stop(Player p) { p.position = 0; p.state = new Stopped(); }
}
class Paused implements PlayerState {
    public void play(Player p) { p.state = new Playing(); }               // resume from position
    public void pause(Player p) { }
    public void stop(Player p) { p.position = 0; p.state = new Stopped(); }
}

Player pl = new Player();
pl.pause(); System.out.println(pl);
pl.play(); pl.tick(42); pl.pause(); pl.tick(10); System.out.println(pl);
pl.play(); pl.tick(8); System.out.println(pl);
pl.stop(); System.out.println(pl);` },
      { level: "Medium", q: "Refactor: a `Booking` class has `switch (status)` in `confirm()`, `cancel()`, `checkIn()`, `checkOut()` and `refund()` with 6 statuses. Walk through the refactor and what tests you'd write first.",
        a: ["First write characterisation tests: for each (status, method) pair, assert the resulting status and side effects (a 6 × 5 table test).",
          "Draw the state diagram from the existing code; you'll often find inconsistent rules (refund allowed after check-out in one method but not another). Decide the intended behaviour with the business.",
          "Create `BookingState` with the 5 methods (defaults reject with `IllegalStateException`), and one class per status; move each `case` body into its state.",
          "`Booking` keeps the data and `setState`; persist the status enum and map back with `BookingState.of(status)`.",
          "Delete the `switch` blocks; the table test must still pass. Add transition auditing while you're there."] },
      { level: "Medium", q: "Elevator car: model its states and events. Which logic belongs to the car's states, and which to a dispatch strategy?",
        a: ["Car states: `Idle`, `MovingUp`, `MovingDown`, `DoorsOpen`, `Maintenance`.",
          "Events: `requestStop(floor)`, `arrivedAt(floor)`, `doorTimerExpired`, `obstruction`, `enterMaintenance`.",
          "`MovingUp.arrivedAt(f)`: if `f` is a stop, go to `DoorsOpen`; else keep moving. `DoorsOpen.doorTimerExpired`: if stops above (and was going up), `MovingUp`; else if stops below, `MovingDown`; else `Idle`. `obstruction` in `DoorsOpen` restarts the timer.",
          "Which car serves a hall call (nearest, least loaded) is a **Strategy** in the controller (F17), not a state concern.",
          "Concurrency: each car processes events on its own thread/queue so state changes are serialised."],
        m: M(["stateDiagram-v2",
          "  [*] --> Idle",
          "  Idle --> MovingUp : stop above",
          "  Idle --> MovingDown : stop below",
          "  MovingUp --> DoorsOpen : arrived at stop",
          "  MovingDown --> DoorsOpen : arrived at stop",
          "  DoorsOpen --> MovingUp : timer, stops above",
          "  DoorsOpen --> MovingDown : timer, stops below",
          "  DoorsOpen --> Idle : timer, no stops",
          "  Idle --> Maintenance : operator",
          "  Maintenance --> Idle : operator"]) },
      { level: "Medium", q: "Movie seat booking: a seat goes Available → Held (10-minute timer) → Booked, or back to Available when the hold expires or payment fails. How do you implement holds safely with many concurrent users?",
        a: ["States per seat-show: `AVAILABLE`, `HELD(by user, until)`, `BOOKED`. A table approach is enough; behaviour is small.",
          "Hold atomically: `UPDATE seats SET status='HELD', held_by=?, held_until=now()+10m WHERE show=? AND seat IN (...) AND status='AVAILABLE'`; succeed only if all rows updated (inside a transaction), otherwise roll back.",
          "Expiry: treat `HELD` with `held_until < now()` as available in queries (lazy expiry), plus a sweeper job; or keep holds in Redis with TTL.",
          "Book: `UPDATE ... SET status='BOOKED' WHERE status='HELD' AND held_by=? AND held_until > now()` after payment succeeds; if payment succeeds but the hold expired, refund (compensation).",
          "Never let the UI decide state; the database row is the source of truth."] },
      { level: "Hard", q: "Design the ride lifecycle for a ride-hailing app (requested, driver assigned, arriving, in progress, completed, cancelled by rider/driver, no-show). Include who can trigger which transition and what side effects run.",
        a: ["States: `REQUESTED → DRIVER_ASSIGNED → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED`, plus `CANCELLED_BY_RIDER`, `CANCELLED_BY_DRIVER`, `NO_SHOW`, `NO_DRIVER_FOUND`.",
          "Guards: only the rider cancels as rider; cancellation fee only if cancelled > 2 min after assignment; `NO_SHOW` only by the driver after waiting 5 min in `DRIVER_ARRIVED`; `startTrip` requires OTP.",
          "Side effects per transition: assignment notifies the rider; `DRIVER_CANCELLED` re-enters matching (back to `REQUESTED` with the driver excluded); `COMPLETED` triggers fare calculation (Strategy) and payment; cancellations may charge a fee.",
          "Implementation: enum + transition table with guard and action per row; transitions are conditional updates; events published (outbox) for notifications and analytics.",
          "Timeouts (no driver in 2 min) are scheduled events delivered to the same state machine."],
        m: M(["stateDiagram-v2",
          "  [*] --> Requested",
          "  Requested --> DriverAssigned : match found",
          "  Requested --> NoDriverFound : timeout",
          "  DriverAssigned --> DriverArrived : driver at pickup",
          "  DriverAssigned --> Requested : driver cancels",
          "  DriverAssigned --> CancelledByRider : rider cancels",
          "  DriverArrived --> InProgress : OTP verified",
          "  DriverArrived --> NoShow : 5 min wait",
          "  InProgress --> Completed : end trip"]) },
      { level: "Hard", q: "Your vending machine must now be safe when the coin acceptor and the keypad fire events from two different threads. What changes?",
        a: ["Serialise events per machine: one lock around `handle(event)` (`synchronized` methods on the context or a `ReentrantLock`), so a state's read-modify-write of balance and state is atomic.",
          "Or use an **event queue + single consumer thread** (actor style): threads only enqueue events; one thread applies them in order. No locks in state code, and ordering is explicit.",
          "Keep slow I/O (motor dispensing, network calls to a payment terminal) out of the critical section: transition to `Dispensing`, release the lock, then let the motor completion post `itemTaken`.",
          "Make `state` and balance visible across threads (guarded by the same lock, or confined to the consumer thread).",
          "Test with concurrent event storms and assert invariants (balance never negative, stock never below zero)."] }
    ],
    recap: [
      "State = the context delegates to a current state object; states implement behaviour per event and switch the context to the next state.",
      "It replaces repeated `switch (status)` blocks and maps one-to-one from a state diagram.",
      "Choose state classes for rich per-state behaviour, an enum + transition table when the rules are the main thing.",
      "In production: persist the status, make transitions atomic (conditional updates), audit them, and run side effects after commit.",
      "Classics: vending machine, ATM, elevator, traffic light, order/booking/ride lifecycles. State vs Strategy: inside vs outside control."
    ]
  });
})();
