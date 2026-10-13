'use client';
import { useState } from 'react';
import type { Evento } from '@/lib/tipos';
import { fechaLarga, hora, horaCorta, inicioDelDia, mismoDia } from '@/lib/formato';
import { Icono, Vacio } from './comunes';

const PRIMERA = 7; // 7 AM
const ULTIMA = 21; // el último renglón es el de las 9 PM
const ALTO = 46; // pixeles por hora
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HORAS = Array.from({ length: ULTIMA - PRIMERA + 1 }, (_, i) => PRIMERA + i);

type Bloque = { evento: Evento; arriba: number; alto: number; carril: number; carriles: number };

/* Coloca los eventos de un día por su hora; los que se enciman se reparten en carriles. */
function acomodar(eventos: Evento[], dia: Date): Bloque[] {
  const min = PRIMERA * 60;
  const max = (ULTIMA + 1) * 60;
  const delDia = eventos
    .map((evento) => ({ evento, inicio: new Date(evento.inicio), fin: new Date(evento.fin) }))
    .filter((e) => mismoDia(e.inicio, dia))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const libres: number[] = []; // minuto en que se desocupa cada carril
  const bloques = delDia.map(({ evento, inicio, fin }) => {
    const m0 = inicio.getHours() * 60 + inicio.getMinutes();
    const m1 = mismoDia(inicio, fin) ? fin.getHours() * 60 + fin.getMinutes() : 24 * 60;
    const desde = Math.min(Math.max(m0, min), max - 30);
    const hasta = Math.min(Math.max(m1, desde + 30), max);
    let carril = libres.findIndex((libre) => libre <= desde);
    if (carril < 0) carril = libres.length;
    libres[carril] = hasta;
    return { evento, arriba: ((desde - min) / 60) * ALTO, alto: ((hasta - desde) / 60) * ALTO, carril, carriles: 1 };
  });
  return bloques.map((b) => ({ ...b, carriles: libres.length }));
}

/* Semana de lunes a domingo, de 7 AM a 9 PM. */
export default function Calendario({ eventos }: { eventos: Evento[] }) {
  const [semana, setSemana] = useState(0);
  const [elegido, setElegido] = useState<string>();

  const hoy = inicioDelDia(new Date());
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7) + semana * 7);
  const dias = DIAS.map((_, i) => new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i));
  const mes = (d: Date) => d.toLocaleDateString('es-MX', { month: 'long' });
  const titulo = dias[0].getMonth() === dias[6].getMonth() ? `${mes(dias[0])} ${dias[0].getFullYear()}` : `${mes(dias[0])} – ${mes(dias[6])} ${dias[6].getFullYear()}`;
  const actual = eventos.find((e) => e.id === elegido);

  return (
    <div className="cuerpo una calendario">
      <div className="cal-barra">
        <h2>{titulo}</h2>
        <div className="botones">
          <button type="button" className="redondo" onClick={() => setSemana((s) => s - 1)} aria-label="Semana anterior"><Icono nombre="Atrás" lado={18} /></button>
          <button type="button" className="boton" onClick={() => setSemana(0)} disabled={semana === 0}>Hoy</button>
          <button type="button" className="redondo" onClick={() => setSemana((s) => s + 1)} aria-label="Semana siguiente"><Icono nombre="Adelante" lado={18} /></button>
        </div>
      </div>

      {eventos.length === 0 && <Vacio>Aquí aparecerán tus eventos cuando tu agente lea tu calendario. Pídele: «Pon mi agenda de la semana en mi panel».</Vacio>}

      {actual && (
        <article className="aprobar cal-detalle">
          <div className="renglon">
            <h3>{actual.titulo}</h3>
            <button type="button" className="redondo" onClick={() => setElegido(undefined)} aria-label="Cerrar"><Icono nombre="Cerrar" lado={16} /></button>
          </div>
          <p className="tenue">
            {fechaLarga(new Date(actual.inicio))} · {hora(new Date(actual.inicio))} a {hora(new Date(actual.fin))}
          </p>
          {actual.nota && <p>{actual.nota}</p>}
        </article>
      )}

      <div className="cal-marco">
        <div className="cal">
          <div className="cal-rejilla cal-encabezado">
            <span />
            {dias.map((d, i) => (
              <div key={i} className={`cal-dia ${mismoDia(d, hoy) ? 'hoy' : ''}`}>
                <span>{DIAS[i]}</span>
                <b>{d.getDate()}</b>
              </div>
            ))}
          </div>
          <div className="cal-rejilla" style={{ height: HORAS.length * ALTO }}>
            <div className="cal-horas">
              {HORAS.map((h) => <span key={h} style={{ height: ALTO }}>{horaCorta(h)}</span>)}
            </div>
            {dias.map((d, i) => (
              <div key={i} className={`cal-col ${mismoDia(d, hoy) ? 'hoy' : ''}`} style={{ backgroundSize: `100% ${ALTO}px` }}>
                {acomodar(eventos, d).map((b) => (
                  <button
                    key={b.evento.id}
                    type="button"
                    className={`cal-ev ${b.evento.id === elegido ? 'on' : ''}`}
                    style={{ top: b.arriba, height: b.alto - 2, left: `calc(${(b.carril / b.carriles) * 100}% + 2px)`, width: `calc(${100 / b.carriles}% - 5px)` }}
                    onClick={() => setElegido(b.evento.id)}
                    title={b.evento.titulo}
                  >
                    {b.evento.titulo}
                    <small>{hora(new Date(b.evento.inicio))}</small>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
