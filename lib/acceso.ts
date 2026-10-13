// Control de acceso con una sola clave: la variable CLAVE_AGENTE.
// Si no existe (uso local), todo queda abierto.
import { createHash, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const GALLETA = 'mi_agente';
export const DIAS_GALLETA = 60;

function clave(): string | undefined {
  return process.env.CLAVE_AGENTE || undefined;
}

export function hayClave(): boolean {
  return Boolean(clave());
}

const huella = (texto: string) => createHash('sha256').update(texto).digest();

/** Comparación en tiempo constante (se comparan huellas del mismo largo). */
function iguales(a: string, b: string): boolean {
  return timingSafeEqual(huella(a), huella(b));
}

/** Lo que se guarda en la cookie: una huella de la clave, nunca la clave. */
export function valorGalleta(): string {
  return huella(`mi-agente:${clave()}`).toString('hex');
}

export function claveCorrecta(intento: string): boolean {
  const real = clave();
  return real ? iguales(intento, real) : true;
}

/** Para la pantalla: ¿este navegador ya escribió la clave? */
export function navegadorAutorizado(): boolean {
  if (!hayClave()) return true;
  const galleta = cookies().get(GALLETA)?.value;
  return Boolean(galleta) && iguales(galleta!, valorGalleta());
}

/** Para el agente: encabezado "Authorization: Bearer <CLAVE_AGENTE>". */
export function agenteAutorizado(peticion: Request): boolean {
  const real = clave();
  if (!real) return true;
  const encontrado = /^Bearer\s+(.+)$/i.exec(peticion.headers.get('authorization') ?? '');
  return Boolean(encontrado) && iguales(encontrado![1].trim(), real);
}
