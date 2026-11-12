/* Lesson S06: Spring Data JPA & Hibernate */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded with Spring Boot 3.4 / Hibernate 6.6 / H2: N orders, each with its own customer (LAZY @ManyToOne) and 3 items
  // (@OneToMany). A Hibernate StatementInspector captured every SQL statement; the loop touches each order's customer
  // name and item count inside one transaction. "sql" keeps the first 4 statements and the last one.
  var REC = {"lazy": {"5": {"count": 11, "sql": ["select po1_0.id,po1_0.customer_id from orders po1_0", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id=?", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id=?", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id=?", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id=?"]}, "20": {"count": 41, "sql": ["select po1_0.id,po1_0.customer_id from orders po1_0", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id=?", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id=?", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id=?", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id=?"]}, "100": {"count": 201, "sql": ["select po1_0.id,po1_0.customer_id from orders po1_0", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id=?", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id=?", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id=?", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id=?"]}}, "fetch": {"5": {"count": 1, "sql": ["select distinct po1_0.id,c1_0.id,c1_0.name,i1_0.order_id,i1_0.id,i1_0.sku from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id join item i1_0 on po1_0.id=i1_0.order_id"]}, "20": {"count": 1, "sql": ["select distinct po1_0.id,c1_0.id,c1_0.name,i1_0.order_id,i1_0.id,i1_0.sku from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id join item i1_0 on po1_0.id=i1_0.order_id"]}, "100": {"count": 1, "sql": ["select distinct po1_0.id,c1_0.id,c1_0.name,i1_0.order_id,i1_0.id,i1_0.sku from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id join item i1_0 on po1_0.id=i1_0.order_id"]}}, "graph": {"5": {"count": 1, "sql": ["select po1_0.id,c1_0.id,c1_0.name,i1_0.order_id,i1_0.id,i1_0.sku from orders po1_0 left join customer c1_0 on c1_0.id=po1_0.customer_id left join item i1_0 on po1_0.id=i1_0.order_id"]}, "20": {"count": 1, "sql": ["select po1_0.id,c1_0.id,c1_0.name,i1_0.order_id,i1_0.id,i1_0.sku from orders po1_0 left join customer c1_0 on c1_0.id=po1_0.customer_id left join item i1_0 on po1_0.id=i1_0.order_id"]}, "100": {"count": 1, "sql": ["select po1_0.id,c1_0.id,c1_0.name,i1_0.order_id,i1_0.id,i1_0.sku from orders po1_0 left join customer c1_0 on c1_0.id=po1_0.customer_id left join item i1_0 on po1_0.id=i1_0.order_id"]}}, "dto": {"5": {"count": 1, "sql": ["select po1_0.id,c1_0.name,count(i1_0.id) from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id left join item i1_0 on po1_0.id=i1_0.order_id group by po1_0.id,c1_0.name order by po1_0.id"]}, "20": {"count": 1, "sql": ["select po1_0.id,c1_0.name,count(i1_0.id) from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id left join item i1_0 on po1_0.id=i1_0.order_id group by po1_0.id,c1_0.name order by po1_0.id"]}, "100": {"count": 1, "sql": ["select po1_0.id,c1_0.name,count(i1_0.id) from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id left join item i1_0 on po1_0.id=i1_0.order_id group by po1_0.id,c1_0.name order by po1_0.id"]}}, "page": {"5": {"count": 2, "sql": ["select po1_0.id,c1_0.id,c1_0.name,i1_0.order_id,i1_0.id,i1_0.sku from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id join item i1_0 on po1_0.id=i1_0.order_id", "select count(po1_0.id) from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id join item i1_0 on po1_0.id=i1_0.order_id"]}, "20": {"count": 2, "sql": ["select po1_0.id,c1_0.id,c1_0.name,i1_0.order_id,i1_0.id,i1_0.sku from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id join item i1_0 on po1_0.id=i1_0.order_id", "select count(po1_0.id) from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id join item i1_0 on po1_0.id=i1_0.order_id"]}, "100": {"count": 2, "sql": ["select po1_0.id,c1_0.id,c1_0.name,i1_0.order_id,i1_0.id,i1_0.sku from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id join item i1_0 on po1_0.id=i1_0.order_id", "select count(po1_0.id) from orders po1_0 join customer c1_0 on c1_0.id=po1_0.customer_id join item i1_0 on po1_0.id=i1_0.order_id"]}}, "lazy_batch": {"5": {"count": 3, "sql": ["select po1_0.id,po1_0.customer_id from orders po1_0", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id in (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id in (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"]}, "20": {"count": 5, "sql": ["select po1_0.id,po1_0.customer_id from orders po1_0", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id in (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id in (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id in (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id in (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"]}, "100": {"count": 15, "sql": ["select po1_0.id,po1_0.customer_id from orders po1_0", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id in (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id in (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", "select c1_0.id,c1_0.name from customer c1_0 where c1_0.id in (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", "select i1_0.order_id,i1_0.id,i1_0.sku from item i1_0 where i1_0.order_id in (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"]}}};
  var LIE = "org.hibernate.LazyInitializationException: failed to lazily initialize a collection of role: demo.PurchaseOrder.items: could not initialize proxy - no Session";
  var STRATS = [
    { k: "lazy", label: "findAll() + lazy access", code: "for (PurchaseOrder o : repo.findAll())\n    use(o.getCustomer().getName(), o.getItems().size());", why: "One query for the orders, then **one per customer and one per item list** as each lazy association is touched: the classic **N+1** (here 2N+1)." },
    { k: "lazy_batch", label: "batch fetch size 16", code: "spring.jpa.properties.hibernate.default_batch_fetch_size=16\n// same loop as findAll() + lazy access", why: "Hibernate loads uninitialised proxies/collections **16 at a time** with `where id in (?,…)`: about 1 + 2·⌈N/16⌉ queries. A cheap global mitigation, not a full fix." },
    { k: "fetch", label: "JOIN FETCH", code: "@Query(\"select distinct o from PurchaseOrder o join fetch o.customer join fetch o.items\")\nList<PurchaseOrder> findAllFetched();", why: "**One query** with joins; Hibernate builds the graph from the joined rows. Rows returned = orders × items, so watch row explosion with several collections." },
    { k: "graph", label: "@EntityGraph", code: "@EntityGraph(attributePaths = {\"customer\", \"items\"})\n@Query(\"select o from PurchaseOrder o\")\nList<PurchaseOrder> findAllWithGraph();", why: "Same single query (as left joins) but declared on the repository method, so the JPQL stays simple and reusable." },
    { k: "dto", label: "DTO projection", code: "@Query(\"select new demo.OrderSummary(o.id, c.name, count(i)) from PurchaseOrder o \" +\n       \"join o.customer c left join o.items i group by o.id, c.name order by o.id\")\nList<OrderSummary> summaries();", why: "Selects exactly the columns the screen needs into a record. **One query, no entities, no dirty checking**: the best choice for read-only lists." },
    { k: "page", label: "Page + JOIN FETCH collection", code: "@Query(\"select o from PurchaseOrder o join fetch o.customer join fetch o.items\")\nPage<PurchaseOrder> pageFetched(Pageable p);   // PageRequest.of(0, 2)", why: "Look at the SQL: **no LIMIT**. Hibernate can't paginate rows of a collection fetch, so it loads **every** row and pages in memory (warning HHH90003004). Page the ids first, then fetch, or use batch fetching." }
  ];
  function s06Widget(el, ctx) {
    var s = ctx.state; if (!s.k) s.k = "lazy"; if (!s.n) s.n = "20";
    el.innerHTML = "<div class='btnrow' data-r='ns'>" + ["5", "20", "100"].map(function (n) { return "<button type='button' class='btn' data-n='" + n + "'>" + n + " orders</button>"; }).join("") + "</div>" +
      "<div class='btnrow' data-r='ks' style='margin-top:8px'>" + STRATS.map(function (x) { return "<button type='button' class='btn' data-k='" + x.k + "'>" + ctx.esc(x.label) + "</button>"; }).join("") + "</div>" +
      "<pre class='code' data-r='code' style='margin-top:8px'></pre><div data-r='bars' style='margin:10px 0'></div><div class='result' data-r='res'></div><pre class='code' data-r='sql' style='white-space:pre-wrap'></pre>" +
      "<p style='margin-top:10px'><button type='button' class='btn' data-r='lie'>Touch items after the transaction ends</button></p><div class='result' data-r='lieout' style='display:none'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var st = STRATS.filter(function (x) { return x.k === s.k; })[0], rec = REC[s.k][s.n];
      q("ns").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b.dataset.n === s.n); });
      q("ks").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b.dataset.k === s.k); });
      q("code").innerHTML = ctx.H.highlight(st.code, "java");
      var max = REC.lazy[s.n].count;
      q("bars").innerHTML = STRATS.map(function (x) {
        var c = REC[x.k][s.n].count, w = Math.max(2, Math.round(100 * c / max));
        return "<div style='display:flex;align-items:center;gap:8px;margin:3px 0'><span style='width:210px;font-size:13px" + (x.k === s.k ? ";font-weight:700" : "") + "'>" + ctx.esc(x.label) + "</span><span style='flex:1;background:#f3f4f6;border-radius:4px'><span style='display:block;height:14px;border-radius:4px;width:" + w + "%;background:" + (c > 3 ? "#ef4444" : "#22c55e") + "'></span></span><span style='width:70px;font-size:13px'>" + c + " SQL</span></div>";
      }).join("");
      q("res").innerHTML = ctx.md("**" + rec.count + " SQL statement" + (rec.count > 1 ? "s" : "") + "** for " + s.n + " orders. " + st.why);
      var lines = rec.sql.map(function (x, i) { return (rec.count > 5 && i === rec.sql.length - 1 ? "… (" + (rec.count - 5) + " more like these)\n" : "") + x; });
      q("sql").textContent = lines.join("\n\n");
    }
    q("ns").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.n = b.dataset.n; ctx.save(); draw(); });
    q("ks").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.k = b.dataset.k; ctx.save(); draw(); });
    q("lie").addEventListener("click", function () { var o = q("lieout"); o.style.display = ""; o.innerHTML = ctx.md("`repo.findAll().get(0).getItems().size()` with no surrounding transaction (and open-in-view off):\n\n`" + LIE + "`\n\nThe session closed when `findAll()` returned, so the lazy collection can't load. Fetch what you need inside the transaction or return DTOs."); });
    draw();
  }

  var SLIDES = [
    { title: "JPA, Hibernate and Spring Data: who does what",
      text: "**JPA** (Jakarta Persistence) is the specification: annotations to map classes to tables and the `EntityManager` API. **Hibernate** is the implementation that generates SQL, tracks changes and caches entities. **Spring Data JPA** sits on top and generates repository implementations from interfaces, so `JpaRepository<Book, Long>` gives you `save`, `findById`, paging and **derived queries** from method names. Boot auto-configures the DataSource, Hibernate and repositories. You still need to understand the SQL underneath: most JPA production issues are about **what queries run and when**.",
      m: M(["flowchart TB",
        "  S[\"your service\"]:::s4 --> R[\"Spring Data repository<br/>interface BookRepo extends JpaRepository\"]:::s2",
        "  R --> E[\"JPA EntityManager<br/>(Hibernate session)\"]:::s3 --> J[\"JDBC + connection pool\"]:::s1 --> D[\"database\"]:::s1",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `@Entity class Book {
    @Id @GeneratedValue Long id; String title; int pages;
    protected Book() { }
    Book(String t, int p) { title = t; pages = p; }
    public String toString() { return "Book#" + id + " " + title + " (" + pages + "p)"; }
}
interface BookRepo extends JpaRepository<Book, Long> { List<Book> findByPagesGreaterThanOrderByTitle(int pages); }
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    BookRepo repo = ctx.getBean(BookRepo.class);
    repo.saveAll(List.of(new Book("Godaan", 312), new Book("Malgudi Days", 256), new Book("Gitanjali", 104)));
    System.out.println(repo.count() + " books; over 200 pages: " + repo.findByPagesGreaterThanOrderByTitle(200));
}`,
      analogy: "JPA is the driving-licence syllabus, Hibernate is the actual car, and Spring Data is the cab app: you say where to go and it handles the driving, but you should still know how the car behaves on the road." },
    { title: "Mapping entities",
      text: "An entity needs `@Entity`, an `@Id` and a no-arg constructor (can be protected). Choose id generation deliberately: `IDENTITY` (auto-increment, disables JDBC insert batching), `SEQUENCE` (efficient with pooled allocation, preferred on PostgreSQL/Oracle) or app-assigned UUIDs. Map enums with **`@Enumerated(EnumType.STRING)`** (the ORDINAL default breaks when constants are reordered), money with `BigDecimal` plus precision/scale, times with `Instant`/`LocalDate`. `@Transient` fields aren't persisted. Base `equals`/`hashCode` on a stable business key or the id with care; avoid Lombok `@Data` on entities.",
      code: `enum Status { NEW, PAID, SHIPPED }
@Entity @Table(name = "customer_orders")
class CustomerOrder {
    @Id @GeneratedValue(strategy = GenerationType.SEQUENCE) Long id;
    @Column(nullable = false, length = 40) String customer;
    @Enumerated(EnumType.STRING) Status status = Status.PAID;
    @Column(precision = 10, scale = 2) BigDecimal total;
    Instant createdAt = Instant.now();
    @Transient String uiNote = "not stored";
    protected CustomerOrder() { }
    CustomerOrder(String c, BigDecimal t) { customer = c; total = t; }
}
interface CustomerOrderRepo extends JpaRepository<CustomerOrder, Long> { }
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    ctx.getBean(CustomerOrderRepo.class).save(new CustomerOrder("Asha", new BigDecimal("499.50")));
    var jdbc = ctx.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
    jdbc.queryForList("select column_name, data_type from information_schema.columns where table_name = 'CUSTOMER_ORDERS' order by ordinal_position")
        .forEach(r -> System.out.println(r.get("COLUMN_NAME") + " " + r.get("DATA_TYPE")));
    System.out.println("row: " + jdbc.queryForMap("select customer, status, total from customer_orders"));
}` },
    { title: "Relationships and fetch types",
      text: "Map associations with `@ManyToOne`, `@OneToMany`, `@OneToOne` and `@ManyToMany`. In a bidirectional pair the side with the **foreign key** (usually `@ManyToOne`) is the **owning side**; the other has `mappedBy` and is ignored when writing, so always set both sides (helper methods). Defaults are a trap: **`@ManyToOne` and `@OneToOne` are EAGER** by default, collections are LAZY. Make everything **`fetch = LAZY`** and fetch what each use case needs explicitly. Prefer `Set` or ordered `List` for collections, and model many-to-many with an explicit join entity when it carries data (quantity, role, date).",
      table: [["Annotation", "Default fetch", "Recommendation"],
        ["@ManyToOne", "EAGER", "LAZY"],
        ["@OneToOne", "EAGER", "LAZY (and share the primary key with @MapsId)"],
        ["@OneToMany", "LAZY", "LAZY, mappedBy on the parent"],
        ["@ManyToMany", "LAZY", "LAZY, or a join entity with its own fields"]],
      code: `@Entity class Author {
    @Id @GeneratedValue Long id; String name;
    @OneToMany(mappedBy = "author") List<Novel> novels = new ArrayList<>();
    protected Author() { }
    Author(String n) { name = n; }
}
@Entity class Novel {
    @Id @GeneratedValue Long id; String title;
    @ManyToOne(fetch = FetchType.LAZY) Author author;   // owning side: holds author_id
    protected Novel() { }
    Novel(String t) { title = t; }
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    var tx = ctx.getBean(org.springframework.transaction.support.TransactionTemplate.class);
    EntityManager em = ctx.getBean(EntityManager.class);
    tx.executeWithoutResult(s -> {
        Author a = new Author("Premchand"); em.persist(a);
        Novel wrong = new Novel("Gaban"); a.novels.add(wrong); em.persist(wrong);                     // only inverse side set
        Novel right = new Novel("Nirmala"); right.author = a; a.novels.add(right); em.persist(right);   // both sides set
    });
    var jdbc = ctx.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
    jdbc.queryForList("select title, author_id from novel order by id").forEach(System.out::println);
}` },
    { title: "Cascades and orphanRemoval",
      text: "**Cascade** propagates entity operations (`PERSIST`, `MERGE`, `REMOVE`, or `ALL`) from parent to children: saving an order saves its new line items. **`orphanRemoval = true`** deletes a child that is removed from the parent's collection. Use them for true **composition** (an order owns its lines; lines have no life of their own). Never cascade `REMOVE` from a child to a shared parent (deleting a book would delete the author and all their books), and avoid cascades on `@ManyToMany`.",
      code: `@Entity class Basket {
    @Id @GeneratedValue Long id;
    @OneToMany(mappedBy = "basket", cascade = CascadeType.ALL, orphanRemoval = true) List<Line> lines = new ArrayList<>();
    void add(String sku) { Line l = new Line(); l.sku = sku; l.basket = this; lines.add(l); }
}
@Entity class Line { @Id @GeneratedValue Long id; String sku; @ManyToOne(fetch = FetchType.LAZY) Basket basket; }
interface BasketRepo extends JpaRepository<Basket, Long> { }
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    var tx = ctx.getBean(org.springframework.transaction.support.TransactionTemplate.class);
    var jdbc = ctx.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
    BasketRepo repo = ctx.getBean(BasketRepo.class);
    Long id = tx.execute(s -> { Basket b = new Basket(); b.add("TEA"); b.add("SUGAR"); b.add("MILK"); return repo.save(b).id; });
    System.out.println("after save (cascade PERSIST): " + jdbc.queryForObject("select count(*) from line", Integer.class) + " lines");
    tx.executeWithoutResult(s -> repo.findById(id).orElseThrow().lines.removeIf(l -> l.sku.equals("SUGAR")));
    System.out.println("after removing from list (orphanRemoval): " + jdbc.queryForList("select sku from line order by id", String.class));
    repo.deleteById(id);
    System.out.println("after deleting basket (cascade REMOVE): " + jdbc.queryForObject("select count(*) from line", Integer.class) + " lines");
}`,
      analogy: "Cascade + orphanRemoval suits a tiffin box and its compartments: throw away the box and the compartments go with it, take one compartment out and it's gone. It does not suit a customer and the shop they buy from." },
    { title: "Repositories and derived queries",
      text: "Extending **`JpaRepository<T, ID>`** gives CRUD, batch and paging methods. Spring Data parses method names into queries: `findBy`, `countBy`, `existsBy`, `deleteBy` with properties combined by `And`/`Or` and operators like `GreaterThan`, `Between`, `In`, `Containing`, `IgnoreCase`, `OrderBy…Desc`, `Top3`/`First`. Names are validated at startup, so typos fail fast. When a name gets longer than the query itself, switch to `@Query`.",
      code: `@Entity class Hotel {
    @Id @GeneratedValue Long id; String name; String city; double rating; int price;
    protected Hotel() { }
    Hotel(String n, String c, double r, int p) { name = n; city = c; rating = r; price = p; }
    public String toString() { return name; }
}
interface HotelRepo extends JpaRepository<Hotel, Long> {
    List<Hotel> findByCityAndPriceLessThanOrderByRatingDesc(String city, int maxPrice);
    List<Hotel> findTop2ByOrderByRatingDesc();
    List<Hotel> findByNameContainingIgnoreCase(String part);
    long countByCity(String city);
    boolean existsByCityAndRatingGreaterThanEqual(String city, double rating);
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    HotelRepo r = ctx.getBean(HotelRepo.class);
    r.saveAll(List.of(new Hotel("Sea View", "Goa", 4.4, 5200), new Hotel("Palm Grove", "Goa", 4.7, 3900),
                      new Hotel("Lake Palace", "Udaipur", 4.9, 18000), new Hotel("Budget Inn", "Goa", 3.6, 1500)));
    System.out.println("Goa under 6000 by rating: " + r.findByCityAndPriceLessThanOrderByRatingDesc("Goa", 6000));
    System.out.println("top 2: " + r.findTop2ByOrderByRatingDesc() + ", '*palace*': " + r.findByNameContainingIgnoreCase("PALACE"));
    System.out.println("Goa count " + r.countByCity("Goa") + ", Udaipur has 4.8+? " + r.existsByCityAndRatingGreaterThanEqual("Udaipur", 4.8));
}` },
    { title: "@Query, projections and bulk updates",
      text: "**`@Query`** takes JPQL (entity and field names) or `nativeQuery = true` SQL, with named parameters. **Projections** load only what you need: an **interface projection** (`interface HotelName { String getName(); }`) or a **record DTO** whose constructor parameters match property names. They skip entity tracking and are ideal for read-only screens. **`@Modifying`** marks bulk UPDATE/DELETE queries; they bypass the persistence context (use `clearAutomatically = true`) and need a transaction.",
      code: `@Entity class Member {
    @Id @GeneratedValue Long id; String name; String city; boolean active = true; LocalDate lastLogin;
    protected Member() { }
    Member(String n, String c, LocalDate l) { name = n; city = c; lastLogin = l; }
}
interface NameOnly { String getName(); }
record MemberCard(String name, String city) { }
interface MemberRepo extends JpaRepository<Member, Long> {
    List<NameOnly> findByCity(String city);                                   // interface projection
    List<MemberCard> findByActiveTrueOrderByName();                           // record (DTO) projection
    @Query("select m.city, count(m) from Member m group by m.city order by m.city") List<Object[]> countPerCity();
    @Transactional @Modifying(clearAutomatically = true)
    @Query("update Member m set m.active = false where m.lastLogin < :cutoff") int deactivateInactiveSince(LocalDate cutoff);
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    MemberRepo r = ctx.getBean(MemberRepo.class);
    r.saveAll(List.of(new Member("Kiran", "Pune", LocalDate.of(2026, 11, 1)), new Member("Dev", "Pune", LocalDate.of(2025, 1, 9)), new Member("Zoya", "Delhi", LocalDate.of(2026, 10, 3))));
    System.out.println("Pune names: " + r.findByCity("Pune").stream().map(NameOnly::getName).toList());
    System.out.println("per city: " + r.countPerCity().stream().map(Arrays::toString).toList());
    System.out.println("deactivated: " + r.deactivateInactiveSince(LocalDate.of(2026, 1, 1)) + ", active cards: " + r.findByActiveTrueOrderByName());
}` },
    { title: "Pagination and sorting",
      text: "Add a **`Pageable`** parameter (`PageRequest.of(page, size, Sort.by(\"price\").descending())`) to any repository method. Returning **`Page<T>`** runs an extra **count query** for totals; **`Slice<T>`** only fetches one extra row to know whether a next page exists, which is cheaper for infinite scrolling. In controllers Spring Data binds `?page=1&size=20&sort=price,desc` into a `Pageable`; cap the size (`spring.data.web.pageable.max-page-size`). For deep pages or feeds prefer keyset (cursor) pagination (S04).",
      code: `@Entity class Product {
    @Id @GeneratedValue Long id; String name; String category; int price;
    protected Product() { }
    Product(String n, String c, int p) { name = n; category = c; price = p; }
    public String toString() { return name + " ₹" + price; }
}
interface ProductRepo extends JpaRepository<Product, Long> { Page<Product> findByCategory(String category, Pageable p); }
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    ProductRepo r = ctx.getBean(ProductRepo.class);
    for (int i = 1; i <= 7; i++) r.save(new Product("Kurta " + i, "apparel", 400 + 150 * i));
    Page<Product> p = r.findByCategory("apparel", PageRequest.of(1, 3, Sort.by("price").descending()));
    System.out.println("page " + p.getNumber() + " of " + p.getTotalPages() + " (" + p.getTotalElements() + " items): " + p.getContent() + ", hasNext=" + p.hasNext());
}` },
    { title: "The N+1 problem and its fixes",
      text: "Loading N parents with one query and then touching a lazy association on each triggers **N extra queries**. It's invisible in code and in tests with 3 rows, and becomes thousands of queries in production. Fixes: **`join fetch`** in JPQL or **`@EntityGraph`** on the repository method (one query); **DTO projections** for read-only lists; **`hibernate.default_batch_fetch_size`** / `@BatchSize` to load lazy associations in batches. Detect it with SQL logging, Hibernate statistics or query-count assertions in tests. The widget shows the recorded statement counts.",
      m: M(["flowchart TB",
        "  Q[\"select * from orders<br/>(1 query, N rows)\"]:::s2 --> L[\"for each order:<br/>order.getCustomer().getName()\"]:::s4",
        "  L --> N[\"select * from customer where id=?<br/>× N queries\"]:::s3",
        "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#ffebee,stroke:#c62828", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `@Entity class Dept { @Id @GeneratedValue Long id; String name; protected Dept() { } Dept(String n) { name = n; } String getName() { return name; } }
@Entity class Emp {
    @Id @GeneratedValue Long id; String name;
    @ManyToOne(fetch = FetchType.LAZY) Dept dept;
    protected Emp() { }
    Emp(String n, Dept d) { name = n; dept = d; }
    Dept getDept() { return dept; }
}
interface EmpRepo extends JpaRepository<Emp, Long> {
    @EntityGraph(attributePaths = "dept") @Query("select e from Emp e") List<Emp> findAllWithDept();
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class, "--spring.jpa.properties.hibernate.generate_statistics=true")) {
    var tx = ctx.getBean(org.springframework.transaction.support.TransactionTemplate.class);
    EmpRepo repo = ctx.getBean(EmpRepo.class);
    var stats = ctx.getBean(EntityManagerFactory.class).unwrap(org.hibernate.SessionFactory.class).getStatistics();
    tx.executeWithoutResult(s -> { EntityManager em = ctx.getBean(EntityManager.class);
        for (int i = 0; i < 10; i++) { Dept d = new Dept("dept" + i); em.persist(d); em.persist(new Emp("emp" + i, d)); } });
    stats.clear();
    tx.executeWithoutResult(s -> repo.findAll().forEach(e -> e.getDept().getName().length()));
    System.out.println("findAll + lazy dept: " + stats.getPrepareStatementCount() + " queries");
    stats.clear();
    tx.executeWithoutResult(s -> repo.findAllWithDept().forEach(e -> e.getDept().getName().length()));
    System.out.println("@EntityGraph:        " + stats.getPrepareStatementCount() + " query");
}`,
      analogy: "N+1 is a waiter who brings the menu, then walks back to the kitchen separately for each guest's water glass. A fetch join is bringing all the glasses on one tray." },
    { title: "Persistence context, dirty checking and the first-level cache",
      text: "Inside a transaction the `EntityManager` keeps a **persistence context**: a map of every loaded entity by id. Loading the same id twice returns the **same instance** without another query (**first-level cache**). Managed entities are **dirty-checked**: at flush (before commit or before a query that needs it) Hibernate compares fields with the loaded snapshot and issues UPDATEs, so you don't call `save()` for managed entities. Lifecycle: **new/transient → managed → detached** (after the transaction or `clear()`) **→ removed**. Huge contexts slow flushes: for batch jobs, flush and clear periodically.",
      m: M(["stateDiagram-v2",
        "  [*] --> Transient: new Entity()",
        "  Transient --> Managed: persist()",
        "  Managed --> Detached: tx ends / clear()",
        "  Detached --> Managed: merge()",
        "  Managed --> Removed: remove()"]),
      code: `@Entity class Wallet {
    @Id Long id; long balance;
    protected Wallet() { }
    Wallet(Long id, long b) { this.id = id; balance = b; }
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class, "--spring.jpa.properties.hibernate.generate_statistics=true")) {
    var tx = ctx.getBean(org.springframework.transaction.support.TransactionTemplate.class);
    EntityManager em = ctx.getBean(EntityManager.class);
    var stats = ctx.getBean(EntityManagerFactory.class).unwrap(org.hibernate.SessionFactory.class).getStatistics();
    tx.executeWithoutResult(s -> em.persist(new Wallet(1L, 1000)));
    stats.clear();
    tx.executeWithoutResult(s -> {
        Wallet a = em.find(Wallet.class, 1L), b = em.find(Wallet.class, 1L);
        System.out.println("same instance: " + (a == b) + ", selects: " + stats.getPrepareStatementCount());
        a.balance -= 250;                                            // no save() call
    });
    System.out.println("updates at commit (dirty checking): " + stats.getEntityUpdateCount());
    System.out.println("balance now: " + tx.execute(s -> em.find(Wallet.class, 1L).balance));
}` },
    { title: "LazyInitializationException and open-in-view",
      text: "A lazy association can only load while its session is open. Touch it after the transaction has ended (for example in a controller, a JSON serializer or another thread) and Hibernate throws **`LazyInitializationException: … could not initialize proxy - no Session`**. Boot's **open-in-view** (on by default, with a startup warning) hides this by keeping the session open for the whole web request, at the cost of surprise queries during rendering and holding a connection longer. Set `spring.jpa.open-in-view=false` and fix the root cause: fetch what the use case needs inside a transactional service (fetch join, entity graph) and **return DTOs**, not entities.",
      code: `@Entity class Playlist {
    @Id @GeneratedValue Long id; String name;
    @ElementCollection List<String> songs = new ArrayList<>();   // lazy by default
    protected Playlist() { }
    Playlist(String n, List<String> s) { name = n; songs.addAll(s); }
}
interface PlaylistRepo extends JpaRepository<Playlist, Long> {
    @EntityGraph(attributePaths = "songs") Optional<Playlist> findWithSongsByName(String name);
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class, "--spring.jpa.open-in-view=false")) {
    PlaylistRepo repo = ctx.getBean(PlaylistRepo.class);
    Long id = repo.save(new Playlist("Road trip", List.of("Ilahi", "Safarnama", "Kun Faya Kun"))).id;
    Playlist p = repo.findById(id).orElseThrow();                   // transaction ends here
    try { System.out.println(p.songs.size()); }
    catch (org.hibernate.LazyInitializationException e) { System.out.println("LazyInitializationException: " + e.getMessage()); }
    System.out.println("with @EntityGraph: " + repo.findWithSongsByName("Road trip").orElseThrow().songs);
}` },
    { title: "Schema migrations with Flyway or Liquibase",
      text: "`ddl-auto=create`/`update` is for demos only; production schemas are changed by **versioned migrations** checked into the repo. **Flyway** runs SQL files named `V1__create_users.sql`, `V2__add_email.sql` from `db/migration` at startup, in order, recording each in `flyway_schema_history` with a checksum; never edit an applied migration, add a new one. **Liquibase** uses changelogs (YAML/XML/SQL) with rollback support. Use `ddl-auto=validate` so Hibernate checks entities against the migrated schema. For zero-downtime deploys, use expand-and-contract: add nullable columns, backfill, switch code, then drop old columns in a later release.",
      code: `Path dir = Files.createTempDirectory("db-migration");
Files.writeString(dir.resolve("V1__create_users.sql"), "create table users(id bigint primary key, name varchar(50) not null);");
Files.writeString(dir.resolve("V2__add_email.sql"), "alter table users add column email varchar(120);");
var flyway = org.flywaydb.core.Flyway.configure().dataSource("jdbc:h2:mem:shop;DB_CLOSE_DELAY=-1", "sa", "").locations("filesystem:" + dir).load();
System.out.println("first deploy applied " + flyway.migrate().migrationsExecuted + " migrations");
Files.writeString(dir.resolve("V3__index_email.sql"), "create unique index ux_users_email on users(email);");
System.out.println("next deploy applied " + flyway.migrate().migrationsExecuted + " migration");
System.out.println("re-run applied " + flyway.migrate().migrationsExecuted);
for (var m : flyway.info().all()) System.out.println("V" + m.getVersion() + " " + m.getDescription() + " → " + m.getState());`,
      analogy: "Migrations are a building's renovation log: each change is numbered, done once, and never rewritten, so any copy of the building can be brought to the same state by replaying the log." }
  ];

  H.registerLesson({
    code: "S06",
    summary: "Talking to relational databases with Spring Data JPA and Hibernate: mapping entities and relationships (fetch types, owning side, cascades, `orphanRemoval`), repositories with derived queries, `@Query`, projections and pagination, the N+1 problem and its fixes (fetch joins, `@EntityGraph`, batch fetching, DTOs), the persistence context with dirty checking and the first-level cache, `LazyInitializationException` and open-in-view, and schema migrations with Flyway or Liquibase.",
    slides: SLIDES,
    widget: { heading: "Interactive: count the SQL behind one innocent loop", caption: "The same 'list orders with customer name and item count' screen, loaded six ways. Every statement count and SQL string was captured from Hibernate 6.6 on H2 with a StatementInspector.", render: s06Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Order history pages", "A list page that was fast with test data issues 2,001 queries in production: a classic N+1, fixed with an entity graph or DTO query."],
      ["Admin tables", "Paged, sortable grids bind `?page=&size=&sort=` straight into a `Pageable`."],
      ["Reporting", "Dashboards use DTO projections and aggregate JPQL instead of loading entities."],
      ["Batch imports", "Nightly jobs flush and clear the persistence context every 500 rows to keep memory flat."],
      ["Deployments", "Flyway migrations run on startup; CI fails if an applied migration's checksum changes."],
      ["Incident reviews", "`LazyInitializationException` in JSON serialization after open-in-view was turned off pointed to entities leaking into controllers."]
    ],
    pitfalls: [
      "Leaving `@ManyToOne` EAGER (the default)",
      "N+1 queries from lazy associations in loops or serializers",
      "Join fetching collections together with pagination (in-memory paging)",
      "Returning entities from controllers instead of DTOs",
      "Relying on open-in-view to hide lazy loading",
      "`@Enumerated(ORDINAL)` (the default) for enums",
      "Setting only the inverse (`mappedBy`) side of a relationship",
      "Cascading REMOVE to shared parents",
      "`ddl-auto=update` in production instead of migrations",
      "Editing a migration that has already been applied"
    ],
    quiz: [
      { q: "What is the default fetch type of @ManyToOne?", options: ["LAZY", "EAGER", "Depends on the database", "BATCH"], answer: 1, why: "Explicitly set LAZY." },
      { q: "100 orders loaded with findAll(), then each order's lazy customer and items are touched. How many SQL statements did the widget record?", options: ["1", "3", "101", "201"], answer: 3, why: "1 for orders + 100 customers + 100 item lists." },
      { q: "Which fix still issues more than one query but far fewer than N+1?", options: ["JOIN FETCH", "@EntityGraph", "hibernate.default_batch_fetch_size", "DTO projection"], answer: 2, why: "It loads lazy associations with IN (…) batches." },
      { q: "What happens with `Page<T>` + join fetch of a collection?", options: ["A LIMIT is added", "Hibernate loads all rows and pages in memory (HHH90003004)", "An exception always", "Only the count query runs"], answer: 1, why: "Recorded SQL has no LIMIT." },
      { q: "In a transaction you load an entity and change a field without calling save(). At commit…", options: ["Nothing is saved", "Dirty checking issues an UPDATE", "An exception is thrown", "Only if @Modifying"], answer: 1, why: "Managed entities are flushed automatically." },
      { q: "Calling em.find(Wallet.class, 1L) twice in one transaction runs…", options: ["2 selects, 2 objects", "1 select and returns the same instance", "0 selects", "1 select, 2 copies"], answer: 1, why: "First-level cache." },
      { q: "`LazyInitializationException: no Session` means…", options: ["The DB is down", "A lazy association was touched after the persistence context closed", "Missing @Entity", "Wrong JDBC URL"], answer: 1, why: "Fetch inside the transaction or use DTOs." },
      { q: "Which side of a bidirectional @OneToMany/@ManyToOne writes the foreign key?", options: ["The mappedBy side", "The @ManyToOne side (owning side)", "Both", "Neither"], answer: 1, why: "Setting only the collection leaves the FK null." },
      { q: "What should production use to evolve the schema?", options: ["ddl-auto=update", "Versioned migrations (Flyway/Liquibase) + ddl-auto=validate", "Manual SQL in a wiki", "ddl-auto=create"], answer: 1, why: "Repeatable, reviewed, tracked." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Code"],
        ["Repository", "`interface BookRepo extends JpaRepository<Book, Long>`"],
        ["Derived query", "`findByCityAndPriceLessThanOrderByRatingDesc(city, max)`"],
        ["JPQL", "`@Query(\"select o from Order o where o.status = :s\")`"],
        ["Fetch join / graph", "`join fetch o.items` / `@EntityGraph(attributePaths = \"items\")`"],
        ["Batch fetching", "`spring.jpa.properties.hibernate.default_batch_fetch_size=16`"],
        ["Projection", "`interface NameOnly { String getName(); }` or a record DTO"],
        ["Bulk update", "`@Modifying(clearAutomatically = true) @Query(\"update …\")` + transaction"],
        ["Paging", "`Page<T> findByX(x, PageRequest.of(0, 20, Sort.by(\"price\").descending()))`"],
        ["Safer defaults", "`fetch = LAZY`, `EnumType.STRING`, `open-in-view=false`, `ddl-auto=validate`"]],
      cards: [
        { title: "Mapping", items: ["LAZY everywhere", "Owning side = FK", "Cascade only composition", "orphanRemoval for owned children"] },
        { title: "Performance", items: ["Watch SQL counts", "Fetch join / entity graph", "DTOs for lists", "Batch fetch size", "Flush/clear in batches"] },
        { title: "Say in interviews", items: ["N+1 and fixes", "Persistence context", "Dirty checking", "LazyInitializationException", "Flyway migrations"] }]
    },
    practice: [
      { level: "Easy", q: "Write a repository with derived queries for an Employee entity: by department, salary above a value, and count by department.",
        a: ["Extend JpaRepository<Employee, Long>.",
          "Name methods findByDepartment, findBySalaryGreaterThan, countByDepartment.",
          "Spring Data generates the JPQL at startup."],
        code: `@Entity class Employee {
    @Id @GeneratedValue Long id; String name; String department; int salary;
    protected Employee() { }
    Employee(String n, String d, int s) { name = n; department = d; salary = s; }
    public String toString() { return name; }
}
interface EmployeeRepo extends JpaRepository<Employee, Long> {
    List<Employee> findByDepartment(String d);
    List<Employee> findBySalaryGreaterThanOrderBySalaryDesc(int s);
    long countByDepartment(String d);
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    EmployeeRepo r = ctx.getBean(EmployeeRepo.class);
    r.saveAll(List.of(new Employee("Neha", "eng", 180000), new Employee("Arjun", "eng", 120000), new Employee("Priya", "sales", 90000)));
    System.out.println(r.findByDepartment("eng") + " " + r.findBySalaryGreaterThanOrderBySalaryDesc(100000) + " sales=" + r.countByDepartment("sales"));
}` },
      { level: "Easy", q: "What's the difference between save(), persist and merge?",
        a: ["persist makes a new entity managed (INSERT at flush); merge copies a detached entity's state onto a managed copy and returns it.",
          "Spring Data save() calls persist for new entities (id null or @Version null) and merge otherwise.",
          "Managed entities don't need save() at all; dirty checking writes changes."] },
      { level: "Easy", q: "Explain owning side and mappedBy.",
        a: ["The owning side holds the foreign key column (usually @ManyToOne) and is what Hibernate writes.",
          "mappedBy marks the inverse side; changes only there are ignored.",
          "Keep both sides in sync with helper methods like addItem/removeItem."] },
      { level: "Medium", q: "Detect and fix an N+1 in a list endpoint.",
        a: ["Detect: enable SQL logging or Hibernate statistics; assert query counts in a test.",
          "Fix with @EntityGraph or join fetch for the needed associations, or a DTO query.",
          "As a safety net set default_batch_fetch_size."],
        code: `@Entity class Team { @Id @GeneratedValue Long id; String name; protected Team() { } Team(String n) { name = n; } String getName() { return name; } }
@Entity class Player {
    @Id @GeneratedValue Long id; String name;
    @ManyToOne(fetch = FetchType.LAZY) Team team;
    protected Player() { }
    Player(String n, Team t) { name = n; team = t; }
    Team getTeam() { return team; }
}
interface Row { String getPlayer(); String getTeam(); }
interface PlayerRepo extends JpaRepository<Player, Long> {
    @Query("select p.name as player, t.name as team from Player p join p.team t order by p.name") List<Row> rows();
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class, "--spring.jpa.properties.hibernate.generate_statistics=true")) {
    var tx = ctx.getBean(org.springframework.transaction.support.TransactionTemplate.class);
    var stats = ctx.getBean(EntityManagerFactory.class).unwrap(org.hibernate.SessionFactory.class).getStatistics();
    PlayerRepo repo = ctx.getBean(PlayerRepo.class);
    tx.executeWithoutResult(s -> { EntityManager em = ctx.getBean(EntityManager.class);
        for (int i = 0; i < 8; i++) { Team t = new Team("team" + i); em.persist(t); em.persist(new Player("p" + i, t)); } });
    stats.clear(); tx.executeWithoutResult(s -> repo.findAll().forEach(p -> p.getTeam().getName().length()));
    System.out.println("entities + lazy: " + stats.getPrepareStatementCount() + " queries");
    stats.clear(); List<Row> rows = repo.rows();
    System.out.println("DTO query: " + stats.getPrepareStatementCount() + " query, first row " + rows.get(0).getPlayer() + "/" + rows.get(0).getTeam());
}` },
      { level: "Medium", q: "Why can join fetch + pagination be dangerous and what do you do instead?",
        a: ["With a collection fetch, rows multiply per child, so SQL LIMIT can't apply to parents; Hibernate fetches everything and pages in memory (HHH90003004).",
          "Option 1: query a page of parent ids, then fetch those parents with their collections (where id in :ids).",
          "Option 2: page the parents only and rely on batch fetching for the collection.",
          "Set hibernate.query.fail_on_pagination_over_collection_fetch=true to catch it early."] },
      { level: "Medium", q: "Show that dirty checking updates a managed entity without save(), and that detached changes are lost.",
        a: ["Change a field inside a transaction: UPDATE at commit.",
          "Change a field on an entity loaded in an earlier transaction (detached): nothing happens unless you merge/save it."],
        code: `@Entity class Seat { @Id Long id; String status; protected Seat() { } Seat(Long id, String s) { this.id = id; status = s; } }
interface SeatRepo extends JpaRepository<Seat, Long> { }
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    var tx = ctx.getBean(org.springframework.transaction.support.TransactionTemplate.class);
    SeatRepo repo = ctx.getBean(SeatRepo.class);
    repo.save(new Seat(1L, "FREE")); repo.save(new Seat(2L, "FREE"));
    tx.executeWithoutResult(s -> repo.findById(1L).orElseThrow().status = "HELD");     // managed
    Seat detached = repo.findById(2L).orElseThrow();                                   // tx already over
    detached.status = "HELD";
    System.out.println(repo.findAll().stream().map(x -> x.id + "=" + x.status).toList());
}` },
      { level: "Medium", q: "When would you use a projection instead of an entity?",
        a: ["Read-only screens, APIs and reports that need a few columns or aggregates.",
          "Projections skip dirty checking and the persistence context, fetch less data and can't trigger lazy loading.",
          "Use entities when you need to modify state and enforce domain behaviour.",
          "Note: touching a lazy proxy's fields directly (proxy.name) bypasses initialisation; always go through getters."] },
      { level: "Hard", q: "Design the persistence layer for an order service with orders, line items, customers and products.",
        steps: ["Order aggregate: Order owns OrderLine (cascade ALL + orphanRemoval); lines reference Product by id or LAZY @ManyToOne without cascade.",
          "Customer is a separate aggregate: LAZY @ManyToOne from Order, no cascade.",
          "Money as BigDecimal/minor units, status as EnumType.STRING, @Version for optimistic locking (S07), SEQUENCE ids with pooled optimizer.",
          "Read side: DTO queries for history lists with keyset pagination; entity graphs for detail screens.",
          "Flyway migrations, ddl-auto=validate, open-in-view=false, query-count tests in CI."] },
      { level: "Hard", q: "A batch job imports 1 million rows with JPA and runs out of memory. Fix it.",
        a: ["Every persisted entity stays in the persistence context until commit: flush() and clear() every N (e.g. 500) rows.",
          "Enable JDBC batching: hibernate.jdbc.batch_size, order_inserts; avoid IDENTITY ids, which disable insert batching.",
          "Commit in chunks (Spring Batch chunk-oriented steps), so a failure doesn't roll back everything.",
          "For pure loads consider JdbcTemplate batchUpdate or the database's COPY/LOAD tools."] },
      { level: "Hard", q: "Write a Flyway migration sequence that renames a column with zero downtime.",
        a: ["V5: add the new column (nullable) and backfill; code version N writes both columns and reads the old one.",
          "Deploy N+1: reads the new column, still writes both.",
          "V6 (after all instances run N+1): add NOT NULL, stop writing the old column.",
          "V7 (later release): drop the old column. Never rename in one step while old instances are still running."] }
    ],
    recap: [
      "JPA maps classes to tables, Hibernate generates the SQL and Spring Data generates repositories; always know which SQL runs.",
      "Make associations LAZY, set the owning side, and cascade only for true composition.",
      "Use derived queries, @Query, projections and Pageable; Slice when counts are expensive.",
      "Kill N+1 with fetch joins, entity graphs, DTOs or batch fetching, and never join-fetch collections with pagination.",
      "Managed entities are cached and dirty-checked; LazyInitializationException means fetching too late. Evolve schemas with migrations."
    ]
  });
})();
