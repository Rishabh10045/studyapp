/* Lesson S10: Actuator & observability */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded from a real Spring Boot 3.4.1 app ("orders") on a random port: actuator + Micrometer Prometheus registry +
  // Micrometer Tracing (OpenTelemetry bridge), a custom HealthIndicator, custom Counter/Timer/Gauge, and a security chain
  // (health/info/prometheus public, the rest ROLE_OPS). 20 POST /orders (each calls GET /prices over HTTP) and 6 GET /orders/{id}
  // (4 of them throw) were sent first. Bodies are the real responses (long lists trimmed).
  var REC = {"reqs":{"index":{"req":"GET /actuator","status":200,"body":"{\n \"_links\": [\n  \"self\",\n  \"prometheus\",\n  \"beans\",\n  \"health\",\n  \"health-path\",\n  \"info\",\n  \"env\",\n  \"env-toMatch\",\n  \"\\u2026 4 more\"\n ]\n}"},"health":{"req":"GET /actuator/health","status":200,"body":"{\n \"status\": \"UP\",\n \"groups\": [\n  \"liveness\",\n  \"readiness\"\n ],\n \"components\": {\n  \"db\": {\n   \"status\": \"UP\",\n   \"details\": {\n    \"database\": \"H2\",\n    \"validationQuery\": \"isValid()\"\n   }\n  },\n  \"diskSpace\": {\n   \"status\": \"UP\",\n   \"details\": {\n    \"total\": 136793825280,\n    \"free\": 129814982656,\n    \"threshold\": 10485760,\n    \"path\": \"/tmp/sp10/.\",\n    \"exists\": true\n   }\n  },\n  \"livenessState\": {\n   \"status\": \"UP\"\n  },\n  \"paymentGateway\": {\n   \"status\": \"UP\",\n   \"details\": {\n    \"latencyMs\": 42,\n    \"provider\": \"razorpay-sandbox\"\n   }\n  },\n  \"ping\": {\n   \"status\": \"UP\"\n  },\n  \"readinessState\": {\n   \"status\": \"UP\"\n  },\n  \"ssl\": {\n   \"status\": \"UP\",\n   \"details\": {\n    \"validChains\": [],\n    \"invalidChains\": []\n   }\n  }\n }\n}"},"liveness":{"req":"GET /actuator/health/liveness","status":200,"body":"{\n \"status\": \"UP\"\n}"},"readiness":{"req":"GET /actuator/health/readiness","status":200,"body":"{\n \"status\": \"UP\",\n \"components\": {\n  \"db\": {\n   \"status\": \"UP\",\n   \"details\": {\n    \"database\": \"H2\",\n    \"validationQuery\": \"isValid()\"\n   }\n  },\n  \"paymentGateway\": {\n   \"status\": \"UP\",\n   \"details\": {\n    \"latencyMs\": 42,\n    \"provider\": \"razorpay-sandbox\"\n   }\n  },\n  \"readinessState\": {\n   \"status\": \"UP\"\n  }\n }\n}"},"info":{"req":"GET /actuator/info","status":200,"body":"{\n \"app\": {\n  \"version\": \"1.4.2\",\n  \"team\": \"checkout\"\n }\n}"},"envanon":{"req":"GET /actuator/env/payment.api-key","status":401,"body":"{\n \"timestamp\": \"2026-11-12T08:42:03.042+00:00\",\n \"status\": 401,\n \"error\": \"Unauthorized\",\n \"path\": \"/actuator/env/payment.api-key\"\n}"},"env":{"req":"GET /actuator/env/payment.api-key","status":200,"body":"{\n \"property\": {\n  \"source\": \"defaultProperties\",\n  \"value\": \"sk_live_51H8xyz\"\n },\n \"propertySources\": [\n  \"\\u2026 10 sources\"\n ]\n}"},"metricslist":{"req":"GET /actuator/metrics","status":200,"body":"{\n \"names\": [\n  \"application.ready.time\",\n  \"application.started.time\",\n  \"disk.free\",\n  \"disk.total\",\n  \"executor.active\",\n  \"executor.completed\",\n  \"executor.pool.core\",\n  \"executor.pool.max\",\n  \"\\u2026 93 more\"\n ]\n}"},"httpreq":{"req":"GET /actuator/metrics/http.server.requests","status":200,"body":"{\n \"name\": \"http.server.requests\",\n \"baseUnit\": \"seconds\",\n \"measurements\": [\n  {\n   \"statistic\": \"COUNT\",\n   \"value\": 54.0\n  },\n  {\n   \"statistic\": \"TOTAL_TIME\",\n   \"value\": 1.50489435\n  },\n  {\n   \"statistic\": \"MAX\",\n   \"value\": 0.306798336\n  }\n ],\n \"availableTags\": [\n  {\n   \"tag\": \"exception\",\n   \"values\": [\n    \"NoSuchElementException\",\n    \"none\"\n   ]\n  },\n  {\n   \"tag\": \"method\",\n   \"values\": [\n    \"POST\",\n    \"GET\"\n   ]\n  },\n  {\n   \"tag\": \"error\",\n   \"values\": [\n    \"NoSuchElementException\",\n    \"none\"\n   ]\n  },\n  {\n   \"tag\": \"uri\",\n   \"values\": [\n    \"/orders\",\n    \"/orders/{id}\",\n    \"/actuator\",\n    \"/actuator/info\",\n    \"/actuator/health\",\n    \"/actuator/env/{toMatch}\",\n    \"/actuator/health/**\",\n    \"/prices/{item}\",\n    \"\\u2026 1 more\"\n   ]\n  },\n  {\n   \"tag\": \"outcome\",\n   \"values\": [\n    \"CLIENT_ERROR\",\n    \"SUCCESS\",\n    \"SERVER_ERROR\"\n   ]\n  },\n  {\n   \"tag\": \"status\",\n   \"values\": [\n    \"500\",\n    \"401\",\n    \"200\"\n   ]\n  }\n ]\n}"},"httpreq404":{"req":"GET /actuator/metrics/http.server.requests?tag=uri:/orders/%7Bid%7D&tag=status:500","status":200,"body":"{\n \"name\": \"http.server.requests\",\n \"baseUnit\": \"seconds\",\n \"measurements\": [\n  {\n   \"statistic\": \"COUNT\",\n   \"value\": 4.0\n  },\n  {\n   \"statistic\": \"TOTAL_TIME\",\n   \"value\": 0.010717355\n  },\n  {\n   \"statistic\": \"MAX\",\n   \"value\": 0.005501001\n  }\n ],\n \"availableTags\": [\n  {\n   \"tag\": \"exception\",\n   \"values\": [\n    \"NoSuchElementException\"\n   ]\n  },\n  {\n   \"tag\": \"method\",\n   \"values\": [\n    \"GET\"\n   ]\n  },\n  {\n   \"tag\": \"error\",\n   \"values\": [\n    \"NoSuchElementException\"\n   ]\n  },\n  {\n   \"tag\": \"outcome\",\n   \"values\": [\n    \"SERVER_ERROR\"\n   ]\n  }\n ]\n}"},"placed":{"req":"GET /actuator/metrics/orders.placed","status":200,"body":"{\n \"name\": \"orders.placed\",\n \"description\": \"orders placed\",\n \"measurements\": [\n  {\n   \"statistic\": \"COUNT\",\n   \"value\": 20.0\n  }\n ],\n \"availableTags\": [\n  {\n   \"tag\": \"channel\",\n   \"values\": [\n    \"app\"\n   ]\n  }\n ]\n}"},"pricing":{"req":"GET /actuator/metrics/orders.pricing","status":200,"body":"{\n \"name\": \"orders.pricing\",\n \"baseUnit\": \"seconds\",\n \"measurements\": [\n  {\n   \"statistic\": \"COUNT\",\n   \"value\": 20.0\n  },\n  {\n   \"statistic\": \"TOTAL_TIME\",\n   \"value\": 0.645478378\n  },\n  {\n   \"statistic\": \"MAX\",\n   \"value\": 0.234981992\n  }\n ],\n \"availableTags\": []\n}"},"prom":{"req":"GET /actuator/prometheus","status":200,"body":"http_server_requests_seconds_count{error=\"NoSuchElementException\",exception=\"NoSuchElementException\",method=\"GET\",outcome=\"SERVER_ERROR\",status=\"500\",uri=\"/orders/{id}\"} 4\nhttp_server_requests_seconds_count{error=\"none\",exception=\"none\",method=\"GET\",outcome=\"SUCCESS\",status=\"200\",uri=\"/orders/{id}\"} 2\nhttp_server_requests_seconds_count{error=\"none\",exception=\"none\",method=\"POST\",outcome=\"SUCCESS\",status=\"200\",uri=\"/orders\"} 20\n# HELP orders_placed_total orders placed\n# TYPE orders_placed_total counter\norders_placed_total{channel=\"app\"} 20.0\n# HELP orders_pricing_seconds  \n# TYPE orders_pricing_seconds summary\norders_pricing_seconds{quantile=\"0.5\"} 0.022544384\norders_pricing_seconds{quantile=\"0.95\"} 0.02883584\norders_pricing_seconds_count 20\norders_pricing_seconds_sum 0.645478378\n# HELP orders_pricing_seconds_max  \n# TYPE orders_pricing_seconds_max gauge\norders_pricing_seconds_max 0.234981992\n# HELP orders_queue_size  \n# TYPE orders_queue_size gauge\norders_queue_size 3.0"},"logger":{"req":"GET /actuator/loggers/demo","status":200,"body":"{\n \"configuredLevel\": \"INFO\",\n \"effectiveLevel\": \"INFO\"\n}"},"setlogger":{"req":"POST /actuator/loggers/demo {\"configuredLevel\":\"DEBUG\"}","status":204,"body":""},"logger2":{"req":"GET /actuator/loggers/demo","status":200,"body":"{\n \"configuredLevel\": \"DEBUG\",\n \"effectiveLevel\": \"DEBUG\"\n}"},"health_down":{"req":"GET /actuator/health","status":503,"body":"{\n \"status\": \"DOWN\",\n \"groups\": [\n  \"liveness\",\n  \"readiness\"\n ],\n \"components\": {\n  \"db\": {\n   \"status\": \"UP\",\n   \"details\": {\n    \"database\": \"H2\",\n    \"validationQuery\": \"isValid()\"\n   }\n  },\n  \"diskSpace\": {\n   \"status\": \"UP\",\n   \"details\": {\n    \"total\": 136793825280,\n    \"free\": 129814937600,\n    \"threshold\": 10485760,\n    \"path\": \"/tmp/sp10/.\",\n    \"exists\": true\n   }\n  },\n  \"livenessState\": {\n   \"status\": \"UP\"\n  },\n  \"paymentGateway\": {\n   \"status\": \"DOWN\",\n   \"details\": {\n    \"error\": \"connect timed out after 2000 ms\"\n   }\n  },\n  \"ping\": {\n   \"status\": \"UP\"\n  },\n  \"readinessState\": {\n   \"status\": \"UP\"\n  },\n  \"ssl\": {\n   \"status\": \"UP\",\n   \"details\": {\n    \"validChains\": [],\n    \"invalidChains\": []\n   }\n  }\n }\n}"},"readiness_down":{"req":"GET /actuator/health/readiness","status":503,"body":"{\n \"status\": \"DOWN\",\n \"components\": {\n  \"db\": {\n   \"status\": \"UP\",\n   \"details\": {\n    \"database\": \"H2\",\n    \"validationQuery\": \"isValid()\"\n   }\n  },\n  \"paymentGateway\": {\n   \"status\": \"DOWN\",\n   \"details\": {\n    \"error\": \"connect timed out after 2000 ms\"\n   }\n  },\n  \"readinessState\": {\n   \"status\": \"UP\"\n  }\n }\n}"},"liveness_down":{"req":"GET /actuator/health/liveness","status":200,"body":"{\n \"status\": \"UP\"\n}"},"liveness_broken":{"req":"GET /actuator/health/liveness","status":503,"body":"{\n \"status\": \"DOWN\"\n}"}},"trace":[["o-auto-1-exec-1","100261b88ba358a0e148e7923a2c2f23","6f1d45804f9e67a4","placing order"],["o-auto-1-exec-2","100261b88ba358a0e148e7923a2c2f23","d0260eb86522057b","pricing dosa (incoming traceparent=00-100261b88ba358a0e148e7923a2c2f23-326baa4f7bb4e933-01)"]]};
  var EP = [
    { k: "index", g: "Discover", label: "/actuator", why: "The **discovery** page lists every endpoint that is both enabled and **exposed** over HTTP. Only `health` is exposed by default; here `management.endpoints.web.exposure.include` adds the rest." },
    { k: "health", g: "Health", label: "health", why: "Aggregated **health**: every `HealthIndicator` (DB, disk, our custom `paymentGateway`) plus probe groups. The overall status is the worst component. `show-details=always` is for demos; in production use `when-authorized`." },
    { k: "liveness", g: "Health", label: "liveness", why: "**Liveness** = *is the process healthy, or should Kubernetes restart it?* It reflects only the app's internal `LivenessState`, never external systems." },
    { k: "readiness", g: "Health", label: "readiness", why: "**Readiness** = *should this pod receive traffic?* We included `db` and `paymentGateway` in the readiness group, so a dependency outage takes the pod out of the load balancer without restarting it." },
    { k: "health_down", g: "Outage", label: "gateway down: health", why: "The custom indicator now reports DOWN, so the aggregate is **DOWN with HTTP 503**, which a load balancer or monitor can act on." },
    { k: "readiness_down", g: "Outage", label: "gateway down: readiness", why: "Readiness is **503**: Kubernetes stops sending traffic to this pod until the gateway recovers." },
    { k: "liveness_down", g: "Outage", label: "gateway down: liveness", why: "Liveness stays **UP (200)**. Correct: restarting the pod would not fix the payment provider, and restarting every pod at once would turn an outage into a disaster." },
    { k: "liveness_broken", g: "Outage", label: "app publishes BROKEN", why: "The app published `AvailabilityChangeEvent.publish(ctx, LivenessState.BROKEN)` (e.g. a fatal internal state): liveness becomes **503**, and Kubernetes would restart the container." },
    { k: "info", g: "Info & env", label: "info", why: "Static app information from `info.*` properties (enable with `management.info.env.enabled`), plus build and git info if you generate `build-info`/`git.properties`." },
    { k: "envanon", g: "Info & env", label: "env (anonymous)", why: "Our chain only allows health, info and prometheus without login, so `/actuator/env` returns **401**. Never expose env, beans, heapdump or loggers publicly." },
    { k: "env", g: "Info & env", label: "env (as OPS)", why: "As an authorised OPS user with `show-values=WHEN_AUTHORIZED`, the secret is visible in clear text. That's why access control matters: by default (`NEVER`) Boot 3 shows `******` for every value." },
    { k: "metricslist", g: "Metrics", label: "metrics", why: "Every meter Micrometer knows: JVM, GC, threads, Hikari pool, Tomcat, HTTP server/client and our custom `orders.*` meters." },
    { k: "httpreq", g: "Metrics", label: "http.server.requests", why: "One **timer** for all HTTP requests, with **tags** (`uri`, `method`, `status`, `outcome`, `exception`). The `uri` tag is the *template* (`/orders/{id}`), which keeps cardinality bounded." },
    { k: "httpreq404", g: "Metrics", label: "…filtered: /orders/{id} 500", why: "Drill down with `?tag=uri:/orders/{id}&tag=status:500`: exactly the **4** requests that threw `NoSuchElementException`." },
    { k: "placed", g: "Metrics", label: "orders.placed (custom)", why: "A business **Counter** registered with `Counter.builder(\"orders.placed\").tag(\"channel\", \"app\")`: 20 orders." },
    { k: "pricing", g: "Metrics", label: "orders.pricing (custom)", why: "A **Timer** around the downstream pricing call: count, total time and max." },
    { k: "prom", g: "Metrics", label: "prometheus", why: "The same meters in **Prometheus** text format for scraping: dots become underscores, counters get `_total`, timers become `_count`/`_sum`/`_max` plus the percentiles we asked for." },
    { k: "logger", g: "Loggers", label: "loggers/demo", why: "Current level of the `demo` logger." },
    { k: "setlogger", g: "Loggers", label: "POST level=DEBUG", why: "Change a log level **at runtime** without a restart (204 No Content). Very handy during incidents, so it must be protected." },
    { k: "logger2", g: "Loggers", label: "loggers/demo again", why: "Now DEBUG. The change is in-memory only and is lost on restart." }
  ];
  function s10Widget(el, ctx) {
    var s = ctx.state; if (!s.k) s.k = "readiness_down";
    var groups = []; EP.forEach(function (x) { if (groups.indexOf(x.g) < 0) groups.push(x.g); });
    el.innerHTML = groups.map(function (g) { return "<div style='font-size:12px;color:#64748b;margin-top:6px'>" + g + "</div><div class='btnrow'>" + EP.filter(function (x) { return x.g === g; }).map(function (x) { return "<button type='button' class='btn' data-k='" + x.k + "'>" + x.label + "</button>"; }).join("") + "</div>"; }).join("") +
      "<div data-r='out' style='margin-top:10px'></div>" +
      "<div style='margin-top:12px'><b>Tracing:</b> one POST /orders, as logged by the app (Micrometer Tracing puts <code>[traceId-spanId]</code> in every log line):</div><pre class='code' style='white-space:pre-wrap;font-size:12px'>" +
      REC.trace.map(function (t) { return "[" + t[0] + "] [" + t[1] + "-" + t[2] + "] " + t[3]; }).map(ctx.esc).join("\n") + "</pre>" +
      "<div class='result'>" + ctx.md("Two different threads and two different HTTP requests, but the **same traceId**: `RestClient` sent a W3C `traceparent` header, and the pricing endpoint continued the trace with a new span. Search your logs for one traceId and you see the whole request across services.") + "</div>";
    var out = el.querySelector("[data-r='out']");
    function draw() {
      var x = EP.filter(function (y) { return y.k === s.k; })[0], r = REC.reqs[x.k];
      el.querySelectorAll("button[data-k]").forEach(function (b) { b.classList.toggle("primary", b.dataset.k === s.k); });
      var col = r.status < 300 ? "#166534" : "#b91c1c";
      out.innerHTML = "<div style='display:flex;gap:10px;align-items:center'><code>" + ctx.esc(r.req) + "</code><span style='font-size:22px;font-weight:700;color:" + col + "'>" + r.status + "</span></div>" +
        "<pre class='code' style='white-space:pre-wrap;font-size:12px;max-height:340px;overflow:auto'>" + ctx.esc(r.body || "(empty body)") + "</pre><div class='result'>" + ctx.md(x.why) + "</div>";
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (!b) return; s.k = b.dataset.k; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Spring Boot Actuator: production endpoints",
      text: "Writing a service is half the job; **running** it needs answers to *is it up?*, *how is it performing?* and *what is it configured with?*. Actuator adds **endpoints** for exactly that: `health`, `info`, `metrics`, `prometheus`, `loggers`, `env`, `beans`, `threaddump`, `heapdump` and more. An endpoint must be **enabled** (most are) and **exposed**: over HTTP only `health` is exposed by default, so you opt in with `management.endpoints.web.exposure.include` (an endpoint that is not exposed anywhere is not even created as a bean). Endpoints are also plain beans you can call in code, which is what this snippet does (no web server needed).",
      table: [["Endpoint", "Use", "Expose publicly?"],
        ["health (+ liveness/readiness)", "load balancers, Kubernetes probes", "yes (no details)"],
        ["info", "version, git commit, build", "usually"],
        ["metrics / prometheus", "dashboards, alerts", "prometheus to the scraper only"],
        ["loggers", "change log levels at runtime", "no"],
        ["env, configprops, beans", "debugging configuration", "no"],
        ["threaddump, heapdump", "incident analysis", "never"]],
      code: `@SpringBootApplication class App { }
var ctx = new SpringApplicationBuilder(App.class).properties("management.endpoints.web.exposure.include=health,info,metrics", "info.app.version=2.1.0", "management.info.env.enabled=true", "management.endpoint.health.show-details=always").run();
HealthEndpoint health = ctx.getBean(HealthEndpoint.class);
System.out.println("health: " + health.health().getStatus());
var info = ctx.getBean(org.springframework.boot.actuate.info.InfoEndpoint.class).info();
System.out.println("info  : " + info);
var metrics = ctx.getBean(org.springframework.boot.actuate.metrics.MetricsEndpoint.class);
System.out.println("meters: " + metrics.listNames().getNames().size() + " e.g. " + metrics.listNames().getNames().stream().filter(n -> n.startsWith("jvm.memory")).toList());
ctx.close();`,
      analogy: "Actuator is the dashboard and diagnostic port of a car: speed, fuel and warning lights for the driver, plus an OBD socket only the mechanic should plug into." },
    { title: "Health indicators",
      text: "`/actuator/health` aggregates **`HealthIndicator`** beans: Boot auto-registers them for the DataSource, disk space, Redis, Kafka, mail and more. Add your own for critical dependencies by implementing `HealthIndicator`; the bean name minus `HealthIndicator` becomes the component name. The overall status is the **worst** component (DOWN beats OUT_OF_SERVICE beats UP), and DOWN maps to **HTTP 503**. Keep checks **cheap and time-bounded** (they run on every probe), and decide carefully which dependencies should make you unhealthy: a non-critical recommendation service shouldn't take checkout down.",
      code: `@Component class PaymentGatewayHealthIndicator implements HealthIndicator {
    static volatile boolean reachable = true;
    public Health health() {
        return reachable ? Health.up().withDetail("latencyMs", 38).build() : Health.down().withDetail("error", "connect timed out").build();
    }
}
@SpringBootApplication class App { }
var ctx = new SpringApplicationBuilder(App.class).properties("management.endpoint.health.show-details=always").run();
HealthEndpoint health = ctx.getBean(HealthEndpoint.class);
System.out.println("component: " + health.healthForPath("paymentGateway").getStatus() + "  overall: " + health.health().getStatus());
PaymentGatewayHealthIndicator.reachable = false;
var hc = health.health();
System.out.println("component: " + health.healthForPath("paymentGateway").getStatus() + "  overall: " + hc.getStatus());
var mapper = ctx.getBean(org.springframework.boot.actuate.health.HttpCodeStatusMapper.class);
System.out.println("HTTP status for " + hc.getStatus() + ": " + mapper.getStatusCode(hc.getStatus()));
ctx.close();`,
      analogy: "Health indicators are a hospital's vital-sign monitors: each measures one thing, and the overall alarm goes off if any critical one does." },
    { title: "Liveness vs readiness probes",
      text: "Kubernetes asks two different questions. **Liveness**: is the process broken beyond repair? If it fails, the container is **restarted**. **Readiness**: can it serve traffic right now? If it fails, the pod is **removed from the Service** until it recovers. Boot exposes both as `/actuator/health/liveness` and `/readiness` (auto-enabled on Kubernetes, or `management.endpoint.health.probes.enabled=true`), driven by `ApplicationAvailability`. Readiness is REFUSING_TRAFFIC during startup and graceful shutdown. Golden rule: **never put external dependencies in liveness**, or a database blip restarts your whole fleet.",
      m: M(["flowchart LR",
        "  K[\"kubelet\"]:::s1 -->|/health/liveness| L{\"live?\"}:::s2",
        "  L -->|no| R[\"restart container\"]:::s3",
        "  K -->|/health/readiness| D{\"ready?\"}:::s2",
        "  D -->|no| O[\"remove from Service<br/>no traffic\"]:::s3",
        "  D -->|yes| T[\"receives traffic\"]:::s4",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#fff3e0,stroke:#ef6c00", "  classDef s3 fill:#ffebee,stroke:#c62828", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `@SpringBootApplication class App { }
var ctx = new SpringApplicationBuilder(App.class).properties("management.endpoint.health.probes.enabled=true").run();
ApplicationAvailability avail = ctx.getBean(ApplicationAvailability.class);
HealthEndpoint health = ctx.getBean(HealthEndpoint.class);
Runnable show = () -> System.out.printf("liveness=%-7s readiness=%-17s probes: live %s, ready %s%n", avail.getLivenessState(), avail.getReadinessState(),
    health.healthForPath("liveness").getStatus(), health.healthForPath("readiness").getStatus());
show.run();
AvailabilityChangeEvent.publish(ctx, ReadinessState.REFUSING_TRAFFIC);    // e.g. warming caches, or draining before shutdown
show.run();
AvailabilityChangeEvent.publish(ctx, ReadinessState.ACCEPTING_TRAFFIC);
AvailabilityChangeEvent.publish(ctx, LivenessState.BROKEN);                // unrecoverable internal state
show.run();
ctx.close();`,
      analogy: "Liveness asks 'is the shop on fire?' (call the fire brigade, rebuild). Readiness asks 'is the shop open?' (customers wait outside while shelves are restocked)." },
    { title: "Exposing and securing Actuator",
      text: "Actuator endpoints reveal configuration, secrets, internals, and some change behaviour (loggers, shutdown). Expose only what you need, and protect the rest: put health/info/prometheus on a public matcher and everything else behind a role (`EndpointRequest.toAnyEndpoint()`), or move management to a **separate port** (`management.server.port=8081`) reachable only inside the cluster. Since Boot 3, `env` and `configprops` mask **all values** by default (`show-values=NEVER`); `WHEN_AUTHORIZED` reveals them to authorised users, as the widget showed with an API key. Health details should be `when-authorized` too.",
      code: `management:
  server:
    port: 8081                      # actuator on an internal-only port
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,loggers
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true
      group:
        readiness:
          include: readinessState,db
    env:
      show-values: never
---
# SecurityFilterChain:
# .requestMatchers(EndpointRequest.to("health", "info", "prometheus")).permitAll()
# .requestMatchers(EndpointRequest.toAnyEndpoint()).hasRole("OPS")`, lang: "yaml", noCompile: true,
      analogy: "The shop window shows opening hours (health, info); the stockroom and the safe (env, heapdump) need a staff key." },
    { title: "Micrometer: dimensional metrics",
      text: "Micrometer is to metrics what SLF4J is to logging: one API, many backends (Prometheus, Datadog, CloudWatch, OTLP). A meter has a **name** and **tags** (dimensions), so one `http.server.requests` timer can be sliced by uri, status and method. Core types: **Counter** (only goes up: orders placed), **Timer** (count, total, max and optionally percentiles: latency), **Gauge** (a current value sampled on read: queue size, pool usage) and **DistributionSummary** (sizes, amounts). Boot auto-instruments HTTP server/client, JVM, GC, thread pools, Hikari, caches and more; you add **business** metrics.",
      code: `MeterRegistry reg = new SimpleMeterRegistry();
Counter placed = Counter.builder("orders.placed").tag("channel", "app").register(reg);
Timer pricing = Timer.builder("orders.pricing").register(reg);
Queue<String> kitchen = new ConcurrentLinkedQueue<>();
Gauge.builder("kitchen.queue.size", kitchen, Queue::size).register(reg);
DistributionSummary amount = DistributionSummary.builder("orders.amount").baseUnit("inr").register(reg);
for (int i = 1; i <= 5; i++) {
    final int n = i;
    pricing.record(() -> { try { Thread.sleep(10 * n); } catch (InterruptedException e) { } });
    placed.increment(); kitchen.add("order-" + i); amount.record(100 * i);
}
kitchen.poll();
System.out.println("orders.placed  = " + placed.count());
System.out.printf("orders.pricing = count %d, mean %.0f ms, max %.0f ms%n", pricing.count(), pricing.mean(TimeUnit.MILLISECONDS), pricing.max(TimeUnit.MILLISECONDS));
System.out.println("kitchen.queue  = " + reg.get("kitchen.queue.size").gauge().value() + " (read at scrape time)");
System.out.println("orders.amount  = total " + amount.totalAmount() + " INR over " + amount.count());`,
      analogy: "Counters are a tally clicker, gauges a fuel needle, timers a stopwatch that also remembers every lap." },
    { title: "Prometheus: scraping and naming",
      text: "With `micrometer-registry-prometheus`, Boot exposes `/actuator/prometheus` in the text format that **Prometheus scrapes** every 15–30 s. Naming is converted: dots become underscores, units are appended (`_seconds`), counters get `_total`, timers become `_count`, `_sum` and `_max` series (plus `_bucket` histograms or quantiles if enabled). Grafana dashboards and alert rules then compute rates over time, e.g. `rate(http_server_requests_seconds_count{status=~\"5..\"}[5m])`. Add common tags like `application` so many services can share one Prometheus.",
      code: `var prom = new io.micrometer.prometheusmetrics.PrometheusMeterRegistry(io.micrometer.prometheusmetrics.PrometheusConfig.DEFAULT);
prom.config().commonTags("application", "orders");
Counter.builder("orders.placed").tag("channel", "app").register(prom).increment(3);
Timer t = Timer.builder("orders.pricing").publishPercentiles(0.95).register(prom);
for (int ms : new int[] { 12, 15, 18, 22, 90 }) t.record(Duration.ofMillis(ms));
prom.scrape().lines().filter(l -> l.startsWith("orders")).forEach(System.out::println);`,
      analogy: "Prometheus is a meter reader who visits every few seconds and writes down each meter; your app just keeps its meters readable." },
    { title: "Tags, cardinality, percentiles and histograms",
      text: "Every distinct combination of tag values is a separate **time series**, stored and queried by your monitoring system. Tags with **unbounded values** (user id, order id, raw URL, exception message) explode cardinality and can take down Prometheus or your bill. Use bounded values: URI *templates*, status codes, outcome. For latency, **client-side percentiles** (`publishPercentiles`) can't be aggregated across instances; **histograms** (`publishPercentileHistogram`, or `serviceLevelObjectives` buckets) can, which is what you want for fleet-wide p99 and SLO alerts. `MeterFilter`s can cap or rename tags centrally.",
      code: `MeterRegistry reg = new SimpleMeterRegistry();
for (int user = 0; user < 1000; user++) Counter.builder("logins").tag("user", "u" + user).register(reg).increment();   // bad: one series per user
for (int i = 0; i < 1000; i++) Counter.builder("logins.by.result").tag("result", i % 10 == 0 ? "failure" : "success").register(reg).increment();
System.out.println("series for logins{user}   : " + reg.find("logins").counters().size());
System.out.println("series for logins{result} : " + reg.find("logins.by.result").counters().size());
MeterRegistry capped = new SimpleMeterRegistry();
capped.config().meterFilter(io.micrometer.core.instrument.config.MeterFilter.maximumAllowableTags("logins", "user", 50, io.micrometer.core.instrument.config.MeterFilter.deny()));
for (int user = 0; user < 1000; user++) Counter.builder("logins").tag("user", "u" + user).register(capped).increment();
System.out.println("with maximumAllowableTags : " + capped.find("logins").counters().size() + " series (rest denied)");`,
      analogy: "Tagging metrics by user id is like opening a separate bank account for every coin you receive: technically possible, ruinous to manage." },
    { title: "The Observation API: instrument once",
      text: "Since Boot 3 / Micrometer 1.10, the **Observation API** wraps an operation once and lets **handlers** turn it into several signals: a timer (metrics), a span (tracing), log context. Boot's HTTP server, `RestClient`, `WebClient`, JDBC (with datasource-micrometer), Kafka and `@Scheduled` are already observed. For your code use `Observation.createNotStarted(name, registry).observe(...)` or `@Observed` on bean methods (needs the `ObservedAspect` bean). **Low-cardinality** key values become metric tags; **high-cardinality** ones (order id) go only to spans and logs.",
      code: `MeterRegistry meters = new SimpleMeterRegistry();
ObservationRegistry obs = ObservationRegistry.create();
obs.observationConfig().observationHandler(new io.micrometer.core.instrument.observation.DefaultMeterObservationHandler(meters));
obs.observationConfig().observationHandler(new io.micrometer.observation.ObservationHandler<Observation.Context>() {
    public void onStart(Observation.Context c) { System.out.println("start " + c.getName() + " " + c.getHighCardinalityKeyValues()); }
    public void onStop(Observation.Context c) { System.out.println("stop  " + c.getName() + " " + c.getLowCardinalityKeyValues()); }
    public boolean supportsContext(Observation.Context c) { return true; }
});
for (String id : List.of("A-17", "A-18"))
    Observation.createNotStarted("orders.checkout", obs).lowCardinalityKeyValue("payment", "upi").highCardinalityKeyValue("order.id", id)
        .observe(() -> { try { Thread.sleep(15); } catch (InterruptedException e) { } });
Timer t = meters.get("orders.checkout").timer();
System.out.println("timer from the same observation: count=" + t.count() + " tags=" + t.getId().getTags());`,
      analogy: "One CCTV camera feeding both the security desk (traces) and the footfall counter (metrics), instead of two separate installations." },
    { title: "Distributed tracing",
      text: "A **trace** follows one request across services; each unit of work is a **span** with a parent. The `traceId` travels in the **W3C `traceparent`** header (`00-<traceId>-<spanId>-01`), which Boot's instrumented `RestClient`/`WebClient`/Kafka add and read automatically once Micrometer Tracing (Brave or OpenTelemetry bridge) is on the classpath. Spans are exported to Zipkin, Jaeger, Tempo or an OTLP collector. **Sampling** (`management.tracing.sampling.probability`, default 0.1) controls cost. The trace and span ids are also put into the logging **MDC**, so every log line can be correlated, as in the widget.",
      m: M(["sequenceDiagram",
        "  participant C as Client",
        "  participant O as orders",
        "  participant P as pricing",
        "  C->>O: POST /orders",
        "  Note over O: span A (trace T)",
        "  O->>P: GET /prices, traceparent 00-T-A-01",
        "  Note over P: span B, parent A, trace T",
        "  P-->>O: 120",
        "  O-->>C: 200",
        "  O--)O: export spans to collector"]),
      code: `@SpringBootApplication class App { }
var ctx = new SpringApplicationBuilder(App.class).properties("management.tracing.sampling.probability=1.0").run();
io.micrometer.tracing.Tracer tracer = ctx.getBean(io.micrometer.tracing.Tracer.class);
var parent = tracer.nextSpan().name("checkout").start();
try (var ws = tracer.withSpan(parent)) {
    var child = tracer.nextSpan().name("price-lookup").start();
    System.out.println("parent: trace " + parent.context().traceId() + " span " + parent.context().spanId());
    System.out.println("child : trace " + child.context().traceId() + " span " + child.context().spanId() + " parent " + child.context().parentId());
    System.out.println("MDC traceId = " + MDC.get("traceId"));
    child.end();
} finally { parent.end(); }
System.out.println("tracer implementation: " + tracer.getClass().getSimpleName());
ctx.close();`,
      analogy: "A trace is a parcel's tracking number: every depot (service) scans it and adds its own entry, so you can see the whole journey and where it waited." },
    { title: "Structured logging and correlation",
      text: "Plain-text logs are for humans at a terminal; in production, logs are shipped to Loki, ELK or a cloud service and **queried**. Emit **structured (JSON)** logs so fields like level, logger, traceId and your own key-values are searchable without regex. Boot 3.4 has it built in: `logging.structured.format.console=ecs` (or `logstash`, `gelf`), or `StructuredLogEncoder` in your own `logback.xml`. Include the traceId (automatic with tracing) and business keys via MDC or SLF4J's fluent `addKeyValue`. Don't log secrets or full personal data, and keep log volume in check: logs are often the largest observability bill.",
      code: `@SpringBootApplication class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
// With Boot's default logging, one property is enough: logging.structured.format.console=ecs
// With your own logback.xml (as in this sandbox) you attach Boot's StructuredLogEncoder yourself:
var lc = (ch.qos.logback.classic.LoggerContext) LoggerFactory.getILoggerFactory();
var encoder = new org.springframework.boot.logging.logback.StructuredLogEncoder(); encoder.setFormat("ecs"); encoder.setContext(lc); encoder.start();
var console = new ch.qos.logback.core.ConsoleAppender<ch.qos.logback.classic.spi.ILoggingEvent>(); console.setEncoder(encoder); console.setContext(lc); console.start();
var checkout = lc.getLogger("demo.Checkout"); checkout.setLevel(ch.qos.logback.classic.Level.INFO); checkout.setAdditive(false); checkout.addAppender(console);
Logger log = LoggerFactory.getLogger("demo.Checkout");
MDC.put("orderId", "A-17");
log.atInfo().setMessage("payment captured").addKeyValue("amountInr", 540).addKeyValue("method", "upi").log();
MDC.clear();
ctx.close();`,
      analogy: "Structured logs are a filled-in form instead of a handwritten letter: a machine can instantly find every form where amount > 500." },
    { title: "From signals to SLOs and alerts",
      text: "Collecting data is pointless without decisions. For request-driven services watch **RED**: Rate, Errors, Duration (p95/p99); for resources watch **USE**: Utilisation, Saturation, Errors (CPU, pools, queues, GC). Define **SLOs** (e.g. 99.5% of checkouts succeed in under 300 ms over 30 days) and alert on **error-budget burn**, not on every spike. Dashboards per service, alerts that page only for user-visible impact, traces to find *where*, logs to find *why*. The snippet computes the RED numbers an alert rule would evaluate.",
      table: [["Signal", "Answers", "Tooling"],
        ["Metrics", "is something wrong? how much?", "Micrometer → Prometheus → Grafana/alerts"],
        ["Traces", "where is the time / error?", "Micrometer Tracing → OTLP → Tempo/Jaeger"],
        ["Logs", "why exactly?", "structured logs → Loki/ELK, joined by traceId"],
        ["Health/probes", "should it get traffic or restart?", "Actuator → Kubernetes"]],
      code: `MeterRegistry reg = new SimpleMeterRegistry();
Random rnd = new Random(7);
for (int i = 0; i < 2000; i++) {
    boolean error = rnd.nextInt(100) < 2;
    long ms = error ? 900 : 40 + (long) (Math.abs(rnd.nextGaussian()) * 80);
    Timer.builder("http.server.requests").tag("outcome", error ? "SERVER_ERROR" : "SUCCESS").publishPercentiles(0.95, 0.99).register(reg).record(Duration.ofMillis(ms));
}
Timer ok = reg.get("http.server.requests").tag("outcome", "SUCCESS").timer(), bad = reg.get("http.server.requests").tag("outcome", "SERVER_ERROR").timer();
double errorRate = 100.0 * bad.count() / (ok.count() + bad.count());
var pct = ok.takeSnapshot().percentileValues();
System.out.printf("rate: %d requests, errors: %.1f%%, p95: %.0f ms, p99: %.0f ms%n", ok.count() + bad.count(), errorRate, pct[0].value(TimeUnit.MILLISECONDS), pct[1].value(TimeUnit.MILLISECONDS));
System.out.println(errorRate > 0.5 ? "SLO (99.5% success) breached → page on-call" : "within SLO");`,
      analogy: "Metrics are the smoke alarm, traces the floor plan showing which room is burning, logs the forensic report of what caught fire." }
  ];

  H.registerLesson({
    code: "S10",
    summary: "Running a Spring Boot service, not just writing it: Actuator endpoints and how to expose and secure them, health indicators and custom checks, Kubernetes liveness vs readiness probes, Micrometer counters, timers, gauges and summaries, the Prometheus format, tag cardinality, percentiles vs histograms, the Observation API, distributed tracing with `traceparent` and trace ids in logs, structured JSON logging, and turning signals into SLOs and alerts.",
    slides: SLIDES,
    widget: { heading: "Interactive: an ops console for a real service", caption: "Responses recorded from a running Spring Boot 3.4 app after real traffic: health and probes (including a simulated payment-gateway outage), metrics with tags, the Prometheus scrape, runtime log levels, and trace ids propagated across an HTTP call.", render: s10Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Kubernetes rollout", "New pods only get traffic once `/actuator/health/readiness` is UP; during shutdown readiness flips to REFUSING_TRAFFIC so in-flight requests drain."],
      ["Incident", "The error-rate alert fires; the Grafana panel by `uri` shows `/payments/{id}` 5xx; a trace shows 3 s in the bank API; logs for that traceId show the timeout."],
      ["Business dashboard", "`orders.placed` by channel and `orders.amount` summaries drive a live sales dashboard without extra infrastructure."],
      ["Debugging in production", "Ops raises one logger to DEBUG for 10 minutes via `/actuator/loggers` instead of redeploying."],
      ["Cost incident", "A metric tagged with `userId` creates 2 million series and the Prometheus server runs out of memory."],
      ["Security finding", "A pen test finds `/actuator/env` and `/actuator/heapdump` exposed without authentication."]
    ],
    pitfalls: [
      "Exposing all actuator endpoints publicly (env, heapdump, loggers)",
      "External dependencies in the liveness probe (fleet-wide restarts)",
      "Slow, unbounded health checks run on every probe",
      "High-cardinality tags (user id, raw URLs, exception messages)",
      "Client-side percentiles you then try to average across instances",
      "No traceId in logs, so signals can't be correlated",
      "Sampling 100% of traces in high-traffic production",
      "Alerting on every spike instead of user-facing SLOs"
    ],
    quiz: [
      { q: "Which actuator endpoint is exposed over HTTP by default?", options: ["All", "health only", "health and info", "metrics"], answer: 1, why: "Others must be added to exposure.include." },
      { q: "In the widget the payment gateway is down. What does liveness return?", options: ["503 DOWN", "200 UP", "500", "404"], answer: 1, why: "External dependencies must not affect liveness." },
      { q: "What happens when readiness fails in Kubernetes?", options: ["The container restarts", "The pod is removed from the Service until ready", "The node is drained", "Nothing"], answer: 1, why: "Readiness controls traffic; liveness controls restarts." },
      { q: "Which meter type fits 'current number of items in a queue'?", options: ["Counter", "Gauge", "Timer", "LongTaskTimer"], answer: 1, why: "Sampled current value." },
      { q: "Why is the `uri` tag of http.server.requests `/orders/{id}` and not `/orders/42`?", options: ["Privacy", "To keep cardinality bounded", "Prometheus can't store numbers", "Bug"], answer: 1, why: "One series per template." },
      { q: "In the Prometheus format, a Counter named orders.placed becomes…", options: ["orders.placed", "orders_placed_total", "ordersPlaced", "orders_placed_count"], answer: 1, why: "Dots → underscores, counters get _total." },
      { q: "Which can be aggregated across instances for a fleet-wide p99?", options: ["publishPercentiles", "Histogram buckets (publishPercentileHistogram / SLO buckets)", "Gauge", "max"], answer: 1, why: "Client-side percentiles aren't aggregatable." },
      { q: "How does a traceId get from one service to the next over HTTP?", options: ["Cookie", "W3C traceparent header added by instrumented clients", "Query parameter", "It doesn't"], answer: 1, why: "Recorded: incoming traceparent carried the same traceId." },
      { q: "With Boot 3 defaults, what does /actuator/env show for property values?", options: ["Clear text", "****** masked (show-values=never)", "Nothing", "Only secrets"], answer: 1, why: "WHEN_AUTHORIZED or ALWAYS reveals them." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Config / code"],
        ["Expose endpoints", "`management.endpoints.web.exposure.include=health,info,prometheus`"],
        ["Health details", "`management.endpoint.health.show-details=when-authorized`"],
        ["Probes", "`management.endpoint.health.probes.enabled=true`"],
        ["Separate port", "`management.server.port=8081`"],
        ["Custom health", "`@Component class XHealthIndicator implements HealthIndicator`"],
        ["Counter / Timer", "`Counter.builder(\"x\").tag(..).register(reg)`, `timer.record(..)`"],
        ["Histograms", "`management.metrics.distribution.percentiles-histogram.http.server.requests=true`"],
        ["Tracing", "`micrometer-tracing-bridge-otel` + `management.tracing.sampling.probability=0.1`"],
        ["JSON logs", "`logging.structured.format.console=ecs`"]],
      cards: [
        { title: "Health", items: ["Indicators aggregate", "DOWN → 503", "Liveness: restart", "Readiness: traffic"] },
        { title: "Metrics", items: ["Counter, Timer, Gauge, Summary", "Bounded tags", "Histograms for SLOs", "Prometheus scrape"] },
        { title: "Say in interviews", items: ["RED and USE", "Liveness vs readiness", "Cardinality", "traceparent + MDC", "Securing actuator"] }]
    },
    practice: [
      { level: "Easy", q: "What are liveness and readiness probes and what should each check?",
        a: ["Liveness: is the app internally broken (deadlock, fatal state)? Failure → restart. Don't include external dependencies.",
          "Readiness: can it serve traffic now (started, warmed, critical dependencies reachable)? Failure → no traffic.",
          "Boot exposes both via ApplicationAvailability at /actuator/health/liveness and /readiness."] },
      { level: "Easy", q: "Write a custom HealthIndicator and read it through the HealthEndpoint.",
        a: ["Implement HealthIndicator as a @Component named XHealthIndicator.",
          "Return Health.up()/down() with details.",
          "It appears as component x."],
        code: `@Component class InventoryHealthIndicator implements HealthIndicator {
    public Health health() { return Health.up().withDetail("warehouses", 3).build(); }
}
@SpringBootApplication class App { }
var ctx = new SpringApplicationBuilder(App.class).properties("management.endpoint.health.show-details=always").run();
var h = ctx.getBean(HealthEndpoint.class).healthForPath("inventory");
System.out.println(h.getStatus() + " " + ((Health) h).getDetails());
ctx.close();` },
      { level: "Easy", q: "Count orders by payment method with Micrometer.",
        a: ["Counter with a bounded tag (payment method).",
          "Increment per order.",
          "Read back per tag."],
        code: `MeterRegistry reg = new SimpleMeterRegistry();
for (String m : List.of("upi", "card", "upi", "cod", "upi")) Counter.builder("orders.placed").tag("payment", m).register(reg).increment();
reg.find("orders.placed").counters().forEach(c -> System.out.println(c.getId().getTag("payment") + " = " + c.count()));` },
      { level: "Medium", q: "How would you secure Actuator in production?",
        a: ["Expose only needed endpoints (health, info, prometheus).",
          "Use a SecurityFilterChain with EndpointRequest: health/info public (no details), others require an ops role; or a separate management port reachable only internally.",
          "Keep env/configprops values masked; never expose heapdump/threaddump publicly; audit loggers changes."] },
      { level: "Medium", q: "Why are high-cardinality tags dangerous and how do you prevent them?",
        a: ["Each unique tag combination is a new time series kept in memory and storage by the monitoring backend.",
          "User ids, order ids, raw URLs or exception messages can create millions of series, causing OOM or huge bills.",
          "Use bounded values (templates, status, outcome), put ids in traces/logs, and add MeterFilters (maximumAllowableTags, deny)."] },
      { level: "Medium", q: "Time a block and read its mean and max.",
        a: ["Timer.record wraps a Runnable or Supplier.",
          "Timer exposes count, totalTime, max, mean.",
          "Use TimeUnit for reading."],
        code: `Timer t = Timer.builder("report.render").register(new SimpleMeterRegistry());
for (int i = 1; i <= 3; i++) { int n = i; t.record(() -> { try { Thread.sleep(20L * n); } catch (InterruptedException e) { } }); }
System.out.printf("count=%d mean=%.0fms max=%.0fms%n", t.count(), t.mean(TimeUnit.MILLISECONDS), t.max(TimeUnit.MILLISECONDS));` },
      { level: "Medium", q: "Explain how distributed tracing works in Spring Boot 3.",
        a: ["Micrometer Tracing (with a Brave or OpenTelemetry bridge) creates spans from Observations for HTTP, messaging, etc.",
          "Instrumented clients propagate context via the W3C traceparent header; servers continue the trace.",
          "Spans are exported (OTLP/Zipkin) subject to sampling; traceId/spanId go to the MDC for log correlation."] },
      { level: "Hard", q: "Design observability for a checkout service with a 99.5% / 300 ms SLO.",
        steps: ["Metrics: http.server.requests with histograms; business counters (orders, payment failures by provider); pool and queue gauges.",
          "SLO alerts: multi-window error-budget burn rate on success ratio and latency buckets ≤ 300 ms.",
          "Tracing: sampled spans for all inbound/outbound calls; tail-sampling errors in the collector.",
          "Logs: structured JSON with traceId and orderId; no PII; retention by level.",
          "Health: readiness includes DB and payment gateway; liveness only internal; dashboards per RED/USE."] },
      { level: "Hard", q: "A pod keeps restarting under load, though the app looks fine in logs. What might be wrong?",
        a: ["Liveness probe includes a slow or external check (DB) and times out under load → kubelet kills healthy pods.",
          "Probe timeouts/thresholds too strict for GC pauses or slow startup (use a startup probe).",
          "Or the container is OOMKilled (exit 137) rather than failing probes: check events and memory (J31).",
          "Fix: liveness internal-only, tune probe timing, add startupProbe, size memory properly."] },
      { level: "Hard", q: "Show one Observation producing both a timer and handler callbacks, with high-cardinality data kept out of metrics.",
        a: ["Register DefaultMeterObservationHandler plus a custom handler.",
          "Low-cardinality key values become tags; high-cardinality ones don't.",
          "Inspect the resulting timer's tags."],
        code: `MeterRegistry meters = new SimpleMeterRegistry();
ObservationRegistry obs = ObservationRegistry.create();
obs.observationConfig().observationHandler(new io.micrometer.core.instrument.observation.DefaultMeterObservationHandler(meters));
Observation.createNotStarted("invoice.render", obs).lowCardinalityKeyValue("format", "pdf").highCardinalityKeyValue("invoice.id", "INV-9921").observe(() -> { });
System.out.println(meters.get("invoice.render").timer().getId().getTags());` }
    ],
    recap: [
      "Actuator exposes health, info, metrics, loggers and more; expose little and secure the rest.",
      "Liveness restarts, readiness routes traffic; keep external dependencies out of liveness.",
      "Micrometer gives dimensional Counters, Timers, Gauges; keep tags bounded; use histograms for SLOs.",
      "Observations feed metrics and traces; traceparent propagates trace ids, which also land in logs.",
      "Structured logs + metrics + traces, tied by traceId, with alerts on SLO burn."
    ]
  });
})();
