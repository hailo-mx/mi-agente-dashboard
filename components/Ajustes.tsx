'use client';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { COLORES, FONDOS, TEMAS, VOCES } from '@/lib/tema';
import { AGENTES_CON_VOZ, NOMBRE_AGENTE, type Agente, type Ajustes as TipoAjustes } from '@/lib/tipos';
import { Icono } from './comunes';

type Props = { ajustes: TipoAjustes; cambiar: (cambios: Partial<TipoAjustes>) => void };
type PropsCompletas = Props & { reemplazar: (ajustes: TipoAjustes) => void; avisar: (texto: string) => void };

const MAX_LOGO = 200 * 1024;
const MAX_IMAGEN = 2 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const OPCIONES_AGENTE: Agente[] = ['dots', 'grok', 'muse'];

/* Cómo suena cada voz en la vista previa del navegador (la de verdad la eliges en la app de tu agente). */
const TONO: Record<string, { pitch: number; rate: number }> = { Sol: { pitch: 1.1, rate: 1 }, Río: { pitch: 0.9, rate: 0.95 }, Ámbar: { pitch: 1.25, rate: 1.05 }, Cobalto: { pitch: 0.75, rate: 0.9 } };

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
      if (cual === 'icono') avisar(metodo === 'POST' ? 'Listo. Si ya tienes la app instalada, vuelve a instalarla para ver el ícono nuevo.' : 'El ícono volvió a ser la letra de tu app.');
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

/* Vista previa de la voz con la que trae el navegador (en español de México si la hay). */
function usarVozEspanol() {
  const voz = useRef<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const elegir = () => {
      const voces = speechSynthesis.getVoices();
      voz.current = voces.find((v) => /^es[-_]MX/i.test(v.lang)) ?? voces.find((v) => /^es[-_]?/i.test(v.lang)) ?? null;
    };
    elegir();
    speechSynthesis.addEventListener('voiceschanged', elegir);
    return () => speechSynthesis.removeEventListener('voiceschanged', elegir);
  }, []);
  return (nombre: string, texto: string) => {
    if (typeof speechSynthesis === 'undefined') return false;
    speechSynthesis.cancel();
    const frase = new SpeechSynthesisUtterance(texto);
    frase.lang = voz.current?.lang ?? 'es-MX';
    if (voz.current) frase.voice = voz.current;
    frase.pitch = TONO[nombre]?.pitch ?? 1;
    frase.rate = TONO[nombre]?.rate ?? 1;
    speechSynthesis.speak(frase);
    return true;
  };
}

