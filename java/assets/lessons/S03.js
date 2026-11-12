/* Lesson S03: Profiles & externalised configuration */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded with Spring Boot 3.4.1: shop.discount defined in application.properties (5), application-dev.properties (0),
  // application-prod.properties (10), optionally env SHOP_DISCOUNT=15, -Dshop.discount=20 and --shop.discount=25,
  // with no profile, dev or prod active: 24 runs. Values are env.getProperty("shop.discount"); the source is the first
  // PropertySource in the Environment that contains the key.
  var REC = {"no|no|no|none": ["5", "application.properties"], "no|no|no|dev": ["0", "application-dev.properties"], "no|no|no|prod": ["10", "application-prod.properties"], "no|no|yes|none": ["25", "command line"], "no|no|yes|dev": ["25", "command line"], "no|no|yes|prod": ["25", "command line"], "no|yes|no|none": ["20", "JVM system properties"], "no|yes|no|dev": ["20", "JVM system properties"], "no|yes|no|prod": ["20", "JVM system properties"], "no|yes|yes|none": ["25", "command line"], "no|yes|yes|dev": ["25", "command line"], "no|yes|yes|prod": ["25", "command line"], "yes|no|no|none": ["15", "OS environment"], "yes|no|no|dev": ["15", "OS environment"], "yes|no|no|prod": ["15", "OS environment"], "yes|no|yes|none": ["25", "command line"], "yes|no|yes|dev": ["25", "command line"], "yes|no|yes|prod": ["25", "command line"], "yes|yes|no|none": ["20", "JVM system properties"], "yes|yes|no|dev": ["20", "JVM system properties"], "yes|yes|no|prod": ["20", "JVM system properties"], "yes|yes|yes|none": ["25", "command line"], "yes|yes|yes|dev": ["25", "command line"], "yes|yes|yes|prod": ["25", "command line"]};
  var LAYERS = [
    { k: "cl", name: "command line", detail: "--shop.discount=25", v: "25" },
    { k: "sp", name: "JVM system properties", detail: "-Dshop.discount=20", v: "20" },
    { k: "env", name: "OS environment", detail: "SHOP_DISCOUNT=15 (relaxed binding)", v: "15" },
    { k: "prof", name: "application-{profile}.properties", detail: "dev: 0 · prod: 10", v: null },
    { k: "base", name: "application.properties", detail: "shop.discount=5", v: "5" }
  ];
  function s03Widget(el, ctx) {
    var s = ctx.state; if (!s.prof) { s.prof = "none"; s.env = "no"; s.sp = "no"; s.cl = "no"; }
    function tog(k, label) { return "<button type='button' class='btn' data-t='" + k + "'>" + label + "</button>"; }
    el.innerHTML = "<div class='seg' data-r='prof'><button type='button' data-v='none'>no profile</button><button type='button' data-v='dev'>--spring.profiles.active=dev</button><button type='button' data-v='prod'>…=prod</button></div>" +
      "<div class='btnrow' data-r='tog' style='margin-top:8px'>" + tog("cl", "--shop.discount=25") + tog("sp", "-Dshop.discount=20") + tog("env", "SHOP_DISCOUNT=15") + "</div>" +
      "<div class='diagram' data-r='dg'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("prof").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", s.prof === b.dataset.v); });
      q("tog").querySelectorAll("button").forEach(function (b) { var on = s[b.dataset.t] === "yes"; b.classList.toggle("primary", on); b.textContent = (on ? "✓ " : "+ ") + b.textContent.replace(/^[✓+] /, ""); });
      var r = REC[s.env + "|" + s.sp + "|" + s.cl + "|" + s.prof], L = ["flowchart TB"];
      LAYERS.forEach(function (l, i) {
        var present = l.k === "base" || (l.k === "prof" ? s.prof !== "none" : s[l.k] === "yes");
        var val = l.k === "prof" ? (s.prof === "dev" ? "0" : s.prof === "prod" ? "10" : "–") : l.v;
        var file = l.k === "prof" && s.prof !== "none" ? "application-" + s.prof + ".properties" : l.name;
        var win = r && r[1] === file || (r && r[1] === l.name);
        L.push("  L" + i + "[\"rank " + (i + 1) + ": " + file + "<br/>" + (present ? "shop.discount = " + val : "not set") + (win ? "<br/>WINS" : "") + "\"]:::" + (win ? "win" : present ? "set" : "off"));
        if (i) L.push("  L" + (i - 1) + " --- L" + i);
      });
      L.push("  classDef win fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px", "  classDef set fill:#fff3e0,stroke:#ef6c00", "  classDef off fill:#f3f4f6,stroke:#d1d5db,color:#9ca3af");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("res").innerHTML = ctx.md("**`shop.discount` = " + r[0] + "**, from **" + r[1] + "** (recorded on Spring Boot 3.4.1). Higher sources override lower ones key by key: command line > system properties > environment variables > profile-specific files > `application.properties`. " +
        (s.prof !== "none" && r[1].indexOf("application-") === 0 ? "The profile file overrides the base file only because nothing higher sets the key." : s.env === "yes" && s.cl === "no" && s.sp === "no" ? "The environment variable `SHOP_DISCOUNT` binds to `shop.discount` through relaxed binding, which is how containers and Kubernetes usually configure apps." : ""));
    }
    q("prof").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.prof = b.dataset.v; ctx.save(); draw(); });
    q("tog").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var k = b.dataset.t; s[k] = s[k] === "yes" ? "no" : "yes"; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Externalised configuration: one build, many environments",
      text: "The same jar should run on a laptop, in staging and in production; only **configuration** differs (URLs, credentials, pool sizes, feature flags). Spring Boot collects configuration from many **property sources** (files, environment variables, system properties, command-line arguments, config servers) into one **`Environment`**, layered by precedence. Your code reads it through **`@ConfigurationProperties`** (preferred) or **`@Value`**, never by reading files itself. This is factor III of the twelve-factor app: config in the environment, not in code.",
      m: M(["flowchart LR",
        "  F[\"application.yml<br/>application-prod.yml\"]:::s1 --> E[\"Environment<br/>(ordered property sources)\"]:::s2",
        "  V[\"env vars, -D, --args\"]:::s1 --> E",
        "  X[\"config server, Vault,<br/>K8s ConfigMaps\"]:::s1 --> E",
        "  E --> CP[\"@ConfigurationProperties\"]:::s3",
        "  E --> VA[\"@Value\"]:::s3",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `@SpringBootApplication class App { }
SpringApplication app = new SpringApplication(App.class);
app.setDefaultProperties(Map.of("shop.name", "Chai Point", "shop.currency", "INR"));         // lowest precedence
try (var ctx = app.run("--shop.name=Chai Point Express")) {                                   // command line wins
    Environment env = ctx.getEnvironment();
    System.out.println(env.getProperty("shop.name") + " sells in " + env.getProperty("shop.currency") + "; missing key → " + env.getProperty("shop.tagline", "(default)"));
}`,
      analogy: "The app is a chef with a standard recipe (application.yml). Each restaurant (environment) clips notes on top: 'less salt here', 'this branch uses a gas stove'. The topmost note for an ingredient wins." },
    { title: "properties vs YAML, and multi-document files",
      text: "`application.properties` and `application.yml` are equivalent; YAML is more readable for nested structure and lists. Both can hold **several documents**: in YAML separate them with `---`, in properties with `#---`; a document can apply only to a profile via **`spring.config.activate.on-profile`**. Keep YAML indentation consistent (spaces, not tabs), quote values like `\"on\"`, `\"no\"` or leading zeros that YAML would otherwise reinterpret, and don't mix both formats for the same keys (properties wins when both exist).",
      lang: "yaml",
      noCompile: true,
      code: `shop:
  name: Chai Point
  discount: 5
  payment-methods: [UPI, CARD]       # a list
  timeouts:
    inventory: 2s                    # converted to Duration
---
spring:
  config:
    activate:
      on-profile: prod
shop:
  discount: 10                       # overrides only in prod` },
    { title: "Property source precedence",
      text: "From highest to lowest (the common ones): **command-line arguments** (`--server.port=9090`), `SPRING_APPLICATION_JSON`, servlet init params, JNDI, **Java system properties** (`-D`), **OS environment variables**, `random.*`, **profile-specific config files** outside then inside the jar, **application config files** outside then inside the jar, `@PropertySource` on configuration classes, and **default properties** (`SpringApplication.setDefaultProperties`). Files outside the jar (`./config/application.yml`, `./application.yml`) beat packaged ones, so ops can override without rebuilding. Precedence is **per key**: a higher source overrides only the keys it defines. The widget walks through 24 recorded combinations.",
      table: [["Rank", "Source", "Example"],
        ["1 (highest)", "Command-line args", "--shop.discount=25"],
        ["2", "Java system properties", "-Dshop.discount=20"],
        ["3", "OS environment variables", "SHOP_DISCOUNT=15"],
        ["4", "Profile-specific files (outside, then inside jar)", "application-prod.yml"],
        ["5", "Application files (outside, then inside jar)", "application.yml"],
        ["6", "@PropertySource", "@PropertySource(\"classpath:extra.properties\")"],
        ["7 (lowest)", "Default properties", "app.setDefaultProperties(...)"]],
      code: `@SpringBootApplication class App { }
System.setProperty("shop.discount", "20");
System.setProperty("shop.region", "south");
try (var ctx = SpringApplication.run(App.class, "--shop.discount=25")) {
    Environment env = ctx.getEnvironment();
    System.out.println("discount " + env.getProperty("shop.discount") + " (command line beats -D), region " + env.getProperty("shop.region") + " (only -D sets it)");
} finally { System.clearProperty("shop.discount"); System.clearProperty("shop.region"); }` },
    { title: "Relaxed binding and environment variables",
      text: "Spring Boot maps property names flexibly. In files use **kebab-case** (`shop.max-items`); `@ConfigurationProperties` also accepts camelCase and underscores. Environment variables can't contain dots or dashes, so the rule is: replace dots with `_`, **remove dashes**, uppercase. `shop.max-items` → **`SHOP_MAXITEMS`** (not `SHOP_MAX_ITEMS`, which would mean `shop.max.items`); list elements use `_0_`: `SHOP_PAYMENTMETHODS_0_=UPI`. `@Value` needs the canonical form (`${shop.max-items}`); relaxed binding is most complete with `@ConfigurationProperties`.",
      code: `StandardEnvironment env = new StandardEnvironment();
env.getPropertySources().replace("systemEnvironment", new SystemEnvironmentPropertySource("systemEnvironment", Map.of("SHOP_MAXITEMS", "7", "SHOP_PAYMENTMETHODS_0_", "UPI", "SHOP_PAYMENTMETHODS_1_", "CARD")));
var binder = org.springframework.boot.context.properties.bind.Binder.get(env);
System.out.println("shop.max-items = " + binder.bind("shop.max-items", Integer.class).get());
System.out.println("shop.payment-methods = " + binder.bind("shop.payment-methods", org.springframework.boot.context.properties.bind.Bindable.listOf(String.class)).get());` },
    { title: "Profiles",
      text: "A **profile** names an environment or variant (`dev`, `test`, `prod`, `kafka`). Activate with `spring.profiles.active` (property, `--spring.profiles.active=prod`, or `SPRING_PROFILES_ACTIVE=prod`). Effects: **profile-specific files** (`application-prod.yml`) are loaded on top of the base file, documents with `spring.config.activate.on-profile` apply, and beans annotated **`@Profile(\"prod\")`** (or `\"!prod\"`) are registered only then. `spring.profiles.group.prod=prod-db,prod-mq` activates several at once. Use profiles for **environment differences**; prefer feature-flag properties for features, so you don't end up with a profile explosion.",
      code: `interface PaymentGateway { String name(); }
@Component @Profile("!prod") class FakeGateway implements PaymentGateway { public String name() { return "fake gateway (dev/test)"; } }
@Component @Profile("prod") class RazorpayGateway implements PaymentGateway { public String name() { return "real gateway (prod)"; } }
@SpringBootApplication class App { }
for (String profile : new String[] { "dev", "prod" }) {
    try (var ctx = SpringApplication.run(App.class, "--spring.profiles.active=" + profile)) {
        System.out.println(profile + " → " + ctx.getBean(PaymentGateway.class).name() + ", active " + Arrays.toString(ctx.getEnvironment().getActiveProfiles()));
    }
}` },
    { title: "@Value: placeholders, defaults and SpEL",
      text: "`@Value(\"${shop.discount}\")` injects a single property, converting to the field type. **`${key:default}`** supplies a default (otherwise a missing key fails startup); **`#{...}`** evaluates SpEL (`#{${shop.discount} * 2}`, `#{'${shop.tags}'.split(',')}`). `@Value` is fine for one or two values, but it scatters keys across the code, has no type-safe grouping, no validation, no IDE metadata, and binding is less relaxed. For anything structured use `@ConfigurationProperties`.",
      code: `@Component
class Pricing {
    @Value("\${shop.discount:0}") int discount;                     // default when missing
    @Value("\${shop.currency:INR}") String currency;
    @Value("#{\${shop.discount:0} * 2}") int festiveDiscount;        // SpEL on top of a placeholder
    @Value("#{'\${shop.tags:tea,snacks}'.split(',')}") List<String> tags;
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class, "--shop.discount=7")) {
    Pricing p = ctx.getBean(Pricing.class);
    System.out.println(p.discount + "% (" + p.currency + "), festive " + p.festiveDiscount + "%, tags " + p.tags);
}` },
    { title: "@ConfigurationProperties: type-safe configuration",
      text: "Bind a whole prefix to a class or **record**: `@ConfigurationProperties(prefix = \"shop\")`. You get nesting, lists and maps, conversion of `Duration` (`2s`, `500ms`), `DataSize` (`10MB`) and enums, relaxed binding, defaults (`@DefaultValue` on record components), and IDE auto-completion via the configuration processor's metadata. Register with `@EnableConfigurationProperties` or `@ConfigurationPropertiesScan`. Inject the properties object where needed; it documents every setting in one place.",
      code: `@ConfigurationProperties(prefix = "shop")
record ShopProperties(String name, @DefaultValue("5") int discount, List<String> paymentMethods, Duration inventoryTimeout, DataSize maxUpload) { }
@SpringBootApplication
@EnableConfigurationProperties(ShopProperties.class)
class App { }
try (var ctx = SpringApplication.run(App.class, "--shop.name=Chai Point", "--shop.payment-methods=UPI,CARD", "--shop.inventory-timeout=1500ms", "--shop.max-upload=2MB")) {
    ShopProperties p = ctx.getBean(ShopProperties.class);
    System.out.println(p.name() + ": discount " + p.discount() + "% (default), methods " + p.paymentMethods() + ", timeout " + p.inventoryTimeout().toMillis() + " ms, upload " + p.maxUpload().toKilobytes() + " KB");
}` },
    { title: "Validate configuration at startup",
      text: "A wrong or missing setting should **fail at startup**, not at 2 a.m. on the first request. Add **`@Validated`** to a `@ConfigurationProperties` type and Bean Validation constraints (`@NotBlank`, `@Min`, `@Pattern`, `@Valid` for nested objects): Boot validates during binding and refuses to start with a clear message naming the property and the violated rule. Combine with sensible defaults and required-ness: if production must set a value, don't give it a default.",
      code: `@ConfigurationProperties(prefix = "payments")
@Validated
record PaymentProperties(@NotBlank String apiUrl, @Min(1) @Max(30) int timeoutSeconds) { }
@SpringBootApplication
@EnableConfigurationProperties(PaymentProperties.class)
class App { }
try (var ctx = SpringApplication.run(App.class, "--payments.api-url=", "--payments.timeout-seconds=90")) {
    System.out.println("started (should not happen)");
} catch (Exception e) {
    Throwable t = e; while (t.getCause() != null && !(t instanceof org.springframework.boot.context.properties.bind.validation.BindValidationException)) t = t.getCause();
    String msg = t.getMessage();
    System.out.println("startup refused; errors mention apiUrl: " + msg.contains("apiUrl") + ", timeoutSeconds: " + msg.contains("timeoutSeconds"));
}` },
    { title: "Secrets don't belong in Git",
      text: "Passwords, API keys and tokens must never be committed, even in a private repo; history keeps them forever. Options, roughly in order of maturity: **environment variables** injected by the platform; files mounted by **Kubernetes Secrets** (read with `configtree:`); a **secrets manager** (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault) loaded via `spring.config.import` (Spring Cloud integrations); and encrypted values with a config server. Also: don't log them (`/actuator/env` masks keys like `password`, `secret`, `key` by default; keep it that way), rotate them, and give each environment its own.",
      table: [["Approach", "Pros", "Cons"],
        ["Env vars", "Simple, universal", "Visible to processes on the host; no rotation"],
        ["K8s Secrets as files (configtree)", "Native in Kubernetes; rotation by remount", "Base64, not encryption, unless etcd encryption is on"],
        ["Vault / cloud secret manager", "Audit, rotation, dynamic DB credentials", "More infrastructure"],
        ["Committed encrypted values", "Versioned with code", "Key management problem moves elsewhere"]],
      code: `Path secrets = Files.createTempFile("secrets", ".properties");
Files.writeString(secrets, "payments.api-key=sk_live_example_not_real\\n");
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class, "--spring.config.import=optional:file:" + secrets)) {
    String key = ctx.getEnvironment().getProperty("payments.api-key");
    System.out.println("loaded secret from an external file, starts with " + key.substring(0, 8) + "… (never print the full value)");
} finally { Files.deleteIfExists(secrets); }` },
    { title: "Configuration in containers and Kubernetes",
      text: "In containers, configure with **environment variables** (`SPRING_PROFILES_ACTIVE=prod`, `SPRING_DATASOURCE_URL=...`) and mounted files. Kubernetes **ConfigMaps** and **Secrets** can be mounted as directories where each file name is a key and its content the value; Boot reads them with **`spring.config.import=configtree:/etc/config/`**. Keep images environment-agnostic, set memory-aware JVM flags, and remember that changing a ConfigMap doesn't change a running app's `Environment` unless you restart the pod (or use Spring Cloud Kubernetes reload).",
      code: `Path dir = Files.createTempDirectory("configmap");
Files.writeString(dir.resolve("shop.discount"), "12");                    // file name = key, content = value
Files.writeString(dir.resolve("shop.region"), "west");
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class, "--spring.config.import=configtree:" + dir + "/")) {
    Environment env = ctx.getEnvironment();
    System.out.println("from mounted files: discount " + env.getProperty("shop.discount") + ", region " + env.getProperty("shop.region"));
}` },
    { title: "Debugging configuration: who set this value?",
      text: "When a value isn't what you expect, find **which source won**. The `Environment`'s property sources are ordered by precedence, so the first one containing the key is the winner; the widget does exactly this from recorded runs. In a running app, **`/actuator/env/{key}`** shows every source that defines the key and the effective value, and **`/actuator/configprops`** shows bound `@ConfigurationProperties` (both mask secrets). Common culprits: an environment variable left in the deployment, a profile you didn't know was active, an external `config/application.yml` next to the jar, or YAML type surprises.",
      code: `@SpringBootApplication class App { }
SpringApplication app = new SpringApplication(App.class);
app.setDefaultProperties(Map.of("shop.discount", "5"));
try (var ctx = app.run("--shop.discount=25")) {
    ConfigurableEnvironment env = ctx.getEnvironment();
    List<String> definers = env.getPropertySources().stream()
        .filter(ps -> !ps.getName().equals("configurationProperties") && ps.containsProperty("shop.discount"))
        .map(ps -> ps.getName() + "=" + ps.getProperty("shop.discount")).toList();
    System.out.println("effective " + env.getProperty("shop.discount") + "; sources in precedence order: " + definers);
}` }
  ];

  H.registerLesson({
    code: "S03",
    summary: "How Spring Boot layers configuration so one build runs everywhere: property sources and their precedence, properties vs YAML and multi-document files, relaxed binding and environment variables, profiles and `@Profile`, `@Value` with defaults and SpEL, type-safe `@ConfigurationProperties` and validating it at startup, keeping secrets out of Git, configuration in containers and Kubernetes (`configtree:`), and finding which source set a value.",
    slides: SLIDES,
    widget: { heading: "Interactive: which value wins?", caption: "Activate a profile and add command-line, system-property and environment-variable overrides. The value and winning source come from 24 runs recorded on Spring Boot 3.4.1.", render: s03Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Kubernetes deployments", "`SPRING_PROFILES_ACTIVE=prod` and `SPRING_DATASOURCE_URL` set in the Deployment; ConfigMaps mounted with `configtree:`."],
      ["Incidents", "A forgotten environment variable overrode the pool size in application.yml; `/actuator/env` showed the source."],
      ["Local development", "`application-local.yml` points to Docker Compose services; never committed secrets."],
      ["Feature flags", "`features.new-checkout.enabled` properties toggled per environment without new builds."],
      ["Fail fast", "`@Validated` properties refuse to start when the payment API URL is missing in a new environment."],
      ["Secret rotation", "Database credentials fetched from Vault at startup instead of being baked into images."]
    ],
    pitfalls: [
      "Committing secrets in application.yml (they stay in Git history)",
      "Wrong environment-variable names (SHOP_MAX_ITEMS for shop.max-items)",
      "Profile explosion: a profile for every feature combination",
      "Using @Value everywhere instead of grouped @ConfigurationProperties",
      "Missing defaults vs missing required values: decide which, and validate",
      "YAML surprises: tabs, unquoted on/off/yes/no, leading zeros",
      "Not realising an external config/application.yml overrides the packaged one",
      "Printing or logging secret values while debugging",
      "Expecting ConfigMap changes to reach a running app without restart or reload"
    ],
    quiz: [
      { q: "shop.discount is 5 in application.properties, 10 in application-prod.properties, and SHOP_DISCOUNT=15 is set. Profile prod is active. Value?", options: ["5", "10", "15", "Startup fails"], answer: 2, why: "Environment variables beat config files, including profile-specific ones (recorded)." },
      { q: "Which has the highest precedence?", options: ["application.yml", "Environment variables", "Command-line arguments", "@PropertySource"], answer: 2, why: "Command line > system properties > env vars > profile files > base files > @PropertySource > defaults." },
      { q: "Which environment variable sets shop.max-items?", options: ["SHOP_MAX_ITEMS", "SHOP_MAXITEMS", "shop-max-items", "SHOP.MAX-ITEMS"], answer: 1, why: "Dots become underscores and dashes are removed." },
      { q: "What does @Value(\"${shop.discount:0}\") do when the property is missing?", options: ["Fails startup", "Injects 0", "Injects null", "Injects the string \"shop.discount:0\""], answer: 1, why: "The part after the colon is the default." },
      { q: "Why prefer @ConfigurationProperties over @Value?", options: ["It's faster", "Type-safe grouping, nesting, relaxed binding, validation and IDE metadata", "@Value is deprecated", "It supports SpEL"], answer: 1, why: "@Value is fine for a single value." },
      { q: "How do you make a bean exist only outside production?", options: ["@Profile(\"dev\") only", "@Profile(\"!prod\")", "@ConditionalOnMissingBean", "@Lazy"], answer: 1, why: "Profile expressions support !, & and |." },
      { q: "How does Boot read Kubernetes ConfigMaps mounted as files?", options: ["It can't", "spring.config.import=configtree:/path/", "@PropertySource(\"file:/path\")", "Only via Spring Cloud Config"], answer: 1, why: "Each file name becomes a key and the content its value." },
      { q: "What happens with @Validated @ConfigurationProperties when a @NotBlank value is empty?", options: ["Logs a warning", "Startup fails with a binding validation error naming the property", "Uses null", "Uses the default"], answer: 1, why: "Fail fast at startup instead of at the first request." },
      { q: "How do you find which source supplied a property in a running app?", options: ["Restart with debug", "GET /actuator/env/{key}", "Read the jar", "jstack"], answer: 1, why: "It lists each defining source and the effective value (secrets masked)." }
    ],
    cheatsheet: {
      table: [
        ["Task", "How"],
        ["Activate profile", "`--spring.profiles.active=prod` / `SPRING_PROFILES_ACTIVE=prod`"],
        ["Profile-only bean", "`@Profile(\"prod\")`, `@Profile(\"!prod\")`"],
        ["Profile section in YAML", "`spring.config.activate.on-profile: prod` after `---`"],
        ["Single value", "`@Value(\"${key:default}\")`"],
        ["Grouped settings", "`@ConfigurationProperties(prefix = \"shop\") record …`"],
        ["Validate", "`@Validated` + `@NotBlank`, `@Min` …"],
        ["Env var name", "`shop.max-items` → `SHOP_MAXITEMS`"],
        ["Extra files", "`spring.config.import=optional:file:./secrets.properties`"],
        ["K8s mounted files", "`spring.config.import=configtree:/etc/config/`"]],
      cards: [
        { title: "Precedence (high → low)", items: ["Command line", "System properties", "Env vars", "Profile files", "Base files", "@PropertySource", "Defaults"] },
        { title: "Secrets", items: ["Never in Git", "Env vars / mounted files", "Vault or cloud manager", "Mask, don't log", "Rotate per environment"] },
        { title: "Say in interviews", items: ["Twelve-factor config", "Per-key precedence", "Relaxed binding", "Profiles for environments, flags for features", "Validate at startup"] }]
    },
    practice: [
      { level: "Easy", q: "What are Spring profiles and how do you activate them?",
        a: ["Named sets of configuration and beans for an environment or variant.",
          "Activate via spring.profiles.active (property, --arg, SPRING_PROFILES_ACTIVE env var) or programmatically.",
          "Effects: application-{profile} files load on top, on-profile documents apply, @Profile beans register.",
          "spring.profiles.group bundles several; the 'default' profile applies when none is active."] },
      { level: "Easy", q: "Bind shop settings into a record with defaults and print them.",
        a: ["Annotate a record with @ConfigurationProperties(prefix = \"shop\").",
          "Use @DefaultValue for defaults.",
          "Enable it with @EnableConfigurationProperties and inject it."],
        code: `@ConfigurationProperties(prefix = "shop")
record Shop(String name, @DefaultValue("INR") String currency, @DefaultValue("30s") Duration sessionTimeout) { }
@SpringBootApplication @EnableConfigurationProperties(Shop.class) class App { }
try (var ctx = SpringApplication.run(App.class, "--shop.name=Dosa Corner")) {
    System.out.println(ctx.getBean(Shop.class));
}` },
      { level: "Easy", q: "List the main property sources in precedence order.",
        a: ["Command-line args.",
          "SPRING_APPLICATION_JSON, then Java system properties (-D).",
          "OS environment variables.",
          "Profile-specific files (outside the jar, then inside), then application files (outside, then inside).",
          "@PropertySource, then default properties."] },
      { level: "Medium", q: "@Value vs @ConfigurationProperties: when do you use each?",
        a: ["@Value: one-off values, SpEL expressions, quick defaults.",
          "@ConfigurationProperties: groups of related settings, nesting, lists/maps, Duration/DataSize, relaxed binding, validation, IDE metadata, easy testing.",
          "Large codebases standardise on @ConfigurationProperties to keep keys discoverable."] },
      { level: "Medium", q: "Make the application refuse to start if the payment URL is missing or the timeout is out of range.",
        a: ["@Validated on the properties type.",
          "@NotBlank on the URL, @Min/@Max on the timeout; no defaults for required values.",
          "Binding fails with a clear message listing each violation."],
        code: `@ConfigurationProperties(prefix = "pay") @Validated
record PayProps(@NotBlank String url, @Min(1) @Max(10) int timeoutSeconds) { }
@SpringBootApplication @EnableConfigurationProperties(PayProps.class) class App { }
for (String[] a : new String[][] { { "--pay.url=https://pay.example", "--pay.timeout-seconds=3" }, { "--pay.timeout-seconds=60" } }) {
    try (var ctx = SpringApplication.run(App.class, a)) { System.out.println("started with " + ctx.getBean(PayProps.class)); }
    catch (Exception e) { System.out.println("refused to start: invalid pay.* configuration"); }
}` },
      { level: "Medium", q: "How should secrets be managed in a Spring Boot application?",
        a: ["Never commit them; scan repos for leaks.",
          "Provide via env vars or mounted files (Kubernetes Secrets with configtree:), or fetch from Vault / a cloud secret manager via spring.config.import.",
          "Restrict and mask: Actuator masks sensitive keys; never log values.",
          "Separate per environment, rotate regularly, prefer short-lived dynamic credentials where available."] },
      { level: "Medium", q: "Show that @Profile selects between two implementations.",
        a: ["Two beans implement an interface, one @Profile(\"!prod\"), one @Profile(\"prod\").",
          "Start the app with each profile and inspect which bean was injected."],
        code: `interface Storage { String where(); }
@Component @Profile("!prod") class LocalDisk implements Storage { public String where() { return "local disk"; } }
@Component @Profile("prod") class S3 implements Storage { public String where() { return "S3 bucket"; } }
@SpringBootApplication class App { }
for (String p : List.of("test", "prod")) {
    try (var ctx = SpringApplication.run(App.class, "--spring.profiles.active=" + p)) { System.out.println(p + " → " + ctx.getBean(Storage.class).where()); }
}` },
      { level: "Hard", q: "A production service uses the wrong database pool size. How do you investigate?",
        a: ["Query /actuator/env/spring.datasource.hikari.maximum-pool-size: shows every source defining it and the winner.",
          "Check active profiles (/actuator/env shows them) and profile files.",
          "Look for env vars in the Deployment (SPRING_DATASOURCE_HIKARI_MAXIMUMPOOLSIZE), -D flags, command-line args, an external config/application.yml.",
          "Check /actuator/configprops for the bound value and HikariCP metrics for the runtime value.",
          "Fix at the right layer and document ownership of each setting."] },
      { level: "Hard", q: "Design configuration for a service deployed to dev, staging and prod on Kubernetes.",
        steps: ["application.yml holds safe defaults common to all; no secrets.",
          "Per-environment differences via SPRING_PROFILES_ACTIVE and small application-{env}.yml files or ConfigMaps (configtree:).",
          "Secrets from Kubernetes Secrets or Vault; never in images or Git.",
          "@ConfigurationProperties with @Validated for every group so bad config fails at startup.",
          "Feature flags as properties (or a flag service), observability of effective config via secured Actuator endpoints."] },
      { level: "Hard", q: "Explain relaxed binding and how it affects environment variables and @Value.",
        a: ["Boot normalises names: kebab-case (canonical), camelCase, underscore and uppercase env forms all bind to the same property for @ConfigurationProperties.",
          "Env vars: replace '.' with '_', remove '-', uppercase; lists as _0_, maps via the key segment.",
          "@Value supports relaxed binding only partially; reference the canonical kebab-case name.",
          "Prefer @ConfigurationProperties when values come from env vars."] }
    ],
    recap: [
      "Configuration comes from ordered property sources merged into the Environment; higher sources win per key.",
      "Command line > -D > env vars > profile files > application files > @PropertySource > defaults.",
      "Profiles add files, documents and @Profile beans; use them for environments.",
      "Prefer validated @ConfigurationProperties records over scattered @Value.",
      "Keep secrets out of Git; use env vars, mounted files or a secrets manager."
    ]
  });
})();
