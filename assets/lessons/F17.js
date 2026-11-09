/* Lesson F17: API design: REST, gRPC, GraphQL */
(function () {
  "use strict";
  var H = window.HLD;
  var STYLES = {
    rest: { name: "REST (3 calls)", trips: 2, calls: 3, kb: 14, req: "GET /users/42\nGET /users/42/orders?limit=3   ┐ parallel after\nGET /users/42/notifications?unread=true ┘ the first returns\n→ full resources returned (over-fetching)" },
    bff: { name: "REST + aggregate endpoint", trips: 1, calls: 1, kb: 5, req: "GET /mobile/home?user=42\n→ server-side fan-out to 3 services,\n   returns exactly what the screen needs" },
    gql: { name: "GraphQL", trips: 1, calls: 1, kb: 3, req: "POST /graphql\nquery { user(id: 42) { name avatar\n  orders(last: 3) { id total status }\n  unreadCount } }" },
    grpc: { name: "gRPC (service-to-service)", trips: 1, calls: 1, kb: 1.5, req: "rpc GetHome(GetHomeRequest) returns (HomeView);\n// binary protobuf over HTTP/2,\n// generated client stubs" }
  };

  function widget(el, ctx) {
    var s = ctx.state; if (!s.st) { s.st = "rest"; s.rtt = 120; s.srv = 30; }
    el.innerHTML = "<div class='seg' data-r='seg'>" + Object.keys(STYLES).map(function (k) { return "<button data-s='" + k + "'>" + STYLES[k].name + "</button>"; }).join("") + "</div>" +
      "<div class='grid2'><label class='field'>Network round-trip time (mobile ≈ 100–300 ms): <strong data-v='rtt' style='color:var(--text)'></strong><input type='range' min='10' max='400' step='10' data-k='rtt'></label>" +
      "<label class='field'>Server time per call: <strong data-v='srv' style='color:var(--text)'></strong><input type='range' min='5' max='200' step='5' data-k='srv'></label></div>" +
      "<div class='grid2'><div class='card'><strong>Request</strong><pre data-r='req' style='white-space:pre-wrap;font-size:12px;margin:6px 0 0'></pre></div><div><div class='metrics' data-r='m'></div><div class='bars' data-r='bars'></div></div></div>" +
      "<p class='caption'>Task: load a mobile home screen with the user's name, last 3 orders and unread count. Payload sizes are illustrative, not measured.</p>";
    function draw() {
      el.querySelectorAll("[data-s]").forEach(function (b) { b.className = b.getAttribute("data-s") === s.st ? "active" : ""; });
      ["rtt", "srv"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; el.querySelector("[data-v='" + k + "']").textContent = s[k] + " ms"; });
      var st = STYLES[s.st];
      el.querySelector("[data-r='req']").textContent = st.req;
      function lat(x) { return x.trips * (s.rtt + s.srv) + (x === STYLES.bff || x === STYLES.gql ? s.srv : 0); }
      el.querySelector("[data-r='m']").innerHTML = [[st.trips, "Sequential round trips"], [st.calls, "Client requests"], [lat(st) + " ms", "Approx. screen latency"], ["~" + st.kb + " KB", "Payload (illustrative)"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var mx = Math.max.apply(null, Object.keys(STYLES).map(function (k) { return lat(STYLES[k]); }));
      el.querySelector("[data-r='bars']").innerHTML = Object.keys(STYLES).map(function (k) {
        var v = lat(STYLES[k]);
        return "<div class='bar'><span>" + STYLES[k].name + "</span><div class='track'><div class='fill' style='width:" + (v / mx * 100) + "%;background:" + (k === s.st ? "var(--c0)" : "var(--other)") + "'></div></div><span>" + v + " ms</span></div>";
      }).join("");
    }
    el.querySelector("[data-r='seg']").addEventListener("click", function (e) { var k = e.target.getAttribute("data-s"); if (k) { s.st = k; ctx.save(); draw(); } });
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "F17",
    summary: "How services talk: REST resources and HTTP semantics, gRPC with protobuf over HTTP/2, GraphQL's client-shaped queries, plus pagination, versioning, idempotency keys and errors — the API step of every interview.",
    slides: [
      { t: "Why API design matters", x: "The API is the contract between clients and your system. In interviews you sketch it right after requirements; it shapes the data model and the components.",
        p: ["Clear resources and operations make the design concrete", "Hard to change once clients depend on it", "Choose a style per boundary: public web/mobile, internal services, partners", "Three common styles: REST, gRPC, GraphQL"],
        m: "flowchart LR\n  M[\"Mobile / web\"] -->|\"REST or GraphQL\"| GW[\"API gateway\"]:::s1\n  GW -->|\"gRPC\"| S1[\"User service\"]:::s0\n  GW -->|\"gRPC\"| S2[\"Order service\"]:::s0\n  P[\"Partners\"] -->|\"REST + webhooks\"| GW" },
      { t: "REST: resources over HTTP", x: "Model nouns as resources with URLs and use HTTP methods for actions. Stateless requests; JSON bodies.",
        table: [["Method", "Meaning", "Idempotent?"], ["GET /orders/7", "Read", "Yes (and safe)"], ["POST /orders", "Create", "No (unless idempotency key)"], ["PUT /orders/7", "Replace", "Yes"], ["PATCH /orders/7", "Partial update", "Not guaranteed"], ["DELETE /orders/7", "Delete", "Yes"]],
        p: ["Status codes: 200 OK, 201 Created, 400 Bad Request, 401/403, 404, 409 Conflict, 429 Too Many Requests, 5xx server errors", "Cacheable GETs work with CDNs and browser caches"],
        m: "flowchart LR\n  C[\"Client\"] -->|\"GET /users/42/orders?limit=20\"| API[\"REST API\"]:::s0\n  API -->|\"200 + JSON list + next cursor\"| C" },
      { t: "Good REST habits", x: "Small conventions that make APIs predictable.",
        p: ["Plural nouns, nested only when it's a real ownership: /users/42/orders", "Filtering and sorting via query params: ?status=paid&sort=-created_at", "Consistent error body: { code, message, details }", "Version: /v1/... or a header; add fields without breaking old clients", "Document with OpenAPI"],
        m: "flowchart LR\n  V1[\"/v1/orders\"]:::s0 --> OLD[\"Old clients keep working\"]\n  V2[\"/v2/orders\"]:::s2 --> NEW[\"New clients\"]" },
      { t: "Pagination: offset vs cursor", x: "Never return unbounded lists. Two common ways to page.",
        pros: ["Offset (?page=3&size=20): simple, jump to any page"], cons: ["Offset: slow for deep pages (DB skips rows), items shift when new rows are inserted"],
        p: ["Cursor/keyset (?after=<last_id>&limit=20): uses an index, stable under inserts", "Cursor is the default choice for feeds and timelines", "Return next_cursor in the response; opaque to the client"],
        m: "flowchart LR\n  P1[\"GET /feed?limit=20\"] --> R1[\"items + next_cursor=abc\"]:::s0\n  R1 --> P2[\"GET /feed?after=abc&limit=20\"] --> R2[\"next items + next_cursor=def\"]:::s0" },
      { t: "gRPC", x: "A high-performance RPC framework from Google. You define services and messages in a .proto file and generate client and server code.",
        p: ["Protocol Buffers: compact binary serialization, typed schema", "Runs over HTTP/2: multiplexed streams on one connection", "Four call types: unary, server streaming, client streaming, bidirectional streaming", "Great for internal service-to-service calls", "Browsers need gRPC-Web or a proxy; harder to debug by eye than JSON"],
        m: "flowchart LR\n  PROTO[\"orders.proto<br/>service Orders { rpc Get(...) }\"]:::s1 --> GEN[\"protoc codegen\"]\n  GEN --> CL[\"Client stub (Go)\"]:::s0\n  GEN --> SV[\"Server (Java)\"]:::s0\n  CL -->|\"HTTP/2 + protobuf\"| SV" },
      { t: "GraphQL", x: "A query language where the client asks for exactly the fields it needs, from a typed schema, usually via one endpoint.",
        p: ["Solves over-fetching and under-fetching (many round trips)", "Schema + resolvers; mutations for writes; subscriptions for real-time", "Watch out: N+1 resolver queries (use batching like DataLoader)", "Caching is harder than REST GETs (single POST endpoint)", "Limit query depth/complexity to stop expensive queries"],
        m: "flowchart LR\n  C[\"Client query: user { name orders(last:3) { total } }\"] --> GQ[\"GraphQL server\"]:::s0\n  GQ --> U[\"User service\"]\n  GQ --> O[\"Order service\"]\n  GQ -->|\"exact shape\"| C" },
      { t: "Choosing a style", x: "Each style fits a different boundary. Many systems use more than one.",
        table: [["", "REST", "gRPC", "GraphQL"], ["Format", "JSON (text)", "Protobuf (binary)", "JSON"], ["Transport", "HTTP/1.1 or 2", "HTTP/2", "HTTP"], ["Best for", "Public APIs, CRUD, caching", "Internal microservices, streaming", "Varied clients, complex UIs"], ["Weak spot", "Over/under-fetching", "Browser support, readability", "Caching, query cost control"]],
        m: "flowchart LR\n  PUB[\"Public / partners\"] --> R[\"REST\"]:::s0\n  INT[\"Internal services\"] --> G[\"gRPC\"]:::s2\n  UI[\"Rich clients\"] --> Q[\"GraphQL\"]:::s1" },
      { t: "Idempotency keys and safe retries", x: "Clients retry on timeouts. Without protection, a retried POST creates a duplicate order or payment.",
        p: ["Client sends Idempotency-Key: <uuid> with the POST", "Server stores the key with the result; a repeat returns the stored result", "Popularized by Stripe's API", "Covered in depth in F24 Idempotency & retries"],
        m: "sequenceDiagram\n  participant C as Client\n  participant A as API\n  C->>A: POST /payments (Idempotency-Key: k1)\n  A-->>C: timeout (response lost)\n  C->>A: retry POST /payments (Idempotency-Key: k1)\n  A-->>C: 201 same payment (no double charge)" },
      { t: "Other API concerns", x: "Things interviewers like to hear mentioned briefly.",
        p: ["Authentication (tokens/OAuth, F22) and rate limiting (F19), often at an API gateway", "Webhooks for pushing events to partners (sign them, retry them)", "Long-running work: return 202 Accepted + a status URL", "Backward compatibility: only add optional fields; never reuse protobuf field numbers"],
        m: "flowchart LR\n  C[\"Client\"] -->|\"POST /exports\"| A[\"API\"]:::s0\n  A -->|\"202 + /exports/9\"| C\n  C -->|\"GET /exports/9\"| A\n  A -->|\"status: done, url\"| C" },
      { t: "APIs in interviews", x: "Write 3–6 core endpoints with key parameters and responses. Keep it short.",
        p: ["POST /v1/urls {long_url} → {short_code}", "GET /{short_code} → 301/302 redirect", "GET /v1/feed?cursor=…&limit=20 → {items, next_cursor}", "Say which style and why: REST externally, gRPC internally", "Mention pagination, auth and idempotency for writes"],
        m: "flowchart LR\n  R[\"Requirements\"] --> API[\"API sketch\"]:::s1 --> DM[\"Data model\"] --> HL[\"High-level design\"]" }
    ],
    widget: { heading: "Round trips: REST vs aggregate vs GraphQL vs gRPC", caption: "One screen, four ways to fetch it. On high-latency mobile networks, sequential round trips dominate.", render: widget },
    examples: [
      ["GitHub", "Offers both a REST API (v3) and a GraphQL API (v4), letting integrators choose."],
      ["GraphQL at Facebook", "Developed at Facebook in 2012 for the News Feed in its mobile apps and open-sourced in 2015."],
      ["gRPC", "Open-sourced by Google in 2015, evolved from its internal RPC system Stubby; now a CNCF project."],
      ["Stripe", "Stripe's REST API supports idempotency keys on POST requests so clients can retry safely."],
      ["Netflix", "Netflix has described federated GraphQL to give UI teams one graph over many backend services."]
    ],
    pitfalls: [
      "Verbs in REST URLs (/createOrder) instead of resources and methods",
      "Unbounded list endpoints with no pagination",
      "Offset pagination for infinite feeds",
      "Non-idempotent POSTs that clients retry, creating duplicates",
      "Picking GraphQL or gRPC without a reason the interviewer can follow",
      "Breaking changes without versioning"
    ],
    quiz: [
      ["Which HTTP method is NOT idempotent by definition?", ["GET", "PUT", "DELETE", "POST"], 3, "Repeating a POST may create multiple resources unless you add an idempotency key."],
      ["What does gRPC use by default?", ["XML over HTTP/1.1", "Protocol Buffers over HTTP/2", "JSON over WebSockets", "CSV over UDP"], 1, "Binary protobuf messages on HTTP/2 streams."],
      ["Main problem GraphQL solves for mobile clients?", ["Encryption", "Over-fetching and multiple round trips", "Database sharding", "Rate limiting"], 1, "The client asks for exactly the fields it needs in one request."],
      ["Why prefer cursor pagination for a news feed?", ["It allows jumping to page 500", "It stays stable when new items are inserted and uses an index", "It needs no index", "It returns all results at once"], 1, "Offsets shift and get slow for deep pages."],
      ["A common GraphQL performance trap is…", ["N+1 queries from resolvers", "Too few endpoints", "Binary payloads", "Lack of a schema"], 0, "Batch resolver calls (e.g. DataLoader)."],
      ["Best status code for a rate-limited request?", ["200", "404", "429", "301"], 2, "429 Too Many Requests, often with Retry-After."],
      ["Good default for internal microservice calls needing streaming?", ["SOAP", "gRPC", "FTP", "GraphQL subscriptions only"], 1, "gRPC supports bidirectional streaming and generated stubs."],
      ["A long-running export job should return…", ["200 after 10 minutes", "202 Accepted with a status URL", "500", "Nothing"], 1, "Do the work asynchronously and let the client poll or receive a webhook."]
    ],
    practice: {
      q: "Design the API for a food-delivery app: browse restaurants near me, view a menu, place an order, track its status. Clients are iOS, Android and web; there are ~15 backend services.",
      a: [
        ["Style", "Public REST (or GraphQL for the rich home screen) through an API gateway; gRPC between internal services."],
        ["Browse", "GET /v1/restaurants?lat=..&lng=..&cuisine=..&cursor=..&limit=20 → {items[{id,name,eta,rating}], next_cursor}"],
        ["Menu", "GET /v1/restaurants/{id}/menu → cacheable at the CDN for a short TTL"],
        ["Order", "POST /v1/orders with Idempotency-Key header, body {restaurant_id, items[{item_id, qty}], address_id, payment_method_id} → 201 {order_id, status:'PLACED'}"],
        ["Tracking", "GET /v1/orders/{id} for status; push live updates via WebSocket/SSE (F18) or push notifications"],
        ["Cross-cutting", "OAuth tokens at the gateway, rate limits (429), consistent error format, /v1 versioning, OpenAPI docs"],
        ["Trade-offs", "GraphQL reduces round trips for the home screen but needs query-cost limits and harder caching; REST keeps CDN caching simple."]
      ]
    },
    recap: [
      "REST = resources + HTTP methods + status codes; great for public, cacheable APIs.",
      "gRPC = protobuf over HTTP/2 with codegen and streaming; great internally.",
      "GraphQL = client-shaped queries; watch N+1, caching and query cost.",
      "Paginate with cursors; version and evolve without breaking clients.",
      "Make retried writes safe with idempotency keys."
    ]
  });
})();
