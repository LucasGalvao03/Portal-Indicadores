/**
 * No Scan · resumo para o Portal de Indicadores
 *
 * Onde colar: planilha "Leitura_de_Recebimento" → Extensões → Apps Script.
 * Primeira vez: escolha a função "configurar" e clique em Executar (pede autorização uma vez).
 * Ela cria a aba Resumo_Portal e agenda a atualização automática a cada hora.
 *
 * Regra (igual ao Power Query do Excel):
 *  - recebidos = leituras na DS (tira DC-CE1/DC-PI2, Scan State Name vazio e "C2104008501")
 *  - sem registro = waybill que não aparece na planilha de expedição do DC
 *  - DC de cada DS vem da planilha "Banco de Dados / DC e DS"
 */

const NOSCAN = {
  expedicaoId: '1bNJKSfR0fYX4YVVd9mRyKYf4ar58MJeWUAViH0YuSLY', // Leitura_de_Expedição
  mapaId: '1Pqt6-XoF9sATvopgntpnbESndR73Xnx30EJDjEQAlv4',      // Banco de Dados / DC e DS
  abaResumo: 'Resumo_Portal',
};

function configurar() {
  atualizarNoScan();
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'atualizarNoScan')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('atualizarNoScan').timeBased().everyHours(1).create();
}

function atualizarNoScan() {
  const norm = (v) => String(v == null ? '' : v).trim().toUpperCase();

  // 1) Waybills que passaram pela expedição do DC
  const exp = SpreadsheetApp.openById(NOSCAN.expedicaoId).getSheets()[0];
  const expCab = exp.getRange(1, 1, 1, exp.getLastColumn()).getDisplayValues()[0];
  const colExp = expCab.indexOf('Waybill No.') + 1;
  const expedidos = new Set(
    exp.getRange(2, colExp, Math.max(exp.getLastRow() - 1, 1), 1).getDisplayValues().map((r) => norm(r[0]))
  );

  // 2) Mapa DS → DC
  const mapa = new Map();
  SpreadsheetApp.openById(NOSCAN.mapaId).getSheets()[0].getDataRange().getDisplayValues().slice(1)
    .forEach(([ds, dc]) => { ds = String(ds).trim(); if (ds.startsWith('DS ') && !mapa.has(ds)) mapa.set(ds, String(dc).trim()); });

  // 3) Recebimento na DS
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rec = ss.getSheets()[0];
  const dados = rec.getDataRange().getDisplayValues();
  const cab = dados[0];
  const c = (n) => cab.indexOf(n);
  const cTempo = c('Scan Time'), cWb = c('Waybill Number'), cSt = c('Scan Station'), cUf = c('Scan State Name');

  const paraData = (t) => {
    t = String(t).trim();
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  };

  const grupos = new Map();
  for (let i = 1; i < dados.length; i++) {
    const r = dados[i];
    const wb = norm(r[cWb]), st = String(r[cSt]).trim(), uf = String(r[cUf]).trim(), data = paraData(r[cTempo]);
    if (!wb || !data || st === 'DC-CE1' || st === 'DC-PI2' || uf === '' || uf === 'C2104008501') continue;
    const dc = mapa.get(st) || 'Não identificado';
    const k = `${data}|${dc}|${st}`;
    const g = grupos.get(k) || [data, dc, st, 0, 0];
    g[3] += 1;
    if (!expedidos.has(wb)) g[4] += 1;
    grupos.set(k, g);
  }

  const linhas = [['Data', 'DC', 'DS', 'Recebidos', 'Sem_Registro'],
    ...[...grupos.values()].sort((a, b) => (a[0] + a[1] + a[2]).localeCompare(b[0] + b[1] + b[2]))];
  let aba = ss.getSheetByName(NOSCAN.abaResumo) || ss.insertSheet(NOSCAN.abaResumo);
  aba.clearContents();
  aba.getRange(1, 1, linhas.length, 5).setValues(linhas);
  aba.getRange(1, 7).setValue('Atualizado em ' + Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy HH:mm'));
}
