/* Lesson J30: Garbage collection: generations, G1, ZGC */
(function () {
  "use strict";
  var H = window.JAVA, M = H.M;

  // Recorded on JDK 21 (8 cores): Churn.java keeps ~120 MB of long-lived byte[200] arrays, replaces 1 in 8 of them while
  // allocating 80 million short-lived arrays. Each collector ran with -Xms = -Xmx (640m or 320m) and -Xlog:gc
  // (ZGC: generational, -Xlog:gc,gc+phases). run = ms for the allocation loop; hiccup = worst lateness (ms) of a thread
  // sleeping 1 ms in a loop (jHiccup-style); pauses = [uptime s, kind, ms] parsed from the log; cycles = ZGC
  // concurrent collections and allocation stalls.
  var REC = {"Serial|640m": {"run": 1876, "hiccup": 187.27, "pauses": [[0.203, "Young", 94.153], [0.364, "Young", 116.965], [0.509, "Young", 108.655], [0.648, "Young", 107.382], [0.684, "Young", 0.023], [0.872, "Full", 187.937], [0.99, "Young", 77.699], [1.101, "Young", 79.503], [1.223, "Young", 91.749], [1.254, "Young", 0.022], [1.437, "Full", 182.067], [1.547, "Young", 73.914], [1.654, "Young", 76.049], [1.759, "Young", 75.4], [1.789, "Young", 0.032], [1.956, "Full", 167.72]], "kinds": {"Young": 13, "Full": 3}, "cycles": {}, "total": 1439.3, "max": 187.937, "samples": ["[0.203s] GC(0) Pause Young (Allocation Failure) 171M->127M(618M) 94.153ms", "[0.364s] GC(1) Pause Young (Allocation Failure) 297M->202M(618M) 116.965ms", "[0.509s] GC(2) Pause Young (Allocation Failure) 373M->279M(618M) 108.655ms", "[0.872s] GC(5) Pause Full (Allocation Failure) 526M->148M(618M) 187.937ms"]}, "Parallel|640m": {"run": 708, "hiccup": 57.769, "pauses": [[0.115, "Young", 26.374], [0.172, "Young", 21.563], [0.224, "Young", 20.899], [0.276, "Young", 20.894], [0.327, "Young", 20.568], [0.413, "Full", 57.724], [0.436, "Young", 8.385], [0.457, "Young", 9.103], [0.475, "Young", 8.092], [0.492, "Young", 8.123], [0.507, "Young", 6.261], [0.531, "Young", 14.602], [0.546, "Young", 6.23], [0.561, "Young", 7.104], [0.577, "Young", 6.944], [0.629, "Full", 43.672], [0.649, "Young", 5.786], [0.676, "Young", 16.611], [0.694, "Young", 7.632], [0.711, "Young", 6.937], [0.728, "Young", 6.887], [0.745, "Young", 7.872], [0.764, "Young", 7.994], [0.782, "Young", 8.087]], "kinds": {"Young": 22, "Full": 2}, "cycles": {}, "total": 354.3, "max": 57.724, "samples": ["[0.115s] GC(0) Pause Young (Allocation Failure) 161M->129M(613M) 26.374ms", "[0.172s] GC(1) Pause Young (Allocation Failure) 289M->196M(613M) 21.563ms", "[0.224s] GC(2) Pause Young (Allocation Failure) 356M->270M(613M) 20.899ms", "[0.413s] GC(5) Pause Full (Ergonomics) 578M->127M(524M) 57.724ms"]}, "G1|640m": {"run": 822, "hiccup": 30.326, "pauses": [[0.051, "Young", 5.702], [0.059, "Young", 4.11], [0.066, "Young", 4.962], [0.072, "Young", 3.57], [0.091, "Young", 3.129], [0.111, "Young", 5.117], [0.141, "Young", 9.193], [0.177, "Young", 11.526], [0.224, "Young", 14.869], [0.257, "Young", 10.432], [0.284, "Remark", 0.958], [0.298, "Young", 10.932], [0.323, "Young", 7.457], [0.331, "Cleanup", 0.247], [0.344, "Young", 4.349], [0.358, "Young", 2.948], [0.375, "Young", 3.943], [0.393, "Young", 4.447], [0.413, "Young", 5.518], [0.435, "Young", 6.211], [0.452, "Young", 4.703], [0.468, "Young", 3.239], [0.477, "Remark", 0.568], [0.482, "Young", 3.012], [0.493, "Young", 3.152], [0.495, "Young", 1.205], [0.524, "Full", 29.125], [0.599, "Young", 13.166], [0.652, "Young", 12.455], [0.697, "Young", 11.504], [0.732, "Young", 9.416], [0.751, "Remark", 1.056], [0.767, "Young", 7.038], [0.789, "Young", 5.857], [0.793, "Cleanup", 0.21], [0.804, "Young", 4.819], [0.813, "Young", 2.745], [0.828, "Young", 4.632], [0.846, "Young", 5.041], [0.866, "Young", 5.656], [0.887, "Young", 6.216]], "kinds": {"Young": 35, "Remark": 3, "Cleanup": 2, "Full": 1}, "cycles": {}, "total": 254.4, "max": 29.125, "samples": ["[0.051s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 36M->35M(640M) 5.702ms", "[0.059s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 63M->64M(640M) 4.110ms", "[0.066s] GC(2) Pause Young (Normal) (G1 Evacuation Pause) 92M->93M(640M) 4.962ms", "[0.524s] GC(25) Pause Full (G1 Compaction Pause) 640M->128M(640M) 29.125ms"]}, "ZGC|640m": {"run": 1139, "hiccup": 0.436, "pauses": [[0.12, "Mark Start", 0.017], [0.132, "Mark End", 0.01], [0.136, "Relocate Start", 0.01], [0.137, "Mark End", 0.006], [0.146, "Relocate Start", 0.008], [0.152, "Mark Start", 0.008], [0.174, "Mark End", 0.008], [0.184, "Relocate Start", 0.009], [0.195, "Mark End", 0.01], [0.205, "Relocate Start", 0.01], [0.249, "Mark Start", 0.012], [0.274, "Mark End", 0.01], [0.277, "Relocate Start", 0.009], [0.32, "Mark End", 0.012], [0.354, "Relocate Start", 0.011], [0.409, "Mark Start", 0.015], [0.451, "Mark End", 0.012], [0.459, "Relocate Start", 0.009], [0.511, "Mark End", 0.014], [0.593, "Relocate Start", 0.011], [0.923, "Mark Start", 0.016], [0.964, "Mark End", 0.013], [0.966, "Relocate Start", 0.009], [1.035, "Mark End", 0.017], [1.129, "Relocate Start", 0.012]], "kinds": {"Mark Start": 5, "Mark End": 10, "Relocate Start": 10}, "cycles": {"Major Collection (Warmup)": 3, "Minor Collection (Allocation Rate)": 11, "Major Collection (Allocation Rate)": 2}, "total": 0.3, "max": 0.017, "samples": ["[0.120s] GC(0) Y: Pause Mark Start (Major) 0.017ms", "[0.132s] GC(0) Y: Pause Mark End 0.010ms", "[0.136s] GC(0) Y: Pause Relocate Start 0.010ms", "[0.147s] GC(0) Major Collection (Warmup) 68M(11%)->134M(21%) 0.027s", "[0.248s] GC(2) Minor Collection (Allocation Rate) 216M(34%)->242M(38%) 0.043s"]}, "Serial|320m": {"run": 2004, "hiccup": 123.115, "pauses": [[0.116, "Young", 61.01], [0.183, "Young", 45.173], [0.274, "Young", 69.947], [0.297, "Young", 0.022], [0.419, "Full", 122.88], [0.487, "Young", 50.224], [0.501, "Young", 0.029], [0.624, "Full", 122.789], [0.671, "Young", 31.422], [0.683, "Young", 0.021], [0.781, "Full", 97.924], [0.825, "Young", 30.405], [0.837, "Young", 0.018], [0.94, "Full", 103.18], [0.981, "Young", 27.514], [0.992, "Young", 0.019], [1.086, "Full", 94.704], [1.126, "Young", 28.361], [1.136, "Young", 0.018], [1.226, "Full", 90.318], [1.264, "Young", 26.186], [1.274, "Young", 0.023], [1.368, "Full", 93.937], [1.407, "Young", 27.148], [1.418, "Young", 0.018], [1.514, "Full", 96.527], [1.556, "Young", 29.922], [1.567, "Young", 0.023], [1.667, "Full", 100.003], [1.709, "Young", 28.826], [1.719, "Young", 0.023], [1.821, "Full", 102.327], [1.864, "Young", 29.494], [1.875, "Young", 0.021], [1.978, "Full", 102.452], [2.017, "Young", 27.735], [2.028, "Young", 0.021], [2.128, "Full", 100.36]], "kinds": {"Young": 26, "Full": 12}, "cycles": {}, "total": 1741.0, "max": 122.88, "samples": ["[0.116s] GC(0) Pause Young (Allocation Failure) 86M->81M(309M) 61.010ms", "[0.183s] GC(1) Pause Young (Allocation Failure) 166M->130M(309M) 45.173ms", "[0.274s] GC(2) Pause Young (Allocation Failure) 215M->180M(309M) 69.947ms", "[0.419s] GC(4) Pause Full (Allocation Failure) 265M->137M(309M) 122.880ms"]}, "Parallel|320m": {"run": 980, "hiccup": 45.722, "pauses": [[0.07, "Young", 17.217], [0.103, "Young", 15.16], [0.133, "Young", 17.276], [0.191, "Full", 45.803], [0.213, "Young", 7.807], [0.266, "Full", 42.992], [0.286, "Young", 7.148], [0.339, "Full", 43.517], [0.349, "Young", 3.172], [0.359, "Young", 4.947], [0.368, "Young", 5.396], [0.414, "Full", 41.03], [0.424, "Young", 3.018], [0.434, "Young", 5.591], [0.444, "Young", 5.816], [0.489, "Full", 41.046], [0.5, "Young", 3.144], [0.51, "Young", 5.353], [0.521, "Young", 6.148], [0.561, "Full", 36.19], [0.569, "Young", 2.993], [0.58, "Young", 5.878], [0.59, "Young", 5.597], [0.637, "Full", 42.861], [0.647, "Young", 2.828], [0.658, "Young", 6.166], [0.667, "Young", 5.339], [0.709, "Full", 36.41], [0.717, "Young", 2.844], [0.728, "Young", 5.502], [0.738, "Young", 5.744], [0.749, "Young", 7.304], [0.791, "Full", 38.291], [0.8, "Young", 4.082], [0.81, "Young", 5.055], [0.82, "Young", 5.951], [0.831, "Young", 5.952], [0.872, "Full", 36.588], [0.878, "Young", 2.309], [0.888, "Young", 4.998], [0.897, "Young", 4.92], [0.905, "Young", 4.772], [0.945, "Full", 36.082], [0.953, "Young", 2.651], [0.963, "Young", 5.759], [0.972, "Young", 5.089], [0.981, "Young", 4.824], [1.022, "Full", 36.863], [1.03, "Young", 3.091], [1.04, "Young", 5.306], [1.05, "Young", 5.307], [1.059, "Young", 5.129]], "kinds": {"Young": 40, "Full": 12}, "cycles": {}, "total": 710.3, "max": 45.803, "samples": ["[0.070s] GC(0) Pause Young (Allocation Failure) 81M->78M(307M) 17.217ms", "[0.103s] GC(1) Pause Young (Allocation Failure) 158M->131M(307M) 15.160ms", "[0.133s] GC(2) Pause Young (Allocation Failure) 212M->187M(307M) 17.276ms", "[0.191s] GC(3) Pause Full (Ergonomics) 267M->127M(307M) 45.803ms"]}, "G1|320m": {"run": 1021, "hiccup": 26.355, "pauses": [[0.043, "Young", 5.925], [0.048, "Young", 2.382], [0.053, "Young", 2.9], [0.062, "Young", 4.983], [0.077, "Young", 4.694], [0.099, "Young", 5.574], [0.133, "Young", 9.511], [0.152, "Young", 5.468], [0.161, "Remark", 0.428], [0.166, "Young", 3.908], [0.176, "Young", 3.199], [0.182, "Young", 2.112], [0.188, "Young", 2.203], [0.189, "Young", 1.0], [0.215, "Full", 25.885], [0.239, "Young", 7.655], [0.255, "Young", 5.381], [0.268, "Young", 3.187], [0.274, "Remark", 0.623], [0.278, "Young", 2.536], [0.286, "Young", 2.038], [0.292, "Young", 1.759], [0.298, "Young", 2.828], [0.32, "Full", 21.516], [0.34, "Young", 5.018], [0.355, "Young", 3.938], [0.37, "Young", 3.286], [0.374, "Remark", 0.786], [0.38, "Young", 2.769], [0.386, "Young", 2.532], [0.392, "Young", 1.691], [0.398, "Young", 2.382], [0.419, "Full", 20.295], [0.439, "Young", 4.445], [0.454, "Young", 4.934], [0.469, "Young", 3.721], [0.473, "Remark", 0.305], [0.481, "Young", 2.773], [0.489, "Young", 2.665], [0.495, "Young", 1.819], [0.5, "Young", 1.928], [0.52, "Full", 19.829], [0.54, "Young", 4.188], [0.555, "Young", 3.809], [0.569, "Young", 2.61], [0.573, "Remark", 0.42], [0.58, "Young", 2.878], [0.586, "Young", 1.819], [0.592, "Young", 1.884], [0.598, "Young", 2.009], [0.616, "Full", 18.208], [0.637, "Young", 4.77], [0.65, "Young", 3.407], [0.663, "Young", 2.431], [0.668, "Remark", 0.41], [0.673, "Young", 2.211], [0.68, "Young", 1.786], [0.686, "Young", 1.807], [0.692, "Young", 1.908], [0.715, "Full", 22.943], [0.736, "Young", 4.798], [0.751, "Young", 3.51], [0.765, "Young", 3.198], [0.769, "Remark", 0.498], [0.776, "Young", 2.456], [0.784, "Young", 2.839], [0.791, "Young", 2.034], [0.798, "Young", 2.741], [0.817, "Full", 19.811], [0.839, "Young", 5.531], [0.854, "Young", 4.563], [0.868, "Young", 2.715], [0.872, "Remark", 0.412], [0.878, "Young", 2.491], [0.885, "Young", 1.834], [0.891, "Young", 2.069], [0.897, "Young", 1.998], [0.916, "Full", 18.959], [0.937, "Young", 4.468], [0.951, "Young", 3.758], [0.966, "Young", 3.429], [0.97, "Remark", 1.358], [0.976, "Young", 2.149], [0.984, "Young", 2.754], [0.99, "Young", 1.888], [0.996, "Young", 1.985], [1.017, "Full", 21.516], [1.04, "Young", 4.174], [1.055, "Young", 3.394], [1.068, "Young", 2.573], [1.072, "Remark", 0.577], [1.079, "Young", 2.162], [1.086, "Young", 2.042], [1.091, "Young", 1.795], [1.104, "Cleanup", 0.132]], "kinds": {"Young": 75, "Remark": 10, "Full": 9, "Cleanup": 1}, "cycles": {}, "total": 434.9, "max": 25.885, "samples": ["[0.043s] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 27M->26M(320M) 5.925ms", "[0.048s] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 39M->41M(320M) 2.382ms", "[0.053s] GC(2) Pause Young (Normal) (G1 Evacuation Pause) 64M->65M(320M) 2.900ms", "[0.215s] GC(14) Pause Full (G1 Compaction Pause) 319M->127M(320M) 25.885ms"]}, "ZGC|320m": {"run": 1864, "hiccup": 1.163, "pauses": [[0.059, "Mark Start", 0.013], [0.065, "Mark End", 0.009], [0.068, "Relocate Start", 0.009], [0.068, "Mark End", 0.006], [0.078, "Relocate Start", 0.009], [0.08, "Mark Start", 0.006], [0.092, "Mark End", 0.008], [0.097, "Relocate Start", 0.008], [0.106, "Mark End", 0.01], [0.184, "Relocate Start", 0.01], [0.215, "Mark Start", 0.012], [0.241, "Mark End", 0.009], [0.247, "Relocate Start", 0.009], [0.28, "Mark End", 0.015], [0.294, "Relocate Start", 0.011], [0.339, "Mark Start", 0.013], [0.362, "Mark End", 0.008], [0.364, "Relocate Start", 0.005], [0.397, "Mark End", 0.012], [0.495, "Relocate Start", 0.01], [0.533, "Mark Start", 0.011], [0.547, "Mark End", 0.009], [0.549, "Relocate Start", 0.006], [0.581, "Mark End", 0.011], [0.595, "Relocate Start", 0.006], [0.65, "Mark Start", 0.012], [0.673, "Mark End", 0.015], [0.676, "Relocate Start", 0.008], [0.712, "Mark End", 0.009], [0.732, "Relocate Start", 0.01], [0.781, "Mark Start", 0.013], [0.808, "Mark End", 0.008], [0.811, "Relocate Start", 0.008], [0.854, "Mark End", 0.011], [0.956, "Relocate Start", 0.01], [1.001, "Mark Start", 0.014], [1.021, "Mark End", 0.009], [1.025, "Relocate Start", 0.008], [1.057, "Mark End", 0.01], [1.071, "Relocate Start", 0.011], [1.136, "Mark Start", 0.01], [1.158, "Mark End", 0.011], [1.16, "Relocate Start", 0.005], [1.193, "Mark End", 0.009], [1.213, "Relocate Start", 0.009], [1.261, "Mark Start", 0.013], [1.285, "Mark End", 0.009], [1.287, "Relocate Start", 0.005], [1.326, "Mark End", 0.009], [1.38, "Relocate Start", 0.01], [1.411, "Mark Start", 0.008], [1.427, "Mark End", 0.005], [1.429, "Relocate Start", 0.003], [1.46, "Mark End", 0.009], [1.482, "Relocate Start", 0.01], [1.529, "Mark Start", 0.013], [1.551, "Mark End", 0.011], [1.554, "Relocate Start", 0.009], [1.591, "Mark End", 0.009], [1.612, "Relocate Start", 0.007], [1.661, "Mark Start", 0.011], [1.686, "Mark End", 0.009], [1.689, "Relocate Start", 0.005], [1.726, "Mark End", 0.014], [1.75, "Relocate Start", 0.01], [1.801, "Mark Start", 0.012], [1.828, "Mark End", 0.009], [1.831, "Relocate Start", 0.009], [1.872, "Mark End", 0.01], [1.936, "Relocate Start", 0.01], [1.97, "Mark Start", 0.011], [1.989, "Mark End", 0.008], [1.991, "Relocate Start", 0.007]], "kinds": {"Mark Start": 15, "Mark End": 29, "Relocate Start": 29}, "cycles": {"Major Collection (Warmup)": 3, "Minor Collection (Allocation Rate)": 23, "stall_count": 54, "stall_ms": 715.2, "Minor Collection (Allocation Stall)": 15, "Major Collection (Allocation Rate)": 11}, "total": 0.7, "max": 0.015, "samples": ["[0.059s] GC(0) Y: Pause Mark Start (Major) 0.013ms", "[0.065s] GC(0) Y: Pause Mark End 0.009ms", "[0.068s] GC(0) Y: Pause Relocate Start 0.009ms", "[0.079s] GC(0) Major Collection (Warmup) 32M(10%)->74M(23%) 0.020s", "[0.145s] GC(2) Minor Collection (Allocation Rate) 138M(43%)->206M(64%) 0.038s", "[0.278s] Allocation Stall (main) 15.488ms"]}};
  var GCS = [
    { k: "Serial", flag: "-XX:+UseSerialGC", why: "One thread does all the work while the application is **stopped**. Fine for tiny heaps and single-CPU containers; here every collection is a long stop-the-world pause." },
    { k: "Parallel", flag: "-XX:+UseParallelGC", why: "Same stop-the-world design but with **all cores** collecting: the best **throughput** (shortest run), at the cost of pauses of tens of milliseconds, and full GCs when the old generation fills." },
    { k: "G1", flag: "-XX:+UseG1GC (default)", why: "The default: region-based, mostly **concurrent marking**, and young/mixed **evacuation pauses** sized toward a pause goal (`MaxGCPauseMillis`, 200 ms by default). A balanced middle ground; with a tight heap it falls back to **Full** GCs." },
    { k: "ZGC", flag: "-XX:+UseZGC -XX:+ZGenerational", why: "Does marking **and** compaction concurrently, so pauses stay **well under a millisecond** regardless of heap size. The price is CPU and headroom: when the heap is too small to keep up, threads hit **allocation stalls** instead of pauses." }
  ];
  function j30Widget(el, ctx) {
    var s = ctx.state; if (!s.g) s.g = "G1"; if (!s.h) s.h = "640m";
    el.innerHTML = "<div class='btnrow' data-r='gs'>" + GCS.map(function (g) { return "<button type='button' class='btn' data-g='" + g.k + "'>" + g.k + "</button>"; }).join("") + "</div>" +
      "<div class='btnrow' data-r='hs' style='margin-top:6px'><button type='button' class='btn' data-h='640m'>heap 640 MB</button><button type='button' class='btn' data-h='320m'>tight heap 320 MB</button></div>" +
      "<pre class='code' data-r='cmd' style='margin-top:8px'></pre><div data-r='stats' style='display:flex;gap:10px;flex-wrap:wrap;margin:8px 0'></div><div data-r='tl'></div><div class='result' data-r='res'></div><pre class='code' data-r='log' style='white-space:pre-wrap'></pre>";
    var q = function (r) { return el.querySelector("[data-r='" + r + "']"); };
    function card(label, val, bad) { return "<div style='flex:1;min-width:130px;border:1px solid #e5e7eb;border-radius:8px;padding:8px'><div style='font-size:12px;color:#64748b'>" + label + "</div><div style='font-size:20px;font-weight:700;color:" + (bad ? "#b91c1c" : "#111827") + "'>" + val + "</div></div>"; }
    function draw() {
      var g = GCS.filter(function (x) { return x.k === s.g; })[0], r = REC[s.g + "|" + s.h];
      q("gs").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b.dataset.g === s.g); });
      q("hs").querySelectorAll("button").forEach(function (b) { b.classList.toggle("primary", b.dataset.h === s.h); });
      q("cmd").textContent = "$ java " + g.flag.replace(" (default)", "") + " -Xms" + s.h + " -Xmx" + s.h + " -Xlog:gc" + (s.g === "ZGC" ? ",gc+phases" : "") + " Churn";
      var stalls = r.cycles.stall_count || 0;
      q("stats").innerHTML = card("loop run time", r.run + " ms", false) + card("longest pause", r.max < 1 ? r.max.toFixed(3) + " ms" : Math.round(r.max) + " ms", r.max > 50) +
        card("total pause time", r.total + " ms", r.total > 500) + card("worst app hiccup", r.hiccup < 1 ? r.hiccup.toFixed(2) + " ms" : Math.round(r.hiccup) + " ms", r.hiccup > 50) +
        card("pauses", r.pauses.length + "", false) + (s.g === "ZGC" ? card("allocation stalls", stalls + (stalls ? " (" + Math.round(r.cycles.stall_ms) + " ms)" : ""), stalls > 0) : "");
      var maxT = 0; Object.keys(REC).forEach(function (k) { REC[k].pauses.forEach(function (p) { maxT = Math.max(maxT, p[0]); }); });
      var colors = { Young: "#3b82f6", Full: "#dc2626", Remark: "#a855f7", Cleanup: "#a855f7" };
      var dots = r.pauses.map(function (p) {
        var h = Math.max(3, Math.min(100, Math.round(100 * Math.log10(1 + p[2] * 10) / Math.log10(1 + 2000))));
        return "<span title='" + p[0] + " s: " + p[1] + " " + p[2] + " ms' style='position:absolute;bottom:0;left:" + (100 * p[0] / maxT).toFixed(2) + "%;width:3px;height:" + h + "px;background:" + (colors[p[1]] || "#16a34a") + "'></span>";
      }).join("");
      q("tl").innerHTML = "<div style='position:relative;height:104px;border-bottom:1px solid #94a3b8;border-left:1px solid #94a3b8;background:#fafafa'>" + dots + "</div>" +
        "<div style='font-size:12px;color:#64748b;margin-top:4px'>Each line is one stop-the-world pause at its time since JVM start (0–" + maxT.toFixed(1) + " s); height is log-scaled duration. Blue = young, red = full, purple = G1 remark/cleanup, green = ZGC phase pauses. Counts: " +
        Object.keys(r.kinds).map(function (k) { return k + " × " + r.kinds[k]; }).join(", ") + (s.g === "ZGC" ? "; concurrent cycles: " + Object.keys(r.cycles).filter(function (k) { return k.indexOf("Collection") > 0; }).map(function (k) { return k + " × " + r.cycles[k]; }).join(", ") : "") + "</div>";
      q("res").innerHTML = ctx.md(g.why + (s.h === "320m" && s.g !== "ZGC" && r.kinds.Full ? " With the tight heap: **" + r.kinds.Full + " full GCs**." : "") + (s.h === "320m" && s.g === "ZGC" ? " With the tight heap: **" + stalls + " allocation stalls** totalling " + Math.round(r.cycles.stall_ms) + " ms, so the loop took " + r.run + " ms instead of " + REC["ZGC|640m"].run + " ms." : ""));
      q("log").textContent = "Sample -Xlog lines:\n" + r.samples.join("\n");
    }
    q("gs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.g = b.dataset.g; ctx.save(); draw(); });
    q("hs").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; s.h = b.dataset.h; ctx.save(); draw(); });
    draw();
  }

  var SLIDES = [
    { title: "Reachability and GC roots",
      text: "The garbage collector frees objects that the program can no longer reach. It starts from **GC roots**: local variables and operands on every thread's stack, static fields of loaded classes, JNI references, and monitors held by threads. It then marks everything reachable by following references. Whatever isn't marked is garbage, **including cycles** of objects that only point at each other, which is why Java has no reference-counting leaks. A memory leak in Java is therefore always an object that is still **reachable** but no longer needed: a static map, a listener list, a cache.",
      m: M(["flowchart LR",
        "  R1[\"thread stack<br/>local: order\"]:::s1 --> A[\"Order\"]:::s4 --> B[\"Customer\"]:::s4",
        "  R2[\"static field<br/>CACHE\"]:::s1 --> C[\"Map\"]:::s4",
        "  X[\"Cart\"]:::s3 --> Y[\"Item\"]:::s3 --> X",
        "  classDef s1 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#ffebee,stroke:#c62828", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `class Node { Node other; byte[] payload = new byte[1_000_000]; }
Node a = new Node(), b = new Node();
a.other = b; b.other = a;                                         // a cycle
var refA = new java.lang.ref.WeakReference<>(a);
System.gc();
System.out.println("while a local variable points at it: collected = " + (refA.get() == null));
a = null; b = null;                                               // the cycle is now unreachable from any root
for (int i = 0; i < 10 && refA.get() != null; i++) { System.gc(); Thread.sleep(20); }
System.out.println("after dropping the roots:            collected = " + (refA.get() == null) + " (cycles are no problem)");`,
      analogy: "GC roots are the entrances to a mall. Any shop you can walk to from an entrance stays open; a cluster of shops connected only to each other, with no corridor from any entrance, gets demolished." },
    { title: "Mark, sweep, compact and copy",
      text: "All tracing collectors **mark** live objects, then reclaim the rest in one of three ways. **Sweep** adds dead space to free lists: cheap, but it fragments the heap. **Compact** slides live objects together: no fragmentation, but objects move and references must be updated. **Copy** evacuates live objects into an empty area: cost is proportional to **live** data, not heap size, which makes it ideal when most objects are dead. HotSpot's young collections copy; old-generation collections mark-compact (G1, Parallel, Serial) or relocate concurrently (ZGC, Shenandoah). Moving objects is why Java has no stable addresses and allocation can be a pointer bump.",
      table: [["Technique", "Cost proportional to", "Fragmentation", "Used for"],
        ["Mark–sweep", "heap size", "yes", "old CMS (removed in JDK 14)"],
        ["Mark–compact", "heap size", "no", "full GCs, Parallel/Serial old"],
        ["Copying / evacuation", "live objects", "no", "young generation, G1 regions"],
        ["Concurrent relocation", "live objects, off the pause", "no", "ZGC, Shenandoah"]],
      m: M(["flowchart LR",
        "  M[\"mark<br/>trace from roots\"]:::s2 --> S[\"sweep<br/>free list\"]:::s3",
        "  M --> C[\"compact<br/>slide together\"]:::s4",
        "  M --> E[\"copy / evacuate<br/>to empty space\"]:::s4",
        "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]) },
    { title: "The generational hypothesis",
      text: "Most objects **die young**: request DTOs, iterators, strings built for one log line. A few live for a long time: caches, connection pools, Spring beans. So the heap is split into a **young** generation, collected often and cheaply by copying only the few survivors, and an **old** generation, collected rarely. Survivors are **promoted** after a few young GCs. This is why short-lived garbage is cheap in Java, and why objects that live *just long enough* to be promoted and then die (medium-lived caches, big batches held across GCs) are the expensive ones. All HotSpot collectors are generational now (ZGC since JDK 21).",
      code: `Function<String, Long> count = kind -> ManagementFactory.getGarbageCollectorMXBeans().stream().filter(g -> g.getName().contains(kind)).mapToLong(GarbageCollectorMXBean::getCollectionCount).sum();
long y0 = count.apply("Young"), o0 = count.apply("Old");
List<byte[]> longLived = new ArrayList<>();
long allocated = 0;
for (int i = 0; i < 300_000; i++) {
    byte[] b = new byte[1_000]; allocated += b.length;
    if (i % 100 == 0) longLived.add(b);                    // 1% survive
}
System.out.printf("allocated %d MB, kept %d MB → young GCs: %d, old GCs: %d%n", allocated >> 20, (longLived.size() * 1_000L) >> 20, count.apply("Young") - y0, count.apply("Old") - o0);` },
    { title: "Inside a young collection",
      text: "New objects are allocated in **eden** (in TLABs, J29). When eden fills, a **young GC** stops the application, copies live objects from eden and the current **survivor** space into the other survivor space (or old), and empties eden. Each survivor gets an **age**; once it passes the tenuring threshold (up to 15, adaptive) or survivors overflow, it's **promoted** to old. References from old to young objects are tracked with a **card table / remembered sets**, so a young GC doesn't scan the whole old generation. Young pauses are short because they're proportional to live young data. The JVM reports each collection through MXBean notifications:",
      m: M(["flowchart LR",
        "  E[\"eden<br/>new objects\"]:::s2 -- \"young GC: copy live\" --> S[\"survivor<br/>age 1, 2, 3…\"]:::s3 -- \"age ≥ threshold\" --> O[\"old generation\"]:::s4",
        "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `List<String> events = Collections.synchronizedList(new ArrayList<>());
for (GarbageCollectorMXBean gc : ManagementFactory.getGarbageCollectorMXBeans())
    ((javax.management.NotificationEmitter) gc).addNotificationListener((n, h) -> {
        var info = com.sun.management.GarbageCollectionNotificationInfo.from((javax.management.openmbean.CompositeData) n.getUserData());
        long edenBefore = info.getGcInfo().getMemoryUsageBeforeGc().get("G1 Eden Space").getUsed() >> 20;
        long edenAfter = info.getGcInfo().getMemoryUsageAfterGc().get("G1 Eden Space").getUsed() >> 20;
        events.add(String.format("%-22s cause=%-28s %3d ms  eden %d → %d MB", info.getGcName(), info.getGcCause(), info.getGcInfo().getDuration(), edenBefore, edenAfter));
    }, null, null);
List<byte[]> keep = new ArrayList<>();
for (int i = 0; i < 400_000; i++) { byte[] b = new byte[1_000]; if (i % 50 == 0) keep.add(b); }
Thread.sleep(200);
events.stream().limit(5).forEach(System.out::println);
System.out.println("... " + events.size() + " collections in total");` },
    { title: "Minor, major, full GC and safepoints",
      text: "A **minor (young) GC** collects only the young generation. A **major** collection works on the old generation; in G1 this is concurrent marking followed by **mixed** collections that evacuate young plus some old regions. A **full GC** collects the whole heap stop-the-world, single- or multi-threaded, and is the slow fallback when concurrent work can't keep up, after `System.gc()`, or when Metaspace needs collecting. Stop-the-world phases happen at **safepoints**: every Java thread must reach a point where its stack is parseable, so a long counted loop or time-to-safepoint can lengthen pauses. Watch for frequent full GCs: they mean an undersized heap, a leak, or humongous allocation trouble.",
      code: `List<String> seen = Collections.synchronizedList(new ArrayList<>());
for (GarbageCollectorMXBean gc : ManagementFactory.getGarbageCollectorMXBeans())
    ((javax.management.NotificationEmitter) gc).addNotificationListener((n, h) -> {
        var info = com.sun.management.GarbageCollectionNotificationInfo.from((javax.management.openmbean.CompositeData) n.getUserData());
        seen.add(info.getGcName() + " / " + info.getGcAction() + " / cause: " + info.getGcCause());
    }, null, null);
for (int i = 0; i < 200_000; i++) { byte[] junk = new byte[1_000]; }
System.gc();                                                   // explicit request: a full collection in G1
Thread.sleep(200);
new LinkedHashSet<>(seen).forEach(System.out::println);` },
    { title: "The collectors and their trade-offs",
      text: "Every collector trades **throughput** (share of CPU doing application work), **latency** (pause lengths) and **footprint** (extra memory needed). Pick by what the service cares about: batch jobs want throughput, user-facing APIs want short pauses, small containers want low footprint. The JVM picks Serial automatically on machines it considers small (fewer than 2 CPUs or under ~1.8 GB of memory), which surprises people running in tiny containers. Compare the four in the widget on the same workload.",
      table: [["Collector", "Flag", "Pauses", "Best for"],
        ["Serial", "-XX:+UseSerialGC", "stop-the-world, 1 thread", "tiny heaps, 1 CPU, CLI tools"],
        ["Parallel", "-XX:+UseParallelGC", "stop-the-world, all cores", "batch throughput"],
        ["G1 (default)", "-XX:+UseG1GC", "short evacuation pauses, concurrent marking, pause goal", "general purpose, heaps of a few GB to tens of GB"],
        ["ZGC", "-XX:+UseZGC (+ZGenerational on 21)", "< 1 ms, everything else concurrent", "latency-sensitive services, very large heaps"],
        ["Shenandoah", "-XX:+UseShenandoahGC", "< 10 ms, concurrent compaction", "low latency (OpenJDK builds, Red Hat)"]],
      code: `System.out.println("this JVM uses: " + ManagementFactory.getGarbageCollectorMXBeans().stream().map(GarbageCollectorMXBean::getName).toList());
System.out.println("CPUs: " + Runtime.getRuntime().availableProcessors() + ", max heap: " + (Runtime.getRuntime().maxMemory() >> 20) + " MB");
String java = ProcessHandle.current().info().command().orElse("java");
for (String gc : List.of("-XX:+UseSerialGC", "-XX:+UseParallelGC", "-XX:+UseZGC")) {
    Process p = new ProcessBuilder(java, gc, "-Xlog:gc:stdout", "-version").redirectErrorStream(true).start();
    String first = new String(p.getInputStream().readAllBytes()).lines().filter(l -> l.contains("Using")).findFirst().orElse("?");
    System.out.println(gc + " → " + first.replaceAll("^\\\\[.*?\\\\] ", ""));
}` },
    { title: "G1: regions, pause goals and humongous objects",
      text: "G1 splits the heap into equal **regions** (1–32 MB) that are dynamically eden, survivor, old or **humongous**. Young GCs evacuate eden and survivor regions in parallel. When old occupancy passes a threshold (IHOP), G1 runs **concurrent marking** (with short Remark and Cleanup pauses), then **mixed** collections evacuate the regions with the most garbage first, hence 'Garbage First'. It sizes the young generation to meet **`-XX:MaxGCPauseMillis`** (default 200 ms). Objects of at least half a region are **humongous**: allocated directly in old regions and expensive to handle, so very large arrays and buffers deserve attention (or a larger `-XX:G1HeapRegionSize`).",
      m: M(["flowchart TB",
        "  Y[\"young GC<br/>evacuate eden + survivors\"]:::s2 --> I[\"old occupancy > IHOP\"]:::s3 --> CM[\"concurrent mark<br/>(+ Remark, Cleanup pauses)\"]:::s3 --> MX[\"mixed GCs<br/>young + most-garbage old regions\"]:::s4",
        "  MX --> Y",
        "  classDef s2 fill:#dbeafe,stroke:#2563eb", "  classDef s3 fill:#fff3e0,stroke:#ef6c00", "  classDef s4 fill:#e8f5e9,stroke:#2e7d32"]),
      code: `Map<String, Integer> causes = new ConcurrentHashMap<>();
for (GarbageCollectorMXBean gc : ManagementFactory.getGarbageCollectorMXBeans())
    ((javax.management.NotificationEmitter) gc).addNotificationListener((n, h) -> {
        var info = com.sun.management.GarbageCollectionNotificationInfo.from((javax.management.openmbean.CompositeData) n.getUserData());
        causes.merge(info.getGcCause(), 1, Integer::sum);
    }, null, null);
var hs = ManagementFactory.getPlatformMXBean(com.sun.management.HotSpotDiagnosticMXBean.class);
long region = Long.parseLong(hs.getVMOption("G1HeapRegionSize").getValue());
System.out.println("region size: " + (region >> 20) + " MB, so arrays of " + (region >> 21) + " MB or more are humongous");
for (int i = 0; i < 300; i++) { byte[] big = new byte[(int) region]; }       // humongous allocations
for (int i = 0; i < 300_000; i++) { byte[] small = new byte[1_000]; }         // normal allocations
Thread.sleep(200);
System.out.println("GC causes: " + new TreeMap<>(causes));` },
    { title: "ZGC and concurrent compaction",
      text: "ZGC (production-ready since JDK 15, **generational** since 21 and the only mode from 24) keeps pauses **below a millisecond** independent of heap size, from hundreds of MB to 16 TB. It marks *and relocates* objects while the application runs, using **load barriers** and coloured pointers: when the app loads a reference to an object that has moved, the barrier fixes it up on the spot. Pauses only synchronise phase changes. The costs: somewhat lower throughput, more CPU for GC threads, and the need for **headroom**: if allocation outpaces collection, threads hit **allocation stalls** (the widget's tight-heap run). Shenandoah takes a similar approach with forwarding pointers.",
      code: `class Allocator {
    public static void main(String[] args) {
        List<byte[]> live = new ArrayList<>();
        for (int i = 0; i < 2_000_000; i++) { byte[] b = new byte[512]; if (i % 20 == 0) live.add(b); if (live.size() > 20_000) live.clear(); }
    }
}
String java = ProcessHandle.current().info().command().orElse("java");
String cp = Allocator.class.getProtectionDomain().getCodeSource().getLocation().getPath();
Process p = new ProcessBuilder(java, "-XX:+UseZGC", "-XX:+ZGenerational", "-Xmx256m", "-Xlog:gc,gc+phases:stdout:uptime", "-cp", cp, "Allocator").redirectErrorStream(true).start();
List<String> lines = new String(p.getInputStream().readAllBytes()).lines().toList();
lines.stream().filter(l -> l.contains("Pause")).limit(4).forEach(System.out::println);
System.out.println("longest pause: " + lines.stream().filter(l -> l.contains("Pause")).mapToDouble(l -> Double.parseDouble(l.replaceAll(".* ([0-9.]+)ms$", "$1"))).max().orElse(0) + " ms");` },
    { title: "Reading GC logs",
      text: "Turn on unified GC logging in **every** production JVM: `-Xlog:gc*:file=/var/log/app/gc.log:time,uptime,level,tags:filecount=5,filesize=20m`. The overhead is negligible and it's the first thing you need in an incident. A G1 pause line tells you the **GC number**, the **kind and cause**, **heap before → after (committed)** and the **pause time**. Look at: pause lengths vs your latency budget, the heap level *after* GC (the live set; if it keeps rising, suspect a leak, J31), the frequency of young GCs (allocation rate) and any **Full** or **To-space exhausted** lines. Tools like GCeasy or GCViewer chart the log.",
      table: [["Fragment", "Meaning"],
        ["[0.216s]", "uptime when the line was logged"],
        ["GC(13)", "collection number; phases of one collection share it"],
        ["Pause Young (Normal) (G1 Evacuation Pause)", "kind (Young / Mixed / Full / Remark) and cause"],
        ["319M->127M(320M)", "heap used before → after (committed size)"],
        ["26.651ms", "pause duration (application stopped)"]],
      code: `class Worker {
    public static void main(String[] args) {
        List<byte[]> cache = new ArrayList<>();
        for (int i = 0; i < 1_500_000; i++) { byte[] b = new byte[256]; if (i % 10 == 0) cache.add(b); }
    }
}
String java = ProcessHandle.current().info().command().orElse("java");
String cp = Worker.class.getProtectionDomain().getCodeSource().getLocation().getPath();
Process p = new ProcessBuilder(java, "-XX:+UseG1GC", "-Xmx128m", "-Xlog:gc:stdout:uptime", "-cp", cp, "Worker").redirectErrorStream(true).start();
new String(p.getInputStream().readAllBytes()).lines().filter(l -> l.contains("Pause")).limit(6).forEach(System.out::println);` },
    { title: "Strong, soft, weak and phantom references",
      text: "Normal references are **strong**. The `java.lang.ref` types let you hold an object without (fully) keeping it alive. A **`SoftReference`** is cleared only when memory is tight (before an OOM), which sounds like a cache but gives you no control over eviction, so prefer a bounded cache (Caffeine). A **`WeakReference`** is cleared at the next GC once no strong references remain: used by `WeakHashMap` (keys) and for canonicalising maps and listener registries. A **`PhantomReference`** never returns its object; it's enqueued after the object is finalised and is the basis for post-mortem cleanup (`Cleaner`). Register any of them with a `ReferenceQueue` to learn when they're cleared.",
      code: `byte[] data = new byte[1_000_000];
var soft = new java.lang.ref.SoftReference<>(new byte[1_000_000]);
var weak = new java.lang.ref.WeakReference<>(new byte[1_000_000]);
var strongWeak = new java.lang.ref.WeakReference<>(data);
Map<Object, String> registry = new WeakHashMap<>();
Object session = new Object();
registry.put(session, "session data"); registry.put(new Object(), "orphan");
System.gc(); Thread.sleep(100);
System.out.println("soft  (memory not tight): " + (soft.get() != null ? "kept" : "cleared"));
System.out.println("weak  (no strong refs):   " + (weak.get() != null ? "kept" : "cleared"));
System.out.println("weak  (still strongly referenced by 'data'): " + (strongWeak.get() != null ? "kept" : "cleared"));
System.out.println("WeakHashMap entries left: " + registry.size() + " (only the key still referenced by 'session')");
java.lang.ref.Reference.reachabilityFence(data);           // keep strong refs alive until here,
java.lang.ref.Reference.reachabilityFence(session);        // or the JIT may treat them as dead early` },
    { title: "Cleaner instead of finalize()",
      text: "`finalize()` is deprecated for removal: it delays reclamation by at least one extra GC, runs on an unpredictable thread at an unpredictable time (or never), can resurrect objects and slows allocation. Release resources **explicitly** with `AutoCloseable` and try-with-resources. As a **safety net** for native resources that callers forget to close, register a `java.lang.ref.Cleaner` action: it runs after the object becomes phantom-reachable. The action must not reference the object itself (use a static nested state class), or the object can never be collected.",
      code: `class NativeBuffer implements AutoCloseable {
    private static final java.lang.ref.Cleaner CLEANER = java.lang.ref.Cleaner.create();
    static final List<String> log = Collections.synchronizedList(new ArrayList<>());
    private record State(String name) implements Runnable { public void run() { log.add("released " + name); } }   // no reference to NativeBuffer
    private final java.lang.ref.Cleaner.Cleanable cleanable;
    NativeBuffer(String name) { cleanable = CLEANER.register(this, new State(name)); }
    public void close() { cleanable.clean(); }                 // explicit, runs the action at most once
}
try (var b = new NativeBuffer("closed-properly")) { }
new NativeBuffer("forgotten");                                 // never closed
for (int i = 0; i < 20 && NativeBuffer.log.size() < 2; i++) { System.gc(); Thread.sleep(50); }
System.out.println(NativeBuffer.log);`,
      analogy: "try-with-resources is checking out of the hotel and returning the key yourself. A Cleaner is the housekeeper who eventually notices an abandoned room. Useful as a backup, but you can't plan your day around when it happens." }
  ];

  H.registerLesson({
    code: "J30",
    summary: "How the JVM reclaims memory: reachability from GC roots, mark-sweep, compaction and copying, the generational hypothesis with eden, survivors and promotion, minor, major and full collections and safepoints, the Serial, Parallel, G1, ZGC and Shenandoah collectors and their throughput/latency/footprint trade-offs, G1 regions and humongous objects, ZGC's concurrent compaction, reading `-Xlog:gc` output, soft, weak and phantom references, and `Cleaner` instead of `finalize()`.",
    slides: SLIDES,
    widget: { heading: "Interactive: four collectors, one workload", caption: "The same allocation-heavy program (120 MB live set, 80 million short-lived arrays) under each collector on JDK 21, with a healthy and a tight heap. Pauses were parsed from -Xlog:gc; 'app hiccup' is how late a 1 ms sleeper thread woke up.", render: j30Widget },
    examplesHeading: "Where this shows up at work",
    examples: [
      ["Latency SLOs", "A payments API with a 50 ms p99 budget moves from Parallel to G1 or ZGC because 200 ms full GCs blow the budget."],
      ["Batch jobs", "A nightly Spark/ETL job uses Parallel GC: total runtime matters, pauses don't."],
      ["Small containers", "A service in a 1-CPU, 1 GB pod silently runs Serial GC; setting CPU limits ≥ 2 or `-XX:+UseG1GC` changes its latency profile."],
      ["Incident triage", "GC logs show the heap after each collection climbing steadily: a leak (J31), not a tuning problem."],
      ["Large arrays", "Image processing allocating 8 MB buffers on a 4 MB-region heap triggers humongous allocations and full GCs."],
      ["Resource cleanup", "Netty and JDBC drivers use Cleaner/PhantomReference safety nets, but leaks still appear when code forgets `close()`."]
    ],
    pitfalls: [
      "Calling `System.gc()` in application code",
      "Tuning GC flags before reading the GC log",
      "Using SoftReference as a cache",
      "Relying on `finalize()` or Cleaner instead of `close()`",
      "Ignoring Full GC lines and to-space exhaustion",
      "Running ZGC without heap headroom (allocation stalls)",
      "Huge temporary arrays becoming humongous objects in G1",
      "Assuming GC frees objects that are still referenced from a static collection"
    ],
    quiz: [
      { q: "Two objects reference only each other and nothing else references them. What happens?", options: ["They leak forever", "They are collected: tracing starts from roots, so cycles are no problem", "Only with ZGC", "Only after finalize()"], answer: 1, why: "Java uses tracing, not reference counting." },
      { q: "Which is a GC root?", options: ["Any object in old gen", "A local variable on a live thread's stack", "An object in eden", "A WeakReference's referent"], answer: 1, why: "Stacks, statics, JNI refs, held monitors." },
      { q: "Why are young collections cheap?", options: ["They skip marking", "Copying cost is proportional to live objects, and most young objects are dead", "They run concurrently", "Eden is small"], answer: 1, why: "The generational hypothesis." },
      { q: "Which collector had the highest throughput (shortest run) on the 640 MB heap in the widget?", options: ["Serial", "Parallel", "G1", "ZGC"], answer: 1, why: "Recorded: Parallel finished the loop fastest, with ~50 ms pauses." },
      { q: "What are ZGC's typical pause times?", options: ["~200 ms", "~50 ms", "well under 1 ms", "zero, it has no pauses"], answer: 2, why: "Recorded max ~0.02 ms; it still has tiny pauses." },
      { q: "What happens to ZGC when the heap is too small for the allocation rate?", options: ["Long full GCs", "Allocation stalls: allocating threads wait for the concurrent cycle", "OOM immediately", "Nothing"], answer: 1, why: "Widget, tight heap." },
      { q: "In G1, what is a humongous object?", options: ["An object in old gen", "An object at least half a region in size, allocated directly into old regions", "A leaked object", "A class in Metaspace"], answer: 1, why: "Large arrays and buffers." },
      { q: "When is a WeakReference cleared?", options: ["Only before OOM", "At the next GC after the referent has no strong references", "Never", "When finalize runs"], answer: 1, why: "SoftReference is the 'before OOM' one." },
      { q: "In `319M->127M(320M) 26.651ms`, what is 127M?", options: ["Heap used before GC", "Heap used after GC (roughly the live set)", "Committed heap", "Young gen size"], answer: 1, why: "A steadily rising after-GC value suggests a leak." }
    ],
    cheatsheet: {
      table: [
        ["Need", "Flag / tool"],
        ["Pick a collector", "`-XX:+UseG1GC` / `UseParallelGC` / `UseZGC` (+`ZGenerational` on 21) / `UseSerialGC`"],
        ["Pause goal (G1)", "`-XX:MaxGCPauseMillis=100`"],
        ["GC log", "`-Xlog:gc*:file=gc.log:time,uptime,level,tags:filecount=5,filesize=20m`"],
        ["Live GC stats", "`jstat -gcutil <pid> 1s`, `jcmd <pid> GC.heap_info`"],
        ["Region size (G1)", "`-XX:G1HeapRegionSize=8m`"],
        ["Ignore System.gc()", "`-XX:+DisableExplicitGC`"],
        ["Weak map", "`new WeakHashMap<>()` (weak keys)"],
        ["Cleanup safety net", "`Cleaner.create().register(obj, action)`"]],
      cards: [
        { title: "Concepts", items: ["Roots + reachability", "Mark / sweep / compact / copy", "Young vs old", "Promotion", "Safepoints"] },
        { title: "Collectors", items: ["Serial: tiny", "Parallel: throughput", "G1: balanced default", "ZGC: sub-ms pauses"] },
        { title: "Say in interviews", items: ["Generational hypothesis", "Minor vs full GC", "G1 regions + humongous", "Read a GC log line", "Weak vs soft"] }]
    },
    practice: [
      { level: "Easy", q: "Explain how the JVM decides an object is garbage.",
        a: ["Starting from GC roots (thread stacks, static fields, JNI refs, monitors), the collector marks every reachable object.",
          "Unmarked objects, including unreachable cycles, are garbage.",
          "A Java 'leak' is a reachable but unneeded object."] },
      { level: "Easy", q: "Minor GC vs major GC vs full GC?",
        a: ["Minor: young generation only, frequent, short, copying.",
          "Major: old generation work (in G1: concurrent marking then mixed collections).",
          "Full: whole heap, stop-the-world; a fallback that should be rare."] },
      { level: "Easy", q: "Watch young collections happen and count them.",
        a: ["Use GarbageCollectorMXBeans to read collection counts before and after.",
          "Allocate lots of short-lived objects.",
          "Young count rises, old usually doesn't."],
        code: `Function<String, Long> count = kind -> ManagementFactory.getGarbageCollectorMXBeans().stream().filter(g -> g.getName().contains(kind)).mapToLong(GarbageCollectorMXBean::getCollectionCount).sum();
long y = count.apply("Young");
for (int i = 0; i < 1_000_000; i++) { byte[] b = new byte[512]; }
System.out.println("young GCs during 500 MB of short-lived allocation: " + (count.apply("Young") - y));` },
      { level: "Medium", q: "How do you choose between Parallel, G1 and ZGC?",
        a: ["Parallel: batch/throughput workloads where pauses don't matter.",
          "G1: default for most services; set a pause goal; good up to tens of GB.",
          "ZGC: strict latency (p99 in ms), large heaps; give it headroom and CPU.",
          "Decide with measurements on production-like load and GC logs, not folklore."] },
      { level: "Medium", q: "Read this line and say what it tells you: `[612.4s] GC(845) Pause Full (G1 Compaction Pause) 3980M->3890M(4096M) 2412.3ms`.",
        a: ["A full, stop-the-world G1 compaction lasting 2.4 s.",
          "It freed only 90 MB: the live set (~3.9 GB) almost fills the 4 GB heap.",
          "Either the heap is too small for the live data or there's a leak; check after-GC trends and take a heap dump (J31)."] },
      { level: "Medium", q: "Build a cache that doesn't prevent its keys from being collected.",
        a: ["WeakHashMap holds keys weakly; entries disappear after the key becomes unreachable and a GC runs.",
          "Values must not reference their keys, or the entry is never cleared.",
          "For general caching prefer a size/time-bounded cache (Caffeine)."],
        code: `Map<Object, String> meta = new WeakHashMap<>();
Object user = new Object(), temp = new Object();
meta.put(user, "keep"); meta.put(temp, "drop");
temp = null;
for (int i = 0; i < 10 && meta.size() > 1; i++) { System.gc(); Thread.sleep(20); }
System.out.println("entries: " + meta.size() + " (user still referenced: " + (user != null) + ")");` },
      { level: "Medium", q: "Why is `finalize()` deprecated and what should you use?",
        a: ["Unpredictable timing (maybe never), extra GC cycles to reclaim, resurrection, performance cost, security problems.",
          "Use AutoCloseable + try-with-resources for deterministic release.",
          "Use Cleaner only as a safety net for forgotten native resources."] },
      { level: "Hard", q: "A latency-sensitive service on G1 shows 300 ms pauses every few minutes. Walk through the investigation.",
        steps: ["Get GC logs with gc* tags; identify the pause kind: young, mixed, remark, full, to-space exhausted.",
          "Long young pauses: too large a young gen or lots of surviving objects; check survivor/promotion and object copying times.",
          "Full GCs: heap too small for the live set, humongous allocations, or concurrent marking starting too late (lower IHOP or more concurrent threads).",
          "Check time-to-safepoint and OS issues (swapping, CPU throttling in containers).",
          "Fix the cause (heap size, allocation hot spots, region size), set MaxGCPauseMillis realistically, or evaluate generational ZGC; verify with before/after logs."] },
      { level: "Hard", q: "Explain how ZGC can move objects while the application runs.",
        a: ["References carry metadata (coloured pointers) telling whether they are up to date for the current phase.",
          "Every reference load goes through a load barrier; if the pointer is stale, the barrier relocates or looks up the forwarded object and heals the reference.",
          "So marking and relocation run concurrently; short pauses only flip phases and scan thread roots.",
          "Costs: barrier overhead, more GC CPU, and the need for headroom to avoid allocation stalls."] },
      { level: "Hard", q: "Run a child JVM with a chosen collector and summarise its pauses from the GC log.",
        a: ["Write a small main class, launch it with ProcessBuilder and -Xlog:gc:stdout.",
          "Parse 'Pause' lines and their durations.",
          "Report count and maximum."],
        code: `class Load { public static void main(String[] args) { List<byte[]> l = new ArrayList<>(); for (int i = 0; i < 1_000_000; i++) { l.add(new byte[256]); if (l.size() > 50_000) l.clear(); } } }
String java = ProcessHandle.current().info().command().orElse("java");
String cp = Load.class.getProtectionDomain().getCodeSource().getLocation().getPath();
for (String gc : List.of("-XX:+UseParallelGC", "-XX:+UseG1GC")) {
    Process p = new ProcessBuilder(java, gc, "-Xmx96m", "-Xlog:gc:stdout", "-cp", cp, "Load").redirectErrorStream(true).start();
    var pauses = new String(p.getInputStream().readAllBytes()).lines().filter(l -> l.contains("Pause")).mapToDouble(l -> Double.parseDouble(l.replaceAll(".* ([0-9.]+)ms$", "$1"))).summaryStatistics();
    System.out.printf("%-20s %d pauses, max %.1f ms%n", gc, pauses.getCount(), pauses.getMax());
}` }
    ],
    recap: [
      "GC frees everything not reachable from roots, cycles included; leaks are reachable-but-useless objects.",
      "Most objects die young: cheap copying young GCs, promotion of survivors, rare old/full collections.",
      "Serial and Parallel stop the world; G1 balances with regions and a pause goal; ZGC compacts concurrently with sub-millisecond pauses.",
      "Always log GC and read pause kind, duration and heap-after-GC.",
      "Weak/soft/phantom references and Cleaner have narrow uses; close resources explicitly."
    ]
  });
})();
