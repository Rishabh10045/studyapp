/* Lesson J29: JVM memory areas & the JIT */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded on JDK 21 (x86-64, this machine): Warm.java calls work(1000) 10 times per batch, 40 batches; work() allocates a
  // Point record per iteration. b = [microseconds, bytes allocated by the thread] per batch (ThreadMXBean),
  // e = -XX:+PrintCompilation events for Warm::work (tier, OSR = on-stack replacement, ne = "made not entrant"),
  // "after" = the batch that had just finished when the event was printed.
  var REC = {"tiered": {"b": [[1395, 324120], [1109, 320000], [1160, 320000], [1195, 320000], [1094, 320000], [1113, 320000], [782, 320000], [253, 320000], [242, 320000], [264, 320000], [235, 320048], [217, 320000], [280, 320000], [211, 320000], [205, 320000], [200, 320000], [255, 320000], [299, 320000], [411, 320000], [261, 320000], [165, 160000], [32, 0], [32, 0], [32, 0], [32, 0], [32, 0], [32, 0], [32, 0], [32, 0], [32, 0], [32, 0], [32, 0], [32, 0], [32, 0], [32, 0], [31, 0], [29, 0], [29, 0], [29, 0], [29, 0]], "e": [{"after": 6, "tier": "3", "osr": true, "ne": false}, {"after": 6, "tier": "3", "osr": false, "ne": false}, {"after": 10, "tier": "4", "osr": true, "ne": false}, {"after": 16, "tier": "3", "osr": true, "ne": true}, {"after": 16, "tier": "4", "osr": false, "ne": false}, {"after": 20, "tier": "3", "osr": false, "ne": true}]}, "int": {"b": [[1129, 324072], [950, 320000], [935, 320000], [976, 320000], [1022, 320000], [1080, 320000], [1086, 320000], [987, 320000], [935, 320000], [1060, 320000], [1015, 320000], [958, 320000], [977, 320000], [1016, 320000], [975, 320000], [1088, 320000], [985, 320000], [944, 320000], [1117, 320000], [1090, 320000], [1001, 320000], [1002, 320000], [1038, 320000], [1072, 320000], [1155, 320000], [1320, 320000], [1179, 320000], [1110, 320000], [1068, 320000], [1074, 320000], [1121, 320000], [1073, 320000], [1149, 320000], [1157, 320000], [1276, 320000], [1226, 320000], [1131, 320000], [1091, 320000], [1327, 320000], [990, 320000]], "e": []}, "c1": {"b": [[887, 324072], [603, 320000], [598, 320000], [595, 320000], [614, 320000], [620, 320000], [617, 320000], [211, 320000], [210, 320000], [206, 320000], [211, 320000], [227, 320000], [221, 320000], [204, 320000], [212, 320000], [233, 320000], [247, 320000], [233, 320000], [223, 320000], [467, 320000], [213, 320000], [210, 320000], [201, 320000], [210, 320000], [200, 320000], [215, 320000], [206, 320000], [228, 320000], [219, 320000], [214, 320000], [219, 320000], [221, 320000], [212, 320000], [217, 320000], [219, 320000], [210, 320000], [203, 320000], [209, 320000], [212, 320000], [214, 320000]], "e": [{"after": 6, "tier": "1", "osr": true, "ne": false}, {"after": 6, "tier": "1", "osr": false, "ne": false}]}, "c2": {"b": [[1434, 324120], [636, 320000], [633, 320048], [630, 320000], [533, 259328], [343, 163840], [340, 163840], [336, 163840], [212, 98304], [29, 0], [29, 0], [29, 0], [29, 0], [29, 0], [29, 0], [29, 0], [29, 0], [29, 0], [29, 0], [29, 0], [29, 0], [29, 0], [29, 0], [31, 0], [30, 0], [29, 0], [29, 0], [29, 0], [31, 0], [31, 0], [31, 0], [31, 0], [31, 0], [31, 0], [31, 0], [31, 0], [31, 0], [31, 0], [31, 0], [31, 0]], "e": [{"after": 2, "tier": "C2", "osr": true, "ne": false}, {"after": 4, "tier": "C2", "osr": false, "ne": false}]}, "noea": {"b": [[959, 324120], [696, 320000], [691, 320000], [745, 320000], [764, 320000], [663, 320000], [656, 320000], [261, 320000], [225, 320000], [224, 320000], [233, 320048], [239, 320000], [224, 320000], [234, 320000], [234, 320000], [281, 320000], [294, 320000], [327, 320000], [259, 320000], [241, 320000], [226, 320000], [312, 320000], [248, 320000], [221, 320000], [216, 320000], [218, 320000], [215, 320000], [212, 320000], [207, 320000], [217, 320000], [192, 320000], [230, 320000], [226, 320000], [210, 320000], [294, 320000], [214, 320000], [216, 320000], [216, 320000], [219, 320000], [203, 320000]], "e": [{"after": 6, "tier": "3", "osr": true, "ne": false}, {"after": 6, "tier": "3", "osr": false, "ne": false}, {"after": 11, "tier": "4", "osr": true, "ne": false}, {"after": 15, "tier": "3", "osr": true, "ne": true}, {"after": 15, "tier": "4", "osr": false, "ne": false}, {"after": 22, "tier": "3", "osr": false, "ne": true}]}};
  var MODES = [
    { k: "tiered", label: "default (tiered C1 → C2)", flags: "java Warm", why: "Starts **interpreted**, gets compiled by **C1 with profiling (tier 3)** after a few thousand invocations/loop iterations, then by **C2 (tier 4)** using that profile. C2's **escape analysis** proves the `Point`s never escape, so it **scalar-replaces** them: allocation drops to **0 bytes**. The tier-3 code is then *made not entrant* (retired)." },
    { k: "int", label: "-Xint (interpreter only)", flags: "java -Xint Warm", why: "No JIT at all: every bytecode is interpreted and every `Point` is allocated on the heap. Steady state stays as slow as the first batch." },
    { k: "c1", label: "C1 only", flags: "java -XX:TieredStopAtLevel=1 Warm", why: "The fast-compiling **client compiler** (tier 1, no profiling). Quick warm-up and a solid speedup, but no escape analysis or aggressive profile-driven optimisation, so it still allocates. Sometimes used for short-lived CLI tools." },
    { k: "c2", label: "C2 only", flags: "java -XX:-TieredCompilation Warm", why: "Skips C1: the method stays interpreted for longer while profiling (slow first batches), then jumps straight to optimised C2 code. Tiered compilation exists to get both fast warm-up and peak speed." },
    { k: "noea", label: "tiered, escape analysis off", flags: "java -XX:-DoEscapeAnalysis Warm", why: "Same tiers as the default, but C2 may not scalar-replace the `Point`s: every iteration allocates 32 bytes on the heap and steady state is several times slower than with escape analysis." }
  ];
  var CODE = "record Point(double x, double y) { }\nstatic double work(int n) {\n    double s = 0;\n    for (int i = 0; i < n; i++) {\n        Point p = new Point(i, i * 0.5);           // short-lived, never escapes\n        s += Math.sqrt(p.x() * p.x() + p.y() * p.y());\n    }\n    return s;\n}\n// 40 batches × 10 calls of work(1000); time and allocated bytes measured per batch";
  function avg(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  function j29Widget(el, ctx) {
    var s = ctx.state; if (!s.k) s.k = "tiered";
    el.innerHTML = "<pre class='code' data-r='code'></pre><div class='btnrow' data-r='ms' style='margin-top:8px'>" + MODES.map(function (m) { return "<button type='button' class='btn' data-k='" + m.k + "'>" + ctx.esc(m.label) + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='flags' style='margin-top:8px'></pre><div data-r='chart' style='margin:10px 0'></div><div class='result' data-r='res'></div><pre class='code' data-r='ev'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("code").innerHTML = ctx.H.highlight(CODE, "java");
    var maxUs = 0; Object.keys(REC).forEach(function (k) { REC[k].b.forEach(function (x) { maxUs = Math.max(maxUs, x[0]); }); });
    function draw() {
      var m = MODES.filter(function (x) { return x.k === s.k; })[0], r = REC[m.k];
      q("ms").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b.dataset.k === s.k); });
      q("flags").textContent = "$ " + m.flags;
      var marks = {}; r.e.forEach(function (e) { if (!e.ne) (marks[e.after] = marks[e.after] || []).push(e.tier === "C2" || e.tier === "4" ? "C2" : "C1"); });
      var bars = r.b.map(function (x, i) {
        var h = Math.max(2, Math.round(120 * x[0] / maxUs)), alloc = x[1] > 0, mk = marks[i + 1];
        return "<div title='batch " + (i + 1) + ": " + x[0] + " µs, " + x[1] + " bytes' style='display:flex;flex-direction:column;justify-content:flex-end;align-items:center;width:2.2%;height:150px'>" +
          (mk ? "<span style='font-size:9px;color:#7c3aed;font-weight:700'>" + mk.join("+") + "</span>" : "") +
          "<span style='display:block;width:80%;height:" + h + "px;background:" + (x[0] > 500 ? "#ef4444" : x[0] > 100 ? "#f59e0b" : "#22c55e") + ";border-radius:2px 2px 0 0'></span>" +
          "<span style='display:block;width:80%;height:6px;margin-top:2px;background:" + (alloc ? "#94a3b8" : "#e2e8f0") + "'></span></div>";
      }).join("");
      q("chart").innerHTML = "<div style='display:flex;align-items:flex-end;gap:0;border-bottom:1px solid #cbd5e1'>" + bars + "</div>" +
        "<div style='font-size:12px;color:#64748b;margin-top:4px'>40 batches, left to right. Bar height = time per batch (same scale for all modes). Grey strip = the batch allocated memory. Purple labels = compilations finishing (C1/C2).</div>";
      var first = r.b[0][0], steady = Math.round(avg(r.b.slice(-10).map(function (x) { return x[0]; }))), interp = Math.round(avg(REC["int"].b.slice(-10).map(function (x) { return x[0]; })));
      var bytes = r.b[r.b.length - 1][1];
      q("res").innerHTML = ctx.md("First batch **" + first + " µs**, steady state **" + steady + " µs** (" + (interp / steady).toFixed(1) + "× faster than the interpreter), allocating **" + (bytes ? Math.round(bytes / 1000) + " KB" : "0 bytes") + "** per batch. " + m.why);
      q("ev").textContent = r.e.length ? "-XX:+PrintCompilation lines for Warm::work:\n" + r.e.map(function (e) { return "after batch " + String(e.after).padStart(2) + ": " + (e.tier === "C2" ? "C2" : "tier " + e.tier) + (e.osr ? " (OSR: hot loop compiled while running)" : "") + (e.ne ? "  made not entrant" : ""); }).join("\n") : "No compilations: the JIT is disabled.";
    }
    q("ms").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.k = b.dataset.k; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "The JVM's memory areas",
      text: "A running JVM uses several areas, and each has its own failure mode. The **heap** holds objects and arrays and is shared by all threads and managed by the GC. Each thread has its own **stack** (frames with local variables and operand stacks) and program counter. **Metaspace** (native memory) holds class metadata. The **code cache** holds JIT-compiled machine code. **Direct memory** holds off-heap buffers used by NIO and Netty. Add thread stacks, GC data structures and native libraries, and a JVM's process size is always larger than `-Xmx`, which matters when sizing containers.",
      m: M(["flowchart TB",
        "  subgraph S[\"shared by all threads\"]", "    HP[\"heap<br/>young: eden + survivors, old\"]:::s4", "    MS[\"Metaspace<br/>class metadata\"]:::s3", "    CC[\"code cache<br/>JIT machine code\"]:::s3", "    DM[\"direct memory<br/>off-heap buffers\"]:::s3", "  end",
        "  subgraph T[\"per thread\"]", "    ST[\"stack: frames<br/>locals, operands\"]:::s2", "    PC[\"PC register<br/>native stack\"]:::s2", "  end",
        "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `Runtime rt = Runtime.getRuntime();
System.out.printf("heap: max %d MB, committed %d MB, used %d MB%n", rt.maxMemory() >> 20, rt.totalMemory() >> 20, (rt.totalMemory() - rt.freeMemory()) >> 20);
for (MemoryPoolMXBean p : ManagementFactory.getMemoryPoolMXBeans())
    System.out.printf("%-8s %-34s used %7d KB%n", p.getType() == MemoryType.HEAP ? "heap" : "non-heap", p.getName(), p.getUsage().getUsed() >> 10);`,
      analogy: "A restaurant: the heap is the shared dining hall (cleaned by staff, the GC), each waiter's notepad is a thread stack, the menu binders are Metaspace, the kitchen's prepared recipes are the code cache, and the storeroom out back is direct memory." },
    { title: "The heap and fast allocation",
      text: "With the default **G1** collector the heap is divided into regions that play the **young** (eden + survivor) and **old** roles. New objects go into **eden**. Each thread allocates inside its own **TLAB** (thread-local allocation buffer) by bumping a pointer, so `new` is usually just a few instructions with no locking. Objects that survive a few young collections are **promoted** to old. Very large objects (half a region or more) go straight into **humongous** regions. Allocation is cheap; what costs is the **work GC does** for objects that live long or churn at high rates (J30, J31).",
      code: `var tb = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
long tid = Thread.currentThread().threadId();
Function<String, Long> gcs = kind -> ManagementFactory.getGarbageCollectorMXBeans().stream().filter(g -> g.getName().contains(kind)).mapToLong(GarbageCollectorMXBean::getCollectionCount).sum();
long young0 = gcs.apply("Young"), bytes0 = tb.getThreadAllocatedBytes(tid);
List<byte[]> keep = new ArrayList<>();
for (int i = 0; i < 50_000; i++) { byte[] b = new byte[10_000]; if (i % 100 == 0) keep.add(b); }   // 500 MB allocated, 5 MB kept
long allocated = tb.getThreadAllocatedBytes(tid) - bytes0;
Runtime rt = Runtime.getRuntime();
System.out.printf("allocated %d MB through eden, young collections: %d, heap used now: %d MB (kept %d arrays)%n",
        allocated >> 20, gcs.apply("Young") - young0, (rt.totalMemory() - rt.freeMemory()) >> 20, keep.size());` },
    { title: "Thread stacks and StackOverflowError",
      text: "Every method call pushes a **frame** (local variables, operand stack, return address) on the calling thread's stack; it's popped on return. Primitives and references in locals live in the frame, while the objects they point to live on the heap. Stack size is fixed per thread (`-Xss`, default 1 MB on 64-bit Linux, or a `Thread` constructor argument), so deep or unbounded recursion throws **`StackOverflowError`**. Thousands of platform threads × 1 MB of stack reserve a lot of memory, one reason virtual threads (J25), whose stacks live on the heap, scale better.",
      code: `class Depth { static int d; static void dive() { d++; dive(); } }
for (long size : new long[] { 256 * 1024, 1024 * 1024, 8 * 1024 * 1024 }) {
    Depth.d = 0;
    Thread t = new Thread(null, () -> { try { Depth.dive(); } catch (StackOverflowError e) { } }, "deep", size);
    t.start(); t.join();
    System.out.printf("stack %5d KB → StackOverflowError at depth %,d%n", size >> 10, Depth.d);
}`,
      analogy: "A thread stack is a stack of plates for unfinished tasks: every call adds a plate, every return removes one. The cupboard has a fixed height, so infinite recursion eventually topples it." },
    { title: "Metaspace, the code cache and other native memory",
      text: "**Metaspace** stores class metadata (methods, bytecode, constant pools) in native memory, sized automatically and unbounded unless you set `-XX:MaxMetaspaceSize`. It grows with the number of loaded classes, including generated proxies and lambdas, and shrinks only when class loaders are collected (J28 leaks). With compressed class pointers a separate **compressed class space** (1 GB by default) holds class structures. The **code cache** (`-XX:ReservedCodeCacheSize`, 240 MB with tiered compilation) holds JIT output; if it fills, the JIT stops compiling and performance quietly drops. Track all native areas with **Native Memory Tracking**: `-XX:NativeMemoryTracking=summary` plus `jcmd <pid> VM.native_memory summary`.",
      code: `class Blob { int a, b, c; String describe() { return "blob " + a + b + c; } }
Function<String, Long> used = name -> ManagementFactory.getMemoryPoolMXBeans().stream().filter(p -> p.getName().equals(name)).mapToLong(p -> p.getUsage().getUsed()).sum();
long before = used.apply("Metaspace"); int classesBefore = ManagementFactory.getClassLoadingMXBean().getLoadedClassCount();
java.net.URL where = Blob.class.getProtectionDomain().getCodeSource().getLocation();
List<Class<?>> copies = new ArrayList<>();
for (int i = 0; i < 2_000; i++) copies.add(new java.net.URLClassLoader(new java.net.URL[] { where }, null).loadClass("Blob"));   // 2,000 loaders, 2,000 classes
System.out.printf("Metaspace: %,d KB → %,d KB; loaded classes %,d → %,d%n", before >> 10, used.apply("Metaspace") >> 10, classesBefore, ManagementFactory.getClassLoadingMXBean().getLoadedClassCount());
ManagementFactory.getMemoryPoolMXBeans().stream().filter(p -> p.getName().startsWith("CodeHeap"))
    .forEach(p -> System.out.printf("%-30s used %5d KB of %6d KB%n", p.getName(), p.getUsage().getUsed() >> 10, p.getUsage().getMax() >> 10));` },
    { title: "Direct (off-heap) memory",
      text: "`ByteBuffer.allocateDirect` and memory-mapped files allocate **outside the heap**, so I/O can hand the memory straight to the OS without copying, which Netty, Kafka clients and gRPC rely on. Direct buffers don't show up in heap usage or heap dumps; they're freed only when their small heap-side `ByteBuffer` object is garbage-collected (or by pooling/explicit release in Netty). The limit is `-XX:MaxDirectMemorySize` (defaults to the max heap size), and exceeding it gives `OutOfMemoryError: Cannot reserve … bytes of direct buffer memory`. Java 22's FFM API (`Arena`, `MemorySegment`) offers deterministic off-heap memory.",
      code: `long heapBefore = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
List<java.nio.ByteBuffer> buffers = new ArrayList<>();
for (int i = 0; i < 4; i++) buffers.add(java.nio.ByteBuffer.allocateDirect(32 << 20));     // 4 × 32 MB off-heap
long heapAfter = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
for (BufferPoolMXBean b : ManagementFactory.getPlatformMXBeans(BufferPoolMXBean.class))
    System.out.printf("%-30s %d buffers, %d MB%n", b.getName(), b.getCount(), b.getMemoryUsed() >> 20);
System.out.printf("heap used changed by only %d MB%n", (heapAfter - heapBefore) >> 20);` },
    { title: "Object layout, compressed oops and alignment",
      text: "Every object starts with a **header**: a **mark word** (8 bytes: identity hash, lock state, GC age) and a **class pointer** (4 bytes with compressed class pointers). Arrays add a 4-byte length. Fields follow, and the total is padded to a multiple of **8 bytes**. With **compressed oops** (default for heaps under ~32 GB) references take 4 bytes instead of 8, which is why heaps just above 32 GB can hold *less* than at 31 GB. So a `new Object()` is 16 bytes, a boxed `Integer` 16 bytes for 4 bytes of data, and a record with two doubles 32 bytes; a `List<Integer>` of a million values costs ~20 MB vs 4 MB for an `int[]`. Measured below with the thread allocation counter (JOL gives exact layouts). Project Lilliput (JDK 24, experimental) shrinks headers to 8 bytes.",
      code: `record P1(int x) { }
record P2(double x, double y) { }
var tb = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
long tid = Thread.currentThread().threadId();
Object[] keep = new Object[100_000];
Map<String, Supplier<Object>> kinds = new LinkedHashMap<>();
kinds.put("new Object()", Object::new);
kinds.put("record P1(int x)", () -> new P1(1));
kinds.put("record P2(double, double)", () -> new P2(1, 2));
kinds.put("new int[0]", () -> new int[0]);
kinds.put("new int[10]", () -> new int[10]);
kinds.put("new Object[10] (refs)", () -> new Object[10]);
for (var k : kinds.entrySet()) {
    long b0 = tb.getThreadAllocatedBytes(tid);
    for (int i = 0; i < keep.length; i++) keep[i] = k.getValue().get();
    System.out.printf("%-28s %3d bytes%n", k.getKey(), (tb.getThreadAllocatedBytes(tid) - b0) / keep.length);
}` },
    { title: "Escape analysis: objects that never reach the heap",
      text: "C2 analyses whether an object can **escape** the method (returned, stored in a field or array, passed to a non-inlined call). If it can't, C2 may apply **scalar replacement** (keep its fields in registers and never allocate it) and **lock elision** (drop `synchronized` on an object no other thread can see). This is why short-lived value objects, iterators and builders in hot loops are often free, and why benchmarking with a cold or `-Xint` JVM misleads. It only works after JIT compilation and inlining, and is defeated by storing the object anywhere visible. The widget shows a 0-byte steady state with it and 320 KB per batch without it.",
      code: `class Hot {
    static Object sink;
    record V(double x, double y) { }
    static double local(int n) { double s = 0; for (int i = 0; i < n; i++) { V v = new V(i, 1); s += v.x() * v.y(); } return s; }
    static double escaping(int n) { double s = 0; for (int i = 0; i < n; i++) { V v = new V(i, 1); sink = v; s += v.x(); } return s; }
}
var tb = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
long tid = Thread.currentThread().threadId();
for (int i = 0; i < 300; i++) { Hot.local(10_000); Hot.escaping(10_000); }        // warm up: let C2 compile both
for (String which : List.of("local", "escaping")) {
    long b0 = tb.getThreadAllocatedBytes(tid);
    double r = which.equals("local") ? Hot.local(1_000_000) : Hot.escaping(1_000_000);
    System.out.printf("%-9s 1,000,000 iterations allocated %,d bytes%n", which, tb.getThreadAllocatedBytes(tid) - b0);
}` },
    { title: "StackOverflowError and the OutOfMemoryError family",
      text: "The message after `OutOfMemoryError:` tells you **which area** ran out, and each has a different fix. Most are recoverable only in the sense that the thread that hit them dies; treat any OOM as a reason to restart and investigate (J31). Always run production with `-XX:+HeapDumpOnOutOfMemoryError` and consider `-XX:+ExitOnOutOfMemoryError` so a broken JVM gets replaced.",
      table: [["Error message", "Area", "Typical cause / fix"],
        ["StackOverflowError", "thread stack", "unbounded recursion, very deep frameworks; fix code or raise -Xss"],
        ["OOM: Java heap space", "heap", "leak or undersized -Xmx; heap dump + MAT"],
        ["OOM: GC overhead limit exceeded", "heap (Parallel GC)", "almost all time spent in GC; same as above"],
        ["OOM: Metaspace", "native class metadata", "class loader leak, endless generated classes"],
        ["OOM: Cannot reserve … direct buffer memory", "direct memory", "unreleased buffers, raise MaxDirectMemorySize"],
        ["OOM: unable to create native thread", "OS threads", "thread leak, ulimit/container pids limit"],
        ["OOM: Requested array size exceeds VM limit", "heap", "array of ~Integer.MAX_VALUE elements"]],
      code: `try { int[] a = new int[Integer.MAX_VALUE]; } catch (OutOfMemoryError e) { System.out.println("1: " + e.getMessage()); }
try { long[] a = new long[Integer.MAX_VALUE - 8]; } catch (OutOfMemoryError e) { System.out.println("2: " + e.getMessage() + " (16 GB requested, max heap " + (Runtime.getRuntime().maxMemory() >> 30) + " GB)"); }
class Rec { static int depth(int n) { return depth(n + 1) + 1; } }
try { Rec.depth(0); } catch (StackOverflowError e) { System.out.println("3: StackOverflowError, stack trace has " + e.getStackTrace().length + " frames (capped by -XX:MaxJavaStackTraceDepth)"); }
System.out.println("JVM still alive: the failed allocations were never made");` },
    { title: "The JIT: interpreter, C1 and C2",
      text: "HotSpot starts by **interpreting** bytecode while counting invocations and loop back-edges. With **tiered compilation** (default) hot methods are first compiled by **C1** (fast compile, light optimisation, with profiling: tier 3), and if they stay hot, recompiled by **C2** (tier 4) using the collected profile: which branches are taken, which receiver types appear. Long-running loops are compiled while running via **on-stack replacement (OSR)**. Compiled code lives in the code cache. The widget shows the real timeline: interpreted → C1 → C2 with a 20–35× speedup.",
      m: M(["flowchart LR",
        "  I[\"tier 0<br/>interpreter + counters\"]:::s1 --> C1[\"tier 3<br/>C1 + profiling\"]:::s2 --> C2[\"tier 4<br/>C2 optimised\"]:::s4",
        "  C2 -- \"assumption broken<br/>deoptimise\" --> I",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `class Fib { static long fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); } }
var comp = ManagementFactory.getCompilationMXBean();
for (int round = 1; round <= 6; round++) {
    long t0 = System.nanoTime(); long r = Fib.fib(24); long us = (System.nanoTime() - t0) / 1000;
    System.out.printf("round %d: %6d µs   (JIT time so far %d ms, %s)%n", round, us, comp.getTotalCompilationTime(), comp.getName());
}`,
      analogy: "A new delivery rider first follows the map turn by turn (interpreter), after a few trips takes notes on shortcuts (C1 with profiling), and eventually knows the route by heart, with tricks for the usual traffic (C2). If a road closes, they go back to the map (deoptimisation)." },
    { title: "Inlining, deoptimisation and warm-up",
      text: "**Inlining** copies small or hot callees into the caller, the gateway optimisation that enables escape analysis, constant folding and loop optimisations; that's why small methods and final/monomorphic calls are cheap. C2 makes **speculative** optimisations from the profile (\"this call site only ever sees `ArrayList`\", \"this branch is never taken\"). When an assumption breaks (a new class is loaded, an unexpected type arrives) the code is **deoptimised** back to the interpreter and recompiled later. Practical consequences: a freshly started service is slow for its first seconds to minutes (**warm-up**), so use readiness probes after warm-up traffic, CDS/AppCDS and CRaC or GraalVM native images for startup, and benchmark with **JMH**, never a hand-rolled loop.",
      table: [["Optimisation", "What it does", "Defeated by"],
        ["Inlining", "removes call overhead, enables everything else", "huge methods (>325 bytes hot / 35 bytes cold), megamorphic calls"],
        ["Escape analysis", "scalar replacement, lock elision", "objects stored in fields, arrays, non-inlined calls"],
        ["Loop optimisations", "unrolling, range-check elimination, vectorisation", "complex control flow, non-counted loops"],
        ["Speculation", "monomorphic call sites, pruned branches", "new types or branches → deoptimisation"]],
      code: `interface Shape { double area(); }
record Sq(double s) implements Shape { public double area() { return s * s; } }
record Circle(double r) implements Shape { public double area() { return 3.14159 * r * r; } }
record Tri(double b, double h) implements Shape { public double area() { return 0.5 * b * h; } }
class Bench {
    static double total(Shape[] shapes) { double t = 0; for (Shape s : shapes) t += s.area(); return t; }
    static long time(Shape[] shapes) { long best = Long.MAX_VALUE; for (int r = 0; r < 200; r++) { long t0 = System.nanoTime(); total(shapes); best = Math.min(best, System.nanoTime() - t0); } return best / 1000; }
}
Shape[] mono = new Shape[100_000], mega = new Shape[100_000];
for (int i = 0; i < mono.length; i++) { mono[i] = new Sq(i); mega[i] = switch (i % 3) { case 0 -> new Sq(i); case 1 -> new Circle(i); default -> new Tri(i, 2); }; }
System.out.println("monomorphic call site (1 type):  best " + Bench.time(mono) + " µs");
System.out.println("3 types at the same call site:    best " + Bench.time(mega) + " µs (megamorphic: virtual dispatch, no inlining)");` },
    { title: "Inspecting a running JVM",
      text: "Learn a few tools before you need them. **`jcmd <pid>`** is the Swiss army knife: `VM.flags`, `GC.heap_info`, `Thread.print`, `GC.class_histogram`, `GC.heap_dump`, `VM.native_memory`, `JFR.start`. **`jstat -gcutil <pid> 1s`** streams GC occupancy and counts. **Java Flight Recorder** records low-overhead (~1%) events on CPU, allocation, GC, locks and I/O; open the `.jfr` in JDK Mission Control. **Unified logging**, `-Xlog:gc*,safepoint:file=gc.log:time,uptime`, covers GC, class loading and the JIT. In containers, run them inside the container or use `jcmd` via `kubectl exec`. The same data is available programmatically:",
      code: `Path file = Files.createTempFile("app", ".jfr");
try (var rec = new jdk.jfr.Recording()) {
    rec.enable("jdk.GarbageCollection");
    rec.enable("jdk.ObjectAllocationSample");
    rec.start();
    List<byte[]> junk = new ArrayList<>();
    for (int i = 0; i < 3_000; i++) { junk.add(new byte[100_000]); if (junk.size() > 200) junk.clear(); }
    rec.stop(); rec.dump(file);
}
Map<String, Integer> counts = new TreeMap<>();
for (var e : jdk.jfr.consumer.RecordingFile.readAllEvents(file)) counts.merge(e.getEventType().getName(), 1, Integer::sum);
System.out.println("JFR events: " + counts);
var hs = ManagementFactory.getPlatformMXBean(com.sun.management.HotSpotDiagnosticMXBean.class);
for (String f : List.of("UseG1GC", "MaxHeapSize", "UseCompressedOops", "TieredCompilation", "ReservedCodeCacheSize"))
    System.out.println(f + " = " + hs.getVMOption(f).getValue());` }
  ];

  H.registerLesson({
    code: "J29",
    summary: "Where a running JVM keeps things and how hot code gets fast: the heap with TLAB allocation and generations, thread stacks and `StackOverflowError`, Metaspace, the code cache and direct memory, object headers, compressed oops and alignment, escape analysis, the `OutOfMemoryError` family, tiered compilation from interpreter to C1 to C2, inlining, deoptimisation and warm-up, and the tools (`jcmd`, `jstat`, JFR, `-Xlog`) for inspecting a live JVM.",
    slides: SLIDES,
    widget: { heading: "Interactive: watch one hot method warm up", caption: "The same method run in five JIT configurations on JDK 21. Time and allocated bytes per batch were measured with ThreadMXBean; compile events come from -XX:+PrintCompilation.", render: j29Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Container sizing", "A pod with a 2 GB limit and `-Xmx2g` gets OOM-killed, because stacks, Metaspace, code cache and direct buffers live outside the heap."],
      ["Deploy latency spikes", "p99 latency doubles for the first two minutes after each deploy until the JIT has warmed up; warm-up traffic before readiness fixes it."],
      ["Netty services", "Heap looks fine but the process keeps growing: unreleased direct buffers, found with BufferPoolMXBean and NMT."],
      ["Recursion bugs", "A cyclic parent reference makes a recursive JSON serializer throw StackOverflowError."],
      ["Memory-hungry collections", "A `Map<Long, Long>` cache of 10 million entries uses ~800 MB of headers and boxes; primitive collections cut it to under 200 MB."],
      ["Benchmarks", "A hand-written timing loop 'proves' an optimisation that disappears under JMH because of dead-code elimination."]
    ],
    pitfalls: [
      "Setting the container limit equal to `-Xmx`",
      "Assuming `new` is expensive (it's GC work that costs, not allocation)",
      "Benchmarking without warm-up or JMH",
      "Ignoring which `OutOfMemoryError` message you got",
      "Giving heaps of 32–38 GB (losing compressed oops)",
      "Unbounded recursion on user-controlled depth",
      "Leaking direct buffers or class loaders while watching only heap usage",
      "Megamorphic hot call sites in tight loops"
    ],
    quiz: [
      { q: "Where are local primitive variables of a method stored?", options: ["Heap", "The thread's stack frame", "Metaspace", "Code cache"], answer: 1, why: "Objects they reference live on the heap." },
      { q: "Where is class metadata stored in Java 8+?", options: ["PermGen in the heap", "Metaspace (native memory)", "Code cache", "Young generation"], answer: 1, why: "PermGen was removed in Java 8." },
      { q: "How big is `new Object()` on a 64-bit JVM with compressed class pointers?", options: ["8 bytes", "12 bytes", "16 bytes", "24 bytes"], answer: 2, why: "12-byte header padded to 16." },
      { q: "In the widget, why does steady-state allocation drop to 0 bytes in the default mode?", options: ["GC runs faster", "C2's escape analysis scalar-replaces the non-escaping Points", "Objects move to Metaspace", "The interpreter caches objects"], answer: 1, why: "The 'escape analysis off' run still allocates 320 KB per batch." },
      { q: "What's the order of tiers for a hot method by default?", options: ["C2 → C1 → interpreter", "Interpreter → C1 (profiling) → C2", "Interpreter → C2 only", "AOT → C1"], answer: 1, why: "Tiered compilation." },
      { q: "What is deoptimisation?", options: ["Disabling the JIT", "Falling back from compiled code to the interpreter when a speculative assumption breaks", "GC compaction", "Removing unused classes"], answer: 1, why: "E.g. a new receiver type appears at a monomorphic call site." },
      { q: "`OutOfMemoryError: Metaspace` most likely indicates…", options: ["Too many objects", "A class loader leak or unbounded class generation", "Deep recursion", "Too many threads"], answer: 1, why: "Metaspace holds class metadata." },
      { q: "Why can a JVM process use more memory than -Xmx?", options: ["It can't", "Stacks, Metaspace, code cache, direct buffers, GC structures and native libraries are outside the heap", "-Xmx is a soft limit", "Because of TLABs"], answer: 1, why: "Size containers with headroom (J31)." },
      { q: "Which tool would you use to record low-overhead profiling data in production?", options: ["jconsole", "Java Flight Recorder (jcmd JFR.start)", "-Xint", "System.gc()"], answer: 1, why: "~1% overhead, continuous recording possible." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Command / flag"],
        ["Heap size", "`-Xms`, `-Xmx` (or `-XX:MaxRAMPercentage=75` in containers)"],
        ["Stack size", "`-Xss512k`"],
        ["Limit Metaspace / direct", "`-XX:MaxMetaspaceSize=256m`, `-XX:MaxDirectMemorySize=512m`"],
        ["Native memory", "`-XX:NativeMemoryTracking=summary` + `jcmd <pid> VM.native_memory summary`"],
        ["JIT activity", "`-XX:+PrintCompilation`, `jcmd <pid> Compiler.codecache`"],
        ["Flags in effect", "`jcmd <pid> VM.flags`, `java -XX:+PrintFlagsFinal -version`"],
        ["GC stats live", "`jstat -gcutil <pid> 1s`"],
        ["Flight recording", "`jcmd <pid> JFR.start duration=60s filename=app.jfr`"],
        ["Logs", "`-Xlog:gc*,safepoint:file=gc.log:time,uptime`"]],
      cards: [
        { title: "Memory areas", items: ["Heap: young + old", "Stack per thread", "Metaspace", "Code cache", "Direct memory"] },
        { title: "JIT", items: ["Interpreter → C1 → C2", "Inlining first", "Escape analysis", "Deoptimisation", "Warm-up"] },
        { title: "Say in interviews", items: ["SOE vs OOM variants", "Object header size", "Compressed oops < 32 GB", "TLAB allocation", "jcmd + JFR"] }]
    },
    practice: [
      { level: "Easy", q: "List the JVM memory areas and what lives in each.",
        a: ["Heap: objects and arrays (young/old generations), shared, garbage-collected.",
          "Stack (per thread): frames with locals, operand stacks, return addresses; PC register.",
          "Metaspace: class metadata; code cache: JIT-compiled code; direct memory: off-heap buffers.",
          "Plus native memory for threads, GC structures and libraries."] },
      { level: "Easy", q: "StackOverflowError vs OutOfMemoryError?",
        a: ["SOE: a thread's stack is exhausted, usually unbounded recursion; only that thread is affected.",
          "OOM: an allocation in some area (heap, Metaspace, direct, threads) failed even after GC.",
          "Both are Errors; the OOM message says which area."],
        code: `class R { static int n; static void go() { n++; go(); } }
try { R.go(); } catch (StackOverflowError e) { System.out.println("SOE after " + R.n + " frames"); }
try { long[] x = new long[Integer.MAX_VALUE - 8]; } catch (OutOfMemoryError e) { System.out.println("OOM: " + e.getMessage()); }` },
      { level: "Easy", q: "What is a TLAB and why does it make allocation fast?",
        a: ["Thread-local allocation buffer: a chunk of eden owned by one thread.",
          "Allocation is a pointer bump inside it, with no locks or CAS.",
          "When it fills, the thread gets a new TLAB; large objects may be allocated outside."] },
      { level: "Medium", q: "Estimate the memory of 1 million `Integer`s in an `ArrayList` vs an `int[]`, and verify.",
        a: ["Each Integer: 16 bytes (header + int, padded); each reference in the list's array: 4 bytes (compressed oops).",
          "≈ 20 MB plus the array growth slack vs 4 MB for int[1_000_000].",
          "Measure with the thread allocation counter (values outside the Integer cache)."],
        code: `var tb = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
long tid = Thread.currentThread().threadId();
long b0 = tb.getThreadAllocatedBytes(tid);
List<Integer> boxed = new ArrayList<>(1_000_000);
for (int i = 0; i < 1_000_000; i++) boxed.add(1_000 + i);
long b1 = tb.getThreadAllocatedBytes(tid);
int[] prim = new int[1_000_000];
long b2 = tb.getThreadAllocatedBytes(tid);
System.out.printf("ArrayList<Integer>: %.1f MB, int[]: %.1f MB%n", (b1 - b0) / 1e6, (b2 - b1) / 1e6);` },
      { level: "Medium", q: "Explain tiered compilation and why a service is slow right after startup.",
        a: ["Methods start interpreted; hot ones are compiled by C1 with profiling, then by C2 with profile-driven optimisations.",
          "Until the hot paths are compiled (seconds to minutes), requests run slower and the JIT uses CPU.",
          "Mitigate: warm-up traffic before readiness, CDS/AppCDS, CRaC, or GraalVM native image for startup-critical services."] },
      { level: "Medium", q: "What is escape analysis? Show an allocation it removes.",
        a: ["C2 checks whether an object can be seen outside the compiled method (after inlining).",
          "Non-escaping objects can be scalar-replaced (no heap allocation) and their locks elided.",
          "Storing the object in a field makes it escape."],
        code: `record Pair(int a, int b) { }
class EA { static int sum(int n) { int s = 0; for (int i = 0; i < n; i++) { Pair p = new Pair(i, i); s += p.a() + p.b(); } return s; } }
var tb = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
long tid = Thread.currentThread().threadId();
for (int w = 0; w < 300; w++) EA.sum(10_000);
long b0 = tb.getThreadAllocatedBytes(tid);
EA.sum(1_000_000);
System.out.println("bytes allocated for 1,000,000 Pairs after warm-up: " + (tb.getThreadAllocatedBytes(tid) - b0));` },
      { level: "Medium", q: "Why can a 36 GB heap hold fewer objects than a 31 GB heap?",
        a: ["Below ~32 GB the JVM uses compressed oops: 4-byte references scaled by 8-byte alignment.",
          "Above it references become 8 bytes, so every reference field and array slot doubles.",
          "Object-heavy heaps lose 20–40% of capacity; stay under 32 GB or go much larger."] },
      { level: "Hard", q: "A Java service in Kubernetes with `-Xmx3g` and a 3 GiB limit keeps getting OOM-killed without any Java OOM error. Investigate.",
        steps: ["OOMKilled means the kernel killed the process for exceeding the container limit; the heap never filled.",
          "Account for non-heap: threads × stack, Metaspace, code cache (~240 MB), direct buffers, GC structures, malloc arenas.",
          "Enable NMT and compare `jcmd VM.native_memory summary` with container RSS; check BufferPoolMXBean for direct memory.",
          "Fix: heap at ~70–75% of the limit (MaxRAMPercentage), cap direct memory and Metaspace, bound thread pools, set MALLOC_ARENA_MAX if glibc arenas grow.",
          "Alert on RSS vs limit, not only heap."] },
      { level: "Hard", q: "Your microbenchmark says a refactoring made code 3× faster, but production shows no change. What went wrong?",
        a: ["Hand-written loops suffer from missing warm-up, OSR artefacts, dead-code elimination (results unused), constant folding and GC noise.",
          "Use JMH: forks, warm-up iterations, Blackhole to consume results, @State to avoid constant folding.",
          "Check the benchmark matches production profiles (types seen at call sites, data sizes).",
          "Validate with production metrics or JFR profiles, not just the benchmark."] },
      { level: "Hard", q: "Write code that reports heap pools, code cache, Metaspace and direct memory usage, like a mini `jcmd`.",
        a: ["MemoryPoolMXBeans for heap and non-heap pools.",
          "BufferPoolMXBeans for direct and mapped buffers.",
          "ClassLoadingMXBean and ThreadMXBean for counts."],
        code: `ManagementFactory.getMemoryPoolMXBeans().forEach(p -> System.out.printf("%-34s %8d KB%n", p.getName(), p.getUsage().getUsed() >> 10));
ManagementFactory.getPlatformMXBeans(BufferPoolMXBean.class).forEach(b -> System.out.printf("%-34s %8d KB%n", "buffers: " + b.getName(), b.getMemoryUsed() >> 10));
System.out.println("classes loaded: " + ManagementFactory.getClassLoadingMXBean().getLoadedClassCount() + ", live threads: " + ManagementFactory.getThreadMXBean().getThreadCount());` }
    ],
    recap: [
      "Heap (young/old) holds objects; each thread has its own stack; Metaspace, code cache and direct memory live outside the heap.",
      "Allocation is a TLAB pointer bump; object headers are 12 bytes and sizes round up to 8; compressed oops need heaps under 32 GB.",
      "StackOverflowError is one thread's stack; each OutOfMemoryError message names the exhausted area.",
      "Tiered JIT: interpreter → C1 → C2 with inlining, escape analysis, speculation and deoptimisation; services need warm-up.",
      "Inspect with jcmd, jstat, JFR, NMT and -Xlog before guessing."
    ]
  });
})();
