import { useCallback, useEffect, useState } from 'react';
import { clientesApi } from '../api/servicios';
import { num } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { Alerta, Boton, Campo, Cargando, Selector } from '../components/ui';
import { ModalAutorizar } from '../components/Pin';
import { Encabezado } from './Billetera';
import {
  ESTADOS, ESTADOS_CIVILES, LIMITES, PAISES, avisoIngreso, esMexico, filtrarIngreso, municipioDeLista, nombreEstado, opcionesMunicipio, textoEnum, valorDeLista,
} from '../utils/catalogos';
import { CORREO_REGEX, formatoFecha, formatoMoneda } from '../utils/formato';

// Campos editables (PATCH /clientes acepta estos nombres planos).
const EDITABLES = ['estadoCivil', 'correoElectronico', 'telefonoMovil', 'telefonoAlternativo', 'calle', 'numeroExterior',
  'numeroInterior', 'colonia', 'municipio', 'estado', 'codigoPostal', 'pais', 'ocupacion', 'empresa', 'ingresoMensual'];
const NUMERICOS = ['telefonoMovil', 'telefonoAlternativo', 'numeroExterior', 'numeroInterior', 'ingresoMensual'];

function aplanar(c) {
  return {
    estadoCivil: c.datosPersonales?.estadoCivil, ...c.datosContacto, ...c.domicilio, ...c.informacionLaboral,
    pais: valorDeLista(PAISES, c.domicilio?.pais),
    municipio: municipioDeLista(c.domicilio?.estado, c.domicilio?.municipio),
  };
}

const aTexto = (o) => Object.fromEntries(EDITABLES.map((k) => [k, o[k] === null || o[k] === undefined ? '' : String(o[k])]));

