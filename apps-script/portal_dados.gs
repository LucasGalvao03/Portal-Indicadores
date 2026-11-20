/**
 * Portal de Indicadores · Nordeste II — script da planilha "Portal_Dados"
 *
 * A Portal_Dados é permanente: o site lê só as abas dela, então os links publicados nunca mudam.
 * Este script busca os dados nas planilhas do mês (listadas na aba Config), calcula os resumos
 * com as mesmas regras dos relatórios em Excel e grava aqui, a cada hora.
 *
 * Virada do mês: crie as planilhas novas e cole os links delas na aba Config. Só isso.
 * Extensão (planilha encheu no meio do mês): acrescente na Config mais uma linha com o MESMO nome
 * de base e o link da planilha nova. O script lê todas as partes como se fossem uma só.
 * O histórico fica guardado: cada atualização troca só os meses que vieram na planilha atual.
 *
 * Instalar: Portal_Dados → Extensões → Apps Script → colar este código → salvar →
 *           escolher "configurar" → Executar (use Executar, não Depuração).
 *           Ela cria a aba Config (se não existir) e liga a fila: a cada 5 minutos roda uma
 *           tarefa, uma de cada vez (ciclo completo em ~35 a 45 minutos).
 *           Para atualizar uma parte na hora, execute a função dela (ex.: atualizarNoScan).
 *
 * Regras (iguais às consultas do Power Query dos relatórios):
 *  OffLoading      pacotes por Data_Operacao e DC (descarregamento = recebido; consolidação = consolidado)
 *  No Scan         recebidos na DS (tira DC-CE1/DC-PI2, Scan State Name vazio e "C2104008501");
 *                  sem registro = waybill fora da expedição do DC; DC da DS pelo mapa DS x DC
 *  Eficiência HC   volume e pessoas por dia das abas DC-PI2, DC-CE1 e DC-PI3
 *  No Tracking     última leitura em DC-PI2/CE1/PI3, sem "seal vehicle"; "unseal vehicle" só sem
 *                  tipo de insucesso; 2+ dias parados até a leitura mais recente da base
 *  Erro de Triagem só leituras em DS e DS recebida diferente da DS dona; data da Scan Date (mês/dia/ano);
 *                  recebidos = Orders Loading da planilha Taxas
 *  Pontualidade    rota do dia (Train No com bipe válido) → Vehicle ID → aba de rotas → saída real
 *                  <= prevista (1ª prevista de cada veículo; tolerância 0 min)
 *  Sacas           enviadas = sacas distintas (Scan No. ≠ pacote) por semana de envio, DC e DS (só DS);
 *                  devolvidas = formulário, lançamento da semana N conta para o envio da semana N-1
 *  Lost            pacotes e valor declarado por data, DC, motivo e último scan
 */

// ---------- bases (valores iniciais da aba Config) ----------
const BASES = [
  ['Descarregamento', '1ewr8GddOYFhgmA83vbOrFR80LDjgdc8rYEl7szzHJ74', 'OffLoading · recebido (mensal)'],
  ['Consolidacao', '1rwG38ONSQkhtTe9Qc24jnYjpAW-NWl530xK7Zc9Yyw8', 'OffLoading · consolidado (mensal)'],
  ['Recebimento_DS', '1m8x5Xy_rntgBs0vbFa2vCHhS66YP2OTushI9PK4uYtI', 'No Scan · leitura de recebimento nas DSs (mensal)'],
  ['Expedicao_DC', '1bNJKSfR0fYX4YVVd9mRyKYf4ar58MJeWUAViH0YuSLY', 'No Scan · leitura de expedição do DC (mensal)'],
  ['Mapa_DS_DC', '1Pqt6-XoF9sATvopgntpnbESndR73Xnx30EJDjEQAlv4', 'No Scan · qual DC atende cada DS (fixa)'],
  ['Eficiencia_HC', '1A3sqHjNlIvn2OzsYbZI6p2VKwa3tygeCXNFUz5U87NA', 'Eficiência HC · abas DC-PI2, DC-CE1, DC-PI3 (mensal)'],
  ['No_Tracking', '1qmXgT2Tt6GWaWERTL_ADIagRfOQxMl08l0tEtICy9Bk', 'No Tracking · base (mensal)'],
  ['Erro_Triagem', '14U-P2CCMzCtotGFYZ7IF29I8YM9Bvp1PepzmuJeuf9k', 'Erro de Triagem · DB_PBI (mensal)'],
  ['Taxas', '1s-6IZvEiwOy9jJz9ua9PcDg2E-pSYDK0zotl4DK7hxs', 'Erro de Triagem · recebidos, Orders Loading (mensal)'],
  ['Carregamento_PI2', '1nRv-cFPh4bEf3fbzEDiJy4uVOu_dmYv5RaPOd962SIE', 'Pontualidade e Sacas · leitura de carregamento + rotas do PI2 (mensal)'],
  ['Carregamento_CE1', '1Y6Q5t7Tcd3D0TvCmsyyQmwgoq5Zp155i0IITKdvsF9s', 'Pontualidade e Sacas · leitura de carregamento + rotas do CE1 (mensal)'],
  ['Carregamento_PI3', '1XAdk1Pq-GpzUj10xdi-B4lpz_b1YoNccBMKeaBvsTh4', 'Pontualidade e Sacas · leitura de carregamento + rotas do PI3 (mensal)'],
  ['Formulario_Sacas', '1T3BX9CLfusmL-8MbUXYQNI7BCxjnpiDKEa6Sk2rh248', 'Sacas · formulário de devolução (fixa)'],
  ['Lost', '13htSF1yt2LurhflNsPOfwxOikQDTC1AIJLq57UVSuBo', 'Lost · Lost / Damage (mensal)'],
];
const DCS = ['DC-PI2', 'DC-CE1', 'DC-PI3'];
const FUNCOES = ['sincronizarLeves', 'sincronizarBanco', 'sincronizarOffLoading', 'sincronizarCarregamento'];

// ---------- instalação ----------
function configurar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName('Config')) {
    const c = ss.insertSheet('Config', 0);
    c.getRange(1, 1, 1, 3).setValues([['Base', 'Link da planilha do mês', 'Para que serve']]).setFontWeight('bold');
    c.getRange(2, 1, BASES.length, 3).setValues(BASES.map(([b, id, uso]) => [b, `https://docs.google.com/spreadsheets/d/${id}/edit`, uso]));
    c.setColumnWidth(1, 170); c.setColumnWidth(2, 520); c.setColumnWidth(3, 460); c.setFrozenRows(1);
  }
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  PropertiesService.getScriptProperties().setProperty('fila_pos', '0');
  ScriptApp.newTrigger('proximaTarefa').timeBased().everyMinutes(5).create();
}

/**
 * Fila: a cada 5 minutos roda UMA tarefa, na ordem de FUNCOES. Se a anterior ainda estiver rodando,
 * pula e tenta no próximo ciclo. Assim nunca roda mais de uma ao mesmo tempo (rodar todas juntas
 * deixava cada uma lenta e estourava os 6 minutos do Google). Ciclo completo: ~35 a 45 minutos.
 */
