'use client';
import { useState, type FormEvent } from 'react';
import type { Aprobacion, Correo, Datos, Rutina, Tarea } from '@/lib/tipos';
import { cuando, diaDeTarea, fechaLarga, saludo } from '@/lib/formato';
import { DosColumnas, Fila, Vacio, type Vista } from './comunes';
import type { Mandar } from './Panel';

type DeLista = { elegido?: string; elegir: (id: string) => void; abierto: boolean };

const porFecha = <T,>(lista: T[], fecha: (x: T) => string) => [...lista].sort((a, b) => fecha(b).localeCompare(fecha(a)));

const ETIQUETA: Record<Aprobacion['estado'], string> = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada', hecha: 'Hecha' };

/* ── Aprobaciones ── */

/* Lo que el agente quiere hacer, el texto exacto y los tres botones. */
function TarjetaAprobacion({ a, mandar }: { a: Aprobacion; mandar: Mandar }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(a.texto);
  const [ocupado, setOcupado] = useState(false);

  const resolver = async (cuerpo: object) => {
    setOcupado(true);
    if (await mandar(`/api/aprobaciones/${a.id}`, 'PATCH', cuerpo)) setEditando(false);
    setOcupado(false);
  };

  return (
    <article className="aprobar">
      <div className="renglon">
        <h3>{a.titulo}</h3>
        <span className="chip">{a.canal}</span>
        {a.estado !== 'pendiente' && <span className={`chip estado-${a.estado}`}>{ETIQUETA[a.estado]}</span>}
      </div>
      <p className="tenue">{a.detalle}</p>

      {editando ? (
        <textarea className="campo" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Texto que se va a mandar" autoFocus />
      ) : (
        <>
          <p className="etiqueta">{a.textoEditado ? 'Tu versión corregida' : 'Texto exacto'}</p>
          <blockquote className="cita">{a.textoEditado ?? a.texto}</blockquote>
        </>
      )}

      {a.estado === 'pendiente' ? (
        editando ? (
          <div className="botones">
            <button type="button" className="boton principal" disabled={ocupado || !texto.trim()} onClick={() => resolver({ estado: 'aprobada', textoEditado: texto })}>
              Guardar y aprobar
            </button>
            <button type="button" className="boton" disabled={ocupado} onClick={() => { setEditando(false); setTexto(a.texto); }}>
              Cancelar
            </button>
          </div>
        ) : (
          <div className="botones">
            <button type="button" className="boton principal" disabled={ocupado} onClick={() => resolver({ estado: 'aprobada' })}>Aprobar</button>
            <button type="button" className="boton" disabled={ocupado} onClick={() => setEditando(true)}>Editar</button>
            <button type="button" className="boton peligro" disabled={ocupado} onClick={() => resolver({ estado: 'rechazada' })}>Rechazar</button>
          </div>
        )
      ) : (
        <p className="tenue chico">
          {a.estado === 'aprobada' && 'Aprobada. Tu agente la hará en su siguiente revisión.'}
          {a.estado === 'hecha' && 'Tu agente ya la hizo.'}
          {a.estado === 'rechazada' && 'La rechazaste: tu agente no hará nada.'}
          {a.resuelta && ` · ${cuando(a.resuelta)}`}
        </p>
      )}
    </article>
  );
}

const ordenarAprobaciones = (lista: Aprobacion[]) =>
  porFecha(lista, (a) => a.creada).sort((a, b) => Number(b.estado === 'pendiente') - Number(a.estado === 'pendiente'));

export function Aprobaciones({ aprobaciones, elegido, elegir, abierto, mandar }: DeLista & { aprobaciones: Aprobacion[]; mandar: Mandar }) {
  const lista = ordenarAprobaciones(aprobaciones);
  const actual = lista.find((a) => a.id === elegido) ?? lista[0];
  return (
    <DosColumnas
      abierto={abierto}
      hayLista={lista.length > 0}
      lista={
        lista.length === 0 ? (
          <Vacio>Aquí aparecerá lo que tu agente quiera mandar en tu nombre. Nada sale sin que tú lo apruebes.</Vacio>
        ) : (
          lista.map((a) => (
            <Fila
              key={a.id}
              titulo={a.titulo}
              linea={`${a.canal} · ${cuando(a.creada)}`}
              elegida={a.id === actual?.id}
              punto={a.estado === 'pendiente'}
              derecha={a.estado !== 'pendiente' ? <span className={`chip estado-${a.estado}`}>{ETIQUETA[a.estado]}</span> : undefined}
              onClick={() => elegir(a.id)}
            />
          ))
        )
      }
      detalle={actual ? <TarjetaAprobacion key={actual.id} a={actual} mandar={mandar} /> : null}
    />
  );
}

/* ── Inicio ── */

