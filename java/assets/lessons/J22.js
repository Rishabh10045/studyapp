/* Lesson J22: CompletableFuture */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Every combination below was run on Java 21; result, stages that ran and elapsed time are what Java reported.
  // key = mask (1 fare fails, 2 seat fails, 4 seat slow 300 ms) + recovery
  var REC = {
    "0none": ["= 5723 INR, seat 12A", "fare,tax,seat,combine", "fast"],
    "0exceptionally": ["= 5723 INR, seat 12A", "fare,tax,seat,combine", "fast"],
    "0handle": ["= handled ok: 5723 INR, seat 12A", "fare,tax,seat,combine,recover", "fast"],
    "0orTimeout": ["= 5723 INR, seat 12A", "fare,tax,seat,combine", "fast"],
    "0completeOnTimeout": ["= 5723 INR, seat 12A", "fare,tax,seat,combine", "fast"],
    "1none": ["join() throws CompletionException → cause IllegalStateException: fare service down", "fare,seat", "fast"],
    "1exceptionally": ["= fallback (CompletionException: fare service down)", "fare,seat,recover", "fast"],
    "1handle": ["= handled error: fare service down", "fare,seat,recover", "fast"],
    "1orTimeout": ["= fallback (CompletionException → IllegalStateException)", "fare,seat,recover", "fast"],
    "1completeOnTimeout": ["join() throws CompletionException → cause IllegalStateException: fare service down", "fare,seat", "fast"],
    "2none": ["join() throws CompletionException → cause IllegalStateException: seat service down", "fare,tax,seat", "fast"],
    "2exceptionally": ["= fallback (CompletionException: seat service down)", "fare,tax,seat,recover", "fast"],
    "2handle": ["= handled error: seat service down", "fare,tax,seat,recover", "fast"],
    "2orTimeout": ["= fallback (CompletionException → IllegalStateException)", "fare,tax,seat,recover", "fast"],
    "2completeOnTimeout": ["join() throws CompletionException → cause IllegalStateException: seat service down", "fare,tax,seat", "fast"],
    "3none": ["join() throws CompletionException → cause IllegalStateException: fare service down", "fare,seat", "fast"],
    "3exceptionally": ["= fallback (CompletionException: fare service down)", "fare,seat,recover", "fast"],
    "3handle": ["= handled error: fare service down", "fare,seat,recover", "fast"],
    "3orTimeout": ["= fallback (CompletionException → IllegalStateException)", "fare,seat,recover", "fast"],
    "3completeOnTimeout": ["join() throws CompletionException → cause IllegalStateException: fare service down", "fare,seat", "fast"],
    "4none": ["= 5723 INR, seat 12A", "fare,tax,seat,combine", "~300 ms"],
    "4exceptionally": ["= 5723 INR, seat 12A", "fare,tax,seat,combine", "~300 ms"],
    "4handle": ["= handled ok: 5723 INR, seat 12A", "fare,tax,seat,combine,recover", "~300 ms"],
    "4orTimeout": ["= fallback (TimeoutException)", "fare,tax,seat,recover", "~100 ms"],
    "4completeOnTimeout": ["= cached quote", "fare,tax,seat", "~100 ms"],
    "5none": ["join() throws CompletionException → cause IllegalStateException: fare service down", "fare,seat", "~300 ms"],
    "5exceptionally": ["= fallback (CompletionException: fare service down)", "fare,seat,recover", "~300 ms"],
    "5handle": ["= handled error: fare service down", "fare,seat,recover", "~300 ms"],
    "5orTimeout": ["= fallback (TimeoutException)", "fare,seat,recover", "~100 ms"],
    "5completeOnTimeout": ["= cached quote", "fare,seat", "~100 ms"],
    "6none": ["join() throws CompletionException → cause IllegalStateException: seat service down", "fare,tax,seat", "~300 ms"],
    "6exceptionally": ["= fallback (CompletionException: seat service down)", "fare,tax,seat,recover", "~300 ms"],
    "6handle": ["= handled error: seat service down", "fare,tax,seat,recover", "~300 ms"],
    "6orTimeout": ["= fallback (TimeoutException)", "fare,tax,seat,recover", "~100 ms"],
    "6completeOnTimeout": ["= cached quote", "fare,tax,seat", "~100 ms"],
    "7none": ["join() throws CompletionException → cause IllegalStateException: fare service down", "fare,seat", "~300 ms"],
    "7exceptionally": ["= fallback (CompletionException: fare service down)", "fare,seat,recover", "~300 ms"],
    "7handle": ["= handled error: fare service down", "fare,seat,recover", "~300 ms"],
    "7orTimeout": ["= fallback (TimeoutException)", "fare,seat,recover", "~100 ms"],
    "7completeOnTimeout": ["= cached quote", "fare,seat", "~100 ms"],
    "_": null
  };
  var RECOVERY = {
    none: { label: "no recovery", code: "quote" },
    exceptionally: { label: "exceptionally", code: "quote.exceptionally(ex -> \"fallback (\" + ex + \")\")" },
    handle: { label: "handle", code: "quote.handle((v, ex) -> ex == null ? \"handled ok: \" + v : \"handled error: \" + ex.getCause().getMessage())" },
    orTimeout: { label: "orTimeout(100 ms) + exceptionally", code: "quote.orTimeout(100, MILLISECONDS)\n     .exceptionally(ex -> \"fallback (\" + ex + \")\")" },
    completeOnTimeout: { label: "completeOnTimeout(100 ms)", code: "quote.completeOnTimeout(\"cached quote\", 100, MILLISECONDS)" }
  };
  function cfWidget(el, ctx) {
    var s = ctx.state; if (s.aFail === undefined) { s.aFail = false; s.bFail = false; s.bSlow = false; s.rec = "none"; }
    el.innerHTML = "<div class='btnrow' data-r='tg'></div><div class='seg' data-r='rec' style='margin-top:8px'>" + Object.keys(RECOVERY).map(function (k) { return "<button type='button' data-v='" + k + "'>" + RECOVERY[k].label + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='code' style='margin-top:10px'></pre><div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("tg").innerHTML = [["aFail", "fare service fails"], ["bFail", "seat service fails"], ["bSlow", "seat service takes 300 ms"]].map(function (t) {
        return "<button type='button' class='btn" + (s[t[0]] ? " primary" : "") + "' data-t='" + t[0] + "'>" + (s[t[0]] ? "✔ " : "") + t[1] + "</button>";
      }).join("");
      q("rec").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s.rec); });
      var mask = (s.aFail ? 1 : 0) + (s.bFail ? 2 : 0) + (s.bSlow ? 4 : 0), r = REC[mask + s.rec], ran = r[1].split(",");
      q("code").innerHTML = ctx.H.highlight("CompletableFuture<Integer> fare = supplyAsync(() -> fareService.get());   // " + (s.aFail ? "throws" : "4850") +
        "\nCompletableFuture<Integer> withTax = fare.thenApply(f -> f * 118 / 100);\nCompletableFuture<String> seat = supplyAsync(() -> seatService.get());      // " + (s.bFail ? "throws" : "\"12A\"") + (s.bSlow ? ", after 300 ms" : "") +
        "\nCompletableFuture<String> quote = withTax.thenCombine(seat, (p, st) -> p + \" INR, seat \" + st);\nString result = " + RECOVERY[s.rec].code + ".join();", "java");
      var failed = function (k) { return (k === "fare" && s.aFail) || (k === "seat" && s.bFail); };
      var cls = function (k) { return ran.indexOf(k) < 0 ? "skip" : failed(k) ? "bad" : "ok"; };
      var ok = r[0].indexOf("= ") === 0;
      var L = ["flowchart LR",
        "  fare[\"supplyAsync: fare\"]:::" + cls("fare"), "  tax[\"thenApply: +18% tax\"]:::" + cls("tax"),
        "  seat[\"supplyAsync: seat" + (s.bSlow ? " (300 ms)" : "") + "\"]:::" + cls("seat"), "  comb[\"thenCombine\"]:::" + cls("combine"),
        "  fare --> tax --> comb", "  seat --> comb"];
      if (s.rec !== "none") { L.push("  rec[\"" + RECOVERY[s.rec].label + "\"]:::" + (ran.indexOf("recover") >= 0 ? "rec" : (s.rec === "completeOnTimeout" && r[0].indexOf("cached") >= 0 ? "rec" : "skip")), "  comb --> rec", "  rec --> out"); }
      else L.push("  comb --> out");
      L.push("  out([\"join()\"]):::" + (ok ? "ok" : "bad"));
      L.push("  classDef ok fill:#e8f5e9,stroke:#2e7d32", "  classDef bad fill:#fdecea,stroke:#c62828", "  classDef skip fill:#f3f4f6,stroke:#9ca3af,stroke-dasharray:4 3,color:#9ca3af", "  classDef rec fill:#fff3e0,stroke:#ef6c00");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var notes = [];
      if (s.aFail && ran.indexOf("tax") < 0) notes.push("`thenApply` was **skipped**: dependent stages don't run when their input failed; the exception just propagates.");
      if (s.aFail && s.bSlow) notes.push("Even though the fare failed at once, `thenCombine` **waited for the slow seat call** (~300 ms) before failing: it doesn't fail fast. Use `orTimeout`, or `allOf` with explicit checks.");
      if (/CompletionException/.test(r[0]) && s.rec === "exceptionally") notes.push("`exceptionally` received a **CompletionException wrapping** the real error, because the failure came from an upstream stage. Unwrap with `ex.getCause()`.");
      if (s.rec === "handle") notes.push("`handle` runs on **both** success and failure (it saw `ex == null` on success).");
      if (/TimeoutException/.test(r[0])) notes.push("`orTimeout` completed the stage with a raw `TimeoutException` after 100 ms. The slow seat task **kept running** in the background: timeouts don't cancel the work.");
      if (/cached quote/.test(r[0])) notes.push("`completeOnTimeout` supplied a default value after 100 ms; failures that arrive *before* the timeout are still failures (try fare fails without slow).");
      if (s.rec === "completeOnTimeout" && !ok) notes.push("`completeOnTimeout` doesn't recover from exceptions; combine it with `exceptionally`.");
      if (!ok && s.rec === "none") notes.push("`join()` throws an unchecked `CompletionException` (`get()` would throw a checked `ExecutionException`).");
      q("res").innerHTML = ctx.md("**Result:** `" + r[0] + "`  ·  **elapsed:** " + r[2] + "  ·  **stages that ran:** " + ran.join(", ").replace("recover", "recovery") + "\n\n" + notes.join(" "));
    }
    q("tg").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s[b.dataset.t] = !s[b.dataset.t]; ctx.save(); draw(); });
    q("rec").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.rec = b.dataset.v; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "From Future to CompletableFuture",
      text: "A plain `Future` (J16) can only be **polled or blocked on** with `get()`: you can't say *when it's done, do this*, combine two futures, or recover from failure without tying up a thread. `CompletableFuture<T>` (Java 8) is a future you can **compose**: attach callbacks that run when it completes, chain dependent async steps, combine independent ones, handle errors and timeouts, all **without blocking** until the very end. It also implements `CompletionStage`, the interface many libraries (HttpClient, Spring, R2DBC drivers) return.",
      m: M(["flowchart LR",
        "  A[\"supplyAsync: fetch fare\"]:::s1 --> B[\"thenApply: add tax\"]:::s1",
        "  C[\"supplyAsync: fetch seat\"]:::s1 --> D[\"thenCombine\"]:::s2",
        "  B --> D",
        "  D --> E[\"exceptionally: fallback\"]:::s4",
        "  E --> F([\"join() once, at the edge\"]):::s0",
        "  classDef s0 fill:#f3f4f6,stroke:#6b7280", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00"]),
      code: `ExecutorService io = Executors.newFixedThreadPool(4);
Future<Integer> plain = io.submit(() -> 4850);
int fare = plain.get();                                              // blocks the caller to do anything with the result
System.out.println("Future: " + (fare * 118 / 100));

CompletableFuture<Integer> cf = CompletableFuture.supplyAsync(() -> 4850, io);
CompletableFuture<String> quote = cf.thenApply(f -> f * 118 / 100)  // runs when ready, no thread waits
                                    .thenApply(p -> "₹" + p + " incl. tax");
System.out.println("CompletableFuture: " + quote.join());
io.shutdown();`,
      analogy: "A Future is a receipt: you stand at the counter until your order is ready. A CompletableFuture is an order with instructions: when it's ready, wrap it, add the drink, and deliver it to table 7." },
    { title: "Creating CompletableFutures",
      text: "`supplyAsync(supplier, executor)` runs a task that returns a value; `runAsync(runnable, executor)` one that doesn't. **Without an executor they run on `ForkJoinPool.commonPool()`**, which is shared by the whole JVM and sized for CPU work, so pass your own executor for anything that blocks. `completedFuture(v)` / `failedFuture(ex)` create already-finished futures (handy in tests and caches). `new CompletableFuture<>()` plus `complete(v)` / `completeExceptionally(ex)` turns it into a **promise** you complete yourself, e.g. from a callback-based API.",
      code: `ExecutorService io = Executors.newFixedThreadPool(2, Thread.ofPlatform().name("io-", 0).factory());
CompletableFuture<String> a = CompletableFuture.supplyAsync(() -> Thread.currentThread().getName(), io);
CompletableFuture<String> b = CompletableFuture.supplyAsync(() -> Thread.currentThread().getName());
System.out.println("with executor: " + a.join() + ", default: " + b.join().replaceAll("\\\\d+$", "N"));

CompletableFuture<String> cached = CompletableFuture.completedFuture("cached fare 4850");
CompletableFuture<String> failed = CompletableFuture.failedFuture(new IllegalStateException("no route"));
System.out.println(cached.join() + " | failed? " + failed.isCompletedExceptionally());

CompletableFuture<String> promise = new CompletableFuture<>();
io.submit(() -> { try { Thread.sleep(20); } catch (InterruptedException e) { } promise.complete("PNR-42 confirmed by callback"); });
System.out.println(promise.join());
io.shutdown();` },
    { title: "Transforming: thenApply, thenAccept, thenRun, thenCompose",
      text: "`thenApply(fn)` maps the result (like `Stream.map`/`Optional.map`); `thenAccept(consumer)` consumes it; `thenRun(runnable)` just runs afterwards. When the next step is **itself asynchronous** (returns a `CompletableFuture`), use **`thenCompose`**: `thenApply` would give you a `CompletableFuture<CompletableFuture<T>>`. `thenCompose` is the `flatMap` of futures: it's how you chain dependent remote calls (look up the user, then their bookings).",
      code: `ExecutorService io = Executors.newFixedThreadPool(2);
Function<String, CompletableFuture<Integer>> loyaltyPoints = user -> CompletableFuture.supplyAsync(() -> user.length() * 100, io);   // async call
CompletableFuture<String> user = CompletableFuture.supplyAsync(() -> "rishabh", io);

CompletableFuture<CompletableFuture<Integer>> nested = user.thenApply(loyaltyPoints);    // awkward nesting
CompletableFuture<Integer> flat = user.thenCompose(loyaltyPoints);                        // flattened
System.out.println("thenApply gives " + nested.join().getClass().getSimpleName() + " inside; thenCompose gives " + flat.join());

user.thenApply(String::toUpperCase)
    .thenAccept(u -> System.out.println("hello " + u))
    .thenRun(() -> System.out.println("audit logged"))
    .join();
io.shutdown();` },
    { title: "Combining independent futures",
      text: "Start independent calls **first**, then combine: `a.thenCombine(b, fn)` waits for both and merges; `allOf(f1, f2, …)` returns a `CompletableFuture<Void>` that completes when all do (then read each result with `join()`, which no longer blocks); `anyOf(…)` completes with the first to finish (result typed `Object`). Fan-out total time ≈ the **slowest** call instead of the sum. Note: `thenCombine` and `allOf` wait for **all** inputs even if one fails early (the widget shows this).",
      code: `ExecutorService io = Executors.newFixedThreadPool(8);
Function<Integer, Supplier<Integer>> slowCall = ms -> () -> { try { Thread.sleep(ms); } catch (InterruptedException e) { } return ms; };
long t0 = System.nanoTime();
List<CompletableFuture<Integer>> calls = List.of(100, 150, 120).stream()
    .map(ms -> CompletableFuture.supplyAsync(slowCall.apply(ms), io)).toList();     // all started now
CompletableFuture<Void> all = CompletableFuture.allOf(calls.toArray(CompletableFuture[]::new));
List<Integer> results = all.thenApply(v -> calls.stream().map(CompletableFuture::join).toList()).join();
System.out.println(results + " in ~" + (System.nanoTime() - t0) / 1_000_000 / 50 * 50 + " ms (sum would be 370)");

CompletableFuture<Integer> fare = CompletableFuture.supplyAsync(() -> 4850, io);
CompletableFuture<String> seat = CompletableFuture.supplyAsync(() -> "12A", io);
System.out.println(fare.thenCombine(seat, (f, s) -> f + " / " + s).join());
Object first = CompletableFuture.anyOf(CompletableFuture.supplyAsync(slowCall.apply(80), io), CompletableFuture.supplyAsync(slowCall.apply(20), io)).join();
System.out.println("anyOf → " + first);
io.shutdown();`,
      points: ["Common mistake: `supplyAsync(a).thenCompose(x -> supplyAsync(b))` for independent calls runs them sequentially"] },
    { title: "Which thread runs my callback?",
      text: "A non-async callback (`thenApply`) runs on **whichever thread completes the previous stage**, or on the **caller's thread** if the stage is already complete when you attach it. So a cheap transformation may run on an I/O pool thread, an HTTP client thread, or your request thread. The `…Async` variants (`thenApplyAsync(fn, executor)`) always hand off to an executor: use them when the callback is slow or blocking, or must run on a specific pool. Without an executor argument, `…Async` uses the common pool.",
      code: `ExecutorService io = Executors.newSingleThreadExecutor(Thread.ofPlatform().name("io").factory());
ExecutorService cpu = Executors.newSingleThreadExecutor(Thread.ofPlatform().name("cpu").factory());
CompletableFuture<String> slow = CompletableFuture.supplyAsync(() -> { try { Thread.sleep(50); } catch (InterruptedException e) { } return "x"; }, io);
CompletableFuture<String> a = slow.thenApply(x -> "thenApply on " + Thread.currentThread().getName());          // attached before completion
CompletableFuture<String> b = slow.thenApplyAsync(x -> "thenApplyAsync on " + Thread.currentThread().getName(), cpu);
System.out.println(a.join() + " | " + b.join());
CompletableFuture<String> done = CompletableFuture.completedFuture("x");
System.out.println(done.thenApply(x -> "already complete → runs on " + Thread.currentThread().getName()).join());
io.shutdown(); cpu.shutdown();` },
    { title: "Handling errors",
      text: "An exception in any stage completes it **exceptionally**; dependent stages are **skipped** and the failure propagates. Recover with `exceptionally(ex -> fallback)` (failure only), `handle((value, ex) -> …)` (always; one of them is null), or observe with `whenComplete((v, ex) -> log)` (doesn't change the result). Java 12 added `exceptionallyCompose` for async fallbacks. The exception you receive is often a **`CompletionException` wrapping** the real cause (when it came from an upstream stage), so unwrap with `getCause()`. `join()` throws `CompletionException`, `get()` the checked `ExecutionException`.",
      code: `Function<Throwable, Throwable> unwrap = ex -> ex instanceof CompletionException && ex.getCause() != null ? ex.getCause() : ex;
CompletableFuture<Integer> fare = CompletableFuture.supplyAsync(() -> { throw new IllegalStateException("fare service down"); });
String r1 = fare.thenApply(f -> "never runs " + f)
    .whenComplete((v, ex) -> System.out.println("log: " + (ex == null ? v : "failed with " + ex.getClass().getSimpleName())))
    .exceptionally(ex -> "fallback, cause: " + unwrap.apply(ex).getMessage())
    .join();
System.out.println(r1);
String r2 = fare.handle((v, ex) -> ex == null ? "ok " + v : "handled " + unwrap.apply(ex).getClass().getSimpleName()).join();
System.out.println(r2);
CompletableFuture<String> viaBackup = fare.thenApply(String::valueOf)
    .exceptionallyCompose(ex -> CompletableFuture.supplyAsync(() -> "4999 from backup provider"));
System.out.println(viaBackup.join());
try { fare.join(); } catch (CompletionException e) { System.out.println("join → CompletionException(" + e.getCause().getMessage() + ")"); }
try { fare.get(); } catch (ExecutionException e) { System.out.println("get → ExecutionException(" + e.getCause().getMessage() + ")"); }` },
    { title: "Timeouts and cancellation",
      text: "Java 9 added `orTimeout(t, unit)` (complete exceptionally with `TimeoutException`) and `completeOnTimeout(value, t, unit)` (complete with a default). Both only complete **the future**: the underlying task **keeps running**. Likewise `cancel(true)` on a CompletableFuture marks it cancelled but **does not interrupt** the thread doing the work (unlike `FutureTask`). So give the remote call itself a timeout (HTTP client, JDBC query timeout) and use the future timeout as a safety net.",
      code: `ExecutorService io = Executors.newFixedThreadPool(2);
AtomicBoolean taskFinished = new AtomicBoolean();
Supplier<String> slowSeatService = () -> { try { Thread.sleep(300); } catch (InterruptedException e) { return "interrupted"; } taskFinished.set(true); return "12A"; };

CompletableFuture<String> t1 = CompletableFuture.supplyAsync(slowSeatService, io).orTimeout(100, TimeUnit.MILLISECONDS);
try { t1.join(); } catch (CompletionException e) { System.out.println("orTimeout → " + e.getCause().getClass().getSimpleName()); }
String t2 = CompletableFuture.supplyAsync(slowSeatService, io).completeOnTimeout("seat TBD", 100, TimeUnit.MILLISECONDS).join();
System.out.println("completeOnTimeout → " + t2);
CompletableFuture<String> t3 = CompletableFuture.supplyAsync(slowSeatService, io);
System.out.println("cancel(true) → " + t3.cancel(true) + ", isCancelled " + t3.isCancelled());
Thread.sleep(400);
System.out.println("but the underlying task still finished: " + taskFinished.get());
io.shutdown();` },
    { title: "Don't block the common pool",
      text: "The default executor, `ForkJoinPool.commonPool()`, has **cores − 1** threads and is shared with parallel streams and every library that uses default async methods. Blocking calls (HTTP, JDBC, `Thread.sleep`, `join()` inside a callback) there starve everything else in the JVM. Rules: pass a dedicated, bounded **I/O executor** to `supplyAsync`/`…Async`; keep the common pool for short CPU work; never `join()` inside a callback on a bounded pool (if all its threads wait for tasks queued behind them, it deadlocks); on Java 21 a virtual-thread executor is a good I/O executor.",
      code: `System.out.println("common pool parallelism: " + ForkJoinPool.commonPool().getParallelism() + " on " + Runtime.getRuntime().availableProcessors() + " cores");
int n = 16;
long t0 = System.nanoTime();
List<CompletableFuture<Void>> onCommon = new ArrayList<>();
for (int i = 0; i < n; i++) onCommon.add(CompletableFuture.runAsync(() -> { try { Thread.sleep(100); } catch (InterruptedException e) { } }));
CompletableFuture.allOf(onCommon.toArray(CompletableFuture[]::new)).join();
long commonMs = (System.nanoTime() - t0) / 1_000_000;
t0 = System.nanoTime();
try (ExecutorService vts = Executors.newVirtualThreadPerTaskExecutor()) {
    List<CompletableFuture<Void>> onVts = new ArrayList<>();
    for (int i = 0; i < n; i++) onVts.add(CompletableFuture.runAsync(() -> { try { Thread.sleep(100); } catch (InterruptedException e) { } }, vts));
    CompletableFuture.allOf(onVts.toArray(CompletableFuture[]::new)).join();
}
System.out.println(n + " blocking 100 ms calls: common pool " + (commonMs / 100 * 100) + "+ ms, virtual threads " + (System.nanoTime() - t0) / 1_000_000 / 100 * 100 + "+ ms");`,
      points: ["The common pool may add compensating threads for some blocking operations, but don't rely on it"] },
    { title: "Fan-out with per-call timeouts and partial results",
      text: "A typical aggregator (flight search across airlines) starts all calls, gives **each** a timeout and a fallback so one slow or failing provider can't ruin the response, then joins them all. Each future is turned into a result that always completes normally (value or 'unavailable'), so `allOf` can't fail and the response contains whatever arrived in time.",
      code: `record AirlineQuote(String airline, Integer fare, String status) { }
ExecutorService io = Executors.newVirtualThreadPerTaskExecutor();
Map<String, Integer> latencyMs = Map.of("6E", 40, "AI", 250, "UK", 60, "SG", -1);   // -1 = failing provider
Function<String, CompletableFuture<AirlineQuote>> quote = airline -> CompletableFuture
    .supplyAsync(() -> {
        int ms = latencyMs.get(airline);
        if (ms < 0) throw new IllegalStateException(airline + " 503");
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        return new AirlineQuote(airline, 4000 + ms * 10, "ok");
    }, io)
    .completeOnTimeout(new AirlineQuote(airline, null, "timeout"), 150, TimeUnit.MILLISECONDS)
    .exceptionally(ex -> new AirlineQuote(airline, null, "error"));
long t0 = System.nanoTime();
List<CompletableFuture<AirlineQuote>> all = new TreeSet<>(latencyMs.keySet()).stream().map(quote).toList();
List<AirlineQuote> results = CompletableFuture.allOf(all.toArray(CompletableFuture[]::new))
    .thenApply(v -> all.stream().map(CompletableFuture::join).toList()).join();
results.forEach(System.out::println);
System.out.println("responded in ~" + (System.nanoTime() - t0) / 1_000_000 / 50 * 50 + " ms");
io.close();` },
    { title: "Getting the result: join, get, getNow, state",
      text: "Block only at the **edge** (a main method, a test, a controller that must return a value); inside the pipeline stay non-blocking. Spring MVC and WebFlux controllers can **return** a `CompletableFuture` and Spring completes the HTTP response when it finishes, freeing the request thread.",
      table: [
        ["Method", "Behaviour"],
        ["`join()`", "Blocks; throws unchecked `CompletionException` / `CancellationException`"],
        ["`get()` / `get(t, unit)`", "Blocks; checked `ExecutionException`, `InterruptedException`, `TimeoutException`"],
        ["`getNow(default)`", "Never blocks: result if done, else the default"],
        ["`resultNow()` / `exceptionNow()` (Java 19)", "For completed futures; throw `IllegalStateException` otherwise"],
        ["`state()` (Java 19)", "`RUNNING`, `SUCCESS`, `FAILED`, `CANCELLED`"],
        ["`isDone()`, `isCompletedExceptionally()`", "Polling checks"]],
      code: `CompletableFuture<String> pending = new CompletableFuture<>();
System.out.println("getNow → " + pending.getNow("not yet") + ", state " + pending.state());
pending.complete("PNR-42");
System.out.println("resultNow → " + pending.resultNow() + ", state " + pending.state());
CompletableFuture<String> bad = CompletableFuture.failedFuture(new IOException("timeout talking to GDS"));
System.out.println("state " + bad.state() + ", exceptionNow → " + bad.exceptionNow().getMessage());
try { pending.get(10, TimeUnit.MILLISECONDS); System.out.println("get with timeout ok"); } catch (TimeoutException e) { System.out.println("timed out"); }` },
    { title: "CompletableFuture, virtual threads and reactive",
      text: "CompletableFuture shines for **composing** a handful of async steps and fan-outs. Its costs: callback-style code, stack traces that don't show the logical flow, and manual context propagation (MDC, security context: J16, J24). With **virtual threads** (J25) you can often write the same flow as plain blocking code (`var fare = fareClient.get();`) on a virtual thread, and use **structured concurrency** for fan-out. **Reactive** libraries (Reactor, WebFlux) handle streams of values and back-pressure. Many codebases mix them: know how to convert (`Mono.fromFuture`, `toCompletableFuture`).",
      table: [
        ["Need", "Good fit"],
        ["Compose a few async calls, fan-out/fan-in", "CompletableFuture"],
        ["Blocking-style code with massive concurrency", "Virtual threads (+ structured concurrency)"],
        ["Streams of events, back-pressure, non-blocking end to end", "Reactor / WebFlux"],
        ["Spring `@Async` methods", "Return `CompletableFuture<T>`"],
        ["Callback API → future", "`new CompletableFuture<>()` + `complete` in the callback"]],
      code: `ExecutorService vts = Executors.newVirtualThreadPerTaskExecutor();
Supplier<Integer> fareClient = () -> { try { Thread.sleep(30); } catch (InterruptedException e) { } return 4850; };
Supplier<String> seatClient = () -> { try { Thread.sleep(30); } catch (InterruptedException e) { } return "12A"; };

String withCf = CompletableFuture.supplyAsync(fareClient, vts)
    .thenCombine(CompletableFuture.supplyAsync(seatClient, vts), (f, s) -> f + "/" + s).join();

Future<String> blockingStyle = vts.submit(() -> {                         // same flow, straight-line code on a virtual thread
    Future<String> seat = vts.submit(seatClient::get);
    int fare = fareClient.get();
    return fare + "/" + seat.get();
});
System.out.println("CompletableFuture: " + withCf + " | virtual-thread style: " + blockingStyle.get());
vts.close();` }
  ];

  H.registerLesson({
    code: "J22",
    summary: "Composable asynchronous programming with `CompletableFuture`: why `Future` isn't enough, creating futures and promises, `thenApply`/`thenAccept`/`thenRun` and `thenCompose` (flatMap), combining with `thenCombine`, `allOf` and `anyOf`, which thread runs callbacks and the `…Async` variants, error handling with `exceptionally`, `handle`, `whenComplete` and `exceptionallyCompose` (and `CompletionException` wrapping), `orTimeout`/`completeOnTimeout` and why cancellation doesn't interrupt, the common-pool trap, fan-out with per-call fallbacks, the ways to read a result, and how it relates to virtual threads and reactive code.",
    slides: SLIDES,
    widget: { heading: "Interactive: a CompletableFuture pipeline under failure", caption: "Make the fare or seat service fail or slow down and pick a recovery operator. Every one of the 40 combinations was run on Java 21: the result, which stages actually ran and the elapsed time are what Java reported.", render: cfWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Aggregators", "Search, pricing and dashboard endpoints fan out to several services in parallel and merge results with allOf/thenCombine."],
      ["Spring @Async", "Methods annotated `@Async` return `CompletableFuture<T>`; controllers can return futures to free request threads."],
      ["HTTP clients", "`java.net.http.HttpClient.sendAsync` and many SDKs (AWS SDK v2) return CompletableFutures."],
      ["Graceful degradation", "`completeOnTimeout` and `exceptionally` provide cached or partial results when a dependency is slow."],
      ["Callback adapters", "Kafka producer callbacks or legacy listener APIs are wrapped into futures with `complete`/`completeExceptionally`."],
      ["Incidents", "Thread starvation from blocking calls on the common pool, and lost exceptions from futures nobody joined."]
    ],
    pitfalls: [
      "Blocking I/O on the default common pool",
      "Calling `join()`/`get()` inside callbacks, or in the middle of a pipeline",
      "Using `thenApply` where `thenCompose` is needed (nested futures)",
      "Chaining independent calls with thenCompose (sequential instead of parallel)",
      "Forgetting that exceptions arrive wrapped in CompletionException",
      "Fire-and-forget futures whose exceptions nobody observes",
      "Assuming `cancel(true)` or `orTimeout` stops the underlying work",
      "Side effects in callbacks that may run on unexpected threads",
      "Losing MDC/security context across async stages"
    ],
    quiz: [
      { q: "When should you use `thenCompose` instead of `thenApply`?", options: ["When the function is slow", "When the function itself returns a CompletableFuture (a dependent async step)", "When combining two independent futures", "Never; they're equivalent"], answer: 1, why: "thenCompose flattens the result like flatMap; thenApply would produce CompletableFuture<CompletableFuture<T>>." },
      { q: "Where does `supplyAsync(supplier)` without an executor run?", options: ["A new thread per task", "ForkJoinPool.commonPool()", "The caller's thread", "A virtual thread"], answer: 1, why: "The JVM-wide common pool (cores − 1 threads). Pass your own executor for blocking work." },
      { q: "What does this print?", code: `CompletableFuture<Integer> f = CompletableFuture.supplyAsync(() -> { throw new IllegalStateException("x"); });
String r = f.thenApply(v -> "A")
            .exceptionally(ex -> ex.getClass().getSimpleName())
            .join();
System.out.println(r);`, options: ["A", "IllegalStateException", "CompletionException", "It throws"], answer: 2, why: "The exception came from an upstream stage, so exceptionally sees it wrapped in CompletionException. Use ex.getCause()." },
      { q: "Fare fails immediately, seat takes 300 ms. How long until `fare.thenCombine(seat, fn).join()` throws?", options: ["Immediately", "About 300 ms: thenCombine waits for both inputs", "Never", "It doesn't throw; it returns null"], answer: 1, why: "As the widget's recorded runs show, thenCombine completes only after both inputs complete." },
      { q: "What does `orTimeout(100, MILLISECONDS)` do to the running task when it fires?", options: ["Interrupts it", "Nothing: it completes the future with TimeoutException; the task keeps running", "Cancels the executor", "Retries it"], answer: 1, why: "Same for cancel(true) on CompletableFuture. Put timeouts on the actual I/O as well." },
      { q: "Which recovers from failure **and** sees successful values?", options: ["exceptionally", "handle", "thenApply", "orTimeout"], answer: 1, why: "handle((v, ex) -> …) runs in both cases; whenComplete observes both but can't change the result." },
      { q: "On which thread does a non-async `thenApply` callback run?", options: ["Always the common pool", "The thread that completes the previous stage, or the caller's thread if it was already complete", "Always a new thread", "The main thread"], answer: 1, why: "Use the …Async variants with an executor to control where callbacks run." },
      { q: "How do you wait for a list of futures and collect their results?", options: ["Call get() on each in a loop", "`allOf(array).thenApply(v -> list.stream().map(CompletableFuture::join).toList())`", "anyOf", "thenCombine in a loop"], answer: 1, why: "allOf returns CompletableFuture<Void>; after it completes, join() on each returns immediately. A get() loop also works but blocks." },
      { q: "Difference between `join()` and `get()`?", options: ["None", "join throws unchecked CompletionException; get throws checked ExecutionException and InterruptedException", "join never blocks", "get is non-blocking"], answer: 1, why: "join is convenient in lambdas and streams because it doesn't throw checked exceptions." }
    ],
    cheatsheet: {
      table: [
        ["Task", "Code"],
        ["Start async", "`supplyAsync(() -> call(), ioExecutor)`"],
        ["Map / consume", "`thenApply(fn)`, `thenAccept(c)`, `thenRun(r)`"],
        ["Dependent async step", "`thenCompose(x -> callAsync(x))`"],
        ["Two independent", "`a.thenCombine(b, (x, y) -> …)`"],
        ["Many", "`allOf(fs).thenApply(v -> fs.stream().map(CompletableFuture::join).toList())`"],
        ["Recover", "`exceptionally(ex -> fallback)`, `handle((v, ex) -> …)`, `exceptionallyCompose`"],
        ["Timeout", "`orTimeout(t, unit)`, `completeOnTimeout(default, t, unit)`"],
        ["Promise", "`var p = new CompletableFuture<T>(); … p.complete(v)`"]],
      cards: [
        { title: "Threads", items: ["Default: common pool", "Pass an I/O executor", "thenX runs on completing thread", "…Async(fn, executor) to hop"] },
        { title: "Errors", items: ["Dependent stages skipped", "CompletionException wraps", "join unchecked, get checked", "Timeouts don't stop work"] },
        { title: "Say in interviews", items: ["thenApply = map, thenCompose = flatMap", "Start independent calls first", "allOf + join", "Never block the common pool", "Per-call fallbacks"] }]
    },
    practice: [
      { level: "Easy", q: "Future vs CompletableFuture?",
        a: ["Future: result of an async task; only get() (blocking), isDone, cancel.",
          "CompletableFuture: implements Future and CompletionStage; can be completed manually; supports callbacks (thenApply…), composition (thenCompose), combination (thenCombine, allOf, anyOf), error handling and timeouts without blocking.",
          "Lets you build non-blocking pipelines and block (if at all) only at the edge."] },
      { level: "Easy", q: "thenApply vs thenCompose vs thenCombine?",
        a: ["thenApply(fn): transform the result synchronously (map).",
          "thenCompose(fn): fn returns a CompletableFuture; flatten it (flatMap) for dependent async calls.",
          "thenCombine(other, fn): combine with an independent future when both complete."],
        code: `ExecutorService io = Executors.newFixedThreadPool(2);
CompletableFuture<String> user = CompletableFuture.supplyAsync(() -> "u42", io);
CompletableFuture<Integer> fare = CompletableFuture.supplyAsync(() -> 4850, io);
String r = user.thenApply(String::toUpperCase)
    .thenCompose(u -> CompletableFuture.supplyAsync(() -> u + " has 3 bookings", io))
    .thenCombine(fare, (s, f) -> s + ", cheapest " + f)
    .join();
System.out.println(r);
io.shutdown();` },
      { level: "Easy", q: "How do you handle exceptions in a CompletableFuture chain?",
        a: ["exceptionally(ex -> fallback) recovers from failures only.",
          "handle((v, ex) -> …) runs for both outcomes and can change the result.",
          "whenComplete((v, ex) -> …) observes (logging, metrics) without changing the result.",
          "exceptionallyCompose(ex -> otherFuture) for async fallbacks (Java 12+).",
          "Unwrap CompletionException with getCause() to get the original exception."] },
      { level: "Medium", q: "Call three independent services in parallel and return all results, failing if any fails.",
        a: ["Start all three supplyAsync calls on an I/O executor before waiting on anything.",
          "allOf(...) then map to the list of joined results.",
          "If any fails, allOf completes exceptionally (after all have completed) and join throws CompletionException.",
          "Add orTimeout to bound the total time."],
        code: `ExecutorService io = Executors.newFixedThreadPool(3);
List<Supplier<String>> services = List.of(() -> "profile", () -> "bookings", () -> "offers");
List<CompletableFuture<String>> fs = services.stream().map(s -> CompletableFuture.supplyAsync(s, io)).toList();
List<String> all = CompletableFuture.allOf(fs.toArray(CompletableFuture[]::new))
    .orTimeout(1, TimeUnit.SECONDS)
    .thenApply(v -> fs.stream().map(CompletableFuture::join).toList())
    .join();
System.out.println(all);
io.shutdown();` },
      { level: "Medium", q: "Why is calling blocking code in supplyAsync without an executor a problem?",
        a: ["It runs on ForkJoinPool.commonPool, shared by the whole JVM (parallel streams, other libraries) and sized cores − 1.",
          "Blocking calls occupy those few threads, so other async work and parallel streams stall: throughput collapses and latency spikes.",
          "Pass a dedicated, bounded I/O executor (or a virtual-thread executor on Java 21) and keep the common pool for short CPU work."] },
      { level: "Medium", q: "Convert a callback-based API into a CompletableFuture.",
        a: ["Create `new CompletableFuture<T>()`.",
          "In the success callback call complete(value); in the failure callback completeExceptionally(error).",
          "Return the future; callers compose on it.",
          "Optionally apply orTimeout in case the callback never fires."],
        code: `interface FareCallback { void onFare(int fare); void onError(Exception e); }
BiConsumer<String, FareCallback> legacyApi = (route, cb) -> new Thread(() -> { if (route.isEmpty()) cb.onError(new IllegalArgumentException("route")); else cb.onFare(4850); }).start();
Function<String, CompletableFuture<Integer>> fareAsync = route -> {
    CompletableFuture<Integer> f = new CompletableFuture<>();
    legacyApi.accept(route, new FareCallback() {
        public void onFare(int fare) { f.complete(fare); }
        public void onError(Exception e) { f.completeExceptionally(e); }
    });
    return f.orTimeout(1, TimeUnit.SECONDS);
};
System.out.println(fareAsync.apply("DEL-BOM").join());
System.out.println(fareAsync.apply("").exceptionally(ex -> -1).join());` },
      { level: "Medium", q: "What's the difference between thenApply and thenApplyAsync?",
        a: ["thenApply runs the function on the thread that completes the previous stage (or the caller if already complete).",
          "thenApplyAsync submits it to an executor (the common pool by default, or the one you pass).",
          "Use Async with an explicit executor when the callback is slow/blocking or must run on a specific pool; plain thenApply for cheap transformations."] },
      { level: "Hard", q: "Design a flight search that queries 10 airlines with a 2-second overall budget and returns whatever arrived.",
        a: ["Start one future per airline on an I/O executor (virtual threads are a good fit).",
          "Each future gets `completeOnTimeout(Unavailable, 2s)` and `exceptionally(ex -> Unavailable)` so it always completes normally.",
          "allOf, then collect results; filter out unavailable; sort by price.",
          "Also set HTTP client timeouts so stalled calls release resources; record per-airline latency and errors in metrics.",
          "Optionally cache last-known fares as the fallback value."] },
      { level: "Hard", q: "This code sometimes hangs in production. Why?",
        qcode: `ExecutorService pool = Executors.newFixedThreadPool(4);
CompletableFuture<List<String>> result = CompletableFuture.supplyAsync(() -> {
    List<CompletableFuture<String>> parts = ids.stream()
        .map(id -> CompletableFuture.supplyAsync(() -> load(id), pool)).toList();
    return parts.stream().map(CompletableFuture::join).toList();   // waits inside a pool task
}, pool);`, qNoCompile: true,
        a: ["The outer task runs on the same 4-thread pool and blocks in join() waiting for inner tasks queued on that pool.",
          "With 4+ concurrent requests, all 4 threads are outer tasks waiting for inner tasks that can never start: thread-starvation deadlock.",
          "Fix: don't block inside the pipeline; build it with allOf/thenApply and join only at the edge; or use separate pools for outer and inner work; or virtual threads.",
          "Also add timeouts so such bugs fail instead of hanging."] },
      { level: "Hard", q: "How do you propagate the request's trace id (MDC) through a CompletableFuture pipeline?",
        a: ["MDC is ThreadLocal-based and stages run on different threads, so the context is missing in callbacks.",
          "Wrap the executor you pass to every async stage with a decorator that captures the MDC map on submit and restores/clears it in the task (J16).",
          "Remember non-async callbacks run on whichever thread completed the previous stage, which might be an unwrapped thread: use …Async with the decorated executor for stages that log.",
          "Or use Micrometer context-propagation / Spring's TaskDecorator, or structured concurrency + scoped values with virtual threads."] }
    ],
    recap: [
      "CompletableFuture composes async work: thenApply (map), thenCompose (flatMap), thenCombine/allOf/anyOf (combine).",
      "Start independent calls before waiting; join only at the edge.",
      "Pass an I/O executor: the default common pool is small and shared.",
      "Failures skip dependent stages; recover with exceptionally/handle and unwrap CompletionException.",
      "orTimeout/completeOnTimeout bound waiting but don't stop the work; give the I/O its own timeout."
    ]
  });
})();
