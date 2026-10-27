(() => {
  const supportLink = document.createElement('a');
  supportLink.className = 'human-support-link';
  supportLink.textContent = 'Atención humana';
  // Calcula la ruta desde este script, también en páginas anidadas de promociones.
  supportLink.href = new URL('../html/atencion.html', document.currentScript.src).href;
  const supportStyle = document.createElement('link');
  supportStyle.rel = 'stylesheet';
  supportStyle.href = new URL('../css/widgets-publicos.css', document.currentScript.src).href;
  document.head.append(supportStyle);
  document.body.append(supportLink);
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
