import { SUPABASE_URL } from '../lib/env'
import { BUCKET_OBRAS, sb } from './supabase'
import { ErroPainel } from './util'

/** Formatos que o navegador consegue decodificar para reprocessar. */
export const TIPOS_IMAGEM_ACEITOS = 'image/jpeg,image/png,image/webp,image/avif'

const LADO_MAXIMO = 1920
const QUALIDADE_WEBP = 0.82
const QUALIDADE_JPEG = 0.85

/**
 * Variante reduzida gravada ao lado de cada upload: `<uuid>-600.<ext>`, com a
 * mesma extensão do arquivo principal. O site monta o srcset trocando só o
 * sufixo na URL (src/data/fotos.ts, srcSetDe).
 */
const LARGURA_REDUZIDA = 600
const SUFIXO_REDUZIDA = `-${LARGURA_REDUZIDA}`
const QUALIDADE_REDUZIDA = 0.8

type ImagemPreparada = { blob: Blob; extensao: string; tipo: string }
type ImagensPreparadas = { principal: ImagemPreparada; reduzida: ImagemPreparada }

async function codificar(
  bitmap: ImageBitmap,
  largura: number,
  altura: number,
  tipo: string,
  qualidade: number,
  fundoBranco: boolean,
): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const canvas = new OffscreenCanvas(largura, altura)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        if (fundoBranco) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, largura, altura)
        }
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(bitmap, 0, 0, largura, altura)
        return await canvas.convertToBlob({ type: tipo, quality: qualidade })
      }
    } catch {
      // Alguns navegadores têm OffscreenCanvas sem convertToBlob: tenta <canvas>.
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  if (fundoBranco) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, largura, altura)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, largura, altura)
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade))
}

function extensaoOriginal(arquivo: File): string {
  const porTipo: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
  }
  return porTipo[arquivo.type] ?? arquivo.name.split('.').pop()?.toLowerCase() ?? 'img'
}

/** Dimensões com a escala aplicada (nunca amplia; mínimo de 1 px). */
function escalar(bitmap: ImageBitmap, escala: number) {
  const fator = Math.min(1, escala)
  return {
    largura: Math.max(1, Math.round(bitmap.width * fator)),
    altura: Math.max(1, Math.round(bitmap.height * fator)),
  }
}

/**
 * Gera, no navegador, a imagem principal (lado maior ≤ `ladoMaximo`) e a
 * variante de 600 px de largura, as duas em WebP. Sem codificador WebP (ex.:
 * Safari), as duas saem em JPEG; se nem isso for possível, o arquivo original
 * ocupa as duas posições (o par de arquivos existe sempre).
 */
export async function prepararImagens(arquivo: File, ladoMaximo = LADO_MAXIMO): Promise<ImagensPreparadas> {
  if (!arquivo.type.startsWith('image/')) {
    throw new ErroPainel('Selecione um arquivo de imagem (JPG, PNG ou WebP).')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErroPainel('Não foi possível ler esta imagem. Use um arquivo JPG, PNG ou WebP.')
  }

  try {
    const principal = escalar(bitmap, ladoMaximo / Math.max(bitmap.width, bitmap.height))
    const reduzida = escalar(bitmap, LARGURA_REDUZIDA / bitmap.width)

    // As duas no mesmo formato: se a reduzida falhar em WebP, tenta o par em JPEG.
    const formatos = [
      { tipo: 'image/webp', extensao: 'webp', qualidade: QUALIDADE_WEBP, fundoBranco: false },
      { tipo: 'image/jpeg', extensao: 'jpg', qualidade: QUALIDADE_JPEG, fundoBranco: true },
    ]
    for (const { tipo, extensao, qualidade, fundoBranco } of formatos) {
      const grande = await codificar(bitmap, principal.largura, principal.altura, tipo, qualidade, fundoBranco)
      if (grande?.type !== tipo) continue
      const pequena = await codificar(bitmap, reduzida.largura, reduzida.altura, tipo, QUALIDADE_REDUZIDA, fundoBranco)
      if (pequena?.type !== tipo) continue
      return { principal: { blob: grande, extensao, tipo }, reduzida: { blob: pequena, extensao, tipo } }
    }
  } catch {
    // Cai para o arquivo original abaixo.
  } finally {
    bitmap.close()
  }

  const original = { blob: arquivo, extensao: extensaoOriginal(arquivo), tipo: arquivo.type }
  return { principal: original, reduzida: original }
}

