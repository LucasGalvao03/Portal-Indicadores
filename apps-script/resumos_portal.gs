/**
 * Resumos para o Portal de Indicadores (No Scan e OffLoading)
 *
 * Onde colar: planilha "Leitura_de_Recebimento" → Extensões → Apps Script (substitui o código anterior).
 * Depois de colar: escolha a função "configurar" e clique em Executar.
 * Ela só agenda as atualizações (leva segundos). Cada resumo roda sozinho a cada hora,
 * em execuções separadas, para não passar do limite de 6 minutos do Google.
 * Para atualizar na hora, execute a função do resumo que quiser (ex.: atualizarRecebido, atualizarPontualidadePI2).
 * Use "Executar" (não "Depuração", que é bem mais lento).
 *
 * Por que script e não fórmula: as bases têm 200 mil+ linhas e a fórmula deixava a aba
 * publicada lenta demais para o site ler. O script grava valores prontos.
 *
 * No Scan (igual ao Power Query do Excel):
 *  - recebidos = leituras na DS (tira DC-CE1/DC-PI2, Scan State Name vazio e "C2104008501")
 *  - sem registro = waybill que não aparece na planilha de expedição do DC
 *  - DC de cada DS vem da planilha "Banco de Dados / DC e DS"
 * OffLoading: pacotes por Data_Operacao e DC, nas planilhas de descarregamento e consolidação.
 * Controle de Sacas (junto com a Pontualidade, que já lê a mesma base de carregamento):
 *  - enviadas = sacas distintas (Scan No. diferente do pacote) por semana de envio, DC e DS
 *  - devolvidas = formulário; lançamento da semana N conta para o envio da semana N-1
 *  - grava as abas Sacas_Enviadas e Resumo_Sacas na planilha do PI2
 * Pontualidade de Transporte (igual ao PQ_Pontualidade do Resumo Semanal):
 *  - rotas do dia = Train No com bipe válido (com Scan Time e waybill, não cancelado)
 *  - Vehicle ID de cada rota → aba Rotas → saída prevista x real (1ª prevista de cada veículo)
 *  - rota no prazo se a saída real <= prevista (tolerância 0 min); resultado gravado na planilha do PI2
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
const PONTUALIDADE = {
  destinoId: '1nRv-cFPh4bEf3fbzEDiJy4uVOu_dmYv5RaPOd962SIE', // grava o Resumo_Portal na planilha do PI2
  dcs: [
    {dc: 'DC-PI2', id: '1nRv-cFPh4bEf3fbzEDiJy4uVOu_dmYv5RaPOd962SIE', gidLeitura: 0, gidRotas: 2048792338},
    {dc: 'DC-CE1', id: '1Y6Q5t7Tcd3D0TvCmsyyQmwgoq5Zp155i0IITKdvsF9s', gidLeitura: 0, gidRotas: 2031713853},
    {dc: 'DC-PI3', id: '1XAdk1Pq-GpzUj10xdi-B4lpz_b1YoNccBMKeaBvsTh4', gidLeitura: 0, gidRotas: 94921590},
  ],
  toleranciaMin: 0,
};
const FUNCOES = ['atualizarNoScan', 'atualizarRecebido', 'atualizarConsolidado', 'atualizarPontualidadePI2', 'atualizarPontualidadeCE1', 'atualizarPontualidadePI3'];

function configurar() {
  ScriptApp.getProjectTriggers()
    .filter((t) => FUNCOES.includes(t.getHandlerFunction()) || ['atualizarOffLoading', 'atualizarPontualidade'].includes(t.getHandlerFunction()))
    .forEach((t) => ScriptApp.deleteTrigger(t));
  FUNCOES.forEach((f) => ScriptApp.newTrigger(f).timeBased().everyHours(1).create());
}

function atualizarRecebido() { resumoOffLoading_(OFFLOADING.recebido); }
function atualizarConsolidado() { resumoOffLoading_(OFFLOADING.consolidado); }

// ---------- utilidades ----------
const CACHE_DATAS_ = new Map();
function paraData_(v, fuso) {
  if (v instanceof Date) { // fuso da planilha, para a data não "virar"; guarda cada data já convertida (formatDate é lento)
    const k = v.getTime() + '|' + fuso;
    let r = CACHE_DATAS_.get(k);
    if (r === undefined) { r = Utilities.formatDate(v, fuso, 'yyyy-MM-dd'); CACHE_DATAS_.set(k, r); }
    return r;
  }
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
  const fuso = ss.getSpreadsheetTimeZone();
  const grupos = new Map();
  for (let i = 0; i < datas.length; i++) {
    const data = paraData_(datas[i], fuso), dc = String(dcs[i]).trim();
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
  const fuso = ss.getSpreadsheetTimeZone();

  const grupos = new Map();
  for (let i = 0; i < wbs.length; i++) {
    const wb = norm(typeof wbs[i] === 'number' ? wbs[i].toFixed(0) : wbs[i]);
    const st = String(sts[i]).trim(), uf = String(ufs[i]).trim(), data = paraData_(tempo[i], fuso);
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

// ---------- Pontualidade de Transporte ----------
function atualizarPontualidadePI2() { pontualidadeDC_('DC-PI2'); }
function atualizarPontualidadeCE1() { pontualidadeDC_('DC-CE1'); }
function atualizarPontualidadePI3() { pontualidadeDC_('DC-PI3'); }
function atualizarPontualidade() { ['DC-PI2', 'DC-CE1', 'DC-PI3'].forEach(pontualidadeDC_); } // manual; pode passar de 6 min

// Calcula um DC e troca só as linhas dele no Resumo_Portal
function pontualidadeDC_(dcAlvo) {
  const txt = (v) => String(v == null ? '' : v).trim();
  // data e hora como número aaaammddhhmmss (para comparar e pegar o menor)
  const hora = (v, fuso) => {
    if (v instanceof Date) return Number(Utilities.formatDate(v, fuso, 'yyyyMMddHHmmss'));
    const t = txt(v);
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return Number(m[1] + m[2] + m[3] + m[4].padStart(2, '0') + m[5] + (m[6] || '00'));
    m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return Number(m[3] + m[2].padStart(2, '0') + m[1].padStart(2, '0') + m[4].padStart(2, '0') + m[5] + (m[6] || '00'));
    return null;
  };
  const somaMin = (n, min) => { // soma minutos a aaaammddhhmmss
    if (!min) return n;
    const s = String(n), d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12) + min, +s.slice(12, 14)));
    return Number(Utilities.formatDate(d, 'UTC', 'yyyyMMddHHmmss'));
  };
  const cancelado = (v) => ['Y', 'YES', 'SIM', 'S', 'TRUE', '1'].includes(txt(v).toUpperCase());

  const rotasDia = new Set();   // DC|data|rota
  const veiculos = new Map();   // DC|data|rota|VID
  const porVeiculo = new Map(); // VID → {prev, real}
  const enviadas = new Map();   // semana|chave DS → {nomes, sacas}
  for (const cfg of PONTUALIDADE.dcs.filter((c) => c.dc === dcAlvo)) {
    const ss = SpreadsheetApp.openById(cfg.id);
    const fuso = ss.getSpreadsheetTimeZone();
    const leitura = ss.getSheets().find((s) => s.getSheetId() === cfg.gidLeitura);
    const datas = lerColuna_(leitura, 'Data'), wbs = lerColuna_(leitura, 'Waybill No.'), vids = lerColuna_(leitura, 'Vehicle ID');
    const trens = lerColuna_(leitura, 'Train No'), scans = lerColuna_(leitura, 'Scan Time'), canc = lerColuna_(leitura, 'Is Cancel');
    const sacasCol = lerColuna_(leitura, 'Scan No.'), destinos = lerColuna_(leitura, 'Destination Statio');
    for (let i = 0; i < datas.length; i++) {
      const scan = scans[i];
      const data = paraData_(datas[i], fuso) || paraData_(scan instanceof Date ? scan : txt(scan).slice(0, 10), fuso);
      if (!data) continue;
      const rota = txt(trens[i]) || '(sem rota)';
      const k = `${cfg.dc}|${data}|${rota}`;
      const valido = txt(scan) && txt(wbs[i]) && !cancelado(canc[i]);
      if (valido) rotasDia.add(k);
      // Controle de Sacas: saca = Scan No. diferente do pacote, só destinos DS
      const saca = txt(sacasCol[i]), ds = txt(destinos[i]) || '(sem DS)';
      if (valido && saca && saca !== txt(wbs[i]) && !/^(DC-|CDC|RDC)/i.test(ds)) {
        const ch = `${terca_(data)}|${chaveDS_(ds)}`;
        const e = enviadas.get(ch) || {nomes: new Set(), sacas: new Set()};
        e.nomes.add(ds); e.sacas.add(saca); enviadas.set(ch, e);
      }
      const vid = txt(vids[i]).toUpperCase();
      if (vid) veiculos.set(`${k}|${vid}`, [k, vid]);
    }
    const abaRotas = ss.getSheets().find((s) => s.getSheetId() === cfg.gidRotas);
    const ids = lerColuna_(abaRotas, 'Vehicle Id'), prevs = lerColuna_(abaRotas, 'Planned Departure Time'), reais = lerColuna_(abaRotas, 'Act Departure Time');
    for (let i = 0; i < ids.length; i++) {
      const vid = txt(ids[i]).toUpperCase();
      if (!vid) continue;
      const prev = hora(prevs[i], fuso), real = hora(reais[i], fuso);
      const atual = porVeiculo.get(vid);
      // fica a linha com a menor saída prevista do veículo
      if (!atual || (prev != null && (atual.prev == null || prev < atual.prev))) porVeiculo.set(vid, {prev, real});
    }
  }

  // fecha por rota: menor prevista e menor saída real entre os veículos da rota
  const porRota = new Map();
  for (const [k, vid] of veiculos.values()) {
    const v = porVeiculo.get(vid);
    if (!v) continue;
    const r = porRota.get(k) || {prev: null, real: null};
    if (v.prev != null && (r.prev == null || v.prev < r.prev)) r.prev = v.prev;
    if (v.real != null && (r.real == null || v.real < r.real)) r.real = v.real;
    porRota.set(k, r);
  }
  const grupos = new Map();
  for (const [k, r] of porRota) {
    if (!rotasDia.has(k) || r.prev == null || r.real == null) continue;
    const [dc, data] = k.split('|');
    const g = grupos.get(data + '|' + dc) || [data, dc, 0, 0, 0];
    g[2] += 1;
    if (r.real <= somaMin(r.prev, PONTUALIDADE.toleranciaMin)) g[3] += 1; else g[4] += 1;
    grupos.set(data + '|' + dc, g);
  }
  // junta com as linhas dos outros DCs já gravadas (trava para dois DCs não gravarem ao mesmo tempo)
  const trava = LockService.getScriptLock();
  trava.waitLock(120000);
  try {
    const ss = SpreadsheetApp.openById(PONTUALIDADE.destinoId);
    const aba = ss.getSheetByName(ABA_RESUMO);
    const outros = aba && aba.getLastRow() > 1
      ? aba.getRange(2, 1, aba.getLastRow() - 1, 5).getDisplayValues().filter((r) => r[0] && r[1] && r[1] !== dcAlvo)
      : [];
    const todas = [...outros, ...grupos.values()].sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));
    gravar_(ss, [['Data', 'DC', 'Rotas', 'No_Prazo', 'Atrasadas'], ...todas], 7);

    // sacas enviadas deste DC (aba Sacas_Enviadas) e o cruzamento com as devolvidas (aba Resumo_Sacas)
    const env = [...enviadas.entries()].map(([k, e]) => { const [ini, chave] = k.split('|'); return [ini, dcAlvo, chave, [...e.nomes].sort()[0], e.sacas.size]; });
    let abaEnv = ss.getSheetByName('Sacas_Enviadas') || ss.insertSheet('Sacas_Enviadas');
    const outrasEnv = abaEnv.getLastRow() > 1 ? abaEnv.getRange(2, 1, abaEnv.getLastRow() - 1, 5).getDisplayValues().filter((r) => r[0] && r[1] !== dcAlvo) : [];
    abaEnv.clearContents();
    const linhasEnv = [['Ini_Envio', 'DC', 'Chave_DS', 'DS', 'Enviadas'], ...outrasEnv, ...env];
    abaEnv.getRange(1, 1, linhasEnv.length, 1).setNumberFormat('@');
    abaEnv.getRange(1, 1, linhasEnv.length, 5).setValues(linhasEnv);
    resumoSacas_(ss, linhasEnv.slice(1));
  } finally {
    trava.releaseLock();
  }
}

// ---------- Controle de Sacas ----------
const SACAS = {formularioId: '1T3BX9CLfusmL-8MbUXYQNI7BCxjnpiDKEa6Sk2rh248'}; // formulário de sacas devolvidas

function terca_(iso) { // terça-feira que abre a semana operacional de uma data aaaa-mm-dd
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - 2 + 7) % 7));
  return d.toISOString().slice(0, 10);
}
function chaveDS_(ds) { // "ds  cua" → "CUA" (igual ao fxChaveDS do Excel)
  const l = String(ds || '').toUpperCase().trim().split(' ').filter((x) => x).join(' ');
  const s = /^DS[ \-_]/.test(l) ? l.slice(3).trim() : l;
  return s || '(SEM DS)';
}
function dcPadrao_(dc) { // "pi2", "DC PI2" → "DC-PI2"
  const u = String(dc || '').trim().toUpperCase().replace(/[ _]/g, '');
  return !u ? '(sem DC)' : u.startsWith('DC-') ? u : u.startsWith('DC') ? 'DC-' + u.slice(2) : 'DC-' + u;
}

// Enviadas x devolvidas por semana de envio, DC e DS (devolução lançada na semana N = envio da semana N-1)
function resumoSacas_(ss, linhasEnv) {
  const form = SpreadsheetApp.openById(SACAS.formularioId);
  const fuso = form.getSpreadsheetTimeZone();
  const dados = base_(form).getDataRange().getValues();
  const cab = dados[0].map((x) => String(x).trim());
  const cData = cab.indexOf('Data do Preenchimento'), cDC = cab.indexOf('DC'), cQtd = cab.indexOf('Quantidade de Sacas'), cDS = cab.indexOf('DS');
  const mapa = new Map();
  const linha = (ini, dc, chave) => { const k = `${ini}|${dc}|${chave}`; if (!mapa.has(k)) mapa.set(k, {ini, dc, ds: '', env: 0, dev: 0}); return mapa.get(k); };
  for (const [ini, dc, chave, ds, n] of linhasEnv) { const r = linha(ini, dc, chave); r.ds = r.ds || ds; r.env += Number(n) || 0; }
  for (const r of dados.slice(1)) {
    const data = paraData_(r[cData], fuso);
    if (!data) continue;
    const d = new Date(terca_(data) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 7);
    const ds = String(r[cDS] || '').trim() || '(sem DS)';
    const x = linha(d.toISOString().slice(0, 10), dcPadrao_(r[cDC]), chaveDS_(ds));
    x.ds = x.ds || ds; x.dev += Number(r[cQtd]) || 0;
  }
  const linhas = [['Ini_Envio', 'DC', 'DS', 'Enviadas', 'Devolvidas'],
    ...[...mapa.values()].sort((a, b) => (b.ini + a.dc + a.ds).localeCompare(a.ini + b.dc + b.ds)).map((r) => [r.ini, r.dc, r.ds, r.env, r.dev])];
  const aba = ss.getSheetByName('Resumo_Sacas') || ss.insertSheet('Resumo_Sacas');
  aba.clearContents();
  aba.getRange(1, 1, linhas.length, 1).setNumberFormat('@');
  aba.getRange(1, 1, linhas.length, 5).setValues(linhas);
  aba.getRange(1, 7).setValue('Atualizado em ' + Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy HH:mm'));
}
