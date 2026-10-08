/* ============================================
   HOME INTERACTIONS (index.html)
   1. Project previews: a floating screenshot follows the cursor over the
      Portfolio list (touch screens get a small inline thumbnail instead).
   2. "What are you into?": pick interests and the list re-ranks itself by
      fit, matches slide up, the rest dim. Like a tiny recommender.
   3. "How I build": skills wired to the projects that use them; hover or
      tap either side to light up the connections.
   ============================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var list = document.querySelector('.plist');
  if (!list) return;
  var rows = Array.prototype.slice.call(list.querySelectorAll('.prow'));
  rows.forEach(function (r, i) { r.dataset.i = i; });

  initPreview();
  initPicker();
  initConstellation();

  // ── 1. Project previews ──────────────────────────────────────────────────
  function initPreview() {
    if (!fine) {
      rows.forEach(function (r) {
        if (!r.dataset.shot) return;
        var im = document.createElement('img');
        im.className = 'pthumb';
        im.src = r.dataset.shot;
        im.alt = '';
        im.loading = 'lazy';
        im.decoding = 'async';
        r.appendChild(im);
        r.classList.add('has-thumb');
      });
      return;
    }

    var pv = document.createElement('div');
    pv.className = 'pv';
    pv.setAttribute('aria-hidden', 'true');
    var img = document.createElement('img');
    img.alt = '';
    pv.appendChild(img);
    document.body.appendChild(pv);

    var W = 260, H = 163, GAP = 20;   // matches .pv in styles.css
    var cx = 0, cy = 0, tx = 0, ty = 0, rot = 0, sc = 0.92;
    var on = false, raf = 0, preloaded = false;

    function preload() {
      if (preloaded) return;
      preloaded = true;
      rows.forEach(function (r) { if (r.dataset.shot) { var i = new Image(); i.src = r.dataset.shot; } });
    }
    // Sit in the empty margin beside the list (so it never covers the text you
    // are reading) and follow the cursor up and down; fall back to trailing the
    // cursor itself when the window is too narrow for a margin.
    function aim(e) {
      var L = list.getBoundingClientRect(), x;
      if (L.left >= W + 2 * GAP) x = L.left - W - GAP + (e.clientX - L.left) * 0.04;
      else if (window.innerWidth - L.right >= W + 2 * GAP) x = L.right + GAP + (e.clientX - L.left) * 0.04;
      else {
        x = e.clientX + GAP;
        if (x + W > window.innerWidth - 16) x = e.clientX - W - GAP;
      }
      tx = x;
      ty = Math.max(12, Math.min(window.innerHeight - H - 12, e.clientY - H / 2));
    }
    function loop() {
      var dx = tx - cx, dy = ty - cy;
      cx += reduce ? dx : dx * 0.2;
      cy += reduce ? dy : dy * 0.2;
      var lean = reduce ? 0 : Math.max(-7, Math.min(7, dx * 0.06 + dy * 0.035));   // tilt into the motion
      rot += (lean - rot) * 0.2;
      sc += ((on ? 1 : 0.92) - sc) * 0.22;
      pv.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      var moving = Math.abs(dx) + Math.abs(dy) > 0.5 || Math.abs(rot) > 0.05 || (on ? sc < 0.999 : sc > 0.921);
      raf = moving ? requestAnimationFrame(loop) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    function show(r, e) {
      if (!r.dataset.shot) return;
      if (img.getAttribute('src') !== r.dataset.shot) img.src = r.dataset.shot;
      aim(e);
      if (!on && !pv.classList.contains('on')) { cx = tx; cy = ty; }   // appear at the cursor, don't fly in from a corner
      on = true;
      pv.classList.add('on');
      kick();
    }
    function hide() { on = false; pv.classList.remove('on'); kick(); }

    list.addEventListener('pointerenter', preload);
    rows.forEach(function (r) {
      r.addEventListener('pointerenter', function (e) { show(r, e); });
      r.addEventListener('pointermove', function (e) { if (on) { aim(e); kick(); } else { show(r, e); } });
      r.addEventListener('pointerleave', hide);
    });
    window.addEventListener('scroll', function () { if (on) hide(); }, { passive: true });
  }

  // ── 2. "What are you into?" ──────────────────────────────────────────────
  function initPicker() {
    var box = document.querySelector('.pick');
    if (!box) return;
    var chips = Array.prototype.slice.call(box.querySelectorAll('.pick-chip'));
    var note = box.querySelector('.pick-note');
    var clear = box.querySelector('.pick-clear');
    var sel = new Set();

    box.addEventListener('click', function (e) {
      var c = e.target.closest('.pick-chip');
      if (c) {
        var t = c.dataset.tag;
        if (sel.has(t)) sel.delete(t); else sel.add(t);
        c.setAttribute('aria-pressed', String(sel.has(t)));
        apply();
      } else if (e.target.closest('.pick-clear')) {
        sel.clear();
        chips.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        apply();
      }
    });

    function apply() {
      var before = new Map();
      rows.forEach(function (r) { before.set(r, r.getBoundingClientRect().top); });

      var scored = rows.map(function (r) {
        var tags = (r.dataset.tags || '').split(' ');
        var s = 0;
        tags.forEach(function (t) { if (sel.has(t)) s++; });
        return { r: r, s: s };
      });
      scored.sort(function (a, b) { return (b.s - a.s) || (a.r.dataset.i - b.r.dataset.i); });
      scored.forEach(function (o) {
        list.appendChild(o.r);
        o.r.classList.toggle('is-match', sel.size > 0 && o.s > 0);
        o.r.classList.toggle('is-dim', sel.size > 0 && o.s === 0);
      });

      var n = scored.filter(function (o) { return o.s > 0; }).length;
      note.textContent = sel.size ? n + (n === 1 ? ' project' : ' projects') + ' for you, best fit first' : '';
      clear.hidden = !sel.size;

      if (reduce) return;
      rows.forEach(function (r) {   // FLIP: slide each row from where it was
        var d = before.get(r) - r.getBoundingClientRect().top;
        if (Math.abs(d) > 1 && r.animate) {
          r.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }],
                    { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)' });
        }
      });
    }
  }

  // ── 3. "How I build" constellation ───────────────────────────────────────
  function initConstellation() {
    var sk = document.querySelector('.sk');
    if (!sk) return;
    var svg = sk.querySelector('.sk-lines');
    var skills = Array.prototype.slice.call(sk.querySelectorAll('.sk-skill'));
    var projs = Array.prototype.slice.call(sk.querySelectorAll('.sk-proj'));
    var byKey = {};
    projs.forEach(function (p) { byKey[p.dataset.k] = p; });
    var hover = null, pinned = null;   // { type: 'sk' | 'p', key }

    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (getComputedStyle(sk).getPropertyValue('--sk-lines').trim() === '0') { paint(); return; }
      var R = sk.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + R.width.toFixed(0) + ' ' + R.height.toFixed(0));
      skills.forEach(function (s) {
        s.dataset.p.split(' ').forEach(function (k) {
          var p = byKey[k];
          if (!p) return;
          var a = s.getBoundingClientRect(), b = p.getBoundingClientRect();
          var x1 = a.right - R.left + 6, y1 = a.top + a.height / 2 - R.top;
          var x2 = b.left - R.left - 6, y2 = b.top + b.height / 2 - R.top;
          var dx = (x2 - x1) * 0.55;
          var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + (x1 + dx) + ' ' + y1 + ' ' + (x2 - dx) + ' ' + y2 + ' ' + x2 + ' ' + y2);
          path.dataset.sk = s.dataset.sk;
          path.dataset.k = k;
          svg.appendChild(path);
        });
      });
      paint();
    }

    function paint() {
      var st = hover || pinned;
      sk.classList.toggle('is-active', !!st);
      var onSk = {}, onP = {};
      if (st && st.type === 'sk') {
        onSk[st.key] = 1;
        skills.forEach(function (s) { if (s.dataset.sk === st.key) s.dataset.p.split(' ').forEach(function (k) { onP[k] = 1; }); });
      } else if (st && st.type === 'p') {
        onP[st.key] = 1;
        skills.forEach(function (s) { if (s.dataset.p.split(' ').indexOf(st.key) !== -1) onSk[s.dataset.sk] = 1; });
      }
      skills.forEach(function (s) {
        s.classList.toggle('on', !!onSk[s.dataset.sk]);
        s.setAttribute('aria-pressed', String(!!(pinned && pinned.type === 'sk' && pinned.key === s.dataset.sk)));
      });
      projs.forEach(function (p) { p.classList.toggle('on', !!onP[p.dataset.k]); });
      Array.prototype.forEach.call(svg.querySelectorAll('path'), function (pa) {
        pa.classList.toggle('on', !!st && (st.type === 'sk' ? pa.dataset.sk === st.key : pa.dataset.k === st.key));
      });
    }

    function bind(el, type, key) {
      var enter = function () { hover = { type: type, key: key }; paint(); };
      var leave = function () { hover = null; paint(); };
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
      el.addEventListener('focus', enter);
      el.addEventListener('blur', leave);
    }
    skills.forEach(function (s) {
      bind(s, 'sk', s.dataset.sk);
      s.addEventListener('click', function () {   // tap/click pins a skill (handy on touch)
        pinned = (pinned && pinned.key === s.dataset.sk) ? null : { type: 'sk', key: s.dataset.sk };
        paint();
      });
    });
    projs.forEach(function (p) { bind(p, 'p', p.dataset.k); });

    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    window.addEventListener('load', draw);
    if ('ResizeObserver' in window) new ResizeObserver(draw).observe(sk);
    else window.addEventListener('resize', draw);
  }
})();
