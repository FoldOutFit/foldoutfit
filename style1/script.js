(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var intro = document.getElementById('intro');
  var skipBtn = document.getElementById('skipIntro');
  var introActive = true;
  var raf = 0;
  var t0 = 0;
  var elapsed = 0;
  var lastPhase = '';

  var phases = [
    { at: 80, name: 'spin' },
    { at: 1450, name: 'grow' },
    { at: 2500, name: 'open' },
    { at: 3050, name: 'drop-1' },
    { at: 3750, name: 'drop-2' },
    { at: 4450, name: 'drop-3' },
    { at: 5400, name: 'enter' }
  ];
  var END = 6400;

  function setPhase(name){
    if (!intro || lastPhase === name) return;
    lastPhase = name;
    intro.classList.remove('spin','grow','open','drop-1','drop-2','drop-3','enter');
    if (name) intro.classList.add(name);
  }

  function apply(ms){
    var name = '';
    for (var i=0;i<phases.length;i++){
      if (ms >= phases[i].at) name = phases[i].name;
    }
    setPhase(name);
  }

  function endIntro(){
    introActive = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (intro) {
      intro.classList.add('is-done');
      intro.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('intro-lock');
    document.documentElement.style.background = '#0e0e0e';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0e0e0e');
  }

  function tick(now){
    raf = 0;
    if (!introActive) return;
    if (document.hidden) return;
    elapsed = now - t0;
    apply(elapsed);
    if (elapsed >= END) { endIntro(); return; }
    raf = requestAnimationFrame(tick);
  }

  function startIntro(){
    introActive = true;
    document.body.classList.add('intro-lock');
    if (reduce) { endIntro(); return; }
    t0 = performance.now() - elapsed;
    raf = requestAnimationFrame(tick);
  }

  document.addEventListener('visibilitychange', function(){
    if (document.hidden) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      var vid = document.getElementById('unfoldVid');
      if (vid) vid.pause();
    } else if (introActive && !reduce) {
      t0 = performance.now() - elapsed;
      if (!raf) raf = requestAnimationFrame(tick);
    }
  });

  if (skipBtn) skipBtn.addEventListener('click', endIntro);

  window.__setIntroPose = function(transform){
    introActive = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    document.body.classList.add('intro-lock');
    if (intro) { intro.classList.remove('is-done','spin','grow','open','drop-1','drop-2','drop-3','enter'); intro.setAttribute('aria-hidden','false'); }
    var rig = document.getElementById('rig');
    if (rig) { rig.style.transition = 'none'; rig.style.transform = transform; rig.style.opacity = '1'; }
    document.documentElement.style.background = '#fff';
  };

  window.__setIntro = function(name){
    introActive = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (name === 'done') { endIntro(); return; }
    document.body.classList.add('intro-lock');
    if (intro) {
      intro.classList.remove('is-done');
      intro.setAttribute('aria-hidden', 'false');
    }
    document.documentElement.style.background = '#fff';
    setPhase(name);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startIntro);
  } else {
    startIntro();
  }

  /* shelf indicator: whichever shelf is nearest the viewport center */
  var numEl = document.getElementById('shelfNum');
  var dots = document.querySelectorAll('.dots span');
  var sections = document.querySelectorAll('.shelf');
  function setShelf(n){
    if (numEl) numEl.textContent = String(n);
    dots.forEach(function(d){ d.classList.toggle('on', d.getAttribute('data-d') === String(n)); });
  }
  var indRaf = 0;
  function updateShelf(){
    indRaf = 0;
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
  function requestInd(){ if (!indRaf && !document.hidden) indRaf = requestAnimationFrame(updateShelf); }
  window.addEventListener('scroll', requestInd, { passive: true });
  window.addEventListener('resize', requestInd, { passive: true });
  requestInd();

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
