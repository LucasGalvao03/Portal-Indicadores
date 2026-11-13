/* ---------- Controle de Sacas ---------- */
(() => {
  const padrao = (rows) => { const s = [...rows].sort((a, b) => b.ini.localeCompare(a.ini)).find((r) => r.devolvidas > 0); return s ? s.ini : (rows[0] || {}).ini; };
  const sel = (rows) => dash.params().sacas_sem || padrao(rows);
  dash.draw('sacas-sel', (s) => {
    const g = dash.data('sacas_semana');
    const rows = g.status === 'ok' ? g.data : [];
    const sem = [...new Map(rows.map((r) => [r.ini, r])).values()].sort((a, b) => b.ini.localeCompare(a.ini));
    s.replaceChildren(...sem.map((r) => new Option(r.semana, r.ini)));
    s.value = sel(rows) || '';
    s.onchange = () => dash.setParams({sacas_sem: s.value});
  });
  dash.draw('sacas-cards', (box) => {
    const g = dash.data('sacas_semana');
    if (g.status !== 'ok') { box.replaceChildren(PT.el('p', 'pt-note', '—')); return; }
    const ini = sel(g.data);
    box.replaceChildren(...PT.DCS.map((dc) => {
      const r = g.data.find((x) => x.ini === ini && x.dc === dc);
      const c = PT.el('div', 'pt-card'); c.id = 'sacas-' + dc;
      const h = PT.el('span', 'pt-dc'); const i = PT.el('i'); i.style.background = PT.cor(dc); h.append(i, document.createTextNode(dc)); c.append(h);
      if (!r) { c.append(PT.el('p', 'pt-note', 'Sem envios nesta semana.')); return c; }
      const where = 'chave=' + PT.enc(r.chave);
      const big = PT.el('div', 'pt-big'); big.append(PT.mark(PT.el('span', r.pct >= 1 ? 'pt-good' : r.pct < 0.8 ? 'pt-bad' : '', PT.fmt(r.pct, 'pct')), 'sacas_semana', 'pct', where));
      c.append(big, PT.el('p', 'pt-sub', 'das sacas devolvidas'));
      const k = PT.el('div', 'pt-kpis');
      const kpi = (lab, f) => { const d = PT.el('div', 'pt-kpi'); d.append(PT.el('span', '', lab), PT.mark(PT.el('b', '', PT.fmt(r[f], 'int')), 'sacas_semana', f, where)); return d; };
      k.append(kpi('Enviadas', 'enviadas'), kpi('Devolvidas', 'devolvidas'), kpi('Saldo a devolver', 'saldo'), kpi('DSs sem devolução', 'dss_sem_dev'));
      c.append(k);
      return c;
    }));
  });
  dash.draw('sacas-hist-linhas', (tb) => {
    const g = dash.data('sacas_semana');
    if (g.status !== 'ok') { tb.replaceChildren(); return; }
    const d = [...g.data].sort((a, b) => b.ini.localeCompare(a.ini) || PT.DCS.indexOf(a.dc) - PT.DCS.indexOf(b.dc));
    PT.rows(tb, d, [{f: 'semana'}, {f: 'dc'}, {f: 'enviadas', fmt: 'int', cls: 'num'}, {f: 'devolvidas', fmt: 'int', cls: 'num'}, {f: 'pct', fmt: 'pct', cls: 'num'}, {f: 'saldo', fmt: 'int', cls: 'num'}, {f: 'dss_sem_dev', fmt: 'int', cls: 'num'}], (r) => r.chave);
  });
  dash.draw('sacas-esp-linhas', (tb) => {
    const g = dash.data('sacas_esp'), s = dash.data('sacas_semana');
    if (g.status !== 'ok' || s.status !== 'ok') { tb.replaceChildren(); return; }
    const ini = sel(s.data);
    const d = g.data.filter((x) => x.ini === ini).sort((a, b) => b.saldo - a.saldo);
    PT.rows(tb, d, [{f: 'especialista'}, {f: 'dss', fmt: 'int', cls: 'num'}, {f: 'enviadas', fmt: 'int', cls: 'num'}, {f: 'devolvidas', fmt: 'int', cls: 'num'}, {f: 'pct', fmt: 'pct', cls: 'num'}, {f: 'saldo', fmt: 'int', cls: 'num'}], (r) => r.chave);
  });
  dash.draw('sacas-ds-linhas', (tb) => {
    const g = dash.data('sacas_ds'), s = dash.data('sacas_semana');
    if (g.status !== 'ok' || s.status !== 'ok') { tb.replaceChildren(); return; }
    const ini = sel(s.data);
    const d = g.data.filter((x) => x.ini === ini && x.enviadas > 0 && !x.devolvidas).sort((a, b) => b.enviadas - a.enviadas).slice(0, 15);
    PT.rows(tb, d, [{f: 'ds'}, {f: 'dc'}, {f: 'enviadas', fmt: 'int', cls: 'num'}], (r) => r.chave);
  });
})();
