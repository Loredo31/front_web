import Marca from '../components/Marca';

/** Pantallas de acceso: encabezado blanco con la marca y una tarjeta centrada sobre fondo gris. */
export default function AuthLayout({ children, ancho = 'max-w-md' }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <Marca />
        </div>
      </header>
      <main className="flex-1 flex items-start md:items-center justify-center px-4 py-8">
        <div className={`w-full ${ancho} tarjeta p-6 md:p-8`}>{children}</div>
      </main>
      <footer className="text-center text-xs text-slate-500 pb-6">
        Mi Cartera Digital • Acceso protegido con verificación en dos pasos
      </footer>
    </div>
  );
}