/**
 * Otimiza e envia uma imagem ao bucket público "obras": `<pasta>/<uuid>.webp`
 * e a variante `<pasta>/<uuid>-600.webp` (ou o par em .jpg). Se um dos dois
 * envios falhar, apaga o outro e lança o erro. Devolve a URL pública do
 * arquivo principal, que é a gravada no banco.
 */
export async function enviarImagem(pasta: string, arquivo: File, ladoMaximo?: number): Promise<string> {
  const { principal, reduzida } = await prepararImagens(arquivo, ladoMaximo)
  const pastaLimpa = pasta.replace(/[^a-z0-9_-]/gi, '') || 'sem-pasta'
  const base = `${pastaLimpa}/${crypto.randomUUID()}`
  const envios = [
    { caminho: `${base}.${principal.extensao}`, imagem: principal },
    { caminho: `${base}${SUFIXO_REDUZIDA}.${reduzida.extensao}`, imagem: reduzida },
  ]
  const storage = sb().storage.from(BUCKET_OBRAS)
  const resultados = await Promise.allSettled(
    envios.map(({ caminho, imagem }) =>
      storage.upload(caminho, imagem.blob, { contentType: imagem.tipo, cacheControl: '31536000', upsert: false }),
    ),
  )
  const falhas = resultados.map((r) => (r.status === 'rejected' ? (r.reason as unknown) : r.value.error))
  const falha = falhas.find(Boolean)
  if (falha) {
    // Não deixa um arquivo sem o par no bucket.
    const enviados = envios.filter((_, i) => !falhas[i]).map((e) => e.caminho)
    if (enviados.length) {
      try {
        await storage.remove(enviados)
      } catch {
        // Melhor esforço: o erro que importa é o do envio.
      }
    }
    throw falha
  }
  return storage.getPublicUrl(envios[0].caminho).data.publicUrl
}

const PREFIXO_PUBLICO = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_OBRAS}/`

/** Caminho no bucket "obras" se a URL for de lá; null para imagens locais (/ilustracoes/...). */
export function caminhoNoBucketObras(url: string | null | undefined): string | null {
  if (!url || !SUPABASE_URL || !url.startsWith(PREFIXO_PUBLICO)) return null
  const caminho = url.slice(PREFIXO_PUBLICO.length).split(/[?#]/)[0]
  try {
    return decodeURIComponent(caminho) || null
  } catch {
    return caminho || null
  }
}

const NOME_DO_PAINEL = /^(.*\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([a-z0-9]+)$/i

/**
 * `<pasta>/<uuid>.<ext>` → `<pasta>/<uuid>-600.<ext>`. Só para nomes gerados
 * pelo painel (uuid), para nunca apagar um arquivo alheio que termine em -600.
 */
function caminhoDaReduzida(caminho: string): string | null {
  const m = caminho.match(NOME_DO_PAINEL)
  return m ? `${m[1] ?? ''}${m[2]}${SUFIXO_REDUZIDA}.${m[3]}` : null
}

/**
 * Remove do storage as imagens do bucket "obras" e as variantes -600 (melhor
 * esforço; não lança). URLs locais do site (/fotos/..., /ilustracoes/...) são
 * ignoradas. Variante que não existe (upload antigo) não gera erro.
 */
export async function removerImagens(urls: (string | null | undefined)[]): Promise<void> {
  const principais = urls.map(caminhoNoBucketObras).filter((c): c is string => Boolean(c))
  const caminhos = [
    ...new Set(principais.flatMap((c) => [c, caminhoDaReduzida(c)]).filter((c): c is string => Boolean(c))),
  ]
  if (!caminhos.length) return
  try {
    const { error } = await sb().storage.from(BUCKET_OBRAS).remove(caminhos)
    if (error) console.warn('Não foi possível remover imagens do storage:', error.message)
  } catch (erro) {
    console.warn('Não foi possível remover imagens do storage:', erro)
  }
}
