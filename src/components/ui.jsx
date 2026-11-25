import { useEffect, useRef, useState } from 'react';

export function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const variantes = {
  primario: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
  exito: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  peligro: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  secundario: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
  fantasma: 'bg-transparent hover:bg-slate-100 text-slate-600',
};

export function Boton({ variante = 'primario', cargando, disabled, className = '', children, ...props }) {
  return (
    <button
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 font-semibold py-2.5 px-5 rounded-md text-sm transition
        disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${variantes[variante]} ${className}`}
      {...props}
    >
      {cargando && <Spinner />}
      {children}
    </button>
  );
}

/** Ojo para mostrar u ocultar una contraseña o PIN. */
function BotonOjo({ visible, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      aria-label={visible ? 'Ocultar' : 'Mostrar'}
      title={visible ? 'Ocultar' : 'Mostrar'}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
        {!visible && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}

/** Input de contraseña con ojo. */
function InputSecreto({ className, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-10`} />
      <BotonOjo visible={visible} onClick={() => setVisible((v) => !v)} />
    </div>
  );
}

export function Campo({ label, error, ayuda, className = '', children, ...props }) {
  const claseInput = `w-full bg-slate-50 border rounded-lg p-2 text-sm text-slate-800 mt-1 outline-none transition
            focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:opacity-70
            ${error ? 'border-rose-300' : 'border-slate-200'}`;
  return (
    <div className={className}>
      {label && <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{label}</label>}
      {children || (props.type === 'password'
        ? <InputSecreto className={claseInput} {...props} />
        : <input className={claseInput} {...props} />
      )}
      {error ? <span className="text-[11px] text-rose-600 font-medium block mt-0.5">{error}</span>
        : ayuda ? <span className="text-[11px] block mt-0.5">{ayuda}</span> : null}
    </div>
  );
}

export function Selector({ label, error, opciones, className = '', vacio = 'Selecciona…', ...props }) {
  return (
    <Campo label={label} error={error} className={className}>
      <select
        className={`w-full bg-slate-50 border rounded-lg p-2 text-sm text-slate-800 mt-1 outline-none
          focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:opacity-60 ${error ? 'border-rose-300' : 'border-slate-200'}`}
        {...props}
      >
        <option value="">{vacio}</option>
        {opciones.map((o) => (
          <option key={o.valor ?? o} value={o.valor ?? o}>{o.texto ?? o}</option>
        ))}
      </select>
    </Campo>
  );
}

const tonosAlerta = {
  error: 'bg-rose-50 border-rose-200 text-rose-800',
  exito: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  aviso: 'bg-amber-50 border-amber-200 text-amber-900',
};

export function Alerta({ tipo = 'error', children, className = '' }) {
  if (!children) return null;
  return <div className={`border rounded-xl px-3 py-2 text-xs font-medium animar ${tonosAlerta[tipo]} ${className}`}>{children}</div>;
}

const tonosEstado = {
  EXITOSA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ACTIVA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PROCESANDO: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDIENTE_CONCILIACION: 'bg-amber-50 text-amber-700 border-amber-200',
  BLOQUEADA: 'bg-amber-50 text-amber-700 border-amber-200',
  RECHAZADA: 'bg-rose-50 text-rose-700 border-rose-200',
  ERROR: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCELADA: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function Estado({ valor, texto }) {
  return (
    <span className={`border font-bold px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${tonosEstado[valor] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {texto || (valor === 'PENDIENTE_CONCILIACION' ? 'EN VERIFICACIÓN' : valor)}
    </span>
  );
}

export function Modal({ abierto, titulo, onCerrar, children, ancho = 'max-w-md', className = '' }) {
  useEffect(() => {
    if (!abierto) return undefined;
    const esc = (e) => e.key === 'Escape' && onCerrar?.();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm no-imprimir-fondo">
      <div className={`w-full ${ancho} max-h-[92vh] overflow-y-auto bg-white rounded-lg shadow-xl animar ${className}`}>
        {titulo && (
          <div className="sticky top-0 z-10 bg-white flex justify-between items-center px-5 py-3.5 border-b border-slate-100 no-imprimir">
            <h3 className="font-bold text-slate-900">{titulo}</h3>
            {onCerrar && <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** 6 casillas numéricas para el código 2FA (como en el boceto). */
export function CodigoOtp({ valor, onChange, disabled, longitud = 6 }) {
  const refs = useRef([]);
  const digitos = valor.padEnd(longitud, ' ').slice(0, longitud).split('');

  const actualizar = (i, d) => {
    const arr = valor.padEnd(longitud, ' ').split('');
    arr[i] = d || ' ';
    onChange(arr.join('').replace(/\s+$/, '').replace(/ /g, ''));
  };

  return (
    <div className="flex gap-1.5 justify-center my-1 font-mono font-bold text-base">
      {digitos.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={d.trim()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (!v) return actualizar(i, '');
            actualizar(i, v.slice(-1));
            refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d.trim()) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const v = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, longitud);
            if (v) { e.preventDefault(); onChange(v); refs.current[Math.min(v.length, longitud - 1)]?.focus(); }
          }}
          className="w-10 h-11 text-center bg-white border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
        />
      ))}
    </div>
  );
}

export function CampoPin({ label = 'PIN de seguridad', valor, onChange, autoFocus, error, placeholder = '••••' }) {
  return (
    <Campo label={label} error={error}>
      <InputSecreto
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={6}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className="w-full bg-blue-50 border border-blue-400 rounded-lg p-2 pl-10 mt-1 text-center tracking-[0.5em] text-base font-bold outline-none focus:ring-2 focus:ring-blue-200"
      />
    </Campo>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Spinner className="w-5 h-5 text-blue-600" /> {texto}
    </div>
  );
}

export function LogoServicio({ url, nombre, className = 'w-10 h-10' }) {
  const [fallo, setFallo] = useState(false);
  return (
    <div className={`${className} rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0`}>
      {url && !fallo
        ? <img src={url} alt={nombre} className="w-full h-full object-contain p-1" onError={() => setFallo(true)} />
        : <span className="text-lg">⚡</span>}
    </div>
  );
}
