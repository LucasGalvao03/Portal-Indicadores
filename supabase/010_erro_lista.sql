-- Erro de Triagem: um pacote por linha (para baixar a base no site)
create table if not exists public.erro_lista (
  id bigint generated always as identity primary key,
  "Data" date not null, "DC" text not null, "Waybill" text, "DS_Recebeu" text, "DS_Correta" text, "Cliente" text
);
create index if not exists erro_lista_data_idx on public.erro_lista ("Data");
alter table public.erro_lista enable row level security;
