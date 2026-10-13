# Mi Agente — tu panel personal

Es una página web donde ves lo que hace tu agente de IA: las tareas que te anota, las rutinas que corre, el resumen de tu correo, tu calendario y, lo más importante, las **aprobaciones**: antes de mandar un correo o un mensaje en tu nombre, el agente te pide permiso aquí y tú lo apruebas, lo corriges o lo rechazas.

Tu agente se conecta por **MCP** (un conector estándar) y escribe en el panel con las herramientas que vienen al final de este archivo.

## Correrlo en tu computadora

Necesitas tener instalado Node.js (versión 18 o más nueva). Luego, en la carpeta del proyecto:

```bash
npm install
npm run dev
```

Abre http://localhost:3000 en tu navegador. Los datos se guardan en el archivo `datos/datos.json` de esta misma carpeta (no se sube a GitHub).

Si quieres protegerlo con una clave desde ya, arranca así:

```bash
CLAVE_AGENTE=tu-clave-secreta npm run dev
```

Con la clave puesta, el navegador te la pide una sola vez y la recuerda 60 días. Sin clave, el panel queda abierto (está bien para probar en tu computadora, pero no para publicarlo).

## Conectar a tu agente

En la configuración de tu agente (OpenAI Dots, xAI Grok Bot, Meta Muse o cualquiera que soporte MCP) agrega un servidor MCP con estos datos:

- **URL:** `https://tu-panel.vercel.app/mcp` (o `http://localhost:3000/mcp` si lo corres en tu computadora y el agente también)
- **Transporte:** HTTP (Streamable HTTP)
- **Encabezado:** `Authorization: Bearer tu-clave-secreta` (la misma `CLAVE_AGENTE`)

Si tu agente solo te deja poner la URL y una "API key" o "token", pon ahí la clave: casi siempre la manda como ese encabezado.

Para probar que funciona, desde una terminal:

```bash
curl -X POST https://tu-panel.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tu-clave-secreta" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Debe regresar la lista de herramientas. Sin el encabezado de la clave, contesta `401`.

## Publicarlo en internet (Vercel)

1. Sube la carpeta a un repositorio de GitHub.
2. En https://vercel.com crea un proyecto nuevo e importa ese repositorio. Vercel detecta Next.js solo.
3. Antes de desplegar, en **Settings → Environment Variables** agrega `CLAVE_AGENTE` con una clave larga que solo tú conozcas.
4. Despliega. Tu panel queda en `https://tu-panel.vercel.app`.

Ojo: en Vercel el archivo `datos/datos.json` **no se conserva** (el servidor se reinicia seguido y lo borra). El panel te lo avisa con una franja amarilla. Para que tus datos vivan en internet, sigue el siguiente paso.

## Guardar los datos en la nube (Convex)

Convex es una base de datos gratuita para proyectos chicos. Solo se hace una vez:

1. Crea una cuenta en https://convex.dev.
2. En la carpeta del proyecto corre:

   ```bash
   npx convex dev --once
   ```

   Te pide iniciar sesión y crear un proyecto. Al terminar, deja un archivo `.env.local` (no se sube a GitHub) con la dirección de tu base de datos de desarrollo en `NEXT_PUBLIC_CONVEX_URL`.

3. Dile a Convex cuál es tu clave, la misma `CLAVE_AGENTE` de Vercel. Una vez para producción y otra para desarrollo:

   ```bash
   npx convex env set CLAVE_AGENTE "tu-clave-secreta" --prod
   npx convex env set CLAVE_AGENTE "tu-clave-secreta"
   ```

4. Publica las funciones de la base de datos:

   ```bash
   npx convex deploy
   ```

   Al final te muestra la dirección de producción (algo como `https://nombre-123.convex.cloud`).

5. En Vercel, en **Settings → Environment Variables**, agrega `CONVEX_URL` con esa dirección y vuelve a desplegar.

Listo: en cuanto existe `CONVEX_URL`, el panel guarda todo en Convex y la franja amarilla desaparece. En tu computadora pasa lo mismo con el `NEXT_PUBLIC_CONVEX_URL` que quedó en `.env.local`; agrega ahí también `CLAVE_AGENTE=tu-clave-secreta` para que el panel pueda hablar con Convex.

## Herramientas que ve tu agente

Son las que aparecen en `tools/list` (están definidas en `lib/herramientas.ts`):

- `crear_tarea` — Anota una tarea pendiente (título y, opcionalmente, fecha límite).
- `listar_tareas` — Devuelve tus tareas: pendientes, hechas o todas.
- `completar_tarea` — Marca una tarea como hecha.
- `crear_rutina` — Registra algo que el agente hace por ti de forma repetida (por ejemplo, un resumen cada mañana).
- `listar_rutinas` — Devuelve las rutinas; el agente solo debe correr las que estén activas.
- `marcar_rutina_corrida` — Avisa que acaba de correr una rutina.
- `crear_aprobacion` — Pide permiso antes de mandar algo en tu nombre; queda pendiente hasta que la apruebes o rechaces.
- `listar_aprobaciones` — Devuelve las aprobaciones (filtrables por estado) con el texto final, corregido por ti si lo cambiaste.
- `marcar_aprobacion_hecha` — Avisa que ya hizo lo que aprobaste.
- `registrar_actividad` — Escribe una línea en la actividad reciente del panel.
- `guardar_correos` — Sustituye el resumen de tu bandeja de entrada por la lista que mande.
- `guardar_eventos` — Sustituye los eventos del calendario dentro de un rango de fechas.
- `leer_ajustes` — Devuelve el nombre del panel y tu nombre, para que te hable por tu nombre.

## Rutas de la página (por si las necesitas)

- `GET /api/datos` — todo lo que muestra la pantalla.
- `GET /api/tareas`, `/api/rutinas`, `/api/aprobaciones`, `/api/actividad`, `/api/correos`, `/api/eventos` — cada lista por separado.
- `POST /api/tareas` — agregar una tarea a mano.
- `PATCH /api/tareas/:id`, `/api/rutinas/:id`, `/api/aprobaciones/:id` — marcar hecha, encender/apagar, aprobar o rechazar.
- `GET` y `PUT /api/ajustes` — nombre, color, fondo, logo y sonido.

Con `CLAVE_AGENTE` puesta, estas rutas aceptan la cookie del navegador o el mismo encabezado `Authorization: Bearer`.
