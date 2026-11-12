/* Lesson J07: Collections I: framework, List & Queue internals */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Two modes: ArrayList growth and PriorityQueue (binary min-heap)
  function collWidget(el, ctx) {
    var s = ctx.state;
    if (!s.mode) { s.mode = "heap"; s.heap = [4850, 5120, 4100, 6200, 3900]; s.log = []; s.size = 0; s.cap = 0; s.copies = 0; s.alog = []; s.nextFare = 0; }
    el.innerHTML = "<div class='seg' data-r='mode'><button type='button' data-m='heap'>PriorityQueue (min-heap)</button><button type='button' data-m='list'>ArrayList growth</button></div><div data-r='body' style='margin-top:12px'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    var FARES = [4300, 3700, 5600, 4999, 3500, 6100, 4200, 3800, 5200, 4600];
    function siftUp(a, i, log) { while (i > 0) { var p = (i - 1) >> 1; if (a[i] >= a[p]) break; log.push("swap " + a[i] + " ↑ with parent " + a[p]); var t = a[i]; a[i] = a[p]; a[p] = t; i = p; } }
    function siftDown(a, i, log) { var n = a.length; while (true) { var l = 2 * i + 1, r = l + 1, m = i; if (l < n && a[l] < a[m]) m = l; if (r < n && a[r] < a[m]) m = r; if (m === i) break; log.push("swap " + a[i] + " ↓ with smaller child " + a[m]); var t = a[i]; a[i] = a[m]; a[m] = t; i = m; } }
    function drawHeap() {
      var a = s.heap;
      q("body").innerHTML = "<p>" + ctx.md("`PriorityQueue<Integer>` stores a **binary heap in an array**: the children of index `i` are `2i+1` and `2i+2`; the parent is `(i-1)/2`. The smallest element is always at index 0. `offer` appends and **sifts up**; `poll` moves the last element to the root and **sifts down**. Both are O(log n); `peek` is O(1).") + "</p>" +
        "<div class='btnrow'><button type='button' class='btn primary' data-r='offer'>offer(next fare)</button><button type='button' class='btn' data-r='poll'>poll()</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
        "<div class='diagram' data-r='dg'></div><div class='tablewrap'><table><thead><tr><th>Index</th>" + a.map(function (_, i) { return "<th>" + i + "</th>"; }).join("") + "</tr></thead><tbody><tr><td>array</td>" + a.map(function (v) { return "<td><code>" + v + "</code></td>"; }).join("") + "</tr></tbody></table></div>" +
        "<pre class='code' data-r='log'></pre>";
      var L = ["flowchart TB"];
      if (!a.length) L.push("  e[\"(empty)\"]");
      a.forEach(function (v, i) { L.push("  n" + i + "[\"" + v + "<br/><small>[" + i + "]</small>\"]:::" + (i === 0 ? "s1" : "s0")); });
      a.forEach(function (v, i) { if (i > 0) L.push("  n" + ((i - 1) >> 1) + " --> n" + i); });
      L.push("  classDef s0 fill:#dbeafe,stroke:#2563eb", "  classDef s1 fill:#fff3e0,stroke:#ef6c00,stroke-width:2px");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("log").textContent = s.log.slice(-6).join("\n") || "Press offer() or poll().";
      q("offer").addEventListener("click", function () { var v = FARES[s.nextFare++ % FARES.length]; var log = ["offer(" + v + "): append at index " + a.length]; a.push(v); siftUp(a, a.length - 1, log); s.log = s.log.concat(log); ctx.save(); drawHeap(); });
      q("poll").addEventListener("click", function () { if (!a.length) { s.log.push("poll() on empty queue returns null"); } else { var top = a[0], last = a.pop(), log = ["poll() returns " + top + (a.length ? "; move last (" + last + ") to the root" : "")]; if (a.length) { a[0] = last; siftDown(a, 0, log); } s.log = s.log.concat(log); } ctx.save(); drawHeap(); });
      q("reset").addEventListener("click", function () { s.heap = [3900, 4100, 4850, 6200, 5120]; s.log = []; s.nextFare = 0; ctx.save(); drawHeap(); });
    }
    function drawList() {
      q("body").innerHTML = "<p>" + ctx.md("`new ArrayList<>()` starts with a shared empty array. The first `add` allocates capacity **10**; when full, it grows to `old + old/2` (×1.5) and **copies** every element into the new array. Most adds are O(1); the occasional resize is O(n), so the **amortised** cost per add stays O(1).") + "</p>" +
        "<div class='btnrow'><button type='button' class='btn primary' data-r='add1'>add(x)</button><button type='button' class='btn' data-r='add10'>add 10 more</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
        "<div data-r='cells' style='display:flex;flex-wrap:wrap;gap:3px;margin:12px 0'></div><div class='result' data-r='res'></div><pre class='code' data-r='log'></pre>";
      var cells = "";
      for (var i = 0; i < Math.max(s.cap, 1); i++) cells += "<div style='width:22px;height:22px;border-radius:4px;border:1px solid var(--border);background:" + (i < s.size ? "var(--accent)" : "var(--bg-subtle)") + "' title='index " + i + "'></div>";
      q("cells").innerHTML = s.cap ? cells : "<em>elementData = {} (shared empty array, capacity 0)</em>";
      var res = q("res"); res.className = "result"; res.innerHTML = "<p>" + ctx.md("size **" + s.size + "**, capacity **" + s.cap + "**, element copies during resizes so far: **" + s.copies + "** (" + (s.size ? (s.copies / s.size).toFixed(2) : "0") + " per add). Pre-size with `new ArrayList<>(n)` or `ensureCapacity(n)` when you know n.") + "</p>";
      q("log").textContent = s.alog.slice(-5).join("\n") || "Press add(x).";
      function add() { if (s.size === s.cap) { var nc = s.cap === 0 ? 10 : s.cap + (s.cap >> 1); s.alog.push("add #" + (s.size + 1) + ": full → grow " + s.cap + " → " + nc + ", copy " + s.size + " elements"); s.copies += s.size; s.cap = nc; } s.size++; }
      q("add1").addEventListener("click", function () { add(); ctx.save(); drawList(); });
      q("add10").addEventListener("click", function () { for (var k = 0; k < 10; k++) add(); ctx.save(); drawList(); });
      q("reset").addEventListener("click", function () { s.size = 0; s.cap = 0; s.copies = 0; s.alog = []; ctx.save(); drawList(); });
    }
    function draw() {
      Array.prototype.forEach.call(q("mode").children, function (b) { b.className = b.getAttribute("data-m") === s.mode ? "on" : ""; });
      if (s.mode === "heap") drawHeap(); else drawList();
    }
    q("mode").addEventListener("click", function (e) { var b = e.target.closest("button[data-m]"); if (!b) return; s.mode = b.getAttribute("data-m"); ctx.save(); draw(); });
    if (s.heap.join() === "4850,5120,4100,6200,3900") s.heap = [3900, 4100, 4850, 6200, 5120];
    draw();
  }

  var SLIDES = [
    { title: "The Collections Framework map",
      text: "`java.util` gives you a small set of **interfaces** (what you program against) and several **implementations** (how data is stored). Declare variables by interface (`List<Order> orders = new ArrayList<>()`) so you can swap implementations. `Map` is part of the framework but **doesn't extend `Collection`**. This lesson covers lists and queues; J08 covers maps and sets; J09 iteration and concurrent collections.",
      m: M(["flowchart TB",
        "  IT[\"Iterable\"]:::s0 --> C[\"Collection\"]:::s0",
        "  C --> L[\"List<br/>ArrayList · LinkedList\"]:::s1",
        "  C --> S[\"Set<br/>HashSet · LinkedHashSet · TreeSet\"]:::s2",
        "  C --> Q[\"Queue<br/>PriorityQueue · ArrayDeque\"]:::s1",
        "  Q --> D[\"Deque<br/>ArrayDeque · LinkedList\"]:::s1",
        "  C --> SC[\"SequencedCollection (21)\"]",
        "  MP[\"Map (not a Collection)<br/>HashMap · LinkedHashMap · TreeMap\"]:::s2"]),
      table: [
        ["Interface", "Contract", "Default choice"],
        ["`List`", "Ordered, indexed, duplicates allowed", "`ArrayList`"],
        ["`Set`", "No duplicates (by equals/hashCode or compare)", "`HashSet` (`LinkedHashSet` for order, `TreeSet` for sorted)"],
        ["`Queue`", "Hold elements for processing; FIFO or priority", "`ArrayDeque` (FIFO), `PriorityQueue` (priority)"],
        ["`Deque`", "Double-ended: stack and queue", "`ArrayDeque`"],
        ["`Map`", "Key → value, unique keys", "`HashMap`"]],
      analogy: "Interfaces are job descriptions (\"keep things in order\", \"no duplicates\", \"first come first served\"); implementations are the people you hire for the job. You write your code against the job description so you can hire someone faster later." },
    { title: "ArrayList internals: a growable array",
      text: "`ArrayList` wraps an `Object[] elementData` plus a `size`. `get(i)` and `set(i)` are a bounds check plus an array access: **O(1)** and cache-friendly. `add(e)` at the end is **amortised O(1)**: when the array is full it allocates a new one **1.5×** the size (`old + old >> 1`) and copies everything. Inserting or removing in the middle shifts all later elements with `System.arraycopy`: **O(n)**.",
      code: `int n = 200_000;
long t0 = System.nanoTime();
List<Integer> grown = new ArrayList<>();                  // starts empty, grows 10 → 15 → 22 → 33 …
for (int i = 0; i < n; i++) grown.add(i);
long t1 = System.nanoTime();
List<Integer> presized = new ArrayList<>(n);              // one allocation
for (int i = 0; i < n; i++) presized.add(i);
long t2 = System.nanoTime();
System.out.println("both size " + grown.size() + "; presizing avoids ~" + (int) (Math.log(n / 10.0) / Math.log(1.5)) + " resizes");

List<String> legs = new ArrayList<>(List.of("DEL", "BLR", "GOI", "BOM"));
legs.add(1, "HYD");                                       // shifts BLR, GOI, BOM right
legs.remove("GOI");                                       // shifts BOM left
System.out.println(legs + " get(2)=" + legs.get(2));

List<Integer> ids = new ArrayList<>(List.of(10, 20, 30));
ids.remove(1);                                            // remove(int index) → removes 20
ids.remove(Integer.valueOf(30));                          // remove(Object) → removes 30
System.out.println(ids);`,
      points: ["`trimToSize()` releases unused capacity; `ensureCapacity(n)` pre-grows", "Removing from the **end** is O(1); removing from the front of a big `ArrayList` in a loop is O(n²): use `ArrayDeque` or `removeIf`", "Use the widget's \"ArrayList growth\" mode to watch capacity and copies"] },
    { title: "List implementations compared",
      text: "In practice `ArrayList` wins almost everywhere because arrays are contiguous in memory (CPU caches love them) and use far less memory than linked nodes. `LinkedList`'s O(1) insert only applies when you're **already at the node** (via a `ListIterator`); finding that position is O(n). Use `ArrayDeque` for queues and stacks.",
      table: [
        ["Operation", "ArrayList", "LinkedList", "ArrayDeque"],
        ["`get(i)` / `set(i)`", "O(1)", "O(n)", "n/a"],
        ["Add/remove at end", "O(1) amortised", "O(1)", "O(1) amortised"],
        ["Add/remove at front", "O(n)", "O(1)", "O(1)"],
        ["Insert/remove in middle", "O(n) shift", "O(n) to find + O(1) relink", "n/a"],
        ["`contains`", "O(n)", "O(n)", "O(n)"],
        ["Memory per element", "~4 bytes (reference)", "~24 bytes node + reference", "~4 bytes"],
        ["Nulls", "Allowed", "Allowed", "**Not allowed**"],
        ["Implements", "List, RandomAccess", "List, Deque", "Deque"]],
      code: `List<Integer> array = new ArrayList<>(), linked = new LinkedList<>();
for (int i = 0; i < 20_000; i++) { array.add(i); linked.add(i); }
long t0 = System.nanoTime(); long s1 = 0;
for (int i = 0; i < array.size(); i++) s1 += array.get(i);        // O(1) each
long t1 = System.nanoTime(); long s2 = 0;
for (int i = 0; i < linked.size(); i++) s2 += linked.get(i);      // O(n) each → O(n²) total!
long t2 = System.nanoTime(); long s3 = 0;
for (int x : linked) s3 += x;                                     // iterator: O(n) total, fine
System.out.println("same sums: " + (s1 == s2 && s2 == s3) + "; index loop on LinkedList slower: " + ((t2 - t1) > (t1 - t0)));`,
      points: ["`RandomAccess` is a marker interface that tells algorithms indexed access is fast", "Interview answer: \"I'd default to ArrayList; LinkedList only if I measured a benefit\""] },
    { title: "LinkedList: a doubly-linked list (and when it helps)",
      text: "`LinkedList` stores each element in a `Node { item, prev, next }` with `first` and `last` pointers. Adding or removing at either end, or at the current position of a `ListIterator`, just relinks pointers. That's useful for algorithms that walk a list and splice while walking. It also implements `Deque`, but `ArrayDeque` is faster for that role.",
      m: M(["flowchart LR",
        "  F([\"first\"]) --> A[\"Node: DEL\"]:::s0",
        "  A <--> B[\"Node: BLR\"]:::s0",
        "  B <--> C[\"Node: GOI\"]:::s0",
        "  C --- LST([\"last\"])",
        "  B -. \"listIterator.add(HYD) relinks two pointers\" .-> N[\"Node: HYD\"]:::s1"]),
      code: `LinkedList<String> route = new LinkedList<>(List.of("DEL", "BLR", "GOI"));
ListIterator<String> it = route.listIterator();
while (it.hasNext()) {
    String stop = it.next();
    if (stop.equals("BLR")) it.add("HYD");                 // O(1) insert after current position
    if (stop.equals("GOI")) it.set("GOA");                 // replace in place
}
route.addFirst("CCU");
route.removeLast();
System.out.println(route + " first=" + route.getFirst() + " size=" + route.size());`,
      points: ["`ListIterator` works on `ArrayList` too, but `add`/`remove` there still shift the array", "LRU caches use a linked list *plus* a hash map so they can find nodes in O(1): that's `LinkedHashMap` (J08)"] },
    { title: "Queue and Deque: two families of methods",
      text: "`Queue` methods come in pairs: one **throws** on failure, one **returns a special value**. Prefer `offer`/`poll`/`peek` in normal code. `Deque` (double-ended queue) adds `First`/`Last` variants and the stack methods `push`/`pop`/`peek`. **`ArrayDeque`** (a circular array) is the go-to for both FIFO queues and LIFO stacks; the old `Stack` class is synchronized and extends `Vector`: avoid it.",
      table: [
        ["", "Throws exception", "Returns special value"],
        ["Insert", "`add(e)` (IllegalStateException if full)", "`offer(e)` (false if full)"],
        ["Remove head", "`remove()` (NoSuchElementException)", "`poll()` (null if empty)"],
        ["Examine head", "`element()`", "`peek()`"],
        ["Deque as stack", "`push(e)` / `pop()`", "`peekFirst()`"],
        ["Deque both ends", "`addFirst/addLast`, `removeFirst/removeLast`", "`offerFirst/offerLast`, `pollFirst/pollLast`"]],
      code: `Deque<String> checkIn = new ArrayDeque<>();              // FIFO queue
checkIn.offer("Deepak"); checkIn.offer("Rishabh"); checkIn.offer("Asha");
System.out.println("serving " + checkIn.poll() + ", next " + checkIn.peek() + ", waiting " + checkIn.size());

Deque<String> undo = new ArrayDeque<>();                 // LIFO stack
undo.push("select seat 12A"); undo.push("add meal"); undo.push("add baggage");
System.out.println("undo " + undo.pop() + ", then " + undo.pop());

static boolean balanced(String s) {                      // classic stack problem
    Deque<Character> st = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if ("([{".indexOf(c) >= 0) st.push(c);
        else if (")]}".indexOf(c) >= 0) {
            if (st.isEmpty()) return false;
            char o = st.pop();
            if ("([{".indexOf(o) != ")]}".indexOf(c)) return false;
        }
    }
    return st.isEmpty();
}
System.out.println(balanced("{[()()]}") + " " + balanced("([)]"));
Queue<String> empty = new ArrayDeque<>();
System.out.println("poll on empty: " + empty.poll());
try { empty.remove(); } catch (NoSuchElementException e) { System.out.println("remove on empty throws"); }`,
      points: ["`ArrayDeque` rejects `null` (null is the \"empty\" signal of `poll`)", "Bounded and blocking queues (`ArrayBlockingQueue`, `LinkedBlockingQueue`) are for producer–consumer between threads (J21, J27)"] },
    { title: "PriorityQueue: a binary heap",
      text: "`PriorityQueue` always hands you the **smallest** element (by natural order or a `Comparator`) in O(log n). Internally it's a **binary min-heap stored in an array**: parent ≤ children, no other ordering. So `peek` is O(1), `offer`/`poll` O(log n), `remove(Object)` and `contains` O(n), and **iterating or printing is not in sorted order**. For a max-heap pass `Comparator.reverseOrder()`.",
      code: `record Task(String name, int priority) {}
PriorityQueue<Task> tasks = new PriorityQueue<>(Comparator.comparingInt(Task::priority));
tasks.offer(new Task("send invoice", 3));
tasks.offer(new Task("refund failed payment", 1));
tasks.offer(new Task("weekly report", 5));
tasks.offer(new Task("rebook cancelled flight", 1));
System.out.println("peek: " + tasks.peek().name());
while (!tasks.isEmpty()) System.out.print(tasks.poll().priority() + " ");
System.out.println();

PriorityQueue<Integer> fares = new PriorityQueue<>(List.of(5120, 4850, 6200, 3900, 4100));
System.out.println("toString (heap order, not sorted): " + fares);
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
maxHeap.addAll(fares);
System.out.println("max: " + maxHeap.peek());`,
      points: ["Not stable: equal priorities come out in no guaranteed order; add a sequence-number tie-breaker if order matters", "Building from a collection heapifies in O(n)", "Not thread-safe: `PriorityBlockingQueue` for concurrent use; `DelayQueue` for scheduled items", "Use the widget to watch sift-up and sift-down"] },
    { title: "The top-K pattern",
      text: "\"Find the K largest\" (cheapest flights, busiest routes, hottest products) is a classic interview and production task. Sorting everything is O(n log n). A **min-heap of size K** keeps the K largest seen so far: for each element, add it and, if the heap exceeds K, remove the smallest. Total **O(n log K)** time and **O(K)** memory, and it works on streams that don't fit in memory.",
      code: `static List<Integer> topK(Iterable<Integer> values, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();            // min-heap
    for (int v : values) {
        heap.offer(v);
        if (heap.size() > k) heap.poll();                            // drop the smallest
    }
    List<Integer> result = new ArrayList<>(heap);
    result.sort(Comparator.reverseOrder());
    return result;
}
record RouteCount(String route, long count) {}
static List<String> busiestRoutes(Map<String, Long> counts, int k) {
    PriorityQueue<RouteCount> heap = new PriorityQueue<>(Comparator.comparingLong(RouteCount::count));
    counts.forEach((r, c) -> { heap.offer(new RouteCount(r, c)); if (heap.size() > k) heap.poll(); });
    return heap.stream().sorted(Comparator.comparingLong(RouteCount::count).reversed()).map(RouteCount::route).toList();
}

Random rnd = new Random(42);
List<Integer> bookings = IntStream.range(0, 100_000).map(i -> rnd.nextInt(1_000_000)).boxed().toList();
System.out.println(topK(bookings, 3).equals(bookings.stream().sorted(Comparator.reverseOrder()).limit(3).toList()));
System.out.println(busiestRoutes(Map.of("DEL-BOM", 920L, "DEL-BLR", 880L, "BOM-GOI", 310L, "BLR-HYD", 450L), 2));`,
      points: ["For K smallest, use a max-heap of size K", "If K is close to n, just sort; if data is static and you need repeated queries, sort once", "Streaming alternative: `stream.sorted(cmp).limit(k)` is simpler but O(n log n)"] },
    { title: "Unmodifiable, immutable and fixed-size lists",
      text: "Four similar-looking things behave very differently. `List.of(...)` / `List.copyOf(...)` (Java 9/10) are **truly immutable** and reject `null`s. `Collections.unmodifiableList(list)` is a **read-only view**: you can't change it, but changes to the backing list show through. `Arrays.asList(array)` is **fixed-size and write-through** to the array: `set` works, `add` throws. `stream.toList()` (Java 16) returns an unmodifiable list that **allows** nulls.",
      table: [
        ["Factory", "add/remove", "set", "Nulls", "Reflects source changes"],
        ["`List.of`, `List.copyOf`", "✗", "✗", "✗ (NPE)", "No (copy / own data)"],
        ["`Collections.unmodifiableList(l)`", "✗", "✗", "As source", "**Yes** (view)"],
        ["`Arrays.asList(arr)`", "✗", "✓ (writes array)", "✓", "Yes (backed by the array)"],
        ["`stream.toList()`", "✗", "✗", "✓", "No"],
        ["`Collectors.toList()`", "✓ (currently an ArrayList, not guaranteed)", "✓", "✓", "No"]],
      code: `List<String> source = new ArrayList<>(List.of("DEL", "BLR"));
List<String> view = Collections.unmodifiableList(source);
List<String> copy = List.copyOf(source);
source.add("GOI");
System.out.println("view " + view + " | copy " + copy);

String[] arr = {"A", "B", "C"};
List<String> fixed = Arrays.asList(arr);
fixed.set(0, "Z");
System.out.println("array now " + Arrays.toString(arr));
for (Runnable r : List.<Runnable>of(() -> fixed.add("D"), () -> view.add("X"), () -> copy.set(0, "Y")))
    try { r.run(); } catch (UnsupportedOperationException e) { System.out.print("UOE "); }
try { List.of("a", null); } catch (NullPointerException e) { System.out.println("| List.of rejects null"); }`,
      points: ["Return `List.copyOf(internal)` (or an unmodifiable view) from getters to protect your object's state (J03)", "`List.of(...).contains(null)` throws NPE: a surprising edge case"] },
    { title: "Everyday List and Collections utilities",
      text: "A handful of methods remove most hand-written loops. `subList` is a **view** (changes write through; structural changes to the parent invalidate it). `removeIf` and `replaceAll` are the safe way to filter or transform in place. Java 21 added **sequenced collections**: `getFirst()`, `getLast()`, `reversed()` on `List`, `Deque`, `LinkedHashSet` and friends (J14).",
      code: `List<Integer> fares = new ArrayList<>(List.of(5120, 4850, 6200, 3900, 4100, 4850));
fares.removeIf(f -> f > 6000);                          // in-place filter (no ConcurrentModificationException)
fares.replaceAll(f -> f + 300);                         // in-place map (e.g. add a fee)
fares.sort(null);                                       // natural order
System.out.println(fares + " first=" + fares.getFirst() + " last=" + fares.getLast() + " reversed=" + fares.reversed());

List<Integer> page = fares.subList(1, 3);               // view of indices 1..2
page.set(0, 9999);
System.out.println("subList write-through: " + fares);
fares.subList(0, 2).clear();                            // remove a range efficiently
System.out.println("after range clear: " + fares);

System.out.println("frequency of 5150: " + Collections.frequency(List.of(5150, 4400, 5150), 5150));
System.out.println("binarySearch: " + Collections.binarySearch(List.of(3900, 4100, 4850, 5120), 4850));
List<String> crew = new ArrayList<>(List.of("pilot", "copilot", "purser"));
Collections.swap(crew, 0, 2); Collections.reverse(crew);
System.out.println(crew + " " + Collections.nCopies(3, "-") + " max=" + Collections.max(crew));`,
      points: ["`binarySearch` requires a sorted list; returns `-(insertionPoint) - 1` when not found", "Don't keep a `subList` around after modifying the parent structurally: it throws `ConcurrentModificationException`"] },
    { title: "Choosing the right collection",
      text: "Pick by the operations you need most and by ordering requirements, then by thread-safety. When in doubt: `ArrayList`, `HashMap`, `HashSet`, `ArrayDeque`. Size things when you know the size, and expose interfaces, not implementations.",
      m: M(["flowchart TB",
        "  Q1{\"Key → value lookups?\"} -- yes --> MAP[\"HashMap<br/>(LinkedHashMap: insertion/LRU order,<br/>TreeMap: sorted/range queries)\"]:::s2",
        "  Q1 -- no --> Q2{\"Unique elements?\"}",
        "  Q2 -- yes --> SET[\"HashSet<br/>(LinkedHashSet / TreeSet)\"]:::s2",
        "  Q2 -- no --> Q3{\"Process in order of arrival<br/>or as a stack?\"}",
        "  Q3 -- yes --> DQ[\"ArrayDeque\"]:::s1",
        "  Q3 -- no --> Q4{\"Always need smallest / largest?\"}",
        "  Q4 -- yes --> PQ[\"PriorityQueue\"]:::s1",
        "  Q4 -- no --> AL[\"ArrayList\"]:::s0",
        "  AL -.-> TS{\"Shared across threads?\"}",
        "  TS -- yes --> CC[\"Concurrent collections (J09)\"]:::bad"]),
      table: [
        ["Scenario", "Choice"],
        ["Search results to display", "`ArrayList` (or `List.copyOf` to return)"],
        ["BFS over a graph", "`ArrayDeque` as a queue"],
        ["Undo history", "`ArrayDeque` as a stack"],
        ["Next job by priority / earliest deadline", "`PriorityQueue` (or `DelayQueue`)"],
        ["Seen-IDs dedup", "`HashSet`"],
        ["Sliding window max", "`ArrayDeque` (monotonic deque)"]] }
  ];

  H.registerLesson({
    code: "J07",
    summary: "The Java Collections Framework for lists and queues: the interface map (`Iterable` → `Collection` → `List`/`Set`/`Queue`/`Deque`, with `Map` apart), `ArrayList` internals (backing array, 1.5× growth, amortised O(1) add, O(n) middle inserts, `remove(int)` vs `remove(Object)`), a Big-O comparison of `ArrayList`, `LinkedList` and `ArrayDeque`, `LinkedList` nodes and `ListIterator`, the two Queue method families and `ArrayDeque` as queue and stack, `PriorityQueue` as an array-backed binary heap, the top-K pattern, immutable vs unmodifiable vs fixed-size lists, everyday `List`/`Collections` utilities and how to choose a collection.",
    slides: SLIDES,
    widget: { heading: "Interactive: inside PriorityQueue and ArrayList", caption: "Heap mode: offer and poll fares and watch sift-up/sift-down in the tree and the backing array. ArrayList mode: add elements and watch capacity grow 10 → 15 → 22 → 33 with the copy cost.", render: collWidget },
    examplesHeading: "Where lists and queues show up at work",
    examples: [
      ["API responses", "Services build `ArrayList`s from DB rows and return `List.copyOf` or unmodifiable lists from domain objects."],
      ["Retry and job queues", "In-memory work queues use `ArrayDeque` inside one thread or `BlockingQueue` between threads; schedulers use `PriorityQueue`/`DelayQueue` ordered by next-run time."],
      ["Leaderboards and dashboards", "Top-N routes, slowest endpoints or highest spenders: a size-K heap over a stream of events."],
      ["Graph algorithms", "BFS for \"cheapest route with at most 2 stops\" uses `ArrayDeque`; Dijkstra uses `PriorityQueue`."],
      ["Batching", "`subList` views to chunk a big list into DB batches of 500 (`list.subList(i, min(i + 500, n))`)."],
      ["Defensive copies", "`List.copyOf` at constructor boundaries keeps value objects immutable (J03, J13)."]
    ],
    pitfalls: [
      "`list.remove(1)` on a `List<Integer>` removes index 1, not the value 1",
      "Indexed `for` loops over `LinkedList` (O(n²))",
      "Using `Stack` or `Vector` in new code",
      "Expecting `PriorityQueue` iteration/`toString` to be sorted",
      "Adding `null` to `ArrayDeque`, `List.of`, or `PriorityQueue`",
      "Assuming `Collections.unmodifiableList` is a snapshot (it's a live view)",
      "Calling `add` on `Arrays.asList` results (fixed size)",
      "Removing from a list inside a for-each loop (ConcurrentModificationException, J09)",
      "Not pre-sizing very large `ArrayList`s when the size is known"
    ],
    quiz: [
      { q: "Growth factor of `ArrayList` when full?", options: ["2×", "1.5× (old + old/2)", "+10 elements", "Exact fit"], answer: 1, why: "First allocation 10, then 15, 22, 33…" },
      { q: "Time complexity of `ArrayList.add(0, x)` on n elements?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 2, why: "All elements shift right." },
      { q: "Best general-purpose stack in modern Java?", options: ["Stack", "Vector", "ArrayDeque", "LinkedList"], answer: 2, why: "Stack is legacy and synchronized." },
      { q: "What does `new PriorityQueue<>(List.of(5, 1, 4)).toString()` guarantee?", options: ["[1, 4, 5]", "[5, 4, 1]", "Only that 1 is first (heap order)", "Insertion order"], answer: 2, why: "Only the head is guaranteed to be the minimum." },
      { q: "Complexity of finding the top K of n items with a size-K min-heap?", options: ["O(n)", "O(n log K)", "O(n log n)", "O(K log n)"], answer: 1, why: "Each of n offers costs O(log K)." },
      { q: "`Arrays.asList(arr).add(x)`…", options: ["Works", "Throws UnsupportedOperationException", "Returns false", "Resizes the array"], answer: 1, why: "Fixed-size, write-through list." },
      { q: "Which `Queue` method returns null instead of throwing on an empty queue?", options: ["remove()", "element()", "poll()", "pop()"], answer: 2, why: "poll/peek/offer return special values." },
      { q: "`Collections.unmodifiableList(src)` after `src.add(x)` shows…", options: ["The old contents", "The new element too (it's a view)", "Throws", "An empty list"], answer: 1, why: "Use List.copyOf for a snapshot." },
      { q: "Why is `ArrayList` usually faster than `LinkedList` even for some inserts?", options: ["It's synchronized", "Contiguous memory and fewer allocations make it cache-friendly", "It uses a tree", "LinkedList is deprecated"], answer: 1, why: "Locating the insert point in a LinkedList is O(n) pointer chasing." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Use", "Key costs"],
        ["Indexed list", "`ArrayList`", "get O(1), add end O(1)*, middle O(n)"],
        ["Queue / stack", "`ArrayDeque`", "Both ends O(1)*, no nulls"],
        ["Priority order", "`PriorityQueue`", "peek O(1), offer/poll O(log n), not sorted iteration"],
        ["Splice while iterating", "`LinkedList` + `ListIterator`", "O(1) at the iterator"],
        ["Immutable list", "`List.of`, `List.copyOf`, `stream.toList()`", "No nulls (except toList)"],
        ["Read-only view", "`Collections.unmodifiableList`", "Reflects source"],
        ["Range ops", "`subList(a, b)`", "View; `.clear()` removes a range"]],
      cards: [
        { title: "Queue methods", items: ["offer / add", "poll / remove", "peek / element", "push / pop (Deque)"] },
        { title: "Heap index math", items: ["children 2i+1, 2i+2", "parent (i−1)/2", "min at index 0", "max-heap: reverseOrder()"] },
        { title: "Say in interviews", items: ["Amortised O(1) add", "Cache locality beats Big-O", "Top-K with size-K heap", "Program to interfaces"] }]
    },
    practice: [
      { level: "Easy", q: "ArrayList vs LinkedList: differences and when to use each?",
        a: ["`ArrayList`: resizable array; O(1) random access; amortised O(1) append; O(n) insert/remove in the middle (shifting); compact and cache-friendly.",
          "`LinkedList`: doubly-linked nodes; O(1) add/remove at ends or at an iterator position; O(n) indexed access; ~6× the memory per element; poor cache locality.",
          "Default to `ArrayList`. For queue/stack use `ArrayDeque`. `LinkedList` only when you splice heavily through a `ListIterator` and measured a benefit.",
          "Both are unsynchronized and allow nulls."] },
      { level: "Easy", q: "Implement a queue using two stacks (amortised O(1) per operation).",
        code: `final class TwoStackQueue<T> {
    private final Deque<T> in = new ArrayDeque<>(), out = new ArrayDeque<>();
    void offer(T x) { in.push(x); }
    T poll() { shift(); return out.poll(); }
    T peek() { shift(); return out.peek(); }
    int size() { return in.size() + out.size(); }
    private void shift() { if (out.isEmpty()) while (!in.isEmpty()) out.push(in.pop()); }   // each element moves once
}

TwoStackQueue<String> q = new TwoStackQueue<>();
q.offer("Deepak"); q.offer("Rishabh");
System.out.print(q.poll() + " ");
q.offer("Asha");
System.out.println(q.poll() + " " + q.poll() + " " + q.poll() + " size=" + q.size());`,
        a: ["Push onto `in`; when reading and `out` is empty, pour `in` into `out` (reversing the order).",
          "Each element is pushed and popped at most twice, so operations are amortised O(1).",
          "In real code just use `ArrayDeque`; this is a classic interview question about amortised analysis."] },
      { level: "Easy", q: "What's the output, and why?",
        qcode: `List<Integer> list = new ArrayList<>(List.of(1, 2, 3, 4));
list.remove(1);
list.remove(Integer.valueOf(1));
System.out.println(list);`,
        a: ["Output: `[3, 4]`.",
          "`remove(1)` matches `remove(int index)` exactly (no boxing needed), so it removes index 1 (the value 2): `[1, 3, 4]`.",
          "`remove(Integer.valueOf(1))` calls `remove(Object)` and removes the value 1: `[3, 4]`.",
          "Overload resolution prefers no-boxing matches (J03)."] },
      { level: "Medium", q: "Merge K sorted lists of fares into one sorted list efficiently.",
        code: `static List<Integer> mergeK(List<List<Integer>> lists) {
    record Cursor(int value, int list, int index) {}
    PriorityQueue<Cursor> pq = new PriorityQueue<>(Comparator.comparingInt(Cursor::value));
    for (int i = 0; i < lists.size(); i++) if (!lists.get(i).isEmpty()) pq.offer(new Cursor(lists.get(i).get(0), i, 0));
    List<Integer> out = new ArrayList<>();
    while (!pq.isEmpty()) {
        Cursor c = pq.poll();
        out.add(c.value());
        List<Integer> src = lists.get(c.list());
        if (c.index() + 1 < src.size()) pq.offer(new Cursor(src.get(c.index() + 1), c.list(), c.index() + 1));
    }
    return out;
}

System.out.println(mergeK(List.of(List.of(3900, 4850, 6200), List.of(4100, 5120), List.of(), List.of(3500, 7000))));`,
        a: ["Keep one cursor per list in a min-heap keyed by the current value; poll the smallest, append it, and push that list's next element.",
          "Time O(N log K) for N total elements and K lists; space O(K) for the heap.",
          "Alternative: pairwise merging (divide and conquer) has the same complexity; concatenating and sorting is O(N log N).",
          "This is how external merge sort and \"merge results from K shards\" work."] },
      { level: "Medium", q: "Sliding window maximum: for each window of size k over an array of prices, output the max in O(n).",
        code: `static int[] windowMax(int[] a, int k) {
    Deque<Integer> dq = new ArrayDeque<>();             // indices, values decreasing from head to tail
    int[] out = new int[a.length - k + 1];
    for (int i = 0; i < a.length; i++) {
        if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();          // drop index outside window
        while (!dq.isEmpty() && a[dq.peekLast()] <= a[i]) dq.pollLast();      // drop smaller values: they can never be max
        dq.offerLast(i);
        if (i >= k - 1) out[i - k + 1] = a[dq.peekFirst()];
    }
    return out;
}

System.out.println(Arrays.toString(windowMax(new int[]{4850, 5120, 3900, 6200, 4100, 4000, 5500}, 3)));`,
        a: ["Keep a **monotonic deque** of indices whose values are decreasing; the head is always the current window's max.",
          "Each index is added and removed at most once: O(n) total, O(k) space.",
          "`ArrayDeque` gives O(1) operations at both ends, which is exactly what this needs.",
          "A heap solution is O(n log k) and needs lazy deletion."] },
      { level: "Medium", q: "Explain how `PriorityQueue.offer` and `poll` work internally and their complexity.",
        a: ["Storage: `Object[] queue` holding a binary heap; for index i, children at 2i+1/2i+2, parent at (i−1)/2; invariant parent ≤ child.",
          "`offer(e)`: grow the array if needed, place e at index `size`, then **sift up**: swap with the parent while smaller. O(log n).",
          "`poll()`: take index 0, move the last element to index 0, then **sift down**: swap with the smaller child while larger. O(log n).",
          "`peek` O(1); `remove(Object)`/`contains` O(n) (linear scan); building from a collection is O(n) (heapify).",
          "Growth: doubles while small (< 64), then grows by 50%."] },
      { level: "Medium", q: "When would you return `List.copyOf`, `Collections.unmodifiableList`, or the list itself from a getter?",
        a: ["**`List.copyOf`**: when callers must get a stable snapshot and the object must stay immutable (value objects, DTOs). One copy per call (or once in the constructor if the field itself is a `List.copyOf`).",
          "**`Collections.unmodifiableList`**: when callers should see live updates but not modify (e.g. an aggregate exposing its line items); O(1) wrapper.",
          "**The list itself**: only for internal/package-private use where mutation by the caller is intended, or in performance-critical code with clear ownership docs.",
          "Never return a mutable internal list from a public API of an object that has invariants (e.g. \"total must equal sum of items\")."] },
      { level: "Hard", q: "Design an in-memory scheduler that runs tasks at given times (one worker thread). Which collections and why?",
        a: ["Store tasks in a **`PriorityQueue`** ordered by `runAt` (then by a sequence number for FIFO among equal times): `peek` tells the next due time in O(1); `offer`/`poll` are O(log n).",
          "Worker loop: lock, peek; if empty, wait; if `runAt` is in the future, `wait(runAt - now)`; else poll and run outside the lock. New earlier tasks `notify` the worker.",
          "Cancellation: mark the task cancelled (O(1)) and skip it when polled (lazy deletion), instead of O(n) `remove`.",
          "In real code: `ScheduledThreadPoolExecutor` (uses a delay queue/heap internally) or `DelayQueue` with `Delayed` tasks; for persistence and clustering, Quartz or a DB-backed scheduler.",
          "Mention clock choice: use `System.nanoTime()` for delays (monotonic), wall-clock only for display."] },
      { level: "Hard", q: "Explain amortised analysis of `ArrayList.add` and why growth must be geometric, not additive.",
        a: ["With growth factor 1.5, after n adds the total elements copied is about n × (1 + 1/1.5 + 1/1.5² + …) ≈ 3n, so the **amortised** cost per add is O(1).",
          "With additive growth (+10 each time), resizing happens every 10 adds and copies 10, 20, 30, … elements: total ≈ n²/20: O(n) per add.",
          "Trade-off of the factor: larger (2×) means fewer copies but more wasted capacity; 1.5× also allows the allocator to reuse freed blocks in some schemes.",
          "Worst-case single add is still O(n) (a resize), which matters for latency-sensitive code: pre-size."] }
    ],
    recap: [
      "Program to interfaces: List, Set, Queue/Deque, Map (Map isn't a Collection).",
      "ArrayList = growable array: O(1) get, amortised O(1) append (1.5× growth), O(n) middle edits; the default list.",
      "LinkedList only for iterator splicing; ArrayDeque for queues and stacks (no nulls); avoid Stack/Vector.",
      "PriorityQueue = array binary heap: O(1) peek, O(log n) offer/poll, unsorted iteration; top-K with a size-K heap in O(n log K).",
      "List.of/copyOf immutable, unmodifiableList a live view, Arrays.asList fixed-size; removeIf/replaceAll/subList for in-place work."
    ]
  });
})();
