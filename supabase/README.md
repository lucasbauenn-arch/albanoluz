# Supabase — Albano Luz Engenharia

Banco, autenticação do painel, armazenamento de fotos/anexos e a função que recebe o formulário de orçamento.

```
supabase/
├── migrations/20260924120000_inicial.sql          tabelas, RLS, is_admin(), buckets e políticas de storage
├── migrations/20260929120000_ajustes_storage.sql  bucket "obras" sem listagem pública
├── migrations/20260929130000_limites_envio.sql    limites de envio do formulário, garantidos no banco
├── seed.sql                                       12 obras ILUSTRATIVAS (mesmo conteúdo de src/data/obras.ts)
└── functions/enviar-lead/index.ts                 recebe o formulário, grava o lead e avisa a equipe por e-mail (SMTP)
```

O caminho principal usa só o painel web do Supabase (<https://supabase.com/dashboard>). A CLI aparece como
alternativa em cada passo. Os nomes de menu podem mudar um pouco entre versões do painel.

## Situação atual

No projeto da Albano Luz já estão no ar as três migrações (inicial, ajustes de storage e limites de envio), o seed
(passo 2) e a função `enviar-lead` (passo 4). A função publicada ainda é a versão anterior, que avisava a equipe
pelo n8n. O aviso agora é só por e-mail, enviado pela própria função. Falta:

1. Cadastrar os secrets do e-mail (passo 5).
2. Publicar de novo a função com o `index.ts` atual do repositório (passo 4 → Deploy) e conferir que a verificação
   de JWT continua desligada.
3. Se `N8N_WEBHOOK_URL` ou `N8N_WEBHOOK_SECRET` estiverem nos secrets, apagá-los (no painel, ou
   `npx supabase secrets unset N8N_WEBHOOK_URL N8N_WEBHOOK_SECRET`): a função não os usa mais. Um fluxo do n8n
   criado para o site, se existir, pode ser desligado.
4. Enviar um pedido de teste e conferir a chegada do e-mail (passo 6).

## Ordem de ativação

1. Migrações e carga inicial (passo 2).
2. **Desligar o cadastro público** e criar o administrador (passo 3).
3. Configurar o aviso por e-mail (passo 5) e publicar a função `enviar-lead` com os secrets (passo 4).
4. Só então gerar o build do site com `VITE_SUPABASE_*` e publicar ([README principal → Deploy](../README.md#deploy)).
   O build lê as obras do banco (sem o seed não há portfólio) e o formulário passa a depender da função.
5. Testar depois do deploy (passo 6), incluindo a chegada do e-mail.
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
2. **SMTP Settings:** configure um SMTP próprio; pode ser o mesmo do aviso de leads (veja
   [SMTP no login do painel](#smtp-no-login-do-painel-supabase-auth)). O e-mail padrão do Supabase tem limite baixo
   e só entrega para membros da organização: sem SMTP próprio o **“Esqueci minha senha” não chega** ao e-mail da
   equipe.
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
envio, salva o anexo no bucket `anexos` (`AAAA/MM/<uuid>-<nome>`), grava o lead com a service role e envia o
e-mail de aviso à equipe (passo 5). Falhas no e-mail ficam só no log: o lead já está salvo e o visitante recebe
sucesso.

Antes de publicar a função, confira que a migração `20260929130000_limites_envio.sql` já foi executada (passo 2).

### Secrets

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já vêm prontas no ambiente da função. Configure as demais:

| Secret | Obrigatória | Uso |
| --- | --- | --- |
| `LIMITE_SAL` | não, mas recomendada | Valor secreto usado para guardar a origem de cada pedido como código (hash), sem gravar o IP do visitante (veja [Limites de envio](#limites-de-envio)). Sem ela, a função usa um valor derivado da configuração do projeto e registra um aviso no log |
| `TURNSTILE_SECRET_KEY` | **só com a site key publicada** | Secret key do Cloudflare Turnstile. Veja o passo 7 antes de definir |
| `ALLOWED_ORIGINS` | não | Origens liberadas no CORS, separadas por vírgula. Padrão: `https://albanoluz.com,https://www.albanoluz.com,http://localhost:5173,http://localhost:4173`. **Ao definir, liste todas as origens: a lista substitui o padrão** (veja o passo 6) |
| `SITE_URL` | não | Base do link do painel no e-mail de aviso. Padrão: `https://albanoluz.com` |

Os secrets do e-mail (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` e `EMAIL_EQUIPE`) estão no
[passo 5](#5-aviso-por-e-mail-smtp).

**Gere o valor do `LIMITE_SAL` em um terminal.** Cada comando abaixo exibe na tela um valor novo; copie o valor
exibido, sem aspas nem espaços:

```bash
openssl rand -hex 24                                                 # Git Bash, Linux ou macOS
```

```powershell
[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')    # PowerShell
```

O `LIMITE_SAL` não precisa ser guardado: se um dia for trocado, só a contagem de pedidos por origem dos últimos
10 minutos recomeça do zero.

**Pelo painel:** em **Edge Functions → Secrets**, adicione cada nome e valor e salve. Os secrets valem na hora,
sem novo deploy da função.

**Pela CLI** (depois do `login` e do `link` do passo 2; em uma linha, funciona também no PowerShell):

```bash
npx supabase secrets set LIMITE_SAL=<valor gerado>
```

Sem o `link`, acrescente `--project-ref <ref-do-projeto>` aos comandos. Para apagar um secret:
`npx supabase secrets unset <NOME>`.

### Deploy

**Pelo painel:**

1. **Edge Functions → Deploy a new function → Via Editor**.
2. Apague o código de exemplo e cole o conteúdo inteiro de `supabase/functions/enviar-lead/index.ts`.
3. Dê à função o nome `enviar-lead` (exatamente assim: o site chama `/functions/v1/enviar-lead`) e clique em
   **Deploy function**.
4. Na página da função, nas configurações, **desligue a verificação de JWT** (opção “Verify JWT with legacy
   secret”; em versões anteriores do painel, “Enforce JWT Verification”) e salve.

Para atualizar (é o caso agora, para a versão que envia o e-mail), abra a função, cole a versão nova do
`index.ts` e faça o deploy de novo. O editor do painel não guarda versões: o arquivo do repositório é a referência.
**Depois de cada deploy, confira se a verificação de JWT continua desligada**: esse ajuste pode voltar a ligar
sozinho.

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

**Webhook de banco não é necessário:** a própria função envia o e-mail depois de gravar o lead.

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

**Disjuntor dos avisos:** se chegarem mais de 30 pedidos no total em 10 minutos, eles continuam sendo gravados
normalmente, mas a função deixa de enviar o e-mail de aviso à equipe enquanto o volume estiver alto, e registra no
log uma linha com a palavra `Disjuntor`. Nenhum pedido legítimo é recusado pelo volume total: nesses momentos,
confira os pedidos direto no painel (`/admin` → Leads).

Os limites reduzem o estrago de um robô, mas não impedem pedidos falsos. **A proteção principal recomendada
continua sendo o Turnstile (passo 7).**

## 5. Aviso por e-mail (SMTP)

A cada lead gravado, a própria função `enviar-lead` envia um e-mail de aviso para a equipe, conectando-se direto ao
servidor SMTP de uma conta de e-mail. Não há serviço intermediário nem aviso automático por WhatsApp.

- Sem `SMTP_HOST`, `SMTP_USER` e `SMTP_PASS`, o aviso é pulado (com uma mensagem no log) e o lead continua sendo
  gravado e aparece no painel.
- Uma falha no envio também fica só no log: o visitante recebe sucesso e o lead está no painel.

> **Use a porta 465 (SSL).** As Edge Functions do Supabase não podem abrir conexões nas portas 25 e 587: com elas, o
> envio sempre falha. Na porta 465 a função se conecta com SSL/TLS desde o início (TLS implícito). Em qualquer outra
> porta liberada (ex.: 2525, oferecida por serviços como Brevo, Mailgun e SendGrid) ela exige STARTTLS. SSL implícito
> em portas diferentes da 465 (ex.: 2465, 8465) não é suportado.

### Secrets do e-mail

| Secret | Obrigatória | Uso |
| --- | --- | --- |
| `SMTP_HOST` | sim, para o e-mail sair | Servidor de saída (SMTP) do provedor, ex.: `smtp.gmail.com` |
| `SMTP_PORT` | não | Deixe sem definir: `465`, com SSL. Qualquer outra porta é usada com STARTTLS (ex.: `2525`); 25 e 587 são bloqueadas pelo Supabase |
| `SMTP_USER` | sim | Usuário do SMTP: em geral, o endereço de e-mail completo |
| `SMTP_PASS` | sim | Senha do SMTP (no Gmail, a senha de app) |
| `SMTP_FROM` | não | Remetente. Padrão: o `SMTP_USER`. Aceita `Nome <email>`, ex.: `Site Albano Luz <admin@albanoluz.com>`. Use o endereço da própria conta do `SMTP_USER` (ou um alias autorizado nela) |
| `EMAIL_EQUIPE` | não | Quem recebe o aviso, separados por vírgula. Padrão: `albano.luzengenharia@gmail.com` |

**Pelo painel:** em **Edge Functions → Secrets** (o mesmo lugar do passo 4), adicione cada nome e valor e salve.
Valem na hora, sem novo deploy da função.

**Pela CLI** (uma linha; funciona também no PowerShell; troque os valores):

```bash
npx supabase secrets set SMTP_HOST=smtp.gmail.com SMTP_USER=conta.de.envio@gmail.com "SMTP_FROM=Site Albano Luz <conta.de.envio@gmail.com>" EMAIL_EQUIPE=albano.luzengenharia@gmail.com
```

Cadastre o `SMTP_PASS` pelo painel: na linha de comando, a senha fica no histórico do terminal, e símbolos como `$`
ou `&` podem ser interpretados pelo PowerShell ou pelo Bash.

### Receita: Gmail

1. Na conta Google que vai **enviar**, ative a **verificação em duas etapas** (Conta Google → **Segurança**). Sem
   ela, a opção de senha de app não aparece.
2. Crie uma **senha de app** (Conta Google → **Segurança** → **Verificação em duas etapas** → **Senhas de app**, no
   fim da página, ou direto em <https://myaccount.google.com/apppasswords>) com um nome como `Site Albano Luz`. Copie
   os 16 caracteres, sem os espaços. A senha normal da conta não funciona no SMTP. Se a página disser que a opção não
   está disponível, a verificação em duas etapas ainda não está ativa (ou, no Google Workspace, o administrador
   bloqueou senhas de app).
3. Secrets: `SMTP_HOST` = `smtp.gmail.com`; `SMTP_USER` = o endereço Gmail completo; `SMTP_PASS` = a senha de app;
   `SMTP_PORT` pode ficar sem definir (465). Se usar `SMTP_FROM`, mantenha o mesmo endereço
   (`Site Albano Luz <conta.de.envio@gmail.com>`): o Gmail troca o remetente pelo da conta quando ele é outro.

- **Limite diário:** o Gmail limita os envios por conta (numa conta gratuita, na casa de 500 destinatários por dia;
  cada endereço de `EMAIL_EQUIPE` conta). Para o volume do site sobra; se o limite estourar, o Gmail recusa envios
  por até 24 horas e os leads continuam no painel.
- **Prefira uma conta só para envio.** Se a conta que envia for a mesma que recebe (ex.:
  `albano.luzengenharia@gmail.com` enviando para ela mesma), o Gmail pode guardar o aviso só em **Enviados**, sem
  ele aparecer na caixa de entrada. Uma conta Gmail separada para os avisos (ou o e-mail de domínio) evita isso e
  mantém a senha de app longe da conta principal.
- Trocar a senha da conta Google revoga as senhas de app: crie outra e atualize o `SMTP_PASS`.

No Google Workspace (e-mail de domínio hospedado no Google), a receita é a mesma.

### Receita: e-mail de domínio (ex.: `admin@albanoluz.com`)

Use o SMTP do provedor que hospeda o e-mail do domínio (Hostinger, Zoho, Locaweb etc.). No painel do provedor,
procure os dados de SMTP (ou de configuração de um programa de e-mail) e confira:

- `SMTP_HOST`: o servidor de saída indicado pelo provedor (na Hostinger, por exemplo, `smtp.hostinger.com`);
- a porta **465 com SSL**. Se o provedor só oferecer 587 ou 25, ele não funciona com a função (portas bloqueadas pelo
  Supabase): use uma porta alternativa com STARTTLS, se o provedor tiver (ex.: 2525), outro provedor ou o Gmail;
- `SMTP_USER`: o endereço completo (`admin@albanoluz.com`); `SMTP_PASS`: a senha dessa caixa, ou uma senha de app,
  se o provedor exigir (alguns exigem quando a verificação em duas etapas está ativa).

Para o aviso não cair no spam, confira com o provedor se os registros SPF e DKIM do domínio estão no DNS.

### SMTP no login do painel (Supabase Auth)

Os e-mails de “Esqueci minha senha” do painel `/admin` saem pelo Supabase Auth, que tem uma configuração de SMTP
própria, separada dos secrets da função (passo 3). Em **Authentication**, nas configurações de SMTP (**SMTP
Settings**; o lugar exato muda entre versões do painel), ative o SMTP próprio e use os mesmos dados: host, porta
465, usuário, senha e, como remetente, o mesmo endereço do `SMTP_FROM` (ou do `SMTP_USER`). Esses e-mails contam
no mesmo limite diário da conta.

### Se o e-mail não chegar

Se o lead aparece no painel, mas o e-mail não chega:

1. Procure na pasta **Spam** de cada endereço de `EMAIL_EQUIPE` (no Gmail, também em **Todos os e-mails**). Se
   estiver lá, marque como “Não é spam”.
2. Abra os logs da função (**Edge Functions → enviar-lead → Logs**) e procure por `SMTP` (todas as linhas do aviso
   por e-mail têm essa palavra):
   - `SMTP: aviso do lead … enviado por e-mail para N destinatário(s)`: o servidor **aceitou** o e-mail. Procure em
     Spam, **Todos os e-mails** e, se a conta que envia for a mesma que recebe, em **Enviados**;
   - `Aviso por e-mail desligado (secrets ausentes: …)`: falta `SMTP_HOST`, `SMTP_USER` ou `SMTP_PASS` (confira os
     nomes, em maiúsculas);
   - `SMTP: falha … [EAUTH …] Invalid login: 535`: usuário ou senha errados. No Gmail, o `SMTP_PASS` é a senha de
     app, sem espaços, e não a senha da conta;
   - `SMTP: falha … [ETIMEDOUT …]`, `[ESOCKET …] ECONNREFUSED` ou `ENOTFOUND`: `SMTP_HOST` ou `SMTP_PORT` errados, ou
     uma porta bloqueada (25 ou 587). Use a porta 465 com SSL;
   - `SMTP: o servidor recusou destinatário(s)` ou `[EENVELOPE …]`: endereço de `EMAIL_EQUIPE` recusado, ou remetente
     recusado porque o `SMTP_FROM` não é da conta do `SMTP_USER`;
   - outra falha `SMTP: falha …`: leia a mensagem do servidor (ex.: limite diário atingido).
3. Linha com a palavra `Disjuntor`: muitos pedidos em pouco tempo (veja [Limites de envio](#limites-de-envio)). O
   aviso foi pulado de propósito; os pedidos estão no painel.
4. Nenhuma linha com `SMTP` para o lead nem `Disjuntor`: a função no ar é uma versão antiga, que não envia e-mail.
   Publique de novo a função com o `index.ts` do repositório (passo 4).

## 6. Teste depois do deploy

Com o site publicado e a função no ar, com os secrets do e-mail (passo 5).

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
3. Confira: mensagem de sucesso no site; o lead em `/admin` → Leads, com o anexo baixando; e o e-mail de aviso em
   cada endereço de `EMAIL_EQUIPE`, com o link do anexo funcionando. Se ele não estiver na caixa de entrada,
   procure na pasta **Spam**; se não chegar, veja [Se o e-mail não chegar](#se-o-e-mail-não-chegar).
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
