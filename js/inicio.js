(async () => {
  const SNAP = window.DADOS_NOVEMBRO;
  const F = window.PORTAL_FONTES || {};
  const st = dash._state, L = dash._loaders;
  window.PORTAL_ORIGEM = {};
  const valoresDoSnapshot = (id) => {
    const campo = id === 'off_rec' ? ['recebido_off', 'Recebido'] : ['consolidado', 'Consolidado'];
    const br = (iso) => iso.split('-').reverse().join('/');
    return [['Data', 'DC', campo[1]], ...SNAP.tables.diario.filter((r) => r[campo[0]] != null).map((r) => [br(r.data), r.dc, String(r[campo[0]])])];
  };
  await Promise.all(Object.keys(L).map(async (id) => {
    try {
      let answer;
      if (id === 'off_rec' || id === 'off_con') {
        if (F[id]) {
          try {
            const t = await (await fetch(F[id], {cache: 'no-store'})).text();
            answer = {values: d3.csvParseRows(t)};
            PORTAL_ORIGEM[id] = 'sheets';
          } catch (e) { console.warn('Sheets indisponível para', id, e); }
        }
        if (!answer) { answer = {values: valoresDoSnapshot(id)}; PORTAL_ORIGEM[id] = 'novembro'; }
      } else answer = SNAP;
      const r = L[id].fn({answer});
      st[id] = {status: 'ok', data: Array.isArray(r) ? r : r.data};
    } catch (e) { console.error(id, e); st[id] = {status: 'error', data: []}; }
  }));

  // --- OffLoading ao vivo também no diário (Visão geral, Ranking e Lost usam o diário) ---
  if (PORTAL_ORIGEM.off_rec === 'sheets' && PORTAL_ORIGEM.off_con === 'sheets') {
    const rows = (st.diario && st.diario.data) || [];
    const idx = new Map(rows.map((r) => [r.data + '|' + r.dc, r]));
    rows.forEach((r) => { r.recebido_off = null; r.consolidado = null; r.taxa_consolidacao = null; });
    const linhaD = (data, dc) => { let r = idx.get(data + '|' + dc); if (!r) { r = {data, dc, chave: data + '|' + dc}; rows.push(r); idx.set(r.chave, r); } return r; };
    for (const x of st.off_rec.data || []) { if (/^DC-/.test(x.dc)) { const r = linhaD(x.data, x.dc); r.recebido_off = (r.recebido_off || 0) + x.recebido; if (r.consolidado == null) r.consolidado = 0; } }
    for (const x of st.off_con.data || []) { if (/^DC-/.test(x.dc)) { const r = linhaD(x.data, x.dc); r.consolidado = (r.consolidado || 0) + x.consolidado; } }
    rows.forEach((r) => { r.taxa_consolidacao = r.recebido_off ? r.consolidado / r.recebido_off : null; });
    rows.sort((a, b) => a.data.localeCompare(b.data));
    st.diario = {status: 'ok', data: rows};
  }

  // --- datas do Sheets: 2026/11/1, 01/11/2026, 2026-11-01 ou número serial ---
  const iso = (v) => {
    const t = String(v || '').trim();
    if (/^\d{5}(\.\d+)?$/.test(t)) { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(t)) * 864e5); return d.toISOString().slice(0, 10); }
    let m = t.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return t;
  };
  const lerCSV = async (url) => d3.csvParse(await (await fetch(url, {cache: 'no-store'})).text());

  // --- Eficiência HC ao vivo: troca volume/pessoas do diário ---
  if (F.hc) {
    try {
      const hc = (await lerCSV(F.hc)).map((r) => ({data: iso(r.Data), dc: r.DC, volume_hc: Number(r.Volume) || 0, pessoas: Number(r.Pessoas) || 0}));
      const ult = hc.filter((r) => r.volume_hc > 0).map((r) => r.data).sort().pop();
      if (ult) {
        const d0 = new Date(ult.slice(0, 8) + '01T00:00:00Z');
        while (d0.getUTCDay() !== 2) d0.setUTCDate(d0.getUTCDate() + 1); // 1ª terça do mês
        const ini = d0.toISOString().slice(0, 10);
        const rows = (st.diario && st.diario.data) || [];
        const idx = new Map(rows.map((r) => [r.data + '|' + r.dc, r]));
        rows.forEach((r) => { r.volume_hc = null; r.pessoas = null; r.produtividade = null; });
        for (const h of hc) {
          if (h.data > ult) continue;
          let r = idx.get(h.data + '|' + h.dc);
          if (!r) { r = {data: h.data, dc: h.dc, chave: h.data + '|' + h.dc}; rows.push(r); idx.set(r.chave, r); }
          r.volume_hc = h.volume_hc; r.pessoas = h.pessoas; r.produtividade = h.pessoas ? h.volume_hc / h.pessoas : null;
        }
        rows.sort((a, b) => a.data.localeCompare(b.data));
        st.diario = {status: 'ok', data: rows};
        PORTAL_ORIGEM.hc = 'sheets';
      }
    } catch (e) { console.warn('Sheets indisponível para HC', e); }
  }

  // --- No Tracking ao vivo ---
  if (F.notracking) {
    try {
      const nt = (await lerCSV(F.notracking)).filter((r) => r.DC).map((r) => ({dc: r.DC, status: r.Status, faixa: r.Faixa, dias: Number(r.Dias), ds: r.DS, data_ref: iso(r.Data_Ref)}));
      st.notracking = {status: 'ok', data: nt};
      PORTAL_ORIGEM.notracking = 'sheets';
    } catch (e) { console.warn('Sheets indisponível para No Tracking', e); }
  }
  // --- Erro de Triagem ao vivo: erros (Resumo_Portal) ÷ recebidos (Taxas → Orders Loading), por dia e DC ---
  if (F.erro_erros && F.erro_receb) {
    try {
      const [er, rc] = await Promise.all([lerCSV(F.erro_erros), lerCSV(F.erro_receb)]);
      const erros = er.filter((r) => r.Data && r.DC).map((r) => ({data: iso(r.Data), dc: r.DC.trim(), ds_recebeu: r.DS_Recebeu, ds_destino: r.DS_Correta, n: Number(r.Erros) || 0}));
      const receb = rc.filter((r) => r.Data && /^DC-/.test((r.Station || '').trim())).map((r) => ({data: iso(r.Data), dc: r.Station.trim(), n: Number(String(r['Orders Loading'] || '').replace(/[.\s]/g, ''))})).filter((r) => r.n >= 0 && !Number.isNaN(r.n));
      const ult = [...erros.map((r) => r.data), ...receb.map((r) => r.data)].sort().pop();
      if (ult) {
        const d0 = new Date(ult.slice(0, 8) + '01T00:00:00Z');
        while (d0.getUTCDay() !== 2) d0.setUTCDate(d0.getUTCDate() + 1); // 1ª terça do mês
        const ini = d0.toISOString().slice(0, 10);
        const rows = (st.diario && st.diario.data) || [];
        const idx = new Map(rows.map((r) => [r.data + '|' + r.dc, r]));
        const linha = (data, dc) => { let r = idx.get(data + '|' + dc); if (!r) { r = {data, dc, chave: data + '|' + dc}; rows.push(r); idx.set(r.chave, r); } return r; };
        rows.forEach((r) => { r.erros = null; r.recebidos_erro = null; r.taxa_erro = null; });
        for (const x of receb) { if (x.data > ult) continue; const r = linha(x.data, x.dc); r.recebidos_erro = (r.recebidos_erro || 0) + x.n; if (r.erros == null) r.erros = 0; }
        for (const x of erros) { if (x.data > ult) continue; const r = linha(x.data, x.dc); r.erros = (r.erros || 0) + x.n; }
        rows.forEach((r) => { r.taxa_erro = r.erros != null && r.recebidos_erro ? r.erros / r.recebidos_erro : null; });
        rows.sort((a, b) => a.data.localeCompare(b.data));
        st.diario = {status: 'ok', data: rows};
        // lista do último dia com erro (só DSs, sem waybill)
        const diaLista = erros.map((r) => r.data).sort().pop();
        st.erro_lista = {status: 'ok', data: erros.filter((r) => r.data === diaLista).flatMap((r) => Array.from({length: r.n}, () => ({data: r.data, dc: r.dc, ds_recebeu: r.ds_recebeu, ds_destino: r.ds_destino})))};
        PORTAL_ORIGEM.erro = 'sheets';
      }
    } catch (e) { console.warn('Sheets indisponível para Erro de Triagem', e); }
  }
  // --- No Scan ao vivo: Resumo_Portal gerado pelo script (recebidos e sem registro por dia, DC e DS) ---
  if (F.noscan) {
    try {
      const ns = (await lerCSV(F.noscan)).filter((r) => r.Data && r.DC).map((r) => ({data: iso(r.Data), dc: r.DC.trim(), rec: Number(r.Recebidos) || 0, sem: Number(r.Sem_Registro) || 0}));
      const ult = ns.map((r) => r.data).sort().pop();
      if (ult) {
        const d0 = new Date(ult.slice(0, 8) + '01T00:00:00Z');
        while (d0.getUTCDay() !== 2) d0.setUTCDate(d0.getUTCDate() + 1); // 1ª terça do mês
        const ini = d0.toISOString().slice(0, 10);
        const rows = (st.diario && st.diario.data) || [];
        const idx = new Map(rows.map((r) => [r.data + '|' + r.dc, r]));
        rows.forEach((r) => { r.recebidos_scan = null; r.sem_registro = null; r.taxa_noscan = null; });
        for (const x of ns) {
          if (x.data > ult || !/^DC-/.test(x.dc)) continue;
          let r = idx.get(x.data + '|' + x.dc);
          if (!r) { r = {data: x.data, dc: x.dc, chave: x.data + '|' + x.dc}; rows.push(r); idx.set(r.chave, r); }
          r.recebidos_scan = (r.recebidos_scan || 0) + x.rec; r.sem_registro = (r.sem_registro || 0) + x.sem;
        }
        rows.forEach((r) => { r.taxa_noscan = r.recebidos_scan ? r.sem_registro / r.recebidos_scan : null; });
        rows.sort((a, b) => a.data.localeCompare(b.data));
        st.diario = {status: 'ok', data: rows};
        PORTAL_ORIGEM.noscan = 'sheets';
      }
    } catch (e) { console.warn('Sheets indisponível para No Scan', e); }
  }
  // --- Pontualidade de Transporte ao vivo: Resumo_Portal gerado pelo script (rotas, no prazo e atrasadas por dia e DC) ---
  if (F.pontualidade) {
    try {
      const pt = (await lerCSV(F.pontualidade)).filter((r) => r.Data && r.DC).map((r) => ({data: iso(r.Data), dc: r.DC.trim(), rotas: Number(r.Rotas) || 0, no_prazo: Number(r.No_Prazo) || 0, atrasadas: Number(r.Atrasadas) || 0}));
      const ult = pt.map((r) => r.data).sort().pop();
      if (ult) {
        const d0 = new Date(ult.slice(0, 8) + '01T00:00:00Z');
        while (d0.getUTCDay() !== 2) d0.setUTCDate(d0.getUTCDate() + 1); // 1ª terça do mês
        const ini = d0.toISOString().slice(0, 10);
        const rows = (st.diario && st.diario.data) || [];
        const idx = new Map(rows.map((r) => [r.data + '|' + r.dc, r]));
        rows.forEach((r) => { r.rotas = null; r.no_prazo = null; r.atrasadas = null; r.pct_atraso = null; });
        for (const x of pt) {
          if (x.data > ult) continue;
          let r = idx.get(x.data + '|' + x.dc);
          if (!r) { r = {data: x.data, dc: x.dc, chave: x.data + '|' + x.dc}; rows.push(r); idx.set(r.chave, r); }
          r.rotas = x.rotas; r.no_prazo = x.no_prazo; r.atrasadas = x.atrasadas; r.pct_atraso = x.rotas ? x.atrasadas / x.rotas : null;
        }
        rows.sort((a, b) => a.data.localeCompare(b.data));
        st.diario = {status: 'ok', data: rows};
        PORTAL_ORIGEM.pontualidade = 'sheets';
      }
    } catch (e) { console.warn('Sheets indisponível para Pontualidade', e); }
  }

  // --- Controle de Sacas ao vivo: Resumo_Sacas gerado pelo script (enviadas x devolvidas por semana de envio, DC e DS) ---
  if (F.sacas) {
    try {
      const sc = (await lerCSV(F.sacas)).filter((r) => r.Ini_Envio && r.DC).map((r) => ({ini: iso(r.Ini_Envio), dc: r.DC.trim(), ds: (r.DS || '').trim(), env: Number(r.Enviadas) || 0, dev: Number(r.Devolvidas) || 0}));
      const primeira = sc.filter((r) => r.env > 0).map((r) => r.ini).sort()[0];
      if (primeira) {
        const D = (x) => new Date(x + 'T00:00:00Z');
        const dm = (d) => d.toISOString().slice(8, 10) + '/' + d.toISOString().slice(5, 7);
        const rotulo = (ini) => { // S45 (03/11 a 09/11), igual ao Excel
          const ref = new Date(Date.UTC(D(ini).getUTCFullYear(), 0, 1)); ref.setUTCDate(ref.getUTCDate() - ((ref.getUTCDay() - 2 + 7) % 7));
          const num = Math.floor((D(ini) - ref) / 864e5 / 7) + 1;
          const fim = D(ini); fim.setUTCDate(fim.getUTCDate() + 6);
          return `S${String(num).padStart(2, '0')} (${dm(D(ini))} a ${dm(fim)})`;
        };
        const vivos = sc.filter((r) => r.ini >= primeira && /^DC-/.test(r.dc));
        const ds = vivos.map((r) => ({ini: r.ini, semana: rotulo(r.ini), dc: r.dc, ds: r.ds, enviadas: r.env, devolvidas: r.dev, saldo: r.env - r.dev, chave: `${r.ini}|${r.dc}|${r.ds}`}));
        const sem = new Map();
        for (const r of ds) {
          const k = r.ini + '|' + r.dc;
          const a = sem.get(k) || {ini: r.ini, semana: r.semana, dc: r.dc, enviadas: 0, devolvidas: 0, dss: 0, dss_sem_dev: 0};
          a.enviadas += r.enviadas; a.devolvidas += r.devolvidas; a.dss += 1; a.dss_sem_dev += r.enviadas > 0 && !r.devolvidas ? 1 : 0;
          sem.set(k, a);
        }
        const semanas = [...sem.values()].map((a) => ({...a, pct: a.enviadas ? a.devolvidas / a.enviadas : null, saldo: a.enviadas - a.devolvidas, chave: a.ini + '|' + a.dc}));
        // semanas anteriores ficam com o histórico do Excel
        const antigas = (st.sacas_semana && st.sacas_semana.data || []).filter((r) => r.ini < primeira);
        const antigasDS = (st.sacas_ds && st.sacas_ds.data || []).filter((r) => r.ini < primeira);
        st.sacas_semana = {status: 'ok', data: [...semanas, ...antigas].sort((a, b) => b.ini.localeCompare(a.ini) || a.dc.localeCompare(b.dc))};
        st.sacas_ds = {status: 'ok', data: [...ds, ...antigasDS]};
        PORTAL_ORIGEM.sacas = 'sheets';
      }
    } catch (e) { console.warn('Sheets indisponível para Controle de Sacas', e); }
  }

  // --- Lost ao vivo: Resumo_Portal da planilha Lost/Damage (pacotes e valor por dia, DC, motivo e último scan) ---
  if (F.lost) {
    try {
      const num = (v) => Number(String(v || '0').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0;
      const lo = (await lerCSV(F.lost)).filter((r) => r.Data && r.DC).map((r) => ({data: iso(r.Data), dc: r.DC.trim(), motivo: (r.Motivo || '').trim() || '(sem motivo)', scan: (r.Ultimo_Scan || '').trim() || '(sem scan)', n: num(r.Lost), valor: num(r.Valor)}));
      const fim = lo.map((r) => r.data).sort().pop();
      if (fim) {
        const ini = fim.slice(0, 8) + '01';
        const noMes = lo.filter((r) => r.data >= ini && r.data <= fim);
        const D = (x) => new Date(x + 'T00:00:00Z');
        const S = (d) => d.toISOString().slice(0, 10);
        const terca = (x) => { const d = D(x); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - 2 + 7) % 7)); return S(d); };
        const somaDias = (x, n) => { const d = D(x); d.setUTCDate(d.getUTCDate() + n); return S(d); };
        const semAtual = terca(fim), semAnt = somaDias(semAtual, -7);
        const recebido = {};
        ((st.diario && st.diario.data) || []).forEach((r) => { if (r.data >= ini && r.data <= fim && r.recebido_off != null) recebido[r.dc] = (recebido[r.dc] || 0) + Number(r.recebido_off); });
        const soma = (rows, f) => rows.reduce((s, r) => s + r[f], 0);
        st.lost_dc = {status: 'ok', data: ['DC-PI2', 'DC-PI3', 'DC-CE1'].map((dc) => {
          const m = noMes.filter((r) => r.dc === dc), lost = soma(m, 'n'), rec = recebido[dc] || 0;
          const ult = lo.filter((r) => r.dc === dc && r.data >= semAnt && r.data < semAtual);
          return {dc, periodo_ini: ini, periodo_fim: fim, lost, recebido: rec, valor: soma(m, 'valor'), taxa: rec ? lost / rec : null, ultima_semana: soma(ult, 'n')};
        })};
        const semanal = [];
        for (let k = 7; k >= 0; k--) {
          const s0 = somaDias(semAtual, -7 * k), rot = s0.slice(8, 10) + '/' + s0.slice(5, 7), parcial = k === 0 && fim < somaDias(s0, 6) ? 1 : 0;
          for (const dc of ['DC-PI2', 'DC-PI3', 'DC-CE1']) semanal.push({semana: rot, parcial, dc, lost: soma(lo.filter((r) => r.dc === dc && r.data >= s0 && r.data <= somaDias(s0, 6)), 'n'), chave: rot + '|' + dc});
        }
        st.lost_semanal = {status: 'ok', data: semanal};
        const total = soma(noMes, 'n');
        const agrupa = (campo, nome) => [...noMes.reduce((m, r) => m.set(r[campo], (m.get(r[campo]) || 0) + r.n), new Map())].map(([k, q]) => ({[nome]: k, qtd: q, pct: total ? q / total : 0})).sort((a, b) => b.qtd - a.qtd);
        st.lost_motivos = {status: 'ok', data: agrupa('motivo', 'motivo')};
        st.lost_scan = {status: 'ok', data: agrupa('scan', 'scan')};
        PORTAL_ORIGEM.lost = 'sheets';
      }
    } catch (e) { console.warn('Sheets indisponível para Lost', e); }
  }

  // --- No Tracking: histórico diário (posição 4+ dias de cada dia, para as semanas passadas) ---
  if (F.nt_hist) {
    try {
      st.nt_hist = {status: 'ok', data: (await lerCSV(F.nt_hist)).filter((r) => r.Data_Ref && r.DC).map((r) => ({data: iso(r.Data_Ref), dc: r.DC.trim(), faixa: (r.Faixa || '').trim(), qtd: Number(r.Qtd) || 0}))};
    } catch (e) { console.warn('Sheets indisponível para histórico do No Tracking', e); }
  }

  // --- Resumo semanal e Ranking recalculados com os dados acima ---
  try { window.PORTAL_RECALCULA(st, SNAP); } catch (e) { console.error('Falha ao recalcular resumo/ranking', e); }
  dash.render();
})();
dash.draw('fonte-status', (p) => {
  const o = window.PORTAL_ORIGEM || {};
  const item = (nome, ok) => `${nome}: ${ok ? 'lido agora do Google Sheets' : 'números de novembro'}`;
  p.textContent = [item('OffLoading', o.off_rec === 'sheets' && o.off_con === 'sheets'), item('Eficiência HC', o.hc === 'sheets'), item('No Tracking', o.notracking === 'sheets'), item('Erro de Triagem', o.erro === 'sheets'), item('No Scan', o.noscan === 'sheets'), item('Pontualidade', o.pontualidade === 'sheets'), item('Controle de Sacas', o.sacas === 'sheets'), item('Lost', o.lost === 'sheets')].join(' · ') + '.' + (o.resumo === 'calculado' ? ' Visão geral e Ranking: calculados com esses números.' : '');
});
new MutationObserver(() => dash.render()).observe(document.body, {subtree: true, attributes: true, attributeFilter: ['hidden']});
let rw; window.addEventListener('resize', () => { clearTimeout(rw); rw = setTimeout(dash.render, 150); });
dash.render();
