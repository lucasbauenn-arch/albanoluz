-- =============================================================================
-- Albano Luz Engenharia — ajustes de storage
--
-- Bucket "obras": tira a leitura pública pela API do Storage. As imagens do site
-- continuam abrindo pelas URLs públicas (/storage/v1/object/public/obras/...),
-- que em bucket público não passam por RLS. A política antiga só servia para
-- listar o bucket com a chave anon, o que expunha os caminhos de fotos de obras
-- não publicadas e de depoimentos ainda não autorizados.
--
-- O admin continua com SELECT: o remove() do Storage exige SELECT + DELETE.
--
-- O script é idempotente. A migração inicial recria a política pública; se ela
-- for executada de novo pelo SQL Editor, execute esta logo em seguida.
-- =============================================================================

drop policy if exists "obras (storage): leitura pública" on storage.objects;

drop policy if exists "obras (storage): admin lê" on storage.objects;
create policy "obras (storage): admin lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'obras' and (select public.is_admin()));
