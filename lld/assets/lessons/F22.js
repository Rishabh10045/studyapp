/* Lesson F22: Chain of Responsibility */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var APPROVERS = [["lead", "TeamLead", 10000], ["mgr", "Manager", 50000], ["dir", "Director", 200000], ["cfo", "CFO", 1000000]];
  var AMOUNTS = [4500, 32000, 150000, 800000, 2500000];
  function inr(n) { return "₹" + n.toLocaleString("en-IN"); }
  function chainWidget(el, ctx) {
    var s = ctx.state; if (s.a === undefined) { s.a = 1; s.off = {}; }
    el.innerHTML = "<p>" + ctx.md("An expense claim enters the chain at the first approver. Each handler either **approves** (within its limit) or **passes** the request to its `next`. Mark an approver as on leave to see them skip themselves, and try an amount nobody can approve.") + "</p>" +
      "<div class='field'>Claim amount</div><div class='seg' data-r='amt'></div>" +
      "<div class='field' style='margin-top:8px'>On leave (handler forwards without deciding)</div><div class='btnrow' data-r='off'></div>" +
      "<div class='diagram' data-r='dg'></div><pre class='code' data-r='log'></pre><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var amt = AMOUNTS[s.a];
      q("amt").innerHTML = AMOUNTS.map(function (v, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.a ? "on" : "") + "'>" + inr(v) + "</button>"; }).join("");
      q("off").innerHTML = APPROVERS.map(function (x) { return "<button type='button' class='btn" + (s.off[x[0]] ? " wrong" : "") + "' data-o='" + x[0] + "'>" + (s.off[x[0]] ? "✈ " : "") + x[1] + "</button>"; }).join("");
      var log = ["claim.amount = " + inr(amt)], handled = null, visited = [];
      for (var i = 0; i < APPROVERS.length; i++) {
        var x = APPROVERS[i]; visited.push(x[0]);
        if (s.off[x[0]]) { log.push(x[1] + ": on leave -> next.handle(claim)"); continue; }
        if (amt <= x[2]) { log.push(x[1] + ": limit " + inr(x[2]) + " -> APPROVED"); handled = x; break; }
        log.push(x[1] + ": limit " + inr(x[2]) + " too low -> next.handle(claim)");
      }
      if (!handled) log.push("end of chain: nobody handled it -> escalate to board / reject");
      var lines = ["flowchart LR", "  C([\"claim " + inr(amt) + "\"])"], prev = "C";
      APPROVERS.forEach(function (x) {
        var cls = handled && handled[0] === x[0] ? ":::s0" : s.off[x[0]] ? ":::s3" : visited.indexOf(x[0]) >= 0 ? ":::s2" : ":::s1";
        lines.push("  " + x[0] + "[\"<b>" + x[1] + "</b><br/><span class='d'>≤ " + inr(x[2]) + "</span>\"]" + cls);
        lines.push("  " + prev + " --> " + x[0]); prev = x[0];
      });
      lines.push("  " + prev + " --> E([\"unhandled\"])" + (handled ? "" : ":::s3"));
      lines.push("  classDef s0 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px", "  classDef s1 fill:#f5f5f5,stroke:#9e9e9e", "  classDef s2 fill:#fff3e0,stroke:#ef6c00", "  classDef s3 fill:#ffebee,stroke:#c62828");
      ctx.H.renderDiagram(q("dg"), lines.join("\n"));
      q("log").textContent = log.join("\n");
      var res = q("res");
      if (handled) { res.className = "result ok"; res.innerHTML = "<div class='out'>Approved by " + handled[1] + "</div><p>" + ctx.md("The sender only called `chain.handle(claim)`. It never knew who would decide.") + "</p>"; }
      else { res.className = "result err"; res.innerHTML = "<div class='out'>Fell off the end of the chain</div><p>" + ctx.md("Always decide what happens when nobody handles a request: a default handler at the end, an exception, or an explicit `Optional.empty()`.") + "</p>"; }
    }
    q("amt").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b) return; s.a = Number(b.getAttribute("data-i")); ctx.save(); draw(); });
    q("off").addEventListener("click", function (e) { var b = e.target.closest("button[data-o]"); if (!b) return; var k = b.getAttribute("data-o"); s.off[k] = !s.off[k]; ctx.save(); draw(); });
    draw();
  }
  H.pattern({
    code: "F22", name: "Chain of Responsibility",
    summary: "Chain of Responsibility passes a request along a chain of handlers; each handler either handles it or forwards it to the next. This lesson covers the classic handle-or-pass chain and the pipeline variant where every handler acts (servlet filters, middleware), a logger with levels, expense approvals, an ATM cash dispenser (frequently asked), an HTTP middleware pipeline with auth and rate limiting, building chains safely, JDK and Spring usages (`Filter`/`FilterChain`, Spring Security's filter chain, `HandlerInterceptor`, exception handlers), and how it differs from Decorator, Observer and Command.",
    intent: "Avoid coupling the sender of a request to its receiver by giving **more than one object a chance to handle** the request. Chain the receiving objects and pass the request along the chain **until an object handles it**.",
    problem: {
      text: "Expense claims need approval: team leads approve up to ₹10,000, managers up to ₹50,000, directors up to ₹2 lakh, the CFO above that. The first version is one method with an `if/else if` ladder that also checks who's on leave and which department has special limits. Every policy change edits the ladder, and the sender is coupled to every approver.",
      points: [
        "The sender shouldn't know **which** object will handle the request",
        "Each handler has one job: handle what it can, otherwise forward to `next`",
        "The chain is assembled outside the handlers, so order and membership change without code edits",
        "Variant: in a **pipeline**, every handler does something and decides whether to continue (filters, middleware)"],
      code: `String approve(long amount, boolean managerOnLeave) {
    if (amount <= 10_000) return "TeamLead";
    else if (amount <= 50_000 && !managerOnLeave) return "Manager";     // policy and availability tangled together
    else if (amount <= 200_000) return "Director";
    else if (amount <= 1_000_000) return "CFO";
    else return "nobody";
}
System.out.println(approve(32_000, false) + " " + approve(32_000, true) + " " + approve(5_000_000, false));` },
    analogy: "A customer-support escalation. Your complaint goes to a level-1 agent; if they can't resolve it, they pass it to level 2, then to a specialist, then to a manager. You (the sender) dialled one number and never chose who would fix it.",
    structure: {
      text: "**Handler** declares `handle(request)` and holds a reference to the **next** handler. **ConcreteHandlers** either process the request or call `next.handle(request)`. The **Client** builds the chain and sends requests to its head. An abstract base handler usually implements the forwarding so concrete handlers only decide `canHandle`/`process`.",
      m: H.cd(["classDiagram",
        "  class Approver { <<abstract>>; -Approver next; +linkWith(Approver n) Approver; +handle(Claim c) Decision; #canApprove(Claim c) boolean; #approve(Claim c) Decision }",
        "  class TeamLead", "  class Manager", "  class Director", "  class Cfo",
        "  class Client",
        "  Approver <|-- TeamLead", "  Approver <|-- Manager", "  Approver <|-- Director", "  Approver <|-- Cfo",
        "  Approver --> Approver : next",
        "  Client --> Approver : head"]),
      roles: [["Handler", "Interface/abstract class with `handle` and a `next` link"], ["Concrete handler", "Handles requests it's responsible for; forwards the rest"], ["Client", "Builds the chain, sends requests to the head"], ["Terminal behaviour", "What happens if nobody handles it (default handler, exception, empty result)"]],
      points: ["The self-referencing `Approver --> Approver : next` association is the visual signature", "Handlers should not know the concrete type of `next`"] },
    impl: {
      title: "Java implementation: a logger chain with levels",
      text: "Each logger handles messages at or above its level and, unlike the approval chain, **also forwards** them, so an ERROR goes to the console, the file and the pager. A boolean `stopHere` turns it into classic handle-or-pass. The abstract base implements forwarding once.",
      code: `enum Level { DEBUG, INFO, WARN, ERROR }
abstract class Logger {
    private Logger next; private final Level min;
    Logger(Level min) { this.min = min; }
    Logger then(Logger n) { this.next = n; return n; }                       // fluent chain building
    final void log(Level l, String msg) {
        if (l.compareTo(min) >= 0) write(l, msg);
        if (next != null) next.log(l, msg);                                    // pipeline style: always forward
    }
    protected abstract void write(Level l, String msg);
}
class ConsoleLogger extends Logger { ConsoleLogger(Level m) { super(m); } protected void write(Level l, String s) { System.out.println("  console  " + l + " " + s); } }
class FileLogger extends Logger {
    final List<String> lines = new ArrayList<>();
    FileLogger(Level m) { super(m); }
    protected void write(Level l, String s) { lines.add(l + " " + s); System.out.println("  file     " + l + " " + s); }
}
class PagerLogger extends Logger { PagerLogger(Level m) { super(m); } protected void write(Level l, String s) { System.out.println("  PAGER    wake up on-call: " + s); } }

Logger head = new ConsoleLogger(Level.DEBUG);
head.then(new FileLogger(Level.INFO)).then(new PagerLogger(Level.ERROR));
head.log(Level.DEBUG, "cache warmup took 120 ms");
head.log(Level.WARN, "payment retry #2");
head.log(Level.ERROR, "orders DB unreachable");` },
    variants: [
      { title: "Two flavours: handle-or-pass vs pipeline (filters, middleware)",
        text: "GoF's chain stops at the **first handler that handles** the request (approvals, event bubbling, exception handlers). Most frameworks use the **pipeline** flavour: every handler gets a turn, may act **before and after** the rest of the chain, and may **short-circuit** (reject) by not calling `next`. Servlet filters, Spring Security, Express/Koa middleware and gRPC interceptors all work this way.",
        table: [
          ["", "Handle-or-pass (GoF)", "Pipeline / middleware"],
          ["Who acts", "exactly one handler (or none)", "every handler, in order"],
          ["Continue?", "only if this handler can't handle it", "by default, unless a handler short-circuits"],
          ["Before/after", "no", "yes: code before and after `chain.next()`"],
          ["Examples", "approvals, ATM denominations (partial), UI event bubbling, `@ExceptionHandler` resolution", "servlet `Filter`, Spring Security, `HandlerInterceptor`, OkHttp interceptors"]],
        code: `record Ctx(Map<String, String> headers, List<String> trace) {}
interface Middleware {
    String apply(Ctx c, java.util.function.Function<Ctx, String> next);
    static java.util.function.Function<Ctx, String> build(List<Middleware> ms, java.util.function.Function<Ctx, String> handler) {
        java.util.function.Function<Ctx, String> chain = handler;
        for (int i = ms.size() - 1; i >= 0; i--) { Middleware m = ms.get(i); java.util.function.Function<Ctx, String> next = chain; chain = c -> m.apply(c, next); }
        return chain;                                                          // wrapped inside-out: first middleware runs first
    }
}

Middleware timing = (c, next) -> { c.trace().add("timing:start"); String r = next.apply(c); c.trace().add("timing:end"); return r; };
Middleware auth = (c, next) -> c.headers().containsKey("Authorization") ? next.apply(c) : "401 Unauthorized";   // short-circuit
Middleware gzip = (c, next) -> next.apply(c) + " [gzipped]";                                                     // acts after
var app = Middleware.build(List.of(timing, auth, gzip), c -> { c.trace().add("handler"); return "200 OK"; });

Ctx ok = new Ctx(Map.of("Authorization", "Bearer t"), new ArrayList<>());
System.out.println(app.apply(ok) + "  " + ok.trace());
Ctx anon = new Ctx(Map.of(), new ArrayList<>());
System.out.println(app.apply(anon) + "  " + anon.trace());`,
        points: [
          "Order matters: authentication before authorisation before rate limiting per user; post-processing such as compression runs on the way back out, after `next` returns",
          "A pipeline handler that forgets to call `next` silently drops the request: make that a deliberate, logged decision"] },
      { title: "Building chains safely",
        text: "The chain's shape is configuration, so build it in one place and validate it. Linked `next` pointers are the textbook form; in modern Java a `List<Handler>` iterated by a small runner is often simpler, easier to reorder, and avoids recursion depth issues.",
        code: `interface Handler<T, R> { Optional<R> tryHandle(T request); }
final class Chain<T, R> {
    private final List<Handler<T, R>> handlers;
    private final java.util.function.Function<T, R> fallback;
    Chain(List<Handler<T, R>> hs, java.util.function.Function<T, R> fallback) { handlers = List.copyOf(hs); this.fallback = fallback; }
    R handle(T req) {
        for (Handler<T, R> h : handlers) { Optional<R> r = h.tryHandle(req); if (r.isPresent()) return r.get(); }
        return fallback.apply(req);                                    // explicit end-of-chain behaviour
    }
}

Chain<Integer, String> support = new Chain<>(List.of(
    t -> t <= 1 ? Optional.of("bot answered FAQ") : Optional.empty(),
    t -> t <= 3 ? Optional.of("L1 agent resolved") : Optional.empty(),
    t -> t <= 5 ? Optional.of("L2 specialist resolved") : Optional.empty()),
    t -> "escalated to engineering (severity " + t + ")");
for (int sev : new int[]{1, 3, 5, 8}) System.out.println("sev " + sev + ": " + support.handle(sev));`,
        points: [
          "Guard against **cycles** when linking manually (A → B → A loops forever)",
          "Always define end-of-chain behaviour: fallback handler, exception, or empty `Optional`",
          "Log which handler handled the request (debugging chains is otherwise painful)",
          "Make handlers stateless so one chain instance can serve concurrent requests"] }
    ],
    designs: [
      { title: "Mini LLD: ATM cash dispenser (frequently asked)",
        text: "Dispense an amount using the fewest notes from ₹2000, ₹500, ₹200 and ₹100 cassettes, respecting how many notes each cassette holds. Each denomination is a handler: it dispenses as many of its notes as it can (bounded by stock) and passes the **remainder** to the next. Unlike the approval chain, several handlers contribute. If a remainder is left at the end, the transaction must be rejected **without** having removed any notes.",
        points: [
          "Two phases: **plan** (walk the chain, compute notes per cassette without mutating) then **commit** (deduct stock) only if the plan covers the full amount",
          "Greedy largest-first works for Indian denominations when stock is unlimited; with limited stock it can fail even when a solution exists (₹600 with no ₹100s: greedy takes ₹500 and is stuck with ₹100, while 3 × ₹200 works). Mention backtracking/DP as the fix",
          "Amount validation (multiple of 100, ≤ per-transaction limit) is a separate handler at the head",
          "New denomination (₹50) = new handler inserted in order",
          "Thread safety: one dispense at a time per ATM (lock around plan + commit)"],
        m: H.cd(["classDiagram",
          "  class CashDispenser { <<abstract>>; #CashDispenser next; +plan(int amount, Map~Integer,Integer~ out) int }",
          "  class NoteDispenser { -int denomination; -int count; +plan(int amount, Map out) int; +commit(int notes) }",
          "  class Atm { -CashDispenser head; +withdraw(int amount) Map~Integer,Integer~ }",
          "  CashDispenser <|-- NoteDispenser",
          "  CashDispenser --> CashDispenser : next",
          "  Atm --> CashDispenser : head"]),
        code: `class NoteDispenser {
    final int note; int count; NoteDispenser next;
    NoteDispenser(int note, int count) { this.note = note; this.count = count; }
    NoteDispenser then(NoteDispenser n) { next = n; return n; }
    int plan(int amount, Map<Integer, Integer> out) {                          // returns the remainder nobody could cover
        int use = Math.min(amount / note, count);
        if (use > 0) out.put(note, use);
        int rest = amount - use * note;
        return rest == 0 || next == null ? rest : next.plan(rest, out);
    }
    void commit(Map<Integer, Integer> plan) { count -= plan.getOrDefault(note, 0); if (next != null) next.commit(plan); }
    String stock() { return note + "x" + count + (next == null ? "" : " " + next.stock()); }
}
class Atm {
    private final NoteDispenser head;
    Atm(NoteDispenser head) { this.head = head; }
    synchronized Map<Integer, Integer> withdraw(int amount) {
        if (amount <= 0 || amount % 100 != 0) throw new IllegalArgumentException("amount must be a positive multiple of ₹100");
        Map<Integer, Integer> plan = new LinkedHashMap<>();
        int left = head.plan(amount, plan);
        if (left != 0) throw new IllegalStateException("cannot dispense ₹" + amount + " with available notes (short by ₹" + left + ")");
        head.commit(plan);                                                    // only now take notes out
        return plan;
    }
}

NoteDispenser h = new NoteDispenser(2000, 2);
h.then(new NoteDispenser(500, 3)).then(new NoteDispenser(200, 5)).then(new NoteDispenser(100, 0));
Atm atm = new Atm(h);
System.out.println("₹5,700 -> " + atm.withdraw(5_700) + "   left: " + h.stock());
try { atm.withdraw(300); } catch (IllegalStateException e) { System.out.println(e.getMessage() + "   left: " + h.stock()); }
try { atm.withdraw(250); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }` },
      { title: "Mini LLD: configurable expense approvals",
        text: "Approval limits differ per department and change every quarter; approvers go on leave; claims over ₹1 lakh in Travel also need Finance review. Approvers are handlers built from a **policy config**; each knows its limit and can delegate to a nominee when on leave. A final `Board` handler catches anything above the CFO's limit, so no claim falls off the chain.",
        points: [
          "`ApprovalChainFactory.forDepartment(dept)` builds the chain from config: `[(TEAM_LEAD, 10k), (MANAGER, 50k), (DIRECTOR, 2L), (CFO, 10L), (BOARD, ∞)]`",
          "`Approver.handle(claim)`: if on leave → delegate or skip to next; if `amount ≤ limit` → create an `ApprovalTask` for that person; else forward",
          "Extra rules (Travel > ₹1L needs Finance) are another handler inserted by config, not an `if` inside Manager",
          "Approval is asynchronous: the chain decides **who** must approve; a workflow (State, F20) tracks pending/approved/rejected",
          "Audit every hop: who skipped, who delegated, who received the task"],
        m: M(["flowchart LR",
          "  C([\"Claim ₹1.4L, Travel\"]) --> TL[\"<b>TeamLead</b><br/><span class='d'>≤ ₹10k: forward</span>\"]:::s1",
          "  TL --> MG[\"<b>Manager</b><br/><span class='d'>on leave: skip, log</span>\"]:::bad",
          "  MG --> FIN[\"<b>FinanceReview</b><br/><span class='d'>Travel &gt; ₹1L: add task, continue</span>\"]:::s2",
          "  FIN --> DR[\"<b>Director</b><br/><span class='d'>≤ ₹2L: APPROVER</span>\"]:::s0",
          "  DR -.-> CFO[\"<b>CFO</b>\"]:::s1",
          "  CFO -.-> BD[\"<b>Board</b><br/><span class='d'>catch-all</span>\"]:::s1"]) }
    ],
    usages: [
      ["`javax.servlet.Filter` + `FilterChain.doFilter`", "Each filter does work before/after and calls `chain.doFilter` to continue, or short-circuits (pipeline flavour)."],
      ["Spring Security `SecurityFilterChain`", "An ordered chain of filters (CSRF, authentication, exception translation, authorisation); the first matching chain handles the request."],
      ["Spring MVC `HandlerInterceptor`, `HandlerExceptionResolver`s", "Interceptors wrap handler execution; exception resolvers are tried in order until one handles the exception (handle-or-pass)."],
      ["`java.util.logging.Logger` parent handlers", "A record is published to a logger's handlers, then to its parent's (`useParentHandlers`)."],
      ["Java exception handling itself", "An exception propagates up the call stack until a matching `catch` handles it."],
      ["OkHttp `Interceptor`, gRPC `ClientInterceptor`, Netty `ChannelPipeline`", "Request/response pipelines where each handler may modify, short-circuit or pass along."],
      ["DOM/Swing event bubbling", "An event goes from the target up through its parents until handled or consumed."]
    ],
    avoid: {
      points: [
        "Exactly one known receiver: call it directly",
        "Every request must be handled by a guaranteed handler and the order is trivial: a lookup map (`Map<Type, Handler>`) is faster and clearer than walking a chain",
        "Handlers depend on each other's results in complex ways: use an explicit workflow/orchestrator",
        "Long chains on hot paths where most requests travel to the end (O(n) per request)",
        "When you need all interested parties notified rather than one handler: that's Observer"],
      pros: ["Decouples sender from receivers", "Add, remove or reorder handlers by configuration (OCP)", "Each handler has a single responsibility", "Pipelines give clean cross-cutting concerns (auth, logging, rate limits)"],
      cons: ["No guarantee a request is handled unless you add a terminal handler", "Harder to debug: which handler did what?", "Order-dependent bugs", "Performance cost for long chains", "A handler forgetting to forward silently drops requests"] },
    compare: [
      ["Decorator (F11)", "Add behaviour around one object, same interface", "Structurally very close to pipeline chains; Decorator always delegates and doesn't decide whether to handle, while a chain handler may stop the request"],
      ["Observer (F18)", "Notify all subscribers", "Observer broadcasts to every observer; a classic chain stops at the first handler"],
      ["Command (F19)", "Request as an object", "The request travelling down a chain is often a command object"],
      ["Composite (F14)", "Tree of objects", "Event bubbling walks a composite from child to parent: a chain formed by parent links"],
      ["Strategy (F17)", "Pick one algorithm up front", "A chain discovers the handler at runtime by asking each one; a strategy is chosen before the call"]],
    widget: { heading: "Interactive: route an expense claim", caption: "Pick an amount and mark approvers on leave. Watch the claim travel down the chain until someone approves it, or fall off the end.", render: chainWidget },
    pitfalls: [
      "No end-of-chain behaviour: requests silently vanish",
      "Pipeline handler forgets to call `next` (or calls it twice)",
      "Wrong order (rate limiting before authentication means anonymous traffic shares one bucket)",
      "Cycles when linking handlers manually",
      "Stateful handlers shared across concurrent requests",
      "Handlers that inspect `next`'s concrete type or reach into other handlers",
      "Mutating the request in surprising ways deep in the chain",
      "ATM-style chains that mutate stock before knowing the whole request can be satisfied"
    ],
    quiz: [
      { q: "What is Chain of Responsibility's intent?", options: ["Notify all subscribers", "Pass a request along a chain of handlers until one handles it, decoupling sender from receiver", "Share state", "Undo requests"], answer: 1, why: "Sender doesn't know the receiver." },
      { q: "Servlet filters are which flavour?", options: ["Handle-or-pass", "Pipeline: each filter acts and calls `chain.doFilter` to continue (or short-circuits)", "Observer", "Singleton"], answer: 1, why: "Every filter gets a turn, before and after." },
      { q: "What should happen when no handler handles a request?", options: ["Undefined", "A deliberate end-of-chain behaviour: default handler, exception, or empty result", "Infinite loop", "Restart the chain"], answer: 1, why: "Make it explicit." },
      { q: "ATM dispensing: why plan before committing?", options: ["Speed", "So no notes are removed if the remaining amount can't be covered", "Java requires it", "To sort notes"], answer: 1, why: "Atomicity of the withdrawal." },
      { q: "Chain vs Observer?", options: ["Same", "Chain usually stops at one handler; Observer notifies every observer", "Observer stops early", "Chain is creational"], answer: 1, why: "One vs all." },
      { q: "Correct order for API middleware?", options: ["Rate-limit, then authenticate", "Authenticate, then authorise/rate-limit per user, then handler", "Handler first", "Order doesn't matter"], answer: 1, why: "Per-user decisions need the user's identity." },
      { q: "Exception propagation up the call stack is an example of…", options: ["Strategy", "Chain of Responsibility (each frame's catch may handle or let it pass)", "Builder", "Flyweight"], answer: 1, why: "Handled by the first matching catch." },
      { q: "Greedy note dispensing with limited cassette stock can…", options: ["Never fail", "Fail even though a valid combination exists (e.g. ₹600 with no ₹100s: 500 first leaves 100)", "Dispense extra", "Deadlock"], answer: 1, why: "Mention backtracking or DP as the robust approach." }
    ],
    cheatsheet: {
      table: [
        ["Part", "Role", "Example"],
        ["Handler", "`handle(req)` + `next`", "`Approver`, `Logger`, `Filter`"],
        ["Concrete handler", "handle or forward", "`Manager`, `NoteDispenser(500)`"],
        ["Client", "builds chain, calls head", "`ApprovalChainFactory`"],
        ["Terminal", "end-of-chain behaviour", "`Board`, fallback, exception"]],
      cards: [
        { title: "Flavours", items: ["Handle-or-pass (approvals, exceptions)", "Pipeline (filters, middleware)", "Partial handling (ATM notes)"] },
        { title: "Get it right", items: ["Explicit end of chain", "Order is config", "Stateless handlers", "Plan then commit", "Log the handler"] },
        { title: "Interview classics", items: ["Logger levels", "Expense approvals", "ATM cash dispenser", "Support escalation", "Request middleware"] }]
    },
    practice: [
      { level: "Easy", q: "Define Chain of Responsibility and give three real examples.",
        a: ["A request is passed along a chain of handler objects; each either handles it or forwards it to the next. The sender only knows the head of the chain.",
          "Examples: servlet filters / Spring Security filter chain, exception propagation up the call stack, logger level handlers, expense approvals, customer-support escalation (L1 → L2 → L3), DOM event bubbling."] },
      { level: "Easy", q: "What are the two common flavours of the pattern and how do they differ?",
        a: ["**Handle-or-pass** (classic GoF): exactly one handler handles the request and the chain stops (approvals, exception handlers).",
          "**Pipeline / middleware**: every handler gets a turn, can act before and after the next, and can short-circuit (servlet filters, OkHttp interceptors, Express/Koa middleware).",
          "A third, **partial handling**, appears in the ATM dispenser: each handler handles part of the request and forwards the rest."] },
      { level: "Medium", q: "Design a logger with levels DEBUG < INFO < ERROR where the console gets everything ≥ DEBUG, a file gets ≥ INFO, and a pager gets ERROR only.",
        code: `enum Level { DEBUG, INFO, ERROR }
abstract class Logger {
    private final Level min; private Logger next;
    Logger(Level min) { this.min = min; }
    Logger then(Logger n) { next = n; return n; }
    final void log(Level l, String msg) {
        if (l.compareTo(min) >= 0) write(l, msg);
        if (next != null) next.log(l, msg);                                    // every logger sees it
    }
    protected abstract void write(Level l, String msg);
}
class Console extends Logger { Console() { super(Level.DEBUG); } protected void write(Level l, String m) { System.out.println("console " + l + ": " + m); } }
class FileLog extends Logger { FileLog() { super(Level.INFO); } protected void write(Level l, String m) { System.out.println("file    " + l + ": " + m); } }
class Pager   extends Logger { Pager()   { super(Level.ERROR); } protected void write(Level l, String m) { System.out.println("PAGER   " + l + ": " + m); } }

Logger log = new Console(); log.then(new FileLog()).then(new Pager());
log.log(Level.DEBUG, "cache miss"); log.log(Level.INFO, "order placed"); log.log(Level.ERROR, "payment gateway down");`,
        follow: "This is the pipeline flavour (all loggers see every record). Real frameworks (Logback, JUL) model it as appenders/handlers attached to a logger hierarchy, with a parent chain and additivity flag." },
      { level: "Medium", q: "Design an ATM cash dispenser for ₹2000/₹500/₹200/₹100 notes. What goes wrong with a naive chain?",
        a: ["Each denomination is a handler: dispense `min(amount / note, stock)` notes and pass the remainder.",
          "Naive bug 1: decrementing stock while walking the chain, then discovering a remainder at the end: notes are lost. Fix: plan first, commit only if remainder = 0.",
          "Naive bug 2: greedy can fail with limited stock even when a combination exists (₹600 with ₹500 ×1, ₹200 ×3, ₹100 ×0: greedy takes 500, leaves 100). Fix: when greedy fails, backtrack (try fewer of the larger note) or use bounded-coin DP.",
          "Validate up front (multiple of ₹100, daily limit, balance) as the first handler(s). Lock the ATM during plan + commit."],
        m: M(["flowchart LR", "  R([\"₹5,700\"]) --> A[\"₹2000 ×2<br/>rest 1,700\"]", "  A --> B[\"₹500 ×3<br/>rest 200\"]", "  B --> C[\"₹200 ×1<br/>rest 0\"]", "  C --> D[\"₹100<br/>not needed\"]"]) },
      { level: "Medium", q: "Implement a middleware pipeline (auth → rate limit → handler) where any step can short-circuit with an HTTP status.",
        code: `record Req(String user, String path) {}
interface Middleware { String handle(Req r, Function<Req, String> next); }

Middleware auth = (r, next) -> r.user() == null ? "401 Unauthorized" : next.apply(r);
Map<String, Integer> hits = new HashMap<>();
Middleware rateLimit = (r, next) -> hits.merge(r.user(), 1, Integer::sum) > 2 ? "429 Too Many Requests" : next.apply(r);
Function<Req, String> app = r -> "200 OK " + r.path() + " for " + r.user();

List<Middleware> chain = List.of(auth, rateLimit);
Function<Req, String> pipeline = app;
for (int i = chain.size() - 1; i >= 0; i--) {                                  // wrap from the inside out
    Middleware m = chain.get(i); Function<Req, String> inner = pipeline;
    pipeline = r -> m.handle(r, inner);
}
for (Req r : List.of(new Req(null, "/orders"), new Req("asha", "/orders"), new Req("asha", "/cart"), new Req("asha", "/pay")))
    System.out.println(pipeline.apply(r));`,
        follow: "Order matters: authentication first so rate limits are per user. Note that `auth` rejecting anonymous calls means they never reach (or count against) the limiter." },
      { level: "Medium", q: "How do you guarantee a request is always handled (or at least never silently dropped)?",
        a: ["Add a **terminal handler** at the end: a default handler (Board approves anything), a fallback response, or one that throws `UnhandledRequestException`.",
          "Make the base class's `forward` method handle `next == null` explicitly instead of each subclass doing a null check.",
          "Return a result type (`Optional`, `Result`) from the chain so the client must deal with \"not handled\".",
          "Log/audit each hop and alert on end-of-chain hits."] },
      { level: "Hard", q: "Customer support escalation: tickets go L1 bot → L1 agent → L2 → L3 engineering by severity and whether the earlier level could resolve. Agents are on shifts. Outline the design.",
        a: ["`SupportHandler { boolean canHandle(Ticket); void assign(Ticket); SupportHandler next; }`, with implementations `BotHandler` (FAQ match), `AgentHandler(level)`, `EngineeringHandler`.",
          "`canHandle` checks severity, category skills and **availability** (on-shift agents with capacity via a `RosterService`). Unavailable → forward.",
          "Escalation after failure: when an agent marks a ticket unresolved, the ticket re-enters the chain **after** that handler (`handler.next.handle(t)`); keep the escalation history on the ticket.",
          "SLA timers (Observer/scheduler) auto-escalate tickets stuck too long.",
          "Chain built from config per product line; `Ticket` state (open → assigned → escalated → resolved) is a State machine (F20).",
          "Terminal handler: on-call manager page so nothing is lost."],
        m: H.cd(["classDiagram",
          "  class SupportHandler { <<abstract>>; #SupportHandler next; +handle(Ticket t); #canHandle(Ticket t) boolean; #assign(Ticket t) }",
          "  class BotHandler", "  class AgentHandler { -int level; -RosterService roster }", "  class EngineeringHandler", "  class OnCallManager",
          "  SupportHandler <|-- BotHandler", "  SupportHandler <|-- AgentHandler", "  SupportHandler <|-- EngineeringHandler", "  SupportHandler <|-- OnCallManager",
          "  SupportHandler --> SupportHandler : next"]) },
      { level: "Hard", q: "Chain of Responsibility vs Decorator: both are linked lists of objects that delegate. How do you tell them apart in an interview?",
        a: ["**Intent**: Decorator adds responsibilities to one object while keeping its interface; the result is \"the same thing, but more\". Chain finds **who** should handle a request.",
          "**Delegation**: a decorator always delegates to the wrapped object; a chain handler may stop the request (handle it or reject it).",
          "**Return value**: decorators usually transform the result of the wrapped call; classic chain handlers return whether/what they handled.",
          "Pipeline middleware sits in between: each middleware wraps the next like a decorator but can short-circuit like a chain. Name both and explain.",
          "Examples: `BufferedInputStream(new FileInputStream(...))` is Decorator; Spring Security's filter chain is Chain."] }
    ],
    recap: [
      "Chain of Responsibility passes a request along linked handlers; the sender knows only the head.",
      "Flavours: handle-or-pass (approvals, exceptions), pipeline/middleware (filters, interceptors), partial handling (ATM).",
      "Always define end-of-chain behaviour, keep handlers stateless, and treat order as configuration.",
      "ATM dispenser: plan through the chain, commit only if fully covered; mention greedy's limits with bounded stock.",
      "JDK/Spring: servlet `FilterChain`, Spring Security filters, `HandlerInterceptor`, exception resolvers, JUL parent handlers."
    ]
  });
})();
