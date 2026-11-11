# LLD Study: Low-Level Design Teaching App + Roadmap

A static, zero-build study site for learning low-level design (LLD) and preparing for machine-coding rounds. Code examples are in Java. It uses the same architecture and look as the HLD Study app (`studyapp`).

- **VIP Interview Questions** (`interview.html`, `assets/interview-data.js`, `assets/interview.js`): 114 questions with model answers: OOP (10), SOLID (8), design patterns (47: 3 general + 2 for each of the 22 GoF patterns), concurrency (14), Java-specific (12) and machine-coding prompts (23, most with a Mermaid class-diagram outline). Search, section/topic/difficulty filters, a "frequently asked" tag (asked across many LLD interviews; no company-specific claims), collapsible answers, bookmarks and done marks saved under `lld.interview.v1`. `interview.html#q12` deep-links a question.
- **Teaching App** (`index.html`): a lesson player. The sidebar lists all 47 roadmap topics in order; unwritten lessons are shown as locked ("🔒 Soon") with a preview of what they'll cover. Every written lesson has step-by-step slides (Next/Back, arrow keys, step dots) with Mermaid diagrams, Java code, analogies and tables, plus an interactive widget, real-world examples, pitfalls, a quiz with instant feedback, a cheat sheet, practice questions with collapsible model answers, and a recap. Written so far (see "Written lessons" below for detail): F01–F32.
- **Roadmap hub** (`roadmap.html`): 32 lessons in 7 modules and 15 machine-coding problems by difficulty. It has:
  - module cards with locked / ready / done states, filters, search and a "hide done" toggle
  - a progress tracker you can tick
  - the machine-coding round framework with a 90-minute time split, UML relationship notation, a pattern picker and a sample sequence diagram

Progress (done topics), the current lesson and slide, widget settings, quiz answers, open practice answers and roadmap filters are saved in your browser's `localStorage` under keys starting with `lld.`, so they never clash with the HLD app on the same `github.io` origin. Both pages share the same progress. Clearing site data resets it.

## Written lessons

