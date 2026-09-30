# Site Albano Luz Engenharia — albanoluz.com

Vitrine online da Albano Luz Engenharia, construída a partir do [PRD](./PRD%20-%20Site%20Albano%20Luz.md): transforma o portfólio em PDF em um site rápido, indexável no Google e com caminho claro até o WhatsApp e o formulário de orçamento.

## Stack

| Camada | Escolha |
| --- | --- |
| Front-end | React 19 + Vite 8 + TypeScript + Tailwind CSS 4 + React Router |
| Pré-renderização | Script próprio (`scripts/prerender.mjs`): cada página pública vira HTML estático |
| Banco, auth e arquivos | Supabase (`obras`, `obra_fotos`, `depoimentos`, `leads`, Storage) — ver [supabase/README.md](./supabase/README.md) |
| Formulário | Edge Function `enviar-lead` + Cloudflare Turnstile + limites de envio garantidos no banco |
| Aviso de novo lead | E-mail para a equipe, enviado por SMTP direto da função `enviar-lead` (sem serviço intermediário) |
| Analítica | GA4 + Meta Pixel (só após aceite de cookies), eventos `clique_whatsapp` e `lead_enviado` |
| Hospedagem | Cloudflare Pages ou VPS com EasyPanel (Dockerfile + nginx) |

## Rodando localmente

```bash
npm install
cp .env.example .env   # opcional (PowerShell: Copy-Item .env.example .env); sem Supabase o site usa obras ilustrativas
npm run dev            # http://localhost:5173
```

Com o `.env` apontando para o Supabase, o formulário em `npm run dev` envia leads reais para a função publicada (e a
equipe recebe o aviso por e-mail) até o Turnstile ser ativado. Depois disso (passo 7 de
[supabase/README.md](./supabase/README.md)), a função recusa os envios locais de propósito. Em qualquer caso, deixe
`VITE_TURNSTILE_SITE_KEY` vazia no `.env`.

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
supabase/               Migrações, seed, Edge Function e instruções
```

## Como o conteúdo funciona

- **Sem Supabase configurado**: o site mostra as obras ilustrativas de `src/data/obras.ts` (com aviso no portfólio) e o formulário só simula o envio em `npm run dev`.
- **Com Supabase**: obras e depoimentos vêm do painel `/admin`. O build pré-renderiza uma página por obra publicada; obras cadastradas depois do último deploy já aparecem nas listagens e abrem pelo `404.html` até o próximo build (ver [Novo deploy depois de mudar obras](#novo-deploy-depois-de-mudar-obras)).

## Variáveis de ambiente

A lista está em `.env.example` (Supabase, Turnstile, GA4 e Meta Pixel).

- Os nomes **precisam** começar com `VITE_`. Sem o prefixo (ex.: `SUPABASE_URL`) o Vite ignora a variável sem avisar: o site cai nas obras ilustrativas, o formulário não envia e o `/admin` mostra “Configuração pendente”.
- As variáveis `VITE_*` são lidas **no build** e ficam no código público. Depois de criar ou alterar qualquer uma, gere o build e publique de novo; mudar só no painel da hospedagem não tem efeito.
- `VITE_TURNSTILE_SITE_KEY` só entra junto com `TURNSTILE_SECRET_KEY` na função, em uma ordem definida, e só na hospedagem (vazia no `.env`): veja o passo 7 de [supabase/README.md](./supabase/README.md).

## Deploy

Antes do primeiro deploy com o Supabase, siga a ordem de [supabase/README.md](./supabase/README.md): migrações (incluindo a de limites de envio) e seed, cadastro público desligado e função `enviar-lead` publicada com os secrets, incluindo os do aviso por e-mail (SMTP). No projeto atual, migrações, seed e função já estão no ar: falta cadastrar os secrets SMTP e publicar de novo a função (veja a [situação atual](./supabase/README.md#situação-atual)). Com o Supabase configurado, o build lê as obras do banco e **falha se não houver nenhuma obra publicada**. Para gerar mesmo assim, cadastre `PERMITIR_PORTFOLIO_VAZIO=1` no mesmo lugar das variáveis `VITE_*` da hospedagem (num build local, a mensagem de erro do build mostra o comando) e apague essa variável assim que houver obras publicadas.

**Hostinger (hospedagem atual do albanoluz.com)**: o build é feito no computador e os arquivos são enviados para a pasta `public_html`.

1. Com o `.env` configurado (variáveis `VITE_SUPABASE_*`), rode `npm run build` e confira no log `Supabase: N obras e M depoimentos publicados.`
2. Compacte o **conteúdo** da pasta `dist/` (não a pasta em si), incluindo o arquivo `.htaccess`. No PowerShell: `Compress-Archive -Path dist\* -DestinationPath site-albanoluz-hostinger.zip -Force`.
3. No hPanel: **Gerenciador de Arquivos** → `public_html` → envie o zip, extraia ali mesmo (substituindo os arquivos) e apague o zip.
4. Limpe o cache da CDN da Hostinger no hPanel e deixe ligada a opção de forçar HTTPS.

O `public/.htaccess` faz as URLs limpas funcionarem (`/sobre` → `sobre.html`, `/admin` → `admin.html`), usa o `404.html` e define cache e cabeçalhos de segurança. Sem ele, só os endereços terminados em `.html` abrem.

**Cloudflare Pages**: comando de build `npm run build`, diretório `dist`. Cadastre as variáveis `VITE_*` do `.env.example` nas configurações do projeto (ambiente Production e, se usar, Preview) e, depois de qualquer mudança nelas, faça um novo deploy (**Deployments → Retry deployment** no último deploy de produção). O `public/_headers` já define cache e cabeçalhos de segurança; URLs sem `.html` e o `404.html` funcionam nativamente.

**EasyPanel / VPS**: use o `Dockerfile` (build estático + nginx). No EasyPanel, cadastre as variáveis `VITE_*` (e, só se precisar, `PERMITIR_PORTFOLIO_VAZIO`) nas variáveis de ambiente (*Environment*) do serviço do site: o EasyPanel as repassa ao build como *build args*. O `Dockerfile` declara um `ARG` para cada uma, e só as declaradas chegam ao build; o `.env` não entra na imagem. Depois de mudar alguma, clique em **Deploy** para refazer o build.

Confira no log do build: com o Supabase, aparece `Supabase: N obras e M depoimentos publicados.`; se aparecer `Supabase não configurado: usando obras ilustrativas`, as variáveis não chegaram ao build. Não publique um `dist/` ou `dist.zip` gerado antes de configurar o Supabase.

Depois de cada deploy, faça o teste do formulário com anexo (passo 6 de [supabase/README.md](./supabase/README.md)). **No primeiro deploy, o site costuma abrir num endereço provisório** (ex.: `https://<projeto>.pages.dev` ou o domínio padrão do EasyPanel), e a função `enviar-lead` só aceita pedidos de `albanoluz.com`, `www.albanoluz.com` e `localhost`: de outro endereço, o formulário mostra “Não foi possível conectar”. Antes do teste, aponte o domínio definitivo ou libere o endereço provisório no secret `ALLOWED_ORIGINS` da função, com a lista completa (veja o passo 6 de [supabase/README.md](./supabase/README.md)).