function proximaTarefa() {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(1000)) return; // outra tarefa ainda rodando
  try {
    const props = PropertiesService.getScriptProperties();
    const i = Number(props.getProperty('fila_pos') || 0) % FUNCOES.length;
    props.setProperty('fila_pos', String(i + 1));
    TAREFAS[FUNCOES[i]]();
  } finally {
    trava.releaseLock();
  }
}

// ---------- tarefas agendadas ----------
function atualizarRecebido() { offLoading_('Descarregamento', 'Estacao_Descarregamento', 'OffLoading_Recebido', 'Recebido'); }
function atualizarConsolidado() { offLoading_('Consolidacao', 'Scan Station', 'OffLoading_Consolidado', 'Consolidado'); }
function atualizarCarregamentoPI2() { carregamento_('DC-PI2'); }
function atualizarCarregamentoCE1() { carregamento_('DC-CE1'); }
function atualizarCarregamentoPI3() { carregamento_('DC-PI3'); }
const TAREFAS = {
  atualizarRecebido: () => atualizarRecebido(), atualizarConsolidado: () => atualizarConsolidado(),
  atualizarNoScan: () => atualizarNoScan(), atualizarCarregamentoPI2: () => atualizarCarregamentoPI2(),
  atualizarCarregamentoCE1: () => atualizarCarregamentoCE1(), atualizarCarregamentoPI3: () => atualizarCarregamentoPI3(),
  atualizarLeves: () => atualizarLeves(), sincronizarBanco: () => sincronizarBanco(),
  sincronizarOffLoading: () => sincronizarOffLoading(),
  sincronizarCarregamento: () => sincronizarCarregamento(),
  sincronizarLeves: () => sincronizarLeves(),
};
// Os cálculos leves gravam por aqui: direto na aba (atualizarLeves) ou guardando para mandar ao banco (sincronizarLeves).
let COLETA_ = null;
function salvar_(nomeAba, cabecalho, novas, opcoes) {
  if (COLETA_) COLETA_.push({nomeAba, cabecalho, novas, opcoes: opcoes || {}});
  else mesclar_(nomeAba, cabecalho, novas, opcoes);
}

function atualizarLeves() { // bases pequenas, uma não impede a outra
  [eficienciaHC_, noTracking_, erroTriagem_, lost_].forEach((f) => { try { f(); } catch (e) { console.error(f.name, e); } });
}

// ---------- utilidades ----------
function config_() { // base → lista de planilhas (uma base pode ter várias partes / extensões)
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  const linhas = aba ? aba.getDataRange().getValues().slice(1) : [];
  const m = new Map();
  linhas.forEach(([b, link]) => {
    const nome = txt_(b), t = txt_(link), id = (t.match(/\/d\/([\w-]+)/) || [null, t])[1];
    if (!nome || !id) return;
    if (!m.has(nome)) m.set(nome, []);
    if (!m.get(nome).includes(id)) m.get(nome).push(id);
  });
  BASES.forEach(([b, id]) => { if (!m.has(b)) m.set(b, [id]); }); // base sem linha na Config: usa a padrão
  return m;
}
function abrirTodas_(base) {
  const ids = config_().get(base);
  if (!ids || !ids.length) throw new Error(`Base "${base}" sem link na aba Config`);
  return ids.map((id) => SpreadsheetApp.openById(id));
}
/**
 * Colunas de data/hora vão em "exibidas": lidas como texto (getDisplayValues). Ler como valor cria um
 * objeto Date por linha, o que é muito lento com 200 mil+ linhas e estourava os 6 minutos.
 *
 * Lê colunas de uma base juntando todas as partes listadas na Config (planilha principal + extensões).
 * Em cada parte usa a primeira aba que tem todas as colunas pedidas. Datas usam o fuso da primeira parte.
 */
function lerBase_(base, colunas, exibidas) {
  exibidas = exibidas || [];
  const out = {fuso: null};
  colunas.forEach((c) => { out[c] = []; });
  for (const ss of abrirTodas_(base)) {
    out.fuso = out.fuso || ss.getSpreadsheetTimeZone();
    const aba = abaCom_(ss, colunas);
    colunas.forEach((c) => { const v = lerColuna_(aba, c, exibidas.includes(c)); for (let i = 0; i < v.length; i++) out[c].push(v[i]); });
  }
  return out;
}
function cabecalho_(aba) {
  return aba.getLastColumn() ? aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map((x) => String(x).trim()) : [];
}
function abaCom_(ss, colunas) { // a primeira aba que tem todas essas colunas no cabeçalho
  const aba = ss.getSheets().find((s) => { const c = cabecalho_(s); return colunas.every((n) => c.includes(n)); });
  if (!aba) throw new Error(`Nenhuma aba de "${ss.getName()}" tem as colunas: ${colunas.join(', ')}`);
  return aba;
}
function lerColuna_(aba, nome, exibido) {
  const i = cabecalho_(aba).indexOf(nome);
  if (i < 0) throw new Error(`Coluna "${nome}" não encontrada na aba ${aba.getName()}`);
  const n = aba.getLastRow() - 1;
  if (n < 1) return [];
  const r = aba.getRange(2, i + 1, n, 1);
  return (exibido ? r.getDisplayValues() : r.getValues()).map((x) => x[0]);
}
const txt_ = (v) => String(v == null ? '' : v).trim();
const CACHE_DATAS_ = new Map();
// Data/hora de célula no fuso da planilha. Utilities.formatDate é lento, então converte uma vez por
// HORA (fusos do Brasil são de horas inteiras) e reaproveita: com 260 mil leituras com segundos
// diferentes, eram 260 mil chamadas e a tarefa passava de 6 minutos.
function horaLocal_(v, fuso) { // Date → 'aaaaMMddHH' no fuso
  const h = Math.floor(v.getTime() / 3600000), k = h + '|' + fuso;
  let r = CACHE_DATAS_.get(k);
  if (r === undefined) { r = Utilities.formatDate(new Date(h * 3600000), fuso, 'yyyyMMddHH'); CACHE_DATAS_.set(k, r); }
  return r;
}
function paraData_(v, fuso, mesPrimeiro) { // → aaaa-mm-dd
  if (v instanceof Date) { const h = horaLocal_(v, fuso); return `${h.slice(0, 4)}-${h.slice(4, 6)}-${h.slice(6, 8)}`; }
  const t = txt_(v);
  let m = t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) { const [d, mes] = mesPrimeiro ? [m[2], m[1]] : [m[1], m[2]]; return `${m[3]}-${mes.padStart(2, '0')}-${d.padStart(2, '0')}`; }
  return '';
}
function terca_(iso) { // terça-feira que abre a semana operacional
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - 2 + 7) % 7));
  return d.toISOString().slice(0, 10);
}
function diasEntre_(a, b) { return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5); }
function chaveDS_(ds) { const l = txt_(ds).toUpperCase().split(' ').filter((x) => x).join(' '); const s = /^DS[ \-_]/.test(l) ? l.slice(3).trim() : l; return s || '(SEM DS)'; }
function dcPadrao_(dc) { const u = txt_(dc).toUpperCase().replace(/[ _]/g, ''); return !u ? '(sem DC)' : u.startsWith('DC-') ? u : u.startsWith('DC') ? 'DC-' + u.slice(2) : 'DC-' + u; }
function numero_(v) { // número em qualquer formato: 1234.5, "1.234,56", "R$ 127,92"
  if (typeof v === 'number') return v;
  let t = txt_(v).replace(/[^\d,.\-]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  return Number(t) || 0;
}

/**
 * Grava na aba da Portal_Dados guardando o histórico: apaga só as linhas que a atualização substitui
 * (mesmo mês da coluna 1 e, se informado, mesmo DC) e acrescenta as novas.
 */
function mesclar_(nomeAba, cabecalho, novas, opcoes) {
  opcoes = opcoes || {};
  const chaveMes = opcoes.chave || ((r) => String(r[0]).slice(0, 7));
  const trocar = new Set(novas.map(chaveMes));
  const trava = LockService.getScriptLock();
  const jaTem = trava.hasLock(); // quando vem da fila, a trava já é desta execução
  if (!jaTem) trava.waitLock(240000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName(nomeAba) || ss.insertSheet(nomeAba);
    const antigas = aba.getLastRow() > 1 ? aba.getRange(2, 1, aba.getLastRow() - 1, cabecalho.length).getDisplayValues() : [];
    const ficam = antigas.filter((r) => r[0] && !(trocar.has(chaveMes(r)) && (!opcoes.dc || r[opcoes.colDC || 1] === opcoes.dc)));
    const todas = [...ficam, ...novas].sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])) || String(a[2]).localeCompare(String(b[2])));
    aba.clearContents();
    const linhas = [cabecalho, ...todas];
    aba.getRange(1, 1, linhas.length, 1).setNumberFormat('@');
    aba.getRange(1, 1, linhas.length, cabecalho.length).setValues(linhas);
    aba.getRange(1, cabecalho.length + 2).setValue('Atualizado em ' + Utilities.formatDate(new Date(), 'America/Fortaleza', 'dd/MM/yyyy HH:mm'));
  } finally {
    if (!jaTem) trava.releaseLock();
  }
}

