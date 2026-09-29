-- =============================================================================
-- Albano Luz Engenharia — limites de envio de leads
--
-- Garante no banco, de forma atômica, os limites que a edge function
-- enviar-lead também confere antes do upload do anexo:
--   - 3 leads do mesmo telefone (só dígitos) a cada 10 minutos;
--   - 5 leads da mesma origem (hash do IP) a cada 10 minutos;
--   - 10 leads com anexo a cada 60 minutos, no total (os envios sem anexo
--     continuam passando).
-- Acima do limite, o insert é recusado com SQLSTATE PT429, que o PostgREST
-- devolve como HTTP 429; a mensagem diz qual limite foi atingido
-- (limite_telefone, limite_origem ou limite_anexos) e a função mostra o texto
-- certo ao visitante.
--
-- Não existe limite pelo volume total: acima de 30 leads em 10 minutos a
-- função grava o lead normalmente e só deixa de avisar o n8n (disjuntor).
--
-- Os números ficam repetidos em supabase/functions/enviar-lead/index.ts
-- (pré-checagem); mude os dois juntos.
--
-- Aplique esta migração ANTES de publicar a versão da função que grava
-- origem_hash. O script é idempotente.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Origem do envio
-- -----------------------------------------------------------------------------
alter table public.leads add column if not exists origem_hash text;

comment on column public.leads.origem_hash is
  'SHA-256 (hex) de um sal secreto + o IP do cliente (prefixo /64 no IPv6), calculado pela edge function enviar-lead. Serve só ao limite de envios; o IP puro nunca é gravado.';


-- -----------------------------------------------------------------------------
-- Índices das contagens (created_at já tem leads_created_at_idx)
-- -----------------------------------------------------------------------------
create index if not exists leads_origem_hash_created_at_idx
  on public.leads (origem_hash, created_at)
  where origem_hash is not null;

create index if not exists leads_telefone_digitos_created_at_idx
  on public.leads ((regexp_replace(telefone, '\D', '', 'g')), created_at);

create index if not exists leads_com_anexo_created_at_idx
  on public.leads (created_at)
  where anexo_path is not null;


-- -----------------------------------------------------------------------------
-- Trigger de limite
-- -----------------------------------------------------------------------------
-- security definer: as contagens enxergam todos os leads, qualquer que seja o
-- papel que insere (hoje só a service role, que já ignora o RLS).
create or replace function public.limitar_envios_leads()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  digitos text := regexp_replace(coalesce(new.telefone, ''), '\D', '', 'g');
begin
  -- Serializa os inserts de leads até o fim da transação: dois envios
  -- simultâneos não conseguem contar a mesma janela antes de gravar.
  perform pg_advisory_xact_lock(hashtext('public.leads:limites_envio'));

  if digitos <> '' and (
    select count(*)
    from public.leads l
    where regexp_replace(l.telefone, '\D', '', 'g') = digitos
      and l.created_at >= now() - interval '10 minutes'
  ) >= 3 then
    raise exception using
      errcode = 'PT429',
      message = 'limite_telefone',
      detail  = 'Já existem 3 leads deste telefone nos últimos 10 minutos.';
  end if;

  if new.origem_hash is not null and (
    select count(*)
    from public.leads l
    where l.origem_hash = new.origem_hash
      and l.created_at >= now() - interval '10 minutes'
  ) >= 5 then
    raise exception using
      errcode = 'PT429',
      message = 'limite_origem',
      detail  = 'Já existem 5 leads desta origem nos últimos 10 minutos.';
  end if;

  if new.anexo_path is not null and (
    select count(*)
    from public.leads l
    where l.anexo_path is not null
      and l.created_at >= now() - interval '60 minutes'
  ) >= 10 then
    raise exception using
      errcode = 'PT429',
      message = 'limite_anexos',
      detail  = 'Já existem 10 leads com anexo nos últimos 60 minutos.';
  end if;

  return new;
end;
$$;

-- Só o trigger chama a função.
revoke all on function public.limitar_envios_leads() from public, anon, authenticated;

drop trigger if exists leads_limitar_envios on public.leads;
create trigger leads_limitar_envios
  before insert on public.leads
  for each row execute function public.limitar_envios_leads();


-- Atualiza o cache do PostgREST (coluna nova visível para a edge function).
notify pgrst, 'reload schema';
