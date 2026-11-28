/* ---------- Controle de Sacas no layout do Excel (Devolução DS → DC) ---------- */
(() => {
  const DCS = ['DC-PI2', 'DC-PI3', 'DC-CE1'];
  const el = (t, c, x) => PT.el(t, c, x);
  const ISO = (d) => d.toISOString().slice(0, 10);
  const soma = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return ISO(t); };
  const dm = (d) => d.slice(8, 10) + '/' + d.slice(5, 7);
  const rotulo = (ini) => { // S46 (10/11 a 16/11), igual ao Excel
    const D = new Date(ini + 'T00:00:00Z'), ref = new Date(Date.UTC(D.getUTCFullYear(), 0, 1));
    ref.setUTCDate(ref.getUTCDate() - ((ref.getUTCDay() - 2 + 7) % 7));
    return `S${String(Math.floor((D - ref) / 864e5 / 7) + 1).padStart(2, '0')} (${dm(ini)} a ${dm(soma(ini, 6))})`;
  };
  // Enviadas da S44 (27/10 a 02/11): o banco só tem as bases de carregamento de novembro, então os
  // totais por DC vêm do Excel (ajuste manual). Entram nos totais por DC, não nas listas por DS.
  const MANUAL = {'2026-10-27': {'DC-PI2': 2160, 'DC-PI3': 328, 'DC-CE1': 981}};
  let semana = null, meta = 0, visao = 'painel', dcDet = 'Todos', mostrar = 'todas', espDet = 'Todos';

  const tot = (rows) => { const env = d3.sum(rows, (r) => r.env), dev = d3.sum(rows, (r) => r.dev); return {env, dev, pct: env ? dev / env : null, saldo: env - dev}; };
  const corPct = (p) => (p == null ? '' : p >= (meta || 1) ? 'pt-good' : 'pt-bad'); // sem meta definida: verde só com tudo devolvido
  // soma as semanas do período por DS (no modo semana o período tem uma semana só)
  const agrega = (S, P) => [...d3.group(S.filter((r) => P.includes(r.ini) && !r.manual), (r) => r.dc + '|' + r.ds).values()].map((v) => ({
    dc: v[0].dc, ds: v[0].ds, esp: (v.find((r) => r.esp) || {}).esp || '', env: d3.sum(v, (r) => r.env), dev: d3.sum(v, (r) => r.dev),
    ult: d3.max(v, (r) => r.ult) || '', lanc: d3.sum(v, (r) => r.lanc || 0)}));
  const statusDe = (r) => (r.dev <= 0 ? ['Sem devolução', 'sd-sem'] : r.dev < r.env ? ['Parcial', 'sd-parc'] : ['Completa', 'sd-ok']);

  function painel(S, ini, P) {
    const isTot = ini === 'TOTAL', ant = isTot ? null : soma(ini, -7);
    const out = el('div', 'sd-painel');
    // por DC
    const dcs = el('div', 'sd-dcs');
    DCS.forEach((dc) => {
      const a = tot(S.filter((r) => P.includes(r.ini) && r.dc === dc)), b = tot(S.filter((r) => r.ini === ant && r.dc === dc));
      const ult = d3.max(S.filter((r) => r.dc === dc && r.ult), (r) => r.ult);
      const p = el('div', 'sd-dc');
      p.append(el('div', 'sd-dc-h', `${dc}  ·  Últ. lançamento: ${ult ? dm(ult) : '—'}`));
      const g = el('div', 'sd-k');
      const v = (d, txt) => el('div', 'pd-var ' + (d > 0 ? 'pt-good' : d < 0 ? 'pt-bad' : ''), `${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${txt}`);
      const k = (t, val, sub, cls) => { const x = el('div', 'pd-kpi'); x.append(el('div', 'pd-kpi-h', t), el('div', 'pd-kpi-v grande ' + (cls || ''), val), sub); return x; };
      const dp = a.pct != null && b.pct != null ? (a.pct - b.pct) * 100 : null;
      const per = () => el('div', 'pd-var', '— total do período');
      g.append(
        k('Sacas enviadas', PT.fmt(a.env, 'int'), isTot ? per() : v(a.env - b.env, `${PT.fmt(Math.abs(a.env - b.env), 'int')} vs sem. ant.`)),
        k('Sacas devolvidas', PT.fmt(a.dev, 'int'), isTot ? per() : v(a.dev - b.dev, `${PT.fmt(Math.abs(a.dev - b.dev), 'int')} vs sem. ant.`)),
        k('% Devolução', a.pct == null ? '—' : PT.fmt(a.pct, 'pct0'), isTot ? per() : dp == null ? el('div', 'pd-var', '') : v(dp, `${PT.fmt(Math.abs(dp), 'dec1')} p.p. vs sem. ant.`), corPct(a.pct)),
        k('Saldo a devolver', PT.fmt(a.saldo, 'int'), el('div', 'pd-var', a.saldo > 0 ? 'faltam voltar' : a.saldo < 0 ? 'devolvidas a mais' : 'tudo devolvido'), a.saldo > 0 ? 'pt-bad' : 'pt-good'),
      );
      p.append(g);
      dcs.append(p);
    });
    // histórico semanal por DC
    const hist = el('div', 'sd-dcs');
    const semanas = [...new Set(S.map((r) => r.ini))].sort().reverse().slice(0, 6);
    DCS.forEach((dc) => {
      const c = el('div', 'sd-hist');
      const t = el('table', 'sd-tbl');
      t.innerHTML = `<thead><tr><th colspan="4" class="sd-th-dc">${dc}</th></tr><tr><th>Semana de envio</th><th class="num">Enviadas</th><th class="num">Devolvidas</th><th class="num">% Dev.</th></tr></thead>`;
      const tb = el('tbody', '');
      semanas.forEach((s) => {
        const a = tot(S.filter((r) => r.ini === s && r.dc === dc));
        const tr = el('tr', P.includes(s) ? 'sd-sel' : '');
        tr.append(el('td', '', rotulo(s)), el('td', 'num', PT.fmt(a.env, 'int')), el('td', 'num', PT.fmt(a.dev, 'int')), el('td', 'num b ' + corPct(a.pct), a.pct == null ? '—' : PT.fmt(a.pct, 'pct0')));
        tb.append(tr);
      });
      t.append(tb); c.append(t); hist.append(c);
    });
    // por especialista e DSs sem devolução
    const sem = agrega(S, P);
    const porEsp = [...d3.group(sem, (r) => r.esp || '(sem especialista)')].map(([esp, v]) => ({esp, dss: v.length, semDev: v.filter((r) => r.dev <= 0 && r.env > 0).length, ...tot(v)}))
      .sort((a, b) => b.saldo - a.saldo).slice(0, 15);
    const te = el('table', 'sd-tbl');
    te.innerHTML = '<thead><tr><th colspan="7" class="sd-th-dc">Especialistas · ordenado pelo maior saldo a devolver</th></tr><tr><th>Especialista</th><th class="num">DSs</th><th class="num">DSs sem dev.</th><th class="num">Enviadas</th><th class="num">Devolvidas</th><th class="num">% Dev.</th><th class="num">Saldo</th></tr></thead>';
    const tbe = el('tbody', '');
    porEsp.forEach((r) => {
      const tr = el('tr', '');
      tr.append(el('td', 'b', r.esp), el('td', 'num', String(r.dss)), el('td', 'num pt-bad', String(r.semDev)), el('td', 'num', PT.fmt(r.env, 'int')), el('td', 'num', PT.fmt(r.dev, 'int')),
        el('td', 'num b ' + corPct(r.pct), r.pct == null ? '—' : PT.fmt(r.pct, 'pct0')), el('td', 'num b ' + (r.saldo > 0 ? 'pt-bad' : 'pt-good'), PT.fmt(r.saldo, 'int')));
      tbe.append(tr);
    });
    te.append(tbe);
    const semDev = sem.filter((r) => r.dev <= 0 && r.env > 0).sort((a, b) => b.env - a.env);
    const ts = el('table', 'sd-tbl sd-semdev');
    ts.innerHTML = `<thead><tr><th colspan="4" class="sd-th-red">DSs sem nenhuma devolução · ${semDev.length}</th></tr><tr><th>DS</th><th>Especialista</th><th class="num">Enviadas</th><th>DC</th></tr></thead>`;
    const tbs = el('tbody', '');
    semDev.slice(0, 15).forEach((r) => { const tr = el('tr', ''); tr.append(el('td', 'b', r.ds), el('td', 'sd-esp', r.esp || '—'), el('td', 'num', PT.fmt(r.env, 'int')), el('td', '', r.dc)); tbs.append(tr); });
    ts.append(tbs);
    const espRow = el('div', 'sd-esp-row');
    const w1 = el('div', 'pt-card'); w1.append(el('h3', '', `Por especialista — quem está com sacas para devolver ${isTot ? 'no período' : 'na semana escolhida'} (todos os DCs)`), te);
    const w2 = el('div', 'pt-card'); w2.append(el('h3', '', 'DSs sem devolução'), ts);
    espRow.append(w1, w2);
    out.append(el('h3', 'lo-sec', 'Por DC  ·  ▲▼ vs. semana anterior  ·  Devolvidas = sacas lançadas na semana seguinte ao envio'), dcs,
      el('h3', 'lo-sec', 'Histórico semanal  ·  semana de envio (terça a segunda) × sacas lançadas na semana seguinte'), hist, espRow,
      el('p', 'pt-note', `Mostrando até 15 especialistas e 15 DSs. ${porEsp.length} especialistas e ${semDev.length} DSs sem devolução ${isTot ? 'no período' : 'na semana'}. Lista completa em "Detalhe por DS".`));
    return out;
  }

  function detalhe(S, P) {
    let rows = agrega(S, P);
    const esps = [...new Set(rows.map((r) => r.esp || '(sem especialista)'))].sort();
    if (dcDet !== 'Todos') rows = rows.filter((r) => r.dc === dcDet);
    if (espDet !== 'Todos') rows = rows.filter((r) => (r.esp || '(sem especialista)') === espDet);
    if (mostrar !== 'todas') rows = rows.filter((r) => statusDe(r)[1] === mostrar);
    rows = [...rows].sort((a, b) => (b.env - b.dev) - (a.env - a.dev) || b.env - a.env);
    const t = tot(rows);
    const out = el('div', 'sd-det');
    const ctl = el('div', 'pt-controls pd-filtros2');
    const sel = (rot, ops, val, set) => { const l = el('label', '', rot + ' '); const s = el('select', 'dash-select'); ops.forEach(([v, tx]) => { const o = el('option', '', tx); o.value = v; if (v === val) o.selected = true; s.append(o); }); s.addEventListener('change', () => { set(s.value); dash.render(); }); l.append(s); return l; };
    ctl.append(sel('DC', [['Todos', 'Todos'], ...DCS.map((d) => [d, d])], dcDet, (v) => { dcDet = v; }),
      sel('Mostrar', [['todas', 'Todas as DSs'], ['sd-sem', 'Sem devolução'], ['sd-parc', 'Parcial'], ['sd-ok', 'Completa']], mostrar, (v) => { mostrar = v; }),
      sel('Especialista', [['Todos', 'Todos'], ...esps.map((e) => [e, e])], espDet, (v) => { espDet = v; }));
    out.append(ctl, el('p', 'pd-info', `${rows.length} DSs  ·  ${PT.fmt(t.env, 'int')} enviadas  ·  ${PT.fmt(t.dev, 'int')} devolvidas  ·  saldo ${PT.fmt(t.saldo, 'int')}`));
    const tb = el('table', 'sd-tbl');
    tb.innerHTML = '<thead><tr><th>#</th><th>DC</th><th>DS</th><th>Especialista</th><th class="num">Sacas enviadas</th><th class="num">Sacas devolvidas</th><th class="num">Saldo</th><th class="num">% Devolução</th><th>Status</th><th>Últ. lançamento</th><th class="num">Lançamentos</th></tr></thead>';
    const b = el('tbody', '');
    rows.forEach((r, i) => {
      const p = r.env ? r.dev / r.env : null, st = statusDe(r), tr = el('tr', '');
      tr.append(el('td', '', String(i + 1)), el('td', '', r.dc), el('td', 'b', r.ds), el('td', 'sd-esp', r.esp || '—'), el('td', 'num', PT.fmt(r.env, 'int')), el('td', 'num', PT.fmt(r.dev, 'int')),
        el('td', 'num b ' + (r.env - r.dev > 0 ? 'pt-bad' : 'pt-good'), PT.fmt(r.env - r.dev, 'int')), el('td', 'num ' + corPct(p), p == null ? '—' : PT.fmt(p, 'pct0')),
        el('td', 'sd-st ' + st[1], st[0]), el('td', '', r.ult ? r.ult.split('-').reverse().join('/') : ''), el('td', 'num', String(r.lanc || 0)));
      b.append(tr);
    });
    tb.append(b);
    const w = el('div', 'pt-tbl-wrap'); w.append(tb);
    const c = el('div', 'pt-card'); c.append(w);
    out.append(c);
    return out;
  }

  dash.draw('sacas-painel', (box) => {
    const S = (window.PORTAL_SACAS || []).filter((r) => DCS.includes(r.dc));
    Object.entries(MANUAL).forEach(([ini, porDc]) => Object.entries(porDc).forEach(([dc, env]) => {
      if (!S.some((r) => r.ini === ini && r.dc === dc && r.env > 0)) S.push({ini, dc, ds: '(total do Excel)', env, dev: 0, esp: '', lanc: 0, ult: '', manual: true});
    }));
    if (!S.length) { box.replaceChildren(el('p', 'pt-note', dash.data('diario').status === 'ok' ? 'Sem dados das sacas.' : 'Carregando…')); return; }
    const semanas = [...new Set(S.filter((r) => r.env > 0).map((r) => r.ini))].sort().reverse();
    // padrão: a semana de envio cuja janela de devolução está em andamento (a anterior à última)
    const hoje = ISO(new Date());
    // Total: semanas cuja janela de devolução já abriu (a semana atual ainda não tem devolução)
    const aberta = semanas.filter((s) => soma(s, 7) <= hoje).sort();
    const periodo = aberta.length ? aberta : [...semanas].sort();
    const ini = semana === 'TOTAL' ? 'TOTAL' : semanas.includes(semana) ? semana : (semanas[1] || semanas[0]);
    const P = ini === 'TOTAL' ? periodo : [ini];
    const ult = d3.max(S.filter((r) => r.ult), (r) => r.ult);

    const ctl = el('div', 'pt-controls');
    const ls = el('label', '', 'Semana de envio '); const ss = el('select', 'dash-select');
    [['TOTAL', 'Total (todas as semanas)'], ...semanas.map((s) => [s, rotulo(s)])].forEach(([s, t]) => { const o = el('option', '', t); o.value = s; if (s === ini) o.selected = true; ss.append(o); });
    ss.addEventListener('change', () => { semana = ss.value; dash.render(); });
    ls.append(ss);
    const lm = el('label', '', 'Meta devolução (%) '); const im = el('input', 'dash-select pd-num'); im.type = 'number'; im.min = 0; im.max = 100; im.value = Math.round(meta * 100);
    im.addEventListener('change', () => { meta = Math.max(0, Number(im.value) || 0) / 100; dash.render(); });
    lm.append(im);
    const seg = el('div', 'pt-seg');
    [['painel', 'Painel'], ['detalhe', 'Detalhe por DS']].forEach(([v, t]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(visao === v)); b.addEventListener('click', () => { visao = v; dash.render(); }); seg.append(b); });
    ctl.append(ls, lm, seg);
    const bBase = el('button', 'nt-baixar', '⬇ Baixar base'); bBase.type = 'button';
    bBase.addEventListener('click', () => PT.baixaCSV('sacas_base.csv', ['Semana', 'DC', 'DS', 'Especialista', 'Enviadas', 'Devolvidas'],
      S.filter((r) => P.includes(r.ini) && !r.manual).map((r) => [rotulo(r.ini), r.dc, r.ds, r.esp || '', r.env || 0, r.dev || 0])));
    ctl.append(bBase);
    const pIni = P[0], pFim = P[P.length - 1], jIni = soma(pIni, 7), jFim = soma(pFim, 13);
    const envio = ini === 'TOTAL' ? `Total ${rotulo(pIni).slice(0, 3)} a ${rotulo(pFim).slice(0, 3)} (${dm(pIni)} a ${dm(soma(pFim, 6))})` : rotulo(ini);
    const sit = ini === 'TOTAL' ? ' (acumulado)' : hoje <= jFim ? ' (em andamento)' : '';
    const info = el('p', 'pd-info', `Envio: ${envio}  →  Janela de devolução: ${dm(jIni)} a ${dm(jFim)}${sit}  ·  Último lançamento: ${ult ? dm(ult) : '—'}`);
    box.replaceChildren(ctl, info, visao === 'detalhe' ? detalhe(S, P) : painel(S, ini, P));
  });
})();
