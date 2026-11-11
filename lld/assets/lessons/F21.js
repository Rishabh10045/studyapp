/* Lesson F21: Template Method */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  H.pattern({
    code: "F21", name: "Template Method",
    summary: "Template Method defines the skeleton of an algorithm in a base class and lets subclasses fill in specific steps without changing the overall structure. This lesson covers `final` template methods, abstract steps vs hooks, a data importer (CSV/JSON/Excel) with validation and error reporting, a report generator, game turns, the Hollywood principle, JDK and Spring usages (`AbstractList`, `HttpServlet.service`, `JdbcTemplate` callbacks, `OncePerRequestFilter`), the fragile base class problem, and how Template Method compares with Strategy and Factory Method.",
    intent: "Define the **skeleton of an algorithm** in an operation, deferring some steps to subclasses. Template Method lets subclasses redefine certain steps of an algorithm **without changing the algorithm's structure**.",
    problem: {
      text: "The admin portal imports products from CSV, JSON and Excel files. Each importer reads the file, parses rows, validates them, saves valid ones in batches, and emails a summary. Three copy-pasted importers now differ in subtle ways: one forgot to skip blank rows, one saves invalid rows, one sends no summary. The **sequence** is the same; only parsing differs.",
      points: [
        "Invariant parts (order of steps, validation, batching, summary) live once in a base class",
        "Variant parts (parsing a format) are **abstract steps** subclasses must implement",
        "Optional customisation points are **hooks** with default implementations",
        "The template method is `final` so subclasses can't reorder or skip steps"],
      code: `class CsvImporter {
    void run(String data) {
        for (String line : data.split("\\n")) {
            if (line.isBlank()) continue;                                  // JSON importer forgot this
            String[] f = line.split(",", -1);
            if (f[1].isBlank()) { System.out.println("skip invalid " + line); continue; }   // Excel importer forgot this
            System.out.println("save " + f[0] + " ₹" + f[1]);
        }
        System.out.println("email summary");                               // ...and one importer forgot this
    }
}
new CsvImporter().run("PEN,40\\n\\nINK,");` },
    analogy: "A recipe card for any curry: heat oil, temper spices, add base, add main ingredient, simmer, garnish. The chef-specific choices (which spices, paneer or chicken, how long to simmer) fill the blanks, but nobody adds garnish before heating the oil. The card enforces the order; the cook customises the steps.",
    structure: {
      text: "The **AbstractClass** defines a `final` **template method** that calls steps in a fixed order. Steps are either **abstract** (must override), **concrete** (shared, maybe `private`/`final`), or **hooks** (default behaviour, optionally overridden). **ConcreteClasses** implement the abstract steps and selected hooks. Control flows from the base class to the subclass: \"don't call us, we'll call you\" (the **Hollywood principle**).",
      m: H.cd(["classDiagram",
        "  class ProductImporter { <<abstract>>; +importFile(String data) Summary; #parse(String data) List~Row~; #validate(Row r) List~String~; #batchSize() int; #onComplete(Summary s) }",
        "  class CsvImporter { #parse(String data) List~Row~ }",
        "  class JsonImporter { #parse(String data) List~Row~; #batchSize() int }",
        "  ProductImporter <|-- CsvImporter",
        "  ProductImporter <|-- JsonImporter",
        "  note for ProductImporter \"importFile is final: parse, validate, save in batches, onComplete\""]),
      roles: [["Abstract class", "Owns the `final` template method and shared steps"], ["Template method", "Fixed sequence of step calls"], ["Abstract step", "Must be implemented by subclasses (`parse`)"], ["Hook", "Optional override with a sensible default (`batchSize`, `onComplete`)"], ["Concrete class", "Implements the variant steps"]],
      points: ["Make the template method `final`; make steps `protected`", "Keep the number of abstract steps small; prefer hooks with defaults"] },
    impl: {
      title: "Java implementation: a product importer",
      text: "`importFile` is `final`. `parse` is abstract; `validate` is shared but extensible (subclasses can add rules by overriding and calling `super`); `batchSize` and `onComplete` are hooks. Subclasses never decide the order, so no importer can forget validation or the summary.",
      code: `record Row(int line, String sku, String price) {}
record Summary(int saved, List<String> errors) {}

abstract class ProductImporter {
    public final Summary importFile(String data) {                            // the template method
        List<Row> rows = parse(data);
        List<String> errors = new ArrayList<>(); List<Row> valid = new ArrayList<>();
        for (Row r : rows) { List<String> e = validate(r); if (e.isEmpty()) valid.add(r); else errors.add("line " + r.line() + ": " + String.join(", ", e)); }
        for (int i = 0; i < valid.size(); i += batchSize()) save(valid.subList(i, Math.min(valid.size(), i + batchSize())));
        Summary s = new Summary(valid.size(), errors);
        onComplete(s);
        return s;
    }
    protected abstract List<Row> parse(String data);                          // must implement
    protected List<String> validate(Row r) {                                  // shared, extensible
        List<String> e = new ArrayList<>();
        if (r.sku() == null || r.sku().isBlank()) e.add("missing sku");
        try { if (Long.parseLong(r.price()) <= 0) e.add("price must be > 0"); } catch (NumberFormatException ex) { e.add("bad price '" + r.price() + "'"); }
        return e;
    }
    protected int batchSize() { return 100; }                                 // hook
    protected void onComplete(Summary s) { System.out.println("  summary: " + s.saved() + " saved, " + s.errors().size() + " errors"); }   // hook
    private void save(List<Row> batch) { System.out.println("  saving batch of " + batch.size()); }
}
class CsvImporter extends ProductImporter {
    protected List<Row> parse(String data) {
        List<Row> rows = new ArrayList<>(); String[] lines = data.split("\\n");
        for (int i = 0; i < lines.length; i++) { if (lines[i].isBlank()) continue; String[] f = lines[i].split(",", -1); rows.add(new Row(i + 1, f[0], f[1])); }
        return rows;
    }
}
class JsonLinesImporter extends ProductImporter {
    private static final java.util.regex.Pattern P = java.util.regex.Pattern.compile("\\"sku\\":\\"(\\\\w*)\\",\\"price\\":\\"(\\\\w*)\\"");
    protected List<Row> parse(String data) {
        List<Row> rows = new ArrayList<>(); int n = 0;
        for (String l : data.split("\\n")) { n++; java.util.regex.Matcher m = P.matcher(l); if (m.find()) rows.add(new Row(n, m.group(1), m.group(2))); }
        return rows;
    }
    @Override protected int batchSize() { return 2; }                          // hook overridden
    @Override protected List<String> validate(Row r) { List<String> e = super.validate(r); if (r.sku().length() > 5) e.add("sku too long"); return e; }
}

System.out.println("CSV:");
System.out.println(new CsvImporter().importFile("PEN,40\\n\\nINK,\\nMUG,349\\n,10").errors());
System.out.println("JSON lines:");
new JsonLinesImporter().importFile("{\\"sku\\":\\"PEN\\",\\"price\\":\\"40\\"}\\n{\\"sku\\":\\"NOTEBOOK\\",\\"price\\":\\"99\\"}\\n{\\"sku\\":\\"MUG\\",\\"price\\":\\"349\\"}\\n{\\"sku\\":\\"BAG\\",\\"price\\":\\"1299\\"}");` },
    variants: [
      { title: "Abstract steps, hooks and the Hollywood principle",
        text: "Not every step is equal. Classify each step when you design a template: what **must** vary, what **may** vary, and what **must not** vary. Then pick visibility and modifiers to enforce it.",
        table: [
          ["Kind of step", "Declared as", "Example", "Subclass can…"],
          ["Template method", "`public final`", "`importFile()`", "only call it"],
          ["Invariant step", "`private` (or `final`)", "`save(batch)`", "nothing"],
          ["Abstract step", "`protected abstract`", "`parse(data)`", "must implement"],
          ["Hook", "`protected` with default", "`batchSize()`, `onComplete()`", "optionally override"],
          ["Extensible step", "`protected`, call `super`", "`validate(row)`", "add to the default"]],
        points: [
          "**Hollywood principle**: \"don't call us, we'll call you\". The base class controls the flow and calls down into subclass steps; subclasses don't call the template",
          "Hooks can be **boolean gates**: `protected boolean shouldNotify() { return true; }` lets a subclass skip an optional step without reordering",
          "Avoid calling overridable methods from **constructors**: the subclass's fields aren't initialised yet",
          "Document each hook's contract (when it's called, what it may do); that's the subclassing API"] },
      { title: "Template Method vs Strategy: inheritance vs composition",
        text: "Both let a fixed algorithm vary in places. Template Method uses **inheritance**: the variation is chosen at compile time by picking a subclass, and steps share state through the base class. Strategy uses **composition**: the variation is an object passed in, swappable at runtime. Modern Java often turns a template method into a class that takes lambdas for its steps: Template Method's structure with Strategy's flexibility.",
        code: `// Template Method (inheritance)
abstract class Report {
    final String render() { return header() + "\\n" + body() + "\\n" + footer(); }
    String header() { return "== " + title() + " =="; }
    abstract String title(); abstract String body();
    String footer() { return "-- end --"; }
}
class SalesReport extends Report { String title() { return "Sales"; } String body() { return "Pune 1,20,000"; } }

// Same skeleton, steps as strategies (composition)
record FnReport(java.util.function.Supplier<String> title, java.util.function.Supplier<String> body) {
    String render() { return "== " + title.get() + " ==\\n" + body.get() + "\\n-- end --"; }
}

System.out.println(new SalesReport().render());
System.out.println(new FnReport(() -> "Stock", () -> "PEN 4").render());`,
        points: [
          "Prefer Template Method when steps share lots of state/helpers and the set of variants is small and stable",
          "Prefer Strategy when variants are chosen at runtime, combined freely, or come from outside your codebase",
          "Deep template hierarchies (template calling template) become the **fragile base class** problem: a change in the base breaks subclasses in surprising ways"] }
    ],
    designs: [
      { title: "Mini LLD: a turn-based game framework",
        text: "A games platform hosts Tic-Tac-Toe, Snakes & Ladders and Ludo. They share a loop: set up, then until someone wins, let the current player move, check for a winner, and pass the turn; finally announce the result. A `TurnBasedGame` base class owns the loop; each game implements setup, moves and win checks. Turn order rules (extra turn on a six) are a hook.",
        points: [
          "`play()` is `final`: `initialise()`, loop { `makeMove(player)`, `winner()`, `nextPlayer()` }, `announce()`",
          "Abstract steps: `initialise`, `makeMove`, `winner` (returns `Optional<Player>`), plus `isDraw()` hook (default `false`)",
          "`nextPlayer()` hook: default round-robin; Snakes & Ladders overrides it for \"roll a 6, play again\"",
          "A `maxTurns` guard in the base class prevents infinite games in buggy subclasses",
          "Dice and move sources are injected (Strategy) so games are deterministic in tests"],
        m: H.cd(["classDiagram",
          "  class TurnBasedGame { <<abstract>>; #List~String~ players; #int current; +play() String; #initialise(); #makeMove(String player); #winner() Optional~String~; #isDraw() boolean; #nextPlayer() }",
          "  class TicTacToe { -char[] board }",
          "  class SnakesAndLadders { -Map~Integer,Integer~ jumps; -int[] pos; -IntSupplier dice }",
          "  TurnBasedGame <|-- TicTacToe",
          "  TurnBasedGame <|-- SnakesAndLadders"]),
        code: `abstract class TurnBasedGame {
    protected final List<String> players; protected int current; private int turns;
    TurnBasedGame(List<String> players) { this.players = players; }
    public final String play() {
        initialise();
        while (turns++ < 500) {
            makeMove(players.get(current));
            Optional<String> w = winner();
            if (w.isPresent()) return w.get() + " wins after " + turns + " turns";
            if (isDraw()) return "draw after " + turns + " turns";
            nextPlayer();
        }
        return "stopped: too many turns";
    }
    protected abstract void initialise();
    protected abstract void makeMove(String player);
    protected abstract Optional<String> winner();
    protected boolean isDraw() { return false; }                                       // hook
    protected void nextPlayer() { current = (current + 1) % players.size(); }        // hook
}
class SnakesAndLadders extends TurnBasedGame {
    private final Map<Integer, Integer> jumps = Map.of(3, 22, 17, 4, 20, 29, 27, 1);
    private final int[] pos; private final java.util.function.IntSupplier dice; private int lastRoll;
    SnakesAndLadders(List<String> p, java.util.function.IntSupplier dice) { super(p); pos = new int[p.size()]; this.dice = dice; }
    protected void initialise() { Arrays.fill(pos, 0); }
    protected void makeMove(String player) {
        lastRoll = dice.getAsInt();
        int next = pos[current] + lastRoll;
        if (next <= 30) pos[current] = jumps.getOrDefault(next, next);              // exact roll needed to finish
    }
    protected Optional<String> winner() { return pos[current] == 30 ? Optional.of(players.get(current)) : Optional.empty(); }
    @Override protected void nextPlayer() { if (lastRoll != 6) super.nextPlayer(); }   // six = extra turn
}
class TicTacToe extends TurnBasedGame {
    private final char[] b = new char[9]; private final Iterator<Integer> moves;
    TicTacToe(List<Integer> scripted) { super(List.of("X", "O")); moves = scripted.iterator(); }
    protected void initialise() { Arrays.fill(b, '.'); }
    protected void makeMove(String p) { b[moves.next()] = p.charAt(0); }
    protected Optional<String> winner() {
        int[][] lines = {{0,1,2},{3,4,5},{6,7,8},{0,3,6},{1,4,7},{2,5,8},{0,4,8},{2,4,6}};
        for (int[] l : lines) if (b[l[0]] != '.' && b[l[0]] == b[l[1]] && b[l[1]] == b[l[2]]) return Optional.of(String.valueOf(b[l[0]]));
        return Optional.empty();
    }
    @Override protected boolean isDraw() { return new String(b).indexOf('.') < 0; }
}

int[] rolls = {3, 6, 2, 5, 4, 6, 1, 3, 5, 2, 6, 4, 3, 1, 2, 5, 4, 6, 2, 3};
int[] k = {0};
System.out.println(new SnakesAndLadders(List.of("Asha", "Ravi"), () -> rolls[k[0]++ % rolls.length]).play());
System.out.println(new TicTacToe(List.of(4, 0, 2, 6, 3, 5, 1, 7, 8)).play());
System.out.println(new TicTacToe(List.of(0, 3, 1, 4, 2)).play());` },
      { title: "Mini LLD: KYC onboarding for different customer types",
        text: "A fintech onboards individuals, sole proprietors and private-limited companies. Every flow is: collect details → verify identity documents → screen against sanctions lists → risk-score → decide (approve, manual review, reject) → notify. Documents and verification steps differ by type (PAN + Aadhaar for individuals; GSTIN, incorporation certificate and director KYC for companies), but the order, audit logging and decision rules must be identical for compliance.",
        points: [
          "`OnboardingFlow.onboard(application)` is the `final` template; it writes an audit event after every step",
          "Abstract steps: `requiredDocuments()`, `verifyDocuments(app)`; hooks: `extraChecks(app)` (companies verify each director with a nested individual flow), `riskWeight()`",
          "Shared steps (sanctions screening, risk decision thresholds, notification) are `private`: subclasses can't weaken compliance",
          "Verification calls to external services are injected (Adapter, F10) so tests run offline",
          "Interview point: Template Method protects the **regulated sequence**; Strategy would let callers reorder or skip steps"],
        m: M(["flowchart LR",
          "  A[\"collect details\"]:::s1 --> B[\"<b>verifyDocuments</b><br/><span class='d'>abstract: per type</span>\"]:::s2",
          "  B --> C[\"<b>extraChecks</b><br/><span class='d'>hook: directors for companies</span>\"]:::s2",
          "  C --> D[\"sanctions screening<br/><span class='d'>private, shared</span>\"]:::s0",
          "  D --> E[\"risk score + decision<br/><span class='d'>private, shared</span>\"]:::s0",
          "  E --> F[\"notify + audit\"]:::s0"]) }
    ],
    usages: [
      ["`java.util.AbstractList` / `AbstractMap` / `AbstractCollection`", "Implement `get` and `size`; inherited methods (`iterator`, `indexOf`, `equals`, `contains`) are templates calling your steps."],
      ["`java.io.InputStream.read(byte[], int, int)`", "Default implementation loops over the abstract `read()`; subclasses may override for speed."],
      ["`javax.servlet.http.HttpServlet.service()`", "Dispatches to `doGet`, `doPost`, ... hooks by HTTP method."],
      ["Spring `OncePerRequestFilter.doFilter` → `doFilterInternal`", "The final `doFilter` handles once-per-request bookkeeping and calls your step."],
      ["Spring `AbstractApplicationContext.refresh()`", "A long fixed sequence with hooks such as `postProcessBeanFactory` and `onRefresh` for subclasses."],
      ["Spring `JdbcTemplate`, `RestTemplate`, `TransactionTemplate`", "\"Template\" classes: the fixed workflow (open, execute, handle errors, clean up) with your step passed as a **callback**: Template Method done with composition."],
      ["JUnit lifecycle (`@BeforeEach` → test → `@AfterEach`)", "The framework owns the sequence; your methods are hooks."]
    ],
    avoid: {
      points: [
        "Variants must be chosen or combined at runtime: Strategy (composition) is more flexible",
        "Subclasses would need to change the **order** of steps: the skeleton isn't really shared",
        "Deep hierarchies of templates (abstract base → abstract middle → concrete): fragile and hard to follow",
        "Only one step varies and it's tiny: pass a lambda instead of creating a subclass",
        "Classes that already extend something else (Java has single inheritance)"],
      pros: ["Removes duplicated workflow code", "Enforces an order of steps (useful for compliance and correctness)", "Clear, documented extension points (abstract steps and hooks)", "Common behaviour fixed once in the base class"],
      cons: ["Inheritance couples subclasses to the base class (fragile base class)", "Variation fixed at compile time", "Harder to follow control flow jumping between base and subclass", "Too many hooks make the contract confusing", "Single inheritance limits reuse"] },
    compare: [
      ["Strategy (F17)", "Vary an algorithm by composition", "Template Method varies **steps** via inheritance at compile time; Strategy swaps the **whole algorithm** (or a step) as an object at runtime"],
      ["Factory Method (F06)", "Let subclasses decide which object to create", "A factory method is often one step of a template method: the step that creates something"],
      ["Builder (F08) Director", "Fixed sequence of build steps", "A director calls builder steps in order, like a template, but via composition"],
      ["Hooks vs Observer (F18)", "Extension points", "Hooks are called by the base class for one subclass; observers are many, registered at runtime"],
      ["Spring *Template classes", "Callback-based templates", "Same intent as Template Method, implemented with callbacks (composition) instead of subclassing"]],
    widget: { heading: "Interactive: which extension mechanism?", caption: "Eight snippets that vary behaviour. Decide whether each is a Template Method, a hook, a Strategy or a Factory Method. Your answers are saved.",
      render: H.widgets.picker({
        intro: "Ask: is there a **fixed skeleton in a base class** calling overridable steps (Template Method)? Is it an **optional overridable step with a default** (hook)? Is a **whole algorithm passed in as an object** (Strategy)? Is the varying step **creating an object** (Factory Method)?",
        question: "Which is it?", noun: "Snippets",
        options: ["Template Method", "Hook", "Strategy", "Factory Method"],
        items: [
          { title: "Servlet dispatch", code: "public abstract class HttpServlet {\n    protected void service(HttpServletRequest req, HttpServletResponse res) {\n        switch (req.getMethod()) { case \"GET\" -> doGet(req, res); case \"POST\" -> doPost(req, res); /* ... */ }\n    }\n}", answer: "Template Method", why: "A fixed dispatch skeleton in the base class calling subclass steps (`doGet`, `doPost`)." },
          { title: "Optional summary", code: "protected boolean sendSummaryEmail() { return true; }   // subclasses may return false", answer: "Hook", why: "An optional step with a default, consulted by the template." },
          { title: "Sorting", code: "orders.sort(Comparator.comparing(Order::placedAt).reversed());", answer: "Strategy", why: "The comparison algorithm is an object passed into the sort." },
          { title: "Document creation", code: "abstract class Editor {\n    final void newFile() { Document d = createDocument(); d.open(); docs.add(d); }\n    protected abstract Document createDocument();\n}", answer: "Factory Method", why: "The varying step creates an object. (It sits inside a template method, which is common.)" },
          { title: "AbstractList", code: "class Range extends AbstractList<Integer> {\n    public Integer get(int i) { return lo + i; }\n    public int size() { return hi - lo; }\n}   // iterator(), contains(), indexOf() come from AbstractList", answer: "Template Method", why: "Inherited algorithms are skeletons calling your `get` and `size` steps." },
          { title: "Retry policy", code: "RetryTemplate t = RetryTemplate.builder().maxAttempts(3).exponentialBackoff(100, 2, 1000).build();\nt.execute(ctx -> client.call());", answer: "Strategy", why: "Back-off and retry policies are pluggable objects; the callback is the step." },
          { title: "Context refresh", code: "protected void onRefresh() throws BeansException {\n    // For subclasses: do nothing by default.\n}", answer: "Hook", why: "Spring's `AbstractApplicationContext.onRefresh` is an empty-by-default hook in the refresh template." },
          { title: "Game loop", code: "abstract class Game {\n    final void play() { init(); while (!over()) { turn(); next(); } announce(); }\n    abstract void init(); abstract void turn(); abstract boolean over();\n}", answer: "Template Method", why: "A `final` loop calling abstract steps." }
        ]
      }) },
    pitfalls: [
      "Not making the template method `final`, so a subclass overrides it and breaks the sequence",
      "Too many abstract steps: every subclass must implement ten methods (prefer hooks with defaults)",
      "Calling overridable methods from the base-class constructor (subclass fields not yet initialised)",
      "Subclasses overriding a step and forgetting `super` when the contract requires it",
      "Deep template hierarchies that nobody understands (fragile base class)",
      "Putting variant behaviour behind `instanceof` checks in the base class instead of a step",
      "Making shared invariant steps `protected` (and overridable) when they must not change",
      "Using inheritance when the variant needs to change at runtime"
    ],
    quiz: [
      { q: "What is Template Method's intent?", options: ["Swap algorithms at runtime", "Define an algorithm's skeleton in a base class and let subclasses redefine certain steps", "Create objects without specifying classes", "Notify observers"], answer: 1, why: "Fixed structure, variable steps." },
      { q: "Why make the template method `final`?", options: ["Performance", "So subclasses can't change the order or skip steps", "Java requires it", "To allow overriding"], answer: 1, why: "The skeleton is the invariant." },
      { q: "A hook is…", options: ["An abstract method", "An overridable step with a default implementation", "A static helper", "A listener"], answer: 1, why: "Optional customisation point." },
      { q: "The Hollywood principle means…", options: ["Use annotations", "The base class calls subclass steps; subclasses don't call the template (\"don't call us, we'll call you\")", "Prefer inheritance", "Use singletons"], answer: 1, why: "Inversion of control in the template." },
      { q: "Template Method vs Strategy?", options: ["Same", "Inheritance and compile-time variation vs composition and runtime variation", "Strategy uses inheritance", "Template Method is runtime"], answer: 1, why: "Choose by flexibility needs." },
      { q: "Which JDK class is a classic Template Method base?", options: ["`ArrayList`", "`AbstractList`", "`String`", "`Optional`"], answer: 1, why: "Implement `get` and `size`; inherited algorithms do the rest." },
      { q: "Why is calling an overridable method from the base constructor dangerous?", options: ["It's slow", "The subclass override runs before the subclass's fields are initialised", "It doesn't compile", "It creates a new thread"], answer: 1, why: "Classic Java pitfall in template designs." },
      { q: "Spring's `JdbcTemplate.query(sql, rowMapper)` is…", options: ["Pure inheritance-based Template Method", "Template Method implemented with a callback (composition): fixed workflow, your step passed in", "An Adapter", "A Singleton"], answer: 1, why: "Same intent, no subclassing." }
    ],
    cheatsheet: {
      table: [
        ["Element", "Modifier", "Purpose"],
        ["Template method", "`public final`", "fixed order of steps"],
        ["Abstract step", "`protected abstract`", "must vary"],
        ["Hook", "`protected` + default", "may vary"],
        ["Invariant step", "`private`", "must not vary"],
        ["Extensible step", "`protected`, call `super`", "add to default"]],
      cards: [
        { title: "Use when", items: ["Same workflow, different details", "Order must be enforced (compliance)", "Few, stable variants", "Shared helpers/state across steps"] },
        { title: "Watch out", items: ["Fragile base class", "No overridable calls in constructors", "Keep abstract steps few", "Single inheritance"] },
        { title: "Seen in", items: ["`AbstractList`, `InputStream`", "`HttpServlet.service`", "`OncePerRequestFilter`", "Spring `refresh()`", "Importers, reports, games"] }]
    },
    practice: [
      { level: "Easy", q: "Define Template Method and explain abstract steps vs hooks with an example.",
        a: ["Template Method: a base class defines a `final` method that runs an algorithm's steps in a fixed order; subclasses supply some steps.",
          "Abstract step: must be implemented, e.g. `parse(data)` in an importer.",
          "Hook: has a default and may be overridden, e.g. `batchSize()` returning 100, or `shouldSendSummary()` returning true."] },
      { level: "Easy", q: "Write a `Beverage` template: `prepare()` = boil water → brew → pour → add condiments (only if the customer wants them). Implement `Tea` and `Coffee`.",
        code: `abstract class Beverage {
    final void prepare() { boil(); brew(); pour(); if (wantsCondiments()) addCondiments(); }
    private void boil() { System.out.println("  boil water"); }
    private void pour() { System.out.println("  pour into cup"); }
    protected abstract void brew();
    protected abstract void addCondiments();
    protected boolean wantsCondiments() { return true; }          // hook
}
class Tea extends Beverage {
    protected void brew() { System.out.println("  steep tea leaves with ginger"); }
    protected void addCondiments() { System.out.println("  add milk and sugar"); }
}
class Coffee extends Beverage {
    private final boolean black; Coffee(boolean black) { this.black = black; }
    protected void brew() { System.out.println("  drip coffee through filter"); }
    protected void addCondiments() { System.out.println("  add milk"); }
    @Override protected boolean wantsCondiments() { return !black; }
}

System.out.println("Tea:"); new Tea().prepare();
System.out.println("Black coffee:"); new Coffee(true).prepare();` },
      { level: "Medium", q: "Write an `AbstractList`-based read-only `Range(lo, hi)` and show which methods you got for free.",
        code: `class Range extends AbstractList<Integer> {
    private final int lo, hi;
    Range(int lo, int hi) { if (hi < lo) throw new IllegalArgumentException(); this.lo = lo; this.hi = hi; }
    @Override public Integer get(int i) { Objects.checkIndex(i, size()); return lo + i; }
    @Override public int size() { return hi - lo; }
}

List<Integer> r = new Range(10, 15);
System.out.println(r + " contains 12? " + r.contains(12) + ", indexOf(14)=" + r.indexOf(14) + ", subList=" + r.subList(1, 3));
System.out.println("equals List.of: " + r.equals(List.of(10, 11, 12, 13, 14)) + ", stream sum=" + r.stream().mapToInt(Integer::intValue).sum());
try { r.add(99); } catch (UnsupportedOperationException e) { System.out.println("add() -> UnsupportedOperationException (default hook)"); }`,
        follow: "`toString`, `contains`, `indexOf`, `iterator`, `subList`, `equals`, `hashCode` and `stream` are template methods built on your two steps." },
      { level: "Medium", q: "Turn this inheritance-based template into a callback-based one (like Spring's `*Template`), so callers don't need subclasses. Keep resource cleanup guaranteed.",
        code: `interface Conn extends AutoCloseable { String query(String sql); void close(); }
class FakeConn implements Conn {
    public String query(String sql) { if (sql.contains("bad")) throw new IllegalStateException("syntax error"); return "rows for " + sql; }
    public void close() { System.out.println("  connection closed"); }
}
class DataAccessException extends RuntimeException { DataAccessException(String m, Throwable c) { super(m, c); } }

class QueryTemplate {
    private final java.util.function.Supplier<Conn> pool;
    QueryTemplate(java.util.function.Supplier<Conn> pool) { this.pool = pool; }
    <T> T execute(String sql, java.util.function.Function<String, T> mapper) {    // fixed workflow, step as callback
        try (Conn c = pool.get()) {
            return mapper.apply(c.query(sql));
        } catch (IllegalStateException e) {
            throw new DataAccessException("query failed: " + sql, e);           // exception translation
        }
    }
}

QueryTemplate jdbc = new QueryTemplate(FakeConn::new);
System.out.println(jdbc.execute("select * from users", String::length));
try { jdbc.execute("bad sql", s -> s); } catch (DataAccessException e) { System.out.println(e.getMessage()); }` },
      { level: "Medium", q: "A `ReportGenerator` base class has grown to three levels (`ReportGenerator` → `TabularReport` → `MonthlySalesReport`) and 11 hooks. Bugs appear whenever the base class changes. What would you do?",
        a: ["This is the fragile base class problem: subclasses depend on the base's internal call order and hooks.",
          "Flatten: keep one small template (`fetch → format → write`) and move variation into **composed** objects: `DataSource`, `Formatter` (CSV/PDF), `Writer` (email/S3): Strategy/Bridge.",
          "Remove hooks nobody overrides; document the remaining ones' contracts.",
          "Add tests at the template level (sequence of calls with a recording subclass) before refactoring.",
          "Rule of thumb: one level of template inheritance; beyond that, compose."] },
      { level: "Medium", q: "Design a `PaymentFlow` template for different payment methods where the sequence is: create attempt → method-specific authorise → (optional) 3-D Secure step → capture → record → notify. Which steps are abstract, hooks, or private?",
        a: ["`final PaymentResult pay(order)`: the template.",
          "Private (must not vary): `createAttempt` (idempotency key, persistence), `record` (ledger entries), `notify`.",
          "Abstract: `authorise(attempt)` (card network, UPI collect, wallet debit).",
          "Hooks: `requiresStepUp(attempt)` (default false; cards return true above a threshold) and `stepUp(attempt)`; `captureMode()` (default immediate; cards may use AUTH_ONLY for hotels).",
          "Failure handling (void authorisation if capture fails) belongs in the template so no method forgets it."],
        m: H.cd(["classDiagram",
          "  class PaymentFlow { <<abstract>>; +pay(Order o) PaymentResult; -createAttempt(Order o) Attempt; #authorise(Attempt a) AuthResult; #requiresStepUp(Attempt a) boolean; #stepUp(Attempt a); #captureMode() CaptureMode; -record(Attempt a); -notifyUser(Attempt a) }",
          "  PaymentFlow <|-- CardFlow", "  PaymentFlow <|-- UpiFlow", "  PaymentFlow <|-- WalletFlow"]) },
      { level: "Hard", q: "Implement a template for a **retrying HTTP call** where subclasses define the request and how to parse the response, while the base class handles retries with backoff on 5xx/timeout, no retry on 4xx, and metrics. Make the backoff testable.",
        code: `record Resp(int status, String body) {}
abstract class RetryingCall<T> {
    private final java.util.function.LongConsumer sleeper;
    RetryingCall(java.util.function.LongConsumer sleeper) { this.sleeper = sleeper; }
    public final T run() {
        for (int attempt = 1; ; attempt++) {
            Resp r = send();
            if (r.status() < 400) return parse(r.body());
            boolean retriable = r.status() >= 500;
            if (!retriable || attempt == maxAttempts()) throw new IllegalStateException(name() + " failed: " + r.status() + " after " + attempt + " attempt(s)");
            long wait = backoffMs(attempt);
            System.out.println("  " + name() + " got " + r.status() + ", retry in " + wait + " ms");
            sleeper.accept(wait);
        }
    }
    protected abstract Resp send();
    protected abstract T parse(String body);
    protected int maxAttempts() { return 3; }                                  // hook
    protected long backoffMs(int attempt) { return 100L << (attempt - 1); }   // hook: 100, 200, 400...
    protected String name() { return getClass().getSimpleName(); }
}
class FetchRate extends RetryingCall<Double> {
    private final Iterator<Resp> responses;
    FetchRate(List<Resp> scripted) { super(ms -> {}); responses = scripted.iterator(); }     // no real sleeping in tests
    protected Resp send() { return responses.next(); }
    protected Double parse(String body) { return Double.parseDouble(body); }
}

System.out.println(new FetchRate(List.of(new Resp(503, ""), new Resp(502, ""), new Resp(200, "83.12"))).run());
try { new FetchRate(List.of(new Resp(404, "no such currency"))).run(); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }`,
        follow: "In production, prefer composition (a `RetryPolicy` strategy or Resilience4j) when many unrelated calls need retries; Template Method fits when every call in a family shares the same skeleton." },
      { level: "Hard", q: "Why does Java's single inheritance push frameworks from Template Method (subclassing) towards callbacks and default methods? Give examples.",
        a: ["If your class must extend a framework base class, it can't extend anything else; tests and reuse suffer.",
          "Spring moved from subclassing (`JdbcDaoSupport`, `AbstractController`) to injected templates with callbacks (`JdbcTemplate.query(sql, rowMapper)`) and annotation-driven controllers.",
          "Java 8 default methods let interfaces carry template methods: an interface with a default `process()` calling abstract `step()` methods, so classes can implement several such interfaces.",
          "JUnit 5 replaced `TestCase` subclassing (JUnit 3) with annotations/extensions.",
          "Rule: use Template Method inside your own code for small closed families; for libraries, offer callbacks/strategies."] }
    ],
    recap: [
      "Template Method = a `final` base-class method runs fixed steps in order; subclasses implement abstract steps and optionally override hooks.",
      "Use modifiers to enforce the contract: `final` template, `private` invariants, `protected abstract` steps, `protected` hooks.",
      "Great for importers, reports, game loops and regulated workflows; watch the fragile base class and constructor-call pitfalls.",
      "JDK/Spring: `AbstractList`, `InputStream`, `HttpServlet.service`, `OncePerRequestFilter`, `refresh()`, and callback-style `*Template` classes.",
      "Inheritance at compile time (Template Method) vs composition at runtime (Strategy); Factory Method is often one step of a template."
    ]
  });
})();
