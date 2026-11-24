/* ---------- Lost ---------- */
(() => {
  dash.draw('lost-periodo', (p) => {
    const g = dash.data('lost_dc');
    if (g.status !== 'ok' || !g.data.length) { p.textContent = '—'; return; }
    const r = g.data[0];
    p.textContent = `Pacotes declarados como perdidos ou avariados entre ${PT.dDataAno(r.periodo_ini)} e ${PT.dDataAno(r.periodo_fim)}. Taxa de extravio = lost sobre o recebido no período.`;
  });
  dash.draw('lost-barras', (box) => {
    const g = dash.data('lost_semanal');
    if (g.status !== 'ok') { box.replaceChildren(PT.el('p', 'pt-note', '—')); return; }
    const sem = [...new Set(g.data.map((r) => r.semana))];
    const parcial = new Set(g.data.filter((r) => r.parcial).map((r) => r.semana));
    PT.bars(box, {cats: sem.map((s) => parcial.has(s) ? s + '*' : s), stacked: true, showTotal: true, integer: true,
      series: PT.DCS.map((dc) => ({name: dc, color: PT.cor(dc), vals: sem.map((s) => { const r = g.data.find((x) => x.semana === s && x.dc === dc); return r ? Number(r.lost) || 0 : 0; })})),
      yFmt: (v) => PT.fmt(v, 'int'), fade: (i) => parcial.has(sem[i]), aria: 'Pacotes lost por semana e DC', catTitle: (i) => 'Semana de ' + sem[i] + (parcial.has(sem[i]) ? ' (em andamento)' : '')});
  });
  dash.draw('lost-motivos-barras', (box) => {
    const g = dash.data('lost_motivos');
    if (g.status !== 'ok') { box.replaceChildren(PT.el('p', 'pt-note', '—')); return; }
    PT.hbars(box, g.data.map((r) => ({label: r.motivo, value: r.qtd, text: `${PT.fmt(r.qtd, 'int')} · ${PT.fmt(r.pct, 'pct')}`, mark: ['lost_motivos', 'qtd', 'motivo=' + PT.enc(r.motivo)]})));
  });
  dash.draw('lost-scan-barras', (box) => {
    const g = dash.data('lost_scan');
    if (g.status !== 'ok') { box.replaceChildren(PT.el('p', 'pt-note', '—')); return; }
    PT.hbars(box, g.data.map((r) => ({label: r.scan, value: r.qtd, text: `${PT.fmt(r.qtd, 'int')} · ${PT.fmt(r.pct, 'pct')}`, mark: ['lost_scan', 'qtd', 'scan=' + PT.enc(r.scan)]})), 'var(--pt-c2)');
  });
  dash.draw('lost-dc-sel', (sel) => {
    sel.replaceChildren(new Option('Todos', ''), ...PT.DCS.map((dc) => new Option(dc, dc)));
    sel.value = dash.params().lost_dc || '';
    sel.onchange = () => dash.setParams({lost_dc: sel.value || null});
  });
  const lista = () => { const g = dash.data('lost_pacotes'); if (g.status !== 'ok') return null; const f = dash.params().lost_dc; return g.data.filter((x) => !f || x.dc === f); };
  dash.draw('lost-lista-info', (p) => {
    const d = lista(); if (!d) { p.textContent = '—'; return; }
    p.textContent = `Os 20 de maior valor entre ${PT.fmt(d.length, 'int')} pacotes extraviados no período (${PT.fmt(d3.sum(d, (x) => x.valor), 'brl')} no total).`;
  });
  dash.draw('lost-linhas', (tb) => {
    const d = lista(); if (!d) { tb.replaceChildren(); return; }
    const top = [...d].sort((a, b) => (b.valor || 0) - (a.valor || 0)).slice(0, 20);
    PT.rows(tb, top, [{f: 'waybill'}, {f: 'dc'}, {txt: (r) => PT.dData(r.data)}, {f: 'valor', fmt: 'brl', cls: 'num'}, {f: 'motivo', cls: 'wrap'}, {f: 'ultimo_scan'}, {f: 'cliente', cls: 'muted'}], (r) => r.waybill);
  });
})();
