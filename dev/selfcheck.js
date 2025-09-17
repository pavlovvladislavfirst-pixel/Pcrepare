// dev/selfcheck.js
(function () {
  if (!/[\?&]selfcheck=1\b/.test(location.search) && !window.__SELF_CHECK__) return;

  const log = (...a) => console.log('[SELF-CHECK]', ...a);
  const warn = (...a) => console.warn('[SELF-CHECK]', ...a);
  const pass = (ok, msg) => ({ ok: !!ok, msg });

  async function fetchOk(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      return r.ok ? { ok: true, status: r.status, url: r.url } :
                    { ok: false, status: r.status, url: r.url };
    } catch (e) {
      return { ok: false, error: e?.message || String(e), url };
    }
  }

  function textOf(sel) {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : '';
  }

  function getSelects() {
    return {
      mobile: document.getElementById('language-select'),
      desktop: document.getElementById('language-select-desktop')
    };
  }

  async function setLangUI(lang) {
    const { mobile, desktop } = getSelects();
    // Prefer existing updateLanguage if present
    if (typeof window.updateLanguage === 'function') {
      await window.updateLanguage(lang);
    } else {
      // Fallback: dispatch change on existing selects
      if (mobile) { mobile.value = lang; mobile.dispatchEvent(new Event('change', { bubbles: true })); }
      if (desktop) { desktop.value = lang; desktop.dispatchEvent(new Event('change', { bubbles: true })); }
      // small wait for async fetch/render
      await new Promise(r => setTimeout(r, 150));
    }
  }

  async function runI18nSelfCheck() {
    const report = { steps: [], summary: {} };

    // 1) JSON reachability
    const langs = ['ru', 'ro', 'en'];
    for (const L of langs) {
      const abs = await fetchOk(`/i18n/${L}.json`);
      let res = abs;
      if (!abs.ok) {
        const rel = await fetchOk(`./i18n/${L}.json`);
        res = rel;
      }
      report.steps.push(pass(res.ok, `Fetch ${L}.json → ${res.url || ''} [${res.status || res.error || 'ERR'}]`));
    }

    // 2) Selects exist
    const { mobile, desktop } = getSelects();
    report.steps.push(pass(!!mobile, '#language-select (mobile) exists'));
    report.steps.push(pass(!!desktop, '#language-select-desktop (desktop) exists'));

    // Probe element keys (adjust selectors to real data-i18n keys present on page)
    const probes = [
      { key: 'hero.title', sel: '[data-i18n="hero.title"]' },
      { key: 'nav.services', sel: '[data-i18n="nav.services"]' }
    ];

    // 3) Start RU
    await setLangUI('ru');
    const langRU = document.documentElement.lang;
    report.steps.push(pass(langRU === 'ru', `<html lang> set to 'ru' on boot`));

    const ruTexts = {};
    for (const p of probes) ruTexts[p.key] = textOf(p.sel);

    // 4) Switch to RO, verify changes
    await setLangUI('ro');
    const langRO = document.documentElement.lang;
    report.steps.push(pass(langRO === 'ro', `<html lang> updated to 'ro'`));

    let deltaRO = 0;
    for (const p of probes) {
      const now = textOf(p.sel);
      if (now && now !== ruTexts[p.key]) deltaRO++;
    }
    report.steps.push(pass(deltaRO > 0, `Visible text updated on RO for ${deltaRO}/${probes.length} probes`));

    // 5) Switch to EN, verify changes
    await setLangUI('en');
    const langEN = document.documentElement.lang;
    report.steps.push(pass(langEN === 'en', `<html lang> updated to 'en'`));

    // 6) Selects stay in sync
    const syncEN =
      (!mobile || mobile.value === 'en') &&
      (!desktop || desktop.value === 'en');
    report.steps.push(pass(syncEN, 'Both selects synchronized after EN'));

    // 7) No persistence keys
    let persisted = null;
    try {
      persisted = {
        preferred: localStorage.getItem('preferred-language'),
        i18nextLng: localStorage.getItem('i18nextLng')
      };
    } catch (e) { /* ignore */ }
    const noPersist = !persisted || (!persisted.preferred && !persisted.i18nextLng);
    report.steps.push(pass(noPersist, 'No language persistence in localStorage'));

    // Summary
    const okCount = report.steps.filter(s => s.ok).length;
    report.summary = {
      ok: okCount === report.steps.length,
      passed: okCount,
      total: report.steps.length
    };

    log('RESULT', report.summary);
    report.steps.forEach(s => (s.ok ? log : warn)(s.msg));
    return report;
  }

  // Expose to console
  window.runI18nSelfCheck = runI18nSelfCheck;

  // Optional: auto-run when explicitly requested ?selfcheck=1&autorun=1
  if (/[?&]autorun=1\b/.test(location.search)) {
    runI18nSelfCheck().then(r => {
      console.log('%cSelf-check done', 'color: #16a34a; font-weight:bold');
      console.table(r.steps.map((s, i) => ({ step: i + 1, ok: s.ok, msg: s.msg })));
    });
  }

  log('Self-check loaded. In console run: runI18nSelfCheck()');
})();
