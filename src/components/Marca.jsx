/** Logotipo de la aplicación: ícono de cartera y nombre. */
export function IconoCartera({ className = 'w-9 h-9' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="16" fill="#009ee3" />
      <path d="M9 11.5A2.5 2.5 0 0 1 11.5 9H21v3h-9.5a.5.5 0 0 0 0 1H23a1 1 0 0 1 1 1v7.5a2.5 2.5 0 0 1-2.5 2.5h-10A2.5 2.5 0 0 1 9 21.5z" fill="#fff" />
      <circle cx="20" cy="18" r="1.5" fill="#009ee3" />
    </svg>
  );
}

export default function Marca({ className = '', compacta = false }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <IconoCartera />
      {!compacta && (
        <span className="leading-tight">
          <span className="block font-extrabold text-[15px] text-slate-900">Mi Cartera</span>
          <span className="block font-semibold text-[13px] text-blue-600 -mt-0.5">Digital</span>
        </span>
      )}
    </span>
  );
}
