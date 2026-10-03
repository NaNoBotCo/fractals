/* app.js — every toy on the page. Each draws only while on screen. */
(function () {
  "use strict";
  var U = window.UI || {}, TH = U.lang === "th";
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CARD = /[?&]card/.test(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var TAU = Math.PI * 2;
  function fmt(n, d) { d = d || 0; return n.toLocaleString(TH ? "th-TH" : "en-US", { maximumFractionDigits: d, minimumFractionDigits: d }); }
  function big(n) { return n < 1e6 ? fmt(n, n < 100 ? 2 : 1).replace(/\.0+$/, "") : n.toExponential(2).replace("e+", " × 10^"); }

  function fit(cv, maxD) {
    var d = Math.min(window.devicePixelRatio || 1, maxD || 2), w = cv.clientWidth, h = cv.clientHeight;
    var W = Math.max(1, Math.round(w * d)), H = Math.max(1, Math.round(h * d));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var x = cv.getContext("2d"); x.setTransform(d, 0, 0, d, 0, 0);
    return { x: x, w: w, h: h, d: d };
  }
  function press(b, on) { if (b) b.setAttribute("aria-pressed", on ? "true" : "false"); }
  function range(id, show, cb) {
    var el = $(id), out = $(id + "v");
    function go(user) { var v = parseFloat(el.value); if (out) out.textContent = show ? show(v) : v; if (cb) cb(v, user); }
    el.addEventListener("input", function () { go(true); });
    go(false);
    return { el: el, set: function (v) { el.value = v; go(false); }, get: function () { return parseFloat(el.value); } };
  }
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    function f(n) { var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }
    return [f(0), f(8), f(4)];
  }
  function css(c, a) { return "rgba(" + Math.round(c[0] * 255) + "," + Math.round(c[1] * 255) + "," + Math.round(c[2] * 255) + "," + (a == null ? 1 : a) + ")"; }

  /* one animation loop; a toy runs only while it is on screen */
  var toys = [];
  function toy(el, frame, resize) {
    var t = { el: el, frame: frame, resize: resize, vis: false };
    toys.push(t);
    if ("IntersectionObserver" in window) io.observe(el); else t.vis = true;
    return t;
  }
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { toys.forEach(function (t) { if (t.el === e.target) t.vis = e.isIntersecting; }); });
  }, { rootMargin: "120px" }) : null;
  var last = 0;
  function loop(ts) {
    var dt = Math.min(64, ts - (last || ts)); last = ts;
    if (!document.hidden) toys.forEach(function (t) { if (t.vis) t.frame(ts, dt); });
    requestAnimationFrame(loop);
  }
  var rsz;
  window.addEventListener("resize", function () {
    clearTimeout(rsz);
    rsz = setTimeout(function () { toys.forEach(function (t) { if (t.resize) t.resize(); }); }, 150);
  });

  /* glowing dot buffer for the chaos game and the fern */
  function Accum(cv, maxD) { this.cv = cv; this.maxD = maxD || 1.5; this.reset(); }
  Accum.prototype.reset = function () {
    var d = Math.min(window.devicePixelRatio || 1, this.maxD);
    this.w = this.cv.clientWidth; this.h = this.cv.clientHeight; this.d = d;
    this.W = Math.max(1, Math.round(this.w * d)); this.H = Math.max(1, Math.round(this.h * d));
    this.cv.width = this.W; this.cv.height = this.H;
    this.acc = new Float32Array(this.W * this.H * 3);
    this.ctx = this.cv.getContext("2d");
    this.img = this.ctx.createImageData(this.W, this.H);
    this.n = 0;
  };
  Accum.prototype.add = function (x, y, c) {
    var ix = (x * this.d) | 0, iy = (y * this.d) | 0;
    if (ix < 0 || iy < 0 || ix >= this.W || iy >= this.H) return;
    var k = (iy * this.W + ix) * 3, a = this.acc;
    a[k] += c[0]; a[k + 1] += c[1]; a[k + 2] += c[2];
    this.n++;
  };
  Accum.prototype.show = function () {
    var a = this.acc, p = this.img.data, n = this.W * this.H, v;
    for (var i = 0, j = 0, k = 0; i < n; i++, j += 3, k += 4) {
      v = a[j]; p[k] = 11 + 244 * v / (v + 1);
      v = a[j + 1]; p[k + 1] = 10 + 245 * v / (v + 1);
      v = a[j + 2]; p[k + 2] = 28 + 227 * v / (v + 1);
      p[k + 3] = 255;
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.putImageData(this.img, 0, 0);
    this.ctx.setTransform(this.d, 0, 0, this.d, 0, 0);
  };

  /* ---------- hero: a slow dive into Seahorse Valley ---------- */
  (function () {
    var cv = $("scene"); if (!cv) return;
    var g = window.FGL && FGL.make(cv, { dpr: CARD ? 2 : 1.25, maxPx: CARD ? 3e6 : 1.5e6 });
    if (!g) return;
    var P = [-0.743643887037151, 0.131825904205330], C0 = [-0.6, 0], DEEP = Math.log(3 / 6e-5), CYC = 52;
    var tq = /[?&]t=([\d.]+)/.exec(location.search);
    function view(t) {
      var u = (t % CYC) / CYC, depth;
      if (u < 0.86) { var a = u / 0.86; depth = DEEP * a; }
      else { var k = (u - 0.86) / 0.14; depth = DEEP * (1 - k * k * (3 - 2 * k)); }
      var sc = 3 * Math.exp(-depth), f = sc / 3, rot = t * 0.025;
      var w = cv.clientWidth, h = cv.clientHeight, asp = w / Math.max(1, h);
      var ox = asp > 1.2 ? 0.22 * sc * Math.min(asp - 1, 0.9) : 0, oy = asp > 1.2 ? -0.06 * sc : -0.12 * sc;
      var cs = Math.cos(rot), sn = Math.sin(rot);
      var cx = P[0] + (C0[0] - P[0]) * f, cy = P[1] + (C0[1] - P[1]) * f;
      return { x: cx - (cs * ox - sn * oy), y: cy - (sn * ox + cs * oy), sc: sc, rot: rot, its: Math.min(900, 140 + Math.round(64 * depth)), shift: 0.55 + t * 0.012, pal: "gold" };
    }
    var t0 = performance.now(), still = RM || CARD || !!tq;
    var tFix = tq ? parseFloat(tq[1]) : 24;
    function draw(ts) { g.draw(view(still ? tFix : (ts - t0) / 1000 + 4)); }
    var drawn = false;
    toy(cv, function (ts) { if (still && drawn) return; draw(ts); drawn = true; }, function () { drawn = false; });
  })();

  if (CARD) { requestAnimationFrame(loop); return; }

  /* ---------- Koch snowflake ---------- */
  (function () {
    var cv = $("kochcv"); if (!cv) return;
    var S3 = Math.sqrt(3) / 6;
    function step(pts, h) {
      var out = [], n = pts.length;
      for (var i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1];
        out.push(a, [a[0] + dx / 3, a[1] + dy / 3], [(a[0] + b[0]) / 2 + dy * S3 * h, (a[1] + b[1]) / 2 - dx * S3 * h], [a[0] + 2 * dx / 3, a[1] + 2 * dy / 3]);
      }
      return out;
    }
    function flake(lev, h) {
      var p = [90, 210, 330].map(function (d) { var r = d * Math.PI / 180; return [Math.cos(r), Math.sin(r)]; });
      for (var i = 0; i < lev; i++) p = step(p, i === lev - 1 ? h : 1);
      return p;
    }
    var side = [], sideFor = -1;
    function sidePts() {
      if (sideFor === 7) return side;
      var p = [[0, 0], [1, 0]];
      for (var l = 0; l < 7; l++) {
        var o = [p[0]];
        for (var i = 0; i < p.length - 1; i++) {
          var a = p[i], b = p[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
          o.push([a[0] + dx / 3, a[1] + dy / 3], [(a[0] + b[0]) / 2 - dy * S3, (a[1] + b[1]) / 2 + dx * S3], [a[0] + 2 * dx / 3, a[1] + 2 * dy / 3], b);
        }
        p = o;
      }
      side = p; sideFor = 7; return p;
    }
    var lev = 3, h = 1, target = 3, zoom = false, dirty = true;
    var kl = range("klevel", null, function (v) {
      target = v;
      $("ksides").textContent = fmt(3 * Math.pow(4, v));
      $("kout").textContent = "× " + fmt(Math.pow(4 / 3, v), 2);
      $("karea").textContent = "× " + fmt(8 / 5 - 3 / 5 * Math.pow(4 / 9, v), 3);
      dirty = true;
    });
    lev = target = kl.get();
    $("kzoom").addEventListener("click", function () { zoom = !zoom; press(this, zoom); dirty = true; });
    toy(cv, function (ts, dt) {
      if (zoom) {
        var c = fit(cv), x = c.x, w = c.w, H = c.h;
        var u = RM ? 0.3 : (ts / 5200) % 1, s = Math.pow(3, u), p = sidePts();
        var pad = w * 0.06, sc = (w - 2 * pad) * s, base = H * 0.78;
        x.fillStyle = "#0b0a1c"; x.fillRect(0, 0, w, H);
        var gr = x.createLinearGradient(0, base - sc * 0.3, 0, base);
        gr.addColorStop(0, "#ffe08a"); gr.addColorStop(1, "#ff7a8a");
        x.beginPath(); x.moveTo(pad, H);
        var lim = (w - pad) / sc + 0.002;
        for (var i = 0; i < p.length; i++) { if (p[i][0] > lim) { x.lineTo(pad + p[i][0] * sc, base - p[i][1] * sc); break; } x.lineTo(pad + p[i][0] * sc, base - p[i][1] * sc); }
        x.lineTo(w, H); x.closePath(); x.fillStyle = gr; x.fill();
        x.strokeStyle = "#fff6d8"; x.lineWidth = 1; x.stroke();
        return;
      }
      var moving = !(lev === target && h >= 1);
      if (!moving && !dirty) return;
      var sp = RM ? 1 : dt / 420;
      if (target > lev || (target === lev && h < 1)) { if (h < 1) h = Math.min(1, h + sp); else { lev++; h = 0; } }
      else if (target < lev) { if (h > 0) h = Math.max(0, h - sp); else { lev--; h = 1; } }
      dirty = false;
      var c = fit(cv), x = c.x, w = c.w, H = c.h, r = Math.min(w, H) * 0.46;
      var e = h * h * (3 - 2 * h), p = flake(lev, e);
      x.fillStyle = "#0b0a1c"; x.fillRect(0, 0, w, H);
      var gr = x.createRadialGradient(w / 2, H / 2 + r * 0.06, r * 0.1, w / 2, H / 2, r);
      gr.addColorStop(0, "#fff1c2"); gr.addColorStop(0.6, "#ffc94d"); gr.addColorStop(1, "#ff7a8a");
      x.beginPath();
      for (var i = 0; i < p.length; i++) { var X = w / 2 + p[i][0] * r, Y = H / 2 + r * 0.06 - p[i][1] * r; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }
      x.closePath(); x.fillStyle = gr; x.fill();
      x.strokeStyle = "rgba(255,255,255,.75)"; x.lineWidth = lev > 5 ? 0.6 : 1.2; x.stroke();
    }, function () { dirty = true; });
  })();

  /* ---------- chaos game ---------- */
  (function () {
    var cv = $("chaoscv"); if (!cv) return;
    var A = new Accum(cv, 1.5), n = 3, r = 0.5, rule = 0, P = [0, 0], lastC = -1, frames = 0, running = true, trail = [];
    var corners = [], cols = [];
    function layout() {
      var w = A.w, h = A.h, R = Math.min(w, h) * 0.46, a0 = -Math.PI / 2 + (n % 2 === 0 ? Math.PI / n : 0);
      var ys = [];
      for (var i = 0; i < n; i++) ys.push(Math.sin(a0 + TAU * i / n));
      var mid = (Math.max.apply(0, ys) + Math.min.apply(0, ys)) / 2;
      corners = []; cols = [];
      for (i = 0; i < n; i++) {
        corners.push([w / 2 + R * Math.cos(a0 + TAU * i / n), h / 2 + R * (ys[i] - mid)]);
        cols.push(hsl(42 + 360 * i / n, 0.9, 0.6).map(function (v) { return v * 0.16; }));
      }
    }
    function clear() { A.reset(); layout(); P = [A.w / 2, A.h / 2]; frames = 0; trail = []; running = true; lastC = -1; }
    function jump() {
      var k;
      do { k = (Math.random() * n) | 0; } while ((rule === 1 && k === lastC) || (rule === 2 && lastC >= 0 && k === (lastC + 1) % n));
      var c = corners[k], from = [P[0], P[1]];
      P = [P[0] + r * (c[0] - P[0]), P[1] + r * (c[1] - P[1])];
      lastC = k;
      A.add(P[0], P[1], cols[k]);
      return [from, P, k];
    }
    var gn = range("gn", null, function (v) { n = v; clear(); });
    var gr = range("gr", function (v) { return fmt(v, 3); }, function (v) { r = v; clear(); });
    function fitJump() { var s = 1; for (var k = 1; k <= Math.floor(n / 4); k++) s += Math.cos(TAU * k / n); return 1 - 1 / (2 * s); }
    $("gfit").addEventListener("click", function () { gr.set(fitJump().toFixed(3)); });
    document.querySelectorAll("[data-rule]").forEach(function (b) {
      b.addEventListener("click", function () {
        rule = +b.dataset.rule;
        document.querySelectorAll("[data-rule]").forEach(function (o) { press(o, o === b); });
        clear();
      });
    });
    $("gclear").addEventListener("click", clear);
    $("gstep").addEventListener("click", function () { running = false; trail.push(jump()); if (trail.length > 8) trail.shift(); paint(); });
    cv.addEventListener("click", function (e) {
      var b = cv.getBoundingClientRect(); P = [e.clientX - b.left, e.clientY - b.top]; frames = 0; trail = []; running = true;
    });
    function paint() {
      A.show();
      var x = A.ctx;
      for (var i = 0; i < corners.length; i++) {
        x.beginPath(); x.arc(corners[i][0], corners[i][1], 6, 0, TAU); x.fillStyle = css(cols[i].map(function (v) { return v / 0.16; })); x.fill();
      }
      trail.forEach(function (t, j) {
        var a = (j + 1) / trail.length;
        x.strokeStyle = "rgba(255,255,255," + (0.25 + 0.6 * a) + ")"; x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(t[0][0], t[0][1]); x.lineTo(t[1][0], t[1][1]); x.stroke();
        x.beginPath(); x.arc(t[1][0], t[1][1], 3.5, 0, TAU); x.fillStyle = "#fff"; x.fill();
      });
      $("gdots").textContent = fmt(A.n);
    }
    clear();
    toy(cv, function () {
      if (!running) return;
      frames++;
      var k = 0;
      if (frames < 150) { if (frames % 7 === 0) { trail.push(jump()); if (trail.length > 8) trail.shift(); } }
      else {
        trail = [];
        k = Math.min(6000, Math.round(Math.pow(1.07, frames - 150)));
        for (var i = 0; i < k; i++) jump();
        if (A.n > 3e6) running = false;
      }
      paint();
    }, function () { clear(); });
  })();

  /* ---------- tree ---------- */
  (function () {
    var cv = $("treecv"); if (!cv) return;
    var n = 10, ang = 28, r = 0.72, wind = 0.35, bloom = true, bend = 0, bendT = 0, dirty = true;
    function readout() {
      $("ttips").textContent = fmt(Math.pow(2, n));
      var s = 0; for (var k = 0; k <= n; k++) s += Math.pow(2 * r, k);
      $("tlen").textContent = "× " + fmt(s, 1) + (2 * r >= 1 ? " " + U.growing : "");
      dirty = true;
    }
    range("tlev", null, function (v) { n = v; readout(); });
    range("tang", function (v) { return v + "°"; }, function (v) { ang = v; dirty = true; });
    range("tshr", function (v) { return fmt(v, 2); }, function (v) { r = v; readout(); });
    range("twind", function (v) { return fmt(v, 2); }, function (v) { wind = v; dirty = true; });
    $("tbloom").addEventListener("click", function () { bloom = !bloom; press(this, bloom); dirty = true; });
    cv.addEventListener("pointermove", function (e) { var b = cv.getBoundingClientRect(); bendT = ((e.clientX - b.left) / b.width - 0.5) * 2; });
    cv.addEventListener("pointerleave", function () { bendT = 0; });
    var BARK = [0.42, 0.29, 0.22], LEAF = [0.38, 0.78, 0.47];
    toy(cv, function (ts) {
      if (!dirty && wind === 0 && Math.abs(bend - bendT) < 0.001) return;
      dirty = false;
      bend += (bendT - bend) * 0.08;
      var t = RM ? 0 : ts / 1000;
      var c = fit(cv), x = c.x, w = c.w, h = c.h;
      var sky = x.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#1b1846"); sky.addColorStop(1, "#3a2a55");
      x.fillStyle = sky; x.fillRect(0, 0, w, h);
      x.fillStyle = "#120f2a"; x.fillRect(0, h * 0.96, w, h * 0.04);
      var L0 = h * (r < 0.5 ? 0.42 : 0.27 * (0.72 / Math.max(0.6, r)) * (r > 0.78 ? 0.8 : 1)), a = ang * Math.PI / 180;
      var lvl = [[w / 2, h * 0.965, Math.PI / 2, L0]], tips = [];
      for (var k = 0; k <= n; k++) {
        var f = k / Math.max(1, n), col = BARK.map(function (v, i) { return v + (LEAF[i] - v) * Math.pow(f, 1.6); });
        var sway = (wind * (0.10 * Math.sin(t * 1.1 + k * 0.6) + 0.045 * Math.sin(t * 2.9 + k * 1.7)) + bend * 0.07) * (0.3 + f);
        x.strokeStyle = css(col); x.lineWidth = Math.max(0.5, L0 * 0.085 * Math.pow(r, k * 1.15)); x.lineCap = "round";
        x.beginPath();
        var nx = [];
        for (var i = 0; i < lvl.length; i++) {
          var b = lvl[i], ex = b[0] + b[3] * Math.cos(b[2]), ey = b[1] - b[3] * Math.sin(b[2]);
          x.moveTo(b[0], b[1]); x.lineTo(ex, ey);
          if (k < n) { var th = b[2] - sway; nx.push([ex, ey, th + a, b[3] * r], [ex, ey, th - a, b[3] * r]); }
          else tips.push(ex, ey);
        }
        x.stroke();
        lvl = nx;
      }
      if (bloom) {
        var rad = Math.max(1, Math.min(4, 60 / Math.sqrt(tips.length)));
        for (var j = 0, m = 0; j < tips.length; j += 2, m++) {
          x.fillStyle = m % 3 === 0 ? "#ffd166" : (m % 3 === 1 ? "#ff9eb5" : "#ffb3c7");
          x.fillRect(tips[j] - rad / 2, tips[j + 1] - rad / 2, rad, rad);
        }
      }
    }, function () { dirty = true; });
  })();

  /* ---------- Barnsley fern ---------- */
  (function () {
    var cv = $("ferncv"); if (!cv) return;
    var A = new Accum(cv, 1.5), lean = 0, leaf = 1, byMove = false, maps = [], X = 0, Y = 0, box = null, running = true;
    var BASE = [[0, 0, 0, 0.16, 0, 0, 0.01], [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85], [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07], [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07]];
    var COL = [[0.75, 0.52, 0.32], [0.37, 0.88, 0.54], [1, 0.79, 0.3], [0.37, 0.88, 0.78]];
    function build() {
      var t = lean * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t);
      maps = BASE.map(function (m, i) {
        m = m.slice();
        if (i === 1) { var a = m[0], b = m[1], c = m[2], d = m[3]; m[0] = cs * a - sn * c; m[1] = cs * b - sn * d; m[2] = sn * a + cs * c; m[3] = sn * b + cs * d; }
        if (i >= 2) { for (var k = 0; k < 4; k++) m[k] *= leaf; }
        return m;
      });
    }
    function pick() { var u = Math.random(), s = 0; for (var i = 0; i < 4; i++) { s += maps[i][6]; if (u < s) return i; } return 1; }
    function it() { var i = pick(), m = maps[i], nx = m[0] * X + m[1] * Y + m[4]; Y = m[2] * X + m[3] * Y + m[5]; X = nx; return i; }
    function clear() {
      build(); A.reset(); X = 0; Y = 0; running = true;
      var xs = [], ys = [];
      for (var i = 0; i < 24000; i++) { it(); if (i > 20) { xs.push(X); ys.push(Y); } }
      xs.sort(function (a, b) { return a - b; }); ys.sort(function (a, b) { return a - b; });
      var q = function (a, f) { return a[Math.floor(f * (a.length - 1))]; };
      var x0 = q(xs, 0.002), x1 = q(xs, 0.998), y0 = q(ys, 0.001), y1 = q(ys, 0.999);
      var s = Math.min(A.w * 0.9 / (x1 - x0 || 1), A.h * 0.92 / (y1 - y0 || 1));
      box = { s: s, ox: A.w / 2 - s * (x0 + x1) / 2, oy: A.h / 2 + s * (y0 + y1) / 2 };
    }
    range("flean", function (v) { return fmt(v, 1) + "°"; }, function (v) { lean = v; clear(); });
    range("fleaf", function (v) { return "× " + fmt(v, 2); }, function (v) { leaf = v; clear(); });
    $("fcol").addEventListener("click", function () { byMove = !byMove; press(this, byMove); clear(); });
    $("fclear").addEventListener("click", clear);
    clear();
    var GREEN = [0.33, 0.85, 0.45];
    toy(cv, function () {
      if (!running) return;
      var k = Math.min(9000, 300 + A.n * 0.02);
      for (var i = 0; i < k; i++) {
        var m = it(), c = byMove ? COL[m] : GREEN, w = byMove ? 0.42 : 0.4;
        A.add(box.ox + X * box.s, box.oy - Y * box.s, [c[0] * w, c[1] * w, c[2] * w]);
      }
      if (A.n > 2.5e6) running = false;
      A.show();
      $("fdots").textContent = fmt(A.n);
    }, function () { clear(); });
  })();

  /* ---------- dragon curve ---------- */
  (function () {
    var cv = $("dragoncv"); if (!cv) return;
    var n = 10, four = false, theta = Math.PI / 2, anim = null, dirty = true;
    function turns(n) { var N = Math.pow(2, n), t = new Int8Array(N); for (var i = 1; i < N; i++) t[i] = (((i & -i) << 1) & i) ? -1 : 1; return t; }
    var T = turns(n);
    function readout() {
      $("dpieces").textContent = fmt(Math.pow(2, n));
      var s = [], m = Math.min(T.length - 1, 63);
      for (var i = 1; i <= m; i++) s.push(T[i] > 0 ? U.d_R : U.d_L);
      $("dcre").textContent = s.join(" ") + (T.length - 1 > m ? " …" : "");
    }
    range("dfold", null, function (v) { n = v; T = turns(n); theta = Math.PI / 2; anim = null; readout(); dirty = true; });
    $("dunfold").addEventListener("click", function () { anim = { t0: performance.now() }; });
    $("dfour").addEventListener("click", function () { four = !four; press(this, four); dirty = true; });
    var DC = [[1, 0.79, 0.3], [1, 0.48, 0.54], [0.37, 0.88, 0.78], [0.67, 0.55, 1]];
    toy(cv, function (ts) {
      if (anim) {
        var u = Math.min(1, (ts - anim.t0) / 4200), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        theta = Math.PI - (Math.PI / 2) * e + 0.0001 * (1 - e);
        if (u >= 1) anim = null;
        dirty = true;
      }
      if (!dirty) return;
      dirty = false;
      var N = T.length, xs = new Float64Array(N + 1), ys = new Float64Array(N + 1), h = 0, X = 0, Y = 0;
      for (var i = 0; i < N; i++) { if (i) h -= T[i] * theta; X += Math.cos(h); Y += Math.sin(h); xs[i + 1] = X; ys[i + 1] = Y; }
      var copies = four ? 4 : 1, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (var q = 0; q < copies; q++) {
        var cq = Math.cos(q * Math.PI / 2), sq = Math.sin(q * Math.PI / 2);
        for (i = 0; i <= N; i++) { var px = cq * xs[i] - sq * ys[i], py = sq * xs[i] + cq * ys[i]; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
      }
      var c = fit(cv), x = c.x, w = c.w, H = c.h, s = Math.min(w * 0.88 / (x1 - x0 || 1), H * 0.88 / (y1 - y0 || 1));
      var ox = w / 2 - s * (x0 + x1) / 2, oy = H / 2 + s * (y0 + y1) / 2;
      x.fillStyle = "#0b0a1c"; x.fillRect(0, 0, w, H);
      x.lineWidth = Math.max(0.7, Math.min(2.6, s * 0.22)); x.lineJoin = "round"; x.lineCap = "round";
      var B = 48;
      for (q = 0; q < copies; q++) {
        cq = Math.cos(q * Math.PI / 2); sq = Math.sin(q * Math.PI / 2);
        for (var b = 0; b < B; b++) {
          var i0 = Math.floor(N * b / B), i1 = Math.floor(N * (b + 1) / B);
          if (i1 <= i0) continue;
          var col = four ? DC[q].map(function (v) { return v * (0.7 + 0.3 * b / B); }) : hsl(40 + 300 * b / B, 0.85, 0.62);
          x.strokeStyle = css(col); x.beginPath();
          for (i = i0; i <= i1; i++) { var X2 = ox + s * (cq * xs[i] - sq * ys[i]), Y2 = oy - s * (sq * xs[i] + cq * ys[i]); i === i0 ? x.moveTo(X2, Y2) : x.lineTo(X2, Y2); }
          x.stroke();
        }
      }
    }, function () { dirty = true; });
  })();

  /* ---------- Mandelbrot explorer ---------- */
  var cfmt = function (x, y, d) { return fmt(x, d).replace("-", "−") + (y < 0 ? " − " : " + ") + fmt(Math.abs(y), d) + "i"; };
  (function () {
    var cv = $("mandelcv"); if (!cv) return;
    var ov = $("mandelov"), g = window.FGL && FGL.make(cv, { dpr: 2, maxPx: 3.2e6 });
    if (!g) return;
    var MINSC = 1.5e-5;
    var PL = [[-0.65, 0, 2.7], [-0.743643887037151, 0.131825904205330, 0.012], [0.2835, 0.0125, 0.012], [-0.761574, -0.0847596, 0.0025], [-1.7549, 0, 0.045], [-0.10109636384562, 0.95628651080914, 0.06]];
    var v = { x: -0.65, y: 0, sc: 2.7, its: 400, pal: "gold" }, dirty = true, fly = null, hover = null;
    var steps = range("msteps", null, function (val) { v.its = val; dirty = true; });
    function want() { return Math.min(2000, Math.round(250 + 70 * Math.log2(3 / v.sc))); }
    function bump() { var w = want(); if (w > steps.get()) steps.set(w); }
    function zoomAt(px, py, f) {
      var c0 = FGL.toC(cv, v, px, py);
      v.sc = Math.max(MINSC, Math.min(4, v.sc * f));
      var c1 = FGL.toC(cv, v, px, py);
      v.x += c0[0] - c1[0]; v.y += c0[1] - c1[1];
      dirty = true; bump();
    }
    function pt(e) { var b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
    var ptrs = {}, drag = null, pinch = null, lastTap = 0;
    cv.addEventListener("pointerdown", function (e) {
      cv.setPointerCapture(e.pointerId); ptrs[e.pointerId] = pt(e); fly = null;
      var ids = Object.keys(ptrs);
      if (ids.length === 1) drag = { p: pt(e), t: performance.now(), moved: 0 };
      if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; drag = null; }
    });
    cv.addEventListener("pointermove", function (e) {
      var p = pt(e);
      if (ptrs[e.pointerId]) ptrs[e.pointerId] = p;
      var ids = Object.keys(ptrs);
      if (ids.length === 2 && pinch) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (d > 0 && pinch.d > 0) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch.d / d);
        pinch.d = d; return;
      }
      if (drag) {
        var dx = p[0] - drag.p[0], dy = p[1] - drag.p[1], m = Math.min(cv.clientWidth, cv.clientHeight);
        drag.moved += Math.abs(dx) + Math.abs(dy);
        v.x -= dx / m * v.sc; v.y += dy / m * v.sc; drag.p = p; dirty = true;
        if (drag.moved > 6) { hover = null; }
        return;
      }
      if (e.pointerType === "mouse") { hover = FGL.toC(cv, v, p[0], p[1]); orbit(); }
    });
    function up(e) {
      var p = pt(e);
      if (drag && drag.moved < 8) {
        var now = performance.now();
        if (e.pointerType !== "mouse" && now - lastTap < 320) zoomAt(p[0], p[1], 1 / 3);
        lastTap = now;
        hover = FGL.toC(cv, v, p[0], p[1]); orbit();
      }
      delete ptrs[e.pointerId];
      if (Object.keys(ptrs).length < 2) pinch = null;
      if (!Object.keys(ptrs).length) drag = null;
    }
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && !drag) { hover = null; orbit(); } });
    cv.addEventListener("dblclick", function (e) { var p = pt(e); zoomAt(p[0], p[1], 1 / 3); });
    cv.addEventListener("wheel", function (e) { e.preventDefault(); var p = pt(e); zoomAt(p[0], p[1], Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0015))); }, { passive: false });
    $("min").addEventListener("click", function () { zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 0.5); });
    $("mout").addEventListener("click", function () { zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 2); });
    document.querySelectorAll("[data-place]").forEach(function (b) {
      b.addEventListener("click", function () {
        var q = PL[+b.dataset.place];
        fly = { t0: performance.now(), a: [v.x, v.y, Math.log(v.sc)], b: [q[0], q[1], Math.log(q[2])] };
        hover = null; orbit();
      });
    });
    document.querySelectorAll("[data-pal]").forEach(function (b) {
      b.addEventListener("click", function () {
        v.pal = b.dataset.pal; dirty = true;
        document.querySelectorAll("[data-pal]").forEach(function (o) { press(o, o === b); });
      });
    });
    function orbit() {
      var c = fit(ov), x = c.x;
      x.clearRect(0, 0, c.w, c.h);
      if (!hover) { $("mpath").textContent = "–"; return; }
      var zx = 0, zy = 0, pts = [], k = FGL.escape(hover[0], hover[1], Math.max(1000, v.its));
      for (var i = 0; i < 160; i++) {
        var t = zx * zx - zy * zy + hover[0]; zy = 2 * zx * zy + hover[1]; zx = t;
        pts.push(FGL.toPx(cv, v, zx, zy));
        if (zx * zx + zy * zy > 16) break;
      }
      x.lineWidth = 1.2; x.strokeStyle = "rgba(255,255,255,.55)"; x.beginPath();
      var o = FGL.toPx(cv, v, 0, 0); x.moveTo(o[0], o[1]);
      pts.forEach(function (p) { x.lineTo(p[0], p[1]); }); x.stroke();
      pts.forEach(function (p, j) { x.beginPath(); x.arc(p[0], p[1], j ? 2.4 : 3.5, 0, TAU); x.fillStyle = j ? "rgba(255,201,77,.9)" : "#fff"; x.fill(); });
      var hp = FGL.toPx(cv, v, hover[0], hover[1]);
      x.strokeStyle = "#ff7a8a"; x.lineWidth = 2; x.beginPath(); x.arc(hp[0], hp[1], 7, 0, TAU); x.stroke();
      var d = Math.max(3, Math.min(10, Math.ceil(Math.log10(3 / v.sc)) + 3));
      $("mpt").textContent = cfmt(hover[0], hover[1], d);
      $("mpath").textContent = k < 0 ? U.m_stays : U.m_leaves.replace("{n}", fmt(k));
    }
    toy(cv, function (ts) {
      if (fly) {
        var u = Math.min(1, (ts - fly.t0) / 1800), e = u * u * (3 - 2 * u);
        var ls = fly.a[2] + (fly.b[2] - fly.a[2]) * e;
        var bulge = Math.sin(Math.PI * u) * Math.max(0, Math.log(3) - Math.max(fly.a[2], fly.b[2])) * 0.5;
        v.sc = Math.exp(ls + bulge);
        v.x = fly.a[0] + (fly.b[0] - fly.a[0]) * e; v.y = fly.a[1] + (fly.b[1] - fly.a[1]) * e;
        if (u >= 1) { fly = null; bump(); }
        dirty = true;
      }
      if (!dirty) return;
      dirty = false;
      g.draw(v);
      $("mzoom").textContent = "× " + big(3 / v.sc);
      if (hover) orbit();
    }, function () { dirty = true; orbit(); });
  })();

  /* ---------- Julia sets ---------- */
  (function () {
    var pc = $("pickcv"), jc = $("juliacv"); if (!pc || !jc) return;
    var gp = window.FGL && FGL.make(pc, { dpr: 1.5 }), gj = window.FGL && FGL.make(jc, { dpr: 2, maxPx: 2.6e6 });
    if (!gp || !gj) return;
    var pv = { x: -0.6, y: 0, sc: 2.9, its: 220, pal: "sea" }, c = [-0.8, 0.156], walk = false, wt = 0.4, dp = true, dj = true;
    function setC(x, y) { c = [x, y]; dj = true; mark(); }
    function mark() {
      var k = fit($("pickov")), x = k.x, p = FGL.toPx(pc, pv, c[0], c[1]);
      x.clearRect(0, 0, k.w, k.h);
      x.strokeStyle = "#fff"; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(p[0] - 12, p[1]); x.lineTo(p[0] - 4, p[1]); x.moveTo(p[0] + 4, p[1]); x.lineTo(p[0] + 12, p[1]);
      x.moveTo(p[0], p[1] - 12); x.lineTo(p[0], p[1] - 4); x.moveTo(p[0], p[1] + 4); x.lineTo(p[0], p[1] + 12); x.stroke();
      x.beginPath(); x.arc(p[0], p[1], 3, 0, TAU); x.fillStyle = "#ff7a8a"; x.fill();
      $("jc").textContent = cfmt(c[0], c[1], 3);
      $("jkind").textContent = FGL.escape(c[0], c[1], 1500) < 0 ? U.inside + " · " + U.j_one : U.outside + " · " + U.j_dust;
    }
    function fromEv(e) { var b = pc.getBoundingClientRect(); var q = FGL.toC(pc, pv, e.clientX - b.left, e.clientY - b.top); setC(q[0], q[1]); }
    var down = false;
    pc.addEventListener("pointerdown", function (e) { down = true; pc.setPointerCapture(e.pointerId); stopWalk(); fromEv(e); });
    pc.addEventListener("pointermove", function (e) { if (down || e.pointerType === "mouse") { if (!down && walk) return; fromEv(e); } });
    pc.addEventListener("pointerup", function () { down = false; });
    pc.addEventListener("pointercancel", function () { down = false; });
    var wb = $("jwalk");
    function stopWalk() { walk = false; press(wb, false); }
    wb.addEventListener("click", function () { walk = !walk; press(wb, walk); });
    toy(pc, function () { if (dp) { gp.draw(pv); dp = false; mark(); } }, function () { dp = true; });
    toy(jc, function (ts, dt) {
      if (walk) {
        wt += dt / 1000 * 0.13;
        var k = 1 + 0.03 * Math.sin(wt * 2.3), cx = Math.cos(wt) / 2 - Math.cos(2 * wt) / 4, cy = Math.sin(wt) / 2 - Math.sin(2 * wt) / 4;
        setC(cx * k, cy * k);
      }
      if (!dj) return;
      dj = false;
      gj.draw({ x: 0, y: 0, sc: 3.1, julia: true, cx: c[0], cy: c[1], its: 320, pal: "sea", shift: 0.15 });
    }, function () { dj = true; });
  })();

  /* ---------- coastline ---------- */
  (function () {
    var cv = $("coastcv"), ll = $("loglog"); if (!cv) return;
    var P = [], eps = 64, series = [], fitD = 1.26, fitM = 0, dirty = true;
    function rnd(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
    function make(seed) {
      var R = rnd(seed), p = [[0, 0], [1, 0]];
      for (var l = 0; l < 6; l++) {
        var o = [p[0]];
        for (var i = 0; i < p.length - 1; i++) {
          var a = p[i], b = p[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], s = R() < 0.5 ? 1 : -1, hh = Math.sqrt(3) / 6 * s;
          o.push([a[0] + dx / 3, a[1] + dy / 3], [(a[0] + b[0]) / 2 - dy * hh, (a[1] + b[1]) / 2 + dx * hh], [a[0] + 2 * dx / 3, a[1] + 2 * dy / 3], b);
        }
        p = o;
      }
      P = p.map(function (q) { return [q[0] * 1000, q[1] * 1000]; });
    }
    function walkPts(e) {
      var cur = P[0], out = [cur], i = 0, t0 = 0, e2 = e * e, N = P.length;
      for (;;) {
        var found = false;
        for (var j = i; j < N - 1; j++) {
          var A = P[j], B = P[j + 1], dx = B[0] - A[0], dy = B[1] - A[1], fx = A[0] - cur[0], fy = A[1] - cur[1];
          var a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - e2, disc = b * b - 4 * a * c;
          if (disc < 0 || a === 0) continue;
          var sq = Math.sqrt(disc), r1 = (-b - sq) / (2 * a), r2 = (-b + sq) / (2 * a), lo = j === i ? t0 + 1e-9 : 0, t = -1;
          if (r1 >= lo && r1 <= 1) t = r1; else if (r2 >= lo && r2 <= 1) t = r2;
          if (t >= 0) { cur = [A[0] + dx * t, A[1] + dy * t]; out.push(cur); i = j; t0 = t; found = true; break; }
        }
        if (!found) break;
        if (out.length > 20000) break;
      }
      var end = P[N - 1], rem = Math.hypot(end[0] - cur[0], end[1] - cur[1]) / e;
      return { pts: out, steps: out.length - 1, len: (out.length - 1 + rem) * e };
    }
    function analyse() {
      series = [];
      for (var k = 0; k < 12; k++) { var e = 160 * Math.pow(5 / 160, k / 11); series.push([e, walkPts(e).len]); }
      var xs = [], ys = [];
      series.forEach(function (s) { xs.push(Math.log(s[0])); ys.push(Math.log(s[1])); });
      var mx = xs.reduce(function (a, b) { return a + b; }) / xs.length, my = ys.reduce(function (a, b) { return a + b; }) / ys.length, sxy = 0, sxx = 0;
      for (var i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); }
      fitD = 1 - sxy / sxx; fitM = my - (1 - fitD) * mx;
      $("cdim").textContent = fmt(fitD, 2);
    }
    var seed = 7;
    make(seed); analyse();
    function ruler(s) { return 160 * Math.pow(2 / 160, s); }
    range("cruler", function (s) { var e = ruler(s); return fmt(e, e < 10 ? 1 : 0) + " " + U.km; }, function (s) { eps = ruler(s); dirty = true; });
    $("cnew").addEventListener("click", function () { seed = (seed * 7919 + 13) % 100003; make(seed); analyse(); dirty = true; });
    toy(cv, function () {
      if (!dirty) return;
      dirty = false;
      var W = walkPts(eps);
      $("csteps").textContent = fmt(W.steps);
      $("clen").textContent = fmt(W.len) + " " + U.km;
      var c = fit(cv), x = c.x, w = c.w, h = c.h, pad = 18, s = (w - 2 * pad) / 1000;
      var y0 = 1e9, y1 = -1e9; P.forEach(function (p) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
      s = Math.min(s, (h - 2 * pad) / (y1 - y0 || 1));
      var ox = w / 2 - 500 * s, oy = h / 2 + (y0 + y1) / 2 * s;
      var sea = x.createLinearGradient(0, 0, 0, h); sea.addColorStop(0, "#2d7fc4"); sea.addColorStop(1, "#174a86");
      x.fillStyle = sea; x.fillRect(0, 0, w, h);
      x.beginPath(); x.moveTo(0, 0); x.lineTo(0, oy);
      P.forEach(function (p) { x.lineTo(ox + p[0] * s, oy - p[1] * s); });
      x.lineTo(w, oy); x.lineTo(w, 0); x.closePath();
      var land = x.createLinearGradient(0, 0, 0, h); land.addColorStop(0, "#3f7a4a"); land.addColorStop(0.5, "#8cae6a"); land.addColorStop(1, "#e9d9a8");
      x.fillStyle = land; x.fill();
      x.strokeStyle = "#fff8e0"; x.lineWidth = 1; x.stroke();
      x.strokeStyle = "#ff3d6e"; x.lineWidth = 2.2; x.beginPath();
      W.pts.forEach(function (p, i) { var X = ox + p[0] * s, Y = oy - p[1] * s; i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
      x.stroke();
      var rr = W.pts.length > 300 ? 1.6 : 3.2;
      x.fillStyle = "#fff";
      W.pts.forEach(function (p) { x.beginPath(); x.arc(ox + p[0] * s, oy - p[1] * s, rr, 0, TAU); x.fill(); });
      x.fillStyle = "rgba(11,10,28,.75)"; x.fillRect(12, h - 40, 150, 28);
      x.strokeStyle = "#fff"; x.lineWidth = 2; x.beginPath(); x.moveTo(22, h - 26); x.lineTo(22 + 100 * s, h - 26); x.stroke();
      x.fillStyle = "#fff"; x.font = "13px system-ui,sans-serif"; x.fillText("100 " + U.km, 28 + 100 * s, h - 21);
      plot(W.len);
    }, function () { dirty = true; });
    function plot(cur) {
      var c = fit(ll), x = c.x, w = c.w, h = c.h, L = 48, R = 14, T = 14, Bm = 40;
      x.fillStyle = "#0b0a1c"; x.fillRect(0, 0, w, h);
      var lo = 1e9, hi = 0; series.forEach(function (s) { lo = Math.min(lo, s[1]); hi = Math.max(hi, s[1]); }); hi = Math.max(hi, cur); lo = Math.min(lo, cur);
      var lx0 = Math.log(1.6), lx1 = Math.log(200), ly0 = Math.log(lo * 0.85), ly1 = Math.log(hi * 1.15);
      function X(e) { return L + (Math.log(e) - lx0) / (lx1 - lx0) * (w - L - R); }
      function Y(l) { return h - Bm - (Math.log(l) - ly0) / (ly1 - ly0) * (h - T - Bm); }
      x.strokeStyle = "rgba(255,255,255,.15)"; x.lineWidth = 1; x.fillStyle = "#b9b3cf"; x.font = "12px system-ui,sans-serif";
      [2, 4, 8, 16, 32, 64, 128].forEach(function (e) { x.beginPath(); x.moveTo(X(e), T); x.lineTo(X(e), h - Bm); x.stroke(); x.fillText(String(e), X(e) - 8, h - Bm + 16); });
      [1000, 1500, 2000, 3000, 4000, 6000].forEach(function (l) { if (Math.log(l) < ly0 || Math.log(l) > ly1) return; x.beginPath(); x.moveTo(L, Y(l)); x.lineTo(w - R, Y(l)); x.stroke(); x.fillText(fmt(l), 4, Y(l) + 4); });
      x.fillText(U.c_axis_x, w / 2 - 30, h - 8);
      var sl = 1 - fitD;
      x.strokeStyle = "rgba(255,201,77,.6)"; x.lineWidth = 2; x.beginPath();
      x.moveTo(X(2), Y(Math.exp(fitM + sl * Math.log(2)))); x.lineTo(X(180), Y(Math.exp(fitM + sl * Math.log(180)))); x.stroke();
      series.forEach(function (s) { x.beginPath(); x.arc(X(s[0]), Y(s[1]), 4, 0, TAU); x.fillStyle = "#5fe0c8"; x.fill(); });
      x.beginPath(); x.arc(X(eps), Y(cur), 7, 0, TAU); x.strokeStyle = "#ff7a8a"; x.lineWidth = 2.5; x.stroke();
      x.fillStyle = "#b9b3cf"; x.fillText(U.c_axis_y, L + 6, T + 12);
    }
  })();

  /* ---------- make your own ---------- */
  (function () {
    var gc = $("gencv"), mc = $("makecv"); if (!gc || !mc) return;
    var PRE = [
      [[0, 0], [1 / 3, 0], [0.5, Math.sqrt(3) / 6], [2 / 3, 0], [1, 0]],
      [[0, 0], [0.25, 0], [0.25, 0.25], [0.5, 0.25], [0.5, 0], [0.5, -0.25], [0.75, -0.25], [0.75, 0], [1, 0]],
      [[0, 0], [0.5, 0.5], [1, 0]],
      [[0, 0], [1 / 3, 0], [1 / 3, 1 / 3], [2 / 3, 1 / 3], [2 / 3, 0], [1 / 3, 0], [1 / 3, -1 / 3], [2 / 3, -1 / 3], [2 / 3, 0], [1, 0]],
      [[0, 0], [0.4, 0], [0.5, 0.3], [0.6, 0], [1, 0]]
    ];
    var gen = PRE[0].map(function (p) { return p.slice(); }), L = 4, drag = -1, lastTap = { t: 0, i: -1 }, dirtyM = true, dirtyG = true, quick = false;
    var lev = range("ylev", null, function (v) { L = v; dirtyM = true; });
    function geo() { var w = gc.clientWidth, h = gc.clientHeight, u = Math.min(w * 0.6, h * 0.9); return { u: u, ox: (w - u) / 2, oy: h * 0.56 }; }
    function toS(p) { var g = geo(); return [g.ox + p[0] * g.u, g.oy - p[1] * g.u]; }
    function toU(x, y) { var g = geo(); return [(x - g.ox) / g.u, (g.oy - y) / g.u]; }
    function moran() {
      var r = [];
      for (var i = 0; i < gen.length - 1; i++) r.push(Math.hypot(gen[i + 1][0] - gen[i][0], gen[i + 1][1] - gen[i][1]));
      if (r.some(function (q) { return q >= 1 || q <= 0; })) return null;
      var lo = 0, hi = 30;
      for (var k = 0; k < 80; k++) { var m = (lo + hi) / 2, s = 0; r.forEach(function (q) { s += Math.pow(q, m); }); if (s > 1) lo = m; else hi = m; }
      return (lo + hi) / 2;
    }
    function limits() {
      var m = gen.length - 1, mx = m < 2 ? 1 : Math.max(1, Math.min(8, Math.floor(Math.log(250000) / Math.log(m))));
      lev.el.max = mx; if (L > mx) lev.set(mx);
      $("ypieces").textContent = fmt(m);
      var D = moran(); $("ydim").textContent = D == null ? "–" : fmt(D, 3);
    }
    function drawGen() {
      var c = fit(gc), x = c.x, w = c.w, h = c.h, g = geo();
      x.fillStyle = "#0b0a1c"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(255,255,255,.07)"; x.lineWidth = 1;
      for (var k = -6; k <= 12; k++) { var X = g.ox + k * g.u / 6; x.beginPath(); x.moveTo(X, 0); x.lineTo(X, h); x.stroke(); }
      for (k = -6; k <= 6; k++) { var Y = g.oy + k * g.u / 6; x.beginPath(); x.moveTo(0, Y); x.lineTo(w, Y); x.stroke(); }
      x.setLineDash([5, 5]); x.strokeStyle = "rgba(255,255,255,.35)";
      x.beginPath(); var a = toS([0, 0]), b = toS([1, 0]); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.setLineDash([]);
      x.strokeStyle = "#ffc94d"; x.lineWidth = 3; x.lineJoin = "round"; x.beginPath();
      gen.forEach(function (p, i) { var s = toS(p); i ? x.lineTo(s[0], s[1]) : x.moveTo(s[0], s[1]); }); x.stroke();
      gen.forEach(function (p, i) {
        var s = toS(p), end = i === 0 || i === gen.length - 1;
        x.beginPath(); x.arc(s[0], s[1], end ? 5 : 8, 0, TAU);
        x.fillStyle = end ? "#b9b3cf" : (i === drag ? "#fff" : "#ff7a8a"); x.fill();
      });
      x.fillStyle = "#b9b3cf"; x.font = "13px system-ui,sans-serif"; x.fillText(U.y_hint, 10, 20);
    }
    function drawMake() {
      var m = gen.length - 1, lv = L;
      if (quick) while (lv > 0 && Math.pow(m, lv) > 20000) lv--;
      var px = [0, 1], py = [0, 0];
      for (var l = 0; l < lv; l++) {
        var nx = [px[0]], ny = [py[0]];
        for (var i = 0; i < px.length - 1; i++) {
          var dx = px[i + 1] - px[i], dy = py[i + 1] - py[i];
          for (var k = 1; k < gen.length; k++) { var g = gen[k]; nx.push(px[i] + g[0] * dx - g[1] * dy); ny.push(py[i] + g[0] * dy + g[1] * dx); }
        }
        px = nx; py = ny;
      }
      $("ysegs").textContent = fmt(px.length - 1);
      var x0 = Math.min.apply(null, px.length < 1e5 ? px : [0]), x1 = 1, y0 = 0, y1 = 0;
      x0 = 1e9; x1 = -1e9; y0 = 1e9; y1 = -1e9;
      for (i = 0; i < px.length; i++) { if (px[i] < x0) x0 = px[i]; if (px[i] > x1) x1 = px[i]; if (py[i] < y0) y0 = py[i]; if (py[i] > y1) y1 = py[i]; }
      var c = fit(mc), x = c.x, w = c.w, h = c.h, s = Math.min(w * 0.9 / (x1 - x0 || 1), h * 0.9 / (y1 - y0 || 1));
      var ox = w / 2 - s * (x0 + x1) / 2, oy = h / 2 + s * (y0 + y1) / 2;
      x.fillStyle = "#0b0a1c"; x.fillRect(0, 0, w, h);
      x.lineWidth = px.length > 50000 ? 0.6 : (px.length > 3000 ? 1 : 1.8); x.lineJoin = "round";
      var B = 60, N = px.length - 1;
      for (var b = 0; b < B; b++) {
        var i0 = Math.floor(N * b / B), i1 = Math.floor(N * (b + 1) / B); if (i1 <= i0) continue;
        x.strokeStyle = css(hsl(45 - 70 * b / B + 360, 0.95, 0.62)); x.beginPath();
        for (i = i0; i <= i1; i++) { var X = ox + px[i] * s, Y = oy - py[i] * s; i === i0 ? x.moveTo(X, Y) : x.lineTo(X, Y); }
        x.stroke();
      }
    }
    function hit(p) { for (var i = 1; i < gen.length - 1; i++) { var s = toS(gen[i]); if (Math.hypot(s[0] - p[0], s[1] - p[1]) < 16) return i; } return -1; }
    function onSeg(p) {
      var best = -1, bd = 14;
      for (var i = 0; i < gen.length - 1; i++) {
        var a = toS(gen[i]), b = toS(gen[i + 1]), dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
        var t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)), d = Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    function pt(e) { var b = gc.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
    gc.addEventListener("pointerdown", function (e) {
      var p = pt(e), i = hit(p), now = performance.now();
      if (i > 0 && lastTap.i === i && now - lastTap.t < 350 && gen.length > 3) { gen.splice(i, 1); lastTap = { t: 0, i: -1 }; unpress(); limits(); dirtyG = dirtyM = true; return; }
      lastTap = { t: now, i: i };
      if (i < 0) { var s = onSeg(p); if (s >= 0 && gen.length < 16) { gen.splice(s + 1, 0, toU(p[0], p[1])); i = s + 1; unpress(); limits(); } }
      if (i > 0) { drag = i; gc.setPointerCapture(e.pointerId); quick = true; dirtyG = dirtyM = true; }
    });
    gc.addEventListener("pointermove", function (e) {
      if (drag < 0) return;
      var p = pt(e), u = toU(p[0], p[1]);
      gen[drag] = [Math.round(u[0] * 48) / 48, Math.round(u[1] * 48) / 48];
      unpress(); limits(); dirtyG = dirtyM = true;
    });
    function end() { if (drag >= 0) { drag = -1; quick = false; dirtyG = dirtyM = true; } }
    gc.addEventListener("pointerup", end);
    gc.addEventListener("pointercancel", end);
    function unpress() { document.querySelectorAll("[data-pre]").forEach(function (o) { press(o, false); }); }
    document.querySelectorAll("[data-pre]").forEach(function (b) {
      b.addEventListener("click", function () {
        gen = PRE[+b.dataset.pre].map(function (p) { return p.slice(); });
        document.querySelectorAll("[data-pre]").forEach(function (o) { press(o, o === b); });
        lev.el.max = 8; limits(); if (L < 1) lev.set(3); dirtyG = dirtyM = true;
      });
    });
    $("ysave").addEventListener("click", function () {
      mc.toBlob(function (b) { var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "fractal.png"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); });
    });
    limits();
    toy(gc, function () { if (dirtyG) { dirtyG = false; drawGen(); } }, function () { dirtyG = true; });
    toy(mc, function () { if (dirtyM) { dirtyM = false; drawMake(); } }, function () { dirtyM = true; });
  })();

  requestAnimationFrame(loop);
})();
