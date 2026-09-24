type Celula = string | number | boolean | null | undefined

const BOM = String.fromCharCode(0xfeff)

function celula(valor: Celula): string {
  let texto = valor === null || valor === undefined ? '' : String(valor)
  // Evita injeção de fórmulas no Excel (=, +, -, @), exceto números/telefones.
  if (/^[=+\-@\t\r]/.test(texto) && !/^[+-]?[\d\s().,/-]+$/.test(texto)) texto = `'${texto}`
  return `"${texto.replace(/"/g, '""')}"`
}

/** CSV para Excel pt-BR: UTF-8 com BOM, separador ";", campos entre aspas, CRLF. */
export function gerarCsv(cabecalho: string[], linhas: Celula[][]): string {
  return BOM + [cabecalho, ...linhas].map((linha) => linha.map(celula).join(';')).join('\r\n') + '\r\n'
}

export function baixarArquivo(conteudo: BlobPart, nomeArquivo: string, tipo = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
