/* Apply account presentation before the first paint; permissions still come from the API. */
(() => {
  let member = false, name = 'Mi cuenta';
  try { member = Boolean(localStorage.getItem('icat_token')); name = JSON.parse(localStorage.getItem('icat_user') || 'null')?.nombre || name; } catch { /* Guest presentation. */ }
  const apply = () => {
    const guest = document.getElementById('guestArea'), user = document.getElementById('userArea'), label = document.getElementById('userNameDisplay');
    if (guest) { guest.hidden = member; guest.classList.toggle('is-hidden', member); }
    if (user) { user.hidden = !member; user.classList.toggle('is-hidden', !member); }
    if (label && label.textContent !== name) label.textContent = name;
  };
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => { apply(); observer.disconnect(); }, { once: true });
})();
