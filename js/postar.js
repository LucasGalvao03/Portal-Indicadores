/* Postar no grupo do Lark: botão (só admin) em cada aba → tira o print e envia pela função portal.
   Depende de html2canvas (carregado no index antes deste arquivo) e de window.portalApi. */
(() => {
  const el = (t, c, x) => PT.el(t, c, x);
  const SITE = 'https://lucasgalvao03.github.io/Portal-Indicadores/';
  const NOME = {
    visao: 'Visão Geral — Indicadores',
    ranking: 'Ranking dos DCs',
    aovivo: 'Ao vivo — Recebimento',
    expedicao: 'Ao vivo — Expedição',
    offloading: 'OffLoading / ConsolidateBag',
    noscan: 'No Scan',
    notracking: 'No Tracking',
    erro: 'Erro de Triagem',
    eficiencia: 'Eficiência HC',
    pontualidade: 'Pontualidade de Transferência',
    lost: 'Lost / Extravio',
    sacas: 'Controle de Sacas',
  };
  const hoje = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

  async function capturar(sec) {
    const fundo = getComputedStyle(document.body).backgroundColor || '#0b1020';
    const fora = (n) => !(n.classList && (n.classList.contains('postar-btn') || n.classList.contains('tv-btn') || n.classList.contains('chat-btn') || n.classList.contains('chat-painel') || n.classList.contains('tt-pilha')));
    return await htmlToImage.toJpeg(sec, {
      quality: 0.92, backgroundColor: fundo,
      pixelRatio: Math.min(2, (window.devicePixelRatio || 1) + 0.4),
      filter: fora, cacheBust: true,
    });
  }

  async function postar(aba, btn) {
    const sec = document.getElementById(aba); if (!sec) return;
    const txt0 = btn.textContent; btn.disabled = true; btn.textContent = '📸 Capturando…';
    try {
      const imagem = await capturar(sec);
      btn.textContent = '📤 Enviando…';
      const nome = NOME[aba] || aba;
      await window.portalApi('postar', {metodo: 'POST', corpo: {
        aba, titulo: `${nome} · ${hoje()}`, link: SITE + '#' + aba,
        resumo: [`**${nome}**`, `📅 ${hoje()}`, 'Detalhes e base no portal 👇'],
        imagem,
      }});
      btn.textContent = '✅ Postado!';
      setTimeout(() => { btn.textContent = txt0; btn.disabled = false; }, 2600);
    } catch (e) {
      console.error('postar:', e); btn.textContent = '⚠ Erro — ver console';
      setTimeout(() => { btn.textContent = txt0; btn.disabled = false; }, 3200);
    }
  }

  async function iniciar() {
    try { await window.portalApi('admin', {metodo: 'GET'}); } catch (e) { return; } // só admin
    if (typeof htmlToImage === 'undefined' || typeof htmlToImage.toJpeg !== 'function') { console.warn('html-to-image não carregou — botão de postar desativado.'); return; }
    Object.keys(NOME).forEach((aba) => {
      const cab = document.querySelector(`#${aba} .pt-sec-head`);
      if (!cab || cab.querySelector('.postar-btn')) return;
      const b = el('button', 'postar-btn', '📣 Postar no grupo'); b.type = 'button';
      b.title = 'Tira um print desta aba e posta no grupo do Lark';
      b.addEventListener('click', () => postar(aba, b));
      cab.append(b);
    });
  }
  if (document.readyState === 'complete') setTimeout(iniciar, 400);
  else window.addEventListener('load', () => setTimeout(iniciar, 400));
})();
