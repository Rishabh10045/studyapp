/* Lesson J11: Streams API: pipelines, collectors, parallel streams */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Traces recorded from Java 21 with peek() between stages, for all 16 stage combinations
  var TRACES = {"0": {"log": ["source → DEL 5300", "toList ← DEL 5300", "source → BOM 3200", "toList ← BOM 3200", "source → BLR 4850", "toList ← BLR 4850", "source → MAA 6100", "toList ← MAA 6100", "source → GOI 2900", "toList ← GOI 2900", "source → CCU 4400", "toList ← CCU 4400"], "res": "[DEL 5300, BOM 3200, BLR 4850, MAA 6100, GOI 2900, CCU 4400]"}, "1": {"log": ["source → DEL 5300", "filter(DEL 5300) ✗ drop", "source → BOM 3200", "filter(BOM 3200) ✓ pass", "toList ← BOM 3200", "source → BLR 4850", "filter(BLR 4850) ✓ pass", "toList ← BLR 4850", "source → MAA 6100", "filter(MAA 6100) ✗ drop", "source → GOI 2900", "filter(GOI 2900) ✓ pass", "toList ← GOI 2900", "source → CCU 4400", "filter(CCU 4400) ✓ pass", "toList ← CCU 4400"], "res": "[BOM 3200, BLR 4850, GOI 2900, CCU 4400]"}, "2": {"log": ["source → DEL 5300", "map(DEL 5300) → DEL 5565", "toList ← DEL 5565", "source → BOM 3200", "map(BOM 3200) → BOM 3360", "toList ← BOM 3360", "source → BLR 4850", "map(BLR 4850) → BLR 5092", "toList ← BLR 5092", "source → MAA 6100", "map(MAA 6100) → MAA 6405", "toList ← MAA 6405", "source → GOI 2900", "map(GOI 2900) → GOI 3045", "toList ← GOI 3045", "source → CCU 4400", "map(CCU 4400) → CCU 4620", "toList ← CCU 4620"], "res": "[DEL 5565, BOM 3360, BLR 5092, MAA 6405, GOI 3045, CCU 4620]"}, "3": {"log": ["source → DEL 5300", "filter(DEL 5300) ✗ drop", "source → BOM 3200", "filter(BOM 3200) ✓ pass", "map(BOM 3200) → BOM 3360", "toList ← BOM 3360", "source → BLR 4850", "filter(BLR 4850) ✓ pass", "map(BLR 4850) → BLR 5092", "toList ← BLR 5092", "source → MAA 6100", "filter(MAA 6100) ✗ drop", "source → GOI 2900", "filter(GOI 2900) ✓ pass", "map(GOI 2900) → GOI 3045", "toList ← GOI 3045", "source → CCU 4400", "filter(CCU 4400) ✓ pass", "map(CCU 4400) → CCU 4620", "toList ← CCU 4620"], "res": "[BOM 3360, BLR 5092, GOI 3045, CCU 4620]"}, "4": {"log": ["source → DEL 5300", "source → BOM 3200", "source → BLR 4850", "source → MAA 6100", "source → GOI 2900", "source → CCU 4400", "sorted emits GOI 2900", "toList ← GOI 2900", "sorted emits BOM 3200", "toList ← BOM 3200", "sorted emits CCU 4400", "toList ← CCU 4400", "sorted emits BLR 4850", "toList ← BLR 4850", "sorted emits DEL 5300", "toList ← DEL 5300", "sorted emits MAA 6100", "toList ← MAA 6100"], "res": "[GOI 2900, BOM 3200, CCU 4400, BLR 4850, DEL 5300, MAA 6100]"}, "5": {"log": ["source → DEL 5300", "filter(DEL 5300) ✗ drop", "source → BOM 3200", "filter(BOM 3200) ✓ pass", "source → BLR 4850", "filter(BLR 4850) ✓ pass", "source → MAA 6100", "filter(MAA 6100) ✗ drop", "source → GOI 2900", "filter(GOI 2900) ✓ pass", "source → CCU 4400", "filter(CCU 4400) ✓ pass", "sorted emits GOI 2900", "toList ← GOI 2900", "sorted emits BOM 3200", "toList ← BOM 3200", "sorted emits CCU 4400", "toList ← CCU 4400", "sorted emits BLR 4850", "toList ← BLR 4850"], "res": "[GOI 2900, BOM 3200, CCU 4400, BLR 4850]"}, "6": {"log": ["source → DEL 5300", "map(DEL 5300) → DEL 5565", "source → BOM 3200", "map(BOM 3200) → BOM 3360", "source → BLR 4850", "map(BLR 4850) → BLR 5092", "source → MAA 6100", "map(MAA 6100) → MAA 6405", "source → GOI 2900", "map(GOI 2900) → GOI 3045", "source → CCU 4400", "map(CCU 4400) → CCU 4620", "sorted emits GOI 3045", "toList ← GOI 3045", "sorted emits BOM 3360", "toList ← BOM 3360", "sorted emits CCU 4620", "toList ← CCU 4620", "sorted emits BLR 5092", "toList ← BLR 5092", "sorted emits DEL 5565", "toList ← DEL 5565", "sorted emits MAA 6405", "toList ← MAA 6405"], "res": "[GOI 3045, BOM 3360, CCU 4620, BLR 5092, DEL 5565, MAA 6405]"}, "7": {"log": ["source → DEL 5300", "filter(DEL 5300) ✗ drop", "source → BOM 3200", "filter(BOM 3200) ✓ pass", "map(BOM 3200) → BOM 3360", "source → BLR 4850", "filter(BLR 4850) ✓ pass", "map(BLR 4850) → BLR 5092", "source → MAA 6100", "filter(MAA 6100) ✗ drop", "source → GOI 2900", "filter(GOI 2900) ✓ pass", "map(GOI 2900) → GOI 3045", "source → CCU 4400", "filter(CCU 4400) ✓ pass", "map(CCU 4400) → CCU 4620", "sorted emits GOI 3045", "toList ← GOI 3045", "sorted emits BOM 3360", "toList ← BOM 3360", "sorted emits CCU 4620", "toList ← CCU 4620", "sorted emits BLR 5092", "toList ← BLR 5092"], "res": "[GOI 3045, BOM 3360, CCU 4620, BLR 5092]"}, "8": {"log": ["source → DEL 5300", "toList ← DEL 5300", "source → BOM 3200", "toList ← BOM 3200"], "res": "[DEL 5300, BOM 3200]"}, "9": {"log": ["source → DEL 5300", "filter(DEL 5300) ✗ drop", "source → BOM 3200", "filter(BOM 3200) ✓ pass", "toList ← BOM 3200", "source → BLR 4850", "filter(BLR 4850) ✓ pass", "toList ← BLR 4850"], "res": "[BOM 3200, BLR 4850]"}, "10": {"log": ["source → DEL 5300", "map(DEL 5300) → DEL 5565", "toList ← DEL 5565", "source → BOM 3200", "map(BOM 3200) → BOM 3360", "toList ← BOM 3360"], "res": "[DEL 5565, BOM 3360]"}, "11": {"log": ["source → DEL 5300", "filter(DEL 5300) ✗ drop", "source → BOM 3200", "filter(BOM 3200) ✓ pass", "map(BOM 3200) → BOM 3360", "toList ← BOM 3360", "source → BLR 4850", "filter(BLR 4850) ✓ pass", "map(BLR 4850) → BLR 5092", "toList ← BLR 5092"], "res": "[BOM 3360, BLR 5092]"}, "12": {"log": ["source → DEL 5300", "source → BOM 3200", "source → BLR 4850", "source → MAA 6100", "source → GOI 2900", "source → CCU 4400", "sorted emits GOI 2900", "toList ← GOI 2900", "sorted emits BOM 3200", "toList ← BOM 3200"], "res": "[GOI 2900, BOM 3200]"}, "13": {"log": ["source → DEL 5300", "filter(DEL 5300) ✗ drop", "source → BOM 3200", "filter(BOM 3200) ✓ pass", "source → BLR 4850", "filter(BLR 4850) ✓ pass", "source → MAA 6100", "filter(MAA 6100) ✗ drop", "source → GOI 2900", "filter(GOI 2900) ✓ pass", "source → CCU 4400", "filter(CCU 4400) ✓ pass", "sorted emits GOI 2900", "toList ← GOI 2900", "sorted emits BOM 3200", "toList ← BOM 3200"], "res": "[GOI 2900, BOM 3200]"}, "14": {"log": ["source → DEL 5300", "map(DEL 5300) → DEL 5565", "source → BOM 3200", "map(BOM 3200) → BOM 3360", "source → BLR 4850", "map(BLR 4850) → BLR 5092", "source → MAA 6100", "map(MAA 6100) → MAA 6405", "source → GOI 2900", "map(GOI 2900) → GOI 3045", "source → CCU 4400", "map(CCU 4400) → CCU 4620", "sorted emits GOI 3045", "toList ← GOI 3045", "sorted emits BOM 3360", "toList ← BOM 3360"], "res": "[GOI 3045, BOM 3360]"}, "15": {"log": ["source → DEL 5300", "filter(DEL 5300) ✗ drop", "source → BOM 3200", "filter(BOM 3200) ✓ pass", "map(BOM 3200) → BOM 3360", "source → BLR 4850", "filter(BLR 4850) ✓ pass", "map(BLR 4850) → BLR 5092", "source → MAA 6100", "filter(MAA 6100) ✗ drop", "source → GOI 2900", "filter(GOI 2900) ✓ pass", "map(GOI 2900) → GOI 3045", "source → CCU 4400", "filter(CCU 4400) ✓ pass", "map(CCU 4400) → CCU 4620", "sorted emits GOI 3045", "toList ← GOI 3045", "sorted emits BOM 3360", "toList ← BOM 3360"], "res": "[GOI 3045, BOM 3360]"}};
  var STAGES = [["f", "filter(fare < 5000)"], ["m", "map(add 5% tax)"], ["s", "sorted(by fare)"], ["l", "limit(2)"]];
  function streamWidget(el, ctx) {
    var s = ctx.state; if (!s.on) { s.on = { f: true, m: true, s: false, l: true }; s.step = 0; }
    el.innerHTML = "<p>" + ctx.md("Source: `List.of(\"DEL 5300\", \"BOM 3200\", \"BLR 4850\", \"MAA 6100\", \"GOI 2900\", \"CCU 4400\").stream()`. Toggle stages, then step through. Streams are **lazy** and process **one element at a time through the whole pipeline**; `sorted` is a **barrier** that must see everything first; `limit` **short-circuits** so later elements are never read.") + "</p>" +
      "<div class='btnrow' data-r='tg'>" + STAGES.map(function (x) { return "<label style='margin-right:12px'><input type='checkbox' data-k='" + x[0] + "'> <code>" + ctx.esc(x[1]) + "</code></label>"; }).join("") + "</div>" +
      "<div class='btnrow'><button type='button' class='btn primary' data-r='next'>next step</button><button type='button' class='btn' data-r='all'>run to end</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><pre class='code' data-r='log'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function key() { return (s.on.f ? 1 : 0) + (s.on.m ? 2 : 0) + (s.on.s ? 4 : 0) + (s.on.l ? 8 : 0); }
    function stageOf(line) { return /^source/.test(line) ? "src" : /^filter/.test(line) ? "f" : /^map/.test(line) ? "m" : /^sorted/.test(line) ? "s" : "t"; }
    function draw() {
      el.querySelectorAll("[data-k]").forEach(function (c) { c.checked = !!s.on[c.dataset.k]; });
      var T = TRACES[key()], n = T.log.length, shown = T.log.slice(0, s.step), cur = shown.length ? shown[shown.length - 1] : "", cs = cur ? stageOf(cur) : "";
      var nodes = [["src", "source"]].concat(STAGES.filter(function (x) { return s.on[x[0]]; }).map(function (x) { return [x[0], x[1]]; })).concat([["t", "toList()"]]);
      var L = ["flowchart LR"];
      nodes.forEach(function (nd, i) {
        var label = nd[1].replace(/"/g, "#quot;").replace(/</g, "#lt;");
        var hit = nd[0] === cs || (nd[0] === "l" && cs === "t");
        var item = hit ? "<br/><small>" + ctx.esc(cur.replace(/^.*?(→|←|emits) /, "").replace(/^(filter|map)\(([^)]*)\).*$/, "$2")) + "</small>" : "";
        L.push("  n" + i + "[\"" + label + item + "\"]:::" + (hit ? "s4" : nd[0] === "s" ? "s2" : "s1"));
        if (i) L.push("  n" + (i - 1) + " --> n" + i);
      });
      L.push("  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00,stroke-width:2px");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var pulled = shown.filter(function (x) { return /^source/.test(x); }).length, fc = shown.filter(function (x) { return /^filter/.test(x); }).length, mc = shown.filter(function (x) { return /^map/.test(x); }).length;
      var done = s.step >= n;
      q("res").innerHTML = ctx.md("Step " + Math.min(s.step, n) + " of " + n + ". Read from source: **" + pulled + "** of 6, `filter` calls: " + fc + ", `map` calls: " + mc + "." + (done ? " Result: `" + T.res + "`." + (s.on.l && !s.on.s && pulled < 6 ? " `limit(2)` stopped the pipeline: the remaining elements were **never read**." : "") + (s.on.s ? " `sorted` buffered every element before emitting anything" + (s.on.l ? ", so `limit` can't save the upstream work." : ".") : "") : ""));
      q("log").textContent = shown.length ? shown.join("\n") : "Nothing runs until the terminal operation (toList) pulls. Press next step.";
    }
    el.querySelectorAll("[data-k]").forEach(function (c) { c.addEventListener("change", function () { s.on[c.dataset.k] = c.checked; s.step = 0; ctx.save(); draw(); }); });
    q("next").addEventListener("click", function () { s.step = Math.min(s.step + 1, TRACES[key()].log.length); ctx.save(); draw(); });
    q("all").addEventListener("click", function () { s.step = TRACES[key()].log.length; ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.step = 0; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "What a stream is",
      text: "A `Stream<T>` is a **pipeline description**, not a data structure: a **source** (collection, array, generator, file), zero or more **intermediate operations** (`filter`, `map`, `sorted`…) that each return a new stream and do nothing yet, and one **terminal operation** (`toList`, `collect`, `count`, `forEach`…) that triggers the work and produces a result. A stream can be consumed **once**; it never modifies its source.",
      m: M(["flowchart LR",
        "  S[\"source<br/>bookings.stream()\"]:::s0 --> F[\"filter<br/>(lazy)\"]:::s1 --> MP[\"map<br/>(lazy)\"]:::s1 --> SO[\"sorted<br/>(lazy, stateful)\"]:::s1 --> T[\"toList()<br/>terminal: runs it\"]:::s2",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `record Booking(String pnr, String route, int fare, boolean cancelled) {}
List<Booking> bookings = List.of(new Booking("P1", "DEL-BLR", 4850, false), new Booking("P2", "BOM-GOI", 3200, true),
    new Booking("P3", "DEL-BOM", 5300, false), new Booking("P4", "DEL-BLR", 4100, false));

List<String> delhiPnrs = bookings.stream()            // source
    .filter(b -> !b.cancelled())                        // intermediate
    .filter(b -> b.route().startsWith("DEL"))
    .sorted(Comparator.comparingInt(Booking::fare))
    .map(Booking::pnr)
    .toList();                                          // terminal
System.out.println(delhiPnrs);

Stream<Booking> once = bookings.stream();
System.out.println(once.count());
try { once.count(); } catch (IllegalStateException e) { System.out.println("reuse: " + e.getMessage()); }`,
      analogy: "A stream is a recipe card for an assembly line. Writing the steps costs nothing; the line only starts when someone orders the finished product, and each order needs a fresh run." },
    { title: "Creating streams",
      text: "Most streams come from collections (`list.stream()`, `map.entrySet().stream()`), but there are many sources: `Stream.of`, `Arrays.stream`, `IntStream.range/rangeClosed`, `Stream.iterate(seed, hasNext, next)` (Java 9), `Stream.generate` (infinite: needs `limit`), `String.chars()`, `Files.lines(path)` (lazy; close it), `Pattern.splitAsStream`, `Stream.concat`, and `Optional.stream()`.",
      code: `System.out.println(Stream.of("DEL", "BOM").toList() + " " + Arrays.stream(new int[]{3, 1, 2}).sum());
System.out.println(IntStream.rangeClosed(1, 5).boxed().toList());
System.out.println(Stream.iterate(1, n -> n <= 100, n -> n * 3).toList());            // finite iterate
System.out.println(Stream.generate(() -> "seat").limit(3).toList());                   // infinite, cut with limit
System.out.println("DEL".chars().mapToObj(c -> (char) c).toList());
System.out.println(java.util.regex.Pattern.compile(",").splitAsStream("DEL,BOM,BLR").map(String::toLowerCase).toList());
System.out.println(Map.of("DEL", 4850).entrySet().stream().map(e -> e.getKey() + "=" + e.getValue()).toList());
System.out.println(Stream.concat(Stream.of(1, 2), Stream.of(3)).toList());

Path f = Files.createTempFile("routes", ".csv");
Files.write(f, List.of("route,fare", "DEL-BLR,4850", "BOM-GOI,3200"));
try (Stream<String> lines = Files.lines(f)) {                                          // I/O-backed: close it
    System.out.println(lines.skip(1).map(l -> l.split(",")[0]).toList());
}`,
      points: ["`Stream.of(array)` of an `int[]` gives a `Stream<int[]>`; use `Arrays.stream` or `IntStream.of`", "Streams from `Files.lines`/`Files.list`/`Files.walk` hold OS handles: use try-with-resources"] },
    { title: "Laziness, vertical processing and short-circuiting",
      text: "Nothing runs until the terminal operation pulls. Then each element travels **through the whole pipeline** before the next one is read (vertical, not stage-by-stage). That's what makes **short-circuiting** possible: `findFirst`, `anyMatch`, `limit`, `takeWhile` stop pulling once they have their answer, even on infinite streams. **Stateful** operations (`sorted`, and to a lesser degree `distinct`) break this: `sorted` must buffer the entire input before it emits anything.",
      code: `List<String> log = new ArrayList<>();
Stream<Integer> pipeline = Stream.of(5300, 3200, 4850, 6100, 2900)
    .peek(x -> log.add("read " + x))
    .filter(x -> x < 5000)
    .map(x -> x * 105 / 100);
System.out.println("built, log so far: " + log);                    // nothing ran
Optional<Integer> first = pipeline.findFirst();
System.out.println(first.get() + " " + log);                         // stopped after 3200

boolean any = Stream.iterate(1, n -> n + 1).anyMatch(n -> n * n > 50);   // infinite stream, terminates
System.out.println("any square > 50: " + any);

List<String> log2 = new ArrayList<>();
Stream.of(5300, 3200, 4850).peek(x -> log2.add("read " + x)).sorted().peek(x -> log2.add("emit " + x)).findFirst();
System.out.println(log2);                                            // sorted read everything first`,
      points: ["`peek` exists for debugging; don't rely on it for logic (it may be skipped, e.g. `count()` on a sized stream)", "The interactive model below lets you toggle stages and watch the exact order Java 21 used"] },
    { title: "The everyday intermediate operations",
      text: "`filter` keeps matching elements; `map` transforms one-to-one; `flatMap` maps each element to a stream and flattens (one-to-many); `mapMulti` (Java 16) does the same imperatively; `distinct` uses `equals`/`hashCode`; `sorted()` natural order or `sorted(comparator)`; `limit(n)`/`skip(n)`; `takeWhile`/`dropWhile` (Java 9) cut at the first element that fails the predicate (meaningful on ordered streams).",
      code: `record Itinerary(String pnr, List<String> legs) {}
List<Itinerary> its = List.of(new Itinerary("P1", List.of("DEL-BOM", "BOM-GOI")), new Itinerary("P2", List.of("BLR-DEL")),
    new Itinerary("P3", List.of("DEL-BOM", "BOM-BLR")));

System.out.println(its.stream().flatMap(i -> i.legs().stream()).distinct().sorted().toList());
System.out.println(its.stream().map(i -> i.legs().size()).toList());
System.out.println(its.stream().<String>mapMulti((i, sink) -> { for (String leg : i.legs()) if (leg.startsWith("DEL")) sink.accept(i.pnr() + ":" + leg); }).toList());

List<Integer> fares = List.of(2900, 3200, 4100, 5300, 3100, 6100);
System.out.println(fares.stream().skip(1).limit(3).toList());
System.out.println(fares.stream().takeWhile(f -> f < 5000).toList() + " vs filter " + fares.stream().filter(f -> f < 5000).toList());
System.out.println(fares.stream().dropWhile(f -> f < 5000).toList());`,
      analogy: "`map` relabels every parcel; `flatMap` opens each box and puts its items on the belt; `filter` is the inspector who removes some; `takeWhile` stops the belt at the first bad parcel." },
    { title: "Terminal operations",
      text: "Terminal operations produce a value or a side effect and close the stream. `toList()` (Java 16) returns an **unmodifiable** list; `collect(Collectors.toList())` currently returns an `ArrayList` but makes no promise. `count`, `min/max(comparator)`, `findFirst/findAny` return primitives or `Optional`s; `anyMatch/allMatch/noneMatch` short-circuit (`allMatch` on an empty stream is `true`); `forEach` is for side effects only; `toArray(String[]::new)` gives typed arrays.",
      code: `List<Integer> fares = List.of(4850, 3200, 5300, 2900, 6100);
List<Integer> cheap = fares.stream().filter(f -> f < 5000).toList();
try { cheap.add(1); } catch (UnsupportedOperationException e) { System.out.println("toList() is unmodifiable"); }
List<Integer> mutable = fares.stream().filter(f -> f < 5000).collect(Collectors.toCollection(ArrayList::new));
mutable.add(1);
System.out.println(cheap + " " + mutable);
System.out.println(fares.stream().count() + " " + fares.stream().max(Comparator.naturalOrder()).get() + " " + fares.stream().min(Integer::compare).get());
System.out.println(fares.stream().anyMatch(f -> f > 6000) + " " + fares.stream().allMatch(f -> f > 1000) + " " + fares.stream().noneMatch(f -> f < 0) + " " + Stream.<Integer>empty().allMatch(f -> f > 1_000_000));
String[] arr = Stream.of("DEL", "BOM").toArray(String[]::new);
System.out.println(arr.length + " " + fares.stream().filter(f -> f > 9000).findFirst());`,
      points: ["Prefer `toList()` unless you need to mutate the result", "`forEach` on a parallel stream runs in any order; `forEachOrdered` keeps encounter order"] },
    { title: "reduce: folding a stream into one value",
      text: "`reduce(identity, accumulator)` combines elements pairwise starting from the identity; `reduce(accumulator)` returns an `Optional` (empty stream); the three-argument form adds a **combiner** for parallel streams and for changing the result type. Requirements: the identity must truly be neutral (`0` for sum, `1` for product) and the operation must be **associative**, otherwise parallel results differ. For sums use `mapToInt(...).sum()`; for collections use `collect`, not `reduce` (reduce with mutable containers is a classic bug).",
      code: `List<Integer> fares = List.of(4850, 3200, 5300);
int total = fares.stream().reduce(0, Integer::sum);
Optional<Integer> max = fares.stream().reduce(Integer::max);
int chars = Stream.of("DEL", "BLR", "GOI").reduce(0, (acc, s) -> acc + s.length(), Integer::sum);    // T → int with combiner
System.out.println(total + " " + max.get() + " " + chars + " " + Stream.<Integer>empty().reduce(Integer::sum));

int seq = IntStream.rangeClosed(1, 4).boxed().reduce(10, Integer::sum);                  // 10 is NOT an identity for +
int par = IntStream.rangeClosed(1, 4).boxed().parallel().reduce(10, Integer::sum);
System.out.println("sequential " + seq + ", parallel " + par + " (identity applied per chunk)");
int seqMinus = IntStream.rangeClosed(1, 4).boxed().reduce(0, (a, b) -> a - b);
int parMinus = IntStream.rangeClosed(1, 4).boxed().parallel().reduce(0, (a, b) -> a - b);
System.out.println("minus is not associative: " + seqMinus + " vs " + parMinus);` },
    { title: "Collectors I: toMap, joining, toSet, toCollection",
      text: "`collect` uses a mutable reduction: a `Collector` describes supplier, accumulator, combiner and finisher. `Collectors.toMap(keyFn, valueFn)` throws `IllegalStateException` on a **duplicate key**; pass a merge function to resolve it and a map supplier to choose the map type. `joining(sep, prefix, suffix)` concatenates strings; `toSet`, `toCollection(TreeSet::new)`, `toUnmodifiableList/Map` cover the rest.",
      code: `record Fare(String route, String airline, int amount) {}
List<Fare> fares = List.of(new Fare("DEL-BLR", "6E", 4850), new Fare("DEL-BLR", "AI", 5300), new Fare("BOM-GOI", "6E", 3200));

try { fares.stream().collect(Collectors.toMap(Fare::route, Fare::amount)); }
catch (IllegalStateException e) { System.out.println(e.getMessage()); }

Map<String, Integer> cheapest = fares.stream().collect(Collectors.toMap(Fare::route, Fare::amount, Math::min, TreeMap::new));
System.out.println(cheapest);
System.out.println(fares.stream().map(Fare::airline).distinct().collect(Collectors.joining(", ", "[", "]")));
TreeSet<String> routes = fares.stream().map(Fare::route).collect(Collectors.toCollection(TreeSet::new));
System.out.println(routes);
Map<String, Fare> byKey = fares.stream().collect(Collectors.toMap(f -> f.route() + "/" + f.airline(), Function.identity()));
System.out.println(byKey.keySet().stream().sorted().toList());`,
      points: ["`toMap` also throws `NullPointerException` for null values (it uses `merge` internally)"] },
    { title: "Collectors II: groupingBy, partitioningBy, downstream collectors",
      text: "`groupingBy(classifier)` builds `Map<K, List<T>>`; the real power is the **downstream collector**: `counting()`, `summingInt`, `averagingInt`, `mapping(fn, toSet())`, `maxBy(cmp)`, `toMap`, even another `groupingBy` for nested maps. Pass a map factory (`TreeMap::new`) for sorted keys. `partitioningBy(predicate)` always returns both `true` and `false` keys. `collectingAndThen` post-processes; `teeing` (Java 12) runs two collectors and merges their results.",
      m: M(["flowchart LR",
        "  S[\"Stream#lt;Booking#gt;\"]:::s0 --> G[\"groupingBy(route)\"]:::s1",
        "  G --> K1[\"DEL-BLR → downstream\"]:::s2",
        "  G --> K2[\"BOM-GOI → downstream\"]:::s2",
        "  K1 --> D[\"counting() / summingInt / mapping / maxBy\"]:::s4",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `record Booking(String route, String airline, int fare, int pax) {}
List<Booking> bs = List.of(new Booking("DEL-BLR", "6E", 4850, 2), new Booking("DEL-BLR", "AI", 5300, 1),
    new Booking("BOM-GOI", "6E", 3200, 4), new Booking("DEL-BLR", "6E", 4600, 3), new Booking("BOM-GOI", "UK", 3900, 1));

Map<String, Long> count = bs.stream().collect(Collectors.groupingBy(Booking::route, TreeMap::new, Collectors.counting()));
Map<String, Integer> pax = bs.stream().collect(Collectors.groupingBy(Booking::route, TreeMap::new, Collectors.summingInt(Booking::pax)));
Map<String, TreeSet<String>> airlines = bs.stream().collect(Collectors.groupingBy(Booking::route, TreeMap::new,
    Collectors.mapping(Booking::airline, Collectors.toCollection(TreeSet::new))));
Map<String, String> cheapestAirline = bs.stream().collect(Collectors.groupingBy(Booking::route, TreeMap::new,
    Collectors.collectingAndThen(Collectors.minBy(Comparator.comparingInt(Booking::fare)), o -> o.get().airline())));
Map<String, Map<String, Long>> nested = bs.stream().collect(Collectors.groupingBy(Booking::route, TreeMap::new,
    Collectors.groupingBy(Booking::airline, TreeMap::new, Collectors.counting())));
Map<Boolean, Long> cheapOrNot = bs.stream().collect(Collectors.partitioningBy(b -> b.fare() < 4000, Collectors.counting()));
String summary = bs.stream().collect(Collectors.teeing(Collectors.summingInt(Booking::pax), Collectors.averagingInt(Booking::fare),
    (p, avg) -> p + " pax, avg fare " + Math.round(avg)));
System.out.println(count + " " + pax);
System.out.println(airlines + " " + cheapestAirline);
System.out.println(nested + " " + cheapOrNot + " " + summary);`,
      points: ["Interview favourite: \"group by X and count\" = `groupingBy(X, counting())`", "Nested downstreams read inside-out: mapping, then toSet, per group"] },
    { title: "Primitive streams",
      text: "`IntStream`, `LongStream` and `DoubleStream` avoid boxing and add numeric terminals: `sum`, `average` (an `OptionalDouble`), `min/max`, `summaryStatistics`. Switch with `mapToInt`/`mapToObj`/`boxed`/`asLongStream`. `IntStream.range(0, n)` replaces index loops (e.g. pairing two lists by index).",
      code: `record Booking(String pnr, int fare) {}
List<Booking> bs = List.of(new Booking("P1", 4850), new Booking("P2", 3200), new Booking("P3", 5300));
int total = bs.stream().mapToInt(Booking::fare).sum();
OptionalDouble avg = bs.stream().mapToInt(Booking::fare).average();
IntSummaryStatistics st = bs.stream().mapToInt(Booking::fare).summaryStatistics();
System.out.println(total + " " + avg.getAsDouble() + " " + st);

List<String> names = List.of("Asha", "Ravi", "Meera");
List<String> seats = List.of("12A", "12B", "14C");
System.out.println(IntStream.range(0, names.size()).mapToObj(i -> names.get(i) + "@" + seats.get(i)).toList());
System.out.println(IntStream.rangeClosed(1, 5).map(x -> x * x).boxed().collect(Collectors.toList()));
long big = IntStream.rangeClosed(1, 100_000).asLongStream().map(x -> x * x).sum();      // avoid int overflow
System.out.println(big);` },
    { title: "Parallel streams",
      text: "`.parallel()` (or `collection.parallelStream()`) splits the source with its `Spliterator` and runs chunks on the **ForkJoin common pool** (cores − 1 threads plus the caller), then combines results. It helps for **large, CPU-bound** work over **easily splittable** sources (arrays, `ArrayList`, `IntStream.range`) with **no shared mutable state**. It hurts for small inputs, I/O or blocking calls (it starves the shared pool), `LinkedList`/`iterate` sources, order-dependent operations (`limit`, `findFirst`, `sorted` on ordered streams) and in web servers where all requests share one pool. Always measure.",
      m: M(["flowchart TB",
        "  SRC[\"range 1..8M\"]:::s0 --> A[\"chunk 1\"]:::s1",
        "  SRC --> B[\"chunk 2\"]:::s1",
        "  SRC --> C[\"chunk 3\"]:::s1",
        "  SRC --> D[\"chunk 4\"]:::s1",
        "  A --> C1[\"combine\"]:::s2", "  B --> C1", "  C --> C2[\"combine\"]:::s2", "  D --> C2",
        "  C1 --> R[\"result\"]:::s4", "  C2 --> R",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `int n = 8_000_000;
long t0 = System.nanoTime();
long seq = IntStream.rangeClosed(1, n).mapToLong(i -> (long) i * i % 7).sum();
long t1 = System.nanoTime();
long par = IntStream.rangeClosed(1, n).parallel().mapToLong(i -> (long) i * i % 7).sum();
long t2 = System.nanoTime();
System.out.println((seq == par) + " | seq " + (t1 - t0) / 1_000_000 + " ms, par " + (t2 - t1) / 1_000_000 + " ms on " + Runtime.getRuntime().availableProcessors() + " cores");

List<Integer> unsafe = new ArrayList<>();
try { IntStream.range(0, 10_000).parallel().forEach(unsafe::add); } catch (RuntimeException e) { System.out.print("crashed: " + e.getClass().getSimpleName() + " | "); }
List<Integer> safe = IntStream.range(0, 10_000).parallel().boxed().toList();      // let the stream collect
System.out.println("shared ArrayList size " + unsafe.size() + " (often wrong), collected " + safe.size());
System.out.println(List.of(1, 2, 3, 4, 5).parallelStream().findAny().isPresent() + " " + List.of(1, 2, 3, 4, 5).parallelStream().findFirst().get());`,
      points: ["Run CPU-heavy parallel work in your own `ForkJoinPool` or executor rather than the shared common pool in servers", "`groupingByConcurrent`/`toConcurrentMap` for unordered parallel collection"] },
    { title: "Side effects and other stream pitfalls",
      text: "Stream lambdas should be **stateless and non-interfering**: don't modify the source while streaming (a `ConcurrentModificationException` if you're lucky; here the `ArrayList` spliterator reads a stale slot and throws `NullPointerException`), don't mutate shared state from `map`/`filter`/`forEach` (wrong results in parallel, hard to reason about sequentially), and don't use `peek` for logic. Other classics: reusing a stream, infinite streams without a short-circuit, `sorted()` on huge inputs, `Collectors.toMap` with duplicates, and boxing in hot paths.",
      code: `List<String> routes = new ArrayList<>(List.of("DEL-BLR", "BOM-GOI", "DEL-BOM"));
try { routes.stream().forEach(r -> { if (r.startsWith("BOM")) routes.remove(r); }); }
catch (RuntimeException e) { System.out.println("interfering with the source: " + e.getClass().getSimpleName()); }   // NPE here, not even CME
routes.removeIf(r -> r.startsWith("BOM"));                                              // do this instead

Map<String, Integer> counts = new HashMap<>();
Stream.of("DEL", "BOM", "DEL").forEach(c -> counts.merge(c, 1, Integer::sum));           // works sequentially, but…
Map<String, Long> better = Stream.of("DEL", "BOM", "DEL").collect(Collectors.groupingBy(c -> c, TreeMap::new, Collectors.counting()));
System.out.println(routes + " " + new TreeMap<>(counts) + " " + better);

long peeks = Stream.of(1, 2, 3).peek(x -> System.out.print("peek" + x + " ")).count();  // Java 9+: may skip peek for sized streams
System.out.println("count " + peeks + " (no peeks printed)");` },
    { title: "Streams or loops?",
      text: "Streams shine for **declarative data transformations**: filter–map–group–aggregate reads like a query. Loops are better when you need early `return`/`break` with complex state, checked exceptions, index juggling, mutation of several variables, or maximum performance in a hot path. Readability is the main criterion; both compile to similar speed for most business code. Keep pipelines short, name complex lambdas as methods, and format one operation per line.",
      table: [
        ["Prefer streams", "Prefer loops"],
        ["Filter / map / group / count / join", "Several mutable accumulators updated together"],
        ["Building new collections or maps", "Early exit with complex conditions, `break`/`continue` across levels"],
        ["Parallelisable CPU work over large data", "Checked exceptions on every step"],
        ["Composable, testable steps", "Index-based algorithms (two pointers, DP tables)"],
        ["Concise one-liners in reviews", "Debugging-heavy code, tight hot loops on primitives"]],
      code: `record Booking(String pnr, String route, int fare) {}
List<Booking> bs = List.of(new Booking("P1", "DEL-BLR", 4850), new Booking("P2", "BOM-GOI", 3200), new Booking("P3", "DEL-BLR", 5300));

Map<String, Integer> revenueLoop = new TreeMap<>();                  // loop version
for (Booking b : bs) revenueLoop.merge(b.route(), b.fare(), Integer::sum);

Map<String, Integer> revenueStream = bs.stream()                    // stream version
    .collect(Collectors.groupingBy(Booking::route, TreeMap::new, Collectors.summingInt(Booking::fare)));
System.out.println(revenueLoop + " " + revenueStream.equals(revenueLoop));` }
  ];

  H.registerLesson({
    code: "J11",
    summary: "Streams as lazy pipelines: sources, intermediate and terminal operations, single use, vertical processing, short-circuiting and stateful barriers; `filter`/`map`/`flatMap`/`mapMulti`/`distinct`/`sorted`/`limit`/`takeWhile`; terminals (`toList` vs `collect(toList())`, matching, finding, `toArray`); `reduce` with identity, associativity and combiners; collectors (`toMap` with merge functions, `joining`, `groupingBy` with downstream collectors, `partitioningBy`, `collectingAndThen`, `teeing`); primitive streams and statistics; parallel streams and the common pool; side-effect pitfalls; and when to use a loop instead.",
    slides: SLIDES,
    widget: { heading: "Interactive: watch a stream pipeline pull elements", caption: "Toggle filter, map, sorted and limit and step through the execution. Every one of the 16 traces was recorded from Java 21 with `peek` between stages.", render: streamWidget },
    examplesHeading: "Where streams show up at work",
    examples: [
      ["Reporting", "Revenue per route, bookings per agent, top-N customers: `groupingBy` + downstream collectors, `sorted(...).limit(n)`."],
      ["DTO mapping", "`entities.stream().map(mapper::toDto).toList()` in Spring services and controllers."],
      ["Validation", "`errors = rules.stream().map(r -> r.check(input)).flatMap(Optional::stream).toList()`."],
      ["File processing", "`Files.lines(path)` for CSV ingestion with `skip(1)`, `map(parse)`, `filter(valid)` (in try-with-resources)."],
      ["Lookup maps", "`toMap(Entity::id, Function.identity())` to index a list before joining data."],
      ["Batch jobs", "Occasionally `parallel()` for CPU-heavy transforms in offline jobs, with a dedicated pool, never per web request."]
    ],
    pitfalls: [
      "Reusing a stream (IllegalStateException)",
      "Modifying the source or shared state inside lambdas",
      "`toMap` without a merge function on data that can contain duplicate keys",
      "Assuming `toList()` is mutable",
      "`reduce` with a non-identity seed or a non-associative function",
      "`parallel()` on small inputs, I/O work, or in request-handling code",
      "Logic in `peek`",
      "Infinite `generate`/`iterate` without a short-circuit",
      "Huge unreadable pipelines instead of named helper methods"
    ],
    quiz: [
      { q: "What does this print?", code: `List<String> log = new ArrayList<>();
Stream<Integer> s = Stream.of(1, 2, 3).peek(x -> log.add("p" + x)).map(x -> x * 2);
System.out.println(log.size());`, options: ["0", "3", "6", "It throws"], answer: 0, why: "No terminal operation: nothing ran." },
      { q: "In `Stream.of(5, 1, 4).filter(...).map(...).findFirst()`, how are elements processed?", options: ["All filtered, then all mapped", "One element at a time through filter and map; stops at the first result", "In parallel", "Sorted first"], answer: 1, why: "Vertical processing + short-circuit." },
      { q: "Which operation must see every element before emitting any?", options: ["map", "filter", "sorted", "limit"], answer: 2, why: "Stateful barrier." },
      { q: "`Collectors.toMap(Fare::route, Fare::amount)` with two fares for the same route…", options: ["Keeps the last", "Keeps the first", "Throws IllegalStateException", "Creates a list"], answer: 2, why: "Pass a merge function." },
      { q: "Which returns Map<String, Long> of counts per route?", options: ["groupingBy(Booking::route)", "groupingBy(Booking::route, counting())", "partitioningBy(Booking::route)", "toMap(Booking::route, 1)"], answer: 1, why: "Downstream collector." },
      { q: "What does `Stream.of(1, 2, 3).toList().add(4)` do?", options: ["Adds 4", "Throws UnsupportedOperationException", "Compile error", "Returns false"], answer: 1, why: "toList() is unmodifiable." },
      { q: "`IntStream.rangeClosed(1, 4).boxed().parallel().reduce(10, Integer::sum)` may print…", options: ["Always 20", "More than 20 (identity added per chunk)", "10", "An exception"], answer: 1, why: "10 isn't an identity for +." },
      { q: "`partitioningBy` always returns…", options: ["Only keys that occur", "Both true and false keys", "A TreeMap", "A List"], answer: 1, why: "Even if a side is empty." },
      { q: "When are parallel streams a good fit?", options: ["Small lists in a web request", "Blocking HTTP calls per element", "Large CPU-bound work on arrays/ArrayList without shared state", "LinkedList with limit()"], answer: 2, why: "Splittable source, independent work." }
    ],
    cheatsheet: {
      table: [
        ["Goal", "Stream"],
        ["Transform list", "`.map(f).toList()`"],
        ["Flatten", "`.flatMap(x -> x.items().stream())`"],
        ["Top N", "`.sorted(comparing(...).reversed()).limit(n)`"],
        ["Count per key", "`groupingBy(k, counting())`"],
        ["Sum per key", "`groupingBy(k, summingInt(v))`"],
        ["Set of values per key", "`groupingBy(k, mapping(v, toSet()))`"],
        ["Index by id", "`toMap(T::id, identity())` (+ merge fn)"],
        ["Join strings", "`collect(joining(\", \"))`"],
        ["Stats", "`mapToInt(v).summaryStatistics()`"]],
      cards: [
        { title: "Laziness", items: ["Nothing runs before the terminal op", "One element at a time", "Short-circuit: limit, findFirst, anyMatch, takeWhile", "Barrier: sorted"] },
        { title: "Rules", items: ["Single use", "Stateless, non-interfering lambdas", "Close I/O streams", "Associative reduce with a real identity"] },
        { title: "Say in interviews", items: ["Intermediate vs terminal", "map vs flatMap", "toList() vs collect(toList())", "Common pool caveats for parallel"] }]
    },
    practice: [
      { level: "Easy", q: "What is the difference between intermediate and terminal operations?",
        a: ["Intermediate operations (`filter`, `map`, `sorted`, `distinct`, `limit`…) return a new stream and are **lazy**: they only describe work.",
          "Terminal operations (`collect`, `toList`, `forEach`, `reduce`, `count`, `findFirst`, `anyMatch`…) trigger processing and produce a result or side effect; the stream is then consumed.",
          "Short-circuiting operations (`limit`, `findFirst`, `anyMatch`) can finish without reading all input, even from infinite sources."] },
      { level: "Easy", q: "map vs flatMap with an example.",
        code: `List<List<String>> legsPerTrip = List.of(List.of("DEL-BOM", "BOM-GOI"), List.of("BLR-DEL"));
System.out.println(legsPerTrip.stream().map(List::size).toList());                  // one output per input
System.out.println(legsPerTrip.stream().flatMap(List::stream).toList());            // many outputs per input, flattened
System.out.println(Stream.of("DEL BOM", "GOI").flatMap(s -> Arrays.stream(s.split(" "))).toList());`,
        a: ["`map` turns each element into exactly one element (`Stream<List<String>>` → `Stream<Integer>`).",
          "`flatMap` turns each element into a stream and concatenates them (`Stream<List<String>>` → `Stream<String>`).",
          "Same idea as `Optional.flatMap` and `CompletableFuture.thenCompose`."] },
      { level: "Easy", q: "Find the second highest distinct fare in a list.",
        code: `List<Integer> fares = List.of(4850, 5300, 3200, 5300, 6100, 6100);
Optional<Integer> second = fares.stream().distinct().sorted(Comparator.reverseOrder()).skip(1).findFirst();
System.out.println(second.orElseThrow());
System.out.println(List.of(4850).stream().distinct().sorted(Comparator.reverseOrder()).skip(1).findFirst());`,
        a: ["`distinct` so duplicates of the maximum don't count, sort descending, skip one, take the first.",
          "Return an `Optional` because there may be no second value.",
          "O(n log n); a single pass tracking the top two is O(n) if performance matters."] },
      { level: "Medium", q: "Given employees, compute the average salary per department and the highest-paid employee in each, sorted by department.",
        code: `record Emp(String name, String dept, int salary) {}
List<Emp> es = List.of(new Emp("Asha", "Ops", 90), new Emp("Ravi", "Eng", 120), new Emp("Meera", "Eng", 150), new Emp("Kabir", "Ops", 70), new Emp("Dev", "Sales", 80));
Map<String, Double> avg = es.stream().collect(Collectors.groupingBy(Emp::dept, TreeMap::new, Collectors.averagingInt(Emp::salary)));
Map<String, String> top = es.stream().collect(Collectors.groupingBy(Emp::dept, TreeMap::new,
    Collectors.collectingAndThen(Collectors.maxBy(Comparator.comparingInt(Emp::salary)), o -> o.get().name())));
System.out.println(avg + " " + top);`,
        a: ["`groupingBy(classifier, mapFactory, downstream)`: the TreeMap factory gives sorted keys.",
          "`averagingInt` returns a Double per group.",
          "`maxBy` yields `Optional<Emp>` per group; `collectingAndThen` unwraps it (safe because groups are never empty)."] },
      { level: "Medium", q: "Count word frequencies in a text and print the top 3 (ties alphabetical).",
        code: `String text = "fare drop fare rise seat fare seat drop window";
Map<String, Long> freq = Arrays.stream(text.split("\\\\s+")).collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
List<String> top3 = freq.entrySet().stream()
    .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
    .limit(3).map(e -> e.getKey() + "=" + e.getValue()).toList();
System.out.println(top3);`,
        a: ["Group by the word itself with `counting()`.",
          "Sort entries by value descending, then key ascending; explicit type witness `Map.Entry.<String, Long>comparingByValue()` is needed before `.reversed()`.",
          "For a huge vocabulary, a bounded min-heap of size k is O(n log k)."] },
      { level: "Medium", q: "Partition bookings into domestic and international and sum fares in each, in one pass.",
        code: `record Booking(String to, int fare) {}
Set<String> domestic = Set.of("DEL", "BOM", "BLR", "GOI");
List<Booking> bs = List.of(new Booking("BLR", 4850), new Booking("DXB", 14200), new Booking("GOI", 3200), new Booking("SIN", 18900));
Map<Boolean, Integer> sums = bs.stream().collect(Collectors.partitioningBy(b -> domestic.contains(b.to()), Collectors.summingInt(Booking::fare)));
System.out.println("domestic " + sums.get(true) + ", international " + sums.get(false));
var both = bs.stream().collect(Collectors.teeing(Collectors.counting(), Collectors.summingInt(Booking::fare), (n, total) -> n + " bookings, ₹" + total));
System.out.println(both);`,
        a: ["`partitioningBy(predicate, downstream)` gives a `Map<Boolean, R>` with both keys always present.",
          "`teeing` runs two collectors over the same elements and merges the results: count and total in one pass.",
          "Both are single traversals of the data."] },
      { level: "Medium", q: "toList() vs collect(Collectors.toList()) vs collect(Collectors.toUnmodifiableList())?",
        a: ["`Stream.toList()` (Java 16): unmodifiable list, **allows nulls**, most concise.",
          "`Collectors.toList()`: no guarantees on type or mutability (currently `ArrayList`), so code that mutates it relies on an implementation detail; use `toCollection(ArrayList::new)` if you need mutability.",
          "`Collectors.toUnmodifiableList()`: unmodifiable and **rejects nulls** (NPE).",
          "Default to `toList()`."] },
      { level: "Hard", q: "When do parallel streams make things slower or wrong? Give concrete cases.",
        a: ["**Slower**: small inputs (splitting and merging cost more than the work); poorly splittable sources (`LinkedList`, `Stream.iterate`, `BufferedReader.lines`); boxing-heavy pipelines; order-sensitive ops like `limit`/`findFirst`/`sorted` on ordered streams; memory-bound work.",
          "**Starvation**: all parallel streams share the ForkJoin common pool (cores − 1). Blocking calls (HTTP, JDBC) inside a parallel stream tie up that pool for the whole JVM, including other requests and `CompletableFuture` defaults.",
          "**Wrong**: shared mutable state (`ArrayList.add` from `forEach` loses elements or throws), non-associative `reduce`, a seed that isn't an identity, `forEach` assuming order.",
          "Use it for large CPU-bound batch work, preferably in a dedicated `ForkJoinPool`, and benchmark (JMH) before and after."] },
      { level: "Hard", q: "Write a custom Collector that computes min, max and count of fares in a single pass (without summaryStatistics).",
        code: `record Range(int min, int max, long count) {}
final class Acc { int min = Integer.MAX_VALUE, max = Integer.MIN_VALUE; long n; }
Collector<Integer, Acc, Range> range = Collector.of(
    Acc::new,                                                              // supplier
    (a, f) -> { a.min = Math.min(a.min, f); a.max = Math.max(a.max, f); a.n++; },   // accumulator
    (a, b) -> { a.min = Math.min(a.min, b.min); a.max = Math.max(a.max, b.max); a.n += b.n; return a; },   // combiner (parallel)
    a -> new Range(a.min, a.max, a.n));                                    // finisher
System.out.println(Stream.of(4850, 3200, 5300, 6100).collect(range));
System.out.println(IntStream.range(0, 100_000).boxed().parallel().collect(range));`,
        a: ["A collector is four functions: create a mutable container, fold an element in, merge two containers (used by parallel streams), and convert to the result.",
          "`Collector.of(...)` builds one; characteristics like `UNORDERED` or `IDENTITY_FINISH` can be passed as extra arguments.",
          "The combiner makes the same collector correct in parallel: each chunk accumulates its own `Acc`, then chunks merge."] },
      { level: "Hard", q: "Flatten a nested structure and build a lookup: for each airline, the set of airports it serves, from a list of routes like \"6E:DEL-BLR\".",
        code: `List<String> routes = List.of("6E:DEL-BLR", "AI:DEL-BOM", "6E:BOM-GOI", "UK:DEL-BLR", "AI:BOM-DXB");
Map<String, Set<String>> airportsByAirline = routes.stream()
    .map(r -> r.split(":"))
    .flatMap(p -> Arrays.stream(p[1].split("-")).map(ap -> Map.entry(p[0], ap)))
    .collect(Collectors.groupingBy(Map.Entry::getKey, TreeMap::new, Collectors.mapping(Map.Entry::getValue, Collectors.toCollection(TreeSet::new))));
System.out.println(airportsByAirline);`,
        a: ["Split each route into airline and airports, then `flatMap` into (airline, airport) pairs using `Map.entry`.",
          "`groupingBy(airline, TreeMap::new, mapping(airport, toCollection(TreeSet::new)))` deduplicates and sorts.",
          "One pass; records instead of `Map.entry` read better in production code."] }
    ],
    recap: [
      "Streams are lazy, single-use pipelines: source → intermediate ops → terminal op; elements flow one at a time.",
      "Short-circuiting ops stop early; `sorted` is a barrier; `peek` is for debugging.",
      "Know `map`/`flatMap`/`filter`/`distinct`/`sorted`/`limit`/`takeWhile` and terminals; `toList()` is unmodifiable.",
      "Collectors do the heavy lifting: `toMap` with merge, `groupingBy` + downstream, `partitioningBy`, `teeing`; `reduce` needs identity + associativity.",
      "Primitive streams avoid boxing; parallel streams only for large CPU-bound work without shared state; prefer loops when they're clearer."
    ]
  });
})();
