/* Lesson S04: REST controllers with Spring MVC */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Every response below was recorded with Spring Framework 6.2 MockMvc (standaloneSetup) against the controller shown.
  // Status, headers and body are real; in a full Boot app the error responses also get a JSON body from Boot's
  // error handling (or ProblemDetail, lesson S05).
  var REC = {"get42": {"status": 200, "headers": "Content-Type: application/json", "body": "{\"id\":42,\"item\":\"chai\",\"qty\":2,\"status\":\"PAID\"}", "err": ""}, "get999": {"status": 404, "headers": "", "body": "", "err": "order 999 not found"}, "getabc": {"status": 400, "headers": "", "body": "", "err": ""}, "list": {"status": 200, "headers": "Content-Type: application/json", "body": "[{\"id\":42,\"item\":\"chai\",\"qty\":2,\"status\":\"PAID\"},{\"id\":44,\"item\":\"dosa\",\"qty\":1,\"status\":\"PAID\"}]", "err": ""}, "post": {"status": 201, "headers": "Location: /api/orders/100; Content-Type: application/json", "body": "{\"id\":100,\"item\":\"vada pav\",\"qty\":3,\"status\":\"NEW\"}", "err": ""}, "postnoct": {"status": 415, "headers": "", "body": "", "err": "Content-Type 'application/octet-stream' is not supported."}, "postbad": {"status": 400, "headers": "", "body": "", "err": ""}, "put": {"status": 405, "headers": "Allow: DELETE, GET", "body": "", "err": "Method 'PUT' is not supported."}, "xml": {"status": 406, "headers": "", "body": "", "err": "Acceptable representations: [application/json, application/*+json]."}, "delete": {"status": 204, "headers": "", "body": "", "err": ""}, "unknown": {"status": 404, "headers": "", "body": "", "err": "No endpoint GET /api/customers/7."}};
  var REQS = [
    { k: "get42", req: "GET /api/orders/42", handler: "one(42)", stage: "ok", why: "Path variable `{id}` converted to `long`; the returned record is written as JSON by Jackson." },
    { k: "list", req: "GET /api/orders?status=PAID&size=5", handler: "list(\"PAID\", 0, 5)", stage: "ok", why: "Query parameters bind to `@RequestParam`s; missing ones take their `defaultValue`." },
    { k: "post", req: "POST /api/orders\nContent-Type: application/json\n\n{\"item\":\"vada pav\",\"qty\":3}", handler: "create(NewOrder)", stage: "ok", why: "`@RequestBody` is read by Jackson; `ResponseEntity.created(uri)` gives **201** with a `Location` header." },
    { k: "delete", req: "DELETE /api/orders/43", handler: "delete(43)", stage: "ok", why: "`ResponseEntity.noContent()` → **204** with no body." },
    { k: "get999", req: "GET /api/orders/999", handler: "one(999)", stage: "handler", why: "The handler threw `ResponseStatusException(NOT_FOUND)`, which Spring turns into **404**." },
    { k: "getabc", req: "GET /api/orders/abc", handler: "one(?)", stage: "binding", why: "\"abc\" can't be converted to `long`: `MethodArgumentTypeMismatchException` → **400** before the method runs." },
    { k: "postbad", req: "POST /api/orders\nContent-Type: application/json\n\n{\"item\":\"vada pav\",\"qty\":", handler: "create(?)", stage: "binding", why: "Malformed JSON: `HttpMessageNotReadableException` → **400**." },
    { k: "postnoct", req: "POST /api/orders\n(no Content-Type)\n\n{\"item\":\"vada pav\",\"qty\":3}", handler: "create(?)", stage: "binding", why: "No converter reads `application/octet-stream` into `NewOrder`: **415 Unsupported Media Type**." },
    { k: "xml", req: "GET /api/orders/42\nAccept: application/xml", handler: "one(42)", stage: "negotiation", why: "Only JSON converters are registered, so the requested representation can't be produced: **406 Not Acceptable**." },
    { k: "put", req: "PUT /api/orders/42", handler: "none", stage: "mapping", why: "The path exists but not for PUT: **405 Method Not Allowed** with an `Allow` header listing what is supported." },
    { k: "unknown", req: "GET /api/customers/7", handler: "none", stage: "mapping", why: "No handler matches the path at all: **404**." }
  ];
  var CTRL = "@RestController\n@RequestMapping(\"/api/orders\")\nclass OrderController {\n    @GetMapping(\"/{id}\")  Order one(@PathVariable long id) { … 404 if missing }\n    @GetMapping          List<Order> list(@RequestParam(defaultValue = \"\") String status,\n                                      @RequestParam(defaultValue = \"0\") int page,\n                                      @RequestParam(defaultValue = \"10\") int size) { … }\n    @PostMapping         ResponseEntity<Order> create(@RequestBody NewOrder req) { … 201 + Location }\n    @DeleteMapping(\"/{id}\") ResponseEntity<Void> delete(@PathVariable long id) { … 204 }\n}";
  function s04Widget(el, ctx) {
    var s = ctx.state; if (!s.k) s.k = "get42";
    el.innerHTML = "<pre class='code' data-r='ctrl'></pre><div class='btnrow' data-r='reqs' style='margin-top:8px'>" + REQS.map(function (r) { return "<button type='button' class='btn' data-k='" + r.k + "'>" + ctx.esc(r.req.split("\n")[0]) + (r.req.indexOf("\n") > 0 ? " …" : "") + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='req' style='margin-top:8px'></pre><div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><pre class='code' data-r='resp'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("ctrl").innerHTML = ctx.H.highlight(CTRL, "java");
    function draw() {
      var r = REQS.filter(function (x) { return x.k === s.k; })[0], rec = REC[r.k];
      q("reqs").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b.dataset.k === s.k); });
      q("req").textContent = r.req;
      var order = ["mapping", "binding", "handler", "negotiation"], fail = r.stage === "ok" ? -1 : order.indexOf(r.stage);
      var names = ["HandlerMapping<br/>match path + method", "argument resolvers<br/>path vars, params, body", "controller method<br/>" + r.handler, "message converters<br/>write response"];
      var L = ["flowchart LR", "  D[\"DispatcherServlet\"]:::c"];
      names.forEach(function (n, i) { L.push("  S" + i + "[\"" + n + "\"]:::" + (fail === i ? "bad" : fail >= 0 && i > fail ? "skip" : "ok")); L.push("  " + (i ? "S" + (i - 1) : "D") + " --> S" + i); });
      L.push("  R[\"" + rec.status + "\"]:::" + (rec.status < 400 ? "ok" : "bad"), "  " + (fail >= 0 ? "S" + fail : "S3") + " --> R");
      L.push("  classDef c fill:#dbeafe,stroke:#2563eb", "  classDef ok fill:#e8f5e9,stroke:#2e7d32", "  classDef bad fill:#ffebee,stroke:#c62828", "  classDef skip fill:#f3f4f6,stroke:#d1d5db,color:#9ca3af");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("res").innerHTML = ctx.md("**" + rec.status + "**. " + r.why);
      q("resp").textContent = "HTTP " + rec.status + (rec.headers ? "\n" + rec.headers.split("; ").join("\n") : "") + (rec.body ? "\n\n" + rec.body : "") + (rec.err ? "\n\n(error reason: " + rec.err + ")" : "");
    }
    q("reqs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.k = b.dataset.k; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "How a request reaches your controller",
      text: "Spring MVC is built around one servlet, the **`DispatcherServlet`**. For each request it asks the **handler mappings** which controller method matches the path and HTTP method, uses **argument resolvers** to build the method's parameters (path variables, query params, headers, the JSON body via **`HttpMessageConverter`s**), invokes the method, and writes the return value back through a converter chosen by **content negotiation**. `@RestController` = `@Controller` + `@ResponseBody`: return values are the response body, not view names. The widget shows where each kind of failure (404, 405, 400, 415, 406) happens in this pipeline.",
      m: M(["flowchart LR",
        "  C[\"HTTP request\"]:::s1 --> F[\"filters\"]:::s3 --> D[\"DispatcherServlet\"]:::s2",
        "  D --> HM[\"HandlerMapping<br/>path + method\"]:::s2 --> AR[\"argument resolvers<br/>+ converters\"]:::s2 --> M1[\"@RestController method\"]:::s4",
        "  M1 --> W[\"message converter<br/>(Jackson → JSON)\"]:::s2 --> R[\"HTTP response\"]:::s1",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `record Greeting(String message) { }
@RestController
class HelloController {
    @GetMapping("/hello") Greeting hello() { return new Greeting("namaste"); }   // record → JSON
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new HelloController()).build();
var res = mvc.perform(get("/hello")).andReturn().getResponse();
System.out.println(res.getStatus() + " " + res.getContentType() + " " + res.getContentAsString());`,
      analogy: "The DispatcherServlet is a hotel front desk: it reads the request slip, finds the right department (handler mapping), fills in the forms that department needs (argument resolvers), and translates the department's answer into the guest's language (message converters)." },
    { title: "Mappings, path variables and query parameters",
      text: "Map with `@GetMapping`, `@PostMapping`, `@PutMapping`, `@PatchMapping`, `@DeleteMapping` (shortcuts for `@RequestMapping(method = …)`), with a class-level `@RequestMapping` prefix. **`@PathVariable`** binds URI template segments (`/orders/{id}`) and identifies a resource; **`@RequestParam`** binds query parameters for filtering, sorting and paging (`required`, `defaultValue`, or `Optional<T>`); **`@RequestHeader`** reads headers. Types are converted automatically; a failed conversion is a 400 before your code runs. Compile with `-parameters` (Boot's default) so names can be inferred.",
      code: `@RestController
@RequestMapping("/api/trains")
class TrainController {
    @GetMapping("/{number}/seats")
    String seats(@PathVariable int number, @RequestParam(defaultValue = "SL") String coach,
                 @RequestParam Optional<LocalDate> date, @RequestHeader(name = "Accept-Language", defaultValue = "en") String lang) {
        return "train " + number + ", coach " + coach + ", date " + date.map(Object::toString).orElse("today") + ", lang " + lang;
    }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new TrainController()).build();
System.out.println(mvc.perform(get("/api/trains/12951/seats").param("coach", "3A").param("date", "2026-12-01").header("Accept-Language", "hi")).andReturn().getResponse().getContentAsString());
System.out.println(mvc.perform(get("/api/trains/12951/seats")).andReturn().getResponse().getContentAsString());
System.out.println("non-numeric train → " + mvc.perform(get("/api/trains/rajdhani/seats")).andReturn().getResponse().getStatus());` },
    { title: "Request bodies and JSON",
      text: "`@RequestBody` deserialises the body with the `HttpMessageConverter` matching the request's `Content-Type`, normally Jackson for `application/json`. **Records** make good request and response DTOs: immutable and concise, and Jackson binds them by constructor. Keep **DTOs separate from JPA entities**, so the API doesn't leak database structure or allow over-posting (clients setting fields like `role` or `id`). Unknown JSON fields are ignored by Boot's default `ObjectMapper`; malformed JSON is a 400 (`HttpMessageNotReadableException`).",
      code: `record CreateBooking(String pnr, List<String> passengers, int berths) { }
record BookingView(String pnr, int passengerCount, String status) { }
@RestController
class BookingController {
    @PostMapping("/api/bookings")
    BookingView create(@RequestBody CreateBooking req) { return new BookingView(req.pnr(), req.passengers().size(), "CONFIRMED"); }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new BookingController()).build();
var res = mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON)
        .content("{\\"pnr\\":\\"4521\\",\\"passengers\\":[\\"Asha\\",\\"Ravi\\"],\\"berths\\":2,\\"role\\":\\"ADMIN\\"}")).andReturn().getResponse();
System.out.println(res.getStatus() + " " + res.getContentAsString() + "   (unknown 'role' ignored)");` },
    { title: "ResponseEntity and status codes",
      text: "Return a plain object for 200 OK, or **`ResponseEntity<T>`** to control status, headers and body: `ResponseEntity.created(uri).body(dto)` for **201** with `Location`, `noContent()` for **204**, `status(HttpStatus.CONFLICT)`. Alternatively annotate with `@ResponseStatus` or throw `ResponseStatusException`. Choose codes precisely: clients, gateways and monitoring rely on them. Error bodies are covered in S05 (`ProblemDetail`).",
      table: [["Code", "Meaning", "Typical use"],
        ["200 OK", "Success with body", "GET, PUT/PATCH returning the resource"],
        ["201 Created", "Resource created", "POST; Location header points to it"],
        ["204 No Content", "Success, no body", "DELETE, some PUTs"],
        ["400 Bad Request", "Malformed or invalid input", "Parse errors, validation (or 422)"],
        ["401 / 403", "Not authenticated / not allowed", "Missing token / wrong role"],
        ["404 Not Found", "No such resource", "Unknown id"],
        ["409 Conflict", "State conflict", "Duplicate, version mismatch"],
        ["429 / 503", "Rate limited / unavailable", "Back off and retry"]],
      code: `record Account(String id, String email) { }
@RestController
@RequestMapping("/api/accounts")
class AccountController {
    final Map<String, Account> byEmail = new ConcurrentHashMap<>();
    @PostMapping
    ResponseEntity<Account> create(@RequestBody Account a) {
        if (byEmail.putIfAbsent(a.email(), a) != null) return ResponseEntity.status(HttpStatus.CONFLICT).build();
        return ResponseEntity.created(URI.create("/api/accounts/" + a.id())).body(a);
    }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new AccountController()).build();
for (int i = 0; i < 2; i++) {
    var r = mvc.perform(post("/api/accounts").contentType(MediaType.APPLICATION_JSON).content("{\\"id\\":\\"a1\\",\\"email\\":\\"asha@example.com\\"}")).andReturn().getResponse();
    System.out.println(r.getStatus() + " Location=" + r.getHeader("Location"));
}` },
    { title: "Content negotiation: produces and consumes",
      text: "The client's **`Accept`** header says which representations it wants; **`Content-Type`** says what it sends. `@GetMapping(produces = …)` and `@PostMapping(consumes = …)` restrict a mapping, and Spring picks a converter accordingly. If nothing can produce an acceptable type you get **406 Not Acceptable**; if the body's type can't be read, **415 Unsupported Media Type** (both appear in the widget's recordings). You can serve different representations from different methods with the same path, e.g. JSON and CSV exports.",
      code: `record Fare(String route, int price) { }
@RestController
class FareController {
    final List<Fare> fares = List.of(new Fare("DEL-BOM", 4500), new Fare("BLR-MAA", 2100));
    @GetMapping(value = "/fares", produces = MediaType.APPLICATION_JSON_VALUE) List<Fare> json() { return fares; }
    @GetMapping(value = "/fares", produces = "text/csv") String csv() {
        return fares.stream().map(f -> f.route() + "," + f.price()).collect(Collectors.joining("\\n", "route,price\\n", ""));
    }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new FareController()).build();
System.out.println("JSON: " + mvc.perform(get("/fares").accept(MediaType.APPLICATION_JSON)).andReturn().getResponse().getContentAsString());
System.out.println("CSV: " + mvc.perform(get("/fares").accept("text/csv")).andReturn().getResponse().getContentAsString().replace("\\n", " | "));
System.out.println("XML: " + mvc.perform(get("/fares").accept(MediaType.APPLICATION_XML)).andReturn().getResponse().getStatus());` },
    { title: "Designing resources and using methods correctly",
      text: "Model **resources as nouns** in plural collections (`/orders`, `/orders/{id}`, `/orders/{id}/items`), and let **HTTP methods** carry the verb. Know the semantics: **safe** methods don't change state (GET, HEAD); **idempotent** methods can be repeated with the same effect (GET, PUT, DELETE); POST is neither. PUT replaces a resource, PATCH changes part of it. For actions that don't fit CRUD, use a sub-resource (`POST /orders/{id}/cancellation`) rather than verbs in paths (`/cancelOrder`). Consistent naming, error format and pagination across services matters more than any single choice.",
      table: [["Method", "Purpose", "Safe", "Idempotent", "Example"],
        ["GET", "Read", "Yes", "Yes", "GET /orders/42"],
        ["POST", "Create / action", "No", "No", "POST /orders"],
        ["PUT", "Replace whole resource", "No", "Yes", "PUT /orders/42"],
        ["PATCH", "Partial update", "No", "Not necessarily", "PATCH /orders/42"],
        ["DELETE", "Remove", "No", "Yes", "DELETE /orders/42"]],
      code: `record Item(String sku, int qty) { }
@RestController
@RequestMapping("/api/carts/{cartId}/items")
class CartItems {
    final Map<String, Integer> items = new ConcurrentHashMap<>();
    @PutMapping("/{sku}") ResponseEntity<Item> put(@PathVariable String cartId, @PathVariable String sku, @RequestBody Item body) {
        items.put(sku, body.qty()); return ResponseEntity.ok(new Item(sku, body.qty()));      // same request twice → same state
    }
    @DeleteMapping("/{sku}") ResponseEntity<Void> delete(@PathVariable String cartId, @PathVariable String sku) { items.remove(sku); return ResponseEntity.noContent().build(); }
    @GetMapping Map<String, Integer> all(@PathVariable String cartId) { return new TreeMap<>(items); }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new CartItems()).build();
for (int i = 0; i < 2; i++) mvc.perform(put("/api/carts/c1/items/MUG").contentType(MediaType.APPLICATION_JSON).content("{\\"sku\\":\\"MUG\\",\\"qty\\":2}"));
System.out.println("after two identical PUTs: " + mvc.perform(get("/api/carts/c1/items")).andReturn().getResponse().getContentAsString());
for (int i = 0; i < 2; i++) System.out.println("DELETE → " + mvc.perform(delete("/api/carts/c1/items/MUG")).andReturn().getResponse().getStatus());` },
    { title: "Pagination and sorting",
      text: "Never return unbounded lists. **Offset pagination** (`?page=2&size=20`, Spring Data's `Pageable`) is simple and supports jumping to page N, but deep offsets are slow and items shift when data changes. **Cursor (keyset) pagination** (`?after=<last id>&size=20`) is stable and fast for feeds and infinite scroll. Cap `size`, define a default sort (stable, e.g. by id), and return metadata: total or `hasNext`, and the next cursor or link. Spring Data integrates `Pageable` parameters with repositories (S06).",
      code: `record PageView<T>(List<T> items, String nextCursor) { }
@RestController
class FeedController {
    final List<Integer> ids = IntStream.rangeClosed(1, 23).boxed().toList();     // sorted by id
    @GetMapping("/api/feed")
    PageView<Integer> feed(@RequestParam(defaultValue = "0") int after, @RequestParam(defaultValue = "10") int size) {
        int capped = Math.min(size, 50);
        List<Integer> page = ids.stream().filter(id -> id > after).limit(capped).toList();
        String next = page.size() == capped && page.get(page.size() - 1) < ids.get(ids.size() - 1) ? String.valueOf(page.get(page.size() - 1)) : null;
        return new PageView<>(page, next);
    }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new FeedController()).build();
String after = "0";
while (after != null) {
    String body = mvc.perform(get("/api/feed").param("after", after).param("size", "10")).andReturn().getResponse().getContentAsString();
    System.out.println(body);
    var m = java.util.regex.Pattern.compile("\\"nextCursor\\":\\"(\\\\d+)\\"").matcher(body);
    after = m.find() ? m.group(1) : null;
}` },
    { title: "Idempotency keys for unsafe operations",
      text: "Networks fail after the server has done the work but before the client sees the answer, so clients retry. For POSTs that move money or create orders, retries must not duplicate. The standard pattern: the client sends an **`Idempotency-Key`** header (a UUID per logical operation); the server stores the key with the result and, on a repeat, **returns the stored response** instead of executing again. Store keys durably with a TTL (database or Redis), scope them per client, and handle concurrent duplicates (insert the key first with a unique constraint).",
      m: M(["flowchart LR",
        "  C[\"client POST /payments<br/>Idempotency-Key: k1\"]:::s1 --> S{\"key seen?\"}:::s2",
        "  S -->|no| P[\"charge card, store k1 → response\"]:::s4 --> R[\"201\"]:::s4",
        "  S -->|yes| RS[\"return stored response<br/>no second charge\"]:::s3",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `record Payment(String id, int amount) { }
@RestController
class PaymentController {
    final Map<String, Payment> byKey = new ConcurrentHashMap<>();
    final AtomicInteger charges = new AtomicInteger();
    @PostMapping("/api/payments")
    ResponseEntity<Payment> pay(@RequestHeader("Idempotency-Key") String key, @RequestParam int amount) {
        Payment p = byKey.computeIfAbsent(key, k -> new Payment("pay_" + charges.incrementAndGet(), amount));   // executes once per key
        return ResponseEntity.status(HttpStatus.CREATED).body(p);
    }
}
PaymentController ctrl = new PaymentController();
MockMvc mvc = MockMvcBuilders.standaloneSetup(ctrl).build();
for (int attempt = 1; attempt <= 3; attempt++)
    System.out.println("attempt " + attempt + ": " + mvc.perform(post("/api/payments").header("Idempotency-Key", "8f14e45f").param("amount", "1500")).andReturn().getResponse().getContentAsString());
System.out.println("card charged " + ctrl.charges.get() + " time(s)");` },
    { title: "Versioning APIs",
      text: "Avoid breaking changes: add optional fields, never change meanings, keep old fields until clients migrate. When you must break, version: **URI path** (`/api/v1/...`, most common and visible), **request header** (`X-API-Version: 2`), **media type** (`Accept: application/vnd.shop.v2+json`) or query parameter. Spring Framework 7 adds first-class API versioning (`version` attribute on mappings with a configurable resolver); on Spring 6 you map versions with paths, headers (`headers = \"X-API-Version=2\"`) or `produces`. Document deprecation and sunset dates (`Deprecation`/`Sunset` headers).",
      table: [["Strategy", "Example", "Pros", "Cons"],
        ["URI path", "/api/v2/orders", "Visible, cacheable, easy routing", "URLs change"],
        ["Header", "X-API-Version: 2", "Clean URLs", "Less visible, caches need Vary"],
        ["Media type", "Accept: application/vnd.shop.v2+json", "RESTful purist choice", "Harder for clients/tools"],
        ["Query param", "?version=2", "Simple", "Easy to forget, cache issues"]],
      code: `record OrderV1(long id, String customer) { }
record OrderV2(long id, String customerId, String customerName) { }
@RestController
class OrdersApi {
    @GetMapping("/api/v1/orders/{id}") OrderV1 v1(@PathVariable long id) { return new OrderV1(id, "Asha Rao"); }
    @GetMapping(value = "/api/orders/{id}", headers = "X-API-Version=2") OrderV2 v2(@PathVariable long id) { return new OrderV2(id, "c-77", "Asha Rao"); }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new OrdersApi()).build();
System.out.println("path v1:   " + mvc.perform(get("/api/v1/orders/7")).andReturn().getResponse().getContentAsString());
System.out.println("header v2: " + mvc.perform(get("/api/orders/7").header("X-API-Version", "2")).andReturn().getResponse().getContentAsString());` },
    { title: "Filters vs interceptors, and CORS",
      text: "**Servlet filters** (`OncePerRequestFilter`) wrap the whole request before the `DispatcherServlet`: ideal for cross-cutting work independent of controllers, such as correlation IDs, request logging, compression and security (Spring Security is a filter chain). **`HandlerInterceptor`s** run inside Spring MVC around a resolved handler (`preHandle`, `postHandle`, `afterCompletion`), so they know which controller method matched: good for per-endpoint auth checks, metrics tags and locale. **CORS** lets browsers on other origins call your API: configure allowed origins, methods and headers globally (`WebMvcConfigurer.addCorsMappings`) or with `@CrossOrigin`, and keep origins explicit rather than `*` when credentials are involved.",
      m: M(["flowchart LR",
        "  R[\"request\"]:::s1 --> F1[\"Filter: correlation id\"]:::s3 --> F2[\"Filter: security\"]:::s3 --> D[\"DispatcherServlet\"]:::s2",
        "  D --> I[\"Interceptor preHandle<br/>(knows the handler)\"]:::s4 --> C[\"controller\"]:::s2",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `class CorrelationFilter extends OncePerRequestFilter {
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws jakarta.servlet.ServletException, IOException {
        String id = Optional.ofNullable(req.getHeader("X-Correlation-Id")).orElse("gen-123");
        res.setHeader("X-Correlation-Id", id);
        System.out.println("filter: " + req.getMethod() + " " + req.getRequestURI() + " id=" + id);
        chain.doFilter(req, res);
    }
}
class TimingInterceptor implements HandlerInterceptor {
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        System.out.println("interceptor: handler = " + handler.toString().replaceAll(".*\\\\.(\\\\w+#\\\\w+).*", "$1"));
        return true;
    }
}
@RestController class PingController { @GetMapping("/ping") String ping() { return "pong"; } }
MockMvc mvc = MockMvcBuilders.standaloneSetup(new PingController()).addFilters(new CorrelationFilter()).addInterceptors(new TimingInterceptor()).build();
var r = mvc.perform(get("/ping")).andReturn().getResponse();
System.out.println("response " + r.getContentAsString() + ", X-Correlation-Id " + r.getHeader("X-Correlation-Id"));` },
    { title: "Calling other services: RestClient and WebClient",
      text: "For outgoing HTTP calls use **`RestClient`** (Spring 6.1+, synchronous, fluent; the successor to `RestTemplate`, and a natural fit with virtual threads) or **`WebClient`** (reactive, non-blocking, for WebFlux or high-fan-out async code). Build clients from Boot's auto-configured **`RestClient.Builder`** so they share converters and observability, set a base URL, and always configure **connect and read timeouts** (the defaults can wait far too long). Handle errors with `onStatus`, add retries with back-off only for idempotent calls, and protect callers with circuit breakers (Resilience4j). Declarative `@HttpExchange` interfaces generate clients from annotations. Test with `MockRestServiceServer`.",
      code: `record Weather(String city, int tempC) { }
RestClient.Builder builder = RestClient.builder().baseUrl("https://weather.example");
MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo("https://weather.example/v1/now?city=Pune"))
      .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess("{\\"city\\":\\"Pune\\",\\"tempC\\":27}", MediaType.APPLICATION_JSON));
server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo("https://weather.example/v1/now?city=Atlantis"))
      .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withStatus(HttpStatus.NOT_FOUND));
RestClient client = builder.build();
Weather w = client.get().uri("/v1/now?city={c}", "Pune").retrieve().body(Weather.class);
System.out.println("fetched " + w);
try { client.get().uri("/v1/now?city={c}", "Atlantis").retrieve().body(Weather.class); }
catch (HttpClientErrorException.NotFound e) { System.out.println("404 mapped to " + e.getClass().getSimpleName()); }
server.verify();` }
  ];

  H.registerLesson({
    code: "S04",
    summary: "Designing and building HTTP APIs with Spring MVC: how the `DispatcherServlet` routes a request, mapping annotations with path variables, query parameters and headers, JSON request bodies with record DTOs, `ResponseEntity` and choosing status codes, content negotiation (406/415), resource and method design, pagination, idempotency keys, API versioning, filters vs interceptors and CORS, and calling other services with `RestClient` and `WebClient`.",
    slides: SLIDES,
    widget: { heading: "Interactive: send requests to a real controller", caption: "Pick a request to see which pipeline stage handles or rejects it. Every status, header and body was recorded with Spring 6.2 MockMvc against the controller shown.", render: s04Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Public APIs", "Mobile and web clients consume `/api/v1/...` JSON endpoints with consistent status codes and pagination."],
      ["Payments", "`Idempotency-Key` on POST /payments prevents double charges when the app retries after a timeout."],
      ["Integrations", "Partners get a CSV export of the same resource through content negotiation."],
      ["Observability", "A filter adds `X-Correlation-Id` to every request and response so logs across services can be joined."],
      ["Service calls", "A `RestClient` with 2-second timeouts calls the inventory service; a circuit breaker protects the checkout."],
      ["Browser apps", "A React front end on another origin needs explicit CORS configuration."]
    ],
    pitfalls: [
      "Exposing JPA entities directly as request/response bodies",
      "Returning 200 for every outcome, with errors only in the body",
      "Unbounded list endpoints without pagination",
      "Verbs in URLs (/getOrders, /cancelOrder) instead of resources",
      "Non-idempotent POST retries without idempotency keys",
      "Breaking response changes without a new version",
      "Outgoing HTTP calls without timeouts",
      "CORS with allowed origin * and credentials",
      "Business logic inside controllers instead of services"
    ],
    quiz: [
      { q: "What does @RestController add over @Controller?", options: ["Transactions", "@ResponseBody on every method, so return values are written as the response body", "Security", "Async execution"], answer: 1, why: "@Controller methods would otherwise return view names." },
      { q: "GET /api/orders/abc where id is a long path variable. Status?", options: ["404", "400", "500", "200 with null"], answer: 1, why: "Type conversion fails before the method runs (recorded: 400)." },
      { q: "PUT /api/orders/42 when only GET and DELETE are mapped for that path. Status?", options: ["404", "405 with an Allow header", "400", "501"], answer: 1, why: "Recorded: 405, Allow: DELETE, GET." },
      { q: "Which status and header should creating a resource return?", options: ["200 and Content-Length", "201 Created with a Location header", "204", "202"], answer: 1, why: "ResponseEntity.created(uri).body(dto)." },
      { q: "A client sends Accept: application/xml but only JSON converters exist. Status?", options: ["200 with JSON", "406 Not Acceptable", "415 Unsupported Media Type", "500"], answer: 1, why: "415 is about the request body's Content-Type." },
      { q: "Which HTTP methods are idempotent?", options: ["POST and PATCH", "GET, PUT, DELETE", "Only GET", "All of them"], answer: 1, why: "PATCH is not necessarily idempotent; POST is not." },
      { q: "How do you make a payment POST safe to retry?", options: ["Make it a GET", "Client sends an Idempotency-Key; the server returns the stored result for repeats", "Increase timeouts", "Use PUT always"], answer: 1, why: "Store keys durably with a TTL." },
      { q: "Filter vs HandlerInterceptor?", options: ["Same thing", "Filters wrap the servlet request before Spring MVC; interceptors run inside MVC and know the matched handler", "Interceptors run before filters", "Filters only work with WebFlux"], answer: 1, why: "Security and correlation ids: filters; handler-aware logic: interceptors." },
      { q: "What should you always configure on an HTTP client calling another service?", options: ["A User-Agent", "Connect and read timeouts", "XML support", "Gzip"], answer: 1, why: "Otherwise a slow dependency ties up your threads." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Code"],
        ["Controller", "`@RestController @RequestMapping(\"/api/orders\")`"],
        ["Path / query / header", "`@PathVariable long id`, `@RequestParam(defaultValue = \"0\") int page`, `@RequestHeader`"],
        ["JSON body", "`@RequestBody CreateOrder req` (record DTO)"],
        ["201 + Location", "`ResponseEntity.created(uri).body(dto)`"],
        ["204", "`ResponseEntity.noContent().build()`"],
        ["Error status", "`throw new ResponseStatusException(HttpStatus.NOT_FOUND, msg)`"],
        ["Representation", "`produces = \"text/csv\"`, `consumes = APPLICATION_JSON_VALUE`"],
        ["HTTP client", "`RestClient.builder().baseUrl(…).build().get().uri(…).retrieve().body(T.class)`"]],
      cards: [
        { title: "API design", items: ["Plural nouns", "Methods carry verbs", "Precise status codes", "Paginate every list", "DTOs, not entities"] },
        { title: "Robustness", items: ["Idempotency keys", "Versioning plan", "Timeouts on clients", "Correlation ids", "Explicit CORS"] },
        { title: "Say in interviews", items: ["DispatcherServlet pipeline", "406 vs 415", "Safe vs idempotent", "Offset vs cursor paging", "Filter vs interceptor"] }]
    },
    practice: [
      { level: "Easy", q: "Write a controller with GET by id (404 when missing) and POST returning 201 with Location.",
        a: ["@RestController with a class-level @RequestMapping.",
          "GET throws ResponseStatusException(NOT_FOUND) for unknown ids.",
          "POST returns ResponseEntity.created(uri).body(saved)."],
        code: `record Product(long id, String name) { }
record NewProduct(String name) { }
@RestController @RequestMapping("/api/products")
class ProductController {
    final Map<Long, Product> db = new ConcurrentHashMap<>(); final AtomicLong ids = new AtomicLong();
    @GetMapping("/{id}") Product one(@PathVariable long id) { return Optional.ofNullable(db.get(id)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)); }
    @PostMapping ResponseEntity<Product> create(@RequestBody NewProduct req) {
        Product p = new Product(ids.incrementAndGet(), req.name()); db.put(p.id(), p);
        return ResponseEntity.created(URI.create("/api/products/" + p.id())).body(p);
    }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new ProductController()).build();
var c = mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON).content("{\\"name\\":\\"kettle\\"}")).andReturn().getResponse();
System.out.println(c.getStatus() + " " + c.getHeader("Location") + " | GET 1 → " + mvc.perform(get("/api/products/1")).andReturn().getResponse().getContentAsString() + " | GET 9 → " + mvc.perform(get("/api/products/9")).andReturn().getResponse().getStatus());` },
      { level: "Easy", q: "@PathVariable vs @RequestParam: when do you use each?",
        a: ["Path variables identify a resource in the hierarchy: /orders/{id}, /users/{id}/addresses.",
          "Query parameters filter, sort, page or tune the representation: ?status=PAID&page=2.",
          "Required path segments vs optional parameters with defaults."] },
      { level: "Easy", q: "Explain the difference between PUT and PATCH, and between safe and idempotent.",
        a: ["PUT replaces the whole resource with the request body; PATCH applies a partial change (JSON Merge Patch or JSON Patch).",
          "Safe: no state change (GET, HEAD, OPTIONS).",
          "Idempotent: repeating has the same effect as once (GET, PUT, DELETE); POST and often PATCH are not."] },
      { level: "Medium", q: "Implement cursor pagination for a list endpoint and explain why it's preferable to offset pagination for feeds.",
        a: ["Accept after (last seen sort key) and size (capped).",
          "Query items with key > after ordered by key, limit size.",
          "Return items plus nextCursor (null at the end).",
          "Stable under inserts/deletes and fast (index seek) vs deep OFFSET scans."],
        code: `record FeedPage(List<Integer> items, Integer next) { }
@RestController class Feed {
    final List<Integer> ids = IntStream.rangeClosed(1, 7).boxed().toList();
    @GetMapping("/feed") FeedPage feed(@RequestParam(defaultValue = "0") int after, @RequestParam(defaultValue = "3") int size) {
        List<Integer> p = ids.stream().filter(i -> i > after).limit(Math.min(size, 100)).toList();
        Integer next = p.isEmpty() || p.get(p.size() - 1).equals(ids.get(ids.size() - 1)) ? null : p.get(p.size() - 1);
        return new FeedPage(p, next);
    }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new Feed()).build();
for (String after : List.of("0", "3", "6")) System.out.println(mvc.perform(get("/feed").param("after", after)).andReturn().getResponse().getContentAsString());` },
      { level: "Medium", q: "How would you version a REST API, and how do you avoid needing to?",
        a: ["Prefer additive, backward-compatible changes: new optional fields, new endpoints; never change meaning or remove fields abruptly.",
          "When breaking: URI versioning (/v2) is most common; headers or media types keep URLs stable.",
          "Run versions side by side, announce deprecation (Deprecation/Sunset headers), monitor usage, remove later.",
          "Spring Framework 7 adds built-in API versioning; earlier use paths/headers/produces."] },
      { level: "Medium", q: "Write an idempotent payment endpoint using an Idempotency-Key header.",
        a: ["Require the header.",
          "Atomically compute-if-absent the result for the key.",
          "Return the stored result on repeats; in production store keys in a DB/Redis with TTL and a unique constraint."],
        code: `record Receipt(String id, int amount) { }
@RestController class Pay {
    final Map<String, Receipt> done = new ConcurrentHashMap<>(); final AtomicInteger seq = new AtomicInteger();
    @PostMapping("/pay") ResponseEntity<Receipt> pay(@RequestHeader("Idempotency-Key") String key, @RequestParam int amount) {
        return ResponseEntity.status(HttpStatus.CREATED).body(done.computeIfAbsent(key, k -> new Receipt("r" + seq.incrementAndGet(), amount)));
    }
}
Pay pay = new Pay();
MockMvc mvc = MockMvcBuilders.standaloneSetup(pay).build();
try (ExecutorService ex = Executors.newFixedThreadPool(4)) {
    for (int i = 0; i < 8; i++) ex.submit(() -> mvc.perform(post("/pay").header("Idempotency-Key", "k-1").param("amount", "500")));
}
System.out.println("8 concurrent retries → receipts created: " + pay.seq.get());
System.out.println("missing key → " + mvc.perform(post("/pay").param("amount", "500")).andReturn().getResponse().getStatus());` },
      { level: "Medium", q: "Filters vs interceptors vs AOP: where would you put request logging, authentication and method timing?",
        a: ["Request logging and correlation ids: a servlet filter (sees every request, even unmapped ones).",
          "Authentication: Spring Security's filter chain.",
          "Handler-specific concerns (per-endpoint metrics tags, feature checks): HandlerInterceptor.",
          "Business-method timing or auditing in services: AOP aspects."] },
      { level: "Hard", q: "Design the error, pagination and naming conventions for a company-wide REST API guideline.",
        steps: ["Resources: plural nouns, kebab-case paths, nesting max two levels; actions as sub-resources.",
          "Status codes: 200/201/204 for success; 400/422 validation, 401/403, 404, 409 conflicts, 429 with Retry-After; errors as RFC 9457 Problem Details with a stable type URI.",
          "Pagination: cursor-based for feeds, page/size for admin tables; cap size; consistent metadata fields.",
          "Idempotency keys for POSTs with side effects; ETags/If-Match for optimistic concurrency on updates.",
          "Versioning and deprecation policy, OpenAPI specs generated and linted in CI, correlation id header everywhere."] },
      { level: "Hard", q: "Call a slow downstream service from a controller safely.",
        a: ["Use RestClient built from Boot's builder with explicit connect/read timeouts (e.g. 1 s / 2 s).",
          "Map error statuses with onStatus to domain exceptions; don't leak downstream errors raw.",
          "Retry only idempotent calls with jittered back-off; add a circuit breaker and bulkhead (Resilience4j).",
          "Provide fallbacks (cached data, partial response) and propagate correlation ids; measure latency.",
          "With virtual threads (J25) blocking calls scale, but downstream limits still need protecting."] },
      { level: "Hard", q: "Test a RestClient-based service without the real downstream.",
        a: ["Bind MockRestServiceServer to the RestClient.Builder.",
          "Set expectations (URL, method) and canned responses, including error statuses.",
          "Exercise the code and verify all expectations were met."],
        code: `record Rate(String from, String to, double rate) { }
class RatesClient {
    private final RestClient client;
    RatesClient(RestClient.Builder b) { client = b.baseUrl("https://fx.example").build(); }
    double convert(int inr) { Rate r = client.get().uri("/rates/INR/USD").retrieve().body(Rate.class); return inr * r.rate(); }
}
RestClient.Builder b = RestClient.builder();
MockRestServiceServer server = MockRestServiceServer.bindTo(b).build();
RatesClient rates = new RatesClient(b);
server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo("https://fx.example/rates/INR/USD"))
      .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess("{\\"from\\":\\"INR\\",\\"to\\":\\"USD\\",\\"rate\\":0.012}", MediaType.APPLICATION_JSON));
System.out.printf("₹1000 = $%.2f%n", rates.convert(1000));
server.verify();` }
    ],
    recap: [
      "DispatcherServlet: mapping → argument resolution → your method → message conversion.",
      "Use path variables for identity, query params for filtering and paging, record DTOs for bodies.",
      "Return precise status codes with ResponseEntity (201 + Location, 204, 404, 409).",
      "Design resources and methods by HTTP semantics; paginate, version and make retries idempotent.",
      "Filters for request-wide concerns, interceptors for handler-aware ones; outgoing calls need timeouts."
    ]
  });
})();
