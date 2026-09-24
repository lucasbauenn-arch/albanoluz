import type { ReactNode } from 'react'

interface Props {
  sobretitulo?: string
  titulo: ReactNode
  descricao?: ReactNode
  centralizado?: boolean
  escuro?: boolean
  id?: string
  as?: 'h1' | 'h2'
}

export function TituloSecao({ sobretitulo, titulo, descricao, centralizado, escuro, id, as: Tag = 'h2' }: Props) {
  return (
    <div className={centralizado ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      {sobretitulo && (
        <p
          className={`flex items-center gap-3 text-sm font-semibold tracking-[0.14em] ${
            centralizado ? 'justify-center' : ''
          } ${escuro ? 'text-marinho-200' : 'text-marinho-500'}`}
        >
          <span aria-hidden="true" className="h-px w-8 bg-current" />
          {sobretitulo}
        </p>
      )}
      <Tag id={id} className={`mt-3 text-4xl sm:text-5xl ${escuro ? 'text-white' : 'text-marinho'}`}>
        {titulo}
      </Tag>
      {descricao && (
        <p className={`mt-4 text-lg ${escuro ? 'text-marinho-100' : 'text-grafite'}`}>{descricao}</p>
      )}
    </div>
  )
}
