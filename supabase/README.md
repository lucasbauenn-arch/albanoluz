# Supabase — Albano Luz Engenharia

Banco, autenticação do painel, armazenamento de fotos/anexos e a função que recebe o formulário de orçamento.

```
supabase/
├── migrations/20260924120000_inicial.sql   tabelas, RLS, is_admin(), buckets e políticas de storage
├── seed.sql                                12 obras ilustrativas (mesmo conteúdo de src/data/obras.ts)
└── functions/enviar-lead/index.ts          recebe o formulário, grava o lead e avisa o n8n
n8n/novo-lead.json                          fluxo n8n: e-mail + WhatsApp da equipe
```

## 1. Criar o projeto

1. Em <https://supabase.com/dashboard>, crie um projeto (região **South America (São Paulo)**).
2. Em **Project Settings → API**, copie a **URL** e a chave **anon / publishable**.
3. Na raiz do site, crie `.env.local` (e configure as mesmas variáveis na hospedagem):

   ```env
   VITE_SUPABASE_URL=https://<ref-do-projeto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<chave anon ou publishable>
   # opcional (anti-spam do formulário)
   VITE_TURNSTILE_SITE_KEY=<site key do Cloudflare Turnstile>
   ```

   Nunca coloque a chave **service_role / secret** no front-end.

## 2. Aplicar a migração e a carga inicial

**Pelo painel (mais simples):** abra **SQL Editor**, cole e execute o conteúdo de
`migrations/20260924120000_inicial.sql`; depois, em uma nova consulta, execute `seed.sql`.
Os dois scripts podem ser executados de novo sem erro.

**Pela CLI:**

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push --include-seed
```

A migração cria:

| Item | Detalhe |
| --- | --- |
| `obras`, `obra_fotos`, `depoimentos` | Leitura pública só do que está publicado; escrita só de admins |
| `leads` | Leitura, edição e exclusão só de admins; **sem INSERT pelo cliente** (a função usa a service role) |
| `admins` | Lista de usuários com acesso ao painel; cada um só enxerga a própria linha |
| `public.is_admin()` | `security definer`; usada pelas políticas RLS e pelo painel |
| Bucket `obras` | Público, até 15 MB, só imagens (WebP/JPEG/PNG/AVIF). Upload só de admins |
| Bucket `anexos` | Privado, até 20 MB, PDF/DWG. Upload só pela função; admins leem e excluem |

Se o SQL Editor recusar a criação dos buckets, crie-os em **Storage → New bucket** com os mesmos nomes e
limites acima e rode a migração de novo (as políticas de storage são recriadas).

## 3. Autenticação do painel

Em **Authentication**:

1. **Sign In / Providers → Email:** mantenha o login por e-mail ativo e **desligue “Allow new users to sign up”**
   (o painel não tem cadastro; os usuários são criados manualmente).
2. **URL Configuration:**
   - Site URL: `https://albanoluz.com`
   - Redirect URLs: `https://albanoluz.com/admin`, `https://www.albanoluz.com/admin`,
     `http://localhost:5173/admin`
3. **SMTP Settings:** configure um SMTP próprio (ex.: o mesmo usado pelo n8n). O e-mail padrão do Supabase
   tem limite baixo e só entrega para membros da organização — sem SMTP próprio o **“Esqueci minha senha”
   não chega** ao e-mail da equipe.
4. (Opcional) **Email Templates → Reset Password:** traduza o texto para português.

### Criar o primeiro administrador

1. **Authentication → Users → Add user → Create new user**: informe e-mail e senha e marque
   **Auto Confirm User**.
2. No **SQL Editor**, libere o acesso ao painel:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'albano.luzengenharia@gmail.com'
   on conflict do nothing;
   ```

Para remover um acesso: `delete from public.admins where user_id = (select id from auth.users where email = '...');`

O painel fica em `/admin`. Um usuário que faz login mas não está em `admins` vê “Acesso não autorizado”.

## 4. Função `enviar-lead`

Recebe o formulário do site (`multipart/form-data`), valida os campos, verifica o Turnstile, salva o anexo no
bucket `anexos` (`AAAA/MM/<uuid>-<nome>`), grava o lead com a service role e avisa o n8n. Falhas no aviso ao
n8n ficam só no log: o lead já está salvo e o visitante recebe sucesso.

### Secrets

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já vêm prontas no ambiente da função. Configure as demais:

| Secret | Obrigatória | Uso |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | não | Origens liberadas no CORS, separadas por vírgula. Padrão: `https://albanoluz.com,https://www.albanoluz.com,http://localhost:5173,http://localhost:4173` |
| `TURNSTILE_SECRET_KEY` | recomendada | Secret key do Cloudflare Turnstile. Se definida, o token passa a ser obrigatório |
| `N8N_WEBHOOK_URL` | recomendada | URL de produção do webhook do n8n (passo 5) |
| `N8N_WEBHOOK_SECRET` | recomendada | Segredo enviado no cabeçalho `x-webhook-secret`; o mesmo valor vai no n8n |
| `SITE_URL` | não | Base do link do painel enviado nas notificações. Padrão: `https://albanoluz.com` |

```bash
npx supabase secrets set \
  TURNSTILE_SECRET_KEY=0x4AAAA... \
  N8N_WEBHOOK_URL=https://n8n.seudominio.com/webhook/albano-luz-novo-lead \
  N8N_WEBHOOK_SECRET=$(openssl rand -hex 24)
```

