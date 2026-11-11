# HLD Study: System Design Teaching App + Roadmap

A static, zero-build study site for learning system design (High-Level Design).

- **Teaching App** (`index.html`): a lesson player. The sidebar lists all 45 roadmap topics in order. Lesson 1 (F01 Scalability) is fully written:
  - 10 step-by-step slides (Next/Back, arrow keys, step dots); the architecture diagrams grow from a single server to a sharded database
  - a traffic simulator (pick an architecture, drag the users slider, see what breaks first)
  - real-world examples, common interview pitfalls, an 8-question quiz with instant feedback, an interview practice question with a model answer you reveal, and a 5-line recap
- **Roadmap hub** (`roadmap.html`): 27 fundamentals in 6 phases and 18 classic design problems by difficulty. It has:
  - filters, search and a "hide done" toggle
  - a progress tracker you can tick
  - the interview framework, a generic scalable web architecture diagram, a cache-aside sequence, a consistent-hashing ring and an estimation cheat sheet

Progress (done topics), the current lesson and slide, simulator settings, quiz answers and roadmap filters are saved in your browser's `localStorage`. Both pages share the same progress. Clearing site data resets it.

**Live site:** https://rishabh10045.github.io/studyapp/

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
| `assets/data.js` | Shared topic data, progress storage and diagram helpers |
| `assets/app.js` | Teaching App logic: slides, simulator, quiz, practice |
| `assets/roadmap.js` | Roadmap logic: filters, search, progress, charts |
| `assets/style.css` | Styles, with light and dark mode following the OS setting |
| `favicon.svg` | Site icon |
| `lld/` | Low-Level Design (LLD) companion app: its own Teaching App, Roadmap and Interview Questions (`lld/roadmap.html`); progress uses separate `lld.*` localStorage keys |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## Dependencies

- [Mermaid](https://mermaid.js.org/) **11.4.1**, pinned and loaded from jsDelivr, draws the flowcharts and the sequence diagram. If it fails to load, each diagram falls back to its text source.
- There is no build step, no framework and no other dependencies.

## Deploy to GitHub Pages

1. Push these files to the root of the default branch of `Rishabh10045/studyapp`.
2. In the repo, go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch**, then pick the branch and `/ (root)`.
3. The site appears at https://rishabh10045.github.io/studyapp/ after a minute or two.

## Adding lessons

Lesson content for F01 lives in `assets/app.js` (`SLIDES`, `STAGES`, `QUIZ`). The markup is in `index.html`. To mark another lesson as written, add its topic id to `READY` in `assets/app.js`.
