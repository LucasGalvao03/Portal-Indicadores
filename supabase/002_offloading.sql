-- OffLoading (recebido no descarregamento e consolidado) no banco.
-- Cada linha da base vira uma linha aqui; a chave é a linha de origem (planilha + nº da linha),
-- para a contagem ficar idêntica à de antes (que conta linhas).
create table if not exists public.offloading_recebido (
  origem text primary key,      -- id da planilha : nº da linha
  data date not null,
  dc text not null
);
create index if not exists offloading_recebido_data_idx on public.offloading_recebido (data);

create table if not exists public.offloading_consolidado (
  origem text primary key,
  data date not null,
  dc text not null
);
create index if not exists offloading_consolidado_data_idx on public.offloading_consolidado (data);

alter table public.offloading_recebido enable row level security;
alter table public.offloading_consolidado enable row level security;

drop materialized view if exists public.resumo_offloading_recebido;
create materialized view public.resumo_offloading_recebido as
  select data as "Data", dc as "DC", count(*)::int as "Recebido"
  from public.offloading_recebido group by 1, 2
with data;
create unique index if not exists resumo_offloading_recebido_pk on public.resumo_offloading_recebido ("Data", "DC");

drop materialized view if exists public.resumo_offloading_consolidado;
create materialized view public.resumo_offloading_consolidado as
  select data as "Data", dc as "DC", count(*)::int as "Consolidado"
  from public.offloading_consolidado group by 1, 2
with data;
create unique index if not exists resumo_offloading_consolidado_pk on public.resumo_offloading_consolidado ("Data", "DC");

revoke all on public.resumo_offloading_recebido, public.resumo_offloading_consolidado from anon, authenticated;
grant select on public.resumo_offloading_recebido, public.resumo_offloading_consolidado to anon, authenticated;

-- a mesma função de antes, agora recalculando os três resumos
create or replace function public.atualizar_resumos() returns void
language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.resumo_noscan;
  refresh materialized view concurrently public.resumo_offloading_recebido;
  refresh materialized view concurrently public.resumo_offloading_consolidado;
end; $$;
revoke all on function public.atualizar_resumos() from public, anon, authenticated;
grant execute on function public.atualizar_resumos() to service_role;
