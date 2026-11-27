/* ---------- Eficiência HC no layout do Excel (Produtividade por Pessoa — Nordeste II) ---------- */
(() => {
  const DCS = ['DC-PI2', 'DC-PI3', 'DC-CE1']; // mesma ordem do Excel
  const META = {'DC-PI2': [800, 850], 'DC-CE1': [850, 900], 'DC-PI3': [850, 900]}; // [meta, desafio] em pacotes por pessoa
  const el = (t, c, x) => PT.el(t, c, x);
  const ISO = (d) => d.toISOString().slice(0, 10);
  const soma = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return ISO(t); };
  const terca = (d) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 5) % 7)); return ISO(t); };
  const br = (d) => d.split('-').reverse().join('/');
  const curto = (d) => { const [a, m, dd] = d.split('-'); return `${dd}/${m}/${a.slice(2)}`; };
  const dec1 = (v) => (v == null ? '-' : PT.fmt(v, 'dec1'));
  const int = (v) => (v ? PT.fmt(v, 'int') : '-');
  let ini = null, fim = null, dia = null, perModo = 'faixa'; // filtros (null = padrão) · perModo: 'faixa' De/Até | 'datas' vários dias
  const perSt = PERIODO.estado();
  let visao = 'periodo'; // 'periodo' = painel do período · 'resumo' = eficiência do dia e resumo por período

  // pega metas do Excel, se tiver, senão usa as do texto da aba
  const metaDe = (dc) => {
    const r = ((window.DADOS_NOVEMBRO || {}).tables || {}).resumo || [];
    const x = r.find((y) => y.indicador === 'Eficiência HC' && y.dc === dc);
    return x && x.meta ? [x.meta, x.desafio] : META[dc];
  };

  // soma de um período: volume, pessoas, dias com operação e produtividade
  const resumo = (H, dentro, dc) => {
    const rows = H.filter((r) => dentro(r.data) && (!dc || r.dc === dc) && r.volume_hc > 0);
    const vol = d3.sum(rows, (r) => r.volume_hc), pes = d3.sum(rows, (r) => r.pessoas);
    // dias com operação: do DC; no Nordeste II, o maior entre os DCs (como no Excel)
    const dias = dc ? new Set(rows.map((r) => r.data)).size : d3.max(DCS, (d) => new Set(rows.filter((r) => r.dc === d).map((r) => r.data)).size) || 0;
    return {vol, pes, dias, media: dias ? pes / dias : null, prod: pes ? vol / pes : null};
  };

  function barras(box, itens) {
    box.replaceChildren();
    const W = Math.max(280, box.clientWidth || 600), H = 260, ml = 40, mr = 10, mt = 14, mb = 26;
    const x = d3.scaleBand().domain(itens.map((i) => i.dc)).range([ml, W - mr]).padding(0.45);
    const y = d3.scaleLinear().domain([0, Math.max(1000, d3.max(itens, (i) => i.v || 0) * 1.1)]).nice().range([H - mb, mt]);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', H).attr('role', 'img').attr('aria-label', 'Produtividade por DC no período');
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - ml - mr)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((v) => PT.fmt(v, 'int')).tickSize(0)).call((g) => g.select('.domain').remove());
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - mb})`).call(d3.axisBottom(x).tickSizeOuter(0));
    const d = itens.filter((i) => i.v != null);
    svg.append('g').selectAll('rect').data(d).join('rect').attr('x', (i) => x(i.dc)).attr('width', x.bandwidth()).attr('y', (i) => y(i.v)).attr('height', (i) => y(0) - y(i.v)).attr('rx', 3).style('fill', 'var(--hc-azul)');
    svg.append('g').selectAll('text').data(d).join('text').attr('class', 'hc-rot').attr('x', (i) => x(i.dc) + x.bandwidth() / 2).attr('y', (i) => (y(i.v) + y(0)) / 2)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').text((i) => dec1(i.v));
    // linha da meta de cada DC
    svg.append('g').selectAll('line').data(itens).join('line').attr('x1', (i) => x(i.dc) - 8).attr('x2', (i) => x(i.dc) + x.bandwidth() + 8)
      .attr('y1', (i) => y(i.meta)).attr('y2', (i) => y(i.meta)).style('stroke', '#f2c94c').attr('stroke-width', 2).attr('stroke-dasharray', '5 3');
  }

  // tabela de resumo por período (semanal, mensal ou diário)
  function tabelaPeriodo(titulo, periodos, H) {
    const c = el('div', 'pt-card hc-res');
    c.append(el('h3', '', titulo));
    const t = el('table', 'hc-tbl hc-tbl-res');
    const th = el('thead', '');
    const r1 = el('tr', ''), r2 = el('tr', '');
    const p = el('th', '', 'Período'); p.colSpan = 2; r1.append(p);
    DCS.forEach((dc) => { const h = el('th', '', dc); h.colSpan = 3; r1.append(h); });
    r1.append(el('th', 'hc-ne', 'Nordeste II'));
    ['Início', 'Fim', ...DCS.flatMap(() => ['Volume', 'Pessoas', 'Produt.']), 'Produt.'].forEach((x, i) => r2.append(el('th', i === 2 + DCS.length * 3 ? 'hc-ne' : '', x)));
    th.append(r1, r2); t.append(th);
    const tb = el('tbody', '');
    periodos.forEach(([de, ate, rotDe, rotAte]) => {
      const tot = resumo(H, (d) => d >= de && d <= ate);
      if (!tot.vol) return; // período sem operação: não mostra a linha de traços
      const tr = el('tr', '');
      tr.append(el('td', '', rotDe), el('td', '', rotAte));
      DCS.forEach((dc) => { const r = resumo(H, (d) => d >= de && d <= ate, dc); tr.append(el('td', 'num', int(r.vol)), el('td', 'num', int(r.pes)), el('td', 'num hc-prod', dec1(r.prod))); });
      tr.append(el('td', 'num hc-ne hc-prod', dec1(tot.prod)));
      tb.append(tr);
    });
    if (!tb.children.length) { const tr = el('tr', ''); const td = el('td', 'pt-note', 'Sem operação nesse período.'); td.colSpan = 3 + DCS.length * 3; tr.append(td); tb.append(tr); }
    t.append(tb);
    const w = el('div', 'pt-tbl-wrap'); w.append(t); c.append(w);
    return c;
  }

  dash.draw('hc-painel', (box) => {
    const H = window.PORTAL_HC;
    if (!H) { box.replaceChildren(el('p', 'pt-note', dash.data('diario').status === 'ok' ? 'Sem dados da Eficiência HC.' : 'Carregando…')); return; }
    const datas = [...new Set(H.filter((r) => r.volume_hc > 0).map((r) => r.data))].sort();
    if (!datas.length) { box.replaceChildren(el('p', 'pt-note', 'Sem dados.')); return; }
    const ultima = datas[datas.length - 1];
    let de = ini || terca(ultima), ate = fim || ultima;
    if (de > ate) [de, ate] = [ate, de];
    if (perModo === 'datas') { const rr = PERIODO.deAte('datas', datas, perSt); de = rr.de; ate = rr.ate; }
    const cobre = perModo === 'datas' ? (d) => perSt.dias.has(d) : (d) => d >= de && d <= ate;
    const diaSel = datas.includes(dia) ? dia : ultima;

    // filtros: data inicial e final, e atalhos
    const ctl = el('div', 'hc-filtros');
    const campo = (rot, val, set) => {
      const l = el('label', 'hc-data'); const i = el('input', 'dash-select'); i.type = 'date'; i.value = val; i.min = datas[0]; i.max = ultima;
      i.addEventListener('change', () => { if (i.value) { set(i.value); dash.render(); } });
      l.append(el('span', '', rot), i); return l;
    };
    const cDe = campo('Data inicial', de, (v) => { ini = v; }), cAte = campo('Data final', ate, (v) => { fim = v; });
    const atalhos = el('div', 'pt-seg');
    const semAt = terca(ultima);
    [['Semana atual', semAt, ultima], ['Semana anterior', soma(semAt, -7), soma(semAt, -1)], ['Mês', window.PORTAL_MES.ini(ultima), ultima]].forEach(([t, a, b]) => {
      const bt = el('button', '', t); bt.type = 'button'; bt.setAttribute('aria-pressed', String(a === de && b === ate));
      bt.addEventListener('click', () => { ini = a; fim = b; dash.render(); });
      atalhos.append(bt);
    });
    // botão para trocar de visão
    const vis = el('div', 'pt-seg hc-vis');
    [['periodo', 'Painel do período'], ['resumo', 'Eficiência do dia e resumo']].forEach(([v, t]) => {
      const bt = el('button', '', t); bt.type = 'button'; bt.setAttribute('aria-pressed', String(visao === v));
      bt.addEventListener('click', () => { visao = v; dash.render(); });
      vis.append(bt);
    });
    const modoSeg = el('div', 'pt-seg');
    [['faixa', 'Intervalo'], ['datas', 'Datas']].forEach(([v, t]) => {
      const bt = el('button', '', t); bt.type = 'button'; bt.setAttribute('aria-pressed', String(perModo === v));
      bt.addEventListener('click', () => { perModo = v; dash.render(); }); modoSeg.append(bt);
    });
    const ult = el('span', 'hc-ult', `Última data na base: ${br(ultima)}`);
    if (perModo === 'datas') ctl.append(modoSeg, PERIODO.painel('datas', datas, perSt, () => dash.render()), vis, ult);
    else ctl.append(cDe, cAte, atalhos, modoSeg, vis, ult);

    // cartões
    const tot = resumo(H, cobre);
    const cards = el('div', 'hc-cards');
    [['Volume Recebido', int(tot.vol)], ['Qtd de Pessoas (HC-dia)', int(tot.pes)], ['Média HC por dia', dec1(tot.media)], ['Produtividade (pct/pessoa)', dec1(tot.prod)]]
      .forEach(([t, v]) => { const c = el('div', 'hc-card'); c.append(el('div', 'hc-card-h', t), el('div', 'hc-card-v', v)); cards.append(c); });

    // tabela por DC com posição
    const porDc = DCS.map((dc) => ({dc, ...resumo(H, cobre, dc)}));
    const ordem = porDc.filter((r) => r.prod != null).sort((a, b) => b.prod - a.prod).map((r) => r.dc);
    const maxProd = d3.max(porDc, (r) => r.prod || 0) || 1;
    const t = el('table', 'hc-tbl');
    t.innerHTML = '<thead><tr><th>DC</th><th>Volume Recebido</th><th>Dias com operação</th><th>Qtd de Pessoas (HC-dia)</th><th>Média HC por dia</th><th>Produtividade (pct/pessoa)</th><th>Posição</th></tr></thead>';
    const tb = el('tbody', '');
    porDc.forEach((r) => {
      const tr = el('tr', '');
      const barra = el('td', 'hc-barra'); const b = el('span', ''); b.style.width = `${Math.round(((r.prod || 0) / maxProd) * 100)}%`; barra.append(b, el('b', '', dec1(r.prod)));
      const pos = ordem.indexOf(r.dc);
      tr.append(el('td', 'hc-dc', r.dc), el('td', 'num', int(r.vol)), el('td', 'num', r.dias || '-'), el('td', 'num', int(r.pes)), el('td', 'num', dec1(r.media)), barra, el('td', '', pos >= 0 ? `${pos + 1}º` : '-'));
      tb.append(tr);
    });
    const tf = el('tr', 'hc-total');
    [['Nordeste II', 'hc-dc'], [int(tot.vol), 'num'], [tot.dias || '-', 'num'], [int(tot.pes), 'num'], [dec1(tot.media), 'num'], [dec1(tot.prod), 'num'], ['', '']].forEach(([v, c]) => tf.append(el('td', c, v)));
    tb.append(tf); t.append(tb);
    const cTab = el('div', 'pt-card');
    cTab.append(el('h3', '', `Período: ${br(de)} a ${br(ate)}`), (() => { const w = el('div', 'pt-tbl-wrap'); w.append(t); return w; })());

    const cGraf = el('div', 'pt-card'), g = el('div', 'pt-chart');
    cGraf.append(el('h3', '', 'Produtividade por DC no período (pct/pessoa)'), el('p', 'pt-sub', 'A linha amarela é a meta de cada DC.'), g);

    // eficiência do dia
    const cDia = el('div', 'pt-card');
    const cab = el('div', 'hc-dia-cab');
    const ld = el('label', 'hc-data'); const sd = el('select', 'dash-select');
    [...datas].reverse().forEach((d) => { const o = el('option', '', br(d)); o.value = d; if (d === diaSel) o.selected = true; sd.append(o); });
    sd.addEventListener('change', () => { dia = sd.value; dash.render(); });
    ld.append(el('span', '', 'Dia'), sd);
    cab.append(el('h3', '', 'Eficiência do dia'), ld);
    const td = el('table', 'hc-tbl');
    td.innerHTML = '<thead><tr><th>DC</th><th>Volume Recebido</th><th>Qtd de Pessoas</th><th>Produtividade (pct/pessoa)</th><th>Meta</th><th>Desafio</th><th>Status</th></tr></thead>';
    const tbd = el('tbody', '');
    DCS.forEach((dc) => {
      const r = resumo(H, (d) => d === diaSel, dc), [meta, des] = metaDe(dc);
      const st = r.prod == null ? ['Sem operação', ''] : r.prod >= des ? ['Desafio atingido', 'pt-good'] : r.prod >= meta ? ['Dentro da meta', 'hc-meta'] : ['Fora da meta', 'pt-bad'];
      const tr = el('tr', '');
      tr.append(el('td', 'hc-dc', dc), el('td', 'num', int(r.vol)), el('td', 'num', int(r.pes)), el('td', 'num hc-prod', dec1(r.prod)), el('td', 'num', PT.fmt(meta, 'int')), el('td', 'num', PT.fmt(des, 'int')), el('td', 'hc-st ' + st[1], st[0]));
      tbd.append(tr);
    });
    td.append(tbd);
    cDia.append(cab, (() => { const w = el('div', 'pt-tbl-wrap'); w.append(td); return w; })());

    // resumo por período (até a data final)
    const sFim = terca(ate);
    const semanas = [...Array(12)].map((_, i) => { const a = soma(sFim, -7 * (11 - i)); return [a, soma(a, 6), curto(a), curto(soma(a, 6))]; });
    const meses = [...Array(6)].map((_, i) => {
      const d = new Date(ate.slice(0, 7) + '-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() - (5 - i));
      const a = ISO(d), f = new Date(d); f.setUTCMonth(f.getUTCMonth() + 1); f.setUTCDate(0);
      const rot = d.toLocaleDateString('pt-BR', {month: 'short', year: '2-digit', timeZone: 'UTC'}).replace('. de ', '/').replace('.', '');
      return [a, ISO(f), rot, rot];
    });
    const diasP = [...Array(30)].map((_, i) => { const d = soma(ate, -(29 - i)); return [d, d, curto(d), curto(d)]; });
    const res = el('div', 'hc-resumos');
    res.append(el('div', 'hc-faixa', 'Resumo por período (base para consulta e para o Ranking de Indicadores)'),
      tabelaPeriodo('Semanal — semana operacional terça a segunda, últimas 12 semanas até a data final', semanas, H),
      tabelaPeriodo('Mensal — últimos 6 meses até a data final', meses, H),
      tabelaPeriodo('Diário — últimos 30 dias até a data final', diasP, H));

    const topo = el('div', 'hc-topo'); topo.append(cTab, cGraf);
    if (visao === 'resumo') { box.replaceChildren(ctl, cDia, res); return; }
    box.replaceChildren(ctl, cards, topo);
    requestAnimationFrame(() => barras(g, porDc.map((r) => ({dc: r.dc, v: r.prod, meta: metaDe(r.dc)[0]}))));
  });
})();
