/* Lesson F14: Storage: block, file, object (blob) */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.size) { s.size = 2000; s.part = 64; s.par = 4; s.bw = 100; s.fail = true; }
    el.innerHTML = "<div class='grid2'><label class='field'>File size: <strong data-v='size' style='color:var(--text)'></strong><input type='range' min='10' max='20000' step='10' data-k='size'></label>" +
      "<label class='field'>Part size: <strong data-v='part' style='color:var(--text)'></strong><input type='range' min='5' max='512' data-k='part'></label>" +
      "<label class='field'>Parallel uploads: <strong data-v='par' style='color:var(--text)'></strong><input type='range' min='1' max='16' data-k='par'></label>" +
      "<label class='field'>Upload bandwidth: <strong data-v='bw' style='color:var(--text)'></strong><input type='range' min='5' max='1000' step='5' data-k='bw'></label></div>" +
      "<label class='toggle'><input type='checkbox' data-r='fail'> Network drops once at 70%</label><div class='metrics' data-r='out'></div><div data-r='parts' style='display:flex;flex-wrap:wrap;gap:3px'></div><p class='caption' data-r='note'></p>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      ["size", "part", "par", "bw"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      el.querySelector("[data-v='size']").textContent = s.size >= 1000 ? (s.size / 1000).toFixed(1) + " GB" : s.size + " MB";
      el.querySelector("[data-v='part']").textContent = s.part + " MB"; el.querySelector("[data-v='par']").textContent = s.par; el.querySelector("[data-v='bw']").textContent = s.bw + " Mbit/s";
      q("fail").checked = s.fail;
      var parts = Math.ceil(s.size / s.part), mbps = s.bw / 8;
      var t = s.size / mbps;
      var lostSingle = s.fail ? 0.7 * s.size / mbps : 0;
      var lostMulti = s.fail ? Math.min(s.par, parts) * s.part / mbps : 0;
      function fmt(x) { return x >= 3600 ? (x / 3600).toFixed(1) + " h" : x >= 60 ? (x / 60).toFixed(1) + " min" : x.toFixed(0) + " s"; }
      q("out").innerHTML = [[String(parts), "Parts"], [fmt(t + lostSingle), "Single PUT, restart on failure"], [fmt(t + Math.min(lostMulti, t)), "Multipart, retry only failed parts"], [parts > 10000 ? "Too many" : "OK", "S3 allows up to 10,000 parts"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var show = Math.min(parts, 200), failAt = Math.floor(show * 0.7);
      q("parts").innerHTML = Array.from({ length: show }).map(function (_, i) { var c = s.fail && i >= failAt && i < failAt + Math.min(s.par, show) ? "var(--c1)" : "var(--c0)"; return "<span title='part " + (i + 1) + "' style='width:12px;height:12px;border-radius:3px;background:" + c + ";opacity:.85'></span>"; }).join("");
      q("note").textContent = "Simplified: bandwidth is the bottleneck, so parallelism mainly helps when one connection can't fill the link. Yellow = parts in flight when the network dropped, the only ones re-sent." + (parts > 200 ? " Showing first 200 parts." : "") + " S3 parts must be at least 5 MiB (except the last).";
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    q("fail").addEventListener("change", function (e) { s.fail = e.target.checked; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F14",
    summary: "Where bytes live: block, file and object storage, why media belongs in object storage with metadata in a database, pre-signed URLs, multipart uploads, durability, storage classes and lifecycle rules.",
    slides: [
      { t: "Three kinds of storage", x: "Storage is offered at three levels of abstraction. Each fits different workloads.",
        table: [["Type", "Unit", "Access", "Examples", "Good for"], ["Block", "Fixed-size blocks on a volume", "Mounted by one machine as a disk", "AWS EBS, local SSD, SAN", "Databases, OS disks"], ["File", "Files in folders", "Shared over the network (NFS, SMB)", "AWS EFS, NetApp, NAS", "Shared files for many servers, legacy apps"], ["Object", "Objects with a key and metadata", "HTTP API (PUT/GET/DELETE)", "Amazon S3, Google Cloud Storage, Azure Blob", "Media, backups, logs, data lakes"]],
        m: "flowchart LR\n  B[\"Block: raw disk<br/>one server\"]:::s0\n  F[\"File: folders<br/>shared mount\"]:::s1\n  O[\"Object: key → bytes + metadata<br/>HTTP API\"]:::s2" },
      { t: "Block storage", x: "A volume looks like a raw disk to one machine; the OS puts a filesystem on it, or a database manages it directly.",
        p: ["Lowest latency, supports random reads and in-place writes", "Usually attached to one instance at a time", "Durability via replication inside the storage system and snapshots", "Databases (PostgreSQL, MySQL) run on block storage"],
        m: "flowchart LR\n  VM[\"DB server\"] -->|\"attached volume\"| EBS[\"Block volume\"]:::s0 --> SN[\"Snapshots to object storage\"]:::s2" },
      { t: "File storage", x: "A hierarchical filesystem shared over the network, so many servers can read and write the same files.",
        p: ["Familiar paths and permissions; POSIX-like semantics", "Good for shared content, home directories, lift-and-shift apps", "Scaling and locking across many clients is harder", "In new cloud designs, usually replaced by object storage for user content"],
        m: "flowchart LR\n  A[\"App server 1\"] --> NFS[\"/shared (NFS)\"]:::s1\n  B[\"App server 2\"] --> NFS\n  C[\"App server 3\"] --> NFS" },
      { t: "Object storage", x: "A flat namespace of buckets and keys. Each object is bytes plus metadata, read and written whole via HTTP.",
        p: ["Practically unlimited capacity; you pay for what you store", "Very high durability: S3 is designed for 99.999999999% (11 nines) durability", "Objects are immutable in practice: overwrite or replace, not edit in place", "Keys look like paths (photos/2026/11/a.jpg) but there are no real folders", "Higher latency than block storage; not a database"],
        m: "flowchart LR\n  C[\"Client / service\"] -->|\"PUT photos/u42/a.jpg\"| S[\"Bucket\"]:::s2\n  C -->|\"GET photos/u42/a.jpg\"| S\n  S --> M[\"Object = bytes + metadata (type, size, ETag)\"]" },
      { t: "Pattern: bytes in object storage, metadata in a database", x: "The standard design for photos, videos and documents.",
        p: ["Database row: id, owner, object key, size, content type, created_at", "Object storage holds the actual bytes", "CDN in front of the bucket for downloads", "Keeps the database small and fast; media scales independently"],
        m: "flowchart LR\n  APP[\"App\"] -->|\"metadata\"| DB[\"Database<br/>id, owner, key, size\"]:::s0\n  APP -->|\"bytes\"| OBJ[\"Object storage\"]:::s2\n  U[\"Users\"] --> CDN[\"CDN\"]:::s1 --> OBJ" },
      { t: "Pre-signed URLs", x: "Instead of streaming uploads through your app servers, the server hands the client a short-lived signed URL to upload or download directly.",
        p: ["App checks permissions, then signs a URL valid for e.g. 15 minutes", "Client PUTs the file straight to object storage", "Saves app-server bandwidth and CPU", "Then the client (or a storage event) tells the app the upload finished"],
        m: "sequenceDiagram\n  participant C as Client\n  participant A as App server\n  participant S as Object storage\n  C->>A: I want to upload photo.jpg\n  A-->>C: pre-signed PUT URL (expires in 15 min)\n  C->>S: PUT photo.jpg (direct)\n  S-->>C: 200 OK\n  S-)A: event: object created\n  A->>A: save metadata, start processing" },
      { t: "Multipart and resumable uploads", x: "Large files are split into parts uploaded independently, then combined.",
        p: ["Upload parts in parallel for speed", "Retry only failed parts after a network error", "S3 multipart: up to 10,000 parts, each at least 5 MiB except the last", "Clean up abandoned multipart uploads with lifecycle rules", "Similar idea: resumable upload protocols such as tus and Google's resumable uploads"],
        m: "flowchart LR\n  F[\"10 GB video\"] --> P1[\"Part 1\"]\n  F --> P2[\"Part 2\"]\n  F --> P3[\"Part …\"]\n  F --> P4[\"Part N\"]\n  P1 --> CM[\"Complete multipart upload\"]:::s2\n  P2 --> CM\n  P3 --> CM\n  P4 --> CM" },
      { t: "Durability vs availability", x: "Durability is the chance data isn't lost; availability is the chance you can reach it right now. Object stores advertise both separately.",
        p: ["Durability comes from multiple copies or erasure coding across devices and facilities", "Erasure coding (e.g. Reed–Solomon) splits data into k data + m parity chunks; any k rebuild it, with less overhead than 3 full copies", "S3 Standard: designed for 11 nines durability and 99.99% availability", "Cross-region replication protects against a region-wide disaster"],
        m: "flowchart LR\n  O[\"Object\"] --> EC[\"Erasure code: 6 data + 3 parity chunks\"]:::s0\n  EC --> D1[\"Disk / facility 1\"]\n  EC --> D2[\"Disk / facility 2\"]\n  EC --> D3[\"Disk / facility 3\"]\n  EC -. \"any 6 of 9 rebuild the object\" .-> R[\"Survives losses\"]:::s2" },
      { t: "Storage classes and lifecycle", x: "Data gets colder over time. Cheaper tiers trade retrieval speed or cost for lower storage price.",
        table: [["Tier", "Access pattern", "Example (AWS)"], ["Hot", "Frequent", "S3 Standard"], ["Infrequent", "Monthly-ish, still instant", "S3 Standard-IA"], ["Archive", "Rare; minutes to hours to retrieve", "S3 Glacier classes"], ["Automatic", "Unknown patterns", "S3 Intelligent-Tiering"]],
        p: ["Lifecycle rules move or delete objects by age, e.g. logs to archive after 30 days, delete after 1 year", "Versioning keeps old versions to recover from mistakes"],
        m: "flowchart LR\n  H[\"Hot (days)\"]:::s0 -->|\"30 days\"| W[\"Infrequent access\"]:::s1 -->|\"90 days\"| A[\"Archive\"]:::s2 -->|\"1 year\"| D[\"Delete\"]" },
      { t: "Storage in interviews", x: "Whenever users upload files, say where the bytes go and how they move.",
        p: ["'Media in object storage, metadata in PostgreSQL, served through a CDN.'", "'Clients upload directly with pre-signed URLs; multipart for files over ~100 MB.'", "'Upload event triggers a queue job for thumbnails/transcoding.'", "'Lifecycle rules move old content to cheaper tiers.'", "Never store large blobs in the main database"],
        m: "flowchart LR\n  C[\"Client\"] -->|\"pre-signed URL\"| O[\"Object storage\"]:::s2\n  O -->|\"event\"| Q[\"Queue\"] --> W[\"Workers: thumbnails\"]\n  W --> DB[\"Metadata DB\"]:::s0\n  U[\"Viewers\"] --> CDN[\"CDN\"]:::s1 --> O" }
    ],
    widget: { heading: "Multipart upload simulator", caption: "See why big files are uploaded in parts: parallelism and cheap retries. Simplified network model.", render: widget },
    examples: [
      ["Amazon S3", "Launched in 2006; designed for 11 nines of durability. Since December 2020 it offers strong read-after-write consistency."],
      ["Dropbox Magic Pocket", "Dropbox moved most file storage from S3 to its own exabyte-scale block storage system, Magic Pocket, described on its tech blog (2016)."],
      ["Facebook f4 and Haystack", "Haystack (OSDI 2010) optimised photo storage by packing many photos into large files; f4 (OSDI 2014) stored 'warm' data with erasure coding to cut replication cost."],
      ["Backblaze", "Backblaze publishes its use of Reed–Solomon erasure coding across 20 drives (17 data + 3 parity) in its storage 'vaults'."]
    ],
    pitfalls: [
      "Storing images or videos as BLOBs in the main relational database",
      "Proxying all uploads through app servers instead of pre-signed URLs",
      "Confusing durability with availability",
      "Treating object storage like a filesystem with in-place edits or a database with queries",
      "Forgetting a CDN in front of object storage for public media",
      "No lifecycle rules: storage costs grow forever"
    ],
    quiz: [
      ["Which storage type is best for a relational database's data files?", ["Object storage", "Block storage", "A CDN", "Archive storage"], 1, "Databases need low-latency random reads and in-place writes on a mounted volume."],
      ["What is the standard way to store user-uploaded photos?", ["As BLOB columns in the database", "Bytes in object storage, metadata in a database", "On the app server's local disk", "In the cache"], 1, "This keeps the database lean and lets media scale and be served by a CDN."],
      ["What does a pre-signed URL allow?", ["Bypassing authentication forever", "A client to upload or download one object directly, for a limited time", "Editing objects in place", "Running queries on a bucket"], 1, "The server signs permission for a specific object and expiry; the bytes skip the app servers."],
      ["Main benefit of multipart upload for large files?", ["Smaller storage bills", "Parallel parts and retrying only failed parts", "Automatic compression", "Strong consistency"], 1, "A dropped connection costs one part, not the whole file."],
      ["What is erasure coding?", ["Deleting data securely", "Splitting data into data + parity chunks so a subset can rebuild it", "Encrypting objects", "Caching objects at the edge"], 1, "It gives high durability with less overhead than full replicas."],
      ["S3 Standard advertises 11 nines durability and 99.99% availability. What does that mean?", ["Data can't be lost or unreachable", "Losing data is extraordinarily unlikely, but short periods of unavailability are possible", "It's the same number expressed differently", "It refers to read latency"], 1, "Durability and availability are separate guarantees."],
      ["What do lifecycle rules do?", ["Move or delete objects automatically based on age or other criteria", "Encrypt objects", "Replicate databases", "Resize images"], 0, "They cut cost by tiering cold data and expiring what you no longer need."]
    ],
    practice: {
      q: "Design file storage for a document-sharing app: users upload PDFs and videos up to 5 GB, share them with others, and old files are rarely opened after 90 days. Cover upload, download, durability and cost.",
      a: [
        ["Metadata", "PostgreSQL table files(id, owner_id, object_key, size, type, status, created_at) plus a shares table for permissions."],
        ["Upload", "App validates and creates a 'pending' row, returns pre-signed multipart URLs; client uploads parts in parallel directly to object storage, then calls complete."],
        ["Post-processing", "Object-created event → queue → workers scan for malware, generate previews/thumbnails, mark the row 'ready'."],
        ["Download", "Permission check in the app, then a short-lived pre-signed GET URL (or signed CDN URL) so bytes come from storage/CDN, not app servers."],
        ["Durability", "Object storage with versioning; cross-region replication for disaster recovery; database backups and point-in-time recovery."],
        ["Cost", "Lifecycle: move to infrequent-access tier after 90 days, archive after a year if product allows slow retrieval; abort incomplete multipart uploads after 7 days."],
        ["Trade-offs", "Pre-signed URLs can be shared while valid, so keep expiry short; archive tiers make old files slow to open."]
      ]
    },
    recap: [
      "Block = raw disk for one server; file = shared folders; object = key → bytes over HTTP.",
      "Put media in object storage, metadata in a database, a CDN in front.",
      "Pre-signed URLs let clients upload and download directly.",
      "Multipart uploads parallelise big files and retry only failed parts.",
      "Durability ≠ availability; lifecycle rules tier cold data to cut cost."
    ]
  });
})();
