/* Lesson P09: Instagram */
(function () {
  "use strict";
  var H = window.HLD;
  var VARIANTS = [["thumb 150px", 0.01], ["small 320px", 0.03], ["medium 640px", 0.1], ["large 1080px", 0.3]];

  function widget(el, ctx) {
    var s = ctx.state; if (!s.up) { s.up = 100; s.mb = 3; s.keep = true; s.views = 50; s.hit = 95; s.v = [true, true, true, true]; }
    el.innerHTML = "<div class='grid2'>" + [["up", "Photos uploaded per day (M)", 1, 500, 1], ["mb", "Average original size (MB)", 0.5, 10, 0.5], ["views", "Views per photo per day (first day)", 1, 500, 1], ["hit", "CDN hit ratio (%)", 50, 99.9, 0.1]].map(function (f) {
      return "<label class='field'>" + f[1] + ": <strong data-v='" + f[0] + "' style='color:var(--text)'></strong><input type='range' min='" + f[2] + "' max='" + f[3] + "' step='" + f[4] + "' data-k='" + f[0] + "'></label>"; }).join("") + "</div>" +
      "<div class='controls'><label class='toggle'><input type='checkbox' data-r='keep'> Keep originals</label>" + VARIANTS.map(function (v, i) { return "<label class='toggle'><input type='checkbox' data-i='" + i + "'> " + v[0] + " (~" + (v[1] * 1000) + " KB)</label>"; }).join("") + "</div>" +
      "<div class='metrics' data-r='m'></div><p class='caption'>Variant sizes are rough JPEG/WebP guesses; views are served as the medium variant. Storage excludes replication or erasure-coding overhead in the object store.</p>";
    function draw() {
      ["up", "mb", "views", "hit"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; el.querySelector("[data-v='" + k + "']").textContent = s[k]; });
      el.querySelector("[data-r='keep']").checked = s.keep; el.querySelectorAll("[data-i]").forEach(function (b) { b.checked = s.v[+b.getAttribute("data-i")]; });
      var per = (s.keep ? s.mb : 0) + VARIANTS.reduce(function (a, v, i) { return a + (s.v[i] ? v[1] : 0); }, 0);
      var day = s.up * 1e6 * per / 1e6, year = day * 365, viewsPs = s.up * 1e6 * s.views / 86400, egress = viewsPs * 0.1 * 8 / 1000, origin = egress * (1 - s.hit / 100);
      el.querySelector("[data-r='m']").innerHTML = [[(s.up * 1e6 / 86400).toFixed(0) + "/s", "Uploads"], [day.toFixed(0) + " TB", "New storage per day"], [(year / 1000).toFixed(1) + " PB", "Per year"], [Math.round(viewsPs).toLocaleString() + "/s", "Image views"], [egress.toFixed(0) + " Gbit/s", "CDN egress"], [origin.toFixed(1) + " Gbit/s", "Origin egress (misses)"]]
        .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    el.addEventListener("change", function (e) { if (e.target.getAttribute("data-r") === "keep") s.keep = e.target.checked; var i = e.target.getAttribute("data-i"); if (i != null) s.v[+i] = e.target.checked; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "P09",
    summary: "A photo-sharing social app: requirements, estimates, API, data model, and deep dives on media upload with pre-signed URLs, async image processing, CDN delivery, the follower graph and feed, likes/counters at scale, and sharding.",
    slides: [
      { t: "1. Requirements", x: "Focus on photo posts and the feed.",
        p: ["Functional: upload photos with captions; follow users; home feed of followed users' posts; like and comment; view profile grid", "Non-functional: fast feed and image loads globally; uploads reliable on mobile networks; durable media (never lose a photo); highly available; eventual consistency OK for likes and feeds", "Out of scope (ask): stories, reels/video, DMs, search, ads"],
        m: "flowchart LR\n  U[\"Upload photo\"] --> IG[\"Photo app\"]:::s0 --> F[\"Followers' feeds\"]:::s2\n  IG --> P[\"Profile grid\"]" },
      { t: "2. Estimates", x: "Example: 500 M DAU, 100 M photos uploaded/day.",
        table: [["Quantity", "Estimate"], ["Uploads", "100 M/day ≈ 1,200/s (peak ~3–4k/s)"], ["Storage", "~3.5 MB per photo incl. variants → ~350 TB/day → ~125 PB/year"], ["Feed loads", "500 M × 10/day ≈ 58k/s"], ["Image views", "billions/day → hundreds of Gbit/s, served from CDN"], ["Likes", "~5 B/day ≈ 58k writes/s"]],
        m: "flowchart LR\n  UP[\"1.2k uploads/s\"]:::s1 --> OBJ[\"~350 TB/day\"]:::s2\n  V[\"Views: huge\"]:::s0 --> CDN[\"CDN does the heavy lifting\"]" },
      { t: "3. API", x: "Core endpoints.",
        p: ["POST /v1/media/upload-url {content_type, size} → {media_id, presigned_url}", "PUT <presigned_url> (direct to object storage)", "POST /v1/posts {media_ids[], caption} → {post_id}", "GET /v1/feed?cursor=…; GET /v1/users/{id}/posts?cursor=…", "POST /v1/posts/{id}/like; POST /v1/posts/{id}/comments"],
        m: "sequenceDiagram\n  participant C as App\n  participant A as API\n  participant S as Object storage\n  C->>A: POST /media/upload-url\n  A-->>C: media_id + pre-signed URL\n  C->>S: PUT photo.jpg\n  C->>A: POST /posts {media_id, caption}\n  A-->>C: 201 post_id" },
      { t: "4. Data model", x: "Different stores for different shapes.",
        table: [["Entity", "Fields", "Store"], ["users", "id, name, bio, avatar_media_id", "Sharded SQL"], ["media", "media_id, owner, object keys per variant, status", "SQL / KV"], ["posts", "post_id (time-sortable), author_id, media_ids, caption", "Sharded by author_id"], ["follows", "follower_id, followee_id", "Sharded SQL / graph"], ["likes", "post_id, user_id (unique)", "Wide-column; counts in Redis"], ["comments", "post_id, comment_id, user_id, text", "Wide-column by post_id"]],
        m: "flowchart LR\n  US[(\"users\")]:::s0 --> PO[(\"posts\")]:::s0 --> ME[(\"media\")]:::s2\n  US --> FO[(\"follows\")]:::s1\n  PO --> LK[(\"likes / comments\")]:::s1" },
      { t: "5. High-level architecture", x: "Media path and social path are separate.",
        m: "flowchart LR\n  C[\"Mobile app\"] --> CDN[\"CDN\"]:::s2\n  CDN --> OBJ[(\"Object storage\")]:::s2\n  C --> API[\"API gateway\"]\n  API --> MS[\"Media service\"]:::s0\n  API --> PS[\"Post service\"]:::s0\n  API --> FS[\"Feed service\"]:::s0\n  API --> SS[\"Social service: follows, likes\"]:::s0\n  C -->|\"pre-signed PUT\"| OBJ\n  OBJ -->|\"upload event\"| Q[(\"Queue\")]:::s1 --> IP[\"Image processors\"] --> OBJ\n  PS --> K[(\"Kafka\")]:::s1 --> FO[\"Feed fan-out (P08)\"] --> FC[(\"Feed cache\")]" },
      { t: "6. Deep dive: upload and processing", x: "Keep big bytes away from app servers; process asynchronously.",
        p: ["Client compresses/resizes before upload to save mobile bandwidth", "Pre-signed URL upload to object storage (resumable for large files)", "Upload event → queue → workers: validate, strip EXIF location (privacy), generate variants (150, 320, 640, 1080 px; WebP/AVIF), content moderation", "Mark media ready; post becomes visible when its media is ready", "Idempotent workers (retries)"],
        m: "flowchart LR\n  UP[\"original.jpg uploaded\"] --> EV[\"event\"] --> W[\"worker\"]:::s0\n  W --> V1[\"150px\"]:::s2\n  W --> V2[\"640px\"]:::s2\n  W --> V3[\"1080px\"]:::s2\n  W --> MOD[\"moderation\"]:::s1\n  W --> DB[(\"media.status = ready\")]" },
      { t: "7. Deep dive: serving images", x: "Image delivery is the bulk of traffic.",
        p: ["CDN in front of object storage; URLs include media_id + size, immutable → long cache TTLs", "Client picks the variant for its screen (responsive images)", "Popular images stay at the edge; long tail misses go to origin (consider an origin shield)", "Private accounts: signed, expiring URLs"],
        m: "flowchart LR\n  APP[\"App\"] -->|\"GET /m/abc_640.webp\"| EDGE[\"CDN edge\"]:::s2\n  EDGE -->|\"miss\"| SH[\"Origin shield\"]:::s1 -->|\"miss\"| OBJ[(\"Object storage\")]:::s0" },
      { t: "8. Deep dive: feed, likes and counters", x: "Social parts at scale.",
        p: ["Feed: same hybrid fan-out as P08 (push for normal users, pull for celebrities)", "Likes: write (post_id, user_id) with a unique key (idempotent); like counts in Redis INCR, flushed to DB periodically — approximate in real time is fine", "Hot posts: shard counters (count:post:#0..#9) and sum", "Comments: paginated by post_id, newest first"],
        m: "flowchart LR\n  L[\"like\"] --> LS[(\"likes table: unique(post, user)\")]:::s0\n  L --> RC[\"Redis INCR post:count\"]:::s2 --> FL[\"periodic flush\"] --> DB[(\"posts.like_count\")]" },
      { t: "9. Bottlenecks and trade-offs", x: "Discussion points.",
        p: ["Storage growth (~100+ PB/year) → tiering for old originals, efficient formats, erasure coding", "Celebrity posts → hybrid fan-out, counter sharding, CDN", "Consistency: like counts eventually consistent; own posts visible immediately", "Sharding: posts by author_id (profile grid fast) with time-sortable ids; Instagram's early IDs embedded the shard id (F25)", "Multi-region: media replicated; users routed to nearest region"],
        m: "flowchart LR\n  S[\"Storage\"]:::s2 --> T[\"tiering + formats\"]\n  H[\"Hot posts\"]:::s1 --> CS[\"counter sharding + CDN\"]\n  G[\"Growth\"]:::s0 --> SH[\"shard by author\"]" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Pre-signed uploads to object storage; async workers make variants, strip EXIF, moderate", "CDN with immutable URLs serves images", "Posts sharded by author; feed via hybrid fan-out into Redis", "Likes idempotent, counts in Redis with periodic flush", "Plan for PB-scale storage with tiering"],
        m: "flowchart LR\n  UP[\"Upload\"]:::s0 --> PR[\"Process\"]:::s1 --> SV[\"Serve via CDN\"]:::s2\n  PO[\"Post\"] --> FD[\"Feed\"]" }
    ],
    widget: { heading: "Photo storage and CDN estimator", caption: "Choose stored variants and traffic to see storage growth and how much the CDN saves your origin.", render: widget },
    examples: [
      ["Instagram on PostgreSQL", "Instagram's 2012 engineering posts described sharding PostgreSQL with thousands of logical shards and IDs that embed the shard id."],
      ["Instagram + Django", "Instagram has described running one of the largest Django (Python) deployments."],
      ["Facebook Haystack", "Facebook's photo store (OSDI 2010) packed many photos into large files to cut metadata disk seeks."],
      ["Modern formats", "WebP and AVIF typically shrink images noticeably compared with JPEG at similar visual quality, cutting storage and CDN bandwidth."]
    ],
    pitfalls: [
      "Uploading photos through app servers",
      "Synchronous image processing in the upload request",
      "Serving images from origin without a CDN",
      "Leaving EXIF GPS data in public photos",
      "Exact real-time like counters with a DB write per like",
      "Ignoring PB-scale storage growth"
    ],
    quiz: [
      ["How should the mobile app upload photos?", ["Through the API servers", "Directly to object storage via a pre-signed URL", "Email", "Into the database"], 1, "Keeps bytes off app servers."],
      ["Where should resizing happen?", ["Synchronously in the upload request", "Async workers triggered by an upload event", "On every view", "In the CDN only"], 1, "Fast uploads, retriable processing."],
      ["Why include size/variant in image URLs and make them immutable?", ["SEO", "Long CDN cache lifetimes and no invalidation", "Security", "Smaller files"], 1, "New content → new URL."],
      ["How to count likes at 58k/s?", ["UPDATE posts SET likes = likes + 1 per like", "Redis INCR (sharded for hot posts) with periodic DB flush", "Count rows on every read", "Client-side counting"], 1, "Approximate real-time counts are fine."],
      ["What makes a like idempotent?", ["A unique (post_id, user_id) key", "Faster DB", "Caching", "CDN"], 0, "Retries or double taps can't double count."],
      ["Privacy step before publishing?", ["Compress more", "Strip EXIF location metadata", "Add watermark", "Encrypt the CDN"], 1, "Photos can carry GPS coordinates."],
      ["Feed strategy for an account with 300 M followers?", ["Push to all", "Pull at read time (hybrid)", "No feed", "Email followers"], 1, "Celebrity posts are merged on read."],
      ["100 M uploads/day is about…", ["120/s", "1,200/s", "12,000/s", "120,000/s"], 1, "10⁸ ÷ 86,400 ≈ 1,157."]
    ],
    practice: {
      q: "Add 'Stories': photos/short videos that disappear after 24 hours, shown in a row at the top of the app for accounts you follow, with a viewers list for the author.",
      a: [
        ["Upload", "Same pre-signed upload + processing pipeline; videos transcoded to a few renditions."],
        ["Storage", "stories(story_id, author_id, media_id, created_at, expires_at); object lifecycle deletes media after ~24 h (+ archive if the product keeps a private archive)."],
        ["Tray", "For each user, list followed authors with active stories: maintain author → latest story time in Redis; tray = followees filtered by active, ranked by affinity (pull at read, small)."],
        ["Viewing", "Prefetch the first few stories' media; CDN with short TTL bounded by expiry."],
        ["Viewers list", "Append (story_id, viewer_id) to a wide-column table, deduped; count in Redis; author reads paginated list."],
        ["Expiry", "Check expires_at on read; cleanup job and lifecycle rules reclaim space."],
        ["Trade-offs", "Pull-based tray keeps writes cheap; expiry checked at read keeps correctness without precise deletes."]
      ]
    },
    recap: [
      "Media path: pre-signed upload → object storage → async variants → CDN.",
      "Social path: posts sharded by author, hybrid fan-out feed in Redis.",
      "Immutable image URLs allow long CDN caching.",
      "Likes idempotent with unique keys; counts in Redis, flushed periodically.",
      "Storage grows by PB/year: formats, tiering, erasure coding."
    ]
  });
})();
