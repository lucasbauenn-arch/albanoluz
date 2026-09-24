-- =============================================================================
-- Albano Luz Engenharia — esquema inicial
--
-- Tabelas: obras, obra_fotos, depoimentos, leads, admins
-- Função:  public.is_admin()
-- Storage: buckets "obras" (público) e "anexos" (privado)
--
-- O script é idempotente: pode ser executado mais de uma vez sem erro.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.definir_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- Administradores do painel
-- -----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Usuários do Supabase Auth com acesso ao painel. Inserir manualmente (ver supabase/README.md).';


-- Verdadeiro se o usuário logado estiver em public.admins.
-- security definer: consulta admins sem depender das políticas RLS dessa tabela.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- Obras do portfólio
-- -----------------------------------------------------------------------------
create table if not exists public.obras (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique
             check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  titulo     text not null check (char_length(btrim(titulo)) between 1 and 200),
  categoria  text not null default 'realizada'
             check (categoria in ('realizada', 'andamento', '3d', 'prancha')),
  tipo       text not null default 'residencial'
             check (tipo in ('residencial', 'comercial', 'multifamiliar', 'industrial', 'institucional')),
  servicos   text[] not null default '{}',
  cidade     text,
  ano        int check (ano between 1900 and 2100),
  descricao  text,
  capa_url   text,
  capa_alt   text,
  destaque   boolean not null default false,
  publicado  boolean not null default true,
  ordem      int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.obras.servicos is 'Slugs de SERVICOS (src/data/servicos.ts).';
comment on column public.obras.capa_url is
  'URL pública (bucket obras) ou caminho local do site começando com "/".';

create index if not exists obras_publicado_ordem_idx on public.obras (publicado, ordem);

drop trigger if exists obras_updated_at on public.obras;
create trigger obras_updated_at
  before update on public.obras
  for each row execute function public.definir_updated_at();


-- -----------------------------------------------------------------------------
-- Fotos da galeria de cada obra
-- -----------------------------------------------------------------------------
create table if not exists public.obra_fotos (
  id         uuid primary key default gen_random_uuid(),
  obra_id    uuid not null references public.obras (id) on delete cascade,
  url        text not null,
  alt        text not null default '',
  legenda    text,
  ordem      int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists obra_fotos_obra_id_idx on public.obra_fotos (obra_id, ordem);

drop trigger if exists obra_fotos_updated_at on public.obra_fotos;
create trigger obra_fotos_updated_at
  before update on public.obra_fotos
  for each row execute function public.definir_updated_at();


-- -----------------------------------------------------------------------------
-- Depoimentos de clientes (publicar só com autorização — LGPD)
-- -----------------------------------------------------------------------------
create table if not exists public.depoimentos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(btrim(nome)) between 1 and 160),
  cargo      text,
  empresa    text,
  texto      text not null check (char_length(btrim(texto)) between 1 and 3000),
  foto_url   text,
  publicado  boolean not null default false,
  ordem      int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists depoimentos_publicado_ordem_idx on public.depoimentos (publicado, ordem);

drop trigger if exists depoimentos_updated_at on public.depoimentos;
create trigger depoimentos_updated_at
  before update on public.depoimentos
  for each row execute function public.definir_updated_at();


-- -----------------------------------------------------------------------------
-- Leads (pedidos de orçamento). Inseridos apenas pela edge function enviar-lead
-- com a service role; o painel lê, atualiza e exclui.
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  nome          text not null,
  telefone      text not null,
  email         text,
  empresa       text,
  perfil        text check (perfil in ('arquiteto', 'construtora', 'particular')),
  servicos      text[] not null default '{}',
  cidade        text,
  area_m2       numeric check (area_m2 > 0),
  mensagem      text,
  anexo_path    text,
  origem        text,
  consentimento boolean not null default false,
  status        text not null default 'novo'
                check (status in ('novo', 'em_contato', 'proposta_enviada', 'fechado')),
  observacoes   text
);

comment on column public.leads.anexo_path is 'Caminho do arquivo no bucket privado "anexos".';

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.definir_updated_at();


-- -----------------------------------------------------------------------------
-- Privilégios (explícitos, independentemente dos padrões do projeto).
-- O acesso efetivo às linhas é decidido pelas políticas RLS abaixo.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select on public.obras, public.obra_fotos, public.depoimentos to anon, authenticated;
grant insert, update, delete on public.obras, public.obra_fotos, public.depoimentos to authenticated;

revoke all on public.leads from anon;
grant select, update, delete on public.leads to authenticated;
revoke insert on public.leads from authenticated;

revoke all on public.admins from anon;
revoke insert, update, delete on public.admins from authenticated;
grant select on public.admins to authenticated;

grant all on public.obras, public.obra_fotos, public.depoimentos, public.leads, public.admins to service_role;


