import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { classeLabel } from './estilos'
import { TIPOS_IMAGEM_ACEITOS } from './imagens'
import { Botao, Miniatura } from './ui'
import { cx } from './util'

/**
 * Seleção de imagem com pré-visualização. O envio acontece ao salvar o
 * formulário (a imagem é otimizada para WebP antes do upload).
 */
export default function CampoImagem({
  rotulo,
  urlAtual,
  arquivo,
  onArquivo,
  onRemover,
  dica,
  proporcao = 'aspect-[4/3]',
  desabilitado,
}: {
  rotulo: string
  /** Imagem já salva (URL pública ou caminho local). */
  urlAtual: string | null
  arquivo: File | null
  onArquivo: (arquivo: File | null) => void
  /** Remove a imagem salva (só aparece se houver imagem). */
  onRemover?: () => void
  dica?: string
  proporcao?: string
  desabilitado?: boolean
}) {
  const id = useId()
  // URL temporária da imagem escolhida; liberada ao trocar de arquivo ou desmontar.
  const [previa, setPrevia] = useState<{ arquivo: File; url: string } | null>(null)
  useEffect(() => {
    if (!previa) return
    return () => URL.revokeObjectURL(previa.url)
  }, [previa])
  const urlPrevia = previa && previa.arquivo === arquivo ? previa.url : null
  const exibida = urlPrevia ?? urlAtual

  function escolher(novo: File | null) {
    setPrevia(novo ? { arquivo: novo, url: URL.createObjectURL(novo) } : null)
    onArquivo(novo)
  }
  // Trocar a key zera o <input type="file"> depois de cancelar a escolha.
  const [chaveInput, setChaveInput] = useState(0)

  return (
    <div>
      <label htmlFor={id} className={classeLabel}>
        {rotulo}
      </label>
      <div className={cx('mt-1 overflow-hidden rounded-md border border-concreto-escuro', proporcao)}>
        <Miniatura url={exibida} alt="" className="size-full" />
      </div>
      {arquivo && <p className="mt-1 text-xs text-grafite">Nova imagem selecionada: {arquivo.name} (será otimizada ao salvar)</p>}
      <input
        key={chaveInput}
        id={id}
        type="file"
        accept={TIPOS_IMAGEM_ACEITOS}
        disabled={desabilitado}
        aria-describedby={dica ? `${id}-dica` : undefined}
        onChange={(e) => escolher(e.target.files?.[0] ?? null)}
        className={cx(
          'mt-2 block w-full cursor-pointer text-sm text-grafite',
          'file:mr-3 file:inline-flex file:min-h-9 file:cursor-pointer file:rounded-md file:border-0 file:bg-marinho-50',
          'file:px-3 file:text-sm file:font-medium file:text-marinho hover:file:bg-marinho-100',
        )}
      />
      {dica && (
        <p id={`${id}-dica`} className="mt-1 text-xs text-grafite">
          {dica}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {arquivo && (
          <Botao
            variante="fantasma"
            tamanho="sm"
            icone={X}
            onClick={() => {
              escolher(null)
              setChaveInput((k) => k + 1)
            }}
          >
            Cancelar nova imagem
          </Botao>
        )}
        {!arquivo && urlAtual && onRemover && (
          <Botao variante="perigo" tamanho="sm" icone={X} onClick={onRemover} disabled={desabilitado}>
            Remover imagem
          </Botao>
        )}
        {!arquivo && !urlAtual && (
          <span className="inline-flex items-center gap-1.5 text-xs text-grafite">
            <ImagePlus className="size-4" aria-hidden="true" />
            JPG, PNG ou WebP. Otimizada automaticamente no envio.
          </span>
        )}
      </div>
    </div>
  )
}
