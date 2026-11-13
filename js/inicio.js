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
          if (h.data < ini || h.data > ult) continue;
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
        for (const x of receb) { if (x.data < ini || x.data > ult) continue; const r = linha(x.data, x.dc); r.recebidos_erro = (r.recebidos_erro || 0) + x.n; if (r.erros == null) r.erros = 0; }
        for (const x of erros) { if (x.data < ini || x.data > ult) continue; const r = linha(x.data, x.dc); r.erros = (r.erros || 0) + x.n; }
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
  dash.render();
})();
dash.draw('fonte-status', (p) => {
  const o = window.PORTAL_ORIGEM || {};
  const item = (nome, ok) => `${nome}: ${ok ? 'lido agora do Google Sheets' : 'números de novembro'}`;
  p.textContent = [item('OffLoading', o.off_rec === 'sheets' && o.off_con === 'sheets'), item('Eficiência HC', o.hc === 'sheets'), item('No Tracking', o.notracking === 'sheets'), item('Erro de Triagem', o.erro === 'sheets')].join(' · ') + '.';
});
new MutationObserver(() => dash.render()).observe(document.body, {subtree: true, attributes: true, attributeFilter: ['hidden']});
let rw; window.addEventListener('resize', () => { clearTimeout(rw); rw = setTimeout(dash.render, 150); });
dash.render();