// ---------- OffLoading ----------
function offLoading_(base, colunaDC, abaDestino, rotulo) {
  const b = lerBase_(base, ['Data_Operacao', colunaDC], ['Data_Operacao']), fuso = b.fuso;
  const datas = b['Data_Operacao'], dcs = b[colunaDC];
  const g = new Map();
  for (let i = 0; i < datas.length; i++) {
    const data = paraData_(datas[i], fuso), dc = txt_(dcs[i]);
    if (data && dc) g.set(data + '|' + dc, (g.get(data + '|' + dc) || 0) + 1);
  }
  mesclar_(abaDestino, ['Data', 'DC', rotulo], [...g].map(([k, v]) => [...k.split('|'), v]));
}

// ---------- No Scan ----------
function atualizarNoScan() {
  const norm = (v) => txt_(typeof v === 'number' ? v.toFixed(0) : v).toUpperCase();
  const expedidos = new Set(lerBase_('Expedicao_DC', ['Waybill No.'])['Waybill No.'].map(norm));
  const mapa = new Map();
  const bm = lerBase_('Mapa_DS_DC', ['DS', 'DC']);
  bm['DS'].forEach((x, i) => { const ds = txt_(x); if (ds.startsWith('DS ') && !mapa.has(ds)) mapa.set(ds, txt_(bm['DC'][i])); });

  const br = lerBase_('Recebimento_DS', ['Scan Time', 'Waybill Number', 'Scan Station', 'Scan State Name'], ['Scan Time']), fuso = br.fuso;
  const tempo = br['Scan Time'], wbs = br['Waybill Number'], sts = br['Scan Station'], ufs = br['Scan State Name'];
  const g = new Map();
  for (let i = 0; i < wbs.length; i++) {
    const wb = norm(wbs[i]), st = txt_(sts[i]), uf = txt_(ufs[i]), data = paraData_(tempo[i], fuso);
    if (!wb || !data || st === 'DC-CE1' || st === 'DC-PI2' || uf === '' || uf === 'C2104008501') continue;
    const dc = mapa.get(st) || 'Não identificado', k = `${data}|${dc}|${st}`;
    const r = g.get(k) || [data, dc, st, 0, 0];
    r[3] += 1; if (!expedidos.has(wb)) r[4] += 1;
    g.set(k, r);
  }
  mesclar_('NoScan', ['Data', 'DC', 'DS', 'Recebidos', 'Sem_Registro'], [...g.values()]);
}

// ---------- Eficiência HC ----------
function eficienciaHC_() {
  const linhas = [];
  for (const ss of abrirTodas_('Eficiencia_HC')) for (const dc of DCS) {
    const aba = ss.getSheetByName(dc), fuso = ss.getSpreadsheetTimeZone();
    if (!aba) continue;
    const datas = lerColuna_(aba, 'DATA'), vol = lerColuna_(aba, 'Volume'), pes = lerColuna_(aba, 'Total de pessoas');
    datas.forEach((d, i) => { const data = paraData_(d, fuso); if (data) linhas.push([data, dc, numero_(vol[i]), numero_(pes[i])]); });
  }
  salvar_('HC', ['Data', 'DC', 'Volume', 'Pessoas'], linhas);
}

// ---------- No Tracking ----------
function noTracking_() {
  const b = lerBase_('No_Tracking', ['Último status', 'Horário da última leitura', 'Última estação de leitura', 'Último tipo de insucesso', 'Station', 'Valor Declarado (Enviado)', 'Número da Etiqueta'], ['Horário da última leitura']), fuso = b.fuso;
  const st = b['Último status'], hr = b['Horário da última leitura'], dc = b['Última estação de leitura'], ins = b['Último tipo de insucesso'], ds = b['Station'], val = b['Valor Declarado (Enviado)'], etq = b['Número da Etiqueta'];
  const datas = hr.map((v) => paraData_(v instanceof Date ? v : txt_(v).slice(0, 10), fuso));
  const ref = datas.filter((d) => d).sort().pop();
  if (!ref) return;
  const mapa = {'devolução consolidada': 'Consolidate Bag', 'Recebido': 'Devolução Aprovada', 'recebido no DS': 'Arrived'};
  const linhas = [], cont = new Map();
  for (let i = 0; i < st.length; i++) {
    const s = txt_(st[i]), d = txt_(dc[i]);
    if (!DCS.includes(d) || s === 'seal vehicle' || !datas[i]) continue;
    if (s === 'unseal vehicle' && txt_(ins[i]) && txt_(ins[i]) !== '(Sem insucesso)') continue;
    const dias = diasEntre_(datas[i], ref);
    if (dias < 2) continue;
    const faixa = dias > 10 ? '4. +10d' : dias >= 7 ? '3. 7-10d' : dias >= 4 ? '2. 4-6d' : '1. 2-3d';
    linhas.push([ref, d, mapa[s] || s || '(vazio)', faixa, dias, txt_(ds[i]), txt_(ins[i]) || '(Sem insucesso)', Math.round(numero_(val[i]) * 100) / 100, txt_(typeof etq[i] === 'number' ? etq[i].toFixed(0) : etq[i])]);
    cont.set(d + '|' + faixa, (cont.get(d + '|' + faixa) || 0) + 1);
  }
  // posição atual (substitui tudo) e histórico diário por DC e faixa
  salvar_('NoTracking', ['Data_Ref', 'DC', 'Status', 'Faixa', 'Dias', 'DS', 'Tipo', 'Valor', 'Etiqueta'], linhas, {chave: () => 'tudo'});
  salvar_('NoTracking_Historico', ['Data_Ref', 'DC', 'Faixa', 'Qtd'], [...cont].map(([k, n]) => [ref, ...k.split('|'), n]), {chave: (r) => String(r[0])});
}

