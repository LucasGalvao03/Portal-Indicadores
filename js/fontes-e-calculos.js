/* ---------- mês operacional: da 1ª terça do mês até a véspera da 1ª terça do mês seguinte ---------- */
window.PORTAL_MES = (() => {
  const S = (d) => d.toISOString().slice(0, 10);
  const primeiraTerca = (ano, mes) => { const d = new Date(Date.UTC(ano, mes, 1)); while (d.getUTCDay() !== 2) d.setUTCDate(d.getUTCDate() + 1); return S(d); };
  const ini = (ultimo) => { // início do mês operacional que contém a data
    const a = +ultimo.slice(0, 4), m = +ultimo.slice(5, 7) - 1, t = primeiraTerca(a, m);
    return ultimo >= t ? t : primeiraTerca(m === 0 ? a - 1 : a, m === 0 ? 11 : m - 1);
  };
  const temDado = (r) => ['recebido_off', 'recebidos_scan', 'recebidos_erro', 'volume_hc', 'rotas'].some((k) => Number(r[k]) > 0);
  // linhas do mês operacional mais recente (os dados guardam o histórico de vários meses)
  const filtra = (rows) => {
    const datas = rows.filter((r) => r.data && (temDado(r) || r.recebido != null || r.consolidado != null)).map((r) => r.data).sort();
    if (!datas.length) return rows;
    const i = ini(datas[datas.length - 1]);
    return rows.filter((r) => r.data >= i);
  };
  return {ini, filtra, temDado};
})();

/* ---------- loaders: cada fonte é uma tabela do arquivo portal_dados.json ---------- */
dash.loader('resumo', {description: 'Pega a tabela "resumo" do arquivo.', fn: ({answer}) => ({data: answer.tables.resumo, columns: Object.keys(answer.tables.resumo[0] || {}), meta: answer.meta})});
dash.loader('diario', {description: 'Pega a tabela "diario" do arquivo.', fn: ({answer}) => ({data: answer.tables.diario, columns: Object.keys(answer.tables.diario[0] || {}), meta: answer.meta})});
dash.loader('ranking', {description: 'Pega a tabela "ranking" do arquivo.', fn: ({answer}) => ({data: answer.tables.ranking, columns: Object.keys(answer.tables.ranking[0] || {}), meta: answer.meta})});
dash.loader('ranking_total', {description: 'Pega a tabela "ranking_total" do arquivo.', fn: ({answer}) => ({data: answer.tables.ranking_total, columns: Object.keys(answer.tables.ranking_total[0] || {}), meta: answer.meta})});
dash.loader('consolidacao_hora', {description: 'Pega a tabela "consolidacao_hora" do arquivo.', fn: ({answer}) => ({data: answer.tables.consolidacao_hora, columns: Object.keys(answer.tables.consolidacao_hora[0] || {}), meta: answer.meta})});
dash.loader('notracking', {description: 'Pega a tabela "notracking" do arquivo.', fn: ({answer}) => ({data: answer.tables.notracking, columns: Object.keys(answer.tables.notracking[0] || {}), meta: answer.meta})});
dash.loader('erro_lista', {description: 'Pega a tabela "erro_lista" do arquivo.', fn: ({answer}) => ({data: answer.tables.erro_lista, columns: Object.keys(answer.tables.erro_lista[0] || {}), meta: answer.meta})});
dash.loader('lost_dc', {description: 'Pega a tabela "lost_dc" do arquivo.', fn: ({answer}) => ({data: answer.tables.lost_dc, columns: Object.keys(answer.tables.lost_dc[0] || {}), meta: answer.meta})});
dash.loader('lost_semanal', {description: 'Pega a tabela "lost_semanal" do arquivo.', fn: ({answer}) => ({data: answer.tables.lost_semanal, columns: Object.keys(answer.tables.lost_semanal[0] || {}), meta: answer.meta})});
dash.loader('lost_motivos', {description: 'Pega a tabela "lost_motivos" do arquivo.', fn: ({answer}) => ({data: answer.tables.lost_motivos, columns: Object.keys(answer.tables.lost_motivos[0] || {}), meta: answer.meta})});
dash.loader('lost_scan', {description: 'Pega a tabela "lost_scan" do arquivo.', fn: ({answer}) => ({data: answer.tables.lost_scan, columns: Object.keys(answer.tables.lost_scan[0] || {}), meta: answer.meta})});
if (0) dash.loader('lost_pacotes', {description: 'Pega a tabela "lost_pacotes" do arquivo.', fn: ({answer}) => ({data: answer.tables.lost_pacotes, columns: Object.keys(answer.tables.lost_pacotes[0] || {}), meta: answer.meta})});
dash.loader('sacas_semana', {description: 'Pega a tabela "sacas_semana" do arquivo.', fn: ({answer}) => ({data: answer.tables.sacas_semana, columns: Object.keys(answer.tables.sacas_semana[0] || {}), meta: answer.meta})});
dash.loader('sacas_ds', {description: 'Pega a tabela "sacas_ds" do arquivo.', fn: ({answer}) => ({data: answer.tables.sacas_ds, columns: Object.keys(answer.tables.sacas_ds[0] || {}), meta: answer.meta})});

