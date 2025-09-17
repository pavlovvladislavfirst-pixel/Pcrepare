/* === NeoConsult unified JS (safe, additive) === */
(function(){
  const PHONE = '+37361060756';
  const MAIL  = 'neoconsult.tech@gmail.com';
  const TG    = 'https://t.me/+Y2Su81TKqYxlMTA6';
  const WA    = 'https://wa.me/37361060756';
  const LANG_KEY='preferred-language';

  /* ---- i18n ---- */
  function curLang(){
    const ls=localStorage.getItem(LANG_KEY); 
    if(ls) return ls; 
    const d=(document.documentElement.getAttribute('lang')||(navigator.language||'en')).slice(0,2).toLowerCase();
    return ['ru','ro','en'].includes(d)?d:'en';
  }
  function setLang(lang,place){
    localStorage.setItem(LANG_KEY,lang); 
    document.documentElement.setAttribute('lang',lang); 
    applyVisibility(lang);
    try{
      if(typeof window.updateLanguage==='function') window.updateLanguage(lang);
      else if(typeof window.setLanguage==='function') window.setLanguage(lang);
    }catch(e){}
    try{ window.dataLayer=window.dataLayer||[]; window.dataLayer.push({event:'lang_change', lang, place}); }catch(e){}
  }
  function applyVisibility(lang){
    document.querySelectorAll('.i18n[lang],[data-i18n][lang]').forEach(el=>{
      const v=(el.getAttribute('lang')||'').slice(0,2).toLowerCase();
      if(v && ['ru','ro','en'].includes(v)) el.style.display=(v===lang)?'':'none';
    });
  }

  /* ---- header: brand text and language selects ---- */
  function ensureBrandText(){
    const h=document.querySelector('header')||document.querySelector('.site-header'); if(!h) return;
    h.classList.add('nc-header');
    // remove image logos, keep text
    h.querySelectorAll('img[alt*="NeoConsult" i], .logo img, .site-logo img, .brand img, svg.logo, .nc-logo').forEach(n=>n.remove());
    if(!h.querySelector('.brand-text')){
      const bt=document.createElement('span'); bt.className='brand-text'; bt.textContent='NeoConsult';
      const target=h.querySelector('.logo, .site-logo, .brand')||h.firstElementChild;
      if(target) target.appendChild(bt); else h.insertBefore(bt, h.firstChild);
    }
    // hide possible contact bar next sibling if only tel/wa/tg
    const sib=h.nextElementSibling;
    if(sib){
      const links=[...sib.querySelectorAll('a')];
      if(links.length && links.every(a=>/^(tel:|https?:\/\/(wa\.me|t\.me))/.test(a.getAttribute('href')||''))){
        sib.style.display='none';
      }
    }
  }
  function mountLangSelects(){
    const h=document.querySelector('header')||document.querySelector('.site-header'); if(!h) return;
    const nav=h.querySelector('.site-nav')||h.querySelector('nav')||h;
    // desktop select
    if(!document.getElementById('language-select-desktop')){
      const d=document.createElement('select');
      d.id='language-select-desktop'; d.className='lang-select'; d.setAttribute('aria-label','Select language');
      d.innerHTML="<option value='en'>EN</option><option value='ru'>RU</option><option value='ro'>RO</option>";
      (nav.parentElement||h).appendChild(d);
    }
    // mobile select inside existing mobile menu
    const mobileMenu=document.getElementById('mobile-menu')||h.querySelector('.mobile-menu')||nav;
    if(!document.getElementById('language-select-mobile')){
      const m=document.createElement('select');
      m.id='language-select-mobile'; m.className='lang-select'; m.setAttribute('aria-label','Select language');
      m.innerHTML="<option value='en'>EN</option><option value='ru'>RU</option><option value='ro'>RO</option>";
      mobileMenu.appendChild(m);
    }
    // sync
    const sels=[...document.querySelectorAll('.lang-select')];
    const cur=curLang(); sels.forEach(s=> s.value=cur);
    sels.forEach(sel=> sel.addEventListener('change',()=>{
      const v=sel.value; sels.forEach(s=> s.value=v); setLang(v, sel.id.includes('mobile')?'menu':'header');
    }));
  }

  /* ---- contacts & links normalization ---- */
  function normalizeContacts(){
    document.querySelectorAll('a[href^="tel:"], .tel, .phone').forEach(a=>{
      if(a.tagName==='A') a.href='tel:+37361060756';
      if(!/\d/.test(a.textContent||'')) a.textContent=PHONE;
    });
    document.querySelectorAll('a[href^="mailto:"], .email').forEach(a=>{
      if(a.tagName==='A') a.href='mailto:'+MAIL;
      if(!a.textContent.trim()) a.textContent=MAIL;
    });
    document.querySelectorAll('a[href*="wa.me"]').forEach(a=> a.href=WA);
    document.querySelectorAll('a[href*="t.me"], a[href*="telegram"]').forEach(a=> a.href=TG);
  }

  /* ---- city select (MD + PMR) ---- */
  function injectCitySelect(){
    const cities=['Chișinău','Bălți','Tiraspol','Bender','Rîbnița','Cahul','Orhei','Hîncești','Comrat','Ceadîr-Lunga','Edineț','Soroca','Ungheni','Florești','Drochia','Căușeni','Anenii Noi','Ialoveni','Strășeni','Fălești','Nisporeni','Ștefan Vodă','Șoldănești','Cimișlia','Rezina','Cantemir','Criuleni','Dubăsari','Telenești','Leova','Basarabeasca','Glodeni'];
    const form=document.querySelector('form, .contact-form, .lead-form'); if(!form) return;
    if(form.querySelector('select[name="city"]')) return;
    const sel=document.createElement('select');
    sel.name='city'; sel.required=true; sel.style.cssText='width:100%;padding:10px 12px;border:1px solid var(--nc-border);border-radius:10px;margin-top:10px';
    sel.innerHTML='<option value="" disabled selected>— Выберите город —</option>'+cities.map(c=>`<option>${c}</option>`).join('');
    const ref=form.querySelector('textarea, [name*="message" i], [name*="tema" i]')||form.querySelector('input, select');
    if(ref) ref.parentElement.insertBefore(sel, ref); else form.appendChild(sel);
  }

  /* ---- hero, toTop, FAB, side push ---- */
  function initHero(){
    const hero=document.querySelector('.hero, .section-hero, section.hero, header.hero'); if(!hero) return;
    hero.classList.add('nc-hero-mesh','nc-hero-contrast');
  }
  function initToTop(){
    if(document.querySelector('.nc-totop')) return;
    const b=document.createElement('button'); b.className='nc-totop'; b.type='button'; b.setAttribute('aria-label','Up');
    b.innerHTML='<svg width=18 height=18 viewBox="0 0 24 24" fill="none"><path d="M12 8l-6 6m6-6l6 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.appendChild(b);
    const reduced=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const go=()=> reduced? window.scrollTo(0,0): window.scrollTo({top:0,behavior:'smooth'});
    b.addEventListener('click',go);
    b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
    const onS=()=>{const y=window.pageYOffset||document.documentElement.scrollTop; b.classList.toggle('show', y>400)};
    window.addEventListener('scroll', onS,{passive:true}); onS();
  }
  function initFAB(){
    if(document.querySelector('.nc-fab')) return;
    const box=document.createElement('div'); box.className='nc-fab';
    box.innerHTML='<button class="main" aria-label="Menu">+</button>\
      <ul>\
        <li><a class="nc-call" href="tel:+37361060756" title="Call">📞</a></li>\
        <li><a class="nc-wa" href="https://wa.me/37361060756" target="_blank" rel="noopener" title="WhatsApp">🟢</a></li>\
        <li><a class="nc-tg" href="https://t.me/+Y2Su81TKqYxlMTA6" target="_blank" rel="noopener" title="Telegram">✈️</a></li>\
      </ul>';
    document.body.appendChild(box);
    box.querySelector('.main').addEventListener('click',()=> box.classList.toggle('open'));
  }
  function initSidePush(){
    if(document.querySelector('.nc-side-push')) return;
    const box=document.createElement('div'); box.className='nc-side-push callback-modal'; box.id='callbackModal'; box.setAttribute('aria-hidden','true');
    box.innerHTML='<div class="callback-header">\
        <h3 data-i18n="popup.title">Бесплатная диагностика в течение 24 часов</h3>\
        <button type="button" class="close" aria-label="Close" id="cbClose">×</button>\
      </div>\
      <div class="callback-body">\
        <input id="cbPhone" inputmode="tel" data-i18n-placeholder="popup.phone_placeholder" placeholder="+373..." autocomplete="tel">\
        <button class="cta" id="cbSend" data-i18n="popup.cta">Заказать звонок</button>\
      </div>';
    document.body.appendChild(box);
    
    function validMD(num){ return /^\+?373\d{8}$/.test(num.replace(/\s|-/g,'')); }
    function openWA(text){ window.open(`https://wa.me/37361060756?text=${encodeURIComponent(text)}`,'_blank','noopener'); }
    
    const close=()=> { box.setAttribute('aria-hidden','true'); box.classList.remove('show'); };
    const phone = box.querySelector('#cbPhone');
    const send = box.querySelector('#cbSend');
    
    box.querySelector('#cbClose').addEventListener('click', close);
    send.addEventListener('click',()=>{
      const v = phone.value.trim();
      if (!validMD(v)){ 
        phone.focus(); 
        phone.classList.add('error'); 
        setTimeout(()=>phone.classList.remove('error'),1500); 
        return; 
      }
      const msg = `Callback request. Phone: ${v}`;
      openWA(msg);
      close();
    });
    
    // Show popup after 5 minutes
    setTimeout(()=> { 
      box.classList.add('show'); 
      box.setAttribute('aria-hidden','false'); 
    }, 5*60*1000);
  }

  /* ---- Orhei -> Moldova text replacements ---- */
  function replaceOrhei(){
    const pairs=[
      [/\bОрхе[йе]\b/g,'Молдова'],[/\bОргеев\b/g,'Молдова'],[/\bпо\s+Орхею\b/g,'по всей Молдове'],[/\bв\s+Орхее\b/g,'в Молдове'],
      [/\bOrhei(?:ul)?\b/gi,'Moldova'],[/\bin\s+Orhei\b/gi,'across Moldova'],[/\bîn\s+Orhei\b/gi,'în toată Moldova']
    ];
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null); let n;
    while(n=w.nextNode()){
      let t=n.nodeValue, ch=false;
      for(const [re,r] of pairs){ if(re.test(t)){ t=t.replace(re,r); ch=true; } }
      if(ch) n.nodeValue=t;
    }
  }

  /* ---- Back-to-Top button ---- */
  function initBackToTop(){
    // Create Back-to-Top button
    const backBtn = document.createElement('button');
    backBtn.id = 'back-to-top';
    backBtn.innerText = '↑';
    backBtn.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(backBtn);
    // Show/hide button on scroll
    window.addEventListener('scroll', () => {
        backBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
    });
    // Smooth scroll to top on click
    backBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    try{
      ensureBrandText();
      mountLangSelects();
      normalizeContacts();
      injectCitySelect();
      initHero();
      initToTop();
      initFAB();
      initSidePush();
      initBackToTop();
      replaceOrhei();
      applyVisibility(curLang());
    }catch(e){ console.warn('nc patch error', e); }
  });
})();
