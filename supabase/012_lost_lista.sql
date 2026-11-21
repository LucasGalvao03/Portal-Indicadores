-- Lost: um pacote por linha (últimos extraviados e download da base no site)
create table if not exists public.lost_lista (
  id bigint generated always as identity primary key,
  "Data" date not null, "DC" text not null, "Waybill" text, "Valor" numeric, "Motivo" text, "Ultimo_Scan" text, "Obs" text
);
create index if not exists lost_lista_data_idx on public.lost_lista ("Data");
alter table public.lost_lista enable row level security;
