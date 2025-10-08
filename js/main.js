document.addEventListener('DOMContentLoaded',function(){
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');
  const themeToggle = document.getElementById('theme-toggle');
  const year = document.getElementById('year');
  const displayName = document.getElementById('display-name');
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  const welcomeOverlay = document.getElementById('welcome-overlay');
  const welcomeSkip = document.getElementById('welcome-skip');
  const readMoreBtn = document.getElementById('read-more');
  const profileFull = document.getElementById('profile-full');

  year.textContent = new Date().getFullYear();
  // Change this to your real name
  displayName.textContent = 'HASIB';

  navToggle.addEventListener('click', ()=>{
    mainNav.classList.toggle('open');
  });

  themeToggle.addEventListener('click', ()=>{
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    if(current === 'light'){
      root.removeAttribute('data-theme');
      themeToggle.textContent = '🌙';
    } else {
      root.setAttribute('data-theme','light');
      themeToggle.textContent = '☀️';
    }
  });

  // Welcome overlay: auto-hide after animation or when user skips
  if(welcomeOverlay){
    // If the welcome overlay has already been shown in this session, hide it immediately
    const welcomeSeen = sessionStorage.getItem('welcomeSeen');

    function hideWelcome(){
      if(!welcomeOverlay) return;
      welcomeOverlay.style.display = 'none';
      // mark as seen for this tab/session so returning to home won't show it again
      try{ sessionStorage.setItem('welcomeSeen','true'); }catch(e){}
      // ensure focus is on document
      document.body.focus();
    }

    if(welcomeSeen === 'true'){
      // hide immediately without animation
      hideWelcome();
    } else {
      // auto hide after 3.2s on first visit
      const autoHide = setTimeout(hideWelcome, 3200);
      welcomeSkip.addEventListener('click', ()=>{ clearTimeout(autoHide); hideWelcome(); });
      // allow ESC to close
      document.addEventListener('keydown', (e)=>{
        if(e.key === 'Escape') { clearTimeout(autoHide); hideWelcome(); }
      });
    }
  }

  

  // Read more toggle for profile
  if(readMoreBtn && profileFull){
    readMoreBtn.addEventListener('click', ()=>{
      profileFull.classList.toggle('hidden');
      readMoreBtn.textContent = profileFull.classList.contains('hidden') ? 'Read more' : 'Show less';
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const href = a.getAttribute('href');
      if(href.length>1){
        e.preventDefault();
        document.querySelector(href).scrollIntoView({behavior:'smooth'});
        mainNav.classList.remove('open');
      }
    })
  })

  // Transition when navigating from Explore cards to other pages
  document.querySelectorAll('.card-link').forEach(link=>{
    link.addEventListener('click', function(e){
      const href = link.getAttribute('href');
      // only handle internal HTML pages
      if(href && href.endsWith('.html')){
        try{ sessionStorage.setItem('fromExplore','true'); sessionStorage.setItem('welcomeSeen','true'); }catch(e){}
        e.preventDefault();
        // play a page fade animation on body
        document.body.classList.add('page-fade-out');
        setTimeout(()=> window.location.href = href, 360);
      }
    });
  });

  // If we arrived to the homepage from an Explore link, run a subtle entrance animation
  try{
    if(sessionStorage.getItem('fromExplore') === 'true'){
      sessionStorage.removeItem('fromExplore');
      // animate hero, profile and quick-links
      const hero = document.querySelector('.hero');
      const profile = document.getElementById('profile');
      const quick = document.getElementById('quick-links');
      [hero, profile, quick].forEach((el, i)=>{
        if(!el) return;
        // staggered animation delays set in CSS via inline style
        el.classList.add('arrive');
        el.style.animationDelay = (i * 120) + 'ms';
        // remove helper class after animation so it can run again in future if needed
        setTimeout(()=>{
          el.classList.remove('arrive');
          el.style.animationDelay = '';
        }, 900 + (i*120));
      });
    }
  }catch(e){}

  contactForm.addEventListener('submit', function(e){
    e.preventDefault();
    const name = contactForm.name.value.trim();
    const email = contactForm.email.value.trim();
    const msg = contactForm.message.value.trim();
    if(!name || !email || !msg){
      formStatus.textContent = 'Please fill out all fields.';
      return;
    }
    // Here you'd normally send the data to a server.
    formStatus.textContent = 'Thanks! Your message has been received (demo).';
    contactForm.reset();
    setTimeout(()=> formStatus.textContent = '', 5000);
  });
});