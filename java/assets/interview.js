/* VIP interview question bank page: filters, search, collapsible model answers, bookmarks and done state.
   State lives in localStorage under "java.interview.v1" so it never collides with the HLD/LLD apps on the same origin. */
(function () {
  "use strict";
  var H = window.JAVA, esc = H.esc, md = H.md, QS = window.JAVA_IQ || [];
  var KEY = "java.interview.v1";
  /* Each question has a section (s) and a topic (g); sections appear in data-file order. */
  var SEC_OF = {}, SECTIONS = ["All"];
  QS.forEach(function (q) { var sec = q.s || q.g; SEC_OF[q.g] = sec; if (SECTIONS.indexOf(sec) < 0) SECTIONS.push(sec); });
  function sectionOf(g) { return SEC_OF[g] || g; }
  var DEF = { section: "All", group: "", level: "", q: "", faq: false, bm: false, hide: false };
  var st = H.load(KEY, null) || {};
  st.bm = st.bm || {}; st.done = st.done || {};
  st.filters = Object.assign({}, DEF, st.filters || {});
  var F = st.filters, openIds = {};
  function persist() { H.save(KEY, { bm: st.bm, done: st.done, filters: F }); }
  function $(id) { return document.getElementById(id); }

  /* Group order follows the data file. */
  var GROUPS = [];
  QS.forEach(function (q) { if (GROUPS.indexOf(q.g) < 0) GROUPS.push(q.g); });

  $("iq-summary").textContent = QS.length + " questions with model answers so far across " + (SECTIONS.length - 1) + " sections (the bank grows with each published lesson; 100+ planned). " +
    QS.filter(function (q) { return q.faq; }).length + " are tagged frequently asked and " + QS.filter(function (q) { return q.code; }).length + " include Java code.";

  function lessonLink(c) {
    if (!c) return "";
    var t = H.byCode(c);
    if (!t) return "";
    return H.isReady(c) ? "<a href='index.html#lesson=" + c + "'>Study lesson " + c + " · " + esc(t.name) + " →</a>" : "<span style='color:var(--text-3)'>Lesson " + c + " · " + esc(t.name) + " (coming soon)</span>";
  }
  function lvPill(lv) { return "<span class='pill " + (lv === "Easy" ? "success" : lv === "Medium" ? "warning" : "danger") + "'>" + lv + "</span>"; }

  function matches(q) {
    if (F.section !== "All" && sectionOf(q.g) !== F.section) return false;
    if (F.group && q.g !== F.group) return false;
    if (F.level && q.lv !== F.level) return false;
    if (F.faq && !q.faq) return false;
    if (F.bm && !st.bm[q.id]) return false;
    if (F.hide && st.done[q.id]) return false;
    if (F.q) {
      var hay = (q.g + " " + q.q + " " + q.a.join(" ") + " " + (q.code || "")).toLowerCase();
      var words = F.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
    }
    return true;
  }

  function drawMetrics() {
    var done = QS.filter(function (q) { return st.done[q.id]; }).length, bm = QS.filter(function (q) { return st.bm[q.id]; }).length;
    var faqDone = QS.filter(function (q) { return q.faq && st.done[q.id]; }).length, faq = QS.filter(function (q) { return q.faq; }).length;
    $("iq-metrics").innerHTML = [[QS.length, "Questions"], [done + " / " + QS.length, "Done"], [faqDone + " / " + faq, "Frequently asked done"], [bm, "Bookmarked"]]
      .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
  }

  function drawControls() {
    $("iq-section").innerHTML = SECTIONS.map(function (s) {
      var n = s === "All" ? QS.length : QS.filter(function (q) { return sectionOf(q.g) === s; }).length;
      return "<button type='button' data-s='" + esc(s) + "' class='" + (F.section === s ? "on" : "") + "'>" + esc(s) + "<span class='count'>" + n + "</span></button>";
    }).join("");
    var gs = GROUPS.filter(function (g) { return F.section === "All" || sectionOf(g) === F.section; });
    if (F.group && gs.indexOf(F.group) < 0) F.group = "";
    $("iq-group").innerHTML = "<option value=''>All topics</option>" + gs.map(function (g) {
      return "<option value='" + esc(g) + "'" + (F.group === g ? " selected" : "") + ">" + esc(g) + " (" + QS.filter(function (q) { return q.g === g; }).length + ")</option>";
    }).join("");
    $("iq-level").value = F.level; $("iq-q").value = F.q;
    $("iq-faq").checked = F.faq; $("iq-bm").checked = F.bm; $("iq-hide").checked = F.hide;
  }

  function body(q) {
    var h = "<div class='lbl'>Model answer</div><ul>" + q.a.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul>";
    if (q.code) h += "<div class='lbl'>Java</div>" + H.codeBlock(q.code, "java");
    if (q.m) h += "<div class='lbl'>Class-diagram outline</div><div class='diagram iq-mmd' data-id='" + q.id + "'></div>";
    var link = lessonLink(q.l);
    if (link) h += "<p style='margin:12px 0 0'>" + link + "</p>";
    return h;
  }
  function item(q) {
    return "<details class='topic" + (st.done[q.id] ? " done" : "") + "' data-id='" + q.id + "'" + (openIds[q.id] ? " open" : "") + "><summary>" +
      "<span class='iq-id'>" + q.id.toUpperCase() + "</span><span class='iq-q'>" + md(q.q) + "</span>" + lvPill(q.lv) + (q.faq ? "<span class='pill accent'>Frequently asked</span>" : "") +
      "<span class='iq-actions'><button type='button' data-bm='" + q.id + "' class='" + (st.bm[q.id] ? "on" : "") + "' aria-label='Bookmark' title='Bookmark'>" + (st.bm[q.id] ? "★" : "☆") + "</button>" +
      "<button type='button' data-done='" + q.id + "' class='" + (st.done[q.id] ? "on" : "") + "' title='Mark done'>✓ " + (st.done[q.id] ? "Done" : "Mark done") + "</button></span>" +
      "</summary><div class='body iq-body'>" + (openIds[q.id] ? body(q) : "") + "</div></details>";
  }
  var BY = {}; QS.forEach(function (q) { BY[q.id] = q; });
  function fill(det) {
    var q = BY[det.getAttribute("data-id")], b = det.querySelector(".iq-body");
    if (!b.innerHTML) b.innerHTML = body(q);
    var d = b.querySelector(".iq-mmd");
    if (d && !d.getAttribute("data-done")) { d.setAttribute("data-done", "1"); H.renderDiagram(d, Array.isArray(q.m) ? H.cd(q.m) : q.m); }
  }

  function drawList() {
    var shown = QS.filter(matches);
    $("iq-count").textContent = "Showing " + shown.length + " of " + QS.length + " questions.";
    if (!shown.length) { $("iq-list").innerHTML = "<p>No questions match these filters. <button class='btn' type='button' id='iq-reset2'>Reset filters</button></p>"; $("iq-reset2").onclick = reset; return; }
    var html = "";
    GROUPS.forEach(function (g) {
      var qs = shown.filter(function (q) { return q.g === g; });
      if (!qs.length) return;
      html += "<div class='iq-group'><h3>" + esc(g) + "<span class='count'>" + qs.length + "</span></h3>" + qs.map(item).join("") + "</div>";
    });
    $("iq-list").innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll("#iq-list details[open]"), fill);
  }
  function drawAll() { drawControls(); drawMetrics(); drawList(); persist(); }
  function reset() { F = st.filters = Object.assign({}, DEF); drawAll(); }

  $("iq-section").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-s]"); if (!b) return;
    F.section = b.getAttribute("data-s"); F.group = ""; drawAll();
  });
  $("iq-group").addEventListener("change", function (e) { F.group = e.target.value; drawAll(); });
  $("iq-level").addEventListener("change", function (e) { F.level = e.target.value; drawAll(); });
  $("iq-q").addEventListener("input", function (e) { F.q = e.target.value; drawMetrics(); drawList(); persist(); });
  [["iq-faq", "faq"], ["iq-bm", "bm"], ["iq-hide", "hide"]].forEach(function (p) {
    $(p[0]).addEventListener("change", function (e) { F[p[1]] = e.target.checked; drawAll(); });
  });
  $("iq-reset").addEventListener("click", reset);
  $("iq-clear").addEventListener("click", function () {
    if (!window.confirm("Clear all done marks and bookmarks on this page?")) return;
    st.bm = {}; st.done = {}; drawAll();
  });
  $("iq-expand").addEventListener("click", function () {
    Array.prototype.forEach.call(document.querySelectorAll("#iq-list details"), function (d) { openIds[d.getAttribute("data-id")] = true; d.open = true; fill(d); });
  });
  $("iq-collapse").addEventListener("click", function () {
    openIds = {}; Array.prototype.forEach.call(document.querySelectorAll("#iq-list details"), function (d) { d.open = false; });
  });
  $("iq-list").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-bm],button[data-done]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var id = b.getAttribute("data-bm") || b.getAttribute("data-done"), map = b.hasAttribute("data-bm") ? st.bm : st.done;
    if (map[id]) delete map[id]; else map[id] = true;
    drawMetrics(); drawList(); persist();
  });
  $("iq-list").addEventListener("toggle", function (e) {
    var d = e.target; if (!d.matches || !d.matches("details.topic")) return;
    var id = d.getAttribute("data-id");
    if (d.open) { openIds[id] = true; fill(d); } else delete openIds[id];
  }, true);

  /* Deep link: interview.html#q12 opens that question (on load and on hash change). */
  function openHash() {
    var m = /^#(q\d+)$/.exec(location.hash);
    if (!m || !BY[m[1]]) return false;
    F = st.filters = Object.assign({}, DEF); openIds = {}; openIds[m[1]] = true;
    drawAll();
    var el = document.querySelector("details[data-id='" + m[1] + "']"); if (el) el.scrollIntoView();
    return true;
  }
  window.addEventListener("hashchange", openHash);
  if (!openHash()) drawAll();
})();
