/* ---------- No Tracking no layout do Excel (NO TRACKING DCs KPI), com os filtros do Excel ---------- */
(() => {
  const DCS = ['DC-PI2', 'DC-CE1', 'DC-PI3'];
  const FAIXAS = ['1. 2-3d', '2. 4-6d', '3. 7-10d', '4. +10d'];
  const ROT_FAIXA = {'1. 2-3d': '2-3 dias', '2. 4-6d': '4-6 dias', '3. 7-10d': '7-10 dias', '4. +10d': 'Crítico +10 dias'};
  const COR_FAIXA = {'1. 2-3d': '#f2c94c', '2. 4-6d': '#f2994a', '3. 7-10d': '#e67e22', '4. +10d': '#eb5757'};
  const el = (t, c, x) => PT.el(t, c, x);
  // filtros (null = todos). Como no Excel, a Faixa começa sem 2-3 dias (o indicador olha 4+ dias).
  const F = {dc: null, faixa: new Set(['2. 4-6d', '3. 7-10d', '4. +10d']), status: null, tipo: null, ds: null};
  const aberto = {}; // qual filtro está aberto (para continuar aberto ao redesenhar)

  const passa = (r, exceto) => ['dc', 'faixa', 'status', 'tipo', 'ds'].every((k) => k === exceto || !F[k] || F[k].has(r[k]));

  // um filtro de várias escolhas, no estilo da segmentação do Excel
  function filtro(nome, campo, opcoes) {
    const d = el('details', 'nt-f');
    if (aberto[campo]) d.open = true;
    d.addEventListener('toggle', () => { aberto[campo] = d.open; });
    const sel = F[campo];
    const resumo = !sel ? 'Todos' : sel.size === 1 ? [...sel][0] : `${sel.size} selecionados`;
    const sum = el('summary', '');
    sum.append(el('span', 'nt-f-n', nome), el('span', 'nt-f-v', resumo));
    d.append(sum);
    const lista = el('div', 'nt-f-lista');
    const limpar = el('button', 'nt-f-limpar', 'Limpar filtro');
    limpar.type = 'button';
    limpar.addEventListener('click', () => { F[campo] = null; dash.render(); });
    lista.append(limpar);
    if (opcoes.length > 12) {
      const busca = el('input', 'nt-f-busca'); busca.type = 'search'; busca.placeholder = 'Procurar…';
      busca.addEventListener('input', () => { const q = busca.value.toLowerCase(); lista.querySelectorAll('label').forEach((l) => { l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none'; }); });
      lista.append(busca);
    }
    opcoes.forEach((o) => {
      const l = el('label', 'nt-f-op'), c = el('input', '');
      c.type = 'checkbox'; c.checked = !sel || sel.has(o);
      c.addEventListener('change', () => {
        const atual = F[campo] ? new Set(F[campo]) : new Set(opcoes);
        if (c.checked) atual.add(o); else atual.delete(o);
        F[campo] = atual.size === opcoes.length ? null : atual;
        dash.render();
      });
      l.append(c, document.createTextNode(campo === 'faixa' ? ROT_FAIXA[o] : o));
      lista.append(l);
    });
    d.append(lista);
    return d;
  }

  // colunas simples com o valor em cima; grupos (ex.: faixa) aparecem embaixo dos rótulos
  function colunas(box, itens, alto = 200) {
    box.replaceChildren();
    if (!itens.length) { box.append(el('p', 'pt-note', 'Nada com esses filtros.')); return; }
    const W = Math.max(240, box.clientWidth || 360), temGrupo = itens.some((i) => i.grupo), H = alto, ml = 8, mr = 8, mt = 20, mb = temGrupo ? 44 : 26;
    const x = d3.scaleBand().domain(itens.map((_, i) => i)).range([ml, W - mr]).padding(0.3);
    const y = d3.scaleLinear().domain([0, (d3.max(itens, (i) => i.v) || 1) * 1.15]).range([H - mb, mt]);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', H).attr('role', 'img');
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - ml - mr)).tickFormat(''));
    svg.append('g').selectAll('rect').data(itens).join('rect').attr('x', (_, i) => x(i)).attr('width', x.bandwidth())
      .attr('y', (d) => y(d.v)).attr('height', (d) => y(0) - y(d.v)).attr('rx', 2).style('fill', (d) => d.cor || 'var(--pt-c1)');
    svg.append('g').selectAll('text').data(itens).join('text').attr('class', 'off-rot').attr('x', (_, i) => x(i) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.v) - 5).attr('text-anchor', 'middle').style('fill', 'var(--color-fg)').text((d) => PT.fmt(d.v, 'int'));
    svg.append('g').selectAll('text').data(itens).join('text').attr('class', 'nt-eixo').attr('x', (_, i) => x(i) + x.bandwidth() / 2)
      .attr('y', H - mb + 15).attr('text-anchor', 'middle').text((d) => d.rot);
    if (temGrupo) {
      const grupos = [];
      itens.forEach((it, i) => { const g = grupos[grupos.length - 1]; if (g && g.nome === it.grupo) g.fim = i; else grupos.push({nome: it.grupo, ini: i, fim: i}); });
      const gg = svg.append('g');
      grupos.forEach((g) => {
        const x0 = x(g.ini) - x.step() * x.paddingInner() / 2, x1 = x(g.fim) + x.bandwidth() + x.step() * x.paddingInner() / 2;
        gg.append('line').attr('x1', x0).attr('x2', x1).attr('y1', H - mb + 22).attr('y2', H - mb + 22).style('stroke', 'var(--color-border-line)');
        gg.append('text').attr('class', 'nt-eixo').attr('x', (x0 + x1) / 2).attr('y', H - mb + 36).attr('text-anchor', 'middle').text(ROT_FAIXA[g.nome] || g.nome);
      });
    }
  }

  // barras deitadas com o valor no fim
  function deitadas(box, itens, cor) {
    box.replaceChildren();
    if (!itens.length) { box.append(el('p', 'pt-note', 'Nada com esses filtros.')); return; }
    const W = Math.max(240, box.clientWidth || 360), lh = 24, ml = 130, mr = 44, H = itens.length * lh + 6;
    const x = d3.scaleLinear().domain([0, d3.max(itens, (i) => i.v) || 1]).range([ml, W - mr]);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', H).attr('role', 'img');
    const g = svg.append('g').selectAll('g').data(itens).join('g').attr('transform', (_, i) => `translate(0,${i * lh + 3})`);
    g.append('rect').attr('x', ml).attr('y', 3).attr('height', lh - 8).attr('width', (d) => Math.max(1, x(d.v) - ml)).attr('rx', 2).style('fill', cor);
    g.append('text').attr('class', 'ns-ds').attr('x', ml - 8).attr('y', lh / 2).attr('text-anchor', 'end').attr('dominant-baseline', 'middle').text((d) => d.rot);
    g.append('text').attr('class', 'off-rot').attr('x', (d) => x(d.v) + 6).attr('y', lh / 2).attr('dominant-baseline', 'middle').style('fill', 'var(--color-fg)').text((d) => PT.fmt(d.v, 'int'));
  }

  // histórico diário de um DC: pacotes com +7 dias (7-10 + +10), como no Excel
  function historico(box, hist, dc) {
    box.replaceChildren();
    const m = new Map();
    hist.filter((h) => h.dc === dc && (h.faixa === '3. 7-10d' || h.faixa === '4. +10d')).forEach((h) => m.set(h.data, (m.get(h.data) || 0) + h.qtd));
    const datas = [...new Set(hist.map((h) => h.data))].sort();
    if (!datas.length) { box.append(el('p', 'pt-note', 'Sem histórico ainda.')); return; }
    const pts = datas.map((d) => ({d, v: m.get(d) || 0}));
    const W = Math.max(240, box.clientWidth || 360), H = 190, ml = 12, mr = 12, mt = 22, mb = 30;
    const x = d3.scalePoint().domain(datas).range([ml, W - mr]).padding(0.4);
    const y = d3.scaleLinear().domain([0, (d3.max(pts, (p) => p.v) || 1) * 1.25]).range([H - mb, mt]);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', H).attr('role', 'img').attr('aria-label', `Histórico diário ${dc}`);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - ml - mr)).tickFormat(''));
    svg.append('g').attr('class', 'axis ns-eixo').attr('transform', `translate(0,${H - mb})`).call(d3.axisBottom(x).tickFormat(PT.dData).tickSizeOuter(0));
    svg.append('path').datum(pts).attr('fill', 'none').style('stroke', 'var(--nt-laranja)').attr('stroke-width', 2.2).attr('d', d3.line().x((p) => x(p.d)).y((p) => y(p.v)));
    svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', (p) => x(p.d)).attr('cy', (p) => y(p.v)).attr('r', 3.5).style('fill', 'var(--nt-laranja)');
    svg.append('g').selectAll('text').data(pts).join('text').attr('class', 'off-rot').attr('x', (p) => x(p.d)).attr('y', (p) => y(p.v) - 8)
      .attr('text-anchor', 'middle').style('fill', 'var(--nt-laranja)').text((p) => PT.fmt(p.v, 'int'));
  }

  dash.draw('nt-painel', (box) => {
    const g = dash.data('notracking');
    if (g.status !== 'ok') { box.replaceChildren(el('p', 'pt-note', g.status === 'error' ? 'Falha ao carregar.' : 'Carregando…')); return; }
    const todos = g.data.map((r) => ({...r, tipo: r.tipo || '(Sem insucesso)', valor: r.valor || 0}));
    const rows = todos.filter((r) => passa(r));
    const opcoes = (campo) => [...new Set(todos.map((r) => r[campo]).filter((v) => v != null && v !== ''))].sort();

    // filtros
    const filtros = el('div', 'nt-filtros');
    filtros.append(
      filtro('DC', 'dc', DCS.filter((d) => todos.some((r) => r.dc === d))),
      filtro('Faixa', 'faixa', FAIXAS),
      filtro('Status', 'status', opcoes('status')),
      filtro('Tipo de insucesso', 'tipo', opcoes('tipo')),
      filtro('DS destino', 'ds', opcoes('ds')),
    );
    const limparTudo = el('button', 'nt-f-limpar', 'Voltar ao padrão');
    limparTudo.type = 'button';
    limparTudo.addEventListener('click', () => { F.dc = F.status = F.tipo = F.ds = null; F.faixa = new Set(['2. 4-6d', '3. 7-10d', '4. +10d']); dash.render(); });
    filtros.append(limparTudo);

    // cartões
    const total = rows.length, valor = d3.sum(rows, (r) => r.valor);
    const cards = el('div', 'nt-cards');
    const card = (tit, v, sub, cor, critico) => {
      const c = el('div', 'nt-card'); c.style.setProperty('--cor', cor);
      c.append(el('div', 'nt-card-h', tit), el('div', 'nt-card-v' + (critico ? ' critico' : ''), PT.fmt(v, 'int')), el('div', 'nt-card-s', sub));
      return c;
    };
    cards.append(card('Total de pacotes', total, `Valor: R$ ${PT.fmt(valor, 'int')}`, 'var(--imile-azul)'));
    FAIXAS.forEach((f) => { const n = rows.filter((r) => r.faixa === f).length; cards.append(card(ROT_FAIXA[f], n, `${PT.fmt(total ? n / total : 0, 'pct')} do total`, COR_FAIXA[f], f === '4. +10d')); });

    // linha 1: faixa × DC · DSs de destino · total por DC
    const l1 = el('div', 'nt-l1');
    const c1 = el('div', 'pt-card'), c2 = el('div', 'pt-card'), c3 = el('div', 'pt-card');
    const g1 = el('div', 'pt-chart'), g2 = el('div', 'pt-chart'), g3 = el('div', 'pt-chart');
    c1.append(el('h3', '', 'Por faixa e DC'), g1); c2.append(el('h3', '', 'DSs de destino (10 maiores)'), g2); c3.append(el('h3', '', 'Total por DC'), g3);
    l1.append(c1, c2, c3);
    const porFaixaDc = [];
    FAIXAS.forEach((f) => DCS.forEach((dc) => { const n = rows.filter((r) => r.faixa === f && r.dc === dc).length; if (n) porFaixaDc.push({grupo: f, rot: dc, v: n, cor: PT.cor(dc)}); }));
    const mDs = new Map(); rows.forEach((r) => mDs.set(r.ds, (mDs.get(r.ds) || 0) + 1));
    const topDs = [...mDs].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([rot, v]) => ({rot, v}));
    const porDc = DCS.map((dc) => ({rot: dc, v: rows.filter((r) => r.dc === dc).length, cor: PT.cor(dc)})).filter((d) => !F.dc || F.dc.has(d.rot));

    // linha 2: tabela e barras por último status
    const l2 = el('div', 'pt-grid2');
    const mSt = new Map(); rows.forEach((r) => mSt.set(r.status, (mSt.get(r.status) || 0) + 1));
    const st = [...mSt].sort((a, b) => b[1] - a[1]);
    const c4 = el('div', 'pt-card'), tbl = el('table', 'pt-tbl nt-tbl');
    tbl.innerHTML = '<thead><tr><th>Último status</th><th class="num">Pacotes</th><th class="num">% Repres.</th><th class="num">% Acum.</th></tr></thead>';
    const tb = el('tbody', ''); let acum = 0;
    st.forEach(([s, n]) => { acum += n; const tr = el('tr', ''); [s, PT.fmt(n, 'int'), PT.fmt(n / total, 'pct2'), PT.fmt(acum / total, 'pct2')].forEach((v, i) => tr.append(el('td', i ? 'num' : '', v))); tb.append(tr); });
    const tf = el('tr', 'nt-total'); ['Total', PT.fmt(total, 'int'), total ? '100,00%' : '—', ''].forEach((v, i) => tf.append(el('td', i ? 'num' : '', v))); tb.append(tf);
    tbl.append(tb);
    c4.append(el('h3', '', 'Último status'), tbl);
    const c5 = el('div', 'pt-card'), g5 = el('div', 'pt-chart');
    c5.append(el('h3', '', 'Pacotes por último status'), g5);
    l2.append(c4, c5);

    // linha 3: histórico diário por DC
    const gh = dash.data('nt_hist'), hist = gh.status === 'ok' ? gh.data : [];
    const l3 = el('div', 'nt-l3');
    const gHist = DCS.map((dc) => { const c = el('div', 'pt-card'), gx = el('div', 'pt-chart'); c.append(el('h3', '', `${dc} · Histórico diário`), el('p', 'pt-sub', 'Pacotes parados há mais de 7 dias'), gx); l3.append(c); return [gx, dc]; });

    box.replaceChildren(filtros, cards, l1, l2, l3);
    requestAnimationFrame(() => {
      colunas(g1, porFaixaDc); deitadas(g2, topDs, 'var(--pt-c1)'); colunas(g3, porDc);
      deitadas(g5, st.map(([rot, v]) => ({rot, v})), 'var(--color-fg-muted)');
      gHist.forEach(([gx, dc]) => historico(gx, hist, dc));
    });
  });
})();
