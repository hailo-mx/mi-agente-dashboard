// Esquema de la base en la nube: una tabla por colección y una para los ajustes.
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  tareas: defineTable({
    id: v.string(),
    titulo: v.string(),
    fecha: v.optional(v.string()),
    hecha: v.boolean(),
    creada: v.string(),
  }).index('por_id', ['id']),

  rutinas: defineTable({
    id: v.string(),
    titulo: v.string(),
    horario: v.string(),
    descripcion: v.string(),
    activa: v.boolean(),
    ultimaCorrida: v.optional(v.string()),
  }).index('por_id', ['id']),

  aprobaciones: defineTable({
    id: v.string(),
    titulo: v.string(),
    canal: v.union(v.literal('Correo'), v.literal('WhatsApp'), v.literal('Calendario'), v.literal('Otro')),
    detalle: v.string(),
    texto: v.string(),
    estado: v.union(v.literal('pendiente'), v.literal('aprobada'), v.literal('rechazada'), v.literal('hecha')),
    textoEditado: v.optional(v.string()),
    creada: v.string(),
    resuelta: v.optional(v.string()),
  }).index('por_id', ['id']),

  actividad: defineTable({
    id: v.string(),
    texto: v.string(),
    cuando: v.string(),
  }).index('por_id', ['id']),

  correos: defineTable({
    id: v.string(),
    de: v.string(),
    asunto: v.string(),
    resumen: v.string(),
    recibido: v.string(),
    necesitaRespuesta: v.boolean(),
    borrador: v.optional(v.string()),
    idProveedor: v.optional(v.string()),
  }).index('por_id', ['id']),

  eventos: defineTable({
    id: v.string(),
    titulo: v.string(),
    inicio: v.string(),
    fin: v.string(),
    nota: v.optional(v.string()),
    idProveedor: v.optional(v.string()),
  }).index('por_id', ['id']),

  conexiones: defineTable({
    id: v.string(),
    proveedor: v.union(v.literal('google'), v.literal('microsoft')),
    correo: v.string(),
    refreshToken: v.string(),
    conectada: v.string(),
    ultimaSync: v.optional(v.string()),
  }).index('por_id', ['id']),

  whatsapp: defineTable({
    id: v.string(),
    idProveedor: v.string(),
    de: v.string(),
    nombre: v.optional(v.string()),
    texto: v.string(),
    recibido: v.string(),
  }).index('por_id', ['id']),

  // Un solo documento.
  ajustes: defineTable({
    nombreApp: v.string(),
    tuNombre: v.string(),
    color: v.string(),
    fondo: v.union(v.literal('calido'), v.literal('noche'), v.literal('aurora'), v.literal('grafito')),
    logo: v.optional(v.string()),
    sonido: v.boolean(),
  }),
});
