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
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  // abas que postam MAIS DE UM print (o bot troca a visão sozinho antes de cada captura, pelo texto do botão)
  const VISTAS = {
    offloading: ['Visão diária', 'Pacotes por hora'],
  };

  async function capturar(sec) {
    const fundo = getComputedStyle(document.body).backgroundColor || '#0b1020';
    const fora = (n) => !(n.classList && (n.classList.contains('postar-btn') || n.classList.contains('tv-btn') || n.classList.contains('chat-btn') || n.classList.contains('chat-painel') || n.classList.contains('tt-pilha')));
    const rp = Math.min(1.8, (window.devicePixelRatio || 1) + 0.3);
    // margem temporária só pra não cortar a borda dos cards; sem forçar largura (pra não mudar o que está na tela)
    sec.classList.add('pt-capturando');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      return await htmlToImage.toJpeg(sec, {quality: 0.95, backgroundColor: fundo, pixelRatio: rp, filter: fora, cacheBust: true});
    } finally {
      sec.classList.remove('pt-capturando');
    }
  }

  async function postar(aba, btn) {
    const sec = document.getElementById(aba); if (!sec) return;
    const txt0 = btn.textContent; btn.disabled = true;
    try {
      const nome = NOME[aba] || aba;
      const segs = VISTAS[aba] || [null]; // uma ou mais visões
      const vistaAtual = sec.querySelector('.pt-seg button[aria-pressed="true"]');
      const imagens = [];
      for (let i = 0; i < segs.length; i++) {
        btn.textContent = segs.length > 1 ? `📸 Print ${i + 1}/${segs.length}…` : '📸 Capturando…';
        const s = segs[i];
        if (s) {
          const b2 = [...sec.querySelectorAll('.pt-seg button')].find((x) => x.textContent.trim() === s);
          if (b2 && b2.getAttribute('aria-pressed') !== 'true') { b2.click(); await espera(700); } // deixa renderizar os gráficos
        }
        imagens.push(await capturar(sec));
      }
      if (vistaAtual && vistaAtual.getAttribute('aria-pressed') !== 'true') vistaAtual.click(); // volta pra visão que estava
      btn.textContent = '📤 Enviando…';
      await window.portalApi('postar', {metodo: 'POST', corpo: {
        aba, titulo: `${nome} · ${hoje()}`, link: SITE + '#' + aba,
        resumo: [`**${nome}**`, `📅 ${hoje()}`, 'Detalhes e base no portal 👇'],
        imagens,
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
