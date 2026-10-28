/* ============================================
   TASTE (taste.html)
   Builds the song list under the On repeat player (clicking a row presses the
   matching cover in the player, so there is one audio element and one source
   of truth in js/now-playing.js), and renders any extra sections from
   data/taste.json. A section with no items is not shown.
   ============================================ */
(function () {
  'use strict';

  var songs = document.getElementById('tt-songs');
  var more = document.getElementById('tt-more');
  var stamp = document.getElementById('tt-stamp');
  var player = document.getElementById('np');
  if (!songs || !more) return;

  function json(u) { return fetch(u).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt) e.textContent = txt;
    return e;
  }
  function prettyDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  json('data/now-playing.json').then(function (data) {
    var tracks = (data && data.tracks) || [];
    var rows = tracks.map(function (t, n) {
      var li = el('li', 'tt-row');
      var main = el('button', 'tt-main');
      main.type = 'button';
      main.setAttribute('aria-label', 'Play ' + t.title + ' by ' + t.artist);
      var im = el('img', 'tt-art');
      im.src = t.art; im.alt = ''; im.loading = 'lazy';
      var txt = el('span', 'tt-txt');
      txt.appendChild(el('span', 'tt-t', t.title));
      txt.appendChild(el('span', 'tt-a', t.artist + (t.album ? ' · ' + t.album : '')));
      if (t.note) txt.appendChild(el('span', 'tt-n', t.note));
      var eq = el('span', 'tt-eq');
      eq.setAttribute('aria-hidden', 'true');
      eq.innerHTML = '<i></i><i></i><i></i>';
      main.appendChild(im); main.appendChild(txt); main.appendChild(eq);
      main.addEventListener('click', function () {
        var picks = player.querySelectorAll('.np-pick');
        if (picks[n]) picks[n].click();
      });
      li.appendChild(main);
      if (t.link) {
        var a = el('a', 'tt-ext', 'Apple Music ↗');
        a.href = t.link; a.target = '_blank'; a.rel = 'noopener';
        a.setAttribute('aria-label', 'Open ' + t.title + ' in Apple Music');
        li.appendChild(a);
      }
      songs.appendChild(li);
      return li;
    });

    // Follow the player: highlight whichever song is loaded.
    function sync() {
      var picks = player.querySelectorAll('.np-pick');
      rows.forEach(function (li, n) { li.classList.toggle('on', !!picks[n] && picks[n].classList.contains('on')); });
    }
    new MutationObserver(sync).observe(player, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
    sync();

    if (data.updatedAt && stamp) {
      stamp.textContent = 'Last changed ' + prettyDate(data.updatedAt) + '.';
      stamp.hidden = false;
    }
  }).catch(function () {});

  json('data/taste.json').then(function (data) {
    ((data && data.sections) || []).forEach(function (s) {
      var items = s.items || [];
      if (!items.length) return;
      var sec = el('div');
      var h = el('h2', 'ab-h', s.title);
      if (s.id) h.id = s.id;
      sec.appendChild(h);
      if (s.blurb) sec.appendChild(el('p', 'tt-sub', s.blurb));
      var ul = el('ul', 'tt-grid');
      items.forEach(function (it) {
        var li = el('li', 'tt-card' + (it.square ? ' sq' : ''));
        var inner = it.link ? el('a') : el('div', 'tt-card-in');
        if (it.link) { inner.href = it.link; inner.target = '_blank'; inner.rel = 'noopener'; }
        if (it.art) {
          var im = el('img', 'tt-cover');
          im.src = it.art; im.alt = ''; im.loading = 'lazy';
          inner.appendChild(im);
        }
        inner.appendChild(el('div', 'tt-card-t', it.title));
        if (it.by) inner.appendChild(el('div', 'tt-card-b', it.by));
        if (it.note) inner.appendChild(el('div', 'tt-card-n', it.note));
        li.appendChild(inner);
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      more.appendChild(sec);
    });
  }).catch(function () {});
})();
