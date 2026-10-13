'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { COLOR_FONDO, type Ajustes as TipoAjustes, type Datos } from '@/lib/tipos';
import { sobreColor } from '@/lib/formato';
import { EN_MAS, Icono, PESTANAS, SECCIONES, clic, type Seccion, type Vista } from './comunes';
import { Aprobaciones, Correos, Inicio, Rutinas, Tareas } from './Secciones';
import Calendario from './Calendario';
import Ajustes from './Ajustes';
import Conexiones from './Conexiones';

type Todo = Datos & { sinNube: boolean };
export type Mandar = (ruta: string, metodo: 'POST' | 'PATCH', cuerpo: object) => Promise<boolean>;

const CADA = 5000; // cada cuánto se revisa si el agente escribió algo nuevo

export default function Panel({ ajustesIniciales, vistaInicial = 'Inicio' }: { ajustesIniciales: TipoAjustes; vistaInicial?: Vista }) {
  const [datos, setDatos] = useState<Todo | null>(null);
  const [ajustes, setAjustes] = useState(ajustesIniciales);
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [elegidos, setElegidos] = useState<Partial<Record<Seccion, string>>>({});
  // Solo importa en el teléfono: si se está viendo el detalle en lugar de la lista.
  const [abierto, setAbierto] = useState(false);
  const [falla, setFalla] = useState('');
  const [aviso, setAviso] = useState('');

  const etag = useRef('');
  const ajustesVivos = useRef(ajustesIniciales);
  const porGuardar = useRef(false);
  const reloj = useRef<ReturnType<typeof setTimeout>>();
  const relojAviso = useRef<ReturnType<typeof setTimeout>>();

  const avisar = useCallback((texto: string) => {
    setAviso(texto);
    clearTimeout(relojAviso.current);
    relojAviso.current = setTimeout(() => setAviso(''), 6000);
  }, []);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/datos', { cache: 'no-store', headers: etag.current ? { 'If-None-Match': etag.current } : {} });
      if (r.status === 401) return window.location.reload();
      setFalla('');
      if (r.status === 304) return; // nada nuevo
      const j = await r.json();
      if (!r.ok) return setFalla(j?.error ?? 'No se pudieron leer tus datos.');
      etag.current = r.headers.get('etag') ?? '';
      setDatos(j);
      // Mientras estás cambiando los ajustes, no se pisan con lo que llega del servidor.
      if (!porGuardar.current) {
        ajustesVivos.current = j.ajustes;
        setAjustes(j.ajustes);
      }
    } catch {
      setFalla('No hay conexión con tu panel. Reintentando…');
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(() => !document.hidden && cargar(), CADA);
    const alVolver = () => !document.hidden && cargar();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cargar]);

  const mandar: Mandar = useCallback(
    async (ruta, metodo, cuerpo) => {
      let bien = false;
      try {
        const r = await fetch(ruta, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
        bien = r.ok;
        if (!bien) avisar((await r.json().catch(() => null))?.error ?? 'No se pudo guardar. Inténtalo de nuevo.');
      } catch {
        avisar('No hay conexión con tu panel. Inténtalo de nuevo.');
      }
      await cargar();
      return bien;
    },
    [avisar, cargar],
  );

  // Los ajustes se ven al instante y se guardan medio segundo después del último cambio.
  const cambiarAjustes = useCallback(
    (cambios: Partial<TipoAjustes>) => {
      const nuevos = { ...ajustesVivos.current, ...cambios };
      ajustesVivos.current = nuevos;
      porGuardar.current = true;
      setAjustes(nuevos);
      clearTimeout(reloj.current);
      reloj.current = setTimeout(async () => {
        try {
          const r = await fetch('/api/ajustes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ajustesVivos.current) });
          if (!r.ok) avisar((await r.json().catch(() => null))?.error ?? 'No se pudieron guardar tus ajustes.');
        } catch {
          avisar('No hay conexión: tus ajustes no se guardaron.');
        }
        porGuardar.current = false;
      }, 500);
    },
    [avisar],
  );

  // El nombre y el color de la barra del navegador también cambian en vivo.
  useEffect(() => {
    document.title = ajustes.nombreApp || 'Mi Agente';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_FONDO[ajustes.fondo]);
  }, [ajustes.nombreApp, ajustes.fondo]);

  // Cada botón suena al picarle, salvo que el sonido esté apagado.
  const sonar = (e: MouseEvent) => {
    if (ajustes.sonido && (e.target as HTMLElement).closest('button, label')) clic();
  };

  const ir = (v: Vista) => {
    setVista(v);
    setAbierto(false);
  };
  const elegir = (seccion: Seccion, id: string) => {
    setElegidos((v) => ({ ...v, [seccion]: id }));
    setAbierto(true);
  };
  const atras = () => (abierto ? setAbierto(false) : setVista('Más'));

  const pendientes: Partial<Record<Vista, number>> = datos
    ? {
        Aprobaciones: datos.aprobaciones.filter((a) => a.estado === 'pendiente').length,
        Correos: datos.correos.filter((c) => c.necesitaRespuesta).length,
        Tareas: datos.tareas.filter((t) => !t.hecha).length,
      }
    : {};

  const enMas = vista !== 'Más' && EN_MAS.includes(vista);
  const hayAtras = abierto || enMas;
  const estilo = { '--acento': ajustes.color, '--sobre-acento': sobreColor(ajustes.color) } as CSSProperties;
  const comunes = { abierto, mandar };

  return (
    <div className="cuarto" data-fondo={ajustes.fondo} style={estilo} onClickCapture={sonar}>
      <nav className="riel" aria-label="Secciones">
        {ajustes.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="riel-logo" src={ajustes.logo} alt="" />
        )}
        {SECCIONES.map((s) => (
          <button key={s} type="button" title={s} aria-label={s} aria-current={vista === s ? 'page' : undefined} className={vista === s ? 'on' : ''} onClick={() => ir(s)}>
            <Icono nombre={s} />
            {(pendientes[s] ?? 0) > 0 && <b />}
          </button>
        ))}
      </nav>

      <main className="vidrio ventana">
        {datos?.sinNube && (
          <div className="banda alerta" role="alert">
            <strong>Tus datos todavía no se guardan.</strong> Este panel está publicado en internet sin base de datos en la nube: lo que anotes aquí puede borrarse en cualquier momento. Conecta Convex
            siguiendo los pasos del archivo LEEME.md.
          </div>
        )}
        {falla && <div className="banda alerta" role="alert">{falla}</div>}
        {aviso && <div className="banda" role="status">{aviso}</div>}

        <header className="cabecera">
          {hayAtras && (
            <button type="button" className="redondo solo-movil" onClick={atras} aria-label="Regresar">
              <Icono nombre="Atrás" />
            </button>
          )}
          {ajustes.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cabecera-logo solo-movil" src={ajustes.logo} alt="" />
          )}
          <h1>{vista === 'Inicio' ? ajustes.nombreApp || 'Mi Agente' : vista}</h1>
        </header>

        {!datos ? (
          <div className="cuerpo una">{!falla && <p className="vacio">Cargando tu panel…</p>}</div>
        ) : vista === 'Inicio' ? (
          <Inicio datos={datos} nombre={ajustes.tuNombre} mandar={mandar} ir={ir} />
        ) : vista === 'Aprobaciones' ? (
          <Aprobaciones aprobaciones={datos.aprobaciones} elegido={elegidos.Aprobaciones} elegir={(id) => elegir('Aprobaciones', id)} {...comunes} />
        ) : vista === 'Tareas' ? (
          <Tareas tareas={datos.tareas} elegido={elegidos.Tareas} elegir={(id) => elegir('Tareas', id)} {...comunes} />
        ) : vista === 'Rutinas' ? (
          <Rutinas rutinas={datos.rutinas} elegido={elegidos.Rutinas} elegir={(id) => elegir('Rutinas', id)} {...comunes} />
        ) : vista === 'Correos' ? (
          <Correos correos={datos.correos} elegido={elegidos.Correos} elegir={(id) => elegir('Correos', id)} abierto={abierto} />
        ) : vista === 'Calendario' ? (
          <Calendario eventos={datos.eventos} />
        ) : vista === 'Conexiones' ? (
          <Conexiones avisar={avisar} />
        ) : vista === 'Ajustes' ? (
          <Ajustes ajustes={ajustes} cambiar={cambiarAjustes} />
        ) : (
          <div className="cuerpo una">
            {EN_MAS.map((s) => (
              <button key={s} type="button" className="fila" onClick={() => ir(s)}>
                <span className="inicial"><Icono nombre={s} lado={18} /></span>
                <span className="fila-texto"><span className="fila-titulo">{s}</span></span>
                <span className="tenue"><Icono nombre="Adelante" lado={16} /></span>
              </button>
            ))}
          </div>
        )}

        <nav className="pestanas" aria-label="Secciones">
          {PESTANAS.map((p) => {
            const activa = p === vista || (p === 'Más' && enMas);
            return (
              <button key={p} type="button" className={activa ? 'on' : ''} aria-current={activa ? 'page' : undefined} onClick={() => ir(p)}>
                <Icono nombre={p} lado={22} />
                <span>{p}</span>
                {(pendientes[p] ?? 0) > 0 && <b />}
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