| Code | Lesson | Highlights |
| --- | --- | --- |
| F01 | OOP fundamentals | 14 slides; widget: composition-vs-inheritance counter + "who gets called?" dispatch predictor; 8 quiz, 8 practice |
| F02 | SOLID principles | 15 slides (violation + refactor per principle, LSP contract rules, DIP vs DI vs IoC, over-engineering); widget: spot the violated principle (12 snippets); 10 quiz, 14 practice incl. payment-module and parking-lot mini designs |
| F03 | UML class diagrams & relationships | 11 slides (class box anatomy, association, multiplicity, aggregation, composition, dependency, generalization/realization, a decision flowchart, association classes, worked library design, drawing tips + Mermaid syntax); widget: name that relationship (12 scenarios); 9 quiz, 11 practice incl. parking lot, BookMyShow, Splitwise, chess, elevator class diagrams |
| F04 | UML sequence diagrams | 9 slides (message types, alt/opt/loop/par/critical/break, diagram → Java, async with `CompletableFuture`, BookMyShow seat booking, state machine diagrams, which diagram when, drawing tips); widget: step through the parking-lot exit; 8 quiz, 9 practice incl. concurrent seat locking in Java, food-delivery order flow |
| F05 | Singleton | eager, lazy ladder (naive → synchronized → DCL + `volatile` → holder → enum), why DCL needs `volatile`, breaking via reflection/serialization/cloning, logger and ID-generator designs, DI alternative, Multiton, Spring singleton scope; widget: "will this singleton survive?" (10 snippets); 8 quiz, 8 practice (LRU cache, connection pool, `Lazy<T>`, init failures, distributed rate limiter) |
| F06 | Factory Method | static factories (Effective Java Item 1), Simple and registry factories (OCP), GoF Factory Method, notification-system and parking-lot vehicle/spot designs; widget: which creational approach? (10 situations); 8 quiz, 8 practice (payment processors, game levels, Factory + Strategy, Spring maps of beans, FEN chess pieces, ServiceLoader plugins) |
| F07 | Abstract Factory | UI themes, new-family vs new-product trade-off, choosing the factory once, regional checkout kit (India vs US), multi-cloud storage + queue; widget: name that creational pattern (10 snippets); 8 quiz, 8 practice (game difficulty kits, SQL dialects, testing with fake families, payment-gateway kits, region registry, "isn't this just DI?") |
| F08 | Builder | telescoping/JavaBeans problems, validating fluent builder, step builder, GoF Director, generic builders + `toBuilder()`, HTTP request and SQL query builder designs; widget: build a pizza (live builder chain + `build()` validation); 8 quiz, 8 practice (meal combos, order builder, message builder, layered config, test data builders) |
| F09 | Prototype | copy constructors vs `Cloneable`, shallow vs deep, prototype registry, immutability/withers, diagram-editor copy-paste and game-unit archetype designs; widget: shallow vs deep copy (mutate the copy, watch the original); 8 quiz, 8 practice (copy bugs, document templates, defensive copies, chess what-if boards, cyclic graphs, hierarchies) |
| F10 | Adapter | object vs class adapters, two-way and pluggable adapters, ports and adapters (hexagonal), SMS-vendor failover and legacy-inventory designs; widget: which structural pattern? (Adapter/Decorator/Facade/Proxy/Bridge); 8 quiz, 8 practice (logger, miles→km route adapter, two-way cache, PSP switch, callback→future, anti-corruption layer) |
| F11 | Decorator | wrapper stacks, ordering, Java I/O streams, functional decorators, resilient catalog client and compress/encrypt/checksum blob store designs; widget: wrap a coffee (stepper with live wrapper stack); 8 quiz, 8 practice (I/O roles, new add-ons, rate-limited notifier, metrics repository, text-pipeline ordering, add-ons vs discounts, Spring proxies, reflection logging decorator) |
| F12 | Facade | checkout facade with compensation, facade vs service layer vs API gateway/BFF, thin facades, notification facade and async video-upload designs; widget: facade or something else? (vs Adapter/Mediator/Decorator/god class); 8 quiz, 8 practice (home theatre, trip booking saga, splitting god facades, payments facade, outbox) |
| F13 | Proxy | virtual/protection/remote/caching/smart-reference proxies, JDK dynamic vs CGLIB proxies, Spring AOP self-invocation trap, caching+quota exchange-rate proxy and document ACL proxy designs; widget: which kind of proxy?; 8 quiz, 8 practice (thread-safe lazy proxy, timing proxy, `@Cacheable` bug, rate limiter, Hibernate proxies, remote stub, stacking order) |
| F14 | Composite | safe vs transparent designs (sealed types), traversal with cycle guards, in-memory file system and nested product-bundle pricing designs, rule composites; widget: watch `size()` recurse; 8 quiz, 8 practice (org chart, expression tree, menus, cached sizes, `mv` into descendant, role hierarchies, nested comments) |
| F15 | Bridge | notifications × channels, shapes × renderers, Bridge vs Strategy vs Adapter, reports × exporters and remotes × devices designs, JDBC/SLF4J as bridges; widget: m × n vs m + n class counter; 8 quiz, 8 practice (remotes, payment instruments × processors, documents × formats, media player, evolving implementors) |
| F16 | Flyweight | intrinsic vs extrinsic state, thread-safe factories, JDK flyweights and the `Integer ==` trap, flyweight vs singleton/pool/cache, text-editor style runs and game projectile designs; widget: memory saved by sharing; 8 quiz, 8 practice (boxing puzzles, chess pieces, bounded currency factory, map markers, memory estimates, tag interning, glyph cache) |
| F17 | Strategy | payment strategies + registry, lambdas/enums as strategies, Strategy vs State vs Template Method, composable ride-fare pricing and parking-spot allocation designs; widget: swap the fare strategy; 8 quiz, 8 practice (parking fees, Splitwise splits, switch→strategy refactor, rate-limit algorithms, elevator dispatch, A/B pricing, parameter objects) |
| F18 | Observer | stock ticker with failure isolation and self-unsubscribe, push vs pull vs typed events, Observer vs pub-sub, order-status notifications and back-in-stock waitlist designs; widget: stock ticker with observers; 8 quiz, 8 practice (weather station, async subject, lapsed listeners, auctions, `@TransactionalEventListener`, price alerts at scale, coalescing observer) |
| F19 | Command | editor undo/redo, macros and `Runnable`, commands as data (queues, CQRS), Command vs Memento undo, smart-home remote and job queue with retries/idempotency designs; widget: undo/redo stacks; 8 quiz, 8 practice (calculator undo, coalescing keystrokes, chess moves, idempotent refunds, Command vs Strategy, cron scheduler, collaborative undo) |
| F20 | State | vending machine with state singletons, state classes vs enum + transition table, persistence and concurrent transitions, ATM and document-approval workflow designs; widget: drive the vending machine (live state diagram); 8 quiz, 8 practice (traffic light with enums, media player, switch→state refactor, elevator car, seat holds, ride lifecycle, thread-safe events) |
| F21 | Template Method | product importer with abstract steps/hooks/extensible validation, modifiers that enforce the contract, Template Method vs Strategy (callbacks), turn-based game framework and KYC onboarding designs; widget: which extension mechanism?; 8 quiz, 8 practice (beverages, `AbstractList` range, callback template with cleanup, fragile base class, payment flow, retrying HTTP template, single inheritance) |
| F22 | Chain of Responsibility | logger chain, middleware pipeline, generic chain with fallback, ATM cash dispenser, configurable expense approvals | expense-approval routing widget |
| F23 | Iterator | ring buffer Iterable, BST iterator, fail-fast vs fail-safe vs weakly consistent, internal vs external, paginated API iterator, merge-k-sorted feed, peeking/flatten/round-robin/Spliterator practice | tree traversal stepper (stack/queue) |
| F24 | Mediator | chat room with mute/block, checkout form dialog mediator, event bus/orchestrator flavours, air-traffic control runway allocator, checkout saga orchestrator, smart-home hub, auction | mesh vs mediator link counter |
| F25 | Visitor | single vs double dispatch, cart GST/shipping/export visitors, expression AST eval/print/simplify, expression problem, Java 21 sealed + pattern switch, document exporter, FileVisitor disk usage, insurance premium design | double-dispatch tracer |
| F26 | Memento | editor undo/redo with opaque nested snapshots, Memento vs Command undo, memory strategies, game checkpoints with slots + bounded autosave, transactional cart rollback, persistent-structure snapshots, event-sourcing snapshots | save/restore game checkpoint widget |
| F27 | Threads & executors | process vs thread, lifecycle, Runnable/Callable/Future, Executors pools and hidden unbounded queues, ThreadPoolExecutor internals, CompletableFuture fare aggregator, races & check-then-act, happens-before, interruption, virtual threads, async notification dispatcher | ThreadPoolExecutor simulator (core/queue/max/rejection) |
| F28 | Locks & synchronized | wallet monitor, lock objects & striping, volatile vs atomics vs locks (CAS bid), ReentrantLock+Condition parking level, ReadWriteLock/StampedLock, live deadlock detection via ThreadMXBean, lock ordering & tryLock transfers, seat booking with per-seat CAS, token bucket, dining philosophers | deadlock / lock-ordering / tryLock stepper |
| F29 | Thread-safe Singleton | live two-instance race, unsafe publication & why DCL needs volatile, final-field semantics, holder idiom vs enum, init failure (retry vs NoClassDefFoundError), Lazy<T>, per-key singletons, singleton state safety, Snowflake order-ID generator, DI & testing, hot-reload config registry | two-thread interleaving stepper (naive/sync/DCL/volatile/holder) |
| F30 | Producer–consumer | wait/notifyAll bounded buffer, two-Condition buffer (ArrayBlockingQueue internals), BlockingQueue matrix & variants, back-pressure strategies, poison pills/interruption/drainTo, async logger with batching, kitchen PriorityBlockingQueue + DelayQueue retries, Kafka/SQS mapping, semaphore queue, size-or-time batching | bounded blocking queue simulator |
| F31 | Concurrent collections | synchronizedMap lost updates vs CHM.merge, CHM internals, atomic method family (stock reserve + idempotency), computeIfAbsent memoisation & recursive-update trap, CopyOnWriteArrayList listeners, queues table, ConcurrentSkipListMap leaderboard, weakly consistent iteration, thread-safe/striped LRU cache, LongAdder metrics registry | which concurrent collection? picker (10 scenarios) |
| F32 | How to approach a machine-coding round | grading rubric, 90-min timeline, clarify → model → core → harden → demo, worked parking lot in compiling Java (strategies, pricing decorator, domain exceptions, CAS spot claim, demo checks), review Q&A, reusable skeleton per prompt | 90-min time-budget planner + 10 "next move" situations picker |

