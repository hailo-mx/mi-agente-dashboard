'use client';
import { useState, type FormEvent } from 'react';
import { usarClics } from './comunes';

/* La puerta: se escribe la clave una vez y el navegador la recuerda 60 días. */
/* `sonido` viene de los ajustes guardados: el botón Entrar también hace clic. */
export default function Entrar({ sonido = true }: { sonido?: boolean }) {
  usarClics(sonido);
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!clave.trim() || enviando) return;
    setEnviando(true);
    setError('');
    try {
      const r = await fetch('/api/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave }) });
      if (r.ok) return window.location.reload();
      setError((await r.json().catch(() => null))?.error ?? 'No se pudo entrar. Inténtalo de nuevo.');
    } catch {
      setError('No hay conexión con tu panel. Inténtalo de nuevo.');
    }
    setEnviando(false);
  };

  return (
    <div className="mt-cuarto puerta" data-fondo="calido">
      <form className="mt-vidrio mt-puerta v2-enter" onSubmit={entrar}>
        <h1>Tu panel está protegido</h1>
        <p>Escribe tu clave para entrar. Es la misma que le diste a tu agente (CLAVE_AGENTE).</p>
        <input
          className="mt-campo"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="Tu clave"
          aria-label="Tu clave"
          autoComplete="current-password"
          autoFocus
        />
        {error && <p className="mt-error" role="alert">{error}</p>}
        <button className="mt-btn" type="submit" disabled={enviando || !clave.trim()}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
