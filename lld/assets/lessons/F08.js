/* Lesson F08: Builder */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  /* Widget: build a pizza with the fluent builder; see the Java call chain and build() validation live */
  var TOPS = ["cheese", "onion", "capsicum", "paneer", "mushroom", "olives", "jalapeno", "corn", "tomato"];
  function pizzaWidget(el, ctx) {
    var s = ctx.state, esc = ctx.esc;
    if (!s.size) { s.size = "MEDIUM"; s.crust = "THIN"; s.tops = ["cheese"]; s.extraCheese = false; s.coupon = ""; }
    el.innerHTML = "<p>" + ctx.md("Configure an order. The panel shows the **builder call chain** you'd write and what `build()` decides. Rules enforced in `build()`: a size and crust are required (constructor of the builder); thin crust allows at most 5 toppings; `LARGE` is required for more than 7; coupon `FIRST50` needs a subtotal of at least ₹300.") + "</p>" +
      "<div class='grid2'><div><div class='field'>Size</div><div class='seg' data-r='size'></div><div class='field' style='margin-top:8px'>Crust</div><div class='seg' data-r='crust'></div>" +
      "<div class='field' style='margin-top:8px'>Toppings</div><div class='checks' data-r='tops'></div>" +
      "<label style='display:block;margin-top:8px'><input type='checkbox' data-r='xc'> extra cheese (+₹40)</label>" +
      "<div class='field' style='margin-top:8px'>Coupon</div><div class='seg' data-r='coupon'></div></div>" +
      "<div><pre class='code' data-r='code'></pre><div class='result' data-r='res'></div></div></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function seg(name, vals) {
      q(name).innerHTML = vals.map(function (v) { return "<button type='button' data-v='" + v + "' class='" + (s[name] === v ? "on" : "") + "'>" + (v || "none") + "</button>"; }).join("");
    }
    function draw() {
      seg("size", ["SMALL", "MEDIUM", "LARGE"]); seg("crust", ["THIN", "PAN", "STUFFED"]); seg("coupon", ["", "FIRST50"]);
      q("tops").innerHTML = TOPS.map(function (t) { return "<label><input type='checkbox' data-t='" + t + "'" + (s.tops.indexOf(t) >= 0 ? " checked" : "") + "> " + t + "</label>"; }).join(" ");
      q("xc").checked = s.extraCheese;
      var lines = ["Pizza p = new Pizza.Builder(Size." + s.size + ", Crust." + s.crust + ")"];
      s.tops.forEach(function (t) { lines.push("        .topping(\"" + t + "\")"); });
      if (s.extraCheese) lines.push("        .extraCheese()");
      if (s.coupon) lines.push("        .coupon(\"" + s.coupon + "\")");
      lines.push("        .build();");
      q("code").textContent = lines.join("\n");
      var base = { SMALL: 199, MEDIUM: 299, LARGE: 449 }[s.size] + (s.crust === "STUFFED" ? 80 : 0);
      var sub = base + 30 * s.tops.length + (s.extraCheese ? 40 : 0), err = null;
      if (s.crust === "THIN" && s.tops.length > 5) err = "IllegalStateException: thin crust supports at most 5 toppings (" + s.tops.length + " given)";
      else if (s.tops.length > 7 && s.size !== "LARGE") err = "IllegalStateException: more than 7 toppings needs a LARGE pizza";
      else if (s.coupon === "FIRST50" && sub < 300) err = "IllegalStateException: FIRST50 needs a subtotal of ₹300 (current ₹" + sub + ")";
      var res = q("res");
      if (err) { res.className = "result err"; res.innerHTML = "<div class='out'>build() threw</div><p>" + esc(err) + "</p><p>" + ctx.md("No half-valid `Pizza` object ever exists: the builder validates the **combination** before calling the private constructor.") + "</p>"; }
      else {
        var total = s.coupon ? Math.round(sub * 0.5) : sub;
        res.className = "result ok"; res.innerHTML = "<div class='out'>Pizza[" + esc(s.size + ", " + s.crust + ", " + s.tops.length + (s.tops.length === 1 ? " topping" : " toppings") + (s.extraCheese ? ", extra cheese" : "")) + "]</div><p>Subtotal ₹" + sub + (s.coupon ? " → ₹" + total + " after FIRST50" : "") + ". " + ctx.md("The result is immutable: no setters, and the topping list is copied with `List.copyOf`.") + "</p>";
      }
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]"); if (!b) return;
      var name = b.parentNode.getAttribute("data-r"); s[name] = b.getAttribute("data-v"); ctx.save(); draw();
    });
    el.addEventListener("change", function (e) {
      var t = e.target.getAttribute("data-t");
      if (t) { var i = s.tops.indexOf(t); if (e.target.checked && i < 0) s.tops.push(t); if (!e.target.checked && i >= 0) s.tops.splice(i, 1); }
      if (e.target.getAttribute("data-r") === "xc") s.extraCheese = e.target.checked;
      ctx.save(); draw();
    });
    draw();
  }

  H.pattern({
    code: "F08", name: "Builder",
    summary: "Builder constructs a complex object step by step and separates *how* it's assembled from its final representation. This lesson covers the telescoping-constructor and JavaBeans problems, the fluent static-nested builder (Effective Java Item 2) with validation in `build()`, immutability, step builders that force required fields at compile time, the GoF Director variant, Lombok `@Builder`, inheritance with generic builders, and mini designs for a pizza order and an HTTP request. It ends with JDK usages (`StringBuilder`, `HttpRequest.Builder`, `Stream.Builder`, `Locale.Builder`) and how Builder differs from Factory and Prototype.",
    intent: "Separate the **construction of a complex object** from its representation, so the same construction process can create different representations. In everyday Java: build an **immutable** object with many optional parts through readable, named, validated steps.",
    problem: {
      text: "A `Pizza` has a required size and crust and up to a dozen optional choices. Constructors with every combination explode (**telescoping constructors**) and positional `true, false, true` arguments are unreadable. The JavaBeans alternative (no-arg constructor plus setters) lets other code see a **half-built, mutable, unvalidated** object.",
      points: [
        "Telescoping: `new Pizza(L, THIN)`, `new Pizza(L, THIN, true)`, `new Pizza(L, THIN, true, false, \"paneer\")`… swapped booleans compile fine and are silent bugs",
        "JavaBeans: `p.setSize(..)` then `p.setCrust(..)`: the object is inconsistent between calls, can't be immutable, and validation has nowhere to live",
        "Builder: named steps, defaults for everything optional, cross-field validation in one `build()`, and an immutable result",
        "Signals: 4+ constructor parameters, several optional, same-typed parameters next to each other, invariants spanning fields"],
      code: `class Pizza {
    Pizza(String size, String crust) { this(size, crust, false); }
    Pizza(String size, String crust, boolean extraCheese) { this(size, crust, extraCheese, false); }
    Pizza(String size, String crust, boolean extraCheese, boolean glutenFree) { this(size, crust, extraCheese, glutenFree, List.of()); }
    Pizza(String size, String crust, boolean extraCheese, boolean glutenFree, List<String> toppings) {
        System.out.println(size + " " + crust + " cheese=" + extraCheese + " gf=" + glutenFree + " " + toppings);
    }
}

new Pizza("LARGE", "THIN", false, true, List.of("paneer"));   // which boolean is which?
new Pizza("LARGE", "THIN", true, false, List.of("paneer"));    // swapped: compiles, wrong order` },
    analogy: "Ordering at Subway. You don't shout one 14-word sentence: you go along the counter: bread, then filling, cheese, toast or not, veggies, sauce. Each step is named and optional, the server checks it makes sense, and only at the till do you receive the finished sandwich.",
    structure: {
      text: "In the Java idiom, the **Product** has a private constructor that takes the builder; a **static nested Builder** holds the same fields as mutable state, takes required fields in its constructor, exposes one fluent method per optional part (each returns `this`), and validates everything in `build()`. The GoF form adds a **Director** that runs a fixed sequence of builder steps, and a Builder *interface* so one director can produce different representations.",
      m: H.cd(["classDiagram",
        "  class Pizza { -Size size; -Crust crust; -List~String~ toppings; -boolean extraCheese; -Pizza(Builder b); +price() long }",
        "  class Builder { -Size size; -Crust crust; -List~String~ toppings; -boolean extraCheese; +Builder(Size s, Crust c); +topping(String t) Builder; +extraCheese() Builder; +build() Pizza }",
        "  class Client",
        "  note for Builder \"static nested class Pizza.Builder\"",
        "  Builder ..> Pizza : build()",
        "  Client ..> Builder : fluent calls"]),
      roles: [["Product", "Immutable result; private constructor copying from the builder"], ["Builder", "Mutable staging area: required args in its constructor, fluent setters for optional parts, `build()` validates and creates"], ["Director (GoF, optional)", "Encodes a standard construction sequence (\"Margherita\", \"standard REST GET\") using the builder interface"], ["Client", "Chains builder calls, then calls `build()`"]],
      points: ["UML draws a nested class with a circled-plus line; here a note marks `Builder` as `Pizza.Builder`", "Builders are usually not thread-safe and not reused; the products are safe to share because they're immutable"] },
    impl: {
      title: "Java implementation: an immutable Pizza with a validating builder",
      text: "This is the version to write in interviews. Required fields go in the builder's constructor, so they can't be forgotten; optional ones have defaults; `build()` checks rules that span fields; the product copies collections so it stays immutable. The widget below runs exactly these rules.",
      code: `enum Size { SMALL, MEDIUM, LARGE }
enum Crust { THIN, PAN, STUFFED }

final class Pizza {
    private final Size size; private final Crust crust;
    private final List<String> toppings; private final boolean extraCheese; private final String coupon;

    private Pizza(Builder b) {
        size = b.size; crust = b.crust; toppings = List.copyOf(b.toppings);   // defensive, immutable copy
        extraCheese = b.extraCheese; coupon = b.coupon;
    }
    long subtotal() {
        long base = switch (size) { case SMALL -> 199; case MEDIUM -> 299; case LARGE -> 449; };
        return base + (crust == Crust.STUFFED ? 80 : 0) + 30L * toppings.size() + (extraCheese ? 40 : 0);
    }
    long price() { return coupon == null ? subtotal() : Math.round(subtotal() * 0.5); }
    public String toString() { return "Pizza[" + size + ", " + crust + ", " + toppings + (extraCheese ? ", extra cheese" : "") + "] ₹" + price(); }

    static final class Builder {
        private final Size size; private final Crust crust;               // required
        private final List<String> toppings = new ArrayList<>();          // optional, with defaults
        private boolean extraCheese; private String coupon;

        Builder(Size size, Crust crust) { this.size = Objects.requireNonNull(size); this.crust = Objects.requireNonNull(crust); }
        Builder topping(String t) { toppings.add(t); return this; }
        Builder extraCheese() { extraCheese = true; return this; }
        Builder coupon(String code) { coupon = code; return this; }

        Pizza build() {                                                    // cross-field validation, once
            if (crust == Crust.THIN && toppings.size() > 5) throw new IllegalStateException("thin crust supports at most 5 toppings");
            if (toppings.size() > 7 && size != Size.LARGE) throw new IllegalStateException("more than 7 toppings needs LARGE");
            Pizza p = new Pizza(this);
            if ("FIRST50".equals(coupon) && p.subtotal() < 300) throw new IllegalStateException("FIRST50 needs ₹300");
            return p;
        }
    }
}

Pizza p = new Pizza.Builder(Size.MEDIUM, Crust.PAN).topping("paneer").topping("onion").extraCheese().coupon("FIRST50").build();
System.out.println(p);
try { new Pizza.Builder(Size.SMALL, Crust.THIN).topping("a").topping("b").topping("c").topping("d").topping("e").topping("f").build(); }
catch (IllegalStateException e) { System.out.println("rejected: " + e.getMessage()); }` },
    variants: [
      { title: "Step builder: required fields enforced by the compiler",
        text: "The classic builder catches a missing required field only at runtime (`build()` throws). A **step builder** (or staged builder) uses a chain of interfaces so the IDE only offers the next legal step: you *cannot* call `build()` before setting the required fields. It's more code, so use it for public APIs where misuse is costly.",
        points: [
          "Each required step is an interface returning the next step's interface; the last one offers optional setters + `build()`",
          "One private class implements all the step interfaces",
          "Alternative for 1–2 required fields: put them in the builder's constructor (simpler, as in the Pizza slide)",
          "Records (Java 16+) remove the boilerplate *product*; add a nested builder only when there are many optional components"],
        code: `record Email(String from, String to, String subject, String body, List<String> cc) {
    interface From { To from(String from); }
    interface To { Subject to(String to); }
    interface Subject { Extras subject(String s); }
    interface Extras { Extras body(String b); Extras cc(String c); Email build(); }

    static From builder() { return new Steps(); }

    private static final class Steps implements From, To, Subject, Extras {
        private String from, to, subject, body = ""; private final List<String> cc = new ArrayList<>();
        public To from(String f) { from = f; return this; }
        public Subject to(String t) { to = t; return this; }
        public Extras subject(String s) { subject = s; return this; }
        public Extras body(String b) { body = b; return this; }
        public Extras cc(String c) { cc.add(c); return this; }
        public Email build() { return new Email(from, to, subject, body, List.copyOf(cc)); }
    }
}

Email e = Email.builder().from("noreply@shop.in").to("asha@mail.com").subject("Order shipped").cc("ops@shop.in").build();
System.out.println(e);
// Email.builder().from("x").build();   // does not compile: build() isn't offered yet` },
      { title: "GoF Builder with a Director: one recipe, many representations",
        text: "The original GoF intent: a **Director** knows the *sequence* of construction steps; different **ConcreteBuilders** turn the same steps into different products. A receipt director can produce plain text for a thermal printer, HTML for email, or a JSON payload, without the director changing.",
        m: H.cd(["classDiagram",
          "  class ReceiptDirector { +build(Order o, ReceiptBuilder b) void }",
          "  class ReceiptBuilder { <<interface>>; +header(String store) void; +line(String item, long amount) void; +total(long amount) void }",
          "  class TextReceiptBuilder { +result() String }",
          "  class HtmlReceiptBuilder { +result() String }",
          "  ReceiptDirector ..> ReceiptBuilder : drives steps",
          "  ReceiptBuilder <|.. TextReceiptBuilder",
          "  ReceiptBuilder <|.. HtmlReceiptBuilder"]),
        points: ["The director encodes **order and policy** (header first, lines, then total); builders encode **representation**", "Products may not share an interface (String vs JSON node), so each builder exposes its own `result()`", "Today this is less common than the fluent builder, but it's what the GoF book means"],
        code: `record Item(String name, long amount) {}
interface ReceiptBuilder { void header(String store); void line(String item, long amount); void total(long amount); }

class TextReceiptBuilder implements ReceiptBuilder {
    private final StringBuilder sb = new StringBuilder();
    public void header(String s) { sb.append(s.toUpperCase()).append('\\n'); }
    public void line(String i, long a) { sb.append(String.format("%-10s%6d%n", i, a)); }
    public void total(long a) { sb.append(String.format("%-10s%6d", "TOTAL", a)); }
    String result() { return sb.toString(); }
}
class HtmlReceiptBuilder implements ReceiptBuilder {
    private final StringBuilder sb = new StringBuilder();
    public void header(String s) { sb.append("<h2>").append(s).append("</h2><ul>"); }
    public void line(String i, long a) { sb.append("<li>").append(i).append(": ").append(a).append("</li>"); }
    public void total(long a) { sb.append("</ul><b>Total ").append(a).append("</b>"); }
    String result() { return sb.toString(); }
}
class ReceiptDirector {                                   // the fixed recipe
    void build(String store, List<Item> items, ReceiptBuilder b) {
        b.header(store);
        items.forEach(i -> b.line(i.name(), i.amount()));
        b.total(items.stream().mapToLong(Item::amount).sum());
    }
}

List<Item> items = List.of(new Item("Dosa", 120), new Item("Coffee", 40));
TextReceiptBuilder text = new TextReceiptBuilder(); HtmlReceiptBuilder html = new HtmlReceiptBuilder();
new ReceiptDirector().build("Udupi Cafe", items, text);
new ReceiptDirector().build("Udupi Cafe", items, html);
System.out.println(text.result());
System.out.println(html.result());` },
      { title: "Builders with inheritance, toBuilder() and Lombok",
        text: "Three practical extras that come up in reviews and interviews.",
        points: [
          "**Hierarchies**: a generic self-type `Builder<T extends Builder<T>>` with an abstract `self()` lets subclass builders keep fluent chaining (*Effective Java* Item 2's `Pizza`/`NyPizza` example)",
          "**toBuilder()**: copy an immutable object into a new builder, change one field, `build()` again. That's how you \"modify\" immutable objects (`HttpRequest.newBuilder(original, filter)`, Lombok `@Builder(toBuilder = true)`)",
          "**Lombok `@Builder`** generates the nested builder; add `@Singular` for collection adders and validate in a custom `build()` or the constructor",
          "Builders are cheap but not free: in hot loops prefer a constructor or a static factory"],
        code: `abstract class Notification {
    final String to; final String text;
    abstract static class Builder<T extends Builder<T>> {
        private String to, text;
        T to(String t) { to = t; return self(); }
        T text(String t) { text = t; return self(); }
        abstract Notification build();
        protected abstract T self();
    }
    Notification(Builder<?> b) { to = b.to; text = b.text; }
}
final class PushNotification extends Notification {
    final String deepLink;
    static final class Builder extends Notification.Builder<Builder> {
        private String deepLink = "app://home";
        Builder deepLink(String d) { deepLink = d; return this; }
        PushNotification build() { return new PushNotification(this); }
        protected Builder self() { return this; }
    }
    private PushNotification(Builder b) { super(b); deepLink = b.deepLink; }
    Builder toBuilder() { return new Builder().to(to).text(text).deepLink(deepLink); }
    public String toString() { return "Push(" + to + ", " + text + ", " + deepLink + ")"; }
}

PushNotification a = new PushNotification.Builder().to("u1").text("Order shipped").deepLink("app://orders/42").build();   // to() returns PushNotification.Builder
PushNotification b = a.toBuilder().text("Order delivered").build();    // copy-and-modify an immutable object
System.out.println(a + "\\n" + b);` }
    ],
    designs: [
      { title: "Mini LLD: an HTTP request builder for an API client",
        text: "Design the request type for an internal HTTP client library. Requests have a method and URL (required), plus headers (multi-valued), query parameters, a body, a timeout, a retry policy and an idempotency key. Rules: GET/DELETE can't have a body; POST retries require an idempotency key; the timeout must be positive. Callers in many services build requests, so the API must be hard to misuse.",
        points: [
          "`HttpReq.post(url)` / `HttpReq.get(url)` static entry points return a builder with the required parts set",
          "Headers stored case-insensitively (`TreeMap` with `CASE_INSENSITIVE_ORDER`) as lists, copied into the immutable product",
          "`RetryPolicy` is a small value object (its own tiny builder or a record); `build()` checks cross-field rules",
          "`toBuilder()` lets middleware (auth, tracing) derive a modified request without mutating the original",
          "This mirrors `java.net.http.HttpRequest.newBuilder()` and OkHttp's `Request.Builder`"],
        m: H.cd(["classDiagram",
          "  class HttpReq { -Method method; -URI uri; -Map~String, List~ headers; -String body; -Duration timeout; -RetryPolicy retry; +get(String url)$ Builder; +post(String url, String body)$ Builder; +toBuilder() Builder }",
          "  class Builder { +header(String k, String v) Builder; +query(String k, String v) Builder; +timeout(Duration d) Builder; +retry(RetryPolicy p) Builder; +idempotencyKey(String k) Builder; +build() HttpReq }",
          "  class RetryPolicy { <<record>>; -int maxAttempts; -Duration backoff }",
          "  class Method { <<enumeration>>; GET; POST; PUT; DELETE }",
          "  note for Builder \"static nested class HttpReq.Builder\"",
          "  HttpReq --> RetryPolicy",
          "  HttpReq --> Method"]),
        code: `enum Method { GET, POST, PUT, DELETE }
record RetryPolicy(int maxAttempts, Duration backoff) {
    static final RetryPolicy NONE = new RetryPolicy(1, Duration.ZERO);
}

final class HttpReq {
    final Method method; final String url; final Map<String, List<String>> headers; final String body;
    final Duration timeout; final RetryPolicy retry;

    private HttpReq(Builder b) {
        method = b.method; body = b.body; timeout = b.timeout; retry = b.retry;
        StringBuilder u = new StringBuilder(b.url);
        if (!b.query.isEmpty()) u.append('?').append(b.query.entrySet().stream().map(e -> e.getKey() + "=" + e.getValue()).collect(Collectors.joining("&")));
        url = u.toString();
        Map<String, List<String>> h = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        b.headers.forEach((k, v) -> h.put(k, List.copyOf(v)));
        headers = Collections.unmodifiableMap(h);
    }
    static Builder get(String url) { return new Builder(Method.GET, url); }
    static Builder post(String url, String body) { return new Builder(Method.POST, url).body(body); }
    Builder toBuilder() {
        Builder b = new Builder(method, url.split("\\\\?")[0]).timeout(timeout).retry(retry);
        if (body != null) b.body(body);
        headers.forEach((k, vs) -> vs.forEach(v -> b.header(k, v)));
        return b;
    }
    public String toString() { return method + " " + url + " " + headers + (body == null ? "" : " body=" + body) + " timeout=" + timeout.toMillis() + "ms retries=" + retry.maxAttempts(); }

    static final class Builder {
        private final Method method; private final String url;
        private final Map<String, List<String>> headers = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        private final Map<String, String> query = new LinkedHashMap<>();
        private String body; private Duration timeout = Duration.ofSeconds(10); private RetryPolicy retry = RetryPolicy.NONE;

        private Builder(Method m, String url) { method = Objects.requireNonNull(m); this.url = Objects.requireNonNull(url); }
        Builder header(String k, String v) { headers.computeIfAbsent(k, x -> new ArrayList<>()).add(v); return this; }
        Builder query(String k, String v) { query.put(k, v); return this; }
        Builder body(String b) { body = b; return this; }
        Builder timeout(Duration d) { timeout = d; return this; }
        Builder retry(RetryPolicy p) { retry = p; return this; }
        Builder idempotencyKey(String key) { return header("Idempotency-Key", key); }

        HttpReq build() {
            if ((method == Method.GET || method == Method.DELETE) && body != null) throw new IllegalStateException(method + " cannot have a body");
            if (timeout.isNegative() || timeout.isZero()) throw new IllegalStateException("timeout must be positive");
            if (method == Method.POST && retry.maxAttempts() > 1 && !headers.containsKey("idempotency-key"))
                throw new IllegalStateException("retrying a POST needs an Idempotency-Key");
            return new HttpReq(this);
        }
    }
}

HttpReq pay = HttpReq.post("https://api.pay.in/v1/charges", "{\\"amount\\":500}")
        .header("Authorization", "Bearer t0k3n").idempotencyKey("ord-42")
        .retry(new RetryPolicy(3, Duration.ofMillis(200))).timeout(Duration.ofSeconds(5)).build();
System.out.println(pay);
HttpReq traced = pay.toBuilder().header("X-Trace-Id", "abc123").build();       // middleware derives a copy
System.out.println(traced.headers.keySet() + " original unchanged: " + pay.headers.keySet());
try { HttpReq.post("https://x", "{}").retry(new RetryPolicy(3, Duration.ZERO)).build(); }
catch (IllegalStateException e) { System.out.println("rejected: " + e.getMessage()); }` },
      { title: "Mini LLD: a SQL query builder",
        text: "Another favourite: build `SELECT` statements safely. The builder accumulates columns, a table, `WHERE` predicates with **bound parameters** (never string-concatenated values, to avoid SQL injection), ordering and paging, and `build()` produces an immutable `Query(sql, params)`.",
        points: [
          "`where(\"city = ?\", \"Pune\")` stores the predicate and its parameter separately",
          "`build()` validates: a table is required; `limit` needs `orderBy` for deterministic pages",
          "The same builder could take a `Dialect` (Abstract Factory, F07) to render LIMIT/OFFSET differently",
          "Real-world equivalents: jOOQ's DSL, JPA Criteria API, Spring's `UriComponentsBuilder`"],
        code: `record Query(String sql, List<Object> params) {}

final class Select {
    private final List<String> cols; private String table;
    private final List<String> where = new ArrayList<>(); private final List<Object> params = new ArrayList<>();
    private String orderBy; private Integer limit, offset;

    private Select(String... cols) { this.cols = cols.length == 0 ? List.of("*") : List.of(cols); }
    static Select select(String... cols) { return new Select(cols); }
    Select from(String t) { table = t; return this; }
    Select where(String predicate, Object... values) { where.add(predicate); params.addAll(Arrays.asList(values)); return this; }
    Select orderBy(String c) { orderBy = c; return this; }
    Select page(int limit, int offset) { this.limit = limit; this.offset = offset; return this; }

    Query build() {
        if (table == null) throw new IllegalStateException("from() is required");
        if (limit != null && orderBy == null) throw new IllegalStateException("paging needs orderBy for stable pages");
        StringBuilder sql = new StringBuilder("SELECT ").append(String.join(", ", cols)).append(" FROM ").append(table);
        if (!where.isEmpty()) sql.append(" WHERE ").append(String.join(" AND ", where));
        if (orderBy != null) sql.append(" ORDER BY ").append(orderBy);
        if (limit != null) sql.append(" LIMIT ").append(limit).append(" OFFSET ").append(offset);
        return new Query(sql.toString(), List.copyOf(params));
    }
}

Query q = Select.select("id", "name").from("users").where("city = ?", "Pune").where("age >= ?", 18).orderBy("id").page(20, 40).build();
System.out.println(q.sql() + "  " + q.params());
String hostile = "x' OR '1'='1";
System.out.println(Select.select().from("users").where("name = ?", hostile).build());   // value stays a parameter` }
    ],
    usages: [
      ["`StringBuilder` / `StringBuffer`", "Accumulate parts step by step, then `toString()` produces the immutable `String`. Builder in spirit (no separate product class)."],
      ["`java.net.http.HttpRequest.newBuilder()`", "Fluent, validated construction of an immutable request; `HttpClient.newBuilder()` likewise. `HttpRequest.newBuilder(request, filter)` (Java 16) is a toBuilder-style copy."],
      ["`Stream.builder()`, `IntStream.builder()`", "Add elements, then `build()` returns the stream; adding after `build()` throws."],
      ["`Locale.Builder`, `Calendar.Builder`", "Validated construction from many optional parts (language, region, script, variant)."],
      ["`ProcessBuilder`", "Configure command, working directory, environment and redirects, then `start()`; reusable to launch several processes."],
      ["Spring: `UriComponentsBuilder`, `ResponseEntity.ok().header(..).body(..)`, `WebClient.builder()`, `MockMvcRequestBuilders`", "Fluent builders for URIs, HTTP responses, clients and test requests."],
      ["Lombok `@Builder` / `@SuperBuilder`, Immutables, AutoValue builders", "Generated builders for DTOs and value objects, including `toBuilder()`."]
    ],
    avoid: {
      points: [
        "2–3 parameters, all required: a constructor (or a record) is clearer",
        "Objects that must be mutable and are configured over time anyway (a UI form model)",
        "Hot paths that allocate millions of objects; the extra builder allocation and copying can matter",
        "Don't hand-write builders for every DTO; use records, or let Lombok/Immutables generate them",
        "A builder with no validation and no optional parts is just ceremony"],
      pros: ["Readable, named parameters; no boolean soup", "Immutable products; no half-built state is ever visible", "One place for cross-field validation", "Defaults for optional parts; easy to add a new optional field without breaking callers", "`toBuilder()` gives copy-and-modify"],
      cons: ["Duplicate fields (product + builder) unless generated", "Missing required fields are caught at runtime unless you use a step builder", "Extra allocation", "Builders aren't thread-safe; don't share one between threads"] },
    compare: [
      ["Factory Method / Abstract Factory (F06, F07)", "Decide **which** class (or family) to create", "A factory returns an object in one call and hides the type; a builder assembles **one** object of a known type through many steps"],
      ["Prototype (F09)", "Create by copying an existing configured object", "`toBuilder()` is a builder-based alternative to cloning that also lets you change fields and re-validate"],
      ["Telescoping constructors", "Overloads for each parameter combination", "The anti-pattern Builder replaces"],
      ["JavaBeans setters", "No-arg constructor + setters", "Mutable and possibly inconsistent between setter calls; Builder keeps the product immutable"],
      ["Fluent interface", "Methods returning `this` for chaining", "A style, not a pattern: `Stream` and `Comparator` chains are fluent but aren't builders. A builder ends in `build()` and produces a separate product"],
      ["Composite (F14)", "Tree of objects treated uniformly", "Builders are often used to *construct* composites (XML/HTML DOM builders)"]],
    widget: { heading: "Interactive: build a pizza", caption: "Pick size, crust, toppings and a coupon. The Java builder chain updates live, and build() either returns an immutable Pizza or throws, exactly like the code in slide 3. Your choices are saved.", render: pizzaWidget },
    examplesHeading: "Real-world analogies and usages",
    examples: [
      ["Analogy: Subway or a burrito counter", "Named steps in a natural order, optional extras, a final check at the till, and you receive the finished product only at the end."],
      ["Analogy: a house built from a plan", "The architect's plan is the Director; different contractors (Builders) can build it in brick or timber. Same steps, different representation."],
      ["`HttpRequest.newBuilder()`", "Required URI, optional headers, timeout and method with a body publisher; `build()` gives an immutable request you can send many times."],
      ["`StringBuilder`", "The everyday builder: append parts, then `toString()` for the immutable result."],
      ["`ProcessBuilder`", "Configure once, `start()` many processes; a builder that is reused deliberately."],
      ["Spring `ResponseEntity`", "`ResponseEntity.status(201).header(\"Location\", uri).body(dto)` builds an HTTP response fluently."],
      ["Lombok `@Builder(toBuilder = true)`", "Generated builders for request/response DTOs, with copy-and-modify for immutable objects."]
    ],
    pitfalls: [
      "Validating in each setter instead of in `build()`: cross-field rules (thin crust ≤ 5 toppings) need all fields",
      "Exposing the builder's mutable list to the product, so later builder calls change a \"built\" object; copy with `List.copyOf`",
      "Leaving setters or public fields on the product, which makes the builder pointless",
      "Required fields as optional builder methods with no check, so `build()` returns half-initialised objects",
      "Reusing or sharing one builder across threads",
      "Builders for 2-field classes; records are enough",
      "Calling any chained API a \"Builder\" (Streams are fluent, not builders)",
      "Forgetting `toBuilder()` and then adding setters to \"just change one field\""
    ],
    quiz: [
      { q: "Which problem does Builder primarily solve?", options: ["Choosing among subclasses at runtime", "Constructing an object with many (often optional) parts readably and safely, usually producing an immutable result", "Sharing instances to save memory", "Notifying observers"], answer: 1, why: "Telescoping constructors and half-built JavaBeans are the classic problems." },
      { q: "Where should a rule like \"thin crust allows at most 5 toppings\" be checked?", options: ["In `topping()`", "In `build()`, before calling the product's private constructor", "In the client", "Nowhere"], answer: 1, why: "Cross-field rules need the complete set of values; `build()` sees them all once." },
      { q: "Why copy the builder's list with `List.copyOf` in the product constructor?", options: ["Performance", "So the product is immutable and later builder calls can't change an already-built object", "Lists can't be passed", "To sort it"], answer: 1, why: "Sharing the mutable list would leak builder state into the product." },
      { q: "A step builder's main advantage is…", options: ["Fewer classes", "Missing required fields become compile errors because `build()` isn't reachable until they're set", "Thread safety", "Faster object creation"], answer: 1, why: "Interfaces chain the required steps; the compiler enforces order." },
      { q: "In the GoF Builder, the Director…", options: ["Is the product", "Encodes the sequence of construction steps and drives a builder interface, so different builders produce different representations", "Validates fields", "Is a singleton"], answer: 1, why: "Same recipe, different builders (text vs HTML receipts)." },
      { q: "Which JDK type is **not** a builder?", options: ["`HttpRequest.Builder`", "`Locale.Builder`", "`Stream.Builder`", "`Comparator.comparing(..).thenComparing(..)`"], answer: 3, why: "Comparator chaining is a fluent interface that composes functions; it has no separate builder and product with `build()`." },
      { q: "How do you \"change\" one field of an immutable object built with a builder?", options: ["Reflection", "`toBuilder()` → change the field → `build()` a new object", "Add a setter", "Cast it to the builder"], answer: 1, why: "Copy-and-modify keeps the original unchanged and re-runs validation." },
      { q: "For `record Point(int x, int y)`, a builder is…", options: ["Required", "Overkill: two required fields, no options, no cross-field rules", "Needed for immutability", "Needed for equals/hashCode"], answer: 1, why: "Records already give you an immutable value with a canonical constructor." }
    ],
    cheatsheet: {
      table: [
        ["Part", "Rule", "Example"],
        ["Product", "`final` class or record, private constructor taking the builder, no setters", "`private Pizza(Builder b)`"],
        ["Required fields", "builder constructor args (or step interfaces)", "`new Builder(Size.L, Crust.THIN)`"],
        ["Optional fields", "fluent methods returning `this`, sensible defaults", "`.topping(\"paneer\").extraCheese()`"],
        ["Validation", "all cross-field checks in `build()`", "thin ≤ 5 toppings"],
        ["Collections", "copy into the product (`List.copyOf`)", "immutable result"],
        ["Copy-and-modify", "`toBuilder()`", "`req.toBuilder().header(..).build()`"]],
      cards: [
        { title: "Use when", items: ["4+ params, several optional", "Same-typed params side by side", "Cross-field invariants", "Immutable result wanted", "Public API used by many callers"] },
        { title: "Variants", items: ["Fluent static nested builder", "Step (staged) builder", "GoF Director + Builder interface", "Generic self-typed builders for hierarchies", "Lombok/Immutables generated"] },
        { title: "Interview lines", items: ["\"Required args in the builder's constructor\"", "\"Validation in build(), product immutable\"", "\"toBuilder for changes\"", "\"For two fields I'd just use a record\""] }]
    },
    practice: [
      { level: "Easy", q: "Explain the telescoping-constructor and JavaBeans problems, and how Builder fixes both.",
        a: ["**Telescoping constructors**: one overload per combination of optional parameters. They grow combinatorially, and positional arguments of the same type (`true, false`, two `String`s) can be swapped silently.",
          "**JavaBeans**: a no-arg constructor plus setters. Readable, but the object is mutable and **inconsistent between setter calls**, can't be made immutable, and cross-field validation has no natural home.",
          "**Builder**: named steps (readable like setters), required fields enforced in the builder's constructor, validation in `build()`, and an immutable product created in one shot (safe like a constructor)."] },
      { level: "Easy", q: "Refactor this class to use a builder. `id` and `email` are required; everything else is optional with defaults (`role = USER`, `active = true`, no phone, no tags).",
        qcode: `class User {
    User(String id, String email, String name, String phone, String role, boolean active, boolean verified, Set<String> tags) { }
}
new User("u1", "a@x.in", null, null, "ADMIN", true, false, null);   // what is null here? which boolean?`,
        code: `enum Role { USER, ADMIN }
final class User {
    private final String id, email, name, phone; private final Role role; private final boolean active, verified; private final Set<String> tags;
    private User(Builder b) { id = b.id; email = b.email; name = b.name; phone = b.phone; role = b.role; active = b.active; verified = b.verified; tags = Set.copyOf(b.tags); }
    static Builder builder(String id, String email) { return new Builder(id, email); }
    public String toString() { return id + " " + email + " " + role + " active=" + active + " tags=" + tags; }

    static final class Builder {
        private final String id, email; private String name, phone; private Role role = Role.USER;
        private boolean active = true, verified; private final Set<String> tags = new HashSet<>();
        private Builder(String id, String email) {
            if (!email.contains("@")) throw new IllegalArgumentException("bad email");
            this.id = id; this.email = email;
        }
        Builder name(String n) { name = n; return this; }
        Builder phone(String p) { phone = p; return this; }
        Builder role(Role r) { role = r; return this; }
        Builder inactive() { active = false; return this; }
        Builder verified() { verified = true; return this; }
        Builder tag(String t) { tags.add(t); return this; }
        User build() { return new User(this); }
    }
}

System.out.println(User.builder("u1", "a@x.in").role(Role.ADMIN).tag("beta").build());` },
      { level: "Medium", q: "A fast-food app sells custom meals and standard combos (Veg Combo, Chicken Combo). Use a builder for meals and a Director for the standard combos so the combo recipes live in one place.",
        code: `record Meal(String main, String side, String drink, boolean dessert, long price) {}

class MealBuilder {
    private String main, side = "none", drink = "water"; private boolean dessert; private long price;
    MealBuilder main(String m, long p) { main = m; price += p; return this; }
    MealBuilder side(String s, long p) { side = s; price += p; return this; }
    MealBuilder drink(String d, long p) { drink = d; price += p; return this; }
    MealBuilder dessert(long p) { dessert = true; price += p; return this; }
    MealBuilder discountPercent(int pct) { price = price * (100 - pct) / 100; return this; }
    Meal build() { if (main == null) throw new IllegalStateException("a meal needs a main"); return new Meal(main, side, drink, dessert, price); }
}

class ComboDirector {                                  // the standard recipes, in one place
    Meal vegCombo() { return new MealBuilder().main("Veg burger", 120).side("Fries", 60).drink("Cola", 50).discountPercent(10).build(); }
    Meal chickenCombo() { return new MealBuilder().main("Chicken burger", 160).side("Fries", 60).drink("Cola", 50).dessert(40).discountPercent(15).build(); }
}

ComboDirector d = new ComboDirector();
System.out.println(d.vegCombo());
System.out.println(d.chickenCombo());
System.out.println(new MealBuilder().main("Wrap", 140).drink("Lassi", 40).build());   // custom meal` },
      { level: "Medium", q: "Design an `Order` builder for an e-commerce checkout: line items (add, or increase quantity of an existing SKU), shipping address, payment method, optional coupon and gift note. `build()` must reject empty carts, COD above ₹50,000 and gift notes over 200 characters.",
        m: H.cd(["classDiagram",
          "  class Order { -List~Line~ lines; -Address shipTo; -PaymentMethod pay; -String coupon; -String giftNote; +total() long }",
          "  class Builder { -Map~String, Line~ lines; +add(String sku, int qty, long price) Builder; +shipTo(Address a) Builder; +pay(PaymentMethod p) Builder; +coupon(String c) Builder; +giftNote(String n) Builder; +build() Order }",
          "  class Line { <<record>>; -String sku; -int qty; -long unitPrice }",
          "  note for Builder \"static nested class Order.Builder\"",
          "  Order *-- Line"]),
        code: `enum PaymentMethod { UPI, CARD, COD }
record Address(String line1, String pin) {}
record Line(String sku, int qty, long unitPrice) { long subtotal() { return qty * unitPrice; } }

final class Order {
    final List<Line> lines; final Address shipTo; final PaymentMethod pay; final String giftNote;
    private Order(Builder b) { lines = List.copyOf(b.lines.values()); shipTo = b.shipTo; pay = b.pay; giftNote = b.giftNote; }
    long total() { return lines.stream().mapToLong(Line::subtotal).sum(); }

    static final class Builder {
        private final Map<String, Line> lines = new LinkedHashMap<>();
        private Address shipTo; private PaymentMethod pay = PaymentMethod.UPI; private String giftNote;
        Builder add(String sku, int qty, long price) {
            lines.merge(sku, new Line(sku, qty, price), (a, b) -> new Line(sku, a.qty() + b.qty(), price));
            return this;
        }
        Builder shipTo(Address a) { shipTo = a; return this; }
        Builder pay(PaymentMethod p) { pay = p; return this; }
        Builder giftNote(String n) { giftNote = n; return this; }
        Order build() {
            if (lines.isEmpty()) throw new IllegalStateException("cart is empty");
            if (shipTo == null) throw new IllegalStateException("shipping address required");
            Order o = new Order(this);
            if (pay == PaymentMethod.COD && o.total() > 50_000) throw new IllegalStateException("COD limit is ₹50,000");
            if (giftNote != null && giftNote.length() > 200) throw new IllegalStateException("gift note too long");
            return o;
        }
    }
}

Order o = new Order.Builder().add("PEN", 2, 20).add("PEN", 1, 20).add("BAG", 1, 1500).shipTo(new Address("MG Road", "560001")).build();
System.out.println(o.lines + " total=" + o.total());
try { new Order.Builder().add("TV", 1, 60_000).shipTo(new Address("x", "1")).pay(PaymentMethod.COD).build(); }
catch (IllegalStateException e) { System.out.println("rejected: " + e.getMessage()); }` },
      { level: "Medium", q: "Is a builder thread-safe? Is the product? What would you document for a builder in a shared library?",
        a: ["**Builders are not thread-safe** by design: they're mutable staging objects meant to be used by one thread, briefly. Don't store one in a field shared by threads, and don't reuse one after `build()` unless documented (like `ProcessBuilder`).",
          "**The product should be immutable**: all fields `final`, collections copied with `List.copyOf`/`Map.copyOf`, no setters, no leaking of mutable internals. Then it's safely shareable across threads after construction (final-field semantics guarantee visibility).",
          "Document: required vs optional parts and defaults, the validation rules and the exception type `build()` throws, whether the builder may be reused, and that it's not thread-safe."] },
      { level: "Medium", q: "Build SMS and email notifications with one builder API, where `build()` applies **channel-specific** rules: SMS ≤ 160 characters and no subject; email needs a subject. Template placeholders like `{name}` are filled from variables.",
        code: `enum Channel { SMS, EMAIL }
record Message(Channel channel, String to, String subject, String body) {}

final class MessageBuilder {
    private final Channel channel; private final String to;
    private String subject, template = ""; private final Map<String, String> vars = new HashMap<>();
    private MessageBuilder(Channel c, String to) { channel = c; this.to = to; }
    static MessageBuilder sms(String phone) { return new MessageBuilder(Channel.SMS, phone); }
    static MessageBuilder email(String address) { return new MessageBuilder(Channel.EMAIL, address); }
    MessageBuilder subject(String s) { subject = s; return this; }
    MessageBuilder template(String t) { template = t; return this; }
    MessageBuilder var(String k, String v) { vars.put(k, v); return this; }

    Message build() {
        String body = template;
        for (var e : vars.entrySet()) body = body.replace("{" + e.getKey() + "}", e.getValue());
        if (body.contains("{")) throw new IllegalStateException("unfilled placeholder in: " + body);
        switch (channel) {
            case SMS -> { if (subject != null) throw new IllegalStateException("SMS has no subject");
                          if (body.length() > 160) throw new IllegalStateException("SMS over 160 chars"); }
            case EMAIL -> { if (subject == null || subject.isBlank()) throw new IllegalStateException("email needs a subject"); }
        }
        return new Message(channel, to, subject, body);
    }
}

System.out.println(MessageBuilder.sms("+91-98xxxx").template("Hi {name}, OTP {otp}").var("name", "Asha").var("otp", "4821").build());
System.out.println(MessageBuilder.email("asha@mail.com").subject("Order shipped").template("Order {id} is on the way").var("id", "42").build());
try { MessageBuilder.email("a@b.c").template("Hi {name}").build(); } catch (IllegalStateException e) { System.out.println("rejected: " + e.getMessage()); }` },
      { level: "Hard", q: "Build an immutable `AppConfig` from **layered sources**: defaults < config file < environment variables < command-line flags (later layers win). Unknown keys and invalid values should fail at startup with every problem listed, not just the first.",
        steps: [["Builder as accumulator", "`ConfigBuilder.layer(name, Map)` merges a source over the current values and remembers which layer set each key (for debugging: \"port came from ENV\")."],
          ["Validation in build()", "Collect *all* errors (unknown keys, non-numeric port, pool size range) into one exception message."],
          ["Product", "An immutable `AppConfig` with typed getters; `describe()` shows the source of each value."]],
        code: `record AppConfig(int port, int poolSize, String dbUrl, Map<String, String> sources) {}

final class ConfigBuilder {
    private static final Set<String> KNOWN = Set.of("port", "pool.size", "db.url");
    private final Map<String, String> values = new HashMap<>(), sourceOf = new TreeMap<>();
    private final List<String> errors = new ArrayList<>();

    ConfigBuilder layer(String name, Map<String, String> src) {
        src.forEach((k, v) -> {
            if (!KNOWN.contains(k)) { errors.add(name + ": unknown key '" + k + "'"); return; }
            values.put(k, v); sourceOf.put(k, name);
        });
        return this;
    }
    private int intVal(String k, int min, int max) {
        try { int v = Integer.parseInt(values.get(k)); if (v < min || v > max) errors.add(k + " out of range [" + min + "," + max + "]"); return v; }
        catch (NumberFormatException e) { errors.add(k + " is not a number: " + values.get(k)); return -1; }
    }
    AppConfig build() {
        int port = intVal("port", 1, 65535), pool = intVal("pool.size", 1, 200);
        if (!values.getOrDefault("db.url", "").startsWith("jdbc:")) errors.add("db.url must start with jdbc:");
        if (!errors.isEmpty()) throw new IllegalStateException("config invalid:\\n  " + String.join("\\n  ", errors));
        return new AppConfig(port, pool, values.get("db.url"), Map.copyOf(sourceOf));
    }
}

AppConfig cfg = new ConfigBuilder()
        .layer("defaults", Map.of("port", "8080", "pool.size", "10", "db.url", "jdbc:h2:mem"))
        .layer("file", Map.of("db.url", "jdbc:postgresql://db/app"))
        .layer("env", Map.of("pool.size", "32"))
        .layer("cli", Map.of("port", "9090"))
        .build();
System.out.println(cfg);
try { new ConfigBuilder().layer("defaults", Map.of("port", "80x", "pool.size", "500", "colour", "red")).build(); }
catch (IllegalStateException e) { System.out.println(e.getMessage()); }` },
      { level: "Hard", q: "Your tests create `User`, `Order` and `Payment` objects with 10+ fields in every test, and a new required field broke 200 tests. Apply the **Test Data Builder** pattern so tests state only what matters.",
        a: ["A test data builder (Nat Pryce / *Growing Object-Oriented Software*) starts with **valid defaults for every field**, and each test overrides only the fields relevant to it: `anOrder().withStatus(SHIPPED).build()`.",
          "A new required field gets a default in **one place** (the builder), so existing tests don't change.",
          "Builders compose: `anOrder().by(aUser().withRole(ADMIN))`.",
          "Keep them in test code, separate from production builders; they may set fields production code wouldn't allow directly."],
        code: `enum Status { NEW, SHIPPED, CANCELLED }
record User(String id, String email, boolean admin) {}
record Order(String id, User user, Status status, long amount, LocalDate placedOn) {}

final class UserBuilder {
    private String id = "u-1", email = "test@example.com"; private boolean admin;
    static UserBuilder aUser() { return new UserBuilder(); }
    UserBuilder admin() { admin = true; return this; }
    UserBuilder withEmail(String e) { email = e; return this; }
    User build() { return new User(id, email, admin); }
}
final class OrderBuilder {
    private String id = "o-1"; private UserBuilder user = UserBuilder.aUser(); private Status status = Status.NEW;
    private long amount = 1000; private LocalDate placedOn = LocalDate.of(2026, 1, 1);
    static OrderBuilder anOrder() { return new OrderBuilder(); }
    OrderBuilder by(UserBuilder u) { user = u; return this; }
    OrderBuilder withStatus(Status s) { status = s; return this; }
    OrderBuilder withAmount(long a) { amount = a; return this; }
    Order build() { return new Order(id, user.build(), status, amount, placedOn); }
}

// Each test states only what it's about:
Order bigAdminOrder = OrderBuilder.anOrder().by(UserBuilder.aUser().admin()).withAmount(99_000).build();
Order cancelled = OrderBuilder.anOrder().withStatus(Status.CANCELLED).build();
System.out.println(bigAdminOrder);
System.out.println(cancelled.status() + " " + cancelled.user().email());` }
    ],
    recap: [
      "Builder = build one complex object step by step: named optional parts, required ones in the builder's constructor, validation in `build()`.",
      "The product is immutable: private constructor, final fields, copied collections. The builder is mutable and single-threaded.",
      "Variants: fluent static nested builder (default), step builder (compile-time required fields), GoF Director + builder interface (one recipe, many representations), generic builders for hierarchies, `toBuilder()`.",
      "JDK/Spring: `StringBuilder`, `HttpRequest.newBuilder()`, `Stream.builder()`, `Locale.Builder`, `ProcessBuilder`, `UriComponentsBuilder`, `ResponseEntity`, Lombok `@Builder`.",
      "Builder decides *how* to assemble one object; factories decide *which* class. For 2–3 required fields, just use a record."
    ]
  });
})();
