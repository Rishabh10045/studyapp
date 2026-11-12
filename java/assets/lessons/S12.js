/* Lesson S12: @Async & @Scheduled */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded from real Spring Boot 3.4 contexts: @EnableAsync with Boot's applicationTaskExecutor, an AsyncConfigurer exception handler,
  // an MDC TaskDecorator, virtual threads; a ThreadPoolTaskExecutor (core 2, queue 3, max 4) fed 10 tasks of 300 ms;
  // @Scheduled fixedRate/fixedDelay jobs that take 300 ms; a slow report job starving a heartbeat on a 1-thread scheduler;
  // and two app contexts ("pods") sharing one H2 database with ShedLock. Times are ms since the first run.
  var REC = {"async":["caller (main) got 3 futures after 6 ms","sent to a@x.in on task-1","sent to b@x.in on task-2","sent to c@x.in on task-3","all done after 111 ms (3 x 100 ms in parallel)","executor bean: ThreadPoolTaskExecutor","uncaught handler: fireAndForget threw SMTP down on task-4","CompletableFuture.get() threw: java.lang.IllegalStateException: SMTP down","viaSelf(): sent to self on main (self-invocation is NOT async)","caller: thread=main MDC orderId=ORD-42 txActive=true\nasync : thread=task-6 MDC orderId=null txActive=false","with MDC TaskDecorator -> thread=task-1 MDC orderId=ORD-42 txActive=false","spring.threads.virtual.enabled=true -> VirtualThread[#58,task-1]/runnable@ForkJoinPool-1-worker-1 (executor SimpleAsyncTaskExecutor)"],"executor":[{"task":1,"submit":"accepted","poolSize":1,"queue":0,"ranOn":"pool-1","startMs":0},{"task":2,"submit":"accepted","poolSize":2,"queue":0,"ranOn":"pool-2","startMs":5},{"task":3,"submit":"accepted","poolSize":2,"queue":1,"ranOn":"pool-1","startMs":300},{"task":4,"submit":"accepted","poolSize":2,"queue":2,"ranOn":"pool-2","startMs":305},{"task":5,"submit":"accepted","poolSize":2,"queue":3,"ranOn":"pool-3","startMs":327},{"task":6,"submit":"accepted","poolSize":3,"queue":3,"ranOn":"pool-3","startMs":26},{"task":7,"submit":"accepted","poolSize":4,"queue":3,"ranOn":"pool-4","startMs":32},{"task":8,"submit":"rejected","poolSize":4,"queue":3,"ranOn":"-","startMs":-1},{"task":9,"submit":"rejected","poolSize":4,"queue":3,"ranOn":"-","startMs":-1},{"task":10,"submit":"rejected","poolSize":4,"queue":3,"ranOn":"-","startMs":-1}],"rate":["delay|576|876|scheduling-2","rate|576|876|scheduling-1","rate|883|1184|scheduling-1","delay|1084|1384|scheduling-2","rate|1184|1484|scheduling-1","rate|1485|1785|scheduling-1","delay|1585|1885|scheduling-2","rate|1785|2086|scheduling-1","delay|2086|2386|scheduling-2","rate|2086|2386|scheduling-1"],"starve1":["report|614|1214|scheduling-1","heartbeat|1218|1218|scheduling-1","heartbeat|1218|1218|scheduling-1","heartbeat|1218|1218|scheduling-1","heartbeat|1218|1218|scheduling-1","heartbeat|1219|1219|scheduling-1","heartbeat|1219|1219|scheduling-1","heartbeat|1262|1262|scheduling-1","heartbeat|1362|1362|scheduling-1","heartbeat|1462|1462|scheduling-1","heartbeat|1562|1562|scheduling-1","report|1612|2212|scheduling-1","heartbeat|2213|2213|scheduling-1"],"starve2":["heartbeat|589|589|scheduling-2","heartbeat|689|689|scheduling-2","heartbeat|789|789|scheduling-2","heartbeat|889|889|scheduling-2","heartbeat|989|989|scheduling-2","heartbeat|1089|1089|scheduling-2","report|539|1140|scheduling-1","heartbeat|1189|1189|scheduling-2","heartbeat|1289|1289|scheduling-2","heartbeat|1390|1390|scheduling-2","heartbeat|1490|1490|scheduling-2","heartbeat|1589|1589|scheduling-2","heartbeat|1689|1689|scheduling-2","heartbeat|1789|1789|scheduling-2","heartbeat|1890|1890|scheduling-2","heartbeat|1990|1990|scheduling-2","heartbeat|2090|2090|scheduling-2","report|1539|2139|scheduling-1"],"shed":["unlocked|591|pod-a","locked|598|pod-a","unlocked|790|pod-a","locked|791|pod-a","unlocked|990|pod-a","locked|991|pod-a","unlocked|1113|pod-b","unlocked|1190|pod-a","locked|1191|pod-a","unlocked|1312|pod-b","unlocked|1390|pod-a","locked|1391|pod-a","unlocked|1512|pod-b","unlocked|1590|pod-a","locked|1591|pod-a","unlocked|1712|pod-b","unlocked|1790|pod-a","locked|1791|pod-a","unlocked|1912|pod-b","unlocked|1990|pod-a","locked|1991|pod-a","unlocked|2112|pod-b","unlocked|2190|pod-a","locked|2191|pod-a","unlocked|2312|pod-b"]};
  var TABS = [
    { k: "async", label: "@Async calls" },
    { k: "executor", label: "Pool saturation" },
    { k: "rate", label: "fixedRate vs fixedDelay" },
    { k: "starve", label: "1 scheduler thread vs 2" },
    { k: "shed", label: "ShedLock on 2 pods" }
  ];
  function parse(lines, dur) {
    return lines.map(function (l) { var p = l.split("|"); var s = +p[1], e = isNaN(+p[2]) ? s + dur : +p[2]; return { job: p[0], s: s, e: Math.max(e, s), who: isNaN(+p[2]) ? p[2] : p[3] }; });
  }
  function timeline(rows, ctx, keyFn, colors) {
    var t0 = Math.min.apply(null, rows.map(function (r) { return r.s; })), t1 = Math.max.apply(null, rows.map(function (r) { return r.e; }));
    var span = Math.max(1, t1 - t0), lanes = [];
    rows.forEach(function (r) { var k = keyFn(r); if (lanes.indexOf(k) < 0) lanes.push(k); }); lanes.sort();
    var h = "<div style='position:relative;font-size:12px'>";
    lanes.forEach(function (k, i) {
      h += "<div style='display:flex;align-items:center;margin:4px 0'><div style='width:170px;flex:none'><code>" + ctx.esc(k) + "</code></div><div style='position:relative;flex:1;height:22px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px'>";
      rows.filter(function (r) { return keyFn(r) === k; }).forEach(function (r) {
        var l = 100 * (r.s - t0) / span, w = Math.max(0.6, 100 * (r.e - r.s) / span);
        h += "<div title='" + (r.s - t0) + "–" + (r.e - t0) + " ms' style='position:absolute;top:3px;bottom:3px;left:" + l.toFixed(2) + "%;width:" + w.toFixed(2) + "%;background:" + colors[i % colors.length] + ";border-radius:3px'></div>";
      });
      h += "</div></div>";
    });
    return h + "<div style='display:flex;justify-content:space-between;margin-left:170px;color:#64748b'><span>0 ms</span><span>" + span + " ms</span></div></div>";
  }
  function starts(rows, job) { var t0 = Math.min.apply(null, rows.map(function (r) { return r.s; })); return rows.filter(function (r) { return r.job === job; }).map(function (r) { return r.s - t0; }); }
  var COL = ["#2563eb", "#ef6c00", "#2e7d32", "#7b1fa2"];
  function s12Widget(el, ctx) {
    var s = ctx.state; if (!s.k) s.k = "executor";
    el.innerHTML = "<div class='btnrow'>" + TABS.map(function (x) { return "<button type='button' class='btn' data-k='" + x.k + "'>" + x.label + "</button>"; }).join("") + "</div><div data-r='out' style='margin-top:10px'></div>";
    var out = el.querySelector("[data-r='out']");
    function draw() {
      el.querySelectorAll("button[data-k]").forEach(function (b) { b.classList.toggle("primary", b.dataset.k === s.k); });
      var h = "", note = "";
      if (s.k === "async") {
        h = "<pre class='code' style='white-space:pre-wrap;font-size:12px'>" + ctx.esc(REC.async.join("\n")) + "</pre>";
        note = "Three `@Async` calls returned futures in a few ms and finished together after ~100 ms on Boot's `task-N` threads. A `void` method's exception goes to the **AsyncUncaughtExceptionHandler**; a `CompletableFuture`'s exception surfaces on `get()`. **Self-invocation ran on `main`** (no proxy). The async thread saw **no MDC and no transaction** until a `TaskDecorator` copied the MDC; transactions never cross threads. With `spring.threads.virtual.enabled=true` the task ran on a **virtual thread**.";
      } else if (s.k === "executor") {
        h = "<div class='tablewrap'><table style='font-size:13px'><tr><th>task</th><th>submit</th><th>threads after</th><th>queue after</th><th>ran on</th><th>started at</th></tr>" +
          REC.executor.map(function (r) { var bad = r.submit === "rejected"; return "<tr><td>" + r.task + "</td><td style='font-weight:700;color:" + (bad ? "#b91c1c" : "#166534") + "'>" + r.submit + "</td><td>" + r.poolSize + "</td><td>" + r.queue + "</td><td><code>" + r.ranOn + "</code></td><td>" + (r.startMs < 0 ? "-" : r.startMs + " ms") + "</td></tr>"; }).join("") + "</table></div>";
        note = "`ThreadPoolTaskExecutor(core 2, queue 3, max 4)`, 10 tasks of 300 ms submitted together. Tasks 1–2 got the **core** threads; 3–5 went to the **queue** (they started only at ~300 ms); only when the queue was full did the pool grow to **max** (tasks 6–7 ran immediately on new threads, *before* the queued ones); tasks 8–10 were **rejected** with `TaskRejectedException`. Queue first, then extra threads: a huge queue means the pool never grows past core.";
      } else if (s.k === "rate") {
        var rr = parse(REC.rate);
        h = timeline(rr, ctx, function (r) { return r.job === "rate" ? "fixedRate = 200" : "fixedDelay = 200"; }, COL);
        note = "Both jobs take **300 ms**. `fixedRate = 200` wants to start every 200 ms measured from the previous **start**; because a run is never started while the previous run of the same method is still going, it runs back-to-back (starts at " + starts(rr, "rate").join(", ") + " ms). `fixedDelay = 200` waits 200 ms after each **end**, so it starts every ~500 ms (" + starts(rr, "delay").join(", ") + " ms).";
      } else if (s.k === "starve") {
        var a = parse(REC.starve1), b = parse(REC.starve2);
        h = "<div style='font-weight:600;margin:4px 0'>spring.task.scheduling.pool.size = 1 (the default)</div>" + timeline(a, ctx, function (r) { return r.job; }, COL) +
          "<div style='font-weight:600;margin:10px 0 4px'>pool.size = 2</div>" + timeline(b, ctx, function (r) { return r.job; }, COL);
        note = "A 600 ms `report` job and a 100 ms `heartbeat`. With the default **single scheduler thread**, no heartbeat ran while the report was running, then " + (a.filter(function (r) { return r.job === "heartbeat" && r.s - a[0].s >= 600 && r.s - a[0].s < 610; }).length) + " missed runs fired in a burst. With two threads the heartbeat kept its 100 ms rhythm. Size the scheduler pool, or hand long work to an executor.";
      } else {
        var sh = parse(REC.shed, 50);
        h = timeline(sh, ctx, function (r) { return r.job + " · " + r.who; }, COL);
        var cnt = function (j, w) { return sh.filter(function (r) { return r.job === j && r.who === w; }).length; };
        note = "Two app instances share one database. The plain `@Scheduled` job ran on **both** pods (pod-a " + cnt("unlocked", "pod-a") + "×, pod-b " + cnt("unlocked", "pod-b") + "×): every report would be sent twice. With `@SchedulerLock(name = \"nightlyReport\")` each run first takes a row lock in the `shedlock` table; pod-b's runs found the lock held and were **skipped** (pod-a " + cnt("locked", "pod-a") + "×, pod-b " + cnt("locked", "pod-b") + "×).";
      }
      out.innerHTML = h + "<div class='result'>" + ctx.md(note) + "</div>";
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (!b) return; s.k = b.dataset.k; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Background work inside a Spring app",
      text: "Not everything should happen while the user waits. Sending an email, generating a PDF, calling a slow partner API or recalculating recommendations can run **in the background** on another thread, so the request returns quickly. Spring gives two tools: **`@Async`** runs a method on a thread pool when it is called, and **`@Scheduled`** runs a method on a timer (every N ms or on a cron). Both are **in-process and in-memory**: if the pod dies, queued work is lost, and every pod runs its own schedules. For work that must survive crashes or run exactly once across a cluster you need more (ShedLock, a message queue like Kafka in S13, Quartz, Spring Batch).",
      m: M(["flowchart LR",
        "  R[\"HTTP request thread\"]:::s1 -->|\"@Async call returns at once\"| Q[\"executor queue\"]:::s2",
        "  Q --> W[\"task-1 … task-N\"]:::s4",
        "  T[\"scheduler thread\"]:::s3 -->|\"every 5 min\"| J[\"@Scheduled job\"]:::s4",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#fff3e0,stroke:#ef6c00", "  classDef s3 fill:#f3e5f5,stroke:#7b1fa2", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
long t = System.nanoTime();
System.out.println("request: order saved on " + Thread.currentThread().getName());
pool.submit(() -> { try { Thread.sleep(200); } catch (InterruptedException e) { } System.out.println("background: email sent on " + Thread.currentThread().getName()); });
System.out.println("request: response returned after " + (System.nanoTime() - t) / 1_000_000 + " ms");
pool.shutdown(); pool.awaitTermination(1, java.util.concurrent.TimeUnit.SECONDS);`,
      analogy: "A restaurant waiter takes your order and moves on; the kitchen (the executor) cooks in the background, and the cleaning crew (the scheduler) comes every night at 11." },
    { title: "@EnableAsync and @Async",
      text: "Add **`@EnableAsync`** and annotate a public method of a bean with **`@Async`**. Calling it through the proxy submits the call to an executor and returns immediately. Return types: **`void`** (fire-and-forget) or **`CompletableFuture<T>`** (the caller can wait, combine or handle errors); return `CompletableFuture.completedFuture(value)` from the method. Boot provides an executor bean `applicationTaskExecutor` (threads named `task-1`, `task-2`…). As with caching (S11) and transactions (S05), it is proxy-based: **self-invocation runs synchronously** on the caller's thread, as the widget shows.",
      code: `@Service class Notifier {
    @Async public CompletableFuture<String> sms(String to) {
        try { Thread.sleep(100); } catch (InterruptedException e) { }
        return CompletableFuture.completedFuture("sms to " + to + " on " + Thread.currentThread().getName());
    }
}
@SpringBootApplication @EnableAsync class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var n = ctx.getBean(Notifier.class);
long t = System.nanoTime();
var fs = List.of(n.sms("98450"), n.sms("98860"), n.sms("99000"));
System.out.println("got futures after " + (System.nanoTime() - t) / 1_000_000 + " ms");
CompletableFuture.allOf(fs.toArray(CompletableFuture[]::new)).join();
fs.forEach(f -> System.out.println(f.join()));
System.out.println("all done after " + (System.nanoTime() - t) / 1_000_000 + " ms");
ctx.close();`,
      analogy: "Handing a parcel to a courier counter: you get a receipt (the future) immediately and can check later whether it was delivered." },
    { title: "Configuring the executor",
      text: "The pool decides how much background work runs at once and what happens under load. `ThreadPoolTaskExecutor` (and the JDK `ThreadPoolExecutor` under it) works in an order that surprises people: use **core** threads first, then fill the **queue**, and only when the queue is full grow to **max** threads; when that is full too, **reject** (`TaskRejectedException`, or another `RejectedExecutionHandler` such as caller-runs). Boot's default has core 8 and an **unbounded queue**, so it never grows and never rejects: under overload work piles up in memory. Set limits with `spring.task.execution.pool.*`, or define your own named executors and pick one with `@Async(\"reportExecutor\")`.",
      table: [["Property", "Boot default", "Meaning"],
        ["spring.task.execution.pool.core-size", "8", "threads kept alive"],
        ["…queue-capacity", "unbounded", "waiting tasks before growing"],
        ["…max-size", "unbounded", "upper limit (only used once the queue is full)"],
        ["…keep-alive", "60s", "idle time before extra threads die"],
        ["spring.task.execution.thread-name-prefix", "task-", "useful in logs and thread dumps"]],
      code: `var ex = new ThreadPoolTaskExecutor();
ex.setCorePoolSize(1); ex.setQueueCapacity(2); ex.setMaxPoolSize(2); ex.setThreadNamePrefix("rpt-"); ex.initialize();
for (int i = 1; i <= 5; i++) {
    int id = i;
    try {
        ex.execute(() -> { try { Thread.sleep(200); } catch (InterruptedException e) { } });
        System.out.printf("task %d accepted: threads=%d queued=%d%n", id, ex.getPoolSize(), ex.getThreadPoolExecutor().getQueue().size());
    } catch (org.springframework.core.task.TaskRejectedException e) { System.out.println("task " + id + " REJECTED"); }
}
ex.shutdown();`,
      analogy: "A clinic with 2 doctors and 3 chairs: patients take a free doctor, then a chair; only when every chair is taken is a locum called in; after that the door is closed." },
    { title: "Exceptions in async methods",
      text: "An exception in an `@Async` method doesn't reach the caller's `try/catch`: the caller has already moved on. For **`CompletableFuture`** methods the exception completes the future exceptionally, so `get()` throws `ExecutionException` and `join()` throws `CompletionException`; handle it with `exceptionally`/`handle`. For **`void`** methods the exception goes to the **`AsyncUncaughtExceptionHandler`**, which by default only logs it. Implement `AsyncConfigurer` to plug in your own handler (log with context, increment a failure metric, alert). Silent failures of fire-and-forget work are among the most common production surprises.",
      code: `@Service class Exporter {
    @Async public void exportVoid() { throw new IllegalStateException("disk full"); }
    @Async public CompletableFuture<String> exportFuture() { throw new IllegalStateException("disk full"); }
}
@SpringBootApplication @EnableAsync class App implements AsyncConfigurer {
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, args) -> System.out.println("handler: " + method.getName() + " failed: " + ex.getMessage());
    }
}
var ctx = new SpringApplicationBuilder(App.class).run();
var e = ctx.getBean(Exporter.class);
try { e.exportVoid(); System.out.println("caller: exportVoid() returned normally"); } catch (Exception ex) { System.out.println("never printed"); }
Thread.sleep(100);
String r = e.exportFuture().exceptionally(ex -> "fallback (" + ex.getClass().getSimpleName() + ": " + ex.getCause().getMessage() + ")").join();
System.out.println("caller: " + r);
ctx.close();`,
      analogy: "If the courier loses a parcel you sent without tracking, only the courier's internal log knows; with a tracking number (the future) you find out." },
    { title: "Transactions, security and MDC across threads",
      text: "Thread-bound context does **not** follow work to another thread. The `@Transactional` transaction is bound to the caller's thread, so the async method runs **outside** it (and may not even see uncommitted rows); give the async method its own `@Transactional`, or trigger it **after commit** (`@TransactionalEventListener`). The `SecurityContext` is also missing (use `DelegatingSecurityContextAsyncTaskExecutor` or `MODE_INHERITABLETHREADLOCAL`), and so are **MDC** values like orderId or traceId, which the widget shows coming back as `null`. Fix MDC and similar with a **`TaskDecorator`** that copies context on submit; Boot applies a `TaskDecorator` bean to its executor automatically, and Micrometer's context propagation handles tracing.",
      code: `@Service class Audit {
    @Async public CompletableFuture<String> record() {
        return CompletableFuture.completedFuture("async sees orderId=" + org.slf4j.MDC.get("orderId") + ", tx=" + TransactionSynchronizationManager.isActualTransactionActive());
    }
}
@SpringBootApplication @EnableAsync class App {
    @Bean org.springframework.core.task.TaskDecorator mdc() {
        return task -> { var copy = org.slf4j.MDC.getCopyOfContextMap();
            return () -> { if (copy != null) org.slf4j.MDC.setContextMap(copy); try { task.run(); } finally { org.slf4j.MDC.clear(); } }; };
    }
}
var ctx = new SpringApplicationBuilder(App.class).run();
var tx = new TransactionTemplate(ctx.getBean(PlatformTransactionManager.class));
org.slf4j.MDC.put("orderId", "ORD-7");
tx.executeWithoutResult(s -> {
    System.out.println("caller tx=" + TransactionSynchronizationManager.isActualTransactionActive());
    System.out.println(ctx.getBean(Audit.class).record().join());
});
ctx.close();`,
      analogy: "Handing a task to a colleague doesn't hand over your badge, your open bank session or your sticky notes; you have to pass along what they need." },
    { title: "Composing async work with CompletableFuture",
      text: "Futures from `@Async` methods compose like any `CompletableFuture` (J20): run independent calls **in parallel** and combine them with `thenCombine` or `allOf`, add **timeouts** with `orTimeout`/`completeOnTimeout`, and provide **fallbacks** with `exceptionally`. This fan-out is how a product page gathers price, stock and reviews from three services in the time of the slowest one. Watch the pool: if async methods block waiting on other async methods from the **same bounded pool**, you can deadlock it.",
      code: `@Service class Product {
    @Async public CompletableFuture<Integer> price() { nap(150); return CompletableFuture.completedFuture(120); }
    @Async public CompletableFuture<Integer> stock() { nap(100); return CompletableFuture.completedFuture(7); }
    @Async public CompletableFuture<String> reviews() { nap(2000); return CompletableFuture.completedFuture("4.5 stars"); }
    static void nap(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { } }
}
@SpringBootApplication @EnableAsync class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var p = ctx.getBean(Product.class);
long t = System.nanoTime();
var page = p.price().thenCombine(p.stock(), (pr, st) -> "INR " + pr + ", " + st + " left")
    .thenCombine(p.reviews().completeOnTimeout("reviews unavailable", 300, java.util.concurrent.TimeUnit.MILLISECONDS), (a, b) -> a + ", " + b);
System.out.println(page.join() + "  in " + (System.nanoTime() - t) / 1_000_000 + " ms");
ctx.close();`,
      analogy: "Sending three friends to three shops at once and leaving after 5 minutes with whatever they've bought, rather than visiting the shops one after another." },
    { title: "@Scheduled: fixedRate, fixedDelay and cron",
      text: "**`@EnableScheduling`** plus `@Scheduled` on a no-argument bean method. **`fixedRate`**: start every N ms measured from the previous **start**. **`fixedDelay`**: wait N ms after the previous **end**. `initialDelay` postpones the first run. **`cron`** uses six fields (`second minute hour day month weekday`), e.g. `0 0 2 * * *` for 02:00 daily, with `zone = \"Asia/Kolkata\"`; values can come from properties (`cron = \"${jobs.report.cron}\"`). Runs of the **same** method never overlap by default, so a slow fixedRate job runs back-to-back, as in the widget. `CronExpression` lets you check a cron before deploying.",
      table: [["Option", "Next run measured from", "Use for"],
        ["fixedRate = 60000", "previous start", "metrics push, polling"],
        ["fixedDelay = 60000", "previous end", "batch with variable duration"],
        ["cron = \"0 0 2 * * *\"", "wall clock", "nightly reports, cleanup"],
        ["initialDelay = 10000", "app start", "let the app warm up first"]],
      code: `var cron = CronExpression.parse("0 30 9 * * MON-FRI");
var t = java.time.LocalDateTime.of(2026, 11, 13, 10, 0);   // Friday 10:00
for (int i = 0; i < 3; i++) { t = cron.next(t); System.out.println(t + " " + t.getDayOfWeek()); }
var q = CronExpression.parse("0 0 */6 * * *");
System.out.println("every 6h from 05:00 -> " + q.next(java.time.LocalDateTime.of(2026, 11, 13, 5, 0)));`,
      analogy: "fixedRate is a bus that leaves on the timetable; fixedDelay is a ferry that leaves 10 minutes after the last one returned; cron is the school bell." },
    { title: "The scheduler thread pool",
      text: "By default all `@Scheduled` methods share **one thread** (`scheduling-1`). One slow or stuck job therefore **delays every other job**: in the widget a 600 ms report stopped a 100 ms heartbeat, which then fired 6 times in a burst to catch up. Fix it with `spring.task.scheduling.pool.size`, or keep scheduled methods short and hand heavy work to an `@Async` executor. Also: catch and log exceptions (an exception is logged and the next run still happens), make jobs **idempotent**, and remember that scheduled jobs start as soon as the context is ready, including in tests (disable them with a property and `@ConditionalOnProperty`).",
      code: `@Service class Jobs {
    final List<String> log = Collections.synchronizedList(new ArrayList<>()); final long t0 = System.nanoTime();
    @Scheduled(fixedRate = 1000) public void slowReport() { log.add("report@" + ms()); try { Thread.sleep(400); } catch (InterruptedException e) { } }
    @Scheduled(fixedRate = 100, initialDelay = 20) public void heartbeat() { log.add("hb@" + ms()); }
    long ms() { return (System.nanoTime() - t0) / 1_000_000 / 10 * 10; }
    public List<String> log() { return log; }
}
@SpringBootApplication @EnableScheduling class App { }
for (int size : List.of(1, 2)) {
    var ctx = new SpringApplicationBuilder(App.class).properties("spring.task.scheduling.pool.size=" + size).run();
    Thread.sleep(600);
    var log = new ArrayList<>(ctx.getBean(Jobs.class).log());
    ctx.close();
    System.out.println("pool " + size + ": heartbeats=" + log.stream().filter(s -> s.startsWith("hb")).count() + " " + log.subList(0, Math.min(6, log.size())));
}`,
      analogy: "One receptionist handling both phone calls and a long walk-in complaint: the phones ring unanswered until the complaint is done." },
    { title: "Running a schedule once in a cluster: ShedLock",
      text: "Scale to three pods and every `@Scheduled` job runs **three times**: three nightly emails, three invoice runs. Options: run scheduling in only one dedicated instance, use a real job scheduler (Quartz in clustered mode, Kubernetes CronJob), or the lightweight **ShedLock**. ShedLock wraps the method: before running it **atomically** updates a row in a `shedlock` table (or a Redis/Mongo/Zookeeper key) with `lock_until`; if another pod holds the lock, the run is **skipped**. `lockAtMostFor` releases the lock if a pod dies mid-run; `lockAtLeastFor` stops a fast job running twice due to clock skew. It is a lock, not a scheduler: missed runs are not caught up.",
      m: M(["sequenceDiagram",
        "  participant A as pod-a",
        "  participant DB as shedlock table",
        "  participant B as pod-b",
        "  A->>DB: UPDATE lock_until=now+5m WHERE name=report AND lock_until<=now",
        "  DB-->>A: 1 row: run job",
        "  B->>DB: same UPDATE",
        "  DB-->>B: 0 rows: skip",
        "  A->>DB: release (lock_until = max(now, locked_at + lockAtLeastFor))"]),
      code: `@Service class Report {
    final java.util.concurrent.atomic.AtomicInteger runs = new java.util.concurrent.atomic.AtomicInteger();
    @SchedulerLock(name = "dailyReport", lockAtMostFor = "1m", lockAtLeastFor = "1s")
    public void run() { runs.incrementAndGet(); try { Thread.sleep(200); } catch (InterruptedException e) { } }
    public int runs() { return runs.get(); }
}
@SpringBootApplication @EnableSchedulerLock(defaultLockAtMostFor = "1m") class App {
    @Bean LockProvider lockProvider(DataSource ds) { return new JdbcTemplateLockProvider(ds); }
}
var ctx = new SpringApplicationBuilder(App.class).run();
ctx.getBean(JdbcTemplate.class).execute("CREATE TABLE shedlock(name VARCHAR(64) PRIMARY KEY, lock_until TIMESTAMP(3), locked_at TIMESTAMP(3), locked_by VARCHAR(255))");
var report = ctx.getBean(Report.class);
try (var pods = java.util.concurrent.Executors.newFixedThreadPool(3)) { for (int i = 0; i < 3; i++) pods.submit(report::run); }
System.out.println("3 simultaneous triggers -> job ran " + report.runs() + " time(s)");
ctx.getBean(JdbcTemplate.class).queryForList("SELECT name, lock_until > locked_at AS held_at_least_1s FROM shedlock").forEach(System.out::println);
ctx.close();`,
      analogy: "One key to the storeroom hangs at reception: whoever takes it does the stock count; the others see the empty hook and carry on." },
    { title: "Virtual threads in Spring Boot",
      text: "From Boot 3.2 on Java 21, **`spring.threads.virtual.enabled=true`** switches Tomcat request handling, the `applicationTaskExecutor` (now a `SimpleAsyncTaskExecutor` that starts a virtual thread per task) and the scheduler to **virtual threads** (J24). Blocking I/O in `@Async` methods then costs almost nothing, so you no longer size pools for I/O-bound work. But nothing limits concurrency any more: protect downstream systems with a semaphore, a bulkhead (S14) or the executor's `concurrencyLimit`. Watch for **pinning** (`synchronized` around I/O on older JDKs; JDK 24 removes most of it) and keep CPU-heavy work on a bounded platform-thread pool.",
      code: `@Service class Io {
    @Async public CompletableFuture<String> call() {
        try { Thread.sleep(200); } catch (InterruptedException e) { }
        return CompletableFuture.completedFuture(Thread.currentThread().isVirtual() ? "virtual" : "platform");
    }
}
@SpringBootApplication @EnableAsync class App { }
for (String v : List.of("false", "true")) {
    var ctx = new SpringApplicationBuilder(App.class).properties("spring.threads.virtual.enabled=" + v).run();
    var io = ctx.getBean(Io.class);
    long t = System.nanoTime();
    var fs = java.util.stream.IntStream.range(0, 200).mapToObj(i -> io.call()).toList();
    var kinds = fs.stream().map(CompletableFuture::join).distinct().toList();
    System.out.printf("virtual=%s: 200 x 200 ms blocking calls in %d ms on %s threads (%s)%n", v, (System.nanoTime() - t) / 1_000_000, kinds, ctx.getBean("applicationTaskExecutor").getClass().getSimpleName());
    ctx.close();
}`,
      analogy: "Instead of 8 waiters who each stand by a table while the food cooks, every order gets its own cheap runner who steps aside while waiting." },
    { title: "Production concerns and alternatives",
      text: "In-memory background work disappears on a crash or redeploy. Make shutdown **graceful**: `spring.task.execution.shutdown.await-termination=true` and `…await-termination-period=30s` let running tasks finish. Make jobs **idempotent** and record progress, so a retry or a second run does no harm. Expose pool metrics (Boot publishes `executor.active`, `executor.queued`, `executor.pool.size`) and alert on queue growth. When work must not be lost, use a **durable** mechanism: an outbox table plus a poller, a message broker (Kafka, S13), Quartz with a JDBC job store, Spring Batch for big batches, or Kubernetes CronJobs.",
      table: [["Need", "Tool"],
        ["Fire-and-forget, loss acceptable", "@Async"],
        ["Periodic in-app task", "@Scheduled (+ ShedLock if multi-pod)"],
        ["Durable, retried work", "Outbox + Kafka/RabbitMQ consumer"],
        ["Complex calendars, misfire handling", "Quartz (clustered JDBC store)"],
        ["Large chunked batch jobs", "Spring Batch"],
        ["Separate short-lived job process", "Kubernetes CronJob"]],
      code: `var ex = new ThreadPoolTaskExecutor();
ex.setCorePoolSize(2); ex.setWaitForTasksToCompleteOnShutdown(true); ex.setAwaitTerminationSeconds(2); ex.initialize();
var done = new java.util.concurrent.atomic.AtomicInteger();
for (int i = 0; i < 4; i++) ex.execute(() -> { try { Thread.sleep(300); done.incrementAndGet(); } catch (InterruptedException e) { System.out.println("interrupted!"); } });
long t = System.nanoTime();
ex.shutdown();
System.out.println("graceful shutdown waited " + (System.nanoTime() - t) / 1_000_000 + " ms, completed tasks: " + done.get() + "/4");`,
      analogy: "Closing a shop properly: lock the door to new customers but serve the ones already inside, instead of switching off the lights mid-bill." }
  ];

  H.registerLesson({
    code: "S12",
    summary: "Background work inside a Spring Boot app: `@EnableAsync` and `@Async` return types, how `ThreadPoolTaskExecutor` uses core threads, the queue and max threads, exceptions and context (transactions, security, MDC) in async methods, composing futures, `@Scheduled` fixedRate, fixedDelay and cron, the single scheduler thread trap, running a schedule once per cluster with ShedLock, virtual threads, and graceful shutdown and durable alternatives.",
    slides: SLIDES,
    widget: { heading: "Interactive: what the threads actually did", caption: "Recorded from real Spring Boot 3.4 contexts on JDK 21: async calls and their threads, a saturated executor, scheduled jobs on a timeline, a starved scheduler, and ShedLock with two app instances sharing one database.", render: s12Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Order confirmation", "The order API saves the order and returns in 80 ms; the confirmation email and SMS go out through an `@Async` notifier."],
      ["Nightly reconciliation", "`@Scheduled(cron = \"0 0 2 * * *\", zone = \"Asia/Kolkata\")` with ShedLock so only one of six pods reconciles payments."],
      ["Product page fan-out", "Price, stock and reviews are fetched in parallel with `@Async` futures and a 300 ms timeout per call."],
      ["Lost emails", "A deploy restarted pods while 2,000 emails sat in the in-memory executor queue; they were never sent. The team moved to an outbox table plus Kafka."],
      ["Duplicate invoices", "After scaling from 1 to 3 pods, every customer got three monthly invoices from an unlocked `@Scheduled` job."],
      ["Stuck scheduler", "A cleanup job hung on a database lock and, sharing the single scheduler thread, stopped every other scheduled job for hours."]
    ],
    pitfalls: [
      "Calling an @Async method from the same class (runs synchronously)",
      "Fire-and-forget void methods whose exceptions are only logged",
      "Unbounded executor queues that hide overload and lose work on restart",
      "Expecting the caller's transaction, SecurityContext or MDC inside @Async",
      "Long jobs on the default single scheduler thread",
      "@Scheduled jobs running on every pod (no ShedLock or leader)",
      "Non-idempotent jobs that do damage when run twice",
      "Virtual threads with no limit hammering a downstream service"
    ],
    quiz: [
      { q: "What does an @Async method returning CompletableFuture give the caller?", options: ["The result, after waiting", "A future immediately; the work runs on an executor thread", "Nothing", "A Thread object"], answer: 1, why: "The widget's caller had 3 futures after 6 ms." },
      { q: "ThreadPoolTaskExecutor(core 2, queue 3, max 4) gets 10 long tasks at once. How many run immediately?", options: ["2", "4", "7", "10"], answer: 1, why: "2 core + 2 extra once the queue is full; 3 wait; 3 are rejected." },
      { q: "With Boot's default executor (unbounded queue), when are threads beyond core created?", options: ["When busy", "Never: extra threads are only created when the queue is full", "After 60 s", "Per request"], answer: 1, why: "Queue first, then max." },
      { q: "Where does an exception from an @Async void method go?", options: ["Caller's catch block", "AsyncUncaughtExceptionHandler", "It is rethrown on next call", "The future"], answer: 1, why: "There is no future to carry it." },
      { q: "In the widget, what did the async method see for MDC orderId without a TaskDecorator?", options: ["ORD-42", "null", "An exception", "The thread name"], answer: 1, why: "MDC is thread-local." },
      { q: "A job takes 300 ms with fixedDelay = 200. Roughly how often does it start?", options: ["Every 200 ms", "Every 500 ms", "Every 300 ms", "Every 100 ms"], answer: 1, why: "Delay is measured from the end of the previous run." },
      { q: "Why did the heartbeat stop while the report ran (pool size 1)?", options: ["Exception", "Both jobs share the single scheduler thread", "ShedLock", "GC pause"], answer: 1, why: "Default spring.task.scheduling.pool.size is 1." },
      { q: "What does ShedLock guarantee?", options: ["Exactly-once with catch-up of missed runs", "At most one instance runs a given job at a time; others skip", "Jobs run on the leader only", "Retries on failure"], answer: 1, why: "It is a lock, not a scheduler." },
      { q: "What does spring.threads.virtual.enabled=true change for @Async?", options: ["Nothing", "Each task runs on a new virtual thread (SimpleAsyncTaskExecutor)", "It disables @Async", "It doubles the pool size"], answer: 1, why: "Recorded: VirtualThread[#58,task-1]." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Code / config"],
        ["Enable", "`@EnableAsync`, `@EnableScheduling`"],
        ["Async with result", "`@Async CompletableFuture<T> m()` → `completedFuture(v)`"],
        ["Pick an executor", "`@Async(\"reportExecutor\")`"],
        ["Pool limits", "`spring.task.execution.pool.core-size / max-size / queue-capacity`"],
        ["Void exceptions", "`AsyncConfigurer.getAsyncUncaughtExceptionHandler()`"],
        ["Copy MDC", "`@Bean TaskDecorator`"],
        ["Schedules", "`@Scheduled(fixedRate=…, fixedDelay=…, cron=\"0 0 2 * * *\", zone=…)`"],
        ["Scheduler threads", "`spring.task.scheduling.pool.size=4`"],
        ["Once per cluster", "`@EnableSchedulerLock` + `@SchedulerLock(name=…, lockAtMostFor=…)`"],
        ["Virtual threads", "`spring.threads.virtual.enabled=true`"],
        ["Graceful stop", "`spring.task.execution.shutdown.await-termination=true`"]],
      cards: [
        { title: "@Async", items: ["Proxy-based", "void or CompletableFuture", "Bound the pool", "No tx/security/MDC by default"] },
        { title: "@Scheduled", items: ["rate: from start", "delay: from end", "cron: 6 fields", "1 thread by default", "Every pod runs it"] },
        { title: "Say in interviews", items: ["Core → queue → max → reject", "TaskDecorator", "ShedLock / Quartz", "Idempotent jobs", "Durable work → queue"] }]
    },
    practice: [
      { level: "Easy", q: "How do you run a method asynchronously in Spring, and what can it return?",
        a: ["@EnableAsync on a configuration class, @Async on a public method of a bean, called from another bean.",
          "Return void (fire-and-forget) or CompletableFuture<T> (Future also works).",
          "Runs on the applicationTaskExecutor unless a named executor is given."] },
      { level: "Easy", q: "Write an @Async method and show it runs on a different thread.",
        a: ["Annotate and call through the proxy.", "Compare thread names."],
        code: `@Service class Pdf {
    @Async public CompletableFuture<String> render(String id) { return CompletableFuture.completedFuture(id + " rendered on " + Thread.currentThread().getName()); }
}
@SpringBootApplication @EnableAsync class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
System.out.println("caller on " + Thread.currentThread().getName() + "; " + ctx.getBean(Pdf.class).render("INV-1").join());
ctx.close();` },
      { level: "Easy", q: "fixedRate vs fixedDelay vs cron?",
        a: ["fixedRate: next start N ms after the previous start (runs don't overlap; slow runs go back-to-back).",
          "fixedDelay: next start N ms after the previous end.",
          "cron: wall-clock schedule with 6 fields and an optional zone."] },
      { level: "Medium", q: "Explain how ThreadPoolTaskExecutor handles a burst of tasks.",
        a: ["Below core size: start a new thread.",
          "Core busy: put tasks in the queue.",
          "Queue full: grow up to max size.",
          "Max reached and queue full: reject (TaskRejectedException or the configured policy, e.g. CallerRunsPolicy)."] },
      { level: "Medium", q: "Configure a named executor with a bounded queue and caller-runs back-pressure.",
        a: ["Define a ThreadPoolTaskExecutor bean and use @Async(\"name\").",
          "CallerRunsPolicy makes the submitting thread do the work when saturated, slowing producers."],
        code: `var ex = new ThreadPoolTaskExecutor();
ex.setCorePoolSize(1); ex.setMaxPoolSize(1); ex.setQueueCapacity(1); ex.setThreadNamePrefix("bulk-");
ex.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy()); ex.initialize();
var where = Collections.synchronizedList(new ArrayList<String>());
for (int i = 0; i < 4; i++) ex.execute(() -> { where.add(Thread.currentThread().getName()); try { Thread.sleep(100); } catch (InterruptedException e) { } });
ex.shutdown(); ex.getThreadPoolExecutor().awaitTermination(1, java.util.concurrent.TimeUnit.SECONDS);
System.out.println(where);` },
      { level: "Medium", q: "How do you handle exceptions in @Async methods?",
        a: ["CompletableFuture: the exception completes the future; handle with exceptionally/handle/whenComplete or catch on get/join.",
          "void: implement AsyncConfigurer.getAsyncUncaughtExceptionHandler to log, count and alert.",
          "Consider retries (Spring Retry/Resilience4j) and a dead-letter store for important work."] },
      { level: "Medium", q: "Why is MDC/traceId missing in async logs and how do you fix it?",
        a: ["MDC is a ThreadLocal; the executor thread doesn't inherit it.",
          "Register a TaskDecorator that captures the caller's MDC and restores it around the task (Boot applies it to its executor).",
          "For tracing, Micrometer context propagation; for security, DelegatingSecurityContextAsyncTaskExecutor."] },
      { level: "Hard", q: "Your service runs on 4 pods and a @Scheduled job must run once per night. Options?",
        a: ["ShedLock with a JDBC/Redis lock provider; set lockAtMostFor above the job's max duration and lockAtLeastFor for clock skew.",
          "Quartz clustered with a JDBC job store (also handles misfires).",
          "Kubernetes CronJob running a separate process, or leader election (Spring Integration / Kubernetes lease).",
          "Whatever you choose, make the job idempotent."] },
      { level: "Hard", q: "Background emails sometimes get lost during deploys. Diagnose and redesign.",
        a: ["@Async work lives in an in-memory queue; pod termination drops queued and in-flight tasks.",
          "Short-term: graceful shutdown with await-termination, bounded queue, metrics on executor.queued.",
          "Proper fix: transactional outbox (write an email row in the order transaction) and a poller or Kafka consumer that sends and marks it, with retries and idempotency keys."] },
      { level: "Hard", q: "Show that @Scheduled jobs don't overlap with themselves but can with other jobs when the pool is bigger.",
        a: ["Track concurrent executions per job with counters.",
          "Same method: max concurrency 1 even with a large pool; different methods run in parallel."],
        code: `@Service class Two {
    final java.util.concurrent.atomic.AtomicInteger aNow = new java.util.concurrent.atomic.AtomicInteger(), maxA = new java.util.concurrent.atomic.AtomicInteger(), both = new java.util.concurrent.atomic.AtomicInteger();
    final java.util.concurrent.atomic.AtomicInteger bNow = new java.util.concurrent.atomic.AtomicInteger();
    @Scheduled(fixedRate = 50) public void a() { maxA.accumulateAndGet(aNow.incrementAndGet(), Math::max); if (bNow.get() > 0) both.incrementAndGet(); nap(); aNow.decrementAndGet(); }
    @Scheduled(fixedRate = 50) public void b() { bNow.incrementAndGet(); nap(); bNow.decrementAndGet(); }
    static void nap() { try { Thread.sleep(120); } catch (InterruptedException e) { } }
    public String report() { return "max concurrent a() = " + maxA.get() + ", a() overlapped b() " + both.get() + " times"; }
}
@SpringBootApplication @EnableScheduling class App { }
var ctx = new SpringApplicationBuilder(App.class).properties("spring.task.scheduling.pool.size=4").run();
Thread.sleep(700);
System.out.println(ctx.getBean(Two.class).report());
ctx.close();` }
    ],
    recap: [
      "@Async runs proxied calls on an executor; return CompletableFuture to get results and errors.",
      "Executors fill core, then the queue, then grow to max, then reject: bound them deliberately.",
      "Transactions, security and MDC don't cross threads; use TaskDecorator and own transactions.",
      "@Scheduled shares one thread by default and runs on every pod; size the pool and use ShedLock.",
      "In-memory background work is lost on crash: shut down gracefully or use durable queues."
    ]
  });
})();
