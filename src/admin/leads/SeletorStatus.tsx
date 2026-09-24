import { STATUS_LEAD_LABEL, type StatusLead } from '../../types'
import { cx } from '../util'
import { CLASSE_STATUS, STATUS_LEAD, ehStatusLead } from './status'

export default function SeletorStatus({
  id,
  valor,
  onAlterar,
  rotulo,
  desabilitado,
  className,
}: {
  id?: string
  valor: StatusLead
  onAlterar: (status: StatusLead) => void
  /** Rótulo acessível quando não há <label> associado, ex.: "Status do lead de Maria". */
  rotulo?: string
  desabilitado?: boolean
  className?: string
}) {
  return (
    <select
      id={id}
      aria-label={rotulo}
      value={valor}
      disabled={desabilitado}
      onChange={(e) => {
        if (ehStatusLead(e.target.value)) onAlterar(e.target.value)
      }}
      className={cx(
        'min-h-9 cursor-pointer rounded-md border px-2 py-1 text-sm font-medium disabled:cursor-wait disabled:opacity-70',
        CLASSE_STATUS[valor],
        className,
      )}
    >
      {STATUS_LEAD.map((s) => (
        <option key={s} value={s}>
          {STATUS_LEAD_LABEL[s]}
        </option>
      ))}
    </select>
  )
}
