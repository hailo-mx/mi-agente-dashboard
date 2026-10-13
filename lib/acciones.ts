// Lo que se puede hacer con los datos. Lo usan por igual el agente (/mcp) y la pantalla (/api).
import { randomBytes } from 'crypto';
import { almacen } from './almacen';
import { NOMBRE } from './marca';
import { AGENTES, CANALES, ESTADOS, FONDOS, VOCES_AGENTE, type Agente, type Ajustes, type Aprobacion, type Canal, type Correo, type Estado, type Evento, type Rutina, type Tarea } from './tipos';

/** Un dato que llegó mal. Su mensaje se le muestra tal cual a quien lo mandó. */
export class ErrorDeDatos extends Error {}

type Entrada = Record<string, unknown>;

const nuevoId = () => randomBytes(6).toString('base64url');
const ahora = () => new Date().toISOString();
const MAX_ACTIVIDAD = 200;

// ── revisión de datos, a mano ──

function objeto(valor: unknown, que: string): Entrada {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new ErrorDeDatos(`${que} debe ser un objeto.`);
  return valor as Entrada;
}

export function texto(e: Entrada, campo: string, max = 4000): string {
  const valor = e[campo];
  if (typeof valor !== 'string' || !valor.trim()) throw new ErrorDeDatos(`Falta "${campo}" (debe ser un texto).`);
  if (valor.length > max) throw new ErrorDeDatos(`"${campo}" es demasiado largo (máximo ${max} caracteres).`);
  return valor.trim();
}

export function textoOpcional(e: Entrada, campo: string, max = 4000): string | undefined {
  const valor = e[campo];
  if (valor === undefined || valor === null || valor === '') return undefined;
  return texto(e, campo, max);
}

function booleano(e: Entrada, campo: string, porDefecto?: boolean): boolean {
  const valor = e[campo];
  if (valor === undefined && porDefecto !== undefined) return porDefecto;
  if (typeof valor !== 'boolean') throw new ErrorDeDatos(`"${campo}" debe ser true o false.`);
  return valor;
}

export function opcion<T extends string>(e: Entrada, campo: string, opciones: readonly T[]): T {
  const valor = e[campo];
  if (typeof valor !== 'string' || !opciones.includes(valor as T)) throw new ErrorDeDatos(`"${campo}" debe ser uno de: ${opciones.join(', ')}.`);
  return valor as T;
}

function lista(e: Entrada, campo: string, max = 500): unknown[] {
  const valor = e[campo];
  if (!Array.isArray(valor)) throw new ErrorDeDatos(`"${campo}" debe ser una lista.`);
  if (valor.length > max) throw new ErrorDeDatos(`"${campo}" trae demasiados elementos (máximo ${max}).`);
  return valor;
}

/** Fecha con hora en formato ISO, por ejemplo 2026-03-09T10:00:00-06:00. Se guarda normalizada. */
export function fechaHora(e: Entrada, campo: string): string {
  const valor = texto(e, campo, 40);
  const ms = Date.parse(valor);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(valor) || Number.isNaN(ms)) throw new ErrorDeDatos(`"${campo}" debe ser una fecha con hora en formato ISO, por ejemplo 2026-03-09T10:00:00-06:00.`);
  return new Date(ms).toISOString();
}

function dia(e: Entrada, campo: string): string | undefined {
  const valor = textoOpcional(e, campo, 10);
  if (valor === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) throw new ErrorDeDatos(`"${campo}" debe ser una fecha con formato AAAA-MM-DD, por ejemplo 2026-03-09.`);
  return valor;
}

/** Quita los campos sin valor para no guardar "undefined". */
export function compacto<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, valor]) => valor !== undefined)) as T;
}

// ── actividad ──

