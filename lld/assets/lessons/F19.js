/* Lesson F19: Command */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var ACTIONS = [
    { id: "type", label: "Type \" world\"", cmd: "new InsertText(doc, doc.length(), \" world\")", run: function (d) { return { doc: d + " world", undo: "delete 6 chars at " + d.length, prev: d }; } },
    { id: "excl", label: "Type \"!\"", cmd: "new InsertText(doc, doc.length(), \"!\")", run: function (d) { return { doc: d + "!", undo: "delete 1 char at " + d.length, prev: d }; } },
    { id: "upper", label: "Uppercase all", cmd: "new UppercaseAll(doc)", run: function (d) { return { doc: d.toUpperCase(), undo: "restore saved text \"" + d + "\"", prev: d }; } },
    { id: "del", label: "Delete last word", cmd: "new DeleteLastWord(doc)", run: function (d) { var i = d.lastIndexOf(" "); var nd = i < 0 ? "" : d.slice(0, i); return { doc: nd, undo: "re-insert \"" + d.slice(nd.length) + "\" at " + nd.length, prev: d }; } }
  ];
  function editorWidget(el, ctx) {
    var s = ctx.state; if (!s.doc && s.doc !== "") { s.doc = "Hello"; s.undo = []; s.redo = []; }
    el.innerHTML = "<p>" + ctx.md("Each button creates a **command object** and passes it to the `History` (the invoker), which calls `execute()` and pushes it on the undo stack. **Undo** pops a command and calls its `undo()`; **Redo** re-executes it. Executing a new command clears the redo stack.") + "</p>" +
      "<div class='btnrow' data-r='acts'></div><div class='btnrow'><button type='button' class='btn' data-r='u'>↶ Undo</button><button type='button' class='btn' data-r='r'>↷ Redo</button><button type='button' class='btn' data-r='x'>Reset</button></div>" +
      "<div class='metrics' data-r='m'></div><div class='grid2'><div><div class='field'>Undo stack (top first)</div><pre class='code' data-r='us'></pre></div><div><div class='field'>Redo stack (top first)</div><pre class='code' data-r='rs'></pre></div></div><div class='result' data-r='res' hidden></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw(msg) {
      q("acts").innerHTML = ACTIONS.map(function (a) { return "<button type='button' class='btn primary' data-a='" + a.id + "'>" + ctx.esc(a.label) + "</button>"; }).join("");
      q("m").innerHTML = "<div class='metric'><div class='v' style='font-family:monospace'>\"" + ctx.esc(s.doc) + "\"</div><div class='l'>document text</div></div>";
      function stack(arr) { return arr.length ? arr.slice().reverse().map(function (c) { return c.cmd + "\n    undo: " + c.undo; }).join("\n") : "(empty)"; }
      q("us").textContent = stack(s.undo); q("rs").textContent = stack(s.redo);
      q("u").disabled = !s.undo.length; q("r").disabled = !s.redo.length;
      var res = q("res"); if (msg) { res.hidden = false; res.className = "result " + msg[0]; res.innerHTML = "<div class='out'>" + ctx.esc(msg[1]) + "</div>"; } else res.hidden = true;
    }
    q("acts").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-a]"); if (!b) return; var a = ACTIONS.filter(function (x) { return x.id === b.getAttribute("data-a"); })[0];
      var r = a.run(s.doc); var hadRedo = s.redo.length;
      s.undo.push({ id: a.id, cmd: a.cmd, undo: r.undo, prev: r.prev, next: r.doc }); s.doc = r.doc; s.redo = []; ctx.save();
      draw(hadRedo ? ["warn", "history.execute(cmd): redo stack cleared (a new action starts a new branch of history)"] : ["ok", "history.execute(" + a.cmd + ")"]);
    });
    q("u").addEventListener("click", function () { var c = s.undo.pop(); if (!c) return; s.doc = c.prev; s.redo.push(c); ctx.save(); draw(["ok", "history.undo(): " + c.undo]); });
    q("r").addEventListener("click", function () { var c = s.redo.pop(); if (!c) return; s.doc = c.next; s.undo.push(c); ctx.save(); draw(["ok", "history.redo(): re-execute " + c.cmd]); });
    q("x").addEventListener("click", function () { s.doc = "Hello"; s.undo = []; s.redo = []; ctx.save(); draw(); });
    draw();
  }
  H.pattern({
    code: "F19", name: "Command",
    summary: "Command turns a request into a stand-alone object that contains everything about it, so you can pass, queue, log, schedule, retry, undo and redo requests. This lesson covers command/invoker/receiver roles, an editor with undo/redo stacks, macro commands, `Runnable`/`Callable` and lambdas as commands, a smart-home remote with undo, a persistent job queue with retries and idempotency, CQRS command handlers, JDK and Spring usages, Command vs Memento for undo, and Command vs Strategy.",
    intent: "**Encapsulate a request as an object**, thereby letting you parameterise clients with different requests, queue or log requests, and support **undoable** operations.",
    problem: {
      text: "A text editor has a toolbar, a menu, keyboard shortcuts and a command palette, all able to \"bold\", \"insert\", \"delete\". Each caller invokes editor methods directly, so undo has to be reimplemented in four places, macros (\"record these steps and replay\") are impossible, and there's no history to show or persist.",
      points: [
        "The **invoker** (button, shortcut, scheduler, queue worker) shouldn't know what the request does or who handles it",
        "Wrap each request in an object with `execute()` (and optionally `undo()`); it holds the **receiver** and the parameters",
        "Commands can be stored: history for undo/redo, queues for background work, logs for audit or replay",
        "Composite commands (macros) are commands made of commands"],
      code: `class Editor { StringBuilder text = new StringBuilder("Hello"); }
// Toolbar, menu and shortcut each do this, and each would need its own undo bookkeeping:
Editor ed = new Editor();
String before = ed.text.toString();                 // every caller saves state its own way
ed.text.append(" world");
System.out.println(ed.text);
ed.text.setLength(0); ed.text.append(before);       // ad-hoc undo
System.out.println(ed.text);` },
    analogy: "A restaurant order slip. The waiter (invoker) writes your request on a slip (command) and puts it on the kitchen rail. The waiter doesn't cook and doesn't need to know how. The chef (receiver) executes it. Slips can be queued, reordered by priority, cancelled (undo) before cooking, and kept for the bill (log).",
    structure: {
      text: "**Command** declares `execute()` (and often `undo()`). A **ConcreteCommand** binds a **Receiver** (the object that does the work) with parameters, and implements `execute` by calling the receiver. The **Invoker** stores and triggers commands (button, history, queue) without knowing their concrete type. The **Client** creates commands and configures invokers.",
      m: H.cd(["classDiagram",
        "  class Command { <<interface>>; +execute(); +undo() }",
        "  class InsertText { -Document doc; -int pos; -String text; +execute(); +undo() }",
        "  class DeleteRange { -Document doc; -int from; -int to; -String removed; +execute(); +undo() }",
        "  class Document { -StringBuilder text; +insert(int pos, String s); +delete(int from, int to) String }",
        "  class History { -Deque~Command~ undo; -Deque~Command~ redo; +execute(Command c); +undo(); +redo() }",
        "  Command <|.. InsertText", "  Command <|.. DeleteRange",
        "  InsertText --> Document : receiver", "  DeleteRange --> Document : receiver",
        "  History o-- Command"]),
      roles: [["Command", "Interface: `execute()`, often `undo()`"], ["Concrete command", "Binds receiver + parameters; stores what it needs to undo"], ["Receiver", "Knows how to do the work (`Document`, `Light`, `PaymentService`)"], ["Invoker", "Triggers and stores commands (`History`, button, queue worker)"], ["Client", "Creates commands and hands them to invokers"]],
      points: ["The invoker depends only on the `Command` interface", "A command must capture **enough state to undo itself** (the removed text, the previous value)"] },
    impl: {
      title: "Java implementation: editor commands with undo/redo",
      text: "`InsertText` remembers where and what it inserted; `DeleteRange` remembers the removed text so `undo` can put it back. `History` executes commands, pushes them on the undo stack, and clears the redo stack whenever a new command runs (a new branch of history).",
      code: `class Document {
    private final StringBuilder text = new StringBuilder();
    void insert(int pos, String s) { text.insert(pos, s); }
    String delete(int from, int to) { String r = text.substring(from, to); text.delete(from, to); return r; }
    int length() { return text.length(); }
    public String toString() { return text.toString(); }
}
interface Command { void execute(); void undo(); default String name() { return getClass().getSimpleName(); } }
class InsertText implements Command {
    private final Document doc; private final int pos; private final String s;
    InsertText(Document d, int pos, String s) { doc = d; this.pos = pos; this.s = s; }
    public void execute() { doc.insert(pos, s); }
    public void undo() { doc.delete(pos, pos + s.length()); }
}
class DeleteRange implements Command {
    private final Document doc; private final int from, to; private String removed;
    DeleteRange(Document d, int from, int to) { doc = d; this.from = from; this.to = to; }
    public void execute() { removed = doc.delete(from, to); }                      // remember for undo
    public void undo() { doc.insert(from, removed); }
}
class History {                                                                      // invoker
    private final Deque<Command> undo = new ArrayDeque<>(), redo = new ArrayDeque<>();
    void execute(Command c) { c.execute(); undo.push(c); redo.clear(); }
    boolean undo() { if (undo.isEmpty()) return false; Command c = undo.pop(); c.undo(); redo.push(c); return true; }
    boolean redo() { if (redo.isEmpty()) return false; Command c = redo.pop(); c.execute(); undo.push(c); return true; }
}

Document doc = new Document(); History h = new History();
h.execute(new InsertText(doc, 0, "Hello"));
h.execute(new InsertText(doc, 5, " world"));
h.execute(new DeleteRange(doc, 0, 6));
System.out.println("after edits: '" + doc + "'");
h.undo(); System.out.println("undo:  '" + doc + "'");
h.undo(); System.out.println("undo:  '" + doc + "'");
h.redo(); System.out.println("redo:  '" + doc + "'");
h.execute(new InsertText(doc, doc.length(), "!"));
System.out.println("new command clears redo; redo possible? " + h.redo() + " -> '" + doc + "'");` },
    variants: [
      { title: "Lambdas, `Runnable` and macro commands",
        text: "A command without undo is just \"something to run later\": `Runnable` and `Callable` are the JDK's command interfaces, and a lambda is a command object. When you need undo, pair the action with its inverse. A **macro** is a Composite (F14) of commands: execute in order, undo in **reverse** order.",
        code: `interface Cmd { void execute(); void undo(); }
static Cmd of(Runnable doIt, Runnable undoIt) {
    return new Cmd() { public void execute() { doIt.run(); } public void undo() { undoIt.run(); } };
}
class Macro implements Cmd {
    private final List<Cmd> steps;
    Macro(List<Cmd> steps) { this.steps = List.copyOf(steps); }
    public void execute() { steps.forEach(Cmd::execute); }
    public void undo() { for (int i = steps.size() - 1; i >= 0; i--) steps.get(i).undo(); }   // reverse order
}

Map<String, Integer> room = new LinkedHashMap<>(Map.of("lights", 100, "ac", 0, "blinds", 100));
Cmd movieNight = new Macro(List.of(
    of(() -> room.put("lights", 20), () -> room.put("lights", 100)),
    of(() -> room.put("ac", 24), () -> room.put("ac", 0)),
    of(() -> room.put("blinds", 0), () -> room.put("blinds", 100))));
movieNight.execute(); System.out.println("movie night: " + room);
movieNight.undo();    System.out.println("undone:      " + room);

ExecutorService pool = Executors.newSingleThreadExecutor();
Future<Integer> f = pool.submit(() -> 6 * 7);                      // Callable: a command with a result
System.out.println("queued command result: " + f.get());
pool.shutdown();`,
        points: [
          "Real undo is often harder than \"call the inverse\": deleting a file isn't undone by re-creating an empty file. Capture the **state needed** to undo, or use Memento (F26)",
          "Some commands are **not undoable** (sending an email, charging a card); model that explicitly (`isUndoable()`) or use a compensating command (a refund)"] },
      { title: "Commands as data: queues, logs, retries and CQRS",
        text: "Because a command is an object, it can be **serialised** and handled elsewhere or later. That turns Command into the backbone of job queues, sagas and CQRS. On the write side of CQRS, every state change comes in as a command (`PlaceOrder`, `CancelOrder`) handled by exactly one handler, which validates it and emits events.",
        m: M(["flowchart LR",
          "  API[\"<b>API</b><br/><span class='d'>builds PlaceOrder(cmd)</span>\"]:::s1 --> Q[(\"<b>Command queue</b>\")]:::s2",
          "  Q --> W[\"<b>Worker</b><br/><span class='d'>invoker: dispatch by type</span>\"]:::s0",
          "  W --> HND[\"<b>PlaceOrderHandler</b><br/><span class='d'>receiver logic</span>\"]:::s1",
          "  HND --> EV[\"<b>OrderPlaced</b><br/><span class='d'>event</span>\"]:::s2",
          "  W -.->|retry with backoff| Q",
          "  W -.->|after N failures| DLQ[(\"Dead-letter queue\")]:::s2"]),
        points: [
          "Commands carry an **ID** so handlers are **idempotent** (a retried command doesn't charge twice)",
          "Command = intent to change (\"PlaceOrder\", may be rejected); Event = fact that happened (\"OrderPlaced\", can't be rejected)",
          "A command log (write-ahead log, event sourcing) can be replayed to rebuild state or debug",
          "Commands should be **immutable records**: easy to serialise, safe to retry"] }
    ],
    designs: [
      { title: "Mini LLD: programmable smart-home remote with undo",
        text: "A remote has 6 slots, each with an ON and OFF button, plus a global UNDO. Slots are programmable: slot 1 could control living-room lights, slot 2 the fan with speed levels, slot 3 a \"party mode\" macro. The remote (invoker) knows nothing about devices. Undo restores the previous state, e.g. the fan's previous speed, not just \"off\".",
        points: [
          "`Command { execute(); undo(); }`; `NoCommand` (Null Object) fills empty slots so the remote never checks for `null`",
          "`FanSpeedCommand` stores the fan's previous speed before changing it, so undo is exact",
          "`MacroCommand` for scenes; undo reverses each step in reverse order",
          "The remote keeps an undo **stack** (multi-level), bounded to e.g. 20 entries",
          "Configuration (which command in which slot) comes from the app, so new devices need only new command classes"],
        m: H.cd(["classDiagram",
          "  class RemoteControl { -Command[] on; -Command[] off; -Deque~Command~ history; +setSlot(int i, Command on, Command off); +pressOn(int i); +pressOff(int i); +undo() }",
          "  class Command { <<interface>>; +execute(); +undo() }",
          "  class LightOn { -Light light }", "  class FanSpeed { -Fan fan; -int speed; -int prev }", "  class MacroCommand { -List~Command~ steps }", "  class NoCommand",
          "  class Light { +on(); +off() }", "  class Fan { +setSpeed(int s); +speed() int }",
          "  RemoteControl o-- Command",
          "  Command <|.. LightOn", "  Command <|.. FanSpeed", "  Command <|.. MacroCommand", "  Command <|.. NoCommand",
          "  LightOn --> Light", "  FanSpeed --> Fan", "  MacroCommand o-- Command"]),
        code: `class Light { final String where; boolean on; Light(String w) { where = w; } }
class Fan { int speed; }
interface Command { void execute(); void undo(); }
class NoCommand implements Command { public void execute() {} public void undo() {} }               // null object
record LightSwitch(Light l, boolean turnOn) implements Command {
    public void execute() { l.on = turnOn; }
    public void undo() { l.on = !turnOn; }
}
class FanSpeed implements Command {
    private final Fan fan; private final int speed; private int prev;
    FanSpeed(Fan f, int s) { fan = f; speed = s; }
    public void execute() { prev = fan.speed; fan.speed = speed; }                                     // remember previous speed
    public void undo() { fan.speed = prev; }
}
class RemoteControl {
    private final Command[] on = new Command[6], off = new Command[6]; private final Deque<Command> history = new ArrayDeque<>();
    RemoteControl() { Arrays.fill(on, new NoCommand()); Arrays.fill(off, new NoCommand()); }
    void setSlot(int i, Command onC, Command offC) { on[i] = onC; off[i] = offC; }
    void pressOn(int i) { run(on[i]); }
    void pressOff(int i) { run(off[i]); }
    private void run(Command c) { c.execute(); history.push(c); if (history.size() > 20) history.removeLast(); }
    void undo() { if (!history.isEmpty()) history.pop().undo(); }
}

Light lr = new Light("living room"); Fan fan = new Fan();
RemoteControl rc = new RemoteControl();
rc.setSlot(0, new LightSwitch(lr, true), new LightSwitch(lr, false));
rc.setSlot(1, new FanSpeed(fan, 3), new FanSpeed(fan, 0));
rc.setSlot(2, new FanSpeed(fan, 5), new FanSpeed(fan, 0));
rc.pressOn(0); rc.pressOn(1); rc.pressOn(2);
System.out.println("light=" + lr.on + " fan=" + fan.speed);
rc.undo(); System.out.println("undo -> fan=" + fan.speed);
rc.undo(); System.out.println("undo -> fan=" + fan.speed);
rc.pressOn(5);                                                    // empty slot: no null check needed
rc.undo(); rc.undo(); System.out.println("undo x2 -> light=" + lr.on);` },
      { title: "Mini LLD: a job queue with retries and idempotency",
        text: "Background jobs (send invoice email, generate a report, sync to a partner) are submitted as commands. Workers pull them from a queue, execute, and retry failures with exponential backoff; after 3 failures a job goes to a dead-letter queue for a human. A job is identified by an **idempotency key** so a duplicate submission (double click, retried API call) runs once.",
        points: [
          "`Job` (command): `id`, `type`, `payload`, `attempts`, `idempotencyKey`, and `run()`; stored as a row/message so it survives restarts",
          "`JobQueue` (invoker): `submit(job)` rejects duplicates by key; `poll()` returns the next due job (ordered by `runAt`)",
          "Retry policy is a Strategy (F17): exponential backoff `base × 2^attempt` with jitter, capped",
          "Handlers are registered per job type (`Map<String, JobHandler>`), so the worker stays generic",
          "Visibility timeout / leases prevent two workers running the same job; handlers must still be idempotent (at-least-once delivery)"],
        code: `record Job(String key, String type, String payload, int attempt, long runAt) {
    Job retry(long now) { return new Job(key, type, payload, attempt + 1, now + (1L << attempt) * 1000); }   // 1 s, 2 s, 4 s...
}
interface JobHandler { void handle(String payload); }
class JobQueue {
    private final PriorityQueue<Job> due = new PriorityQueue<>(Comparator.comparingLong(Job::runAt));
    private final Set<String> seen = new HashSet<>(); final List<Job> dead = new ArrayList<>();
    boolean submit(Job j) { if (!seen.add(j.key())) return false; due.add(j); return true; }       // idempotent submit
    Job poll(long now) { return !due.isEmpty() && due.peek().runAt() <= now ? due.poll() : null; }
    void requeue(Job j) { due.add(j); }
}
class Worker {
    private final JobQueue q; private final Map<String, JobHandler> handlers; private final int maxAttempts;
    Worker(JobQueue q, Map<String, JobHandler> h, int max) { this.q = q; handlers = h; maxAttempts = max; }
    void tick(long now) {
        for (Job j; (j = q.poll(now)) != null; ) {
            try { handlers.get(j.type()).handle(j.payload()); System.out.println("  t=" + now + " ok " + j.key()); }
            catch (RuntimeException e) {
                if (j.attempt() + 1 >= maxAttempts) { q.dead.add(j); System.out.println("  t=" + now + " DLQ " + j.key() + ": " + e.getMessage()); }
                else { q.requeue(j.retry(now)); System.out.println("  t=" + now + " retry " + j.key() + " (attempt " + (j.attempt() + 1) + ")"); }
            }
        }
    }
}

JobQueue q = new JobQueue();
Map<String, JobHandler> handlers = Map.of(
    "email", p -> System.out.println("  sending " + p),
    "partner-sync", p -> { throw new IllegalStateException("partner API 503"); });
System.out.println("submit twice: " + q.submit(new Job("inv-42", "email", "invoice 42", 0, 0)) + " " + q.submit(new Job("inv-42", "email", "invoice 42", 0, 0)));
q.submit(new Job("sync-7", "partner-sync", "order 7", 0, 0));
Worker w = new Worker(q, handlers, 3);
for (long t = 0; t <= 4000; t += 1000) w.tick(t);
System.out.println("dead letters: " + q.dead.stream().map(Job::key).toList());` }
    ],
    extraSlides: [
      { title: "Undo strategies: Command vs Memento",
        text: "There are two ways to implement undo, and interviewers like to ask which you'd choose. **Command-based undo** stores *operations* and their inverses (small, but each command must know how to reverse itself). **Memento-based undo** (F26) stores *snapshots* of state (simple and always correct, but memory-heavy for large state). Real editors mix them.",
        table: [
          ["", "Command (inverse operations)", "Memento (snapshots)"],
          ["Stores", "the operation + data to reverse it", "a copy of the state before the change"],
          ["Memory", "small per step", "large for big documents (unless diffed/structural sharing)"],
          ["Correctness risk", "a buggy `undo()` corrupts state", "low: just restore the snapshot"],
          ["Non-invertible ops", "need captured state anyway", "natural"],
          ["Collaboration (multi-user)", "operations can be transformed/merged (OT/CRDT)", "snapshots conflict"]],
        points: [
          "Hybrid: commands for small edits; periodic snapshots as checkpoints so undo far back doesn't replay thousands of inverses",
          "Bound history size (memory) and coalesce tiny commands (typing \"hello\" becomes one undo step, not five)",
          "Google Docs-style collaborative editors use operation-based commands with operational transformation or CRDTs"] }
    ],
    usages: [
      ["`java.lang.Runnable`, `java.util.concurrent.Callable`", "Requests as objects, executed later or elsewhere by an `Executor` (the invoker)."],
      ["`ExecutorService.submit`, `ScheduledExecutorService.schedule`", "Queue and schedule command objects; `Future` lets you cancel them."],
      ["Swing `javax.swing.Action` / `AbstractAction`", "One action object shared by a menu item, toolbar button and shortcut, with enabled state and name."],
      ["`javax.swing.undo.UndoManager` / `UndoableEdit`", "Undoable edits with `undo()`/`redo()` managed by an undo manager (invoker with history)."],
      ["Spring Batch `Tasklet`/`Step`, Quartz `Job`", "Units of work executed, retried and recorded by a framework."],
      ["Spring `TransactionCallback` / `TransactionTemplate.execute(cb)`", "A command object executed inside a transaction by the template."],
      ["CQRS frameworks (Axon `@CommandHandler`)", "Commands dispatched on a command bus to exactly one handler."]
    ],
    avoid: {
      points: [
        "Simple direct calls with no need to queue, log, undo or parameterise the invoker",
        "Undo isn't required and actions are fire-and-forget: a lambda/`Runnable` is enough, no hierarchy needed",
        "Commands that need half the application's state to execute (huge parameter bags): rethink the boundary",
        "Treating events as commands: an event reports a fact and shouldn't be rejected"],
      pros: ["Decouples the invoker from the receiver", "Undo/redo, macros, history and audit logs", "Queueing, scheduling, retries, remote execution", "New commands without touching invokers (OCP)"],
      cons: ["Many small classes (mitigated by lambdas and records)", "Correct undo is hard for non-invertible operations", "History costs memory; needs bounds and coalescing", "Indirection makes simple flows harder to follow"] },
    compare: [
      ["Strategy (F17)", "Interchangeable algorithm used by a context", "A strategy is *how* to compute something for the context; a command is *a request to do something*, often with its receiver and undo"],
      ["Memento (F26)", "Snapshot state to restore later", "Alternative way to implement undo; often combined with Command"],
      ["Chain of Responsibility (F22)", "Pass a request along handlers", "The request travelling down a chain is often a command object"],
      ["Observer (F18)", "Notify dependents of changes", "Events notify; commands instruct. Command handlers often emit events"],
      ["Composite (F14)", "Trees of objects", "Macro commands are composites of commands"]],
    widget: { heading: "Interactive: undo and redo with command objects", caption: "Run editor commands, then undo and redo. Watch both stacks; a new command after an undo clears the redo stack.", render: editorWidget },
    pitfalls: [
      "Forgetting to clear the redo stack after a new command (redo then applies to a different history)",
      "Commands that don't capture enough state to undo (deleting text without remembering it)",
      "Undoing macros in forward order instead of reverse",
      "Unbounded history growing until memory runs out",
      "Mutable command objects reused across executions (redo uses stale captured state)",
      "Non-idempotent queued commands retried after a timeout (double charges, duplicate emails)",
      "Putting business logic in the invoker instead of the command/receiver",
      "One undo step per keystroke (annoying UX); coalesce related commands"
    ],
    quiz: [
      { q: "What is Command's intent?", options: ["Share objects to save memory", "Encapsulate a request as an object so it can be queued, logged, undone or parameterised", "Notify dependents", "Simplify a subsystem"], answer: 1, why: "Requests become first-class objects." },
      { q: "In a smart-home remote, which is the invoker?", options: ["The light", "The remote control", "The `LightOn` command", "The user"], answer: 1, why: "It triggers commands without knowing what they do." },
      { q: "What must `DeleteRange.execute()` save so that `undo()` works?", options: ["Nothing", "The deleted text (and its position)", "The whole document always", "The cursor colour"], answer: 1, why: "Undo needs the data that was destroyed." },
      { q: "After undo, the user runs a new command. The redo stack should be…", options: ["Kept", "Cleared", "Reversed", "Executed"], answer: 1, why: "History has branched; old redo steps no longer apply." },
      { q: "`Runnable` submitted to an `ExecutorService` is an example of…", options: ["Observer", "Command (the executor is the invoker)", "Builder", "Proxy"], answer: 1, why: "A request object executed later by an invoker." },
      { q: "Command vs event (CQRS)?", options: ["Same", "A command is an intent that may be rejected; an event is a fact that already happened", "Events can be rejected", "Commands are always async"], answer: 1, why: "`PlaceOrder` vs `OrderPlaced`." },
      { q: "A retried `ChargeCard` command must be…", options: ["Faster", "Idempotent (e.g. keyed by an idempotency key) so it doesn't charge twice", "Undoable", "Synchronous"], answer: 1, why: "At-least-once delivery means duplicates happen." },
      { q: "Command vs Memento for undo: which statement is right?", options: ["Memento stores operations", "Command stores operations and their inverses; Memento stores state snapshots", "They are the same", "Memento can't undo"], answer: 1, why: "Operations vs snapshots." }
    ],
    cheatsheet: {
      table: [
        ["Part", "Role", "Example"],
        ["Command", "`execute()`, `undo()`", "`InsertText`, `FanSpeed`, `Job`"],
        ["Receiver", "does the real work", "`Document`, `Fan`, `EmailService`"],
        ["Invoker", "triggers/stores commands", "`History`, `RemoteControl`, `Worker`"],
        ["Client", "creates and wires commands", "UI setup, API controller"]],
      cards: [
        { title: "Use for", items: ["Undo/redo", "Macros", "Queues, scheduling, retries", "Audit/replay logs", "Decoupling UI from actions"] },
        { title: "Get it right", items: ["Capture undo state in execute", "Clear redo on new command", "Reverse order for macro undo", "Bound + coalesce history", "Idempotency keys"] },
        { title: "Java", items: ["`Runnable`/`Callable`", "Lambdas + records", "`Executor`", "Swing `Action`, `UndoManager`"] }]
    },
    practice: [
      { level: "Easy", q: "Define Command and name its participants. Give two reasons to turn a method call into an object.",
        a: ["Command encapsulates a request (receiver + action + parameters) as an object with `execute()` (and often `undo()`).",
          "Participants: Command, ConcreteCommand, Receiver, Invoker, Client.",
          "Reasons: undo/redo and history; queue/schedule/retry/execute remotely; log for audit or replay; let generic invokers (buttons, workers) trigger any action; build macros."] },
      { level: "Easy", q: "Implement a calculator with `Add(n)`, `Multiply(n)` commands and undo, where undo must restore the exact previous value (watch out for multiply by 0).",
        code: `class Calculator { long value; }
interface Op { void execute(); void undo(); }
class Add implements Op {
    private final Calculator c; private final long n;
    Add(Calculator c, long n) { this.c = c; this.n = n; }
    public void execute() { c.value += n; }
    public void undo() { c.value -= n; }                    // exact inverse exists
}
class Multiply implements Op {
    private final Calculator c; private final long n; private long before;
    Multiply(Calculator c, long n) { this.c = c; this.n = n; }
    public void execute() { before = c.value; c.value *= n; }
    public void undo() { c.value = before; }                // dividing would fail for n = 0, so store state
}

Calculator calc = new Calculator(); Deque<Op> hist = new ArrayDeque<>();
for (Op op : List.of(new Add(calc, 5), new Multiply(calc, 4), new Multiply(calc, 0), new Add(calc, 3))) { op.execute(); hist.push(op); }
System.out.println("value " + calc.value);
while (!hist.isEmpty()) { hist.pop().undo(); System.out.print(calc.value + " "); }
System.out.println();` },
      { level: "Medium", q: "Text-editor typing: each keystroke is an `InsertChar` command, but undo should remove a whole word typed in one burst. Implement **command coalescing** in the history.",
        code: `class Doc { final StringBuilder sb = new StringBuilder(); }
class Insert {
    final Doc d; final int pos; String text; final long at;
    Insert(Doc d, int pos, String text, long at) { this.d = d; this.pos = pos; this.text = text; this.at = at; }
    void execute() { d.sb.insert(pos, text); }
    void undo() { d.sb.delete(pos, pos + text.length()); }
    boolean canMerge(Insert next) { return next.pos == pos + text.length() && next.at - at < 1000 && !next.text.equals(" "); }
}
class History {
    private final Deque<Insert> undo = new ArrayDeque<>();
    void run(Insert c) {
        c.execute();
        Insert top = undo.peek();
        if (top != null && top.canMerge(c)) top.text += c.text;          // coalesce into the previous step
        else undo.push(c);
    }
    void undo() { if (!undo.isEmpty()) undo.pop().undo(); }
    int steps() { return undo.size(); }
}

Doc doc = new Doc(); History h = new History(); long t = 0;
for (char ch : "hello world".toCharArray()) h.run(new Insert(doc, doc.sb.length(), String.valueOf(ch), t += 100));
System.out.println("'" + doc.sb + "' in " + h.steps() + " undo steps");
h.undo(); System.out.println("undo -> '" + doc.sb + "'");
h.undo(); System.out.println("undo -> '" + doc.sb + "'");`,
        follow: "Coalescing rules are a UX decision: break on whitespace, pauses, cursor moves, or formatting changes." },
      { level: "Medium", q: "Chess game (frequently asked): how would you use Command for moves, including undo, captures, castling and replaying a game from PGN?",
        a: ["`Move` command: `from`, `to`, `piece`, plus captured state filled in during `execute()`: `capturedPiece`, previous castling rights, previous en-passant square, previous half-move clock.",
          "`execute()` updates the board; `undo()` restores all of that captured state, so undo is exact even for captures and special moves.",
          "Special moves are subclasses or composites: `Castle` moves king and rook (a macro); `Promotion` replaces the pawn.",
          "`Game` keeps `Deque<Move> history`; undo pops and reverses; \"takeback\" in online play is a request that both players must accept.",
          "Replay: parse PGN into `Move` commands and execute in order; the same history drives move lists and analysis boards."],
        m: H.cd(["classDiagram",
          "  class Game { -Board board; -Deque~Move~ history; +play(Move m); +undo(); +replay(List~Move~ moves) }",
          "  class Move { <<abstract>>; #Square from; #Square to; #Piece captured; #CastlingRights prevRights; +execute(Board b); +undo(Board b) }",
          "  class NormalMove", "  class Castle", "  class Promotion { -PieceType to }", "  class EnPassant",
          "  Game o-- Move",
          "  Move <|-- NormalMove", "  Move <|-- Castle", "  Move <|-- Promotion", "  Move <|-- EnPassant"]) },
      { level: "Medium", q: "Payments: a `RefundOrder` command is queued and executed by a worker. The worker crashes after calling the PSP but before marking the job done, so the job runs again. How do you make this safe?",
        a: ["Give the command an **idempotency key** (e.g. `refund:{orderId}:{attempt-group}`) and pass it to the PSP; PSPs return the original result for a repeated key.",
          "Record the command's state transitions in the DB: `PENDING → SENT → CONFIRMED`; on retry, if `SENT`, **query the PSP status** before sending again.",
          "Make the handler idempotent locally too: unique constraint on `(orderId, refundId)`.",
          "Use a lease/visibility timeout so only one worker holds the job at a time, but don't rely on it alone (at-least-once delivery).",
          "Refunds are compensating commands for charges; they are not \"undo\" in the editor sense."] },
      { level: "Medium", q: "An interviewer says: \"`Runnable` is a Strategy, not a Command.\" How do you answer? When is a lambda a strategy, and when is it a command?",
        a: ["The **shape** is identical (one-method interface held by another object); the difference is **intent and lifecycle**.",
          "**Strategy**: the context calls it as part of its own algorithm and uses the result (`Comparator` inside `sort`). The context owns the call.",
          "**Command**: it represents a self-contained request to be executed later or elsewhere; the invoker stores, queues, logs, retries or undoes it without understanding it (`executor.submit(task)`, a button's action).",
          "So `Runnable` passed to an `Executor` is a command; a `Function` passed to `map` is a strategy.",
          "Tell-tale signs of Command: history, queue, scheduling, undo, serialisation, an ID."] },
      { level: "Hard", q: "Design a task scheduler (cron-like) where jobs are commands: one-off at a time, fixed-rate, and cron expressions; support cancel, pause and listing upcoming runs. What are the main classes?",
        a: ["`Task` (command): `id`, `Runnable action` or handler key, `Trigger trigger`, `status`.",
          "`Trigger` (strategy): `nextRunAfter(Instant last)`: `OnceAt`, `FixedRate(period)`, `CronTrigger(expr)`.",
          "`Scheduler` (invoker): a `PriorityQueue<ScheduledRun>` ordered by next run time + a worker pool; a single dispatcher thread waits until the head is due (`DelayQueue` fits), then submits to the pool and re-enqueues with `trigger.nextRunAfter(now)`.",
          "Cancel/pause: mark status; the dispatcher skips cancelled runs (lazy deletion) to avoid O(n) removal.",
          "Persistence for durability across restarts; misfire policy (run once now, or skip) after downtime; no overlapping runs of the same task unless allowed."],
        m: H.cd(["classDiagram",
          "  class Scheduler { -DelayQueue~ScheduledRun~ queue; -ExecutorService workers; +schedule(Task t) String; +cancel(String id); +upcoming(int n) List }",
          "  class Task { -String id; -Runnable action; -Trigger trigger; -Status status }",
          "  class Trigger { <<interface>>; +nextRunAfter(Instant last) Optional~Instant~ }",
          "  class ScheduledRun { -Task task; -Instant at }",
          "  Scheduler o-- ScheduledRun", "  ScheduledRun --> Task", "  Task --> Trigger",
          "  Trigger <|.. OnceAt", "  Trigger <|.. FixedRate", "  Trigger <|.. CronTrigger"]) },
      { level: "Hard", q: "In a collaborative drawing app, two users edit the same canvas. User A undoes their last action after user B has made changes. How does Command-based undo need to change?",
        a: ["Undo must be **per user** (undo *my* last action), not a global stack: keep per-user histories.",
          "An inverse command computed against an old state may conflict with B's later changes (B moved the shape A created). Undo becomes a **new command** applied to the current state, transformed against concurrent operations (operational transformation) or expressed as CRDT operations.",
          "Commands must reference stable IDs (shape IDs), not positions in a list.",
          "If the target no longer exists (B deleted it), the undo becomes a no-op or a conflict shown to the user.",
          "Snapshots (Memento) don't work well here: restoring a snapshot would wipe out B's work."] }
    ],
    recap: [
      "Command = a request as an object (receiver + action + parameters), triggered by an invoker that doesn't know the details.",
      "It enables undo/redo (with captured state), macros, history, queues, scheduling, retries and audit logs.",
      "Java: `Runnable`/`Callable` + executors, lambdas and records for commands, Swing `Action`/`UndoManager`.",
      "Get it right: clear redo on new commands, undo macros in reverse, bound and coalesce history, idempotency keys for queued work.",
      "Command vs Memento for undo; command (intent) vs event (fact); Command vs Strategy (request vs algorithm)."
    ]
  });
})();
