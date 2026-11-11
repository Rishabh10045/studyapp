/* Lesson F09: Prototype */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  /* Widget: shallow vs deep copy. Pick a copy strategy, mutate the copy, see whether the original changes. */
  var COPIES = {
    ref: { label: "b = a (no copy)", shares: { top: true, address: true, items: true }, note: "Not a copy at all: both variables point to the same object." },
    shallow: { label: "super.clone() (shallow)", shares: { top: false, address: true, items: true }, note: "`Object.clone()` copies fields bit by bit: primitives and Strings are fine, but the `Address` and the `List` are **shared** references." },
    deep: { label: "deep copy (copy constructor)", shares: { top: false, address: false, items: false }, note: "Each mutable part is copied: `new Address(a.address)`, `new ArrayList<>(a.items)`. The copy is fully independent." },
    immut: { label: "immutable parts (records + List.copyOf)", shares: { top: false, address: "imm", items: "imm" }, note: "Sharing **immutable** parts is safe and cheap: nobody can mutate them, so \"changing\" means replacing with a new value." }
  };
  var MUTS = [
    ["name", "copy.name = \"Rahul\"", "top"],
    ["city", "copy.address.city = \"Delhi\"", "address"],
    ["item", "copy.items.add(\"Laptop\")", "items"]
  ];
  function protoWidget(el, ctx) {
    var s = ctx.state; if (!s.copy) { s.copy = "shallow"; s.done = []; }
    el.innerHTML = "<p>" + ctx.md("The original is `Order a` with a `name`, an `Address` and a `List<String> items`. Choose how `copy` is made, then apply mutations **to the copy** and watch the original.") + "</p>" +
      "<div class='field'>How is the copy made?</div><div class='seg' data-r='copy'></div><p data-r='note' style='margin-top:8px'></p>" +
      "<div class='field'>Mutate the copy</div><div class='btnrow' data-r='muts'></div>" +
      "<div class='grid2' style='margin-top:10px'><div><div class='field'>Original a</div><pre class='code' data-r='a'></pre></div><div><div class='field'>Copy</div><pre class='code' data-r='b'></pre></div></div>" +
      "<div class='result' data-r='res'></div><div class='btnrow'><button type='button' class='btn' data-r='reset'>Reset</button></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var C = COPIES[s.copy];
      q("copy").innerHTML = Object.keys(COPIES).map(function (k) { return "<button type='button' data-c='" + k + "' class='" + (k === s.copy ? "on" : "") + "'>" + ctx.esc(COPIES[k].label) + "</button>"; }).join("");
      q("note").innerHTML = ctx.md(C.note);
      q("muts").innerHTML = MUTS.map(function (m) {
        var imm = C.shares[m[2]] === "imm", label = imm ? (m[0] === "city" ? "copy = copy.withAddress(new Address(\"Delhi\"))" : "copy = copy.withItem(\"Laptop\")") : m[1];
        return "<button type='button' class='btn' data-m='" + m[0] + "'" + (s.done.indexOf(m[0]) >= 0 ? " disabled" : "") + "><code>" + ctx.esc(label) + "</code></button>";
      }).join("");
      var orig = { name: "Asha", city: "Pune", items: ["Phone"] }, cp = { name: "Asha", city: "Pune", items: ["Phone"] }, leaks = [];
      s.done.forEach(function (m) {
        var part = m === "name" ? "top" : m === "city" ? "address" : "items", shared = C.shares[part] === true;
        if (m === "name") { cp.name = "Rahul"; if (shared) orig.name = "Rahul"; }
        if (m === "city") { cp.city = "Delhi"; if (shared) orig.city = "Delhi"; }
        if (m === "item") { cp.items = cp.items.concat(["Laptop"]); if (shared) orig.items = orig.items.concat(["Laptop"]); }
        if (shared) leaks.push(m);
      });
      function show(o) { return "Order{name=\"" + o.name + "\",\n  address=Address{city=\"" + o.city + "\"},\n  items=" + JSON.stringify(o.items) + "}"; }
      q("a").textContent = show(orig); q("b").textContent = show(cp);
      var res = q("res");
      if (!s.done.length) { res.className = "result warn"; res.innerHTML = "<div class='out'>Apply a mutation to the copy</div>"; }
      else if (leaks.length) { res.className = "result err"; res.innerHTML = "<div class='out'>The original changed (" + leaks.join(", ") + ")</div><p>" + ctx.md("That's a shared mutable reference. In production this is the classic Prototype bug: a cloned template order silently edits the template.") + "</p>"; }
      else { res.className = "result ok"; res.innerHTML = "<div class='out'>Original unchanged</div><p>" + ctx.md("The copy is independent for every mutation you tried.") + "</p>"; }
    }
    el.addEventListener("click", function (e) {
      var c = e.target.closest("button[data-c]"), m = e.target.closest("button[data-m]"), r = e.target.closest("[data-r='reset']");
      if (c) { s.copy = c.getAttribute("data-c"); s.done = []; }
      else if (m) s.done.push(m.getAttribute("data-m"));
      else if (r) s.done = [];
      else return;
      ctx.save(); draw();
    });
    draw();
  }

  H.pattern({
    code: "F09", name: "Prototype",
    summary: "Prototype creates new objects by copying a configured instance instead of building from scratch. This lesson covers why `Cloneable`/`Object.clone()` is considered broken and what to use instead (copy constructors, copy factories, `toBuilder`), shallow vs deep copies and how shared references leak, a prototype registry, mini designs for document/invoice templates and a shape editor's copy-paste, immutable objects as the simplest prototypes, JDK and Spring usages (including Spring's `prototype` bean scope, which is a different thing), and comparisons with Builder, Factory and Memento.",
    intent: "Specify the kinds of objects to create using a **prototypical instance**, and create new objects by **copying** that prototype.",
    problem: {
      text: "Some objects are expensive or tedious to configure: a report template with 40 settings, a game unit with stats loaded from a file, a graph of shapes the user drew. Building another one from scratch duplicates that work, and code that only holds a `Shape` reference can't call `new Circle(...)` because it doesn't know the concrete class.",
      points: [
        "Copy a **configured** object and tweak it, instead of repeating the configuration",
        "Copy objects **through an interface** (`shape.copy()`) without knowing their concrete class",
        "Keep a **registry of prototypes** (templates) and stamp out copies: `templates.get(\"GST-B2B\").copy()`",
        "The hard part is **depth**: which references are copied, and which are shared"],
      code: `interface Shape { }
record Circle(int r, String color) implements Shape { }
record Rect(int w, int h, String color) implements Shape { }

// Duplicating a selection without a copy method: the client must know every concrete type
static Shape duplicate(Shape s) {
    if (s instanceof Circle c) return new Circle(c.r(), c.color());
    if (s instanceof Rect r) return new Rect(r.w(), r.h(), r.color());
    throw new IllegalArgumentException("unknown shape " + s);     // a new shape type breaks this
}

System.out.println(duplicate(new Rect(2, 3, "red")));` },
    analogy: "Cell division, or a photocopier. You don't rebuild a contract from a blank page: you photocopy the signed template and fill in today's names. Whether the copy's staples hold the *same* attachments or fresh copies of them is the shallow-vs-deep question.",
    structure: {
      text: "The **Prototype** interface declares `copy()` (GoF: `clone()`). Each **ConcretePrototype** implements it by copying itself (deciding how deep). The **Client** asks an existing object to copy itself. A **PrototypeRegistry** often stores named, preconfigured prototypes.",
      m: H.cd(["classDiagram",
        "  class Prototype { <<interface>>; +copy() Prototype }",
        "  class Circle { -int radius; -Style style; +copy() Circle }",
        "  class Rect { -int w; -int h; -Style style; +copy() Rect }",
        "  class PrototypeRegistry { -Map~String, Prototype~ items; +register(String key, Prototype p) void; +create(String key) Prototype }",
        "  class Client",
        "  Prototype <|.. Circle",
        "  Prototype <|.. Rect",
        "  PrototypeRegistry o-- Prototype",
        "  Client ..> Prototype : copy()",
        "  Client --> PrototypeRegistry"]),
      roles: [["Prototype", "Interface with `copy()`; Java code should prefer this over `Cloneable`"], ["ConcretePrototype", "Knows how to copy itself, including which fields need deep copies"], ["PrototypeRegistry", "Named templates; `create(key)` returns a copy, never the stored instance"], ["Client", "Creates objects by asking a prototype to copy itself"]],
      points: ["Covariant return types let `Circle.copy()` return `Circle`", "The registry must return copies; handing out the stored prototype lets callers corrupt the template"] },
    impl: {
      title: "Java implementation: copy constructors, not Cloneable",
      text: "*Effective Java* Item 13 (\"Override clone judiciously\") explains why `Cloneable` is broken: it's a marker interface with no `clone()` method, `Object.clone()` is protected and creates objects without calling a constructor, it's shallow by default, it fights with `final` fields, and it throws a checked `CloneNotSupportedException`. The recommended approach is a **copy constructor** or **copy factory**, exposed through your own `copy()` method.",
      points: [
        "`copy()` declared on your own interface, implemented with a copy constructor",
        "Deep-copy mutable fields (`Style`, collections); share immutable ones (`String`, records, `List.copyOf` results)",
        "`final` fields work naturally with constructors (they don't with `clone()`)"],
      code: `interface Shape { Shape copy(); Shape moveBy(int dx, int dy); }

final class Style {                       // mutable: must be deep-copied
    String fill; int stroke;
    Style(String fill, int stroke) { this.fill = fill; this.stroke = stroke; }
    Style(Style o) { this(o.fill, o.stroke); }                    // copy constructor
    public String toString() { return fill + "/" + stroke; }
}

final class Circle implements Shape {
    private final int x, y, r; private final Style style;
    Circle(int x, int y, int r, Style style) { this.x = x; this.y = y; this.r = r; this.style = style; }
    private Circle(Circle o) { this(o.x, o.y, o.r, new Style(o.style)); }   // deep copy of the mutable part
    public Circle copy() { return new Circle(this); }                       // covariant return
    public Circle moveBy(int dx, int dy) { return new Circle(x + dx, y + dy, r, new Style(style)); }
    Style style() { return style; }
    public String toString() { return "Circle(" + x + "," + y + ", r=" + r + ", " + style + ")"; }
}

List<Shape> selection = List.of(new Circle(10, 10, 5, new Style("red", 1)));
List<Shape> pasted = selection.stream().map(s -> s.copy().moveBy(20, 0)).toList();   // no instanceof, no concrete types
((Circle) pasted.get(0)).style().fill = "blue";                                     // edit the pasted copy
System.out.println(selection + " -> " + pasted);                                    // original stays red` },
    variants: [
      { title: "Shallow vs deep copy, and doing clone() right if you must",
        text: "A **shallow** copy duplicates the top-level object but shares everything it references. A **deep** copy also copies the referenced mutable objects (recursively, as far as needed). Most Prototype bugs are an accidental shallow copy of a mutable collection. Try it in the widget below.",
        table: [
          ["Field type", "Shallow copy", "What to do"],
          ["primitives (`int`, `long`)", "copied by value", "nothing"],
          ["immutable objects (`String`, `Integer`, records, `LocalDate`, `List.copyOf` results)", "shared, but safe", "share them"],
          ["mutable objects (`Address` with setters, `Date`, arrays)", "**shared**: a bug waiting to happen", "copy constructor / `.clone()` for arrays"],
          ["mutable collections (`ArrayList`, `HashMap`)", "**shared**", "`new ArrayList<>(old)` (+ deep-copy elements if they're mutable)"],
          ["references to shared services (a `Logger`, a repository)", "shared", "share them: they aren't part of the object's state"]],
        points: ["If you're maintaining code that uses `Cloneable`: call `super.clone()`, then replace every mutable field with a copy, and catch `CloneNotSupportedException` (it can't happen if you implement `Cloneable`)", "Arrays are the one place `clone()` is idiomatic: `int[] b = a.clone()`"],
        code: `class Address implements Cloneable {
    String city;
    Address(String city) { this.city = city; }
    @Override public Address clone() {
        try { return (Address) super.clone(); } catch (CloneNotSupportedException e) { throw new AssertionError(e); }
    }
}

class Order implements Cloneable {
    String name; Address address; List<String> items = new ArrayList<>(); int[] qty = {1};

    Order shallow() {
        try { return (Order) super.clone(); } catch (CloneNotSupportedException e) { throw new AssertionError(e); }
    }
    @Override public Order clone() {                         // deep where it matters
        Order o = shallow();
        o.address = address.clone();
        o.items = new ArrayList<>(items);
        o.qty = qty.clone();
        return o;
    }
}

Order a = new Order(); a.name = "Asha"; a.address = new Address("Pune"); a.items.add("Phone");
Order s = a.shallow(); s.address.city = "Delhi"; s.items.add("Laptop");
System.out.println("after shallow-copy edits, original: " + a.address.city + " " + a.items);   // Delhi [Phone, Laptop]
a.address.city = "Pune"; a.items.remove("Laptop");
Order d = a.clone(); d.address.city = "Delhi"; d.items.add("Laptop"); d.qty[0] = 9;
System.out.println("after deep-copy edits, original: " + a.address.city + " " + a.items + " qty=" + a.qty[0]);   // Pune [Phone] 1` },
      { title: "Prototype registry: named templates",
        text: "Store preconfigured prototypes under names and hand out **copies**. This replaces a family of subclasses (or a big factory switch) with data: adding a template is a `register` call, possibly loaded from config or a database at startup.",
        points: [
          "`create(key)` must return `copy()`, never the stored prototype",
          "Registered prototypes should themselves be effectively immutable after registration",
          "Typical uses: document/invoice templates, game unit archetypes, default configurations per tenant, test fixtures",
          "Combine with a builder: `registry.create(\"premium\").toBuilder().discount(5).build()`"],
        code: `final class InvoiceTemplate {
    final String series, footer; final int dueDays; final Map<String, Integer> taxes;
    InvoiceTemplate(String series, String footer, int dueDays, Map<String, Integer> taxes) {
        this.series = series; this.footer = footer; this.dueDays = dueDays; this.taxes = new LinkedHashMap<>(taxes);
    }
    InvoiceTemplate copy() { return new InvoiceTemplate(series, footer, dueDays, taxes); }   // deep: new map
    public String toString() { return series + " due+" + dueDays + " " + taxes + " '" + footer + "'"; }
}

final class TemplateRegistry {
    private final Map<String, InvoiceTemplate> prototypes = new HashMap<>();
    void register(String key, InvoiceTemplate t) { prototypes.put(key, t.copy()); }     // store a private copy
    InvoiceTemplate create(String key) {
        InvoiceTemplate p = prototypes.get(key);
        if (p == null) throw new IllegalArgumentException("no template " + key);
        return p.copy();                                                                 // hand out copies
    }
}

TemplateRegistry reg = new TemplateRegistry();
reg.register("GST-B2B", new InvoiceTemplate("INV-B2B", "Thank you for your business", 30, Map.of("CGST", 9, "SGST", 9)));
reg.register("EXPORT", new InvoiceTemplate("INV-EXP", "Zero-rated supply (LUT)", 45, Map.of("IGST", 0)));

InvoiceTemplate t = reg.create("GST-B2B");
t.taxes.put("CESS", 1);                                    // customise this invoice only
System.out.println(t);
System.out.println(reg.create("GST-B2B"));                // template untouched` },
      { title: "Immutability: the prototype you never need to copy",
        text: "If an object is **immutable**, you can share it freely, and \"copy with one change\" becomes a *wither* that returns a new object. Records make this cheap. Many modern Java codebases get the benefits of Prototype without `copy()` at all: share immutable templates, derive variants with `withX(...)` or `toBuilder()`.",
        points: [
          "Immutable objects are thread-safe and can be cached and shared (that's also the basis of Flyweight, F16)",
          "Withers copy only what changes; unchanged immutable parts are shared structurally",
          "Avoid deep copy via serialization (`ObjectOutputStream` round trip): slow, requires `Serializable` everywhere, and bypasses constructors",
          "Copy libraries (Apache `SerializationUtils.clone`, reflection-based mappers) hide the depth decision. Be explicit in interview code"],
        code: `record Address(String line1, String city) {
    Address withCity(String c) { return new Address(line1, c); }
}
record Customer(String name, Address address, List<String> tags) {
    Customer { tags = List.copyOf(tags); }                           // immutable component
    Customer withAddress(Address a) { return new Customer(name, a, tags); }
    Customer withTag(String t) { List<String> n = new ArrayList<>(tags); n.add(t); return new Customer(name, address, n); }
}

Customer base = new Customer("Asha", new Address("12 MG Road", "Pune"), List.of("gold"));
Customer moved = base.withAddress(base.address().withCity("Delhi")).withTag("relocated");
System.out.println(base);
System.out.println(moved);
System.out.println("tags list shared? " + (base.tags() == moved.tags()) + ", name shared? " + (base.name() == moved.name()));` }
    ],
    designs: [
      { title: "Mini LLD: copy-paste in a diagram editor",
        text: "Users select shapes (including **groups** of shapes) and press Ctrl+C / Ctrl+V. The clipboard must hold a snapshot (later edits to the originals shouldn't change what gets pasted), and each paste creates fresh objects with new IDs, offset by 10px. Groups must be deep-copied recursively. That's Prototype + Composite (F14).",
        points: [
          "`Shape.copy()` on every shape; `Group.copy()` copies its children recursively",
          "Copies get **new IDs** (identity isn't cloned) but keep style and geometry",
          "`Clipboard.copy(selection)` stores copies; `paste()` copies again, so pasting twice gives two independent sets",
          "The editor never uses `instanceof` to duplicate, so a new shape type only needs its own `copy()`"],
        m: H.cd(["classDiagram",
          "  class Shape { <<interface>>; +id() int; +copy() Shape; +moveBy(int dx, int dy) void }",
          "  class Rect { -int x; -int y; -int w; -int h }",
          "  class Text { -String text }",
          "  class Group { -List~Shape~ children; +copy() Shape }",
          "  class Clipboard { -List~Shape~ snapshot; +copy(List~Shape~ sel) void; +paste() List~Shape~ }",
          "  Shape <|.. Rect", "  Shape <|.. Text", "  Shape <|.. Group",
          "  Group o-- Shape : children",
          "  Clipboard --> Shape"]),
        code: `abstract class Shape {
    private static final AtomicInteger IDS = new AtomicInteger();
    final int id = IDS.incrementAndGet();               // identity is never copied
    int x, y;
    Shape(int x, int y) { this.x = x; this.y = y; }
    abstract Shape copy();
    void moveBy(int dx, int dy) { x += dx; y += dy; }
}
class Rect extends Shape {
    final int w, h;
    Rect(int x, int y, int w, int h) { super(x, y); this.w = w; this.h = h; }
    Rect copy() { return new Rect(x, y, w, h); }
    public String toString() { return "Rect#" + id + "(" + x + "," + y + ")"; }
}
class Group extends Shape {
    final List<Shape> children = new ArrayList<>();
    Group(List<Shape> kids) { super(0, 0); children.addAll(kids); }
    Group copy() { return new Group(children.stream().map(Shape::copy).toList()); }   // recursive deep copy
    void moveBy(int dx, int dy) { children.forEach(c -> c.moveBy(dx, dy)); }
    public String toString() { return "Group#" + id + children; }
}
class Clipboard {
    private List<Shape> snapshot = List.of();
    void copy(List<Shape> selection) { snapshot = selection.stream().map(Shape::copy).toList(); }
    List<Shape> paste() {
        List<Shape> out = snapshot.stream().map(Shape::copy).toList();
        out.forEach(s -> s.moveBy(10, 10));
        return out;
    }
}

Rect r = new Rect(0, 0, 50, 20);
Group g = new Group(List.of(new Rect(100, 0, 10, 10), new Rect(120, 0, 10, 10)));
Clipboard cb = new Clipboard();
cb.copy(List.of(r, g));
r.moveBy(500, 500);                                    // edit the original after copying
System.out.println("paste 1: " + cb.paste());
System.out.println("paste 2: " + cb.paste());
System.out.println("original: " + r + " " + g);` },
      { title: "Mini LLD: spawning game units from archetypes",
        text: "A strategy game defines unit archetypes (Archer, Knight, Healer) in a data file: stats, abilities, sprite. Loading and validating the file is expensive, so it happens once; spawning a unit copies the archetype and gives it its own position, HP and cooldown state. Designers can add a \"Fire Archer\" by editing data, with no new class.",
        points: [
          "`UnitRegistry` loads archetypes once and keeps them as prototypes",
          "Per-instance mutable state (HP, position, cooldowns) is fresh in each copy; shared immutable data (abilities list, base stats) is shared",
          "Variants are prototypes derived from others: a fire archer is the archer plus a `burn` ability",
          "The alternative, a subclass per unit type, would mean recompiling for every balance change"],
        code: `record Stats(int maxHp, int attack, int range) {}
final class Unit {
    final String kind; final Stats stats; final List<String> abilities;     // shared, immutable
    int hp, x, y; final Map<String, Integer> cooldowns = new HashMap<>();   // per-instance, mutable
    Unit(String kind, Stats stats, List<String> abilities) {
        this.kind = kind; this.stats = stats; this.abilities = List.copyOf(abilities); hp = stats.maxHp();
    }
    Unit spawnAt(int x, int y) { Unit u = new Unit(kind, stats, abilities); u.x = x; u.y = y; return u; }
    Unit variant(String kind, String extraAbility) {
        List<String> a = new ArrayList<>(abilities); a.add(extraAbility);
        return new Unit(kind, stats, a);
    }
    public String toString() { return kind + "@" + x + "," + y + " hp=" + hp + " " + abilities; }
}
final class UnitRegistry {
    private final Map<String, Unit> archetypes = new HashMap<>();
    UnitRegistry() {                                         // imagine parsing units.json once
        Unit archer = new Unit("Archer", new Stats(60, 12, 5), List.of("volley"));
        archetypes.put("archer", archer);
        archetypes.put("fire-archer", archer.variant("Fire Archer", "burn"));
        archetypes.put("knight", new Unit("Knight", new Stats(150, 20, 1), List.of("charge", "shield")));
    }
    Unit spawn(String key, int x, int y) { return Objects.requireNonNull(archetypes.get(key), key).spawnAt(x, y); }
}

UnitRegistry units = new UnitRegistry();
Unit a1 = units.spawn("archer", 1, 1), a2 = units.spawn("archer", 5, 5);
a1.hp -= 40;                                                 // damage one unit only
System.out.println(a1 + " | " + a2 + " | " + units.spawn("fire-archer", 0, 0));
System.out.println("abilities shared: " + (a1.abilities == a2.abilities));` }
    ],
    usages: [
      ["`Object.clone()` / `Cloneable`", "The JDK's built-in (and flawed) prototype mechanism; `ArrayList`, `HashMap`, `ArrayDeque` and arrays implement `clone()` as shallow copies."],
      ["Copy constructors in collections", "`new ArrayList<>(other)`, `new HashMap<>(other)`, `new TreeSet<>(sortedSet)` are copy constructors, the recommended alternative to `clone()`."],
      ["`List.copyOf`, `Map.copyOf`, `Set.copyOf`", "Immutable snapshot copies; they return the same instance if the argument is already an immutable copy."],
      ["`java.util.Calendar.clone()`, `Date.clone()`", "Legacy mutable date types needed defensive clones; `java.time` types are immutable and simply shared."],
      ["`HttpRequest.newBuilder(original, filter)` (Java 16)", "Create a new request from an existing one, copying its settings: prototype via builder."],
      ["Spring bean scope `prototype`", "Not the GoF pattern: the container creates a **new instance per lookup/injection** from the bean definition (a factory behaviour), rather than copying an object. Know the naming clash."],
      ["Spring `BeanUtils.copyProperties`, MapStruct", "Property-by-property copying between objects (shallow); useful for DTO mapping, not a substitute for deliberate deep copies."]
    ],
    avoid: {
      points: [
        "Objects are cheap to construct and not configured: just use `new` or a factory",
        "Objects with **identity** or external resources (DB connections, sockets, threads, locks) shouldn't be copied",
        "Deep object graphs with cycles: copying is error-prone; reconsider immutability or explicit snapshot DTOs",
        "Don't implement `Cloneable` in new code; provide a copy constructor or `copy()`",
        "If every copy is immediately rebuilt with different values, a Builder is clearer"],
      pros: ["Copy objects without knowing their concrete class", "Avoid repeating expensive configuration", "Templates as data (registry) instead of subclasses", "Easy snapshots for clipboards, undo, what-if experiments"],
      cons: ["Deep vs shallow decisions per field; easy to leak shared mutable state", "`Cloneable` is broken (no constructor call, `final` fields, checked exception)", "Cyclic references complicate deep copies", "Copies of objects with identity (IDs, resources) need special handling"] },
    compare: [
      ["Factory Method / Abstract Factory (F06, F07)", "Create via subclasses or factory objects", "Prototype creates by copying configured instances, so new \"kinds\" can be data (registry entries) instead of classes"],
      ["Builder (F08)", "Assemble one object step by step", "`toBuilder()` is a builder-flavoured prototype: copy, change, and re-validate"],
      ["Memento (F26)", "Snapshot an object's state to restore it later", "Both copy state, but Memento's snapshot is opaque and used for undo, while Prototype's copy is a new live object"],
      ["Flyweight (F16)", "Share immutable intrinsic state among many objects", "Flyweight avoids copies by sharing; Prototype makes copies. Units sharing an immutable abilities list use both"],
      ["Spring prototype scope", "New bean instance per request for it", "A container factory behaviour, despite the name"],
      ["Composite (F14)", "Tree structures", "Copying a composite needs a recursive deep `copy()`, the classic combination"]],
    widget: { heading: "Interactive: shallow vs deep copy", caption: "Choose how a copy is made, then mutate the copy and watch whether the original changes. Your choices are saved.", render: protoWidget },
    examplesHeading: "Real-world analogies and usages",
    examples: [
      ["Analogy: photocopying a signed template", "Copy the template, fill in today's names. If the copy is stapled to the *same* annex as the original (shallow), writing on the annex changes both."],
      ["Analogy: cell division", "One cell becomes two with the same DNA, then each lives its own life: identity and state diverge after the copy."],
      ["Document and email templates", "Invoice, contract and email templates are stored once and copied per use (registry of prototypes)."],
      ["Game development", "Unit and level archetypes loaded from data and stamped out at spawn time (Unity prefabs work this way)."],
      ["Editors", "Copy-paste and duplicate in Figma, draw.io or IDEs deep-copy the selection and assign new IDs."],
      ["JDK collections", "`new ArrayList<>(list)` copy constructors and `List.copyOf` snapshots everywhere in defensive-copy code."]
    ],
    pitfalls: [
      "Shallow-copying a mutable collection or object, so edits to the copy change the template",
      "Returning the stored prototype from a registry instead of a copy",
      "Using `Cloneable` in new code, then fighting `final` fields and `CloneNotSupportedException`",
      "Copying identity: duplicated IDs, database keys or locks in the cloned object",
      "Deep-copying immutable objects needlessly (wasteful but harmless) or shared services (wrong)",
      "Deep copy via serialization: slow, needs `Serializable` everywhere, bypasses constructors and invariants",
      "Forgetting arrays are mutable: `final int[]` fields still need `.clone()` on copy",
      "Confusing Spring's `prototype` scope with the GoF Prototype pattern"
    ],
    quiz: [
      { q: "What does Prototype do?", options: ["Ensures one instance", "Creates new objects by copying a configured instance, often through an interface without knowing the concrete class", "Builds objects step by step", "Shares immutable state"], answer: 1, why: "\"Create new objects by copying a prototype.\"" },
      { q: "`super.clone()` on an object with an `ArrayList` field gives you…", options: ["A deep copy", "A shallow copy: the copy and the original share the same list", "A compile error", "An immutable copy"], answer: 1, why: "`Object.clone()` copies fields bit by bit; references are shared." },
      { q: "Why does *Effective Java* advise against `Cloneable`?", options: ["It's slow", "It's a marker with no `clone()` method, `Object.clone()` bypasses constructors, is shallow by default, conflicts with `final` fields and throws a checked exception", "It doesn't work on arrays", "It's deprecated"], answer: 1, why: "Prefer copy constructors or copy factories (Item 13)." },
      { q: "Which fields can be safely **shared** between an object and its copy?", options: ["`ArrayList` fields", "Immutable ones: `String`, records, `LocalDate`, `List.copyOf` results", "`int[]` arrays", "`Date` fields"], answer: 1, why: "Nobody can mutate immutable objects, so sharing them is safe and cheap." },
      { q: "A prototype registry's `create(key)` should return…", options: ["The stored prototype", "A copy of the stored prototype", "null if missing", "A new subclass"], answer: 1, why: "Returning the stored instance lets callers corrupt the template for everyone." },
      { q: "Spring's `@Scope(\"prototype\")` means…", options: ["The bean is cloned from a master copy", "The container creates a new instance each time the bean is requested", "One instance per JVM", "The bean is immutable"], answer: 1, why: "It's container-managed creation, not object copying." },
      { q: "When copying a shape for paste, which field should **not** be copied as-is?", options: ["Fill colour", "Its unique ID", "Width", "Height"], answer: 1, why: "Identity shouldn't be duplicated; each copy gets a new ID." },
      { q: "Copying a `Group` of shapes correctly requires…", options: ["Copying only the group object", "Recursively copying each child (deep copy)", "Sharing the children list", "Serialization"], answer: 1, why: "Otherwise moving a pasted group's child moves the original's child too." }
    ],
    cheatsheet: {
      table: [
        ["Technique", "Depth", "Use"],
        ["`b = a`", "no copy", "never, if you want a copy"],
        ["`super.clone()`", "shallow", "legacy code; fix mutable fields afterwards"],
        ["copy constructor / `copy()`", "you decide per field", "default choice"],
        ["`new ArrayList<>(list)`", "shallow list, shared elements", "elements immutable"],
        ["`List.copyOf(list)`", "immutable snapshot", "defensive copies"],
        ["withers / `toBuilder()`", "share unchanged immutable parts", "immutable designs"],
        ["serialization round trip", "deep", "avoid (slow, bypasses constructors)"]],
      cards: [
        { title: "Copy checklist", items: ["Primitives: copied", "Immutables: share", "Mutable objects: copy", "Collections: new collection (+ copy mutable elements)", "Arrays: `.clone()`", "Identity/IDs: regenerate", "Services/resources: share or reattach"] },
        { title: "Registry rules", items: ["Store a private copy on register", "Return copies on create", "Fail fast for unknown keys", "Load templates once at startup"] },
        { title: "Interview lines", items: ["\"I'd avoid Cloneable; copy constructor\"", "\"Deep-copy only the mutable parts\"", "\"Immutable parts are shared safely\"", "\"Registry of templates instead of subclasses\""] }]
    },
    practice: [
      { level: "Easy", q: "Explain shallow vs deep copy. For an `Employee { String name; int age; LocalDate joined; Address address; List<String> skills; Department dept; }`, say which fields need copying in a deep copy.",
        a: ["**Shallow**: new top-level object, same references inside. **Deep**: mutable referenced objects are copied too, so the copy is independent.",
          "`name`, `age`, `joined`: share or copy by value (String and `LocalDate` are immutable).",
          "`address`: copy if `Address` is mutable (`new Address(a.address)`); share if it's a record.",
          "`skills`: new list (`new ArrayList<>(skills)`); Strings inside can be shared.",
          "`dept`: usually **share**. It's a separate entity the employee *refers to*, not part of the employee. Deep-copying it would create a phantom department. Depth follows ownership (composition gets copied, association gets shared)."] },
      { level: "Easy", q: "This \"copy\" has a bug. Find it and fix it.",
        qcode: `class Playlist {
    String name; List<String> songs = new ArrayList<>();
    Playlist(String name) { this.name = name; }
    Playlist(Playlist other) { this.name = other.name; this.songs = other.songs; }
}
Playlist a = new Playlist("Road trip"); a.songs.add("Song A");
Playlist b = new Playlist(a); b.name = "Road trip (copy)"; b.songs.add("Song B");
System.out.println(a.songs);   // [Song A, Song B] ?!`,
        a: "The copy constructor shares the `songs` list, so adding to the copy's list mutates the original's. Copy the collection.",
        code: `class Playlist {
    String name; final List<String> songs;
    Playlist(String name) { this.name = name; this.songs = new ArrayList<>(); }
    Playlist(Playlist other) { this.name = other.name; this.songs = new ArrayList<>(other.songs); }   // new list
}
Playlist a = new Playlist("Road trip"); a.songs.add("Song A");
Playlist b = new Playlist(a); b.name = "Road trip (copy)"; b.songs.add("Song B");
System.out.println(a.songs + " " + b.songs);   // [Song A] [Song A, Song B]` },
      { level: "Medium", q: "Implement document templates (\"resume\", \"weekly report\") with a registry. A document has a title, a mutable list of sections (each with a heading and mutable paragraphs) and a metadata map. Editing a created document must never change the template.",
        code: `final class Section {
    final String heading; final List<String> paragraphs;
    Section(String heading, List<String> paras) { this.heading = heading; this.paragraphs = new ArrayList<>(paras); }
    Section copy() { return new Section(heading, paragraphs); }                    // new paragraph list
}
final class Document {
    String title; final List<Section> sections = new ArrayList<>(); final Map<String, String> meta = new LinkedHashMap<>();
    Document(String title) { this.title = title; }
    Document copy() {
        Document d = new Document(title);
        sections.forEach(s -> d.sections.add(s.copy()));                          // deep: each section copied
        d.meta.putAll(meta);                                                      // Strings are immutable
        return d;
    }
    public String toString() { return title + " " + sections.stream().map(s -> s.heading + s.paragraphs).toList() + " " + meta; }
}
final class Templates {
    private final Map<String, Document> protos = new HashMap<>();
    void register(String k, Document d) { protos.put(k, d.copy()); }
    Document create(String k) { return Objects.requireNonNull(protos.get(k), k).copy(); }
}

Document report = new Document("Weekly report");
report.sections.add(new Section("Highlights", List.of("…")));
report.sections.add(new Section("Risks", List.of()));
report.meta.put("owner", "team-lead");
Templates t = new Templates(); t.register("weekly", report);

Document mine = t.create("weekly");
mine.title = "Week 45"; mine.sections.get(1).paragraphs.add("Vendor delay"); mine.meta.put("owner", "asha");
System.out.println(mine);
System.out.println(t.create("weekly"));` },
      { level: "Medium", q: "Defensive copying is Prototype's cousin. This class claims to be immutable. Show two ways callers can mutate it and fix them.",
        qcode: `final class Booking {
    private final Date start; private final int[] seats;
    Booking(Date start, int[] seats) { this.start = start; this.seats = seats; }
    Date start() { return start; }
    int[] seats() { return seats; }
}`,
        a: ["Attack 1: the caller keeps the `Date`/array passed to the constructor and mutates it afterwards.",
          "Attack 2: the caller mutates what the getters return.",
          "Fix: copy **in** (constructor) and copy **out** (getters), or better, use immutable types (`Instant`, `List.copyOf`) so no copies are needed. Copy *before* validating, to avoid time-of-check/time-of-use races (*Effective Java* Item 50)."],
        code: `final class Booking {
    private final Instant start; private final List<Integer> seats;
    Booking(Instant start, List<Integer> seats) {
        this.start = Objects.requireNonNull(start);         // Instant is immutable: nothing to copy
        this.seats = List.copyOf(seats);                    // copy in (immutable snapshot)
        if (this.seats.isEmpty()) throw new IllegalArgumentException("no seats");   // validate the copy
    }
    Instant start() { return start; }
    List<Integer> seats() { return seats; }                 // safe to return: unmodifiable
}

List<Integer> mine = new ArrayList<>(List.of(4, 5));
Booking b = new Booking(Instant.parse("2026-12-01T18:30:00Z"), mine);
mine.add(6);                                               // attack 1 has no effect
try { b.seats().add(7); } catch (UnsupportedOperationException e) { System.out.println("attack 2 blocked"); }
System.out.println(b.seats());` },
      { level: "Medium", q: "A chess AI evaluates candidate moves by trying them on a **copy** of the board. Implement `Board.copy()` so trying a move never changes the real game, and show it working.",
        code: `final class Board {
    private final char[][] cells = new char[8][8];
    Board() { for (char[] r : cells) Arrays.fill(r, '.'); }
    private Board(Board o) { for (int i = 0; i < 8; i++) cells[i] = o.cells[i].clone(); }   // copy each row
    Board copy() { return new Board(this); }
    void put(int r, int c, char p) { cells[r][c] = p; }
    void move(int r1, int c1, int r2, int c2) { cells[r2][c2] = cells[r1][c1]; cells[r1][c1] = '.'; }
    String row(int r) { return new String(cells[r]); }
}

Board real = new Board();
real.put(6, 4, 'P');                                     // white pawn on e2
Board trial = real.copy();
trial.move(6, 4, 4, 4);                                  // try e2-e4 on the copy
System.out.println("real  row6=" + real.row(6) + " row4=" + real.row(4));
System.out.println("trial row6=" + trial.row(6) + " row4=" + trial.row(4));`,
        follow: "Why isn't `cells.clone()` enough? A 2-D array is an array of row arrays; `clone()` copies only the outer array, so rows would be shared. For performance, real engines use make/unmake move (Command + undo) instead of copying." },
      { level: "Hard", q: "Copy an object graph **with cycles**: employees reference their manager and managers list their reports. A naive recursive copy overflows the stack. Write a deep copy that preserves the structure.",
        a: "Keep an **identity map** from original → copy (`IdentityHashMap`). Before copying a node, check the map; create the copy and register it *before* copying its references, so cycles resolve to the already-created copy. This is how serialization frameworks and deep-copy libraries handle cycles.",
        code: `final class Emp {
    final String name; Emp manager; final List<Emp> reports = new ArrayList<>();
    Emp(String name) { this.name = name; }
}
final class GraphCopier {
    private final Map<Emp, Emp> seen = new IdentityHashMap<>();
    Emp copy(Emp e) {
        if (e == null) return null;
        Emp done = seen.get(e);
        if (done != null) return done;                    // already copied (cycle or shared node)
        Emp c = new Emp(e.name);
        seen.put(e, c);                                   // register BEFORE recursing
        c.manager = copy(e.manager);
        for (Emp r : e.reports) c.reports.add(copy(r));
        return c;
    }
}

Emp boss = new Emp("Meera"), dev = new Emp("Ravi");
dev.manager = boss; boss.reports.add(dev);               // cycle
Emp bossCopy = new GraphCopier().copy(boss);
Emp devCopy = bossCopy.reports.get(0);
System.out.println(devCopy.name + " reports to " + devCopy.manager.name);
System.out.println("cycle preserved in copy: " + (devCopy.manager == bossCopy) + ", independent: " + (bossCopy != boss));` },
      { level: "Hard", q: "Design a **no-code form builder** (like Google Forms templates): admins create form templates (fields, validation rules, sections, branching), users start new forms from templates, and template authors keep editing templates without affecting forms already started. Would you use Prototype, Factory or Builder, and why?",
        steps: [["Prototype for templates", "Form \"kinds\" are **data** created at runtime by admins, so there's no class per form. A `TemplateRegistry` stores templates; `startForm(templateId)` deep-copies the template into a new `FormInstance`. Later template edits don't affect started forms, because they hold copies."],
          ["Versioning", "Instead of copying the whole template into each instance, many real systems store **immutable template versions** and point instances at a version (sharing, not copying). Mention this as the scalable alternative."],
          ["Factory for field types", "`FieldFactory.create(type, config)` turns stored JSON into `TextField`, `NumberField`, `ChoiceField` objects (a registry factory)."],
          ["Builder for authoring", "Admin APIs use a `FormTemplate.Builder` to add sections and fields and validate branching (no references to missing fields) in `build()`."]],
        m: H.cd(["classDiagram",
          "  class FormTemplate { -String id; -int version; -List~Section~ sections; +copy() FormTemplate }",
          "  class Section { -String title; -List~Field~ fields; +copy() Section }",
          "  class Field { <<interface>>; +validate(String v) boolean; +copy() Field }",
          "  class TemplateRegistry { +publish(FormTemplate t) void; +startForm(String id) FormInstance }",
          "  class FormInstance { -FormTemplate snapshot; -Map~String, String~ answers }",
          "  class FieldFactory { +create(String type, Map cfg) Field }",
          "  FormTemplate *-- Section", "  Section *-- Field",
          "  Field <|.. TextField", "  Field <|.. NumberField", "  Field <|.. ChoiceField",
          "  TemplateRegistry o-- FormTemplate",
          "  TemplateRegistry ..> FormInstance : creates",
          "  FormInstance *-- FormTemplate : own copy",
          "  FieldFactory ..> Field"]) },
      { level: "Hard", q: "Why does `Cloneable` break with `final` fields and with subclasses, and what's the alternative for a class hierarchy?",
        a: ["`Object.clone()` creates the copy **without running a constructor**; then you'd have to reassign mutable fields to deep copies, but `final` fields can't be reassigned after construction. So you must give up `final` (and its safety) to clone deeply.",
          "Subclasses: if a parent's `clone()` uses `new Parent(...)` instead of `super.clone()`, a subclass's `clone()` gets a `Parent`, not a subclass instance. Every class in the chain must cooperate, and they all depend on the protected `Object.clone()` contract.",
          "Alternative: an abstract `copy()` with **covariant returns**, implemented in each concrete class with its own copy constructor that calls the parent's copy constructor (`super(other)`). Final fields work, constructors run, and invariants are checked."],
        code: `abstract class Account {
    final String id; final List<String> owners;
    Account(String id, List<String> owners) { this.id = id; this.owners = new ArrayList<>(owners); }
    protected Account(Account o) { this(o.id, o.owners); }               // parent copy constructor
    abstract Account copy();
}
final class Savings extends Account {
    final double rate;
    Savings(String id, List<String> owners, double rate) { super(id, owners); this.rate = rate; }
    private Savings(Savings o) { super(o); rate = o.rate; }               // chains to the parent's
    Savings copy() { return new Savings(this); }                          // covariant return
    public String toString() { return "Savings(" + id + ", " + owners + ", " + rate + ")"; }
}

Account a = new Savings("S1", List.of("Asha"), 0.04);
Account b = a.copy();
b.owners.add("Ravi");
System.out.println(a + " / " + b + " / same class: " + (a.getClass() == b.getClass()));` }
    ],
    recap: [
      "Prototype = create objects by copying a configured instance through `copy()`, without knowing the concrete class.",
      "Avoid `Cloneable`; use copy constructors / copy factories with covariant `copy()` methods.",
      "Decide depth per field: share immutables and associated entities, copy mutable owned parts (collections, arrays, mutable value objects), regenerate identity.",
      "A prototype registry turns \"kinds\" into data: store private copies, hand out copies. Combine with Composite for deep copies of trees.",
      "Immutability (records, `List.copyOf`, withers) often removes the need to copy at all. Spring's `prototype` scope is a different idea."
    ]
  });
})();
