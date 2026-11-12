/* Lesson J02: Data types & memory: stack, heap, primitives, wrappers, strings */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Stack & heap visualiser: cumulative states for each line of a snippet
  var CODE = [
    "int count = 3;",
    "String a = \"hi\";",
    "String b = \"hi\";",
    "String c = new String(\"hi\");",
    "Integer x = 127, y = 127;",
    "Integer p = 128, q = 128;",
    "StringBuilder sb = new StringBuilder(\"hi\");",
    "sb.append(\"!\");",
    "a = a + \"!\";",
    "c = null;"
  ];
  var OBJ = {
    lit: { label: "String #quot;hi#quot;", area: "pool" },
    cpy: { label: "String #quot;hi#quot;<br/>(new copy)", area: "heap" },
    i127: { label: "Integer 127", area: "cache" },
    p128: { label: "Integer 128", area: "heap" },
    q128: { label: "Integer 128", area: "heap" },
    sb: { label: "StringBuilder", area: "heap" },
    arr: { label: "byte[] value", area: "heap" },
    cat: { label: "String #quot;hi!#quot;", area: "heap" }
  };
  // each step: vars [[name, value or @obj]], objs (live), dead (garbage), sbText, note, checks
  var STEPS = [
    { vars: [], objs: [], note: "Before the first line: a fresh stack frame for `main`, empty heap (apart from what the JVM itself allocated).", checks: [] },
    { vars: [["count", "3"]], objs: [], note: "A primitive local: the **value 3 lives in the stack frame** itself. No object, nothing for the GC to do.", checks: [] },
    { vars: [["count", "3"], ["a", "@lit"]], objs: ["lit"], note: "A string **literal** is interned: the JVM keeps one `\"hi\"` in the **String pool** (part of the heap). `a` holds a **reference** to it.", checks: [] },
    { vars: [["count", "3"], ["a", "@lit"], ["b", "@lit"]], objs: ["lit"], note: "Same literal → **same pooled object**. `a` and `b` point to one `String`.", checks: [["a == b", "true (same object)"], ["a.equals(b)", "true"]] },
    { vars: [["count", "3"], ["a", "@lit"], ["b", "@lit"], ["c", "@cpy"]], objs: ["lit", "cpy"], note: "`new` **always** creates a new object on the heap, even with equal contents. (Both strings can share the same internal `byte[]`, an implementation detail.)", checks: [["a == c", "false (different objects)"], ["a.equals(c)", "true (same characters)"], ["a == c.intern()", "true (intern returns the pooled one)"]] },
    { vars: [["count", "3"], ["a", "@lit"], ["b", "@lit"], ["c", "@cpy"], ["x", "@i127"], ["y", "@i127"]], objs: ["lit", "cpy", "i127"], note: "**Autoboxing** calls `Integer.valueOf(127)`. Values from **-128 to 127 are cached**, so `x` and `y` share one `Integer`.", checks: [["x == y", "true (cached object)"], ["x.equals(y)", "true"]] },
    { vars: [["count", "3"], ["a", "@lit"], ["b", "@lit"], ["c", "@cpy"], ["x", "@i127"], ["y", "@i127"], ["p", "@p128"], ["q", "@q128"]], objs: ["lit", "cpy", "i127", "p128", "q128"], note: "128 is outside the cache: `valueOf` creates **two separate objects**. This is the classic `==` on wrappers bug.", checks: [["p == q", "false (!)"], ["p.equals(q)", "true"], ["p.intValue() == q", "true (unboxes q)"]] },
    { vars: [["count", "3"], ["a", "@lit"], ["b", "@lit"], ["c", "@cpy"], ["x", "@i127"], ["y", "@i127"], ["p", "@p128"], ["q", "@q128"], ["sb", "@sb"]], objs: ["lit", "cpy", "i127", "p128", "q128", "sb", "arr"], sb: "hi", note: "A `StringBuilder` is a **mutable** object wrapping a resizable internal array (capacity 16 + 2 here).", checks: [] },
    { vars: [["count", "3"], ["a", "@lit"], ["b", "@lit"], ["c", "@cpy"], ["x", "@i127"], ["y", "@i127"], ["p", "@p128"], ["q", "@q128"], ["sb", "@sb"]], objs: ["lit", "cpy", "i127", "p128", "q128", "sb", "arr"], sb: "hi!", note: "`append` **mutates the same object** in place: no new `StringBuilder`, `sb` still points to it.", checks: [["sb.toString()", "\"hi!\""]] },
    { vars: [["count", "3"], ["a", "@cat"], ["b", "@lit"], ["c", "@cpy"], ["x", "@i127"], ["y", "@i127"], ["p", "@p128"], ["q", "@q128"], ["sb", "@sb"]], objs: ["lit", "cpy", "i127", "p128", "q128", "sb", "arr", "cat"], sb: "hi!", note: "Strings are **immutable**: `a + \"!\"` builds a **new** `String` and `a` is re-pointed. The pooled `\"hi\"` is unchanged and `b` still sees `\"hi\"`.", checks: [["b", "\"hi\" (unchanged)"], ["a == \"hi!\"", "false (runtime concatenation isn't pooled)"]] },
    { vars: [["count", "3"], ["a", "@cat"], ["b", "@lit"], ["c", "null"], ["x", "@i127"], ["y", "@i127"], ["p", "@p128"], ["q", "@q128"], ["sb", "@sb"]], objs: ["lit", "i127", "p128", "q128", "sb", "arr", "cat"], dead: ["cpy"], note: "Nothing references the `new String` copy any more: it's **unreachable**, so the GC may reclaim it at some point. Setting locals to `null` is rarely needed; they die when the method returns.", checks: [["c.length()", "NullPointerException"]] }
  ];
  function memWidget(el, ctx) {
    var s = ctx.state; if (typeof s.i !== "number" || s.i < 0 || s.i >= STEPS.length) s.i = 0;
    el.innerHTML = "<div class='grid2' style='display:grid;grid-template-columns:minmax(0,370px) minmax(0,1fr);gap:16px;align-items:start'>" +
      "<pre class='code' data-r='src' style='margin:0;font-size:12px;overflow-x:auto'></pre><div><div class='diagram' data-r='dg' style='margin:0'></div></div></div>" +
      "<p data-r='note' style='margin-top:12px'></p><div data-r='checks'></div>" +
      "<div class='btnrow'><button type='button' class='btn' data-r='prev'>← Back</button><button type='button' class='btn primary' data-r='next'>Run next line →</button><button type='button' class='btn' data-r='reset'>Restart</button></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var st = STEPS[s.i];
      q("src").innerHTML = CODE.map(function (ln, k) {
        var done = k < s.i, cur = k === s.i - 1;
        return "<div style='padding:1px 6px;border-radius:4px;" + (cur ? "background:var(--accent-subtle);font-weight:600" : done ? "" : "opacity:.45") + "'>" + String(k + 1).padStart(2, " ") + "  " + ctx.esc(ln) + "</div>";
      }).join("");
      var L = ["flowchart LR", "  subgraph S[\"Stack: main() frame\"]", "    direction TB"];
      if (!st.vars.length) L.push("    v0[\"(empty)\"]:::s4");
      st.vars.forEach(function (v, k) { L.push("    v" + k + "[\"" + v[0] + (v[1].charAt(0) === "@" ? " ●" : " = " + v[1]) + "\"]:::" + (v[1].charAt(0) === "@" ? "s0" : v[1] === "null" ? "s4" : "s2")); });
      L.push("  end", "  subgraph HP[\"Heap\"]", "    direction TB");
      var areas = { pool: [], cache: [], heap: [] };
      st.objs.concat(st.dead || []).forEach(function (o) { areas[OBJ[o].area].push(o); });
      function node(o) { var lab = OBJ[o].label; if (o === "sb") lab += "<br/>#quot;" + st.sb + "#quot;"; if (o === "arr") lab += "<br/>[" + (st.sb || "").split("").join(",") + ", …]"; return "    " + o + "[\"" + lab + ((st.dead || []).indexOf(o) >= 0 ? "<br/>(unreachable)" : "") + "\"]:::" + ((st.dead || []).indexOf(o) >= 0 ? "bad" : areas.pool.indexOf(o) >= 0 ? "s1" : "s3"); }
      if (areas.pool.length) { L.push("    subgraph PL[\"String pool\"]"); areas.pool.forEach(function (o) { L.push(node(o)); }); L.push("    end"); }
      if (areas.cache.length) { L.push("    subgraph IC[\"Integer cache -128..127\"]"); areas.cache.forEach(function (o) { L.push(node(o)); }); L.push("    end"); }
      areas.heap.forEach(function (o) { L.push(node(o)); });
      if (!st.objs.length && !(st.dead || []).length) L.push("    h0[\"(no objects yet)\"]:::s4");
      L.push("  end");
      st.vars.forEach(function (v, k) { if (v[1].charAt(0) === "@") L.push("  v" + k + " --> " + v[1].slice(1)); });
      if (st.objs.indexOf("sb") >= 0) L.push("  sb -.-> arr");
      L.push("  classDef s0 fill:#dbeafe,stroke:#2563eb", "  classDef s1 fill:#fff3e0,stroke:#ef6c00", "  classDef s2 fill:#ecfeff,stroke:#0891b2", "  classDef s3 fill:#ecfdf5,stroke:#059669", "  classDef s4 fill:#f5f5f5,stroke:#bdbdbd,color:#888", "  classDef bad fill:#ffebee,stroke:#c62828,stroke-dasharray:4 3");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("note").innerHTML = "<strong>" + (s.i === 0 ? "Start" : "Line " + s.i) + ":</strong> " + ctx.md(st.note);
      q("checks").innerHTML = st.checks.length ? "<div class='tablewrap'><table><thead><tr><th>Expression</th><th>Result</th></tr></thead><tbody>" + st.checks.map(function (c) { return "<tr><td><code>" + ctx.esc(c[0]) + "</code></td><td>" + ctx.esc(c[1]) + "</td></tr>"; }).join("") + "</tbody></table></div>" : "";
      q("prev").disabled = s.i === 0; q("next").disabled = s.i === STEPS.length - 1;
    }
    q("prev").addEventListener("click", function () { s.i = Math.max(0, s.i - 1); ctx.save(); draw(); });
    q("next").addEventListener("click", function () { s.i = Math.min(STEPS.length - 1, s.i + 1); ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.i = 0; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Two families of types: primitives and references",
      text: "Java has exactly **8 primitive types**, which hold a plain value, and **reference types** (classes, interfaces, arrays, records, enums), whose variables hold a **reference** (a pointer-like handle) to an object on the heap. Primitives can't be `null`, have no methods and are fast; references can be `null`, can be shared and are what generics and collections work with.",
      table: [
        ["Type", "Size", "Range / values", "Default (fields)", "Wrapper"],
        ["`byte`", "8-bit", "-128 … 127", "0", "`Byte`"],
        ["`short`", "16-bit", "-32,768 … 32,767", "0", "`Short`"],
        ["`int`", "32-bit", "≈ ±2.1 billion (2³¹−1 = 2,147,483,647)", "0", "`Integer`"],
        ["`long`", "64-bit", "≈ ±9.2 × 10¹⁸", "0L", "`Long`"],
        ["`float`", "32-bit IEEE 754", "≈ 7 decimal digits", "0.0f", "`Float`"],
        ["`double`", "64-bit IEEE 754", "≈ 15–16 decimal digits", "0.0", "`Double`"],
        ["`char`", "16-bit unsigned", "UTF-16 code unit `'\\u0000'` … `'\\uffff'`", "`'\\u0000'`", "`Character`"],
        ["`boolean`", "JVM-specific (1 byte in arrays on HotSpot)", "`true` / `false`", "false", "`Boolean`"]],
      code: `int seats = 180;                      // value stored directly
long bookingsToday = 3_000_000_000L;   // needs L: too big for int
double fare = 4850.50;
char rupee = '₹';                      // one UTF-16 code unit
boolean refundable = false;
String route = "DEL-BLR";              // reference to a String object
int[] rows = {1, 2, 3};                // arrays are objects too

System.out.println(Integer.MAX_VALUE + " " + Long.MAX_VALUE);
System.out.println((int) rupee + " " + Character.getName(rupee));
System.out.println(route.length() + " chars, rows=" + rows.length);`,
      analogy: "A primitive is cash in your hand: the value itself. A reference is a locker key: the key is small and easy to copy, the actual stuff sits in the locker room (heap), and two people with copies of the same key open the same locker." },
    { title: "Numeric gotchas: overflow, division, casts, floating point",
      text: "Integer arithmetic **wraps around silently** on overflow, integer division **truncates**, narrowing casts **drop bits**, and `double` can't represent most decimal fractions exactly. Each is a common interview trick and a real production bug (money, counters, timestamps).",
      code: `int big = Integer.MAX_VALUE;
System.out.println("overflow: " + (big + 1));                           // wraps to MIN_VALUE
try { Math.addExact(big, 1); } catch (ArithmeticException e) { System.out.println("addExact: " + e.getMessage()); }

long millisPerYearWrong = 365 * 24 * 60 * 60 * 1000;                    // int math, then widened: already overflowed
long millisPerYear = 365L * 24 * 60 * 60 * 1000;
System.out.println(millisPerYearWrong + " vs " + millisPerYear);

System.out.println("7 / 2 = " + 7 / 2 + ", 7 / 2.0 = " + 7 / 2.0 + ", -7 / 2 = " + -7 / 2 + ", -7 % 2 = " + -7 % 2);
System.out.println("(byte) 200 = " + (byte) 200 + ", (int) 3.99 = " + (int) 3.99 + ", Math.round(2.5) = " + Math.round(2.5));

System.out.println("0.1 + 0.2 = " + (0.1 + 0.2));
BigDecimal total = new BigDecimal("0.10").add(new BigDecimal("0.20"));
System.out.println("BigDecimal: " + total + ", 1/0.0 = " + 1 / 0.0 + ", 0.0/0.0 = " + 0.0 / 0.0);`,
      points: ["Use `long` for counts and epoch millis; `Math.addExact`/`multiplyExact` when overflow must fail loudly", "Money: `BigDecimal` built from a **String** (or `long` paise/cents), never `double`; compare with `compareTo`, not `equals` (`2.0` vs `2.00`)", "Widening (`int` → `long`) is automatic; narrowing needs a cast and may lose data", "`char + 1` is an `int`; `byte b = 10; b += 5;` compiles (compound assignment casts) but `b = b + 5` doesn't"] },
    { title: "Stack vs heap",
      text: "Every thread has its own **stack**. Each method call pushes a **frame** holding its parameters and local variables: primitives directly, references as handles. **Objects** (anything made with `new`, arrays, strings) live on the **heap**, shared by all threads and cleaned up by the garbage collector. When a method returns, its frame is popped instantly; heap objects live as long as something still references them.",
      m: M(["flowchart LR",
        "  subgraph T[\"Thread main: stack\"]",
        "    direction TB",
        "    F2[\"frame: price(b)<br/>b ● · rate = 1.18\"]:::s0",
        "    F1[\"frame: main<br/>count = 2 · booking ● · names ●\"]:::s0",
        "  end",
        "  subgraph HP[\"Heap (shared)\"]",
        "    BK[\"Booking<br/>route ● · seats = 2\"]:::s1",
        "    ST[\"String #quot;DEL-BLR#quot;\"]:::s1",
        "    LS[\"ArrayList<br/>elementData ●\"]:::s2",
        "  end",
        "  F1 -- booking --> BK",
        "  F2 -- b --> BK",
        "  BK -- route --> ST",
        "  F1 -- names --> LS"]),
      code: `record Booking(String route, int seats) {}
static double price(Booking b) {           // new frame: b (reference copy), rate (primitive)
    double rate = 1.18;
    return b.seats() * 4850 * rate;
}

int count = 2;                              // primitive on main's frame
Booking booking = new Booking("DEL-BLR", count);   // object on the heap, reference on the stack
List<String> names = new ArrayList<>(List.of("Deepak", "Rishabh"));
System.out.printf("₹%.2f for %s%n", price(booking), names);   // price's frame is gone after this line`,
      table: [
        ["", "Stack", "Heap"],
        ["Holds", "Frames: locals, params, return addresses", "All objects and arrays"],
        ["Scope", "One per thread", "Shared by all threads"],
        ["Lifetime", "Until the method returns", "Until unreachable, then GC"],
        ["Size", "Small, `-Xss` (≈512 KB–1 MB default)", "Large, `-Xmx`"],
        ["Error when full", "`StackOverflowError`", "`OutOfMemoryError: Java heap space`"],
        ["Thread safety", "Locals are confined to their thread", "Needs synchronisation when shared + mutable"]],
      points: ["Escape analysis lets the JIT avoid heap allocation for objects that never leave a method, but conceptually objects are on the heap"] },
    { title: "Java is always pass-by-value",
      text: "Java passes **copies**. For a primitive the copy is the value. For an object the copy is the **reference**, so the method can **mutate** the object both variables point to, but **reassigning** the parameter only changes the method's own copy. \"Objects are passed by reference\" is the wrong phrase; \"references are passed by value\" is right.",
      m: M(["flowchart LR",
        "  subgraph Caller[\"caller frame\"]",
        "    C1[\"seats = 2\"]:::s2",
        "    C2[\"list ●\"]:::s0",
        "  end",
        "  subgraph Callee[\"modify(n, l) frame\"]",
        "    D1[\"n = 2 → 99<br/>(own copy)\"]:::s2",
        "    D2[\"l ● (copied reference)\"]:::s0",
        "  end",
        "  OBJ[\"ArrayList on heap<br/>[A, B, C]\"]:::s1",
        "  C2 --> OBJ",
        "  D2 -- \"l.add(C) mutates shared object\" --> OBJ",
        "  NEW[\"new ArrayList<br/>(only l sees it)\"]:::bad",
        "  D2 -. \"l = new ... re-points only l\" .-> NEW"]),
      code: `static void modify(int n, List<String> l, StringBuilder sb) {
    n = 99;                          // changes the local copy only
    l.add("C");                      // mutates the shared object: caller sees it
    sb.append("!");                  // same: mutation is visible
    l = new ArrayList<>();           // re-points the local copy only
    l.add("lost");
}

int seats = 2;
List<String> list = new ArrayList<>(List.of("A", "B"));
StringBuilder sb = new StringBuilder("hi");
modify(seats, list, sb);
System.out.println(seats + " " + list + " " + sb);   // 2 [A, B, C] hi!`,
      points: ["That's why you can't write a `swap(a, b)` for two `Integer`s in Java", "Defensive copies (`List.copyOf`) protect your objects from callers mutating them (immutability: J35, LLD F01)"] },
    { title: "Wrappers, autoboxing and the Integer cache",
      text: "Each primitive has a wrapper class (`Integer`, `Long`, `Double`…) so values can go into collections and generics. The compiler converts automatically: **autoboxing** calls `Integer.valueOf(i)`, **unboxing** calls `x.intValue()`. `valueOf` returns **cached** objects for -128…127, so `==` on wrappers works for small values and fails for larger ones. Unboxing `null` throws `NullPointerException`.",
      code: `Integer a = 127, b = 127, c = 128, d = 128;
System.out.println("a == b: " + (a == b) + ", c == d: " + (c == d) + ", c.equals(d): " + c.equals(d));

Map<String, Integer> stock = new HashMap<>();
try { int left = stock.get("DEL-BLR"); System.out.println(left); }       // unboxing null
catch (NullPointerException e) { System.out.println("NPE from unboxing a missing map value"); }
System.out.println("safe: " + stock.getOrDefault("DEL-BLR", 0));

Long total = 0L;
long t0 = System.nanoTime();
for (int i = 0; i < 1_000_000; i++) total += i;          // unbox, add, box a new Long each time
long boxedMs = (System.nanoTime() - t0) / 1_000_000;
long sum = 0;
for (int i = 0; i < 1_000_000; i++) sum += i;
System.out.println("same result: " + (total == sum) + " (boxed loop took ~" + boxedMs + " ms)");

Object o = 42;                                           // boxed to Integer
System.out.println(o.getClass().getSimpleName() + ", ternary trap: " + (true ? Integer.valueOf(1) : Double.valueOf(2)));`,
      table: [
        ["Wrapper", "Cached by `valueOf`"],
        ["`Boolean`", "`TRUE`, `FALSE`"],
        ["`Byte`, `Short`, `Long`", "-128 … 127"],
        ["`Integer`", "-128 … 127 (upper bound tunable with `-XX:AutoBoxCacheMax`)"],
        ["`Character`", "0 … 127"],
        ["`Float`, `Double`", "Not cached"]],
      points: ["**Always compare wrappers with `equals`** (or unbox first); `==` compares references", "The ternary prints `1.0`: mixed `Integer`/`Double` operands are unboxed and promoted to `double`", "`new Integer(5)` is deprecated (for removal); use `Integer.valueOf` or autoboxing", "Prefer primitives in hot loops and `int[]` / `IntStream` over `List<Integer>` for large numeric data"] },
    { title: "Variables: defaults, initialisation, var, final",
      text: "**Fields** (instance and static) get default values: `0`, `false`, `'\\u0000'`, `null`. **Local variables have no default**: the compiler refuses to read one that isn't definitely assigned. `var` (Java 10) infers a local's type from its initialiser: still static typing. `final` means the variable can be assigned once; it does **not** make the object immutable.",
      code: `class Counter { int hits; String label; boolean on; }   // fields get defaults

Counter c = new Counter();
System.out.println(c.hits + " " + c.label + " " + c.on);   // 0 null false

int x;
// System.out.println(x);        // compile error: variable x might not have been initialized
x = 5;

var fares = new HashMap<String, List<Integer>>();          // inferred: HashMap<String, List<Integer>>
fares.computeIfAbsent("DEL-BLR", k -> new ArrayList<>()).add(4850);
for (var e : fares.entrySet()) System.out.println(e.getKey() + " → " + e.getValue());

final List<String> crew = new ArrayList<>();
crew.add("pilot");             // allowed: the object is mutable
// crew = new ArrayList<>();   // compile error: the variable is final
List<String> fixed = List.of("pilot", "copilot");
try { fixed.add("engineer"); } catch (UnsupportedOperationException e) { System.out.println("List.of is unmodifiable"); }
System.out.println(crew + " " + x);`,
      points: ["`var` only for locals with an initialiser (not fields, params or `var x = null;`); use it when the type is obvious from the right-hand side", "Effectively final locals (never reassigned) can be captured by lambdas (J10)", "Prefer immutable objects: `final` fields + no setters + defensive copies, or records"] },
    { title: "Strings are immutable: what and why",
      text: "A `String` can never change after creation. Every \"modifying\" method (`toUpperCase`, `replace`, `concat`, `+`) returns a **new** string. Since Java 9 a string stores its characters in a `byte[]` with a **coder** flag: one byte per char when all chars are Latin-1 (**compact strings**), two bytes (UTF-16) otherwise.",
      m: M(["flowchart LR",
        "  S[\"s ●\"]:::s0 --> A[\"String #quot;delhi#quot;\"]:::s1",
        "  S -. \"after s = s.toUpperCase()\" .-> B[\"new String #quot;DELHI#quot;\"]:::s2",
        "  T[\"t ●\"]:::s0 --> A"]),
      code: `String s = "delhi";
String t = s;
s = s.toUpperCase();                       // new object; t still sees the original
System.out.println(s + " " + t);

String name = "deepak";
name.concat(" kumar");                     // result ignored: a classic bug
System.out.println(name);
name = name.concat(" kumar");
System.out.println(name);

Map<String, Integer> fares = new HashMap<>();
String key = "DEL-BLR";
fares.put(key, 4850);
System.out.println(fares.get("DEL-BLR") + ", hash cached: " + (key.hashCode() == "DEL-BLR".hashCode()));`,
      table: [
        ["Why immutable", "What it buys"],
        ["Security", "A file path, URL or class name checked by security code can't be changed afterwards"],
        ["Safe hash keys", "`hashCode` never changes, so strings are ideal `HashMap` keys; the hash is computed once and cached"],
        ["String pool", "Sharing one instance per literal is only safe if nobody can modify it"],
        ["Thread safety", "Immutable objects can be shared across threads without locks"]],
      analogy: "A printed boarding pass. To change the seat the airline prints a new pass; it never edits the old one, so anyone still holding the old pass sees exactly what was printed." },
    { title: "The String pool: ==, equals and intern",
      text: "String **literals** and compile-time constant expressions are **interned**: the JVM keeps one shared instance per distinct value in the **String pool** (on the heap since Java 7). `new String(\"x\")` always creates a separate object, and strings built at run time (concatenation of variables, `substring`, reading input) are new objects too. `==` compares references; **`equals` compares characters**: use `equals` (or `equalsIgnoreCase`) for strings, always.",
      m: M(["flowchart LR",
        "  subgraph Heap",
        "    subgraph Pool[\"String pool\"]",
        "      P[\"#quot;BLR#quot;\"]:::s1",
        "    end",
        "    N[\"new String(#quot;BLR#quot;)\"]:::s2",
        "    R[\"#quot;BL#quot; + suffix (runtime)\"]:::s2",
        "  end",
        "  A[\"a\"]:::s0 --> P",
        "  B[\"b\"]:::s0 --> P",
        "  C[\"c\"]:::s0 --> N",
        "  D[\"d\"]:::s0 --> R",
        "  R -. \"d.intern()\" .-> P"]),
      code: `String a = "BLR";
String b = "BLR";
String c = new String("BLR");
String suffix = "R";
String d = "BL" + suffix;                 // built at run time: not pooled
final String fin = "R";
String e = "BL" + fin;                    // compile-time constant: folded to "BLR" and pooled

System.out.println("a == b: " + (a == b));
System.out.println("a == c: " + (a == c) + ", a.equals(c): " + a.equals(c));
System.out.println("a == d: " + (a == d) + ", a == d.intern(): " + (a == d.intern()));
System.out.println("a == e: " + (a == e));
System.out.println("null-safe: " + "BLR".equals(null) + ", " + Objects.equals(null, null));`,
      points: ["`intern()` returns the pooled instance (adding it if missing); rarely needed in app code, and large-scale interning can bloat the pool", "Put the literal first (`\"BLR\".equals(code)`) or use `Objects.equals` to avoid NPEs", "G1 can deduplicate equal strings' backing arrays (`-XX:+UseStringDeduplication`)", "Interview phrase: \"How many objects does `new String(\"hi\")` create?\" Up to two: the pooled literal (if not already there) + the new heap object"] },
    { title: "Building strings: +, StringBuilder, StringBuffer, join",
      text: "Each `+` on strings creates a new string. In one expression that's fine: since Java 9 the compiler emits a single `invokedynamic` call to `StringConcatFactory` that sizes the result once. **In a loop**, `s += x` copies the whole growing string every iteration: O(n²). Use a **`StringBuilder`** (mutable, not synchronised), or `String.join` / `Collectors.joining`. `StringBuffer` is the old synchronised version: almost never needed.",
      code: `List<String> codes = IntStream.range(0, 20_000).mapToObj(i -> "PNR" + i).toList();

long t0 = System.nanoTime();
String slow = "";
for (String c : codes) slow += c + ",";              // copies the whole string every time
long slowMs = (System.nanoTime() - t0) / 1_000_000;

t0 = System.nanoTime();
StringBuilder sb = new StringBuilder(codes.size() * 9);   // pre-size when you can
for (String c : codes) sb.append(c).append(',');
String fast = sb.toString();
long fastMs = (System.nanoTime() - t0) / 1_000_000;

System.out.println("same: " + slow.equals(fast) + ", += loop slower: " + (slowMs > fastMs) + " (" + slowMs + " ms vs " + fastMs + " ms)");
System.out.println(String.join(" | ", List.of("DEL", "BOM", "BLR")));
System.out.println(Stream.of("a", "b", "c").collect(Collectors.joining(", ", "[", "]")));
System.out.println(new StringBuilder("level").reverse() + " " + new StringBuilder("hello").insert(0, ">> ").replace(3, 4, "H"));`,
      table: [
        ["", "`String`", "`StringBuilder`", "`StringBuffer`"],
        ["Mutable", "No", "Yes", "Yes"],
        ["Thread-safe", "Yes (immutable)", "No", "Yes (synchronized methods)"],
        ["Speed", "New object per change", "Fastest", "Slower (locking)"],
        ["Use for", "Values, keys, constants", "Building text in a loop / method", "Legacy APIs only"]],
      points: ["Default capacity is 16 chars (`new StringBuilder(s)`: `s.length() + 16`); it grows by roughly doubling, copying the array", "`StringBuilder` doesn't override `equals`: compare `sb1.toString().equals(...)` or use `sb1.compareTo(sb2) == 0` (Java 11+)"] },
    { title: "String APIs you'll use daily (Java 11–21)",
      text: "Modern Java added many small helpers. Knowing them makes interview code shorter and work code clearer. Watch out for `split` (takes a **regex**) and for `strip` vs `trim` (Unicode whitespace).",
      code: `String raw = "  Deepak,  Rishabh ,,Asha  ";
System.out.println("[" + raw.strip() + "] blank? " + "   ".isBlank() + ", empty? " + "".isEmpty());
System.out.println(Arrays.toString(raw.strip().split("\\\\s*,\\\\s*")));           // split takes a regex
System.out.println(Arrays.toString("a.b.c".split("\\\\.")) + " vs " + "a.b.c".split(".").length);  // "." matches everything
System.out.println("=".repeat(10));
"line1\\nline2\\n".lines().map(String::toUpperCase).forEach(System.out::println);
System.out.println("%s → %s: ₹%,d".formatted("DEL", "BLR", 485000));
System.out.println("apple".compareTo("banana") + " " + "b".compareTo("a") + " " + "Apple".compareToIgnoreCase("apple"));
System.out.println("mississippi".chars().filter(ch -> ch == 's').count() + " s's, index of 'ss' from 3: " + "mississippi".indexOf("ss", 3));
String block = """
    {"route": "DEL-BLR",
     "fare": 4850}
    """;
System.out.print(block);
System.out.println(String.valueOf((Object) null) + " " + "abc".contains("bc") + " " + "Hello".charAt(1) + " " + "racecar".substring(1, 4));`,
      table: [
        ["Method", "Since", "Note"],
        ["`isBlank`, `strip`, `lines`, `repeat`", "11", "Unicode-aware whitespace"],
        ["`formatted`, text blocks `\"\"\"`", "15", "Instance version of `String.format`"],
        ["`indent`, `transform`", "12", "Rare"],
        ["`chars()`", "8", "`IntStream` of UTF-16 units; use `codePoints()` for emoji"],
        ["`compareTo`", "1.0", "Lexicographic by UTF-16 value; negative/0/positive"]],
      points: ["`substring` copies characters since Java 7u6 (no more shared-array memory leak)", "`length()` counts UTF-16 units: an emoji counts 2"] },
    { title: "How big are objects? Memory layout and boxing cost",
      text: "On 64-bit HotSpot with compressed pointers (default for heaps under 32 GB), every object has a **12-byte header** (mark word + class pointer) and is padded to a multiple of **8 bytes**. A reference field takes 4 bytes. So an `Integer` (header + one `int`) is **16 bytes** versus 4 for an `int`, and a `List<Integer>` adds a 4-byte reference per element on top of each box. Java 25 adds **compact object headers** (8-byte headers) as a product option (`-XX:+UseCompactObjectHeaders`).",
      table: [
        ["What", "Approx. size (compressed oops)"],
        ["`int` / `long` local or field", "4 / 8 bytes"],
        ["`new Object()`", "16 bytes (12 header + 4 padding)"],
        ["`Integer`, `Long`", "16 bytes, 24 bytes"],
        ["`int[1000]`", "16 header + 4,000 ≈ 4 KB"],
        ["`ArrayList<Integer>` of 1000 distinct values", "≈ 16 KB of `Integer`s + ≈ 4 KB array + list object ≈ 20 KB (5×)"],
        ["`String` \"hello\" (Latin-1)", "24-byte `String` + 24-byte `byte[]` ≈ 48 bytes"],
        ["`HashMap` entry", "≈ 32 bytes per `Node` + key + value objects"]],
      code: `Runtime rt = Runtime.getRuntime();
int n = 1_000_000;
System.gc();
long before = rt.totalMemory() - rt.freeMemory();
int[] prim = new int[n];
for (int i = 0; i < n; i++) prim[i] = i + 1000;
long afterPrim = rt.totalMemory() - rt.freeMemory();
List<Integer> boxed = new ArrayList<>(n);
for (int i = 0; i < n; i++) boxed.add(i + 1000);
long afterBoxed = rt.totalMemory() - rt.freeMemory();
System.out.println("int[] ≈ " + (afterPrim - before) / (1024 * 1024) + " MB, List<Integer> ≈ " + (afterBoxed - afterPrim) / (1024 * 1024) + " MB (rough: GC can run in between)");
System.out.println(prim.length + boxed.size());`,
      points: ["Exact sizes vary by JVM and flags; measure with JOL (Java Object Layout) or a heap dump", "For large numeric data use primitive arrays, `IntStream`, or primitive-collection libraries (Eclipse Collections, fastutil)", "Value classes (Project Valhalla) aim to remove this overhead in future Java versions"] },
    { title: "Reachability, garbage and memory leaks",
      text: "The GC frees objects that are **unreachable** from GC roots (thread stacks' locals, static fields, JNI references). A Java \"memory leak\" is therefore an object that is **still reachable but no longer needed**: a static cache that only grows, listeners never removed, `ThreadLocal`s in pools, unclosed resources. Setting a local to `null` rarely matters; removing references from long-lived structures does. GC algorithms are J30.",
      m: M(["flowchart LR",
        "  R1([\"GC roots: stack locals, statics\"]):::s0 --> A[\"Order\"]:::s1",
        "  A --> B[\"Customer\"]:::s1",
        "  R1 --> C[\"static CACHE map\"]:::s2",
        "  C --> D[\"old Session (leak: reachable, never used)\"]:::bad",
        "  E[\"temp Fare (unreachable)\"]:::bad",
        "  E -. \"collected\" .-> X([\"freed\"])"]),
      code: `class SessionRegistry {
    private static final Map<String, byte[]> SESSIONS = new HashMap<>();   // lives as long as the class
    static void login(String id) { SESSIONS.put(id, new byte[1024]); }
    static void logout(String id) { SESSIONS.remove(id); }                // forget this → leak
    static int size() { return SESSIONS.size(); }
}

for (int i = 0; i < 10_000; i++) SessionRegistry.login("user-" + i);
for (int i = 0; i < 9_000; i++) SessionRegistry.logout("user-" + i);
System.out.println("still referenced: " + SessionRegistry.size() + " sessions");

try (var in = new ByteArrayInputStream("PNR123".getBytes(StandardCharsets.UTF_8))) {   // close resources: try-with-resources
    System.out.println("read " + in.readAllBytes().length + " bytes");
}`,
      points: ["Use bounded caches with eviction (Caffeine, S11) instead of plain static maps", "`WeakHashMap`/`WeakReference` let the GC drop entries whose keys are otherwise unreachable", "Find leaks with a heap dump: look at the dominator tree and the GC-root path (J31)"] }
  ];

  H.registerLesson({
    code: "J02",
    summary: "What a Java value really is and where it lives: the 8 primitives and reference types, numeric gotchas (overflow, integer division, casts, floating point, `BigDecimal` for money), stack frames vs the shared heap, why Java is always pass-by-value, wrappers with autoboxing and the -128…127 `Integer` cache, defaults/`var`/`final`, immutable `String`s and the String pool (`==` vs `equals`, `intern`), `StringBuilder` vs `+` vs `StringBuffer`, the everyday String API, object sizes and boxing cost, and reachability-based memory leaks.",
    slides: SLIDES,
    widget: { heading: "Interactive: watch the stack and heap line by line", caption: "Run a 10-line snippet one line at a time. The diagram shows main's stack frame on the left and heap objects (String pool, Integer cache, ordinary objects) on the right; the table shows what `==` and `equals` return at that point.", render: memWidget },
    examplesHeading: "Where this bites at work",
    examples: [
      ["`==` on IDs from JPA entities", "`Long` IDs compared with `==` pass in tests with small IDs (cached) and fail in production once IDs exceed 127. Use `equals` or `Objects.equals`."],
      ["Money in `double`", "Fare totals like `0.1 + 0.2` drift; payment systems store paise/cents as `long` or use `BigDecimal` with an explicit `RoundingMode`."],
      ["Logging and JSON building", "`+=` string building in loops over thousands of rows shows up in CPU profiles; use `StringBuilder`, `String.join` or a JSON library."],
      ["Unboxing NPEs", "`int count = map.get(key);` or a nullable `Integer` column from the DB unboxed into `int` throws NPE: use `getOrDefault` or keep the wrapper and check."],
      ["Memory-heavy caches", "Millions of `Map<Long, Integer>` entries cost 5–10× the raw data; primitive collections or off-heap caches cut heap and GC time."],
      ["Leaks in long-running services", "Static maps, listener lists and `ThreadLocal`s in thread pools that are never cleared grow until `OutOfMemoryError`; heap dumps show the path from a GC root."]
    ],
    pitfalls: [
      "Comparing `String`s or wrappers with `==` instead of `equals`",
      "Unboxing a `null` wrapper (`int x = map.get(k)`) → `NullPointerException`",
      "Silent `int` overflow (`365 * 24 * 60 * 60 * 1000`); use `long` literals or `Math.*Exact`",
      "Using `double`/`float` for money; `new BigDecimal(0.1)` instead of `new BigDecimal(\"0.1\")`",
      "Ignoring the return value of `concat`/`replace`/`toUpperCase` (strings are immutable)",
      "`s += x` in a loop: O(n²) copying",
      "`split(\".\")` or `split(\"|\")`: the argument is a regex",
      "Believing `final` makes an object immutable, or that Java passes objects by reference",
      "Boxed types in hot loops (`Long total`) creating millions of objects"
    ],
    quiz: [
      { q: "How many primitive types does Java have?", options: ["4", "6", "8", "9 (including String)"], answer: 2, why: "byte, short, int, long, float, double, char, boolean. `String` is a class." },
      { q: "Where do local primitive variables and the objects you create with `new` live?", options: ["Both on the heap", "Locals in the thread's stack frame; objects on the heap", "Both on the stack", "Objects in metaspace"], answer: 1, why: "References on the stack point to heap objects." },
      { q: "What does this print?", code: `Integer a = 127, b = 127, c = 1000, d = 1000;
System.out.println((a == b) + " " + (c == d));`, options: ["true true", "true false", "false false", "false true"], answer: 1, why: "`Integer.valueOf` caches -128…127." },
      { q: "What does this print?", code: `String a = "hi";
String b = new String("hi");
System.out.println((a == b) + " " + a.equals(b) + " " + (a == b.intern()));`, options: ["true true true", "false true true", "false true false", "false false true"], answer: 1, why: "`new` creates a distinct object; `intern()` returns the pooled one." },
      { q: "After `static void f(StringBuilder s) { s.append(\"!\"); s = new StringBuilder(\"x\"); }` and `f(sb)` with `sb = \"hi\"`, what is `sb`?", options: ["\"hi\"", "\"hi!\"", "\"x\"", "\"x!\""], answer: 1, why: "The mutation is visible; reassigning the parameter isn't (pass-by-value of the reference)." },
      { q: "What does `System.out.println(0.1 + 0.2 == 0.3);` print?", options: ["true", "false", "Compile error", "Depends on the CPU"], answer: 1, why: "0.30000000000000004: binary floating point. Use BigDecimal or a tolerance." },
      { q: "Why is `String` immutable? Pick the best answer.", options: ["Performance of `+`", "Safe sharing: the String pool, cached hash codes for HashMap keys, security checks and thread safety", "Because it's final", "Garbage collection"], answer: 1, why: "`final` on the class prevents subclassing; immutability is about having no mutators." },
      { q: "Best choice to build a CSV line from 10,000 values in one method?", options: ["`+=` in a loop", "`StringBuffer`", "`StringBuilder` or `String.join`/`Collectors.joining`", "`String.concat` in a loop"], answer: 2, why: "StringBuffer's locking is pointless for a local." },
      { q: "What does this print?", code: `long a = 365 * 24 * 60 * 60 * 1000;
long b = 365L * 24 * 60 * 60 * 1000;
System.out.println(a == b);`, options: ["true", "false", "Compile error", "Throws ArithmeticException"], answer: 1, why: "The first is computed in `int` and overflows before widening." }
    ],
    cheatsheet: {
      table: [
        ["Topic", "Remember"],
        ["Primitives", "byte 1, short 2, char 2, int 4, float 4, long 8, double 8 bytes; boolean JVM-specific"],
        ["Stack vs heap", "Frames with locals per thread vs shared objects + GC"],
        ["Passing", "Always by value; object references are copied"],
        ["Autoboxing", "`valueOf` / `xxxValue()`; cache -128…127; unboxing null → NPE"],
        ["Comparison", "Primitives `==`; objects `equals`; `Objects.equals` for nulls"],
        ["String", "Immutable, compact (byte[] + coder), hash cached, literals pooled"],
        ["Concatenation", "`+` fine in one expression; `StringBuilder` in loops; `StringBuffer` legacy"],
        ["Money", "`BigDecimal(\"…\")` or `long` minor units; `compareTo` not `equals`"],
        ["Leak", "Reachable but unused: static maps, listeners, ThreadLocals"]],
      cards: [
        { title: "Numeric traps", items: ["`Integer.MAX_VALUE + 1` wraps", "`7 / 2 == 3`, `-7 / 2 == -3`", "`(byte) 200 == -56`", "`0.1 + 0.2 != 0.3`", "`Math.round(-2.5) == -2`"] },
        { title: "String API", items: ["`strip`, `isBlank`, `lines`, `repeat`", "`formatted`, text blocks", "`split` takes a regex", "`String.join`, `Collectors.joining`", "`chars()` vs `codePoints()`"] },
        { title: "Say in interviews", items: ["References are passed by value", "Integer cache is why `==` \"sometimes works\"", "Immutability → pool, hash cache, thread safety", "Boxing costs ~4–5× memory", "Leaks = unwanted reachability"] }]
    },
    practice: [
      { level: "Easy", q: "Explain the difference between stack and heap memory in Java. Where do a local `int`, a local `String` variable and the `String` object itself live?",
        a: ["Each thread has a **stack** of frames: one per active method call, holding parameters and local variables. It's popped automatically on return. Overflow → `StackOverflowError`.",
          "The **heap** is shared by all threads and holds every object and array; the GC reclaims unreachable objects. Too much live data → `OutOfMemoryError`.",
          "Local `int`: the value is in the frame. Local `String s`: the **reference** is in the frame; the `String` object (and its `byte[]`) are on the heap; a literal's object is in the String pool, which is also on the heap.",
          "Consequence: locals are thread-confined; heap objects shared between threads need synchronisation."] },
      { level: "Easy", q: "What's the difference between `==` and `equals()`? Give the output and fix.",
        qcode: `String s1 = "Java";
String s2 = new String("Java");
Integer i1 = 200, i2 = 200;
System.out.println(s1 == s2);
System.out.println(i1 == i2);`,
        a: ["`==` on references checks **identity** (same object); `equals` checks **logical equality** as defined by the class (`String`, wrappers, records and collections override it).",
          "Both print `false`: `new String` makes a distinct object; 200 is outside the `Integer` cache so autoboxing creates two objects.",
          "Fix: `s1.equals(s2)`, `i1.equals(i2)` (or `Objects.equals(a, b)` when either may be null). For primitives `==` compares values and is correct.",
          "For your own classes, override `equals` and `hashCode` together (J04)."] },
      { level: "Easy", q: "Is Java pass-by-value or pass-by-reference? Prove it with code.",
        code: `static void reassign(StringBuilder sb) { sb = new StringBuilder("changed"); }
static void mutate(StringBuilder sb) { sb.append(" + mutated"); }
static void swap(Integer a, Integer b) { Integer t = a; a = b; b = t; }

StringBuilder sb = new StringBuilder("original");
reassign(sb);
System.out.println(sb);            // original
mutate(sb);
System.out.println(sb);            // original + mutated
Integer x = 1, y = 2;
swap(x, y);
System.out.println(x + " " + y);   // 1 2: swap can't work`,
        a: ["Always **pass-by-value**. For references, the value copied is the reference.",
          "`reassign` changes only its local copy, so the caller still sees `original`.",
          "`mutate` follows the copied reference to the same object, so the change is visible.",
          "A true pass-by-reference language would make `swap` work; in Java it can't."] },
      { level: "Medium", q: "Explain autoboxing and the Integer cache. Why does this code behave differently in tests and in production?",
        qcode: `static boolean sameOwner(Long ownerId, Long currentUserId) {
    return ownerId == currentUserId;
}
System.out.println(sameOwner(42L, 42L));       // tests: small IDs
System.out.println(sameOwner(90_210L, 90_210L)); // production`,
        a: ["Autoboxing turns `42L` into `Long.valueOf(42L)`; `Long.valueOf` returns cached instances for -128…127, so in tests both arguments are the **same object** and `==` returns `true`.",
          "In production IDs exceed 127, each `valueOf` creates a new `Long`, and `==` compares two different objects: `false`. Authorisation silently breaks.",
          "Fix: `return Objects.equals(ownerId, currentUserId);` (null-safe), or compare `long` primitives if nulls are impossible.",
          "Prevention: static-analysis rules (SpotBugs `RC_REF_COMPARISON`, IntelliJ inspection) and tests with values > 127."] },
      { level: "Medium", q: "Why is `String` immutable in Java? List at least four reasons and one downside.",
        a: ["**String pool**: literals can be shared safely only if no one can modify them.",
          "**Hash caching**: `hashCode` is computed once and stored, ideal for `HashMap`/`HashSet` keys; a mutable key would get lost in its bucket.",
          "**Security**: class names, file paths, URLs and DB credentials passed as strings can't be changed after validation (time-of-check/time-of-use).",
          "**Thread safety**: can be shared across threads without synchronisation.",
          "**Class loading**: loaders rely on names not changing.",
          "Downside: every modification allocates a new object, so repeated concatenation is costly: use `StringBuilder`. Also, secrets in strings stay in memory until GC; use `char[]` for passwords where APIs allow."] },
      { level: "Medium", q: "How many `String` objects are created by each line (assume none of the literals exist yet)?",
        qcode: `String a = "fly";                       // line 1
String b = "fly";                       // line 2
String c = new String("fly");           // line 3
String d = "fl" + "y";                  // line 4
String e = a + "!";                     // line 5`,
        a: ["Line 1: **1**: the literal `\"fly\"` is created in the pool when the class's constant is resolved.",
          "Line 2: **0**: same literal, same pooled object.",
          "Line 3: **1**: a new heap `String` (the literal already exists). Without line 1 it would be 2.",
          "Line 4: **0**: `\"fl\" + \"y\"` is a compile-time constant folded to `\"fly\"`; `d == a` is true.",
          "Line 5: **1** new `String` built at run time (`\"!\"` is another pooled literal), not pooled; `e == \"fly!\"` is false."] },
      { level: "Medium", q: "Write a method that reverses the words of a sentence (`\"  book   my flight \"` → `\"flight my book\"`) efficiently. Explain your choice of classes.",
        code: `static String reverseWords(String s) {
    String[] words = s.strip().split("\\\\s+");          // regex: one or more whitespace
    StringBuilder sb = new StringBuilder(s.length());
    for (int i = words.length - 1; i >= 0; i--) {
        if (words[i].isEmpty()) continue;
        if (sb.length() > 0) sb.append(' ');
        sb.append(words[i]);
    }
    return sb.toString();
}

System.out.println("[" + reverseWords("  book   my flight ") + "]");
System.out.println("[" + reverseWords("DEL") + "]");
System.out.println("[" + reverseWords("   ") + "]");
// one-liner alternative
List<String> w = new ArrayList<>(List.of("book my flight".split(" ")));
Collections.reverse(w);
System.out.println(String.join(" ", w));`,
        a: ["`strip()` + `split(\"\\\\s+\")` handles leading/trailing and repeated spaces (empty input gives one empty token, hence the check).",
          "`StringBuilder` pre-sized to the input length: a single growing buffer, O(n) total instead of O(n²) with `+=`.",
          "Strings are immutable so the input is untouched; `split` returns a new array.",
          "Alternative: `Collections.reverse` + `String.join` is shorter and fine for interviews; mention the complexity either way."] },
      { level: "Medium", q: "A fare service stores prices as `double`. Show the bug, then fix it with `BigDecimal` (GST 18%, rounded to paise).",
        code: `double base = 0.1 * 3;                         // three ₹0.10 add-ons
System.out.println("double: " + base + " == 0.3? " + (base == 0.3));

BigDecimal fare = new BigDecimal("4850.75");
BigDecimal gstRate = new BigDecimal("0.18");
BigDecimal gst = fare.multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
BigDecimal total = fare.add(gst);
System.out.println("gst ₹" + gst + ", total ₹" + total);
System.out.println("equals vs compareTo: " + new BigDecimal("2.0").equals(new BigDecimal("2.00")) + " " + (new BigDecimal("2.0").compareTo(new BigDecimal("2.00")) == 0));
System.out.println("new BigDecimal(0.1) = " + new BigDecimal(0.1));
long paise = 485075L;                         // alternative: integer minor units
System.out.println("₹" + paise / 100 + "." + String.format("%02d", paise % 100));`,
        a: ["`double` is binary floating point: most decimal fractions (0.1) have no exact representation, so sums drift and `==` fails.",
          "`BigDecimal` from a **String** is exact; set scale and an explicit `RoundingMode` on every division/multiplication you store.",
          "`equals` compares value **and scale** (`2.0` ≠ `2.00`); use `compareTo` for numeric equality. Watch this with `BigDecimal` keys in `HashSet`s.",
          "`new BigDecimal(0.1)` captures the binary error (0.1000000000000000055…); use `BigDecimal.valueOf(0.1)` or the String constructor.",
          "Alternative used by payment systems: store `long` minor units (paise/cents) and format on display."] },
      { level: "Hard", q: "Estimate the heap used by a `HashMap<Integer, Integer>` with 1 million entries vs an `int[]` lookup table, and suggest alternatives.",
        a: ["Per entry (compressed oops): `HashMap.Node` ≈ 32 bytes (header 12 + hash 4 + key/value/next references 12, padded), key `Integer` 16 bytes, value `Integer` 16 bytes (small values may come from the cache), plus a 4-byte slot in the table array (sized to a power of two ≥ n / 0.75, so ~2M slots ≈ 8 MB).",
          "Total ≈ 1M × (32 + 16 + 16) + 8 MB ≈ **72 MB**.",
          "An `int[]` indexed by key (if keys are dense, e.g. 0..1M) needs ≈ **4 MB**; two parallel sorted `int[]` arrays with binary search need 8 MB.",
          "Alternatives: primitive maps (fastutil `Int2IntOpenHashMap`, Eclipse Collections `IntIntHashMap`) ≈ 8–16 MB with no boxing; or a database/off-heap store if data is huge.",
          "Mention that GC cost scales with the number of live objects too: 3M tiny objects vs 1 array.",
          "Verify with JOL (`GraphLayout.parseInstance(map).totalSize()`) or a heap dump rather than trusting estimates."] },
      { level: "Hard", q: "A Spring service's heap grows steadily over days until `OutOfMemoryError`. Walk through how you'd find and fix the leak.",
        steps: ["Confirm it's a leak, not just a big working set: old-generation usage after full GCs keeps rising (GC logs, Actuator `jvm.memory.used` by pool, `jstat -gcutil`).",
          "Capture evidence: `-XX:+HeapDumpOnOutOfMemoryError`, or `jcmd <pid> GC.heap_dump /tmp/h.hprof` when the heap is high (two dumps hours apart are even better).",
          "Open the dump in Eclipse MAT: the **dominator tree** and **leak suspects** show which objects retain the most memory; \"path to GC roots\" shows **who keeps them reachable**.",
          "Typical culprits: a static `Map` cache without eviction; listeners/callbacks registered and never removed; `ThreadLocal` values in pooled threads never `remove()`d; unbounded queues (executor with `LinkedBlockingQueue`); Hibernate session holding thousands of entities in a long transaction; string interning of user input.",
          "Fix the reachability: bounded caches with TTL (Caffeine), `try/finally { threadLocal.remove(); }`, unregister listeners, bounded queues with back-pressure, paginate batch jobs.",
          "Prevent regressions: alert on old-gen after GC, load-test for hours, and keep heap dumps enabled in prod (J31, S10)."] }
    ],
    recap: [
      "8 primitives hold values; reference variables hold handles to heap objects. Watch overflow, integer division, casts and floating point; money is `BigDecimal` or `long` minor units.",
      "Stack frames (per thread, automatic) hold locals; the heap (shared, GC-managed) holds objects. Java always passes values, including copies of references.",
      "Autoboxing uses `valueOf` with a -128…127 cache: compare wrappers with `equals`, beware unboxing `null`, avoid boxing in hot paths.",
      "Strings are immutable, compact and pooled for literals: `equals` not `==`; use `StringBuilder` for loops, `String.join`/`joining` for lists.",
      "Objects carry headers and padding (an `Integer` is 16 bytes); leaks are objects still reachable from GC roots that you no longer need."
    ]
  });
})();
