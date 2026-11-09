/* Lesson P13: Chat app (WhatsApp) */
(function () {
  "use strict";
  var H = window.HLD;
  function steps(online) {
    var a = [["Alice", "Client assigns client_msg_id, shows 🕓 (pending), sends over WebSocket to gateway 3"],
      ["Server", "Chat service assigns per-conversation sequence #1042, persists to message store, acks Alice → ✓ (sent)"]];
    if (online) a.push(["Server", "Registry says Bob is on gateway 7 → push message to Bob"], ["Bob", "Bob's app stores it, sends a delivery receipt → Alice sees ✓✓ (delivered)"]);
    else a.push(["Server", "Bob offline → message stays in his inbox queue; push notification via APNs/FCM"], ["Bob", "Later: Bob reconnects, syncs everything after his last seq (#1041) → delivery receipt → Alice sees ✓✓"]);
    a.push(["Bob", "Bob opens the chat → read receipt → Alice sees blue ✓✓ (read)"]);
    return a;
  }

  function widget(el, ctx) {
    var s = ctx.state; if (s.online == null) { s.online = true; s.step = 0; s.g = 100; s.msgs = 50; }
    el.innerHTML = "<label class='toggle'><input type='checkbox' data-r='on'> Bob is online</label><div class='rows' data-r='rows'></div>" +
      "<div class='controls'><button class='btn' data-a='prev'>Back</button><button class='btn primary' data-a='next'>Next event</button><button class='btn' data-a='reset'>Restart</button></div><div class='callout' data-r='tick'></div>" +
      "<h4 style='margin:16px 0 6px'>Group fan-out</h4><div class='grid2'><label class='field'>Group size: <strong data-v='g' style='color:var(--text)'></strong><input type='range' min='2' max='1024' data-k='g'></label><label class='field'>Messages per day in the group: <strong data-v='msgs' style='color:var(--text)'></strong><input type='range' min='1' max='2000' data-k='msgs'></label></div><div class='metrics' data-r='m'></div>" +
      "<p class='caption'>Fan-out assumes one delivery per member per message (plus one delivery and one read receipt back each). Simplified; real apps batch receipts.</p>";
    function draw() {
      var st = steps(s.online), n = Math.min(s.step, st.length);
      el.querySelector("[data-r='on']").checked = s.online;
      el.querySelector("[data-r='rows']").innerHTML = st.map(function (x, i) { return "<div class='row' style='opacity:" + (i < n ? 1 : 0.25) + "'><span class='t'><span class='pill " + (x[0] === "Alice" ? "" : x[0] === "Bob" ? "success" : "warning") + "'>" + x[0] + "</span></span><span class='dt'>" + x[1] + "</span></div>"; }).join("");
      var tick = n === 0 ? "nothing sent yet" : n === 1 ? "🕓 pending" : n < 4 ? "✓ sent (server has it)" : n < 5 ? "✓✓ delivered" : "✓✓ read (blue)";
      el.querySelector("[data-r='tick']").innerHTML = "<strong>Alice sees:</strong> " + tick;
      ["g", "msgs"].forEach(function (k) { el.querySelector("[data-k='" + k + "']").value = s[k]; el.querySelector("[data-v='" + k + "']").textContent = s[k]; });
      var d = (s.g - 1) * s.msgs;
      el.querySelector("[data-r='m']").innerHTML = [[d.toLocaleString(), "Message deliveries / day"], [(d * 2).toLocaleString(), "Receipts / day"], [(s.g - 1) + "", "Copies per message"]].map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    }
    el.addEventListener("click", function (e) { var a = e.target.getAttribute("data-a"); if (!a) return; var L = steps(s.online).length; if (a === "next") s.step = Math.min(L, s.step + 1); if (a === "prev") s.step = Math.max(0, s.step - 1); if (a === "reset") s.step = 0; ctx.save(); draw(); });
    el.addEventListener("change", function (e) { if (e.target.getAttribute("data-r") === "on") { s.online = e.target.checked; s.step = 0; ctx.save(); draw(); } });
    el.addEventListener("input", function (e) { var k = e.target.getAttribute("data-k"); if (k) { s[k] = +e.target.value; ctx.save(); draw(); } });
    draw();
  }

  H.registerLesson({
    code: "P13",
    summary: "Design WhatsApp-style messaging: requirements, estimates, connection gateways and session registry, message flow with sent/delivered/read receipts, per-conversation ordering, offline sync, groups, presence, media and end-to-end encryption.",
    slides: [
      { t: "1. Requirements", x: "Focus on 1:1 and group text messaging.",
        p: ["Functional: 1:1 chat, group chat (up to ~1,000 members), sent/delivered/read receipts, online/last seen, offline delivery, message history sync across reconnects, media sharing", "Non-functional: low latency (< ~500 ms end to end when both online); no message loss; ordering within a conversation; very high availability; end-to-end encryption (ask)", "Scale: hundreds of millions of concurrent connections"],
        m: "flowchart LR\n  A[\"Alice\"] -->|\"hi\"| CS[\"Chat system\"]:::s0 -->|\"hi\"| B[\"Bob\"]\n  B -.->|\"✓✓ delivered, read\"| A" },
      { t: "2. Estimates", x: "Example: 500 M DAU, 40 messages each per day.",
        table: [["Quantity", "Estimate"], ["Messages", "20 B/day ≈ 230k/s avg, peaks ~1M/s"], ["Concurrent connections", "~200 M at peak"], ["Gateway servers (500k conns each)", "≈ 400+"], ["Storage (100 B text + metadata)", "20 B × ~200 B ≈ 4 TB/day if stored server-side"]],
        p: ["WhatsApp historically deleted messages from servers after delivery; ask whether history is stored server-side"],
        m: "flowchart LR\n  M[\"230k msgs/s\"]:::s0 --> G[\"~400 gateway servers\"]:::s1 --> S[\"~4 TB/day if kept\"]:::s2" },
      { t: "3. API / protocol", x: "Persistent connection carrying small framed messages (WebSocket, MQTT-like or custom over TCP/TLS).",
        p: ["send {client_msg_id, conversation_id, ciphertext, type}", "ack {client_msg_id, server_seq} (sent)", "deliver {conversation_id, seq, sender, ciphertext}", "receipt {conversation_id, seq, delivered|read}", "sync {conversation_id → last_seq} on reconnect", "presence {user, online|last_seen}", "Media: separate HTTPS upload to object storage; message carries a link + key"],
        m: "sequenceDiagram\n  participant A as Alice app\n  participant G as Gateway\n  A->>G: send(client_msg_id=7f2, conv=AB, ciphertext)\n  G-->>A: ack(7f2, seq=1042)\n  G-->>A: receipt(seq=1042, delivered)" },
      { t: "4. Data model", x: "Write-heavy, append-only, partitioned by conversation.",
        table: [["Table", "Key", "Notes"], ["messages", "(conversation_id, seq)", "sender, ciphertext/media ref, ts — wide-column (Cassandra/HBase)"], ["inbox / pending", "(user_id, seq)", "undelivered messages per user"], ["conversations", "conversation_id", "type, members, last_seq"], ["user_conversations", "user_id → conversations", "for chat list"], ["sessions (Redis)", "user_id → gateway_id, device", "with TTL; presence"]],
        m: "flowchart LR\n  CV[(\"messages: conv_id + seq\")]:::s0\n  IN[(\"inbox: user_id + seq\")]:::s1\n  SE[(\"sessions: user → gateway\")]:::s2" },
      { t: "5. High-level architecture", x: "Stateful connection tier + stateless chat services.",
        m: "flowchart LR\n  A[\"Alice\"] -->|\"WebSocket/TLS\"| G3[\"Gateway 3\"]:::s1\n  B[\"Bob\"] -->|\"WebSocket/TLS\"| G7[\"Gateway 7\"]:::s1\n  G3 --> CH[\"Chat service\"]:::s0\n  CH --> ST[(\"Message store\")]\n  CH --> REG[(\"Session registry (Redis)\")]:::s2\n  CH -->|\"route\"| G7\n  CH --> PN[\"Push notifications (APNs/FCM)\"]\n  CH --> GRP[\"Group service\"]\n  A -->|\"HTTPS\"| MED[\"Media service → object storage + CDN\"]",
        p: ["Gateways only hold connections and forward; chat logic is stateless and horizontally scaled", "Routing between gateways via registry lookup + direct RPC or pub/sub (F18)"] },
      { t: "6. Deep dive: message flow and receipts", x: "Each tick means a specific guarantee.",
        p: ["✓ sent: the server has durably stored the message (ack after persist)", "✓✓ delivered: recipient device stored it and sent a delivery receipt", "Blue ✓✓ read: recipient opened the chat", "Client retries unacked sends with the same client_msg_id → server dedupes (F24)", "Receipts are themselves messages flowing back to the sender"],
        m: "stateDiagram-v2\n  [*] --> Pending\n  Pending --> Sent: server ack (persisted)\n  Sent --> Delivered: recipient device receipt\n  Delivered --> Read: recipient opens chat" },
      { t: "7. Deep dive: ordering and offline sync", x: "Messages must appear in the same order for everyone in a conversation.",
        p: ["Server assigns a monotonically increasing seq per conversation (single writer per conversation, e.g. the conversation's owning shard)", "Clients order by seq, not by device clocks", "Each device remembers the last seq per conversation; on reconnect: sync(conv → last_seq) fetches the gap", "Undelivered messages wait in the user's inbox; deleted from server after delivery if that's the policy", "Multi-device: each device syncs independently with its own cursor"],
        m: "sequenceDiagram\n  participant B as Bob (reconnects)\n  participant S as Chat service\n  B->>S: sync {AB: last_seq 1041, AC: 88}\n  S-->>B: AB #1042, #1043; AC #89\n  B->>S: delivered receipts" },
      { t: "8. Deep dive: groups, presence, encryption", x: "Features that change the fan-out math.",
        p: ["Groups: store once per group conversation, fan out delivery to each member's gateway/inbox (cap group size, e.g. 1,024)", "Presence: heartbeats update last_seen in Redis; publish changes only to contacts who are viewing (lazy) to avoid presence storms", "E2E encryption: Signal Protocol — keys on devices, server relays ciphertext only; group messages use sender keys", "Media: encrypted on device, uploaded to object storage; message carries URL + decryption key"],
        m: "flowchart LR\n  S[\"sender\"] -->|\"1 message\"| GS[\"Group service\"]:::s0\n  GS --> M1[\"member 1 gateway\"]:::s1\n  GS --> M2[\"member 2 inbox (offline)\"]:::s2\n  GS --> M3[\"member … \"]" },
      { t: "9. Bottlenecks and trade-offs", x: "Discussion points.",
        p: ["Connection tier: event-driven servers, graceful drain on deploys, jittered reconnects", "Hot groups: fan-out workers + batching", "Storage: partition by conversation_id; TTL if server doesn't keep history", "Consistency: per-conversation order via single sequencer; no global order needed", "E2E encryption limits server features (search, moderation) — a product trade-off"],
        m: "flowchart LR\n  CN[\"Connections\"]:::s1 --> GW[\"gateway scaling\"]\n  OR[\"Ordering\"]:::s0 --> SEQ[\"per-conversation seq\"]\n  PR[\"Privacy\"]:::s2 --> E2E[\"E2E: fewer server features\"]" },
      { t: "10. Wrap-up", x: "Summary.",
        p: ["Persistent connections to gateways; Redis session registry routes messages", "Persist then ack (✓); delivery and read receipts (✓✓, blue)", "Per-conversation sequence numbers; clients sync from last seq on reconnect", "Offline: inbox + push notification; groups fan out per member", "Signal-protocol E2E encryption; media via object storage"],
        m: "flowchart LR\n  C[\"Client\"] --> G[\"Gateway\"]:::s1 --> CH[\"Chat service\"]:::s0 --> ST[(\"Store + inbox\")]:::s2 --> G2[\"Recipient gateway / push\"]" }
    ],
    widget: { heading: "Message lifecycle and group fan-out", caption: "Step through one message from Alice to Bob (online or offline) and watch the ticks change; then size a group's fan-out.", render: widget },
    examples: [
      ["WhatsApp on Erlang", "WhatsApp ran on Erlang/FreeBSD with a famously small engineering team, reporting over 2 million connections per server in 2012."],
      ["Signal Protocol", "WhatsApp completed end-to-end encryption with the Signal Protocol for all users in 2016."],
      ["Discord", "Stores trillions of messages; it moved from Cassandra to ScyllaDB (described in 2023), partitioning messages by channel and time bucket."],
      ["Facebook Messenger", "Facebook has described moving Messenger to the Iris system, a per-user ordered queue for syncing devices."]
    ],
    pitfalls: [
      "Ordering by client timestamps",
      "Acking 'sent' before the message is durably stored",
      "No dedupe on client retries (duplicate messages)",
      "Broadcasting presence changes to all contacts constantly",
      "Forgetting the offline path (inbox + push)",
      "Putting chat logic inside the connection gateways"
    ],
    quiz: [
      ["What does a single grey ✓ mean in this design?", ["Recipient read it", "Server durably stored it", "Recipient device got it", "Message failed"], 1, "Sent = persisted and acked by the server."],
      ["How is message order guaranteed within a conversation?", ["Device clocks", "Server-assigned per-conversation sequence numbers", "Random ids", "Alphabetical"], 1, "A single sequencer per conversation."],
      ["Bob reconnects after 2 hours offline. How does he catch up?", ["Re-download all history", "Sync from his last seen seq per conversation", "Ask Alice to resend", "Wait for push notifications only"], 1, "Cursor-based sync fills the gap."],
      ["How do you prevent duplicates when Alice's app retries a send?", ["Slower retries", "Dedupe on client_msg_id", "Disable retries", "Use UDP"], 1, "Idempotency key for messages."],
      ["How does the system find Bob's connection?", ["Broadcast to all gateways", "Session registry user → gateway (or pub/sub)", "DNS", "Polling"], 1, "Updated on connect/disconnect."],
      ["A 1,000-member group gets 100 messages. Deliveries?", ["100", "~1,000", "~100,000", "~1 million"], 2, "999 × 100 ≈ 99,900."],
      ["With E2E encryption, what does the server see?", ["Plaintext", "Ciphertext and routing metadata", "Nothing at all", "Only images"], 1, "Keys live on devices."],
      ["Why keep gateways thin?", ["Cheaper TLS", "Deploys and logic changes don't drop millions of connections; logic scales separately", "Required by WebSocket", "To use UDP"], 1, "Separate connection tier from business logic."]
    ],
    practice: {
      q: "Add multi-device support: a user can be logged in on phone, laptop and tablet simultaneously, all showing the same chats, with E2E encryption.",
      a: [
        ["Identity", "Each device has its own identity keys registered under the user; the user's device list is published to contacts."],
        ["Sending", "Sender encrypts the message for every device of the recipient (and the sender's own other devices) — client-side fan-out of ciphertexts."],
        ["Routing", "Session registry maps user → [device → gateway]; deliver to each online device; offline devices get queued copies."],
        ["Sync", "Each device keeps its own last_seq per conversation; receipts are per device; 'read' on one device syncs read state to others."],
        ["History for a new device", "Encrypted history transfer from an existing device (server can't decrypt), or start fresh."],
        ["Trade-offs", "Ciphertext count multiplies by devices; device list changes must be verified (security codes) to prevent adding a malicious device."]
      ]
    },
    recap: [
      "Persistent connections to thin gateways; registry routes messages between gateways.",
      "Persist → ✓; device receipt → ✓✓; opened → read.",
      "Per-conversation sequence numbers; clients sync from their last seq.",
      "Offline: inbox + push; groups fan out per member; presence is lazy.",
      "E2E encryption with the Signal Protocol; media via object storage."
    ]
  });
})();
