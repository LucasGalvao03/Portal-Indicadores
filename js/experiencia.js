/* ===== Experiência: tema claro/escuro, busca rápida (Ctrl+K), saudação, Modo TV, avisos (toasts),
   carregamento animado, confete no ranking e botão de voltar ao topo.
   Tudo só no site: não mexe em dados nem no atributo "hidden" (o motor redesenha quando ele muda). */
(() => {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const guarda = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } };
  const le = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const raiz = () => document.querySelector('.pt') || document.body;
  const semMovimento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- avisos (toasts) ----------
  let pilha;
  function toast({titulo = '', texto = '', icone = '🔔', acao = null, tempo = 6000} = {}) {
    if (!pilha) { pilha = el('div', 'tt-pilha'); pilha.setAttribute('aria-live', 'polite'); raiz().append(pilha); }
    const t = el('div', 'tt');
    const c = el('div', 'tt-corpo'); if (titulo) c.append(el('b', '', titulo)); if (texto) c.append(el('span', 'tt-txt', texto));
    const x = el('button', 'tt-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar');
    t.append(el('span', 'tt-ico', icone), c, x);
    const fechar = () => { t.classList.add('sai'); setTimeout(() => t.remove(), 300); };
    x.addEventListener('click', (e) => { e.stopPropagation(); fechar(); });
    if (acao) { t.classList.add('clica'); t.addEventListener('click', () => { acao(); fechar(); }); }
    pilha.append(t);
    while (pilha.children.length > 3) pilha.firstChild.remove();
    setTimeout(fechar, tempo);
  }
  window.portalToast = toast;
  window.addEventListener('portal:toast', (e) => toast(e.detail || {}));

  // ---------- tema: automático · claro · escuro ----------
  // O CSS do site usa "prefers-color-scheme"; para forçar um tema, as regras de cor de cada media query são ligadas/desligadas.
  const origem = new WeakMap();
  function aplicarTema(t) {
    const anda = (regras) => {
      for (const r of regras) {
        if (r.media && r.cssRules) {
          if (!origem.has(r)) origem.set(r, r.media.mediaText);
          const o = origem.get(r);
          if (/prefers-color-scheme/.test(o)) {
            let n = o;
            if (t !== 'auto') {
              const esc = t === 'escuro';
              n = o.replace(/\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g, esc ? '(min-width: 0px)' : '(max-width: 0px)')
                .replace(/\(\s*prefers-color-scheme\s*:\s*light\s*\)/g, esc ? '(max-width: 0px)' : '(min-width: 0px)');
            }
            if (r.media.mediaText !== n) r.media.mediaText = n;
          }
          anda(r.cssRules);
        }
      }
    };
    for (const s of document.styleSheets) { let rr; try { rr = s.cssRules; } catch (e) { continue; } anda(rr); }
    document.documentElement.style.colorScheme = t === 'auto' ? '' : t === 'escuro' ? 'dark' : 'light';
    document.documentElement.dataset.tema = t;
    document.querySelectorAll('.tm-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tema === t)));
  }
  let tema = le('portal_tema') || 'auto';
  function trocarTema(t, ev) {
    tema = t; guarda('portal_tema', t);
    if (!document.startViewTransition || semMovimento()) { aplicarTema(t); return; }
    const x = ev && ev.clientX ? ev.clientX : innerWidth - 60, y = ev && ev.clientY ? ev.clientY : 60;
    const tr = document.startViewTransition(() => aplicarTema(t));
    tr.ready.then(() => {
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.documentElement.animate({clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`]},
        {duration: 600, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)'});
    }).catch(() => {});
  }
  function seletorTema() {
    const box = el('div', 'tm'); box.setAttribute('data-sem-traducao', '');
    [['claro', '☀️', 'Tema claro'], ['auto', '🖥️', 'Tema automático (igual ao do aparelho)'], ['escuro', '🌙', 'Tema escuro']].forEach(([k, ic, tit]) => {
      const b = el('button', 'tm-btn', ic); b.type = 'button'; b.dataset.tema = k; b.title = tit; b.setAttribute('aria-label', tit);
      b.setAttribute('aria-pressed', String(k === tema));
      b.addEventListener('click', (e) => trocarTema(k, e));
      box.append(b);
    });
    return box;
  }

  // ---------- busca rápida (Ctrl+K) ----------
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let paleta;
  function itens() {
    const L = [];
    document.querySelectorAll('.pt-tab').forEach((b) => L.push({ico: '📊', txt: b.textContent.trim(), sub: 'Abrir aba', fazer: () => b.click()}));
    L.push({ico: '☀️', txt: 'Tema claro', sub: 'Aparência', fazer: () => trocarTema('claro')});
    L.push({ico: '🌙', txt: 'Tema escuro', sub: 'Aparência', fazer: () => trocarTema('escuro')});
    L.push({ico: '🖥️', txt: 'Tema automático', sub: 'Aparência', fazer: () => trocarTema('auto')});
    document.querySelectorAll('.pt-side .idi-btn').forEach((b) => L.push({ico: '🌐', txt: 'Idioma: ' + b.textContent, sub: 'Idioma', fazer: () => b.click()}));
    L.push({ico: '💬', txt: 'Abrir chat da equipe', sub: 'Chat', fazer: () => { const c = document.querySelector('.chat-btn'); if (c && !c.classList.contains('ativo')) c.click(); }});
    L.push({ico: '📺', txt: 'Modo TV do Ao vivo', sub: 'Tela cheia, troca de DC sozinha', fazer: () => modoTV(true)});
    L.push({ico: '⬆️', txt: 'Voltar ao topo', sub: 'Página', fazer: () => scrollTo({top: 0, behavior: 'smooth'})});
    L.push({ico: '🔄', txt: 'Recarregar o portal', sub: 'Página', fazer: () => location.reload()});
    return L;
  }
  function abrirPaleta() {
    if (paleta) { paleta.remove(); paleta = null; return; }
    paleta = el('div', 'kp-fundo');
    const box = el('div', 'kp'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Busca rápida');
    const campo = el('input', 'kp-campo'); campo.placeholder = 'O que você procura? (aba, tema, idioma, chat…)'; campo.setAttribute('aria-label', 'Buscar');
    const lista = el('div', 'kp-lista'); lista.setAttribute('role', 'listbox');
    const dica = el('div', 'kp-dica', '↑↓ navegar · Enter abrir · Esc fechar');
    box.append(campo, lista, dica); paleta.append(box); raiz().append(paleta);
    const todos = itens(); let sel = 0, vis = [];
    const pinta = () => {
      const q = norm(campo.value.trim());
      vis = todos.filter((i) => { const t = norm(i.txt + ' ' + i.sub); let p = 0; for (const ch of q) { p = t.indexOf(ch, p); if (p < 0) return false; p++; } return true; });
      sel = Math.min(sel, Math.max(0, vis.length - 1));
      lista.replaceChildren(...(vis.length ? vis.map((i, k) => {
        const o = el('div', 'kp-item' + (k === sel ? ' sel' : '')); o.setAttribute('role', 'option');
        const t = el('div', 'kp-t'); t.append(el('b', '', i.txt), el('span', '', i.sub));
        o.append(el('span', 'kp-ico', i.ico), t);
        o.addEventListener('mouseenter', () => { sel = k; lista.querySelectorAll('.kp-item').forEach((n, j) => n.classList.toggle('sel', j === sel)); });
        o.addEventListener('click', () => escolhe(i));
        return o;
      }) : [el('div', 'kp-nada', 'Nada encontrado.')]));
    };
    const escolhe = (i) => { paleta.remove(); paleta = null; setTimeout(() => i.fazer(), 30); };
    campo.addEventListener('input', () => { sel = 0; pinta(); });
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(vis.length - 1, sel + 1); pinta(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); pinta(); e.preventDefault(); }
      else if (e.key === 'Enter' && vis[sel]) escolhe(vis[sel]);
      else if (e.key === 'Escape') { paleta.remove(); paleta = null; }
      const s = lista.querySelector('.sel'); if (s) s.scrollIntoView({block: 'nearest'});
    });
    paleta.addEventListener('click', (e) => { if (e.target === paleta) { paleta.remove(); paleta = null; } });
    pinta(); setTimeout(() => campo.focus(), 20);
  }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirPaleta(); }
  });

  // ---------- saudação na Visão geral ----------
  function saudacao() {
    const sec = document.getElementById('visao');
    if (!sec || sec.querySelector('.ola')) return;
    let nome = '';
    try { nome = (JSON.parse(le('portal_sessao') || '{}').nome || '').split(' ')[0]; } catch (e) { /* nada */ }
    const h = new Date().getHours();
    const oi = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const box = el('div', 'ola');
    const txt = el('div', 'ola-txt');
    const t1 = el('div', 'ola-oi'); t1.append(document.createTextNode(oi + (nome ? ', ' : '')), el('span', 'ola-nome', nome), el('span', 'ola-mao', ' 👋'));
    t1.querySelector('.ola-nome').setAttribute('data-sem-traducao', '');
    const data = new Date().toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'});
    txt.append(t1, el('div', 'ola-data', data.charAt(0).toUpperCase() + data.slice(1)));
    const atalhos = el('div', 'ola-atalhos');
    [['aovivo', '📥', 'Ao vivo · Recebimento'], ['expedicao', '🚚', 'Ao vivo · Expedição'], ['ranking', '🏆', 'Ranking']].forEach(([id, ic, nomeAba]) => {
      const b = el('button', 'ola-at'); b.type = 'button'; b.append(el('span', 'ola-at-i', ic), el('span', '', nomeAba));
      b.addEventListener('click', () => { const t = document.querySelector(`.pt-tab[data-tab="${id}"]`); if (t) t.click(); });
      atalhos.append(b);
    });
    const busca = el('button', 'ola-busca'); busca.type = 'button';
    busca.append(el('span', '', '🔍 Buscar no portal'), el('kbd', '', 'Ctrl K'));
    busca.addEventListener('click', abrirPaleta);
    box.append(txt, atalhos, busca);
    const cab = sec.querySelector('.pt-sec-head');
    (cab ? cab.before.bind(cab) : sec.prepend.bind(sec))(box);
  }

  // ---------- Modo TV (Ao vivo em tela cheia, trocando de DC sozinho) ----------
  let tvTimer = null, tvAviso = null, tvFalta = 0;
  const TV_SEG = 30;
  const TV_SECS = ['aovivo', 'expedicao'];
  const TV_NOME = {aovivo: 'Recebimento', expedicao: 'Expedição'};
  function secAoVivo() { return TV_SECS.map((id) => document.getElementById(id)).find((s) => s && !s.hidden); }
  function dcAtual() {
    const s = secAoVivo(); if (!s) return '';
    const b = s.querySelector('.av-filtros .pt-seg button[aria-pressed="true"]');
    return b ? b.textContent.trim() : '';
  }
  // Modo TV passa por: Recebimento PI2→CE1→PI3 → Expedição PI2→CE1→PI3 → recomeça. Sem ninguém mexer na TV.
  function tvIrPara(secId, dcIdx) {
    const atual = secAoVivo();
    if (!atual || atual.id !== secId) { const t = document.querySelector(`.pt-tab[data-tab="${secId}"]`); if (t) t.click(); }
    setTimeout(() => {
      const seg = document.querySelector(`#${secId} .av-filtros .pt-seg`);
      if (seg) { const bs = [...seg.querySelectorAll('button')]; const b = bs[dcIdx] || bs[0]; if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }
      setTimeout(ajustarTV, 80);
    }, 80);
  }
  function proximoTV() {
    const s = secAoVivo(); if (!s) { tvIrPara('aovivo', 0); return; }
    const seg = s.querySelector('.av-filtros .pt-seg');
    const bs = seg ? [...seg.querySelectorAll('button')] : [];
    const i = bs.findIndex((b) => b.getAttribute('aria-pressed') === 'true');
    if (i > -1 && i < bs.length - 1) { bs[i + 1].click(); setTimeout(ajustarTV, 80); }   // próximo DC da mesma seção
    else { const si = TV_SECS.indexOf(s.id); tvIrPara(TV_SECS[(si + 1) % TV_SECS.length], 0); }  // acabou os DCs → troca de seção
  }
  // encaixa todo o painel na tela da TV (sem rolar), reduzindo o zoom só quando precisa
  function ajustarTV() {
    if (!document.body.classList.contains('modo-tv')) return;
    const s = secAoVivo(); if (!s) return;
    const p = s.querySelector('.av-painel'); if (!p) return;
    const cur = parseFloat(p.style.zoom) || 1;
    const alturaReal = p.getBoundingClientRect().height / cur;
    if (!alturaReal) return;
    const dispo = window.innerHeight - 104;  // espaço do cabeçalho + barra do Modo TV
    let f = Math.min(dispo / alturaReal, 1.12); f = Math.max(0.45, f);
    if (Math.abs(f - cur) > 0.02) p.style.zoom = String(Math.round(f * 100) / 100);
  }
  window.addEventListener('resize', () => { if (document.body.classList.contains('modo-tv')) ajustarTV(); });
  function modoTV(ligar) {
    if (ligar) {
      if (!secAoVivo()) { const t = document.querySelector('.pt-tab[data-tab="aovivo"]'); if (t) t.click(); }
      document.body.classList.add('modo-tv');
      const alvo = document.documentElement;
      if (alvo.requestFullscreen && !document.fullscreenElement) alvo.requestFullscreen().catch(() => {});
      tvAviso = el('div', 'tv-aviso'); raiz().append(tvAviso);
      const sair = el('button', 'tv-sair', '✕ Sair do Modo TV'); sair.type = 'button'; sair.addEventListener('click', () => modoTV(false));
      tvFalta = TV_SEG;
      const atualiza = () => {
        const s = secAoVivo(), nome = s ? (TV_NOME[s.id] || '') : '';
        tvAviso.replaceChildren(el('span', 'tv-live', '📺 ' + (nome ? nome + (dcAtual() ? ' · ' + dcAtual() : '') : 'Modo TV')), el('span', '', `próximo em ${tvFalta}s`), sair);
      };
      setTimeout(() => { tvIrPara('aovivo', 0); atualiza(); setTimeout(ajustarTV, 200); }, 60);
      atualiza();
      tvTimer = setInterval(() => { tvFalta--; if (tvFalta <= 0) { tvFalta = TV_SEG; proximoTV(); } atualiza(); ajustarTV(); }, 1000);
    } else {
      document.body.classList.remove('modo-tv');
      clearInterval(tvTimer); tvTimer = null;
      if (tvAviso) { tvAviso.remove(); tvAviso = null; }
      document.querySelectorAll('.av-painel').forEach((p) => { p.style.zoom = ''; });  // tira o encaixe da TV
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('modo-tv')) modoTV(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('modo-tv')) modoTV(false); });
  function botoesTV() {
    ['aovivo', 'expedicao'].forEach((id) => {
      const cab = document.querySelector(`#${id} .pt-sec-head`);
      if (!cab || cab.querySelector('.tv-btn')) return;
      const b = el('button', 'tv-btn', '📺 Modo TV'); b.type = 'button'; b.title = 'Tela cheia para a TV: passa sozinho por Recebimento e Expedição, DC a DC, a cada 30 s';
      b.addEventListener('click', () => modoTV(true));
      cab.append(b);
    });
  }

  // ---------- carregamento animado (no lugar do "Carregando…") ----------
  const CARREGA = /^(Carregando…|加载中…|Carregando… \/ 加载中…)$/;
  function esqueletos(n) {
    const lista = n.querySelectorAll ? n.querySelectorAll('.pt-note, p') : [];
    lista.forEach((p) => { if (CARREGA.test(p.textContent.trim())) p.classList.add('esqueleto'); else p.classList.remove('esqueleto'); });
  }

  // ---------- confete no ranking (uma vez por sessão) ----------
  function confete() {
    if (semMovimento() || sessionStorage.getItem('portal_confete')) return;
    try { sessionStorage.setItem('portal_confete', '1'); } catch (e) { /* nada */ }
    const cv = el('canvas', 'confete'); raiz().append(cv);
    const ctx = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight;
    const cores = ['#FFC000', '#0033A0', '#1E4FD8', '#22c55e', '#ffffff', '#F2A900'];
    const P = Array.from({length: 160}, () => ({x: W / 2 + (Math.random() - .5) * 200, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4,
      r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .3, c: cores[Math.floor(Math.random() * cores.length)]}));
    let t = 0;
    const passo = () => {
      ctx.clearRect(0, 0, W, H); t++;
      P.forEach((p) => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - t / 160); ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (t < 170) requestAnimationFrame(passo); else cv.remove();
    };
    requestAnimationFrame(passo);
  }

  // ---------- voltar ao topo ----------
  function botaoTopo() {
    const b = el('button', 'topo-btn', '↑'); b.type = 'button'; b.setAttribute('aria-label', 'Voltar ao topo');
    b.addEventListener('click', () => scrollTo({top: 0, behavior: 'smooth'}));
    raiz().append(b);
    const ve = () => b.classList.toggle('ve', scrollY > 600);
    addEventListener('scroll', ve, {passive: true}); ve();
  }

  // ---------- recolher/expandir a barra de abas (mais área de visualização) ----------
  function menuRecolher() {
    if (document.querySelector('.menu-toggle')) return;
    const abre = el('button', 'menu-toggle', '☰'); abre.type = 'button'; abre.title = 'Mostrar as abas'; abre.setAttribute('aria-label', 'Mostrar as abas');
    abre.addEventListener('click', () => { document.body.classList.remove('menu-escondido'); guarda('portal_menu', '1'); });
    raiz().append(abre);
    const nav = document.querySelector('.pt-tabs');
    const rec = el('button', 'menu-recolhe', '« Recolher'); rec.type = 'button'; rec.title = 'Esconder as abas para ampliar a visualização'; rec.setAttribute('aria-label', 'Recolher as abas');
    rec.addEventListener('click', () => { document.body.classList.add('menu-escondido'); guarda('portal_menu', '0'); });
    if (nav) nav.after(rec);
    if (le('portal_menu') === '0') document.body.classList.add('menu-escondido');
  }

  // ---------- apresentação do site (o que é cada aba) ----------
  const GUIA = [
    ['visao', '📊 Visão geral', 'Status de todos os indicadores por DC, num quadro só.'],
    ['ranking', '🏆 Ranking', 'Pontuação e disputa entre os DCs.'],
    ['aovivo', '🔴 Ao vivo · Recebimento', 'Descarregamento e consolidação em tempo real.'],
    ['expedicao', '🔴 Ao vivo · Expedição', 'Carregamento das rotas em tempo real.'],
    ['offloading', '📦 OffLoading', 'Recebido x consolidado por DC.'],
    ['noscan', '🔎 No Scan', 'Pedidos recebidos na DS sem registro no DC.'],
    ['notracking', '📡 No Tracking', 'Pacotes sem rastreio.'],
    ['erro', '⚠️ Erro de Triagem', 'Pacotes triados para o lugar errado.'],
    ['eficiencia', '💪 Eficiência HC', 'Produtividade por pessoa.'],
    ['pontualidade', '⏱️ Pontualidade', '% no prazo e backlog em piso.'],
    ['lost', '❌ Lost', 'Pacotes extraviados.'],
    ['sacas', '🧺 Controle de Sacas', 'Sacas enviadas x devolvidas por DC/DS.'],
  ];
  function apresentacao(forcar) {
    if (!forcar && le('portal_guia') === '1') return;
    if (document.querySelector('.guia-over')) return;
    const over = el('div', 'guia-over');
    const card = el('div', 'guia-card');
    const x = el('button', 'guia-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar');
    card.append(x, el('h3', 'guia-tit', 'Portal de Indicadores — Nordeste II'), el('p', 'guia-sub', 'Um tour rápido: o que você encontra em cada aba.'));
    const lista = el('div', 'guia-lista');
    const fechar = () => { over.remove(); guarda('portal_guia', '1'); };
    GUIA.forEach(([id, t, d]) => {
      const it = el('button', 'guia-item'); it.type = 'button';
      it.append(el('b', '', t), el('span', '', d));
      it.addEventListener('click', () => { fechar(); const tb = document.querySelector(`.pt-tab[data-tab="${id}"]`); if (tb) tb.click(); });
      lista.append(it);
    });
    const rod = el('div', 'guia-rod');
    const ok = el('button', 'guia-ok', 'Começar'); ok.type = 'button'; ok.addEventListener('click', fechar);
    rod.append(el('span', 'guia-dica', 'Dica: use o ☰ para recolher as abas e ampliar a tela.'), ok);
    card.append(lista, rod);
    over.append(card); raiz().append(over);
    x.addEventListener('click', fechar);
    over.addEventListener('click', (e) => { if (e.target === over) fechar(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { fechar(); document.removeEventListener('keydown', esc); } });
  }

  // ---------- liga tudo ----------
  let ultimaAba = null;
  function aoMudarAba() {
    const s = [...document.querySelectorAll('.pt-sec')].find((x) => !x.hidden);
    if (!s || s === ultimaAba) return;
    ultimaAba = s;
    if (s.id === 'ranking') setTimeout(confete, 700);
    if (!['aovivo', 'expedicao'].includes(s.id) && document.body.classList.contains('modo-tv')) modoTV(false);
  }
  function iniciar() {
    aplicarTema(tema);
    const pe = document.querySelector('.pt-side-foot');
    if (pe) pe.before(seletorTema());
    // botão de busca no menu
    const marca = document.querySelector('.pt-brandbox');
    if (marca && !document.querySelector('.kp-abre')) {
      const b = el('button', 'kp-abre'); b.type = 'button'; b.append(el('span', '', '🔍 Buscar'), el('kbd', '', 'Ctrl K'));
      b.addEventListener('click', abrirPaleta); marca.after(b);
    }
    // botão de guia/apresentação no menu
    if (marca && !document.querySelector('.guia-abre')) {
      const g = el('button', 'guia-abre'); g.type = 'button'; g.append(el('span', '', '❔ Guia do portal'));
      g.addEventListener('click', () => apresentacao(true)); marca.after(g);
    }
    saudacao(); botoesTV(); botaoTopo(); menuRecolher(); esqueletos(document.body);
    setTimeout(() => apresentacao(false), 600);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'attributes') { aoMudarAba(); continue; }
        m.addedNodes.forEach((n) => { if (n.nodeType === 1) esqueletos(n); else if (n.nodeType === 3 && n.parentElement) esqueletos(n.parentElement.parentElement || n.parentElement); });
      }
    }).observe(document.querySelector('.pt-main') || document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden']});
    setTimeout(aoMudarAba, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
