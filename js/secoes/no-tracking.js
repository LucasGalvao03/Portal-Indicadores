/* ---------- No Tracking ---------- */
(() => {
  const FAIXAS = [['f2_3', '2–3 dias'], ['f4_6', '4–6 dias'], ['f7_10', '7–10 dias'], ['f10', '+10 dias']];
  const corF = (i) => ['var(--cds-chart-muted)', 'var(--pt-c2)', '#E07B00', 'var(--cds-chart-status-critical)'][i];
  const MAIS4 = ['2. 4-6d', '3. 7-10d', '4. +10d'];
  dash.draw('nt-ref', (p) => {
    const g = dash.data('notracking');
    p.textContent = g.status === 'ok' && g.data.length ? `Posição de ${PT.dDataAno(g.data[0].data_ref)}` : '—';
  });
  dash.draw('nt-legenda', (box) => {
    box.replaceChildren(...PT.legend(FAIXAS.map(([, n], i) => ({name: n, color: corF(i)})), true).children);
  });
  dash.draw('nt-stack', (box) => {
    const g = dash.data('nt_dc');
    if (g.status !== 'ok') { box.replaceChildren(); return; }
    const r = g.data.find((x) => x.dc === box.dataset.dc);
    if (!r || !r.total) { box.replaceChildren(); return; }
    box.replaceChildren(...FAIXAS.map(([f, n], i) => { const d = PT.el('div'); d.style.width = (100 * r[f] / r.total) + '%'; d.style.background = corF(i); d.title = `${n}: ${r[f]}`; return d; }));
  });
  const mais4 = () => { const g = dash.data('notracking'); return g.status === 'ok' ? g.data.filter((x) => MAIS4.includes(x.faixa)) : null; };
  dash.draw('nt-status-barras', (box) => {
    const d = mais4(); if (!d) { box.replaceChildren(PT.el('p', 'pt-note', '—')); return; }
    const c = d3.rollups(d, (v) => v.length, (x) => x.status || '—').sort((a, b) => b[1] - a[1]);
    PT.hbars(box, c.map(([k, v]) => ({label: k, value: v, text: `${PT.fmt(v, 'int')} · ${PT.fmt(v / d.length, 'pct')}`})));
  });
  dash.draw('nt-ds-barras', (box) => {
    const d = mais4(); if (!d) { box.replaceChildren(PT.el('p', 'pt-note', '—')); return; }
    const c = d3.rollups(d, (v) => v.length, (x) => x.ds || '—', (x) => x.dc).flatMap(([ds, arr]) => arr.map(([dc, n]) => [ds, dc, n])).sort((a, b) => b[2] - a[2]).slice(0, 10);
    PT.hbars(box, c.map(([ds, dc, n]) => ({label: `${ds} · ${dc}`, value: n, text: PT.fmt(n, 'int'), color: PT.cor(dc)})));
  });
  dash.draw('nt-dc-sel', (sel) => {
    sel.replaceChildren(new Option('Todos', ''), ...PT.DCS.map((dc) => new Option(dc, dc)));
    sel.value = dash.params().nt_dc || '';
    sel.onchange = () => dash.setParams({nt_dc: sel.value || null});
  });
  const lista = () => { const d = mais4(); if (!d) return null; const f = dash.params().nt_dc; return d.filter((x) => !f || x.dc === f).sort((a, b) => b.dias - a.dias); };
  dash.draw('nt-lista-info', (p) => {
    const d = lista(); if (!d) { p.textContent = '—'; return; }
    p.textContent = `${PT.fmt(d.length, 'int')} pacotes · ${PT.fmt(d3.sum(d, (x) => x.valor), 'brl')} em valor declarado · ordenados pelos dias sem rastreio.`;
  });
  dash.draw('nt-linhas', (tb) => {
    const d = lista(); if (!d) { tb.replaceChildren(); return; }
    PT.rows(tb, d, [{f: 'etiqueta'}, {f: 'dc'}, {f: 'dias', fmt: 'int', cls: 'num'}, {f: 'status'}, {f: 'ds'}, {f: 'ultima_leitura', cls: 'muted'}, {f: 'valor', fmt: 'brl', cls: 'num'}], (r) => r.etiqueta);
  });
})();
