'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import { COLORES, FONDOS, TEMAS } from '@/lib/tema';
import { APP_AGENTE, AGENTES_CON_VOZ, NOMBRE_AGENTE, VOCES_AGENTE, type Agente, type Ajustes as TipoAjustes } from '@/lib/tipos';

type Props = { ajustes: TipoAjustes; cambiar: (cambios: Partial<TipoAjustes>) => void };
type PropsCompletas = Props & { reemplazar: (ajustes: TipoAjustes) => void; avisar: (texto: string) => void };

const MAX_IMAGEN = 2 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const OPCIONES_AGENTE: Agente[] = ['dots', 'grok', 'muse'];

/** Achica la imagen en el navegador (cuadrada, recortada al centro) para que pese poco. */
async function achicar(archivo: File, lado: number, tipo: 'image/jpeg' | 'image/png'): Promise<Blob> {
  const mapa = await createImageBitmap(archivo);
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const corte = Math.min(mapa.width, mapa.height);
  lienzo.getContext('2d')!.drawImage(mapa, (mapa.width - corte) / 2, (mapa.height - corte) / 2, corte, corte, 0, 0, lado, lado);
  mapa.close();
  return new Promise((listo, falla) => lienzo.toBlob((b) => (b ? listo(b) : falla(new Error('No se pudo procesar la imagen.'))), tipo, 0.88));
}

