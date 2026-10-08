/* ============================================
   ON REPEAT (index.html)
   A small vinyl player for Mindy's five songs. 30-second previews come from
   the iTunes Search API (data/now-playing.json). Nothing plays until the
   visitor presses play; when a preview ends the next song starts. If a saved
   preview URL ever stops working, the track is looked up again by id.
   ============================================ */
(function () {
  'use strict';

  var box = document.getElementById('np');
  if (!box) return;

  fetch('data/now-playing.json')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(init)
    .catch(function () { /* leave the player hidden if the list can't load */ });

  function init(data) {
    var tracks = (data && data.tracks) || [];
    if (!tracks.length) return;

    var disc = box.querySelector('.np-disc');
    var art = box.querySelector('.np-art');
    var title = box.querySelector('.np-title');
    var artist = box.querySelector('.np-artist');
    var bar = box.querySelector('.np-bar i');
    var list = box.querySelector('.np-list');

    var audio = new Audio();
    audio.preload = 'none';
    audio.volume = 0.85;
    var i = 0, playing = false, retried = {};

    tracks.forEach(function (t, n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'np-pick';
      b.setAttribute('aria-label', t.title + ' by ' + t.artist);
      var im = document.createElement('img');
      im.src = t.art;
      im.alt = '';
      im.loading = 'lazy';
      b.appendChild(im);
      b.addEventListener('click', function () { if (n === i) toggle(); else load(n, true); });
      list.appendChild(b);
    });

    function render() {
      var t = tracks[i];
      art.src = t.art;
      title.textContent = t.title;
      title.href = t.link;
      title.title = 'Open in Apple Music';
      artist.textContent = t.artist;
      Array.prototype.forEach.call(list.children, function (b, n) {
        b.classList.toggle('on', n === i);
        b.setAttribute('aria-pressed', String(n === i));
      });
    }
    function setPlaying(p) {
      playing = p;
      box.classList.toggle('is-playing', p);
      disc.setAttribute('aria-label', (p ? 'Pause ' : 'Play ') + tracks[i].title + ' by ' + tracks[i].artist);
    }
    function load(n, autoplay) {
      i = (n + tracks.length) % tracks.length;
      audio.src = tracks[i].preview;
      bar.style.width = '0%';
      render();
      if (autoplay) play(); else setPlaying(false);
    }
    function play() {
      if (!audio.getAttribute('src')) audio.src = tracks[i].preview;
      setPlaying(true);
      var p = audio.play();
      if (p && p.catch) p.catch(function () { setPlaying(false); });
    }
    function toggle() {
      if (playing) { audio.pause(); setPlaying(false); } else play();
    }

    disc.addEventListener('click', toggle);
    audio.addEventListener('timeupdate', function () {
      if (audio.duration) bar.style.width = (audio.currentTime / audio.duration * 100).toFixed(1) + '%';
    });
    audio.addEventListener('ended', function () { load(i + 1, true); });
    audio.addEventListener('pause', function () { if (!audio.ended) setPlaying(false); });
    audio.addEventListener('error', function () {
      var t = tracks[i];
      if (retried[t.id]) { setPlaying(false); return; }
      retried[t.id] = 1;
      fetch('https://itunes.apple.com/lookup?id=' + t.id + '&country=US')
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var r = j.results && j.results[0];
          if (!r || !r.previewUrl) throw new Error('no preview');
          t.preview = r.previewUrl;
          audio.src = t.preview;
          if (playing) play();
        })
        .catch(function () { setPlaying(false); });
    });

    render();
    setPlaying(false);
    box.hidden = false;
  }
})();