// ---------- Erro de Triagem ----------
function erroTriagem_() {
  const be = lerBase_('Erro_Triagem', ['Waybill', 'Scan Date', 'Station Received', 'DS Delivery Station', 'Responsible'], ['Scan Date']);
  const wb = be['Waybill'], sd = be['Scan Date'], rec = be['Station Received'], cor = be['DS Delivery Station'], resp = be['Responsible'];
  const g = new Map();
  for (let i = 0; i < wb.length; i++) {
    const r = txt_(rec[i]).toUpperCase(), c = txt_(cor[i]).toUpperCase(), data = paraData_(sd[i], '', true); // Scan Date vem como mês/dia/ano
    if (!txt_(wb[i]) || !r.startsWith('DS') || r === c || !data || !DCS.includes(txt_(resp[i]))) continue;
    const k = [data, txt_(resp[i]), r, c].join('|');
    g.set(k, (g.get(k) || 0) + 1);
  }
  salvar_('Erro', ['Data', 'DC', 'DS_Recebeu', 'DS_Correta', 'Erros'], [...g].map(([k, n]) => [...k.split('|'), n]));

  const bt = lerBase_('Taxas', ['Data', 'Station', 'Orders Loading'], ['Data']), fuso = bt.fuso;
  const d = bt['Data'], s = bt['Station'], o = bt['Orders Loading'];
  const t = new Map();
  for (let i = 0; i < d.length; i++) {
    const data = paraData_(d[i] instanceof Date ? d[i] : txt_(d[i]).split(' ')[0], fuso), st = txt_(s[i]);
    if (data && st.startsWith('DC-') && txt_(o[i]) !== '') t.set(data + '|' + st, (t.get(data + '|' + st) || 0) + numero_(o[i]));
  }
  salvar_('Erro_Recebidos', ['Data', 'Station', 'Orders Loading'], [...t].map(([k, n]) => [...k.split('|'), n]));
}

// ---------- Lost ----------
function lost_() {
  const bl = lerBase_('Lost', ['Waybill N', 'Resp', 'Date', 'Uploaded Declared Value', 'Lost request reason', 'Last Scan Type'], ['Date', 'Uploaded Declared Value']);
  const wb = bl['Waybill N'], resp = bl['Resp'], dt = bl['Date'], val = bl['Uploaded Declared Value'], mot = bl['Lost request reason'], scan = bl['Last Scan Type'];
  const g = new Map();
  for (let i = 0; i < wb.length; i++) {
    const dc = txt_(resp[i]), data = paraData_(dt[i], '');
    if (!txt_(wb[i]) || !DCS.includes(dc) || !data) continue;
    const k = [data, dc, txt_(mot[i]), txt_(scan[i])].join('|');
    const r = g.get(k) || [0, 0]; r[0] += 1; r[1] += numero_(val[i]); g.set(k, r);
  }
  salvar_('Lost', ['Data', 'DC', 'Motivo', 'Ultimo_Scan', 'Lost', 'Valor'], [...g].map(([k, [n, v]]) => [...k.split('|'), n, Math.round(v * 100) / 100]));
}

// ---------- Pontualidade de Transporte e Controle de Sacas (mesma base de carregamento) ----------
function horaNum_(v, fuso) { // aaaammddhhmmss, para comparar
  if (v instanceof Date) { const p = (n) => String(n).padStart(2, '0'); return Number(horaLocal_(v, fuso) + p(v.getUTCMinutes()) + p(v.getUTCSeconds())); }
  const t = txt_(v);
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return Number(m[1] + m[2] + m[3] + m[4].padStart(2, '0') + m[5] + (m[6] || '00'));
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return Number(m[3] + m[2].padStart(2, '0') + m[1].padStart(2, '0') + m[4].padStart(2, '0') + m[5] + (m[6] || '00'));
  return null;
}
const cancelado_ = (v) => ['Y', 'YES', 'SIM', 'S', 'TRUE', '1'].includes(txt_(v).toUpperCase());
function carregamento_(dc) {
  const hora = horaNum_;
  const cancelado = (v) => ['Y', 'YES', 'SIM', 'S', 'TRUE', '1'].includes(txt_(v).toUpperCase());
  const base = 'Carregamento_' + dc.slice(3);
  const bl = lerBase_(base, ['Data', 'Waybill No.', 'Vehicle ID', 'Train No', 'Scan Time', 'Is Cancel', 'Scan No.', 'Destination Statio'], ['Data', 'Scan Time']), fuso = bl.fuso;
  const datas = bl['Data'], wbs = bl['Waybill No.'], vids = bl['Vehicle ID'], trens = bl['Train No'];
  const scans = bl['Scan Time'], canc = bl['Is Cancel'], sacas = bl['Scan No.'], destinos = bl['Destination Statio'];

  const rotasDia = new Set(), veiculos = new Map(), enviadas = new Map();
  for (let i = 0; i < datas.length; i++) {
    const scan = scans[i];
    const data = paraData_(datas[i], fuso) || paraData_(scan instanceof Date ? scan : txt_(scan).slice(0, 10), fuso);
    if (!data) continue;
    const rota = txt_(trens[i]) || '(sem rota)', k = `${data}|${rota}`;
    const valido = txt_(scan) && txt_(wbs[i]) && !cancelado(canc[i]);
    if (valido) rotasDia.add(k);
    const vid = txt_(vids[i]).toUpperCase();
    if (vid) veiculos.set(`${k}|${vid}`, [k, vid]);
    const saca = txt_(sacas[i]), ds = txt_(destinos[i]) || '(sem DS)';
    if (valido && saca && saca !== txt_(wbs[i]) && !/^(DC-|CDC|RDC)/i.test(ds)) {
      const ch = `${terca_(data)}|${chaveDS_(ds)}`;
      const e = enviadas.get(ch) || {nomes: new Set(), sacas: new Set()};
      e.nomes.add(ds); e.sacas.add(saca); enviadas.set(ch, e);
    }
  }
  const bro = lerBase_(base, ['Vehicle Id', 'Planned Departure Time', 'Act Departure Time'], ['Planned Departure Time', 'Act Departure Time']);
  const ids = bro['Vehicle Id'], prevs = bro['Planned Departure Time'], reais = bro['Act Departure Time'];
  const porVeiculo = new Map();
  for (let i = 0; i < ids.length; i++) {
    const vid = txt_(ids[i]).toUpperCase();
    if (!vid) continue;
    const prev = hora(prevs[i], fuso), real = hora(reais[i], fuso), a = porVeiculo.get(vid);
    if (!a || (prev != null && (a.prev == null || prev < a.prev))) porVeiculo.set(vid, {prev, real});
  }
  const porRota = new Map();
  for (const [k, vid] of veiculos.values()) {
    const v = porVeiculo.get(vid);
    if (!v) continue;
    const r = porRota.get(k) || {prev: null, real: null};
    if (v.prev != null && (r.prev == null || v.prev < r.prev)) r.prev = v.prev;
    if (v.real != null && (r.real == null || v.real < r.real)) r.real = v.real;
    porRota.set(k, r);
  }
  const g = new Map();
  for (const [k, r] of porRota) {
    if (!rotasDia.has(k) || r.prev == null || r.real == null) continue;
    const data = k.split('|')[0], x = g.get(data) || [data, dc, 0, 0, 0];
    x[2] += 1; if (r.real <= r.prev) x[3] += 1; else x[4] += 1;
    g.set(data, x);
  }
  mesclar_('Pontualidade', ['Data', 'DC', 'Rotas', 'No_Prazo', 'Atrasadas'], [...g.values()], {dc});
  const env = [...enviadas].map(([k, e]) => { const [ini, chave] = k.split('|'); return [ini, dc, chave, [...e.nomes].sort()[0], e.sacas.size]; });
  mesclar_('Sacas_Enviadas', ['Ini_Envio', 'DC', 'Chave_DS', 'DS', 'Enviadas'], env, {dc, chave: (r) => String(r[0])}); // troca por semana
  sacas_();
}

