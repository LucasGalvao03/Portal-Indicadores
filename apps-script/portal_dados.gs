/**
 * Portal de Indicadores · Nordeste II — script da planilha "Portal_Dados"
 *
 * A Portal_Dados é permanente: o site lê só as abas dela, então os links publicados nunca mudam.
 * Este script busca os dados nas planilhas do mês (listadas na aba Config), calcula os resumos
 * com as mesmas regras dos relatórios em Excel e grava aqui, a cada hora.
 *
 * Virada do mês: crie as planilhas novas e cole os links delas na aba Config. Só isso.
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
const FUNCOES = ['atualizarRecebido', 'atualizarConsolidado', 'atualizarNoScan', 'atualizarCarregamentoPI2',
  'atualizarCarregamentoCE1', 'atualizarCarregamentoPI3', 'atualizarLeves'];

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
  atualizarLeves: () => atualizarLeves(),
};
function atualizarLeves() { // bases pequenas, uma não impede a outra
  [eficienciaHC_, noTracking_, erroTriagem_, lost_].forEach((f) => { try { f(); } catch (e) { console.error(f.name, e); } });
}

// ---------- utilidades ----------
function config_() {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  const linhas = aba ? aba.getDataRange().getValues().slice(1) : [];
  const m = new Map(BASES.map(([b, id]) => [b, id]));
  linhas.forEach(([b, link]) => {
    const t = String(link || '').trim(), id = (t.match(/\/d\/([\w-]+)/) || [null, t])[1];
    if (String(b).trim() && id) m.set(String(b).trim(), id);
  });
  return m;
}
function abrir_(base) {
  const id = config_().get(base);
  if (!id) throw new Error(`Base "${base}" sem link na aba Config`);
  return SpreadsheetApp.openById(id);
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
function paraData_(v, fuso, mesPrimeiro) { // → aaaa-mm-dd
  if (v instanceof Date) {
    const k = v.getTime() + '|' + fuso;
    let r = CACHE_DATAS_.get(k);
    if (r === undefined) { r = Utilities.formatDate(v, fuso, 'yyyy-MM-dd'); CACHE_DATAS_.set(k, r); }
    return r;
  }
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
  const ss = abrir_(base), fuso = ss.getSpreadsheetTimeZone();
  const aba = abaCom_(ss, ['Data_Operacao', colunaDC]);
  const datas = lerColuna_(aba, 'Data_Operacao'), dcs = lerColuna_(aba, colunaDC);
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
  const exp = abrir_('Expedicao_DC');
  const expedidos = new Set(lerColuna_(abaCom_(exp, ['Waybill No.']), 'Waybill No.').map(norm));
  const mapa = new Map();
  const abaMapa = abaCom_(abrir_('Mapa_DS_DC'), ['DS', 'DC']), cm = cabecalho_(abaMapa);
  abaMapa.getDataRange().getValues().slice(1).forEach((r) => { const ds = txt_(r[cm.indexOf('DS')]); if (ds.startsWith('DS ') && !mapa.has(ds)) mapa.set(ds, txt_(r[cm.indexOf('DC')])); });

  const ss = abrir_('Recebimento_DS'), fuso = ss.getSpreadsheetTimeZone();
  const rec = abaCom_(ss, ['Scan Time', 'Waybill Number', 'Scan Station', 'Scan State Name']);
  const tempo = lerColuna_(rec, 'Scan Time'), wbs = lerColuna_(rec, 'Waybill Number');
  const sts = lerColuna_(rec, 'Scan Station'), ufs = lerColuna_(rec, 'Scan State Name');
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
  const ss = abrir_('Eficiencia_HC'), fuso = ss.getSpreadsheetTimeZone(), linhas = [];
  for (const dc of DCS) {
    const aba = ss.getSheetByName(dc);
    if (!aba) continue;
    const datas = lerColuna_(aba, 'DATA'), vol = lerColuna_(aba, 'Volume'), pes = lerColuna_(aba, 'Total de pessoas');
    datas.forEach((d, i) => { const data = paraData_(d, fuso); if (data) linhas.push([data, dc, numero_(vol[i]), numero_(pes[i])]); });
  }
  mesclar_('HC', ['Data', 'DC', 'Volume', 'Pessoas'], linhas);
}

// ---------- No Tracking ----------
function noTracking_() {
  const ss = abrir_('No_Tracking'), fuso = ss.getSpreadsheetTimeZone();
  const aba = abaCom_(ss, ['Último status', 'Horário da última leitura', 'Última estação de leitura']);
  const st = lerColuna_(aba, 'Último status'), hr = lerColuna_(aba, 'Horário da última leitura');
  const dc = lerColuna_(aba, 'Última estação de leitura'), ins = lerColuna_(aba, 'Último tipo de insucesso'), ds = lerColuna_(aba, 'Station');
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
    linhas.push([ref, d, mapa[s] || s || '(vazio)', faixa, dias, txt_(ds[i])]);
    cont.set(d + '|' + faixa, (cont.get(d + '|' + faixa) || 0) + 1);
  }
  // posição atual (substitui tudo) e histórico diário por DC e faixa
  mesclar_('NoTracking', ['Data_Ref', 'DC', 'Status', 'Faixa', 'Dias', 'DS'], linhas, {chave: () => 'tudo'});
  mesclar_('NoTracking_Historico', ['Data_Ref', 'DC', 'Faixa', 'Qtd'], [...cont].map(([k, n]) => [ref, ...k.split('|'), n]), {chave: (r) => String(r[0])});
}

// ---------- Erro de Triagem ----------
function erroTriagem_() {
  const ss = abrir_('Erro_Triagem');
  const aba = abaCom_(ss, ['Waybill', 'Scan Date', 'Station Received', 'DS Delivery Station', 'Responsible']);
  const wb = lerColuna_(aba, 'Waybill'), sd = lerColuna_(aba, 'Scan Date', true);
  const rec = lerColuna_(aba, 'Station Received'), cor = lerColuna_(aba, 'DS Delivery Station'), resp = lerColuna_(aba, 'Responsible');
  const g = new Map();
  for (let i = 0; i < wb.length; i++) {
    const r = txt_(rec[i]).toUpperCase(), c = txt_(cor[i]).toUpperCase(), data = paraData_(sd[i], '', true); // Scan Date vem como mês/dia/ano
    if (!txt_(wb[i]) || !r.startsWith('DS') || r === c || !data || !DCS.includes(txt_(resp[i]))) continue;
    const k = [data, txt_(resp[i]), r, c].join('|');
    g.set(k, (g.get(k) || 0) + 1);
  }
  mesclar_('Erro', ['Data', 'DC', 'DS_Recebeu', 'DS_Correta', 'Erros'], [...g].map(([k, n]) => [...k.split('|'), n]));

  const tx = abrir_('Taxas'), fuso = tx.getSpreadsheetTimeZone();
  const at = abaCom_(tx, ['Data', 'Station', 'Orders Loading']);
  const d = lerColuna_(at, 'Data'), s = lerColuna_(at, 'Station'), o = lerColuna_(at, 'Orders Loading');
  const t = new Map();
  for (let i = 0; i < d.length; i++) {
    const data = paraData_(d[i] instanceof Date ? d[i] : txt_(d[i]).split(' ')[0], fuso), st = txt_(s[i]);
    if (data && st.startsWith('DC-') && txt_(o[i]) !== '') t.set(data + '|' + st, (t.get(data + '|' + st) || 0) + numero_(o[i]));
  }
  mesclar_('Erro_Recebidos', ['Data', 'Station', 'Orders Loading'], [...t].map(([k, n]) => [...k.split('|'), n]));
}

// ---------- Lost ----------
function lost_() {
  const ss = abrir_('Lost');
  const aba = abaCom_(ss, ['Waybill N', 'Resp', 'Date', 'Uploaded Declared Value']);
  const wb = lerColuna_(aba, 'Waybill N'), resp = lerColuna_(aba, 'Resp'), dt = lerColuna_(aba, 'Date', true);
  const val = lerColuna_(aba, 'Uploaded Declared Value', true), mot = lerColuna_(aba, 'Lost request reason'), scan = lerColuna_(aba, 'Last Scan Type');
  const g = new Map();
  for (let i = 0; i < wb.length; i++) {
    const dc = txt_(resp[i]), data = paraData_(dt[i], '');
    if (!txt_(wb[i]) || !DCS.includes(dc) || !data) continue;
    const k = [data, dc, txt_(mot[i]), txt_(scan[i])].join('|');
    const r = g.get(k) || [0, 0]; r[0] += 1; r[1] += numero_(val[i]); g.set(k, r);
  }
  mesclar_('Lost', ['Data', 'DC', 'Motivo', 'Ultimo_Scan', 'Lost', 'Valor'], [...g].map(([k, [n, v]]) => [...k.split('|'), n, Math.round(v * 100) / 100]));
}

// ---------- Pontualidade de Transporte e Controle de Sacas (mesma base de carregamento) ----------
function carregamento_(dc) {
  const hora = (v, fuso) => { // aaaammddhhmmss, para comparar
    if (v instanceof Date) return Number(Utilities.formatDate(v, fuso, 'yyyyMMddHHmmss'));
    const t = txt_(v);
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return Number(m[1] + m[2] + m[3] + m[4].padStart(2, '0') + m[5] + (m[6] || '00'));
    m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return Number(m[3] + m[2].padStart(2, '0') + m[1].padStart(2, '0') + m[4].padStart(2, '0') + m[5] + (m[6] || '00'));
    return null;
  };
  const cancelado = (v) => ['Y', 'YES', 'SIM', 'S', 'TRUE', '1'].includes(txt_(v).toUpperCase());
  const ss = abrir_('Carregamento_' + dc.slice(3)), fuso = ss.getSpreadsheetTimeZone();
  const leitura = abaCom_(ss, ['Train No', 'Vehicle ID', 'Scan Time']);
  const datas = lerColuna_(leitura, 'Data'), wbs = lerColuna_(leitura, 'Waybill No.'), vids = lerColuna_(leitura, 'Vehicle ID');
  const trens = lerColuna_(leitura, 'Train No'), scans = lerColuna_(leitura, 'Scan Time'), canc = lerColuna_(leitura, 'Is Cancel');
  const sacas = lerColuna_(leitura, 'Scan No.'), destinos = lerColuna_(leitura, 'Destination Statio');

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
  const abaRotas = abaCom_(ss, ['Vehicle Id', 'Planned Departure Time', 'Act Departure Time']);
  const ids = lerColuna_(abaRotas, 'Vehicle Id'), prevs = lerColuna_(abaRotas, 'Planned Departure Time'), reais = lerColuna_(abaRotas, 'Act Departure Time');
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
  const form = abrir_('Formulario_Sacas'), fuso = form.getSpreadsheetTimeZone();
  const aba = abaCom_(form, ['Data do Preenchimento']), cab = cabecalho_(aba);
  const dados = aba.getDataRange().getValues().slice(1);
  const cD = cab.indexOf('Data do Preenchimento'), cDC = cab.indexOf('DC'), cQ = cab.indexOf('Quantidade de Sacas'), cDS = cab.indexOf('DS');
  const m = new Map();
  const linha = (ini, dc, chave) => { const k = `${ini}|${dc}|${chave}`; if (!m.has(k)) m.set(k, {ini, dc, ds: '', env: 0, dev: 0}); return m.get(k); };
  env.forEach(([ini, dc, chave, ds, n]) => { if (!ini) return; const r = linha(ini, dc, chave); r.ds = r.ds || ds; r.env += numero_(n); });
  dados.forEach((r) => {
    const data = paraData_(r[cD], fuso);
    if (!data) return;
    const d = new Date(terca_(data) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 7);
    const ds = txt_(r[cDS]) || '(sem DS)', x = linha(d.toISOString().slice(0, 10), dcPadrao_(r[cDC]), chaveDS_(ds));
    x.ds = x.ds || ds; x.dev += numero_(r[cQ]);
  });
  mesclar_('Sacas', ['Ini_Envio', 'DC', 'DS', 'Enviadas', 'Devolvidas'], [...m.values()].map((r) => [r.ini, r.dc, r.ds, r.env, r.dev]), {chave: () => 'tudo'});
}
