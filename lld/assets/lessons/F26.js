/* Lesson F26: Memento */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  function fresh() { return { level: 1, hp: 100, coins: 0, items: ["sword"] }; }
  function clone(g) { return { level: g.level, hp: g.hp, coins: g.coins, items: g.items.slice() }; }
  function show(g) { return "level " + g.level + ", hp " + g.hp + ", coins " + g.coins + ", items [" + g.items.join(", ") + "]"; }
  function checkpointWidget(el, ctx) {
    var s = ctx.state; if (!s.g) { s.g = fresh(); s.saves = []; s.log = ["new Game(): " + show(s.g)]; }
    el.innerHTML = "<p>" + ctx.md("The **originator** (`Game`) creates a sealed `Checkpoint` memento of its own state. The **caretaker** (`SaveSlots`) only stores and returns mementos; it can't read or change what's inside. Play, save, take damage, and restore.") + "</p>" +
      "<div class='btnrow' data-r='acts'>" +
      "<button type='button' class='btn' data-a='fight'>⚔ fight (−40 hp, +30 coins)</button>" +
      "<button type='button' class='btn' data-a='loot'>🎁 loot potion</button>" +
      "<button type='button' class='btn' data-a='next'>⬆ next level</button>" +
      "<button type='button' class='btn primary' data-a='save'>💾 save checkpoint</button>" +
      "<button type='button' class='btn' data-a='load'>⟲ restore last</button>" +
      "<button type='button' class='btn' data-a='reset'>new game</button></div>" +
      "<div class='diagram' data-r='dg'></div><pre class='code' data-r='log'></pre><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    var msg = "";
    function act(a) {
      var g = s.g; msg = "";
      if (a === "reset") { s.g = fresh(); s.saves = []; s.log = ["new Game(): " + show(s.g)]; return; }
      if (a === "fight") { g.hp -= 40; g.coins += 30; s.log.push("game.fight()       -> " + show(g)); }
      if (a === "loot") { g.items.push("potion"); s.log.push("game.loot()        -> " + show(g)); }
      if (a === "next") { g.level++; s.log.push("game.nextLevel()   -> " + show(g)); }
      if (a === "save") { s.saves.push(clone(g)); s.log.push("slots.push(game.save())   // checkpoint #" + s.saves.length); }
      if (a === "load") {
        if (!s.saves.length) { msg = "No checkpoint yet: the caretaker's stack is empty."; return; }
        s.g = clone(s.saves[s.saves.length - 1]); s.log.push("game.restore(slots.peek()) -> " + show(s.g));
      }
      if (s.g.hp <= 0) { s.log.push("💀 game over: hp " + s.g.hp); msg = "You died. Restore the last checkpoint: the game's internal state is rebuilt exactly, including the item list (a deep copy, not a shared reference)."; }
      if (s.log.length > 9) s.log = s.log.slice(-9);
    }
    function draw() {
      var lines = ["flowchart LR", "  G[\"<b>Game</b> (originator)<br/><span class='d'>" + show(s.g).replace(/, items/, "<br/>items") + "</span>\"]:::" + (s.g.hp <= 0 ? "bad" : "s0")];
      lines.push("  T[\"<b>SaveSlots</b> (caretaker)<br/><span class='d'>" + s.saves.length + " checkpoint(s)</span>\"]:::s1", "  G -- \"save()\" --> T", "  T -. \"restore(m)\" .-> G");
      s.saves.slice(-3).forEach(function (c, i, arr) {
        var n = s.saves.length - arr.length + i + 1;
        lines.push("  C" + n + "[/\"#" + n + " L" + c.level + " hp" + c.hp + " ₹" + c.coins + "\"/]:::s2", "  T --- C" + n);
      });
      lines.push("  classDef s0 fill:#dbeafe,stroke:#2563eb,stroke-width:2px", "  classDef s1 fill:#fff3e0,stroke:#ef6c00", "  classDef s2 fill:#f1f5f9,stroke:#64748b", "  classDef bad fill:#ffebee,stroke:#c62828,stroke-width:2px");
      ctx.H.renderDiagram(q("dg"), lines.join("\n"));
      q("log").textContent = s.log.join("\n");
      var res = q("res");
      if (msg) { res.className = "result " + (s.g.hp <= 0 ? "err" : "warn"); res.innerHTML = "<p>" + ctx.md(msg) + "</p>"; }
      else { res.className = "result"; res.innerHTML = "<p>" + ctx.md("Each checkpoint is a full deep copy: three numbers plus a " + s.g.items.length + "-item list here, and " + s.saves.length + " stored so far. Real games and editors cap the number of slots or store **deltas** to control memory.") + "</p>"; }
    }
    q("acts").addEventListener("click", function (e) { var b = e.target.closest("button[data-a]"); if (!b) return; act(b.getAttribute("data-a")); ctx.save(); draw(); });
    draw();
  }

  H.pattern({
    code: "F26", name: "Memento",
    summary: "Memento captures an object's internal state in a snapshot so it can be restored later, without exposing that state to the code that stores the snapshot. This lesson covers originator, memento and caretaker roles, a text editor with undo/redo snapshots, keeping mementos opaque in Java (nested classes, records, package-private access), deep vs shallow copies, Memento vs Command for undo, memory strategies (limits, deltas, persistent structures), game checkpoints, transactional rollback of a shopping cart, serialization and persistence, and how Memento relates to Command, Prototype, State and Iterator.",
    intent: "Without violating encapsulation, **capture and externalise an object's internal state** so that the object can be **restored to this state later**.",
    problem: {
      text: "A text editor needs undo. The first attempt lets the `History` class read the editor's fields (`text`, `cursor`, `selection`, `styles`) through public getters and setters, and copy them into its own list. Now history code knows every field of the editor; adding `scrollPosition` means changing `History` too, and any class can call `setCursor(-5)` and corrupt the editor.",
      points: [
        "Snapshot logic should live with the object that owns the state (the **originator**)",
        "The storer (**caretaker**) should treat snapshots as opaque tokens",
        "Restoring must rebuild **all** relevant state consistently, including collections (deep copy)",
        "No public setters just to support undo"],
      code: `class Editor { public String text = ""; public int cursor = 0; }              // exposed for "undo"
class History {
    private final Deque<String[]> saved = new ArrayDeque<>();
    void save(Editor e) { saved.push(new String[]{ e.text, String.valueOf(e.cursor) }); }   // knows Editor's fields
    void undo(Editor e) { String[] s = saved.pop(); e.text = s[0]; e.cursor = Integer.parseInt(s[1]); }
}
Editor ed = new Editor(); History h = new History();
h.save(ed); ed.text = "Hello"; ed.cursor = 5;
ed.cursor = -5;                                                               // anyone can corrupt it
h.undo(ed); System.out.println("after undo: '" + ed.text + "' cursor " + ed.cursor);` },
    analogy: "A \"save game\" file. The game writes everything it needs (level, health, inventory, map position) into a save slot; the console's storage just keeps the slot and hands it back. The storage can't read your inventory or edit your health, and the game can restore you exactly to that moment.",
    structure: {
      text: "The **Originator** (`Editor`) creates a **Memento** containing a copy of its internal state (`save()`) and can restore itself from one (`restore(m)`). The **Memento** is immutable and opaque to everyone except the originator. The **Caretaker** (`History`) decides **when** to save and restore and keeps mementos (a stack for undo, slots for checkpoints), but never inspects them.",
      m: H.cd(["classDiagram",
        "  class Editor { -String text; -int cursor; -Set~String~ bold; +type(String s); +save() Snapshot; +restore(Snapshot s) }",
        "  class Snapshot { <<immutable>>; -String text; -int cursor; -Set~String~ bold }",
        "  class History { -Deque~Snapshot~ undo; -Deque~Snapshot~ redo; +checkpoint(); +undo(); +redo() }",
        "  Editor ..> Snapshot : creates / reads",
        "  History o-- Snapshot : stores (opaque)",
        "  History --> Editor : asks save / restore"]),
      roles: [["Originator", "Owns state; `save()` makes a memento, `restore(m)` applies one"], ["Memento", "Immutable snapshot; only the originator can read it"], ["Caretaker", "Stores mementos, decides when to save/restore (`History`, `SaveSlots`)"]],
      points: ["**Wide** interface for the originator (full access), **narrow** interface for the caretaker (just a token)", "Deep-copy mutable parts (lists, sets) when creating the memento"] },
    impl: {
      title: "Java implementation: editor undo/redo with opaque snapshots",
      text: "The memento is a `private static` nested record of `Editor`, so outside code can hold a `Editor.Snapshot` but cannot read its fields: only `Editor` can. `History` keeps undo and redo stacks of snapshots taken **before** each change; a new change clears redo. The set of bold words is copied (`Set.copyOf`) so later edits can't leak into old snapshots.",
      code: `class Editor {
    private StringBuilder text = new StringBuilder(); private int cursor; private Set<String> bold = new TreeSet<>();
    public static final class Snapshot {                                       // opaque to outsiders
        private final String text; private final int cursor; private final Set<String> bold;
        private Snapshot(String t, int c, Set<String> b) { text = t; cursor = c; bold = Set.copyOf(b); }   // deep enough copy
    }
    Snapshot save() { return new Snapshot(text.toString(), cursor, bold); }
    void restore(Snapshot s) { text = new StringBuilder(s.text); cursor = s.cursor; bold = new TreeSet<>(s.bold); }
    void type(String s) { text.insert(cursor, s); cursor += s.length(); }
    void makeBold(String word) { bold.add(word); }
    public String toString() { return "'" + text + "' cursor=" + cursor + " bold=" + bold; }
}
class History {
    private final Editor ed; private final Deque<Editor.Snapshot> undo = new ArrayDeque<>(), redo = new ArrayDeque<>();
    History(Editor ed) { this.ed = ed; }
    void edit(Runnable change) { undo.push(ed.save()); redo.clear(); change.run(); }   // snapshot before each change
    void undo() { if (!undo.isEmpty()) { redo.push(ed.save()); ed.restore(undo.pop()); } }
    void redo() { if (!redo.isEmpty()) { undo.push(ed.save()); ed.restore(redo.pop()); } }
}

Editor ed = new Editor(); History h = new History(ed);
h.edit(() -> ed.type("Ship "));
h.edit(() -> ed.type("UPI autopay"));
h.edit(() -> ed.makeBold("UPI"));
System.out.println(ed);
h.undo(); System.out.println("undo: " + ed);
h.undo(); System.out.println("undo: " + ed);
h.redo(); System.out.println("redo: " + ed);
h.edit(() -> ed.type(" today")); h.redo();                                    // new edit cleared redo
System.out.println("edit + redo: " + ed);`,
      points: ["`Snapshot`'s fields are private; Java lets the enclosing `Editor` read them, nobody else", "Snapshots are immutable, so the same one can safely sit in both history and an autosave queue"] },
    variants: [
      { title: "Memento vs Command for undo",
        text: "Two classic ways to undo. **Memento**: snapshot state before a change and restore it. **Command** (F19): each command knows how to reverse itself (`undo()` applies the inverse operation). Real editors often mix them: commands for cheap, reversible edits; mementos for operations whose inverse is hard (applying a filter to an image, reformatting a document, running a script).",
        table: [
          ["", "Memento (snapshot)", "Command (inverse operation)"],
          ["Undo logic", "Generic: restore the snapshot", "Per command: write the inverse"],
          ["Memory", "Size of state × number of snapshots", "Size of each command's parameters"],
          ["Correctness", "Always exact (if the copy is deep)", "Inverse bugs accumulate"],
          ["Good for", "Complex/irreversible ops, small state, checkpoints", "Large state, small reversible edits"],
          ["Examples", "Game saves, form drafts, DB savepoints", "Text inserts, moving shapes, bank transfers (compensation)"]],
        code: `class Canvas { List<String> shapes = new ArrayList<>(); }
interface Cmd { void run(); void undo(); }
Canvas c = new Canvas();

Cmd add = new Cmd() {                                                         // Command: cheap inverse
    public void run() { c.shapes.add("circle"); }
    public void undo() { c.shapes.remove(c.shapes.size() - 1); }
};
add.run(); add.undo(); System.out.println("command undo: " + c.shapes);

c.shapes.addAll(List.of("b", "c", "a", "c"));
List<String> memento = List.copyOf(c.shapes);                                 // Memento: snapshot, then a hard-to-invert op
c.shapes.sort(null); c.shapes = new ArrayList<>(new LinkedHashSet<>(c.shapes));   // "sort + dedupe"
System.out.println("after sort+dedupe: " + c.shapes);
c.shapes = new ArrayList<>(memento);
System.out.println("memento restore: " + c.shapes);`,
        points: ["Inverting \"sort + dedupe\" would need to remember the original order and duplicates: that *is* a snapshot", "Hybrid: a command that stores a memento of just the affected region is common (e.g. a paste replacing a selection)"] },
      { title: "Controlling memory: limits, deltas, persistent structures, persistence",
        text: "Full snapshots of a 50 MB document after every keystroke would exhaust memory quickly. Pick a strategy based on state size and change frequency.",
        table: [
          ["Strategy", "How", "Trade-off"],
          ["Bounded history", "Keep the last N snapshots (`ArrayDeque` with `pollLast` when full)", "Simple; old undo steps are lost"],
          ["Coalescing", "One snapshot per typing burst or per second, not per key", "Fewer, coarser undo steps"],
          ["Deltas / incremental", "Store a full snapshot every K steps plus diffs in between", "Restoring replays diffs; more code"],
          ["Persistent (immutable) structures", "New versions share unchanged parts (`List.copyOf` won't, but a persistent vector or rope does)", "Snapshots nearly free; needs the right data structure"],
          ["Externalise", "Serialise mementos to disk/DB (autosave drafts, game slots)", "I/O cost; versioning of the format"]],
        points: ["Immutable records make the simplest mementos: if the originator's state is already immutable, the \"snapshot\" is just a reference", "Persisted mementos need a schema version so old saves load after upgrades", "Beware what you capture: passwords and tokens in a persisted memento are a security leak"] }
    ],
    designs: [
      { title: "Mini LLD: game checkpoints with named slots and autosave",
        text: "A mobile RPG supports three manual save slots plus a rolling autosave of the last 5 checkpoints. A checkpoint must capture level, health, coins, inventory and quest progress, and loading must restore exactly that state, even after the player keeps playing and mutating the inventory. The `Game` creates sealed `Checkpoint` mementos; `SaveManager` is the caretaker.",
        points: [
          "`Game.checkpoint()` deep-copies the inventory and quest map into an immutable `Checkpoint` (with timestamp and schema version)",
          "`SaveManager`: `Map<Integer, Checkpoint> slots` (manual) and a bounded `Deque<Checkpoint>` autosave (drop oldest at 5)",
          "Caretaker never reads fields; the UI shows only metadata (`label()`, time) exposed deliberately",
          "Persistence: serialise checkpoints to JSON with a `version`; migrate old versions on load",
          "Anti-cheat (server games): checkpoints are signed or stored server-side so players can't edit coins"],
        m: H.cd(["classDiagram",
          "  class Game { -int level; -int hp; -int coins; -List~String~ inventory; +checkpoint(String label) Checkpoint; +load(Checkpoint c) }",
          "  class Checkpoint { <<immutable>>; -int level; -int hp; -int coins; -List~String~ inventory; -Instant at; +label() String }",
          "  class SaveManager { -Map~Integer,Checkpoint~ slots; -Deque~Checkpoint~ autosaves; +saveTo(int slot); +autosave(); +loadSlot(int slot); +loadLatestAuto() }",
          "  Game ..> Checkpoint : creates / reads",
          "  SaveManager o-- Checkpoint",
          "  SaveManager --> Game"]),
        code: `class Game {
    private int level = 1, hp = 100, coins = 0; private List<String> inventory = new ArrayList<>(List.of("sword"));
    public static final class Checkpoint {
        private final int level, hp, coins; private final List<String> inventory; private final String label;
        private Checkpoint(Game g, String label) { level = g.level; hp = g.hp; coins = g.coins; inventory = List.copyOf(g.inventory); this.label = label; }
        public String label() { return label + " (L" + level + ")"; }              // metadata only
    }
    Checkpoint checkpoint(String label) { return new Checkpoint(this, label); }
    void load(Checkpoint c) { level = c.level; hp = c.hp; coins = c.coins; inventory = new ArrayList<>(c.inventory); }
    void play(String what) {
        switch (what) {
            case "fight" -> { hp -= 40; coins += 30; }
            case "loot" -> inventory.add("potion");
            case "boss" -> { hp -= 90; inventory.remove("potion"); }
            case "next" -> level++;
        }
    }
    boolean dead() { return hp <= 0; }
    public String toString() { return "L" + level + " hp=" + hp + " coins=" + coins + " " + inventory; }
}
class SaveManager {
    private final Game game; private final Map<Integer, Game.Checkpoint> slots = new TreeMap<>();
    private final Deque<Game.Checkpoint> auto = new ArrayDeque<>(); private static final int MAX_AUTO = 5;
    SaveManager(Game g) { game = g; }
    void saveTo(int slot, String label) { slots.put(slot, game.checkpoint(label)); }
    void autosave() { auto.push(game.checkpoint("auto")); if (auto.size() > MAX_AUTO) auto.pollLast(); }
    void loadSlot(int slot) { game.load(slots.get(slot)); }
    void loadLatestAuto() { game.load(auto.peek()); }
    String listSlots() { StringBuilder sb = new StringBuilder(); slots.forEach((k, v) -> sb.append(k).append(": ").append(v.label()).append("  ")); return sb.toString().trim(); }
}

Game g = new Game(); SaveManager saves = new SaveManager(g);
g.play("fight"); g.play("loot"); g.play("next"); saves.saveTo(1, "before boss");
for (int i = 0; i < 7; i++) saves.autosave();                                  // only the last 5 are kept
g.play("boss"); g.play("fight");
System.out.println("now: " + g + (g.dead() ? "  (dead)" : ""));
saves.loadSlot(1); System.out.println("loaded slot 1: " + g);
System.out.println("slots: " + saves.listSlots());`,
        follow: "The inventory is copied in both directions: into the checkpoint (so later play can't change it) and back out (so playing after a load can't change the saved slot)." },
      { title: "Mini LLD: transactional cart update with rollback",
        text: "\"Apply offer\" in a grocery app changes many things at once: swaps items for a combo, adjusts quantities, applies a coupon and recalculates delivery. If any rule fails (combo out of stock, cart below the coupon minimum), the cart must be exactly as before. The service takes a memento, attempts the changes and restores on failure, like a database savepoint.",
        code: `class Cart {
    private final Map<String, Integer> qty = new LinkedHashMap<>(); private String coupon;
    record Memento(Map<String, Integer> qty, String coupon) {}               // immutable snapshot (order kept)
    Memento save() { return new Memento(Collections.unmodifiableMap(new LinkedHashMap<>(qty)), coupon); }
    void restore(Memento m) { qty.clear(); qty.putAll(m.qty()); coupon = m.coupon(); }
    void set(String item, int n) { if (n == 0) qty.remove(item); else qty.put(item, n); }
    void coupon(String c, int minItems) {
        int items = qty.values().stream().mapToInt(Integer::intValue).sum();
        if (items < minItems) throw new IllegalStateException(c + " needs " + minItems + " items, cart has " + items);
        coupon = c;
    }
    public String toString() { return qty + (coupon == null ? "" : " coupon=" + coupon); }
}
class OfferService {
    void apply(Cart cart, Runnable changes) {
        Cart.Memento before = cart.save();
        try { changes.run(); }
        catch (RuntimeException e) { cart.restore(before); System.out.println("rolled back: " + e.getMessage()); }
    }
}
Cart cart = new Cart(); cart.set("milk", 2); cart.set("bread", 1);
new OfferService().apply(cart, () -> { cart.set("bread", 0); cart.set("breakfast-combo", 1); cart.coupon("SAVE50", 5); });
System.out.println("cart: " + cart);
new OfferService().apply(cart, () -> { cart.set("milk", 4); cart.coupon("SAVE50", 5); });
System.out.println("cart: " + cart);`,
        points: ["Here the memento is a `record` nested in `Cart`; its accessors are visible in the package, so this is a pragmatic \"narrow-ish\" interface. For strict opacity use a private-field nested class as in the editor", "The same idea scales up: DB savepoints, Spring's `@Transactional` rollback, Git commits"] }
    ],
    usages: [
      ["`java.io.Serializable` / object streams", "Externalise an object's state to bytes and restore it later (often used to persist mementos)."],
      ["JDBC `Connection.setSavepoint()` / `rollback(savepoint)`", "The database keeps a savepoint you can return to: a memento held by the caretaker (your code) and opaque to it."],
      ["Spring Web Flow / Spring Statemachine persistence; `HttpSession` form state", "Flow or machine state is snapshotted and restored between requests."],
      ["Swing `javax.swing.undo.UndoManager` with `StateEditable` / `StateEdit`", "`StateEdit` stores before/after state of a `StateEditable` object: Memento-style undo in the JDK."],
      ["Git commits, VM snapshots, browser session restore", "Snapshots of state you can return to without understanding their internals."]
    ],
    avoid: {
      points: [
        "State is huge and changes often: full snapshots are too expensive (use commands, deltas or persistent structures)",
        "Restoring is impossible because state lives outside the object (files written, emails sent, payments made): you need compensating actions",
        "State is already immutable: just keep references to old versions, no pattern ceremony needed",
        "Only one field changes: store that value",
        "The caretaker genuinely needs to inspect the state (e.g. show a diff): design an explicit read-only view instead of breaking opacity"],
      pros: ["Undo, checkpoints and rollback without exposing internals", "Originator stays simple; history logic lives in the caretaker", "Exact restoration when copies are deep", "Snapshots can be persisted, sent or compared by identity"],
      cons: ["Memory and time cost of copying state", "Deep-copy mistakes cause shared-mutation bugs", "Caretaker must manage lifetimes (limits, cleanup)", "Persisted mementos need versioning and may leak sensitive data", "Opaque types are awkward in languages without nested-class privacy"] },
    compare: [
      ["Command (F19)", "Undo via inverse operations", "Command stores the operation; Memento stores the state. Commands often hold a memento of what they overwrote"],
      ["Prototype (F09)", "Clone objects", "Both copy state; Prototype creates new working objects, Memento creates restore points for the same object"],
      ["State (F20)", "Behaviour depends on current state", "State changes behaviour; Memento saves and restores data. A state machine can be checkpointed with a memento"],
      ["Iterator (F23)", "Traversal position", "A resumable iterator's position (page token, file offset) is a memento"],
      ["Event sourcing", "Store every change as an event", "Replaying events rebuilds state; periodic snapshots (mementos) speed up replay"]],
    widget: { heading: "Interactive: save and restore a game", caption: "Play, save a checkpoint, take damage, and restore. The caretaker keeps snapshots it cannot read.", render: checkpointWidget },
    pitfalls: [
      "Shallow copies: the memento shares a mutable list with the originator, so later edits change the \"saved\" state",
      "Restoring by sharing the memento's collection with the originator (mutating it corrupts the snapshot)",
      "Exposing memento fields publicly so the caretaker starts depending on them",
      "Unbounded history growing until memory runs out",
      "Saving after the change instead of before, so undo restores the current state",
      "Forgetting to clear the redo stack on a new edit",
      "Persisting mementos without a version, breaking old saves after an upgrade",
      "Capturing secrets (passwords, tokens) or transient resources (open sockets) in snapshots"
    ],
    quiz: [
      { q: "What is Memento's intent?", options: ["Share objects", "Capture and restore an object's state without breaking encapsulation", "Notify observers", "Iterate collections"], answer: 1, why: "Snapshots owned by the originator." },
      { q: "Who creates a memento?", options: ["The caretaker", "The originator", "The client always", "A factory"], answer: 1, why: "Only the originator knows its state." },
      { q: "What may the caretaker do with a memento?", options: ["Read and modify its fields", "Store it and hand it back; not inspect it", "Merge two mementos", "Serialise its private fields itself"], answer: 1, why: "Narrow interface." },
      { q: "How does Java keep a memento opaque?", options: ["Public fields", "A nested class with private fields that the enclosing originator can read", "Reflection", "Static methods"], answer: 1, why: "Enclosing classes can access nested private members." },
      { q: "Why copy lists when creating a memento?", options: ["Speed", "Otherwise later changes to the originator's list also change the snapshot", "Java requires it", "To sort them"], answer: 1, why: "Deep vs shallow copy." },
      { q: "Memento vs Command for undo?", options: ["Same", "Memento restores a snapshot of state; Command applies an inverse operation", "Command uses snapshots only", "Memento needs inverses"], answer: 1, why: "State vs operation." },
      { q: "Which is a Memento-like JDBC feature?", options: ["`PreparedStatement`", "`Connection.setSavepoint()` and `rollback(savepoint)`", "`ResultSet.next()`", "`DriverManager`"], answer: 1, why: "Opaque restore point." },
      { q: "When is Memento a poor choice?", options: ["Small state", "Huge state changed every keystroke, or effects outside the object (emails sent) that a snapshot can't undo", "Game saves", "Form drafts"], answer: 1, why: "Cost and external side effects." }
    ],
    cheatsheet: {
      table: [
        ["Role", "Does", "Example"],
        ["Originator", "`save()` / `restore(m)`", "`Editor`, `Game`, `Cart`"],
        ["Memento", "immutable, opaque snapshot", "`Editor.Snapshot`, `Checkpoint`"],
        ["Caretaker", "when to save, where to keep", "`History`, `SaveManager`, `OfferService`"]],
      cards: [
        { title: "Get it right", items: ["Snapshot **before** the change", "Deep-copy mutable parts both ways", "Make mementos immutable", "Clear redo on new edits", "Bound the history"] },
        { title: "Use for", items: ["Undo/redo", "Game checkpoints", "Rollback of multi-step changes", "Drafts/autosave", "Resumable jobs (offsets)"] },
        { title: "Interview lines", items: ["Wide vs narrow interface", "Memento vs Command undo", "Memory: limits, deltas, persistence", "Savepoints, snapshots in event sourcing"] }]
    },
    practice: [
      { level: "Easy", q: "Name the three roles in Memento and what each is allowed to do.",
        a: ["**Originator**: owns the state; creates mementos (`save`) and restores from them. Has the **wide** interface: full access to memento contents.",
          "**Memento**: an immutable snapshot of the originator's state.",
          "**Caretaker**: decides when to snapshot and restore, stores mementos (stack, slots), but sees only the **narrow** interface: an opaque token, maybe some metadata like a label or time."] },
      { level: "Easy", q: "Find the bug: undo restores the wrong items after the user keeps editing.",
        code: `class TodoList {
    private List<String> items = new ArrayList<>();
    record Memento(List<String> items) {}
    Memento save() { return new Memento(items); }                            // BUG: shares the live list
    void restore(Memento m) { items = m.items(); }
    void add(String s) { items.add(s); }
    List<String> items() { return items; }
}
TodoList t = new TodoList(); t.add("pay rent");
TodoList.Memento m = t.save();
t.add("buy milk");
t.restore(m);
System.out.println("after undo (buggy): " + t.items());`,
        follow: "Fix: `new Memento(List.copyOf(items))` when saving and `items = new ArrayList<>(m.items())` when restoring. The first copy freezes the snapshot; the second stops future edits from mutating it." },
      { level: "Medium", q: "Implement bounded undo history (keep only the last 3 snapshots).",
        code: `class Counter {
    private int value;
    record Snap(int value) {}
    Snap save() { return new Snap(value); }
    void restore(Snap s) { value = s.value(); }
    void add(int d) { value += d; }
    int value() { return value; }
}
class BoundedHistory {
    private final Deque<Counter.Snap> stack = new ArrayDeque<>(); private final int max;
    BoundedHistory(int max) { this.max = max; }
    void push(Counter.Snap s) { stack.push(s); if (stack.size() > max) stack.pollLast(); }   // drop the oldest
    Optional<Counter.Snap> pop() { return Optional.ofNullable(stack.poll()); }
}
Counter c = new Counter(); BoundedHistory h = new BoundedHistory(3);
for (int i = 1; i <= 5; i++) { h.push(c.save()); c.add(10); }
StringBuilder sb = new StringBuilder("value " + c.value() + "; undo:");
Optional<Counter.Snap> s;
while ((s = h.pop()).isPresent()) { c.restore(s.get()); sb.append(' ').append(c.value()); }
System.out.println(sb + " (can't go below 20: older snapshots were dropped)");`,
        follow: "An `ArrayDeque` as a stack with `pollLast()` gives O(1) bounded history. Editors usually bound by memory size, not count." },
      { level: "Medium", q: "Undo for a drawing app: when would you choose Command, when Memento, and can you combine them?",
        a: ["**Command** for small, invertible actions: move shape (store dx, dy), change colour (store old colour), add/delete shape (store the shape). Memory is tiny.",
          "**Memento** for actions without a clean inverse: \"auto-arrange\", applying a filter, running a plugin script. Snapshot the affected layer before running.",
          "**Combine**: a `Command` whose `undo()` restores a memento captured in `execute()` (`AutoArrangeCommand` holds a `LayerSnapshot`). The undo stack holds only commands; some carry snapshots.",
          "Add coalescing (merge consecutive moves) and a memory cap."] },
      { level: "Medium", q: "How would you implement \"save draft\" for a long loan-application form that survives app restarts?",
        a: ["`ApplicationForm` (originator) exposes `Draft snapshot()` and `restore(Draft)`; `Draft` is an immutable record with a `schemaVersion`.",
          "`DraftStore` (caretaker) persists drafts as JSON per user and form id; autosave every N seconds or on step change, debounced.",
          "Exclude sensitive fields (OTP, card CVV, passwords) from the snapshot, and encrypt PII at rest.",
          "On load: check version, migrate older drafts (renamed fields), validate before restoring.",
          "Expiry: delete drafts after 30 days; one draft per form per user."] },
      { level: "Medium", q: "Why is an iterator's page token or a Kafka consumer offset a memento?",
        a: ["It captures the position of a traversal (internal state of the iterator/consumer) as an opaque value.",
          "The caretaker (your job, or Kafka's committed offsets) stores it and hands it back later to resume.",
          "The caretaker doesn't interpret it: a cursor token might encode a sort key and an id, but clients mustn't parse it.",
          "Same benefits and pitfalls: tokens may expire or become invalid if the underlying data's format changes (versioning)."] },
      { level: "Hard", q: "Event sourcing stores every change as an event. Where do mementos (snapshots) fit, and why?",
        a: ["The current state is rebuilt by replaying all events from the start; after millions of events that is slow.",
          "Periodically store a **snapshot** (memento) of the aggregate at event N. Rebuild = load the latest snapshot + replay events after N.",
          "Snapshots are an optimisation, not the source of truth: they can be deleted and rebuilt.",
          "Version snapshots with the aggregate's schema; when the model changes, rebuild snapshots from events.",
          "This is Memento (snapshots) and Command (events as operations) working together."] },
      { level: "Hard", q: "Large documents: implement cheap snapshots by making state immutable and sharing structure. Show the idea with a persistent list.",
        code: `record Node(String value, Node next) {}                                    // immutable linked list
class Doc {
    private Node lines;                                                       // most recent line first
    Node snapshot() { return lines; }                                         // O(1): just keep the reference
    void restore(Node s) { lines = s; }
    void addLine(String s) { lines = new Node(s, lines); }                    // new head shares the rest
    String show() { List<String> out = new ArrayList<>(); for (Node n = lines; n != null; n = n.next()) out.add(0, n.value()); return out.toString(); }
}
Doc d = new Doc();
d.addLine("Title"); d.addLine("Intro");
Node v1 = d.snapshot();
d.addLine("Pricing"); d.addLine("FAQ");
Node v2 = d.snapshot();
System.out.println("v2: " + d.show());
d.restore(v1); System.out.println("restored v1: " + d.show());
System.out.println("v2 shares v1's nodes: " + (v2.next().next() == v1));`,
        follow: "With immutable structures, a memento is just a reference to an old version; unchanged parts are shared, so memory grows with the size of changes, not the document. Ropes and persistent vectors (HAMT/RRB trees) generalise this for editors and functional languages." }
    ],
    recap: [
      "Memento lets an originator snapshot and restore its own state while caretakers keep snapshots they can't read.",
      "In Java: a nested class with private fields (or a record within the package) gives the wide/narrow interface split.",
      "Snapshot before changes, deep-copy mutable parts both ways, make mementos immutable, bound the history.",
      "Undo via Memento (state) vs Command (inverse ops); combine for hard-to-invert actions.",
      "Shows up as game saves, drafts, DB savepoints, cursor tokens, and snapshots in event sourcing."
    ]
  });
})();
