'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import { FONDOS, type Ajustes as TipoAjustes, type Fondo } from '@/lib/tipos';
import { Interruptor } from './Secciones';

const COLORES = ['#2f6df6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
const NOMBRE_FONDO: Record<Fondo, string> = { calido: 'Cálido', noche: 'Noche', aurora: 'Aurora', grafito: 'Grafito' };
const MAX_LOGO = 200 * 1024;

export default function Ajustes({ ajustes, cambiar }: { ajustes: TipoAjustes; cambiar: (cambios: Partial<TipoAjustes>) => void }) {
  const [errorLogo, setErrorLogo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [copiada, setCopiada] = useState(false);
  useEffect(() => setDireccion(`${window.location.origin}/mcp`), []);

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
    <div className="cuerpo una ajustes">
      <section className="grupo">
        <label className="rotulo" htmlFor="nombre-app">Nombre de la app</label>
        <input id="nombre-app" className="campo" value={ajustes.nombreApp} onChange={(e) => cambiar({ nombreApp: e.target.value })} placeholder="Mi Agente" maxLength={40} />
        <label className="rotulo" htmlFor="tu-nombre">Tu nombre</label>
        <input id="tu-nombre" className="campo" value={ajustes.tuNombre} onChange={(e) => cambiar({ tuNombre: e.target.value })} placeholder="Como quieres que te salude" maxLength={40} />
      </section>

      <section className="grupo">
        <p className="rotulo">Color de acento</p>
        <div className="colores">
          {COLORES.map((c) => (
            <button key={c} type="button" className={`color ${ajustes.color.toLowerCase() === c ? 'on' : ''}`} style={{ background: c }} onClick={() => cambiar({ color: c })} aria-label={`Color ${c}`} />
          ))}
          <label className={`color propio ${COLORES.includes(ajustes.color.toLowerCase()) ? '' : 'on'}`} style={{ background: ajustes.color }} title="Elegir otro color">
            <input type="color" value={ajustes.color} onChange={(e) => cambiar({ color: e.target.value })} aria-label="Elegir otro color" />
            <span aria-hidden>+</span>
          </label>
        </div>

        <p className="rotulo">Fondo</p>
        <div className="fondos">
          {FONDOS.map((f) => (
            <button key={f} type="button" className={`fondo-muestra ${ajustes.fondo === f ? 'on' : ''}`} data-fondo={f} onClick={() => cambiar({ fondo: f })}>
              <span>{NOMBRE_FONDO[f]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grupo">
        <p className="rotulo">Logo</p>
        <div className="renglon">
          {ajustes.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="logo-muestra" src={ajustes.logo} alt="Tu logo" />
          )}
          <label className="boton">
            {ajustes.logo ? 'Cambiar logo' : 'Subir logo'}
            <input type="file" accept="image/*" onChange={subirLogo} hidden />
          </label>
          {ajustes.logo && <button type="button" className="boton" onClick={() => cambiar({ logo: undefined })}>Quitar</button>}
        </div>
        <p className="tenue chico">Una imagen cuadrada de hasta 200 KB.</p>
        {errorLogo && <p className="error" role="alert">{errorLogo}</p>}

        <div className="renglon separado">
          <div>
            <p className="rotulo sin-margen">Sonido</p>
            <p className="tenue chico">Un clic suave al tocar los botones.</p>
          </div>
          <Interruptor on={ajustes.sonido} onClick={() => cambiar({ sonido: !ajustes.sonido })} etiqueta="Sonido" />
        </div>
      </section>

      <section className="grupo">
        <p className="rotulo">Conecta tu agente</p>
        <p className="tenue chico">Dale esta dirección a tu agente como servidor MCP. Si tu panel tiene clave, dale también la clave (CLAVE_AGENTE).</p>
        <div className="renglon">
          <code className="direccion">{direccion}</code>
          <button type="button" className="boton" onClick={copiar}>{copiada ? 'Copiada' : 'Copiar'}</button>
        </div>
      </section>
    </div>
  );
}