/* Controles para cambiar el dashboard: tema, color, fondo, agente, voz, logo y sonido. Igual que en el demo. */
export function Personalizar({ ajustes, cambiar }: Props) {
  const [errorLogo, setErrorLogo] = useState('');
  const [sinVoz, setSinVoz] = useState(false);
  const hablar = usarVozEspanol();
  const agente = ajustes.agente ?? '';
  const conVoz = AGENTES_CON_VOZ.includes(agente);
  const subirLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) return setErrorLogo('Ese archivo no es una imagen. Elige un PNG, JPG o SVG.');
    if (archivo.size > MAX_LOGO) return setErrorLogo(`Tu logo pesa ${Math.round(archivo.size / 1024)} KB y el máximo es 200 KB. Prueba con una imagen más chica.`);
    const lector = new FileReader();
    lector.onload = () => {
      setErrorLogo('');
      cambiar({ logo: String(lector.result) });
    };
    lector.onerror = () => setErrorLogo('No se pudo leer la imagen. Prueba con otra.');
    lector.readAsDataURL(archivo);
  };
  const escuchar = () => {
    const voz = ajustes.voz ?? 'Sol';
    setSinVoz(!hablar(voz, `Hola${ajustes.tuNombre ? `, ${ajustes.tuNombre}` : ''}. Soy ${voz}, la voz de ${ajustes.nombreApp || 'tu agente'}.`));
  };
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
            <button type="button" key={a} onClick={() => cambiar({ agente: a })} className={`mt-chip ${agente === a ? 'on' : ''}`}>{NOMBRE_AGENTE[a]}</button>
          ))}
        </div>
        <p className="mt-ayuda">{conVoz ? `${NOMBRE_AGENTE[agente]} tiene llamadas de voz: el botón Llamar está en el panel de tu agente.` : agente === 'muse' ? 'Muse no tiene llamadas de voz.' : 'Elige dónde vive tu agente para ver sus llamadas de voz.'}</p>
      </div>
      {conVoz && (
        <div>
          <p className="mt-etiqueta">Voz de tu agente</p>
          <div className="mt-chips">
            {VOCES.map((v) => (
              <button type="button" key={v} onClick={() => cambiar({ voz: v })} className={`mt-chip ${(ajustes.voz ?? 'Sol') === v ? 'on' : ''}`}>{v}</button>
            ))}
            <button type="button" onClick={escuchar} className="mt-chip mt-escuchar"><Icono nombre="Escuchar" lado={12} />Escuchar</button>
          </div>
          <p className="mt-ayuda">Vista previa del navegador; la voz real la eliges en la app de tu agente.{sinVoz ? ' Este navegador no puede leer en voz alta.' : ''}</p>
        </div>
      )}
      <div>
        <p className="mt-etiqueta">Logo y sonido</p>
        <div className="mt-chips" style={{ alignItems: 'center' }}>
          {ajustes.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="mt-logo-muestra" src={ajustes.logo} alt="Tu logo" />
          )}
          <label className="mt-chip">
            {ajustes.logo ? 'Cambiar logo' : 'Subir tu logo'}
            <input type="file" accept="image/*" onChange={subirLogo} hidden />
          </label>
          {ajustes.logo && <button type="button" onClick={() => cambiar({ logo: undefined })} className="mt-chip">Quitar</button>}
          <button type="button" onClick={() => cambiar({ sonido: !ajustes.sonido })} className="mt-chip">
            Sonido: {ajustes.sonido ? 'encendido' : 'apagado'}
          </button>
        </div>
        {errorLogo && <p className="mt-error" role="alert" style={{ marginTop: 8 }}>{errorLogo}</p>}
      </div>
    </div>
  );
}

/* La sección completa: personalización, nombres, tu foto, el ícono de la app y la dirección para conectar al agente. */
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
      <p className="mt-meta" style={{ padding: 0, marginBottom: 24, fontSize: 13 }}>Color, fondo, agente, voz, logo y sonido. Los cambios se ven al instante y se guardan solos.</p>
      <Personalizar ajustes={ajustes} cambiar={cambiar} />

      <div className="mt-grupo">
        <label className="mt-etiqueta" htmlFor="nombre-app">Nombre de la app</label>
        <input id="nombre-app" className="mt-campo" value={ajustes.nombreApp} onChange={(e) => cambiar({ nombreApp: e.target.value })} placeholder="Mi Agente" maxLength={40} />
        <label className="mt-etiqueta" htmlFor="tu-nombre">Tu nombre</label>
        <input id="tu-nombre" className="mt-campo" value={ajustes.tuNombre} onChange={(e) => cambiar({ tuNombre: e.target.value })} placeholder="Como quieres que te salude" maxLength={40} />
      </div>

      <div className="mt-grupo mt-imagenes">
        <Imagen cual="foto" titulo="Tu foto" ayuda="Se ve arriba, junto a tu nombre. JPG, PNG o WebP de hasta 2 MB." valor={ajustes.foto} lado={256} tipo="image/jpeg" reemplazar={reemplazar} avisar={avisar} />
        <Imagen cual="icono" titulo="Ícono de tu app" ayuda="El ícono de la pestaña y de la app instalada en el teléfono. Si no subes uno, es la inicial del nombre." valor={ajustes.icono} lado={512} tipo="image/png" reemplazar={reemplazar} avisar={avisar} />
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
