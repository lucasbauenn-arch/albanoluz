# Site Albano Luz Engenharia — albanoluz.com

Vitrine online da Albano Luz Engenharia, construída a partir do [PRD](./PRD%20-%20Site%20Albano%20Luz.md): transforma o portfólio em PDF em um site rápido, indexável no Google e com caminho claro até o WhatsApp e o formulário de orçamento.

## Stack

| Camada | Escolha |
| --- | --- |
| Front-end | React 19 + Vite 8 + TypeScript + Tailwind CSS 4 + React Router |
| Pré-renderização | Script próprio (`scripts/prerender.mjs`): cada página pública vira HTML estático |
| Banco, auth e arquivos | Supabase (`obras`, `obra_fotos`, `depoimentos`, `leads`, Storage) — ver [supabase/README.md](./supabase/README.md) |
| Formulário | Edge Function `enviar-lead` + Cloudflare Turnstile |
| Automação | n8n: novo lead → e-mail + WhatsApp ([n8n/novo-lead.json](./n8n/novo-lead.json)) |
| Analítica | GA4 + Meta Pixel (só após aceite de cookies), eventos `clique_whatsapp` e `lead_enviado` |
| Hospedagem | Cloudflare Pages ou VPS com EasyPanel (Dockerfile + nginx) |

## Rodando localmente

```bash
npm install
cp .env.example .env   # opcional: sem Supabase o site usa obras ilustrativas
npm run dev            # http://localhost:5173
```

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checa tipos, gera o bundle, pré-renderiza as páginas e o `sitemap.xml` em `dist/` |
| `npm run preview` | Serve o `dist/` como em produção (URLs limpas e 404) |
| `npm run ilustracoes` | Regera as ilustrações técnicas provisórias em `public/ilustracoes/` |
| `npm run lint` | Oxlint |

## Estrutura

```
src/
  config/site.ts        Contatos, cidade, CNPJ/CREA (itens PENDENTES do PRD)
  data/                 Serviços, textos institucionais, obras ilustrativas
  pages/                Home, Sobre, Serviços (+9 subpáginas), Portfólio, Obra, Por que contratar, Contato, Privacidade
  components/           Layout, formulário, galeria/lightbox, antes/depois 3D, FAQ…
  admin/                Painel (/admin): leads, obras e depoimentos — carregado sob demanda
  lib/                  SEO/head, analytics, consentimento LGPD, envio de leads, leitura do Supabase
  entry-server.tsx      Renderização usada na pré-renderização
scripts/prerender.mjs   Gera dist/*.html, 404.html, admin.html e sitemap.xml
supabase/               Migração, seed, Edge Function e instruções
n8n/                    Workflow de notificação de leads
```

## Como o conteúdo funciona

- **Sem Supabase configurado**: o site mostra as obras ilustrativas de `src/data/obras.ts` (com aviso no portfólio) e o formulário só simula o envio em `npm run dev`.
- **Com Supabase**: obras e depoimentos vêm do painel `/admin`. O build pré-renderiza uma página por obra publicada; obras cadastradas depois do último deploy já aparecem nas listagens e abrem pelo `404.html` até o próximo build. Vale configurar um *deploy hook* (Cloudflare Pages) disparado pelo n8n quando uma obra for salva.

## Deploy

**Cloudflare Pages**: comando de build `npm run build`, diretório `dist`, variáveis `VITE_*` do `.env.example`. O `public/_headers` já define cache e cabeçalhos de segurança; URLs sem `.html` e o `404.html` funcionam nativamente.

**EasyPanel / VPS**: use o `Dockerfile` (build estático + nginx). Passe as variáveis `VITE_*` como *build args*.

Depois do primeiro deploy: cadastrar o domínio `albanoluz.com`, enviar o `sitemap.xml` no Google Search Console e ligar o site ao Perfil da Empresa no Google.

## Pendências de conteúdo (PRD)

Os pontos abaixo estão marcados com `PENDENTE` no código:

- [ ] Cidade(s) de atuação — hoje o site assume São Paulo e região (`src/config/site.ts`)
- [ ] Confirmar o @ do Instagram
- [ ] Logo em vetor, códigos de cor e fontes oficiais (o monograma AL foi redesenhado em SVG)
- [ ] Fotos reais das obras e dados de cada uma (hoje: ilustrações técnicas provisórias)
- [ ] Nome, foto, mini-bio e CREA do responsável técnico; CNPJ
- [ ] Depoimentos de clientes, com autorização
- [ ] Revisar os textos-base com o PDF (Quem somos, Missão/Visão/Valores, benefícios de cada serviço)
- [ ] Logos de parceiros e e-mail com domínio próprio
