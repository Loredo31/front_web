import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alerta, Boton, Campo, Selector } from '../components/ui';
import AuthLayout from '../layout/AuthLayout';
import { clientesApi } from '../api/servicios';
import { num } from '../api/http';
import {
  ESTADOS, ESTADOS_CIVILES, FILTROS, LIMITES, MINIMOS, NACIONALIDADES, PAISES, SEXOS, avisoIngreso, esMexico, faltaMinimo, filtrarIngreso,
  opcionesMunicipio,
} from '../utils/catalogos';
import { CORREO_REGEX, MENSAJE_CORREO, CURP_REGEX, PASSWORD_REGEX, RFC_REGEX, cuentaAgrupada } from '../utils/formato';

const PASOS = ['Datos personales', 'Verificación de Identidad Fiscal', 'Domicilio y datos laborales'];

const inicial = {
  nombre: '', segundoNombre: '', apellidoPaterno: '', apellidoMaterno: '', fechaNacimiento: '',
  sexo: '', estadoCivil: '', nacionalidad: 'MEXICANA',
  curp: '', rfc: '', correoElectronico: '', telefonoMovil: '', telefonoAlternativo: '',
  calle: '', numeroExterior: '', numeroInterior: '', colonia: '', municipio: '', estado: '', codigoPostal: '', pais: 'MÉXICO',
  ocupacion: '', empresa: '', ingresoMensual: '',
  password: '', confirmacion: '', acepto: false,
};

// En qué paso está cada campo (para llevar al usuario al error que devuelva el backend).
const CAMPOS_PASO = [
  ['nombre', 'segundoNombre', 'apellidoPaterno', 'apellidoMaterno', 'fechaNacimiento', 'sexo', 'estadoCivil', 'nacionalidad'],
  ['curp', 'rfc', 'correoElectronico', 'telefonoMovil', 'telefonoAlternativo'],
  ['calle', 'numeroExterior', 'numeroInterior', 'colonia', 'municipio', 'estado', 'codigoPostal', 'pais',
    'ocupacion', 'empresa', 'ingresoMensual', 'password', 'confirmacion', 'acepto'],
];

const SOLO_LETRAS = /^[\p{L}\s]+$/u;

/** Fecha (AAAA-MM-DD) de hace `anios` años, para limitar el calendario. */
function haceAnios(anios) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anios);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const EDAD_MINIMA = 18;
const EDAD_MAXIMA = 100;

function edad(fecha) {
  const n = new Date(fecha);
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
  return e;
}

function validarPaso(paso, f) {
  const e = {};
  const req = (k, msg = 'Obligatorio') => { if (!String(f[k] ?? '').trim()) e[k] = msg; };
  if (paso === 0) {
    req('nacionalidad');
    ['nombre', 'apellidoPaterno', 'apellidoMaterno'].forEach((k) => {
      req(k);
      if (!e[k] && !SOLO_LETRAS.test(f[k])) e[k] = 'Solo letras y espacios';
    });
    if (f.segundoNombre && !SOLO_LETRAS.test(f.segundoNombre)) e.segundoNombre = 'Solo letras y espacios';
    ['nombre', 'segundoNombre', 'apellidoPaterno', 'apellidoMaterno'].forEach((k) => {
      if (!e[k] && faltaMinimo(f[k], MINIMOS.nombre)) e[k] = faltaMinimo(f[k], MINIMOS.nombre);
    });
    req('fechaNacimiento');
    if (f.fechaNacimiento) {
      const anios = edad(f.fechaNacimiento);
      if (Number.isNaN(anios)) e.fechaNacimiento = 'Fecha inválida';
      else if (anios < EDAD_MINIMA) e.fechaNacimiento = 'Debes ser mayor de 18 años';
      else if (anios > EDAD_MAXIMA) e.fechaNacimiento = 'Revisa la fecha: la edad no puede ser mayor a 100 años';
    }
    req('sexo'); req('estadoCivil');
  }
  if (paso === 1) {
    if (!CURP_REGEX.test(f.curp)) e.curp = 'CURP con formato inválido (18 caracteres)';
    if (!RFC_REGEX.test(f.rfc)) e.rfc = 'RFC con formato inválido (12 o 13 caracteres)';
    if (!CORREO_REGEX.test(f.correoElectronico.trim())) e.correoElectronico = MENSAJE_CORREO;
    if (!/^\d{10}$/.test(f.telefonoMovil)) e.telefonoMovil = 'Debe tener 10 dígitos';
    if (f.telefonoAlternativo && !/^\d{10}$/.test(f.telefonoAlternativo)) e.telefonoAlternativo = 'Debe tener 10 dígitos';
  }
  if (paso === 2) {
    ['calle', 'numeroExterior', 'colonia', 'municipio', 'estado', 'pais', 'ocupacion', 'empresa', 'ingresoMensual'].forEach((k) => req(k));
    if (!/^\d{5}$/.test(f.codigoPostal)) e.codigoPostal = '5 dígitos';
    ['calle', 'colonia', 'ocupacion', 'empresa'].forEach((k) => {
      if (!e[k] && faltaMinimo(f[k], MINIMOS[k])) e[k] = faltaMinimo(f[k], MINIMOS[k]);
    });
    if (!PASSWORD_REGEX.test(f.password)) e.password = 'No cumple las reglas de seguridad';
    if (f.password !== f.confirmacion) e.confirmacion = 'Las contraseñas no coinciden';
    if (!f.acepto) e.acepto = 'Debes aceptar para continuar';
  }
  return e;
}

