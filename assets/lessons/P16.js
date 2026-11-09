/* Lesson P16: Google Drive / Dropbox */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.size) { s.size = 200; s.chunk = 4; s.edit = "insert"; s.pos = 30; s.cdc = false; }
    el.innerHTML = "<div class='grid3'><label class='field'>File size: <strong data-v='size' style='color:var(--text)'></strong><input type='range' min='10' max='2000' step='10' data-k='size'></label>" +
      "<label class='field'>Chunk size: <strong data-v='chunk' style='color:var(--text)'></strong><input type='range' min='1' max='16' data-k='chunk'></label>" +
      "<label class='field'>Edit position: <strong data-v='pos' style='color:var(--text)'></strong><input type='range' min='0' max='100' data-k='pos'></label></div>" +
      "<div class='seg' data-r='edit'><button data-e='modify'>Overwrite a few bytes</button><button data-e='insert'>Insert 1 KB</button><button data-e='append'>Append 1 MB</button></div>" +
      "<label class='toggle'><input type='checkbox' data-r='cdc'> Content-defined chunking (boundaries from a rolling hash)</label>" +
      "<div data-r='strip' style='display:flex;flex-wrap:wrap;gap:2px;margin:10px 0'></div><div class='metrics' data-r='m'></div>" +
      "<p class='caption'>Fixed-size chunks: inserting bytes shifts every later boundary, so every later chunk hash changes. Content-defined chunking picks boundaries from the content itself, so they realign right after the edit. Idealised model: CDC re-uploads about 2 chunks around an edit.</p>";
    function draw() {
      ["size", "chunk", "pos"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      el.querySelector("[data-v='size']").textContent = s.size + " MB"; el.querySelector("[data-v='chunk']").textContent = s.chunk + " MB"; el.querySelector("[data-v='pos']").textContent = s.pos + "%";
      el.querySelectorAll("[data-e]").forEach(function (b) { b.className = b.getAttribute("data-e") === s.edit ? "active" : ""; }); el.querySelector("[data-r='cdc']").checked = s.cdc;
      var n = Math.ceil(s.size / s.chunk), at = Math.min(n - 1, Math.floor(n * s.pos / 100)), changed = [];
      for (var i = 0; i < n; i++) {
        var c = false;
        if (s.edit === "modify") c = i === at;
        else if (s.edit === "insert") c = s.cdc ? (i === at || i === at + 1) : i >= at;
        else c = i === n - 1;
        changed.push(c);
      }
      var extra = s.edit === "append" ? Math.ceil(1 / s.chunk) : 0, up = changed.filter(Boolean).length + extra;
      var show = Math.min(n, 250);
      el.querySelector("[data-r='strip']").innerHTML = changed.slice(0, show).map(function (c) { return "<span style='width:10px;height:18px;border-radius:2px;background:" + (c ? "var(--danger)" : "var(--c0)") + ";opacity:" + (c ? 1 : 0.5) + "'></span>"; }).join("") + (extra ? "<span style='width:10px;height:18px;border-radius:2px;background:var(--c1)'></span>" : "") + (n > show ? "<span class='caption'> … " + (n - show) + " more</span>" : "");
      var mb = Math.min(s.size + (s.edit === "append" ? 1 : 0), up * s.chunk);
      el.querySelector("[data-r='m']").innerHTML = [[n, "Chunks in file"], [up, "Chunks to upload"], [mb.toFixed(0) + " MB", "Bytes uploaded (approx.)"], [(100 - mb / s.size * 100).toFixed(0) + "%", "Saved vs full re-upload"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    el.querySelector("[data-r='edit']").addEventListener("click", function (e) { var v = e.target.getAttribute("data-e"); if (v) { s.edit = v; ctx.save(); draw(); } });
    el.querySelector("[data-r='cdc']").addEventListener("change", function (e) { s.cdc = e.target.checked; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "P16",
    summary: "File storage and sync across devices: requirements, estimates, chunking and content-hash deduplication, delta sync, a strongly consistent metadata service, change notifications, conflict handling, sharing and versioning.",
    slides: [
      { t: "1. Requirements", x: "Sync is the hard part, not storage.",
        p: ["Functional: upload/download files; automatic sync across a user's devices; share files/folders with permissions; version history and restore; offline edits", "Non-functional: never lose or corrupt data (durability, correctness first); efficient bandwidth (large files, slow networks); changes appear on other devices within seconds; highly available; scale to billions of files", "Ask: max file size (e.g. 50 GB), real-time collaborative editing (out of scope — that's Docs)"],
        m: "flowchart LR\n  L[\"Laptop edits report.pdf\"] --> SVC[\"Sync service\"]:::s0 --> P[\"Phone\"]:::s2\n  SVC --> T[\"Tablet\"]:::s2" },
      { t: "2. Estimates", x: "Example: 100 M DAU, 500 M total users.",
        table: [["Quantity", "Estimate"], ["Storage", "500 M users × ~10 GB avg used ≈ 5 EB logical (dedupe reduces physical)"], ["File changes", "100 M × 10 edits/day = 1 B/day ≈ 12k/s"], ["Metadata", "~100 B files × ~1 KB ≈ 100 TB"], ["Notifications", "~1 B change events/day fanned out to each user's devices"]],
        m: "flowchart LR\n  B[\"Blocks: exabytes\"]:::s2 --> OBJ[(\"block storage\")]\n  M[\"Metadata: ~100 TB\"]:::s0 --> DB[(\"sharded SQL\")]" },
      { t: "3. API", x: "Block-level APIs make sync efficient.",
        p: ["POST /v1/blocks/check {hashes[]} → which hashes the server lacks", "PUT /v1/blocks/{hash} (direct to block storage via pre-signed URL)", "POST /v1/files/commit {path or file_id, parent_version, block_hashes[]} → {new_version} or 409 conflict", "GET /v1/changes?cursor=… (long poll) → list of changes since cursor", "GET /v1/files/{id}/blocks → hashes; download missing blocks", "POST /v1/shares {file_id, user, role}"],
        m: "sequenceDiagram\n  participant C as Client\n  participant M as Metadata\n  participant B as Block store\n  C->>M: check [h1,h2,h3]\n  M-->>C: missing [h3]\n  C->>B: PUT h3\n  C->>M: commit file v8 = [h1,h2,h3], parent v7\n  M-->>C: ok v8" },
      { t: "4. Data model", x: "Files are lists of content-addressed blocks.",
        table: [["Table", "Columns"], ["files", "file_id, namespace_id, path/parent, name, current_version, deleted"], ["file_versions", "file_id, version, block_hashes[], size, modified_by, ts"], ["blocks", "hash (SHA-256) → storage location, refcount"], ["namespaces / shares", "user or shared folder → members + roles"], ["journal", "namespace_id, seq, change — drives sync cursors"]],
        m: "flowchart LR\n  F[\"file v8\"]:::s0 --> L[\"[h1, h2, h3]\"]:::s1\n  L --> B1[(\"block h1\")]:::s2\n  L --> B2[(\"block h2\")]:::s2\n  L --> B3[(\"block h3\")]:::s2" },
      { t: "5. High-level architecture", x: "Separate block (bytes) and metadata (truth) paths.",
        m: "flowchart LR\n  CL[\"Desktop / mobile client: watcher, chunker, local DB\"]:::s1 --> API[\"API / sync service\"]:::s0\n  API --> MD[(\"Metadata DB (strongly consistent, sharded by namespace)\")]:::s0\n  CL -->|\"pre-signed PUT/GET\"| BS[(\"Block storage (object store)\")]:::s2\n  MD --> J[(\"Journal / change log\")]\n  J --> NT[\"Notification service\"]:::s1 -->|\"long poll / WebSocket\"| CL2[\"Other devices\"]\n  BS --> CDN[\"CDN for shared downloads\"]" },
      { t: "6. Deep dive: chunking, dedupe and delta sync", x: "Only send what changed, and never store the same bytes twice.",
        p: ["Split files into blocks (Dropbox historically used 4 MB blocks); hash each with SHA-256", "Ask the server which hashes are missing; upload only those (dedupe across versions, and possibly users)", "Content-defined chunking (rolling hash, as in rsync/LBFS) keeps boundaries stable when bytes are inserted", "Compress blocks; resumable per-block uploads", "Cross-user dedupe saves space but can leak 'this file exists' — many services limit it"],
        m: "flowchart LR\n  FILE[\"edited file\"] --> CH[\"chunk + hash\"]:::s1 --> CK{\"server has hash?\"}\n  CK -->|\"yes\"| SKIP[\"skip\"]:::s2\n  CK -->|\"no\"| UP[\"upload block\"]:::s0" },
      { t: "7. Deep dive: metadata consistency", x: "Metadata must be exactly right — it defines what a file is.",
        p: ["Strongly consistent, transactional store (sharded SQL/NewSQL) partitioned by namespace (user or shared folder)", "Commit is a compare-and-set on the parent version (optimistic concurrency, F27)", "Append a journal entry per change with a monotonically increasing seq per namespace", "Blocks are written before metadata commit; garbage-collect unreferenced blocks later", "Dropbox moved metadata to its own systems (e.g. Edgestore) and block storage to Magic Pocket"],
        m: "flowchart LR\n  C[\"commit v8 (parent v7)\"] --> T{\"current == v7?\"}:::s1\n  T -->|\"yes\"| OK[\"write v8 + journal seq 551\"]:::s0\n  T -->|\"no\"| CF[\"409 conflict\"]:::bad" },
      { t: "8. Deep dive: notifications and conflicts", x: "Other devices must learn about changes quickly and safely.",
        p: ["Devices hold a long poll or WebSocket to the notification service: 'namespace X changed'", "Then they call /changes?cursor=… to fetch journal entries since their cursor and download missing blocks", "Conflict: two devices edit the same version offline → first commit wins; the second gets 409 and saves a 'conflicted copy' (no silent data loss)", "Version history: keep old versions (block lists) for N days; deleted files go to trash"],
        m: "sequenceDiagram\n  participant L as Laptop\n  participant S as Sync service\n  participant P as Phone\n  L->>S: commit v8 (parent v7)\n  S-->>L: ok\n  P->>S: commit v8' (parent v7)\n  S-->>P: 409 conflict\n  Note over P: save 'report (conflicted copy).pdf'\n  S-->>P: notify: namespace changed\n  P->>S: GET /changes?cursor=550" },
      { t: "9. Bottlenecks and trade-offs", x: "Discussion points.",
        p: ["Huge shared folders → many devices notified per change: batch and coalesce notifications", "Hot namespaces (company-wide folder) → shard metadata carefully, cache listings", "Block storage cost → dedupe, compression, erasure coding, cold tiers for old versions", "Consistency: strong for metadata, blocks immutable (content-addressed) so caching is trivial", "Client complexity: file watchers, local state DB, retries — most bugs live here"],
        m: "flowchart LR\n  MD[\"Metadata: strong, small\"]:::s0\n  BL[\"Blocks: immutable, huge, cacheable\"]:::s2" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Files = versioned lists of SHA-256 content-addressed blocks", "Upload only missing blocks (delta sync, dedupe); content-defined chunking for inserts", "Strongly consistent metadata with CAS commits and a per-namespace journal", "Notifications + cursor-based change fetches keep devices in sync", "Conflicts become conflicted copies; versions and trash for recovery"],
        m: "flowchart LR\n  CH[\"Chunk + hash\"]:::s1 --> UP[\"Upload missing\"]:::s2 --> CM[\"Commit (CAS)\"]:::s0 --> NT[\"Notify + sync\"]" }
    ],
    widget: { heading: "Delta sync and chunking", caption: "Edit a big file and see which chunks must be re-uploaded with fixed-size vs content-defined chunking.", render: widget },
    examples: [
      ["Dropbox Magic Pocket", "Dropbox moved most user file blocks from Amazon S3 to its own exabyte-scale storage system, described in 2016."],
      ["Dropbox block sync", "Dropbox described splitting files into 4 MB blocks identified by SHA-256 hashes, uploading only blocks the server doesn't have."],
      ["rsync", "Uses a rolling checksum to find matching blocks between versions and send only differences (Tridgell & Mackerras, 1996)."],
      ["Conflicted copies", "Dropbox and Google Drive keep both versions when concurrent edits collide, rather than silently overwriting."]
    ],
    pitfalls: [
      "Re-uploading whole files on every change",
      "Fixed-size chunks without considering insertions",
      "Eventually consistent metadata for file trees",
      "Last-write-wins that silently discards a device's edits",
      "Committing metadata before blocks are stored",
      "Polling the server constantly instead of notifications + cursors"
    ],
    quiz: [
      ["Why split files into hashed blocks?", ["Encryption", "Upload only changed blocks and deduplicate identical ones", "Faster DNS", "Smaller metadata"], 1, "Content addressing enables delta sync and dedupe."],
      ["Inserting 1 KB at the start of a file with fixed-size chunks…", ["Changes one chunk", "Shifts boundaries so almost every chunk changes", "Changes nothing", "Deletes the file"], 1, "Content-defined chunking avoids this."],
      ["Metadata should be…", ["Eventually consistent", "Strongly consistent and transactional", "Stored only on clients", "Cached forever"], 1, "It defines what each file is."],
      ["Two offline devices edit the same version. Good outcome?", ["Last write wins silently", "First commit wins; the other becomes a conflicted copy", "Both rejected", "Merge bytes randomly"], 1, "No silent data loss."],
      ["How do devices learn about changes?", ["Polling every second", "Notification (long poll/WebSocket) then fetch changes since a cursor", "Email", "Never"], 1, "Cheap and fast."],
      ["Why can blocks be cached and replicated easily?", ["They're small", "They're immutable and named by content hash", "They're encrypted", "They're text"], 1, "Same hash = same bytes forever."],
      ["Order on upload?", ["Commit metadata, then blocks", "Upload blocks, then commit metadata", "Either", "Only metadata"], 1, "Metadata never references missing blocks."],
      ["Privacy risk of cross-user dedupe?", ["None", "Reveals whether a file already exists on the service", "Leaks passwords", "Corrupts files"], 1, "Many services restrict it."]
    ],
    practice: {
      q: "Add sharing: a user shares a 200 GB project folder with 500 colleagues who all sync it on 2 devices each. What changes in the design?",
      a: [
        ["Namespaces", "The shared folder becomes its own namespace with a member list and roles; each member's tree mounts it."],
        ["Permissions", "Authorization checks on every metadata and block request (signed block URLs only for namespaces you can read)."],
        ["Storage", "Blocks stored once; members reference the same block hashes — no copies."],
        ["Notifications", "One change → 1,000 devices: publish 'namespace changed' to a channel per namespace, coalesce bursts; devices fetch changes via cursors."],
        ["Initial sync", "Download from CDN/edge caches; prioritise recently used files; selective sync to skip folders."],
        ["Hot spot", "Metadata shard for this namespace is hot: cache listings, rate-limit, possibly split very large namespaces."],
        ["Trade-offs", "Fan-out cost and cache invalidation grow with members; revoking access requires stopping future sync but can't recall already-downloaded copies."]
      ]
    },
    recap: [
      "Files are versioned lists of content-addressed blocks.",
      "Delta sync uploads only missing blocks; CDC keeps boundaries stable on inserts.",
      "Metadata is strongly consistent: CAS commits + per-namespace journal.",
      "Notifications plus cursor-based change fetches sync devices.",
      "Conflicts become conflicted copies; keep versions and trash."
    ]
  });
})();
