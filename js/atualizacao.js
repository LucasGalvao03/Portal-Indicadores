/* ===== Selo "última atualização" por relatório =====
   Lê abas_portal.atualizado (função portal, ação "atualizacoes"). O Apps Script só muda esse
   horário quando o conteúdo da aba realmente muda (travado por hash), então é a atualização de verdade.
   Se o endpoint ainda não estiver publicado, não faz nada (não quebra o site). */
(async () => {
  await window.PORTAL_LOGIN;
  // cada relatório -> abas que ele usa (pega a mais recente)
  const SECOES = {
    offloading: ['OffLoading_Recebido', 'OffLoading_Consolidado', 'OffLoading_Hora'],
    noscan: ['NoScan', 'NoScan_Lista'],
    notracking: ['NoTracking', 'NoTracking_Historico'],
    erro: ['Erro', 'Erro_Recebidos', 'Erro_Lista'],
    eficiencia: ['HC'],
    pontualidade: ['Pontualidade', 'Carga_Rotas', 'Carga_DS', 'Carga_Dia'],
    lost: ['Lost', 'Lost_Lista'],
    sacas: ['Sacas'],
  };
  const mapa = {};
  try {
    const lista = await window.portalApi('atualizacoes', {metodo: 'GET'});
    (lista || []).forEach((x) => { if (x && x.aba) mapa[x.aba] = x.atualizado; });
  } catch (e) { return; } // endpoint ainda não publicado: segue sem selo
  if (!Object.keys(mapa).length) return;

  const p2 = (n) => String(n).padStart(2, '0');
  const quando = (iso) => {
    const d = new Date(iso); if (isNaN(d)) return '';
    const hoje = new Date(); const mesmoDia = d.toDateString() === hoje.toDateString();
    const h = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
    return mesmoDia ? `hoje ${h}` : `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${h}`;
  };

  const por = () => {
    Object.entries(SECOES).forEach(([sec, abas]) => {
      const ts = abas.map((a) => mapa[a]).filter(Boolean).sort().pop();
      if (!ts) return;
      const head = document.querySelector(`#${sec} .pt-sec-head`);
      if (!head) return;
      let selo = head.querySelector('.atz-selo');
      if (!selo) { selo = document.createElement('span'); selo.className = 'atz-selo'; head.append(selo); }
      selo.textContent = '🕒 Atualizado ' + quando(ts);
      selo.title = 'Última vez que os dados deste relatório mudaram';
    });
  };
  por();
})();
