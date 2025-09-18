(function () {
    'use strict';

    const SUPPORTED_LANGS = ['ru', 'ro', 'en'];
    const DEFAULT_LANG = 'ru';
    const STORAGE_KEY = 'preferred-language';

    let currentLanguage = DEFAULT_LANG;
    let translations = {};
    let mobileMenuToggle = null;
    let mobileMenu = null;

    function isSupportedLanguage(lang) {
        return SUPPORTED_LANGS.includes(lang);
    }

    async function fetchDictionary(lang) {
        const sources = [`/i18n/${lang}.json`, `./i18n/${lang}.json`];
        for (const url of sources) {
            try {
                const response = await fetch(url, { cache: 'no-store' });
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.warn(`[i18n] failed to load ${url}`, error);
            }
        }
        console.warn('[i18n] dictionary not found for', lang);
        return {};
    }

    function applyTranslations(dict) {
        if (!dict || typeof dict !== 'object') {
            return;
        }

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
                el.textContent = dict[key];
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
                el.setAttribute('placeholder', dict[key]);
            }
        });

        document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
            const key = el.getAttribute('data-i18n-aria');
            if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
                el.setAttribute('aria-label', dict[key]);
            }
        });

        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.getAttribute('data-i18n-html');
            if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
                el.innerHTML = dict[key];
            }
        });
    }

    function getLanguageSelects() {
        const nodes = Array.from(document.querySelectorAll('select[data-lang-switch], select.lang-select'));
        return nodes.filter((el, index, array) => array.indexOf(el) === index);
    }

    function syncSelectValues(lang) {
        getLanguageSelects().forEach((select) => {
            if (!select) return;
            const options = Array.from(select.options).map((opt) => opt.value);
            if (options.includes(lang)) {
                select.value = lang;
            }
        });
    }

    async function updateLanguage(lang, options = {}) {
        const target = isSupportedLanguage(lang) ? lang : DEFAULT_LANG;

        if (target === currentLanguage && Object.keys(translations).length) {
            syncSelectValues(target);
            return translations;
        }

        const dict = await fetchDictionary(target);
        translations = dict;
        currentLanguage = target;
        document.documentElement.setAttribute('lang', target);

        applyTranslations(dict);
        syncSelectValues(target);

        if (options.persist !== false) {
            try {
                localStorage.setItem(STORAGE_KEY, target);
            } catch (error) {
                console.warn('[i18n] unable to persist language', error);
            }
        }

        return dict;
    }

    function closeMobileMenu() {
        if (!mobileMenu || !mobileMenuToggle) return;
        if (mobileMenu.classList.contains('hidden')) return;
        mobileMenu.classList.add('hidden');
        mobileMenu.setAttribute('aria-hidden', 'true');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
    }

    function openMobileMenu() {
        if (!mobileMenu || !mobileMenuToggle) return;
        mobileMenu.classList.remove('hidden');
        mobileMenu.setAttribute('aria-hidden', 'false');
        mobileMenuToggle.setAttribute('aria-expanded', 'true');
    }

    function initMobileMenu() {
        mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        mobileMenu = document.getElementById('mobile-menu');

        if (!mobileMenuToggle || !mobileMenu) {
            return;
        }

        closeMobileMenu();

        mobileMenuToggle.addEventListener('click', () => {
            const isOpen = !mobileMenu.classList.contains('hidden');
            if (isOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        mobileMenu.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.matches('a[href]')) {
                closeMobileMenu();
            }
        });

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!mobileMenu.contains(target) && !mobileMenuToggle.contains(target)) {
                closeMobileMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeMobileMenu();
                mobileMenuToggle.focus();
            }
        });
    }

    function initFAQ() {
        document.querySelectorAll('[data-faq-toggle]').forEach((button) => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-faq-toggle');
                if (!targetId) return;
                const content = document.getElementById(`${targetId}-content`);
                if (!content) return;

                const isOpen = !content.classList.contains('hidden');
                content.classList.toggle('hidden', isOpen);
                button.setAttribute('aria-expanded', String(!isOpen));
            });
        });
    }

    function getValidationMessage(type) {
        if (type === 'required') {
            return translations['contact.form.validation.required'] || 'This field is required.';
        }
        if (type === 'email') {
            return translations['contact.form.validation.email'] || 'Please enter a valid email address.';
        }
        return '';
    }

    function validateField(field) {
        if (!(field instanceof HTMLElement)) {
            return true;
        }

        const wrapper = field.parentElement;
        const errorDiv = wrapper ? wrapper.querySelector('.error-message') : null;
        let message = '';

        if (field.hasAttribute('required')) {
            const value = (field.value || '').trim();
            if (!value) {
                message = getValidationMessage('required');
            }
        }

        if (!message && field instanceof HTMLInputElement && field.type === 'email') {
            const value = field.value.trim();
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                message = getValidationMessage('email');
            }
        }

        if (message) {
            field.classList.add('form-error');
            field.classList.remove('form-success');
            if (errorDiv) {
                errorDiv.textContent = message;
                errorDiv.classList.remove('hidden');
            }
            return false;
        }

        field.classList.remove('form-error');
        field.classList.add('form-success');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
        }
        return true;
    }

    function initContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        const successMessage = document.getElementById('form-success');
        const errorMessage = document.getElementById('form-error');
        const requiredFields = Array.from(form.querySelectorAll('[required]'));

        requiredFields.forEach((field) => {
            field.addEventListener('blur', () => validateField(field));
            field.addEventListener('input', () => {
                if (field.classList.contains('form-error')) {
                    validateField(field);
                }
            });
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();

            let isValid = true;
            requiredFields.forEach((field) => {
                if (!validateField(field)) {
                    isValid = false;
                }
            });

            if (!isValid) {
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton ? submitButton.textContent : '';
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.classList.add('loading');
                submitButton.textContent = translations['contact.form.sending'] || 'Sending...';
            }

            if (successMessage) successMessage.classList.add('hidden');
            if (errorMessage) errorMessage.classList.add('hidden');

            const formData = new FormData(form);

            fetch(form.action, {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            })
                .then(() => {
                    if (successMessage) {
                        successMessage.classList.remove('hidden');
                        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    form.reset();
                    form.querySelectorAll('.form-error, .form-success').forEach((el) => {
                        el.classList.remove('form-error', 'form-success');
                    });
                })
                .catch(() => {
                    if (errorMessage) {
                        errorMessage.classList.remove('hidden');
                        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                })
                .finally(() => {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.classList.remove('loading');
                        submitButton.textContent = originalText;
                    }
                });
        });
    }

    function initSmoothScrolling() {
        const header = document.querySelector('.header');
        const getOffset = () => (header ? header.offsetHeight : 0) + 12;

        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (event) => {
                const href = link.getAttribute('href');
                if (!href || href.length < 2 || link.classList.contains('skip-link')) {
                    return;
                }

                const target = document.querySelector(href);
                if (!target) {
                    return;
                }

                event.preventDefault();
                const top = target.getBoundingClientRect().top + window.scrollY - getOffset();
                window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                closeMobileMenu();
            });
        });
    }

    function initLazyLoading() {
        const images = document.querySelectorAll('img[loading="lazy"]');
        if (!('IntersectionObserver' in window) || images.length === 0) {
            return;
        }

        const observer = new IntersectionObserver((entries, instance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('loading');
                    instance.unobserve(entry.target);
                }
            });
        });

        images.forEach((img) => {
            img.classList.add('loading');
            observer.observe(img);
        });
    }

    function initAccessibility() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                document.body.classList.add('user-is-tabbing');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('user-is-tabbing');
        });

        getLanguageSelects().forEach((select) => {
            select.addEventListener('change', (event) => {
                const selectedOption = event.target.options[event.target.selectedIndex];
                const announcement = document.createElement('div');
                announcement.setAttribute('aria-live', 'polite');
                announcement.setAttribute('aria-atomic', 'true');
                announcement.className = 'sr-only';
                announcement.textContent = selectedOption ? selectedOption.textContent : '';
                document.body.appendChild(announcement);
                setTimeout(() => {
                    document.body.removeChild(announcement);
                }, 1000);
            });
        });
    }

    function initTelFallback() {
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.userAgentData && navigator.userAgentData.mobile);
        if (isMobile) {
            return;
        }

        document.addEventListener('click', (event) => {
            const target = event.target instanceof Element ? event.target.closest("a[href^='tel:']") : null;
            if (!target) return;

            event.preventDefault();
            const number = (target.getAttribute('href') || '').replace('tel:', '');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(number).catch(() => {});
            }
        }, { capture: true });
    }

    function initPerformanceMonitoring() {
        window.addEventListener('load', () => {
            if (!('performance' in window)) {
                return;
            }
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            console.log(`Page load time: ${loadTime}ms`);

            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        if (entries.length > 0) {
                            const lastEntry = entries[entries.length - 1];
                            console.log(`LCP: ${lastEntry.startTime.toFixed(2)}ms`);
                        }
                    });
                    observer.observe({ entryTypes: ['largest-contentful-paint'] });
                } catch (error) {
                    console.warn('PerformanceObserver not available', error);
                }
            }
        });
    }

    function resolveInitialLanguage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && isSupportedLanguage(stored)) {
                return stored;
            }
        } catch (error) {
            console.warn('[i18n] cannot read stored language', error);
        }

        const htmlLang = document.documentElement.getAttribute('lang');
        if (htmlLang && isSupportedLanguage(htmlLang)) {
            return htmlLang;
        }

        const browserLang = (navigator.language || navigator.userLanguage || '').slice(0, 2).toLowerCase();
        if (isSupportedLanguage(browserLang)) {
            return browserLang;
        }

        return DEFAULT_LANG;
    }

    function initLanguageSwitchers() {
        getLanguageSelects().forEach((select) => {
            select.addEventListener('change', (event) => {
                updateLanguage(event.target.value).catch((error) => {
                    console.error('[i18n] failed to switch language', error);
                });
            });
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        initMobileMenu();
        initFAQ();
        initContactForm();
        initSmoothScrolling();
        initLazyLoading();
        initAccessibility();
        initTelFallback();
        initPerformanceMonitoring();
        initLanguageSwitchers();

        const initialLang = resolveInitialLanguage();
        try {
            await updateLanguage(initialLang, { persist: false });
        } catch (error) {
            console.error('[i18n] failed to initialise language', error);
        }
    });

    window.updateLanguage = updateLanguage;
    window.switchLanguage = updateLanguage;
})();
