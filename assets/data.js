/* Shared content for the HLD Study Roadmap and the HLD Teaching App. */
(function () {
  "use strict";
  var PHASES = ["Foundations", "Building blocks", "Data layer", "Communication", "Architecture & ops", "Distributed systems"];
  var LEVELS = ["Easy", "Medium", "Hard"];

  function F(id, group, name, why, concepts) { return { id: id, name: name, kind: "fund", group: group, why: why, concepts: concepts }; }
  function P(id, group, name, why, concepts, deps) { return { id: id, name: name, kind: "prob", group: group, why: why, concepts: concepts, deps: deps }; }

  var TOPICS = [
    F("scale", "Foundations", "Scalability: vertical vs horizontal", "Every design answer starts with how the system grows past one machine.", [
      "Vertical scaling: a bigger machine; simple, but has a hard ceiling and stays a single point of failure",
      "Horizontal scaling: more machines behind a load balancer; needs stateless services",
      "Push state out of the app tier into databases, caches and object storage",
      "Autoscaling and elasticity"]),
    F("perf", "Foundations", "Latency, throughput & availability", "These are the units your non-functional requirements are written in.", [
      "Latency: time to serve one request; throughput: requests served per unit of time",
      "Use percentiles (p50, p95, p99), not averages, for latency",
      "Availability in nines: 99.9% allows about 8.76 hours of downtime a year, 99.99% about 52.6 minutes",
      "SLI (what you measure), SLO (your target), SLA (the contractual promise)"]),
    F("est", "Foundations", "Back-of-the-envelope estimation", "Turns vague scale into concrete QPS, storage and bandwidth that drive design choices.", [
      "1 day = 86,400 s, so 1 million requests/day is about 12 requests/s on average",
      "Peak QPS = average QPS × an assumed peak factor; state the assumption",
      "Storage = new items/day × item size × retention period",
      "Read:write ratio decides whether to optimise for reads (cache, replicas) or writes",
      "Powers of two: 2^10 ≈ thousand (KB), 2^20 ≈ million (MB), 2^30 ≈ billion (GB), 2^40 ≈ trillion (TB)"]),
    F("cap", "Foundations", "CAP theorem & PACELC", "Frames the core trade-off when replicated data meets a network partition.", [
      "CAP: during a network partition, a system must give up either consistency or availability",
      "Partitions happen in real networks, so the practical choice is CP or AP",
      "PACELC: if Partition, choose A or C; Else, choose Latency or Consistency",
      "Commonly cited examples: ZooKeeper and etcd lean CP; Cassandra leans AP with tunable consistency"]),
    F("consistency", "Foundations", "Consistency models", "Tells you what a reader is guaranteed to see after a write.", [
      "Strong (linearizable): every read sees the latest completed write",
      "Causal consistency: causally related operations are seen in order",
      "Session guarantees: read-your-writes, monotonic reads",
      "Eventual consistency: replicas converge if writes stop",
      "Quorums: with N replicas, R + W > N makes read and write sets overlap"]),
    F("lb", "Building blocks", "Load balancing", "The entry point that makes horizontal scaling and failover work.", [
      "L4 (transport-level) vs L7 (HTTP-aware, can route by path or header)",
      "Algorithms: round robin, weighted, least connections, IP hash or consistent hash",
      "Health checks remove unhealthy instances automatically",
      "Sticky sessions vs stateless servers (prefer stateless)",
      "Global load balancing across regions with GeoDNS or anycast"]),
    F("cache", "Building blocks", "Caching & CDN", "The cheapest way to cut latency and database load on read-heavy systems.", [
      "Strategies: cache-aside, read-through, write-through, write-back (write-behind), write-around",
      "Eviction: LRU, LFU, FIFO, plus TTL expiry",
      "Invalidation and stale reads are the hard part",
      "Cache stampede: mitigate with request coalescing, locks, jittered TTLs",
      "CDN: serve static and media content from edge locations; push vs pull CDNs",
      "Layers: client, CDN, in-process, distributed cache (Redis, Memcached)"]),
    F("proxy", "Building blocks", "Proxies & API gateways", "Where cross-cutting concerns like TLS, auth and routing live.", [
      "Forward proxy acts for clients; reverse proxy acts for servers",
      "Reverse proxy jobs: TLS termination, caching, compression, routing",
      "API gateway: routing, authentication, rate limiting, request aggregation",
      "Service mesh with sidecar proxies (e.g. Envoy) for service-to-service traffic"]),
    F("sqlnosql", "Data layer", "SQL vs NoSQL", "Choosing the store from access patterns is one of the most-asked decisions.", [
      "Relational: fixed schema, joins, ACID transactions (PostgreSQL, MySQL)",
      "NoSQL families: key-value (Redis, DynamoDB), document (MongoDB), wide-column (Cassandra, HBase), graph (Neo4j)",
      "Pick by access patterns, consistency needs and scale, not by fashion",
      "ACID vs BASE trade-offs"]),
    F("index", "Data layer", "Indexing", "Explains why a query is fast or slow and what writes cost.", [
      "B-tree indexes: the default in most relational databases; good for range queries",
      "LSM trees: write-optimised (Cassandra, RocksDB, LevelDB)",
      "Hash indexes for exact-match lookups",
      "Composite indexes follow the leftmost-prefix rule",
      "Indexes speed reads but slow writes and use storage",
      "Geospatial indexes: geohash, quadtree, S2 cells"]),
    F("repl", "Data layer", "Replication", "Gives you read scaling and survival when a node dies.", [
      "Leader–follower (primary–replica), multi-leader, leaderless (Dynamo-style)",
      "Synchronous vs asynchronous replication",
      "Replication lag causes stale reads; read-your-writes fixes",
      "Failover, and the split-brain risk"]),
    F("shard", "Data layer", "Sharding / partitioning", "How data grows beyond a single database server.", [
      "Horizontal partitioning (sharding) vs vertical partitioning",
      "Range-based vs hash-based partition keys",
      "Hot spots and the celebrity problem",
      "Cross-shard queries and transactions are expensive",
      "Resharding and rebalancing"]),
    F("ch", "Data layer", "Consistent hashing", "Lets you add or remove nodes without remapping almost every key.", [
      "Nodes and keys hash onto a ring; a key belongs to the next node clockwise",
      "Adding or removing a node moves only about K/N keys on average",
      "Virtual nodes spread load more evenly",
      "Used in Dynamo-style stores, Cassandra, distributed caches"]),
    F("storage", "Data layer", "Storage: block, file, object (blob)", "Large files and media almost never belong in your database.", [
      "Block storage: raw volumes attached to a machine (e.g. AWS EBS)",
      "File storage: hierarchical, shared over NFS or SMB",
      "Object/blob storage: flat namespace, key + metadata, HTTP API (S3, Azure Blob, GCS)",
      "Pattern: bytes in object storage, metadata in a database",
      "Pre-signed URLs for direct upload/download; multipart uploads for big files"]),
    F("search", "Data layer", "Search & indexing basics", "Full-text and typeahead features need a different index than your database.", [
      "Inverted index: term → list of documents containing it",
      "Tokenisation, normalisation, stemming",
      "Relevance ranking: TF-IDF, BM25",
      "Elasticsearch / OpenSearch, built on Apache Lucene",
      "Tries for prefix lookups (autocomplete)",
      "Keep the index in sync via events or change data capture"]),
    F("mq", "Communication", "Message queues & pub/sub", "Decouples services and absorbs traffic spikes with async work.", [
      "Queue: each message goes to one consumer; pub/sub: every subscriber gets a copy",
      "Delivery semantics: at-most-once, at-least-once, effectively-once",
      "Kafka: ordered within a partition, consumer groups, retained log",
      "Dead-letter queues, retries, backpressure",
      "Examples: Kafka, RabbitMQ, Amazon SQS/SNS"]),
    F("api", "Communication", "API design: REST, gRPC, GraphQL", "The contract you sketch in step 3 of every interview.", [
      "REST: resources, HTTP methods, status codes; GET, PUT, DELETE are idempotent, POST is not",
      "gRPC: HTTP/2 + Protocol Buffers, streaming; common between internal services",
      "GraphQL: the client chooses the fields it needs",
      "Pagination: offset vs cursor-based",
      "Versioning and idempotency keys for unsafe operations"]),
    F("rt", "Communication", "Real-time: WebSockets, long polling, SSE", "Chat, live location and sync all need the server to push to clients.", [
      "Short polling vs long polling (server holds the request until data arrives)",
      "WebSockets: persistent, full-duplex connection",
      "Server-Sent Events: one-way server-to-client stream over HTTP",
      "Connection servers are stateful: track which server holds which user",
      "Fan messages between connection servers with pub/sub"]),
    F("rl", "Communication", "Rate limiting", "Protects services from abuse and overload; also a standalone design question.", [
      "Algorithms: token bucket, leaky bucket, fixed window, sliding window log, sliding window counter",
      "Where: client, API gateway, or inside the service",
      "Distributed counters in Redis with atomic operations",
      "Respond with HTTP 429 Too Many Requests and a Retry-After header"]),
    F("micro", "Architecture & ops", "Monolith vs microservices", "A real-world architecture choice with costs on both sides.", [
      "Monolith: simple to build, test and deploy; in-process calls",
      "Microservices: independent deploys and scaling, team autonomy",
      "Costs: network calls, distributed data, operational overhead",
      "Service discovery, circuit breakers, retries with backoff, timeouts",
      "Database per service; sagas for cross-service workflows"]),
    F("obs", "Architecture & ops", "Observability", "You can only run what you can see; interviewers ask how you'd monitor it.", [
      "Metrics, logs and traces",
      "Distributed tracing with trace and span IDs (OpenTelemetry)",
      "RED method (rate, errors, duration) and USE method (utilisation, saturation, errors)",
      "Alert on SLOs; dashboards; health checks"]),
    F("sec", "Architecture & ops", "Security basics: auth, OAuth, TLS", "Every public system needs identity, access control and encryption.", [
      "Authentication (who you are) vs authorisation (what you may do)",
      "Server sessions vs tokens such as JWT",
      "OAuth 2.0 for delegated authorisation; OpenID Connect adds authentication on top",
      "TLS for encryption in transit; encryption at rest",
      "Hash passwords with bcrypt, scrypt or Argon2; least privilege; secrets management"]),
    F("consensus", "Distributed systems", "Consensus & leader election", "How a cluster agrees on one leader or one log despite failures.", [
      "Paxos and Raft (leader, terms, replicated log)",
      "Majority quorum: 2f + 1 nodes tolerate f failures",
      "Leader election with ZooKeeper or etcd, using leases",
      "Fencing tokens stop a stale leader from writing"]),
    F("idem", "Distributed systems", "Idempotency & retries", "Networks fail mid-request, so retries must be safe.", [
      "Idempotent: doing it twice has the same effect as doing it once",
      "Idempotency keys stored with the result of the first attempt",
      "Retries with exponential backoff and jitter",
      "At-least-once delivery + idempotent consumers gives effectively-once processing"]),
    F("ids", "Distributed systems", "Distributed unique IDs", "Many designs need unique, often sortable, IDs without a single counter.", [
      "UUID: 128-bit; v4 is random",
      "Snowflake-style 64-bit ID: timestamp + machine ID + sequence, roughly time-ordered",
      "Database ticket servers or pre-allocated ID ranges",
      "Base62 encoding for short IDs"]),
    F("bloom", "Distributed systems", "Bloom filters & probabilistic structures", "Answer 'have I seen this?' in tiny memory at web scale.", [
      "Bloom filter: false positives possible, false negatives impossible",
      "k hash functions set bits in a bit array; standard filters cannot delete",
      "HyperLogLog for distinct counts; Count-Min Sketch for frequencies",
      "Uses: skip disk reads in LSM stores, crawler 'URL seen' checks"]),
    F("dtx", "Distributed systems", "Distributed transactions & locking", "Bookings and payments must stay correct across services.", [
      "Two-phase commit (2PC): coordinator-driven; blocks if the coordinator fails",
      "Saga: sequence of local transactions with compensating actions",
      "Transactional outbox for reliable event publishing",
      "Optimistic (version check) vs pessimistic (row lock) concurrency control"]),

    P("url", "Easy", "URL shortener (TinyURL)", "The classic warm-up: IDs, read-heavy caching and redirects.", [
      "Base62-encode a unique ID, or hash + collision check",
      "301 (permanent, cacheable by browsers) vs 302 (temporary, every click hits you, better for analytics)",
      "Read-heavy: cache hot short links",
      "Custom aliases and expiry"], ["est", "ids", "cache", "sqlnosql", "shard", "lb"]),
    P("paste", "Easy", "Pastebin", "Like the URL shortener but with larger payloads and expiry.", [
      "Paste content in object storage, metadata in a database",
      "Unique key generation",
      "Expiry and cleanup jobs",
      "CDN / cache for popular pastes"], ["storage", "ids", "cache", "sqlnosql", "est"]),
    P("rlim", "Easy", "Rate limiter", "Small scope, but tests algorithms and distributed counters.", [
      "Choose an algorithm (token bucket is a common default) and justify it",
      "Place it in the API gateway or as middleware",
      "Shared counters in Redis; atomic increments to avoid races",
      "Rules config, 429 responses, fail-open vs fail-closed"], ["rl", "cache", "proxy", "consistency"]),
    P("notif", "Medium", "Notification system", "Fan-out to many channels with retries and user preferences.", [
      "Channels: mobile push (APNs, FCM), SMS, email via third-party providers",
      "Queue per channel; workers send and retry",
      "Deduplication so users are not notified twice",
      "User preferences, templates, rate limits per user"], ["mq", "idem", "rl", "sqlnosql", "obs"]),
    P("auto", "Medium", "Search autocomplete (typeahead)", "Very low latency on a huge read path.", [
      "Trie with precomputed top-k suggestions per prefix",
      "Build or refresh the trie offline from query logs",
      "Cache popular prefixes at the edge and in the browser",
      "Shard by prefix; filter unsafe suggestions"], ["search", "cache", "shard", "mq"]),
    P("crawl", "Medium", "Web crawler", "Distributed work scheduling with politeness and deduplication.", [
      "URL frontier with priority and per-host politeness queues",
      "Respect robots.txt; cache DNS lookups",
      "Dedupe URLs with a Bloom filter; dedupe content with hashes",
      "Store pages in object storage; distribute hosts across workers"], ["mq", "bloom", "storage", "ch", "shard"]),
    P("dcache", "Medium", "Distributed cache", "Design the Redis/Memcached layer itself.", [
      "Partition keys with consistent hashing",
      "Replication for availability",
      "Eviction (LRU) and TTLs",
      "Hot keys and invalidation"], ["cache", "ch", "repl", "consistency", "cap"]),
    P("feed", "Medium", "News feed", "The fan-out trade-off at the heart of social apps.", [
      "Fan-out on write (push) vs fan-out on read (pull)",
      "Hybrid: pull for accounts with huge follower counts",
      "Feed cache per user; cursor pagination",
      "Ranking as a separate concern"], ["cache", "mq", "shard", "sqlnosql", "api"]),
    P("insta", "Medium", "Instagram", "Media upload and delivery plus a social feed.", [
      "Upload via pre-signed URLs to object storage; serve through a CDN",
      "Async workers create resized versions",
      "Follower graph and feed generation",
      "Metadata and likes at scale"], ["storage", "cache", "mq", "shard", "ids"]),
    P("twitter", "Medium", "Twitter / X", "Timelines, search and trends at massive read volume.", [
      "Home and user timelines; hybrid fan-out",
      "Time-sortable IDs (Twitter created Snowflake)",
      "Search over tweets with an inverted index",
      "Trending topics from stream counts"], ["cache", "mq", "shard", "ids", "search"]),
    P("prox", "Medium", "Proximity service (Maps / Yelp nearby)", "Geospatial search: find places near a point.", [
      "Geospatial indexing: geohash, quadtree, or S2",
      "Neighbouring cells to cover the search radius",
      "Read-heavy: replicas and caching",
      "Business data changes rarely; index can be rebuilt periodically"], ["index", "cache", "repl", "shard"]),
    P("kv", "Hard", "Key-value store (Dynamo-style)", "Brings most distributed-data fundamentals into one design.", [
      "Consistent hashing with virtual nodes",
      "Replication factor N; tunable quorum reads/writes (R, W)",
      "Conflict resolution: vector clocks or last-write-wins",
      "Gossip membership, hinted handoff, Merkle trees for anti-entropy",
      "LSM-tree storage with Bloom filters"], ["ch", "repl", "consistency", "cap", "index", "bloom"]),
    P("chat", "Hard", "Chat app (WhatsApp)", "Real-time delivery, ordering and offline sync.", [
      "WebSocket connection servers plus a session registry",
      "Message ordering per conversation; sent, delivered, read receipts",
      "Store messages for offline users and sync on reconnect",
      "Presence, group fan-out, end-to-end encryption"], ["rt", "mq", "sqlnosql", "ids", "shard", "sec"]),
    P("video", "Hard", "YouTube / Netflix", "Large uploads, transcoding pipelines and global delivery.", [
      "Upload to object storage; transcode into multiple resolutions and bitrates",
      "Adaptive bitrate streaming (HLS, MPEG-DASH)",
      "CDN delivery close to viewers",
      "Metadata, view counts, resumable uploads"], ["storage", "cache", "mq", "sqlnosql", "est"]),
    P("uber", "Hard", "Ride hailing (Uber)", "High-frequency location writes plus real-time matching.", [
      "Driver location updates every few seconds",
      "Geospatial index to find nearby drivers",
      "Matching and a trip state machine",
      "Push updates to riders and drivers; safe retries on trip actions"], ["rt", "index", "cache", "shard", "mq", "idem"]),
    P("drive", "Hard", "Google Drive / Dropbox", "File sync across devices with conflicts.", [
      "Split files into chunks; dedupe chunks by content hash",
      "Upload only changed chunks (delta sync)",
      "Strongly consistent metadata database",
      "Notify other devices of changes; resolve conflicts"], ["storage", "sqlnosql", "rt", "consistency", "mq"]),
    P("ticket", "Hard", "Ticket booking (BookMyShow)", "Correctness under contention: never sell a seat twice.", [
      "Temporary seat hold with a TTL during checkout",
      "Optimistic or pessimistic locking on seat inventory",
      "Payment integration with idempotency",
      "Traffic spikes for popular shows: virtual waiting queue, rate limits"], ["dtx", "idem", "consistency", "cache", "mq", "rl"]),
    P("pay", "Hard", "Payment system", "Money must move exactly once and be auditable.", [
      "Idempotency keys on every payment request",
      "Double-entry ledger",
      "Integrate with payment service providers; handle async callbacks",
      "Reconciliation against provider reports; retries and audit trails"], ["idem", "dtx", "consistency", "mq", "sec", "obs"])
  ];

  var BY_ID = {};
  TOPICS.forEach(function (t) { BY_ID[t.id] = t; });
  var FUNDS = TOPICS.filter(function (t) { return t.kind === "fund"; });
  var PROBS = TOPICS.filter(function (t) { return t.kind === "prob"; });
  function code(t) {
    var list = t.kind === "fund" ? FUNDS : PROBS;
    var n = list.indexOf(t) + 1;
    return (t.kind === "fund" ? "F" : "P") + (n < 10 ? "0" : "") + n;
  }
  function usedBy(id) { return PROBS.filter(function (p) { return (p.deps || []).indexOf(id) >= 0; }); }

  /* Progress shared by both pages, kept in this browser's localStorage. */
  var KEY = "hld.done.v1";
  function getDone() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function isDone(id) { return getDone().indexOf(id) >= 0; }
  function setDone(id, on) {
    var d = getDone().filter(function (x) { return x !== id; });
    if (on) d.push(id);
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage unavailable */ }
  }
  function load(key, fallback) { try { var v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  /* Render `code` spans like the original Pages. */
  function md(s) { return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>"); }

  /* Build Mermaid flowchart source from {nodes, edges}. */
  function flow(nodes, edges, dir) {
    var out = ["flowchart " + (dir || "LR")];
    nodes.forEach(function (n) {
      var lbl = "<b>" + esc(n.label) + "</b>" + (n.detail ? "<br/><span class='d'>" + esc(n.detail) + "</span>" : "");
      lbl = lbl.replace(/"/g, "#quot;");
      var shape = n.kind === "terminal" ? ['(["', '"])'] : ['["', '"]'];
      out.push("  n_" + n.id + shape[0] + lbl + shape[1] + (n.series !== undefined ? ":::s" + n.series : ""));
    });
    edges.forEach(function (e) {
      var arrow = e.dashed ? "-.->" : "-->";
      var lab = e.label ? "|" + esc(e.label).replace(/"/g, "#quot;").replace(/\|/g, "/") + "|" : "";
      out.push("  n_" + e.from + " " + arrow + lab + " n_" + e.to);
    });
    out.push("  classDef s0 stroke:#3b82f6,stroke-width:2px;");
    out.push("  classDef s1 stroke:#eab308,stroke-width:2px;");
    out.push("  classDef s2 stroke:#06b6d4,stroke-width:2px;");
    return out.join("\n");
  }

  var mermaidReady = false;
  function initMermaid() {
    if (!window.mermaid) return false;
    if (!mermaidReady) {
      var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      window.mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "neutral", securityLevel: "loose", flowchart: { htmlLabels: true, curve: "basis" }, fontFamily: "inherit" });
      mermaidReady = true;
    }
    return true;
  }
  var seq = 0;
  /* Render Mermaid source into element el; falls back to showing the source if Mermaid failed to load. */
  function renderDiagram(el, src) {
    if (!initMermaid()) { el.innerHTML = "<pre class='fallback'>" + esc(src) + "</pre>"; return Promise.resolve(); }
    var id = "mmd" + (++seq);
    return window.mermaid.render(id, src).then(function (r) { el.innerHTML = r.svg; }).catch(function (err) {
      el.innerHTML = "<pre class='fallback'>" + esc(src) + "</pre>";
      if (window.console) console.error("Mermaid render failed", err);
    });
  }

  var REG = {};
  function registerLesson(l) { REG[l.code] = l; }
  function byCode(c) { for (var i = 0; i < TOPICS.length; i++) { if (code(TOPICS[i]) === c) return TOPICS[i]; } return null; }
  function isReady(c) { return (window.HLD_READY || []).indexOf(c) >= 0; }

  window.HLD = {
    registerLesson: registerLesson, lessons: REG, byCode: byCode, isReady: isReady,
    PHASES: PHASES, LEVELS: LEVELS, GROUPS: PHASES.concat(LEVELS), TOPICS: TOPICS, BY_ID: BY_ID, FUNDS: FUNDS, PROBS: PROBS,
    code: code, usedBy: usedBy, getDone: getDone, isDone: isDone, setDone: setDone, load: load, save: save,
    esc: esc, md: md, flow: flow, renderDiagram: renderDiagram
  };
})();
