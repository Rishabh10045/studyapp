/* FDE roadmap page: role summary (cited), skills self-assessment, week-by-week plan, projects, interview loop and practice.
   State: localStorage "java.fde.v1" = { skills: {id: 0..3}, weeks: {n: true}, open: {i: true} }. */
(function () {
  "use strict";
  var H = window.JAVA, esc = H.esc, md = H.md, $ = function (id) { return document.getElementById(id); };
  var KEY = "java.fde.v1";
  var st = H.load(KEY, {}) || {}; st.skills = st.skills || {}; st.weeks = st.weeks || {}; st.open = st.open || {};
  function save() { H.save(KEY, st); }

  var SRC = [
    ["Palantir: Forward Deployed Software Engineer posting (Lever)", "https://jobs.lever.co/palantir/5168e8fd-fec1-4fea-b7a1-81bdaea65850"],
    ["OpenAI: Forward Deployed Engineer (FDE), SF posting (Ashby)", "https://jobs.ashbyhq.com/openai/967f94aa-1706-4dba-ac89-bfbc2c38b688"],
    ["Google Careers: Forward Deployed Engineer IV, GenAI, Google Cloud", "https://www.google.com/about/careers/applications/jobs/results/129988979490464454-forward-deployed-engineer-iv/"],
    ["EY: Forward Deployed Engineer (AI & Data Architect) posting", "https://careers.ey.com/ey/job/Katowice-Forward-Deployed-Engineer-%C5%9Al%C4%85s-40-202/1454259233/"],
    ["Analog Devices: Staff Forward Deployed Engineer posting", "https://analogdevices.wd1.myworkdayjobs.com/en-US/External/job/Staff-Forward-Deployed-Engineer_R266927"],
    ["CareerPivoting: \"Forward Deployed Engineer Job Description: 25 Real Postings\" (third-party analysis, postings read 8 Nov 2026)", "https://careerpivoting.com/guides/forward-deployed-engineer-job-description/"],
    ["DeployCOs: \"Palantir FDSE Interview: Stages and Decomposition Round\" (third-party, compiled from candidate reports)", "https://deploycos.com/forward-deployed-engineers/interview/palantir/"],
    ["Scaler: \"Palantir FDE Interview: Format, Difficulty and How to Prepare\" (third-party, candidate reports)", "https://www.scaler.com/topics/palantir-fde-interview/"]
  ];
  function cite(n) { return n.map(function (i) { return "<a href='#src" + i + "' title='" + esc(SRC[i - 1][0]) + "'>[" + i + "]</a>"; }).join(""); }

  /* ---------- Role ---------- */
  var ROLE = [
    ["Embedded with customers, owning outcomes end to end", "Palantir describes FDEs embedding with customers and owning projects \"from the first conversation with a customer, to shipping the product\"; OpenAI's posting has FDEs own \"discovery, technical scoping, system design, build, and production rollout\".", [1, 2]],
    ["Builds real software, not slideware", "Postings ask for production-grade code: custom applications, integrations, data pipelines and LLM workflows built for one customer's environment. In one analysis, 13 of 14 readable postings listed building custom software, integrations or prototypes for specific customers.", [1, 2, 5, 6]],
    ["LLM / agent work is now central", "Recent postings name LLM applications, RAG, vector databases, agentic workflows, MCP servers and evaluation pipelines (Google Cloud, EY, OpenAI). The same analysis found LLM/agent/RAG/eval terms in 19 of 25 postings.", [2, 3, 4, 6]],
    ["Feeds the field back into the product", "Turning what worked for one customer into reusable tools or playbooks, and reporting friction to product and research teams, appears in most postings (11 of 14 in the analysis).", [2, 3, 6]],
    ["Customer-facing by definition", "Every posting in the 25-posting analysis was customer-facing; postings ask for discovery sessions, stakeholder management up to executives, and calm judgement under pressure.", [2, 3, 6]],
    ["Experience asked for varies widely", "From 6+ months post-college (Palantir) to 5+ (OpenAI), 8+ (EY, Google Cloud FDE IV) and 10+ years (ADI Staff). Python is the most-named language; Palantir lists Java among accepted languages. No posting in the analysis required a certification.", [1, 2, 3, 4, 5, 6]]
  ];
  $("role-points").innerHTML = "<div class='grid2'>" + ROLE.map(function (r) { return "<div class='card'><h3>" + esc(r[0]) + "</h3><p>" + md(r[1]) + " <span class='src'>" + cite(r[2]) + "</span></p></div>"; }).join("") + "</div>";
  var RT = [
    ["What the posting asks for", "Seen in", "Where this course helps"],
    ["Production coding (Python, TypeScript, Java…)", "17 of 25 postings named Python, 16 TypeScript/JavaScript " + cite([6]), "Java track; add Python practice separately"],
    ["Discovery & scoping with customers", "9 of 14 readable postings " + cite([6]) + "; Google, OpenAI " + cite([2, 3]), "Decomposition framework below; LLD F32 (machine-coding approach)"],
    ["Deploy / integrate in customer environments", "8 of 14 " + cite([6]), "Spring S04, S13–S16; HLD F16, F17, F21"],
    ["LLM apps, RAG, agents, evaluation", "19 of 25 " + cite([6]) + "; Google, EY " + cite([3, 4]), "Spring AI module S17–S24"],
    ["Own it in production (reliability, debugging, on-call)", "6 of 14 " + cite([6]), "Java J29–J31 (JVM, GC), Spring S10 (observability)"],
    ["Cloud platforms (AWS, Azure, GCP)", "named in 4 of 25 " + cite([6]) + "; Google Cloud asks for experience architecting AI systems on cloud platforms " + cite([3]), "Spring S16 (Docker, deploy); HLD fundamentals"]
  ];
  $("role-table").innerHTML = table(RT, true);

  /* ---------- Links ---------- */
  function hld(c, n) { return "<a href='../index.html#lesson=" + c + "'>HLD " + c + (n ? " · " + esc(n) : "") + "</a>"; }
  function lld(c, n) { return "<a href='../lld/index.html#lesson=" + c + "'>LLD " + c + (n ? " · " + esc(n) : "") + "</a>"; }
  function own(c) { var t = H.byCode(c); var label = c + (t ? " · " + esc(t.name) : ""); return H.isReady(c) ? "<a href='index.html#lesson=" + c + "'>" + label + "</a>" : "<span title='Coming soon'>" + label + " 🔒</span>"; }
  function range(a, b) { var out = [], p = a.charAt(0), x = +a.slice(1), y = +b.slice(1); for (var i = x; i <= y; i++) out.push(p + (i < 10 ? "0" : "") + i); return out; }

  /* ---------- Skills ---------- */
  var SKILLS = [
    { id: "code", name: "Coding: Java + Python", need: "Write production-quality code fast in an unfamiliar codebase; read and fix others' code.", links: [own("J01"), own("J11"), own("J27"), lld("F32", "Machine-coding approach")], weeks: [1, 2, 3] },
    { id: "design", name: "System design", need: "Design integrations and services that fit a customer's existing systems, constraints and scale.", links: [hld("F06", "Load balancing"), hld("F07", "Caching"), hld("F16", "Queues"), hld("F24", "Idempotency")], weeks: [5, 6] },
    { id: "data", name: "Data engineering & SQL", need: "Model data, write SQL, build pipelines from messy sources; most deployments start with the customer's data.", links: [hld("F09", "SQL vs NoSQL"), hld("F10", "Indexing"), own("S06"), own("S07")], weeks: [7, 8] },
    { id: "cloud", name: "Cloud & DevOps", need: "Ship to the customer's cloud: containers, CI/CD, config, secrets, observability.", links: [own("S10"), own("S16"), hld("F21", "Observability")], weeks: [9] },
    { id: "llm", name: "LLM apps, RAG & agents", need: "Build, evaluate and harden LLM features: retrieval, tool calling, MCP, evals, cost/latency.", links: [own("S17"), own("S20"), own("S21"), own("S23"), own("S24")], weeks: [10, 11, 12] },
    { id: "customer", name: "Customer-facing skills", need: "Run discovery, scope, set expectations, explain trade-offs to engineers and executives, handle escalations.", links: ["Decomposition framework (below)", "Practice questions 1–4"], weeks: [4, 13, 15] },
    { id: "prod", name: "Debugging in production", need: "Find root causes under pressure with logs, metrics, traces, thread and heap dumps.", links: [own("J26"), own("J30"), own("J31"), own("S10")], weeks: [14] }
  ];
  var LEVELS = ["0 new", "1 basics", "2 working", "3 strong"];
  function drawSkills() {
    $("skills-list").innerHTML = SKILLS.map(function (s) {
      var v = st.skills[s.id] === undefined ? -1 : st.skills[s.id];
      return "<div class='skill-row'><div><strong>" + esc(s.name) + "</strong><div class='src'>Plan weeks " + s.weeks.join(", ") + "</div></div><div>" + md(s.need) + "<div class='src' style='margin-top:4px'>" + s.links.join(" · ") + "</div></div>" +
        "<div class='lv'>" + LEVELS.map(function (l, i) { return "<button type='button' data-s='" + s.id + "' data-v='" + i + "' class='" + (v === i ? "on" : "") + "' title='" + l + "'>" + i + "</button>"; }).join("") + "</div></div>";
    }).join("");
    var rated = SKILLS.filter(function (s) { return st.skills[s.id] !== undefined; });
    var avg = rated.length ? rated.reduce(function (a, s) { return a + st.skills[s.id]; }, 0) / rated.length : 0;
    var gaps = rated.filter(function (s) { return st.skills[s.id] <= 1; }).sort(function (a, b) { return st.skills[a.id] - st.skills[b.id]; });
    $("skills-metrics").innerHTML = [[rated.length + " / " + SKILLS.length, "Areas rated"], [rated.length ? avg.toFixed(1) + " / 3" : "–", "Average"], [gaps.length, "Gaps (rated 0–1)"]]
      .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    var adv = $("skills-advice");
    if (!rated.length) { adv.className = "result"; adv.innerHTML = "<p>Rate each area to get a focus list.</p>"; }
    else if (!gaps.length) { adv.className = "result ok"; adv.innerHTML = "<div class='out'>No big gaps</div><p>Follow the plan in order and spend extra time on projects and mock interviews.</p>"; }
    else { adv.className = "result warn"; adv.innerHTML = "<div class='out'>Focus first</div><ul>" + gaps.map(function (g) { return "<li><strong>" + esc(g.name) + "</strong> (rated " + st.skills[g.id] + "): weeks " + g.weeks.join(", ") + " · " + g.links.join(" · ") + "</li>"; }).join("") + "</ul>"; }
    drawPlan();
  }
  $("skills-list").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-s]"); if (!b) return;
    var id = b.getAttribute("data-s"), v = +b.getAttribute("data-v");
    if (st.skills[id] === v) delete st.skills[id]; else st.skills[id] = v;
    save(); drawSkills();
  });

  /* ---------- Plan ---------- */
  var PLAN = [
    ["Phase 1 · Engineering core", 1, "Java foundations & collections", range("J01", "J09").map(own).join(", "), "Implement an LRU cache and a word-frequency CLI with tests"],
    ["Phase 1 · Engineering core", 2, "Modern Java & streams; Python refresher", range("J10", "J14").map(own).join(", ") + "; Python: data structures, `requests`, `pandas` basics (outside this course)", "Same CLI in Java and Python; compare"],
    ["Phase 1 · Engineering core", 3, "Concurrency essentials", [own("J15"), own("J16"), own("J17"), own("J22"), own("J25"), own("J27")].join(", "), "Parallel API fetcher with timeouts and retries"],
    ["Phase 1 · Engineering core", 4, "LLD & the machine-coding round", [lld("F01", "OOP"), lld("F02", "SOLID"), lld("F17", "Strategy"), lld("F32", "Approach")].join(", "), "One 90-minute machine-coding mock (parking lot or rate limiter)"],
    ["Phase 2 · Systems & data", 5, "System design fundamentals", [hld("F01"), hld("F02"), hld("F03"), hld("F06"), hld("F07"), hld("F09")].join(", "), "Design notes for a customer-facing API"],
    ["Phase 2 · Systems & data", 6, "Distributed patterns", [hld("F16"), hld("F17"), hld("F19"), hld("F24"), hld("F27"), "HLD P04 Notification system"].join(", "), "Mock system-design interview"],
    ["Phase 2 · Systems & data", 7, "SQL & data modelling", [hld("F10"), hld("F11"), hld("F12"), own("S06")].join(", ") + "; daily SQL practice (joins, window functions)", "Model a customer's orders/inventory data; 20 SQL exercises"],
    ["Phase 2 · Systems & data", 8, "Spring services & transactions", range("S01", "S07").map(own).join(", "), "REST + JPA service with validation, transactions, Flyway"],
    ["Phase 3 · Ship it", 9, "Security, testing, ops, deploy", [own("S08"), own("S09"), own("S10"), own("S16")].join(", "), "JWT auth, Testcontainers tests, metrics, Docker image"],
    ["Phase 3 · Ship it", 10, "LLM apps with Spring AI", [own("S17"), own("S18"), own("S19")].join(", "), "Structured-output extractor for customer documents"],
    ["Phase 3 · Ship it", 11, "RAG, tools & MCP", [own("S20"), own("S21"), own("S22"), own("S23")].join(", "), "RAG assistant over a sample knowledge base with one tool and an MCP server"],
    ["Phase 3 · Ship it", 12, "Evaluation, cost & reliability", [own("S24"), own("S14"), own("S11")].join(", "), "Eval suite in CI; dashboards for tokens, latency, cost"],
    ["Phase 4 · Field readiness", 13, "Discovery & decomposition", "Decomposition framework and practice questions on this page", "3 mock decomposition cases with a friend, recorded"],
    ["Phase 4 · Field readiness", 14, "Debugging in production", [own("J26"), own("J29"), own("J30"), own("J31")].join(", "), "Break your own service (leak, deadlock, slow query) and write incident reports"],
    ["Phase 4 · Field readiness", 15, "Customer scenarios & communication", "Practice questions 1–4 and 11–12; write a one-page proposal for a project", "Present a project to a non-engineer in 10 minutes"],
    ["Phase 4 · Field readiness", 16, "Full mock loops", "Coding + system design + decomposition + customer scenario, timed", "Two full mock loops; polish portfolio READMEs"]
  ];
  function drawPlan() {
    var focus = {};
    SKILLS.forEach(function (s) { if (st.skills[s.id] !== undefined && st.skills[s.id] <= 1) s.weeks.forEach(function (w) { focus[w] = true; }); });
    var done = PLAN.filter(function (p) { return st.weeks[p[1]]; }).length;
    $("plan-metrics").innerHTML = [[done + " / " + PLAN.length, "Weeks done"], [Object.keys(focus).length, "Focus weeks from your gaps"]]
      .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    var last = "";
    $("plan-table").innerHTML = "<table class='week'><thead><tr><th>Done</th><th>Week</th><th>Focus</th><th>Lessons &amp; resources</th><th>Deliverable</th></tr></thead><tbody>" + PLAN.map(function (p) {
      var head = p[0] !== last ? "<tr><td colspan='5' style='background:var(--bg-subtle);font-weight:600'>" + esc(p[0]) + "</td></tr>" : ""; last = p[0];
      return head + "<tr><td><input type='checkbox' data-w='" + p[1] + "'" + (st.weeks[p[1]] ? " checked" : "") + " aria-label='Week " + p[1] + " done'></td><td>" + p[1] + (focus[p[1]] ? " <span class='pill warning'>Focus</span>" : "") + "</td><td>" + esc(p[2]) + "</td><td>" + p[3].replace(/`([^`]+)`/g, "<code>$1</code>") + "</td><td>" + esc(p[4]) + "</td></tr>";
    }).join("") + "</tbody></table>";
  }
  $("plan-table").addEventListener("change", function (e) { var w = e.target.getAttribute("data-w"); if (!w) return; if (e.target.checked) st.weeks[w] = true; else delete st.weeks[w]; save(); drawPlan(); });

  /* ---------- Projects ---------- */
  var PROJ = [
    ["Customer data integration service", "Spring Boot, JPA, Flyway, Kafka, Testcontainers", "Ingest CSV/API data from two \"customer\" systems with different schemas, reconcile into one model, expose a REST API, handle retries and bad rows.", "Integration in messy environments; data modelling; idempotency"],
    ["RAG assistant with evaluation", "Spring AI ChatClient, PGvector, RetrievalAugmentationAdvisor, RelevancyEvaluator", "Answer questions over a document set with citations; golden-question eval suite in CI; dashboards for latency and tokens.", "LLM apps, RAG, eval-driven iteration"],
    ["Agentic workflow with tools + MCP", "Spring AI @Tool, MCP server starter, Spring Security", "An assistant that can look up and update records in a mock ERP through tools, with confirmation for writes and audit logs.", "Tool calling, safety, least privilege"],
    ["Ops copilot for a Java service", "Actuator, Micrometer, JFR, Spring AI", "Collect metrics/logs from a demo service, summarise incidents, suggest likely causes; includes intentionally injected faults.", "Debugging in production; observability"],
    ["Field deployment kit", "Docker, Buildpacks, GitHub Actions, Terraform (optional)", "One-command deploy of your services to a cloud VM or Kubernetes with config, secrets and health checks; a runbook.", "Cloud/DevOps; repeatability across customers"],
    ["Decomposition write-ups", "Markdown/Docs", "Three one-page proposals for real-sounding problems (e.g. hospital bed allocation, supplier delay prediction): users, data, v0, risks, metrics.", "Customer framing and communication"]
  ];
  $("project-cards").innerHTML = PROJ.map(function (p) { return "<div class='card'><h3>" + esc(p[0]) + "</h3><p class='caption' style='margin:0 0 8px'>" + esc(p[1]) + "</p><p>" + esc(p[2]) + "</p><p><strong>Shows:</strong> " + esc(p[3]) + "</p></div>"; }).join("");

  /* ---------- Interview loop ---------- */
  var LOOP = [
    ["Round", "What happens", "How to prepare", "Source"],
    ["Decomposition / case", "A vague real-world problem with little or no code: clarify the goal, ask about data, break it into parts, propose a v0, discuss risks.", "Framework below; practise aloud with a timer; write assumptions down", cite([7, 8])],
    ["Coding", "Practical problems, often around an API or data task; some loops use LeetCode-style questions or an online assessment with SQL.", "Java track + daily problems; SQL practice; LLD F32 for structure", cite([7, 8])],
    ["System design", "Design a service or integration end to end; included in some loops, not others.", "HLD fundamentals and problems; add a customer-constraint twist", cite([7, 8])],
    ["Learning / debugging", "Use an unfamiliar API or codebase, or fix a broken service you've never seen (reported for Palantir).", "Practise reading docs fast; debug drills (week 14)", cite([7])],
    ["Customer scenario / behavioural", "Stakeholder conflict, scoping trade-offs, delivering under pressure; postings stress communication and judgement.", "STAR stories from your projects; practice questions 1–4, 11–12", cite([2, 3])],
    ["Hiring manager", "Past projects, motivation for forward-deployed work, gaps from earlier rounds.", "Portfolio walk-throughs; why FDE", cite([7])]
  ];
  $("loop-table").innerHTML = table(LOOP, true);
  var DEC = [
    ["Clarify the user and the goal", "Who uses this, what do they do today, what hurts, and what does success look like (a metric)?"],
    ["Ask about the data and systems", "What data exists, where, how fresh, who owns it, what access and privacy limits apply?"],
    ["State assumptions", "Say them out loud and write them down so the interviewer can change them."],
    ["Decompose into buildable pieces", "Ingest → model → process → present; integrations; people and process changes."],
    ["Propose the smallest useful v0", "One user, one workflow, one reliable data source; how you'd ship it in weeks, not months."],
    ["Stress-test it", "Bad or missing data, adoption, security, scale, failure modes; how you'd detect and handle each."],
    ["Iterate and measure", "v1/v2 extensions, metrics, feedback loops, and what you'd hand back to the product team."]
  ];
  $("decomp-steps").innerHTML = DEC.map(function (d) { return "<li><div class='t'>" + esc(d[0]) + "</div><div class='dt'>" + esc(d[1]) + "</div></li>"; }).join("");
  var decSrc = ["flowchart LR",
    "  A[\"Clarify user<br/>& goal\"]:::s0 --> B[\"Data &<br/>systems\"]:::s0 --> C[\"Assumptions\"]:::s1 --> D[\"Decompose\"]:::s1 --> E[\"v0\"]:::s2 --> F[\"Stress-test\"]:::bad --> G[\"Iterate &<br/>measure\"]:::s2",
    "  G -. new info .-> A",
    "  classDef s0 stroke:#3b82f6,stroke-width:2px;", "  classDef s1 stroke:#eab308,stroke-width:2px;", "  classDef s2 stroke:#06b6d4,stroke-width:2px;", "  classDef bad stroke:#dc2626,stroke-width:2px;"].join("\n");
  var roleSrc = ["flowchart LR",
    "  D[\"Discovery<br/><span class='d'>users, data, goals</span>\"]:::s0 --> S[\"Scope<br/><span class='d'>v0, trade-offs</span>\"]:::s0",
    "  S --> B[\"Build<br/><span class='d'>integrations, apps, LLM workflows</span>\"]:::s1",
    "  B --> P[\"Deploy & operate<br/><span class='d'>customer environment</span>\"]:::s1",
    "  P --> M[\"Measure<br/><span class='d'>adoption, impact, evals</span>\"]:::s2",
    "  M --> F[\"Feed back<br/><span class='d'>reusable tools, product input</span>\"]:::s2",
    "  F -. next deployment .-> D",
    "  classDef s0 stroke:#3b82f6,stroke-width:2px;", "  classDef s1 stroke:#eab308,stroke-width:2px;", "  classDef s2 stroke:#06b6d4,stroke-width:2px;"].join("\n");

  /* ---------- Practice ---------- */
  var PQ = [
    ["Customer scenario", "A hospital network asks you to \"use AI to reduce patient wait times\". You have 45 minutes. Walk through your first conversation.", ["Clarify: which waits (ER triage, beds, outpatient), who feels them, how they're measured today, target improvement.", "Data: admissions/discharge events, bed status, staffing rosters; freshness, quality, access and privacy (patient data governance).", "Assumptions stated: one hospital first, ER-to-bed wait as the metric.", "v0: a live bed-availability and predicted-discharge board for bed managers using existing systems; maybe no ML at first.", "Risks: data latency, adoption by staff, privacy, alert fatigue. Measure: median ER-to-bed time before vs after.", "Next: discharge prediction model, multi-hospital rollout, feedback to product."]],
    ["Customer scenario", "The customer's VP says your pilot is \"not working\" two weeks before a renewal. What do you do?", ["Get specifics: which users, which workflow, what outcome they expected vs saw; data, not adjectives.", "Check usage and error metrics; talk to two or three actual users.", "Separate causes: bugs, wrong problem, adoption/training, data quality.", "Propose a short, concrete recovery plan with one measurable win before renewal; set expectations honestly.", "Follow up in writing; report learnings to your product team."]],
    ["Customer scenario", "Security won't give you production database access. How do you still deliver?", ["Understand their constraint and approval process; don't route around it.", "Options: read replica or masked/synthetic copy, a narrow API owned by their team, CDC stream into a sanctioned store, on-prem deployment.", "Build against a contract (schema/API) with fixtures so work continues while access is approved.", "Document data flows for their review; least privilege by design."]],
    ["Customer scenario", "Two customer teams want opposite things from your deployment. How do you handle it?", ["Find the shared goal and the decision-maker; make the trade-off explicit with data.", "Propose options with cost, risk and timeline; maybe phase both (one in v0, one in v1).", "Get the decision written down; communicate it to both teams; revisit with metrics."]],
    ["Decomposition", "Decompose: \"Help a logistics company predict which shipments will be late.\"", ["Users: operations planners; goal: act early (reroute, notify) on high-risk shipments; metric: % late shipments caught with N hours' notice.", "Data: shipment events, carrier performance history, weather, port congestion; joins on shipment/lane IDs.", "v0: rule-based risk score from carrier lane history + current delay events, surfaced as a ranked list with reasons.", "v1: ML model trained on history; evaluation on held-out months; feedback from planners.", "Risks: missing events, label quality (what counts as late), alert fatigue."]],
    ["Decomposition", "Decompose: \"Build an internal assistant that answers employees' HR policy questions.\"", ["Users and top questions; success = deflected tickets and answer accuracy.", "Data: policy documents, versions, region-specific rules; access control per employee region/role.", "v0: RAG over approved documents with citations and \"I don't know\" fallback; escalate to HR.", "Evaluation: golden Q&A set reviewed by HR; regression tests in CI; feedback buttons.", "Risks: stale documents, wrong-region answers, sensitive topics routed to humans."]],
    ["System design", "Design a service that syncs customer orders from three different ERPs into one API.", ["Adapters per ERP (pull or webhook), a canonical order model, an idempotent upsert keyed on (source, external id).", "Queue between ingestion and processing for retries and back-pressure; dead-letter for bad records with a review UI.", "Store raw payloads for replay; schema versioning; monitoring of lag and error rates per source.", "API with pagination and change feeds for downstream consumers."]],
    ["System design", "Design an LLM feature that drafts replies to support tickets, safely.", ["Retrieve the ticket, customer history and relevant KB articles; prompt with a template; structured output (draft + cited sources + confidence).", "Human-in-the-loop: agent reviews before sending; no auto-send initially.", "Guardrails: PII redaction, allowed-sources only, tone checks; evaluation set and online feedback.", "Cost/latency budgets; caching; fallbacks when the model is unavailable."]],
    ["Coding", "Given a CSV of shipments (id, carrier, promised, delivered), compute each carrier's on-time rate in Java. What edge cases matter?", ["Parse with a real CSV library or careful splitting; skip/record bad rows rather than crashing.", "Stream: `groupingBy(carrier, collectingAndThen(toList(), rate))`; handle missing delivered dates as \"not yet\".", "Edge cases: time zones, duplicate ids, empty carriers, header row, very large files (stream line by line)."]],
    ["Coding", "Write a retrying HTTP client wrapper with exponential backoff and jitter. What should not be retried?", ["Retry only idempotent requests and transient failures (timeouts, 429, 5xx); respect `Retry-After`.", "Backoff: base × 2^attempt with random jitter, capped; overall deadline.", "Don't retry 4xx validation errors or non-idempotent POSTs without an idempotency key."]],
    ["Behavioural", "Tell me about a time you shipped something under a tight deadline with incomplete requirements.", ["STAR: situation, task, action, result, with numbers.", "Show how you clarified scope, cut to a v0, communicated risk and followed up.", "End with what you'd do differently."]],
    ["Behavioural", "Why forward-deployed engineering rather than a product engineering role?", ["Connect to evidence from your past: customer contact, ambiguous problems, end-to-end ownership.", "Show you understand the trade-offs: travel/context switching, less long-term code ownership, more ambiguity.", "Mention what you want to learn and how you'd feed field learnings back."]]
  ];
  function drawPractice() {
    $("practice-list").innerHTML = PQ.map(function (p, i) {
      return "<details class='pq' data-i='" + i + "'" + (st.open[i] ? " open" : "") + "><summary><span>Q" + (i + 1) + ". " + md(p[1]) + "</span><span class='pill'>" + esc(p[0]) + "</span></summary><div class='body'><div class='ma'>Model answer</div><ul>" +
        p[2].map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul></div></details>";
    }).join("");
  }
  $("practice-list").addEventListener("toggle", function (e) { var d = e.target; if (!d.getAttribute) return; var i = d.getAttribute("data-i"); if (i === null) return; if (d.open) st.open[i] = true; else delete st.open[i]; save(); }, true);
  function setAll(on) { Array.prototype.forEach.call(document.querySelectorAll("#practice-list details"), function (d) { d.open = on; }); }
  $("open-all").addEventListener("click", function () { setAll(true); });
  $("close-all").addEventListener("click", function () { setAll(false); });

  $("source-list").innerHTML = SRC.map(function (s, i) { return "<li id='src" + (i + 1) + "'><a href='" + esc(s[1]) + "' rel='noopener' target='_blank'>" + esc(s[0]) + "</a></li>"; }).join("");

  function table(rows, raw) {
    return "<table><thead><tr>" + rows[0].map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + (raw ? c : esc(c)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
  }

  drawSkills(); drawPractice();
  H.renderDiagram($("dg-role"), roleSrc).then(function () { return H.renderDiagram($("dg-decomp"), decSrc); }).then(function () { document.body.setAttribute("data-diagrams", "done"); });
})();
