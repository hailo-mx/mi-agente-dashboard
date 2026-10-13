// La misma app, abierta en la sección Conexiones (Google y Microsoft regresan aquí después de dar permiso).
import Entrar from '@/components/Entrar';
import Panel from '@/components/Panel';
import { navegadorAutorizado } from '@/lib/acceso';
import { ajustesActuales } from '@/lib/ajustes';

export const dynamic = 'force-dynamic';

export default async function PaginaConexiones() {
  if (!navegadorAutorizado()) return <Entrar />;
  return <Panel ajustesIniciales={await ajustesActuales()} vistaInicial="Conexiones" />;
}
