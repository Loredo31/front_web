import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Cargando } from './components/ui';
import { IconoCartera } from './components/Marca';
import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import Recuperar from './pages/Recuperar';
import Registro from './pages/Registro';
import Billetera from './pages/Billetera';
import Pagos from './pages/Pagos';
import Historial from './pages/Historial';
import Perfil from './pages/Perfil';

function Privada() {
  const { estado } = useAuth();
  if (estado === 'cargando') return <PantallaCarga />;
  return estado === 'autenticado' ? <Outlet /> : <Navigate to="/login" replace />;
}

function Publica() {
  const { estado } = useAuth();
  if (estado === 'cargando') return <PantallaCarga />;
  return estado === 'autenticado' ? <Navigate to="/billetera" replace /> : <Outlet />;
}

function PantallaCarga() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <IconoCartera className="w-14 h-14 mb-2" />
      <Cargando texto="Conectando con el servidor…" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Publica />}>
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/registro" element={<Registro />} />
      </Route>
      <Route element={<Privada />}>
        <Route element={<AppLayout />}>
          <Route path="/billetera" element={<Billetera />} />
          <Route path="/pagos" element={<Pagos />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/billetera" replace />} />
    </Routes>
  );
}
