/* Lesson F14: Composite */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  function tree(active, sizes) {
    var n = [["root", "/", "dir"], ["docs", "docs/", "dir"], ["cv", "cv.pdf", "200 KB"], ["photos", "photos/", "dir"], ["p1", "goa.jpg", "3 MB"], ["p2", "leh.jpg", "4 MB"], ["notes", "notes.txt", "8 KB"]];
    var out = ["flowchart TD"];
    n.forEach(function (x) {
      var label = "<b>" + x[1] + "</b>" + (sizes[x[0]] ? "<br/><span class='d'>" + sizes[x[0]] + "</span>" : x[2] !== "dir" ? "<br/><span class='d'>" + x[2] + "</span>" : "");
      out.push("  " + x[0] + (x[2] === "dir" ? "[\"" + label + "\"]" : "([\"" + label + "\"])") + (x[0] === active ? ":::s2" : sizes[x[0]] ? ":::s0" : ":::s1"));
    });
    out.push("  root --> docs", "  root --> photos", "  root --> notes", "  docs --> cv", "  photos --> p1", "  photos --> p2");
    out.push("  classDef s0 fill:#e8f5e9,stroke:#2e7d32", "  classDef s1 fill:#e3f2fd,stroke:#1565c0", "  classDef s2 fill:#fff3e0,stroke:#ef6c00,stroke-width:2px");
    return out.join("\n");
  }
  var sizeWidget = H.widgets.stepper({
    intro: "`root.size()` on a **composite**: a directory asks each child for its size and adds them up. A file (a **leaf**) just returns its own size. The client never checks which is which.",
    steps: [
      { label: "root.size()", m: tree("root", {}), text: "The client calls `size()` on the root directory. It doesn't know (or care) that the root has children.", log: ["root.size()  -> for each child: child.size()"], state: { "call stack": "root", "running total": "0" } },
      { label: "docs/", m: tree("docs", {}), text: "`docs/` is also a `Directory`, so it recurses into its own children.", log: ["root.size()", "  docs.size()  -> for each child"], state: { "call stack": "root → docs", "running total": "0" } },
      { label: "cv.pdf (leaf)", m: tree("cv", { cv: "200 KB" }), text: "A leaf returns its own size. No loop, no children.", log: ["    cv.pdf.size() = 200 KB", "  docs.size() = 200 KB"], state: { "call stack": "root → docs → cv.pdf", "docs/": "200 KB" } },
      { label: "photos/", m: tree("photos", { cv: "200 KB", docs: "200 KB", p1: "3 MB", p2: "4 MB" }), text: "`photos/` sums its two leaves. Each subtree is computed by the same `size()` method.", log: ["  photos.size()", "    goa.jpg = 3 MB, leh.jpg = 4 MB", "  photos.size() = 7 MB"], state: { "call stack": "root → photos", "docs/": "200 KB", "photos/": "7 MB" } },
      { label: "notes.txt", m: tree("notes", { cv: "200 KB", docs: "200 KB", p1: "3 MB", p2: "4 MB", photos: "7 MB", notes: "8 KB" }), text: "The last child of root is a leaf directly under the root: leaves and composites can be mixed at any level.", log: ["  notes.txt.size() = 8 KB"], state: { "call stack": "root → notes.txt", "children done": "3 of 3" } },
      { label: "Total", m: tree("root", { cv: "200 KB", docs: "200 KB", p1: "3 MB", p2: "4 MB", photos: "7 MB", notes: "8 KB", root: "≈7.2 MB" }), text: "Root returns the sum. One uniform call walked the whole tree: that is the point of Composite. The same shape gives `find(name)`, `print(indent)`, `delete()` and `permissions()` for free.", log: ["root.size() = 200 KB + 7 MB + 8 KB ≈ 7.2 MB"], state: { "result": "≈7.2 MB", "nodes visited": "7", "instanceof checks in client": "0" } }
    ]
  });
  H.pattern({
    code: "F14", name: "Composite",
    summary: "Composite lets you treat individual objects and groups of objects uniformly by arranging them in a tree. This lesson covers leaves vs composites, the transparency-vs-safety trade-off for child methods, recursion and iteration over trees, cycle and depth guards, an in-memory file system (a top interview LLD prompt), product bundles with nested pricing, org charts and menus, JDK and Spring usages (`Container`/`Component` in AWT/Swing, `CompositeCacheManager`), and how Composite differs from Decorator, Chain of Responsibility and Visitor.",
    intent: "Compose objects into **tree structures** to represent part-whole hierarchies, and let clients treat **individual objects and compositions uniformly**.",
    problem: {
      text: "A file system has files and directories; directories contain files **and other directories**. Computing total size, searching by name, or deleting a folder means walking that tree. Without a common type, every operation becomes an `instanceof` ladder, and each new node type (symlink, zip archive) means editing every ladder.",
      points: [
        "Part-whole hierarchy: a whole is made of parts, which can themselves be wholes",
        "Clients want **one** call (`size()`, `render()`, `price()`) whether they hold a leaf or a group",
        "Composite gives leaves and containers a common interface; containers delegate to children recursively",
        "Shows up in: file systems, UI widget trees, org charts, menus, bundles/kits, expression trees, permission groups"],
      code: `// Without a shared type, every operation repeats this:
long size(Object node) {
    if (node instanceof java.io.File f && f.isFile()) return f.length();
    if (node instanceof List<?> dir) { long s = 0; for (Object c : dir) s += size(c); return s; }
    throw new IllegalArgumentException("unknown node " + node);     // new node type? edit every method like this
}
System.out.println(size(List.of(List.of(), List.of(List.of()))));` },
    analogy: "A military chain of command. A general gives an order to a division; the division passes it to brigades, brigades to battalions, down to individual soldiers. The general doesn't care whether \"the unit\" is one soldier or ten thousand: the order (the operation) is the same, and each level passes it down.",
    structure: {
      text: "**Component** declares the common operations. **Leaf** implements them directly. **Composite** holds a list of Components and implements each operation by delegating to its children (and usually combining the results). Because a Composite *is a* Component and *has* Components, trees of any depth fit.",
      m: H.cd(["classDiagram",
        "  class Node { <<interface>>; +name() String; +size() long; +print(String indent) }",
        "  class File { -String name; -long bytes; +size() long }",
        "  class Directory { -String name; -List~Node~ children; +add(Node n); +remove(Node n); +size() long }",
        "  Node <|.. File",
        "  Node <|.. Directory",
        "  Directory o-- \"0..*\" Node : children"]),
      roles: [["Component (`Node`)", "Common interface for leaves and composites"], ["Leaf (`File`)", "No children; does the work itself"], ["Composite (`Directory`)", "Holds children; implements operations by delegating and combining"], ["Client", "Works with `Node` only"]],
      points: ["The **is-a + has-a** shape (`Directory` is a `Node` and has `Node`s) is the visual signature, shared with Decorator. The difference: Composite has **many** children and represents a hierarchy", "Recursion follows the data structure: the code mirrors the tree"] },
    impl: {
      title: "Java implementation: files and directories",
      text: "`size()` and `print()` are written once per node type. The `Directory` loops over children without knowing their concrete types. Adding a `Symlink` leaf later means one new class and no edits to `Directory` or clients (OCP).",
      code: `interface Node { String name(); long size(); void print(String indent); }
record File(String name, long size) implements Node {
    public void print(String indent) { System.out.println(indent + name + " (" + size + " B)"); }
}
class Directory implements Node {
    private final String name; private final List<Node> children = new ArrayList<>();
    Directory(String name) { this.name = name; }
    Directory add(Node n) { children.add(n); return this; }
    public String name() { return name; }
    public long size() { return children.stream().mapToLong(Node::size).sum(); }          // delegate + combine
    public void print(String indent) {
        System.out.println(indent + name + "/ (" + size() + " B)");
        children.forEach(c -> c.print(indent + "  "));
    }
}

Directory root = new Directory("root")
    .add(new Directory("docs").add(new File("cv.pdf", 200_000)))
    .add(new Directory("photos").add(new File("goa.jpg", 3_000_000)).add(new File("leh.jpg", 4_000_000)))
    .add(new File("notes.txt", 8_000));
root.print("");
Node any = root;                                             // the client treats a tree and a leaf the same way
System.out.println(any.size() + " vs leaf " + new File("x", 5).size());` },
    variants: [
      { title: "Transparency vs safety: where do `add`/`remove` live?",
        text: "GoF discusses two designs. **Transparent**: put `add`, `remove` and `children()` on the `Component` interface so clients never need to know the type, and leaves throw `UnsupportedOperationException`. **Safe**: put child management only on `Composite`, so calling `add` on a leaf is a compile error, at the cost of a cast or type check when building trees. Modern Java code usually prefers **safe**, often with a `sealed` interface.",
        table: [
          ["", "Transparent", "Safe"],
          ["`add` declared on", "Component", "Composite only"],
          ["Calling `add` on a leaf", "runtime exception", "compile error"],
          ["Building trees", "no casts", "need the composite type (builders help)"],
          ["LSP (F02)", "leaves violate it (can't honour `add`)", "respected"]],
        points: [
          "`sealed interface Node permits File, Directory` lets `switch` pattern-matching be exhaustive when you do need type-specific logic",
          "AWT/Swing went transparent-ish: `Container` extends `Component`, and only containers have `add`",
          "Interview answer: \"I'll keep child management on the composite for type safety, and expose a read-only `children()` if traversal needs it\""],
        code: `sealed interface Shape permits Circle, Group { double area(); }
record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }
final class Group implements Shape {
    private final List<Shape> items = new ArrayList<>();
    Group add(Shape s) { items.add(s); return this; }                    // safe: only Group has add
    List<Shape> items() { return List.copyOf(items); }                  // read-only view
    public double area() { return items.stream().mapToDouble(Shape::area).sum(); }
}
static String describe(Shape s) {
    return switch (s) {                                                // exhaustive thanks to sealed
        case Circle c -> "circle r=" + c.r();
        case Group g -> "group of " + g.items().size();
    };
}

Group g = new Group().add(new Circle(1)).add(new Group().add(new Circle(2)));
System.out.printf("%.2f  %s  %s%n", g.area(), describe(g), describe(new Circle(3)));
// new Circle(1).add(...)   <- does not compile: that's the point of the safe design` },
      { title: "Traversal, depth limits and cycles",
        text: "Recursion is natural for composites, but real trees bring real problems: very deep trees overflow the stack, shared children can create **cycles** (a folder containing itself via a link), and some operations need breadth-first order. Know how to switch from recursion to an explicit stack, and how to guard against cycles.",
        points: [
          "Recursive DFS: simplest; depth = tree height; Java's default stack handles a few thousand levels",
          "Iterative DFS/BFS with `ArrayDeque`: no stack overflow; easy to stop early (search)",
          "Cycle guard: track visited nodes in an identity set (`Collections.newSetFromMap(new IdentityHashMap<>())`), or forbid adding an ancestor as a child",
          "Parent pointers make `path()` and `move()` easy but must be kept consistent on add/remove",
          "Many operations over a stable tree: consider **Visitor** (F25) so new operations don't edit every node class"],
        code: `class Folder {
    final String name; final List<Folder> kids = new ArrayList<>();
    Folder(String n) { name = n; }
    Folder add(Folder f) { kids.add(f); return this; }
}
static List<String> bfs(Folder root) {                                   // iterative, cycle-safe
    List<String> order = new ArrayList<>();
    Set<Folder> seen = Collections.newSetFromMap(new IdentityHashMap<>());
    Deque<Folder> q = new ArrayDeque<>(List.of(root));
    while (!q.isEmpty()) {
        Folder f = q.poll();
        if (!seen.add(f)) { order.add("(cycle at " + f.name + ")"); continue; }
        order.add(f.name);
        q.addAll(f.kids);
    }
    return order;
}

Folder a = new Folder("a"), b = new Folder("b"), c = new Folder("c");
a.add(b).add(c); b.add(a);                                              // b links back to a: a cycle
System.out.println(bfs(a));` }
    ],
    designs: [
      { title: "Mini LLD: in-memory file system (frequently asked)",
        text: "Requirements: `mkdir -p path`, `addFile(path, content)`, `read(path)`, `ls(path)` (sorted names; for a file, just its name), `size(path)` recursive, `find(path, predicate)`, and `rm -r path`. The composite gives every operation a uniform shape; a `FileSystem` facade (F12) handles path parsing and lookup.",
        points: [
          "`Entry` (abstract) holds name, parent and timestamps; `FileEntry` and `DirEntry` extend it",
          "`DirEntry` keeps children in a `TreeMap<String, Entry>` so `ls` is sorted and lookup is O(log n)",
          "Path resolution walks from root, splitting on `/`; `mkdir -p` creates missing directories on the way",
          "Errors: `NoSuchPath`, `NotADirectory`, `AlreadyExists` as specific exceptions",
          "Extensions interviewers ask for: permissions (inherit from parent), symlinks (a leaf holding a path, with a hop limit), quotas (check `size()` before write), and concurrent access (lock per directory or a read-write lock)"],
        m: H.cd(["classDiagram",
          "  class FileSystem { -DirEntry root; +mkdir(String path); +addFile(String path, String content); +read(String path) String; +ls(String path) List~String~; +size(String path) long; +rm(String path) }",
          "  class Entry { <<abstract>>; #String name; #DirEntry parent; +size() long; +path() String }",
          "  class FileEntry { -StringBuilder content; +size() long }",
          "  class DirEntry { -TreeMap children; +child(String n) Entry; +size() long }",
          "  FileSystem --> DirEntry : root",
          "  Entry <|-- FileEntry", "  Entry <|-- DirEntry",
          "  DirEntry o-- Entry : children"]),
        code: `class NoSuchPath extends RuntimeException { NoSuchPath(String p) { super("no such path: " + p); } }
abstract class Entry {
    final String name; DirEntry parent;
    Entry(String name) { this.name = name; }
    abstract long size();
    String path() { return parent == null ? "" : parent.path() + "/" + name; }
}
class FileEntry extends Entry {
    final StringBuilder content = new StringBuilder();
    FileEntry(String n) { super(n); }
    long size() { return content.length(); }
}
class DirEntry extends Entry {
    final TreeMap<String, Entry> children = new TreeMap<>();
    DirEntry(String n) { super(n); }
    long size() { return children.values().stream().mapToLong(Entry::size).sum(); }
    <T extends Entry> T put(T e) { e.parent = this; children.put(e.name, e); return e; }
}
class FileSystem {
    private final DirEntry root = new DirEntry("");
    private Entry resolve(String path, boolean createDirs) {
        Entry cur = root;
        for (String part : path.split("/")) {
            if (part.isEmpty()) continue;
            if (!(cur instanceof DirEntry d)) throw new NoSuchPath(path);
            Entry next = d.children.get(part);
            if (next == null) { if (!createDirs) throw new NoSuchPath(path); next = d.put(new DirEntry(part)); }
            cur = next;
        }
        return cur;
    }
    void mkdir(String path) { resolve(path, true); }
    void addFile(String path, String text) {
        int i = path.lastIndexOf('/');
        DirEntry dir = (DirEntry) resolve(path.substring(0, i), true);
        FileEntry f = (FileEntry) dir.children.computeIfAbsent(path.substring(i + 1), n -> { FileEntry fe = new FileEntry(n); fe.parent = dir; return fe; });
        f.content.append(text);
    }
    String read(String path) { return ((FileEntry) resolve(path, false)).content.toString(); }
    List<String> ls(String path) { Entry e = resolve(path, false); return e instanceof DirEntry d ? List.copyOf(d.children.keySet()) : List.of(e.name); }
    long size(String path) { return resolve(path, false).size(); }
    void rm(String path) { Entry e = resolve(path, false); e.parent.children.remove(e.name); }
}

FileSystem fs = new FileSystem();
fs.mkdir("/a/b/c");
fs.addFile("/a/b/c/notes.txt", "hello");
fs.addFile("/a/b/c/notes.txt", " world");
fs.addFile("/a/readme.md", "# A");
System.out.println(fs.ls("/") + " " + fs.ls("/a") + " " + fs.ls("/a/b/c/notes.txt"));
System.out.println(fs.read("/a/b/c/notes.txt") + " | size(/a)=" + fs.size("/a"));
fs.rm("/a/b");
System.out.println(fs.ls("/a") + " size(/a)=" + fs.size("/a"));
try { fs.read("/a/b/c/notes.txt"); } catch (NoSuchPath e) { System.out.println(e.getMessage()); }` },
      { title: "Mini LLD: product bundles with nested pricing",
        text: "An e-commerce catalogue sells single products and **bundles**: a \"Work-from-home kit\" contains a chair, a desk lamp and a \"Peripherals pack\" (itself a bundle of keyboard + mouse). Bundles take a discount on the sum of their parts. Price, weight (for shipping) and stock availability all follow the composite: a bundle is in stock only if every part is.",
        points: [
          "`Sellable` interface: `price()`, `weightGrams()`, `inStock()`, `sku()`",
          "`Product` is a leaf; `Bundle` holds `Sellable` items with quantities and a discount percent",
          "Bundle price = round(sum(child price × qty) × (1 − discount)); weight = sum; inStock = all children in stock",
          "Cart lines take a `Sellable`, so cart code never cares whether it's a bundle",
          "Follow-ups: guard against a bundle containing itself; cap nesting depth; compute stock as min(childStock / qty)"],
        code: `interface Sellable { String sku(); long price(); int weightGrams(); boolean inStock(); }
record Product(String sku, long price, int weightGrams, boolean inStock) implements Sellable {}
class Bundle implements Sellable {
    private final String sku; private final int discountPct; private final Map<Sellable, Integer> items = new LinkedHashMap<>();
    Bundle(String sku, int discountPct) { this.sku = sku; this.discountPct = discountPct; }
    Bundle add(Sellable s, int qty) {
        if (s == this) throw new IllegalArgumentException("bundle can't contain itself");
        items.merge(s, qty, Integer::sum); return this;
    }
    public String sku() { return sku; }
    public long price() {
        long sum = items.entrySet().stream().mapToLong(e -> e.getKey().price() * e.getValue()).sum();
        return Math.round(sum * (100 - discountPct) / 100.0);
    }
    public int weightGrams() { return items.entrySet().stream().mapToInt(e -> e.getKey().weightGrams() * e.getValue()).sum(); }
    public boolean inStock() { return items.keySet().stream().allMatch(Sellable::inStock); }
}

Sellable keyboard = new Product("KB", 1_999, 700, true), mouse = new Product("MS", 799, 100, true);
Bundle peripherals = new Bundle("PERIPH", 10).add(keyboard, 1).add(mouse, 1);
Bundle wfh = new Bundle("WFH-KIT", 5)
    .add(new Product("CHAIR", 8_999, 12_000, true), 1)
    .add(new Product("LAMP", 1_299, 900, true), 1)
    .add(peripherals, 1);
System.out.println("peripherals ₹" + peripherals.price() + ", kit ₹" + wfh.price() + ", " + wfh.weightGrams() + " g, inStock=" + wfh.inStock());` }
    ],
    extraSlides: [
      { title: "Composite in UI trees, menus and org charts",
        text: "Wherever a screen, a menu or an organisation is drawn as nested boxes, Composite is underneath. The same uniform operations show up again and again: **render**, **count**, **find**, **enable/disable**, **total cost**.",
        table: [
          ["Domain", "Leaf", "Composite", "Uniform operation"],
          ["UI (Swing, Android Views, the DOM)", "`JButton`, `TextView`", "`JPanel`, `ViewGroup`, `<div>`", "`paint()`, `measure()`, event dispatch"],
          ["Menus", "`MenuItem`", "`Menu` (sub-menus)", "`render(depth)`, `findByShortcut()`"],
          ["Org chart", "`Employee`", "`Team` / `Department`", "`headcount()`, `salaryCost()`"],
          ["Expressions", "`Number`, `Variable`", "`Add`, `Multiply`", "`evaluate(env)`"],
          ["Permissions", "`Permission`", "`Role` (contains permissions and roles)", "`grants(action)`"],
          ["Rules / filters", "`PriceAbove(500)`", "`AllOf`, `AnyOf`", "`test(order)`"]],
        points: [
          "Rules built with `AllOf`/`AnyOf` composites are a common machine-coding trick: a coupon engine or a notification filter in 30 lines",
          "Expression trees (`Add(Num(2), Mul(Num(3), Var(x)))`) are Composite + Interpreter (GoF)",
          "Spring Security `RoleHierarchy` and nested groups in IAM systems are permission composites"],
        code: `interface Rule { boolean test(Map<String, Object> order); }
record MinTotal(long rupees) implements Rule { public boolean test(Map<String, Object> o) { return (long) o.get("total") >= rupees; } }
record City(String name) implements Rule { public boolean test(Map<String, Object> o) { return name.equals(o.get("city")); } }
record AllOf(List<Rule> rules) implements Rule { public boolean test(Map<String, Object> o) { return rules.stream().allMatch(r -> r.test(o)); } }
record AnyOf(List<Rule> rules) implements Rule { public boolean test(Map<String, Object> o) { return rules.stream().anyMatch(r -> r.test(o)); } }

// coupon: total >= 999 AND (city is Pune OR city is Indore)
Rule coupon = new AllOf(List.of(new MinTotal(999), new AnyOf(List.of(new City("Pune"), new City("Indore")))));
System.out.println(coupon.test(Map.of("total", 1200L, "city", "Pune")) + " " + coupon.test(Map.of("total", 1200L, "city", "Delhi")) + " " + coupon.test(Map.of("total", 500L, "city", "Indore")));` }
    ],
    usages: [
      ["AWT/Swing `Container` / `Component`", "`JPanel` (a `Container`) holds `Component`s, including other containers; `paint()` and layout recurse through the tree."],
      ["`java.nio.file.Files.walk` / `FileVisitor`", "Walks the file-system composite (directories and files) uniformly."],
      ["JavaFX `Parent` / `Node`, Android `ViewGroup` / `View`", "Scene graph and view hierarchy: groups are nodes containing nodes."],
      ["`javax.swing.tree.DefaultMutableTreeNode`", "General-purpose tree node with children, used by `JTree`."],
      ["Spring `CompositeCacheManager`, `CompositePropertySource`, `CompositeHealthContributor`", "A composite implements the same interface as its parts and delegates to each (e.g. look in several property sources in order, or aggregate health)."],
      ["Jackson `JsonNode` (`ObjectNode`, `ArrayNode`, `TextNode`)", "JSON trees: containers and values share one node type."]
    ],
    avoid: {
      points: [
        "The data isn't really a tree (it's a graph with sharing and cycles): Composite's recursion assumptions break",
        "Leaves and groups need very different operations: a forced common interface leads to many `UnsupportedOperationException`s",
        "Only one level of grouping ever exists: a plain `List<Item>` is simpler",
        "Hot paths over huge trees where recursion and virtual calls cost too much: flatten or index the data",
        "You keep adding new operations to every node class: add Visitor (F25) or a separate traversal"],
      pros: ["Uniform treatment of single objects and groups; clients stay simple", "Recursive structures of any depth", "New leaf/composite types without touching clients (OCP)", "Natural fit for UI, file systems, bundles, rules"],
      cons: ["Hard to restrict which children a composite may hold (type-safety at runtime)", "Overly general design if the hierarchy is shallow", "Deep trees: stack depth and performance", "Transparent designs violate LSP for leaves"] },
    compare: [
      ["Decorator (F11)", "Add behaviour to **one** wrapped object", "Same is-a + has-a shape, but Decorator has exactly one child and adds behaviour; Composite has many children and aggregates"],
      ["Chain of Responsibility (F22)", "Pass a request along until handled", "Often walks a composite upward (child → parent), e.g. UI event bubbling, but its intent is handling, not aggregation"],
      ["Visitor (F25)", "Add operations to a stable structure", "Commonly used **on** composites to add operations without editing node classes"],
      ["Iterator (F23)", "Traverse a collection", "Used to walk a composite without exposing its structure"],
      ["Interpreter (GoF)", "Evaluate a grammar", "The abstract syntax tree **is** a composite"]],
    widget: { heading: "Interactive: watch size() recurse", caption: "Step through root.size() on a small file tree. Orange is the node being visited; green nodes have finished computing their size.", render: sizeWidget },
    pitfalls: [
      "Putting `add`/`remove` on the leaf type and throwing at runtime when a safe design was possible",
      "Forgetting cycle checks when nodes can be shared or moved (a folder moved into its own subfolder)",
      "Stale parent pointers after `remove`/`move`",
      "Recomputing expensive aggregates (`size()`) on every call over huge trees: cache and invalidate up the parent chain",
      "Exposing the mutable children list (`return children;`), letting clients corrupt the tree",
      "`instanceof` ladders in client code, which defeats the pattern",
      "Stack overflow from deep recursion on user-generated trees (comments threads, nested folders)",
      "Treating a DAG/graph as a tree: shared children get counted twice in aggregates"
    ],
    quiz: [
      { q: "What is Composite's intent?", options: ["Add responsibilities to one object", "Compose objects into trees and treat leaves and groups uniformly", "Share objects to save memory", "Decouple abstraction from implementation"], answer: 1, why: "Part-whole hierarchies with a uniform interface." },
      { q: "In a file system, which is the composite?", options: ["File", "Directory", "Path", "FileSystem facade"], answer: 1, why: "A directory holds nodes (files and directories)." },
      { q: "\"Safe\" Composite design means…", options: ["Thread-safe", "Child-management methods only on the composite, so misuse on leaves fails at compile time", "No recursion", "Immutable leaves"], answer: 1, why: "Type safety over transparency." },
      { q: "Composite vs Decorator structurally:", options: ["Identical", "Both is-a + has-a; Composite has many children and aggregates, Decorator wraps exactly one and adds behaviour", "Decorator has many children", "Composite changes interfaces"], answer: 1, why: "Count of children and intent." },
      { q: "A bundle's `inStock()` should be…", options: ["Always true", "true only if every child is in stock (recursively)", "The bundle's own flag", "Any child in stock"], answer: 1, why: "Aggregate over children, like size and price." },
      { q: "How do you avoid stack overflow on a very deep tree?", options: ["Increase heap", "Iterative traversal with an explicit stack/queue (`ArrayDeque`)", "Make methods static", "Use streams"], answer: 1, why: "Explicit stacks live on the heap." },
      { q: "Which JDK/Spring type is a composite?", options: ["`StringBuilder`", "Swing `Container` / Spring `CompositeCacheManager`", "`Optional`", "`ThreadLocal`"], answer: 1, why: "Both implement the part's interface and delegate to children." },
      { q: "`AllOf(List<Rule>)` and `AnyOf(List<Rule>)` implementing `Rule` are…", options: ["Strategy only", "Composites of rules (often combined with Interpreter)", "Adapters", "Builders"], answer: 1, why: "Groups of rules usable wherever a single rule is." }
    ],
    cheatsheet: {
      table: [
        ["Part", "Role", "File-system example"],
        ["Component", "common interface", "`Node.size()`, `print()`"],
        ["Leaf", "no children, real work", "`File`"],
        ["Composite", "children + delegate/combine", "`Directory`"],
        ["Client", "uses Component only", "`root.size()`"]],
      cards: [
        { title: "Spot it", items: ["Part-whole hierarchy", "\"A group of X is also an X\"", "Recursive totals/search/render", "is-a + has-many"] },
        { title: "Design choices", items: ["Safe (child ops on composite) vs transparent", "Parent pointers?", "Cache aggregates?", "Cycle/depth guards"] },
        { title: "Where", items: ["File systems", "UI trees, menus", "Bundles, org charts", "Rules, expressions, roles"] }]
    },
    practice: [
      { level: "Easy", q: "Define Composite and draw its class diagram. What is the structural \"signature\" to recognise it?",
        a: ["Composite arranges objects into a tree so that clients treat a single object and a group of objects the same way.",
          "Signature: the Composite **is a** Component and **has many** Components (`o--` to the interface), so groups nest to any depth.",
          "Operations on a composite delegate to children and combine results (sum, all/any, render each)."],
        m: H.cd(["classDiagram",
          "  class Component { <<interface>>; +operation() }",
          "  class Leaf { +operation() }",
          "  class Composite { -List~Component~ children; +add(Component c); +operation() }",
          "  Component <|.. Leaf", "  Component <|.. Composite",
          "  Composite o-- Component : children"]) },
      { level: "Easy", q: "Model an org chart: `Employee` (leaf) and `Team` (composite) with `headcount()` and `salaryCost()`. Print the tree with indentation.",
        code: `interface OrgUnit { int headcount(); long salaryCost(); void print(String in); }
record Employee(String name, long salary) implements OrgUnit {
    public int headcount() { return 1; }
    public long salaryCost() { return salary; }
    public void print(String in) { System.out.println(in + name + " ₹" + salary); }
}
record Team(String name, List<OrgUnit> members) implements OrgUnit {
    public int headcount() { return members.stream().mapToInt(OrgUnit::headcount).sum(); }
    public long salaryCost() { return members.stream().mapToLong(OrgUnit::salaryCost).sum(); }
    public void print(String in) { System.out.println(in + name + " (" + headcount() + " people)"); members.forEach(m -> m.print(in + "  ")); }
}

OrgUnit eng = new Team("Engineering", List.of(
    new Employee("Asha", 300_000),
    new Team("Payments", List.of(new Employee("Ravi", 200_000), new Employee("Meera", 220_000))),
    new Team("Search", List.of(new Employee("Kabir", 210_000)))));
eng.print("");
System.out.println("cost ₹" + eng.salaryCost());` },
      { level: "Medium", q: "Build an arithmetic expression tree (`Num`, `Var`, `Add`, `Mul`) with `eval(env)` and `show()`, and evaluate `2 + 3 * x` for x = 4.",
        code: `interface Expr { double eval(Map<String, Double> env); String show(); }
record Num(double v) implements Expr { public double eval(Map<String, Double> e) { return v; } public String show() { return String.valueOf((int) v); } }
record Var(String n) implements Expr { public double eval(Map<String, Double> e) { return e.get(n); } public String show() { return n; } }
record Add(Expr l, Expr r) implements Expr { public double eval(Map<String, Double> e) { return l.eval(e) + r.eval(e); } public String show() { return "(" + l.show() + " + " + r.show() + ")"; } }
record Mul(Expr l, Expr r) implements Expr { public double eval(Map<String, Double> e) { return l.eval(e) * r.eval(e); } public String show() { return l.show() + " * " + r.show(); } }

Expr e = new Add(new Num(2), new Mul(new Num(3), new Var("x")));
System.out.println(e.show() + " = " + e.eval(Map.of("x", 4.0)));`,
        follow: "This is also the GoF Interpreter pattern. Adding `simplify()` or `derivative()` to every node is where Visitor (F25) starts to pay off." },
      { level: "Medium", q: "Design a restaurant menu with nested sections (Menu → \"Mains\" → \"Biryani\" → items). Support `render()`, `find(name)`, and marking a whole section unavailable. Which design decisions matter?",
        a: ["`MenuComponent` with `render(depth)`, `find(String)` returning `Optional<MenuItem>`, and `isAvailable()`.",
          "`MenuItem` (leaf) holds price, veg flag, its own `available` flag; `MenuSection` (composite) holds an ordered `List<MenuComponent>` and its own flag.",
          "An item is shown as available only if it and **all its ancestors** are available: either pass the parent's state down during `render`, or keep parent pointers.",
          "`find` is DFS with early exit; for large menus, index items by name in a map maintained on add/remove.",
          "Safe design: only sections have `add`. Use a builder to construct the tree from JSON config."] },
      { level: "Medium", q: "Directory sizes are requested very often on a large tree, but files change rarely. How do you avoid recomputing the whole subtree each time?",
        a: ["Cache `size` in each `Directory` and keep a **parent pointer**.",
          "On file write/delete, compute the delta and propagate it up: `parent.adjust(delta)` until the root, O(depth) instead of O(subtree).",
          "Or mark ancestors **dirty** and recompute lazily on the next `size()` call.",
          "With concurrent writers, use `AtomicLong` per directory for deltas, or a lock per path segment.",
          "Trade-off: memory per node and correctness on moves (subtract from old ancestors, add to new)."] },
      { level: "Hard", q: "Implement `mv(src, dst)` for the in-memory file system so moving a directory into its own descendant is rejected, and parent pointers stay correct.",
        code: `class Dir {
    final String name; Dir parent; final Map<String, Dir> kids = new TreeMap<>();
    Dir(String n) { name = n; }
    Dir mk(String n) { Dir d = new Dir(n); d.parent = this; kids.put(n, d); return d; }
    String path() { return parent == null ? "" : parent.path() + "/" + name; }
    boolean isAncestorOf(Dir d) { for (Dir x = d; x != null; x = x.parent) if (x == this) return true; return false; }
}
static void mv(Dir src, Dir dstParent) {
    if (src.isAncestorOf(dstParent)) throw new IllegalArgumentException("cannot move " + src.path() + " into itself (" + dstParent.path() + ")");
    if (dstParent.kids.containsKey(src.name)) throw new IllegalArgumentException("exists: " + dstParent.path() + "/" + src.name);
    src.parent.kids.remove(src.name);
    src.parent = dstParent;                                     // keep the back-pointer consistent
    dstParent.kids.put(src.name, src);
}

Dir root = new Dir("");
Dir a = root.mk("a"), b = a.mk("b"), c = b.mk("c"), tmp = root.mk("tmp");
mv(b, tmp);
System.out.println(c.path() + " " + a.kids.keySet() + " " + tmp.kids.keySet());
try { mv(tmp, c); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }` },
      { level: "Hard", q: "Design permissions where a `Role` can contain permissions **and other roles** (e.g. ADMIN includes EDITOR, EDITOR includes VIEWER). How do you check `grants(user, \"doc:delete\")` efficiently and safely?",
        a: ["Composite: `Grant` interface with `implies(String perm)`; `Permission` (leaf) and `Role` (composite of `Grant`s).",
          "`Role.implies` = any child implies it; a user has a set of roles.",
          "Guard against cycles (ADMIN includes EDITOR includes ADMIN) with a visited set or by validating on `add`.",
          "Efficiency: precompute each role's **flattened** permission set when roles change (rare) and cache it; checks become a hash lookup.",
          "Support wildcards (`doc:*`) in leaves; deny-by-default; audit changes to role graphs. Spring Security's `RoleHierarchy` is the same idea."],
        m: H.cd(["classDiagram",
          "  class Grant { <<interface>>; +implies(String perm) boolean }",
          "  class Permission { -String pattern; +implies(String perm) boolean }",
          "  class Role { -String name; -List~Grant~ grants; +add(Grant g); +implies(String perm) boolean; +flatten() Set~String~ }",
          "  class User { -Set~Role~ roles; +can(String perm) boolean }",
          "  Grant <|.. Permission", "  Grant <|.. Role",
          "  Role o-- Grant : grants",
          "  User --> Role"]) },
      { level: "Hard", q: "Comments on a post can be nested to any depth. Design the model for `countAll()`, `render(maxDepth)` with \"load more\" beyond the limit, and deleting a comment that has replies.",
        a: ["`Comment` is naturally a composite: each comment has `List<Comment> replies`. Leaf and composite can be one class here (a comment with zero replies).",
          "`countAll()` = 1 + sum of replies' counts; cache it and update up the parent chain on add/delete for popular posts.",
          "`render(maxDepth)`: DFS; at the depth limit, render a \"load N more replies\" stub instead of children (that's the client-side virtual proxy idea from F13).",
          "Delete with replies: **soft delete** (\"[deleted]\" placeholder) so the subtree survives; hard delete only for leaves.",
          "Storage: adjacency list (`parent_id`) plus a materialised path (`/12/45/88`) or closure table for fetching subtrees in one query.",
          "Iterative traversal to avoid stack overflow on adversarial deep threads."] }
    ],
    recap: [
      "Composite = trees of objects where a group **is a** component and **has many** components, so clients treat one and many the same way.",
      "Operations delegate to children and combine results: size, price, render, find, permissions.",
      "Prefer the safe design (child management on composites only, `sealed` types); guard against cycles; mind deep recursion.",
      "Interview favourites: in-memory file system, bundles, org charts, menus, nested comments, rule engines.",
      "Composite vs Decorator: many children and aggregation vs one child and added behaviour. Visitor and Iterator often work on composites."
    ]
  });
})();
