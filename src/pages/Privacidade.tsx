import { CabecalhoPagina } from '../components/ui/CabecalhoPagina'
import { SITE, emailUrl } from '../config/site'
import { abrirPreferenciasCookies } from '../lib/consentimento'
import { Seo, schemaBreadcrumb } from '../lib/head'

const trilha = [
  { nome: 'Início', path: '/' },
  { nome: 'Política de privacidade', path: '/politica-de-privacidade' },
]

// PENDENTE: revisar com o cliente (CNPJ, prazos de retenção e encarregado de dados).
export default function Privacidade() {
  return (
    <>
      <Seo
        title="Política de privacidade"
        description="Como a Albano Luz Engenharia coleta, usa e protege os seus dados pessoais, em conformidade com a LGPD."
        path="/politica-de-privacidade"
        jsonLd={[schemaBreadcrumb(trilha)]}
      />
      <CabecalhoPagina trilha={trilha} titulo="Política de privacidade" descricao="Última atualização: 24 de setembro de 2026." />

      <article className="container-site py-14 sm:py-20">
        <div className="prosa max-w-3xl text-lg text-grafite">
          <p>
            Esta política explica como a {SITE.nome}
            {SITE.cnpj ? `, inscrita no CNPJ ${SITE.cnpj},` : ''} trata os dados pessoais de quem visita o site{' '}
            <strong>albanoluz.com</strong> ou nos envia um pedido de orçamento, em conformidade com a Lei Geral de Proteção
            de Dados (Lei nº 13.709/2018, LGPD).
          </p>

          <h2>Quais dados coletamos</h2>
          <ul>
            <li>
              <strong>Formulário de orçamento:</strong> nome, telefone, e-mail, empresa, perfil (arquiteto, construtora ou
              particular), serviços de interesse, cidade e área da obra, mensagem e o arquivo de projeto que você decidir
              anexar.
            </li>
            <li>
              <strong>Navegação:</strong> se você aceitar os cookies de análise, o Google Analytics e o Meta Pixel registram
              dados de uso, como páginas visitadas, tipo de dispositivo, cidade aproximada e cliques em botões.
            </li>
            <li>
              <strong>WhatsApp e e-mail:</strong> as informações que você nos enviar por esses canais.
            </li>
          </ul>

          <h2>Para que usamos</h2>
          <ul>
            <li>Responder ao seu pedido, elaborar e enviar propostas comerciais.</li>
            <li>Executar os serviços contratados e cumprir obrigações legais e regulatórias.</li>
            <li>Entender como o site é usado e melhorar o conteúdo, somente com o seu consentimento.</li>
          </ul>

          <h2>Bases legais</h2>
          <p>
            Tratamos os dados com base no seu consentimento (art. 7º, I), na execução de procedimentos preliminares a um
            contrato solicitados por você (art. 7º, V) e no cumprimento de obrigações legais (art. 7º, II).
          </p>

          <h2>Com quem compartilhamos</h2>
          <p>
            Não vendemos dados pessoais. Os dados podem ser processados por fornecedores que nos ajudam a operar o site e o
            atendimento, como hospedagem e banco de dados (Supabase e Cloudflare), verificação anti-spam (Cloudflare
            Turnstile), análise de audiência (Google e Meta, apenas com consentimento) e ferramentas de e-mail e mensagens.
            Alguns desses fornecedores armazenam dados fora do Brasil, com salvaguardas contratuais adequadas.
          </p>

          <h2>Por quanto tempo guardamos</h2>
          <p>
            Pelo tempo necessário para atender ao seu pedido. Pedidos que não resultarem em contratação são excluídos em até
            24 meses. Dados de contratos são mantidos pelos prazos exigidos em lei.
          </p>

          <h2>Cookies</h2>
          <p>
            Usamos apenas cookies de análise, que só são ativados se você clicar em “Aceitar” no aviso de cookies. Você pode
            mudar a sua escolha a qualquer momento.
          </p>
          <p>
            <button
              type="button"
              onClick={abrirPreferenciasCookies}
              className="font-medium text-marinho-600 underline underline-offset-[3px]"
            >
              Alterar preferências de cookies
            </button>
          </p>

          <h2>Seus direitos</h2>
          <p>
            Você pode, a qualquer momento, pedir a confirmação e o acesso aos seus dados, a correção, a anonimização, a
            portabilidade ou a exclusão, informações sobre o compartilhamento e a revogação do consentimento (art. 18 da
            LGPD).
          </p>

          <h2>Contato</h2>
          <p>
            Para exercer seus direitos ou tirar dúvidas sobre esta política, escreva para{' '}
            <a href={emailUrl}>{SITE.email}</a>.
          </p>
        </div>
      </article>
    </>
  )
}