/* ---------- OffLoading ao vivo: abas Resumo_Portal do Google Sheets ---------- */
dash.loader('off_rec', {description: 'Transforma a aba Resumo_Portal (Data, DC, Recebido) em linhas, com a data em AAAA-MM-DD.', fn: ({answer}) => {
  const v = (answer && answer.values) || [];
  const iso = (t) => { const p = String(t).split('/'); return p.length === 3 ? `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}` : String(t); };
  return {data: v.slice(1).filter((x) => x[0] && x[1]).map((x) => ({data: iso(x[0]), dc: x[1], recebido: Number(x[2]) || 0})), columns: ['data', 'dc', 'recebido']};
}});
dash.loader('off_con', {description: 'Transforma a aba Resumo_Portal (Data, DC, Consolidado) em linhas, com a data em AAAA-MM-DD.', fn: ({answer}) => {
  const v = (answer && answer.values) || [];
  const iso = (t) => { const p = String(t).split('/'); return p.length === 3 ? `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}` : String(t); };
  return {data: v.slice(1).filter((x) => x[0] && x[1]).map((x) => ({data: iso(x[0]), dc: x[1], consolidado: Number(x[2]) || 0})), columns: ['data', 'dc', 'consolidado']};
}});
dash.calc('off_diario', {
  inputs: ['off_rec', 'off_con'],
  title: 'Taxa de consolidação por dia e DC',
  description: 'Junta recebido e consolidado por dia e DC (só DC-PI2, DC-CE1 e DC-PI3) e calcula consolidado ÷ recebido.',
  fn: (off_rec, off_con) => {
    const DCS = ['DC-PI2', 'DC-CE1', 'DC-PI3'];
    const m = new Map();
    for (const x of off_rec) { if (!DCS.includes(x.dc)) continue; const k = x.data + '|' + x.dc; m.set(k, {...(m.get(k) || {chave: k, data: x.data, dc: x.dc, recebido_off: 0, consolidado: 0}), recebido_off: x.recebido}); }
    for (const x of off_con) { if (!DCS.includes(x.dc)) continue; const k = x.data + '|' + x.dc; m.set(k, {...(m.get(k) || {chave: k, data: x.data, dc: x.dc, recebido_off: 0, consolidado: 0}), consolidado: x.consolidado}); }
    return window.PORTAL_MES.filtra([...m.values()].map((r) => ({...r, taxa_consolidacao: r.recebido_off ? r.consolidado / r.recebido_off : null})).sort((a, b) => a.data.localeCompare(b.data)));
  },
});
dash.calc('off_total', {
  inputs: ['off_diario'],
  title: 'OffLoading acumulado por DC',
  description: 'Soma recebido e consolidado dos dias com recebimento e calcula a taxa do período.',
  fn: (off_diario) => ['DC-PI2', 'DC-CE1', 'DC-PI3'].map((dc) => {
    const r = off_diario.filter((x) => x.dc === dc && x.recebido_off > 0);
    const rec = r.reduce((s, x) => s + x.recebido_off, 0), con = r.reduce((s, x) => s + x.consolidado, 0);
    return {dc, recebido_off: rec, consolidado: con, taxa_consolidacao: rec ? con / rec : null};
  }),
});

