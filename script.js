(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('.rise');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function(el){ el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function(el){ io.observe(el); });
  }

  var menuBtn = document.getElementById('menuBtn');
  var navList = document.getElementById('navList');
  if (menuBtn && navList) {
    menuBtn.addEventListener('click', function(){
      var open = navList.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menuBtn.textContent = open ? '✕' : '☰';
    });
    navList.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        navList.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Open menu');
        menuBtn.textContent = '☰';
      });
    });
  }

  var bar = document.getElementById('stickyCta');
  var list = document.getElementById('notify');
  if (bar && list && 'IntersectionObserver' in window) {
    new IntersectionObserver(function(entries){
      entries.forEach(function(e){ bar.classList.toggle('hide', e.isIntersecting); });
    }, { threshold: 0.15 }).observe(list);
  }

  // Sticky sequence: swap the pinned photo as each step enters view. No loops.
  var shot = document.getElementById('seqShot');
  var steps = document.querySelectorAll('.step[data-src]');
  if (shot && steps.length && 'IntersectionObserver' in window) {
    var swap = new IntersectionObserver(function(entries){
      if (document.hidden) return;
      entries.forEach(function(e){
        if (e.isIntersecting) {
          var src = e.target.getAttribute('data-src');
          var alt = e.target.getAttribute('data-alt') || shot.alt;
          if (src && shot.src.indexOf(src) === -1) {
            shot.src = src;
            shot.alt = alt;
          }
        }
      });
    }, { threshold: 0.55 });
    steps.forEach(function(s){ swap.observe(s); });
    document.addEventListener('visibilitychange', function(){ /* pause only: no animation loop to stop */ });
  }

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
      if (v === 'Notify me at launch') { subj.value = 'Fold-Out-Fit: Notify me at launch'; btn.textContent = 'Join the list'; }
      else if (v === 'Potential investor') { subj.value = 'Fold-Out-Fit: Potential investor'; btn.textContent = 'Send message'; }
      else if (v === 'Collaborator') { subj.value = 'Fold-Out-Fit: Collaborator'; btn.textContent = 'Send message'; }
      else { subj.value = 'Fold-Out-Fit: Presentation request'; btn.textContent = 'Send request'; }
    }
    sel.addEventListener('change', sync); sync();
    document.querySelectorAll('a[data-interest]').forEach(function(a){
      a.addEventListener('click', function(){ sel.value = a.getAttribute('data-interest'); sync(); });
    });
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
              ? "You're on the list! We'll email you when Fold-Out-Fit launches."
              : 'Thanks! Your message was sent and Warren will be in touch soon.';
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
