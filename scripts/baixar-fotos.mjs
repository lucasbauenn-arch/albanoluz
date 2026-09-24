// Baixa fotos do Unsplash (licença Unsplash: uso livre, sem atribuição obrigatória),
// recorta e converte para WebP em public/fotos/<nome>.webp (1200px) e <nome>-600.webp.
//
// PROVISÓRIAS: preenchem o site até o cliente enviar as fotos reais das obras (PRD).
// Uso: node scripts/baixar-fotos.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destino = path.join(raiz, 'public', 'fotos')

/** nome → id da foto no Unsplash (https://unsplash.com/photos/<id>) e proporção. */
const FOTOS = {
  // Home e institucional
  'laje-equipe-obra': { id: '1541888894402-f3b1af908be4' },

  // Serviços
  'pilares-concreto': { id: '1788301962104-78cbdf844b08' },
  'fundacao-armaduras': { id: '1659427921734-d4590f1e099f' },
  'arquiteto-prancheta': { id: '1503387762-592deb58ef4e' },
  'revisao-pranchas': { id: '1608303588026-884930af2559' },
  'execucao-estrutura': { id: '1720278516199-55256b5040ef' },

  // Obras (ilustrativas)
  'residencia-piscina': { id: '1580587771525-78b9dba3b914' },
  'residencia-branca': { id: '1600596542815-ffad4c1539a9' },
  'edificio-residencial': { id: '1689676740185-ad58fceb2ab2' },
  'edificio-branco': { id: '1655852113567-90653b609a40' },
  'galpao-docas': { id: '1758789667762-56175fe4601c' },
  'galpao-portoes': { id: '1780367261654-45395777b560' },
  'galpao-cobertura-metalica': { id: '1649907346402-9fbcf485d018' },
  'clinica-fachada': { id: '1647955045664-85a9de615a1a' },
  'clinica-interior': { id: '1478882456710-0f4951dd0e92' },
  'sobrados-pergolado': { id: '1633354747567-e0682586f082' },
  'edificio-em-obra': { id: '1508450859948-4e04fabaa4ea' },
  'armacao-laje': { id: '1563166423-482a8c14b2d6' },
  'armacao-pilares': { id: '1531834685032-c34bf0d84c77' },
  'ampliacao-andaime': { id: '1593786267440-550458cc882a' },
  'ampliacao-fundos': { id: '1632143697739-5559b57ac985' },
  'residencia-terrea-obra': { id: '1787672357923-ab85681ab58c' },
  'render-residencia-jardim': { id: '1706808849802-8f876ade0d1f' },
  'render-residencia-piscina': { id: '1706808849780-7a04fbac83ef' },
  'render-sala-integrada': { id: '1637649228998-6c78a67dfa6c' },
  'render-fachada-edificio': { id: '1721815693498-cc28507c0ba2' },
  'render-cozinha': { id: '1759147960461-b74a7e9a75d4' },
  'render-sala-estar': { id: '1600210491369-e753d80a41f3' },
}

await fs.mkdir(destino, { recursive: true })

for (const [nome, { id, proporcao = [4, 3] }] of Object.entries(FOTOS)) {
  const saida = path.join(destino, `${nome}.webp`)
  try {
    await fs.access(saida)
    continue // já baixada
  } catch {
    // segue para o download
  }
  const res = await fetch(`https://images.unsplash.com/photo-${id}?auto=format&fm=jpg&w=2000&q=85`)
  if (!res.ok) throw new Error(`${nome}: Unsplash respondeu ${res.status}`)
  const original = Buffer.from(await res.arrayBuffer())
  const [pw, ph] = proporcao
  for (const largura of [1200, 600]) {
    const altura = Math.round((largura * ph) / pw)
    await sharp(original)
      .resize(largura, altura, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: largura === 1200 ? 76 : 72 })
      .toFile(largura === 1200 ? saida : path.join(destino, `${nome}-600.webp`))
  }
  console.log(`✓ ${nome}`)
}
