import { SUPABASE_URL } from '../lib/env'
import { BUCKET_OBRAS, sb } from './supabase'
import { ErroPainel } from './util'

/** Formatos que o navegador consegue decodificar para reprocessar. */
export const TIPOS_IMAGEM_ACEITOS = 'image/jpeg,image/png,image/webp,image/avif'

const LADO_MAXIMO = 1920
const QUALIDADE_WEBP = 0.82
const QUALIDADE_JPEG = 0.85

type ImagemPreparada = { blob: Blob; extensao: string; tipo: string }

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

/**
 * Redimensiona (lado maior ≤ `ladoMaximo`) e converte para WebP no navegador.
 * Sem codificador WebP (ex.: Safari), gera JPEG redimensionado; se nem isso
 * for possível, devolve o arquivo original.
 */
export async function prepararImagem(arquivo: File, ladoMaximo = LADO_MAXIMO): Promise<ImagemPreparada> {
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
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
    const largura = Math.max(1, Math.round(bitmap.width * escala))
    const altura = Math.max(1, Math.round(bitmap.height * escala))

    const webp = await codificar(bitmap, largura, altura, 'image/webp', QUALIDADE_WEBP, false)
    if (webp && webp.type === 'image/webp') return { blob: webp, extensao: 'webp', tipo: 'image/webp' }

    const jpeg = await codificar(bitmap, largura, altura, 'image/jpeg', QUALIDADE_JPEG, true)
    if (jpeg && jpeg.type === 'image/jpeg') return { blob: jpeg, extensao: 'jpg', tipo: 'image/jpeg' }
  } catch {
    // Cai para o arquivo original abaixo.
  } finally {
    bitmap.close()
  }

  return { blob: arquivo, extensao: extensaoOriginal(arquivo), tipo: arquivo.type }
}

/**
 * Otimiza e envia uma imagem ao bucket público "obras" em `<pasta>/<uuid>.webp`.
 * Devolve a URL pública completa.
 */
export async function enviarImagem(pasta: string, arquivo: File, ladoMaximo?: number): Promise<string> {
  const { blob, extensao, tipo } = await prepararImagem(arquivo, ladoMaximo)
  const pastaLimpa = pasta.replace(/[^a-z0-9_-]/gi, '') || 'sem-pasta'
  const caminho = `${pastaLimpa}/${crypto.randomUUID()}.${extensao}`
  const storage = sb().storage.from(BUCKET_OBRAS)
  const { error } = await storage.upload(caminho, blob, {
    contentType: tipo,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error
  return storage.getPublicUrl(caminho).data.publicUrl
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

/** Remove do storage as imagens do bucket "obras" (melhor esforço; não lança). */
export async function removerImagens(urls: (string | null | undefined)[]): Promise<void> {
  const caminhos = [...new Set(urls.map(caminhoNoBucketObras).filter((c): c is string => Boolean(c)))]
  if (!caminhos.length) return
  try {
    const { error } = await sb().storage.from(BUCKET_OBRAS).remove(caminhos)
    if (error) console.warn('Não foi possível remover imagens do storage:', error.message)
  } catch (erro) {
    console.warn('Não foi possível remover imagens do storage:', erro)
  }
}