export async function anotarActividad(textoLibre: string) {
  const a = almacen();
  const nueva = { id: nuevoId(), texto: textoLibre, cuando: ahora() };
  const actual = await a.listar('actividad');
  // Solo se conservan los últimos movimientos.
  if (actual.length >= MAX_ACTIVIDAD) await a.reemplazar('actividad', [...actual.slice(-(MAX_ACTIVIDAD - 1)), nueva]);
  else await a.agregar('actividad', nueva);
  return nueva;
}

export async function registrarActividad(e: Entrada) {
  return anotarActividad(texto(e, 'texto', 500));
}

// ── tareas ──

export async function crearTarea(e: Entrada, quien: 'agente' | 'tu'): Promise<Tarea> {
  const tarea: Tarea = compacto({ id: nuevoId(), titulo: texto(e, 'titulo', 300), fecha: dia(e, 'fecha'), hecha: false, creada: ahora() });
  await almacen().agregar('tareas', tarea);
  await anotarActividad(`${quien === 'agente' ? 'Anotó la tarea' : 'Agregaste la tarea'}: ${tarea.titulo}`);
  return tarea;
}

export async function listarTareas(e: Entrada): Promise<Tarea[]> {
  const estado = e.estado === undefined ? 'todas' : opcion(e, 'estado', ['pendientes', 'hechas', 'todas'] as const);
  const tareas = await almacen().listar('tareas');
  return estado === 'todas' ? tareas : tareas.filter((t) => t.hecha === (estado === 'hechas'));
}

export async function marcarTarea(e: Entrada, hecha: boolean, quien: 'agente' | 'tu'): Promise<Tarea> {
  const tarea = await almacen().actualizar('tareas', texto(e, 'id', 40), { hecha });
  if (!tarea) throw new ErrorDeDatos('No encontré una tarea con ese id. Usa listar_tareas para ver los id.');
  if (hecha) await anotarActividad(`${quien === 'agente' ? 'Completó la tarea' : 'Completaste la tarea'}: ${tarea.titulo}`);
  return tarea;
}

// ── rutinas ──

export async function crearRutina(e: Entrada): Promise<Rutina> {
  const rutina: Rutina = {
    id: nuevoId(),
    titulo: texto(e, 'titulo', 300),
    horario: texto(e, 'horario', 200),
    descripcion: textoOpcional(e, 'descripcion') ?? '',
    activa: booleano(e, 'activa', true),
  };
  await almacen().agregar('rutinas', rutina);
  await anotarActividad(`Creó la rutina: ${rutina.titulo}`);
  return rutina;
}

export function listarRutinas(): Promise<Rutina[]> {
  return almacen().listar('rutinas');
}

export async function marcarRutinaCorrida(e: Entrada): Promise<Rutina> {
  const rutina = await almacen().actualizar('rutinas', texto(e, 'id', 40), { ultimaCorrida: ahora() });
  if (!rutina) throw new ErrorDeDatos('No encontré una rutina con ese id. Usa listar_rutinas para ver los id.');
  await anotarActividad(`Corrió la rutina: ${rutina.titulo}`);
  return rutina;
}

export async function activarRutina(e: Entrada): Promise<Rutina> {
  const rutina = await almacen().actualizar('rutinas', texto(e, 'id', 40), { activa: booleano(e, 'activa') });
  if (!rutina) throw new ErrorDeDatos('No encontré una rutina con ese id.');
  await anotarActividad(`${rutina.activa ? 'Encendiste' : 'Apagaste'} la rutina: ${rutina.titulo}`);
  return rutina;
}

// ── aprobaciones ──

export async function crearAprobacion(e: Entrada): Promise<Aprobacion> {
  const aprobacion: Aprobacion = {
    id: nuevoId(),
    titulo: texto(e, 'titulo', 300),
    canal: opcion<Canal>(e, 'canal', CANALES),
    detalle: texto(e, 'detalle'),
    texto: texto(e, 'texto', 20000),
    estado: 'pendiente',
    creada: ahora(),
  };
  await almacen().agregar('aprobaciones', aprobacion);
  await anotarActividad(`Pidió tu aprobación: ${aprobacion.titulo}`);
  return aprobacion;
}