// Enviadas x devolvidas por semana de envio, DC e DS
function sacas_() {
  const portal = SpreadsheetApp.getActiveSpreadsheet();
  const abaEnv = portal.getSheetByName('Sacas_Enviadas');
  const env = abaEnv && abaEnv.getLastRow() > 1 ? abaEnv.getRange(2, 1, abaEnv.getLastRow() - 1, 5).getDisplayValues() : [];
  const bf = lerBase_('Formulario_Sacas', ['Data do Preenchimento', 'DC', 'Quantidade de Sacas', 'DS'], ['Data do Preenchimento']), fuso = bf.fuso;
  const m = new Map();
  const linha = (ini, dc, chave) => { const k = `${ini}|${dc}|${chave}`; if (!m.has(k)) m.set(k, {ini, dc, ds: '', env: 0, dev: 0}); return m.get(k); };
  env.forEach(([ini, dc, chave, ds, n]) => { if (!ini) return; const r = linha(ini, dc, chave); r.ds = r.ds || ds; r.env += numero_(n); });
  bf['Data do Preenchimento'].forEach((v, i) => {
    const data = paraData_(v, fuso);
    if (!data) return;
    const d = new Date(terca_(data) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 7);
    const ds = txt_(bf['DS'][i]) || '(sem DS)', x = linha(d.toISOString().slice(0, 10), dcPadrao_(bf['DC'][i]), chaveDS_(ds));
    x.ds = x.ds || ds; x.dev += numero_(bf['Quantidade de Sacas'][i]);
  });
  mesclar_('Sacas', ['Ini_Envio', 'DC', 'DS', 'Enviadas', 'Devolvidas'], [...m.values()].map((r) => [r.ini, r.dc, r.ds, r.env, r.dev]), {chave: () => 'tudo'});
}