/* ---------- cálculos ---------- */
dash.calc('diario_total', {
  inputs: ['diario'],
  title: 'Acumulado do mês por DC',
  description: 'Soma os dias do mês operacional por DC e calcula as taxas (consolidação, No Scan, erro de triagem, produtividade e % de rotas atrasadas).',
  fn: (diario) => ['DC-PI2', 'DC-CE1', 'DC-PI3'].map((dc) => {
    const r = window.PORTAL_MES.filtra(diario).filter((x) => x.dc === dc);
    const soma = (rows, f) => rows.reduce((s, x) => s + (Number(x[f]) || 0), 0);
    const off = r.filter((x) => x.recebido_off != null);
    const scan = r.filter((x) => x.recebidos_scan != null);
    const err = r.filter((x) => x.recebidos_erro != null);
    const hc = r.filter((x) => Number(x.volume_hc) > 0 && Number(x.pessoas) > 0);
    const pont = r.filter((x) => x.rotas != null);
    const t = {
      dc,
      recebido_off: soma(off, 'recebido_off'), consolidado: soma(off, 'consolidado'),
      recebidos_scan: soma(scan, 'recebidos_scan'), sem_registro: soma(scan, 'sem_registro'),
      recebidos_erro: soma(err, 'recebidos_erro'), erros: soma(err, 'erros'),
      volume_hc: soma(hc, 'volume_hc'), pessoas: soma(hc, 'pessoas'), dias_hc: hc.length,
      rotas: soma(pont, 'rotas'), no_prazo: soma(pont, 'no_prazo'), atrasadas: soma(pont, 'atrasadas'),
    };
    t.taxa_consolidacao = t.recebido_off ? t.consolidado / t.recebido_off : null;
    t.taxa_noscan = t.recebidos_scan ? t.sem_registro / t.recebidos_scan : null;
    t.taxa_erro = t.recebidos_erro ? t.erros / t.recebidos_erro : null;
    t.produtividade = t.pessoas ? t.volume_hc / t.pessoas : null;
    t.pct_atraso = t.rotas ? t.atrasadas / t.rotas : null;
    return t;
  }),
});

dash.calc('resumo_contagem', {
  inputs: ['resumo'],
  title: 'Resultados por status, por semana',
  description: 'Conta, em cada semana, quantos resultados bateram o desafio, ficaram dentro da meta ou ficaram fora.',
  fn: (resumo) => {
    const m = new Map();
    for (const x of resumo) {
      const s = m.get(x.semana) || {semana: x.semana, desafio: 0, meta: 0, fora: 0, total: 0};
      if (x.status === 'Desafio atingido') s.desafio += 1;
      else if (x.status === 'Dentro da meta') s.meta += 1;
      else if (x.status === 'Fora da meta') s.fora += 1;
      if (x.status) s.total += 1;
      m.set(x.semana, s);
    }
    return [...m.values()].map((s) => ({...s, ok: s.desafio + s.meta}));
  },
});

dash.calc('nt_dc', {
  inputs: ['notracking'],
  title: 'No Tracking por DC e faixa',
  description: 'Conta os pacotes sem rastreio de cada DC por faixa de dias; "4+ dias" soma as faixas de 4 dias ou mais.',
  fn: (notracking) => ['DC-PI2', 'DC-CE1', 'DC-PI3'].map((dc) => {
    const r = notracking.filter((x) => x.dc === dc);
    const c = (f) => r.filter((x) => x.faixa === f).length;
    const t = {dc, f2_3: c('1. 2-3d'), f4_6: c('2. 4-6d'), f7_10: c('3. 7-10d'), f10: c('4. +10d'), total: r.length};
    t.mais4 = t.f4_6 + t.f7_10 + t.f10;
    return t;
  }),
});

dash.calc('erro_ds', {
  inputs: ['erro_lista'],
  title: 'Erros por DS que recebeu',
  description: 'Conta os pacotes com erro de triagem do último dia pela DS que recebeu o pacote por engano.',
  fn: (erro_lista) => {
    const m = new Map();
    for (const x of erro_lista) {
      const k = x.dc + '|' + x.ds_recebeu;
      const s = m.get(k) || {chave: k, dc: x.dc, ds: x.ds_recebeu, qtd: 0};
      s.qtd += 1;
      m.set(k, s);
    }
    return [...m.values()].sort((a, b) => b.qtd - a.qtd);
  },
});

dash.calc('sacas_esp', {
  inputs: ['sacas_ds'],
  title: 'Sacas por especialista e semana',
  description: 'Soma as sacas enviadas e devolvidas das DSs de cada especialista, por semana de envio.',
  fn: (sacas_ds) => {
    const m = new Map();
    for (const x of sacas_ds) {
      const k = x.ini + '|' + (x.especialista || 'Sem especialista');
      const s = m.get(k) || {chave: k, ini: x.ini, especialista: x.especialista || 'Sem especialista', dss: 0, enviadas: 0, devolvidas: 0};
      s.dss += 1; s.enviadas += Number(x.enviadas) || 0; s.devolvidas += Number(x.devolvidas) || 0;
      m.set(k, s);
    }
    return [...m.values()].map((s) => ({...s, saldo: s.enviadas - s.devolvidas, pct: s.enviadas ? s.devolvidas / s.enviadas : null}));
  },
});
