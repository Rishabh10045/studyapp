/* Lesson P11: Proximity service (Maps / Yelp nearby) */
(function () {
  "use strict";
  var H = window.HLD;
  var B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  function geohash(lat, lng, len) {
    var la = [-90, 90], ln = [-180, 180], h = "", bit = 0, ch = 0, even = true;
    while (h.length < len) { var r = even ? ln : la, v = even ? lng : lat, mid = (r[0] + r[1]) / 2; if (v >= mid) { ch = ch * 2 + 1; r[0] = mid; } else { ch = ch * 2; r[1] = mid; } even = !even; if (++bit === 5) { h += B32[ch]; bit = 0; ch = 0; } }
    return h;
  }
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
  var R = rng(42), PTS = [];
  for (var i = 0; i < 400; i++) { var cl = R() < 0.5; PTS.push(cl ? [0.55 + (R() - 0.5) * 0.3, 0.45 + (R() - 0.5) * 0.3] : [R(), R()]); }
  // map square ≈ 20 km × 20 km around Mumbai (lat 18.9–19.08, lng 72.8–72.99)
  function toLatLng(x, y) { return [19.08 - y * 0.18, 72.8 + x * 0.19]; }

  function widget(el, ctx) {
    var s = ctx.state; if (!s.div) { s.div = 8; s.r = 1.5; s.qx = 0.5; s.qy = 0.5; }
    el.innerHTML = "<div class='grid2'><label class='field'>Grid cells per side (finer = longer geohash): <strong data-v='div' style='color:var(--text)'></strong><input type='range' min='2' max='32' step='2' data-k='div'></label>" +
      "<label class='field'>Search radius: <strong data-v='r' style='color:var(--text)'></strong><input type='range' min='0.5' max='5' step='0.5' data-k='r'></label></div>" +
      "<p class='caption'>Click the map to move the search point. The map is ~20 km across with 400 places.</p><div data-r='map' style='max-width:520px;cursor:crosshair'></div><div class='metrics' data-r='m'></div>" +
      "<p class='caption'>The grid stands in for geohash/quadtree cells (real geohash cells alternate between longitude and latitude splits). Search = the query's cell + 8 neighbours, then filter by exact distance. Cells smaller than the radius would need more than 3×3 neighbours.</p>";
    var map = el.querySelector("[data-r='map']");
    function draw() {
      ["div", "r"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; }); el.querySelector("[data-v='div']").textContent = s.div + " × " + s.div; el.querySelector("[data-v='r']").textContent = s.r + " km";
      var W = 500, cell = 1 / s.div, cx = Math.floor(s.qx / cell), cy = Math.floor(s.qy / cell), rr = s.r / 20, cand = 0, hit = 0, dots = "";
      PTS.forEach(function (p) {
        var px = Math.floor(p[0] / cell), py = Math.floor(p[1] / cell), inC = Math.abs(px - cx) <= 1 && Math.abs(py - cy) <= 1, d = Math.hypot(p[0] - s.qx, p[1] - s.qy), inR = d <= rr;
        if (inC) cand++; if (inC && inR) hit++;
        dots += "<circle cx='" + p[0] * W + "' cy='" + p[1] * W + "' r='3' fill='" + (inC && inR ? "var(--c0)" : inC ? "var(--c1)" : "var(--other)") + "' opacity='" + (inC ? 1 : 0.45) + "'/>";
      });
      var total = PTS.filter(function (p) { return Math.hypot(p[0] - s.qx, p[1] - s.qy) <= rr; }).length;
      var grid = ""; for (var i = 1; i < s.div; i++) grid += "<line x1='" + i * cell * W + "' y1='0' x2='" + i * cell * W + "' y2='" + W + "' stroke='var(--border)'/><line x1='0' y1='" + i * cell * W + "' x2='" + W + "' y2='" + i * cell * W + "' stroke='var(--border)'/>";
      map.innerHTML = "<svg viewBox='0 0 " + W + " " + W + "' width='100%' role='img' aria-label='Map with grid cells and search radius'><rect width='" + W + "' height='" + W + "' fill='var(--bg-subtle)'/>" + grid +
        "<rect x='" + Math.max(0, (cx - 1) * cell * W) + "' y='" + Math.max(0, (cy - 1) * cell * W) + "' width='" + 3 * cell * W + "' height='" + 3 * cell * W + "' fill='var(--c2)' opacity='.12' stroke='var(--c2)'/>" + dots +
        "<circle cx='" + s.qx * W + "' cy='" + s.qy * W + "' r='" + rr * W + "' fill='none' stroke='var(--danger)' stroke-width='2' stroke-dasharray='5 4'/><circle cx='" + s.qx * W + "' cy='" + s.qy * W + "' r='5' fill='var(--danger)'/></svg>";
      var ll = toLatLng(s.qx, s.qy), cellKm = 20 / s.div;
      el.querySelector("[data-r='m']").innerHTML = [[geohash(ll[0], ll[1], 6), "Real geohash (6 chars) of the point"], [cellKm.toFixed(1) + " km", "Cell size"], [cand, "Candidates in 9 cells"], [hit + " / " + total, "Found / truly within radius"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("") +
        (hit < total ? "<div class='callout' style='border-color:var(--danger)'><strong>Missed results:</strong> cells are smaller than the radius, so 3×3 neighbours don't cover the circle. Use a coarser precision or more rings of neighbours.</div>" : "");
    }
    map.addEventListener("click", function (e) { var b = map.querySelector("svg").getBoundingClientRect(); s.qx = Math.min(0.999, Math.max(0, (e.clientX - b.left) / b.width)); s.qy = Math.min(0.999, Math.max(0, (e.clientY - b.top) / b.height)); ctx.save(); draw(); });
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P11",
    summary: "Find restaurants or places near a location (Yelp/Google Maps 'nearby'): requirements, estimates, API, data model, and geospatial indexing with geohash, quadtrees and S2, neighbour-cell search, caching, read replicas and updates.",
    slides: [
      { t: "1. Requirements", x: "Location search over mostly-static business data.",
        p: ["Functional: given lat/lng and radius (e.g. 0.5–20 km), return nearby businesses, optionally filtered (category, open now) and paginated; view business details; owners add/update businesses", "Non-functional: low latency (< ~200 ms); high availability; read-heavy; business changes can take minutes to hours to appear", "Privacy: don't store users' precise location longer than needed"],
        m: "flowchart LR\n  U[\"User at (19.07, 72.87), 2 km\"] --> PS[\"Proximity service\"]:::s0 --> R[\"Cafés within 2 km, sorted by distance\"]:::s2" },
      { t: "2. Estimates", x: "Example: 200 M businesses, 100 M DAU, 5 searches/day.",
        table: [["Quantity", "Estimate"], ["Search QPS", "500 M/day ≈ 5,800/s, peak ~15k/s"], ["Business records", "200 M × ~1 KB ≈ 200 GB"], ["Geo index (id + geohash/lat/lng)", "200 M × ~30 B ≈ 6 GB — fits in memory on one machine"], ["Writes", "Few: business adds/updates, maybe thousands/hour"]],
        p: ["Key insight: the geo index is small → replicate it widely for read throughput rather than shard it"],
        m: "flowchart LR\n  IDX[\"Geo index ~6 GB\"]:::s0 --> REP[\"replicate to many read servers\"]:::s2" },
      { t: "3. API", x: "Core endpoints.",
        p: ["GET /v1/search/nearby?lat=19.07&lng=72.87&radius=2000&category=cafe&cursor=… → {businesses: [{id, name, distance_m, rating}], next_cursor}", "GET /v1/businesses/{id} → details (cacheable)", "POST/PUT/DELETE /v1/businesses (owners/admins)", "Mobile clients may round the location to protect privacy and improve cache hits"],
        m: "sequenceDiagram\n  participant C as App\n  participant L as LBS\n  participant B as Business service\n  C->>L: GET /search/nearby?lat&lng&radius\n  L-->>C: ids + distances\n  C->>B: GET /businesses/{id} (batched)\n  B-->>C: details" },
      { t: "4. Data model", x: "Business details and a geo index.",
        table: [["Table", "Columns"], ["businesses", "id, name, address, lat, lng, category, hours, rating…"], ["geo_index", "geohash (e.g. 6 chars), business_id — index on geohash"]],
        p: ["Or a single table with lat/lng and a geospatial index (PostGIS GiST, MySQL spatial, Redis GEO, Elasticsearch geo_point)"],
        m: "flowchart LR\n  GI[(\"geo_index: geohash → business ids\")]:::s1 --> BZ[(\"businesses: details\")]:::s0" },
      { t: "5. High-level architecture", x: "Separate read-heavy location search from business management.",
        m: "flowchart LR\n  C[\"Clients\"] --> LB[\"LB\"]\n  LB --> LBS[\"Location-based service (stateless)\"]:::s0\n  LB --> BS[\"Business service\"]:::s0\n  LBS --> GR[(\"Geo index read replicas\")]:::s2\n  LBS --> RC[(\"Redis: geohash → ids\")]:::s2\n  BS --> PDB[(\"Primary DB\")]:::s1\n  PDB -->|\"replication\"| GR\n  BS --> BC[(\"Business detail cache\")]",
        p: ["Writes go to the primary; nightly or near-real-time index updates", "Many read replicas / in-memory index servers for search"] },
      { t: "6. Deep dive: why not a plain lat/lng index?", x: "Two separate B-tree indexes on lat and lng each return a huge band; intersecting them is slow.",
        p: ["WHERE lat BETWEEN … AND lng BETWEEN … → each index scans a strip across the world", "Need an index that keeps nearby points together in one dimension", "Options: geohash, quadtree, Google S2, R-tree (spatial DB indexes)"],
        m: "flowchart LR\n  LAT[\"lat band: millions of rows\"]:::bad --> X[\"intersect\"]\n  LNG[\"lng band: millions of rows\"]:::bad --> X --> SLOW[\"slow\"]" },
      { t: "7. Deep dive: geohash", x: "Interleave longitude and latitude bits and encode in base32; nearby points usually share a prefix.",
        table: [["Length", "Cell size (approx.)"], ["4", "39 km × 19.5 km"], ["5", "4.9 km × 4.9 km"], ["6", "1.2 km × 0.61 km"], ["7", "153 m × 153 m"]],
        p: ["Pick precision from radius; query the cell + its 8 neighbours (handles edge cases where nearby points fall in adjacent cells with different prefixes)", "Then filter by exact distance (haversine) and sort", "Not enough results? Drop a character (bigger cells) and retry"],
        m: "flowchart LR\n  P[\"(19.07, 72.87)\"] --> GH[\"geohash 'te7u…'\"]:::s1 --> N9[\"cell + 8 neighbours\"]:::s0 --> F[\"exact distance filter\"]:::s2" },
      { t: "8. Deep dive: quadtree and S2", x: "Alternatives that adapt to density.",
        p: ["Quadtree: recursively split a square into 4 until each leaf has ≤ N businesses (e.g. 100) → small cells in dense cities, big cells in deserts; built in memory at startup", "Google S2: maps the sphere onto a cube and uses a Hilbert curve to give 64-bit cell ids; region coverings with mixed cell levels", "Geohash is simplest to store in any DB; quadtree adapts to density; S2 is precise on the sphere", "Redis GEO commands store geohash-based scores in sorted sets"],
        m: "flowchart TB\n  ROOT[\"world\"] --> A[\"NW\"]\n  ROOT --> B[\"NE: dense city\"]:::s0\n  ROOT --> C[\"SW\"]\n  ROOT --> D[\"SE\"]\n  B --> B1[\"split again\"]:::s2\n  B --> B2[\"split again\"]:::s2" },
      { t: "9. Bottlenecks and trade-offs", x: "Discussion points.",
        p: ["Reads scale with replicas/in-memory index servers; shard by region only if the index gets very large", "Cache popular cells (geohash → ids) in Redis; business details cached separately", "Updates: business changes propagate in minutes (fine); rebuild quadtrees incrementally or periodically", "Density: fixed geohash precision gives too many results in cities, too few in rural areas → adaptive radius or quadtree", "Ranking: distance + rating + open now + relevance"],
        m: "flowchart LR\n  D[\"Dense city\"]:::bad --> SM[\"smaller cells / quadtree\"]:::s0\n  RU[\"Rural\"]:::s1 --> EX[\"expand radius\"]:::s2" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Small geo index (~GBs) replicated widely; business details in a DB + cache", "Geohash with cell + 8 neighbours, then exact distance filter (or quadtree/S2)", "Precision chosen from the radius; expand if too few results", "Writes rare and eventually consistent; reads cached by cell", "Rank by distance and quality signals"],
        m: "flowchart LR\n  Q[\"lat, lng, r\"] --> C[\"cells\"]:::s1 --> IDS[\"ids\"]:::s0 --> F[\"filter + rank\"]:::s2 --> D[\"details\"]" }
    ],
    widget: { heading: "Geohash-style cell search", caption: "Move the search point, change cell size and radius: see the 3×3 cell search, candidates, and when it misses results.", render: widget },
    examples: [
      ["Geohash", "Invented by Gustavo Niemeyer and released in 2008 as a public-domain geocoding system."],
      ["Google S2", "Open-source geometry library used by Google; cells come from projecting the sphere onto a cube and ordering with a Hilbert curve."],
      ["Uber H3", "Uber open-sourced H3 (2018), a hierarchical hexagonal grid used for geospatial analysis and pricing."],
      ["Redis GEO", "GEOADD and GEOSEARCH store locations as geohash-based sorted-set scores and query by radius or box."]
    ],
    pitfalls: [
      "Separate B-tree indexes on lat and lng for radius search",
      "Querying only the point's own geohash cell (misses nearby points across edges)",
      "Sharding a small index instead of replicating it",
      "Fixed precision regardless of density",
      "Skipping the exact distance filter after the cell lookup",
      "Storing users' precise locations without need"
    ],
    quiz: [
      ["Why query the 8 neighbouring geohash cells too?", ["For speed", "Nearby points can fall in adjacent cells with different prefixes", "To sort results", "Required by S2"], 1, "Edges of cells split close points."],
      ["A 6-character geohash cell is roughly…", ["39 km", "4.9 km", "1.2 km × 0.6 km", "15 m"], 2, "Each extra char shrinks the cell."],
      ["The geo index for 200 M businesses is ~6 GB. Best scaling approach?", ["Shard across 100 nodes", "Replicate it to many read servers / in memory", "Store it in a CDN", "Recompute per request"], 1, "Small data, read-heavy → replicate."],
      ["Advantage of a quadtree over fixed geohash precision?", ["Simpler to store", "Adapts cell size to density", "No neighbours needed", "Works offline"], 1, "Leaves split until ≤ N items."],
      ["After finding candidates in cells, you must…", ["Return them as is", "Filter by exact distance and sort", "Delete duplicates only", "Geocode again"], 1, "Cells are squares; the radius is a circle."],
      ["Why can business updates be eventually consistent?", ["They're rare and a few minutes' delay is acceptable", "Users don't care", "DBs can't be consistent", "Caches require it"], 0, "Read-heavy, slow-changing data."],
      ["Which uses a Hilbert curve on a cube projection?", ["Geohash", "Google S2", "Quadtree", "R-tree"], 1, "64-bit S2 cell ids."],
      ["Too few results in a rural area. Fix?", ["Return nothing", "Expand radius / use a shorter geohash prefix", "Lower ratings", "Use SQL LIKE"], 1, "Progressively widen the search."]
    ],
    practice: {
      q: "Change the problem: show friends' live locations within 5 km (like 'Nearby friends'), where each user's location updates every 30 seconds.",
      a: [
        ["Difference", "Data is dynamic: 30-second updates from millions of users, not static businesses."],
        ["Writes", "100 M active × 1/30 s ≈ 3.3 M updates/s → in-memory store (Redis) of user → (lat, lng, ts) with TTL, sharded by user_id; no long-term history (privacy)."],
        ["Fan-out", "Each user only cares about friends (hundreds): on update, publish to a channel per user; friends' connection servers (WebSocket, F18) subscribed to those channels compute distance and push if within 5 km."],
        ["Alternative", "Geo index of live users (geohash buckets in Redis) — but queries are friend-scoped, so pub/sub per friend is simpler."],
        ["Scaling", "Redis pub/sub cluster sharded by channel; connection servers hold subscriptions for online friends only."],
        ["Trade-offs", "Pub/sub fan-out cost grows with friends × update rate; reduce with coarser updates when users are still, and only for opted-in users."]
      ]
    },
    recap: [
      "Static business locations, read-heavy: replicate a small geo index widely.",
      "Plain lat/lng indexes don't work; use geohash, quadtree, S2 or spatial indexes.",
      "Geohash search: cell + 8 neighbours → exact distance → sort.",
      "Choose precision from radius; expand for sparse areas; quadtree adapts to density.",
      "Cache by cell; updates propagate eventually."
    ]
  });
})();
