import { ArrowLeft, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { SERVICOS } from '../../data/servicos'
import {
  CATEGORIA_LABEL,
  TIPO_LABEL,
  type CategoriaObra,
  type TipoObra,
} from '../../types'
import CampoImagem from '../CampoImagem'
import type { ObraInsert, ObraRow } from '../database'
import { enviarImagem, removerImagens } from '../imagens'
import { sb } from '../supabase'
import {
  Aviso,
  Botao,
  CabecalhoAba,
  CaixaMarcacao,
  CampoAreaTexto,
  CampoSelecao,
  CampoTexto,
  Cartao,
  Carregando,
} from '../ui'
import { ErroPainel, SLUG_MAXIMO, SLUG_VALIDO, gerarSlug, mensagemErro, ouNulo, type Carga } from '../util'
import AvisoPreRenderizacao from './AvisoPreRenderizacao'
import GaleriaObra from './GaleriaObra'

type Form = {
  titulo: string
  slug: string
  categoria: CategoriaObra
  tipo: TipoObra
  servicos: string[]
  cidade: string
  ano: string
  descricao: string
  destaque: boolean
  publicado: boolean
  ordem: string
  capaUrl: string | null
  capaAlt: string
}

type CampoComErro = 'titulo' | 'slug' | 'ano' | 'ordem' | 'capaAlt'
type Erros = Partial<Record<CampoComErro, string>>
type Mensagem = { tipo: 'sucesso' | 'erro'; texto: string }

const CATEGORIAS = Object.keys(CATEGORIA_LABEL) as CategoriaObra[]
const TIPOS = Object.keys(TIPO_LABEL) as TipoObra[]
const ORDEM_CAMPOS: CampoComErro[] = ['titulo', 'slug', 'ano', 'ordem', 'capaAlt']

function formVazio(ordem: number): Form {
  return {
    titulo: '',
    slug: '',
    categoria: 'realizada',
    tipo: 'residencial',
    servicos: [],
    cidade: '',
    ano: '',
    descricao: '',
    destaque: false,
    publicado: true,
    ordem: String(ordem),
    capaUrl: null,
    capaAlt: '',
  }
}

function formDaLinha(r: ObraRow): Form {
  return {
    titulo: r.titulo,
    slug: r.slug,
    categoria: r.categoria,
    tipo: r.tipo,
    servicos: r.servicos ?? [],
    cidade: r.cidade ?? '',
    ano: r.ano === null ? '' : String(r.ano),
    descricao: r.descricao ?? '',
    destaque: r.destaque,
    publicado: r.publicado,
    ordem: String(r.ordem),
    capaUrl: r.capa_url,
    capaAlt: r.capa_alt ?? '',
  }
}

function validar(form: Form, temCapa: boolean): Erros {
  const erros: Erros = {}
  if (!form.titulo.trim()) erros.titulo = 'Informe o título da obra.'
  if (!form.slug) erros.slug = 'Informe o endereço da página.'
  else if (!SLUG_VALIDO.test(form.slug)) {
    erros.slug = 'Use só letras minúsculas sem acento, números e hífens (ex.: residencia-alto-padrao).'
  }
  if (form.ano.trim()) {
    const ano = Number(form.ano)
    if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) erros.ano = 'Informe um ano entre 1900 e 2100.'
  }
  if (!/^-?\d+$/.test(form.ordem.trim())) erros.ordem = 'Informe um número inteiro.'
  if (temCapa && !form.capaAlt.trim()) {
    erros.capaAlt = 'Descreva a imagem de capa (texto alternativo para acessibilidade e Google).'
  }
  return erros
}

