'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import { COLORES, FONDOS, TEMAS, VOCES } from '@/lib/tema';
import type { Ajustes as TipoAjustes } from '@/lib/tipos';

type Props = { ajustes: TipoAjustes; cambiar: (cambios: Partial<TipoAjustes>) => void };

const MAX_LOGO = 200 * 1024;

/* Controles para cambiar el dashboard: tema, color, fondo, voz, logo y sonido. Igual que en el demo. */
export function Personalizar({ ajustes, cambiar }: Props) {
  const [errorLogo, setErrorLogo] = useState('');
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
        <p className="mt-etiqueta">Voz de tu agente</p>
        <div className="mt-chips">
          {VOCES.map((v) => (
            <button type="button" key={v} onClick={() => cambiar({ voz: v })} className={`mt-chip ${(ajustes.voz ?? 'Sol') === v ? 'on' : ''}`}>{v}</button>
          ))}
        </div>
      </div>
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

/* La sección completa: personalización, nombres y la dirección para conectar al agente. */
export default function Ajustes({ ajustes, cambiar }: Props) {
  const [direccion, setDireccion] = useState('');
  const [copiada, setCopiada] = useState(false);
  useEffect(() => setDireccion(`${window.location.origin}/mcp`), []);
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
      <p className="mt-meta" style={{ padding: 0, marginBottom: 24, fontSize: 13 }}>Color, fondo, logo y sonido. Los cambios se ven al instante y se guardan solos.</p>
      <Personalizar ajustes={ajustes} cambiar={cambiar} />

      <div className="mt-grupo">
        <label className="mt-etiqueta" htmlFor="nombre-app">Nombre de la app</label>
        <input id="nombre-app" className="mt-campo" value={ajustes.nombreApp} onChange={(e) => cambiar({ nombreApp: e.target.value })} placeholder="Mi Agente" maxLength={40} />
        <label className="mt-etiqueta" htmlFor="tu-nombre">Tu nombre</label>
        <input id="tu-nombre" className="mt-campo" value={ajustes.tuNombre} onChange={(e) => cambiar({ tuNombre: e.target.value })} placeholder="Como quieres que te salude" maxLength={40} />
      </div>

      <div className="mt-grupo">
        <p className="mt-etiqueta">Conecta tu agente</p>
        <p className="mt-ayuda">Dale esta dirección a tu agente como servidor MCP. Si tu panel tiene clave, dale también la clave (CLAVE_AGENTE).</p>
        <div className="mt-botones">
          <code className="mt-direccion">{direccion}</code>
          <button type="button" className="mt-btn-ghost" onClick={copiar}>{copiada ? 'Copiada' : 'Copiar'}</button>
        </div>
      </div>
    </div>
  );
}