// =====================================================================
// Banco de dados (Supabase) — fase 1: No Scan
// Copia do Sheet para o banco só as colunas que o cálculo usa; o banco recalcula o resumo.
// Configuração (uma vez): Apps Script → Configurações do projeto (engrenagem) → Propriedades do script:
//   SUPABASE_URL = https://xxxx.supabase.co
//   SUPABASE_KEY = chave SECRETA do Supabase (sb_secret_... ou service_role). Nunca colocar no site/GitHub.
// Sem essas propriedades, a sincronização não faz nada.
// =====================================================================
function supa_() {
  const p = PropertiesService.getScriptProperties();
  const url = txt_(p.getProperty('SUPABASE_URL')).replace(/\/+$/, ''), key = txt_(p.getProperty('SUPABASE_KEY'));
  if (!url || !key) return null;
  const headers = {apikey: key};
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key; // chave antiga (JWT)
  return {url, headers};
}
function isoHora_(v) { // texto de data/hora → 'aaaa-mm-dd hh:mm:ss'
  const t = txt_(v);
  let m = t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')} ${m[4].padStart(2, '0')}:${m[5]}:${m[6] || '00'}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')} ${m[4].padStart(2, '0')}:${m[5]}:${m[6] || '00'}`;
  return '';
}
// Envia em lotes (vários pedidos ao mesmo tempo). conflito = colunas da chave; mesclar = atualizar se já existe.
function enviarBanco_(cfg, tabela, linhas, conflito, mesclar, limiteMs) {
  const LOTE = 2500, PARALELO = 3, inicio = Date.now();
  const pedidos = [];
  for (let i = 0; i < linhas.length; i += LOTE) {
    pedidos.push({
      url: `${cfg.url}/rest/v1/${tabela}` + (conflito ? `?on_conflict=${encodeURIComponent(conflito)}` : ''), method: 'post', contentType: 'application/json',
      headers: Object.assign({Prefer: conflito ? `resolution=${mesclar ? 'merge' : 'ignore'}-duplicates,return=minimal` : 'return=minimal'}, cfg.headers),
      payload: JSON.stringify(linhas.slice(i, i + LOTE)), muteHttpExceptions: true,
    });
  }
  const confere = (r) => {
    if (r.getResponseCode() >= 300) throw new Error(`Supabase ${tabela}: ${r.getResponseCode()} ${r.getContentText().slice(0, 300)}`);
  };
  for (let i = 0; i < pedidos.length; i += PARALELO) {
    if (limiteMs && Date.now() - inicio > limiteMs) return false; // continua na próxima rodada
    const grupo = pedidos.slice(i, i + PARALELO);
    try {
      UrlFetchApp.fetchAll(grupo).forEach(confere);
    } catch (e) {
      if (String(e).includes('Supabase')) throw e; // erro do banco: não adianta repetir
      // falha de conexão: manda um por vez, com até 3 tentativas
      grupo.forEach((pedido) => {
        for (let t = 1; ; t++) {
          try { confere(UrlFetchApp.fetch(pedido.url, pedido)); break; } catch (e2) {
            if (String(e2).includes('Supabase') || t >= 3) throw e2;
            Utilities.sleep(3000 * t);
          }
        }
      });
    }
  }
  return true;
}

/**
 * Lê só as linhas NOVAS de uma base desde a última carga (marca por planilha/aba nas propriedades),
 * no máximo `limite` linhas por parte. Relê 200 linhas antes da marca por segurança (duplicadas são
 * ignoradas pelo banco). Se a aba encolheu (dados colados de novo), recomeça do início.
 * Devolve as colunas + `marcas` para gravar depois que o envio der certo.
 */
function lerNovas_(base, colunas, exibidas, limite, obrigatorias) { // obrigatorias: colunas que toda linha pronta tem
  obrigatorias = obrigatorias || [colunas[0]];
  const props = PropertiesService.getScriptProperties();
  const out = {fuso: null, marcas: {}, completo: true, origem: []};
  colunas.forEach((c) => { out[c] = []; });
  for (const ss of abrirTodas_(base)) {
    out.fuso = out.fuso || ss.getSpreadsheetTimeZone();
    const aba = abaCom_(ss, colunas), cab = cabecalho_(aba), ultima = aba.getLastRow();
    const chave = `marca|${base}|${ss.getId()}|${aba.getSheetId()}`;
    const marca = Number(props.getProperty(chave) || 1);
    const ini = marca > ultima ? 2 : Math.max(2, marca - 200);
    const fim = Math.min(ultima, ini + limite - 1);
    if (fim < ultima) out.completo = false;
    out.marcas[chave] = marca; // só avança depois de ver quais linhas já estão prontas
    if (fim < ini) continue;
    for (let l = ini; l <= fim; l++) out.origem.push(`${ss.getId()}:${aba.getSheetId()}:${l}`);
    const lidas = {};
    colunas.forEach((c) => {
      const r = aba.getRange(ini, cab.indexOf(c) + 1, fim - ini + 1, 1);
      lidas[c] = (exibidas.includes(c) ? r.getDisplayValues() : r.getValues()).map((x) => x[0]);
      lidas[c].forEach((x) => out[c].push(x));
    });
    // A marca para na última linha preenchida: linhas do fim que ainda estão em branco (base sendo colada
    // ou atualizada naquele momento) são lidas de novo na próxima rodada, em vez de ficarem para trás.
    let ultimaPronta = -1;
    for (let i = fim - ini; i >= 0; i--) if (obrigatorias.every((c) => txt_(lidas[c][i]) !== '')) { ultimaPronta = i; break; }
    if (ultimaPronta >= 0) out.marcas[chave] = ini + ultimaPronta;
    if (ini + ultimaPronta < fim) out.completo = false;
  }
  return out;
}

function sincronizarBanco() {
  const cfg = supa_();
  if (!cfg) return; // banco ainda não configurado
  const props = PropertiesService.getScriptProperties();
  const norm = (v) => txt_(typeof v === 'number' ? v.toFixed(0) : v).toUpperCase();
  const LIMITE = 100000; // linhas novas por base em cada rodada (a primeira carga leva algumas rodadas)

  // mapa DS × DC (pequeno: manda tudo, atualizando)
  const bm = lerBase_('Mapa_DS_DC', ['DS', 'DC']), mapa = new Map();
  bm['DS'].forEach((x, i) => { const ds = txt_(x); if (ds.startsWith('DS ') && !mapa.has(ds)) mapa.set(ds, txt_(bm['DC'][i])); });
  enviarBanco_(cfg, 'mapa_ds_dc', [...mapa].map(([ds, dc]) => ({ds, dc})), 'ds', true);

  // recebimento na DS (mesmos filtros do No Scan)
  const br = lerNovas_('Recebimento_DS', ['Scan Time', 'Waybill Number', 'Scan Station', 'Scan State Name'], ['Scan Time'], LIMITE, ['Scan Time', 'Waybill Number']);
  const rec = [];
  br['Waybill Number'].forEach((w, i) => {
    const wb = norm(w), st = txt_(br['Scan Station'][i]), uf = txt_(br['Scan State Name'][i]), hora = isoHora_(br['Scan Time'][i]);
    if (!wb || !hora || st === 'DC-CE1' || st === 'DC-PI2' || uf === '' || uf === 'C2104008501') return;
    rec.push({data: hora.slice(0, 10), scan_time: hora, ds: st, waybill: wb});
  });
  enviarBanco_(cfg, 'recebimento_ds', rec, 'waybill,scan_time,ds', false);
  Object.entries(br.marcas).forEach(([k, v]) => props.setProperty(k, String(v)));

  // expedição do DC (só o waybill e a data)
  const be = lerNovas_('Expedicao_DC', ['Waybill No.', 'Scan Time'], ['Scan Time'], LIMITE, ['Waybill No.']);
  const exp = [];
  be['Waybill No.'].forEach((w, i) => {
    const wb = norm(w), hora = isoHora_(be['Scan Time'][i]);
    if (wb) exp.push({waybill: wb, data: hora ? hora.slice(0, 10) : null});
  });
  enviarBanco_(cfg, 'expedicao_dc', exp, 'waybill', false);
  Object.entries(be.marcas).forEach(([k, v]) => props.setProperty(k, String(v)));

  // recalcula no banco e traz o resultado para a Portal_Dados
  recalcularBanco_(cfg, 'noscan');
  const linhas = [];
  for (let off = 0; ; off += 1000) { // o Supabase entrega no máximo 1000 linhas por pedido
    const g = UrlFetchApp.fetch(`${cfg.url}/rest/v1/resumo_noscan?select=*&order=Data.asc,DC.asc,DS.asc&limit=1000&offset=${off}`, {headers: cfg.headers, muteHttpExceptions: true});
    if (g.getResponseCode() >= 300) throw new Error('Supabase resumo_noscan: ' + g.getContentText().slice(0, 300));
    const lote = JSON.parse(g.getContentText());
    lote.forEach((x) => linhas.push([x.Data, x.DC, x.DS, x.Recebidos, x.Sem_Registro]));
    if (lote.length < 1000) break;
  }
  comTrava_(() => {
    const aba = props.getProperty('banco_noscan_destino') || 'NoScan'; // No Scan agora vem do banco (conferido em 16/11)
    mesclar_(aba, ['Data', 'DC', 'DS', 'Recebidos', 'Sem_Registro'], linhas, {chave: () => 'tudo'});
  });
  if (!br.completo || !be.completo) console.log('Carga inicial ainda em andamento: rode de novo (ou espere a fila).');
}
// Roda fn com a trava da planilha; se a fila estiver ocupada por mais de 20 s, desiste (fica para a próxima rodada).
function comTrava_(fn) {
  const trava = LockService.getScriptLock();
  if (trava.hasLock()) { fn(); return true; }
  if (!trava.tryLock(20000)) { console.log('Fila ocupada com outra tarefa: as abas serão atualizadas na próxima rodada (os dados já estão no banco).'); return false; }
  try { fn(); return true; } finally { trava.releaseLock(); }
}
// Lê um resumo do banco (de 1000 em 1000) e grava numa aba da Portal_Dados.
function trazerResumo_(cfg, visao, colunas, aba, cabecalhoAba) { // cabecalhoAba: nomes na aba, se diferentes dos do banco
  const linhas = [];
  for (let off = 0; ; off += 1000) {
    const g = UrlFetchApp.fetch(`${cfg.url}/rest/v1/${visao}?select=*&order=${colunas.map((c) => encodeURIComponent(c) + '.asc').join(',')}&limit=1000&offset=${off}`, {headers: cfg.headers, muteHttpExceptions: true});
    if (g.getResponseCode() >= 300) throw new Error(`Supabase ${visao}: ` + g.getContentText().slice(0, 300));
    const lote = JSON.parse(g.getContentText());
    lote.forEach((x) => linhas.push(colunas.map((c) => x[c])));
    if (lote.length < 1000) break;
  }
  mesclar_(aba, cabecalhoAba || colunas, linhas, {chave: () => 'tudo'});
}
function recalcularBanco_(cfg, area) { // area: 'noscan', 'offloading' ou 'carregamento' (só os resumos dela)
  const r = UrlFetchApp.fetch(`${cfg.url}/rest/v1/rpc/atualizar_resumos`, {method: 'post', contentType: 'application/json', headers: cfg.headers, payload: JSON.stringify({area}), muteHttpExceptions: true});
  if (r.getResponseCode() >= 300) throw new Error('Supabase atualizar_resumos: ' + r.getContentText().slice(0, 300));
}

// ---------- OffLoading no banco (recebido e consolidado) ----------
function sincronizarOffLoading() {
  const cfg = supa_();
  if (!cfg) return;
  const props = PropertiesService.getScriptProperties();
  const LIMITE = 30000, inicio = Date.now(); // pedaços menores: cada rodada fica bem abaixo dos 6 minutos
  let completo = true;
  [['Descarregamento', 'Estacao_Descarregamento', 'Hora_Bipe', 'offloading_recebido'],
   ['Consolidacao', 'Scan Station', 'Scan Time', 'offloading_consolidado']].forEach(([base, colunaDC, colunaHora, tabela]) => {
    if (Date.now() - inicio > 150000) { completo = false; return; } // sem tempo: fica para a próxima rodada
    const b = lerNovas_(base, ['Data_Operacao', colunaDC, colunaHora], ['Data_Operacao', colunaHora], LIMITE, ['Data_Operacao', colunaDC]);
    const linhas = [];
    b['Data_Operacao'].forEach((d, i) => {
      const data = paraData_(d, b.fuso), dc = txt_(b[colunaDC][i]), h = isoHora_(b[colunaHora][i]);
      if (data && dc) linhas.push({origem: b.origem[i], data, dc, hora: h ? Number(h.slice(11, 13)) : null});
    });
    enviarBanco_(cfg, tabela, linhas, 'origem', true);
    Object.entries(b.marcas).forEach(([k, v]) => props.setProperty(k, String(v)));
    completo = completo && b.completo;
  });
  recalcularBanco_(cfg, 'offloading');
  const sufixo = props.getProperty('banco_offloading_sufixo') ?? ''; // OffLoading agora vem do banco (conferido em 16/11)
  comTrava_(() => {
    trazerResumo_(cfg, 'resumo_offloading_recebido', ['Data', 'DC', 'Recebido'], 'OffLoading_Recebido' + sufixo);
    trazerResumo_(cfg, 'resumo_offloading_consolidado', ['Data', 'DC', 'Consolidado'], 'OffLoading_Consolidado' + sufixo);
    trazerResumo_(cfg, 'resumo_offloading_hora', ['Data', 'DC', 'Hora', 'Recebido', 'Consolidado'], 'OffLoading_Hora');
  });
  if (!completo) console.log('Carga inicial ainda em andamento: rode de novo (ou espere a fila).');
}

// ---------- Pontualidade e Sacas enviadas no banco (base de carregamento de cada DC) ----------
function sincronizarCarregamento() {
  const cfg = supa_();
  if (!cfg) return;
  const props = PropertiesService.getScriptProperties();
  const LIMITE = 30000, inicio = Date.now();
  let completo = true;
  ['DC-PI2', 'DC-CE1', 'DC-PI3'].forEach((dc) => {
    if (Date.now() - inicio > 100000) { completo = false; return; } // sem tempo: fica para a próxima rodada
    const base = 'Carregamento_' + dc.slice(3);
    // leituras novas: rotas × veículos, rotas válidas e sacas enviadas (sem repetir)
    const b = lerNovas_(base, ['Data', 'Waybill No.', 'Vehicle ID', 'Train No', 'Scan Time', 'Is Cancel', 'Scan No.', 'Destination Statio'], ['Data', 'Scan Time'], LIMITE, ['Waybill No.', 'Scan Time']);
    const rv = new Map(), ok = new Map(), sc = new Map();
    b['Data'].forEach((d, i) => {
      const scan = b['Scan Time'][i];
      const data = paraData_(d, b.fuso) || paraData_(txt_(scan).slice(0, 10), b.fuso);
      if (!data) return;
      const rota = txt_(b['Train No'][i]) || '(sem rota)', wb = txt_(b['Waybill No.'][i]);
      const valido = txt_(scan) && wb && !cancelado_(b['Is Cancel'][i]);
      if (valido) ok.set(`${data}|${rota}`, {dc, data, rota});
      const vid = txt_(b['Vehicle ID'][i]).toUpperCase();
      if (vid) rv.set(`${data}|${rota}|${vid}`, {dc, data, rota, vid});
      const saca = txt_(b['Scan No.'][i]), ds = txt_(b['Destination Statio'][i]) || '(sem DS)';
      if (valido && saca && saca !== wb && !/^(DC-|CDC|RDC)/i.test(ds)) {
        const semana = terca_(data), chave = chaveDS_(ds);
        sc.set(`${semana}|${chave}|${saca}`, {dc, semana, chave_ds: chave, saca, ds});
      }
    });
    enviarBanco_(cfg, 'rota_veiculo', [...rv.values()], 'dc,data,rota,vid', false);
    enviarBanco_(cfg, 'rota_valida', [...ok.values()], 'dc,data,rota', false);
    enviarBanco_(cfg, 'saca_enviada', [...sc.values()], 'dc,semana,chave_ds,saca', false);
    Object.entries(b.marcas).forEach(([k, v]) => props.setProperty(k, String(v)));
    completo = completo && b.completo;
    // saídas dos veículos (aba de rotas, pequena: manda tudo e atualiza)
    const bro = lerBase_(base, ['Vehicle Id', 'Planned Departure Time', 'Act Departure Time'], ['Planned Departure Time', 'Act Departure Time']);
    const pv = new Map();
    bro['Vehicle Id'].forEach((x, i) => {
      const vid = txt_(x).toUpperCase();
      if (!vid) return;
      const prev = horaNum_(bro['Planned Departure Time'][i], bro.fuso), real = horaNum_(bro['Act Departure Time'][i], bro.fuso), a = pv.get(vid);
      if (!a || (prev != null && (a.prev == null || prev < a.prev))) pv.set(vid, {dc, vid, prev, real});
    });
    enviarBanco_(cfg, 'partida', [...pv.values()], 'dc,vid', true);
    console.log(`${dc}: ${b['Data'].length} leituras enviadas (${Math.round((Date.now() - inicio) / 1000)} s)`);
  });
  recalcularBanco_(cfg, 'carregamento');
  const sufixo = props.getProperty('banco_carregamento_sufixo') ?? ''; // Pontualidade e Sacas agora vêm do banco (conferido em 17/11)
  comTrava_(() => {
    trazerResumo_(cfg, 'resumo_pontualidade', ['Data', 'DC', 'Rotas', 'No_Prazo', 'Atrasadas'], 'Pontualidade' + sufixo);
    trazerResumo_(cfg, 'resumo_sacas_enviadas', ['Ini_Envio', 'DC', 'Chave_DS', 'DS', 'Enviadas'], 'Sacas_Enviadas' + sufixo);
    if (!sufixo) sacas_(); // junta com as devolvidas do formulário
  });
  if (!completo) console.log('Carga inicial ainda em andamento: rode de novo (ou espere a fila).');
}

// Manual, uma vez: reenvia o OffLoading desde o início (para preencher a hora das linhas já enviadas).
function recarregarOffLoading() {
  const props = PropertiesService.getScriptProperties();
  props.getKeys().filter((k) => k.startsWith('marca|Descarregamento|') || k.startsWith('marca|Consolidacao|')).forEach((k) => props.deleteProperty(k));
  sincronizarOffLoading();
}

// ---------- Indicadores leves no banco (HC, No Tracking, Erro de Triagem e Lost) ----------
const TABELAS_LEVES = {HC: 'hc', NoTracking: 'no_tracking', NoTracking_Historico: 'no_tracking_historico', Erro: 'erro', Erro_Recebidos: 'erro_recebidos', Lost: 'lost'};
const nomeBanco_ = (c) => c.replace(/ /g, '_'); // 'Orders Loading' → 'Orders_Loading'
function apagarBanco_(cfg, tabela, filtro) {
  const r = UrlFetchApp.fetch(`${cfg.url}/rest/v1/${tabela}?${filtro}`, {method: 'delete', headers: Object.assign({Prefer: 'return=minimal'}, cfg.headers), muteHttpExceptions: true});
  if (r.getResponseCode() >= 300) throw new Error(`Supabase apagar ${tabela}: ${r.getContentText().slice(0, 300)}`);
}
function sincronizarLeves() {
  const cfg = supa_();
  if (!cfg) return;
  const props = PropertiesService.getScriptProperties();
  const sufixo = props.getProperty('banco_leves_sufixo') ?? ''; // HC, No Tracking, Erro e Lost agora vêm do banco (conferido em 20/11)
  const importar = !props.getProperty('leves_importado'); // 1ª vez: leva ao banco o histórico que já está nas abas
  COLETA_ = [];
  try {
    [eficienciaHC_, noTracking_, erroTriagem_, lost_].forEach((f) => { try { f(); } catch (e) { console.error(f.name, e); } });
  } finally {
    var coletas = COLETA_; COLETA_ = null;
  }
  const q = encodeURIComponent;
  coletas.forEach(({nomeAba, cabecalho, novas, opcoes}) => {
    const tabela = TABELAS_LEVES[nomeAba], col = cabecalho.map(nomeBanco_), c0 = q(col[0]);
    const tudo = opcoes.chave && opcoes.chave(novas[0] || []) === 'tudo';
    if (importar && !tudo) { // junta as linhas antigas da aba que esta rodada não substitui
      const ss = SpreadsheetApp.getActiveSpreadsheet(), aba = ss.getSheetByName(nomeAba), fuso = ss.getSpreadsheetTimeZone();
      const chaveDe = opcoes.chave ? (r) => String(r[0]) : (r) => String(r[0]).slice(0, 7);
      const trocar = new Set(novas.map(chaveDe));
      const velhas = aba && aba.getLastRow() > 1 ? aba.getRange(2, 1, aba.getLastRow() - 1, cabecalho.length).getValues()
        .map((r) => [r[0] instanceof Date ? Utilities.formatDate(r[0], fuso, 'yyyy-MM-dd') : String(r[0]), ...r.slice(1)])
        .filter((r) => r[0] && !trocar.has(chaveDe(r))) : [];
      apagarBanco_(cfg, tabela, `${q(col[1])}=not.is.null`);
      novas = [...velhas, ...novas];
    } else
    // troca no banco o mesmo pedaço que a aba trocaria: o mês (padrão), tudo, ou a data de referência
    if (tudo) apagarBanco_(cfg, tabela, `${q(col[1])}=not.is.null`);
    else if (opcoes.chave) [...new Set(novas.map((r) => String(r[0])))].forEach((d) => apagarBanco_(cfg, tabela, `${c0}=eq.${d}`));
    else [...new Set(novas.map((r) => String(r[0]).slice(0, 7)))].forEach((m) => {
      const [a, mm] = m.split('-').map(Number), prox = mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}`;
      apagarBanco_(cfg, tabela, `${c0}=gte.${m}-01&${c0}=lt.${prox}-01`);
    });
    const objs = novas.map((r) => Object.fromEntries(col.map((c, i) => [c, r[i] === '' ? null : r[i]])));
    enviarBanco_(cfg, tabela, objs, null, false);
  });
  if (importar) props.setProperty('leves_importado', 'sim');
  comTrava_(() => coletas.forEach(({nomeAba, cabecalho}) => trazerResumo_(cfg, TABELAS_LEVES[nomeAba], cabecalho.map(nomeBanco_), nomeAba + sufixo, cabecalho)));
}

