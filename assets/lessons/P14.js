/* Lesson P14: YouTube / Netflix */
(function () {
  "use strict";
  var H = window.HLD;
  var LADDER = [[0.4, "240p"], [0.8, "360p"], [1.5, "480p"], [3, "720p"], [6, "1080p"], [16, "4K"]];

  function sim(s) {
    var buf = 0, est = 2, out = [], stalls = 0, sw = 0, prev = -1, tot = 0;
    for (var t = 0; t < 120; t++) {
      var bw = s.base * (t >= 40 && t < 70 ? s.drop / 100 : 1) * (1 + 0.15 * Math.sin(t / 3));
      var pick = 0;
      if (s.abr) { for (var i = 0; i < LADDER.length; i++) if (LADDER[i][0] <= est * 0.8 && (buf > 5 || i <= 2)) pick = i; }
      else pick = s.fixed;
      if (prev >= 0 && pick !== prev) sw++; prev = pick;
      var rate = LADDER[pick][0], got = bw / rate; // seconds of video downloaded per second
      buf += got; if (t > 1) { if (buf >= 1) buf -= 1; else { stalls++; } }
      buf = Math.min(buf, 30); est = 0.7 * est + 0.3 * bw; tot += rate;
      out.push([bw, rate, buf]);
    }
    return { out: out, stalls: stalls, sw: sw, avg: tot / 120 };
  }

  function widget(el, ctx) {
    var s = ctx.state; if (!s.base) { s.base = 8; s.drop = 20; s.abr = true; s.fixed = 4; }
    el.innerHTML = "<div class='grid3'><label class='field'>Normal bandwidth: <strong data-v='base' style='color:var(--text)'></strong><input type='range' min='1' max='30' data-k='base'></label>" +
      "<label class='field'>Bandwidth during the dip (t = 40–70 s): <strong data-v='drop' style='color:var(--text)'></strong><input type='range' min='5' max='100' step='5' data-k='drop'></label>" +
      "<label class='field'>Fixed quality (when ABR is off): <strong data-v='fixed' style='color:var(--text)'></strong><input type='range' min='0' max='5' data-k='fixed'></label></div>" +
      "<label class='toggle'><input type='checkbox' data-r='abr'> Adaptive bitrate (ABR) on</label><div data-r='chart'></div><div class='metrics' data-r='m'></div>" +
      "<p class='caption'>Toy throughput-based ABR: picks the highest rendition under 80% of a smoothed bandwidth estimate, staying low until the buffer has 5 s. Real players (e.g. BOLA, MPC-style) also weigh buffer level. Ladder bitrates are typical but illustrative.</p>";
    function draw() {
      ["base", "drop", "fixed"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      el.querySelector("[data-v='base']").textContent = s.base + " Mbit/s"; el.querySelector("[data-v='drop']").textContent = s.drop + "%"; el.querySelector("[data-v='fixed']").textContent = LADDER[s.fixed][1] + " (" + LADDER[s.fixed][0] + " Mbit/s)";
      el.querySelector("[data-r='abr']").checked = s.abr;
      var r = sim(s), W = 600, Hh = 140, mx = Math.max(s.base * 1.2, 16);
      function path(idx, sc) { return r.out.map(function (p, i) { return (i ? "L" : "M") + (i * W / 119).toFixed(1) + "," + (Hh - p[idx] / sc * Hh).toFixed(1); }).join(" "); }
      el.querySelector("[data-r='chart']").innerHTML = "<svg viewBox='0 0 " + W + " " + (Hh + 20) + "' width='100%' role='img' aria-label='Bandwidth, bitrate and buffer over two minutes'>" +
        "<rect x='" + (40 * W / 119) + "' y='0' width='" + (30 * W / 119) + "' height='" + Hh + "' fill='var(--c1)' opacity='.12'/>" +
        "<path d='" + path(0, mx) + "' fill='none' stroke='var(--other)' stroke-width='2'/><path d='" + path(1, mx) + "' fill='none' stroke='var(--c0)' stroke-width='2.5'/><path d='" + path(2, 30) + "' fill='none' stroke='var(--c2)' stroke-width='2' stroke-dasharray='5 3'/>" +
        "<text x='4' y='" + (Hh + 15) + "' font-size='11' fill='var(--text-3)'>grey: bandwidth · blue: video bitrate · dashed cyan: buffer (0–30 s)</text></svg>";
      el.querySelector("[data-r='m']").innerHTML = [[r.stalls + " s", "Rebuffering (stalled)"], [r.avg.toFixed(1) + " Mbit/s", "Average bitrate"], [r.sw, "Quality switches"]].map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    }
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    el.querySelector("[data-r='abr']").addEventListener("change", function (e) { s.abr = e.target.checked; ctx.save(); draw(); });
    draw();
  }

  H.registerLesson({
    code: "P14",
    summary: "Video upload and streaming at global scale: requirements, estimates, resumable uploads, the transcoding pipeline (DAG of chunked jobs), adaptive bitrate streaming with HLS/DASH, CDN delivery (including ISP-embedded caches), metadata, view counts and cost trade-offs.",
    slides: [
      { t: "1. Requirements", x: "Two halves: get videos in, and stream them out smoothly.",
        p: ["Functional: upload videos; watch with adjustable quality; video metadata (title, description, thumbnails); search/recommendations (usually out of scope); view counts, likes, comments", "Non-functional: smooth playback (fast start, minimal rebuffering) worldwide on varying networks; uploads reliable for multi-GB files; durable storage; highly available; cost-efficient bandwidth", "Netflix vs YouTube: few curated uploads vs millions of user uploads"],
        m: "flowchart LR\n  CR[\"Creator\"] -->|\"upload\"| VP[\"Video platform\"]:::s0 -->|\"stream\"| V[\"Viewers worldwide\"]:::s2" },
      { t: "2. Estimates", x: "Example: 1 B daily viewers, 5 videos/day; 500 hours uploaded per minute.",
        table: [["Quantity", "Estimate"], ["Uploads", "500 h/min ≈ 720k hours/day"], ["Storage", "~1 GB/hour original + ~1–2 GB/hour for all renditions → ~2 PB/day"], ["Views", "5 B/day ≈ 58k starts/s"], ["Egress (avg 3 Mbit/s, 10 min each)", "5 B × 10 min × 3 Mbit/s ≈ 1 Tbit/s+ average — the dominant cost"]],
        m: "flowchart LR\n  UP[\"~2 PB/day stored\"]:::s1\n  OUT[\"Tbit/s of egress\"]:::bad --> CDN[\"CDN essential\"]:::s2" },
      { t: "3. API", x: "Core endpoints.",
        p: ["POST /v1/videos {title, description, size} → {video_id, upload session URL}", "Resumable upload: PUT chunks with Content-Range; resume after failure", "GET /v1/videos/{id} → metadata + manifest URL (HLS .m3u8 / DASH .mpd)", "Player then fetches segments directly from the CDN", "POST /v1/videos/{id}/views (batched), likes, comments"],
        m: "sequenceDiagram\n  participant P as Player\n  participant A as API\n  participant C as CDN\n  P->>A: GET /videos/abc\n  A-->>P: metadata + manifest URL\n  P->>C: GET master.m3u8\n  P->>C: GET 720p/seg_001.ts\n  P->>C: GET 720p/seg_002.ts" },
      { t: "4. Data model", x: "Metadata small, media enormous.",
        table: [["Store", "Contents"], ["videos (SQL, sharded)", "video_id, owner, title, status (uploading/processing/ready), duration, visibility"], ["renditions", "video_id, resolution, bitrate, codec, manifest/segment paths"], ["object storage", "originals, segments per rendition, thumbnails"], ["counters (Redis / stream)", "views, likes — aggregated"], ["search/reco", "separate systems fed by events"]],
        m: "flowchart LR\n  VM[(\"video metadata\")]:::s0 --> RN[(\"renditions\")]:::s0 --> OBJ[(\"segments in object storage\")]:::s2" },
      { t: "5. High-level architecture", x: "Upload → process → distribute → play.",
        m: "flowchart LR\n  CR[\"Creator\"] -->|\"resumable upload\"| UPS[\"Upload service\"]:::s0 --> RAW[(\"Raw videos\")]:::s2\n  RAW --> Q[(\"Job queue\")]:::s1 --> TC[\"Transcoding workers (DAG)\"]:::s0 --> ENC[(\"Encoded segments\")]:::s2\n  TC --> META[(\"Metadata DB\")]\n  ENC --> CDN[\"CDN / edge caches\"]:::s2\n  V[\"Viewer player\"] --> API[\"Video API\"] --> META\n  V --> CDN\n  V -->|\"views, QoE\"| K[(\"Kafka\")] --> AN[\"Analytics, counts, reco\"]" },
      { t: "6. Deep dive: upload and transcoding", x: "Turn one upload into many streamable renditions.",
        p: ["Resumable chunked upload to object storage (F14)", "Validate and inspect, then split the video into chunks (e.g. by GOP/scene) for parallel encoding", "Encode each chunk into a bitrate ladder: e.g. 240p…4K, codecs H.264, VP9, AV1 (newer codecs save bandwidth but cost more CPU)", "Package into HLS/DASH segments (2–6 s each) + manifests; generate thumbnails, captions", "A DAG of tasks with retries; status updates to metadata; notify creator when ready"],
        m: "flowchart LR\n  RAW[\"original\"] --> SPL[\"split into chunks\"]:::s1\n  SPL --> E1[\"encode chunk 1 × ladder\"]:::s0\n  SPL --> E2[\"encode chunk 2 × ladder\"]:::s0\n  SPL --> E3[\"encode chunk N × ladder\"]:::s0\n  E1 --> PK[\"package HLS/DASH + manifests\"]:::s2\n  E2 --> PK\n  E3 --> PK\n  RAW --> TH[\"thumbnails, captions\"]" },
      { t: "7. Deep dive: adaptive bitrate streaming", x: "The player downloads short segments and picks the quality for each one based on measured bandwidth and buffer.",
        p: ["Master manifest lists renditions; each rendition is a list of segments", "Player measures throughput and buffer level, switches quality between segments", "Goal: start fast (begin low), avoid rebuffering, maximise quality, avoid flapping", "Protocols: HLS (Apple) and MPEG-DASH; both use plain HTTP, so CDNs cache segments like files"],
        m: "flowchart LR\n  M[\"master.m3u8\"] --> R1[\"360p playlist\"]\n  M --> R2[\"720p playlist\"]:::s0\n  M --> R3[\"1080p playlist\"]\n  R2 --> S1[\"seg 1\"] --> S2[\"seg 2\"] --> S3[\"seg 3\"]\n  BW[\"bandwidth drops\"]:::bad -.-> R1" },
      { t: "8. Deep dive: delivery via CDN", x: "Egress is the biggest cost; push bytes as close to viewers as possible.",
        p: ["Popular videos cached at edge PoPs; long tail served from regional caches/origin", "Netflix Open Connect: appliances placed inside ISPs and pre-filled with predicted popular titles overnight", "YouTube uses Google's edge network and caches inside ISPs (Google Global Cache)", "Pre-position (push) for predictable demand vs pull-through caching for the long tail", "Signed URLs/tokens for paid content; DRM for studio content"],
        m: "flowchart LR\n  ORG[(\"Origin storage\")]:::s0 --> REG[\"Regional cache\"]:::s1 --> ISP[\"Cache inside ISP\"]:::s2 --> V[\"Viewers\"]\n  ORG -. \"overnight pre-fill\" .-> ISP" },
      { t: "9. Bottlenecks and trade-offs", x: "Discussion points.",
        p: ["Transcoding cost: encode popular videos with expensive codecs (AV1), long tail with cheaper ones; lazy encode rare resolutions", "Storage: tier old/unpopular renditions; delete originals? (product decision)", "View counts: stream aggregation, approximate in real time, dedupe bots", "Start-up latency: small first segments, preload, CDN warm", "Live streaming is different: low-latency HLS/DASH, ingest via RTMP/SRT, no time to pre-encode"],
        m: "flowchart LR\n  POP[\"Popular\"]:::s0 --> AV1[\"more encodes, best codecs, pre-positioned\"]\n  TAIL[\"Long tail\"]:::s1 --> CHEAP[\"fewer encodes, pull-through cache\"]" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Resumable uploads → object storage → DAG of chunked transcoding jobs", "Bitrate ladder packaged as HLS/DASH segments + manifests", "Players do adaptive bitrate per segment", "Multi-tier CDN, ISP-embedded caches, pre-positioning for popular content", "Metadata DB + async analytics for views; cost-aware encoding and storage tiers"],
        m: "flowchart LR\n  U[\"Upload\"]:::s0 --> T[\"Transcode\"]:::s1 --> D[\"Distribute (CDN)\"]:::s2 --> P[\"Play (ABR)\"]" }
    ],
    widget: { heading: "Adaptive bitrate simulator", caption: "Two minutes of playback with a bandwidth dip: compare ABR with a fixed quality and watch the buffer and rebuffering.", render: widget },
    examples: [
      ["Netflix Open Connect", "Netflix's own CDN, with appliances deployed in ISP networks and internet exchanges, filled during off-peak hours."],
      ["Per-title encoding", "Netflix described (2015) choosing a bitrate ladder per title based on its complexity, saving bandwidth for simple content like animation."],
      ["YouTube uploads", "YouTube has said more than 500 hours of video are uploaded every minute."],
      ["HLS", "HTTP Live Streaming, introduced by Apple in 2009, later published as RFC 8216 (2017)."]
    ],
    pitfalls: [
      "Serving video from origin servers without a CDN",
      "One giant file instead of segmented, multi-bitrate streams",
      "Synchronous transcoding during upload",
      "Non-resumable uploads for multi-GB files",
      "Ignoring egress as the dominant cost",
      "Counting views with a DB write per view"
    ],
    quiz: [
      ["What is adaptive bitrate streaming?", ["Compressing video on the client", "Player switches between renditions per segment based on bandwidth/buffer", "Streaming over UDP only", "Lowering the frame rate"], 1, "HLS/DASH segments at several bitrates."],
      ["Why split videos into chunks for transcoding?", ["To save storage", "Parallel encoding across many workers", "For DRM", "To reduce resolution"], 1, "Faster turnaround for long videos."],
      ["Why can CDNs cache HLS/DASH easily?", ["They use UDP", "Segments are plain HTTP files", "They're encrypted", "They're tiny"], 1, "Same as any static file."],
      ["What is Netflix Open Connect?", ["A codec", "Netflix's CDN with caches inside ISPs", "A recommendation model", "An upload API"], 1, "Brings bytes close to viewers."],
      ["Which cost usually dominates a video platform?", ["CPU for APIs", "Bandwidth/egress", "Metadata DB", "DNS"], 1, "Petabytes delivered daily."],
      ["Why start playback at a low quality?", ["Licensing", "Fast start before throughput is known and buffer filled", "Save storage", "It's required by HLS"], 1, "Then ramp up."],
      ["Trade-off of newer codecs like AV1?", ["Bigger files", "Better compression but more encoding CPU (and device support needed)", "No CDN support", "Lower quality"], 1, "Worth it for popular videos."],
      ["How should a 5 GB upload work on mobile?", ["Single POST", "Resumable chunked upload", "Email attachment", "Through the API servers"], 1, "Resume after network drops."]
    ],
    practice: {
      q: "Add live streaming (like YouTube Live/Twitch) with ~5 seconds of latency for millions of concurrent viewers.",
      a: [
        ["Ingest", "Streamer pushes via RTMP/SRT to the nearest ingest PoP; a stream id routes to a transcoder."],
        ["Real-time transcoding", "Dedicated transcoders encode a small ladder (e.g. 160p–1080p) in real time; no chunk parallelism over the whole video."],
        ["Packaging", "Low-latency HLS/DASH with short segments or partial segments (CMAF chunks ~1 s); manifests update continuously."],
        ["Delivery", "CDN with request collapsing so millions of viewers asking for the same new segment produce one origin fetch per edge."],
        ["Player", "Smaller buffer target (latency vs rebuffering trade-off); catch-up by slight speed-up."],
        ["Extras", "Chat over WebSockets (F18); DVR via recording segments to object storage; post-stream VOD transcode."],
        ["Trade-offs", "Lower latency = more rebuffering risk and more requests; WebRTC for sub-second latency costs much more per viewer."]
      ]
    },
    recap: [
      "Upload resumably, store originals, transcode via a DAG of chunked jobs.",
      "Package a bitrate ladder as HLS/DASH segments + manifests.",
      "Players use ABR per segment: fast start, few stalls, best quality.",
      "Multi-tier CDN with ISP-embedded caches; egress dominates cost.",
      "Encode and store by popularity; views via streaming aggregation."
    ]
  });
})();
