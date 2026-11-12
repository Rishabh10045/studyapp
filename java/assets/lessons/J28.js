/* Lesson J28: Class loading & linking */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded on JDK 21: each action ran in a fresh JVM (java -cp out Init <action>). "log" is the order in which static
  // and instance initialisers ran, "loaded" comes from -Xlog:class+load for the demo classes. For "ncdfe" the class
  // Deleted was compiled and then its .class file removed.
  var REC = {"const": {"log": [], "result": "42", "loaded": []}, "boxed": {"log": ["Parent: static block", "Parent: parentField initialiser"], "result": "7", "loaded": ["Parent"]}, "viaChild": {"log": ["Parent: static block", "Parent: parentField initialiser"], "result": "1", "loaded": ["Parent", "Child"]}, "staticMethod": {"log": ["Parent: static block", "Parent: parentField initialiser", "Child: static block", "Child: childField initialiser", "Child.hello() runs"], "result": null, "loaded": ["Parent", "Child"]}, "new": {"log": ["Parent: static block", "Parent: parentField initialiser", "Child: static block", "Child: childField initialiser", "Parent: instance field", "Parent: instance block", "Parent: constructor", "Child: instance field", "Child: constructor"], "result": "Child", "loaded": ["Parent", "Child"]}, "array": {"log": [], "result": "3", "loaded": ["Parent", "Child"]}, "classLiteral": {"log": [], "result": "Child", "loaded": ["Parent", "Child"]}, "forNameNoInit": {"log": [], "result": "Child", "loaded": ["Parent", "Child"]}, "forName": {"log": ["Parent: static block", "Parent: parentField initialiser", "Child: static block", "Child: childField initialiser"], "result": "Child", "loaded": ["Parent", "Child"]}, "trap": {"log": [], "result": "a=1, b=10", "loaded": ["Trap"]}, "broken": {"log": ["attempt 1: java.lang.ExceptionInInitializerError: null (cause: java.lang.NumberFormatException: For input string: \"not-a-number\")", "attempt 2: java.lang.NoClassDefFoundError: Could not initialize class Broken (cause: java.lang.ExceptionInInitializerError: Exception java.lang.NumberFormatException: For input string: \"not-a-number\" [in thread \"main\"])"], "result": null, "loaded": ["Broken"]}, "lazyOther": {"log": ["LazySingleton: static block", "LazySingleton.other() runs"], "result": null, "loaded": ["LazySingleton"]}, "lazyGet": {"log": ["LazySingleton: static block", "LazySingleton.other() runs", "Holder: static block", "LazySingleton: constructor", "get() again \u2192 same instance: true"], "result": null, "loaded": ["LazySingleton", "LazySingleton$Holder"]}, "cnfe": {"log": ["threw java.lang.ClassNotFoundException: com.shop.MissingPlugin"], "result": null, "loaded": []}, "ncdfe": {"log": ["threw java.lang.NoClassDefFoundError: Deleted"], "result": null, "loaded": []}};
  var SRC = "class Parent {\n    static { log(\"Parent: static block\"); }\n    static int parentField = init(\"Parent: parentField initialiser\", 1);\n    static final int CONST = 42;            // compile-time constant\n    static final Integer BOXED = 7;         // not a compile-time constant\n    int p = init(\"Parent: instance field\", 1);\n    { log(\"Parent: instance block\"); }\n    Parent() { log(\"Parent: constructor\"); }\n}\nclass Child extends Parent {\n    static { log(\"Child: static block\"); }\n    static int childField = init(\"Child: childField initialiser\", 5);\n    int c = init(\"Child: instance field\", 2);\n    Child() { super(); log(\"Child: constructor\"); }\n    static void hello() { log(\"Child.hello() runs\"); }\n}";
  var ACTS = [
    { k: "const", label: "Parent.CONST", code: "int x = Parent.CONST;", why: "`CONST` is a **compile-time constant**: javac copied 42 into the caller's bytecode, so `Parent` is **not even loaded**." },
    { k: "boxed", label: "Parent.BOXED", code: "Integer x = Parent.BOXED;", why: "`Integer` constants aren't compile-time constants, so reading one is a real static field access: `Parent` is loaded and **initialised** (static blocks and initialisers in textual order)." },
    { k: "viaChild", label: "Child.parentField", code: "int x = Child.parentField;", why: "Only the class that **declares** the field is initialised. `Child` is loaded (to resolve the reference) but its static block **doesn't run**." },
    { k: "staticMethod", label: "Child.hello()", code: "Child.hello();", why: "Invoking a static method initialises `Child`, and a class's **superclass is always initialised first**." },
    { k: "new", label: "new Child()", code: "new Child();", why: "Static init (Parent, then Child) happens once; then **per object**: Parent's instance fields/blocks and constructor, then Child's fields/blocks and constructor body." },
    { k: "array", label: "new Child[3]", code: "Child[] a = new Child[3];", why: "Creating an **array** of a type loads it but doesn't initialise it: no `Child` objects exist yet." },
    { k: "classLiteral", label: "Child.class", code: "Class<?> c = Child.class;", why: "A class literal loads the class without initialising it." },
    { k: "forNameNoInit", label: "forName(…, false, …)", code: "Class.forName(\"Child\", false, loader);", why: "With `initialize = false`, `forName` only loads. Frameworks scan classes this way." },
    { k: "forName", label: "forName(\"Child\")", code: "Class.forName(\"Child\");", why: "The one-argument `forName` **initialises** the class. This is how old JDBC drivers registered themselves from a static block." },
    { k: "trap", label: "static init order trap", code: "class Trap {\n    static int a = Trap.b + 1;   // b is still 0 here\n    static int b = 10;\n}\nSystem.out.println(\"a=\" + Trap.a + \", b=\" + Trap.b);", why: "Static initialisers run **top to bottom**. When `a` is computed, `b` still has its default value 0, so `a` is 1, not 11." },
    { k: "broken", label: "failing static init", code: "class Broken { static int value = Integer.parseInt(\"not-a-number\"); }\nBroken.use();   // twice", why: "The first failure surfaces as **`ExceptionInInitializerError`**. The class is then marked erroneous: every later use throws **`NoClassDefFoundError: Could not initialize class`**, a classic confusing production log." },
    { k: "lazyOther", label: "lazy holder: other()", code: "LazySingleton.other();   // class has a nested Holder with INSTANCE", why: "**Lazy holder idiom**: using the outer class doesn't touch `Holder`, so the singleton isn't created yet." },
    { k: "lazyGet", label: "lazy holder: get()", code: "LazySingleton.other();\nLazySingleton.get();     // return Holder.INSTANCE;", why: "The first `get()` initialises `Holder`, which creates the instance. Class initialisation is **thread-safe** by JVM spec, so no locks or volatile are needed." },
    { k: "cnfe", label: "forName(missing class)", code: "Class.forName(\"com.shop.MissingPlugin\");", why: "Looking up a class **by name at runtime** that no loader can find: checked **`ClassNotFoundException`**." },
    { k: "ncdfe", label: "compiled class deleted", code: "new Deleted();   // compiled fine, Deleted.class removed before running", why: "The class existed at **compile time** but is missing at runtime (wrong jar version, shaded dependency): **`NoClassDefFoundError`**." }
  ];
  function j28Widget(el, ctx) {
    var s = ctx.state; if (!s.k) s.k = "viaChild";
    el.innerHTML = "<details><summary style='cursor:pointer'>Show Parent / Child source</summary><pre class='code' data-r='src'></pre></details>" +
      "<div class='btnrow' data-r='acts' style='margin-top:8px'>" + ACTS.map(function (a) { return "<button type='button' class='btn' data-k='" + a.k + "'>" + ctx.esc(a.label) + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='code' style='margin-top:8px'></pre><div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><pre class='code' data-r='log'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("src").innerHTML = ctx.H.highlight(SRC, "java");
    function draw() {
      var a = ACTS.filter(function (x) { return x.k === s.k; })[0], r = REC[a.k];
      q("acts").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b.dataset.k === s.k); });
      q("code").innerHTML = ctx.H.highlight(a.code, "java");
      var names = { const: ["Parent"], boxed: ["Parent"], viaChild: ["Parent", "Child"], staticMethod: ["Parent", "Child"], "new": ["Parent", "Child"], array: ["Parent", "Child"], classLiteral: ["Parent", "Child"], forNameNoInit: ["Parent", "Child"], forName: ["Parent", "Child"], trap: ["Trap"], broken: ["Broken"], lazyOther: ["LazySingleton", "LazySingleton$Holder"], lazyGet: ["LazySingleton", "LazySingleton$Holder"], cnfe: ["com.shop.MissingPlugin"], ncdfe: ["Deleted"] }[a.k];
      var L = ["flowchart LR"];
      names.forEach(function (n, i) {
        var loaded = r.loaded.indexOf(n) >= 0, short = n.replace("LazySingleton$", "");
        var inited = r.log.some(function (x) { return x.indexOf(short + ": static") === 0; }) || (a.k === "trap" && n === "Trap");
        var failed = a.k === "broken";
        L.push("  L" + i + "[\"" + n.replace("$", ".") + "<br/>load\"]:::" + (loaded ? "ok" : "no"));
        L.push("  K" + i + "[\"link<br/>verify, prepare, resolve\"]:::" + (inited || failed ? "ok" : loaded ? "maybe" : "no"));
        L.push("  I" + i + "[\"initialise<br/>run #lt;clinit#gt;\"]:::" + (failed ? "bad" : inited ? "ok" : "no"));
        L.push("  L" + i + " --> K" + i + " --> I" + i);
      });
      L.push("  classDef ok fill:#e8f5e9,stroke:#2e7d32", "  classDef maybe fill:#fff7ed,stroke:#f59e0b,color:#92400e", "  classDef no fill:#f3f4f6,stroke:#d1d5db,color:#9ca3af", "  classDef bad fill:#ffebee,stroke:#c62828");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("res").innerHTML = ctx.md(a.why);
      q("log").textContent = (r.log.length ? r.log.map(function (x, i) { return (i + 1) + ". " + x; }).join("\n") : "(no initialiser ran)") + (r.result ? "\nresult: " + r.result : "");
    }
    q("acts").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.k = b.dataset.k; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "A class's life: load, link, initialise",
      text: "The JVM brings a class in **lazily**, the first time it's needed. **Loading** finds the bytes (a `.class` file in a jar, a module image, generated bytes) and creates a `Class` object. **Linking** has three steps: **verification** (is the bytecode type-safe?), **preparation** (allocate static fields with **default values**) and **resolution** (turn symbolic references into direct ones, usually lazily). **Initialisation** runs the class's `<clinit>`: static field initialisers and static blocks in textual order. Loaded is not the same as initialised; the widget shows which actions do which.",
      m: M(["flowchart LR",
        "  A[\"load<br/>find bytes, create Class\"]:::s2 --> B[\"verify\"]:::s3 --> C[\"prepare<br/>statics = 0 / null\"]:::s3 --> D[\"resolve<br/>(lazy)\"]:::s3 --> E[\"initialise<br/>run #lt;clinit#gt;\"]:::s4",
        "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `class Config {
    static { System.out.println("  Config <clinit> runs"); }
    static String env = "prod";
}
System.out.println("1. Class.forName(name, false, loader): load only");
Class<?> c = Class.forName("Config", false, Config.class.getClassLoader());
System.out.println("2. loaded " + c.getName() + "; now touch a static field:");
System.out.println("3. env = " + Config.env);
System.out.println("4. second access, no <clinit> again: " + Config.env);`,
      analogy: "Joining a company: loading is the offer letter (you exist on paper), linking is background verification and getting a desk and empty drawers, initialisation is your first-day induction, which happens exactly once." },
    { title: "Class loaders and class identity",
      text: "A **class loader** turns a name into a `Class`. At runtime a class is identified by its **name plus its defining loader**, so the same bytes loaded by two loaders are **two different classes**: instances can't be cast between them (`ClassCastException: Plugin cannot be cast to Plugin`). This is how application servers isolate web apps, how plugin systems load multiple versions, and the cause of some baffling errors in hot-reload tools.",
      code: `class Plugin { public String toString() { return "plugin from " + getClass().getClassLoader().getName(); } }
java.net.URL where = Plugin.class.getProtectionDomain().getCodeSource().getLocation();
try (var isolated = new java.net.URLClassLoader("isolated", new java.net.URL[] { where }, null)) {   // parent = bootstrap only
    Class<?> other = isolated.loadClass("Plugin");
    System.out.println("same name: " + other.getName().equals(Plugin.class.getName()) + ", same class: " + (other == Plugin.class));
    var ctor = other.getDeclaredConstructor();
    ctor.setAccessible(true);   // other loader = other runtime package, so package access doesn't apply
    Object o = ctor.newInstance();
    System.out.println(o);
    try { Plugin p = (Plugin) o; } catch (ClassCastException e) { System.out.println("cast fails: " + e.getMessage().replaceAll(" \\\\(.*", "")); }
}` },
    { title: "Built-in loaders and parent delegation",
      text: "Since Java 9 there are three built-in loaders: the **bootstrap** loader (native, shown as `null`) loads core modules like `java.base`; the **platform** loader loads other Java SE/JDK modules (`java.sql`, `java.net.http`); the **application** (system) loader loads your class path and module path. Loaders use **parent delegation**: ask the parent first and only define the class yourself if the parent can't. That prevents your jar from replacing `java.lang.String` and keeps core classes unique. Servlet containers deliberately invert this (child-first) for web-app libraries.",
      m: M(["flowchart TB",
        "  B[\"bootstrap loader<br/>java.base: String, List\"]:::s1",
        "  P[\"platform loader<br/>java.sql, java.net.http\"]:::s2",
        "  A[\"application loader<br/>your classpath / module path\"]:::s4",
        "  C[\"custom loaders<br/>plugins, app servers\"]:::s3",
        "  C -- parent --> A -- parent --> P -- parent --> B",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `class Mine { }
System.out.println("String           → " + String.class.getClassLoader());
System.out.println("java.sql.Driver  → " + java.sql.Driver.class.getClassLoader().getName());
System.out.println("Mine             → " + Mine.class.getClassLoader().getName());
for (ClassLoader l = Mine.class.getClassLoader(); l != null; l = l.getParent()) System.out.println("  chain: " + l.getName());
System.out.println("  chain: bootstrap (null)");` },
    { title: "Linking: verification, preparation, resolution",
      text: "**Verification** checks bytecode is well-formed and type-safe (stack depths, types of operands, no jumping into the middle of instructions); failures raise `VerifyError`, typically from broken bytecode generators. **Preparation** creates static fields with **default values** (0, false, null) before any initialiser runs, which is why the forward-reference trap below sees 0. **Resolution** replaces symbolic references (class, method, field names in the constant pool) with direct references, usually the first time each instruction runs, which is why a missing method surfaces as `NoSuchMethodError` only when that code path executes. **Compile-time constants** (`static final` primitives and Strings with constant initialisers) are copied into callers by javac, so changing them requires recompiling callers.",
      code: `class Trap {
    static int a = Trap.b + 1;      // b exists (prepared) but is still 0
    static int b = 10;
    static final int LIMIT = 100;   // compile-time constant: inlined into callers
    static { System.out.println("  Trap initialised"); }
}
System.out.println("LIMIT = " + Trap.LIMIT + "  (no initialisation needed)");
System.out.println("a = " + Trap.a + ", b = " + Trap.b);` },
    { title: "When initialisation happens, and in what order",
      text: "A class is initialised just before the first: `new`, static method call, read/write of a **non-constant** static field, reflective call like `Class.forName(name)`, initialisation of a **subclass**, or being the main class. It is **not** initialised by: compile-time constants, `Foo.class`, arrays `new Foo[n]`, `forName(name, false, loader)`, or reading a superclass's static field through the subclass. Order: **superclass before subclass**; within a class, static initialisers and blocks **top to bottom**, once per class. Per object: superclass instance initialisers and constructor first, then the subclass's.",
      table: [["Triggers initialisation", "Does not"],
        ["new Child()", "Child.class"],
        ["Child.hello() (static method)", "new Child[10]"],
        ["Child.counter (non-constant static field)", "Parent.CONST (compile-time constant)"],
        ["Class.forName(\"Child\")", "Class.forName(\"Child\", false, loader)"],
        ["initialising a subclass (parent first)", "Child.parentField (only Parent is initialised)"]],
      code: `class Base {
    static { System.out.println("1 Base static"); }
    { System.out.println("3 Base instance block"); }
    Base() { System.out.println("4 Base constructor"); describe(); }
    void describe() { }
}
class Derived extends Base {
    static { System.out.println("2 Derived static"); }
    String name = "set in field initialiser";
    { System.out.println("5 Derived instance block"); }
    Derived() { System.out.println("6 Derived constructor"); }
    @Override void describe() { System.out.println("  overridden method called from Base constructor sees name = " + name); }
}
new Derived();
System.out.println("-- second object: no static blocks");
new Derived();`,
      analogy: "Static initialisation is setting up a restaurant once before opening day, parent company first; instance initialisation is laying each table for each guest. Calling an overridable method from a constructor is serving a dish before the table is laid." },
    { title: "The lazy holder idiom",
      text: "Because the JVM guarantees that a class is initialised **once**, under a lock, with its writes visible to every thread, static initialisation is the cheapest thread-safe lazy singleton. Put the instance in a **nested holder class**: the outer class can be used freely, and the instance is created on the first `get()`, with no `synchronized` or `volatile` on the fast path. An `enum` singleton gives the same guarantees plus serialization safety. In Spring apps you rarely need either: beans are singletons by default (S01).",
      code: `class PriceCache {
    private PriceCache() { System.out.println("  PriceCache created by " + Thread.currentThread().getName()); }
    private static class Holder { static final PriceCache INSTANCE = new PriceCache(); }
    static PriceCache get() { return Holder.INSTANCE; }
    static String version() { return "v2"; }
}
System.out.println("version " + PriceCache.version() + " (instance not created yet)");
Set<PriceCache> seen = ConcurrentHashMap.newKeySet();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
    for (int i = 0; i < 100; i++) pool.submit(() -> seen.add(PriceCache.get()));
}
System.out.println("distinct instances seen by 100 tasks on 8 threads: " + seen.size());` },
    { title: "When a static initialiser fails",
      text: "If `<clinit>` throws, the first caller gets **`ExceptionInInitializerError`** wrapping the real cause. The class is then permanently marked **erroneous** in that class loader: every later use throws **`NoClassDefFoundError: Could not initialize class X`**, and since JDK 17+ the message adds the original exception. In production logs you often see only the later errors, so search for the **first** `ExceptionInInitializerError`. Keep static initialisers trivial; load configuration and connect to services in normal, retryable code instead.",
      code: `class TaxTable {
    static final Map<String, Integer> RATES = load();
    static Map<String, Integer> load() { throw new IllegalStateException("tax-rates.csv not found"); }
}
for (int attempt = 1; attempt <= 3; attempt++) {
    try { System.out.println(TaxTable.RATES); }
    catch (Throwable t) { System.out.println("attempt " + attempt + ": " + t.getClass().getSimpleName() + (t.getCause() != null && attempt == 1 ? " caused by " + t.getCause() : " " + t.getMessage())); }
}` },
    { title: "ClassNotFoundException vs NoClassDefFoundError",
      text: "**`ClassNotFoundException`** (checked) comes from code that asks for a class **by name** at runtime (`Class.forName`, `loadClass`, a framework reading a class name from config) when no loader can find it: a missing dependency or a typo. **`NoClassDefFoundError`** (an `Error`) means a class that **was present at compile time** can't be loaded or initialised when the JVM resolves a reference: the jar is missing at runtime, a different version without that class won, or its static initialiser failed earlier. Fix by checking the runtime classpath (`mvn dependency:tree`, `-Xlog:class+load`, `-verbose:class`) and looking for the first error.",
      table: [["", "ClassNotFoundException", "NoClassDefFoundError"],
        ["Type", "checked Exception", "Error (LinkageError)"],
        ["Raised by", "Class.forName, ClassLoader.loadClass", "the JVM resolving a compiled reference"],
        ["Class at compile time?", "not needed (name is a string)", "yes, compiled against it"],
        ["Typical cause", "missing driver/plugin jar, typo in config", "jar missing at runtime, version conflict, failed static init"]],
      code: `class Invoice { public String toString() { return "invoice"; } }
