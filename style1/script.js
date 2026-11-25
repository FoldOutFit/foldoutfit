(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var intro = document.getElementById('intro');
  var vid = document.getElementById('introVid');
  var skipBtn = document.getElementById('skipIntro');
  var introActive = true;
  var ending = false;
  var usedFallback = false;

  function setThemeDark(){
    document.documentElement.style.background = '#0e0e0e';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0e0e0e');
  }

  function cleanup(){
    if (vid && vid.parentNode) vid.remove();
    if (intro && intro.parentNode) intro.remove();
    vid = null;
    intro = null;
  }

  function endIntro(){
    if (ending) return;
    ending = true;
    introActive = false;
    if (vid) {
      try { vid.pause(); } catch (e) {}
    }
    if (intro) {
      intro.classList.add('is-done');
      intro.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('intro-lock');
    setThemeDark();
    var delay = reduce ? 0 : 900;
    setTimeout(cleanup, delay);
    syncShelfVid();
  }

  function chosenBase(){
    var phone = window.matchMedia('(max-width: 799px)').matches;
    return phone ? 'img/intro-phone' : 'img/intro-desktop';
  }

  function preferWebm(){
    if (!vid) return false;
    var t = vid.canPlayType('video/webm; codecs="vp9"');
    return t === 'probably' || t === 'maybe';
  }

  function assignSrc(useWebm){
    vid.src = chosenBase() + (useWebm ? '.webm' : '.mp4');
    vid.load();
  }

  function tryPlay(){
    if (!vid || ending) return;
    var p = vid.play();
    if (p && p.then) p.catch(function(){ endIntro(); });
  }

  function startIntro(){
    if (reduce || !vid) { endIntro(); return; }
    document.body.classList.add('intro-lock');
    vid.muted = true;
    vid.defaultMuted = true;
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');

    var webm = preferWebm();
    assignSrc(webm);

    vid.addEventListener('ended', endIntro);
    vid.addEventListener('error', function(){
      if (webm && !usedFallback) {
        usedFallback = true;
        assignSrc(false);
        tryPlay();
        return;
      }
      endIntro();
    });

    tryPlay();
  }

  if (skipBtn) skipBtn.addEventListener('click', endIntro);

  document.addEventListener('visibilitychange', function(){
    if (document.hidden) {
      if (vid && introActive && !ending) {
        try { vid.pause(); } catch (e) {}
      }
      syncShelfVid();
    } else {
      if (introActive && !reduce && !ending && vid) {
        tryPlay();
      }
      syncShelfVid();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startIntro);
  } else {
    startIntro();
  }

  /* shelf tabs: click to scroll, highlight the active shelf while scrolling */
  var sections = document.querySelectorAll('.shelf');
  var tabNav = document.getElementById('shelfTabs');
  var tabs = tabNav ? tabNav.querySelectorAll('a[data-n]') : [];
  var currentShelf = '1';
  var ignoreObs = false;
  var ignoreTimer = 0;
  function setShelf(n){
    n = String(n);
    if (n === currentShelf) {
      tabs.forEach(function(a){
        var on = a.getAttribute('data-n') === n;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      return;
    }
    currentShelf = n;
    tabs.forEach(function(a){
      var on = a.getAttribute('data-n') === n;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  if (tabNav) {
    tabNav.addEventListener('click', function(e){
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      ignoreObs = true;
      clearTimeout(ignoreTimer);
      setShelf(a.getAttribute('data-n') || '1');
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      ignoreTimer = setTimeout(function(){ ignoreObs = false; }, reduce ? 50 : 1100);
    });
  }
  function syncBarH(){
    var bar = document.querySelector('.bar');
    if (bar) document.documentElement.style.setProperty('--bar-h', bar.offsetHeight + 'px');
  }
  syncBarH();
  window.addEventListener('resize', syncBarH, { passive: true });

  if ('IntersectionObserver' in window && sections.length) {
    var ratios = {};
    var tabObs = new IntersectionObserver(function(entries){
      if (ignoreObs) return;
      entries.forEach(function(en){
        var n = en.target.getAttribute('data-n');
        if (!n) return;
        ratios[n] = en.isIntersecting ? en.intersectionRatio : 0;
      });
      var best = currentShelf, bestR = -1;
      Object.keys(ratios).forEach(function(k){
        if (ratios[k] > bestR) { bestR = ratios[k]; best = k; }
      });
      if (bestR > 0) setShelf(best);
    }, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], rootMargin: '-20% 0px -35% 0px' });
    sections.forEach(function(s){ tabObs.observe(s); });
  } else {
    function updateShelf(){
      if (document.hidden) return;
      var mid = window.innerHeight * 0.45;
      var best = '1', bestDist = Infinity;
      sections.forEach(function(s){
        var r = s.getBoundingClientRect();
        var c = (r.top + r.bottom) / 2;
        var d = Math.abs(c - mid);
        if (r.bottom > 80 && r.top < window.innerHeight && d < bestDist) {
          bestDist = d; best = s.getAttribute('data-n') || '1';
        }
      });
      setShelf(best);
    }
    window.addEventListener('scroll', updateShelf, { passive: true });
    window.addEventListener('resize', updateShelf, { passive: true });
    updateShelf();
  }

  /* shelf-1 product video: muted loop, play only when in view, after the intro, and not reduced-motion */
  var shelfVid = document.getElementById('unfoldVid');
  var shelfInView = false;
  function syncShelfVid(){
    if (!shelfVid) return;
    var should = !reduce && !document.hidden && !introActive && shelfInView;
    if (should) {
      shelfVid.muted = true;
      shelfVid.defaultMuted = true;
      shelfVid.playsInline = true;
      var p = shelfVid.play();
      if (p && p.then) p.catch(function(){ shelfVid.controls = true; });
    } else {
      try { shelfVid.pause(); } catch (e) {}
    }
  }
  if (shelfVid) {
    shelfVid.muted = true;
    shelfVid.loop = true;
    shelfVid.playsInline = true;
    shelfVid.setAttribute('playsinline', '');
    shelfVid.setAttribute('webkit-playsinline', '');
    if (reduce) shelfVid.controls = true;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          shelfInView = en.isIntersecting && en.intersectionRatio >= 0.15;
        });
        syncShelfVid();
      }, { threshold: [0, 0.15, 0.4, 0.75] });
      io.observe(shelfVid);
    } else {
      shelfInView = true;
    }
  }

  /* drawings lightbox */
  var open = document.getElementById('drawOpen');
  var lb = document.getElementById('lb');
  var close = document.getElementById('lbClose');
  if (open && lb) {
    var last = null;
    function show(){ last = document.activeElement; lb.hidden = false; lb.classList.add('on'); (close || lb).focus(); }
    function hideLb(){ lb.classList.remove('on'); lb.hidden = true; if (last && last.focus) last.focus(); }
    open.addEventListener('click', show);
    if (close) close.addEventListener('click', function(e){ e.stopPropagation(); hideLb(); });
    lb.addEventListener('click', function(e){ if (e.target === lb) hideLb(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && lb.classList.contains('on')) hideLb(); });
  }

  /* Formspree */
  var f = document.getElementById('fofForm');
  if (f) {
    var sel = document.getElementById('interest');
    var org = document.getElementById('orgField');
    var msg = document.getElementById('msgField');
    var subj = document.getElementById('subj');
    var btn = document.getElementById('fofBtn');
    var st = document.getElementById('fofStatus');
    function sync(){
      var v = sel.value;
      org.classList.toggle('on', v !== 'Notify me at launch');
      msg.classList.toggle('on', v !== 'Notify me at launch');
      if (v === 'Notify me at launch') { subj.value = 'Fold-Out-Fit: Notify me at launch'; btn.textContent = 'Join the waitlist'; }
      else if (v === 'Potential investor') { subj.value = 'Fold-Out-Fit: Potential investor'; btn.textContent = 'Send message'; }
      else if (v === 'Collaborator') { subj.value = 'Fold-Out-Fit: Collaborator'; btn.textContent = 'Send message'; }
      else { subj.value = 'Fold-Out-Fit: Presentation request'; btn.textContent = 'Send request'; }
    }
    sel.addEventListener('change', sync); sync();
    f.addEventListener('submit', function(e){
      e.preventDefault();
      st.className = 'status';
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
})();
