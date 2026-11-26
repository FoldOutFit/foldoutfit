(function(){
  'use strict';
  var root = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = window.requestAnimationFrame || function(f){ return setTimeout(f, 16); };

  /* ================= Intro ================= */
  var intro = document.getElementById('intro');
  var vid = document.getElementById('introVid');
  var bar = document.getElementById('introBar');
  var skipBtn = document.getElementById('skipIntro');
  var introActive = true, ending = false, usedFallback = false;

  function isPortrait(){ return window.innerHeight > window.innerWidth; }
  function fitIntro(){
    if (!intro) return;
    var r = window.innerWidth / window.innerHeight;
    var cover = isPortrait() ? (r >= 0.42 && r <= 0.75) : (r >= 1.45 && r <= 2.4);
    intro.classList.toggle('fit-cover', cover);
  }

  function setDark(){
    root.classList.add('dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0a0a0a');
  }

  function endIntro(){
    if (ending) return;
    ending = true; introActive = false;
    if (vid) { try { vid.pause(); } catch (e) {} }
    body.classList.remove('intro-lock');
    body.classList.add('ready');
    setDark();
    if (intro) {
      intro.classList.add('is-done');
      intro.setAttribute('aria-hidden', 'true');
      setTimeout(function(){
        if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
        intro = null; vid = null;
      }, reduce ? 0 : 1100);
    }
    onScroll(); placePill(true); syncFilm();
    revealVisible();
  }

  function startIntro(){
    var skip = reduce || !vid || (location.hash && location.hash.length > 1);
    if (skip) { endIntro(); return; }
    fitIntro();
    window.addEventListener('resize', fitIntro, { passive: true });
    var base = isPortrait() ? '../style1/img/intro-phone' : '../style1/img/intro-desktop';
    if (isPortrait()) vid.poster = 'img/intro-poster-phone.jpg';
    var t = vid.canPlayType('video/webm; codecs="vp9"');
    var webm = t === 'probably' || t === 'maybe';
    vid.muted = true; vid.defaultMuted = true; vid.playsInline = true;
    vid.src = base + (webm ? '.webm' : '.mp4');
    vid.addEventListener('ended', endIntro);
    vid.addEventListener('error', function(){
      if (webm && !usedFallback) { usedFallback = true; vid.src = base + '.mp4'; play(); return; }
      endIntro();
    });
    function tick(){
      if (!vid || ending) return;
      if (vid.duration && bar) bar.style.transform = 'scaleX(' + Math.min(1, vid.currentTime / vid.duration) + ')';
      raf(tick);
    }
    function play(){
      if (!vid || ending) return;
      var p = vid.play();
      if (p && p.then) p.then(function(){ raf(tick); }).catch(function(){ endIntro(); });
      else raf(tick);
    }
    play();
    // safety net: never trap anyone behind the intro
    setTimeout(function(){ if (!ending && vid && (vid.paused || vid.readyState < 2)) endIntro(); }, 9000);
    document.addEventListener('keydown', function(e){
      if (introActive && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') && document.activeElement !== skipBtn) endIntro();
    });
  }
  if (skipBtn) skipBtn.addEventListener('click', endIntro);
  document.addEventListener('visibilitychange', function(){
    if (vid && introActive && !ending) { if (document.hidden) vid.pause(); else vid.play().catch(endIntro); }
    syncFilm();
  });

  /* ================= Tabs, progress, active shelf ================= */
  var header = document.getElementById('bar');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('#shelfTabs a[data-n]'));
  var pill = document.getElementById('tabPill');
  var progress = document.getElementById('progress');
  var shelves = Array.prototype.slice.call(document.querySelectorAll('.shelf'));
  var current = '1', lockUntil = 0, ticking = false;

  function barH(){ return header ? header.offsetHeight : 64; }
  function syncBarH(){ root.style.setProperty('--bar-h', barH() + 'px'); }

  function placePill(instant){
    if (!pill) return;
    var a = tabs.filter(function(t){ return t.getAttribute('data-n') === current; })[0];
    if (!a) return;
    if (instant) pill.style.transition = 'none';
    pill.style.width = a.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    if (instant) { pill.offsetWidth; pill.style.transition = ''; }
  }
  function setShelf(n){
    n = String(n);
    if (n === current) return;
    current = n;
    tabs.forEach(function(a){
      if (a.getAttribute('data-n') === n) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    placePill(false);
  }
  function onScroll(){
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    if (Date.now() < lockUntil) return;
    var line = barH() + window.innerHeight * 0.35;
    var best = '1';
    shelves.forEach(function(s){ if (s.getBoundingClientRect().top <= line) best = s.getAttribute('data-n'); });
    if (max - y < 4) best = shelves[shelves.length - 1].getAttribute('data-n');
    setShelf(best);
  }
  window.addEventListener('scroll', function(){ if (!ticking) { ticking = true; raf(onScroll); } }, { passive: true });
  window.addEventListener('resize', function(){ syncBarH(); placePill(true); onScroll(); }, { passive: true });

  function scrollToEl(el){
    var top = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - barH() + 1;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (introActive) endIntro();
    var n = a.getAttribute('data-n');
    if (n) { setShelf(n); lockUntil = Date.now() + (reduce ? 50 : 1200); }
    scrollToEl(el);
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (id === 'shelf1' || id === 'shelf2' || id === 'shelf3') {
      var h = el.querySelector('h1, h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  });
  if ('onscrollend' in window) window.addEventListener('scrollend', function(){ lockUntil = 0; onScroll(); });

  /* ================= Reveal on scroll ================= */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  reveals.forEach(function(el){
    var sibs = Array.prototype.filter.call(el.parentNode.children, function(c){ return c.classList.contains('reveal'); });
    var i = sibs.indexOf(el);
    if (i > 0) el.style.transitionDelay = Math.min(i, 3) * 90 + 'ms';
  });
  var revObs = null;
  function revealVisible(){
    if (reduce || !('IntersectionObserver' in window)) { reveals.forEach(function(el){ el.classList.add('in'); }); return; }
    if (revObs) return;
    revObs = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (en.isIntersecting) { en.target.classList.add('in'); revObs.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function(el){ revObs.observe(el); });
  }

  /* ================= Shelf-1 film ================= */
  var film = document.getElementById('unfoldVid');
  var toggle = document.getElementById('filmToggle');
  var filmInView = false, userPaused = reduce;
  function setToggle(){
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
    toggle.setAttribute('aria-label', userPaused ? 'Play animation' : 'Pause animation');
  }
  function syncFilm(){
    if (!film) return;
    var should = !userPaused && !document.hidden && !introActive && filmInView;
    if (should) {
      if (film.preload !== 'auto') film.preload = 'auto';
      var p = film.play();
      if (p && p.catch) p.catch(function(){ userPaused = true; setToggle(); });
    } else { try { film.pause(); } catch (e) {} }
  }
  if (film) {
    film.muted = true;
    setToggle();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(entries){
        entries.forEach(function(en){ filmInView = en.isIntersecting && en.intersectionRatio >= 0.25; });
        syncFilm();
      }, { threshold: [0, 0.25, 0.6] }).observe(film);
    } else { filmInView = true; }
    if (toggle) toggle.addEventListener('click', function(){ userPaused = !userPaused; setToggle(); syncFilm(); });
  }

  /* ================= Drawings lightbox ================= */
  var openBtn = document.getElementById('drawOpen');
  var lb = document.getElementById('lb');
  if (openBtn && lb) {
    openBtn.addEventListener('click', function(){
      if (typeof lb.showModal === 'function') lb.showModal(); else window.open('../drawings.png', '_blank', 'noopener');
    });
    lb.addEventListener('click', function(e){ if (e.target === lb) lb.close(); });
  }

  /* ================= Waitlist form (Formspree) ================= */
  var f = document.getElementById('fofForm');
  if (f) {
    var sel = document.getElementById('interest');
    var org = document.getElementById('orgField');
    var msg = document.getElementById('msgField');
    var subj = document.getElementById('subj');
    var btn = document.getElementById('fofBtn');
    var st = document.getElementById('fofStatus');
    var labels = {
      'Notify me at launch': ['Fold-Out-Fit: Notify me at launch', 'Join the waitlist'],
      'Potential investor': ['Fold-Out-Fit: Potential investor', 'Send message'],
      'Collaborator': ['Fold-Out-Fit: Collaborator', 'Send message'],
      'Presentation request': ['Fold-Out-Fit: Presentation request', 'Send request']
    };
    function sync(){
      var v = sel.value, more = v !== 'Notify me at launch';
      org.classList.toggle('on', more); msg.classList.toggle('on', more);
      var l = labels[v] || labels['Presentation request'];
      subj.value = l[0]; btn.textContent = l[1];
    }
    sel.addEventListener('change', sync); sync();
    ['name', 'email'].forEach(function(id){
      var el = document.getElementById(id);
      el.addEventListener('input', function(){ if (el.checkValidity()) el.removeAttribute('aria-invalid'); });
    });
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var bad = ['name', 'email'].map(function(id){ return document.getElementById(id); }).filter(function(el){
        var ok = el.value.trim() && el.checkValidity();
        if (!ok) el.setAttribute('aria-invalid', 'true');
        return !ok;
      });
      if (bad.length) {
        st.textContent = bad[0].id === 'email' && bad[0].value ? 'Please enter a valid email address.' : 'Please add your name and email.';
        st.className = 'status err'; bad[0].focus(); return;
      }
      st.className = 'status'; st.textContent = '';
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = 'Sending…';
      fetch(f.action, { method: 'POST', body: new FormData(f), headers: { 'Accept': 'application/json' } })
        .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
        .then(function(res){
          if (res.ok) {
            var keep = sel.value; f.reset(); sel.value = keep; sync();
            st.textContent = keep === 'Notify me at launch'
              ? "You're on the list. You'll get an email when Fold-Out-Fit launches."
              : 'Thanks. Your message was sent, and Warren will be in touch.';
            st.className = 'status ok';
          } else {
            st.textContent = (res.d && res.d.errors)
              ? res.d.errors.map(function(x){ return x.message; }).join(', ')
              : 'Something went wrong. Please try again or email warren@foldoutfit.com.';
            st.className = 'status err';
          }
        })
        .catch(function(){
          st.textContent = 'Could not send right now. Please try again or email warren@foldoutfit.com.';
          st.className = 'status err';
        })
        .then(function(){ btn.disabled = false; if (btn.textContent === 'Sending…') btn.textContent = label; });
    });
  }

  /* ================= Boot ================= */
  syncBarH();
  placePill(true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ syncBarH(); placePill(true); });
  startIntro();
  if (location.hash && location.hash.length > 1) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(function(){ window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - barH() + 1); onScroll(); }, 60);
  }
})();
