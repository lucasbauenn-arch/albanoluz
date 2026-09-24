import { ArrowDown, ArrowUp, ImagePlus, Save, Trash2, Upload } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import CampoImagem from '../CampoImagem'
import { enviarImagem, removerImagens } from '../imagens'
import { mapearFoto, type FotoAdmin } from '../mapeamento'
import { sb } from '../supabase'
import { Aviso, Botao, CampoTexto, Cartao, Carregando, Miniatura } from '../ui'
import { ErroPainel, garantirAfetado, mensagemErro, ouNulo, type Carga } from '../util'

type Mensagem = { tipo: 'sucesso' | 'erro'; texto: string }
type Rascunho = { alt: string; legenda: string }

async function buscarFotos(obraId: string): Promise<Carga<FotoAdmin[]>> {
  const { data, error } = await sb()
    .from('obra_fotos')
    .select('*')
    .eq('obra_id', obraId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return { tipo: 'erro', mensagem: mensagemErro(error, 'Não foi possível carregar a galeria.') }
  return { tipo: 'ok', dados: (data ?? []).map(mapearFoto) }
}

export default function GaleriaObra({
  obraId,
  pasta,
  capaUrl,
}: {
  obraId: string
  /** Pasta no bucket (slug da obra). */
  pasta: string
  /** Capa salva: não apagar do storage se uma foto usar a mesma URL. */
  capaUrl: string | null
}) {
  const [carga, setCarga] = useState<Carga<FotoAdmin[]>>({ tipo: 'carregando' })
  const [rascunhos, setRascunhos] = useState<Record<string, Rascunho>>({})
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)

  // Nova foto
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [legenda, setLegenda] = useState('')
  const [erroAlt, setErroAlt] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [chaveNova, setChaveNova] = useState(0)

  useEffect(() => {
    let ativo = true
    buscarFotos(obraId).then((r) => {
      if (ativo) setCarga(r)
    })
    return () => {
      ativo = false
    }
  }, [obraId])

  async function carregar() {
    setCarga({ tipo: 'carregando' })
    setCarga(await buscarFotos(obraId))
  }

  const fotos = carga.tipo === 'ok' ? carga.dados : []

  function definirFotos(novas: FotoAdmin[]) {
    setCarga({ tipo: 'ok', dados: novas })
  }

  function rascunhoDe(foto: FotoAdmin): Rascunho {
    return rascunhos[foto.id] ?? { alt: foto.alt, legenda: foto.legenda ?? '' }
  }

  function editarRascunho(foto: FotoAdmin, mudancas: Partial<Rascunho>) {
    setRascunhos((r) => ({ ...r, [foto.id]: { ...rascunhoDe(foto), ...mudancas } }))
  }

  async function salvarTextos(foto: FotoAdmin) {
    const r = rascunhoDe(foto)
    if (!r.alt.trim()) {
      setMensagem({ tipo: 'erro', texto: 'O texto alternativo da foto é obrigatório.' })
      document.getElementById(`alt-${foto.id}`)?.focus()
      return
    }
    setOcupado(foto.id)
    setMensagem(null)
    try {
      const mudancas = { alt: r.alt.trim(), legenda: ouNulo(r.legenda) }
      const { data, error } = await sb().from('obra_fotos').update(mudancas).eq('id', foto.id).select('id')
      if (error) throw error
      garantirAfetado(data)
      definirFotos(fotos.map((f) => (f.id === foto.id ? { ...f, ...mudancas } : f)))
      setRascunhos((atual) => {
        const novo = { ...atual }
        delete novo[foto.id]
        return novo
      })
      setMensagem({ tipo: 'sucesso', texto: 'Textos da foto salvos.' })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível salvar os textos da foto.') })
    } finally {
      setOcupado(null)
    }
  }

  async function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao
    if (ocupado || destino < 0 || destino >= fotos.length) return
    const anteriores = fotos
    const reordenadas = [...fotos]
    ;[reordenadas[indice], reordenadas[destino]] = [reordenadas[destino], reordenadas[indice]]
    const renumeradas = reordenadas.map((f, i) => ({ ...f, ordem: i }))
    const alteradas = renumeradas.filter((f) => anteriores.find((a) => a.id === f.id)?.ordem !== f.ordem)
    const movida = fotos[indice]

    definirFotos(renumeradas)
    setOcupado(movida.id)
    setMensagem(null)
    // Mantém o foco no botão usado (ou no oposto, se chegou à ponta).
    requestAnimationFrame(() => {
      const mesmo = document.getElementById(`mover-${direcao === -1 ? 'cima' : 'baixo'}-${movida.id}`)
      const outro = document.getElementById(`mover-${direcao === -1 ? 'baixo' : 'cima'}-${movida.id}`)
      if (mesmo && !(mesmo as HTMLButtonElement).disabled) mesmo.focus()
      else outro?.focus()
    })
    try {
      const resultados = await Promise.all(
        alteradas.map((f) => sb().from('obra_fotos').update({ ordem: f.ordem }).eq('id', f.id).select('id')),
      )
      for (const { data, error } of resultados) {
        if (error) throw error
        garantirAfetado(data)
      }
      setMensagem({
        tipo: 'sucesso',
        texto: `Foto movida para a posição ${destino + 1} de ${fotos.length}.`,
      })
    } catch (erro) {
      definirFotos(anteriores)
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível reordenar as fotos.') })
    } finally {
      setOcupado(null)
    }
  }

  async function excluir(foto: FotoAdmin, posicao: number) {
    if (!window.confirm(`Excluir a foto ${posicao} da galeria? Esta ação não pode ser desfeita.`)) return
    setOcupado(foto.id)
    setMensagem(null)
    try {
      const { data, error } = await sb().from('obra_fotos').delete().eq('id', foto.id).select('id')
      if (error) throw error
      garantirAfetado(data)
      const restantes = fotos.filter((f) => f.id !== foto.id)
      definirFotos(restantes)
      // Só apaga o arquivo se nem a capa nem outra foto usam a mesma imagem.
      if (foto.url !== capaUrl && !restantes.some((f) => f.url === foto.url)) {
        await removerImagens([foto.url])
      }
      setMensagem({ tipo: 'sucesso', texto: 'Foto excluída.' })
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível excluir a foto.') })
    } finally {
      setOcupado(null)
    }
  }

  async function adicionar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMensagem(null)
    if (!arquivo) {
      setMensagem({ tipo: 'erro', texto: 'Escolha uma imagem para enviar.' })
      return
    }
    if (!alt.trim()) {
      setErroAlt('Descreva o que aparece na foto (texto alternativo).')
      document.getElementById('nova-foto-alt')?.focus()
      return
    }
    setEnviando(true)
    let url: string | null = null
    try {
      url = await enviarImagem(pasta, arquivo)
      const ordem = fotos.reduce((max, f) => Math.max(max, f.ordem), -1) + 1
      const { data, error } = await sb()
        .from('obra_fotos')
        .insert({ obra_id: obraId, url, alt: alt.trim(), legenda: ouNulo(legenda), ordem })
        .select('*')
        .single()
      if (error) throw error
      if (!data) throw new ErroPainel('A foto não foi registrada.')
      definirFotos([...fotos, mapearFoto(data)])
      setArquivo(null)
      setAlt('')
      setLegenda('')
      setErroAlt(null)
      setChaveNova((k) => k + 1)
      setMensagem({ tipo: 'sucesso', texto: 'Foto adicionada à galeria.' })
    } catch (erro) {
      if (url) await removerImagens([url])
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível adicionar a foto.') })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Cartao className="p-5">
      <h2 className="text-2xl text-marinho">Galeria de fotos</h2>
      <p className="mt-1 text-sm text-grafite">
        As fotos aparecem na página da obra nesta ordem. Toda foto precisa de um texto alternativo que descreva o que
        ela mostra.
      </p>

      {mensagem && (
        <Aviso tipo={mensagem.tipo} className="mt-4">
          {mensagem.texto}
        </Aviso>
      )}

      {carga.tipo === 'carregando' && <Carregando texto="Carregando fotos…" />}
      {carga.tipo === 'erro' && (
        <Aviso
          tipo="erro"
          className="mt-4"
          acao={
            <Botao variante="secundario" tamanho="sm" onClick={() => void carregar()}>
              Tentar de novo
            </Botao>
          }
        >
          {carga.mensagem}
        </Aviso>
      )}

      {carga.tipo === 'ok' && fotos.length === 0 && (
        <p className="mt-4 rounded-md border border-dashed border-concreto-escuro p-4 text-sm text-grafite">
          Nenhuma foto na galeria ainda.
        </p>
      )}

      {fotos.length > 0 && (
        <ol className="mt-4 space-y-3">
          {fotos.map((foto, i) => {
            const r = rascunhoDe(foto)
            const alterada = r.alt !== foto.alt || r.legenda !== (foto.legenda ?? '')
            const posicao = i + 1
            const bloqueada = ocupado !== null
            return (
              <li
                key={foto.id}
                className="flex flex-col gap-3 rounded-md border border-concreto-escuro/70 p-3 sm:flex-row"
              >
                <div className="relative shrink-0">
                  <span className="sr-only">
                    Foto {posicao} de {fotos.length}
                  </span>
                  <Miniatura url={foto.url} alt={foto.alt} className="aspect-[4/3] w-full rounded sm:w-40" />
                  <span
                    aria-hidden="true"
                    className="absolute top-1 left-1 rounded bg-marinho px-1.5 text-xs font-semibold text-white"
                  >
                    {posicao}
                  </span>
                </div>
                <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2">
                  <CampoTexto
                    id={`alt-${foto.id}`}
                    rotulo="Texto alternativo"
                    obrigatorio
                    maxLength={300}
                    value={r.alt}
                    erro={r.alt.trim() ? null : 'Obrigatório.'}
                    onChange={(e) => editarRascunho(foto, { alt: e.target.value })}
                  />
                  <CampoTexto
                    rotulo="Legenda (opcional)"
                    maxLength={300}
                    value={r.legenda}
                    onChange={(e) => editarRascunho(foto, { legenda: e.target.value })}
                  />
                  {alterada && (
                    <div className="md:col-span-2">
                      <Botao
                        tamanho="sm"
                        icone={Save}
                        carregando={ocupado === foto.id}
                        disabled={bloqueada}
                        onClick={() => void salvarTextos(foto)}
                      >
                        Salvar textos
                      </Botao>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1 sm:flex-col">
                  <Botao
                    id={`mover-cima-${foto.id}`}
                    variante="secundario"
                    tamanho="sm"
                    icone={ArrowUp}
                    disabled={i === 0}
                    onClick={() => void mover(i, -1)}
                    aria-label={`Mover foto ${posicao} para cima`}
                  />
                  <Botao
                    id={`mover-baixo-${foto.id}`}
                    variante="secundario"
                    tamanho="sm"
                    icone={ArrowDown}
                    disabled={i === fotos.length - 1}
                    onClick={() => void mover(i, 1)}
                    aria-label={`Mover foto ${posicao} para baixo`}
                  />
                  <Botao
                    variante="perigo"
                    tamanho="sm"
                    icone={Trash2}
                    disabled={bloqueada}
                    onClick={() => void excluir(foto, posicao)}
                    aria-label={`Excluir foto ${posicao}`}
                    className="ml-auto sm:ml-0"
                  />
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <form
        onSubmit={adicionar}
        noValidate
        className="mt-6 rounded-md border border-marinho-200 bg-marinho-50/50 p-4"
        aria-labelledby="titulo-nova-foto"
      >
        <h3 id="titulo-nova-foto" className="flex items-center gap-2 font-sans text-base font-semibold text-marinho">
          <ImagePlus className="size-5" aria-hidden="true" />
          Adicionar foto
        </h3>
        <div className="mt-3 grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
          <CampoImagem
            key={chaveNova}
            rotulo="Imagem"
            urlAtual={null}
            arquivo={arquivo}
            onArquivo={setArquivo}
            desabilitado={enviando}
          />
          <div className="space-y-4">
            <CampoTexto
              id="nova-foto-alt"
              rotulo="Texto alternativo"
              obrigatorio
              maxLength={300}
              dica="Ex.: Armadura da laje do segundo pavimento antes da concretagem."
              value={alt}
              erro={erroAlt}
              onChange={(e) => {
                setAlt(e.target.value)
                if (erroAlt) setErroAlt(null)
              }}
            />
            <CampoTexto
              rotulo="Legenda (opcional)"
              maxLength={300}
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
            />
            <Botao type="submit" icone={Upload} carregando={enviando} disabled={!arquivo}>
              {enviando ? 'Otimizando e enviando…' : 'Enviar foto'}
            </Botao>
          </div>
        </div>
      </form>
    </Cartao>
  )
}
