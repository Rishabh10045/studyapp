/* Lesson S07: Transactions: @Transactional, propagation & isolation */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded with Spring Boot 3.4 (DataSourceTransactionManager, H2). Outer.run() is @Transactional (REQUIRED), inserts
  // 'outer', then calls a method on a separate Inner bean that inserts 'inner'. "rows" = what was committed afterwards,
  // "ex" = the exception the caller of Outer.run() saw.
  var REC = {"REQUIRED|ok": {"rows": ["outer", "inner"], "ex": ""}, "REQUIRED|catch": {"rows": [], "ex": "UnexpectedRollbackException: Transaction rolled back because it has been marked as rollback-only"}, "REQUIRED|outerFails": {"rows": [], "ex": "IllegalStateException: outer failed after inner returned"}, "REQUIRES_NEW|ok": {"rows": ["outer", "inner"], "ex": ""}, "REQUIRES_NEW|catch": {"rows": ["outer"], "ex": ""}, "REQUIRES_NEW|outerFails": {"rows": ["inner"], "ex": "IllegalStateException: outer failed after inner returned"}, "NESTED|ok": {"rows": ["outer", "inner"], "ex": ""}, "NESTED|catch": {"rows": ["outer"], "ex": ""}, "NESTED|outerFails": {"rows": [], "ex": "IllegalStateException: outer failed after inner returned"}, "checked": {"rows": ["outer"], "ex": "IOException: checked failure"}, "rollbackFor": {"rows": [], "ex": "IOException: checked failure"}, "self": {"rows": ["outer"], "ex": "IllegalStateException: failed inside txWork"}, "mandatory": {"rows": [], "ex": "IllegalTransactionStateException: No existing transaction found for transaction marked with propagation 'mandatory'"}};
  var PROPS = ["REQUIRED", "REQUIRES_NEW", "NESTED"];
  var MODES = [
    { k: "ok", label: "both succeed" },
    { k: "catch", label: "inner throws, outer catches it" },
    { k: "outerFails", label: "inner ok, then outer throws" }
  ];
  var TRAPS = [
    { k: "checked", label: "checked exception", code: "@Transactional\npublic void checked() throws IOException {\n    insert('outer');\n    throw new IOException(\"checked failure\");\n}", why: "By default Spring rolls back only on **unchecked** exceptions (RuntimeException, Error). A checked exception **commits** the transaction." },
    { k: "rollbackFor", label: "rollbackFor = Exception.class", code: "@Transactional(rollbackFor = Exception.class)\npublic void checkedRollbackFor() throws IOException {\n    insert('outer');\n    throw new IOException(\"checked failure\");\n}", why: "With `rollbackFor = Exception.class` the same checked exception now rolls back." },
    { k: "self", label: "self-invocation", code: "public void selfCall() { this.txWork(); }     // no @Transactional here\n\n@Transactional\npublic void txWork() {\n    insert('outer');\n    throw new IllegalStateException(\"failed inside txWork\");\n}", why: "`this.txWork()` bypasses the proxy, so **no transaction** starts. The insert auto-commits and survives the exception." },
    { k: "mandatory", label: "MANDATORY without a tx", code: "@Transactional(propagation = Propagation.MANDATORY)\npublic void mandatory(boolean fail) { insert('inner'); }\n\ninner.mandatory(false);   // called from a non-transactional caller", why: "MANDATORY requires an existing transaction and refuses to start one: `IllegalTransactionStateException` before the method body runs." }
  ];
  var EXPLAIN = {
    "REQUIRED|ok": "Inner **joins** the outer transaction T1; one commit at the end writes both rows.",
    "REQUIRED|catch": "Inner joined T1. Its exception passed through the inner proxy, which marked T1 **rollback-only**. Outer caught the exception and tried to commit, so Spring rolled back everything and threw **`UnexpectedRollbackException`**.",
    "REQUIRED|outerFails": "One shared transaction: the outer exception rolls back both rows.",
    "REQUIRES_NEW|ok": "T1 is **suspended** while inner runs in its own transaction T2 (on a second connection). Both commit independently.",
    "REQUIRES_NEW|catch": "T2 rolled back on its own; outer caught the exception and T1 committed. Typical for audit/failure logs that must survive.",
    "REQUIRES_NEW|outerFails": "T2 had **already committed** when outer failed, so `inner` survives while `outer` is rolled back. Great for audit logs, dangerous for business data.",
    "NESTED|ok": "Inner runs inside T1 after a JDBC **savepoint**; everything commits together.",
    "NESTED|catch": "Inner's failure rolled back **to the savepoint** only; outer caught it and T1 committed its own row.",
    "NESTED|outerFails": "A nested part is still part of T1, so the outer failure rolls back both rows (unlike REQUIRES_NEW)."
  };
  function txShape(p, mode) {
    var L = ["flowchart TB", "  O[\"Outer.run() @Transactional<br/>T1 begins, insert outer\"]:::t1"];
    if (p === "REQUIRED") L.push("  I[\"Inner REQUIRED<br/>joins T1, insert inner\"]:::t1");
    if (p === "REQUIRES_NEW") L.push("  I[\"Inner REQUIRES_NEW<br/>T1 suspended, T2 begins\"]:::t2");
    if (p === "NESTED") L.push("  I[\"Inner NESTED<br/>savepoint SP1 inside T1\"]:::t1");
    L.push("  O --> I");
    var r = REC[p + "|" + mode], ok = r.rows;
    L.push("  R[\"committed: " + (ok.length ? ok.join(", ") : "nothing") + "\"]:::" + (ok.length === 2 ? "good" : ok.length ? "part" : "bad"));
    L.push("  I --> R");
    L.push("  classDef t1 fill:#dbeafe,stroke:#2563eb", "  classDef t2 fill:#fef3c7,stroke:#b45309", "  classDef good fill:#e8f5e9,stroke:#2e7d32", "  classDef part fill:#fff3e0,stroke:#ef6c00", "  classDef bad fill:#ffebee,stroke:#c62828");
    return L.join("\n");
  }
  function rowsHtml(ctx, rows, which) {
    return which.map(function (w) { var ok = rows.indexOf(w) >= 0; return "<span style='display:inline-block;margin-right:10px;padding:2px 8px;border-radius:6px;background:" + (ok ? "#e8f5e9" : "#ffebee") + "'>" + (ok ? "✓ " : "✗ ") + ctx.esc(w) + " row</span>"; }).join("");
  }
  var CODE = "@Transactional                                   // Outer bean\npublic void run(...) {\n    insert('outer');\n    try { inner.method(fail); }                  // separate bean → goes through its proxy\n    catch (RuntimeException e) { }               // only in 'outer catches' scenario\n    if (outerFails) throw new IllegalStateException(...);\n}\n\n@Transactional(propagation = Propagation.X)       // Inner bean\npublic void method(boolean fail) { insert('inner'); if (fail) throw new IllegalStateException(...); }";
  function s07Widget(el, ctx) {
    var s = ctx.state; if (!s.p) s.p = "REQUIRED"; if (!s.m) s.m = "catch"; if (!s.v) s.v = "prop";
    el.innerHTML = "<pre class='code' data-r='code'></pre><div class='btnrow' data-r='ps' style='margin-top:8px'>" + PROPS.map(function (p) { return "<button type='button' class='btn' data-p='" + p + "'>" + p + "</button>"; }).join("") + "</div>" +
      "<div class='btnrow' data-r='ms' style='margin-top:6px'>" + MODES.map(function (m) { return "<button type='button' class='btn' data-m='" + m.k + "'>" + m.label + "</button>"; }).join("") + "</div>" +
      "<div class='btnrow' data-r='ts' style='margin-top:6px'><span style='font-size:13px;margin-right:6px'>Traps:</span>" + TRAPS.map(function (t) { return "<button type='button' class='btn' data-t='" + t.k + "'>" + t.label + "</button>"; }).join("") + "</div>" +
      "<div class='diagram' data-r='dg' style='margin-top:8px'></div><div data-r='rows' style='margin:8px 0'></div><div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      q("ps").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", s.v === "prop" && b.dataset.p === s.p); });
      q("ms").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", s.v === "prop" && b.dataset.m === s.m); });
      q("ts").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", s.v === b.dataset.t); });
      var r;
      if (s.v === "prop") {
        r = REC[s.p + "|" + s.m];
        q("code").innerHTML = ctx.H.highlight(CODE.replace("Propagation.X", "Propagation." + s.p), "java");
        q("dg").style.display = ""; ctx.H.renderDiagram(q("dg"), txShape(s.p, s.m));
        q("rows").innerHTML = rowsHtml(ctx, r.rows, ["outer", "inner"]);
        q("res").innerHTML = ctx.md(EXPLAIN[s.p + "|" + s.m] + "\n\nCaller saw: " + (r.ex ? "`" + r.ex + "`" : "no exception"));
      } else {
        var t = TRAPS.filter(function (x) { return x.k === s.v; })[0]; r = REC[t.k];
        q("code").innerHTML = ctx.H.highlight(t.code, "java");
        q("dg").style.display = "none"; q("dg").innerHTML = "";
        q("rows").innerHTML = rowsHtml(ctx, r.rows, t.k === "mandatory" ? ["inner"] : ["outer"]);
        q("res").innerHTML = ctx.md(t.why + "\n\nCaller saw: `" + r.ex + "`");
      }
    }
    q("ps").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.p = b.dataset.p; s.v = "prop"; ctx.save(); draw(); });
    q("ms").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.m = b.dataset.m; s.v = "prop"; ctx.save(); draw(); });
    q("ts").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.v = b.dataset.t; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Transactions and Spring's abstraction",
      text: "A transaction groups statements into one **ACID** unit: **A**tomic (all or nothing), **C**onsistent (constraints hold), **I**solated (concurrent transactions don't see each other's half-done work, to a configurable degree) and **D**urable (committed data survives crashes). Spring hides the API differences between JDBC, JPA and others behind **`PlatformTransactionManager`** (`DataSourceTransactionManager`, `JpaTransactionManager`…) and binds the current connection to the thread. You use it declaratively with `@Transactional` or programmatically with **`TransactionTemplate`**.",
      m: M(["flowchart TB",
        "  A[\"@Transactional / TransactionTemplate\"]:::s2 --> P[\"PlatformTransactionManager\"]:::s3",
        "  P --> J[\"DataSourceTransactionManager<br/>(JDBC)\"]:::s1", "  P --> JP[\"JpaTransactionManager<br/>(JPA + JDBC)\"]:::s1",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00"]),
      code: `@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
    TransactionTemplate tx = ctx.getBean(TransactionTemplate.class);
    jdbc.execute("create table account(id varchar(10) primary key, balance int check (balance >= 0))");
    jdbc.update("insert into account values ('asha', 1000), ('ravi', 200)");
    for (int amount : new int[] {300, 5000}) {
        try {
            tx.executeWithoutResult(s -> {
                jdbc.update("update account set balance = balance + ? where id = 'ravi'", amount);   // credit first
                jdbc.update("update account set balance = balance - ? where id = 'asha'", amount);   // violates CHECK for 5000
            });
        } catch (Exception e) { System.out.println("transfer " + amount + " failed: " + e.getClass().getSimpleName()); }
        System.out.println("after " + amount + ": " + jdbc.queryForList("select id, balance from account order by id"));
    }
}`,
      analogy: "A transaction is a UPI transfer: either the money leaves your account and reaches the other one, or nothing happens at all. Nobody should ever see it deducted but not credited." },
    { title: "@Transactional works through proxies",
      text: "Spring wraps beans that have `@Transactional` methods in a **proxy** (S01). When a caller invokes the method **through the proxy**, a `TransactionInterceptor` gets or begins a transaction, calls your method, then **commits**, or **rolls back** if a matching exception escapes. Put `@Transactional` on **service** methods that form one business operation, not on controllers or every repository call. Class-level annotations apply to all public methods; method-level settings override them.",
      m: M(["flowchart LR",
        "  C[\"caller\"]:::s1 --> P[\"proxy<br/>begin tx\"]:::s3 --> T[\"PaymentService.pay()\"]:::s4",
        "  T --> P2[\"proxy<br/>commit / rollback\"]:::s3 --> C2[\"caller gets result\"]:::s1",
        "  classDef s1 fill:#f3f4f6,stroke:#6b7280", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `@Service class PaymentService {
    @Transactional public String pay() { return "tx active=" + TransactionSynchronizationManager.isActualTransactionActive() + ", name=" + TransactionSynchronizationManager.getCurrentTransactionName(); }
    public String plain() { return "tx active=" + TransactionSynchronizationManager.isActualTransactionActive(); }
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    PaymentService svc = ctx.getBean(PaymentService.class);
    System.out.println("bean class: " + svc.getClass().getSimpleName() + " (AOP proxy: " + AopUtils.isAopProxy(svc) + ")");
    System.out.println("pay():   " + svc.pay());
    System.out.println("plain(): " + svc.plain());
}` },
    { title: "Self-invocation and private-method traps",
      text: "Because the transaction lives in the proxy, calling a `@Transactional` method **from another method of the same class** (`this.save()`) skips the proxy: **no transaction** and no rollback. `private` methods (and `final` ones with CGLIB) can't be intercepted at all; since Spring 6, protected and package-private methods work with class-based proxies. Fixes: move the method to **another bean**, put `@Transactional` on the public entry point, use `TransactionTemplate`, or (last resort) inject the proxy into itself with `@Lazy`. The widget's self-invocation trap shows the insert surviving an exception.",
      code: `@Service class ReportService {
    final Archiver archiver;
    ReportService(Archiver a) { archiver = a; }
    public String viaThis() { return this.save(); }             // bypasses the proxy
    public String viaOtherBean() { return archiver.save(); }    // goes through Archiver's proxy
    @Transactional public String save() { return TransactionSynchronizationManager.isActualTransactionActive() ? "transaction" : "NO transaction"; }
}
@Service class Archiver {
    @Transactional public String save() { return TransactionSynchronizationManager.isActualTransactionActive() ? "transaction" : "NO transaction"; }
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    ReportService r = ctx.getBean(ReportService.class);
    System.out.println("r.save() from outside: " + r.save());
    System.out.println("this.save() inside:    " + r.viaThis());
    System.out.println("other bean:            " + r.viaOtherBean());
}`,
      analogy: "The proxy is a receptionist who logs every visitor. Walking in through the front door gets you logged; talking to a colleague at the next desk (self-invocation) never passes the receptionist." },
    { title: "Propagation: what happens when transactional methods call each other",
      text: "Propagation decides how a `@Transactional` method behaves when a transaction **already exists**. **REQUIRED** (default) joins it or starts one. **REQUIRES_NEW** suspends the caller's transaction and runs in a separate one that commits on its own (needs a second connection, so beware of pool exhaustion and deadlocks with the outer transaction). **NESTED** uses a savepoint inside the same transaction (JDBC only). The others assert or avoid transactions. Try all three in the widget: the outcomes were recorded from real runs.",
      table: [["Propagation", "Existing transaction", "No transaction", "Use for"],
        ["REQUIRED (default)", "join it", "start one", "almost everything"],
        ["REQUIRES_NEW", "suspend it, start a new one", "start one", "audit logs, outbox writes that must survive"],
        ["NESTED", "savepoint inside it", "start one", "optional sub-steps that may fail (JDBC)"],
        ["SUPPORTS", "join it", "run without", "read helpers"],
        ["MANDATORY", "join it", "throw IllegalTransactionStateException", "methods that must be called inside a transaction"],
        ["NOT_SUPPORTED", "suspend it, run without", "run without", "long non-DB work"],
        ["NEVER", "throw", "run without", "assert no transaction"]],
      code: `@Service class AuditLog {
    final JdbcTemplate jdbc; AuditLog(JdbcTemplate j) { jdbc = j; }
    @Transactional(propagation = Propagation.REQUIRES_NEW) public void record(String msg) { jdbc.update("insert into audit(msg) values (?)", msg); }
}
@Service class OrderService {
    final JdbcTemplate jdbc; final AuditLog audit;
    OrderService(JdbcTemplate j, AuditLog a) { jdbc = j; audit = a; }
    @Transactional public void place(String item) {
        jdbc.update("insert into orders_t(item) values (?)", item);
        audit.record("attempted order: " + item);
        if (item.equals("iphone")) throw new IllegalStateException("payment declined");
    }
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
    jdbc.execute("create table orders_t(item varchar(20))"); jdbc.execute("create table audit(msg varchar(50))");
    OrderService svc = ctx.getBean(OrderService.class);
    svc.place("kettle");
    try { svc.place("iphone"); } catch (IllegalStateException e) { System.out.println("place(iphone): " + e.getMessage()); }
    System.out.println("orders: " + jdbc.queryForList("select item from orders_t", String.class));
    System.out.println("audit:  " + jdbc.queryForList("select msg from audit", String.class));
}` },
    { title: "Rollback-only and UnexpectedRollbackException",
      text: "With REQUIRED, an inner method **shares** the outer transaction. If an exception leaves the inner `@Transactional` method, its proxy marks the **whole** transaction **rollback-only**, even if the outer method catches the exception and carries on. At commit Spring discovers the flag, rolls back and throws **`UnexpectedRollbackException`**. Fixes: don't let expected outcomes be exceptions (return a result), validate before entering the transactional method, use `noRollbackFor`, or run the optional step with REQUIRES_NEW/NESTED.",
      code: `@Service class Coupons {
    @Transactional public int discount(String code) { if (!code.equals("DIWALI10")) throw new IllegalArgumentException("unknown coupon " + code); return 10; }
}
@Service class Checkout {
    final Coupons coupons; Checkout(Coupons c) { coupons = c; }
    @Transactional public String pay(String code) {
        int off = 0;
        try { off = coupons.discount(code); } catch (IllegalArgumentException e) { /* ignore, charge full price */ }
        return "charged with " + off + "% off";
    }
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    Checkout c = ctx.getBean(Checkout.class);
    System.out.println(c.pay("DIWALI10"));
    try { System.out.println(c.pay("FAKE50")); }
    catch (UnexpectedRollbackException e) { System.out.println("FAKE50 → " + e.getClass().getSimpleName() + ": " + e.getMessage()); }
}` },
    { title: "NESTED vs REQUIRES_NEW",
      text: "Both let an inner step fail without failing the caller, but they differ when the **outer** transaction fails. **REQUIRES_NEW** has already **committed** independently, so its work survives an outer rollback. **NESTED** is a **savepoint** within the outer transaction: inner failure rolls back to the savepoint, but an outer rollback undoes everything. NESTED needs savepoint support: `DataSourceTransactionManager`/JDBC yes, `JpaTransactionManager` with Hibernate no (it throws `NestedTransactionNotSupportedException`).",
      m: M(["flowchart TB",
        "  subgraph RN[\"REQUIRES_NEW\"]", "    A1[\"T1 outer\"]:::s2 --> A2[\"T2 inner commits by itself\"]:::s3", "  end",
        "  subgraph NE[\"NESTED\"]", "    B1[\"T1 outer\"]:::s2 --> B2[\"savepoint inside T1\"]:::s4", "  end",
        "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fef3c7,stroke:#b45309", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `@Service class Points {
    final JdbcTemplate jdbc; Points(JdbcTemplate j) { jdbc = j; }
    @Transactional(propagation = Propagation.NESTED) public void award(String user, int pts) {
        jdbc.update("insert into ledger(entry) values (?)", "points:" + user + ":" + pts);
        if (pts > 100) throw new IllegalArgumentException("too many points");
    }
}
@Service class Signup {
    final JdbcTemplate jdbc; final Points points;
    Signup(JdbcTemplate j, Points p) { jdbc = j; points = p; }
    @Transactional public void register(String user, int bonus) {
        jdbc.update("insert into ledger(entry) values (?)", "user:" + user);
        try { points.award(user, bonus); } catch (IllegalArgumentException e) { /* signup still succeeds */ }
    }
}
@SpringBootApplication(exclude = { HibernateJpaAutoConfiguration.class, org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration.class })
class App { }
try (var ctx = SpringApplication.run(App.class)) {
    JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
    jdbc.execute("create table ledger(id int auto_increment, entry varchar(40))");
    System.out.println("tx manager: " + ctx.getBean(PlatformTransactionManager.class).getClass().getSimpleName());
    Signup s = ctx.getBean(Signup.class);
    s.register("meera", 50); s.register("kabir", 500);
    System.out.println(jdbc.queryForList("select entry from ledger order by id", String.class));
}` },
    { title: "Isolation levels and read anomalies",
      text: "Isolation controls what a transaction can see of concurrent ones. Weaker levels allow **anomalies**: a **dirty read** sees uncommitted data, a **non-repeatable read** gets a different value when reading the same row twice, a **phantom read** gets a different set of rows for the same query, and a **lost update** silently overwrites a concurrent change. Set it per method with `@Transactional(isolation = Isolation.REPEATABLE_READ)`; the default is the database's (READ COMMITTED on PostgreSQL, Oracle and SQL Server; REPEATABLE READ on MySQL InnoDB). Higher isolation costs throughput and causes more retries, so most systems use READ COMMITTED plus explicit locking where it matters.",
      table: [["Level", "Dirty read", "Non-repeatable read", "Phantom read"],
        ["READ_UNCOMMITTED", "possible", "possible", "possible"],
        ["READ_COMMITTED", "prevented", "possible", "possible"],
        ["REPEATABLE_READ", "prevented", "prevented", "possible (prevented by MVCC snapshots in PostgreSQL/MySQL)"],
        ["SERIALIZABLE", "prevented", "prevented", "prevented"]],
      code: `class Db {
    static int qty(java.sql.Connection c) throws java.sql.SQLException {
        var rs = c.createStatement().executeQuery("select qty from stock where sku = 'TEA'"); rs.next(); return rs.getInt(1);
    }
}
String url = "jdbc:h2:mem:iso;DB_CLOSE_DELAY=-1";
try (var setup = java.sql.DriverManager.getConnection(url)) {
    setup.createStatement().execute("create table stock(sku varchar(10), qty int)");
    setup.createStatement().execute("insert into stock values ('TEA', 10)");
}
Map<Integer, String> names = Map.of(java.sql.Connection.TRANSACTION_READ_COMMITTED, "READ_COMMITTED ", java.sql.Connection.TRANSACTION_REPEATABLE_READ, "REPEATABLE_READ");
for (int level : List.of(java.sql.Connection.TRANSACTION_READ_COMMITTED, java.sql.Connection.TRANSACTION_REPEATABLE_READ)) {
    try (var reader = java.sql.DriverManager.getConnection(url); var writer = java.sql.DriverManager.getConnection(url)) {
        writer.createStatement().executeUpdate("update stock set qty = 10 where sku = 'TEA'");          // reset
        reader.setAutoCommit(false); reader.setTransactionIsolation(level);
        int first = Db.qty(reader);
        writer.createStatement().executeUpdate("update stock set qty = qty - 1 where sku = 'TEA'");   // another tx commits
        int second = Db.qty(reader);
        reader.commit();
        System.out.println(names.get(level) + ": read " + first + ", then " + second + (first == second ? " (repeatable)" : " (non-repeatable read)"));
    }
}` },
    { title: "Rollback rules",
      text: "By default Spring rolls back on **unchecked** exceptions (`RuntimeException`, `Error`) and **commits** on **checked** ones, following the old EJB convention that checked exceptions are expected business outcomes. Many teams find this surprising: use **`rollbackFor = Exception.class`** (or define domain exceptions as unchecked), and **`noRollbackFor`** for exceptions that shouldn't undo work. Catching an exception inside the method means the proxy never sees it, so the transaction commits; to roll back without throwing, call `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`.",
      code: `class InvoiceException extends Exception { InvoiceException(String m) { super(m); } }
@Service class Billing {
    final JdbcTemplate jdbc; Billing(JdbcTemplate j) { jdbc = j; }
    @Transactional public void defaultRules(String id) throws InvoiceException { jdbc.update("insert into invoice values (?)", id); throw new InvoiceException("PDF failed"); }
    @Transactional(rollbackFor = Exception.class) public void rollbackForAll(String id) throws InvoiceException { jdbc.update("insert into invoice values (?)", id); throw new InvoiceException("PDF failed"); }
    @Transactional(noRollbackFor = IllegalStateException.class) public void keepOnIllegalState(String id) { jdbc.update("insert into invoice values (?)", id); throw new IllegalStateException("email failed"); }
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
    jdbc.execute("create table invoice(id varchar(20))");
    Billing b = ctx.getBean(Billing.class);
    try { b.defaultRules("INV-1"); } catch (Exception e) { }
    try { b.rollbackForAll("INV-2"); } catch (Exception e) { }
    try { b.keepOnIllegalState("INV-3"); } catch (Exception e) { }
    System.out.println("committed invoices: " + jdbc.queryForList("select id from invoice order by id", String.class));
}` },
    { title: "Read-only transactions and timeouts",
      text: "`@Transactional(readOnly = true)` is a hint that the transaction won't write. With JPA, Spring sets Hibernate's flush mode to MANUAL and marks the session read-only, so **no dirty checking or snapshots** (less memory and CPU), and the JDBC connection is flagged read-only, which some drivers and routing data sources use to send queries to **replicas**. A common pattern is `@Transactional(readOnly = true)` on the service class and plain `@Transactional` on write methods. `timeout` (seconds) aborts long transactions instead of letting them hold locks forever.",
      code: `@Entity class Price {
    @Id String sku; int amount;
    protected Price() { }
    Price(String s, int a) { sku = s; amount = a; }
}
interface PriceRepo extends JpaRepository<Price, String> { }
@Service @Transactional(readOnly = true)
class Catalog {
    final PriceRepo repo; Catalog(PriceRepo r) { repo = r; }
    public String peek(String sku) {
        Price p = repo.findById(sku).orElseThrow();
        p.amount = 1;                                        // accidental change in a read path
        return "readOnly=" + TransactionSynchronizationManager.isCurrentTransactionReadOnly();
    }
    @Transactional public void reprice(String sku, int amount) { repo.findById(sku).orElseThrow().amount = amount; }
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    PriceRepo repo = ctx.getBean(PriceRepo.class); Catalog cat = ctx.getBean(Catalog.class);
    repo.save(new Price("TEA", 250));
    System.out.println(cat.peek("TEA") + ", stored price after peek: " + repo.findById("TEA").orElseThrow().amount);
    cat.reprice("TEA", 275);
    System.out.println("after reprice: " + repo.findById("TEA").orElseThrow().amount);
}` },
    { title: "Optimistic locking with @Version",
      text: "Optimistic locking assumes conflicts are rare. Add a **`@Version`** column: every UPDATE becomes `update … set …, version = version + 1 where id = ? and version = ?`. If another transaction changed the row since you read it, zero rows match and Spring throws **`ObjectOptimisticLockingFailureException`**. Map it to **409 Conflict** (or retry the whole operation) so users don't silently overwrite each other's changes. No locks are held while users think, which makes it ideal for web forms and REST updates (pair it with ETags/If-Match).",
      code: `@Entity class Seat {
    @Id Long id; String holder; @Version Integer version;
    protected Seat() { }
    Seat(Long id) { this.id = id; }
}
interface SeatRepo extends JpaRepository<Seat, Long> { }
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    SeatRepo repo = ctx.getBean(SeatRepo.class);
    repo.save(new Seat(7L));
    Seat asha = repo.findById(7L).orElseThrow(), ravi = repo.findById(7L).orElseThrow();   // both read version 0
    asha.holder = "Asha"; repo.save(asha);                                                  // version 0 → 1
    ravi.holder = "Ravi";
    try { repo.save(ravi); } catch (ObjectOptimisticLockingFailureException e) { System.out.println("Ravi's save: " + e.getClass().getSimpleName() + " → respond 409, reload and retry"); }
    Seat s = repo.findById(7L).orElseThrow();
    System.out.println("seat 7 held by " + s.holder + ", version " + s.version);
}`,
      analogy: "Optimistic locking is editing a shared document that says 'version 12' at the top: when you save, the system checks it's still version 12. If someone saved first, you're asked to merge rather than overwrite them." },
    { title: "Pessimistic locking and choosing a strategy",
      text: "**Pessimistic locking** takes a database row lock when reading: `@Lock(LockModeType.PESSIMISTIC_WRITE)` issues `SELECT … FOR UPDATE`, so concurrent writers **wait** until the lock holder commits. Use it for short, hot, high-contention updates (inventory counters, wallet balances) where retries would be wasteful; keep those transactions tiny, lock rows in a consistent order to avoid deadlocks (J26), and set lock timeouts. Alternatives: atomic SQL (`update … set qty = qty - 1 where qty > 0`), optimistic `@Version` with retries for low contention, or a distributed lock only when the resource isn't in one database. Without either, read-modify-write loses updates:",
      code: `@Entity class Counter { @Id String name; int hits; protected Counter() { } Counter(String n) { name = n; } }
interface CounterRepo extends JpaRepository<Counter, String> {
    @org.springframework.data.jpa.repository.Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from Counter c where c.name = :n") Counter lockByName(String n);
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class, "--spring.datasource.url=jdbc:h2:mem:locks;LOCK_TIMEOUT=10000")) {
    CounterRepo repo = ctx.getBean(CounterRepo.class); TransactionTemplate tx = ctx.getBean(TransactionTemplate.class);
    repo.save(new Counter("plain")); repo.save(new Counter("locked"));
    try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
        for (int i = 0; i < 40; i++) {
            pool.submit(() -> tx.executeWithoutResult(s -> { Counter c = repo.findById("plain").orElseThrow(); LockSupport.parkNanos(1_000_000); c.hits++; }));
            pool.submit(() -> tx.executeWithoutResult(s -> { Counter c = repo.lockByName("locked"); LockSupport.parkNanos(1_000_000); c.hits++; }));
        }
    }
    int plain = repo.findById("plain").orElseThrow().hits, locked = repo.findById("locked").orElseThrow().hits;
    System.out.println("40 increments each → plain read-modify-write: " + plain + (plain < 40 ? " (lost updates)" : "") + ", SELECT … FOR UPDATE: " + locked);
}` }
  ];

  H.registerLesson({
    code: "S07",
    summary: "Keeping data correct with transactions: ACID and Spring's `PlatformTransactionManager`, how `@Transactional` works through proxies (and the self-invocation and private-method traps), propagation (REQUIRED, REQUIRES_NEW, NESTED and the rest) including rollback-only and `UnexpectedRollbackException`, isolation levels and read anomalies, rollback rules for checked exceptions, read-only transactions and timeouts, and optimistic (`@Version`) vs pessimistic locking.",
    slides: SLIDES,
    widget: { heading: "Interactive: which rows survive?", caption: "Pick a propagation for the inner method and a failure scenario, or one of the classic traps. Committed rows and the caller's exception were recorded from Spring Boot 3.4 on H2.", render: s07Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Money transfers", "Debit and credit in one transaction; a failed CHECK constraint rolls back the credit too."],
      ["Audit trails", "`REQUIRES_NEW` audit entries record failed attempts even when the business transaction rolls back."],
      ["Checkout flows", "An optional coupon step that throws inside a shared transaction causes `UnexpectedRollbackException` in production."],
      ["Admin edits", "Two support agents edit the same ticket; `@Version` turns a silent overwrite into a 409 and a reload."],
      ["Flash sales", "Stock decrements use `SELECT … FOR UPDATE` or atomic SQL so the last item isn't sold twice."],
      ["Read replicas", "`@Transactional(readOnly = true)` routes reporting queries to replicas."]
    ],
    pitfalls: [
      "Self-invocation (`this.method()`) skipping the transactional proxy",
      "`@Transactional` on private methods",
      "Catching exceptions from a REQUIRED inner method, then committing (UnexpectedRollbackException)",
      "Expecting checked exceptions to roll back",
      "Long transactions that call remote services while holding connections and locks",
      "REQUIRES_NEW inside loops exhausting the connection pool",
      "Assuming the database default isolation prevents lost updates",
      "Ignoring optimistic-lock exceptions instead of returning 409 or retrying",
      "Locking rows in inconsistent order (deadlocks)"
    ],
    quiz: [
      { q: "An outer @Transactional method calls `this.save()`, which is also @Transactional(REQUIRES_NEW). What happens?", options: ["A new transaction starts", "No new transaction; the proxy is bypassed and save() runs in the caller's context", "Exception at startup", "Spring creates a nested savepoint"], answer: 1, why: "Self-invocation never reaches the proxy." },
      { q: "Inner REQUIRED throws, outer catches it and returns normally. Result (widget)?", options: ["Outer row committed", "Both committed", "Nothing committed + UnexpectedRollbackException", "Only inner committed"], answer: 2, why: "The shared transaction was marked rollback-only." },
      { q: "Inner REQUIRES_NEW succeeds, then outer throws. Which rows survive?", options: ["None", "Only inner", "Only outer", "Both"], answer: 1, why: "The inner transaction committed independently." },
      { q: "Inner NESTED succeeds, then outer throws. Which rows survive?", options: ["None", "Only inner", "Only outer", "Both"], answer: 0, why: "NESTED is a savepoint inside the outer transaction." },
      { q: "A @Transactional method throws IOException. By default…", options: ["Rollback", "Commit", "Spring wraps it in RuntimeException", "Depends on the database"], answer: 1, why: "Checked exceptions commit unless rollbackFor says otherwise." },
      { q: "Which anomaly does READ COMMITTED still allow?", options: ["Dirty reads", "Non-repeatable reads", "Nothing", "Uncommitted writes"], answer: 1, why: "Re-reading a row can return a newer committed value." },
      { q: "What does @Version do on update?", options: ["Locks the row", "Adds `where version = ?` and increments it; a mismatch throws an optimistic-lock exception", "Creates a history table", "Nothing in Hibernate"], answer: 1, why: "Conflicts are detected at write time." },
      { q: "When is pessimistic locking a better fit than optimistic?", options: ["Long user think-time edits", "Short, highly contended updates where retries would be frequent", "Read-only queries", "Never"], answer: 1, why: "Waiting briefly beats repeated retries." },
      { q: "What does readOnly = true do with JPA?", options: ["Throws on any write", "Flush mode MANUAL / read-only session: no dirty checking; the connection is flagged read-only", "Nothing", "Uses SERIALIZABLE"], answer: 1, why: "The widget-style demo shows the change isn't flushed." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Code"],
        ["Declarative tx", "`@Transactional` on a public service method"],
        ["Programmatic tx", "`transactionTemplate.executeWithoutResult(s -> { … })`"],
        ["Independent tx", "`@Transactional(propagation = Propagation.REQUIRES_NEW)`"],
        ["Savepoint", "`propagation = Propagation.NESTED` (JDBC transaction manager)"],
        ["Isolation", "`@Transactional(isolation = Isolation.REPEATABLE_READ)`"],
        ["Rollback on checked", "`@Transactional(rollbackFor = Exception.class)`"],
        ["Read-only / timeout", "`@Transactional(readOnly = true, timeout = 5)`"],
        ["Optimistic lock", "`@Version Integer version;` → ObjectOptimisticLockingFailureException"],
        ["Pessimistic lock", "`@Lock(LockModeType.PESSIMISTIC_WRITE) @Query(…)` → SELECT … FOR UPDATE"]],
      cards: [
        { title: "Proxy rules", items: ["Call through another bean", "Public (or non-private) methods", "No self-invocation", "Exceptions must escape"] },
        { title: "Choosing", items: ["REQUIRED by default", "REQUIRES_NEW for audit", "NESTED for optional steps", "READ COMMITTED + locks", "@Version for user edits"] },
        { title: "Say in interviews", items: ["Proxy-based @Transactional", "UnexpectedRollbackException", "Isolation anomalies", "Checked exception commits", "Optimistic vs pessimistic"] }]
    },
    practice: [
      { level: "Easy", q: "Write a transfer service method that is atomic, and show that a failure undoes the first update.",
        a: ["Annotate the service method with @Transactional.",
          "Perform debit and credit; throw (or let the DB constraint throw) on insufficient funds.",
          "Verify balances are unchanged after the failure."],
        code: `@Service class Bank {
    final JdbcTemplate jdbc; Bank(JdbcTemplate j) { jdbc = j; }
    @Transactional public void transfer(String from, String to, int amt) {
        jdbc.update("update acct set bal = bal + ? where id = ?", amt, to);
        int left = jdbc.queryForObject("select bal from acct where id = ?", Integer.class, from) - amt;
        if (left < 0) throw new IllegalStateException("insufficient funds");
        jdbc.update("update acct set bal = ? where id = ?", left, from);
    }
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
    jdbc.execute("create table acct(id varchar(5), bal int)"); jdbc.update("insert into acct values ('A', 100), ('B', 0)");
    Bank bank = ctx.getBean(Bank.class);
    bank.transfer("A", "B", 60);
    try { bank.transfer("A", "B", 60); } catch (IllegalStateException e) { System.out.println("second transfer: " + e.getMessage()); }
    System.out.println(jdbc.queryForList("select id, bal from acct order by id"));
}` },
      { level: "Easy", q: "Why doesn't @Transactional work on a private method or via this.method()?",
        a: ["Transactions are applied by a proxy around the bean; only calls that go through the proxy are intercepted.",
          "Private methods can't be overridden or intercepted; this.method() calls the target directly.",
          "Fix: call through another bean, or use TransactionTemplate."] },
      { level: "Easy", q: "List the propagation types and one use case each.",
        a: ["REQUIRED: default for service methods.",
          "REQUIRES_NEW: audit/outbox entries that must survive rollback.",
          "NESTED: optional sub-step with savepoint.",
          "SUPPORTS: read helpers; MANDATORY: must be inside a tx; NOT_SUPPORTED: long non-DB work; NEVER: assert no tx."] },
      { level: "Medium", q: "Fix the UnexpectedRollbackException in a checkout that ignores coupon failures.",
        a: ["Option 1: make the coupon check return a result (Optional) instead of throwing.",
          "Option 2: noRollbackFor the expected exception on the coupon method.",
          "Option 3: run the coupon step with REQUIRES_NEW or NESTED.",
          "Below: option 2."],
        code: `@Service class Coupons {
    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public int discount(String code) { if (!code.equals("DIWALI10")) throw new IllegalArgumentException("unknown coupon"); return 10; }
}
@Service class Checkout {
    final Coupons coupons; Checkout(Coupons c) { coupons = c; }
    @Transactional public String pay(String code) {
        int off = 0;
        try { off = coupons.discount(code); } catch (IllegalArgumentException e) { }
        return code + " → charged with " + off + "% off";
    }
}
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    Checkout c = ctx.getBean(Checkout.class);
    System.out.println(c.pay("DIWALI10")); System.out.println(c.pay("FAKE50"));
}` },
      { level: "Medium", q: "Explain dirty reads, non-repeatable reads, phantom reads and lost updates with examples.",
        a: ["Dirty: you see a balance another transaction changed but later rolled back.",
          "Non-repeatable: you read stock 10, someone commits 9, you read again and get 9.",
          "Phantom: count(*) of today's orders changes between two queries because a new order was inserted.",
          "Lost update: two transactions read 10, both write 9; one decrement disappears. Prevent with locks, @Version or atomic SQL."] },
      { level: "Medium", q: "Implement optimistic locking with retry for a 'like' counter.",
        a: ["@Version on the entity.",
          "Catch ObjectOptimisticLockingFailureException, reload, retry a few times.",
          "For hot counters prefer atomic SQL (update … set likes = likes + 1)."],
        code: `@Entity class Post { @Id Long id; int likes; @Version Integer version; protected Post() { } Post(Long id) { this.id = id; } }
interface PostRepo extends JpaRepository<Post, Long> { }
@SpringBootApplication class App { }
try (var ctx = SpringApplication.run(App.class)) {
    PostRepo repo = ctx.getBean(PostRepo.class);
    repo.save(new Post(1L));
    AtomicInteger retries = new AtomicInteger();
    Runnable like = () -> {
        for (int attempt = 0; attempt < 1000; attempt++) {
            try { Post p = repo.findById(1L).orElseThrow(); p.likes++; repo.save(p); return; }
            catch (ObjectOptimisticLockingFailureException e) { retries.incrementAndGet(); }
        }
    };
    try (ExecutorService pool = Executors.newFixedThreadPool(4)) { for (int i = 0; i < 50; i++) pool.submit(like); }
    System.out.println("likes = " + repo.findById(1L).orElseThrow().likes + " after " + retries.get() + " optimistic-lock retries");
}` },
      { level: "Medium", q: "Should a @Transactional method call an external payment API?",
        a: ["Avoid it: the transaction holds a connection and possibly row locks for the whole HTTP call; a slow provider exhausts the pool.",
          "And if the API succeeds but the commit fails (or vice versa) you get inconsistency anyway.",
          "Instead: commit local state (e.g. PENDING), call the API outside the transaction, then update in a second short transaction; use an outbox and idempotency keys for reliability."] },
      { level: "Hard", q: "Design stock reservation for a flash sale of 1,000 units with 50,000 concurrent buyers.",
        steps: ["Atomic conditional update: `update stock set qty = qty - 1 where sku = ? and qty > 0`; check affected rows = 1. No read-modify-write.",
          "Keep the transaction tiny: reserve, write the order as PENDING, commit; payment happens afterwards with a reservation timeout.",
          "Front it with a queue or token bucket so the DB sees bounded concurrency; optionally pre-split stock into buckets or use Redis DECR with periodic reconciliation.",
          "Idempotency keys for retries; release reservations on payment failure/timeout with a scheduled job.",
          "Load-test lock contention and connection-pool sizing."] },
      { level: "Hard", q: "Two services must update their own databases consistently. Can @Transactional do it?",
        a: ["No: @Transactional covers one resource (or XA/JTA, which is rarely used in microservices due to cost and availability).",
          "Use the transactional outbox: write business data and an event row in one local transaction; a relay publishes events.",
          "Downstream services consume idempotently; failures are compensated with sagas (orchestrated or choreographed).",
          "Accept eventual consistency and design UIs/states (PENDING, CONFIRMED) for it."] },
      { level: "Hard", q: "Show that a NESTED inner failure rolls back only its own work while REQUIRES_NEW work survives an outer failure.",
        a: ["Use DataSourceTransactionManager (JDBC savepoints).",
          "Outer inserts, nested inner fails and is caught: outer row commits, inner row doesn't.",
          "REQUIRES_NEW inner succeeds then outer throws: only the inner row remains."],
        code: `@Service class Inner {
    final JdbcTemplate jdbc; Inner(JdbcTemplate j) { jdbc = j; }
    @Transactional(propagation = Propagation.NESTED) public void nestedFail() { jdbc.update("insert into t values ('nested')"); throw new IllegalStateException(); }
    @Transactional(propagation = Propagation.REQUIRES_NEW) public void newOk() { jdbc.update("insert into t values ('requires_new')"); }
}
@Service class Outer {
    final JdbcTemplate jdbc; final Inner inner; Outer(JdbcTemplate j, Inner i) { jdbc = j; inner = i; }
    @Transactional public void a() { jdbc.update("insert into t values ('outer-a')"); try { inner.nestedFail(); } catch (IllegalStateException e) { } }
    @Transactional public void b() { jdbc.update("insert into t values ('outer-b')"); inner.newOk(); throw new IllegalStateException("outer b fails"); }
}
@SpringBootApplication(exclude = { HibernateJpaAutoConfiguration.class, org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration.class })
class App { }
try (var ctx = SpringApplication.run(App.class)) {
    JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class); jdbc.execute("create table t(v varchar(20))");
    Outer o = ctx.getBean(Outer.class);
    o.a();
    try { o.b(); } catch (IllegalStateException e) { }
    System.out.println(jdbc.queryForList("select v from t", String.class));
}` }
    ],
    recap: [
      "Transactions make a business operation atomic; Spring exposes them via @Transactional and TransactionTemplate.",
      "@Transactional works through proxies: no self-invocation, no private methods, and the exception must escape.",
      "REQUIRED shares one transaction (rollback-only!), REQUIRES_NEW commits independently, NESTED uses savepoints.",
      "Isolation trades anomalies for throughput; checked exceptions commit unless rollbackFor says otherwise.",
      "Use @Version for optimistic concurrency, SELECT … FOR UPDATE or atomic SQL for hot rows, and keep transactions short."
    ]
  });
})();
