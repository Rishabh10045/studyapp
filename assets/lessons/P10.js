/* Lesson P10: Twitter / X */
(function () {
  "use strict";
  var H = window.HLD;
  var TAGS = [["#GoodMorning", 9000], ["#Cricket", 6000], ["#Bollywood", 4000], ["#Monday", 3500], ["#Tech", 3000], ["#Earthquake", 40], ["#NewPhoneLaunch", 300], ["#Budget2026", 150]];

  function widget(el, ctx) {
    var s = ctx.state; if (!s.spike) { s.spike = 50; s.launch = 4; s.rank = "spike"; }
    el.innerHTML = "<div class='grid2'><label class='field'>#Earthquake mentions this hour vs normal: <strong data-v='spike' style='color:var(--text)'></strong><input type='range' min='1' max='200' data-k='spike'></label>" +
      "<label class='field'>#NewPhoneLaunch growth: <strong data-v='launch' style='color:var(--text)'></strong><input type='range' min='1' max='20' data-k='launch'></label></div>" +
      "<div class='seg' data-r='rank'><button data-m='raw'>Rank by raw count</button><button data-m='spike'>Rank by spike score</button></div>" +
      "<div class='tablewrap'><table><thead><tr><th>#</th><th>Hashtag</th><th>Normal / hour</th><th>This hour</th><th>Spike score</th></tr></thead><tbody data-r='tb'></tbody></table></div>" +
      "<p class='caption'>Spike score = (current − expected) ÷ √(expected + 1): a simple z-score-like measure, labelled as a teaching model. Real trend systems also use velocity, unique users, location, spam filtering and personalisation.</p>";
    function draw() {
      ["spike", "launch"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; el.querySelector("[data-v='" + k + "']").textContent = s[k] + "×"; });
      el.querySelectorAll("[data-m]").forEach(function (b) { b.className = b.getAttribute("data-m") === s.rank ? "active" : ""; });
      var rows = TAGS.map(function (t, i) { var mult = t[0] === "#Earthquake" ? s.spike : t[0] === "#NewPhoneLaunch" ? s.launch : 0.9 + (i % 3) * 0.1; var cur = Math.round(t[1] * mult); return [t[0], t[1], cur, (cur - t[1]) / Math.sqrt(t[1] + 1)]; });
      rows.sort(function (a, b) { return s.rank === "raw" ? b[2] - a[2] : b[3] - a[3]; });
      el.querySelector("[data-r='tb']").innerHTML = rows.map(function (r, i) { return "<tr" + (i < 3 ? " style='font-weight:600'" : "") + "><td>" + (i + 1) + "</td><td>" + r[0] + "</td><td>" + r[1].toLocaleString() + "</td><td>" + r[2].toLocaleString() + "</td><td>" + r[3].toFixed(1) + "</td></tr>"; }).join("");
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    el.querySelector("[data-r='rank']").addEventListener("click", function (e) { var m = e.target.getAttribute("data-m"); if (m) { s.rank = m; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P10",
    summary: "Design Twitter/X: tweets, follows, home and user timelines at huge read volume, Snowflake IDs, hybrid fan-out, tweet search via an inverted index, trending topics from streams, and the trade-offs of each.",
    slides: [
      { t: "1. Requirements", x: "Twitter is the feed problem (P08) plus search and trends.",
        p: ["Functional: post tweets (280 chars, media); follow; home timeline; user timeline; search tweets; trending topics; likes/retweets", "Non-functional: very read-heavy; home timeline fast (< ~200 ms); tweets visible to followers within seconds; highly available; eventual consistency OK", "Ask about: celebrity accounts, edits, DMs (out of scope)"],
        m: "flowchart LR\n  T[\"Tweet\"] --> HT[\"Home timelines\"]:::s0\n  T --> UT[\"User timeline\"]:::s0\n  T --> SR[\"Search index\"]:::s1\n  T --> TR[\"Trends\"]:::s2" },
      { t: "2. Estimates", x: "Example: 250 M DAU.",
        table: [["Quantity", "Estimate"], ["Tweets", "~500 M/day ≈ 6k/s avg, spikes 3–5× during events"], ["Home timeline reads", "250 M × 20 = 5 B/day ≈ 58k/s, peaks well beyond"], ["Fan-out (200 avg followers)", "500 M × 200 = 100 B timeline inserts/day ≈ 1.2 M/s"], ["Tweet storage", "500 M × ~300 B ≈ 150 GB/day text + metadata (media separate)"]],
        m: "flowchart LR\n  W[\"6k tweets/s\"]:::s1 --> FO[\"× followers\"] --> I[\"~1.2M timeline inserts/s\"]:::s0\n  R[\"~58k+ timeline reads/s\"]:::s2" },
      { t: "3. API", x: "Core endpoints.",
        p: ["POST /2/tweets {text, media_ids, reply_to?} → {id}", "GET /2/timeline/home?cursor=…&limit=50", "GET /2/users/{id}/tweets?cursor=…", "GET /2/search?q=…&cursor=…", "GET /2/trends?location=…", "POST /2/users/{id}/following, POST /2/tweets/{id}/like"],
        m: "sequenceDiagram\n  participant C as Client\n  participant A as API\n  C->>A: POST /2/tweets {text}\n  A-->>C: 201 {id: 1854…(Snowflake)}\n  C->>A: GET /2/timeline/home\n  A-->>C: tweets + cursor" },
      { t: "4. Data model", x: "Tweets are immutable-ish records keyed by time-sortable IDs.",
        table: [["Store", "Key → value"], ["Tweets", "tweet_id (Snowflake) → author, text, media, reply/retweet refs, created_at"], ["User timeline", "user_id → tweet ids (newest first)"], ["Home timeline cache", "user_id → ~800 recent tweet ids (Redis)"], ["Social graph", "user_id → followers / following"], ["Engagement", "tweet_id → like/retweet counts; (user, tweet) likes"]],
        p: ["Snowflake IDs (F25) sort by time, so 'newest first' = sort by id"],
        m: "flowchart LR\n  ID[\"Snowflake id = time + machine + seq\"]:::s1 --> TW[(\"tweets\")]:::s0\n  TW --> UT[(\"user timelines\")]\n  TW --> HT[(\"home timeline cache\")]:::s2" },
      { t: "5. High-level architecture", x: "Write path fans out; read path assembles; search and trends consume the same stream.",
        m: "flowchart LR\n  C[\"Clients\"] --> API[\"API\"]\n  API --> TS[\"Tweet service\"]:::s0 --> TDB[(\"Tweet store\")]\n  TS --> K[(\"Kafka: tweets\")]:::s1\n  K --> FO[\"Fan-out service\"]:::s0 --> HT[(\"Home timelines (Redis)\")]:::s2\n  K --> IX[\"Search indexer\"] --> ES[(\"Search index\")]\n  K --> TRD[\"Trend counter (stream)\"] --> TRS[(\"Trends\")]\n  API --> TLS[\"Timeline service\"]:::s0 --> HT\n  TLS --> TDB" },
      { t: "6. Deep dive: timelines and fan-out", x: "Same hybrid approach as P08, tuned for Twitter.",
        p: ["On tweet: look up followers, insert tweet id into each active follower's home timeline (capped list in Redis, replicated)", "Accounts with millions of followers: don't fan out; merge their recent tweets at read time", "Inactive users: no fan-out; rebuild on login", "Timeline read: ids from Redis + celebrity merges → hydrate tweets (multi-get) → filter → (rank)"],
        m: "flowchart LR\n  TW[\"tweet\"] --> Q{\"author followers > threshold?\"}\n  Q -->|\"no\"| PUSH[\"push id to followers' timelines\"]:::s0\n  Q -->|\"yes\"| PULL[\"store only; merge on read\"]:::s2" },
      { t: "7. Deep dive: search", x: "Recent tweets must be searchable within seconds.",
        p: ["Inverted index (F15) sharded by time (recent index in memory) and by document", "Indexer consumes the tweet stream: tokenize, normalize, add to in-memory segments", "Query: scatter to shards (recent first), merge top results by relevance + recency + engagement", "Twitter built Earlybird, a real-time Lucene-based search engine, for this"],
        m: "flowchart LR\n  K[(\"tweet stream\")] --> IX[\"Indexer\"]:::s1 --> RT[\"Real-time index (last days, in RAM)\"]:::s0\n  IX --> AR[\"Archive index (older)\"]\n  Q[\"query\"] --> BR[\"Broker: scatter-gather\"]:::s2 --> RT\n  BR --> AR" },
      { t: "8. Deep dive: trending topics", x: "What is unusually popular right now, not what is always popular.",
        p: ["Stream processor counts hashtags/phrases per location in sliding windows (e.g. 5–15 min)", "Compare against an expected baseline → spike score; require many unique users", "Count-Min Sketch + heap (F26) to find heavy hitters in bounded memory", "Filter spam/bots and unsafe terms; personalise by location and interests"],
        m: "flowchart LR\n  S[(\"tweets\")] --> EX[\"extract hashtags\"] --> CW[\"windowed counts (Count-Min)\"]:::s1 --> SC[\"spike vs baseline\"]:::s0 --> FL[\"spam/safety filter\"] --> TOP[\"top trends per region\"]:::s2" },
      { t: "9. Bottlenecks and trade-offs", x: "Discussion points.",
        p: ["Big events (e.g. a final) → tweet bursts: queues absorb fan-out lag; prioritize timelines of active users", "Celebrity tweets → pull-merge; hot tweet hydration via cache replicas", "Memory for timelines → cap lengths, ids only", "Consistency: author sees own tweet immediately; others within seconds", "Engagement counts approximate and eventually consistent"],
        m: "flowchart LR\n  EV[\"Event spike\"]:::bad --> Q[(\"queue absorbs\")]:::s1 --> FO[\"fan-out catches up\"]:::s0" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Snowflake ids; tweet store + user timelines + Redis home timelines", "Hybrid fan-out via Kafka; celebrities merged on read", "Search: real-time inverted index fed by the stream, scatter-gather queries", "Trends: windowed streaming counts vs baseline with spam filtering", "Cache-heavy read path; eventual consistency with read-your-writes"],
        m: "flowchart LR\n  TW[\"Tweet\"] --> K[(\"Kafka\")]:::s1\n  K --> TL[\"Timelines\"]:::s0\n  K --> SE[\"Search\"]:::s2\n  K --> TR[\"Trends\"]:::s2" }
    ],
    widget: { heading: "Trending topic detector", caption: "Spike an event and compare ranking by raw counts vs by how unusual the count is.", render: widget },
    examples: [
      ["Snowflake", "Twitter announced Snowflake in 2010 to generate time-sortable 64-bit tweet IDs across many machines."],
      ["Earlybird", "Twitter's 2012 paper described Earlybird, a real-time search system built on Lucene with in-memory indexes."],
      ["Timelines in Redis", "Twitter engineers described storing home timelines as lists of tweet ids in a large Redis-based cache cluster."],
      ["Fail Whale", "Early Twitter's frequent overload page became a symbol of scaling pains before its move from a Rails monolith to JVM services."]
    ],
    pitfalls: [
      "Pure fan-out on write for accounts with tens of millions of followers",
      "Ranking trends by raw counts (always-popular tags win)",
      "Searching tweets with SQL LIKE",
      "Hydrating tweets one by one instead of multi-get",
      "Ignoring burst traffic during live events",
      "Storing full tweets in every home timeline"
    ],
    quiz: [
      ["Why Snowflake IDs for tweets?", ["Random and unguessable", "Unique without coordination and sortable by time", "Shorter than 32 bits", "Encrypted"], 1, "Newest-first = sort by id."],
      ["How are celebrity tweets delivered in a hybrid model?", ["Pushed to every follower", "Merged into timelines at read time", "Emailed", "Dropped"], 1, "Avoids millions of writes per tweet."],
      ["What makes a hashtag 'trending'?", ["Highest all-time count", "Unusual increase vs its expected baseline, by many users", "Longest hashtag", "Most likes"], 1, "Spike, not raw volume."],
      ["Which structure finds heavy hitters in a stream with bounded memory?", ["B-tree", "Count-Min Sketch + heap", "Bloom filter", "Trie"], 1, "Approximate counts, top-k via heap."],
      ["Tweet search index is usually partitioned by…", ["Author name alphabetically", "Time (recent in memory) and documents", "Hashtag only", "Country"], 1, "Most queries want recent tweets."],
      ["500 M tweets/day is about…", ["600/s", "6,000/s", "60,000/s", "600,000/s"], 1, "5 × 10⁸ ÷ 86,400 ≈ 5.8k."],
      ["During a World Cup final, tweets spike 5×. Fan-out lags. Reasonable handling?", ["Drop tweets", "Queue absorbs; prioritise active users; celebrities pulled", "Disable timelines", "Synchronous fan-out"], 1, "Graceful degradation."],
      ["Home timeline cache stores…", ["Full tweets", "Capped lists of tweet ids", "Images", "Search results"], 1, "Hydrate at read time."]
    ],
    practice: {
      q: "Add tweet editing (within 30 minutes) and make sure timelines, search and retweets show the latest version.",
      a: [
        ["Model", "Keep tweet_id stable; store versions (tweet_id, version, text, edited_at); the tweet record points to the current version; edits allowed if now − created_at < 30 min."],
        ["Timelines", "Timelines hold ids only, so hydration automatically shows the latest version; bump cache entries for the tweet object on edit."],
        ["Search", "Emit TweetEdited to Kafka; indexer updates the document (delete + reindex)."],
        ["Retweets/quotes", "Reference tweet_id, so they show the latest; quotes may show an 'edited' label and link to history."],
        ["Caches", "Invalidate the tweet in the hydration cache and CDN-cached embeds."],
        ["Trade-offs", "Brief staleness in caches/search; edit history storage; abuse (editing after going viral) limited by the 30-minute window and visible history."]
      ]
    },
    recap: [
      "Twitter = feed + search + trends at very high read volume.",
      "Snowflake ids, Redis home timelines of ids, hybrid fan-out via Kafka.",
      "Search: real-time inverted index fed by the tweet stream.",
      "Trends: windowed counts vs baseline, many unique users, spam filters.",
      "Absorb event spikes with queues; cache-heavy hydration."
    ]
  });
})();
