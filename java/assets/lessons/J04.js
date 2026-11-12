/* Lesson J04: equals, hashCode, compareTo & toString contracts */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // HashSet experiment: toggles for equals/hashCode overrides
  var ID1 = 0x6d06d69c, ID2 = 0x7852e922, ID3 = 0x4e25154f; // pretend identity hash codes of three objects
  function spread(h) { return (h ^ (h >>> 16)) >>> 0; }
  function hashSetWidget(el, ctx) {
    var s = ctx.state; if (s.eq === undefined) { s.eq = true; s.hc = false; s.step = 4; }
    el.innerHTML = "<div class='field'>Point overrides…</div><div class='btnrow' style='margin-top:4px'><label><input type='checkbox' data-r='eq'> equals (compares x and y)</label><label style='margin-left:16px'><input type='checkbox' data-r='hc'> hashCode (31 * x + y)</label></div>" +
      "<div class='seg' data-r='steps' style='margin-top:10px'></div>" +
      "<div class='diagram' data-r='dg'></div><div data-r='out'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    var STEPS = ["1. add(p1)", "2. add(new Point(1,2))", "3. contains(new Point(1,2))", "4. p1.x = 5; contains(p1)"];
    q("eq").checked = s.eq; q("hc").checked = s.hc;
    function draw() {
      q("steps").innerHTML = STEPS.map(function (t, i) { return "<button type='button' data-i='" + i + "' class='" + (s.step === i + 1 ? "on" : "") + "'>" + t + "</button>"; }).join("");
      function h(obj, x, y) { return s.hc ? (31 * x + y) : obj; }
      function bucket(hv) { return spread(hv) & 7; }
      var p1x = s.step >= 4 ? 5 : 1;
      var b1Stored = bucket(h(ID1, 1, 2));            // p1 was stored using its hash at insertion time (x = 1)
      var b2 = bucket(h(ID2, 1, 2)), b3 = bucket(h(ID3, 1, 2));
      var dup = s.eq && s.hc;                         // second add is detected as duplicate only if both are overridden
      var entries = [{ name: "p1 (1,2)" + (s.step >= 4 ? " → mutated to (5,2)" : ""), b: b1Stored }];
      if (s.step >= 2 && !dup) entries.push({ name: "second Point (1,2)", b: b2 });
      var res = [];
      var size = entries.length;
      if (s.step >= 2) res.push(["2. set.add(new Point(1,2))", dup ? "false: duplicate found" : "true: added again", dup ? "Same hash → same bucket → `equals` true → duplicate rejected." : !s.hc ? "Without `hashCode`, each object uses its identity hash, so the new Point most likely lands in a **different bucket** and `equals` is never even called." : "Same bucket (equal hashes) but `equals` is the identity check from `Object`, so it's treated as a different element."]);
      if (s.step >= 3) res.push(["3. set.contains(new Point(1,2))", dup ? "true" : "false", dup ? "Hash finds the bucket, `equals` matches." : "The lookup object is a third instance: " + (!s.hc ? "it hashes to its own bucket (" + b3 + ")." : "right bucket, but `Object.equals` compares identity.")]);
      if (s.step >= 4) {
        var nowB = bucket(h(ID1, 5, 2));
        res.push(["4. p1.x = 5; set.contains(p1)", s.hc && nowB !== b1Stored ? "false (!)" : "true", s.hc ? (nowB !== b1Stored ? "p1's hash changed (31·5+2 = 157), so the lookup goes to bucket " + nowB + ", but p1 is still filed under bucket " + b1Stored + ". The element is **lost** inside the set: can't be found or removed." : "The new hash happens to map to the same bucket here, but in general it won't.") : "Identity hash never changes, so p1 is found (but your `equals` no longer agrees with what's stored)."]);
      }
      res.unshift(["set.size() after step 2", String(s.step >= 2 ? size : 1), s.step >= 2 ? (dup ? "One logical point, one element." : "Two \"equal\" points stored twice: the set contract is broken.") : "One element."]);
      var L = ["flowchart LR", "  subgraph T[\"HashSet table (8 buckets)\"]", "    direction TB"];
      for (var i = 0; i < 8; i++) {
        var here = entries.filter(function (e) { return e.b === i; }).map(function (e) { return e.name; });
        L.push("    b" + i + "[\"" + i + (here.length ? ": " + here.join("<br/>") : "") + "\"]:::" + (here.length ? "s1" : "s4"));
      }
      L.push("  end", "  classDef s1 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#f5f5f5,stroke:#d4d4d4,color:#999");
      ctx.H.renderDiagram(q("dg"), L.join("\n"));
      q("out").innerHTML = "<div class='tablewrap'><table><thead><tr><th>Call</th><th>Result</th><th>Why</th></tr></thead><tbody>" + res.map(function (r) { return "<tr><td><code>" + ctx.esc(r[0]) + "</code></td><td><strong>" + ctx.esc(r[1]) + "</strong></td><td>" + ctx.md(r[2]) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
        "<div class='result " + (dup ? (s.step >= 4 ? "warn" : "ok") : "err") + "'><p>" + ctx.md(dup ? (s.step >= 4 ? "Both overridden, yet the element is lost after mutation: **keys must be immutable** (or remove, mutate, re-insert)." : "Both overridden: the set behaves. Now try step 4 to see why **keys must be immutable** (or at least their hashed fields must not change while in a set/map).") : "Rule: **override `equals` and `hashCode` together**, from the same fields. Equal objects must have equal hash codes.") + "</p></div>";
    }
    q("eq").addEventListener("change", function () { s.eq = q("eq").checked; ctx.save(); draw(); });
    q("hc").addEventListener("change", function () { s.hc = q("hc").checked; ctx.save(); draw(); });
    q("steps").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b) return; s.step = Number(b.getAttribute("data-i")) + 1; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Why four small methods matter so much",
      text: "`equals`, `hashCode`, `compareTo` and `toString` look trivial, but every collection, cache, ORM and log line depends on them behaving by contract. Get one wrong and you get duplicate rows in a `Set`, cache misses, entries you can't remove from a `HashMap`, a `TreeSet` that silently drops elements, or sort orders that throw `IllegalArgumentException: Comparison method violates its general contract!`.",
      table: [
        ["Method", "Defined in", "Default behaviour", "Used by"],
        ["`equals(Object)`", "`Object`", "Identity (`this == o`)", "`List.contains/indexOf/remove`, `HashMap`/`HashSet`, `assertEquals`, JPA"],
        ["`hashCode()`", "`Object`", "Identity-based number", "`HashMap`, `HashSet`, `ConcurrentHashMap`, caches"],
        ["`compareTo(T)`", "`Comparable<T>`", "None (you implement it)", "`Collections.sort`, `TreeMap`/`TreeSet`, `PriorityQueue`, `Arrays.sort`"],
        ["`compare(a, b)`", "`Comparator<T>`", "None", "Same, with an external ordering"],
        ["`toString()`", "`Object`", "`ClassName@hexHash`", "Logs, debuggers, string concatenation, exception messages"]],
      analogy: "Think of a library. `equals` decides whether two copies are the same book, `hashCode` decides which shelf it goes on, `compareTo` decides its position on the shelf, and `toString` is the label on the spine. If two copies of the same book are filed on different shelves, the librarian will never find the second one." },
    { title: "The equals contract and a correct implementation",
      text: "`equals` must define an **equivalence relation** over non-null references, and be stable. The five rules from the `Object` Javadoc: **reflexive** (`x.equals(x)`), **symmetric** (`x.equals(y)` ⇔ `y.equals(x)`), **transitive**, **consistent** (same answer while the objects don't change), and **`x.equals(null)` is false**. The parameter type must be `Object`; `equals(Point p)` is an overload that collections never call.",
      code: `final class Seat {
    private final int row;
    private final char letter;
    Seat(int row, char letter) { this.row = row; this.letter = letter; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;                       // fast path, reflexive
        if (!(o instanceof Seat other)) return false;     // handles null and other types
        return row == other.row && letter == other.letter;
    }
    @Override public int hashCode() { return Objects.hash(row, letter); }   // same fields as equals
    @Override public String toString() { return row + "" + letter; }
}

Seat a = new Seat(12, 'A'), b = new Seat(12, 'A');
System.out.println(a.equals(b) + " " + (a == b) + " " + a.equals(null) + " " + (a.hashCode() == b.hashCode()));
Set<Seat> booked = new HashSet<>(List.of(a));
System.out.println("12A booked? " + booked.contains(new Seat(12, 'A')) + " " + booked);`,
      points: ["Compare primitives with `==` (but `Double.compare`/`Float.compare` for floating point), objects with `Objects.equals(a, b)` (null-safe)", "Pattern-matching `instanceof` (Java 16+) makes the cast clean", "Always annotate with `@Override`: it catches the `equals(Seat)` overload mistake", "IDE/Lombok/records can generate these; you still need to know which fields belong in identity"] },
    { title: "getClass() vs instanceof: symmetry with subclasses",
      text: "When a subclass adds a field that matters for equality, `instanceof`-based equals breaks **symmetry**: a `Point` thinks it equals a `ColorPoint`, but not the other way round. There's no way to extend an instantiable class, add a value component and keep the contract (*Effective Java*, Item 10). Options: make value classes `final` (then `instanceof` is fine), use `getClass() != o.getClass()` (strict, but breaks Liskov substitution and Hibernate proxies), or prefer composition (a `ColorPoint` *has a* `Point`).",
      code: `class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) { return o instanceof Point p && p.x == x && p.y == y; }
    @Override public int hashCode() { return 31 * x + y; }
}
class ColorPoint extends Point {
    final String color;
    ColorPoint(int x, int y, String color) { super(x, y); this.color = color; }
    @Override public boolean equals(Object o) { return o instanceof ColorPoint cp && super.equals(cp) && cp.color.equals(color); }
}

Point p = new Point(1, 2);
ColorPoint cp = new ColorPoint(1, 2, "red");
System.out.println("p.equals(cp) = " + p.equals(cp) + ", cp.equals(p) = " + cp.equals(p) + "  ← symmetry broken");
List<Point> list = new ArrayList<>(List.of(cp));
System.out.println("list.contains(p) = " + list.contains(p) + " (depends on which side equals is called)");`,
      table: [
        ["Approach", "Pros", "Cons"],
        ["`final` class + `instanceof`", "Simple, correct", "No subclassing"],
        ["`getClass()` comparison", "Symmetric with subclasses", "Subclass that adds nothing is never equal to its parent; breaks with ORM proxies"],
        ["Composition", "Correct and flexible", "A bit more code (`asPoint()` view)"]] },
    { title: "The hashCode contract",
      text: "Three rules: (1) **consistent**: same value while the fields used by `equals` don't change; (2) **equal objects must have equal hash codes**; (3) unequal objects *may* collide, but fewer collisions = faster hash tables. Breaking rule 2 (overriding `equals` but not `hashCode`) is the most common bug: equal objects land in different buckets, so `HashSet` holds duplicates and `HashMap.get` returns `null` for a key that's \"there\".",
      code: `class BadKey {                                           // equals without hashCode
    final String pnr;
    BadKey(String pnr) { this.pnr = pnr; }
    @Override public boolean equals(Object o) { return o instanceof BadKey k && k.pnr.equals(pnr); }
}
record GoodKey(String pnr) {}                            // records generate both, consistently

Map<BadKey, String> bad = new HashMap<>();
bad.put(new BadKey("X7Q2"), "Deepak");
Map<GoodKey, String> good = new HashMap<>();
good.put(new GoodKey("X7Q2"), "Deepak");
System.out.println("bad.get = " + bad.get(new BadKey("X7Q2")) + ", good.get = " + good.get(new GoodKey("X7Q2")));

System.out.println("Objects.hash = " + Objects.hash(12, 'A') + ", manual = " + (31 * (31 + 12) + 'A'));
System.out.println("\\"Aa\\" and \\"BB\\" collide: " + ("Aa".hashCode() == "BB".hashCode()));`,
      points: ["Use exactly the fields compared in `equals` (a subset is legal but causes more collisions)", "`Objects.hash(...)` is convenient but allocates a varargs array; hand-write `31 * h + field` in very hot code", "Returning a constant (`return 1;`) is *legal* but turns every map into a linked list (or tree) of one bucket", "Since `String` caches its hash and is immutable, it's the ideal key"] },
    { title: "How HashMap uses hashCode and equals",
      text: "`put` and `get` both start from `hashCode()`: the map spreads the bits (`h ^ (h >>> 16)`), picks bucket `(n - 1) & hash`, then walks that bucket comparing the cached hash first and `equals` second. So `hashCode` decides **where to look**, and `equals` decides **which one it is**. Internals in depth: J08.",
      m: M(["flowchart LR",
        "  K[\"key\"]:::s0 --> HC[\"key.hashCode()\"]",
        "  HC --> SP[\"spread: h ^ (h >>> 16)\"]",
        "  SP --> IDX[\"bucket = (n - 1) & hash\"]:::s1",
        "  IDX --> B[\"bucket: node → node → …\"]:::s2",
        "  B --> CMP{\"same hash AND<br/>(same ref OR equals)?\"}",
        "  CMP -- yes --> HIT([\"found: return / replace value\"])",
        "  CMP -- no, next node --> B",
        "  CMP -- end of bucket --> MISS([\"not found: null / insert\"])"]),
      code: `record Pnr(String code) {}
Map<Pnr, String> passengers = new HashMap<>();
passengers.put(new Pnr("X7Q2"), "Deepak");
passengers.put(new Pnr("K9M1"), "Rishabh");
passengers.put(new Pnr("X7Q2"), "Deepak Kumar");          // same key: value replaced, size stays 2
System.out.println(passengers.size() + " " + passengers.get(new Pnr("X7Q2")));
int h = new Pnr("X7Q2").hashCode();
System.out.println("bucket in a 16-slot table: " + (15 & (h ^ (h >>> 16))));`,
      points: ["Two keys with the same hash but not equal → both stored in one bucket (collision)", "Equal keys must give the same hash, or the map looks in the wrong bucket and never calls `equals`"] },
    { title: "Mutable keys: the lost entry",
      text: "A hash-based collection files an element under the hash it had **when it was inserted**. If you then change a field used by `hashCode`, the element is now in the \"wrong\" bucket: `contains` and `remove` look elsewhere and fail, yet iteration still shows it. The same happens with `TreeSet`/`TreeMap` if fields used by `compareTo` change. Use immutable keys (String, records with immutable components, enums), or remove → mutate → re-insert.",
      code: `class Cart {
    final List<String> items = new ArrayList<>();
    @Override public boolean equals(Object o) { return o instanceof Cart c && c.items.equals(items); }
    @Override public int hashCode() { return items.hashCode(); }
}

Set<Cart> carts = new HashSet<>();
Cart c = new Cart();
c.items.add("DEL-BLR");
carts.add(c);
c.items.add("BLR-GOI");                                   // hash changes while inside the set
System.out.println("contains: " + carts.contains(c) + ", remove: " + carts.remove(c) + ", size: " + carts.size());
System.out.println("iteration still sees it: " + carts.iterator().next().items);`,
      points: ["Records are only as immutable as their components: `record Key(List<String> parts)` with a mutable list has the same problem; copy with `List.copyOf` in the compact constructor", "JPA entities used as `HashSet` members: an ID assigned on `persist` changes the hash (slide 12)"] },
    { title: "Comparable vs Comparator",
      text: "`Comparable<T>` gives a class its **natural ordering** via `compareTo(T other)`: negative if `this` comes first, zero if equal, positive if after. `String`, wrappers, `LocalDate`, `BigDecimal` and enums implement it. A `Comparator<T>` is an **external** ordering you pass in: sort the same objects by price today and by departure time tomorrow, without touching the class.",
      table: [
        ["", "Comparable", "Comparator"],
        ["Package / method", "`java.lang`, `compareTo(T o)`", "`java.util`, `compare(T a, T b)`"],
        ["Where", "Inside the class", "Separate object / lambda"],
        ["How many", "One natural order", "As many as you like"],
        ["Used by", "`Collections.sort(list)`, `TreeSet<>()`", "`list.sort(cmp)`, `new TreeSet<>(cmp)`, `stream.sorted(cmp)`"]],
      code: `record Flight(String code, int fare, LocalTime departs) implements Comparable<Flight> {
    @Override public int compareTo(Flight o) { return code.compareTo(o.code); }   // natural order: by code
}

List<Flight> flights = new ArrayList<>(List.of(
    new Flight("AI-505", 5200, LocalTime.of(9, 30)),
    new Flight("6E-201", 4850, LocalTime.of(6, 15)),
    new Flight("UK-811", 4850, LocalTime.of(7, 45))));
Collections.sort(flights);
System.out.println(flights.stream().map(Flight::code).toList());
flights.sort(Comparator.comparingInt(Flight::fare));
System.out.println(flights.stream().map(f -> f.code() + "@" + f.fare()).toList());
flights.sort(Comparator.comparing(Flight::departs).reversed());
System.out.println(flights.stream().map(f -> f.code() + "@" + f.departs()).toList());`,
      points: ["The `compareTo` contract mirrors `equals`: sign-symmetric (`sgn(a.compareTo(b)) == -sgn(b.compareTo(a))`), transitive, and consistent", "`TimSort` (used by `List.sort`) may throw \"Comparison method violates its general contract!\" if your comparator isn't"] },
    { title: "Building comparators: comparing, thenComparing, nulls",
      text: "Since Java 8, `Comparator` has static factories and default methods that compose cleanly. Read them like a sort spec: \"by fare, then by departure, then by code, nulls last\". Use the primitive variants (`comparingInt`, `comparingLong`, `comparingDouble`) to avoid boxing.",
      code: `record Fare(String airline, Integer price, LocalTime departs) {}
List<Fare> fares = new ArrayList<>(Arrays.asList(
    new Fare("IndiGo", 4850, LocalTime.of(9, 0)),
    new Fare("Vistara", null, LocalTime.of(7, 0)),           // price unknown
    new Fare("Air India", 4850, LocalTime.of(6, 30)),
    new Fare("Akasa", 4100, LocalTime.of(11, 0))));

Comparator<Fare> byPriceThenTime = Comparator
    .comparing(Fare::price, Comparator.nullsLast(Comparator.naturalOrder()))
    .thenComparing(Fare::departs)
    .thenComparing(Fare::airline, String.CASE_INSENSITIVE_ORDER);
fares.sort(byPriceThenTime);
fares.forEach(f -> System.out.println(f.airline() + " " + f.price() + " " + f.departs()));

System.out.println(fares.stream().max(Comparator.comparing(Fare::departs)).get().airline() + " leaves last");`,
      table: [
        ["Building block", "Meaning"],
        ["`Comparator.comparing(keyFn)`", "Order by an extracted `Comparable` key"],
        ["`comparing(keyFn, keyCmp)`", "…with a custom comparator for the key"],
        ["`.thenComparing(...)`", "Tie-breaker"],
        ["`.reversed()`", "Reverse the whole comparator so far"],
        ["`Comparator.nullsFirst/nullsLast(cmp)`", "Handle null keys explicitly"],
        ["`Comparator.naturalOrder()/reverseOrder()`", "Natural order and its reverse"],
        ["`Map.Entry.comparingByValue()`", "Sort map entries"]],
      points: ["`reversed()` applies to everything before it: `comparing(a).thenComparing(b).reversed()` reverses both keys; to reverse only `b`, use `thenComparing(b, Comparator.reverseOrder())`"] },
    { title: "Consistent with equals? TreeSet vs HashSet",
      text: "An ordering is **consistent with equals** when `compareTo == 0` exactly when `equals` is true. It's strongly recommended, not required. Sorted collections (`TreeSet`, `TreeMap`) use **only** `compareTo`/`compare` to decide duplicates, while hash collections use `equals`. When the two disagree, the same elements behave differently depending on the collection. The classic example is `BigDecimal`: `2.0` and `2.00` are `compareTo`-equal but not `equals`.",
      code: `List<BigDecimal> amounts = List.of(new BigDecimal("2.0"), new BigDecimal("2.00"));
System.out.println("HashSet size " + new HashSet<>(amounts).size() + ", TreeSet size " + new TreeSet<>(amounts).size());

record Passenger(String name, int age) {}
Set<Passenger> byAge = new TreeSet<>(Comparator.comparingInt(Passenger::age));   // NOT consistent with equals
byAge.add(new Passenger("Deepak", 30));
byAge.add(new Passenger("Rishabh", 30));                                          // "duplicate" by age → dropped!
System.out.println("TreeSet by age kept: " + byAge);
Set<Passenger> fixed = new TreeSet<>(Comparator.comparingInt(Passenger::age).thenComparing(Passenger::name));
fixed.addAll(List.of(new Passenger("Deepak", 30), new Passenger("Rishabh", 30)));
System.out.println("with tie-breaker: " + fixed.size() + " passengers");`,
      points: ["Always add tie-breakers down to a unique key when a comparator backs a `TreeSet`/`TreeMap`", "`BigDecimal` keys in a `HashMap`: normalise with `stripTrailingZeros()` or use `compareTo` semantics"] },
    { title: "compareTo bugs: subtraction overflow and broken transitivity",
      text: "A tempting shortcut is `return this.x - other.x;`. It **overflows** for large values of opposite sign and gives the wrong sign. Use `Integer.compare`, `Long.compare`, `Double.compare` (which also orders `NaN` and `-0.0` consistently), or `Comparator.comparingInt`. Comparators with inconsistent logic (random, time-dependent, mixed rules) can make `TimSort` throw.",
      code: `Comparator<Integer> subtract = (a, b) -> a - b;             // broken
Comparator<Integer> safe = Integer::compare;
int big = Integer.MAX_VALUE, small = -10;
System.out.println("subtract says MAX < -10? " + (subtract.compare(big, small) < 0));   // overflow!
System.out.println("Integer.compare says MAX > -10? " + (safe.compare(big, small) > 0));

List<Integer> values = new ArrayList<>(List.of(5, Integer.MIN_VALUE, Integer.MAX_VALUE, 0, -3));
values.sort(subtract);
System.out.println("sorted with subtraction: " + values);
values.sort(safe);
System.out.println("sorted with compare:     " + values);
System.out.println("Double.compare(0.0, -0.0) = " + Double.compare(0.0, -0.0) + ", 0.0 == -0.0 is " + (0.0 == -0.0));`,
      points: ["Interviewers love asking you to spot `a - b` in a comparator", "`Comparator.comparing(...)` chains avoid both bugs and read better"] },
    { title: "toString, records and generated code",
      text: "`toString` should return a concise, informative, **non-sensitive** description: what you'd want to see in a log line or debugger. Never include passwords, tokens or full card numbers. **Records** (Java 16) generate `equals`, `hashCode` and `toString` from their components, which removes most hand-written boilerplate for value types. Lombok's `@Value`/`@Data` and IDE generators are the pre-record alternatives.",
      code: `record Card(String holder, String number) {
    Card {                                                     // compact constructor: validate
        Objects.requireNonNull(holder);
        if (!number.matches("\\\\d{16}")) throw new IllegalArgumentException("card number must be 16 digits");
    }
    @Override public String toString() {                       // override generated toString to mask PAN
        return "Card[holder=" + holder + ", number=**** **** **** " + number.substring(12) + "]";
    }
}
record Route(String from, String to) {}

Route r1 = new Route("DEL", "BLR"), r2 = new Route("DEL", "BLR");
System.out.println(r1 + " equals: " + r1.equals(r2) + ", same hash: " + (r1.hashCode() == r2.hashCode()));
System.out.println(new Card("Deepak", "4111111111111111"));
System.out.println(new Object().toString().replaceAll("@.*", "@<hex identity hash>"));`,
      points: ["Records compare **all** components with `equals` (arrays by reference: avoid array components or override)", "For entities with identity (JPA), records are usually the wrong tool; use them for DTOs, keys, events and value objects"] },
    { title: "JPA entities: equals and hashCode done carefully",
      text: "Entities are mutable and get their database ID **after** `persist`. If `hashCode` uses the generated ID, an entity added to a `HashSet` before saving changes its hash afterwards (the lost-entry bug). If `equals` uses all fields, lazy-loaded proxies and changed fields break it. Common safe patterns: use a **natural/business key** that never changes (e.g. ISBN, PNR), or compare by ID with a **constant `hashCode`** and treat transient (null-ID) entities as equal only to themselves.",
      code: `class BookingEntity {                                       // simplified, no JPA annotations
    Long id;                                                   // assigned by the DB on persist
    final String pnr;                                          // business key, immutable
    BookingEntity(String pnr) { this.pnr = pnr; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BookingEntity other)) return false;   // instanceof, not getClass(): Hibernate proxies are subclasses
        return id != null && id.equals(other.id);                // transient entities are equal only to themselves
    }
    @Override public int hashCode() { return BookingEntity.class.hashCode(); }   // constant: stable across persist
}

BookingEntity b = new BookingEntity("X7Q2");
Set<BookingEntity> set = new HashSet<>(Set.of(b));
b.id = 101L;                                                   // "persist" assigns an ID
System.out.println("still found after persist: " + set.contains(b));`,
      points: ["A constant hash is fine for the small sets inside one entity graph; it's terrible for huge sets (all one bucket)", "Alternative: use the immutable business key (`pnr`) in both `equals` and `hashCode`", "Spring Data JPA in depth: S06"] }
  ];

  H.registerLesson({
    code: "J04",
    summary: "The object contracts every collection relies on: the five `equals` rules and a correct implementation, `getClass()` vs `instanceof` and the symmetry trap with subclasses, the `hashCode` contract and what breaks without it, how `HashMap` combines hash and equals, mutable keys that get lost, `Comparable` vs `Comparator` and the Java 8 combinators (`comparing`, `thenComparing`, `reversed`, `nullsLast`), orderings consistent with equals (`TreeSet` vs `HashSet`, `BigDecimal`), the subtraction-overflow comparator bug, `toString` hygiene with records, and safe `equals`/`hashCode` for JPA entities.",
    slides: SLIDES,
    widget: { heading: "Interactive: break (and fix) a HashSet", caption: "Toggle whether `Point` overrides `equals` and `hashCode`, then step through four operations. The diagram shows which bucket each stored object lives in; the table explains each result.", render: hashSetWidget },
    examplesHeading: "Where these contracts show up at work",
    examples: [
      ["Deduplicating events", "A `HashSet<OrderEvent>` only deduplicates if the event class (ideally a record) defines equality on the right fields, such as `eventId`."],
      ["Caching", "Caffeine/Spring Cache keys built from method arguments rely on `equals`/`hashCode`; a DTO without them means every call is a cache miss (S11)."],
      ["Tests", "`assertEquals(expected, actual)` on objects calls `equals`; without it tests compare identities and fail. AssertJ `usingRecursiveComparison()` is a workaround for classes you don't own."],
      ["Sorting reports", "`Comparator.comparing(Order::total).reversed().thenComparing(Order::createdAt)` for \"top orders\" dashboards; tie-breakers keep pagination stable."],
      ["Money", "`BigDecimal` equality (`2.0` vs `2.00`) bites in maps, sets and test assertions: use `compareTo` or normalise scale."],
      ["Logging", "A careless `toString` that dumps a whole entity graph can trigger lazy loading, huge logs or leaked personal data."]
    ],
    pitfalls: [
      "Overriding `equals` without `hashCode`",
      "Writing `equals(MyType o)` (an overload) instead of `equals(Object o)`",
      "Using mutable fields in `hashCode` for objects stored in hash collections",
      "`instanceof`-based equals in a non-final class whose subclasses add state (asymmetry)",
      "Comparator `a - b` (overflow)",
      "A `TreeSet`/`TreeMap` comparator without tie-breakers silently dropping \"duplicates\"",
      "Comparing `BigDecimal` with `equals` when you mean numeric equality",
      "Sensitive data or lazy collections in `toString`",
      "Using DB-generated IDs in `hashCode` of entities placed in sets before persisting"
    ],
    quiz: [
      { q: "If `a.equals(b)` is true, what must hold?", options: ["`a == b`", "`a.hashCode() == b.hashCode()`", "`a.compareTo(b) == 0`", "`a.toString().equals(b.toString())`"], answer: 1, why: "Equal objects must have equal hash codes; the converse isn't required." },
      { q: "A class overrides `equals` but not `hashCode`. What happens with `HashSet`?", options: ["Compile error", "Equal objects may be stored twice and `contains` may fail", "Nothing", "Runtime exception"], answer: 1, why: "Different identity hashes put equal objects in different buckets." },
      { q: "What does this print?", code: `class P { int x; P(int x) { this.x = x; }
  public boolean equals(P o) { return o.x == x; }
  public int hashCode() { return x; } }
Set<P> s = new HashSet<>();
s.add(new P(1)); s.add(new P(1));
System.out.println(s.size());`, options: ["1", "2", "Compile error", "0"], answer: 1, why: "`equals(P)` is an overload; HashSet calls `equals(Object)`, which is still identity." },
      { q: "`new TreeSet<>(List.of(new BigDecimal(\"2.0\"), new BigDecimal(\"2.00\"))).size()` is…", options: ["2", "1", "0", "Throws"], answer: 1, why: "TreeSet uses compareTo, which says they're equal; HashSet would hold 2." },
      { q: "Why is `return a.age - b.age;` risky in a comparator?", options: ["It's slow", "Integer overflow can flip the sign for extreme values", "It isn't allowed", "It boxes"], answer: 1, why: "Use Integer.compare or comparingInt." },
      { q: "What does `Comparator.comparing(Fare::price).thenComparing(Fare::time).reversed()` sort by?", options: ["Price asc, time desc", "Price desc, then time desc", "Price desc, time asc", "Time desc only"], answer: 1, why: "`reversed()` reverses the whole composed comparator." },
      { q: "Which is true of records?", options: ["They don't support equals", "They generate equals, hashCode and toString from all components", "They use identity equality", "They require Lombok"], answer: 1, why: "Component-wise; arrays inside are compared by reference." },
      { q: "You mutate a field used in `hashCode` of an object stored in a `HashSet`. Then `set.contains(obj)`…", options: ["Always true", "Usually false: it looks in the bucket for the new hash", "Throws ConcurrentModificationException", "Rehashes automatically"], answer: 1, why: "The element stays filed under its old hash." },
      { q: "Which equals implementation style works with Hibernate proxies?", options: ["`getClass() != o.getClass()`", "`o instanceof Entity`", "`==` only", "Comparing `toString()`"], answer: 1, why: "Proxies are runtime subclasses, so getClass() comparisons fail." }
    ],
    cheatsheet: {
      table: [
        ["Contract", "Rules"],
        ["equals", "Reflexive, symmetric, transitive, consistent, `x.equals(null)` false; parameter `Object`"],
        ["hashCode", "Consistent; equal objects ⇒ equal hashes; same fields as equals"],
        ["compareTo", "Sign-symmetric, transitive, consistent; ideally `== 0` ⇔ equals"],
        ["toString", "Concise, informative, no secrets, no lazy graphs"],
        ["HashMap", "hashCode picks bucket, equals picks entry"],
        ["TreeMap/TreeSet", "Only compare/compareTo; equals ignored"],
        ["Records", "All four generated (toString/equals/hashCode) from components"]],
      cards: [
        { title: "equals template", items: ["`if (this == o) return true;`", "`if (!(o instanceof T t)) return false;`", "Compare significant fields (`==`, `Double.compare`, `Objects.equals`)", "`hashCode`: `Objects.hash(same fields)`"] },
        { title: "Comparator toolkit", items: ["`comparingInt/Long/Double`", "`thenComparing`", "`reversed()`", "`nullsFirst/nullsLast`", "`Map.Entry.comparingByValue()`"] },
        { title: "Say in interviews", items: ["Equal ⇒ same hash, not vice versa", "Immutable keys", "Consistency with equals for sorted sets", "`Integer.compare`, never subtraction"] }]
    },
    practice: [
      { level: "Easy", q: "State the equals contract and the hashCode contract. Why must they be overridden together?",
        a: ["equals: reflexive, symmetric, transitive, consistent, and `x.equals(null) == false`.",
          "hashCode: consistent across calls while equality-relevant fields don't change; **equal objects must return equal hash codes**; unequal objects may collide.",
          "Hash collections find the bucket with `hashCode` **before** calling `equals`. If equal objects have different hashes, the lookup goes to a different bucket and `equals` is never asked: duplicates in sets, misses in maps.",
          "Overriding hashCode without equals is legal but pointless; the dangerous one is equals without hashCode."] },
      { level: "Easy", q: "Comparable vs Comparator: when do you use each? Sort a list of employees by department, then salary descending, then name.",
        code: `record Employee(String name, String dept, int salary) {}
List<Employee> staff = new ArrayList<>(List.of(
    new Employee("Asha", "Eng", 180), new Employee("Deepak", "Eng", 220),
    new Employee("Rishabh", "Eng", 220), new Employee("Meera", "Ops", 150)));

staff.sort(Comparator.comparing(Employee::dept)
    .thenComparing(Employee::salary, Comparator.reverseOrder())
    .thenComparing(Employee::name));
staff.forEach(e -> System.out.println(e.dept() + " " + e.salary() + " " + e.name()));`,
        a: ["`Comparable`: one natural order built into the class (`String`, `LocalDate`, money types).",
          "`Comparator`: external orderings, chosen per use case, for classes you don't own or that have several sensible orders.",
          "Note `thenComparing(Employee::salary, Comparator.reverseOrder())` reverses only the salary key; `.reversed()` at the end would reverse everything."] },
      { level: "Easy", q: "Spot the bug and fix it.",
        qcode: `class Sku {
    final String code;
    Sku(String code) { this.code = code; }
    public boolean equals(Sku other) { return code.equals(other.code); }
    public int hashCode() { return code.hashCode(); }
}
Set<Sku> skus = new HashSet<>();
skus.add(new Sku("TSHIRT-M"));
System.out.println(skus.contains(new Sku("TSHIRT-M")));   // false!`,
        a: ["`equals(Sku)` **overloads** `Object.equals(Object)` instead of overriding it. `HashSet` calls `equals(Object)`, which still compares identities.",
          "Fix: `@Override public boolean equals(Object o) { return o instanceof Sku s && code.equals(s.code); }`. With `@Override` the original would not have compiled, which is why you always add it.",
          "Even simpler: `record Sku(String code) {}`."] },
      { level: "Medium", q: "Why can `TreeSet` lose elements that a `HashSet` keeps? Show and fix.",
        code: `record Order(String id, int amount) {}
List<Order> orders = List.of(new Order("A1", 500), new Order("B2", 500), new Order("C3", 300));

Set<Order> byAmount = new TreeSet<>(Comparator.comparingInt(Order::amount));
byAmount.addAll(orders);
System.out.println("TreeSet by amount: " + byAmount.size() + " " + byAmount);

Set<Order> fixed = new TreeSet<>(Comparator.comparingInt(Order::amount).thenComparing(Order::id));
fixed.addAll(orders);
System.out.println("with tie-breaker: " + fixed.size());
System.out.println("HashSet: " + new HashSet<>(orders).size());`,
        a: ["`TreeSet` decides duplicates purely by the comparator: `compare(a, b) == 0` means \"same element\", so `B2` (same amount as `A1`) is silently not added.",
          "`HashSet` uses `equals`/`hashCode` (record: all components), so it keeps all three.",
          "Fix: make the comparator consistent with equals by adding tie-breakers down to a unique key (`thenComparing(Order::id)`).",
          "Same applies to `TreeMap` keys and to `ConcurrentSkipListSet`."] },
      { level: "Medium", q: "Implement `equals`, `hashCode` and `compareTo` for a `Version` class (`major.minor.patch`), ordering 1.10.0 after 1.9.3.",
        code: `final class Version implements Comparable<Version> {
    private final int major, minor, patch;
    Version(int major, int minor, int patch) { this.major = major; this.minor = minor; this.patch = patch; }
    static Version parse(String s) {
        String[] p = s.split("\\\\.");
        return new Version(Integer.parseInt(p[0]), Integer.parseInt(p[1]), Integer.parseInt(p[2]));
    }
    @Override public int compareTo(Version o) {
        int c = Integer.compare(major, o.major);
        if (c != 0) return c;
        c = Integer.compare(minor, o.minor);
        return c != 0 ? c : Integer.compare(patch, o.patch);
    }
    @Override public boolean equals(Object o) { return o instanceof Version v && compareTo(v) == 0; }
    @Override public int hashCode() { return Objects.hash(major, minor, patch); }
    @Override public String toString() { return major + "." + minor + "." + patch; }
}

List<Version> vs = new ArrayList<>(Stream.of("1.10.0", "1.9.3", "2.0.0", "1.9.12").map(Version::parse).toList());
Collections.sort(vs);
System.out.println(vs + " max=" + Collections.max(vs));
System.out.println("string sort would give: " + Stream.of("1.10.0", "1.9.3", "2.0.0", "1.9.12").sorted().toList());`,
        a: ["Compare numerically field by field with `Integer.compare` (no subtraction).",
          "`equals` is consistent with `compareTo`, and `hashCode` uses the same three fields.",
          "The class is final and immutable, so instances are safe as map keys and in sorted sets.",
          "Equivalent comparator: `Comparator.comparingInt(Version::major).thenComparingInt(...)` if you expose accessors."] },
      { level: "Medium", q: "A `HashMap<Cart, Price>` returns `null` for a cart you just put in, but iterating the map shows it. What happened?",
        a: ["The key was **mutated** after insertion and its `hashCode` depends on the mutated field(s): the entry sits in the bucket for the old hash; `get` computes the new hash and looks elsewhere.",
          "Iteration walks all buckets, so you still see it; `get`, `containsKey` and `remove` fail.",
          "Fixes: use immutable keys (IDs, records with immutable components); if you must change a key, remove it, change it, then re-insert; or key by a stable identifier (`cartId`).",
          "Same family of bug: `compareTo` fields mutated in a `TreeMap` key, or `PriorityQueue` elements whose priority changes while inside (remove + re-add)."] },
      { level: "Medium", q: "When would you use `getClass()` in `equals` instead of `instanceof`?",
        a: ["`instanceof` allows subclass instances to be equal to parent instances. That's right when subclasses don't change equality (or the class is final).",
          "`getClass()` makes only exact-same-class objects equal, which keeps symmetry when subclasses add state, but violates Liskov: a trivial subclass (e.g. one adding logging) is never equal to its parent.",
          "It also breaks with **runtime proxies** (Hibernate, Mockito spies, CGLIB) whose class is a generated subclass.",
          "Usual recommendation: make value classes final and use `instanceof`; use composition rather than subclassing value types."] },
      { level: "Hard", q: "A sort crashes in production with `IllegalArgumentException: Comparison method violates its general contract!`. What causes it and how do you find it?",
        a: ["`List.sort`/`Arrays.sort` on objects uses **TimSort**, which detects some inconsistencies (e.g. `a < b`, `b < c` but `c < a`) and throws rather than returning garbage.",
          "Common causes: subtraction overflow (`a - b`); comparing `double`s with `<`/`>` when `NaN` is present; comparators that read **mutable or time-dependent** state (e.g. \"minutes until departure\" computed with `now()` during the sort); mixed rules that aren't transitive (\"nulls first unless…\"); random tie-breaks.",
          "Find it: log the input that failed; write a property test that checks `sgn(c(a,b)) == -sgn(c(b,a))` and transitivity on random triples.",
          "Fix: build comparators from `Comparator.comparing...` with `Integer/Double.compare`, explicit `nullsFirst/nullsLast`, and snapshot volatile values (compute sort keys once, then sort)."] },
      { level: "Hard", q: "Design equals/hashCode for a JPA `Booking` entity that's put into a `Set` before and after `persist`, and loaded through Hibernate proxies.",
        a: ["Requirements: stable hash across persist (ID changes from null to 101); proxies (subclasses) equal to real objects; transient instances not all equal to each other.",
          "Option A, business key: if a natural immutable key exists (PNR, ISBN, email), use it in both methods with `instanceof`. Simple and fast.",
          "Option B, ID-based: `equals` returns true when `id != null && id.equals(other.getId())` (call the getter, so proxies initialise), `instanceof` check; `hashCode` returns a constant (e.g. `getClass().hashCode()` of the entity class, not the proxy class).",
          "Avoid: Lombok `@Data`/`@EqualsAndHashCode` on entities (uses all fields, including lazy collections → N+1 or `LazyInitializationException`), and `getClass()` comparisons.",
          "Same considerations for `toString`: exclude lazy associations."] },
      { level: "Hard", q: "Why do records with array components surprise people, and how do you fix it?",
        code: `record Seats(String flight, char[] letters) {}
record Seats2(String flight, char[] letters) {
    @Override public boolean equals(Object o) { return o instanceof Seats2 s && flight.equals(s.flight) && Arrays.equals(letters, s.letters); }
    @Override public int hashCode() { return 31 * flight.hashCode() + Arrays.hashCode(letters); }
    @Override public String toString() { return "Seats2[" + flight + ", " + Arrays.toString(letters) + "]"; }
}
record Seats3(String flight, List<Character> letters) {
    Seats3 { letters = List.copyOf(letters); }   // immutable + value-based equals
}

System.out.println(new Seats("AI1", new char[]{'A', 'B'}).equals(new Seats("AI1", new char[]{'A', 'B'})));
System.out.println(new Seats2("AI1", new char[]{'A', 'B'}).equals(new Seats2("AI1", new char[]{'A', 'B'})));
System.out.println(new Seats3("AI1", List.of('A', 'B')).equals(new Seats3("AI1", new ArrayList<>(List.of('A', 'B')))));`,
        a: ["Record `equals` compares components with `Objects.equals`; for arrays that's **reference** equality, so equal contents aren't equal records. `toString` also prints `[C@1b6d...`.",
          "Fix 1: override `equals`/`hashCode`/`toString` using `Arrays.equals`/`hashCode`/`toString`.",
          "Fix 2 (better): use an immutable `List` component and copy it in the compact constructor; you get value semantics and immutability.",
          "The array is still mutable through the accessor in fix 1; clone it in the constructor and accessor if immutability matters."] }
    ],
    recap: [
      "equals: reflexive, symmetric, transitive, consistent, null → false; parameter `Object`; `@Override` always.",
      "hashCode: same fields as equals; equal ⇒ equal hash. Hash collections use hash to find the bucket and equals to find the entry.",
      "Keep keys immutable; mutating hashed or compared fields loses entries.",
      "Comparable = natural order; Comparator = external, composable (`comparing`, `thenComparing`, `reversed`, `nullsLast`); use `Integer.compare`, never subtraction.",
      "Sorted collections use only compare; make it consistent with equals (tie-breakers). Records generate the boilerplate; entities need special care."
    ]
  });
})();
