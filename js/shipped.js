/* ============================================
   SHIPPED (index.html)
   The dated list is plain HTML. This reads each row's date and draws the
   cadence chart above it, one dot per project grouped by month. Hover a dot
   or a row and its partner lights up. Add a row to the list and the chart,
   count and "since" date update on their own.
   ============================================ */
(function () {
  'use strict';

  var list = document.getElementById('sh-list');
  var chart = document.getElementById('sh-chart');
  var sub = document.getElementById('sh-sub');
  if (!list || !chart) return;

  var rows = Array.prototype.slice.call(list.querySelectorAll('.sh-row'));
  if (!rows.length) return;

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function parse(d) { var p = d.split('-'); return { y: +p[0], m: +p[1] - 1, d: +p[2] }; }

  var items = rows.map(function (r, i) { var p = parse(r.dataset.d); return { row: r, i: i, y: p.y, m: p.m, d: p.d, k: p.y * 12 + p.m }; });
  var min = Math.min.apply(null, items.map(function (x) { return x.k; }));
  var max = Math.max.apply(null, items.map(function (x) { return x.k; }));
  var oldest = items.reduce(function (a, b) { return (b.k * 40 + b.d < a.k * 40 + a.d) ? b : a; });

  if (sub) sub.textContent = items.length + ' projects since ' + LONG[oldest.m] + ' ' + oldest.d + ', newest first.';

  var cols = [];
  for (var k = min; k <= max; k++) cols.push({ k: k, m: k % 12, dots: [] });
  items.forEach(function (it) { cols[it.k - min].dots.push(it); });
  var tallest = Math.max.apply(null, cols.map(function (c) { return c.dots.length; }));

  chart.style.setProperty('--sh-cols', cols.length);
  chart.style.setProperty('--sh-rows', tallest);
  var dotsOf = {};
  cols.forEach(function (c) {
    var col = document.createElement('div');
    col.className = 'sh-col';
    var stack = document.createElement('div');
    stack.className = 'sh-stack';
    // oldest at the bottom, newest on top
    c.dots.slice().sort(function (a, b) { return a.d - b.d || b.i - a.i; }).forEach(function (it) {
      var dot = document.createElement('span');
      dot.className = 'sh-dot';
      dot.dataset.i = it.i;
      dotsOf[it.i] = dot;
      stack.appendChild(dot);
    });
    var lab = document.createElement('div');
    lab.className = 'sh-mon';
    lab.innerHTML = '<b></b><span></span>';
    lab.querySelector('b').textContent = MONTHS[c.m];
    lab.querySelector('span').textContent = c.dots.length;
    col.appendChild(stack);
    col.appendChild(lab);
    chart.appendChild(col);
  });

  function hot(i, on) {
    items[i].row.classList.toggle('is-hot', on);
    if (dotsOf[i]) dotsOf[i].classList.toggle('is-hot', on);
  }
  items.forEach(function (it) {
    it.row.addEventListener('pointerenter', function () { hot(it.i, true); });
    it.row.addEventListener('pointerleave', function () { hot(it.i, false); });
    var dot = dotsOf[it.i];
    dot.addEventListener('pointerenter', function () { hot(it.i, true); });
    dot.addEventListener('pointerleave', function () { hot(it.i, false); });
    dot.addEventListener('click', function () {
      it.row.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    });
  });
})();