export function Inicio({ datos, nombre, mandar, ir }: { datos: Datos; nombre: string; mandar: Mandar; ir: (v: Vista) => void }) {
  const pendientes = ordenarAprobaciones(datos.aprobaciones).filter((a) => a.estado === 'pendiente');
  const actividad = porFecha(datos.actividad, (a) => a.cuando).slice(0, 30);
  const cuentas: [Vista, string, number][] = [
    ['Tareas', 'Tareas abiertas', datos.tareas.filter((t) => !t.hecha).length],
    ['Rutinas', 'Rutinas activas', datos.rutinas.filter((r) => r.activa).length],
    ['Correos', 'Correos por responder', datos.correos.filter((c) => c.necesitaRespuesta).length],
  ];
  return (
    <div className="cuerpo dos inicio">
      <div className="lista">
        <div className="saludo">
          <h2>{saludo(nombre)}</h2>
          <p className="tenue">{fechaLarga(new Date())}</p>
        </div>

        <p className="etiqueta">Esperan tu aprobación</p>
        {pendientes.length === 0 ? (
          <Vacio>Nada por aprobar. Cuando tu agente quiera mandar algo en tu nombre, te lo pregunta aquí primero.</Vacio>
        ) : (
          pendientes.map((a) => <TarjetaAprobacion key={a.id} a={a} mandar={mandar} />)
        )}

        <div className="cuentas">
          {cuentas.map(([vista, texto, n]) => (
            <button key={vista} type="button" className="cuenta" onClick={() => ir(vista)}>
              <strong>{n}</strong>
              <span>{texto}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="detalle">
        <p className="etiqueta">Actividad reciente</p>
        {actividad.length === 0 ? (
          <Vacio>Aquí verás, paso a paso, lo que vaya haciendo tu agente. Conéctalo con la dirección que aparece en Ajustes.</Vacio>
        ) : (
          <ul className="actividad">
            {actividad.map((a) => (
              <li key={a.id}>
                <span>{a.texto}</span>
                <time dateTime={a.cuando}>{cuando(a.cuando)}</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Tareas ── */

export function Tareas({ tareas, elegido, elegir, abierto, mandar }: DeLista & { tareas: Tarea[]; mandar: Mandar }) {
  const [filtro, setFiltro] = useState<'pendientes' | 'hechas'>('pendientes');
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState('');

  const lista = porFecha(tareas, (t) => t.creada).filter((t) => t.hecha === (filtro === 'hechas'));
  const actual = lista.find((t) => t.id === elegido) ?? lista[0];
  const marcar = (t: Tarea) => mandar(`/api/tareas/${t.id}`, 'PATCH', { hecha: !t.hecha });

  const agregar = async (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    if (await mandar('/api/tareas', 'POST', { titulo, fecha: fecha || undefined })) {
      setTitulo('');
      setFecha('');
      setFiltro('pendientes');
    }
  };

  return (
    <DosColumnas
      abierto={abierto}
      hayLista={lista.length > 0}
      lista={
        <>
          <form className="nueva" onSubmit={agregar}>
            <input className="campo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nueva tarea…" aria-label="Nueva tarea" maxLength={300} />
            <input className="campo fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha (opcional)" />
            <button type="submit" className="boton principal" disabled={!titulo.trim()}>Agregar</button>
          </form>
          <div className="filtros">
            {(['pendientes', 'hechas'] as const).map((f) => (
              <button key={f} type="button" className={`chip ${filtro === f ? 'on' : ''}`} onClick={() => setFiltro(f)}>
                {f === 'pendientes' ? 'Pendientes' : 'Hechas'}
              </button>
            ))}
          </div>
          {lista.length === 0 ? (
            <Vacio>
              {filtro === 'pendientes'
                ? tareas.length === 0
                  ? 'Aquí aparecerán las tareas que le dictes a tu agente. También puedes escribir una arriba.'
                  : 'Todo al corriente: no tienes tareas pendientes.'
                : 'Todavía no has terminado ninguna tarea.'}
            </Vacio>
          ) : (
            lista.map((t) => (
              <div key={t.id} className={`fila ${t.id === actual?.id ? 'on' : ''}`}>
                <button type="button" className={`casilla ${t.hecha ? 'on' : ''}`} onClick={() => marcar(t)} aria-label={t.hecha ? 'Marcar como pendiente' : 'Marcar como hecha'} aria-pressed={t.hecha} />
                <button type="button" className="fila-texto" onClick={() => elegir(t.id)}>
                  <span className={`fila-titulo ${t.hecha ? 'tachada' : ''}`}>{t.titulo}</span>
                  {t.fecha && <span className="fila-linea">{diaDeTarea(t.fecha)}</span>}
                </button>
              </div>
            ))
          )}
        </>
      }
      detalle={
        actual ? (
          <article className="ficha">
            <h2 className={actual.hecha ? 'tachada' : ''}>{actual.titulo}</h2>
            <dl className="pares">
              <dt>Para cuándo</dt>
              <dd>{actual.fecha ? diaDeTarea(actual.fecha) : 'Sin fecha'}</dd>
              <dt>Anotada</dt>
              <dd>{cuando(actual.creada)}</dd>
              <dt>Estado</dt>
              <dd>{actual.hecha ? 'Hecha' : 'Pendiente'}</dd>
            </dl>
            <div className="botones">
              <button type="button" className={`boton ${actual.hecha ? '' : 'principal'}`} onClick={() => marcar(actual)}>
                {actual.hecha ? 'Regresar a pendientes' : 'Marcar como hecha'}
              </button>
            </div>
          </article>
        ) : null
      }
    />
  );
}

/* ── Rutinas ── */

function Interruptor({ on, onClick, etiqueta }: { on: boolean; onClick: () => void; etiqueta: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={etiqueta} className={`interruptor ${on ? 'on' : ''}`} onClick={onClick} />;
}
export { Interruptor };

export function Rutinas({ rutinas, elegido, elegir, abierto, mandar }: DeLista & { rutinas: Rutina[]; mandar: Mandar }) {
  const actual = rutinas.find((r) => r.id === elegido) ?? rutinas[0];
  const alternar = (r: Rutina) => mandar(`/api/rutinas/${r.id}`, 'PATCH', { activa: !r.activa });
  return (
    <DosColumnas
      abierto={abierto}
      hayLista={rutinas.length > 0}
      lista={
        rutinas.length === 0 ? (
          <Vacio>Aquí aparecerán las rutinas que le pidas a tu agente. Por ejemplo: «Todos los días a las 7:00 AM mándame un resumen de mi día».</Vacio>
        ) : (
          rutinas.map((r) => (
            <div key={r.id} className={`fila ${r.id === actual?.id ? 'on' : ''}`}>
              <button type="button" className="fila-texto" onClick={() => elegir(r.id)}>
                <span className={`fila-titulo ${r.activa ? '' : 'apagada'}`}>{r.titulo}</span>
                <span className="fila-linea">{r.horario}</span>
              </button>
              <Interruptor on={r.activa} onClick={() => alternar(r)} etiqueta={`Rutina activa: ${r.titulo}`} />
            </div>
          ))
        )
      }
      detalle={
        actual ? (
          <article className="ficha">
            <h2>{actual.titulo}</h2>
            {actual.descripcion && <p>{actual.descripcion}</p>}
            <dl className="pares">
              <dt>Horario</dt>
              <dd>{actual.horario}</dd>
              <dt>Última corrida</dt>
              <dd>{actual.ultimaCorrida ? cuando(actual.ultimaCorrida) : 'Todavía no ha corrido'}</dd>
              <dt>Estado</dt>
              <dd>{actual.activa ? 'Activa' : 'Apagada: tu agente no la corre'}</dd>
            </dl>
            <div className="botones">
              <button type="button" className="boton" onClick={() => alternar(actual)}>{actual.activa ? 'Apagar rutina' : 'Encender rutina'}</button>
            </div>
          </article>
        ) : null
      }
    />
  );
}

/* ── Correos (solo lectura: mandar pasa por Aprobaciones) ── */

export function Correos({ correos, elegido, elegir, abierto }: DeLista & { correos: Correo[] }) {
  const lista = porFecha(correos, (c) => c.recibido);
  const actual = lista.find((c) => c.id === elegido) ?? lista[0];
  return (
    <DosColumnas
      abierto={abierto}
      hayLista={lista.length > 0}
      lista={
        lista.length === 0 ? (
          <Vacio>Aquí aparecerá el resumen de tu bandeja cuando tu agente revise tu correo. Pídele: «Revisa mi correo y dime qué necesita respuesta».</Vacio>
        ) : (
          lista.map((c) => <Fila key={c.id} titulo={c.de} linea={c.asunto} elegida={c.id === actual?.id} punto={c.necesitaRespuesta} derecha={<span className="fila-hora">{cuando(c.recibido)}</span>} onClick={() => elegir(c.id)} />)
        )
      }
      detalle={
        actual ? (
          <article className="ficha">
            <h2>{actual.asunto}</h2>
            <p className="tenue">
              De {actual.de} · {cuando(actual.recibido)}
              {actual.necesitaRespuesta && <span className="chip estado-pendiente al-lado">Necesita respuesta</span>}
            </p>
            <p className="etiqueta">Resumen</p>
            <p>{actual.resumen}</p>
            {actual.borrador ? (
              <>
                <p className="etiqueta">Respuesta que preparó tu agente</p>
                <blockquote className="cita">{actual.borrador}</blockquote>
                <p className="tenue chico">Todavía no se manda. Cuando tu agente quiera enviarla, te pedirá permiso en Aprobaciones.</p>
              </>
            ) : (
              actual.necesitaRespuesta && <p className="tenue chico">Tu agente aún no prepara una respuesta. Pídesela y aparecerá aquí.</p>
            )}
          </article>
        ) : null
      }
    />
  );
}
