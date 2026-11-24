/* ---------- Visão geral ---------- */
(() => {
  const ORDEM = ['OffLoading', 'No Scan', 'No Tracking', 'Erro de Triagem', 'Eficiência HC', 'Pontualidade de Transporte'];
  const NOME = {'OffLoading': 'Taxa de consolidação', 'No Scan': 'No Scan', 'No Tracking': 'No Tracking 4+ dias', 'Erro de Triagem': 'Erro de Triagem', 'Eficiência HC': 'Pacotes por pessoa', 'Pontualidade de Transporte': 'Rotas atrasadas'};
  const semanaAtual = (rows) => (rows.find((x) => x.atual === 1) || rows[0] || {}).semana;
  const semanaSel = (rows) => dash.params().semana || semanaAtual(rows);
  const lab = (r) => `${PT.dData(r.semana)} a ${PT.dData(r.semana_fim)}`;

  dash.draw('semana-sel', (sel) => {
    const g = dash.data('resumo');
    const rows = g.status === 'ok' ? g.data : [];
    const sem = [...new Map(rows.map((r) => [r.semana, r])).values()].sort((a, b) => b.semana.localeCompare(a.semana));
    sel.replaceChildren(...sem.map((r) => new Option(lab(r) + (r.atual === 1 ? ' (atual)' : ''), r.semana)));
    sel.value = semanaSel(rows) || '';
    sel.onchange = () => dash.setParams({semana: sel.value});
  });

  dash.draw('lede', (p) => {
    const g = dash.data('resumo'), c = dash.data('resumo_contagem');
    if (g.status !== 'ok' || c.status !== 'ok') { p.textContent = '—'; return; }
    const sem = semanaAtual(g.data);
    const r0 = g.data.find((x) => x.semana === sem);
    const cnt = c.data.find((x) => x.semana === sem);
    const fora = g.data.filter((x) => x.semana === sem && x.status === 'Fora da meta');
    const b = (t, src, field, where) => { const e = PT.el('b', '', t); if (src) PT.mark(e, src, field, where); return e; };
    const parts = [document.createTextNode('Semana operacional de '), b(lab(r0)), document.createTextNode(': '),
      b(PT.fmt(cnt.ok, 'int'), 'resumo_contagem', 'ok', 'semana=' + sem), document.createTextNode(' de '),
      b(PT.fmt(cnt.total, 'int'), 'resumo_contagem', 'total', 'semana=' + sem), document.createTextNode(' resultados dentro da meta ou do desafio.')];
    if (fora.length) {
      parts.push(document.createTextNode(' Fora da meta: '));
      fora.forEach((x, i) => { parts.push(b(`${x.dc} em ${NOME[x.indicador] || x.indicador}`)); parts.push(document.createTextNode(i < fora.length - 1 ? ', ' : '.')); });
    }
    p.replaceChildren(...parts);
  });

  dash.draw('visao-contagem', (p) => {
    const g = dash.data('resumo'), c = dash.data('resumo_contagem');
    if (g.status !== 'ok' || c.status !== 'ok') { p.textContent = '—'; return; }
    const sem = semanaSel(g.data);
    const cnt = c.data.find((x) => x.semana === sem);
    if (!cnt) { p.textContent = '—'; return; }
    const n = (f) => PT.mark(PT.el('b', '', PT.fmt(cnt[f], 'int')), 'resumo_contagem', f, 'semana=' + sem);
    p.replaceChildren(n('desafio'), document.createTextNode(' bateram o desafio · '), n('meta'), document.createTextNode(' dentro da meta · '), n('fora'), document.createTextNode(' fora da meta'));
  });

  dash.draw('visao-grid', (box) => {
    const g = dash.data('resumo');
    if (g.status !== 'ok') { box.replaceChildren(PT.el('div', 'small', '—')); return; }
    const sem = semanaSel(g.data);
    const rows = g.data.filter((x) => x.semana === sem);
    const cells = [PT.el('div', 'h', 'Indicador'), ...PT.DCS.map((dc) => { const d = PT.el('div', 'h'); const s = PT.el('span', 'pt-dc'); const i = PT.el('i'); i.style.background = PT.cor(dc); s.append(i, document.createTextNode(dc)); d.append(s); return d; })];
    for (const ind of ORDEM) {
      const any = rows.find((x) => x.indicador === ind);
      if (!any) continue;
      const head = PT.el('div');
      head.append(PT.el('span', 'ind', NOME[ind] || ind));
      head.append(PT.el('span', 'small', ind === 'No Tracking' ? 'pedidos parados · menor é melhor' : any.melhor === 'maior' ? 'maior é melhor' : 'menor é melhor'));
      cells.push(head);
      for (const dc of PT.DCS) {
        const r = rows.find((x) => x.indicador === ind && x.dc === dc);
        const d = PT.el('div', 'cell' + (r && r.status === 'Fora da meta' ? ' fora' : ''));
        if (!r) { d.append(PT.el('span', 'small', '—')); cells.push(d); continue; }
        const where = 'chave=' + PT.enc(r.chave);
        d.append(PT.mark(PT.el('span', 'val', PT.fmt(r.resultado, r.formato)), 'resumo', 'resultado', where));
        d.append(PT.pill(r.status));
        const sinal = r.melhor === 'maior' ? '≥ ' : '≤ ';
        const m = PT.el('span', 'small');
        m.append(document.createTextNode('Meta ' + sinal), PT.mark(PT.el('span', '', PT.fmt(r.meta, r.formato)), 'resumo', 'meta', where));
        d.append(m);
        if (r.evolucao) {
          const ev = PT.el('span', 'small', r.evolucao + ' vs semana anterior');
          d.append(ev);
        }
        cells.push(d);
      }
    }
    box.replaceChildren(...cells);
  });

  dash.draw('visao-plano', (box) => {
    const g = dash.data('resumo');
    if (g.status !== 'ok') { box.replaceChildren(PT.el('p', 'pt-note', '—')); return; }
    const sem = semanaSel(g.data);
    const rows = g.data.filter((x) => x.semana === sem && x.status === 'Fora da meta');
    if (!rows.length) { box.replaceChildren(PT.el('p', 'pt-note', 'Nenhum indicador fora da meta nesta semana.')); return; }
    box.replaceChildren(...rows.map((r) => {
      const it = PT.el('div', 'pt-plan-item');
      const top = PT.el('div', 'top');
      top.append(PT.el('span', '', `${NOME[r.indicador] || r.indicador} · ${r.dc}`), PT.el('span', 'pt-note', PT.fmt(r.resultado, r.formato) + ' (meta ' + PT.fmt(r.meta, r.formato) + ')'));
      it.append(top);
      const linha = (rot, txt) => { const p = PT.el('p'); p.append(PT.el('span', '', rot + ': '), document.createTextNode(txt)); return p; };
      if (r.explicacao) it.append(linha('Por que aconteceu', r.explicacao));
      if (r.solucao) it.append(linha('Plano de ação', r.solucao));
      if (r.responsavel) it.append(linha('Responsável', r.responsavel));
      if (!r.explicacao && !r.solucao) it.append(PT.el('p', 'pt-note', 'Explicação e plano ainda não preenchidos.'));
      return it;
    }));
  });
})();
