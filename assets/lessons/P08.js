/* Lesson P08: News feed */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.mode) { s.mode = "hybrid"; s.dau = 100; s.fol = 200; s.cf = 5; s.celebFol = 5; s.reads = 20; }
    var F = [["dau", "Daily active users (M)", 10, 500, 10], ["fol", "Avg accounts followed", 20, 1000, 10], ["cf", "Celebrities followed per user", 0, 50, 1], ["celebFol", "Followers per celebrity (M)", 1, 100, 1], ["reads", "Feed loads per user/day", 1, 100, 1]];
    el.innerHTML = "<div class='seg' data-r='mode'><button data-m='push'>Fan-out on write (push)</button><button data-m='pull'>Fan-out on read (pull)</button><button data-m='hybrid'>Hybrid</button></div>" +
      "<div class='grid3'>" + F.map(function (f) { return "<label class='field'>" + f[1] + ": <strong data-v='" + f[0] + "' style='color:var(--text)'></strong><input type='range' min='" + f[2] + "' max='" + f[3] + "' step='" + f[4] + "' data-k='" + f[0] + "'></label>"; }).join("") + "</div>" +
      "<div class='metrics' data-r='m'></div><p class='caption' data-r='note'></p><p class='caption'>Assumptions: each user posts 0.5 times/day; 10,000 celebrities each post 5 times/day; celebrities follow nobody special. Order-of-magnitude model only.</p>";
    function f(n) { return n >= 1e12 ? (n / 1e12).toFixed(1) + " T" : n >= 1e9 ? (n / 1e9).toFixed(1) + " B" : n >= 1e6 ? (n / 1e6).toFixed(1) + " M" : n >= 1e3 ? (n / 1e3).toFixed(1) + " K" : n.toFixed(0); }
    function draw() {
      el.querySelectorAll("[data-m]").forEach(function (b) { b.className = b.getAttribute("data-m") === s.mode ? "active" : ""; });
      F.forEach(function (x) { el.querySelector("[data-k='" + x[0] + "']").value = s[x[0]]; el.querySelector("[data-v='" + x[0] + "']").textContent = s[x[0]]; });
      var U = s.dau * 1e6, normPosts = U * 0.5, celebPosts = 1e4 * 5, normFol = s.fol - s.cf;
      var pushW = normPosts * normFol + celebPosts * s.celebFol * 1e6, loads = U * s.reads;
      var w, r, worst, note;
      if (s.mode === "push") { w = pushW; r = 1; worst = s.celebFol * 1e6; note = "Reads are one cheap lookup of a precomputed feed, but every celebrity post triggers " + f(s.celebFol * 1e6) + " feed writes."; }
      else if (s.mode === "pull") { w = 0; r = s.fol; worst = s.fol; note = "Posting is cheap, but every feed load merges " + s.fol + " timelines — slow and expensive at " + f(loads / 86400) + " loads/s."; }
      else { w = normPosts * normFol; r = 1 + s.cf; worst = Math.max(normFol, 1 + s.cf); note = "Normal posts are pushed; celebrity posts are pulled and merged at read time (" + s.cf + " extra timeline reads per load)."; }
      el.querySelector("[data-r='m']").innerHTML = [[f(w / 86400) + "/s", "Feed-cache writes (fan-out)"], [f(loads / 86400) + "/s", "Feed loads"], [r, "Timelines read per load"], [f(loads * r / 86400) + "/s", "Timeline reads"], [f(worst), "Worst-case work for one action"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
      el.querySelector("[data-r='note']").textContent = note;
    }
    el.querySelector("[data-r='mode']").addEventListener("click", function (e) { var m = e.target.getAttribute("data-m"); if (m) { s.mode = m; ctx.save(); draw(); } });
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P08",
    summary: "Build a social news feed: requirements, estimates, APIs, data model, and the central trade-off — fan-out on write vs fan-out on read vs hybrid for celebrities — plus feed caches, ranking, pagination and media.",
    slides: [
      { t: "1. Requirements", x: "Scope the feed carefully.",
        p: ["Functional: create posts (text, media links); follow users; view a home feed of posts from followed accounts, newest or ranked; paginate (infinite scroll)", "Non-functional: feed loads fast (< ~200 ms p99 server-side); highly available; eventual consistency OK (a post may appear seconds later); read-heavy", "Out of scope (ask): comments, ads, notifications, search"],
        m: "flowchart LR\n  A[\"Alice posts\"] --> FS[\"Feed system\"]:::s0\n  FS --> B[\"Bob's feed\"]:::s2\n  FS --> C[\"Carol's feed\"]:::s2" },
      { t: "2. Estimates", x: "Example: 100 M DAU.",
        table: [["Quantity", "Estimate"], ["Posts", "0.5/user/day → 50 M/day ≈ 600/s"], ["Feed loads", "20/user/day → 2 B/day ≈ 23k/s, peak ~70k/s"], ["Fan-out (200 followers avg)", "50 M × 200 = 10 B feed inserts/day ≈ 115k/s"], ["Feed cache", "store ~500 post ids per active user: 100 M × 500 × 8 B ≈ 400 GB"]],
        m: "flowchart LR\n  P[\"600 posts/s\"]:::s1 --> FO[\"× 200 followers\"] --> W[\"115k feed writes/s\"]:::s0\n  R[\"23k–70k feed reads/s\"]:::s2" },
      { t: "3. API", x: "Core endpoints.",
        p: ["POST /v1/posts {text, media_ids[]} → 201 {post_id}", "POST /v1/users/{id}/follow, DELETE …/follow", "GET /v1/feed?cursor=…&limit=20 → {posts[], next_cursor} (cursor pagination, F17)", "Media uploaded separately via pre-signed URLs (F14)"],
        m: "sequenceDiagram\n  participant C as Client\n  participant A as API\n  C->>A: POST /v1/posts\n  A-->>C: 201 {post_id}\n  C->>A: GET /v1/feed?limit=20\n  A-->>C: posts + next_cursor" },
      { t: "4. Data model", x: "Separate stores for posts, the social graph and feeds.",
        table: [["Store", "Shape", "Tech"], ["Posts", "post_id (Snowflake), author_id, text, media, created_at", "Sharded SQL or wide-column, by post_id/author"], ["Follows", "follower_id → followee_id (both directions)", "Sharded SQL / graph store"], ["User timeline", "author_id → recent post ids", "Wide-column / Redis"], ["Home feed cache", "user_id → list of post ids (capped)", "Redis lists / sorted sets"]],
        m: "flowchart LR\n  PO[(\"posts\")]:::s0\n  FG[(\"follows\")]:::s1\n  FC[(\"feed cache: user → [post ids]\")]:::s2\n  FC -. \"hydrate ids\" .-> PO" },
      { t: "5. High-level architecture", x: "Write path fans out asynchronously; read path assembles from caches.",
        m: "flowchart LR\n  C[\"Client\"] --> API[\"API gateway\"]\n  API --> PS[\"Post service\"]:::s0 --> PDB[(\"Posts\")]\n  PS --> K[(\"Kafka: new posts\")]:::s1 --> FO[\"Fan-out workers\"]:::s0\n  FO --> GR[(\"Follower graph\")]\n  FO --> FC[(\"Feed cache (Redis)\")]:::s2\n  API --> FD[\"Feed service\"]:::s0 --> FC\n  FD --> PC[(\"Post cache\")]:::s2\n  FD --> RK[\"Ranking\"]" },
      { t: "6. Deep dive: fan-out on write vs read", x: "The central decision.",
        table: [["", "Push (on write)", "Pull (on read)"], ["When posting", "Insert post id into every follower's feed", "Just store the post"], ["When reading", "Read one precomputed list — fast", "Fetch recent posts of all followees and merge — slow"], ["Problem", "Celebrities: millions of writes per post; wasted on inactive users", "Expensive reads at high QPS"]],
        p: ["Hybrid: push for normal accounts; pull for celebrities (above a follower threshold) and merge at read time", "Skip fan-out to inactive users; build their feed on demand"],
        m: "flowchart LR\n  N[\"Normal user posts\"] -->|\"push\"| FC[(\"followers' feeds\")]:::s2\n  CEL[\"Celebrity posts\"] -->|\"store only\"| TL[(\"celebrity timeline\")]:::s1\n  R[\"Feed read\"] --> FC\n  R -->|\"merge\"| TL" },
      { t: "7. Deep dive: reading the feed", x: "Turn post ids into a rendered page fast.",
        p: ["Get top N ids from the feed cache (+ merge celebrity timelines)", "Hydrate: multi-get post objects and author profiles from caches (batch!)", "Filter: deleted posts, blocked users, privacy", "Rank (optional): ML scoring on candidates; otherwise reverse-chronological", "Return with an opaque cursor (last seen id/score)"],
        m: "flowchart LR\n  IDS[\"post ids from feed cache\"]:::s2 --> MER[\"merge celebrity posts\"] --> HY[\"hydrate posts + users (multi-get)\"]:::s0 --> FL[\"filter\"] --> RK[\"rank\"]:::s1 --> OUT[\"page + cursor\"]" },
      { t: "8. Deep dive: ranking, media, edits", x: "Things that come up in follow-ups.",
        p: ["Ranking: candidate generation (followed + recommended) → feature lookup → model scores → diversity rules; separated from fan-out", "Media: object storage + CDN; feed holds ids/URLs only", "Deletes/edits: posts are hydrated at read time, so changes show without rewriting feeds; deleted ids filtered", "Unfollow: filter at read time; clean feed lazily", "New user: build feed on first request (pull)"],
        m: "flowchart LR\n  CG[\"candidates\"] --> FE[\"features\"]:::s1 --> SC[\"model score\"]:::s0 --> DV[\"diversity / rules\"] --> FEED[\"ranked feed\"]:::s2" },
      { t: "9. Bottlenecks and trade-offs", x: "Discussion points.",
        p: ["Fan-out lag for big accounts → hybrid + priority queues", "Feed cache memory → cap list length, store ids only, evict inactive users", "Hot posts (viral) → post cache replicas, CDN for media", "Consistency: author should see own post immediately (read-your-writes: inject into own feed synchronously)", "Sharding: posts by post_id, feed cache by user_id, graph by user_id"],
        m: "flowchart LR\n  W[\"Write cost\"]:::s0 <--> R[\"Read latency\"]:::s2\n  R <--> M[\"Memory\"]:::s1" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Post service → Kafka → fan-out workers write post ids into Redis feed caches", "Hybrid: celebrities pulled and merged at read time; inactive users skipped", "Feed service: ids → hydrate via caches → filter → rank → cursor page", "Snowflake ids for time order; media via object storage + CDN", "Shard by user/post; eventual consistency with read-your-writes for the author"],
        m: "flowchart LR\n  W[\"Write: post → fan-out\"]:::s0 --> C[(\"feed caches\")]:::s2 --> R[\"Read: hydrate + rank\"]:::s1" }
    ],
    widget: { heading: "Fan-out strategy explorer", caption: "Compare push, pull and hybrid fan-out: feed writes, timeline reads and the worst case for a single post or load.", render: widget },
    examples: [
      ["Twitter timelines", "Twitter described fanning tweets out into Redis-based home timelines, with special handling for accounts with huge follower counts."],
      ["Facebook News Feed", "Facebook built its feed largely on read-time aggregation and ranking (its Multifeed system) rather than full fan-out on write."],
      ["Instagram", "Has written about feed ranking moving from reverse-chronological (changed in 2016) to ML-ranked feeds."],
      ["Redis sorted sets", "A common building block for capped, time-ordered feeds: ZADD with timestamp scores, ZREVRANGE to read."]
    ],
    pitfalls: [
      "Pure fan-out on write without a celebrity strategy",
      "Pure fan-out on read at high QPS",
      "Storing full post bodies in every feed instead of ids",
      "Offset pagination for infinite scroll",
      "N+1 lookups when hydrating posts and users",
      "Forgetting the author's read-your-writes expectation"
    ],
    quiz: [
      ["Main weakness of fan-out on write?", ["Slow reads", "Celebrity posts cause millions of feed writes", "Can't paginate", "Needs SQL"], 1, "Write amplification proportional to followers."],
      ["Main weakness of fan-out on read?", ["Expensive merges on every feed load", "Lost posts", "No ranking", "Hard to post"], 0, "Reads are frequent, so cost multiplies."],
      ["The hybrid approach…", ["Pulls everything", "Pushes normal users' posts and pulls celebrities' at read time", "Pushes only to celebrities", "Uses no cache"], 1, "Best of both."],
      ["What should a feed cache store per user?", ["Full post JSON", "A capped list of post ids", "Images", "All historical posts"], 1, "Hydrate at read time; edits/deletes stay correct."],
      ["Best pagination for an infinite feed?", ["page=37", "Cursor (last seen id/score)", "Random", "None"], 1, "Stable under inserts."],
      ["How does an author see their own post immediately?", ["Wait for fan-out", "Write it into their own feed synchronously / merge their recent posts", "Refresh twice", "Disable caching"], 1, "Read-your-writes."],
      ["Why skip fan-out to inactive users?", ["They are banned", "Saves writes and memory; build on demand if they return", "Required by law", "Ranking"], 1, "Most fan-out to inactive users is wasted."],
      ["100 M DAU × 20 feed loads/day is about…", ["2,300/s", "23,000/s", "230,000/s", "2.3 M/s"], 1, "2 × 10⁹ ÷ 86,400 ≈ 23k."]
    ],
    practice: {
      q: "The interviewer asks you to switch the feed from reverse-chronological to ranked, mixing in posts from accounts the user doesn't follow. What changes?",
      a: [
        ["Candidates", "Feed cache still supplies followed-account post ids (push/pull); add recommendation candidates from a separate service (similar users, trending, topics)."],
        ["Features", "Feature store with author affinity, post engagement so far, freshness, media type; fetched in batch."],
        ["Scoring", "Ranking service runs a model over ~500 candidates per request within a latency budget (e.g. 50 ms); keep a fallback heuristic."],
        ["Policy layer", "Diversity (no 5 posts in a row from one author), integrity filters, ads slots."],
        ["Pagination", "Rank once per session snapshot and page through it with a cursor, so results don't reshuffle while scrolling."],
        ["Measurement", "Log impressions and engagement to Kafka for training and A/B experiments."],
        ["Trade-offs", "Higher read cost and complexity; less predictable order for users."]
      ]
    },
    recap: [
      "Feed = posts from followed accounts, read-heavy, eventual consistency OK.",
      "Push is fast to read but explodes for celebrities; pull is cheap to write but slow to read.",
      "Hybrid: push normal users, pull celebrities, skip inactive users.",
      "Feed caches hold capped id lists; hydrate posts and users with batched multi-gets.",
      "Cursor pagination, read-your-writes for authors, ranking as a separate stage."
    ]
  });
})();
