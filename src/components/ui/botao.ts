export type VarianteBotao = 'primario' | 'whats' | 'contorno' | 'claro' | 'contorno-claro'

const base =
  'inline-flex items-center justify-center gap-2 rounded-[2px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60'

const variantes: Record<VarianteBotao, string> = {
  primario: 'bg-marinho text-white hover:bg-marinho-600',
  whats: 'bg-whats text-white hover:bg-whats-escuro',
  contorno: 'border border-marinho text-marinho hover:bg-marinho hover:text-white',
  claro: 'bg-white text-marinho hover:bg-marinho-50',
  'contorno-claro': 'border border-white/60 text-white hover:border-white hover:bg-white/10',
}

const tamanhos = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-3 text-[0.95rem]',
  lg: 'px-6 py-3.5 text-base',
}

export function botao(variante: VarianteBotao = 'primario', tamanho: keyof typeof tamanhos = 'md') {
  return `${base} ${variantes[variante]} ${tamanhos[tamanho]}`
}