-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.obras       enable row level security;
alter table public.obra_fotos  enable row level security;
alter table public.depoimentos enable row level security;
alter table public.leads       enable row level security;
alter table public.admins      enable row level security;

-- obras -----------------------------------------------------------------------
drop policy if exists "obras: leitura publicada ou admin" on public.obras;
create policy "obras: leitura publicada ou admin" on public.obras
  for select to anon, authenticated
  using (publicado or (select public.is_admin()));

drop policy if exists "obras: admin insere" on public.obras;
create policy "obras: admin insere" on public.obras
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "obras: admin atualiza" on public.obras;
create policy "obras: admin atualiza" on public.obras
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "obras: admin exclui" on public.obras;
create policy "obras: admin exclui" on public.obras
  for delete to authenticated
  using ((select public.is_admin()));

-- obra_fotos ------------------------------------------------------------------
drop policy if exists "obra_fotos: leitura de obra publicada ou admin" on public.obra_fotos;
create policy "obra_fotos: leitura de obra publicada ou admin" on public.obra_fotos
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.obras o
      where o.id = obra_fotos.obra_id and o.publicado
    )
    or (select public.is_admin())
  );

drop policy if exists "obra_fotos: admin insere" on public.obra_fotos;
create policy "obra_fotos: admin insere" on public.obra_fotos
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "obra_fotos: admin atualiza" on public.obra_fotos;
create policy "obra_fotos: admin atualiza" on public.obra_fotos
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "obra_fotos: admin exclui" on public.obra_fotos;
create policy "obra_fotos: admin exclui" on public.obra_fotos
  for delete to authenticated
  using ((select public.is_admin()));

-- depoimentos -----------------------------------------------------------------
drop policy if exists "depoimentos: leitura publicada ou admin" on public.depoimentos;
create policy "depoimentos: leitura publicada ou admin" on public.depoimentos
  for select to anon, authenticated
  using (publicado or (select public.is_admin()));

drop policy if exists "depoimentos: admin insere" on public.depoimentos;
create policy "depoimentos: admin insere" on public.depoimentos
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "depoimentos: admin atualiza" on public.depoimentos;
create policy "depoimentos: admin atualiza" on public.depoimentos
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "depoimentos: admin exclui" on public.depoimentos;
create policy "depoimentos: admin exclui" on public.depoimentos
  for delete to authenticated
  using ((select public.is_admin()));

-- leads (sem política de INSERT: só a service role grava) ---------------------
drop policy if exists "leads: admin lê" on public.leads;
create policy "leads: admin lê" on public.leads
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "leads: admin atualiza" on public.leads;
create policy "leads: admin atualiza" on public.leads
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "leads: admin exclui" on public.leads;
create policy "leads: admin exclui" on public.leads
  for delete to authenticated
  using ((select public.is_admin()));

-- admins (cada usuário só enxerga a própria linha; sem escrita pelo cliente) --
drop policy if exists "admins: lê a própria linha" on public.admins;
create policy "admins: lê a própria linha" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------
-- Fotos de obras e de depoimentos (público). O painel converte para WebP antes
-- do envio; JPEG/PNG/AVIF ficam aceitos para navegadores sem codificador WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'obras',
  'obras',
  true,
  15728640, -- 15 MB
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do nothing;

-- Anexos dos pedidos de orçamento (privado). Upload só pela edge function.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos',
  'anexos',
  false,
  20971520, -- 20 MB
  array[
    'application/pdf',
    'application/acad',
    'application/x-acad',
    'application/autocad_dwg',
    'application/dwg',
    'application/x-dwg',
    'application/x-autocad',
    'image/vnd.dwg',
    'image/x-dwg',
    'drawing/dwg',
    'application/octet-stream'
  ]
)
on conflict (id) do nothing;

-- Bucket "obras": leitura pública, escrita só de admins ------------------------
drop policy if exists "obras (storage): leitura pública" on storage.objects;
create policy "obras (storage): leitura pública" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'obras');

drop policy if exists "obras (storage): admin envia" on storage.objects;
create policy "obras (storage): admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'obras' and (select public.is_admin()));

drop policy if exists "obras (storage): admin atualiza" on storage.objects;
create policy "obras (storage): admin atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'obras' and (select public.is_admin()))
  with check (bucket_id = 'obras' and (select public.is_admin()));

drop policy if exists "obras (storage): admin exclui" on storage.objects;
create policy "obras (storage): admin exclui" on storage.objects
  for delete to authenticated
  using (bucket_id = 'obras' and (select public.is_admin()));

-- Bucket "anexos": admins leem e excluem; envio só pela service role ----------
drop policy if exists "anexos (storage): admin lê" on storage.objects;
create policy "anexos (storage): admin lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and (select public.is_admin()));

drop policy if exists "anexos (storage): admin exclui" on storage.objects;
create policy "anexos (storage): admin exclui" on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos' and (select public.is_admin()));
