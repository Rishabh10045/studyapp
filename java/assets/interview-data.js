/* VIP Java interview question bank.
   Each item: id, s (section), g (topic), lv (Easy/Medium/Hard), faq (frequently asked across Java interviews in general; never a company claim),
   l (related lesson code), q, a (answer bullets), optional code (Java). Grows as lessons are published. */
(function () {
  "use strict";
  var QS = [];
  function Q(s, g, lv, faq, l, q, a, extra) {
    var o = { id: "q" + (QS.length + 1), s: s, g: g, lv: lv, faq: !!faq, l: l, q: q, a: a };
    if (extra && extra.code) o.code = extra.code;
    QS.push(o);
  }
  var B = "Basics & JVM", T = "Types, memory & strings";

  Q(B, "JDK, JRE, JVM", "Easy", true, "J01", "What is the difference between the JDK, the JRE and the JVM?", [
    "**JVM**: the virtual machine that loads bytecode, verifies it, runs it (interpreter + JIT) and manages memory (GC). One per OS/CPU.",
    "**JRE**: the JVM plus the standard class libraries needed to *run* Java programs.",
    "**JDK**: the JRE plus development tools: `javac`, `jar`, `jshell`, `javadoc`, `jcmd`, `jlink`…",
    "Since Java 11 Oracle/OpenJDK ship the JDK only; `jlink` builds a trimmed runtime image for deployment."]);
  Q(B, "JDK, JRE, JVM", "Easy", true, "J01", "Why is Java called platform independent? Is the JVM platform independent?", [
    "`javac` compiles to **bytecode**, a platform-neutral instruction set; the same `.class` runs on any OS with a JVM.",
    "The **JVM itself is platform specific**: each OS/CPU needs its own JVM build (and native libraries).",
    "Independence breaks if you use native code (JNI), OS-specific paths, or line separators carelessly."]);
  Q(B, "Compilation & execution", "Medium", true, "J01", "Walk through what happens from `javac Hello.java` to output on the screen.", [
    "`javac` parses and type-checks the source and writes `Hello.class` (bytecode + constant pool).",
    "`java Hello` starts the JVM, which **loads** the class (class loaders), **links** it (verify, prepare, resolve) and **initialises** it (static initialisers).",
    "The JVM finds `public static void main(String[])` and starts the main thread.",
    "Bytecode is **interpreted** at first; hot methods are **JIT-compiled** (C1, then C2) to native code.",
    "`System.out.println` goes through `PrintStream` to the OS; at exit the JVM runs shutdown hooks."]);
  Q(B, "Compilation & execution", "Medium", false, "J01", "Is Java compiled or interpreted?", [
    "Both. Source is **compiled ahead of time** to bytecode; bytecode is **interpreted** and **JIT-compiled** at runtime.",
    "Tiered compilation: interpreter → C1 (fast compile, some optimisation) → C2 (aggressive optimisation for hot code).",
    "GraalVM Native Image adds a fully ahead-of-time option (fast start-up, lower peak flexibility)."]);
  Q(B, "main method", "Easy", true, "J01", "Why is `main` `public static void`? What happens if you remove `static`?", [
    "`public`: the launcher must call it from outside the class. `static`: no object exists yet, so the JVM calls it on the class. `void`: the exit status is set with `System.exit`, not a return value.",
    "Without `static` (before Java 21 preview / 25 instance main methods) the launcher fails: `main method is not static`.",
    "Java 25 finalised *instance main methods* and compact source files for simple programs, but `public static void main(String[] args)` is what interviews and most code use."]);
  Q(B, "Class path & packaging", "Medium", false, "J01", "What is the classpath? `ClassNotFoundException` vs `NoClassDefFoundError`?", [
    "The classpath is the list of directories/JARs the application class loader searches for classes (`-cp`, `CLASSPATH`, or the JAR manifest's `Class-Path`).",
    "`ClassNotFoundException` (checked): code asked to load a class by **name** at runtime (`Class.forName`, reflection) and it wasn't found.",
    "`NoClassDefFoundError` (error): the class was present at **compile time** but missing at runtime, or its static initialiser failed earlier.",
    "Fix: check the runtime classpath/dependency versions; for init failures, look for the first `ExceptionInInitializerError`."]);
  Q(B, "Java versions", "Easy", true, "J01", "Which Java versions are LTS, and what are the headline features of 8, 11, 17 and 21?", [
    "LTS: 8, 11, 17, 21, 25.",
    "**8**: lambdas, streams, `Optional`, `java.time`. **11**: `HttpClient`, `var` in lambdas, single-file launch.",
    "**17**: records, sealed classes, text blocks, switch expressions, pattern matching for `instanceof`.",
    "**21**: virtual threads, pattern matching for `switch`, record patterns, sequenced collections."]);
  Q(B, "JIT", "Hard", false, "J01", "Why is a Java service slower in its first minute? How do you deal with warm-up?", [
    "Code starts interpreted; the JIT compiles hot methods only after profiling, and class loading/initialisation happens lazily.",
    "Mitigations: warm-up traffic before joining the load balancer, readiness probes, class-data sharing (CDS/AppCDS), tiered compilation settings, or ahead-of-time options (Project Leyden work, GraalVM native image).",
    "Benchmark with JMH, never with a single cold run."]);
  Q(B, "Tools", "Easy", false, "J01", "Name JDK tools you use day to day and what each is for.", [
    "`javac`/`java` (compile/run), `jshell` (REPL), `jar` (package).",
    "`jcmd` (thread dumps, heap dumps, flags, JFR), `jstack`, `jmap`, `jstat` (GC stats).",
    "`javap -c` (disassemble bytecode), `jdeps` (dependencies), `jlink` (custom runtime images).",
    "JDK Flight Recorder + JDK Mission Control for profiling in production."]);
  Q(B, "Compilation & execution", "Medium", false, "J01", "What does `javap -c` show for `int x = a + b;`, and why is it useful?", [
    "Bytecode like `iload_1`, `iload_2`, `iadd`, `istore_3`: a stack machine pushes operands and pops results.",
    "Useful to see what the compiler really generated: string concatenation (`invokedynamic` `makeConcatWithConstants`), autoboxing (`Integer.valueOf`), lambdas (`invokedynamic`), synthetic/bridge methods."]);

  Q(T, "Primitives", "Easy", true, "J02", "List Java's primitive types with sizes and default values.", [
    "`byte` 8-bit, `short` 16, `int` 32, `long` 64, `float` 32 (IEEE 754), `double` 64, `char` 16-bit unsigned UTF-16 unit, `boolean` (JVM-dependent size).",
    "Defaults (fields/array elements only): `0`, `0L`, `0.0f`, `0.0`, `'\\u0000'`, `false`; local variables have **no** default and must be assigned.",
    "Integer overflow wraps silently (`Integer.MAX_VALUE + 1 == Integer.MIN_VALUE`); use `Math.addExact` to detect it."]);
  Q(T, "Primitives", "Medium", true, "J02", "What does `0.1 + 0.2 == 0.3` print, and how do you handle money?", [
    "`false`: binary floating point can't represent 0.1 exactly; the sum is `0.30000000000000004`.",
    "Money: use `long` minor units (paise/cents) or `BigDecimal` created from **strings** (`new BigDecimal(\"0.1\")`), with an explicit `RoundingMode`.",
    "Compare `BigDecimal` with `compareTo`, not `equals` (`2.0` vs `2.00` differ in scale)."],
    { code: "System.out.println(0.1 + 0.2 == 0.3);                                         // false\nSystem.out.println(new BigDecimal(\"0.1\").add(new BigDecimal(\"0.2\")));          // 0.3\nSystem.out.println(new BigDecimal(\"2.0\").equals(new BigDecimal(\"2.00\")));     // false\nSystem.out.println(new BigDecimal(\"2.0\").compareTo(new BigDecimal(\"2.00\")));  // 0" });
  Q(T, "Stack vs heap", "Medium", true, "J02", "What lives on the stack and what lives on the heap?", [
    "**Stack** (one per thread): frames with local variables, primitive values, **references** and partial results; freed when the method returns.",
    "**Heap** (shared): all objects and arrays, including their fields; reclaimed by the GC.",
    "Escape analysis may let the JIT avoid heap allocation for objects that never leave a method (scalar replacement), but semantically objects are on the heap.",
    "`StackOverflowError` = too-deep recursion; `OutOfMemoryError: Java heap space` = live objects exceed the heap."]);
  Q(T, "Pass by value", "Easy", true, "J02", "Is Java pass-by-value or pass-by-reference? Prove it.", [
    "Always **pass-by-value**. For objects, the value copied is the **reference**.",
    "A method can mutate the object through the copied reference, but reassigning the parameter doesn't change the caller's variable."],
    { code: "static void reassign(StringBuilder sb) { sb = new StringBuilder(\"new\"); }\nstatic void mutate(StringBuilder sb) { sb.append(\"!\"); }\nStringBuilder s = new StringBuilder(\"hi\");\nreassign(s); mutate(s);\nSystem.out.println(s);   // hi!" });
  Q(T, "Wrappers & autoboxing", "Medium", true, "J02", "Why does `Integer a = 127, b = 127; a == b` print true but with 128 it prints false?", [
    "Autoboxing calls `Integer.valueOf`, which returns **cached** instances for −128..127; both variables point to the same object.",
    "128 creates two different objects, and `==` compares references.",
    "Always compare wrappers with `equals` (or unbox explicitly). The cache upper bound can be raised with `-XX:AutoBoxCacheMax`."],
    { code: "Integer a = 127, b = 127, c = 128, d = 128;\nSystem.out.println(a == b);        // true  (cached)\nSystem.out.println(c == d);        // false (different objects)\nSystem.out.println(c.equals(d));   // true" });
  Q(T, "Wrappers & autoboxing", "Medium", false, "J02", "Where can autoboxing throw a `NullPointerException` or hurt performance?", [
    "Unboxing `null`: `Integer count = map.get(k); int c = count;` throws NPE; so does `if (flag)` with a null `Boolean`, and ternaries mixing `int` and `Integer`.",
    "Performance: boxing in hot loops (`Long sum += i`) allocates objects; prefer primitives and `IntStream`/`LongStream`.",
    "Collections can't hold primitives, so `List<Integer>` boxes every element."]);
  Q(T, "String immutability", "Easy", true, "J02", "Why is `String` immutable in Java?", [
    "**String pool**: literals can be shared safely only if they can't change.",
    "**Security**: class names, file paths, URLs and credentials can't be modified after validation.",
    "**Hash caching**: `hashCode` is computed once, which makes strings fast `HashMap` keys.",
    "**Thread safety**: immutable objects can be shared without locks."]);
  Q(T, "String pool", "Medium", true, "J02", "What do these print: `\"a\" == \"a\"`, `new String(\"a\") == \"a\"`, `(\"a\" + \"b\") == \"ab\"`, `s1.intern() == \"ab\"`?", [
    "`\"a\" == \"a\"` → **true**: both literals are the same pooled object.",
    "`new String(\"a\") == \"a\"` → **false**: `new` always creates a new heap object.",
    "`\"a\" + \"b\" == \"ab\"` → **true**: compile-time constants are folded into one literal. With a non-final variable (`x + \"b\"`) it's **false**.",
    "`intern()` returns the pooled instance, so `s.intern() == \"ab\"` → **true**.",
    "Lesson: compare strings with `equals`."],
    { code: "String x = \"a\";\nfinal String fx = \"a\";\nSystem.out.println(\"a\" == \"a\");                 // true\nSystem.out.println(new String(\"a\") == \"a\");     // false\nSystem.out.println((\"a\" + \"b\") == \"ab\");        // true  (constant folding)\nSystem.out.println((x + \"b\") == \"ab\");          // false (built at runtime)\nSystem.out.println((fx + \"b\") == \"ab\");         // true  (final constant)\nSystem.out.println((x + \"b\").intern() == \"ab\"); // true" });
  Q(T, "String pool", "Medium", false, "J02", "How many objects does `String s = new String(\"hello\");` create?", [
    "Up to **two**: the literal `\"hello\"` in the pool (if not already there, created when the class's constants are resolved) and a new `String` object on the heap.",
    "Since Java 7 the pool lives in the regular heap (not PermGen), so pooled strings are GC-able.",
    "Since Java 9 compact strings store Latin-1 text in a `byte[]` (1 byte per char)."]);
  Q(T, "StringBuilder", "Easy", true, "J02", "`String` vs `StringBuilder` vs `StringBuffer`: when do you use each?", [
    "`String`: immutable; fine for constants and small concatenations (the compiler optimises single expressions).",
    "`StringBuilder`: mutable, not synchronized; use when building strings in loops.",
    "`StringBuffer`: synchronized legacy version; rarely needed (thread-confined builders are the norm).",
    "Concatenating with `+=` in a loop creates a new string each time: O(n²) copying."]);
  Q(T, "StringBuilder", "Medium", false, "J02", "Reverse each word in a sentence without reversing word order, efficiently.", [
    "Split on spaces (or scan), reverse each token into one `StringBuilder`, join with single spaces.",
    "O(n) time, one builder allocation; handle multiple spaces/leading spaces as the interviewer specifies."],
    { code: "static String reverseWords(String s) {\n    StringBuilder out = new StringBuilder(s.length());\n    for (String w : s.trim().split(\"\\\\s+\")) {\n        if (out.length() > 0) out.append(' ');\n        out.append(new StringBuilder(w).reverse());\n    }\n    return out.toString();\n}\nSystem.out.println(reverseWords(\"  Java is   fun \"));   // avaJ si nuf" });
  Q(T, "Casting & conversion", "Medium", false, "J02", "What do `(byte) 200`, `(int) 3.99`, `'a' + 1` and `(char) ('a' + 1)` evaluate to?", [
    "`(byte) 200` → **−56**: narrowing keeps the low 8 bits (200 − 256).",
    "`(int) 3.99` → **3**: truncation toward zero (use `Math.round` to round).",
    "`'a' + 1` → **98**: `char` is promoted to `int` in arithmetic.",
    "`(char) ('a' + 1)` → **'b'**.",
    "Compound assignment hides a cast: `byte b = 10; b += 5;` compiles, `b = b + 5;` doesn't."]);
  Q(T, "Equality", "Easy", true, "J02", "`==` vs `equals()`: what's the difference?", [
    "`==` compares primitive **values** or object **references** (same object?).",
    "`equals` compares **logical equality** as defined by the class (`String`, wrappers, records override it; `Object.equals` is `==`).",
    "Use `Objects.equals(a, b)` to be null-safe. Arrays need `Arrays.equals`."]);
  Q(T, "Memory", "Hard", false, "J02", "Roughly how much memory does an `Integer` take vs an `int`, and why does `List<Integer>` cost so much?", [
    "`int`: 4 bytes. `Integer` object: ~16 bytes (12-byte header with compressed class pointers + 4-byte value), plus a 4-byte reference (compressed oops) wherever it's stored.",
    "`ArrayList<Integer>` of 1M items ≈ 4 MB of references + ~16 MB of `Integer` objects, vs 4 MB for `int[]`.",
    "Use primitive arrays, `IntStream`, or primitive collections (Eclipse Collections, fastutil) for large numeric data."]);

  window.JAVA_IQ = QS;
})();
