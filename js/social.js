/* ===== Quem está online (faixa no topo) e chat da equipe =====
   Usa a sessão do Feishu: só quem entrou no portal aparece e conversa.
   (Nada aqui mexe no atributo "hidden": o motor redesenha os painéis quando ele muda.) */
(() => {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const p2 = (n) => String(n).padStart(2, '0');
  const hora = (iso) => { const d = new Date(iso); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const dia = (iso) => { const d = new Date(iso); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`; };
  let ultimoId = 0, lido = 0, aberto = false, auto = true, primeiraCarga = true;
  try { auto = localStorage.getItem('portal_chat_auto') !== '0'; } catch (e) { /* nada */ }
  const CJK = /[\u4e00-\u9fff]/;
  const idioma = () => (window.PORTAL_IDIOMA ? window.PORTAL_IDIOMA.get() : 'pt');
  // precisa traduzir para quem está lendo? (pt lê chinês traduzido; zh lê português traduzido; bilíngue traduz tudo)
  const precisa = (texto) => { const i = idioma(); return i === 'bi' || (i === 'zh' ? !CJK.test(texto) : CJK.test(texto)); };
  const traduzidas = new Map();
  try { lido = Number(localStorage.getItem('portal_chat_lido')) || 0; } catch (e) { /* nada */ }

  // ---------- faixa "online agora" ----------
  const faixa = document.getElementById('topo');
  async function presenca() {
    if (document.hidden) return;
    try {
      const {online} = await window.portalApi('presenca', {metodo: 'POST'});
      faixa.replaceChildren();
      const rot = el('span', 'on-rot');
      rot.append(el('i', 'on-ponto'), el('b', '', 'Online agora'), document.createTextNode(` (${online.length})`));
      const trilho = el('div', 'on-trilho'), fita = el('div', 'on-fita');
      fita.setAttribute('data-sem-traducao', '');
      const nomes = online.length ? online : ['—'];
      const grupo = () => { const g = el('div', 'on-grupo'); nomes.forEach((n) => g.append(el('span', 'on-nome', n))); return g; };
      fita.append(grupo());
      trilho.append(fita);
      faixa.append(rot, trilho);
      faixa.style.display = '';
      // se não couber, os nomes correm em loop
      requestAnimationFrame(() => {
        if (fita.scrollWidth > trilho.clientWidth) {
          fita.append(grupo());
          fita.classList.add('corre');
          fita.style.animationDuration = Math.max(15, nomes.length * 3) + 's';
        }
      });
    } catch (e) { /* tenta na próxima */ }
  }

  // ---------- chat ----------
  const botao = el('button', 'chat-btn'); botao.type = 'button'; botao.setAttribute('aria-label', 'Chat da equipe');
  botao.append(el('span', '', '💬'), el('span', 'chat-btn-txt', 'Chat'), el('span', 'chat-badge'));
  botao.querySelector('.chat-badge').style.display = 'none';
  const painel = el('div', 'chat-painel'); painel.style.display = 'none'; painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', 'Chat da equipe');
  const topo = el('div', 'chat-topo'); const fechar = el('button', 'chat-x', '✕'); fechar.type = 'button'; fechar.setAttribute('aria-label', 'Fechar');
  const autoLbl = el('label', 'chat-auto'); const autoChk = el('input'); autoChk.type = 'checkbox'; autoChk.checked = auto;
  autoChk.addEventListener('change', () => { auto = autoChk.checked; try { localStorage.setItem('portal_chat_auto', auto ? '1' : '0'); } catch (e) { /* nada */ } });
  autoLbl.append(autoChk, el('span', '', 'Traduzir automático'));
  topo.append(el('b', '', 'Chat da equipe'), autoLbl, fechar);
  const lista = el('div', 'chat-lista'); lista.setAttribute('data-sem-traducao', '');
  const form = el('form', 'chat-form'); const campo = el('textarea'); campo.maxLength = 500; campo.rows = 1; campo.placeholder = 'Escreva uma mensagem…';
  const enviar = el('button', 'chat-enviar', 'Enviar'); enviar.type = 'submit';
  const aviso = el('div', 'chat-aviso');
  form.append(campo, enviar);
  painel.append(topo, lista, aviso, form);

  function badge() {
    const n = [...lista.querySelectorAll('.chat-msg:not(.meu)')].filter((m) => Number(m.dataset.id) > lido).length;
    const b = botao.querySelector('.chat-badge'); b.textContent = n > 99 ? '99+' : String(n); b.style.display = n && !aberto ? '' : 'none';
  }
  function marcarLido() { lido = ultimoId; try { localStorage.setItem('portal_chat_lido', String(lido)); } catch (e) { /* nada */ } badge(); }
  let ultimoDia = '';
  function mostrar(msgs) {
    const fim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40;
    msgs.forEach((m) => {
      if (m.id <= ultimoId) return;
      ultimoId = m.id;
      const d = dia(m.quando);
      if (d !== ultimoDia) { ultimoDia = d; lista.append(el('div', 'chat-dia', d)); }
      const b = el('div', 'chat-msg' + (m.meu ? ' meu' : '')); b.dataset.id = m.id;
      const cab = el('div', 'chat-cab'); cab.append(el('b', '', m.meu ? 'Você' : m.nome), el('span', '', hora(m.quando)));
      b.append(cab, el('div', 'chat-txt', m.texto));
      const tr = el('div', 'chat-tr'); tr.style.display = 'none';
      const lk = el('button', 'chat-trad', '🌐 Traduzir'); lk.type = 'button';
      lk.addEventListener('click', () => traduzir(m.id, b));
      b.append(tr, lk);
      if (m.traducao) traduzidas.set(m.id, m.traducao);
      lista.append(b);
      if (!primeiraCarga && !m.meu && !aberto) window.dispatchEvent(new CustomEvent('portal:toast', {detail: {icone: '💬', titulo: m.nome, texto: m.texto, acao: () => abrir(true)}}));
      if (traduzidas.has(m.id) && (auto && precisa(m.texto))) mostrarTraducao(b, traduzidas.get(m.id));
      else if (auto && precisa(m.texto)) traduzir(m.id, b);
    });
    if (fim || msgs.some((m) => m.meu)) lista.scrollTop = lista.scrollHeight;
    if (aberto) marcarLido(); else badge();
    primeiraCarga = false;
  }
  function mostrarTraducao(b, t) {
    const tr = b.querySelector('.chat-tr'); tr.textContent = t; tr.style.display = '';
    b.querySelector('.chat-trad').style.display = 'none';
  }
  async function traduzir(id, b) {
    if (traduzidas.has(id)) { mostrarTraducao(b, traduzidas.get(id)); return; }
    const lk = b.querySelector('.chat-trad'); lk.textContent = '🌐 …'; lk.disabled = true;
    try {
      const j = await window.portalApi('traduzir', {metodo: 'POST', corpo: {id}});
      traduzidas.set(id, j.traducao); mostrarTraducao(b, j.traducao);
    } catch (e) { lk.textContent = '🌐 Tradução indisponível'; lk.title = e.message; }
  }
  async function buscar() {
    try { const j = await window.portalApi('chat', {params: 'desde=' + ultimoId}); mostrar(j.mensagens || []); aviso.textContent = ''; } catch (e) { /* tenta na próxima */ }
  }
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const t = campo.value.trim();
    if (!t) return;
    enviar.disabled = true;
    try {
      const j = await window.portalApi('chat', {metodo: 'POST', corpo: {texto: t}, params: 'desde=' + ultimoId});
      campo.value = ''; aviso.textContent = ''; mostrar(j.mensagens || []);
    } catch (e) { aviso.textContent = e.message; }
    enviar.disabled = false; campo.focus();
  });
  campo.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); form.requestSubmit(); } });
  const abrir = (sim) => {
    aberto = sim; painel.style.display = sim ? '' : 'none'; botao.classList.toggle('ativo', sim);
    if (sim) { buscar(); lista.scrollTop = lista.scrollHeight; marcarLido(); setTimeout(() => campo.focus(), 50); } else badge();
  };
  botao.addEventListener('click', () => abrir(!aberto));
  fechar.addEventListener('click', () => abrir(false));
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && aberto) abrir(false); });

  (async () => {
    await window.PORTAL_LOGIN;
    (document.querySelector('.pt') || document.body).append(botao, painel); // dentro do .pt para herdar cores e fontes
    presenca(); buscar();
    setInterval(presenca, 30000);
    setInterval(() => { if (!document.hidden) buscar(); }, 8000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { presenca(); buscar(); } });
  })();
})();
