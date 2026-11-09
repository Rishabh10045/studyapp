/* Lesson F10: Indexing */
(function () {
  "use strict";
  var H = window.HLD, esc = H.esc;

  function widget(el, ctx) {
    var s = ctx.state;
    if (s.exp === undefined) { s.exp = 8; s.fan = 200; s.cols = { country: true, city: false, age: false }; s.range = false; }
    el.innerHTML = "<div class='card'><h3>1 · Full scan vs B-tree lookup</h3><label class='field'>Rows in the table: <strong data-r='nl' style='color:var(--text)'></strong><input type='range' min='3' max='10' data-r='n'></label><label class='field' style='margin-top:8px'>B-tree fan-out (keys per page): <strong data-r='fl' style='color:var(--text)'></strong><input type='range' min='50' max='500' step='50' data-r='f'></label><div class='metrics' data-r='o1' style='margin-top:12px'></div><p class='caption'>Simplified: counts rows examined vs index pages visited for one exact-match lookup.</p></div>" +
      "<div class='card'><h3>2 · Can this query use INDEX (country, city, age)?</h3><p class='caption'>Toggle which columns appear in the WHERE clause.</p><div class='btnrow' data-r='cols'></div><label class='toggle' style='margin-top:8px'><input type='checkbox' data-r='range'> The first used column is filtered by a range (e.g. country > 'M')</label><div class='callout' data-r='o2' style='margin-top:10px'></div></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var n = Math.pow(10, s.exp);
      q("n").value = s.exp; q("f").value = s.fan; q("nl").textContent = n.toLocaleString(); q("fl").textContent = s.fan;
      var levels = Math.max(1, Math.ceil(Math.log(n) / Math.log(s.fan)));
      q("o1").innerHTML = [[n.toLocaleString(), "Rows read by a full table scan (worst case)"], [String(levels), "B-tree levels to reach the row"], [(n / levels).toExponential(1).replace("e+", "×10^"), "Times less work with the index"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      var order = ["country", "city", "age"];
      q("cols").innerHTML = order.map(function (c) { return "<button type='button' class='btn" + (s.cols[c] ? " primary" : "") + "' data-c='" + c + "'>" + c + " = …</button>"; }).join("");
      q("range").checked = s.range;
      var used = [];
      for (var i = 0; i < order.length; i++) { if (s.cols[order[i]]) { used.push(order[i]); if (s.range && used.length === 1) break; } else break; }
      var any = order.some(function (c) { return s.cols[c]; });
      var msg;
      if (!any) msg = "No filter: the database scans everything (the index might still help ORDER BY country, city, age).";
      else if (!used.length) msg = "Can't seek with this index: the query doesn't filter on the leftmost column (country). Expect a full scan, or create another index starting with your filter column.";
      else {
        var skipped = order.filter(function (c) { return s.cols[c] && used.indexOf(c) < 0; });
        msg = "Index seek on: " + used.join(", ") + "." + (skipped.length ? " " + skipped.join(", ") + (s.range ? " can't be used for seeking after a range on the first column;" : " is not contiguous with the prefix;") + " it's filtered afterwards." : " All filters use the index.");
      }
      q("o2").textContent = msg;
    }
    q("n").addEventListener("input", function (e) { s.exp = +e.target.value; ctx.save(); draw(); });
    q("f").addEventListener("input", function (e) { s.fan = +e.target.value; ctx.save(); draw(); });
    q("cols").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var c = b.getAttribute("data-c"); s.cols[c] = !s.cols[c]; ctx.save(); draw(); });
    q("range").addEventListener("change", function (e) { s.range = e.target.checked; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "F10",
    summary: "Why some queries take microseconds and others take minutes: how indexes work (B-trees, LSM trees, hash indexes), composite indexes and the leftmost-prefix rule, covering indexes, the write cost of indexing, and geospatial indexes.",
    slides: [
      { t: "The problem: finding rows fast", x: "Without an index, finding rows that match a condition means reading every row: a full table scan. An index is a separate, sorted data structure that points to rows, like the index at the back of a book.",
        p: ["Full scan cost grows linearly with table size", "An index lookup on a B-tree grows logarithmically: a few page reads even for billions of rows", "Indexes are what make 'WHERE email = ?' fast"],
        m: "flowchart LR\n  Q[\"WHERE email = 'a@x.com'\"] --> S[\"No index: read all rows\"]:::bad\n  Q --> I[\"Index on email: a few page reads\"]:::s2 --> R[\"Row pointer → row\"]" },
      { t: "B-tree indexes", x: "The default index in most relational databases (PostgreSQL, MySQL InnoDB, Oracle, SQL Server). A balanced tree of pages, each holding many sorted keys.",
        p: ["High fan-out (hundreds of keys per page) keeps the tree shallow: typically 3–4 levels", "Supports exact match, ranges (BETWEEN, <, >), prefix LIKE 'abc%' and ORDER BY", "Stays balanced as data is inserted and deleted", "Updated in place on writes, which costs random I/O"],
        m: "flowchart TB\n  R[\"Root: 100 | 500\"]:::s0 --> A[\"1 … 99\"]\n  R --> B[\"100 … 499\"]\n  R --> C[\"500 …\"]\n  B --> L1[\"Leaf: 100,105,120 → rows\"]:::s1\n  B --> L2[\"Leaf: 300,310,350 → rows\"]:::s1\n  L1 -. \"leaves linked for range scans\" .-> L2" },
      { t: "Hash indexes", x: "Hash the key to find its bucket directly. Great for exact matches, useless for ranges.",
        p: ["O(1) average lookup for equality: WHERE id = 42", "Can't do range queries or ordering: hashes destroy order", "Used in in-memory stores and some engines (e.g. PostgreSQL hash indexes, memory tables)", "Hash maps are also the core of key-value stores and caches"],
        m: "flowchart LR\n  K[\"key 'user:42'\"] --> H[\"hash() mod buckets\"]:::s0 --> B[\"Bucket 7 → row location\"]:::s1" },
      { t: "LSM trees: write-optimised storage", x: "Log-Structured Merge trees turn random writes into sequential ones. Used by Cassandra, RocksDB, LevelDB, HBase and ScyllaDB.",
        p: ["Writes go to an in-memory sorted table (memtable) plus a write-ahead log", "When full, the memtable is flushed to disk as an immutable sorted file (SSTable)", "Background compaction merges SSTables and drops old versions", "Reads may check several SSTables; Bloom filters skip files that can't contain the key", "Trade-off vs B-trees: faster writes, potentially slower reads and compaction overhead"],
        m: "flowchart LR\n  W[\"Write\"] --> WAL[\"Write-ahead log\"]\n  W --> MT[\"Memtable (RAM, sorted)\"]:::s0\n  MT -->|\"flush\"| S1[\"SSTable 1\"]:::s1\n  MT -->|\"flush\"| S2[\"SSTable 2\"]:::s1\n  S1 --> CP[\"Compaction → merged SSTable\"]:::s2\n  S2 --> CP" },
      { t: "Composite indexes and the leftmost-prefix rule", x: "An index on (country, city, age) is sorted by country, then city within country, then age. It can only seek using a leftmost prefix of its columns.",
        table: [["Query filter", "Uses the index to seek?"], ["country = 'IN'", "Yes"], ["country = 'IN' AND city = 'Pune'", "Yes"], ["country = 'IN' AND city = 'Pune' AND age = 30", "Yes, all three"], ["city = 'Pune'", "No: skips the leftmost column"], ["country = 'IN' AND age = 30", "Partly: seeks on country, filters age afterwards"], ["country > 'M' AND city = 'Pune'", "Seeks on the country range; city is filtered afterwards"]],
        p: ["Order columns by how queries filter: equality columns first, then range columns", "Some engines have skip-scan tricks, but don't rely on them in interviews"],
        m: "flowchart LR\n  I[\"INDEX (country, city, age)\"]:::s0 --> P1[\"country\"] --> P2[\"country, city\"] --> P3[\"country, city, age\"]\n  X[\"city only\"]:::bad -.-> I" },
      { t: "Clustered, secondary and covering indexes", x: "Where the row data lives relative to the index matters for speed.",
        table: [["Type", "Meaning", "Example"], ["Clustered (primary)", "Table rows are stored in index order", "InnoDB stores rows in primary-key order"], ["Secondary", "Separate structure pointing to rows (or primary keys)", "INDEX on email"], ["Covering", "Index contains every column the query needs, so the table isn't touched", "INDEX (user_id, created_at, status) for a list query"]],
        p: ["A secondary-index lookup may need a second lookup to fetch the row", "Covering indexes ('index-only scans') avoid that extra hop"],
        m: "flowchart LR\n  Q[\"SELECT status FROM orders WHERE user_id=7\"] --> SI[\"Secondary index\"]:::s0 --> T[\"Fetch row from table\"]:::s1\n  Q -.-> CI[\"Covering index has status: done\"]:::s2" },
      { t: "The cost of indexes", x: "Indexes speed reads but every index must be updated on every write that touches its columns.",
        pros: ["Fast lookups, ranges, sorting and joins", "Unique indexes enforce constraints (e.g. unique email)"],
        cons: ["Slower inserts, updates and deletes", "Extra storage (sometimes larger than the table)", "More memory pressure for the buffer pool", "Unused indexes are pure cost"],
        p: ["Index for your real top queries; check with EXPLAIN", "Low-selectivity columns (e.g. boolean flags) rarely benefit alone"],
        m: "flowchart LR\n  W[\"INSERT row\"] --> T[\"Table\"]\n  W --> I1[\"Index 1\"]:::s1\n  W --> I2[\"Index 2\"]:::s1\n  W --> I3[\"Index 3\"]:::s1" },
      { t: "Reading query plans", x: "EXPLAIN shows how the database will run a query. It's how you verify an index is used.",
        p: ["Look for index scans/seeks vs sequential (full) scans", "Check estimated vs actual rows (EXPLAIN ANALYZE in PostgreSQL)", "Watch for sorts and temporary tables that an index could avoid", "Functions on columns (WHERE LOWER(email) = …) can stop index use unless you index the expression"],
        m: "flowchart LR\n  SQL[\"Query\"] --> OPT[\"Query optimizer\"]:::s0 --> PLAN[\"Plan: Index Scan on idx_email\"]:::s2\n  OPT -.-> BAD[\"Seq Scan on users\"]:::bad" },
      { t: "Specialised indexes", x: "Some data needs index structures beyond B-trees.",
        table: [["Index", "For", "Examples"], ["Inverted index", "Full-text search: term → documents", "Elasticsearch, PostgreSQL GIN"], ["Geospatial", "Points near a location, inside a region", "Geohash, quadtree, R-tree, S2 cells; PostGIS"], ["Bitmap", "Low-cardinality columns in analytics", "Data warehouses"], ["Trie", "Prefix lookups for autocomplete", "Typeahead services"]],
        p: ["Geohash: encodes latitude/longitude into a string; nearby points share prefixes (mostly)", "Quadtree: recursively splits space into four until each cell has few points"],
        m: "flowchart TB\n  W[\"World\"]:::s0 --> Q1[\"NW\"]\n  W --> Q2[\"NE\"]\n  W --> Q3[\"SW\"]\n  W --> Q4[\"SE (dense)\"]:::s1\n  Q4 --> Q41[\"NW\"]\n  Q4 --> Q42[\"NE\"]\n  Q4 --> Q43[\"SW\"]\n  Q4 --> Q44[\"SE\"]" },
      { t: "Indexing in interviews", x: "When you sketch a data model, name the indexes that serve the main queries.",
        p: ["'Primary key on short_code; it's the only lookup on the hot path.'", "'Composite index (user_id, created_at DESC) for a user's latest orders, covering status.'", "'Geohash index for nearby search' or 'inverted index in Elasticsearch for text search'", "Mention the write cost for write-heavy tables", "For NoSQL: the partition and sort keys are your index design"],
        m: "flowchart LR\n  Q[\"Top queries\"]:::s0 --> I[\"Indexes that serve them\"]:::s2 --> C[\"Write and storage cost\"]:::s1" }
    ],
    widget: { heading: "Index explorer", caption: "Two small models: how much a B-tree saves, and how the leftmost-prefix rule decides index use.", render: widget },
    examples: [
      ["MySQL InnoDB", "Stores table rows in a clustered B+tree ordered by primary key; secondary indexes store the primary key, so they need a second lookup unless covering."],
      ["PostgreSQL index types", "Offers B-tree (default), Hash, GIN (full text, arrays, JSONB), GiST and SP-GiST (geometric data), and BRIN for very large naturally ordered tables."],
      ["Google Bigtable and LSM trees", "The Bigtable paper (OSDI 2006) describes memtables, SSTables and compactions, the design later used by HBase, Cassandra and LevelDB."],
      ["Redis geospatial", "Redis GEO commands store locations in a sorted set using geohash-encoded scores, enabling radius searches."]
    ],
    pitfalls: [
      "Indexing every column 'just in case', slowing all writes",
      "Wrong column order in composite indexes",
      "Wrapping indexed columns in functions so the index can't be used",
      "Forgetting indexes in the data model entirely",
      "Assuming hash indexes support range queries",
      "Ignoring that LSM stores trade read cost and compaction for fast writes"
    ],
    quiz: [
      ["Why are B-trees only a few levels deep even for billions of rows?", ["They store one key per node", "High fan-out: each page holds hundreds of keys", "They use hashing", "They are kept in memory only"], 1, "With hundreds of children per node, log base ~hundreds of a billion is about 4."],
      ["Which query can NOT use INDEX (country, city) to seek?", ["WHERE country = 'IN'", "WHERE country = 'IN' AND city = 'Pune'", "WHERE city = 'Pune'", "WHERE country = 'IN' ORDER BY city"], 2, "It skips the leftmost column, so there's no prefix to seek on."],
      ["Which index type can't answer range queries?", ["B-tree", "Hash", "Clustered B+tree", "Composite B-tree"], 1, "Hashing destroys ordering, so only equality lookups work."],
      ["What makes LSM trees fast for writes?", ["They update rows in place", "Writes go to memory and are flushed as sequential, immutable files", "They skip durability", "They have no indexes"], 1, "Memtable + WAL, then sequential SSTable flushes avoid random in-place updates."],
      ["What is a covering index?", ["An index on every column", "An index that contains all columns a query needs, so the table isn't read", "A clustered index", "An index with no duplicates"], 1, "Index-only scans skip the extra table lookup."],
      ["What is the main cost of adding many indexes?", ["Slower reads", "Slower writes and more storage", "Lost transactions", "Less consistency"], 1, "Each write must update every relevant index."],
      ["Which structure suits 'find restaurants within 2 km'?", ["Hash index", "Geospatial index such as geohash or quadtree", "Bitmap index", "Inverted index"], 1, "Geospatial indexes group nearby points so radius searches touch few cells."],
      ["In LSM-based stores, what helps avoid reading SSTables that can't contain a key?", ["Bloom filters", "Foreign keys", "Covering indexes", "Triggers"], 0, "A Bloom filter per SSTable says 'definitely not here' or 'maybe here'."]
    ],
    practice: {
      q: "An orders table has 500 million rows. The app needs: (1) a user's 20 most recent orders, (2) all orders in a given status created today (for an ops dashboard), (3) lookup by order_id. Writes are 2,000/s. Which indexes do you create and what are the trade-offs?",
      a: [
        ["Primary key", "order_id as primary key (clustered in InnoDB) serves lookups by id."],
        ["Recent orders per user", "Composite index (user_id, created_at DESC); make it covering by including the few listed columns (status, total) so the list page avoids table lookups."],
        ["Ops dashboard", "Index (status, created_at): equality on status first, then the range on created_at. Low-cardinality status alone would be weak."],
        ["Check with EXPLAIN", "Verify both list queries use index range scans with LIMIT and no extra sort."],
        ["Write cost", "Three indexes on 2,000 writes/s is fine for a well-sized primary, but avoid more; monitor index size and buffer-pool hit rate."],
        ["Alternatives at larger scale", "Serve the dashboard from a replica or an analytics store; shard by user_id if writes grow, which keeps 'orders by user' on one shard."]
      ]
    },
    recap: [
      "Indexes are sorted side structures that turn full scans into a few page reads.",
      "B-trees: default, support ranges; hash: equality only; LSM: write-optimised.",
      "Composite indexes follow the leftmost-prefix rule: equality columns first.",
      "Covering indexes avoid table lookups; every index slows writes.",
      "Special data needs special indexes: inverted (text), geospatial, tries."
    ]
  });
})();
