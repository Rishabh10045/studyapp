/* 30-day plan page: today highlight (Asia/Kolkata), per-block checkboxes in localStorage (plan.* keys), progress and week summaries. */
(function () {
  "use strict";
  var P = window.PLAN, DAYS = P.days, WEEKS = P.weeks;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function get(k, d) { try { var v = localStorage.getItem("plan." + k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { if (v === null) localStorage.removeItem("plan." + k); else localStorage.setItem("plan." + k, v); } catch (e) { /* storage blocked */ } }
  function ck(d, i) { return "check." + d + "." + i; }
  function isDone(d, i) { return get(ck(d, i), "") === "1"; }

  function todayStr() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: P.tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { var n = new Date(Date.now() + 330 * 60000); return n.toISOString().slice(0, 10); }
  }
  var TODAY = todayStr();
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmt(s) { var p = s.split("-"); return +p[2] + " " + MON[+p[1] - 1]; }
  function hrs(m) { return (m / 60).toFixed(m % 60 ? 1 : 0) + " h"; }
  var TYPE = { dsa: "DSA", core: "Core lesson", design: "Design lesson", hands: "Hands-on", rev: "Revision", mc: "Machine coding", hld: "HLD design", mock: "Mock", notes: "Notes", weekly: "Weekly revision", project: "Project", fde: "FDE case", gap: "Gap-filling" };
  var READY = { HLD: window.HLD_READY || [], LLD: window.LLD_READY || [], Java: window.JAVA_READY || [] };
  function startMin(d) { var v = get(d.weekend ? "start.weekend" : "start.weekday", d.weekend ? "10:00" : "19:00"); var p = v.split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
  function clock(m) { m = ((m % 1440) + 1440) % 1440; return ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + m % 60).slice(-2); }

  function linkHtml(l) {
    var soon = l.k === "lesson" && READY[l.track].indexOf(l.code) < 0;
    return "<a href='" + esc(l.h) + "'>" + esc(l.t) + "</a>" + (soon ? " <span class='soon'>(not written yet)</span>" : "");
  }
  function dayTable(d) {
    var t = startMin(d), rows = d.blocks.map(function (b, i) {
      var from = t; t += b.min + 5; var done = isDone(d.date, i);
      return "<tr class='" + (done ? "done" : "") + "'><td><input type='checkbox' data-d='" + d.date + "' data-i='" + i + "'" + (done ? " checked" : "") + " aria-label='Mark " + esc(b.title) + " done'></td>" +
        "<td class='when'>" + clock(from) + "–" + clock(from + b.min) + "<br><span style='color:var(--text-3)'>" + b.min + " min</span></td>" +
        "<td><span class='pill t-" + b.type + "'>" + esc(TYPE[b.type] || b.type) + "</span></td>" +
        "<td><div class='bt'>" + esc(b.title) + "</div><div class='bd'>" + esc(b.detail) + "</div>" + (b.links.length ? "<div class='bl'>" + b.links.map(linkHtml).join("") + "</div>" : "") + "</td></tr>";
    }).join("");
    return "<div class='tablewrap blk'><table><thead><tr><th></th><th>Time</th><th>Block</th><th>What to do</th></tr></thead><tbody>" + rows + "</tbody></table></div>" + (d.note ? "<p class='caption' style='margin-top:8px'>" + esc(d.note) + "</p>" : "");
  }
  function dayDone(d) { var n = 0; d.blocks.forEach(function (b, i) { if (isDone(d.date, i)) n++; }); return n; }
  function dayPill(d) { var n = dayDone(d); return n === d.blocks.length ? "<span class='pill success'>Done</span>" : n ? "<span class='pill accent'>" + n + " / " + d.blocks.length + "</span>" : d.date < TODAY ? "<span class='pill warning'>Missed</span>" : ""; }

  function renderToday() {
    var d = DAYS.filter(function (x) { return x.date === TODAY; })[0];
    if (d) {
      $("today-caption").textContent = "Day " + d.n + " of 30 · " + d.wd + " " + fmt(d.date) + " · " + hrs(d.min) + " (date in India time).";
      $("today-card").innerHTML = "<div class='callout info' style='margin-bottom:12px'><span class='lead'>Focus:</span>" + esc(d.focus) + "</div>" + dayTable(d);
    } else if (TODAY < P.start) {
      $("today-caption").textContent = "The plan starts on " + fmt(P.start) + ".";
      $("today-card").innerHTML = "<div class='callout'>Nothing scheduled yet. Day 1 is shown first in Day by day.</div>";
    } else {
      $("today-caption").textContent = "The plan ended on " + fmt(P.end) + ".";
      $("today-card").innerHTML = "<div class='callout success'><span class='lead'>All 30 days are behind you.</span>Keep doing a daily DSA set and one mock a week until your interviews.</div>";
    }
  }
  function renderProgress() {
    var tb = 0, db = 0, tm = 0, dm = 0, dd = 0;
    DAYS.forEach(function (d) { var all = true; d.blocks.forEach(function (b, i) { tb++; tm += b.min; if (isDone(d.date, i)) { db++; dm += b.min; } else all = false; }); if (all) dd++; });
    var left = DAYS.filter(function (d) { return d.date >= TODAY; }).length;
    $("metrics").innerHTML = [[Math.round(100 * dm / tm) + "%", "Plan done (by time)"], [dd + " / 30", "Days complete"], [db + " / " + tb, "Blocks done"], [hrs(dm) + " / " + hrs(tm), "Hours done"], [left, "Days left incl. today"]]
      .map(function (m) { return "<div class='metric'><div class='v'>" + m[0] + "</div><div class='l'>" + m[1] + "</div></div>"; }).join("");
    function bar(label, done, total) { var p = total ? 100 * done / total : 0; return "<div class='bar'><span>" + esc(label) + "</span><div class='track'><div class='fill' style='width:" + p.toFixed(1) + "%'></div></div><span class='val'>" + Math.round(p) + "%</span></div>"; }
    var html = bar("Whole plan", dm, tm);
    WEEKS.forEach(function (w) { var a = 0, b = 0; DAYS.forEach(function (d) { if (d.week !== w.n) return; d.blocks.forEach(function (x, i) { b += x.min; if (isDone(d.date, i)) a += x.min; }); }); html += bar("Week " + w.n + " · " + fmt(w.from) + "–" + fmt(w.to), a, b); });
    $("bars").innerHTML = html;
  }
  function renderWeeks() {
    $("week-cards").innerHTML = WEEKS.map(function (w) {
      var cur = TODAY >= w.from && TODAY <= w.to;
      return "<div class='card wk" + (cur ? " cur" : "") + "'><h3>Week " + w.n + " · " + fmt(w.from) + " – " + fmt(w.to) + (cur ? " <span class='pill accent'>This week</span>" : "") + "</h3><p class='caption'>" + w.days + " days · " + hrs(w.min) + "</p><p style='font-weight:600;margin-bottom:8px'>" + esc(w.theme) + "</p><ul>" + w.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>";
    }).join("");
  }
  var VIEWS = [["all", "All 30 days"], ["week", "This week"], ["left", "Remaining"]];
  function curWeek() { var w = WEEKS.filter(function (w) { return TODAY >= w.from && TODAY <= w.to; })[0]; return w ? w.n : (TODAY < P.start ? 1 : WEEKS.length); }
  function renderDays() {
    var v = get("view", "all");
    $("view").innerHTML = VIEWS.map(function (x) { return "<button type='button' data-v='" + x[0] + "' class='" + (x[0] === v ? "on" : "") + "'>" + x[1] + "</button>"; }).join("");
    var list = DAYS.filter(function (d) { return v === "all" || (v === "week" && d.week === curWeek()) || (v === "left" && d.date >= TODAY); });
    var html = "", wk = 0;
    list.forEach(function (d) {
      if (d.week !== wk) { wk = d.week; var w = WEEKS[wk - 1]; html += "<h3 style='margin:22px 0 8px'>Week " + wk + ": " + esc(w.theme) + "</h3>"; }
      var cls = "day" + (d.date === TODAY ? " today" : "") + (d.date < TODAY ? " past" : "");
      html += "<details class='" + cls + "' id='d-" + d.date + "'" + (d.date === TODAY ? " open" : "") + "><summary><span class='dn'>Day " + d.n + "</span><span class='dt'>" + d.wd.slice(0, 3) + " " + fmt(d.date) + "</span>" +
        "<span class='pill" + (d.weekend ? " accent" : "") + "'>" + hrs(d.min) + "</span>" + (d.date === TODAY ? "<span class='pill accent'>Today</span>" : "") + dayPill(d) + "<span class='fc'>" + esc(d.focus) + "</span></summary><div class='body'>" + dayTable(d) + "</div></details>";
    });
    $("day-list").innerHTML = html || "<p class='caption'>No days in this view.</p>";
  }
  function renderAll() { renderToday(); renderProgress(); renderWeeks(); renderDays(); }

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.matches && t.matches("input[type=checkbox][data-d]")) {
      set(ck(t.getAttribute("data-d"), t.getAttribute("data-i")), t.checked ? "1" : null);
      var open = Array.prototype.map.call(document.querySelectorAll("#day-list details[open]"), function (x) { return x.id; });
      renderAll();
      open.forEach(function (id) { var el = document.getElementById(id); if (el) el.open = true; });
    }
  });
  $("view").addEventListener("click", function (e) { var b = e.target.closest("button[data-v]"); if (b) { set("view", b.getAttribute("data-v")); renderDays(); } });
  $("start-wd").value = get("start.weekday", "19:00"); $("start-we").value = get("start.weekend", "10:00");
  $("start-wd").addEventListener("change", function () { set("start.weekday", this.value || null); renderAll(); });
  $("start-we").addEventListener("change", function () { set("start.weekend", this.value || null); renderAll(); });
  $("jump").addEventListener("click", function () {
    var id = "d-" + (TODAY < P.start ? P.start : TODAY > P.end ? P.end : TODAY), el = document.getElementById(id);
    if (!el) { set("view", "all"); renderDays(); el = document.getElementById(id); }
    if (el) { el.open = true; el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  $("reset").addEventListener("click", function () {
    if (!window.confirm("Clear all ticked blocks in the daily plan?")) return;
    DAYS.forEach(function (d) { d.blocks.forEach(function (b, i) { set(ck(d.date, i), null); }); });
    renderAll();
  });
  renderAll();
})();
