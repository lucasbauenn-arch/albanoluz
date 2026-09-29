-- =============================================================================
-- Carga inicial: 12 obras ILUSTRATIVAS (mesmo conteúdo de src/data/obras.ts).
--
-- ATENÇÃO: nenhuma destas obras é real. As fotos são de banco de imagens (Unsplash)
-- e as pranchas são desenhos provisórios; títulos, cidades e anos são exemplos.
-- Enquanto houver obra ilustrativa publicada (o site as reconhece pelas imagens em
-- /fotos/ e /ilustracoes/), o site mostra um aviso de conteúdo ilustrativo. Conforme
-- as obras reais forem cadastradas no painel (/admin → Obras), despublique ou exclua
-- as ilustrativas.
--
-- As imagens são caminhos locais do site (/fotos/*.webp e /ilustracoes/*.svg); o site público
-- trata URLs começando com "/" como arquivos próprios.
--
-- Idempotente: obras cujo slug já existe são ignoradas (fotos incluídas).
-- =============================================================================

-- Residência de alto padrão
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'residencia-alto-padrao',
    'Residência de alto padrão',
    'realizada',
    'residencial',
    array['estrutural', 'fundacao', 'eletrico', 'hidraulico']::text[],
    'São Paulo, SP',
    2024,
    'Residência de dois pavimentos com grandes vãos na área social. A estrutura em concreto armado foi otimizada para liberar a fachada envidraçada sem pilares aparentes.',
    '/fotos/residencia-piscina.webp',
    'Residência contemporânea de dois pavimentos com grandes vidros e piscina',
    true,
    true,
    1
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/fotos/residencia-piscina.webp', 'Residência contemporânea de dois pavimentos com grandes vidros e piscina', null::text, 0),
    ('/fotos/residencia-branca.webp', 'Residência branca com terraço e piscina na área externa', null::text, 1),
    ('/ilustracoes/planta-residencia.svg', 'Planta baixa de residência com ambientes e cotas', null::text, 2),
    ('/ilustracoes/formas-residencia.svg', 'Planta de formas estrutural de residência com pilares, vigas e lajes', null::text, 3)
) as f (url, alt, legenda, ordem);

-- Edifício multifamiliar de 4 pavimentos
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'edificio-multifamiliar-4-pavimentos',
    'Edifício multifamiliar de 4 pavimentos',
    'realizada',
    'multifamiliar',
    array['estrutural', 'fundacao', 'incendio']::text[],
    'São Paulo, SP',
    2023,
    'Edifício em alvenaria estrutural com planta repetitiva, solução que reduziu formas e prazo de obra. Fundação em blocos sobre estacas definida a partir da sondagem.',
    '/fotos/edificio-residencial.webp',
    'Edifício residencial de fachada em tijolo aparente visto de baixo',
    true,
    true,
    2
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/fotos/edificio-residencial.webp', 'Edifício residencial de fachada em tijolo aparente visto de baixo', null::text, 0),
    ('/fotos/edificio-branco.webp', 'Edifício multifamiliar de fachada branca e janelas em faixa', null::text, 1),
    ('/ilustracoes/formas-multifamiliar.svg', 'Planta de formas do pavimento tipo de edifício multifamiliar', null::text, 2),
    ('/ilustracoes/fundacao-multifamiliar.svg', 'Planta de locação de fundação com blocos sobre estacas', null::text, 3)
) as f (url, alt, legenda, ordem);

-- Galpão comercial
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'galpao-comercial',
    'Galpão comercial',
    'realizada',
    'comercial',
    array['estrutural', 'fundacao', 'execucao-de-obras']::text[],
    'São Paulo, SP',
    2024,
    'Galpão com vão livre para operação logística. Projeto estrutural, fundação em sapatas e execução da obra pela nossa equipe.',
    '/fotos/galpao-portoes.webp',
    'Fachada de galpão com portões de docas de carga',
    true,
    true,
    3
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/fotos/galpao-portoes.webp', 'Fachada de galpão com portões de docas de carga', null::text, 0),
    ('/fotos/galpao-cobertura-metalica.webp', 'Galpão com estrutura e cobertura metálica em fase de acabamento', null::text, 1),
    ('/fotos/galpao-docas.webp', 'Galpão comercial com fachada cinza e docas de carga', null::text, 2),
    ('/ilustracoes/formas-galpao.svg', 'Planta de formas de galpão com eixos e pilares', null::text, 3)
) as f (url, alt, legenda, ordem);

-- Clínica médica
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'clinica-medica',
    'Clínica médica',
    'realizada',
    'comercial',
    array['estrutural', 'eletrico', 'incendio']::text[],
    'São Paulo, SP',
    2023,
    'Adequação de imóvel para clínica, com projeto estrutural, instalações elétricas para equipamentos médicos e projeto de combate a incêndio.',
    '/fotos/clinica-fachada.webp',
    'Fachada de edifício comercial com revestimento claro e esquadrias verticais',
    true,
    true,
    4
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/fotos/clinica-fachada.webp', 'Fachada de edifício comercial com revestimento claro e esquadrias verticais', null::text, 0),
    ('/fotos/clinica-interior.webp', 'Interior comercial amplo com forro linear e iluminação embutida', null::text, 1),
    ('/ilustracoes/planta-clinica.svg', 'Planta baixa de clínica médica com consultórios e recepção', null::text, 2),
    ('/ilustracoes/incendio-planta.svg', 'Planta de projeto de combate a incêndio com rotas de fuga e extintores', null::text, 3)
) as f (url, alt, legenda, ordem);

-- Sobrados geminados
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'sobrados-geminados',
    'Sobrados geminados',
    'realizada',
    'residencial',
    array['estrutural', 'arquitetura', 'hidraulico']::text[],
    'São Paulo, SP',
    2022,
    'Conjunto de sobrados geminados para investidor, com arquitetura, estrutura e hidráulica desenvolvidas pela mesma equipe.',
    '/fotos/sobrados-pergolado.webp',
    'Sobrados contemporâneos com pergolado e iluminação na fachada',
    false,
    true,
    5
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/fotos/sobrados-pergolado.webp', 'Sobrados contemporâneos com pergolado e iluminação na fachada', null::text, 0),
    ('/ilustracoes/fachada-sobrado.svg', 'Fachada de sobrados geminados em desenho técnico', null::text, 1),
    ('/ilustracoes/planta-sobrado.svg', 'Planta baixa do pavimento térreo de sobrados geminados', null::text, 2)
) as f (url, alt, legenda, ordem);

-- Edifício residencial de 6 pavimentos
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'edificio-residencial-6-pavimentos',
    'Edifício residencial de 6 pavimentos',
    'andamento',
    'multifamiliar',
    array['estrutural', 'fundacao', 'executivo']::text[],
    'São Paulo, SP',
    2026,
    'Estrutura em concreto armado em execução, com acompanhamento em campo das armaduras e concretagens de cada pavimento.',
    '/fotos/edificio-em-obra.webp',
    'Edifício de vários pavimentos com estrutura de concreto em execução',
    true,
    true,
    6
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/fotos/edificio-em-obra.webp', 'Edifício de vários pavimentos com estrutura de concreto em execução', null::text, 0),
    ('/fotos/armacao-laje.webp', 'Operário trabalhando sobre laje com armaduras de pilares à espera', null::text, 1),
    ('/fotos/armacao-pilares.webp', 'Equipe de armadores montando armaduras de pilares em altura', null::text, 2),
    ('/ilustracoes/formas-edificio6.svg', 'Prancha de formas do pavimento tipo de edifício de seis pavimentos', null::text, 3)
) as f (url, alt, legenda, ordem);

-- Ampliação residencial com novo pavimento
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'ampliacao-residencial',
    'Ampliação residencial com novo pavimento',
    'andamento',
    'residencial',
    array['estrutural', 'execucao-de-obras']::text[],
    'São Paulo, SP',
    2026,
    'Novo pavimento sobre residência existente. A estrutura original foi verificada e reforçada antes da ampliação.',
    '/fotos/ampliacao-andaime.webp',
    'Ampliação de residência em alvenaria com andaimes na fachada',
    false,
    true,
    7
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/fotos/ampliacao-andaime.webp', 'Ampliação de residência em alvenaria com andaimes na fachada', null::text, 0),
    ('/fotos/ampliacao-fundos.webp', 'Ampliação nos fundos de uma casa, com paredes de blocos e novas esquadrias', null::text, 1),
    ('/ilustracoes/fachada-ampliacao.svg', 'Fachada de residência com novo pavimento em ampliação', null::text, 2)
) as f (url, alt, legenda, ordem);

-- Residência térrea
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'residencia-terrea',
    'Residência térrea',
    'andamento',
    'residencial',
    array['estrutural', 'fundacao', 'eletrico', 'hidraulico']::text[],
    'São Paulo, SP',
    2026,
    'Residência térrea com projetos estrutural, de fundação, elétrico e hidráulico compatibilizados.',
    '/fotos/residencia-terrea-obra.webp',
    'Residência moderna de concreto em construção, antes dos acabamentos',
    false,
    true,
    8
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/fotos/residencia-terrea-obra.webp', 'Residência moderna de concreto em construção, antes dos acabamentos', null::text, 0),
    ('/ilustracoes/fachada-terrea.svg', 'Fachada de residência térrea em desenho técnico', null::text, 1),
    ('/ilustracoes/planta-terrea.svg', 'Planta baixa de residência térrea', null::text, 2)
) as f (url, alt, legenda, ordem);

-- Maquete eletrônica de residência
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'maquete-eletronica-residencia',
    'Maquete eletrônica de residência',
    '3d',
    'residencial',
    array['modelagem-3d', 'arquitetura']::text[],
    'São Paulo, SP',
    2025,
    'Modelagem 3D e renderização de fachada e interiores, usadas pelo cliente para aprovar acabamentos antes da obra.',
    '/fotos/render-residencia-jardim.webp',
    'Imagem renderizada de residência com fachada em pedra e jardim',
    true,
    true,
    9
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/fotos/render-residencia-jardim.webp', 'Imagem renderizada de residência com fachada em pedra e jardim', null::text, 0),
    ('/fotos/render-residencia-piscina.webp', 'Imagem renderizada de residência térrea com piscina e deck', null::text, 1),
    ('/fotos/render-sala-integrada.webp', 'Render de sala de estar ampla com sofá e grandes aberturas', null::text, 2)
) as f (url, alt, legenda, ordem);

-- Renderização de edifício multifamiliar
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'renderizacao-edificio-multifamiliar',
    'Renderização de edifício multifamiliar',
    '3d',
    'multifamiliar',
    array['modelagem-3d']::text[],
    'São Paulo, SP',
    2025,
    'Imagens de fachada e de ambientes internos para o material de vendas do empreendimento.',
    '/fotos/render-fachada-edificio.webp',
    'Render de fachada contemporânea com volumes escuros e vegetação',
    false,
    true,
    10
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/fotos/render-fachada-edificio.webp', 'Render de fachada contemporânea com volumes escuros e vegetação', null::text, 0),
    ('/fotos/render-cozinha.webp', 'Render de cozinha com marcenaria em madeira e ilha com banquetas', null::text, 1),
    ('/fotos/render-sala-estar.webp', 'Render de sala de estar clara com sofá branco e quadros', null::text, 2)
) as f (url, alt, legenda, ordem);

-- Prancha de formas de edifício
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'prancha-formas-edificio',
    'Prancha de formas de edifício',
    'prancha',
    'multifamiliar',
    array['estrutural']::text[],
    'São Paulo, SP',
    2024,
    'Exemplo de prancha de formas do pavimento tipo, com eixos, pilares, vigas e lajes numerados.',
    '/ilustracoes/formas-edificio6.svg',
    'Prancha de formas do pavimento tipo de edifício de seis pavimentos',
    false,
    true,
    11
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/ilustracoes/formas-edificio6.svg', 'Prancha de formas do pavimento tipo de edifício de seis pavimentos', null::text, 0),
    ('/ilustracoes/formas-multifamiliar.svg', 'Planta de formas do pavimento tipo de edifício multifamiliar', null::text, 1)
) as f (url, alt, legenda, ordem);

-- Prancha de locação de fundação
with nova as (
  insert into public.obras
    (slug, titulo, categoria, tipo, servicos, cidade, ano, descricao, capa_url, capa_alt, destaque, publicado, ordem)
  values (
    'prancha-locacao-fundacao',
    'Prancha de locação de fundação',
    'prancha',
    'industrial',
    array['fundacao']::text[],
    'São Paulo, SP',
    2024,
    'Exemplo de prancha de locação de sapatas e blocos, com eixos cotados e cargas de pilares.',
    '/ilustracoes/fundacao-galpao.svg',
    'Planta de locação de sapatas de galpão',
    false,
    true,
    12
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.obra_fotos (obra_id, url, alt, legenda, ordem)
select nova.id, f.url, f.alt, f.legenda, f.ordem
from nova
cross join (
  values
    ('/ilustracoes/fundacao-galpao.svg', 'Planta de locação de sapatas de galpão', null::text, 0),
    ('/ilustracoes/fundacao-multifamiliar.svg', 'Planta de locação de fundação com blocos sobre estacas', null::text, 1)
) as f (url, alt, legenda, ordem);
