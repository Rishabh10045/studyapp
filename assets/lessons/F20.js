/* Lesson F20: Monolith vs microservices */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.n) { s.n = 6; s.av = 999; s.hop = 5; s.fb = false; }
    el.innerHTML = "<div class='grid3'><label class='field'>Services called synchronously per request: <strong data-v='n' style='color:var(--text)'></strong><input type='range' min='1' max='20' data-k='n'></label>" +
      "<label class='field'>Availability of each service: <strong data-v='av' style='color:var(--text)'></strong><input type='range' min='990' max='1000' step='0.5' data-k='av'></label>" +
      "<label class='field'>Network + serialization cost per hop: <strong data-v='hop' style='color:var(--text)'></strong><input type='range' min='1' max='30' data-k='hop'></label></div>" +
      "<label class='toggle'><input type='checkbox' data-r='fb'> Half the calls are non-critical: use timeouts + fallbacks (circuit breakers) so they can't fail the request</label>" +
      "<div class='metrics' data-r='m'></div><div data-r='chain' style='display:flex;flex-wrap:wrap;gap:6px;margin:8px 0'></div><p class='caption'>Simplified: assumes independent failures and calls made one after another. Real systems also parallelise calls and retry.</p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      ["n", "av", "hop"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      var a = s.av / 1000;
      el.querySelector("[data-v='n']").textContent = s.n; el.querySelector("[data-v='av']").textContent = (a * 100).toFixed(2) + "%"; el.querySelector("[data-v='hop']").textContent = s.hop + " ms";
      q("fb").checked = s.fb;
      var crit = s.fb ? Math.ceil(s.n / 2) : s.n, tot = Math.pow(a, crit), down = (1 - tot) * 30 * 24 * 60;
      q("m").innerHTML = [[(tot * 100).toFixed(3) + "%", "End-to-end availability"], [down >= 60 ? (down / 60).toFixed(1) + " h" : down.toFixed(0) + " min", "Expected downtime / 30 days"], [s.n * s.hop + " ms", "Added network latency"], ["1 process, 0 ms", "Monolith in-process calls"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var html = "<span class='pill'>Request</span>";
      for (var i = 0; i < s.n; i++) html += "<span>→</span><span class='pill " + (i < crit ? "warning" : "success") + "'>svc " + (i + 1) + (i < crit ? "" : " (fallback)") + "</span>";
      q("chain").innerHTML = html;
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    q("fb").addEventListener("change", function (e) { s.fb = e.target.checked; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F20",
    summary: "When to split a system into services: the strengths of a (modular) monolith, what microservices buy and cost, service boundaries, communication, data ownership, service discovery and resilience patterns like timeouts and circuit breakers.",
    slides: [
      { t: "Two ways to structure a system", x: "A monolith is one deployable unit; microservices are many small services, each owning a business capability and deployed independently.",
        m: "flowchart LR\n  subgraph MONO[\"Monolith\"]\n    U1[\"Users module\"] --- O1[\"Orders module\"] --- P1[\"Payments module\"]\n  end\n  MONO --> DB1[(\"One database\")]:::s0\n  US[\"User service\"]:::s2 --> DBU[(\"Users DB\")]\n  OS[\"Order service\"]:::s2 --> DBO[(\"Orders DB\")]\n  PS[\"Payment service\"]:::s2 --> DBP[(\"Payments DB\")]",
        p: ["Neither is 'right'; it's a trade-off between simplicity and independence", "Most successful systems started as monoliths", "The decision is as much about teams as technology"] },
      { t: "The monolith's strengths", x: "One codebase, one build, one deploy, one database.",
        pros: ["Simple to develop, test and debug locally", "In-process function calls: fast and reliable", "ACID transactions across the whole domain", "Easy refactoring across modules", "Low operational overhead"],
        cons: ["Deploys couple everyone together; one bug can block a release", "Scales as a whole, even if one part is hot", "Large codebases get tangled without discipline", "One tech stack"],
        m: "flowchart LR\n  LB[\"Load balancer\"] --> M1[\"Monolith copy 1\"]:::s0\n  LB --> M2[\"Monolith copy 2\"]:::s0\n  LB --> M3[\"Monolith copy 3\"]:::s0\n  M1 --> DB[(\"DB\")]\n  M2 --> DB\n  M3 --> DB" },
      { t: "Modular monolith", x: "A middle path: one deployable, but strict internal module boundaries with clear interfaces and no reaching into another module's tables.",
        p: ["Gets most of the design benefits of services without network calls", "Makes a later extraction into a service much easier", "Shopify has written about running a large modular monolith (Rails) instead of splitting into microservices"],
        m: "flowchart TB\n  subgraph APP[\"One deployable\"]\n    A[\"Catalog\"]:::s0 -->|\"public interface\"| B[\"Checkout\"]:::s0\n    B -->|\"public interface\"| C[\"Billing\"]:::s0\n  end" },
      { t: "What microservices buy", x: "Independence along several axes.",
        p: ["Independent deploys: each team ships on its own schedule", "Independent scaling: scale the hot service only", "Fault isolation (if designed for it)", "Technology choice per service", "Team autonomy: 'you build it, you run it'; Conway's law in action"],
        m: "flowchart LR\n  T1[\"Team Search\"] --> S1[\"Search service ×20\"]:::s2\n  T2[\"Team Checkout\"] --> S2[\"Checkout service ×4\"]:::s0\n  T3[\"Team Profile\"] --> S3[\"Profile service ×2\"]:::s1" },
      { t: "What microservices cost", x: "You trade code complexity for distributed-systems complexity.",
        p: ["Network calls: latency, partial failures, timeouts, retries", "No cross-service ACID transactions: sagas and eventual consistency (F27)", "Data spread across services: joins become API calls or replicated read models", "Operational load: CI/CD per service, observability (F21), service discovery, versioning", "Availability multiplies: a chain of 10 services at 99.9% each is ~99.0% end-to-end"],
        m: "flowchart LR\n  R[\"Request\"] --> A[\"A 99.9%\"] --> B[\"B 99.9%\"] --> C[\"C 99.9%\"] --> D[\"… ×10\"]:::bad\n  D --> T[\"≈ 99.0% overall\"]" },
      { t: "Drawing service boundaries", x: "Split by business capability (bounded contexts from domain-driven design), not by technical layer.",
        p: ["Good: Orders, Payments, Inventory, Notifications", "Bad: a 'database service' and a 'validation service' every request must call", "Each service owns its data; others go through its API or events", "Avoid a 'distributed monolith': services that must all deploy together or share one DB"],
        m: "flowchart LR\n  OR[\"Orders\"]:::s0 -->|\"API\"| PAY[\"Payments\"]:::s0\n  OR -->|\"event: OrderPlaced\"| INV[\"Inventory\"]:::s0\n  OR -. \"✗ reads Payments tables directly\" .-> PDB[(\"Payments DB\")]:::bad" },
      { t: "How services communicate", x: "Synchronous request/response or asynchronous events — most systems use both.",
        table: [["", "Synchronous (REST/gRPC)", "Asynchronous (events/queues)"], ["Coupling", "Caller waits; callee must be up", "Decoupled in time"], ["Use for", "Queries needing an immediate answer", "Side effects, fan-out, workflows"], ["Failure", "Cascades if no timeouts", "Backlog grows; retried later"], ["Consistency", "Immediate", "Eventual"]],
        m: "flowchart LR\n  GW[\"API gateway\"]:::s1 -->|\"gRPC\"| ORD[\"Orders\"]:::s0\n  ORD -->|\"gRPC: authorize\"| PAY[\"Payments\"]:::s0\n  ORD -->|\"Kafka: OrderPlaced\"| K[(\"Event bus\")]:::s2\n  K --> EM[\"Email\"]\n  K --> AN[\"Analytics\"]" },
      { t: "Service discovery and the platform", x: "Instances come and go; callers must find healthy ones.",
        p: ["Service registry / DNS: Kubernetes Services, Consul, Eureka", "Client-side vs server-side (load balancer) discovery", "API gateway at the edge (F08); service mesh sidecars (Envoy/Istio, Linkerd) for mTLS, retries, metrics", "Containers + orchestration (Kubernetes) make many small deploys practical"],
        m: "flowchart LR\n  A[\"Order service\"] -->|\"where is payments?\"| REG[(\"Registry / DNS\")]:::s1\n  REG -->|\"10.0.3.7, 10.0.4.2\"| A\n  A --> P1[\"Payments pod 1\"]:::s0\n  A --> P2[\"Payments pod 2\"]:::s0" },
      { t: "Resilience patterns", x: "In a distributed system something is always failing. Design so one slow service can't take down everything.",
        p: ["Timeouts on every remote call", "Retries with backoff + jitter, only for idempotent operations (F24)", "Circuit breaker: after repeated failures, fail fast for a while, then probe", "Bulkheads: separate thread/connection pools per dependency", "Fallbacks: cached or default data for non-critical features", "Netflix popularized these with Hystrix (now in maintenance; Resilience4j is a common successor)"],
        m: "stateDiagram-v2\n  [*] --> Closed\n  Closed --> Open: failures exceed threshold\n  Open --> HalfOpen: after cool-down\n  HalfOpen --> Closed: probe succeeds\n  HalfOpen --> Open: probe fails" },
      { t: "Deciding in interviews", x: "Interviewers want reasoning, not buzzwords.",
        p: ["Small team / new product: start with a (modular) monolith", "Split when teams block each other or parts need very different scaling", "In large-scale designs, draw services by capability: 'upload service, feed service, notification service'", "Say how they talk (sync vs events) and how failures are contained", "Mention data ownership and avoiding shared databases"],
        m: "flowchart LR\n  Q{\"Many teams? very different scaling needs?\"} -->|\"no\"| MM[\"Modular monolith\"]:::s0\n  Q -->|\"yes\"| MS[\"Microservices by capability\"]:::s2\n  MM -. \"extract when needed\" .-> MS" }
    ],
    widget: { heading: "The cost of a synchronous call chain", caption: "See how end-to-end availability and latency change as one request crosses more services, and how fallbacks help.", render: widget },
    examples: [
      ["Amazon", "Amazon moved from a monolithic application to services in the early 2000s; the 'two-pizza team' idea is linked to owning services end to end."],
      ["Netflix", "Netflix migrated from a monolith in its own data centres to hundreds of microservices on AWS over about seven years (completed 2016)."],
      ["Shopify", "Shopify has described deliberately keeping a modular monolith, enforcing component boundaries inside one Rails codebase."],
      ["Prime Video monitoring", "In 2023 an Amazon Prime Video team wrote that moving one monitoring tool from distributed serverless components to a single process cut its infrastructure cost by over 90%."]
    ],
    pitfalls: [
      "Starting with microservices for a small team and an unclear domain",
      "A distributed monolith: services sharing one database or deploying in lockstep",
      "Splitting by technical layer instead of business capability",
      "Long synchronous call chains with no timeouts or circuit breakers",
      "Retrying non-idempotent calls",
      "Ignoring the operational cost: tracing, deploy pipelines, on-call"
    ],
    quiz: [
      ["Main advantage of a monolith?", ["Independent scaling of each part", "Simplicity: one deploy, in-process calls, ACID transactions", "Multiple languages", "No database needed"], 1, "It avoids distributed-systems complexity."],
      ["Main advantage of microservices?", ["Fewer network calls", "Independent deploys and scaling per service and team", "Easier cross-service transactions", "Less infrastructure"], 1, "Teams can ship and scale independently."],
      ["10 services in a synchronous chain, each 99.9% available. End-to-end availability is about…", ["99.99%", "99.9%", "99.0%", "90%"], 2, "0.999¹⁰ ≈ 0.990."],
      ["What is a 'distributed monolith'?", ["A monolith on many servers", "Services that share a database or must deploy together", "A modular monolith", "A CDN"], 1, "All the costs of microservices with few of the benefits."],
      ["Best way to draw service boundaries?", ["By technical layer (UI, logic, DB)", "By business capability / bounded context", "One service per database table", "Randomly"], 1, "Keeps related logic and data together."],
      ["What does a circuit breaker do?", ["Encrypts traffic", "Stops calling a failing dependency for a while and fails fast", "Balances load", "Restarts servers"], 1, "Prevents cascading failures and gives the dependency time to recover."],
      ["Which communication fits 'send a welcome email after signup'?", ["Synchronous call that blocks signup", "Asynchronous event", "Shared database table polling", "FTP"], 1, "Side effects don't need to block the user."],
      ["Good default for a 5-person startup building a new product?", ["50 microservices", "A modular monolith", "Serverless functions per endpoint, always", "No backend"], 1, "Split later when there's a real need."]
    ],
    practice: {
      q: "A growing e-commerce company has a 6-year-old monolith, 80 engineers in 10 teams, and slow releases because every change ships together. Search traffic is 20× checkout traffic. How would you evolve the architecture?",
      a: [
        ["Diagnose", "Pain is team coupling and uneven scaling, not raw performance. Don't rewrite everything at once."],
        ["First step", "Modularize inside the monolith: define bounded contexts (catalog, search, cart, checkout, payments, accounts), enforce interfaces, separate schemas."],
        ["Strangler fig", "Extract one high-value context at a time behind the API gateway, starting with Search (independent scaling, read-only data) fed by catalog change events."],
        ["Data", "Each extracted service owns its data; others use its API or subscribe to events; no shared tables."],
        ["Communication", "gRPC for queries; Kafka events for OrderPlaced, PriceChanged etc.; outbox for reliable publishing."],
        ["Platform", "Kubernetes, per-service CI/CD, OpenTelemetry tracing, timeouts/circuit breakers in clients or a mesh."],
        ["Trade-offs", "Checkout + payments may stay together longer since they need transactional consistency; each split adds network and ops cost."]
      ]
    },
    recap: [
      "Monolith = simple, fast in-process calls and ACID; couples deploys and scaling.",
      "Microservices = independent deploys, scaling and teams; costs network, data and ops complexity.",
      "Start modular; split by business capability when teams or scaling demand it.",
      "Each service owns its data; mix sync APIs with async events.",
      "Contain failures with timeouts, retries (idempotent only), circuit breakers and fallbacks."
    ]
  });
})();
