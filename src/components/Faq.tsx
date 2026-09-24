import { Plus } from 'lucide-react'
import type { Pergunta } from '../data/servicos'

export function schemaFaq(itens: Pergunta[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: itens.map((i) => ({
      '@type': 'Question',
      name: i.pergunta,
      acceptedAnswer: { '@type': 'Answer', text: i.resposta },
    })),
  }
}

export function Faq({ itens }: { itens: Pergunta[] }) {
  return (
    <div className="divide-y divide-marinho/15 border-y border-marinho/15">
      {itens.map((item) => (
        <details key={item.pergunta} className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-lg font-medium text-marinho [&::-webkit-details-marker]:hidden">
            {item.pergunta}
            <Plus aria-hidden="true" className="mt-1 size-5 shrink-0 transition-transform duration-200 group-open:rotate-45" />
          </summary>
          <p className="-mt-1 pr-10 pb-6 text-grafite">{item.resposta}</p>
        </details>
      ))}
    </div>
  )
}
