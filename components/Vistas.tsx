'use client';
import { useState, type FormEvent } from 'react';
import type { Actividad, Aprobacion, Correo as TipoCorreo, Evento, Rutina, Tarea, Whatsapp } from '@/lib/tipos';
import { cuando, diaDeTarea, inicioDelDia, mismoDia } from '@/lib/formato';
import { Avatar, Icono, Vacio } from './comunes';

export type Mandar = (ruta: string, metodo: 'POST' | 'PATCH', cuerpo?: object) => Promise<Record<string, unknown> | null>;

/* ── calendario: vista de semana, con el trazo de Google Calendar ── */

const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
export const DIA_TEXTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HORA_INI = 7;
const HORAS = 15; // de 7 AM a 10 PM
const ALTO = 34; // px por hora

/** 9 AM · 11:30 AM */
export const horaTexto = (d: Date) => {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${(h % 12) || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};
const horaDe = (h: number) => `${(h % 12) || 12} ${h < 12 ? 'AM' : 'PM'}`;

/** El lunes de la semana de hoy, corrido `semana` semanas. */
export function lunesDe(semana: number): Date {
  const hoy = inicioDelDia(new Date());
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7) + semana * 7);
}
export function diasDe(lunes: Date): Date[] {
  return DIAS.map((_, i) => new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i));
}