## Open locally

Any static server works. From this folder, run:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

You can also open `index.html` straight from disk. The diagrams need internet access because Mermaid loads from a CDN.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Teaching App (lesson player) |
| `roadmap.html` | Roadmap hub |
| `assets/data.js` | Shared topic data (modules, lessons, problems and their dependencies), progress storage, Java highlighter and diagram helpers |
| `assets/app.js` | Teaching App logic: slides, widget host, quiz, cheat sheet, practice questions, completion |
| `assets/roadmap.js` | Roadmap logic: module cards, filters, search, progress, charts, diagrams |
| `assets/lessons/manifest.js` | List of written lessons (`LLD_READY`); everything else shows as locked |
| `assets/lesson-kit.js` | Shared lesson builders: `LLD.pattern()` (standard design-pattern lesson layout), `LLD.cd()` (compact class diagrams), and reusable widgets (`picker` classification quiz, `stepper` step-through simulator) |
| `assets/lessons/F0x.js`, `F1x.js`, … | One file per written lesson (see the table above) |
| `assets/style.css` | Styles (shared with the HLD app, plus code-block and practice styles), with light and dark mode following the OS setting |
| `favicon.svg` | Site icon |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |
| `_screens/` | Verification screenshots (not needed for the site) |

## Dependencies

