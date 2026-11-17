-- OffLoading por hora: guarda a hora de cada bipe (recebido) e de cada consolidação.
alter table public.offloading_recebido add column if not exists hora smallint;
alter table public.offloading_consolidado add column if not exists hora smallint;

drop materialized view if exists public.resumo_offloading_hora;
create materialized view public.resumo_offloading_hora as
  with r as (select data, dc, hora, count(*) n from public.offloading_recebido where hora is not null group by 1, 2, 3),
       c as (select data, dc, hora, count(*) n from public.offloading_consolidado where hora is not null group by 1, 2, 3)
  select coalesce(r.data, c.data) as "Data", coalesce(r.dc, c.dc) as "DC", coalesce(r.hora, c.hora)::int as "Hora",
         coalesce(r.n, 0)::int as "Recebido", coalesce(c.n, 0)::int as "Consolidado"
  from r full join c on c.data = r.data and c.dc = r.dc and c.hora = r.hora
with data;
create unique index if not exists resumo_offloading_hora_pk on public.resumo_offloading_hora ("Data", "DC", "Hora");
revoke all on public.resumo_offloading_hora from anon, authenticated;
grant select on public.resumo_offloading_hora to anon, authenticated;

create or replace function public.atualizar_resumos() returns void
language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.resumo_noscan;
  refresh materialized view concurrently public.resumo_offloading_recebido;
  refresh materialized view concurrently public.resumo_offloading_consolidado;
  refresh materialized view concurrently public.resumo_offloading_hora;
  refresh materialized view concurrently public.resumo_pontualidade;
  refresh materialized view concurrently public.resumo_sacas_enviadas;
end; $$;
revoke all on function public.atualizar_resumos() from public, anon, authenticated;
grant execute on function public.atualizar_resumos() to service_role;