export default function Perfil() {
  const { usuario, cerrarSesion } = useAuth();
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [errores, setErrores] = useState({});
  const [autorizar, setAutorizar] = useState(null); // 'guardar' | 'baja'
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await clientesApi.detalle(usuario.clienteId);
      setCliente(r.data);
    } catch (e) {
      setError(e.message);
    }
  }, [usuario.clienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!cliente) return error ? <Alerta>{error}</Alerta> : <Cargando texto="Cargando tu perfil…" />;

  const original = aTexto(aplanar(cliente));
  const set = (k, filtro) => (e) => {
    const v = filtro ? filtro(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((x) => ({ ...x, [k]: undefined }));
  };
  const digitos = (max) => (v) => v.replace(/\D/g, '').slice(0, max);

  const cambios = () => Object.fromEntries(EDITABLES.filter((k) => form[k] !== original[k]).map((k) => [
    // El ingreso va sin redondear (hasta 15 dígitos enteros y 2 decimales).
    k, k === 'ingresoMensual' ? num(form[k]) : NUMERICOS.includes(k) ? (form[k] === '' ? null : Number(form[k])) : form[k].trim(),
  ]));

  const revisar = (e) => {
    e.preventDefault();
    const errs = {};
    if (!CORREO_REGEX.test(form.correoElectronico)) errs.correoElectronico = 'Correo inválido';
    if (!/^\d{10}$/.test(form.telefonoMovil)) errs.telefonoMovil = '10 dígitos';
    if (form.telefonoAlternativo && !/^\d{10}$/.test(form.telefonoAlternativo)) errs.telefonoAlternativo = '10 dígitos';
    if (!/^\d{5}$/.test(form.codigoPostal)) errs.codigoPostal = '5 dígitos';
    ['calle', 'numeroExterior', 'colonia', 'municipio', 'estado', 'pais', 'ocupacion', 'empresa', 'ingresoMensual']
      .forEach((k) => { if (!String(form[k]).trim()) errs[k] = 'Obligatorio'; });
    setErrores(errs);
    if (Object.keys(errs).length) return;
    if (!Object.keys(cambios()).length) { setEditando(false); return; }
    setAutorizar('guardar');
  };

  const guardar = async (pin) => {
    try {
      const r = await clientesApi.actualizarParcial({ id: cliente.id, ...cambios() }, pin);
      setAutorizar(null);
      setEditando(false);
      setMensaje('Tus datos se actualizaron correctamente.');
      if (r.data?.id) setCliente(r.data); else cargar();
    } catch (err) {
      if (err.campos) {
        const mapa = {};
        Object.entries(err.campos).forEach(([k, v]) => { mapa[k.split('.').pop()] = v; });
        setErrores(mapa);
        setAutorizar(null);
        setError(err.message);
        return;
      }
      throw err;
    }
  };

  const darDeBaja = async (pin) => {
    await clientesApi.baja(cliente.id, pin);
    setAutorizar(null);
    cerrarSesion({ llamarBackend: true, motivo: 'Tu cuenta fue dada de baja.' });
  };

  const dp = cliente.datosPersonales || {};
  const dc = cliente.datosContacto || {};
  const dom = cliente.domicilio || {};
  const lab = cliente.informacionLaboral || {};
  const nombre = [dp.nombre, dp.segundoNombre, dp.apellidoPaterno, dp.apellidoMaterno].filter(Boolean).join(' ');

  return (
    <div className="tarjeta p-5 md:p-6 space-y-4 animar">
      <Encabezado titulo="Mi Perfil" subtitulo={`Cliente desde ${formatoFecha(cliente.fechaCreacion, false)}`}>
        {!editando && <Boton onClick={() => { setForm(original); setErrores({}); setMensaje(''); setError(''); setEditando(true); }} className="text-xs">✏️ Editar datos</Boton>}
      </Encabezado>

      <Alerta tipo="exito">{mensaje}</Alerta>
      <Alerta>{error}</Alerta>

      <div className="bg-blue-50 p-5 rounded-lg flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-extrabold">
          {(dp.nombre?.[0] || '') + (dp.apellidoPaterno?.[0] || '')}
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">{nombre}</h3>
          <p className="text-sm text-slate-500">{cliente.usuario?.correo || dc.correoElectronico}</p>
        </div>
      </div>

      {!editando ? (
        <div className="grid md:grid-cols-2 gap-3">
          <Tarjeta titulo="Datos personales" filas={[
            ['CURP', <span className="font-mono">{dp.curp}</span>], ['RFC', <span className="font-mono">{dp.rfc}</span>],
            ['Fecha de nacimiento', formatoFecha(dp.fechaNacimiento, false)], ['Sexo', textoEnum(dp.sexo)],
            ['Estado civil', textoEnum(dp.estadoCivil)], ['Nacionalidad', textoEnum(dp.nacionalidad)],
          ]} />
          <Tarjeta titulo="Contacto" filas={[
            ['Correo', dc.correoElectronico], ['Teléfono móvil', dc.telefonoMovil], ['Teléfono alternativo', dc.telefonoAlternativo || '—'],
          ]} />
          <Tarjeta titulo="Domicilio" filas={[
            ['Calle', `${dom.calle || ''} ${dom.numeroExterior || ''}${dom.numeroInterior ? ` int. ${dom.numeroInterior}` : ''}`],
            ['Colonia', dom.colonia], ['Municipio', dom.municipio], ['Estado', nombreEstado(dom.estado)],
            ['C.P.', dom.codigoPostal], ['País', dom.pais],
          ]} />
          <Tarjeta titulo="Información laboral" filas={[
            ['Ocupación', lab.ocupacion], ['Empresa', lab.empresa], ['Ingreso mensual', formatoMoneda(lab.ingresoMensual)],
          ]} />
        </div>
      ) : (
        <form onSubmit={revisar} className="space-y-4 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">CURP, RFC, nombre y fecha de nacimiento no se pueden modificar desde aquí. Se solicitará tu PIN para guardar.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Campo label="Correo" value={form.correoElectronico} onChange={set('correoElectronico')} error={errores.correoElectronico} />
            <Campo label="Teléfono móvil" value={form.telefonoMovil} onChange={set('telefonoMovil', digitos(10))} error={errores.telefonoMovil} />
            <Campo label="Teléfono alternativo" value={form.telefonoAlternativo} onChange={set('telefonoAlternativo', digitos(10))} error={errores.telefonoAlternativo} />
            <Selector label="Estado civil" opciones={ESTADOS_CIVILES} value={form.estadoCivil} onChange={set('estadoCivil')} error={errores.estadoCivil} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo label="Calle" className="col-span-2" maxLength={LIMITES.calle} value={form.calle} onChange={set('calle')} error={errores.calle} />
            <Campo label="Núm. ext." value={form.numeroExterior} onChange={set('numeroExterior', digitos(6))} error={errores.numeroExterior} />
            <Campo label="Núm. int. (opcional)" value={form.numeroInterior} onChange={set('numeroInterior', digitos(6))} error={errores.numeroInterior} />
            <Campo label="Colonia" className="col-span-2" maxLength={LIMITES.colonia} value={form.colonia} onChange={set('colonia')} error={errores.colonia} />
            <Selector label="Municipio" className="col-span-2" opciones={opcionesMunicipio(form.estado, form.municipio)} value={form.municipio}
              onChange={set('municipio')} error={errores.municipio} disabled={!form.estado} />
            <Selector label="Estado" className="col-span-2" opciones={ESTADOS} value={form.estado} error={errores.estado}
              onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, estado: v, municipio: '' })); setErrores((x) => ({ ...x, estado: undefined })); }} />
            <Campo label="C.P." value={form.codigoPostal} onChange={set('codigoPostal', digitos(5))} error={errores.codigoPostal} />
            <Selector label="País" opciones={PAISES} value={form.pais} onChange={set('pais')} error={errores.pais} />
          </div>
          {!esMexico(form.pais) && (
            <Alerta tipo="info">Por ahora el estado y el código postal solo admiten domicilios dentro de México.</Alerta>
          )}
          <div className="grid sm:grid-cols-3 gap-3">
            <Campo label="Ocupación" maxLength={LIMITES.ocupacion} value={form.ocupacion} onChange={set('ocupacion')} error={errores.ocupacion} />
            <Campo label="Empresa" maxLength={LIMITES.empresa} value={form.empresa} onChange={set('empresa')} error={errores.empresa} />
            <Campo label="Ingreso mensual" inputMode="decimal" value={form.ingresoMensual} error={errores.ingresoMensual} aviso={avisoIngreso(form.ingresoMensual)}
              onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, ingresoMensual: filtrarIngreso(v, f.ingresoMensual) })); setErrores((x) => ({ ...x, ingresoMensual: undefined })); }} />
          </div>
          <div className="flex justify-end gap-2">
            <Boton type="button" variante="secundario" onClick={() => setEditando(false)}>Cancelar</Boton>
            <Boton type="submit">Guardar cambios</Boton>
          </div>
        </form>
      )}

      <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-bold text-rose-800 text-sm">Dar de baja mi cuenta</p>
          <p className="text-xs text-rose-700/80">Tu acceso se desactivará y se cerrará tu sesión. Esta acción requiere tu PIN.</p>
        </div>
        {!confirmarBaja
          ? <Boton variante="secundario" className="text-rose-700 border-rose-200 text-xs" onClick={() => setConfirmarBaja(true)}>Dar de baja</Boton>
          : (
            <div className="flex gap-2">
              <Boton variante="secundario" className="text-xs" onClick={() => setConfirmarBaja(false)}>Cancelar</Boton>
              <Boton variante="peligro" className="text-xs" onClick={() => setAutorizar('baja')}>Sí, continuar</Boton>
            </div>
          )}
      </div>

      <ModalAutorizar
        abierto={autorizar === 'guardar'}
        titulo="Confirmar cambios"
        textoBoton="Guardar"
        onCerrar={() => setAutorizar(null)}
        onConfirmar={guardar}
        resumen={<p className="text-sm text-slate-600">Se actualizarán {Object.keys(autorizar === 'guardar' ? cambios() : {}).length} campo(s) de tu información.</p>}
      />
      <ModalAutorizar
        abierto={autorizar === 'baja'}
        titulo="Dar de baja mi cuenta"
        textoBoton="Dar de baja"
        variante="peligro"
        onCerrar={() => { setAutorizar(null); setConfirmarBaja(false); }}
        onConfirmar={darDeBaja}
        resumen={<Alerta tipo="aviso">Esta acción desactiva tu acceso a la plataforma y cierra tu sesión.</Alerta>}
      />
    </div>
  );
}

function Tarjeta({ titulo, filas }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">{titulo}</div>
      <dl className="p-4 space-y-2 text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-slate-400">{k}</dt>
            <dd className="text-slate-800 font-medium text-right break-all">{v || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
