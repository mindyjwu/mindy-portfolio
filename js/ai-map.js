/* ============================================================
   THE AI MONEY MAP — interaction
   Plain JS. Nodes are real DOM buttons; edges are one SVG overlay
   that is redrawn only for the active selection.
   ============================================================ */
(function () {
  'use strict';
  var D = window.AIMAP;
  var LAYERS = D.LAYERS, NODES = D.NODES, JOURNEYS = D.JOURNEYS;

  /* ---------- index ---------- */
  var PARENT = {
    'Alphabet': 'GOOGL', 'Alphabet subsidiary': 'GOOGL', 'Alphabet research': 'GOOGL',
    'Amazon': 'AMZN', 'Meta': 'META', 'Samsung': '005930.KS', 'Intel': 'INTC', 'Apple': 'AAPL',
    'Microsoft': 'MSFT', 'Tesla': 'TSLA', 'Blackstone': 'BX', 'Boeing': 'BA', 'Hitachi': '6501.T',
    'Atlas Copco': 'ATCO-A.ST'
  };
  var by = {}, down = {};
  NODES.forEach(function (n) { by[n.id] = n; });
  NODES.forEach(function (n) {
    n.up.forEach(function (u) { (down[u] = down[u] || []).push(n.id); });
    n.pq = n.q || PARENT[n.s] || '';
    if (n.l === 0) n.kind = 'life';
    else if (n.pq) n.kind = 'public';
    else if (/government|market structure|resource|commodity|metals|sovereign/i.test(n.s || '')) n.kind = 'other';
    else n.kind = 'private';
    n.hay = (n.n + ' ' + n.id + ' ' + (n.pq || '') + ' ' + (n.s || '') + ' ' + (n.w || '')).toLowerCase();
  });
  var edgeCount = NODES.reduce(function (a, n) { return a + n.up.length; }, 0);

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function logo(n, size) {
    var wrap = el('span', 'lg lg-' + size);
    if (n.e && !n.d) { wrap.classList.add('lg-emoji'); wrap.textContent = n.e; wrap.setAttribute('aria-hidden', 'true'); return wrap; }
    if (n.e) { wrap.classList.add('lg-emoji'); wrap.textContent = n.e; return wrap; }
    var mono = el('span', 'lg-mono', n.n.replace(/[^A-Za-z0-9 ]/g, '').split(' ').slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase());
    wrap.appendChild(mono);
    var img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.onload = function () { if (img.naturalWidth > 16) { wrap.appendChild(img); mono.style.display = 'none'; } };
    img.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(n.d) + '&sz=128';
    return wrap;
  }
  var mq = window.matchMedia('(max-width: 900px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- state ---------- */
  var state = { sel: null, hover: null, lens: 'all', query: '', depth: 'full', journey: null };
  var nodeEls = {};

  /* ---------- build the layers ---------- */
  var layersRoot = $('#layers');
  LAYERS.forEach(function (L, i) {
    var sec = el('section', 'layer');
    sec.id = 'layer-' + L.id;
    sec.dataset.l = i;
    sec.style.setProperty('--h', L.h);
    var head = el('header', 'layer-h');
    var num = el('span', 'layer-n', String(i).padStart(2, '0'));
    var t = el('div', 'layer-t');
    t.appendChild(el('h2', null, L.name));
    t.appendChild(el('p', 'layer-sub', L.sub));
    head.appendChild(num); head.appendChild(t);
    var info = el('details', 'layer-info');
    var sum = el('summary', null, 'What to know at this layer');
    info.appendChild(sum);
    var b1 = el('p'); var s1 = el('strong', null, 'Entry-level take. '); b1.appendChild(s1); b1.appendChild(document.createTextNode(L.take));
    var b2 = el('p'); var s2 = el('strong', null, 'Builder’s angle. '); b2.appendChild(s2); b2.appendChild(document.createTextNode(L.build));
    info.appendChild(b1); info.appendChild(b2);
    t.appendChild(info);
    var grid = el('div', 'nodes');
    NODES.filter(function (n) { return n.l === i; }).forEach(function (n) {
      var b = el('button', 'node k-' + n.kind);
      b.type = 'button';
      b.dataset.id = n.id;
      b.setAttribute('aria-label', n.n + (n.pq ? ', ' + n.pq : '') + (n.c ? ', chokepoint' : ''));
      b.appendChild(logo(n, 'm'));
      b.appendChild(el('span', 'node-n', n.n));
      var sub = n.kind === 'public' ? n.pq : n.kind === 'private' ? 'Private' : n.kind === 'life' ? '' : (n.kind === 'other' ? '' : '');
      if (sub) b.appendChild(el('span', 'node-t', sub));
      if (n.c) { var c = el('span', 'node-c', '◆'); c.title = 'Chokepoint: hard to replace'; b.appendChild(c); }
      grid.appendChild(b);
      nodeEls[n.id] = b;
    });
    sec.appendChild(head);
    sec.appendChild(grid);
    layersRoot.appendChild(sec);
    if (i < LAYERS.length - 1) {
      var flow = el('div', 'flow');
      flow.setAttribute('aria-hidden', 'true');
      flow.innerHTML = '<span>↓ dollars flow down</span><span>chips, power &amp; materials flow up ↑</span>';
      layersRoot.appendChild(flow);
    }
  });

  /* hero stats */
  $('#st-layers').textContent = LAYERS.length;
  $('#st-nodes').textContent = NODES.length;
  $('#st-links').textContent = edgeCount;
  $('#st-choke').textContent = NODES.filter(function (n) { return n.c; }).length;

  /* ---------- chains ---------- */
  function chain(id, maxDepth) {
    var ups = {}, downs = {}, edges = {};
    function walk(start, dir) {
      var seen = {}, q = [[start, 0]];
      seen[start] = 1;
      while (q.length) {
        var cur = q.shift(), x = cur[0], d = cur[1];
        if (d >= maxDepth) continue;
        var nbrs = dir === 'up' ? by[x].up : (down[x] || []);
        nbrs.forEach(function (y) {
          var key = dir === 'up' ? x + '>' + y : y + '>' + x;
          if (!edges[key]) edges[key] = { a: dir === 'up' ? x : y, b: dir === 'up' ? y : x, dir: dir, d: d + 1 };
          (dir === 'up' ? ups : downs)[y] = 1;
          if (!seen[y]) { seen[y] = 1; q.push([y, d + 1]); }
        });
      }
    }
    walk(id, 'up'); walk(id, 'down');
    return { id: id, ups: ups, downs: downs, edges: Object.keys(edges).map(function (k) { return edges[k]; }) };
  }

  /* ---------- filters ---------- */
  function matchesFilters(n) {
    if (state.lens === 'public' && n.kind !== 'public') return false;
    if (state.lens === 'private' && n.kind !== 'private') return false;
    if (state.lens === 'choke' && !n.c) return false;
    if (state.lens === 'other' && n.kind !== 'other') return false;
    if (state.query && n.hay.indexOf(state.query) === -1) return false;
    return true;
  }

  /* ---------- edge drawing ---------- */
  var svg = $('#edges'), map = $('#map');
  var NS = 'http://www.w3.org/2000/svg';
  var drawn = [];
  function rectOf(id) {
    var r = nodeEls[id].getBoundingClientRect(), m = map.getBoundingClientRect();
    return { x: r.left - m.left + r.width / 2, t: r.top - m.top, b: r.bottom - m.top, cx: r.left - m.left };
  }
  function drawEdges(list) {
    drawn = list;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('width', map.scrollWidth);
    svg.setAttribute('height', map.scrollHeight);
    list.forEach(function (e) {
      var A = rectOf(e.a), B = rectOf(e.b), d;
      if (Math.abs(A.t - B.t) < 8) {
        var y0 = A.b, drop = 34 + Math.min(60, Math.abs(A.x - B.x) * 0.08);
        d = 'M' + A.x + ' ' + y0 + ' C' + A.x + ' ' + (y0 + drop) + ',' + B.x + ' ' + (y0 + drop) + ',' + B.x + ' ' + y0;
      } else {
        var y1 = A.b, y2 = B.t, dy = Math.max(40, (y2 - y1) * 0.5);
        d = 'M' + A.x + ' ' + y1 + ' C' + A.x + ' ' + (y1 + dy) + ',' + B.x + ' ' + (y2 - dy) + ',' + B.x + ' ' + y2;
      }
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', 'edge ' + e.cls);
      svg.appendChild(p);
    });
  }

  /* ---------- highlight ---------- */
  var NODE_CLASSES = ['sel', 'sup', 'cus', 'dim', 'jn', 'off'];
  function apply() {
    var active = null, cls = {};
    var edges = [];
    if (state.journey) {
      var steps = state.journey.j.steps, cur = state.journey.i;
      active = true;
      steps.forEach(function (s, i) { cls[s[0]] = i === cur ? 'sel' : (i < cur ? 'jn' : 'jn'); });
      for (var i = 1; i <= cur; i++) edges.push({ a: steps[i - 1][0], b: steps[i][0], cls: 'jn' + (i === cur ? ' strong' : '') });
    } else {
      var focus = state.sel || state.hover;
      if (focus) {
        active = true;
        var depth = state.sel ? (state.depth === 'direct' ? 1 : 99) : 1;
        var c = chain(focus, depth);
        cls[focus] = 'sel';
        Object.keys(c.ups).forEach(function (k) { if (!cls[k]) cls[k] = 'sup'; });
        Object.keys(c.downs).forEach(function (k) { if (!cls[k]) cls[k] = 'cus'; });
        c.edges.forEach(function (e) { edges.push({ a: e.a, b: e.b, cls: (e.dir === 'up' ? 'sup' : 'cus') + (e.d === 1 ? ' strong' : '') }); });
      }
    }
    var shown = 0;
    NODES.forEach(function (n) {
      var e = nodeEls[n.id];
      NODE_CLASSES.forEach(function (k) { e.classList.remove(k); });
      var ok = matchesFilters(n);
      if (ok) shown++;
      if (active) { if (cls[n.id]) e.classList.add(cls[n.id]); else e.classList.add('dim'); }
      if (!ok) e.classList.add('off');
    });
    $('#count').textContent = (state.lens === 'all' && !state.query) ? NODES.length + ' players' : shown + ' of ' + NODES.length;
    map.classList.toggle('has-active', !!active);
    drawEdges(edges);
  }

  /* ---------- detail panel ---------- */
  var panel = $('#panel'), pbody = $('#panel-body');
  var KIND_LABEL = { life: 'Daily life', public: 'Public company', private: 'Private company', other: 'Not a company' };
  function chipList(ids, emptyMsg) {
    var wrap = el('div', 'chips');
    if (!ids.length) { wrap.appendChild(el('span', 'muted', emptyMsg)); return wrap; }
    ids.forEach(function (id) {
      var n = by[id];
      var b = el('button', 'chip');
      b.type = 'button';
      b.appendChild(logo(n, 's'));
      b.appendChild(el('span', null, n.n));
      b.addEventListener('click', function () { select(id, { scroll: true }); });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function section(title, bodyNode) {
    var s = el('section', 'p-sec');
    s.appendChild(el('h3', null, title));
    s.appendChild(bodyNode);
    return s;
  }
  function para(text) { return el('p', null, text); }
  function renderPanel(id) {
    var n = by[id], L = LAYERS[n.l];
    pbody.textContent = '';
    pbody.style.setProperty('--h', L.h);
    var head = el('div', 'p-head');
    head.appendChild(logo(n, 'l'));
    var ht = el('div', 'p-ht');
    ht.appendChild(el('h2', null, n.n));
    var badges = el('div', 'badges');
    var kindTxt = KIND_LABEL[n.kind];
    if (n.kind === 'public') kindTxt += ' · ' + n.pq;
    badges.appendChild(el('span', 'badge k-' + n.kind, kindTxt));
    if (n.s && n.kind !== 'life') badges.appendChild(el('span', 'badge soft', n.s));
    if (n.c) badges.appendChild(el('span', 'badge warn', '◆ Chokepoint'));
    ht.appendChild(badges);
    ht.appendChild(el('div', 'p-layer', 'Layer ' + String(n.l).padStart(2, '0') + ' · ' + L.name));
    head.appendChild(ht);
    pbody.appendChild(head);

    pbody.appendChild(section('What they do', para(n.w)));
    pbody.appendChild(section('Why they matter', para(n.y)));
    if (n.p) {
      var pb = el('div');
      pb.appendChild(para(n.p));
      pb.appendChild(el('p', 'fine', 'Qualitative, from my knowledge to roughly mid-2026. Not live data — use the quote link for current figures.'));
      pbody.appendChild(section('How they’re doing', pb));
    }
    var ob = el('div');
    ob.appendChild(para(n.o || L.take));
    var bp = el('p', 'angle'); bp.appendChild(el('strong', null, 'Builder’s angle. ')); bp.appendChild(document.createTextNode(L.build));
    ob.appendChild(bp);
    pbody.appendChild(section('Where the opportunity is', ob));

    pbody.appendChild(section('Who they depend on (one step down)', chipList(n.up, 'Nothing mapped below: they sit at the bottom of this chain.')));
    pbody.appendChild(section('Who depends on them (one step up)', chipList(down[id] || [], 'Nothing mapped above: they sit at the top of this chain.')));

    var links = el('div', 'p-links');
    if (n.d) { var a = el('a', null, 'Website ↗'); a.href = 'https://' + n.d; a.target = '_blank'; a.rel = 'noopener'; links.appendChild(a); }
    if (n.pq) { var q = el('a', null, 'Live quote ↗'); q.href = 'https://finance.yahoo.com/quote/' + encodeURIComponent(n.pq); q.target = '_blank'; q.rel = 'noopener'; links.appendChild(q); }
    var sh = el('button', null, 'Copy link'); sh.type = 'button';
    sh.addEventListener('click', function () {
      var url = location.origin + location.pathname + '#n=' + id;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { sh.textContent = 'Copied ✓'; }, function () { sh.textContent = url; });
      setTimeout(function () { sh.textContent = 'Copy link'; }, 2200);
    });
    links.appendChild(sh);
    pbody.appendChild(links);
    pbody.appendChild(el('p', 'fine', 'Educational, not investment advice. Lines on the map show typical, publicly known relationships, simplified.'));
    pbody.scrollTop = 0;
  }
  function openPanel(id) {
    renderPanel(id);
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('has-panel');
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-panel');
  }

  /* ---------- selection ---------- */
  function setHash(h) {
    try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch (e) {}
  }
  function select(id, opts) {
    endJourney(true);
    state.sel = id; state.hover = null;
    openPanel(id);
    apply();
    setHash('n=' + id);
    if ((opts && opts.scroll) || mq.matches) {
      var e = nodeEls[id];
      setTimeout(function () { e.scrollIntoView({ block: mq.matches ? 'start' : 'center', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); }, 60);
    }
  }
  function clearSel() {
    state.sel = null; state.hover = null;
    closePanel(); apply(); setHash('');
  }

  layersRoot.addEventListener('click', function (ev) {
    var b = ev.target.closest('.node');
    if (!b) return;
    var id = b.dataset.id;
    if (state.sel === id) clearSel(); else select(id);
  });
  layersRoot.addEventListener('mouseover', function (ev) {
    if (state.sel || state.journey || mq.matches) return;
    var b = ev.target.closest('.node');
    var id = b ? b.dataset.id : null;
    if (id !== state.hover) { state.hover = id; apply(); }
  });
  layersRoot.addEventListener('mouseleave', function () {
    if (state.hover) { state.hover = null; apply(); }
  });
  $('#panel-close').addEventListener('click', clearSel);

  /* ---------- controls ---------- */
  var search = $('#q');
  search.addEventListener('input', function () { state.query = search.value.trim().toLowerCase(); apply(); });
  search.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') {
      var m = NODES.filter(matchesFilters)[0];
      if (m && state.query) { select(m.id, { scroll: true }); }
    }
    if (ev.key === 'Escape') { search.value = ''; state.query = ''; apply(); search.blur(); }
  });
  document.querySelectorAll('[data-lens]').forEach(function (b) {
    b.addEventListener('click', function () { setLens(b.dataset.lens); });
  });
  function setLens(l) {
    state.lens = l;
    document.querySelectorAll('[data-lens]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lens === l)); });
    apply();
  }
  document.querySelectorAll('[data-depth]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.depth = b.dataset.depth;
      document.querySelectorAll('[data-depth]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      apply();
    });
  });
  $('#reset').addEventListener('click', function () {
    search.value = ''; state.query = '';
    endJourney(true); state.sel = null; closePanel(); setLens('all'); setHash('');
    window.scrollTo({ top: $('#map-top').offsetTop - 90, behavior: reduced ? 'auto' : 'smooth' });
  });
  document.addEventListener('keydown', function (ev) {
    var tag = (document.activeElement || {}).tagName;
    if (ev.key === '/' && tag !== 'INPUT') { ev.preventDefault(); search.focus(); }
    if (ev.key === 'Escape') {
      if (state.journey) endJourney(); else if (state.sel) clearSel();
    }
    if (state.journey && tag !== 'INPUT') {
      if (ev.key === 'ArrowRight') stepJourney(1);
      if (ev.key === 'ArrowLeft') stepJourney(-1);
    }
  });

  /* "you are here" layer tracker */
  var here = $('#here');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var i = +en.target.dataset.l;
          here.textContent = String(i).padStart(2, '0') + ' · ' + LAYERS[i].name;
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.layer').forEach(function (s) { io.observe(s); });
  }

  /* ---------- journeys ---------- */
  var jcard = $('#journey'), jsel = $('#jsel');
  JOURNEYS.forEach(function (j) {
    var o = el('option', null, j.title); o.value = j.id; jsel.appendChild(o);
    var card = $('#jcards');
    var b = el('button', 'jcard'); b.type = 'button';
    b.appendChild(el('strong', null, j.title));
    b.appendChild(el('span', null, j.blurb));
    var go = el('em', null, j.steps.length + ' steps →'); b.appendChild(go);
    b.addEventListener('click', function () { startJourney(j.id); });
    card.appendChild(b);
  });
  jsel.addEventListener('change', function () { if (jsel.value) startJourney(jsel.value); });
  function startJourney(id) {
    var j = JOURNEYS.filter(function (x) { return x.id === id; })[0];
    if (!j) return;
    state.sel = null; state.hover = null; closePanel();
    state.journey = { j: j, i: 0 };
    jcard.hidden = false;
    document.body.classList.add('in-journey');
    renderJourney(true);
    setHash('j=' + id);
  }
  function renderJourney(scroll) {
    var jj = state.journey, s = jj.j.steps[jj.i], n = by[s[0]];
    jcard.textContent = '';
    var top = el('div', 'j-top');
    top.appendChild(el('span', 'j-title', jj.j.title));
    var x = el('button', 'j-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'End journey');
    x.addEventListener('click', function () { endJourney(); });
    top.appendChild(x);
    var row = el('div', 'j-row');
    row.appendChild(logo(n, 'l'));
    var tx = el('div', 'j-tx');
    tx.appendChild(el('div', 'j-n', n.n));
    tx.appendChild(el('div', 'j-l', 'Layer ' + String(n.l).padStart(2, '0') + ' · ' + LAYERS[n.l].name));
    tx.appendChild(el('p', 'j-p', s[1]));
    row.appendChild(tx);
    var nav = el('div', 'j-nav');
    var prev = el('button', 'j-b', '← Back'); prev.type = 'button'; prev.disabled = jj.i === 0;
    prev.addEventListener('click', function () { stepJourney(-1); });
    var dots = el('div', 'j-dots');
    jj.j.steps.forEach(function (_, i) { var d = el('span', i <= jj.i ? 'on' : ''); dots.appendChild(d); });
    var last = jj.i === jj.j.steps.length - 1;
    var next = el('button', 'j-b primary', last ? 'Open details' : 'Next →'); next.type = 'button';
    next.addEventListener('click', function () { if (last) select(s[0], { scroll: true }); else stepJourney(1); });
    nav.appendChild(prev); nav.appendChild(dots); nav.appendChild(next);
    jcard.appendChild(top); jcard.appendChild(row); jcard.appendChild(nav);
    apply();
    if (scroll) {
      nodeEls[s[0]].scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }
  }
  function stepJourney(d) {
    if (!state.journey) return;
    var i = state.journey.i + d;
    if (i < 0 || i >= state.journey.j.steps.length) return;
    state.journey.i = i;
    renderJourney(true);
  }
  function endJourney(silent) {
    if (!state.journey) return;
    state.journey = null; jcard.hidden = true; jsel.value = '';
    document.body.classList.remove('in-journey');
    if (!silent) { apply(); setHash(''); }
  }

  /* "four ways in" buttons */
  document.querySelectorAll('[data-go-lens]').forEach(function (b) {
    b.addEventListener('click', function () {
      setLens(b.dataset.goLens);
      window.scrollTo({ top: $('#map-top').offsetTop - 90, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ---------- redraw on layout change ---------- */
  var raf = 0;
  function redraw() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { if (drawn.length) drawEdges(drawn); }); }
  if ('ResizeObserver' in window) new ResizeObserver(redraw).observe(map);
  window.addEventListener('resize', redraw);
  window.addEventListener('load', redraw);
  document.querySelectorAll('.layer-info').forEach(function (d) { d.addEventListener('toggle', redraw); });

  /* ---------- theme toggle ---------- */
  var tbtn = $('#theme');
  tbtn.addEventListener('click', function () {
    var t = document.documentElement.dataset.mwTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.mwTheme = t;
    try { localStorage.setItem('mw-theme', t); } catch (e) {}
  });

  /* ---------- initial state from URL ---------- */
  apply();
  var m = /^#(n|j)=([\w-]+)/.exec(location.hash);
  if (m) {
    if (m[1] === 'n' && by[m[2]]) { select(m[2]); setTimeout(function () { nodeEls[m[2]].scrollIntoView({ block: 'center' }); }, 120); }
    if (m[1] === 'j') startJourney(m[2]);
  }
})();
