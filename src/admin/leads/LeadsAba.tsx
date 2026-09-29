import { FileDown, Inbox, Paperclip, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PERFIL_LABEL, STATUS_LEAD_LABEL, type StatusLead } from '../../types'
import { baixarArquivo, gerarCsv } from '../csv'
import { classeInput, classeLabel } from '../estilos'
import { mapearLead, type LeadAdmin } from '../mapeamento'
import { sb } from '../supabase'
import { Aviso, Botao, CabecalhoAba, Cartao, Carregando, Vazio } from '../ui'
import {
  dataParaArquivo,
  formatarDataHora,
  garantirAfetado,
  mensagemErro,
  nomeDoAnexo,
  nomeServicoCompleto,
  nomeServicoCurto,
  semAcentos,
  type Carga,
} from '../util'
import DetalheLead from './DetalheLead'
import SeletorStatus from './SeletorStatus'
import { STATUS_LEAD, ehStatusLead } from './status'

type Mensagem = { tipo: 'sucesso' | 'erro'; texto: string }
type ListaLeads = { leads: LeadAdmin[]; truncada: boolean }

/**
 * O PostgREST do Supabase devolve no máximo 1000 linhas por requisição (API
 * settings → Max rows), mesmo pedindo mais. Por isso a lista vem em páginas.
 */
const POR_PAGINA = 1000
/** Teto de segurança da lista (e do CSV); acima disso, mostra só os mais recentes. */
const LIMITE = 20000

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const maisRecentePrimeiro = (a: LeadAdmin, b: LeadAdmin) => Date.parse(b.createdAt) - Date.parse(a.createdAt)

async function buscarLeads(): Promise<Carga<ListaLeads>> {
  const porId = new Map<string, LeadAdmin>()
  let total: number | null = null
  let de = 0
  while (porId.size < LIMITE) {
    const { data, error, count } = await sb()
      .from('leads')
      .select('*', de === 0 ? { count: 'exact' } : undefined)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(de, de + Math.min(POR_PAGINA, LIMITE - porId.size) - 1)
    if (error) return { tipo: 'erro', mensagem: mensagemErro(error, 'Não foi possível carregar os leads.') }
    if (typeof count === 'number') total = count
    const pagina = data ?? []
    // O Map descarta repetidos: um lead novo que chegue entre duas páginas
    // empurra a lista uma posição para baixo.
    for (const linha of pagina) porId.set(linha.id, mapearLead(linha))
    de += pagina.length
    // Avança pelo que veio (não pelo que foi pedido): funciona com qualquer Max rows.
    if (pagina.length === 0 || (total !== null && porId.size >= total)) break
  }
  const leads = [...porId.values()].slice(0, LIMITE)
  // Só é truncada quando parou no teto e ainda havia mais no banco.
  const truncada = leads.length >= LIMITE && (total === null || total > LIMITE)
  return { tipo: 'ok', dados: { leads, truncada } }
}

