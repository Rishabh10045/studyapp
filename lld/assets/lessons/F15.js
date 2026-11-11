/* Lesson F15: Bridge */
(function () {
  "use strict";
  var H = window.LLD, M = H.M;

  var ABS = ["Alert", "Reminder", "Marketing", "Otp", "Digest", "Invoice"];
  var IMPS = ["Sms", "Email", "Push", "WhatsApp", "Slack", "Voice"];
  function bridgeWidget(el, ctx) {
    var s = ctx.state; if (!s.a) { s.a = 3; s.i = 3; }
    el.innerHTML = "<p>" + ctx.md("Notifications vary in **two independent dimensions**: the *kind* of message (what it says and how urgent it is) and the *channel* that delivers it. Add kinds and channels and compare the class count with plain inheritance (one subclass per combination) against Bridge (one hierarchy per dimension, joined by composition).") + "</p>" +
      "<div class='grid2'><div><div class='field'>Message kinds (abstraction)</div><div class='btnrow'><button type='button' class='btn' data-r='a-'>−</button><button type='button' class='btn' data-r='a+'>+</button></div><div data-r='al'></div></div>" +
      "<div><div class='field'>Channels (implementation)</div><div class='btnrow'><button type='button' class='btn' data-r='i-'>−</button><button type='button' class='btn' data-r='i+'>+</button></div><div data-r='il'></div></div></div>" +
      "<div class='metrics' data-r='m' style='margin-top:10px'></div>" +
      "<div class='grid2'><div><div class='field'>Inheritance: one class per pair</div><pre class='code' data-r='inh'></pre></div><div><div class='field'>Bridge: two small hierarchies</div><pre class='code' data-r='br'></pre></div></div>" +
      "<div class='result' data-r='res'></div>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function draw() {
      var a = ABS.slice(0, s.a), im = IMPS.slice(0, s.i);
      q("al").innerHTML = "<p>" + a.map(function (x) { return "<code>" + x + "Notification</code>"; }).join(" ") + "</p>";
      q("il").innerHTML = "<p>" + im.map(function (x) { return "<code>" + x + "Channel</code>"; }).join(" ") + "</p>";
      var inh = a.length * im.length, br = a.length + im.length;
      q("m").innerHTML = "<div class='metric'><div class='v'>" + (inh + 1) + "</div><div class='l'>classes with inheritance (" + a.length + " × " + im.length + " + base)</div></div>" +
        "<div class='metric'><div class='v'>" + (br + 2) + "</div><div class='l'>classes with Bridge (" + a.length + " + " + im.length + " + 2 base types)</div></div>";
      var lines = []; a.forEach(function (x) { im.forEach(function (y) { lines.push("class " + x + "Via" + y + " extends Notification"); }); });
      q("inh").textContent = "abstract class Notification\n" + lines.join("\n");
      q("br").textContent = "abstract class Notification { Channel channel; }\n" + a.map(function (x) { return "class " + x + "Notification extends Notification"; }).join("\n") +
        "\n\ninterface Channel\n" + im.map(function (y) { return "class " + y + "Channel implements Channel"; }).join("\n") +
        "\n\n// any pairing at runtime:\nnew " + a[a.length - 1] + "Notification(new " + im[im.length - 1] + "Channel())";
      var res = q("res");
      if (inh + 1 <= br + 2) { res.className = "result warn"; res.innerHTML = "<div class='out'>No saving yet</div><p>" + ctx.md("With this few variations, Bridge doesn't reduce classes. It pays off when **both** dimensions grow.") + "</p>"; }
      else { res.className = "result ok"; res.innerHTML = "<div class='out'>Bridge saves " + ((inh + 1) - (br + 2)) + " classes</div><p>" + ctx.md("Adding one more channel now costs **1** class with Bridge instead of **" + a.length + "** with inheritance. Growth is additive (m + n) instead of multiplicative (m × n).") + "</p>"; }
      q("a-").disabled = s.a <= 1; q("a+").disabled = s.a >= ABS.length; q("i-").disabled = s.i <= 1; q("i+").disabled = s.i >= IMPS.length;
    }
    ["a-", "a+", "i-", "i+"].forEach(function (k) {
      q(k).addEventListener("click", function () { var f = k[0], d = k[1] === "+" ? 1 : -1; s[f] = Math.max(1, Math.min(6, s[f] + d)); ctx.save(); draw(); });
    });
    draw();
  }
  H.pattern({
    code: "F15", name: "Bridge",
    summary: "Bridge separates an abstraction from its implementation so the two can vary independently, replacing an m × n subclass explosion with m + n classes joined by composition. This lesson covers the structure (abstraction, refined abstraction, implementor), notifications × channels, shapes × renderers, remotes × devices, a payment-instrument × processor design, JDBC (`DriverManager` + `Driver`) and SLF4J as real bridges, how Bridge relates to Strategy and Adapter, and when the extra indirection isn't worth it.",
    intent: "**Decouple an abstraction from its implementation** so that the two can vary independently. The abstraction holds a reference to an implementor interface and delegates the platform-specific work to it.",
    problem: {
      text: "You have notification kinds (alert, reminder, marketing) and delivery channels (SMS, email, push). With inheritance you write `AlertSms`, `AlertEmail`, `AlertPush`, `ReminderSms`... Every new kind needs one class per channel and every new channel needs one class per kind. The two concerns are tangled in one hierarchy.",
      points: [
        "**Two orthogonal dimensions** of variation in one inheritance tree → m × n classes",
        "Changes to channel code are duplicated across every kind",
        "Bridge: one hierarchy for the **abstraction** (what the client uses), one for the **implementation** (how it's done), linked by a field",
        "The link is chosen at construction (or runtime), so any pairing works"],
      code: `abstract class Notification { abstract void send(String user); }
class AlertSms extends Notification { void send(String u) { System.out.println("SMS to " + u + ": [URGENT] server down"); } }
class AlertEmail extends Notification { void send(String u) { System.out.println("EMAIL to " + u + ": [URGENT] server down"); } }
class ReminderSms extends Notification { void send(String u) { System.out.println("SMS to " + u + ": reminder: standup 10am"); } }
class ReminderEmail extends Notification { void send(String u) { System.out.println("EMAIL to " + u + ": reminder: standup 10am"); } }
// + Push? write AlertPush and ReminderPush. + Marketing? write MarketingSms, MarketingEmail, MarketingPush...
new AlertSms().send("asha"); new ReminderEmail().send("ravi");` },
    analogy: "A TV remote and the TV. Remotes vary (basic, voice, universal app); TVs vary (Sony, Samsung, a projector). Any remote can drive any device through a common protocol (IR/HDMI-CEC). Nobody manufactures a \"SonyVoiceRemote\" class for every pairing; the two product lines evolve independently.",
    structure: {
      text: "**Abstraction** defines the client-facing API and holds a reference to an **Implementor**. **RefinedAbstraction** extends the abstraction with variants. **Implementor** is an interface for the low-level operations; **ConcreteImplementors** provide them for each platform. The abstraction's methods are written in terms of implementor primitives, so new abstractions and new implementors combine freely.",
      m: H.cd(["classDiagram",
        "  class Notification { <<abstract>>; #Channel channel; +send(String user) }",
        "  class AlertNotification { +send(String user) }",
        "  class ReminderNotification { +send(String user) }",
        "  class Channel { <<interface>>; +deliver(String to, String title, String body) }",
        "  class SmsChannel", "  class EmailChannel", "  class PushChannel",
        "  Notification <|-- AlertNotification",
        "  Notification <|-- ReminderNotification",
        "  Notification o-- Channel : bridge",
        "  Channel <|.. SmsChannel", "  Channel <|.. EmailChannel", "  Channel <|.. PushChannel"]),
      roles: [["Abstraction", "Client-facing type; holds an Implementor reference"], ["Refined abstraction", "Variants of the abstraction (alert, reminder)"], ["Implementor", "Interface of primitive operations the abstraction needs"], ["Concrete implementor", "Platform-specific implementation (SMS, email, push)"]],
      points: ["The `o--` composition link between the two hierarchies is the **bridge**", "Implementor primitives are lower-level than abstraction methods: `deliver(to, title, body)` vs `send(user)`"] },
    impl: {
      title: "Java implementation: notification kinds × channels",
      text: "Kinds decide **content and policy** (prefix, retries, whether to respect quiet hours); channels decide **transport and formatting limits**. Adding `PushChannel` is one class; adding `MarketingNotification` is one class. Any kind works with any channel.",
      code: `interface Channel { void deliver(String to, String title, String body); }
class SmsChannel implements Channel {
    public void deliver(String to, String title, String body) {
        String text = (title + ": " + body);
        System.out.println("  SMS   " + to + " | " + (text.length() > 40 ? text.substring(0, 37) + "..." : text));
    }
}
class EmailChannel implements Channel { public void deliver(String to, String title, String body) { System.out.println("  EMAIL " + to + " | subject=" + title + " | " + body); } }
class PushChannel implements Channel { public void deliver(String to, String title, String body) { System.out.println("  PUSH  " + to + " | " + title); } }

abstract class Notification {                                         // abstraction
    protected final Channel channel;                                   // the bridge
    Notification(Channel c) { channel = c; }
    abstract void send(String user);
}
class AlertNotification extends Notification {
    private final String what;
    AlertNotification(Channel c, String what) { super(c); this.what = what; }
    void send(String user) { for (int i = 0; i < 2; i++) channel.deliver(user, "[URGENT] " + what, "Act now. Ack in the console."); }   // alerts are sent twice
}
class ReminderNotification extends Notification {
    private final String event; private final String at;
    ReminderNotification(Channel c, String event, String at) { super(c); this.event = event; this.at = at; }
    void send(String user) { channel.deliver(user, "Reminder", event + " at " + at); }
}

new AlertNotification(new SmsChannel(), "payments-db CPU 95%").send("+9198XXXX");
new ReminderNotification(new EmailChannel(), "Sprint planning", "10:00 IST").send("ravi@x.in");
new ReminderNotification(new PushChannel(), "Standup", "09:30").send("device-42");` },
    variants: [
      { title: "Classic example: shapes × renderers",
        text: "The GoF example. Shapes (circle, square, polyline) are the abstraction; renderers (vector/SVG, raster/canvas, terminal) are the implementation. Shapes express *what* to draw in terms of renderer primitives (`line`, `arc`), so a new renderer instantly supports every shape.",
        code: `interface Renderer { void line(int x1, int y1, int x2, int y2); void circle(int cx, int cy, int r); }
class SvgRenderer implements Renderer {
    public void line(int a, int b, int c, int d) { System.out.println("  <line x1='" + a + "' y1='" + b + "' x2='" + c + "' y2='" + d + "'/>"); }
    public void circle(int x, int y, int r) { System.out.println("  <circle cx='" + x + "' cy='" + y + "' r='" + r + "'/>"); }
}
class TextRenderer implements Renderer {
    public void line(int a, int b, int c, int d) { System.out.println("  line " + a + "," + b + " -> " + c + "," + d); }
    public void circle(int x, int y, int r) { System.out.println("  circle @" + x + "," + y + " r" + r); }
}
abstract class Shape { protected final Renderer r; Shape(Renderer r) { this.r = r; } abstract void draw(); }
class Square extends Shape {
    final int x, y, s; Square(Renderer r, int x, int y, int s) { super(r); this.x = x; this.y = y; this.s = s; }
    void draw() { r.line(x, y, x + s, y); r.line(x + s, y, x + s, y + s); r.line(x + s, y + s, x, y + s); r.line(x, y + s, x, y); }
}
class Dot extends Shape { final int x, y; Dot(Renderer r, int x, int y) { super(r); this.x = x; this.y = y; } void draw() { r.circle(x, y, 1); } }

for (Renderer rend : List.of(new SvgRenderer(), new TextRenderer())) {
    System.out.println(rend.getClass().getSimpleName() + ":");
    new Square(rend, 0, 0, 10).draw(); new Dot(rend, 5, 5).draw();
}`,
        points: [
          "3 shapes × 3 renderers = 6 classes with Bridge vs 9 combinations with inheritance; the gap widens quickly",
          "Implementor primitives must be **sufficient** for all abstractions; designing that interface is the hard part"] },
      { title: "Bridge is planned; it often looks like Strategy",
        text: "Bridge and Strategy (F17) have the same diagram shape: a class holding an interface reference. The difference is **scope and intent**. Strategy swaps one **algorithm** used by a context. Bridge splits a whole **abstraction hierarchy** from an **implementation hierarchy** so both can be extended, usually decided **up front** at design time for platform independence.",
        table: [
          ["", "Bridge", "Strategy", "Adapter"],
          ["When decided", "design time, before both sides grow", "whenever behaviour must vary", "after the fact, to fit existing code"],
          ["What varies", "two hierarchies (abstraction and platform)", "one algorithm", "an interface mismatch"],
          ["Abstraction side has subclasses?", "yes, usually (refined abstractions)", "context usually doesn't", "no"],
          ["Example", "JDBC: your code + `Driver` per DB", "`Comparator`, pricing rule", "`InputStreamReader`"]],
        points: [
          "Interview phrasing: \"I'll bridge the report type from the export format, so new reports and new formats are independent\"",
          "Many real \"bridges\" are a single abstraction class plus an implementor interface (no refined abstractions yet). That's fine: the seam is in place for when the abstraction side grows"] }
    ],
    designs: [
      { title: "Mini LLD: reports × export formats",
        text: "An admin portal has reports (Sales, Inventory, GST summary) and exports (CSV, PDF, Excel, JSON for the API). Every report must export in every format, and both lists keep growing. Bridge: a `Report` abstraction builds a **format-neutral** document (title, table, totals) and hands it to an `Exporter` implementor that writes the bytes.",
        points: [
          "`Report` (abstraction): `export()` calls `exporter.begin(title)`, `exporter.row(cells)`, `exporter.end(footer)`",
          "Refined abstractions: `SalesReport`, `InventoryReport` decide **which data** and **which columns**",
          "`Exporter` (implementor): `CsvExporter`, `MarkdownExporter`, `PdfExporter` decide **how bytes look** (escaping, fonts, page breaks)",
          "New report = 1 class; new format = 1 class; scheduler code just calls `report.export()`",
          "Selecting the exporter by user choice is a small factory (F06): `Exporters.forFormat(\"csv\")`"],
        m: H.cd(["classDiagram",
          "  class Report { <<abstract>>; #Exporter out; +export() String; #title() String; #rows() List }",
          "  class SalesReport",
          "  class InventoryReport",
          "  class Exporter { <<interface>>; +begin(String title); +row(List~String~ cells); +end(String footer) String }",
          "  class CsvExporter", "  class MarkdownExporter", "  class PdfExporter",
          "  Report <|-- SalesReport", "  Report <|-- InventoryReport",
          "  Report o-- Exporter : bridge",
          "  Exporter <|.. CsvExporter", "  Exporter <|.. MarkdownExporter", "  Exporter <|.. PdfExporter"]),
        code: `interface Exporter { void begin(String title, List<String> header); void row(List<String> cells); String end(String footer); }
class CsvExporter implements Exporter {
    private final StringBuilder sb = new StringBuilder();
    private static String esc(String c) { return c.contains(",") ? "\\"" + c + "\\"" : c; }
    public void begin(String t, List<String> h) { sb.append(String.join(",", h)).append("\\n"); }
    public void row(List<String> c) { sb.append(String.join(",", c.stream().map(CsvExporter::esc).toList())).append("\\n"); }
    public String end(String f) { return sb.toString(); }
}
class MarkdownExporter implements Exporter {
    private final StringBuilder sb = new StringBuilder();
    public void begin(String t, List<String> h) { sb.append("## ").append(t).append("\\n| ").append(String.join(" | ", h)).append(" |\\n"); }
    public void row(List<String> c) { sb.append("| ").append(String.join(" | ", c)).append(" |\\n"); }
    public String end(String f) { return sb.append("\\n_").append(f).append("_").toString(); }
}

abstract class Report {
    protected final Exporter out;
    Report(Exporter out) { this.out = out; }
    abstract String title(); abstract List<String> header(); abstract List<List<String>> rows();
    String export() {                                                     // written once, in terms of implementor primitives
        out.begin(title(), header());
        rows().forEach(out::row);
        return out.end(rows().size() + " rows");
    }
}
class SalesReport extends Report {
    SalesReport(Exporter e) { super(e); }
    String title() { return "Sales (Nov)"; }
    List<String> header() { return List.of("city", "orders", "revenue"); }
    List<List<String>> rows() { return List.of(List.of("Pune", "120", "1,20,000"), List.of("Indore", "80", "64,000")); }
}
class InventoryReport extends Report {
    InventoryReport(Exporter e) { super(e); }
    String title() { return "Low stock"; }
    List<String> header() { return List.of("sku", "qty"); }
    List<List<String>> rows() { return List.of(List.of("PEN", "4")); }
}

System.out.println(new SalesReport(new CsvExporter()).export());
System.out.println(new InventoryReport(new MarkdownExporter()).export());` },
      { title: "Mini LLD: remotes × devices",
        text: "A smart-home app controls TVs, radios and smart speakers with different remotes: a basic remote (power, volume), an advanced remote (adds mute and favourite channels), and a voice remote (parses phrases into calls). Devices expose primitives (`isOn`, `setVolume`, `setChannel`); remotes compose them into user-level actions. A new device brand plugs into every remote.",
        points: [
          "`Device` implementor: `isEnabled()`, `enable()`, `disable()`, `getVolume()`, `setVolume(int)`, `setChannel(int)`",
          "`RemoteControl` abstraction holds a `Device`; `AdvancedRemote` adds `mute()` (remembering the previous volume) and `favourite(n)`",
          "Devices clamp volume to their own range (0..100 or 0..30); remotes don't need to know",
          "Testing: a `FakeDevice` records calls, so remote logic is tested without hardware"],
        m: H.cd(["classDiagram", "  direction LR",
          "  class RemoteControl { #Device device; +togglePower(); +volumeUp(); +volumeDown() }",
          "  class AdvancedRemote { -int savedVolume; +mute(); +favourite(int n) }",
          "  class VoiceRemote { +say(String phrase) }",
          "  class Device { <<interface>>; +isEnabled() boolean; +enable(); +disable(); +getVolume() int; +setVolume(int v); +setChannel(int c) }",
          "  RemoteControl <|-- AdvancedRemote", "  RemoteControl <|-- VoiceRemote",
          "  RemoteControl o-- Device : bridge",
          "  Device <|.. Tv", "  Device <|.. Radio", "  Device <|.. SmartSpeaker"]) }
    ],
    usages: [
      ["JDBC: `java.sql.DriverManager` / `Connection` + `java.sql.Driver`", "Your code uses the JDBC API (abstraction); each vendor's driver (MySQL, Postgres, Oracle) is the implementation. Either side evolves independently."],
      ["SLF4J API + bindings (Logback, Log4j2)", "The logging API is the abstraction; a binding/provider is the implementor chosen at deploy time."],
      ["AWT peers (`java.awt.peer`)", "Historic GoF-style bridge: `Button` (abstraction) delegated to a platform-specific peer (Windows, Motif, macOS)."],
      ["`java.util.logging.Handler` + `Formatter`", "Handlers (where to write) and formatters (how to format) are two independent hierarchies combined by composition."],
      ["Spring `JdbcTemplate` + `DataSource`, `RestClient` + `ClientHttpRequestFactory`", "The template is the abstraction; the pluggable factory/data source (JDK `HttpClient`, Apache, Netty, Hikari) is the implementation."],
      ["Spring `PlatformTransactionManager`", "`@Transactional` code works the same while the implementor is JDBC, JPA or JTA."]
    ],
    avoid: {
      points: [
        "Only one dimension varies: a plain interface (or Strategy) is enough",
        "Only one implementation exists and none is foreseen: the extra hierarchy is speculative (YAGNI)",
        "The implementor interface can't be made common without leaking platform specifics: you'll end up with `if (impl instanceof X)` in the abstraction",
        "Combinations have genuinely unique behaviour (each pair is special): Bridge assumes they're orthogonal",
        "You're retrofitting an existing class to an interface: that's Adapter"],
      pros: ["m + n classes instead of m × n", "Abstractions and platforms evolve independently (OCP on both sides)", "Implementation can be chosen or switched at runtime", "Hides platform details from clients; easy to test with fake implementors"],
      cons: ["More up-front design: the implementor interface must fit every abstraction", "Indirection makes simple cases harder to read", "A poorly chosen primitive set forces leaks or lowest-common-denominator features", "Easy to over-apply where only one dimension varies"] },
    compare: [
      ["Strategy (F17)", "Swap one algorithm in a context", "Same shape. Bridge separates two whole hierarchies (abstraction has subclasses too) for platform independence; Strategy varies one behaviour"],
      ["Adapter (F10)", "Make an existing class fit", "Adapter is retrofitted after the fact; Bridge is designed in up front so both sides can grow"],
      ["Abstract Factory (F07)", "Create families of related objects", "Often used to create and configure the right implementor for a bridge (e.g. per platform)"],
      ["Decorator (F11)", "Add behaviour, same interface", "Decorator stacks wrappers of one type; Bridge links two different type hierarchies"],
      ["State (F20)", "Change behaviour when internal state changes", "Also delegates to a held object, but the held object is swapped by the context itself as state changes"]],
    widget: { heading: "Interactive: m × n vs m + n", caption: "Add message kinds and delivery channels. Compare how many classes inheritance needs against Bridge, and see the generated class lists.", render: bridgeWidget },
    pitfalls: [
      "Leaky implementor interfaces (`setSmsUnicodeFlag()` on a generic `Channel`)",
      "Putting platform checks (`instanceof SmsChannel`) in the abstraction, which defeats the separation",
      "Applying Bridge when only one dimension varies",
      "Primitives too high-level (each abstraction needs its own implementor method) or too low-level (chatty, slow)",
      "Calling it Bridge when it's really Strategy or Adapter: explain the intent",
      "Constructing implementors inside the abstraction with `new` instead of injecting them",
      "Forgetting that the implementor can fail differently (SMS length limits, email bounces); map errors at the implementor boundary",
      "Not documenting which pairings are unsupported (if any), so runtime pairing fails late"
    ],
    quiz: [
      { q: "What problem does Bridge solve?", options: ["Interface mismatch", "Class explosion when two dimensions vary in one inheritance tree", "Expensive object creation", "Too many method parameters"], answer: 1, why: "It splits m × n into m + n." },
      { q: "In JDBC, which side is the implementor?", options: ["Your DAO code", "The vendor `Driver` implementations", "`ResultSet`", "SQL"], answer: 1, why: "The driver implements the platform-specific side." },
      { q: "The \"bridge\" in Bridge is…", options: ["An adapter class", "The reference from the abstraction to the implementor interface (composition)", "A static factory", "An abstract subclass"], answer: 1, why: "Composition links the two hierarchies." },
      { q: "Bridge vs Adapter?", options: ["Same", "Bridge is designed up front so both sides vary; Adapter is retrofitted to make existing classes fit", "Adapter has two hierarchies", "Bridge changes interfaces"], answer: 1, why: "Timing and intent." },
      { q: "Bridge vs Strategy?", options: ["Bridge is creational", "Same shape; Bridge separates whole abstraction and implementation hierarchies, Strategy swaps one algorithm", "Strategy needs inheritance", "No relation"], answer: 1, why: "Scope and intent." },
      { q: "5 report types × 4 export formats. Classes with Bridge (excluding base types)?", options: ["20", "9", "5", "4"], answer: 1, why: "5 + 4." },
      { q: "A sign your implementor interface is wrong:", options: ["It has three methods", "Abstractions need `instanceof` checks on the implementor to work", "It's an interface", "It's injected"], answer: 1, why: "The primitives aren't sufficient or are leaking platform details." },
      { q: "Which is a Bridge in the JDK logging API?", options: ["`Logger.getLogger`", "`Handler` (destination) combined with `Formatter` (format)", "`Level`", "`LogRecord`"], answer: 1, why: "Two independent hierarchies joined by composition." }
    ],
    cheatsheet: {
      table: [
        ["Part", "Role", "Example"],
        ["Abstraction", "client API, holds implementor", "`Notification`, `Report`, `RemoteControl`"],
        ["Refined abstraction", "variants of the API", "`AlertNotification`, `SalesReport`"],
        ["Implementor", "primitive operations interface", "`Channel`, `Exporter`, `Device`"],
        ["Concrete implementor", "platform-specific", "`SmsChannel`, `CsvExporter`, `Tv`"]],
      cards: [
        { title: "Use when", items: ["Two orthogonal dimensions", "Platform independence needed", "Both sides will grow", "Choose implementation at runtime"] },
        { title: "Design tips", items: ["Primitives sufficient for all abstractions", "Inject the implementor", "No instanceof in abstraction", "Map errors at implementor"] },
        { title: "Real bridges", items: ["JDBC API + drivers", "SLF4J + bindings", "JUL Handler + Formatter", "Spring TxManager"] }]
    },
    practice: [
      { level: "Easy", q: "Define Bridge, name its four participants, and explain the m × n → m + n argument with an example.",
        a: ["Bridge decouples an abstraction from its implementation so both can vary independently, linking them by composition.",
          "Participants: **Abstraction**, **Refined Abstraction**, **Implementor**, **Concrete Implementor**.",
          "Example: 4 notification kinds × 3 channels = 12 subclasses with inheritance; with Bridge, 4 kind classes + 3 channel classes = 7, and a new channel costs 1 class instead of 4."] },
      { level: "Easy", q: "Implement `RemoteControl` / `AdvancedRemote` over a `Device` interface with `Tv` and `Radio`. `mute()` should restore the previous volume on a second press.",
        code: `interface Device { boolean isOn(); void power(boolean on); int volume(); void volume(int v); String name(); }
class Tv implements Device {
    private boolean on; private int vol = 20;
    public boolean isOn() { return on; } public void power(boolean b) { on = b; }
    public int volume() { return vol; } public void volume(int v) { vol = Math.max(0, Math.min(100, v)); }
    public String name() { return "TV"; }
}
class Radio implements Device {
    private boolean on; private int vol = 5;
    public boolean isOn() { return on; } public void power(boolean b) { on = b; }
    public int volume() { return vol; } public void volume(int v) { vol = Math.max(0, Math.min(30, v)); }    // smaller range
    public String name() { return "Radio"; }
}
class RemoteControl {
    protected final Device d;
    RemoteControl(Device d) { this.d = d; }
    void togglePower() { d.power(!d.isOn()); }
    void volumeUp() { d.volume(d.volume() + 10); }
    String status() { return d.name() + (d.isOn() ? " on" : " off") + " vol=" + d.volume(); }
}
class AdvancedRemote extends RemoteControl {
    private Integer saved;
    AdvancedRemote(Device d) { super(d); }
    void mute() { if (saved == null) { saved = d.volume(); d.volume(0); } else { d.volume(saved); saved = null; } }
}

AdvancedRemote r = new AdvancedRemote(new Tv());
r.togglePower(); r.volumeUp(); r.mute(); System.out.println(r.status());
r.mute(); System.out.println(r.status());
RemoteControl basic = new RemoteControl(new Radio());
basic.togglePower(); basic.volumeUp(); basic.volumeUp(); basic.volumeUp(); System.out.println(basic.status());` },
      { level: "Medium", q: "A payments team has instruments (Card, UPI, NetBanking, Wallet) and processors (Razorpay, PayU, Cashfree). Each instrument has its own validation and flow; each processor has its own API. Sketch a Bridge, and say where Adapter fits in.",
        a: ["Abstraction: `PaymentInstrument` with `pay(Money)`; refined: `CardPayment` (validate Luhn, 3DS step), `UpiPayment` (VPA format, collect request), `NetBankingPayment`, `WalletPayment`.",
          "Implementor: `Processor` with primitives `createOrder(amount)`, `authorize(orderId, instrumentDetails)`, `capture(id)`, `status(id)`.",
          "Concrete implementors: `RazorpayProcessor`, `PayUProcessor`, `CashfreeProcessor`, each an **Adapter** over the vendor SDK.",
          "Any instrument works with any processor; a routing strategy (F17) picks the processor per transaction.",
          "Unsupported pairs (a processor without wallets) are declared via `supports(InstrumentType)` and checked by the router, not with `instanceof`."],
        m: H.cd(["classDiagram", "  direction LR",
          "  class PaymentInstrument { <<abstract>>; #Processor processor; +pay(long paise) PaymentResult }",
          "  class Processor { <<interface>>; +createOrder(long paise) String; +authorize(String orderId, Map details) String; +capture(String id); +supports(String type) boolean }",
          "  PaymentInstrument <|-- CardPayment", "  PaymentInstrument <|-- UpiPayment", "  PaymentInstrument <|-- WalletPayment",
          "  PaymentInstrument o-- Processor : bridge",
          "  Processor <|.. RazorpayProcessor", "  Processor <|.. PayUProcessor", "  Processor <|.. CashfreeProcessor"]) },
      { level: "Medium", q: "Refactor this class explosion into a Bridge: `PdfInvoice`, `PdfReceipt`, `HtmlInvoice`, `HtmlReceipt` (and `CsvInvoice` is coming).",
        code: `interface Format { String heading(String s); String line(String k, String v); }
class Html implements Format {
    public String heading(String s) { return "<h1>" + s + "</h1>"; }
    public String line(String k, String v) { return "<p><b>" + k + "</b> " + v + "</p>"; }
}
class Plain implements Format {
    public String heading(String s) { return s.toUpperCase() + "\\n" + "=".repeat(s.length()); }
    public String line(String k, String v) { return k + ": " + v; }
}
abstract class Doc {
    protected final Format f; Doc(Format f) { this.f = f; }
    abstract String render();
}
class Invoice extends Doc {
    Invoice(Format f) { super(f); }
    String render() { return String.join("\\n", f.heading("Invoice INV-7"), f.line("GSTIN", "27ABCDE1234F1Z5"), f.line("Total", "₹1,180")); }
}
class Receipt extends Doc {
    Receipt(Format f) { super(f); }
    String render() { return String.join("\\n", f.heading("Receipt"), f.line("Paid", "₹1,180 via UPI")); }
}

System.out.println(new Invoice(new Plain()).render());
System.out.println(new Receipt(new Html()).render());`,
        follow: "Adding CSV (or PDF) is now one `Format` class, and every document type gets it." },
      { level: "Medium", q: "When would you NOT use Bridge for notifications × channels, even though there are two dimensions?",
        a: ["If kinds don't actually differ in behaviour (only the text changes), a single `Notification` record with a template and a `Channel` interface is enough: that's just Strategy/DI, no refined abstractions.",
          "If each kind × channel pair has unique logic (marketing via WhatsApp needs template approval, alerts via voice need a call script), the dimensions aren't orthogonal; explicit per-pair handlers or a table of handlers may be clearer.",
          "If only one channel exists and none is planned, skip the abstraction until the second one arrives."] },
      { level: "Hard", q: "Design a cross-platform media player: players (`BasicPlayer`, `PlaylistPlayer`, `PodcastPlayer` with speed control) and audio backends (Android `MediaPlayer`, iOS `AVPlayer`, a web `<audio>` backend). Define the implementor primitives carefully.",
        a: ["Implementor `AudioBackend`: `load(uri)`, `play()`, `pause()`, `seek(ms)`, `positionMs()`, `setRate(float)`, `onEvent(listener)` (ended, buffering, error). Keep it small and **sufficient**.",
          "Abstraction `Player` holds an `AudioBackend`; implements `play(track)`, `pause()`, `resume()` using primitives.",
          "`PlaylistPlayer` adds queue, shuffle and auto-advance on the `ended` event; `PodcastPlayer` adds skip ±30 s and speed, using `seek` and `setRate`.",
          "If a backend lacks `setRate`, expose `capabilities()` from the implementor and degrade gracefully (hide the speed button) rather than `instanceof`.",
          "Backends are adapters over each platform API; choose one with a factory at startup (Abstract Factory per platform)."],
        m: H.cd(["classDiagram",
          "  class Player { #AudioBackend backend; +play(Track t); +pause(); +resume() }",
          "  class PlaylistPlayer { -Deque~Track~ queue; +next(); +shuffle() }",
          "  class PodcastPlayer { +skip(int seconds); +speed(float rate) }",
          "  class AudioBackend { <<interface>>; +load(String uri); +play(); +pause(); +seek(long ms); +positionMs() long; +setRate(float r); +capabilities() Set }",
          "  Player <|-- PlaylistPlayer", "  Player <|-- PodcastPlayer",
          "  Player o-- AudioBackend : bridge",
          "  AudioBackend <|.. AndroidBackend", "  AudioBackend <|.. IosBackend", "  AudioBackend <|.. WebAudioBackend"]) },
      { level: "Hard", q: "Explain how JDBC is a Bridge, and why that design lets a 20-year-old DAO run unchanged on a new database.",
        a: ["Abstraction: the JDBC API your code uses: `Connection`, `PreparedStatement`, `ResultSet` (interfaces), obtained via `DriverManager` or a `DataSource`.",
          "Implementor: each vendor's `Driver` and its concrete `Connection`/`Statement` classes.",
          "Your DAO depends only on the API; switching from Oracle to Postgres means changing the driver JAR and URL (plus SQL dialect differences, which JDBC doesn't hide).",
          "Both sides evolved independently for decades: JDBC added features (batch updates, `try-with-resources`, `getObject(i, Class)`), vendors shipped new drivers.",
          "Talking point: the bridge separates *what* (the API contract) from *how* (wire protocol, auth, type mapping)."] },
      { level: "Hard", q: "Your Bridge for `Shape × Renderer` must now support a 3D renderer that can't draw arcs precisely but can tessellate. How do you evolve the implementor without breaking existing renderers?",
        a: ["Add a new primitive with a **default method** on the implementor interface: `default void polyline(List<Point> pts) { for each segment: line(...) }`; existing renderers inherit it.",
          "Rewrite `Circle.draw()` to call `polyline(tessellate(r, n))` only when the renderer reports `!supports(ARC)`, or always use `arc()` with a default implementation that tessellates.",
          "Default methods on the implementor are the Java tool for evolving bridges compatibly.",
          "Add a contract test that every renderer must pass (draw the standard shapes, compare output)."] }
    ],
    recap: [
      "Bridge = split an abstraction hierarchy from an implementation hierarchy and link them by composition, so both vary independently.",
      "It turns m × n subclasses into m + n classes; worth it when both dimensions will grow.",
      "The hard part is the implementor's primitive set: sufficient, small, and free of platform leaks.",
      "Real bridges: JDBC API + drivers, SLF4J + bindings, JUL `Handler` + `Formatter`, Spring transaction managers.",
      "Bridge vs Strategy: same shape, bigger scope. Bridge vs Adapter: designed up front vs retrofitted."
    ]
  });
})();
