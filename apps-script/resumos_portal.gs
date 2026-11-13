/**
 * Resumos para o Portal de Indicadores (No Scan e OffLoading)
 *
 * Onde colar: planilha "Leitura_de_Recebimento" → Extensões → Apps Script (substitui o código anterior).
 * Depois de colar: escolha a função "configurar" e clique em Executar.
 * Ela só agenda as atualizações (leva segundos). Cada resumo roda sozinho a cada hora,
 * em execuções separadas, para não passar do limite de 6 minutos do Google.
 * Para atualizar na hora, execute a função do resumo que quiser (ex.: atualizarRecebido).
 *
 * Por que script e não fórmula: as bases têm 200 mil+ linhas e a fórmula deixava a aba
 * publicada lenta demais para o site ler. O script grava valores prontos.
 *
 * No Scan (igual ao Power Query do Excel):
 *  - recebidos = leituras na DS (tira DC-CE1/DC-PI2, Scan State Name vazio e "C2104008501")
 *  - sem registro = waybill que não aparece na planilha de expedição do DC
 *  - DC de cada DS vem da planilha "Banco de Dados / DC e DS"
 * OffLoading: pacotes por Data_Operacao e DC, nas planilhas de descarregamento e consolidação.
 */

const ABA_RESUMO = 'Resumo_Portal';
const NOSCAN = {
  expedicaoId: '1bNJKSfR0fYX4YVVd9mRyKYf4ar58MJeWUAViH0YuSLY', // Leitura_de_Expedição
  mapaId: '1Pqt6-XoF9sATvopgntpnbESndR73Xnx30EJDjEQAlv4',      // Banco de Dados / DC e DS
};
const OFFLOADING = {
  recebido: {id: '1ewr8GddOYFhgmA83vbOrFR80LDjgdc8rYEl7szzHJ74', colunaDC: 'Estacao_Descarregamento', rotulo: 'Recebido'},  // Operação_Descarregamento
  consolidado: {id: '1rwG38ONSQkhtTe9Qc24jnYjpAW-NWl530xK7Zc9Yyw8', colunaDC: 'Scan Station', rotulo: 'Consolidado'},       // Operacao_Consolidacao
};
const FUNCOES = ['atualizarNoScan', 'atualizarRecebido', 'atualizarConsolidado'];

function configurar() {
  ScriptApp.getProjectTriggers()
    .filter((t) => FUNCOES.includes(t.getHandlerFunction()) || t.getHandlerFunction() === 'atualizarOffLoading')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  FUNCOES.forEach((f) => ScriptApp.newTrigger(f).timeBased().everyHours(1).create());
}

function atualizarRecebido() { resumoOffLoading_(OFFLOADING.recebido); }
function atualizarConsolidado() { resumoOffLoading_(OFFLOADING.consolidado); }

// ---------- utilidades ----------
function paraData_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Fortaleza', 'yyyy-MM-dd');
  const t = String(v == null ? '' : v).trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}
function coluna_(aba, nome) {
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map((x) => String(x).trim());
  const i = cab.indexOf(nome);
  if (i < 0) throw new Error(`Coluna "${nome}" não encontrada na aba ${aba.getName()}`);
  return i + 1;
}
function lerColuna_(aba, nome) {
  const n = aba.getLastRow() - 1;
  return n > 0 ? aba.getRange(2, coluna_(aba, nome), n, 1).getValues().map((r) => r[0]) : [];
}
function gravar_(ss, linhas, colNota) {
  const aba = ss.getSheetByName(ABA_RESUMO) || ss.insertSheet(ABA_RESUMO);
  aba.clearContents();
  aba.getRange(1, 1, linhas.length, 1).setNumberFormat('@');
  aba.getRange(1, 1, linhas.length, linhas[0].length).setValues(linhas);
  aba.getRange(1, colNota).setValue('Atualizado em ' + Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy HH:mm'));
}
function base_(ss) { return ss.getSheets().find((s) => s.getName() !== ABA_RESUMO); }

// ---------- OffLoading ----------
function resumoOffLoading_(cfg) {
  const ss = SpreadsheetApp.openById(cfg.id);
  const base = base_(ss);
  const datas = lerColuna_(base, 'Data_Operacao');
  const dcs = lerColuna_(base, cfg.colunaDC);
  const grupos = new Map();
  for (let i = 0; i < datas.length; i++) {
    const data = paraData_(datas[i]), dc = String(dcs[i]).trim();
    if (!data || !dc) continue;
    const k = data + '|' + dc;
    grupos.set(k, (grupos.get(k) || 0) + 1);
  }
  const linhas = [['Data', 'DC', cfg.rotulo], ...[...grupos.entries()].sort().map(([k, v]) => [...k.split('|'), v])];
  gravar_(ss, linhas, 5);
}

// ---------- No Scan ----------
function atualizarNoScan() {
  const norm = (v) => String(v == null ? '' : v).trim().toUpperCase();

  // 1) Waybills que passaram pela expedição do DC
  const expedidos = new Set(lerColuna_(base_(SpreadsheetApp.openById(NOSCAN.expedicaoId)), 'Waybill No.').map(norm));

  // 2) Mapa DS → DC
  const mapa = new Map();
  base_(SpreadsheetApp.openById(NOSCAN.mapaId)).getDataRange().getValues().slice(1)
    .forEach(([ds, dc]) => { ds = String(ds).trim(); if (ds.startsWith('DS ') && !mapa.has(ds)) mapa.set(ds, String(dc).trim()); });

  // 3) Recebimento na DS (só as 4 colunas usadas)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rec = base_(ss);
  const tempo = lerColuna_(rec, 'Scan Time'), wbs = lerColuna_(rec, 'Waybill Number');
  const sts = lerColuna_(rec, 'Scan Station'), ufs = lerColuna_(rec, 'Scan State Name');

  const grupos = new Map();
  for (let i = 0; i < wbs.length; i++) {
    const wb = norm(typeof wbs[i] === 'number' ? wbs[i].toFixed(0) : wbs[i]);
    const st = String(sts[i]).trim(), uf = String(ufs[i]).trim(), data = paraData_(tempo[i]);
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
  gravar_(ss, linhas, 7);
}
