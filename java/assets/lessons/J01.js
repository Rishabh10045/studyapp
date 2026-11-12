/* Lesson J01: Java basics & JDK / JRE / JVM */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  var STAGES = [
    ["Source", "`Hello.java`: plain text you write."],
    ["javac", "Parses, type-checks and compiles to bytecode. Syntax and type errors stop here."],
    ["Bytecode", "`Hello.class`: platform-neutral instructions + a constant pool."],
    ["Load", "A class loader finds the `.class` on the classpath (or in a JAR/module) and reads it."],
    ["Link", "Verify (is the bytecode safe?), prepare (static fields get defaults), resolve (symbolic → direct references)."],
    ["Initialise", "Static initialisers and static field assignments run, once, on first active use."],
    ["Interpret", "The JVM starts `main` and interprets bytecode, collecting profiles."],
    ["JIT", "Hot methods are compiled by C1, then C2, to native machine code."],
    ["Native", "Optimised machine code runs on the CPU; GC manages the heap the whole time."]
  ];
  var SCEN = {
    hello: { label: "Hello world", stop: 8, kind: "ok", msg: "Runs end to end. For a tiny program most code never gets hot enough to be JIT-compiled; it's interpreted and the JVM exits.", out: "$ javac Hello.java && java Hello\nHello, Deepak" },
    syntax: { label: "Missing semicolon", stop: 1, kind: "err", msg: "`javac` rejects the source: no `.class` file is written, so nothing ever runs.", out: "Hello.java:3: error: ';' expected\n        System.out.println(\"Hi\")\n                                 ^\n1 error" },
    nomain: { label: "No main method", stop: 6, kind: "err", msg: "Compiles fine and the class loads, but the launcher can't find a `main` entry point to start.", out: "Error: Main method not found in class Hello, please define the main method as:\n   public static void main(String[] args)" },
    missing: { label: "Dependency missing at runtime", stop: 3, kind: "err", msg: "The code compiled against `Util`, but `Util.class` isn't on the runtime classpath: loading fails when `Hello` first uses it.", out: "Exception in thread \"main\" java.lang.NoClassDefFoundError: Util\n\tat Hello.main(Hello.java:3)\nCaused by: java.lang.ClassNotFoundException: Util" },
    staticfail: { label: "Static initialiser throws", stop: 5, kind: "err", msg: "Initialisation runs static code; an exception there becomes `ExceptionInInitializerError`, and later uses of the class get `NoClassDefFoundError`.", out: "Exception in thread \"main\" java.lang.ExceptionInInitializerError\nCaused by: java.lang.ArithmeticException: / by zero\n\tat Config.<clinit>(Config.java:2)" },
    hot: { label: "Hot loop (10M iterations)", stop: 8, kind: "ok", msg: "The loop method crosses JIT thresholds: C1 compiles it quickly, then C2 recompiles it with aggressive optimisations (inlining, loop unrolling). Later iterations run much faster than the first ones.", out: "$ java -XX:+PrintCompilation Hot | grep sum\n    112   45       3       Hot::sum (22 bytes)\n    118   47       4       Hot::sum (22 bytes)\n" },
    wrongver: { label: "Compiled with newer JDK", stop: 3, kind: "err", msg: "Bytecode records a class-file version. A Java 21 class (version 65) can't load on a Java 17 JVM (max 61). Fix: run on a newer JVM or compile with `--release 17`.", out: "Error: LinkageError occurred while loading main class Hello\n\tjava.lang.UnsupportedClassVersionError: Hello has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0" }
  };
  function widget(el, ctx) {
    var s = ctx.state; if (!SCEN[s.sc]) s.sc = "hello"; if (s.k === undefined) s.k = 0;
    el.innerHTML = "<div class='seg' data-r='sc'></div><div class='diagram' data-r='lane' style='text-align:left;min-height:0;margin-top:12px'></div>" +
      "<h3 data-r='title' style='margin-top:12px'></h3><p data-r='desc'></p><div class='result' data-r='res'></div>" +
      "<div class='btnrow'><button type='button' class='btn' data-r='prev'>← Back</button><button type='button' class='btn primary' data-r='next'>Next stage →</button><button type='button' class='btn' data-r='end'>Run to the end</button><button type='button' class='btn' data-r='reset'>Restart</button></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("sc").innerHTML = Object.keys(SCEN).map(function (k) { return "<button type='button' data-k='" + k + "'>" + ctx.esc(SCEN[k].label) + "</button>"; }).join("");
    function draw() {
      var sc = SCEN[s.sc], k = Math.min(s.k, sc.stop);
      Array.prototype.forEach.call(q("sc").children, function (b) { b.className = b.getAttribute("data-k") === s.sc ? "on" : ""; });
      q("lane").innerHTML = "<div style='display:flex;flex-wrap:wrap;gap:6px'>" + STAGES.map(function (st, i) {
        var failed = sc.kind === "err" && i === sc.stop && k === sc.stop, after = i > sc.stop && sc.kind === "err";
        var bg = failed ? "var(--danger-bg)" : i < k ? "var(--success-bg)" : i === k ? "var(--accent-subtle)" : "var(--bg-subtle)";
        var bd = failed ? "var(--danger)" : i === k ? "var(--accent)" : "var(--border)";
        return "<div style='flex:1 1 0;min-width:64px;border:1px solid " + bd + ";background:" + bg + ";border-radius:10px;padding:8px;font-size:13px;opacity:" + (after ? 0.4 : 1) + "'><div style='font-family:var(--mono);font-size:11px;color:var(--text-3)'>" + (i + 1) + "</div><strong>" + ctx.esc(st[0]) + "</strong></div>";
      }).join("") + "</div>";
      q("title").textContent = "Stage " + (k + 1) + " of " + STAGES.length + ": " + STAGES[k][0];
      q("desc").innerHTML = ctx.md(STAGES[k][1]);
      var res = q("res");
      if (k === sc.stop) { res.hidden = false; res.className = "result " + (sc.kind === "ok" ? "ok" : "err"); res.innerHTML = "<div class='out'>" + (sc.kind === "ok" ? "Program finished" : "Stopped at " + STAGES[sc.stop][0]) + "</div><p style='margin-top:6px'>" + ctx.md(sc.msg) + "</p><pre class='code' style='margin-top:8px'><code>" + ctx.esc(sc.out) + "</code></pre>"; }
      else { res.hidden = true; }
      q("prev").disabled = k === 0; q("next").disabled = k >= sc.stop; q("end").disabled = k >= sc.stop;
    }
    q("sc").addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (!b) return; s.sc = b.getAttribute("data-k"); s.k = 0; ctx.save(); draw(); });
    q("prev").addEventListener("click", function () { s.k = Math.max(0, s.k - 1); ctx.save(); draw(); });
    q("next").addEventListener("click", function () { s.k = Math.min(SCEN[s.sc].stop, s.k + 1); ctx.save(); draw(); });
    q("end").addEventListener("click", function () { s.k = SCEN[s.sc].stop; ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { s.k = 0; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Java in one picture: JDK ⊃ JRE ⊃ JVM",
      text: "You write `.java` source. The **JDK** (Java Development Kit) has the tools to compile and debug it (`javac`, `jar`, `jshell`, `jcmd`, `jfr`…) **plus** a runtime. The **JRE** (Java Runtime Environment) is the runtime part: a **JVM** plus the standard class library (`java.base`, `java.sql`, …). The **JVM** is the engine that loads bytecode, verifies it, runs it (interpreter + JIT) and manages memory (GC). Since Java 11 Oracle and most vendors ship no separate JRE download: you install a JDK, or build a trimmed runtime with `jlink`.",
      m: M(["flowchart LR",
        "  subgraph JDK[\"JDK: develop + run\"]",
        "    T[\"Dev tools<br/>javac · jar · javadoc · jshell<br/>jlink · jcmd · jstack · jfr\"]:::s1",
        "    subgraph JRE[\"JRE: run\"]",
        "      L[\"Class library<br/>java.base, java.net.http, java.sql…\"]:::s2",
        "      subgraph JVM[\"JVM: HotSpot, OpenJ9…\"]",
        "        CL[\"Class loaders\"]:::s0",
        "        EE[\"Interpreter + JIT\"]:::s0",
        "        GC[\"Memory + GC\"]:::s0",
        "      end",
        "    end",
        "  end"]),
      table: [
        ["", "JVM", "JRE", "JDK"],
        ["What it is", "Spec + implementation that runs bytecode", "JVM + standard libraries", "JRE + compiler and tools"],
        ["Can compile?", "No", "No", "Yes (`javac`)"],
        ["Typical use", "Inside every Java process", "Production runtime (now: `jlink` image or JDK)", "Developer laptops, CI, often prod containers too"],
        ["Platform-specific?", "Yes (one per OS/CPU)", "Yes", "Yes"]],
      analogy: "A film. The JVM is the projector, the JRE is the projector plus the cinema hall, and the JDK is the whole studio: cameras and editing suite (compiler, tools) as well as a hall to screen the film. The bytecode reel plays on any projector, but each projector is built for its own building's power socket (OS and CPU)." },
    { title: "Anatomy of a Java program",
      text: "Every piece of Java code lives inside a **type** (class, interface, record, enum). A runnable program needs an entry point: `public static void main(String[] args)`. A public top-level class must be in a file with the same name (`Hello.java`). Packages map to folders and give classes their fully qualified name (`com.deepak.study.Hello`).",
      code: `public class Hello {                                    // class name = file name for public classes
    static final String GREETING = "Hello";             // static field: one per class
    public static void main(String[] args) {            // JVM entry point
        String name = args.length > 0 ? args[0] : "Deepak"; // local variable on the stack
        System.out.println(GREETING + ", " + name);       // System.out is a static PrintStream
        System.out.println("Java " + Runtime.version().feature());
    }
}`,
      points: [
        "`public`: launcher can call it from outside the class; `static`: no object is needed to start; `void`: the exit code comes from `System.exit`, not a return value",
        "`String[] args`: command-line arguments, never `null` (empty array when none)",
        "Statements end with `;`, blocks use `{}`; names are case-sensitive (`Main` ≠ `main`)",
        "Java 25 finalised **compact source files and instance main methods** (JEP 512): `void main() { IO.println(\"Hi\"); }` is legal. On Java 17/21 (and in interviews) write the classic signature"] },
    { title: "From source to running: javac, bytecode, java",
      text: "`javac` compiles each class into a `.class` file of **bytecode**: compact, platform-neutral instructions for a stack-based virtual machine. `java` starts a JVM, which loads the main class and runs it. Since Java 11 you can run a single source file directly (`java Hello.java`, compiled in memory), and `jshell` gives you a REPL for quick experiments.",
      lang: "bash",
      code: `$ javac -d out src/com/deepak/study/Hello.java   # compile → out/com/deepak/study/Hello.class
$ java -cp out com.deepak.study.Hello Rishabh     # run by fully qualified class name
Hello, Rishabh
Java 21

$ java Hello.java                                  # Java 11+: single-file source launch
$ jshell                                           # REPL
jshell> 7 / 2
$1 ==> 3
jshell> "java".toUpperCase()
$2 ==> "JAVA"`,
      m: M(["flowchart LR",
        "  S[\"Hello.java<br/>(source)\"]:::s1 --> J[\"javac<br/>parse · type-check · generate\"]",
        "  J --> B[\"Hello.class<br/>(bytecode)\"]:::s2",
        "  B --> R[\"java (JVM)<br/>load · link · init · execute\"]:::s0",
        "  R --> O[\"Linux x64, macOS arm64,<br/>Windows… same .class\"]"]),
      points: ["**Write once, run anywhere** is about bytecode: the same `.class` runs on any OS/CPU that has a JVM", "`javac --release 17` compiles for an older target *and* checks you only used Java 17 APIs (better than `-source`/`-target`)", "Compile errors (types, syntax) are caught by `javac`; class-not-found or linkage errors only appear at run time"] },
    { title: "What bytecode looks like",
      text: "Bytecode is the JVM's assembly language. The JVM is a **stack machine**: instructions push values onto an operand stack, operate on them and store results into local-variable slots. `javap -c` disassembles a class. You don't write bytecode, but reading it settles interview arguments (e.g. what `+=` on strings compiles to, or why `i++` isn't atomic).",
      lang: "text",
      code: `// Source
static int add(int a, int b) { int c = a + b; return c * 2; }

// $ javap -c Calc
static int add(int, int);
  Code:
     0: iload_0        // push local 0 (a)
     1: iload_1        // push local 1 (b)
     2: iadd           // pop two ints, push a+b
     3: istore_2       // pop into local 2 (c)
     4: iload_2
     5: iconst_2
     6: imul
     7: ireturn

// count++ on a field is three steps: getfield, iadd, putfield (not atomic: see J17/J19)`,
      m: M(["flowchart LR",
        "  subgraph F[\"Frame for add(3, 4)\"]",
        "    LV[\"Local variables<br/>0: a=3 · 1: b=4 · 2: c=7\"]:::s1",
        "    OS[\"Operand stack<br/>7 → 2 → 14\"]:::s2",
        "  end",
        "  LV -- iload --> OS",
        "  OS -- istore --> LV",
        "  OS -- ireturn --> RET([\"14 to caller\"])"]),
      points: ["Each method call gets a **frame** on the thread's stack: local-variable array + operand stack", "Typed opcodes: `i` = int, `l` = long, `d` = double, `a` = reference", "String concatenation compiles to an `invokedynamic` call to `StringConcatFactory` since Java 9"] },
    { title: "Class loading in 30 seconds",
      text: "Classes are loaded **lazily**, the first time they're needed. Three steps: **loading** (a class loader finds the bytes), **linking** (verify the bytecode is safe, prepare static fields with default values, resolve references) and **initialisation** (run static initialisers, top to bottom, exactly once, thread-safely). Loaders form a hierarchy and **delegate to their parent first**, so your code can't replace `java.lang.String`. Deep dive in J28.",
      m: M(["flowchart TB",
        "  B[\"Bootstrap loader<br/>java.base (String, Object…)\"]:::s0",
        "  P[\"Platform loader<br/>java.sql, java.xml…\"]:::s0",
        "  A[\"Application loader<br/>your classpath / module path\"]:::s1",
        "  C[\"Custom loaders<br/>Tomcat webapps, plugins\"]:::s2",
        "  C -- \"1: ask parent first\" --> A --> P --> B",
        "  B -. \"2: not found? child tries\" .-> P"]),
      code: `class Config {
    static final long STARTED = System.nanoTime();
    static { System.out.println("Config initialised"); }
    static String env() { return "prod"; }
}
class Constants {
    static final String NAME = "study";   // compile-time constant: inlined by javac
    static { System.out.println("Constants initialised"); }
}

System.out.println("main starts");
System.out.println(Constants.NAME);    // constant is inlined: does NOT initialise Constants
System.out.println(Config.env());      // first active use: initialises Config now
System.out.println(Config.env());      // already initialised: static block doesn't run again`,
      points: ["Initialisation triggers: `new`, static method call, non-constant static field access, reflection, subclass init, main class", "`ClassNotFoundException` (checked: explicit `Class.forName`/`loadClass` failed) vs `NoClassDefFoundError` (a class present at compile time is missing or failed to initialise at run time)", "Static init is thread-safe: the basis of the holder-class singleton (LLD F29)"] },
    { title: "Execution engine: interpreter + JIT",
      text: "HotSpot starts by **interpreting** bytecode while it counts method calls and loop iterations. Hot methods are compiled to native code by the **JIT** (just-in-time compiler) in tiers: **C1** compiles fast with light optimisation, then **C2** recompiles the hottest code with profile-guided optimisations: inlining, escape analysis, loop unrolling, dead-code elimination. If an assumption breaks (a new subclass is loaded), it **deoptimises** back to the interpreter. That's why Java services need **warm-up**, and why naive micro-benchmarks lie (use JMH).",
      code: `static long sum(int n) { long s = 0; for (int i = 0; i < n; i++) s += i % 7; return s; }

long check = 0;
long[] times = new long[5];
for (int round = 0; round < 5; round++) {
    long t0 = System.nanoTime();
    for (int k = 0; k < 200; k++) check += sum(10_000);
    times[round] = (System.nanoTime() - t0) / 1_000;
}
System.out.println("checksum " + check);
System.out.println("round 1 slower than round 5? " + (times[0] > times[4]) + " (usually true: JIT warm-up)");`,
      table: [
        ["Tier", "What runs", "Why"],
        ["0", "Interpreter", "Start instantly, collect profiles"],
        ["1–3", "C1-compiled code", "Quick native code, some with profiling"],
        ["4", "C2-compiled code", "Peak performance from the profile"],
        ["AOT / CDS / Leyden", "Pre-processed class data and profiles", "Faster startup (CDS archives; JDK 24+ AOT cache)"]],
      points: ["`-XX:+PrintCompilation` shows methods being compiled", "GraalVM `native-image` compiles ahead-of-time to a native binary: millisecond startup, but no runtime JIT and reflection needs configuration"] },
    { title: "JVM memory at a glance",
      text: "One JVM process, several memory areas. The **heap** holds every object and array and is shared by all threads; the garbage collector reclaims unreachable objects. Each thread has its own **stack** of frames (local variables, partial results). **Metaspace** (native memory, since Java 8 replaced PermGen) holds class metadata. The **code cache** holds JIT-compiled code. J02 covers stack vs heap in depth; J29–J31 cover GC and tuning.",
      m: M(["flowchart LR",
        "  subgraph Shared[\"Shared by all threads\"]",
        "    HP[\"Heap<br/>objects, arrays, String pool<br/>-Xms / -Xmx\"]:::s1",
        "    MS[\"Metaspace<br/>class metadata (native)\"]:::s2",
        "    CC[\"Code cache<br/>JIT output\"]:::s2",
        "  end",
        "  subgraph PerThread[\"Per thread\"]",
        "    ST[\"JVM stack<br/>frames: locals + operand stack<br/>-Xss\"]:::s0",
        "    PC[\"PC register\"]:::s0",
        "  end",
        "  ST -- \"references point to\" --> HP"]),
      code: `Runtime rt = Runtime.getRuntime();
System.out.println("CPUs visible to JVM: " + rt.availableProcessors());
System.out.println("max heap MB: " + rt.maxMemory() / (1024 * 1024));

int[] depth = {0};
Runnable recurse = new Runnable() { public void run() { depth[0]++; run(); } };
try { recurse.run(); }
catch (StackOverflowError e) { System.out.println("stack overflow after ~" + (depth[0] / 1000) * 1000 + " frames"); }

List<long[]> hog = new ArrayList<>();
try { while (true) hog.add(new long[10_000_000]); }
catch (OutOfMemoryError e) { int n = hog.size(); hog.clear(); System.out.println("heap full after " + n + " × 80 MB arrays: " + e.getMessage()); }`,
      points: ["`StackOverflowError`: too-deep recursion on one thread's stack. `OutOfMemoryError: Java heap space`: live objects exceed `-Xmx`", "In containers the JVM reads cgroup limits (Java 10+); default max heap is ¼ of the container memory; set `-XX:MaxRAMPercentage=75`", "Catching `Error`s like this is a demo only; in real code, let them crash and get a heap dump"] },
    { title: "The main method, arguments and exit codes",
      text: "The launcher finds `public static void main(String[] args)` (or `String... args`) in the class you name. Arguments are strings: parse them yourself. Return an exit code with `System.exit(n)`: 0 = success, non-zero = failure, which shells, CI and Kubernetes rely on. Uncaught exceptions on the main thread print a stack trace and exit with code 1 once all non-daemon threads finish.",
      code: `static int run(String[] args) {
    if (args.length < 2) { System.err.println("usage: Fare <from> <to> [adults]"); return 2; }
    String from = args[0].toUpperCase(), to = args[1].toUpperCase();
    int adults;
    try { adults = args.length > 2 ? Integer.parseInt(args[2]) : 1; }
    catch (NumberFormatException e) { System.err.println("adults must be a number: " + args[2]); return 2; }
    System.out.println(from + " → " + to + " for " + adults + " adult(s)");
    return 0;
}

System.out.println("exit code " + run(new String[]{"del", "blr", "2"}));
System.out.println("exit code " + run(new String[]{"del"}));
System.out.println("exit code " + run(new String[]{"del", "blr", "two"}));
// real main: public static void main(String[] a) { System.exit(run(a)); }`,
      points: ["`System.exit` runs shutdown hooks and stops the JVM even if other threads are running; avoid it inside libraries and web apps", "The JVM exits when the last **non-daemon** thread ends (a forgotten executor keeps it alive)", "`main` can be overloaded or inherited; only the exact signature is the entry point"] },
    { title: "Packages, classpath, JARs and modules",
      text: "The JVM finds classes on the **classpath** (`-cp`): folders and JAR files (zip archives of `.class` files plus `META-INF/MANIFEST.MF`). Packages give namespaces and package-private access. Since Java 9 the **module system (JPMS)** adds `module-info.java`, which declares what a module `requires` and `exports`: strong encapsulation of internals. The JDK itself is modular; most application code still uses the classpath, and that's fine.",
      table: [
        ["Concept", "What it is", "At work"],
        ["Package", "Namespace = folder (`com/acme/order`)", "Organise by feature; package-private for internals"],
        ["Classpath", "List of dirs/JARs searched in order", "First match wins: duplicate classes cause \"JAR hell\""],
        ["JAR", "Zip of classes + manifest (`Main-Class`)", "`java -jar app.jar`; Spring Boot builds a \"fat\" JAR with dependencies inside"],
        ["Module", "`module-info.java`: requires / exports", "Libraries and `jlink` images; apps often stay on the classpath"],
        ["Maven / Gradle", "Build tools that resolve dependencies and build JARs", "`mvn package`, `./gradlew build`; dependency tree for conflicts"]],
      lang: "text",
      code: `// module-info.java
module com.deepak.fares {
    requires java.net.http;              // depends on the JDK HTTP client module
    exports com.deepak.fares.api;        // only this package is visible to other modules
}

$ jar --create --file fares.jar --main-class com.deepak.fares.Main -C out .
$ java -jar fares.jar
$ jdeps --print-module-deps fares.jar      # which JDK modules do I need?
$ jlink --add-modules java.base,java.net.http --output runtime   # trimmed runtime (~50 MB)`,
      points: ["`NoSuchMethodError` at run time usually means two versions of one library on the classpath: check `mvn dependency:tree`", "Reflection into JDK internals is blocked by default since Java 16/17 (`--add-opens` to override)"] },
    { title: "Java versions, LTS and preview features",
      text: "Java ships a feature release every **six months** (March and September). Every two years one is a **long-term support** (LTS) release: 8, 11, 17, 21, 25. Companies standardise on LTS versions; most current projects run **17 or 21**, and Spring Boot 3 requires at least 17. New language features often appear first as **preview** (`--enable-preview`) or **incubator** APIs, and are finalised a release or two later. OpenJDK is the open-source reference; Oracle, Eclipse Temurin, Amazon Corretto, Azul Zulu and Microsoft build their distributions from it.",
      table: [
        ["Version", "Year", "Headline features"],
        ["8 (LTS)", "2014", "Lambdas, streams, `Optional`, `java.time`, default methods"],
        ["11 (LTS)", "2018", "`var` (10), `HttpClient`, single-file launch, String helpers"],
        ["17 (LTS)", "2021", "Records, sealed classes, text blocks, switch expressions, pattern `instanceof`"],
        ["21 (LTS)", "2023", "Virtual threads, record & switch patterns, sequenced collections"],
        ["25 (LTS)", "2025", "Scoped values, compact source files & instance main, module imports, flexible constructor bodies"]],
      code: `record Fare(String route, int rupees) {}                     // 16+: records
sealed interface Seat permits Window, Aisle {}               // 17: sealed types
record Window(int row) implements Seat {}
record Aisle(int row) implements Seat {}

static String describe(Object o) {
    return switch (o) {                                       // 21: pattern matching for switch
        case Fare(String r, int p) when p > 5000 -> "pricey fare " + r;  // record pattern + guard
        case Fare f -> "fare " + f.route();
        case Window w -> "window seat in row " + w.row();
        default -> "something else";
    };
}

var text = """
    Java %d says hi
    """.formatted(Runtime.version().feature());               // 15+: text blocks, 10+: var
System.out.print(text);
System.out.println(describe(new Fare("DEL-BLR", 6200)) + " | " + describe(new Window(12)));`,
      points: ["J13/J14 cover the modern features in depth", "Say in interviews which LTS you used and one feature you relied on (records, virtual threads)"] },
    { title: "JDK tools you'll actually use at work",
      text: "The JDK isn't just `javac`. When a production service is slow, stuck or leaking memory, these tools (all in `$JAVA_HOME/bin`) answer the question without restarting it. `jcmd` is the Swiss-army knife; Java Flight Recorder (`jfr`) is a low-overhead always-on profiler.",
      table: [
        ["Tool", "Use it for", "Example"],
        ["`jps` / `jcmd -l`", "List running JVMs", "`jcmd -l`"],
        ["`jcmd <pid> Thread.print` / `jstack`", "Thread dump: deadlocks, stuck threads", "Take 3 dumps 5 s apart and compare"],
        ["`jcmd <pid> GC.heap_info` / `jstat -gc`", "Heap and GC behaviour", "`jstat -gc <pid> 1s`"],
        ["`jcmd <pid> GC.heap_dump file.hprof`", "Heap dump for a memory leak", "Open in Eclipse MAT / VisualVM"],
        ["`jcmd <pid> JFR.start duration=60s filename=r.jfr`", "Profile CPU, allocations, locks, I/O", "Open in JDK Mission Control"],
        ["`jcmd <pid> VM.flags` / `VM.system_properties`", "What settings is it really running with?", "Check heap size inside a container"],
        ["`javap -c -p`", "Disassemble bytecode", "Settle \"what does this compile to?\""],
        ["`jshell`", "Try an API in seconds", "`jshell> List.of(1,2).reversed()`"]],
      points: ["Run them as the same OS user as the JVM; in Kubernetes: `kubectl exec` into the pod", "`-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps` should be set on every production service"] },
    { title: "\"Write once, run anywhere\": the fine print",
      text: "Bytecode is portable, but your program still touches the OS: file paths, line endings, character encodings, time zones, available memory and CPUs. Portable code uses the APIs that hide those differences. One big change: since **Java 18 the default charset is UTF-8** everywhere (JEP 400), so code that relied on the platform encoding behaves differently on old Windows setups.",
      code: `Path p = Path.of("data", "fares", "del-blr.csv");            // right separator on every OS
System.out.println("path: " + p + " (separator '" + File.separator + "')");
System.out.println("line separator length: " + System.lineSeparator().length());
System.out.println("default charset: " + Charset.defaultCharset());   // UTF-8 on Java 18+

byte[] bytes = "₹ 4,850".getBytes(StandardCharsets.UTF_8);           // always pass the charset explicitly
System.out.println(bytes.length + " bytes → " + new String(bytes, StandardCharsets.UTF_8));
System.out.println("zone: " + ZoneId.of("Asia/Kolkata") + ", os: " + System.getProperty("os.name"));`,
      points: ["Pass charsets and time zones explicitly; never rely on server defaults", "Native code (JNI, Panama FFM API in Java 22+) and OS-specific paths are where portability ends", "Containers make the environment repeatable, which is why most teams ship Java in Docker images (S16)"] }
  ];

  H.registerLesson({
    code: "J01",
    summary: "How Java code becomes a running program: JDK vs JRE vs JVM, the anatomy of a class and `main`, `javac` → bytecode → `java`, reading bytecode with `javap`, lazy class loading and initialisation, the interpreter + JIT tiers and warm-up, JVM memory areas, arguments and exit codes, packages/classpath/JARs/modules, the LTS release train (8 → 25), the JDK diagnostic tools you use in production, and where \"write once, run anywhere\" ends.",
    slides: SLIDES,
    widget: { heading: "Interactive: follow a program through the JVM", caption: "Pick a scenario and step through source → javac → bytecode → load → link → initialise → interpret → JIT. Failing scenarios stop at the stage where the error really happens, with the message you'd see.", render: widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Spring Boot fat JARs", "`mvn package` produces one executable JAR with your classes and every dependency inside; `java -jar app.jar` starts the embedded Tomcat. Layered JARs make Docker image layers cache well (S16)."],
      ["Docker images with a trimmed runtime", "Multi-stage builds compile with a full JDK, then ship a `jlink`ed runtime or a JRE-style base image (e.g. `eclipse-temurin:21-jre`) to cut image size."],
      ["Other JVM languages", "Kotlin, Scala, Groovy and Clojure compile to the same bytecode and call Java libraries directly: the JVM is the platform, Java one of its languages."],
      ["Android", "Android apps are written in Java/Kotlin, but run on ART with DEX bytecode, not on a JVM. Same language, different runtime."],
      ["Production debugging", "\"Service stuck\" → `jcmd <pid> Thread.print`; \"memory climbing\" → heap dump + MAT; \"slow after deploy\" → JFR recording and JIT warm-up checks."],
      ["Version upgrades", "Upgrading 11 → 17 → 21 means recompiling, fixing illegal-reflective-access errors (strong encapsulation) and bumping libraries like Lombok and Mockito that touch internals."]
    ],
    pitfalls: [
      "Saying the JVM \"compiles Java\": `javac` compiles source to bytecode; the JVM interprets and JIT-compiles bytecode",
      "Calling Java \"interpreted, so slow\": hot code runs as optimised native code after warm-up",
      "Benchmarking with one `System.nanoTime()` loop: no warm-up, dead-code elimination; use JMH",
      "Running with a different Java version than you compiled for: `UnsupportedClassVersionError`; use `--release`",
      "Confusing `ClassNotFoundException` (checked, explicit lookup) with `NoClassDefFoundError` (missing/failed class at run time)",
      "Relying on the default charset or time zone of the server",
      "Not setting heap limits relative to container memory (`-XX:MaxRAMPercentage`)",
      "Forgetting that a non-daemon thread (an un-shut-down executor) keeps the JVM alive after `main` returns"
    ],
    quiz: [
      { q: "Which contains the other two?", options: ["JVM", "JRE", "JDK", "None, they're unrelated"], answer: 2, why: "JDK = JRE + development tools; JRE = JVM + class library." },
      { q: "What does `javac` produce?", options: ["Native machine code", "Bytecode in `.class` files", "A JAR", "Assembly for the current CPU"], answer: 1, why: "Bytecode is platform-neutral; the JVM turns it into native code at run time." },
      { q: "Why does `Constants.NAME` not trigger initialisation of `Constants` when `NAME` is `static final String NAME = \"study\"`?", options: ["Strings are special", "It's a compile-time constant, inlined into the caller by javac", "Static blocks run lazily on GC", "It does trigger it"], answer: 1, why: "Constant variables are copied into the using class's constant pool." },
      { q: "A JAR compiled with JDK 21 runs on a Java 17 JVM. What happens?", options: ["It runs in compatibility mode", "`UnsupportedClassVersionError` (class file 65 > 61)", "It's recompiled automatically", "Only new APIs fail"], answer: 1, why: "Compile with `--release 17` to target 17." },
      { q: "What is JIT warm-up?", options: ["Preloading classes from disk", "Running slower at first while the JVM interprets and profiles, before hot methods are compiled to optimised native code", "Heating the CPU", "Garbage collection at startup"], answer: 1, why: "Interpreter → C1 → C2 as methods get hot." },
      { q: "Which memory area is per thread?", options: ["Heap", "Metaspace", "JVM stack", "Code cache"], answer: 2, why: "Each thread has its own stack of frames; the heap is shared." },
      { q: "Which releases are LTS?", options: ["9, 13, 17", "8, 11, 17, 21, 25", "Every release", "Only 8 and 11"], answer: 1, why: "A new LTS every two years since 17." },
      { q: "Why can't you replace `java.lang.String` by putting your own `String.class` on the classpath?", options: ["Strings are final", "Parent-first delegation: the bootstrap loader loads the JDK's String first (and java.* packages are protected)", "The JIT ignores it", "You can"], answer: 1, why: "Delegation model + package restrictions." },
      { q: "What does this print?", code: `class A { static { System.out.print("A"); } static int x = 1; }
System.out.print("M");
int y = A.x;
y = A.x;
System.out.println(y);`, options: ["AM1", "MA1", "MAA1", "M1"], answer: 1, why: "`A` initialises lazily on first access to the non-constant field `x`, and only once." }
    ],
    cheatsheet: {
      table: [
        ["Question", "Short answer"],
        ["JDK vs JRE vs JVM", "Tools + runtime ⊃ libraries + JVM ⊃ bytecode engine"],
        ["Compile / run", "`javac -d out X.java` → `java -cp out pkg.X`; `java X.java` for one file"],
        ["Bytecode", "Platform-neutral stack-machine instructions in `.class`; `javap -c`"],
        ["Class loading", "Lazy; load → link (verify, prepare, resolve) → initialise once; parent-first"],
        ["Execution", "Interpreter → C1 → C2 JIT; deoptimise on broken assumptions"],
        ["Memory", "Heap (objects, shared), stack (per thread), metaspace, code cache"],
        ["Errors", "Compile error vs `NoClassDefFoundError` vs `UnsupportedClassVersionError`"],
        ["LTS", "8, 11, 17, 21, 25; six-month cadence; Spring Boot 3 needs 17+"]],
      cards: [
        { title: "Flags worth knowing", items: ["`-Xms` / `-Xmx` heap", "`-Xss` thread stack", "`-XX:MaxRAMPercentage=75`", "`-XX:+HeapDumpOnOutOfMemoryError`", "`--release 17`", "`--enable-preview`"] },
        { title: "Production toolkit", items: ["`jcmd -l`", "`jcmd <pid> Thread.print`", "`jcmd <pid> GC.heap_dump`", "`jcmd <pid> JFR.start`", "`jstat -gc <pid> 1s`"] },
        { title: "Say in interviews", items: ["Bytecode = portability", "JIT = performance after warm-up", "GC = automatic memory, not free memory", "LTS 17/21 in production", "Platform defaults: be explicit"] }]
    },
    practice: [
      { level: "Easy", q: "Explain the difference between the JDK, JRE and JVM, and which one a production Docker image needs.",
        a: ["**JVM**: the virtual machine that loads, verifies and executes bytecode and manages memory. Platform-specific implementation of a portable spec.",
          "**JRE**: JVM + standard class library: everything needed to *run* Java programs.",
          "**JDK**: JRE + development tools (`javac`, `jar`, `jlink`, `jcmd`, `jfr`, `jshell`…): needed to *build*.",
          "Production needs only a runtime: a JRE-style base image or a `jlink` image with just the modules the app uses. Many teams still ship a full JDK image because the diagnostic tools (`jcmd`) are handy in prod: a trade-off between image size and debuggability."] },
      { level: "Easy", q: "Is Java compiled or interpreted?",
        a: ["Both, in stages. `javac` compiles source **ahead of time** into bytecode.",
          "At run time the JVM first **interprets** bytecode while profiling it, then the **JIT** compiles hot methods to native code (C1 quickly, C2 with heavy optimisation).",
          "So steady-state Java runs as optimised machine code, often with optimisations a static compiler can't make (it knows the actual types and branches taken). The cost is warm-up time.",
          "GraalVM native-image is an exception: full AOT compilation to a native binary."] },
      { level: "Easy", q: "What happens, step by step, when you run `java -cp out com.acme.App`?",
        steps: ["The launcher starts a JVM process: reads options, sizes the heap, starts GC and JIT threads.",
          "The bootstrap loader loads core classes (`java.lang.Object`, `String`…) from the runtime image.",
          "The application class loader finds `com/acme/App.class` under `out/` and loads it.",
          "Linking: the bytecode is verified, static fields get default values, references are resolved (lazily).",
          "Initialisation: `App`'s static initialisers run.",
          "The launcher calls `App.main(args)` on the main thread; classes used by `main` load lazily as they're touched.",
          "Bytecode is interpreted; hot methods get JIT-compiled; GC reclaims garbage throughout.",
          "When the last non-daemon thread ends (or `System.exit` is called), shutdown hooks run and the JVM exits with an exit code."] },
      { level: "Medium", q: "Predict the output, then explain the order of initialisation.",
        qcode: `class Parent { static { System.out.println("Parent static"); } { System.out.println("Parent instance"); } Parent() { System.out.println("Parent()"); } }
class Child extends Parent { static { System.out.println("Child static"); } { System.out.println("Child instance"); } Child() { System.out.println("Child()"); } }

System.out.println("main");
new Child();
new Child();`,
        a: ["Output: `main`, `Parent static`, `Child static`, `Parent instance`, `Parent()`, `Child instance`, `Child()`, then for the second object only the four instance lines again.",
          "Class initialisation happens once, on first active use, and a superclass is initialised before its subclass.",
          "For each `new`: the superclass constructor chain runs first; within each class, instance initialiser blocks and field initialisers run before the constructor body.",
          "Static blocks never run twice per class loader."] },
      { level: "Medium", q: "Your service throws `java.lang.NoClassDefFoundError: com/fasterxml/jackson/databind/ObjectMapper` in production but works locally. How do you debug it?",
        a: ["The class existed at compile time but isn't loadable at run time. Two common causes: the JAR is missing from the runtime classpath, or the class **failed static initialisation** earlier (look for an earlier `ExceptionInInitializerError` in the logs).",
          "Check the artifact: `jar tf app.jar | grep jackson` (Spring Boot: under `BOOT-INF/lib/`). Was the dependency `provided`/`test` scope by mistake?",
          "Check for version conflicts: `mvn dependency:tree -Dincludes=com.fasterxml.jackson.core`; different versions on the classpath give `NoSuchMethodError`/`NoClassDefFoundError`.",
          "Compare the run command and base image between local and prod (`jcmd <pid> VM.system_properties` shows `java.class.path`).",
          "Fix the build (scope/shading), add a test that boots the packaged JAR in CI."] },
      { level: "Medium", q: "Why do naive Java micro-benchmarks give misleading numbers? Write a better quick measurement and say what a real benchmark uses.",
        code: `static long work(int n) { long s = 0; for (int i = 0; i < n; i++) s += (i * 31L) ^ (s >>> 3); return s; }

long sink = 0;
for (int i = 0; i < 20_000; i++) sink += work(1_000);      // 1. warm up so the JIT compiles work()
int runs = 2_000;
long t0 = System.nanoTime();
for (int i = 0; i < runs; i++) sink += work(1_000);         // 2. measure many iterations
long avgNs = (System.nanoTime() - t0) / runs;
System.out.println("avg per call ≈ " + avgNs + " ns (sink used: " + (sink != 0) + ")");   // 3. use the result so it isn't eliminated`,
        a: ["Problems: no warm-up (timing the interpreter), dead-code elimination (unused results get optimised away), on-stack replacement and inlining changing mid-loop, GC pauses, timer resolution, CPU frequency scaling.",
          "Better quick check: warm up first, measure many iterations, consume the result (a `sink`), repeat runs and look at the spread.",
          "Real answer: **JMH** (Java Microbenchmark Harness), which forks JVMs, runs warm-up and measurement iterations, and uses `Blackhole` to defeat dead-code elimination."] },
      { level: "Medium", q: "A team compiles with JDK 21 but some customers run Java 17. What should they do, and what breaks if they don't?",
        a: ["Without action, every class has class-file version 65; a Java 17 JVM throws `UnsupportedClassVersionError` when loading it.",
          "Compile with `javac --release 17` (Maven: `<maven.compiler.release>17</maven.compiler.release>`). This sets the bytecode version **and** compiles against the Java 17 API signatures, so using a Java 21-only API (e.g. `List.reversed()`) fails at compile time.",
          "`-source 17 -target 17` alone is not enough: it would still let you call Java 21 APIs and fail later with `NoSuchMethodError`.",
          "Test in CI on both 17 and 21 (a matrix build)."] },
      { level: "Hard", q: "A Spring Boot service in Kubernetes (memory limit 2 GiB) is OOM-killed by the kernel, but logs show no `OutOfMemoryError`. Explain and fix.",
        a: ["The kernel killed the container for exceeding its cgroup limit: total **process** memory, not just heap. JVM memory = heap + metaspace + thread stacks (~1 MB each × threads) + code cache + direct/NIO buffers + GC structures + native libs.",
          "If `-Xmx` is set close to 2 GiB (or a percentage near 100%), heap alone fills the limit and native memory pushes it over. The JVM never hits its own heap limit, so no `OutOfMemoryError`.",
          "Fix: size heap as a percentage, e.g. `-XX:MaxRAMPercentage=70`, leaving headroom; cap threads (pool sizes, or virtual threads); limit direct memory (`-XX:MaxDirectMemorySize`).",
          "Diagnose: `jcmd <pid> VM.native_memory summary` with `-XX:NativeMemoryTracking=summary`; watch container metrics vs heap metrics (S10)."] },
      { level: "Hard", q: "How would you diagnose a production Java service that suddenly stops responding (no errors, CPU near 0%)?",
        steps: ["Low CPU + no responses suggests threads are **blocked or waiting**, not busy: deadlock, pool exhaustion, or waiting on a slow dependency.",
          "Take 3 thread dumps ~5 s apart: `jcmd <pid> Thread.print` (or `jstack`). The JVM reports Java-level deadlocks at the end of the dump.",
          "Look at request threads (e.g. `http-nio-8080-exec-*`): all `WAITING` on `HikariPool.getConnection` = connection-pool exhaustion; `BLOCKED` on one monitor = lock contention; stuck in `SocketInputStream.read` = a downstream call with no timeout.",
          "Check GC: `jstat -gc <pid> 1s`; long full GCs freeze everything (but usually with high CPU).",
          "Fix the root cause (add timeouts, fix lock ordering, size pools) and add monitoring: thread-pool and connection-pool metrics via Actuator (S10).",
          "Concurrency deep dives: J26 (deadlock) and LLD F27–F28."] },
      { level: "Hard", q: "Explain the JIT tiers and give two optimisations C2 performs that a static compiler can't easily do.",
        a: ["Tiered compilation: tier 0 interpreter (profiling), tiers 1–3 C1 (fast compile, some with profiling), tier 4 C2 (optimised from profiles).",
          "**Speculative devirtualisation and inlining**: if a call site has only ever seen one implementation of an interface, C2 inlines that implementation directly, guarded by a cheap type check; if another class shows up it deoptimises.",
          "**Escape analysis + scalar replacement**: an object that never escapes a method can be broken into its fields in registers, so it's never allocated on the heap.",
          "Also: branch layout from real branch frequencies, loop unrolling and vectorisation, eliminating null and bounds checks that never fail.",
          "Trade-off: warm-up time and deoptimisation; the JVM may also deoptimise after class loading invalidates assumptions."] }
    ],
    recap: [
      "JDK (build) ⊃ JRE (run) ⊃ JVM (execute bytecode + manage memory).",
      "`javac` compiles to portable bytecode; `java` loads it lazily: load → link → initialise once, parent-first.",
      "HotSpot interprets first, then JIT-compiles hot code (C1 → C2): fast after warm-up; benchmark with JMH.",
      "Memory: shared heap (objects), per-thread stacks, metaspace, code cache; size heaps relative to container limits.",
      "Use LTS 17/21, compile with `--release`, be explicit about charsets/time zones, and know `jcmd`, thread dumps, heap dumps and JFR for production."
    ]
  });
})();
