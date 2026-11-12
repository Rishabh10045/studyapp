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

  var FN = "Lambdas & functional programming";
  Q(FN, "Lambdas", "Easy", true, "J10", "What is a functional interface? Is @FunctionalInterface required?", [
    "An interface with exactly one abstract method; default, static and Object methods don't count.",
    "Lambdas and method references can only target functional interfaces.",
    "The annotation is optional; it makes the compiler reject a second abstract method."]);
  Q(FN, "Lambdas", "Easy", true, "J10", "Lambda vs anonymous class?", [
    "Lambdas: concise, only for functional interfaces, `this` = enclosing instance, compiled via invokedynamic (no extra class file).",
    "Anonymous classes: can extend classes, have fields and several methods; `this` = the anonymous object; new class file and object.",
    "Both capture only effectively final locals."]);
  Q(FN, "Lambdas", "Medium", true, "J10", "Why must local variables used in a lambda be effectively final?", [
    "The lambda captures a copy of the value; it may run after the method returns or on another thread.",
    "Allowing mutation would make the copy stale or require shared mutable stack state.",
    "Fields aren't copied (accessed via `this`), so they can change; prefer returning values over mutating captured state."]);
  Q(FN, "Lambdas", "Easy", true, "J10", "Name the core java.util.function interfaces and their methods.", [
    "`Function<T,R>.apply`, `BiFunction<T,U,R>.apply`, `Supplier<T>.get`, `Consumer<T>.accept`, `Predicate<T>.test`.",
    "`UnaryOperator<T>` (T → T) and `BinaryOperator<T>` ((T,T) → T).",
    "Primitive variants (`IntPredicate`, `ToIntFunction`, `IntUnaryOperator`…) avoid boxing."]);
  Q(FN, "Method references", "Medium", true, "J10", "What kinds of method references exist?", [
    "Static `Integer::parseInt`; bound instance `obj::method` (receiver evaluated once); unbound instance `String::length` (first argument is the receiver); constructor `ArrayList::new` / `int[]::new`."],
    { code: `Function<String, Integer> p = Integer::parseInt;
Function<String, Integer> len = String::length;
Supplier<List<String>> mk = ArrayList::new;
System.out.println(p.apply("42") + len.apply("DEL") + mk.get().size());` });
  Q(FN, "Composition", "Medium", false, "J10", "Difference between `andThen` and `compose`?", [
    "`f.andThen(g)` = g(f(x)): f first.",
    "`f.compose(g)` = f(g(x)): g first.",
    "Predicates compose with `and`, `or`, `negate`, `Predicate.not`; `Function.identity()` is the neutral element."]);
  Q(FN, "Composition", "Medium", true, "J10", "Sort a list by multiple fields with Comparator combinators.", [
    "`list.sort(comparing(Emp::dept).thenComparing(Emp::salary, reverseOrder()).thenComparing(Emp::name))`.",
    "`comparingInt` avoids boxing; `nullsFirst/nullsLast` handle null keys.",
    "`reversed()` reverses the whole chain so far; avoid `a - b` comparators (overflow)."]);
  Q(FN, "Lambdas", "Hard", false, "J10", "How are lambdas implemented by the JVM?", [
    "The body compiles to a private synthetic method; creation is an `invokedynamic` call site bootstrapped by `LambdaMetafactory`.",
    "At first use a hidden class implementing the interface is generated; non-capturing lambdas are typically cached singletons.",
    "Capturing lambdas allocate small objects (often removed by escape analysis)."]);
  Q(FN, "Lambdas", "Medium", false, "J10", "How do you handle checked exceptions inside lambdas?", [
    "Standard functional interfaces don't declare checked exceptions, so code like `map(p -> Files.readString(p))` doesn't compile.",
    "Catch and wrap (`UncheckedIOException`, domain exception), or write a throwing functional interface plus an adapter.",
    "Don't swallow exceptions or return null; consider moving I/O out of the stream."]);
  Q(FN, "Lambdas", "Hard", false, "J10", "Why does `executor.submit(() -> { throw new Exception(); })` compile?", [
    "The lambda is compatible with both `Runnable` and `Callable`; for lambdas a non-void functional interface is more specific, so `submit(Callable)` is chosen.",
    "`Callable.call()` declares `throws Exception`, so the checked exception is allowed.",
    "Cast to `Runnable` and it fails to compile."]);

  var ST = "Streams";
  Q(ST, "Basics", "Easy", true, "J11", "Intermediate vs terminal operations? What does lazy mean?", [
    "Intermediate ops (`filter`, `map`, `sorted`…) return streams and only describe work; terminal ops (`collect`, `toList`, `count`, `forEach`…) run the pipeline.",
    "Lazy: nothing executes until the terminal op; then elements flow one at a time through all stages.",
    "Short-circuiting ops (`limit`, `findFirst`, `anyMatch`) can stop early, even on infinite streams."]);
  Q(ST, "Basics", "Easy", true, "J11", "map vs flatMap?", [
    "`map`: one input → one output.",
    "`flatMap`: one input → a stream of outputs, flattened into one stream (e.g. list of lists → elements).",
    "`mapMulti` (Java 16) is an imperative alternative."]);
  Q(ST, "Basics", "Easy", false, "J11", "Can a stream be reused? Does it modify its source?", [
    "No: a second terminal operation throws `IllegalStateException: stream has already been operated upon or closed`.",
    "Streams never modify the source; modifying the source during the pipeline is interference (CME/NPE/undefined).",
    "Create a new stream from the source (or a `Supplier<Stream<T>>`) for another pass."]);
  Q(ST, "Collectors", "Medium", true, "J11", "Group a list by a field and count, sum or collect values per group.", [
    "`groupingBy(T::key, counting())`, `groupingBy(T::key, summingInt(T::v))`, `groupingBy(T::key, mapping(T::v, toSet()))`.",
    "Add `TreeMap::new` as the second argument for sorted keys.",
    "`partitioningBy(pred, downstream)` for two groups (both keys always present)."],
    { code: `record B(String route, int fare) {}
var bs = List.of(new B("DEL-BLR", 4850), new B("BOM-GOI", 3200), new B("DEL-BLR", 5300));
Map<String, Long> n = bs.stream().collect(Collectors.groupingBy(B::route, TreeMap::new, Collectors.counting()));
System.out.println(n);` });
  Q(ST, "Collectors", "Medium", true, "J11", "What happens with duplicate keys in `Collectors.toMap`?", [
    "It throws `IllegalStateException: Duplicate key …`.",
    "Pass a merge function: `toMap(k, v, (a, b) -> a)` or `Math::min`/`Integer::sum`; and a supplier for the map type.",
    "Null values also throw NPE."]);
  Q(ST, "Basics", "Medium", false, "J11", "`Stream.toList()` vs `collect(Collectors.toList())`?", [
    "`toList()` (Java 16): unmodifiable, allows nulls.",
    "`Collectors.toList()`: unspecified mutability (an ArrayList today); use `toCollection(ArrayList::new)` if you need to mutate.",
    "`toUnmodifiableList()`: unmodifiable and null-hostile."]);
  Q(ST, "Basics", "Medium", false, "J11", "Explain `reduce` and its rules.", [
    "`reduce(identity, accumulator)` folds elements; `reduce(accumulator)` returns Optional; 3-arg form adds a combiner (parallel / type change).",
    "Identity must be neutral and the function associative, or parallel results differ.",
    "Use `sum()`/`collect` instead of reducing into mutable containers."]);
  Q(ST, "Parallel", "Hard", true, "J11", "When should you use parallel streams?", [
    "Large, CPU-bound, independent work over splittable sources (arrays, ArrayList, ranges), measured to be faster.",
    "Avoid for small data, I/O or blocking (they share the ForkJoin common pool), LinkedList/iterate sources, order-dependent ops, shared mutable state.",
    "In servers, prefer a dedicated pool or executor."]);
  Q(ST, "Basics", "Medium", false, "J11", "Why does `sorted()` break short-circuiting?", [
    "It is stateful: it must buffer all elements before emitting the first.",
    "So `sorted().limit(2)` still reads and processes the whole upstream.",
    "For top-N on huge data, a bounded heap is cheaper."]);
  Q(ST, "Coding", "Medium", true, "J11", "Find the frequency of each character in a string with streams.", [
    "`s.chars().mapToObj(c -> (char) c).collect(groupingBy(identity(), LinkedHashMap::new, counting()))`.",
    "`LinkedHashMap` keeps first-seen order; TreeMap sorts.",
    "Filter whitespace first if needed."],
    { code: `String s = "bangalore";
Map<Character, Long> freq = s.chars().mapToObj(c -> (char) c)
    .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
System.out.println(freq);` });

  var OP = "Optional";
  Q(OP, "Optional", "Easy", true, "J12", "What is Optional and when should you use it?", [
    "A container holding zero or one non-null value, introduced in Java 8.",
    "Intended for method return types where absence is a normal outcome (lookups, stream terminals).",
    "Not for fields, parameters or collections; never return null from an Optional-returning method."]);
  Q(OP, "Optional", "Easy", true, "J12", "orElse vs orElseGet?", [
    "`orElse(value)` evaluates its argument eagerly, even when a value is present.",
    "`orElseGet(supplier)` calls the supplier only when empty.",
    "Use orElse for constants, orElseGet for computed/expensive/side-effecting defaults."],
    { code: `Optional<String> o = Optional.of("DEL");
System.out.println(o.orElseGet(() -> { System.out.println("not printed"); return "x"; }));` });
  Q(OP, "Optional", "Easy", false, "J12", "Optional.of vs Optional.ofNullable vs Optional.empty?", [
    "`of(x)`: x must be non-null (NPE otherwise, failing fast).",
    "`ofNullable(x)`: empty if x is null.",
    "`empty()`: the absent value."]);
  Q(OP, "Optional", "Medium", true, "J12", "map vs flatMap on Optional?", [
    "`map(f)`: f returns a plain value (null result → empty).",
    "`flatMap(f)`: f returns an Optional; avoids `Optional<Optional<T>>`.",
    "`filter(p)` empties the Optional when p is false."]);
  Q(OP, "Optional", "Medium", true, "J12", "Why is `isPresent()` + `get()` considered an anti-pattern?", [
    "It's a null check in disguise and `get()` throws NoSuchElementException if misused.",
    "Use `map`/`orElse`/`orElseThrow`/`ifPresentOrElse` instead.",
    "`orElseThrow()` (Java 10) is the explicit replacement for `get()`."]);
  Q(OP, "Optional", "Medium", false, "J12", "Why shouldn't Optional be used as a field or parameter?", [
    "Fields: not Serializable (JPA, caches, Java serialization), extra object per field, JSON needs modules.",
    "Parameters: callers must wrap, the Optional itself can be null; overloads are clearer.",
    "Expose `Optional<T> getX()` over a nullable field instead."]);
  Q(OP, "Optional", "Medium", false, "J12", "How do you use Optional with streams?", [
    "`findFirst`, `findAny`, `min`, `max`, `reduce(op)` return Optionals.",
    "`Optional.stream()` (Java 9) gives 0 or 1 elements; `flatMap(Optional::stream)` drops empties.",
    "Primitive streams return `OptionalInt`/`OptionalDouble`."]);
  Q(OP, "Optional", "Medium", false, "J12", "What do `Optional.or` and `ifPresentOrElse` (Java 9) do?", [
    "`or(() -> otherOptional)` lazily supplies an alternative Optional when empty (cache then DB).",
    "`ifPresentOrElse(action, emptyAction)` runs one of two actions.",
    "Also Java 9: `Optional.stream()`; Java 10: `orElseThrow()`; Java 11: `isEmpty()`."]);
  Q(OP, "Optional", "Hard", false, "J12", "How would you handle a Spring Data `findById` that returns Optional in a REST API?", [
    "In the service: `repo.findById(id).orElseThrow(() -> new NotFoundException(id))`.",
    "A `@RestControllerAdvice` maps NotFoundException to HTTP 404 (ProblemDetail).",
    "Unwrap at the boundary; don't put Optionals into entities or DTOs."]);
  Q(OP, "Optional", "Medium", false, "J12", "Besides Optional, how else can you avoid NullPointerExceptions?", [
    "Validate at boundaries: `Objects.requireNonNull(x, \"msg\")`, Bean Validation `@NotNull`.",
    "Return empty collections; use Null Object implementations; `requireNonNullElse` for defaults.",
    "Nullness annotations (JSpecify) with static analysis (NullAway); helpful NPE messages (Java 14+) aid debugging."]);

  var MJ = "Modern Java (9–21)";
  Q(MJ, "Java 9–17", "Easy", true, "J13", "What are records? What do they generate?", [
    "Immutable data carriers (Java 16): `record Fare(String route, int amount) {}`.",
    "Generated: private final fields, canonical constructor, accessors `route()`, `equals`, `hashCode`, `toString`.",
    "Final, can't extend classes, can implement interfaces; validate in a compact constructor; shallowly immutable."]);
  Q(MJ, "Java 9–17", "Easy", true, "J13", "What is `var`? Where can't you use it?", [
    "Local variable type inference (Java 10); still static typing.",
    "Not for fields, parameters, return types, uninitialised or null-initialised locals, or array initialisers without `new`.",
    "Use when the type is obvious; `new ArrayList<>()` with var gives `ArrayList<Object>`."]);
  Q(MJ, "Java 9–17", "Easy", true, "J13", "Switch expressions vs the old switch statement?", [
    "Arrow labels: no fall-through, comma-separated labels, value produced (`yield` in blocks).",
    "Expressions must be exhaustive (all enum constants or default).",
    "Java 14 standard; patterns in switch arrived in Java 21."],
    { code: `String c = "J";
int bags = switch (c) { case "F", "J" -> 2; case "Y" -> 1; default -> 0; };
System.out.println(bags);` });
  Q(MJ, "Java 9–17", "Medium", true, "J13", "What are sealed classes and why use them?", [
    "`sealed ... permits A, B` restricts subtypes; each must be final, sealed or non-sealed (Java 17).",
    "Models a closed set of alternatives with different data (payments, results, events).",
    "Enables exhaustive pattern switches without default (Java 21)."]);
  Q(MJ, "Java 9–17", "Medium", false, "J13", "Explain pattern matching for instanceof and flow scoping.", [
    "`if (o instanceof Fare f)` tests, casts and binds in one step (Java 16).",
    "`f` is in scope where the match is definitely true: inside the if, after `&&`, after an early return on `!(o instanceof Fare f)`.",
    "Simplifies equals: `return o instanceof Pnr p && p.code.equals(code);`."]);
  Q(MJ, "Java 9–17", "Medium", false, "J13", "What are text blocks? Any gotchas?", [
    "Multi-line string literals with `\"\"\"` (Java 15); incidental indentation removed, quotes unescaped.",
    "The closing delimiter's position affects indentation and trailing newline.",
    "`\\` joins lines, `\\s` keeps a space; use `formatted()` for values."]);
  Q(MJ, "Java 9–17", "Medium", false, "J13", "Can records be JPA entities? Where do they fit in Spring apps?", [
    "Not as entities: JPA needs a no-arg constructor, mutable state and proxyable (non-final) classes.",
    "Great for DTOs, request/response bodies, projections, events, value objects, configuration properties (`@ConfigurationProperties` records).",
    "Jackson and Spring bind records natively."]);
  Q(MJ, "Java 9–17", "Easy", false, "J13", "What are helpful NullPointerExceptions?", [
    "Since Java 14 (default from 15), NPE messages say what was null: `because the return value of \"Booking.lead()\" is null`.",
    "Local variable names appear with debug info (`-g`), else `<localN>`.",
    "Speeds up debugging chained calls."]);
  Q(MJ, "Java 9–17", "Medium", false, "J13", "Name useful API additions from Java 9 to 17.", [
    "`List.of/Set.of/Map.of/copyOf`, `Stream.toList`, `takeWhile/dropWhile`, `Collectors.teeing`.",
    "`String.isBlank/strip/lines/repeat/formatted/indent/transform`, `Files.readString/writeString`.",
    "`Optional.or/stream/isEmpty/orElseThrow`, `HttpClient`, private interface methods, `java File.java`."]);
  Q(MJ, "Java 9–17", "Hard", false, "J13", "What breaks when upgrading from Java 8 to 17?", [
    "Removed modules (JAXB, `javax.annotation`, CORBA), strong encapsulation of JDK internals (illegal reflective access fails), removed GC flags (CMS, PermGen).",
    "Old libraries (Lombok, Mockito, ASM, bytecode tools) need upgrades; Spring Boot 3 adds `javax` → `jakarta`.",
    "Plan: upgrade libs, compile with `--release 17`, OpenRewrite recipes, full tests and canary."]);

  Q(MJ, "Java 21", "Medium", true, "J14", "What is pattern matching for switch (Java 21)?", [
    "`switch` on any type with type patterns (`case Card c`), guards (`when`), record patterns and `case null`.",
    "Cases are tried top to bottom; dominated labels are compile errors; pattern switches must be exhaustive.",
    "Replaces instanceof chains and many visitor implementations."],
    { code: `Object o = 4850;
String r = switch (o) { case Integer i when i > 1000 -> "big"; case Integer i -> "small"; default -> "other"; };
System.out.println(r);` });
  Q(MJ, "Java 21", "Medium", true, "J14", "How do sealed types and switch work together?", [
    "A switch covering all permitted subtypes of a sealed type is exhaustive without default.",
    "Adding a subtype breaks compilation of every such switch, showing what to update.",
    "Avoid default there; a stale compiled switch throws MatchException at runtime."]);
  Q(MJ, "Java 21", "Medium", false, "J14", "What are record patterns?", [
    "Patterns that match a record and bind its components: `if (o instanceof Point(var x, var y))`.",
    "They nest: `case Booking(var p, Flight(var no, var route), var pax)`.",
    "Java 22 adds `_` to ignore components."]);
  Q(MJ, "Java 21", "Easy", true, "J14", "What are sequenced collections?", [
    "Java 21 `SequencedCollection/Set/Map`: `getFirst`, `getLast`, `addFirst/Last`, `removeFirst/Last`, `reversed()`; maps add `firstEntry`, `lastEntry`, `putFirst`, `pollFirstEntry`.",
    "Implemented by List, Deque, LinkedHashSet, SortedSet, LinkedHashMap, SortedMap.",
    "`reversed()` is a view."]);
  Q(MJ, "Java 21", "Easy", true, "J14", "What are virtual threads?", [
    "Lightweight JVM-managed threads (Java 21) mounted on a few carrier OS threads.",
    "Blocking I/O unmounts them, so millions can wait cheaply; same Thread/Executor APIs.",
    "Use one per task (`newVirtualThreadPerTaskExecutor`), for I/O-bound concurrency."]);
  Q(MJ, "Java 21", "Hard", true, "J14", "What is pinning in virtual threads and how do you avoid it?", [
    "In Java 21, blocking while inside `synchronized` (or native code) keeps the virtual thread mounted, occupying its carrier.",
    "Detect with `-Djdk.tracePinnedThreads=full` or JFR `jdk.VirtualThreadPinned`.",
    "Use `ReentrantLock` around blocking calls or Java 24+, where synchronized no longer pins (JEP 491)."]);
  Q(MJ, "Java 21", "Medium", false, "J14", "When should you not use virtual threads?", [
    "CPU-bound work (no extra cores); pooling them (create per task); limiting concurrency by pool size (use a Semaphore).",
    "Heavy ThreadLocal caches multiply per thread.",
    "Downstream limits (DB pools, rate limits) still apply."]);
  Q(MJ, "Java 21", "Easy", false, "J14", "Which Java 21 features were previews, and what happened to them?", [
    "Unnamed patterns/variables `_` (final in 22), scoped values (final in 25), structured concurrency (still preview in 25), string templates (withdrawn in 23).",
    "Previews need `--enable-preview` and can change; avoid in production."]);
  Q(MJ, "Java 21", "Medium", false, "J14", "What does `case null` change in a switch?", [
    "Historically `switch (null)` throws NPE; that remains the default.",
    "`case null ->` (or `case null, default ->`) handles null explicitly in pattern switches.",
    "Keeps null handling visible instead of a separate if before the switch."]);
  Q(MJ, "Java 21", "Hard", false, "J14", "Sealed types + pattern switch vs the visitor pattern?", [
    "Visitor: double dispatch, boilerplate, adding types touches every visitor.",
    "Sealed + switch: one function per operation, compiler-checked exhaustiveness, record patterns for nested data.",
    "Both fit closed hierarchies; open, plugin-style hierarchies favour classic polymorphism."]);

  var MT = "Multithreading";
  Q(MT, "Threads", "Easy", true, "J15", "Process vs thread?", [
    "A process has its own address space; threads run inside a process and share its heap.",
    "Each thread has its own stack and program counter.",
    "Threads are cheaper to create and communicate through shared memory, which needs synchronization."]);
  Q(MT, "Threads", "Easy", true, "J15", "What is the difference between start() and run()?", [
    "`start()` creates a new thread of execution that calls `run()`.",
    "Calling `run()` directly executes it synchronously on the current thread.",
    "A thread can be started only once (`IllegalThreadStateException`)."]);
  Q(MT, "Threads", "Easy", true, "J15", "Runnable vs Callable?", [
    "Runnable: `void run()`, no checked exceptions.",
    "Callable<V>: `V call() throws Exception`.",
    "Submitting either to an ExecutorService returns a Future."]);
  Q(MT, "Threads", "Medium", true, "J15", "Explain the thread states.", [
    "NEW, RUNNABLE (running or ready), BLOCKED (waiting for a monitor), WAITING (wait/join/park), TIMED_WAITING (sleep, timed waits), TERMINATED.",
    "Threads on a ReentrantLock show WAITING (parked), not BLOCKED.",
    "Read them in thread dumps to diagnose hangs."]);
  Q(MT, "Threads", "Medium", true, "J15", "How do you stop a thread?", [
    "Cooperatively: `interrupt()` sets a flag; blocking calls throw InterruptedException; loops check `isInterrupted()`.",
    "`Thread.stop` is deprecated/removed because it corrupts shared state.",
    "Restore the flag (`Thread.currentThread().interrupt()`) when you catch InterruptedException and can't rethrow."]);
  Q(MT, "Threads", "Easy", false, "J15", "sleep() vs wait()?", [
    "`sleep` is a static Thread method; pauses without releasing locks.",
    "`wait` is an Object method; must hold the monitor; releases it and waits for notify or timeout.",
    "Both are interruptible."]);
  Q(MT, "Threads", "Easy", false, "J15", "What is a daemon thread?", [
    "A background thread that doesn't prevent JVM exit (GC is one).",
    "Set with `setDaemon(true)` before start; inherited from the creating thread.",
    "Don't use for work that must complete."]);
  Q(MT, "Threads", "Medium", false, "J15", "What happens when a thread throws an uncaught exception? And in an executor?", [
    "That thread terminates; the UncaughtExceptionHandler (default: stderr) is called; others continue.",
    "`execute()`: goes to the worker's handler; `submit()`: captured in the Future until `get()`.",
    "Always check futures or attach handlers."]);
  Q(MT, "Threads", "Easy", true, "J15", "What is a race condition? Why is count++ not thread-safe?", [
    "A race: correctness depends on the timing of threads accessing shared state.",
    "`count++` is read, add, write; interleavings lose updates.",
    "Fix with synchronized, AtomicInteger/LongAdder, or confinement; volatile isn't enough."],
    { code: `AtomicInteger c = new AtomicInteger();
Thread a = new Thread(() -> { for (int i = 0; i < 1000; i++) c.incrementAndGet(); });
a.start(); a.join();
System.out.println(c.get());` });
  Q(MT, "Threads", "Medium", false, "J15", "What does join() do?", [
    "Waits until the target thread terminates (optionally with a timeout).",
    "Creates a happens-before edge: the joining thread sees all writes of the joined thread.",
    "Interruptible: throws InterruptedException."]);

  Q(MT, "Executors", "Easy", true, "J16", "Why use thread pools / ExecutorService?", [
    "Reuse threads instead of paying creation cost per task.",
    "Bound concurrency and define overload behaviour (queue, reject).",
    "Futures for results, exceptions, timeouts and cancellation; central lifecycle and naming."]);
  Q(MT, "Executors", "Easy", true, "J16", "execute() vs submit()?", [
    "`execute(Runnable)` returns void; exceptions go to the worker's UncaughtExceptionHandler.",
    "`submit` accepts Runnable or Callable and returns a Future; exceptions are captured and rethrown from `get()` as ExecutionException.",
    "Unchecked Futures silently swallow failures."]);
  Q(MT, "Executors", "Easy", true, "J16", "shutdown() vs shutdownNow() vs awaitTermination()?", [
    "shutdown: reject new tasks, finish queued ones.",
    "shutdownNow: interrupt running tasks and return never-started ones.",
    "awaitTermination blocks until done or timeout; combine them in two phases. Java 19+ `close()` does shutdown + wait."]);
  Q(MT, "Executors", "Medium", true, "J16", "Explain ThreadPoolExecutor parameters and how it processes a new task.", [
    "core, max, keepAlive, workQueue, threadFactory, rejection handler.",
    "Below core → new thread; else queue; if queue full and below max → new thread; else reject.",
    "So with a bounded queue, the pool grows past core only after the queue fills; with an unbounded queue it never does."],
    { code: `new ThreadPoolExecutor(8, 16, 60, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(200),
    Thread.ofPlatform().name("api-", 0).factory(),
    new ThreadPoolExecutor.CallerRunsPolicy());` });
  Q(MT, "Executors", "Medium", true, "J16", "What rejection policies exist and when do you use each?", [
    "AbortPolicy (default): throw RejectedExecutionException; fail fast (HTTP 503).",
    "CallerRunsPolicy: run on the submitter, giving back-pressure.",
    "DiscardPolicy / DiscardOldestPolicy: drop silently, only for best-effort work. Custom handlers can log, meter or persist."]);
  Q(MT, "Executors", "Medium", true, "J16", "What is wrong with Executors.newFixedThreadPool and newCachedThreadPool in production?", [
    "Fixed and single-thread pools use an unbounded LinkedBlockingQueue: backlog grows until OOM, latency grows silently.",
    "Cached pool allows Integer.MAX_VALUE threads: thread explosion under slow load.",
    "Prefer an explicit ThreadPoolExecutor with bounded queue and max, or virtual threads with a semaphore."]);
  Q(MT, "Executors", "Medium", true, "J16", "How do you size a thread pool?", [
    "CPU-bound: ≈ number of cores.",
    "I/O-bound: cores × (1 + wait/compute), or Little's law: arrival rate × latency.",
    "Limit by downstream capacity (DB connections), isolate workloads with bulkheads, then load-test and tune."]);
  Q(MT, "Executors", "Medium", false, "J16", "invokeAll vs invokeAny?", [
    "invokeAll runs all tasks and waits for all, returning Futures in input order (timeout cancels unfinished ones).",
    "invokeAny returns the result of the first task to complete successfully and cancels the rest.",
    "invokeAny throws ExecutionException only if all fail."]);
  Q(MT, "Executors", "Medium", true, "J16", "scheduleAtFixedRate vs scheduleWithFixedDelay?", [
    "Fixed rate: starts every period from the initial time; overruns delay the next start, runs never overlap.",
    "Fixed delay: waits the delay after each run finishes.",
    "If a periodic task throws, all later runs are cancelled silently, so catch exceptions inside."]);
  Q(MT, "Executors", "Hard", false, "J16", "How do you propagate MDC / ThreadLocal context to executor threads?", [
    "Capture the context when the task is submitted; restore it in the worker before running; clear or restore in finally.",
    "Use a decorating Executor, Spring's TaskDecorator, or Micrometer context-propagation.",
    "Clearing matters: pool threads are reused, so stale context leaks into other requests."]);

  Q(MT, "Memory model", "Medium", true, "J17", "What is the Java Memory Model?", [
    "JLS chapter 17: rules for which values reads of shared variables may return in multi-threaded code.",
    "Exists because compilers, the JIT and CPUs reorder and cache memory operations.",
    "Defines happens-before; conflicting accesses without it are data races."]);
  Q(MT, "Memory model", "Medium", true, "J17", "What is happens-before? Name the main rules.", [
    "If A happens-before B, A's effects are visible to and ordered before B.",
    "Program order, monitor unlock → lock, volatile write → read, start() → thread, thread → join(), final-field freeze, j.u.c. hand-offs.",
    "It is transitive."]);
  Q(MT, "Memory model", "Easy", true, "J17", "What does volatile do? Is volatile count++ thread-safe?", [
    "Visibility (writes seen by later reads), ordering (acts as a publication barrier), atomic long/double reads and writes.",
    "count++ is not atomic: read, add, write can interleave and lose updates.",
    "Use AtomicInteger/LongAdder or a lock."],
    { code: `class Worker {
    volatile boolean running = true;             // ok: flag
    volatile int count;                          // count++ still loses updates
    final AtomicInteger safeCount = new AtomicInteger();
}` });
  Q(MT, "Memory model", "Easy", true, "J17", "synchronized vs volatile?", [
    "synchronized: mutual exclusion + visibility; supports compound actions and multi-field invariants; may block.",
    "volatile: visibility + ordering of one variable, non-blocking, no compound atomicity.",
    "volatile suits flags and immutable snapshot references."]);
  Q(MT, "Memory model", "Easy", true, "J17", "What does synchronized lock on for instance methods, static methods and blocks?", [
    "Instance method: `this`; static method: the Class object; block: the given object.",
    "Intrinsic locks are reentrant.",
    "Use a private final lock object so outside code can't interfere; never lock on boxed values or string literals."]);
  Q(MT, "Memory model", "Medium", true, "J17", "Why is double-checked locking broken without volatile? Show a correct lazy singleton.", [
    "The reference may be published before the constructor's writes become visible; the unlocked check can return a half-built object.",
    "volatile on the instance field fixes it (Java 5+).",
    "Holder class idiom or enum singletons are simpler."],
    { code: `class Config {
    private static class Holder { static final Config INSTANCE = new Config(); }
    static Config get() { return Holder.INSTANCE; }
}` });
  Q(MT, "Memory model", "Medium", true, "J17", "What is safe publication?", [
    "Making an object reference and its initialized state visible to another thread together.",
    "Static initializer, volatile/AtomicReference, final field, lock-guarded field, concurrent collections and other j.u.c. hand-offs.",
    "Plain shared fields are unsafe publication."]);
  Q(MT, "Memory model", "Medium", true, "J17", "How do you make a class immutable and why is it thread-safe?", [
    "Final class or record, private final fields, no setters, defensive copies, no this-escape.",
    "Final-field semantics guarantee visibility of the constructed state to all threads.",
    "State never changes, so no synchronization is needed."]);
  Q(MT, "Memory model", "Hard", false, "J17", "What is this-escape and why is it dangerous?", [
    "Publishing `this` from a constructor (listeners, starting threads, static registries, capturing lambdas).",
    "Other threads may see the object before construction completes, even default values in final fields.",
    "Use a static factory that constructs, then registers or starts."]);
  Q(MT, "Memory model", "Hard", false, "J17", "Why can a concurrency bug pass all tests on x86 and fail on ARM?", [
    "x86 has a strong (TSO) memory model that keeps stores in order; ARM reorders more.",
    "Code with a missing happens-before may work by accident on x86.",
    "Reason with the JMM rather than tests; use jcstress for litmus testing."]);

  Q(MT, "Locks", "Easy", true, "J18", "ReentrantLock vs synchronized?", [
    "Same mutual exclusion and memory semantics.",
    "ReentrantLock adds tryLock, timed and interruptible acquisition, fairness, multiple Conditions, and non-block-structured locking.",
    "It must be released in finally; synchronized releases automatically. On Java 21, synchronized pins virtual threads."]);
  Q(MT, "Locks", "Easy", true, "J18", "What is a reentrant lock?", [
    "The owning thread can acquire it again without deadlocking itself.",
    "A hold count is kept; the lock is released when it returns to zero.",
    "Both synchronized and ReentrantLock are reentrant; StampedLock is not."]);
  Q(MT, "Locks", "Easy", true, "J18", "What is the correct way to use a Lock?", [
    "Call lock() just before try, do the work in try, unlock() in finally.",
    "Nothing between lock() and try that could throw or return.",
    "Use tryLock with a timeout when waiting forever is unacceptable."],
    { code: `Lock lock = new ReentrantLock();
lock.lock();
try {
    // critical section
} finally {
    lock.unlock();
}` });
  Q(MT, "Locks", "Medium", true, "J18", "Fair vs non-fair locks?", [
    "Fair: FIFO among waiting threads, no starvation, lower throughput.",
    "Non-fair (default): arriving threads may barge, much higher throughput.",
    "Use fair only for proven starvation; tryLock() barges even on fair locks."]);
  Q(MT, "Locks", "Medium", true, "J18", "How does a ReadWriteLock work? Can you upgrade a read lock to a write lock?", [
    "Many concurrent readers or one exclusive writer.",
    "A waiting writer blocks new readers (non-fair mode heuristic), avoiding writer starvation.",
    "Upgrade deadlocks: the write lock waits for all readers including yourself. Downgrade (write → read) is allowed."]);
  Q(MT, "Locks", "Medium", false, "J18", "What is StampedLock and how does an optimistic read work?", [
    "Lock with write, read and optimistic-read modes using long stamps.",
    "tryOptimisticRead returns a stamp without locking; copy fields; validate(stamp); on failure re-read under readLock.",
    "Not reentrant and no Conditions."]);
  Q(MT, "Locks", "Medium", true, "J18", "How does tryLock help prevent deadlocks?", [
    "Acquire the first lock, try the second with a timeout; if it fails release everything and retry after a random back-off.",
    "This removes hold-and-wait.",
    "Alternatively impose a global lock order."]);
  Q(MT, "Locks", "Medium", false, "J18", "What does lockInterruptibly do?", [
    "Waits for the lock but throws InterruptedException if the thread is interrupted while waiting.",
    "lock() and synchronized ignore interrupts while waiting.",
    "Lets cancellation and shutdownNow stop threads stuck waiting on a lock."]);
  Q(MT, "Locks", "Medium", false, "J18", "What is lock striping?", [
    "Splitting a structure's lock into N locks chosen by hash(key) so unrelated keys proceed in parallel.",
    "Used by Java 7 ConcurrentHashMap segments and Guava Striped.",
    "Bounded memory versus a lock per key."]);
  Q(MT, "Locks", "Hard", false, "J18", "Many threads in a dump are parked on the same ReentrantLock. How do you find and fix the cause?", [
    "Locate the owner via jstack's Locked ownable synchronizers; see what it does or whether the lock leaked (owner dead).",
    "Shorten critical sections (no I/O under lock), partition, or use concurrent structures/snapshots.",
    "Use timed tryLock to fail fast; JFR Thread Park events quantify contention."]);

  Q(MT, "Atomics", "Easy", true, "J19", "What is CAS (compare-and-swap)?", [
    "An atomic CPU instruction: set a memory location to a new value only if it still holds the expected value, and report success.",
    "Java exposes it via compareAndSet on atomic classes and VarHandles.",
    "Basis of optimistic, non-blocking algorithms: read, compute, CAS, retry."]);
  Q(MT, "Atomics", "Easy", true, "J19", "How does AtomicInteger make increments thread-safe?", [
    "incrementAndGet performs an atomic read-modify-write (CAS loop or fetch-and-add instruction).",
    "No lock is taken; failed CAS attempts retry.",
    "Reads and writes have volatile semantics."],
    { code: `AtomicInteger hits = new AtomicInteger();
hits.incrementAndGet();
hits.updateAndGet(v -> Math.min(v + 10, 100));
System.out.println(hits.get());` });
  Q(MT, "Atomics", "Medium", true, "J19", "AtomicLong vs LongAdder?", [
    "AtomicLong: single variable, exact value, CAS support; contention hurts at high thread counts.",
    "LongAdder: spreads updates over cells, scales under contention; sum() is not an atomic snapshot; no CAS.",
    "Metrics → LongAdder; IDs and conditional updates → AtomicLong."]);
  Q(MT, "Atomics", "Medium", true, "J19", "What is the ABA problem and how do you fix it?", [
    "A CAS succeeds because the value went A → B → A, hiding intermediate changes.",
    "Breaks lock-free structures that reuse nodes.",
    "AtomicStampedReference (version stamp) or AtomicMarkableReference; avoid reusing nodes."]);
  Q(MT, "Atomics", "Medium", true, "J19", "Is `if (count.get() > 0) count.decrementAndGet();` thread-safe?", [
    "No: each call is atomic but the check-then-act sequence isn't; two threads can both pass the check.",
    "Use a CAS loop or getAndUpdate(s -> s > 0 ? s - 1 : s).",
    "Same reasoning as putIfAbsent vs get-then-put on maps."]);
  Q(MT, "Atomics", "Medium", false, "J19", "Why must functions passed to updateAndGet/accumulateAndGet be side-effect free?", [
    "They're re-invoked whenever the CAS fails due to contention.",
    "Side effects (logging, I/O, other counters) would repeat unpredictably.",
    "Keep them pure and fast."]);
  Q(MT, "Atomics", "Medium", false, "J19", "How do you update multiple fields atomically without locks?", [
    "Hold an immutable object with all fields in an AtomicReference.",
    "Build the next object from the current one and compareAndSet (or updateAndGet).",
    "Readers see a consistent snapshot."]);
  Q(MT, "Atomics", "Medium", false, "J19", "Lock-free vs wait-free vs blocking?", [
    "Blocking: a lock holder can stall all others.",
    "Lock-free: some thread always makes progress (CAS loops, ConcurrentLinkedQueue).",
    "Wait-free: every thread completes in bounded steps (fetch-and-add)."]);
  Q(MT, "Atomics", "Hard", false, "J19", "What is a VarHandle and what memory modes does it offer?", [
    "Java 9 typed reference to a field or array element supporting atomic ops (compareAndSet, getAndAdd).",
    "Modes: plain, opaque, acquire/release, volatile, from weakest to strongest ordering.",
    "Used to avoid per-object Atomic wrappers and in JDK/library internals; replaces sun.misc.Unsafe usage."]);
  Q(MT, "Atomics", "Hard", false, "J19", "Why can a heavily contended AtomicLong burn CPU and how do you fix it?", [
    "All threads CAS one cache line; failures retry and the line bounces between cores.",
    "Use LongAdder, per-thread counters, batching or partitioning.",
    "Measure with a profiler/JMH before and after."]);

  Q(MT, "Coordination", "Easy", true, "J20", "Explain wait(), notify() and notifyAll().", [
    "Object methods callable only while holding that object's monitor (else IllegalMonitorStateException).",
    "wait releases the monitor and parks in the wait set; returns after notify, timeout, interrupt or spurious wake-up, once it re-acquires the monitor.",
    "notify wakes one arbitrary waiter, notifyAll wakes all."]);
  Q(MT, "Coordination", "Easy", true, "J20", "sleep() vs wait()?", [
    "sleep (Thread, static) keeps locks; wait (Object) releases that monitor.",
    "wait requires holding the monitor; sleep doesn't.",
    "wait is woken by notify/notifyAll; sleep only by timeout or interrupt."]);
  Q(MT, "Coordination", "Medium", true, "J20", "Why call wait() in a while loop rather than an if?", [
    "Spurious wake-ups are allowed.",
    "notifyAll wakes several waiters but only one may proceed; barging threads can consume the state first.",
    "Re-checking the condition after every wake-up is the only safe pattern."],
    { code: `Object lock = new Object();
Deque<String> queue = new ArrayDeque<>();
Thread.ofPlatform().start(() -> { synchronized (lock) { queue.add("job"); lock.notifyAll(); } });
synchronized (lock) {
    while (queue.isEmpty()) lock.wait();   // re-check after every wake-up
    System.out.println("got " + queue.poll());
}` });
  Q(MT, "Coordination", "Medium", true, "J20", "notify() vs notifyAll(): when can notify deadlock?", [
    "notify wakes one arbitrary waiter; with producers and consumers on one monitor it can wake the wrong kind.",
    "That thread re-waits, the signal is lost, and eventually all threads wait.",
    "Use notifyAll, or Conditions per predicate with signal()."]);
  Q(MT, "Coordination", "Medium", true, "J20", "What is a Condition and how is it better than wait/notify?", [
    "A wait set tied to a Lock (lock.newCondition()); await/signal/signalAll.",
    "Multiple conditions per lock (notFull, notEmpty) so signals target the right waiters.",
    "Timed (awaitNanos), uninterruptible and fair-lock variants; still await in a while loop."]);
  Q(MT, "Coordination", "Medium", false, "J20", "What is a lost wake-up / missed signal?", [
    "A notify sent when no one waits is discarded.",
    "A thread that checks state without the lock or waits without checking state can then wait forever.",
    "Check and modify state under the same lock and wait on state in a loop."]);
  Q(MT, "Coordination", "Medium", false, "J20", "What are LockSupport.park and unpark?", [
    "Low-level primitives behind j.u.c.: each thread has one permit.",
    "unpark makes the permit available (non-cumulative), park consumes it or blocks.",
    "unpark before park is remembered, avoiding lost wake-ups."]);
  Q(MT, "Coordination", "Medium", true, "J20", "Implement a producer-consumer with wait/notify.", [
    "Shared buffer with capacity; synchronized put/take on the same monitor.",
    "put: while full wait; add; notifyAll. take: while empty wait; remove; notifyAll.",
    "In production use a BlockingQueue."]);
  Q(MT, "Coordination", "Hard", false, "J20", "How do you implement a timed wait correctly?", [
    "Compute a deadline once; loop while the condition is false.",
    "Wait for the remaining time each iteration (awaitNanos returns it); return false when it reaches zero.",
    "Propagate InterruptedException or restore the interrupt flag."]);
  Q(MT, "Coordination", "Hard", false, "J20", "A worker never stops at shutdown and is stuck in Object.wait. What could be wrong?", [
    "Its wait condition ignores the stop flag, or the flag is set without notifyAll / outside the lock.",
    "Or interrupts are swallowed in the loop.",
    "Include the flag in the condition, notifyAll under the lock, honour interrupts, or use BlockingQueue with poison pill/poll timeout."]);

  Q(MT, "Synchronizers", "Easy", true, "J21", "CountDownLatch vs CyclicBarrier?", [
    "Latch: wait until a count of events reaches zero; countDown never blocks; one-shot.",
    "Barrier: N parties wait for each other; released together; resets each round; optional barrier action.",
    "A failed party breaks a barrier (BrokenBarrierException); a missing countDown hangs latch waiters."]);
  Q(MT, "Synchronizers", "Easy", true, "J21", "What is a Semaphore used for?", [
    "Holds N permits; acquire takes one (blocking), release returns one.",
    "Limits concurrent access: bulkheads, resource pools, throttling expensive work.",
    "No ownership: any thread may release; keep acquire/release symmetric in try/finally."],
    { code: `Semaphore permits = new Semaphore(3);
permits.acquire();
try { System.out.println("calling partner API, permits left " + permits.availablePermits()); }
finally { permits.release(); }` });
  Q(MT, "Synchronizers", "Medium", true, "J21", "How do you wait for N worker threads to finish?", [
    "CountDownLatch(N) with countDown in finally and await(timeout).",
    "Or join each thread, or better ExecutorService.invokeAll / CompletableFuture.allOf which also return results and exceptions.",
    "Structured concurrency (Java 21 preview) for scoped subtasks."]);
  Q(MT, "Synchronizers", "Medium", false, "J21", "What is a Phaser?", [
    "A reusable barrier with dynamic registration/deregistration and numbered phases.",
    "arriveAndAwaitAdvance, arrive, arriveAndDeregister, awaitAdvance; onAdvance hook can terminate.",
    "Can be tiered for many parties."]);
  Q(MT, "Synchronizers", "Medium", false, "J21", "What happens if a thread waiting at a CyclicBarrier is interrupted or times out?", [
    "The barrier becomes broken.",
    "All other waiting parties (and later await calls) get BrokenBarrierException.",
    "Call reset() to reuse it; handle the exception to stop the round cleanly."]);
  Q(MT, "Synchronizers", "Medium", false, "J21", "What is an Exchanger?", [
    "A rendezvous point where two threads swap objects.",
    "Each exchange(x) blocks until the partner arrives.",
    "Used for double buffering between a producer and a consumer."]);
  Q(MT, "Synchronizers", "Medium", true, "J21", "Is a Semaphore a rate limiter?", [
    "No: it limits concurrency, not operations per time unit.",
    "Throughput depends on call duration.",
    "Use a token bucket (Guava RateLimiter, Bucket4j, Resilience4j) for rates."]);
  Q(MT, "Synchronizers", "Medium", false, "J21", "Why can a CyclicBarrier deadlock on a thread pool?", [
    "All parties must run concurrently to meet.",
    "If the pool has fewer threads than parties, the queued parties never start and the running ones wait forever.",
    "Size the pool ≥ parties or use timeouts."]);
  Q(MT, "Synchronizers", "Hard", false, "J21", "What is AbstractQueuedSynchronizer (AQS)?", [
    "Framework behind ReentrantLock, RW locks, Semaphore, CountDownLatch: an int state updated by CAS plus a FIFO queue of parked threads.",
    "Subclasses implement tryAcquire/tryRelease (exclusive) or tryAcquireShared/tryReleaseShared (shared).",
    "AQS handles queueing, parking, timeouts, interruption and fairness."]);
  Q(MT, "Synchronizers", "Hard", false, "J21", "A batch job hangs in CountDownLatch.await with no workers alive. Why?", [
    "A worker exited without countDown (exception before it, rejected task, early return).",
    "Fix with countDown in finally, await with timeout, and log task failures.",
    "Prefer invokeAll/CompletableFuture to propagate failures."]);

  Q(MT, "CompletableFuture", "Easy", true, "J22", "Future vs CompletableFuture?", [
    "Future only offers blocking get(), isDone and cancel.",
    "CompletableFuture adds callbacks, composition (thenCompose), combination (thenCombine/allOf/anyOf), error handling, timeouts and manual completion.",
    "Enables non-blocking pipelines; block only at the edge."]);
  Q(MT, "CompletableFuture", "Easy", true, "J22", "thenApply vs thenCompose?", [
    "thenApply maps the result with a synchronous function (map).",
    "thenCompose chains a function that returns another CompletableFuture and flattens it (flatMap).",
    "Using thenApply for async functions gives nested futures."],
    { code: `CompletableFuture<Integer> points = CompletableFuture.supplyAsync(() -> "u42")
    .thenCompose(user -> CompletableFuture.supplyAsync(() -> user.length() * 100));
System.out.println(points.join());` });
  Q(MT, "CompletableFuture", "Medium", true, "J22", "How do you run several async calls in parallel and combine the results?", [
    "Start them all first (supplyAsync with an executor).",
    "thenCombine for two; allOf(...).thenApply(v -> futures.stream().map(CompletableFuture::join).toList()) for many.",
    "anyOf for the first to complete."]);
  Q(MT, "CompletableFuture", "Medium", true, "J22", "How do you handle exceptions with CompletableFuture?", [
    "exceptionally (failure only), handle (both outcomes), whenComplete (observe), exceptionallyCompose (async fallback).",
    "Dependent stages are skipped after a failure.",
    "Exceptions from upstream stages arrive wrapped in CompletionException: use getCause()."]);
  Q(MT, "CompletableFuture", "Medium", true, "J22", "Which thread pool does supplyAsync use by default and why does it matter?", [
    "ForkJoinPool.commonPool(), cores − 1 threads, shared JVM-wide.",
    "Blocking I/O there starves parallel streams and other async code.",
    "Pass a dedicated executor (or virtual threads) for I/O."]);
  Q(MT, "CompletableFuture", "Medium", false, "J22", "thenApply vs thenApplyAsync?", [
    "thenApply runs on the thread completing the previous stage, or the caller if already complete.",
    "thenApplyAsync submits the function to an executor (common pool by default).",
    "Use Async with an explicit executor for slow callbacks or thread control."]);
  Q(MT, "CompletableFuture", "Medium", false, "J22", "join() vs get()?", [
    "Both block.",
    "join throws unchecked CompletionException/CancellationException.",
    "get throws checked ExecutionException and InterruptedException; get(timeout) adds TimeoutException."]);
  Q(MT, "CompletableFuture", "Medium", false, "J22", "How do you add timeouts to a CompletableFuture?", [
    "orTimeout(t, unit) completes exceptionally with TimeoutException.",
    "completeOnTimeout(value, t, unit) completes with a default.",
    "Neither stops the underlying task; cancel(true) doesn't interrupt either; set I/O timeouts too."]);
  Q(MT, "CompletableFuture", "Hard", false, "J22", "Why can joining futures inside a task on a bounded pool deadlock?", [
    "Outer tasks occupy all threads and block waiting for inner tasks queued on the same pool.",
    "Inner tasks never get a thread: thread-starvation deadlock.",
    "Compose with allOf/thenCompose without blocking, use separate pools, or virtual threads."]);
  Q(MT, "CompletableFuture", "Hard", false, "J22", "Design a fan-out over N providers with partial results.", [
    "One future per provider on an I/O executor, each with completeOnTimeout and exceptionally fallbacks so it always completes normally.",
    "allOf, collect, filter unavailable.",
    "HTTP timeouts, metrics per provider, cached fallbacks."]);

  Q(MT, "Parallelism", "Easy", true, "J23", "Concurrency vs parallelism?", [
    "Concurrency: structuring many tasks in progress at once (interleaved), common for I/O-bound servers.",
    "Parallelism: executing parts of one computation simultaneously on multiple cores for speed.",
    "Concurrent programs may run on one core; parallelism needs multiple."]);
  Q(MT, "Parallelism", "Medium", true, "J23", "What is the Fork/Join framework and work stealing?", [
    "ForkJoinPool + RecursiveTask/RecursiveAction for divide and conquer: split, fork, compute, join.",
    "Each worker has a deque: owner works LIFO, idle workers steal FIFO from others.",
    "Balances uneven work with low contention; backs parallel streams."],
    { code: `class Sum extends RecursiveTask<Long> {
    final long[] a; final int lo, hi;
    Sum(long[] a, int lo, int hi) { this.a = a; this.lo = lo; this.hi = hi; }
    protected Long compute() {
        if (hi - lo <= 10_000) { long s = 0; for (int i = lo; i < hi; i++) s += a[i]; return s; }
        int mid = (lo + hi) >>> 1; Sum left = new Sum(a, lo, mid); left.fork();
        return new Sum(a, mid, hi).compute() + left.join();
    }
}
long[] data = LongStream.range(0, 1_000_000).toArray();
System.out.println(ForkJoinPool.commonPool().invoke(new Sum(data, 0, data.length)));` });
  Q(MT, "Parallelism", "Easy", true, "J23", "When do parallel streams help or hurt?", [
    "Help: large data, CPU-heavy per-element work, splittable sources, stateless ops, cheap merges.",
    "Hurt: small data, LinkedList/iterate sources, ordering constraints, boxing, shared state, blocking I/O.",
    "Measure with JMH."]);
  Q(MT, "Parallelism", "Medium", true, "J23", "Which thread pool do parallel streams use?", [
    "The common ForkJoinPool (parallelism cores − 1) plus the calling thread.",
    "Shared with CompletableFuture default async methods and other libraries.",
    "Configure with -Djava.util.concurrent.ForkJoinPool.common.parallelism or submit the stream to a custom pool."]);
  Q(MT, "Parallelism", "Medium", true, "J23", "What is Amdahl's law?", [
    "Speedup = 1 / (s + (1 − s)/N) for serial fraction s on N cores.",
    "Maximum speedup is 1/s regardless of cores.",
    "Focus on shrinking serial bottlenecks; Gustafson's law covers scaling problem size."]);
  Q(MT, "Parallelism", "Medium", false, "J23", "How do you choose the threshold in a RecursiveTask?", [
    "Leaves big enough that task overhead is small (≈10–100 µs of work).",
    "Small enough to create several times more tasks than cores for load balancing.",
    "Measure; too small multiplies overhead, too large leaves cores idle."]);
  Q(MT, "Parallelism", "Medium", false, "J23", "What are correctness pitfalls of parallel streams?", [
    "Side effects on shared non-thread-safe collections lose data or throw.",
    "reduce needs an associative operation and a real identity.",
    "Order-dependent logic and stateful lambdas give nondeterministic results."]);
  Q(MT, "Parallelism", "Medium", false, "J23", "Why is benchmarking Java code with System.nanoTime unreliable?", [
    "JIT warm-up and OSR, dead-code elimination, constant folding, GC and noise.",
    "Order effects when comparing variants in one JVM.",
    "Use JMH: forks, warm-ups, iterations, Blackhole, statistics."]);
  Q(MT, "Parallelism", "Hard", false, "J23", "Why are parallel streams risky in a web service request path?", [
    "All requests share the small common pool; concurrent requests compete and add latency variance.",
    "Blocking calls inside starve the pool for the whole JVM.",
    "Use dedicated executors or virtual threads for I/O fan-out."]);
  Q(MT, "Parallelism", "Hard", false, "J23", "What does a JMH benchmark need to be trustworthy?", [
    "Warm-up and measurement iterations, multiple forks, realistic @Param sizes.",
    "Consume results (return or Blackhole) to avoid dead-code elimination; @State setup outside measurement.",
    "Stable hardware, error margins reported, and profilers to explain results."]);

  Q(MT, "ThreadLocal", "Easy", true, "J24", "What is ThreadLocal and what are its typical uses?", [
    "A variable whose value is separate for each thread; get/set/remove act on the current thread's copy.",
    "Uses: per-thread instances of non-thread-safe objects, and implicit request context (trace id/MDC, security principal, tenant, transaction resources).",
    "Trade-offs: hidden dependencies, mandatory cleanup on pooled threads, doesn't cross threads."],
    { code: `ThreadLocal<Integer> counter = ThreadLocal.withInitial(() -> 0);
Runnable work = () -> { for (int i = 0; i < 3; i++) counter.set(counter.get() + 1); System.out.println(Thread.currentThread().getName() + " " + counter.get()); };
Thread a = new Thread(work, "t1"), b = new Thread(work, "t2");
a.start(); b.start(); a.join(); b.join();
System.out.println("main " + counter.get());` });
  Q(MT, "ThreadLocal", "Medium", true, "J24", "How is ThreadLocal implemented internally?", [
    "Each Thread has a ThreadLocalMap; the ThreadLocal object is the key, held by a WeakReference.",
    "Values are strongly referenced and live until remove(), overwrite, stale-entry cleanup, or thread death.",
    "So the lookup is per-thread and needs no locking."]);
  Q(MT, "ThreadLocal", "Medium", true, "J24", "How can ThreadLocal cause memory leaks?", [
    "Pool threads live for the whole app; values not removed stay reachable forever.",
    "Weak keys don't help values: a lost ThreadLocal leaves a stale value until cleanup.",
    "In app servers, leftover values pin the undeployed app's class loader (Metaspace leak).",
    "Fix: static final ThreadLocals, remove() in finally, small values."]);
  Q(MT, "ThreadLocal", "Easy", true, "J24", "Why must ThreadLocal be cleared in a thread pool, and how?", [
    "Threads are reused; the next task on that thread sees the previous value (wrong user/tenant).",
    "Pattern: set at the boundary, try { work } finally { remove() }."],
    { code: `ThreadLocal<String> user = new ThreadLocal<>();
ExecutorService pool = Executors.newSingleThreadExecutor();
pool.submit(() -> { user.set("alice"); try { System.out.println("as " + user.get()); } finally { user.remove(); } }).get();
pool.submit(() -> System.out.println("next task sees " + user.get())).get();
pool.shutdown();` });
  Q(MT, "ThreadLocal", "Medium", false, "J24", "ThreadLocal vs InheritableThreadLocal?", [
    "InheritableThreadLocal copies the parent's value to a child thread when the child is created.",
    "With pools threads are created once, so tasks see stale snapshots; use explicit capture/restore instead.",
    "Override childValue to copy mutable values."]);
  Q(MT, "ThreadLocal", "Medium", true, "J24", "How do you propagate ThreadLocal context (MDC, security) to async tasks?", [
    "Capture the value when the task is submitted; set it in a wrapper before run and restore/clear in finally.",
    "Decorate the executor once (Spring TaskDecorator, DelegatingSecurityContextExecutor, Micrometer context-propagation).",
    "Pass that executor to every CompletableFuture async stage."],
    { code: `ThreadLocal<String> trace = new ThreadLocal<>();
ExecutorService pool = Executors.newFixedThreadPool(2);
trace.set("t-42");
String captured = trace.get();
Future<String> f = pool.submit(() -> { trace.set(captured); try { return "worker sees " + trace.get(); } finally { trace.remove(); } });
System.out.println(f.get());
pool.shutdown();` });
  Q(MT, "ThreadLocal", "Hard", false, "J24", "Why does @Transactional or SecurityContext not apply inside CompletableFuture.supplyAsync?", [
    "Spring keeps the transaction's connection and the security context in ThreadLocals of the calling thread.",
    "The async task runs on a pool thread without those bindings: no transaction (or a new one), no authentication.",
    "Keep transactional work on the calling thread or make the async task its own transactional bean call; propagate security with a delegating executor."]);
  Q(MT, "ThreadLocal", "Medium", false, "J24", "Why use ThreadLocalRandom instead of a shared Random?", [
    "Random updates a shared seed with CAS; under contention threads retry and slow down.",
    "ThreadLocalRandom.current() keeps state per thread: no contention.",
    "Use SecureRandom for security tokens."],
    { code: `int[] hits = new int[1];
IntStream.range(0, 4).parallel().forEach(i -> { int r = ThreadLocalRandom.current().nextInt(10, 20); if (r >= 10 && r < 20) synchronized (hits) { hits[0]++; } });
System.out.println("in range: " + hits[0]);` });
  Q(MT, "ThreadLocal", "Hard", true, "J24", "What changes for ThreadLocal with virtual threads?", [
    "They work, but virtual threads are usually one per task and never pooled.",
    "ThreadLocal caches of expensive objects are rebuilt per task; per-thread memory multiplies with millions of threads.",
    "Keep values small, avoid caches, and prefer scoped values for context."]);
  Q(MT, "ThreadLocal", "Hard", false, "J24", "What are scoped values (ScopedValue) and how do they compare with ThreadLocal?", [
    "Bound with ScopedValue.where(KEY, v).run(...); readable via KEY.get() by code called within that run.",
    "Immutable (no set), can be rebound in a nested scope, binding ends automatically: no leaks or cleanup.",
    "Cheap and inherited by StructuredTaskScope subtasks; preview in Java 21, final in Java 25.",
    "ThreadLocal remains for mutable per-thread state."]);

  Q(MT, "Virtual threads", "Easy", true, "J25", "What are virtual threads?", [
    "Lightweight java.lang.Thread instances scheduled by the JVM (Java 21, JEP 444).",
    "Stacks live on the heap; creation is cheap; millions can exist.",
    "They run mounted on carrier platform threads and unmount when they block, so blocking code scales."],
    { code: `try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
    Future<Boolean> f = ex.submit(() -> Thread.currentThread().isVirtual());
    System.out.println("virtual: " + f.get());
}` });
  Q(MT, "Virtual threads", "Medium", true, "J25", "How do virtual threads work under the hood (carriers, mount/unmount)?", [
    "A ForkJoinPool of carrier platform threads (one per core by default) runs them.",
    "On a blocking JDK call the virtual thread's frames are moved to the heap and it unmounts; the carrier runs another virtual thread.",
    "When the operation completes, it is rescheduled on any free carrier."]);
  Q(MT, "Virtual threads", "Easy", true, "J25", "When should you use virtual threads, and when not?", [
    "Use for I/O-bound, high-concurrency work: thread-per-request servers, fan-out to services.",
    "No gain for CPU-bound work (cores are the limit) or short in-memory tasks.",
    "They improve throughput, not per-request latency."]);
  Q(MT, "Virtual threads", "Medium", true, "J25", "What is pinning and how do you avoid it?", [
    "On Java 21 a virtual thread blocking inside synchronized or native code can't unmount and holds its carrier.",
    "Detect with -Djdk.tracePinnedThreads=full or the JFR event jdk.VirtualThreadPinned.",
    "Fix: ReentrantLock around blocking work, no I/O in critical sections, or Java 24+ (JEP 491) where synchronized no longer pins."],
    { code: `ReentrantLock lock = new ReentrantLock();
try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 3; i++) ex.submit(() -> { lock.lock(); try { Thread.sleep(10); } finally { lock.unlock(); } return null; });
}
System.out.println("ReentrantLock lets waiting virtual threads unmount");` });
  Q(MT, "Virtual threads", "Medium", true, "J25", "Should virtual threads be pooled? How do you limit concurrency?", [
    "No: they are cheap and meant to be one per task; pooling caps concurrency and brings back ThreadLocal reuse issues.",
    "Limit the resource instead: Semaphore bulkheads, connection pool sizes, rate limiters."],
    { code: `Semaphore permits = new Semaphore(5);
AtomicInteger now = new AtomicInteger(), peak = new AtomicInteger();
try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 200; i++) ex.submit(() -> { permits.acquire(); try { peak.accumulateAndGet(now.incrementAndGet(), Math::max); Thread.sleep(2); } finally { now.decrementAndGet(); permits.release(); } return null; });
}
System.out.println("peak " + peak.get());` });
  Q(MT, "Virtual threads", "Medium", false, "J25", "How many ways can you create a virtual thread?", [
    "Thread.startVirtualThread(r); Thread.ofVirtual().name(...).start(r) or unstarted(r).",
    "Thread.ofVirtual().factory() for ThreadFactory-based APIs.",
    "Executors.newVirtualThreadPerTaskExecutor() (or newThreadPerTaskExecutor(factory))."]);
  Q(MT, "Virtual threads", "Hard", false, "J25", "What can go wrong when migrating a service to virtual threads?", [
    "Downstream overload once the pool's implicit limit is gone (DB, APIs).",
    "Pinning on Java 21; ThreadLocal caches rebuilt per task and higher memory.",
    "CPU-heavy tasks occupying carriers; jstack not showing virtual threads (use jcmd Thread.dump_to_file).",
    "Mitigate with explicit limits, profiling with JFR, separate CPU pools, load tests."]);
  Q(MT, "Virtual threads", "Hard", true, "J25", "What is structured concurrency (StructuredTaskScope)?", [
    "Preview API (Java 21, JEP 453) that forks subtasks inside a scope and joins them before the scope exits.",
    "ShutdownOnFailure cancels siblings on the first failure; ShutdownOnSuccess keeps the first result and cancels the rest; joinUntil adds deadlines.",
    "No orphaned tasks, cancellation propagates, thread dumps show the hierarchy; Java 25 reshaped it as StructuredTaskScope.open() with Joiners (still preview)."]);
  Q(MT, "Virtual threads", "Medium", false, "J25", "Virtual threads vs reactive programming?", [
    "Both handle massive I/O concurrency without an OS thread per waiting request.",
    "Virtual threads keep blocking, imperative code with normal stack traces and JDBC.",
    "Reactive requires non-blocking libraries end to end but offers streaming and backpressure."]);
  Q(MT, "Virtual threads", "Easy", false, "J25", "How do you enable virtual threads in Spring Boot?", [
    "Spring Boot 3.2+ on Java 21: spring.threads.virtual.enabled=true.",
    "Tomcat/Jetty requests, @Async, @Scheduled and messaging listeners then run on virtual threads.",
    "Still size the connection pool and other downstream limits explicitly."]);

  Q(MT, "Liveness", "Easy", true, "J26", "What is a deadlock? Write one.", [
    "Threads each hold a resource and wait for one held by another, in a cycle; none can proceed.",
    "Classic: T1 locks A then B, T2 locks B then A."],
    { code: `Object a = new Object(), b = new Object();
CountDownLatch go = new CountDownLatch(2);
Thread t1 = new Thread(() -> { synchronized (a) { go.countDown(); try { go.await(); } catch (InterruptedException e) { return; } synchronized (b) { } } });
Thread t2 = new Thread(() -> { synchronized (b) { go.countDown(); try { go.await(); } catch (InterruptedException e) { return; } synchronized (a) { } } });
t1.setDaemon(true); t2.setDaemon(true); t1.start(); t2.start(); t1.join(300);
System.out.println(t1.getState() + " " + t2.getState());` });
  Q(MT, "Liveness", "Easy", true, "J26", "What are the four necessary conditions for deadlock?", [
    "Mutual exclusion, hold and wait, no preemption, circular wait (Coffman).",
    "Remove any one to prevent deadlock; usually circular wait (lock ordering) or hold-and-wait (tryLock/timeouts)."]);
  Q(MT, "Liveness", "Medium", true, "J26", "How do you prevent deadlocks in Java code?", [
    "Avoid multiple locks (immutability, concurrent collections, confinement).",
    "Global lock ordering, e.g. lock the account with the lower id first.",
    "tryLock with timeout, release and retry with jittered back-off.",
    "Short critical sections, no alien calls or I/O under locks, don't block on your own pool, timeouts everywhere."],
    { code: `record Acct(int id) { }
Acct a = new Acct(2), b = new Acct(1);
Acct first = a.id() < b.id() ? a : b, second = first == a ? b : a;
synchronized (first) { synchronized (second) { System.out.println("locked " + first.id() + " then " + second.id()); } }` });
  Q(MT, "Liveness", "Medium", true, "J26", "How do you detect a deadlock in a running application?", [
    "Thread dump via jstack <pid>, jcmd <pid> Thread.print or kill -3; look for \"Found one Java-level deadlock\".",
    "ThreadMXBean.findDeadlockedThreads() programmatically (monitors and ReentrantLocks).",
    "Take several dumps seconds apart; JMC/VisualVM also flag deadlocks."],
    { code: `java.lang.management.ThreadMXBean mx = java.lang.management.ManagementFactory.getThreadMXBean();
long[] ids = mx.findDeadlockedThreads();
System.out.println(ids == null ? "no deadlocked threads" : ids.length + " deadlocked threads");` });
  Q(MT, "Liveness", "Medium", true, "J26", "Deadlock vs livelock vs starvation?", [
    "Deadlock: blocked in a cycle, CPU idle.",
    "Livelock: threads actively respond to each other (retries) without progress, CPU busy.",
    "Starvation: a thread never obtains a resource others keep getting (unfair locks, priorities, greedy readers)."]);
  Q(MT, "Liveness", "Medium", false, "J26", "How does tryLock help avoid deadlock, and what's the risk?", [
    "If the second lock isn't acquired within a timeout, release the first and retry: hold-and-wait is broken.",
    "Risk: livelock if retries are synchronised; use random exponential back-off and a retry limit."],
    { code: `ReentrantLock a = new ReentrantLock(), b = new ReentrantLock();
boolean done = false;
a.lock();
try { if (b.tryLock(10, TimeUnit.MILLISECONDS)) { try { done = true; } finally { b.unlock(); } } } finally { a.unlock(); }
System.out.println("acquired both: " + done);` });
  Q(MT, "Liveness", "Hard", false, "J26", "What is a thread-pool starvation deadlock?", [
    "A task in a bounded pool waits (get/join) for a subtask submitted to the same pool.",
    "With all workers waiting, the subtasks never run.",
    "Fix: composition (thenCompose), separate pools, ForkJoin work stealing, virtual threads, timeouts."],
    { code: `ExecutorService pool = Executors.newSingleThreadExecutor();
Future<String> f = pool.submit(() -> { Future<String> in = pool.submit(() -> "x"); try { return in.get(100, TimeUnit.MILLISECONDS); } catch (TimeoutException e) { return "stuck"; } });
System.out.println(f.get()); pool.shutdownNow();` });
  Q(MT, "Liveness", "Medium", false, "J26", "Why avoid calling alien methods while holding a lock?", [
    "Listeners, callbacks or other modules' methods may take locks in another order or block.",
    "That creates hidden lock-order cycles and long hold times.",
    "Use open calls: update state under the lock, copy, release, then call out."]);
  Q(MT, "Liveness", "Hard", true, "J26", "A Java service is hanging in production. How do you troubleshoot?", [
    "Before restarting, capture 2–3 thread dumps seconds apart, CPU per thread, pool/connection metrics.",
    "Low CPU: look for deadlock section, many BLOCKED on one monitor, WAITING on futures/pools/connections.",
    "High CPU: top -H, match hex TID to nid in dump; spinning, livelock or GC.",
    "Fix the root cause and add timeouts and deadlock health checks."]);
  Q(MT, "Liveness", "Medium", false, "J26", "What is lock fairness and when would you use a fair lock?", [
    "A fair ReentrantLock/Semaphore grants access roughly in arrival order; unfair allows barging.",
    "Fair reduces starvation and tail latency for waiters but lowers throughput significantly.",
    "Use when starvation is observed or ordering matters; otherwise shorten critical sections."]);

  Q(MT, "Classic problems", "Easy", true, "J27", "Implement producer–consumer in Java.", [
    "Simplest: a bounded ArrayBlockingQueue; producers put (blocks when full), consumers take (blocks when empty).",
    "Shut down with one poison pill per consumer, or interrupt.",
    "From scratch: synchronized + wait/notifyAll, or Lock + notFull/notEmpty Conditions."],
    { code: `BlockingQueue<Integer> q = new ArrayBlockingQueue<>(2);
Thread p = new Thread(() -> { try { for (int i = 1; i <= 5; i++) q.put(i); q.put(-1); } catch (InterruptedException e) { } });
StringBuilder sb = new StringBuilder();
Thread c = new Thread(() -> { try { for (int v; (v = q.take()) != -1; ) sb.append(v).append(' '); } catch (InterruptedException e) { } });
p.start(); c.start(); p.join(); c.join();
System.out.println(sb.toString().trim());` });
  Q(MT, "Classic problems", "Medium", true, "J27", "Implement a bounded blocking queue from scratch.", [
    "One ReentrantLock, two Conditions: notFull and notEmpty.",
    "put: while full await notFull; enqueue; signal notEmpty. take: while empty await notEmpty; dequeue; signal notFull.",
    "Unlock in finally; while loops for spurious wake-ups; optional timed offer/poll with awaitNanos."],
    { code: `class BQ<T> {
    private final Deque<T> d = new ArrayDeque<>(); private final int cap;
    private final ReentrantLock lock = new ReentrantLock(); private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();
    BQ(int cap) { this.cap = cap; }
    void put(T x) throws InterruptedException { lock.lock(); try { while (d.size() == cap) notFull.await(); d.addLast(x); notEmpty.signal(); } finally { lock.unlock(); } }
    T take() throws InterruptedException { lock.lock(); try { while (d.isEmpty()) notEmpty.await(); T x = d.removeFirst(); notFull.signal(); return x; } finally { lock.unlock(); } }
}
BQ<String> q = new BQ<>(1);
Thread prod = new Thread(() -> { try { q.put("x"); q.put("y"); } catch (InterruptedException e) { } });
prod.start();
System.out.println(q.take() + q.take());
prod.join();` });
  Q(MT, "Classic problems", "Easy", true, "J27", "Print odd and even numbers alternately using two threads.", [
    "Shared counter guarded by a lock; each thread waits while the counter's parity isn't its own.",
    "Print, increment, notifyAll; check the upper bound in the wait loop so both threads exit.",
    "Alternative: two semaphores passing a permit back and forth."],
    { code: `Semaphore odd = new Semaphore(1), even = new Semaphore(0);
StringBuffer out = new StringBuffer();
Thread a = new Thread(() -> { for (int i = 1; i <= 5; i += 2) { odd.acquireUninterruptibly(); out.append(i); even.release(); } });
Thread b = new Thread(() -> { for (int i = 2; i <= 6; i += 2) { even.acquireUninterruptibly(); out.append(i); odd.release(); } });
a.start(); b.start(); a.join(); b.join();
System.out.println(out);` });
  Q(MT, "Classic problems", "Medium", true, "J27", "Print ABC in sequence using three threads.", [
    "Semaphore per thread, only A's starts with a permit; each acquires its own, prints, releases the next.",
    "Or one Lock with a Condition per thread and a turn variable, signalling only the next thread.",
    "Or synchronized with a turn counter and notifyAll."]);
  Q(MT, "Classic problems", "Medium", true, "J27", "What is the dining philosophers problem and how do you solve it?", [
    "N philosophers share N forks; each needs both neighbours' forks. All taking the left first can deadlock.",
    "Fixes: resource ordering (lower-numbered fork first), a waiter Semaphore(N-1), tryLock with release and back-off.",
    "Watch for starvation too."]);
  Q(MT, "Classic problems", "Easy", true, "J27", "Why use while instead of if around wait()? Why notifyAll?", [
    "Spurious wake-ups and competing threads mean the condition may be false after waking; re-check in a loop.",
    "When threads waiting for different conditions share one monitor, notify may wake the wrong one; notifyAll (or separate Conditions) avoids stalls."]);
  Q(MT, "Classic problems", "Medium", false, "J27", "Implement a thread-safe singleton.", [
    "Holder idiom: lazy and thread-safe via class initialisation, no locking on access.",
    "Enum singleton: simplest, serialization-safe.",
    "Double-checked locking requires a volatile field."],
    { code: `class Holder { private Holder() { } private static class I { static final Holder X = new Holder(); } static Holder get() { return I.X; } }
Set<Holder> seen = ConcurrentHashMap.newKeySet();
try (ExecutorService pool = Executors.newFixedThreadPool(8)) { for (int i = 0; i < 100; i++) pool.submit(() -> seen.add(Holder.get())); }
System.out.println("distinct instances " + seen.size());` });
  Q(MT, "Classic problems", "Hard", false, "J27", "Implement multithreaded FizzBuzz with four threads.", [
    "Shared current number under one monitor.",
    "Each thread waits while the number isn't its kind (fizz, buzz, fizzbuzz, number) and the end isn't reached.",
    "Acts, increments, notifyAll; all exit once cur > n."]);
  Q(MT, "Classic problems", "Hard", true, "J27", "Implement a thread-safe rate limiter.", [
    "Token bucket: tokens refill at rate r up to capacity; a request consumes one token or is rejected.",
    "synchronized tryAcquire computing refill from System.nanoTime(); lock-free version with CAS on an immutable state.",
    "Per-client buckets in a ConcurrentHashMap; distributed limits in Redis."],
    { code: `class Bucket { final long cap; double tokens; long last = System.nanoTime(); final double perNano;
    Bucket(long cap, double perSec) { this.cap = cap; tokens = cap; perNano = perSec / 1e9; }
    synchronized boolean tryAcquire() { long now = System.nanoTime(); tokens = Math.min(cap, tokens + (now - last) * perNano); last = now; if (tokens >= 1) { tokens--; return true; } return false; } }
Bucket b = new Bucket(3, 1);
int ok = 0; for (int i = 0; i < 10; i++) if (b.tryAcquire()) ok++;
System.out.println("allowed " + ok + " of 10");` });
  Q(MT, "Classic problems", "Medium", false, "J27", "How do you test concurrent code?", [
    "Stress with many threads and iterations, released together by a CountDownLatch start gate.",
    "Assert invariants (totals, no duplicates, ordering) and use timeouts so deadlocks fail tests.",
    "Vary capacities/thread counts; use jcstress for memory-model questions; thread dumps on hang."]);

  var SP = "Spring core";
  Q(SP, "IoC & DI", "Easy", true, "S01", "What are IoC and dependency injection in Spring?", [
    "IoC: the container, not your code, creates objects and supplies their dependencies.",
    "DI: dependencies are passed in through constructors, setters or fields.",
    "The ApplicationContext reads configuration, creates and wires beans, manages scopes and lifecycle, and applies proxies.",
    "Benefits: loose coupling, testability, central configuration."]);
  Q(SP, "IoC & DI", "Easy", true, "S01", "Constructor vs setter vs field injection: which do you prefer and why?", [
    "Constructor injection: explicit required dependencies, final fields, always valid objects, easy unit tests; preferred.",
    "Setter: optional dependencies. Field: concise but hides dependencies and hampers testing."],
    { code: `@Component class Repo { String find() { return "row"; } }
@Component class Service { private final Repo repo; Service(Repo repo) { this.repo = repo; } String get() { return repo.find(); } }
@Configuration @ComponentScan class Cfg { }
try (var ctx = new AnnotationConfigApplicationContext(Cfg.class)) { System.out.println(ctx.getBean(Service.class).get()); }` });
  Q(SP, "IoC & DI", "Easy", false, "S01", "@Component vs @Bean?", [
    "@Component (and @Service, @Repository, @Controller) marks your own classes for component scanning.",
    "@Bean methods in @Configuration classes create beans from code: third-party classes or custom construction.",
    "@Configuration classes are proxied so inter-@Bean calls return the singleton."]);
  Q(SP, "IoC & DI", "Medium", true, "S01", "How do you resolve multiple beans of the same type?", [
    "@Primary marks the default; @Qualifier(\"name\") picks explicitly; a parameter name matching the bean name also works.",
    "Inject List<T> or Map<String, T> to get all implementations (strategy pattern)."],
    { code: `interface Sender { String send(); }
@Component("sms") class Sms implements Sender { public String send() { return "sms"; } }
@Component("mail") @Primary class Mail implements Sender { public String send() { return "mail"; } }
@Component class User { final Sender d, q; User(Sender d, @Qualifier("sms") Sender q) { this.d = d; this.q = q; } }
@Configuration @ComponentScan class Cfg { }
try (var ctx = new AnnotationConfigApplicationContext(Cfg.class)) { User u = ctx.getBean(User.class); System.out.println(u.d.send() + " " + u.q.send()); }` });
  Q(SP, "Scopes", "Easy", true, "S01", "What bean scopes does Spring support?", [
    "singleton (default, one per container), prototype (new per request for the bean).",
    "Web: request, session, application, websocket.",
    "Singletons are shared across threads, so keep them stateless or thread-safe."]);
  Q(SP, "Scopes", "Medium", true, "S01", "How do you use a prototype or request-scoped bean inside a singleton?", [
    "Direct injection happens once, so the singleton keeps one instance.",
    "Use ObjectProvider<T>.getObject(), a @Lookup method, or a scoped proxy (proxyMode = TARGET_CLASS, standard for request/session).",
    "Prototype beans don't receive destroy callbacks."],
    { code: `@Component @Scope("prototype") class Draft { }
@Component class Editor { final ObjectProvider<Draft> drafts; Editor(ObjectProvider<Draft> d) { drafts = d; } boolean fresh() { return drafts.getObject() != drafts.getObject(); } }
@Configuration @ComponentScan class Cfg { }
try (var ctx = new AnnotationConfigApplicationContext(Cfg.class)) { System.out.println("new instance each time: " + ctx.getBean(Editor.class).fresh()); }` });
  Q(SP, "Lifecycle", "Medium", true, "S01", "Explain the Spring bean lifecycle.", [
    "Instantiate → inject dependencies → Aware callbacks → BeanPostProcessor before-init.",
    "@PostConstruct → afterPropertiesSet → initMethod → BeanPostProcessor after-init (proxies) → ready.",
    "Shutdown (singletons): @PreDestroy → DisposableBean.destroy → destroyMethod. SmartLifecycle adds ordered start/stop."]);
  Q(SP, "Lifecycle", "Hard", false, "S01", "What are BeanPostProcessor and BeanFactoryPostProcessor?", [
    "BeanFactoryPostProcessor modifies bean definitions before beans are created (e.g. placeholder resolution).",
    "BeanPostProcessor intercepts bean instances around initialisation and can return a replacement (AOP proxies, @Autowired processing).",
    "Most Spring annotations are implemented this way."]);
  Q(SP, "Proxies & AOP", "Medium", true, "S01", "JDK dynamic proxy vs CGLIB proxy in Spring?", [
    "JDK proxies implement the bean's interfaces; callers must use the interface type.",
    "CGLIB generates a subclass of the bean class; Spring Boot uses it by default.",
    "CGLIB can't advise final classes or methods; neither intercepts private methods or self-invocation."]);
  Q(SP, "Proxies & AOP", "Medium", true, "S01", "Why doesn't an annotation like @Transactional or @Async work when a method calls another method of the same bean?", [
    "These features are implemented by a proxy around the bean.",
    "An internal call (this.method()) goes to the target directly and skips the proxy.",
    "Fix: move the method to another bean, self-inject the proxy (@Lazy), or use programmatic APIs (TransactionTemplate)."]);

  var SB = "Spring Boot";
  Q(SB, "Auto-configuration", "Easy", true, "S02", "What is Spring Boot and how does it differ from Spring Framework?", [
    "Boot builds on Spring Framework with opinionated defaults: starters, auto-configuration, embedded server, executable jars, externalised config, Actuator.",
    "Spring Framework provides the container, MVC, data and transactions; Boot configures them for you and backs off when you configure them yourself."]);
  Q(SB, "Auto-configuration", "Easy", true, "S02", "What does @SpringBootApplication include?", [
    "@SpringBootConfiguration (a @Configuration), @EnableAutoConfiguration and @ComponentScan of the class's package.",
    "Keep the main class in the root package so sub-packages are scanned."],
    { code: `System.out.println(Arrays.stream(SpringBootApplication.class.getAnnotations()).map(a -> a.annotationType().getSimpleName()).filter(n -> n.startsWith("Spring") || n.startsWith("Enable") || n.startsWith("Component")).toList());` });
  Q(SB, "Auto-configuration", "Medium", true, "S02", "How does auto-configuration work internally?", [
    "@EnableAutoConfiguration loads class names from META-INF/spring/…AutoConfiguration.imports (spring.factories before 2.7).",
    "Removes exclusions, orders them (before/after), imports them after user configuration.",
    "Conditions (@ConditionalOnClass, @ConditionalOnMissingBean, @ConditionalOnProperty…) decide which apply."]);
  Q(SB, "Auto-configuration", "Medium", true, "S02", "What are conditional annotations? Give examples.", [
    "Annotations that register a configuration or bean only if a condition holds.",
    "@ConditionalOnClass, @ConditionalOnMissingBean, @ConditionalOnBean, @ConditionalOnProperty (matchIfMissing), @ConditionalOnWebApplication, @ConditionalOnExpression."],
    { code: `interface Cache { String name(); }
@Configuration class Cfg { @Bean @ConditionalOnProperty(name = "cache.kind", havingValue = "redis") Cache redis() { return () -> "redis"; } @Bean @ConditionalOnMissingBean Cache local() { return () -> "local"; } }
new ApplicationContextRunner().withUserConfiguration(Cfg.class).run(c -> System.out.println(c.getBean(Cache.class).name()));` });
  Q(SB, "Auto-configuration", "Medium", true, "S02", "How do you override or disable an auto-configured bean?", [
    "Define your own bean of that type: @ConditionalOnMissingBean makes Boot back off.",
    "Tune with properties or customizer beans first; exclude whole auto-configurations with exclude/excludeName or spring.autoconfigure.exclude."]);
  Q(SB, "Auto-configuration", "Medium", false, "S02", "How do you debug which auto-configurations were applied?", [
    "--debug / debug=true prints the condition evaluation report (positive, negative matches, exclusions).",
    "Actuator /actuator/conditions and /actuator/beans in a running app.",
    "FailureAnalyzers explain common startup failures."]);
  Q(SB, "Starters", "Easy", true, "S02", "What are Spring Boot starters?", [
    "Dependency descriptors bundling the libraries for a capability (web, data-jpa, security, test…).",
    "Versions are managed by Boot's BOM (parent or spring-boot-dependencies import), so you omit versions."]);
  Q(SB, "Starters", "Hard", false, "S02", "How do you create a custom Spring Boot starter?", [
    "An autoconfigure module: @AutoConfiguration classes with conditions, @ConfigurationProperties, registered in AutoConfiguration.imports.",
    "A starter module that just depends on the autoconfigure module and libraries.",
    "Back off with @ConditionalOnMissingBean, provide an enabled flag, avoid component scanning, test with ApplicationContextRunner."],
    { code: `interface Clock2 { String now(); }
@AutoConfiguration class ClockAutoConfig { @Bean @ConditionalOnMissingBean Clock2 clock() { return () -> "12:00"; } }
ApplicationContextRunner r = new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(ClockAutoConfig.class));
r.run(c -> System.out.println("default " + c.getBean(Clock2.class).now()));
r.withBean(Clock2.class, () -> () -> "mine").run(c -> System.out.println("override " + c.getBean(Clock2.class).now()));` });
  Q(SB, "Startup", "Medium", false, "S02", "What happens when SpringApplication.run() is called?", [
    "Environment prepared (property sources, profiles), context created for the web type, initializers applied.",
    "Refresh: bean definitions incl. auto-config, post-processors, singletons, embedded server start.",
    "Runners execute, then ApplicationReadyEvent."]);
  Q(SB, "Startup", "Easy", false, "S02", "CommandLineRunner vs ApplicationRunner vs ApplicationReadyEvent?", [
    "Both runners execute after the context refresh: CommandLineRunner gets raw String args, ApplicationRunner parsed ApplicationArguments.",
    "ApplicationReadyEvent is published after runners, when the app is ready to serve."]);

  Q(SB, "Configuration", "Easy", true, "S03", "What is the order of precedence for Spring Boot property sources?", [
    "Highest to lowest: command-line args, SPRING_APPLICATION_JSON, Java system properties, OS environment variables, profile-specific files (outside then inside the jar), application files (outside then inside), @PropertySource, default properties.",
    "Precedence applies per key."]);
  Q(SB, "Configuration", "Easy", true, "S03", "What are profiles and how do you use them?", [
    "Named environment variants activated with spring.profiles.active (or SPRING_PROFILES_ACTIVE).",
    "They load application-{profile} files, apply on-profile documents and register @Profile beans; groups bundle several."],
    { code: `interface Mailer { String kind(); }
@Configuration class Cfg { @Bean @Profile("prod") Mailer smtp() { return () -> "smtp"; } @Bean @Profile("!prod") Mailer log() { return () -> "log only"; } }
new ApplicationContextRunner().withUserConfiguration(Cfg.class).withPropertyValues("spring.profiles.active=prod").run(c -> System.out.println(c.getBean(Mailer.class).kind()));` });
  Q(SB, "Configuration", "Medium", true, "S03", "@Value vs @ConfigurationProperties?", [
    "@Value injects single values with ${key:default} placeholders and SpEL.",
    "@ConfigurationProperties binds a prefix to a typed class/record: nesting, collections, Duration/DataSize, relaxed binding, validation, IDE metadata.",
    "Prefer @ConfigurationProperties for groups of settings."],
    { code: `@ConfigurationProperties(prefix = "app") record AppProps(String name, @DefaultValue("3") int retries) { }
@Configuration @EnableConfigurationProperties(AppProps.class) class Cfg { }
new ApplicationContextRunner().withUserConfiguration(Cfg.class).withPropertyValues("app.name=fares").run(c -> System.out.println(c.getBean(AppProps.class)));` });
  Q(SB, "Configuration", "Medium", false, "S03", "What is relaxed binding? How do you set shop.max-items via an environment variable?", [
    "Boot maps kebab-case, camelCase, underscore and uppercase forms to the same property for @ConfigurationProperties.",
    "Env var: replace dots with underscores, remove dashes, uppercase: SHOP_MAXITEMS. Lists: SHOP_ITEMS_0_."]);
  Q(SB, "Configuration", "Medium", true, "S03", "How do you manage secrets in Spring Boot?", [
    "Never commit them; inject via environment variables or mounted files (Kubernetes Secrets with configtree:).",
    "Or fetch from Vault / cloud secret managers through spring.config.import integrations.",
    "Mask in Actuator, never log, rotate, separate per environment."]);
  Q(SB, "Configuration", "Medium", false, "S03", "How do you validate configuration properties?", [
    "Add @Validated to the @ConfigurationProperties type and Bean Validation constraints.",
    "Binding fails at startup with a clear message, so misconfiguration never reaches traffic."],
    { code: `@ConfigurationProperties(prefix = "pay") @Validated record PayProps(@NotBlank String url) { }
@Configuration @EnableConfigurationProperties(PayProps.class) class Cfg { }
new ApplicationContextRunner().withUserConfiguration(Cfg.class).withPropertyValues("pay.url=").run(c -> System.out.println("startup failed: " + (c.getStartupFailure() != null)));` });
  Q(SB, "Configuration", "Easy", false, "S03", "application.properties vs application.yml?", [
    "Equivalent; YAML is more readable for hierarchies and lists and supports --- multi-document files.",
    "If both define a key, properties takes precedence; beware YAML type coercion (on/off, leading zeros)."]);
  Q(SB, "Configuration", "Medium", false, "S03", "How do you externalise configuration for Kubernetes?", [
    "Environment variables in the Deployment (SPRING_PROFILES_ACTIVE, SPRING_DATASOURCE_URL).",
    "ConfigMaps/Secrets mounted as files read with spring.config.import=configtree:/path/.",
    "Changes need a restart unless you use a reload mechanism (Spring Cloud Kubernetes)."]);
  Q(SB, "Configuration", "Hard", false, "S03", "A property has an unexpected value in production. How do you debug it?", [
    "GET /actuator/env/{key}: every defining source and the effective value.",
    "Check active profiles, env vars, -D flags, command-line args and external config files.",
    "Use /actuator/configprops for bound values; fix at the owning layer."]);
  Q(SB, "Configuration", "Easy", false, "S03", "How do you provide a default for a missing property?", [
    "@Value(\"${key:default}\"), @DefaultValue on @ConfigurationProperties record components, or field initialisers in JavaBean-style properties classes.",
    "Don't default values that must be set explicitly in production; validate them instead."]);

  window.JAVA_IQ = QS;
})();
