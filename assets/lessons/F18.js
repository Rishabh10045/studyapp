/* Lesson F18: Real-time: WebSockets, long polling, SSE */
(function () {
  "use strict";
  var H = window.HLD;

  function widget(el, ctx) {
    var s = ctx.state; if (!s.users) { s.users = 100000; s.ev = 6; s.poll = 5; }
    el.innerHTML = "<div class='grid3'><label class='field'>Connected users: <strong data-v='users' style='color:var(--text)'></strong><input type='range' min='1000' max='1000000' step='1000' data-k='users'></label>" +
      "<label class='field'>Events per user per minute: <strong data-v='ev' style='color:var(--text)'></strong><input type='range' min='0' max='60' data-k='ev'></label>" +
      "<label class='field'>Short-poll interval: <strong data-v='poll' style='color:var(--text)'></strong><input type='range' min='1' max='60' data-k='poll'></label></div>" +
      "<div class='tablewrap'><table><thead><tr><th>Technique</th><th>HTTP requests / s to servers</th><th>Avg extra delay</th><th>Empty responses</th></tr></thead><tbody data-r='tb'></tbody></table></div>" +
      "<div class='bars' data-r='bars'></div><p class='caption'>Simplified model: long-poll requests held up to 30 s; delays exclude network latency; WebSocket/SSE counted after the connection is open (heartbeats ignored). Persistent connections shift cost from requests to open connections and memory.</p>";
    function draw() {
      ["users", "ev", "poll"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; });
      el.querySelector("[data-v='users']").textContent = s.users.toLocaleString(); el.querySelector("[data-v='ev']").textContent = s.ev; el.querySelector("[data-v='poll']").textContent = s.poll + " s";
      var e = s.ev / 60, U = s.users;
      var shortR = U / s.poll, shortEmpty = Math.max(0, 1 - Math.min(1, e * s.poll));
      var longR = U * (e + (e < 1 / 30 ? 1 / 30 - e : 0)) ; longR = U * Math.max(e, 1 / 30);
      var rows = [["Short polling", shortR, (s.poll / 2).toFixed(1) + " s", Math.round(shortEmpty * 100) + "%"],
        ["Long polling", longR, "≈ 0 (one re-request per event)", e < 1 / 30 ? "timeouts only" : "few"],
        ["Server-Sent Events", 0, "≈ 0", "none"], ["WebSocket", 0, "≈ 0", "none"]];
      el.querySelector("[data-r='tb']").innerHTML = rows.map(function (r) { return "<tr><td>" + r[0] + "</td><td>" + Math.round(r[1]).toLocaleString() + "</td><td>" + r[2] + "</td><td>" + r[3] + "</td></tr>"; }).join("");
      var mx = Math.max(shortR, longR, 1);
      el.querySelector("[data-r='bars']").innerHTML = rows.map(function (r, i) { return "<div class='bar'><span>" + r[0] + "</span><div class='track'><div class='fill' style='width:" + (r[1] / mx * 100) + "%;background:var(--c" + (i % 3) + ")'></div></div><span>" + Math.round(r[1]).toLocaleString() + "/s</span></div>"; }).join("");
    }
    el.addEventListener("input", function (ev) { var k = ev.target.getAttribute("data-k"); if (k) { s[k] = +ev.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "F18",
    summary: "Getting data to clients the moment it changes: short polling, long polling, Server-Sent Events and WebSockets, how to scale millions of persistent connections, and how servers route messages to the right connection.",
    slides: [
      { t: "The problem: HTTP is request/response", x: "In plain HTTP the client asks and the server answers. For chat, live scores, notifications or ride tracking, the server needs to push when something happens.",
        p: ["Options: short polling, long polling, Server-Sent Events (SSE), WebSockets", "Also: push notifications (APNs/FCM) when the app is closed", "Trade-off: freshness vs server load vs complexity"],
        m: "flowchart LR\n  C[\"Client\"] -->|\"request\"| S[\"Server\"]:::s0\n  S -->|\"response\"| C\n  S -. \"new message! but how to push?\" .-> C" },
      { t: "Short polling", x: "The client asks every N seconds: 'anything new?'. Simple, but mostly empty responses.",
        pros: ["Trivial to build, works everywhere, stateless servers"], cons: ["Wasted requests when nothing changed", "Delay up to the poll interval", "Load grows with users ÷ interval"],
        m: "sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>S: GET /updates\n  S-->>C: nothing\n  C->>S: GET /updates (5 s later)\n  S-->>C: nothing\n  C->>S: GET /updates (5 s later)\n  S-->>C: 1 new message" },
      { t: "Long polling", x: "The client sends a request; the server holds it open until there's data or a timeout, then the client immediately re-requests.",
        p: ["Near-instant delivery with plain HTTP", "One request per event (or per timeout, e.g. 30 s)", "Servers hold many open requests: need async/event-driven servers", "Used historically by early web chat; still a fallback in libraries like Socket.IO"],
        m: "sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>S: GET /updates?since=41\n  Note over S: hold until data or 30 s\n  S-->>C: message 42\n  C->>S: GET /updates?since=42\n  Note over S: hold…" },
      { t: "Server-Sent Events (SSE)", x: "One long-lived HTTP response that the server keeps writing events into (Content-Type: text/event-stream). Built into browsers as EventSource.",
        p: ["Server → client only", "Automatic reconnect with Last-Event-ID to resume", "Plain HTTP: works with existing proxies, auth and HTTP/2", "Great for feeds, notifications, live dashboards, streaming LLM tokens", "Text only (UTF-8)"],
        m: "sequenceDiagram\n  participant C as Browser (EventSource)\n  participant S as Server\n  C->>S: GET /stream (Accept: text/event-stream)\n  S-->>C: event: score 1-0\n  S-->>C: event: score 2-0\n  Note over C,S: connection stays open" },
      { t: "WebSockets", x: "An HTTP request upgrades to a persistent, full-duplex TCP connection (RFC 6455). Both sides can send messages at any time.",
        p: ["Starts with HTTP Upgrade handshake (101 Switching Protocols)", "Low overhead per message after setup (small frame header)", "Bi-directional: chat, multiplayer games, collaborative editing", "You handle reconnects, heartbeats and message ordering yourself", "Load balancers must support long-lived connections"],
        m: "sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>S: GET /ws (Upgrade: websocket)\n  S-->>C: 101 Switching Protocols\n  C->>S: send: typing…\n  S-->>C: msg from Bob\n  C->>S: send: Hi Bob!" },
      { t: "Comparison", x: "Pick the simplest technique that meets the need.",
        table: [["", "Short poll", "Long poll", "SSE", "WebSocket"], ["Direction", "Client pulls", "Client pulls", "Server → client", "Both ways"], ["Latency", "Up to interval", "Low", "Low", "Low"], ["Server load", "High (empty requests)", "Medium", "Low per event", "Low per message"], ["Complexity", "Lowest", "Low", "Low", "Higher"], ["Good for", "Rare updates", "Fallback", "Feeds, notifications, streaming text", "Chat, games, collaboration"]],
        m: "flowchart LR\n  N{\"Need client → server messages often?\"} -->|\"yes\"| WS[\"WebSocket\"]:::s0\n  N -->|\"no\"| P{\"Updates frequent?\"}\n  P -->|\"yes\"| SSE[\"SSE\"]:::s2\n  P -->|\"no\"| SP[\"Polling is fine\"]:::s1" },
      { t: "Scaling persistent connections", x: "Millions of open connections are a memory and file-descriptor problem, not a CPU problem.",
        p: ["Event-driven servers (epoll-based: Node.js, Netty, Go, Erlang/Elixir) hold many idle connections cheaply", "Dedicated gateway/connection tier separate from business logic", "L4 or WebSocket-aware L7 load balancers; long idle timeouts; heartbeats (ping/pong)", "Deploys drop connections: drain gracefully, clients reconnect with jittered backoff", "WhatsApp reported ~2 million connections per server on Erlang/FreeBSD (2012)"],
        m: "flowchart LR\n  U[\"Millions of clients\"] --> LB[\"L4 load balancer\"]:::s1\n  LB --> G1[\"Gateway 1<br/>500k conns\"]:::s0\n  LB --> G2[\"Gateway 2<br/>500k conns\"]:::s0\n  G1 --> APP[\"Chat / app services\"]\n  G2 --> APP" },
      { t: "Routing a message to the right connection", x: "Alice is connected to gateway 3, Bob to gateway 7. When Alice sends to Bob, the system must find Bob's gateway.",
        p: ["Session registry: user_id → gateway id (e.g. in Redis), updated on connect/disconnect", "Or pub/sub: each gateway subscribes to channels for its users (Redis Pub/Sub, Kafka)", "If the user is offline: store the message and send a push notification", "Presence (online/last seen) comes from the same connection events"],
        m: "flowchart LR\n  A[\"Alice\"] --> G3[\"Gateway 3\"]:::s0 --> CS[\"Chat service\"]:::s1\n  CS --> REG[(\"Registry: bob → gw7\")]:::s2\n  CS --> G7[\"Gateway 7\"]:::s0 --> B[\"Bob\"]\n  CS -. \"Bob offline\" .-> PN[\"Push notification (APNs / FCM)\"]" },
      { t: "Real-time in interviews", x: "State the technique, the connection tier, routing and the offline path.",
        p: ["'Clients keep a WebSocket to a stateless-ish gateway tier behind an L4 LB.'", "'Registry in Redis maps user → gateway; messages are routed via pub/sub.'", "'Offline users get APNs/FCM pushes and fetch history on reconnect.'", "'For one-way updates (live scores, notifications), SSE is simpler.'", "Mention heartbeats, reconnect with backoff, and resuming from the last message id"],
        m: "flowchart LR\n  C[\"Client\"] -->|\"WebSocket\"| GW[\"Gateway tier\"]:::s0 --> PS[\"Pub/sub\"]:::s1 --> GW2[\"Other gateways\"]:::s0\n  GW --> DB[(\"Message store\")]:::s2" }
    ],
    widget: { heading: "Polling vs push: load calculator", caption: "Compare HTTP request load and delivery delay for the four techniques as users and event rates change.", render: widget },
    examples: [
      ["WhatsApp", "Engineering posts in 2011–2012 described Erlang servers on FreeBSD handling over 1–2 million concurrent TCP connections per server."],
      ["Slack", "Slack clients keep a WebSocket to Slack's edge/gateway servers for real-time messages; its engineering blog describes the real-time messaging architecture."],
      ["Discord", "Discord's gateway uses WebSockets and was built on Elixir/Erlang to handle millions of concurrent users."],
      ["LLM chat apps", "Many AI chat APIs stream generated tokens to clients using Server-Sent Events."]
    ],
    pitfalls: [
      "Jumping to WebSockets when one-way SSE or polling would do",
      "Forgetting how to route a message to the server holding the recipient's connection",
      "No offline path (store + push notification)",
      "Load balancer idle timeouts silently killing connections; no heartbeats",
      "All clients reconnecting at once after a deploy (thundering herd) — use jittered backoff",
      "Mixing connection handling and heavy business logic in the same process"
    ],
    quiz: [
      ["Main cost of short polling?", ["Complex protocol", "Many empty requests and delay up to the interval", "Needs WebSockets", "Not supported by browsers"], 1, "Most polls return nothing new."],
      ["How does long polling work?", ["Client polls every second", "Server holds the request open until data or timeout, then the client re-requests", "Server opens a TCP connection to the client", "It uses UDP"], 1, "It gives low latency with ordinary HTTP."],
      ["Server-Sent Events are…", ["Bi-directional binary frames", "A one-way server → client event stream over HTTP", "A push notification service", "A database feature"], 1, "Browsers support them via EventSource, with auto-reconnect."],
      ["Which suits collaborative editing best?", ["Short polling", "SSE", "WebSocket", "Email"], 2, "Both sides send frequent messages."],
      ["How does a WebSocket connection start?", ["A DNS lookup only", "An HTTP Upgrade handshake answered with 101", "A UDP broadcast", "An SMTP request"], 1, "Defined in RFC 6455."],
      ["Alice and Bob are connected to different gateway servers. How does Alice's message reach Bob?", ["It can't", "A registry or pub/sub maps Bob to his gateway, which pushes to him", "Every gateway broadcasts to all clients", "Bob polls Alice's server"], 1, "Route via a session registry or pub/sub channel."],
      ["What should happen if the recipient is offline?", ["Drop the message", "Store it and send a mobile push notification", "Retry the WebSocket forever", "Email the sender"], 1, "Persist first; deliver on reconnect."],
      ["What is usually the limiting resource for a WebSocket gateway?", ["CPU for every message", "Memory and file descriptors for many idle connections", "Disk space", "DNS lookups"], 1, "Event-driven servers keep the per-connection cost low."]
    ],
    practice: {
      q: "Design live score updates for a cricket app during a big match: 20 million concurrent viewers, a score update every few seconds, viewers don't send anything back. Optionally add live comments.",
      a: [
        ["Technique", "One-way updates → SSE (or WebSocket if comments are needed). Polling would mean millions of requests per second."],
        ["Fan-out", "Score service publishes each update to a pub/sub topic per match; thousands of edge gateway servers subscribe and push to their connected viewers."],
        ["Connection tier", "Event-driven gateways (e.g. ~100k–500k connections each) behind L4 load balancers, spread across regions; heartbeats and long idle timeouts."],
        ["Reconnects", "Event ids let clients resume with Last-Event-ID; jittered backoff prevents reconnect storms after deploys or network blips."],
        ["Cheaper alternative", "Because every viewer sees the same data, a CDN-cached JSON endpoint polled every few seconds can also work — trades a few seconds of delay for simplicity."],
        ["Comments", "WebSocket for sending; sample/rate-limit the comment stream shown to each viewer since millions can't all be displayed."],
        ["Trade-offs", "Persistent connections = memory and operational complexity; CDN polling = more delay but massively cacheable."]
      ]
    },
    recap: [
      "Short polling is simple but wasteful; long polling holds requests until data.",
      "SSE streams server → client over HTTP with auto-reconnect.",
      "WebSockets give full-duplex messaging after an HTTP upgrade.",
      "Scale connections with event-driven gateways, L4 LBs, heartbeats and jittered reconnects.",
      "Route via a registry or pub/sub; store + push notify when the user is offline."
    ]
  });
})();
