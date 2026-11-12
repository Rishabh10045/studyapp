/* Lesson J08: Collections II: HashMap internals, Sets & sorted maps */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  var KEYS = ["DEL", "BOM", "BLR", "MAA", "CCU", "HYD", "GOI", "PNQ", "AMD", "COK", "Aa", "BB", "JAI", "IXC"];
  function strHash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (31 * h + s.charCodeAt(i)) | 0; return h; }
  function spread(h) { return h ^ (h >>> 16); }
  function mapWidget(el, ctx) {
    var s = ctx.state; if (!s.keys) { s.keys = []; s.cap = 4; s.log = []; }
    el.innerHTML = "<p>" + ctx.md("A `new HashMap<>(4)` (capacity 4, load factor 0.75 → **threshold 3**). Each `put` computes `String.hashCode()`, spreads it with `h ^ (h >>> 16)`, and picks bucket `hash & (capacity - 1)`. When size exceeds the threshold the table **doubles** and every node either stays at index `i` or moves to `i + oldCap`, decided by one bit: `hash & oldCap`.") + "</p>" +
      "<div class='btnrow'><button type='button' class='btn primary' data-r='put'>put(next airport)</button><button type='button' class='btn' data-r='col'>put \"Aa\" and \"BB\" (same hashCode)</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><pre class='code' data-r='log'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function idx(k, cap) { return spread(strHash(k)) & (cap - 1); }
    function put(k) {
      if (s.keys.indexOf(k) >= 0) { s.log.push("put(\"" + k + "\"): key exists → value replaced, size unchanged"); return; }
      var h = strHash(k), sp = spread(h);
      s.keys.push(k);
      var i = sp & (s.cap - 1), bucketMates = s.keys.filter(function (x) { return x !== k && idx(x, s.cap) === i; });
      s.log.push("put(\"" + k + "\"): hashCode " + h + " → spread " + sp + " → index " + sp + " & " + (s.cap - 1) + " = " + i + (bucketMates.length ? "  (collision with " + bucketMates.join(", ") + ": appended to the chain)" : ""));
      var thr = Math.floor(s.cap * 0.75);
      if (s.keys.length > thr) {
        var old = s.cap; s.cap *= 2;
        var moved = s.keys.filter(function (x) { return (spread(strHash(x)) & old) !== 0; });
        s.log.push("size " + s.keys.length + " > threshold " + thr + " → resize " + old + " → " + s.cap + "; " + (moved.length ? moved.join(", ") + " move to index + " + old : "no keys move") + " (bit " + old + " of their hash is 1)");
      }
    }
    function draw() {
      var L = ["flowchart LR", "  subgraph T[\"table[" + s.cap + "]  size " + s.keys.length + "  threshold " + Math.floor(s.cap * 0.75) + "\"]", "    direction TB"];
      var edges = [];
      for (var i = 0; i < s.cap; i++) {
        var chain = s.keys.filter(function (k) { return idx(k, s.cap) === i; });
        L.push("    b" + i + "[\"[" + i + "]\"]:::" + (chain.length > 1 ? "s1" : chain.length ? "s0" : "s4"));
        chain.forEach(function (k, j) { edges.push("  " + (j === 0 ? "b" + i : "k" + i + "_" + (j - 1)) + " --> k" + i + "_" + j + "[\"" + k + "<br/><small>hash " + spread(strHash(k)) + "</small>\"]:::" + (chain.length > 1 ? "s1" : "s2")); });
      }
      L.push("  end");
      L = L.concat(edges);
      L.push("  classDef s0 fill:#dbeafe,stroke:#2563eb", "  classDef s1 fill:#fff3e0,stroke:#ef6c00", "  classDef s2 fill:#ecfdf5,stroke:#059669", "  classDef s4 fill:#f5f5f5,stroke:#d4d4d4,color:#999");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var longest = 0; for (var b = 0; b < s.cap; b++) longest = Math.max(longest, s.keys.filter(function (k) { return idx(k, s.cap) === b; }).length);
      var res = q("res"); res.className = "result" + (longest > 1 ? " warn" : "");
      res.innerHTML = "<p>" + ctx.md("Longest chain: **" + longest + "**. Lookups cost O(1 + chain length). A real `HashMap` converts a chain to a red-black tree once it reaches **8** nodes (if the table has ≥ 64 buckets; otherwise it resizes instead), keeping worst-case lookups O(log n).") + "</p>";
      q("log").textContent = s.log.slice(-6).join("\n") || "Press put().";
      q("put").disabled = s.keys.filter(function (k) { return k !== "Aa" && k !== "BB"; }).length >= KEYS.length - 2;
    }
    q("put").addEventListener("click", function () { var next = KEYS.filter(function (k) { return k !== "Aa" && k !== "BB" && s.keys.indexOf(k) < 0; })[0]; if (next) put(next); ctx.save(); draw(); });
    q("col").addEventListener("click", function () { put("Aa"); put("BB"); ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.keys = []; s.cap = 4; s.log = []; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "HashMap's structure: an array of buckets",
      text: "A `HashMap` is an array (`table`) of **buckets**. Each bucket holds `null`, a singly linked chain of `Node`s, or (when a chain gets long) a red-black **tree** of `TreeNode`s. Every node stores the key's **spread hash**, the key, the value and a `next` pointer. Capacity is always a **power of two**, so the bucket index is a cheap bit-mask: `hash & (n - 1)`.",
      m: M(["flowchart LR",
        "  subgraph TBL[\"table (capacity 16)\"]",
        "    direction TB",
        "    B0[\"[0]\"]:::s0",
        "    B1[\"[1]\"]:::s0",
        "    B2[\"[2] … [15]\"]",
        "  end",
        "  B0 --> N1[\"Node<br/>hash · key GOI · value · next\"]:::s2 --> N2[\"Node: Aa\"]:::s1 --> N3[\"Node: BB\"]:::s1",
        "  B1 --> N4[\"Node: BOM\"]:::s2",
        "  B2 -.-> TR[\"TreeNode (red-black tree)<br/>when a chain ≥ 8 and table ≥ 64\"]:::bad"]),
      table: [
        ["Field / constant", "Value", "Meaning"],
        ["Default initial capacity", "16 (allocated lazily on first put)", "Number of buckets"],
        ["Load factor", "0.75", "Resize when size > capacity × 0.75"],
        ["`TREEIFY_THRESHOLD`", "8", "Chain length that triggers a tree"],
        ["`MIN_TREEIFY_CAPACITY`", "64", "Below this, resize instead of treeifying"],
        ["`UNTREEIFY_THRESHOLD`", "6", "Tree shrinks back to a chain"]],
      analogy: "A post office with numbered pigeonholes. The hash is the PIN code, the pigeonhole number is derived from it, and letters with the same pigeonhole are stacked in one pile (the chain). When piles get too tall the office doubles the number of pigeonholes and re-sorts." },
    { title: "put and get, step by step",
      text: "1) `hash(key)`: call `key.hashCode()` and **spread** it: `h ^ (h >>> 16)`, mixing the high bits into the low bits because the index only uses the low bits. `null` keys get hash 0 (bucket 0). 2) index = `hash & (n - 1)`. 3) Empty bucket → new node. Otherwise walk the chain/tree comparing **hash, then reference, then `equals`**: match → replace the value; no match → append. 4) `++size > threshold` → **resize**. `get` follows the same path and returns `null` on a miss.",
      code: `static int spread(Object key) { int h = key.hashCode(); return h ^ (h >>> 16); }

Map<String, Integer> fares = new HashMap<>();
for (String route : List.of("DEL-BLR", "BOM-GOI", "CCU-MAA")) {
    int h = spread(route);
    System.out.printf("%s hashCode=%d spread=%d bucket(16)=%d%n", route, route.hashCode(), h, h & 15);
    fares.put(route, route.length() * 700);
}
System.out.println("put existing key returns old value: " + fares.put("DEL-BLR", 4850));
System.out.println("get hit " + fares.get("DEL-BLR") + ", get miss " + fares.get("DEL-GOI"));
fares.put(null, 0);                                   // HashMap allows one null key (bucket 0)
System.out.println("null key → " + fares.get(null) + ", containsKey(null) " + fares.containsKey(null));`,
      points: ["`get` returning `null` is ambiguous (missing key or null value): use `containsKey` or `getOrDefault`", "Average O(1) for `get`/`put`/`remove`; worst case O(log n) per bucket thanks to treeification (O(n) before Java 8)"] },
    { title: "Load factor, resizing and pre-sizing",
      text: "When `size` exceeds `capacity × loadFactor`, the table **doubles**. Because capacity is a power of two, each node either stays at index `i` or moves to `i + oldCap`, decided by one bit (`hash & oldCap`): the chain is split into a \"lo\" and \"hi\" list in one pass, preserving order, no recomputing of `hashCode`. Resizing is O(n) and allocates a new array, so **pre-size** maps when you know roughly how many entries you'll put.",
      code: `int expected = 1_000;
Map<String, Integer> naive = new HashMap<>(expected);                 // capacity 1024 → threshold 768 → one resize
Map<String, Integer> sized = new HashMap<>((int) (expected / 0.75f) + 1);   // classic formula: no resize
Map<String, Integer> modern = HashMap.newHashMap(expected);             // Java 19+: does the maths for you
for (int i = 0; i < expected; i++) { naive.put("k" + i, i); sized.put("k" + i, i); modern.put("k" + i, i); }
System.out.println(naive.size() + " " + sized.size() + " " + modern.size());

// the split rule on resize from 16 to 32
for (String k : List.of("DEL", "BOM", "BLR", "MAA")) {
    int h = k.hashCode() ^ (k.hashCode() >>> 16);
    System.out.printf("%s: index16=%d, bit16=%s → index32=%d%n", k, h & 15, (h & 16) != 0 ? "1 (moves +16)" : "0 (stays)", h & 31);
}`,
      points: ["`new HashMap<>(n)` sets **capacity**, not \"room for n entries\": `HashMap.newHashMap(n)` (Java 19) is what most people mean", "Requested capacities round up to the next power of two (`tableSizeFor`)", "Lower load factor = fewer collisions, more memory; 0.75 is a good default", "Use the widget: it uses the same hash, spread, index and split rules as `java.util.HashMap` (checked against the real class)"] },
    { title: "Collisions and treeification",
      text: "Different keys can share a bucket because their (spread) hashes are equal or simply map to the same index. Lookups then walk the chain, costing O(chain length). Since Java 8, a chain of **8+** nodes in a table of **64+** buckets is converted to a **red-black tree** ordered by hash (and by `compareTo` if keys are `Comparable`), so a flood of colliding keys (e.g. an attacker posting crafted parameter names) degrades lookups to O(log n) rather than O(n).",
      code: `// "Aa" and "BB" have the same String.hashCode(); concatenations multiply collisions
List<String> seeds = List.of("Aa", "BB");
List<String> colliding = new ArrayList<>(List.of(""));
for (int round = 0; round < 10; round++) {                       // 2^10 = 1024 strings with ONE hash code
    List<String> next = new ArrayList<>();
    for (String prefix : colliding) for (String s : seeds) next.add(prefix + s);
    colliding = next;
}
System.out.println(colliding.size() + " keys, distinct hashCodes: " + colliding.stream().map(String::hashCode).distinct().count());
Map<String, Integer> map = new HashMap<>();
for (String k : colliding) map.put(k, k.length());
long t0 = System.nanoTime();
for (int r = 0; r < 200; r++) for (String k : colliding) map.get(k);
System.out.println("all found: " + colliding.stream().allMatch(map::containsKey) + " (tree bins keep this fast: Strings are Comparable)");`,
      points: ["Treeification helps most when keys are `Comparable` (like `String`); otherwise ties fall back to slower tie-breaking", "A bad `hashCode` (e.g. constant) still hurts: every key goes to one tree", "Java also caps request parameter counts in servers (Tomcat `maxParameterCount`) as defence in depth"] },
    { title: "The Map API you should know",
      text: "Since Java 8, `Map` has atomic-looking compound operations that replace verbose get-check-put code: `getOrDefault`, `putIfAbsent`, `computeIfAbsent`, `computeIfPresent`, `compute` and `merge`. They're cleaner, do one hash lookup, and on `ConcurrentHashMap` they're **atomic** (J09). Iterate with `entrySet()` (or `forEach`), not `keySet()` + `get`.",
      code: `List<String> searches = List.of("DEL-BLR", "BOM-GOI", "DEL-BLR", "CCU-MAA", "DEL-BLR", "BOM-GOI");
Map<String, Integer> counts = new HashMap<>();
for (String s : searches) counts.merge(s, 1, Integer::sum);           // word-count idiom
System.out.println(counts);

Map<String, List<String>> byOrigin = new TreeMap<>();
for (String s : searches) byOrigin.computeIfAbsent(s.substring(0, 3), k -> new ArrayList<>()).add(s);   // multimap idiom
System.out.println(byOrigin);

counts.computeIfPresent("CCU-MAA", (k, v) -> v > 1 ? v - 1 : null);  // returning null removes the entry
counts.putIfAbsent("HYD-PNQ", 0);
System.out.println(counts.getOrDefault("JAI-IXC", -1) + " " + counts.containsKey("CCU-MAA") + " " + counts.get("HYD-PNQ"));
for (Map.Entry<String, Integer> e : counts.entrySet()) if (e.getValue() >= 2) System.out.print(e.getKey() + "=" + e.getValue() + " ");
System.out.println();
counts.replaceAll((k, v) -> v * 10);
counts.entrySet().removeIf(e -> e.getValue() == 0);
System.out.println(counts);`,
      points: ["`merge(k, 1, Integer::sum)` and `computeIfAbsent(k, x -> new ArrayList<>()).add(v)` are the two idioms to know cold", "Don't modify the map from inside the function passed to `compute*` (undefined behaviour; `ConcurrentHashMap` may deadlock or throw)"] },
    { title: "HashSet, LinkedHashSet: sets are maps in disguise",
      text: "`HashSet<E>` is implemented with a `HashMap<E, Object>` where every value is the same dummy `PRESENT` object; `add(e)` is `map.put(e, PRESENT) == null`. So everything about hashing, `equals`/`hashCode`, resizing and complexity carries over. `LinkedHashSet` keeps **insertion order** (backed by a `LinkedHashMap`), at the cost of two extra pointers per entry.",
      code: `Set<String> visited = new HashSet<>();
System.out.println(visited.add("DEL") + " " + visited.add("DEL") + " size " + visited.size());   // add returns false for duplicates

List<String> stops = List.of("GOI", "DEL", "BOM", "DEL", "BLR", "GOI");
System.out.println("HashSet:       " + new HashSet<>(stops));          // order depends on hashes
System.out.println("LinkedHashSet: " + new LinkedHashSet<>(stops));    // first-seen order: dedup while keeping order
System.out.println("TreeSet:       " + new TreeSet<>(stops));          // sorted

Set<String> a = new HashSet<>(List.of("DEL", "BOM", "BLR")), b = Set.of("BLR", "GOI");
Set<String> union = new HashSet<>(a); union.addAll(b);
Set<String> inter = new HashSet<>(a); inter.retainAll(b);
Set<String> diff = new HashSet<>(a); diff.removeAll(b);
System.out.println("union " + new TreeSet<>(union) + " intersection " + inter + " difference " + new TreeSet<>(diff));`,
      points: ["Never rely on `HashSet`/`HashMap` iteration order: it can change between JDK versions and after resizes", "`Set.of` is immutable, rejects nulls and duplicates (`IllegalArgumentException`), and its iteration order is deliberately randomised per JVM run"] },
    { title: "LinkedHashMap: predictable order and LRU caches",
      text: "`LinkedHashMap` adds a doubly linked list through all entries. By default it keeps **insertion order**; with the constructor flag `accessOrder = true`, every `get`/`put` moves the entry to the end, so the **least recently used** entry is first. Override `removeEldestEntry` to evict automatically: a complete LRU cache in a few lines (and a frequent interview question; LLD covers the from-scratch version).",
      m: M(["flowchart LR",
        "  H([\"head (eldest)\"]) --> A[\"BOM\"]:::s0 <--> B[\"GOI\"]:::s0 <--> C[\"DEL\"]:::s1",
        "  C --- T([\"tail (newest)\"])",
        "  G[\"get(BOM) with accessOrder\"] -. \"moves BOM to the tail\" .-> T"]),
      code: `class LruCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;
    LruCache(int capacity) { super(16, 0.75f, true); this.capacity = capacity; }    // accessOrder = true
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) { return size() > capacity; }
}

LruCache<String, Integer> cache = new LruCache<>(3);
cache.put("DEL-BLR", 4850); cache.put("BOM-GOI", 3200); cache.put("CCU-MAA", 5100);
cache.get("DEL-BLR");                                   // touch → most recently used
cache.put("HYD-PNQ", 2900);                             // evicts the eldest: BOM-GOI
System.out.println(cache.keySet());

SequencedMap<String, Integer> insertion = new LinkedHashMap<>();
insertion.put("z", 1); insertion.put("a", 2); insertion.put("m", 3); insertion.put("z", 9);   // re-put keeps position
System.out.println(insertion + " first=" + insertion.firstEntry() + " last=" + insertion.lastEntry());   // SequencedMap (Java 21)`,
      points: ["Not thread-safe: wrap with `Collections.synchronizedMap` for low contention, or use Caffeine for real caches (S11)", "Java 21: `LinkedHashMap` is a `SequencedMap` with `firstEntry`, `lastEntry`, `pollFirstEntry`, `putFirst`, `reversed`"] },
    { title: "TreeMap and TreeSet: sorted and navigable",
      text: "`TreeMap` is a **red-black tree** (a self-balancing binary search tree) keyed by `compareTo` or a `Comparator`: `get`/`put`/`remove` are **O(log n)**, keys iterate in sorted order, and the `NavigableMap` API answers range questions: `floorKey` (≤), `ceilingKey` (≥), `lowerKey`, `higherKey`, `headMap`, `tailMap`, `subMap`, `firstEntry`, `pollFirstEntry`, `descendingMap`. `TreeSet` is a `TreeMap` with dummy values.",
      code: `NavigableMap<Integer, String> fareBands = new TreeMap<>(Map.of(0, "Saver", 4000, "Value", 6000, "Flex", 9000, "Business"));
for (int fare : new int[]{3500, 4000, 5999, 12000})
    System.out.println("₹" + fare + " → " + fareBands.floorEntry(fare).getValue());            // greatest key ≤ fare

TreeMap<LocalTime, String> departures = new TreeMap<>();
departures.put(LocalTime.of(6, 15), "6E-201"); departures.put(LocalTime.of(9, 30), "AI-505");
departures.put(LocalTime.of(13, 0), "UK-811"); departures.put(LocalTime.of(18, 45), "QP-110");
LocalTime now = LocalTime.of(9, 0);
System.out.println("next flight: " + departures.ceilingEntry(now));
System.out.println("morning: " + departures.headMap(LocalTime.NOON).values());
System.out.println("9:00–14:00: " + departures.subMap(LocalTime.of(9, 0), true, LocalTime.of(14, 0), true).values());
System.out.println("latest first: " + departures.descendingMap().values());

TreeSet<Integer> seatsLeft = new TreeSet<>(List.of(3, 7, 12, 18, 25));
System.out.println("first free seat after 10: " + seatsLeft.higher(10) + ", seats below 12: " + seatsLeft.headSet(12));`,
      table: [
        ["", "HashMap", "LinkedHashMap", "TreeMap"],
        ["Order", "None", "Insertion (or access)", "Sorted by key"],
        ["get/put", "O(1) avg", "O(1) avg", "O(log n)"],
        ["Range queries", "No", "No", "Yes (NavigableMap)"],
        ["Key requirements", "equals/hashCode", "equals/hashCode", "Comparable or Comparator (consistent with equals!)"],
        ["Null keys", "One allowed", "One allowed", "Not with natural ordering"]] },
    { title: "Special-purpose maps: EnumMap, IdentityHashMap, WeakHashMap",
      text: "Three lesser-known maps solve specific problems. **`EnumMap`** stores values in an array indexed by `ordinal()`: very fast, compact, ordered by enum declaration. **`IdentityHashMap`** compares keys with `==` and `System.identityHashCode` instead of `equals`/`hashCode`: for graph traversal, serialization or proxies where object identity matters. **`WeakHashMap`** holds keys **weakly**: an entry disappears after its key is no longer strongly reachable, useful for metadata attached to objects you don't own.",
      code: `enum Cabin { ECONOMY, PREMIUM, BUSINESS, FIRST }
EnumMap<Cabin, Integer> seats = new EnumMap<>(Cabin.class);
seats.put(Cabin.BUSINESS, 12); seats.put(Cabin.ECONOMY, 150); seats.put(Cabin.FIRST, 4);
System.out.println(seats + " " + EnumSet.complementOf(EnumSet.copyOf(seats.keySet())));

String a = new String("PNR"), b = new String("PNR");
Map<String, Integer> byEquals = new HashMap<>(), byIdentity = new IdentityHashMap<>();
byEquals.put(a, 1); byEquals.put(b, 2);
byIdentity.put(a, 1); byIdentity.put(b, 2);
System.out.println("HashMap size " + byEquals.size() + ", IdentityHashMap size " + byIdentity.size());

Map<Object, String> meta = new WeakHashMap<>();
Object session = new Object();
meta.put(session, "created 09:58");
session = null;                                            // drop the only strong reference
for (int i = 0; i < 5 && !meta.isEmpty(); i++) { System.gc(); Thread.sleep(50); }
System.out.println("WeakHashMap after GC: " + meta.size() + " entries (usually 0)");`,
      points: ["Use `EnumMap`/`EnumSet` whenever keys are enums: clearer and faster than `HashMap`", "`WeakHashMap` is **not** a cache: entries vanish on any GC once the key is unreachable; values that reference their keys keep them alive forever (leak)", "String literal keys never disappear from a `WeakHashMap` (they're pooled)"] },
    { title: "Nulls, ordering and immutability across maps and sets",
      text: "Interviewers like the edge cases. Know which collections accept `null`, which keep order, and which are immutable.",
      table: [
        ["Type", "Null keys/elements", "Null values", "Iteration order", "Thread-safe"],
        ["`HashMap` / `HashSet`", "One", "Yes", "Unspecified", "No"],
        ["`LinkedHashMap` / `LinkedHashSet`", "One", "Yes", "Insertion / access", "No"],
        ["`TreeMap` / `TreeSet`", "No (natural order)", "Yes", "Sorted", "No"],
        ["`EnumMap`", "No", "Yes", "Enum order", "No"],
        ["`ConcurrentHashMap`", "**No**", "**No**", "Unspecified", "Yes (J09)"],
        ["`Hashtable` (legacy)", "No", "No", "Unspecified", "Yes (synchronized)"],
        ["`Map.of` / `Map.copyOf` / `Set.of`", "No", "No", "Randomised per run", "Immutable"]],
      code: `Map<String, Integer> fixed = Map.of("DEL", 1, "BOM", 2);                 // up to 10 pairs
Map<String, Integer> many = Map.ofEntries(Map.entry("BLR", 3), Map.entry("GOI", 4));
for (Runnable r : List.<Runnable>of(() -> fixed.put("X", 9), () -> Map.of("DEL", 1, "DEL", 2), () -> new TreeMap<String, Integer>().put(null, 1)))
    try { r.run(); } catch (RuntimeException e) { System.out.println(e.getClass().getSimpleName()); }
System.out.println(many.get("GOI") + " " + new HashMap<>(fixed).getOrDefault("PNQ", 0));`,
      points: ["`Hashtable` and `Vector` are legacy synchronized classes; don't use them in new code"] },
    { title: "Complexity summary and how to choose",
      text: "Pick the structure from the questions you'll ask it. Equality lookups → hash-based. Ordering by insertion → linked variants. Sorted order, \"nearest\", ranges → tree-based. Enum keys → `EnumMap`/`EnumSet`. Shared between threads → `ConcurrentHashMap` / concurrent skip lists (J09).",
      table: [
        ["Operation", "HashMap/Set", "LinkedHashMap/Set", "TreeMap/Set", "EnumMap/Set"],
        ["get / contains", "O(1) avg", "O(1) avg", "O(log n)", "O(1)"],
        ["put / add", "O(1) avg (amortised)", "O(1) avg", "O(log n)", "O(1)"],
        ["remove", "O(1) avg", "O(1) avg", "O(log n)", "O(1)"],
        ["Iterate all", "O(capacity + n)", "O(n)", "O(n) sorted", "O(universe)"],
        ["min / max / floor / ceiling", "O(n)", "O(n) (first/last O(1))", "O(log n)", "O(universe)"],
        ["Memory per entry", "~32–48 bytes", "~40–56 bytes", "~40–56 bytes", "array slot"]],
      code: `record Slot(LocalTime start, String gate) {}
List<Slot> slots = List.of(new Slot(LocalTime.of(9, 0), "A1"), new Slot(LocalTime.of(7, 30), "B4"), new Slot(LocalTime.of(12, 15), "A3"));

Map<String, Slot> byGate = new HashMap<>();                      // "which slot is at gate A3?"
TreeMap<LocalTime, Slot> byTime = new TreeMap<>();               // "what's the next slot after 8:00?"
for (Slot s : slots) { byGate.put(s.gate(), s); byTime.put(s.start(), s); }
System.out.println(byGate.get("A3").start() + " | next after 08:00: " + byTime.ceilingEntry(LocalTime.of(8, 0)).getValue().gate());`,
      points: ["It's normal to keep two indexes (maps) over the same objects for two access patterns", "HashMap iteration cost depends on capacity, so a huge, mostly-empty map iterates slowly"] }
  ];

  H.registerLesson({
    code: "J08",
    summary: "Maps and sets from the inside: `HashMap`'s bucket array and nodes, the exact put/get algorithm (hash spreading, `hash & (n-1)`, equals checks), load factor, doubling resize with the lo/hi split and correct pre-sizing (`HashMap.newHashMap`), collisions and treeification (8 / 64 / 6), the compound Map API (`merge`, `computeIfAbsent`…), `HashSet`/`LinkedHashSet` as maps in disguise, `LinkedHashMap` access order and LRU caches, `TreeMap`/`TreeSet` navigation (floor, ceiling, head/tail/subMap), `EnumMap`, `IdentityHashMap`, `WeakHashMap`, null and ordering rules, and how to choose.",
    slides: SLIDES,
    widget: { heading: "Interactive: watch a HashMap fill, collide and resize", caption: "Put airport codes into new HashMap<>(4) and watch the buckets, chains, threshold and resizes. The index and split rules match java.util.HashMap (checked against the real class with Java 21).", render: mapWidget },
    examplesHeading: "Where maps and sets show up at work",
    examples: [
      ["Aggregations", "Counting events per route or customer: `counts.merge(key, 1, Integer::sum)`; grouping into lists with `computeIfAbsent` (or streams' `groupingBy`, J11)."],
      ["Lookup tables", "Loading reference data (airports, currencies) into a pre-sized `HashMap` or `EnumMap` at startup for O(1) lookups."],
      ["LRU caches", "Small per-process caches with `LinkedHashMap(accessOrder = true)` + `removeEldestEntry`; Caffeine for anything concurrent (S11)."],
      ["Time-based routing", "`TreeMap<LocalTime, Slot>` for \"next available slot\" with `ceilingEntry`; `TreeMap<Integer, Tier>` for price or score bands with `floorEntry`."],
      ["Deduplication", "`LinkedHashSet` to dedupe while keeping first-seen order (e.g. recent searches)."],
      ["Security", "Hash-flooding attacks on parameter maps were the reason for Java 8's tree bins and servers' parameter limits."]
    ],
    pitfalls: [
      "Mutable keys or keys with broken `equals`/`hashCode` (J04)",
      "`new HashMap<>(n)` thinking it fits n entries without resize (use `HashMap.newHashMap(n)`)",
      "Relying on `HashMap`/`HashSet`/`Set.of` iteration order",
      "`get(k) == null` to test presence when null values are possible",
      "Iterating `keySet()` and calling `get` for each key instead of `entrySet()`",
      "A `TreeMap` comparator inconsistent with equals (entries merge)",
      "Modifying a map inside `compute`/`merge` callbacks",
      "Using `WeakHashMap` as a cache",
      "Using `Hashtable` in new code"
    ],
    quiz: [
      { q: "How does HashMap compute the bucket index?", options: ["hashCode() % n", "(h ^ (h >>> 16)) & (n - 1)", "Random", "key.toString().length()"], answer: 1, why: "Spread the high bits, mask with power-of-two capacity minus one." },
      { q: "Default capacity and load factor of HashMap?", options: ["10 and 1.0", "16 and 0.75", "8 and 0.5", "32 and 0.75"], answer: 1, why: "Threshold 12." },
      { q: "When does a bucket become a red-black tree?", options: ["Never", "When it has ≥ 8 nodes and the table has ≥ 64 buckets", "On every collision", "When size > threshold"], answer: 1, why: "Otherwise the table resizes first." },
      { q: "During a resize from 16 to 32, a node at index 5 moves to…", options: ["Any index", "5 or 21, decided by hash & 16", "10", "0"], answer: 1, why: "One extra bit decides lo or hi." },
      { q: "How is HashSet implemented?", options: ["A sorted array", "A HashMap with a dummy value", "A red-black tree", "A linked list"], answer: 1, why: "add(e) is map.put(e, PRESENT) == null." },
      { q: "Which collection gives the greatest key ≤ x in O(log n)?", options: ["HashMap", "LinkedHashMap", "TreeMap (floorKey)", "EnumMap"], answer: 2, why: "NavigableMap." },
      { q: "LRU cache with LinkedHashMap requires…", options: ["accessOrder = true and removeEldestEntry", "insertion order only", "A TreeMap", "synchronized"], answer: 0, why: "Access order moves touched entries to the tail." },
      { q: "Which map allows a null key?", options: ["TreeMap (natural order)", "ConcurrentHashMap", "HashMap", "Map.of"], answer: 2, why: "One null key in bucket 0." },
      { q: "IdentityHashMap compares keys using…", options: ["equals", "compareTo", "==", "toString"], answer: 2, why: "And System.identityHashCode." }
    ],
    cheatsheet: {
      table: [
        ["Concept", "Detail"],
        ["Index", "`(h ^ h >>> 16) & (n - 1)`; n power of 2"],
        ["Resize", "size > 0.75n → 2n; nodes stay at i or move to i + oldCap"],
        ["Treeify", "Chain ≥ 8 and n ≥ 64; untreeify ≤ 6"],
        ["Pre-size", "`HashMap.newHashMap(expected)` (Java 19+)"],
        ["Idioms", "`merge(k,1,Integer::sum)`, `computeIfAbsent(k, x -> new ArrayList<>())`"],
        ["LRU", "`LinkedHashMap(16, .75f, true)` + `removeEldestEntry`"],
        ["Sorted / ranges", "TreeMap: floor, ceiling, head/tail/subMap"],
        ["Enum keys", "EnumMap / EnumSet"]],
      cards: [
        { title: "Navigable cheats", items: ["floor ≤", "ceiling ≥", "lower <", "higher >", "headMap(to) / tailMap(from)", "pollFirstEntry"] },
        { title: "Nulls", items: ["HashMap: 1 null key", "TreeMap: no null key (natural)", "CHM: no nulls at all", "Map.of: no nulls"] },
        { title: "Say in interviews", items: ["Average O(1), worst O(log n) since Java 8", "Power-of-two masking", "Treeification vs hash flooding", "HashSet = HashMap", "Choose by query pattern"] }]
    },
    practice: [
      { level: "Easy", q: "Explain how `HashMap.put` works internally.",
        steps: ["Compute `hash = key == null ? 0 : (h = key.hashCode()) ^ (h >>> 16)` to mix high bits into the low bits.",
          "If the table is null/empty, allocate it (default 16).",
          "Index `i = (n - 1) & hash`. Empty bucket → place a new `Node`.",
          "Otherwise walk the bucket: if a node has the same hash and (same reference or `equals`), replace its value and return the old one.",
          "If not found, append a new node (or insert into the tree bin). If the chain reaches 8, treeify (or resize if the table is < 64).",
          "Increment `size` and `modCount`; if `size > threshold`, resize (double, split chains).",
          "Return `null` (no previous value)."] },
      { level: "Easy", q: "HashMap vs LinkedHashMap vs TreeMap: when do you use each?",
        a: ["**HashMap**: fastest general-purpose map (O(1) average), no ordering guarantees.",
          "**LinkedHashMap**: same lookups plus predictable iteration (insertion order) or access order for LRU; a bit more memory.",
          "**TreeMap**: sorted keys, O(log n) operations, and navigation (floor/ceiling/ranges); keys must be Comparable or you pass a Comparator.",
          "Example: request counts per endpoint (HashMap), recent searches display (LinkedHashMap), price bands or next departure (TreeMap)."] },
      { level: "Easy", q: "Find the first non-repeating character in a string using a map.",
        code: `static Optional<Character> firstUnique(String s) {
    Map<Character, Integer> counts = new LinkedHashMap<>();          // keeps first-seen order
    for (char c : s.toCharArray()) counts.merge(c, 1, Integer::sum);
    return counts.entrySet().stream().filter(e -> e.getValue() == 1).map(Map.Entry::getKey).findFirst();
}

System.out.println(firstUnique("swiss") + " " + firstUnique("aabb") + " " + firstUnique("DEEPAK"));`,
        a: ["Count with `merge` in a `LinkedHashMap` so the second pass sees characters in first-occurrence order.",
          "Two passes, O(n) time, O(alphabet) space.",
          "With a plain `HashMap` you'd need a second pass over the string instead of over the map."] },
      { level: "Medium", q: "Group words by anagram (e.g. [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]).",
        code: `static Collection<List<String>> groupAnagrams(List<String> words) {
    Map<String, List<String>> groups = new LinkedHashMap<>();
    for (String w : words) {
        char[] cs = w.toCharArray();
        Arrays.sort(cs);
        groups.computeIfAbsent(new String(cs), k -> new ArrayList<>()).add(w);   // sorted letters = key
    }
    return groups.values();
}

System.out.println(groupAnagrams(List.of("eat", "tea", "tan", "ate", "nat", "bat")));`,
        a: ["Canonical key: the word's letters sorted (or a 26-int count signature for O(L) keys).",
          "`computeIfAbsent(key, k -> new ArrayList<>()).add(word)` builds a multimap in one line.",
          "O(n · L log L) time with sorting; `LinkedHashMap` keeps groups in first-seen order."] },
      { level: "Medium", q: "Why is HashMap capacity always a power of two? What happens if you pass 100?",
        a: ["With n = 2^k, `hash & (n - 1)` keeps the low k bits: a fast index computation (no division or modulo).",
          "Resizing to 2n means each node's new index is either the same or `+ oldCap`, determined by a single bit: chains split in one pass without recomputing hashCode.",
          "Because only low bits are used, `hash()` XORs the high 16 bits into the low ones so keys differing only in high bits don't all collide.",
          "`new HashMap<>(100)` rounds the capacity up to **128** (`tableSizeFor`); threshold 96, so 100 entries still trigger one resize. `HashMap.newHashMap(100)` picks 256 to avoid it."] },
      { level: "Medium", q: "Implement an LRU cache from scratch with O(1) get and put (no LinkedHashMap).",
        code: `final class Lru<K, V> {
    private final class Node { K k; V v; Node prev, next; Node(K k, V v) { this.k = k; this.v = v; } }
    private final Map<K, Node> map = new HashMap<>();
    private final Node head = new Node(null, null), tail = new Node(null, null);   // sentinels
    private final int capacity;
    Lru(int capacity) { this.capacity = capacity; head.next = tail; tail.prev = head; }
    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addLast(Node n) { n.prev = tail.prev; n.next = tail; tail.prev.next = n; tail.prev = n; }
    V get(K k) { Node n = map.get(k); if (n == null) return null; unlink(n); addLast(n); return n.v; }
    void put(K k, V v) {
        Node n = map.get(k);
        if (n != null) { n.v = v; unlink(n); addLast(n); return; }
        if (map.size() == capacity) { Node eldest = head.next; unlink(eldest); map.remove(eldest.k); }
        n = new Node(k, v); map.put(k, n); addLast(n);
    }
    @Override public String toString() { StringBuilder sb = new StringBuilder(); for (Node n = head.next; n != tail; n = n.next) sb.append(n.k).append(' '); return sb.toString().strip(); }
}

Lru<String, Integer> lru = new Lru<>(2);
lru.put("DEL", 1); lru.put("BOM", 2); lru.get("DEL"); lru.put("BLR", 3);
System.out.println(lru + " | BOM=" + lru.get("BOM"));`,
        a: ["HashMap from key to node gives O(1) lookup; a doubly linked list (with head/tail sentinels) gives O(1) move-to-end and evict-from-front.",
          "`get`: find node, move to tail. `put`: update+move, or evict the head's next when full, then append.",
          "This is exactly what `LinkedHashMap` with access order does internally; LLD covers the thread-safe version."] },
      { level: "Medium", q: "Meeting-room style: given bookings as [start, end) times, answer \"is slot X free?\" and \"next free start ≥ t\" efficiently.",
        code: `final class Calendar {
    private final TreeMap<Integer, Integer> bookings = new TreeMap<>();     // start → end, non-overlapping
    boolean book(int start, int end) {
        Map.Entry<Integer, Integer> before = bookings.floorEntry(start);
        Integer after = bookings.ceilingKey(start);
        if (before != null && before.getValue() > start) return false;      // previous booking still running
        if (after != null && after < end) return false;                     // next booking starts too early
        bookings.put(start, end);
        return true;
    }
    int nextFree(int t) {
        Map.Entry<Integer, Integer> e = bookings.floorEntry(t);
        while (e != null && e.getValue() > t) { t = e.getValue(); e = bookings.floorEntry(t); }
        return t;
    }
}

Calendar room = new Calendar();
System.out.println(room.book(9, 10) + " " + room.book(10, 12) + " " + room.book(11, 13) + " " + room.book(13, 14));
System.out.println("next free from 9: " + room.nextFree(9));`,
        a: ["Store non-overlapping intervals in a `TreeMap<start, end>`; overlap checks need only the neighbours: `floorEntry(start)` and `ceilingKey(start)`.",
          "Each booking O(log n); `nextFree` hops across adjacent bookings.",
          "Hash maps can't answer \"nearest key\" questions; that's the point of NavigableMap."] },
      { level: "Hard", q: "Why can a HashMap degrade, and what did Java 8 change? How would you defend a public API against hash flooding?",
        a: ["If many keys share a bucket (bad `hashCode`, or crafted inputs like the `Aa`/`BB` family for `String`), each lookup walks a long chain: O(n), and inserting n keys is O(n²): a CPU denial of service.",
          "Java 8 converts long chains (≥ 8, table ≥ 64) into red-black trees, bounding lookups at O(log n); for `Comparable` keys like String the tree orders colliding keys efficiently.",
          "Defences: cap the number of parameters/headers/JSON fields per request (Tomcat `maxParameterCount`, Jackson stream read constraints), limit request sizes, and don't use attacker-controlled data as keys in unbounded maps.",
          "Other languages randomise string hashing per process; Java can't change `String.hashCode` (it's specified), hence the tree approach."] },
      { level: "Hard", q: "Compare memory and speed of `HashMap<Integer, Integer>`, `TreeMap<Integer, Integer>` and a sorted `int[]` for 1M read-mostly entries.",
        a: ["HashMap: ≈ 32 bytes/Node + 16-byte Integer keys/values (+ table slot) ≈ 70 MB; O(1) average lookups with pointer chasing.",
          "TreeMap: ≈ 40 bytes/Entry (left, right, parent, colour) + boxes ≈ 75 MB; O(log n) ≈ 20 comparisons with cache misses per lookup; supports ranges.",
          "Two sorted `int[]` arrays (keys and values) ≈ 8 MB; binary search O(log n) with good locality; no boxing; ideal for read-mostly data loaded once.",
          "Primitive hash maps (fastutil/Eclipse Collections) ≈ 16 MB with O(1) lookups.",
          "Pick by access pattern and update rate; measure with JMH and a heap histogram (`jcmd GC.class_histogram`)."] },
      { level: "Hard", q: "Design a \"time-based key-value store\": `set(key, value, timestamp)` and `get(key, timestamp)` returns the value with the largest timestamp ≤ the given one.",
        code: `final class TimeMap {
    private final Map<String, TreeMap<Long, String>> store = new HashMap<>();
    void set(String key, String value, long ts) { store.computeIfAbsent(key, k -> new TreeMap<>()).put(ts, value); }
    String get(String key, long ts) {
        TreeMap<Long, String> versions = store.get(key);
        if (versions == null) return "";
        Map.Entry<Long, String> e = versions.floorEntry(ts);
        return e == null ? "" : e.getValue();
    }
}

TimeMap fares = new TimeMap();
fares.set("DEL-BLR", "₹4850", 100); fares.set("DEL-BLR", "₹5300", 200);
System.out.println(fares.get("DEL-BLR", 50) + "|" + fares.get("DEL-BLR", 150) + "|" + fares.get("DEL-BLR", 999));`,
        a: ["Outer `HashMap` by key (O(1)); inner `TreeMap` by timestamp so `floorEntry(ts)` finds the latest version ≤ ts in O(log v).",
          "If timestamps arrive in increasing order, an `ArrayList` per key with binary search is more compact.",
          "Real systems: this is MVCC-like versioning (databases, config history, price history at booking time)."] }
    ],
    recap: [
      "HashMap = power-of-two array of buckets; index `(h ^ h >>> 16) & (n-1)`; chains compare hash, reference, then equals.",
      "Resize at size > 0.75 × capacity: double and split each chain into stay / move-by-oldCap; pre-size with `HashMap.newHashMap(n)`.",
      "Long chains (≥ 8, table ≥ 64) become red-black trees: worst case O(log n) instead of O(n).",
      "HashSet/LinkedHashSet/TreeSet wrap the matching maps; LinkedHashMap gives insertion or access order (LRU); TreeMap gives sorted, navigable O(log n) operations.",
      "Know the compound Map API, null rules, EnumMap/IdentityHashMap/WeakHashMap, and choose by query pattern."
    ]
  });
})();
