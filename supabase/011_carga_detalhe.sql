-- Pontualidade no layout do Excel: detalhes do carregamento por rota, por DS e por minuto.
-- Os pacotes são somados a cada leitura nova (função somar_carga); sacas e minutos são guardados sem repetir.
create table if not exists public.carga_rota_ds (
  dc text not null, data date not null, rota text not null, ds text not null,
  pacotes int not null default 0, primeiro timestamp, ultimo timestamp,
  primary key (dc, data, rota, ds)
);
create table if not exists public.carga_saca (
  dc text not null, data date not null, rota text not null, ds text not null, saca text not null,
  primary key (dc, data, rota, ds, saca)
);
create table if not exists public.carga_minuto ( -- minutos com bipe, para o tempo ativo e as horas trabalhadas
  dc text not null, data date not null, minuto timestamp not null,
  primary key (dc, data, minuto)
);
alter table public.carga_rota_ds enable row level security;
alter table public.carga_saca enable row level security;
alter table public.carga_minuto enable row level security;

create or replace function public.somar_carga(linhas jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.carga_rota_ds as c (dc, data, rota, ds, pacotes, primeiro, ultimo)
  select x.dc, x.data, x.rota, x.ds, x.pacotes, x.primeiro, x.ultimo
  from jsonb_to_recordset(linhas) as x(dc text, data date, rota text, ds text, pacotes int, primeiro timestamp, ultimo timestamp)
  on conflict (dc, data, rota, ds) do update
    set pacotes = c.pacotes + excluded.pacotes,
        primeiro = least(c.primeiro, excluded.primeiro),
        ultimo = greatest(c.ultimo, excluded.ultimo);
end; $$;
revoke all on function public.somar_carga(jsonb) from public, anon, authenticated;
grant execute on function public.somar_carga(jsonb) to service_role;

-- para recomeçar a contagem (recarga completa do carregamento)
create or replace function public.limpar_carga() returns void
language plpgsql security definer set search_path = public as $$
begin
  truncate public.carga_rota_ds, public.carga_saca, public.carga_minuto;
end; $$;
revoke all on function public.limpar_carga() from public, anon, authenticated;
grant execute on function public.limpar_carga() to service_role;

-- rotas: DSs, veículos, pacotes, sacas, bipes e saída prevista/real
drop materialized view if exists public.resumo_carga_rota;
create materialized view public.resumo_carga_rota as
  with r as (
    select dc, data, rota, string_agg(ds, ', ' order by ds) as ds_lista, sum(pacotes)::int as pacotes, min(primeiro) as primeiro, max(ultimo) as ultimo
    from public.carga_rota_ds group by 1, 2, 3
  ), s as (select dc, data, rota, count(distinct saca)::int as sacas from public.carga_saca group by 1, 2, 3),
  pv as (select vid, min(prev) as prev, min(real) as real from public.partida group by vid),
  v as (
    select rv.dc, rv.data, rv.rota, string_agg(distinct rv.vid, ', ') as vids, min(pv.prev) as prev, min(pv.real) as real
    from public.rota_veiculo rv left join pv on pv.vid = rv.vid group by 1, 2, 3
  )
  select r.data as "Data", r.dc as "DC", r.rota as "Rota", r.ds_lista as "DS", coalesce(v.vids, '') as "Veiculo",
         r.pacotes as "Pacotes", coalesce(s.sacas, 0) as "Sacas",
         to_char(r.primeiro, 'YYYY-MM-DD HH24:MI:SS') as "Primeiro", to_char(r.ultimo, 'YYYY-MM-DD HH24:MI:SS') as "Ultimo",
         case when v.prev is null then '' else to_char(to_timestamp(v.prev::text, 'YYYYMMDDHH24MISS'), 'YYYY-MM-DD HH24:MI') end as "Prevista",
         case when v.real is null then '' else to_char(to_timestamp(v.real::text, 'YYYYMMDDHH24MISS'), 'YYYY-MM-DD HH24:MI') end as "Real"
  from r left join s using (dc, data, rota) left join v using (dc, data, rota)
with data;
create unique index if not exists resumo_carga_rota_pk on public.resumo_carga_rota ("Data", "DC", "Rota");

-- DS de destino por dia
drop materialized view if exists public.resumo_carga_ds;
create materialized view public.resumo_carga_ds as
  with s as (select dc, data, ds, count(distinct saca)::int as sacas from public.carga_saca group by 1, 2, 3)
  select c.data as "Data", c.dc as "DC", c.ds as "DS", sum(c.pacotes)::int as "Pacotes", coalesce(max(s.sacas), 0) as "Sacas",
         count(distinct c.rota)::int as "Rotas", to_char(min(c.primeiro), 'YYYY-MM-DD HH24:MI:SS') as "Primeiro", to_char(max(c.ultimo), 'YYYY-MM-DD HH24:MI:SS') as "Ultimo"
  from public.carga_rota_ds c left join s on s.dc = c.dc and s.data = c.data and s.ds = c.ds
  group by 1, 2, 3
with data;
create unique index if not exists resumo_carga_ds_pk on public.resumo_carga_ds ("Data", "DC", "DS");

-- dia do DC: tempo ativo (pausas de mais de 30 min não contam), horas com bipe e primeiro/último bipe
drop materialized view if exists public.resumo_carga_dia;
create materialized view public.resumo_carga_dia as
  with m as (
    select dc, data, minuto, lag(minuto) over (partition by dc, data order by minuto) as antes from public.carga_minuto
  )
  select data as "Data", dc as "DC",
         coalesce(sum(case when antes is not null and minuto - antes <= interval '30 minutes' then extract(epoch from minuto - antes) / 60 else 0 end), 0)::int as "Minutos_Ativos",
         count(distinct date_trunc('hour', minuto))::int as "Horas",
         to_char(min(minuto), 'YYYY-MM-DD HH24:MI') as "Primeiro", to_char(max(minuto), 'YYYY-MM-DD HH24:MI') as "Ultimo"
  from m group by 1, 2
with data;
create unique index if not exists resumo_carga_dia_pk on public.resumo_carga_dia ("Data", "DC");

revoke all on public.resumo_carga_rota, public.resumo_carga_ds, public.resumo_carga_dia from anon, authenticated;
grant select on public.resumo_carga_rota, public.resumo_carga_ds, public.resumo_carga_dia to anon, authenticated;

create or replace function public.atualizar_resumos(area text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if area is null or area = 'noscan' then
    refresh materialized view public.resumo_noscan;
  end if;
  if area is null or area = 'offloading' then
    refresh materialized view public.resumo_offloading_recebido;
    refresh materialized view public.resumo_offloading_consolidado;
    refresh materialized view public.resumo_offloading_hora;
  end if;
  if area is null or area = 'carregamento' then
    refresh materialized view public.resumo_pontualidade;
    refresh materialized view public.resumo_sacas_enviadas;
    refresh materialized view public.resumo_carga_rota;
    refresh materialized view public.resumo_carga_ds;
    refresh materialized view public.resumo_carga_dia;
  end if;
end; $$;
revoke all on function public.atualizar_resumos(text) from public, anon, authenticated;
grant execute on function public.atualizar_resumos(text) to service_role;