class Loader {
    static Object make() { return new Invoice(); }    // compiled against Invoice
}
try { Class.forName("com.acme.pay.UpiGateway"); }
catch (ClassNotFoundException e) { System.out.println("by name    → " + e); }
// Simulate a jar missing at runtime: delete Invoice.class before the first use
java.net.URL url = ClassLoader.getSystemResource("Invoice.class");
Files.delete(Path.of(url.toURI()));
try { System.out.println(Loader.make()); }
catch (NoClassDefFoundError e) { System.out.println("compiled-in → " + e); }` },
    { title: "Custom class loaders",
      text: "Write a loader by extending `ClassLoader` (or `URLClassLoader`) and overriding **`findClass`**: obtain the bytes from anywhere (a plugin directory, a database, an encrypted archive, generated at runtime) and call **`defineClass`**. Keep `loadClass`'s parent delegation unless you have a reason not to. Uses: plugin systems and isolation (IDEs, Jenkins, Elasticsearch), application servers, hot reload (Spring Boot DevTools uses a restart loader), bytecode instrumentation, and runtime proxies and lambdas (hidden classes).",
      code: `class Greeter { public String toString() { return "hello from " + getClass().getClassLoader().getName(); } }
class BytesLoader extends ClassLoader {
    BytesLoader() { super("bytes-loader", null); }               // parent: bootstrap only
    @Override protected Class<?> findClass(String name) throws ClassNotFoundException {
        try (var in = ClassLoader.getSystemResourceAsStream(name.replace('.', '/') + ".class")) {
            if (in == null) throw new ClassNotFoundException(name);
            byte[] bytes = in.readAllBytes();
            System.out.println("  defining " + name + " from " + bytes.length + " bytes");
            return defineClass(name, bytes, 0, bytes.length);
        } catch (IOException e) { throw new ClassNotFoundException(name, e); }
    }
}
Class<?> g = new BytesLoader().loadClass("Greeter");
var ctor = g.getDeclaredConstructor(); ctor.setAccessible(true);   // different runtime package
System.out.println(ctor.newInstance());
System.out.println("String still comes from bootstrap: " + (g.getClassLoader().loadClass("java.lang.String") == String.class));` },
    { title: "Class loader leaks and Metaspace",
      text: "Class metadata lives in **Metaspace** (native memory, J29). A class loader and **all** its classes can be unloaded only when nothing references the loader, any of its classes or any of their instances. One stray reference pins everything: a static cache in a parent loader holding a plugin object, a `ThreadLocal` value left on a pooled thread (J24), a JDBC driver registered in `DriverManager`, a thread started by the web app, a shutdown hook or logging listener. Redeploy a few times and you get **`OutOfMemoryError: Metaspace`**. Diagnose with `jcmd <pid> VM.classloader_stats` and a heap dump (who holds the loader?).",
      code: `class Widget { }
