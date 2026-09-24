import { Pencil, Plus, Quote, Save, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import CampoImagem from '../CampoImagem'
import type { DepoimentoInsert } from '../database'
import { enviarImagem, removerImagens } from '../imagens'
import { mapearDepoimento, type DepoimentoAdmin } from '../mapeamento'
import { sb } from '../supabase'
import {
  Aviso,
  Botao,
  CabecalhoAba,
  CaixaMarcacao,
  CampoAreaTexto,
  CampoTexto,
  Cartao,
  Carregando,
  Dialogo,
  Miniatura,
  Selo,
  Vazio,
} from '../ui'
import { ErroPainel, garantirAfetado, mensagemErro, ouNulo, type Carga } from '../util'

type Mensagem = { tipo: 'sucesso' | 'erro'; texto: string }

const PASTA_FOTOS = 'depoimentos'
const LADO_FOTO = 800
const MAX_TEXTO = 3000

async function buscarDepoimentos(): Promise<Carga<DepoimentoAdmin[]>> {
  const { data, error } = await sb()
    .from('depoimentos')
    .select('*')
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return { tipo: 'erro', mensagem: mensagemErro(error, 'Não foi possível carregar os depoimentos.') }
  return { tipo: 'ok', dados: (data ?? []).map(mapearDepoimento) }
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

function AvisoLgpd() {
  return (
    <Aviso tipo="alerta" titulo="LGPD: publique só com autorização">
      Só marque um depoimento como publicado depois de ter a autorização do cliente (por escrito, e-mail ou WhatsApp)
      para divulgar o nome, o texto e a foto. Guarde esse registro.
    </Aviso>
  )
}

export default function DepoimentosAba() {
  const [carga, setCarga] = useState<Carga<DepoimentoAdmin[]>>({ tipo: 'carregando' })
  const [editando, setEditando] = useState<DepoimentoAdmin | 'novo' | null>(null)
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    buscarDepoimentos().then((r) => {
      if (ativo) setCarga(r)
    })
    return () => {
      ativo = false
    }
  }, [])

  async function carregar() {
    setCarga(await buscarDepoimentos())
  }

  const depoimentos = carga.tipo === 'ok' ? carga.dados : []
  const proximaOrdem = depoimentos.reduce((max, d) => Math.max(max, d.ordem), 0) + 1

  async function excluir(d: DepoimentoAdmin) {
    if (!window.confirm(`Excluir o depoimento de ${d.nome}? Esta ação não pode ser desfeita.`)) return
    setExcluindo(d.id)
    setMensagem(null)
    try {
      const { data, error } = await sb().from('depoimentos').delete().eq('id', d.id).select('id')
      if (error) throw error
      garantirAfetado(data)
      await removerImagens([d.fotoUrl])
      setCarga((atual) =>
        atual.tipo === 'ok' ? { tipo: 'ok', dados: atual.dados.filter((x) => x.id !== d.id) } : atual,
      )
      setMensagem({ tipo: 'sucesso', texto: `Depoimento de ${d.nome} excluído.` })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível excluir o depoimento.') })
    } finally {
      setExcluindo(null)
    }
  }

  function aoSalvar(salvo: DepoimentoAdmin, novo: boolean) {
    setCarga((atual) => {
      if (atual.tipo !== 'ok') return atual
      const lista = novo ? [...atual.dados, salvo] : atual.dados.map((d) => (d.id === salvo.id ? salvo : d))
      return { tipo: 'ok', dados: [...lista].sort((a, b) => a.ordem - b.ordem) }
    })
    setEditando(null)
    setMensagem({ tipo: 'sucesso', texto: novo ? 'Depoimento cadastrado.' : 'Depoimento atualizado.' })
  }

  return (
    <section aria-labelledby="titulo-depoimentos">
      <CabecalhoAba
        id="titulo-depoimentos"
        titulo="Depoimentos"
        descricao="Relatos de clientes exibidos na página “Por que contratar”."
        acoes={
          <Botao icone={Plus} onClick={() => setEditando('novo')}>
            Novo depoimento
          </Botao>
        }
      />

      <div className="mb-5">
        <AvisoLgpd />
      </div>

      {mensagem && (
        <Aviso tipo={mensagem.tipo} className="mb-4">
          {mensagem.texto}
        </Aviso>
      )}

      {carga.tipo === 'carregando' && <Carregando texto="Carregando depoimentos…" />}

      {carga.tipo === 'erro' && (
        <Aviso
          tipo="erro"
          titulo="Não foi possível carregar os depoimentos"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void carregar()}>
              Tentar de novo
            </Botao>
          }
        >
          {carga.mensagem}
        </Aviso>
      )}

      {carga.tipo === 'ok' && depoimentos.length === 0 && (
        <Vazio
          icone={Quote}
          titulo="Nenhum depoimento cadastrado"
          acao={
            <Botao icone={Plus} onClick={() => setEditando('novo')}>
              Cadastrar depoimento
            </Botao>
          }
        >
          Cadastre relatos de arquitetos, construtoras e clientes que autorizaram a divulgação.
        </Vazio>
      )}

      {depoimentos.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {depoimentos.map((d) => (
            <li key={d.id}>
              <Cartao className="flex h-full flex-col p-4">
                <div className="flex items-start gap-3">
                  {d.fotoUrl ? (
                    <Miniatura url={d.fotoUrl} alt="" className="size-14 shrink-0 rounded-full" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-14 shrink-0 items-center justify-center rounded-full bg-marinho-50 font-serif text-xl font-semibold text-marinho"
                    >
                      {iniciais(d.nome)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-sans text-base font-semibold text-tinta">{d.nome}</h2>
                      {d.publicado ? <Selo tipo="sucesso">Publicado</Selo> : <Selo tipo="neutro">Oculto</Selo>}
                    </div>
                    {(d.cargo || d.empresa) && (
                      <p className="text-sm text-grafite">{[d.cargo, d.empresa].filter(Boolean).join(' · ')}</p>
                    )}
                    <p className="text-xs text-grafite">Ordem {d.ordem}</p>
                  </div>
                </div>
                <blockquote className="mt-3 line-clamp-4 flex-1 text-sm text-tinta">“{d.texto}”</blockquote>
                <div className="mt-4 flex gap-2">
                  <Botao variante="secundario" tamanho="sm" icone={Pencil} onClick={() => setEditando(d)}>
                    Editar
                    <span className="sr-only"> depoimento de {d.nome}</span>
                  </Botao>
                  <Botao
                    variante="perigo"
                    tamanho="sm"
                    icone={Trash2}
                    carregando={excluindo === d.id}
                    onClick={() => void excluir(d)}
                  >
                    Excluir
                    <span className="sr-only"> depoimento de {d.nome}</span>
                  </Botao>
                </div>
              </Cartao>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <EditorDepoimento
          key={editando === 'novo' ? 'novo' : editando.id}
          depoimento={editando === 'novo' ? null : editando}
          proximaOrdem={proximaOrdem}
          onFechar={() => setEditando(null)}
          onSalvo={aoSalvar}
        />
      )}
    </section>
  )
}

// -----------------------------------------------------------------------------
// Formulário (diálogo)
// -----------------------------------------------------------------------------

type Erros = Partial<Record<'nome' | 'texto' | 'ordem', string>>

function EditorDepoimento({
  depoimento,
  proximaOrdem,
  onFechar,
  onSalvo,
}: {
  depoimento: DepoimentoAdmin | null
  proximaOrdem: number
  onFechar: () => void
  onSalvo: (salvo: DepoimentoAdmin, novo: boolean) => void
}) {
  const [nome, setNome] = useState(depoimento?.nome ?? '')
  const [cargo, setCargo] = useState(depoimento?.cargo ?? '')
  const [empresa, setEmpresa] = useState(depoimento?.empresa ?? '')
  const [texto, setTexto] = useState(depoimento?.texto ?? '')
  const [publicado, setPublicado] = useState(depoimento?.publicado ?? false)
  const [ordem, setOrdem] = useState(String(depoimento?.ordem ?? proximaOrdem))
  const [fotoUrl, setFotoUrl] = useState<string | null>(depoimento?.fotoUrl ?? null)
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null)
  const [erros, setErros] = useState<Erros>({})
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [alterado, setAlterado] = useState(false)

  function marcar<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setAlterado(true)
    }
  }

  function fechar() {
    if ((alterado || fotoArquivo) && !window.confirm('Descartar as alterações não salvas?')) return
    onFechar()
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const novosErros: Erros = {}
    if (!nome.trim()) novosErros.nome = 'Informe o nome do cliente.'
    if (!texto.trim()) novosErros.texto = 'Escreva o depoimento.'
    if (!/^-?\d+$/.test(ordem.trim())) novosErros.ordem = 'Informe um número inteiro.'
    setErros(novosErros)
    const primeiro = (['nome', 'texto', 'ordem'] as const).find((c) => novosErros[c])
    if (primeiro) {
      document.getElementById(`depoimento-${primeiro}`)?.focus()
      return
    }

    setSalvando(true)
    let fotoEnviada: string | null = null
    try {
      let url = fotoUrl
      if (fotoArquivo) {
        fotoEnviada = await enviarImagem(PASTA_FOTOS, fotoArquivo, LADO_FOTO)
        url = fotoEnviada
      }
      const dados: DepoimentoInsert = {
        nome: nome.trim(),
        cargo: ouNulo(cargo),
        empresa: ouNulo(empresa),
        texto: texto.trim(),
        foto_url: url,
        publicado,
        ordem: Number(ordem),
      }
      const consulta = depoimento
        ? sb().from('depoimentos').update(dados).eq('id', depoimento.id).select('*').maybeSingle()
        : sb().from('depoimentos').insert(dados).select('*').maybeSingle()
      const { data, error } = await consulta
      if (error) throw error
      if (!data) throw new ErroPainel('O depoimento não foi salvo. Ele pode ter sido excluído.')

      // Foto trocada ou removida: apaga a anterior do storage.
      if (depoimento?.fotoUrl && depoimento.fotoUrl !== data.foto_url) await removerImagens([depoimento.fotoUrl])

      onSalvo(mapearDepoimento(data), !depoimento)
    } catch (falha) {
      if (fotoEnviada) await removerImagens([fotoEnviada])
      setErro(mensagemErro(falha, 'Não foi possível salvar o depoimento.'))
      setSalvando(false)
    }
  }

  const idForm = 'form-depoimento'

  return (
    <Dialogo
      aberto
      onFechar={fechar}
      fecharNoFundo={false}
      titulo={depoimento ? 'Editar depoimento' : 'Novo depoimento'}
      rodape={
        <>
          <Botao variante="secundario" onClick={fechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form={idForm} icone={Save} carregando={salvando}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id={idForm} onSubmit={salvar} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            id="depoimento-nome"
            rotulo="Nome"
            obrigatorio
            maxLength={160}
            autoComplete="off"
            value={nome}
            erro={erros.nome}
            onChange={(e) => marcar(setNome)(e.target.value)}
            className="sm:col-span-2"
          />
          <CampoTexto
            rotulo="Cargo"
            placeholder="Ex.: Arquiteta"
            maxLength={120}
            value={cargo}
            onChange={(e) => marcar(setCargo)(e.target.value)}
          />
          <CampoTexto
            rotulo="Empresa"
            maxLength={120}
            value={empresa}
            onChange={(e) => marcar(setEmpresa)(e.target.value)}
          />
        </div>
        <CampoAreaTexto
          id="depoimento-texto"
          rotulo="Depoimento"
          obrigatorio
          rows={6}
          maxLength={MAX_TEXTO}
          dica={`${texto.length} de ${MAX_TEXTO} caracteres.`}
          value={texto}
          erro={erros.texto}
          onChange={(e) => marcar(setTexto)(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-[15rem_minmax(0,1fr)]">
          <CampoImagem
            rotulo="Foto (opcional)"
            proporcao="aspect-square"
            urlAtual={fotoUrl}
            arquivo={fotoArquivo}
            desabilitado={salvando}
            onArquivo={(arquivo) => {
              setFotoArquivo(arquivo)
              setAlterado(true)
            }}
            onRemover={() => marcar(setFotoUrl)(null)}
          />
          <div className="space-y-4">
            <CampoTexto
              id="depoimento-ordem"
              rotulo="Ordem"
              obrigatorio
              inputMode="numeric"
              dica="Números menores aparecem primeiro."
              value={ordem}
              erro={erros.ordem}
              onChange={(e) => marcar(setOrdem)(e.target.value.replace(/[^\d-]/g, ''))}
            />
            <CaixaMarcacao
              rotulo="Publicado no site"
              dica="Marque só se o cliente autorizou a divulgação (LGPD)."
              checked={publicado}
              onChange={(e) => marcar(setPublicado)(e.target.checked)}
            />
          </div>
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
      </form>
    </Dialogo>
  )
}
