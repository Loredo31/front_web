import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../layout/AuthLayout';
import { Alerta, Boton, Campo, CodigoOtp } from '../components/ui';
import { authApi } from '../api/servicios';
import { useAuth } from '../auth/AuthContext';
import { PASSWORD_REGEX } from '../utils/formato';
import { mmss, useCuentaRegresiva } from '../utils/useCuentaRegresiva';

export default function Recuperar() {
  const navigate = useNavigate();
  const { setAviso } = useAuth();
  const [correo, setCorreo] = useState('');
  const [desafio, setDesafio] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const expira = useCuentaRegresiva(desafio?.expiraEnSegundos, desafio?.enviado);

  const solicitar = async (e) => {
    e?.preventDefault();
    setError(''); setCargando(true);
    try {
      const r = await authApi.solicitarRecuperacion(correo.trim());
      setDesafio({ ...r.data, enviado: Date.now() });
      setCodigo('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async (e) => {
    e.preventDefault();
    if (codigo.length !== 6) return setError('Ingresa los 6 dígitos del código.');
    if (!PASSWORD_REGEX.test(password)) return setError('La contraseña no cumple las reglas de seguridad.');
    if (password !== confirmacion) return setError('Las contraseñas no coinciden.');
    setError(''); setCargando(true);
    try {
      await authApi.confirmarRecuperacion(desafio.ticket, codigo, password);
      setAviso('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">Recupera tu contraseña</h2>
          <p className="text-sm text-slate-400">
            {desafio ? 'Escribe el código que enviamos y tu nueva contraseña' : 'Te enviaremos un código de verificación a tu correo'}
          </p>
        </div>
        <Alerta>{error}</Alerta>

        {!desafio ? (
          <form onSubmit={solicitar} className="space-y-3.5">
            <Campo label="Correo electrónico" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
            <Boton type="submit" cargando={cargando} className="w-full">Enviar código</Boton>
          </form>
        ) : (
          <form onSubmit={confirmar} className="space-y-3.5">
            <Alerta tipo="info">
              Si el correo está registrado, recibirás un código en <b>{desafio.correoEnmascarado || correo}</b>.
              Si tu cuenta está bloqueada, deberás esperar a que termine el bloqueo.
            </Alerta>
            <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl">
              <label className="text-xs font-bold text-blue-900 block mb-1">Código de verificación</label>
              <CodigoOtp valor={codigo} onChange={setCodigo} />
              <span className="text-[11px] text-blue-600 block text-center mt-1">
                {expira > 0 ? `Vence en ${mmss(expira)}` : 'El código venció.'} •{' '}
                <button type="button" onClick={() => solicitar()} className="underline font-semibold cursor-pointer">Enviar otro</button>
              </span>
            </div>
            <Campo label="Nueva contraseña" type="password" autoComplete="new-password" maxLength={50} value={password}
              onChange={(e) => setPassword(e.target.value)}
              ayuda={<span className={PASSWORD_REGEX.test(password) ? 'text-emerald-600' : 'text-slate-400'}>
                Mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.</span>} />
            <Campo label="Confirmar contraseña" type="password" autoComplete="new-password" maxLength={50} value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)} />
            <Boton type="submit" cargando={cargando} className="w-full">Cambiar contraseña</Boton>
            <p className="text-[11px] text-slate-400 text-center">Al confirmar se cerrarán todas tus sesiones abiertas.</p>
          </form>
        )}

        <div className="text-xs pt-2 border-t border-slate-100 text-center">
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">← Volver a iniciar sesión</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
