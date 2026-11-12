/* Lesson J05: Exceptions: checked, unchecked, try-with-resources */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // try/catch/finally tracer: each scenario = code lines + trace steps [line, event]
  var SC = {
    ok: { label: "No exception", code: [
      "static String run() {",
      "    try {",
      "        System.out.println(\"try\");",
      "        return \"from try\";",
      "    } catch (IllegalStateException e) {",
      "        System.out.println(\"catch\");",
      "        return \"from catch\";",
      "    } finally {",
      "        System.out.println(\"finally\");",
      "    }",
      "}"], trace: [[2, "prints \"try\""], [3, "return value \"from try\" is evaluated and saved"], [8, "finally always runs before the method actually returns: prints \"finally\""], [3, "method returns \"from try\""]], result: "Output: try, finally. Returns \"from try\"." },
    caught: { label: "Caught exception", code: [
      "static String run() {",
      "    try {",
      "        System.out.println(\"try\");",
      "        throw new IllegalStateException(\"seat taken\");",
      "    } catch (IllegalStateException e) {",
      "        System.out.println(\"catch: \" + e.getMessage());",
      "        return \"from catch\";",
      "    } finally {",
      "        System.out.println(\"finally\");",
      "    }",
      "}"], trace: [[2, "prints \"try\""], [3, "IllegalStateException thrown: the rest of try is skipped"], [4, "the first catch whose type matches is chosen"], [5, "prints \"catch: seat taken\""], [6, "return value \"from catch\" saved"], [8, "finally runs: prints \"finally\""], [6, "returns \"from catch\""]], result: "Output: try, catch: seat taken, finally. Returns \"from catch\"." },
    uncaught: { label: "Not caught here", code: [
      "static String run() {",
      "    try {",
      "        System.out.println(\"try\");",
      "        Integer.parseInt(\"12A\");",
      "        return \"from try\";",
      "    } catch (IllegalStateException e) {",
      "        return \"from catch\";",
      "    } finally {",
      "        System.out.println(\"finally\");",
      "    }",
      "}"], trace: [[2, "prints \"try\""], [3, "NumberFormatException thrown"], [5, "catch (IllegalStateException) doesn't match NumberFormatException: skipped"], [8, "finally still runs: prints \"finally\""], [10, "the exception propagates to the caller (stack unwinds until some caller catches it, or the thread dies)"]], result: "Output: try, finally. Then NumberFormatException: For input string: \"12A\" propagates to the caller." },
    retval: { label: "finally changes the variable", code: [
      "static int run() {",
      "    int seats = 1;",
      "    try {",
      "        return seats;",
      "    } finally {",
      "        seats = 99;",
      "        System.out.println(\"finally set seats = \" + seats);",
      "    }",
      "}"], trace: [[1, "seats = 1"], [3, "return expression evaluated: the value 1 is saved"], [5, "finally changes the local variable to 99"], [6, "prints \"finally set seats = 99\""], [3, "returns the saved value: 1"]], result: "Returns 1, not 99: the return value was captured before finally ran. (With a mutable object, changes to the object inside finally would be visible.)" },
    swallow: { label: "return inside finally", code: [
      "static String run() {",
      "    try {",
      "        throw new IllegalStateException(\"payment failed\");",
      "    } finally {",
      "        return \"all good\";          // never do this",
      "    }",
      "}"], trace: [[2, "IllegalStateException thrown"], [3, "no catch: finally runs before propagating"], [4, "return in finally REPLACES the pending exception"], [4, "method returns \"all good\": the exception is silently lost"]], result: "Returns \"all good\" and the exception disappears. A return (or throw) in finally discards whatever was pending. Compiling with -Xlint:finally warns: \"finally clause cannot complete normally\"." },
    twr: { label: "try-with-resources", code: [
      "static void run() throws Exception {",
      "    try (Res a = new Res(\"db\"); Res b = new Res(\"file\")) {",
      "        System.out.println(\"body\");",
      "        throw new IllegalStateException(\"body failed\");",
      "    } catch (Exception e) {",
      "        System.out.println(\"caught \" + e.getMessage()",
      "            + \", suppressed \" + e.getSuppressed().length);",
      "    } finally {",
      "        System.out.println(\"finally\");",
      "    }",
      "}",
      "// Res.close() prints \"close <name>\"; close of \"file\" throws"], trace: [[1, "resources opened left to right: db, then file"], [2, "prints \"body\""], [3, "body throws IllegalStateException"], [1, "resources closed in REVERSE order before catch: \"close file\" (throws), then \"close db\""], [1, "the exception from close(file) is added as SUPPRESSED to the body's exception"], [4, "catch sees the original \"body failed\""], [5, "prints \"caught body failed, suppressed 1\""], [8, "finally prints \"finally\""]], result: "Output: body, close file, close db, caught body failed, suppressed 1, finally. The primary exception wins; close failures are kept in getSuppressed()." },
    exit: { label: "System.exit in try", code: [
      "static void run() {",
      "    try {",
      "        System.out.println(\"try\");",
      "        System.exit(1);",
      "    } finally {",
      "        System.out.println(\"finally\");",
      "    }",
      "}"], trace: [[2, "prints \"try\""], [3, "System.exit(1) starts JVM shutdown: shutdown hooks run, then the process ends"], [5, "finally is NOT executed: the thread never returns from System.exit"]], result: "Output: try. finally doesn't run when the JVM halts (System.exit, Runtime.halt, a crash, kill -9) or the thread is stuck forever." }
  };
  function flowWidget(el, ctx) {
    var s = ctx.state; if (!SC[s.sc]) { s.sc = "caught"; s.k = 0; }
    el.innerHTML = "<div class='seg' data-r='sc'></div><pre class='code' data-r='src' style='margin-top:12px;font-size:12.5px'></pre><p data-r='ev'></p><div class='result' data-r='res'></div>" +
      "<div class='btnrow'><button type='button' class='btn' data-r='prev'>← Back</button><button type='button' class='btn primary' data-r='next'>Step →</button><button type='button' class='btn' data-r='end'>Run to end</button></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("sc").innerHTML = Object.keys(SC).map(function (k) { return "<button type='button' data-k='" + k + "'>" + ctx.esc(SC[k].label) + "</button>"; }).join("");
    function draw() {
      var sc = SC[s.sc], n = sc.trace.length, k = Math.min(s.k, n - 1), cur = sc.trace[k];
      Array.prototype.forEach.call(q("sc").children, function (b) { b.className = b.getAttribute("data-k") === s.sc ? "on" : ""; });
      q("src").innerHTML = sc.code.map(function (ln, i) { return "<div style='padding:0 6px;border-radius:4px;" + (i === cur[0] ? "background:var(--accent-subtle);outline:1px solid var(--accent)" : "") + "'>" + ctx.H.highlight(ln) + "</div>"; }).join("");
      q("ev").innerHTML = "<strong>Step " + (k + 1) + " of " + n + ":</strong> " + ctx.esc(cur[1]);
      var res = q("res"); res.hidden = k < n - 1; res.className = "result " + (s.sc === "swallow" || s.sc === "uncaught" || s.sc === "exit" ? "warn" : "ok"); res.innerHTML = "<p>" + ctx.esc(sc.result) + "</p>";
      q("prev").disabled = k === 0; q("next").disabled = k >= n - 1; q("end").disabled = k >= n - 1;
    }
    q("sc").addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (!b) return; s.sc = b.getAttribute("data-k"); s.k = 0; ctx.save(); draw(); });
    q("prev").addEventListener("click", function () { s.k = Math.max(0, s.k - 1); ctx.save(); draw(); });
    q("next").addEventListener("click", function () { s.k++; ctx.save(); draw(); });
    q("end").addEventListener("click", function () { s.k = SC[s.sc].trace.length - 1; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "The Throwable hierarchy",
      text: "Everything you can `throw` extends `Throwable`. Two branches: **`Error`**: serious JVM or environment problems you normally don't catch (`OutOfMemoryError`, `StackOverflowError`); and **`Exception`**: conditions a program might handle. Under `Exception`, **`RuntimeException`** and its subclasses are **unchecked**; every other `Exception` is **checked**, meaning the compiler forces you to catch it or declare it with `throws`.",
      m: M(["flowchart TB",
        "  T[\"Throwable\"]:::s0 --> E[\"Error (unchecked)\"]:::bad",
        "  T --> X[\"Exception (checked)\"]:::s1",
        "  E --> E1[\"OutOfMemoryError\"]",
        "  E --> E2[\"StackOverflowError\"]",
        "  E --> E3[\"NoClassDefFoundError\"]",
        "  X --> C1[\"IOException<br/>FileNotFoundException\"]:::s1",
        "  X --> C2[\"SQLException\"]:::s1",
        "  X --> C3[\"InterruptedException\"]:::s1",
        "  X --> R[\"RuntimeException (unchecked)\"]:::s2",
        "  R --> R1[\"NullPointerException\"]:::s2",
        "  R --> R2[\"IllegalArgumentException<br/>NumberFormatException\"]:::s2",
        "  R --> R3[\"IllegalStateException\"]:::s2",
        "  R --> R4[\"IndexOutOfBounds · ClassCast · Arithmetic\"]:::s2",
        "  R --> R5[\"ConcurrentModificationException\"]:::s2"]),
      table: [
        ["Kind", "Examples", "Compiler forces handling?", "Meaning"],
        ["Checked", "`IOException`, `SQLException`, `InterruptedException`", "Yes", "Recoverable conditions outside your control"],
        ["Unchecked (runtime)", "`NullPointerException`, `IllegalArgumentException`, `IllegalStateException`", "No", "Programming errors or violated preconditions"],
        ["Error", "`OutOfMemoryError`, `StackOverflowError`", "No", "The JVM/environment is in trouble; don't catch"]],
      analogy: "A checked exception is a known road closure printed on the map: the route planner (compiler) makes you plan a detour. An unchecked exception is a pothole you caused by driving carelessly: fix your driving. An Error is an earthquake: no detour helps." },
    { title: "Checked vs unchecked in practice",
      text: "For a checked exception the compiler enforces \"**catch or declare**\": either handle it in a `try/catch`, or add `throws` to the method signature so callers must deal with it. Unchecked exceptions can be thrown anywhere without declaration. Modern Java libraries and frameworks (Spring, JPA, most SDKs) lean towards **unchecked** exceptions: checked exceptions don't compose well with lambdas and leak implementation details through every layer.",
      code: `static String readConfig(Path p) throws IOException {        // declare: callers must handle
    return Files.readString(p);
}
static int parseSeats(String s) {                              // unchecked: no declaration needed
    if (s == null || s.isBlank()) throw new IllegalArgumentException("seats is required");
    return Integer.parseInt(s.strip());                        // may throw NumberFormatException
}

try {
    readConfig(Path.of("/definitely/missing.yml"));
} catch (NoSuchFileException e) {                              // subclass of IOException
    System.out.println("missing file: " + e.getMessage());
} catch (IOException e) {
    System.out.println("I/O problem: " + e);
}
System.out.println(parseSeats(" 3 "));
try { parseSeats("three"); } catch (NumberFormatException e) { System.out.println("bad input: " + e.getMessage()); }`,
      table: [
        ["Use checked when…", "Use unchecked when…"],
        ["The caller can reasonably recover (retry, choose another file)", "It's a bug or violated precondition (null argument, bad state)"],
        ["It's part of a library API's contract", "The caller can't do anything useful except fail the request"],
        ["You want the compiler to force a decision", "It would otherwise be wrapped and rethrown at every layer"]],
      points: ["Overriding methods can't add new checked exceptions (J03)", "Constructors and static initialisers can throw too; checked exceptions in static init must be caught (wrapped in `ExceptionInInitializerError` otherwise)"] },
    { title: "try / catch / finally: the rules",
      text: "`try` holds code that might throw. Each `catch` handles a type (and its subclasses); the **first matching** catch runs, so put specific types **before** general ones (the compiler rejects unreachable catches). **Multi-catch** (`catch (A | B e)`) handles unrelated types the same way. `finally` runs whether the try completes normally, returns, or throws: use it for cleanup (though try-with-resources is better for resources).",
      code: `static String book(String seat, Map<String, String> seats) {
    try {
        if (seat.length() != 3) throw new IllegalArgumentException("seat like 12A expected");
        int row = Integer.parseInt(seat.substring(0, 2));
        if (seats.containsKey(seat)) throw new IllegalStateException(seat + " already taken");
        seats.put(seat, "Deepak");
        return "booked row " + row;
    } catch (NumberFormatException | StringIndexOutOfBoundsException e) {   // multi-catch: unrelated types
        return "bad seat format: " + e.getClass().getSimpleName();
    } catch (IllegalArgumentException e) {                                  // NumberFormatException is a subclass: must come after it
        return "invalid: " + e.getMessage();
    } catch (IllegalStateException e) {
        return "conflict: " + e.getMessage();
    } finally {
        System.out.print("[audit " + seat + "] ");
    }
}

Map<String, String> seats = new HashMap<>();
System.out.println(book("12A", seats));
System.out.println(book("12A", seats));
System.out.println(book("XYZ", seats));
System.out.println(book("7", seats));`,
      points: ["In multi-catch the variable is implicitly `final`, and the alternatives can't be subclasses of each other", "`finally` runs even after `return` in try/catch; a `return` *inside* finally overrides everything (use the widget)", "finally doesn't run if the JVM exits (`System.exit`) or the thread never finishes"] },
    { title: "Propagation and reading stack traces",
      text: "An uncaught exception unwinds the call stack frame by frame until a matching `catch` is found. If none is, the thread dies and its uncaught-exception handler prints the stack trace. Read a trace **top-down for where it was thrown**, and look for **`Caused by:`** sections (read the **last** one for the root cause). `... 12 more` means frames identical to the enclosing trace.",
      lang: "text",
      code: `Exception in thread "main" com.acme.booking.BookingFailedException: could not book PNR X7Q2
    at com.acme.booking.BookingService.book(BookingService.java:42)        ← where it was thrown
    at com.acme.booking.BookingController.create(BookingController.java:27) ← who called it
    at com.acme.Main.main(Main.java:9)
Caused by: java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available, request timed out after 30000ms
    at com.zaxxer.hikari.pool.HikariPool.createTimeoutException(HikariPool.java:696)
    at com.acme.booking.BookingRepository.save(BookingRepository.java:18)
    at com.acme.booking.BookingService.book(BookingService.java:39)
    ... 2 more                                                              ← same frames as above

→ root cause: the DB connection pool was exhausted (not a booking bug)`,
      m: M(["flowchart LR",
        "  A[\"main()\"]:::s0 --> B[\"controller.create()\"]:::s0 --> C[\"service.book()\"]:::s0 --> D[\"repository.save()\"]:::bad",
        "  D -. \"SQLException thrown\" .-> C",
        "  C -. \"wrapped: BookingFailedException(cause)\" .-> B",
        "  B -. \"not caught\" .-> A",
        "  A -. \"uncaught: thread dies, trace printed\" .-> X([\"stderr / logs\"])"]),
      points: ["Since Java 14, **helpful NullPointerExceptions** name the null expression: `Cannot invoke \"String.length()\" because \"seat\" is null`", "In thread pools, exceptions in `submit()`ted tasks are captured in the `Future`; in `execute()`d tasks they go to the thread's uncaught handler (J16)"] },
    { title: "try-with-resources and suppressed exceptions",
      text: "Anything implementing **`AutoCloseable`** (streams, readers, JDBC connections, `ExecutorService` since Java 19) can be declared in the `try (...)` header. Resources are **closed automatically in reverse order**, after the body and **before** any `catch`/`finally` of that statement. If the body throws and `close()` also throws, the close exception is attached to the primary one as **suppressed** (`getSuppressed()`), instead of replacing it as an old-style `finally { close(); }` would.",
      code: `class Res implements AutoCloseable {
    private final String name;
    Res(String name) { this.name = name; System.out.println("open " + name); }
    void use() { System.out.println("use " + name); }
    @Override public void close() {
        System.out.println("close " + name);
        if (name.equals("file")) throw new IllegalStateException("close failed: " + name);
    }
}

try (Res db = new Res("db"); Res file = new Res("file")) {
    db.use(); file.use();
    throw new IllegalStateException("body failed");
} catch (IllegalStateException e) {
    System.out.println("caught: " + e.getMessage());
    for (Throwable s : e.getSuppressed()) System.out.println("  suppressed: " + s.getMessage());
}

Path tmp = Files.createTempFile("pnr", ".txt");
Files.writeString(tmp, "X7Q2\\nK9M1\\n");
try (BufferedReader r = Files.newBufferedReader(tmp)) {             // the everyday case
    System.out.println("lines: " + r.lines().count());
}
Files.delete(tmp);`,
      points: ["Java 9+: you can list an existing effectively-final variable: `try (conn) { ... }`", "`close()` should be idempotent; `Closeable.close()` throws `IOException`, `AutoCloseable.close()` throws `Exception`", "Streams over files (`Files.lines`) must be closed too: put them in try-with-resources"] },
    { title: "Custom exceptions that carry context",
      text: "Create your own exception when callers need to **distinguish** a failure (catch it specifically or map it to an HTTP status) or when it carries **domain data** (the PNR, the seat, the retry-after). Extend `RuntimeException` (most application code) or `Exception` (when you deliberately want catch-or-declare). Always provide constructors that accept a **cause**, so the original stack trace isn't lost.",
      code: `class BookingException extends RuntimeException {                 // base for the domain
    BookingException(String msg) { super(msg); }
    BookingException(String msg, Throwable cause) { super(msg, cause); }
}
class SeatUnavailableException extends BookingException {
    private final String seat;
    SeatUnavailableException(String seat) { super("Seat " + seat + " is no longer available"); this.seat = seat; }
    String seat() { return seat; }
}
class PaymentDeclinedException extends BookingException {
    private final String reasonCode;
    PaymentDeclinedException(String reasonCode, Throwable cause) { super("Payment declined: " + reasonCode, cause); this.reasonCode = reasonCode; }
    String reasonCode() { return reasonCode; }
}

static int httpStatus(BookingException e) {                        // e.g. what a @ControllerAdvice would do (S05)
    if (e instanceof SeatUnavailableException) return 409;
    if (e instanceof PaymentDeclinedException) return 402;
    return 500;
}

List<BookingException> errors = List.of(new SeatUnavailableException("12A"),
    new PaymentDeclinedException("INSUFFICIENT_FUNDS", new java.net.SocketTimeoutException("gateway slow")));
for (BookingException e : errors)
    System.out.println(httpStatus(e) + " " + e.getMessage() + (e.getCause() != null ? " (cause: " + e.getCause() + ")" : ""));`,
      points: ["Name them for the **problem**, not the layer (`SeatUnavailableException`, not `ServiceLayerException`)", "Make them immutable; include identifiers, never secrets", "A small hierarchy with one base type lets callers catch broadly or narrowly"] },
    { title: "Exception translation and chaining",
      text: "Low-level exceptions (`SQLException`, `IOException`, an HTTP client's timeout) shouldn't leak through your service's API: callers would depend on your implementation details. At layer boundaries, **translate** them into exceptions that make sense at that level, **chaining the original as the cause** (`new X(msg, e)`). Never lose the cause: `throw new X(e.getMessage())` throws away the original stack trace.",
      code: `class FareLookupException extends RuntimeException {
    FareLookupException(String msg, Throwable cause) { super(msg, cause); }
}
static int fetchFare(String route) throws IOException {             // low level: HTTP / file
    throw new java.net.SocketTimeoutException("connect timed out to fares-api:443");
}
static int fareFor(String route) {                                  // service boundary: translate
    try {
        return fetchFare(route);
    } catch (IOException e) {
        throw new FareLookupException("Could not get fare for " + route, e);   // keep the cause!
    }
}

try { fareFor("DEL-BLR"); }
catch (FareLookupException e) {
    Throwable root = e;
    while (root.getCause() != null) root = root.getCause();
    System.out.println(e.getMessage() + " | root cause: " + root.getClass().getSimpleName() + ": " + root.getMessage());
}`,
      points: ["Spring does this for you: `DataAccessException` hierarchy wraps vendor `SQLException`s", "`UncheckedIOException` is the JDK's standard wrapper for `IOException` in unchecked contexts", "Log **or** rethrow, not both: logging at every layer produces the same stack trace five times"] },
    { title: "Checked exceptions and lambdas",
      text: "Functional interfaces like `Function` and `Consumer` don't declare checked exceptions, so a lambda calling `Files.readString` won't compile inside `map`. Options: catch inside the lambda and wrap in an unchecked exception (`UncheckedIOException`), return a result type that holds success or failure, or write your own functional interface that `throws`.",
      code: `List<Path> files = new ArrayList<>();
for (String name : List.of("a", "b")) {
    Path p = Files.createTempFile("fare-" + name, ".txt");
    Files.writeString(p, name.equals("a") ? "4850" : "5120");
    files.add(p);
}
files.add(Path.of("/missing/fare.txt"));

// files.stream().map(Files::readString)       // compile error: unhandled IOException
List<String> ok = files.subList(0, 2).stream().map(p -> {
    try { return Files.readString(p); }
    catch (IOException e) { throw new UncheckedIOException(e); }
}).toList();
System.out.println("fares: " + ok);

record Result(Path path, String value, Exception error) {}
List<Result> results = files.stream().map(p -> {
    try { return new Result(p, Files.readString(p), null); }
    catch (IOException e) { return new Result(p, null, e); }        // keep going, report later
}).toList();
results.forEach(r -> System.out.println(r.path().getFileName() + " → " + (r.error() == null ? r.value() : "error " + r.error().getClass().getSimpleName())));
for (Path p : files.subList(0, 2)) Files.delete(p);`,
      points: ["Choose \"fail the whole batch\" (wrap & throw) or \"collect errors\" (result objects) deliberately", "Libraries like Vavr offer `Try`; in plain Java a small record works fine"] },
    { title: "Best practices and anti-patterns",
      text: "Exceptions are for **exceptional** conditions and for signalling broken contracts. The common mistakes: swallowing (`catch (Exception e) {}`), catching too broadly, using exceptions for normal control flow, logging and rethrowing at every layer, and losing the cause. Validate inputs early (**fail fast**) with clear messages.",
      table: [
        ["Anti-pattern", "Better"],
        ["`catch (Exception e) { }`", "Handle it, or let it propagate; at minimum log with context"],
        ["`catch (Exception e) { log; throw e; }` in every layer", "Log once at the boundary that handles it (e.g. `@ControllerAdvice`)"],
        ["`throw new RuntimeException(e.getMessage())`", "`throw new DomainException(\"context\", e)`"],
        ["Exceptions for flow (`try { parse } catch → default`) in hot loops", "Check first (`if (s.matches(...))`), or `Optional`-returning parse"],
        ["`catch (Throwable t)`", "Never catch `Error`s except at the very top to log and exit"],
        ["Returning `null` on failure", "Throw, or return `Optional`/a result type"],
        ["Generic messages: \"Error occurred\"", "Who/what/why: \"Seat 12A on AI-505 already taken by booking X7Q2\""]],
      code: `static void reserve(String flight, int seats) {
    Objects.requireNonNull(flight, "flight must not be null");                 // fail fast
    if (seats < 1 || seats > 9) throw new IllegalArgumentException("seats must be 1..9 but was " + seats);
    System.out.println("reserved " + seats + " on " + flight);
}

reserve("AI-505", 2);
for (Object[] bad : new Object[][]{{null, 1}, {"AI-505", 12}}) {
    try { reserve((String) bad[0], (Integer) bad[1]); }
    catch (NullPointerException | IllegalArgumentException e) { System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage()); }
}`,
      points: ["`IllegalArgumentException` for bad arguments, `IllegalStateException` for wrong object state, `UnsupportedOperationException` for unsupported calls, `NoSuchElementException` for missing elements", "In tests, assert the exception type **and** message: `assertThrows(IllegalArgumentException.class, () -> ...)` (J36)"] },
    { title: "Errors, InterruptedException and what not to catch",
      text: "`Error`s mean the JVM can't be trusted to continue normally: after `OutOfMemoryError` any allocation may fail. Let them propagate (and configure heap dumps). One checked exception needs special care: **`InterruptedException`** means someone asked this thread to stop. Never swallow it: either propagate it, or **restore the interrupt flag** with `Thread.currentThread().interrupt()` so code higher up can see it (J15).",
      code: `static int recurse(int n) { return recurse(n + 1) + 1; }

Thread worker = new Thread(() -> {
    while (!Thread.currentThread().isInterrupted()) {
        try {
            Thread.sleep(50);                                   // blocking call: throws when interrupted
        } catch (InterruptedException e) {
            System.out.println("interrupted while sleeping, flag now " + Thread.currentThread().isInterrupted());
            Thread.currentThread().interrupt();                 // restore the flag so the loop condition sees it
        }
    }
    System.out.println("worker exits cleanly");
});
worker.start();
Thread.sleep(120);
worker.interrupt();
worker.join();

try { recurse(0); } catch (StackOverflowError e) { System.out.println("StackOverflowError: demo only, don't catch Errors in real code"); }`,
      m: M(["flowchart LR",
        "  A[\"other thread calls worker.interrupt()\"]:::s0 --> B[\"flag set / sleep() throws InterruptedException (flag cleared)\"]:::s1",
        "  B --> C{\"catch block\"}",
        "  C -- \"swallow\" --> D[\"flag lost: loop keeps running ✗\"]:::bad",
        "  C -- \"interrupt() again or rethrow\" --> E[\"loop sees flag, exits ✓\"]:::s2"]),
      points: ["Catching `Exception` doesn't catch `Error`s; catching `Throwable` does (avoid)", "`-XX:+ExitOnOutOfMemoryError` lets an orchestrator restart a container cleanly"] },
    { title: "The cost of exceptions",
      text: "Creating an exception is relatively expensive because the constructor **captures the stack trace** (`fillInStackTrace`), proportional to stack depth. Throwing and catching close by is cheap after JIT optimisation; the cost is usually in creating the object and in logging the trace. That's fine for real errors and terrible as normal control flow in a hot loop. HotSpot may also start throwing **pre-allocated exceptions without stack traces** for very frequent built-in exceptions (`-XX:-OmitStackTraceInFastThrow` disables this), which is why some production NPEs appear with no trace.",
      code: `static boolean isNumberByException(String s) {
    try { Integer.parseInt(s); return true; } catch (NumberFormatException e) { return false; }
}
static boolean isNumberByCheck(String s) {
    if (s.isEmpty() || s.length() > 10) return false;
    for (int i = 0; i < s.length(); i++) if (!Character.isDigit(s.charAt(i))) return false;
    return true;
}

List<String> inputs = IntStream.range(0, 200_000).mapToObj(i -> i % 2 == 0 ? "12" + i : "x" + i).toList();
for (int round = 0; round < 2; round++) {                    // second round = warmed up
    long t0 = System.nanoTime(); long a = inputs.stream().filter(s -> isNumberByException(s)).count();
    long t1 = System.nanoTime(); long b = inputs.stream().filter(s -> isNumberByCheck(s)).count();
    long t2 = System.nanoTime();
    if (round == 1) System.out.println("same answer: " + (a == b) + ", exceptions slower: " + ((t1 - t0) > (t2 - t1)));
}`,
      points: ["For high-volume, expected failures (validation of user input), return a result instead of throwing", "Custom exceptions used as signals can override `fillInStackTrace` or use the 4-arg constructor with `writableStackTrace=false`, but only when you're sure you'll never need the trace"] }
  ];

  H.registerLesson({
    code: "J05",
    summary: "Java exceptions for interviews and production: the `Throwable` hierarchy (`Error` vs checked vs unchecked), catch-or-declare, try/catch/finally rules (catch order, multi-catch, what finally can and can't do), propagation and reading stack traces with `Caused by`, try-with-resources with reverse-order closing and suppressed exceptions, custom exceptions that carry context, translation and chaining at layer boundaries, checked exceptions inside lambdas, best practices and anti-patterns, handling `InterruptedException` and `Error`s, and the cost of exceptions.",
    slides: SLIDES,
    widget: { heading: "Interactive: trace try / catch / finally", caption: "Pick a scenario and step through it line by line: which block runs, what is returned, and what happens to exceptions, including the tricky cases (return in finally, try-with-resources closing order, System.exit).", render: flowWidget },
    examplesHeading: "Where exceptions matter at work",
    examples: [
      ["REST error responses", "A `@RestControllerAdvice` maps `SeatUnavailableException` → 409, validation errors → 400 and everything else → 500 with a correlation ID, logging once (S05)."],
      ["Transactions", "Spring rolls back `@Transactional` methods on **unchecked** exceptions by default but **not on checked** ones unless you set `rollbackFor` (S07)."],
      ["Retries", "Retry only transient failures (`SocketTimeoutException`, HTTP 503), never validation errors; libraries like Resilience4j decide by exception type (S14)."],
      ["Resource leaks", "Forgetting to close JDBC connections or HTTP responses exhausts pools; try-with-resources (or framework templates) prevents it."],
      ["Batch jobs", "Processing 1M records: collect per-record failures into an error report instead of aborting the whole job on the first bad row."],
      ["Observability", "Exceptions with good messages and causes plus a trace ID are what make incidents debuggable at 3 a.m."]
    ],
    pitfalls: [
      "Empty catch blocks (swallowing)",
      "`return` or `throw` inside `finally` (hides the original exception)",
      "Catching `Exception`/`Throwable` too broadly",
      "Losing the cause: `new X(e.getMessage())` instead of `new X(msg, e)`",
      "Logging and rethrowing at every layer",
      "Using exceptions for normal control flow in hot paths",
      "Swallowing `InterruptedException` without restoring the interrupt flag",
      "Specific catch blocks after general ones (compile error) or ordering subclasses wrongly",
      "Closing resources manually in finally (and losing exceptions) instead of try-with-resources"
    ],
    quiz: [
      { q: "Which is a checked exception?", options: ["NullPointerException", "IllegalArgumentException", "IOException", "ArithmeticException"], answer: 2, why: "Not a RuntimeException subclass, so catch-or-declare applies." },
      { q: "What does `run()` return?", code: `static int run() {
    int x = 1;
    try { return x; }
    finally { x = 2; }
}`, options: ["1", "2", "0", "Compile error"], answer: 0, why: "The return value is captured before finally runs." },
      { q: "A method's `try` throws, and its `finally` contains `return \"ok\";`. Result?", options: ["Exception propagates", "Returns \"ok\" and the exception is lost", "Both", "Compile error"], answer: 1, why: "A return in finally discards the pending exception." },
      { q: "In try-with-resources with resources A then B, close order is…", options: ["A then B", "B then A", "Unspecified", "Only the last one"], answer: 1, why: "Reverse order of declaration." },
      { q: "Body throws E1, then `close()` throws E2. What does the catch block receive?", options: ["E2, with E1 suppressed", "E1, with E2 in getSuppressed()", "Both separately", "Only E2"], answer: 1, why: "The primary exception wins; close failures are suppressed." },
      { q: "Which catch order compiles?", options: ["catch (Exception e) then catch (IOException e)", "catch (IOException e) then catch (Exception e)", "Either", "Neither"], answer: 1, why: "A subclass catch after its superclass is unreachable: compile error." },
      { q: "When doesn't `finally` run?", options: ["After return in try", "After an exception in catch", "After System.exit() in try", "After break in a loop"], answer: 2, why: "The JVM halts; the thread never comes back." },
      { q: "Correct handling of InterruptedException in a worker loop?", options: ["Ignore it", "Log and continue", "Restore the flag with Thread.currentThread().interrupt() (or propagate)", "Call System.exit"], answer: 2, why: "Cancellation is cooperative; the flag must survive." },
      { q: "By default Spring's @Transactional rolls back on…", options: ["All exceptions", "Unchecked exceptions and Errors", "Checked exceptions only", "Nothing"], answer: 1, why: "Use rollbackFor for checked exceptions." }
    ],
    cheatsheet: {
      table: [
        ["Topic", "Remember"],
        ["Hierarchy", "Throwable → Error | Exception → RuntimeException (unchecked)"],
        ["Checked", "Catch or declare; recoverable, outside your control"],
        ["Catch order", "Specific first; multi-catch for unrelated types"],
        ["finally", "Always runs (except JVM halt); never return/throw from it"],
        ["Return + finally", "Return value captured before finally"],
        ["try-with-resources", "AutoCloseable; reverse close; suppressed exceptions"],
        ["Translate", "`new DomainException(msg, cause)` at boundaries"],
        ["InterruptedException", "Propagate or `Thread.currentThread().interrupt()`"],
        ["Errors", "Don't catch; heap dump + restart"]],
      cards: [
        { title: "Standard exceptions", items: ["IllegalArgumentException", "IllegalStateException", "NullPointerException (`requireNonNull`)", "UnsupportedOperationException", "NoSuchElementException", "UncheckedIOException"] },
        { title: "Good exception", items: ["Specific type", "Message with ids/context", "Cause chained", "No secrets", "Immutable"] },
        { title: "Say in interviews", items: ["Checked = compile-time contract", "Log once at the boundary", "Fail fast", "Suppressed exceptions", "Exceptions aren't control flow"] }]
    },
    practice: [
      { level: "Easy", q: "Explain checked vs unchecked exceptions with examples. Which would you use for a custom `InsufficientBalanceException`?",
        a: ["**Checked**: subclasses of `Exception` but not `RuntimeException` (`IOException`, `SQLException`). The compiler forces catch-or-declare.",
          "**Unchecked**: `RuntimeException` and subclasses (`NullPointerException`, `IllegalArgumentException`) and `Error`s; no compiler enforcement.",
          "`InsufficientBalanceException` is a business rule violation the caller usually can't fix inline; in a Spring app make it **unchecked** (extending a domain base exception) and map it to HTTP 422/409 in a controller advice.",
          "Argue for checked only if callers in a library must explicitly decide (e.g. offer a top-up flow), and remember Spring won't roll back on checked exceptions by default."] },
      { level: "Easy", q: "What's the output?",
        qcode: `static String test() {
    StringBuilder log = new StringBuilder();
    try {
        log.append("T");
        throw new RuntimeException();
    } catch (RuntimeException e) {
        log.append("C");
        return log.append("R").toString();
    } finally {
        log.append("F");
        System.out.println("log in finally: " + log);
    }
}
System.out.println("returned: " + test());`,
        a: ["Prints `log in finally: TCRF` then `returned: TCR`.",
          "The return expression `log.append(\"R\").toString()` is evaluated in the catch: the **string** \"TCR\" is captured.",
          "finally then appends F to the builder (the object is mutable, so the log shows TCRF), but the already-captured return value is an immutable String \"TCR\"."] },
      { level: "Easy", q: "Rewrite this to be correct and leak-free.",
        qcode: `static String firstLine(Path p) throws IOException {
    BufferedReader r = Files.newBufferedReader(p);
    String line = r.readLine();
    r.close();                 // skipped if readLine throws
    return line;
}`,
        code: `static String firstLine(Path p) throws IOException {
    try (BufferedReader r = Files.newBufferedReader(p)) {   // closed on every path
        return r.readLine();
    }
}

Path tmp = Files.createTempFile("j05", ".txt");
Files.writeString(tmp, "PNR X7Q2\\nPNR K9M1\\n");
System.out.println(firstLine(tmp));
Files.delete(tmp);`,
        a: ["If `readLine()` throws, `close()` never runs: a leaked file handle (or DB connection in the JDBC version).",
          "try-with-resources closes on success, exception and return, in reverse order, and keeps close failures as suppressed exceptions."] },
      { level: "Medium", q: "Design an exception strategy for a booking REST service (controller → service → repository → payment client).",
        a: ["Domain base `BookingException extends RuntimeException`, with specific subclasses (`SeatUnavailableException`, `PaymentDeclinedException`, `BookingNotFoundException`) carrying ids.",
          "Repository/client layers translate low-level exceptions (`SQLException` → Spring's `DataAccessException`; HTTP timeouts → `PaymentGatewayUnavailableException`) with the cause chained.",
          "Service layer throws domain exceptions for rule violations; it doesn't log-and-rethrow.",
          "A single `@RestControllerAdvice` maps types to status codes (404, 409, 402, 503) and an RFC 7807 `ProblemDetail` body, logs unexpected exceptions **once** with the trace ID, and hides internals from clients.",
          "Retries (Resilience4j) only for transient types; transactions roll back on runtime exceptions."] },
      { level: "Medium", q: "What are suppressed exceptions? Demonstrate them without try-with-resources.",
        code: `IllegalStateException primary = new IllegalStateException("upload failed");
primary.addSuppressed(new java.io.UncheckedIOException(new IOException("temp file cleanup failed")));
primary.addSuppressed(new RuntimeException("metrics flush failed"));
try { throw primary; }
catch (IllegalStateException e) {
    System.out.println(e.getMessage() + " + " + e.getSuppressed().length + " suppressed:");
    for (Throwable t : e.getSuppressed()) System.out.println("  " + t.getMessage());
}`,
        a: ["Suppressed exceptions (Java 7+) record secondary failures that happened while handling or cleaning up after a primary one, so they aren't lost and don't mask the original.",
          "try-with-resources calls `addSuppressed` automatically for `close()` failures.",
          "You can use `addSuppressed` yourself in cleanup code or when aggregating failures (e.g. closing several resources in a loop).",
          "Stack traces print them under `Suppressed:`."] },
      { level: "Medium", q: "Why is this code bad? Fix it.",
        qcode: `static int parseOrZero(String s) {
    try {
        return Integer.parseInt(s);
    } catch (Exception e) {
        return 0;
    }
}`,
        code: `static OptionalInt parseSeats(String s) {
    if (s == null) return OptionalInt.empty();
    String t = s.strip();
    if (t.isEmpty() || t.length() > 9 || !t.chars().allMatch(Character::isDigit)) return OptionalInt.empty();
    return OptionalInt.of(Integer.parseInt(t));
}

for (String in : Arrays.asList("3", " 12 ", "three", null, "99999999999"))
    System.out.println("[" + in + "] → " + parseSeats(in));`,
        a: ["`catch (Exception e)` is too broad (would hide any bug thrown inside), and `0` is a valid value, so callers can't tell \"invalid\" from \"zero\".",
          "Exceptions as control flow are slow for high-volume invalid input.",
          "Better: return `OptionalInt`/`Optional<Integer>` (J12) or throw a specific exception with a good message, depending on whether invalid input is expected.",
          "If you keep try/catch, catch only `NumberFormatException`."] },
      { level: "Medium", q: "Handle a checked exception inside a stream. Show two strategies.",
        a: ["**Fail fast**: wrap in an unchecked exception inside the lambda: `catch (IOException e) { throw new UncheckedIOException(e); }`. The stream stops at the first failure; catch `UncheckedIOException` outside and unwrap `getCause()` if needed.",
          "**Collect failures**: map each element to a result record `(input, value, error)` and partition afterwards: good for batch jobs and reports.",
          "Other options: extract the throwing call into a helper that handles the exception; or use a plain loop when the exception handling dominates.",
          "Avoid \"sneaky throws\" tricks in application code: they hide checked exceptions from the compiler."] },
      { level: "Hard", q: "A scheduled job stops running silently after a few days. The code is below. What's happening?", qNoCompile: true,
        qcode: `ScheduledExecutorService ses = Executors.newSingleThreadScheduledExecutor();
ses.scheduleAtFixedRate(() -> {
    Report r = reportService.build();   // occasionally throws NullPointerException
    mailer.send(r);
}, 0, 1, TimeUnit.HOURS);`,
        a: ["With `scheduleAtFixedRate`, if one execution throws, **all subsequent executions are suppressed**: the exception is stored in the returned `ScheduledFuture`, which nobody reads, so nothing is logged.",
          "Fix: catch (and log, with metrics/alerts) inside the task: `try { ... } catch (Exception e) { log.error(\"report job failed\", e); }`.",
          "Also fix the NPE cause, and consider Spring `@Scheduled` (which logs errors via its error handler) or a job framework with monitoring.",
          "General lesson: exceptions in thread pools don't surface on the caller's thread; read Futures, set an `UncaughtExceptionHandler`, or catch inside tasks (J16)."] },
      { level: "Hard", q: "Explain what happens, in order, when an exception is thrown inside nested try-with-resources with finally blocks, and how to read the resulting stack trace.",
        steps: ["The JVM creates the exception object (capturing the stack trace) and starts searching the current method's exception table for a handler covering that bytecode range.",
          "Before leaving each try-with-resources statement, its resources are closed in reverse order; close failures are added as suppressed to the in-flight exception.",
          "The first matching `catch` in the innermost enclosing try runs; if it throws a new exception, that becomes the in-flight one (chain the original as its cause!).",
          "Each `finally` on the way out runs; if a finally throws or returns, it replaces the in-flight exception (bad).",
          "If no handler in this method matches, the frame is popped and the search continues in the caller (unwinding).",
          "If the top of the thread's stack is reached, the thread's `UncaughtExceptionHandler` runs (default: print trace) and the thread terminates.",
          "Reading the trace: the first line is the final exception and where it was thrown; `Caused by:` sections walk down to the root cause (read the last one); `Suppressed:` sections show cleanup failures."] },
      { level: "Hard", q: "Your logs show `java.lang.NullPointerException` with no stack trace at all. Why, and what do you do?",
        a: ["HotSpot's **OmitStackTraceInFastThrow** optimisation: when the same built-in exception (NPE, ArithmeticException, ArrayIndexOutOfBounds, ClassCast) is thrown very often from the same compiled code, the JIT replaces it with a **preallocated exception without a stack trace** for speed.",
          "The first occurrences (before the optimisation kicked in) did have full traces: search older logs.",
          "Run with `-XX:-OmitStackTraceInFastThrow` to always get traces (slight cost).",
          "Then fix the root cause: a hot path throwing NPEs repeatedly is a bug; Java 14+ helpful NPE messages name the null expression."] }
    ],
    recap: [
      "Throwable → Error (don't catch) | Exception → checked (catch or declare) | RuntimeException (unchecked: bugs and broken preconditions).",
      "Catch specific types first; finally always runs except on JVM halt; never return or throw from finally; return values are captured before finally.",
      "try-with-resources closes in reverse order and keeps close failures as suppressed exceptions.",
      "Custom exceptions carry context; translate at boundaries and always chain the cause; log once where you handle.",
      "Restore the interrupt flag, fail fast with clear messages, and don't use exceptions for normal control flow."
    ]
  });
})();
