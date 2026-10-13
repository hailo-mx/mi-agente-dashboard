'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { cuando } from '@/lib/formato';
import type { Proveedor } from '@/lib/tipos';

type Cuenta = { configurado: boolean; falta?: string; conectada: boolean; correo?: string; ultimaSync?: string };
type Estado = {
  google: Cuenta;
  microsoft: Cuenta;
  whatsapp: { configurado: boolean; falta?: string; numero?: string; mensajesRecibidos: number; ultimoMensaje?: string };
};

const NOMBRE: Record<Proveedor, string> = { google: 'Google (Gmail y Google Calendar)', microsoft: 'Microsoft 365 (Outlook y Calendario)' };

function Tarjeta({ titulo, chip, children }: { titulo: string; chip: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-tarjeta">
      <div className="mt-tarjeta-cabeza">
        <h2>{titulo}</h2>
        {chip}
      </div>
      {children}
    </section>
  );
}

const Chip = ({ on, texto }: { on: boolean; texto: string }) => <span className={`mt-chip-estado ${on ? 'ok' : ''}`}>{texto}</span>;

export default function Conexiones({ avisar }: { avisar: (texto: string) => void }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [ocupado, setOcupado] = useState('');
  const [origen, setOrigen] = useState('');

  const cargar = useCallback(async () => {
    const r = await fetch('/api/conexiones', { cache: 'no-store' }).catch(() => null);
    if (r?.ok) setEstado(await r.json());
    else avisar('No se pudo leer el estado de tus conexiones.');
  }, [avisar]);

  useEffect(() => {
    setOrigen(window.location.origin);
    // Google y Microsoft regresan a /conexiones?ok=google o ?error=...
    const q = new URLSearchParams(window.location.search);
    if (q.get('ok')) avisar(`Listo: ${q.get('ok') === 'google' ? 'Google' : 'Microsoft 365'} quedó conectado.`);
    if (q.get('error')) avisar(q.get('error')!);
    if (q.toString()) window.history.replaceState(null, '', '/conexiones');
    cargar();
  }, [avisar, cargar]);

  const pedir = async (ruta: string) => {
    setOcupado(ruta);
    try {
      const r = await fetch(ruta, { method: 'POST' });
      const j = await r.json().catch(() => null);
      if (!r.ok) avisar(j?.error ?? 'No se pudo. Inténtalo de nuevo.');
      else if (Array.isArray(j)) avisar(j.map((x) => `${x.correo}: ${x.correos} correos y ${x.eventos} eventos`).join(' · '));
    } catch {
      avisar('No hay conexión con tu panel. Inténtalo de nuevo.');
    }
    await cargar();
    setOcupado('');
  };

  const conectar = (p: Proveedor, c: Cuenta) => {
    if (!c.configurado) return avisar(`Falta configurar ${c.falta}. Abre "¿Cómo consigo las llaves?" en esta tarjeta.`);
    window.location.href = `/api/conexiones/${p}/iniciar`;
  };

  if (!estado) return <p className="mt-vacio">Cargando tus conexiones…</p>;

  const cuenta = (p: Proveedor, c: Cuenta, pasos: ReactNode) => (
    <Tarjeta key={p} titulo={NOMBRE[p]} chip={<Chip on={c.conectada} texto={c.conectada ? 'Conectado' : 'Sin conectar'} />}>
      {c.conectada ? (
        <>
          <p>Conectado como <strong>{c.correo}</strong></p>
          <p className="mt-ayuda">Última sincronización: {c.ultimaSync ? cuando(c.ultimaSync) : 'todavía no'}</p>
        </>
      ) : (
        <p className="mt-ayuda">Al conectar, tu panel (y tu agente a través de él) podrá leer tu bandeja de entrada y tu calendario, y mandar correos y eventos solo cuando tú los apruebes.</p>
      )}
      <div className="mt-botones">
        {c.conectada ? (
          <>
            <button type="button" className="mt-btn" disabled={Boolean(ocupado)} onClick={() => pedir(`/api/conexiones/${p}/sincronizar`)}>
              {ocupado === `/api/conexiones/${p}/sincronizar` ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
            <button type="button" className="mt-btn-ghost peligro" disabled={Boolean(ocupado)} onClick={() => pedir(`/api/conexiones/${p}/desconectar`)}>Desconectar</button>
          </>
        ) : (
          <button type="button" className="mt-btn" onClick={() => conectar(p, c)}>Conectar</button>
        )}
      </div>
      {!c.configurado && <p className="mt-ayuda">Falta configurar <code>{c.falta}</code> en las variables de entorno.</p>}
      <details className="mt-pasos">
        <summary>¿Cómo consigo las llaves?</summary>
        {pasos}
      </details>
    </Tarjeta>
  );

  const w = estado.whatsapp;
  return (
    <div className="mt-detalle">
      <p className="mt-titulo" style={{ padding: 0 }}>Tus cuentas</p>
      <p className="mt-meta" style={{ padding: 0, fontSize: 13 }}>Conecta tu correo, tu calendario y WhatsApp. Tu agente solo manda cosas con tu aprobación.</p>
      <div className="mt-tarjetas">
      {cuenta(
        'google',
        estado.google,
        <ol>
          <li>Entra a <code>console.cloud.google.com</code> con tu cuenta de Google y crea un proyecto (arriba a la izquierda: «Nuevo proyecto»).</li>
          <li>En el buscador de arriba escribe «Gmail API» y dale <strong>Habilitar</strong>. Haz lo mismo con «Google Calendar API».</li>
          <li>Menú «APIs y servicios» → «Pantalla de consentimiento de OAuth»: tipo <strong>Externo</strong>, pon un nombre y tu correo. En «Usuarios de prueba» agrega tu propio correo.</li>
          <li>«Credenciales» → «Crear credenciales» → «ID de cliente de OAuth» → tipo <strong>Aplicación web</strong>.</li>
          <li>En «URI de redirección autorizados» pega exactamente: <code>{origen}/api/conexiones/google/callback</code></li>
          <li>Copia el «ID de cliente» y el «Secreto del cliente» y ponlos en Vercel (Settings → Environment Variables) como <code>GOOGLE_CLIENT_ID</code> y <code>GOOGLE_CLIENT_SECRET</code>. Agrega también <code>APP_URL</code> con <code>{origen}</code>. Vuelve a desplegar.</li>
          <li>Regresa aquí y toca <strong>Conectar</strong>.</li>
        </ol>,
      )}
      {cuenta(
        'microsoft',
        estado.microsoft,
        <ol>
          <li>Entra a <code>portal.azure.com</code> con tu cuenta de Microsoft. Busca «App registrations» (Registros de aplicaciones) → «New registration».</li>
          <li>Nombre libre. En «Supported account types» elige la opción que incluya <strong>cuentas personales de Microsoft</strong> (la tercera: «Any Microsoft Entra ID tenant and personal Microsoft accounts»).</li>
          <li>En «Redirect URI» elige <strong>Web</strong> y pega: <code>{origen}/api/conexiones/microsoft/callback</code></li>
          <li>Ya creada, copia el «Application (client) ID»: es tu <code>MS_CLIENT_ID</code>.</li>
          <li>Menú «Certificates &amp; secrets» → «New client secret». Copia el <strong>Value</strong> (solo se muestra una vez): es tu <code>MS_CLIENT_SECRET</code>.</li>
          <li>Ponlos en Vercel (Settings → Environment Variables) junto con <code>APP_URL</code> = <code>{origen}</code>, vuelve a desplegar y toca <strong>Conectar</strong>.</li>
        </ol>,
      )}
      <Tarjeta titulo="WhatsApp" chip={<Chip on={w.configurado} texto={w.configurado ? 'Configurado' : 'Sin configurar'} />}>
        {w.configurado ? (
          <>
            <p>Número de WhatsApp Business: <strong>{w.numero ?? '(Meta no contestó; revisa WHATSAPP_TOKEN)'}</strong></p>
            <p className="mt-ayuda">
              Mensajes recibidos: {w.mensajesRecibidos}
              {w.ultimoMensaje && ` · último: ${cuando(w.ultimoMensaje)}`}
            </p>
          </>
        ) : (
          <p className="mt-ayuda">Falta configurar <code>{w.falta}</code> en las variables de entorno.</p>
        )}
        <p className="mt-ayuda">
          Tu WhatsApp personal (el de tu teléfono) no se puede conectar aquí: WhatsApp no lo permite. Lo que se conecta es un <strong>número de WhatsApp Business</strong> a través de Meta, que puede ser un número nuevo. Con él, el panel recibe
          los mensajes que le lleguen y tu agente puede contestar (siempre con tu aprobación). Tu agente también puede tener su propio conector de WhatsApp; si ya lo usa, este paso es opcional.
        </p>
        <details className="mt-pasos">
          <summary>¿Cómo consigo las llaves?</summary>
          <ol>
            <li>Entra a <code>developers.facebook.com</code>, crea una cuenta de desarrollador y una app de tipo <strong>Business</strong>. Agrégale el producto <strong>WhatsApp</strong>.</li>
            <li>En «WhatsApp → API Setup» verás un número de prueba (o agrega el tuyo de Business). Copia el <strong>Phone number ID</strong>: es tu <code>WHATSAPP_PHONE_ID</code>.</li>
            <li>Genera un token permanente: en «Business Settings → System users» crea un usuario de sistema, dale acceso a la app y genera un token con los permisos <code>whatsapp_business_messaging</code> y <code>whatsapp_business_management</code>. Es tu <code>WHATSAPP_TOKEN</code>.</li>
            <li>Inventa una palabra secreta cualquiera: es tu <code>WHATSAPP_VERIFY_TOKEN</code>.</li>
            <li>Pon las tres en Vercel (Settings → Environment Variables) y vuelve a desplegar.</li>
            <li>En «WhatsApp → Configuration → Webhook» pega la URL <code>{origen}/api/conexiones/whatsapp/webhook</code> y tu palabra secreta; dale «Verify and save» y suscríbete al campo <strong>messages</strong>.</li>
            <li>En modo de prueba solo puedes escribirte con números que agregues como «recipients» en API Setup. Para cualquier número, Meta te pide verificar tu negocio.</li>
          </ol>
        </details>
      </Tarjeta>
      </div>
    </div>
  );
}
