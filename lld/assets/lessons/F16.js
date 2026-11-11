/* Lesson F16: Flyweight */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var COUNTS = [10000, 100000, 1000000, 5000000], TYPES = [3, 10, 50, 500];
  function fmt(bytes) { return bytes >= 1073741824 ? (bytes / 1073741824).toFixed(1) + " GB" : bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : (bytes / 1024).toFixed(1) + " KB"; }
  function flyWidget(el, ctx) {
    var s = ctx.state; if (s.c === undefined) { s.c = 2; s.t = 1; }
    el.innerHTML = "<p>" + ctx.md("A map renders **trees**. Each tree has *extrinsic* state that differs per tree (x, y: two `int`s) and *intrinsic* state shared by every tree of the same species (name, colour, a 4 KB texture). Pick the number of trees and species and compare memory. Estimates assume a 16-byte object header and 4-byte compressed references.") + "</p>" +
      "<div class='field'>Trees on the map</div><div class='seg' data-r='c'></div>" +
      "<div class='field' style='margin-top:8px'>Distinct species (flyweights)</div><div class='seg' data-r='t'></div>" +
      "<div class='metrics' data-r='m' style='margin-top:10px'></div><div data-r='bars'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var n = COUNTS[s.c], t = TYPES[s.t];
      q("c").innerHTML = COUNTS.map(function (v, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.c ? "on" : "") + "'>" + v.toLocaleString("en-IN") + "</button>"; }).join("");
      q("t").innerHTML = TYPES.map(function (v, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.t ? "on" : "") + "'>" + v + "</button>"; }).join("");
      var naive = n * (32 + 16 + 4096);                       // tree (header + x,y + 3 refs, aligned) + its own texture array
      var fly = n * 32 + t * (32 + 16 + 4096);                // tree: header + x,y + type ref, aligned to 32; species: object + texture
      var max = Math.max(naive, fly);
      q("m").innerHTML = "<div class='metric'><div class='v'>" + fmt(naive) + "</div><div class='l'>every tree owns its texture</div></div>" +
        "<div class='metric'><div class='v'>" + fmt(fly) + "</div><div class='l'>trees share " + t + " species flyweights</div></div>" +
        "<div class='metric'><div class='v'>" + (naive / fly).toFixed(0) + "×</div><div class='l'>smaller</div></div>";
      function bar(label, v, color) { return "<div style='margin:6px 0'><div class='field'>" + label + "</div><div style='background:var(--surface-2,#eef1f5);border-radius:6px;height:16px'><div style='height:16px;border-radius:6px;background:" + color + ";width:" + Math.max(0.5, v / max * 100).toFixed(2) + "%'></div></div></div>"; }
      q("bars").innerHTML = bar("Without flyweight", naive, "var(--danger,#d33)") + bar("With flyweight", fly, "var(--success,#2e7d32)");
      var res = q("res");
      if (t * 50 > n) { res.className = "result warn"; res.innerHTML = "<div class='out'>Little sharing</div><p>" + ctx.md("With this many species relative to trees, each flyweight is shared by few objects. The saving shrinks, and the factory/cache adds complexity.") + "</p>"; }
      else { res.className = "result ok"; res.innerHTML = "<div class='out'>Heavy sharing</div><p>" + ctx.md("Each species object is shared by about **" + Math.round(n / t).toLocaleString("en-IN") + "** trees. What's left per tree is just its position and one reference.") + "</p>"; }
    }
    q("c").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b) return; s.c = Number(b.getAttribute("data-i")); ctx.save(); draw(); });
    q("t").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b) return; s.t = Number(b.getAttribute("data-i")); ctx.save(); draw(); });
    draw();
  }
  H.pattern({
    code: "F16", name: "Flyweight",
    summary: "Flyweight shares fine-grained objects to support very large numbers of them efficiently, by splitting state into intrinsic (shared, immutable) and extrinsic (per use, passed in). This lesson covers the flyweight factory, immutability and thread-safety, a forest/map renderer, a text editor's character formatting, chess and game pieces, the JDK's own flyweights (`Integer.valueOf` cache, string interning, `Boolean`, enums) and the frequently asked `Integer ==` trap, memory estimation, and how Flyweight differs from Singleton, object pools and caching proxies.",
    intent: "Use **sharing** to support **large numbers of fine-grained objects** efficiently. Store the shared, context-independent (**intrinsic**) state in flyweight objects, and pass the context-dependent (**extrinsic**) state in from outside.",
    problem: {
      text: "A city map shows 1,000,000 trees. Each `Tree` object stores its position plus its species name, colour and a 4 KB bark texture. Positions differ, but there are only 10 species. Storing the texture in every object costs about 4 GB of heap; the app dies with `OutOfMemoryError` long before the map loads.",
      points: [
        "**Intrinsic state**: identical across many objects, independent of context (species, texture, glyph shape). Share it",
        "**Extrinsic state**: varies per use (x/y, font size at this position, the board square). Store it outside, or pass it to methods",
        "A **flyweight factory** returns an existing flyweight for a key or creates and caches it",
        "Flyweights must be **immutable**, since many contexts share them"],
      code: `class Tree {                                          // every tree carries its own copy of species data
    final int x, y; final String species; final String color; final byte[] texture;
    Tree(int x, int y, String species, String color) {
        this.x = x; this.y = y; this.species = species; this.color = color;
        this.texture = new byte[4096];                     // 4 KB each
    }
}
List<Tree> forest = new ArrayList<>();
for (int i = 0; i < 10_000; i++) forest.add(new Tree(i, i * 2, i % 2 == 0 ? "Neem" : "Peepal", "green"));
long textures = forest.stream().map(t -> t.texture).distinct().count();
System.out.println(forest.size() + " trees, " + textures + " separate texture arrays (" + textures * 4 + " KB)");` },
    analogy: "Movable type in a printing press. A print shop doesn't cast a new letter \"e\" for every \"e\" on the page. It keeps one tray of each letter (intrinsic: the shape) and places them at positions on the page (extrinsic). Thousands of pages, a few hundred pieces of type.",
    structure: {
      text: "The **Flyweight** holds intrinsic state and exposes operations that take extrinsic state as parameters. The **FlyweightFactory** manages a pool keyed by intrinsic state and hands out shared instances. The **Client** (or a context object) stores extrinsic state and a reference to its flyweight. Unshared concrete flyweights are allowed when sharing isn't possible.",
      m: H.cd(["classDiagram",
        "  class TreeType { -String species; -String color; -byte[] texture; +draw(int x, int y) }",
        "  class TreeTypeFactory { -Map~String,TreeType~ cache; +get(String species, String color) TreeType }",
        "  class Tree { -int x; -int y; -TreeType type; +draw() }",
        "  class Forest { -List~Tree~ trees; +plant(int x, int y, String species, String color) }",
        "  Forest o-- Tree",
        "  Tree --> TreeType : shared flyweight",
        "  Forest ..> TreeTypeFactory",
        "  TreeTypeFactory o-- TreeType : cache"]),
      roles: [["Flyweight (`TreeType`)", "Immutable intrinsic state; operations take extrinsic state as parameters"], ["Flyweight factory", "Returns the shared instance for a key; creates and caches on first request"], ["Context (`Tree`)", "Extrinsic state (x, y) plus a reference to its flyweight"], ["Client (`Forest`)", "Creates contexts via the factory; never `new`s flyweights directly"]],
      points: ["Memory: n × (extrinsic + 1 reference) + k × intrinsic, where k (distinct flyweights) ≪ n", "Flyweights are compared and shared by identity; the factory guarantees one instance per key"] },
    impl: {
      title: "Java implementation: a forest of shared tree types",
      text: "`TreeType` is a record (immutable), created only through `TreeTypes.of(...)`, which caches by key using `computeIfAbsent` on a `ConcurrentHashMap` (thread-safe creation). `Tree` keeps only `x`, `y` and a reference. Drawing passes the extrinsic position into the flyweight.",
      code: `record TreeType(String species, String color, byte[] texture) {
    void draw(int x, int y, StringBuilder canvas) { canvas.append(species.charAt(0)).append('@').append(x).append(',').append(y).append(' '); }
}
final class TreeTypes {                                         // flyweight factory
    private static final Map<String, TreeType> CACHE = new java.util.concurrent.ConcurrentHashMap<>();
    static TreeType of(String species, String color) {
        return CACHE.computeIfAbsent(species + "|" + color, k -> new TreeType(species, color, new byte[4096]));
    }
    static int size() { return CACHE.size(); }
}
record Tree(int x, int y, TreeType type) {                     // context: extrinsic state + shared reference
    void draw(StringBuilder canvas) { type.draw(x, y, canvas); }
}
class Forest {
    private final List<Tree> trees = new ArrayList<>();
    void plant(int x, int y, String species, String color) { trees.add(new Tree(x, y, TreeTypes.of(species, color))); }
    int count() { return trees.size(); }
    String drawFirst(int n) { StringBuilder sb = new StringBuilder(); trees.stream().limit(n).forEach(t -> t.draw(sb)); return sb.toString(); }
}

Forest f = new Forest();
String[] species = {"Neem", "Peepal", "Banyan", "Gulmohar"};
for (int i = 0; i < 100_000; i++) f.plant(i % 500, i / 500, species[i % 4], "green");
System.out.println(f.count() + " trees share " + TreeTypes.size() + " TreeType objects");
System.out.println(f.drawFirst(5));
System.out.println("same instance: " + (TreeTypes.of("Neem", "green") == TreeTypes.of("Neem", "green")));` },
    variants: [
      { title: "The JDK's flyweights and the `Integer ==` trap",
        text: "Java uses flyweights for boxed values and strings. `Integer.valueOf(int)` returns cached instances for **-128 to 127** (the upper bound is tunable with `-XX:AutoBoxCacheMax`); autoboxing calls `valueOf`. So `==` on boxed `Integer`s *seems* to work for small numbers and silently fails for larger ones. This is a very frequently asked Java question.",
        code: `Integer a = 127, b = 127, c = 128, d = 128;
System.out.println("127 == 127: " + (a == b));                // true: same cached flyweight
System.out.println("128 == 128: " + (c == d));                // false: two different objects
System.out.println("128 equals: " + c.equals(d));             // true: always compare values with equals
System.out.println("valueOf(5) twice: " + (Integer.valueOf(5) == Integer.valueOf(5)));

String s1 = "pune", s2 = "pu" + "ne", s3 = new String("pune");
System.out.println("literal pool: " + (s1 == s2) + ", new String: " + (s1 == s3) + ", interned: " + (s1 == s3.intern()));
System.out.println("Boolean.valueOf shared: " + (Boolean.valueOf("TRUE") == Boolean.TRUE));`,
        table: [
          ["JDK flyweight", "What is shared"],
          ["`Integer/Short/Byte/Character/Long.valueOf`", "cached boxes for small values (Integer: -128..127 by default)"],
          ["`Boolean.valueOf`, `Boolean.TRUE/FALSE`", "exactly two instances"],
          ["String literals and `String.intern()`", "one instance per distinct string in the string pool"],
          ["Enums", "one instance per constant, by language guarantee"],
          ["`List.of()`, `Collections.emptyList()`, `Optional.empty()`", "shared immutable empty instances"]],
        points: [
          "Rule: never compare boxed numbers or strings with `==`; use `equals` (or unbox first)",
          "`new Integer(5)` (deprecated for removal) always created a new object, bypassing the cache",
          "Interning user input with `intern()` can save memory for highly repetitive strings, but the pool is native memory; G1 also has **string deduplication** (`-XX:+UseStringDeduplication`) which shares the backing arrays automatically"] },
      { title: "Flyweight vs Singleton vs object pool vs cache",
        text: "All four keep objects around for reuse, which confuses people in interviews. The difference is **how many**, **whether shared at the same time**, and **whether mutable**.",
        table: [
          ["", "Flyweight", "Singleton (F05)", "Object pool", "Cache / caching proxy (F13)"],
          ["Instances", "one per intrinsic key (k of them)", "exactly one", "a bounded set of identical objects", "one value per key"],
          ["Shared concurrently?", "yes, by many contexts", "yes", "no: borrowed exclusively, then returned", "yes (read)"],
          ["Mutable?", "no (must be immutable)", "may be", "yes (reset on return)", "values ideally immutable"],
          ["Why", "memory: many fine-grained objects", "one global coordinator", "creation is expensive (DB connections, threads)", "computation/IO is expensive"],
          ["Example", "`Integer.valueOf`, glyphs, tree types", "`Runtime`", "HikariCP, thread pools", "`@Cacheable`, Caffeine"]],
        points: [
          "If clients modify the shared object, it is not a flyweight; it's a bug",
          "Pools manage *exclusive* use; flyweights are about *simultaneous* sharing"] }
    ],
    designs: [
      { title: "Mini LLD: text editor characters and formatting",
        text: "A document has 2 million characters. Storing font family, size, colour, bold and italic in each `Char` object wastes memory, since a typical document uses fewer than 20 distinct styles. Make `Style` a flyweight from a `StyleFactory`; each character stores just its `char` and a reference. Better still, store **runs** (`start`, `length`, `style`) so consecutive characters with the same style share one entry.",
        points: [
          "`Style` record: font, size, colour, bold, italic (immutable, intrinsic)",
          "`StyleFactory.of(...)` caches by value; `Style` equality = value equality (records), sharing = identity",
          "Changing the colour of a selection never mutates a `Style`; it replaces the reference with `factory.of(newValues)`",
          "Style runs (`List<Run>`) reduce per-character references further: the extrinsic state becomes the run boundaries",
          "Glyph shapes (rendered bitmaps per font + char + size) are a second flyweight cache in the renderer"],
        m: H.cd(["classDiagram",
          "  class Style { <<record>>; String font; int size; String color; boolean bold }",
          "  class StyleFactory { -Map~Style,Style~ pool; +of(String font, int size, String color, boolean bold) Style; +poolSize() int }",
          "  class Run { int start; int length; Style style }",
          "  class Document { -StringBuilder text; -List~Run~ runs; +insert(int pos, String s, Style st); +restyle(int from, int to, Style st) }",
          "  Document o-- Run",
          "  Run --> Style : shared",
          "  StyleFactory o-- Style"]),
        code: `record Style(String font, int size, String color, boolean bold) {}
final class StyleFactory {
    private final Map<Style, Style> pool = new HashMap<>();
    Style of(String font, int size, String color, boolean bold) { Style s = new Style(font, size, color, bold); return pool.computeIfAbsent(s, k -> k); }
    int poolSize() { return pool.size(); }
}
record Run(int start, int length, Style style) {}
class Document {
    private final StringBuilder text = new StringBuilder(); private final List<Run> runs = new ArrayList<>();
    void append(String s, Style st) {
        Run last = runs.isEmpty() ? null : runs.get(runs.size() - 1);
        if (last != null && last.style() == st) runs.set(runs.size() - 1, new Run(last.start(), last.length() + s.length(), st));   // merge runs
        else runs.add(new Run(text.length(), s.length(), st));
        text.append(s);
    }
    int chars() { return text.length(); }
    int runCount() { return runs.size(); }
}

StyleFactory styles = new StyleFactory();
Document doc = new Document();
for (int i = 0; i < 10_000; i++) {
    doc.append("Hello ", styles.of("Inter", 12, "black", false));
    doc.append("world", styles.of("Inter", 12, "black", i % 100 == 0));        // occasionally bold
    doc.append(". ", styles.of("Inter", 12, "black", false));
}
System.out.println(doc.chars() + " chars, " + doc.runCount() + " runs, " + styles.poolSize() + " Style objects");` },
      { title: "Mini LLD: a multiplayer game's bullets and particles",
        text: "A shooter renders up to 50,000 bullets and particles per frame. Each has position, velocity and remaining lifetime (extrinsic, changes every frame) and a sprite, mass, damage and sound (intrinsic, per projectile type). `ProjectileType` flyweights hold sprites and stats; a struct-of-arrays store holds the per-instance numbers. This also shows Flyweight's relative: an **object pool** for the mutable per-instance part to avoid GC churn.",
        points: [
          "`ProjectileType` (flyweight): `sprite`, `mass`, `damage`, `sound`; maybe 20 types",
          "Per-instance state lives in parallel primitive arrays (`float[] x, y, vx, vy; short[] typeId; float[] ttl`) for cache-friendly updates",
          "Spawning reuses free slots (a pool of indices) instead of allocating objects every frame",
          "Rendering loops by type so each sprite texture is bound once per frame (batching)",
          "Interview trade-off: arrays of primitives beat object graphs when n is huge; Flyweight's idea (separating shared from per-instance data) is what matters, not the class shape"],
        m: M(["flowchart LR",
          "  A[\"<b>ProjectileTypes</b><br/><span class='d'>20 shared flyweights:<br/>sprite, mass, damage</span>\"]:::s0",
          "  B[\"<b>Instance arrays</b><br/><span class='d'>x[], y[], vx[], vy[], ttl[], typeId[]<br/>50,000 slots</span>\"]:::s1",
          "  C[\"<b>Free-slot pool</b><br/><span class='d'>reuse indices, no GC churn</span>\"]:::s2",
          "  B -->|typeId| A",
          "  C -->|spawn / despawn| B"]) }
    ],
    usages: [
      ["`Integer.valueOf`, `Long.valueOf`, `Character.valueOf`, `Byte`, `Short`", "Cached boxes for small values; autoboxing uses them."],
      ["`Boolean.valueOf` / `Boolean.TRUE`", "Only two `Boolean` instances are ever needed."],
      ["String pool, `String.intern()`", "One shared instance per distinct literal/interned string."],
      ["Enums", "A fixed set of shared, immutable-by-convention instances."],
      ["`Collections.emptyList()`, `List.of()`, `Optional.empty()`", "Shared immutable empty instances instead of new objects per call."],
      ["`java.time.ZoneOffset.ofHours(...)`, `ZoneId` caches", "Common offsets are cached and reused."],
      ["Guava `Interners.newWeakInterner()`", "A general-purpose flyweight factory: returns one canonical instance per equal value, with weak references so unused ones can be collected."]
    ],
    avoid: {
      points: [
        "Object counts are modest (thousands, not millions): the memory saving doesn't justify the factory and indirection",
        "There is little shared state: most fields are extrinsic, so each flyweight is shared by few contexts",
        "The shared state needs to change per context: you'd be tempted to mutate the flyweight",
        "Identity matters to clients (they compare with `==` or use flyweights as distinct locks)",
        "Extrinsic state is expensive to compute or pass every time, so the CPU cost outweighs the memory saved"],
      pros: ["Large memory savings when many objects share state", "Fewer allocations and less GC pressure", "Natural fit for immutable value objects", "Factory centralises creation and makes sharing explicit"],
      cons: ["More complex code: state split across flyweight and context", "Extrinsic state must be passed around or recomputed", "Factory cache can grow without bound (needs eviction or a closed key set)", "Shared mutable state bugs if immutability isn't enforced"] },
    compare: [
      ["Singleton (F05)", "Exactly one instance of a class", "Flyweight has one instance **per intrinsic key** (many in total) and is about memory, not global access"],
      ["Object pool", "Reuse expensive objects exclusively", "Pooled objects are borrowed one user at a time and are mutable; flyweights are shared simultaneously and immutable"],
      ["Caching proxy (F13)", "Store results of expensive calls", "Caches **results**; a flyweight factory caches **instances** to share state"],
      ["Prototype (F09)", "Create objects by copying", "Opposite direction: Prototype makes independent copies, Flyweight avoids copies"],
      ["Composite (F14)", "Trees of objects", "Leaves of large composites (glyphs in a document tree) are often flyweights"]],
    widget: { heading: "Interactive: how much memory does sharing save?", caption: "Choose how many trees and how many distinct species. The estimates use typical 64-bit JVM sizes with compressed references.", render: flyWidget },
    pitfalls: [
      "Mutable flyweights: one context changes the shared object and every other context sees it",
      "Records with array components (`byte[] texture`) are not deeply immutable; don't expose the array, or copy it",
      "Comparing boxed `Integer`/`Long` with `==`: works only inside the cache range",
      "Unbounded factory caches keyed by user input (memory leak); bound them or use a closed set of keys",
      "Non-thread-safe factories (`HashMap` + check-then-put) creating duplicate flyweights under concurrency",
      "Using flyweights as `synchronized` locks: unrelated code shares the same monitor (classic with interned strings and `Integer`s)",
      "Applying the pattern when n is small: complexity without a measurable gain",
      "Forgetting that extrinsic state must still be stored somewhere; measure total memory, not just the flyweights"
    ],
    quiz: [
      { q: "What is Flyweight's intent?", options: ["Ensure one instance", "Share fine-grained objects to support huge numbers of them efficiently", "Create objects by copying", "Control access"], answer: 1, why: "Memory efficiency through sharing intrinsic state." },
      { q: "In a forest renderer, a tree's x/y coordinates are…", options: ["Intrinsic", "Extrinsic", "Flyweights", "Static"], answer: 1, why: "They differ per tree; species data is intrinsic." },
      { q: "`Integer a = 1000, b = 1000; a == b` is…", options: ["Always true", "false by default: 1000 is outside the -128..127 cache, so two objects are created", "A compile error", "true on 64-bit JVMs"], answer: 1, why: "Compare boxed values with `equals`." },
      { q: "Why must flyweights be immutable?", options: ["For serialisation", "They're shared by many contexts at once; a change would affect them all", "To be faster", "Records require it"], answer: 1, why: "Shared mutable state = action at a distance." },
      { q: "Flyweight vs object pool:", options: ["Same thing", "Flyweights are shared simultaneously and immutable; pooled objects are borrowed exclusively and are mutable", "Pools save memory, flyweights save time", "Pools are singletons"], answer: 1, why: "Simultaneous sharing vs exclusive reuse." },
      { q: "A thread-safe flyweight factory in Java is easiest with…", options: ["`HashMap` + `synchronized` on every client", "`ConcurrentHashMap.computeIfAbsent`", "`WeakHashMap` without locking", "A static array"], answer: 1, why: "Atomic create-if-absent per key." },
      { q: "Which is NOT a JDK flyweight?", options: ["`Boolean.valueOf`", "`String.intern()`", "`new StringBuilder()`", "`Integer.valueOf(42)`"], answer: 2, why: "`new` always creates a fresh, mutable object." },
      { q: "Why is `synchronized (\"LOCK\")` dangerous?", options: ["It doesn't compile", "String literals are interned flyweights; any other code using the same literal shares your lock", "Strings can't be locked", "It's slow"], answer: 1, why: "Use a private `final Object lock = new Object()`." }
    ],
    cheatsheet: {
      table: [
        ["Concept", "Meaning", "Example"],
        ["Intrinsic", "shared, context-free, immutable", "species + texture, font style, glyph"],
        ["Extrinsic", "per use; stored in context or passed in", "x/y, character position, board square"],
        ["Factory", "one instance per key", "`computeIfAbsent`, `Integer.valueOf`"],
        ["Saving", "n × intrinsic → k × intrinsic", "1M trees, 10 species"]],
      cards: [
        { title: "Use when", items: ["Huge numbers of similar objects", "Most state can be shared", "Shared part can be immutable", "Identity doesn't matter"] },
        { title: "Java traps", items: ["`Integer ==` outside -128..127", "String `==` vs `equals`", "Locking on interned strings/boxes", "Mutable record components"] },
        { title: "Related", items: ["Singleton: one", "Pool: exclusive reuse", "Cache: results", "Composite leaves often flyweights"] }]
    },
    practice: [
      { level: "Easy", q: "Explain intrinsic vs extrinsic state with two examples, and state the two rules a flyweight must follow.",
        a: ["**Intrinsic**: shared and context-independent (a tree species' texture; a character's font style; a chess piece's colour and kind).",
          "**Extrinsic**: depends on context (the tree's position; the character's index in the document; the piece's square).",
          "Rules: (1) flyweights are **immutable**; (2) clients get them only from the **factory**, never with `new`, so sharing is guaranteed."] },
      { level: "Easy", q: "Predict the output, then explain each line.",
        qcode: `Integer x = 100, y = 100, p = 200, q = 200;
System.out.println(x == y);
System.out.println(p == q);
System.out.println(p.equals(q));
Long l = 127L; System.out.println(l.equals(127));`,
        code: `Integer x = 100, y = 100, p = 200, q = 200;
System.out.println(x == y);                  // true: cached flyweight
System.out.println(p == q);                  // false: outside the cache, two objects
System.out.println(p.equals(q));             // true: value comparison
Long l = 127L; System.out.println(l.equals(127));   // false: 127 autoboxes to Integer, and Long.equals needs a Long`,
        follow: "The last line is a favourite follow-up: `equals` across box types is always false." },
      { level: "Medium", q: "Model a chess game so that 32 pieces across thousands of stored games use only 12 piece objects. What's intrinsic, what's extrinsic, and how do you represent a board?",
        code: `enum Color { WHITE, BLACK }
enum Kind { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN }
record Piece(Color color, Kind kind) {                                  // flyweight: 12 possible
    private static final Map<String, Piece> CACHE = new HashMap<>();
    static Piece of(Color c, Kind k) { return CACHE.computeIfAbsent(c + "" + k, x -> new Piece(c, k)); }
    char symbol() { char s = kind == Kind.KNIGHT ? 'N' : kind.name().charAt(0); return color == Color.WHITE ? s : Character.toLowerCase(s); }
    static int created() { return CACHE.size(); }
}
class Board {                                                          // extrinsic: which square holds which piece
    private final Piece[] squares = new Piece[64];
    void put(String sq, Piece p) { squares[(sq.charAt(1) - '1') * 8 + (sq.charAt(0) - 'a')] = p; }
    String rank(int r) { StringBuilder sb = new StringBuilder(); for (int f = 0; f < 8; f++) { Piece p = squares[r * 8 + f]; sb.append(p == null ? '.' : p.symbol()); } return sb.toString(); }
}

List<Board> games = new ArrayList<>();
Kind[] back = {Kind.ROOK, Kind.KNIGHT, Kind.BISHOP, Kind.QUEEN, Kind.KING, Kind.BISHOP, Kind.KNIGHT, Kind.ROOK};
for (int g = 0; g < 1_000; g++) {
    Board b = new Board();
    for (int f = 0; f < 8; f++) {
        char file = (char) ('a' + f);
        b.put(file + "1", Piece.of(Color.WHITE, back[f])); b.put(file + "2", Piece.of(Color.WHITE, Kind.PAWN));
        b.put(file + "7", Piece.of(Color.BLACK, Kind.PAWN)); b.put(file + "8", Piece.of(Color.BLACK, back[f]));
    }
    games.add(b);
}
System.out.println(games.get(0).rank(7) + " / " + games.get(0).rank(0));
System.out.println(games.size() * 32 + " piece placements, " + Piece.created() + " Piece objects");`,
        follow: "Even simpler: since there are exactly 12 and they're fixed, an enum `Piece { WHITE_KING, ... }` is a flyweight set guaranteed by the language." },
      { level: "Medium", q: "Write a thread-safe, bounded flyweight factory for `Currency`-like objects keyed by code, which rejects unknown codes instead of growing forever.",
        code: `record Money(String code, int fractionDigits, String symbol) {}
final class Currencies {
    private static final Map<String, Money> KNOWN = Map.of(
        "INR", new Money("INR", 2, "₹"), "USD", new Money("USD", 2, "$"), "JPY", new Money("JPY", 0, "¥"));
    private Currencies() {}
    static Money of(String code) {                          // closed key set: the cache can't grow
        Money m = KNOWN.get(code.toUpperCase());
        if (m == null) throw new IllegalArgumentException("unsupported currency " + code);
        return m;
    }
}

System.out.println(Currencies.of("inr") == Currencies.of("INR"));
System.out.println(Currencies.of("JPY"));
try { Currencies.of("XYZ"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }`,
        follow: "`java.util.Currency.getInstance(\"INR\")` is the JDK's own flyweight for this: one instance per ISO code. For open-ended keys (user-generated tags), bound the cache (LRU, Caffeine `maximumSize`) or use weak references (Guava `Interners.newWeakInterner()`)." },
      { level: "Medium", q: "A ride-hailing map shows 200,000 driver markers. Which parts of a marker are flyweights, and what else would you do for performance?",
        a: ["Flyweight: `MarkerStyle` per (vehicle type × status), e.g. auto/bike/cab × available/busy: icon bitmap, colours, size. About 10 objects.",
          "Extrinsic: driver ID, lat/lng, heading, last update time; stored compactly (parallel arrays or a small record).",
          "Spatial index (geohash/quad-tree) so only markers in the viewport are drawn; cluster at low zoom levels.",
          "Update positions in place (or pooled objects) to avoid GC churn on every location ping.",
          "Batch rendering per style so each icon texture is bound once per frame."] },
      { level: "Hard", q: "Estimate the memory for 1,000,000 `Tree` objects with and without Flyweight on a 64-bit JVM with compressed oops, given x, y (`int`), species `String` and a 4 KB `byte[]` texture. Show your arithmetic.",
        a: ["Without: each `Tree` ≈ 16 B header + 8 B (two ints) + 4 B species ref + 4 B texture ref = 32 B; plus its own texture array ≈ 16 B header + 4,096 B ≈ 4.1 KB. Total ≈ 1,000,000 × 4.14 KB ≈ **3.9 GB**.",
          "With: each `Tree` ≈ 16 + 8 + 4 (type ref) = 28 → 32 B after 8-byte alignment = **32 MB** for a million; 10 `TreeType`s with textures ≈ 10 × 4.2 KB ≈ 42 KB.",
          "Saving ≈ 99%. The list holding the trees adds ~4 B per reference (≈ 4 MB) in both cases.",
          "Mention: measure with JOL (Java Object Layout) or a heap dump rather than trusting estimates; alignment and headers vary by JVM flags."] },
      { level: "Hard", q: "Your service keeps 50 million small `Tag` objects (strings like \"veg\", \"spicy\", \"jain\") in memory across product records, and heap is at 85%. Walk through diagnosing and fixing it with Flyweight ideas.",
        a: ["Diagnose: heap dump (or `jcmd GC.class_histogram`) shows millions of `String`/`byte[]` with identical content and `Tag` instances.",
          "Fix 1: canonicalise tags through a factory (`Tag.of(name)` with `ConcurrentHashMap.computeIfAbsent`), or make `Tag` an **enum** if the set is closed.",
          "Fix 2: deserialisers (Jackson) create new strings per field; plug the interner into deserialisation (custom deserializer or `@JsonCreator` calling `Tag.of`).",
          "Fix 3: store tag **IDs** (`short`/bitset) per product instead of object references: a `long` bitmask covers 64 tags.",
          "Quick win: G1 `-XX:+UseStringDeduplication` shares duplicate string arrays without code changes (but not the wrapper objects).",
          "Verify with a before/after heap histogram and GC pause metrics."] },
      { level: "Hard", q: "Design a font-rendering glyph cache for a code editor: glyph bitmaps per (font, size, char, style). How do you keep it fast, bounded and thread-safe?",
        a: ["`GlyphKey(font, size, codePoint, bold, italic)` record as key; `Glyph` (bitmap + metrics) is the immutable flyweight.",
          "Two tiers: ASCII for the current font/size pre-rendered in an array (fast path, no hashing); everything else in a bounded LRU map (e.g. Caffeine with `maximumWeight` by bitmap bytes).",
          "Thread-safety: rendering threads read concurrently; creation via `computeIfAbsent` so a glyph is rasterised once.",
          "Text runs reference glyphs (Flyweight) plus extrinsic position; the layout engine positions them.",
          "Invalidate the cache on DPI/zoom changes (key includes size) rather than mutating glyphs."],
        m: H.cd(["classDiagram",
          "  class GlyphKey { <<record>>; String font; int size; int codePoint; boolean bold }",
          "  class Glyph { <<record>>; int width; int height; byte[] alpha }",
          "  class GlyphCache { -Glyph[] asciiFast; -LoadingCache lru; +get(GlyphKey k) Glyph }",
          "  class Rasterizer { +render(GlyphKey k) Glyph }",
          "  class TextLayout { -List positions; +draw(Canvas c) }",
          "  GlyphCache --> Rasterizer",
          "  GlyphCache o-- Glyph",
          "  TextLayout --> GlyphCache"]) }
    ],
    recap: [
      "Flyweight = share immutable intrinsic state across many objects; keep extrinsic state in the context or pass it in.",
      "A factory (`computeIfAbsent`, `valueOf`, `intern`, enums) guarantees one instance per key.",
      "JDK flyweights: boxed-value caches (-128..127 for `Integer`), string pool, `Boolean`, enums, empty collections. Never compare boxes or strings with `==`.",
      "Use it when objects number in the millions and most state is shared; measure before and after.",
      "Not the same as Singleton (one), object pool (exclusive, mutable) or cache (results)."
    ]
  });
})();
