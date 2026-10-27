/* ============================================
   FOLLOW AN ORDER (index.html hero)
   A pulse walks one Amazon order down the AI supply chain to a quartz mine.
   The eight steps and their wording come straight from the "Your Amazon order
   to a quartz mine" journey in The AI Ecosystem (ai-eco-diagram repo).
   Autoplays only while on screen; hover, focus or a click pauses it; the
   pause button and reduced-motion both stop it for good.
   ============================================ */
(function () {
  'use strict';

  var box = document.getElementById('tr');
  if (!box) return;

  var STEPS = [
    ['Order',    'Your order',      'You tap "buy" on something a recommendation engine put in front of you.'],
    ['Amazon',   'Amazon',          'Amazon earns the sale, runs the marketplace, and pays for the AI behind search, ads and delivery.'],
    ['AWS',      'AWS',             'All of that runs on AWS, Amazon\'s own cloud, which doubles as its biggest profit engine.'],
    ['Trainium', 'Trainium chips',  'Part of the AI work runs on Amazon\'s custom Trainium chips.'],
    ['TSMC',     'TSMC',            'Those chips are made by TSMC.'],
    ['SUMCO',    'SUMCO wafers',    'TSMC starts with silicon wafers from companies like SUMCO.'],
    ['Crucible', 'A quartz crucible', 'Wafers are sliced from a crystal that grows inside a quartz crucible.'],
    ['Quartz',   'A quartz mine',   'That crucible needs some of the purest quartz on Earth, from a few mines in North Carolina and Norway.']
  ];
  var N = STEPS.length, STEP_MS = 3400, HOLD_MS = 2600;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nodesEl = box.querySelector('.tr-nodes');
  var fill = box.querySelector('.tr-line i');
  var stepEl = box.querySelector('.tr-step');
  var nameEl = box.querySelector('.tr-name');
  var txtEl = box.querySelector('.tr-txt');
  var capEl = box.querySelector('.tr-cap');
  var pp = box.querySelector('.tr-pp');

  var nodes = STEPS.map(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tr-node';
    b.setAttribute('aria-label', 'Step ' + (i + 1) + ' of ' + N + ': ' + s[1]);
    b.innerHTML = '<span class="tr-dot"></span><span class="tr-lab"></span>';
    b.querySelector('.tr-lab').textContent = s[0];
    b.addEventListener('click', function () { userPause(); show(i); });
    nodesEl.appendChild(b);
    return b;
  });

  var cur = 0, timer = 0, visible = false, hovering = false, userPaused = reduce, swapTimer = 0;

  function show(i, instant) {
    cur = (i + N) % N;
    nodes.forEach(function (n, k) {
      n.classList.toggle('on', k === cur);
      n.classList.toggle('done', k < cur);
      n.setAttribute('aria-current', k === cur ? 'step' : 'false');
    });
    fill.style.width = (cur / (N - 1) * 100).toFixed(1) + '%';
    stepEl.textContent = 'Step ' + (cur + 1) + ' of ' + N;
    clearTimeout(swapTimer);
    if (instant || reduce) setCaption();
    else { capEl.classList.add('swap'); swapTimer = setTimeout(function () { setCaption(); capEl.classList.remove('swap'); }, 170); }
  }
  function setCaption() {
    nameEl.textContent = STEPS[cur][1];
    txtEl.textContent = STEPS[cur][2];
  }

  function schedule() {
    clearTimeout(timer);
    if (userPaused || hovering || !visible || document.hidden) return;
    timer = setTimeout(function () { show(cur + 1); schedule(); }, cur === N - 1 ? HOLD_MS : STEP_MS);
  }
  function userPause() { userPaused = true; syncBtn(); clearTimeout(timer); }
  function syncBtn() {
    var playing = !userPaused;
    box.classList.toggle('is-playing', playing);
    pp.setAttribute('aria-label', playing ? 'Pause the walkthrough' : 'Play the walkthrough');
    pp.setAttribute('aria-pressed', String(!playing));
  }

  pp.addEventListener('click', function () {
    userPaused = !userPaused;
    syncBtn();
    if (!userPaused && cur === N - 1) show(0);
    schedule();
  });
  box.addEventListener('pointerenter', function () { hovering = true; clearTimeout(timer); });
  box.addEventListener('pointerleave', function () { hovering = false; schedule(); });
  box.addEventListener('focusin', function () { hovering = true; clearTimeout(timer); });
  box.addEventListener('focusout', function () { hovering = false; schedule(); });
  document.addEventListener('visibilitychange', schedule);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      schedule();
    }, { threshold: 0.4 }).observe(box);
  } else { visible = true; }

  show(0, true);
  syncBtn();
  box.hidden = false;
  schedule();
})();
