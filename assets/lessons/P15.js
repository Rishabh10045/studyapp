/* Lesson P15: Ride hailing (Uber) */
(function () {
  "use strict";
  var H = window.HLD;
  var STATES = ["REQUESTED", "MATCHING", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "IN_TRIP", "COMPLETED"];

  function widget(el, ctx) {
    var s = ctx.state; if (!s.drivers) { s.drivers = 1; s.every = 4; s.speed = 30; s.st = 0; s.cancel = false; }
    el.innerHTML = "<div class='grid3'><label class='field'>Online drivers (millions): <strong data-v='drivers' style='color:var(--text)'></strong><input type='range' min='0.1' max='5' step='0.1' data-k='drivers'></label>" +
      "<label class='field'>Location update every: <strong data-v='every' style='color:var(--text)'></strong><input type='range' min='1' max='30' data-k='every'></label>" +
      "<label class='field'>Average driver speed: <strong data-v='speed' style='color:var(--text)'></strong><input type='range' min='5' max='80' step='5' data-k='speed'></label></div>" +
      "<div class='metrics' data-r='m'></div>" +
      "<h4 style='margin:16px 0 6px'>Trip state machine</h4><div data-r='sm' style='display:flex;flex-wrap:wrap;gap:6px;align-items:center'></div>" +
      "<div class='controls'><button class='btn primary' data-a='next'>Next event</button><button class='btn' data-a='cancel'>Rider cancels</button><button class='btn' data-a='reset'>New trip</button></div><p class='caption' data-r='ev'></p>" +
      "<p class='caption'>Location numbers are simple arithmetic: writes = drivers ÷ interval; staleness = distance driven between updates. ~100 bytes per update.</p>";
    var EV = ["Rider requests a ride (idempotency key) — fare estimate locked", "Matching service queries the geo index for nearby available drivers and ranks by ETA", "Offer sent to the best driver; driver accepts → driver marked unavailable atomically", "Driver drives to pickup; rider sees live location via WebSocket", "Pickup confirmed; trip in progress; locations recorded for the route", "Drop-off: fare computed, payment charged with idempotency key, receipts sent"];
    function draw() {
      ["drivers", "every", "speed"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      el.querySelector("[data-v='drivers']").textContent = s.drivers + " M"; el.querySelector("[data-v='every']").textContent = s.every + " s"; el.querySelector("[data-v='speed']").textContent = s.speed + " km/h";
      var w = s.drivers * 1e6 / s.every, stale = s.speed * 1000 / 3600 * s.every;
      el.querySelector("[data-r='m']").innerHTML = [[Math.round(w).toLocaleString() + "/s", "Location writes"], [(w * 100 * 8 / 1e6).toFixed(0) + " Mbit/s", "Ingest bandwidth"], [Math.round(stale) + " m", "Max position staleness"], [(w * 86400 * 100 / 1e12).toFixed(1) + " TB/day", "If every update is archived"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      el.querySelector("[data-r='sm']").innerHTML = STATES.map(function (x, i) { var cls = s.cancel && i === s.st ? "danger" : i < s.st ? "success" : i === s.st ? "warning" : ""; return (i ? "<span>→</span>" : "") + "<span class='pill " + cls + "'>" + (s.cancel && i === s.st ? "CANCELLED" : x) + "</span>"; }).join("");
      el.querySelector("[data-r='ev']").textContent = s.cancel ? "Rider cancelled: driver released back to the available pool; cancellation fee rules applied if the driver was already on the way." : EV[s.st];
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    el.addEventListener("click", function (e) { var a = e.target.getAttribute("data-a"); if (!a) return; if (a === "next" && !s.cancel) s.st = Math.min(STATES.length - 1, s.st + 1); if (a === "cancel" && s.st < 4) s.cancel = true; if (a === "reset") { s.st = 0; s.cancel = false; } ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "P15",
    summary: "Design a ride-hailing service: requirements, estimates, APIs, data model, high-frequency driver location ingestion, geospatial matching of riders to drivers, the trip state machine, real-time updates, payments with idempotency, surge pricing and city-based sharding.",
    slides: [
      { t: "1. Requirements", x: "Core rider and driver flows.",
        p: ["Functional: riders see nearby cars and an ETA/fare estimate; request a ride; get matched with a nearby driver; both see live locations; trip lifecycle (pickup, drop-off); payment and receipts; ratings", "Non-functional: matching within seconds; location updates near real time; a driver is never assigned two trips at once (consistency); high availability; works at city scale worldwide", "Out of scope (ask): pooling, food delivery, scheduled rides"],
        m: "flowchart LR\n  R[\"Rider\"] -->|\"request\"| U[\"Ride service\"]:::s0 -->|\"offer\"| D[\"Driver\"]\n  D -->|\"location every 4 s\"| U" },
      { t: "2. Estimates", x: "Example: 1 M drivers online at peak, 20 M trips/day.",
        table: [["Quantity", "Estimate"], ["Location updates (every 4 s)", "1 M ÷ 4 = 250k writes/s"], ["Trips", "20 M/day ≈ 230/s avg, peaks ~1–2k/s"], ["Nearby-driver queries", "riders opening the app: tens of thousands/s"], ["Location history", "250k × 100 B ≈ 25 MB/s ≈ 2 TB/day (if archived)"]],
        p: ["Insight: location writes dominate; keep current locations in memory, history in a log/batch store"],
        m: "flowchart LR\n  L[\"250k location writes/s\"]:::bad --> MEM[(\"in-memory geo index\")]:::s2\n  L --> LOG[(\"Kafka → history\")]:::s1" },
      { t: "3. API", x: "Mobile apps talk over HTTPS plus a persistent connection for live updates.",
        p: ["POST /v1/estimates {pickup, dropoff} → {fare, eta, estimate_id}", "POST /v1/rides {estimate_id} + Idempotency-Key → {ride_id, status}", "Driver: PUT /v1/drivers/me/location {lat, lng, heading, ts} (or over the socket); PUT /v1/drivers/me/status (online/offline)", "Driver: POST /v1/offers/{id}/accept | decline", "POST /v1/rides/{id}/cancel; live updates pushed via WebSocket/SSE (F18)"],
        m: "sequenceDiagram\n  participant R as Rider app\n  participant A as API\n  participant D as Driver app\n  R->>A: POST /rides (Idempotency-Key)\n  A->>D: offer (push / socket)\n  D->>A: accept\n  A-->>R: driver assigned + ETA" },
      { t: "4. Data model", x: "Hot, ephemeral state vs durable records.",
        table: [["Data", "Store"], ["Current driver location + status", "In-memory geo index (Redis GEO / custom), sharded by city/cell"], ["Trips", "SQL (sharded by city or rider), with a status column and version"], ["Users, drivers, vehicles", "SQL"], ["Location history / route", "Kafka → object storage / wide-column"], ["Payments", "Payment service ledger (P18)"]],
        m: "flowchart LR\n  HOT[(\"driver locations (memory)\")]:::s2\n  TR[(\"trips (SQL)\")]:::s0\n  HIS[(\"history (Kafka → storage)\")]:::s1" },
      { t: "5. High-level architecture", x: "Location ingestion, matching and trip management as separate services.",
        m: "flowchart LR\n  DA[\"Driver apps\"] -->|\"socket\"| GW[\"Connection gateways\"]:::s1\n  RA[\"Rider apps\"] --> GW\n  GW --> LOC[\"Location service\"]:::s0 --> GEO[(\"Geo index (by city/cell)\")]:::s2\n  LOC --> K[(\"Kafka: locations\")]\n  GW --> TRIP[\"Trip service (state machine)\"]:::s0 --> TDB[(\"Trips DB\")]\n  TRIP --> MAT[\"Matching / dispatch\"]:::s0 --> GEO\n  MAT --> ETA[\"ETA / routing service\"]\n  TRIP --> PAY[\"Payment service\"]\n  K --> SURGE[\"Pricing / surge\"]" },
      { t: "6. Deep dive: location ingestion and geo index", x: "250k writes/s of tiny, constantly overwritten records.",
        p: ["Drivers send updates every few seconds over a persistent connection", "Location service updates an in-memory index keyed by geospatial cell (geohash/S2/H3, P11) — remove from old cell, add to new", "Shard by city/region: matching only needs local drivers", "Also publish to Kafka for ETAs, surge, fraud and trip routes", "Old entries expire (driver went offline without notice)"],
        m: "flowchart LR\n  U[\"update (driver 7, lat, lng)\"] --> C{\"cell changed?\"}\n  C -->|\"yes\"| MV[\"remove from old cell, add to new\"]:::s0\n  C -->|\"no\"| UP[\"update position\"]:::s0\n  MV --> TTL[\"refresh TTL\"]:::s1\n  UP --> TTL" },
      { t: "7. Deep dive: matching", x: "Find the best available driver quickly, without double-assigning.",
        p: ["Query nearby cells for available drivers, expanding the radius if needed", "Rank by ETA on the road network (not straight-line distance)", "Send an offer to one driver with a timeout (e.g. 10–15 s); on decline/timeout, try the next", "Atomically mark the driver as reserved (conditional update / compare-and-set on driver status) to prevent two trips", "Batch matching (solving many requests together) can improve global efficiency"],
        m: "flowchart LR\n  REQ[\"ride request\"] --> NB[\"nearby available drivers\"]:::s2 --> RK[\"rank by ETA\"]:::s0 --> LOCK{\"CAS driver: available → reserved\"}:::s1\n  LOCK -->|\"ok\"| OF[\"offer, 15 s timeout\"]\n  LOCK -->|\"taken\"| RK\n  OF -->|\"declined / timeout\"| RK" },
      { t: "8. Deep dive: trip state machine and payments", x: "Correctness lives in the trip record.",
        p: ["States: REQUESTED → MATCHING → DRIVER_ASSIGNED → ARRIVING → IN_TRIP → COMPLETED (or CANCELLED)", "Transitions are conditional updates with a version check (F27) so concurrent events don't conflict", "Every client action carries an idempotency key; retries are safe (F24)", "Trip completion emits an event; payment service charges with idempotency key = trip_id", "Live updates to both apps over WebSockets; push notifications if the app is backgrounded"],
        m: "stateDiagram-v2\n  [*] --> Requested\n  Requested --> Matching\n  Matching --> DriverAssigned: driver accepts\n  Matching --> Cancelled: no drivers / rider cancels\n  DriverAssigned --> Arriving\n  Arriving --> InTrip: pickup\n  Arriving --> Cancelled: cancel\n  InTrip --> Completed: drop-off\n  Completed --> [*]" },
      { t: "9. Bottlenecks and trade-offs", x: "Discussion points.",
        p: ["Update frequency vs load and battery: adaptive intervals (more often when on a trip)", "Hot cities/events (concert ending): shard by finer cells; surge pricing balances supply and demand", "Consistency where it matters (driver assignment, trip state, payment) vs eventual elsewhere (map dots)", "Regional failure: cities pinned to a region with failover", "Matching quality vs speed: greedy nearest vs batched optimisation"],
        m: "flowchart LR\n  ST[\"Strong: assignment, trip, payment\"]:::s0\n  EV[\"Eventual: nearby car dots, ETAs\"]:::s2" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Drivers stream locations over persistent connections → in-memory geo index sharded by city/cell + Kafka", "Matching: nearby cells → ETA ranking → atomic driver reservation → offer with timeout", "Trip service: versioned state machine with idempotent actions", "Live updates via WebSockets; payments with idempotency keys after completion", "Surge pricing and analytics from the location stream"],
        m: "flowchart LR\n  LOC[\"Locations\"]:::s2 --> MAT[\"Match\"]:::s0 --> TRIP[\"Trip state\"]:::s1 --> PAY[\"Pay\"]" }
    ],
    widget: { heading: "Location load and trip state machine", caption: "Size the location stream and its staleness, then step through a trip (or cancel it).", render: widget },
    examples: [
      ["Uber H3", "Uber open-sourced H3, a hexagonal hierarchical grid, used for things like supply/demand analysis and dynamic pricing."],
      ["Uber Ringpop", "Uber's early dispatch system used Ringpop, a Node.js library for consistent hashing and gossip-based membership to shard state across nodes."],
      ["Lyft", "Has written about its real-time location and ETA systems and matching marketplace."],
      ["Surge pricing", "Ride-hailing apps raise prices in high-demand areas to attract drivers and balance supply with demand."]
    ],
    pitfalls: [
      "Writing every location update to the main SQL database",
      "Straight-line distance instead of road ETA for ranking",
      "Assigning a driver without an atomic status check (double booking)",
      "Non-idempotent ride requests and payments",
      "One global shard instead of city/region partitioning",
      "Polling for live trip updates instead of push"
    ],
    quiz: [
      ["1 M drivers updating every 4 s produce…", ["25k writes/s", "250k writes/s", "2.5 M writes/s", "4 M writes/s"], 1, "10⁶ ÷ 4."],
      ["Where should current driver locations live?", ["Main SQL DB", "An in-memory geo index sharded by city/cell", "Object storage", "CDN"], 1, "Hot, ephemeral, overwritten constantly."],
      ["How do you avoid assigning one driver to two riders?", ["Hope", "Atomic compare-and-set on driver status before offering", "Assign randomly", "Use the CDN"], 1, "Conditional update: available → reserved."],
      ["Why rank by ETA rather than distance?", ["It's faster to compute", "Road networks, one-way streets and traffic make distance misleading", "Riders prefer it", "Regulations"], 1, "Nearest by air may be far by road."],
      ["Best way to keep trip state consistent under concurrent events?", ["Last write wins", "Versioned conditional updates in a state machine", "Client decides", "Cache only"], 1, "Rejects invalid or stale transitions."],
      ["How are live driver positions shown to the rider?", ["Rider polls every 100 ms", "Pushed over a WebSocket/persistent connection", "Email", "SMS"], 1, "Real-time push."],
      ["What does surge pricing balance?", ["Server load", "Rider demand vs driver supply in an area", "Database shards", "Battery use"], 1, "Price signals bring drivers."],
      ["Natural sharding key for matching?", ["Rider name", "City / geographic cell", "Payment method", "Driver age"], 1, "Matching is local."]
    ],
    practice: {
      q: "A stadium concert ends: 50,000 ride requests in 10 minutes within 1 km², with few drivers nearby. How should the system behave?",
      a: [
        ["Load", "Rate-limit and queue requests per cell; the trip service accepts with 202 and shows 'finding a driver' rather than failing."],
        ["Geo hotspot", "Split the hot cell into finer cells/shards; dedicate matching capacity to the event area (pre-provisioned for known events)."],
        ["Supply", "Surge pricing in the area to attract drivers; notify nearby offline drivers; suggest walking to designated pickup zones to reduce congestion."],
        ["Matching", "Batch matching every few seconds instead of greedy one-by-one to improve total ETAs."],
        ["Fairness", "FIFO-ish queue with ETAs shown; let riders cancel without fee while unmatched."],
        ["Resilience", "Protect downstream (ETA service) with caches and circuit breakers; degrade to straight-line ETAs if routing is overloaded."]
      ]
    },
    recap: [
      "Location writes dominate: keep current positions in memory, history in Kafka.",
      "Shard by city/cell; query nearby cells and rank by road ETA.",
      "Reserve drivers atomically; offers time out and fall through.",
      "Trip = versioned state machine; idempotent actions and payments.",
      "Push live updates over WebSockets; surge balances supply and demand."
    ]
  });
})();
