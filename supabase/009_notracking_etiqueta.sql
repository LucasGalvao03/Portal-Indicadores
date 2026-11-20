-- No Tracking: número da etiqueta de cada pacote (para o download da base no site)
alter table public.no_tracking add column if not exists "Etiqueta" text;
