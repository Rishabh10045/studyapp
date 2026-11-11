/* Lesson F03: UML class diagrams & relationships */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var SLIDES = [
    { title: "Why class diagrams, and the anatomy of a class box",
      text: "In an LLD round the class diagram is your **contract with the interviewer**: before writing code you agree on the classes, what each one knows (attributes), what it does (operations) and how they relate. A UML class box has three compartments: **name**, **attributes**, **operations**. Prefixes give visibility; stereotypes like `<<interface>>` mark the kind of type.",
      points: [
        "Visibility: `+` public, `-` private, `#` protected, `~` package-private",
        "Attribute: `-balance: long` (UML) or `-long balance` (the Mermaid/Java-style order also used in this course)",
        "Operation: `+withdraw(amount: long): void`; abstract operations are *italic* (Mermaid: a trailing `*`), static ones are underlined (Mermaid: a trailing `$`)",
        "Stereotypes: `<<interface>>`, `<<abstract>>`, `<<enumeration>>`, `<<record>>`, `<<service>>`",
        "Draw only what helps the discussion: key fields and the 2–4 behaviours that matter, not every getter"],
      analogy: "An architect's floor plan. It doesn't show every nail, but it shows every room, which doors connect them, and which walls are load-bearing. That is enough for everyone to agree before construction starts.",
      m: M(["classDiagram",
        "  class Account {",
        "    <<abstract>>",
        "    -String id",
        "    #long balance",
        "    ~AuditLog log",
        "    +int MAX_DAILY_TXNS$",
        "    +deposit(long amount) void",
        "    +withdraw(long amount) void",
        "    +interestRate()* double",
        "  }",
        "  class AccountType {",
        "    <<enumeration>>",
        "    SAVINGS",
        "    CURRENT",
        "  }",
        "  class Statement {",
        "    <<interface>>",
        "    +lines() List~String~",
        "  }"]),
      table: [
        ["Symbol", "Meaning", "Java"],
        ["`+`", "public", "`public`"],
        ["`-`", "private", "`private`"],
        ["`#`", "protected", "`protected`"],
        ["`~`", "package-private", "(no modifier)"],
        ["*italic* / `*`", "abstract", "`abstract` method"],
        ["underline / `$`", "static", "`static`"]] },

    { title: "Association: one class knows another",
      text: "An **association** is a structural, long-lived link: an object of one class holds a reference to an object of another, and uses it over time. Draw a plain line (with an arrow if navigation is one-way) and label the ends with **multiplicity** and optional role names.",
      points: [
        "One-way `Driver --> Car`: the driver knows its car; the car doesn't know its driver",
        "Bidirectional `Student -- Course`: both sides hold references. Avoid it unless both directions are really needed, since you must keep both sides in sync",
        "In Java an association is a **field** (single reference, or a collection for `*`)",
        "Name the association when it isn't obvious: `Customer \"1\" --> \"*\" Order : places`"],
      m: M(["classDiagram",
        "  direction LR",
        "  class Driver {",
        "    -String name",
        "    -Car car",
        "  }",
        "  class Car {",
        "    -String plate",
        "  }",
        "  class Customer {",
        "    -List~Order~ orders",
        "  }",
        "  class Order {",
        "    -String id",
        "  }",
        "  Driver \"1\" --> \"0..1\" Car : drives",
        "  Customer \"1\" --> \"*\" Order : places"]),
      code: `class Car {
    private final String plate;
    Car(String plate) { this.plate = plate; }
}

class Driver {
    private final String name;
    private Car car;                            // association: 0..1 Car, one-way
    Driver(String name) { this.name = name; }
    void assign(Car c) { this.car = c; }
    Optional<Car> car() { return Optional.ofNullable(car); }
}

record Order(String id) {}

class Customer {
    private final List<Order> orders = new ArrayList<>();   // association: 1 -> *
    void place(Order o) { orders.add(o); }
    List<Order> orders() { return List.copyOf(orders); }
}` },

    { title: "Multiplicity: how many on each end",
      text: "Multiplicity is written at the far end of a relationship and answers \"for one of me, how many of those?\". It's also the most common source of bugs found at diagram time: \"Can a ticket exist without a spot?\" or \"Can a seat be in two bookings?\" are questions to ask out loud.",
      points: [
        "Read `Customer \"1\" --> \"*\" Order` as: one customer has zero or more orders; each order belongs to exactly one customer",
        "`0..1` maps to a nullable field or `Optional<T>` getter; `1` maps to a required constructor argument (non-null)",
        "`*` or `0..*` maps to a collection; `1..*` means validate non-empty in the constructor",
        "Many-to-many (`*` on both ends) often hides an **association class** with its own data (Enrollment, Booking): see slide 9"],
      table: [
        ["Multiplicity", "Meaning", "Java mapping", "Example"],
        ["`1`", "exactly one", "required, non-null field set in the constructor", "Order → Customer"],
        ["`0..1`", "zero or one", "nullable field / `Optional<T>` accessor", "ParkingSpot → current Vehicle"],
        ["`*` (`0..*`)", "zero or more", "`List`, `Set` or `Map` field", "Customer → Orders"],
        ["`1..*`", "at least one", "collection validated non-empty", "Order → OrderLines"],
        ["`2..4`", "a range", "validated collection size", "Game → Players (Ludo)"]],
      m: M(["classDiagram",
        "  direction LR",
        "  ParkingLot \"1\" *-- \"1..*\" Floor",
        "  Floor \"1\" *-- \"1..*\" ParkingSpot",
        "  ParkingSpot \"1\" --> \"0..1\" Vehicle : parked",
        "  Ticket \"*\" --> \"1\" ParkingSpot",
        "  Ticket \"*\" --> \"1\" Vehicle"]) },
    { title: "Aggregation: a whole that borrows its parts",
      text: "**Aggregation** (hollow diamond on the *whole's* side) is an association with \"has-a / part-of\" meaning where the parts have an **independent lifecycle**: they're created elsewhere, can outlive the whole, and may be shared. A `Team` aggregates `Player`s; disband the team and the players still exist.",
      points: [
        "Mermaid: `Team o-- Player` (the `o` sits next to the whole)",
        "Java tell: the part is **passed in** (constructor or `add()`), not created by the whole",
        "Deleting the whole must not delete the parts; a part may belong to several wholes (a player in a club team and a national team)",
        "UML 2 itself says aggregation semantics are loose. Many interviewers accept a plain association; use the diamond only when you want to stress \"part-of, but independent\""],
      analogy: "A playlist and its songs. Delete the playlist and the songs are still in your library, and the same song can sit in ten playlists.",
      m: M(["classDiagram",
        "  direction LR",
        "  class Team {",
        "    -String name",
        "    -List~Player~ players",
        "    +add(Player p) void",
        "  }",
        "  class Player {",
        "    -String name",
        "  }",
        "  class Playlist {",
        "    -List~Song~ songs",
        "  }",
        "  class Song",
        "  Team \"*\" o-- \"*\" Player",
        "  Playlist \"*\" o-- \"*\" Song"]),
      code: `record Player(String name) {}

class Team {
    private final String name;
    private final List<Player> players = new ArrayList<>();
    Team(String name) { this.name = name; }
    void add(Player p) { players.add(p); }        // part is created elsewhere and passed in
    List<Player> players() { return List.copyOf(players); }
}

Player kohli = new Player("Kohli");
Team rcb = new Team("RCB"), india = new Team("India");
rcb.add(kohli);
india.add(kohli);                                  // shared by two wholes: aggregation
rcb = null;                                        // the team goes away; kohli lives on
System.out.println(india.players());` },

    { title: "Composition: the whole owns its parts",
      text: "**Composition** (filled diamond) is the strongest \"part-of\": the whole **creates and owns** its parts, a part belongs to exactly **one** whole at a time, and the part's lifetime ends with the whole. An `Order` composes its `OrderLine`s; a `House` composes its `Room`s.",
      points: [
        "Mermaid: `Order *-- OrderLine`; the multiplicity on the whole's side is always `1` (or `0..1`)",
        "Java tell: the whole calls `new Part(...)` itself, and never hands out the mutable part (return copies or read-only views)",
        "Cascade: deleting or saving the whole deletes or saves its parts (JPA `cascade = ALL, orphanRemoval = true` is composition)",
        "Lifecycle and exclusivity, not \"importance\", decide composition vs aggregation"],
      analogy: "A human body and its heart. The heart isn't shared with anyone, and it doesn't carry on independently after the body is gone (transplants are the exception that proves the interview point: the model depends on your domain).",
      m: M(["classDiagram",
        "  direction LR",
        "  class Order {",
        "    -String id",
        "    -List~OrderLine~ lines",
        "    +addItem(String sku, int qty, long price) void",
        "    +total() long",
        "  }",
        "  class OrderLine {",
        "    -String sku",
        "    -int qty",
        "    -long unitPrice",
        "    +subtotal() long",
        "  }",
        "  Order \"1\" *-- \"1..*\" OrderLine : owns"]),
      code: `class Order {
    private final String id;
    private final List<OrderLine> lines = new ArrayList<>();

    Order(String id) { this.id = id; }

    // The whole creates its parts; callers never construct an OrderLine.
    void addItem(String sku, int qty, long unitPrice) {
        lines.add(new OrderLine(sku, qty, unitPrice));
    }
    long total() { return lines.stream().mapToLong(OrderLine::subtotal).sum(); }
    List<OrderLine> lines() { return Collections.unmodifiableList(lines); }

    // Nested + private constructor makes the ownership explicit.
    static final class OrderLine {
        private final String sku; private final int qty; private final long unitPrice;
        private OrderLine(String sku, int qty, long unitPrice) { this.sku = sku; this.qty = qty; this.unitPrice = unitPrice; }
        long subtotal() { return qty * unitPrice; }
    }
}

Order o = new Order("ORD-1");
o.addItem("PEN", 3, 20);
o.addItem("BOOK", 1, 450);
System.out.println(o.total());   // 510` },

    { title: "Dependency: \"uses for a moment\"",
      text: "A **dependency** (dashed arrow) is the weakest relationship: one class **uses** another temporarily, as a method parameter, a local variable, a return type or a static call, but doesn't keep a reference. If the target's interface changes, the dependent may have to change, so the arrow still matters.",
      points: [
        "Mermaid: `OrderService ..> Invoice : creates` or `..> PaymentRequest : uses`",
        "Java tell: the type appears only in method signatures or bodies, **not** as a field",
        "If it's stored in a field (even an injected interface), it's an association; draw `-->`",
        "Show dependencies selectively: on DTOs, factories and exceptions they add noise; on infrastructure (`Clock`, `HttpClient`) they show coupling worth discussing"],
      m: M(["classDiagram",
        "  direction LR",
        "  class CheckoutService {",
        "    -PaymentGateway gateway",
        "    +checkout(Cart cart) Receipt",
        "  }",
        "  class PaymentGateway {",
        "    <<interface>>",
        "    +charge(long amount) boolean",
        "  }",
        "  class Cart",
        "  class Receipt",
        "  CheckoutService --> PaymentGateway : field (association)",
        "  CheckoutService ..> Cart : parameter",
        "  CheckoutService ..> Receipt : creates"]),
      code: `interface PaymentGateway { boolean charge(long amount); }
record Cart(long total) {}
record Receipt(long amount, boolean paid) {}

class CheckoutService {
    private final PaymentGateway gateway;              // stored: association
    CheckoutService(PaymentGateway gateway) { this.gateway = gateway; }

    Receipt checkout(Cart cart) {                      // Cart: dependency (parameter)
        boolean ok = gateway.charge(cart.total());
        return new Receipt(cart.total(), ok);          // Receipt: dependency (creates/returns)
    }
}

System.out.println(new CheckoutService(amt -> amt < 10_000).checkout(new Cart(499)));` },

    { title: "Generalization and realization",
      text: "**Generalization** (solid line, hollow triangle) is `extends`: an is-a relationship with inherited state and behaviour. **Realization** (dashed line, hollow triangle) is `implements`: a class promises to fulfil an interface's contract. The triangle always points at the **more general** type.",
      points: [
        "Mermaid: `Vehicle <|-- Car` (generalization) and `PaymentMethod <|.. UpiPayment` (realization)",
        "Abstract classes: mark with `<<abstract>>` and abstract methods with `*`",
        "Prefer realization over generalization in LLD (see Lesson 1: composition over inheritance); keep hierarchies shallow, at most 2 levels",
        "Sealed hierarchies (Java 17) make the closed set explicit: `sealed interface Shape permits Circle, Square`"],
      m: M(["classDiagram",
        "  class Vehicle {",
        "    <<abstract>>",
        "    #String plate",
        "    +size()* SpotSize",
        "  }",
        "  class Car {",
        "    +size() SpotSize",
        "  }",
        "  class Bike {",
        "    +size() SpotSize",
        "  }",
        "  class PaymentMethod {",
        "    <<interface>>",
        "    +pay(long amount) boolean",
        "  }",
        "  class UpiPayment {",
        "    +pay(long amount) boolean",
        "  }",
        "  class CardPayment {",
        "    +pay(long amount) boolean",
        "  }",
        "  Vehicle <|-- Car",
        "  Vehicle <|-- Bike",
        "  PaymentMethod <|.. UpiPayment",
        "  PaymentMethod <|.. CardPayment"]),
      code: `enum SpotSize { SMALL, MEDIUM, LARGE }

abstract class Vehicle {                        // generalization target
    protected final String plate;
    Vehicle(String plate) { this.plate = plate; }
    abstract SpotSize size();
}
class Car extends Vehicle { Car(String p) { super(p); } SpotSize size() { return SpotSize.MEDIUM; } }
class Bike extends Vehicle { Bike(String p) { super(p); } SpotSize size() { return SpotSize.SMALL; } }

interface PaymentMethod { boolean pay(long amount); }   // realization target
class UpiPayment implements PaymentMethod { public boolean pay(long a) { return a <= 100_000; } }
class CardPayment implements PaymentMethod { public boolean pay(long a) { return true; } }

for (Vehicle v : List.of(new Car("KA01"), new Bike("KA02"))) System.out.println(v.plate + " -> " + v.size());` },
    { title: "Choosing the right relationship",
      text: "In an interview you'll be asked \"why a filled diamond here?\" Have a deterministic way to decide. Walk the questions from strongest to weakest relationship and stop at the first \"yes\".",
      points: [
        "**Is it a kind of?** `extends` (generalization) or `implements` (realization)",
        "**Does the whole create the part, own it exclusively, and does the part die with it?** Composition",
        "**Is it part-of, but the part lives independently or is shared?** Aggregation (or just association)",
        "**Is a reference kept in a field?** Association",
        "**Only used inside a method?** Dependency",
        "When unsure between aggregation and association, draw association and say why: it's the honest default"],
      m: M(["flowchart LR",
        "  A{\"is-a?\"} -->|yes| G[\"<b>Generalization / Realization</b><br/><span class='d'>extends / implements</span>\"]:::s2",
        "  A -->|no| B{\"kept in a field?\"}",
        "  B -->|no| D[\"<b>Dependency</b><br/><span class='d'>param, local, return</span>\"]",
        "  B -->|yes| C{\"part-of the whole?\"}",
        "  C -->|no| AS[\"<b>Association</b><br/><span class='d'>knows / uses over time</span>\"]:::s0",
        "  C -->|yes| E{\"created + owned exclusively,<br/>dies with whole?\"}",
        "  E -->|yes| CO[\"<b>Composition</b><br/><span class='d'>filled diamond</span>\"]:::s1",
        "  E -->|no| AG[\"<b>Aggregation</b><br/><span class='d'>hollow diamond</span>\"]:::s0"]),
      table: [
        ["Relationship", "Mermaid", "Strength", "Lifecycle", "Java tell"],
        ["Dependency", "`A ..> B`", "weakest", "unrelated", "B only in method params/locals/returns"],
        ["Association", "`A --> B`", "weak", "independent", "field of type B"],
        ["Aggregation", "`A o-- B`", "medium", "independent, shareable", "B passed in, stored in a collection"],
        ["Composition", "`A *-- B`", "strong", "B dies with A, never shared", "A does `new B()`, hides B"],
        ["Realization", "`I <|.. A`", "contract", "n/a", "`implements`"],
        ["Generalization", "`P <|-- A`", "strongest coupling", "n/a", "`extends`"]] },

    { title: "Association classes: when the link has data",
      text: "A many-to-many relationship usually carries information that belongs to **neither** end. A student's grade belongs to the pair (student, course), not to either one. Promote the link into its own class, an **association class**, which in Java is just a class holding both references plus the extra data. Almost every booking system is built on this.",
      points: [
        "`Student * -- * Course` becomes `Student 1 -- * Enrollment * -- 1 Course`, with `grade` and `enrolledOn` on `Enrollment`",
        "Booking systems: `Show` × `Seat` → `ShowSeat` (status, price, lock expiry); `Room` × `Date` → `Booking`",
        "Splitwise: `Expense` × `User` → `Split` (amount owed)",
        "A **qualified association** like `Library [isbn] --> Book` maps to a `Map<String, Book>` in Java"],
      m: M(["classDiagram",
        "  direction LR",
        "  class Student {",
        "    -String id",
        "  }",
        "  class Course {",
        "    -String code",
        "  }",
        "  class Enrollment {",
        "    -LocalDate enrolledOn",
        "    -String grade",
        "    +assignGrade(String g) void",
        "  }",
        "  Student \"1\" --> \"*\" Enrollment",
        "  Enrollment \"*\" --> \"1\" Course"]),
      code: `record Student(String id) {}
record Course(String code) {}

class Enrollment {                         // association class
    private final Student student;
    private final Course course;
    private final LocalDate enrolledOn;
    private String grade;                  // belongs to the pair, not to either end
    Enrollment(Student s, Course c, LocalDate on) { student = s; course = c; enrolledOn = on; }
    void assignGrade(String g) { grade = g; }
    String describe() { return student.id() + " in " + course.code() + ": " + grade; }
}

class Registrar {
    private final Map<String, List<Enrollment>> byStudent = new HashMap<>();   // qualified lookup
    Enrollment enroll(Student s, Course c) {
        Enrollment e = new Enrollment(s, c, LocalDate.of(2026, 7, 1));
        byStudent.computeIfAbsent(s.id(), k -> new ArrayList<>()).add(e);
        return e;
    }
}

Enrollment e = new Registrar().enroll(new Student("S1"), new Course("CS101"));
e.assignGrade("A");
System.out.println(e.describe());` },

    { title: "From requirements to a class diagram (worked example: library)",
      text: "The interview workflow: **(1)** underline nouns in the requirements, which become candidate classes or attributes; **(2)** verbs become methods on the class that owns the data; **(3)** decide relationships and multiplicities; **(4)** spot what varies (the fine policy) and put an interface there; **(5)** drop nouns that are just attributes (title, due date).",
      points: [
        "Requirements: *members borrow book copies; a book can have many copies; a member may hold up to 5 loans; late returns incur a fine that depends on membership type*",
        "Nouns: member, book, copy, loan, fine, membership type. **Book vs BookCopy** is the classic catch: the catalogue entry vs the physical item",
        "Verbs: borrow, return, calculateFine. `borrow` lives on a service (`LibraryService`) because it touches member, copy and loan",
        "`Loan` is an association class between `Member` and `BookCopy` (it has dates)",
        "`FinePolicy` is an interface: the fine rule is what varies"],
      m: M(["classDiagram",
        "  class Book {",
        "    -String isbn",
        "    -String title",
        "  }",
        "  class BookCopy {",
        "    -String barcode",
        "    -CopyStatus status",
        "  }",
        "  class Member {",
        "    -String id",
        "    -MembershipType type",
        "    +canBorrow() boolean",
        "  }",
        "  class Loan {",
        "    -LocalDate borrowedOn",
        "    -LocalDate dueOn",
        "    -LocalDate returnedOn",
        "  }",
        "  class FinePolicy {",
        "    <<interface>>",
        "    +fine(Loan loan) long",
        "  }",
        "  class LibraryService {",
        "    +borrow(String memberId, String barcode) Loan",
        "    +giveBack(String barcode) long",
        "  }",
        "  Book \"1\" *-- \"1..*\" BookCopy",
        "  Member \"1\" --> \"0..5\" Loan",
        "  Loan \"*\" --> \"1\" BookCopy",
        "  LibraryService --> FinePolicy",
        "  LibraryService ..> Loan : creates",
        "  FinePolicy <|.. PerDayFine"]),
      code: `enum CopyStatus { AVAILABLE, LOANED }
record Book(String isbn, String title) {}
class BookCopy { final String barcode; final Book book; CopyStatus status = CopyStatus.AVAILABLE;
    BookCopy(String barcode, Book book) { this.barcode = barcode; this.book = book; } }
class Member { final String id; final List<Loan> loans = new ArrayList<>();
    Member(String id) { this.id = id; }
    boolean canBorrow() { return loans.stream().filter(l -> l.returnedOn == null).count() < 5; } }
class Loan { final Member member; final BookCopy copy; final LocalDate dueOn; LocalDate returnedOn;
    Loan(Member m, BookCopy c, LocalDate due) { member = m; copy = c; dueOn = due; } }
interface FinePolicy { long fine(Loan loan); }
class PerDayFine implements FinePolicy {
    public long fine(Loan l) { return Math.max(0, ChronoUnit.DAYS.between(l.dueOn, l.returnedOn)) * 10; } }

class LibraryService {
    private final Map<String, Member> members = new HashMap<>();
    private final Map<String, BookCopy> copies = new HashMap<>();
    private final Map<String, Loan> active = new HashMap<>();
    private final FinePolicy finePolicy;
    LibraryService(FinePolicy p) { finePolicy = p; }
    void addMember(Member m) { members.put(m.id, m); }
    void addCopy(BookCopy c) { copies.put(c.barcode, c); }

    Loan borrow(String memberId, String barcode, LocalDate today) {
        Member m = members.get(memberId); BookCopy c = copies.get(barcode);
        if (!m.canBorrow() || c.status != CopyStatus.AVAILABLE) throw new IllegalStateException("cannot borrow");
        Loan loan = new Loan(m, c, today.plusDays(14));
        c.status = CopyStatus.LOANED; m.loans.add(loan); active.put(barcode, loan);
        return loan;
    }
    long giveBack(String barcode, LocalDate today) {
        Loan loan = active.remove(barcode);
        loan.returnedOn = today; loan.copy.status = CopyStatus.AVAILABLE;
        return finePolicy.fine(loan);
    }
}

LibraryService lib = new LibraryService(new PerDayFine());
lib.addMember(new Member("M1"));
lib.addCopy(new BookCopy("C1", new Book("978-0134685991", "Effective Java")));
lib.borrow("M1", "C1", LocalDate.of(2026, 1, 1));
System.out.println("fine = " + lib.giveBack("C1", LocalDate.of(2026, 1, 20)));   // 5 days late -> 50` },

    { title: "Drawing class diagrams in an interview (and in Mermaid)",
      text: "You have five to ten minutes for the diagram. Aim for something the interviewer can challenge, not a poster. Draw **core entities first**, then services, then the interfaces at the extension points, then the relationships. Keep it consistent with the code you'll write, since interviewers check that.",
      points: [
        "Start with 5–8 classes; add enums for statuses and types (`SpotType`, `BookingStatus`)",
        "Show the **interfaces where requirements will change** (pricing, payment, notification, strategy for picking a spot)",
        "Put multiplicities on every association; they force the right questions",
        "Don't model the database: no `user_id` foreign-key fields; hold object references or IDs deliberately",
        "Don't draw getters, setters or constructors unless they're interesting",
        "Narrate: \"Order composes OrderLines because lines can't exist without the order\""],
      table: [
        ["You want", "Mermaid classDiagram syntax"],
        ["Class with members", "`class Spot {` / `-String id` / `+isFree() boolean` / `}`"],
        ["Interface / abstract / enum", "a `<<interface>>` line inside the class body"],
        ["Generic type", "`List~Ticket~` (tildes instead of `<>`)"],
        ["Static / abstract member", "`+of(String s)$ Money` / `+area()* double`"],
        ["Multiplicity + label", "`Lot \"1\" *-- \"1..*\" Floor : has`"],
        ["Layout", "`direction LR` on the second line"]] }
  ];
  var REL = ["Dependency", "Association", "Aggregation", "Composition", "Generalization", "Realization"];
  var widget = H.widgets.picker({
    intro: "Each card describes two classes, with code or in words. Pick the UML relationship you would draw **from the first class to the second**. Lifecycle and exclusivity decide the diamonds; whether a field exists decides association vs dependency.",
    question: "Which relationship would you draw?",
    options: REL, noun: "Scenarios",
    items: [
      { title: "Order and OrderLine", code: "class Order {\n    private final List<OrderLine> lines = new ArrayList<>();\n    void addItem(String sku, int qty) { lines.add(new OrderLine(sku, qty)); }\n}", answer: "Composition", why: "`Order` creates the lines itself, nobody else holds them, and they mean nothing without the order.", fix: "Filled diamond on the `Order` end: `Order \"1\" *-- \"1..*\" OrderLine`." },
      { title: "Team and Player", code: "class Team {\n    private final List<Player> players = new ArrayList<>();\n    void add(Player p) { players.add(p); }   // players created elsewhere\n}", answer: "Aggregation", why: "Players are passed in, outlive the team, and can be in several teams.", fix: "`Team o-- Player`. A plain association is also defensible; say why." },
      { title: "ReportService and PdfRenderer", code: "class ReportService {\n    byte[] export(Report r) {\n        return new PdfRenderer().render(r);   // used only inside this method\n    }\n}", answer: "Dependency", why: "`PdfRenderer` is neither a field nor kept; it's used inside one method.", fix: "`ReportService ..> PdfRenderer`. Better still, inject a `Renderer` interface (DIP), which turns it into an association to the interface." },
      { title: "Driver and Car", code: "class Driver {\n    private Car car;   // assigned car, can change over time\n    void assign(Car c) { this.car = c; }\n}", answer: "Association", why: "A long-lived reference with no part-of meaning: a car isn't part of a driver.", fix: "`Driver \"1\" --> \"0..1\" Car : drives`." },
      { title: "UpiPayment and PaymentMethod", code: "class UpiPayment implements PaymentMethod {\n    public boolean pay(long amount) { return true; }\n}", answer: "Realization", why: "`implements` an interface: a dashed line with a hollow triangle pointing at the interface.", fix: "`PaymentMethod <|.. UpiPayment`." },
      { title: "SavingsAccount and Account", code: "class SavingsAccount extends Account {\n    double interestRate() { return 0.04; }\n}", answer: "Generalization", why: "`extends` an (abstract) class: a solid line with a hollow triangle.", fix: "`Account <|-- SavingsAccount`." },
      { title: "Building and Floor", text: "A building management system. Floors are created when the building is registered, they're numbered inside that building, and when a building is removed from the system all its floors go with it.", answer: "Composition", why: "Exclusive ownership plus a shared lifecycle: a floor can't belong to two buildings or exist alone.", fix: "`Building \"1\" *-- \"1..*\" Floor`." },
      { title: "Playlist and Song", text: "Users build playlists from songs in the catalogue. Deleting a playlist doesn't delete songs, and the same song appears in many playlists.", answer: "Aggregation", why: "Part-of, but shared and independently alive.", fix: "`Playlist \"*\" o-- \"*\" Song`." },
      { title: "OrderController and OrderRequest DTO", code: "class OrderController {\n    private final OrderService service;\n    OrderResponse create(OrderRequest req) { return service.place(req.items()); }\n}", answer: "Dependency", why: "`OrderRequest` appears only as a parameter. (`OrderService` is a field, which would be an association.)", fix: "`OrderController ..> OrderRequest`; usually you'd omit DTO arrows from the interview diagram entirely." },
      { title: "NotificationService and Notifier", code: "class NotificationService {\n    private final List<Notifier> channels;   // injected: Email, Sms, Push\n    NotificationService(List<Notifier> c) { channels = c; }\n}", answer: "Association", why: "Stored references to an interface, created and owned by someone else (the composition root). They're collaborators, not parts.", fix: "`NotificationService \"1\" --> \"*\" Notifier`." },
      { title: "ChessBoard and Square", text: "A chess board has 64 squares created with the board. A square knows its file and rank and the piece on it; squares are never moved between boards.", answer: "Composition", why: "The board creates exactly 64 squares that never outlive it or move to another board.", fix: "`Board \"1\" *-- \"64\" Square`, and `Square \"1\" --> \"0..1\" Piece` (association: pieces move between squares)." },
      { title: "Square and Piece", text: "In the same chess model a square may hold a piece. Pieces move from square to square, and captured pieces are kept in a list on the game.", answer: "Association", why: "The piece isn't part of the square: it moves between squares and outlives any one of them.", fix: "`Square \"1\" --> \"0..1\" Piece : occupiedBy`." }
    ]
  });

  var QUIZ = [
    { q: "In Mermaid, `Order *-- OrderLine` draws…", options: ["Aggregation, hollow diamond at OrderLine", "Composition, filled diamond at Order", "Inheritance from Order to OrderLine", "A dependency"], answer: 1, why: "`*--` is composition, and the diamond sits on the side of the `*`, the whole (Order)." },
    { q: "Which Java code most clearly indicates **composition** of `Engine` in `Car`?", options: ["`Car(Engine e) { this.engine = e; }`", "`void start(Engine e) { e.ignite(); }`", "`private final Engine engine = new Engine();` and no getter returning it", "`class Car extends Engine`"], answer: 2, why: "The whole creates the part and doesn't share it, so the part's lifetime is tied to the car. Passing it in suggests aggregation or association." },
    { q: "A class uses `LocalDate` only as a method parameter. What's the relationship?", options: ["Association", "Dependency", "Aggregation", "Realization"], answer: 1, why: "No field, so no structural link: it's a dependency. (In practice you wouldn't even draw arrows to JDK value types.)" },
    { q: "What does `Customer \"1\" --> \"*\" Order` say?", options: ["Each order has many customers", "A customer has zero or more orders; each order has exactly one customer", "A customer has exactly one order", "Customers and orders are the same thing"], answer: 1, why: "Read multiplicity at the far end: from Customer you see `*` orders; from Order you see `1` customer." },
    { q: "Students take many courses, courses have many students, and each pairing has a grade. Best model?", options: ["`List<Course>` in Student and `List<Student>` in Course, plus `grade` in Student", "A `grade` map inside Course", "An association class `Enrollment(student, course, grade)`", "`Student extends Course`"], answer: 2, why: "Data that belongs to the pairing goes on an association class. It also removes the bidirectional-sync problem." },
    { q: "Which visibility marker means package-private?", options: ["`#`", "`~`", "`-`", "`+`"], answer: 1, why: "`~` is package-private; `#` is protected." },
    { q: "Interviewer: \"why is `ParkingSpot` → `Vehicle` an association and not composition?\" Best answer:", options: ["Because vehicles are more important than spots", "The vehicle exists independently and comes and goes; the spot only references the currently parked one, `0..1`", "Composition can't have multiplicity", "Because Vehicle is abstract"], answer: 1, why: "Lifecycle and exclusivity: the spot doesn't create or own the vehicle." },
    { q: "In `class X implements Comparable<X>`, the arrow is drawn…", options: ["Solid line, hollow triangle at X", "Dashed line, hollow triangle at Comparable", "Solid line, filled diamond at Comparable", "Dashed line with an open arrow from Comparable to X"], answer: 1, why: "Realization: dashed line, hollow triangle pointing at the interface (the more general type)." },
    { q: "Which is **not** a good thing to put in an interview class diagram?", options: ["Enums for statuses", "Interfaces at the extension points", "Every getter and setter, plus `userId` foreign-key fields mirroring DB tables", "Multiplicities"], answer: 2, why: "Getters and setters are noise, and foreign-key fields mean you're drawing a schema, not an object model." }
  ];
  var PRACTICE = [
    { level: "Easy", q: "Explain association, aggregation and composition with one example each, and say how each looks in Java.",
      steps: [["Association", "`Doctor --> Patient`: a long-lived reference (a field) with no ownership. Either side can exist alone."],
        ["Aggregation", "`Department o-- Professor`: part-of, but professors are created elsewhere, passed in, can belong to two departments and survive the department's closure."],
        ["Composition", "`Invoice *-- InvoiceLine`: the invoice creates its lines, never shares them, and they're deleted with it. Java: `new InvoiceLine(...)` inside `Invoice`, no setter that accepts external lines."],
        ["Decider", "Ask: who creates the part, can it be shared, does it die with the whole?"]],
      follow: "What is the JPA equivalent of composition? `@OneToMany(mappedBy=..., cascade = CascadeType.ALL, orphanRemoval = true)`." },
    { level: "Easy", q: "Write the multiplicity for each relationship: (a) Person–Passport (b) Order–OrderLine (c) Author–Book (d) ParkingSpot–Vehicle currently parked (e) Flight–Seat.",
      a: ["(a) `Person \"1\" -- \"0..1\" Passport`: not everyone has one; each passport has exactly one holder.",
        "(b) `Order \"1\" *-- \"1..*\" OrderLine`: an order needs at least one line.",
        "(c) `Author \"1..*\" -- \"*\" Book`: many-to-many. If you need royalty share per author, add an association class `Authorship`.",
        "(d) `ParkingSpot \"1\" --> \"0..1\" Vehicle`.",
        "(e) `Flight \"1\" *-- \"*\" Seat` (or `Aircraft *-- Seat`, with `FlightSeat` as the association class holding availability per flight)."] },
    { level: "Easy", q: "Translate this Mermaid diagram into Java skeleton code.",
      qcode: "classDiagram\n  class Shape { <<interface>> +area() double }\n  Shape <|.. Circle\n  Shape <|.. Rect\n  Canvas \"1\" o-- \"*\" Shape\n  Canvas ..> Exporter : uses",
      a: "One interface, two implementations, a `Canvas` holding a list of shapes passed in from outside (aggregation), and an `Exporter` used only as a method parameter (dependency).",
      code: `interface Shape { double area(); }
record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }
record Rect(double w, double h) implements Shape { public double area() { return w * h; } }
interface Exporter { String export(List<Shape> shapes); }

class Canvas {
    private final List<Shape> shapes = new ArrayList<>();          // aggregation: shapes passed in
    void add(Shape s) { shapes.add(s); }
    double totalArea() { return shapes.stream().mapToDouble(Shape::area).sum(); }
    String exportWith(Exporter e) { return e.export(List.copyOf(shapes)); }   // dependency
}

Canvas c = new Canvas();
c.add(new Circle(1)); c.add(new Rect(2, 3));
System.out.printf("%.2f %s%n", c.totalArea(), c.exportWith(list -> list.size() + " shapes"));`,
    },
    { level: "Medium", q: "Draw the class diagram for a **parking lot**: multiple floors, spots of types (bike/car/truck), entry and exit gates, tickets, and pluggable pricing.",
      steps: [["Entities", "`ParkingLot`, `Floor`, `ParkingSpot`, `Vehicle` (abstract) + `Car`/`Bike`/`Truck`, `Ticket`, `Gate`, enums `SpotType` and `TicketStatus`."],
        ["Ownership", "Lot composes floors; floor composes spots (they die with the lot). Vehicles are independent."],
        ["Links", "`Ticket` references a `Vehicle` and a `ParkingSpot` and holds entry/exit times; spot → `0..1` vehicle."],
        ["Variation", "`PricingStrategy` and `SpotAllocationStrategy` interfaces, injected into `ParkingLot`."]],
      m: H.cd(["classDiagram",
        "  class ParkingLot { +park(Vehicle v) Ticket; +exit(String ticketId) long }",
        "  class Floor { -int number }",
        "  class ParkingSpot { -String id; -SpotType type; +isFree() boolean }",
        "  class Vehicle { <<abstract>>; -String plate; +type()* SpotType }",
        "  class Ticket { -String id; -LocalDateTime entry; -TicketStatus status }",
        "  class PricingStrategy { <<interface>>; +price(Ticket t) long }",
        "  class SpotAllocationStrategy { <<interface>>; +pick(List~Floor~ f, Vehicle v) ParkingSpot }",
        "  ParkingLot \"1\" *-- \"1..*\" Floor",
        "  Floor \"1\" *-- \"1..*\" ParkingSpot",
        "  ParkingSpot \"1\" --> \"0..1\" Vehicle",
        "  Ticket \"*\" --> \"1\" ParkingSpot",
        "  Ticket \"*\" --> \"1\" Vehicle",
        "  ParkingLot --> PricingStrategy",
        "  ParkingLot --> SpotAllocationStrategy",
        "  Vehicle <|-- Car",
        "  Vehicle <|-- Bike",
        "  Vehicle <|-- Truck"]),
      follow: "Where would you add an EV-charging spot? A new `SpotType` plus a spot capability; the allocation strategy filters on it. No change to `Ticket` or pricing." },
    { level: "Medium", q: "Reverse-engineer: draw the class diagram for this code, naming each relationship.",
      qcode: `interface Notifier { void send(String to, String msg); }
class SmsNotifier implements Notifier { public void send(String to, String msg) { } }
record Address(String city) {}
class Customer {
    private final Address address = new Address("Pune");
    private final List<Account> accounts = new ArrayList<>();
    void open(Account a) { accounts.add(a); }
}
abstract class Account { abstract long balance(); }
class Savings extends Account { long balance() { return 0; } }
class StatementService {
    private final Notifier notifier;
    StatementService(Notifier n) { notifier = n; }
    void mail(Customer c, java.time.YearMonth month) { notifier.send("c", "stmt " + month); }
}`,
      a: ["`Notifier <|.. SmsNotifier`: realization.",
        "`Customer *-- Address`: composition (created inside, never shared). Many would just show `address` as an attribute; both are fine.",
        "`Customer \"1\" o-- \"*\" Account`: accounts are passed in, so aggregation (or association).",
        "`Account <|-- Savings`: generalization; `Account` is `<<abstract>>`.",
        "`StatementService --> Notifier`: association to the interface (field).",
        "`StatementService ..> Customer`: dependency (parameter only). `YearMonth` is a JDK value type, so omit it."],
      m: H.cd(["classDiagram",
        "  class Notifier { <<interface>>; +send(String to, String msg) void }",
        "  class Account { <<abstract>>; +balance()* long }",
        "  class Customer { -Address address; +open(Account a) void }",
        "  class StatementService { -Notifier notifier; +mail(Customer c, YearMonth m) void }",
        "  Notifier <|.. SmsNotifier",
        "  Customer *-- Address",
        "  Customer \"1\" o-- \"*\" Account",
        "  Account <|-- Savings",
        "  StatementService --> Notifier",
        "  StatementService ..> Customer"]) },
    { level: "Medium", q: "Draw the core class diagram for a **movie ticket booking** system (BookMyShow): cities, theatres, screens, shows, seats, bookings. How do you model a seat that's booked for one show but free for another?",
      steps: [["Static structure", "`Theatre *-- Screen *-- Seat` (seats are physical, fixed per screen). `Movie` is independent."],
        ["Show", "`Show` links a `Movie` and a `Screen` at a time: `Show --> Movie`, `Show --> Screen`."],
        ["The key insight", "Seat availability belongs to the pair (show, seat), so use an association class **`ShowSeat`** with `status` (AVAILABLE/LOCKED/BOOKED), `price` and `lockedUntil`."],
        ["Booking", "`Booking --> \"1..*\" ShowSeat`, `Booking --> User`, `Booking *-- Payment`; status enum."]],
      m: H.cd(["classDiagram",
        "  class Theatre { -String name; -String city }",
        "  class Screen { -int number }",
        "  class Seat { -String row; -int col; -SeatType type }",
        "  class Movie { -String title; -int minutes }",
        "  class Show { -LocalDateTime start; +availableSeats() List~ShowSeat~ }",
        "  class ShowSeat { -SeatStatus status; -long price; -Instant lockedUntil }",
        "  class Booking { -String id; -BookingStatus status; +confirm() void }",
        "  Theatre \"1\" *-- \"1..*\" Screen",
        "  Screen \"1\" *-- \"1..*\" Seat",
        "  Show \"*\" --> \"1\" Movie",
        "  Show \"*\" --> \"1\" Screen",
        "  Show \"1\" *-- \"*\" ShowSeat",
        "  ShowSeat \"*\" --> \"1\" Seat",
        "  Booking \"0..1\" --> \"1..*\" ShowSeat",
        "  Booking \"*\" --> \"1\" User"]),
      follow: "Two users click the same seat. Where does the concurrency control live? In `ShowSeat` (an atomic status transition, AVAILABLE → LOCKED with a compare-and-set or a lock per show), covered in the concurrency lessons." },
    { level: "Medium", q: "Bidirectional associations are risky. Show the bug and write a safe Java implementation of `Department 1 -- * Employee` where both sides can navigate.",
      a: "The bug is setting one side and forgetting the other (`dept.employees.add(e)` but `e.dept` still points to the old department). Fix: make **one side the owner** of the operation, keep the collection private, and update both ends in one method. Or ask whether you really need both directions; usually a lookup from one side is enough.",
      code: `class Department {
    private final String name;
    private final Set<Employee> employees = new LinkedHashSet<>();
    Department(String name) { this.name = name; }
    String name() { return name; }
    Set<Employee> employees() { return Collections.unmodifiableSet(employees); }

    // The single entry point that keeps both sides consistent.
    void hire(Employee e) {
        if (e.department() == this) return;
        if (e.department() != null) e.department().employees.remove(e);
        employees.add(e);
        e.setDepartment(this);
    }
}
class Employee {
    private final String name;
    private Department department;
    Employee(String name) { this.name = name; }
    Department department() { return department; }
    void setDepartment(Department d) { department = d; }   // package-private: only Department calls it
    public String toString() { return name; }
}

Department eng = new Department("Eng"), ops = new Department("Ops");
Employee asha = new Employee("Asha");
eng.hire(asha);
ops.hire(asha);   // moves her: both sides updated
System.out.println(eng.employees() + " " + ops.employees() + " " + asha.department().name());` },
    { level: "Medium", q: "Draw the class diagram for **Splitwise**: users, groups, expenses split equally, exactly or by percentage, and balances.",
      steps: [["Entities", "`User`, `Group`, `Expense`, `Split` (association class between Expense and User: amount owed), `BalanceSheet`."],
        ["Variation", "`SplitStrategy` interface with `EqualSplit`, `ExactSplit`, `PercentSplit`; it validates and produces `Split`s."],
        ["Relationships", "`Group o-- User` (users exist outside groups), `Group *-- Expense`, `Expense *-- Split`, `Expense --> User : paidBy`."],
        ["Balances", "A `BalanceSheet` holds `Map<User, Map<User, Long>>`, updated on each expense; simplifying debts is a separate algorithm."]],
      m: H.cd(["classDiagram",
        "  class User { -String id; -String name }",
        "  class Group { -String name; +addExpense(Expense e) void }",
        "  class Expense { -String id; -long amount; -User paidBy }",
        "  class Split { -User user; -long owed }",
        "  class SplitStrategy { <<interface>>; +split(long amount, List~User~ users, List~Double~ params) List~Split~ }",
        "  class BalanceSheet { -Map~String, Long~ netByPair; +apply(Expense e) void }",
        "  Group \"*\" o-- \"*\" User",
        "  Group \"1\" *-- \"*\" Expense",
        "  Expense \"1\" *-- \"1..*\" Split",
        "  Split \"*\" --> \"1\" User",
        "  SplitStrategy <|.. EqualSplit",
        "  SplitStrategy <|.. ExactSplit",
        "  SplitStrategy <|.. PercentSplit",
        "  Expense ..> SplitStrategy : created via",
        "  Group --> BalanceSheet"]) },
    { level: "Hard", q: "Draw a class diagram for **chess** that can be extended with new variants (e.g. Chess960) and new piece types without editing existing classes.",
      steps: [["Board", "`Board *-- 64 Square`; `Square --> 0..1 Piece`."],
        ["Pieces", "`Piece` abstract with `color` and `legalMoves(Board, Square)`; subclasses `King`, `Queen`, … Each piece owns its movement rule (polymorphism instead of a `switch` on type)."],
        ["Game", "`Game` composes `Board` and `MoveHistory`, references 2 `Player`s, has `GameStatus`; `Move` is a value object (from, to, piece, captured)."],
        ["Extension seams", "`SetupStrategy` (standard vs Chess960 start positions) and `RuleSet` (castling, en passant, check detection) injected into `Game`."]],
      m: H.cd(["classDiagram",
        "  class Game { -GameStatus status; -Color turn; +play(Move m) void }",
        "  class Board { +at(int file, int rank) Square }",
        "  class Square { -int file; -int rank }",
        "  class Piece { <<abstract>>; -Color color; +legalMoves(Board b, Square from)* List~Move~ }",
        "  class Move { -Square from; -Square to; -Piece captured }",
        "  class SetupStrategy { <<interface>>; +setup(Board b) void }",
        "  class RuleSet { <<interface>>; +isLegal(Game g, Move m) boolean }",
        "  Game \"1\" *-- \"1\" Board",
        "  Game \"1\" *-- \"*\" Move : history",
        "  Game \"*\" --> \"2\" Player",
        "  Board \"1\" *-- \"64\" Square",
        "  Square \"1\" --> \"0..1\" Piece",
        "  Piece <|-- King",
        "  Piece <|-- Queen",
        "  Piece <|-- Knight",
        "  Game --> SetupStrategy",
        "  Game --> RuleSet",
        "  SetupStrategy <|.. StandardSetup",
        "  SetupStrategy <|.. Chess960Setup"]),
      follow: "Why is `Move` a separate class rather than two ints? It's needed for undo (Memento/Command), notation, history display and validation, and it carries the captured piece." },
    { level: "Hard", q: "The interviewer pushes back: \"You drew `Account *-- Transaction`. Banks never delete transactions when an account closes, so is that really composition?\" How do you respond, and what changes in the diagram and code?",
      a: ["Agree that it depends on the domain's lifecycle rules. Closing an account in a bank sets a status; it doesn't delete history, and transactions are audit records referenced by statements, reconciliation and regulators.",
        "So the relationship is better drawn as an **association** `Account \"1\" --> \"*\" Transaction` (or `Transaction --> Account`, with the account holding no collection at all, since a list of millions of transactions in memory is a bad idea).",
        "Code impact: transactions are created by a `LedgerService` and stored in a `TransactionRepository`, queried by account id and date range; `Account` holds a balance and status, not a `List<Transaction>`.",
        "Point out that the earlier composition reflected the in-memory interview simplification, and that the diagram should follow the business rule. Being willing to change it is the signal they're looking for."],
      m: H.cd(["classDiagram",
        "  direction LR",
        "  class Account { -String id; -long balance; -AccountStatus status }",
        "  class Transaction { -String id; -long amount; -Instant at }",
        "  class LedgerService { +transfer(String from, String to, long amt) void }",
        "  class TransactionRepository { <<interface>>; +findByAccount(String id, Instant from, Instant to) List~Transaction~ }",
        "  Transaction \"*\" --> \"1\" Account",
        "  LedgerService --> TransactionRepository",
        "  LedgerService ..> Transaction : creates"]) },
    { level: "Hard", q: "Draw the class diagram for an **elevator system** with N elevators, a dispatcher, hall and cabin requests, and replaceable scheduling (nearest car, SCAN/LOOK).",
      steps: [["Entities", "`Building`, `ElevatorCar` (current floor, `Direction`, `ElevatorState`, door), `Request` (abstract) with `HallRequest(floor, direction)` and `CabinRequest(car, floor)`."],
        ["Control", "`Dispatcher` receives hall requests and assigns a car via `SchedulingStrategy`; each car has its own stop queue (two `TreeSet`s, up and down, for LOOK)."],
        ["Relationships", "`Building *-- ElevatorCar`, `Building *-- Floor`, `Dispatcher --> \"*\" ElevatorCar`, `Dispatcher --> SchedulingStrategy`."],
        ["Behaviour", "`ElevatorCar` behaviour by state (Idle/MovingUp/MovingDown/DoorsOpen) is a State-pattern candidate (Lesson F20)."]],
      m: H.cd(["classDiagram",
        "  class Building { -int floors }",
        "  class ElevatorCar { -int id; -int currentFloor; -Direction direction; -ElevatorState state; +addStop(int floor) void; +step() void }",
        "  class Dispatcher { +submit(HallRequest r) void }",
        "  class SchedulingStrategy { <<interface>>; +choose(List~ElevatorCar~ cars, HallRequest r) ElevatorCar }",
        "  class Request { <<abstract>>; -int floor; -Instant at }",
        "  Building \"1\" *-- \"1..*\" ElevatorCar",
        "  Building \"1\" *-- \"1\" Dispatcher",
        "  Dispatcher \"1\" --> \"*\" ElevatorCar",
        "  Dispatcher --> SchedulingStrategy",
        "  Request <|-- HallRequest",
        "  Request <|-- CabinRequest",
        "  SchedulingStrategy <|.. NearestCarStrategy",
        "  SchedulingStrategy <|.. LookStrategy"]) }
  ];

  H.registerLesson({
    code: "F03",
    summary: "UML class diagrams as an LLD interview tool: the anatomy of a class box, visibility and stereotypes, and every relationship (association, multiplicity, aggregation, composition, dependency, generalization, realization), each mapped to Java. Also how to choose between them, association classes, a worked library example, and drawing fast in an interview or in Mermaid.",
    slides: SLIDES,
    widget: { heading: "Interactive: name that relationship", caption: "12 scenarios from code or from requirements. Pick the relationship you'd draw from the first class to the second. Your answers are saved.", render: widget },
    examplesHeading: "Real-world analogies and where these relationships show up",
    examples: [
      ["Composition: `HashMap` and its `Node`s", "`HashMap` creates its internal `Node` entries and never hands them out mutably; they die with the map. A textbook composition inside the JDK."],
      ["Aggregation: a Spring `@Configuration` wiring beans", "A `CheckoutService` receives a `PaymentGateway` bean that the container created and may share with other services: an independent lifecycle, injected from outside."],
      ["Association class: JPA join entities", "When a `@ManyToMany` needs extra columns (quantity, role, enrolledOn) you replace it with an explicit entity such as `OrderItem` or `Enrollment`, exactly the association-class move."],
      ["Composition vs aggregation in JPA", "`cascade = ALL, orphanRemoval = true` on `@OneToMany` encodes composition; without cascade delete the children survive, which is aggregation or association."],
      ["Realization: `Comparable`, `Runnable`, `AutoCloseable`", "Every `implements` is a realization arrow. JDK types are usually omitted from interview diagrams unless they're the point."],
      ["Analogy: a car", "The car *composes* its chassis (built with it, scrapped with it), *aggregates* the stereo (swappable, outlives the car), is *associated* with its owner, and *depends* on the fuel pump at the station only while refuelling."]
    ],
    pitfalls: [
      "Putting the diamond on the wrong end: it always sits next to the **whole**",
      "Using composition for everything that \"has\" something; ask about lifecycle and sharing",
      "Drawing database tables (foreign keys, join tables) instead of objects and references",
      "No multiplicities, so `0..1` vs `1` questions (can a ticket exist without a spot?) never get asked",
      "Bidirectional associations everywhere, then forgetting to update both sides in code",
      "Modelling a many-to-many that has data (grade, seat status, owed amount) without an association class",
      "Diagram and code disagree: the diagram says composition but the code takes the part in a constructor",
      "Drawing every getter, setter and JDK type; the diagram becomes unreadable",
      "Deep `extends` hierarchies where interfaces plus composition would do"
    ],
    quiz: QUIZ,
    cheatsheet: {
      table: [
        ["Relationship", "Mermaid", "UML line", "Java tell", "Example"],
        ["Dependency", "`A ..> B`", "dashed, open arrow", "param / local / return only", "`Service ..> Request`"],
        ["Association", "`A --> B`", "solid line (arrow = navigable)", "field", "`Driver --> Car`"],
        ["Aggregation", "`A o-- B`", "hollow diamond at whole", "part passed in, shareable", "`Team o-- Player`"],
        ["Composition", "`A *-- B`", "filled diamond at whole", "whole does `new`, part not shared", "`Order *-- OrderLine`"],
        ["Generalization", "`P <|-- C`", "solid, hollow triangle", "`extends`", "`Vehicle <|-- Car`"],
        ["Realization", "`I <|.. C`", "dashed, hollow triangle", "`implements`", "`Payment <|.. Upi`"]],
      cards: [
        { title: "Multiplicity → Java", items: ["`1`: required constructor arg", "`0..1`: nullable / `Optional`", "`*`: `List`/`Set`/`Map`", "`1..*`: validate non-empty", "many-to-many with data: association class"] },
        { title: "Visibility & markers", items: ["`+` public, `-` private", "`#` protected, `~` package", "`*` abstract, `$` static (Mermaid)", "`<<interface>>`, `<<abstract>>`, `<<enumeration>>`", "Generics: `List~T~`"] },
        { title: "Interview drawing order", items: ["Entities + enums", "Ownership (composition)", "Links with multiplicities", "Interfaces at extension points", "Services that orchestrate", "Narrate each diamond"] }]
    },
    practice: PRACTICE,
    recap: [
      "A class box: name, attributes, operations; `+ - # ~` for visibility, stereotypes for interface/abstract/enum. Draw only what drives the discussion.",
      "Relationships from weak to strong: dependency (used in a method) → association (field) → aggregation (part, independent) → composition (part, owned, dies with whole); plus `extends`/`implements`.",
      "Diamonds sit at the whole. Composition = the whole creates the part, never shares it, and the part dies with it.",
      "Multiplicity on every association; `0..1` vs `1` maps to nullable vs required. Many-to-many with data becomes an association class (Enrollment, ShowSeat, Split).",
      "Nouns → classes, verbs → methods, varying rules → interfaces. Keep the diagram and the code consistent, and be ready to defend or change each relationship."
    ]
  });
})();