- [Mermaid](https://mermaid.js.org/) **11.4.1**, pinned and loaded from jsDelivr, draws the class diagrams, flowcharts and sequence diagrams. If it fails to load, each diagram falls back to its text source.
- There is no build step, no framework and no other dependencies.

## Adding lessons

1. Create `assets/lessons/<CODE>.js` (for example `F02.js`) that calls `LLD.registerLesson({ code, summary, slides, widget?, examples, pitfalls, quiz, cheatsheet?, practice, recap })`. Use `F03.js` as the template for a concept lesson, or call `LLD.pattern({...})` from `assets/lesson-kit.js` for a design-pattern lesson (intent, UML, Java implementation, mini designs, JDK/Spring usages, when not to use, look-alikes).
2. Slides can have `text`, `points`, `analogy`, `code` (Java), `m` (raw Mermaid source), `table`, and `pros`/`cons`.
3. Add the code to `LLD_READY` in `assets/lessons/manifest.js`. The lesson unlocks in both pages.

## Deploy to GitHub Pages (not done yet)

1. Create a repo, for example `Rishabh10045/lld-studyapp`, and push this folder to the root of its default branch.
2. In the repo, go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch**, then pick `main` and `/ (root)`.
3. The site would appear at `https://rishabh10045.github.io/lld-studyapp/` after a minute or two.
