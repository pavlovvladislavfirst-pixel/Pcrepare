(function() {
    'use strict';
    
    // === Minimal runtime i18n (no persistence, default RU) ===
    document.documentElement.lang = 'ru';
    try { localStorage.removeItem('preferred-language'); localStorage.removeItem('i18nextLng'); } catch(e){}

    let currentLanguage = 'ru';
    let translations = {};

    const I18N_ABS = (lang) => `/i18n/${lang}.json`;
    const I18N_REL = (lang) => `./i18n/${lang}.json`;

    async function fetchJSON(url) {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
      return r.json();
    }

    async function loadTranslations(lang) {
      // try absolute, then relative
      try { translations = await fetchJSON(I18N_ABS(lang)); }
      catch(e1) {
        console.warn('[i18n abs]', e1?.message);
        try { translations = await fetchJSON(I18N_REL(lang)); }
        catch(e2) { console.error('[i18n rel]', e2?.message); translations = {}; }
      }
    }

    function updateContent() {
      // text nodes
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && translations && Object.prototype.hasOwnProperty.call(translations, key)) {
          el.textContent = translations[key];
        }
      });
      // placeholders
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key && translations && Object.prototype.hasOwnProperty.call(translations, key)) {
          el.setAttribute('placeholder', translations[key]);
        }
      });
    }

    async function updateLanguage(lang) {
      currentLanguage = lang || 'ru';
      document.documentElement.lang = currentLanguage;
      await loadTranslations(currentLanguage);
      updateContent();

      // keep selects in sync
      const m = document.getElementById('language-select');            // mobile
      const d = document.getElementById('language-select-desktop');    // desktop
      if (m) m.value = currentLanguage;
      if (d) d.value = currentLanguage;
    }
    
    // Mobile menu functionality
    function initMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuToggle && mobileMenu) {
            mobileMenuToggle.addEventListener('click', function() {
                const isOpen = !mobileMenu.classList.contains('hidden');
                
                if (isOpen) {
                    mobileMenu.classList.add('hidden');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                } else {
                    mobileMenu.classList.remove('hidden');
                    mobileMenuToggle.setAttribute('aria-expanded', 'true');
                }
            });
            
            // Close mobile menu when clicking on links
            const mobileLinks = mobileMenu.querySelectorAll('a');
            mobileLinks.forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.add('hidden');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                });
            });
            
            // Close mobile menu with ESC key for accessibility
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                    // Return focus to toggle button for better UX
                    mobileMenuToggle.focus();
                }
            });
        }
    }
    
    // FAQ toggle functionality
    function initFAQ() {
        const faqToggles = document.querySelectorAll('[data-faq-toggle]');
        faqToggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const targetId = this.getAttribute('data-faq-toggle');
                const content = document.getElementById(targetId + '-content');
                const icon = this.querySelector('i');
                const isOpen = !content.classList.contains('hidden');
                
                if (isOpen) {
                    content.classList.add('hidden');
                    this.setAttribute('aria-expanded', 'false');
                } else {
                    content.classList.remove('hidden');
                    this.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }
    
    // Form validation
    function validateField(field) {
        const errorDiv = field.parentNode.querySelector('.error-message');
        let isValid = true;
        let message = '';
        
        // Check if required field is empty
        if (field.hasAttribute('required') && !field.value.trim()) {
            isValid = false;
            message = 'This field is required';
        }
        
        // Email validation
        if (field.type === 'email' && field.value && !isValidEmail(field.value)) {
            isValid = false;
            message = 'Please enter a valid email address';
        }
        
        // Show or hide error
        if (!isValid) {
            showFieldError(field, errorDiv, message);
        } else {
            clearFieldError(field, errorDiv);
        }
        
        return isValid;
    }
    
    function showFieldError(field, errorDiv, message) {
        field.classList.add('form-error');
        field.classList.remove('form-success');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }
    
    function clearFieldError(field, errorDiv) {
        field.classList.remove('form-error');
        field.classList.add('form-success');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Form submission
    function initContactForm() {
        const contactForm = document.getElementById('contact-form');
        const formSuccess = document.getElementById('form-success');
        const formError = document.getElementById('form-error');
        
        if (!contactForm) return;
        
        // Real-time validation
        const requiredFields = contactForm.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            field.addEventListener('blur', () => validateField(field));
            field.addEventListener('input', () => {
                if (field.classList.contains('form-error')) {
                    validateField(field);
                }
            });
        });
        
        // Form submission
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Validate all required fields
            let isValid = true;
            requiredFields.forEach(field => {
                if (!validateField(field)) {
                    isValid = false;
                }
            });
            
            if (!isValid) {
                return;
            }
            
            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.classList.add('loading');
            submitButton.textContent = 'Sending...';
            
            // Hide previous status messages
            formSuccess.classList.add('hidden');
            formError.classList.add('hidden');
            
            // Submit form data
            const formData = new FormData(contactForm);
            
            fetch(contactForm.action, {
                method: 'POST',
                body: formData,
                mode: 'no-cors' // Required for submit-form.com
            })
            .then(() => {
                // Show success message (optimistic since no-cors doesn't return response)
                formSuccess.classList.remove('hidden');
                contactForm.reset();
                
                // Clear form validation states
                const fields = contactForm.querySelectorAll('input, select, textarea');
                fields.forEach(field => {
                    field.classList.remove('form-error', 'form-success');
                });
                
                // Scroll to success message
                formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
            })
            .catch(() => {
                // Show error message
                formError.classList.remove('hidden');
                formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            })
            .finally(() => {
                // Reset button state
                submitButton.disabled = false;
                submitButton.classList.remove('loading');
                submitButton.textContent = originalText;
            });
        });
    }
    
    // Smooth scrolling for anchor links
    function initSmoothScrolling() {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', function(event) {
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // Special handling for skip links - use default behavior for accessibility
                    if (this.classList.contains('skip-link')) {
                        // Let default browser behavior handle skip links
                        // Focus the target element for screen readers
                        targetElement.focus();
                        return;
                    }
                    
                    event.preventDefault();
                    
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight - 20;
                    
                    // Update URL hash without triggering default behavior
                    history.pushState(null, null, targetId);
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Close mobile menu if open
                    const mobileMenu = document.getElementById('mobile-menu');
                    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
                    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                        mobileMenu.classList.add('hidden');
                        mobileMenuToggle.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });
    }
    
    // Lazy loading for images
    function initLazyLoading() {
        const images = document.querySelectorAll('img[loading="lazy"]');
        
        if ('IntersectionObserver' in window && images.length > 0) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.classList.remove('loading');
                        observer.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => {
                img.classList.add('loading');
                imageObserver.observe(img);
            });
        }
    }
    
    // Accessibility improvements
    function initAccessibility() {
        // Add focus visible polyfill for better keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('user-is-tabbing');
            }
        });
        
        document.addEventListener('mousedown', function() {
            document.body.classList.remove('user-is-tabbing');
        });
        
        // Announce language changes to screen readers
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', function() {
                const announcement = document.createElement('div');
                announcement.setAttribute('aria-live', 'polite');
                announcement.setAttribute('aria-atomic', 'true');
                announcement.className = 'sr-only';
                announcement.textContent = `Language changed to ${this.options[this.selectedIndex].text}`;
                document.body.appendChild(announcement);
                
                setTimeout(() => {
                    document.body.removeChild(announcement);
                }, 1000);
                
                updateLanguage(this.value);
            });
        }
    }
    
    // Performance monitoring
    function initPerformanceMonitoring() {
        // Log performance metrics when page loads
        window.addEventListener('load', function() {
            if ('performance' in window) {
                const perfData = performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                console.log(`Page load time: ${loadTime}ms`);
                
                // Log Largest Contentful Paint if available
                if ('PerformanceObserver' in window) {
                    const observer = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        console.log(`LCP: ${lastEntry.startTime.toFixed(2)}ms`);
                    });
                    
                    try {
                        observer.observe({ entryTypes: ['largest-contentful-paint'] });
                    } catch (e) {
                        // LCP not supported
                    }
                }
            }
        });
    }
    
    // Mobile detection for tel links
    function isMobileUA(){
        return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator?.userAgentData?.mobile === true);
    }

    // Hamburger toggle
    function initHamburgerMenu() {
        const btn = document.getElementById('mobile-menu-toggle');
        const panel = document.getElementById('mobile-menu');
        if (btn && panel) {
            btn.addEventListener('click', () => {
                panel.classList.toggle('hidden');
                btn.setAttribute('aria-expanded', !panel.classList.contains('hidden'));
            });
            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && e.target !== btn) {
                    panel.classList.add('hidden');
                    btn.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }

    // Initialize everything when DOM is ready
    document.addEventListener('DOMContentLoaded', async function() {
        const m = document.getElementById('language-select');         // mobile
        const d = document.getElementById('language-select-desktop'); // desktop

        if (m) m.addEventListener('change', e => updateLanguage(e.target.value));
        if (d) d.addEventListener('change', e => updateLanguage(e.target.value));

        // Initialize hamburger menu
        initHamburgerMenu();

        // Smooth scroll for hero CTAs
        const wireSmooth = (sel) => {
            const a = document.querySelector(sel);
            if (!a) return;
            a.addEventListener('click', (e) => {
                const href = a.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({behavior:'smooth', block:'start'});
                    }
                }
            });
        };
        wireSmooth('#cta-help');
        wireSmooth('#cta-services');

        // Speed-dial functionality
        const sd = document.getElementById('speedDial');
        const fabMain = document.getElementById('fabMain');
        if (sd && fabMain) fabMain.addEventListener('click', () => sd.classList.toggle('open'));

        // Safe tel link handling with desktop fallback
        document.querySelectorAll('a[href^="tel:"]').forEach(a=>{
            a.addEventListener('click', (e)=>{
                if (!isMobileUA()){ // desktop: avoid error, copy number
                    e.preventDefault();
                    const n = a.getAttribute('href').replace('tel:','');
                    navigator.clipboard?.writeText?.(n);
                    console.log('Phone copied:', n);
                    // optional: show toast notification
                }
            });
        });

        // initial RU
        await updateLanguage('ru');
        
        // Initialize all functionality
        initMobileMenu();
        initFAQ();
        initContactForm();
        initSmoothScrolling();
        initLazyLoading();
        initAccessibility();
        initPerformanceMonitoring();
        
        
        console.log('NeoConsult landing page initialized successfully');
    });
    
    // Expose functions globally for addon compatibility
    window.updateLanguage = updateLanguage;
    window.switchLanguage = updateLanguage;
    
})();