(Ou em **Edge Functions → Secrets** no painel.)

### Deploy

```bash
npx supabase functions deploy enviar-lead --no-verify-jwt
```

`--no-verify-jwt` é necessário: a função é pública (chamada pelo formulário com a chave anon/publishable, que
com as chaves novas nem é um JWT). A proteção fica por conta de CORS, honeypot, Turnstile e validação.
Alternativa permanente: em `supabase/config.toml`, `[functions.enviar-lead]` com `verify_jwt = false`.

### Contrato

`POST https://<ref>.supabase.co/functions/v1/enviar-lead` com cabeçalhos `apikey` e
`Authorization: Bearer <anon key>` e corpo `multipart/form-data`:

| Campo | Regra |
| --- | --- |
| `nome` | obrigatório, até 120 caracteres |
| `telefone` | obrigatório, 10 a 15 dígitos |
| `email`, `empresa`, `cidade` | opcionais |
| `perfil` | obrigatório: `arquiteto`, `construtora` ou `particular` |
| `servicos` | JSON com lista de slugs, ex.: `["estrutural","fundacao"]` (slugs desconhecidos são ignorados) |
| `area_m2` | opcional, número (aceita `1.234,5`) |
| `mensagem` | opcional, até 5.000 caracteres |
| `origem` | caminho da página de origem |
| `consentimento` | precisa ser `"true"` |
| `turnstile_token` | obrigatório se `TURNSTILE_SECRET_KEY` estiver definida |
| `website` | honeypot: se vier preenchido, responde `200 {ok:true}` sem gravar |
| `anexo` | opcional, `.pdf` ou `.dwg` até 20 MB (o conteúdo do arquivo também é conferido) |

Respostas: `200 {"ok":true,"id":"<uuid>"}` ou `4xx/5xx {"ok":false,"erro":"mensagem em português"}`.

Teste rápido:

```bash
curl -i -X POST "https://<ref>.supabase.co/functions/v1/enviar-lead" \
  -H "apikey: <anon>" -H "Authorization: Bearer <anon>" \
  -F nome="Teste" -F telefone="11 91234-5678" -F perfil=arquiteto \
  -F servicos='["estrutural"]' -F consentimento=true -F origem=/contato
```

(Com `TURNSTILE_SECRET_KEY` definida o teste precisa de um token válido; para testar, use temporariamente a
[secret key de teste](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) `1x0000000000000000000000000000000AA`
com qualquer token.)

Logs: **Edge Functions → enviar-lead → Logs**.

**Webhook de banco não é necessário:** a própria função chama o n8n depois de gravar o lead.

## 5. n8n (e-mail + WhatsApp da equipe)

1. No n8n, **Workflows → Import from file** e escolha `n8n/novo-lead.json`.
2. Variáveis de ambiente do n8n (no EasyPanel/Docker):

   ```env
   ALBANO_WEBHOOK_SECRET=<mesmo valor de N8N_WEBHOOK_SECRET>
   EVOLUTION_URL=https://evolution.seudominio.com
   EVOLUTION_INSTANCE=<nome da instância>
   EVOLUTION_APIKEY=<apikey da instância>
   N8N_BLOCK_ENV_ACCESS_IN_NODE=false
   ```

   A última linha libera o uso de `$env` nas expressões. Se preferir não liberar, troque as expressões
   `$env.…` dos nós “Segredo confere?” e “WhatsApp da equipe” pelos valores fixos.
3. No nó **Enviar e-mail**, selecione (ou crie) a credencial SMTP. Para Gmail, use `smtp.gmail.com`,
   porta 465 (SSL) e uma **senha de app** da conta.
4. O nó **WhatsApp da equipe** usa o formato da Evolution API v2 (`POST /message/sendText/{instância}` com
   `{ "number": "5511932742355", "text": "..." }`). Na v1 o corpo é
   `{ "number": "...", "textMessage": { "text": "..." } }`.
5. Ative o workflow e copie a **Production URL** do nó Webhook para o secret `N8N_WEBHOOK_URL` da função.

O n8n recebe:

```json
{
  "evento": "lead_enviado",
  "lead": { "id": "...", "created_at": "...", "nome": "...", "telefone": "...", "email": "...", "empresa": "...",
            "perfil": "arquiteto", "servicos": ["estrutural"], "cidade": "...", "area_m2": 250,
            "mensagem": "...", "anexo_path": "2026/09/<uuid>-planta.pdf", "origem": "/contato",
            "consentimento": true, "status": "novo" },
  "perfil_label": "Arquiteto(a)",
  "servicos_labels": ["Projeto Estrutural"],
  "anexo_url": "https://...assinada, válida por 7 dias... ou null",
  "whatsapp_url": "https://wa.me/5511912345678",
  "painel_url": "https://albanoluz.com/admin?aba=leads&lead=<id>"
}
```

## 6. Observações

- **Obras no site público:** o site é pré-renderizado. Obras novas aparecem na hora nas listagens (que leem o
  banco no navegador), mas a página própria de cada obra só é gerada no próximo deploy.
- **Imagens:** o painel converte as fotos para WebP (lado maior até 1920 px) antes do upload. Em navegadores
  sem codificador WebP, envia JPEG redimensionado.
- **LGPD:** leads guardam o consentimento; o painel permite excluir um lead (e o anexo) a pedido do titular.
  Depoimentos só devem ser publicados com autorização do cliente.
