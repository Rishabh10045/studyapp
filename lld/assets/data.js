/* Shared content for the LLD Study Roadmap and the LLD Teaching App. */
(function () {
  "use strict";
  var PHASES = ["OOP & principles", "UML & modelling", "Creational patterns", "Structural patterns", "Behavioral patterns", "Concurrency", "Machine-coding round"];
  var LEVELS = ["Easy", "Medium", "Hard"];

  function F(id, group, name, why, concepts) { return { id: id, name: name, kind: "fund", group: group, why: why, concepts: concepts }; }
  function P(id, group, name, why, concepts, deps) { return { id: id, name: name, kind: "prob", group: group, why: why, concepts: concepts, deps: deps }; }

  var TOPICS = [
    /* ---- Module 1: OOP & principles ---- */
    F("oop", "OOP & principles", "OOP fundamentals", "Every LLD answer is a set of classes; this is the vocabulary interviewers grade you on.", [
      "Classes and objects: state (fields) + behaviour (methods) + identity",
      "Encapsulation: private state, invariants guarded by methods, immutable value objects",
      "Abstraction: interfaces and abstract classes hide the how behind a what",
      "Inheritance: is-a reuse with `extends`, overriding, the fragile base class problem",
      "Polymorphism: overloading (compile time) vs overriding (runtime dynamic dispatch)",
      "Composition vs inheritance: has-a + delegation is usually more flexible"]),
    F("solid", "OOP & principles", "SOLID principles", "The five rules interviewers use to judge whether your classes will survive change.", [
      "S: Single Responsibility: one reason to change per class",
      "O: Open/Closed: add behaviour by adding code, not editing old code",
      "L: Liskov Substitution: subtypes must honour the base type's contract",
      "I: Interface Segregation: many small client-focused interfaces",
      "D: Dependency Inversion: depend on abstractions; inject dependencies",
      "Related: DRY, KISS, YAGNI, Law of Demeter"]),
    /* ---- Module 2: UML ---- */
    F("classdiag", "UML & modelling", "UML class diagrams & relationships", "The class diagram is the first artefact you draw in a machine-coding or LLD round.", [
      "Class box: name, attributes, operations; visibility + - # ~",
      "Association (uses / knows about) and multiplicity (1, 0..1, *)",
      "Aggregation (hollow diamond): has-a, parts can live on their own",
      "Composition (filled diamond): owns-a, parts die with the whole",
      "Dependency (dashed arrow): uses temporarily, e.g. a method parameter",
      "Generalization (inheritance) and realization (implements an interface)"]),
    F("seqdiag", "UML & modelling", "Sequence diagrams", "Shows how objects collaborate over time for one use case; great for walking an interviewer through a flow.", [
      "Lifelines, activation bars, synchronous vs asynchronous messages",
      "Return messages, self-calls, object creation",
      "Combined fragments: alt / opt / loop",
      "From a use case to a sequence diagram to method signatures"]),
    /* ---- Module 3: Creational ---- */
    F("singleton", "Creational patterns", "Singleton", "Most-asked pattern, and most-criticised; know both the code and the downsides.", [
      "One instance with a global access point",
      "Eager, lazy, double-checked locking with `volatile`, holder idiom, enum singleton",
      "Breaking it: reflection, serialization, cloning, multiple class loaders",
      "Downsides: hidden global state, hard to test; prefer DI-managed single instances"]),
    F("factory", "Creational patterns", "Factory Method", "Decouples clients from concrete classes they create.", [
      "Simple factory vs Factory Method (subclass decides)",
      "Creator / product hierarchies",
      "Replacing `new` + switch with a registry or map of suppliers",
      "Examples: `Calendar.getInstance()`, `List.of()`"]),
    F("absfactory", "Creational patterns", "Abstract Factory", "Creates families of related objects that must be used together.", [
      "Factory of factories: one per product family (e.g. UI theme, DB vendor)",
      "Guarantees consistent families",
      "Adding a new product type is hard; adding a family is easy",
      "Abstract Factory vs Factory Method"]),
    F("builder", "Creational patterns", "Builder", "The clean answer to telescoping constructors and many optional fields.", [
      "Fluent step-by-step construction, `build()` validates",
      "Immutable result objects",
      "Static nested Builder (Effective Java style), Lombok `@Builder`",
      "Director (GoF) vs fluent builder"]),
    F("prototype", "Creational patterns", "Prototype", "Create new objects by copying a configured instance.", [
      "Clone instead of build when construction is expensive",
      "Shallow vs deep copy",
      "`Cloneable` pitfalls; copy constructors as the idiomatic Java alternative",
      "Prototype registry"]),
    /* ---- Module 4: Structural ---- */
    F("adapter", "Structural patterns", "Adapter", "Makes an incompatible interface fit the one your code expects; the go-to for third-party integrations.", [
      "Object adapter (composition) vs class adapter (inheritance)",
      "Wrapping a legacy or vendor API (e.g. payment gateways)",
      "Examples: `Arrays.asList`, `InputStreamReader`"]),
    F("decorator", "Structural patterns", "Decorator", "Adds behaviour at runtime by wrapping, instead of a subclass explosion.", [
      "Same interface as the wrapped object; stackable wrappers",
      "Pizza/coffee toppings, logging/retry/caching wrappers",
      "Java I/O streams: `new BufferedInputStream(new FileInputStream(f))`",
      "Decorator vs inheritance vs Proxy"]),
    F("facade", "Structural patterns", "Facade", "One simple entry point over a messy subsystem.", [
      "Simplifies, doesn't hide: subsystem stays accessible",
      "Home-theatre / order-placement facade",
      "Facade vs Adapter vs Mediator"]),
    F("proxy", "Structural patterns", "Proxy", "A stand-in that controls access to the real object.", [
      "Virtual (lazy), protection (auth), remote, caching proxies",
      "Java dynamic proxies; Spring AOP and `@Transactional`",
      "Proxy vs Decorator: same shape, different intent"]),
    F("composite", "Structural patterns", "Composite", "Treat a tree of objects and a single object the same way.", [
      "Component, Leaf, Composite",
      "File system, org charts, UI trees, nested menus",
      "Recursive operations such as `size()` or `render()`"]),
    F("bridge", "Structural patterns", "Bridge", "Separates an abstraction from its implementation so both vary independently.", [
      "Avoids an M×N class explosion (shape × renderer, remote × device)",
      "Composition across two hierarchies",
      "Bridge vs Adapter (designed up front vs retrofitted)"]),
    F("flyweight", "Structural patterns", "Flyweight", "Share common state to support huge numbers of small objects.", [
      "Intrinsic (shared) vs extrinsic (passed in) state",
      "Text editors' glyphs, game particles, chess pieces",
      "`Integer.valueOf` cache, String pool"]),
    /* ---- Module 5: Behavioral ---- */
    F("strategy", "Behavioral patterns", "Strategy", "Swap algorithms at runtime; the single most useful pattern in machine-coding rounds.", [
      "Context holds a Strategy interface",
      "Pricing, payment, parking-spot allocation, rate-limiting algorithms",
      "Lambdas as lightweight strategies (`Comparator`)",
      "Strategy vs State"]),
    F("observer", "Behavioral patterns", "Observer", "One-to-many notification when state changes.", [
      "Subject, observers, subscribe / unsubscribe / notify",
      "Push vs pull model",
      "Memory leaks from forgotten listeners; thread safety",
      "Observer vs Pub-Sub (broker in the middle)"]),
    F("command", "Behavioral patterns", "Command", "Turns a request into an object you can queue, log, undo or redo.", [
      "Command, Invoker, Receiver",
      "Undo/redo stacks, job queues, macro recording",
      "`Runnable` as a command"]),
    F("state", "Behavioral patterns", "State", "Object changes behaviour when its internal state changes; core of vending machines and elevators.", [
      "State interface + one class per state; context delegates",
      "Replaces big switch-on-status blocks",
      "State transition diagrams; who owns transitions"]),
    F("template", "Behavioral patterns", "Template Method", "Fixed algorithm skeleton, customizable steps.", [
      "Abstract base with a `final` template method and hook methods",
      "Report generators, data importers, game turns",
      "Template Method (inheritance) vs Strategy (composition)"]),
    F("chain", "Behavioral patterns", "Chain of Responsibility", "Pass a request along handlers until one handles it.", [
      "Handler with `next`; each decides handle or forward",
      "Servlet filters, middleware, approval workflows, ATM cash dispensing",
      "Logger levels"]),
    F("iterator", "Behavioral patterns", "Iterator", "Traverse a collection without exposing its internals.", [
      "`Iterable` / `Iterator`, enhanced for-loop",
      "Custom iterators over trees or paged APIs",
      "Fail-fast vs fail-safe iterators"]),
    F("mediator", "Behavioral patterns", "Mediator", "Objects talk through a hub instead of to each other.", [
      "Reduces many-to-many coupling",
      "Chat rooms, air-traffic control, UI dialogs",
      "Risk: a god-object mediator"]),
    F("visitor", "Behavioral patterns", "Visitor", "Add new operations to a stable class hierarchy without editing it.", [
      "Double dispatch: `accept(visitor)` → `visitor.visit(this)`",
      "Compilers/ASTs, tax or export calculations over shopping items",
      "Easy to add operations, hard to add element types; sealed interfaces + pattern matching as a modern alternative"]),
    F("memento", "Behavioral patterns", "Memento", "Capture and restore an object's state without breaking encapsulation.", [
      "Originator, Memento, Caretaker",
      "Undo in editors, game checkpoints",
      "Memory cost of snapshots; Memento vs Command for undo"]),
    /* ---- Module 6: Concurrency ---- */
    F("threads", "Concurrency", "Threads & executors", "Machine-coding problems increasingly ask 'now make it thread-safe'.", [
      "Process vs thread; thread lifecycle",
      "`Thread`, `Runnable`, `Callable`, `Future`",
      "`ExecutorService`, thread pools, `CompletableFuture`",
      "Race conditions, visibility, happens-before (intro)"]),
    F("locks", "Concurrency", "Locks & synchronized", "The tools for protecting shared mutable state, and how they go wrong.", [
      "`synchronized` methods and blocks, intrinsic locks",
      "`volatile` for visibility, atomics (`AtomicInteger`, CAS)",
      "`ReentrantLock`, `ReadWriteLock`, `tryLock` with timeout",
      "Deadlock, livelock, starvation; lock ordering"]),
    F("tssingleton", "Concurrency", "Thread-safe Singleton", "A favourite follow-up question that tests memory-model understanding.", [
      "Why naive lazy init breaks under concurrency",
      "Synchronized getter vs double-checked locking with `volatile`",
      "Initialization-on-demand holder idiom",
      "Enum singleton"]),
    F("prodcons", "Concurrency", "Producer–consumer", "The classic coordination problem behind queues, loggers and pub-sub.", [
      "Bounded buffer with `wait()` / `notifyAll()`",
      "`BlockingQueue` (`ArrayBlockingQueue`, `LinkedBlockingQueue`)",
      "Back-pressure, poison pills, graceful shutdown"]),
    F("conccoll", "Concurrency", "Concurrent collections", "Pick the right thread-safe data structure instead of locking everything.", [
      "`ConcurrentHashMap` (and `computeIfAbsent`), `CopyOnWriteArrayList`",
      "`Collections.synchronizedMap` vs concurrent maps",
      "`ConcurrentLinkedQueue`, `BlockingQueue`, `ConcurrentSkipListMap`",
      "Atomic compound operations; fail-safe iteration"]),
    /* ---- Module 7: Machine-coding round ---- */
    F("approach", "Machine-coding round", "How to approach a machine-coding round", "A repeatable 90-minute playbook so you finish with working, extensible code.", [
      "Clarify requirements; list must-haves vs nice-to-haves",
      "Find entities (nouns), behaviours (verbs) and relationships",
      "Draw the class diagram; pick patterns only where they remove pain",
      "Code the core flow first: models → services → driver/main",
      "Handle edge cases, concurrency and extensibility; demo and explain trade-offs"]),

    /* ---- Machine-coding problems ---- */
    P("tictactoe", "Easy", "Tic-Tac-Toe", "Small, clean warm-up: board, players, win detection.", [
      "Board, Cell, Player, Game",
      "O(1) win check with row/column/diagonal counters",
      "Extensible to N×N and more players"], ["oop", "solid", "strategy"]),
    P("snakeladder", "Easy", "Snake & Ladder", "Turn-based game modelling with a simple game loop.", [
      "Board with jumps (snakes, ladders), Dice, Player queue",
      "Configurable board and dice strategies",
      "Game-over and multiple-winner rules"], ["oop", "classdiag", "strategy"]),
    P("lru", "Easy", "LRU Cache", "Data-structure design that comes up in both DSA and LLD rounds.", [
      "HashMap + doubly linked list for O(1) get/put",
      "`LinkedHashMap` with `removeEldestEntry`",
      "Pluggable eviction policy (LRU, LFU) via Strategy",
      "Thread-safe version"], ["oop", "strategy", "locks", "conccoll"]),
    P("logger", "Easy", "Logger", "Tests Singleton, Chain of Responsibility and async I/O.", [
      "Log levels, formatters, appenders (console, file)",
      "Level filtering via Chain of Responsibility",
      "Async logging with a producer–consumer queue"], ["singleton", "chain", "observer", "prodcons"]),
    P("library", "Easy", "Library Management", "Classic entity-modelling problem with search and fines.", [
      "Book vs BookItem (copies), Member, Loan, Reservation",
      "Search by title/author, checkout/return, fines",
      "Notifications when a reserved book is back"], ["oop", "classdiag", "observer", "solid"]),
    P("parking", "Medium", "Parking Lot", "The most-asked LLD question; covers entities, strategies and concurrency.", [
      "Lot → Floors → Spots; Vehicle types; Ticket; Gates",
      "Spot allocation strategy (nearest, by type)",
      "Fee calculation strategy; payments",
      "Concurrent entry gates assigning spots"], ["oop", "solid", "classdiag", "strategy", "factory", "singleton", "locks"]),
    P("vending", "Medium", "Vending Machine", "The textbook State-pattern problem.", [
      "States: Idle, HasMoney, Dispensing, OutOfStock",
      "Inventory, coins/notes, change calculation",
      "Refunds and cancellation"], ["state", "oop", "classdiag", "seqdiag"]),
    P("atm", "Medium", "ATM", "State machine plus cash dispensing via Chain of Responsibility.", [
      "Card insert → PIN → transaction → eject states",
      "Cash dispenser chain (2000 → 500 → 100 notes)",
      "Bank service interface; transaction records"], ["state", "chain", "seqdiag", "facade"]),
    P("ratelimiter", "Medium", "Rate Limiter", "Algorithms + concurrency in one compact problem.", [
      "Token bucket, leaky bucket, fixed and sliding window",
      "Algorithms behind a Strategy interface",
      "Per-user / per-API limits; thread-safe counters"], ["strategy", "factory", "locks", "conccoll"]),
    P("splitwise", "Medium", "Splitwise", "Expense modelling and balance simplification.", [
      "User, Group, Expense, Split types (equal, exact, percent)",
      "Balance sheet per user pair",
      "Simplify debts (min cash flow)"], ["oop", "strategy", "factory", "solid"]),
    P("pubsub", "Medium", "Pub-Sub / Message Queue", "In-memory Kafka-lite: topics, publishers, subscribers, offsets.", [
      "Topic, Message, Publisher, Subscriber, Broker",
      "Consumer offsets and replay",
      "Concurrent delivery with worker threads"], ["observer", "mediator", "prodcons", "conccoll", "threads"]),
    P("elevator", "Hard", "Elevator System", "Scheduling + state machines across multiple cars.", [
      "Elevator car, Door, Panel, Request (internal/external)",
      "Car states: idle, moving up/down, doors open",
      "Dispatch strategies: nearest car, SCAN/LOOK",
      "Concurrency between requests and cars"], ["state", "strategy", "observer", "command", "threads"]),
    P("bookmyshow", "Hard", "BookMyShow (movie tickets)", "Booking with seat locking: the concurrency-heavy favourite.", [
      "City, Theatre, Screen, Show, Seat, Booking, Payment",
      "Temporary seat holds with expiry; preventing double booking",
      "Search shows; pricing strategy; payment flow"], ["oop", "classdiag", "seqdiag", "strategy", "locks", "conccoll"]),
    P("chess", "Hard", "Chess", "Rich polymorphism: every piece moves differently.", [
      "Board, Cell, Piece hierarchy, Move, Player, Game",
      "Move validation per piece; check/checkmate detection",
      "Move history with undo (Command / Memento)"], ["oop", "solid", "command", "memento", "factory"]),
    P("hotel", "Hard", "Hotel booking", "Inventory over date ranges, cancellations and payments.", [
      "Hotel, RoomType, Room, Reservation, Guest, Invoice",
      "Availability search across date ranges",
      "Booking states and cancellation policies",
      "Preventing double booking of a room"], ["oop", "classdiag", "state", "strategy", "locks", "facade"])
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

  /* Progress shared by both pages, kept in this browser's localStorage.
     Keys use the "lld." prefix so they never collide with the HLD app on the same github.io origin. */
  var KEY = "lld.done.v1";
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
  /* Render `code` spans, **bold** and *italic*. */
  function md(s) { return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\s][^*]*)\*/g, "<em>$1</em>"); }

  /* Tiny Java highlighter: comments, strings, annotations, keywords, types, numbers. */
  var KW = "abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|record|return|sealed|permits|short|static|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|yield|true|false|null";
  var TOK = new RegExp("(//[^\\n]*|/\\*[\\s\\S]*?\\*/)|(\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])')|(@[A-Za-z]+)|\\b(" + KW + ")\\b|\\b([A-Z][A-Za-z0-9_]*)\\b|\\b(\\d[\\d_]*(?:\\.\\d+)?[LlDdFf]?)\\b", "g");
  function highlight(src) {
    var out = "", last = 0, m;
    TOK.lastIndex = 0;
    while ((m = TOK.exec(src))) {
      out += esc(src.slice(last, m.index));
      var cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "a" : m[4] ? "k" : m[5] ? "t" : "n";
      out += "<span class='tok-" + cls + "'>" + esc(m[0]) + "</span>";
      last = TOK.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  function codeBlock(src, lang) {
    return "<div class='codewrap'><span class='lang'>" + esc(lang || "java") + "</span><pre class='code'><code>" + highlight(String(src).replace(/^\n+|\s+$/g, "")) + "</code></pre></div>";
  }

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
  function isReady(c) { return (window.LLD_READY || []).indexOf(c) >= 0; }

  window.LLD = {
    registerLesson: registerLesson, lessons: REG, byCode: byCode, isReady: isReady,
    PHASES: PHASES, LEVELS: LEVELS, GROUPS: PHASES.concat(LEVELS), TOPICS: TOPICS, BY_ID: BY_ID, FUNDS: FUNDS, PROBS: PROBS,
    code: code, usedBy: usedBy, getDone: getDone, isDone: isDone, setDone: setDone, load: load, save: save,
    esc: esc, md: md, highlight: highlight, codeBlock: codeBlock, flow: flow, renderDiagram: renderDiagram
  };
})();
