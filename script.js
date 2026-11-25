(function(){
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

  var vid = document.getElementById('unfold');
  if (vid) {
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) vid.pause();
    });
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
      if (v === 'Notify me at launch') { subj.value = 'Fold-Out-Fit: Notify me at launch'; btn.textContent = "Get an email when it's ready"; }
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
              ? "You're on the list. I'll email you when Fold-Out-Fit launches."
              : 'Thanks. Your message was sent, and I will be in touch.';
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
