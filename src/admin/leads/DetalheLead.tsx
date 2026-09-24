import { Download, Mail, MessageCircle, Phone, Save, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PERFIL_LABEL, type StatusLead } from '../../types'
import { classeBotao } from '../estilos'
import type { LeadAdmin } from '../mapeamento'
import { BUCKET_ANEXOS, sb } from '../supabase'
import { Aviso, Botao, CampoAreaTexto, Dialogo } from '../ui'
import {
  formatarArea,
  formatarDataHora,
  garantirAfetado,
  linkWhatsApp,
  mensagemErro,
  nomeDoAnexo,
  nomeServicoCompleto,
  numeroWhatsApp,
  ouNulo,
} from '../util'
import SeletorStatus from './SeletorStatus'

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="py-2.5 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-medium text-grafite">{rotulo}</dt>
      <dd className="mt-0.5 text-sm break-words text-tinta sm:mt-0">{children || '—'}</dd>
    </div>
  )
}

export default function DetalheLead({
  aberto,
  lead,
  onFechar,
  onAlterado,
  onExcluido,
  onStatus,
  salvandoStatus,
}: {
  aberto: boolean
  lead: LeadAdmin | null
  onFechar: () => void
  onAlterado: (mudancas: Partial<LeadAdmin>) => void
  onExcluido: (lead: LeadAdmin) => void
  onStatus: (status: StatusLead) => void
  salvandoStatus: boolean
}) {
  const [observacoes, setObservacoes] = useState(lead?.observacoes ?? '')
  const [salvando, setSalvando] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  if (!lead) {
    return (
      <Dialogo aberto={aberto} onFechar={onFechar} titulo="Lead não encontrado" lateral>
        <Aviso tipo="alerta">
          Este lead não está na lista. Ele pode ter sido excluído, ou o link está incorreto.
        </Aviso>
      </Dialogo>
    )
  }

  const atual = lead
  const obsAlteradas = (ouNulo(observacoes) ?? '') !== (atual.observacoes ?? '')
  const telefone = numeroWhatsApp(atual.telefone)
  const primeiroNome = atual.nome.split(/\s+/)[0]
  const whatsapp = linkWhatsApp(
    atual.telefone,
    `Olá, ${primeiroNome}! Aqui é da Albano Luz Engenharia. Recebemos seu pedido de orçamento pelo site.`,
  )

  async function salvarObservacoes() {
    setSalvando(true)
    setMensagem(null)
    try {
      const valor = ouNulo(observacoes)
      const { data, error } = await sb().from('leads').update({ observacoes: valor }).eq('id', atual.id).select('id')
      if (error) throw error
      garantirAfetado(data)
      onAlterado({ observacoes: valor })
      setMensagem({ tipo: 'sucesso', texto: 'Observações salvas.' })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível salvar as observações.') })
    } finally {
      setSalvando(false)
    }
  }

  async function baixarAnexo() {
    if (!atual.anexoPath) return
    setBaixando(true)
    setMensagem(null)
    try {
      const { data, error } = await sb()
        .storage.from(BUCKET_ANEXOS)
        .createSignedUrl(atual.anexoPath, 60, { download: nomeDoAnexo(atual.anexoPath) })
      if (error) throw error
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível baixar o anexo.') })
    } finally {
      setBaixando(false)
    }
  }

  async function excluir() {
    const confirmado = window.confirm(
      `Excluir definitivamente o lead de ${atual.nome}?${atual.anexoPath ? ' O anexo também será apagado.' : ''} Esta ação não pode ser desfeita.`,
    )
    if (!confirmado) return
    setExcluindo(true)
    setMensagem(null)
    try {
      const { data, error } = await sb().from('leads').delete().eq('id', atual.id).select('id')
      if (error) throw error
      garantirAfetado(data)
      if (atual.anexoPath) {
        const { error: erroAnexo } = await sb().storage.from(BUCKET_ANEXOS).remove([atual.anexoPath])
        if (erroAnexo) console.warn('Lead excluído, mas o anexo não foi removido:', erroAnexo.message)
      }
      onExcluido(atual)
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível excluir o lead.') })
      setExcluindo(false)
    }
  }

  return (
    <Dialogo
      aberto={aberto}
      onFechar={onFechar}
      lateral
      titulo={atual.nome}
      subtitulo={`Recebido em ${formatarDataHora(atual.createdAt)}`}
      rodape={
        <Botao variante="perigo" icone={Trash2} carregando={excluindo} onClick={() => void excluir()} className="mr-auto">
          Excluir lead
        </Botao>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={classeBotao('primario', 'sm')}>
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          )}
          {telefone && (
            <a href={`tel:+${telefone}`} className={classeBotao('secundario', 'sm')}>
              <Phone className="size-4" aria-hidden="true" />
              Ligar
            </a>
          )}
          {atual.email && (
            <a
              href={`mailto:${atual.email}?subject=${encodeURIComponent('Seu pedido de orçamento — Albano Luz Engenharia')}`}
              className={classeBotao('secundario', 'sm')}
            >
              <Mail className="size-4" aria-hidden="true" />
              E-mail
            </a>
          )}
        </div>

        <div>
          <label htmlFor="status-detalhe" className="block text-sm font-medium text-tinta">
            Status
          </label>
          <SeletorStatus
            id="status-detalhe"
            className="mt-1 w-full sm:w-64"
            valor={atual.status}
            desabilitado={salvandoStatus}
            onAlterar={onStatus}
          />
        </div>

        <dl className="divide-y divide-concreto-escuro/50 border-y border-concreto-escuro/50">
          <Dado rotulo="Telefone">{atual.telefone}</Dado>
          <Dado rotulo="E-mail">{atual.email}</Dado>
          <Dado rotulo="Empresa">{atual.empresa}</Dado>
          <Dado rotulo="Perfil">{atual.perfil ? PERFIL_LABEL[atual.perfil] : null}</Dado>
          <Dado rotulo="Serviços">
            {atual.servicos.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4">
                {atual.servicos.map((s) => (
                  <li key={s}>{nomeServicoCompleto(s)}</li>
                ))}
              </ul>
            )}
          </Dado>
          <Dado rotulo="Cidade da obra">{atual.cidade}</Dado>
          <Dado rotulo="Área aproximada">{atual.areaM2 !== null ? formatarArea(atual.areaM2) : null}</Dado>
          <Dado rotulo="Página de origem">{atual.origem}</Dado>
          <Dado rotulo="Consentimento LGPD">{atual.consentimento ? 'Sim' : 'Não'}</Dado>
          <Dado rotulo="Anexo">
            {atual.anexoPath && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="break-all">{nomeDoAnexo(atual.anexoPath)}</span>
                <Botao
                  variante="secundario"
                  tamanho="sm"
                  icone={Download}
                  carregando={baixando}
                  onClick={() => void baixarAnexo()}
                >
                  Baixar anexo
                </Botao>
              </div>
            )}
          </Dado>
        </dl>

        <div>
          <h3 className="font-sans text-sm font-medium text-grafite">Mensagem</h3>
          <p className="mt-1 text-sm whitespace-pre-wrap text-tinta">{atual.mensagem || '—'}</p>
        </div>

        <div>
          <CampoAreaTexto
            rotulo="Observações internas"
            dica="Visível apenas para a equipe no painel."
            rows={5}
            maxLength={5000}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Botao
              icone={Save}
              tamanho="sm"
              carregando={salvando}
              disabled={!obsAlteradas}
              onClick={() => void salvarObservacoes()}
            >
              Salvar observações
            </Botao>
            {obsAlteradas && !salvando && <span className="text-xs text-grafite">Alterações não salvas</span>}
          </div>
        </div>

        {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}
      </div>
    </Dialogo>
  )
}
