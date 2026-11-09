/* Lesson P02: Pastebin */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.w) { s.w = 5; s.kb = 10; s.ratio = 10; s.exp = 50; s.where = "obj"; }
    var F = [["w", "New pastes per day (millions)", 1, 50, 1], ["kb", "Average paste size (KB)", 1, 100, 1], ["ratio", "Reads per paste", 1, 100, 1], ["exp", "% of pastes that expire within a month", 0, 100, 5]];
    el.innerHTML = "<div class='grid2'>" + F.map(function (f) { return "<label class='field'>" + f[1] + ": <strong data-v='" + f[0] + "' style='color:var(--text)'></strong><input type='range' min='" + f[2] + "' max='" + f[3] + "' step='" + f[4] + "' data-k='" + f[0] + "'></label>"; }).join("") + "</div>" +
      "<div class='seg' data-r='where'><button data-w='db'>Content in the database</button><button data-w='obj'>Content in object storage</button></div>" +
      "<div class='metrics' data-r='m'></div><div class='bars' data-r='bars'></div><p class='caption'>5-year horizon. Metadata ≈ 300 bytes per paste. Expiring pastes are deleted by a cleanup job. Prices are deliberately left out — they vary by provider and region.</p>";
    function bytes(b) { return b >= 1e15 ? (b / 1e15).toFixed(2) + " PB" : b >= 1e12 ? (b / 1e12).toFixed(1) + " TB" : (b / 1e9).toFixed(1) + " GB"; }
    function draw() {
      F.forEach(function (f) { el.querySelector("[data-k='" + f[0] + "']").value = s[f[0]]; });
      el.querySelector("[data-v='w']").textContent = s.w + " M"; el.querySelector("[data-v='kb']").textContent = s.kb + " KB"; el.querySelector("[data-v='ratio']").textContent = s.ratio + ":1"; el.querySelector("[data-v='exp']").textContent = s.exp + "%";
      el.querySelectorAll("[data-w]").forEach(function (b) { b.className = b.getAttribute("data-w") === s.where ? "active" : ""; });
      var n = s.w * 1e6 * 365 * 5 * (1 - s.exp / 100), content = n * s.kb * 1000, meta = n * 300, wps = s.w * 1e6 / 86400, rps = wps * s.ratio;
      var db = s.where === "db" ? content + meta : meta, obj = s.where === "obj" ? content : 0;
      el.querySelector("[data-r='m']").innerHTML = [[Math.round(wps) + "/s", "Avg writes"], [Math.round(rps).toLocaleString() + "/s", "Avg reads"], [(n / 1e9).toFixed(1) + " B", "Pastes kept (5 y)"], [bytes(content), "Paste content"], [bytes(db), "Database size"], [bytes(obj), "Object storage"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var mx = Math.max(db, obj, 1);
      el.querySelector("[data-r='bars']").innerHTML = [["Database", db, "var(--c0)"], ["Object storage", obj, "var(--c2)"]].map(function (b) { return "<div class='bar'><span>" + b[0] + "</span><div class='track'><div class='fill' style='width:" + (b[1] / mx * 100) + "%;background:" + b[2] + "'></div></div><span>" + bytes(b[1]) + "</span></div>"; }).join("") +
        "<p class='caption'>" + (s.where === "db" ? "The database must hold every byte: huge, expensive to replicate and back up, and slower for metadata queries." : "The database stays small (metadata only) while object storage scales cheaply and serves through a CDN.") + "</p>";
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    el.querySelector("[data-r='where']").addEventListener("click", function (e) { var w = e.target.getAttribute("data-w"); if (w) { s.where = w; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P02",
    summary: "Store and share text snippets by short link, with expiry. Like the URL shortener but with real payloads: blobs in object storage, metadata in a database, CDN caching, key generation and expiry cleanup.",
    slides: [
      { t: "1. Requirements", x: "Clarify what a paste is and how long it lives.",
        p: ["Functional: create a paste (text, optional title, syntax, expiry, visibility public/unlisted/private); read by short key; optional delete and raw view", "Non-functional: highly available reads, low latency, durable until expiry", "Limits: e.g. max 10 MB per paste", "Read-heavy, but less extreme than a URL shortener (e.g. 10:1)"],
        m: "flowchart LR\n  U[\"Author\"] -->|\"paste text + expiry\"| P[\"Pastebin\"]:::s0 -->|\"paste.example/x7Gk2Qa\"| U\n  R[\"Readers\"] -->|\"GET /x7Gk2Qa\"| P" },
      { t: "2. Estimates", x: "Example: 5 M pastes/day, 10 KB average, 10 reads per paste, 5 years.",
        table: [["Quantity", "Estimate"], ["Writes", "5 M/day ≈ 58/s (peak ~200/s)"], ["Reads", "≈ 580/s average"], ["New content", "5 M × 10 KB = 50 GB/day"], ["5 years (no expiry)", "≈ 91 TB content"], ["Metadata", "≈ 9 B rows × ~300 B ≈ 2.7 TB"]],
        p: ["Takeaway: content is ~30× bigger than metadata → keep it out of the database"],
        m: "flowchart LR\n  C[\"Content ≈ 91 TB\"]:::s2 --> OBJ[(\"Object storage\")]\n  M[\"Metadata ≈ 2.7 TB\"]:::s0 --> DB[(\"Database\")]" },
      { t: "3. API", x: "Small and REST-style.",
        p: ["POST /v1/pastes {content, title?, syntax?, expires_in?, visibility} → 201 {key, url}", "GET /v1/pastes/{key} → {metadata, content or content_url}", "GET /raw/{key} → text/plain (CDN-cacheable)", "DELETE /v1/pastes/{key} (owner only)", "Rate limit creation per user/IP; size limit check"],
        m: "sequenceDiagram\n  participant C as Client\n  participant A as API\n  participant S as Object storage\n  C->>A: POST /v1/pastes {content}\n  A->>S: PUT pastes/x7Gk2Qa\n  A-->>C: 201 {key: x7Gk2Qa}\n  C->>A: GET /raw/x7Gk2Qa\n  A-->>C: 200 text (via CDN)" },
      { t: "4. Data model", x: "Metadata table + object per paste.",
        table: [["Column", "Note"], ["key (PK)", "7–8 char base62"], ["object_key", "e.g. pastes/x7Gk2Qa"], ["owner_id", "nullable for anonymous"], ["size, syntax, title", ""], ["visibility", "public / unlisted / private"], ["created_at, expires_at", "expires_at indexed for cleanup"]],
        p: ["Small pastes (< a few KB) could be stored inline in the row as an optimization — mention it as a trade-off"],
        m: "flowchart LR\n  ROW[\"pastes row: key, object_key, owner, expires_at\"]:::s0 --> OBJ[\"object: pastes/x7Gk2Qa (bytes)\"]:::s2" },
      { t: "5. High-level architecture", x: "Bytes and metadata take different paths.",
        m: "flowchart LR\n  U[\"Clients\"] --> CDN[\"CDN\"]:::s2 --> LB[\"Load balancer\"]\n  LB --> API[\"Paste service\"]:::s0\n  API --> KG[\"Key generator\"]:::s1\n  API --> DB[(\"Metadata DB\")]\n  API --> OBJ[(\"Object storage\")]:::s2\n  API --> RC[(\"Redis: hot metadata/content\")]\n  CL[\"Cleanup worker\"] --> DB\n  CL --> OBJ",
        p: ["Write: generate key → put object → insert metadata (object first, so metadata never points at nothing)", "Read: CDN → cache → metadata → object", "Cleanup worker deletes expired pastes"] },
      { t: "6. Deep dive: keys", x: "Same choices as P01 (F25).",
        p: ["Pre-generated key service: a background job fills a table/queue of unused random keys; writers take one (no collision checks on the hot path)", "Or counter/range + base62 with a shuffle so keys aren't sequential", "Unlisted pastes rely on keys being hard to guess → random, 8+ chars", "Private pastes require auth regardless of key"],
        m: "flowchart LR\n  GEN[\"Key generator job\"]:::s1 --> POOL[(\"Unused keys pool\")] --> API[\"Paste service takes a key\"]:::s0 --> USED[(\"Used\")]" },
      { t: "7. Deep dive: reads and caching", x: "Most reads hit a small set of popular pastes.",
        p: ["Public pastes are immutable → cache aggressively at the CDN (long TTL until expiry)", "Redis for hot metadata and small contents", "Private pastes: no shared CDN caching (or signed, per-user URLs)", "Large pastes: return a pre-signed object URL (F14) instead of streaming through the API"],
        m: "flowchart LR\n  R[\"Reader\"] --> CDN{\"CDN hit?\"}:::s2\n  CDN -->|\"yes\"| OUT[\"content\"]\n  CDN -->|\"no\"| API[\"Paste service\"]:::s0 --> RC{\"Redis hit?\"}\n  RC -->|\"no\"| DB[(\"metadata\")] --> OBJ[(\"object\")]" },
      { t: "8. Deep dive: expiry", x: "Expired pastes must stop being readable promptly and be deleted eventually.",
        p: ["On read: if now > expires_at → 404/410 (correctness doesn't depend on cleanup)", "Background job: scan expires_at index in batches, delete objects then rows", "Or object-storage lifecycle rules with an expiry tag/prefix per day bucket", "Purge CDN caches, or set CDN TTL ≤ remaining lifetime", "'Burn after reading': delete on first successful read (needs an atomic check)"],
        m: "flowchart LR\n  J[\"Cleanup job (every few min)\"]:::s1 --> Q[\"SELECT … WHERE expires_at < now() LIMIT 1000\"] --> D1[\"delete objects\"]:::s2 --> D2[\"delete rows\"]:::s0" },
      { t: "9. Bottlenecks and trade-offs", x: "What to discuss when pushed.",
        p: ["Storage growth: object storage + lifecycle tiers (F14); compress text (often 3–10×)", "Metadata DB: shard by key once it outgrows one primary", "Abuse: malware/credential dumps → scanning, reporting, takedown, rate limits", "Consistency: new paste readable immediately → write object before metadata; read-your-writes from primary", "Hot paste: CDN absorbs it"],
        m: "flowchart LR\n  G[\"Growth\"] --> C[\"compress + tiering\"]:::s2\n  A[\"Abuse\"] --> SC[\"scan + rate limit\"]:::s1\n  H[\"Hot paste\"] --> CDN[\"CDN\"]:::s0" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Content in object storage, metadata in a (sharded) DB, CDN + Redis in front", "Random keys from a pre-generated pool (unlisted = unguessable)", "Expiry enforced on read; cleanup job or lifecycle rules delete later", "Compress, rate-limit and scan for abuse"],
        m: "flowchart LR\n  W[\"Write: key → object → metadata\"]:::s0 --> R[\"Read: CDN → Redis → DB → object\"]:::s2 --> E[\"Expire: check on read + cleanup\"]:::s1" }
    ],
    widget: { heading: "Pastebin storage estimator", caption: "See why paste content belongs in object storage: compare database size with content stored inline vs in object storage.", render: widget },
    examples: [
      ["Pastebin.com", "Launched in 2002; popular for sharing code and logs, and also a known place for leaked data — hence moderation and scanning."],
      ["GitHub Gist", "Each gist is backed by a git repository, adding versioning and forking on top of the paste idea."],
      ["PrivateBin", "Open-source pastebin that encrypts content in the browser so the server never sees plaintext (zero-knowledge)."],
      ["Object storage lifecycle", "S3, GCS and Azure Blob all support lifecycle rules to delete or tier objects automatically by age."]
    ],
    pitfalls: [
      "Storing all paste content in the relational database",
      "Relying only on the cleanup job for expiry (expired pastes readable until it runs)",
      "Sequential, guessable keys for 'unlisted' pastes",
      "CDN caching private pastes",
      "Writing metadata before the object exists",
      "No size limits or rate limits"
    ],
    quiz: [
      ["Where should paste content go at scale?", ["In the metadata DB", "Object storage, with metadata in a DB", "Only in Redis", "In the CDN only"], 1, "Content dominates storage; object storage is cheap and durable."],
      ["How do you guarantee an expired paste isn't served?", ["Wait for the nightly job", "Check expires_at on every read", "Rely on the CDN", "Users must delete them"], 1, "Cleanup is for space; correctness comes from the read check."],
      ["Why random rather than sequential keys for unlisted pastes?", ["Shorter", "Hard to guess, so people can't enumerate them", "Faster DB inserts", "Required by base62"], 1, "Unlisted relies on secrecy of the link."],
      ["Which order is safest on create?", ["Metadata first, then object", "Object first, then metadata", "Either", "Only metadata"], 1, "Metadata never points at a missing object."],
      ["5 M pastes/day is about how many writes per second?", ["~6", "~58", "~580", "~5,800"], 1, "5,000,000 ÷ 86,400 ≈ 58."],
      ["Public pastes are immutable. What does that enable?", ["No database", "Long-lived CDN caching", "No backups", "No keys"], 1, "Immutable content is ideal for caching."],
      ["Big win for storage cost on text?", ["Encryption", "Compression", "Replication", "Indexing"], 1, "Text compresses well."],
      ["What's a pre-generated key pool?", ["A table/queue of unused keys filled in the background", "A cache of popular pastes", "A list of banned users", "DNS records"], 0, "Removes collision checks from the write path."]
    ],
    practice: {
      q: "Add 'burn after reading' (the paste is deleted after its first view) and end-to-end encrypted pastes to the design. What changes?",
      a: [
        ["Burn after reading", "Atomic claim on read: UPDATE pastes SET burned = true WHERE key = ? AND burned = false; only the request that updates 1 row gets the content; then delete the object."],
        ["Caching", "Never cache burn-after-reading pastes at the CDN or Redis (Cache-Control: no-store)."],
        ["Link previews", "Messaging apps fetch links for previews and could 'burn' them — require a click-through/confirm page or a POST to reveal."],
        ["E2E encryption", "Browser generates a key, encrypts content (AES-GCM), uploads ciphertext; the key goes in the URL fragment (#key), which browsers don't send to the server."],
        ["Server impact", "Server can't scan or search content; abuse handling relies on reports and metadata; size limits still apply."],
        ["Trade-offs", "Lost link fragment = unrecoverable paste; no server-side syntax highlighting or previews."]
      ]
    },
    recap: [
      "Requirements: create/read by key, expiry, visibility; read-heavy.",
      "Content ≫ metadata → object storage + small DB rows.",
      "Random keys from a pool; unlisted means unguessable.",
      "CDN + Redis for immutable public pastes; never cache private ones.",
      "Expiry checked on read; cleanup job or lifecycle rules reclaim space."
    ]
  });
})();
