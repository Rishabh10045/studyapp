/* Lesson F23: Iterator */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  // BST: 50 (30 (20, 40), 70 (60, 80))
  var T = { 50: [30, 70], 30: [20, 40], 70: [60, 80], 20: [], 40: [], 60: [], 80: [] };
  var MODES = [
    ["pre", "Pre-order DFS (stack)", "Stack"],
    ["in", "In-order (stack, BST → sorted)", "Stack"],
    ["bfs", "Level order BFS (queue)", "Queue"]];
  function simulate(mode) {
    var c = [], out = [], steps = [];
    function pushLeft(n) { while (n !== undefined) { c.push(n); n = T[n][0]; } }
    if (mode === "in") pushLeft(50); else c.push(50);
    steps.push({ out: [], c: c.slice(), cur: null, note: mode === "in" ? "constructor: pushLeft(root) puts 50, 30, 20 on the stack" : "constructor: put the root in the " + (mode === "bfs" ? "queue" : "stack") });
    while (c.length) {
      var n, note;
      if (mode === "bfs") { n = c.shift(); T[n].forEach(function (k) { c.push(k); }); note = "next(): dequeue " + n + (T[n].length ? ", enqueue children " + T[n].join(", ") : " (leaf)"); }
      else if (mode === "pre") { n = c.pop(); var kids = T[n].slice().reverse(); kids.forEach(function (k) { c.push(k); }); note = "next(): pop " + n + (kids.length ? ", push right " + T[n][1] + " then left " + T[n][0] : " (leaf)"); }
      else { n = c.pop(); var r = T[n][1]; pushLeft(r); note = "next(): pop " + n + (r !== undefined ? ", pushLeft(" + r + ")" : ", no right child"); }
      out.push(n); steps.push({ out: out.slice(), c: c.slice(), cur: n, note: note });
    }
    return steps;
  }
  function treeWidget(el, ctx) {
    var s = ctx.state; if (s.m === undefined) { s.m = 0; s.i = 0; }
    el.innerHTML = "<p>" + ctx.md("An iterator keeps **just enough state** to produce the next element on demand. For a tree, that state is a stack (DFS) or a queue (BFS) of nodes still to visit, so the caller just loops `while (it.hasNext()) it.next()` and never sees nodes or child pointers.") + "</p>" +
      "<div class='field'>Traversal</div><div class='seg' data-r='mode'></div>" +
      "<div class='btnrow' style='margin-top:8px'><button type='button' class='btn primary' data-r='next'>it.next()</button><button type='button' class='btn' data-r='reset'>new iterator</button></div>" +
      "<div class='diagram' data-r='dg'></div><pre class='code' data-r='log'></pre><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var mode = MODES[s.m], steps = simulate(mode[0]); if (s.i >= steps.length) s.i = steps.length - 1;
      var st = steps[s.i];
      q("mode").innerHTML = MODES.map(function (x, i) { return "<button type='button' data-i='" + i + "' class='" + (i === s.m ? "on" : "") + "'>" + x[1] + "</button>"; }).join("");
      var lines = ["flowchart TB"];
      Object.keys(T).forEach(function (k) {
        var n = Number(k), cls = n === st.cur ? ":::s0" : st.out.indexOf(n) >= 0 ? ":::s2" : st.c.indexOf(n) >= 0 ? ":::s1" : ":::s4";
        lines.push("  n" + k + "((\"" + k + "\"))" + cls);
      });
      Object.keys(T).forEach(function (k) { T[k].forEach(function (c) { lines.push("  n" + k + " --> n" + c); }); });
      lines.push("  classDef s0 fill:#dbeafe,stroke:#2563eb,stroke-width:3px", "  classDef s1 fill:#fff3e0,stroke:#ef6c00,stroke-width:2px", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#f5f5f5,stroke:#9e9e9e");
      ctx.H.renderDiagram(q("dg"), lines.join("\n"));
      var done = st.c.length === 0;
      q("log").textContent = st.note + "\n" + mode[2].toLowerCase() + " = [" + st.c.join(", ") + "]" + (mode[2] === "Stack" ? "   (top is last)" : "   (front is first)") + "\nreturned so far: " + (st.out.join(", ") || "nothing") + "\nhasNext() = " + !done;
      q("next").disabled = done;
      var res = q("res");
      if (done) { res.className = "result ok"; res.innerHTML = "<div class='out'>" + st.out.join(" → ") + "</div><p>" + ctx.md(mode[0] === "in" ? "In-order over a BST yields **sorted** keys, using O(height) memory, not O(n). This is LeetCode 173 (BST iterator) and how `TreeMap` iterates." : mode[0] === "bfs" ? "Level order uses a queue: memory grows with the widest level." : "Pre-order with an explicit stack: push the right child first so the left is popped first.") + "</p>"; }
      else { res.className = "result"; res.innerHTML = "<p>" + ctx.md("Blue = just returned, orange = waiting in the " + mode[2].toLowerCase() + ", green = already returned. The caller's loop is identical for all three traversals: only the iterator changes.") + "</p>"; }
    }
    q("mode").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b) return; s.m = Number(b.getAttribute("data-i")); s.i = 0; ctx.save(); draw(); });
    q("next").addEventListener("click", function () { s.i++; ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.i = 0; ctx.save(); draw(); });
    draw();
  }

  H.pattern({
    code: "F23", name: "Iterator",
    summary: "Iterator gives clients a uniform way to walk through the elements of a collection without knowing how it is stored. This lesson covers `Iterable`/`Iterator` and the enhanced for-loop, writing a custom iterator (a ring buffer and a BST), tree traversals with explicit stacks and queues, lazy iterators over paged APIs, `remove()` and the fail-fast `ConcurrentModificationException`, fail-safe (snapshot and weakly consistent) iterators, internal vs external iteration and `Spliterator`/streams, and interview designs such as a paginated feed and a merged-sorted iterator.",
    intent: "Provide a way to **access the elements of an aggregate object sequentially without exposing its underlying representation**. The traversal state lives in a separate iterator object, so several traversals can run at once and the collection keeps its internals private.",
    problem: {
      text: "An `OrderBook` stores orders in an array today. Reports, the export job and the UI all loop with `for (int i = 0; i < book.orders.length; i++)`, reading the public array. Then the team wants to switch to a linked structure sorted by price and to stream orders lazily from the database. Every client breaks, because every client knew **how** the orders were stored.",
      points: [
        "Clients should depend on \"give me the next element\", not on arrays, indexes or node pointers",
        "Different structures (array, list, tree, paged API) should offer the **same** traversal interface",
        "Traversal state (current index, stack of nodes, page token) belongs in the iterator, not the collection",
        "Several independent traversals over one collection should be possible"],
      code: `class OrderBook {
    String[] orders = { "BUY 10 TCS @3920", "SELL 5 INFY @1510", "BUY 20 HDFC @1640" };   // public internals
}
OrderBook book = new OrderBook();
for (int i = 0; i < book.orders.length; i++) System.out.println(book.orders[i]);   // breaks when storage changes` },
    analogy: "A TV remote's channel-up button. You don't know whether channels are stored as a list, a satellite table or a cable lineup; you just press **next** until you've seen enough. Two people with two remotes on two TVs can surf the same lineup independently, each remembering their own position.",
    structure: {
      text: "**Iterable** (aggregate) has a factory method `iterator()` that returns a fresh **Iterator**. The iterator exposes `hasNext()` and `next()` (and optionally `remove()`) and keeps the cursor. **ConcreteIterator** knows the concrete collection's internals, usually as a private inner class. In Java the enhanced for-loop is compiled to exactly this `iterator()` / `hasNext()` / `next()` protocol.",
      m: H.cd(["classDiagram",
        "  class Iterable~T~ { <<interface>>; +iterator() Iterator~T~ }",
        "  class Iterator~T~ { <<interface>>; +hasNext() boolean; +next() T; +remove() }",
        "  class RingBuffer~T~ { -Object[] items; -int head; -int size; +add(T x); +iterator() Iterator~T~ }",
        "  class RingIterator { -int seen; -int expectedModCount; +hasNext() boolean; +next() T }",
        "  Iterable <|.. RingBuffer",
        "  Iterator <|.. RingIterator",
        "  RingBuffer ..> RingIterator : creates",
        "  RingIterator --> RingBuffer : reads"]),
      roles: [["Iterable (Aggregate)", "Creates iterators: `iterator()`"], ["Iterator", "`hasNext()`, `next()`, optional `remove()`"], ["Concrete iterator", "Holds cursor state; knows internals (often an inner class)"], ["Client", "Loops via `for (T x : coll)` or `it.next()`"]],
      points: ["`next()` must throw `NoSuchElementException` when exhausted", "Each `iterator()` call returns a new, independent cursor"] },
    impl: {
      title: "Java implementation: a ring buffer that is Iterable",
      text: "A fixed-capacity ring buffer (last N log lines, recent prices) stores items in a circular array starting at `head`. Clients must see items oldest-first without knowing about wrap-around. The private inner iterator hides the modulo arithmetic and is **fail-fast**: it records `modCount` at creation and throws if the buffer changes mid-iteration, just like `ArrayList`.",
      code: `class RingBuffer<T> implements Iterable<T> {
    private final Object[] items; private int head, size, modCount;
    RingBuffer(int capacity) { items = new Object[capacity]; }
    void add(T x) {
        items[(head + size) % items.length] = x;
        if (size < items.length) size++; else head = (head + 1) % items.length;   // overwrite the oldest
        modCount++;
    }
    public Iterator<T> iterator() {
        return new Iterator<T>() {
            private int seen = 0; private final int expected = modCount;
            public boolean hasNext() { return seen < size; }
            @SuppressWarnings("unchecked")
            public T next() {
                if (modCount != expected) throw new ConcurrentModificationException();
                if (!hasNext()) throw new NoSuchElementException();
                return (T) items[(head + seen++) % items.length];
            }
        };
    }
}

RingBuffer<String> recent = new RingBuffer<>(3);
for (String p : List.of("TCS 3910", "TCS 3915", "TCS 3922", "TCS 3918")) recent.add(p);
for (String p : recent) System.out.println(p);                                // oldest first, wrap-around hidden
try { for (String p : recent) recent.add("TCS 3930"); }
catch (ConcurrentModificationException e) { System.out.println("fail-fast: " + e.getClass().getSimpleName()); }`,
      points: [
        "The for-each loop works because `RingBuffer` implements `Iterable`",
        "`seen` is per-iterator state: two loops over the same buffer don't interfere",
        "Fail-fast is best-effort (not a concurrency guarantee); it exists to catch bugs early"] },
    variants: [
      { title: "Tree iterators: an explicit stack instead of recursion",
        text: "Recursion keeps traversal state on the call stack, so you can't pause it halfway and return one element. An iterator moves that state into a field: a **stack** for depth-first orders, a **queue** for level order. The classic interview question is an in-order BST iterator with O(h) memory and amortised O(1) `next()` (LeetCode 173).",
        code: `class Node { int key; Node left, right; Node(int k, Node l, Node r) { key = k; left = l; right = r; } }
class InOrder implements Iterator<Integer> {
    private final Deque<Node> stack = new ArrayDeque<>();
    InOrder(Node root) { pushLeft(root); }
    private void pushLeft(Node n) { for (; n != null; n = n.left) stack.push(n); }
    public boolean hasNext() { return !stack.isEmpty(); }
    public Integer next() {
        if (stack.isEmpty()) throw new NoSuchElementException();
        Node n = stack.pop();
        pushLeft(n.right);                                                     // each node is pushed and popped once: amortised O(1)
        return n.key;
    }
}
Node root = new Node(50, new Node(30, new Node(20, null, null), new Node(40, null, null)),
                         new Node(70, new Node(60, null, null), new Node(80, null, null)));
StringBuilder sb = new StringBuilder();
for (Iterator<Integer> it = new InOrder(root); it.hasNext(); ) sb.append(it.next()).append(' ');
System.out.println("in-order: " + sb.toString().trim());`,
        points: ["Memory is O(height): a balanced tree of a million keys needs ~20 stack entries", "Pre-order: pop, push right then left. Level order: queue, enqueue children"] },
      { title: "Fail-fast, fail-safe and weakly consistent iterators",
        text: "What happens if the collection changes while you iterate? Java's collections pick one of three answers. Knowing which is a very common interview question.",
        table: [
          ["Kind", "Collections", "Behaviour on concurrent change", "Cost"],
          ["Fail-fast", "`ArrayList`, `HashMap`, `HashSet`, `TreeMap`", "Throws `ConcurrentModificationException` (best effort, via `modCount`)", "None, but you must use `iterator.remove()` / `removeIf`"],
          ["Fail-safe (snapshot)", "`CopyOnWriteArrayList`, `CopyOnWriteArraySet`", "Iterates a snapshot; never sees later changes, never throws; `remove()` unsupported", "Every write copies the array"],
          ["Weakly consistent", "`ConcurrentHashMap`, `ConcurrentLinkedQueue`, `ConcurrentSkipListMap`", "Never throws; may or may not reflect changes made after the iterator was created", "Low; designed for concurrency"]],
        code: `List<String> carts = new ArrayList<>(List.of("c1", "c2-empty", "c3", "c4"));
try { for (String c : carts) if (c.endsWith("empty")) carts.remove(c); }
catch (ConcurrentModificationException e) { System.out.println("ArrayList: " + e.getClass().getSimpleName()); }

carts = new ArrayList<>(List.of("c1", "c2-empty", "c3"));
for (Iterator<String> it = carts.iterator(); it.hasNext(); ) if (it.next().endsWith("empty")) it.remove();   // safe
System.out.println("iterator.remove: " + carts);

List<String> cow = new CopyOnWriteArrayList<>(List.of("a", "b"));
for (String x : cow) cow.add(x + "!");                                        // iterates the snapshot [a, b]
System.out.println("CopyOnWrite: " + cow);

Map<String, Integer> stock = new ConcurrentHashMap<>(Map.of("pen", 0, "ink", 4));
for (String k : stock.keySet()) if (stock.get(k) == 0) stock.remove(k);       // allowed, no exception
System.out.println("ConcurrentHashMap: " + stock);`,
        points: ["Removing the **second-to-last** element of an `ArrayList` in a for-each loop does not throw (the loop just ends early): a famous trick question", "Fail-fast is not thread-safety; use concurrent collections across threads"] },
      { title: "External vs internal iteration, lazy iterators and streams",
        text: "With an **external** iterator the client drives (`hasNext`/`next`) and can stop, interleave two iterators, or resume later. With **internal** iteration the collection drives and calls your code (`forEach`, streams), which allows parallelism and fusion. Java's `Spliterator` is the iterator behind streams: it can also **split** itself for parallel processing.",
        table: [
          ["Style", "Java", "Good for"],
          ["External", "`Iterator`, `ListIterator` (bidirectional, `set`/`add`)", "Merging, early exit, pausing, peeking"],
          ["Internal", "`Iterable.forEach`, `Map.forEach`, `Stream`", "Concise pipelines, parallel work"],
          ["Lazy / generator", "Custom `Iterator` producing values on demand, `Stream.iterate`, `Stream.generate`", "Paged APIs, infinite sequences, huge files (`Files.lines`)"],
          ["Splittable", "`Spliterator` (`tryAdvance`, `trySplit`, characteristics)", "Custom sources for (parallel) streams via `StreamSupport.stream`"]],
        points: ["A lazy iterator does the work in `hasNext()`/`next()`, not in the constructor", "`hasNext()` must be idempotent: calling it twice must not skip elements"] }
    ],
    designs: [
      { title: "Mini LLD: lazily iterating a paginated API",
        text: "A payments dashboard shows a merchant's transactions. The bank API returns 100 per page with a `nextPageToken`. Callers should write `for (Txn t : client.transactions(merchant))` and stop whenever they like, without loading every page or seeing tokens. The iterator fetches a page only when the current one is used up.",
        points: [
          "`Iterable` returned by `transactions()`; each `iterator()` starts from page one (fresh traversal)",
          "The iterator holds the current page's iterator and the next token; `hasNext()` fetches the next page when needed (and loops past empty pages)",
          "`hasNext()` is idempotent: it only fetches when the buffer is empty",
          "Early `break` means later pages are never requested (saves calls and rate limit)",
          "Retries/back-off belong in the `PageFetcher` (Strategy/Decorator), not the iterator",
          "Expose as a stream too: `StreamSupport.stream(iterable.spliterator(), false)`"],
        m: H.cd(["classDiagram",
          "  class PageFetcher { <<interface>>; +fetch(String token) Page }",
          "  class Page { +List~Txn~ items; +String nextToken }",
          "  class PagedIterable { -PageFetcher fetcher; +iterator() Iterator~Txn~ }",
          "  class PagedIterator { -Iterator~Txn~ current; -String token; -boolean lastPage; +hasNext() boolean; +next() Txn }",
          "  PagedIterable ..> PagedIterator : creates",
          "  PagedIterator --> PageFetcher",
          "  PageFetcher ..> Page"]),
        code: `record Txn(String id, int paise) {}
record Page(List<Txn> items, String nextToken) {}
interface PageFetcher { Page fetch(String token); }
class PagedIterable implements Iterable<Txn> {
    private final PageFetcher fetcher;
    PagedIterable(PageFetcher f) { fetcher = f; }
    public Iterator<Txn> iterator() {
        return new Iterator<Txn>() {
            private Iterator<Txn> current = Collections.emptyIterator();
            private String token = null; private boolean last = false;
            public boolean hasNext() {
                while (!current.hasNext() && !last) {                             // skip empty pages
                    Page p = fetcher.fetch(token);
                    current = p.items().iterator(); token = p.nextToken(); last = token == null;
                }
                return current.hasNext();
            }
            public Txn next() { if (!hasNext()) throw new NoSuchElementException(); return current.next(); }
        };
    }
}

Map<String, Page> api = Map.of(
    "start", new Page(List.of(new Txn("t1", 49900), new Txn("t2", 1500)), "p2"),
    "p2", new Page(List.of(), "p3"),
    "p3", new Page(List.of(new Txn("t3", 250000)), null));
int[] calls = {0};
PageFetcher fetcher = tok -> { calls[0]++; System.out.println("  GET /txns?page=" + (tok == null ? "start" : tok)); return api.get(tok == null ? "start" : tok); };
for (Txn t : new PagedIterable(fetcher)) { System.out.println(t.id() + " ₹" + t.paise() / 100.0); if (t.paise() < 2000) break; }
System.out.println("API calls: " + calls[0]);`,
        follow: "The loop stopped after the small transaction, so pages p2 and p3 were never fetched." },
      { title: "Mini LLD: merging sorted activity feeds",
        text: "A notifications screen merges three sorted streams (orders, payments, offers), newest first, and shows the first 20. Each source is an iterator; a `MergingIterator` keeps a **priority queue of peeking iterators** keyed by each one's next timestamp. `next()` pops the best head, advances that source and pushes it back if it has more. Cost: O(log k) per element for k sources, and nothing beyond the first 20 is loaded.",
        code: `record Event(long ts, String text) {}
class Peeking<T> {
    final Iterator<T> it; T head;
    Peeking(Iterator<T> it) { this.it = it; head = it.hasNext() ? it.next() : null; }
    T advance() { T h = head; head = it.hasNext() ? it.next() : null; return h; }
}
class MergingIterator<T> implements Iterator<T> {
    private final PriorityQueue<Peeking<T>> pq;
    MergingIterator(List<Iterator<T>> sources, Comparator<T> order) {
        pq = new PriorityQueue<>((a, b) -> order.compare(a.head, b.head));
        for (Iterator<T> s : sources) { Peeking<T> p = new Peeking<>(s); if (p.head != null) pq.add(p); }
    }
    public boolean hasNext() { return !pq.isEmpty(); }
    public T next() {
        Peeking<T> p = pq.poll(); if (p == null) throw new NoSuchElementException();
        T x = p.advance(); if (p.head != null) pq.add(p);                       // re-insert with its new head
        return x;
    }
}

Comparator<Event> newestFirst = Comparator.comparingLong(Event::ts).reversed();
var feed = new MergingIterator<>(List.of(
    List.of(new Event(905, "order shipped"), new Event(610, "order placed")).iterator(),
    List.of(new Event(900, "payment ₹1,299 received")).iterator(),
    List.of(new Event(950, "20% off on shoes"), new Event(700, "cashback credited")).iterator()), newestFirst);
for (int i = 0; i < 4 && feed.hasNext(); i++) System.out.println(feed.next());`,
        points: ["Same idea as merge-k-sorted-lists and the merge step of external sort / LSM-tree compaction", "Wrap sources in a `PeekingIterator` (Guava has one) so you can compare heads without consuming them"] }
    ],
    usages: [
      ["`java.lang.Iterable` / `java.util.Iterator`", "Every collection; the enhanced for-loop compiles to `iterator()`, `hasNext()`, `next()`."],
      ["`ListIterator`", "Bidirectional iteration with `previous()`, `set()`, `add()` over lists."],
      ["`Map.entrySet().iterator()`, `Scanner`, `BufferedReader.lines()`", "Iterating entries, tokens and lines without exposing internal buffers."],
      ["`java.sql.ResultSet`", "A cursor over query rows (`next()` + getters): an iterator with a different method name."],
      ["`Spliterator`, `Stream`", "Splittable iterator behind streams; `StreamSupport.stream(spliterator, parallel)` builds streams from custom sources."],
      ["`DirectoryStream`, `Files.walk`, `Enumeration` (legacy)", "Lazy iteration over directories and older collections like `Vector`."],
      ["Spring Data `Slice`/`Page`, `JdbcTemplate.queryForStream`; Kafka `ConsumerRecords`", "Paged or streamed results iterated without loading everything."]
    ],
    avoid: {
      points: [
        "Plain lists/arrays used inside one class: an index loop is fine",
        "Bulk data transformations: a stream pipeline (internal iteration) is clearer",
        "When the client needs random access or the size up front, not sequential traversal",
        "Exposing a mutable iterator (`remove()`) when callers must not change the collection: return an unmodifiable view",
        "Sharing one iterator across threads: iterators are not thread-safe"],
      pros: ["Hides internal representation (SRP and encapsulation)", "Uniform traversal across different structures", "Multiple independent traversals", "Lazy: elements are produced on demand (pages, files, infinite sequences)", "Swap traversal orders without changing clients"],
      cons: ["More classes than a simple loop", "Less efficient than direct access for some structures", "Concurrent modification needs a policy (fail-fast, snapshot, weakly consistent)", "External iterators are stateful and easy to misuse (calling `next()` without `hasNext()`)"] },
    compare: [
      ["Composite (F14)", "Tree of objects", "Iterators are the usual way to traverse a composite without recursion in client code"],
      ["Factory Method (F06)", "Subclass decides what to create", "`iterator()` is a factory method: each collection returns its own concrete iterator"],
      ["Visitor (F25)", "Operations over a structure", "Iterator walks elements; Visitor performs type-specific operations on them. They're often combined"],
      ["Memento (F26)", "Save and restore state", "An iterator's position can be captured as a memento to resume traversal later (page tokens are exactly that)"],
      ["Streams", "Internal iteration", "The collection drives the loop and calls your lambdas; `Spliterator` is the iterator underneath"]],
    widget: { heading: "Interactive: step a tree iterator", caption: "Pick a traversal and press next(). Watch the iterator's stack or queue: the client loop never changes.", render: treeWidget },
    pitfalls: [
      "Modifying a collection inside a for-each loop (use `iterator.remove()`, `removeIf`, or collect then remove)",
      "`hasNext()` with side effects that advance the cursor, so calling it twice skips elements",
      "`next()` returning `null` instead of throwing `NoSuchElementException` when exhausted",
      "Doing all the work in the constructor (loading every page) instead of lazily",
      "Returning the same iterator instance from every `iterator()` call",
      "Treating fail-fast as a thread-safety guarantee",
      "Leaking resources: iterators over files/DB cursors must be closed (`try-with-resources` on `Stream`/`DirectoryStream`)",
      "Calling `next()` twice per loop iteration (e.g. `if (it.next() != null) list.add(it.next())`)"
    ],
    quiz: [
      { q: "What is Iterator's intent?", options: ["Create objects", "Access elements sequentially without exposing the collection's representation", "Undo changes", "Notify observers"], answer: 1, why: "Traversal separated from storage." },
      { q: "What does the enhanced for-loop over a `List` compile to?", options: ["An index loop", "`iterator()`, then `hasNext()`/`next()` calls", "A stream", "Recursion"], answer: 1, why: "Any `Iterable` works in for-each." },
      { q: "Removing items from an `ArrayList` inside a for-each loop usually…", options: ["Works", "Throws `ConcurrentModificationException`", "Deadlocks", "Skips silently every time"], answer: 1, why: "Fail-fast `modCount` check (with the second-to-last-element quirk)." },
      { q: "A `CopyOnWriteArrayList` iterator…", options: ["Throws on change", "Iterates a snapshot taken when it was created", "Locks the list", "Supports `remove()`"], answer: 1, why: "Fail-safe snapshot." },
      { q: "`ConcurrentHashMap` iterators are…", options: ["Fail-fast", "Weakly consistent: never throw, may reflect some later changes", "Snapshots", "Not supported"], answer: 1, why: "Designed for concurrent use." },
      { q: "Memory for an in-order BST iterator with an explicit stack?", options: ["O(n)", "O(h), the tree height", "O(1)", "O(n log n)"], answer: 1, why: "Only the left spine is stacked." },
      { q: "Which is a factory method in the Iterator pattern?", options: ["`next()`", "`Iterable.iterator()`", "`hasNext()`", "`remove()`"], answer: 1, why: "Each collection creates its own iterator type." },
      { q: "A paginated-API iterator should fetch the next page…", options: ["In the constructor, all pages", "Only when the current page is exhausted, in `hasNext()`", "In `remove()`", "On a timer"], answer: 1, why: "Laziness saves calls; keep `hasNext()` idempotent." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Use", "Note"],
        ["Loop over any collection", "for-each on `Iterable`", "compiles to `Iterator`"],
        ["Remove while iterating", "`it.remove()` / `removeIf`", "avoids CME"],
        ["Iterate while others write", "`CopyOnWriteArrayList`, `ConcurrentHashMap`", "snapshot vs weakly consistent"],
        ["Tree traversal on demand", "stack (DFS) / queue (BFS)", "O(h) / O(width) memory"],
        ["Huge or paged data", "lazy custom iterator", "fetch in `hasNext()`"],
        ["Merge sorted sources", "PQ of peeking iterators", "O(log k) per element"]],
      cards: [
        { title: "Contract", items: ["`hasNext()` idempotent, no side effects", "`next()` throws `NoSuchElementException`", "`remove()` optional (`UnsupportedOperationException`)", "New cursor per `iterator()`"] },
        { title: "Interview classics", items: ["BST iterator", "Flatten nested list", "Peeking iterator", "Zigzag / round-robin iterator", "Paginated API", "Merge k sorted"] },
        { title: "Java", items: ["`Iterator`, `ListIterator`", "`Spliterator`, `StreamSupport`", "`ResultSet`, `Scanner`", "fail-fast `modCount`"] }]
    },
    practice: [
      { level: "Easy", q: "What's the difference between `Iterable` and `Iterator`? Why doesn't a collection simply implement `Iterator` itself?",
        a: ["`Iterable` is something you **can** iterate: it has `iterator()`, which creates a cursor. `Iterator` **is** the cursor: `hasNext()`, `next()`, `remove()`.",
          "If the collection were its own iterator, it could hold only one position: two nested loops over the same list (comparing every pair) would trample each other, and a loop that ended early would leave the collection \"half consumed\".",
          "Keeping the cursor separate also keeps traversal state out of the collection's own state (SRP)."] },
      { level: "Easy", q: "Why does this code throw for one list and not another? `for (String s : list) if (s.equals(\"B\")) list.remove(s);` with `[A, B, C, D]` vs `[A, B, C]`.",
        code: `for (List<String> init : List.of(List.of("A", "B", "C", "D"), List.of("A", "B", "C"))) {
    List<String> list = new ArrayList<>(init);
    try { for (String s : list) if (s.equals("B")) list.remove(s); System.out.println(init + " -> no exception, now " + list); }
    catch (ConcurrentModificationException e) { System.out.println(init + " -> ConcurrentModificationException"); }
}`,
        follow: "`ArrayList`'s iterator checks `modCount` in `next()`, but `hasNext()` only compares `cursor != size`. Removing the second-to-last element makes `cursor == size`, so the loop ends without calling `next()` again, and \"C\" is silently skipped. Use `list.removeIf(...)` or `iterator.remove()`." },
      { level: "Medium", q: "Implement a `PeekingIterator` that supports `peek()` without advancing.",
        code: `class PeekingIterator<T> implements Iterator<T> {
    private final Iterator<T> it; private T next; private boolean has;
    PeekingIterator(Iterator<T> it) { this.it = it; advance(); }
    private void advance() { has = it.hasNext(); next = has ? it.next() : null; }
    T peek() { if (!has) throw new NoSuchElementException(); return next; }
    public boolean hasNext() { return has; }
    public T next() { T x = peek(); advance(); return x; }
}
var p = new PeekingIterator<>(List.of(1, 2, 3).iterator());
System.out.println(p.peek() + " " + p.peek() + " " + p.next() + " " + p.next() + " " + p.peek() + " " + p.next() + " " + p.hasNext());`,
        follow: "Track `has` separately so the iterator also works when the underlying source contains `null` elements." },
      { level: "Medium", q: "Flatten a nested list `[1, [2, [3, 4]], [], 5]` with an iterator (lazy, no pre-flattening).",
        code: `class Flatten implements Iterator<Integer> {
    private final Deque<Iterator<?>> stack = new ArrayDeque<>();
    private Integer next;
    Flatten(List<?> root) { stack.push(root.iterator()); }
    public boolean hasNext() {
        while (next == null && !stack.isEmpty()) {
            Iterator<?> top = stack.peek();
            if (!top.hasNext()) { stack.pop(); continue; }
            Object x = top.next();
            if (x instanceof List<?> l) stack.push(l.iterator()); else next = (Integer) x;
        }
        return next != null;
    }
    public Integer next() { if (!hasNext()) throw new NoSuchElementException(); Integer x = next; next = null; return x; }
}
List<Object> nested = List.of(1, List.of(2, List.of(3, 4)), List.of(), 5);
var f = new Flatten(nested); StringBuilder sb = new StringBuilder();
while (f.hasNext()) sb.append(f.next()).append(' ');
System.out.println(sb.toString().trim());`,
        follow: "A stack of iterators, not a stack of elements: memory is O(depth), and `hasNext()` does the work but is idempotent (it stops once `next` is buffered)." },
      { level: "Medium", q: "Write a round-robin iterator over k lists (e.g. interleaving recommended products from k categories).",
        code: `class RoundRobin<T> implements Iterator<T> {
    private final Deque<Iterator<T>> q = new ArrayDeque<>();
    RoundRobin(List<List<T>> lists) { for (List<T> l : lists) if (!l.isEmpty()) q.add(l.iterator()); }
    public boolean hasNext() { return !q.isEmpty(); }
    public T next() {
        Iterator<T> it = q.poll(); if (it == null) throw new NoSuchElementException();
        T x = it.next(); if (it.hasNext()) q.add(it);                           // back of the queue
        return x;
    }
}
var rr = new RoundRobin<>(List.of(List.of("phone1", "phone2", "phone3"), List.of("case1"), List.of("charger1", "charger2")));
List<String> out = new ArrayList<>(); rr.forEachRemaining(out::add);
System.out.println(out);`,
        follow: "Generalises LeetCode's zigzag iterator. `forEachRemaining` is a default method on `Iterator`." },
      { level: "Medium", q: "You return an iterator over lines of a 5 GB log file. What must the design handle?",
        a: ["Laziness: read line by line (`BufferedReader`), never load the file.",
          "Resource cleanup: the iterator holds an open file. Make it `AutoCloseable` or return a `Stream<String>` (`Files.lines`) used in try-with-resources; close automatically at EOF.",
          "Error handling: `IOException` is checked but `next()` can't throw it; wrap in `UncheckedIOException`.",
          "Idempotent `hasNext()`: read ahead one line into a buffer.",
          "Optionally a position (byte offset) as a resumable token (Memento) for checkpointing."] },
      { level: "Hard", q: "Design a `Spliterator` for a custom range so it can feed a parallel stream. What do `trySplit` and characteristics do?",
        code: `class RangeSpliterator implements Spliterator.OfLong {
    private long lo; private final long hi;                                    // [lo, hi)
    RangeSpliterator(long lo, long hi) { this.lo = lo; this.hi = hi; }
    public boolean tryAdvance(java.util.function.LongConsumer action) { if (lo >= hi) return false; action.accept(lo++); return true; }
    public Spliterator.OfLong trySplit() {
        long mid = (lo + hi) >>> 1;
        if (mid - lo < 1_000) return null;                                    // too small to split
        RangeSpliterator left = new RangeSpliterator(lo, mid); lo = mid; return left;
    }
    public long estimateSize() { return hi - lo; }
    public int characteristics() { return ORDERED | SIZED | SUBSIZED | IMMUTABLE | NONNULL | DISTINCT | SORTED; }
    public java.util.Comparator<? super Long> getComparator() { return null; }  // SORTED in natural order
}
long sum = StreamSupport.longStream(new RangeSpliterator(1, 1_000_001), true).sum();
System.out.println("sum 1..1,000,000 = " + sum);`,
        follow: "`tryAdvance` is `hasNext` + `next` in one call. `trySplit` hands off a prefix to another thread; `SIZED`/`SUBSIZED` let the framework split evenly and pre-size results. Returning `null` stops splitting." },
      { level: "Hard", q: "How would you make iteration over a shared collection safe while other threads modify it? Compare the options.",
        a: ["**Lock during iteration** (`synchronized (list) { for (...) }` with `Collections.synchronizedList`): consistent view, but writers block for the whole loop.",
          "**Copy, then iterate** (`new ArrayList<>(list)` under a lock): short lock, O(n) copy each time.",
          "**CopyOnWriteArrayList**: snapshot iterators for free; great when reads vastly outnumber writes (listener lists), bad for write-heavy data.",
          "**Concurrent collections** (`ConcurrentHashMap`, `ConcurrentLinkedQueue`): weakly consistent iterators, no locks, no CME, but no point-in-time snapshot.",
          "**Immutable collections** swapped atomically (`AtomicReference<List<T>>`): readers iterate a stable version; writers create a new list.",
          "Pick by read/write ratio and whether you need a consistent snapshot (more in F31)."] }
    ],
    recap: [
      "Iterator separates traversal from storage: `Iterable.iterator()` creates a fresh cursor with `hasNext()`/`next()`.",
      "Custom iterators hide internals: ring-buffer wrap-around, tree stacks/queues, page tokens.",
      "Contract: idempotent `hasNext()`, `next()` throws when exhausted, optional `remove()`, lazy work.",
      "Fail-fast (`ArrayList`, CME) vs fail-safe snapshot (`CopyOnWriteArrayList`) vs weakly consistent (`ConcurrentHashMap`).",
      "Interview staples: BST iterator, peeking, flatten, round-robin, paginated API, merge k sorted; `Spliterator` powers streams."
    ]
  });
})();
