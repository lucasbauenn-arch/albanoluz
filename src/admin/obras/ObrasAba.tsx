import { Building, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CATEGORIA_LABEL, TIPO_LABEL } from '../../types'
import { classeBotao } from '../estilos'
import { removerImagens } from '../imagens'
import { mapearObra, type ObraAdmin } from '../mapeamento'
import { sb } from '../supabase'
import { Aviso, Botao, CabecalhoAba, Cartao, Carregando, Miniatura, Selo, Vazio } from '../ui'
import { garantirAfetado, mensagemErro, type Carga } from '../util'
import AvisoPreRenderizacao from './AvisoPreRenderizacao'
import ObraEditor from './ObraEditor'

type Mensagem = { tipo: 'sucesso' | 'erro'; texto: string }

async function buscarObras(): Promise<Carga<ObraAdmin[]>> {
  const { data, error } = await sb()
    .from('obras')
    .select('*')
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return { tipo: 'erro', mensagem: mensagemErro(error, 'Não foi possível carregar as obras.') }
  return { tipo: 'ok', dados: (data ?? []).map((r) => mapearObra(r)) }
}

export default function ObrasAba() {
  const [params, setParams] = useSearchParams()
  const [carga, setCarga] = useState<Carga<ObraAdmin[]>>({ tipo: 'carregando' })
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [avisoEditor, setAvisoEditor] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    buscarObras().then((r) => {
      if (ativo) setCarga(r)
    })
    return () => {
      ativo = false
    }
  }, [])

  async function carregar() {
    setCarga(await buscarObras())
  }

  const obraParam = params.get('obra')
  const obras = carga.tipo === 'ok' ? carga.dados : []
  const proximaOrdem = obras.reduce((max, o) => Math.max(max, o.ordem), 0) + 1

  if (obraParam === 'nova' && carga.tipo === 'carregando') return <Carregando texto="Carregando…" />

  if (obraParam) {
    return (
      <ObraEditor
        key={obraParam}
        obraId={obraParam === 'nova' ? null : obraParam}
        proximaOrdem={proximaOrdem}
        avisoInicial={avisoEditor}
        onVoltar={() => {
          setAvisoEditor(null)
          setParams({ aba: 'obras' })
          void carregar()
        }}
        onCriada={(id) => {
          setAvisoEditor('Obra criada. Agora você pode adicionar as fotos da galeria, logo abaixo.')
          setParams({ aba: 'obras', obra: id }, { replace: true })
          void carregar()
        }}
      />
    )
  }

  async function excluir(obra: ObraAdmin) {
    const confirmado = window.confirm(
      `Excluir a obra “${obra.titulo}”? A capa e todas as fotos da galeria também serão apagadas. Esta ação não pode ser desfeita.`,
    )
    if (!confirmado) return
    setExcluindo(obra.id)
    setMensagem(null)
    try {
      const { data: fotos, error: erroFotos } = await sb().from('obra_fotos').select('url').eq('obra_id', obra.id)
      if (erroFotos) throw erroFotos
      const { data, error } = await sb().from('obras').delete().eq('id', obra.id).select('id')
      if (error) throw error
      garantirAfetado(data)
      await removerImagens([obra.capa.url, ...(fotos ?? []).map((f) => f.url)])
      setCarga((atual) =>
        atual.tipo === 'ok' ? { tipo: 'ok', dados: atual.dados.filter((o) => o.id !== obra.id) } : atual,
      )
      setMensagem({ tipo: 'sucesso', texto: `Obra “${obra.titulo}” excluída.` })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível excluir a obra.') })
    } finally {
      setExcluindo(null)
    }
  }

  const linkNova = { search: '?aba=obras&obra=nova' }

  return (
    <section aria-labelledby="titulo-obras">
      <CabecalhoAba
        id="titulo-obras"
        titulo="Obras"
        descricao="Portfólio exibido no site, na ordem definida pelo campo “Ordem”."
        acoes={
          <Link to={linkNova} className={classeBotao('primario')}>
            <Plus className="size-4" aria-hidden="true" />
            Nova obra
          </Link>
        }
      />

      <div className="mb-5">
        <AvisoPreRenderizacao />
      </div>

      {mensagem && (
        <Aviso tipo={mensagem.tipo} className="mb-4">
          {mensagem.texto}
        </Aviso>
      )}

      {carga.tipo === 'carregando' && <Carregando texto="Carregando obras…" />}

      {carga.tipo === 'erro' && (
        <Aviso
          tipo="erro"
          titulo="Não foi possível carregar as obras"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void carregar()}>
              Tentar de novo
            </Botao>
          }
        >
          {carga.mensagem}
        </Aviso>
      )}

      {carga.tipo === 'ok' && obras.length === 0 && (
        <Vazio
          icone={Building}
          titulo="Nenhuma obra cadastrada"
          acao={
            <Link to={linkNova} className={classeBotao('primario')}>
              <Plus className="size-4" aria-hidden="true" />
              Cadastrar a primeira obra
            </Link>
          }
        >
          Cadastre as obras do portfólio com fotos, serviços prestados, cidade e ano.
        </Vazio>
      )}

      {carga.tipo === 'ok' && obras.length > 0 && (
        <ul className="space-y-3">
          {obras.map((obra) => (
            <li key={obra.id}>
              <Cartao className="flex flex-col gap-4 p-3 sm:flex-row sm:items-center">
                <Miniatura
                  url={obra.capa.url}
                  alt={obra.capa.alt}
                  className="aspect-[4/3] w-full shrink-0 rounded-md sm:w-36"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-sans text-base font-semibold text-tinta">{obra.titulo}</h2>
                    {obra.publicado ? <Selo tipo="sucesso">Publicada</Selo> : <Selo tipo="neutro">Oculta</Selo>}
                    {obra.destaque && (
                      <Selo tipo="alerta">
                        <Star className="size-3" aria-hidden="true" />
                        Destaque
                      </Selo>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-grafite">
                    {[CATEGORIA_LABEL[obra.categoria], TIPO_LABEL[obra.tipo], obra.cidade, obra.ano]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="mt-0.5 text-xs text-grafite">
                    Ordem {obra.ordem} · /portfolio/{obra.slug}
                  </p>
                </div>
                <div className="flex gap-2 sm:flex-col lg:flex-row">
                  <Link
                    to={{ search: `?aba=obras&obra=${obra.id}` }}
                    className={classeBotao('secundario', 'sm', 'flex-1')}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Editar
                    <span className="sr-only"> {obra.titulo}</span>
                  </Link>
                  <Botao
                    variante="perigo"
                    tamanho="sm"
                    icone={Trash2}
                    className="flex-1"
                    carregando={excluindo === obra.id}
                    onClick={() => void excluir(obra)}
                  >
                    Excluir
                    <span className="sr-only"> {obra.titulo}</span>
                  </Botao>
                </div>
              </Cartao>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
