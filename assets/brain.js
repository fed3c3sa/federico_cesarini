/*
 * The brain behind the hero, drawn the way Crow's workspace paints its wiki: a grey root, coloured folders
 * with their names, small grey notes, links tinted by their folder and faint see-also links across folders.
 * Far nodes are soft and out of focus like Crow's welcome screen; near ones are sharp and light up under the
 * pointer the way cited notes light up in the app. It grows from the root on load, then drifts slowly.
 */
(function () {
  "use strict";

  var canvas = document.querySelector("[data-brain]");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var host = canvas.parentElement;
  var keepClear = host.querySelector("[data-brain-clear]");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Crow's tokens.css
  var ROOT = "#9097a0";
  var NOTE = "#7f868f";
  var LABEL = "#8a9095";
  var LIT = "#3d80fc";
  var AREA = {
    teal: "#4cc4ae", orange: "#f5b85a", red: "#ed6461", blue: "#4389fe",
    purple: "#a68cf7", cyan: "#5ec2f2", pink: "#ef8fb7", olive: "#c3cf6b"
  };
  // Folders around the words: [name, colour, x, y, depth]. x and y are fractions of the half width and height.
  var HUBS = [
    ["Memory", "teal", -0.7, -0.02, 0.95],
    ["Agents", "orange", 0.68, -0.5, 0.86],
    ["Research", "olive", 0.74, 0.22, 0.8],
    ["Retrieval", "purple", 0.52, 0.7, 0.68],
    ["Legal AI", "blue", 0.06, 0.84, 0.74],
    ["Apps", "cyan", -0.48, 0.72, 0.64],
    ["Writing", "pink", -0.6, -0.66, 0.6],
    ["Cloud", "red", -0.12, -0.84, 0.5]
  ];

  var seed = Number(canvas.getAttribute("data-seed")) || 7;
  function random() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function rgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    var c = rgb(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }

  var tints = {};
  Object.keys(AREA).forEach(function (k) {
    var a = rgb(AREA[k]), g = rgb(NOTE);
    tints[AREA[k]] = "rgba(" + a.map(function (v, i) { return Math.round(v * 0.6 + g[i] * 0.4); }).join(",") + ",";
  });

  // Soft discs for the out-of-focus nodes, one per colour, drawn once.
  var sprites = {};
  function sprite(hex) {
    if (sprites[hex]) return sprites[hex];
    var s = document.createElement("canvas");
    s.width = s.height = 96;
    var g = s.getContext("2d");
    var grad = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    grad.addColorStop(0, rgba(hex, 0.95));
    grad.addColorStop(0.42, rgba(hex, 0.6));
    grad.addColorStop(0.72, rgba(hex, 0.16));
    grad.addColorStop(1, rgba(hex, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 96, 96);
    sprites[hex] = s;
    return s;
  }

  // ---- the graph, in world units (x roughly -1.8..1.8, y -1..1) ----
  var nodes = [];
  var links = [];

  function add(n) { return nodes.push(n) - 1; }

  function build(compact) {
    nodes = []; links = [];
    var root = add({ ax: 0, ay: 0.04, r: 10, c: ROOT, z: 0.34, depth: 0 });
    var notesByHub = [];
    HUBS.forEach(function (h, i) {
      var colour = AREA[h[1]];
      var hub = add({
        ax: h[2] + (random() - 0.5) * 0.06, ay: h[3] + (random() - 0.5) * 0.06,
        r: 6, c: colour, z: h[4], depth: 1, label: h[0]
      });
      links.push([root, hub, null]);
      var out = Math.atan2(h[3], h[2]); // notes lean away from the root
      var mine = [];
      var count = (compact ? 5 : 9) + Math.floor(random() * (compact ? 4 : 7));
      for (var k = 0; k < count; k++) {
        var la = out + (random() - 0.5) * 3.4;
        var ld = 0.07 + random() * 0.12;
        var note = add({
          hub: hub, lx: Math.cos(la) * ld, ly: Math.sin(la) * ld,
          r: 2.2 + random() * 1.1, c: random() < 0.45 ? colour : NOTE,
          z: Math.min(1, Math.max(0, h[4] + (random() - 0.5) * 0.3)), depth: 2
        });
        links.push([hub, note, colour]);
        mine.push(note);
        if (random() < 0.32) { // a note in a subfolder, one step further out
          var da = la + (random() - 0.5) * 1.1;
          var dd = 0.035 + random() * 0.04;
          var deep = add({
            hub: hub, lx: nodes[note].lx + Math.cos(da) * dd, ly: nodes[note].ly + Math.sin(da) * dd,
            r: 1.8 + random() * 0.6, c: NOTE, z: nodes[note].z, depth: 3
          });
          links.push([note, deep, null]);
        }
      }
      notesByHub.push(mine);
    });
    // long, faint see-also links between notes of different folders
    for (var s = 0; s < (compact ? 6 : 12); s++) {
      var A = notesByHub[Math.floor(random() * notesByHub.length)];
      var B = notesByHub[Math.floor(random() * notesByHub.length)];
      if (A === B || !A.length || !B.length) continue;
      links.push([A[Math.floor(random() * A.length)], B[Math.floor(random() * B.length)], "see"]);
    }
    // the far field: large soft discs well behind the wiki, like the welcome screen
    var palette = [AREA.teal, AREA.orange, AREA.blue, AREA.red, AREA.purple, ROOT, ROOT, NOTE];
    for (var f = 0; f < (compact ? 12 : 22); f++) {
      add({
        ax: (random() * 2 - 1) * 1.08, ay: (random() * 2 - 1) * 1.08,
        r: 5 + random() * 12, c: palette[Math.floor(random() * palette.length)],
        z: random() * 0.18, depth: 4, far: true
      });
    }
    nodes.forEach(function (n) {
      n.ph = random() * Math.PI * 2;
      n.ph2 = random() * Math.PI * 2;
      n.speed = 0.12 + random() * 0.22;
      n.amp = 3 + random() * 6;
      n.delay = [0, 0.12, 0.35, 0.7, 0][n.depth] + random() * [0, 0.25, 0.8, 0.8, 1.2][n.depth];
      n.sx = 0; n.sy = 0; n.glow = 0;
    });
  }

  // ---- size and state ----
  var W = 0, H = 0, dpr = 1, sxs = 1, sys = 1, local = 1, cx = 0, cy = 0;
  var clear = null; // the boxes of the hero's text, kept free of labels
  var pointer = { x: 0, y: 0, tx: 0, ty: 0, px: -1e4, py: -1e4 };
  var start = 0, raf = 0, visible = true, built = false;

  function resize() {
    var rect = host.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    var compact = W < 700 && !canvas.hasAttribute("data-dense");
    if (!built || compact !== built.compact) { build(compact); built = { compact: compact }; }
    // hubs spread over the whole hero; each folder's notes keep their own, undistorted shape
    sxs = W / 2 * 0.94; sys = H / 2 * 0.86;
    local = Math.max(150, Math.min(W, H * 1.4) / 2.6);
    cx = W / 2; cy = H * 0.5;
    if (keepClear) { // the tight box of each line of text, so labels can sit close to it but never on it
      clear = Array.prototype.map.call(keepClear.children, function (el) {
        var range = document.createRange();
        range.selectNodeContents(el);
        var r = range.getBoundingClientRect();
        if (!r.width) r = el.getBoundingClientRect();
        return { l: r.left - rect.left - 18, r: r.right - rect.left + 18, t: r.top - rect.top - 14, b: r.bottom - rect.top + 14 };
      });
    }
    if (still.matches) draw(1e3);
  }

  function ease(p) { return 1 - Math.pow(1 - p, 3); }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    var i, n, g;
    var drift = still.matches ? 0 : 1;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var bx, by;
      if (n.hub === undefined) { bx = cx + n.ax * sxs; by = cy + n.ay * sys; }
      else { bx = nodes[n.hub].bx + n.lx * local; by = nodes[n.hub].by + n.ly * local; }
      n.bx = bx; n.by = by;
      var par = (n.z - 0.35) * 22;
      n.sx = bx + Math.sin(t * n.speed + n.ph) * n.amp * drift + pointer.x * par;
      n.sy = by + Math.cos(t * n.speed * 0.8 + n.ph2) * n.amp * drift + pointer.y * par * 0.7;
      g = Math.min(1, Math.max(0, (t - n.delay) / 0.8));
      n.grow = ease(g);
      var d = Math.hypot(n.sx - pointer.px, n.sy - pointer.py);
      var lit = !n.far && n.z > 0.45 && d < 150 ? 1 - d / 150 : 0;
      n.glow += (lit - n.glow) * 0.12;
    }

    // links, behind the nodes
    ctx.lineCap = "round";
    for (i = 0; i < links.length; i++) {
      var a = nodes[links[i][0]], b = nodes[links[i][1]], kind = links[i][2];
      var vis = Math.min(a.grow, b.grow);
      if (vis <= 0.01) continue;
      var z = Math.min(a.z, b.z);
      var alpha;
      if (kind === "see") { alpha = 0.07; ctx.strokeStyle = rgba(NOTE, alpha * vis); ctx.lineWidth = 0.8; }
      else if (kind) { // a folder's links take its colour, mixed toward grey as Crow's paintOf() does
        alpha = 0.16 + z * 0.26 + Math.max(a.glow, b.glow) * 0.4;
        ctx.strokeStyle = tints[kind] + (alpha * vis).toFixed(3) + ")"; ctx.lineWidth = 0.7 + z * 0.6;
      } else { alpha = 0.14 + z * 0.24; ctx.strokeStyle = rgba(NOTE, alpha * vis); ctx.lineWidth = 0.7 + z * 0.5; }
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      // a link grows out of its parent
      ctx.lineTo(a.sx + (b.sx - a.sx) * b.grow, a.sy + (b.sy - a.sy) * b.grow);
      ctx.stroke();
    }

    // nodes: out of focus first, sharp on top
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.grow <= 0.01) continue;
      var r = n.r * (0.45 + 0.55 * n.grow);
      if (n.far || n.z < 0.42) {
        var soft = n.far ? 3.4 : 2.2 + (0.42 - n.z) * 6;
        var size = r * soft * 2;
        ctx.globalAlpha = (n.far ? 0.3 : 0.5) * n.grow;
        ctx.drawImage(sprite(n.c), n.sx - size / 2, n.sy - size / 2, size, size);
        ctx.globalAlpha = 1;
        continue;
      }
      if (n.glow > 0.02) {
        var halo = r * 7;
        ctx.globalAlpha = n.glow * 0.55;
        ctx.drawImage(sprite(LIT), n.sx - halo / 2, n.sy - halo / 2, halo, halo);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = rgba(n.c, (0.72 + n.z * 0.28) * n.grow);
      ctx.beginPath();
      ctx.arc(n.sx, n.sy, r * (1 + n.glow * 0.25), 0, Math.PI * 2);
      ctx.fill();
    }

    // folder names, never over the text
    ctx.font = "500 " + (W < 700 ? 12 : 13) + "px Inter, -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (!n.label || n.z < 0.42 || n.grow < 0.5) continue;
      var lx = n.sx + n.r + 8, ly = n.sy;
      var lw = ctx.measureText(n.label).width;
      if (clear && clear.some(function (c) { return lx + lw > c.l && lx < c.r && ly + 8 > c.t && ly - 8 < c.b; })) continue;
      if (lx < 8 || lx + lw > W - 8 || ly < 70 || ly > H - 16) continue;
      ctx.fillStyle = rgba(LABEL, (0.55 + n.z * 0.35) * (n.grow - 0.5) * 2);
      ctx.fillText(n.label, lx, ly);
    }
  }

  var last = 0;
  function frame(now) {
    raf = 0;
    if (!visible || still.matches) return;
    if (W >= 700 || now - last > 30) { last = now; draw((now - start) / 1000); }
    raf = requestAnimationFrame(frame);
  }

  var started = false;
  function run() {
    if (started && !raf && visible && !still.matches && !document.hidden) raf = requestAnimationFrame(frame);
  }

  resize();
  function begin() { start = performance.now(); started = true; run(); }
  if (still.matches) draw(1e3);
  else if ("requestIdleCallback" in window) requestIdleCallback(begin, { timeout: 600 });
  else setTimeout(begin, 120);

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(host);
  else window.addEventListener("resize", resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      run();
    }).observe(host);
  }
  document.addEventListener("visibilitychange", run);
  still.addEventListener && still.addEventListener("change", function () { resize(); run(); });

  host.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var rect = host.getBoundingClientRect();
    pointer.px = e.clientX - rect.left; pointer.py = e.clientY - rect.top;
    pointer.tx = (pointer.px / W - 0.5) * 2; pointer.ty = (pointer.py / H - 0.5) * 2;
  });
  host.addEventListener("pointerleave", function () { pointer.px = pointer.py = -1e4; pointer.tx = pointer.ty = 0; });
})();
