/* Lesson P04: Notification system */
(function () {
  "use strict";
  var H = window.HLD;
  var CH = { push: ["Mobile push (APNs/FCM)", 2000], email: ["Email", 500], sms: ["SMS", 100] };

  function widget(el, ctx) {
    var s = ctx.state; if (!s.users) { s.users = 10; s.opt = 20; s.fail = 5; s.retries = 3; s.workers = 50; s.ch = { push: true, email: true, sms: false }; s.dedupe = true; }
    el.innerHTML = "<div class='grid3'>" + [["users", "Campaign audience (millions)", 1, 100, 1], ["opt", "% opted out of this category", 0, 80, 5], ["fail", "% provider calls that fail transiently", 0, 40, 1], ["retries", "Max retries", 0, 5, 1], ["workers", "Workers per channel", 5, 500, 5]].map(function (f) {
      return "<label class='field'>" + f[1] + ": <strong data-v='" + f[0] + "' style='color:var(--text)'></strong><input type='range' min='" + f[2] + "' max='" + f[3] + "' step='" + f[4] + "' data-k='" + f[0] + "'></label>"; }).join("") + "</div>" +
      "<div class='controls'>" + Object.keys(CH).map(function (c) { return "<label class='toggle'><input type='checkbox' data-c='" + c + "'> " + CH[c][0] + "</label>"; }).join("") + "<label class='toggle'><input type='checkbox' data-r='dedupe'> Dedupe by notification id</label></div>" +
      "<div class='tablewrap'><table><thead><tr><th>Channel</th><th>Sends</th><th>Delivered to provider</th><th>Gave up (→ DLQ)</th><th>Duplicates</th><th>Time to drain</th></tr></thead><tbody data-r='tb'></tbody></table></div>" +
      "<p class='caption'>Simplified: each worker sends a fixed number of messages/s per channel (push 2,000, email 500, SMS 100 — illustrative, real limits come from providers and contracts). Without dedupe we assume half of retried failures were actually sent before the timeout, so the user gets a duplicate.</p>";
    function fmtT(sec) { return sec >= 3600 ? (sec / 3600).toFixed(1) + " h" : sec >= 60 ? (sec / 60).toFixed(0) + " min" : sec.toFixed(0) + " s"; }
    function draw() {
      ["users", "opt", "fail", "retries", "workers"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      el.querySelector("[data-v='users']").textContent = s.users + " M"; el.querySelector("[data-v='opt']").textContent = s.opt + "%"; el.querySelector("[data-v='fail']").textContent = s.fail + "%"; el.querySelector("[data-v='retries']").textContent = s.retries; el.querySelector("[data-v='workers']").textContent = s.workers;
      el.querySelectorAll("[data-c]").forEach(function (b) { b.checked = !!s.ch[b.getAttribute("data-c")]; }); el.querySelector("[data-r='dedupe']").checked = s.dedupe;
      var p = s.fail / 100, n = s.users * 1e6 * (1 - s.opt / 100), att = 0; for (var k = 0; k <= s.retries; k++) att += Math.pow(p, k);
      var rows = Object.keys(CH).filter(function (c) { return s.ch[c]; }).map(function (c) {
        var give = n * Math.pow(p, s.retries + 1), ok = n - give, dup = s.dedupe ? 0 : n * (att - 1) * 0.5, t = n * att / (s.workers * CH[c][1]);
        return "<tr><td>" + CH[c][0] + "</td><td>" + Math.round(n * att).toLocaleString() + "</td><td>" + Math.round(ok).toLocaleString() + "</td><td>" + Math.round(give).toLocaleString() + "</td><td>" + Math.round(dup).toLocaleString() + "</td><td>" + fmtT(t) + "</td></tr>";
      });
      el.querySelector("[data-r='tb']").innerHTML = rows.length ? rows.join("") : "<tr><td colspan='6'>Pick at least one channel.</td></tr>";
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    el.addEventListener("change", function (e) { var c = e.target.getAttribute("data-c"); if (c) { s.ch[c] = e.target.checked; ctx.save(); draw(); } if (e.target.getAttribute("data-r") === "dedupe") { s.dedupe = e.target.checked; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P04",
    summary: "Send push, email and SMS notifications reliably at scale: requirements, estimates, a send API, preferences and templates, per-channel queues and workers, third-party providers, retries, dedupe, rate limits and tracking.",
    slides: [
      { t: "1. Requirements", x: "Clarify channels, triggers and guarantees.",
        p: ["Functional: send notifications via mobile push, email and SMS (in-app optional); triggered by services (order shipped) or campaigns (marketing to millions); templates with variables; user preferences and opt-outs; scheduling", "Non-functional: no lost transactional notifications; no duplicates (best effort); seconds latency for transactional, minutes OK for bulk; scale to millions per campaign; observability of delivery", "Out of scope: building our own SMTP/SMS network — use providers"],
        m: "flowchart LR\n  S[\"Services: order, auth, social\"] --> NS[\"Notification system\"]:::s0\n  M[\"Marketing campaigns\"] --> NS\n  NS --> P[\"Push\"]:::s2\n  NS --> E[\"Email\"]:::s2\n  NS --> T[\"SMS\"]:::s2" },
      { t: "2. Estimates", x: "Example: 50 M daily active users.",
        table: [["Type", "Volume"], ["Push", "~10 per user/day → 500 M/day ≈ 6k/s avg, much higher in bursts"], ["Email", "~1 per user/day → 50 M/day ≈ 600/s"], ["SMS", "OTPs etc. ~1 M/day ≈ 12/s (expensive, rate-limited by providers)"], ["Campaign burst", "20 M pushes in 10 min ≈ 33k/s"], ["Log storage", "~550 M events/day × ~200 B ≈ 110 GB/day"]],
        m: "flowchart LR\n  A[\"Steady: ~7k/s\"]:::s0 --> Q[(\"Queues absorb bursts\")]:::s1\n  B[\"Campaign: ~33k/s\"]:::bad --> Q" },
      { t: "3. API", x: "One internal send API; callers don't care about channels' details.",
        p: ["POST /v1/notifications {notification_id (idempotency), user_id(s) or segment, template_id, params, category, priority, channels?, send_at?} → 202 {id}", "GET /v1/notifications/{id} → status per channel", "User settings: GET/PUT /v1/users/{id}/preferences", "Device registration: POST /v1/devices {user_id, platform, token}"],
        m: "sequenceDiagram\n  participant O as Order service\n  participant N as Notification API\n  O->>N: POST /v1/notifications {id: ship-981, user 42, template: shipped}\n  N-->>O: 202 Accepted\n  Note over N: validate, enqueue" },
      { t: "4. Data model", x: "A few stores with different access patterns.",
        table: [["Store", "Contents"], ["Templates (SQL)", "template_id, channel, locale, body with placeholders, version"], ["Preferences (SQL / KV)", "user_id, category, channel → on/off, quiet hours"], ["Devices (KV)", "user_id → [push tokens, platform, last_seen]"], ["Contact info", "user_id → email, phone (verified)"], ["Notification log (wide-column)", "notification_id, user_id, channel, status, timestamps"]],
        m: "flowchart LR\n  U[\"user 42\"] --> PR[(\"preferences\")]:::s1\n  U --> DV[(\"devices / contacts\")]:::s0\n  T[(\"templates\")]:::s2 --> R[\"render\"]\n  L[(\"notification log\")]" },
      { t: "5. High-level architecture", x: "Accept fast, process asynchronously, one queue per channel.",
        m: "flowchart LR\n  SV[\"Services / campaigns\"] --> API[\"Notification API\"]:::s0 --> IN[(\"Ingest queue\")]:::s1\n  IN --> PROC[\"Processor: prefs, dedupe, template, rate limits\"]:::s0\n  PROC --> QP[(\"push queue\")]:::s1 --> WP[\"Push workers\"] --> APNS[\"APNs / FCM\"]:::s2\n  PROC --> QE[(\"email queue\")]:::s1 --> WE[\"Email workers\"] --> ESP[\"Email provider\"]:::s2\n  PROC --> QS[(\"SMS queue\")]:::s1 --> WS[\"SMS workers\"] --> SMSP[\"SMS provider\"]:::s2\n  WP --> LOG[(\"Log + metrics\")]\n  WE --> LOG\n  WS --> LOG",
        p: ["Separate queues isolate channels: an email provider outage doesn't block pushes", "Priority queues: OTPs and security alerts ahead of marketing"] },
      { t: "6. Deep dive: processing a notification", x: "What the processor does before anything is sent.",
        p: ["Dedupe: notification_id already processed? → skip (F24)", "Load preferences: opted out of category/channel? quiet hours? → drop or delay", "Per-user rate limits / frequency caps (e.g. ≤ 3 marketing pushes/day)", "Resolve recipients: devices (push), email, phone", "Render template with params and locale", "Enqueue one message per channel/device"],
        m: "flowchart LR\n  M[\"message\"] --> D{\"seen id?\"}\n  D -->|\"yes\"| X[\"drop\"]\n  D -->|\"no\"| P{\"prefs allow?\"}:::s1\n  P -->|\"no\"| X\n  P -->|\"yes\"| RL{\"under frequency cap?\"}:::s1\n  RL -->|\"yes\"| RN[\"render template\"]:::s0 --> Q[\"channel queues\"]" },
      { t: "7. Deep dive: reliability", x: "Third-party providers fail, throttle and time out.",
        p: ["At-least-once queues + idempotent workers; pass our id to providers where supported", "Retry transient errors with exponential backoff + jitter; respect provider rate limits (429)", "After N attempts → dead-letter queue with alerting", "Failover to a secondary provider (e.g. second SMS/email vendor) on sustained errors", "Handle provider feedback: invalid push tokens → delete device; email bounces/complaints → suppress address"],
        m: "flowchart LR\n  W[\"Worker\"] --> PV{\"Provider\"}:::s2\n  PV -->|\"5xx / timeout\"| RT[\"retry w/ backoff\"]:::s1 --> W\n  PV -->|\"invalid token\"| DEL[\"remove device\"]\n  RT -->|\"N failures\"| DLQ[(\"DLQ\")]:::bad\n  PV -->|\"sustained errors\"| ALT[\"secondary provider\"]" },
      { t: "8. Deep dive: campaigns at scale", x: "Sending to 20 M users is a batch job, not 20 M API calls.",
        p: ["Campaign service expands a segment in batches (e.g. 1,000 users per message) from a precomputed audience table", "Throttle the send rate to protect providers and your own backends (app traffic spikes when users tap)", "Stagger by time zone / quiet hours", "Track sent, delivered, opened, clicked via provider callbacks and tracking links"],
        m: "flowchart LR\n  C[\"Campaign\"] --> SEG[(\"Audience table\")]:::s0 --> B[\"Batcher: 1k users/msg\"]:::s1 --> IN[(\"Ingest queue\")] --> PROC[\"Processor\"]\n  CB[\"Provider callbacks\"] --> AN[(\"Analytics\")]:::s2" },
      { t: "9. Bottlenecks and trade-offs", x: "What to discuss when pushed.",
        p: ["Exactly-once delivery is impossible end to end (providers may duplicate) → dedupe ids, accept rare duplicates", "Ordering: rarely needed; if so, partition by user_id", "Latency vs cost: SMS is expensive → prefer push, fall back to SMS only for critical messages", "Preference lookups at 30k/s → cache preferences in Redis", "Privacy: minimal PII in payloads; lock-screen content for sensitive data"],
        m: "flowchart LR\n  PUSH[\"Push: cheap, may be missed\"]:::s0 --> EMAIL[\"Email: cheap, slow to read\"]:::s1 --> SMS[\"SMS: costly, reliable reach\"]:::s2" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["API accepts with idempotency id → ingest queue → processor (dedupe, prefs, caps, templates)", "Per-channel priority queues and workers → APNs/FCM, email and SMS providers", "Retries with backoff, DLQ, provider failover, token/bounce cleanup", "Campaigns batched and throttled; delivery events tracked", "Redis for prefs/dedupe; wide-column log for history"],
        m: "flowchart LR\n  A[\"API\"]:::s0 --> P[\"Processor\"]:::s1 --> Q[\"Channel queues\"] --> W[\"Workers\"] --> PR[\"Providers\"]:::s2" }
    ],
    widget: { heading: "Notification campaign simulator", caption: "Pick channels, audience, failure rate and retries to see sends, give-ups, duplicates and drain time.", render: widget },
    examples: [
      ["APNs and FCM", "iOS push goes through Apple Push Notification service and Android through Firebase Cloud Messaging; apps register device tokens that can expire or change."],
      ["Uber", "Has written about its push platform delivering notifications to riders and drivers at scale, with prioritisation."],
      ["Airbnb / LinkedIn", "Both have described central notification platforms with user preferences and frequency limits to avoid notification fatigue."],
      ["Email providers", "Services such as Amazon SES, SendGrid and Mailgun send email and report bounces and complaints through callbacks."]
    ],
    pitfalls: [
      "Calling providers synchronously inside the caller's request",
      "One shared queue so a slow channel blocks all others",
      "No dedupe ids, so retries spam users",
      "Ignoring preferences, quiet hours and frequency caps",
      "Never cleaning invalid tokens or bounced addresses",
      "Treating SMS as cheap"
    ],
    quiz: [
      ["Why one queue per channel?", ["Cheaper storage", "Isolation: a failing email provider doesn't block push", "Providers require it", "Ordering"], 1, "Independent scaling and failure isolation."],
      ["What prevents duplicate notifications on retries?", ["Faster workers", "A notification_id used for dedupe (idempotency)", "Larger queues", "SMS"], 1, "Workers skip ids already processed."],
      ["APNs reports a push token as invalid. Action?", ["Retry forever", "Delete/disable that device token", "Send SMS instead always", "Ignore"], 1, "Keeps future sends efficient and avoids errors."],
      ["What should the send API return?", ["200 after delivery to the phone", "202 Accepted after enqueuing", "500", "Nothing"], 1, "Delivery happens asynchronously."],
      ["Best way to send a campaign to 20 M users?", ["20 M HTTP calls from the marketing tool", "Batch the audience and throttle into the queue", "One giant message", "Email only"], 1, "Protects providers and backends."],
      ["Where should preference checks happen?", ["In each calling service", "Centrally in the notification processor (with a cache)", "In the provider", "On the device only"], 1, "One place to enforce opt-outs and caps."],
      ["Which channel is typically the most expensive per message?", ["Push", "Email", "SMS", "In-app"], 2, "Carriers charge per message."],
      ["A provider has sustained 5xx errors. Good response?", ["Drop all messages", "Back off, then fail over to a secondary provider", "Retry instantly in a loop", "Switch everything to SMS"], 1, "Backoff + failover; DLQ after N attempts."]
    ],
    practice: {
      q: "Design one-time-password (OTP) delivery for login: users must receive a 6-digit code within ~10 seconds, codes expire in 5 minutes, and attackers try to abuse it to send costly SMS (SMS pumping).",
      a: [
        ["Flow", "Auth service generates a random code, stores hash(code) with TTL 5 min and attempt counter; calls notification API with priority=critical and an idempotency id."],
        ["Channel", "Dedicated high-priority SMS queue and workers (never behind marketing); push or authenticator apps preferred when available; email as a fallback."],
        ["Speed", "Low queue depth, pre-warmed connections to two SMS providers; fail over if no delivery receipt within a few seconds."],
        ["Abuse", "Rate-limit OTP sends per phone, per IP, per device and globally per country prefix; captcha after a few requests; block premium-rate number ranges; alert on cost spikes."],
        ["Verification", "Limit attempts (e.g. 5), compare hashes, invalidate after use; no code in logs."],
        ["Trade-offs", "Strict limits can lock out real users; provider failover may cause two SMS (accept, same code)."]
      ]
    },
    recap: [
      "Accept with 202 and an idempotency id; do the work asynchronously.",
      "Processor enforces dedupe, preferences, quiet hours and frequency caps.",
      "Per-channel priority queues and workers talk to APNs/FCM, email and SMS providers.",
      "Retries with backoff, DLQ, provider failover, token and bounce cleanup.",
      "Campaigns are batched and throttled; delivery events tracked."
    ]
  });
})();
