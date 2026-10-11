(() => {
  const chatbotId = 'Yucf-9M0JIumrBRzc_1rh';
  const domain = 'www.chatbase.co';

  window.embeddedChatbotConfig = { chatbotId, domain };

  const script = document.createElement('script');
  script.src = `https://www.chatbase.co/embed.min.js`;
  script.setAttribute('chatbotId', chatbotId);
  script.setAttribute('domain', domain);
  script.defer = true;
  document.body.appendChild(script);

  const launcher = document.querySelector('.chatbot-launcher');
  launcher?.addEventListener('click', () => {
    const openChat = () => {
      const button = document.getElementById('chatbase-bubble-button');
      if (!button) return false;
      if (button.getAttribute('aria-expanded') !== 'true') button.click();
      return true;
    };

    if (openChat()) return;

    const widgetObserver = new MutationObserver((_, observer) => {
      if (openChat()) observer.disconnect();
    });
    widgetObserver.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => widgetObserver.disconnect(), 10000);
  });

  if (!document.body.classList.contains('contact-page')) return;

  function keepChatOpen() {
    const button = document.getElementById('chatbase-bubble-button');
    if (!button || button.dataset.keepOpen === 'true') return;

    button.dataset.keepOpen = 'true';
    const openChat = () => {
      if (button.isConnected && button.getAttribute('aria-expanded') !== 'true') {
        button.click();
      }
    };

    const stateObserver = new MutationObserver(openChat);
    stateObserver.observe(button, { attributes: true, attributeFilter: ['aria-expanded'] });
    window.setTimeout(openChat, 250);
  }

  const widgetObserver = new MutationObserver(keepChatOpen);
  widgetObserver.observe(document.body, { childList: true, subtree: true });
  keepChatOpen();
})();
