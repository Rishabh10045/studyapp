/* Lesson F15: Search & indexing basics */
(function () {
  "use strict";
  var H = window.HLD;
  var DOCS = [
    "Cheap flights to Goa in December",
    "Goa beach hotels with pool",
    "Best hotels in Mumbai near the airport",
    "Cheap hotels in Goa near the beach",
    "Mumbai to Goa train tickets",
    "Flights from Mumbai to Delhi"
  ];
  var STOP = { "to": 1, "in": 1, "the": 1, "with": 1, "from": 1, "near": 1, "a": 1, "of": 1 };
  function tok(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(function (w) { return w && !STOP[w]; }).map(function (w) { return w.length > 3 && /s$/.test(w) ? w.slice(0, -1) : w; }); }

  function widget(el, ctx) {
    var s = ctx.state; if (s.q == null) { s.q = "cheap goa hotels"; s.mode = "and"; }
    var idx = {};
    DOCS.forEach(function (d, i) { tok(d).forEach(function (w) { (idx[w] = idx[w] || {}); idx[w][i] = (idx[w][i] || 0) + 1; }); });
    el.innerHTML = "<label class='field'>Search query<input type='text' data-r='q' style='width:100%'></label>" +
      "<div class='seg' data-r='mode'><button data-m='and'>AND (all terms)</button><button data-m='or'>OR (any term, ranked)</button></div>" +
      "<div class='grid2'><div class='card'><strong>Inverted index lookups</strong><div class='rows' data-r='post'></div></div><div class='card'><strong>Results</strong><div class='rows' data-r='res'></div></div></div>" +
      "<p class='caption'>Analyzer here: lowercase, drop stop words, crude plural stripping (hotels → hotel). Score = sum of idf = log(N / df) per matched term: a simplified TF-IDF, not BM25.</p>";
    var qi = el.querySelector("[data-r='q']"); qi.value = s.q;
    function draw() {
      el.querySelectorAll("[data-m]").forEach(function (b) { b.className = b.getAttribute("data-m") === s.mode ? "active" : ""; });
      var terms = tok(s.q).filter(function (t, i, a) { return a.indexOf(t) === i; });
      el.querySelector("[data-r='post']").innerHTML = terms.length ? terms.map(function (t) {
        var p = idx[t] ? Object.keys(idx[t]).map(function (d) { return "D" + (+d + 1); }) : [];
        return "<div class='row'><span class='t'><code>" + ctx.esc(t) + "</code></span><span class='dt'>" + (p.length ? p.join(", ") : "no postings") + "</span></div>";
      }).join("") : "<p class='caption'>Type some words.</p>";
      var N = DOCS.length, scores = [];
      DOCS.forEach(function (d, i) {
        var matched = terms.filter(function (t) { return idx[t] && idx[t][i]; });
        if (!matched.length || (s.mode === "and" && matched.length < terms.length)) return;
        var sc = matched.reduce(function (a, t) { return a + Math.log(N / Object.keys(idx[t]).length); }, 0);
        scores.push([i, sc]);
      });
      scores.sort(function (a, b) { return b[1] - a[1]; });
      el.querySelector("[data-r='res']").innerHTML = scores.length ? scores.map(function (r) {
        return "<div class='row'><span class='t'>D" + (r[0] + 1) + ": " + ctx.esc(DOCS[r[0]]) + "</span><span class='dt'>score " + r[1].toFixed(2) + "</span></div>";
      }).join("") : "<p class='caption'>No documents match.</p>";
    }
    qi.addEventListener("input", function () { s.q = qi.value; ctx.save(); draw(); });
    el.querySelector("[data-r='mode']").addEventListener("click", function (e) { var m = e.target.getAttribute("data-m"); if (m) { s.mode = m; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "F15",
    summary: "How search engines find documents fast: the inverted index, text analysis, relevance ranking with TF-IDF and BM25, sharding an index, and keeping a search index in sync with the primary database.",
    slides: [
      { t: "Why LIKE '%term%' doesn't scale", x: "A database scan checks every row. With millions of documents and many queries per second, full-text search needs a different data structure.",
        p: ["`WHERE body LIKE '%goa%'` can't use a normal B-tree index (leading wildcard)", "No relevance ranking, no stemming, no typo tolerance", "Search engines precompute an inverted index instead", "Databases have full-text features too (PostgreSQL tsvector + GIN) for moderate needs"],
        m: "flowchart LR\n  Q[\"query: goa\"] --> SCAN[\"Scan all N rows\"]:::bad --> R[\"Slow: O(N) per query\"]\n  Q --> II[\"Inverted index lookup\"]:::s2 --> R2[\"Fast: read postings for 'goa'\"]" },
      { t: "The inverted index", x: "Map each term to the list of documents that contain it (a postings list), like the index at the back of a book.",
        table: [["Term", "Postings (doc ids)"], ["goa", "1, 2, 4, 5"], ["hotel", "2, 3, 4"], ["cheap", "1, 4"], ["mumbai", "3, 5, 6"]],
        p: ["Postings are sorted, so AND = intersect lists, OR = merge lists", "Postings can also store positions (for phrase queries) and term frequency", "Lists are compressed (e.g. delta + variable-byte encoding)"],
        m: "flowchart LR\n  D1[\"D1: Cheap flights to Goa\"] --> IX[\"Indexer\"]:::s0\n  D4[\"D4: Cheap hotels in Goa\"] --> IX\n  IX --> T1[\"cheap → 1, 4\"]:::s2\n  IX --> T2[\"goa → 1, 4\"]:::s2\n  IX --> T3[\"hotel → 4\"]:::s2" },
      { t: "Text analysis", x: "Before indexing (and at query time) text passes through an analyzer, so 'Hotels' and 'hotel' match.",
        p: ["Tokenize: split into words", "Normalize: lowercase, strip accents", "Stop words: optionally drop very common words", "Stemming/lemmatization: running → run", "Synonyms, n-grams for partial matching, language-specific analyzers", "Use the same analyzer for indexing and querying"],
        m: "flowchart LR\n  A[\"'Cheap Hotels in GOA!'\"] --> T[\"Tokenize\"] --> L[\"Lowercase\"] --> S[\"Drop stop words\"] --> ST[\"Stem\"] --> O[\"cheap, hotel, goa\"]:::s2" },
      { t: "Relevance: TF-IDF and BM25", x: "Matching docs must be ranked. Classic scores reward terms that appear often in the document but rarely in the collection.",
        p: ["TF (term frequency): more occurrences in a doc → more relevant", "IDF (inverse document frequency): rare terms matter more than common ones", "BM25 refines TF-IDF with term-frequency saturation and document-length normalization", "BM25 is the default similarity in Elasticsearch and Lucene", "Real systems add signals: freshness, popularity, personalization, learning-to-rank"],
        m: "flowchart LR\n  TF[\"TF: how often in this doc\"]:::s0 --> SC[\"Score\"]:::s2\n  IDF[\"IDF: how rare overall\"]:::s1 --> SC\n  LEN[\"Doc length normalization (BM25)\"] --> SC\n  SC --> RK[\"Ranked results\"]" },
      { t: "Search engines: Lucene, Elasticsearch, OpenSearch, Solr", x: "Most production search builds on Apache Lucene, a library implementing the inverted index, analyzers and scoring.",
        p: ["Elasticsearch / OpenSearch and Solr wrap Lucene as distributed servers", "Lucene writes immutable segments and merges them in the background", "New documents become searchable after a refresh (Elasticsearch default: 1 second) → near real-time", "Also: aggregations/facets, geo queries, autocomplete"],
        m: "flowchart LR\n  W[\"Writes\"] --> BUF[\"In-memory buffer\"] -->|\"refresh ~1s\"| SEG[\"New immutable segment\"]:::s0\n  SEG --> MRG[\"Background merge\"]:::s1 --> BIG[\"Larger segments\"]\n  Q[\"Query\"] --> SEG\n  Q --> BIG" },
      { t: "Sharding and replicas", x: "An index is split into shards spread across nodes; each shard can have replicas for availability and read throughput.",
        p: ["Document-partitioned: each shard holds a subset of docs with its own local index", "Query: scatter to all shards, each returns its top-k, coordinator gathers and merges", "Replicas serve reads and take over if a primary fails", "Too many small shards wastes overhead; too few limits parallelism"],
        m: "flowchart TB\n  Q[\"Query\"] --> CO[\"Coordinator\"]:::s0\n  CO --> S1[\"Shard 1: top 10\"]:::s2\n  CO --> S2[\"Shard 2: top 10\"]:::s2\n  CO --> S3[\"Shard 3: top 10\"]:::s2\n  S1 --> M[\"Merge → global top 10\"]:::s1\n  S2 --> M\n  S3 --> M" },
      { t: "Keeping the index in sync", x: "The search index is usually a secondary, derived copy. The database stays the source of truth.",
        p: ["Dual writes from the app are simple but can drift if one write fails", "Better: change data capture (CDC) from the database log, e.g. Debezium → Kafka → indexer", "Or an outbox table read by an indexing worker", "Accept eventual consistency: results lag writes by seconds", "Be able to rebuild the index from the source of truth"],
        m: "flowchart LR\n  APP[\"App\"] --> DB[\"Primary DB (source of truth)\"]:::s0\n  DB -->|\"change log (CDC)\"| K[\"Kafka\"]:::s1 --> IW[\"Indexer\"] --> ES[\"Search index\"]:::s2\n  U[\"Search API\"] --> ES" },
      { t: "Beyond keywords: vector search", x: "Semantic search embeds text into vectors and finds nearest neighbours, so 'beach stay' can match 'seaside hotel'.",
        p: ["Approximate nearest neighbour (ANN) indexes such as HNSW trade a little recall for speed", "Hybrid search combines BM25 and vector scores", "Used for recommendations, image search, retrieval for LLM apps", "Keyword search is still better for exact terms, codes and names"],
        m: "flowchart LR\n  Q[\"'beach stay'\"] --> EMB[\"Embedding model\"]:::s0 --> V[\"Query vector\"]\n  V --> ANN[\"ANN index (e.g. HNSW)\"]:::s2 --> NN[\"Nearest docs\"]\n  Q --> BM[\"BM25\"]:::s1 --> H[\"Hybrid merge\"]\n  NN --> H" },
      { t: "Search in interviews", x: "When a design needs 'search tweets/products/listings', add a search service fed asynchronously.",
        p: ["'Elasticsearch cluster, documents sharded by id, 1 replica per shard.'", "'Index updates via CDC/Kafka; results are eventually consistent, typically within seconds.'", "'Scatter-gather query, top-k per shard, merge at the coordinator.'", "'Rank by BM25 plus recency and popularity.'", "Mention rebuilding the index and monitoring indexing lag"],
        m: "flowchart LR\n  C[\"Client\"] --> API[\"Search API\"] --> ES[\"Search cluster\"]:::s2\n  W[\"Write path\"] --> DB[\"DB\"]:::s0 --> K[\"Kafka\"]:::s1 --> IX[\"Indexer\"] --> ES" }
    ],
    widget: { heading: "Build an inverted index", caption: "Six tiny documents are indexed. Type a query to see postings lookups, AND vs OR, and a simplified relevance score.", render: widget },
    examples: [
      ["Wikipedia", "Wikipedia's on-site search runs on CirrusSearch, built on Elasticsearch (and moving to OpenSearch)."],
      ["GitHub code search", "GitHub built its own engine, Blackbird, in Rust, described in 2023; it indexes code with n-gram style indexing rather than plain word tokens."],
      ["Lucene everywhere", "Apache Lucene, started by Doug Cutting in 1999, powers Elasticsearch, OpenSearch and Solr."],
      ["E-commerce", "Product search typically combines keyword relevance with facets (brand, price) and business signals like sales and stock."]
    ],
    pitfalls: [
      "Using the search index as the source of truth",
      "Dual-writing to DB and index without a plan for drift",
      "Forgetting that new documents appear only after refresh (near real-time, not instant)",
      "Different analyzers at index and query time",
      "Ignoring scatter-gather cost: every query hits every shard",
      "Deep pagination (page 1000) is expensive; use search-after/cursors"
    ],
    quiz: [
      ["What does an inverted index map?", ["Document → words", "Term → list of documents containing it", "User → queries", "Shard → node"], 1, "That's what makes keyword lookup fast."],
      ["How is an AND query of two terms evaluated?", ["Union of postings lists", "Intersection of the two sorted postings lists", "Scan all docs", "Random sampling"], 1, "Sorted postings allow efficient intersection."],
      ["Why does IDF matter in ranking?", ["Rare terms are more informative than common ones", "It counts document length", "It measures freshness", "It speeds up indexing"], 0, "Matching 'goa' says more than matching 'the'."],
      ["What does BM25 add over basic TF-IDF?", ["Encryption", "Term-frequency saturation and document-length normalization", "Vector embeddings", "Sharding"], 1, "Repeating a term 100 times shouldn't give 100× the score, and long docs are normalized."],
      ["How does a sharded search query usually run?", ["Only the first shard is asked", "Scatter to all shards, each returns top-k, coordinator merges", "Shards are queried one by one until a hit", "Clients query each node directly"], 1, "Document-partitioned indexes need scatter-gather."],
      ["Best way to keep the search index updated from a database?", ["Rebuild by hand monthly", "Change data capture or an outbox feeding an indexer", "Let users write to the index", "Index only on reads"], 1, "CDC/outbox avoids lost updates from failed dual writes."],
      ["Elasticsearch documents become searchable…", ["Instantly on write, always", "After a refresh (default about 1 second)", "Only after a nightly batch", "Only after a merge"], 1, "Near real-time search via periodic refresh."],
      ["When is keyword (BM25) search better than vector search?", ["Never", "For exact terms like product codes, names and IDs", "For finding synonyms", "For images"], 1, "Embeddings can blur exact tokens; hybrid search combines both."]
    ],
    practice: {
      q: "Design search for an e-commerce site with 50 million products: keyword search with filters (brand, price, rating), results under 200 ms, and price/stock changes visible within a minute.",
      a: [
        ["Source of truth", "Product catalog in a relational DB; inventory/pricing services own their data."],
        ["Index", "Elasticsearch/OpenSearch index of product docs: title, description (analyzed), brand, category (keyword), price, rating, in_stock. ~50M docs → e.g. 10–20 primary shards, 1–2 replicas."],
        ["Sync", "CDC (Debezium) from catalog/pricing DBs → Kafka → indexer that does partial updates; target lag under a minute; full reindex job via alias swap."],
        ["Query", "BM25 on text fields + filters on keyword/numeric fields (cheap, cacheable) + facet aggregations; boost by popularity and in-stock."],
        ["Latency", "Scatter-gather over shards, request caching for popular queries, search-after for pagination, timeouts with partial results."],
        ["Extras", "Autocomplete via a separate prefix index; synonyms and spelling correction; optional hybrid vector search for semantic queries."],
        ["Trade-offs", "Eventual consistency between DB and index; more shards = more parallelism but more overhead per query."]
      ]
    },
    recap: [
      "An inverted index maps terms to sorted postings lists; AND = intersect.",
      "Analyzers normalize text the same way at index and query time.",
      "TF-IDF / BM25 rank by term frequency, rarity and document length.",
      "Sharded indexes answer queries by scatter-gather and merging top-k.",
      "The DB is the source of truth; feed the index via CDC and accept seconds of lag."
    ]
  });
})();
