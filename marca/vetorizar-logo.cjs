// Vetoriza o logo (canal alfa do webp) com potrace. Uso: node vetorizar.cjs <entrada.webp> <pastaSaida>
const sharp = require('sharp'); const { Potrace } = require('potrace'); const fs = require('fs'); const path = require('path')
const [entrada, saida] = process.argv.slice(2)
const ESCALA = 2
const LIMIAR = 165 // separa as duas linhas da moldura (sulco semitransparente)

async function mascara(recorte, escala = ESCALA) {
  // alfa → preto (forma) sobre branco, ampliado 2x para contornos mais suaves
  let img = sharp(entrada).extractChannel(3)
  if (recorte) img = img.extract({ left: recorte.left, top: recorte.top, width: recorte.width, height: recorte.height })
  const meta = await img.clone().metadata()
  const larg = Math.round((recorte ? recorte.width : meta.width) * escala)
  let base = await img.resize({ width: larg, kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true })
  if (recorte && recorte.apagar) { const [ax, ay, aw, ah] = recorte.apagar.map((v) => Math.round(v * escala)); for (let y = ay; y < ay + ah; y++) for (let x = ax; x < ax + aw; x++) base.data[y * base.info.width + x] = 0 }
  const buf = await sharp(base.data, { raw: { width: base.info.width, height: base.info.height, channels: 1 } }).threshold(LIMIAR).negate().png().toBuffer()
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true })
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[y * info.width + x] < 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  return { buf, caixa: { x0, y0, x1, y1 } }
}

function tracar(buf, tol = 0.25) {
  return new Promise((ok, erro) => {
    const p = new Potrace({ turdSize: 12, optTolerance: tol, alphaMax: 1, threshold: 128 })
    p.loadImage(buf, (e) => (e ? erro(e) : ok(p.getPathTag('#000').match(/ d="([^"]+)"/)[1])))
  })
}

const arred = (d) => d.replace(/(\d+\.\d{2})\d+/g, '$1')

async function gerar(nome, recorte, cores, escala = ESCALA, tol = 0.25) {
  const { buf, caixa } = await mascara(recorte, escala)
  const d = arred(await tracar(buf, tol))
  const m = 6 // margem
  const vb = [caixa.x0 - m, caixa.y0 - m, caixa.x1 - caixa.x0 + 2 * m, caixa.y1 - caixa.y0 + 2 * m]
  for (const [sufixo, cor] of cores) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${Math.round(vb[2] / escala)}" height="${Math.round(vb[3] / escala)}"><path fill="${cor}" fill-rule="evenodd" d="${d}"/></svg>\n`
    fs.writeFileSync(path.join(saida, `${nome}${sufixo}.svg`), svg)
    console.log(`${nome}${sufixo}.svg`, (svg.length / 1024).toFixed(1) + ' KB', 'proporção', (vb[2] / vb[3]).toFixed(3))
  }
  return { d, vb }
}

;(async () => {
  fs.mkdirSync(saida, { recursive: true })
  const cores = [['', '#0F2344'], ['-branco', '#FFFFFF']]
  await gerar('logo', null, cores)
  const mono = await gerar('monograma', { left: 0, top: 0, width: 960, height: 787, apagar: [740, 0, 220, 600] }, cores)
  await gerar('monograma-simplificado', { left: 0, top: 0, width: 960, height: 787, apagar: [740, 0, 220, 600] }, [['-branco', '#FFFFFF']], 0.5, 0.6)
  // Favicon: monograma branco centralizado em quadrado azul-marinho
  const [x, y, w, h] = mono.vb; const lado = Math.max(w, h) * 1.12
  const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(x - (lado - w) / 2).toFixed(1)} ${(y - (lado - h) / 2).toFixed(1)} ${lado.toFixed(1)} ${lado.toFixed(1)}"><rect x="${(x - (lado - w) / 2).toFixed(1)}" y="${(y - (lado - h) / 2).toFixed(1)}" width="${lado.toFixed(1)}" height="${lado.toFixed(1)}" fill="#0F2344"/><path fill="#FFFFFF" fill-rule="evenodd" d="${mono.d}"/></svg>\n`
  fs.writeFileSync(path.join(saida, 'favicon.svg'), fav)
  console.log('favicon.svg', (fav.length / 1024).toFixed(1) + ' KB')
})()
