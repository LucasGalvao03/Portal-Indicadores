-- Pontualidade: o veículo pode estar cadastrado na aba de rotas de outro DC (ex.: rota CE1 → PI3 carregada no PI3).
-- Antes o horário só era procurado no mesmo DC; agora em qualquer DC, como no Excel.
drop materialized view if exists public.resumo_pontualidade;
create materialized view public.resumo_pontualidade as
  with pv as (select vid, min(prev) as prev, min(real) as real from public.partida group by vid),
  pr as (
    select rv.dc, rv.data, rv.rota, min(pv.prev) as prev, min(pv.real) as real
    from public.rota_veiculo rv join pv on pv.vid = rv.vid
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
revoke all on public.resumo_pontualidade from anon, authenticated;
grant select on public.resumo_pontualidade to anon, authenticated;