function armarPeticion(f) {
  const n = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));
  return {
    datosPersonales: {
      nombre: f.nombre.trim(), segundoNombre: f.segundoNombre.trim() || undefined,
      apellidoPaterno: f.apellidoPaterno.trim(), apellidoMaterno: f.apellidoMaterno.trim(),
      fechaNacimiento: f.fechaNacimiento, curp: f.curp, rfc: f.rfc,
      sexo: f.sexo, nacionalidad: f.nacionalidad, estadoCivil: f.estadoCivil,
    },
    datosContacto: {
      correoElectronico: f.correoElectronico.trim(), telefonoMovil: n(f.telefonoMovil), telefonoAlternativo: n(f.telefonoAlternativo),
    },
    domicilio: {
      calle: f.calle.trim(), numeroExterior: n(f.numeroExterior), numeroInterior: n(f.numeroInterior),
      colonia: f.colonia.trim(), municipio: f.municipio.trim(), estado: f.estado, codigoPostal: f.codigoPostal, pais: f.pais,
    },
    informacionLaboral: { ocupacion: f.ocupacion.trim(), empresa: f.empresa.trim(), ingresoMensual: num(f.ingresoMensual) },
    password: f.password,
  };
}

export default function Registro() {
  const [paso, setPaso] = useState(0);
  const [f, setF] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [creado, setCreado] = useState(null);

  const set = (k, transformar) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((p) => ({ ...p, [k]: transformar ? transformar(v) : v }));
    setErrores((p) => ({ ...p, [k]: undefined }));
  };
  const mayus = (v) => v.toUpperCase().replace(/\s/g, '');
  const digitos = (max) => (v) => v.replace(/\D/g, '').slice(0, max);

  const siguiente = (e) => {
    e.preventDefault();
    const errs = validarPaso(paso, f);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    if (paso < 2) setPaso(paso + 1);
    else enviar();
  };

  const enviar = async () => {
    setError(''); setCargando(true);
    try {
      const r = await clientesApi.registrar(armarPeticion(f));
      setCreado(r.data);
    } catch (err) {
      setError(err.message);
      if (err.campos) {
        // El backend devuelve rutas tipo "datosPersonales.curp" o solo "curp".
        const mapa = {};
        Object.entries(err.campos).forEach(([k, v]) => { mapa[k.split('.').pop()] = v; });
        setErrores(mapa);
        const p = CAMPOS_PASO.findIndex((campos) => campos.some((c) => mapa[c]));
        if (p >= 0) setPaso(p);
      }
    } finally {
      setCargando(false);
    }
  };

  if (creado) {
    const cuenta = creado.cuentaBancaria?.numeroCuenta || creado.cuentas?.[0]?.numeroCuenta;
    return (
      <Marco>
        <div className="text-center py-6 animar">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-2xl font-bold">✓</div>
          <h3 className="text-xl font-black text-slate-900 mt-3">¡Tu cuenta digital está lista!</h3>
          <p className="text-sm text-slate-500 mt-1">Hola {creado.datosPersonales?.nombre}, aperturamos tu cuenta de débito.</p>
          {cuenta && (
            <div className="inline-block mt-4 bg-blue-50 px-6 py-4 rounded-lg text-left">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Número de cuenta</span>
              <p className="font-mono text-lg font-bold text-slate-900">{cuentaAgrupada(cuenta)}</p>
              <span className="text-xs text-slate-500">Saldo inicial: $0.00 MXN</span>
            </div>
          )}
          <Alerta tipo="info" className="mt-5 text-left">
            Siguiente paso: inicia sesión y configura tu <b>PIN de seguridad</b> en Inicio. Lo necesitarás para pagar y modificar tus datos.
          </Alerta>
          <Link to="/login" className="inline-block mt-5"><Boton>Iniciar sesión →</Boton></Link>
        </div>
      </Marco>
    );
  }

  const curpOk = CURP_REGEX.test(f.curp);
  const rfcOk = RFC_REGEX.test(f.rfc);

  return (
    <Marco>
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Apertura de Cuenta Digital</h3>
          <p className="text-xs text-slate-400">Paso {paso + 1} de 3: {PASOS[paso]}</p>
        </div>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">KYC Oficial</span>
      </div>

      <div className="flex gap-1.5 mb-5">
        {PASOS.map((p, i) => (
          <div key={p} className={`h-1.5 flex-1 rounded-full transition ${i <= paso ? 'bg-blue-600' : 'bg-slate-200'}`} />
        ))}
      </div>

      <Alerta className="mb-3">{error}</Alerta>

      <form onSubmit={siguiente} className="space-y-3" noValidate>
        {paso === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animar">
            <Campo label="Nombre" maxLength={LIMITES.nombre} minimo={MINIMOS.nombre} value={f.nombre} onChange={set('nombre', FILTROS.letras)} error={errores.nombre} />
            <Campo label="Segundo nombre (opcional)" maxLength={LIMITES.nombre} minimo={MINIMOS.nombre} value={f.segundoNombre} onChange={set('segundoNombre', FILTROS.letras)} error={errores.segundoNombre} />
            <Campo label="Apellido paterno" maxLength={LIMITES.nombre} minimo={MINIMOS.nombre} value={f.apellidoPaterno} onChange={set('apellidoPaterno', FILTROS.letras)} error={errores.apellidoPaterno} />
            <Campo label="Apellido materno" maxLength={LIMITES.nombre} minimo={MINIMOS.nombre} value={f.apellidoMaterno} onChange={set('apellidoMaterno', FILTROS.letras)} error={errores.apellidoMaterno} />
            <Campo label="Fecha de nacimiento" type="date" min={haceAnios(EDAD_MAXIMA + 1)} max={haceAnios(EDAD_MINIMA)} value={f.fechaNacimiento} onChange={set('fechaNacimiento')} error={errores.fechaNacimiento} />
            <Selector label="Sexo" opciones={SEXOS} value={f.sexo} onChange={set('sexo')} error={errores.sexo} />
            <Selector label="Estado civil" opciones={ESTADOS_CIVILES} value={f.estadoCivil} onChange={set('estadoCivil')} error={errores.estadoCivil} />
            <Selector label="Nacionalidad" opciones={NACIONALIDADES} value={f.nacionalidad} onChange={set('nacionalidad')} error={errores.nacionalidad} />
          </div>
        )}

        {paso === 1 && (
          <div className="space-y-3 animar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="CURP" value={f.curp} maxLength={18} onChange={set('curp', mayus)} error={errores.curp}
                className="[&_input]:font-mono [&_input]:uppercase"
                ayuda={f.curp && (curpOk
                  ? <span className="text-emerald-600 font-semibold">✓ Formato de CURP válido</span>
                  : <span className="text-slate-400">{f.curp.length}/18 caracteres</span>)} />
              <Campo label="RFC con homoclave" value={f.rfc} maxLength={13} onChange={set('rfc', mayus)} error={errores.rfc}
                className="[&_input]:font-mono [&_input]:uppercase"
                ayuda={f.rfc && (rfcOk
                  ? <span className="text-emerald-600 font-semibold">✓ Estructura fiscal correcta</span>
                  : <span className="text-slate-400">12 o 13 caracteres</span>)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Nombre completo" disabled value={[f.nombre, f.segundoNombre, f.apellidoPaterno, f.apellidoMaterno].filter(Boolean).join(' ').toUpperCase()} />
              <Campo label="Correo electrónico" type="email" maxLength={100} value={f.correoElectronico}
                onChange={set('correoElectronico', (v) => v.replace(/\s/g, ''))} error={errores.correoElectronico}
                ayuda={f.correoElectronico && (CORREO_REGEX.test(f.correoElectronico)
                  ? <span className="text-emerald-600 font-semibold">✓ Correo válido</span>
                  : <span className="text-slate-400">Debe tener @ y terminar en .com o .mx</span>)} />
              <Campo label="Teléfono móvil" inputMode="numeric" value={f.telefonoMovil} onChange={set('telefonoMovil', digitos(10))} error={errores.telefonoMovil} placeholder="4181234567" />
              <Campo label="Teléfono alternativo (opcional)" inputMode="numeric" value={f.telefonoAlternativo} onChange={set('telefonoAlternativo', digitos(10))} error={errores.telefonoAlternativo} />
            </div>
            <p className="text-[11px] text-slate-400">La CURP, el RFC, el correo y el teléfono deben ser únicos; el sistema los verifica al completar el registro.</p>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4 animar">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Domicilio</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Campo label="Calle" className="col-span-2" maxLength={LIMITES.calle} minimo={MINIMOS.calle} value={f.calle} onChange={set('calle', FILTROS.direccion)} error={errores.calle} />
                <Campo label="Núm. ext." inputMode="numeric" value={f.numeroExterior} onChange={set('numeroExterior', digitos(6))} error={errores.numeroExterior} />
                <Campo label="Núm. int. (opcional)" inputMode="numeric" value={f.numeroInterior} onChange={set('numeroInterior', digitos(6))} error={errores.numeroInterior} />
                <Campo label="Colonia" className="col-span-2" maxLength={LIMITES.colonia} minimo={MINIMOS.colonia} value={f.colonia} onChange={set('colonia', FILTROS.direccion)} error={errores.colonia} />
                <Selector label="Municipio" className="col-span-2" opciones={opcionesMunicipio(f.estado)} value={f.municipio} onChange={set('municipio')}
                  error={errores.municipio} disabled={!f.estado}
                  vacio={f.estado ? 'Selecciona…' : 'Primero elige el estado'} />
                <Selector label="Estado" className="col-span-2" opciones={ESTADOS} value={f.estado} error={errores.estado}
                  onChange={(e) => { const v = e.target.value; setF((p) => ({ ...p, estado: v, municipio: '' })); setErrores((p) => ({ ...p, estado: undefined })); }} />
                <Campo label="C.P." inputMode="numeric" value={f.codigoPostal} onChange={set('codigoPostal', digitos(5))} error={errores.codigoPostal} />
                <Selector label="País" opciones={PAISES} value={f.pais} onChange={set('pais')} error={errores.pais} />
              </div>
              {!esMexico(f.pais) && (
                <Alerta tipo="info" className="mt-2">Por ahora el estado y el código postal solo admiten domicilios dentro de México.</Alerta>
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Información laboral</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Campo label="Ocupación" maxLength={LIMITES.ocupacion} minimo={MINIMOS.ocupacion} value={f.ocupacion} onChange={set('ocupacion', FILTROS.ocupacion)} error={errores.ocupacion} />
                <Campo label="Empresa" maxLength={LIMITES.empresa} minimo={MINIMOS.empresa} value={f.empresa} onChange={set('empresa', FILTROS.empresa)} error={errores.empresa} />
                <Campo label="Ingreso mensual" inputMode="decimal" value={f.ingresoMensual} error={errores.ingresoMensual} aviso={avisoIngreso(f.ingresoMensual)} placeholder="0.00"
                  onChange={(e) => { const v = e.target.value; setF((p) => ({ ...p, ingresoMensual: filtrarIngreso(v, p.ingresoMensual) })); setErrores((p) => ({ ...p, ingresoMensual: undefined })); }}
                  ayuda={<span className="text-slate-400">Máximo 15 dígitos y 2 decimales</span>} />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Contraseña de acceso</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo label="Contraseña" type="password" autoComplete="new-password" maxLength={LIMITES.password} value={f.password} onChange={set('password')} error={errores.password}
                  ayuda={<span className={PASSWORD_REGEX.test(f.password) ? 'text-emerald-600' : 'text-slate-400'}>8+ caracteres, mayúscula, minúscula, número y especial</span>} />
                <Campo label="Confirmar contraseña" type="password" autoComplete="new-password" maxLength={LIMITES.password} value={f.confirmacion} onChange={set('confirmacion')} error={errores.confirmacion} />
              </div>
            </div>
            <div className={`bg-slate-50 border p-3 rounded-xl ${errores.acepto ? 'border-rose-300' : 'border-slate-200'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={f.acepto} onChange={set('acepto')} className="rounded text-blue-600" />
                <span className="text-xs text-slate-700">Acepto la creación de mi cuenta y el contrato de depósito mercantil.</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center gap-2 pt-3">
          {paso > 0
            ? <Boton type="button" variante="secundario" onClick={() => setPaso(paso - 1)}>← Atrás</Boton>
            : <Link to="/login" className="text-xs text-slate-500 hover:text-slate-800">¿Ya tienes cuenta? Inicia sesión</Link>}
          <Boton type="submit" cargando={cargando}>
            {paso < 2 ? 'Continuar →' : 'Completar Registro y Aperturar Cuenta →'}
          </Boton>
        </div>
      </form>
    </Marco>
  );
}

function Marco({ children }) {
  return <AuthLayout ancho="max-w-3xl">{children}</AuthLayout>;
}
