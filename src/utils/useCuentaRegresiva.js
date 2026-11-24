import { useEffect, useState } from 'react';

/** Segundos restantes desde que cambia `clave`. */
export function useCuentaRegresiva(segundos, clave) {
  const [restantes, setRestantes] = useState(segundos || 0);

  useEffect(() => {
    if (!segundos) { setRestantes(0); return undefined; }
    const fin = Date.now() + segundos * 1000;
    setRestantes(segundos);
    const t = setInterval(() => {
      const r = Math.max(0, Math.round((fin - Date.now()) / 1000));
      setRestantes(r);
      if (r === 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [segundos, clave]);

  return restantes;
}

export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
