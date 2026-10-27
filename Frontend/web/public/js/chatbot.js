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
})();
