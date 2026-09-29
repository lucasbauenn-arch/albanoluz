# Supabase — Albano Luz Engenharia

Banco, autenticação do painel, armazenamento de fotos/anexos e a função que recebe o formulário de orçamento.

```
supabase/
├── migrations/20260924120000_inicial.sql          tabelas, RLS, is_admin(), buckets e políticas de storage
├── migrations/20260929120000_ajustes_storage.sql  bucket "obras" sem listagem pública
├── migrations/20260929130000_limites_envio.sql    limites de envio do formulário, garantidos no banco
├── seed.sql                                       12 obras ILUSTRATIVAS (mesmo conteúdo de src/data/obras.ts)
└── functions/enviar-lead/index.ts                 recebe o formulário, grava o lead e avisa o n8n
n8n/novo-lead.json                                 fluxo n8n: e-mail + WhatsApp da equipe
```

O caminho principal usa só o painel web do Supabase (<https://supabase.com/dashboard>). A CLI aparece como
alternativa em cada passo. Os nomes de menu podem mudar um pouco entre versões do painel.

## Ordem de ativação

1. Migrações e carga inicial (passo 2). Se a inicial, a de ajustes e o seed já foram executados, falta só a
   migração de limites de envio.
2. **Desligar o cadastro público** e criar o administrador (passo 3).
3. Publicar a função `enviar-lead` com os secrets (passo 4) e o fluxo do n8n (passo 5).
4. Só então gerar o build do site com `VITE_SUPABASE_*` e publicar ([README principal → Deploy](../README.md#deploy)).
   O build lê as obras do banco (sem o seed não há portfólio) e o formulário passa a depender da função.
5. Testar depois do deploy (passo 6).
6. Turnstile, antes de divulgar o formulário (passo 7): as duas chaves ou nenhuma.

## 1. Projeto e variáveis do site

1. Crie o projeto (região **South America (São Paulo)**).
2. Em **Project Settings**, nas páginas de API, copie a **URL do projeto** e a chave **anon / publishable**.
3. Na raiz do site, copie `.env.example` para `.env` (ou `.env.local`; o git ignora os dois), preencha e configure
   as mesmas variáveis na hospedagem:

   ```env
   VITE_SUPABASE_URL=https://<ref-do-projeto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<chave anon ou publishable>
   ```

- Os nomes **precisam** começar com `VITE_`. Sem o prefixo (ex.: `SUPABASE_URL`) o Vite ignora a variável sem avisar
  e o site funciona como se não houvesse Supabase.
- As variáveis `VITE_*` são lidas **no build** e ficam no código público do site. Depois de criar ou alterar qualquer
  uma, gere o build e publique de novo: mudar só no painel da hospedagem não tem efeito.
- Nunca coloque a chave **service_role / secret** no front-end nem em uma variável `VITE_*`.
- `VITE_TURNSTILE_SITE_KEY` fica sempre vazia no `.env`. Ela só entra na hospedagem, no passo 7.

## 2. Migrações e carga inicial

**Pelo painel:** em **SQL Editor**, execute cada arquivo em uma consulta nova, nesta ordem:

1. `migrations/20260924120000_inicial.sql` (pule se já foi aplicada);
2. `migrations/20260929120000_ajustes_storage.sql`;
3. `migrations/20260929130000_limites_envio.sql`;
4. `seed.sql`.

> **Já executou a inicial, a de ajustes e o seed?** Execute agora só a `20260929130000_limites_envio.sql`, em uma
> consulta nova, **antes de publicar ou atualizar a função** `enviar-lead` (passo 4). A função usa a coluna
> `origem_hash` e o trigger que essa migração cria: sem ela, os limites de envio não são garantidos e o log da
> função mostra erros.

As migrações podem ser executadas de novo sem erro. O seed também, mas só deve rodar uma vez: ele recria, já
publicadas, as obras ilustrativas que tiverem sido excluídas. A migração inicial recria a política de leitura
pública do bucket `obras`: sempre que executá-la de novo, execute logo em seguida as outras duas migrações, na ordem.

Conferência, logo depois do seed (uma consulta só, que mostra uma linha):

```sql
select (select count(*) from public.obras) as obras,
       (select count(*) from public.obra_fotos) as fotos,
       exists (select 1 from pg_policies
               where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'obras (storage): leitura pública') as leitura_publica,
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'leads'
                 and column_name = 'origem_hash') as limites_envio;
```

Resultado esperado: `obras` = 12, `fotos` = 39, `leitura_publica` = false e `limites_envio` = true. As duas
contagens valem logo depois do seed; elas mudam conforme obras são cadastradas ou excluídas no painel.

> **As 12 obras do seed são ilustrativas** (fotos de banco de imagens e desenhos provisórios). Enquanto alguma
> estiver publicada, o site mostra um aviso de conteúdo ilustrativo. Conforme as obras reais forem cadastradas no
> painel, despublique ou exclua as ilustrativas.

**Pela CLI:**

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push --include-seed
```

O `link` pode pedir a senha do banco (definida na criação do projeto). O `db push` aplica as migrações que ainda não
estão no histórico da CLI; reaplicar a inicial feita antes pelo SQL Editor não dá erro.

As migrações criam:

| Item | Detalhe |
| --- | --- |
| `obras`, `obra_fotos`, `depoimentos` | Leitura pública só do que está publicado; escrita só de admins |
| `leads` | Leitura, edição e exclusão só de admins; **sem INSERT pelo cliente** (a função usa a service role). Um trigger aplica os limites de envio (passo 4) |
| `admins` | Lista de usuários com acesso ao painel; cada um só enxerga a própria linha |
| `public.is_admin()` | `security definer`; usada pelas políticas RLS e pelo painel |
| Bucket `obras` | Público (as imagens abrem pela URL pública), até 15 MB, só imagens (WebP/JPEG/PNG/AVIF). Listagem, envio e exclusão só de admins |
| Bucket `anexos` | Privado, até 20 MB, PDF/DWG. Upload só pela função; admins leem e excluem |

Se o SQL Editor recusar a criação dos buckets, crie-os em **Storage → New bucket** com os mesmos nomes e limites
acima e execute de novo a migração inicial e, em seguida, as outras duas migrações, na ordem.

## 3. Autenticação do painel

> **Importante: desligue o cadastro público.** Em **Authentication → Sign In / Providers**, desligue
> **Allow new users to sign up** e mantenha o login por e-mail ativo. O painel não tem cadastro: os usuários são
> criados à mão. Com o cadastro aberto, qualquer pessoa com a chave anon (que é pública) cria contas e dispara
> e-mails de confirmação pelo SMTP da empresa, gastando o limite de envio do projeto; quando ele estoura, o
> “Esqueci minha senha” do painel para de funcionar. Essas contas não acessam dados (RLS), mas devem ser apagadas.

Ainda em **Authentication**:

1. **URL Configuration:**
   - Site URL: `https://albanoluz.com`
   - Redirect URLs: `https://albanoluz.com/admin`, `https://www.albanoluz.com/admin`,
     `http://localhost:5173/admin`
2. **SMTP Settings:** configure um SMTP próprio (ex.: o mesmo usado pelo n8n). O e-mail padrão do Supabase
   tem limite baixo e só entrega para membros da organização: sem SMTP próprio o **“Esqueci minha senha”
   não chega** ao e-mail da equipe.
3. (Opcional) **Email Templates → Reset Password:** traduza o texto para português.

### Criar o primeiro administrador

1. **Authentication → Users → Add user → Create new user**: informe e-mail e senha e marque
   **Auto Confirm User**.
2. No **SQL Editor**, libere o acesso ao painel (troque o e-mail pelo usado no item 1, em letras minúsculas):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'albano.luzengenharia@gmail.com'
   on conflict do nothing;
   ```

3. Confira. O e-mail do administrador precisa aparecer no resultado:

   ```sql
   select u.email from public.admins a join auth.users u on u.id = a.user_id;
   ```

   Se o resultado vier vazio, o e-mail do item 2 não é igual ao do usuário criado no item 1: corrija e execute o
   item 2 de novo. O SQL Editor não mostra erro quando o e-mail não existe: só esta conferência revela o problema.

Para remover um acesso: `delete from public.admins where user_id = (select id from auth.users where email = '...');`

Contas criadas enquanto o cadastro esteve aberto (exclua em **Authentication → Users** as que não reconhecer):

```sql
select id, email, created_at from auth.users
where id not in (select user_id from public.admins)
order by created_at;
```

O painel fica em `/admin`. Um usuário que faz login mas não está em `admins` vê “Acesso não autorizado”.

## 4. Função `enviar-lead`

Recebe o formulário do site (`multipart/form-data`), valida os campos, verifica o Turnstile, aplica os limites de
envio, salva o anexo no bucket `anexos` (`AAAA/MM/<uuid>-<nome>`), grava o lead com a service role e avisa o
n8n. Falhas no aviso ao n8n ficam só no log: o lead já está salvo e o visitante recebe sucesso.

Antes de publicar a função, confira que a migração `20260929130000_limites_envio.sql` já foi executada (passo 2).

### Secrets

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já vêm prontas no ambiente da função. Configure as demais:

| Secret | Obrigatória | Uso |
| --- | --- | --- |
| `N8N_WEBHOOK_URL` | sim, para a equipe ser avisada | Production URL do webhook do n8n (passo 5). Sem ela, os leads ficam só no painel |
| `N8N_WEBHOOK_SECRET` | sim, junto com `N8N_WEBHOOK_URL` | Vai no cabeçalho `x-webhook-secret`; o n8n recusa (403) se não for igual ao **Value** da credencial do nó Webhook (passo 5) |
| `LIMITE_SAL` | não, mas recomendada | Valor secreto usado para guardar a origem de cada pedido como código (hash), sem gravar o IP do visitante (veja [Limites de envio](#limites-de-envio)). Sem ela, a função usa um valor derivado da configuração do projeto e registra um aviso no log |
| `TURNSTILE_SECRET_KEY` | **só com a site key publicada** | Secret key do Cloudflare Turnstile. Veja o passo 7 antes de definir |
| `ALLOWED_ORIGINS` | não | Origens liberadas no CORS, separadas por vírgula. Padrão: `https://albanoluz.com,https://www.albanoluz.com,http://localhost:5173,http://localhost:4173`. **Ao definir, liste todas as origens: a lista substitui o padrão** (veja o passo 6) |
| `SITE_URL` | não | Base do link do painel enviado nas notificações. Padrão: `https://albanoluz.com` |

**Gere os valores secretos em um terminal.** Cada comando abaixo exibe na tela um valor novo; execute-o uma vez para
cada secret e copie o valor exibido, sem aspas nem espaços:

```bash
openssl rand -hex 24                                                 # Git Bash, Linux ou macOS
```

```powershell
[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')    # PowerShell
```

- **Segredo do webhook (`N8N_WEBHOOK_SECRET`): guarde antes de usar.** O mesmo valor vai nos dois lados: aqui e no
  campo **Value** da credencial do nó Webhook no n8n (passo 5). Depois de salvo, nem o painel nem a CLI mostram o
  valor de novo, então copie-o antes para um gerenciador de senhas.
- **`LIMITE_SAL`:** use um valor diferente do segredo do webhook. Ele não precisa ser guardado: se um dia for
  trocado, só a contagem de pedidos por origem dos últimos 10 minutos recomeça do zero.

**Pelo painel:** em **Edge Functions → Secrets**, adicione cada nome e valor e salve. Os secrets valem na hora,
sem novo deploy da função.

**Pela CLI** (depois do `login` e do `link` do passo 2; em uma linha, funciona também no PowerShell):

```bash
npx supabase secrets set N8N_WEBHOOK_URL=https://n8n.seudominio.com/webhook/albano-luz-novo-lead N8N_WEBHOOK_SECRET=<valor gerado> LIMITE_SAL=<outro valor gerado>
```

Sem o `link`, acrescente `--project-ref <ref-do-projeto>` aos comandos.

### Deploy

**Pelo painel:**

1. **Edge Functions → Deploy a new function → Via Editor**.
2. Apague o código de exemplo e cole o conteúdo inteiro de `supabase/functions/enviar-lead/index.ts`.
3. Dê à função o nome `enviar-lead` (exatamente assim: o site chama `/functions/v1/enviar-lead`) e clique em
   **Deploy function**.
4. Na página da função, nas configurações, **desligue a verificação de JWT** (opção “Verify JWT with legacy
   secret”; em versões anteriores do painel, “Enforce JWT Verification”) e salve.

Para atualizar, abra a função, cole a versão nova do `index.ts` e faça o deploy de novo. O editor do painel não
guarda versões: o arquivo do repositório é a referência. **Depois de cada deploy, confira se a verificação de JWT
continua desligada**: esse ajuste pode voltar a ligar sozinho.

**Pela CLI:**

```bash
npx supabase functions deploy enviar-lead --no-verify-jwt
```

Sem Docker instalado, acrescente `--use-api`.

A verificação de JWT precisa ficar desligada: a função é pública (chamada pelo formulário com a chave
anon/publishable, que com as chaves novas nem é um JWT). A proteção fica por conta de CORS, honeypot, limites de
envio, Turnstile e validação.

### Contrato

`POST https://<ref>.supabase.co/functions/v1/enviar-lead` com cabeçalhos `apikey` e
`Authorization: Bearer <anon key>` e corpo `multipart/form-data`:

| Campo | Regra |
| --- | --- |
| `nome` | obrigatório, até 120 caracteres |
| `telefone` | obrigatório, 10 a 15 dígitos |
| `email`, `empresa`, `cidade` | opcionais |
| `perfil` | obrigatório: `arquiteto`, `construtora` ou `particular` |
| `servicos` | slugs em JSON (`["estrutural","fundacao"]`) ou separados por vírgula; desconhecidos são ignorados |
| `area_m2` | opcional, número (aceita `1.234,5`) |
| `mensagem` | opcional, até 5.000 caracteres |
| `origem` | caminho da página de origem |
| `consentimento` | precisa ser `"true"` |
| `turnstile_token` | obrigatório se `TURNSTILE_SECRET_KEY` estiver definida |
| `website` | honeypot: se vier preenchido, responde `200 {ok:true}` sem gravar |
| `anexo` | opcional, `.pdf` ou `.dwg` até 20 MB (o conteúdo do arquivo também é conferido) |

Respostas: `200 {"ok":true,"id":"<uuid>"}` ou `4xx/5xx {"ok":false,"erro":"mensagem em português"}`. O `429` indica
que um dos limites de envio foi atingido (abaixo).

Teste rápido (uma linha; no PowerShell use `curl.exe`, não `curl`):

```bash
curl.exe -i -X POST "https://<ref>.supabase.co/functions/v1/enviar-lead" -H "apikey: <anon>" -H "Authorization: Bearer <anon>" -F nome=Teste -F "telefone=11 91234-5678" -F perfil=arquiteto -F servicos=estrutural -F consentimento=true -F origem=/contato
```

Logs: **Edge Functions → enviar-lead → Logs**.

**Webhook de banco não é necessário:** a própria função chama o n8n depois de gravar o lead.

### Limites de envio

A migração `20260929130000_limites_envio.sql` cria um trigger na tabela `leads` que confere os limites na hora de
gravar cada pedido, um de cada vez: nem vários envios ao mesmo tempo conseguem passar do limite. Quando um limite
estoura, a função responde `429` e o visitante vê uma mensagem em português que indica o WhatsApp da equipe.

| Limite | Janela | O que acontece ao passar |
| --- | --- | --- |
| 3 pedidos do mesmo telefone (contam só os dígitos) | 10 minutos | O pedido seguinte desse telefone é recusado |
| 5 pedidos da mesma origem (a conexão de internet do visitante) | 10 minutos | O pedido seguinte dessa origem é recusado |
| 10 pedidos **com anexo**, somando todos os visitantes | 60 minutos | Só pedidos com anexo são recusados, com uma mensagem pedindo para enviar sem o arquivo ou mandá-lo pelo WhatsApp (11) 93274-2355. Pedidos sem anexo continuam entrando |

O IP do visitante nunca é gravado: a função guarda na coluna `origem_hash` só um código (hash SHA-256) calculado a
partir do IP e do `LIMITE_SAL`, que serve apenas para essa contagem. Se o anexo já tiver sido enviado quando o
banco recusar o pedido, a função apaga o arquivo.

**Disjuntor das notificações:** se chegarem mais de 30 pedidos no total em 10 minutos, eles continuam sendo gravados
normalmente, mas a função deixa de avisar o n8n (e-mail e WhatsApp da equipe) enquanto o volume estiver alto, e
registra no log uma linha que começa com `Disjuntor`. Nenhum pedido legítimo é recusado pelo volume total: nesses
momentos, confira os pedidos direto no painel (`/admin` → Leads).

Os limites reduzem o estrago de um robô, mas não impedem pedidos falsos. **A proteção principal recomendada
continua sendo o Turnstile (passo 7).**

## 5. n8n (e-mail + WhatsApp da equipe)

O segredo do webhook e a apikey da Evolution API ficam em **credenciais** do n8n, que ele guarda criptografadas.
Não é preciso criar variáveis de ambiente no n8n nem reiniciá-lo.

1. **Importar:** no n8n, crie um workflow novo, em branco. No menu **⋯** do canto superior direito do editor,
   escolha a opção de importar de arquivo (**Import → From file**; em versões anteriores, **Import from File...**) e
   selecione `n8n/novo-lead.json`. Até você escolher as credenciais (itens 2 a 4), os nós que usam credencial
   aparecem com um aviso: é normal.
2. **Credencial do webhook:** abra o nó **Webhook novo lead**. O campo **Authentication** já vem como **Header Auth**.
   No campo da credencial, escolha **Create new credential** e preencha:
   - **Name:** `x-webhook-secret`
   - **Value:** o mesmo valor gerado para `N8N_WEBHOOK_SECRET` (passo 4), sem aspas nem espaços.

   Salve a credencial. Para reconhecê-la depois, dê a ela um nome como `Albano Luz — segredo do webhook`. Com essa
   credencial, o n8n recusa com `403` qualquer chamada que não traga esse cabeçalho com esse valor.
3. **WhatsApp:** abra o nó **WhatsApp da equipe (Evolution API)**.
   - No campo da credencial (também do tipo Header Auth), escolha **Create new credential** com **Name** `apikey` e
     **Value** a apikey da instância da Evolution API. Nome sugerido: `Evolution API — apikey`.
   - No campo **URL**, troque `https://PREENCHA-A-URL-DA-EVOLUTION.invalid` pelo endereço da sua Evolution API e
     `PREENCHA-A-INSTANCIA` pelo nome da instância. Exemplo do resultado:
     `https://evolution.seudominio.com/message/sendText/albano`. Endereço e instância não são segredos e ficam
     escritos no nó; a apikey fica só na credencial.
   - O nó usa o formato da Evolution API v2 (`POST /message/sendText/{instância}` com
     `{ "number": "5511932742355", "text": "..." }`). Na v1 o corpo é
     `{ "number": "...", "textMessage": { "text": "..." } }`.
4. **E-mail:** no nó **Enviar e-mail**, selecione (ou crie) a credencial SMTP. Para Gmail, use `smtp.gmail.com`,
   porta 465 (SSL) e uma **senha de app** da conta.
5. **Confira as credenciais:** as duas credenciais Header Auth são do mesmo tipo, e o n8n pode sugerir a mesma
   nos dois nós. O nó **Webhook novo lead** precisa ficar com a de `x-webhook-secret`, e o nó **WhatsApp da equipe**,
   com a de `apikey`.
6. **Publicar:** no n8n 2.x, clique em **Publish**; no 1.x, salve o workflow e ligue a chave **Active**. Sem isso, o
   endereço de produção não responde. Depois copie a **Production URL** do nó Webhook para o secret
   `N8N_WEBHOOK_URL` da função (passo 4).

> **Já tinha configurado uma versão anterior deste fluxo?** Ela lia o segredo e a apikey de variáveis de ambiente
> do n8n. Despublique ou apague o workflow antigo antes de publicar o novo, porque os dois usam o mesmo endereço de
> webhook. Depois, remova do n8n as variáveis `ALBANO_WEBHOOK_SECRET`, `EVOLUTION_URL`, `EVOLUTION_INSTANCE` e
> `EVOLUTION_APIKEY`. Quanto a `N8N_BLOCK_ENV_ACCESS_IN_NODE` (que, em `false`, deixa qualquer workflow da
> instância ler as variáveis do servidor): no n8n 2.x basta apagar a linha, porque o padrão já bloqueia; no 1.x o
> padrão é liberar, então troque para `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` (antes, confira se nenhum outro
> workflow da instância usa `$env`). Reinicie o n8n para a mudança valer.

Se o lead aparece no painel mas a equipe não é avisada, veja os logs da função (**Edge Functions → enviar-lead →
Logs**):

- `n8n respondeu 403`: o segredo não confere. O **Value** da credencial do nó Webhook precisa ser igual ao
  `N8N_WEBHOOK_SECRET`, e o **Name**, `x-webhook-secret`.
- `n8n respondeu 404`: o workflow não está publicado, ou a `N8N_WEBHOOK_URL` não é a Production URL.
- outro erro, ou nenhum erro na função: no n8n, abra **Executions** e veja em qual nó a execução falhou. Se o
  e-mail chega mas o WhatsApp não, confira a URL e a credencial do nó **WhatsApp da equipe**.
- linha que começa com `Disjuntor`: muitos pedidos em pouco tempo (veja [Limites de envio](#limites-de-envio)). O
  aviso foi pulado de propósito; os pedidos estão no painel.

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

## 6. Teste depois do deploy

Com o site publicado, a função no ar e o workflow do n8n publicado.

> **Site ainda em endereço provisório?** No primeiro deploy, o site costuma abrir em um endereço provisório (ex.:
> `https://<projeto>.pages.dev` ou o domínio padrão do EasyPanel). A função só aceita pedidos de `albanoluz.com`,
> `www.albanoluz.com` e `localhost`: de outro endereço, o formulário mostra “Não foi possível conectar. Verifique sua
> internet e tente novamente.”. Antes do teste, aponte o domínio definitivo para o site **ou** defina o secret
> `ALLOWED_ORIGINS` (passo 4) com a lista completa, porque ela substitui a lista padrão:
>
> ```text
> https://albanoluz.com,https://www.albanoluz.com,https://<projeto>.pages.dev,http://localhost:5173,http://localhost:4173
> ```
>
> Troque `https://<projeto>.pages.dev` pelo endereço provisório exato, sem barra no final. Depois de apontar o
> domínio definitivo, remova o secret `ALLOWED_ORIGINS`.

1. Gere um PDF de teste com ~19,9 MB, perto do limite de 20 MB (a função só confere o início do arquivo):

   ```powershell
   $b = [byte[]]::new(20860000); [Text.Encoding]::ASCII.GetBytes("%PDF-1.4`n").CopyTo($b, 0); [IO.File]::WriteAllBytes("$PWD\teste-19mb.pdf", $b)
   ```

   ```bash
   { printf '%%PDF-1.4\n'; head -c 20860000 /dev/zero; } > teste-19mb.pdf    # Git Bash
   ```

2. No site publicado, envie um pedido pelo formulário de orçamento com esse anexo.
3. Confira: mensagem de sucesso no site; o lead em `/admin` → Leads, com o anexo baixando; e-mail e WhatsApp da
   equipe, com o botão “Baixar anexo” funcionando.
4. **Confira se a função identifica a conexão do visitante** (é o que faz valer o limite por conexão). Envie mais
   um pedido de outra conexão, por exemplo o 4G do celular com o Wi-Fi desligado e outro telefone, e rode no
   SQL Editor:

   ```sql
   select created_at, telefone, left(origem_hash, 12) as origem
   from public.leads order by created_at desc limit 5;
   ```

   A coluna `origem` precisa vir **preenchida** e **diferente** nas duas conexões. Se vier vazia ou igual, não
   divulgue o formulário e avise o desenvolvedor: a função não está lendo o IP do visitante (com `origem` igual,
   todos os visitantes dividiriam o mesmo limite de 5 pedidos a cada 10 minutos). Se o site mostrar “Não foi
   possível ler o envio. Atualize a página e tente novamente.”, o tamanho do envio não chegou à função; avise
   também.
5. Exclua os leads de teste no painel (os anexos são apagados junto).

Pelo terminal, o mesmo teste é o `curl.exe` do passo 4 com `-F "anexo=@teste-19mb.pdf;type=application/pdf"`
(só enquanto o Turnstile não estiver ativo; veja o passo 7).

Os [limites de envio](#limites-de-envio) valem também para os testes: até 3 envios do mesmo telefone e 5 da mesma
conexão a cada 10 minutos, e 10 envios com anexo por hora, somando todos. Se aparecer a mensagem de limite,
aguarde e tente de novo.

## 7. Turnstile (anti-spam): as duas chaves ou nenhuma

A site key (`VITE_TURNSTILE_SITE_KEY`, no build do site) e a secret key (`TURNSTILE_SECRET_KEY`, nos secrets da
função) andam juntas. Com a secret definida, a função exige o token; se o site publicado não tiver a site key, o
widget não aparece, nenhum token é enviado e **todo pedido é recusado** com “Confirme a verificação anti-spam antes
de enviar.”. Sem Turnstile, o formulário fica protegido só pelo honeypot e pelos
[limites de envio](#limites-de-envio), que reduzem mas não impedem pedidos falsos: **o Turnstile é a proteção
principal recomendada**. Ative antes de divulgar o site.

**Para ativar, nesta ordem:**

1. Aponte antes o domínio definitivo para o site: o widget só funciona nos endereços cadastrados nele. No painel
   da Cloudflare, em **Turnstile**, crie um widget com os hostnames `albanoluz.com` e `www.albanoluz.com`. Copie a
   site key e a secret key.
2. Defina `VITE_TURNSTILE_SITE_KEY` **só na hospedagem** (no Cloudflare Pages, nas variáveis do projeto; no
   EasyPanel, nas variáveis de ambiente do serviço do site), gere o build e publique. **Deixe-a vazia no `.env`:**
   o widget não funciona em `localhost`, e com a site key no `.env` o formulário do `npm run dev` fica travado em
   “Confirme a verificação anti-spam.”. Se você gera o build na sua máquina e envia a pasta `dist` (upload direto no
   Cloudflare Pages), coloque a site key em um arquivo `.env.production` na raiz do site: o `npm run build` lê esse
   arquivo, e o `npm run dev` não. Confira que o widget aparece no formulário do site publicado e que um envio
   ainda funciona.
3. Só então adicione `TURNSTILE_SECRET_KEY` em **Edge Functions → Secrets** e faça um envio real pelo site.

**Para desativar, na ordem inversa:** primeiro remova `TURNSTILE_SECRET_KEY` dos secrets (vale na hora); depois
tire a site key da hospedagem (e do `.env.production`, se usar), gere o build e publique de novo. Para trocar de
widget, desative e ative de novo com as chaves novas.

**Testes depois de ativar:** teste só pelo site publicado. Com a secret definida, a função recusa todo pedido sem
token: o formulário do `npm run dev` e o `curl.exe` do passo 4 recebem “Confirme a verificação anti-spam antes de
enviar.”, e isso é o esperado. Se quiser testar a função pelo terminal (`curl.exe` do passo 6), faça isso antes de
adicionar a `TURNSTILE_SECRET_KEY` (item 3 acima).

**Nunca troque a `TURNSTILE_SECRET_KEY` da função publicada por uma chave de teste da Cloudflare.** Enquanto ela
estiver lá, a verificação deixa de proteger o formulário ou passa a recusar os visitantes reais, sem nenhum sinal
visível no site.

## 8. Observações

- **Obras no site público:** o site é pré-renderizado. Obras novas aparecem na hora nas listagens (que leem o
  banco no navegador), mas a página própria de cada obra, o `sitemap.xml` e a retirada de obras despublicadas ou
  excluídas só acontecem no próximo build. Veja [Novo deploy depois de mudar obras](../README.md#novo-deploy-depois-de-mudar-obras).
- **Imagens:** o painel converte as fotos para WebP (lado maior até 1920 px) antes do upload. Em navegadores
  sem codificador WebP, envia JPEG redimensionado.
- **LGPD:** leads guardam o consentimento; o painel permite excluir um lead (e o anexo) a pedido do titular.
  O IP do visitante não é gravado, só o código usado nos limites de envio (`origem_hash`). Depoimentos só devem
  ser publicados com autorização do cliente.
