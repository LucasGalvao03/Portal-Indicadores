-- No Tracking: tipo de insucesso e valor declarado de cada pacote (para os filtros e o valor total do painel)
alter table public.no_tracking add column if not exists "Tipo" text;
alter table public.no_tracking add column if not exists "Valor" numeric;
