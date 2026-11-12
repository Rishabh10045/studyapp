/* Shared content for the Java Study Roadmap, the Java Teaching App, the interview page and the FDE page.
   Global namespace: window.JAVA. Storage keys use the "java." prefix so this app can live next to the HLD and LLD apps
   on one origin (planned home: studyapp-site/java/). */
(function () {
  "use strict";
  var PHASES = [
    "Java foundations", "Core APIs & collections", "Functional & modern Java", "Multithreading deep dive", "JVM internals & GC", "Platform APIs", "Working Java",
    "Spring core & Boot", "Web & data", "Security, testing & operations", "Distributed Spring", "Spring AI"];
  var LEVELS = [];
  var LLD = "../lld/index.html#lesson=", HLD = "../index.html#lesson=";

  function J(id, group, name, why, concepts, xref) { return { id: id, name: name, kind: "java", group: group, why: why, concepts: concepts, xref: xref || [] }; }
  function S(id, group, name, why, concepts, xref) { return { id: id, name: name, kind: "spring", group: group, why: why, concepts: concepts, xref: xref || [] }; }

  var TOPICS = [
    /* ---- Module 1 ---- */
    J("basics", "Java foundations", "Java basics & JDK / JRE / JVM", "Every Java interview opens here: how source becomes bytecode becomes running code, and what each tool in the JDK does.", [
      "JDK vs JRE vs JVM; `javac`, `java`, `jshell`, `jar`; single-file source launch (`java Hello.java`)",
      "Compile → bytecode (`.class`) → class loading → interpret + JIT; \"write once, run anywhere\"",
      "`main` method rules, packages, classpath vs module path, JAR manifests",
      "Java versions and LTS releases (8, 11, 17, 21, 25); preview features",
      "Platform-independent bytecode vs platform-specific JVM; HotSpot, OpenJDK builds"]),
    J("types", "Java foundations", "Data types & memory: stack, heap, strings", "Most \"what does this print?\" questions are really about primitives, references, the String pool and where things live in memory.", [
      "8 primitives: sizes, defaults, literals, widening/narrowing, overflow, `char` arithmetic",
      "Stack frames vs heap objects; references; pass-by-value (always)",
      "Wrappers, autoboxing/unboxing, the `Integer` cache (−128..127), `==` vs `equals`, NPE on unboxing",
      "String immutability, the String pool, `intern()`, compile-time constant folding",
      "`StringBuilder` vs `StringBuffer` vs `+` in loops; text blocks preview"]),
    J("oopjava", "Java foundations", "OOP in Java: the Java-specific parts", "OOP concepts are covered in the LLD app; this lesson covers what Java adds: access modifiers, `static`, `final`, initialisation order, nested classes.", [
      "Access modifiers incl. package-private; `static` vs instance; `final` fields, methods, classes",
      "Constructor chaining, `this()`/`super()`, initialisation order (static blocks, instance blocks, fields)",
      "Overloading resolution vs overriding rules (covariant returns, exceptions, visibility)",
      "Interfaces: default, static and private methods; diamond resolution",
      "Static nested, inner, local and anonymous classes"], [["LLD F01 · OOP fundamentals", LLD + "F01"], ["LLD F02 · SOLID", LLD + "F02"]]),
    J("contracts", "Java foundations", "equals, hashCode, compareTo & toString contracts", "Broken contracts cause the hardest collection bugs; interviewers love asking why both must be overridden.", [
      "`equals` contract: reflexive, symmetric, transitive, consistent, null-safe",
      "`hashCode` consistency with `equals`; what breaks in `HashMap`/`HashSet`",
      "`Comparable.compareTo` vs `Comparator`; consistency with equals; `Comparator.comparing().thenComparing()`",
      "Records generate these for you; mutable keys; `getClass()` vs `instanceof` in equals",
      "`Objects.equals`, `Objects.hash`, `toString` conventions"]),
    J("exceptions", "Java foundations", "Exceptions: checked, unchecked, try-with-resources", "Error handling is graded in every code review and every interview coding round.", [
      "`Throwable` hierarchy: `Error` vs `Exception` vs `RuntimeException`; checked vs unchecked",
      "try/catch/finally semantics, `return` in finally, multi-catch, rethrow",
      "try-with-resources, `AutoCloseable`, suppressed exceptions",
      "Custom exceptions, wrapping with causes, exception translation at boundaries",
      "Best practices: don't swallow, don't use for control flow, log once"]),
    /* ---- Module 2 ---- */
    J("generics", "Core APIs & collections", "Generics: bounds, wildcards (PECS), type erasure", "Generic APIs are everywhere in Java; erasure explains half the weird compiler errors.", [
      "Generic classes, methods and type inference (diamond, `var`)",
      "Bounded types `<T extends Comparable<T>>`; multiple bounds",
      "Wildcards `? extends` / `? super`; PECS; why `List<Integer>` is not a `List<Number>`",
      "Type erasure, bridge methods, no `new T()`, no generic arrays; heap pollution, `@SafeVarargs`",
      "Raw types and why to avoid them"]),
    J("lists", "Core APIs & collections", "Collections I: framework, List & Queue internals", "Choosing the right collection (and knowing its complexity) is a standard interview filter.", [
      "Collection hierarchy: `Iterable` → `Collection` → `List`/`Set`/`Queue`/`Deque`; `Map` separate",
      "`ArrayList` internals: backing array, growth (×1.5), amortised add, `ensureCapacity`",
      "`LinkedList` vs `ArrayList` vs `ArrayDeque`: when each wins",
      "`PriorityQueue` as a binary heap; `Comparator`-based ordering; top-K pattern",
      "Immutable/unmodifiable collections: `List.of`, `Collections.unmodifiableList`, `copyOf`"]),
    J("maps", "Core APIs & collections", "Collections II: HashMap internals, Sets & sorted maps", "\"How does HashMap work?\" is one of the most asked Java questions at every level.", [
      "`HashMap`: buckets, hash spreading, index `(n-1) & hash`, load factor 0.75, resize and split",
      "Collisions: linked bins → red-black trees (treeify at 8, table ≥ 64; untreeify at 6)",
      "`HashSet` is a `HashMap`; `LinkedHashMap` insertion/access order and LRU via `removeEldestEntry`",
      "`TreeMap`/`TreeSet`: red-black tree, `NavigableMap` (floor, ceiling, headMap, tailMap)",
      "`EnumMap`, `IdentityHashMap`, `WeakHashMap`; null-key rules per map"]),
    J("iterconc", "Core APIs & collections", "Iteration, fail-fast vs fail-safe & ConcurrentHashMap", "Modifying a collection while iterating is a classic bug and a classic question.", [
      "`Iterator`, `ListIterator`, `forEach`, `removeIf`; `ConcurrentModificationException` and `modCount`",
      "Fail-fast vs fail-safe (snapshot) vs weakly consistent iterators",
      "`ConcurrentHashMap` (Java 8+): CAS bins, per-bin locks, no nulls, atomic `compute`/`merge`",
      "`CopyOnWriteArrayList`, `ConcurrentSkipListMap`, `BlockingQueue` family overview",
      "`Collections.synchronizedX` vs concurrent collections"], [["LLD F31 · Concurrent collections", LLD + "F31"]]),
    /* ---- Module 3 ---- */
    J("lambdas", "Functional & modern Java", "Lambdas & functional interfaces", "Lambdas are the entry point to streams, CompletableFuture and modern Spring code.", [
      "Functional interfaces, `@FunctionalInterface`; `Function`, `Supplier`, `Consumer`, `Predicate`, `BiFunction`, `UnaryOperator`",
      "Lambda syntax, effectively final captures, `this` in lambdas vs anonymous classes",
      "Method references: static, bound, unbound, constructor",
      "Composing: `andThen`, `compose`, `Predicate.and/or/negate`, `Comparator` combinators",
      "Primitive specialisations (`IntFunction`, `ToLongFunction`) and boxing costs"]),
    J("streams", "Functional & modern Java", "Streams API: pipelines, collectors, parallel streams", "Streams are tested in almost every Java coding round (\"group these by X and count\").", [
      "Source → intermediate (lazy) → terminal; short-circuiting; single use",
      "`map`, `filter`, `flatMap`, `distinct`, `sorted`, `limit`, `takeWhile`; `reduce`",
      "Collectors: `toList`, `toMap` (merge function), `groupingBy`, `partitioningBy`, `joining`, `teeing`, downstream collectors",
      "Primitive streams, `IntStream.range`, `boxed`, summary statistics",
      "Parallel streams: ForkJoin common pool, when they help, when they hurt; side-effect pitfalls"]),
    J("optional", "Functional & modern Java", "Optional done right", "A small API with a lot of misuse; good answers show judgement.", [
      "Creating: `of`, `ofNullable`, `empty`; consuming: `map`, `flatMap`, `filter`, `ifPresentOrElse`",
      "`orElse` vs `orElseGet` vs `orElseThrow`",
      "Where to use it (return types) and where not (fields, parameters, collections)",
      "`Optional` with streams (`stream()`, `flatMap(Optional::stream)`)",
      "Null-handling alternatives: `Objects.requireNonNull`, empty collections, null objects"]),
    J("modern17", "Functional & modern Java", "Java 9–17 features: var, records, sealed, switch, text blocks", "Interviewers increasingly expect modern Java; it also makes everyday code much shorter.", [
      "`var` (local type inference) rules and readability limits",
      "Switch expressions with `->` and `yield`; text blocks",
      "Records: compact constructors, validation, immutability caveats",
      "Sealed classes/interfaces and `permits`; pattern matching for `instanceof`",
      "Helpful NPEs, `Stream.toList()`, `String` additions (`isBlank`, `strip`, `lines`, `repeat`)"]),
    J("modern21", "Functional & modern Java", "Java 21 features: pattern matching, sequenced collections, virtual threads", "Java 21 is the current LTS most teams are moving to; know what changed and why.", [
      "Pattern matching for `switch` with guards (`when`), exhaustiveness with sealed types",
      "Record patterns and nested deconstruction",
      "Sequenced collections: `getFirst`, `getLast`, `reversed`",
      "Virtual threads overview (deep dive in the multithreading module)",
      "Preview/incubating APIs to know about: structured concurrency, scoped values, string templates history"]),
    /* ---- Module 4: Multithreading deep dive ---- */
    J("threads", "Multithreading deep dive", "Threads, Runnable & Callable, thread lifecycle", "The foundation for every concurrency question.", [
      "Process vs thread; creating threads (`Thread`, `Runnable`, lambdas); `start` vs `run`",
      "Thread states: NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED",
      "`Callable` and `Future`; `join`, `sleep`, `yield`, interruption and `InterruptedException`",
      "Daemon threads, priorities, thread names, uncaught exception handlers",
      "Race conditions and why `count++` is not atomic"], [["LLD F27 · Threads & executors", LLD + "F27"]]),
    J("executors", "Multithreading deep dive", "ExecutorService & thread pools", "Real code never creates raw threads per task; pools are how Java services run work.", [
      "`Executor`, `ExecutorService`, `submit` vs `execute`, `invokeAll`/`invokeAny`, shutdown and `awaitTermination`",
      "`ThreadPoolExecutor` internals: core/max size, queue choice, keep-alive, rejection policies",
      "`Executors` factory pitfalls (unbounded queues); sizing CPU-bound vs I/O-bound pools",
      "`ScheduledExecutorService`: fixed rate vs fixed delay",
      "Thread factories, naming, and propagating context (MDC)"], [["LLD F27 · Threads & executors", LLD + "F27"]]),
    J("jmm", "Multithreading deep dive", "synchronized, volatile, the JMM & happens-before", "Visibility and ordering bugs are the subtle ones; the JMM vocabulary is what senior interviews probe.", [
      "Intrinsic locks: `synchronized` methods/blocks, reentrancy, monitor per object",
      "Visibility, reordering and the Java Memory Model",
      "Happens-before rules: program order, monitor, volatile, thread start/join, final fields",
      "`volatile`: visibility + ordering, not atomicity; safe publication; double-checked locking",
      "Immutability and thread confinement as the easiest thread safety"], [["LLD F28 · Locks & synchronized", LLD + "F28"], ["LLD F29 · Thread-safe Singleton", LLD + "F29"]]),
    J("locks", "Multithreading deep dive", "Explicit locks: ReentrantLock, ReadWriteLock, StampedLock", "When `synchronized` isn't enough: timeouts, fairness, read-heavy workloads.", [
      "`Lock` API: `lock/unlock` in finally, `tryLock` with timeout, `lockInterruptibly`, fairness",
      "`ReentrantReadWriteLock`: read/write separation, writer starvation, no upgrade",
      "`StampedLock`: optimistic reads and validation, non-reentrant caveats",
      "Choosing between `synchronized`, `ReentrantLock` and lock-free approaches",
      "Lock striping and reducing lock scope"], [["LLD F28 · Locks & synchronized", LLD + "F28"]]),
    J("atomics", "Multithreading deep dive", "Atomics & CAS", "Lock-free counters and state machines; also how many JDK classes work inside.", [
      "`AtomicInteger`/`AtomicLong`/`AtomicReference`; `compareAndSet`, `updateAndGet`, `accumulateAndGet`",
      "CAS loops, ABA problem, `AtomicStampedReference`",
      "`LongAdder`/`LongAccumulator` for contended counters",
      "`VarHandle` basics",
      "When lock-free code is worth it (and when it isn't)"]),
    J("waitnotify", "Multithreading deep dive", "wait/notify, Condition & guarded blocks", "The classic way threads coordinate; still asked in interviews and needed to read older code.", [
      "`wait`, `notify`, `notifyAll` rules: own the monitor, loop on the condition, spurious wakeups",
      "`Condition` with `await/signal`; multiple conditions per lock",
      "Guarded suspension pattern; lost-notification bugs",
      "Why `notifyAll` is usually safer than `notify`",
      "Prefer higher-level utilities (`BlockingQueue`, synchronizers) in new code"], [["LLD F30 · Producer–consumer", LLD + "F30"]]),
    J("synchronizers", "Multithreading deep dive", "Synchronizers: CountDownLatch, CyclicBarrier, Semaphore, Phaser", "Ready-made coordination tools that replace hand-written wait/notify.", [
      "`CountDownLatch`: wait for N events (one-shot)",
      "`CyclicBarrier`: N threads meet repeatedly; barrier action",
      "`Semaphore`: limit concurrent access (connection pools, rate limiting)",
      "`Phaser`: dynamic parties and phases; `Exchanger`",
      "Choosing the right synchronizer; timeouts and broken barriers"]),
    J("completable", "Multithreading deep dive", "CompletableFuture & async composition", "The standard way to compose async calls in modern Java services.", [
      "`supplyAsync`/`runAsync` and which executor runs them",
      "Chaining: `thenApply`, `thenCompose`, `thenCombine`, `thenAccept`; async variants",
      "Fan-out/fan-in with `allOf`/`anyOf`; timeouts with `orTimeout`/`completeOnTimeout`",
      "Error handling: `exceptionally`, `handle`, `whenComplete`",
      "Pitfalls: blocking `join` in pools, common pool starvation, lost exceptions"]),
    J("forkjoin", "Multithreading deep dive", "ForkJoin framework & parallelism", "Divide-and-conquer parallelism and the engine behind parallel streams.", [
      "`ForkJoinPool`, work stealing, `RecursiveTask`/`RecursiveAction`",
      "Fork/compute/join pattern and choosing a threshold",
      "Common pool, its parallelism, and why blocking in it hurts",
      "Parallel streams under the hood; Amdahl's law",
      "Measuring speedup honestly (JMH basics)"]),
    J("threadlocal", "Multithreading deep dive", "ThreadLocal & context propagation", "Used for request context, transactions and date formatters; a common source of leaks.", [
      "`ThreadLocal` and `InheritableThreadLocal` semantics",
      "Typical uses: per-thread formatters, request/user context, MDC logging",
      "Leaks in thread pools and app servers; always `remove()`",
      "Scoped values (Java 21 preview → later) as the virtual-thread-friendly alternative",
      "Propagating context across executors and `CompletableFuture`"]),
    J("vthreads", "Multithreading deep dive", "Virtual threads & structured concurrency", "Java 21's biggest change for server code: thread-per-request at massive scale.", [
      "Platform vs virtual threads; carrier threads, mounting/unmounting",
      "`Thread.ofVirtual()`, `Executors.newVirtualThreadPerTaskExecutor()`",
      "When they help (I/O-bound) and when they don't (CPU-bound); pinning (`synchronized`, native)",
      "Don't pool virtual threads; limit concurrency with semaphores",
      "Structured concurrency (`StructuredTaskScope`, preview) for fork/join of subtasks"], [["LLD F27 · Threads & executors", LLD + "F27"]]),
    J("liveness", "Multithreading deep dive", "Deadlock, livelock & starvation", "Finding and preventing liveness failures is a senior-level must.", [
      "Deadlock conditions (Coffman) and lock ordering",
      "Detecting: thread dumps, `jstack`, `ThreadMXBean.findDeadlockedThreads`",
      "Livelock and backoff with jitter; starvation and fairness",
      "`tryLock` with timeouts; avoiding nested locks and alien method calls under locks",
      "Diagnosing high CPU vs blocked threads in production"], [["LLD F28 · Locks & synchronized", LLD + "F28"]]),
    J("classicmt", "Multithreading deep dive", "Classic problems: producer–consumer, philosophers, odd-even, bounded queue", "The coding questions every concurrency interview draws from.", [
      "Producer–consumer with `wait/notifyAll`, `Condition` and `BlockingQueue`",
      "Bounded blocking queue from scratch",
      "Print odd/even (and FizzBuzz, ABC) with two or three threads",
      "Dining philosophers: deadlock and three fixes",
      "Thread-safe counter, rate limiter and cache as warm-ups"], [["LLD F30 · Producer–consumer", LLD + "F30"], ["LLD F28 · Locks & synchronized", LLD + "F28"]]),
    /* ---- Module 5 ---- */
    J("classloading", "JVM internals & GC", "Class loading & linking", "Explains ClassNotFoundException vs NoClassDefFoundError, static init order and how frameworks load code.", [
      "Load → link (verify, prepare, resolve) → initialise",
      "Bootstrap, platform and application class loaders; parent delegation",
      "Static initialisation order and `<clinit>`; lazy holder idiom",
      "`ClassNotFoundException` vs `NoClassDefFoundError`; custom class loaders and leaks",
      "Modules (JPMS) at a glance"]),
    J("jvmmemory", "JVM internals & GC", "JVM memory areas & the JIT", "Know where objects, stacks, metadata and code live, and how hot code gets fast.", [
      "Heap (young/old), thread stacks, Metaspace, code cache, direct memory",
      "Object layout: header, compressed oops, alignment; escape analysis",
      "`StackOverflowError` vs `OutOfMemoryError` variants",
      "Interpreter → C1 → C2 tiered compilation; inlining, deoptimisation; warm-up",
      "Inspecting a running JVM: `jcmd`, `jstat`, JFR, `-Xlog`"]),
    J("gc", "JVM internals & GC", "Garbage collection: generations, G1, ZGC", "GC questions separate people who run Java in production from people who only write it.", [
      "Reachability, GC roots, mark–sweep–compact, generational hypothesis",
      "Young/old generations, minor vs major/full GC, promotion",
      "Collectors: Serial, Parallel, G1 (default), ZGC, Shenandoah; pause vs throughput trade-offs",
      "Reading GC logs (`-Xlog:gc*`)",
      "Reference types: strong, soft, weak, phantom; `Cleaner`"]),
    J("gctuning", "JVM internals & GC", "GC tuning basics & memory leaks", "Practical skills: sizing heaps, finding leaks and fixing OOMs.", [
      "Heap sizing (`-Xms`, `-Xmx`, container awareness), pause goals (`MaxGCPauseMillis`)",
      "Common leaks: static collections, caches without bounds, listeners, `ThreadLocal`, class loaders",
      "Heap dumps (`jcmd GC.heap_dump`, `-XX:+HeapDumpOnOutOfMemoryError`) and analysis (Eclipse MAT)",
      "Allocation rate, object churn, and when to tune vs fix code",
      "A step-by-step OOM investigation"]),
    /* ---- Module 6 ---- */
    J("io", "Platform APIs", "I/O & NIO basics", "Reading files, streaming data and understanding blocking vs non-blocking I/O.", [
      "Byte vs character streams, buffering, charsets",
      "NIO.2 `Path`/`Files`: read/write, walk, watch service",
      "Channels and buffers; memory-mapped files",
      "Blocking vs non-blocking I/O, selectors (why Netty exists)",
      "Closing resources and handling large files"]),
    J("reflection", "Platform APIs", "Reflection & annotations", "How Spring, JUnit and Jackson do their magic, and what it costs.", [
      "`Class`, `Field`, `Method`, `Constructor`; `setAccessible` and modules",
      "Writing custom annotations; retention and targets",
      "Processing annotations at runtime vs compile time (annotation processors)",
      "Dynamic proxies (`java.lang.reflect.Proxy`) and how frameworks use them",
      "Performance and security trade-offs; `MethodHandle`"], [["LLD F13 · Proxy", LLD + "F13"]]),
    J("serialization", "Platform APIs", "Serialization: Java, JSON & safe alternatives", "Serialization shows up in caching, messaging and security questions.", [
      "`Serializable`, `serialVersionUID`, `transient`, custom `readObject`/`writeObject`",
      "Why Java serialization is a security risk; serialization filters",
      "Singletons and enums under serialization; `readResolve`",
      "JSON with Jackson: annotations, records, polymorphic types",
      "Binary formats (Protobuf, Avro) and schema evolution"]),
    /* ---- Module 7 ---- */
    J("idioms", "Working Java", "Java design idioms: immutability, builders, static factories", "Effective Java in practice: the idioms reviewers expect in production code.", [
      "Immutable classes and defensive copies",
      "Static factory methods vs constructors; naming (`of`, `from`, `valueOf`)",
      "Builders for many optional parameters",
      "Composition over inheritance; programming to interfaces",
      "Enums as strategies and singletons; `try`-with-resources everywhere"], [["LLD F08 · Builder", LLD + "F08"], ["LLD F05 · Singleton", LLD + "F05"]]),
    J("testing", "Working Java", "Testing basics: JUnit 5 & Mockito", "Every team expects tested code, and many interviews ask you to write a test.", [
      "JUnit 5: `@Test`, assertions, `@BeforeEach`, `@ParameterizedTest`, `@Nested`, `assertThrows`",
      "AssertJ fluent assertions",
      "Mockito: mocks vs stubs vs spies, `when/thenReturn`, `verify`, argument captors",
      "Testing time, randomness and concurrency; test doubles via DI",
      "Test pyramid: unit, integration, contract, end-to-end"]),

    /* ======== Spring Boot track ======== */
    S("ioc", "Spring core & Boot", "Spring core: IoC, DI, beans, scopes & lifecycle", "Everything in Spring is a bean; understanding the container answers most Spring interview questions.", [
      "IoC container, `ApplicationContext`, component scanning, `@Configuration` + `@Bean`",
      "Constructor vs setter vs field injection; `@Qualifier`, `@Primary`; circular dependencies",
      "Scopes: singleton, prototype, request, session; injecting prototypes into singletons",
      "Lifecycle: `@PostConstruct`, `@PreDestroy`, `BeanPostProcessor`, `SmartLifecycle`",
      "AOP proxies (JDK vs CGLIB) and the self-invocation trap"], [["LLD F13 · Proxy", LLD + "F13"]]),
    S("boot", "Spring core & Boot", "Spring Boot: auto-configuration & starters", "Boot's magic is conditional configuration; knowing how it decides is the senior answer.", [
      "Starters and dependency management (BOM)",
      "`@SpringBootApplication` = configuration + auto-configuration + component scan",
      "Conditional annotations (`@ConditionalOnClass`, `@ConditionalOnMissingBean`, `@ConditionalOnProperty`)",
      "Seeing what was configured: `--debug` condition report, Actuator `conditions`",
      "Writing your own auto-configuration and starter"]),
    S("config", "Spring core & Boot", "Profiles & externalised configuration", "Same build, many environments: how config is layered and overridden.", [
      "`application.yml`/`.properties`, property source precedence, env vars, command-line args",
      "Profiles: `spring.profiles.active`, profile-specific files, `@Profile`",
      "`@ConfigurationProperties` with validation vs `@Value`",
      "Secrets: environment, vaults, config servers; never in Git",
      "Config for containers and Kubernetes"]),
    S("rest", "Web & data", "REST controllers with Spring MVC", "The everyday job: designing and implementing HTTP APIs.", [
      "`@RestController`, mappings, path variables, query params, request bodies",
      "`ResponseEntity`, status codes, content negotiation, Jackson",
      "API design: resources, pagination, idempotency, versioning",
      "Filters vs interceptors; CORS",
      "`RestClient`/`WebClient` for calling other services"]),
    S("validation", "Web & data", "Validation & exception handling", "Clean errors and validated input are what make APIs production-grade.", [
      "Bean Validation (`@Valid`, `@NotNull`, `@Size`, custom constraints, groups)",
      "`@ControllerAdvice` + `@ExceptionHandler`; mapping domain exceptions to HTTP",
      "Problem Details (RFC 9457) with `ProblemDetail`",
      "Validation in services vs controllers",
      "Logging and correlation IDs for errors"]),
    S("jpa", "Web & data", "Spring Data JPA & Hibernate", "Most Java services talk to a relational database through JPA; its pitfalls are interview staples.", [
      "Entities, relationships, fetch types, cascades, `orphanRemoval`",
      "Repositories, derived queries, `@Query`, projections, pagination",
      "N+1 problem and fixes (fetch joins, `@EntityGraph`, batch size)",
      "Persistence context, dirty checking, first-level cache; `LazyInitializationException`",
      "Schema migrations with Flyway/Liquibase"]),
    S("tx", "Web & data", "Transactions: @Transactional, propagation & isolation", "Getting transactions wrong corrupts data; propagation and isolation are favourite questions.", [
      "`@Transactional` via proxies; self-invocation and private-method traps",
      "Propagation: REQUIRED, REQUIRES_NEW, NESTED, SUPPORTS, MANDATORY…",
      "Isolation levels and anomalies (dirty, non-repeatable, phantom reads)",
      "Rollback rules (checked vs unchecked), read-only transactions",
      "Optimistic (`@Version`) vs pessimistic locking"]),
    /* ---- Security, testing & ops ---- */
    S("security", "Security, testing & operations", "Spring Security: authentication, JWT & OAuth2", "Every real API needs auth; Security's filter chain is often misunderstood.", [
      "Security filter chain, `SecurityFilterChain` bean, authentication vs authorisation",
      "Password encoding, `UserDetailsService`, method security (`@PreAuthorize`)",
      "Stateless JWT resource servers; validating tokens",
      "OAuth2/OIDC login and resource server roles",
      "CSRF, CORS, and common misconfigurations"]),
    S("springtest", "Security, testing & operations", "Testing Spring apps: slices, MockMvc, Testcontainers", "Fast, reliable tests for controllers, repositories and integrations.", [
      "`@SpringBootTest` vs test slices (`@WebMvcTest`, `@DataJpaTest`)",
      "MockMvc and `@MockitoBean`",
      "Testcontainers for real databases and Kafka; `@ServiceConnection`",
      "Testing security and transactions",
      "Keeping the test suite fast"]),
    S("actuator", "Security, testing & operations", "Actuator & observability", "Health checks, metrics and traces are how you run services, not just write them.", [
      "Actuator endpoints: health, info, metrics, env, loggers; securing them",
      "Micrometer metrics, Prometheus scraping, custom meters",
      "Tracing with Micrometer Tracing / OpenTelemetry; correlation in logs",
      "Liveness vs readiness probes",
      "Structured logging"]),
    S("caching", "Security, testing & operations", "Caching with Spring", "The cheapest performance win, and a common source of stale-data bugs.", [
      "`@EnableCaching`, `@Cacheable`, `@CachePut`, `@CacheEvict`; cache keys",
      "Caffeine (local) vs Redis (distributed)",
      "TTLs, eviction, stampede protection",
      "Proxy limitations (self-invocation) and caching nulls",
      "What not to cache"]),
    S("async", "Security, testing & operations", "@Async & @Scheduled", "Background work inside a Spring app: thread pools, schedules and their traps.", [
      "`@EnableAsync`, `@Async` return types, configuring the executor",
      "`@Scheduled` fixedRate/fixedDelay/cron; scheduler pool size",
      "Running schedules once in a cluster (ShedLock)",
      "Exceptions and transactions in async methods",
      "Virtual threads in Spring Boot (`spring.threads.virtual.enabled`)"]),
    /* ---- Distributed ---- */
    S("kafka", "Distributed Spring", "Messaging with Kafka & Spring", "Event-driven integration between services.", [
      "Kafka basics: topics, partitions, consumer groups, offsets",
      "`KafkaTemplate` and `@KafkaListener`; serialisation",
      "Delivery semantics, idempotent producers, retries and dead-letter topics",
      "Transactional outbox pattern",
      "Testing with embedded Kafka / Testcontainers"]),
    S("cloud", "Distributed Spring", "Microservices with Spring Cloud: config, gateway, resilience", "The building blocks for a fleet of services.", [
      "Spring Cloud Config and service discovery",
      "Spring Cloud Gateway: routing, filters, rate limiting",
      "Resilience4j: circuit breaker, retry, bulkhead, time limiter",
      "Distributed tracing across services",
      "When not to split into microservices"]),
    S("webflux", "Distributed Spring", "WebFlux & reactive basics", "Reactive stacks still power gateways and streaming APIs; know when they fit.", [
      "Reactor `Mono`/`Flux`, operators, back-pressure",
      "WebFlux controllers vs functional routes; `WebClient`",
      "Never block on an event loop",
      "Reactive vs virtual threads: choosing in 2026",
      "Testing with `StepVerifier`"]),
    S("deploy", "Distributed Spring", "Docker & deployment", "Shipping a Spring Boot service: images, config and runtime tuning.", [
      "Executable JARs, layered jars, Buildpacks (`bootBuildImage`) vs Dockerfiles",
      "JVM in containers: memory limits, `-XX:MaxRAMPercentage`, CPU",
      "Health probes, graceful shutdown, config via env",
      "CI/CD basics; Kubernetes deployment essentials",
      "GraalVM native images: trade-offs"]),
    /* ---- Spring AI ---- */
    S("chatclient", "Spring AI", "Spring AI: ChatClient, prompts & templates", "The fluent entry point for calling LLMs from Spring.", [
      "`ChatModel` vs `ChatClient`; the auto-configured `ChatClient.Builder`",
      "`prompt().system(...).user(...).call().content()` and `stream()`",
      "Prompt templates with parameters (`PromptTemplate`, `StTemplateRenderer`)",
      "Defaults on the builder: `defaultSystem`, `defaultOptions`, `defaultAdvisors`",
      "`ChatResponse` metadata: token usage"]),
    S("structured", "Spring AI", "Structured output", "Turning model text into typed Java objects safely.", [
      "`.call().entity(MyRecord.class)` and `ParameterizedTypeReference` for lists",
      "`BeanOutputConverter`, `MapOutputConverter`, `ListOutputConverter`",
      "Schema validation and provider-native structured output options",
      "Handling invalid or partial outputs; retries",
      "Designing records for LLM output"]),
    S("embeddings", "Spring AI", "Embeddings & vector stores", "The storage layer for semantic search and RAG.", [
      "`EmbeddingModel` and what an embedding is",
      "`VectorStore` abstraction: `add`, `similaritySearch(SearchRequest)`, metadata filters",
      "ETL: document readers, `TokenTextSplitter`, chunking strategies",
      "PGvector, Redis, and other stores; choosing dimensions and distance",
      "Re-indexing and versioning embeddings"]),
    S("rag", "Spring AI", "RAG with Spring AI", "Grounding answers in your own data.", [
      "`QuestionAnswerAdvisor` for simple RAG",
      "`RetrievalAugmentationAdvisor` with `VectorStoreDocumentRetriever`",
      "Query transformers and expanders (rewrite, compression, multi-query)",
      "Empty-context handling, filters per tenant, citing sources",
      "Measuring retrieval quality"], [["HLD: system design lessons", "../roadmap.html"]]),
    S("tools", "Spring AI", "Tool calling", "Letting models call your Java methods safely.", [
      "`@Tool` and `@ToolParam` methods; `.tools(...)` on a request",
      "`ToolCallback`, `MethodToolCallback`, `FunctionToolCallback`",
      "Tool context, returning results, error handling",
      "Security: least privilege, confirmation for side effects, input validation",
      "User-controlled tool execution loops"]),
    S("memory", "Spring AI", "Advisors & chat memory", "Cross-cutting behaviour around model calls: memory, logging, guardrails.", [
      "Advisor chain and ordering",
      "`ChatMemory`, `MessageWindowChatMemory`, `ChatMemoryRepository` (in-memory, JDBC…)",
      "`MessageChatMemoryAdvisor` and the conversation id parameter",
      "`SimpleLoggerAdvisor` and observability",
      "Writing a custom advisor"]),
    S("mcp", "Spring AI", "MCP with Spring AI", "Model Context Protocol: exposing and consuming tools across apps.", [
      "MCP concepts: clients, servers, tools, resources, prompts; transports (STDIO, Streamable-HTTP, SSE)",
      "MCP client and server Boot starters",
      "Annotation-based servers (`@McpTool`, `@McpResource`, `@McpPrompt`)",
      "Securing MCP servers",
      "Connecting MCP tools to `ChatClient`"]),
    S("aieval", "Spring AI", "Evaluating AI features", "LLM features need tests too: relevance, faithfulness and regressions.", [
      "`Evaluator`, `EvaluationRequest`, `EvaluationResponse`",
      "`RelevancyEvaluator` and `FactCheckingEvaluator`",
      "Golden datasets and regression suites in CI",
      "Observability: tokens, latency, cost per request",
      "Human review loops"])
  ];


  var BY_ID = {};
  TOPICS.forEach(function (t) { BY_ID[t.id] = t; });
  var FUNDS = TOPICS;
  var PROBS = [];
  var JAVA_T = TOPICS.filter(function (t) { return t.kind === "java"; }), SPRING_T = TOPICS.filter(function (t) { return t.kind === "spring"; });
  /* J01.. for the Java track, S01.. for the Spring Boot track. */
  function code(t) {
    var list = t.kind === "spring" ? SPRING_T : JAVA_T;
    var n = list.indexOf(t) + 1;
    return (t.kind === "spring" ? "S" : "J") + (n < 10 ? "0" : "") + n;
  }
  function usedBy(id) { return PROBS.filter(function (p) { return (p.deps || []).indexOf(id) >= 0; }); }

  /* Progress shared by both pages, kept in this browser's localStorage.
     Keys use the "java." prefix so they never collide with the HLD/LLD apps on the same origin. */
  var KEY = "java.done.v1";
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
  function isReady(c) { return (window.JAVA_READY || []).indexOf(c) >= 0; }

  window.JAVA = {
    registerLesson: registerLesson, lessons: REG, byCode: byCode, isReady: isReady,
    PHASES: PHASES, LEVELS: LEVELS, JAVA_T: JAVA_T, SPRING_T: SPRING_T, LLD_BASE: LLD, HLD_BASE: HLD, GROUPS: PHASES.concat(LEVELS), TOPICS: TOPICS, BY_ID: BY_ID, FUNDS: FUNDS, PROBS: PROBS,
    code: code, usedBy: usedBy, getDone: getDone, isDone: isDone, setDone: setDone, load: load, save: save,
    esc: esc, md: md, highlight: highlight, codeBlock: codeBlock, flow: flow, renderDiagram: renderDiagram
  };
})();
