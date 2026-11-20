-- Indicadores leves (Eficiência HC, Erro de Triagem, No Tracking e Lost) no banco.
-- O script já calcula os resumos; o banco guarda o histórico com os mesmos nomes de coluna das abas
-- (espaço vira _). A cada rodada o script troca o mesmo pedaço que trocava na aba (o mês, ou tudo).
create table if not exists public.hc (
  id bigint generated always as identity primary key,
  "Data" date not null, "DC" text not null, "Volume" numeric, "Pessoas" numeric
);
create table if not exists public.erro (
  id bigint generated always as identity primary key,
  "Data" date not null, "DC" text not null, "DS_Recebeu" text, "DS_Correta" text, "Erros" int
);
create table if not exists public.erro_recebidos (
  id bigint generated always as identity primary key,
  "Data" date not null, "Station" text not null, "Orders_Loading" numeric
);
create table if not exists public.lost (
  id bigint generated always as identity primary key,
  "Data" date not null, "DC" text not null, "Motivo" text, "Ultimo_Scan" text, "Lost" int, "Valor" numeric
);
create table if not exists public.no_tracking (          -- posição atual (trocada inteira a cada rodada)
  id bigint generated always as identity primary key,
  "Data_Ref" date not null, "DC" text not null, "Status" text, "Faixa" text, "Dias" int, "DS" text
);
create table if not exists public.no_tracking_historico (
  id bigint generated always as identity primary key,
  "Data_Ref" date not null, "DC" text not null, "Faixa" text, "Qtd" int
);
create index if not exists hc_data_idx on public.hc ("Data");
create index if not exists erro_data_idx on public.erro ("Data");
create index if not exists erro_recebidos_data_idx on public.erro_recebidos ("Data");
create index if not exists lost_data_idx on public.lost ("Data");
create index if not exists no_tracking_historico_data_idx on public.no_tracking_historico ("Data_Ref");
alter table public.hc enable row level security;
alter table public.erro enable row level security;
alter table public.erro_recebidos enable row level security;
alter table public.lost enable row level security;
alter table public.no_tracking enable row level security;
alter table public.no_tracking_historico enable row level security;
