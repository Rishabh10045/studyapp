/* Lesson F08: Proxies & API gateways */
(function () {
  "use strict";
  var H = window.HLD, esc = H.esc;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.r) s.r = "ok";
    var REQ = {
      ok: ["GET /orders/17 with a valid token", [["TLS termination", "pass", "HTTPS decrypted at the gateway"], ["Authentication", "pass", "JWT signature and expiry verified"], ["Rate limit", "pass", "User is under 100 requests/min"], ["Response cache", "miss", "Not cached yet"], ["Routing", "pass", "/orders/* → Order service"], ["Order service", "pass", "200 OK, response cached for 30 s"]]],
      cached: ["Same GET again within 30 s", [["TLS termination", "pass", "HTTPS decrypted"], ["Authentication", "pass", "Token valid"], ["Rate limit", "pass", "Under limit"], ["Response cache", "hit", "Served from gateway cache: backend not called"]]],
      noauth: ["GET /orders/17 without a token", [["TLS termination", "pass", "HTTPS decrypted"], ["Authentication", "stop", "401 Unauthorized: request never reaches services"]]],
      limit: ["101st request this minute", [["TLS termination", "pass", "HTTPS decrypted"], ["Authentication", "pass", "Token valid"], ["Rate limit", "stop", "429 Too Many Requests, Retry-After: 12"]]],
      agg: ["GET /home (mobile app screen)", [["TLS termination", "pass", "HTTPS decrypted"], ["Authentication", "pass", "Token valid"], ["Rate limit", "pass", "Under limit"], ["Aggregation", "pass", "Gateway calls User, Feed and Notification services in parallel"], ["Response", "pass", "One combined JSON response: fewer round trips for the phone"]]],
      down: ["GET /payments when Payment service is failing", [["TLS termination", "pass", "HTTPS decrypted"], ["Authentication", "pass", "Token valid"], ["Rate limit", "pass", "Under limit"], ["Routing", "pass", "/payments/* → Payment service"], ["Circuit breaker", "stop", "Breaker open after repeated failures: fast 503 instead of piling up timeouts"]]]
    };
    el.innerHTML = "<div class='seg' data-r='pick'></div><div class='rows' data-r='path'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("pick").innerHTML = Object.keys(REQ).map(function (k) { return "<button type='button' data-k='" + k + "' class='" + (s.r === k ? "on" : "") + "'>" + esc(REQ[k][0]) + "</button>"; }).join("");
      q("path").innerHTML = REQ[s.r][1].map(function (st, i) {
        var tone = st[1] === "stop" ? "danger" : st[1] === "hit" ? "success" : st[1] === "miss" ? "warning" : "";
        return "<div class='row'><div><div class='t'>" + (i + 1) + ". " + esc(st[0]) + "</div><div class='dt'>" + esc(st[2]) + "</div></div><span class='pill " + tone + "'>" + (st[1] === "stop" ? "stopped" : st[1]) + "</span></div>";
      }).join("");
    }
    q("pick").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.r = b.getAttribute("data-k"); ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F08",
    summary: "Forward and reverse proxies, API gateways and service meshes: the components that sit between clients and services to handle TLS, routing, authentication, rate limiting, caching and resilience in one place.",
    slides: [
      { t: "What a proxy is", x: "A proxy is an intermediary that receives a request and forwards it on someone's behalf. Whose behalf decides the type.",
        p: ["Forward proxy: acts for clients (the server sees the proxy, not the client)", "Reverse proxy: acts for servers (the client sees the proxy, not the servers)", "Both can cache, filter, log and modify traffic"],
        m: "flowchart LR\n  subgraph Forward[\"Forward proxy\"]\n    C1[\"Clients\"] --> FP[\"Proxy\"]:::s0 --> I[\"Internet sites\"]\n  end\n  subgraph Reverse[\"Reverse proxy\"]\n    U[\"Internet users\"] --> RP[\"Proxy\"]:::s1 --> S[\"Your servers\"]\n  end" },
      { t: "Forward proxies", x: "Used by organisations and individuals to control or anonymise outbound traffic.",
        p: ["Corporate web filtering and logging", "Caching shared downloads for many users", "Hiding client IPs (anonymity, geo-access)", "Rarely central in system design interviews, but know the difference"],
        m: "flowchart LR\n  E[\"Employee laptops\"] --> F[\"Forward proxy<br/>filter, log, cache\"]:::s0 --> W[\"Web\"]" },
      { t: "Reverse proxies", x: "A reverse proxy is the front door to your servers. Load balancers are a kind of reverse proxy.",
        p: ["Hide internal topology: clients only know one address", "TLS termination and certificate management in one place", "Caching and compression of responses", "Load balancing, request buffering, protection from slow clients", "Examples: NGINX, HAProxy, Envoy, Varnish (caching), Traefik"],
        m: "flowchart LR\n  U[\"Users\"] -->|\"HTTPS\"| RP[\"Reverse proxy<br/>TLS, cache, gzip\"]:::s1\n  RP -->|\"HTTP\"| A[\"App 1\"]\n  RP --> B[\"App 2\"]\n  RP --> C[\"App 3\"]" },
      { t: "API gateways", x: "An API gateway is a reverse proxy specialised for APIs, usually in front of many microservices. It centralises cross-cutting concerns.",
        table: [["Concern", "What the gateway does"], ["Routing", "/users/* → User service, /orders/* → Order service"], ["Authentication", "Validate API keys, JWTs or OAuth tokens once, at the edge"], ["Rate limiting & quotas", "Per user, per API key, per plan"], ["Aggregation", "Combine several service calls into one response"], ["Transformation", "Protocol translation (REST ↔ gRPC), versioning, header rewriting"], ["Observability", "Central logs, metrics, request IDs"]],
        m: "flowchart LR\n  M[\"Mobile\"] --> G[\"API gateway\"]:::s0\n  W[\"Web\"] --> G\n  P[\"Partners\"] --> G\n  G --> U[\"User service\"]\n  G --> O[\"Order service\"]\n  G --> PAY[\"Payment service\"]" },
      { t: "Backend for Frontend (BFF)", x: "Different clients need different shapes of data. A BFF is a gateway per client type that tailors and aggregates responses.",
        p: ["Mobile BFF returns compact, aggregated payloads (fewer round trips on slow networks)", "Web BFF can return richer data", "Each team owns its BFF and can change it without affecting others", "Trade-off: more components to run and keep consistent"],
        m: "flowchart LR\n  M[\"Mobile app\"] --> MB[\"Mobile BFF\"]:::s0\n  W[\"Web app\"] --> WB[\"Web BFF\"]:::s1\n  MB --> S1[\"User svc\"]\n  MB --> S2[\"Feed svc\"]\n  WB --> S1\n  WB --> S2\n  WB --> S3[\"Analytics svc\"]" },
      { t: "Resilience at the edge", x: "Gateways and proxies are a natural place to protect backends from overload and cascading failures.",
        p: ["Timeouts on every upstream call", "Retries with exponential backoff and jitter, only for idempotent requests", "Circuit breakers: after repeated failures, fail fast for a while instead of waiting", "Load shedding: reject low-priority traffic when overloaded", "Request IDs propagated for tracing"],
        m: "stateDiagram-v2\n  [*] --> Closed\n  Closed --> Open: failures exceed threshold\n  Open --> HalfOpen: after cool-down\n  HalfOpen --> Closed: trial requests succeed\n  HalfOpen --> Open: trial request fails" },
      { t: "Service mesh and sidecars", x: "For service-to-service (east–west) traffic, a service mesh puts a small proxy (sidecar) next to each service instance.",
        p: ["Sidecars handle mTLS, retries, timeouts, load balancing and metrics for every call", "A control plane configures all sidecars centrally", "Examples: Istio and Consul (Envoy sidecars), Linkerd", "Gateway = north–south (outside → in); mesh = east–west (service ↔ service)", "Cost: extra hop and operational complexity"],
        m: "flowchart LR\n  subgraph PodA[\"Service A pod\"]\n    A[\"App A\"] --> SA[\"Sidecar\"]:::s0\n  end\n  subgraph PodB[\"Service B pod\"]\n    SB[\"Sidecar\"]:::s0 --> B[\"App B\"]\n  end\n  SA -->|\"mTLS\"| SB\n  CP[\"Control plane\"]:::s1 -.-> SA\n  CP -.-> SB" },
      { t: "Gateway vs load balancer vs reverse proxy", x: "The terms overlap; products often do all three. Focus on the job being done.",
        table: [["Component", "Main job", "Typical example"], ["Reverse proxy", "Front door: TLS, caching, forwarding", "NGINX, Varnish"], ["Load balancer", "Spread traffic over healthy instances", "AWS ALB/NLB, HAProxy"], ["API gateway", "API concerns: auth, quotas, routing, aggregation", "Kong, AWS API Gateway, Apigee"], ["Service mesh", "Service-to-service traffic policy", "Istio, Linkerd"]],
        m: "flowchart LR\n  U[\"Users\"] --> CDN[\"CDN\"] --> LB[\"Load balancer\"]:::s0 --> GW[\"API gateway\"]:::s1 --> SVC[\"Services + mesh sidecars\"]:::s2" },
      { t: "Risks and how to handle them", x: "Centralising concerns is powerful, but the gateway becomes critical infrastructure.",
        p: ["Single point of failure: run multiple instances across zones behind a load balancer", "Bottleneck: keep it stateless and scale horizontally", "Added latency: every hop costs; avoid heavy logic in the gateway", "Business logic creep: the gateway should route and protect, not implement features", "Configuration drift: manage routes as code"],
        m: "flowchart LR\n  LB[\"Load balancer\"] --> G1[\"Gateway 1\"]:::s0\n  LB --> G2[\"Gateway 2\"]:::s0\n  LB --> G3[\"Gateway 3\"]:::s0\n  G1 --> S[\"Services\"]\n  G2 --> S\n  G3 --> S" },
      { t: "In interviews", x: "Mention the gateway when there are many services or external clients, and say what it does for this design.",
        p: ["'An API gateway validates JWTs, enforces per-user rate limits and routes to services.'", "'Mobile clients call a BFF that aggregates profile, feed and notifications in one request.'", "'Internal calls go through sidecars for mTLS and retries.'", "Keep it redundant and stateless; push business logic into services"],
        m: "flowchart LR\n  C[\"Clients\"] --> G[\"Redundant gateway<br/>auth, limits, routing\"]:::s0 --> S[\"Services\"]:::s2" }
    ],
    widget: { heading: "Follow a request through an API gateway", caption: "Pick a request to see which gateway stage handles it. Simplified pipeline; real gateways are configurable.", render: widget },
    examples: [
      ["Netflix Zuul", "Netflix built and open-sourced Zuul as the edge gateway for its streaming API, handling routing, resilience and dynamic filters."],
      ["Amazon API Gateway", "A managed gateway offering request throttling, API keys and usage plans, authorisers and integration with AWS Lambda."],
      ["Kong", "An open-source API gateway built on NGINX/OpenResty, extended with plugins for auth, rate limiting and logging."],
      ["Istio + Envoy", "Istio configures Envoy sidecars to provide mTLS, traffic splitting and telemetry between services without code changes."]
    ],
    pitfalls: [
      "Confusing forward and reverse proxies",
      "Putting business logic in the gateway",
      "Drawing one gateway instance (a new single point of failure)",
      "Retrying non-idempotent requests (e.g. POST /payments) at the gateway",
      "Adding a service mesh to a small system without justifying the complexity",
      "Forgetting that every proxy hop adds latency"
    ],
    quiz: [
      ["A reverse proxy acts on behalf of…", ["Clients", "Servers", "DNS resolvers", "Databases only"], 1, "Clients talk to the reverse proxy as if it were the server; it forwards to your backends."],
      ["Which is a typical API gateway responsibility?", ["Storing user data", "Validating tokens and enforcing rate limits", "Running database migrations", "Rendering HTML templates"], 1, "Gateways centralise cross-cutting API concerns like auth, quotas and routing."],
      ["What problem does a Backend for Frontend (BFF) solve?", ["Database sharding", "Different clients needing differently shaped, aggregated responses", "Leader election", "Disk failures"], 1, "A BFF tailors APIs per client type, e.g. compact aggregated payloads for mobile."],
      ["What does an open circuit breaker do?", ["Retries forever", "Fails fast without calling the failing service, for a cool-down period", "Encrypts traffic", "Routes to a random service"], 1, "It stops piling requests onto a failing dependency, then lets a few trial requests through (half-open)."],
      ["Service mesh sidecars mainly handle…", ["North–south traffic from browsers", "Service-to-service traffic policies such as mTLS, retries and metrics", "Database replication", "CDN caching"], 1, "A mesh manages east–west traffic between services."],
      ["Which retry is safe for a gateway to perform automatically?", ["POST /payments", "GET /products/42", "POST /orders", "Any request"], 1, "GET is idempotent; retrying non-idempotent requests can duplicate side effects unless they carry idempotency keys."],
      ["How do you avoid the API gateway becoming a single point of failure?", ["Make it stateful", "Run several stateless instances across zones behind a load balancer", "Put a database inside it", "Disable rate limiting"], 1, "Stateless, horizontally scaled, multi-zone gateways remove the SPOF."]
    ],
    practice: {
      q: "A company is splitting its monolith into 12 microservices used by a web app, iOS/Android apps and partner APIs. Design the edge: what proxies/gateways do you add, what does each do, and how do you keep it reliable?",
      a: [
        ["Edge layers", "CDN for static assets → managed L7 load balancer → API gateway cluster → services."],
        ["Gateway duties", "TLS (if not at LB), JWT/OAuth validation, per-key quotas for partners, per-user rate limits, routing by path, request IDs, central access logs."],
        ["Client-specific APIs", "A mobile BFF that aggregates screens into single calls; a web BFF; partners use the public gateway with versioned routes (/v1, /v2)."],
        ["Service-to-service", "Start with client libraries for timeouts/retries; adopt a service mesh (mTLS, traffic splitting) once the number of services and teams justifies it."],
        ["Resilience", "Timeouts on every route, retries only for idempotent calls, circuit breakers per upstream, load shedding of low-priority traffic."],
        ["Reliability of the gateway", "Stateless instances across three zones, autoscaled, config as code with canary rollouts of route changes."],
        ["Trade-offs", "Extra hop latency; risk of the gateway team becoming a bottleneck; keep business logic in services."]
      ]
    },
    recap: [
      "Forward proxy acts for clients; reverse proxy acts for servers.",
      "Reverse proxies terminate TLS, cache, compress and forward.",
      "API gateways centralise auth, rate limits, routing and aggregation for APIs.",
      "Service meshes put sidecar proxies beside services for east–west traffic.",
      "Keep gateways stateless, redundant and free of business logic."
    ]
  });
})();
