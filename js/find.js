/* ============================================
   FIND + KEYBOARD SHORTCUTS (index.html, about.html)
   F or / (or Cmd/Ctrl+K) opens a numbered palette of every page, project and
   job. H Home, P Portfolio, Y History, A About, M dark mode. Shortcuts are
   ignored while typing in a field. The nav button is added from here so the
   shared nav markup stays identical on every page.
   ============================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAG = 'A complex problem, and the creative fix hiding inside it';

  var ITEMS = [
    { g: 'Pages', t: 'Home', h: 'Start here', u: 'index.html', k: 'H' },
    { g: 'Pages', t: 'Portfolio', h: 'Six featured projects and what else I am building', u: 'index.html#portfolio', k: 'P' },
    { g: 'Pages', t: 'How I build', h: 'Tech skills, wired to the projects that use them', u: 'index.html#skills' },
    { g: 'Pages', t: 'History', h: 'Work and school, from high level', u: 'index.html#history', k: 'Y' },
    { g: 'Pages', t: 'About', h: 'My story', u: 'about.html', k: 'A' },
    { g: 'Pages', t: 'How I think', h: 'Soft skills, tied to jobs and projects', u: 'about.html#think' },

    { g: 'Projects', t: 'The AI Ecosystem', h: 'About 410 companies across 29 layers of AI', u: 'https://ai-eco-diagram.vercel.app' },
    { g: 'Projects', t: 'Zengxin Care Ops', h: 'Operations portal for a day-care operator in Taiwan', u: 'index.html#portfolio' },
    { g: 'Projects', t: 'Quantum Playground', h: 'Hands-on quantum computing, puzzles and labs', u: 'https://quantum-playground-five.vercel.app' },
    { g: 'Projects', t: 'Mood Wall', h: 'Real art, books, music and film for a feeling', u: 'mood.html' },
    { g: 'Projects', t: 'Stock Advisor', h: 'Scores stocks, then grades its own calls', u: 'stock-advisor.html' },
    { g: 'Projects', t: 'Turnout', h: 'Rotating hosts for real-life gatherings', u: 'turnout.html' },
    { g: 'Projects', t: 'SIGNAL', h: 'AI news in short, sourced reads', u: 'signal.html' },
    { g: 'Projects', t: 'Festival Clash Resolver', h: 'Set clashes and routes, offline', u: 'festival-clash-resolver.html' },
    { g: 'Projects', t: 'Global Explorer', h: '3D globe with The Met highlights', u: 'https://global-explorer-ivory.vercel.app' },
    { g: 'Projects', t: 'self-spend', h: 'A keeper, not a budget', u: 'https://selfspend.vercel.app' },
    { g: 'Projects', t: 'Buddy', h: 'Wellness check-in and monthly report', u: 'https://wellness-buddy-chi.vercel.app' },
    { g: 'Projects', t: 'People Like Me', h: 'Providers ranked by people like you', u: 'people-like-me.html' },
    { g: 'Projects', t: 'GenAI', h: 'Two AI personas, two communication styles', u: 'https://gender-ai.vercel.app' },
    { g: 'Projects', t: 'tutorial-forge', h: 'Plain-English request to narrated how-to video', u: 'https://github.com/mindyjwu/tutorial-forge' },

    { g: 'Experience', t: 'Qvest', h: 'Technology Consultant, 2023 to now', u: 'index.html#h-qvest' },
    { g: 'Experience', t: 'KPMG', h: 'Data Analytics Consultant Intern, 2022', u: 'index.html#h-kpmg' },
    { g: 'Experience', t: 'Taiwan Mobile & NVIDIA', h: 'GTM Solutions Intern, 2020', u: 'index.html#h-twm' },
    { g: 'Experience', t: 'NYU', h: 'B.A. Computer Science & Data Science, 2019 to 2023', u: 'index.html#h-nyu' },

    { g: 'Elsewhere', t: 'LinkedIn', h: 'linkedin.com/in/mindyjwu', u: 'https://linkedin.com/in/mindyjwu/' },
    { g: 'Elsewhere', t: 'GitHub', h: 'github.com/mindyjwu', u: 'https://github.com/mindyjwu' },

    { g: 'Actions', t: 'Toggle dark mode', h: 'Switch between day and night', a: 'theme', k: 'M' }
  ];

  var isExternal = function (u) { return /^https?:/.test(u); };
  var here = location.pathname.replace(/\/+$/, '').split('/').pop() || 'index.html';
  if (here.indexOf('.') === -1) here = 'index.html';

  // ── build the palette ────────────────────────────────────────────────────
  var root = document.createElement('div');
  root.className = 'fd';
  root.innerHTML =
    '<div class="fd-bg"></div>' +
    '<div class="fd-box" role="dialog" aria-modal="true" aria-label="Find a page or project">' +
      '<label class="fd-in"><span class="fd-pre">mindy /</span>' +
        '<input type="text" class="fd-q" placeholder="find a project, a job, a page" autocomplete="off" spellcheck="false" aria-controls="fd-list">' +
      '</label>' +
      '<div class="fd-list" id="fd-list" role="listbox"></div>' +
      '<div class="fd-ft"><span class="fd-keys"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>enter</kbd> go <kbd>esc</kbd> close</span><span class="fd-tag"></span></div>' +
    '</div>';
  document.body.appendChild(root);
  var box = root.querySelector('.fd-box');
  var input = root.querySelector('.fd-q');
  var list = root.querySelector('.fd-list');
  root.querySelector('.fd-tag').textContent = TAG;

  var shown = [], active = 0, openFlag = false, lastFocus = null;

  function match(it, q) {
    var hay = (it.t + ' ' + it.h + ' ' + it.g).toLowerCase();
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }
  function render() {
    var q = input.value.trim().toLowerCase();
    shown = ITEMS.filter(function (it) { return !q || match(it, q); });
    if (q) shown.sort(function (a, b) {
      var as = a.t.toLowerCase().indexOf(q) === 0 ? 0 : 1, bs = b.t.toLowerCase().indexOf(q) === 0 ? 0 : 1;
      return as - bs;
    });
    if (active >= shown.length) active = Math.max(0, shown.length - 1);
    list.innerHTML = '';
    if (!shown.length) {
      var none = document.createElement('div');
      none.className = 'fd-none';
      none.textContent = 'Nothing matches "' + input.value.trim() + '"';
      list.appendChild(none);
      return;
    }
    var lastG = '';
    shown.forEach(function (it, i) {
      if (!q && it.g !== lastG) {
        var gh = document.createElement('div');
        gh.className = 'fd-g';
        gh.textContent = it.g;
        list.appendChild(gh);
        lastG = it.g;
      }
      var r = document.createElement('div');
      r.className = 'fd-row' + (i === active ? ' on' : '');
      r.id = 'fd-r' + i;
      r.setAttribute('role', 'option');
      r.setAttribute('aria-selected', String(i === active));
      var num = (i + 1 < 10 ? '0' : '') + (i + 1);
      r.innerHTML = '<span class="fd-n">' + num + '</span>' +
        '<span class="fd-m"><span class="fd-t"></span><span class="fd-h"></span></span>' +
        '<span class="fd-r"></span>';
      r.querySelector('.fd-t').textContent = it.t + (it.u && isExternal(it.u) ? ' ↗' : '');
      r.querySelector('.fd-h').textContent = it.h;
      r.querySelector('.fd-r').textContent = it.k ? it.k : (q ? it.g : '');
      r.addEventListener('mousemove', function () { if (active !== i) { active = i; paint(); } });
      r.addEventListener('click', function () { choose(i); });
      list.appendChild(r);
    });
    input.setAttribute('aria-activedescendant', 'fd-r' + active);
  }
  function paint() {
    var rows = list.querySelectorAll('.fd-row');
    Array.prototype.forEach.call(rows, function (r, i) {
      r.classList.toggle('on', i === active);
      r.setAttribute('aria-selected', String(i === active));
    });
    input.setAttribute('aria-activedescendant', 'fd-r' + active);
  }
  function scrollActive() {
    var r = list.querySelector('.fd-row.on');
    if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' });
  }

  function theme() {
    var b = document.querySelector('.mpnav__theme');
    if (b) b.click();
  }
  function go(it) {
    if (it.a === 'theme') { theme(); return; }
    var u = it.u;
    if (isExternal(u)) { window.open(u, '_blank', 'noopener'); return; }
    var file = u.split('#')[0], hash = u.indexOf('#') > -1 ? u.slice(u.indexOf('#')) : '';
    if (file === here) {                       // already on this page: just scroll
      if (hash) {
        var el = document.getElementById(hash.slice(1));
        if (el) { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); history.replaceState(null, '', hash); return; }
      }
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', location.pathname);
      return;
    }
    location.href = u;
  }
  function choose(i) {
    var it = shown[i];
    if (!it) return;
    close(true);
    go(it);
  }

  function open() {
    if (openFlag) return;
    openFlag = true;
    lastFocus = document.activeElement;
    input.value = '';
    active = 0;
    render();
    root.classList.add('open');
    document.documentElement.classList.add('fd-lock');
    input.focus();
  }
  function close(skipRestore) {
    if (!openFlag) return;
    openFlag = false;
    root.classList.remove('open');
    document.documentElement.classList.remove('fd-lock');
    if (!skipRestore && lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  input.addEventListener('input', function () { active = 0; render(); });
  root.querySelector('.fd-bg').addEventListener('click', function () { close(); });

  // ── keys ─────────────────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    var k = e.key;

    if (openFlag) {
      if (k === 'Escape') { e.preventDefault(); close(); }
      else if (k === 'ArrowDown') { e.preventDefault(); if (shown.length) { active = (active + 1) % shown.length; paint(); scrollActive(); } }
      else if (k === 'ArrowUp') { e.preventDefault(); if (shown.length) { active = (active - 1 + shown.length) % shown.length; paint(); scrollActive(); } }
      else if (k === 'Enter') { e.preventDefault(); choose(active); }
      else if (k === 'Tab') { e.preventDefault(); input.focus(); }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && (k === 'k' || k === 'K')) { e.preventDefault(); open(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey && k.length > 1) return;

    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;

    var lk = k.length === 1 ? k.toLowerCase() : k;
    if (lk === 'f' || lk === '/') { e.preventDefault(); open(); }
    else if (lk === 'h') go(ITEMS[0]);
    else if (lk === 'p') go(ITEMS[1]);
    else if (lk === 'y') go(ITEMS[3]);
    else if (lk === 'a') go(ITEMS[4]);
    else if (lk === 'm') theme();
  });

  // ── nav button (added here so the shared nav stays identical on every page)
  var links = document.querySelector('.mpnav__links');
  if (links) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mpnav__find';
    btn.setAttribute('aria-label', 'Find a page or project');
    btn.title = 'Find (F)';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><span class="mpnav__find-t">Find</span><kbd>F</kbd>';
    btn.addEventListener('click', open);
    links.insertBefore(btn, links.querySelector('.mpnav__theme'));
  }
})();