Depois do primeiro deploy: cadastrar o domínio `albanoluz.com` (e remover o secret `ALLOWED_ORIGINS`, se ele foi usado para o endereço provisório), ativar o Turnstile antes de divulgar o formulário (passo 7 de [supabase/README.md](./supabase/README.md)), enviar o `sitemap.xml` no Google Search Console e ligar o site ao Perfil da Empresa no Google.

## Novo deploy depois de mudar obras

As páginas `/portfolio/<slug>` e o `sitemap.xml` são gerados no build, com as obras publicadas naquele momento. Até o próximo build:

- uma obra nova abre pelo `404.html`, com status HTTP 404: o Google não a indexa e a prévia do link (WhatsApp, redes sociais) mostra “Página não encontrada”;
- uma obra despublicada ou excluída continua no ar como página estática e no `sitemap.xml`. Isso importa quando um cliente pede para retirar uma obra.

Por isso, **depois de publicar, alterar, despublicar ou excluir obras ou depoimentos, gere um build novo**:

- **Cloudflare Pages (projeto ligado ao Git):** em **Deployments**, use **Retry deployment** no último deploy de produção. Para não depender do painel, crie um *deploy hook* em **Settings → Builds → Add deploy hook** (branch `main`) e chame a URL gerada quando precisar:

  ```bash
  curl.exe -X POST "<URL do deploy hook>"
  ```

  Quem tem essa URL dispara builds sem senha: guarde-a como segredo e nunca a coloque no front-end nem no repositório.
- **Cloudflare Pages (upload direto, sem Git):** rode `npm run build` localmente e envie a pasta `dist` de novo.
- **EasyPanel:** clique em **Deploy** no serviço do site; o build roda de novo e lê as obras do banco. O EasyPanel também mostra, nas configurações do serviço, uma URL de webhook de deploy que pode ser chamada da mesma forma.

O build não é disparado sozinho quando uma obra muda: faça isso à mão, pelo painel da hospedagem ou chamando a URL do deploy hook. Agrupe as alterações (ex.: termine de cadastrar as obras do dia e gere um build só) em vez de gerar um build a cada clique no painel.

## Pendências de conteúdo (PRD)

Os pontos abaixo estão marcados com `PENDENTE` no código:

- [ ] Cidade(s) de atuação — hoje o site assume São Paulo e região (`src/config/site.ts`)
- [ ] Confirmar o @ do Instagram
- [ ] Logo em vetor original, códigos de cor e fontes oficiais. Hoje o logo em `public/marca/` foi vetorizado a partir da imagem enviada (`marca/logo-original.webp`, via `marca/vetorizar-logo.cjs`)
- [ ] Fotos reais das obras e dados de cada uma (hoje: ilustrações técnicas provisórias)
- [ ] Nome, foto, mini-bio e CREA do responsável técnico; CNPJ
- [ ] Depoimentos de clientes, com autorização
- [ ] Revisar os textos-base com o PDF (Quem somos, Missão/Visão/Valores, benefícios de cada serviço)
- [ ] Logos de parceiros e e-mail com domínio próprio
