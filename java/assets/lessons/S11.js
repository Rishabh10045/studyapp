/* Lesson S11: Caching with Spring */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded from a real Spring Boot 3.4 app: CaffeineCacheManager (recordStats), a Catalog service with @Cacheable/@CachePut/@CacheEvict,
  // and a ProductRepo whose load() sleeps 200 ms and counts calls. Each step shows the measured time and how many repository loads it caused.
  var REC = {"scenarios":[{"key":"basic","steps":[{"call":"find(1)","ms":213,"dbLoads":1,"hit":false,"result":"Product[id=1, name=Masala dosa, price=120]"},{"call":"find(1)","ms":0,"dbLoads":0,"hit":true,"result":"Product[id=1, name=Masala dosa, price=120]"},{"call":"find(2)","ms":200,"dbLoads":1,"hit":false,"result":"Product[id=2, name=Filter coffee, price=40]"},{"call":"find(1)","ms":0,"dbLoads":0,"hit":true,"result":"Product[id=1, name=Masala dosa, price=120]"}],"note":"First call per key loads from the repository (~200 ms); repeats come from Caffeine in microseconds."},{"key":"self","steps":[{"call":"findViaSelf(1)","ms":200,"dbLoads":1,"hit":false,"result":"Product[id=1, name=Masala dosa, price=120]"},{"call":"findViaSelf(1)","ms":200,"dbLoads":1,"hit":false,"result":"Product[id=1, name=Masala dosa, price=120]"},{"call":"find(1)","ms":200,"dbLoads":1,"hit":false,"result":"Product[id=1, name=Masala dosa, price=120]"},{"call":"find(1)","ms":0,"dbLoads":0,"hit":true,"result":"Product[id=1, name=Masala dosa, price=120]"}],"note":"findViaSelf calls this.find() inside the bean, so the proxy and its cache advice are skipped: every call hits the repository."},{"key":"stale","steps":[{"call":"find(1)","ms":200,"dbLoads":1,"hit":false,"result":"Product[id=1, name=Masala dosa, price=120]"},{"call":"saveNoCache(price 150)","ms":0,"dbLoads":0,"hit":true,"result":"Product[id=1, name=Masala dosa, price=150]"},{"call":"find(1)","ms":0,"dbLoads":0,"hit":true,"result":"Product[id=1, name=Masala dosa, price=120]"},{"call":"evict(1)","ms":17,"dbLoads":0,"hit":true,"result":"evicted"},{"call":"find(1)","ms":200,"dbLoads":1,"hit":false,"result":"Product[id=1, name=Masala dosa, price=150]"},{"call":"save(price 160) @CachePut","ms":4,"dbLoads":0,"hit":true,"result":"Product[id=1, name=Masala dosa, price=160]"},{"call":"find(1)","ms":0,"dbLoads":0,"hit":true,"result":"Product[id=1, name=Masala dosa, price=160]"}],"note":"Updating the database without touching the cache serves the old price (120) until eviction; @CachePut writes the new value through."},{"key":"ttl","steps":[{"call":"findTtl(1)","ms":200,"dbLoads":1,"hit":false,"result":"Product[id=1, name=Masala dosa, price=160]"},{"call":"findTtl(1)","ms":0,"dbLoads":0,"hit":true,"result":"Product[id=1, name=Masala dosa, price=160]"},{"call":"findTtl(1) after 600 ms","ms":200,"dbLoads":1,"hit":false,"result":"Product[id=1, name=Masala dosa, price=160]"},{"call":"findTtl(1)","ms":0,"dbLoads":0,"hit":true,"result":"Product[id=1, name=Masala dosa, price=160]"}],"note":"expireAfterWrite(500 ms): the entry disappears after its TTL and the next call reloads."},{"key":"stampede","steps":[{"call":"20 threads call find(2) on a cold key","ms":206,"dbLoads":20,"hit":false,"result":"sync = false"}],"note":"Without sync, every thread that misses loads the value itself: a cache stampede on the database."},{"key":"stampede_sync","steps":[{"call":"20 threads call findSync(2) on a cold key","ms":213,"dbLoads":1,"hit":false,"result":"sync = true"}],"note":"With sync = true only one thread loads; the other 19 wait for its value."},{"key":"nulls","steps":[{"call":"findMaybe(99)","ms":200,"dbLoads":1,"hit":false,"result":"null"},{"call":"findMaybe(99)","ms":0,"dbLoads":0,"hit":true,"result":"null"},{"call":"findNoNull(99)","ms":201,"dbLoads":1,"hit":false,"result":"null"},{"call":"findNoNull(99)","ms":200,"dbLoads":1,"hit":false,"result":"null"}],"note":"Caffeine caches null by default (allowNullValues), so a missing id is remembered; unless = \"#result == null\" skips caching it."},{"key":"keys","steps":[{"call":"search(\"dosa\", 1)","ms":1,"dbLoads":1,"hit":false,"result":"[Product[id=9, name=dosa p1, price=1]]"},{"call":"search(\"dosa\", 1)","ms":0,"dbLoads":0,"hit":true,"result":"[Product[id=9, name=dosa p1, price=1]]"},{"call":"search(\"dosa\", 2)","ms":0,"dbLoads":1,"hit":false,"result":"[Product[id=9, name=dosa p2, price=1]]"}],"note":"With several parameters the default key is SimpleKey [dosa,1]; every argument is part of the key."}],"keys":["SimpleKey SimpleKey [dosa, 1]","SimpleKey SimpleKey [dosa, 2]"],"stats":{"products":{"misses":25,"hits":5,"evictions":0,"hitRate":0.17},"productsSync":{"misses":1,"hits":19,"evictions":0,"hitRate":0.95},"ttl":{"misses":2,"hits":2,"evictions":1,"hitRate":0.5}},"metrics":["cache.gets{cache=products,result=miss} 25.0","cache.gets{cache=products,result=hit} 5.0"]};
  var SC = [
    { k: "basic", label: "Hit vs miss", code: "@Cacheable(\"products\")\npublic Product find(long id) { return repo.load(id); }" },
    { k: "self", label: "Self-invocation", code: "public Product findViaSelf(long id) {\n    return find(id);   // this.find(): no proxy, no cache\n}" },
    { k: "stale", label: "Stale data", code: "public Product saveNoCache(Product p) { repo.save(p); return p; }\n@CacheEvict(cacheNames = \"products\", key = \"#id\") public void evict(long id) { }\n@CachePut(cacheNames = \"products\", key = \"#p.id\") public Product save(Product p) { ... }" },
    { k: "ttl", label: "TTL expiry", code: "m.registerCustomCache(\"ttl\", Caffeine.newBuilder()\n    .expireAfterWrite(Duration.ofMillis(500)).build());" },
    { k: "stampede", label: "Stampede (sync = false)", code: "@Cacheable(\"products\")   // 20 threads, cold key\npublic Product find(long id) { ... }" },
    { k: "stampede_sync", label: "Stampede (sync = true)", code: "@Cacheable(cacheNames = \"productsSync\", sync = true)\npublic Product findSync(long id) { ... }" },
    { k: "nulls", label: "Caching null", code: "@Cacheable(\"nullable\") public Product findMaybe(long id) { ... }\n@Cacheable(cacheNames = \"nonNull\", unless = \"#result == null\")\npublic Product findNoNull(long id) { ... }" },
    { k: "keys", label: "Multi-arg keys", code: "@Cacheable(\"search\")\npublic List<Product> search(String q, int page) { ... }" }
  ];
  function s11Widget(el, ctx) {
    var s = ctx.state; if (!s.k) s.k = "stale";
    el.innerHTML = "<div class='btnrow'>" + SC.map(function (x) { return "<button type='button' class='btn' data-k='" + x.k + "'>" + x.label + "</button>"; }).join("") + "</div><div data-r='out' style='margin-top:10px'></div>" +
      "<div style='margin-top:12px'><b>Cache statistics after all scenarios</b> (Caffeine <code>recordStats()</code>, also published by Boot as the <code>cache.gets</code> metric):</div>" +
      "<div class='tablewrap'><table style='font-size:13px'><tr><th>cache</th><th>hits</th><th>misses</th><th>hit rate</th><th>evictions</th></tr>" +
      Object.keys(REC.stats).map(function (c) { var x = REC.stats[c]; return "<tr><td>" + c + "</td><td>" + x.hits + "</td><td>" + x.misses + "</td><td>" + x.hitRate + "</td><td>" + x.evictions + "</td></tr>"; }).join("") + "</table></div>" +
      "<pre class='code' style='font-size:12px'>" + ctx.esc(REC.metrics.join("\n")) + "</pre>";
    var out = el.querySelector("[data-r='out']");
    function tag(st) {
      if (/^(save|evict)/.test(st.call)) return ["WRITE", "#1d4ed8", "#dbeafe"];
      if (st.dbLoads === 0) return ["HIT", "#166534", "#dcfce7"];
      return ["MISS", "#b91c1c", "#fee2e2"];
    }
    function draw() {
      var x = SC.filter(function (y) { return y.k === s.k; })[0], r = REC.scenarios.filter(function (y) { return y.key === s.k; })[0];
      el.querySelectorAll("button[data-k]").forEach(function (b) { b.classList.toggle("primary", b.dataset.k === s.k); });
      var max = Math.max.apply(null, r.steps.map(function (t) { return t.ms; }).concat([1]));
      var html = "<pre class='code' style='font-size:12px'>" + ctx.esc(x.code) + "</pre><div class='tablewrap'><table style='font-size:13px'><tr><th>#</th><th>call</th><th></th><th>time</th><th>DB loads</th><th>returned</th></tr>";
      r.steps.forEach(function (t, i) {
        var g = tag(t), w = Math.max(2, Math.round(160 * t.ms / max));
        html += "<tr><td>" + (i + 1) + "</td><td><code>" + ctx.esc(t.call) + "</code></td><td><span style='padding:1px 8px;border-radius:8px;font-weight:700;color:" + g[1] + ";background:" + g[2] + "'>" + g[0] + "</span></td>" +
          "<td><div style='display:flex;align-items:center;gap:6px'><div style='height:10px;width:" + w + "px;background:" + g[1] + ";border-radius:3px'></div>" + t.ms + " ms</div></td>" +
          "<td style='text-align:center;font-weight:700'>" + t.dbLoads + "</td><td style='font-size:12px'>" + ctx.esc(t.result.replace("Product[", "[")) + "</td></tr>";
      });
      html += "</table></div>";
      if (s.k === "keys") html += "<div style='font-size:12px'>Keys in the <code>search</code> cache: " + REC.keys.map(function (k) { return "<code>" + ctx.esc(k) + "</code>"; }).join(", ") + "</div>";
      out.innerHTML = html + "<div class='result'>" + ctx.md(r.note) + "</div>";
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (!b) return; s.k = b.dataset.k; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Why cache, and the cache-aside pattern",
      text: "A cache keeps the result of an expensive call (a database query, a remote API, a heavy computation) in fast memory so repeated requests skip the work. The usual pattern is **cache-aside**: look in the cache; on a **hit** return the value; on a **miss** load it from the source, store it, and return it. Caching trades **freshness** for **speed**, so every cache needs an answer to *how stale can this be?*. Spring's cache abstraction hides the get/put plumbing behind annotations, but underneath it is exactly this pattern, as the programmatic `Cache.get(key, loader)` call below shows.",
      m: M(["flowchart LR",
        "  A[\"caller\"]:::s1 --> C{\"in cache?\"}:::s2",
        "  C -->|hit| R[\"return cached value\"]:::s4",
        "  C -->|miss| D[\"load from DB / API\"]:::s3",
        "  D --> P[\"put in cache\"]:::s2",
        "  P --> R",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#fff3e0,stroke:#ef6c00", "  classDef s3 fill:#ffebee,stroke:#c62828", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `CacheManager manager = new ConcurrentMapCacheManager("prices");
var cache = manager.getCache("prices");
int[] dbCalls = {0};
for (String item : List.of("dosa", "dosa", "idli", "dosa")) {
    Integer price = cache.get(item, () -> { dbCalls[0]++; return item.equals("dosa") ? 120 : 60; });
    System.out.println(item + " -> " + price + "  (db calls so far: " + dbCalls[0] + ")");
}`,
      analogy: "A cache is the tiffin box on your desk: walking to the canteen (the database) every time you are hungry is slow, so you keep a bit nearby, accepting that it was packed this morning." },
    { title: "@EnableCaching and @Cacheable",
      text: "Put `@EnableCaching` on a configuration class and annotate methods with **`@Cacheable(\"cacheName\")`**. Spring wraps the bean in a **proxy**: before the method runs, it computes a key from the arguments and checks the cache; on a hit the method body is **never executed**. Boot auto-configures a `CacheManager` from what is on the classpath (Caffeine, Redis, JCache, Hazelcast…), falling back to a simple `ConcurrentHashMap`. Only `public` methods called **through the proxy** are cached. The widget's *Hit vs miss* scenario shows 200 ms for a miss and 0 ms for a hit.",
      code: `@Service class RateService {
    int calls;
    @Cacheable("rates") public double rate(String currency) {
        calls++;
        try { Thread.sleep(100); } catch (InterruptedException e) { }
        return currency.equals("USD") ? 83.2 : 90.1;
    }
    public int calls() { return calls; }
}
@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).properties("spring.cache.cache-names=rates").run();
RateService rates = ctx.getBean(RateService.class);
for (String c : List.of("USD", "USD", "EUR", "USD")) {
    long t = System.nanoTime(); double r = rates.rate(c);
    System.out.printf("%s %.1f in %d ms%n", c, r, (System.nanoTime() - t) / 1_000_000);
}
System.out.println("method calls: " + rates.calls() + ", bean class: " + rates.getClass().getSimpleName());
System.out.println("cache manager: " + ctx.getBean(CacheManager.class).getClass().getSimpleName());
ctx.close();`,
      analogy: "The proxy is a receptionist who remembers answers: if someone asked the same question already, they answer without disturbing the expert." },
    { title: "Cache keys, condition and unless",
      text: "By default the key is built from **all** arguments: one argument is the key itself; several become a `SimpleKey [a, b]`; none uses `SimpleKey.EMPTY`. Choose keys deliberately with **SpEL**: `key = \"#userId\"`, `key = \"#req.city + ':' + #req.page\"`, or a custom `KeyGenerator`. `condition` decides **before** the call whether to use the cache at all; `unless` decides **after** the call whether to store the result (it can see `#result`). Two classic bugs: leaving out an argument that changes the result (wrong answers for other users), and including something unique like a timestamp (a 0% hit rate).",
      table: [["Attribute", "Evaluated", "Example"],
        ["key", "before", "`#id`, `#user.id + '-' + #lang`"],
        ["condition", "before (skip cache if false)", "`#q.length() > 2`"],
        ["unless", "after (don't store if true)", "`#result == null`, `#result.isEmpty()`"],
        ["sync", "load once per key", "`sync = true`"]],
      code: `@Service class SearchService {
    List<String> log = new ArrayList<>();
    @Cacheable(cacheNames = "search", key = "#city + ':' + #page", condition = "#page < 3")
    public String search(String city, int page, String requestId) { log.add(city + "/" + page); return city + " page " + page; }
    public List<String> log() { return log; }
}
@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var svc = ctx.getBean(SearchService.class);
svc.search("Pune", 1, "r1"); svc.search("Pune", 1, "r2"); svc.search("Pune", 2, "r3"); svc.search("Pune", 5, "r4"); svc.search("Pune", 5, "r5");
System.out.println("executed: " + svc.log());
var nativeCache = (com.github.benmanes.caffeine.cache.Cache<?, ?>) ctx.getBean(CacheManager.class).getCache("search").getNativeCache();
System.out.println("keys: " + nativeCache.asMap().keySet());
ctx.close();`,
      analogy: "A key is the label on a jar: label it 'sugar' and you'll find it again; label it 'sugar, 10:42:07' and you'll never reuse it; label it just 'white' and someone gets salt." },
    { title: "@CachePut, @CacheEvict and @Caching",
      text: "Reads are easy; **writes** are where caches go wrong. When the data changes you must update or remove the cached copy. **`@CachePut`** always runs the method and stores its result (write-through for that key). **`@CacheEvict`** removes a key, or everything with `allEntries = true`; `beforeInvocation = true` evicts even if the method throws. **`@Caching`** groups several operations, e.g. put by id and evict the list cache. The widget's *Stale data* scenario shows the bug: the price changed to 150 in the database but the cache kept serving 120 until it was evicted.",
      code: `record Product(long id, String name, int price) { }
@Service class Catalog {
    final Map<Long, Product> db = new HashMap<>(Map.of(1L, new Product(1, "Dosa", 120)));
    @Cacheable("product") public Product get(long id) { return db.get(id); }
    public void updateWithoutCache(Product p) { db.put(p.id(), p); }
    @CachePut(cacheNames = "product", key = "#p.id") public Product update(Product p) { db.put(p.id(), p); return p; }
    @CacheEvict(cacheNames = "product", key = "#id") public void delete(long id) { db.remove(id); }
}
@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var c = ctx.getBean(Catalog.class);
System.out.println("read      : " + c.get(1));
c.updateWithoutCache(new Product(1, "Dosa", 150));
System.out.println("stale read: " + c.get(1));
c.update(new Product(1, "Dosa", 160));
System.out.println("after put : " + c.get(1));
c.delete(1);
System.out.println("after evict: " + c.get(1));
ctx.close();`,
      analogy: "When the menu price changes, someone must also fix the price board outside; otherwise customers keep reading yesterday's price." },
    { title: "Under the hood: proxies and self-invocation",
      text: "`@Cacheable` is implemented with Spring AOP, just like `@Transactional` (S05). Callers get a **proxy** whose `CacheInterceptor` does the lookup. A call from **inside** the same object (`this.find(id)`) goes straight to the target and **skips the cache**; so do `private` methods and objects created with `new`. Fixes: move the cached method to another bean, or inject the bean's own proxy (`@Lazy @Autowired Self self`). A related surprise: the CGLIB proxy is a subclass with its **own, empty fields**, so read a bean's state through methods, never `bean.field`. The widget's *Self-invocation* scenario shows two calls of `findViaSelf` each taking 200 ms, and the following `find(1)` still missing because nothing had been cached.",
      m: M(["flowchart LR",
        "  C[\"Controller\"]:::s1 --> P[\"Catalog proxy<br/>CacheInterceptor\"]:::s2",
        "  P -->|miss| T[\"Catalog target\"]:::s4",
        "  T -.->|this.find| T",
        "  P <--> K[(\"cache\")]:::s3",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s2 fill:#fff3e0,stroke:#ef6c00", "  classDef s3 fill:#f3e5f5,stroke:#7b1fa2", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `@Service class Prices {
    int loads;
    @Cacheable("price") public int price(String item) { loads++; return 100; }
    public int priceWithTax(String item) { return price(item) * 105 / 100; }   // self-invocation
    public int loads() { return loads; }
}
@Service class Billing {
    final Prices prices; Billing(Prices p) { prices = p; }
    public int priceWithTax(String item) { return prices.price(item) * 105 / 100; }   // through the proxy
}
@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var prices = ctx.getBean(Prices.class); var billing = ctx.getBean(Billing.class);
for (int i = 0; i < 3; i++) prices.priceWithTax("dosa");
System.out.println("self-invocation, 3 calls -> loads: " + prices.loads());
for (int i = 0; i < 3; i++) billing.priceWithTax("dosa");
System.out.println("via other bean, 3 more calls -> loads: " + prices.loads());
System.out.println("is proxy: " + org.springframework.aop.support.AopUtils.isAopProxy(prices));
ctx.close();`,
      analogy: "The receptionist only helps visitors who come through the front desk; if you walk to the expert's office through the back corridor, nobody checks the notebook." },
    { title: "Caffeine: a fast local cache",
      text: "**Caffeine** is the standard in-process cache for Java (and the Boot default when on the classpath). Configure bounds and expiry: `maximumSize` / `maximumWeight` (eviction uses **W-TinyLFU**, which keeps frequently used entries), `expireAfterWrite` (TTL), `expireAfterAccess` (idle timeout), and `refreshAfterWrite` (serve the old value while reloading in the background). In Boot: `spring.cache.caffeine.spec=maximumSize=10000,expireAfterWrite=10m`, or a `CaffeineCacheManager` bean with per-cache builders, as in the widget's 500 ms TTL cache. **Never leave a local cache unbounded**: it becomes a memory leak (J31).",
      code: `var cache = Caffeine.newBuilder().maximumSize(3).recordStats().executor(Runnable::run).<String, Integer>build();
for (String k : List.of("a", "b", "a", "a", "c", "a", "d", "e", "a")) cache.get(k, key -> key.length());
cache.cleanUp();
System.out.println("kept   : " + new TreeSet<>(cache.asMap().keySet()) + " (size " + cache.estimatedSize() + ")");
System.out.println("stats  : " + cache.stats());
var ttl = Caffeine.newBuilder().expireAfterWrite(java.time.Duration.ofMillis(100)).<String, String>build();
ttl.put("otp", "4821");
System.out.println("now    : " + ttl.getIfPresent("otp"));
Thread.sleep(150);
System.out.println("150 ms : " + ttl.getIfPresent("otp"));`,
      analogy: "A small fridge: it holds only so much (size bound), food goes off (TTL), and when it's full you throw out what nobody eats rather than what was bought first." },
    { title: "Local vs distributed caches (Redis)",
      text: "A **local** cache (Caffeine) lives in each JVM: nanosecond reads, no network, but every instance has its **own copy**, so after an update instance A may serve new data while B serves stale data until TTL or invalidation. A **distributed** cache (**Redis**, Hazelcast, Memcached) is shared by all instances: one copy, survives restarts and deploys, but each read costs a network round trip and values must be **serialized** (prefer JSON over Java serialization). With `spring-boot-starter-data-redis` Boot creates a `RedisCacheManager`; set TTLs per cache. Many systems use **two levels**: a short-TTL Caffeine L1 in front of Redis L2.",
      table: [["", "Caffeine (local)", "Redis (distributed)"],
        ["Read latency", "~100 ns", "~0.3–1 ms (network)"],
        ["Consistency across pods", "each pod differs", "one shared copy"],
        ["Survives restart", "no", "yes"],
        ["Capacity", "JVM heap", "Redis memory, shardable"],
        ["Needs serialization", "no", "yes (JSON)"],
        ["Good for", "hot reference data, per-pod memoization", "sessions, shared results, rate limits"]],
      code: `spring:
  cache:
    type: redis
    redis:
      time-to-live: 10m
      key-prefix: "catalog:"
      cache-null-values: false
  data:
    redis:
      host: redis.internal
      port: 6379
# Java: per-cache TTLs
# @Bean RedisCacheManagerBuilderCustomizer ttl() {
#   return b -> b.withCacheConfiguration("prices", RedisCacheConfiguration.defaultCacheConfig()
#       .entryTtl(Duration.ofMinutes(1))
#       .serializeValuesWith(SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer())));
# }`, lang: "yaml", noCompile: true,
      analogy: "Caffeine is each cashier's personal notepad; Redis is the shared whiteboard everyone walks to: slower to reach, but everyone sees the same thing." },
    { title: "Cache stampede and how to prevent it",
      text: "When a popular key is missing (cold start, expiry), many concurrent requests miss **at the same moment** and all hit the database: a **stampede** (thundering herd). The widget recorded it: 20 threads on a cold key made **20** database loads with the default `@Cacheable`, and **1** with **`sync = true`**, which makes the other threads wait for the first loader (per key, per JVM). Other defences: `refreshAfterWrite` (keep serving the old value while one thread reloads), **jittered TTLs** so keys don't all expire together, cache **warm-up** at startup, and distributed locks or request coalescing for shared caches.",
      code: `@Service class Hot {
    final java.util.concurrent.atomic.AtomicInteger loads = new java.util.concurrent.atomic.AtomicInteger();
    @Cacheable("a") public String plain(String k) { return load(k); }
    @Cacheable(cacheNames = "b", sync = true) public String synced(String k) { return load(k); }
    String load(String k) { loads.incrementAndGet(); try { Thread.sleep(100); } catch (InterruptedException e) { } return k.toUpperCase(); }
    public java.util.concurrent.atomic.AtomicInteger loads() { return loads; }
}
@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var hot = ctx.getBean(Hot.class);
for (boolean sync : List.of(false, true)) {
    hot.loads().set(0);
    try (var pool = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
        for (int i = 0; i < 50; i++) pool.submit(() -> sync ? hot.synced("menu") : hot.plain("menu"));
    }
    System.out.println("sync=" + sync + ": 50 concurrent requests -> " + hot.loads().get() + " loads");
}
ctx.close();`,
      analogy: "When the shop opens, 50 people shouldn't each go to the warehouse for the same item: one goes, the others wait at the counter." },
    { title: "Nulls, empty results and transactions",
      text: "Should 'not found' be cached? Caching `null` (**negative caching**) protects the database from repeated lookups of missing ids, which is what Caffeine-backed Spring caches do by default (widget: *Caching null*). But if the item is created later, readers keep seeing 'not found' until eviction, so either evict on create or skip it with `unless = \"#result == null\"`. Methods returning `Optional` are unwrapped: the cache stores the value or null. Inside transactions, evicting **before commit** lets another request re-cache the old value before the new one is committed; use a transaction-aware cache manager (`TransactionAwareCacheManagerProxy`) or evict after commit.",
      code: `@Service class Users {
    final Map<Long, String> db = new HashMap<>(); int loads;
    @Cacheable("user") public Optional<String> find(long id) { loads++; return Optional.ofNullable(db.get(id)); }
    @Cacheable(cacheNames = "user2", unless = "#result == null") public String findNoNegative(long id) { loads++; return db.get(id); }
    public void insert(long id, String name) { db.put(id, name); }
    public int loads() { return loads; }
    public void resetLoads() { loads = 0; }
}
@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var u = ctx.getBean(Users.class);
u.find(7); u.find(7);
System.out.println("negative cached, loads=" + u.loads());
u.insert(7, "asha");
System.out.println("after insert, cached read: " + u.find(7) + " (stale 'not found')");
u.resetLoads(); u.findNoNegative(8); u.findNoNegative(8);
System.out.println("unless null, loads=" + u.loads());
var raw = ctx.getBean(CacheManager.class).getCache("user").get(7L);
System.out.println("stored in cache for key 7: " + (raw == null ? "nothing" : raw.get()));
ctx.close();`,
      analogy: "Writing 'out of stock' on the board saves customers asking, but someone must wipe it when the delivery arrives." },
    { title: "Observing and tuning a cache",
      text: "A cache you don't measure is a guess. With Actuator, Boot binds every cache known at startup to Micrometer: **`cache.gets{result=hit|miss}`**, `cache.puts`, `cache.evictions`, `cache.size` (Caffeine needs `recordStats()`). Watch the **hit ratio** (often 80–99% for reference data; a 17% ratio like the widget's `products` cache is mostly overhead), **eviction rate** (too small a size), **load time** and **memory**. `/actuator/caches` lists caches and can clear them. Tune size and TTL from the data: how often values change, how bad staleness is, and the working-set size.",
      code: `@Service class Fx {
    @Cacheable("fx") public double rate(String c) { return c.length() * 10.0; }
}
@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).properties("spring.cache.cache-names=fx", "spring.cache.caffeine.spec=maximumSize=500,expireAfterWrite=5m,recordStats").run();
var fx = ctx.getBean(Fx.class);
for (String c : List.of("USD", "EUR", "USD", "USD", "GBP", "USD", "EUR")) fx.rate(c);
MeterRegistry reg = ctx.getBean(MeterRegistry.class);
for (String r : List.of("hit", "miss")) System.out.println("cache.gets{cache=fx,result=" + r + "} = " + reg.get("cache.gets").tag("cache", "fx").tag("result", r).functionCounter().count());
var stats = ((com.github.benmanes.caffeine.cache.Cache<?, ?>) ctx.getBean(CacheManager.class).getCache("fx").getNativeCache()).stats();
System.out.printf("hit rate %.2f, evictions %d%n", stats.hitRate(), stats.evictionCount());
ctx.close();`,
      analogy: "A shop tracks which items sell from the front shelf versus the back store; if customers keep asking for things not on the shelf, the shelf is wrong." },
    { title: "What not to cache (and other traps)",
      text: "Don't cache what is **cheap** to compute, **rarely reused**, **user-specific with unbounded keys**, **security-sensitive** (permissions that must take effect immediately), or **strongly consistent** (balances, stock during checkout). Remember that a local cache returns the **same object** to every caller: if someone mutates it, everyone sees the change, so cache **immutable** values (records, unmodifiable lists). Also: unbounded caches leak memory, caching paginated or per-request data explodes key counts, and a cache in front of a slow dependency hides an outage only until entries expire. Start with the slowest, hottest, most read-heavy data and measure.",
      code: `@Service class Menu {
    @Cacheable("menu") public List<String> items() { return new ArrayList<>(List.of("dosa", "idli")); }
    @Cacheable("menuSafe") public List<String> itemsSafe() { return List.of("dosa", "idli"); }
}
@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var menu = ctx.getBean(Menu.class);
List<String> mine = menu.items();
mine.add("my private note");
System.out.println("another caller now sees: " + menu.items());
try { menu.itemsSafe().add("x"); } catch (UnsupportedOperationException e) { System.out.println("immutable value rejected the change: " + e.getClass().getSimpleName()); }
System.out.println("safe cache still: " + menu.itemsSafe());
ctx.close();`,
      analogy: "Photocopy the notice for everyone instead of passing round the original: if one person scribbles on the original, everyone reads the scribble." }
  ];

  H.registerLesson({
    code: "S11",
    summary: "Caching in Spring applications: the cache-aside pattern, `@EnableCaching` with `@Cacheable`, `@CachePut` and `@CacheEvict`, choosing keys with SpEL plus `condition`/`unless`, the proxy behind it and the self-invocation trap, Caffeine sizing and TTLs, local vs distributed (Redis) caches, cache stampedes and `sync = true`, negative caching and transactions, cache metrics, and what not to cache.",
    slides: SLIDES,
    widget: { heading: "Interactive: what the cache actually did", caption: "Each scenario was run against a real Spring Boot 3.4 app with a Caffeine cache in front of a repository that takes 200 ms per load. Times and database-load counts are measured, not simulated.", render: s11Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Product catalogue", "Product details are read thousands of times per minute and change a few times a day: `@Cacheable` with a 10-minute TTL and `@CacheEvict` on admin edits cuts database reads by 95%."],
      ["Currency rates", "An external FX API is slow and rate-limited: a Caffeine cache with `refreshAfterWrite(1m)` serves rates instantly and refreshes in the background."],
      ["Feature flags and config", "Flags are read on every request; a short-TTL local cache avoids a network call each time while still picking up changes within seconds."],
      ["Stale price incident", "An admin changes a price, but one pod keeps showing the old price for 10 minutes because only that pod's local cache missed the eviction."],
      ["Black Friday stampede", "The homepage cache expires at midnight just as traffic peaks; hundreds of threads rebuild it at once and the database falls over."],
      ["Memory leak", "A `@Cacheable` keyed by search text with no size limit grows to 3 GB and triggers full GCs (J31)."]
    ],
    pitfalls: [
      "Calling a @Cacheable method from inside the same bean (no proxy, no cache)",
      "Updating data without @CacheEvict/@CachePut, so stale values are served",
      "Keys that miss an argument (wrong results) or include a unique one (0% hits)",
      "Unbounded local caches (no maximumSize or TTL)",
      "Caching mutable objects that callers then modify",
      "Default @Cacheable on a hot key: stampede on expiry (use sync = true)",
      "Local caches in a multi-pod service with no invalidation story",
      "Caching security- or money-critical data that must be current"
    ],
    quiz: [
      { q: "On a cache hit, what happens to the @Cacheable method body?", options: ["Runs, result discarded", "Is not executed", "Runs asynchronously", "Runs after the cache returns"], answer: 1, why: "The proxy returns the cached value without calling the target." },
      { q: "In the widget's self-invocation scenario, why did findViaSelf(1) take 200 ms twice?", options: ["The TTL expired", "this.find() bypasses the proxy, so no cache lookup happens", "The key changed", "Caffeine was full"], answer: 1, why: "Cache advice lives in the proxy." },
      { q: "With two parameters (q, page) and no key attribute, the cache key is…", options: ["q only", "SimpleKey [q, page]", "page only", "hashCode of the method"], answer: 1, why: "The recorded keys were SimpleKey [dosa, 1] and SimpleKey [dosa, 2]." },
      { q: "Which annotation always runs the method and stores its result?", options: ["@Cacheable", "@CachePut", "@CacheEvict", "@Caching"], answer: 1, why: "Use it on updates to refresh the cached entry." },
      { q: "20 threads called a cold key. How many repository loads with sync = false vs sync = true?", options: ["1 and 1", "20 and 1", "20 and 20", "1 and 20"], answer: 1, why: "sync = true lets one thread load per key." },
      { q: "What is the difference between `condition` and `unless`?", options: ["None", "condition is checked before the call; unless after, and can use #result", "unless is checked before", "condition only works with Redis"], answer: 1, why: "unless vetoes storing the result." },
      { q: "Main drawback of a local Caffeine cache in a 10-pod service?", options: ["Slow reads", "Each pod has its own copy that can be stale after updates", "Needs serialization", "Can't set TTL"], answer: 1, why: "Invalidation must reach every pod, or rely on short TTLs." },
      { q: "The widget's products cache shows a hit rate of 0.17. What does that suggest?", options: ["Cache is working well", "Most lookups miss; the cache adds little value as configured", "Redis is down", "Too many evictions only"], answer: 1, why: "Investigate keys, TTL and access pattern (here: scenarios cleared it on purpose)." },
      { q: "Why cache immutable objects?", options: ["They're smaller", "Callers share the same instance, so mutations would corrupt the cache for everyone", "Required by Spring", "Faster serialization only"], answer: 1, why: "Local caches return references, not copies." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Code / config"],
        ["Turn on caching", "`@EnableCaching` + a cache library (Caffeine, Redis)"],
        ["Cache a read", "`@Cacheable(cacheNames = \"product\", key = \"#id\")`"],
        ["Refresh on update", "`@CachePut(cacheNames = \"product\", key = \"#p.id\")`"],
        ["Remove", "`@CacheEvict(cacheNames = \"product\", key = \"#id\")`, `allEntries = true`"],
        ["Don't store nulls", "`unless = \"#result == null\"`"],
        ["Prevent stampede", "`sync = true`, `refreshAfterWrite`, jittered TTL"],
        ["Caffeine spec", "`spring.cache.caffeine.spec=maximumSize=10000,expireAfterWrite=10m,recordStats`"],
        ["Redis TTL", "`spring.cache.redis.time-to-live=10m`"],
        ["Metrics", "`cache.gets{result=hit|miss}`, `/actuator/caches`"]],
      cards: [
        { title: "Annotations", items: ["@Cacheable: read-through", "@CachePut: write-through", "@CacheEvict: invalidate", "@Caching: combine", "@CacheConfig: class defaults"] },
        { title: "Traps", items: ["Self-invocation", "Stale after update", "Bad keys", "Unbounded size", "Mutable values"] },
        { title: "Say in interviews", items: ["Cache-aside", "TTL vs explicit eviction", "Local vs distributed", "Stampede protection", "Measure hit ratio"] }]
    },
    practice: [
      { level: "Easy", q: "Explain the cache-aside pattern and where Spring's @Cacheable fits.",
        a: ["Read: check cache; on miss load from the source and populate the cache.",
          "Write: update the source, then evict (or update) the cache entry.",
          "@Cacheable implements the read side; @CacheEvict/@CachePut the write side."] },
      { level: "Easy", q: "Cache a slow lookup by id and show the second call is a hit.",
        a: ["@EnableCaching on the app, @Cacheable on a public service method.",
          "Count method executions."],
        code: `@Service class Stations {
    int calls;
    @Cacheable("station") public String name(String code) { calls++; return code.equals("PUNE") ? "Pune Junction" : "Unknown"; }
    public int calls() { return calls; }
}
@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var s = ctx.getBean(Stations.class);
System.out.println(s.name("PUNE") + ", " + s.name("PUNE") + ", calls = " + s.calls());
ctx.close();` },
      { level: "Easy", q: "Why didn't my @Cacheable method cache anything?",
        a: ["Missing @EnableCaching.",
          "The call is a self-invocation or the method is private/final, so the proxy is bypassed.",
          "The object wasn't created by Spring (new).",
          "The key differs on every call (e.g. includes a timestamp or request object without equals)."] },
      { level: "Medium", q: "Use a custom key so that a request id parameter doesn't break caching.",
        a: ["Default keys include every argument, so a unique requestId gives 0% hits.",
          "Set `key = \"#city\"` to ignore it."],
        code: `@Service class Weather {
    int calls;
    @Cacheable(cacheNames = "weather", key = "#city") public String forecast(String city, String requestId) { calls++; return city + ": 31C"; }
    public int calls() { return calls; }
}
@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).run();
var w = ctx.getBean(Weather.class);
for (int i = 0; i < 5; i++) w.forecast("Chennai", UUID.randomUUID().toString());
System.out.println("calls = " + w.calls());
ctx.close();` },
      { level: "Medium", q: "Local cache or Redis? How do you decide?",
        a: ["Local: fastest, no network, but per-pod copies; good for small, rarely-changing reference data with short TTLs.",
          "Redis: shared, consistent across pods, survives restarts; costs a network hop and serialization.",
          "Two-level: Caffeine L1 (seconds) + Redis L2 (minutes), with pub/sub invalidation for L1.",
          "Decide by staleness tolerance, data size, read rate and number of instances."] },
      { level: "Medium", q: "How do you keep a cache consistent when data is updated?",
        a: ["Evict (or put) on every write path, ideally after the transaction commits.",
          "Use TTLs as a safety net for missed invalidations.",
          "For multiple pods with local caches, broadcast invalidations (Redis pub/sub, Kafka) or keep TTLs short.",
          "Prefer evict over put when the write path doesn't have the full object."] },
      { level: "Medium", q: "Configure a Caffeine cache with a size limit and TTL in Boot and verify the settings.",
        a: ["Use `spring.cache.caffeine.spec`.",
          "Inspect the native Caffeine cache's policy."],
        code: `@SpringBootApplication @EnableCaching class App { }
var ctx = new SpringApplicationBuilder(App.class).properties("spring.cache.cache-names=menu", "spring.cache.caffeine.spec=maximumSize=200,expireAfterWrite=30s").run();
var nativeCache = (com.github.benmanes.caffeine.cache.Cache<?, ?>) ctx.getBean(CacheManager.class).getCache("menu").getNativeCache();
System.out.println("max size: " + nativeCache.policy().eviction().get().getMaximum());
System.out.println("ttl     : " + nativeCache.policy().expireAfterWrite().get().getExpiresAfter());
ctx.close();` },
      { level: "Hard", q: "What is a cache stampede and how do you prevent it?",
        a: ["Many concurrent misses on the same key (cold start or expiry) all hit the source at once.",
          "Per-JVM: `@Cacheable(sync = true)` or Caffeine's `get(key, loader)` load once per key.",
          "refreshAfterWrite serves the stale value while one reload happens; jitter TTLs; warm the cache on startup.",
          "Across pods with Redis: a short lock (SETNX) or request coalescing, or probabilistic early refresh."] },
      { level: "Hard", q: "Design caching for a product page service with 20 pods, 2M products and price updates every few minutes.",
        a: ["Redis as the shared cache for product details (TTL 10–30 min, JSON values), evicted on product edits.",
          "Prices change often: cache with a short TTL (30–60 s) or don't cache in L1; evict on price events from Kafka.",
          "Small Caffeine L1 for the hottest few thousand products with a few seconds TTL.",
          "sync/locking for hot keys, jittered TTLs, hit-ratio and latency metrics, and a fallback when Redis is down."] },
      { level: "Hard", q: "Show that an evict before the transaction commits can lead to a stale cache, and how to fix it.",
        a: ["Evict happens, then a concurrent reader re-caches the old committed value before the writer commits.",
          "Fix: evict after commit (TransactionAwareCacheManagerProxy, or @TransactionalEventListener(AFTER_COMMIT)), plus a TTL.",
          "The snippet simulates the interleaving with a plain map."],
        code: `Map<String, Integer> db = new HashMap<>(Map.of("dosa", 120));
Map<String, Integer> cache = new HashMap<>(Map.of("dosa", 120));
Integer pending = 150;                       // writer: UPDATE inside an open transaction
cache.remove("dosa");                        // writer evicts BEFORE commit
cache.computeIfAbsent("dosa", db::get);      // reader misses and re-caches the old committed value
db.put("dosa", pending);                     // writer commits
System.out.println("db=" + db.get("dosa") + " cache=" + cache.get("dosa") + "  (stale until TTL)");
cache.remove("dosa");                        // fix: evict AFTER commit
System.out.println("after-commit evict, next read: " + cache.computeIfAbsent("dosa", db::get));` }
    ],
    recap: [
      "Caching trades freshness for speed; decide how stale each piece of data may be.",
      "@Cacheable reads through; @CachePut and @CacheEvict keep writes consistent.",
      "Keys come from arguments; choose them deliberately with SpEL.",
      "It's proxy-based: self-invocation and private methods aren't cached.",
      "Bound local caches, protect hot keys with sync = true, and measure the hit ratio."
    ]
  });
})();
