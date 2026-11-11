/* Lesson F25: Visitor */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var ELEMS = [["Book", "Book(\"Clean Code\", 599)", 599, 0.4], ["Electronics", "Electronics(\"Earbuds\", 2499)", 2499, 0.2], ["Grocery", "Grocery(\"Atta\", 260, 5)", 260, 5]];
  var VIS = [
    ["TaxVisitor", function (e) { return e[0] === "Book" ? ["0% GST on printed books", 0] : e[0] === "Electronics" ? ["18% GST", Math.round(e[2] * 0.18)] : ["5% GST on packaged atta", Math.round(e[2] * 0.05)]; }],
    ["ShippingVisitor", function (e) { return e[0] === "Electronics" ? ["fragile: ₹40 + insured", 40 + Math.round(e[2] * 0.01)] : e[0] === "Grocery" ? ["by weight: ₹8/kg × " + e[3] + "kg", 8 * e[3]] : ["flat ₹30 for books", 30]; }],
    ["ExportVisitor", function (e) { return ["JSON {\"type\":\"" + e[0].toLowerCase() + "\",\"price\":" + e[2] + "}", null]; }]];
  function inr(n) { return "₹" + n.toLocaleString("en-IN"); }
  function dispatchWidget(el, ctx) {
    var s = ctx.state; if (s.e === undefined) { s.e = 0; s.v = 0; }
    el.innerHTML = "<p>" + ctx.md("Visitor uses **double dispatch**: the call `item.accept(visitor)` picks the method by the item's runtime type (first dispatch); inside, `visitor.visit(this)` picks the overload by the visitor's runtime type and the now-known static type of `this` (second dispatch). Pick a cell to trace it.") + "</p>" +
      "<div class='field'>Element (stable hierarchy)</div><div class='seg' data-r='e'></div>" +
      "<div class='field' style='margin-top:8px'>Visitor (new operations)</div><div class='seg' data-r='v'></div>" +
      "<div class='diagram' data-r='dg'></div><pre class='code' data-r='log'></pre><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var e = ELEMS[s.e], v = VIS[s.v], r = v[1](e);
      q("e").innerHTML = ELEMS.map(function (x, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.e ? "on" : "") + "'>" + x[0] + "</button>"; }).join("");
      q("v").innerHTML = VIS.map(function (x, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.v ? "on" : "") + "'>" + x[0] + "</button>"; }).join("");
      ctx.H.renderDiagram(q("dg"), ["sequenceDiagram",
        "  participant C as Client", "  participant I as " + e[0], "  participant V as " + v[0],
        "  C->>I: accept(visitor)   [1st dispatch: runtime type of item]",
        "  I->>V: visit(this)   [2nd dispatch: visit(" + e[0] + ")]",
        "  V-->>I: " + (r[1] === null ? "export string" : inr(r[1])),
        "  I-->>C: result"].join("\n"));
      q("log").textContent = "Item item = new " + e[1] + ";\nItemVisitor<?> v = new " + v[0] + "();\nitem.accept(v)   // " + e[0] + ".accept → v.visit((" + e[0] + ") this)\n→ " + v[0] + ".visit(" + e[0] + "): " + r[0] + (r[1] === null ? "" : " = " + inr(r[1]));
      var res = q("res"); res.className = "result ok";
      res.innerHTML = "<p>" + ctx.md("Each cell of the " + ELEMS.length + " × " + VIS.length + " grid is one `visit` method. A **new visitor** (say `DiscountVisitor`) is one new class: a new column, no element changes. A **new element** (say `GiftCard`) is a new row: every existing visitor must add `visit(GiftCard)`, which is the pattern's trade-off.") + "</p>";
    }
    q("e").addEventListener("click", function (ev) { var b = ev.target.closest("button[data-i]"); if (!b) return; s.e = Number(b.getAttribute("data-i")); ctx.save(); draw(); });
    q("v").addEventListener("click", function (ev) { var b = ev.target.closest("button[data-i]"); if (!b) return; s.v = Number(b.getAttribute("data-i")); ctx.save(); draw(); });
    draw();
  }

  H.pattern({
    code: "F25", name: "Visitor",
    summary: "Visitor lets you add new operations to a stable class hierarchy without editing those classes, by moving each operation into a visitor object with one `visit` method per element type. This lesson covers why overloading alone fails (single dispatch), double dispatch with `accept`/`visit`, a shopping-cart tax and shipping calculator, an expression AST with evaluate and print visitors, generic return-type visitors, the expression problem (easy operations vs easy types), sealed interfaces with pattern-matching `switch` as the modern Java alternative, JDK usages (`FileVisitor`, `ElementVisitor`, ASM `ClassVisitor`), and how Visitor compares with Iterator, Composite and Strategy.",
    intent: "Represent an **operation to be performed on the elements of an object structure**. Visitor lets you define a new operation **without changing the classes of the elements** on which it operates.",
    problem: {
      text: "A cart holds `Book`, `Electronics` and `Grocery` items. Finance wants GST per category, logistics wants shipping cost, analytics wants a JSON export, and next quarter marketing wants a festive discount. Each request adds a method to every item class (`tax()`, `shipping()`, `toJson()`, `discount()`), so product classes keep growing with unrelated concerns. The alternative, an `instanceof` ladder in each service, compiles happily even when someone forgets a new item type.",
      points: [
        "The element hierarchy is **stable**; the set of operations keeps **growing**",
        "Each operation's logic should live together (all of tax in one class), not scattered across element classes",
        "Overloading `tax(Book)`, `tax(Electronics)` alone doesn't work: Java picks overloads by the **static** type (`Item`), not the runtime type",
        "Fix: let each element call back the right overload: `accept(v) { v.visit(this); }`"],
      code: `interface Item { }
record Book(int price) implements Item {}
record Electronics(int price) implements Item {}
class Tax {
    int of(Item i)        { return -1; }                                       // fallback
    int of(Book b)        { return 0; }
    int of(Electronics e) { return e.price() * 18 / 100; }
}
List<Item> cart = List.of(new Book(599), new Electronics(2499));
Tax tax = new Tax();
for (Item i : cart) System.out.println(i + " tax = " + tax.of(i));          // always calls of(Item): -1, -1` },
    analogy: "A building inspector visiting a housing society. The flats, the lift and the water tank don't learn fire-safety rules; the fire inspector knows how to inspect each kind of thing. Next month an electrical inspector visits the same structure with different rules. Each place just says \"come in\" (`accept`) and points the inspector at itself.",
    structure: {
      text: "**Visitor** declares one `visit` method per concrete element type. Each **Element** implements `accept(Visitor v)` as `v.visit(this)`: because `this` has the concrete static type inside each class, the compiler chooses the right overload. **ConcreteVisitors** implement one operation across all element types and may accumulate state (totals). The **ObjectStructure** (cart, AST, file tree) lets a visitor walk all elements.",
      m: H.cd(["classDiagram",
        "  class ItemVisitor~R~ { <<interface>>; +visit(Book b) R; +visit(Electronics e) R; +visit(Grocery g) R }",
        "  class Item { <<interface>>; +accept(ItemVisitor~R~ v) R }",
        "  class Book { +String title; +int price; +accept(ItemVisitor~R~ v) R }",
        "  class Electronics { +String name; +int price; +accept(ItemVisitor~R~ v) R }",
        "  class Grocery { +String name; +int price; +double kg; +accept(ItemVisitor~R~ v) R }",
        "  class TaxVisitor { +visit(Book b) Integer }",
        "  class ShippingVisitor { +visit(Book b) Integer }",
        "  Item <|.. Book", "  Item <|.. Electronics", "  Item <|.. Grocery",
        "  ItemVisitor <|.. TaxVisitor", "  ItemVisitor <|.. ShippingVisitor",
        "  Item ..> ItemVisitor : accept calls visit(this)"]),
      roles: [["Visitor", "One `visit` per element type (`ItemVisitor<R>`)"], ["Concrete visitor", "One operation for all types (`TaxVisitor`)"], ["Element", "`accept(v)` → `v.visit(this)`"], ["Concrete element", "`Book`, `Electronics`, `Grocery`"], ["Object structure", "Cart/AST/tree that is traversed"]],
      points: ["Two virtual calls pick the method by **two** runtime types (element and visitor)", "Adding an operation = one class; adding an element type = change every visitor"] },
    impl: {
      title: "Java implementation: GST and shipping visitors over a cart",
      text: "A generic visitor returns a value (`R`), so the same interface supports tax (`Integer`), shipping (`Integer`) and export (`String`). The cart iterates and sums. Element classes contain only data plus a one-line `accept`; all tax rules sit in `TaxVisitor`.",
      code: `interface ItemVisitor<R> { R visit(Book b); R visit(Electronics e); R visit(Grocery g); }
interface Item { <R> R accept(ItemVisitor<R> v); int price(); }
record Book(String title, int price) implements Item { public <R> R accept(ItemVisitor<R> v) { return v.visit(this); } }
record Electronics(String name, int price) implements Item { public <R> R accept(ItemVisitor<R> v) { return v.visit(this); } }
record Grocery(String name, int price, double kg) implements Item { public <R> R accept(ItemVisitor<R> v) { return v.visit(this); } }

class TaxVisitor implements ItemVisitor<Integer> {                            // all GST rules in one place
    public Integer visit(Book b) { return 0; }                                 // printed books: 0%
    public Integer visit(Electronics e) { return Math.round(e.price() * 0.18f); }
    public Integer visit(Grocery g) { return Math.round(g.price() * 0.05f); }
}
class ShippingVisitor implements ItemVisitor<Integer> {
    public Integer visit(Book b) { return 30; }
    public Integer visit(Electronics e) { return 40 + e.price() / 100; }       // fragile + insurance
    public Integer visit(Grocery g) { return (int) Math.ceil(g.kg() * 8); }
}
class ExportVisitor implements ItemVisitor<String> {
    public String visit(Book b) { return "{\\"type\\":\\"book\\",\\"title\\":\\"" + b.title() + "\\"}"; }
    public String visit(Electronics e) { return "{\\"type\\":\\"electronics\\",\\"name\\":\\"" + e.name() + "\\"}"; }
    public String visit(Grocery g) { return "{\\"type\\":\\"grocery\\",\\"kg\\":" + g.kg() + "}"; }
}

List<Item> cart = List.of(new Book("Clean Code", 599), new Electronics("Earbuds", 2499), new Grocery("Atta", 260, 5));
int sub = 0, tax = 0, ship = 0;
for (Item i : cart) { sub += i.price(); tax += i.accept(new TaxVisitor()); ship += i.accept(new ShippingVisitor()); }
System.out.println("subtotal ₹" + sub + ", GST ₹" + tax + ", shipping ₹" + ship + ", total ₹" + (sub + tax + ship));
cart.forEach(i -> System.out.println(i.accept(new ExportVisitor())));`,
      points: ["Forgetting a case is a **compile error**: a new `visit(GiftCard)` in the interface forces every visitor to handle it", "Visitors can be stateful (a running total) or pure (return values)"] },
    variants: [
      { title: "Visitors over a composite: an expression AST",
        text: "Compilers are Visitor's home ground. An AST of `Num`, `Add`, `Mul` and `Var` nodes is stable, while operations multiply: evaluate, pretty-print, type-check, optimise, generate code. Composite nodes let the **visitor** decide when to recurse into children, so pre-order, post-order or short-circuit evaluation are all possible.",
        code: `interface Expr { <R> R accept(ExprVisitor<R> v); }
interface ExprVisitor<R> { R num(Num n); R var(Var x); R add(Add a); R mul(Mul m); }
record Num(double v) implements Expr { public <R> R accept(ExprVisitor<R> v) { return v.num(this); } }
record Var(String name) implements Expr { public <R> R accept(ExprVisitor<R> v) { return v.var(this); } }
record Add(Expr l, Expr r) implements Expr { public <R> R accept(ExprVisitor<R> v) { return v.add(this); } }
record Mul(Expr l, Expr r) implements Expr { public <R> R accept(ExprVisitor<R> v) { return v.mul(this); } }

class Eval implements ExprVisitor<Double> {
    private final Map<String, Double> env; Eval(Map<String, Double> env) { this.env = env; }
    public Double num(Num n) { return n.v(); }
    public Double var(Var x) { return env.get(x.name()); }
    public Double add(Add a) { return a.l().accept(this) + a.r().accept(this); }      // visitor drives recursion
    public Double mul(Mul m) { return m.l().accept(this) * m.r().accept(this); }
}
class Show implements ExprVisitor<String> {
    public String num(Num n) { return String.valueOf((int) n.v()); }
    public String var(Var x) { return x.name(); }
    public String add(Add a) { return "(" + a.l().accept(this) + " + " + a.r().accept(this) + ")"; }
    public String mul(Mul m) { return a(m.l()) + " * " + a(m.r()); }
    private String a(Expr e) { return e.accept(this); }
}

// price * qty + shipping
Expr total = new Add(new Mul(new Var("price"), new Var("qty")), new Num(40));
System.out.println(total.accept(new Show()) + " = " + total.accept(new Eval(Map.of("price", 599.0, "qty", 3.0))));`,
        points: ["Named methods (`num`, `add`) instead of overloaded `visit` avoid overload confusion and read well", "Who traverses? Here the visitor does; alternatively the structure (`accept` visits children) or an iterator does: pick one and document it"] },
      { title: "The expression problem, and sealed types with pattern matching (Java 21)",
        text: "Object-oriented hierarchies make **new types** easy (add a class) and **new operations** hard (edit every class). Visitor flips that: new operations are easy, new types are hard. Since Java 21, a `sealed` interface plus `record` patterns in a `switch` gives the Visitor trade-off without `accept` boilerplate: the compiler checks exhaustiveness, so adding a permitted subtype breaks every non-exhaustive switch, just like adding a `visit` method.",
        table: [
          ["Approach", "Add an operation", "Add an element type", "Boilerplate"],
          ["Methods on the classes (plain OOP)", "Edit every class", "One new class", "Low"],
          ["Classic Visitor", "One new visitor class", "Edit every visitor (compile errors guide you)", "`accept` in each class, visitor interface"],
          ["Sealed interface + pattern `switch`", "One new method with a switch", "Compiler flags every non-exhaustive switch", "Lowest; needs Java 21"],
          ["`instanceof` ladder", "One new method", "Silent bug if you forget a type", "Low but unsafe"]],
        code: `sealed interface Shape permits Circle, Rect, Tri {}
record Circle(double r) implements Shape {}
record Rect(double w, double h) implements Shape {}
record Tri(double b, double h) implements Shape {}

static double area(Shape s) {
    return switch (s) {                                                      // exhaustive: no default needed
        case Circle c -> Math.PI * c.r() * c.r();
        case Rect(double w, double h) -> w * h;                               // record deconstruction pattern
        case Tri(double b, double h) -> 0.5 * b * h;
    };
}
static String paintCost(Shape s) {
    return switch (s) {
        case Circle c when c.r() > 10 -> "large circle: quote manually";      // guarded pattern
        case Circle c -> "₹" + Math.round(area(c) * 12);
        case Rect r -> "₹" + Math.round(area(r) * 10);
        case Tri t -> "₹" + Math.round(area(t) * 15);
    };
}
for (Shape s : List.of(new Circle(2), new Rect(3, 4), new Tri(6, 2), new Circle(11)))
    System.out.printf("%s area=%.1f cost=%s%n", s, area(s), paintCost(s));`,
        points: ["Prefer sealed + switch for closed hierarchies you own in modern Java; keep classic Visitor for libraries targeting older Java, for open visitor APIs (like `FileVisitor`), or where the structure controls traversal", "Neither approach solves the expression problem fully; they choose which axis is cheap"] }
    ],
    designs: [
      { title: "Mini LLD: document exporter (HTML, Markdown, word count)",
        text: "A notes app stores documents as a tree of `Heading`, `Paragraph`, `Image` and `ListBlock` nodes. Export targets grow every quarter (HTML, Markdown, PDF, plain-text search index, accessibility report), while node types rarely change. Each export is a visitor; the document walks its blocks and calls `accept`.",
        points: [
          "`Block` sealed/stable hierarchy: `Heading(level, text)`, `Paragraph(text)`, `Image(url, alt)`, `ListBlock(items)`",
          "`BlockVisitor<R>` with `visitHeading`, `visitParagraph`, `visitImage`, `visitList`",
          "Exporters: `HtmlExporter`, `MarkdownExporter`, `WordCounter` (stateful accumulator), `AltTextChecker` (flags images without alt)",
          "Escaping rules (HTML entities) live inside `HtmlExporter`, not in the blocks",
          "New block type (`CodeBlock`) forces every exporter to handle it: compile errors, not silent gaps"],
        m: H.cd(["classDiagram",
          "  class Block { <<interface>>; +accept(BlockVisitor~R~ v) R }",
          "  class BlockVisitor~R~ { <<interface>>; +visitHeading(Heading h) R; +visitParagraph(Paragraph p) R; +visitImage(Image i) R }",
          "  class Document { -List~Block~ blocks; +export(BlockVisitor~String~ v) String }",
          "  class HtmlExporter", "  class MarkdownExporter", "  class WordCounter { -int words }",
          "  Document o-- Block",
          "  BlockVisitor <|.. HtmlExporter", "  BlockVisitor <|.. MarkdownExporter", "  BlockVisitor <|.. WordCounter",
          "  Block ..> BlockVisitor"]),
        code: `interface BlockVisitor<R> { R heading(Heading h); R paragraph(Paragraph p); R image(Image i); }
interface Block { <R> R accept(BlockVisitor<R> v); }
record Heading(int level, String text) implements Block { public <R> R accept(BlockVisitor<R> v) { return v.heading(this); } }
record Paragraph(String text) implements Block { public <R> R accept(BlockVisitor<R> v) { return v.paragraph(this); } }
record Image(String url, String alt) implements Block { public <R> R accept(BlockVisitor<R> v) { return v.image(this); } }

class Html implements BlockVisitor<String> {
    private String esc(String s) { return s.replace("&", "&amp;").replace("<", "&lt;"); }
    public String heading(Heading h) { return "<h" + h.level() + ">" + esc(h.text()) + "</h" + h.level() + ">"; }
    public String paragraph(Paragraph p) { return "<p>" + esc(p.text()) + "</p>"; }
    public String image(Image i) { return "<img src=\\"" + i.url() + "\\" alt=\\"" + esc(i.alt()) + "\\">"; }
}
class Markdown implements BlockVisitor<String> {
    public String heading(Heading h) { return "#".repeat(h.level()) + " " + h.text(); }
    public String paragraph(Paragraph p) { return p.text(); }
    public String image(Image i) { return "![" + i.alt() + "](" + i.url() + ")"; }
}
class WordCount implements BlockVisitor<Integer> {
    private int n(String s) { return s.isBlank() ? 0 : s.trim().split("\\\\s+").length; }
    public Integer heading(Heading h) { return n(h.text()); }
    public Integer paragraph(Paragraph p) { return n(p.text()); }
    public Integer image(Image i) { return 0; }
}
List<Block> doc = List.of(new Heading(1, "Q3 plan"), new Paragraph("Ship UPI autopay & fix <checkout> bugs."), new Image("chart.png", "Revenue by month"));
doc.forEach(b -> System.out.println(b.accept(new Html())));
doc.forEach(b -> System.out.println(b.accept(new Markdown())));
System.out.println("words: " + doc.stream().mapToInt(b -> b.accept(new WordCount())).sum());` },
      { title: "Mini LLD: disk-usage report with the JDK's FileVisitor",
        text: "`java.nio.file.Files.walkFileTree(start, visitor)` is a real JDK Visitor: the **structure** (the file system walker) drives traversal and calls `preVisitDirectory`, `visitFile`, `visitFileFailed` and `postVisitDirectory` on your visitor, which can steer the walk by returning `CONTINUE`, `SKIP_SUBTREE` or `TERMINATE`. A disk-usage tool sums sizes per directory and skips `node_modules`.",
        code: `// imports: java.nio.file.*, java.nio.file.attribute.BasicFileAttributes, java.io.IOException
Path root = Files.createTempDirectory("du");
Files.createDirectories(root.resolve("src/main")); Files.createDirectories(root.resolve("node_modules/left-pad"));
Files.write(root.resolve("src/main/App.java"), new byte[1200]);
Files.write(root.resolve("src/README.md"), new byte[300]);
Files.write(root.resolve("node_modules/left-pad/index.js"), new byte[90_000]);

Map<String, Long> sizes = new TreeMap<>();
Deque<Long> stack = new ArrayDeque<>();
Files.walkFileTree(root, new SimpleFileVisitor<Path>() {
    @Override public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes a) {
        if (dir.getFileName().toString().equals("node_modules")) return FileVisitResult.SKIP_SUBTREE;   // steer the walk
        stack.push(0L); return FileVisitResult.CONTINUE;
    }
    @Override public FileVisitResult visitFile(Path f, BasicFileAttributes a) { stack.push(stack.pop() + a.size()); return FileVisitResult.CONTINUE; }
    @Override public FileVisitResult postVisitDirectory(Path dir, IOException e) {
        long total = stack.pop();
        sizes.put("/" + root.relativize(dir), total);
        if (!stack.isEmpty()) stack.push(stack.pop() + total);                  // add to parent
        return FileVisitResult.CONTINUE;
    }
});
sizes.forEach((d, s) -> System.out.println(d + "  " + s + " bytes"));`,
        points: ["The visitor holds the per-operation state (a stack of running totals); the walker holds traversal", "`SimpleFileVisitor` provides default no-op methods so you override only what you need (an adapter-style base)"] }
    ],
    usages: [
      ["`java.nio.file.FileVisitor` / `SimpleFileVisitor` + `Files.walkFileTree`", "Callbacks per directory and file; return values steer traversal."],
      ["`javax.lang.model.element.ElementVisitor`, `TypeVisitor`, `AnnotationValueVisitor`", "Annotation processors visit program elements and types (with `SimpleElementVisitor14` style base classes)."],
      ["Compiler tree APIs: `com.sun.source.tree.TreeVisitor` / `TreeScanner`", "javac's AST visitors used by tools such as Error Prone."],
      ["ASM `ClassVisitor` / `MethodVisitor`; JavaParser `VoidVisitorAdapter`", "Bytecode and source manipulation libraries used by frameworks and linters."],
      ["Jackson `JsonFormatVisitorWrapper`", "Visits a type's structure to generate schemas."],
      ["Spring `BeanDefinitionVisitor`", "Traverses bean definitions to resolve placeholders in property values."]
    ],
    avoid: {
      points: [
        "The element hierarchy changes often: every new type breaks every visitor",
        "Only one or two operations: put them on the classes",
        "Elements must keep fields private and the visitor needs them: Visitor forces you to expose state via getters",
        "You can use Java 21 sealed types and pattern-matching `switch`: same safety, far less boilerplate",
        "Operations depend on one type only: plain polymorphism is enough"],
      pros: ["Add operations without touching element classes (OCP for operations)", "Related behaviour grouped in one visitor class", "Compiler-enforced coverage of all element types", "Visitors can accumulate state while traversing", "Works across unrelated classes in one structure"],
      cons: ["Adding element types is expensive (change every visitor)", "`accept` boilerplate in every element", "Breaks encapsulation: elements expose data to visitors", "Double dispatch is unfamiliar and harder to read", "Cyclic dependency between visitor and element interfaces"] },
    compare: [
      ["Iterator (F23)", "Sequential access", "Iterator walks elements of one type uniformly; Visitor runs type-specific logic on each. Combine: iterate, then `accept`"],
      ["Composite (F14)", "Tree of parts", "Visitor is the classic way to run many operations over a composite (ASTs, documents, file trees)"],
      ["Strategy (F17)", "Swap one algorithm", "A strategy varies one algorithm for one context type; a visitor varies by the element's type too (double dispatch)"],
      ["Sealed types + `switch`", "Closed hierarchies, Java 21", "Same trade-off as Visitor with exhaustiveness checks and no `accept`"],
      ["Command (F19)", "Request as object", "Both encapsulate an operation as an object; a visitor's operation is spread across element types"]],
    widget: { heading: "Interactive: trace double dispatch", caption: "Pick an element and a visitor. The sequence diagram shows both dispatches and which `visit` overload runs.", render: dispatchWidget },
    pitfalls: [
      "Trying overloading alone (`tax(Item)` picks by static type): the method silently does the wrong thing",
      "Forgetting `accept` in a new subclass that inherits its parent's `accept`, so it's visited as the parent type",
      "Visitors that modify the structure they're traversing (concurrent modification, confusing order)",
      "Huge visitor interfaces for big hierarchies with mostly empty methods (provide a default/adapter base class)",
      "Unclear traversal ownership: both the structure and the visitor recurse, so nodes are visited twice",
      "Using Visitor for a hierarchy that keeps changing",
      "Leaking element internals: adding public getters for everything just for visitors",
      "Reusing a stateful visitor across traversals without resetting it"
    ],
    quiz: [
      { q: "What is Visitor's intent?", options: ["Add element types easily", "Add new operations to a stable hierarchy without changing its classes", "Traverse a list", "Create objects"], answer: 1, why: "Operations move into visitors." },
      { q: "Why doesn't `tax.of(item)` with overloads for `Book` and `Electronics` work when `item` is declared as `Item`?", options: ["It does work", "Java chooses overloads at compile time by static type (single dispatch)", "Records can't be overloaded", "Generics erase it"], answer: 1, why: "Overload resolution is static; overriding is dynamic." },
      { q: "What does `accept(v) { v.visit(this); }` achieve?", options: ["Recursion", "The second dispatch: inside each class, `this` has the concrete type, so the right overload is chosen", "Caching", "Thread safety"], answer: 1, why: "Double dispatch." },
      { q: "Visitor makes which change easy?", options: ["Adding element types", "Adding operations", "Both", "Neither"], answer: 1, why: "New element types require edits to all visitors." },
      { q: "Modern Java alternative to Visitor for closed hierarchies?", options: ["Reflection", "Sealed interfaces with exhaustive pattern-matching `switch`", "Annotations", "Serialization"], answer: 1, why: "Compiler checks coverage without `accept`." },
      { q: "In `Files.walkFileTree`, returning `SKIP_SUBTREE` from `preVisitDirectory`…", options: ["Deletes the directory", "Skips that directory's contents", "Stops the walk", "Throws"], answer: 1, why: "The visitor steers traversal." },
      { q: "Which is a cost of Visitor?", options: ["Can't return values", "Elements must expose data the visitor needs, weakening encapsulation", "No compile-time checks", "Only works with lists"], answer: 1, why: "Operations live outside the data." },
      { q: "A compiler's AST with evaluate, print and type-check passes is…", options: ["A bad fit", "The classic Visitor use case: stable node types, many operations", "Strategy", "Singleton"], answer: 1, why: "Visitor's home ground." }
    ],
    cheatsheet: {
      table: [
        ["Piece", "Shape", "Example"],
        ["Visitor", "`R visit(T)` per element type", "`ItemVisitor<R>`"],
        ["Element", "`<R> R accept(Visitor<R> v)`", "`return v.visit(this);`"],
        ["Concrete visitor", "one operation", "`TaxVisitor`, `Html`"],
        ["Structure", "walks elements", "cart, AST, `walkFileTree`"],
        ["Java 21 alternative", "sealed + `switch`", "`case Rect(var w, var h) ->`"]],
      cards: [
        { title: "Use when", items: ["Stable types, growing operations", "Compilers, ASTs, documents", "Tax/shipping/export over items", "Reports over file trees"] },
        { title: "Watch out", items: ["New types = change all visitors", "Who traverses?", "Encapsulation leaks", "Boilerplate: consider sealed types"] },
        { title: "Interview lines", items: ["Single vs double dispatch", "Expression problem", "`accept` → `visit(this)`", "`FileVisitor` in the JDK"] }]
    },
    practice: [
      { level: "Easy", q: "Explain single vs double dispatch with a Java example.",
        a: ["**Single dispatch**: Java picks an overridden method by the runtime type of **one** object (the receiver). Overloads are chosen at compile time by declared types.",
          "So `printer.print(shape)` with overloads `print(Circle)`/`print(Square)` and `shape` declared as `Shape` calls `print(Shape)` regardless of the actual object.",
          "**Double dispatch**: choose the method by the runtime types of **two** objects. Visitor achieves it with two virtual calls: `shape.accept(printer)` (dispatch on shape) then `printer.visit(this)` (dispatch on printer, with `this` statically typed as the concrete shape)."] },
      { level: "Easy", q: "When is Visitor a good fit and when is it a bad one?",
        a: ["Good: element types are stable and owned by you, operations keep growing and each operation spans all types (compilers, document exporters, tax/shipping over cart items, insurance claims over policy types).",
          "Bad: new element types arrive often (plugins, product catalogues with new categories monthly), only one or two operations, or you're on Java 21 with a closed hierarchy (sealed + `switch`)."] },
      { level: "Medium", q: "Add a `DiscountVisitor` for a festive sale (10% off electronics, ₹50 off groceries above ₹200, nothing on books) without touching item classes. Then explain what happens if `GiftCard` is added.",
        code: `interface V<R> { R book(int price); R electronics(int price); R grocery(int price); }
interface Item { <R> R accept(V<R> v); }
record Book(int price) implements Item { public <R> R accept(V<R> v) { return v.book(price); } }
record Electronics(int price) implements Item { public <R> R accept(V<R> v) { return v.electronics(price); } }
record Grocery(int price) implements Item { public <R> R accept(V<R> v) { return v.grocery(price); } }

class FestiveDiscount implements V<Integer> {                                // new operation: one new class
    public Integer book(int p) { return 0; }
    public Integer electronics(int p) { return p / 10; }
    public Integer grocery(int p) { return p > 200 ? 50 : 0; }
}
List<Item> cart = List.of(new Book(599), new Electronics(2499), new Grocery(260), new Grocery(120));
int off = 0; for (Item i : cart) off += i.accept(new FestiveDiscount());
System.out.println("festive discount: ₹" + off);`,
        follow: "Adding `GiftCard` means adding `giftCard(...)` to `V`, which breaks compilation of `FestiveDiscount`, `TaxVisitor`, `ShippingVisitor`... until each decides how to treat gift cards. That's the cost, but it's a safe one: nothing is silently missed." },
      { level: "Medium", q: "Implement area and perimeter for shapes using Java 21 sealed types instead of Visitor. What do you gain and lose?",
        code: `sealed interface Shape permits Circle, Square {}
record Circle(double r) implements Shape {}
record Square(double side) implements Shape {}
class Geometry {
    static double perimeter(Shape s) {
        return switch (s) {
            case Circle c -> 2 * Math.PI * c.r();
            case Square(double side) -> 4 * side;
        };
    }
}
for (Shape s : List.of(new Circle(1), new Square(2))) System.out.printf("%s perimeter=%.2f%n", s, Geometry.perimeter(s));`,
        follow: "Gain: no `accept` methods, no visitor interface, exhaustiveness checked, record deconstruction. Lose: only for sealed hierarchies in one module; open extension points (third-party element types) and traversal-controlled callbacks still favour classic Visitor." },
      { level: "Medium", q: "Who should traverse a composite: the structure, the visitor, or an iterator? Give an example of each.",
        a: ["**Structure** (accept visits children): simple and consistent order; e.g. `Folder.accept(v)` visits itself then each child. Hard for visitors that want to skip subtrees unless `accept` checks a return value.",
          "**Visitor**: each `visit(Add)` recurses into children itself (the AST `Eval` above). Most flexible: short-circuiting (`And` with a false left side), post-order evaluation.",
          "**External walker/iterator**: `Files.walkFileTree` owns traversal and lets the visitor steer via return codes; or iterate with F23 and call `accept`.",
          "Choose one and document it; mixing two causes double visits."] },
      { level: "Medium", q: "Design an insurance premium calculator over policy types (Health, Motor, Life) with operations: premium, tax, renewal reminder text and risk score.",
        a: ["Stable types: `HealthPolicy(age, sumInsured, members)`, `MotorPolicy(idv, vehicleAge, ncb)`, `LifePolicy(age, cover, smoker)`; each implements `accept`.",
          "Visitors: `PremiumVisitor`, `TaxVisitor` (GST on premium), `RenewalReminderVisitor` (returns message text), `RiskScoreVisitor`.",
          "Rates come from a `RateTable` injected into visitors (no magic numbers in elements).",
          "A `Portfolio` (object structure) runs a visitor over all customer policies; results aggregated (total premium).",
          "Mention the alternative: sealed `Policy` + switch in a `PremiumService`; and the trade-off if new policy types (Travel, Home) are planned."],
        m: H.cd(["classDiagram",
          "  class Policy { <<interface>>; +accept(PolicyVisitor~R~ v) R }",
          "  class PolicyVisitor~R~ { <<interface>>; +visitHealth(HealthPolicy p) R; +visitMotor(MotorPolicy p) R; +visitLife(LifePolicy p) R }",
          "  class HealthPolicy", "  class MotorPolicy", "  class LifePolicy",
          "  class PremiumVisitor { -RateTable rates }", "  class RiskScoreVisitor",
          "  Policy <|.. HealthPolicy", "  Policy <|.. MotorPolicy", "  Policy <|.. LifePolicy",
          "  PolicyVisitor <|.. PremiumVisitor", "  PolicyVisitor <|.. RiskScoreVisitor"]) },
      { level: "Hard", q: "What is the expression problem and how do Visitor, plain OOP and pattern matching each address it?",
        a: ["The expression problem: extend a data model with both **new cases** (types) and **new operations** without modifying existing code and with static type safety.",
          "Plain OOP: new types are easy (subclass), new operations require editing every class.",
          "Visitor: new operations are easy (new visitor), new types require editing the visitor interface and all visitors.",
          "Sealed types + `switch`: same as Visitor (operations easy, types break switches) with less code.",
          "Full solutions need language features (multimethods, type classes, object algebras); in interviews, state the trade-off and pick based on which axis changes more."] },
      { level: "Hard", q: "Write a visitor that simplifies an expression tree (x * 1 → x, x + 0 → x, constant folding) and returns a new tree.",
        code: `interface Expr { <R> R accept(Vis<R> v); }
interface Vis<R> { R num(Num n); R var(Var v); R add(Add a); R mul(Mul m); }
record Num(int v) implements Expr { public <R> R accept(Vis<R> x) { return x.num(this); } public String toString() { return "" + v; } }
record Var(String n) implements Expr { public <R> R accept(Vis<R> x) { return x.var(this); } public String toString() { return n; } }
record Add(Expr l, Expr r) implements Expr { public <R> R accept(Vis<R> x) { return x.add(this); } public String toString() { return "(" + l + " + " + r + ")"; } }
record Mul(Expr l, Expr r) implements Expr { public <R> R accept(Vis<R> x) { return x.mul(this); } public String toString() { return l + " * " + r; } }

class Simplify implements Vis<Expr> {
    public Expr num(Num n) { return n; }
    public Expr var(Var v) { return v; }
    public Expr add(Add a) {
        Expr l = a.l().accept(this), r = a.r().accept(this);                    // simplify children first (post-order)
        if (l instanceof Num x && r instanceof Num y) return new Num(x.v() + y.v());
        if (l instanceof Num x && x.v() == 0) return r;
        if (r instanceof Num y && y.v() == 0) return l;
        return new Add(l, r);
    }
    public Expr mul(Mul m) {
        Expr l = m.l().accept(this), r = m.r().accept(this);
        if (l instanceof Num x && r instanceof Num y) return new Num(x.v() * y.v());
        if ((l instanceof Num x && x.v() == 0) || (r instanceof Num y && y.v() == 0)) return new Num(0);
        if (l instanceof Num x && x.v() == 1) return r;
        if (r instanceof Num y && y.v() == 1) return l;
        return new Mul(l, r);
    }
}
Expr e = new Add(new Mul(new Var("price"), new Add(new Num(0), new Num(1))), new Mul(new Num(2), new Num(20)));
System.out.println(e + "  =>  " + e.accept(new Simplify()));`,
        follow: "Returning new nodes keeps the AST immutable. Real compilers chain passes like this (constant folding, dead-code elimination), each a visitor." }
    ],
    recap: [
      "Visitor adds operations to a stable hierarchy: one visitor class per operation, one `visit` per element type.",
      "Double dispatch: `element.accept(v)` then `v.visit(this)` chooses by both runtime types; overloading alone can't.",
      "Easy to add operations, hard to add types (the expression problem); compile errors keep coverage complete.",
      "Classic uses: compilers/ASTs, document export, cart tax/shipping, `FileVisitor`, annotation processors, ASM.",
      "In Java 21, sealed interfaces with exhaustive pattern-matching `switch` often replace Visitor for closed hierarchies."
    ]
  });
})();
