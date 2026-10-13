// Las herramientas que el agente ve por MCP: nombre, descripción, esquema y qué hacen.
import * as acciones from './acciones';
import { almacen } from './almacen';
import { CANALES, ESTADOS } from './tipos';

type Entrada = Record<string, unknown>;

export type Herramienta = {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };
  ejecutar: (argumentos: Entrada) => Promise<unknown>;
};

const id = (de: string) => ({ type: 'string', description: `El id de ${de}.` });
const FECHA_HORA = 'Fecha y hora en formato ISO con zona horaria, por ejemplo 2026-03-09T10:00:00-06:00.';

export const HERRAMIENTAS: Herramienta[] = [
  {
    name: 'crear_tarea',
    description: 'Anota una tarea pendiente en el panel. Úsala cuando la persona te dicte algo que tiene que hacer.',
    inputSchema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Qué hay que hacer. Ejemplo: "Llamar al contador".' },
        fecha: { type: 'string', description: 'Opcional. Día límite con formato AAAA-MM-DD.' },
      },
      required: ['titulo'],
    },
    ejecutar: (a) => acciones.crearTarea(a, 'agente'),
  },
  {
    name: 'listar_tareas',
    description: 'Devuelve las tareas del panel. Puedes pedir solo las pendientes o solo las hechas.',
    inputSchema: {
      type: 'object',
      properties: { estado: { type: 'string', enum: ['pendientes', 'hechas', 'todas'], description: 'Opcional. Por defecto: todas.' } },
    },
    ejecutar: (a) => acciones.listarTareas(a),
  },
  {
    name: 'completar_tarea',
    description: 'Marca una tarea como hecha.',
    inputSchema: { type: 'object', properties: { id: id('la tarea (lo da listar_tareas)') }, required: ['id'] },
    ejecutar: (a) => acciones.marcarTarea(a, true, 'agente'),
  },
  {
    name: 'crear_rutina',
    description: 'Registra una rutina: algo que haces por la persona de forma repetida (por ejemplo, un resumen cada mañana).',
    inputSchema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Nombre corto. Ejemplo: "Resumen de la mañana".' },
        horario: { type: 'string', description: 'Cuándo corre, en texto libre. Ejemplo: "Todos los días, 7:00 AM".' },
        descripcion: { type: 'string', description: 'Opcional. Qué haces en esta rutina.' },
        activa: { type: 'boolean', description: 'Opcional. Por defecto: true.' },
      },
      required: ['titulo', 'horario'],
    },
    ejecutar: (a) => acciones.crearRutina(a),
  },
  {
    name: 'listar_rutinas',
    description: 'Devuelve las rutinas. Corre solo las que tengan "activa" en true: la persona puede apagarlas desde el panel.',
    inputSchema: { type: 'object', properties: {} },
    ejecutar: () => acciones.listarRutinas(),
  },
  {
    name: 'marcar_rutina_corrida',
    description: 'Avisa que acabas de correr una rutina. Guarda la hora en "ultimaCorrida".',
    inputSchema: { type: 'object', properties: { id: id('la rutina (lo da listar_rutinas)') }, required: ['id'] },
    ejecutar: (a) => acciones.marcarRutinaCorrida(a),
  },
  {
    name: 'crear_aprobacion',
    description:
      'Pide permiso antes de hacer algo en nombre de la persona (mandar un correo, un WhatsApp, crear un evento). Queda "pendiente" hasta que la persona la apruebe o la rechace en el panel. No hagas la acción hasta que listar_aprobaciones la muestre como "aprobada".',
    inputSchema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Resumen corto. Ejemplo: "Responder al proveedor".' },
        canal: { type: 'string', enum: [...CANALES], description: 'Por dónde se haría.' },
        detalle: { type: 'string', description: 'Qué quieres hacer, a quién y por qué.' },
        texto: { type: 'string', description: 'El texto exacto que mandarías.' },
      },
      required: ['titulo', 'canal', 'detalle', 'texto'],
    },
    ejecutar: (a) => acciones.crearAprobacion(a),
  },
  {
    name: 'listar_aprobaciones',
    description:
      'Devuelve las aprobaciones. Filtra con estado "aprobada" para ver qué ya puedes hacer. Manda siempre "textoFinal": es la versión corregida por la persona, si la corrigió.',
    inputSchema: {
      type: 'object',
      properties: { estado: { type: 'string', enum: [...ESTADOS], description: 'Opcional. Si no lo mandas, devuelve todas.' } },
    },
    ejecutar: (a) => acciones.listarAprobaciones(a),
  },
  {
    name: 'marcar_aprobacion_hecha',
    description: 'Avisa que ya hiciste lo que la persona aprobó. Solo funciona con aprobaciones en estado "aprobada".',
    inputSchema: { type: 'object', properties: { id: id('la aprobación (lo da listar_aprobaciones)') }, required: ['id'] },
    ejecutar: (a) => acciones.marcarAprobacionHecha(a),
  },
  {
    name: 'registrar_actividad',
    description: 'Escribe una línea en la actividad reciente del panel para contar algo que hiciste. Una frase corta, en pasado.',
    inputSchema: {
      type: 'object',
      properties: { texto: { type: 'string', description: 'Ejemplo: "Revisó tu agenda de mañana".' } },
      required: ['texto'],
    },
    ejecutar: (a) => acciones.registrarActividad(a),
  },
  {
    name: 'guardar_correos',
    description: 'Sustituye el resumen de la bandeja de entrada del panel por la lista que mandes. Manda la lista completa cada vez (los anteriores se borran).',
    inputSchema: {
      type: 'object',
      properties: {
        correos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              de: { type: 'string', description: 'Quién lo mandó.' },
              asunto: { type: 'string' },
              resumen: { type: 'string', description: 'De qué trata, en una o dos frases.' },
              recibido: { type: 'string', description: FECHA_HORA },
              necesitaRespuesta: { type: 'boolean', description: 'Opcional. Por defecto: false.' },
              borrador: { type: 'string', description: 'Opcional. La respuesta que dejaste preparada.' },
            },
            required: ['de', 'asunto', 'resumen', 'recibido'],
          },
        },
      },
      required: ['correos'],
    },
    ejecutar: (a) => acciones.guardarCorreos(a),
  },
  {
    name: 'guardar_eventos',
    description: 'Sustituye los eventos del calendario del panel dentro del rango desde/hasta por la lista que mandes. Los eventos de fuera del rango no se tocan.',
    inputSchema: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: `Inicio del rango. ${FECHA_HORA}` },
        hasta: { type: 'string', description: `Fin del rango (no incluido). ${FECHA_HORA}` },
        eventos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              inicio: { type: 'string', description: FECHA_HORA },
              fin: { type: 'string', description: FECHA_HORA },
              nota: { type: 'string', description: 'Opcional. Lugar, liga o comentario.' },
            },
            required: ['titulo', 'inicio', 'fin'],
          },
        },
      },
      required: ['desde', 'hasta', 'eventos'],
    },
    ejecutar: (a) => acciones.guardarEventos(a),
  },
  {
    name: 'leer_ajustes',
    description: 'Devuelve los ajustes del panel: cómo se llama la app y cómo se llama la persona, para que le hables por su nombre.',
    inputSchema: { type: 'object', properties: {} },
    ejecutar: async () => {
      // El logo es una imagen pesada: solo se dice si existe.
      const { logo, ...resto } = await almacen().leerAjustes();
      return { ...resto, tieneLogo: Boolean(logo) };
    },
  },
];