export function Calendario({ eventos, semana, setSemana }: { eventos: Evento[]; semana: number; setSemana: (s: number) => void }) {
  const hoy = new Date();
  const dias = diasDe(lunesDe(semana));
  const mes = (d: Date) => d.toLocaleDateString('es-MX', { month: 'long' });
  const titulo = dias[0].getMonth() === dias[6].getMonth() ? `${mes(dias[0])} ${dias[0].getFullYear()}` : `${mes(dias[0])} – ${mes(dias[6])} ${dias[6].getFullYear()}`;
  return (
    <div className="mt-cal">
      <div className="mt-cal-barra">
        <button type="button" className="mt-cal-btn" onClick={() => setSemana(0)}>Hoy</button>
        <span className="flechas">
          <button type="button" aria-label="Semana anterior" onClick={() => setSemana(semana - 1)}>‹</button>
          <button type="button" aria-label="Semana siguiente" onClick={() => setSemana(semana + 1)}>›</button>
        </span>
        <span className="mes">{titulo}</span>
        <span className="mt-cal-btn oculto-movil">Semana ▾</span>
      </div>
      <div className="mt-cal-grid">
        <span />
        {dias.map((d, i) => (
          <div key={i} className={`mt-cal-dia ${mismoDia(d, hoy) ? 'hoy' : ''}`}>
            <span>{DIAS[i]}</span>
            <b>{d.getDate()}</b>
          </div>
        ))}
      </div>
      <div className="mt-cal-grid" style={{ ['--h' as string]: `${ALTO}px` }}>
        <div>
          {Array.from({ length: HORAS }, (_, i) => (
            <div key={i} className="mt-cal-hora" style={{ height: ALTO }}>
              {i > 0 && horaDe(HORA_INI + i)}
            </div>
          ))}
        </div>
        {dias.map((d, i) => (
          <div key={i} className="mt-cal-col" style={{ height: HORAS * ALTO }}>
            {eventos
              .filter((e) => mismoDia(new Date(e.inicio), d))
              .map((e) => {
                const ini = new Date(e.inicio);
                const fin = new Date(e.fin);
                const h0 = Math.max(ini.getHours() + ini.getMinutes() / 60, HORA_INI);
                const h1 = Math.min(mismoDia(ini, fin) ? fin.getHours() + fin.getMinutes() / 60 : 24, HORA_INI + HORAS);
                const dur = Math.max(h1 - h0, 0.5);
                return (
                  <div key={e.id} className="mt-cal-ev" style={{ top: (h0 - HORA_INI) * ALTO + 1, height: dur * ALTO - 2 }} title={e.nota ? `${e.titulo}\n${e.nota}` : e.titulo}>
                    {e.titulo}
                    <small>{horaTexto(ini)}</small>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── respuesta lista para enviar (correo). Se puede corregir antes. ── */

export type Envio = { enviado: boolean } | null;

export function Borrador({ texto, propio, resultado, ocupado, onEnviar }: { texto: string; propio?: boolean; resultado: Envio; ocupado: boolean; onEnviar: (texto: string) => void }) {
  const [editando, setEditando] = useState(!texto);
  const [valor, setValor] = useState(texto);
  if (resultado) return <p className="mt-nota mt-ok">{resultado.enviado ? '✓ Enviado' : '✓ Aprobado · tu agente lo manda en su siguiente revisión'}</p>;
  return (
    <div className="mt-borrador">
      <p className="mt-etiqueta">{propio || !texto ? 'Tu respuesta' : 'Respuesta que preparó tu agente'}</p>
      {editando ? (
        <textarea className="mt-area" rows={5} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Escribe tu respuesta…" aria-label="Tu respuesta" autoFocus={Boolean(texto)} />
      ) : (
        <p className="mt-borrador-texto">{valor}</p>
      )}
      <div className="mt-botones">
        <button type="button" className="mt-btn" disabled={ocupado || !valor.trim()} onClick={() => onEnviar(valor.trim())}>{ocupado ? 'Enviando…' : 'Enviar'}</button>
        {editando ? (
          texto && <button type="button" className="mt-btn-ghost" disabled={ocupado} onClick={() => { setValor(texto); setEditando(false); }}>Cancelar</button>
        ) : (
          <button type="button" className="mt-btn-ghost" disabled={ocupado} onClick={() => setEditando(true)}>Editar</button>
        )}
      </div>
    </div>
  );
}

/* ── el correo abierto ── */

/** Saca la dirección de "Nombre <alguien@correo.com>" (o del texto si es solo la dirección). */
export const direccionDe = (de: string) => /[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/.exec(de)?.[0];
/** Solo el nombre: "Jorge Salinas <jorge@...>" → "Jorge Salinas". */
export const nombreDe = (de: string) => de.replace(/<[^>]*>/, '').trim() || de;

export function Correo({ c, resultado, ocupado, onEnviar }: { c: TipoCorreo; resultado: Envio; ocupado: boolean; onEnviar: (texto: string) => void }) {
  return (
    <div className="v2-enter mt-detalle">
      <p className="mt-titulo correo">{c.asunto}</p>
      <p className="mt-meta">{nombreDe(c.de)} · {cuando(c.recibido)}</p>
      <p className="mt-cuerpo">{c.resumen}</p>
      {c.borrador || c.necesitaRespuesta ? (
        <Borrador key={c.id} texto={c.borrador ?? ''} resultado={resultado} ocupado={ocupado} onEnviar={onEnviar} />
      ) : (
        <p className="mt-nota">Tu agente lo archivó: no necesita respuesta.</p>
      )}
    </div>
  );
}

/* ── correo nuevo ── */

export function Redactar({ ocupado, onEnviar }: { ocupado: boolean; onEnviar: (para: string, asunto: string, cuerpo: string) => void }) {
  const [para, setPara] = useState('');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  return (
    <div className="v2-enter mt-detalle">
      <p className="mt-titulo correo">Correo nuevo</p>
      <input value={para} onChange={(e) => setPara(e.target.value)} placeholder="Para" aria-label="Para" className="mt-campo" style={{ marginTop: 12 }} />
      <input value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Asunto" aria-label="Asunto" className="mt-campo" />
      <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={6} placeholder="Escribe aquí…" aria-label="Mensaje" className="mt-campo sin-linea" />
      <div className="mt-botones" style={{ marginTop: 8 }}>
        <button type="button" className="mt-btn" disabled={ocupado || !para.trim() || !cuerpo.trim()} onClick={() => onEnviar(para.trim(), asunto.trim(), cuerpo.trim())}>
          {ocupado ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}

/* ── WhatsApp: una conversación por número ── */

export type Conversacion = { de: string; nombre: string; mensajes: Whatsapp[]; ultimo: string; respondida: boolean };

export function conversaciones(mensajes: Whatsapp[], aprobaciones: Aprobacion[]): Conversacion[] {
  const porNumero = new Map<string, Whatsapp[]>();
  for (const m of mensajes) porNumero.set(m.de, [...(porNumero.get(m.de) ?? []), m]);
  return [...porNumero.entries()]
    .map(([de, lista]) => {
      const orden = [...lista].sort((a, b) => a.recibido.localeCompare(b.recibido));
      const ultimo = orden[orden.length - 1].recibido;
      const respondida = respuestasA(aprobaciones, de).some((a) => a.creada > ultimo);
      return { de, nombre: orden.find((m) => m.nombre)?.nombre ?? `+${de}`, mensajes: orden, ultimo, respondida };
    })
    .sort((a, b) => b.ultimo.localeCompare(a.ultimo));
}

/** Lo que tú contestaste por WhatsApp a ese número (queda como aprobación). */
export const respuestasA = (aprobaciones: Aprobacion[], de: string) =>
  aprobaciones.filter((a) => a.canal === 'WhatsApp' && a.estado !== 'rechazada' && a.detalle.includes(`(+${de})`)).sort((a, b) => a.creada.localeCompare(b.creada));

export function Chat({ c, enviadas, ocupado, onEnviar }: { c: Conversacion; enviadas: Aprobacion[]; ocupado: boolean; onEnviar: (texto: string) => void }) {
  const [texto, setTexto] = useState('');
  const hilo = [...c.mensajes.map((m) => ({ id: m.id, yo: false, t: m.texto, h: m.recibido })), ...enviadas.map((a) => ({ id: a.id, yo: true, t: a.textoEditado ?? a.texto, h: a.creada }))].sort((a, b) => a.h.localeCompare(b.h));
  const enviar = () => {
    if (!texto.trim() || ocupado) return;
    onEnviar(texto.trim());
    setTexto('');
  };
  return (
    <div className="v2-enter mt-chatwa">
      <div className="mt-wa-cabeza">
        <span className="mt-wa-avatar">{c.nombre[0]?.toUpperCase()}</span>
        <span>
          <span>{c.nombre}</span>
          <span>{c.nombre === `+${c.de}` ? 'WhatsApp' : `+${c.de}`}</span>
        </span>
      </div>
      <div className="mt-wa-hilo">
        {hilo.map((m) => (
          <p key={m.id} className={`mt-wa ${m.yo ? 'yo' : 'el'}`}>
            {m.t}
            <small>{cuando(m.h)}</small>
          </p>
        ))}
      </div>
      <div className="mt-escribir">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          rows={texto.length > 44 ? 2 : 1}
          placeholder="Escribe un mensaje"
          aria-label={`Mensaje para ${c.nombre}`}
        />
        <button type="button" aria-label="Enviar" className="mt-enviar" disabled={ocupado} onClick={enviar}>➤</button>
      </div>
    </div>
  );
}

/* ── tareas ── */

export function Tareas({ tareas, filtro, mandar }: { tareas: Tarea[]; filtro: 'Pendientes' | 'Hechas'; mandar: Mandar }) {
  const [titulo, setTitulo] = useState('');
  const lista = [...tareas].sort((a, b) => b.creada.localeCompare(a.creada)).filter((t) => t.hecha === (filtro === 'Hechas'));
  const agregar = async (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    if (await mandar('/api/tareas', 'POST', { titulo: titulo.trim() })) setTitulo('');
  };
  return (
    <>
      <p className="mt-titulo" style={{ marginBottom: 12 }}>{filtro}</p>
      {lista.length === 0 && (
        <Vacio>
          {filtro === 'Hechas' ? 'Todavía no has terminado ninguna tarea.' : tareas.length ? 'Todo al corriente: no tienes tareas pendientes.' : 'Tu agente todavía no ha anotado nada. Dile «anótame…» o escribe una aquí abajo.'}
        </Vacio>
      )}
      {lista.map((t) => (
        <button type="button" key={t.id} className="mt-fila" onClick={() => mandar(`/api/tareas/${t.id}`, 'PATCH', { hecha: !t.hecha })} aria-pressed={t.hecha}>
          <span className={`mt-check ${t.hecha ? 'on' : ''}`}>{t.hecha && '✓'}</span>
          <span className={`mt-tarea ${t.hecha ? 'hecha' : ''}`}>
            {t.titulo}
            {t.fecha && <small>{diaDeTarea(t.fecha)}</small>}
          </span>
        </button>
      ))}
      {filtro === 'Pendientes' && (
        <form className="mt-escribir clara" onSubmit={agregar}>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nueva tarea…" aria-label="Nueva tarea" maxLength={300} />
          <button type="submit" aria-label="Agregar" className="mt-enviar" disabled={!titulo.trim()}><Icono nombre="Enviar" lado={15} /></button>
        </form>
      )}
    </>
  );
}

/* ── una rutina ── */

export function DetalleRutina({ r, mandar }: { r: Rutina; mandar: Mandar }) {
  return (
    <div key={r.id} className="v2-enter mt-detalle">
      <p className="mt-titulo">{r.titulo}</p>
      <p className="mt-meta">{r.horario}{r.ultimaCorrida && ` · última vez ${cuando(r.ultimaCorrida)}`}</p>
      {r.descripcion && <p className="mt-cuerpo">{r.descripcion}</p>}
      <button type="button" className={`mt-interruptor ${r.activa ? 'on' : ''}`} role="switch" aria-checked={r.activa} onClick={() => mandar(`/api/rutinas/${r.id}`, 'PATCH', { activa: !r.activa })}>
        <span><i /></span>
        {r.activa ? 'Activa' : 'En pausa'}
      </button>
    </div>
  );
}

/* ── una aprobación: lo que va a hacer el agente y los botones ── */

const ESTADO: Record<Aprobacion['estado'], string> = { pendiente: 'espera tu visto bueno', aprobada: 'aprobada · tu agente la hace en su siguiente revisión', rechazada: 'rechazada', hecha: 'hecha' };

export function DetalleAprobacion({ a, mandar }: { a: Aprobacion; mandar: Mandar }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(a.textoEditado ?? a.texto);
  const [ocupado, setOcupado] = useState(false);
  const resolver = async (cuerpo: object) => {
    setOcupado(true);
    if (await mandar(`/api/aprobaciones/${a.id}`, 'PATCH', cuerpo)) setEditando(false);
    setOcupado(false);
  };
  return (
    <div key={a.id} className="v2-enter mt-detalle">
      <p className="mt-rotulo" style={{ marginBottom: 0 }}>{a.canal} · {ESTADO[a.estado]}</p>
      <p className="mt-titulo" style={{ marginTop: 8 }}>{a.titulo}</p>
      <p className="mt-meta">{a.detalle}</p>
      <div className="mt-borrador">
        <p className="mt-etiqueta">{a.textoEditado ? 'Tu versión corregida' : 'Lo que va a hacer tu agente'}</p>
        {editando ? (
          <textarea className="mt-area" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Texto que se va a mandar" autoFocus />
        ) : (
          <p className="mt-borrador-texto">{a.textoEditado ?? a.texto}</p>
        )}
      </div>
      {a.estado === 'pendiente' && (
        <div className="mt-botones" style={{ marginTop: 16 }}>
          {editando ? (
            <>
              <button type="button" className="mt-btn chico" disabled={ocupado || !texto.trim()} onClick={() => resolver({ estado: 'aprobada', textoEditado: texto })}>Guardar y aprobar</button>
              <button type="button" className="mt-btn-ghost" disabled={ocupado} onClick={() => { setEditando(false); setTexto(a.textoEditado ?? a.texto); }}>Cancelar</button>
            </>
          ) : (
            <>
              <button type="button" className="mt-btn chico" disabled={ocupado} onClick={() => resolver({ estado: 'aprobada' })}>Aprobar</button>
              <button type="button" className="mt-btn-ghost" disabled={ocupado} onClick={() => setEditando(true)}>Editar</button>
              <button type="button" className="mt-x" aria-label="Rechazar" title="Rechazar" disabled={ocupado} onClick={() => resolver({ estado: 'rechazada' })}>✕</button>
            </>
          )}
        </div>
      )}
      {a.resuelta && <p className="mt-nota">{cuando(a.resuelta)}</p>}
    </div>
  );
}

/* ── "Pídeselo a tu agente": tu agente vive en su app; aquí se ve lo que hizo ── */

export function Agente({ actividad, nombre, ir }: { actividad: Actividad[]; nombre: string; ir: () => void }) {
  const ultimas = [...actividad].sort((a, b) => b.cuando.localeCompare(a.cuando)).slice(0, 5).reverse();
  return (
    <>
      <div className="mt-chat-cabeza">
        <Avatar lado={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p>Tu agente</p>
          <p>Vive en Dots, Grok Bot o Muse</p>
        </div>
      </div>
      <div className="mt-hilo">
        <p className="mt-globo el">Pídeselo a tu agente desde su app{nombre ? `, ${nombre}` : ''}. Lo que haga por ti aparece aquí y en cada sección.</p>
        {ultimas.length === 0 ? (
          <p className="mt-globo el">Todavía no ha anotado nada. Conéctalo con la dirección MCP que está en Ajustes.</p>
        ) : (
          ultimas.map((a) => (
            <p key={a.id} className="mt-globo el">
              {a.texto}
              <small>{cuando(a.cuando)}</small>
            </p>
          ))
        )}
      </div>
      <div className="mt-chat-pie">
        <button type="button" className="mt-chip" onClick={ir}>Cómo conectarlo</button>
      </div>
    </>
  );
}
