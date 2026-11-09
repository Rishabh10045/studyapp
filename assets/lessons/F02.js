/* Lesson F02: Latency, throughput & availability */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state;
    if (!s.tiers) s.tiers = [[2, 2], [2, 3], [2, 1]];
    if (s.fan === undefined) { s.fan = 10; s.slow = 1; }
    var NAMES = ["Load balancer", "App servers", "Database"];
    var AV = [0.99, 0.999, 0.9995, 0.9999];
    var AVL = ["99%", "99.9%", "99.95%", "99.99%"];
    el.innerHTML =
      "<div class='card'><h3>1 · Availability of a 3-tier system</h3><p class='caption'>Simplified model: tiers in series, replicas in parallel, independent failures, instant failover.</p><div data-r='tiers' style='display:flex;flex-direction:column;gap:10px'></div><div class='metrics' data-r='out' style='margin-top:14px'></div></div>" +
      "<div class='card'><h3>2 · Tail latency under fan-out</h3><p class='caption'>Each backend call is independently 'slow' with the chosen probability; the request waits for the slowest call.</p>" +
      "<label class='field'>Backends called per request: <strong data-r='fl' style='color:var(--text)'></strong></label><input type='range' min='1' max='200' data-r='fan'>" +
      "<label class='field' style='margin-top:10px'>Chance one call is slow: <strong data-r='sl' style='color:var(--text)'></strong></label><input type='range' min='1' max='10' data-r='slow'>" +
      "<div class='metrics' data-r='out2' style='margin-top:14px'></div></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function pct(x, d) { return (x * 100).toFixed(d === undefined ? 4 : d).replace(/\.?0+$/, "") + "%"; }
    function dur(minutes) { return minutes >= 120 ? (minutes / 60).toFixed(1) + " h" : minutes >= 1 ? minutes.toFixed(1) + " min" : (minutes * 60).toFixed(0) + " s"; }
    function draw() {
      q("tiers").innerHTML = NAMES.map(function (n, i) {
        var t = s.tiers[i];
        return "<div style='display:flex;flex-wrap:wrap;gap:8px;align-items:center'><span style='min-width:120px;font-weight:600'>" + n + "</span>" +
          "<span class='seg'>" + AVL.map(function (l, k) { return "<button type='button' data-t='" + i + "' data-a='" + k + "' class='" + (t[0] === k ? "on" : "") + "'>" + l + "</button>"; }).join("") + "</span>" +
          "<span class='seg'>" + [1, 2, 3].map(function (r) { return "<button type='button' data-t='" + i + "' data-n='" + r + "' class='" + (t[1] === r ? "on" : "") + "'>×" + r + "</button>"; }).join("") + "</span></div>";
      }).join("");
      var total = 1;
      s.tiers.forEach(function (t) { total *= 1 - Math.pow(1 - AV[t[0]], t[1]); });
      var downYear = (1 - total) * 365 * 24 * 60, downMonth = (1 - total) * 30 * 24 * 60;
      q("out").innerHTML = [[pct(total), "System availability"], [dur(downYear), "Expected downtime / year"], [dur(downMonth), "Expected downtime / 30 days"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      q("fan").value = s.fan; q("slow").value = s.slow; q("fl").textContent = s.fan; q("sl").textContent = s.slow + "%";
      var pSlow = 1 - Math.pow(1 - s.slow / 100, s.fan);
      q("out2").innerHTML = [[pct(pSlow, 1), "Requests that hit at least one slow call"], [s.slow + "%", "Slow calls per backend"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    }
    q("tiers").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var i = +b.getAttribute("data-t");
      if (b.hasAttribute("data-a")) s.tiers[i][0] = +b.getAttribute("data-a"); else s.tiers[i][1] = +b.getAttribute("data-n");
      ctx.save(); draw();
    });
    q("fan").addEventListener("input", function (e) { s.fan = +e.target.value; ctx.save(); draw(); });
    q("slow").addEventListener("input", function (e) { s.slow = +e.target.value; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F02",
    summary: "The three numbers every non-functional requirement is written in: how fast (latency), how much (throughput) and how often it works (availability), plus percentiles, Little's Law, nines, and SLIs, SLOs and SLAs.",
    slides: [
      { t: "Why these three numbers matter", x: "Functional requirements say what a system does; non-functional requirements say how well. Most of them are stated as latency, throughput or availability targets.",
        p: ["Latency: how long one request takes", "Throughput: how many requests (or bytes) the system handles per unit of time", "Availability: the fraction of time the system serves requests successfully", "In interviews, state targets early, e.g. 'p99 under 200 ms, 10k QPS peak, 99.9% available'"],
        m: "flowchart LR\n  R[\"Non-functional requirements\"]:::s0 --> L[\"Latency<br/>how fast\"]\n  R --> T[\"Throughput<br/>how much\"]\n  R --> A[\"Availability<br/>how often it works\"]\n  L --> D[\"Design choices: cache, CDN, replicas, queues, redundancy\"]\n  T --> D\n  A --> D" },
      { t: "Latency: where the time goes", x: "End-to-end latency is the sum of every hop: network round trips, waiting in queues, processing, and I/O to caches, databases and other services.",
        p: ["Network: DNS, TCP and TLS handshakes, physical distance (light in fibre is not instant)", "Queueing: waiting for a free thread, connection or CPU", "Processing: your code, serialisation", "I/O: cache, database, disk, downstream services", "Calls made one after another add up; independent calls can run in parallel"],
        m: "sequenceDiagram\n  participant C as Client\n  participant LB as Load balancer\n  participant A as App\n  participant K as Cache\n  participant D as Database\n  C->>LB: request (network)\n  LB->>A: forward\n  A->>K: lookup\n  K-->>A: miss\n  A->>D: query (I/O)\n  D-->>A: rows\n  A-->>C: response\n  Note over C,D: Total latency = sum of every hop on the critical path" },
      { t: "Percentiles, not averages", x: "Latency is a distribution. The average hides the slow requests users actually notice, so measure percentiles.",
        p: ["p50 (median): half of requests are faster than this", "p95 / p99: 95% / 99% of requests are faster; the rest form the tail", "A few very slow requests barely move the mean but ruin p99", "Heavy users often make the most requests, so they hit the tail most", "Set targets like 'p99 < 300 ms', and measure over a time window"],
        svg: function () {
          var bars = [2, 6, 14, 22, 20, 14, 9, 5, 3, 2, 1, 1, 1];
          var w = 640, h = 220, bw = 40, s = "<svg width='100%' viewBox='0 0 " + w + " " + h + "' role='img' aria-label='Latency histogram with p50 and p99 markers'>";
          bars.forEach(function (v, i) { var bh = v * 7; s += "<rect x='" + (30 + i * (bw + 6)) + "' y='" + (180 - bh) + "' width='" + bw + "' height='" + bh + "' rx='3' style='fill:var(--c0);opacity:" + (i >= 10 ? 1 : 0.55) + "'/>"; });
          s += "<line x1='30' y1='181' x2='630' y2='181' style='stroke:var(--border-strong)'/>";
          s += "<line x1='" + (30 + 4 * 46 + 20) + "' y1='20' x2='" + (30 + 4 * 46 + 20) + "' y2='180' style='stroke:var(--text-2);stroke-dasharray:4 4'/><text x='" + (30 + 4 * 46 + 26) + "' y='30' style='fill:var(--text-2);font-size:13px'>p50</text>";
          s += "<line x1='" + (30 + 10 * 46) + "' y1='20' x2='" + (30 + 10 * 46) + "' y2='180' style='stroke:var(--c1);stroke-dasharray:4 4'/><text x='" + (30 + 10 * 46 + 6) + "' y='30' style='fill:var(--text-2);font-size:13px'>p99: the tail</text>";
          s += "<text x='30' y='205' style='fill:var(--text-3);font-size:12px'>fast</text><text x='600' y='205' style='fill:var(--text-3);font-size:12px'>slow</text><text x='240' y='212' style='fill:var(--text-3);font-size:12px'>Illustrative latency distribution (not real data)</text></svg>";
          return s;
        } },
      { t: "Tail latency gets worse with fan-out", x: "When one user request calls many backends in parallel, it waits for the slowest one, so rare slow calls become common slow requests.",
        p: ["If each of 100 backends is slow 1% of the time, 1 − 0.99^100 ≈ 63% of requests hit at least one slow call", "Described in Google's paper 'The Tail at Scale' (Dean & Barroso, 2013)", "Mitigations: hedged requests (send a backup request after a delay), timeouts, fewer fan-out hops, caching", "Try it in the interactive model below"],
        m: "flowchart LR\n  U[\"User request\"]:::s0 --> A[\"Aggregator\"]\n  A --> B1[\"Backend 1\"]\n  A --> B2[\"Backend 2\"]\n  A --> B3[\"Backend 3 (slow)\"]:::bad\n  A --> B4[\"... Backend N\"]\n  B3 -. \"response waits for the slowest\" .-> A" },
      { t: "Throughput and Little's Law", x: "Throughput is work completed per unit of time: requests per second (QPS/RPS), messages per second, or bytes per second (bandwidth).",
        p: ["Little's Law: L = λ × W (items in the system = arrival rate × time each spends there)", "Example: 1,000 requests/s × 0.2 s each = 200 requests in flight at once", "Use it to size thread pools, connection pools and worker counts", "Bandwidth: 1,000 requests/s × 500 KB = 500 MB/s, about 4 Gbit/s"],
        table: [["Quantity", "Symbol", "Example"], ["Arrival rate (throughput)", "λ", "1,000 req/s"], ["Time in system (latency)", "W", "0.2 s"], ["Concurrent requests", "L = λW", "200"]],
        m: "flowchart LR\n  In[\"Arrivals λ = 1,000/s\"] --> Sys[\"System: each request stays W = 0.2 s\"]:::s0 --> Out[\"Completions\"]\n  Sys -.-> L[\"In flight: L = λW = 200\"]:::s1" },
      { t: "The latency–throughput trade-off", x: "Pushing a system towards 100% utilisation increases throughput only up to a point; beyond that, requests queue and latency shoots up.",
        p: ["Queueing theory (simplified M/M/1 model): waiting time grows like 1 / (1 − utilisation)", "At 50% busy, a request waits about as long as the service time; at 90%, about 9x; near 100%, unbounded", "So plan headroom: many teams target well below full CPU utilisation", "Batching raises throughput but adds latency to each item"],
        svg: function () {
          var s = "<svg width='100%' viewBox='0 0 640 230' role='img' aria-label='Queueing delay rises sharply as utilisation approaches 100%'>", pts = [];
          for (var u = 0; u <= 0.95; u += 0.025) pts.push([60 + u * 560, 190 - Math.min(170, (u / (1 - u)) * 9)]);
          s += "<polyline fill='none' stroke-width='3' style='stroke:var(--c0)' points='" + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + "'/>";
          s += "<line x1='60' y1='190' x2='620' y2='190' style='stroke:var(--border-strong)'/><line x1='60' y1='20' x2='60' y2='190' style='stroke:var(--border-strong)'/>";
          [0, 0.5, 0.9].forEach(function (u) { var x = 60 + u * 560; s += "<text x='" + x + "' y='208' text-anchor='middle' style='fill:var(--text-3);font-size:12px'>" + Math.round(u * 100) + "%</text>"; });
          s += "<text x='340' y='226' text-anchor='middle' style='fill:var(--text-2);font-size:12px'>Utilisation</text><text x='70' y='30' style='fill:var(--text-2);font-size:12px'>Queueing delay (relative, M/M/1 model)</text></svg>";
          return s;
        } },
      { t: "Availability and the nines", x: "Availability = successful time (or requests) ÷ total. It is usually quoted in 'nines'. Each extra nine cuts allowed downtime by 10x.",
        table: [["Availability", "Downtime / year", "Downtime / 30 days"], ["99% (two nines)", "3.65 days", "7.2 hours"], ["99.9% (three nines)", "8.76 hours", "43.2 minutes"], ["99.95%", "4.38 hours", "21.6 minutes"], ["99.99% (four nines)", "52.6 minutes", "4.32 minutes"], ["99.999% (five nines)", "5.26 minutes", "25.9 seconds"]],
        p: ["Request-based availability: successful requests ÷ total requests", "Durability (data not lost) is different from availability (data reachable)"],
        m: "flowchart LR\n  N2[\"99%<br/>3.65 days/yr\"] --> N3[\"99.9%<br/>8.76 h/yr\"]:::s0 --> N4[\"99.99%<br/>52.6 min/yr\"]:::s1 --> N5[\"99.999%<br/>5.26 min/yr\"]:::s2" },
      { t: "Availability in series and in parallel", x: "Components a request must pass through multiply their availability. Redundant copies in parallel only fail if all fail.",
        p: ["Series: A = A1 × A2 × … ; two 99.9% components give about 99.8%", "Parallel: A = 1 − (1 − A)^n ; two 99.9% replicas give 99.9999% (if failures are independent)", "Real failures are often correlated (same zone, same bug, same deploy), so real gains are smaller", "Every extra dependency on the critical path lowers availability"],
        m: "flowchart LR\n  subgraph Series\n    S1[\"LB 99.9%\"] --> S2[\"App 99.9%\"] --> S3[\"DB 99.9%\"]\n  end\n  subgraph Parallel\n    P0[\"Request\"] --> P1[\"Replica A 99.9%\"]\n    P0 --> P2[\"Replica B 99.9%\"]\n  end\n  Series -.-> R1[\"≈ 99.7% overall\"]:::bad\n  Parallel -.-> R2[\"≈ 99.9999% (independent failures)\"]:::s2" },
      { t: "MTBF, MTTR and why recovery speed matters", x: "Availability = MTBF ÷ (MTBF + MTTR). You can raise it by failing less often or by recovering faster.",
        p: ["MTBF: mean time between failures", "MTTR: mean time to recovery (detect + diagnose + fix)", "Fast detection (alerts on SLOs), automatic failover and quick rollbacks cut MTTR", "Halving MTTR has the same effect on availability as doubling MTBF"],
        m: "flowchart LR\n  Up1[\"Up (MTBF)\"]:::s2 --> F[\"Failure\"]:::bad --> Det[\"Detect\"] --> Fix[\"Mitigate / roll back\"] --> Up2[\"Up again\"]:::s2\n  Det -. \"MTTR\" .-> Fix" },
      { t: "SLIs, SLOs, SLAs and error budgets", x: "This vocabulary comes from Google's Site Reliability Engineering practice and is now standard.",
        p: ["SLI: the measurement, e.g. % of requests served successfully under 300 ms", "SLO: the internal target for an SLI, e.g. 99.9% over 30 days", "SLA: the external contract, with penalties; looser than the SLO", "Error budget = 100% − SLO; a 99.9% monthly SLO allows about 43 minutes of failure", "Budget left → ship faster; budget spent → focus on reliability"],
        m: "flowchart LR\n  SLI[\"SLI: what you measure\"]:::s0 --> SLO[\"SLO: your target\"]:::s1 --> SLA[\"SLA: contract with customers\"]:::s2\n  SLO --> EB[\"Error budget = 100% − SLO\"]" },
      { t: "Levers to improve each number", x: "Most designs combine a few standard levers. In interviews, tie each one to the number it improves.",
        table: [["Goal", "Common levers"], ["Lower latency", "Caching, CDN, fewer hops, parallel calls, data close to users, indexes"], ["Higher throughput", "Horizontal scaling, async queues, batching, partitioning"], ["Higher availability", "Redundancy across zones, health checks, failover, timeouts and retries with backoff, graceful degradation"]],
        m: "flowchart LR\n  C[\"Cache / CDN\"] --> L[\"Latency\"]:::s0\n  Q[\"Queues, batching, scale-out\"] --> T[\"Throughput\"]:::s1\n  R[\"Redundancy, failover, timeouts\"] --> A[\"Availability\"]:::s2" }
    ],
    widget: { heading: "Interactive: availability and tail latency", caption: "Simplified models for intuition, not capacity planning.", render: widget },
    examples: [
      ["Google: 'The Tail at Scale'", "Dean and Barroso (Communications of the ACM, 2013) showed how fan-out turns rare slow servers into common slow requests, and proposed hedged and tied requests to cut tail latency."],
      ["Google SRE: error budgets", "The 'Site Reliability Engineering' book (O'Reilly, 2016) popularised SLIs, SLOs and error budgets as a way to balance release speed against reliability."],
      ["Amazon S3: durability vs availability", "AWS documents S3 Standard as designed for 99.999999999% (11 nines) durability and 99.99% availability: losing data and being unreachable are separate risks."],
      ["Cloud SLAs", "Cloud providers publish SLAs per service with service credits when monthly uptime falls below the promised percentage, which is why SLAs are set looser than internal SLOs."]
    ],
    pitfalls: [
      "Quoting average latency instead of p95/p99",
      "Saying 'five nines' without explaining the redundancy and failover that would achieve it",
      "Forgetting that components in series multiply: more dependencies means lower availability",
      "Assuming replicas fail independently when they share a zone, deploy or bug",
      "Confusing durability with availability",
      "Planning to run servers at 100% utilisation: latency explodes from queueing",
      "Mixing up SLO (internal target) and SLA (contract)"
    ],
    quiz: [
      ["Why prefer p99 latency over average latency?", ["p99 is easier to compute", "Averages hide the slow tail that real users experience", "p99 is always lower than the average", "Averages can't be measured in production"], 1, "The mean can look healthy while 1 in 100 requests is very slow. Percentiles show the tail directly."],
      ["A service handles 2,000 requests/s and each request spends 50 ms in the system. About how many requests are in flight?", ["40", "100", "400", "2,000"], 1, "Little's Law: L = λW = 2,000 × 0.05 s = 100 concurrent requests."],
      ["Roughly how much downtime per year does 99.99% availability allow?", ["8.76 hours", "52.6 minutes", "5.26 minutes", "3.65 days"], 1, "0.01% of 525,600 minutes ≈ 52.6 minutes. 99.9% allows 8.76 hours and 99.999% about 5.26 minutes."],
      ["A request passes through three components in series, each 99.9% available. What is the overall availability, roughly?", ["99.9%", "99.97%", "99.7%", "99.99%"], 2, "Series availabilities multiply: 0.999³ ≈ 0.997, so about 99.7%."],
      ["Two independent replicas are each 99% available, and either can serve traffic. What is the combined availability?", ["98%", "99%", "99.5%", "99.99%"], 3, "Both must fail together: 1 − (0.01 × 0.01) = 0.9999, i.e. 99.99%, assuming independent failures and instant failover."],
      ["What happens to latency as a server approaches 100% utilisation?", ["It stays flat", "It drops because caches are warm", "Queueing delay grows sharply", "It becomes exactly double"], 2, "Queueing models such as M/M/1 show waiting time growing like 1/(1 − utilisation), which blows up near 100%."],
      ["Which statement about SLOs and SLAs is correct?", ["The SLA is usually stricter than the SLO", "The SLO is an internal target; the SLA is an external contract, usually looser", "They are the same thing", "SLAs measure latency only"], 1, "Teams aim for an SLO tighter than the SLA so they have margin before contractual penalties apply."],
      ["One user request fans out to 100 backends, each slow 1% of the time independently. About what share of user requests sees at least one slow backend?", ["1%", "10%", "63%", "100%"], 2, "1 − 0.99^100 ≈ 0.63. Fan-out amplifies tail latency, as described in 'The Tail at Scale'."]
    ],
    practice: {
      q: "Your checkout API calls three internal services one after another (cart, pricing, payment), each with 99.9% availability and p99 of 150 ms. Product wants checkout at 99.95% availability and p99 under 400 ms. Is that achievable, and what would you change?",
      a: [
        ["Do the maths first", "Series availability ≈ 0.999³ ≈ 99.7%, below 99.95%. Worst-case latency adds up to about 450 ms at p99 for the three calls alone, above 400 ms."],
        ["Remove calls from the critical path", "Cache pricing data (it changes rarely); fetch cart and pricing in parallel instead of in sequence."],
        ["Add redundancy to each dependency", "Run each service with multiple replicas across availability zones behind load balancers with health checks."],
        ["Fail gracefully", "Timeouts on every call, retries with backoff and jitter for idempotent calls, and an idempotency key on payment so retries can't double-charge."],
        ["Decouple what can be async", "Send confirmation emails and analytics through a queue so they can't block or fail checkout."],
        ["Define SLIs and alert on the SLO", "SLI: % of checkout requests that succeed under 400 ms; SLO 99.95% per 30 days (about 21.6 minutes of error budget)."],
        ["State the trade-offs", "Caching adds staleness; more replicas add cost; parallel calls add complexity. Mention correlated failures limit the gains."]
      ]
    },
    recap: [
      "Latency is a distribution: track p50, p95 and p99, not the average.",
      "Throughput × latency = concurrency (Little's Law): use it to size pools and workers.",
      "Near 100% utilisation, queueing makes latency explode: keep headroom.",
      "Each nine cuts downtime 10x; series components multiply, parallel replicas add nines.",
      "SLI measures, SLO targets, SLA promises; the error budget is 100% − SLO."
    ]
  });
})();