// === Hamburger ===
document.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('hamburger');const p=document.getElementById('mobileMenu');if(b&&p){b.addEventListener('click',()=>p.classList.toggle('open'));document.addEventListener('click',e=>{if(!p.contains(e.target)&&e.target!==b)p.classList.remove('open')});}});

// === Speed-Dial toggle ===
document.addEventListener('DOMContentLoaded',()=>{const sd=document.getElementById('speedDial');const m=document.getElementById('fabMain');if(sd&&m){m.addEventListener('click',()=>sd.classList.toggle('open'));}});

// === Smooth scroll for hero CTAs ===
function bindSmooth(id){const a=document.querySelector(id);if(!a)return;a.addEventListener('click',e=>{const href=a.getAttribute('href');if(href&&href.startsWith('#')){const t=document.querySelector(href);if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'})}}});}
document.addEventListener('DOMContentLoaded',()=>{bindSmooth('#cta-help');bindSmooth('#cta-services')});

// === tel: desktop fallback (idempotent) ===
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('a[href^="tel:"]').forEach(a=>{if(a.dataset.telBound)return;a.dataset.telBound='1';a.addEventListener('click',e=>{const isMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.userAgentData&&navigator.userAgentData.mobile);if(!isMobile){e.preventDefault();const n=a.getAttribute('href').replace('tel:','');navigator.clipboard?.writeText?.(n);console.log('Phone copied:',n);}}, {capture:true});});});

// === Callback popup submit (WhatsApp) ===
document.addEventListener('DOMContentLoaded',()=>{const send=document.getElementById('cbSend');const phone=document.getElementById('cbPhone');const close=document.getElementById('cbClose');const modal=document.getElementById('callbackModal');function validMD(v){return /^\+?373\d{8}$/.test(v.replace(/\s|-/g,''))}function openWA(t){window.open(`https://wa.me/37361060756?text=${encodeURIComponent(t)}`,'_blank','noopener')}if(send&&phone){send.addEventListener('click',()=>{const v=phone.value.trim();if(!validMD(v)){phone.focus();phone.classList.add('error');setTimeout(()=>phone.classList.remove('error'),1500);return}openWA(`Callback request. Phone: ${v}`)})}if(close&&modal){close.addEventListener('click',()=>modal.setAttribute('aria-hidden','true'))}});

// === i18n runtime helpers (non-breaking) ===
window.updateLanguage=window.updateLanguage||async function(lang){try{const abs=await fetch(`/i18n/${lang}.json`).then(r=>r.ok?r:null).catch(()=>null);const res=abs||await fetch(`./i18n/${lang}.json`).then(r=>r.ok?r:null);if(!res){console.warn('[i18n] no json for',lang);return}const dict=await res.json();document.documentElement.setAttribute('lang',lang);document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.getAttribute('data-i18n');if(dict[k]!=null)el.textContent=dict[k]});document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{const k=el.getAttribute('data-i18n-placeholder');if(dict[k]!=null)el.setAttribute('placeholder',dict[k])});const sel1=document.getElementById('language-select');const sel2=document.getElementById('language-select-desktop');if(sel1)sel1.value=lang;if(sel2)sel2.value=lang;}catch(e){console.warn('[i18n] switch fail',e)}};