export async function listarAprobaciones(e: Entrada) {
  const estado = e.estado === undefined ? undefined : opcion<Estado>(e, 'estado', ESTADOS);
  const todas = await almacen().listar('aprobaciones');
  // textoFinal: lo que de verdad hay que mandar (la versión corregida, si la hay).
  return todas.filter((a) => !estado || a.estado === estado).map((a) => ({ ...a, textoFinal: a.textoEditado ?? a.texto }));
}

export async function marcarAprobacionHecha(e: Entrada): Promise<Aprobacion> {
  const id = texto(e, 'id', 40);
  const actual = (await almacen().listar('aprobaciones')).find((a) => a.id === id);
  if (!actual) throw new ErrorDeDatos('No encontré una aprobación con ese id. Usa listar_aprobaciones para ver los id.');
  if (actual.estado !== 'aprobada') throw new ErrorDeDatos(`Esta aprobación está "${actual.estado}". Solo se puede marcar como hecha una que ya esté "aprobada".`);
  const hecha = (await almacen().actualizar('aprobaciones', id, { estado: 'hecha' }))!;
  await anotarActividad(`Hizo lo que aprobaste: ${hecha.titulo}`);
  return hecha;
}

/** Desde la pantalla: aprobar (con o sin corrección) o rechazar algo pendiente. */
export async function resolverAprobacion(e: Entrada): Promise<Aprobacion> {
  const id = texto(e, 'id', 40);
  const estado = opcion(e, 'estado', ['aprobada', 'rechazada'] as const);
  const textoEditado = textoOpcional(e, 'textoEditado', 20000);
  const actual = (await almacen().listar('aprobaciones')).find((a) => a.id === id);
  if (!actual) throw new ErrorDeDatos('Esa aprobación ya no existe.');
  if (actual.estado !== 'pendiente') throw new ErrorDeDatos('Esa aprobación ya estaba resuelta.');
  const cambios: Partial<Aprobacion> = { estado, resuelta: ahora() };
  if (estado === 'aprobada' && textoEditado && textoEditado !== actual.texto) cambios.textoEditado = textoEditado;
  const resuelta = (await almacen().actualizar('aprobaciones', id, cambios))!;
  await anotarActividad(`${estado === 'aprobada' ? (cambios.textoEditado ? 'Corregiste y aprobaste' : 'Aprobaste') : 'Rechazaste'}: ${resuelta.titulo}`);
  return resuelta;
}

// ── correos y calendario ──

export async function guardarCorreos(e: Entrada): Promise<Correo[]> {
  const correos = lista(e, 'correos').map((crudo, i): Correo => {
    const c = objeto(crudo, `El correo ${i + 1}`);
    return compacto({
      id: nuevoId(),
      de: texto(c, 'de', 300),
      asunto: texto(c, 'asunto', 500),
      resumen: texto(c, 'resumen'),
      recibido: fechaHora(c, 'recibido'),
      necesitaRespuesta: booleano(c, 'necesitaRespuesta', false),
      borrador: textoOpcional(c, 'borrador', 20000),
    });
  });
  await almacen().reemplazar('correos', correos);
  await anotarActividad(`Revisó tu correo: ${correos.length} ${correos.length === 1 ? 'mensaje' : 'mensajes'} en el resumen`);
  return correos;
}

