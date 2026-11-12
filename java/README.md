# Java Study

A static, zero-build study app for Java 17/21 interviews and day-to-day work, built in the same style as the LLD and HLD study apps.

- **Teaching App** (`index.html`): lesson player with step-by-step slides (Mermaid diagrams, runnable Java, analogies, tables), an interactive widget, real-world examples, pitfalls, a quiz, a cheat sheet, 8+ practice questions with collapsible model answers and a recap. Unwritten lessons show as locked ("🔒 Soon").
- **Roadmap** (`roadmap.html`): 60 lessons in 12 modules on two tracks: the **Java track** (J01–J36, including a 13-lesson multithreading deep dive and JVM/GC) and the **Spring Boot track** (S01–S24, ending with a Spring AI module). Progress, explorer, interview priorities, a 12-week study plan, a JVM diagram and Java versions.
- **VIP Java Interview Questions** (`interview.html`): searchable, filterable bank with bookmarks and done marks; grows with each lesson (100+ planned). "Frequently asked" is a general tag, never a claim about a company.
- **FDE Roadmap** (`fde.html`): what Forward Deployed Engineer roles involve (cited public postings), a skills self-assessment, a 16-week plan linked to HLD/LLD/Java/Spring lessons, project ideas and interview-loop practice.

## Written lessons

| Code | Lesson | Covers | Widget |
| --- | --- | --- | --- |
| J01 | Java basics & JDK/JRE/JVM | JDK ⊃ JRE ⊃ JVM, program anatomy, javac → bytecode → java, javap, class loading & init order, interpreter + JIT tiers, memory areas, args & exit codes, classpath/JARs/modules, LTS releases 8–25, jcmd/JFR toolkit, portability | Step a program through the JVM pipeline (7 scenarios incl. failures) |
| J02 | Data types & memory | 8 primitives vs references, numeric traps & BigDecimal, stack vs heap, pass-by-value, wrappers/autoboxing & Integer cache, defaults/var/final, String immutability & pool, StringBuilder vs + vs StringBuffer, String API 11–21, object sizes, reachability & leaks | Run 10 lines and watch stack/heap, String pool and Integer cache with ==/equals results |

## Merge notes

- Designed to drop into the combined study site as `java/` next to the HLD app (root) and `lld/`.
- All paths are relative; links to HLD (`../index.html#lesson=…`) and LLD (`../lld/index.html#lesson=…`) resolve only in the combined site.
- Global namespace `window.JAVA` (`JAVA_READY`, `JAVA_IQ`); localStorage keys: `java.done.v1`, `java.app.state.v1`, `java.roadmap.filters.v1`, `java.interview.v1`, `java.fde.v1`.

## Open locally

```
python3 -m http.server 8780   # then open http://localhost:8780/
```

Mermaid 11.4.1 loads from jsDelivr; everything else is local.