class Plugins {
    static java.lang.ref.WeakReference<ClassLoader> loadOnce(List<Object> cache) throws Exception {
        java.net.URL where = Widget.class.getProtectionDomain().getCodeSource().getLocation();
        var loader = new java.net.URLClassLoader(new java.net.URL[] { where }, null);
        var ctor = loader.loadClass("Widget").getDeclaredConstructor(); ctor.setAccessible(true);
        Object w = ctor.newInstance();
        if (cache != null) cache.add(w);                     // instance → class → loader stays reachable
        loader.close();
        return new java.lang.ref.WeakReference<>(loader);
    }
}
List<Object> leakyStaticCache = new ArrayList<>();          // imagine a static field in a shared library
for (boolean leak : new boolean[] { false, true }) {
    var ref = Plugins.loadOnce(leak ? leakyStaticCache : null);
    for (int i = 0; i < 20 && ref.get() != null; i++) { System.gc(); Thread.sleep(50); }
    System.out.println((leak ? "with" : "without") + " a cached instance: loader collected = " + (ref.get() == null));
}` },
    { title: "Modules (JPMS) at a glance",
      text: "Java 9's module system groups packages into **modules** with a `module-info.java`: `requires` other modules, `exports` packages for compile and run time, `opens` packages for deep reflection. **Strong encapsulation** means internal JDK packages and private members of non-open packages aren't accessible by reflection (since JDK 16/17), which is why old libraries need `--add-opens`. Most applications still run on the class path (the **unnamed module**) and use modules only via the JDK; `jlink` can build a trimmed runtime image from the modules you need.",
      code: `class Probe { }
