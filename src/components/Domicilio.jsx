import { useEffect, useRef, useState } from 'react';
import { Campo, Selector, Spinner } from './ui';
import { clientesApi } from '../api/servicios';
import { ESTADOS, FILTROS, LIMITES, MINIMOS, PAISES, normalizar, opcionesMunicipio } from '../utils/catalogos';

const digitos = (max) => (v) => v.replace(/\D/g, '').slice(0, max);

/**
 * Consulta el código postal (catálogo de SEPOMEX) cuando tiene 5 dígitos.
 * `alEncontrar(datos)` recibe { codigoPostal, estado, municipio, colonias } para llenar el formulario.
 * Si no se encuentra o falla la consulta, solo se informa: el usuario puede llenar los datos a mano.
 */
export function useCodigoPostal(codigoPostal, alEncontrar) {
  const [estado, setEstado] = useState({ cargando: false, datos: null, aviso: '' });
  const callback = useRef(alEncontrar);
  callback.current = alEncontrar;

  useEffect(() => {
    if (!/^\d{5}$/.test(codigoPostal || '')) {
      setEstado({ cargando: false, datos: null, aviso: '' });
      return undefined;
    }
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true, aviso: '' }));
    clientesApi.codigoPostal(codigoPostal)
      .then((r) => {
        if (!vigente) return;
        setEstado({ cargando: false, datos: r.data, aviso: '' });
        callback.current?.(r.data);
      })
      .catch((err) => {
        if (!vigente) return;
        setEstado({
          cargando: false,
          datos: null,
          aviso: err.status === 404
            ? 'No encontramos ese código postal. Llena estado, municipio y colonia manualmente.'
            : 'No pudimos consultar el código postal. Llena estado, municipio y colonia manualmente.',
        });
      });
    return () => { vigente = false; };
  }, [codigoPostal]);

  return estado;
}

/**
 * Campos de domicilio. Si el usuario solo escribe el C.P., se llenan solos estado, municipio y colonia
 * (catálogo de SEPOMEX); también se pueden llenar o corregir a mano. Lo que el usuario escribió no se sobrescribe:
 * solo se reemplazan campos vacíos o los que se llenaron automáticamente con un C.P. anterior.
 * - `form`: { codigoPostal, estado, municipio, colonia, calle, numeroExterior, numeroInterior, pais }
 * - `actualizar(cambios)`: aplica cambios al formulario.
 */
export default function CamposDomicilio({ form, actualizar, errores = {} }) {
  const automaticos = useRef({}); // valores que puso el C.P. (se pueden reemplazar con otro C.P.)

  const cp = useCodigoPostal(form.codigoPostal, (datos) => {
    const sugerida = (datos.colonias || []).find((c) => normalizar(c) === normalizar(form.colonia))
      || (datos.colonias?.length === 1 ? datos.colonias[0] : '');
    const nuevos = { estado: datos.estado, municipio: datos.municipio, colonia: sugerida };
    const cambios = {};
    Object.entries(nuevos).forEach(([k, v]) => {
      const actual = form[k] || '';
      const reemplazable = !actual || actual === automaticos.current[k];
      if (reemplazable && v !== actual) cambios[k] = v;
      if (reemplazable) automaticos.current[k] = v;
    });
    if (Object.keys(cambios).length) actualizar(cambios);
  });

  const set = (k, filtro) => (e) => actualizar({ [k]: filtro ? filtro(e.target.value) : e.target.value });
  const colonias = cp.datos?.colonias || [];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Campo label="Código postal" inputMode="numeric" value={form.codigoPostal} onChange={set('codigoPostal', digitos(5))}
        error={errores.codigoPostal} placeholder="37800"
        aviso={cp.aviso || undefined}
        ayuda={cp.cargando
          ? <span className="text-slate-400 inline-flex items-center gap-1"><Spinner className="w-3 h-3" /> Buscando…</span>
          : cp.datos ? <span className="text-emerald-600 font-semibold">✓ Domicilio llenado con tu C.P.</span>
            : <span className="text-slate-400">Escríbelo y llenamos estado, municipio y colonia</span>} />
      <Selector label="Estado" className="col-span-1" opciones={ESTADOS} value={form.estado} error={errores.estado}
        onChange={(e) => actualizar({ estado: e.target.value, municipio: '' })} />
      <Selector label="Municipio" className="col-span-2" opciones={opcionesMunicipio(form.estado, form.municipio)} value={form.municipio}
        onChange={set('municipio')} error={errores.municipio} disabled={!form.estado}
        vacio={form.estado ? 'Selecciona…' : 'Primero elige el estado'} />
      <Campo label="Colonia" className="col-span-2" list="colonias-cp" autoComplete="off" maxLength={LIMITES.colonia}
        value={form.colonia} onChange={set('colonia', FILTROS.colonia)} error={errores.colonia}
        placeholder={colonias.length > 1 ? 'Escribe o elige tu colonia' : ''}
        ayuda={colonias.length > 1 ? <span className="text-slate-400">Tu C.P. tiene {colonias.length} colonias: escribe para ver la lista</span> : undefined} />
      <datalist id="colonias-cp">
        {colonias.map((c) => <option key={c} value={c} />)}
      </datalist>
      <Selector label="País" className="col-span-2" opciones={PAISES} value={form.pais} onChange={set('pais')} error={errores.pais} />
      <Campo label="Calle" className="col-span-2" maxLength={LIMITES.calle} minimo={MINIMOS.calle} value={form.calle}
        onChange={set('calle', FILTROS.direccion)} error={errores.calle} />
      <Campo label="Núm. ext." inputMode="numeric" value={form.numeroExterior} onChange={set('numeroExterior', digitos(6))} error={errores.numeroExterior} />
      <Campo label="Núm. int. (opcional)" inputMode="numeric" value={form.numeroInterior} onChange={set('numeroInterior', digitos(6))} error={errores.numeroInterior} />
    </div>
  );
}

/**
 * Verifica (con 0.5 s de espera) si el correo ya está registrado.
 * Devuelve 'verificando' | 'disponible' | 'ocupado' | null (sin verificar, formato inválido o sin respuesta).
 */
export function useCorreoDisponible(correo, formatoValido) {
  const [estado, setEstado] = useState(null);
  useEffect(() => {
    if (!formatoValido) { setEstado(null); return undefined; }
    let vigente = true;
    setEstado('verificando');
    const t = setTimeout(() => {
      clientesApi.correoDisponible(correo.trim())
        .then((r) => { if (vigente) setEstado(r.data?.disponible ? 'disponible' : 'ocupado'); })
        .catch(() => { if (vigente) setEstado(null); });
    }, 500);
    return () => { vigente = false; clearTimeout(t); };
  }, [correo, formatoValido]);
  return estado;
}
