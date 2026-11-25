import { useEffect, useRef, useState } from 'react';
import { Campo, Selector, Spinner } from './ui';
import { clientesApi } from '../api/servicios';
import { FILTROS, LIMITES, MINIMOS, PAISES, nombreEstado, normalizar } from '../utils/catalogos';

const digitos = (max) => (v) => v.replace(/\D/g, '').slice(0, max);

/**
 * Consulta el código postal (catálogo de SEPOMEX) cuando tiene 5 dígitos.
 * `alEncontrar(datos)` recibe { codigoPostal, estado, municipio, colonias } para llenar el formulario.
 */
export function useCodigoPostal(codigoPostal, alEncontrar) {
  const [estado, setEstado] = useState({ cargando: false, datos: null, error: '' });
  const callback = useRef(alEncontrar);
  callback.current = alEncontrar;

  useEffect(() => {
    if (!/^\d{5}$/.test(codigoPostal || '')) {
      setEstado({ cargando: false, datos: null, error: '' });
      return undefined;
    }
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true, error: '' }));
    clientesApi.codigoPostal(codigoPostal)
      .then((r) => {
        if (!vigente) return;
        setEstado({ cargando: false, datos: r.data, error: '' });
        callback.current?.(r.data);
      })
      .catch((err) => {
        if (!vigente) return;
        setEstado({ cargando: false, datos: null, error: err.status === 404 ? 'No encontramos ese código postal' : err.message });
        callback.current?.(null);
      });
    return () => { vigente = false; };
  }, [codigoPostal]);

  return estado;
}

/** Colonias del código postal; si la guardada no está en la lista (cliente anterior), se agrega para no perderla. */
function opcionesColonia(datos, actual) {
  const lista = (datos?.colonias || []).map((c) => ({ valor: c, texto: c }));
  if (actual && !lista.some((o) => normalizar(o.valor) === normalizar(actual))) lista.unshift({ valor: actual, texto: actual });
  return lista;
}

/** Colonia con el formato del catálogo (si coincide sin importar acentos o mayúsculas). */
function coloniaDeLista(datos, actual) {
  const encontrada = (datos?.colonias || []).find((c) => normalizar(c) === normalizar(actual));
  if (encontrada) return encontrada;
  return datos?.colonias?.length === 1 ? datos.colonias[0] : '';
}

/**
 * Campos de domicilio: el C.P. va primero y llena solos estado, municipio y colonia (si hay varias colonias se elige
 * de la lista). El usuario solo escribe calle y números.
 * - `form`: { codigoPostal, estado, municipio, colonia, calle, numeroExterior, numeroInterior, pais }
 * - `actualizar(cambios)`: aplica cambios al formulario.
 * - `conservarColonia`: en Mi perfil, al cargar se respeta la colonia guardada aunque no esté en el catálogo.
 */
export default function CamposDomicilio({ form, actualizar, errores = {}, conservarColonia = false }) {
  const primeraCarga = useRef(conservarColonia);
  const cp = useCodigoPostal(form.codigoPostal, (datos) => {
    if (!datos) {
      if (!primeraCarga.current) actualizar({ estado: '', municipio: '', colonia: '' });
      primeraCarga.current = false;
      return;
    }
    const colonia = primeraCarga.current && form.colonia ? form.colonia : coloniaDeLista(datos, form.colonia);
    primeraCarga.current = false;
    actualizar({ estado: datos.estado, municipio: datos.municipio, colonia });
  });

  const set = (k, filtro) => (e) => actualizar({ [k]: filtro ? filtro(e.target.value) : e.target.value });
  const automatico = (valor) => (cp.cargando ? 'Buscando…' : valor || 'Se llena con el C.P.');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Campo label="Código postal" inputMode="numeric" value={form.codigoPostal} onChange={set('codigoPostal', digitos(5))}
        error={errores.codigoPostal || cp.error || undefined} placeholder="37800"
        ayuda={cp.cargando
          ? <span className="text-slate-400 inline-flex items-center gap-1"><Spinner className="w-3 h-3" /> Buscando…</span>
          : cp.datos ? <span className="text-emerald-600 font-semibold">✓ Código postal encontrado</span>
            : <span className="text-slate-400">Escribe tus 5 dígitos para llenar el domicilio</span>} />
      <Campo label="Estado" className="col-span-1 sm:col-span-1" value={automatico(form.estado ? nombreEstado(form.estado) : '')} disabled readOnly error={errores.estado} />
      <Campo label="Municipio" className="col-span-2" value={automatico(form.municipio)} disabled readOnly error={errores.municipio} />
      <Selector label="Colonia" className="col-span-2" opciones={opcionesColonia(cp.datos, form.colonia)} value={form.colonia}
        onChange={set('colonia')} error={errores.colonia} disabled={!cp.datos}
        vacio={cp.datos ? 'Selecciona tu colonia…' : 'Se llena con el C.P.'} />
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
 * Devuelve 'verificando' | 'disponible' | 'ocupado' | null (sin verificar o con formato inválido).
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
