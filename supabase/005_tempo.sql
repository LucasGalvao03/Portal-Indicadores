-- Recalcular os resumos estava passando do tempo limite do Supabase.
-- 1) mais tempo para a chave secreta (só ela chama o recálculo)
alter role service_role set statement_timeout = '300s';
notify pgrst, 'reload config';

-- 2) recalcula só os resumos do indicador que acabou de receber dados (e sem o modo "concurrently", que é mais lento)
drop function if exists public.atualizar_resumos();
drop function if exists public.atualizar_resumos(text);
create function public.atualizar_resumos(area text default null) returns void
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
  end if;
end; $$;
revoke all on function public.atualizar_resumos(text) from public, anon, authenticated;
grant execute on function public.atualizar_resumos(text) to service_role;
