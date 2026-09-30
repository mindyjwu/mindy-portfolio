/* ============================================
   LIQUID SURFACE — Home + About
   A small wave simulation drawn behind the page: the pointer disturbs it and
   ripples spread out and fade like liquid silver. It runs on a coarse grid
   (~40k cells) and is scaled up with smoothing, so it stays cheap. Off for
   prefers-reduced-motion; paused while the tab is hidden.
   Also: a cursor-following glow on portfolio/history rows, and scroll reveal.
   ============================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initRows();
  initReveal();

  var canvas = document.getElementById('liquid');
  if (!canvas) return;
  var ctx = reduce ? null : canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  var DAMP = 0.975;            // lower = ripples die out sooner
  var CELL, W, H, cur, prev, img, px;

  function resize() {
    var vw = window.innerWidth, vh = window.innerHeight;
    CELL = Math.max(6, Math.ceil(Math.sqrt((vw * vh) / 40000)));
    W = Math.ceil(vw / CELL) + 2;   // one border cell each side
    H = Math.ceil(vh / CELL) + 2;
    canvas.width = W;
    canvas.height = H;
    // Size the canvas so cell (1,1) sits exactly at the viewport's top-left.
    canvas.style.width = (W * CELL) + 'px';
    canvas.style.height = (H * CELL) + 'px';
    canvas.style.left = -CELL + 'px';
    canvas.style.top = -CELL + 'px';
    cur = new Float32Array(W * H);
    prev = new Float32Array(W * H);
    img = ctx.createImageData(W, H);
    px = new Uint32Array(img.data.buffer);
  }
  resize();
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // A touch is a ring-shaped impulse (zero at the centre and the edge), so the
  // first frames already read as a ring on water rather than a raised bead.
  function drop(cx, cy, r, strength) {
    var x0 = Math.max(1, Math.floor(cx - r)), x1 = Math.min(W - 2, Math.ceil(cx + r));
    var y0 = Math.max(1, Math.floor(cy - r)), y1 = Math.min(H - 2, Math.ceil(cy + r));
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (d < r) cur[y * W + x] += strength * Math.sin(Math.PI * d / r);
      }
    }
  }

  // Pointer: no continuous wake (that reads as a tail). Instead drop a clean
  // ring every ~56px of travel, like touching still water as you pass over it.
  var SPACING_PX = 56, lastDrop = null;
  function touch(e, strength) {
    var x = e.clientX / CELL + 1, y = e.clientY / CELL + 1;
    drop(x, y, 3.2, strength);
    lastDrop = { x: x, y: y };
  }
  window.addEventListener('pointermove', function (e) {
    var x = e.clientX / CELL + 1, y = e.clientY / CELL + 1;
    if (!lastDrop) { lastDrop = { x: x, y: y }; return; }
    var dx = x - lastDrop.x, dy = y - lastDrop.y;
    if (Math.sqrt(dx * dx + dy * dy) * CELL >= SPACING_PX) touch(e, 26);
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) { touch(e, 60); }, { passive: true });
  document.addEventListener('pointerleave', function () { lastDrop = null; });
  window.addEventListener('blur', function () { lastDrop = null; });

  function step() {
    for (var y = 1; y < H - 1; y++) {
      var row = y * W;
      for (var x = 1; x < W - 1; x++) {
        var i = row + x;
        prev[i] = ((cur[i - 1] + cur[i + 1] + cur[i - W] + cur[i + W]) * 0.5 - prev[i]) * DAMP;
      }
    }
    var t = prev; prev = cur; cur = t;
  }

  // Shade from the surface slope: light from the top-left makes silver
  // highlights on one face of each ripple and blue-slate troughs on the other.
  function render() {
    var dark = root.dataset.mwTheme === 'dark';
    var hr = dark ? 176 : 255, hg = dark ? 212 : 255, hb = dark ? 236 : 255, hiA = dark ? 0.55 : 0.8;
    var lr = dark ? 4 : 47, lg = dark ? 10 : 102, lb = dark ? 16 : 144, loA = dark ? 0.4 : 0.14;
    for (var y = 1; y < H - 1; y++) {
      var row = y * W;
      for (var x = 1; x < W - 1; x++) {
        var i = row + x;
        var s = (cur[i - 1] - cur[i + 1]) + (cur[i - W] - cur[i + W]);
        var k, a;
        if (s > 0.4) {
          k = s > 30 ? 1 : s / 30; k = k * k * (3 - 2 * k);
          a = (k * hiA * 255) | 0;
          px[i] = (a << 24) | (hb << 16) | (hg << 8) | hr;
        } else if (s < -0.4) {
          k = -s > 30 ? 1 : -s / 30; k = k * k;
          a = (k * loA * 255) | 0;
          px[i] = (a << 24) | (lb << 16) | (lg << 8) | lr;
        } else {
          px[i] = 0;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // A drop now and then keeps the surface alive when nobody is touching it.
  var nextAmbient = performance.now() + 900, raf = 0;
  function frame(now) {
    if (now >= nextAmbient) {
      drop(1 + Math.random() * (W - 2), 1 + Math.random() * (H - 2), 3.2, 20);
      nextAmbient = now + 2000 + Math.random() * 2600;
    }
    step();
    render();
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  });
  raf = requestAnimationFrame(frame);

  // ── Rows: cursor glow, and the whole row opens its project ──────────────
  function initRows() {
    var rows = document.querySelectorAll('.prow, .hrow');
    for (var n = 0; n < rows.length; n++) (function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }, { passive: true });
      var link = el.querySelector('a.pname');
      if (!link) return;
      el.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        var sel = window.getSelection && window.getSelection();
        if (sel && String(sel)) return;          // let people copy text
        link.click();
      });
    })(rows[n]);
  }

  // ── Scroll reveal (only when motion is welcome and JS runs) ─────────────
  // The <head> script adds .js-reveal only when motion is welcome and
  // IntersectionObserver exists; a CSS fail-safe shows everything after 3s anyway.
  function initReveal() {
    if (!root.classList.contains('js-reveal')) return;
    root.classList.add('reveal-ready');
    var items = document.querySelectorAll('.sec-h, .prow, .hrow, .about-wrap > *');
    if (!items.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    for (var i = 0; i < items.length; i++) {
      items[i].style.setProperty('--d', (i % 7) * 70 + 'ms');
      io.observe(items[i]);
    }
  }
})();
