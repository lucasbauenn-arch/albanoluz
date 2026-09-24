import { Aviso } from '../ui'

export default function AvisoPreRenderizacao() {
  return (
    <Aviso tipo="info">
      O site público é pré-renderizado: obras novas ou alteradas aparecem na hora nas listagens do portfólio, mas a
      página própria de cada obra (a versão lida pelo Google) só é gerada no próximo deploy do site.
    </Aviso>
  )
}
