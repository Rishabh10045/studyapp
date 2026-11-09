/* Lesson P17: Ticket booking (BookMyShow) */
(function () {
  "use strict";
  var H = window.HLD;
  var ROWS = "ABCDEF", COLS = 10, TTL = 8;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.seats) { s.seats = {}; s.t = 0; s.log = []; s.seed = 7; }
    function rnd() { s.seed = (s.seed * 16807) % 2147483647; return s.seed / 2147483647; }
    el.innerHTML = "<p class='caption'>Click seats to hold them for yourself. Each action also lets other buyers act. Holds expire after " + TTL + " minutes unless paid.</p>" +
      "<div data-r='screen' style='text-align:center;font-size:12px;color:var(--text-3);margin-bottom:6px'>SCREEN</div><div data-r='map' style='display:grid;grid-template-columns:repeat(" + COLS + ",1fr);gap:5px;max-width:460px;margin:0 auto'></div>" +
      "<div class='controls' style='justify-content:center'><button class='btn primary' data-a='pay'>Pay for my held seats</button><button class='btn' data-a='tick'>Advance 1 minute</button><button class='btn' data-a='reset'>Reset show</button></div>" +
      "<div class='metrics' data-r='m'></div><div class='rows' data-r='log'></div>" +
      "<p class='caption'>Each hold is a conditional write: UPDATE seats SET status='HELD', holder=?, hold_until=now()+8min WHERE show=? AND seat=? AND (status='FREE' OR hold_until < now()). Only one request can win a seat.</p>";
    function st(id) { var x = s.seats[id]; if (x && x.st === "held" && x.until <= s.t) { delete s.seats[id]; return null; } return x || null; }
    function hold(id, who) { var x = st(id); if (x) return false; s.seats[id] = { st: "held", who: who, until: s.t + TTL }; return true; }
    function others() { for (var k = 0; k < 2; k++) { var id = ROWS[Math.floor(rnd() * 6)] + (1 + Math.floor(rnd() * COLS)); if (hold(id, "other")) { s.log.unshift("t=" + s.t + " min: another buyer held " + id); if (rnd() < 0.5) s.seats[id].pay = s.t + 2; } } }
    function settle() { Object.keys(s.seats).forEach(function (id) { var x = s.seats[id]; if (x.who === "other" && x.st === "held" && x.pay != null && x.pay <= s.t) { x.st = "sold"; } st(id); }); }
    function draw() {
      var html = "", mine = 0, held = 0, sold = 0;
      for (var r = 0; r < 6; r++) for (var c = 1; c <= COLS; c++) {
        var id = ROWS[r] + c, x = st(id), bg = "var(--bg-subtle)", fg = "var(--text)", lbl = id;
        if (x && x.st === "sold") { bg = x.who === "me" ? "var(--success)" : "var(--other)"; fg = "#fff"; sold++; }
        else if (x && x.who === "me") { bg = "var(--c0)"; fg = "#fff"; mine++; lbl = id + " " + (x.until - s.t) + "m"; }
        else if (x) { bg = "var(--c1)"; held++; }
        html += "<button data-s='" + id + "' style='padding:6px 0;font-size:11px;border-radius:6px;border:1px solid var(--border);background:" + bg + ";color:" + fg + "'>" + lbl + "</button>";
      }
      el.querySelector("[data-r='map']").innerHTML = html;
      el.querySelector("[data-r='m']").innerHTML = [[mine, "Held by you"], [held, "Held by others"], [sold, "Sold"], ["t = " + s.t + " min", "Clock"]].map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      el.querySelector("[data-r='log']").innerHTML = s.log.slice(0, 5).map(function (l) { return "<div class='row'><span class='dt'>" + ctx.esc(l) + "</span></div>"; }).join("");
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var id = b.getAttribute("data-s"), a = b.getAttribute("data-a");
      if (id) { var x = st(id); if (x && x.who === "me" && x.st === "held") { delete s.seats[id]; s.log.unshift("t=" + s.t + " min: you released " + id); } else if (hold(id, "me")) s.log.unshift("t=" + s.t + " min: you held " + id + " (1 row updated)"); else s.log.unshift("t=" + s.t + " min: " + id + " is taken (0 rows updated)"); others(); }
      if (a === "tick") { s.t++; settle(); others(); }
      if (a === "pay") { var n = 0; Object.keys(s.seats).forEach(function (k) { var y = st(k); if (y && y.who === "me" && y.st === "held") { y.st = "sold"; n++; } }); s.log.unshift("t=" + s.t + " min: payment succeeded (idempotency key) → " + n + " seat(s) SOLD"); }
      if (a === "reset") { s.seats = {}; s.t = 0; s.log = []; }
      if (id || a) { ctx.save(); draw(); }
    });
    draw();
  }

  H.registerLesson({
    code: "P17",
    summary: "Sell seats without ever selling one twice: requirements, estimates, APIs, data model, temporary seat holds with TTL, locking strategies, payment integration with idempotency, and surviving flash-sale spikes with a virtual waiting room.",
    slides: [
      { t: "1. Requirements", x: "Correctness under contention is the heart of this problem.",
        p: ["Functional: browse movies/events, shows and venues; view a seat map with live availability; select seats and hold them while paying; pay; get tickets; cancel/refund per policy", "Non-functional: never double-sell a seat (strong consistency for inventory); seat map can be slightly stale; handle huge spikes for popular releases/concerts; fair access; high availability for browsing", "Ask: max seats per booking (e.g. 10), hold duration (e.g. 8–10 min)"],
        m: "flowchart LR\n  U[\"User\"] --> BR[\"Browse shows\"] --> SM[\"Seat map\"]:::s0 --> HL[\"Hold seats\"]:::s1 --> PY[\"Pay\"]:::s2 --> TK[\"Ticket\"]" },
      { t: "2. Estimates", x: "Example: a national ticketing platform.",
        table: [["Quantity", "Estimate"], ["Bookings", "~10 M tickets/day ≈ 115/s average"], ["Browsing", "100× bookings: ~10k reads/s"], ["Flash sale (big concert)", "1 M users arrive in minutes for 50k seats"], ["Seat records", "shows × seats: e.g. 500k shows/day × 200 seats = 100 M seat rows/day"]],
        p: ["Average load is modest; spikes and contention on the same rows are the real problem"],
        m: "flowchart LR\n  AVG[\"Average: modest\"]:::s0\n  SPK[\"Flash sale: 1 M users → 50k seats\"]:::bad" },
      { t: "3. API", x: "Core endpoints.",
        p: ["GET /v1/shows?city=…&movie=…&date=…", "GET /v1/shows/{id}/seats → seat map with status (cacheable a few seconds)", "POST /v1/shows/{id}/holds {seat_ids[]} → {hold_id, expires_at} or 409 (some seats taken)", "POST /v1/bookings {hold_id, payment_method} + Idempotency-Key → {booking_id, status}", "DELETE /v1/holds/{id}; POST /v1/bookings/{id}/cancel"],
        m: "sequenceDiagram\n  participant U as User\n  participant A as API\n  U->>A: POST /holds {A5, A6}\n  A-->>U: hold_id, expires in 8 min\n  U->>A: POST /bookings {hold_id} (Idempotency-Key)\n  A-->>U: CONFIRMED + tickets" },
      { t: "4. Data model", x: "Relational, because inventory needs transactions.",
        table: [["Table", "Columns"], ["venues, screens, seats", "physical layout"], ["shows", "show_id, movie/event, screen, start_time, prices"], ["show_seats", "show_id, seat_id, status (FREE/HELD/BOOKED), hold_id, hold_until, version — PK (show_id, seat_id)"], ["holds", "hold_id, user_id, show_id, expires_at"], ["bookings", "booking_id, user_id, show_id, seats, amount, status, idempotency_key (unique)"]],
        m: "flowchart LR\n  SH[(\"shows\")]:::s0 --> SS[(\"show_seats: status, hold_until, version\")]:::s1\n  SS --> HO[(\"holds\")]\n  HO --> BK[(\"bookings\")]:::s2" },
      { t: "5. High-level architecture", x: "Read-heavy catalog separated from the strongly consistent booking core.",
        m: "flowchart LR\n  U[\"Users\"] --> CDN[\"CDN\"]:::s2 --> WR[\"Waiting room (for hot events)\"]:::s1 --> GW[\"API gateway + rate limits\"]\n  GW --> CAT[\"Catalog / search service\"]:::s0 --> CC[(\"Cache\")]\n  GW --> INV[\"Inventory / hold service\"]:::s0 --> DB[(\"Booking DB (sharded by show)\")]\n  GW --> BKS[\"Booking service\"]:::s0 --> PAY[\"Payment service / gateway\"]\n  BKS --> DB\n  BKS --> K[(\"Kafka\")] --> NT[\"Tickets, emails, analytics\"]\n  SW[\"Hold expiry sweeper\"] --> DB" },
      { t: "6. Deep dive: holding seats", x: "A hold reserves seats briefly so the user can pay, without locks held across the payment.",
        p: ["One transaction: conditionally update all requested seats FREE (or expired HELD) → HELD with hold_id and hold_until; if fewer rows updated than requested → rollback, 409", "No long-lived DB locks: the hold is data, not a lock", "Expiry: reads treat hold_until < now() as free; a sweeper resets them in the background", "Alternative: Redis SET seat:show:A5 hold_id NX EX 480 — fast, but must be reconciled with the DB", "Shard by show_id so all seats for a show are in one shard → single-shard transactions"],
        m: "flowchart LR\n  REQ[\"hold A5, A6\"] --> TX{\"UPDATE … WHERE status='FREE' OR hold_until<now()\"}:::s1\n  TX -->|\"2 rows\"| OK[\"HELD until +8 min\"]:::s0\n  TX -->|\"< 2 rows\"| RB[\"rollback → 409 seats taken\"]:::bad" },
      { t: "7. Deep dive: locking options", x: "Recap of F27 applied to seats.",
        table: [["Approach", "Fit"], ["Pessimistic: SELECT … FOR UPDATE", "Simple; short transaction only; risk of contention/deadlocks (lock seats in sorted order)"], ["Optimistic: version check", "Good when conflicts are rare; many retries in flash sales"], ["Atomic conditional UPDATE", "Simplest and contention-friendly; the default answer"], ["Distributed lock (Redis)", "Extra moving part; needs fencing; avoid if the DB can do it"]],
        m: "flowchart LR\n  C[\"Conditional UPDATE\"]:::s0 --> W[\"one winner per seat\"]:::s2" },
      { t: "8. Deep dive: payment and confirmation", x: "Money and seats must end up consistent.",
        p: ["Booking created PENDING with idempotency key; payment requested with the same key (F24)", "Payment success → mark seats BOOKED (only if still held by this hold_id) → CONFIRMED, issue tickets", "Payment fails or hold expires → release seats; if payment succeeded after expiry → refund automatically (saga compensation, F27)", "Payment gateway callbacks deduped by event id; reconciliation job for stuck PENDING bookings"],
        m: "stateDiagram-v2\n  [*] --> Held\n  Held --> PaymentPending: user pays\n  PaymentPending --> Confirmed: payment ok + seats still held\n  PaymentPending --> Refunded: payment ok but hold expired\n  PaymentPending --> Released: payment failed\n  Held --> Released: hold expired" },
      { t: "9. Deep dive: flash sales", x: "1 M people want 50k seats at 10:00:00.",
        p: ["Virtual waiting room: users get a queue position; admitted at a rate the booking core can handle (tokens, signed admission cookies)", "Static pages and seat maps via CDN with short TTLs; real availability enforced only at hold time", "Rate limits per user/device; bot detection/captcha", "Pre-scale and pre-warm; shard hot show's seats by section if needed", "Fairness and clear messaging beat raw throughput"],
        m: "flowchart LR\n  U[\"1 M users\"] --> WR[\"Waiting room: queue position\"]:::s1 -->|\"admit ~2k/min\"| BK[\"Booking core\"]:::s0\n  WR --> MSG[\"'You are #45,210, ~20 min'\"]:::s2" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Catalog read path cached; booking core strongly consistent in a sharded SQL DB (by show)", "Seat holds via atomic conditional updates with TTL; expiry on read + sweeper", "Booking saga: hold → pay (idempotent) → confirm or release/refund", "Waiting room, rate limits and bot defence for flash sales", "Events to Kafka for tickets, emails and analytics"],
        m: "flowchart LR\n  B[\"Browse (cached)\"]:::s2 --> H[\"Hold (atomic)\"]:::s1 --> P[\"Pay (idempotent)\"]:::s0 --> C[\"Confirm\"]" }
    ],
    widget: { heading: "Seat hold simulator", caption: "Hold seats while other buyers compete; watch holds expire, conflicts return 0 rows, and payment confirm your seats.", render: widget },
    examples: [
      ["Ticketmaster and Taylor Swift (2022)", "The Eras Tour presale saw demand far beyond capacity (Ticketmaster reported 3.5 billion system requests), leading to failures and a US Senate hearing — a case study in flash-sale design."],
      ["Virtual waiting rooms", "Queue-it and Cloudflare Waiting Room are commercial services that admit visitors at a controlled rate during spikes."],
      ["BookMyShow", "India's largest movie and event ticketing platform, handling big spikes for major film releases and concerts."],
      ["Airline seat holds", "Airlines similarly hold inventory during checkout and release it if payment doesn't complete."]
    ],
    pitfalls: [
      "Check-then-update without an atomic condition (double booking)",
      "Holding DB row locks while the user pays",
      "Relying on the cleanup job alone for hold expiry",
      "Non-idempotent payment requests",
      "No waiting room or rate limiting for flash sales",
      "Treating the cached seat map as the source of truth"
    ],
    quiz: [
      ["How do you prevent two users booking seat A5?", ["Show it greyed out", "Atomic conditional update: only if status is FREE (or hold expired)", "Ask users to hurry", "Cache it"], 1, "Exactly one request updates the row."],
      ["Why use temporary holds instead of locking during payment?", ["Payments are fast", "Payment can take minutes; long DB locks would block everyone", "Holds are cheaper to store", "Required by law"], 1, "The hold is data with an expiry, not a lock."],
      ["A user requests 4 seats; only 3 are free. Correct behaviour?", ["Hold 3", "Roll back and return 409", "Hold 4 anyway", "Retry forever"], 1, "All-or-nothing in one transaction."],
      ["Best shard key for seat inventory?", ["user_id", "show_id", "seat number", "payment id"], 1, "Keeps a show's seats in one shard for single-shard transactions."],
      ["Payment succeeds after the hold expired and seats were resold. Action?", ["Double book", "Automatically refund (compensation)", "Cancel the other user", "Ignore"], 1, "Saga compensation."],
      ["What does a virtual waiting room do?", ["Caches seat maps", "Admits users at a rate the booking system can handle, with queue positions", "Processes payments", "Prints tickets"], 1, "Protects the core and improves fairness."],
      ["How should the seat map be served?", ["Always strongly consistent from the primary", "Cached for a few seconds; correctness enforced at hold time", "Not shown", "From the payment gateway"], 1, "Reads can be slightly stale."],
      ["How to avoid deadlocks when locking several seats pessimistically?", ["Random order", "Lock seats in a consistent (sorted) order", "Lock the whole DB", "Use UDP"], 1, "Consistent ordering prevents cycles."]
    ],
    practice: {
      q: "A stadium concert has 60,000 seats and 2 million fans arriving at 10:00. Users may choose 'best available' rather than picking seats. Design the sale.",
      a: [
        ["Admission", "Waiting room opens at 09:30; random queue order at 10:00 for fairness; admit at a measured rate (e.g. 3–5k users/min) with signed tokens."],
        ["Limits", "Max 4–6 tickets per account; verified accounts; captcha/bot scoring; per-account and per-card rate limits."],
        ["Inventory", "Seats sharded by section; 'best available' allocator per section picks contiguous seats and holds them with atomic conditional updates (or pre-split seat blocks in Redis queues reconciled with the DB)."],
        ["Holds", "Short holds (e.g. 5–8 min); expired holds return to inventory and are offered to the next users."],
        ["Payment", "Idempotent payment requests; saga to confirm or release; refunds for late successes."],
        ["Read path", "Event page and availability counts via CDN; 'sold out' broadcast to the waiting room promptly."],
        ["Trade-offs", "Queues add waiting time but prevent collapse; smaller holds help availability but pressure buyers."]
      ]
    },
    recap: [
      "Never double-sell: strongly consistent inventory, sharded by show.",
      "Holds = atomic conditional updates with TTL; expiry checked on read.",
      "Booking saga: hold → idempotent payment → confirm, or release/refund.",
      "Seat maps cached briefly; truth enforced at hold time.",
      "Flash sales need a waiting room, rate limits and bot defence."
    ]
  });
})();
