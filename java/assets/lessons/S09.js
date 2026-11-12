/* Lesson S09: Testing Spring apps: slices, MockMvc, Testcontainers */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded with Spring Boot 3.4.1 / JUnit 5.11: one small app (Order entity, repository, service, controller, security)
  // and ten real test classes run in order through the JUnit Platform Launcher in a single JVM. ms = wall time per class;
  // ctx = application contexts created (counted with a ContextRefreshedEvent listener); beans = bean definitions in that
  // context. Three variants of where the SecurityFilterChain bean lives: on the @SpringBootApplication class, in a separate
  // @Configuration, and separate + @Import in the @WebMvcTest.
  var REC = {"main":[{"cls":"A_UnitTest","ms":878,"ctx":0,"beans":"","tests":[["bigOrderNeedsApproval()","SUCCESSFUL",""],["placesOrder()","SUCCESSFUL",""],["rejectsZeroQty()","SUCCESSFUL",""]]},{"cls":"B_StandaloneMockMvc","ms":577,"ctx":0,"beans":"","tests":[["notFound()","SUCCESSFUL",""],["getsOrder()","SUCCESSFUL",""]]},{"cls":"C_WebMvcSlice","ms":1057,"ctx":1,"beans":"171","tests":[["postNeedsAuth()","SUCCESSFUL",""],["getIsPublic()","SUCCESSFUL",""],["postValidates()","SUCCESSFUL",""]]},{"cls":"D_DataJpaSlice","ms":1027,"ctx":0,"beans":"","tests":[["customQuery()","FAILED","java.lang.IllegalStateException: Failed to load ApplicationContext for [MergedContextConfiguration@3128be29 testClass = demo.Tests.D_DataJpaSlice, locations = ["],["rolledBackBetweenTests()","FAILED","java.lang.IllegalStateException: ApplicationContext failure threshold (1) exceeded: skipping repeated attempt to load context for [MergedContextConfiguration@31"]]},{"cls":"E_FullContextMock","ms":2724,"ctx":1,"beans":"585","tests":[["createThenRead()","SUCCESSFUL",""]]},{"cls":"F_SameConfigAgain","ms":12,"ctx":0,"beans":"","tests":[["reusesCachedContext()","SUCCESSFUL",""]]},{"cls":"G_DifferentMockBean","ms":1025,"ctx":1,"beans":"585","tests":[["approvalPath()","SUCCESSFUL",""]]},{"cls":"H_RealServer","ms":1398,"ctx":1,"beans":"578","tests":[["overRealHttp()","SUCCESSFUL",""]]},{"cls":"I_DirtiesContext","ms":26,"ctx":0,"beans":"","tests":[["dirties()","SUCCESSFUL",""]]},{"cls":"J_AfterDirties","ms":944,"ctx":1,"beans":"585","tests":[["mustRebuild()","SUCCESSFUL",""]]}],"separate":[{"cls":"A_UnitTest","ms":832,"ctx":0,"beans":"","tests":[["bigOrderNeedsApproval()","SUCCESSFUL",""],["placesOrder()","SUCCESSFUL",""],["rejectsZeroQty()","SUCCESSFUL",""]]},{"cls":"B_StandaloneMockMvc","ms":604,"ctx":0,"beans":"","tests":[["notFound()","SUCCESSFUL",""],["getsOrder()","SUCCESSFUL",""]]},{"cls":"C_WebMvcSlice","ms":931,"ctx":1,"beans":"174","tests":[["postNeedsAuth()","FAILED","java.lang.AssertionError: Status expected:<401> but was:<403>"],["getIsPublic()","FAILED","java.lang.AssertionError: Status expected:<200> but was:<401>"],["postValidates()","FAILED","java.lang.AssertionError: Status expected:<400> but was:<403>"]]},{"cls":"D_DataJpaSlice","ms":1506,"ctx":1,"beans":"80","tests":[["customQuery()","SUCCESSFUL",""],["rolledBackBetweenTests()","SUCCESSFUL",""]]},{"cls":"E_FullContextMock","ms":2337,"ctx":1,"beans":"586","tests":[["createThenRead()","SUCCESSFUL",""]]},{"cls":"F_SameConfigAgain","ms":13,"ctx":0,"beans":"","tests":[["reusesCachedContext()","SUCCESSFUL",""]]},{"cls":"G_DifferentMockBean","ms":1091,"ctx":1,"beans":"586","tests":[["approvalPath()","SUCCESSFUL",""]]},{"cls":"H_RealServer","ms":1533,"ctx":1,"beans":"579","tests":[["overRealHttp()","SUCCESSFUL",""]]},{"cls":"I_DirtiesContext","ms":34,"ctx":0,"beans":"","tests":[["dirties()","SUCCESSFUL",""]]},{"cls":"J_AfterDirties","ms":954,"ctx":1,"beans":"586","tests":[["mustRebuild()","SUCCESSFUL",""]]}],"import":[{"cls":"A_UnitTest","ms":834,"ctx":0,"beans":"","tests":[["bigOrderNeedsApproval()","SUCCESSFUL",""],["placesOrder()","SUCCESSFUL",""],["rejectsZeroQty()","SUCCESSFUL",""]]},{"cls":"B_StandaloneMockMvc","ms":591,"ctx":0,"beans":"","tests":[["notFound()","SUCCESSFUL",""],["getsOrder()","SUCCESSFUL",""]]},{"cls":"C_WebMvcSlice","ms":996,"ctx":1,"beans":"172","tests":[["postNeedsAuth()","SUCCESSFUL",""],["getIsPublic()","SUCCESSFUL",""],["postValidates()","SUCCESSFUL",""]]},{"cls":"D_DataJpaSlice","ms":1457,"ctx":1,"beans":"80","tests":[["customQuery()","SUCCESSFUL",""],["rolledBackBetweenTests()","SUCCESSFUL",""]]},{"cls":"E_FullContextMock","ms":2138,"ctx":1,"beans":"586","tests":[["createThenRead()","SUCCESSFUL",""]]},{"cls":"F_SameConfigAgain","ms":20,"ctx":0,"beans":"","tests":[["reusesCachedContext()","SUCCESSFUL",""]]},{"cls":"G_DifferentMockBean","ms":1049,"ctx":1,"beans":"586","tests":[["approvalPath()","SUCCESSFUL",""]]},{"cls":"H_RealServer","ms":1397,"ctx":1,"beans":"579","tests":[["overRealHttp()","SUCCESSFUL",""]]},{"cls":"I_DirtiesContext","ms":29,"ctx":0,"beans":"","tests":[["dirties()","SUCCESSFUL",""]]},{"cls":"J_AfterDirties","ms":989,"ctx":1,"beans":"586","tests":[["mustRebuild()","SUCCESSFUL",""]]}]};
  var SRC = {"A_UnitTest":"@ExtendWith(MockitoExtension.class)\nstatic class A_UnitTest {\n  @Mock OrderRepo repo; @Mock PriceClient prices; @InjectMocks OrderService svc;\n  @Test void placesOrder() { when(prices.priceOf(\"tea\")).thenReturn(30); when(repo.save(any())).thenAnswer(i -> i.getArgument(0)); assertThat(svc.place(\"tea\", 2).qty).isEqualTo(2); verify(repo).save(any()); }\n  @Test void bigOrderNeedsApproval() { when(prices.priceOf(\"laptop\")).thenReturn(90_000); assertThatThrownBy(() -> svc.place(\"laptop\", 1)).hasMessage(\"needs approval\"); verifyNoInteractions(repo); }\n  @Test void rejectsZeroQty() { assertThatThrownBy(() -> svc.place(\"tea\", 0)).isInstanceOf(IllegalArgumentException.class); }\n}","B_StandaloneMockMvc":"static class B_StandaloneMockMvc {\n  OrderService svc = mock(OrderService.class);\n  MockMvc mvc = MockMvcBuilders.standaloneSetup(new OrderController(svc)).build();\n  @Test void getsOrder() throws Exception { Order o = new Order(\"tea\", 2); o.id = 1L; when(svc.get(1)).thenReturn(o); mvc.perform(get(\"/orders/1\")).andExpect(status().isOk()).andExpect(jsonPath(\"$.item\").value(\"tea\")); }\n  @Test void notFound() throws Exception { when(svc.get(9)).thenThrow(new java.util.NoSuchElementException(\"order 9\")); mvc.perform(get(\"/orders/9\")).andExpect(status().isNotFound()); }\n}","C_WebMvcSlice":"@WebMvcTest(OrderController.class) @org.springframework.context.annotation.Import(SecurityConfig.class)\nstatic class C_WebMvcSlice {\n  @Autowired MockMvc mvc; @MockitoBean OrderService svc;\n  @Test void getIsPublic() throws Exception { Order o = new Order(\"tea\", 2); o.id = 1L; when(svc.get(1)).thenReturn(o); mvc.perform(get(\"/orders/1\")).andExpect(status().isOk()); }\n  @Test void postNeedsAuth() throws Exception { mvc.perform(post(\"/orders\").contentType(MediaType.APPLICATION_JSON).content(\"{\\\"item\\\":\\\"tea\\\",\\\"qty\\\":2}\")).andExpect(status().isUnauthorized()); }\n  @Test @WithMockUser void postValidates() throws Exception { mvc.perform(post(\"/orders\").contentType(MediaType.APPLICATION_JSON).content(\"{\\\"item\\\":\\\"\\\",\\\"qty\\\":0}\")).andExpect(status().isBadRequest()); }\n}","D_DataJpaSlice":"@DataJpaTest\nstatic class D_DataJpaSlice {\n  @Autowired OrderRepo repo; @Autowired TestEntityManager em;\n  @Test void customQuery() { em.persist(new Order(\"tea\", 2)); em.persist(new Order(\"rice\", 10)); em.persist(new Order(\"dal\", 5)); assertThat(repo.bigOrders(5)).extracting(o -> o.item).containsExactly(\"rice\", \"dal\"); }\n  @Test void rolledBackBetweenTests() { assertThat(repo.count()).isZero(); }\n}","E_FullContextMock":"@SpringBootTest @AutoConfigureMockMvc\nstatic class E_FullContextMock {\n  @Autowired MockMvc mvc; @Autowired OrderRepo repo;\n  @Test @WithMockUser void createThenRead() throws Exception {\n    mvc.perform(post(\"/orders\").contentType(MediaType.APPLICATION_JSON).content(\"{\\\"item\\\":\\\"tea\\\",\\\"qty\\\":2}\")).andExpect(status().isCreated());\n    mvc.perform(get(\"/orders/\" + repo.findAll().get(0).id)).andExpect(jsonPath(\"$.qty\").value(2)); }\n}","F_SameConfigAgain":"@SpringBootTest @AutoConfigureMockMvc\nstatic class F_SameConfigAgain {\n  @Autowired MockMvc mvc;\n  @Test void reusesCachedContext() throws Exception { mvc.perform(get(\"/orders/999\")).andExpect(status().isNotFound()); }\n}","G_DifferentMockBean":"@SpringBootTest @AutoConfigureMockMvc\nstatic class G_DifferentMockBean {\n  @Autowired MockMvc mvc; @MockitoBean PriceClient prices;\n  @Test @WithMockUser void approvalPath() throws Exception { when(prices.priceOf(\"gold\")).thenReturn(50_000); org.junit.jupiter.api.Assertions.assertThrows(Exception.class, () -> mvc.perform(post(\"/orders\").contentType(MediaType.APPLICATION_JSON).content(\"{\\\"item\\\":\\\"gold\\\",\\\"qty\\\":1}\"))); }\n}","H_RealServer":"@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)\nstatic class H_RealServer {\n  @Autowired TestRestTemplate http;\n  @Test void overRealHttp() { ResponseEntity<Order> r = http.withBasicAuth(\"x\", \"y\").postForEntity(\"/orders\", new OrderController.NewOrder(\"tea\", 1), Order.class); assertThat(r.getStatusCode().value()).isEqualTo(401); assertThat(http.getForEntity(\"/orders/12345\", String.class).getStatusCode().value()).isEqualTo(404); }\n}","I_DirtiesContext":"@SpringBootTest @AutoConfigureMockMvc @DirtiesContext\nstatic class I_DirtiesContext {\n  @Autowired MockMvc mvc;\n  @Test void dirties() throws Exception { mvc.perform(get(\"/orders/1\")).andReturn(); }\n}","J_AfterDirties":"@SpringBootTest @AutoConfigureMockMvc\nstatic class J_AfterDirties {\n  @Autowired MockMvc mvc;\n  @Test void mustRebuild() throws Exception { mvc.perform(get(\"/orders/1\")).andReturn(); }\n}"};
  var APP = {"main":"@SpringBootApplication public class App {\n  @Bean PriceClient priceClient() { return item -> item.length() * 100; }\n  @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {\n    return http.authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.GET, \"/orders/**\").permitAll().anyRequest().authenticated()).httpBasic(b -> { }).csrf(c -> c.disable()).build();\n  }\n}","separate":"@SpringBootApplication public class App {\n  @Bean PriceClient priceClient() { return item -> item.length() * 100; }\n}\n@org.springframework.context.annotation.Configuration class SecurityConfig {\n  @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {\n    return http.authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.GET, \"/orders/**\").permitAll().anyRequest().authenticated()).httpBasic(b -> { }).csrf(c -> c.disable()).build();\n  }\n}"};
  var KIND = {
    A_UnitTest: ["Unit test", "Mockito only, no Spring", "#16a34a"],
    B_StandaloneMockMvc: ["Standalone MockMvc", "controller + mocks, no context", "#16a34a"],
    C_WebMvcSlice: ["@WebMvcTest slice", "MVC + security beans only", "#2563eb"],
    D_DataJpaSlice: ["@DataJpaTest slice", "JPA + embedded DB, rolls back", "#2563eb"],
    E_FullContextMock: ["@SpringBootTest", "whole app, mock servlet env", "#9333ea"],
    F_SameConfigAgain: ["@SpringBootTest again", "same config → cached context", "#9333ea"],
    G_DifferentMockBean: ["@SpringBootTest + @MockitoBean", "different config → new context", "#9333ea"],
    H_RealServer: ["@SpringBootTest(RANDOM_PORT)", "real Tomcat + TestRestTemplate", "#9333ea"],
    I_DirtiesContext: ["@DirtiesContext", "reuses, then throws the context away", "#9333ea"],
    J_AfterDirties: ["@SpringBootTest after dirtying", "must rebuild", "#9333ea"]
  };
  var VAR = [
    { k: "main", label: "Security bean on the main class", why: "The `SecurityFilterChain` `@Bean` sits on the `@SpringBootApplication` class. Slices always load that class, so `@DataJpaTest` tries to create the security bean without the web/security infrastructure and **fails to start**: *Parameter 0 of method chain in demo.App required a bean of type 'HttpSecurity' that could not be found.*" },
    { k: "separate", label: "Moved to its own @Configuration", why: "Moving the bean to `SecurityConfig` fixes `@DataJpaTest`, but now `@WebMvcTest` doesn't scan plain `@Configuration` classes either, so it runs with Boot's **default** security: GET returns 401 and POSTs fail CSRF with 403. All three web tests fail." },
    { k: "import", label: "...plus @Import in the web slice", why: "`@WebMvcTest(OrderController.class) @Import(SecurityConfig.class)` tests the controller with the **real** rules. Everything passes. Lesson: keep the main class bare, and import the configuration a slice needs." }
  ];
  function s09Widget(el, ctx) {
    var s = ctx.state; if (!s.v) s.v = "main"; if (!s.c) s.c = "D_DataJpaSlice";
    el.innerHTML = "<div class='btnrow' data-r='vs'>" + VAR.map(function (v) { return "<button type='button' class='btn' data-v='" + v.k + "'>" + v.label + "</button>"; }).join("") + "</div>" +
      "<div class='result' data-r='why' style='margin-top:8px'></div><div data-r='tot' style='display:flex;gap:10px;flex-wrap:wrap;margin:8px 0'></div><div data-r='rows'></div><div data-r='detail' style='margin-top:8px'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function card(label, val, bad) { return "<div style='flex:1;min-width:120px;border:1px solid #e5e7eb;border-radius:8px;padding:8px'><div style='font-size:12px;color:#64748b'>" + label + "</div><div style='font-size:18px;font-weight:700;color:" + (bad ? "#b91c1c" : "#111827") + "'>" + val + "</div></div>"; }
    function draw() {
      var v = VAR.filter(function (x) { return x.k === s.v; })[0], rows = REC[s.v];
      q("vs").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b.dataset.v === s.v); });
      q("why").innerHTML = ctx.md(v.why);
      var total = 0, ctxs = 0, fails = 0, tests = 0, max = 0;
      rows.forEach(function (r) { total += r.ms; ctxs += r.ctx; max = Math.max(max, r.ms); r.tests.forEach(function (t) { tests++; if (t[1] !== "SUCCESSFUL") fails++; }); });
      q("tot").innerHTML = card("tests", tests - fails + " passed / " + tests, fails > 0) + card("failed", fails + "", fails > 0) + card("contexts started", ctxs + "", false) + card("total time", (total / 1000).toFixed(1) + " s", false);
      q("rows").innerHTML = rows.map(function (r) {
        var k = KIND[r.cls], ok = r.tests.every(function (t) { return t[1] === "SUCCESSFUL"; });
        return "<div data-c='" + r.cls + "' style='cursor:pointer;display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:6px;" + (r.cls === s.c ? "background:#eff6ff;" : "") + "'>" +
          "<div style='width:210px;font-size:13px'><b>" + k[0] + "</b><div style='font-size:11px;color:#64748b'>" + k[1] + "</div></div>" +
          "<div style='flex:1;background:#f1f5f9;border-radius:4px;height:16px;position:relative'><div style='width:" + Math.max(1, 100 * r.ms / max).toFixed(1) + "%;height:16px;border-radius:4px;background:" + k[2] + "'></div></div>" +
          "<div style='width:70px;text-align:right;font-size:12px'>" + r.ms + " ms</div>" +
          "<div style='width:92px;font-size:11px;color:#64748b'>" + (r.ctx ? "new ctx, " + r.beans + " beans" : "no new ctx") + "</div>" +
          "<div style='width:60px;font-size:13px;color:" + (ok ? "#16a34a" : "#b91c1c") + "'>" + r.tests.map(function (t) { return t[1] === "SUCCESSFUL" ? "✓" : "✗"; }).join("") + "</div></div>";
      }).join("") + "<div style='font-size:12px;color:#64748b;margin-top:4px'>Click a row for its source and results. The first row also pays JUnit and Mockito start-up.</div>";
      var r = rows.filter(function (x) { return x.cls === s.c; })[0];
      q("detail").innerHTML = "<pre class='code' style='white-space:pre-wrap;font-size:12px'>" + ctx.esc(s.c === "C_WebMvcSlice" && s.v !== "import" ? SRC[s.c].replace(" @org.springframework.context.annotation.Import(SecurityConfig.class)", "") : SRC[s.c]) + "</pre>" +
        "<pre class='code' style='white-space:pre-wrap;font-size:12px'>" + ctx.esc(r.tests.map(function (t) { return (t[1] === "SUCCESSFUL" ? "✓ " : "✗ ") + t[0] + (t[2] ? "\n    " + t[2] : ""); }).join("\n")) + "</pre>" +
        (s.c === "C_WebMvcSlice" || s.c === "D_DataJpaSlice" ? "<details><summary style='cursor:pointer;font-size:13px'>App configuration in this variant</summary><pre class='code' style='white-space:pre-wrap;font-size:12px'>" + ctx.esc(APP[s.v === "main" ? "main" : "separate"]) + "</pre></details>" : "");
    }
    q("vs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.v = b.dataset.v; ctx.save(); draw(); });
    q("rows").addEventListener("click", function (e) { var d = e.target.closest("[data-c]"); if (!d) return; s.c = d.dataset.c; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "The test pyramid for a Spring Boot service",
      text: "Most tests should be **plain unit tests**: no Spring, milliseconds each, testing business rules with mocks for collaborators. Above them, **slice tests** start a *partial* context for one layer (`@WebMvcTest` for controllers, `@DataJpaTest` for repositories) and catch wiring, mapping and query mistakes. At the top, a few **`@SpringBootTest`** integration tests start the whole application, ideally against real infrastructure via **Testcontainers**. Each step up costs roughly 10–100× more time, so push each check as low as it can go. The snippets in this lesson run JUnit through the **JUnit Platform Launcher**, the same engine Maven and Gradle use.",
      m: M(["flowchart TB",
        "  E[\"@SpringBootTest + Testcontainers<br/>few, seconds each\"]:::s3 --> S[\"slices: @WebMvcTest, @DataJpaTest<br/>some, ~1 s per context\"]:::s2 --> U[\"unit tests with Mockito<br/>many, milliseconds\"]:::s4",
        "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#f3e8ff,stroke:#9333ea", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `class PriceCalculator {
    int total(int unitPrice, int qty, boolean member) { int t = unitPrice * qty; return member ? t * 90 / 100 : t; }
}
class PriceCalculatorTest {
    PriceCalculator calc = new PriceCalculator();
    @Test void plainTotal() { assertThat(calc.total(100, 3, false)).isEqualTo(300); }
    @Test void memberDiscount() { assertThat(calc.total(100, 3, true)).isEqualTo(270); }
    @Test void deliberatelyWrong() { assertThat(calc.total(100, 0, false)).as("zero qty").isEqualTo(100); }
}
var summary = new SummaryGeneratingListener();
long t = System.nanoTime();
LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(PriceCalculatorTest.class)).build(), summary);
var s = summary.getSummary();
System.out.printf("%d passed, %d failed in %d ms%n", s.getTestsSucceededCount(), s.getTestsFailedCount(), (System.nanoTime() - t) / 1_000_000);
s.getFailures().forEach(f -> System.out.println("FAILED " + f.getTestIdentifier().getDisplayName() + ": " + f.getException().getMessage().replace("\\n", " ")));`,
      analogy: "Checking a car: you test each spark plug on the bench (unit), then the engine on a stand (slice), and only occasionally take the whole car for a drive (integration)." },
    { title: "Unit tests with Mockito",
      text: "Constructor injection makes Spring beans trivially testable without Spring: just `new` them with mocks. Mockito's `when(...).thenReturn(...)` stubs collaborators, `verify(...)` checks interactions, and `ArgumentCaptor` captures what was passed, e.g. the entity sent to `save`. With `@ExtendWith(MockitoExtension.class)`, `@Mock` and `@InjectMocks` wire it up and **strict stubs** fail tests that stub calls they never make. Don't mock what you don't own in complex ways (JPA, HTTP clients); test those with slices or integration tests instead, and don't mock value objects.",
      code: `record Order(String item, int qty, String status) { }
interface OrderRepository { Order save(Order o); }
interface Notifier { void send(String to, String msg); }
class OrderService {
    final OrderRepository repo; final Notifier notifier;
    OrderService(OrderRepository repo, Notifier notifier) { this.repo = repo; this.notifier = notifier; }
    Order place(String item, int qty) {
        if (qty <= 0) throw new IllegalArgumentException("qty must be positive");
        Order saved = repo.save(new Order(item, qty, "NEW")); notifier.send("kitchen", "new order: " + item); return saved;
    }
}
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock OrderRepository repo; @Mock Notifier notifier; @InjectMocks OrderService service;
    @Test void savesAndNotifies() {
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        service.place("dosa", 2);
        ArgumentCaptor<Order> saved = ArgumentCaptor.forClass(Order.class);
        verify(repo).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo("NEW");
        verify(notifier).send(eq("kitchen"), contains("dosa"));
    }
    @Test void rejectsZeroQuantity() {
        assertThatThrownBy(() -> service.place("dosa", 0)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repo, notifier);
    }
}
var summary = new SummaryGeneratingListener();
LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(OrderServiceTest.class)).build(), summary);
System.out.println(summary.getSummary().getTestsSucceededCount() + " passed, " + summary.getSummary().getTestsFailedCount() + " failed");`,
      analogy: "Mocks are stunt doubles: they stand in for the expensive actors (database, email) so you can rehearse a scene quickly and check who was handed what." },
    { title: "@SpringBootTest: the whole application",
      text: "`@SpringBootTest` finds your `@SpringBootApplication` class and starts the **full context**: every bean, auto-configuration and property. With the default `webEnvironment = MOCK` there's no real server; add `@AutoConfigureMockMvc` and drive requests through MockMvc. With `RANDOM_PORT` a real embedded server starts and you call it with `TestRestTemplate`/`WebTestClient` over HTTP. Use it for a few end-to-end paths per service (create then read, security wiring, error handling), not for every rule. Contexts are **cached** across test classes with the same configuration, which is what keeps big suites bearable.",
      code: `@Entity class Dish { @Id @GeneratedValue Long id; String name; int price; Dish() { } Dish(String n, int p) { name = n; price = p; } public Long getId() { return id; } public String getName() { return name; } public int getPrice() { return price; } }
interface DishRepo extends JpaRepository<Dish, Long> { }
@RestController class DishController {
    final DishRepo repo; DishController(DishRepo r) { repo = r; }
    @PostMapping("/dishes") ResponseEntity<Dish> add(@RequestBody Dish d) { return ResponseEntity.status(201).body(repo.save(d)); }
    @GetMapping("/dishes/{id}") Dish one(@PathVariable long id) { return repo.findById(id).orElseThrow(); }
}
@SpringBootApplication @Configuration class App { @Bean SecurityFilterChain open(HttpSecurity http) throws Exception { return http.authorizeHttpRequests(a -> a.anyRequest().permitAll()).csrf(c -> c.disable()).build(); } }
@SpringBootTest @AutoConfigureMockMvc
class DishApiTest {
    @Autowired MockMvc mvc; @Autowired ApplicationContext ctx;
    @Test void createThenRead() throws Exception {
        String body = mvc.perform(post("/dishes").contentType(MediaType.APPLICATION_JSON).content("{\\"name\\":\\"idli\\",\\"price\\":60}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = new ObjectMapper().readTree(body).get("id").asLong();
        mvc.perform(get("/dishes/" + id)).andExpect(jsonPath("$.name").value("idli"));
        System.out.println("full context: " + ctx.getBeanDefinitionCount() + " beans; created dish " + id);
    }
}
var summary = new SummaryGeneratingListener();
LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(DishApiTest.class)).build(), summary);
System.out.println(summary.getSummary().getTestsSucceededCount() + " passed, " + summary.getSummary().getTestsFailedCount() + " failed");
summary.getSummary().getFailures().forEach(f -> System.out.println(f.getException()));`,
      analogy: "A full dress rehearsal: every actor, prop and light is there. Invaluable before opening night, far too slow to repeat for every line." },
    { title: "Slices: @WebMvcTest and friends",
      text: "A **slice** auto-configures one layer only. `@WebMvcTest(OrderController.class)` loads that controller, `@ControllerAdvice`, filters, converters, Jackson, validation and Spring Security, but **no services or repositories**: you supply those with `@MockitoBean`. In the widget it had 172 beans versus 586 for the full app. Other slices: `@DataJpaTest`, `@JdbcTest`, `@JsonTest`, `@RestClientTest`, `@WebFluxTest`, `@DataMongoTest`. Two traps: beans declared **on the main application class are loaded by every slice**, and plain `@Configuration` classes are **not** picked up by `@WebMvcTest` (use `@Import`).",
      table: [["Slice", "Loads", "Typical test"],
        ["@WebMvcTest", "controllers, advice, filters, Jackson, validation, security", "status codes, JSON shape, validation, auth rules"],
        ["@DataJpaTest", "JPA, repositories, embedded DB, TestEntityManager; transactional", "queries, mappings, constraints"],
        ["@JsonTest", "Jackson + JacksonTester", "serialisation format"],
        ["@RestClientTest", "RestClient/RestTemplate + MockRestServiceServer", "outgoing HTTP calls"],
        ["@SpringBootTest", "everything", "end-to-end paths"]],
      code: `record Menu(String name, int price) { }
interface MenuService { Menu find(String name); }
@RestController class MenuController {
    final MenuService svc; MenuController(MenuService s) { svc = s; }
    @GetMapping("/menu/{name}") Menu get(@PathVariable String name) { return svc.find(name); }
}
@SpringBootApplication class App { }
@WebMvcTest(MenuController.class) @WithMockUser
class MenuControllerTest {
    @Autowired MockMvc mvc; @MockitoBean MenuService svc; @Autowired ApplicationContext ctx;
    @Test void returnsJson() throws Exception {
        when(svc.find("vada")).thenReturn(new Menu("vada", 40));
        mvc.perform(get("/menu/vada")).andExpect(status().isOk()).andExpect(jsonPath("$.price").value(40));
        System.out.println("slice context: " + ctx.getBeanDefinitionCount() + " beans, has MenuService mock: " + mockingDetails(ctx.getBean(MenuService.class)).isMock()
            + ", has a DataSource: " + (ctx.getBeanNamesForType(javax.sql.DataSource.class).length > 0));
    }
}
var summary = new SummaryGeneratingListener();
LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(MenuControllerTest.class)).build(), summary);
System.out.println(summary.getSummary().getTestsSucceededCount() + " passed, " + summary.getSummary().getTestsFailedCount() + " failed");`,
      analogy: "A slice test is testing one floor of a building with the lifts mocked: real wiring on that floor, cardboard everywhere else." },
    { title: "MockMvc: testing the HTTP contract",
      text: "MockMvc runs requests through the real `DispatcherServlet` (argument binding, validation, message converters, exception handlers) without a network. Assert the **contract** a client depends on: status, headers, JSON fields (`jsonPath`), and error bodies. `andDo(print())` dumps the exchange when debugging. You can build it from a slice/full context, or **standalone** around a single controller instance, which needs no Spring context at all but also skips anything you don't register (advice, security, Boot's Jackson setup).",
      code: `record Booking(@NotBlank String guest, @Min(1) @Max(10) int people) { }
@RestController class BookingController {
    @PostMapping("/bookings") ResponseEntity<Map<String, Object>> book(@Valid @RequestBody Booking b) {
        return ResponseEntity.created(java.net.URI.create("/bookings/7")).body(Map.of("id", 7, "guest", b.guest(), "people", b.people()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
        Map<String, String> errors = new TreeMap<>(); e.getFieldErrors().forEach(f -> errors.put(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(errors);
    }
}
MockMvc mvc = MockMvcBuilders.standaloneSetup(new BookingController()).build();
var ok = mvc.perform(post("/bookings").contentType(MediaType.APPLICATION_JSON).content("{\\"guest\\":\\"Meera\\",\\"people\\":4}"))
    .andExpect(status().isCreated()).andExpect(header().string("Location", "/bookings/7")).andExpect(jsonPath("$.people").value(4)).andReturn();
System.out.println("201 body: " + ok.getResponse().getContentAsString());
var bad = mvc.perform(post("/bookings").contentType(MediaType.APPLICATION_JSON).content("{\\"guest\\":\\"\\",\\"people\\":12}"))
    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.people").exists()).andReturn();
System.out.println("400 body: " + bad.getResponse().getContentAsString());`,
      analogy: "MockMvc is a flight simulator for your controller: the real cockpit and instruments, but no runway or passengers." },
    { title: "@MockitoBean and context caching",
      text: "The Spring TestContext framework **caches** application contexts keyed by their configuration (classes, profiles, properties, mocked beans...). Test classes with identical configuration share one context: the widget's second `@SpringBootTest` took ~15 ms instead of ~2 s. Anything that changes the key creates a **new** context: a different `@MockitoBean` set (`@MockBean` is deprecated since Boot 3.4), `@TestPropertySource`, profiles, `@Import`. `@DirtiesContext` throws the context away after use, forcing the next class to rebuild. Big suites stay fast by standardising a few test base configurations.",
      code: `interface Clock2 { String now(); }
@SpringBootApplication class App { @Bean Clock2 clock() { return () -> "real time"; } }
@SpringBootTest class FirstTest { @Autowired ApplicationContext ctx; @Test void a() { Ids.seen.put("FirstTest", System.identityHashCode(ctx)); } }
@SpringBootTest class SameConfigTest { @Autowired ApplicationContext ctx; @Test void b() { Ids.seen.put("SameConfigTest", System.identityHashCode(ctx)); } }
@SpringBootTest class WithMockTest { @Autowired ApplicationContext ctx; @MockitoBean Clock2 clock; @Test void c() { Ids.seen.put("WithMockTest", System.identityHashCode(ctx)); } }
class Ids { static final Map<String, Integer> seen = new LinkedHashMap<>(); }
for (Class<?> c : List.of(FirstTest.class, SameConfigTest.class, WithMockTest.class)) {
    long t = System.nanoTime();
    LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(c)).build());
    System.out.printf("%-15s context #%08x  %4d ms%n", c.getSimpleName(), Ids.seen.get(c.getSimpleName()), (System.nanoTime() - t) / 1_000_000);
}`,
      analogy: "Context caching is like keeping the oven hot between batches. Change the recipe's temperature (a different mock) and you have to wait for it to heat up again." },
    { title: "@DataJpaTest: repositories against a real database",
      text: "`@DataJpaTest` starts JPA, your repositories and an embedded database (or your real one with `@AutoConfigureTestDatabase(replace = NONE)` plus Testcontainers), and makes **every test transactional with rollback**, so tests don't see each other's data. Use `TestEntityManager` to set up data and call **`flush()` and `clear()`** before asserting, otherwise you're reading Hibernate's first-level cache and never hit the SQL you're testing. It shows SQL by default (`showSql`). Test what can actually break: custom queries, mappings, constraints, fetch plans. Don't test `save`/`findById` themselves.",
      code: `@Entity class Review { @Id @GeneratedValue Long id; String dish; int stars; Review() { } Review(String d, int s) { dish = d; stars = s; } public String getDish() { return dish; } public int getStars() { return stars; } }
interface ReviewRepo extends JpaRepository<Review, Long> {
    @Query("select r.dish from Review r group by r.dish having avg(r.stars) >= :min order by r.dish") List<String> dishesRatedAtLeast(double min);
}
@SpringBootApplication class App { }
@DataJpaTest(showSql = false)
class ReviewRepoTest {
    @Autowired ReviewRepo repo; @Autowired TestEntityManager em;
    @Test void averagesPerDish() {
        em.persist(new Review("dosa", 5)); em.persist(new Review("dosa", 4)); em.persist(new Review("upma", 2)); em.persist(new Review("upma", 5));
        em.flush(); em.clear();                                  // hit the database, not the persistence context
        assertThat(repo.dishesRatedAtLeast(4)).containsExactly("dosa");
        System.out.println("rated >= 4: " + repo.dishesRatedAtLeast(4) + ", rows: " + repo.count());
    }
    @Test void eachTestStartsEmpty() { System.out.println("rows at start of next test: " + repo.count()); assertThat(repo.count()).isZero(); }
}
var summary = new SummaryGeneratingListener();
LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(ReviewRepoTest.class)).build(), summary);
System.out.println(summary.getSummary().getTestsSucceededCount() + " passed, " + summary.getSummary().getTestsFailedCount() + " failed");`,
      analogy: "Each @DataJpaTest gets a whiteboard that's wiped after the test; flush/clear makes sure you're reading what's written on the board, not your own notes." },
    { title: "Testcontainers and @ServiceConnection",
      text: "H2 isn't PostgreSQL: different SQL dialect, JSON types, locking and constraint behaviour. **Testcontainers** starts real Postgres, Kafka, Redis or Elasticsearch in Docker for the test, and since Boot 3.1 **`@ServiceConnection`** wires the container's URL and credentials into Boot automatically, with no `@DynamicPropertySource` boilerplate. Declare containers `static` so they start once per class, or share them across classes (singleton container pattern or `@ImportTestcontainers`) to avoid repeated start-ups. The same container definitions can run your app locally (`SpringApplication.from(App::main).with(TestcontainersConfig.class)`). This snippet needs Docker, so it isn't executed here.",
      code: `@Testcontainers
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)   // use the container, not H2
class OrderRepositoryPostgresTest {

    @Container @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired OrderRepository repo;

    @Test void jsonbQueryWorksOnRealPostgres() {
        repo.save(new Order("dosa", 2, Map.of("spicy", true)));
        assertThat(repo.findByAttribute("spicy", "true")).hasSize(1);   // native jsonb query H2 can't run
    }
}

// Kafka the same way:
// @Container @ServiceConnection static KafkaContainer kafka = new KafkaContainer("apache/kafka-native:3.8.0");`, noCompile: true,
      m: M(["flowchart LR",
        "  T[\"JUnit test class\"]:::s1 -->|starts once| C[\"Docker: postgres:16\"]:::s2",
        "  C -->|@ServiceConnection<br/>url, user, password| B[\"Boot DataSource\"]:::s4",
        "  T --> B",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      analogy: "Testing on H2 is rehearsing a play in a classroom; Testcontainers rents the actual theatre for an hour, so the trapdoors and acoustics are real." },
    { title: "Testing security",
      text: "With Spring Security on the classpath, MockMvc tests go through the filter chain, so unauthenticated calls get 401/403 just like production. `spring-security-test` gives you **`@WithMockUser`** (or `user(\"x\").roles(...)`) for a username/role, **`jwt()`** for resource servers, **`csrf()`** for form/session apps, and `@WithUserDetails` to load a real user. Test the **rules** (who gets 401, 403, 200), not just the happy path, and make sure the slice actually uses your `SecurityFilterChain` (`@Import` it into `@WebMvcTest`); otherwise you're testing Boot's defaults, as the widget showed.",
      code: `@Configuration class SecurityConfig {
    @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.GET, "/menu").permitAll().requestMatchers("/admin/**").hasRole("ADMIN").anyRequest().authenticated())
            .httpBasic(b -> { }).build();
    }
}
@RestController class Shop { @GetMapping("/menu") String menu() { return "idli, vada"; } @PostMapping("/admin/prices") String prices() { return "updated"; } }
@SpringBootApplication class App { }
@WebMvcTest(Shop.class) @Import(SecurityConfig.class)
class ShopSecurityTest {
    @Autowired MockMvc mvc;
    @Test void menuIsPublic() throws Exception { mvc.perform(get("/menu")).andExpect(status().isOk()); }
    @Test void anonymousCannotChangePrices() throws Exception { mvc.perform(post("/admin/prices").with(csrf())).andExpect(status().isUnauthorized()); }
    @Test @WithMockUser(roles = "USER") void userIsForbidden() throws Exception { mvc.perform(post("/admin/prices").with(csrf())).andExpect(status().isForbidden()); }
    @Test @WithMockUser(roles = "ADMIN") void adminWithoutCsrfIsForbidden() throws Exception { mvc.perform(post("/admin/prices")).andExpect(status().isForbidden()); }
    @Test @WithMockUser(roles = "ADMIN") void adminCanChangePrices() throws Exception { mvc.perform(post("/admin/prices").with(csrf())).andExpect(content().string("updated")); }
}
var summary = new SummaryGeneratingListener();
LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(ShopSecurityTest.class)).build(), summary);
System.out.println(summary.getSummary().getTestsSucceededCount() + " passed, " + summary.getSummary().getTestsFailedCount() + " failed");
summary.getSummary().getFailures().forEach(f -> System.out.println(f.getTestIdentifier().getDisplayName() + " " + f.getException().getMessage()));`,
      analogy: "Testing security means trying the doors with different badges, including no badge and a forged one, not just walking in as the manager." },
    { title: "Transactions in tests: the false-positive trap",
      text: "`@Transactional` on a test method wraps the whole test in a transaction that is **rolled back** at the end: convenient isolation. But it also changes behaviour: lazy associations can be loaded after the service method returns (production would throw `LazyInitializationException`), and nothing is ever **committed**, so commit-time constraints, `@TransactionalEventListener(AFTER_COMMIT)` and flush errors may never fire. With `RANDOM_PORT` the server handles requests on other threads, so the test's transaction doesn't cover them and data **does** persist. Use rollback tests for repositories; for service flows, consider no test transaction and explicit clean-up.",
      code: `@Entity class Kitchen { @Id @GeneratedValue Long id; String name; @OneToMany(mappedBy = "kitchen", cascade = CascadeType.ALL) List<Cook> cooks = new ArrayList<>(); public List<Cook> getCooks() { return cooks; } }
@Entity class Cook { @Id @GeneratedValue Long id; String name; @ManyToOne Kitchen kitchen; }
interface KitchenRepo extends JpaRepository<Kitchen, Long> { }
@Service class KitchenService {
    final KitchenRepo repo; KitchenService(KitchenRepo r) { repo = r; }
    @Transactional long create() { Kitchen k = new Kitchen(); k.name = "main"; Cook c = new Cook(); c.name = "Anil"; c.kitchen = k; k.cooks.add(c); return repo.save(k).id; }
    @Transactional(readOnly = true) Kitchen load(long id) { return repo.findById(id).orElseThrow(); }   // cooks not fetched
}
@SpringBootApplication class App { }
@SpringBootTest @Transactional
class WithTestTransaction { @Autowired KitchenService svc;
    @Test void lazyLoadingSeemsFine() { long id = svc.create(); System.out.println("with @Transactional test : cooks = " + svc.load(id).getCooks().size()); } }
@SpringBootTest
class WithoutTestTransaction { @Autowired KitchenService svc;
    @Test void lazyLoadingFails() { long id = svc.create(); try { svc.load(id).getCooks().size(); System.out.println("no exception"); } catch (Exception e) { System.out.println("without test transaction: " + e.getClass().getSimpleName()); } } }
for (Class<?> c : List.of(WithTestTransaction.class, WithoutTestTransaction.class))
    LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(c)).build());`,
      analogy: "A test transaction is a practice exam where the teacher lets you keep the textbook open: you pass, but you've learned nothing about the real exam conditions." },
    { title: "Keeping the suite fast and reliable",
      text: "Speed comes from **where** you test (most logic in unit tests), **how many contexts** you start (consistent configurations, few distinct `@MockitoBean` sets, no casual `@DirtiesContext`), and **infrastructure reuse** (shared Testcontainers, `testcontainers.reuse.enable` locally). Reliability comes from isolation (rollback or unique data per test), no sleeps (use Awaitility for async), fixed clocks (`Clock` beans) instead of `now()`, and no order dependence. Measure: Gradle/Maven test reports show the slow classes; the widget's numbers show where time goes.",
      table: [["Smell", "Fix"],
        ["Every test is @SpringBootTest", "move rules to unit tests, use slices"],
        ["Each class has a different @MockitoBean mix", "shared test configurations / base classes"],
        ["@DirtiesContext everywhere", "reset state explicitly; dirty only when needed"],
        ["Thread.sleep in async tests", "Awaitility: await().atMost(5, SECONDS).until(...)"],
        ["Tests depend on run order or shared rows", "rollback, unique ids, clean-up"],
        ["H2-only tests miss Postgres bugs", "Testcontainers for repository + integration tests"]],
      code: `AtomicInteger processed = new AtomicInteger();
ExecutorService pool = Executors.newSingleThreadExecutor();
pool.submit(() -> { try { Thread.sleep(300); } catch (InterruptedException e) { } processed.set(5); });
long t = System.nanoTime();
org.awaitility.Awaitility.await().atMost(java.time.Duration.ofSeconds(2)).pollInterval(java.time.Duration.ofMillis(20)).until(() -> processed.get() == 5);
System.out.printf("condition met after %d ms (no fixed sleep, no flakiness)%n", (System.nanoTime() - t) / 1_000_000);
pool.shutdown();`,
      analogy: "A fast test suite is a well-run kitchen: prep is done in batches (cached contexts), ovens stay hot (shared containers), and nobody stands around waiting with a timer (sleep)." }
  ];

  H.registerLesson({
    code: "S09",
    summary: "Fast, reliable tests for Spring Boot services: the test pyramid, Mockito unit tests with `ArgumentCaptor` and strict stubs, `@SpringBootTest` with MockMvc or a real port, slices like `@WebMvcTest` and `@DataJpaTest` and what they load, MockMvc contract assertions, `@MockitoBean` and context caching, Testcontainers with `@ServiceConnection`, testing security rules with `@WithMockUser`, `jwt()` and `csrf()`, the false positives of transactional tests, and keeping a suite fast.",
    slides: SLIDES,
    widget: { heading: "Interactive: ten test classes, one app, three configurations", caption: "Real JUnit runs of one Spring Boot 3.4 app's test suite in a single JVM. Timing per test class, contexts created and bean counts were measured; switch where the security bean lives to see two classic slice failures happen for real.", render: s09Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["PR pipeline", "A 2,000-test suite runs in 4 minutes because 1,700 are unit tests, 250 are slices sharing 6 cached contexts, and 50 are Testcontainers integration tests."],
      ["Postgres-only bug", "A `jsonb` query passes on H2 in CI but fails in production; moving repository tests to Testcontainers catches it."],
      ["Security regression", "A refactor moves an admin endpoint; a `@WebMvcTest` with the real `SecurityFilterChain` fails because USER now gets 200."],
      ["Slow suite", "Each test class mocks a different bean, so CI builds 40 contexts; consolidating mocks cuts the run from 18 to 6 minutes."],
      ["Flaky test", "An async consumer test with `Thread.sleep(500)` fails under load; Awaitility makes it deterministic."],
      ["Contract checks", "MockMvc tests pin the JSON field names and error format that the mobile app depends on."]
    ],
    pitfalls: [
      "Using @SpringBootTest for everything",
      "Putting @Bean methods on the main @SpringBootApplication class (every slice loads them)",
      "@WebMvcTest silently using Boot's default security instead of yours",
      "A different @MockitoBean set in every test class (no context reuse)",
      "Asserting JPA results without flush()/clear()",
      "@Transactional tests hiding LazyInitializationException and commit-time failures",
      "Relying on H2 when production runs PostgreSQL",
      "Thread.sleep in asynchronous tests"
    ],
    quiz: [
      { q: "What does @WebMvcTest load?", options: ["The whole application", "Web layer only: controllers, advice, filters, Jackson, validation, security", "Only the controller instance", "Repositories"], answer: 1, why: "Services and repositories must be provided with @MockitoBean." },
      { q: "In the widget, why did @DataJpaTest fail when the SecurityFilterChain bean lived on the main class?", options: ["H2 was missing", "Slices load the main class's @Bean methods; HttpSecurity isn't available in a JPA slice", "Rollback failed", "Too many beans"], answer: 1, why: "Keep the main class bare." },
      { q: "After moving security to its own @Configuration, why did the @WebMvcTest tests fail?", options: ["CSRF bug", "@WebMvcTest doesn't pick up plain @Configuration classes, so Boot's default security applied", "MockMvc was missing", "Wrong port"], answer: 1, why: "Fix with @Import(SecurityConfig.class)." },
      { q: "Why did the second identical @SpringBootTest class take ~15 ms?", options: ["It was skipped", "The context was reused from the cache", "Parallel execution", "Lazy beans"], answer: 1, why: "Same configuration key → cached context." },
      { q: "What creates a new test context?", options: ["A new test method", "A different @MockitoBean set or properties", "Using assertThat", "Calling MockMvc"], answer: 1, why: "The cache key includes mocked beans." },
      { q: "Why call flush() and clear() in a @DataJpaTest before asserting?", options: ["To commit", "To force SQL and stop reading from the persistence context", "To reset IDs", "To speed up"], answer: 1, why: "Otherwise the first-level cache answers." },
      { q: "What does @ServiceConnection do?", options: ["Starts Docker", "Wires a Testcontainers container's connection details into Boot", "Mocks a service", "Opens a port"], answer: 1, why: "Replaces @DynamicPropertySource boilerplate." },
      { q: "A @Transactional test reads a lazy collection after the service returns. What is the risk?", options: ["None", "It passes in the test but throws LazyInitializationException in production", "It deadlocks", "It commits data"], answer: 1, why: "The test transaction keeps the session open." },
      { q: "Best way to test an async consumer?", options: ["Thread.sleep(1000)", "Awaitility polling for the condition with a timeout", "Run it synchronously in production", "Skip it"], answer: 1, why: "Deterministic and as fast as possible." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Annotation / API"],
        ["Unit test with mocks", "`@ExtendWith(MockitoExtension.class)`, `@Mock`, `@InjectMocks`"],
        ["Controller slice", "`@WebMvcTest(X.class)` + `@MockitoBean` + `@Import(SecurityConfig.class)`"],
        ["Repository slice", "`@DataJpaTest` + `TestEntityManager`"],
        ["Full app", "`@SpringBootTest` + `@AutoConfigureMockMvc`"],
        ["Real server", "`@SpringBootTest(webEnvironment = RANDOM_PORT)` + `TestRestTemplate`"],
        ["Real DB", "`@Testcontainers` + `@Container @ServiceConnection`"],
        ["Security", "`@WithMockUser`, `.with(user(..))`, `.with(jwt())`, `.with(csrf())`"],
        ["Async", "`await().atMost(..).until(..)`"]],
      cards: [
        { title: "Pyramid", items: ["Many unit tests", "Some slices", "Few full-context tests", "Real infra via Testcontainers"] },
        { title: "Speed", items: ["Context cache", "Consistent mocks", "Avoid @DirtiesContext", "Shared containers"] },
        { title: "Say in interviews", items: ["Slice vs full context", "@MockitoBean vs @Mock", "Context caching", "H2 vs Testcontainers", "Transactional test caveats"] }]
    },
    practice: [
      { level: "Easy", q: "When would you use @Mock versus @MockitoBean?",
        a: ["@Mock (Mockito) in plain unit tests without Spring; inject with @InjectMocks or constructors.",
          "@MockitoBean replaces/adds a bean in the Spring test context (slices or full), e.g. a service behind a controller in @WebMvcTest.",
          "@MockitoBean changes the context cache key; @MockBean is deprecated since Boot 3.4."] },
      { level: "Easy", q: "Write a unit test that verifies a repository is never called for invalid input.",
        a: ["Mock the repository.",
          "Expect the exception.",
          "verifyNoInteractions(repo)."],
        code: `interface Repo { void save(String s); }
class Svc { final Repo repo; Svc(Repo r) { repo = r; } void add(String s) { if (s.isBlank()) throw new IllegalArgumentException("blank"); repo.save(s); } }
class SvcTest {
    Repo repo = mock(Repo.class); Svc svc = new Svc(repo);
    @Test void blankIsRejected() { assertThatThrownBy(() -> svc.add(" ")).hasMessage("blank"); verifyNoInteractions(repo); }
    @Test void validIsSaved() { svc.add("chai"); verify(repo).save("chai"); }
}
var summary = new SummaryGeneratingListener();
LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(SvcTest.class)).build(), summary);
System.out.println(summary.getSummary().getTestsSucceededCount() + " passed, " + summary.getSummary().getTestsFailedCount() + " failed");` },
      { level: "Easy", q: "Assert a JSON response's fields and status with standalone MockMvc.",
        a: ["Build MockMvc around the controller instance.",
          "Use status(), jsonPath() and header() matchers.",
          "No Spring context needed."],
        code: `@RestController class Ping { @GetMapping("/ping") Map<String, Object> ping() { return Map.of("status", "UP", "version", 3); } }
MockMvc mvc = MockMvcBuilders.standaloneSetup(new Ping()).build();
var r = mvc.perform(get("/ping")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP")).andExpect(jsonPath("$.version").value(3)).andReturn();
System.out.println(r.getResponse().getContentType() + " " + r.getResponse().getContentAsString());` },
      { level: "Medium", q: "Your @WebMvcTest returns 401 for an endpoint that's public in production. Why, and how do you fix it?",
        a: ["The slice applies Spring Security, but your SecurityFilterChain lives in a @Configuration class the slice doesn't scan, so Boot's default (everything authenticated) applies.",
          "Fix: @Import(SecurityConfig.class) on the test (or a shared test annotation).",
          "Then test the real rules with @WithMockUser / anonymous requests."] },
      { level: "Medium", q: "Explain Spring's test context caching and what breaks it.",
        a: ["Contexts are cached per JVM keyed by the merged configuration: classes, initializers, profiles, properties, context customizers (including @MockitoBean sets).",
          "Identical keys reuse the context; anything different builds a new one (and the cache holds up to 32 by default, evicting LRU).",
          "@DirtiesContext removes a context; avoid casual use. Consolidate mocks into shared base configurations."] },
      { level: "Medium", q: "Test a custom JPQL query with @DataJpaTest.",
        a: ["Persist fixtures with TestEntityManager.",
          "flush() and clear() so the query hits the database.",
          "Assert the result; the test rolls back."],
        code: `@Entity class Item { @Id @GeneratedValue Long id; String name; int stock; Item() { } Item(String n, int s) { name = n; stock = s; } }
interface ItemRepo extends JpaRepository<Item, Long> { @Query("select i.name from Item i where i.stock < :limit order by i.name") List<String> lowStock(int limit); }
@SpringBootApplication class App { }
@DataJpaTest(showSql = false)
class ItemRepoTest {
    @Autowired ItemRepo repo; @Autowired TestEntityManager em;
    @Test void lowStock() { em.persist(new Item("rice", 2)); em.persist(new Item("dal", 50)); em.persist(new Item("oil", 1)); em.flush(); em.clear();
        assertThat(repo.lowStock(5)).containsExactly("oil", "rice"); }
}
var summary = new SummaryGeneratingListener();
LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(ItemRepoTest.class)).build(), summary);
System.out.println(summary.getSummary().getTestsSucceededCount() + " passed, " + summary.getSummary().getTestsFailedCount() + " failed");` },
      { level: "Medium", q: "Why prefer Testcontainers over H2 for repository and integration tests?",
        a: ["Same database engine and version as production: dialect, JSON types, locking, constraints, migrations (Flyway) all behave identically.",
          "Catches native-query and migration bugs H2 hides.",
          "Costs: Docker required, container start-up; mitigate with static/shared containers and reuse."] },
      { level: "Hard", q: "A 25-minute test suite builds 60 application contexts. How do you speed it up?",
        steps: ["Measure: list slow classes and count contexts (Spring logs context creation; build reports show timings).",
          "Standardise configurations: a few shared @MockitoBean sets in base classes or meta-annotations; remove unnecessary @TestPropertySource variations.",
          "Remove @DirtiesContext where state can be reset explicitly.",
          "Move business rules from @SpringBootTest to unit tests; use slices for web/data.",
          "Share Testcontainers across classes; enable parallel test execution where tests are isolated."] },
      { level: "Hard", q: "Write a security test matrix for an endpoint: anonymous, USER, ADMIN without CSRF, ADMIN.",
        a: ["Import the real security configuration into a @WebMvcTest.",
          "One test per role/condition with expected status.",
          "Include CSRF if the chain uses sessions."],
        code: `@Configuration class Sec { @Bean SecurityFilterChain c(HttpSecurity http) throws Exception { return http.authorizeHttpRequests(a -> a.requestMatchers("/refunds/**").hasRole("ADMIN").anyRequest().authenticated()).httpBasic(b -> { }).build(); } }
@RestController class Refunds { @PostMapping("/refunds/{id}") String refund(@PathVariable long id) { return "refunded " + id; } }
@SpringBootApplication class App { }
@WebMvcTest(Refunds.class) @Import(Sec.class)
class RefundSecurityTest {
    @Autowired MockMvc mvc;
    @Test void anonymous() throws Exception { mvc.perform(post("/refunds/1").with(csrf())).andExpect(status().isUnauthorized()); }
    @Test @WithMockUser void user() throws Exception { mvc.perform(post("/refunds/1").with(csrf())).andExpect(status().isForbidden()); }
    @Test @WithMockUser(roles = "ADMIN") void adminNoCsrf() throws Exception { mvc.perform(post("/refunds/1")).andExpect(status().isForbidden()); }
    @Test @WithMockUser(roles = "ADMIN") void admin() throws Exception { mvc.perform(post("/refunds/1").with(csrf())).andExpect(status().isOk()); }
}
var summary = new SummaryGeneratingListener();
LauncherFactory.create().execute(LauncherDiscoveryRequestBuilder.request().selectors(selectClass(RefundSecurityTest.class)).build(), summary);
System.out.println(summary.getSummary().getTestsSucceededCount() + " passed, " + summary.getSummary().getTestsFailedCount() + " failed");` },
      { level: "Hard", q: "What can a @Transactional integration test hide, and what do you do instead?",
        a: ["Lazy-loading errors (session stays open), missing flushes/constraint violations at commit, AFTER_COMMIT listeners never firing, and different isolation than real requests.",
          "With RANDOM_PORT, requests run on server threads so the test transaction doesn't even apply.",
          "Instead: no test transaction for service-level flows, explicit clean-up (truncate tables / unique data), or TransactionTemplate to commit deliberately; keep rollback tests for repositories."] }
    ],
    recap: [
      "Most tests are plain unit tests; slices for each layer; a few full-context and Testcontainers tests.",
      "Slices load one layer: supply the rest with @MockitoBean and @Import the config they need.",
      "Keep the main application class free of @Bean methods.",
      "Context caching makes suites fast; different mocks or @DirtiesContext rebuild contexts.",
      "Test security rules explicitly; beware transactional-test false positives; use Awaitility, not sleep."
    ]
  });
})();
