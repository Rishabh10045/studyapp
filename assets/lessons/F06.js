/* Lesson F06: Load balancing */
(function () {
  "use strict";
  var H = window.HLD, esc = H.esc;
  var COSTS = [3, 1, 6, 2, 2, 8, 1, 4, 3, 1, 5, 2, 7, 1, 3, 2, 6, 1, 2, 4];
  var CLIENTS = ["10.0.0.7", "10.0.0.9", "10.0.0.7", "10.0.0.12", "10.0.0.3", "10.0.0.9", "10.0.0.7", "10.0.0.21"];

  function widget(el, ctx) {
    var s = ctx.state;
    function reset() { s.alg = s.alg || "rr"; s.n = 0; s.rr = 0; s.srv = [0, 1, 2, 3].map(function (i) { return { up: true, w: i === 0 ? 3 : 1, active: [], total: 0, waitSum: 0 }; }); }
    if (!s.srv) reset();
    var ALGS = [["rr", "Round robin"], ["wrr", "Weighted RR"], ["lc", "Least connections"], ["hash", "IP hash"]];
    el.innerHTML = "<div class='controls'><div class='seg' data-r='alg'></div></div><div class='btnrow'><button type='button' class='btn primary' data-r='one'>Send 1 request</button><button type='button' class='btn' data-r='ten'>Send 10 requests</button><button type='button' class='btn' data-r='reset'>Reset</button></div><p class='caption'>Server 1 is 3x more powerful (weight 3). Click a server to fail it or bring it back (health checks). Each request has a different amount of work; each tick, servers finish work in proportion to their power.</p><div class='grid2' data-r='srv' style='grid-template-columns:repeat(auto-fit,minmax(140px,1fr))'></div><p data-r='txt'></p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function healthy() { return s.srv.map(function (x, i) { return i; }).filter(function (i) { return s.srv[i].up; }); }
    function pick(ip) {
      var hs = healthy(); if (!hs.length) return -1;
      if (s.alg === "rr") { var i = hs[s.rr % hs.length]; s.rr++; return i; }
      if (s.alg === "wrr") { var ring = []; hs.forEach(function (i) { for (var k = 0; k < s.srv[i].w; k++) ring.push(i); }); var j = ring[s.rr % ring.length]; s.rr++; return j; }
      if (s.alg === "lc") { return hs.reduce(function (b, i) { var a = s.srv[i].active.length / s.srv[i].w, c = s.srv[b].active.length / s.srv[b].w; return a < c ? i : b; }, hs[0]); }
      var h = 0; for (var k = 0; k < ip.length; k++) h = (h * 31 + ip.charCodeAt(k)) >>> 0;
      return hs[h % hs.length];
    }
    function tick() { s.srv.forEach(function (x) { var cap = x.w; while (cap > 0 && x.active.length) { var d = Math.min(cap, x.active[0]); x.active[0] -= d; cap -= d; if (x.active[0] <= 0) x.active.shift(); } }); }
    function send() {
      tick();
      var cost = COSTS[s.n % COSTS.length], ip = CLIENTS[s.n % CLIENTS.length]; s.n++;
      var i = pick(ip);
      if (i < 0) { s.last = "No healthy servers: request failed."; return; }
      var queued = s.srv[i].active.reduce(function (a, b) { return a + b; }, 0) / s.srv[i].w;
      s.srv[i].active.push(cost); s.srv[i].total++; s.srv[i].waitSum += queued;
      s.last = "Request #" + s.n + " from " + ip + " (work " + cost + ") → Server " + (i + 1) + (queued ? ", waits behind ~" + queued.toFixed(1) + " ticks of work" : ", starts immediately") + ".";
    }
    function draw() {
      q("alg").innerHTML = ALGS.map(function (a) { return "<button type='button' data-a='" + a[0] + "' class='" + (s.alg === a[0] ? "on" : "") + "'>" + a[1] + "</button>"; }).join("");
      q("srv").innerHTML = s.srv.map(function (x, i) {
        var work = x.active.reduce(function (a, b) { return a + b; }, 0);
        return "<button type='button' class='card' data-s='" + i + "' style='text-align:left;cursor:pointer;font:inherit;color:var(--text);border-color:" + (x.up ? "var(--border)" : "var(--danger)") + "'>" +
          "<div style='font-weight:600'>Server " + (i + 1) + " <span class='pill " + (x.up ? "success'>healthy" : "danger'>down") + "</span></div><div class='caption' style='margin:4px 0'>weight " + x.w + "</div>" +
          "<div class='bar' style='grid-template-columns:1fr'><span class='track'><span class='fill' style='width:" + Math.min(100, work / x.w * 8) + "%'></span></span></div>" +
          "<div class='dt' style='font-size:13px;color:var(--text-2);margin-top:6px'>In flight: " + x.active.length + " · queue ≈ " + (work / x.w).toFixed(1) + " ticks<br/>Total handled: " + x.total + "<br/>Avg wait: " + (x.total ? (x.waitSum / x.total).toFixed(1) : "0") + " ticks</div></button>";
      }).join("");
      q("txt").textContent = s.last || "Pick an algorithm and send requests.";
    }
    q("alg").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.alg = b.getAttribute("data-a"); ctx.save(); draw(); });
    q("one").addEventListener("click", function () { send(); ctx.save(); draw(); });
    q("ten").addEventListener("click", function () { for (var i = 0; i < 10; i++) send(); ctx.save(); draw(); });
    q("reset").addEventListener("click", function () { var a = s.alg; reset(); s.alg = a; s.last = ""; ctx.save(); draw(); });
    q("srv").addEventListener("click", function (e) { var b = e.target.closest("[data-s]"); if (!b) return; var x = s.srv[+b.getAttribute("data-s")]; x.up = !x.up; if (!x.up) x.active = []; s.last = "Server " + (+b.getAttribute("data-s") + 1) + (x.up ? " passed health checks and is back in rotation." : " failed health checks: the load balancer stops sending it traffic (its in-flight requests are lost or retried)."); ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F06",
    summary: "How a load balancer spreads traffic across servers: L4 vs L7, balancing algorithms, health checks, sticky sessions, TLS termination, making the balancer itself redundant, and global load balancing across regions.",
    slides: [
      { t: "What a load balancer does", x: "A load balancer (LB) sits in front of a pool of servers and spreads incoming requests across the healthy ones, so you can scale out and survive server failures.",
        p: ["One stable entry point (a virtual IP or DNS name) for many servers", "Distributes load so no single server is overwhelmed", "Detects unhealthy servers and routes around them", "Lets you add, remove or deploy servers without clients noticing"],
        d: { n: [["c", "Clients", "", null, "terminal"], ["lb", "Load balancer", "Virtual IP / DNS name", 0], ["s1", "Server 1"], ["s2", "Server 2"], ["s3", "Server 3"]], e: [["c", "lb"], ["lb", "s1"], ["lb", "s2"], ["lb", "s3"]] } },
      { t: "Layer 4 vs Layer 7", x: "Load balancers work at different layers of the network stack, which decides what they can 'see' and route on.",
        table: [["", "Layer 4 (transport)", "Layer 7 (application)"], ["Sees", "IP addresses, ports, TCP/UDP", "HTTP method, path, headers, cookies"], ["Routing", "Per connection", "Per request (e.g. /api → API servers)"], ["Speed", "Very fast, low overhead", "More CPU work (parses requests)"], ["Features", "Simple forwarding", "TLS termination, path/host routing, retries, rewriting"], ["Examples", "AWS NLB, LVS, HAProxy (TCP mode)", "AWS ALB, NGINX, Envoy, HAProxy (HTTP mode)"]],
        m: "flowchart LR\n  C[\"Client\"] --> L4[\"L4 LB<br/>routes by IP:port\"]:::s0 --> P[\"Server pool\"]\n  C --> L7[\"L7 LB<br/>routes by URL, header, cookie\"]:::s1\n  L7 -->|\"/api\"| A[\"API servers\"]\n  L7 -->|\"/static\"| S[\"Static servers\"]" },
      { t: "Balancing algorithms", x: "The algorithm decides which healthy server gets the next request or connection.",
        table: [["Algorithm", "How it works", "Good when"], ["Round robin", "Next server in turn", "Identical servers, similar requests"], ["Weighted round robin", "Bigger servers get proportionally more", "Mixed server sizes"], ["Least connections", "Server with fewest active connections", "Requests vary a lot in duration"], ["Least response time", "Fastest recent responses win", "Latency-sensitive services"], ["IP / key hash", "hash(client or key) → server", "Affinity, e.g. caches, sessions"], ["Power of two choices", "Pick 2 at random, use the less loaded", "Large pools; cheap and effective"]],
        m: "flowchart LR\n  R[\"Next request\"] --> A{\"Algorithm\"}\n  A -->|\"turns\"| RR[\"Round robin\"]:::s0\n  A -->|\"least busy\"| LC[\"Least connections\"]:::s1\n  A -->|\"hash(key)\"| HS[\"Hash / consistent hash\"]:::s2" },
      { t: "Health checks and connection draining", x: "The LB only sends traffic to servers that pass health checks, which is what makes horizontal scaling fault-tolerant.",
        p: ["Active checks: LB calls e.g. GET /health every few seconds; N failures → remove, M successes → re-add", "Passive checks: LB notices errors or timeouts on real traffic", "A good health endpoint checks the app can serve, not just that the process is alive", "Connection draining (deregistration delay): stop new requests to a server but let in-flight ones finish before shutdown or deploy"],
        m: "sequenceDiagram\n  participant LB as Load balancer\n  participant S as Server 2\n  loop every few seconds\n    LB->>S: GET /health\n    S-->>LB: 200 OK\n  end\n  LB->>S: GET /health\n  S-->>LB: timeout\n  Note over LB,S: After N failures: remove from rotation\n  LB->>S: GET /health\n  S-->>LB: 200 OK\n  Note over LB,S: After M successes: add back" },
      { t: "Sticky sessions vs stateless servers", x: "Sticky sessions (session affinity) send a user's requests to the same server, usually via a cookie or IP hash. They help apps that keep session state in memory, but they fight scaling.",
        pros: ["Works with legacy apps that store sessions in memory", "Can improve local cache hit rates"],
        cons: ["Uneven load: a busy user pins a server", "A server failure loses its users' sessions", "Scaling in or out reshuffles users", "Prefer stateless servers with sessions in Redis or signed tokens"],
        m: "flowchart LR\n  U[\"User A\"] -->|\"cookie: srv=2\"| LB[\"Load balancer\"]:::s0 --> S2[\"Server 2 (holds A's session)\"]:::s1\n  LB -.-> S1[\"Server 1\"]\n  LB -.-> S3[\"Server 3\"]" },
      { t: "TLS termination and L7 features", x: "L7 load balancers often decrypt HTTPS so they can inspect and route requests, and so app servers don't each manage certificates.",
        p: ["TLS termination: HTTPS from client to LB, plain HTTP (or re-encrypted HTTPS) inside the network", "Path- and host-based routing: api.example.com → API pool, /images → image pool", "Header/cookie routing for canary releases (send 5% to the new version)", "Retries, timeouts, rate limits and compression at the edge", "Overlaps with reverse proxies and API gateways (lesson F08)"],
        m: "flowchart LR\n  C[\"Client\"] -->|\"HTTPS\"| LB[\"L7 LB<br/>terminates TLS\"]:::s0\n  LB -->|\"HTTP, 95%\"| V1[\"App v1\"]\n  LB -->|\"HTTP, 5% canary\"| V2[\"App v2\"]:::s1" },
      { t: "Don't let the LB be a single point of failure", x: "One load balancer in front of everything is itself a SPOF. Production setups make the LB layer redundant.",
        p: ["Active–passive pair sharing a virtual IP; the standby takes over on failure (e.g. keepalived using VRRP)", "Active–active: several LBs behind DNS or anycast", "Managed cloud LBs (AWS ELB, Google Cloud LB) are redundant across zones by design", "Spread backend servers across availability zones too"],
        m: "flowchart LR\n  C[\"Clients\"] --> VIP[\"Virtual IP\"]\n  VIP --> A[\"LB active\"]:::s0\n  VIP -.-> P[\"LB standby\"]\n  A <-. \"heartbeat (VRRP)\" .-> P\n  A --> S[\"Servers in zones A, B, C\"]" },
      { t: "Global load balancing", x: "Across regions, traffic is steered before it reaches a regional load balancer, usually with DNS or anycast.",
        p: ["DNS-based (GeoDNS / latency-based routing): answer with the IP of the nearest or healthiest region", "Anycast: the same IP is announced from many locations; routing delivers to the nearest one (used by CDNs and DNS providers)", "DNS caching (TTL) means failover via DNS isn't instant", "Then a regional L7/L4 LB distributes within the region"],
        m: "flowchart LR\n  U1[\"User in Mumbai\"] --> G[\"GeoDNS / anycast\"]:::s0\n  U2[\"User in Frankfurt\"] --> G\n  G --> R1[\"Asia region LB\"]:::s1\n  G --> R2[\"Europe region LB\"]:::s2\n  R1 --> A1[\"App servers\"]\n  R2 --> A2[\"App servers\"]" },
      { t: "Where load balancing happens", x: "Load balancing isn't just one box at the edge; it shows up at several layers.",
        table: [["Layer", "Example"], ["DNS / global", "Route 53 latency routing, Cloudflare, anycast"], ["Edge / regional", "AWS ALB/NLB, NGINX, HAProxy, Envoy, F5 hardware"], ["Service-to-service", "Service mesh sidecars (Envoy in Istio), client-side balancing (gRPC)"], ["Database", "Read traffic spread across replicas by a proxy or driver"]],
        m: "flowchart LR\n  DNS[\"DNS / anycast\"]:::s0 --> EDGE[\"Edge LB\"]:::s1 --> SVC[\"Service A\"]\n  SVC --> MESH[\"Sidecar / client-side LB\"]:::s2 --> SVCB[\"Service B replicas\"]" },
      { t: "Load balancers in interviews", x: "Almost every design has one. Say a sentence or two that shows you know the trade-offs, then move on.",
        p: ["'A redundant L7 load balancer terminates TLS and routes /api to stateless app servers across three zones.'", "'Least connections, because request durations vary.' or 'Consistent hashing, so the same key hits the same cache node.'", "'Health checks every few seconds and connection draining for zero-downtime deploys.'", "For WebSockets: mention long-lived connections and balancing by connection count"],
        m: "flowchart LR\n  C[\"Client\"] --> DNS[\"DNS\"] --> LB[\"Redundant L7 LB<br/>TLS, health checks\"]:::s0 --> APP[\"Stateless app servers\"]:::s2" }
    ],
    widget: { heading: "Load balancer simulator", caption: "Simplified model: fixed request sizes and a toy notion of time. Compare how algorithms spread uneven work.", render: widget },
    examples: [
      ["AWS Elastic Load Balancing", "Offers an Application Load Balancer (L7: path/host routing, HTTP) and a Network Load Balancer (L4: TCP/UDP, very high throughput), both spread across availability zones."],
      ["NGINX and HAProxy", "Widely used open-source software load balancers supporting round robin, least connections and hashing, with health checks."],
      ["Envoy", "An L7 proxy originally built at Lyft, used as the sidecar in service meshes such as Istio for service-to-service load balancing and retries."],
      ["Google Maglev", "Google's software network load balancer (NSDI 2016 paper) uses consistent hashing so connections stick to backends even as the LB fleet changes."]
    ],
    pitfalls: [
      "Drawing one load balancer and never mentioning its redundancy",
      "Using sticky sessions as the default instead of stateless servers",
      "Saying 'round robin' when request costs vary widely",
      "Health checks that only test 'process is up', not 'can serve requests'",
      "Forgetting connection draining during deploys",
      "Relying on DNS failover and forgetting DNS caching delays"
    ],
    quiz: [
      ["What can an L7 load balancer do that an L4 one can't?", ["Forward TCP connections", "Route by URL path or HTTP header", "Use round robin", "Run health checks"], 1, "L7 parses HTTP, so it can route on paths, hosts, headers and cookies. L4 only sees IPs and ports."],
      ["Requests vary from 5 ms to 5 s. Which algorithm usually spreads load best?", ["Round robin", "Least connections", "IP hash", "Random with no feedback"], 1, "Least connections accounts for long-running requests still in progress; round robin ignores them."],
      ["What is connection draining?", ["Closing all connections immediately on failure", "Stopping new requests to a server while letting in-flight ones finish", "Compressing connections", "Encrypting traffic"], 1, "It enables graceful removal of servers during deploys or scale-in."],
      ["Why are sticky sessions discouraged for scalable systems?", ["They require L4", "They cause uneven load and lose sessions on server failure", "They are slower than TLS", "They prevent health checks"], 1, "Pinning users to servers ties state to a single machine. Stateless servers with external session storage avoid that."],
      ["How do you avoid the load balancer itself being a single point of failure?", ["Use a bigger load balancer", "Run redundant LBs (active–passive with a virtual IP, or active–active behind DNS/anycast)", "Remove health checks", "Use sticky sessions"], 1, "Redundancy at the LB tier, or a managed multi-zone LB, removes that SPOF."],
      ["Which technique lets the same IP address be served from many locations, routing users to the nearest one?", ["Round robin DNS", "Anycast", "Sticky sessions", "NAT"], 1, "With anycast, many sites announce the same IP and routing delivers to the topologically closest."],
      ["You want a cache key always to reach the same cache server, even when servers are added. Which balancing approach fits?", ["Round robin", "Least connections", "Consistent hashing", "Random"], 2, "Consistent hashing maps keys to servers and only moves a small fraction of keys when the pool changes."]
    ],
    practice: {
      q: "Design the load balancing for a web app with a REST API, WebSocket-based live notifications and static assets, deployed in two regions. Users are worldwide. What goes where, and how do you handle failures and deploys?",
      a: [
        ["Global layer", "GeoDNS or latency-based DNS (or anycast) sends users to the nearest healthy region; keep DNS TTLs short to speed regional failover."],
        ["Static assets", "Serve from a CDN; the origin is object storage, so static traffic never reaches app LBs."],
        ["Regional L7 LB", "Managed, multi-zone L7 LB terminates TLS; host/path routing sends /api to API servers and /ws to WebSocket servers."],
        ["API pool", "Stateless servers across zones, least connections (or round robin if uniform), health checks on a /health endpoint that checks dependencies lightly."],
        ["WebSocket pool", "Long-lived connections: balance by connection count, set long idle timeouts, and use pub/sub (e.g. Redis) so any server can push to any user."],
        ["Deploys and failures", "Connection draining plus rolling or canary deploys (route 5% via weights); for WebSockets, drain slowly and let clients reconnect with backoff."],
        ["Trade-offs", "TLS termination at the LB vs end-to-end encryption; DNS failover delay vs anycast complexity; cost of cross-zone traffic."]
      ]
    },
    recap: [
      "An LB is the single entry point that spreads traffic over healthy servers.",
      "L4 routes connections by IP:port; L7 routes requests by path, host, header.",
      "Choose the algorithm by workload: round robin, least connections, or hashing.",
      "Health checks + draining make scaling and deploys safe; keep servers stateless.",
      "Make the LB redundant, and use DNS/anycast to balance across regions."
    ]
  });
})();