/* Subir o quitar tu foto o el ícono de la app. Van por /api/foto y /api/icono, no por los ajustes. */
function Imagen({ cual, titulo, ayuda, valor, lado, tipo, reemplazar, avisar }: { cual: 'foto' | 'icono'; titulo: string; ayuda: string; valor?: string; lado: number; tipo: 'image/jpeg' | 'image/png'; reemplazar: (a: TipoAjustes) => void; avisar: (t: string) => void }) {
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const mandar = async (metodo: 'POST' | 'DELETE', cuerpo?: Blob) => {
    setOcupado(true);
    try {
      const r = await fetch(`/api/${cual}`, { method: metodo, headers: cuerpo ? { 'Content-Type': cuerpo.type } : {}, body: cuerpo });
      const j = await r.json().catch(() => null);
      if (!r.ok) return setError(j?.error ?? 'No se pudo guardar. Inténtalo de nuevo.');
      setError('');
      reemplazar(j);
      if (cual === 'icono') avisar(metodo === 'POST' ? 'Listo: tu logo ya es el ícono de la app. Si ya la tienes instalada, vuelve a instalarla para verlo.' : 'El ícono volvió a ser la letra de tu app.');
    } catch {
      setError('No hay conexión con tu panel. Inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  };
  const subir = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!TIPOS_IMAGEN.includes(archivo.type)) return setError('Elige una imagen JPG, PNG o WebP.');
    if (archivo.size > MAX_IMAGEN) return setError(`La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo es 2 MB. Prueba con una más chica.`);
    try {
      await mandar('POST', await achicar(archivo, lado, tipo));
    } catch {
      setError('No se pudo leer la imagen. Prueba con otra.');
    }
  };
  return (
    <div>
      <p className="mt-etiqueta">{titulo}</p>
      <div className="mt-chips" style={{ alignItems: 'center', marginTop: 12 }}>
        {valor ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={cual === 'foto' ? 'mt-logo-muestra' : 'mt-icono-muestra'} src={valor} alt={titulo} />
        ) : (
          <span className={`mt-inicial ${cual === 'foto' ? 'mt-logo-muestra' : 'mt-icono-muestra'}`} aria-hidden>?</span>
        )}
        <label className="mt-chip" aria-disabled={ocupado}>
          {ocupado ? 'Guardando…' : valor ? 'Cambiar' : 'Subir imagen'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={subir} disabled={ocupado} hidden />
        </label>
        {valor && <button type="button" onClick={() => mandar('DELETE')} disabled={ocupado} className="mt-chip">Quitar</button>}
      </div>
      <p className="mt-ayuda">{ayuda}</p>
      {error && <p className="mt-error" role="alert" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}

/* Controles para cambiar el dashboard: tema, color, fondo, agente, voz y sonido. Igual que en el demo. */
export function Personalizar({ ajustes, cambiar }: Props) {
  const agente = ajustes.agente ?? '';
  const nombre = NOMBRE_AGENTE[agente];
  const voces = VOCES_AGENTE[agente];
  const conVoz = AGENTES_CON_VOZ.includes(agente);
  return (
    <div className="mt-personalizar">
      <div>
        <p className="mt-etiqueta">Tema</p>
        <div className="mt-chips">
          {TEMAS.map((t) => (
            <button type="button" key={t.nombre} onClick={() => cambiar({ color: t.color, fondo: t.fondo })} className="mt-chip" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i style={{ width: 10, height: 10, borderRadius: 999, background: t.color }} />
              {t.nombre}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mt-etiqueta">Color</p>
        <div className="mt-colores">
          {COLORES.map((c) => (
            <button type="button" key={c} aria-label={`Color ${c}`} onClick={() => cambiar({ color: c })} className={`mt-color ${ajustes.color.toLowerCase() === c ? 'on' : ''}`} style={{ background: c }} />
          ))}
        </div>
      </div>
      <div>
        <p className="mt-etiqueta">Fondo</p>
        <div className="mt-fondos">
          {FONDOS.map((f) => (
            <button type="button" key={f.id} aria-label={`Fondo ${f.nombre}`} title={f.nombre} onClick={() => cambiar({ fondo: f.id })} data-fondo={f.id} className={`mt-fondo-muestra ${ajustes.fondo === f.id ? 'on' : ''}`} />
          ))}
        </div>
      </div>
      <div>
        <p className="mt-etiqueta">Tu agente</p>
        <div className="mt-chips">
          {OPCIONES_AGENTE.map((a) => (
            // Al cambiar de agente se olvida la voz: cada uno tiene las suyas.
            <button type="button" key={a} onClick={() => cambiar({ agente: a, voz: undefined })} className={`mt-chip ${agente === a ? 'on' : ''}`}>{NOMBRE_AGENTE[a]}</button>
          ))}
        </div>
        <p className="mt-ayuda">
          {conVoz
            ? `${nombre} tiene llamadas de voz: el botón Llamar está en el panel de tu agente.`
            : agente
              ? `${nombre} no tiene llamadas de voz.`
              : 'Elige dónde vive tu agente. También lo puede guardar él mismo (lección 6.3, con guardar_ajustes).'}
        </p>
      </div>
      {conVoz && (
        <div>
          <p className="mt-etiqueta">Voz de {nombre}</p>
          <div className="mt-chips">
            {voces.map((v) => (
              <button type="button" key={v} onClick={() => cambiar({ voz: v })} className={`mt-chip ${ajustes.voz === v ? 'on' : ''}`} aria-pressed={ajustes.voz === v}>{v}</button>
            ))}
          </div>
          <p className="mt-ayuda">La voz se escucha en la app de tu agente; aquí solo eliges cuál quieres que use.</p>
          <a className="mt-chip mt-abrir" href={APP_AGENTE[agente].voz ?? APP_AGENTE[agente].url} target="_blank" rel="noopener noreferrer">Abrir ajustes de voz de {nombre} ↗</a>
        </div>
      )}
      <div>
        <p className="mt-etiqueta">Sonido</p>
        <div className="mt-chips">
          <button type="button" onClick={() => cambiar({ sonido: !ajustes.sonido })} className="mt-chip" aria-pressed={ajustes.sonido}>
            Sonido: {ajustes.sonido ? 'encendido' : 'apagado'}
          </button>
        </div>
        <p className="mt-ayuda">Un clic corto al tocar cualquier botón.</p>
      </div>
    </div>
  );
}

/* La sección completa: personalización, nombres, tu foto, tu logo (que es el ícono de la app) y la dirección para conectar al agente. */
export default function Ajustes({ ajustes, cambiar, reemplazar, avisar }: PropsCompletas) {
  const [origen, setOrigen] = useState('');
  const [copiada, setCopiada] = useState(false);
  useEffect(() => setOrigen(window.location.origin), []);
  const direccion = `${origen}/mcp`;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(direccion);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2000);
    } catch {
      /* sin permiso para copiar: la dirección está a la vista */
    }
  };
  return (
    <div className="mt-detalle">
      <p className="mt-titulo" style={{ padding: 0 }}>Hazlo tuyo</p>
      <p className="mt-meta" style={{ padding: 0, marginBottom: 24, fontSize: 13 }}>Color, fondo, agente, voz y sonido. Los cambios se ven al instante y se guardan solos.</p>
      <Personalizar ajustes={ajustes} cambiar={cambiar} />

      <div className="mt-grupo">
        <label className="mt-etiqueta" htmlFor="nombre-app">Nombre de la app</label>
        <input id="nombre-app" className="mt-campo" value={ajustes.nombreApp} onChange={(e) => cambiar({ nombreApp: e.target.value })} placeholder="Mi Agente" maxLength={40} />
        <label className="mt-etiqueta" htmlFor="tu-nombre">Tu nombre</label>
        <input id="tu-nombre" className="mt-campo" value={ajustes.tuNombre} onChange={(e) => cambiar({ tuNombre: e.target.value })} placeholder="Como quieres que te salude" maxLength={40} />
      </div>

      <div className="mt-grupo mt-imagenes">
        <Imagen cual="foto" titulo="Tu foto" ayuda="Se ve arriba, junto a tu nombre. JPG, PNG o WebP de hasta 2 MB." valor={ajustes.foto} lado={256} tipo="image/jpeg" reemplazar={reemplazar} avisar={avisar} />
        <Imagen cual="icono" titulo="Tu logo / ícono de la app" ayuda="Una sola imagen para todo: se ve arriba junto a tu nombre (si no tienes foto), en la pestaña del navegador y como ícono de la app instalada. Si la quitas, vuelve la inicial del nombre." valor={ajustes.icono} lado={512} tipo="image/png" reemplazar={reemplazar} avisar={avisar} />
      </div>

      <div className="mt-grupo">
        <p className="mt-etiqueta">Conecta tu agente</p>
        <p className="mt-ayuda">Dale esta dirección a tu agente como servidor MCP, con la clave del panel (CLAVE_AGENTE) como encabezado Authorization: Bearer.</p>
        <div className="mt-botones">
          <code className="mt-direccion">{direccion}</code>
          <button type="button" className="mt-btn-ghost" onClick={copiar}>{copiada ? 'Copiada' : 'Copiar'}</button>
        </div>
        <p className="mt-ayuda">Si tu agente no te deja poner la clave (los plugins personales de ChatGPT, por ejemplo), usa <code>{origen}/mcp/TU-CLAVE</code> y elige «sin autenticación»: la clave va en la dirección.</p>
      </div>
    </div>
  );
}
