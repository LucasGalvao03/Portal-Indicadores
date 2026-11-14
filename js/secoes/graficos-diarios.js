/* ---------- Gráficos diários (OffLoading, No Scan, Erro, HC, Pontualidade) ---------- */
(() => {
  const serie = (rows, campo, extra) => PT.DCS.map((dc) => ({
    name: dc, color: PT.cor(dc),
    pts: rows.filter((r) => r.dc === dc && r[campo] != null).map((r) => ({x: PT.parse(r.data), y: Number(r[campo]), extra: extra ? extra(r) : null})).sort((a, b) => a.x - b.x),
  }));
  const pronto = (box) => { const g = dash.data('diario'); if (g.status !== 'ok') { box.replaceChildren(PT.el('p', 'pt-note', g.status === 'error' ? 'Falha ao carregar.' : '—')); return null; } return window.PORTAL_MES.filtra(g.data); };
  const tot = () => { const t = dash.data('diario_total'); return t.status === 'ok' ? t.data : null; };
  const dcCell = (r) => { const s = PT.el('span', 'pt-dc'); const i = PT.el('i'); i.style.background = PT.cor(r.dc); s.append(i, document.createTextNode(r.dc)); return s; };
  const pctCell = (f, fmt, meta, maior) => (r) => { const s = PT.el('span', r[f] == null ? '' : ((maior ? r[f] >= meta : r[f] <= meta) ? 'pt-good' : 'pt-bad'), PT.fmt(r[f], fmt)); return s; };

  dash.draw('off-linha', (box) => {
    const g = dash.data('off_diario');
    if (g.status !== 'ok') { box.replaceChildren(PT.el('p', 'pt-note', g.status === 'error' ? 'Falha ao carregar.' : '—')); return; }
    const d = g.data;
    PT.line(box, {series: serie(d, 'taxa_consolidacao', (r) => `${PT.fmt(r.consolidado, 'int')} de ${PT.fmt(r.recebido_off, 'int')}`), yFmt: (v) => PT.fmt(v, 'pct'),
      refs: [{y: 0.8, label: 'Meta 80%'}, {y: 0.9, label: 'Desafio 90%'}], aria: 'Taxa de consolidação diária por DC'});
  });
  dash.draw('off-linhas', (tb) => {
    const g = dash.data('off_total'); const t = g.status === 'ok' ? g.data : null; if (!t) { tb.replaceChildren(); return; }
    PT.rows(tb, t, [{node: dcCell}, {f: 'recebido_off', fmt: 'int', cls: 'num'}, {f: 'consolidado', fmt: 'int', cls: 'num'}, {node: pctCell('taxa_consolidacao', 'pct', 0.8, true), cls: 'num'}], (r) => r.dc);
  });
  dash.draw('off-hora-dia', (p) => {
    const g = dash.data('consolidacao_hora');
    p.textContent = g.status === 'ok' && g.data.length ? `Dia ${PT.dDataAno(g.data[0].data)} · Nordeste II` : '—';
  });
  dash.draw('off-hora-barras', (box) => {
    const g = dash.data('consolidacao_hora');
    if (g.status !== 'ok') { box.replaceChildren(PT.el('p', 'pt-note', '—')); return; }
    const d = g.data;
    PT.bars(box, {cats: d.map((r) => r.hora.slice(0, 2) + 'h'), series: [
      {name: 'Recebido', color: 'var(--pt-c1)', vals: d.map((r) => Number(r.recebido) || 0)},
      {name: 'Consolidado', color: 'var(--pt-c2)', vals: d.map((r) => Number(r.consolidado) || 0)},
    ], yFmt: (v) => PT.fmt(v, 'int'), aria: 'Recebido e consolidado por hora', catTitle: (i) => d[i].hora});
  });

  dash.draw('noscan-linha', (box) => {
    const d = pronto(box); if (!d) return;
    PT.line(box, {series: serie(d, 'taxa_noscan', (r) => `${PT.fmt(r.sem_registro, 'int')} sem registro`), yFmt: (v) => PT.fmt(v, 'pct2'),
      refs: [{y: 0.01, label: 'Meta 1%'}, {y: 0.007, label: 'Desafio 0,7%'}], aria: 'Taxa de No Scan diária por DC'});
  });
  dash.draw('noscan-linhas', (tb) => {
    const t = tot(); if (!t) { tb.replaceChildren(); return; }
    PT.rows(tb, t, [{node: dcCell}, {f: 'recebidos_scan', fmt: 'int', cls: 'num'}, {f: 'sem_registro', fmt: 'int', cls: 'num'}, {node: pctCell('taxa_noscan', 'pct2', 0.01, false), cls: 'num'}], (r) => r.dc);
  });

  const CLIP_ERRO = 0.005;
  dash.draw('erro-linha', (box) => {
    const d = pronto(box); if (!d) return;
    PT.line(box, {series: serie(d, 'taxa_erro', (r) => `${PT.fmt(r.erros, 'int')} erros de ${PT.fmt(r.recebidos_erro, 'int')}`), yFmt: (v) => PT.fmt(v, 'pct2'),
      refs: [{y: 0.001, label: 'Meta 0,1%'}, {y: 0.0004, label: 'Desafio 0,04%'}], clip: CLIP_ERRO, aria: 'Taxa de erro de triagem diária por DC'});
  });
  dash.draw('erro-nota', (p) => {
    const g = dash.data('diario');
    if (g.status !== 'ok') { p.textContent = '—'; return; }
    const acima = g.data.filter((r) => r.taxa_erro != null && r.taxa_erro > CLIP_ERRO);
    p.hidden = !acima.length;
    p.textContent = acima.length ? 'Dias acima de ' + PT.fmt(CLIP_ERRO, 'pct2') + ' aparecem como ▲ no topo do gráfico: ' + acima.map((r) => `${r.dc} em ${PT.dData(r.data)} (${PT.fmt(r.taxa_erro, 'pct2')}, ${PT.fmt(r.erros, 'int')} erro(s) em ${PT.fmt(r.recebidos_erro, 'int')} recebidos)`).join('; ') + '.' : '';
  });
  dash.draw('erro-linhas', (tb) => {
    const t = tot(); if (!t) { tb.replaceChildren(); return; }
    PT.rows(tb, t, [{node: dcCell}, {f: 'recebidos_erro', fmt: 'int', cls: 'num'}, {f: 'erros', fmt: 'int', cls: 'num'}, {node: pctCell('taxa_erro', 'pct3', 0.001, false), cls: 'num'}], (r) => r.dc);
  });
  dash.draw('erro-ds-dia', (p) => {
    const g = dash.data('erro_lista');
    p.textContent = g.status === 'ok' && g.data.length ? `DSs que receberam pacotes por engano em ${PT.dDataAno(g.data[0].data)}.` : '—';
  });
  dash.draw('erro-ds-barras', (box) => {
    const g = dash.data('erro_ds');
    if (g.status !== 'ok') { box.replaceChildren(PT.el('p', 'pt-note', '—')); return; }
    PT.hbars(box, g.data.slice(0, 10).map((r) => ({label: `${r.ds} · ${r.dc}`, value: r.qtd, text: PT.fmt(r.qtd, 'int'), color: PT.cor(r.dc), mark: ['erro_ds', 'qtd', 'chave=' + PT.enc(r.chave)]})));
  });
  dash.draw('erro-lista-linhas', (tb) => {
    const g = dash.data('erro_lista');
    if (g.status !== 'ok') { tb.replaceChildren(); return; }
    PT.rows(tb, g.data, [{f: 'waybill'}, {node: dcCell}, {f: 'ds_recebeu'}, {f: 'ds_destino'}], (r) => r.waybill);
  });

  const META_HC = {'DC-PI2': [800, 850], 'DC-CE1': [850, 900], 'DC-PI3': [850, 900]};
  dash.draw('hc-linha', (box) => {
    const d = pronto(box); if (!d) return;
    const rows = d.filter((r) => Number(r.volume_hc) > 0 && Number(r.pessoas) > 0);
    PT.line(box, {series: serie(rows, 'produtividade', (r) => `${PT.fmt(r.volume_hc, 'int')} pacotes · ${PT.fmt(r.pessoas, 'int')} pessoas`), yFmt: (v) => PT.fmt(v, 'int'),
      refs: [{y: 800, label: 'Meta PI2 800'}, {y: 850, label: 'Meta CE1/PI3 850'}], aria: 'Pacotes por pessoa por dia e DC'});
  });
  dash.draw('hc-linhas', (tb) => {
    const t = tot(); if (!t) { tb.replaceChildren(); return; }
    PT.rows(tb, t, [{node: dcCell}, {f: 'volume_hc', fmt: 'int', cls: 'num'}, {f: 'dias_hc', fmt: 'int', cls: 'num'}, {f: 'pessoas', fmt: 'int', cls: 'num'},
      {node: (r) => pctCell('produtividade', 'int', META_HC[r.dc][0], true)(r), cls: 'num'},
      {txt: (r) => `${META_HC[r.dc][0]} · desafio ${META_HC[r.dc][1]}`, cls: 'muted'}], (r) => r.dc);
  });

  dash.draw('pont-barras', (box) => {
    const d = pronto(box); if (!d) return;
    const rows = d.filter((r) => r.rotas != null);
    const datas = [...new Set(rows.map((r) => r.data))].sort();
    PT.bars(box, {cats: datas.map(PT.dData), series: PT.DCS.map((dc) => ({name: dc, color: PT.cor(dc), vals: datas.map((dt) => { const r = rows.find((x) => x.data === dt && x.dc === dc); return r ? Number(r.atrasadas) || 0 : 0; })})),
      yFmt: (v) => PT.fmt(v, 'int'), integer: true, aria: 'Rotas atrasadas por dia e DC', catTitle: (i) => PT.dDataAno(datas[i])});
  });
  dash.draw('pont-linhas', (tb) => {
    const t = tot(); if (!t) { tb.replaceChildren(); return; }
    PT.rows(tb, t, [{node: dcCell}, {f: 'rotas', fmt: 'int', cls: 'num'}, {f: 'no_prazo', fmt: 'int', cls: 'num'}, {f: 'atrasadas', fmt: 'int', cls: 'num'}, {node: pctCell('pct_atraso', 'pct', 0.07, false), cls: 'num'}], (r) => r.dc);
  });
})();