export default function LeadsAba() {
  const [params, setParams] = useSearchParams()
  const [carga, setCarga] = useState<Carga<LeadAdmin[]>>({ tipo: 'carregando' })
  const [atualizando, setAtualizando] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<StatusLead | ''>('')
  const [busca, setBusca] = useState('')
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const [salvandoStatus, setSalvandoStatus] = useState<string | null>(null)
  const [truncada, setTruncada] = useState(false)
  // Resultado da busca pelo id de um lead que não está na lista (link direto).
  const [buscaDireta, setBuscaDireta] = useState<{ id: string; tentativa: number; erro: string | null } | null>(
    null,
  )
  const [tentativaBusca, setTentativaBusca] = useState(0)

  const aplicar = useCallback((resultado: Carga<ListaLeads>) => {
    if (resultado.tipo === 'erro') {
      // Se a lista já estava na tela, mantém e mostra só o aviso.
      setCarga((atual) => (atual.tipo === 'ok' ? atual : resultado))
      setMensagem({ tipo: 'erro', texto: resultado.mensagem })
    } else if (resultado.tipo === 'ok') {
      setCarga({ tipo: 'ok', dados: resultado.dados.leads })
      setTruncada(resultado.dados.truncada)
    }
  }, [])

  useEffect(() => {
    let ativo = true
    buscarLeads().then((r) => {
      if (ativo) aplicar(r)
    })
    return () => {
      ativo = false
    }
  }, [aplicar])

  async function carregar() {
    setAtualizando(true)
    setTentativaBusca((t) => t + 1)
    aplicar(await buscarLeads())
    setAtualizando(false)
  }

  // Some com mensagens de sucesso depois de alguns segundos.
  useEffect(() => {
    if (mensagem?.tipo !== 'sucesso') return
    const t = window.setTimeout(() => setMensagem(null), 5000)
    return () => window.clearTimeout(t)
  }, [mensagem])

  const leads = useMemo(() => (carga.tipo === 'ok' ? carga.dados : []), [carga])

  const contagem = useMemo(() => {
    const c: Record<StatusLead, number> = { novo: 0, em_contato: 0, proposta_enviada: 0, fechado: 0 }
    for (const l of leads) c[l.status]++
    return c
  }, [leads])

  const filtrados = useMemo(() => {
    const termo = semAcentos(busca.trim())
    const digitos = busca.replace(/\D/g, '')
    return leads.filter((l) => {
      if (filtroStatus && l.status !== filtroStatus) return false
      if (!termo) return true
      const texto = semAcentos(
        [l.nome, l.email, l.telefone, l.empresa, l.cidade, l.mensagem, l.observacoes, l.origem]
          .filter(Boolean)
          .join(' '),
      )
      if (texto.includes(termo)) return true
      return digitos.length >= 4 && l.telefone.replace(/\D/g, '').includes(digitos)
    })
  }, [leads, filtroStatus, busca])

  const idAberto = params.get('lead')
  const leadAberto = idAberto ? leads.find((l) => l.id === idAberto) ?? null : null

  // Link direto (ex.: painel_url do e-mail) para um lead fora da lista: busca
  // pelo id e, se existir, acrescenta à lista para as ações funcionarem igual.
  const idParaBuscar =
    idAberto && carga.tipo === 'ok' && !leadAberto && UUID.test(idAberto) ? idAberto : null
  const resultadoDireto =
    buscaDireta && buscaDireta.id === idParaBuscar && buscaDireta.tentativa === tentativaBusca ? buscaDireta : null
  const buscandoDireto = idParaBuscar !== null && !resultadoDireto

  useEffect(() => {
    if (!idParaBuscar) return
    let ativo = true
    sb()
      .from('leads')
      .select('*')
      .eq('id', idParaBuscar)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return
        if (data) {
          const lead = mapearLead(data)
          setCarga((atual) =>
            atual.tipo === 'ok' && !atual.dados.some((l) => l.id === lead.id)
              ? { tipo: 'ok', dados: [...atual.dados, lead].sort(maisRecentePrimeiro) }
              : atual,
          )
        }
        setBuscaDireta({
          id: idParaBuscar,
          tentativa: tentativaBusca,
          erro: error ? mensagemErro(error, 'Não foi possível carregar este lead.') : null,
        })
      })
    return () => {
      ativo = false
    }
  }, [idParaBuscar, tentativaBusca])

  function abrir(id: string) {
    setParams((p) => {
      const novo = new URLSearchParams(p)
      novo.set('aba', 'leads')
      novo.set('lead', id)
      return novo
    })
  }

  function fechar() {
    setParams(
      (p) => {
        const novo = new URLSearchParams(p)
        novo.delete('lead')
        return novo
      },
      { replace: true },
    )
  }

  function substituirLocal(id: string, mudancas: Partial<LeadAdmin>) {
    setCarga((atual) =>
      atual.tipo === 'ok'
        ? { tipo: 'ok', dados: atual.dados.map((l) => (l.id === id ? { ...l, ...mudancas } : l)) }
        : atual,
    )
  }

  async function alterarStatus(lead: LeadAdmin, status: StatusLead) {
    const anterior = lead.status
    if (anterior === status) return
    substituirLocal(lead.id, { status })
    setSalvandoStatus(lead.id)
    try {
      const { data, error } = await sb().from('leads').update({ status }).eq('id', lead.id).select('id')
      if (error) throw error
      garantirAfetado(data)
      setMensagem({ tipo: 'sucesso', texto: `Status de ${lead.nome}: ${STATUS_LEAD_LABEL[status]}.` })
    } catch (erro) {
      substituirLocal(lead.id, { status: anterior })
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível alterar o status.') })
    } finally {
      setSalvandoStatus(null)
    }
  }

  function removerLocal(id: string) {
    setCarga((atual) => (atual.tipo === 'ok' ? { tipo: 'ok', dados: atual.dados.filter((l) => l.id !== id) } : atual))
  }

  function exportarCsv() {
    const cabecalho = [
      'Data',
      'Nome',
      'Telefone',
      'E-mail',
      'Empresa',
      'Perfil',
      'Serviços',
      'Cidade da obra',
      'Área (m²)',
      'Mensagem',
      'Status',
      'Observações',
      'Anexo',
      'Página de origem',
      'Consentimento LGPD',
    ]
    const linhas = filtrados.map((l) => [
      formatarDataHora(l.createdAt).replace(',', ''),
      l.nome,
      l.telefone,
      l.email,
      l.empresa,
      l.perfil ? PERFIL_LABEL[l.perfil] : '',
      l.servicos.map(nomeServicoCompleto).join(', '),
      l.cidade,
      l.areaM2 === null ? '' : l.areaM2.toLocaleString('pt-BR', { maximumFractionDigits: 2 }),
      l.mensagem,
      STATUS_LEAD_LABEL[l.status],
      l.observacoes,
      l.anexoPath ? nomeDoAnexo(l.anexoPath) : '',
      l.origem,
      l.consentimento ? 'Sim' : 'Não',
    ])
    const sufixo = filtroStatus ? `-${filtroStatus.replace(/_/g, '-')}` : ''
    baixarArquivo(gerarCsv(cabecalho, linhas), `leads-albano-luz${sufixo}-${dataParaArquivo()}.csv`)
  }

  const filtrosAtivos = Boolean(filtroStatus || busca.trim())

  return (
    <section aria-labelledby="titulo-leads">
      <CabecalhoAba
        id="titulo-leads"
        titulo="Leads"
        descricao="Pedidos de orçamento enviados pelo formulário do site."
        acoes={
          <>
            <Botao variante="secundario" icone={RefreshCw} carregando={atualizando} onClick={() => void carregar()}>
              Atualizar
            </Botao>
            <Botao
              variante="secundario"
              icone={FileDown}
              onClick={exportarCsv}
              disabled={carga.tipo !== 'ok' || filtrados.length === 0}
            >
              Exportar CSV
              {carga.tipo === 'ok' && <span className="sr-only"> ({filtrados.length} leads filtrados)</span>}
            </Botao>
          </>
        }
      />
      {mensagem && carga.tipo === 'ok' && (
        <Aviso tipo={mensagem.tipo} className="mb-4">
          {mensagem.texto}
        </Aviso>
      )}

      {carga.tipo === 'carregando' && <Carregando texto="Carregando leads…" />}

      {carga.tipo === 'erro' && (
        <Aviso
          tipo="erro"
          titulo="Não foi possível carregar os leads"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void carregar()}>
              Tentar de novo
            </Botao>
          }
        >
          {carga.mensagem}
        </Aviso>
      )}

      {carga.tipo === 'ok' && leads.length === 0 && (
        <Vazio icone={Inbox} titulo="Nenhum lead ainda">
          Os pedidos de orçamento enviados pelo site aparecem aqui assim que chegam.
        </Vazio>
      )}

      {carga.tipo === 'ok' && leads.length > 0 && (
        <>
          <Cartao className="mb-4 p-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
              <div>
                <label htmlFor="busca-leads" className={classeLabel}>
                  Buscar
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 mt-0.5 size-4 -translate-y-1/2 text-grafite"
                    aria-hidden="true"
                  />
                  <input
                    id="busca-leads"
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome, e-mail, telefone, empresa, cidade…"
                    className={`${classeInput} pl-9`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="filtro-status" className={classeLabel}>
                  Status
                </label>
                <select
                  id="filtro-status"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(ehStatusLead(e.target.value) ? e.target.value : '')}
                  className={classeInput}
                >
                  <option value="">Todos ({leads.length})</option>
                  {STATUS_LEAD.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LEAD_LABEL[s]} ({contagem[s]})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-3 text-sm text-grafite" aria-live="polite">
              {filtrados.length === leads.length
                ? `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`
                : `${filtrados.length} de ${leads.length} leads`}
              {truncada && ` (exibindo os ${LIMITE.toLocaleString('pt-BR')} mais recentes)`}
            </p>
          </Cartao>

          {filtrados.length === 0 ? (
            <Vazio
              icone={Search}
              titulo="Nenhum lead encontrado"
              acao={
                filtrosAtivos && (
                  <Botao
                    variante="secundario"
                    onClick={() => {
                      setBusca('')
                      setFiltroStatus('')
                    }}
                  >
                    Limpar filtros
                  </Botao>
                )
              }
            >
              Nenhum lead corresponde à busca ou ao status selecionado.
            </Vazio>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="space-y-3 md:hidden">
                {filtrados.map((l) => (
                  <li key={l.id}>
                    <Cartao className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => abrir(l.id)}
                            className="text-left text-base font-semibold text-marinho underline-offset-4 hover:underline"
                          >
                            {l.nome}
                          </button>
                          <p className="text-xs text-grafite">{formatarDataHora(l.createdAt)}</p>
                        </div>
                        {l.anexoPath && <Paperclip className="size-4 shrink-0 text-grafite" aria-label="Com anexo" />}
                      </div>
                      <p className="mt-2 text-sm text-grafite">
                        {[l.perfil ? PERFIL_LABEL[l.perfil] : null, l.cidade].filter(Boolean).join(' · ') || '—'}
                      </p>
                      {l.servicos.length > 0 && (
                        <p className="mt-1 text-sm">{l.servicos.map(nomeServicoCurto).join(', ')}</p>
                      )}
                      <SeletorStatus
                        className="mt-3 w-full"
                        valor={l.status}
                        rotulo={`Status do lead de ${l.nome}`}
                        desabilitado={salvandoStatus === l.id}
                        onAlterar={(s) => void alterarStatus(l, s)}
                      />
                    </Cartao>
                  </li>
                ))}
              </ul>

              {/* Tablet/desktop: tabela */}
              <Cartao className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Lista de leads</caption>
                  <thead className="border-b border-concreto-escuro/70 bg-concreto-claro/60 text-xs font-semibold text-grafite">
                    <tr>
                      <th scope="col" className="px-4 py-3 whitespace-nowrap">
                        Recebido em
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Nome
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Perfil
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Serviços
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Cidade
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-concreto-escuro/50">
                    {filtrados.map((l) => (
                      <tr key={l.id} className={l.id === idAberto ? 'bg-marinho-50' : 'hover:bg-concreto-claro/40'}>
                        <td className="px-4 py-3 whitespace-nowrap text-grafite">{formatarDataHora(l.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => abrir(l.id)}
                            className="text-left font-semibold text-marinho underline-offset-4 hover:underline"
                          >
                            {l.nome}
                          </button>
                          {l.anexoPath && (
                            <Paperclip className="ml-1.5 inline size-3.5 text-grafite" aria-label="Com anexo" />
                          )}
                          {l.empresa && <p className="text-xs text-grafite">{l.empresa}</p>}
                        </td>
                        <td className="px-4 py-3">{l.perfil ? PERFIL_LABEL[l.perfil] : '—'}</td>
                        <td className="max-w-64 px-4 py-3">
                          {l.servicos.length ? l.servicos.map(nomeServicoCurto).join(', ') : '—'}
                        </td>
                        <td className="px-4 py-3">{l.cidade ?? '—'}</td>
                        <td className="px-4 py-3">
                          <SeletorStatus
                            valor={l.status}
                            rotulo={`Status do lead de ${l.nome}`}
                            desabilitado={salvandoStatus === l.id}
                            onAlterar={(s) => void alterarStatus(l, s)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Cartao>
            </>
          )}
        </>
      )}

      <DetalheLead
        key={leadAberto?.id ?? 'nenhum'}
        aberto={Boolean(idAberto) && carga.tipo === 'ok'}
        lead={leadAberto}
        buscando={buscandoDireto}
        erroBusca={resultadoDireto?.erro}
        onFechar={fechar}
        onAlterado={(mudancas) => leadAberto && substituirLocal(leadAberto.id, mudancas)}
        onExcluido={(lead) => {
          fechar()
          removerLocal(lead.id)
          setMensagem({ tipo: 'sucesso', texto: `Lead de ${lead.nome} excluído.` })
        }}
        onStatus={(s) => leadAberto && alterarStatus(leadAberto, s)}
        salvandoStatus={Boolean(leadAberto && salvandoStatus === leadAberto.id)}
      />
    </section>
  )
}
