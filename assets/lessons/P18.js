/* Lesson P18: Payment system */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.led) { s.led = []; s.keys = {}; s.psp = []; s.idem = true; s.n = 0; s.log = []; }
    el.innerHTML = "<p class='caption'>Simplified model: a ₹500 order, 3% platform fee. Every movement is a balanced double-entry transaction. Toggle idempotency and replay the nasty cases.</p>" +
      "<div class='controls'><label><input type='checkbox' data-r='idem'> Use idempotency key</label></div>" +
      "<div class='controls'><button class='btn primary' data-a='pay'>New payment</button><button class='btn' data-a='retry'>Client retries after timeout</button><button class='btn' data-a='hook'>PSP webhook delivered again</button><button class='btn' data-a='settle'>PSP settles to bank</button><button class='btn' data-a='recon'>Run reconciliation</button><button class='btn' data-a='reset'>Reset</button></div>" +
      "<div class='metrics' data-r='m'></div><div data-r='t' style='overflow-x:auto'></div><div class='rows' data-r='log'></div>";
    el.querySelector("[data-r='idem']").checked = !!s.idem;
    function post(desc, lines) { s.led.push({ d: desc, l: lines }); }
    function charge(order) {
      s.psp.push({ order: order, amt: 500 });
      post("Payment order #" + order, [["PSP receivable", 500, 0], ["Merchant payable", 0, 485], ["Fee revenue", 0, 15]]);
    }
    function attempt(order, via) {
      var key = "order-" + order;
      if (s.idem && s.keys[key]) { s.log.unshift(via + " for #" + order + ": key " + key + " seen → returned stored result, no new charge"); return; }
      s.keys[key] = true; charge(order); s.log.unshift(via + " for #" + order + ": charged ₹500" + (s.idem ? " (key " + key + " stored)" : ""));
    }
    function bal() { var b = {}; s.led.forEach(function (t) { t.l.forEach(function (x) { b[x[0]] = (b[x[0]] || 0) + x[1] - x[2]; }); }); return b; }
    function draw() {
      var b = bal(), dr = 0, cr = 0;
      s.led.forEach(function (t) { t.l.forEach(function (x) { dr += x[1]; cr += x[2]; }); });
      var orders = {}, dup = 0; s.psp.forEach(function (p) { orders[p.order] = (orders[p.order] || 0) + 1; }); Object.keys(orders).forEach(function (k) { dup += orders[k] - 1; });
      el.querySelector("[data-r='m']").innerHTML = [[s.n, "Orders"], [s.psp.length, "Charges at PSP"], [dup, "Duplicate charges"], ["₹" + dr + " / ₹" + cr, "Debits / credits (must match)"]].map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var rows = s.led.slice(-6).map(function (t) { return t.l.map(function (x, i) { return "<tr><td>" + (i ? "" : ctx.esc(t.d)) + "</td><td>" + x[0] + "</td><td style='text-align:right'>" + (x[1] || "") + "</td><td style='text-align:right'>" + (x[2] || "") + "</td></tr>"; }).join(""); }).join("");
      var bl = Object.keys(b).map(function (k) { return k + ": " + (b[k] >= 0 ? "Dr " : "Cr ") + Math.abs(b[k]); }).join(" · ");
      el.querySelector("[data-r='t']").innerHTML = "<table><tr><th>Transaction (last 6)</th><th>Account</th><th>Debit</th><th>Credit</th></tr>" + (rows || "<tr><td colspan=4>No entries yet</td></tr>") + "</table><p class='caption'>Balances: " + (bl || "—") + "</p>";
      el.querySelector("[data-r='log']").innerHTML = s.log.slice(0, 6).map(function (l) { return "<div class='row'><span class='dt'>" + ctx.esc(l) + "</span></div>"; }).join("");
    }
    el.addEventListener("change", function () { s.idem = el.querySelector("[data-r='idem']").checked; ctx.save(); });
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; var a = b.getAttribute("data-a");
      if (a === "pay") { s.n++; attempt(s.n, "Client request"); }
      if (a === "retry") { if (!s.n) s.log.unshift("Make a payment first"); else attempt(s.n, "Client retry"); }
      if (a === "hook") { if (!s.n) s.log.unshift("Make a payment first"); else if (s.idem) s.log.unshift("Duplicate webhook for #" + s.n + ": event id already processed → ignored"); else { post("Webhook re-applied #" + s.n, [["PSP receivable", 500, 0], ["Merchant payable", 0, 485], ["Fee revenue", 0, 15]]); s.log.unshift("Duplicate webhook for #" + s.n + ": no dedupe → ledger posted twice (PSP charged once)"); } }
      if (a === "settle") { var r = bal()["PSP receivable"] || 0; var due = s.psp.length * 500 - (s.settled || 0); if (due <= 0) s.log.unshift("Nothing to settle"); else { post("PSP settlement", [["Bank", due, 0], ["PSP receivable", 0, due]]); s.settled = (s.settled || 0) + due; s.log.unshift("PSP paid ₹" + due + " to bank (ledger expected ₹" + r + ")"); } }
      if (a === "recon") { var led = 0; s.led.forEach(function (t) { if (t.d.indexOf("Payment") === 0 || t.d.indexOf("Webhook") === 0) led += 500; }); var psp = s.psp.length * 500; s.log.unshift(led === psp ? "Reconciliation OK: ledger ₹" + led + " = PSP report ₹" + psp : "Reconciliation MISMATCH: ledger ₹" + led + " vs PSP report ₹" + psp + " → raise exception for ops"); }
      if (a === "reset") { s.led = []; s.keys = {}; s.psp = []; s.n = 0; s.log = []; s.settled = 0; }
      ctx.save(); draw();
    });
    draw();
  }

  H.registerLesson({
    code: "P18",
    summary: "Move money exactly once and prove it: requirements, estimates, APIs, the payment state machine, PSP integration with webhooks, idempotency, a double-entry ledger, reconciliation, retries and audit.",
    slides: [
      { t: "1. Requirements", x: "Scope: the pay-in side of an e-commerce payment system (simplified, like Stripe Checkout inside a marketplace).",
        p: ["Functional: accept payments for orders via cards/UPI/wallets through external payment service providers (PSPs); refunds; pay out to sellers; show payment status", "Non-functional: correctness above all — never charge twice, never lose a payment; durable audit trail; high availability; security and compliance (PCI DSS)", "Out of scope: building a card network or a PSP ourselves"],
        m: "flowchart LR\n  B[\"Buyer\"] --> PS[\"Our payment service\"]:::s0 --> PSP[\"PSP (Stripe, Adyen, Razorpay)\"]:::s1 --> NET[\"Card networks / UPI / banks\"]\n  PS --> L[(\"Ledger\")]:::s2" },
      { t: "2. Estimates", x: "Throughput is small; the bar is correctness.",
        table: [["Quantity", "Estimate"], ["Payments", "10 M/day ≈ 115 TPS average, peaks ~10×"], ["Ledger rows", "~3–4 entries per payment → ~40 M rows/day"], ["Retention", "years (audit/regulation)"], ["PSP latency", "hundreds of ms to seconds; some methods confirm asynchronously"]],
        p: ["A single well-run relational DB cluster handles this; partition by merchant or time as needed"],
        m: "flowchart LR\n  T[\"~1k TPS peak\"]:::s0 --> C[\"Correctness >> scale\"]:::s1" },
      { t: "3. API", x: "Every mutating call carries an idempotency key.",
        p: ["POST /v1/payments {order_id, amount, currency, method} + Idempotency-Key → {payment_id, status, redirect/next_action}", "GET /v1/payments/{id}", "POST /v1/payments/{id}/refunds {amount} + Idempotency-Key", "POST /webhooks/psp — PSP pushes events (signed); we verify signature and dedupe by event id", "Amounts as integers in minor units (paise/cents) with currency — never floats"],
        m: "sequenceDiagram\n  participant C as Client\n  participant P as Payment service\n  participant S as PSP\n  C->>P: POST /payments (Idempotency-Key)\n  P->>S: create charge (same key)\n  S-->>P: PENDING / requires_action\n  S-->>P: webhook payment.succeeded\n  P-->>C: status SUCCEEDED" },
      { t: "4. Data model", x: "State tables plus an append-only ledger.",
        table: [["Table", "Purpose"], ["payments", "payment_id, order_id, amount_minor, currency, status, psp_ref, idempotency_key (unique), timestamps"], ["payment_events", "append-only history of state changes and PSP events (event_id unique)"], ["ledger_entries", "txn_id, account, debit, credit, currency, created_at — immutable"], ["accounts", "merchant payable, PSP receivable, fees, bank, refunds…"], ["idempotency_keys", "key, request hash, stored response, expiry"]],
        m: "flowchart LR\n  PA[(\"payments (state)\")]:::s0 --> EV[(\"payment_events (append-only)\")]:::s1\n  PA --> LE[(\"ledger_entries (immutable, balanced)\")]:::s2" },
      { t: "5. High-level architecture", x: "Synchronous path to start the payment; asynchronous path to finish it.",
        m: "flowchart LR\n  CK[\"Checkout service\"] --> PS[\"Payment service\"]:::s0 --> DB[(\"Payments DB\")]\n  PS --> EX[\"PSP adapter / executor\"]:::s1 --> PSP[\"PSP\"]\n  PSP -->|\"webhook\"| WH[\"Webhook handler\"]:::s1 --> PS\n  PS --> OB[(\"Outbox → Kafka\")] --> LG[\"Ledger service\"]:::s2 --> LDB[(\"Ledger DB\")]\n  OB --> WAL[\"Wallet / payouts\"]\n  OB --> ORD[\"Order service\"]\n  REC[\"Reconciliation job\"]:::s2 --> LDB\n  PSP -->|\"daily settlement file\"| REC" },
      { t: "6. Deep dive: payment state machine", x: "Explicit states with only allowed transitions; every transition recorded.",
        m: "stateDiagram-v2\n  [*] --> Created\n  Created --> Processing: sent to PSP\n  Processing --> RequiresAction: 3-D Secure / UPI approve\n  RequiresAction --> Processing\n  Processing --> Succeeded\n  Processing --> Failed\n  Processing --> Unknown: timeout\n  Unknown --> Succeeded: status query / webhook\n  Unknown --> Failed\n  Succeeded --> Refunded",
        p: ["Unknown is a real state: on timeout, do not assume failure — query the PSP or wait for the webhook", "Transitions via conditional update (WHERE status = expected) so concurrent webhooks and retries can't regress state"] },
      { t: "7. Deep dive: idempotency end to end", x: "Retries are everywhere; each must be safe (F24).",
        p: ["Client → us: Idempotency-Key; store key + request hash + response; same key returns same result, different body → 422", "Us → PSP: pass a key derived from payment_id (major PSPs such as Stripe support idempotency keys)", "PSP → us: webhooks are at-least-once and may arrive out of order — dedupe by event id, apply only valid transitions", "Us → ledger/consumers: outbox pattern + idempotent consumers (F26)"],
        m: "flowchart LR\n  C[\"Client retry\"] -->|\"same key\"| P[\"Payment service: stored result\"]:::s0\n  P -->|\"same key\"| S[\"PSP: no second charge\"]:::s1\n  S -->|\"event id\"| W[\"Webhook dedupe\"]:::s2" },
      { t: "8. Deep dive: double-entry ledger", x: "Every transaction debits and credits accounts by equal amounts, so the books always balance.",
        table: [["Event", "Debit", "Credit"], ["Buyer pays ₹500", "PSP receivable 500", "Merchant payable 485, Fee revenue 15"], ["PSP settles to bank", "Bank 500", "PSP receivable 500"], ["Payout to merchant", "Merchant payable 485", "Bank 485"], ["Refund", "reverse with new entries — never edit old ones", ""]],
        p: ["Immutable, append-only; corrections are new entries", "Invariant: sum(debits) = sum(credits) per transaction — check in code and in audits", "Simplified model: real charts of accounts are richer (taxes, FX, chargebacks)"],
        m: "flowchart LR\n  D[\"Debits\"]:::s0 --- EQ{\"=\"}:::s1 --- CR[\"Credits\"]:::s0" },
      { t: "9. Deep dive: reconciliation", x: "Your records, the PSP's records and the bank's records must agree.",
        p: ["Daily: ingest PSP settlement reports, match each line to payments/ledger by psp_ref and amount", "Classify mismatches: missing on our side (lost webhook), missing at PSP, amount differences, fees", "Auto-fix known classes (e.g. fetch status for a lost webhook); queue the rest for finance ops", "Also periodic status sweeps for payments stuck in Processing/Unknown"],
        m: "flowchart LR\n  OUR[(\"Our ledger\")]:::s0 --> M{\"Match\"}:::s1\n  PSPR[(\"PSP settlement file\")] --> M\n  M -->|\"matched\"| OK[\"✓\"]:::s2\n  M -->|\"mismatch\"| Q[\"Exception queue / auto-fix\"]:::bad" },
      { t: "10. Deep dive: reliability, security, audit", x: "Payments touch regulation.",
        p: ["Retries with exponential backoff + jitter only for retryable errors; dead-letter queues; circuit breakers per PSP; failover between PSPs", "PCI DSS: never store raw card numbers — use PSP-hosted fields/tokenization so card data never touches your servers", "Strong auth (3-D Secure, UPI PIN) handled via PSP redirects", "Encrypt in transit and at rest; strict access control; full audit logs; webhooks verified by signature", "Observability: success rate per PSP/method, latency, stuck payments, reconciliation breaks (F25)"],
        m: "flowchart LR\n  R[\"Retry + backoff\"]:::s0\n  T[\"Tokenization (PCI)\"]:::s1\n  A[\"Audit log\"]:::s2\n  O[\"Monitoring\"]" },
      { t: "11. Wrap-up", x: "Summary.",
        p: ["Explicit payment state machine incl. Unknown; conditional transitions", "Idempotency at every hop: client, PSP, webhooks, consumers", "Immutable double-entry ledger as the source of financial truth", "Daily reconciliation against PSP and bank; sweeps for stuck payments", "Tokenization for PCI, signed webhooks, audit logs, per-PSP monitoring"],
        m: "flowchart LR\n  S[\"State machine\"]:::s0 --> I[\"Idempotency\"]:::s1 --> L[\"Ledger\"]:::s2 --> R[\"Reconciliation\"]" }
    ],
    widget: { heading: "Idempotency and double-entry ledger lab", caption: "Make a payment, then retry, replay webhooks, settle and reconcile — with and without idempotency.", render: widget },
    examples: [
      ["Stripe idempotency keys", "Stripe's API accepts an Idempotency-Key header on POST requests and returns the saved result for repeats, so clients can retry safely."],
      ["Stripe webhooks", "Stripe documents that webhook events can be delivered more than once and not in order, and recommends deduplicating by event id and verifying signatures."],
      ["Airbnb payments", "Airbnb has written about achieving data consistency in its payments system with an idempotency framework (Orpheus)."],
      ["UPI in India", "UPI payments can stay pending and be confirmed later; apps must handle asynchronous final status rather than assuming success or failure."]
    ],
    pitfalls: [
      "Treating a timeout as failure and charging again",
      "Using floats for money",
      "Mutable balance columns without a ledger",
      "Webhook handlers that aren't idempotent or don't check signatures",
      "Storing raw card data (PCI scope explosion)",
      "No reconciliation, so silent mismatches pile up"
    ],
    quiz: [
      ["The PSP call times out. What should you do?", ["Mark failed and let the user retry with a new charge", "Mark Unknown; query status or wait for the webhook; retry only with the same idempotency key", "Charge again immediately", "Refund"], 1, "Timeout ≠ failure."],
      ["Why represent money as integer minor units?", ["Faster", "Floats cause rounding errors", "Required by JSON", "Smaller"], 1, "e.g. 0.1 + 0.2 ≠ 0.3 in floating point."],
      ["Double-entry ledger invariant?", ["Credits > debits", "Each transaction's debits equal its credits", "Only debits are stored", "Balances are edited in place"], 1, "Books always balance."],
      ["A webhook arrives twice. Correct handling?", ["Apply twice", "Dedupe by event id; apply only valid state transitions", "Reject all webhooks", "Charge again"], 1, "At-least-once delivery."],
      ["How do you correct a wrong ledger entry?", ["UPDATE it", "DELETE it", "Post a new reversing/adjusting entry", "Ignore"], 2, "Immutable, auditable."],
      ["Main purpose of reconciliation?", ["Speed up payments", "Detect mismatches between our records, PSP and bank", "Encrypt data", "Send receipts"], 1, "Catches lost webhooks, fee errors and more."],
      ["How to stay out of most PCI scope?", ["Encrypt card numbers yourself", "Tokenization / PSP-hosted payment fields", "Store only last 8 digits", "Use HTTP"], 1, "Card data never touches your servers."],
      ["Same Idempotency-Key reused with a different amount. Response?", ["Process it", "Reject with an error (request mismatch)", "Return the old result silently", "Refund"], 1, "Store a request hash and compare."]
    ],
    practice: {
      q: "Design seller payouts for a marketplace: buyers pay via PSP; sellers are paid weekly minus fees, with refunds and chargebacks possible.",
      a: [
        ["Ledger", "Per-seller payable accounts; each payment credits seller payable and fee revenue; refunds/chargebacks debit seller payable (can go negative)."],
        ["Payout job", "Weekly: compute balance from the ledger (not a mutable column); create payout records with idempotency key seller+period; hold back a reserve for chargeback risk."],
        ["Execution", "Send bank transfers via payout provider; state machine Created→Sent→Paid/Failed; retries with same key; failures return funds to payable."],
        ["Reconciliation", "Match bank/provider reports to payout records and ledger; exceptions to ops."],
        ["Compliance", "KYC for sellers, tax reporting, audit logs."],
        ["Trade-offs", "Reserves protect against chargebacks but delay seller money; weekly batching reduces fees vs instant payouts."]
      ]
    },
    recap: [
      "Correctness over scale: never charge twice, never lose money.",
      "Explicit state machine; timeout means Unknown, not Failed.",
      "Idempotency keys at every hop; dedupe webhooks by event id.",
      "Immutable double-entry ledger; corrections are new entries.",
      "Reconcile daily; tokenize cards; audit and monitor everything."
    ]
  });
})();
