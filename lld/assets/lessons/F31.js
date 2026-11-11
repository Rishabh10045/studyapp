/* Lesson F31: Concurrent collections */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var picker = H.widgets.picker({
    intro: "For each scenario, pick the collection you'd reach for first. Think about: read/write ratio, whether you need ordering or sorting, whether consumers should **block**, and whether readers need a **consistent snapshot**.",
    question: "Best fit?", noun: "Scenarios",
    options: ["ConcurrentHashMap", "CopyOnWriteArrayList", "ConcurrentLinkedQueue", "BlockingQueue", "ConcurrentSkipListMap", "Immutable + AtomicReference"],
    items: [
      { title: "Session cache", text: "Map from session id to user session, read and written by hundreds of request threads; no ordering needed.", answer: "ConcurrentHashMap", why: "High-concurrency key-value access with fine-grained locking; use `computeIfAbsent`/`compute` for atomic updates." },
      { title: "Event listeners", text: "A list of 5 listeners registered at startup (rarely changed), iterated on every one of thousands of events per second.", answer: "CopyOnWriteArrayList", why: "Reads vastly outnumber writes; iteration needs no locking and never throws `ConcurrentModificationException`." },
      { title: "Leaderboard", text: "Live contest leaderboard: frequent score updates from many threads; the UI asks for the top 10 and \"who is just above me?\".", answer: "ConcurrentSkipListMap", why: "Sorted and navigable (`headMap`, `ceilingEntry`, `descendingMap`) with concurrent updates. Key by (score, userId) to avoid ties overwriting." },
      { title: "Work hand-off", text: "Checkout threads hand orders to a pool of kitchen workers, which should sleep when there is no work and slow checkout down when they fall behind.", answer: "BlockingQueue", why: "Blocking `take()` and bounded `put()` give waiting and back-pressure (F30)." },
      { title: "Lock-free event buffer", text: "Many threads append audit events; one background thread polls every second and ships whatever is there. Nobody should ever block.", answer: "ConcurrentLinkedQueue", why: "Unbounded, non-blocking, lock-free MPMC queue; `poll()` returns null when empty. (Watch memory: it has no bound.)" },
      { title: "Feature-flag config", text: "A config of ~200 flags reloaded every minute; request threads must see a consistent set of values (not half old, half new).", answer: "Immutable + AtomicReference", why: "Swap a whole immutable map atomically; each request reads one consistent snapshot without locks." },
      { title: "Word counts", text: "Parallel log processing counts occurrences per error code across 16 threads.", answer: "ConcurrentHashMap", why: "`map.merge(code, 1L, Long::sum)` (or `computeIfAbsent(code, k -> new LongAdder()).increment()`) is atomic per key." },
      { title: "Order book price levels", text: "A trading simulator needs the best bid (highest price) and best ask (lowest price) instantly, with concurrent inserts and removals.", answer: "ConcurrentSkipListMap", why: "`firstKey()`/`lastKey()` and range views on a concurrent sorted map; O(log n) operations." },
      { title: "Allowed IP list", text: "A firewall checks every request against a list of 50 allowed CIDR ranges that admins edit a few times a day.", answer: "CopyOnWriteArrayList", why: "Read-mostly, small, iterated on every request. (An immutable list in an `AtomicReference` is equally good.)" },
      { title: "Per-user rate limiters", text: "Create one token bucket per user lazily on their first request, then reuse it.", answer: "ConcurrentHashMap", why: "`computeIfAbsent(userId, k -> new TokenBucket(...))` creates exactly one bucket per user atomically. Add eviction for inactive users." }
    ]
  });

  var SLIDES = [
    { title: "Synchronized wrappers vs concurrent collections",
      text: "`Collections.synchronizedMap(new HashMap<>())`, `Vector` and `Hashtable` make each **single** call thread-safe by locking one mutex. Two problems remain: everything serialises on that one lock (contention), and **compound actions** (check-then-put, get-then-increment, iterate) are still races unless you lock externally. The `java.util.concurrent` collections are designed for concurrency: fine-grained or lock-free internals, **atomic compound operations** built in, and iterators that never throw `ConcurrentModificationException`.",
      table: [
        ["", "Synchronized wrapper / legacy", "Concurrent collection"],
        ["Locking", "One lock for the whole collection", "Per-bin locks, CAS, copy-on-write, or lock-free"],
        ["Compound actions", "Caller must hold the lock: `synchronized (map) { … }`", "Built-in: `putIfAbsent`, `compute`, `merge`, `replace(k, old, new)`"],
        ["Iteration while others write", "Must lock the whole iteration or get CME", "Weakly consistent or snapshot; never CME"],
        ["Nulls", "Allowed (HashMap)", "`ConcurrentHashMap` rejects null keys and values"],
        ["Throughput under contention", "Poor", "Good to excellent"]],
      code: `Map<String, Integer> sync = Collections.synchronizedMap(new HashMap<>());
Map<String, Integer> chm = new ConcurrentHashMap<>();
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<?>> fs = new ArrayList<>();
for (int i = 0; i < 20_000; i++) fs.add(pool.submit(() -> {
    Integer old = sync.get("views");                                          // each call is safe...
    sync.put("views", old == null ? 1 : old + 1);                             // ...but get-then-put is NOT atomic
    chm.merge("views", 1, Integer::sum);                                      // one atomic call
}));
for (Future<?> f : fs) f.get(); pool.shutdown();
System.out.println("synchronizedMap get+put: " + sync.get("views") + (sync.get("views") < 20_000 ? " (lost updates)" : ""));
System.out.println("ConcurrentHashMap.merge: " + chm.get("views"));`,
      points: ["Thread-safe class ≠ thread-safe usage: atomicity of your **operation** is what matters", "Why no nulls in CHM: `get(k) == null` must unambiguously mean \"absent\", since you can't follow it with a race-free `containsKey`"] },
    { title: "Inside ConcurrentHashMap (Java 8+)",
      text: "CHM is an array of bins. Inserting into an **empty** bin is a single CAS (no lock). Updating a non-empty bin locks only that bin's **first node** with `synchronized`. Reads (`get`) take no locks at all: they rely on volatile reads of the table and nodes. Bins that grow long (≥ 8 entries, table ≥ 64) turn into red-black trees. Resizing is done cooperatively: threads that touch the map during a resize help move bins. `size()` sums striped counters (like `LongAdder`), so under concurrent updates it's an estimate.",
      m: M(["flowchart LR",
        "  T[\"table (volatile Node[])\"]:::s0",
        "  T --> B0[\"bin 0: empty<br/><span class='d'>put = CAS</span>\"]:::s4",
        "  T --> B1[\"bin 1: A → B<br/><span class='d'>put locks head A only</span>\"]:::s1",
        "  T --> B2[\"bin 2: tree (≥ 8 nodes)<br/><span class='d'>O(log n) lookups</span>\"]:::s2",
        "  T --> B3[\"bin 3: ForwardingNode<br/><span class='d'>resize in progress: help move</span>\"]:::bad",
        "  classDef s4 fill:#f8fafc,stroke:#94a3b8"]),
      points: [
        "Concurrency level is effectively the number of bins: threads updating different keys rarely contend",
        "`get` never blocks, even during writes or resizes",
        "Compound methods (`compute`, `computeIfAbsent`, `merge`) run the function **while holding the bin lock**: keep them short",
        "Java 7 used 16 lock **segments**; the per-bin design replaced it in Java 8 (interviewers sometimes ask about both)"] },
    { title: "Atomic compound operations on ConcurrentHashMap",
      text: "Every \"check, then act\" on a shared map should be one call. The family of atomic methods covers nearly every case; choose by what you want returned and whether a missing key should be created.",
      table: [
        ["Method", "Does atomically", "Typical use"],
        ["`putIfAbsent(k, v)`", "Insert only if absent; returns existing", "First writer wins (seat holds, idempotency keys)"],
        ["`computeIfAbsent(k, f)`", "Create value with `f` if absent (once)", "Lazy per-key objects: caches, rate limiters, locks per key"],
        ["`computeIfPresent(k, f)`", "Update or remove (return null) if present", "Decrement stock, remove when zero"],
        ["`compute(k, f)`", "Read-modify-write, present or not", "State transitions with custom rules"],
        ["`merge(k, v, f)`", "Insert `v` or combine with existing", "Counters, sums, appending"],
        ["`replace(k, old, new)`", "CAS on one key's value", "Optimistic updates of immutable values"],
        ["`remove(k, v)`", "Remove only if mapped to `v`", "Release a lock/hold only if you own it"]],
      code: `ConcurrentHashMap<String, Integer> stock = new ConcurrentHashMap<>(Map.of("IPHONE-15", 3));
ConcurrentHashMap<String, String> idempotency = new ConcurrentHashMap<>();
static boolean reserve(ConcurrentHashMap<String, Integer> stock, String sku, int n) {
    boolean[] ok = {false};
    stock.computeIfPresent(sku, (k, have) -> { if (have < n) return have; ok[0] = true; return have - n; });   // atomic check + decrement
    return ok[0];
}
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<Boolean>> res = new ArrayList<>();
for (int u = 0; u < 10; u++) {
    String requestId = "req-" + (u % 5);                                     // clients retry: duplicate request ids
    res.add(pool.submit(() -> idempotency.putIfAbsent(requestId, "seen") == null && reserve(stock, "IPHONE-15", 1)));
}
int sold = 0; for (Future<Boolean> f : res) if (f.get()) sold++;
pool.shutdown();
System.out.println("10 attempts (5 unique requests), sold " + sold + ", stock left " + stock.get("IPHONE-15"));`,
      points: ["Returning `null` from `compute`/`computeIfPresent` **removes** the entry", "Side effects inside the function (like `ok[0] = true`) are fine when they only record the decision; never do I/O there", "For counters under heavy contention: `computeIfAbsent(k, x -> new LongAdder()).increment()`"] },
    { title: "computeIfAbsent: memoisation and its traps",
      text: "`computeIfAbsent` is the idiomatic thread-safe memoiser: the mapping function runs **at most once per key**, even if 100 threads ask at the same time (the others wait for that bin). Two traps: a **slow function** blocks every thread touching the same bin (other keys may share it), and a function that **modifies the same map** (recursive memoisation) is forbidden: CHM throws `IllegalStateException: Recursive update` (or may deadlock in older versions).",
      code: `ConcurrentHashMap<String, String> rates = new ConcurrentHashMap<>();
AtomicInteger apiCalls = new AtomicInteger();
ExecutorService pool = Executors.newFixedThreadPool(8);
CountDownLatch go = new CountDownLatch(1);
List<Future<String>> fs = new ArrayList<>();
for (int i = 0; i < 50; i++) fs.add(pool.submit(() -> { go.await();
    return rates.computeIfAbsent("USD-INR", k -> { apiCalls.incrementAndGet(); return "83.12"; }); }));
go.countDown();
for (Future<String> f : fs) f.get();
System.out.println("50 concurrent lookups → rate API called " + apiCalls.get() + " time");

class Fib {
    final ConcurrentHashMap<Integer, Long> memo = new ConcurrentHashMap<>();
    long of(int n) { return n < 2 ? n : memo.computeIfAbsent(n, k -> of(k - 1) + of(k - 2)); }   // recursive update!
}
try { new Fib().of(30); System.out.println("no error this time"); }
catch (IllegalStateException e) { System.out.println("recursive computeIfAbsent: " + e.getMessage()); }
pool.shutdown();`,
      points: ["For slow loads (remote calls), cache a `CompletableFuture<V>` instead: `computeIfAbsent(k, x -> CompletableFuture.supplyAsync(load))` returns instantly and every caller shares the same future", "For recursion, compute outside the map (plain loop or a separate `HashMap` per thread) and `putIfAbsent` the result", "Production caches: Caffeine gives you this plus expiry, size bounds and stats"] },
    { title: "CopyOnWriteArrayList: snapshot reads, expensive writes",
      text: "Every write (`add`, `set`, `remove`) copies the whole backing array and swaps a volatile reference. Readers and iterators work on the array they started with, so they never lock and never see a half-done change. That's ideal for small, **read-mostly** lists like listeners, routing rules and allow-lists; terrible for large or write-heavy lists (each write is O(n) and allocates).",
      code: `List<Consumer<String>> listeners = new CopyOnWriteArrayList<>();
List<String> received = Collections.synchronizedList(new ArrayList<>());
listeners.add(e -> received.add("email:" + e));
listeners.add(e -> received.add("sms:" + e));
listeners.add(new Consumer<String>() {                                          // a one-shot listener removes itself
    public void accept(String e) { received.add("once:" + e); listeners.remove(this); }
});
for (String ev : List.of("ORDER_PLACED", "ORDER_SHIPPED"))
    for (Consumer<String> l : listeners) l.accept(ev);                         // iterating a snapshot: removal is safe
System.out.println(received);
System.out.println("listeners left: " + listeners.size());`,
      points: ["The iterator doesn't support `remove()`; call `list.remove(x)` instead (as above)", "`CopyOnWriteArraySet` is the set version (linear `contains`, fine for small sets)", "Alternative: an immutable `List.copyOf` in an `AtomicReference`, replaced on change: same idea, explicit"] },
    { title: "Concurrent queues and sorted maps",
      text: "Pick a queue by whether consumers should block and whether it must be bounded; pick a skip-list map when you need **sorted** keys with concurrent updates (there is no concurrent `TreeMap`).",
      table: [
        ["Collection", "Blocking?", "Bounded?", "Ordering", "Use for"],
        ["`ConcurrentLinkedQueue` / `Deque`", "No (`poll` → null)", "No", "FIFO (deque: both ends)", "Lock-free hand-off where nobody should wait"],
        ["`ArrayBlockingQueue`, `LinkedBlockingQueue`", "Yes", "Yes (pass a bound)", "FIFO", "Producer–consumer with back-pressure (F30)"],
        ["`PriorityBlockingQueue`", "Take blocks", "No", "Comparator", "Priority work"],
        ["`DelayQueue`", "Take blocks until due", "No", "By delay", "Retries, scheduled reminders"],
        ["`ConcurrentSkipListMap` / `Set`", "No", "No", "Sorted keys; navigable", "Leaderboards, order books, time-indexed data"]],
      code: `record Rank(long score, String user) {}
Comparator<Rank> highFirst = Comparator.comparingLong(Rank::score).reversed().thenComparing(Rank::user);
ConcurrentSkipListMap<Rank, Boolean> board = new ConcurrentSkipListMap<>(highFirst);
ConcurrentHashMap<String, Rank> current = new ConcurrentHashMap<>();
static void score(ConcurrentSkipListMap<Rank, Boolean> board, ConcurrentHashMap<String, Rank> current, String user, long delta) {
    current.compute(user, (u, old) -> {                                        // per-user atomic: remove old rank, add new
        Rank next = new Rank((old == null ? 0 : old.score()) + delta, u);
        if (old != null) board.remove(old);
        board.put(next, true);
        return next;
    });
}
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<?>> fs = new ArrayList<>();
String[] users = {"asha", "ravi", "meera", "kabir", "zoya"};
for (int i = 0; i < 1000; i++) { String u = users[i % 5]; long d = (i % 5 + 1); fs.add(pool.submit(() -> score(board, current, u, d))); }
for (Future<?> f : fs) f.get(); pool.shutdown();
System.out.println("top 3: " + board.keySet().stream().limit(3).map(r -> r.user() + "=" + r.score()).toList());
Rank meera = current.get("meera");
System.out.println("just above meera: " + board.lowerKey(meera).user() + ", entries = " + board.size());`,
      points: ["Key by (score, user) so equal scores don't overwrite each other", "The board and the per-user map are updated inside one `compute` per user, so a user's entries never duplicate; readers may briefly see a user missing between remove and put (weakly consistent), which is fine for a leaderboard", "Skip lists give O(log n) put/get/remove and ordered iteration without global locks"] },
    { title: "Iteration, size() and bulk operations",
      text: "Concurrent collections trade strict consistency for throughput. Their iterators are **weakly consistent** (CHM, skip lists, concurrent queues: reflect the state at some point during iteration, never throw CME, may or may not show concurrent changes) or **snapshots** (copy-on-write). `size()` and `isEmpty()` are estimates while writers are active, so never use them for control decisions like \"if size < limit then add\". CHM also offers parallel **bulk operations** (`forEach`, `search`, `reduce` with a parallelism threshold) that run on the common pool.",
      code: `ConcurrentHashMap<String, Long> salesByCity = new ConcurrentHashMap<>();
for (String c : List.of("Delhi", "Mumbai", "Pune", "Bengaluru", "Chennai", "Kolkata", "Jaipur", "Hyderabad"))
    salesByCity.put(c, (long) c.length() * 1_000);
for (String city : salesByCity.keySet())                                        // safe to modify while iterating
    if (salesByCity.get(city) < 6_000) salesByCity.remove(city);
long total = salesByCity.reduceValuesToLong(1, v -> v, 0L, Long::sum);           // parallelism threshold 1
String big = salesByCity.search(1, (city, v) -> v > 8_000 ? city : null);       // first match, any order
System.out.println("cities left " + new TreeSet<>(salesByCity.keySet()) + ", total ₹" + total + ", one big city: " + big);

int limit = 5; ConcurrentHashMap<String, Boolean> seats = new ConcurrentHashMap<>();
AtomicInteger held = new AtomicInteger();                                        // a real counter for limits
ExecutorService pool = Executors.newFixedThreadPool(8);
for (int i = 0; i < 100; i++) { String s = "S" + i; pool.submit(() -> {
    if (held.incrementAndGet() <= limit) seats.put(s, true); else held.decrementAndGet();   // claim a slot atomically first
}); }
pool.shutdown(); pool.awaitTermination(1, TimeUnit.SECONDS);
System.out.println("held " + seats.size() + " (limit " + limit + ")");`,
      points: ["`if (map.size() < limit) map.put(...)` is check-then-act: use an atomic counter or a `Semaphore` to enforce limits", "`mappingCount()` returns a `long` and is preferred over `size()` for very large maps", "Bulk operations take a parallelism threshold: `Long.MAX_VALUE` = sequential, `1` = maximal parallelism"] },
    { title: "Mini LLD: a thread-safe LRU cache",
      text: "\"Design an LRU cache, then make it thread-safe\" is a top machine-coding prompt. Lookups move entries to the most-recently-used position, so even a `get` is a **write** to the ordering; that's why a read-write lock doesn't help much. Three levels of answer: (1) a `LinkedHashMap` in access order behind one lock: simple and correct; (2) striping: N independent LRU segments chosen by key hash, for less contention (approximate global LRU); (3) production: Caffeine (concurrent hash map + buffered, amortised policy updates with W-TinyLFU).",
      m: H.cd(["classDiagram",
        "  class Cache~K,V~ { <<interface>>; +get(K k) Optional~V~; +put(K k, V v); +size() int }",
        "  class LockedLruCache~K,V~ { -LinkedHashMap~K,V~ map; -ReentrantLock lock; -int capacity }",
        "  class StripedLruCache~K,V~ { -LockedLruCache[] stripes; -stripeFor(K k) LockedLruCache }",
        "  Cache <|.. LockedLruCache", "  Cache <|.. StripedLruCache", "  StripedLruCache o-- LockedLruCache"]),
      code: `interface Cache<K, V> { Optional<V> get(K k); void put(K k, V v); int size(); }
class LockedLruCache<K, V> implements Cache<K, V> {
    private final ReentrantLock lock = new ReentrantLock();
    private final LinkedHashMap<K, V> map;
    LockedLruCache(int capacity) {
        map = new LinkedHashMap<>(16, 0.75f, true) {                            // accessOrder = true
            protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > capacity; }
        };
    }
    public Optional<V> get(K k) { lock.lock(); try { return Optional.ofNullable(map.get(k)); } finally { lock.unlock(); } }   // get reorders!
    public void put(K k, V v) { lock.lock(); try { map.put(k, v); } finally { lock.unlock(); } }
    public int size() { lock.lock(); try { return map.size(); } finally { lock.unlock(); } }
}
class StripedLruCache<K, V> implements Cache<K, V> {
    private final List<LockedLruCache<K, V>> stripes = new ArrayList<>();
    StripedLruCache(int capacity, int n) { for (int i = 0; i < n; i++) stripes.add(new LockedLruCache<>(Math.max(1, capacity / n))); }
    private LockedLruCache<K, V> s(K k) { return stripes.get(Math.floorMod(k.hashCode(), stripes.size())); }
    public Optional<V> get(K k) { return s(k).get(k); }
    public void put(K k, V v) { s(k).put(k, v); }
    public int size() { return stripes.stream().mapToInt(LockedLruCache::size).sum(); }
}

Cache<String, String> lru = new LockedLruCache<>(2);
lru.put("p1", "iPhone"); lru.put("p2", "Pixel"); lru.get("p1"); lru.put("p3", "OnePlus");     // p2 is least recently used
System.out.println("p1 " + lru.get("p1").isPresent() + ", p2 " + lru.get("p2").isPresent() + ", p3 " + lru.get("p3").isPresent());
Cache<Integer, Integer> striped = new StripedLruCache<>(1_000, 16);
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<?>> fs = new ArrayList<>();
for (int t = 0; t < 8; t++) fs.add(pool.submit(() -> { for (int i = 0; i < 20_000; i++) { int k = ThreadLocalRandom.current().nextInt(5_000); if (striped.get(k).isEmpty()) striped.put(k, k * k); } }));
for (Future<?> f : fs) f.get(); pool.shutdown();
System.out.println("striped cache size ≤ capacity: " + (striped.size() <= 1_000));`,
      points: ["A `ReadWriteLock` doesn't help here: access-order `get` mutates the linked list, so it needs the write lock", "Load-through without stampedes: cache `CompletableFuture<V>` values via `computeIfAbsent` so concurrent misses share one load", "Add TTL (store expiry per entry), metrics (hit rate), and size by weight (bytes) if values vary"] },
    { title: "Mini LLD: in-memory metrics registry",
      text: "An observability library records request counts and latency per endpoint from every request thread, and a scraper reads everything every 15 s (Prometheus-style). Writes are extremely frequent, reads rare; the read may be slightly stale but must not block writers.",
      code: `class Timer {
    final LongAdder count = new LongAdder(), totalMicros = new LongAdder();
    final AtomicLong maxMicros = new AtomicLong();
    void record(long micros) { count.increment(); totalMicros.add(micros); maxMicros.accumulateAndGet(micros, Math::max); }
}
class Metrics {
    private final ConcurrentHashMap<String, Timer> timers = new ConcurrentHashMap<>();
    void record(String endpoint, long micros) { timers.computeIfAbsent(endpoint, e -> new Timer()).record(micros); }
    String scrape() {                                                           // weakly consistent snapshot, no locks
        StringBuilder sb = new StringBuilder();
        new TreeMap<>(timers).forEach((e, t) -> sb.append(e).append(" count=").append(t.count.sum())
            .append(" avg=").append(t.totalMicros.sum() / Math.max(1, t.count.sum())).append("µs max=").append(t.maxMicros.get()).append("µs\\n"));
        return sb.toString();
    }
}
Metrics m = new Metrics();
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<?>> fs = new ArrayList<>();
for (int i = 0; i < 30_000; i++) { int n = i; fs.add(pool.submit(() -> m.record(n % 3 == 0 ? "GET /orders" : "POST /checkout", 100 + n % 50))); }
for (Future<?> f : fs) f.get(); pool.shutdown();
System.out.print(m.scrape());`,
      points: ["`computeIfAbsent` creates each `Timer` once; after that, recording touches only `LongAdder`s (no map lock)", "`LongAdder` for hot counters; `AtomicLong.accumulateAndGet` for max", "A scrape can see count and total from slightly different moments: acceptable for metrics, not for money"] }
  ];

  H.registerLesson({
    code: "F31",
    summary: "Choosing and using concurrent collections: why synchronized wrappers still lose updates on compound actions, how `ConcurrentHashMap` works (CAS on empty bins, per-bin locks, lock-free reads, treeified bins, cooperative resize), the atomic method family (`putIfAbsent`, `computeIfAbsent`, `computeIfPresent`, `compute`, `merge`, conditional `replace`/`remove`), memoisation traps, `CopyOnWriteArrayList` for read-mostly lists, concurrent queues, `ConcurrentSkipListMap` leaderboards, weakly consistent iteration and estimated `size()`, and mini designs for a thread-safe LRU cache and a lock-free metrics registry.",
    slides: SLIDES,
    widget: { heading: "Interactive: pick the right concurrent collection", caption: "Ten scenarios from real systems. Choose the collection you'd use first; each answer explains why. Your answers are saved.", render: picker },
    examplesHeading: "Where concurrent collections show up",
    examples: [
      ["Spring's bean and metadata caches", "Spring uses `ConcurrentHashMap` extensively for singleton registries, annotation and reflection caches populated lazily by many threads."],
      ["Tomcat / Jetty session managers", "Active sessions are kept in concurrent maps keyed by session id."],
      ["Caffeine, Guava caches", "Built on concurrent hash tables with buffered, amortised eviction bookkeeping."],
      ["Event listener lists", "Many frameworks keep listeners in `CopyOnWriteArrayList` so firing events never locks."],
      ["`ForkJoinPool` work queues, `ThreadPoolExecutor`", "Work-stealing deques and blocking queues are the concurrent collections behind every executor."]
    ],
    pitfalls: [
      "Get-then-put on any map from multiple threads (use `merge`/`compute`)",
      "Iterating a `synchronizedList` without `synchronized (list)` around the loop",
      "Long-running or I/O work inside `compute*` functions (blocks the bin, other keys too)",
      "Recursive `computeIfAbsent` on the same map (`IllegalStateException: Recursive update`)",
      "Trusting `size()`/`isEmpty()` for decisions while writers are active",
      "`CopyOnWriteArrayList` for large or write-heavy lists",
      "Putting mutable values in a concurrent map and mutating them without synchronisation (the map protects the mapping, not the value object)",
      "Using `ConcurrentLinkedQueue` as a work queue and busy-polling it (use a `BlockingQueue`)"
    ],
    quiz: [
      { q: "Why can `Collections.synchronizedMap` still lose updates?", options: ["It isn't synchronized", "Each call is atomic, but get-then-put is two calls with a gap between", "It drops nulls", "It uses weak references"], answer: 1, why: "Compound actions need one atomic call or external locking." },
      { q: "How does `ConcurrentHashMap.get` synchronise?", options: ["Locks the map", "It doesn't lock; it relies on volatile reads of the table and nodes", "Locks the bin", "Uses a ReadWriteLock"], answer: 1, why: "Reads never block." },
      { q: "Which method atomically adds 1 to a counter or creates it?", options: ["`put(k, get(k) + 1)`", "`merge(k, 1, Integer::sum)`", "`putIfAbsent(k, 1)`", "`replace(k, 1)`"], answer: 1, why: "Insert-or-combine in one call." },
      { q: "Why doesn't `ConcurrentHashMap` allow null values?", options: ["Performance only", "`get` returning null must unambiguously mean absent; a follow-up `containsKey` would race", "Legacy reasons", "Nulls break hashing"], answer: 1, why: "Ambiguity can't be resolved atomically." },
      { q: "Best collection for a small listener list iterated on every event?", options: ["`ArrayList` + synchronized", "`CopyOnWriteArrayList`", "`LinkedList`", "`ConcurrentLinkedQueue`"], answer: 1, why: "Snapshot iteration with no locking; writes are rare." },
      { q: "You need concurrent sorted access (top-N, range queries). Use…", options: ["`Collections.synchronizedSortedMap(new TreeMap<>())`", "`ConcurrentSkipListMap`", "`ConcurrentHashMap`", "`CopyOnWriteArrayList` sorted on every write"], answer: 1, why: "Concurrent, sorted, navigable." },
      { q: "What do CHM iterators do if the map changes during iteration?", options: ["Throw CME", "Weakly consistent: never throw, may or may not reflect changes", "Block writers", "Restart"], answer: 1, why: "Designed for concurrent use." },
      { q: "A thread-safe LRU cache built on `LinkedHashMap(accessOrder = true)`: why doesn't a ReadWriteLock help?", options: ["It does", "`get` reorders entries, so reads are writes and need the exclusive lock", "LinkedHashMap is already thread-safe", "Read locks are slower"], answer: 1, why: "Access order mutates on every get." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Use"],
        ["Concurrent key-value", "`ConcurrentHashMap` + `compute`/`merge`"],
        ["Lazy per-key object", "`computeIfAbsent` (fast functions only)"],
        ["Hot counters", "`computeIfAbsent(k, x -> new LongAdder())`"],
        ["Read-mostly list/set", "`CopyOnWriteArrayList` / `Set` or immutable + `AtomicReference`"],
        ["Non-blocking queue", "`ConcurrentLinkedQueue` / `Deque`"],
        ["Blocking hand-off", "`BlockingQueue` (bounded)"],
        ["Sorted concurrent", "`ConcurrentSkipListMap` / `Set`"],
        ["Bounded cache", "Caffeine, or locked/striped `LinkedHashMap` LRU"]],
      cards: [
        { title: "Atomic methods", items: ["`putIfAbsent`", "`computeIfAbsent`", "`computeIfPresent` (null removes)", "`compute`", "`merge`", "`replace(k, old, new)` / `remove(k, v)`"] },
        { title: "Semantics", items: ["Weakly consistent iterators", "No CME", "`size()` is an estimate", "No null keys/values (CHM)"] },
        { title: "Interview lines", items: ["Java 7 segments vs Java 8 bins", "Thread-safe class ≠ safe usage", "COW: read-mostly only", "No concurrent TreeMap: skip list"] }]
    },
    practice: [
      { level: "Easy", q: "Count word frequencies from 8 threads correctly with a `ConcurrentHashMap`, in two different ways.",
        code: `List<String> words = new ArrayList<>();
for (int i = 0; i < 8_000; i++) words.add(List.of("upi", "card", "wallet", "upi").get(i % 4));
ConcurrentHashMap<String, Integer> viaMerge = new ConcurrentHashMap<>();
ConcurrentHashMap<String, LongAdder> viaAdder = new ConcurrentHashMap<>();
words.parallelStream().forEach(w -> {
    viaMerge.merge(w, 1, Integer::sum);                                        // 1) atomic merge
    viaAdder.computeIfAbsent(w, k -> new LongAdder()).increment();            // 2) adder per key (best under contention)
});
System.out.println(new TreeMap<>(viaMerge) + " | upi via adder = " + viaAdder.get("upi").sum());`,
        follow: "Or without shared state at all: `words.parallelStream().collect(Collectors.groupingByConcurrent(w -> w, Collectors.counting()))`." },
      { level: "Easy", q: "When would you NOT use `CopyOnWriteArrayList`?",
        a: ["When writes are frequent: each write copies the whole array (O(n) time and garbage).",
          "When the list is large (thousands+ elements).",
          "When readers must see writes immediately during an ongoing iteration (iterators see the old snapshot).",
          "When you need `iterator.remove()` (unsupported).",
          "Use instead: `ConcurrentLinkedQueue`/`Deque` for append-heavy data, a `ConcurrentHashMap`-backed set (`ConcurrentHashMap.newKeySet()`) for membership, or locking."] },
      { level: "Medium", q: "Implement a per-key lock (\"only one thread may process a given orderId at a time; different orders in parallel\") and explain the memory concern.",
        code: `class KeyedLocks<K> {
    private final ConcurrentHashMap<K, ReentrantLock> locks = new ConcurrentHashMap<>();
    <T> T withLock(K key, Supplier<T> work) {
        ReentrantLock l = locks.computeIfAbsent(key, k -> new ReentrantLock());
        l.lock();
        try { return work.get(); } finally { l.unlock(); }
    }
}
KeyedLocks<String> locks = new KeyedLocks<>();
Map<String, Integer> state = new HashMap<>();                                 // guarded by the per-order locks
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<?>> fs = new ArrayList<>();
for (int i = 0; i < 4_000; i++) { String order = "ORD-" + (i % 4); fs.add(pool.submit(() -> locks.withLock(order, () -> {
    synchronized (state) { state.merge(order, 1, Integer::sum); } return null; }))); }
for (Future<?> f : fs) f.get(); pool.shutdown();
System.out.println(new TreeMap<>(state));`,
        follow: "The lock map grows with every key ever seen. Options: a fixed array of N locks indexed by `hash(key) % N` (lock striping: bounded memory, occasional false sharing between keys), weak-valued maps, or removing a lock when no thread holds or waits on it (tricky to get right). Guava's `Striped<Lock>` implements striping." },
      { level: "Medium", q: "Explain the difference between Java 7 and Java 8+ `ConcurrentHashMap` internals.",
        a: ["**Java 7**: the map is split into 16 (by default) **segments**, each a small hash table guarded by its own `ReentrantLock`; concurrency level = number of segments, fixed at creation.",
          "**Java 8+**: no segments. A single table of bins; empty-bin inserts use CAS; non-empty bins lock the bin's head node with `synchronized`; long bins become red-black trees; resizing is cooperative (threads help transfer); size via striped counters.",
          "Results: finer granularity (per bin), less memory overhead, better worst-case lookups (tree bins), lock-free reads in both versions.",
          "New API in Java 8: `compute*`, `merge`, `forEach`/`search`/`reduce` bulk ops, `newKeySet()`, `mappingCount()`."] },
      { level: "Medium", q: "Cache expensive product lookups so that 100 concurrent misses for the same product trigger exactly one database call, without holding a map lock during the call.",
        code: `ConcurrentHashMap<String, CompletableFuture<String>> cache = new ConcurrentHashMap<>();
AtomicInteger dbCalls = new AtomicInteger();
ExecutorService io = Executors.newFixedThreadPool(4);
Function<String, CompletableFuture<String>> load = sku -> CompletableFuture.supplyAsync(() -> {
    dbCalls.incrementAndGet();
    try { Thread.sleep(50); } catch (InterruptedException e) { throw new RuntimeException(e); }
    return sku + ": ₹79,900";
}, io);
ExecutorService callers = Executors.newFixedThreadPool(16);
List<Future<String>> fs = new ArrayList<>();
for (int i = 0; i < 100; i++) fs.add(callers.submit(() -> cache.computeIfAbsent("IPHONE-15", load).get()));
for (Future<String> f : fs) f.get();
System.out.println("100 callers, DB calls = " + dbCalls.get() + ", value = " + cache.get("IPHONE-15").join());
callers.shutdown(); io.shutdown();`,
        follow: "`computeIfAbsent` only creates the future (instant), so the bin lock is held for microseconds; the slow load runs outside. If the load fails, remove the failed future (`cache.remove(key, future)`) so the next caller retries." },
      { level: "Medium", q: "Is this thread-safe? `ConcurrentHashMap<String, List<String>> tags; tags.computeIfAbsent(id, k -> new ArrayList<>()).add(tag);`",
        a: ["Creating the list is atomic, but `ArrayList.add` on the returned list is not: two threads adding to the same id's list race (lost elements, corrupt array).",
          "Fix 1: make the value thread-safe: `computeIfAbsent(id, k -> new CopyOnWriteArrayList<>())` or `ConcurrentHashMap.newKeySet()`.",
          "Fix 2: do the mutation inside the map's lock: `tags.compute(id, (k, list) -> { if (list == null) list = new ArrayList<>(); list.add(tag); return list; })`, and never touch the list outside `compute`.",
          "Fix 3: immutable values: `tags.merge(id, List.of(tag), (a, b) -> Stream.concat(a.stream(), b.stream()).toList())`."] },
      { level: "Hard", q: "Design an in-memory inventory service for a flash sale (10,000 units, 1 million users in 60 seconds). It must never oversell, and reads of \"units left\" should be cheap.",
        a: ["Hot path: one `AtomicInteger` (or `LongAdder` for decrements is wrong: you need a precise check) per SKU; reserve with a CAS loop: read, if `left < n` fail, else `compareAndSet(left, left - n)`.",
          "Map SKU → counter in a `ConcurrentHashMap`; reads of units left are a volatile read.",
          "Per-user limit (\"max 2 per user\"): `ConcurrentHashMap<String, AtomicInteger>` with `merge`/CAS, checked before the stock CAS; compensate if the stock CAS fails.",
          "Reservation expiry: reserved units go back if payment doesn't complete in 10 minutes (`DelayQueue` or scheduled sweeps).",
          "Persistence and multiple instances: the in-memory counter is a cache/front gate; the source of truth is Redis `DECR` with Lua (atomic check-and-decrement) or a DB row with optimistic locking; pre-shard stock across instances (each pod owns a quota) to avoid a single hot key.",
          "Back-pressure: a queue/virtual waiting room in front so the system sees a manageable rate."] },
      { level: "Hard", q: "Implement `ConcurrentHashMap`-style lock striping yourself: a fixed-size thread-safe map with N stripes. What are the trade-offs vs one lock?",
        code: `class StripedMap<K, V> {
    private final HashMap<K, V>[] parts; private final Object[] locks;
    @SuppressWarnings("unchecked")
    StripedMap(int stripes) {
        parts = new HashMap[stripes]; locks = new Object[stripes];
        for (int i = 0; i < stripes; i++) { parts[i] = new HashMap<>(); locks[i] = new Object(); }
    }
    private int idx(Object k) { return Math.floorMod(k.hashCode() ^ (k.hashCode() >>> 16), parts.length); }
    V get(K k) { int i = idx(k); synchronized (locks[i]) { return parts[i].get(k); } }
    V merge(K k, V v, BinaryOperator<V> f) { int i = idx(k); synchronized (locks[i]) { return parts[i].merge(k, v, f); } }
    int size() {                                                              // needs ALL locks for an exact answer
        int n = 0;
        for (int i = 0; i < parts.length; i++) synchronized (locks[i]) { n += parts[i].size(); }
        return n;                                                             // still only a moment-by-moment sum
    }
}
StripedMap<Integer, Integer> m = new StripedMap<>(16);
ExecutorService pool = Executors.newFixedThreadPool(8);
List<Future<?>> fs = new ArrayList<>();
for (int t = 0; t < 8; t++) fs.add(pool.submit(() -> { for (int i = 0; i < 10_000; i++) m.merge(i % 1000, 1, Integer::sum); }));
for (Future<?> f : fs) f.get(); pool.shutdown();
System.out.println("keys = " + m.size() + ", count for key 7 = " + m.get(7));`,
        follow: "Pros: threads touching different stripes don't contend; memory overhead is tiny. Cons: whole-map operations (size, iteration, resize, clear) need every lock (in a fixed order to avoid deadlock); a hot key still serialises; choosing N is a guess. CHM avoids most of these with per-bin locking, lock-free reads and cooperative resizing." }
    ],
    recap: [
      "Synchronized wrappers make single calls safe; compound actions still race. Use concurrent collections with atomic methods.",
      "`ConcurrentHashMap`: lock-free reads, CAS/per-bin locks for writes; `compute`/`merge`/`putIfAbsent` make check-then-act atomic; no nulls.",
      "`computeIfAbsent` memoises once per key; keep functions short, never recursive; cache futures for slow loads.",
      "`CopyOnWriteArrayList` for small read-mostly lists; concurrent queues for non-blocking hand-off; `ConcurrentSkipListMap` for sorted data.",
      "Iteration is weakly consistent or snapshot-based and `size()` is an estimate; enforce limits with atomics or semaphores."
    ]
  });
})();
