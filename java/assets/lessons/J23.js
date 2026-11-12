/* Lesson J23: Fork/Join, parallelism, Amdahl's law, benchmarking */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Measured on the course box (8 cores, JDK 21): best of 7 runs of a RecursiveTask summing 40M longs,
  // after warm-up. "20% serial" adds a single-threaded pass over a quarter of the array first.
  var MEASURED = {
    pure: { label: "fully parallel sum", serial: 0, pts: [[1, 72.2], [2, 42.0], [4, 17.5], [8, 9.8]] },
    serial20: { label: "with a 20% serial step", serial: 20, pts: [[1, 89.9], [2, 55.6], [4, 34.5], [8, 23.3]] }
  };
  var GRAIN = [[16, 27.6], [1000, 11.2], [10000, 9.8], [100000, 9.2], [5000000, 9.2]];
  function amdahl(s, n) { return 1 / (s + (1 - s) / n); }
  function amdahlWidget(el, ctx) {
    var st = ctx.state; if (st.s === undefined) { st.s = 20; st.ds = "serial20"; }
    el.innerHTML = "<div class='seg' data-r='ds'>" + Object.keys(MEASURED).map(function (k) { return "<button type='button' data-v='" + k + "'>" + MEASURED[k].label + "</button>"; }).join("") + "</div>" +
      "<div style='margin-top:10px'>" + ctx.md("Serial fraction **s**") + ": <input type='range' min='0' max='50' step='1' data-r='s' style='vertical-align:middle;width:220px'> <b data-r='sv'></b></div>" +
      "<div data-r='plot' style='margin-top:8px;overflow-x:auto'></div><div class='result' data-r='res'></div>" +
      "<div class='tablewrap' style='margin-top:10px'><table><thead><tr><th>Leaf size (threshold)</th><th>Time on 8 threads</th></tr></thead><tbody>" +
      GRAIN.map(function (g) { return "<tr><td>" + g[0].toLocaleString("en-US") + " elements</td><td>" + g[1] + " ms" + (g[0] === 16 ? " ← task overhead dominates" : "") + "</td></tr>"; }).join("") + "</tbody></table></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("s").value = st.s;
    function draw() {
      var D = MEASURED[st.ds], s = st.s / 100, W = 520, Hh = 240, maxN = 64, maxS = 16;
      q("ds").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === st.ds); });
      q("sv").textContent = st.s + "%";
      var x = function (n) { return 40 + Math.log2(n) / Math.log2(maxN) * (W - 60); }, y = function (v) { return Hh - 30 - Math.min(v, maxS) / maxS * (Hh - 50); };
      var svg = "<svg width='" + W + "' height='" + Hh + "' style='font:11px sans-serif'>";
      [1, 2, 4, 8, 16, 32, 64].forEach(function (n) { svg += "<line x1='" + x(n) + "' x2='" + x(n) + "' y1='20' y2='" + (Hh - 30) + "' stroke='#eee'/><text x='" + x(n) + "' y='" + (Hh - 14) + "' text-anchor='middle' fill='#6b7280'>" + n + "</text>"; });
      [1, 4, 8, 12, 16].forEach(function (v) { svg += "<text x='30' y='" + (y(v) + 4) + "' text-anchor='end' fill='#6b7280'>" + v + "×</text>"; });
      var ideal = [], pred = [];
      for (var n = 1; n <= maxN; n *= 1.1) { ideal.push(x(n) + "," + y(n)); pred.push(x(n) + "," + y(amdahl(s, n))); }
      svg += "<polyline fill='none' stroke='#d1d5db' stroke-dasharray='4 3' points='" + ideal.join(" ") + "'/><polyline fill='none' stroke='#2563eb' stroke-width='2' points='" + pred.join(" ") + "'/>";
      var base = D.pts[0][1];
      D.pts.forEach(function (p) { var sp = base / p[1]; svg += "<circle cx='" + x(p[0]) + "' cy='" + y(sp) + "' r='5' fill='#ef6c00'><title>" + p[0] + " threads: " + p[1] + " ms, " + sp.toFixed(2) + "×</title></circle>"; });
      svg += "<text x='" + (W - 20) + "' y='" + (Hh - 2) + "' text-anchor='end' fill='#6b7280'>threads (log scale)</text></svg>";
      svg += "<div style='font-size:12px'><span style='color:#2563eb'>━ Amdahl prediction</span> · <span style='color:#9ca3af'>┅ ideal linear</span> · <span style='color:#ef6c00'>● measured (" + D.label + ")</span></div>";
      q("plot").innerHTML = svg;
      var m8 = base / D.pts[3][1];
      q("res").innerHTML = ctx.md("With **s = " + st.s + "%**: 8 threads → **" + amdahl(s, 8).toFixed(2) + "×**, 64 threads → **" + amdahl(s, 64).toFixed(2) + "×**, and no number of threads can beat **" + (s ? (1 / s).toFixed(1) + "×" : "∞") + "** (1/s). Measured on 8 threads: **" + m8.toFixed(2) + "×** (" + D.pts[0][1] + " ms → " + D.pts[3][1] + " ms). " +
        (st.ds === "serial20" ? "Set s to 20% to see how well the law predicts the run with a serial step." : "Real runs also lose to memory bandwidth, task overhead and JIT/cache effects, and can even look super-linear when data starts fitting in the per-core caches."));
    }
    q("ds").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; st.ds = b.dataset.v; st.s = MEASURED[st.ds].serial; q("s").value = st.s; ctx.save(); draw(); });
    q("s").addEventListener("input", function () { st.s = +q("s").value; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Concurrency vs parallelism",
      text: "**Concurrency** is about *structure*: many tasks in progress at once, interleaved (request handling, I/O waits). **Parallelism** is about *speed*: one computation split so several cores work on it simultaneously. The classic tool for CPU-bound parallelism is **divide and conquer**: split the problem until pieces are small, solve pieces in parallel, combine results. Java's Fork/Join framework (Java 7) and parallel streams (Java 8) are built for exactly this.",
      m: M(["flowchart TB",
        "  A[\"sum 0..40M\"]:::s1 --> B[\"0..20M\"]:::s1",
        "  A --> C[\"20M..40M\"]:::s1",
        "  B --> D[\"0..10M\"]:::s2",
        "  B --> E[\"10M..20M\"]:::s2",
        "  C --> F[\"20M..30M\"]:::s2",
        "  C --> G[\"30M..40M\"]:::s2",
        "  D --> R[\"combine: add partial sums\"]:::s4",
        "  E --> R", "  F --> R", "  G --> R",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `long[] data = LongStream.range(0, 20_000_000).toArray();
long t0 = System.nanoTime();
long seq = Arrays.stream(data).map(x -> x % 7).sum();
long seqMs = (System.nanoTime() - t0) / 1_000_000;
t0 = System.nanoTime();
long par = Arrays.stream(data).parallel().map(x -> x % 7).sum();
long parMs = (System.nanoTime() - t0) / 1_000_000;
System.out.println("same result: " + (seq == par) + " | sequential " + seqMs + " ms, parallel " + parMs + " ms (single cold run: see the JMH slide)");`,
      analogy: "Concurrency is one chef juggling several dishes; parallelism is four chefs each chopping a quarter of the onions for the same dish." },
    { title: "Fork/Join: RecursiveTask",
      text: "Extend `RecursiveTask<V>` (returns a value) or `RecursiveAction` (no value) and implement `compute()`: if the piece is small enough, solve it directly; otherwise split, **`fork()`** one half (push it on this worker's queue so another worker can steal it), **compute the other half yourself**, then **`join()`** the forked half. Submit the root with `pool.invoke(task)`. Computing one half directly instead of forking both halves avoids wasting the current thread.",
      code: `class SumTask extends RecursiveTask<Long> {
    static final int THRESHOLD = 10_000;
    final long[] a; final int lo, hi;
    SumTask(long[] a, int lo, int hi) { this.a = a; this.lo = lo; this.hi = hi; }
    @Override protected Long compute() {
        if (hi - lo <= THRESHOLD) {                       // small: just do it
            long s = 0; for (int i = lo; i < hi; i++) s += a[i];
            return s;
        }
        int mid = (lo + hi) >>> 1;
        SumTask left = new SumTask(a, lo, mid);
        left.fork();                                      // make the left half stealable
        long right = new SumTask(a, mid, hi).compute();   // work on the right half ourselves
        return right + left.join();                       // then wait for (or run) the left half
    }
}
long[] fares = LongStream.rangeClosed(1, 5_000_000).toArray();
long total = ForkJoinPool.commonPool().invoke(new SumTask(fares, 0, fares.length));
System.out.println("sum = " + total + ", expected " + 5_000_000L * 5_000_001 / 2);` },
    { title: "Work stealing",
      text: "Each worker in a `ForkJoinPool` has its own **double-ended queue**. A worker pushes forked subtasks onto its own deque and pops them **LIFO** (the most recent, smallest pieces, still hot in cache). An idle worker **steals FIFO** from the other end of someone else's deque, taking the **oldest, biggest** pieces, so one steal brings a lot of work and contention between owner and thief is rare. `join()` doesn't simply block: the waiting worker runs other tasks meanwhile. That's why fork/join copes well with uneven subtasks.",
      m: M(["flowchart LR",
        "  subgraph W1[\"worker 1 deque\"]", "    a1[\"big task (oldest)\"]:::s4", "    a2[\"medium\"]:::s1", "    a3[\"small (newest)\"]:::s1", "  end",
        "  subgraph W2[\"worker 2 (idle)\"]", "    e[\"empty deque\"]:::s0", "  end",
        "  W1 -->|owner pops LIFO| a3",
        "  e -->|thief steals FIFO| a1",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `ForkJoinPool pool = new ForkJoinPool(4);
class Uneven extends RecursiveAction {
    final int depth;
    Uneven(int depth) { this.depth = depth; }
    @Override protected void compute() {
        if (depth == 0) { long x = 0; for (int i = 0; i < 200_000; i++) x += i % 3; if (x < 0) System.out.println(); return; }
        invokeAll(new Uneven(depth - 1), new Uneven(depth - 1));
    }
}
pool.invoke(new Uneven(12));
System.out.println("tasks: 4096 leaves, steals recorded by the pool: " + (pool.getStealCount() > 0 ? "yes (" + (pool.getStealCount() > 50 ? "many" : "some") + ")" : "none"));
pool.shutdown();` },
    { title: "Choosing the threshold (granularity)",
      text: "Every task costs an object allocation, a deque push/pop and possibly a steal. If leaves are **too small**, overhead dominates (the widget's table: 16-element leaves were ~3× slower). If leaves are **too big**, there are too few tasks to keep all cores busy and balance uneven work. Rules of thumb: aim for leaf tasks of roughly **10–100 µs** of work (often 1,000–100,000 elements), or create about **4–10× more leaves than cores**; then measure. Parallel streams pick a split size automatically.",
      table: [
        ["Leaf size", "Effect"],
        ["Tiny (≤ 100 elements)", "Task overhead dominates; slower than sequential possible"],
        ["Moderate (≈ 1k–100k)", "Good balance of overhead and load balancing"],
        ["Huge (≥ N / cores)", "Too few tasks; idle cores when pieces are uneven"]],
      points: ["`ForkJoinTask.getSurplusQueuedTaskCount()` lets a task decide adaptively whether to split more"] },
    { title: "Parallel streams and the common pool",
      text: "`collection.parallelStream()` / `stream.parallel()` split the source with a `Spliterator` and run on the **common ForkJoinPool** (parallelism = cores − 1, plus the calling thread). That pool is **shared by the whole JVM**: every parallel stream and default `CompletableFuture` async method. You can resize it at startup with `-Djava.util.concurrent.ForkJoinPool.common.parallelism=N`. Running a parallel stream inside `customPool.submit(() -> …)` makes it use that pool, a widely used but undocumented behaviour.",
      code: `System.out.println("cores " + Runtime.getRuntime().availableProcessors() + ", common pool parallelism " + ForkJoinPool.getCommonPoolParallelism());
Set<String> threads = ConcurrentHashMap.newKeySet();
IntStream.range(0, 1_000).parallel().forEach(i -> threads.add(Thread.currentThread().getName().replaceAll("\\\\d+$", "N")));
System.out.println("parallel stream ran on: " + new TreeSet<>(threads));

ForkJoinPool custom = new ForkJoinPool(2);
Set<String> customThreads = ConcurrentHashMap.newKeySet();
custom.submit(() -> IntStream.range(0, 1_000).parallel().forEach(i -> customThreads.add(Thread.currentThread().getName().replaceAll("\\\\d+$", "N")))).get();
System.out.println("inside a custom pool: " + new TreeSet<>(customThreads));
custom.shutdown();` },
    { title: "When parallel streams pay off",
      text: "Parallelism has fixed costs (splitting, scheduling, merging), so it helps only when there's **enough work**: a common heuristic is **N × Q > 10,000** (elements × cost per element in simple operations). It also needs a **cheaply splittable source** (arrays, `ArrayList`, `IntStream.range`; not `LinkedList`, `Stream.iterate`, I/O lines), **stateless, independent** operations, a cheap **merge** step, and few ordering constraints (`findFirst`, `limit`, `forEachOrdered` and `sorted` force coordination). Boxing (`Stream<Integer>`) costs more than primitive streams.",
      table: [
        ["Factor", "Parallel-friendly", "Parallel-hostile"],
        ["Source", "Arrays, ArrayList, IntStream.range, HashMap keys", "LinkedList, Stream.iterate, BufferedReader.lines"],
        ["Work per element", "CPU-heavy (pricing calc, crypto, parsing)", "Trivial (x + 1) on small data"],
        ["Operations", "map, filter, reduce, sum, collect to concurrent/unordered", "findFirst, limit, sorted, forEachOrdered"],
        ["Side effects", "None", "Writing to shared collections, I/O"],
        ["Data size", "≫ 10k operations", "A few hundred elements"]],
      code: `List<Integer> small = IntStream.range(0, 1_000).boxed().toList();
List<Integer> linked = new LinkedList<>(IntStream.range(0, 2_000_000).boxed().toList());
int[] big = IntStream.range(0, 2_000_000).toArray();
long sink = 0;
for (int run = 0; run < 3; run++) {                                    // crude warm-up; use JMH for real numbers
    long t0 = System.nanoTime(); sink += small.parallelStream().mapToInt(i -> i * 2).sum(); long a = System.nanoTime() - t0;
    t0 = System.nanoTime(); sink += linked.parallelStream().mapToInt(i -> i * 2).sum(); long b = System.nanoTime() - t0;
    t0 = System.nanoTime(); sink += Arrays.stream(big).parallel().map(i -> (i * 31) % 7).sum(); long c = System.nanoTime() - t0;
    if (run == 2) System.out.printf("1k boxed: %d µs | 2M LinkedList: %d µs | 2M int[]: %d µs (sink %d)%n", a / 1000, b / 1000, c / 1000, sink % 10);
}` },
    { title: "Parallel stream pitfalls",
      text: "Parallel streams run your lambdas **concurrently**, so everything from J15–J19 applies. Writing to a shared `ArrayList` or `HashMap` from `forEach` loses elements or corrupts it; use `collect`/`toList()` (each thread accumulates privately, then merges). `reduce(identity, op)` requires an **associative** op and a true **identity**: `reduce(10, Integer::sum)` adds 10 once per chunk. And never do blocking I/O inside: it occupies the shared common pool.",
      code: `List<Integer> shared = new ArrayList<>();
try { IntStream.range(0, 100_000).parallel().forEach(shared::add); } catch (RuntimeException e) { System.out.println("ArrayList even threw " + e.getClass().getSimpleName()); }
List<Integer> collected = IntStream.range(0, 100_000).parallel().boxed().toList();
System.out.println("forEach into ArrayList: " + shared.size() + " | toList(): " + collected.size());

int seqReduce = IntStream.rangeClosed(1, 100).boxed().reduce(10, Integer::sum);
int parReduce = IntStream.rangeClosed(1, 100).boxed().parallel().reduce(10, Integer::sum);
System.out.println("reduce(10, +): sequential " + seqReduce + ", parallel " + parReduce + " (10 is not an identity)");
double nonAssoc = IntStream.rangeClosed(1, 20).parallel().asDoubleStream().reduce(1, (x, y) -> x - y);
System.out.println("subtraction isn't associative: parallel reduce gives " + nonAssoc + " (sequential would be " + IntStream.rangeClosed(1, 20).asDoubleStream().reduce(1, (x, y) -> x - y) + ")");` },
    { title: "Amdahl's law (and Gustafson's)",
      text: "If a fraction **s** of a program is serial, the speedup on **N** cores is at most **1 / (s + (1 − s) / N)**, and never more than **1/s**: with 10% serial work, even infinite cores give at most 10×. The widget plots the curve against runs on this box. That's why the serial parts (reading input, merging, locks, a single-threaded DB call) matter more than adding cores. **Gustafson's law** is the optimistic flip side: with more cores we usually solve **bigger problems** in the same time, and the parallel part grows with the data.",
      code: `DoubleBinaryOperator amdahl = (s, n) -> 1 / (s + (1 - s) / n);
for (double s : new double[] { 0.01, 0.05, 0.10, 0.25 }) {
    System.out.printf("serial %4.0f%%: 8 cores %.1fx, 64 cores %.1fx, limit %.0fx%n", s * 100, amdahl.applyAsDouble(s, 8), amdahl.applyAsDouble(s, 64), 1 / s);
}`,
      analogy: "Ten people can paint a fence ten times faster, but if everyone must first queue to collect a brush from one cupboard, the cupboard sets the pace." },
    { title: "Why naive timing lies",
      text: "Timing code with `System.nanoTime()` around a single run measures the **JIT compiler** as much as your code: the first iterations are interpreted, then compiled (C1, then C2), with on-stack replacement mid-loop. The JIT may also eliminate computations whose results are unused (**dead-code elimination**), fold constants, or hoist work out of loops. GC pauses, CPU frequency scaling and other processes add noise. Comparing two variants run in the same JVM in sequence biases the second one (warmer caches, profile pollution).",
      code: `long[] data = LongStream.range(0, 2_000_000).toArray();
LongSupplier work = () -> { long s = 0; for (long v : data) s += v % 13; return s; };
List<Long> timesUs = new ArrayList<>();
long sink = 0;
for (int i = 0; i < 12; i++) { long t0 = System.nanoTime(); sink += work.getAsLong(); timesUs.add((System.nanoTime() - t0) / 1_000); }
System.out.println("µs per run: first " + timesUs.get(0) + ", then " + timesUs.subList(1, 4) + " … last " + timesUs.get(11));
System.out.println("the first run is " + (timesUs.get(0) / Math.max(1, timesUs.get(11))) + "x slower than the warmed-up one (sink " + sink % 10 + ")");` },
    { title: "Benchmarking with JMH",
      text: "**JMH** (Java Microbenchmark Harness, from the OpenJDK team) handles what naive timing gets wrong: separate **forked** JVMs, **warm-up** iterations, many measurement iterations with statistics, `Blackhole` to defeat dead-code elimination, `@State` for setup, and modes (throughput, average time, sample time). Use it for micro-decisions (parallel vs sequential, data structure choices); use load tests and profilers (async-profiler, JFR) for whole services. Run with `mvn package && java -jar target/benchmarks.jar`.",
      lang: "java",
      code: `@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MILLISECONDS)
@Warmup(iterations = 5, time = 1)
@Measurement(iterations = 10, time = 1)
@Fork(2)
@State(Scope.Benchmark)
public class SumBenchmark {
    @Param({"10000", "10000000"}) int size;
    long[] data;

    @Setup public void setup() { data = LongStream.range(0, size).toArray(); }

    @Benchmark public long sequential() { return Arrays.stream(data).map(x -> x % 7).sum(); }
    @Benchmark public long parallel()   { return Arrays.stream(data).parallel().map(x -> x % 7).sum(); }

    @Benchmark public void withBlackhole(Blackhole bh) { bh.consume(Arrays.stream(data).sum()); }  // result can't be optimised away
}`, noCompile: true,
      points: ["Typical result: parallel loses at 10k elements and wins clearly at 10M", "Report scores with their error margins; compare in the same environment"] },
    { title: "Built-in parallel algorithms",
      text: "Before writing a RecursiveTask, check the JDK: `Arrays.parallelSort` (parallel merge sort for large arrays), `Arrays.parallelPrefix` (running totals), `Arrays.parallelSetAll`, parallel streams with collectors such as `groupingByConcurrent`, and `ConcurrentHashMap`'s bulk operations (`forEach`, `reduce`, `search` with a parallelism threshold). They're tuned, tested and use the common pool.",
      code: `int n = 5_000_000;
int[] a = new Random(42).ints(n, 0, 1_000_000).toArray(), b = a.clone();
long t0 = System.nanoTime(); Arrays.sort(a); long seqMs = (System.nanoTime() - t0) / 1_000_000;
t0 = System.nanoTime(); Arrays.parallelSort(b); long parMs = (System.nanoTime() - t0) / 1_000_000;
System.out.println("sort " + seqMs + " ms vs parallelSort " + parMs + " ms, equal: " + Arrays.equals(a, b));

long[] daily = {120, 80, 150, 90};
Arrays.parallelPrefix(daily, Long::sum);
System.out.println("running bookings: " + Arrays.toString(daily));

ConcurrentHashMap<String, Integer> fares = new ConcurrentHashMap<>(Map.of("DEL-BOM", 4850, "BLR-GOI", 3100, "DEL-GOI", 6100));
Integer max = fares.reduceValues(1, Integer::max);                                  // parallelism threshold 1
String cheapRoute = fares.search(1, (route, fare) -> fare < 3500 ? route : null);
System.out.println("max fare " + max + ", a route under 3500: " + cheapRoute);` }
  ];

  H.registerLesson({
    code: "J23",
    summary: "CPU parallelism in Java: concurrency vs parallelism, divide and conquer with `ForkJoinPool`, `RecursiveTask` and `RecursiveAction`, how work stealing balances load, choosing task granularity, parallel streams and the shared common pool, when parallel streams help (N×Q, splittable sources, stateless operations) and when they hurt, their correctness pitfalls, Amdahl's and Gustafson's laws, why naive timing lies, benchmarking with JMH, and the JDK's built-in parallel algorithms.",
    slides: SLIDES,
    widget: { heading: "Interactive: Amdahl's law vs measured speedups", caption: "The blue curve is Amdahl's prediction for the serial fraction you choose; the orange points are real fork/join runs on this course's 8-core box (best of 7 after warm-up). The table shows how the leaf size of the same task changed its time.", render: amdahlWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Batch computations", "Repricing millions of fares, risk calculations or report aggregation split across cores."],
      ["Parallel streams in services", "Usually a mistake on request paths: they share the common pool with every request; fine in batch jobs with large data."],
      ["Image/document processing", "Thumbnail generation, PDF parsing and compression are CPU-bound and parallelise well."],
      ["Performance reviews", "\"We made it parallel and it got slower\": tiny data, LinkedList sources, boxed streams, or blocking calls in the common pool."],
      ["Capacity planning", "Amdahl explains why adding cores to a service with a serial bottleneck (a lock, a single DB connection) stops helping."],
      ["Benchmarks in PRs", "JMH results justify micro-optimisations instead of one-off nanoTime measurements."]
    ],
    pitfalls: [
      "Parallel streams on small data or cheap operations",
      "Non-splittable sources (LinkedList, iterate, I/O lines)",
      "Shared mutable state or side effects in parallel lambdas",
      "`reduce` with a non-identity seed or non-associative operation",
      "Blocking I/O in the common ForkJoinPool",
      "Forking both halves and joining them (wastes the current thread) or joining before forking",
      "Thresholds that are far too small or too large",
      "Trusting a single nanoTime measurement",
      "Ignoring serial bottlenecks (Amdahl)"
    ],
    quiz: [
      { q: "What is the difference between concurrency and parallelism?", options: ["None", "Concurrency structures many tasks in progress at once; parallelism executes parts of a computation simultaneously for speed", "Parallelism needs locks, concurrency doesn't", "Concurrency is only for I/O"], answer: 1, why: "Concurrency is about dealing with many things; parallelism about doing many things at once." },
      { q: "In a RecursiveTask, what is the recommended split pattern?", options: ["fork both halves, then join both", "fork one half, compute the other directly, then join the forked one", "compute both sequentially", "join then fork"], answer: 1, why: "The current worker does useful work instead of idling, and fewer tasks are created." },
      { q: "In work stealing, which end of a deque do thieves take from?", options: ["The same end as the owner (LIFO)", "The opposite end (FIFO), taking the oldest and largest tasks", "A random position", "Only the middle"], answer: 1, why: "Owner LIFO keeps cache locality; thieves FIFO get big chunks and rarely contend with the owner." },
      { q: "With 25% serial work, what is the maximum speedup regardless of cores?", options: ["2×", "4×", "8×", "Unlimited"], answer: 1, why: "Amdahl's limit is 1/s = 1/0.25 = 4×." },
      { q: "Which source splits worst for a parallel stream?", options: ["int[]", "ArrayList", "IntStream.range", "LinkedList"], answer: 3, why: "LinkedList must be traversed to split; arrays and ArrayList split in O(1)." },
      { q: "What does this print (likely)?", code: `int r = IntStream.rangeClosed(1, 4).boxed().parallel().reduce(10, Integer::sum);
System.out.println(r > 20);`, options: ["false: always 20", "true: the identity 10 is added once per chunk", "Compile error", "Exception"], answer: 1, why: "The seed must be a true identity (0 for sum); here it's added for each split, giving more than 20." },
      { q: "Where do parallel streams run by default?", options: ["A new pool per stream", "The common ForkJoinPool plus the calling thread", "Virtual threads", "The main thread only"], answer: 1, why: "Shared JVM-wide, sized cores − 1 by default." },
      { q: "Why is `System.nanoTime()` around one call a poor benchmark?", options: ["nanoTime is inaccurate", "JIT warm-up, dead-code elimination, GC and noise distort a single measurement; use JMH", "It's not thread-safe", "It measures CPU time only"], answer: 1, why: "The widget's first-run vs warmed-up slide shows how large the effect is." },
      { q: "What happens to fork/join performance with a threshold of 16 elements on 40M elements?", options: ["Fastest possible", "Slower: millions of tiny tasks make overhead dominate", "Same", "StackOverflowError"], answer: 1, why: "Measured: about 3× slower than a 10,000-element threshold on the course box." }
    ],
    cheatsheet: {
      table: [
        ["Task", "Code"],
        ["Divide and conquer", "`class T extends RecursiveTask<V> { compute(): small ? solve : fork left, compute right, join }`"],
        ["Run", "`ForkJoinPool.commonPool().invoke(task)` or `new ForkJoinPool(n).invoke(task)`"],
        ["Parallel stream", "`list.parallelStream().map(f).toList()`"],
        ["Custom pool for a stream", "`pool.submit(() -> list.parallelStream()…).get()`"],
        ["Common pool size", "`-Djava.util.concurrent.ForkJoinPool.common.parallelism=N`"],
        ["Built-ins", "`Arrays.parallelSort`, `parallelPrefix`, `ConcurrentHashMap.reduceValues(th, f)`"],
        ["Amdahl", "`speedup = 1 / (s + (1 − s) / N)`, limit `1/s`"]],
      cards: [
        { title: "Parallel streams help when", items: ["N × Q > 10k", "Splittable source", "Stateless ops", "Cheap merge", "No blocking I/O"] },
        { title: "Fork/Join", items: ["Per-worker deques", "LIFO own, FIFO steal", "fork one, compute one", "Leaves ≈ 10–100 µs"] },
        { title: "Say in interviews", items: ["Concurrency ≠ parallelism", "Work stealing", "Common pool is shared", "Amdahl's 1/s limit", "Benchmark with JMH"] }]
    },
    practice: [
      { level: "Easy", q: "What is the Fork/Join framework?",
        a: ["A Java 7 framework for divide-and-conquer parallelism: ForkJoinPool plus ForkJoinTask subclasses RecursiveTask (returns a value) and RecursiveAction.",
          "compute() splits large problems, forks subtasks, and joins their results.",
          "Uses work stealing: each worker has a deque; idle workers steal from others.",
          "Underlies parallel streams and the default async executor of CompletableFuture."] },
      { level: "Easy", q: "When should you use parallel streams?",
        a: ["Large data and enough CPU work per element (N × Q heuristic > 10,000).",
          "Splittable sources (arrays, ArrayList, ranges) and stateless, side-effect-free operations.",
          "Associative reductions and collectors; few ordering constraints.",
          "Not on request paths of busy services (shared common pool), not with I/O, not for small collections. Measure."] },
      { level: "Easy", q: "Explain work stealing.",
        a: ["Each worker thread owns a double-ended queue of tasks.",
          "It pushes and pops its own tasks LIFO (recent, cache-hot).",
          "Idle workers steal from the head (oldest, larger tasks) of busy workers' deques.",
          "Balances uneven workloads with little contention; joining workers help by running other tasks."] },
      { level: "Medium", q: "Write a RecursiveTask that finds the maximum in an int array.",
        a: ["Base case: below the threshold, scan sequentially.",
          "Otherwise split at mid, fork the left task, compute the right directly, join the left, return the max.",
          "Invoke on a ForkJoinPool."],
        code: `class MaxTask extends RecursiveTask<Integer> {
    final int[] a; final int lo, hi;
    MaxTask(int[] a, int lo, int hi) { this.a = a; this.lo = lo; this.hi = hi; }
    protected Integer compute() {
        if (hi - lo <= 5_000) { int m = Integer.MIN_VALUE; for (int i = lo; i < hi; i++) m = Math.max(m, a[i]); return m; }
        int mid = (lo + hi) >>> 1;
        MaxTask left = new MaxTask(a, lo, mid);
        left.fork();
        int right = new MaxTask(a, mid, hi).compute();
        return Math.max(right, left.join());
    }
}
int[] prices = new Random(7).ints(3_000_000, 1000, 90_000).toArray();
System.out.println(ForkJoinPool.commonPool().invoke(new MaxTask(prices, 0, prices.length)) + " = " + Arrays.stream(prices).max().getAsInt());` },
      { level: "Medium", q: "Why might a parallel stream be slower than a sequential one?",
        a: ["Small data or cheap per-element work: splitting, scheduling and merging cost more than the work.",
          "Poorly splittable source (LinkedList, Stream.iterate, I/O).",
          "Boxing overhead, ordered operations (limit, findFirst, sorted) or expensive merges (e.g. collecting into a TreeMap).",
          "Contention on shared state or synchronized collectors; common pool busy with other work.",
          "Memory-bandwidth-bound operations that don't scale with cores."] },
      { level: "Medium", q: "Explain Amdahl's law with a numeric example.",
        a: ["Speedup(N) = 1 / (s + (1 − s)/N), where s is the serial fraction.",
          "s = 10%, N = 8: 1 / (0.1 + 0.9/8) = 4.7×; N = 64: 8.8×; limit 10×.",
          "Implication: reduce serial parts (locks, single-threaded steps) before adding cores.",
          "Gustafson: with more cores we often process more data in the same time, so scaled speedup can keep growing."] },
      { level: "Medium", q: "How do you run a parallel stream on a dedicated pool, and why would you?",
        a: ["Submit the stream pipeline to a custom ForkJoinPool: `pool.submit(() -> list.parallelStream()...).get()`.",
          "The stream's tasks then run in that pool (implementation behaviour, not a documented guarantee).",
          "Why: isolate heavy batch work from the common pool shared by the rest of the JVM, or cap its parallelism.",
          "Alternative: set common pool parallelism at startup, or use explicit executors."] },
      { level: "Hard", q: "Your service uses `list.parallelStream().map(this::callPricingApi)` and latency is erratic under load. Explain and fix.",
        a: ["Each request's parallel stream runs blocking HTTP calls on the common ForkJoinPool (cores − 1 threads) shared by all requests and other library code.",
          "Under load, requests queue behind each other's blocking calls: starvation, erratic latency.",
          "Fix: use a dedicated bounded I/O executor or virtual threads with CompletableFuture/structured concurrency for fan-out, with timeouts and a semaphore bulkhead.",
          "Keep parallel streams for CPU-bound batch work."] },
      { level: "Hard", q: "How would you benchmark whether a parallel implementation beats a sequential one?",
        a: ["Use JMH: @Benchmark methods for both, @Param for input sizes, @Warmup and @Measurement iterations, @Fork ≥ 2.",
          "Return or Blackhole.consume results to prevent dead-code elimination; set up data in @Setup.",
          "Run on hardware like production (core count, no other load); check error margins.",
          "Also test realistic concurrency: a parallel algorithm may win alone but lose when the service is already using all cores.",
          "Profile (async-profiler/JFR) to understand why."] },
      { level: "Hard", q: "Design a parallel computation of fare statistics (min, max, average per route) over 50 million booking records in memory.",
        steps: ["Store records in an array or ArrayList (splittable); use primitive fields where possible.",
          "Parallel stream with `groupingByConcurrent(route, summarizingLong(fare))` or a custom collector producing per-thread maps merged at the end.",
          "Alternatively, a RecursiveTask over index ranges returning partial `Map<Route, LongSummaryStatistics>` merged on join.",
          "Choose leaf sizes for ~4–10× more tasks than cores; avoid shared mutable maps and boxing in hot loops.",
          "Benchmark sequential vs parallel with JMH; consider memory bandwidth limits; run it on a dedicated pool if inside a service."] }
    ],
    recap: [
      "Fork/Join splits work recursively; fork one half, compute the other, join.",
      "Work stealing (LIFO own, FIFO steal) balances uneven tasks; choose sensible leaf sizes.",
      "Parallel streams use the shared common pool: good for big CPU-bound batch work, bad for I/O and small data.",
      "Avoid side effects; reduce needs associative ops and true identities.",
      "Amdahl caps speedup at 1/s; measure with JMH, not single nanoTime runs."
    ]
  });
})();
