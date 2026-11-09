/* Lesson F09: SQL vs NoSQL */
(function () {
  "use strict";
  var H = window.HLD, esc = H.esc;

  function widget(el, ctx) {
    var s = ctx.state;
    var QS = [
      ["tx", "Do you need multi-row / multi-table transactions (e.g. move money, place order + decrement stock)?", ["Yes", "No"]],
      ["shape", "What does the data look like?", ["Related tables", "Self-contained documents", "Key → value blobs", "Highly connected graph", "Huge append-only rows by key and time"]],
      ["query", "How will you query it?", ["Ad-hoc queries, joins, reports", "Mostly by primary key", "By key + range (e.g. time)", "Traversals (friends of friends)"]],
      ["scale", "Write scale on day one?", ["Moderate (fits a primary)", "Massive (needs many nodes)"]]
    ];
    QS.forEach(function (x) { if (s[x[0]] === undefined) s[x[0]] = 0; });
    el.innerHTML = "<div data-r='qs' style='display:flex;flex-direction:column;gap:12px'></div><div class='callout info' data-r='out'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function recommend() {
      var tx = s.tx === 0, shape = s.shape, query = s.query, big = s.scale === 1;
      if (shape === 3 || query === 3) return ["Graph database (e.g. Neo4j)", "Relationship traversals are first-class; a relational DB needs many self-joins for multi-hop queries."];
      if (tx && !big) return ["Relational (PostgreSQL / MySQL)", "ACID transactions, joins and flexible queries; scale reads with replicas and caching first."];
      if (tx && big) return ["Distributed SQL (e.g. Spanner, CockroachDB) or sharded relational", "You need transactions and horizontal write scale: distributed SQL gives both at the cost of latency and complexity."];
      if (shape === 4 || query === 2) return ["Wide-column (e.g. Cassandra, HBase)", "Partition by key, sort by time within a partition; designed for very high write throughput."];
      if (shape === 2 || query === 1) return ["Key-value (e.g. DynamoDB, Redis)", "Simple get/put by key scales almost without limit; plan access patterns up front."];
      if (shape === 1) return ["Document (e.g. MongoDB)", "Self-contained JSON-like documents read and written whole; flexible schema per document."];
      return ["Relational (PostgreSQL / MySQL)", "A safe default when queries are varied and relationships matter."];
    }
    function draw() {
      q("qs").innerHTML = QS.map(function (x) {
        return "<div><div style='font-weight:600;margin-bottom:6px'>" + esc(x[1]) + "</div><div class='seg'>" + x[2].map(function (o, i) { return "<button type='button' data-q='" + x[0] + "' data-i='" + i + "' class='" + (s[x[0]] === i ? "on" : "") + "'>" + esc(o) + "</button>"; }).join("") + "</div></div>";
      }).join("");
      var r = recommend();
      q("out").innerHTML = "<span class='lead'>Suggested starting point:</span>" + esc(r[0]) + "<p style='margin-top:6px'>" + esc(r[1]) + "</p>";
    }
    q("qs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s[b.getAttribute("data-q")] = +b.getAttribute("data-i"); ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F09",
    summary: "How to choose a database from access patterns: relational databases and ACID, the four NoSQL families (key-value, document, wide-column, graph), BASE trade-offs, and polyglot persistence.",
    slides: [
      { t: "Start from access patterns", x: "The right database depends on what you store, how you read and write it, how consistent it must be, and how much it must scale. Not on fashion.",
        p: ["What are the entities and how are they related?", "What are the top queries? By key, by range, ad hoc, traversals?", "Read:write ratio and write volume", "Consistency and transaction needs", "Many systems use several databases (polyglot persistence)"],
        m: "flowchart LR\n  A[\"Access patterns\"]:::s0 --> C{\"Choose\"}\n  D[\"Data shape\"] --> C\n  K[\"Consistency needs\"] --> C\n  S[\"Scale\"] --> C\n  C --> DB[\"Database family\"]:::s2" },
      { t: "Relational databases (SQL)", x: "Data in tables with a fixed schema; rows related by keys; queried with SQL. Decades of maturity: PostgreSQL, MySQL, Oracle, SQL Server.",
        p: ["Joins across tables; normalisation avoids duplicated data", "ACID transactions across many rows and tables", "Powerful ad-hoc queries, indexes, constraints (unique, foreign keys)", "Scale reads with replicas; scaling writes beyond one primary needs sharding or distributed SQL"],
        m: "erDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ ORDER_ITEM : contains\n  PRODUCT ||--o{ ORDER_ITEM : appears_in\n  USER { bigint id PK\n string email }\n  ORDER { bigint id PK\n bigint user_id FK\n timestamp created_at }" },
      { t: "ACID transactions", x: "A transaction groups operations so they behave as one unit, even with failures and concurrency.",
        table: [["Letter", "Meaning", "Example"], ["Atomicity", "All or nothing", "Debit and credit both happen or neither does"], ["Consistency", "Constraints and invariants hold", "Balance never below zero, foreign keys valid"], ["Isolation", "Concurrent transactions don't interfere (to a chosen level)", "Two transfers don't overwrite each other"], ["Durability", "Committed data survives crashes", "Written to a log on disk before 'OK'"]],
        m: "sequenceDiagram\n  participant A as App\n  participant DB as Database\n  A->>DB: BEGIN\n  A->>DB: UPDATE accounts SET bal = bal - 100 WHERE id = 1\n  A->>DB: UPDATE accounts SET bal = bal + 100 WHERE id = 2\n  A->>DB: COMMIT\n  DB-->>A: both applied, or neither" },
      { t: "Key-value stores", x: "The simplest model: a key maps to an opaque value. Get, put, delete by key.",
        p: ["Extremely fast and easy to partition by key", "No queries by value content (unless the store adds indexes)", "Examples: Redis (in memory), Amazon DynamoDB, Riak, etcd", "Uses: sessions, caches, shopping carts, feature flags, user settings"],
        m: "flowchart LR\n  K1[\"session:ab12\"] --> V1[\"{user: 42, exp: ...}\"]:::s0\n  K2[\"cart:42\"] --> V2[\"[sku1, sku7]\"]:::s0\n  K3[\"flag:new_ui\"] --> V3[\"true\"]:::s0" },
      { t: "Document databases", x: "Store self-contained documents (JSON/BSON) with nested fields. Each document can have its own shape.",
        p: ["Reads and writes whole aggregates in one go (e.g. a product with its variants)", "Flexible schema: add fields without migrations (but validate in code)", "Secondary indexes on fields; limited or costly joins", "Examples: MongoDB, Couchbase, Amazon DocumentDB, Firestore", "Uses: catalogues, CMS content, user profiles"],
        m: "flowchart LR\n  D[\"product:991<br/>name, price,<br/>variants: [size, colour],<br/>reviews_summary\"]:::s0 --> Q[\"Read whole document by id or indexed field\"]" },
      { t: "Wide-column stores", x: "Rows grouped into partitions by a partition key, sorted by a clustering key within each partition. Built for huge write volume across many nodes.",
        p: ["Model data per query: one table per access pattern, denormalised", "Partition key decides which node holds the data; clustering key orders it (e.g. by time)", "Tunable consistency; LSM-tree storage makes writes cheap", "Examples: Apache Cassandra, HBase, Google Bigtable, ScyllaDB", "Uses: messages, time series, activity logs, IoT"],
        table: [["Partition key (chat_id)", "Clustering key (sent_at)", "Columns"], ["chat_7", "10:01:05", "sender=ana, text=hi"], ["chat_7", "10:01:09", "sender=raj, text=hey"], ["chat_9", "09:58:40", "sender=lee, text=ok"]],
        m: "flowchart LR\n  W[\"Write message\"] --> H[\"hash(chat_id)\"] --> N[\"Node owning that partition\"]:::s0 --> R[\"Rows sorted by sent_at\"]:::s1" },
      { t: "Graph databases", x: "Nodes and edges are first-class; queries traverse relationships efficiently.",
        p: ["Multi-hop questions: friends of friends, shortest path, fraud rings", "In SQL, each hop is another join, which gets expensive", "Examples: Neo4j, Amazon Neptune, JanusGraph", "Uses: social graphs, recommendations, fraud detection, knowledge graphs"],
        m: "flowchart LR\n  A((\"Ana\")) -->|\"follows\"| B((\"Raj\"))\n  B -->|\"follows\"| C((\"Lee\"))\n  A -->|\"likes\"| P[\"Post 7\"]:::s1\n  C -->|\"wrote\"| P" },
      { t: "ACID vs BASE", x: "Many NoSQL systems relaxed guarantees to scale horizontally and stay available, summarised as BASE.",
        table: [["", "ACID (typical SQL)", "BASE (many NoSQL)"], ["Stands for", "Atomic, Consistent, Isolated, Durable", "Basically Available, Soft state, Eventually consistent"], ["Priority", "Correctness", "Availability and scale"], ["Transactions", "Multi-row, multi-table", "Often single-key or single-partition"], ["Consistency", "Strong", "Often eventual or tunable"]],
        p: ["The line is blurring: MongoDB and DynamoDB added multi-document transactions; distributed SQL databases scale horizontally with ACID"],
        m: "flowchart LR\n  A[\"ACID: correctness first\"]:::s0 <--> B[\"BASE: availability and scale first\"]:::s1" },
      { t: "Comparison at a glance", x: "A cheat sheet. Real products blur these lines, so explain why for your specific access pattern.",
        table: [["Family", "Strength", "Weakness", "Example"], ["Relational", "Joins, transactions, ad-hoc queries", "Write scaling beyond one primary", "PostgreSQL"], ["Key-value", "Speed, simple scaling", "Only key lookups", "DynamoDB, Redis"], ["Document", "Flexible aggregates", "Cross-document joins", "MongoDB"], ["Wide-column", "Massive writes, time-ordered data", "Query flexibility, must model per query", "Cassandra"], ["Graph", "Relationship traversal", "Large scans, sharding graphs is hard", "Neo4j"]],
        m: "quadrantChart\n  title Query flexibility vs horizontal write scale (rough)\n  x-axis Low write scale --> High write scale\n  y-axis Simple queries --> Flexible queries\n  Relational: [0.25, 0.85]\n  Document: [0.55, 0.6]\n  Graph: [0.3, 0.7]\n  Key-value: [0.85, 0.15]\n  Wide-column: [0.9, 0.35]" },
      { t: "Polyglot persistence", x: "Large systems often use several stores, each for what it does best, kept in sync through events.",
        p: ["Orders and payments in PostgreSQL (transactions)", "Product catalogue in a document store", "Sessions and counters in Redis", "Messages or events in Cassandra", "Search in Elasticsearch, fed by change data capture", "Trade-off: more systems to operate and keep consistent"],
        m: "flowchart LR\n  APP[\"Services\"] --> PG[\"PostgreSQL<br/>orders, payments\"]:::s0\n  APP --> MG[\"Document DB<br/>catalogue\"]\n  APP --> RD[\"Redis<br/>sessions, counters\"]:::s1\n  PG -. \"CDC events\" .-> ES[\"Elasticsearch<br/>search\"]:::s2" },
      { t: "Choosing in an interview", x: "State the access patterns, pick a store, and justify it with one or two concrete reasons and a trade-off.",
        p: ["'Orders need multi-row transactions, so PostgreSQL; we shard by user_id later if writes outgrow one primary.'", "'Chat messages are written heavily and read by chat_id ordered by time: Cassandra with partition key chat_id, clustering key timestamp.'", "Avoid 'NoSQL because it scales' without saying how it fits the queries", "Mention indexes, replication and sharding plans"],
        m: "flowchart LR\n  P[\"Access pattern\"] --> S[\"Store\"]:::s0 --> R[\"Reason\"] --> T[\"Trade-off\"]:::s1" }
    ],
    widget: { heading: "Database picker", caption: "A simplified decision aid for practice. Real choices also weigh team experience, operations and cost.", render: widget },
    examples: [
      ["Discord messages", "Discord's engineering blog describes storing billions of messages in Cassandra (later moving to ScyllaDB), partitioned by channel and time bucket."],
      ["Amazon DynamoDB", "Grew out of lessons from Dynamo; a managed key-value/document store used for carts, sessions and other single-key access at huge scale."],
      ["Instagram and PostgreSQL", "Instagram has described sharding PostgreSQL for core data such as users and media metadata."],
      ["Google Spanner", "A distributed SQL database offering ACID transactions and SQL across regions, showing SQL and horizontal scale can coexist."]
    ],
    pitfalls: [
      "Choosing NoSQL 'because it scales' without mapping it to queries",
      "Choosing a document store, then needing many cross-document joins",
      "Modelling Cassandra tables like normalised SQL tables",
      "Ignoring transactions for money, inventory or bookings",
      "Forgetting that relational databases scale far with indexes, replicas and caching",
      "Using a graph database for simple key lookups"
    ],
    quiz: [
      ["Which requirement most strongly points to a relational database?", ["Simple key lookups at massive scale", "Multi-table transactions and ad-hoc joins", "Storing video files", "Append-only sensor data"], 1, "Relational databases excel at ACID transactions and flexible joins."],
      ["What does the partition key do in Cassandra?", ["Sorts rows inside a partition", "Decides which node(s) store the row", "Encrypts the data", "Defines foreign keys"], 1, "The partition key is hashed to place data on nodes; the clustering key orders rows within the partition."],
      ["Which workload fits a graph database best?", ["Session storage", "Finding friends-of-friends and fraud rings", "Monthly sales reports", "Image hosting"], 1, "Multi-hop relationship traversals are where graph databases shine."],
      ["In ACID, what does 'Atomicity' guarantee?", ["Data is encrypted", "All operations in a transaction happen, or none do", "Reads are fast", "Data is replicated"], 1, "Atomicity means no partial transactions are left behind after failures."],
      ["What does BASE stand for?", ["Basic Availability, Strong Encryption", "Basically Available, Soft state, Eventually consistent", "Batch, Append, Sort, Expire", "Backup And Snapshot Engine"], 1, "BASE describes systems that favour availability and accept eventual consistency."],
      ["A product catalogue where each product has a different set of attributes is often a good fit for…", ["A graph database", "A document database", "A wide-column store only", "A message queue"], 1, "Document stores handle self-contained items with varying fields naturally."],
      ["What is polyglot persistence?", ["Using SQL in many languages", "Using different databases for different parts of a system based on their needs", "Replicating one DB to many regions", "Translating schemas automatically"], 1, "Large systems often combine relational, key-value, search and other stores."]
    ],
    practice: {
      q: "You're designing a food-delivery app: users, restaurants and menus, orders and payments, live courier locations, order history, and restaurant search by name and cuisine. Pick the storage for each and justify it.",
      a: [
        ["Users, orders, payments → relational", "Need transactions (order + payment status), constraints and reporting. PostgreSQL with replicas; shard by user or region if needed later."],
        ["Restaurants and menus → document or relational", "Menus are nested and vary per restaurant: a document store or PostgreSQL JSONB; read-heavy, so cache aggressively."],
        ["Live courier locations → in-memory key-value", "Very frequent updates and only the latest value matters: Redis with geospatial indexes (GEOADD/GEOSEARCH) and short TTLs."],
        ["Order history and events → wide-column", "Append-heavy, read by user and time: Cassandra partitioned by user_id, clustered by created_at."],
        ["Search → search engine", "Elasticsearch/OpenSearch for full-text and filters by cuisine, fed by change events from the restaurant store."],
        ["Keeping them in sync", "Transactional outbox / CDC to publish changes to a queue so search and caches update reliably."],
        ["Trade-offs", "Five stores add operational cost; justify each by an access pattern the main database can't serve well."]
      ]
    },
    recap: [
      "Choose databases from access patterns, consistency needs and scale.",
      "Relational: schema, joins, ACID; scales reads easily, writes with effort.",
      "Key-value, document, wide-column and graph each fit a specific query shape.",
      "BASE trades strong guarantees for availability and scale; the line is blurring.",
      "Real systems mix stores (polyglot persistence) kept in sync by events."
    ]
  });
})();
