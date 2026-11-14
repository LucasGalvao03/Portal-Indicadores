-- =====================================================================
-- Portal de Indicadores · Nordeste II — banco (Supabase / Postgres)
-- 001: No Scan
--
-- Como usar: Supabase → SQL Editor → New query → colar este arquivo inteiro → Run.
-- Pode rodar de novo sem problema (não apaga dados).
--
-- Segurança:
--   * tabelas brutas (com waybills): RLS ligado e nenhuma regra para o público → o site NÃO lê
--   * resumo_noscan: só números por dia/DC/DS → o site lê com a chave pública (publishable)
--   * quem grava é o script do Google, com a chave secreta guardada nas propriedades do script
-- =====================================================================

-- ---------- tabelas brutas (só as colunas que o cálculo usa) ----------
create table if not exists public.recebimento_ds (
  data       date        not null,          -- dia da leitura na DS
  scan_time  timestamp   not null,          -- hora da leitura (para não duplicar)
  ds         text        not null,          -- Scan Station
  waybill    text        not null,
  primary key (waybill, scan_time, ds)
);
create index if not exists recebimento_ds_data_idx on public.recebimento_ds (data);

create table if not exists public.expedicao_dc (
  waybill    text primary key,              -- basta saber que passou pela expedição do DC
  data       date                            -- primeira data vista (informativo)
);

create table if not exists public.mapa_ds_dc (
  ds  text primary key,
  dc  text not null
);

alter table public.recebimento_ds enable row level security;
alter table public.expedicao_dc   enable row level security;
alter table public.mapa_ds_dc     enable row level security;
-- sem "create policy": o público não lê nem grava; a chave secreta ignora o RLS

-- ---------- resumo (o que o site lê) ----------
-- mesmo formato da aba NoScan da Portal_Dados: Data, DC, DS, Recebidos, Sem_Registro
drop materialized view if exists public.resumo_noscan;
create materialized view public.resumo_noscan as
select
  r.data                                   as "Data",
  coalesce(m.dc, 'Não identificado')       as "DC",
  r.ds                                     as "DS",
  count(*)::int                            as "Recebidos",
  count(*) filter (where e.waybill is null)::int as "Sem_Registro"
from public.recebimento_ds r
left join public.mapa_ds_dc   m on m.ds = r.ds
left join public.expedicao_dc e on e.waybill = r.waybill
group by 1, 2, 3
with data;
create unique index if not exists resumo_noscan_pk on public.resumo_noscan ("Data", "DC", "DS");

revoke all on public.resumo_noscan from anon, authenticated;
grant select on public.resumo_noscan to anon, authenticated;

-- ---------- recalcular os resumos (chamado pelo script depois de cada carga) ----------
create or replace function public.atualizar_resumos()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.resumo_noscan;
end;
$$;
revoke all on function public.atualizar_resumos() from public, anon, authenticated;
grant execute on function public.atualizar_resumos() to service_role;

-- ---------- conferência rápida ----------
-- select "DC", sum("Recebidos") rec, sum("Sem_Registro") sem from resumo_noscan group by 1 order by 1;
