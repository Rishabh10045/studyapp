/* Lesson F21: Observability */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.slo) { s.slo = 999; s.err = 0.5; s.rps = 2000; }
    el.innerHTML = "<div class='grid3'><label class='field'>Availability SLO (30-day window): <strong data-v='slo' style='color:var(--text)'></strong><input type='range' min='990' max='999.9' step='0.1' data-k='slo'></label>" +
      "<label class='field'>Current error rate: <strong data-v='err' style='color:var(--text)'></strong><input type='range' min='0' max='10' step='0.05' data-k='err'></label>" +
      "<label class='field'>Traffic: <strong data-v='rps' style='color:var(--text)'></strong><input type='range' min='100' max='50000' step='100' data-k='rps'></label></div>" +
      "<div class='metrics' data-r='m'></div><div class='callout' data-r='c'></div><p class='caption'>Burn rate = current error rate ÷ error rate the SLO allows. Thresholds follow the multi-window example in Google's SRE Workbook (page at 14.4× over 1 h, ticket at about 1× over 3 days). Assumes steady traffic.</p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      ["slo", "err", "rps"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      var slo = s.slo / 1000, allowed = 1 - slo, e = s.err / 100;
      el.querySelector("[data-v='slo']").textContent = (slo * 100).toFixed(2) + "%"; el.querySelector("[data-v='err']").textContent = s.err.toFixed(2) + "%"; el.querySelector("[data-v='rps']").textContent = s.rps.toLocaleString() + " req/s";
      var total = s.rps * 86400 * 30, budget = total * allowed, budgetMin = allowed * 30 * 24 * 60, burn = allowed ? e / allowed : 0;
      var hoursLeft = burn > 0 ? 30 * 24 / burn : Infinity;
      function dur(h) { return !isFinite(h) ? "never" : h >= 48 ? (h / 24).toFixed(1) + " days" : h >= 1 ? h.toFixed(1) + " h" : (h * 60).toFixed(0) + " min"; }
      q("m").innerHTML = [[Math.round(budget).toLocaleString(), "Failed requests allowed / 30 d"], [budgetMin.toFixed(0) + " min", "≈ full-outage minutes allowed"], [burn.toFixed(1) + "×", "Burn rate"], [dur(hoursLeft), "Budget exhausted in"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var c = q("c");
      if (burn >= 14.4) { c.className = "callout"; c.style.borderColor = "var(--danger)"; c.innerHTML = "<strong>Page the on-call now.</strong> At " + burn.toFixed(1) + "× the budget would be gone in " + dur(hoursLeft) + "."; }
      else if (burn >= 1) { c.className = "callout"; c.style.borderColor = "var(--c1)"; c.innerHTML = "<strong>Open a ticket.</strong> Burning faster than sustainable (" + burn.toFixed(1) + "×); fix within days."; }
      else { c.className = "callout success"; c.style.borderColor = ""; c.innerHTML = "<strong>Healthy.</strong> Spending budget slower than it accrues — room to ship risky changes."; }
    }
    el.addEventListener("input", function (ev) { var k = ev.target.getAttribute("data-k"); if (k) { s[k] = +ev.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "F21",
    summary: "How you know a system is healthy and why it broke: metrics, logs and traces, the RED and USE methods, SLIs, SLOs and error budgets, alerting on symptoms, and distributed tracing with OpenTelemetry.",
    slides: [
      { t: "Monitoring vs observability", x: "Monitoring tells you something known is wrong (CPU high, errors up). Observability is being able to ask new questions of your system's telemetry to find out why.",
        p: ["Three main signals: metrics, logs, traces (plus profiles and events)", "Instrument code to emit telemetry; ship it to backends; query, dashboard, alert", "In distributed systems, one user request touches many services — you need to follow it"],
        m: "flowchart LR\n  SVC[\"Services\"] --> MET[\"Metrics\"]:::s0\n  SVC --> LOG[\"Logs\"]:::s1\n  SVC --> TR[\"Traces\"]:::s2\n  MET --> DASH[\"Dashboards + alerts\"]\n  LOG --> DASH\n  TR --> DASH" },
      { t: "Metrics", x: "Numeric measurements over time: counters, gauges and histograms with labels.",
        p: ["Counter: only goes up (requests_total); gauge: goes up and down (queue_depth); histogram: distribution (request latency buckets)", "Cheap to store and query; good for dashboards and alerts", "Labels (service, route, status) add dimensions — but high-cardinality labels like user_id explode storage", "Tools: Prometheus, Grafana, Datadog, CloudWatch"],
        m: "flowchart LR\n  APP[\"App exposes /metrics\"] -->|\"scrape every 15 s\"| PR[(\"Prometheus\")]:::s0 --> GR[\"Grafana dashboards\"]:::s2\n  PR --> AM[\"Alertmanager\"]:::s1 --> PG[\"Pager\"]" },
      { t: "Logs", x: "Timestamped records of discrete events. Most detail, highest volume.",
        p: ["Use structured logs (JSON) with fields: timestamp, level, service, trace_id, message", "Centralize: ship to Elasticsearch/OpenSearch, Loki, Splunk, Cloud Logging", "Control cost: sample debug logs, set retention", "Never log secrets, passwords or full card numbers"],
        m: "flowchart LR\n  S1[\"Service A\"] --> AG[\"Log agent (Fluent Bit)\"]:::s1\n  S2[\"Service B\"] --> AG\n  AG --> ST[(\"Log store\")]:::s0 --> Q[\"Search: trace_id=abc\"]" },
      { t: "Distributed tracing", x: "A trace follows one request through all services. Each unit of work is a span with a start time, duration and parent.",
        p: ["A trace ID is created at the edge and propagated in headers (W3C traceparent)", "Spans show where time went: the waterfall view", "OpenTelemetry: vendor-neutral APIs/SDKs for traces, metrics and logs (CNCF)", "Backends: Jaeger, Zipkin, Tempo, commercial APMs", "Sample traces (e.g. keep 1%, plus all errors and slow ones)"],
        m: "gantt\n  dateFormat X\n  axisFormat %L ms\n  section API gateway\n  GET /checkout :0, 420\n  section Cart service\n  load cart :20, 80\n  section Pricing\n  compute :100, 140\n  section Payments\n  authorize card :150, 400" },
      { t: "What to measure: RED and USE", x: "Two simple checklists.",
        table: [["Method", "For", "Signals"], ["RED", "Request-driven services", "Rate, Errors, Duration (latency percentiles)"], ["USE", "Resources (CPU, disk, network, pools)", "Utilization, Saturation, Errors"], ["Four golden signals (Google SRE)", "Any user-facing system", "Latency, traffic, errors, saturation"]],
        p: ["Track latency as p50 / p95 / p99, not averages (F02)", "Add business metrics: orders/min, sign-ups, payment success rate"],
        m: "flowchart LR\n  SVC[\"Checkout service\"] --> R[\"Rate: 1.2k req/s\"]:::s0\n  SVC --> E[\"Errors: 0.3%\"]:::s1\n  SVC --> D[\"Duration p99: 480 ms\"]:::s2" },
      { t: "SLIs, SLOs and SLAs", x: "Define reliability from the user's point of view.",
        p: ["SLI (indicator): a measured ratio, e.g. % of requests that succeed in under 300 ms", "SLO (objective): a target for the SLI, e.g. 99.9% over 30 days", "SLA (agreement): a contract with customers, with penalties; usually looser than the SLO", "Error budget = 1 − SLO: the amount of unreliability you may 'spend' on releases and experiments"],
        m: "flowchart LR\n  SLI[\"SLI: good / total requests\"]:::s0 --> SLO[\"SLO: ≥ 99.9% per 30 d\"]:::s2 --> EB[\"Error budget: 0.1% ≈ 43 min\"]:::s1\n  SLO --> SLA[\"SLA: 99.5% or credits\"]" },
      { t: "Alerting well", x: "Page humans only for problems that hurt users and need action now.",
        p: ["Alert on symptoms (SLO burn, error rate, latency) rather than causes (CPU 80%)", "Burn-rate alerts: page if the budget is burning fast; ticket if slowly", "Every alert links to a runbook and a dashboard", "Avoid alert fatigue: fewer, actionable, deduplicated alerts", "Synthetic checks and health checks catch outages with no traffic"],
        m: "flowchart LR\n  M[\"SLO burn rate\"] --> D{\"Fast burn?\"}\n  D -->|\"≥ 14.4× for 1 h\"| PAGE[\"Page on-call\"]:::bad\n  D -->|\"slow, sustained\"| TK[\"Ticket\"]:::s1\n  D -->|\"no\"| OK[\"No alert\"]:::s2" },
      { t: "Debugging an incident", x: "The signals work together.",
        p: ["Alert fires: checkout SLO burning fast", "Dashboard (metrics): errors up on /checkout since 14:02, right after a deploy", "Trace: payment span timing out on calls to a provider", "Logs filtered by trace_id: 'connection pool exhausted'", "Mitigate first (roll back, shed load), then root-cause and write a blameless postmortem"],
        m: "flowchart LR\n  A[\"Alert\"]:::bad --> MT[\"Metrics: what & when\"]:::s0 --> TR[\"Traces: where\"]:::s2 --> LG[\"Logs: why\"]:::s1 --> FIX[\"Roll back, then postmortem\"]" },
      { t: "Observability in interviews", x: "Usually a short section near the end: 'How would you monitor this?'",
        p: ["'Each service emits RED metrics; dashboards per service and per critical flow.'", "'SLO: 99.9% of feed requests under 200 ms; burn-rate alerts page on-call.'", "'OpenTelemetry tracing with trace IDs propagated through Kafka headers too.'", "'Structured logs with trace_id in a central store, 14-day retention.'", "Name the key business metric (e.g. rides matched per minute)"],
        m: "flowchart LR\n  SV[\"Services + OTel SDK\"] --> COL[\"OTel Collector\"]:::s1\n  COL --> M[(\"Metrics\")]:::s0\n  COL --> T[(\"Traces\")]:::s2\n  COL --> L[(\"Logs\")]\n  M --> AL[\"SLO alerts\"]" }
    ],
    widget: { heading: "Error budget and burn-rate calculator", caption: "Pick an SLO and a current error rate to see how much unreliability you can afford and whether to page someone.", render: widget },
    examples: [
      ["Google SRE", "Google's Site Reliability Engineering books popularized SLOs, error budgets and the four golden signals."],
      ["Dapper → Zipkin → OpenTelemetry", "Google's Dapper paper (2010) described large-scale tracing; Twitter's Zipkin followed; OpenTracing and OpenCensus merged into OpenTelemetry in 2019."],
      ["Prometheus", "Created at SoundCloud (2012), it became the second CNCF graduated project after Kubernetes (2018)."],
      ["Blameless postmortems", "Companies such as Google and Etsy promote blameless postmortems focused on system fixes rather than individual fault."]
    ],
    pitfalls: [
      "Alerting on every cause (CPU, memory) instead of user-facing symptoms",
      "Using average latency instead of percentiles",
      "High-cardinality metric labels (user_id, request_id) that blow up storage",
      "No trace ID propagation across services and queues",
      "Unstructured logs that can't be filtered",
      "Logging sensitive data"
    ],
    quiz: [
      ["Which signal best shows where time went across 6 services in one request?", ["A CPU gauge", "A distributed trace", "A daily report", "A log line count"], 1, "Spans in a trace show each hop's duration."],
      ["RED stands for…", ["Read, Edit, Delete", "Rate, Errors, Duration", "Redis, Elasticsearch, DynamoDB", "Replicas, Elections, Durability"], 1, "Key signals for request-driven services."],
      ["A 99.9% SLO over 30 days gives an error budget of about…", ["4.3 minutes", "43 minutes", "7.2 hours", "3.6 days"], 1, "0.1% × 43,200 minutes ≈ 43 minutes."],
      ["SLA vs SLO?", ["They are the same", "SLA is a contract with consequences; SLO is an internal target, usually stricter", "SLO is legal, SLA is internal", "SLA measures latency only"], 1, "Keep SLOs tighter so you notice problems before breaching the SLA."],
      ["Best thing to page on-call for?", ["CPU at 70%", "Fast SLO burn (users affected now)", "A single 500 error", "Disk at 40%"], 1, "Page on user-impacting symptoms that need action."],
      ["Why avoid user_id as a metric label?", ["It's private", "Very high cardinality makes time series explode", "Prometheus forbids strings", "It slows down logs"], 1, "Put such details in logs or traces instead."],
      ["OpenTelemetry is…", ["A database", "A vendor-neutral standard and SDKs for traces, metrics and logs", "A load balancer", "An alerting pager"], 1, "A CNCF project; export to many backends."],
      ["During an incident, the first priority is usually…", ["Find who caused it", "Mitigate user impact (e.g. roll back), then root-cause", "Write the postmortem", "Add more dashboards"], 1, "Restore service first; analyze blamelessly later."]
    ],
    practice: {
      q: "You run a ride-hailing backend with 30 microservices. Riders complain that 'booking sometimes takes forever'. Describe the observability you'd put in place and how you'd find the cause.",
      a: [
        ["SLIs/SLOs", "Booking success rate and latency: 99.5% of booking requests succeed in under 2 s over 28 days; matching success rate as a business SLI."],
        ["Metrics", "RED per service and route; USE for DB pools, Kafka lag, Redis; business metrics like rides requested vs matched per minute per city."],
        ["Tracing", "OpenTelemetry in all services; trace context propagated through HTTP and Kafka headers; tail-based sampling keeps slow/error traces."],
        ["Logs", "Structured JSON with trace_id, rider/trip ids (not PII-heavy), centralized with retention limits."],
        ["Alerting", "Multi-window burn-rate alerts on booking SLO page on-call; slower burns open tickets; runbooks linked."],
        ["Finding the cause", "Look at the p99 booking latency by city/route → open slow traces → e.g. the pricing call waits on a saturated DB pool → logs confirm timeouts → mitigate (scale pool, add cache, roll back) → postmortem."],
        ["Trade-offs", "Telemetry costs money: sample traces, limit label cardinality, tier log retention."]
      ]
    },
    recap: [
      "Metrics for trends and alerts, logs for detail, traces to follow a request.",
      "Use RED for services, USE for resources; percentiles, not averages.",
      "SLI → SLO → error budget; SLAs are contracts, looser than SLOs.",
      "Page on fast SLO burn (symptoms), ticket on slow burn.",
      "Propagate trace IDs everywhere (OpenTelemetry) and keep logs structured."
    ]
  });
})();
