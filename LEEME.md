# Mi Agente — tu panel personal

Es una página web donde ves lo que hace tu agente de IA: las tareas que te anota, las rutinas que corre, el resumen de tu correo, tu calendario y, lo más importante, las **aprobaciones**: antes de mandar un correo o un mensaje en tu nombre, el agente te pide permiso aquí y tú lo apruebas, lo corriges o lo rechazas.

Tu agente se conecta por **MCP** (un conector estándar) y escribe en el panel con las herramientas que vienen al final de este archivo.

Se ve igual que el dashboard de muestra del mini taller y ocupa toda la pantalla: en computadora, un riel de íconos a la izquierda, la lista de la sección, el detalle al centro y tu agente a la derecha, todo sobre una ventana de cristal. En iPad son dos columnas y tu agente se abre con el último botón del riel. En el celular es una app con pestañas abajo (Inicio, Correos, Agente, WhatsApp y Más).

Se puede **instalar como app** (PWA): en iPhone/iPad, Safari → Compartir → «Agregar a pantalla de inicio»; en Android y en Chrome de escritorio, el botón «Instalar» de la barra de direcciones. Se abre sin barra del navegador, con el nombre y el color que pongas en Ajustes.

## Las secciones

- **Inicio**: saludo con tu nombre, lo que espera tu aprobación (con Aprobar y ✕ ahí mismo), tres cifras (correos ordenados, tareas abiertas, rutinas activas) y lo último que hizo tu agente.
- **Calendario**: la semana como en Google Calendar, con tus eventos (los guarda tu agente o se traen de tu cuenta conectada).
- **Correos**: tu bandeja resumida; al abrir uno ves la respuesta que preparó tu agente y puedes **Enviar** o **Editar**. **Redactar** escribe un correo nuevo.
- **WhatsApp**: una conversación por número; contestas desde la cajita de abajo.
- **Tareas**: pendientes y hechas; se marcan con el círculo. Abajo puedes anotar una a mano.
- **Rutinas**: lo que tu agente hace solo y a qué hora; cada una se puede pausar.
- **Aprobaciones**: lo que tu agente quiere mandar en tu nombre, con el texto exacto. Aprobar, Editar o rechazar (✕).
- **Conexiones**: conectar Google, Microsoft 365 y WhatsApp Business.
- **Ajustes**: tema, color, fondo, voz, logo y sonido; el nombre de la app y el tuyo; la dirección MCP para tu agente.
- **Tu agente** (la columna de la derecha, o la pestaña «Agente» en el celular): tu agente vive en Dots, Grok Bot o Muse; aquí solo se ve lo último que hizo. No se le escribe desde el panel.

Cuando todavía no hay nada, cada sección lo dice con una línea («Tu agente todavía no ha anotado nada», «Conecta tu correo en Conexiones…»). El panel nunca inventa datos de muestra.

### Contestar correos y WhatsApp desde el panel

Al tocar **Enviar** en un correo o mandar un mensaje de WhatsApp, queda registrada una aprobación ya **aprobada** por ti. Si tienes una cuenta conectada para ese canal (Google/Microsoft para correo, WhatsApp Business para WhatsApp), se manda de inmediato y ves «✓ Enviado». Si no, ves «✓ Aprobado» y tu agente la manda en su siguiente revisión (la encuentra con `listar_aprobaciones` filtrando por `aprobada`).

## Cambiar el nombre y el color (lección 10)

Hay un solo lugar en el código: el archivo `lib/marca.ts`.

```ts
export const NOMBRE = 'Mi Agente';
export const COLOR = '#2f6df6';
```

Con eso cambian el nombre con el que arranca la app (título, ícono y manifiesto para instalarla en el celular) y el color de acento inicial. Desde **Ajustes** también se cambian sin tocar código, y lo que elijas ahí manda sobre `lib/marca.ts`. Todo el estilo visual vive en `app/globals.css`.

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

La forma fácil es el botón. Te pide una cuenta de Vercel (gratis), copia este repositorio al tuyo de GitHub, te pregunta tu `CLAVE_AGENTE` y crea solo un **store de Vercel Blob** donde se guardan tus datos:

