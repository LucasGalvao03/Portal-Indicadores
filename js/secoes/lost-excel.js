/* ---------- Lost / Extravio no layout do Excel (Monitoramento dos DCs — Nordeste II) ---------- */
(() => {
  const DCS = ['DC-PI2', 'DC-PI3', 'DC-CE1'];
  const COR = {'DC-PI2': '#2f55d4', 'DC-PI3': '#f39c12', 'DC-CE1': '#16a37f'};
  const el = (t, c, x) => PT.el(t, c, x);
  const ISO = (d) => d.toISOString().slice(0, 10);
  const soma = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return ISO(t); };
  const terca = (d) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 5) % 7)); return ISO(t); };
  const br = (d) => d.split('-').reverse().join('/');
  const dm = (d) => d.slice(8, 10) + '/' + d.slice(5, 7);
  const brl = (v) => PT.fmt(v || 0, 'brl');
  let ini = null, fim = null, dcSel = 'Todos', perModo = 'faixa'; // 'faixa' = De/Até · 'datas' = vários dias avulsos
  const perSt = PERIODO.estado();

  const cnt = (R, de, ate, dc) => R.filter((r) => r.data >= de && r.data <= ate && (!dc || r.dc === dc));
  const qtd = (rows) => d3.sum(rows, (r) => r.n), val = (rows) => d3.sum(rows, (r) => r.valor);
  const varia = (a, b) => { if (!b) return el('span', '', '—'); const p = (a - b) / b; return el('span', p > 0 ? 'pt-bad' : p < 0 ? 'pt-good' : '', `${p > 0 ? '▲' : p < 0 ? '▼' : '='} ${PT.fmt(Math.abs(p), 'pct0')}`); };

  function tabelaBarras(titulo, linhas, total) {
    const c = el('div', 'pt-card');
    c.append(el('h3', '', titulo));
    const t = el('table', 'lo-tbl');
    t.innerHTML = '<thead><tr><th>Descrição</th><th class="num">Qtd</th><th class="num">%</th></tr></thead>';
    const tb = el('tbody', ''), mx = d3.max(linhas, (l) => l[1]) || 1;
    linhas.forEach(([d, n]) => {
      const tr = el('tr', ''), b = el('td', 'lo-barra'); const s = el('span', ''); s.style.width = `${Math.round((n / mx) * 100)}%`; b.append(s, el('b', '', PT.fmt(n, 'int')));
      tr.append(el('td', '', d), b, el('td', 'num', PT.fmt(total ? n / total : 0, 'pct')));
      tb.append(tr);
    });
    t.append(tb); c.append(t);
    return c;
  }

  function linhaSemanal(box, semanas, S) {
    box.replaceChildren();
    const W = Math.max(300, box.clientWidth || 600), H = 230, ml = 34, mr = 16, mt = 22, mb = 26;
    const x = d3.scalePoint().domain(semanas).range([ml, W - mr]).padding(0.3);
    const y = d3.scaleLinear().domain([0, (d3.max(semanas.flatMap((s) => DCS.map((dc) => S[s][dc]))) || 1) * 1.15]).nice().range([H - mb, mt]);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('height', H).attr('role', 'img').attr('aria-label', 'Lost por semana e DC');
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - ml - mr)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(5).tickSize(0)).call((g) => g.select('.domain').remove());
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - mb})`).call(d3.axisBottom(x).tickFormat(dm).tickSizeOuter(0));
    DCS.forEach((dc) => {
      const pts = semanas.map((s) => ({s, v: S[s][dc]}));
      svg.append('path').datum(pts).attr('fill', 'none').style('stroke', COR[dc]).attr('stroke-width', 2.4).attr('d', d3.line().x((p) => x(p.s)).y((p) => y(p.v)));
      svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', (p) => x(p.s)).attr('cy', (p) => y(p.v)).attr('r', 3.5).style('fill', COR[dc]);
      svg.append('g').selectAll('text').data(pts).join('text').attr('class', 'off-rot').attr('x', (p) => x(p.s)).attr('y', (p) => y(p.v) - 7).attr('text-anchor', 'middle').style('fill', 'var(--color-fg)').text((p) => p.v);
    });
    box.prepend(PT.legend(DCS.map((dc) => ({name: dc, color: COR[dc]}))));
  }

  function baixar(lista, de, ate) {
    const cab = ['Waybill', 'DC', 'Data', 'Valor R$', 'Motivo', 'Último scan', 'Obs'];
    const linhas = lista.map((r) => [r.waybill ? `="${r.waybill}"` : '', r.dc, br(r.data), String((r.valor || 0).toFixed(2)).replace('.', ','), r.motivo, r.scan, r.obs]);
    const q = (v) => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const csv = '﻿' + [cab, ...linhas].map((l) => l.map(q).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    a.download = `lost_${de}_a_${ate}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  dash.draw('lost-painel', (box) => {
    const L = window.PORTAL_LOST;
    if (!L) { box.replaceChildren(el('p', 'pt-note', dash.data('diario').status === 'ok' ? 'Sem dados do Lost.' : 'Carregando…')); return; }
    const R = L.resumo.filter((r) => DCS.includes(r.dc));
    const datas = [...new Set(R.map((r) => r.data))].sort();
    if (!datas.length) { box.replaceChildren(el('p', 'pt-note', 'Sem dados.')); return; }
    const ultima = datas[datas.length - 1];
    let de = ini || window.PORTAL_MES.ini(ultima), ate = fim || ultima;
    if (de > ate) [de, ate] = [ate, de];
    if (perModo === 'datas') { const rr = PERIODO.deAte('datas', datas, perSt); de = rr.de; ate = rr.ate; }
    const cobre = perModo === 'datas' ? (d) => perSt.dias.has(d) : (d) => d >= de && d <= ate;
    const dcs = dcSel === 'Todos' ? DCS : [dcSel];
    const F = (rows) => rows.filter((r) => dcs.includes(r.dc));
    const per = F(R.filter((r) => cobre(r.data)));
    const total = qtd(per), valor = val(per);
    const dias = perModo === 'datas' ? (perSt.dias.size || 1) : Math.round((Date.parse(ate) - Date.parse(de)) / 864e5) + 1;
    const semAtual = terca(ultima), semFech = soma(semAtual, -7), semAnt = soma(semAtual, -14);
    const nSemFech = qtd(F(cnt(R, semFech, soma(semFech, 6)))), nSemAnt = qtd(F(cnt(R, semAnt, soma(semAnt, 6)))), nAtual = qtd(F(cnt(R, semAtual, ultima)));
    const lista = L.lista ? L.lista.filter((r) => dcs.includes(r.dc) && cobre(r.data)) : null;

    // filtros
    const ctl = el('div', 'hc-filtros');
    const sDc = el('select', 'dash-select'); ['Todos', ...DCS].forEach((d) => { const o = el('option', '', d); o.value = d; if (d === dcSel) o.selected = true; sDc.append(o); });
    sDc.addEventListener('change', () => { dcSel = sDc.value; dash.render(); });
    const campo = (rot, v, set) => { const l = el('label', 'hc-data'); const i = el('input', 'dash-select'); i.type = 'date'; i.value = v; i.min = datas[0]; i.max = ultima; i.addEventListener('change', () => { if (i.value) { set(i.value); dash.render(); } }); l.append(el('span', '', rot), i); return l; };
    const ldc = el('label', 'hc-data'); ldc.append(el('span', '', 'DC'), sDc);
    const at = el('div', 'pt-seg');
    [['Mês', window.PORTAL_MES.ini(ultima), ultima], ['Semana atual', semAtual, ultima], ['Última semana fechada', semFech, soma(semFech, 6)]].forEach(([t, a, b]) => {
      const bt = el('button', '', t); bt.type = 'button'; bt.setAttribute('aria-pressed', String(a === de && b === ate)); bt.addEventListener('click', () => { ini = a; fim = b; dash.render(); }); at.append(bt);
    });
    const bx = el('button', 'nt-baixar', lista ? `⬇ Baixar base (${PT.fmt(lista.length, 'int')} pacotes)` : '⬇ Baixar base (carregando…)');
    bx.type = 'button'; bx.disabled = !lista;
    bx.addEventListener('click', () => lista && baixar(lista, de, ate));
    const modoSeg = el('div', 'pt-seg');
    [['faixa', 'Intervalo'], ['datas', 'Datas']].forEach(([v, t]) => {
      const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(perModo === v));
      b.addEventListener('click', () => { perModo = v; dash.render(); }); modoSeg.append(b);
    });
    ctl.append(ldc, modoSeg);
    if (perModo === 'datas') ctl.append(PERIODO.painel('datas', datas, perSt, () => dash.render()));
    else ctl.append(campo('Data inicial', de, (v) => { ini = v; }), campo('Data final', ate, (v) => { fim = v; }), at);
    ctl.append(bx);
    const info = el('p', 'pd-info', `Em andamento: ${dm(semAtual)}–${dm(soma(semAtual, 6))}  ·  Última fechada: ${dm(semFech)}–${dm(soma(semFech, 6))}`);

    // cartões do topo
    const top = el('div', 'lo-top');
    const card = (t, v, s, cor, extra) => { const c = el('div', 'lo-card'); c.style.setProperty('--cor', cor); c.append(el('div', 'lo-card-h', t), el('div', 'lo-card-v ' + (extra || ''), v), el('div', 'lo-card-s', s)); return c; };
    const vari = nSemAnt ? (nSemFech - nSemAnt) / nSemAnt : null;
    top.append(
      card('Pacotes lost no período', PT.fmt(total, 'int'), `${PT.fmt(total / dias, 'dec1')} lost por dia em média`, '#1f3a93'),
      card('Valor declarado perdido', brl(valor), `Valor médio por pacote: ${brl(total ? valor / total : 0)}`, '#e67e22'),
      card('Última semana fechada (ter–seg)', PT.fmt(nSemFech, 'int'), `Anterior: ${PT.fmt(nSemAnt, 'int')}  ·  Em andamento: ${PT.fmt(nAtual, 'int')}`, '#16a37f'),
      card('Variação', vari == null ? '—' : `${vari > 0 ? '▲' : vari < 0 ? '▼' : '='} ${PT.fmt(Math.abs(vari), 'pct0')}`, 'vs semana anterior', '#9aa5b1', vari > 0 ? 'pt-bad' : vari < 0 ? 'pt-good' : ''),
    );

    // por DC
    const g = dash.data('off_todos'), rec = g.status === 'ok' ? g.data : [];
    const porDc = el('div', 'lo-dcs');
    dcs.forEach((dc) => {
      const r = R.filter((x) => cobre(x.data) && x.dc === dc), n = qtd(r), v = val(r);
      const recebido = d3.sum(rec.filter((x) => x.dc === dc && cobre(x.data)), (x) => x.recebido_off || 0);
      const f1 = qtd(cnt(R, semFech, soma(semFech, 6), dc)), f0 = qtd(cnt(R, semAnt, soma(semAnt, 6), dc));
      const p = el('div', 'lo-dc'); p.style.setProperty('--cor', COR[dc]);
      const grid = el('div', 'lo-dc-g');
      const item = (t, v, cls) => { const i = el('div', 'lo-dc-i'); i.append(el('div', 'lo-dc-ih', t), v instanceof Node ? v : el('div', 'lo-dc-iv ' + (cls || ''), v)); return i; };
      const vv = el('div', 'lo-dc-iv'); vv.append(varia(f1, f0));
      grid.append(item('Pacotes Lost', PT.fmt(n, 'int'), 'grande'), item('Recebido', PT.fmt(recebido, 'int'), 'medio'),
        item('Valor declarado', brl(v)), item('Taxa de extravio', PT.fmt(recebido ? n / recebido : 0, 'pct2')),
        item('Última semana fechada', PT.fmt(f1, 'int')), item('Δ vs anterior', vv));
      p.append(el('div', 'lo-dc-h', dc), grid);
      porDc.append(p);
    });

    // evolução semanal (8 semanas)
    const semanas = [...Array(8)].map((_, i) => soma(semAtual, -7 * (7 - i)));
    const S = {}; semanas.forEach((s) => { S[s] = {}; DCS.forEach((dc) => { S[s][dc] = qtd(cnt(R, s, soma(s, 6), dc)); }); });
    const ev = el('div', 'lo-ev');
    const te = el('table', 'lo-tbl lo-sem');
    te.innerHTML = `<thead><tr><th>Semana</th>${DCS.map((d) => `<th>${d}</th>`).join('')}<th class="num">Total</th></tr></thead>`;
    const tbe = el('tbody', ''), mxS = d3.max(semanas.flatMap((s) => DCS.map((dc) => S[s][dc]))) || 1;
    semanas.forEach((s) => {
      const tr = el('tr', ''); tr.append(el('td', '', dm(s) + (s === semAtual ? ' *' : '')));
      DCS.forEach((dc) => { const b = el('td', 'lo-barra'); const sp = el('span', ''); sp.style.width = `${Math.round((S[s][dc] / mxS) * 100)}%`; sp.style.background = `color-mix(in srgb, ${COR[dc]} 45%, transparent)`; b.append(sp, el('b', '', String(S[s][dc]))); tr.append(b); });
      tr.append(el('td', 'num b', PT.fmt(d3.sum(DCS, (dc) => S[s][dc]), 'int')));
      tbe.append(tr);
    });
    te.append(tbe);
    const cT = el('div', 'pt-card'); cT.append(el('h3', '', 'Evolução semanal — últimas 8 semanas (todos os DCs)'), te, el('p', 'pt-note', '* semana em andamento'));
    const cG = el('div', 'pt-card'), gl = el('div', 'pt-chart'); cG.append(el('h3', '', 'Lost por semana e DC'), gl);
    ev.append(cT, cG);

    // motivos e último scan
    const agrupa = (campo) => [...d3.rollup(per, (v) => qtd(v), (r) => r[campo])].sort((a, b) => b[1] - a[1]);
    const ms = el('div', 'pt-grid2');
    ms.append(tabelaBarras('Motivos do Lost (Lost request reason)', agrupa('motivo'), total), tabelaBarras('Onde o pacote foi visto por último (Last Scan Type)', agrupa('scan'), total));

    // últimos extraviados
    const ult = el('div', 'pt-card');
    ult.append(el('h3', '', 'Últimos pacotes extraviados — 15 mais recentes'));
    if (!lista) ult.append(el('p', 'pt-note', 'A lista de pacotes ainda está carregando (ou o script ainda não gravou a aba Lost_Lista).'));
    else {
      const tl = el('table', 'lo-tbl');
      tl.innerHTML = '<thead><tr><th>Waybill</th><th>DC</th><th>Data</th><th class="num">Valor</th><th>Motivo</th><th>Último scan</th><th>Obs</th></tr></thead>';
      const tbl = el('tbody', '');
      [...lista].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 15).forEach((r) => {
        const tr = el('tr', ''); tr.append(el('td', 'b', r.waybill), el('td', '', r.dc), el('td', '', br(r.data)), el('td', 'num', brl(r.valor)), el('td', '', r.motivo), el('td', '', r.scan), el('td', 'pd-vid', r.obs || '—'));
        tbl.append(tr);
      });
      tl.append(tbl);
      const w = el('div', 'pt-tbl-wrap'); w.append(tl); ult.append(w);
    }

    box.replaceChildren(ctl, info, top, el('h3', 'lo-sec', `Por DC — ${br(de)} a ${br(ate)}`), porDc, ev, ms, ult);
    requestAnimationFrame(() => linhaSemanal(gl, semanas, S));
  });
})();
