/* ---------- OffLoading no layout do Excel (OffLoading/ConsolidateBag Monitoramento) ---------- */
(() => {
  const DCS = ['DC-PI2', 'DC-CE1', 'DC-PI3'];
  const el = (t, c, x) => PT.el(t, c, x);
  const ISO = (d) => d.toISOString().slice(0, 10);
  const soma = (d, dias) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + dias); return ISO(t); };
  const terca = (d) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 5) % 7)); return ISO(t); };
  let diaEscolhido = null; // null = último dia com dados
  let dcHora = 'Nordeste II';  // filtro do gráfico por hora
  // linhas por hora de um dia (todos os DCs somados ou um DC)
  const porHora = (horas, dia, dc) => {
    const m = new Map();
    for (const r of horas) if (r.data === dia && (dc === 'Nordeste II' || r.dc === dc)) {
      const x = m.get(r.hora) || {hora: r.hora, rec: 0, con: 0}; x.rec += r.recebido; x.con += r.consolidado; m.set(r.hora, x);
    }
    return [...m.values()].sort((a, b) => a.hora - b.hora);
  };
  const pico = (linhas, campo) => { let m = null; for (const x of linhas) if (x[campo] > 0 && (!m || x[campo] > m[campo])) m = x; return m ? String(m.hora).padStart(2, '0') + 'h' : '—'; };

  // soma recebido/consolidado de um conjunto de linhas entre duas datas (inclusive)
  const total = (rows, de, ate, dc) => {
    let rec = 0, con = 0;
    for (const r of rows) if (r.data >= de && r.data <= ate && (!dc || r.dc === dc)) { rec += r.recebido_off || 0; con += r.consolidado || 0; }
    return {rec, con, taxa: rec ? con / rec : null};
  };
  // variação: ▲/▼ com cor (para cima é bom)
  const variacao = (atual, ant, pp) => {
    if (atual == null || ant == null || (!pp && !ant)) return null;
    const d = pp ? (atual - ant) * 100 : (atual - ant) / ant;
    const txt = pp ? PT.fmt(Math.abs(d), 'dec1') + ' pp' : PT.fmt(Math.abs(d), 'pct');
    return {seta: d > 0 ? '▲' : d < 0 ? '▼' : '=', cls: d > 0 ? 'pt-good' : d < 0 ? 'pt-bad' : '', txt};
  };
  const linhaVar = (rotulo, valorAnt, v) => {
    const p = el('div', 'off-sub');
    if (valorAnt == null) { p.textContent = rotulo + ' sem dados'; return p; }
    p.append(document.createTextNode(`${rotulo} ${valorAnt} `));
    if (v) p.append(el('span', v.cls, `${v.seta} ${v.txt}`));
    return p;
  };

  // ----- cartões do topo (Nordeste II) -----
  const cartao = (titulo, valor, faixa) => {
    const c = el('div', 'off-top');
    c.append(el('div', 'off-top-h', titulo), el('div', 'off-top-v', valor), faixa);
    return c;
  };
  const faixa = (ant, v, mes) => {
    const f = el('div', 'off-top-f');
    f.append(el('span', 'muted', 'Dia anterior '), el('b', '', ant), document.createTextNode(' '));
    if (v) f.append(el('span', v.cls, `${v.seta} ${v.txt}`));
    f.append(el('span', 'sep', '|'), el('span', 'muted', 'Mês '), el('b', '', mes));
    return f;
  };

  // ----- gráfico dos últimos 7 dias: recebido e consolidado (eixo esquerdo) + % (eixo direito) -----
  function grafico(box, dias) {
    box.replaceChildren();
    const W = Math.max(300, box.clientWidth || 600), H = 230, ml = 46, mr = 46, mt = 22, mb = 24;
    box.append(PT.legend([{name: 'Consolidado', color: 'var(--pt-c2)'}, {name: '% Consolidado', color: 'var(--color-fg-muted)'}]));
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', H).attr('role', 'img').attr('aria-label', 'Consolidado e taxa dos últimos 7 dias');
    const x = d3.scalePoint().domain(dias.map((d) => d.data)).range([ml, W - mr]).padding(0.4);
    const y = d3.scaleLinear().domain([0, (d3.max(dias, (d) => d.con) || 1) * 1.18]).nice(4).range([H - mb, mt]);
    const tx = dias.filter((d) => d.taxa != null).map((d) => d.taxa);
    const y2 = d3.scaleLinear().domain([0, Math.max(1.2, (d3.max(tx) || 1) * 1.1)]).range([H - mb, mt]);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - ml - mr)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(4).tickFormat((v) => PT.fmt(v, 'int')).tickSize(0)).call((g) => g.select('.domain').remove());
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${W - mr},0)`).call(d3.axisRight(y2).ticks(4).tickFormat((v) => PT.fmt(v * 100, 'int') + '%').tickSize(0)).call((g) => g.select('.domain').remove());
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - mb})`).call(d3.axisBottom(x).tickFormat(PT.dData).tickSizeOuter(0));
    const ref = svg.append('g').attr('class', 'ref');
    ref.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y2(0.8)).attr('y2', y2(0.8));
    ref.append('text').attr('x', W - mr - 4).attr('y', y2(0.8) + 13).attr('text-anchor', 'end').text('Meta 80%');
    const serie = (campo, cor, escala, tracejado, rotulo) => {
      const pts = dias.filter((d) => d[campo] != null);
      svg.append('path').datum(pts).attr('fill', 'none').style('stroke', cor).attr('stroke-width', 2.2).attr('stroke-dasharray', tracejado ? '5 4' : null)
        .attr('d', d3.line().x((d) => x(d.data)).y((d) => escala(d[campo])));
      svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', (d) => x(d.data)).attr('cy', (d) => escala(d[campo])).attr('r', 3.5).style('fill', cor);
      if (rotulo) svg.append('g').selectAll('text').data(pts).join('text').attr('class', 'off-rot').attr('x', (d) => x(d.data)).attr('y', (d) => escala(d[campo]) - 8)
        .attr('text-anchor', 'middle').style('fill', cor).text((d) => rotulo(d[campo]));
    };
    serie('con', 'var(--pt-c2)', y, false);
    serie('taxa', 'var(--color-fg-muted)', y2, true, (v) => PT.fmt(v, 'pct'));
    const tip = (() => { const t = el('div', 'pt-tip'); t.hidden = true; box.append(t); return t; })();
    svg.append('g').selectAll('rect').data(dias).join('rect').attr('x', (d) => x(d.data) - x.step() / 2).attr('width', x.step()).attr('y', mt).attr('height', H - mt - mb).attr('fill', 'transparent')
      .on('pointermove', (ev, d) => {
        tip.replaceChildren(el('div', 't', PT.dDataAno(d.data)), el('div', '', 'Recebido: ' + PT.fmt(d.rec, 'int')), el('div', '', 'Consolidado: ' + PT.fmt(d.con, 'int')), el('div', '', '% Consolidado: ' + PT.fmt(d.taxa, 'pct')));
        tip.hidden = false;
        const [bx, by] = d3.pointer(ev, box);
        tip.style.left = Math.max(0, Math.min(box.clientWidth - tip.offsetWidth, bx + 12)) + 'px'; tip.style.top = Math.max(0, by - 10) + 'px';
      })
      .on('pointerleave', () => { tip.hidden = true; });
  }

  // ----- painel de um DC -----
  function painel(rows, dc, dia, mesIni, horas) {
    const p = el('div', 'off-dc');
    const d0 = total(rows, dia, dia, dc), da = total(rows, soma(dia, -1), soma(dia, -1), dc);
    const semIni = terca(dia), sem = total(rows, semIni, dia, dc), semAnt = total(rows, soma(semIni, -7), soma(semIni, -1), dc);
    const mes = total(rows, mesIni, dia, dc);
    const mesAntIni = window.PORTAL_MES.ini(soma(mesIni, -1)), mesAnt = total(rows, mesAntIni, soma(mesIni, -1), dc);
    const temDia = (t) => t.rec > 0 || t.con > 0;

    const h = el('div', 'off-dc-h');
    const nome = el('b', '', dc); nome.style.setProperty('--cor', PT.cor(dc));
    h.append(nome, el('span', 'sep', '|'), el('span', '', `Recebido x Consolidado · últimos 7 dias até ${PT.dData(dia)}`));
    const ph = porHora(horas, dia, dc);
    if (ph.length) h.append(el('span', 'off-pico', `Pico receb. ${pico(ph, 'rec')} · Pico consol. ${pico(ph, 'con')}`));
    const corpo = el('div', 'off-dc-b');
    const kpis = el('div', 'off-kpis');
    const kpi = (rot, valor, sub, seta) => {
      const k = el('div', 'off-kpi');
      const v = el('div', 'off-kpi-v', valor);
      if (seta) v.append(el('span', 'off-seta ' + seta.cls, seta.seta));
      k.append(el('div', 'off-kpi-h', rot), v, sub);
      return k;
    };
    const vSem = sem.taxa != null && semAnt.taxa != null ? variacao(sem.taxa, semAnt.taxa, true) : null;
    const vMes = mes.taxa != null && mesAnt.taxa != null ? variacao(mes.taxa, mesAnt.taxa, true) : null;
    kpis.append(
      kpi('Recebido (dia)', PT.fmt(d0.rec, 'int'), linhaVar('Dia ant.', temDia(da) ? PT.fmt(da.rec, 'int') : null, variacao(d0.rec, da.rec))),
      kpi('Consolid. (dia)', PT.fmt(d0.con, 'int'), linhaVar('Dia ant.', temDia(da) ? PT.fmt(da.con, 'int') : null, variacao(d0.con, da.con))),
      kpi('% Semana', PT.fmt(sem.taxa, 'pct'), linhaVar('Sem. ant.', semAnt.taxa != null ? PT.fmt(semAnt.taxa, 'pct') : null, vSem), vSem && vSem.seta !== '=' ? vSem : null),
      kpi('% Mês', PT.fmt(mes.taxa, 'pct'), linhaVar('Mês ant.', mesAnt.taxa != null ? PT.fmt(mesAnt.taxa, 'pct') : null, vMes), vMes && vMes.seta !== '=' ? vMes : null),
    );
    const dias = [];
    for (let i = 6; i >= 0; i--) { const d = soma(dia, -i), t = total(rows, d, d, dc); dias.push({data: d, rec: t.rec, con: t.con, taxa: t.taxa}); }
    const g = el('div', 'pt-chart off-graf');
    corpo.append(kpis, g);
    p.append(h, corpo);
    requestAnimationFrame(() => grafico(g, dias)); // precisa estar na página para medir a largura
    return p;
  }

  dash.draw('off-painel', (box) => {
    const g = dash.data('off_todos');
    if (g.status !== 'ok') { box.replaceChildren(el('p', 'pt-note', g.status === 'error' ? 'Falha ao carregar.' : 'Carregando…')); return; }
    const rows = g.data;
    const datas = [...new Set(rows.filter((r) => r.recebido_off > 0 || r.consolidado > 0).map((r) => r.data))].sort();
    if (!datas.length) { box.replaceChildren(el('p', 'pt-note', 'Sem dados.')); return; }
    const dia = datas.includes(diaEscolhido) ? diaEscolhido : datas[datas.length - 1];
    const mesIni = window.PORTAL_MES.ini(dia);

    // seletor do dia (como a linha do tempo do Excel)
    const ctl = el('div', 'pt-controls');
    const lab = el('label', '', 'Dia ');
    const sel = el('select', 'dash-select');
    [...datas].reverse().forEach((d) => { const o = el('option', '', PT.dDataAno(d)); o.value = d; if (d === dia) o.selected = true; sel.append(o); });
    sel.addEventListener('change', () => { diaEscolhido = sel.value; dash.render(); });
    lab.append(sel); ctl.append(lab);

    // cartões do topo
    const d0 = total(rows, dia, dia), da = total(rows, soma(dia, -1), soma(dia, -1)), mes = total(rows, mesIni, dia);
    const top = el('div', 'off-tops');
    top.append(
      cartao('Total Recebido', PT.fmt(d0.rec, 'int'), faixa(PT.fmt(da.rec, 'int'), variacao(d0.rec, da.rec), PT.fmt(mes.rec, 'int'))),
      cartao('Total Consolidado', PT.fmt(d0.con, 'int'), faixa(PT.fmt(da.con, 'int'), variacao(d0.con, da.con), PT.fmt(mes.con, 'int'))),
      cartao('Consolidado x Recebido %', PT.fmt(d0.taxa, 'pct'), faixa(PT.fmt(da.taxa, 'pct'), d0.taxa != null && da.taxa != null ? variacao(d0.taxa, da.taxa, true) : null, PT.fmt(mes.taxa, 'pct'))),
    );
    const gh = dash.data('off_hora'), horas = gh.status === 'ok' ? gh.data : [];

    // recebido x consolidado por hora do dia escolhido
    const card = el('div', 'pt-card');
    const cab = el('div', 'off-hora-cab');
    const selDc = el('select', 'dash-select');
    ['Nordeste II', ...DCS].forEach((d) => { const o = el('option', '', d); o.value = d; if (d === dcHora) o.selected = true; selDc.append(o); });
    selDc.addEventListener('change', () => { dcHora = selDc.value; dash.render(); });
    cab.append(el('h3', '', 'Recebido x consolidado por hora'), selDc);
    const ph = porHora(horas, dia, dcHora);
    card.append(cab, el('p', 'pt-sub', `Dia ${PT.dDataAno(dia)} · ${dcHora}` + (ph.length ? ` · Pico receb. ${pico(ph, 'rec')} · Pico consol. ${pico(ph, 'con')}` : '')));
    const gbox = el('div', 'pt-chart short');
    card.append(gbox);
    if (!ph.length) gbox.append(el('p', 'pt-note', 'Sem dados por hora para este dia.'));
    else requestAnimationFrame(() => PT.bars(gbox, {cats: ph.map((x) => String(x.hora).padStart(2, '0') + 'h'), series: [
      {name: 'Recebido', color: 'var(--pt-c1)', vals: ph.map((x) => x.rec)},
      {name: 'Consolidado', color: 'var(--pt-c2)', vals: ph.map((x) => x.con)},
    ], yFmt: (v) => PT.fmt(v, 'int'), aria: 'Recebido e consolidado por hora', catTitle: (i) => String(ph[i].hora).padStart(2, '0') + ':00'}));

    box.replaceChildren(ctl, top, ...DCS.map((dc) => painel(rows, dc, dia, mesIni, horas)), card);
  });
})();