export default function ObraEditor({
  obraId,
  proximaOrdem,
  avisoInicial,
  onVoltar,
  onCriada,
}: {
  obraId: string | null
  proximaOrdem: number
  avisoInicial?: string | null
  onVoltar: () => void
  onCriada: (id: string) => void
}) {
  const [carga, setCarga] = useState<Carga<true>>(obraId ? { tipo: 'carregando' } : { tipo: 'ok', dados: true })
  const [form, setForm] = useState<Form>(() => formVazio(proximaOrdem))
  const [capaSalva, setCapaSalva] = useState<string | null>(null)
  const [slugSalvo, setSlugSalvo] = useState<string | null>(null)
  const [slugManual, setSlugManual] = useState(Boolean(obraId))
  const [capaArquivo, setCapaArquivo] = useState<File | null>(null)
  const [erros, setErros] = useState<Erros>({})
  const [salvando, setSalvando] = useState(false)
  const [etapa, setEtapa] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<Mensagem | null>(
    avisoInicial ? { tipo: 'sucesso', texto: avisoInicial } : null,
  )
  const [alterado, setAlterado] = useState(false)

  useEffect(() => {
    if (!obraId) return
    let ativo = true
    sb()
      .from('obras')
      .select('*')
      .eq('id', obraId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) {
          setCarga({ tipo: 'erro', mensagem: mensagemErro(error, 'Não foi possível carregar a obra.') })
        } else if (!data) {
          setCarga({ tipo: 'erro', mensagem: 'Obra não encontrada. Ela pode ter sido excluída.' })
        } else {
          setForm(formDaLinha(data))
          setCapaSalva(data.capa_url)
          setSlugSalvo(data.slug)
          setCarga({ tipo: 'ok', dados: true })
        }
      })
    return () => {
      ativo = false
    }
  }, [obraId])

  // Aviso do navegador ao sair com alterações não salvas.
  const sujo = alterado || capaArquivo !== null
  useEffect(() => {
    if (!sujo) return
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aoSair)
    return () => window.removeEventListener('beforeunload', aoSair)
  }, [sujo])

  function atualizar<K extends keyof Form>(campo: K, valor: Form[K]) {
    const slugAutomatico = campo === 'titulo' && !slugManual
    setForm((f) => {
      const novo = { ...f, [campo]: valor }
      if (slugAutomatico) novo.slug = gerarSlug(String(valor))
      return novo
    })
    setAlterado(true)
    // Limpa o erro do campo editado (e do slug, quando ele é gerado pelo título).
    const limpar = [campo as string, ...(slugAutomatico ? ['slug'] : [])]
    if (limpar.some((c) => erros[c as CampoComErro])) {
      setErros((e) => {
        const novo = { ...e }
        for (const c of limpar) delete novo[c as CampoComErro]
        return novo
      })
    }
  }

  function alternarServico(slug: string, marcado: boolean) {
    atualizar('servicos', marcado ? [...form.servicos, slug] : form.servicos.filter((s) => s !== slug))
  }

  function voltar() {
    if (sujo && !window.confirm('Descartar as alterações não salvas?')) return
    onVoltar()
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMensagem(null)
    const temCapa = Boolean(capaArquivo || form.capaUrl)
    const novosErros = validar(form, temCapa)
    setErros(novosErros)
    const primeiro = ORDEM_CAMPOS.find((c) => novosErros[c])
    if (primeiro) {
      setMensagem({ tipo: 'erro', texto: 'Corrija os campos destacados antes de salvar.' })
      requestAnimationFrame(() => document.getElementById(`obra-${primeiro}`)?.focus())
      return
    }

    setSalvando(true)
    let capaEnviada: string | null = null
    try {
      let capaUrl = form.capaUrl
      if (capaArquivo) {
        setEtapa('Otimizando e enviando a capa…')
        capaEnviada = await enviarImagem(form.slug, capaArquivo)
        capaUrl = capaEnviada
      }
      setEtapa('Salvando…')

      const dados: ObraInsert = {
        titulo: form.titulo.trim(),
        slug: form.slug,
        categoria: form.categoria,
        tipo: form.tipo,
        servicos: SERVICOS.map((s) => s.slug).filter((s) => form.servicos.includes(s)),
        cidade: ouNulo(form.cidade),
        ano: form.ano.trim() ? Number(form.ano) : null,
        descricao: ouNulo(form.descricao),
        capa_url: capaUrl,
        capa_alt: capaUrl ? form.capaAlt.trim() : null,
        destaque: form.destaque,
        publicado: form.publicado,
        ordem: Number(form.ordem),
      }

      if (!obraId) {
        const { data, error } = await sb().from('obras').insert(dados).select('id').single()
        if (error) throw error
        setAlterado(false)
        setCapaArquivo(null)
        onCriada(data.id)
        return
      }

      const { data, error } = await sb().from('obras').update(dados).eq('id', obraId).select('*').maybeSingle()
      if (error) throw error
      if (!data) throw new ErroPainel('A obra não foi encontrada. Ela pode ter sido excluída.')

      // Capa trocada ou removida: apaga a anterior do storage se ninguém mais a usa.
      if (capaSalva && capaSalva !== data.capa_url) {
        const { data: usos } = await sb().from('obra_fotos').select('id').eq('url', capaSalva).limit(1)
        if (!usos?.length) await removerImagens([capaSalva])
      }

      setForm(formDaLinha(data))
      setCapaSalva(data.capa_url)
      setSlugSalvo(data.slug)
      setCapaArquivo(null)
      setAlterado(false)
      setMensagem({ tipo: 'sucesso', texto: 'Alterações salvas.' })
    } catch (erro) {
      if (capaEnviada) await removerImagens([capaEnviada])
      const codigo = (erro as { code?: string } | null)?.code
      if (codigo === '23505') {
        setErros((e) => ({ ...e, slug: 'Já existe outra obra com este endereço. Escolha outro.' }))
        requestAnimationFrame(() => document.getElementById('obra-slug')?.focus())
      }
      setMensagem({ tipo: 'erro', texto: mensagemErro(erro, 'Não foi possível salvar a obra.') })
    } finally {
      setSalvando(false)
      setEtapa(null)
    }
  }

  const titulo = obraId ? 'Editar obra' : 'Nova obra'

  if (carga.tipo !== 'ok') {
    return (
      <section aria-labelledby="titulo-editor">
        <Botao variante="fantasma" icone={ArrowLeft} onClick={onVoltar} className="mb-4 -ml-2">
          Voltar para a lista
        </Botao>
        <CabecalhoAba id="titulo-editor" titulo={titulo} />
        {carga.tipo === 'carregando' ? (
          <Carregando texto="Carregando obra…" />
        ) : (
          <Aviso tipo="erro">{carga.mensagem}</Aviso>
        )}
      </section>
    )
  }

  const temCapa = Boolean(capaArquivo || form.capaUrl)

  return (
    <section aria-labelledby="titulo-editor">
      <Botao variante="fantasma" icone={ArrowLeft} onClick={voltar} className="mb-4 -ml-2">
        Voltar para a lista
      </Botao>
      <CabecalhoAba
        id="titulo-editor"
        titulo={titulo}
        descricao={
          obraId ? form.titulo || undefined : 'Preencha os dados e salve. Em seguida, adicione as fotos da galeria.'
        }
      />

      {mensagem && (
        <Aviso tipo={mensagem.tipo} className="mb-5">
          {mensagem.texto}
        </Aviso>
      )}

      <form onSubmit={salvar} noValidate aria-describedby="obra-obrigatorios">
        <p id="obra-obrigatorios" className="mb-3 text-xs text-grafite">
          Campos marcados com * são obrigatórios.
        </p>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <Cartao className="space-y-4 p-5">
              <h2 className="text-2xl text-marinho">Dados da obra</h2>
              <CampoTexto
                id="obra-titulo"
                rotulo="Título"
                obrigatorio
                maxLength={200}
                value={form.titulo}
                erro={erros.titulo}
                onChange={(e) => atualizar('titulo', e.target.value)}
              />
              <CampoTexto
                id="obra-slug"
                rotulo="Endereço da página (slug)"
                obrigatorio
                maxLength={SLUG_MAXIMO}
                value={form.slug}
                erro={erros.slug}
                autoCapitalize="none"
                spellCheck={false}
                dica={
                  slugSalvo && form.slug !== slugSalvo
                    ? 'Atenção: mudar o endereço altera o link público da obra; links antigos deixam de funcionar.'
                    : `Página da obra: albanoluz.com/portfolio/${form.slug || '…'}`
                }
                onChange={(e) => {
                  setSlugManual(true)
                  atualizar('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))
                }}
                onBlur={() => {
                  // Só normaliza: o slug digitado pode ir até o limite do banco.
                  const limpo = gerarSlug(form.slug, SLUG_MAXIMO)
                  if (limpo !== form.slug) atualizar('slug', limpo)
                }}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoSelecao
                  rotulo="Categoria"
                  obrigatorio
                  value={form.categoria}
                  onChange={(e) => atualizar('categoria', e.target.value as CategoriaObra)}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIA_LABEL[c]}
                    </option>
                  ))}
                </CampoSelecao>
                <CampoSelecao
                  rotulo="Tipo"
                  obrigatorio
                  value={form.tipo}
                  onChange={(e) => atualizar('tipo', e.target.value as TipoObra)}
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_LABEL[t]}
                    </option>
                  ))}
                </CampoSelecao>
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <CampoTexto
                  rotulo="Cidade"
                  placeholder="Ex.: São Paulo, SP"
                  maxLength={120}
                  value={form.cidade}
                  onChange={(e) => atualizar('cidade', e.target.value)}
                />
                <CampoTexto
                  id="obra-ano"
                  rotulo="Ano"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={String(new Date().getFullYear())}
                  value={form.ano}
                  erro={erros.ano}
                  onChange={(e) => atualizar('ano', e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <CampoAreaTexto
                rotulo="Descrição"
                rows={5}
                maxLength={4000}
                dica="Resumo da obra e da solução técnica. Aparece na página da obra."
                value={form.descricao}
                onChange={(e) => atualizar('descricao', e.target.value)}
              />
            </Cartao>

            <Cartao className="p-5">
              <fieldset>
                <legend className="font-serif text-2xl font-semibold text-marinho">Serviços prestados</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {SERVICOS.map((s) => (
                    <CaixaMarcacao
                      key={s.slug}
                      rotulo={s.nome}
                      checked={form.servicos.includes(s.slug)}
                      onChange={(e) => alternarServico(s.slug, e.target.checked)}
                    />
                  ))}
                </div>
              </fieldset>
            </Cartao>
          </div>

          <div className="space-y-5">
            <Cartao className="space-y-4 p-5">
              <h2 className="text-2xl text-marinho">Publicação</h2>
              <CaixaMarcacao
                rotulo="Publicada no site"
                dica="Desmarque para ocultar a obra sem excluí-la."
                checked={form.publicado}
                onChange={(e) => atualizar('publicado', e.target.checked)}
              />
              <CaixaMarcacao
                rotulo="Destaque na página inicial"
                checked={form.destaque}
                onChange={(e) => atualizar('destaque', e.target.checked)}
              />
              <CampoTexto
                id="obra-ordem"
                rotulo="Ordem"
                obrigatorio
                inputMode="numeric"
                dica="Números menores aparecem primeiro."
                value={form.ordem}
                erro={erros.ordem}
                onChange={(e) => atualizar('ordem', e.target.value.replace(/[^\d-]/g, ''))}
              />
            </Cartao>

            <Cartao className="space-y-4 p-5">
              <h2 className="text-2xl text-marinho">Capa</h2>
              <CampoImagem
                rotulo="Imagem de capa"
                urlAtual={form.capaUrl}
                arquivo={capaArquivo}
                desabilitado={salvando}
                onArquivo={(arquivo) => {
                  setCapaArquivo(arquivo)
                  if (erros.capaAlt) setErros((e) => ({ ...e, capaAlt: undefined }))
                }}
                onRemover={() => atualizar('capaUrl', null)}
                dica="Foto principal usada nos cards do portfólio."
              />
              {!temCapa && (
                <p className="text-xs text-grafite">Sem capa, a obra aparece sem imagem nas listagens do site.</p>
              )}
              <CampoAreaTexto
                id="obra-capaAlt"
                rotulo="Texto alternativo da capa"
                obrigatorio={temCapa}
                rows={2}
                maxLength={300}
                dica="Descreva o que aparece na imagem. Ex.: Fachada de residência de dois pavimentos com varanda."
                value={form.capaAlt}
                erro={erros.capaAlt}
                onChange={(e) => atualizar('capaAlt', e.target.value)}
              />
            </Cartao>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-concreto-escuro bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          <p className="mr-auto text-sm text-grafite" aria-live="polite">
            {etapa ?? (sujo ? 'Alterações não salvas' : '')}
          </p>
          <Botao variante="secundario" onClick={voltar} disabled={salvando}>
            Voltar
          </Botao>
          <Botao type="submit" icone={Save} carregando={salvando}>
            {obraId ? 'Salvar alterações' : 'Criar obra'}
          </Botao>
        </div>
      </form>

      <div className="mt-8">
        {obraId && slugSalvo ? (
          <GaleriaObra obraId={obraId} pasta={slugSalvo} capaUrl={capaSalva} />
        ) : (
          <Aviso tipo="info" titulo="Galeria de fotos">
            Salve a obra para poder adicionar as fotos da galeria.
          </Aviso>
        )}
      </div>

      <div className="mt-6">
        <AvisoPreRenderizacao />
      </div>
    </section>
  )
}
