# Portal de Indicadores · iMile Nordeste II

Site com os indicadores dos DCs PI2, CE1 e PI3. Publicado no Netlify a partir deste repositório: cada mudança na branch `main` atualiza o site sozinha.

## Onde mexer

| Quero mudar… | Arquivo |
|---|---|
| Links do Google Sheets (Publicar na Web → CSV) | `js/config.js` |
| Textos, títulos e a ordem das seções | `index.html` |
| Cores, fontes e espaçamentos | `css/estilo.css` |
| Gráficos e tabelas de cada relatório | `js/secoes/*.js` |
| Como os dados do Sheets são lidos | `js/inicio.js` |
| Cálculos (acumulados, taxas) | `js/fontes-e-calculos.js` |
| Regras do resumo semanal e do ranking (status, pontos) | `js/resumo-ranking.js` |
| Números de novembro (usados enquanto a seção não está ao vivo) | `dados/novembro.js` |

Não editar: `vendor/d3.min.js` (biblioteca dos gráficos).

## De onde vêm os dados

Tudo passa pela planilha **Portal_Dados** (permanente, não muda de mês):

1. As bases de cada mês ficam em planilhas próprias (descarregamento, consolidação, carregamento, No Tracking, Lost…).
2. A aba **Config** da Portal_Dados tem o link da planilha de cada base no mês atual.
3. O script `apps-script/portal_dados.gs` (instalado na Portal_Dados) lê essas bases a cada hora, calcula os resumos com as regras dos relatórios em Excel e grava nas abas da Portal_Dados, guardando o histórico dos meses anteriores.
4. A Portal_Dados é publicada na web (CSV) e os links de cada aba ficam em `js/config.js`. O site lê essas abas sempre que a página abre.

**Virada do mês:** criar as planilhas novas e colar os links delas na aba Config. Mais nada.

O site mostra os gráficos e acumulados do mês operacional atual (da 1ª terça do mês até a véspera da 1ª terça do mês seguinte). A Visão geral e o Ranking (`js/resumo-ranking.js`) usam todo o histórico guardado; semanas sem dado guardado mantêm os números do Excel (`dados/novembro.js`).

No fim da página, em "Sobre os dados", aparece de onde cada seção está lendo.

## Testar no computador

Basta abrir o `index.html` no navegador (dois cliques).

## Script do Google (apps-script/)

`portal_dados.gs`: fica na planilha Portal_Dados (Extensões → Apps Script). Depois de colar, executar `configurar` uma vez: cria a aba Config, agenda as atualizações a cada hora (cada parte em uma execução, por causa do limite de 6 minutos do Google) e faz uma primeira rodada nos minutos seguintes.