System.out.println("String lives in " + String.class.getModule());
System.out.println("my code lives in " + (Probe.class.getModule().isNamed() ? "a named module" : "the unnamed module (class path)"));
System.out.println("java.base exports java.lang? " + Object.class.getModule().isExported("java.lang"));
System.out.println("java.base exports jdk.internal.misc? " + Object.class.getModule().isExported("jdk.internal.misc"));
try {
    var f = String.class.getDeclaredField("value");
    f.setAccessible(true);
} catch (RuntimeException e) { System.out.println(e.getClass().getSimpleName() + ": java.base does not open java.lang to the unnamed module"); }`,
      analogy: "Modules are a housing society with gates: each building lists which doors it opens to visitors (exports) and which rooms allow inspectors (opens); everything else stays private even if you know the flat number." }
  ];

  H.registerLesson({
    code: "J28",
    summary: "How the JVM brings code in: loading, linking (verification, preparation, resolution) and initialisation; the bootstrap, platform and application class loaders with parent delegation and class identity; exactly what triggers static initialisation and in which order, the lazy holder idiom, failing static initialisers, `ClassNotFoundException` vs `NoClassDefFoundError`, custom class loaders, class loader leaks in Metaspace, and JPMS modules at a glance.",
    slides: SLIDES,
    widget: { heading: "Interactive: does this line load or initialise the class?", caption: "Each action ran in a fresh JDK 21 JVM. The log shows which initialisers ran, in order; class loading came from `-Xlog:class+load`. Amber 'link' means the class was loaded but not initialised, so HotSpot may not have linked it yet (linking is lazy).", render: j28Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Dependency conflicts", "`NoSuchMethodError` or `NoClassDefFoundError` after an upgrade: two versions of a library on the class path, and the older one won."],
      ["Plugins", "Jenkins, IDEs and Elasticsearch give each plugin its own class loader so their dependencies don't clash."],
      ["Hot reload", "Spring Boot DevTools restarts the app in a fresh class loader instead of restarting the JVM."],
      ["Redeploy leaks", "`OutOfMemoryError: Metaspace` after several redeploys on Tomcat, caused by a thread or `ThreadLocal` pinning the old web-app loader."],
      ["Startup failures", "A static block that reads a missing file shows up as `ExceptionInInitializerError` once, then `NoClassDefFoundError` everywhere."],
      ["JDK upgrades", "Libraries doing deep reflection into JDK internals need `--add-opens` on Java 17+."]
    ],
    pitfalls: [
      "Heavy work (I/O, network, config) in static initialisers",
      "Assuming `Class.forName` never runs static code",
      "Calling overridable methods from constructors",
      "Forward references in static initialisers seeing default values",
      "Changing a public constant without recompiling the classes that use it",
      "Chasing the later `NoClassDefFoundError` instead of the first `ExceptionInInitializerError`",
      "Version conflicts hidden by fat jars or shading",
      "Threads, `ThreadLocal`s or static caches that pin a class loader"
    ],
    quiz: [
      { q: "`int x = Parent.CONST;` where `static final int CONST = 42`. Is Parent initialised?", options: ["Yes", "No, the constant is inlined by javac; Parent isn't even loaded", "Only loaded", "Only if CONST is public"], answer: 1, why: "Recorded: no class load at all." },
      { q: "Reading `Child.parentField` (declared in Parent). Which classes are initialised?", options: ["Child and Parent", "Only Parent", "Only Child", "Neither"], answer: 1, why: "Only the declaring class is initialised; Child is loaded but not initialised." },
      { q: "Order for `new Child()` the first time?", options: ["Child static, Parent static, Parent ctor, Child ctor", "Parent static, Child static, Parent instance init + ctor, Child instance init + ctor", "Parent ctor, Child ctor, statics", "Child static, Child ctor, Parent ctor"], answer: 1, why: "Superclass first for both static and instance initialisation." },
      { q: "`new Child[3]` initialises Child?", options: ["Yes", "No", "Only if Child has a static block", "Only for primitive arrays"], answer: 1, why: "Arrays don't create Child objects." },
      { q: "A static initialiser throws. What does the second access throw?", options: ["ExceptionInInitializerError again", "NoClassDefFoundError: Could not initialize class", "ClassNotFoundException", "Nothing"], answer: 1, why: "The class is marked erroneous." },
      { q: "Which loader loads java.lang.String?", options: ["Application", "Platform", "Bootstrap (shown as null)", "Thread context loader"], answer: 2, why: "Core java.base classes are bootstrap-loaded." },
      { q: "What does parent delegation guarantee?", options: ["Faster loading", "Core classes come from the parent chain and can't be replaced by the application", "Classes are never unloaded", "Modules are optional"], answer: 1, why: "Ask the parent first." },
      { q: "Same bytes loaded by two different loaders give…", options: ["the same Class", "two distinct classes; casting between them fails", "a LinkageError at load", "a shared Class with two names"], answer: 1, why: "Identity = name + defining loader." },
      { q: "Why is the lazy holder idiom thread-safe?", options: ["It uses volatile", "The JVM initialises a class once, under a lock, with safe publication", "It uses synchronized on get()", "It isn't"], answer: 1, why: "JLS 12.4.2 initialisation procedure." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Tool / code"],
        ["See loading", "`java -Xlog:class+load=info …` (or `-verbose:class`)"],
        ["Load without init", "`Class.forName(name, false, loader)`"],
        ["Loader of a class", "`X.class.getClassLoader()` (null = bootstrap)"],
        ["Isolated loader", "`new URLClassLoader(urls, parent)`"],
        ["Custom loader", "extend `ClassLoader`, override `findClass`, call `defineClass`"],
        ["Lazy singleton", "`private static class Holder { static final X INSTANCE = new X(); }`"],
        ["Loader stats", "`jcmd <pid> VM.classloader_stats`"],
        ["Open for reflection", "`--add-opens java.base/java.lang=ALL-UNNAMED`"]],
      cards: [
        { title: "Lifecycle", items: ["Load", "Verify, prepare, resolve", "Initialise once", "Unload with its loader"] },
        { title: "Errors", items: ["CNFE: by name", "NCDFE: compiled-in, missing", "ExceptionInInitializerError", "NoSuchMethodError: version clash"] },
        { title: "Say in interviews", items: ["Parent delegation", "Init triggers", "Lazy holder", "Class identity", "Metaspace leaks"] }]
    },
    practice: [
      { level: "Easy", q: "Predict the output order for a parent/child class with static blocks, instance blocks and constructors, then verify.",
        a: ["Statics: parent then child (once).",
          "Per object: parent field initialisers and instance blocks, parent constructor, child field initialisers and blocks, child constructor."],
        code: `class A { static { System.out.print("As "); } { System.out.print("Ai "); } A() { System.out.print("Ac "); } }
