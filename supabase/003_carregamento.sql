-- Pontualidade de Transporte e Sacas enviadas (base de carregamento dos DCs) no banco.
-- Guarda só o essencial, sem repetir linhas: quais veículos fizeram cada rota no dia,
-- quais rotas tiveram leitura válida, os horários de saída de cada veículo e as sacas enviadas.
create table if not exists public.rota_veiculo (   -- rota do dia × veículo (qualquer leitura)
  dc text not null, data date not null, rota text not null, vid text not null,
  primary key (dc, data, rota, vid)
);
create table if not exists public.rota_valida (    -- rota do dia com pelo menos uma leitura válida
  dc text not null, data date not null, rota text not null,
  primary key (dc, data, rota)
);
create table if not exists public.partida (        -- saída prevista e real de cada veículo (aaaammddhhmmss)
  dc text not null, vid text not null, prev bigint, real bigint,
  primary key (dc, vid)
);
create table if not exists public.saca_enviada (   -- saca enviada à DS, por semana de envio (terça)
  dc text not null, semana date not null, chave_ds text not null, saca text not null, ds text not null,
  primary key (dc, semana, chave_ds, saca)
);
alter table public.rota_veiculo enable row level security;
alter table public.rota_valida enable row level security;
alter table public.partida enable row level security;
alter table public.saca_enviada enable row level security;

drop materialized view if exists public.resumo_pontualidade;
create materialized view public.resumo_pontualidade as
  with pr as (
    select rv.dc, rv.data, rv.rota, min(p.prev) as prev, min(p.real) as real
    from public.rota_veiculo rv join public.partida p on p.dc = rv.dc and p.vid = rv.vid
    group by 1, 2, 3
  )
  select pr.data as "Data", pr.dc as "DC", count(*)::int as "Rotas",
         count(*) filter (where pr.real <= pr.prev)::int as "No_Prazo",
         count(*) filter (where pr.real > pr.prev)::int as "Atrasadas"
  from pr join public.rota_valida v on v.dc = pr.dc and v.data = pr.data and v.rota = pr.rota
  where pr.prev is not null and pr.real is not null
  group by 1, 2
with data;
create unique index if not exists resumo_pontualidade_pk on public.resumo_pontualidade ("Data", "DC");

drop materialized view if exists public.resumo_sacas_enviadas;
create materialized view public.resumo_sacas_enviadas as
  select semana as "Ini_Envio", dc as "DC", chave_ds as "Chave_DS", min(ds) as "DS", count(*)::int as "Enviadas"
  from public.saca_enviada group by 1, 2, 3
with data;
create unique index if not exists resumo_sacas_enviadas_pk on public.resumo_sacas_enviadas ("Ini_Envio", "DC", "Chave_DS");

revoke all on public.resumo_pontualidade, public.resumo_sacas_enviadas from anon, authenticated;
grant select on public.resumo_pontualidade, public.resumo_sacas_enviadas to anon, authenticated;

create or replace function public.atualizar_resumos() returns void
language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.resumo_noscan;
  refresh materialized view concurrently public.resumo_offloading_recebido;
  refresh materialized view concurrently public.resumo_offloading_consolidado;
  refresh materialized view concurrently public.resumo_pontualidade;
  refresh materialized view concurrently public.resumo_sacas_enviadas;
end; $$;
revoke all on function public.atualizar_resumos() from public, anon, authenticated;
grant execute on function public.atualizar_resumos() to service_role;
