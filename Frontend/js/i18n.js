/* Public-site language layer. Keeps Spanish sources, updates text without replacing DOM. */
(() => {
  'use strict';
  if (/\/(?:admin|editor|registrador|soporte)\.html$/.test(location.pathname)) return;
  const supported = ['es', 'en', 'fr'], storageKey = 'icat_lang_manual';
  const locales = { es: 'es-PE', en: 'en-US', fr: 'fr-FR' };
  const dictionary = window.ICAT_DICT || {};
  const patterns = (window.ICAT_PATTERNS || []).map(([source,en,fr]) => ({ re: new RegExp(source), en, fr }));
  let saved; try { saved = localStorage.getItem(storageKey); } catch { /* Optional storage. */ }
  const prefix = location.pathname.match(/^\/(es|en|fr)(?:\/|$)/)?.[1];
  const query = new URLSearchParams(location.search).get('lang');
  let lang = [prefix,query,saved,'es'].find((value) => supported.includes(value));
  if (prefix || supported.includes(query)) { try { localStorage.setItem(storageKey,lang); } catch { /* Optional storage. */ } }
  document.documentElement.lang = lang;
  const texts = new WeakMap(), attributes = new WeakMap();
  const attrs = ['placeholder','aria-label','alt','title'];
  const excluded = 'script,style,noscript,textarea,code,pre,[contenteditable],[data-no-i18n],[translate="no"],#userNameDisplay,#redeemName,#perfilNombre,#perfilEmail,#perfilDni,#perfilTelefono,.review-user h3,.review-card>p,.bubble p,.case-btn strong,.case-btn small';
  const normalize = (value) => value.replace(/\s+/g,' ').trim();
  function t(value) {
    if (lang === 'es' || typeof value !== 'string') return value;
    const core = normalize(value); if (!core) return value;
    const direct = dictionary[core]?.[lang === 'en' ? 0 : 1];
    let translated = direct;
    if (!translated) { for (const pattern of patterns) { if (pattern.re.test(core)) { translated = core.replace(pattern.re, pattern[lang]); break; } } }
    return translated ? value.match(/^\s*/)[0] + translated + value.match(/\s*$/)[0] : value;
  }
  function text(node) {
    if (!node.parentElement || node.parentElement.closest(excluded)) return;
    const value = node.nodeValue; if (!value?.trim()) return;
    const previous = texts.get(node);
    const source = previous && value === previous.last ? previous.source : value;
    const next = t(source); texts.set(node,{ source,last:next });
    if (value !== next) node.nodeValue = next;
  }
  function translateAttributes(element) {
    if (element.closest('[data-no-i18n],[translate="no"],script,style')) return;
    let values = attributes.get(element); if (!values) { values = new Map(); attributes.set(element,values); }
    for (const name of attrs) {
      const value = element.getAttribute(name); if (!value) continue;
      const previous = values.get(name), source = previous && value === previous.last ? previous.source : value;
      const next = t(source); values.set(name,{ source,last:next });
      if (value !== next) element.setAttribute(name,next);
    }
  }
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) { text(node); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    translateAttributes(node);
    if (node.matches(excluded)) return;
    for (const child of node.childNodes) walk(child);
    if (node.matches('time[datetime],[data-i18n-date]')) formatDateElement(node);
  }
  function formatDateElement(node) {
    const value = node.getAttribute('datetime') || node.getAttribute('data-i18n-date');
    const date = new Date(value); if (Number.isNaN(date.getTime())) return;
    const options = node.matches('.review-date,[data-i18n-date]') ? { year:'numeric',month:'long',day:'numeric' } : { dateStyle:'medium',timeStyle:'short' };
    const next = new Intl.DateTimeFormat(locales[lang],{ timeZone:'America/Lima',...options }).format(date);
    if (node.textContent !== next) node.textContent = next;
  }
  function picker() {
    document.querySelectorAll('[data-locale]').forEach((element) => {
      if (element.dataset.locale === lang) element.setAttribute('aria-current','true');
      else element.removeAttribute('aria-current');
    });
  }
  function full() { walk(document.documentElement); picker(); }
  function setLang(code, persist = true) {
    if (!supported.includes(code) || code === lang) return;
    if (persist) { try { localStorage.setItem(storageKey,code); } catch { /* Language still changes in this tab. */ } }
    lang = code; document.documentElement.lang = code;
    // Keep slug, other query parameters, focus, form values and scroll position.
    const target = new URL(location.href); target.searchParams.set('lang',code);
    history.replaceState(history.state,'',target.href);
    full();
    document.dispatchEvent(new CustomEvent('icat:language-changed',{ detail:{ lang:code,locale:locales[code] } }));
  }
  window.ICAT_I18N = { get lang() { return lang; }, get locale() { return locales[lang]; }, t, setLang, supported, translateElement: walk,
    formatDate(value,options = {}) { return new Intl.DateTimeFormat(locales[lang],{ timeZone:'America/Lima',...options }).format(new Date(value)); } };
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') text(record.target);
      else if (record.type === 'attributes') { translateAttributes(record.target); if (record.target.hasAttribute('data-i18n-date')) formatDateElement(record.target); }
      else for (const node of record.addedNodes) walk(node);
    }
  });
  observer.observe(document.documentElement,{ childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:[...attrs,'data-i18n-date'] });
  // Parser mutations are translated before paint: never hide the document/header.
  full();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',full,{ once:true });
  addEventListener('storage',(event) => { if (event.key === storageKey && supported.includes(event.newValue)) setLang(event.newValue,false); });
  addEventListener('pageshow',(event) => {
    let latest; try { latest = localStorage.getItem(storageKey); } catch { /* Optional storage. */ }
    if (event.persisted && supported.includes(latest) && latest !== lang) setLang(latest,false);
    else full();
  });
})();