[![Desplegar con Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhailo-mx%2Fmi-agente-dashboard&project-name=mi-agente&repository-name=mi-agente&env=CLAVE_AGENTE&envDescription=Una%20clave%20larga%20que%20solo%20t%C3%BA%20conozcas%3A%20con%20ella%20entran%20t%C3%BA%20y%20tu%20agente.&stores=%5B%7B%22type%22%3A%22blob%22%7D%5D)

Si prefieres hacerlo a mano:

1. Sube la carpeta a un repositorio de GitHub.
2. En https://vercel.com crea un proyecto nuevo e importa ese repositorio. Vercel detecta Next.js solo.
3. Antes de desplegar, en **Settings → Environment Variables** agrega `CLAVE_AGENTE` con una clave larga que solo tú conozcas.
4. En **Storage → Create Database → Blob** crea un store y conéctalo al proyecto. Eso deja la variable `BLOB_READ_WRITE_TOKEN` en el proyecto (no la escribas tú).
5. Despliega. Tu panel queda en `https://tu-panel.vercel.app`.

### Dónde se guardan los datos

- **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`): todo el panel vive en un solo archivo JSON privado dentro de tu store. Es lo que deja el botón y no hay que configurar nada más. Es suficiente para un panel personal.
- **Convex** (`CONVEX_URL`): una base de datos de verdad, opcional, para cuando quieras más (varios agentes escribiendo a la vez, consultas, etc.). Si existe `CONVEX_URL`, el panel la usa en lugar de Blob. Los pasos están en la siguiente sección.
- **Sin ninguna de las dos**: en tu computadora se usa `datos/datos.json`; en Vercel ese archivo **no se conserva** (el servidor se reinicia seguido y lo borra) y el panel te lo avisa con una franja amarilla.

## Guardar los datos en Convex (opcional)

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

Listo: en cuanto existe `CONVEX_URL`, el panel guarda todo en Convex (aunque también exista `BLOB_READ_WRITE_TOKEN`) y la franja amarilla desaparece. En tu computadora pasa lo mismo con el `NEXT_PUBLIC_CONVEX_URL` que quedó en `.env.local`; agrega ahí también `CLAVE_AGENTE=tu-clave-secreta` para que el panel pueda hablar con Convex.

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
- `leer_ajustes` — Devuelve el nombre del panel, tu nombre, el color, el fondo y la voz elegida, para que te hable por tu nombre.
- `listar_conexiones` — Dice qué cuentas tienes conectadas (Google, Microsoft 365, WhatsApp) y cuándo se sincronizaron.
- `sincronizar_correo_y_calendario` — Trae a tu panel los últimos 20 hilos de tu bandeja y los eventos de los próximos 7 días de las cuentas conectadas.
- `enviar_correo` — Manda un correo de verdad desde tu cuenta. Solo con el `aprobacion_id` de una aprobación que tú ya aprobaste.
- `crear_evento` — Crea un evento de verdad en tu calendario. Solo con una aprobación aprobada.
- `enviar_whatsapp` — Manda un WhatsApp desde tu número de WhatsApp Business. Solo con una aprobación aprobada.

Las tres últimas pasan la aprobación a «hecha» al terminar: cada aprobación sirve una sola vez.

## Conexiones: tu correo, tu calendario y WhatsApp de verdad

En la sección **Conexiones** del panel conectas tus cuentas. Con eso, el panel (y tu agente a través de él) puede leer tu bandeja de entrada y tu calendario y, cuando tú lo apruebes, mandar correos, crear eventos y mandar WhatsApps.

- **Google** (Gmail + Google Calendar) y **Microsoft 365** (Outlook + Calendario): tocas **Conectar**, das permiso en la pantalla de Google o Microsoft y listo. El panel guarda un permiso permanente (nunca tu contraseña). **Sincronizar ahora** trae los últimos 20 hilos y la semana que viene; **Desconectar** lo olvida.
- **WhatsApp**: tu WhatsApp personal no se puede conectar (WhatsApp no lo permite). Se conecta un número de **WhatsApp Business** por la plataforma de Meta. Si tu agente ya tiene su propio conector de WhatsApp, este paso es opcional.

Para que los botones funcionen hacen falta unas llaves (variables de entorno). Cada tarjeta tiene un apartado **«¿Cómo consigo las llaves?»** con los pasos, y el archivo `.env.example` las lista todas:

| Variable | Para qué |
| --- | --- |
| `APP_URL` | La dirección pública de tu panel (ej. `https://tu-panel.vercel.app`). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud → credenciales OAuth de aplicación web. |
| `MS_CLIENT_ID`, `MS_CLIENT_SECRET` | Azure → App registration. |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` | Meta for Developers → WhatsApp. |

Si no quieres hacerlo a mano, pídeselo a tu ayudante de programación (Claude Code, Codex o el que uses). Copia y pega este mensaje, cambiando la dirección por la de tu panel:

```text
Ayúdame a conectar Google (Gmail y Google Calendar) a mi panel "Mi Agente", que está publicado en Vercel en https://tu-panel.vercel.app y cuyo código está en esta carpeta.

1. Usa la CLI de Google Cloud (gcloud) si está instalada; si no, instálala o guíame paso a paso con capturas de lo que debo hacer en console.cloud.google.com. Necesito: un proyecto nuevo, las APIs "Gmail API" y "Google Calendar API" habilitadas, una pantalla de consentimiento OAuth de tipo Externo con mi correo como usuario de prueba, y un ID de cliente OAuth de tipo "Aplicación web" con este URI de redirección exacto: https://tu-panel.vercel.app/api/conexiones/google/callback
2. Con el ID y el secreto que salgan, usa la CLI de Vercel (vercel env add) para poner en producción las variables GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y APP_URL=https://tu-panel.vercel.app. No me pidas que los pegue yo en ningún chat ni los guardes en archivos del repositorio.
3. Vuelve a desplegar (vercel --prod) y dime cuando pueda entrar a https://tu-panel.vercel.app/conexiones y tocar "Conectar".

Si en algún paso necesitas que yo haga clic en algo, dime exactamente dónde. Si también quieres, haz lo mismo para Microsoft 365 (App registration en Azure, redirect URI https://tu-panel.vercel.app/api/conexiones/microsoft/callback, variables MS_CLIENT_ID y MS_CLIENT_SECRET).
```

Mientras la app de Google esté «en pruebas» (lo normal para uso personal), Google te avisa que la app no está verificada: toca «Avanzado» → «Ir a … (no seguro)». Es tu propia app, no pasa nada.

## Rutas de la página (por si las necesitas)

- `GET /api/datos` — todo lo que muestra la pantalla.
- `GET /api/tareas`, `/api/rutinas`, `/api/aprobaciones`, `/api/actividad`, `/api/correos`, `/api/eventos` — cada lista por separado.
- `POST /api/tareas` — agregar una tarea a mano.
- `PATCH /api/tareas/:id`, `/api/rutinas/:id`, `/api/aprobaciones/:id` — marcar hecha, encender/apagar, aprobar o rechazar.
- `GET` y `PUT /api/ajustes` — nombre, color, fondo, logo, voz y sonido.
- `POST /api/enviar` — contestar un correo o un WhatsApp desde la pantalla: deja la aprobación aprobada y, si hay cuenta conectada, lo manda (`canal`, `para`, `asunto`, `texto`, `titulo`, `detalle`).
- `GET /api/conexiones` — el estado de tus cuentas conectadas (nunca devuelve las llaves).
- `GET /api/conexiones/google/iniciar`, `/callback` (igual con `microsoft`) — el flujo de permiso; los usa el navegador.
- `POST /api/conexiones/google/sincronizar`, `/desconectar` (igual con `microsoft`) y `POST /api/conexiones/sincronizar` (todas).
- `POST /api/conexiones/enviar-correo`, `/crear-evento`, `/enviar-whatsapp` — lo mismo que las herramientas MCP; piden `aprobacion_id`.
- `GET` y `POST /api/conexiones/whatsapp/webhook` — lo llama Meta; no lleva clave.

Con `CLAVE_AGENTE` puesta, estas rutas aceptan la cookie del navegador o el mismo encabezado `Authorization: Bearer`.
