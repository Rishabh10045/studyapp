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

  var O = "OOP in Java";
  Q(O, "Access & modifiers", "Easy", true, "J03", "What are the access modifiers in Java and what is package-private?", [
    "`private` (class only), package-private (no keyword: same package), `protected` (package + subclasses), `public` (everyone).",
    "Package-private is the default when you write no modifier; useful to hide implementation classes behind a public interface.",
    "Top-level classes can only be `public` or package-private."]);
  Q(O, "Polymorphism", "Easy", true, "J03", "Overloading vs overriding: what's the difference?", [
    "**Overloading**: same name, different parameters; resolved at **compile time** from static argument types.",
    "**Overriding**: subclass re-implements an inherited instance method with the same signature; resolved at **run time** from the object's class.",
    "Overrides may use a covariant return type and wider access, and may not throw broader checked exceptions."]);
  Q(O, "Polymorphism", "Medium", true, "J03", "Can static or private methods be overridden? What about fields?", [
    "No. Static methods are **hidden**: the call binds to the declared type.",
    "Private methods aren't inherited, so a same-named subclass method is unrelated.",
    "Fields are never polymorphic: `Parent p = new Child(); p.field` reads Parent's field."]);
  Q(O, "Polymorphism", "Medium", false, "J03", "How does Java pick an overload when several could apply?", [
    "Phase 1: exact match / primitive widening, no boxing or varargs. Phase 2: allow boxing/unboxing. Phase 3: allow varargs.",
    "Within the first successful phase, the **most specific** method wins; if none is, the call is ambiguous (compile error).",
    "Only static types matter: `Object o = \"s\"; f(o)` calls `f(Object)`."], { code: `static String f(long x) { return "long"; }
static String f(Integer x) { return "Integer"; }
static String f(int... x) { return "varargs"; }
System.out.println(f(5));        // long: widening beats boxing beats varargs` });
  Q(O, "Objects & construction", "Medium", true, "J03", "Explain constructor chaining and object initialisation order.", [
    "Every constructor starts with `this(...)` or `super(...)` (implicit `super()` if omitted).",
    "Order: static init of parent then child (once per class), then for each object: parent field initialisers/instance blocks → parent constructor body → child initialisers → child constructor body.",
    "Calling an overridable method from a parent constructor sees child fields still at default values."]);
  Q(O, "Modifiers", "Easy", true, "J03", "What does `final` mean on a variable, a method and a class?", [
    "Variable/field: can be assigned only once (a final reference can still point to a mutable object).",
    "Method: can't be overridden. Class: can't be extended (`String`, records).",
    "`final` fields also get safe-publication guarantees under the Java Memory Model."]);
  Q(O, "Modifiers", "Medium", true, "J03", "How do you make a class immutable?", [
    "Make the class `final` (or constructors private with factories).",
    "All fields `private final`; no setters.",
    "Defensive copies of mutable inputs and outputs (`List.copyOf`, copying `Date`s/arrays).",
    "\"Modifying\" methods return new instances. Records give most of this for free, but still copy mutable components."]);
  Q(O, "Abstraction", "Easy", true, "J03", "Abstract class vs interface in modern Java?", [
    "Interface: no instance state, multiple inheritance of type, can have `default`, `static` and `private` methods.",
    "Abstract class: state, constructors, any access levels; single inheritance.",
    "Use interfaces for capabilities/contracts; abstract classes for a shared base with state (template method)."]);
  Q(O, "Abstraction", "Medium", false, "J03", "What happens when a class inherits the same default method from two interfaces?", [
    "Compile error unless the class overrides the method.",
    "Inside the override you can delegate: `A.super.name()`.",
    "Rules: a superclass method beats interface defaults; a more specific (sub-)interface beats its parent."]);
  Q(O, "Nested classes", "Medium", true, "J03", "Static nested class vs inner class?", [
    "An inner (non-static) class instance holds a hidden reference to its outer instance (`Outer.this`) and is created with `outer.new Inner()`.",
    "A static nested class has no outer instance; it's just a class scoped inside another (e.g. `Builder`, `Map.Entry` impls).",
    "Prefer static nested; inner classes can leak the outer object if they outlive it."]);
  Q(O, "Design", "Medium", true, "J03", "Why prefer composition over inheritance? Give a concrete failure of inheritance.", [
    "Inheritance couples you to the parent's implementation, including how it calls its own methods (self-use).",
    "Example: overriding `add` and `addAll` in a `HashSet` subclass double-counts because `HashSet.addAll` calls `add`.",
    "Composition (wrap + forward) depends only on the public API; inherit only for true is-a relationships with classes designed for extension."]);
  Q(O, "Design", "Hard", false, "J03", "Why doesn't `@Transactional` work on a private method or on a self-call?", [
    "Spring applies it through a proxy (JDK dynamic proxy or CGLIB subclass) that overrides public methods.",
    "Private/final methods can't be overridden, so they can't be intercepted.",
    "Self-invocation (`this.method()`) bypasses the proxy entirely. Call through another bean or use `TransactionTemplate`."]);

  var EQ = "equals, hashCode & ordering";
  Q(EQ, "equals & hashCode", "Easy", true, "J04", "What is the contract between equals and hashCode?", [
    "If `a.equals(b)` then `a.hashCode() == b.hashCode()`. The reverse isn't required (collisions are allowed).",
    "hashCode must be consistent while the fields used by equals don't change.",
    "Override both together, from the same fields."]);
  Q(EQ, "equals & hashCode", "Easy", true, "J04", "What happens if you override equals but not hashCode?", [
    "Equal objects get different identity hash codes and land in different buckets.",
    "`HashSet` stores duplicates, `HashMap.get` returns null for an \"equal\" key, `contains` fails.",
    "`List.contains` still works (it only uses equals), which hides the bug in some tests."]);
  Q(EQ, "equals & hashCode", "Medium", true, "J04", "How does HashMap use hashCode and equals during get/put?", [
    "Compute `key.hashCode()`, spread it (`h ^ h >>> 16`), choose bucket `(n-1) & hash`.",
    "Walk that bucket: compare stored hash first, then reference equality, then `equals`.",
    "Match → return/replace value; no match → null / append a new node (treeified bins for long chains)."]);
  Q(EQ, "equals & hashCode", "Medium", true, "J04", "Why should HashMap keys be immutable?", [
    "The entry is stored under the key's hash at insertion time.",
    "If a field used by hashCode changes, lookups compute a new hash, search the wrong bucket and miss; the entry can't be removed but is still iterated.",
    "Use String, enums, records with immutable components, or IDs."]);
  Q(EQ, "equals & hashCode", "Medium", false, "J04", "getClass() or instanceof in equals?", [
    "`instanceof`: subclasses can be equal to parents; correct for final classes; works with ORM proxies.",
    "`getClass()`: only exact classes match; keeps symmetry when subclasses add state but breaks Liskov and proxies.",
    "Best: final value classes (or records) with `instanceof`; composition instead of extending value classes."]);
  Q(EQ, "Ordering", "Easy", true, "J04", "Comparable vs Comparator?", [
    "`Comparable.compareTo` = the class's single natural order (`String`, `LocalDate`).",
    "`Comparator.compare` = external, pluggable orders; compose with `comparing`, `thenComparing`, `reversed`, `nullsLast`.",
    "Collections: `Collections.sort(list)` / `TreeSet<>()` use natural order; pass a comparator otherwise."]);
  Q(EQ, "Ordering", "Medium", true, "J04", "What's wrong with `return a.getAge() - b.getAge();` in a comparator?", [
    "Integer overflow for large values of opposite signs flips the sign, giving wrong order or TimSort contract errors.",
    "Use `Integer.compare(a, b)` or `Comparator.comparingInt(Person::getAge)`."], { code: `Comparator<Integer> bad = (a, b) -> a - b;
System.out.println(bad.compare(Integer.MAX_VALUE, -1) < 0);   // true: wrong!
System.out.println(Integer.compare(Integer.MAX_VALUE, -1) > 0); // true: correct` });
  Q(EQ, "Ordering", "Medium", false, "J04", "What does \"consistent with equals\" mean and why does it matter?", [
    "`compareTo(a, b) == 0` exactly when `a.equals(b)`.",
    "Sorted collections (TreeSet/TreeMap) use only compare: an inconsistent comparator makes them drop or merge elements that a HashSet would keep.",
    "Example: `BigDecimal(\"2.0\")` vs `\"2.00\"`: HashSet size 2, TreeSet size 1. Fix comparators with tie-breakers."]);
  Q(EQ, "Records & entities", "Medium", false, "J04", "How should equals/hashCode be implemented for JPA entities?", [
    "Avoid all-field equality (Lombok `@Data`): lazy associations, mutable fields.",
    "Use an immutable business key, or ID-based equals (`id != null && id.equals(other.getId())`) with a constant hashCode so the hash doesn't change on persist.",
    "Use `instanceof`, not `getClass()`, because of proxies."]);

  var EX = "Exceptions";
  Q(EX, "Hierarchy", "Easy", true, "J05", "Explain the exception hierarchy. What's the difference between Error and Exception?", [
    "`Throwable` has two branches: `Error` (JVM/environment problems like `OutOfMemoryError`, `StackOverflowError`: don't catch) and `Exception`.",
    "`RuntimeException` and subclasses are unchecked; other `Exception`s are checked.",
    "Errors and runtime exceptions need no `throws` declaration."]);
  Q(EX, "Hierarchy", "Easy", true, "J05", "Checked vs unchecked exceptions: when would you use each?", [
    "Checked: caller can reasonably recover and you want the compiler to force a decision (`IOException`).",
    "Unchecked: programming errors and broken preconditions (`IllegalArgumentException`, `IllegalStateException`), or when callers can't do anything but fail.",
    "Modern frameworks (Spring, JPA) mostly use unchecked; checked exceptions don't compose with lambdas."]);
  Q(EX, "try/catch/finally", "Medium", true, "J05", "Does finally always execute? What if try has a return statement?", [
    "Yes, after return/throw in try or catch, finally runs before control leaves.",
    "The return value is evaluated first and saved; changing a local variable in finally doesn't change it (mutating a returned object does).",
    "finally doesn't run on `System.exit`, `Runtime.halt`, JVM crash, or if the thread never completes.",
    "`return` in finally overrides the pending return or exception: never do it."], { code: `static int f() { int x = 1; try { return x; } finally { x = 2; } }
System.out.println(f());   // 1` });
  Q(EX, "try/catch/finally", "Easy", false, "J05", "Can you have try without catch? What is multi-catch?", [
    "Yes: `try/finally` or try-with-resources without catch are both legal.",
    "Multi-catch `catch (IOException | SQLException e)` handles unrelated types in one block; the variable is implicitly final and the types can't be subclasses of each other.",
    "Catch more specific types before general ones, or the code won't compile."]);
  Q(EX, "Resources", "Medium", true, "J05", "How does try-with-resources work? What are suppressed exceptions?", [
    "Resources implementing `AutoCloseable` declared in `try (...)` are closed automatically in reverse order, before catch/finally.",
    "If the body throws and `close()` throws too, the close exception is attached to the primary one via `addSuppressed`, available from `getSuppressed()`.",
    "Old-style `finally { r.close(); }` could replace the original exception with the close failure."]);
  Q(EX, "Design", "Medium", true, "J05", "How do you create a good custom exception?", [
    "Extend `RuntimeException` (or `Exception` for checked), name it after the problem.",
    "Provide constructors with message and cause; carry domain context (ids) as fields; no secrets.",
    "Group under a domain base exception so callers can catch broadly or narrowly; map to HTTP statuses at the edge."]);
  Q(EX, "Design", "Medium", true, "J05", "What is exception chaining and why does it matter?", [
    "Wrapping a lower-level exception as the **cause** of a higher-level one: `throw new FareLookupException(\"...\", e)`.",
    "Preserves the original stack trace (`Caused by:`), while hiding implementation details from callers.",
    "`throw new X(e.getMessage())` loses the root cause; avoid it."]);
  Q(EX, "Best practices", "Medium", false, "J05", "List exception-handling anti-patterns you look for in code review.", [
    "Empty catch blocks; catching `Exception`/`Throwable` broadly.",
    "Log-and-rethrow at every layer (duplicate traces); losing the cause.",
    "Exceptions as control flow in hot paths; returning null on failure.",
    "return/throw in finally; swallowing `InterruptedException`; vague messages."]);
  Q(EX, "Concurrency", "Hard", false, "J05", "How should you handle InterruptedException?", [
    "It means another thread asked this one to stop; the interrupt flag is cleared when it's thrown.",
    "Either propagate it (declare `throws InterruptedException`) or catch it and call `Thread.currentThread().interrupt()` to restore the flag, then exit/cleanup.",
    "Swallowing it breaks cancellation (executor shutdownNow, Future.cancel)."]);
  Q(EX, "Best practices", "Hard", false, "J05", "Why might an exception thrown inside an executor task never show up in logs?", [
    "`submit()` captures it in the `Future`; if nobody calls `get()`, it's silently lost.",
    "`scheduleAtFixedRate` stops all future runs after an exception, also recorded only in the Future.",
    "Fix: catch and log inside tasks, call `get()`, or use `execute()` with an `UncaughtExceptionHandler`."]);

  var GE = "Generics";
  Q(GE, "Basics", "Easy", true, "J06", "Why were generics added to Java?", [
    "Compile-time type safety: wrong element types are rejected by the compiler instead of failing with ClassCastException at run time.",
    "No manual casts; reusable type-safe code (`Box<T>`, `Map<K,V>`); more expressive APIs.",
    "Implemented with erasure for backward compatibility with pre-Java 5 code."]);
  Q(GE, "Erasure", "Medium", true, "J06", "What is type erasure? Name three things it prevents.", [
    "The compiler checks types, then replaces type parameters with their bounds, inserts casts and bridge methods; the JVM sees raw types.",
    "Prevents `new T()`, `new T[n]`, `instanceof List<String>`, overloads differing only in type arguments, primitive type arguments.",
    "Workarounds: `Class<T>` tokens, `Supplier<T>`, `IntFunction<T[]>`, super type tokens."]);
  Q(GE, "Wildcards", "Medium", true, "J06", "Explain `? extends` vs `? super` (PECS).", [
    "`? extends T`: an unknown subtype of T; you can read T's but not add (except null). Producer.",
    "`? super T`: an unknown supertype of T; you can add T's but only read Objects. Consumer.",
    "Producer Extends, Consumer Super; e.g. `Collections.copy(List<? super T> dest, List<? extends T> src)`."]);
  Q(GE, "Wildcards", "Easy", true, "J06", "Why isn't `List<Integer>` a `List<Number>`? Why is `Integer[]` an `Object[]`?", [
    "Generics are invariant: otherwise you could add a Double through the `List<Number>` reference into a list of Integers.",
    "Arrays are covariant for historical reasons and check stores at run time (ArrayStoreException).",
    "Use `List<? extends Number>` for a read-only polymorphic view."]);
  Q(GE, "Wildcards", "Medium", false, "J06", "List<?> vs List<Object> vs raw List?", [
    "`List<Object>`: a list that holds any objects; but a `List<String>` is not assignable to it.",
    "`List<?>`: a list of some unknown type; any `List<X>` is assignable; read Object, add only null; still type-checked.",
    "Raw `List`: generics turned off, unchecked warnings, heap pollution risk; legacy only."]);
  Q(GE, "Bounds", "Medium", false, "J06", "What does `<T extends Comparable<? super T>>` mean and why the `super`?", [
    "T must be comparable to T or to one of its supertypes.",
    "Needed for types that inherit `compareTo` from a supertype, e.g. `LocalDate implements Comparable<ChronoLocalDate>`, or a subclass of a Comparable class.",
    "Used by `Collections.sort`, `Collections.max`, `Stream.sorted()`."]);
  Q(GE, "Erasure", "Hard", false, "J06", "What are bridge methods?", [
    "Synthetic methods javac generates so that a class implementing `Comparable<Fare>` (with `compareTo(Fare)`) still overrides the erased `compareTo(Object)`.",
    "The bridge casts and delegates: `compareTo(Object o) { return compareTo((Fare) o); }`.",
    "Visible with `javap -p` or `Method.isBridge()`; also generated for covariant returns."]);
  Q(GE, "Erasure", "Hard", false, "J06", "How do TypeReference / ParameterizedTypeReference recover generic types at run time?", [
    "They're instantiated as anonymous subclasses (`new TypeReference<List<Order>>() {}`).",
    "A subclass's generic superclass, including its type arguments, is stored in the class file and readable via `getGenericSuperclass()`.",
    "The library extracts `List<Order>` from that ParameterizedType (super type token)."]);

  var CO = "Collections";
  Q(CO, "Framework", "Easy", true, "J07", "Explain the Collections Framework hierarchy.", [
    "`Iterable` → `Collection` → `List` (ordered, indexed), `Set` (unique), `Queue`/`Deque` (processing order).",
    "`Map` is separate (key → value), not a `Collection`.",
    "Common implementations: ArrayList, LinkedList, HashSet, LinkedHashSet, TreeSet, ArrayDeque, PriorityQueue, HashMap, LinkedHashMap, TreeMap."]);
  Q(CO, "Lists", "Easy", true, "J07", "ArrayList vs LinkedList?", [
    "ArrayList: dynamic array, O(1) get, amortised O(1) append, O(n) middle insert/remove, compact.",
    "LinkedList: doubly linked nodes, O(1) at ends/iterator, O(n) get(i), much more memory, poor locality.",
    "Default to ArrayList; ArrayDeque for queues/stacks."]);
  Q(CO, "Lists", "Medium", true, "J07", "How does ArrayList grow internally?", [
    "Backed by `Object[] elementData`; `new ArrayList<>()` starts with a shared empty array and allocates 10 on first add.",
    "When full: new capacity = old + old/2 (1.5×), elements copied with `Arrays.copyOf`.",
    "Amortised O(1) per add; pre-size with `new ArrayList<>(n)` / `ensureCapacity`."]);
  Q(CO, "Lists", "Medium", false, "J07", "Difference between `List.of`, `Collections.unmodifiableList` and `Arrays.asList`?", [
    "`List.of`/`copyOf`: immutable, no nulls, independent data.",
    "`unmodifiableList`: read-only **view**; changes to the backing list are visible.",
    "`Arrays.asList`: fixed-size, write-through to the array; `set` works, `add`/`remove` throw UnsupportedOperationException."]);
  Q(CO, "Queues", "Easy", true, "J07", "Why prefer ArrayDeque over Stack?", [
    "`Stack` extends `Vector`: synchronized (overhead) and exposes index-based methods that break stack semantics.",
    "`ArrayDeque` is a fast circular array implementing `Deque`: `push`/`pop`/`peek` in O(1) amortised.",
    "ArrayDeque doesn't allow nulls."]);
  Q(CO, "Queues", "Medium", true, "J07", "How is PriorityQueue implemented? What are its complexities?", [
    "An array-backed binary min-heap (natural order or Comparator); index math: children 2i+1, 2i+2.",
    "peek O(1); offer/poll O(log n) via sift up/down; remove(Object)/contains O(n).",
    "Iteration order isn't sorted; not thread-safe (PriorityBlockingQueue)."]);
  Q(CO, "Queues", "Medium", true, "J07", "Find the K largest elements in a large stream.", [
    "Maintain a min-heap of size K: offer each element, poll when size > K.",
    "O(n log K) time, O(K) memory; works for unbounded streams.",
    "For K smallest use a max-heap; for small static data, sorting is simpler."], { code: `PriorityQueue<Integer> heap = new PriorityQueue<>();
for (int v : new int[]{5, 1, 9, 3, 7, 8}) { heap.offer(v); if (heap.size() > 3) heap.poll(); }
System.out.println(heap.stream().sorted(Comparator.reverseOrder()).toList());   // [9, 8, 7]` });
  Q(CO, "Queues", "Easy", false, "J07", "offer/poll/peek vs add/remove/element?", [
    "Same operations; `add`/`remove`/`element` throw (IllegalStateException / NoSuchElementException) on failure.",
    "`offer`/`poll`/`peek` return false/null instead.",
    "Prefer the special-value forms, especially with bounded queues."]);

  Q("Collections", "Maps", "Easy", true, "J08", "How does HashMap work internally (put and get)?", [
    "An array of buckets (power-of-two length); each bucket is a chain of nodes (hash, key, value, next) or a red-black tree.",
    "`hash = h ^ (h >>> 16)`, index `= hash & (n - 1)`; within the bucket, match by hash then `==` or `equals`.",
    "put replaces the value for an existing key or appends a node; resizes when size > capacity × load factor (0.75).",
    "get computes the same index and walks the bucket; average O(1)."]);
  Q("Collections", "Maps", "Medium", true, "J08", "What is the load factor and what happens on resize?", [
    "Load factor (default 0.75) sets threshold = capacity × LF; exceeding it doubles the table.",
    "Each node either stays at index i or moves to i + oldCap, decided by the bit `hash & oldCap`: no rehashing of keys.",
    "Resize is O(n); pre-size with `HashMap.newHashMap(expected)` (Java 19+) to avoid it."]);
  Q("Collections", "Maps", "Medium", true, "J08", "What happens when many keys collide? What changed in Java 8?", [
    "Colliding keys share a bucket chain; lookups degrade toward O(n).",
    "Since Java 8, a chain of ≥ 8 nodes becomes a red-black tree (if the table has ≥ 64 buckets, else it resizes); it reverts at ≤ 6.",
    "Worst case becomes O(log n), mitigating hash-flooding attacks."]);
  Q("Collections", "Maps", "Easy", true, "J08", "HashMap vs LinkedHashMap vs TreeMap?", [
    "HashMap: O(1) average, no order.",
    "LinkedHashMap: insertion or access order via a linked list; LRU caches.",
    "TreeMap: sorted keys, O(log n), NavigableMap (floor/ceiling/ranges); no null keys with natural ordering."]);
  Q("Collections", "Maps", "Medium", true, "J08", "Build an LRU cache using the JDK.", [
    "`new LinkedHashMap<>(16, 0.75f, true)` (access order) and override `removeEldestEntry` to return `size() > capacity`.",
    "From scratch: HashMap<K, Node> + doubly linked list with sentinels; O(1) get/put.",
    "Not thread-safe; for concurrency use Caffeine or a locked wrapper."],
    { code: `class Lru<K, V> extends LinkedHashMap<K, V> {
    private final int cap;
    Lru(int cap) { super(16, 0.75f, true); this.cap = cap; }
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > cap; }
}` });
  Q("Collections", "Sets", "Easy", true, "J08", "How is HashSet implemented? How does it detect duplicates?", [
    "Backed by a HashMap<E, Object> with a shared dummy value; `add(e)` returns `map.put(e, PRESENT) == null`.",
    "Duplicates are detected through `hashCode` (bucket) then `equals`: broken equals/hashCode break the set.",
    "LinkedHashSet uses LinkedHashMap; TreeSet uses TreeMap (compareTo/comparator decide uniqueness)."]);
  Q("Collections", "Maps", "Medium", false, "J08", "Explain `merge`, `compute`, `computeIfAbsent` and `getOrDefault`.", [
    "`merge(k, v, f)`: put v if absent, else put f(old, v); null result removes. Counting: `merge(k, 1, Integer::sum)`.",
    "`computeIfAbsent(k, fn)`: create the value lazily (multimaps: `computeIfAbsent(k, x -> new ArrayList<>()).add(v)`).",
    "`compute(k, (key, old) -> ...)`: general update; `getOrDefault` doesn't insert.",
    "Don't modify the same map inside the callbacks."]);
  Q("Collections", "Maps", "Medium", false, "J08", "What does TreeMap's NavigableMap API offer?", [
    "`floorKey/ceilingKey/lowerKey/higherKey` (≤, ≥, <, >), `firstEntry/lastEntry`, `pollFirstEntry`.",
    "Range views: `headMap`, `tailMap`, `subMap`, `descendingMap`, all O(log n) to locate.",
    "Use for bands, schedules, time-versioned values, and \"nearest\" queries."]);
  Q("Collections", "Maps", "Hard", false, "J08", "EnumMap, IdentityHashMap and WeakHashMap: when would you use each?", [
    "EnumMap: enum keys in an array indexed by ordinal; compact, fast, ordered by declaration.",
    "IdentityHashMap: compares keys with `==`; graph traversal / serialization bookkeeping.",
    "WeakHashMap: keys weakly referenced so entries vanish after the key is GC'd; metadata attached to objects, not general caches (values must not reference keys)."]);
  Q("Collections", "Maps", "Easy", false, "J08", "Which maps allow null keys or values?", [
    "HashMap/LinkedHashMap: one null key, null values.",
    "TreeMap: null values; null key only with a comparator that handles it.",
    "ConcurrentHashMap, Hashtable, Map.of/copyOf: no nulls (NPE)."]);

  var IC = "Iteration & concurrent collections";
  Q(IC, "Iteration", "Easy", true, "J09", "What is ConcurrentModificationException? How do you avoid it?", [
    "Thrown by fail-fast iterators when the collection is structurally modified other than through the iterator (`modCount != expectedModCount`).",
    "Happens in single-threaded code: `list.remove(x)` inside a for-each.",
    "Avoid with `Iterator.remove()`, `removeIf`, collecting then removing, or iterating a copy; concurrent collections don't throw it."]);
  Q(IC, "Iteration", "Easy", true, "J09", "Fail-fast vs fail-safe iterators?", [
    "Fail-fast (`ArrayList`, `HashMap`): throw CME on detected modification, best effort only.",
    "Snapshot (`CopyOnWriteArrayList`): iterate an immutable copy, never throw, don't see later changes, no `remove()`.",
    "Weakly consistent (`ConcurrentHashMap`): never throw, may reflect concurrent changes, each element at most once."]);
  Q(IC, "Iteration", "Medium", false, "J09", "Why does removing the second-to-last element in a for-each over an ArrayList not throw?", [
    "`hasNext()` is `cursor != size`; after the removal the cursor equals the new size, so the loop exits before `next()` checks `modCount`.",
    "The last element is silently skipped: proof that fail-fast is best-effort.",
    "HashMap-based iterators do throw here because their `hasNext()` uses the next node, not size."]);
  Q(IC, "ConcurrentHashMap", "Medium", true, "J09", "How does ConcurrentHashMap work internally (Java 8+)?", [
    "Node table like HashMap; `get` uses volatile reads with no locking.",
    "Put into an empty bin: CAS; into a non-empty bin: `synchronized` on the bin's first node.",
    "Bins treeify at 8; resize is cooperative via `ForwardingNode`s; size uses striped counter cells.",
    "Java 7 used 16 `Segment` locks instead."]);
  Q(IC, "ConcurrentHashMap", "Easy", true, "J09", "Why doesn't ConcurrentHashMap allow null keys or values?", [
    "`get(k) == null` must mean absent; with concurrent writers you can't disambiguate with a follow-up `containsKey`.",
    "Null also signals \"remove\" in `compute`/`merge` functions.",
    "Use sentinels, Optional or `getOrDefault`."]);
  Q(IC, "ConcurrentHashMap", "Medium", true, "J09", "HashMap vs Hashtable vs synchronizedMap vs ConcurrentHashMap?", [
    "HashMap: not thread-safe, nulls allowed.",
    "Hashtable / synchronizedMap: one lock for all operations; iteration and compound actions need manual locking.",
    "ConcurrentHashMap: lock-free reads, fine-grained writes, atomic compound methods, weakly consistent iterators, no nulls.",
    "Prefer ConcurrentHashMap for shared maps."]);
  Q(IC, "ConcurrentHashMap", "Medium", true, "J09", "Is a ConcurrentHashMap enough to make a counter thread-safe?", [
    "Only if you use its atomic methods: `get` then `put` is two operations and loses updates.",
    "Use `merge(k, 1, Integer::sum)`, `compute`, or `computeIfAbsent(k, x -> new LongAdder()).increment()`.",
    "Same for check-then-act: `putIfAbsent`/`computeIfAbsent` instead of `containsKey` + `put`."],
    { code: `ConcurrentHashMap<String, Integer> hits = new ConcurrentHashMap<>();
hits.merge("/search", 1, Integer::sum);
hits.computeIfAbsent("/book", k -> 0);
System.out.println(hits);` });
  Q(IC, "ConcurrentHashMap", "Hard", false, "J09", "What should you avoid inside `computeIfAbsent`/`compute` on a ConcurrentHashMap?", [
    "The function runs while the bin is locked: no slow I/O or blocking calls (they stall other writers to that bin).",
    "Don't modify the same map from inside (can deadlock or throw `IllegalStateException: Recursive update`).",
    "For slow loads, store a `CompletableFuture` per key or use Caffeine."]);
  Q(IC, "Concurrent collections", "Medium", false, "J09", "When would you use CopyOnWriteArrayList?", [
    "Read-mostly, small lists iterated far more than modified: listeners, subscribers, config rules.",
    "Writes copy the whole array (O(n)); iterators are snapshots that never throw and don't support remove.",
    "Avoid for large or write-heavy lists."]);
  Q(IC, "Concurrent collections", "Medium", false, "J09", "Name the main BlockingQueue implementations and their uses.", [
    "`ArrayBlockingQueue` (bounded FIFO, backpressure), `LinkedBlockingQueue` (optionally bounded; default unbounded), `PriorityBlockingQueue`, `DelayQueue` (expiry), `SynchronousQueue` (hand-off), `LinkedTransferQueue`.",
    "`put`/`take` block; `offer`/`poll` with timeouts don't block forever.",
    "Prefer bounded queues in services to avoid OOM under overload."]);

  window.JAVA_IQ = QS;
})();