class B extends A { static { System.out.print("Bs "); } { System.out.print("Bi "); } B() { System.out.print("Bc "); } }
new B(); System.out.println(); new B(); System.out.println();` },
      { level: "Easy", q: "ClassNotFoundException vs NoClassDefFoundError?",
        a: ["CNFE: checked, from loading a class by name (forName/loadClass) that isn't found.",
          "NCDFE: Error, a class referenced by compiled code can't be found or failed initialisation earlier.",
          "Fix CNFE by adding the dependency or fixing the name; fix NCDFE by checking the runtime classpath, version conflicts or the original initialiser failure."] },
      { level: "Easy", q: "What is parent delegation and why does it exist?",
        a: ["A loader first asks its parent to load a class and only defines it itself if the parent can't.",
          "This keeps core classes unique and prevents applications from replacing java.* classes.",
          "Web containers use child-first for web-app libraries but still delegate java.* to the parent."] },
      { level: "Medium", q: "Implement a thread-safe lazy singleton without synchronized, and prove it's created once.",
        a: ["Nested Holder class with a static final instance.",
          "get() returns Holder.INSTANCE; the JVM guarantees single, safe initialisation.",
          "Hammer it from many threads and count constructor calls."],
        code: `class Registry {
    static final AtomicInteger created = new AtomicInteger();
    private Registry() { created.incrementAndGet(); }
    private static class Holder { static final Registry I = new Registry(); }
    static Registry get() { return Holder.I; }
}
try (ExecutorService pool = Executors.newFixedThreadPool(16)) { for (int i = 0; i < 1000; i++) pool.submit(Registry::get); }
System.out.println("constructor calls: " + Registry.created.get());` },
      { level: "Medium", q: "A service fails with `NoClassDefFoundError: Could not initialize class com.acme.TaxTable`. How do you debug it?",
        a: ["This means TaxTable's static initialiser failed earlier in this JVM.",
          "Search the logs for the first ExceptionInInitializerError (and its cause) for TaxTable.",
          "Typical causes: missing resource or config, failing static connection, a dependency missing at runtime.",
          "Move risky work out of static initialisers into normal startup code with clear errors."] },
      { level: "Medium", q: "Show that two class loaders can load the same class independently.",
        a: ["Create a URLClassLoader with the same class path and a null (bootstrap) parent.",
          "Load the class: names are equal, Class objects are not; casting fails."],
        code: `class Thing { }