document.addEventListener('DOMContentLoaded',()=>{const s1=document.getElementById('language-select');const s2=document.getElementById('language-select-desktop');function wire(s){if(!s)return;s.addEventListener('change',e=>{updateLanguage(e.target.value)})}wire(s1);wire(s2);updateLanguage('ru')});

// ---------- I18N AUTO-TAG (runs once) ----------
function tagI18nOnce(){
  if (document.body.dataset.i18nTagged) return; document.body.dataset.i18nTagged = '1';
  // Services section
  const secServices = document.getElementById('services') || document.querySelector('[data-section="services"], section.services');
  if (secServices){
    secServices.querySelector('h2')?.setAttribute('data-i18n','services.title');
    (secServices.querySelector('p')||secServices.querySelector('.section-subtitle'))?.setAttribute('data-i18n','services.subtitle');
    const cards = secServices.querySelectorAll('.service-card, .card, .service-item');
    if (cards[0]){ cards[0].querySelector('h3')?.setAttribute('data-i18n','services.cards.pc.title'); cards[0].querySelector('p')?.setAttribute('data-i18n','services.cards.pc.desc'); }
    if (cards[1]){ cards[1].querySelector('h3')?.setAttribute('data-i18n','services.cards.sw.title'); cards[1].querySelector('p')?.setAttribute('data-i18n','services.cards.sw.desc'); }
    if (cards[2]){ cards[2].querySelector('h3')?.setAttribute('data-i18n','services.cards.sec.title'); cards[2].querySelector('p')?.setAttribute('data-i18n','services.cards.sec.desc'); }
    if (cards[3]){ cards[3].querySelector('h3')?.setAttribute('data-i18n','services.cards.hw.title'); cards[3].querySelector('p')?.setAttribute('data-i18n','services.cards.hw.desc'); }
    if (cards[4]){ cards[4].querySelector('h3')?.setAttribute('data-i18n','services.cards.train.title'); cards[4].querySelector('p')?.setAttribute('data-i18n','services.cards.train.desc'); }
    if (cards[5]){ cards[5].querySelector('h3')?.setAttribute('data-i18n','services.cards.backup.title'); cards[5].querySelector('p')?.setAttribute('data-i18n','services.cards.backup.desc'); }
  }
  // 24/7 Remote Support block
  const secRemote = document.getElementById('remote-support') || document.querySelector('[data-section="remote-support"], section.remote');
  if (secRemote){
    secRemote.querySelector('h2')?.setAttribute('data-i18n','remote.title');
    (secRemote.querySelector('p')||secRemote.querySelector('.section-subtitle'))?.setAttribute('data-i18n','remote.subtitle');
  }
  // Pricing section
  const secPricing = document.getElementById('pricing') || document.querySelector('[data-section="pricing"], section.pricing');
  if (secPricing){
    secPricing.querySelector('h2')?.setAttribute('data-i18n','pricing.title');
    (secPricing.querySelector('p')||secPricing.querySelector('.section-subtitle'))?.setAttribute('data-i18n','pricing.subtitle');
    const cards = secPricing.querySelectorAll('.pricing-card, .plan, .card');
    if (cards[0]){
      cards[0].querySelector('h3')?.setAttribute('data-i18n','pricing.basic.title');
      cards[0].querySelector('.plan-desc, p')?.setAttribute('data-i18n','pricing.basic.desc');
      const lis = cards[0].querySelectorAll('li');
      lis[0]?.setAttribute('data-i18n','pricing.basic.f1');
      lis[1]?.setAttribute('data-i18n','pricing.basic.f2');
      lis[2]?.setAttribute('data-i18n','pricing.basic.f3');
      cards[0].querySelector('button, a.btn')?.setAttribute('data-i18n','pricing.basic.cta');
    }
    if (cards[1]){
      cards[1].querySelector('h3')?.setAttribute('data-i18n','pricing.pro.title');
      cards[1].querySelector('.plan-desc, p')?.setAttribute('data-i18n','pricing.pro.desc');
      const tag = cards[1].querySelector('.badge, .most-popular'); if (tag) tag.setAttribute('data-i18n','pricing.pro.badge');
      const lis = cards[1].querySelectorAll('li');
      lis[0]?.setAttribute('data-i18n','pricing.pro.f0');
      lis[1]?.setAttribute('data-i18n','pricing.pro.f1');
      lis[2]?.setAttribute('data-i18n','pricing.pro.f2');
      lis[3]?.setAttribute('data-i18n','pricing.pro.f3');
      cards[1].querySelector('button, a.btn')?.setAttribute('data-i18n','pricing.pro.cta');
    }
    if (cards[2]){
      cards[2].querySelector('h3')?.setAttribute('data-i18n','pricing.ent.title');
      cards[2].querySelector('.plan-price .text, .plan-desc, p')?.setAttribute('data-i18n','pricing.ent.price');
      const desc = cards[2].querySelector('.plan-desc2, p + p'); if (desc) desc.setAttribute('data-i18n','pricing.ent.desc');
      const lis = cards[2].querySelectorAll('li');
      lis[0]?.setAttribute('data-i18n','pricing.ent.f1');
      lis[1]?.setAttribute('data-i18n','pricing.ent.f2');
      lis[2]?.setAttribute('data-i18n','pricing.ent.f3');
      lis[3]?.setAttribute('data-i18n','pricing.ent.f4');
      cards[2].querySelector('button, a.btn')?.setAttribute('data-i18n','pricing.ent.cta');
    }
  }
  // How We Work / FAQ / Contact
  const secHow = document.getElementById('how') || document.querySelector('[data-section="how"], section.how');
  if (secHow){ secHow.querySelector('h2')?.setAttribute('data-i18n','how.title'); }
  const secFaq = document.getElementById('faq') || document.querySelector('[data-section="faq"], section.faq');
  if (secFaq){ secFaq.querySelector('h2')?.setAttribute('data-i18n','faq.title'); }
  const secContact = document.getElementById('contact') || document.querySelector('[data-section="contact"], section.contact');
  if (secContact){ secContact.querySelector('h2')?.setAttribute('data-i18n','contact.title'); }
  // Footer columns
  const footer = document.querySelector('footer');
  if (footer){
    const colTitles = footer.querySelectorAll('h3, h4');
    colTitles[0]?.setAttribute('data-i18n','footer.col.about');
    colTitles[1]?.setAttribute('data-i18n','footer.col.services');
    colTitles[2]?.setAttribute('data-i18n','footer.col.company');
    colTitles[3]?.setAttribute('data-i18n','footer.col.connect');
    const connect = footer.querySelector('.connect, [data-footer="connect"]');
    if (connect){
      const items = connect.querySelectorAll('li, a, span');
      items[0]?.setAttribute('data-i18n','footer.connect.phone');
      items[1]?.setAttribute('data-i18n','footer.connect.email');
      items[2]?.setAttribute('data-i18n','footer.connect.wa');
      items[3]?.setAttribute('data-i18n','footer.connect.tg');
    }
  }
}

