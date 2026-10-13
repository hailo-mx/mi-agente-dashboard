import Entrar from '@/components/Entrar';
import Panel from '@/components/Panel';
import { navegadorAutorizado } from '@/lib/acceso';
import { ajustesActuales } from '@/lib/ajustes';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  // Con CLAVE_AGENTE puesta, primero se pide la clave (una sola vez por navegador).
  if (!navegadorAutorizado()) return <Entrar />;
  return <Panel ajustesIniciales={await ajustesActuales()} />;
}