// Manual, uma vez (20/11): relê o OffLoading a partir de 17/11, onde faltaram linhas.
function recarregarOffLoadingDesde17() { recarregarOffLoadingDesde_('2026-11-17'); }
function recarregarOffLoadingDesde_(dataIso) {
  const props = PropertiesService.getScriptProperties();
  ['Descarregamento', 'Consolidacao'].forEach((base) => {
    for (const ss of abrirTodas_(base)) {
      const aba = abaCom_(ss, ['Data_Operacao']), cab = cabecalho_(aba), n = aba.getLastRow() - 1;
      if (n < 1) continue;
      // a base está em ordem de data: busca binária lendo uma célula por vez (a coluna inteira é grande demais)
      const col = cab.indexOf('Data_Operacao') + 1, fuso = ss.getSpreadsheetTimeZone();
      const dataDa = (linha) => paraData_(aba.getRange(linha, col).getDisplayValue(), fuso) || '';
      let lo = 2, hi = n + 2; // primeira linha com data >= dataIso fica em [lo, hi)
      while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (dataDa(m) >= dataIso) hi = m; else lo = m + 1; }
      if (lo > n + 1) continue;
      const i = lo - 2;
      props.setProperty(`marca|${base}|${ss.getId()}|${aba.getSheetId()}`, String(i + 2 + 200)); // a leitura volta 200 linhas
      console.log(`${base}: relendo a partir da linha ${i + 2}`);
    }
  });
  sincronizarOffLoading();
}

function sincronizarBancoTudo() { // manual: reenvia tudo desde o começo (se corrigiu dados antigos)
  const props = PropertiesService.getScriptProperties();
  props.getKeys().filter((k) => k.startsWith('marca|')).forEach((k) => props.deleteProperty(k));
  sincronizarBanco();
  sincronizarOffLoading();
  sincronizarCarregamento();
}
