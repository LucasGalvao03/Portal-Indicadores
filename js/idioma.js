/* ===== Idioma do portal: Português · 中文 · Bilíngue (PT / 中文) =====
   Traduz os textos da tela depois que cada painel desenha (não mexe nos números, nomes de DS, operadores etc.). */
(() => {
  const CHAVE = 'portal_idioma';
  let idioma = 'pt';
  try { idioma = localStorage.getItem(CHAVE) || 'pt'; } catch (e) { /* sem armazenamento */ }

  // frases (as mais longas primeiro na hora de aplicar)
  const D = {
    // menu e títulos
    'Portal de Indicadores · iMile Nordeste II': '指标门户 · iMile 东北二区',
    'Portal de Indicadores': '指标门户',
    'Nordeste II': '东北二区',
    'Relatórios': '报表',
    'Geral': '概览',
    'Visão geral': '总览',
    'Ranking': '排名',
    'Ao vivo': '实时',
    'Indicadores': '指标',
    'Indicador': '指标',
    'Controles': '管控',
    'Erro de Triagem': '分拣错误',
    'Eficiência HC': '人效',
    'Pontualidade de Transporte': '运输准点率',
    'Pontualidade': '准点率',
    'Controle de Sacas': '集包袋管控',
    'Sobre os dados': '关于数据',
    'DC-PI2, DC-CE1 e DC-PI3': 'DC-PI2、DC-CE1 和 DC-PI3',
    'Sair': '退出',
    // login
    'Entrar com Feishu': '使用飞书登录',
    'Use sua conta Feishu da iMile para ver os indicadores.': '请使用 iMile 飞书账号登录查看指标。',
    'Acesso restrito à equipe iMile': '仅限 iMile 团队访问',
    'Entrando…': '登录中…',
    'Sua sessão expirou. Entre de novo.': '会话已过期，请重新登录。',
    'Login não confirmado. Tente de novo.': '登录未确认，请重试。',
    'Não foi possível entrar: ': '无法登录：',
    // visão geral / ranking
    'Resumo semanal dos indicadores': '指标周汇总',
    'Resultado de cada DC na semana operacional (terça a segunda), comparado com a meta e o desafio.': '各 DC 在运营周（周二至周一）的结果，与目标和挑战值对比。',
    'Status por indicador e DC': '各指标与 DC 状态',
    'Explicações e planos de ação': '原因说明与行动计划',
    'O que os gestores registraram para os indicadores fora da meta na semana escolhida.': '所选周内未达标指标的负责人说明。',
    'Explicação e plano ainda não preenchidos.': '尚未填写说明与计划。',
    'Nenhum indicador fora da meta nesta semana.': '本周没有未达标的指标。',
    'Por que aconteceu': '原因',
    'Plano de ação': '行动计划',
    'Ranking de indicadores dos DCs': 'DC 指标排名',
    'Período do ranking': '排名周期',
    'Pontos por indicador': '各指标得分',
    'Semanal': '每周',
    'Mensal': '每月',
    'Semana operacional de ': '运营周 ',
    'resultados dentro da meta ou do desafio.': '个结果达到目标或挑战值。',
    ' Fora da meta: ': ' 未达标：',
    'Fora da meta: ': '未达标：',
    'Resultados por status, por semana': '每周各状态结果',
    'Conta, em cada semana, quantos resultados bateram o desafio, ficaram dentro da meta ou ficaram fora.': '统计每周达成挑战、达标和未达标的结果数量。',
    'Desafio atingido': '达成挑战',
    'Dentro da meta': '达标',
    'Fora da meta': '未达标',
    'dentro da meta': '达标',
    'fora da meta': '未达标',
    'bateram o desafio': '达成挑战',
    'Meta · Desafio': '目标 · 挑战',
    'Meta': '目标',
    'Desafio': '挑战',
    'meta': '目标',
    'desafio': '挑战',
    'maior é melhor': '越高越好',
    'menor é melhor': '越低越好',
    'pedidos parados · menor é melhor': '滞留订单 · 越低越好',
    'vs semana anterior': '对比上周',
    'vs sem. ant.': '对比上周',
    'Sem. ant.': '上周',
    'Semana anterior': '上周',
    'Semana atual': '本周',
    'Última semana fechada': '上一个完整周',
    'Última semana fechada (ter–seg)': '上一个完整周（周二–周一）',
    'Período anterior': '上一周期',
    'Δ vs anterior': 'Δ 对比上期',
    '🥇 1º lugar': '🥇 第1名',
    '🥈 2º lugar': '🥈 第2名',
    '🥉 3º lugar': '🥉 第3名',
    'de 130 possíveis · ': '（满分130）· ',
    'pts': '分',
    'Taxa de Consolidação': '集包率',
    'Taxa de consolidação': '集包率',
    'Taxa de No Scan': 'No Scan 率',
    'Taxa de Erro de Triagem': '分拣错误率',
    'No Tracking 4+ dias': 'No Tracking 4天以上',
    'Rotas atrasadas': '延误线路',
    'Produtividade por pessoa': '人均效率',
    'Pacotes por pessoa': '人均件量',
    // OffLoading
    'OffLoading · Taxa de consolidação': 'OffLoading · 集包率',
    'Pacotes consolidados em saca sobre os pacotes recebidos, por dia. Meta 80% · desafio 90%. Lido direto do Google Sheets a cada abertura.': '每日已集包件量占到件量的比例。目标 80% · 挑战 90%。',
    'Total Recebido': '到件总量',
    'Total Consolidado': '集包总量',
    'Consolidado x Recebido %': '集包/到件 %',
    'Recebido (dia)': '到件（日）',
    'Consolid. (dia)': '集包（日）',
    'Recebido x Consolidado': '到件 x 集包',
    'Recebido': '到件',
    'Consolidado': '集包',
    '% Consolidado': '% 集包',
    'Descarregamento por hora': '每小时卸货',
    'Consolidação por hora': '每小时集包',
    'Descarregamento x Consolidação por hora': '每小时卸货 x 集包',
    'Média por hora': '小时平均',
    'Horas com movimento': '作业小时数',
    'Visão diária': '每日视图',
    'Painel do período': '周期面板',
    'Dia de referência ': '参考日 ',
    'Dia anterior ': '前一天 ',
    'Dia ant.': '前一天',
    'Mês ant.': '上月',
    'Total D-1': 'D-1 合计',
    'Total Geral': '总计',
    'Total por DC': '各 DC 合计',
    'Total': '合计',
    'Pico': '峰值',
    'Sem dados por hora para este dia.': '该日无分时数据。',
    // No Scan
    'No Scan · Pedidos sem registro de expedição': 'No Scan · 无发货扫描订单',
    'Pedidos recebidos na DS sem bipe de expedição no DC, sobre o total recebido. Meta até 1% · desafio até 0,7%.': '网点已收到但 DC 无发货扫描的订单占比。目标 ≤1% · 挑战 ≤0.7%。',
    'Total Recebido (DS)': '网点到件总量',
    'Sem Registro': '无记录',
    'Sem registro': '无记录',
    '% Sem Registro': '% 无记录',
    'Média Diária': '日均',
    'Pedidos sem registro': '无记录订单',
    'DS com pedidos sem registro': '有无记录订单的网点',
    'As 5 DSs com mais pedidos sem registro em cada DC.': '各 DC 无记录订单最多的 5 个网点。',
    'Nenhuma DS com pedido sem registro no período.': '该周期内没有网点出现无记录订单。',
    'Só o dia': '仅当天',
    'Semana até o dia': '本周至当天',
    'Dia do filtro': '筛选日',
    'Acum. semana até': '本周累计至',
    'Média/dia sem. anterior': '上周日均',
    '% sem registro': '% 无记录',
    'Dia ': '日期 ',
    // No Tracking
    'No Tracking · Pacotes sem rastreio': 'No Tracking · 无轨迹包裹',
    'Pacotes parados sem nova leitura, por faixa de dias. O indicador acompanha os parados há 4 dias ou mais. Metas: PI2 até 80 · CE1 até 30 · PI3 até 20.': '按天数区间统计无新扫描的滞留包裹。指标跟踪滞留 4 天及以上的包裹。目标：PI2 ≤80 · CE1 ≤30 · PI3 ≤20。',
    'Dias sem rastreio': '无轨迹天数',
    'Crítico +10 dias': '严重 10天以上',
    '+10 dias': '10天以上',
    'Pacotes parados há mais de 7 dias': '滞留超过 7 天的包裹',
    'Último status': '最后状态',
    'Pacotes por último status': '按最后状态统计包裹',
    'Tipo de insucesso': '失败类型',
    'Número da Etiqueta': '面单号',
    'Valor declarado': '申报价值',
    'Valor R$': '价值 R$',
    'Limpar filtro': '清除筛选',
    'Nada com esses filtros.': '没有符合筛选条件的数据。',
    'Todas as DSs': '全部网点',
    'Posição de ': '截至 ',
    // Erro
    'Erro de Triagem · Pacotes enviados para a DS errada': '分拣错误 · 发往错误网点的包裹',
    'Erros de triagem sobre o total recebido, por dia. Meta até 0,1% · desafio até 0,04%.': '每日分拣错误占到件总量的比例。目标 ≤0.1% · 挑战 ≤0.04%。',
    'Total erros': '错误总数',
    'Taxa de erro (rate)': '错误率',
    'Erros por DS que recebeu': '按收错网点统计错误',
    'DS que recebeu': '收件网点',
    'DS correta': '正确网点',
    'DS destino': '目的网点',
    'Orders Loading': '装车订单',
    // HC
    'Eficiência HC · Produtividade por pessoa': '人效 · 人均效率',
    'Volume recebido dividido pela quantidade de pessoas no dia (pacotes por pessoa). Metas: PI2 800 · CE1 e PI3 850. Desafios: PI2 850 · CE1 e PI3 900.': '当日到件量除以人数（人均件量）。目标：PI2 800 · CE1 和 PI3 850。挑战：PI2 850 · CE1 和 PI3 900。',
    'Eficiência do dia': '当日人效',
    'Eficiência do dia e resumo': '当日人效与汇总',
    'Volume Recebido': '到件量',
    'Qtd de Pessoas (HC-dia)': '人数（HC/日）',
    'Média HC por dia': '日均人数',
    'Produtividade (pct/pessoa)': '效率（件/人）',
    'Produtividade por DC no período': '周期内各 DC 效率',
    'Produtividade por DC no período (pct/pessoa)': '周期内各 DC 效率（件/人）',
    'Pacotes por pessoa por dia e DC': '各 DC 每日人均件量',
    'Data inicial': '开始日期',
    'Data final': '结束日期',
    'Voltar ao padrão': '恢复默认',
    'Sem dados da Eficiência HC.': '无人效数据。',
    // Pontualidade
    'Rotas de transferência que saíram do DC depois do horário previsto. Meta até 7% de rotas atrasadas · desafio 0%.': '晚于计划时间离开 DC 的转运线路。目标：延误线路 ≤7% · 挑战 0%。',
    'Por DC': '按 DC',
    'Rotas e DS': '线路与网点',
    'Saiu no prazo': '准时发车',
    'Atraso médio na saída': '平均发车延误',
    'Maior rota': '最大线路',
    'Média por rota': '线路平均',
    'Tolerância (min)': '容差（分钟）',
    'Meta (min)': '目标（分钟）',
    'Duração exped.': '发货时长',
    'DS atendidas': '服务网点',
    'Pacotes do DC': 'DC 件量',
    'Sem rotas nesse período.': '该周期无线路。',
    '✓ No prazo': '✓ 准时',
    '⏳ Aguard.': '⏳ 等待中',
    '⚠ sem ID': '⚠ 无ID',
    '1º bipe': '首次扫描',
    'Último bipe': '最后扫描',
    'rotas': '线路',
    'atrasadas': '延误',
    // Lost
    'Lost · Pacotes extraviados': 'Lost · 丢失包裹',
    'Pacotes Lost': '丢失包裹',
    'Pacotes lost no período': '周期内丢失包裹',
    'Pacotes lost por semana e DC': '各 DC 每周丢失包裹',
    'Lost por semana e DC': '各 DC 每周丢失',
    'Valor declarado perdido': '丢失申报价值',
    'Taxa de extravio': '丢失率',
    'Motivos do Lost (Lost request reason)': '丢失原因',
    'Onde o pacote foi visto por último (Last Scan Type)': '包裹最后扫描位置',
    'Últimos pacotes extraviados — 15 mais recentes': '最近丢失的包裹 — 最新 15 个',
    'Último scan': '最后扫描',
    'Sem dados do Lost.': '无丢失数据。',
    '(sem motivo)': '（无原因）',
    '(sem scan)': '（无扫描）',
    'lost por dia em média': '日均丢失',
    'do total': '占总量',
    // Sacas
    'Controle de Sacas · DS → DC': '集包袋管控 · 网点 → DC',
    'Sacas enviadas do DC para as DSs na semana e quantas já voltaram. Meta: devolver todas.': '本周 DC 发往网点的集包袋及已返还数量。目标：全部返还。',
    'Sacas enviadas': '已发集包袋',
    'Sacas devolvidas': '已返还集包袋',
    'Saldo a devolver': '待返还',
    '% Devolução': '% 返还',
    'Sem devolução': '未返还',
    'DSs sem devolução': '未返还网点',
    'Detalhe por DS': '网点明细',
    'Painel': '面板',
    'Sem especialista': '无负责人',
    '(sem especialista)': '（无负责人）',
    'Semana de envio ': '发出周 ',
    'Total (todas as semanas)': '合计（全部周）',
    'faltam voltar': '待返还',
    'tudo devolvido': '已全部返还',
    'devolvidas a mais': '多返还',
    'Sem dados das sacas.': '无集包袋数据。',
    'Sem envios nesta semana.': '本周无发出。',
    'Parcial': '部分',
    'Completa': '完成',
    'Enviadas': '已发出',
    'Devolvidas': '已返还',
    'Especialista': '负责人',
    'Lançamentos': '登记次数',
    'Último lançamento': '最后登记',
    // Ao vivo
    'Ao vivo · Recebimento (descarregamento e consolidação)': '实时 · 收货（卸货与集包）',
    'Ao vivo · Expedição (carregamento)': '实时 · 发货（装车）',
    'Ao vivo · Recebimento': '实时 · 收货',
    'Ao vivo · Expedição': '实时 · 发货',
    'Rotas sendo carregadas, veículos, operadores e ritmo da expedição, puxados do LoadingScan pelo robô da operação a cada 3 minutos.': '正在装车的线路、车辆、操作员和发货速率，由作业现场机器人每 3 分钟从 LoadingScan 拉取。',
    'O robô da operação puxa os bipes do sistema da iMile a cada 3 minutos. Escolha o DC e o intervalo (pode atravessar a meia-noite).': '作业现场的机器人每 3 分钟从 iMile 系统拉取扫描数据。请选择 DC 和时间段（可跨午夜）。',
    'AO VIVO': '实时',
    'Online agora': '当前在线',
    'Bom dia': '早上好', 'Boa tarde': '下午好', 'Boa noite': '晚上好', 'Boa madrugada': '凌晨好',
    '🔍 Buscar no portal': '🔍 在门户中搜索', '🔍 Buscar': '🔍 搜索', '📺 Modo TV': '📺 电视模式', '✕ Sair do Modo TV': '✕ 退出电视模式',
    'O que você procura? (aba, tema, idioma, chat…)': '你要找什么？（页面、主题、语言、聊天…）', '↑↓ navegar · Enter abrir · Esc fechar': '↑↓ 选择 · Enter 打开 · Esc 关闭',
    'Nada encontrado.': '没有结果。', 'Abrir aba': '打开页面', 'Aparência': '外观', 'Idioma': '语言', 'Página': '页面',
    'Tema claro': '浅色主题', 'Tema escuro': '深色主题', 'Tema automático': '自动主题', 'Abrir chat da equipe': '打开团队聊天',
    'Modo TV do Ao vivo': '实时电视模式', 'Tela cheia, troca de DC sozinha': '全屏，自动切换 DC', 'Voltar ao topo': '回到顶部', 'Recarregar o portal': '重新加载门户',
    'O robô ainda está alcançando o horário atual — as rotas em carregamento aparecem aqui assim que ele chegar em agora.': '机器人仍在追赶当前时间——追上后这里会显示正在装车的线路。',
    'Nenhuma rota sendo carregada agora (sem bipe de carregamento nos últimos 30 min).': '当前没有正在装车的线路（最近 30 分钟无装车扫描）。',
    '📥 Recebimento': '📥 收货', '🚚 Expedição': '🚚 发货', 'Expedição': '发货', 'Pacotes carregados': '已装车件量', 'Veículos': '车辆',
    'placas diferentes': '不同车牌', 'das rotas do período': '周期内线路合计', 'carregando agora': '正在装车', 'Rotas no pátio agora': '当前场内线路',
    'finalizada': '已完成', 'no período': '周期内', 'Rotas do período': '周期内线路', 'Placa': '车牌', 'Motorista': '司机', 'Início': '开始',
    'Duração': '时长', 'Situação': '状态', 'Carregamento por operador': '按操作员统计装车', 'Carregamento por destino': '按目的地统计装车',
    'Sem rotas neste intervalo.': '该时段无线路。', 'últimos 30 min do intervalo': '时段内最后30分钟', '1º ao último bipe': '首次至最后扫描',
    'A expedição ainda não está ligada no robô. Assim que ele começar a puxar o LoadingScan, os dados aparecem aqui.': '机器人尚未开启发货数据。开始拉取 LoadingScan 后，数据将显示在这里。',
    'Rotas, pacotes e rankings somam blocos de 15 minutos; sacas são o total de cada rota. "Carregando agora" = bipe nos últimos 10 min.': '线路、件量和排名按 15 分钟区块汇总；集包袋为各线路合计。“正在装车”= 最近 10 分钟内有扫描。',
    '🌐 Traduzir': '🌐 翻译',
    'Traduzir automático': '自动翻译',
    '🌐 Tradução indisponível': '🌐 翻译不可用',
    'Chat da equipe': '团队聊天',
    'Chat': '聊天',
    'mensagens ficam 7 dias': '消息保留 7 天',
    'Escreva uma mensagem…': '输入消息…',
    'Enviar': '发送',
    'Você': '我',
    'Fechar': '关闭',
    'Muitas mensagens seguidas. Espere um pouco.': '发送过于频繁，请稍候。',
    '⟳ Atualizar': '⟳ 刷新',
    '⟳ Atualizando…': '⟳ 刷新中…',
    'PARADO': '已停止',
    'Hoje': '今天',
    'Ontem': '昨天',
    'Ontem 18h → agora': '昨天18点 → 现在',
    'Últimas 3 h': '最近3小时',
    'De': '从',
    'Até': '至',
    'até agora (ao vivo)': '至现在（实时）',
    'robô atualizou às': '机器人更新于',
    'a tela atualiza sozinha a cada minuto': '页面每分钟自动刷新',
    'Descarregamento': '卸货',
    'Consolidação': '集包',
    'Descarregados': '已卸货',
    'Consolidados': '已集包',
    'Consolidado x Descarregado': '集包 / 卸货',
    'Ritmo': '速率',
    'descarga · últimos 30 min do intervalo': '卸货 · 时段内最后30分钟',
    'Tempo total': '总时长',
    'descarga · 1º ao último bipe': '卸货 · 首次至最后扫描',
    'Tempo parado': '停顿时长',
    'Tempo líquido': '净作业时长',
    'Pacotes/hora': '件/小时',
    'no tempo líquido': '按净作业时长',
    'Pacotes por hora': '每小时件量',
    'Pacotes a cada 15 min': '每15分钟件量',
    'Descarregamento por operador': '按操作员统计卸货',
    'Consolidação por operador': '按操作员统计集包',
    'Consolidação por destino': '按目的地统计集包',
    'Os rankings somam blocos de 15 minutos; os totais e tempos são minuto a minuto. O painel guarda ontem e hoje.': '排名按 15 分钟区块汇总；合计与时长按分钟计算。面板保存昨天和今天的数据。',
    'em andamento': '进行中',
    'bipando agora': '正在扫描',
    'operação encerrada': '作业已结束',
    'atualizando…': '更新中…',
    'atualizando': '更新中',
    'puxou até': '已拉取至',
    'última rodada': '最近一次运行',
    'último bipe': '最后扫描',
    'sem bipes no intervalo': '时段内无扫描',
    'Sem bipes neste intervalo.': '该时段无扫描。',
    'Sem dados neste intervalo.': '该时段无数据。',
    'sem operação hoje': '今日无作业',
    'robô com erro, tentando de novo': '机器人出错，正在重试',
    'agora': '现在',
    'pausas >': '停顿 >',
    'O token do sistema iMile expirou: o robô parou de puxar dados. Atualize o TOKEN no config.py do robô e reinicie.': 'iMile 系统令牌已过期：机器人已停止拉取数据。请更新机器人 config.py 中的 TOKEN 并重启。',
    'O robô teve erro em: ': '机器人出错：',
    'Não foi possível ler o painel ao vivo agora.': '暂时无法读取实时面板。',
    'descarregados': '已卸货',
    'consolidados': '已集包',
    'descarregamento': '卸货',
    'consolidação': '集包',
    // complementos
    "fora": "未达标",
    "varia por DC": "因 DC 而异",
    "Faixa": "区间",
    "selecionados": "已选",
    "dias": "天",
    "(Sem insucesso)": "（无失败）",
    "Avaria": "破损",
    "Por faixa e DC": "按区间与 DC",
    "No Tracking por DC e faixa": "各 DC 各区间 No Tracking",
    "DSs de destino (10 maiores)": "目的网点（前10）",
    "Pacotes": "包裹",
    "% Repres.": "% 占比",
    "% Acum.": "% 累计",
    "Histórico diário": "每日历史",
    "Evolução": "趋势",
    "Última data na base": "数据最新日期",
    "Dias com operação": "作业天数",
    "Posição": "排名",
    "Sacas": "集包袋",
    "Rotas": "线路",
    "Pac/hora": "件/小时",
    "ant.": "上期",
    "Parado": "停顿",
    "— sem base anterior": "— 无上期数据",
    "Variação": "变化",
    "Evolução semanal — últimas 8 semanas (todos os DCs)": "每周趋势 — 最近 8 周（全部 DC）",
    "Descrição": "描述",
    "Qtd": "数量",
    "Obs": "备注",
    "Últ. lançamento": "最后登记",
    "Histórico semanal": "每周历史",
    "semana de envio (terça a segunda) × sacas lançadas na semana seguinte": "发出周（周二至周一）× 次周登记的集包袋",
    "% Dev.": "% 返还",
    "Por especialista — quem está com sacas para devolver na semana escolhida (todos os DCs)": "按负责人 — 所选周有待返还集包袋（全部 DC）",
    "Por especialista — quem está com sacas para devolver no período (todos os DCs)": "按负责人 — 该周期有待返还集包袋（全部 DC）",
    "Especialistas · ordenado pelo maior saldo a devolver": "负责人 · 按待返还数量排序",
    "DSs": "网点",
    "DSs sem dev.": "未返还网点",
    "Saldo": "余额",
    "DSs sem nenhuma devolução": "完全未返还的网点",
    "Especialistas": "负责人",
    "Rotas — ": "线路 — ",
    "Rotas atrasadas por dia e DC": "各 DC 每日延误线路",
    "Taxa de consolidação por dia e DC": "各 DC 每日集包率",
    "Taxa de erro de triagem diária por DC": "各 DC 每日分拣错误率",
    "Consolidado e taxa dos últimos 7 dias": "最近 7 天集包量与比率",
    "Acumulado do mês por DC": "各 DC 本月累计",
    "Data de referência": "参考日期",
    "Semana de ": "周 ",
    "Mês de operação": "运营月",
    "parcial": "部分",
    "Período: ": "周期：",
    "Por DC — ": "按 DC — ",
    "Diário — últimos 30 dias até a data final": "每日 — 截至结束日期最近 30 天",
    "Mensal — últimos 6 meses até a data final": "每月 — 截至结束日期最近 6 个月",
    "Semanal — semana operacional terça a segunda, últimas 12 semanas até a data final": "每周 — 运营周（周二至周一），截至结束日期最近 12 周",
    "Os 20 de maior valor entre": "价值最高的 20 个，共",
    "pacotes extraviados no período": "个周期内丢失包裹",
    "no total": "合计",
    "Valor médio por pacote": "单件平均价值",
    "Taxa": "比率",
    "Rate": "比率",
    "dos erros": "的错误",
    "Conta os pacotes com erro de triagem do último dia pela DS que recebeu o pacote por engano.": "按误收网点统计最近一天的分拣错误包裹。",
    "DSs que receberam pacotes por engano em": "误收包裹的网点，日期",
    "Hora do scan na DS": "网点扫描时间",
    "Envio": "发出",
    "Janela de devolução": "返还窗口",
    "Último lançamento": "最后登记",
    "Mostrando até 15 especialistas e 15 DSs.": "最多显示 15 位负责人和 15 个网点。",
    "Lista completa em \"Detalhe por DS\".": "完整列表见“网点明细”。",
    "Soma as sacas enviadas e devolvidas das DSs de cada especialista, por semana de envio.": "按发出周汇总每位负责人所辖网点的已发与已返还集包袋。",
    "Sacas por especialista e semana": "按负责人与周统计集包袋",
    "Meta devolução (%) ": "返还目标 (%) ",
    "das sacas devolvidas": "的集包袋已返还",
    "Por DC  ·  ▲▼ vs. semana anterior  ·  Devolvidas = sacas lançadas na semana seguinte ao envio": "按 DC · ▲▼ 对比上周 · 已返还 = 发出次周登记的集包袋",
    "* semana em andamento": "* 进行中的周",
    "Semana operacional": "运营周",
    "Saldo a devolver": "待返还",
    "Rate ": "比率 ",
    // genéricos
    'Carregando…': '加载中…',
    'Sem dados.': '无数据。',
    'Sem dados': '无数据',
    'sem dados': '无数据',
    'Sem dados no período.': '该周期无数据。',
    'Sem operação': '无作业',
    'Sem operação nesse período.': '该周期无作业。',
    'Sem histórico ainda.': '暂无历史数据。',
    'Falha ao carregar.': '加载失败。',
    'Gráfico de barras': '柱状图',
    'Gráfico de linhas': '折线图',
    '⬇ Baixar base (carregando…)': '⬇ 下载数据（加载中…）',
    '⬇ Baixar base': '⬇ 下载数据',
    '⬇ Baixar base filtrada': '⬇ 下载筛选数据',
    'Baixar base': '下载数据',
    'carregando…': '加载中…',
    'pacotes': '件',
    'pedidos': '单',
    'erros': '错误',
    'pessoas': '人',
    'Semana': '周',
    'Mês': '月',
    'Dia': '日',
    'Data': '日期',
    'Hora': '时间',
    'Período': '周期',
    'Todos': '全部',
    'Todas': '全部',
    'Operador': '操作员',
    'Destino': '目的地',
    'Motivo': '原因',
    'Valor': '价值',
    'Status': '状态',
    'Taxa': '比率',
    'Atual': '当前',
    'Anterior': '上期',
    'Em andamento': '进行中',
    'em andamento': '进行中',
    '(ter a seg)': '（周二至周一）',
    'ter a seg': '周二至周一',
    'Semana (ter→seg)': '周（周二→周一）',
    'ter': '周二', 'qua': '周三', 'qui': '周四', 'sex': '周五', 'sáb': '周六', 'dom': '周日', 'seg': '周一',
  };
  const chaves = Object.keys(D).sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // fronteira: a frase não pode estar colada em outra letra
  const RE = new RegExp(`(?<![A-Za-zÀ-ÿ])(?:${chaves.map(esc).join('|')})(?![A-Za-zÀ-ÿ])`, 'g');
  const LETRA = /[A-Za-zÀ-ÿ]{2}/;

  const orig = new WeakMap(); // texto original em português de cada nó traduzido
  const feito = new WeakMap(); // texto que nós mesmos colocamos
  function traduzTexto(t) {
    const nucleo = t.trim();
    if (!nucleo || !LETRA.test(nucleo)) return null;
    let zh;
    if (D[nucleo]) zh = t.replace(nucleo, D[nucleo]);
    else {
      let mudou = false;
      zh = t.replace(RE, (m) => { mudou = true; return D[m]; });
      const z2 = zh.replace(/(\d{2}\/\d{2}(?:\/\d{4})?) a (\d{2}\/\d{2})/g, '$1 至 $2'); // "17/11 a 23/11"
      if (z2 !== zh) { zh = z2; mudou = true; }
      if (!mudou) return null;
    }
    if (idioma === 'zh') return zh;
    const zn = zh.trim();
    return t.replace(nucleo, nucleo.length > 60 ? `${nucleo} ／ ${zn}` : `${nucleo} / ${zn}`);
  }
  const pula = (n) => { const p = n.parentElement; return !p || p.closest('script, style, textarea, [data-sem-traducao], .av-nome, .lg-ceu'); };
  function no(n) {
    if (pula(n)) return;
    const atual = n.data;
    if (feito.get(n) === atual) return; // já é nosso
    const pt = atual; // texto novo vindo do painel (em português)
    orig.set(n, pt);
    if (idioma === 'pt') return;
    const t = traduzTexto(pt);
    if (t != null && t !== atual) { feito.set(n, t); n.data = t; }
  }
  const ATRS = ['title', 'placeholder', 'aria-label'];
  function atributos(el) {
    if (el.closest && el.closest('[data-sem-traducao]')) return;
    ATRS.forEach((a) => {
      const v = el.getAttribute && el.getAttribute(a);
      if (!v) return;
      const k = 'data-pt-' + a;
      let pt = el.getAttribute(k);
      if (pt == null || (el.getAttribute('data-tr-' + a) !== v)) { pt = v; el.setAttribute(k, pt); }
      const t = idioma === 'pt' ? pt : (traduzTexto(pt) ?? pt);
      if (t !== v) el.setAttribute(a, t);
      el.setAttribute('data-tr-' + a, t);
    });
  }
  function varre(raiz) {
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) no(n);
    if (raiz.querySelectorAll) raiz.querySelectorAll('[title],[placeholder],[aria-label]').forEach(atributos);
  }
  // volta tudo ao português e aplica de novo (ao trocar de idioma)
  function reaplica() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const pt = orig.get(n); if (pt != null && n.data === feito.get(n)) { n.data = pt; feito.delete(n); } }
    varre(document.body);
    document.documentElement.lang = idioma === 'zh' ? 'zh-CN' : 'pt-BR';
    document.querySelectorAll('.idi-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.idioma === idioma)));
  }
  let pend = new Set(), agendado = false;
  const obs = new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') { if (feito.get(m.target) !== m.target.data) pend.add(m.target); }
      else m.addedNodes.forEach((n) => pend.add(n));
    }
    if (!agendado && pend.size) {
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        const lote = pend; pend = new Set();
        lote.forEach((n) => { if (!n.isConnected) return; if (n.nodeType === 3) no(n); else if (n.nodeType === 1) varre(n); });
      });
    }
  });

  // seletor de idioma (menu lateral e tela de login)
  function seletor() {
    const box = document.createElement('div'); box.className = 'idi'; box.setAttribute('data-sem-traducao', '');
    [['pt', 'PT'], ['zh', '中文'], ['bi', 'PT/中文']].forEach(([k, t]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'idi-btn'; b.dataset.idioma = k; b.textContent = t;
      b.setAttribute('aria-pressed', String(k === idioma));
      b.addEventListener('click', () => { idioma = k; try { localStorage.setItem(CHAVE, k); } catch (e) { /* nada */ } reaplica(); });
      box.append(b);
    });
    return box;
  }
  window.PORTAL_IDIOMA = {seletor, get: () => idioma};
  function iniciar() {
    const pe = document.querySelector('.pt-side-foot');
    if (pe) pe.before(seletor());
    varre(document.body);
    document.documentElement.lang = idioma === 'zh' ? 'zh-CN' : 'pt-BR';
    obs.observe(document.body, {subtree: true, childList: true, characterData: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
