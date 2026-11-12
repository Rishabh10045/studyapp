/* Lesson J09: Iteration, fail-fast vs fail-safe & ConcurrentHashMap */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Outcomes produced by running this exact loop on Java 21 (see caption)
  var RES = {"al_none": {"seen": "DEL,BOM,BLR,MAA", "res": "completed", "fin": "[DEL, BOM, BLR, MAA]"}, "al_rmBOM": {"seen": "DEL,BOM", "res": "ConcurrentModificationException", "fin": "[DEL, BLR, MAA]"}, "al_itrm": {"seen": "DEL,BOM,BLR,MAA", "res": "completed", "fin": "[DEL, BLR, MAA]"}, "al_addGOI": {"seen": "DEL,BOM", "res": "ConcurrentModificationException", "fin": "[DEL, BOM, BLR, MAA, GOI]"}, "al_rmBLR": {"seen": "DEL,BOM,BLR", "res": "completed", "fin": "[DEL, BOM, MAA]"}, "hs_none": {"seen": "BOM,BLR,DEL,MAA", "res": "completed", "fin": "[BOM, BLR, DEL, MAA]"}, "hs_rmBOM": {"seen": "BOM", "res": "ConcurrentModificationException", "fin": "[BLR, DEL, MAA]"}, "hs_itrm": {"seen": "BOM,BLR,DEL,MAA", "res": "completed", "fin": "[BLR, DEL, MAA]"}, "hs_addGOI": {"seen": "BOM", "res": "ConcurrentModificationException", "fin": "[GOI, BOM, BLR, DEL, MAA]"}, "hs_rmBLR": {"seen": "BOM,BLR", "res": "ConcurrentModificationException", "fin": "[BOM, DEL, MAA]"}, "cow_none": {"seen": "DEL,BOM,BLR,MAA", "res": "completed", "fin": "[DEL, BOM, BLR, MAA]"}, "cow_rmBOM": {"seen": "DEL,BOM,BLR,MAA", "res": "completed", "fin": "[DEL, BLR, MAA]"}, "cow_itrm": {"seen": "DEL,BOM", "res": "UnsupportedOperationException", "fin": "[DEL, BOM, BLR, MAA]"}, "cow_addGOI": {"seen": "DEL,BOM,BLR,MAA", "res": "completed", "fin": "[DEL, BOM, BLR, MAA, GOI]"}, "cow_rmBLR": {"seen": "DEL,BOM,BLR,MAA", "res": "completed", "fin": "[DEL, BOM, MAA]"}, "chm_none": {"seen": "BOM,BLR,DEL,MAA", "res": "completed", "fin": "[BOM, BLR, DEL, MAA]"}, "chm_rmBOM": {"seen": "BOM,BLR,DEL,MAA", "res": "completed", "fin": "[BLR, DEL, MAA]"}, "chm_itrm": {"seen": "BOM,BLR,DEL,MAA", "res": "completed", "fin": "[BLR, DEL, MAA]"}, "chm_addGOI": {"seen": "BOM,BLR,DEL,MAA", "res": "completed", "fin": "[GOI, BOM, BLR, DEL, MAA]"}, "chm_rmBLR": {"seen": "BOM,BLR,DEL,MAA", "res": "completed", "fin": "[BOM, DEL, MAA]"}};
  var KINDS = [["al", "ArrayList"], ["hs", "HashSet"], ["cow", "CopyOnWriteArrayList"], ["chm", "ConcurrentHashMap.newKeySet()"]];
  var ACTS = [["none", "just iterate"], ["rmBOM", "c.remove(\"BOM\") at BOM"], ["itrm", "it.remove() at BOM"], ["addGOI", "c.add(\"GOI\") at BOM"], ["rmBLR", "c.remove(\"BLR\") at BLR"]];
  var LINE = { none: "", rmBOM: "    if (x.equals(\"BOM\")) c.remove(\"BOM\");", itrm: "    if (x.equals(\"BOM\")) it.remove();", addGOI: "    if (x.equals(\"BOM\")) c.add(\"GOI\");", rmBLR: "    if (x.equals(\"BLR\")) c.remove(\"BLR\");" };
  function ctor(k) { return k === "al" ? "new ArrayList<>(base)" : k === "hs" ? "new HashSet<>(base)" : k === "cow" ? "new CopyOnWriteArrayList<>(base)" : "ConcurrentHashMap.newKeySet()  // then addAll(base)"; }
  // ArrayList Itr model: cursor, size, modCount vs expectedModCount
  function alTrace(act) {
    var a = ["DEL", "BOM", "BLR", "MAA"], cursor = 0, mod = 0, exp = 0, L = [];
    while (true) {
      var hn = cursor !== a.length;
      L.push("hasNext(): cursor " + cursor + " != size " + a.length + " → " + hn);
      if (!hn) { L.push("loop ends"); break; }
      if (mod !== exp) { L.push("next(): modCount " + mod + " != expectedModCount " + exp + " → ConcurrentModificationException"); break; }
      var x = a[cursor]; cursor++; L.push("next() → " + x + "   (cursor now " + cursor + ")");
      if (act === "rmBOM" && x === "BOM") { a.splice(1, 1); mod++; L.push("  c.remove(\"BOM\"): size " + a.length + ", modCount " + mod); }
      if (act === "rmBLR" && x === "BLR") { a.splice(2, 1); mod++; L.push("  c.remove(\"BLR\"): size " + a.length + ", modCount " + mod); }
      if (act === "addGOI" && x === "BOM") { a.push("GOI"); mod++; L.push("  c.add(\"GOI\"): size " + a.length + ", modCount " + mod); }
      if (act === "itrm" && x === "BOM") { a.splice(cursor - 1, 1); cursor--; mod++; exp = mod; L.push("  it.remove(): cursor back to " + cursor + ", modCount " + mod + ", expectedModCount " + exp + " (in sync)"); }
    }
    return L;
  }
  function explain(k, act, r) {
    if (k === "al") {
      if (act === "rmBLR") return "**The sneaky case.** Removing the second-to-last element shrinks size to 3 while the cursor is already 3, so `hasNext()` returns false and the loop ends **silently**: `MAA` is never visited and no exception is thrown. Fail-fast is best-effort, not a guarantee.";
      if (act === "itrm") return "`Iterator.remove()` is the supported way: it removes the last returned element, moves the cursor back and re-syncs `expectedModCount`.";
      if (act === "none") return "Each `next()` checks `modCount == expectedModCount`. Nothing changed the list, so the loop completes.";
      return "Changing the list directly bumps `modCount`. The iterator's next `next()` sees `modCount != expectedModCount` and throws **ConcurrentModificationException**: **fail-fast**.";
    }
    if (k === "hs") {
      if (act === "rmBLR") return "Unlike ArrayList, HashMap's iterator decides `hasNext()` by its precomputed next node, not by size, so the next `next()` still checks `modCount` and throws. Same mistake, different symptom: never rely on CME to detect bugs.";
      if (act === "itrm") return "`it.remove()` removes the current key through the iterator and updates `expectedModCount`: safe.";
      if (act === "none") return "HashSet is a HashMap's key set; iteration order follows buckets, not insertion.";
      return "HashSet (HashMap) iterators are fail-fast too: any structural change not made through the iterator makes the next `next()` throw.";
    }
    if (k === "cow") {
      if (act === "itrm") return "The iterator walks an immutable **snapshot** array, so `it.remove()` throws **UnsupportedOperationException**. Use `c.remove(...)` or `removeIf` instead.";
      if (act === "none") return "The iterator holds a reference to the array as it was when iteration started.";
      return "**Fail-safe (snapshot)**: every write copies the array, the iterator keeps reading the old one. It visits all 4 original elements and never throws, but doesn't see the change. Final contents do reflect the write.";
    }
    if (act === "none") return "ConcurrentHashMap order follows its bins, like HashMap.";
    if (act === "addGOI") return "**Weakly consistent**: never throws, visits each element at most once, and *may or may not* see updates made after the iterator was created. Here `GOI` landed in a bin the iterator had already passed, so it wasn't seen.";
    return "**Weakly consistent**: modifications during iteration are allowed (from this or other threads) and never throw. `BOM`/`BLR` were already visited, so the removal shows only in the final contents.";
  }
  function iterWidget(el, ctx) {
    var s = ctx.state; if (!s.k) { s.k = "al"; s.a = "rmBOM"; }
    el.innerHTML = "<p>" + ctx.md("Pick a collection holding `DEL, BOM, BLR, MAA` and something to do **inside** the loop. The outcome, visit order and final contents are what Java 21 actually produced for this loop.") + "</p>" +
      "<div class='seg' data-r='kind'>" + KINDS.map(function (x) { return "<button type='button' data-v='" + x[0] + "'>" + ctx.esc(x[1]) + "</button>"; }).join("") + "</div>" +
      "<div class='seg' data-r='act' style='margin-top:8px'>" + ACTS.map(function (x) { return "<button type='button' data-v='" + x[0] + "'>" + ctx.esc(x[1]) + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='src' style='margin-top:12px'></pre><div class='diagram' data-r='dg'></div><div class='tablewrap' data-r='tbl'></div><div class='result' data-r='res'></div><pre class='code' data-r='trace'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      [["kind", s.k], ["act", s.a]].forEach(function (p) { q(p[0]).querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === p[1]); b.setAttribute("aria-pressed", b.dataset.v === p[1]); }); });
      var r = RES[s.k + "_" + s.a];
      var src = ["Collection<String> c = " + ctor(s.k) + ";", "Iterator<String> it = c.iterator();", "while (it.hasNext()) {", "    String x = it.next();"];
      if (LINE[s.a]) src.push(LINE[s.a]);
      src.push("}");
      q("src").innerHTML = ctx.H.highlight(src.join("\n"));
      var seen = r.seen.split(","), fin = r.fin.replace(/[\[\]\s]/g, "").split(",");
      var L = ["flowchart LR", "  st([\"iterator()\"]):::s0"], prev = "st";
      seen.forEach(function (x, i) { var hit = (s.a !== "none" && ((s.a === "rmBLR" && x === "BLR") || (s.a !== "rmBLR" && x === "BOM"))); L.push("  v" + i + "[\"" + x + (hit ? "<br/><small>" + ctx.esc(LINE[s.a].replace(/^.*\) /, "").replace(/"/g, "#quot;")) + "</small>" : "") + "\"]:::" + (hit ? "s4" : "s1")); L.push("  " + prev + " --> v" + i); prev = "v" + i; });
      var ok = r.res === "completed";
      L.push("  end1[\"" + (ok ? "loop ends" : r.res) + "\"]:::" + (ok ? "s2" : "bad"), "  " + prev + " --> end1");
      var unseen = fin.filter(function (x) { return seen.indexOf(x) < 0; });
      unseen.forEach(function (x, i) { L.push("  u" + i + "[\"" + x + "<br/><small>not visited</small>\"]:::s0"); L.push("  end1 -.- u" + i); });
      L.push("  classDef s0 fill:#f3f4f6,stroke:#9ca3af,stroke-dasharray:4 3", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00,stroke-width:2px", "  classDef bad fill:#fdecea,stroke:#c62828,stroke-width:2px");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("tbl").innerHTML = "<table><thead><tr><th>Visited (in order)</th><th>Outcome</th><th>Final contents</th></tr></thead><tbody><tr><td><code>" + ctx.esc(r.seen) + "</code></td><td>" + (ok ? "completed" : "<strong>" + ctx.esc(r.res) + "</strong>") + "</td><td><code>" + ctx.esc(r.fin) + "</code></td></tr></tbody></table>";
      q("res").innerHTML = ctx.md(explain(s.k, s.a, r));
      var t = q("trace");
      if (s.k === "al") { t.hidden = false; t.textContent = "ArrayList.Itr model:\n" + alTrace(s.a).join("\n"); } else t.hidden = true;
    }
    q("kind").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.k = b.dataset.v; ctx.save(); draw(); });
    q("act").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.a = b.dataset.v; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Five ways to walk a collection",
      text: "The enhanced `for` loop is syntax sugar for an `Iterator`: `for (T x : c)` compiles to `Iterator<T> it = c.iterator(); while (it.hasNext()) { T x = it.next(); … }` (arrays use an index loop instead). `Iterable.forEach(Consumer)` takes a lambda; `ListIterator` walks both ways and can `set`/`add`; an index loop suits `ArrayList` but is O(n²) on `LinkedList`; `Map`s are walked through `entrySet()`, `keySet()` or `values()`, or `map.forEach((k, v) -> …)`.",
      code: `List<String> airports = new ArrayList<>(List.of("DEL", "BOM", "BLR"));
for (String a : airports) System.out.print(a + " ");                 // Iterator under the hood
System.out.println();

Iterator<String> it = airports.iterator();
while (it.hasNext()) System.out.print(it.next().toLowerCase() + " ");
System.out.println();

airports.forEach(a -> System.out.print(a.charAt(0) + " "));           // Iterable.forEach

ListIterator<String> li = airports.listIterator(airports.size());
System.out.print("| backwards: ");
while (li.hasPrevious()) System.out.print(li.previous() + " ");

Map<String, Integer> fares = new TreeMap<>(Map.of("DEL", 4850, "BOM", 5300));
for (Map.Entry<String, Integer> e : fares.entrySet()) System.out.print("| " + e.getKey() + "=" + e.getValue() + " ");
fares.forEach((k, v) -> System.out.print("| " + k + "→" + v));`,
      analogy: "An iterator is a bookmark: it remembers where you are in the book. Iteration is just moving the bookmark one page at a time." },
    { title: "Modifying while iterating: ConcurrentModificationException",
      text: "Collections like `ArrayList` and `HashMap` keep a `modCount` that increases on every **structural** change (add/remove, not `set`). An iterator copies it into `expectedModCount` when created; each `next()` compares the two and throws `ConcurrentModificationException` if they differ. Despite the name this happens **in a single thread**. The fixes: remove through the iterator, use `removeIf`, collect then remove, or build a new collection.",
      m: M(["sequenceDiagram",
        "  participant L as ArrayList (modCount)",
        "  participant I as Iterator (expectedModCount)",
        "  I->>L: next() → DEL (0 == 0 ✓)",
        "  I->>L: next() → BOM (0 == 0 ✓)",
        "  Note over L: list.remove(#quot;BOM#quot;) → modCount 1",
        "  I->>L: next(): 1 != 0",
        "  L-->>I: ConcurrentModificationException"]),
      code: `List<String> codes = new ArrayList<>(List.of("DEL", "BOM", "BLR", "MAA"));
try {
    for (String c : codes) if (c.startsWith("B")) codes.remove(c);    // modifies behind the iterator's back
} catch (ConcurrentModificationException e) { System.out.println("CME: " + codes); }

List<String> a = new ArrayList<>(List.of("DEL", "BOM", "BLR", "MAA"));
for (Iterator<String> it = a.iterator(); it.hasNext(); ) if (it.next().startsWith("B")) it.remove();   // fix 1

List<String> b = new ArrayList<>(List.of("DEL", "BOM", "BLR", "MAA"));
b.removeIf(c -> c.startsWith("B"));                                     // fix 2: one pass, O(n)

List<String> c = List.of("DEL", "BOM", "BLR", "MAA").stream().filter(x -> !x.startsWith("B")).toList();   // fix 3: new list

Map<String, Integer> seats = new HashMap<>(Map.of("6E-201", 0, "AI-505", 12, "UK-811", 0));
seats.values().removeIf(v -> v == 0);                                   // maps: through a view
seats.replaceAll((k, v) -> v - 1);                                      // in-place value updates are not structural
System.out.println(a + " " + b + " " + c + " " + seats);`,
      points: ["`list.set(i, x)` and `entry.setValue(v)` are not structural, so they're allowed during iteration", "Removing by index in a forward loop skips elements; loop backwards or use `removeIf`"] },
    { title: "Fail-fast is best-effort, not a guarantee",
      text: "The JDK docs say fail-fast behaviour \"cannot be guaranteed\" and must only be used to detect bugs. The classic surprise: removing the **second-to-last** element of an `ArrayList` inside a for-each throws nothing, because `hasNext()` is `cursor != size` and both are now equal; the last element is silently skipped. And across threads there is no happens-before on `modCount`, so a racing writer may corrupt data without any exception.",
      code: `List<String> list = new ArrayList<>(List.of("DEL", "BOM", "BLR", "MAA"));
List<String> visited = new ArrayList<>();
for (String s : list) {
    visited.add(s);
    if (s.equals("BLR")) list.remove(s);         // second-to-last: cursor 3 == new size 3
}
System.out.println("visited " + visited + ", no exception, list " + list);

Set<String> set = new HashSet<>(List.of("DEL", "BOM", "BLR", "MAA"));
try {
    for (String s : set) if (s.equals("BLR")) set.remove(s);
    System.out.println("HashSet: no exception");
} catch (ConcurrentModificationException e) { System.out.println("HashSet: CME (its hasNext() doesn't use size)"); }`,
      analogy: "A smoke detector that sometimes doesn't beep: great when it does, but you still don't play with matches indoors." },
    { title: "Three iterator guarantees",
      text: "Every JDK collection documents one of three iterator behaviours. **Fail-fast** (most of `java.util`): throw CME on a detected concurrent change. **Snapshot / fail-safe** (`CopyOnWriteArrayList`, `CopyOnWriteArraySet`): iterate over an immutable copy, never throw, never see later changes. **Weakly consistent** (`ConcurrentHashMap`, `ConcurrentSkipListMap`, `ConcurrentLinkedQueue`, most `java.util.concurrent`): never throw, visit each element at most once, and *may* reflect changes made after the iterator was created.",
      m: M(["flowchart LR",
        "  C[\"Change during iteration\"]:::s0 --> FF[\"Fail-fast<br/>ArrayList, HashMap, TreeMap\"]:::bad",
        "  C --> SN[\"Snapshot<br/>CopyOnWriteArrayList\"]:::s2",
        "  C --> WC[\"Weakly consistent<br/>ConcurrentHashMap, SkipList, CLQ\"]:::s1",
        "  FF --> X[\"ConcurrentModificationException<br/>(best effort)\"]:::bad",
        "  SN --> Y[\"old view, no exception<br/>it.remove() unsupported\"]",
        "  WC --> Z[\"no exception, may or may not<br/>see the change\"]",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef bad fill:#fdecea,stroke:#c62828"]),
      table: [
        ["Kind", "Throws CME?", "Sees later changes?", "Cost", "Examples"],
        ["Fail-fast", "Usually (best effort)", "n/a", "Cheap counter check", "`ArrayList`, `HashMap`, `HashSet`, `TreeMap`, `ArrayDeque`"],
        ["Snapshot", "Never", "No", "Copy of the array on every write", "`CopyOnWriteArrayList/Set`"],
        ["Weakly consistent", "Never", "Maybe", "None extra", "`ConcurrentHashMap`, `ConcurrentSkipListMap`, `ConcurrentLinkedQueue`, `LinkedBlockingQueue`"]],
      points: ["\"Fail-safe\" is an informal term; the JDK docs say \"snapshot\" and \"weakly consistent\"", "Weakly consistent iterators are safe to use from many threads at once"] },
    { title: "Why ordinary collections break under threads",
      text: "`HashMap`, `ArrayList` and friends aren't thread-safe: concurrent `put`s can lose entries, corrupt bins during resize, or make `size` wrong. Even a thread-safe map doesn't make **compound actions** atomic: `get` then `put`, or check-then-act (`if (!map.containsKey(k)) map.put(k, v)`), races between the two calls. Here four threads increment one counter 10,000 times each: the get-then-put version loses updates; `merge` is a single atomic operation.",
      code: `ConcurrentHashMap<String, Integer> racy = new ConcurrentHashMap<>(), atomic = new ConcurrentHashMap<>();
racy.put("DEL-BLR", 0); atomic.put("DEL-BLR", 0);
Runnable work = () -> {
    for (int i = 0; i < 10_000; i++) {
        Integer v = racy.get("DEL-BLR");                 // read…
        racy.put("DEL-BLR", v + 1);                      // …then write: another thread may have written in between
        atomic.merge("DEL-BLR", 1, Integer::sum);        // one atomic read-modify-write
    }
};
List<Thread> ts = new ArrayList<>();
for (int t = 0; t < 4; t++) { Thread th = new Thread(work); ts.add(th); th.start(); }
for (Thread th : ts) th.join();
System.out.println("expected 40000 | get+put: " + racy.get("DEL-BLR") + " (usually less) | merge: " + atomic.get("DEL-BLR"));`,
      analogy: "Two cashiers reading the same ledger balance, each adding their sale, and writing back: one sale disappears. `merge` hands the ledger to one cashier at a time for that line." },
    { title: "ConcurrentHashMap internals (Java 8+)",
      text: "Like `HashMap`, a table of bins with linked nodes that become trees at 8. Concurrency comes from **fine-grained** control instead of one big lock: reads (`get`) take **no lock** (volatile reads of the table and node fields); inserting into an **empty bin** uses a lock-free **CAS**; changing a non-empty bin **synchronizes on its first node**, so threads updating different bins never block each other. `size()` sums striped counters (like `LongAdder`). Resizing is **cooperative**: threads that hit a moving bin (a `ForwardingNode`) help transfer. Java 7 used 16 lock `Segment`s instead.",
      m: M(["flowchart TB",
        "  P[\"put(k, v)\"]:::s0 --> E{\"bin empty?\"}",
        "  E -->|yes| CAS[\"CAS new node into slot<br/>(no lock)\"]:::s2",
        "  E -->|\"forwarding node\"| HELP[\"help resize, then retry\"]:::s4",
        "  E -->|no| SYNC[\"synchronized (first node of bin)<br/>update chain or tree\"]:::s1",
        "  G[\"get(k)\"]:::s0 --> R[\"volatile reads only<br/>(never blocks)\"]:::s2",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      table: [
        ["Aspect", "HashMap", "Hashtable / synchronizedMap", "ConcurrentHashMap"],
        ["Thread-safe", "No", "Yes (one lock for everything)", "Yes (CAS + per-bin locks)"],
        ["Reads block?", "n/a", "Yes", "No"],
        ["Null keys/values", "Allowed", "Hashtable: no; synchronizedMap: as backing map", "**Not allowed**"],
        ["Iterators", "Fail-fast", "Fail-fast (must lock manually)", "Weakly consistent"],
        ["Atomic compound ops", "n/a", "Only by external locking", "`compute`, `merge`, `putIfAbsent`…"]],
      points: ["No nulls because `get(k) == null` must unambiguously mean \"absent\": with concurrent writers you can't follow up with `containsKey`", "`size()` is exact when quiescent, an estimate under concurrent updates; `mappingCount()` returns a long"] },
    { title: "ConcurrentHashMap's atomic operations",
      text: "Use the map's own atomic methods instead of check-then-act. `putIfAbsent`, `computeIfAbsent` (create once, e.g. per-key locks or caches), `compute`, `merge` (counters, aggregations) and `replace(k, old, new)` (optimistic CAS-style update). The function runs **while the bin is locked**: keep it short, never block or do I/O inside, and never modify the same map from inside it (Java 9+ throws `IllegalStateException: Recursive update` in some cases).",
      code: `ConcurrentHashMap<String, LongAdder> hits = new ConcurrentHashMap<>();
ConcurrentHashMap<String, Set<String>> routesByOrigin = new ConcurrentHashMap<>();
List<String> routes = List.of("DEL-BLR", "DEL-BOM", "BOM-GOI", "DEL-BLR", "DEL-BLR");
routes.parallelStream().forEach(r -> {
    hits.computeIfAbsent(r, k -> new LongAdder()).increment();          // create once, then contention-free counting
    routesByOrigin.computeIfAbsent(r.substring(0, 3), k -> ConcurrentHashMap.newKeySet()).add(r);
});
System.out.println(new TreeMap<>(hits) + " " + new TreeMap<>(routesByOrigin));

ConcurrentHashMap<String, Integer> seats = new ConcurrentHashMap<>(Map.of("AI-505", 2));
boolean booked = seats.replace("AI-505", 2, 1);                         // CAS: succeeds only if still 2
Integer left = seats.computeIfPresent("AI-505", (k, v) -> v > 0 ? v - 1 : v);
System.out.println("booked=" + booked + " left=" + left + " putIfAbsent=" + seats.putIfAbsent("AI-505", 99));
try { seats.put("UK-811", null); } catch (NullPointerException e) { System.out.println("no null values"); }`,
      points: ["`computeIfAbsent` on CHM guarantees the function runs at most once per absent key", "For hot counters prefer `LongAdder` values (or `merge`) over `AtomicLong` under heavy contention"] },
    { title: "Bulk operations, sizing and key sets",
      text: "Java 8 added parallel-capable bulk operations to `ConcurrentHashMap`: `forEach`, `search` and `reduce` take a **parallelism threshold** (`Long.MAX_VALUE` = sequential, `1` = maximum parallelism on the common pool). They run over a weakly consistent view, so results are approximate while writers are active. `ConcurrentHashMap.newKeySet()` gives a concurrent `Set`; `keySet(defaultValue)` lets you `add` through the key view.",
      code: `ConcurrentHashMap<String, Integer> fares = new ConcurrentHashMap<>();
String[] r = {"DEL-BLR", "DEL-BOM", "BOM-GOI", "BLR-MAA", "CCU-DEL"};
for (int i = 0; i < r.length; i++) fares.put(r[i], 3500 + 700 * i);

long total = fares.reduceValuesToLong(1, Integer::longValue, 0L, Long::sum);          // parallel reduce
String anyOver5k = fares.search(Long.MAX_VALUE, (k, v) -> v > 5000 ? k : null);      // first non-null result
fares.forEach(Long.MAX_VALUE, (k, v) -> { if (k.startsWith("DEL")) System.out.print(k + " "); });
System.out.println("| total " + total + " | some route > 5000: " + (anyOver5k != null) + " | count " + fares.mappingCount());

Set<String> online = ConcurrentHashMap.newKeySet();
online.add("agent-7"); online.add("agent-9"); online.remove("agent-7");
Set<String> withDefault = fares.keySet(0);           // adding a key puts value 0
withDefault.add("GOI-BOM");
System.out.println(online + " " + fares.get("GOI-BOM"));` },
    { title: "CopyOnWriteArrayList: snapshot reads, expensive writes",
      text: "Every mutation copies the whole backing array under a lock and swaps a volatile reference; readers and iterators use whatever array they grabbed, with **no locking**. Perfect for **read-mostly, small** lists iterated far more often than changed: event listeners, configuration subscribers, routing rules. Terrible for large or write-heavy lists (each `add` is O(n) plus garbage). Iterators don't support `remove`/`set`/`add`.",
      code: `List<Consumer<String>> listeners = new CopyOnWriteArrayList<>();
listeners.add(e -> System.out.print("audit:" + e + " "));
listeners.add(new Consumer<>() {
    public void accept(String e) {
        System.out.print("once:" + e + " ");
        listeners.remove(this);                         // safe: the running loop uses a snapshot
    }
});
listeners.add(e -> System.out.print("metrics:" + e + " "));
for (String event : List.of("BOOKED", "CANCELLED")) {
    for (Consumer<String> l : listeners) l.accept(event);
    System.out.println("| listeners now " + listeners.size());
}`,
      analogy: "A notice board where every change prints a fresh copy and swaps it in: readers never wait, but frequent edits waste a lot of paper." },
    { title: "Concurrent sorted maps, queues and the BlockingQueue family",
      text: "`ConcurrentSkipListMap`/`Set` are the concurrent `TreeMap`/`TreeSet`: sorted, `NavigableMap` API, O(log n), lock-free. `ConcurrentLinkedQueue`/`Deque` are lock-free unbounded queues. `BlockingQueue` adds `put` (waits when full) and `take` (waits when empty): the backbone of producer–consumer pipelines and `ThreadPoolExecutor` work queues (deep dive in the multithreading module and LLD F31).",
      table: [
        ["Class", "Bound", "Order", "Typical use"],
        ["`ArrayBlockingQueue`", "Fixed capacity", "FIFO", "Backpressure between stages"],
        ["`LinkedBlockingQueue`", "Optional (default unbounded!)", "FIFO", "Executor work queues"],
        ["`PriorityBlockingQueue`", "Unbounded", "Priority", "Job schedulers"],
        ["`DelayQueue`", "Unbounded", "By expiry", "Retries, timeouts"],
        ["`SynchronousQueue`", "Zero (hand-off)", "n/a", "Cached thread pools"],
        ["`LinkedTransferQueue`", "Unbounded", "FIFO", "Producers waiting for consumers"]],
      code: `BlockingQueue<String> bookings = new ArrayBlockingQueue<>(2);           // bounded: producer waits when full
ConcurrentSkipListMap<Integer, String> byFare = new ConcurrentSkipListMap<>();
Thread consumer = new Thread(() -> {
    try {
        while (true) {
            String b = bookings.take();                                      // waits when empty
            if (b.equals("STOP")) break;
            String[] p = b.split(":");
            byFare.put(Integer.parseInt(p[1]), p[0]);
        }
    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
});
consumer.start();
for (String b : List.of("DEL-BLR:4850", "BOM-GOI:3200", "BLR-MAA:2900", "CCU-DEL:6100")) bookings.put(b);
bookings.put("STOP");
consumer.join();
System.out.println(byFare + " cheapest ≥ 3000: " + byFare.ceilingEntry(3000));`,
      points: ["`offer`/`poll` with timeouts instead of `put`/`take` when you can't wait forever", "Unbounded queues turn overload into OutOfMemoryError: prefer bounded queues in services"] },
    { title: "synchronizedX wrappers vs concurrent collections",
      text: "`Collections.synchronizedList/Map/Set` wrap every method in `synchronized (mutex)`: correct but one lock for everything, and **iteration still needs a manual lock** around the whole loop (the docs require it). Legacy `Vector`/`Hashtable` are the same idea built in. Concurrent collections are designed for parallel access and are almost always the better choice in new code; use the wrappers only for low-contention cases or when you need a compound action guarded by the same lock.",
      code: `List<String> log = Collections.synchronizedList(new ArrayList<>());
Thread[] ts = new Thread[4];
for (int t = 0; t < ts.length; t++) {
    int id = t;
    ts[t] = new Thread(() -> { for (int i = 0; i < 1000; i++) log.add("t" + id); });
    ts[t].start();
}
for (Thread t : ts) t.join();
long t0Count;
synchronized (log) {                                // required for iteration and compound actions
    t0Count = log.stream().filter("t0"::equals).count();
}
System.out.println("size " + log.size() + ", t0 entries " + t0Count);`,
      table: [
        ["Need", "Choose"],
        ["Shared key → value", "`ConcurrentHashMap`"],
        ["Shared sorted map / set", "`ConcurrentSkipListMap` / `Set`"],
        ["Read-mostly list (listeners)", "`CopyOnWriteArrayList`"],
        ["Producer–consumer", "`ArrayBlockingQueue` / `LinkedBlockingQueue`"],
        ["Non-blocking FIFO", "`ConcurrentLinkedQueue`"],
        ["Publish once, read everywhere", "Immutable `List.of`/`Map.copyOf` behind a `volatile` or final field"]] }
  ];

  H.registerLesson({
    code: "J09",
    summary: "How iteration really works (for-each = `Iterator`), why modifying a collection inside a loop throws `ConcurrentModificationException` (`modCount` vs `expectedModCount`) and the right ways to remove (`it.remove`, `removeIf`, views), why fail-fast is only best-effort, the three iterator guarantees (fail-fast, snapshot, weakly consistent), lost updates and check-then-act races, `ConcurrentHashMap` internals (lock-free reads, CAS on empty bins, per-bin locks, cooperative resize, no nulls) and its atomic API, `CopyOnWriteArrayList`, concurrent skip lists, the `BlockingQueue` family, and `synchronizedX` wrappers vs concurrent collections.",
    slides: SLIDES,
    widget: { heading: "Interactive: modify a collection while iterating", caption: "Choose a collection and an action inside the loop. Visit order, outcome and final contents were produced by running this exact loop on Java 21; the ArrayList trace models its iterator's `cursor` and `modCount` checks.", render: iterWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Cleanup loops", "Removing expired sessions, cancelled bookings or zero-stock items: `removeIf` / `map.values().removeIf(...)` instead of remove-in-for-each."],
      ["Request counters", "`ConcurrentHashMap<String, LongAdder>` per endpoint or tenant for metrics and rate limiting."],
      ["Per-key caches", "`computeIfAbsent` to load reference data once per key across request threads (Caffeine for eviction, S11)."],
      ["Listeners", "`CopyOnWriteArrayList` for event listeners and subscribers that are rarely added but notified constantly."],
      ["Pipelines", "Bounded `BlockingQueue` between an ingest thread and workers for backpressure (Kafka consumers, file loaders)."],
      ["Debugging", "A CME stack trace in production usually means shared mutable state or a modify-while-iterating bug, not a JVM issue."]
    ],
    pitfalls: [
      "`list.remove(x)` inside a for-each over the same list",
      "Forward index loop with `remove(i)` (skips the next element)",
      "Treating the absence of CME as proof of correctness",
      "`get` + `put` (or `containsKey` + `put`) on a ConcurrentHashMap instead of `merge`/`compute`/`putIfAbsent`",
      "Slow or blocking work, or writes to the same map, inside `computeIfAbsent`",
      "Putting null into a ConcurrentHashMap",
      "Iterating a `synchronizedList` without holding its lock",
      "Large or write-heavy `CopyOnWriteArrayList`",
      "Unbounded `LinkedBlockingQueue` under overload"
    ],
    quiz: [
      { q: "What does this print?", code: `List<Integer> xs = new ArrayList<>(List.of(1, 2, 3, 4));
try { for (Integer x : xs) if (x == 2) xs.remove(x); System.out.println(xs); }
catch (ConcurrentModificationException e) { System.out.println("CME"); }`, options: ["[1, 3, 4]", "CME", "[1, 2, 3, 4]", "It doesn't compile"], answer: 1, why: "Removing 2 (not second-to-last) bumps modCount; the next next() throws." },
      { q: "And if we remove 3 (the second-to-last) instead?", options: ["CME", "[1, 2, 4] with no exception, 4 never visited", "[1, 2, 3, 4]", "IndexOutOfBoundsException"], answer: 1, why: "cursor == size ends the loop before the check." },
      { q: "Which is the safe way to remove while iterating an ArrayList?", options: ["list.remove inside for-each", "Iterator.remove() or removeIf", "Catch the CME", "Use a forward index loop"], answer: 1, why: "They keep the iterator in sync." },
      { q: "A CopyOnWriteArrayList iterator…", options: ["Throws CME on modification", "Iterates a snapshot and doesn't support remove()", "Blocks writers", "Sees every later change"], answer: 1, why: "Snapshot semantics." },
      { q: "How does ConcurrentHashMap (Java 8+) handle a put into an empty bin?", options: ["Locks the whole map", "Locks one of 16 segments", "CAS without a lock", "Copies the table"], answer: 2, why: "Non-empty bins synchronize on the first node." },
      { q: "Why doesn't ConcurrentHashMap allow null values?", options: ["Performance only", "get() returning null must mean absent; containsKey can't disambiguate safely under concurrency", "Legacy from Hashtable", "Nulls break hashCode"], answer: 1, why: "Ambiguity is unfixable with concurrent writers." },
      { q: "Four threads run `map.put(k, map.get(k) + 1)` 1000 times each on a ConcurrentHashMap. The final value is…", options: ["Always 4000", "Possibly less than 4000", "Always more", "An exception"], answer: 1, why: "Each call is atomic; the pair isn't. Use merge." },
      { q: "Which collection is the concurrent equivalent of TreeMap?", options: ["ConcurrentHashMap", "ConcurrentSkipListMap", "Hashtable", "CopyOnWriteArraySet"], answer: 1, why: "Sorted, NavigableMap, lock-free." },
      { q: "Iterating a Collections.synchronizedList safely requires…", options: ["Nothing", "synchronized (list) around the loop", "Using forEach only", "Calling list.lock()"], answer: 1, why: "The docs require manual locking for iteration." }
    ],
    cheatsheet: {
      table: [
        ["Situation", "Use"],
        ["Remove while iterating", "`it.remove()`, `removeIf`, `map.values().removeIf`, `entrySet().removeIf`"],
        ["Update values in place", "`replaceAll`, `entry.setValue` (not structural)"],
        ["Shared counter map", "`merge(k, 1, Integer::sum)` or `computeIfAbsent(k, x -> new LongAdder()).increment()`"],
        ["Create once per key", "`computeIfAbsent` (short function!)"],
        ["Optimistic update", "`replace(k, expected, next)` in a loop"],
        ["Read-mostly list", "`CopyOnWriteArrayList`"],
        ["Sorted + concurrent", "`ConcurrentSkipListMap/Set`"],
        ["Producer–consumer", "bounded `ArrayBlockingQueue`, `put`/`take`"]],
      cards: [
        { title: "Iterator guarantees", items: ["Fail-fast: CME, best effort", "Snapshot: old view, no remove", "Weakly consistent: no CME, may see changes"] },
        { title: "ConcurrentHashMap", items: ["Lock-free reads", "CAS empty bin, sync on bin head", "Treeify at 8", "No null keys/values", "size() is an estimate under writes"] },
        { title: "Say in interviews", items: ["modCount vs expectedModCount", "Single-threaded CME", "Compound actions need atomic methods", "Java 7 segments → Java 8 bins", "Prefer concurrent collections over wrappers"] }]
    },
    practice: [
      { level: "Easy", q: "What is ConcurrentModificationException and why can it happen in a single-threaded program?",
        a: ["It signals that a collection was structurally modified while an iterator over it was in use, other than through that iterator.",
          "Fail-fast iterators copy the collection's `modCount` into `expectedModCount`; `next()` (and `remove()`) throw if they differ.",
          "The most common cause is single-threaded: calling `list.remove(x)` or `map.put(k, v)` (new key) inside a for-each over the same collection.",
          "Fix with `Iterator.remove`, `removeIf`, collecting changes and applying them after the loop, or iterating a copy."] },
      { level: "Easy", q: "Fail-fast vs fail-safe iterators: explain with examples.",
        a: ["**Fail-fast** (`ArrayList`, `HashMap`, `HashSet`, `TreeMap`): detect concurrent structural modification and throw CME, on a best-effort basis.",
          "**Fail-safe** is the informal name for iterators that never throw. Two kinds in the JDK: **snapshot** (`CopyOnWriteArrayList`: iterates a copy, doesn't see later changes, `remove()` unsupported) and **weakly consistent** (`ConcurrentHashMap`, `ConcurrentLinkedQueue`: works on the live structure, may or may not reflect changes, never throws, each element at most once).",
          "Trade-off: fail-fast is cheap and catches bugs; snapshot costs copies on write; weakly consistent gives up a precise point-in-time view."] },
      { level: "Easy", q: "Why doesn't ConcurrentHashMap allow null keys or values when HashMap does?",
        a: ["In a single-threaded `HashMap`, `get(k) == null` is ambiguous but you can follow up with `containsKey(k)`.",
          "In a concurrent map another thread may change the entry between those two calls, so the ambiguity can't be resolved; banning null makes `null` from `get` mean \"absent\".",
          "It also lets the implementation use null internally (e.g. in `compute` a null result means remove).",
          "Use `Optional`, a sentinel value, or `getOrDefault` instead."] },
      { level: "Medium", q: "Remove all cancelled bookings from a list. Show the buggy index loop and two correct versions.",
        code: `record Booking(String pnr, boolean cancelled) {}
List<Booking> all = List.of(new Booking("A1", true), new Booking("B2", true), new Booking("C3", false), new Booking("D4", true));

List<Booking> buggy = new ArrayList<>(all);
for (int i = 0; i < buggy.size(); i++) if (buggy.get(i).cancelled()) buggy.remove(i);    // skips B2 after removing A1

List<Booking> backwards = new ArrayList<>(all);
for (int i = backwards.size() - 1; i >= 0; i--) if (backwards.get(i).cancelled()) backwards.remove(i);

List<Booking> viaRemoveIf = new ArrayList<>(all);
viaRemoveIf.removeIf(Booking::cancelled);

System.out.println(buggy.stream().map(Booking::pnr).toList() + " " + backwards.stream().map(Booking::pnr).toList() + " " + viaRemoveIf.stream().map(Booking::pnr).toList());`,
        a: ["Forward index loop: after `remove(i)` everything shifts left, so `i++` skips the next element: `B2` survives.",
          "Looping backwards avoids the shift problem; `removeIf` is clearest and for `ArrayList` does a single O(n) compaction pass instead of O(n²) shifts.",
          "No CME in any of these: index loops don't use an iterator, which is exactly why the bug is silent."] },
      { level: "Medium", q: "HashMap vs Hashtable vs Collections.synchronizedMap vs ConcurrentHashMap?",
        a: ["**HashMap**: not thread-safe, allows one null key and null values, fail-fast iterators.",
          "**Hashtable**: legacy (Java 1.0), every method `synchronized` on the table, no nulls; don't use in new code.",
          "**synchronizedMap**: wrapper that synchronizes every call on one mutex; nulls follow the backing map; iteration and compound actions need `synchronized (map)`.",
          "**ConcurrentHashMap**: lock-free reads, CAS + per-bin locks for writes, atomic `compute`/`merge`/`putIfAbsent`, weakly consistent iterators, no nulls; scales with threads.",
          "Choose CHM for shared maps; synchronizedMap only for low contention or when you need one lock across several operations."] },
      { level: "Medium", q: "Count words across many documents in parallel with a thread-safe map.",
        code: `List<String> docs = List.of("fare drop on DEL BLR", "BLR fare rises", "DEL BLR BLR sold out");
ConcurrentHashMap<String, Long> counts = new ConcurrentHashMap<>();
try (ExecutorService pool = Executors.newFixedThreadPool(3)) {
    for (String d : docs)
        pool.submit(() -> { for (String w : d.toLowerCase().split("\\\\s+")) counts.merge(w, 1L, Long::sum); });
}                                                                // close() waits for the tasks (Java 19+)
System.out.println(new TreeMap<>(counts));`,
        a: ["Each `merge` is atomic per key, so concurrent workers never lose increments.",
          "`ExecutorService` is `AutoCloseable` since Java 19: try-with-resources waits for submitted tasks.",
          "Alternative without shared state: `docs.parallelStream().flatMap(...).collect(groupingByConcurrent(w -> w, counting()))` (J11)."] },
      { level: "Medium", q: "How does ConcurrentHashMap achieve thread safety? How did it change from Java 7 to Java 8?",
        steps: ["**Java 7**: the map was split into 16 (by default) `Segment`s, each a small hash table guarded by its own `ReentrantLock`; writes locked one segment, reads were mostly lock-free. Concurrency level was fixed at construction.",
          "**Java 8+**: segments were removed. A single `Node[]` table like HashMap's; reads use volatile reads, no locks.",
          "Insert into an empty bin: `casTabAt` (compare-and-swap) installs the node without locking.",
          "Insert into or update a non-empty bin: `synchronized` on the bin's first node, so only that bin is locked.",
          "Long bins become red-black trees (`TreeBin`) at 8, like HashMap.",
          "Resize: a thread starts a transfer; bins already moved get a `ForwardingNode`; other writers hitting it help move bins.",
          "Size: a base counter plus `CounterCell`s (striped, LongAdder-like) to avoid contention; `size()` sums them."] },
      { level: "Hard", q: "Build a thread-safe memoizer that computes each value at most once, even if the computation is slow.",
        code: `final class Memo<K, V> {
    private final ConcurrentHashMap<K, CompletableFuture<V>> cache = new ConcurrentHashMap<>();
    private final Function<K, V> loader;
    final AtomicInteger loads = new AtomicInteger();
    Memo(Function<K, V> loader) { this.loader = loader; }
    V get(K key) {
        CompletableFuture<V> mine = new CompletableFuture<>();
        CompletableFuture<V> f = cache.putIfAbsent(key, mine);       // atomic: only one thread installs a future
        if (f == null) {                                              // we won: load outside any map lock
            f = mine;
            try { loads.incrementAndGet(); mine.complete(loader.apply(key)); }
            catch (RuntimeException e) { cache.remove(key, mine); mine.completeExceptionally(e); }   // allow retry
        }
        return f.join();                                              // everyone else waits for the same result
    }
}

Memo<String, Integer> fares = new Memo<>(route -> { try { Thread.sleep(50); } catch (InterruptedException e) { } return route.length() * 1000; });
List<Thread> ts = new ArrayList<>();
for (int i = 0; i < 8; i++) { Thread t = new Thread(() -> fares.get("DEL-BLR")); ts.add(t); t.start(); }
for (Thread t : ts) t.join();
System.out.println("value " + fares.get("DEL-BLR") + ", loads " + fares.loads.get());`,
        a: ["Putting the slow loader directly inside `computeIfAbsent` works but holds the bin lock for the whole load, blocking other keys in the same bin, and must never touch the map recursively.",
          "Storing a `CompletableFuture` per key makes the map operation cheap; exactly one thread (the one whose `putIfAbsent` returned null) runs the loader outside any lock, the others `join()` the same future.",
          "Failed loads remove the future so a later call can retry.",
          "In production use Caffeine's `LoadingCache`/`AsyncLoadingCache`, which does this plus eviction and stats."] },
      { level: "Hard", q: "Is `ConcurrentHashMap.size()` accurate? What do its iterators and bulk operations guarantee?",
        a: ["`size()` sums a base count and striped counter cells; with no concurrent updates it's exact, during updates it's a moving estimate (and capped at `Integer.MAX_VALUE`; use `mappingCount()`).",
          "Iterators and `forEach`/`reduce`/`search` are weakly consistent: they reflect the state at some point at or since creation, never throw CME, never return an element twice, and may miss or include concurrent changes.",
          "So never make decisions like \"if size() < limit then put\" across threads: use atomic operations or a separate `Semaphore`/counter.",
          "If you need a consistent snapshot, copy under a lock you control, or use immutable maps swapped atomically (`AtomicReference<Map<…>>`)."] },
      { level: "Hard", q: "Implement a fail-fast iterator for a tiny custom array-backed list.",
        code: `final class TinyList<E> implements Iterable<E> {
    private Object[] data = new Object[4];
    private int size, modCount;
    void add(E e) { if (size == data.length) data = Arrays.copyOf(data, size * 2); data[size++] = e; modCount++; }
    void removeAt(int i) { System.arraycopy(data, i + 1, data, i, size - i - 1); data[--size] = null; modCount++; }
    @SuppressWarnings("unchecked") E get(int i) { Objects.checkIndex(i, size); return (E) data[i]; }
    public Iterator<E> iterator() {
        return new Iterator<>() {
            int cursor, lastRet = -1, expected = modCount;
            public boolean hasNext() { return cursor < size; }
            public E next() {
                if (modCount != expected) throw new ConcurrentModificationException();
                if (cursor >= size) throw new NoSuchElementException();
                lastRet = cursor;
                return get(cursor++);
            }
            public void remove() {
                if (lastRet < 0) throw new IllegalStateException();
                if (modCount != expected) throw new ConcurrentModificationException();
                removeAt(lastRet); cursor = lastRet; lastRet = -1; expected = modCount;   // stay in sync
            }
        };
    }
}

TinyList<String> t = new TinyList<>();
for (String s : List.of("DEL", "BOM", "BLR", "MAA", "GOI")) t.add(s);
for (Iterator<String> it = t.iterator(); it.hasNext(); ) if (it.next().startsWith("B")) it.remove();
StringBuilder sb = new StringBuilder(); for (String s : t) sb.append(s).append(' ');
try { for (String s : t) if (s.equals("DEL")) t.add("CCU"); } catch (ConcurrentModificationException e) { sb.append("| CME on add"); }
System.out.println(sb);`,
        a: ["Keep a `modCount` incremented on every structural change; the iterator snapshots it and checks on `next()`/`remove()`.",
          "`remove()` goes through the list, moves the cursor back and re-syncs `expected`, exactly like `ArrayList.Itr`.",
          "`lastRet = -1` enforces the contract that `remove()` is allowed once per `next()`."] }
    ],
    recap: [
      "For-each uses an `Iterator`; `modCount` vs `expectedModCount` makes `java.util` iterators fail-fast, even in one thread.",
      "Remove via `it.remove()`, `removeIf` or views; never `list.remove` inside for-each, and don't trust missing CMEs.",
      "Three guarantees: fail-fast, snapshot (`CopyOnWriteArrayList`), weakly consistent (`ConcurrentHashMap` and most of `java.util.concurrent`).",
      "ConcurrentHashMap: lock-free reads, CAS for empty bins, per-bin locks, cooperative resize, no nulls; use `merge`/`compute`/`putIfAbsent` for compound actions.",
      "Pick by need: CHM, skip lists for sorted, COW for read-mostly lists, bounded BlockingQueues for pipelines; wrappers only for low contention."
    ]
  });
})();