// ---------- Harden updateLanguage: text, placeholder, title, aria-label, html ----------
const __applyI18n = (dict)=>{
  document.querySelectorAll('[data-i18n]').forEach(el=>{ const k=el.getAttribute('data-i18n'); if(dict[k]!=null) el.textContent=dict[k]; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{ const k=el.getAttribute('data-i18n-placeholder'); if(dict[k]!=null) el.setAttribute('placeholder',dict[k]); });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{ const k=el.getAttribute('data-i18n-title'); if(dict[k]!=null) el.setAttribute('title',dict[k]); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>{ const k=el.getAttribute('data-i18n-aria'); if(dict[k]!=null) el.setAttribute('aria-label',dict[k]); });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{ const k=el.getAttribute('data-i18n-html'); if(dict[k]!=null) el.innerHTML=dict[k]; });
};

window.updateLanguage = window.updateLanguage || async function(lang){
  try{
    tagI18nOnce();
    const abs = await fetch(`/i18n/${lang}.json`).then(r=>r.ok?r:null).catch(()=>null);
    const res = abs || await fetch(`./i18n/${lang}.json`).then(r=>r.ok?r:null);
    if(!res){ console.warn('[i18n] not found', lang); return; }
    const dict = await res.json();
    document.documentElement.setAttribute('lang', lang);
    __applyI18n(dict);
    const s1=document.getElementById('language-select'); const s2=document.getElementById('language-select-desktop');
    if(s1) s1.value=lang; if(s2) s2.value=lang;
  }catch(e){ console.warn('[i18n] switch failed', e); }
};

