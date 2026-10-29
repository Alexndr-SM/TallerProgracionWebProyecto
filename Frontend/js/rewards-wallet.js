/* Move the same wallet between its reserved slot and the viewport, above the footer. */
(() => {
  const wallet = document.querySelector('.rewards-wallet');
  if (!wallet) return;
  const slot = document.createElement('div');
  slot.className = 'rewards-wallet-slot'; slot.id = 'rewardsWallet';
  wallet.before(slot); slot.append(wallet);
  const balance = wallet.querySelector('.rewards-balance');
  balance.href = '#rewardsWallet';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let docked = false, animation, frame = 0, width = 0;

  function reserve() {
    const nextWidth = slot.getBoundingClientRect().width;
    if (nextWidth === width && docked) return;
    width = nextWidth;
    wallet.classList.remove('is-docked');
    slot.style.minHeight = `${wallet.getBoundingClientRect().height}px`;
    wallet.classList.toggle('is-docked', docked);
  }
  function move(next) {
    const from = wallet.getBoundingClientRect();
    animation?.cancel(); docked = next;
    wallet.classList.toggle('is-docked', next);
    if (!next) { wallet.classList.remove('is-footer-hidden'); wallet.inert = false; slot.style.minHeight = `${wallet.getBoundingClientRect().height}px`; }
    avoidFooter();
    const to = wallet.getBoundingClientRect();
    if (!reduced.matches && wallet.animate && from.width && to.width) {
      animation = wallet.animate([
        { transformOrigin: 'top left', transform: `translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})` },
        { transformOrigin: 'top left', transform: 'none' },
      ], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  }
  function avoidFooter() {
    if (!docked) return;
    const footer = document.querySelector('[data-cms-footer]') || document.querySelector('footer');
    const footerTop = footer?.getBoundingClientRect().top ?? innerHeight + 30;
    const gap = 18;
    wallet.style.setProperty('--wallet-bottom', `${Math.max(gap, innerHeight-footerTop+gap)}px`);
    const headerBottom = document.querySelector('[data-cms-header]')?.getBoundingClientRect().bottom || 0;
    const hidden = Math.min(innerHeight, footerTop)-gap-wallet.offsetHeight < headerBottom+gap;
    wallet.classList.toggle('is-footer-hidden', hidden); wallet.inert = hidden;
  }
  function update() {
    frame = 0;
    if (balance.hidden) { if (docked) move(false); return; }
    const header = document.querySelector('[data-cms-header]')?.getBoundingClientRect().bottom || 0;
    const top = slot.getBoundingClientRect().top;
    const next = top < header + (docked ? 30 : 8);
    if (next !== docked) move(next);
    avoidFooter();
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  const resize = new ResizeObserver(() => { reserve(); schedule(); });
  resize.observe(slot);
  const footer = document.querySelector('[data-cms-footer]') || document.querySelector('footer');
  if (footer) resize.observe(footer);
  new MutationObserver(() => { if (!docked) reserve(); schedule(); }).observe(wallet, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => { width = 0; reserve(); schedule(); }, { passive: true });
  addEventListener('pageshow', schedule);
  document.addEventListener('icat:language-changed', () => { width = 0; reserve(); schedule(); });
  reserve(); schedule();
})();
