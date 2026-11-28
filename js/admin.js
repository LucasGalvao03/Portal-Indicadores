/* ===== Painel do Desenvolvedor (só o admin) =====
   Carrega portalApi('admin'). Se o servidor responder (só o open_id do admin recebe), monta o botão e o painel.
   Qualquer outro usuário toma 403 e não vê nada. */
(async () => {
  await window.PORTAL_LOGIN;
  let D;
  try { D = await window.portalApi('admin', {metodo: 'GET'}); } catch (e) { return; } // não é admin
  if (!D) return;

  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
  const p2 = (n) => String(n).padStart(2, '0');
  const dt = (iso) => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const dia = (iso) => { const d = new Date(iso); return isNaN(d) ? null : `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
  const prim = (nome) => (nome || '—').split(' ').slice(0, 2).join(' ');
  const NOMES = {visao: 'Visão geral', ranking: 'Ranking', aovivo: 'Ao vivo · Receb.', expedicao: 'Ao vivo · Exped.', offloading: 'OffLoading', noscan: 'No Scan', notracking: 'No Tracking', erro: 'Erro de Triagem', eficiencia: 'Eficiência HC', pontualidade: 'Pontualidade', lost: 'Lost', sacas: 'Controle de Sacas', inicio: 'Início'};
  const nomeAba = (a) => NOMES[a] || a;
  const REPNOME = {descarga: 'Descarregamento', consolida: 'Consolidação', carga: 'Expedição'};
  const DCORD = ['DC-PI2', 'DC-CE1', 'DC-PI3'];
  const msQ = (s) => { if (!s) return 0; const d = new Date(s); return isNaN(d) ? 0 : d.getTime(); };
  const ha = (ms) => { if (!ms) return '—'; const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'agora' : m < 60 ? 'há ' + m + ' min' : 'há ' + Math.floor(m / 60) + 'h' + p2(m % 60); };
  const erroReal = (e) => !!e && !/^(processando|ok)\|/.test(String(e));

  function secaoRobo(D) {
    const sec = el('div', 'adm-sec');
    const marcas = D.robo || [];
    const maxQ = Math.max(0, ...marcas.map((m) => msQ(m.quando)));
    const erros = marcas.filter((m) => erroReal(m.erro));
    let cls, txt;
    if (erros.length) { cls = 'adm-r-erro'; txt = 'Com erro'; }
    else if (maxQ && Date.now() - maxQ < 15 * 60000) { cls = 'adm-r-ok'; txt = 'Ativo'; }
    else { cls = 'adm-r-parado'; txt = maxQ ? 'Parado' : 'Sem dados'; }
    const cab = el('div', 'adm-robo-cab');
    cab.append(el('h3', 'adm-h', '🤖 Robô ao vivo'), el('span', 'adm-rbadge ' + cls, txt + (maxQ ? ' · últ. ' + ha(maxQ) : '')));
    sec.append(cab);

    const tab = el('table', 'adm-tab');
    const th = el('tr'); ['Relatório', 'DC', 'Atualizou', 'Puxou até', 'Situação'].forEach((t) => th.append(el('th', '', t))); tab.append(th);
    const mapa = {}; marcas.forEach((m) => { mapa[m.tipo + '|' + m.dc] = m; });
    ['descarga', 'consolida', 'carga'].forEach((t) => DCORD.forEach((dc) => {
      const m = mapa[t + '|' + dc]; if (!m) return;
      const q = msQ(m.quando), velho = !q || Date.now() - q > 15 * 60000;
      let sit, scls;
      if (erroReal(m.erro)) { sit = m.erro.length > 42 ? m.erro.slice(0, 42) + '…' : m.erro; scls = 'adm-t-erro'; }
      else if (velho) { sit = 'parado'; scls = 'adm-t-low'; }
      else { sit = 'ok'; scls = 'adm-t-ok'; }
      const tr = el('tr');
      tr.append(el('td', '', REPNOME[t] || t), el('td', 'adm-c', dc.replace('DC-', '')), el('td', '', ha(q)), el('td', 'adm-c', m.ate ? m.ate.slice(11, 16) : '—'));
      const td5 = el('td'); td5.append(el('span', 'adm-tag ' + scls, sit)); tr.append(td5);
      tab.append(tr);
    }));
    sec.append(tab);

    if (txt !== 'Ativo') {
      const dica = el('div', 'adm-dica');
      dica.textContent = erros.length
        ? 'Há erro nas voltas (ex.: TOKEN EXPIRADO). No PC: pegue um token novo (F12 no dc.imile.com → authorization), cole no config.py e reabra os .bat.'
        : 'O robô não está atualizando. No PC: reabra iniciar_robo_ao_vivo.bat e iniciar_robo_expedicao.bat; se mostrar TOKEN EXPIRADO, atualize o token no config.py.';
      sec.append(dica);
    }
    if (D.acordar && D.acordar.em) sec.append(el('div', 'adm-robo-ac', 'Último "Acordar" pedido ' + ha(msQ(D.acordar.em))));
    return sec;
  }

  function agrega(D) {
    const agora = Date.now();
    const P = new Map();
    const get = (oid, nome) => { if (!P.has(oid)) P.set(oid, {oid, nome, logins: 0, ultimoLogin: null, aberturas: 0, dias: new Set(), ultimoEvt: null}); const o = P.get(oid); if (nome) o.nome = nome; return o; };
    (D.acessos || []).forEach((a) => { const o = get(a.open_id, a.nome); o.logins++; if (a.quando && (!o.ultimoLogin || a.quando > o.ultimoLogin)) o.ultimoLogin = a.quando; });
    const abas = new Map();
    (D.eventos || []).forEach((e) => { if (e.tipo !== 'aba') return; const o = get(e.open_id, e.nome); o.aberturas++; const d = dia(e.quando); if (d) o.dias.add(d); if (!o.ultimoEvt || e.quando > o.ultimoEvt) o.ultimoEvt = e.quando; if (e.aba) abas.set(e.aba, (abas.get(e.aba) || 0) + 1); });
    const online = (D.online || []).filter((x) => x.visto && (agora - new Date(x.visto).getTime()) < 2 * 60e3);
    const onNomes = new Set(online.map((x) => x.nome));
    // atividade por dia (últimos 14 dias) — por aberturas de aba
    const porDia = new Map();
    (D.eventos || []).forEach((e) => { if (e.tipo !== 'aba') return; const d = dia(e.quando); if (d) porDia.set(d, (porDia.get(d) || 0) + 1); });
    const dias14 = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(agora - i * 864e5); const k = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; dias14.push({k, label: `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`, n: porDia.get(k) || 0}); }
    const pessoas = [...P.values()].sort((a, b) => b.aberturas - a.aberturas || b.logins - a.logins);
    const rankAbas = [...abas.entries()].sort((a, b) => b[1] - a[1]);
    return {pessoas, rankAbas, online, onNomes, dias14, totalLogins: (D.acessos || []).length, totalAberturas: [...abas.values()].reduce((s, n) => s + n, 0)};
  }

  function card(lbl, val, sub) { const c = el('div', 'adm-card'); c.append(el('div', 'adm-num', String(val)), el('div', 'adm-lbl', lbl)); if (sub) c.append(el('div', 'adm-sub', sub)); return c; }
  function barras(itens, rotulo) { // itens: [label, valor]
    const wrap = el('div', 'adm-barras'); const max = Math.max(1, ...itens.map((x) => x[1]));
    itens.forEach(([l, v]) => { const li = el('div', 'adm-bar'); const nome = el('span', 'adm-bar-l', l); const trilho = el('span', 'adm-bar-t'); const fill = el('span', 'adm-bar-f'); fill.style.width = (v / max * 100) + '%'; trilho.append(fill); li.append(nome, trilho, el('span', 'adm-bar-v', String(v))); wrap.append(li); });
    return wrap;
  }

  // ---- bases dos relatórios (o que o bot anexa no grupo) ----
  const BASE_ABAS = ['offloading', 'noscan', 'notracking', 'erro', 'eficiencia', 'pontualidade', 'lost', 'sacas'];
  let BASES = [];
  async function carregarBases() { try { BASES = (await window.portalApi('bases', {metodo: 'GET'})).bases || []; } catch (e) { BASES = []; } }
  function secaoBases() {
    const sec = el('div', 'adm-sec'); sec.append(el('h3', 'adm-h', '📎 Bases dos relatórios (anexo do bot)'));
    sec.append(el('div', 'adm-vazio', 'Arquivo pequeno fica guardado e é anexado na mensagem. Grande (>~15 MB): use "Salvar link".'));
    const lista = el('div', 'adm-bases'); const mapa = {}; BASES.forEach((b) => (mapa[b.aba] = b));
    BASE_ABAS.forEach((aba) => {
      const b = mapa[aba]; const row = el('div', 'adm-base');
      const h = el('div', 'adm-base-h'); h.append(el('b', '', nomeAba(aba)));
      let est = 'sem base';
      if (b && b.tipo === 'arquivo') est = `📄 ${b.nome || ''} · ${b.tamanho ? (b.tamanho / 1e6).toFixed(1) + ' MB' : ''} · ${dt(b.atualizado)}`;
      else if (b && b.tipo === 'link') est = `🔗 link · ${dt(b.atualizado)}`;
      h.append(el('span', 'adm-base-est', est));
      const inp = el('input'); inp.type = 'file'; inp.accept = '.xlsx,.xlsm,.xls'; inp.style.display = 'none';
      const bUp = el('button', 'adm-base-bt', '⬆ Enviar arquivo'); bUp.type = 'button'; bUp.addEventListener('click', () => inp.click());
      inp.addEventListener('change', async () => {
        const f = inp.files[0]; if (!f) return; bUp.disabled = true; bUp.textContent = 'Enviando…';
        try {
          const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
          await window.portalApi('subir_base', {metodo: 'POST', corpo: {aba, nome: f.name, tamanho: f.size, b64}});
          await carregarBases(); render();
        } catch (e) { bUp.textContent = '⚠ Erro'; console.error(e); setTimeout(() => { bUp.disabled = false; bUp.textContent = '⬆ Enviar arquivo'; }, 2000); }
      });
      const linp = el('input', 'adm-base-link'); linp.type = 'url'; linp.placeholder = 'link de download (grandes)'; if (b && b.tipo === 'link') linp.value = b.link || '';
      const bLink = el('button', 'adm-base-bt', 'Salvar link'); bLink.type = 'button';
      bLink.addEventListener('click', async () => { if (!linp.value) return; bLink.disabled = true; try { await window.portalApi('base_link', {metodo: 'POST', corpo: {aba, nome: (b && b.nome) || 'base', link: linp.value}}); await carregarBases(); render(); } catch (e) { console.error(e); bLink.disabled = false; } });
      row.append(h, bUp, inp, linp, bLink);
      if (b) { const bRem = el('button', 'adm-base-rem', 'Remover'); bRem.type = 'button'; bRem.addEventListener('click', async () => { await window.portalApi('base_remover', {metodo: 'POST', corpo: {aba}}); await carregarBases(); render(); }); row.append(bRem); }
      lista.append(row);
    });
    sec.append(lista); return sec;
  }

  function render() {
    const A = agrega(D);
    const body = painel.querySelector('.adm-body'); body.replaceChildren();

    body.append(secaoRobo(D)); // monitor do robô no topo
    body.append(secaoBases()); // bases dos relatórios

    // cards de resumo
    const cards = el('div', 'adm-cards');
    cards.append(
      card('Acessos (logins)', A.totalLogins),
      card('Pessoas', A.pessoas.length),
      card('Online agora', A.online.length, A.online.map((x) => prim(x.nome)).join(', ') || '—'),
      card('Aberturas de aba', A.totalAberturas),
    );
    body.append(cards);

    // pessoas
    const sec1 = el('div', 'adm-sec'); sec1.append(el('h3', 'adm-h', '👤 Pessoas'));
    const tab = el('table', 'adm-tab');
    const thead = el('tr'); ['Pessoa', 'Logins', 'Aberturas', 'Dias ativos', 'Último acesso', 'Uso'].forEach((t) => thead.append(el('th', '', t))); tab.append(thead);
    A.pessoas.forEach((o) => {
      const tr = el('tr');
      const nm = el('td', '', prim(o.nome)); if (A.onNomes.has(o.nome)) nm.append(el('span', 'adm-dot', ''));
      const engaj = o.logins ? (o.aberturas / o.logins) : 0;
      const tag = engaj >= 4 ? ['Ativo', 'adm-t-ok'] : engaj >= 1 ? ['Usa', 'adm-t-md'] : ['Só abre', 'adm-t-low'];
      const td6 = el('td'); td6.append(el('span', 'adm-tag ' + tag[1], tag[0]));
      tr.append(nm, el('td', 'adm-c', String(o.logins)), el('td', 'adm-c', String(o.aberturas)), el('td', 'adm-c', String(o.dias.size)), el('td', '', dt(o.ultimoLogin || o.ultimoEvt)), td6);
      tab.append(tr);
    });
    sec1.append(tab); body.append(sec1);

    // ranking de abas
    const sec2 = el('div', 'adm-sec'); sec2.append(el('h3', 'adm-h', '📑 Abas mais visitadas'));
    sec2.append(A.rankAbas.length ? barras(A.rankAbas.map(([a, v]) => [nomeAba(a), v])) : el('div', 'adm-vazio', 'Ainda sem dados de navegação — aparece conforme as pessoas usam.'));
    body.append(sec2);

    // atividade 14 dias
    const sec3 = el('div', 'adm-sec'); sec3.append(el('h3', 'adm-h', '📈 Atividade (14 dias)'));
    const g = el('div', 'adm-dias'); const maxD = Math.max(1, ...A.dias14.map((d) => d.n));
    A.dias14.forEach((d) => { const col = el('div', 'adm-dia'); const b = el('div', 'adm-dia-b'); b.style.height = (d.n / maxD * 100) + '%'; b.title = `${d.label}: ${d.n}`; col.append(b, el('div', 'adm-dia-l', d.label.slice(0, 2))); g.append(col); });
    sec3.append(g); body.append(sec3);
  }

  // ---- botão + painel ----
  const btn = el('button', 'adm-abre'); btn.type = 'button'; btn.append(el('span', '', '🔧 Painel dev'));
  const raiz = document.querySelector('.pt-side') || document.body;
  (document.querySelector('.pt-side-foot') || raiz).append(btn);

  const painel = el('div', 'adm-over'); painel.style.display = 'none';
  const cab = el('div', 'adm-cab'); cab.append(el('h2', '', '🔧 Painel do Desenvolvedor'));
  const acoes = el('div', 'adm-acoes');
  const rec = el('button', 'adm-rec', '↻ Atualizar'); rec.type = 'button';
  const fechar = el('button', 'adm-x', '✕'); fechar.type = 'button';
  acoes.append(rec, fechar); cab.append(acoes);
  painel.append(cab, el('div', 'adm-body'));
  document.body.append(painel);

  const abrir = async () => { painel.style.display = 'flex'; render(); await carregarBases(); render(); };
  btn.addEventListener('click', abrir);
  fechar.addEventListener('click', () => { painel.style.display = 'none'; });
  rec.addEventListener('click', async () => { rec.disabled = true; rec.textContent = '↻ …'; try { D = await window.portalApi('admin', {metodo: 'GET'}); await carregarBases(); render(); } catch (e) { /* nada */ } finally { rec.disabled = false; rec.textContent = '↻ Atualizar'; } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && painel.style.display !== 'none') painel.style.display = 'none'; });
})();