document.addEventListener('DOMContentLoaded',()=>{ tagI18nOnce(); updateLanguage('ru'); });

// ---------- Make all in-hero anchors scroll, ensure not overlapped ----------
function enableSmoothAnchors(){
  document.querySelectorAll('.hero a[href^="#"], .btn[href^="#"], a.js-scroll[href^="#"]').forEach(a=>{
    if(a.dataset.scrollBound) return; a.dataset.scrollBound='1';
    a.addEventListener('click',e=>{ const id=a.getAttribute('href'); const t=id && document.querySelector(id); if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth', block:'start'}); }});
  });
}
document.addEventListener('DOMContentLoaded',()=>{
  enableSmoothAnchors();
  const hero=document.querySelector('.hero'); if(hero){ hero.style.position='relative'; hero.querySelectorAll('.btn, a.btn').forEach(b=>{ b.style.position='relative'; b.style.zIndex='2'; b.style.pointerEvents='auto'; }); }
});

/* ===== PATCH: single tel: fallback + header-aware smooth scroll ===== */
(function(){
  // --- One desktop tel: handler (capture) to avoid duplicate logs ---
  document.addEventListener('DOMContentLoaded', function(){
    var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.userAgentData && navigator.userAgentData.mobile);
    document.addEventListener('click', function(e){
      var a = e.target && e.target.closest && e.target.closest('a[href^="tel:"]');
      if(!a) return;
      if(isMobile) return; // let mobile dialer work normally
      // desktop fallback: stop other handlers to avoid double logs
      e.preventDefault();
      e.stopImmediatePropagation();
      var n = (a.getAttribute('href')||'').replace('tel:','');
      try{ if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(n); }catch(_){}
      if(!a.dataset.telLogged){
        a.dataset.telLogged = '1';
        console.log('Phone copied:', n);
        // reset flag shortly to allow next distinct clicks to log once
        setTimeout(function(){ a.dataset.telLogged = ''; }, 200);
      }
    }, {capture:true});
  });

  // --- Header-aware smooth scroll for hero CTAs & in-hero anchors ---
  function bindSmoothAnchor(el){
    if(!el || el.dataset.smoothBound) return;
    el.dataset.smoothBound = '1';
    el.addEventListener('click', function(e){
      var href = el.getAttribute('href');
      if(!href || href.charAt(0) !== '#') return;
      var target = document.querySelector(href);
      if(!target) return;
      e.preventDefault();
      var header = document.querySelector('.site-header');
      var offset = (header ? header.offsetHeight : 0) + 8; // small breathing room
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  }
  function enableHeroSmooth(){
    var anchors = Array.from(document.querySelectorAll('.hero a[href^="#"], .btn[href^="#"], a.js-scroll[href^="#"]'));
    anchors.forEach(bindSmoothAnchor);
    // explicit ids if present
    var help = document.getElementById('cta-help');
    var svc  = document.getElementById('cta-services');
    if(help) bindSmoothAnchor(help);
    if(svc)  bindSmoothAnchor(svc);
  }
  document.addEventListener('DOMContentLoaded', enableHeroSmooth);
})();
/* ===== END PATCH ===== */
