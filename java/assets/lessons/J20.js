/* Lesson J20: wait/notify, Condition, guarded blocks */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // A one-slot buffer guarded by a monitor, used by producers P1, P2 and consumers C1, C2.
  // "Auto" resume mode (notified threads re-acquire the monitor right away) matched HotSpot on Java 21
  // in 48 random scenarios across while/if × notify/notifyAll (buffer count and waiting threads after each step).
  // "Manual" mode lets you choose when a notified thread re-acquires the monitor: any such interleaving is legal per the JLS.
  var NAMES = ["P1", "P2", "C1", "C2"];
  function waitWidget(el, ctx) {
    var s = ctx.state; if (!s.loop) { s.loop = "while"; s.wake = "notify"; s.res = "manual"; s.sim = null; }
    el.innerHTML = "<div class='seg' data-r='loop'><button type='button' data-v='while'>while (!condition) wait()</button><button type='button' data-v='if'>if (!condition) wait()</button></div>" +
      "<div class='seg' data-r='wake' style='margin-top:8px'><button type='button' data-v='notify'>notify()</button><button type='button' data-v='notifyAll'>notifyAll()</button></div>" +
      "<div class='seg' data-r='res' style='margin-top:8px'><button type='button' data-v='manual'>notified threads resume when you click</button><button type='button' data-v='auto'>resume immediately (as on HotSpot)</button></div>" +
      "<pre class='code' data-r='src' style='margin-top:10px'></pre><div data-r='btns'></div>" +
      "<div class='btnrow' style='margin-top:6px'><button type='button' class='btn' data-r='script'>play the classic deadlock script</button><button type='button' class='btn' data-r='reset'>reset</button></div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='out'></div><pre class='code' data-r='log'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function fresh() { return { count: 0, wait: [], entry: [], log: [], bug: null, wakeups: 0 }; }
    function body(S, n, resumed) {
      var prod = n[0] === "P", blocked = prod ? S.count >= 1 : S.count <= 0, verb = prod ? "put" : "take";
      if (!resumed || s.loop === "while") {
        if (blocked) { S.wait.push(n); S.log.push(n + (resumed ? " re-checks: " : " " + verb + "(): ") + (prod ? "buffer full" : "buffer empty") + " → wait() (releases the monitor)"); return; }
      }
      S.count += prod ? 1 : -1;
      if (S.count < 0 || S.count > 1) S.bug = n + " " + (prod ? "put into a FULL buffer (overwrote an item)" : "took from an EMPTY buffer") + ": it resumed after `if`, never re-checking the condition";
      var woke = [];
      if (S.wait.length) { woke = s.wake === "notifyAll" ? S.wait.splice(0) : [S.wait.shift()]; S.entry = S.entry.concat(woke); S.wakeups += woke.length; }
      S.log.push(n + (resumed ? " resumes and " : " ") + (prod ? "puts" : "takes") + " → count " + S.count + "; " + s.wake + "()" + (woke.length ? " wakes " + woke.join(", ") : " (no waiters)"));
    }
    function settle(S) { if (s.res !== "auto") return; while (S.entry.length) body(S, S.entry.shift(), true); }
    function start(n) { var S = s.sim; body(S, n, false); settle(S); }
    function resume(n) { var S = s.sim; S.entry.splice(S.entry.indexOf(n), 1); body(S, n, true); settle(S); }
    function draw() {
      if (!s.sim) s.sim = fresh();
      var S = s.sim;
      ["loop", "wake", "res"].forEach(function (k) { q(k).querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === s[k]); }); });
      var cond = s.loop === "while" ? "while" : "if   ";
      q("src").innerHTML = ctx.H.highlight("synchronized void put(T x) throws InterruptedException {\n    " + cond + " (count == 1) wait();\n    item = x; count++;\n    " + s.wake + "();\n}\nsynchronized T take() throws InterruptedException {\n    " + cond + " (count == 0) wait();\n    count--; T x = item; item = null;\n    " + s.wake + "();\n    return x;\n}", "java");
      q("btns").innerHTML = "<div class='btnrow'>" + NAMES.map(function (n) {
        var waiting = S.wait.indexOf(n) >= 0, entry = S.entry.indexOf(n) >= 0;
        if (entry) return "<button type='button' class='btn primary' data-a='resume' data-n='" + n + "'>" + n + ": re-acquire monitor</button>";
        return "<button type='button' class='btn' data-a='start' data-n='" + n + "'" + (waiting ? " disabled" : "") + ">" + n + (n[0] === "P" ? ".put()" : ".take()") + (waiting ? " (waiting)" : "") + "</button>";
      }).join("") + "</div>";
      var L = ["flowchart LR", "  subgraph WS[\"wait set (WAITING)\"]"];
      if (S.wait.length) S.wait.forEach(function (n, i) { L.push("    w" + i + "[\"" + n + "\"]:::s4"); }); else L.push("    wn[\"(empty)\"]:::s0");
      L.push("  end", "  subgraph ES[\"notified (BLOCKED)\"]");
      if (S.entry.length) S.entry.forEach(function (n, i) { L.push("    e" + i + "[\"" + n + "\"]:::s1"); }); else L.push("    en[\"(empty)\"]:::s0");
      L.push("  end", "  B[\"buffer: " + (S.count === 1 ? "1 item" : S.count === 0 ? "empty" : "count " + S.count + " (corrupt)") + "\"]:::" + (S.bug ? "bad" : "s2"), "  WS -->|" + s.wake + "| ES", "  ES -->|re-acquire| B");
      L.push("  classDef s0 fill:#f3f4f6,stroke:#9ca3af", "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#e8f5e9,stroke:#2e7d32", "  classDef s4 fill:#fff3e0,stroke:#ef6c00", "  classDef bad fill:#fdecea,stroke:#c62828");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var dead = S.wait.length === 4;
      q("out").innerHTML = ctx.md(S.bug ? "**Bug:** " + S.bug + "." :
        dead ? "**Deadlock:** all four threads are in the wait set and nobody is left to call notify. `notify()` woke a thread of the *same kind* (a consumer woke a consumer), which went back to waiting. Switch to `notifyAll()` (or separate Conditions) and replay." :
        "Buffer count **" + S.count + "**, waiting **" + (S.wait.join(", ") || "none") + "**, wake-ups so far **" + S.wakeups + "**." + (s.wake === "notifyAll" ? " notifyAll wakes everyone; most re-check and wait again (the cost of safety)." : ""));
      q("log").textContent = S.log.slice(-8).join("\n") || "Call put()/take() on the threads.";
    }
    ["loop", "wake", "res"].forEach(function (k) { q(k).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s[k] = b.dataset.v; s.sim = fresh(); ctx.save(); draw(); }); });
    q("btns").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || b.disabled) return; if (b.dataset.a === "start") start(b.dataset.n); else resume(b.dataset.n); ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.sim = fresh(); ctx.save(); draw(); });
    q("script").addEventListener("click", function () {
      s.loop = "while"; s.res = "manual"; s.sim = fresh();
      [["s", "C1"], ["s", "C2"], ["s", "P1"], ["s", "P2"], ["s", "P1"], ["r", "C1"], ["s", "C1"], ["r", "C2"]].forEach(function (x) { if (x[0] === "s") start(x[1]); else if (s.sim.entry.indexOf(x[1]) >= 0) resume(x[1]); });
      ctx.save(); draw();
    });
    draw();
  }

  var SLIDES = [
    { title: "Guarded blocks: waiting for a condition",
      text: "Threads often must **wait until something is true**: a queue has an item, a booking is confirmed, a resource is free. Three ways to wait: **busy-spinning** (`while (!ready) {}`) burns a whole core; **sleep-polling** (`while (!ready) sleep(50)`) wastes CPU less but adds latency and still polls; a **guarded block** with `wait()`/`notifyAll()` (or a `Condition`) parks the thread until another thread changes the state and signals it. The JDK's synchronizers (J21) and blocking queues are built on the same idea.",
      table: [
        ["Approach", "CPU while waiting", "Latency", "Verdict"],
        ["Busy spin", "100% of a core", "Lowest", "Only for nanosecond waits (`Thread.onSpinWait()`)"],
        ["Sleep polling", "Low", "Up to the poll interval", "Acceptable for coarse checks (files, external systems)"],
        ["wait / notifyAll", "None (parked)", "Low", "Classic guarded block"],
        ["Condition / j.u.c.", "None", "Low", "Preferred in new code"]],
      code: `Object lock = new Object();
boolean[] ready = {false};
Thread waiter = new Thread(() -> {
    synchronized (lock) {
        while (!ready[0]) {
            try { lock.wait(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); return; }
        }
        System.out.println("condition true, proceeding");
    }
});
waiter.start();
Thread.sleep(50);
System.out.println("waiter is " + waiter.getState() + " (parked, using no CPU)");
synchronized (lock) { ready[0] = true; lock.notifyAll(); }
waiter.join();`,
      analogy: "A guarded block is a restaurant buzzer: instead of asking the counter every few seconds (polling) or standing at it (spinning), you sit down and the buzzer wakes you when your order is ready." },
    { title: "How wait and notify work",
      text: "`wait`, `notify` and `notifyAll` are methods of `Object` and can only be called while **holding that object's monitor** (otherwise `IllegalMonitorStateException`). `wait()` atomically **releases the monitor** and puts the thread in the object's **wait set** (state WAITING). `notify()` moves one waiting thread out of the wait set, `notifyAll()` moves all of them; they then must **re-acquire the monitor** (BLOCKED until the notifier leaves its synchronized block) and continue *after* the `wait()` call. The notifier keeps running; notification is just a hint that the state may have changed.",
      m: M(["stateDiagram-v2",
        "  [*] --> Running: holds monitor",
        "  Running --> WaitSet: wait() releases monitor",
        "  WaitSet --> EntrySet: notify / notifyAll / timeout / interrupt",
        "  EntrySet --> Running: re-acquires monitor",
        "  Running --> [*]: leaves synchronized block"]),
      code: `Object monitor = new Object();
try { monitor.wait(); } catch (IllegalMonitorStateException e) { System.out.println("wait() without holding the monitor → IllegalMonitorStateException"); }
try { monitor.notify(); } catch (IllegalMonitorStateException e) { System.out.println("notify() without holding it → IllegalMonitorStateException"); }

Thread w = new Thread(() -> { synchronized (monitor) { try { monitor.wait(); } catch (InterruptedException e) { } } });
w.start(); Thread.sleep(50);
synchronized (monitor) {
    System.out.println("main got the monitor while w waits: wait() released it; w is " + w.getState());
    monitor.notify();
    Thread.sleep(50);
    System.out.println("after notify, main still holds the monitor; w is " + w.getState());
}
w.join();
System.out.println("w finished: " + w.getState());` },
    { title: "Always wait in a loop",
      text: "When a thread returns from `wait()` the condition may **not** be true: (1) **spurious wake-ups** are allowed by the spec; (2) with `notifyAll` several waiters wake but only one can take the item; (3) another thread can **barge in** between the notification and the re-acquisition and consume the state; (4) one notification may be for a different condition sharing the monitor. So re-check the condition: `while (!condition) wait();`, never `if`. The widget's `if` mode shows a consumer taking from an empty buffer.",
      code: `class Mailbox {
    private final Deque<String> items = new ArrayDeque<>();
    synchronized void put(String s) { items.add(s); notifyAll(); }
    synchronized String takeWithIf() throws InterruptedException {
        if (items.isEmpty()) wait();                 // BROKEN: no re-check after waking
        return items.poll();                         // may be null
    }
    synchronized String take() throws InterruptedException {
        while (items.isEmpty()) wait();              // correct
        return items.poll();
    }
}
Mailbox box = new Mailbox();
List<String> got = Collections.synchronizedList(new ArrayList<>());
Thread a = new Thread(() -> { try { got.add("A:" + box.takeWithIf()); } catch (InterruptedException e) { } });
Thread b = new Thread(() -> { try { got.add("B:" + box.takeWithIf()); } catch (InterruptedException e) { } });
a.start(); b.start(); Thread.sleep(50);
box.put("PNR1");                                      // notifyAll wakes both, only one item
a.join(500); b.join(500);
System.out.println("with if: " + new TreeSet<>(got) + " ← one consumer got null");`,
      points: ["The canonical form: `synchronized (lock) { while (!cond) lock.wait(); act(); }`"] },
    { title: "notify or notifyAll?",
      text: "`notify()` wakes **one arbitrary** waiter. It's safe only when (a) all waiters wait for the **same condition**, (b) each notification lets **at most one** thread proceed, and (c) every waiter would do the same thing. A one-slot buffer with producers *and* consumers on one monitor breaks (a): a consumer may wake another consumer instead of a producer, and everyone can end up waiting forever (play the deadlock script in the widget). **Default to `notifyAll()`**; optimise with separate `Condition`s and `signal()` rather than `notify()`.",
      table: [
        ["", "notify()", "notifyAll()"],
        ["Wakes", "One arbitrary waiter", "All waiters"],
        ["Risk", "Wrong thread woken → missed progress, deadlock", "Thundering herd: wasted wake-ups"],
        ["Safe when", "Uniform waiters, one condition, one can proceed", "Always (with while loops)"],
        ["Better alternative", "Condition per predicate + signal()", "Condition per predicate + signalAll()"]] },
    { title: "A bounded buffer with wait/notifyAll",
      text: "The classic exercise (and a common interview question): a fixed-capacity buffer where `put` waits while it's full and `take` waits while it's empty. Every method is `synchronized`, waits in a `while` loop, and calls `notifyAll()` after changing the state. It works, but every state change wakes producers *and* consumers. In real code you'd use `ArrayBlockingQueue`.",
      code: `class BoundedBuffer<T> {
    private final Object[] items;
    private int head, tail, count;
    BoundedBuffer(int capacity) { items = new Object[capacity]; }
    synchronized void put(T x) throws InterruptedException {
        while (count == items.length) wait();
        items[tail] = x; tail = (tail + 1) % items.length; count++;
        notifyAll();
    }
    @SuppressWarnings("unchecked")
    synchronized T take() throws InterruptedException {
        while (count == 0) wait();
        T x = (T) items[head]; items[head] = null; head = (head + 1) % items.length; count--;
        notifyAll();
        return x;
    }
}
BoundedBuffer<Integer> buf = new BoundedBuffer<>(3);
LongAdder consumed = new LongAdder();
List<Thread> threads = new ArrayList<>();
for (int p = 0; p < 2; p++) threads.add(Thread.ofPlatform().start(() -> { try { for (int i = 1; i <= 500; i++) buf.put(i); } catch (InterruptedException e) { } }));
for (int c = 0; c < 2; c++) threads.add(Thread.ofPlatform().start(() -> { try { for (int i = 0; i < 500; i++) consumed.add(buf.take()); } catch (InterruptedException e) { } }));
for (Thread t : threads) t.join();
System.out.println("sum consumed " + consumed.sum() + " (expected " + 2 * 500 * 501 / 2 + ")");` },
    { title: "Condition: wait sets you can name",
      text: "A `Condition` (from `lock.newCondition()`) is `wait`/`notify` for explicit locks: `await()` releases the lock and waits, `signal()` wakes one waiter **of that condition**, `signalAll()` all of them. A lock can have **several conditions**, one per predicate (`notFull`, `notEmpty`), so `signal()` becomes safe: producers only wake consumers and vice versa, without thundering herds. This is how `ArrayBlockingQueue` is implemented. Same rules: hold the lock, await in a `while` loop.",
      code: `class BlockingBuffer<T> {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();
    private final Deque<T> items = new ArrayDeque<>();
    private final int capacity;
    BlockingBuffer(int capacity) { this.capacity = capacity; }
    void put(T x) throws InterruptedException {
        lock.lock();
        try { while (items.size() == capacity) notFull.await(); items.addLast(x); notEmpty.signal(); }   // wake one consumer only
        finally { lock.unlock(); }
    }
    T take() throws InterruptedException {
        lock.lock();
        try { while (items.isEmpty()) notEmpty.await(); T x = items.removeFirst(); notFull.signal(); return x; }  // wake one producer only
        finally { lock.unlock(); }
    }
}
BlockingBuffer<String> buf = new BlockingBuffer<>(2);
Thread producer = Thread.ofPlatform().start(() -> { try { for (String p : List.of("PNR1", "PNR2", "PNR3", "PNR4")) buf.put(p); } catch (InterruptedException e) { } });
List<String> got = new ArrayList<>();
for (int i = 0; i < 4; i++) got.add(buf.take());
producer.join();
System.out.println("consumed in order: " + got);` },
    { title: "Timed waits, deadlines and interruption",
      text: "Waiting forever is rarely acceptable in services. `wait(ms)`, `await(time, unit)` and `awaitNanos(nanos)` return after the timeout. Because of the while loop, compute a **deadline once** and wait for the **remaining** time on each iteration; `awaitNanos` returns the time left, which makes this easy. Waiting methods throw `InterruptedException` when interrupted (clearing the flag): propagate it, or restore the flag with `Thread.currentThread().interrupt()`.",
      code: `ReentrantLock lock = new ReentrantLock();
Condition confirmed = lock.newCondition();
boolean[] isConfirmed = {false};
Function<Long, Boolean> awaitConfirmation = timeoutMs -> {
    lock.lock();
    try {
        long nanos = TimeUnit.MILLISECONDS.toNanos(timeoutMs);
        while (!isConfirmed[0]) {
            if (nanos <= 0) return false;                     // deadline passed
            nanos = confirmed.awaitNanos(nanos);              // returns the remaining time
        }
        return true;
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();                   // restore the flag for callers
        return false;
    } finally { lock.unlock(); }
};
long t0 = System.nanoTime();
System.out.println("no confirmation within 100 ms → " + awaitConfirmation.apply(100L) + " after ~" + (System.nanoTime() - t0) / 1_000_000 / 50 * 50 + " ms");
Thread.ofPlatform().start(() -> { try { Thread.sleep(30); } catch (InterruptedException e) { } lock.lock(); try { isConfirmed[0] = true; confirmed.signalAll(); } finally { lock.unlock(); } });
System.out.println("confirmed in time → " + awaitConfirmation.apply(1_000L));` },
    { title: "Missed signals: why the state matters",
      text: "Notifications are **not remembered**: `notify()` with nobody waiting does nothing. If a thread checks a flag, then gets descheduled, the other thread sets the flag and notifies, and only then the first calls `wait()`, it waits forever: a **lost wake-up**. The guarded-block pattern avoids this because the **check and the wait happen under the same lock** as the update, and the decision is based on **state** (a field), not on having received a signal. Never wait without checking a condition under the lock, and never signal without changing state under the lock.",
      code: `Object lock = new Object();
boolean[] done = {false};
Thread worker = new Thread(() -> { synchronized (lock) { done[0] = true; lock.notifyAll(); } });   // finishes before anyone waits
worker.start(); worker.join();
long t0 = System.nanoTime();
synchronized (lock) {
    while (!done[0]) lock.wait(1_000);              // state is checked first: no waiting at all
}
System.out.println("state-based wait returned in " + (System.nanoTime() - t0) / 1_000_000 + " ms");

t0 = System.nanoTime();
synchronized (lock) { lock.wait(300); }              // signal-based wait: the earlier notify is gone
System.out.println("wait without a condition slept the full " + (System.nanoTime() - t0) / 1_000_000 / 100 * 100 + " ms (forever, without a timeout)");`,
      analogy: "A doorbell doesn't leave a note. If the courier rang before you sat down to listen, you'll wait all day; checking the doorstep (the state) first fixes it." },
    { title: "LockSupport: park and unpark",
      text: "Under every j.u.c. lock, condition and synchronizer is `LockSupport.park()` / `unpark(thread)`. Each thread has a single **permit**: `unpark` makes it available (calls don't accumulate), `park` consumes it or blocks until it's available, interrupted, or spuriously woken. Unlike `notify`, an `unpark` **before** the `park` is remembered, so there's no lost wake-up. It's a building block for libraries (AQS); application code should use the higher-level tools.",
      code: `Thread t = new Thread(() -> {
    long t0 = System.nanoTime();
    LockSupport.park();                                   // permit already available: returns at once
    System.out.println("first park returned in " + (System.nanoTime() - t0) / 1_000_000 + " ms (unpark came first)");
    LockSupport.parkNanos(100_000_000);                   // no permit: blocks for up to 100 ms
    System.out.println("second park timed out");
});
LockSupport.unpark(t);                                    // unpark before start: ignored (thread not started)
t.start();
LockSupport.unpark(t);                                    // likely before the thread parks: permit is kept
t.join();`,
      points: ["`unpark` on an unstarted thread has no effect; thread dumps show parked threads as `WAITING (parking)`"] },
    { title: "sleep, wait, join, park compared",
      text: "These are often confused in interviews. The key differences: whether the **lock is released**, who wakes the thread, and where you can call it. `sleep` **keeps** any monitors it holds, so sleeping inside `synchronized` blocks everyone else.",
      table: [
        ["", "Thread.sleep", "Object.wait", "Thread.join", "LockSupport.park / Condition.await"],
        ["Releases monitor/lock?", "No", "Yes (that monitor)", "Yes (it uses wait internally)", "await releases its Lock; park releases nothing"],
        ["Woken by", "Timeout, interrupt", "notify/notifyAll, timeout, interrupt, spurious", "Target thread ends, timeout, interrupt", "unpark / signal, timeout, interrupt, spurious"],
        ["Requires", "Nothing", "Holding the monitor", "Nothing", "await: holding the Lock"],
        ["Thread state", "TIMED_WAITING", "WAITING / TIMED_WAITING", "WAITING / TIMED_WAITING", "WAITING / TIMED_WAITING"]],
      code: `Object lock = new Object();
Thread sleeper = new Thread(() -> { synchronized (lock) { try { Thread.sleep(200); } catch (InterruptedException e) { } } });
sleeper.start(); Thread.sleep(20);
Thread other = new Thread(() -> { synchronized (lock) { } });
other.start(); Thread.sleep(20);
System.out.println("sleep holds the monitor: other thread is " + other.getState());
sleeper.join(); other.join();

Thread waiter = new Thread(() -> { synchronized (lock) { try { lock.wait(200); } catch (InterruptedException e) { } } });
waiter.start(); Thread.sleep(20);
Thread other2 = new Thread(() -> { synchronized (lock) { System.out.println("wait released the monitor: other2 got in"); } });
other2.start(); other2.join(); waiter.join();` },
    { title: "Prefer the higher-level tools",
      text: "Hand-written `wait`/`notify` code is a classic source of bugs: wrong lock, `if` instead of `while`, `notify` instead of `notifyAll`, lost signals, forgotten interrupts. Interviewers love it, and you should understand it, but production code should use `java.util.concurrent`: the patterns below are already implemented, tested and optimised.",
      table: [
        ["Hand-rolled pattern", "Use instead"],
        ["Producer/consumer buffer", "`ArrayBlockingQueue`, `LinkedBlockingQueue`"],
        ["Wait for N tasks to finish", "`CountDownLatch`, `ExecutorService.invokeAll`, `CompletableFuture.allOf` (J21, J22)"],
        ["Wait for a result", "`Future.get`, `CompletableFuture`"],
        ["Limit concurrent access", "`Semaphore`"],
        ["Threads meet at a point", "`CyclicBarrier`, `Phaser`"],
        ["One-time event", "`CountDownLatch(1)`, `CompletableFuture<Void>`"],
        ["Hand-off between two threads", "`SynchronousQueue`, `Exchanger`"]],
      code: `BlockingQueue<String> queue = new ArrayBlockingQueue<>(2);
CountDownLatch done = new CountDownLatch(1);
Thread consumer = Thread.ofPlatform().start(() -> {
    try { for (String s = queue.take(); !s.equals("EOF"); s = queue.take()) System.out.println("processed " + s); }
    catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    finally { done.countDown(); }
});
for (String pnr : List.of("PNR1", "PNR2", "PNR3", "EOF")) queue.put(pnr);
System.out.println("all processed: " + done.await(1, TimeUnit.SECONDS));` }
  ];

  H.registerLesson({
    code: "J20",
    summary: "Making threads wait for each other correctly: guarded blocks versus spinning and polling, how `wait`/`notify`/`notifyAll` interact with the monitor's wait set, why you must always wait in a `while` loop, when `notify` deadlocks and why `notifyAll` is the default, a bounded buffer built from scratch, `Condition` objects with separate wait sets, timed waits with deadlines and interruption, missed signals and why waiting must be state-based, `LockSupport.park`/`unpark`, how `sleep`, `wait`, `join` and `park` differ, and which `java.util.concurrent` tools replace hand-written wait/notify.",
    slides: SLIDES,
    widget: { heading: "Interactive: a one-slot buffer with wait and notify", caption: "Producers P1, P2 and consumers C1, C2 share a one-slot buffer guarded by a monitor. Choose `while` or `if`, `notify` or `notifyAll`, and whether notified threads resume immediately (the behaviour measured on HotSpot) or when you click (any interleaving the JLS allows). Play the deadlock script, then switch to `notifyAll`.", render: waitWidget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Interview coding rounds", "Bounded blocking queue, print odd/even with two threads, and producer-consumer are classic wait/notify exercises (J27)."],
      ["Legacy code", "Older services and libraries contain hand-written guarded blocks; reviewing them means checking for `if`, `notify` and lost signals."],
      ["Waiting with deadlines", "Waiting for a booking confirmation, a lease or a connection with a timeout uses `awaitNanos`/`await(timeout)` loops."],
      ["Framework internals", "Connection pools (HikariCP), blocking queues and executors park threads with Conditions and LockSupport."],
      ["Thread dumps", "Threads `WAITING (on object monitor)` in `Object.wait` vs `WAITING (parking)` in `LockSupport.park` tell you which mechanism they wait on."],
      ["Graceful shutdown", "Workers wait on a queue and are woken by interrupts or a poison pill when the service stops."]
    ],
    pitfalls: [
      "`if (!cond) wait();` instead of `while`",
      "Calling wait/notify without holding that object's monitor",
      "Using `notify()` with different kinds of waiters on one monitor",
      "Waiting without checking state first (lost wake-ups)",
      "Changing the condition's state outside the lock",
      "Calling `Thread.sleep` inside a synchronized block to \"wait\"",
      "Swallowing `InterruptedException` from wait/await",
      "Restarting the full timeout on every loop iteration instead of using a deadline",
      "Waiting on one object and notifying another"
    ],
    quiz: [
      { q: "What happens when a thread calls `obj.wait()`?", options: ["It sleeps while keeping obj's monitor", "It releases obj's monitor and waits in obj's wait set until notified, interrupted, timed out or spuriously woken", "It waits for the thread obj to finish", "It throws unless the thread is a daemon"], answer: 1, why: "After waking it must re-acquire the monitor before `wait()` returns." },
      { q: "Why must `wait()` be called inside a `while` loop?", options: ["Style", "Spurious wake-ups, notifyAll waking several threads, and barging threads mean the condition may be false on return", "wait() only works in loops", "To avoid IllegalMonitorStateException"], answer: 1, why: "Re-check the condition every time you wake up." },
      { q: "What does this throw?", code: `Object o = new Object();
o.notify();`, options: ["Nothing", "IllegalMonitorStateException", "InterruptedException", "NullPointerException"], answer: 1, why: "notify, notifyAll and wait require holding the object's monitor (inside `synchronized (o)`)." },
      { q: "Producers and consumers share one monitor and use `notify()`. What can go wrong?", options: ["Nothing", "A consumer can wake another consumer instead of a producer, eventually leaving all threads waiting (deadlock)", "Items are duplicated", "notify throws"], answer: 1, why: "notify wakes an arbitrary waiter; with mixed waiter kinds the wrong one may be chosen. Use notifyAll or separate Conditions." },
      { q: "What is the advantage of `Condition` over `wait`/`notify`?", options: ["It doesn't need a lock", "Several named wait sets per lock, so signal() can target the right waiters; also timed and uninterruptible variants", "It never wakes spuriously", "It's faster in all cases"], answer: 1, why: "`notFull`/`notEmpty` conditions let producers wake only consumers and vice versa. Spurious wake-ups are still possible: keep the while loop." },
      { q: "Does `Thread.sleep(1000)` inside a synchronized block release the monitor?", options: ["Yes", "No, other threads stay BLOCKED for the whole sleep", "Only if interrupted", "Only for static methods"], answer: 1, why: "Only wait() (and await() for Locks) releases the lock while waiting." },
      { q: "Thread A calls `notifyAll()` before thread B calls `wait()`. B doesn't check any condition. What happens to B?", options: ["It returns immediately", "It waits until the next notification, possibly forever: notifications aren't remembered", "It throws", "It sees a queued notification"], answer: 1, why: "That's a lost wake-up. Base waiting on state checked under the lock: `while (!done) wait();`." },
      { q: "How does `LockSupport.unpark(t)` before `park()` behave?", options: ["The unpark is lost", "It makes t's permit available, so the next park() returns immediately", "It throws", "It interrupts t"], answer: 1, why: "Each thread has one permit; unpark sets it (non-cumulative), park consumes it." },
      { q: "You need to wait up to 2 s total for a condition in a while loop. What's correct?", options: ["Call await(2, SECONDS) on each iteration", "Compute the remaining time from a deadline (e.g. awaitNanos's return value) on each iteration", "Use sleep(2000)", "Busy-spin for 2 s"], answer: 1, why: "Re-using the full timeout each iteration could wait much longer than 2 s in total." }
    ],
    cheatsheet: {
      table: [
        ["Task", "Code"],
        ["Guarded wait", "`synchronized (lock) { while (!cond) lock.wait(); act(); }`"],
        ["Signal", "`synchronized (lock) { changeState(); lock.notifyAll(); }`"],
        ["Condition", "`lock.lock(); try { while (!cond) c.await(); } finally { lock.unlock(); }`"],
        ["Timed", "`long n = unit.toNanos(t); while (!cond) { if (n <= 0) return false; n = c.awaitNanos(n); }`"],
        ["Interrupted", "`catch (InterruptedException e) { Thread.currentThread().interrupt(); … }`"],
        ["Low level", "`LockSupport.park()` / `LockSupport.unpark(thread)`"]],
      cards: [
        { title: "Rules", items: ["Hold the lock", "Check state, not signals", "while, never if", "notifyAll by default", "Change state under the lock"] },
        { title: "Releases the lock?", items: ["wait / await: yes", "sleep: no", "join: yes (wait inside)", "park: nothing to release"] },
        { title: "Say in interviews", items: ["Wait set vs entry set", "Spurious wake-ups", "notify deadlock with mixed waiters", "Conditions = named wait sets", "Prefer BlockingQueue"] }]
    },
    practice: [
      { level: "Easy", q: "Explain wait(), notify() and notifyAll().",
        a: ["Methods on Object; the caller must hold that object's monitor.",
          "wait(): releases the monitor, waits in the object's wait set; returns after notify/notifyAll, timeout, interrupt (throws) or spuriously, once it re-acquires the monitor.",
          "notify(): moves one arbitrary waiter to compete for the monitor; notifyAll(): all waiters.",
          "The notifier keeps the monitor until it leaves its synchronized block."] },
      { level: "Easy", q: "What is the difference between sleep() and wait()?",
        a: ["sleep is a static Thread method; wait is an Object method.",
          "sleep keeps any locks held; wait releases the monitor it's called on.",
          "wait requires holding that monitor; sleep can be called anywhere.",
          "sleep wakes after the time (or interrupt); wait wakes on notify, timeout, interrupt or spuriously."] },
      { level: "Easy", q: "Why must wait() be called in a loop?",
        a: ["Spurious wake-ups are permitted by the JLS.",
          "notifyAll wakes all waiters but only some can proceed.",
          "Another thread may barge in and change the state between the notify and the re-acquisition.",
          "Multiple conditions may share one monitor, so the notification may be for a different condition.",
          "The loop re-checks the actual state every time."] },
      { level: "Medium", q: "Implement a bounded blocking queue using wait/notifyAll.",
        a: ["Synchronized put and take on the same monitor.",
          "put waits while full; take waits while empty; both in while loops.",
          "After changing the state, notifyAll so both kinds of waiters re-check.",
          "Handle InterruptedException by propagating it."],
        code: `class BoundedQueue<T> {
    private final Deque<T> q = new ArrayDeque<>();
    private final int cap;
    BoundedQueue(int cap) { this.cap = cap; }
    synchronized void put(T x) throws InterruptedException { while (q.size() == cap) wait(); q.addLast(x); notifyAll(); }
    synchronized T take() throws InterruptedException { while (q.isEmpty()) wait(); T x = q.removeFirst(); notifyAll(); return x; }
}
BoundedQueue<Integer> bq = new BoundedQueue<>(2);
Thread prod = Thread.ofPlatform().start(() -> { try { for (int i = 1; i <= 5; i++) bq.put(i); } catch (InterruptedException e) { } });
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) sb.append(bq.take()).append(' ');
prod.join();
System.out.println(sb.toString().trim());` },
      { level: "Medium", q: "When is notify() safe and when do you need notifyAll()?",
        a: ["notify() is safe only if all waiters wait for the same condition, each notification enables at most one waiter, and any waiter can handle it.",
          "With mixed waiters (producers and consumers on one monitor) notify may wake the wrong kind; that thread waits again and the signal is lost, possibly deadlocking everyone.",
          "notifyAll is always safe with while loops, at the cost of extra wake-ups.",
          "To be both safe and efficient, use a Lock with separate Conditions and signal()."] },
      { level: "Medium", q: "What is a lost wake-up and how do you prevent it?",
        a: ["A notification sent when no thread is waiting is discarded.",
          "If a thread checks a condition without the lock, gets descheduled, and the notifier signals before it calls wait, it waits forever.",
          "Prevent by checking and updating the condition under the same lock as wait/notify, and waiting in `while (!state) wait();`.",
          "LockSupport's permit and j.u.c. synchronizers (CountDownLatch keeps its count) remember state, so they avoid the problem."] },
      { level: "Medium", q: "Rewrite a wait/notifyAll buffer with Lock and two Conditions. What's gained?",
        a: ["One ReentrantLock; conditions notFull and notEmpty.",
          "put: while full notFull.await(); add; notEmpty.signal().",
          "take: while empty notEmpty.await(); remove; notFull.signal().",
          "Gain: producers only wake consumers and vice versa, so signal() is safe and there's no thundering herd; plus timed, interruptible and fair options."],
        code: `ReentrantLock lock = new ReentrantLock();
Condition notEmpty = lock.newCondition();
Deque<String> jobs = new ArrayDeque<>();
Thread worker = Thread.ofPlatform().start(() -> {
    lock.lock();
    try { while (jobs.isEmpty()) notEmpty.await(); System.out.println("worker got " + jobs.poll()); }
    catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    finally { lock.unlock(); }
});
Thread.sleep(30);
lock.lock();
try { jobs.add("reprice PNR42"); notEmpty.signal(); } finally { lock.unlock(); }
worker.join();` },
      { level: "Hard", q: "Write a method that waits up to a timeout for a condition with wait(), handling spurious wake-ups and interruption correctly.",
        a: ["Compute a deadline once.",
          "Loop while the condition is false: compute remaining time; if ≤ 0 return false; otherwise wait(remaining).",
          "Let InterruptedException propagate (declare it) or restore the flag and return.",
          "All inside synchronized on the same lock used by the notifier."],
        code: `class Gate {
    private boolean open;
    synchronized void open() { open = true; notifyAll(); }
    synchronized boolean awaitOpen(long timeoutMs) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs);
        while (!open) {
            long remainingMs = TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime());
            if (remainingMs <= 0) return false;
            wait(remainingMs);
        }
        return true;
    }
}
Gate g = new Gate();
System.out.println("closed gate, 50 ms: " + g.awaitOpen(50));
Thread.ofPlatform().start(() -> { try { Thread.sleep(20); } catch (InterruptedException e) { } g.open(); });
System.out.println("opened within 1 s: " + g.awaitOpen(1_000));` },
      { level: "Hard", q: "A service hangs at shutdown; a thread dump shows a worker `WAITING (on object monitor)` in `Object.wait` inside `JobQueue.take`. What could be wrong and how do you fix it?",
        a: ["The worker waits for a job that will never come; shutdown doesn't wake it.",
          "Possibly the shutdown code sets a flag without notifyAll, sets it outside the lock, or the worker's loop doesn't check the flag (`while (queue.isEmpty()) wait();` ignores `stopping`).",
          "Or the shutdown interrupts it but the worker swallows InterruptedException and loops again.",
          "Fix: include the stop flag in the wait condition (`while (queue.isEmpty() && !stopping)`), set it under the lock + notifyAll; honour interrupts; or use a BlockingQueue with a poison pill / `poll(timeout)` and executor `shutdownNow`."] },
      { level: "Hard", q: "Explain how a notify()-based producer-consumer can deadlock, with a concrete sequence.",
        a: ["One-slot buffer, one monitor, producers P1 P2, consumers C1 C2, while loops, notify().",
          "C1 and C2 find it empty and wait. P1 puts and notify wakes C1 (which hasn't re-acquired the monitor yet). P2 and P1 try to put, find it full, and wait.",
          "C1 re-acquires, takes, notify wakes C2 (another consumer!). C1 calls take again: empty, waits.",
          "C2 re-acquires: empty, waits. Now P1, P2, C1, C2 all wait and nobody will notify: deadlock.",
          "notifyAll (or separate Conditions) wakes a producer too, so progress continues. The widget's script replays exactly this."] }
    ],
    recap: [
      "Guarded blocks park threads until state changes; don't spin or sleep-poll.",
      "wait releases the monitor and must be called holding it; notify/notifyAll only make waiters compete again.",
      "Always `while (!condition) wait();`: spurious wake-ups, barging and notifyAll make `if` wrong.",
      "notify can deadlock with mixed waiters; default to notifyAll or use Conditions per predicate.",
      "Wait on state, with deadlines and proper interrupt handling, and prefer BlockingQueue and j.u.c. synchronizers in real code."
    ]
  });
})();
