import Entrar from '@/components/Entrar';
import Panel from '@/components/Panel';
import { navegadorAutorizado } from '@/lib/acceso';
import { ajustesActuales } from '@/lib/ajustes';
import { ajustesParaPantalla } from '@/lib/imagenes';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  // Con CLAVE_AGENTE puesta, primero se pide la clave (una sola vez por navegador).
  const ajustes = await ajustesActuales();
  if (!navegadorAutorizado()) return <Entrar sonido={ajustes.sonido} />;
  return <Panel ajustesIniciales={ajustesParaPantalla(ajustes)} />;
}
