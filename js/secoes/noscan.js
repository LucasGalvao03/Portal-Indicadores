/* ---------- No Scan no layout do Excel (No Scan — Recebido na DS sem registro de expedição do DC) ---------- */
(() => {
  const DCS = ['DC-PI2', 'DC-CE1', 'DC-PI3'];
  const el = (t, c, x) => PT.el(t, c, x);
  const ISO = (d) => d.toISOString().slice(0, 10);
  const soma = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return ISO(t); };
  const terca = (d) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 5) % 7)); return ISO(t); };
  const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const rotDia = (d) => `${DIAS[new Date(d + 'T00:00:00Z').getUTCDay()]} ${PT.dData(d)}`;
  let diaEscolhido = null; // null = último dia com dados
  let periodo = 'dia';     // 'dia' | 'semana' | 'intervalo' (De/Até) | 'datas' (vários dias)
  const perSt = PERIODO.estado();

  const total = (ns, de, ate, dc) => {
    let rec = 0, sem = 0;
    for (const r of ns) if (r.data >= de && r.data <= ate && (!dc || r.dc === dc)) { rec += r.rec; sem += r.sem; }
    return {rec, sem, taxa: rec ? sem / rec : null};
  };
  // ▲ é ruim (mais sem registro), ▼ é bom
  const seta = (dif, txt) => el('div', 'ns-var ' + (dif > 0 ? 'pt-bad' : dif < 0 ? 'pt-good' : ''), `${dif > 0 ? '▲' : dif < 0 ? '▼' : '='} ${txt}`);
  const sinal = (n) => (n > 0 ? '+' : '') + PT.fmt(n, 'int');

  // linha da semana (ter → seg) com rótulos e a média/dia da semana anterior tracejada
  function linhaSemana(box, pts, media) {
    box.replaceChildren();
    const W = Math.max(260, box.clientWidth || 360), H = 200, ml = 16, mr = 22, mt = 24, mb = 34;
    const x = d3.scalePoint().domain(pts.map((p) => p.data)).range([ml, W - mr]).padding(0.3);
    const y = d3.scaleLinear().domain([0, Math.max(1, d3.max(pts, (p) => p.v ?? 0), media) * 1.25]).range([H - mb, mt]);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', H).attr('role', 'img').attr('aria-label', 'Sem registro na semana');
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - ml - mr)).tickFormat(''));
    const eixo = svg.append('g').attr('class', 'axis ns-eixo').attr('transform', `translate(0,${H - mb})`).call(d3.axisBottom(x).tickFormat('').tickSizeOuter(0));
    eixo.selectAll('.tick').append('text').attr('y', 12).attr('text-anchor', 'middle').style('fill', 'var(--color-fg-muted)')
      .each(function (d) { const [dia, data] = rotDia(d).split(' '); d3.select(this).append('tspan').attr('x', 0).text(dia); d3.select(this).append('tspan').attr('x', 0).attr('dy', '1.1em').text(data); });
    if (media > 0) svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(media)).attr('y2', y(media)).style('stroke', 'var(--off-teal)').attr('stroke-width', 1.6).attr('stroke-dasharray', '6 5');
    const com = pts.filter((p) => p.v != null);
    svg.append('path').datum(com).attr('fill', 'none').style('stroke', 'var(--pt-c1)').attr('stroke-width', 2.4).attr('d', d3.line().x((p) => x(p.data)).y((p) => y(p.v)));
    svg.append('g').selectAll('circle').data(com).join('circle').attr('cx', (p) => x(p.data)).attr('cy', (p) => y(p.v)).attr('r', 4.5)
      .style('fill', 'var(--color-panel)').style('stroke', 'var(--pt-c1)').attr('stroke-width', 2);
    svg.append('g').selectAll('text').data(com).join('text').attr('class', 'off-rot').attr('x', (p) => x(p.data)).attr('y', (p) => y(p.v) - 9)
      .attr('text-anchor', 'middle').style('fill', 'var(--color-fg)').text((p) => PT.fmt(p.v, 'int'));
  }

  function painelDC(ns, dc, ini, dia) {
    const p = el('div', 'ns-dc');
    p.append(el('div', 'ns-dc-h', `${dc} · Pedidos sem registro`));
    const ant = soma(dia, -1), semIni = terca(dia), n = Math.round((Date.parse(dia) - Date.parse(semIni)) / 864e5);
    const d0 = total(ns, dia, dia, dc), da = total(ns, ant, ant, dc);
    const sem = total(ns, semIni, dia, dc), semAnt = total(ns, soma(semIni, -7), soma(semIni, -7 + n), dc);
    const kpis = el('div', 'ns-kpis');
    const kpi = (rot, val, v) => { const k = el('div', 'ns-kpi'); k.append(el('div', 'ns-kpi-h', rot), el('div', 'ns-kpi-v', val), v); return k; };
    kpis.append(
      kpi(`Dia do filtro (${PT.dData(dia)})`, PT.fmt(d0.sem, 'int'), seta(d0.sem - da.sem, `${sinal(d0.sem - da.sem)} vs ${PT.dData(ant)}`)),
      kpi(`Acum. semana até ${PT.dData(dia)}`, PT.fmt(sem.sem, 'int'), seta(sem.sem - semAnt.sem, `${sinal(sem.sem - semAnt.sem)} vs sem. ant.`)),
      kpi(`% sem registro (${PT.dData(dia)})`, PT.fmt(d0.taxa ?? 0, 'pct2'), seta((d0.taxa ?? 0) - (sem.taxa ?? 0), `Semana: ${PT.fmt(sem.taxa ?? 0, 'pct2')}`)),
    );
    // semana do dia escolhido (ter → seg) e média/dia da semana anterior completa
    const pts = [...Array(7)].map((_, i) => { const d = soma(semIni, i); return {data: d, v: d <= dia ? total(ns, d, d, dc).sem : null}; });
    const diasAnt = [...Array(7)].map((_, i) => soma(semIni, i - 7)).filter((d) => ns.some((r) => r.data === d));
    const media = diasAnt.length ? total(ns, soma(semIni, -7), soma(semIni, -1), dc).sem / diasAnt.length : 0;
    const g = el('div', 'pt-chart');
    const leg = el('div', 'ns-leg');
    leg.append(el('span', 'l1', 'Sem registro'), el('span', 'l2', 'Média/dia sem. anterior'));
    p.append(kpis, el('div', 'ns-g-t', `Semana ${PT.dData(semIni)} a ${PT.dData(soma(semIni, 6))} (ter a seg)`), g, leg);
    requestAnimationFrame(() => linhaSemana(g, pts, media));
    return p;
  }

  // DS com pedidos sem registro no período, as 5 maiores de cada DC
  function barrasDS(box, ns, cobre) {
    box.replaceChildren();
    const linhas = [];
    for (const dc of DCS) {
      const m = new Map();
      for (const r of ns) if (r.dc === dc && cobre(r.data) && r.sem > 0) m.set(r.ds, (m.get(r.ds) || 0) + r.sem);
      [...m].sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([ds, v]) => linhas.push({dc, ds, v}));
    }
    if (!linhas.length) { box.append(el('p', 'pt-note', 'Nenhuma DS com pedido sem registro no período.')); return; }
    const W = Math.max(320, box.clientWidth || 600), lh = 28, ml = 150, mr = 50, H = linhas.length * lh + 10;
    const x = d3.scaleLinear().domain([0, d3.max(linhas, (l) => l.v)]).range([ml, W - mr]);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', H).attr('role', 'img').attr('aria-label', 'DS com pedidos sem registro');
    const g = svg.append('g').selectAll('g').data(linhas).join('g').attr('transform', (l, i) => `translate(0,${i * lh + 4})`);
    g.append('rect').attr('x', ml).attr('y', 3).attr('height', lh - 9).attr('width', (l) => x(l.v) - ml).attr('rx', 2).style('fill', (l) => PT.cor(l.dc));
    g.append('text').attr('class', 'ns-ds').attr('x', ml - 8).attr('y', lh / 2).attr('text-anchor', 'end').attr('dominant-baseline', 'middle').text((l) => l.ds);
    g.append('text').attr('class', 'ns-dcl').attr('x', 4).attr('y', lh / 2).attr('dominant-baseline', 'middle').text((l, i) => (i === 0 || linhas[i - 1].dc !== l.dc ? l.dc : ''));
    g.append('text').attr('class', 'off-rot').attr('x', (l) => x(l.v) + 6).attr('y', lh / 2).attr('dominant-baseline', 'middle').style('fill', 'var(--color-fg)').text((l) => PT.fmt(l.v, 'int'));
  }

  function baixar(lista, de, ate) {
    const br = (d) => d.split('-').reverse().join('/');
    const cab = ['Waybill', 'DC', 'DS', 'Data', 'Hora do scan na DS'];
    const linhas = lista.map((r) => [r.waybill ? `="${r.waybill}"` : '', r.dc, r.ds, br(r.data), r.hora ? br(r.hora.slice(0, 10)) + r.hora.slice(10) : '']);
    const q = (v) => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const csv = '\ufeff' + [cab, ...linhas].map((l) => l.map(q).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    a.download = de === ate ? `noscan_${de}.csv` : `noscan_${de}_a_${ate}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  dash.draw('noscan-painel', (box) => {
    const ns = window.PORTAL_NOSCAN;
    if (!ns) { box.replaceChildren(el('p', 'pt-note', dash.data('diario').status === 'ok' ? 'Sem dados por DS do No Scan.' : 'Carregando…')); return; }
    const datas = [...new Set(ns.filter((r) => r.rec > 0).map((r) => r.data))].sort();
    if (!datas.length) { box.replaceChildren(el('p', 'pt-note', 'Sem dados.')); return; }
    const dia0 = datas.includes(diaEscolhido) ? diaEscolhido : datas[datas.length - 1];
    let ini, dia;
    if (periodo === 'intervalo' || periodo === 'datas') { const r = PERIODO.deAte(periodo, datas, perSt); ini = r.de; dia = r.ate; }
    else { dia = dia0; ini = periodo === 'semana' ? terca(dia) : dia; }
    const cobre = PERIODO.cobre(periodo, perSt, ini, dia);
    const totP = (dc) => { let rec = 0, sem = 0; for (const r of ns) if (cobre(r.data) && (!dc || r.dc === dc)) { rec += r.rec; sem += r.sem; } return {rec, sem, taxa: rec ? sem / rec : null}; };

    // filtros: dia e período (como a linha do tempo do Excel)
    const ctl = el('div', 'pt-controls');
    const lab = el('label', '', 'Dia ');
    const sel = el('select', 'dash-select');
    [...datas].reverse().forEach((d) => { const o = el('option', '', PT.dDataAno(d)); o.value = d; if (d === dia) o.selected = true; sel.append(o); });
    sel.addEventListener('change', () => { diaEscolhido = sel.value; dash.render(); });
    lab.append(sel);
    const seg = el('div', 'pt-seg');
    [['dia', 'Só o dia'], ['semana', 'Semana até o dia']].forEach(([v, t]) => {
      const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(periodo === v));
      b.addEventListener('click', () => { periodo = v; dash.render(); });
      seg.append(b);
    });
    PERIODO.segExtra(periodo, (v) => { periodo = v; dash.render(); }).forEach((b) => seg.append(b));
    const L = window.PORTAL_NOSCAN_LISTA;
    const lista = L ? L.filter((r) => DCS.includes(r.dc) && cobre(r.data)) : null;
    const bx = el('button', 'nt-baixar', lista ? `⬇ Baixar base (${PT.fmt(lista.length, 'int')} pedidos)` : '⬇ Baixar base (carregando…)');
    bx.type = 'button'; bx.disabled = !lista;
    bx.addEventListener('click', () => lista && baixar(lista, ini, dia));
    const pnl = PERIODO.painel(periodo, datas, perSt, () => dash.render());
    ctl.append(lab, seg, bx);
    if (pnl) ctl.append(pnl);

    // cartões do topo (Nordeste II, no período)
    const t = totP();
    const diasOp = (periodo === 'datas' ? perSt.dias.size : datas.filter((d) => cobre(d)).length) || 1;
    const top = el('div', 'off-tops ns-tops');
    const cartao = (tit, val) => { const c = el('div', 'off-top'); c.append(el('div', 'off-top-h', tit), el('div', 'off-top-v', val)); return c; };
    top.append(
      cartao('Total Recebido (DS)', PT.fmt(t.rec, 'int')),
      cartao('Sem Registro', PT.fmt(t.sem, 'int')),
      cartao('% Sem Registro', PT.fmt(t.taxa ?? 0, 'pct2')),
      cartao('Média Diária', PT.fmt(t.sem / diasOp, 'int')),
    );

    const dcs = el('div', 'ns-dcs');
    DCS.forEach((dc) => dcs.append(painelDC(ns, dc, ini, dia)));

    const card = el('div', 'pt-card');
    const rotPer = periodo === 'dia' ? PT.dDataAno(dia) : periodo === 'datas' ? `${perSt.dias.size} dia(s) escolhido(s)` : `${PT.dData(ini)} a ${PT.dData(dia)}`;
    card.append(el('h3', '', `DS com pedidos sem registro · ${rotPer}`), el('p', 'pt-sub', 'As 5 DSs com mais pedidos sem registro em cada DC.'));
    const gb = el('div', 'pt-chart');
    card.append(gb);
    box.replaceChildren(ctl, top, dcs, card);
    requestAnimationFrame(() => barrasDS(gb, ns, cobre));
  });
})();