export async function guardarEventos(e: Entrada): Promise<Evento[]> {
  const desde = fechaHora(e, 'desde');
  const hasta = fechaHora(e, 'hasta');
  if (hasta <= desde) throw new ErrorDeDatos('"hasta" debe ser posterior a "desde".');
  const nuevos = lista(e, 'eventos').map((crudo, i): Evento => {
    const ev = objeto(crudo, `El evento ${i + 1}`);
    const evento: Evento = compacto({ id: nuevoId(), titulo: texto(ev, 'titulo', 300), inicio: fechaHora(ev, 'inicio'), fin: fechaHora(ev, 'fin'), nota: textoOpcional(ev, 'nota') });
    if (evento.fin < evento.inicio) throw new ErrorDeDatos(`El evento ${i + 1} termina antes de empezar.`);
    if (evento.inicio < desde || evento.inicio >= hasta) throw new ErrorDeDatos(`El evento ${i + 1} ("${evento.titulo}") empieza fuera del rango desde/hasta.`);
    return evento;
  });
  // Se conservan los eventos de fuera del rango y se sustituyen los de dentro.
  const fuera = (await almacen().listar('eventos')).filter((ev) => ev.inicio < desde || ev.inicio >= hasta);
  await almacen().reemplazar('eventos', [...fuera, ...nuevos]);
  await anotarActividad(`Actualizó tu calendario: ${nuevos.length} ${nuevos.length === 1 ? 'evento' : 'eventos'}`);
  return nuevos;
}

// ── ajustes ──

/** Guarda los ajustes completos (lo manda la pantalla). La foto y el ícono se suben por /api/foto y /api/icono: aquí se conservan los guardados.
 *  La voz solo se guarda si es una de las voces de verdad del agente elegido; si no (o si no hay agente), se queda sin voz. */
export async function guardarAjustes(e: Entrada): Promise<Ajustes> {
  const color = texto(e, 'color', 7);
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new ErrorDeDatos('El color debe tener el formato #rrggbb.');
  const a = almacen();
  const { foto, icono } = await a.leerAjustes();
  const agente: Agente | undefined = e.agente === undefined || e.agente === '' ? undefined : opcion(e, 'agente', AGENTES.filter(Boolean));
  const voz = textoOpcional(e, 'voz', 40);
  const ajustes: Ajustes = compacto({
    nombreApp: textoOpcional(e, 'nombreApp', 40) ?? NOMBRE,
    tuNombre: textoOpcional(e, 'tuNombre', 40) ?? '',
    color,
    fondo: opcion(e, 'fondo', FONDOS),
    sonido: booleano(e, 'sonido'),
    voz: voz && agente && VOCES_AGENTE[agente].includes(voz) ? voz : undefined,
    agente,
    foto,
    icono,
  });
  await a.guardarAjustes(ajustes);
  return ajustes;
}

/** Desde el agente: cambia solo los campos que mande (nombre, tuNombre, color, fondo, voz, sonido, agente). */
export async function cambiarAjustes(e: Entrada): Promise<Ajustes> {
  const actual = await almacen().leerAjustes();
  const cambios: Entrada = {};
  if (e.nombre !== undefined) cambios.nombreApp = e.nombre;
  for (const campo of ['nombreApp', 'tuNombre', 'color', 'fondo', 'voz', 'sonido', 'agente']) if (e[campo] !== undefined) cambios[campo] = e[campo];
  if (Object.keys(cambios).length === 0) throw new ErrorDeDatos('Manda al menos un campo: nombre, tuNombre, color, fondo, voz, sonido o agente.');
  // La voz tiene que ser una de las del agente (el que mande ahora o el ya guardado).
  if (cambios.voz !== undefined) {
    const agente = (cambios.agente ?? actual.agente ?? '') as Agente;
    const voces = VOCES_AGENTE[agente] ?? [];
    if (!agente) throw new ErrorDeDatos('Primero di en qué agente vives (agente: dots o grok) y luego elige la voz.');
    if (voces.length === 0) throw new ErrorDeDatos(`${agente} no tiene voces para elegir.`);
    if (!voces.includes(String(cambios.voz))) throw new ErrorDeDatos(`"voz" debe ser una de las voces de ${agente}: ${voces.join(', ')}.`);
  }
  const ajustes = await guardarAjustes({ ...actual, ...cambios });
  await anotarActividad(`Cambió los ajustes: ${Object.keys(cambios).map((c) => (c === 'nombreApp' ? 'nombre' : c)).join(', ')}`);
  return ajustes;
}
