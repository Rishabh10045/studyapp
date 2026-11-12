/* Lesson S05: Validation & exception handling */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded with Spring Framework 6.2 MockMvc + Hibernate Validator 8 against the controller and advice shown
  // (standaloneSetup(...).setControllerAdvice(new ApiErrors())). Statuses and bodies are verbatim.
  var REC = {"ok": {"status": 201, "ct": "application/json", "body": "{\"qty\":2,\"id\":101,\"item\":\"chai\"}"}, "blank": {"status": 400, "ct": "application/problem+json", "body": "{\"type\":\"https://api.example.com/problems/validation\",\"title\":\"Validation failed\",\"status\":400,\"detail\":\"Request has invalid fields\",\"instance\":\"/api/orders\",\"errors\":{\"item\":\"must not be blank\"}}"}, "many": {"status": 400, "ct": "application/problem+json", "body": "{\"type\":\"https://api.example.com/problems/validation\",\"title\":\"Validation failed\",\"status\":400,\"detail\":\"Request has invalid fields\",\"instance\":\"/api/orders\",\"errors\":{\"email\":\"must be a well-formed email address\",\"pin\":\"must be a 6-digit Indian PIN code\",\"qty\":\"must be greater than or equal to 1\"}}"}, "qty": {"status": 400, "ct": "application/problem+json", "body": "{\"type\":\"https://api.example.com/problems/validation\",\"title\":\"Validation failed\",\"status\":400,\"detail\":\"Request has invalid fields\",\"instance\":\"/api/orders\",\"errors\":{\"qty\":\"must be less than or equal to 10\"}}"}, "json": {"status": 400, "ct": "application/problem+json", "body": "{\"type\":\"about:blank\",\"title\":\"Bad Request\",\"status\":400,\"detail\":\"Failed to read request\",\"instance\":\"/api/orders\"}"}, "type": {"status": 400, "ct": "application/problem+json", "body": "{\"type\":\"about:blank\",\"title\":\"Bad Request\",\"status\":400,\"detail\":\"Failed to read request\",\"instance\":\"/api/orders\"}"}, "stock": {"status": 409, "ct": "application/problem+json", "body": "{\"type\":\"https://api.example.com/problems/out-of-stock\",\"title\":\"Out of stock\",\"status\":409,\"detail\":\"mango is out of stock until April\",\"instance\":\"/api/orders\"}"}, "crash": {"status": 500, "ct": "application/problem+json", "body": "{\"type\":\"about:blank\",\"title\":\"Internal error\",\"status\":500,\"detail\":\"Something went wrong. Quote the correlation id when contacting support.\",\"instance\":\"/api/orders\",\"correlationId\":\"c-7f3a\"}"}, "neg": {"status": 400, "ct": "application/problem+json", "body": "{\"type\":\"about:blank\",\"title\":\"Validation failed\",\"status\":400,\"detail\":\"Request parameters are invalid\",\"instance\":\"/api/orders/-5\",\"errors\":{\"id\":\"must be greater than 0\"}}"}, "method": {"status": 405, "ct": "application/problem+json", "body": "{\"type\":\"about:blank\",\"title\":\"Method Not Allowed\",\"status\":405,\"detail\":\"Method 'DELETE' is not supported.\",\"instance\":\"/api/orders/5\"}"}};
  var OK = "{\"item\":\"chai\",\"qty\":2,\"email\":\"asha@example.com\",\"pin\":\"411001\"}";
  var REQS = [
    { k: "ok", label: "valid order", req: "POST /api/orders\n\n" + OK, stage: 4, handler: "none (success)", why: "Every constraint passes, the controller runs and returns **201**." },
    { k: "blank", label: "blank item", req: "POST /api/orders\n\n{\"item\":\" \",\"qty\":2,\"email\":\"asha@example.com\",\"pin\":\"411001\"}", stage: 1, handler: "handleMethodArgumentNotValid (overridden)", why: "`@NotBlank` rejects whitespace-only strings. `@Valid` fails with `MethodArgumentNotValidException` **before** the controller method runs." },
    { k: "many", label: "3 bad fields", req: "POST /api/orders\n\n{\"item\":\"chai\",\"qty\":0,\"email\":\"asha-at-example\",\"pin\":\"41100\"}", stage: 1, handler: "handleMethodArgumentNotValid (overridden)", why: "All violations are collected in one pass, so the client can fix every field at once. `pin` uses the custom `@Pincode` constraint." },
    { k: "qty", label: "qty 25", req: "POST /api/orders\n\n{…,\"qty\":25,…}", stage: 1, handler: "handleMethodArgumentNotValid (overridden)", why: "`@Max(10)` fails. The `errors` map is a custom ProblemDetail property." },
    { k: "json", label: "broken JSON", req: "POST /api/orders\n\n{\"item\":\"chai\",\"qty\":", stage: 0, handler: "ResponseEntityExceptionHandler default", why: "Jackson can't parse the body: `HttpMessageNotReadableException`. The inherited handler already returns a ProblemDetail with **400**." },
    { k: "type", label: "qty \"two\"", req: "POST /api/orders\n\n{…,\"qty\":\"two\",…}", stage: 0, handler: "ResponseEntityExceptionHandler default", why: "A type mismatch inside JSON is also a read failure, so validation never runs." },
    { k: "neg", label: "GET /-5", req: "GET /api/orders/-5", stage: 1, handler: "handleHandlerMethodValidationException (overridden)", why: "`@Positive` directly on a `@PathVariable`: Spring 6.1+ built-in method validation raises `HandlerMethodValidationException`." },
    { k: "stock", label: "out of stock", req: "POST /api/orders\n\n{\"item\":\"mango\",…}", stage: 2, handler: "@ExceptionHandler(OutOfStockException)", why: "Input is valid, but a **domain rule** fails in the service. The advice maps the domain exception to **409 Conflict** with its own `type` URI." },
    { k: "crash", label: "bug", req: "POST /api/orders\n\n{\"item\":\"crash\",…}", stage: 2, handler: "@ExceptionHandler(Exception)", why: "An unexpected exception: the catch-all returns a generic **500** that doesn't leak internals. Log the stack trace with the correlation id." },
    { k: "method", label: "DELETE", req: "DELETE /api/orders/5", stage: 0, handler: "ResponseEntityExceptionHandler default", why: "Framework exceptions (405, 415, 406…) also get ProblemDetail bodies because the advice extends `ResponseEntityExceptionHandler`." }
  ];
  var CODE = "record OrderRequest(@NotBlank String item, @Min(1) @Max(10) int qty,\n                    @Email @NotBlank String email, @Pincode String pin) { }\n\n@PostMapping(\"/api/orders\")\nResponseEntity<?> create(@Valid @RequestBody OrderRequest r) { … service may throw OutOfStockException }\n@GetMapping(\"/api/orders/{id}\")\nMap<String, Object> one(@PathVariable @Positive long id) { … }\n\n@RestControllerAdvice\nclass ApiErrors extends ResponseEntityExceptionHandler {\n    @Override handleMethodArgumentNotValid(…)            → 400 ProblemDetail + errors map\n    @Override handleHandlerMethodValidationException(…)  → 400 ProblemDetail + errors map\n    @ExceptionHandler(OutOfStockException.class)        → 409 ProblemDetail\n    @ExceptionHandler(Exception.class)                  → 500 ProblemDetail + correlationId\n}";
  function pretty(b) { try { return JSON.stringify(JSON.parse(b), null, 2); } catch (e) { return b; } }
  function s05Widget(el, ctx) {
    var s = ctx.state; if (!s.k) s.k = "ok";
    el.innerHTML = "<pre class='code' data-r='ctrl'></pre><div class='btnrow' data-r='reqs' style='margin-top:8px'>" + REQS.map(function (r) { return "<button type='button' class='btn' data-k='" + r.k + "'>" + ctx.esc(r.label) + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='req' style='margin-top:8px'></pre><div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><pre class='code' data-r='resp'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("ctrl").innerHTML = ctx.H.highlight(CODE, "java");
    function draw() {
      var r = REQS.filter(function (x) { return x.k === s.k; })[0], rec = REC[r.k];
      q("reqs").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b.dataset.k === s.k); });
      q("req").textContent = r.req;
      var names = ["read body / bind<br/>Jackson, converters", "validate<br/>@Valid, @Positive", "controller + service<br/>business rules"];
      var L = ["flowchart LR"];
      names.forEach(function (n, i) { L.push("  S" + i + "[\"" + n + "\"]:::" + (r.stage === i ? "bad" : r.stage < i ? "skip" : "ok")); if (i) L.push("  S" + (i - 1) + " --> S" + i); });
      if (r.stage === 4) L.push("  R[\"" + rec.status + " " + rec.ct + "\"]:::ok", "  S2 --> R");
      else L.push("  A[\"@RestControllerAdvice<br/>" + r.handler.replace(/[()]/g, " ").trim() + "\"]:::adv", "  S" + r.stage + " -- throws --> A", "  R[\"" + rec.status + " problem+json\"]:::bad", "  A --> R");
      L.push("  classDef ok fill:#e8f5e9,stroke:#2e7d32", "  classDef bad fill:#ffebee,stroke:#c62828", "  classDef adv fill:#fef3c7,stroke:#b45309", "  classDef skip fill:#f3f4f6,stroke:#d1d5db,color:#9ca3af");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("res").innerHTML = ctx.md("**" + rec.status + "**, handled by " + (r.stage === 4 ? "the controller" : "`" + r.handler + "`") + ". " + r.why);
      q("resp").textContent = "HTTP " + rec.status + "\nContent-Type: " + rec.ct + "\n\n" + pretty(rec.body);
    }
    q("reqs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.k = b.dataset.k; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Where validation and error handling live",
      text: "Production APIs reject bad input **early and clearly**, and turn every failure into a **consistent, documented error response**. Three layers cooperate: **syntactic validation** at the edge (is the JSON well formed, are fields present, in range, well formatted?) with Bean Validation; **business rules** in the service (is the item in stock, may this user do this?) raising domain exceptions; and a single **`@RestControllerAdvice`** that maps every exception to an HTTP status and an RFC 9457 **Problem Details** body. Controllers stay thin: no try/catch, no hand-built error maps.",
      m: M(["flowchart LR",
        "  Q[\"request\"]:::s1 --> J[\"parse JSON<br/>400 if malformed\"]:::s2 --> V[\"@Valid<br/>400 + field errors\"]:::s2 --> S[\"service rules<br/>domain exceptions\"]:::s4",
        "  J -.-> A[\"@RestControllerAdvice<br/>→ ProblemDetail\"]:::s3", "  V -.-> A", "  S -.-> A",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      analogy: "A passport counter: the form checker rejects missing or badly filled fields at once (validation), the officer applies the rules (business checks), and every refusal comes on the same official slip with a reason code (Problem Details)." },
    { title: "Bean Validation basics",
      text: "**Jakarta Bean Validation** (implemented by Hibernate Validator; `spring-boot-starter-validation`) declares rules as annotations on fields or record components. A `Validator` returns a set of **`ConstraintViolation`s**, each with a property path, message and invalid value; it reports **all** violations, not just the first. Most constraints treat `null` as valid, so combine them with `@NotNull`/`@NotBlank` when the value is required. Messages can be customised (`message = \"…\"`) and localised through `ValidationMessages.properties`.",
      code: `record Signup(@NotBlank String name, @Email @NotBlank String email, @Min(18) int age, @Size(min = 8, max = 64) String password) { }
Validator v = Validation.buildDefaultValidatorFactory().getValidator();
Set<ConstraintViolation<Signup>> errs = v.validate(new Signup(" ", "asha@", 16, "pass"));
errs.stream().map(e -> e.getPropertyPath() + ": " + e.getMessage()).sorted().forEach(System.out::println);
System.out.println("valid signup → " + v.validate(new Signup("Asha", "asha@example.com", 30, "correct-horse")).size() + " violations");`,
      analogy: "Constraints are the 'mandatory' stars and format hints printed on a paper form; the validator is the clerk who circles every mistake in one go instead of sending you back once per error." },
    { title: "The constraint catalogue, nesting and collections",
      text: "Pick the most precise constraint. `@Valid` on a field **cascades** validation into nested objects and collection elements; without it nested objects are not checked. Type-argument constraints (`List<@NotBlank String>`) validate each element. Property paths such as `address.pin` or `tags[1].<list element>` tell clients exactly what to fix.",
      table: [["Constraint", "Checks", "Note"],
        ["@NotNull / @NotEmpty / @NotBlank", "not null / not empty / has non-whitespace text", "@NotBlank for strings"],
        ["@Size(min, max)", "length of string, collection, map, array", "null is valid"],
        ["@Min / @Max / @Positive / @PositiveOrZero", "numeric bounds", "use @DecimalMin for BigDecimal strings"],
        ["@Email / @Pattern(regexp)", "format", "@Email is lenient; add @Pattern for stricter rules"],
        ["@Past / @Future / @FutureOrPresent", "dates and times", "uses the clock at validation time"],
        ["@Valid", "cascade into nested object or elements", "needed for nested DTOs"]],
      code: `record Address(@NotBlank String city, @Pattern(regexp = "[1-9][0-9]{5}", message = "must be 6 digits") String pin) { }
record Customer(@NotBlank String name, @Valid @NotNull Address address, @Size(max = 3) List<@NotBlank String> tags) { }
Validator v = Validation.buildDefaultValidatorFactory().getValidator();
v.validate(new Customer("Ravi", new Address("", "0110"), List.of("gold", " ")))
 .stream().map(e -> e.getPropertyPath() + " = '" + e.getInvalidValue() + "': " + e.getMessage()).sorted().forEach(System.out::println);
System.out.println("without @Valid the nested Address would not be checked at all");` },
    { title: "Custom constraints",
      text: "When no built-in fits, write a constraint annotation with `@Constraint(validatedBy = …)` and the three required members (`message`, `groups`, `payload`), plus a **`ConstraintValidator`** that implements `isValid`. Keep validators pure and fast, return `true` for `null` (let `@NotNull` decide presence), and make the validator class public with a no-arg constructor. In Spring, validators are created through the bean factory, so they can even have dependencies injected (but avoid database calls for simple format checks).",
      code: `@Target({ElementType.FIELD, ElementType.RECORD_COMPONENT}) @Retention(RetentionPolicy.RUNTIME) @Constraint(validatedBy = Checks.IfscValidator.class)
@interface Ifsc { String message() default "must be an IFSC code like HDFC0001234"; Class<?>[] groups() default {}; Class<? extends Payload>[] payload() default {}; }

class Checks {
    public static class IfscValidator implements ConstraintValidator<Ifsc, String> {   // public: instantiated reflectively
        public boolean isValid(String v, ConstraintValidatorContext c) { return v == null || v.matches("[A-Z]{4}0[A-Z0-9]{6}"); }
    }
}
record Payee(@NotBlank String name, @NotBlank String account, @Ifsc String ifsc) { }
Validator v = Validation.buildDefaultValidatorFactory().getValidator();
for (String code : List.of("HDFC0001234", "hdfc1234", "SBIN0ABC123"))
    System.out.println(code + " → " + v.validate(new Payee("Meera", "1234567890", code)).stream().map(ConstraintViolation::getMessage).findFirst().orElse("ok"));` },
    { title: "Groups and cross-field rules",
      text: "**Validation groups** apply different rules in different situations, for example `id` must be null on create but present on update. Constraints without `groups` belong to `Default`; Spring's **`@Validated(OnUpdate.class)`** (instead of `@Valid`) selects groups. Use groups sparingly; separate request DTOs per operation are often clearer. **Cross-field** rules (end date after start date, passwords match) go in a class-level constraint or a simple `@AssertTrue` method on the DTO.",
      code: `interface OnCreate { }
interface OnUpdate { }
record Trip(@Null(groups = OnCreate.class) @NotNull(groups = OnUpdate.class) Long id, @NotNull LocalDate start, @NotNull LocalDate end) {
    @AssertTrue(message = "end must not be before start") boolean isRangeValid() { return start == null || end == null || !end.isBefore(start); }
}
Validator v = Validation.buildDefaultValidatorFactory().getValidator();
Trip t = new Trip(null, LocalDate.of(2026, 12, 20), LocalDate.of(2026, 12, 18));
System.out.println("Default : " + v.validate(t).stream().map(e -> e.getPropertyPath() + " " + e.getMessage()).toList());
System.out.println("OnCreate: " + v.validate(t, OnCreate.class).size() + " violations");
System.out.println("OnUpdate: " + v.validate(t, OnUpdate.class).stream().map(e -> e.getPropertyPath() + " " + e.getMessage()).toList());` },
    { title: "Validating requests in controllers",
      text: "Put **`@Valid`** (or `@Validated`) on a `@RequestBody` or `@ModelAttribute` parameter. Failures throw **`MethodArgumentNotValidException`** (400) before your method runs; its `BindingResult` lists field errors. Since Spring 6.1, constraints placed **directly on** `@PathVariable`, `@RequestParam` or header parameters are checked by built-in **method validation** and raise **`HandlerMethodValidationException`**. Malformed JSON never reaches validation: it fails earlier as `HttpMessageNotReadableException`.",
      code: `record NewUser(@NotBlank String name, @Email @NotBlank String email) { }
@RestController class UserController {
    @PostMapping("/users") ResponseEntity<String> create(@Valid @RequestBody NewUser u) { return ResponseEntity.status(201).body("created " + u.name()); }
    @GetMapping("/users") String page(@RequestParam @Min(1) @Max(100) int size) { return "size " + size; }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new UserController()).build();
MvcResult r = mvc.perform(post("/users").contentType(MediaType.APPLICATION_JSON).content("{\\"name\\":\\"\\",\\"email\\":\\"x\\"}")).andReturn();
var ex = (MethodArgumentNotValidException) r.getResolvedException();
System.out.println(r.getResponse().getStatus() + " " + ex.getClass().getSimpleName() + " " + ex.getFieldErrors().stream().map(f -> f.getField() + ": " + f.getDefaultMessage()).sorted().toList());
MvcResult r2 = mvc.perform(get("/users").param("size", "500")).andReturn();
System.out.println(r2.getResponse().getStatus() + " " + r2.getResolvedException().getClass().getSimpleName());` },
    { title: "@RestControllerAdvice and @ExceptionHandler",
      text: "A **`@RestControllerAdvice`** class holds `@ExceptionHandler` methods that apply to all controllers (narrow it with `basePackages` or `assignableTypes`). Spring picks the handler for the **most specific** exception type. Map **domain exceptions** (`OrderNotFoundException` → 404, `InsufficientBalanceException` → 409/422) to statuses here, so services throw meaningful exceptions without knowing about HTTP. Extending **`ResponseEntityExceptionHandler`** gives consistent bodies for Spring MVC's own exceptions (400, 405, 406, 415…) and lets you override individual cases.",
      m: M(["flowchart TB",
        "  S[\"service throws<br/>OrderNotFoundException\"]:::s4 --> D[\"DispatcherServlet<br/>exception resolvers\"]:::s2",
        "  D --> A[\"@RestControllerAdvice<br/>most specific @ExceptionHandler\"]:::s3 --> R[\"404 application/problem+json\"]:::s1",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `class NotFoundException extends RuntimeException { NotFoundException(String m) { super(m); } }
class InsufficientFundsException extends RuntimeException { InsufficientFundsException(String m) { super(m); } }
@RestController class WalletController {
    @PostMapping("/wallets/{id}/pay") String pay(@PathVariable String id, @RequestParam int amount) {
        if (!id.equals("w1")) throw new NotFoundException("wallet " + id + " not found");
        if (amount > 500) throw new InsufficientFundsException("balance 500 is less than " + amount);
        return "paid " + amount;
    }
}
@RestControllerAdvice class Errors {
    @ExceptionHandler(NotFoundException.class) ResponseEntity<String> nf(NotFoundException e) { return ResponseEntity.status(404).body(e.getMessage()); }
    @ExceptionHandler(InsufficientFundsException.class) ResponseEntity<String> funds(InsufficientFundsException e) { return ResponseEntity.status(409).body(e.getMessage()); }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new WalletController()).setControllerAdvice(new Errors()).build();
for (String[] c : new String[][] {{"w1", "200"}, {"w9", "200"}, {"w1", "900"}}) {
    var res = mvc.perform(post("/wallets/" + c[0] + "/pay").param("amount", c[1])).andReturn().getResponse();
    System.out.println(c[0] + " ₹" + c[1] + " → " + res.getStatus() + " " + res.getContentAsString());
}`,
      analogy: "The advice is the customer-service desk: every department sends its problems there, and the desk answers customers in one standard format." },
    { title: "Problem Details (RFC 9457) with ProblemDetail",
      text: "RFC 9457 (which replaces RFC 7807) defines a standard JSON error body served as **`application/problem+json`**. Spring's **`ProblemDetail`** models it, and `ErrorResponse`/`ErrorResponseException` carry one. Return a `ProblemDetail` from an `@ExceptionHandler`, add extension members with `setProperty`, and in Boot set `spring.mvc.problemdetails.enabled=true` to get them for framework errors without writing an advice. Use stable `type` URIs that clients can switch on; never put stack traces or SQL in `detail`.",
      table: [["Member", "Meaning", "Example"],
        ["type", "URI identifying the problem kind", "https://api.example.com/problems/out-of-stock"],
        ["title", "Short, human-readable summary of the type", "Out of stock"],
        ["status", "HTTP status code", "409"],
        ["detail", "Explanation of this occurrence", "mango is out of stock until April"],
        ["instance", "URI of this occurrence", "/api/orders"],
        ["extensions", "Any extra members", "errors, correlationId, retryAfter"]],
      code: `class OutOfStockException extends RuntimeException { OutOfStockException(String m) { super(m); } }
@RestController class CartController {
    @PostMapping("/cart/{sku}") String add(@PathVariable String sku) { throw new OutOfStockException(sku + " is out of stock"); }
}
@RestControllerAdvice class Problems extends ResponseEntityExceptionHandler {
    @ExceptionHandler(OutOfStockException.class) ProblemDetail oos(OutOfStockException e) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
        pd.setType(URI.create("https://api.example.com/problems/out-of-stock")); pd.setTitle("Out of stock");
        pd.setProperty("restockDate", "2027-04-01");
        return pd;
    }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new CartController()).setControllerAdvice(new Problems()).build();
var res = mvc.perform(post("/cart/MANGO-1")).andReturn().getResponse();
System.out.println(res.getStatus() + " " + res.getContentType());
System.out.println(res.getContentAsString());
var res405 = mvc.perform(get("/cart/MANGO-1")).andReturn().getResponse();
System.out.println(res405.getStatus() + " " + res405.getContentAsString());` },
    { title: "Validation in services vs controllers",
      text: "Controller validation protects the **HTTP boundary**, but services are also called from message listeners, schedulers and other services. Put **`@Validated`** on a Spring bean and constraints on method parameters/returns, and Boot's `MethodValidationPostProcessor` (AOP proxy) enforces them everywhere, throwing **`ConstraintViolationException`**. Keep **format** rules on DTOs, **invariants** in domain objects (constructors that refuse invalid state), and **business rules** needing data (stock, limits, uniqueness) in services. The database's constraints (NOT NULL, UNIQUE, CHECK) are the last line of defence.",
      m: M(["flowchart TB",
        "  C[\"Controller: @Valid DTO<br/>format, required, ranges\"]:::s2 --> S[\"Service: @Validated methods<br/>+ business rules\"]:::s4",
        "  K[\"Kafka listener / scheduler\"]:::s1 --> S",
        "  S --> Dm[\"Domain objects<br/>invariants in constructors\"]:::s3 --> DB[\"DB constraints<br/>NOT NULL, UNIQUE\"]:::s1",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `@Service @Validated
class TransferService {
    String transfer(@NotBlank String from, @NotBlank String to, @Positive long paise) { return "moved " + paise + " paise " + from + " → " + to; }
}
new ApplicationContextRunner()
    .withConfiguration(AutoConfigurations.of(org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration.class))
    .withBean(TransferService.class)
    .run(ctx -> {
        TransferService svc = ctx.getBean(TransferService.class);
        System.out.println(svc.transfer("acc-1", "acc-2", 5000));
        try { svc.transfer("acc-1", "", -5); }
        catch (ConstraintViolationException e) { e.getConstraintViolations().stream().map(v -> v.getPropertyPath() + ": " + v.getMessage()).sorted().forEach(System.out::println); }
    });` },
    { title: "Designing exceptions and status codes",
      text: "Use **unchecked** domain exceptions with clear names and the data needed for the response (ids, limits); group them under a base type if many share a mapping. Map: invalid input → **400** (or 422 for semantically invalid but well-formed requests, if your API guideline says so), unauthenticated → 401, forbidden → 403, missing → 404, state conflicts and optimistic locking → **409**, rate limits → 429, downstream failures → 502/503/504, bugs → **500** with a generic message. Never catch-and-ignore; never return 200 with an error flag; don't leak internal messages, class names or stack traces.",
      table: [["Situation", "Exception", "Status"],
        ["Malformed JSON, wrong types", "HttpMessageNotReadableException", "400"],
        ["Field constraints fail", "MethodArgumentNotValidException", "400"],
        ["Unknown id", "OrderNotFoundException", "404"],
        ["Duplicate email / stale @Version", "DuplicateEmailException / OptimisticLockingFailureException", "409"],
        ["Business rule refuses", "InsufficientBalanceException", "409 or 422"],
        ["Dependency timed out", "PaymentGatewayTimeoutException", "503 / 504"],
        ["Anything unexpected", "Exception (catch-all)", "500, generic detail"]],
      code: `abstract class ApiException extends RuntimeException {
    final HttpStatus status; final String type;
    ApiException(HttpStatus status, String type, String msg) { super(msg); this.status = status; this.type = type; }
}
class OrderNotFound extends ApiException { OrderNotFound(long id) { super(HttpStatus.NOT_FOUND, "order-not-found", "order " + id + " not found"); } }
class DuplicateEmail extends ApiException { DuplicateEmail(String e) { super(HttpStatus.CONFLICT, "duplicate-email", e + " is already registered"); } }
@RestControllerAdvice class OneHandler {
    @ExceptionHandler(ApiException.class) ProblemDetail api(ApiException e) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(e.status, e.getMessage()); pd.setType(URI.create("/problems/" + e.type)); return pd;
    }
}
@RestController class Demo {
    @GetMapping("/o/{id}") String o(@PathVariable long id) { throw new OrderNotFound(id); }
    @PostMapping("/u") String u(@RequestParam String email) { throw new DuplicateEmail(email); }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new Demo()).setControllerAdvice(new OneHandler()).build();
System.out.println(mvc.perform(get("/o/7")).andReturn().getResponse().getContentAsString());
System.out.println(mvc.perform(post("/u").param("email", "asha@example.com")).andReturn().getResponse().getContentAsString());` },
    { title: "Logging errors with correlation IDs",
      text: "Give each request a **correlation id**: reuse the caller's `X-Correlation-Id` (or W3C `traceparent` with Micrometer Tracing) or generate one in a **filter**, put it in the SLF4J **MDC** so every log line includes it (`%X{cid}` in the pattern), return it in a response header and in 500 Problem Details. Log **once**, at the boundary: 4xx at WARN/INFO without stack traces, 5xx at ERROR with the stack trace. Clear the MDC in `finally`, since threads are pooled (lesson J24).",
      code: `class CorrelationFilter extends OncePerRequestFilter {
    protected void doFilterInternal(HttpServletRequest rq, HttpServletResponse rs, FilterChain ch) throws jakarta.servlet.ServletException, java.io.IOException {
        String cid = Optional.ofNullable(rq.getHeader("X-Correlation-Id")).orElse("gen-" + Math.abs(rq.getRequestURI().hashCode() % 10000));
        MDC.put("cid", cid); rs.setHeader("X-Correlation-Id", cid);
        try { ch.doFilter(rq, rs); } finally { MDC.remove("cid"); }
    }
}
@RestController class Boom { @GetMapping("/boom") String boom() { throw new IllegalStateException("price cache empty"); } }
@RestControllerAdvice class Last {
    private static final Logger log = LoggerFactory.getLogger(Last.class);
    @ExceptionHandler(Exception.class) ProblemDetail any(Exception e) {
        log.error("unhandled error cid={}", MDC.get("cid"), e);           // full stack trace in logs only
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error");
        pd.setProperty("correlationId", MDC.get("cid")); return pd;
    }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new Boom()).setControllerAdvice(new Last()).addFilters(new CorrelationFilter()).build();
var res = mvc.perform(get("/boom").header("X-Correlation-Id", "c-91ab")).andReturn().getResponse();
System.out.println(res.getStatus() + " header=" + res.getHeader("X-Correlation-Id") + " body=" + res.getContentAsString());
System.out.println("MDC after request: " + MDC.get("cid"));`,
      analogy: "A correlation id is the token number at a bank: the teller, back office and manager all write it on their notes, so the whole story of one customer's visit can be pulled out later." }
  ];

  H.registerLesson({
    code: "S05",
    summary: "Making APIs production-grade with validated input and clean errors: Jakarta Bean Validation (`@Valid`, built-in and custom constraints, nesting, groups, cross-field rules), validation in controllers and services, `@RestControllerAdvice` with `@ExceptionHandler` to map domain exceptions to HTTP, RFC 9457 Problem Details via `ProblemDetail`, exception and status-code design, and logging errors with correlation IDs.",
    slides: SLIDES,
    widget: { heading: "Interactive: what happens to a bad request?", caption: "Send valid and invalid requests to a validated endpoint with a `@RestControllerAdvice`. Each status and Problem Details body was recorded with Spring 6.2 MockMvc and Hibernate Validator 8.", render: s05Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Sign-up forms", "Mobile apps show field-level messages straight from the `errors` map in a 400 Problem Details response."],
      ["Payments", "`InsufficientBalanceException` from the service becomes a 409 with a `type` URI the app switches on to show a 'top up' screen."],
      ["Partner APIs", "A documented error catalogue (type URIs) lets partners handle failures without parsing English messages."],
      ["Support", "Customers quote the `correlationId` from a 500 response; engineers search logs for it and see the whole request."],
      ["Batch imports", "The same `@Validated` service method rejects bad rows coming from CSV uploads and Kafka messages, not just HTTP."],
      ["Security reviews", "Generic 500 messages make sure stack traces, SQL and class names never leak to clients."]
    ],
    pitfalls: [
      "Forgetting `@Valid` on the `@RequestBody`, or on nested objects",
      "Using `@NotNull` on strings that should be `@NotBlank`",
      "try/catch with hand-built error maps in every controller",
      "Returning 200 with `{\"success\": false}`",
      "Leaking exception messages, SQL or stack traces in responses",
      "Logging the same exception at every layer",
      "Validating only in controllers when services have other callers",
      "Validators that hit the database for simple format checks",
      "Catch-all handlers that hide 4xx cases as 500"
    ],
    quiz: [
      { q: "A POST body has a blank `@NotBlank` field and `@Valid` on the parameter. What happens?", options: ["The method runs with the blank value", "MethodArgumentNotValidException is thrown before the method runs → 400", "500", "Spring silently trims the value"], answer: 1, why: "Recorded in the widget: 400 with the field error." },
      { q: "Which constraint rejects null, empty and whitespace-only strings?", options: ["@NotNull", "@NotEmpty", "@NotBlank", "@Size(min=1)"], answer: 2, why: "@NotEmpty would accept \" \"." },
      { q: "A Customer DTO has an Address field without `@Valid`. Are Address's constraints checked?", options: ["Yes, always", "No, nested validation needs @Valid to cascade", "Only in services", "Only for records"], answer: 1, why: "@Valid marks the cascade." },
      { q: "Malformed JSON in the request body produces…", options: ["MethodArgumentNotValidException", "HttpMessageNotReadableException → 400", "ConstraintViolationException", "NullPointerException"], answer: 1, why: "Parsing fails before validation can run." },
      { q: "What content type do RFC 9457 error bodies use?", options: ["application/json", "application/problem+json", "text/plain", "application/error+json"], answer: 1, why: "Spring sets it for ProblemDetail responses." },
      { q: "Where should 'item is out of stock' be checked?", options: ["Bean Validation on the DTO", "In the service, raising a domain exception mapped to 409/422", "In the database only", "In the client"], answer: 1, why: "It needs current data, so it's a business rule." },
      { q: "Why extend ResponseEntityExceptionHandler in your advice?", options: ["It's required", "It gives consistent ProblemDetail responses for Spring MVC's own exceptions, with override hooks", "It enables validation", "It logs everything"], answer: 1, why: "405/415/400 etc. get the same format." },
      { q: "@Validated on a @Service with constraints on method parameters. A bad call throws…", options: ["MethodArgumentNotValidException", "ConstraintViolationException via a method-validation proxy", "Nothing; only controllers validate", "IllegalArgumentException"], answer: 1, why: "MethodValidationPostProcessor applies AOP." },
      { q: "Why clear the MDC in a finally block?", options: ["To save memory", "Threads are pooled; a leftover correlation id would appear in another request's logs", "SLF4J requires it", "To flush logs"], answer: 1, why: "Same leak as ThreadLocal (J24)." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Code"],
        ["Validate body", "`create(@Valid @RequestBody OrderRequest r)`"],
        ["Validate params", "`@RequestParam @Min(1) @Max(100) int size` (Spring 6.1+)"],
        ["Nested", "`@Valid Address address`, `List<@NotBlank String> tags`"],
        ["Groups", "`@Validated(OnUpdate.class)`"],
        ["Service methods", "`@Service @Validated` + parameter constraints"],
        ["Global handler", "`@RestControllerAdvice class ApiErrors extends ResponseEntityExceptionHandler`"],
        ["Problem body", "`ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, msg)` + `setType`, `setProperty`"],
        ["Boot default", "`spring.mvc.problemdetails.enabled=true`"],
        ["Correlation", "Filter + `MDC.put(\"cid\", id)` + `%X{cid}` in log pattern"]],
      cards: [
        { title: "Validation layers", items: ["DTO format rules", "Domain invariants", "Service business rules", "DB constraints last"] },
        { title: "Error responses", items: ["Precise status", "Problem Details", "Stable type URIs", "Field errors map", "No internals leaked"] },
        { title: "Say in interviews", items: ["@Valid vs @Validated", "MethodArgumentNotValid vs ConstraintViolation", "Advice + domain exceptions", "RFC 9457", "Log once with correlation id"] }]
    },
    practice: [
      { level: "Easy", q: "Add validation to a registration DTO and print all violations for a bad input.",
        a: ["Annotate record components with @NotBlank, @Email, @Size, @Min.",
          "Validate with a Validator and print path + message for each violation."],
        code: `record Register(@NotBlank String username, @Email @NotBlank String email, @Size(min = 10, max = 10) String phone, @Min(13) int age) { }
Validator v = Validation.buildDefaultValidatorFactory().getValidator();
v.validate(new Register("", "not-an-email", "98765", 9)).stream()
 .map(e -> e.getPropertyPath() + ": " + e.getMessage()).sorted().forEach(System.out::println);` },
      { level: "Easy", q: "@Valid vs @Validated: what's the difference?",
        a: ["@Valid is the Jakarta standard: triggers validation and marks nested cascading.",
          "@Validated is Spring's: supports validation groups, and on a class enables method validation through a proxy.",
          "In controllers either triggers body validation; use @Validated(Group.class) for groups."] },
      { level: "Easy", q: "Why should services throw domain exceptions instead of ResponseStatusException?",
        a: ["Services shouldn't depend on HTTP: they're reused from jobs, listeners and tests.",
          "Domain exceptions name the problem; the advice decides the HTTP mapping in one place.",
          "ResponseStatusException is fine for quick controller-level cases."] },
      { level: "Medium", q: "Write a custom @StrongPassword constraint (8+ chars, one digit, one uppercase).",
        a: ["Annotation with @Constraint and message/groups/payload.",
          "Public ConstraintValidator returning true for null.",
          "Test it with a Validator."],
        code: `@Target({ElementType.FIELD, ElementType.RECORD_COMPONENT}) @Retention(RetentionPolicy.RUNTIME) @Constraint(validatedBy = Rules.StrongPasswordValidator.class)
@interface StrongPassword { String message() default "needs 8+ chars, a digit and an uppercase letter"; Class<?>[] groups() default {}; Class<? extends Payload>[] payload() default {}; }
class Rules {
    public static class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {
        public boolean isValid(String p, ConstraintValidatorContext c) { return p == null || (p.length() >= 8 && p.chars().anyMatch(Character::isDigit) && p.chars().anyMatch(Character::isUpperCase)); }
    }
}
record Account(@StrongPassword String password) { }
Validator v = Validation.buildDefaultValidatorFactory().getValidator();
for (String p : List.of("password", "Passw0rdOk", "Ab1")) System.out.println(p + " → " + (v.validate(new Account(p)).isEmpty() ? "ok" : "rejected"));` },
      { level: "Medium", q: "Build an advice that returns Problem Details with a field `errors` map for validation failures.",
        a: ["Extend ResponseEntityExceptionHandler and override handleMethodArgumentNotValid.",
          "Collect field → message from getFieldErrors.",
          "Return a ProblemDetail with title, type and the errors property."],
        code: `record Item(@NotBlank String name, @Positive int price) { }
@RestController class ItemController { @PostMapping("/items") String add(@Valid @RequestBody Item i) { return "ok"; } }
@RestControllerAdvice class ValidationAdvice extends ResponseEntityExceptionHandler {
    @Override protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders h, HttpStatusCode s, WebRequest w) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Invalid request");
        Map<String, String> errors = new TreeMap<>();
        ex.getFieldErrors().forEach(f -> errors.put(f.getField(), f.getDefaultMessage()));
        pd.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(pd);
    }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new ItemController()).setControllerAdvice(new ValidationAdvice()).build();
System.out.println(mvc.perform(post("/items").contentType(MediaType.APPLICATION_JSON).content("{\\"name\\":\\"\\",\\"price\\":-3}")).andReturn().getResponse().getContentAsString());` },
      { level: "Medium", q: "Which status codes would you return for: unknown id, duplicate email, stale version, expired coupon, payment provider timeout?",
        a: ["Unknown id: 404.",
          "Duplicate email: 409 Conflict.",
          "Stale @Version (optimistic lock): 409 (or 412 when using If-Match).",
          "Expired coupon: 422 or 409, as your API guideline defines for business rule violations; be consistent.",
          "Provider timeout: 503/504 (maybe with Retry-After), never a generic 500 without context."] },
      { level: "Medium", q: "How do you make validation messages localisable?",
        a: ["Use message keys: @NotBlank(message = \"{order.item.required}\").",
          "Define them in ValidationMessages.properties (and _hi, _ta… variants) or wire Spring's MessageSource into LocalValidatorFactoryBean.",
          "Resolve locale from Accept-Language; keep machine-readable codes (field + constraint) alongside text."] },
      { level: "Hard", q: "Design a company-wide error contract and its implementation in Spring.",
        steps: ["Problem Details for every error: type URI catalogue, title, status, detail, instance, plus correlationId and errors[] for validation (field, code, message).",
          "One shared library with a base ApiException(status, type), the advice extending ResponseEntityExceptionHandler, and the correlation filter.",
          "Map framework, validation, security (401/403 via Spring Security entry points) and downstream errors consistently.",
          "Log once: 4xx at INFO/WARN without stack, 5xx at ERROR with stack and MDC.",
          "Document errors in OpenAPI and contract-test them; never break type URIs."] },
      { level: "Hard", q: "A service is called from REST, Kafka and a nightly batch. Make sure invalid input is rejected everywhere and reported properly.",
        a: ["@Validated on the service with constraints on parameters (or validated command objects).",
          "REST: ConstraintViolationException mapped to 400 in the advice (in addition to @Valid at the controller).",
          "Kafka: catch validation failures, send the record to a dead-letter topic with the reasons; don't retry forever.",
          "Batch: collect row-level violations into a report instead of failing the whole job.",
          "Domain invariants in constructors guarantee nothing invalid is persisted regardless of entry point."],
        code: `record Command(@NotBlank String sku, @Positive int qty) { }
@Service @Validated class StockService { String reserve(@Valid Command c) { return "reserved " + c.qty() + " × " + c.sku(); } }
new ApplicationContextRunner()
    .withConfiguration(AutoConfigurations.of(org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration.class))
    .withBean(StockService.class)
    .run(ctx -> {
        StockService s = ctx.getBean(StockService.class);
        List<String> deadLetters = new ArrayList<>();
        for (Command c : List.of(new Command("TEA-1", 2), new Command("", 1), new Command("COF-9", 0))) {
            try { System.out.println(s.reserve(c)); }
            catch (ConstraintViolationException e) { deadLetters.add(c + " → " + e.getConstraintViolations().stream().map(v -> v.getPropertyPath() + " " + v.getMessage()).sorted().toList()); }
        }
        deadLetters.forEach(d -> System.out.println("DLQ: " + d));
    });` },
      { level: "Hard", q: "Validation that needs the database (e.g. unique username): constraint or service check?",
        a: ["A custom constraint with an injected repository works, but hides a query inside validation and is racy.",
          "Prefer a service check for a friendly error plus a UNIQUE index as the real guarantee.",
          "Catch DataIntegrityViolationException on insert and map it to 409, because two requests can pass the check concurrently.",
          "Same pattern as check-then-act races in J12."] }
    ],
    recap: [
      "Validate format at the edge with Bean Validation (`@Valid`, precise constraints, cascading, custom constraints).",
      "Business rules live in services and raise domain exceptions; `@Validated` services protect every caller.",
      "One `@RestControllerAdvice` maps exceptions to statuses; extend ResponseEntityExceptionHandler for framework errors.",
      "Return RFC 9457 Problem Details with stable type URIs and field errors; never leak internals.",
      "Log once at the boundary with a correlation id in the MDC, and return it to clients."
    ]
  });
})();
