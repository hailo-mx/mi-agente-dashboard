'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { TEMAS } from '@/lib/tema';
import { COLOR_FONDO, type Ajustes as TipoAjustes, type Datos } from '@/lib/tipos';
import { cuando, saludo } from '@/lib/formato';
import { Avatar, EN_MAS, Fila, Icono, NAV, PESTANAS, Vacio, clic, type Seccion, type Vista } from './comunes';
import {
  Agente, Calendario, Chat, Correo, DetalleAprobacion, DetalleRutina, DIA_TEXTO, Redactar, Tareas, conversaciones, diasDe, direccionDe, horaTexto, lunesDe, nombreDe, respuestasA, type Envio, type Mandar,
} from './Vistas';
import Ajustes from './Ajustes';
import Conexiones from './Conexiones';

type Todo = Datos & { sinNube: boolean };
export type { Mandar };

const CADA = 5000; // cada cuánto se revisa si el agente escribió algo nuevo

/* El panel: riel de íconos, lista, detalle y tu agente. En el teléfono, una app con pestañas abajo. */
export default function Panel({ ajustesIniciales, vistaInicial = 'Inicio' }: { ajustesIniciales: TipoAjustes; vistaInicial?: Vista }) {
  const [datos, setDatos] = useState<Todo | null>(null);
  const [ajustes, setAjustes] = useState(ajustesIniciales);
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [sel, setSel] = useState<Partial<Record<Vista, string>>>({});
  const [filtro, setFiltro] = useState<'Pendientes' | 'Hechas'>('Pendientes');
  const [semana, setSemana] = useState(0);
  // Solo en celular: si hay un detalle abierto y si se está viendo al agente.
  const [abierto, setAbierto] = useState(false);
  const [chatMovil, setChatMovil] = useState(false);
  const [redactando, setRedactando] = useState(false);
  const [correoA, setCorreoA] = useState('');
  const [envios, setEnvios] = useState<Record<string, Envio>>({});
  const [ocupado, setOcupado] = useState(false);
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
      let respuesta: Record<string, unknown> | null = null;
      try {
        const r = await fetch(ruta, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo ?? {}) });
        const j = await r.json().catch(() => null);
        if (r.ok) respuesta = j ?? {};
        else avisar(j?.error ?? 'No se pudo guardar. Inténtalo de nuevo.');
      } catch {
        avisar('No hay conexión con tu panel. Inténtalo de nuevo.');
      }
      await cargar();
      return respuesta;
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

  const ir = (v: Vista) => { setVista(v); setAbierto(false); setChatMovil(false); setRedactando(false); };
  const elegir = (id: string) => { setSel((s) => ({ ...s, [vista]: id })); setAbierto(true); setRedactando(false); };

  /** Responder desde la pantalla: queda aprobado y, si hay cuenta conectada, se manda. */
  const enviar = async (clave: string, cuerpo: object) => {
    setOcupado(true);
    const r = await mandar('/api/enviar', 'POST', cuerpo);
    if (r) setEnvios((v) => ({ ...v, [clave]: { enviado: Boolean(r.enviado) } }));
    setOcupado(false);
    return Boolean(r);
  };

  const d = datos;
  const pendientes = d ? d.aprobaciones.filter((a) => a.estado === 'pendiente').sort((a, b) => b.creada.localeCompare(a.creada)) : [];
  const chats = d ? conversaciones(d.whatsapp, d.aprobaciones) : [];
  const badges: Partial<Record<string, number>> = d
    ? {
        Correos: d.correos.filter((c) => c.necesitaRespuesta).length,
        WhatsApp: chats.filter((c) => !c.respondida).length,
        Tareas: d.tareas.filter((t) => !t.hecha).length,
        Aprobaciones: pendientes.length,
      }
    : {};
  const resolver = (id: string, estado: 'aprobada' | 'rechazada') => mandar(`/api/aprobaciones/${id}`, 'PATCH', { estado });
  const botones = (id: string) => (
    <>
      <button type="button" className="mt-btn chico" onClick={() => resolver(id, 'aprobada')}>Aprobar</button>
      <button type="button" className="mt-x" aria-label="Rechazar" title="Rechazar" onClick={() => resolver(id, 'rechazada')}>✕</button>
    </>
  );
  const atajo = (v: Seccion) => (
    <button type="button" key={v} onClick={() => ir(v)} className="mt-item">
      <span><Icono nombre={v} />{v}</span>
      {(badges[v] ?? 0) > 0 && <span className="mt-badge">{badges[v]}</span>}
    </button>
  );

  // Cada vista: a la izquierda su lista, al centro el detalle.
  let lista: ReactNode = null;
  let centro: ReactNode = null;
  if (!d) {
    centro = !falla && <Vacio>Cargando tu panel…</Vacio>;
  } else if (vista === 'Inicio') {
    lista = (['Aprobaciones', 'Correos', 'WhatsApp', 'Tareas', 'Calendario', 'Rutinas'] as Seccion[]).map(atajo);
    const actividad = [...d.actividad].sort((a, b) => b.cuando.localeCompare(a.cuando)).slice(0, 4);
    const kpis = [
      { k: 'Correos ordenados', v: d.correos.length },
      { k: 'Tareas abiertas', v: d.tareas.filter((t) => !t.hecha).length },
      { k: 'Rutinas activas', v: d.rutinas.filter((r) => r.activa).length },
    ];
    centro = (
      <>
        <p className="mt-saludo">{saludo(ajustes.tuNombre)}</p>
        {pendientes.length > 0 && (
          <div className="mt-bloque">
            <p className="mt-rotulo">Tu agente necesita tu aprobación · {pendientes.length}</p>
            <div className="mt-aprobaciones">
              {pendientes.map((a) => (
                <div key={a.id} className="mt-aprobar">
                  <div className="mt-aprobar-texto">
                    <p>{a.titulo}</p>
                    <p>{a.detalle}</p>
                  </div>
                  {botones(a.id)}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-kpis">
          {kpis.map((k) => (
            <div key={k.k} className="mt-kpi">
              <p className="v2-cifra">{k.v}</p>
              <p>{k.k}</p>
            </div>
          ))}
        </div>
        <div className="mt-bloque chico">
          {actividad.length === 0 ? (
            <Vacio>Tu agente todavía no ha anotado nada. Conéctalo con la dirección que está en Ajustes.</Vacio>
          ) : (
            actividad.map((a, k) => (
              <div key={a.id} className="mt-fila" title={cuando(a.cuando)}>
                <Avatar lado={32} />
                <span className="mt-fila-texto mt-fila-actividad">{a.texto}</span>
                {k === 0 && <span className="mt-punto" />}
              </div>
            ))
          )}
        </div>
      </>
    );
  } else if (vista === 'Calendario') {
    const dias = diasDe(lunesDe(semana));
    const desde = dias[0].getTime();
    const hasta = new Date(dias[6].getFullYear(), dias[6].getMonth(), dias[6].getDate() + 1).getTime();
    const deLaSemana = d.eventos.filter((e) => { const t = new Date(e.inicio).getTime(); return t >= desde && t < hasta; }).sort((a, b) => a.inicio.localeCompare(b.inicio));
    lista = deLaSemana.length === 0 ? (
      <Vacio>{d.eventos.length ? 'Nada esta semana.' : 'Tu agente todavía no ha anotado nada. Conecta tu calendario en Conexiones o deja que tu agente lo guarde.'}</Vacio>
    ) : (
      deLaSemana.map((e) => {
        const ini = new Date(e.inicio);
        return (
          <div key={e.id} className="mt-fila">
            <span className="mt-barra" />
            <span className="mt-fila-texto">
              <span className="mt-fila-a" style={{ fontSize: 14 }}>{e.titulo}</span>
              <span className="mt-fila-b">{DIA_TEXTO[(ini.getDay() + 6) % 7]} · {horaTexto(ini)}</span>
            </span>
          </div>
        );
      })
    );
    centro = <Calendario eventos={d.eventos} semana={semana} setSemana={setSemana} />;
  } else if (vista === 'Correos') {
    const correos = [...d.correos].sort((a, b) => b.recibido.localeCompare(a.recibido));
    const actual = correos.find((c) => c.id === sel.Correos) ?? correos[0];
    lista = (
      <>
        <button type="button" className="mt-ancho" onClick={() => { setRedactando(true); setCorreoA(''); setAbierto(true); }}>Redactar</button>
        {correos.length === 0 ? (
          <Vacio>Conecta tu correo en Conexiones o deja que tu agente lo guarde aquí.</Vacio>
        ) : (
          correos.map((c) => (
            <Fila key={c.id} a={nombreDe(c.de)} b={c.asunto} on={!redactando && c.id === actual?.id} punto={c.necesitaRespuesta && !envios[c.id]} onClick={() => elegir(c.id)} c={<span className="mt-fila-h">{cuando(c.recibido)}</span>} />
          ))
        )}
      </>
    );
    centro = redactando ? (
      correoA ? (
        <p className="v2-enter mt-nota mt-ok" style={{ fontSize: 15, paddingTop: 24 }}>✓ {envios.redactar?.enviado ? `Correo enviado a ${correoA}` : `Aprobado · tu agente le escribe a ${correoA}`}</p>
      ) : (
        <Redactar
          ocupado={ocupado}
          onEnviar={async (para, asunto, cuerpo) => {
            if (await enviar('redactar', { canal: 'Correo', para, asunto: asunto || 'Sin asunto', texto: cuerpo, titulo: `Correo a ${para}`, detalle: `Asunto: ${asunto || 'Sin asunto'}` })) setCorreoA(para);
          }}
        />
      )
    ) : actual ? (
      <Correo
        key={actual.id}
        c={actual}
        resultado={envios[actual.id] ?? null}
        ocupado={ocupado}
        onEnviar={(texto) => enviar(actual.id, { canal: 'Correo', para: direccionDe(actual.de), asunto: `Re: ${actual.asunto}`, texto, titulo: `Responder a ${nombreDe(actual.de)}`, detalle: `Re: ${actual.asunto}` })}
      />
    ) : (
      <Vacio>Cuando tu agente revise tu correo, aquí verás cada mensaje y la respuesta que te prepare.</Vacio>
    );
  } else if (vista === 'WhatsApp') {
    const actual = chats.find((c) => c.de === sel.WhatsApp) ?? chats[0];
    lista = chats.length === 0 ? (
      <Vacio>Conecta WhatsApp en Conexiones: los mensajes que lleguen a tu número de WhatsApp Business aparecen aquí.</Vacio>
    ) : (
      chats.map((c) => {
        const ultimo = c.mensajes[c.mensajes.length - 1];
        return <Fila key={c.de} a={c.nombre} b={ultimo.texto} on={c.de === actual?.de} punto={!c.respondida} onClick={() => elegir(c.de)} c={<span className="mt-fila-h">{cuando(c.ultimo)}</span>} />;
      })
    );
    centro = actual ? (
      <Chat
        key={actual.de}
        c={actual}
        enviadas={respuestasA(d.aprobaciones, actual.de)}
        ocupado={ocupado}
        onEnviar={(texto) => enviar(actual.de, { canal: 'WhatsApp', para: actual.de, texto, titulo: `Responder a ${actual.nombre}`, detalle: `WhatsApp a ${actual.nombre} (+${actual.de})` })}
      />
    ) : (
      <Vacio>Aquí verás cada conversación y podrás contestar; tu respuesta sale con tu aprobación.</Vacio>
    );
  } else if (vista === 'Tareas') {
    const grupos = { Pendientes: d.tareas.filter((t) => !t.hecha).length, Hechas: d.tareas.filter((t) => t.hecha).length };
    lista = (Object.keys(grupos) as (keyof typeof grupos)[]).map((g) => (
      <button type="button" key={g} onClick={() => setFiltro(g)} className={`mt-item ${filtro === g ? 'on' : ''}`}>
        <span>{g}</span>
        <span className="mt-badge">{grupos[g]}</span>
      </button>
    ));
    centro = <Tareas tareas={d.tareas} filtro={filtro} mandar={mandar} />;
  } else if (vista === 'Rutinas') {
    const actual = d.rutinas.find((r) => r.id === sel.Rutinas) ?? d.rutinas[0];
    lista = d.rutinas.length === 0 ? (
      <Vacio>Tu agente todavía no tiene rutinas. Pídele, por ejemplo: «Cada mañana a las 7 mándame mi resumen del día».</Vacio>
    ) : (
      d.rutinas.map((r) => <Fila key={r.id} a={r.titulo} b={r.horario} on={r.id === actual?.id} punto={r.activa} onClick={() => elegir(r.id)} />)
    );
    centro = actual ? <DetalleRutina r={actual} mandar={mandar} /> : <Vacio>Aquí verás qué hace cada rutina y podrás pausarla.</Vacio>;
  } else if (vista === 'Aprobaciones') {
    const todas = [...pendientes, ...d.aprobaciones.filter((a) => a.estado !== 'pendiente').sort((a, b) => b.creada.localeCompare(a.creada))];
    const actual = todas.find((a) => a.id === sel.Aprobaciones) ?? todas[0];
    const ETIQUETA = { pendiente: '', aprobada: 'Aprobada', rechazada: 'Rechazada', hecha: 'Hecha' };
    lista = todas.length === 0 ? (
      <Vacio>Cuando tu agente quiera mandar algo en tu nombre, te lo pregunta aquí primero.</Vacio>
    ) : (
      todas.map((a) => (
        <Fila key={a.id} a={a.titulo} b={a.canal} on={a.id === actual?.id} punto={a.estado === 'pendiente'} onClick={() => elegir(a.id)} c={a.estado !== 'pendiente' ? <span className={`mt-chip-estado ${a.estado === 'rechazada' ? 'no' : 'ok'}`}>{ETIQUETA[a.estado]}</span> : undefined} />
      ))
    );
    centro = actual ? <DetalleAprobacion key={actual.id} a={actual} mandar={mandar} /> : <Vacio>Nada por aprobar. Lo que te pida tu agente lo verás aquí con su texto exacto.</Vacio>;
  } else if (vista === 'Conexiones') {
    centro = <Conexiones avisar={avisar} />;
  } else if (vista === 'Ajustes') {
    lista = TEMAS.map((t) => (
      <button type="button" key={t.nombre} onClick={() => cambiarAjustes({ color: t.color, fondo: t.fondo })} className={`mt-item ${ajustes.color === t.color && ajustes.fondo === t.fondo ? 'on' : ''}`}>
        <span><i style={{ background: t.color }} />{t.nombre}</span>
      </button>
    ));
    centro = <Ajustes ajustes={ajustes} cambiar={cambiarAjustes} />;
  } else {
    lista = EN_MAS.map(atajo);
  }

  // En celular es una app: una pantalla a la vez y las pestañas abajo.
  const modo = ({ Inicio: 'centro', Calendario: 'centro', Ajustes: 'centro', Conexiones: 'centro', Tareas: 'ambos', Más: 'maestro' } as Record<string, string>)[vista] ?? 'maestro';
  const verLista = !chatMovil && (modo === 'ambos' || (modo === 'maestro' && !abierto));
  const verCentro = !chatMovil && (modo !== 'maestro' || abierto);
  const pestana = chatMovil ? 'Agente' : ['Inicio', 'Correos', 'WhatsApp'].includes(vista) ? vista : 'Más';
  const sonido = (
    <button type="button" className="mt-sonido" aria-label={ajustes.sonido ? 'Apagar sonido' : 'Encender sonido'} title={ajustes.sonido ? 'Apagar sonido' : 'Encender sonido'} onClick={() => cambiarAjustes({ sonido: !ajustes.sonido })}>
      <Icono nombre={ajustes.sonido ? 'SonidoOn' : 'SonidoOff'} />
    </button>
  );
  const quien = (
    <span className="mt-quien-nombre">
      {ajustes.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ajustes.logo} alt="Tu logo" />
      ) : (
        <span className="mt-inicial" aria-hidden>{((ajustes.tuNombre || ajustes.nombreApp).trim()[0] ?? 'M').toUpperCase()}</span>
      )}
      <span>{ajustes.tuNombre || ajustes.nombreApp}</span>
    </span>
  );
  const bandas = (d?.sinNube || falla || aviso) && (
    <div className="mt-bandas">
      {d?.sinNube && (
        <div className="mt-banda alerta" role="alert">
          <strong>Tus datos todavía no se guardan.</strong> Este panel está publicado en internet sin base de datos en la nube: lo que anotes aquí puede borrarse en cualquier momento. Agrega un store de Vercel Blob (o Convex) siguiendo los pasos del archivo LEEME.md.
        </div>
      )}
      {falla && <div className="mt-banda alerta" role="alert">{falla}</div>}
      {aviso && <div className="mt-banda" role="status">{aviso}</div>}
    </div>
  );

  return (
    <div onClickCapture={sonar} data-fondo={ajustes.fondo} style={{ ['--azul' as string]: ajustes.color } as CSSProperties} className="mt-cuarto">
      <div className="mt-marco">
        {/* escritorio: el riel es la única navegación */}
        <nav className="mt-riel" aria-label="Secciones">
          {NAV.map((v) => (
            <button type="button" key={v} aria-label={v} title={v} aria-current={vista === v ? 'page' : undefined} onClick={() => ir(v)} className={vista === v ? 'on' : ''}>
              <Icono nombre={v} />
              {(badges[v] ?? 0) > 0 && <b />}
            </button>
          ))}
        </nav>

        <div className="mt-vidrio mt-app">
          {/* celular: barra de arriba */}
          <div className="mt-barra-arriba">
            {quien}
            {sonido}
          </div>
          {bandas}

          <div className="mt-app-cuerpo">
            {/* la lista de la sección */}
            <div className={`mt-panel-izq ${verLista ? '' : 'oculto-movil'}`}>
              <div className="mt-quien">
                {quien}
                {sonido}
              </div>
              <p className="mt-seccion">{vista}</p>
              <div className="mt-lista">{lista}</div>
            </div>

            {/* el detalle */}
            <div className={`mt-centro ${verCentro ? '' : 'oculto-movil'}`}>
              {modo === 'maestro' && abierto && (
                <button type="button" className="mt-atras" onClick={() => { setAbierto(false); setRedactando(false); }}>← {vista}</button>
              )}
              <div key={vista} className="v2-enter mt-centro-adentro">{centro}</div>
            </div>

            {/* tu agente */}
            <div className={`mt-chat ${chatMovil ? '' : 'oculto-movil'}`}>
              <Agente actividad={d?.actividad ?? []} nombre={ajustes.tuNombre} ir={() => ir('Ajustes')} />
            </div>
          </div>

          {/* celular: pestañas abajo, como en cualquier app */}
          <nav className="mt-tabs" aria-label="Secciones">
            {PESTANAS.map((v) => (
              <button type="button" key={v} onClick={() => (v === 'Agente' ? setChatMovil(true) : ir(v))} className={pestana === v ? 'on' : ''} aria-current={pestana === v ? 'page' : undefined}>
                {v === 'Agente' ? <Avatar lado={30} /> : <Icono nombre={v} lado={21} />}
                <span>{v === 'Agente' ? 'Agente' : v}</span>
                {(badges[v] ?? 0) > 0 && <b />}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
