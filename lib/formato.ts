// Fechas y horas como se dicen en México: hora de 12 horas con AM/PM y fechas en español.

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** 7:05 AM */
export function hora(d: Date): string {
  return `${d.getHours() % 12 || 12}:${dosDigitos(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** Solo la hora, para la orilla del calendario: 7 AM */
export function horaCorta(h: number): string {
  return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
}

export function inicioDelDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function mismoDia(a: Date, b: Date): boolean {
  return inicioDelDia(a).getTime() === inicioDelDia(b).getTime();
}

/** lunes 9 de marzo */
export function fechaLarga(d: Date): string {
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
}

/** Hoy, 7:05 AM · Ayer, 7:05 AM · 9 mar, 7:05 AM */
export function cuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dias = Math.round((inicioDelDia(new Date()).getTime() - inicioDelDia(d).getTime()) / 86_400_000);
  const dia = dias === 0 ? 'Hoy' : dias === 1 ? 'Ayer' : dias === -1 ? 'Mañana' : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
  return `${dia}, ${hora(d)}`;
}

/** Para la fecha de una tarea (AAAA-MM-DD, sin hora): Hoy · Mañana · 9 de marzo */
export function diaDeTarea(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(a, m - 1, d);
  const dias = Math.round((dia.getTime() - inicioDelDia(new Date()).getTime()) / 86_400_000);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias === -1) return 'Ayer';
  return dia.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

export function saludo(nombre: string): string {
  const h = new Date().getHours();
  const base = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return nombre.trim() ? `${base}, ${nombre.trim()}` : base;
}

/** Blanco o negro, lo que se lea mejor encima del color de acento. */
export function sobreColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const brillo = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return brillo > 0.62 ? '#111111' : '#ffffff';
}