java.net.URL where = Thing.class.getProtectionDomain().getCodeSource().getLocation();
try (var l1 = new java.net.URLClassLoader(new java.net.URL[] { where }, null); var l2 = new java.net.URLClassLoader(new java.net.URL[] { where }, null)) {
    Class<?> a = l1.loadClass("Thing"), b = l2.loadClass("Thing");
    System.out.println(a.getName() + " == " + b.getName() + " ? " + (a == b) + "; assignable? " + a.isAssignableFrom(b));
}` },
      { level: "Medium", q: "Why might changing `public static final int MAX = 10` to 20 in a library have no effect in your app?",
        a: ["MAX is a compile-time constant, so javac copied 10 into your compiled classes.",
          "Upgrading only the library jar doesn't change your bytecode: recompile the callers.",
          "To avoid this for values that may change, expose them via a method or a non-constant (e.g. Integer.valueOf(10))."] },
      { level: "Hard", q: "Design a plugin system that loads and unloads plugins at runtime.",
        steps: ["Define a plugin API (interfaces) in a shared module loaded by the application loader.",
          "Load each plugin from its own URLClassLoader with the app loader as parent (or child-first for plugin libraries), discover implementations via ServiceLoader.",
          "Only the API types cross the boundary; never cache plugin objects in shared static state.",
          "Unload: stop plugin threads, deregister listeners, clear ThreadLocals, close the loader, drop all references; verify with heap dumps or VM.classloader_stats.",
          "Consider JPMS layers (ModuleLayer) for stronger isolation."] },
      { level: "Hard", q: "After several redeploys Tomcat dies with `OutOfMemoryError: Metaspace`. Explain and fix.",
        a: ["Each redeploy creates a new web-app class loader; the old one should be collected with all its classes.",
          "Something still references it: a ThreadLocal value on a container thread, a JDBC driver in DriverManager, a non-daemon thread or timer, a static cache in a shared library, a logging/JMX registration.",
          "Find it: heap dump → find the WebappClassLoader instances → path to GC roots.",
          "Fix the reference (deregister drivers, stop threads, remove ThreadLocals in finally); cap Metaspace with -XX:MaxMetaspaceSize to fail fast."] },
      { level: "Hard", q: "Write a class loader that loads a class's bytes itself and show which loader defined it.",
        a: ["Extend ClassLoader with the bootstrap as parent so it can't delegate to the app loader.",
          "Read the .class bytes as a resource and defineClass them in findClass.",
          "java.* classes still come from bootstrap through delegation."],
        code: `class Job { public String toString() { return "Job defined by " + getClass().getClassLoader().getName(); } }
class MyLoader extends ClassLoader {
    MyLoader() { super("my-loader", null); }
    @Override protected Class<?> findClass(String n) throws ClassNotFoundException {
        try (var in = ClassLoader.getSystemResourceAsStream(n + ".class")) {
            if (in == null) throw new ClassNotFoundException(n);
            byte[] b = in.readAllBytes(); return defineClass(n, b, 0, b.length);
        } catch (IOException e) { throw new ClassNotFoundException(n, e); }
    }
}
var ctor = new MyLoader().loadClass("Job").getDeclaredConstructor(); ctor.setAccessible(true);
System.out.println(ctor.newInstance());
System.out.println(new Job());` }
    ],
    recap: [
      "Classes are loaded lazily, linked (verify, prepare, resolve) and initialised once; loaded is not initialised.",
      "Bootstrap, platform and application loaders delegate to their parents; a class is identified by name plus loader.",
      "Initialisation triggers: new, static calls, non-constant static fields, forName, subclass init; superclass first, top to bottom.",
      "The lazy holder idiom is a free thread-safe singleton; failing static initialisers poison the class.",
      "CNFE is a lookup by name, NCDFE a compiled-in class missing or broken at runtime; stray references leak whole loaders."
    ]
  });
})();
