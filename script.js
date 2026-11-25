(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* menu */
  var menuBtn = document.getElementById('menuBtn');
  var navList = document.getElementById('navList');
  if (menuBtn && navList) {
    menuBtn.addEventListener('click', function(){
      var open = navList.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menuBtn.textContent = open ? 'Close' : 'Menu';
    });
    navList.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        navList.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Open menu');
        menuBtn.textContent = 'Menu';
      });
    });
  }

  /* The Unfold: scroll + drag, rAF only while visible, pause when hidden */
  var root = document.querySelector('.unfold');
  var track = document.querySelector('.unfold-track');
  var slider = document.getElementById('unfoldSlider');
  var hint = document.getElementById('unfoldHint');
  var p = 0;
  var dragging = false;
  var inView = true;
  var raf = 0;
  var scrollDrive = !reduce;

  function stageFor(v){
    if (v < 0.16) return 'closed';
    if (v < 0.38) return 'hang';
    if (v < 0.90) return 'shelves';
    return 'open';
  }

  function apply(v){
    p = Math.max(0, Math.min(1, v));
    if (!root) return;
    root.style.setProperty('--p', p.toFixed(4));
    var s = stageFor(p);
    if (root.getAttribute('data-stage') !== s) root.setAttribute('data-stage', s);
    if (slider && !dragging) {
      var iv = Math.round(p * 100);
      if (String(slider.value) !== String(iv)) {
        slider.value = String(iv);
        slider.setAttribute('aria-valuenow', String(iv));
      }
    }
  }

  function fromScroll(){
    if (!track || dragging || !scrollDrive || document.hidden || !inView) return;
    var rect = track.getBoundingClientRect();
    var total = track.offsetHeight - window.innerHeight;
    if (total <= 0) { apply(reduce ? 1 : 0); return; }
    var scrolled = Math.min(total, Math.max(0, -rect.top));
    apply(scrolled / total);
  }

  function tick(){
    raf = 0;
    fromScroll();
  }
  function requestTick(){
    if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
  }

  if (reduce) {
    apply(1);
    scrollDrive = false;
    if (hint) hint.textContent = 'Drag the pull to fold it back and open it again.';
    if (slider) { slider.value = '100'; slider.setAttribute('aria-valuenow', '100'); }
  } else {
    apply(0);
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick, { passive: true });

  if (root && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        inView = e.isIntersecting;
        if (inView) requestTick();
      });
    }, { threshold: 0 });
    io.observe(root);
  }

  document.addEventListener('visibilitychange', function(){
    if (document.hidden) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    } else if (inView) {
      requestTick();
    }
  });

  if (slider) {
    var onDrag = function(){
      dragging = true;
      scrollDrive = false;
      apply(Number(slider.value) / 100);
      slider.setAttribute('aria-valuenow', slider.value);
    };
    slider.addEventListener('input', onDrag);
    slider.addEventListener('change', function(){
      dragging = false;
    });
  }

  /* expose for screenshots / debugging, without fighting the scroller if we lock it */
  window.__setUnfold = function(v, lock){
    if (lock) { scrollDrive = false; dragging = false; }
    apply(Number(v));
    if (slider) {
      slider.value = String(Math.round(p * 100));
      slider.setAttribute('aria-valuenow', slider.value);
    }
  };

  /* video: pause when the tab is hidden */
  var vid = document.getElementById('unfoldVid');
  if (vid) {
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) vid.pause();
    });
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
