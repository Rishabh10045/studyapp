/* Lesson S02: Spring Boot: auto-configuration & starters */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Every combination below was run with Spring Boot 3.4.1: a custom GreeterAutoConfiguration registered in
  // META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports, the "library" jar added to
  // or removed from the classpath, an optional user-defined Greeter bean, and greeter.enabled unset/true/false.
  // REPORT lines are the real ConditionEvaluationReport messages (what --debug prints); RESULT is the Greeter bean found.
  var REC = { "yes|false|unset": [ "REPORT GreeterAutoConfiguration MATCH: @ConditionalOnClass found required class 'fancy.FancyGreeter'", "REPORT GreeterAutoConfiguration MATCH: @ConditionalOnProperty (greeter.enabled=true) matched", "REPORT GreeterAutoConfiguration#greeter MATCH: @ConditionalOnMissingBean (types: demo.Greeter; SearchStrategy: all) did not find any beans", "RESULT [greeter] -> auto-configured: hello asha" ], "yes|false|true": [ "REPORT GreeterAutoConfiguration MATCH: @ConditionalOnClass found required class 'fancy.FancyGreeter'", "REPORT GreeterAutoConfiguration MATCH: @ConditionalOnProperty (greeter.enabled=true) matched", "REPORT GreeterAutoConfiguration#greeter MATCH: @ConditionalOnMissingBean (types: demo.Greeter; SearchStrategy: all) did not find any beans", "RESULT [greeter] -> auto-configured: hello asha" ], "yes|false|false": [ "REPORT GreeterAutoConfiguration MATCH: @ConditionalOnClass found required class 'fancy.FancyGreeter'", "REPORT GreeterAutoConfiguration NO MATCH: @ConditionalOnProperty (greeter.enabled=true) found different value in property 'enabled'", "RESULT no Greeter bean" ], "yes|true|unset": [ "REPORT GreeterAutoConfiguration MATCH: @ConditionalOnClass found required class 'fancy.FancyGreeter'", "REPORT GreeterAutoConfiguration MATCH: @ConditionalOnProperty (greeter.enabled=true) matched", "REPORT GreeterAutoConfiguration#greeter NO MATCH: @ConditionalOnMissingBean (types: demo.Greeter; SearchStrategy: all) found beans of type 'demo.Greeter' myGreeter", "RESULT [myGreeter] -> user bean: hi asha" ], "yes|true|true": [ "REPORT GreeterAutoConfiguration MATCH: @ConditionalOnClass found required class 'fancy.FancyGreeter'", "REPORT GreeterAutoConfiguration MATCH: @ConditionalOnProperty (greeter.enabled=true) matched", "REPORT GreeterAutoConfiguration#greeter NO MATCH: @ConditionalOnMissingBean (types: demo.Greeter; SearchStrategy: all) found beans of type 'demo.Greeter' myGreeter", "RESULT [myGreeter] -> user bean: hi asha" ], "yes|true|false": [ "REPORT GreeterAutoConfiguration MATCH: @ConditionalOnClass found required class 'fancy.FancyGreeter'", "REPORT GreeterAutoConfiguration NO MATCH: @ConditionalOnProperty (greeter.enabled=true) found different value in property 'enabled'", "RESULT [myGreeter] -> user bean: hi asha" ], "no|false|unset": [ "REPORT GreeterAutoConfiguration NO MATCH: @ConditionalOnClass did not find required class 'fancy.FancyGreeter'", "RESULT no Greeter bean" ], "no|false|true": [ "REPORT GreeterAutoConfiguration NO MATCH: @ConditionalOnClass did not find required class 'fancy.FancyGreeter'", "RESULT no Greeter bean" ], "no|false|false": [ "REPORT GreeterAutoConfiguration NO MATCH: @ConditionalOnClass did not find required class 'fancy.FancyGreeter'", "RESULT no Greeter bean" ], "no|true|unset": [ "REPORT GreeterAutoConfiguration NO MATCH: @ConditionalOnClass did not find required class 'fancy.FancyGreeter'", "RESULT [myGreeter] -> user bean: hi asha" ], "no|true|true": [ "REPORT GreeterAutoConfiguration NO MATCH: @ConditionalOnClass did not find required class 'fancy.FancyGreeter'", "RESULT [myGreeter] -> user bean: hi asha" ], "no|true|false": [ "REPORT GreeterAutoConfiguration NO MATCH: @ConditionalOnClass did not find required class 'fancy.FancyGreeter'", "RESULT [myGreeter] -> user bean: hi asha" ] };
  var SRC = "@AutoConfiguration\n@ConditionalOnClass(name = \"fancy.FancyGreeter\")              // library on the classpath?\n@ConditionalOnProperty(prefix = \"greeter\", name = \"enabled\",\n                       havingValue = \"true\", matchIfMissing = true)   // not switched off?\npublic class GreeterAutoConfiguration {\n    @Bean\n    @ConditionalOnMissingBean                                     // user didn't define their own?\n    public Greeter greeter() { return n -> \"auto-configured: hello \" + n; }\n}";
  function s02Widget(el, ctx) {
    var s = ctx.state; if (!s.lib) { s.lib = "yes"; s.ub = "false"; s.prop = "unset"; }
    function seg(r, opts) { return "<div class='seg' data-r='" + r + "' style='margin-top:6px'>" + opts.map(function (o) { return "<button type='button' data-v='" + o[0] + "'>" + o[1] + "</button>"; }).join("") + "</div>"; }
    el.innerHTML = "<pre class='code' data-r='src'></pre>" +
      seg("lib", [["yes", "fancy-greeter.jar on classpath"], ["no", "jar not on classpath"]]) +
      seg("ub", [["false", "no Greeter bean of mine"], ["true", "I define my own Greeter bean"]]) +
      seg("prop", [["unset", "greeter.enabled not set"], ["true", "greeter.enabled=true"], ["false", "greeter.enabled=false"]]) +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div><pre class='code' data-r='rep'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    q("src").innerHTML = ctx.H.highlight(SRC, "java");
    function draw() {
      ["lib", "ub", "prop"].forEach(function (k) { q(k).querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", s[k] === b.dataset.v); }); });
      var lines = REC[s.lib + "|" + s.ub + "|" + s.prop] || [], rep = lines.filter(function (l) { return l.indexOf("REPORT") === 0; }), res = (lines.filter(function (l) { return l.indexOf("RESULT") === 0; })[0] || "").replace("RESULT ", "");
      function st(re) { var l = rep.filter(function (x) { return re.test(x); })[0]; return l ? (l.indexOf("NO MATCH") >= 0 ? "no" : "yes") : "skip"; }
      var c1 = st(/OnClass/), c2 = st(/OnProperty/), c3 = st(/OnMissingBean/);
      var L = ["flowchart LR",
        "  A[\"@ConditionalOnClass<br/>FancyGreeter\"]:::" + c1,
        "  B[\"@ConditionalOnProperty<br/>greeter.enabled\"]:::" + c2,
        "  C[\"@ConditionalOnMissingBean<br/>Greeter\"]:::" + c3,
        "  R[\"" + (res.indexOf("auto-configured") >= 0 ? "auto-configured Greeter" : res.indexOf("myGreeter") >= 0 ? "your Greeter bean" : "no Greeter bean") + "\"]:::" + (res.indexOf("no Greeter") >= 0 ? "no" : "yes"),
        "  A -->|" + (c1 === "yes" ? "match" : "no match: stop") + "| B", "  B -->|" + (c2 === "yes" ? "match" : c2 === "no" ? "no match: stop" : "not evaluated") + "| C", "  C --> R",
        "  classDef yes fill:#e8f5e9,stroke:#2e7d32", "  classDef no fill:#ffebee,stroke:#c62828", "  classDef skip fill:#f3f4f6,stroke:#9ca3af,color:#9ca3af"];
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      var why = c1 === "no" ? "The class isn't on the classpath, so the whole auto-configuration is skipped before anything else is checked. This is how adding a starter switches features on." :
        c2 === "no" ? "The property explicitly disables it. `matchIfMissing = true` means \"on unless switched off\"." :
        c3 === "no" ? "**Your bean wins.** Auto-configuration backs off when you define the bean yourself: the core principle of Boot." :
        "All conditions matched, so Boot contributed the default bean.";
      q("res").innerHTML = ctx.md("**Result: " + res + ".** " + why + (s.ub === "true" && c3 !== "no" ? " Your own bean exists regardless of the auto-configuration." : ""));
      q("rep").textContent = "Condition evaluation report (recorded, Spring Boot 3.4.1):\n" + rep.map(function (l) { return "  " + l.replace("REPORT ", ""); }).join("\n");
    }
    ["lib", "ub", "prop"].forEach(function (k) { q(k).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s[k] = b.dataset.v; ctx.save(); draw(); }); });
    draw();
  }

  var SLIDES = [
    { title: "What Spring Boot adds on top of Spring",
      text: "Spring Framework gives you the container, MVC, data access and transactions, but you used to configure all of it yourself. **Spring Boot** adds **opinionated defaults**: **starters** (curated dependency sets), **auto-configuration** (beans created for you based on what's on the classpath and in your properties), an **embedded server** (Tomcat by default) packaged in an **executable jar**, **externalised configuration**, and **Actuator** for health and metrics. The rule that makes it work: Boot configures sensible defaults and **backs off** as soon as you define something yourself.",
      m: M(["flowchart LR",
        "  ST[\"starters<br/>(dependencies)\"]:::s1 --> CP[\"classpath\"]:::s3",
        "  CP --> AC[\"auto-configuration<br/>conditions\"]:::s2",
        "  PR[\"application.properties\"]:::s1 --> AC",
        "  YOU[\"your @Beans\"]:::s1 --> AC",
        "  AC --> CTX[\"ApplicationContext<br/>with defaults filled in\"]:::s2",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00"]),
      code: `@SpringBootApplication
class ShopApplication {
    @Bean CommandLineRunner hello(Environment env) {
        return args -> System.out.println("Boot started; web type = " + env.getProperty("spring.main.web-application-type", "servlet"));
    }
}
try (var ctx = SpringApplication.run(ShopApplication.class)) {
    System.out.println("beans in the context: " + (ctx.getBeanDefinitionCount() > 100 ? "well over 100, almost all auto-configured" : ctx.getBeanDefinitionCount()));
}`,
      analogy: "Spring is a fully equipped kitchen where you set up every appliance yourself. Boot is the same kitchen delivered pre-installed with sensible settings; move or replace any appliance and Boot leaves your choice alone." },
    { title: "Starters and dependency management",
      text: "A **starter** is a dependency that pulls in a coherent set of libraries for one capability: `spring-boot-starter-web` brings Spring MVC, Jackson, validation-friendly defaults and embedded Tomcat; `-data-jpa` brings Hibernate, Spring Data and HikariCP. Versions come from Boot's **BOM** (bill of materials), via the `spring-boot-starter-parent` or the `spring-boot-dependencies` import, so you normally write **no versions**, and all libraries are tested together. Override a single version with a property (e.g. `<jackson-bom.version>`) only when you must.",
      table: [["Starter", "Brings", "Auto-configures"],
        ["spring-boot-starter-web", "Spring MVC, Jackson, Tomcat", "DispatcherServlet, message converters, server"],
        ["spring-boot-starter-webflux", "WebFlux, Reactor Netty", "Reactive web stack"],
        ["spring-boot-starter-data-jpa", "Hibernate, Spring Data JPA, HikariCP", "DataSource, EntityManagerFactory, repositories, tx manager"],
        ["spring-boot-starter-validation", "Hibernate Validator", "Validator, method validation"],
        ["spring-boot-starter-actuator", "Micrometer, endpoints", "health, metrics, info endpoints"],
        ["spring-boot-starter-test", "JUnit 5, AssertJ, Mockito, Spring Test", "Test slices, MockMvc support"]],
      lang: "xml",
      noCompile: true,
      code: `<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.4.1</version>            <!-- the BOM: versions for hundreds of libraries -->
</parent>
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>   <!-- no version needed -->
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>
</dependencies>` },
    { title: "@SpringBootApplication unpacked",
      text: "`@SpringBootApplication` is three annotations in one: **`@SpringBootConfiguration`** (a `@Configuration`, so the class can declare `@Bean`s), **`@EnableAutoConfiguration`** (import the auto-configuration candidates and evaluate their conditions), and **`@ComponentScan`** (scan this class's package and sub-packages). That's why the main class belongs in the **root package**: classes outside it aren't scanned. `SpringApplication.run` creates the right context type (servlet, reactive or none), loads properties, refreshes the context and runs `CommandLineRunner`/`ApplicationRunner` beans.",
      code: `List<String> meta = Arrays.stream(SpringBootApplication.class.getAnnotations())
    .map(a -> a.annotationType().getSimpleName())
    .filter(n -> !List.of("Target", "Retention", "Documented", "Inherited").contains(n))
    .toList();
System.out.println("@SpringBootApplication is meta-annotated with " + meta);
System.out.println("@SpringBootConfiguration is a @Configuration: " + SpringBootConfiguration.class.isAnnotationPresent(Configuration.class));` },
    { title: "How auto-configuration is discovered",
      text: "Each Boot module lists its auto-configuration classes in **`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`** (Boot 2.7+; earlier versions used `spring.factories`). `@EnableAutoConfiguration` loads all those names, removes **exclusions**, sorts them by `@AutoConfiguration(before/after)` and `@AutoConfigureOrder`, and imports them **after** your own configuration has been processed, so conditions like \"missing bean\" can see your beans. Each class is guarded by **conditions**; most candidates don't match in a given app.",
      m: M(["flowchart LR",
        "  F[\"AutoConfiguration.imports<br/>in every jar\"]:::s1 --> L[\"load ~150 candidates\"]:::s3",
        "  L --> X[\"remove exclusions\"]:::s3 --> O[\"sort before/after\"]:::s3",
        "  O --> C{\"conditions\"}:::s2",
        "  C -->|match| B[\"beans registered\"]:::s4",
        "  C -->|no match| N[\"skipped\"]:::s5",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32", "  classDef s5 fill:#ffebee,stroke:#c62828"]),
      code: `List<String> candidates = new ArrayList<>();
org.springframework.boot.context.annotation.ImportCandidates.load(AutoConfiguration.class, Thread.currentThread().getContextClassLoader()).forEach(candidates::add);
System.out.println("auto-configuration candidates on this classpath: " + (candidates.size() > 100 ? "over 100" : candidates.size()));
candidates.stream().filter(c -> c.endsWith("DataSourceAutoConfiguration") || c.endsWith("JacksonAutoConfiguration") || c.endsWith("DispatcherServletAutoConfiguration"))
    .sorted().forEach(c -> System.out.println("  " + c.substring(c.lastIndexOf('.') + 1)));` },
    { title: "Conditional annotations",
      text: "Conditions decide whether a configuration class or `@Bean` method applies. The core ones: **`@ConditionalOnClass` / `@ConditionalOnMissingClass`** (is a library on the classpath?), **`@ConditionalOnBean` / `@ConditionalOnMissingBean`** (does a bean of this type exist?), **`@ConditionalOnProperty`** (is a property set to a value? `matchIfMissing` sets the default), plus `@ConditionalOnWebApplication`, `@ConditionalOnResource`, `@ConditionalOnExpression`, `@ConditionalOnSingleCandidate` and `@ConditionalOnThreading` (virtual threads). The widget runs a real auto-configuration through every combination of three of these.",
      table: [["Condition", "Matches when", "Typical use"],
        ["@ConditionalOnClass", "Class is on the classpath", "Configure Jackson only if Jackson is present"],
        ["@ConditionalOnMissingBean", "No bean of that type defined yet", "Default bean that users can replace"],
        ["@ConditionalOnProperty", "Property has a value (or missing, with matchIfMissing)", "Feature flags: feature.enabled=true"],
        ["@ConditionalOnWebApplication", "Running as a servlet/reactive web app", "MVC-only beans"],
        ["@ConditionalOnBean", "A bean of that type exists", "Configure X only if a DataSource exists"]],
      code: `interface Notifier { String send(String m); }
@Configuration
class NotifierConfig {
    @Bean @ConditionalOnProperty(name = "notifier.kind", havingValue = "sms")
    Notifier sms() { return m -> "SMS " + m; }
    @Bean @ConditionalOnProperty(name = "notifier.kind", havingValue = "email", matchIfMissing = true)
    Notifier email() { return m -> "EMAIL " + m; }
}
@SpringBootApplication class App { }
for (String kind : new String[] { null, "sms" }) {
    SpringApplication app = new SpringApplication(App.class);
    if (kind != null) app.setDefaultProperties(Map.of("notifier.kind", kind));
    try (var ctx = app.run()) { System.out.println("notifier.kind=" + kind + " → " + ctx.getBean(Notifier.class).send("order shipped")); }
}` },
    { title: "Backing off: your bean wins",
      text: "Almost every auto-configured bean is guarded by **`@ConditionalOnMissingBean`**. Define a bean of the same type and Boot's default disappears: your `ObjectMapper`, `DataSource`, `RestClient.Builder` or `SecurityFilterChain` is used instead. Because auto-configuration is processed **after** your configuration, ordering is reliable. The flip side: replacing a bean entirely also drops Boot's tuning of it (e.g. a hand-made `ObjectMapper` ignores `spring.jackson.*` properties), so prefer the customisation hooks on the next slide.",
      code: `@SpringBootApplication
class App {
    @Bean ObjectMapper myMapper() { return new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT); }
}
SpringApplication app = new SpringApplication(App.class);
app.setDefaultProperties(Map.of("spring.jackson.serialization.indent-output", "false"));   // ignored: Boot's mapper backed off
try (var ctx = app.run()) {
    System.out.println("ObjectMapper beans: " + ctx.getBeansOfType(ObjectMapper.class).keySet());
    System.out.println(ctx.getBean(ObjectMapper.class).writeValueAsString(Map.of("sku", "MUG")).contains("\\n") ? "output indented: our bean is used" : "compact output");
}` },
    { title: "Customise instead of replace",
      text: "Prefer, in this order: **properties** (`spring.jackson.*`, `server.port`, `spring.datasource.hikari.maximum-pool-size`), then **customizer beans** that Boot applies to the beans it builds (`Jackson2ObjectMapperBuilderCustomizer`, `WebServerFactoryCustomizer`, `RestClientCustomizer`, `HikariConfig` via properties), and only then a full replacement. Customizers compose (libraries and your app can each add one) and keep Boot's other defaults. The Spring Boot reference's \"Common Application Properties\" appendix lists every property.",
      code: `@SpringBootApplication
class App {
    @Bean Jackson2ObjectMapperBuilderCustomizer indent() { return builder -> builder.indentOutput(true); }   // adds to Boot's mapper
}
SpringApplication app = new SpringApplication(App.class);
app.setDefaultProperties(Map.of("spring.jackson.property-naming-strategy", "SNAKE_CASE"));             // Boot property still applies
record Fare(String fromCity, int priceInr) { }
try (var ctx = app.run()) {
    String json = ctx.getBean(ObjectMapper.class).writeValueAsString(new Fare("DEL", 4500));
    System.out.println("beans: " + ctx.getBeansOfType(ObjectMapper.class).keySet() + " | snake_case: " + json.contains("from_city") + " | indented: " + json.contains("\\n"));
}` },
    { title: "Seeing what Boot configured",
      text: "When something is (or isn't) configured, ask Boot. Start with **`--debug`** (or `debug=true`) to print the **condition evaluation report**: *positive matches* (applied, with the reason), *negative matches* (skipped, with the reason) and exclusions; the widget shows real report lines. In a running app use **Actuator**: `/actuator/conditions`, `/actuator/beans`, `/actuator/configprops` and `/actuator/env` (secure them!). `FailureAnalyzer`s explain common startup failures in plain words (\"Failed to configure a DataSource: 'url' attribute is not specified\").",
      code: `@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    var report = ConditionEvaluationReport.get(ctx.getBeanFactory());
    long matched = report.getConditionAndOutcomesBySource().values().stream().filter(c -> c.isFullMatch()).count();
    long skipped = report.getConditionAndOutcomesBySource().size() - matched;
    System.out.println("conditions evaluated for " + (report.getConditionAndOutcomesBySource().size() > 100 ? "over 100" : "some") + " classes/methods; matched " + (matched > 20 ? "dozens" : matched) + ", skipped " + (skipped > matched ? "even more" : skipped));
    report.getConditionAndOutcomesBySource().forEach((src, outcomes) -> {
        if (src.equals("org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration")) System.out.println("DataSourceAutoConfiguration full match: " + outcomes.isFullMatch() + " (H2 is on the classpath)");
    });
}` },
    { title: "Excluding auto-configuration",
      text: "Sometimes you want a starter's libraries but not its auto-configuration: a library brings in JDBC but your app has no database, or you configure security entirely yourself. Exclude classes with **`@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)`**, `excludeName` (for classes not on the compile classpath) or the property **`spring.autoconfigure.exclude`** (handy per environment or in tests). Excluding is a blunt tool; often a property (`spring.datasource.*`) or defining your own bean is the better fix.",
      code: `@SpringBootApplication(exclude = { DataSourceAutoConfiguration.class, HibernateJpaAutoConfiguration.class, FlywayAutoConfiguration.class })
class NoDbApp { }
try (var ctx = SpringApplication.run(NoDbApp.class)) {
    var report = ConditionEvaluationReport.get(ctx.getBeanFactory());
    System.out.println("excluded: " + report.getExclusions().stream().map(c -> c.substring(c.lastIndexOf('.') + 1)).sorted().toList());
    System.out.println("DataSource beans: " + ctx.getBeanNamesForType(javax.sql.DataSource.class).length);
}` },
    { title: "Writing your own auto-configuration (and testing it)",
      text: "Shared libraries in a company often ship as **custom starters**: an `acme-audit-spring-boot-autoconfigure` module with the `@AutoConfiguration` class, `@ConfigurationProperties` (prefix `acme.audit`) and conditions, registered in `META-INF/spring/…AutoConfiguration.imports`; and an `acme-audit-spring-boot-starter` module that only aggregates dependencies. Follow Boot's conventions: back off with `@ConditionalOnMissingBean`, guard with `@ConditionalOnClass`, offer an `enabled` property, and don't use component scanning inside auto-config. Test it with **`ApplicationContextRunner`**, which starts tiny contexts in milliseconds for each scenario.",
      code: `interface AuditSink { String write(String event); }
@ConfigurationProperties(prefix = "acme.audit")
record AuditProperties(String prefix) { AuditProperties { if (prefix == null) prefix = "[audit]"; } }
@AutoConfiguration
@EnableConfigurationProperties(AuditProperties.class)
@ConditionalOnProperty(prefix = "acme.audit", name = "enabled", havingValue = "true", matchIfMissing = true)
class AuditAutoConfiguration {
    @Bean @ConditionalOnMissingBean AuditSink auditSink(AuditProperties props) { return e -> props.prefix() + " " + e; }
}
ApplicationContextRunner runner = new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(AuditAutoConfiguration.class));
runner.run(ctx -> System.out.println("default: " + ctx.getBean(AuditSink.class).write("login")));
runner.withPropertyValues("acme.audit.prefix=AUDIT>").run(ctx -> System.out.println("custom prefix: " + ctx.getBean(AuditSink.class).write("login")));
runner.withPropertyValues("acme.audit.enabled=false").run(ctx -> System.out.println("disabled → beans: " + ctx.getBeansOfType(AuditSink.class).size()));
runner.withBean(AuditSink.class, () -> e -> "mine: " + e).run(ctx -> System.out.println("user bean → " + ctx.getBean(AuditSink.class).write("login")));` },
    { title: "What SpringApplication.run does",
      text: "Knowing the startup sequence helps with \"where do I hook in?\" questions. `run` creates a **bootstrap context**, prepares the **`Environment`** (property sources, profiles), prints the banner, creates the **ApplicationContext** of the right type, applies initializers, loads bean definitions, **refreshes** the context (bean factory post-processors, auto-configuration, singleton creation, embedded server start), then calls **runners** and publishes **`ApplicationReadyEvent`**. Use `ApplicationReadyEvent` or `SmartLifecycle` for work that needs the whole app up, `EnvironmentPostProcessor` to add property sources early, and keep runners fast.",
      m: M(["flowchart LR",
        "  S[\"starting\"]:::s1 --> E[\"environment prepared<br/>(properties, profiles)\"]:::s1 --> C[\"context created<br/>& prepared\"]:::s3",
        "  C --> R[\"refresh: auto-config,<br/>beans, server\"]:::s2 --> RUN[\"runners\"]:::s3 --> READY[\"ApplicationReadyEvent\"]:::s2",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00"]),
      code: `@SpringBootApplication
class App { @Bean CommandLineRunner runner() { return args -> System.out.println("  CommandLineRunner runs"); } }
SpringApplication app = new SpringApplication(App.class);
app.addListeners((ApplicationListener<ApplicationEvent>) e -> {
    String n = e.getClass().getSimpleName();
    if (n.startsWith("Application") && !n.equals("ApplicationEvent")) System.out.println("event: " + n);
});
app.run().close();` }
  ];

  H.registerLesson({
    code: "S02",
    summary: "How Spring Boot decides what to configure: starters and the dependency BOM, what `@SpringBootApplication` contains, how auto-configuration classes are discovered and ordered, the conditional annotations, why your own beans make Boot back off, customising with properties and customizers instead of replacing beans, reading the condition evaluation report and Actuator, excluding auto-configuration, writing and testing your own auto-configuration and starter, and the `SpringApplication.run` startup sequence.",
    slides: SLIDES,
    widget: { heading: "Interactive: will Boot auto-configure this bean?", caption: "Toggle the classpath, your own bean and a property for a real auto-configuration class. The diagram, result and condition report lines come from running all 12 combinations on Spring Boot 3.4.1.", render: s02Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Mysterious beans", "A DataSource appears because a transitive dependency added H2; the condition report shows why."],
      ["Startup failures", "\"Failed to configure a DataSource\" after adding data-jpa without database properties; FailureAnalyzer explains it."],
      ["Platform teams", "Company starters auto-configure logging, tracing, security and HTTP clients with sensible defaults for every service."],
      ["Customisation", "`spring.jackson.*` properties and a `Jackson2ObjectMapperBuilderCustomizer` tune JSON without replacing Boot's mapper."],
      ["Tests", "`ApplicationContextRunner` verifies a custom auto-configuration's conditions in milliseconds."],
      ["Upgrades", "Boot 2.7 moved registration from `spring.factories` to `AutoConfiguration.imports`, breaking older custom starters."]
    ],
    pitfalls: [
      "Main class not in the root package, so components aren't scanned",
      "Pinning library versions that fight Boot's BOM",
      "Replacing a Boot bean (ObjectMapper) and losing its property-driven tuning",
      "Component scanning inside your own auto-configuration",
      "Forgetting @ConditionalOnMissingBean so users can't override your default",
      "Excluding auto-configuration when a property would do",
      "Exposing /actuator/env or /conditions publicly",
      "Heavy work in CommandLineRunner delaying readiness",
      "Using the old spring.factories registration on Boot 3"
    ],
    quiz: [
      { q: "Which three annotations make up @SpringBootApplication?", options: ["@Configuration, @EnableWebMvc, @ComponentScan", "@SpringBootConfiguration, @EnableAutoConfiguration, @ComponentScan", "@Component, @EnableAutoConfiguration, @Import", "@Configuration, @Bean, @ComponentScan"], answer: 1, why: "The slide's code prints them by reflection." },
      { q: "You define your own ObjectMapper bean. What happens to Boot's?", options: ["Both exist; Boot's is @Primary", "Boot's backs off because of @ConditionalOnMissingBean", "Startup fails", "Boot's replaces yours"], answer: 1, why: "But your mapper ignores spring.jackson.* properties; a customizer keeps both." },
      { q: "Where does Boot 3 find auto-configuration classes?", options: ["application.properties", "META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports", "web.xml", "Component scanning of org.springframework"], answer: 1, why: "spring.factories was used before Boot 2.7." },
      { q: "With matchIfMissing = true on @ConditionalOnProperty(name = \"greeter.enabled\", havingValue = \"true\"), when does it match?", options: ["Only when set to true", "When set to true or not set at all", "Only when not set", "Never"], answer: 1, why: "Recorded: unset → match; false → no match." },
      { q: "How do you see why an auto-configuration did or didn't apply?", options: ["Read the source only", "Run with --debug for the condition evaluation report, or GET /actuator/conditions", "Enable SQL logging", "Use jstack"], answer: 1, why: "It lists positive and negative matches with reasons." },
      { q: "What does a starter contain?", options: ["Auto-configuration code only", "A curated set of dependencies for a capability (often plus an autoconfigure module)", "Application properties", "Docker images"], answer: 1, why: "The starter module is usually just a dependency aggregate." },
      { q: "Why does Boot process auto-configuration after your configuration?", options: ["Alphabetical order", "So conditions like @ConditionalOnMissingBean can see your beans and back off", "Performance", "It doesn't"], answer: 1, why: "Deferred import of auto-configurations." },
      { q: "Best way to test a custom auto-configuration?", options: ["Deploy it to staging", "ApplicationContextRunner with property and bean variations", "Manual curl calls", "@SpringBootTest of every app using it"], answer: 1, why: "Fast, isolated contexts per scenario." },
      { q: "Which hook runs once the application is fully started?", options: ["@PostConstruct", "ApplicationReadyEvent listener", "BeanFactoryPostProcessor", "Static initializer"], answer: 1, why: "Published after runners; the context and server are up." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Use"],
        ["Add a capability", "the starter, no version (BOM)"],
        ["Change a default", "a property (`spring.*`, `server.*`)"],
        ["Tweak a Boot bean", "a customizer bean (`…Customizer`)"],
        ["Replace a Boot bean", "your own `@Bean` (Boot backs off)"],
        ["Turn one off", "`@SpringBootApplication(exclude = …)` / `spring.autoconfigure.exclude`"],
        ["Why/why not", "`--debug`, `/actuator/conditions`"],
        ["Own auto-config", "`@AutoConfiguration` + conditions + `AutoConfiguration.imports`"],
        ["Test it", "`ApplicationContextRunner`"]],
      cards: [
        { title: "Core conditions", items: ["@ConditionalOnClass", "@ConditionalOnMissingBean", "@ConditionalOnProperty", "@ConditionalOnBean", "@ConditionalOnWebApplication"] },
        { title: "Custom starter rules", items: ["autoconfigure + starter modules", "Back off with OnMissingBean", "enabled property", "@ConfigurationProperties prefix", "No component scan"] },
        { title: "Say in interviews", items: ["Starters + BOM", "Conditional configuration", "User beans win", "Condition report", "Startup events"] }]
    },
    practice: [
      { level: "Easy", q: "What is Spring Boot auto-configuration?",
        a: ["Configuration classes shipped with Boot (and libraries) that create beans automatically.",
          "Each is guarded by conditions: class on classpath, bean missing, property value, web app type.",
          "They are listed in META-INF/spring/…AutoConfiguration.imports and applied after your own configuration.",
          "They back off when you define the bean yourself."] },
      { level: "Easy", q: "What does @SpringBootApplication do, and why must the main class be in the root package?",
        a: ["@SpringBootConfiguration: the class is a configuration source.",
          "@EnableAutoConfiguration: import and evaluate auto-configuration candidates.",
          "@ComponentScan: scan the class's package and sub-packages.",
          "Classes outside that package tree aren't found unless you add scanBasePackages."] },
      { level: "Easy", q: "Make a bean that exists only when a feature flag property is on (default off).",
        a: ["@ConditionalOnProperty with havingValue = \"true\".",
          "matchIfMissing = false (the default) keeps it off when unset.",
          "Verify both cases with ApplicationContextRunner."],
        code: `interface Recommender { String suggest(); }
@Configuration
class FeatureConfig {
    @Bean @ConditionalOnProperty(name = "features.recommendations", havingValue = "true")
    Recommender recommender() { return () -> "you may also like: travel pillow"; }
}
ApplicationContextRunner r = new ApplicationContextRunner().withUserConfiguration(FeatureConfig.class);
r.run(ctx -> System.out.println("unset → beans: " + ctx.getBeansOfType(Recommender.class).size()));
r.withPropertyValues("features.recommendations=true").run(ctx -> System.out.println("on → " + ctx.getBean(Recommender.class).suggest()));` },
      { level: "Medium", q: "How would you find out why Boot did or didn't create a particular bean?",
        a: ["Run with --debug (debug=true) and read the condition evaluation report: positive/negative matches with reasons.",
          "In a running app: /actuator/conditions and /actuator/beans.",
          "Check exclusions, the classpath (mvn dependency:tree) and properties (/actuator/env, /actuator/configprops).",
          "Look for your own bean that made Boot back off."] },
      { level: "Medium", q: "Customise Boot's ObjectMapper without replacing it.",
        a: ["Use spring.jackson.* properties for common settings.",
          "Add a Jackson2ObjectMapperBuilderCustomizer bean for the rest.",
          "Boot still builds the mapper, applying properties and every customizer."],
        code: `@SpringBootApplication
class App { @Bean Jackson2ObjectMapperBuilderCustomizer noNulls() { return b -> b.serializationInclusion(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL); } }
record Booking(String pnr, String seat) { }
SpringApplication app = new SpringApplication(App.class);
app.setDefaultProperties(Map.of("spring.jackson.property-naming-strategy", "SNAKE_CASE"));
try (var ctx = app.run()) {
    System.out.println(ctx.getBean(ObjectMapper.class).writeValueAsString(new Booking("AB12CD", null)));
}` },
      { level: "Medium", q: "Explain @ConditionalOnMissingBean and a pitfall when using it in your own configuration.",
        a: ["It registers a bean only if no bean of that type (or name) exists yet.",
          "It depends on evaluation order: it only sees beans defined so far.",
          "That's reliable in auto-configuration (processed after user config) but fragile in regular @Configuration classes.",
          "Use it in auto-configuration classes; in app config just define the bean explicitly."] },
      { level: "Medium", q: "What's the difference between excluding an auto-configuration and defining your own bean?",
        a: ["Excluding removes all beans from that auto-configuration class.",
          "Defining your own bean makes only the matching @ConditionalOnMissingBean methods back off, keeping the rest.",
          "Prefer properties, then customizers, then own beans; exclude when you don't want the feature at all."] },
      { level: "Hard", q: "Write and test an auto-configuration for an internal HTTP client library.",
        a: ["@AutoConfiguration guarded by @ConditionalOnClass (the client class) and an enabled property.",
          "@ConfigurationProperties for base URL and timeouts with defaults.",
          "@Bean @ConditionalOnMissingBean for the client so apps can override.",
          "Register in AutoConfiguration.imports; test with ApplicationContextRunner: defaults, property overrides, disabled, user bean."],
        code: `record InventoryClient(String baseUrl, int timeoutMs) { }
@ConfigurationProperties(prefix = "inventory.client")
record InventoryProps(String baseUrl, Integer timeoutMs) { InventoryProps { if (baseUrl == null) baseUrl = "http://inventory:8080"; if (timeoutMs == null) timeoutMs = 2000; } }
@AutoConfiguration
@EnableConfigurationProperties(InventoryProps.class)
@ConditionalOnProperty(prefix = "inventory.client", name = "enabled", havingValue = "true", matchIfMissing = true)
class InventoryClientAutoConfiguration {
    @Bean @ConditionalOnMissingBean InventoryClient inventoryClient(InventoryProps p) { return new InventoryClient(p.baseUrl(), p.timeoutMs()); }
}
ApplicationContextRunner r = new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(InventoryClientAutoConfiguration.class));
r.run(c -> System.out.println("defaults: " + c.getBean(InventoryClient.class)));
r.withPropertyValues("inventory.client.timeout-ms=500").run(c -> System.out.println("override: " + c.getBean(InventoryClient.class)));
r.withPropertyValues("inventory.client.enabled=false").run(c -> System.out.println("disabled: " + c.getBeansOfType(InventoryClient.class).isEmpty()));` },
      { level: "Hard", q: "Your company wants every service to get standard logging, tracing and an audit client with no code. Design it.",
        steps: ["Create an internal Boot starter: an autoconfigure module with @AutoConfiguration classes and a starter module aggregating dependencies.",
          "Each feature: @ConditionalOnClass for its library, an acme.<feature>.enabled flag, @ConfigurationProperties with safe defaults, @ConditionalOnMissingBean beans.",
          "Order relative to Boot's configs with @AutoConfiguration(after = …); register in AutoConfiguration.imports.",
          "Publish a parent POM/BOM that imports Boot's BOM plus your starter versions.",
          "Test with ApplicationContextRunner, document properties (configuration metadata), version it, and roll out via the parent upgrade."] },
      { level: "Hard", q: "Describe what happens from SpringApplication.run() to the app serving requests.",
        a: ["Bootstrap context; listeners get ApplicationStartingEvent.",
          "Environment prepared: property sources (command line, env vars, application.yml, profiles); EnvironmentPostProcessors run.",
          "Context created for the web type; initializers applied; bean definitions loaded (your config, then deferred auto-configuration).",
          "Refresh: BeanFactoryPostProcessors, condition evaluation, singleton creation with BeanPostProcessors and proxies, embedded server starts.",
          "ApplicationStartedEvent, runners execute, ApplicationReadyEvent: liveness/readiness become ready."] }
    ],
    recap: [
      "Starters bring dependencies with BOM-managed versions; auto-configuration turns them into beans.",
      "@SpringBootApplication = configuration + auto-configuration + component scan from the root package.",
      "Conditions (class, bean, property) decide; auto-configuration backs off when you define the bean.",
      "Customise via properties and customizers; inspect with --debug and /actuator/conditions.",
      "Own starters: @AutoConfiguration + conditions + imports file, tested with ApplicationContextRunner."
    ]
  });
})();
