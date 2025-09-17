(function () {
  const log = (...a) => console.log('[QA]', ...a);
  const warn = (...a) => console.warn('[QA]', ...a);
  const pass = (ok, msg) => ({ ok: !!ok, msg });

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function fetchOk(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      return r.ok ? { ok: true, status: r.status, url: r.url } : { ok: false, status: r.status, url: r.url };
    } catch (e) {
      return { ok: false, error: e?.message || String(e), url };
    }
  }

  function q(sel, root = document) { return root.querySelector(sel); }
  function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function textOf(sel) { const el = q(sel); return el ? el.textContent.trim() : ''; }
  function css(el, prop) { return el ? getComputedStyle(el).getPropertyValue(prop) : ''; }
  function hidden(el) {
    if (!el) return true;
    const s = getComputedStyle(el);
    return s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0' || el.offsetParent === null;
  }
  function near(a, b, tol = 16) { return Math.abs(a - b) <= tol; }

  async function ensureLang(lang) {
    if (typeof window.updateLanguage === 'function') {
      await window.updateLanguage(lang);
      return true;
    }
    // Fallback: fire change on first select
    const selects = qa('#language-select, #language-select-desktop, .lang-select');
    const s = selects[0];
    if (!s) return false;
    s.value = lang;
    s.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    await sleep(150);
    return true;
  }

  async function runSiteQA() {
    const steps = [];

    // 1) I18N reachability
    for (const lang of ['ru', 'ro', 'en']) {
      let res = await fetchOk(`/i18n/${lang}.json`);
      if (!res.ok) res = await fetchOk(`./i18n/${lang}.json`);
      steps.push(pass(res.ok, `i18n ${lang}.json reachable → ${res.url || ''} [${res.status || res.error || 'ERR'}]`));
    }

    // 2) Runtime language switching & probes
    const probes = ['hero.title', 'form.subject_label', 'popup.title'];
    let beforeRU = {};
    await ensureLang('ru');
    steps.push(pass(document.documentElement.lang === 'ru', `<html lang> is 'ru' on init`));
    probes.forEach(k => beforeRU[k] = textOf(`[data-i18n="${k}"]`));

    await ensureLang('ro');
    const afterRO = probes.map(k => textOf(`[data-i18n="${k}"]`));
    const changedRO = afterRO.filter((v, i) => v && v !== beforeRU[probes[i]]).length;
    steps.push(pass(document.documentElement.lang === 'ro', `<html lang> switched to 'ro'`));
    steps.push(pass(changedRO > 0, `RO texts changed on probes (${changedRO}/${probes.length})`));

    await ensureLang('en');
    steps.push(pass(document.documentElement.lang === 'en', `<html lang> switched to 'en'`));

    // Select sync
    const selMobile = q('#language-select');
    const selDesk = q('#language-select-desktop');
    const synced = (!selMobile || selMobile.value === 'en') && (!selDesk || selDesk.value === 'en');
    steps.push(pass(synced, 'Language selects synchronized (EN)'));

    // 3) Header tablet mode (best-effort)
    if (innerWidth <= 1024) {
      const hb = q('.hamburger, .mobile-menu-toggle');
      const navLinks = q('.nav-links');
      const hiddenLinks = !navLinks || hidden(navLinks) || css(navLinks, 'display') === 'none' || navLinks.offsetWidth === 0;
      steps.push(pass(!!hb, 'Tablet: hamburger exists'));
      steps.push(pass(hiddenLinks, 'Tablet: desktop .nav-links hidden'));
    } else {
      steps.push(pass(true, 'Header tablet check skipped (width > 1024)'));
    }

    // 4) Floating widget
    const dials = qa('.speed-dial');
    steps.push(pass(dials.length === 1, `Speed-dial single instance (found ${dials.length})`));
    const dial = dials[0];
    steps.push(pass(dial ? css(dial, 'pointer-events').includes('none') : false, 'Speed-dial wrapper does not capture clicks (pointer-events:none)'));

    const wa = q('.fab-wa'), tg = q('.fab-tg');
    const waBg = css(wa, 'background-image'), tgBg = css(tg, 'background-image');
    const waOk = /whatsapp\.svg/i.test(waBg);
    const tgOk = /telegram\.svg/i.test(tgBg);
    steps.push(pass(!!wa && waOk, 'WhatsApp uses official icon'));
    steps.push(pass(!!tg && tgOk, 'Telegram uses official icon'));

    // 5) Hero CTA clickability
    const svc = q('#cta-services'), svcTarget = q('#services');
    const help = q('#cta-help'), helpTarget = q('#contact');
    if (svc && svcTarget) {
      const before = scrollY;
      svc.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await sleep(600);
      const moved = scrollY > before;
      const nearTop = svcTarget.getBoundingClientRect().top < 120;
      steps.push(pass(moved || nearTop, 'CTA Services scrolls to #services'));
    } else steps.push(pass(true, 'CTA Services check skipped (missing ids)'));

    if (help && helpTarget) {
      const before = scrollY;
      help.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await sleep(600);
      const moved = scrollY > before;
      const nearTop = helpTarget.getBoundingClientRect().top < 120;
      steps.push(pass(moved || nearTop, 'CTA Help scrolls to #contact'));
    } else steps.push(pass(true, 'CTA Help check skipped (missing ids)'));

    // 6) Popup responsive (<=520px)
    const cbBody = q('.callback-body');
    if (innerWidth <= 520 && cbBody) {
      const fd = css(cbBody, 'flex-direction').trim();
      const cta = q('.callback-body .cta');
      const w = cbBody.getBoundingClientRect().width;
      const wCta = cta ? cta.getBoundingClientRect().width : 0;
      steps.push(pass(fd === 'column', 'Popup: flex-direction is column on narrow width'));
      steps.push(pass(cta && wCta >= 0.95 * w, 'Popup: CTA ~100% width on narrow width'));
    } else {
      steps.push(pass(true, 'Popup narrow check skipped (width > 520 or missing)'));
    }

    // 7) tel: desktop fallback
    const tel = q('a[href^="tel:"]');
    if (tel) {
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      const dispatched = tel.dispatchEvent(ev); // false means preventDefault called
      // On desktop we expect preventDefault → dispatched === false (graceful fallback)
      const isDesktop = !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      steps.push(pass(!isDesktop || dispatched === false, 'tel: has graceful desktop fallback'));
    } else {
      steps.push(pass(true, 'No tel: link found (skipped)'));
    }

    // 8) Readability sanity for inputs/selects
    const sample = q('input, select, textarea');
    if (sample) {
      const c = getComputedStyle(sample).color;
      const bg = getComputedStyle(sample).backgroundColor;
      const bright = (rgb) => {
        const m = rgb.match(/\d+/g)?.map(Number) || [0,0,0];
        return (m[0]*299 + m[1]*587 + m[2]*114)/1000; // YIQ
      };
      const yText = bright(c), yBg = bright(bg);
      steps.push(pass(Math.abs(yText - yBg) > 80, 'Inputs/selects have sufficient contrast (sanity)'));
    } else steps.push(pass(true, 'Readability check skipped (no inputs)'));

    // 9) No legacy FAB duplicates
    const legacy = qa('.contact-buttons, .floating-buttons, .fab-container, .phone-widget').length;
    steps.push(pass(legacy === 0, 'No legacy FAB blocks present'));

    const ok = steps.every(s => s.ok);
    log('RESULT', { ok, passed: steps.filter(s => s.ok).length, total: steps.length });
    console.table(steps.map((s, i) => ({ step: i + 1, ok: s.ok, msg: s.msg })));

    // Visible overlay summary (non-blocking)
    try {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;background:#111827;color:#fff;font:12px/1.4 system-ui;padding:10px 12px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:320px;';
      wrap.innerHTML = `<div style="font-weight:600;margin-bottom:6px;">QA Summary: ${ok ? 'PASS' : 'CHECK'}</div>` +
        steps.map(s => `<div style="opacity:${s.ok ? 0.9 : 1};color:${s.ok ? '#a7f3d0' : '#fecaca'}">• ${s.msg}</div>`).join('');
      document.body.appendChild(wrap);
      setTimeout(() => wrap.remove(), 9000);
    } catch {}

    return { ok, steps };
  }

  // expose & autorun
  window.runSiteQA = runSiteQA;
  if (/[?&]qa=1\b/.test(location.search) && /[?&]autorun=1\b/.test(location.search)) {
    runSiteQA();
  }
})();
