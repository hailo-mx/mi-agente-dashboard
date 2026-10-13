// Funciones de la base en la nube. Todas piden la clave compartida (variable CLAVE_AGENTE
// de Convex): con solo la dirección pública de Convex nadie puede leer ni escribir.
//
// Se usan las versiones "Generic" para que el panel compile sin la carpeta convex/_generated.
import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

const COLECCIONES = ['tareas', 'rutinas', 'aprobaciones', 'actividad', 'correos', 'eventos', 'conexiones', 'whatsapp'] as const;

const coleccion = v.union(
  v.literal('tareas'),
  v.literal('rutinas'),
  v.literal('aprobaciones'),
  v.literal('actividad'),
  v.literal('correos'),
  v.literal('eventos'),
  v.literal('conexiones'),
  v.literal('whatsapp'),
);

function revisarClave(clave: string) {
  const real = process.env.CLAVE_AGENTE;
  if (!real) throw new Error('Falta la variable CLAVE_AGENTE en Convex. Ponla con: npx convex env set CLAVE_AGENTE "tu-clave" --prod');
  // Comparación en tiempo constante: no se detiene en la primera letra distinta.
  let distinto = clave.length ^ real.length;
  for (let i = 0; i < real.length; i++) distinto |= real.charCodeAt(i) ^ (clave.charCodeAt(i) || 0);
  if (distinto !== 0) throw new Error('La clave no coincide con la variable CLAVE_AGENTE de Convex.');
}

// Quita los campos internos de Convex para devolver el elemento tal como lo guardó el panel.
function limpio(doc: Record<string, unknown>) {
  const { _id, _creationTime, ...resto } = doc;
  return resto;
}

export const leerTodo = queryGeneric({
  args: { clave: v.string() },
  handler: async (ctx, { clave }) => {
    revisarClave(clave);
    const todo: Record<string, unknown> = {};
    for (const c of COLECCIONES) todo[c] = (await ctx.db.query(c).collect()).map(limpio);
    const ajustes = await ctx.db.query('ajustes').first();
    todo.ajustes = ajustes ? limpio(ajustes) : null;
    return todo;
  },
});

export const listar = queryGeneric({
  args: { clave: v.string(), coleccion },
  handler: async (ctx, a) => {
    revisarClave(a.clave);
    return (await ctx.db.query(a.coleccion).collect()).map(limpio);
  },
});

export const agregar = mutationGeneric({
  args: { clave: v.string(), coleccion, elemento: v.any() },
  handler: async (ctx, a) => {
    revisarClave(a.clave);
    await ctx.db.insert(a.coleccion, a.elemento);
    return null;
  },
});

export const actualizar = mutationGeneric({
  args: { clave: v.string(), coleccion, id: v.string(), cambios: v.any() },
  handler: async (ctx, a) => {
    revisarClave(a.clave);
    const doc = await ctx.db
      .query(a.coleccion)
      .withIndex('por_id', (q) => q.eq('id', a.id))
      .first();
    if (!doc) return null;
    const { id: _ignorado, ...cambios } = a.cambios;
    await ctx.db.patch(doc._id, cambios);
    return limpio({ ...doc, ...cambios });
  },
});

export const reemplazar = mutationGeneric({
  args: { clave: v.string(), coleccion, elementos: v.array(v.any()) },
  handler: async (ctx, a) => {
    revisarClave(a.clave);
    for (const doc of await ctx.db.query(a.coleccion).collect()) await ctx.db.delete(doc._id);
    for (const elemento of a.elementos) await ctx.db.insert(a.coleccion, elemento);
    return null;
  },
});

export const leerAjustes = queryGeneric({
  args: { clave: v.string() },
  handler: async (ctx, { clave }) => {
    revisarClave(clave);
    const ajustes = await ctx.db.query('ajustes').first();
    return ajustes ? limpio(ajustes) : null;
  },
});

export const guardarAjustes = mutationGeneric({
  args: { clave: v.string(), ajustes: v.any() },
  handler: async (ctx, a) => {
    revisarClave(a.clave);
    const actual = await ctx.db.query('ajustes').first();
    if (actual) await ctx.db.replace(actual._id, a.ajustes);
    else await ctx.db.insert('ajustes', a.ajustes);
    return null;
  },
});
