import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalogoApi, pagosApi } from '../api/servicios';
import { useCuentas } from '../layout/AppLayout';
import { Alerta, Boton, Campo, Cargando, LogoServicio, Modal } from '../components/ui';
import { ModalAutorizar } from '../components/Pin';
import Ticket from '../components/Ticket';
import { Encabezado } from './Billetera';
import { formatoMoneda, nuevoUuid, ultimos4 } from '../utils/formato';

const TAMANO = 12;
const PAGABLE = [1, 2];

export default function Pagos() {
  const [params] = useSearchParams();
  const { cuentas, principal, recargarCuentas } = useCuentas();

  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [pagina, setPagina] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [producto, setProducto] = useState(null);
  const [referencia, setReferencia] = useState('');
  const [monto, setMonto] = useState('');
  const [numCuenta, setNumCuenta] = useState('');
  const [errores, setErrores] = useState({});
  const [autorizar, setAutorizar] = useState(false);
  const [pago, setPago] = useState(null);
  const [ayuda, setAyuda] = useState(false);

  const clave = useRef(null); // idempotencyKey del intento actual
  const formRef = useRef(null);

  const activas = (cuentas || []).filter((c) => c.estado === 'ACTIVA');
  const cuenta = activas.find((c) => c.numeroCuenta === numCuenta) || (principal?.estado === 'ACTIVA' ? principal : activas[0]);

  // Categorías (y la que venga en la URL, si existe)
  useEffect(() => {
    catalogoApi.categorias().then((lista) => {
      const nombres = (lista || []).map((c) => (typeof c === 'string' ? c : c.nombre || c.categoria)).filter(Boolean);
      setCategorias(nombres);
      const deUrl = params.get('categoria');
      if (deUrl && nombres.includes(deUrl)) setCategoria(deUrl);
    }).catch(() => {});
  }, [params]);

  // Búsqueda con retardo
  useEffect(() => {
    const t = setTimeout(() => { setBusqueda(texto.trim()); setPagina(0); }, 350);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => {
    let vigente = true;
    setCargando(true); setError('');
    catalogoApi.productos({ pagina, tamano: TAMANO, categoria, busqueda })
      .then((d) => vigente && setResultado(d))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [pagina, categoria, busqueda]);

  const elegir = (p) => {
    setProducto(p);
    setReferencia('');
    setMonto(p.price ? String(p.price) : '');
    setErrores({});
    clave.current = null;
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  const esRecarga = producto?.tipoFront === 1;
  const pagable = producto && PAGABLE.includes(producto.tipoFront);

  const continuar = (e) => {
    e.preventDefault();
    const errs = {};
    if (esRecarga && !/^\d{10}$/.test(referencia)) errs.referencia = 'Ingresa un número celular de 10 dígitos';
    if (!esRecarga && !/^[A-Za-z0-9-]{4,100}$/.test(referencia)) {
      errs.referencia = referencia.length < 4
        ? 'La referencia debe tener al menos 4 caracteres'
        : 'La referencia solo admite letras, números y guiones';
    }
    if (!(Number(monto) > 0)) errs.monto = 'El monto debe ser mayor a cero';
    if (!cuenta) errs.cuenta = 'No tienes una cuenta activa para el cargo';
    else {
      // El saldo mostrado es el total; lo retenido por pagos en verificación no se puede gastar.
      const retenido = Number(cuenta.saldoRetenido || 0);
      const disponible = Math.max(0, Number(cuenta.saldo) - retenido);
      if (Number(monto) > Number(cuenta.saldo)) errs.monto = 'Saldo insuficiente en la cuenta seleccionada';
      else if (Number(monto) > disponible) {
        errs.monto = `Saldo insuficiente: ${formatoMoneda(retenido)} está retenido por pagos en verificación. Disponible para pagar: ${formatoMoneda(disponible)}`;
      }
    }
    setErrores(errs);
    if (!Object.keys(errs).length) setAutorizar(true);
  };

  const pagar = async (pin) => {
    // La clave se genera una vez por intento y se conserva si hay timeout o error de red.
    if (!clave.current) clave.current = nuevoUuid();
    try {
      const r = await pagosApi.pagar({
        numCuenta: cuenta.numeroCuenta, producto, monto, referencia: referencia.trim(), idempotencyKey: clave.current,
      }, pin);
      clave.current = null;
      setAutorizar(false);
      setPago(r.data);
      recargarCuentas();
    } catch (err) {
      if (err.red) {
        const e = new Error('No pudimos confirmar el resultado. Reintenta: no se te cobrará dos veces.');
        throw e;
      }
      clave.current = null;
      if (err.code === '40906') err.message = 'Ya realizaste un pago idéntico hace menos de 5 minutos. Revisa tu historial.';
      throw err;
    }
  };

  const [verificando, setVerificando] = useState(false);
  const verificar = async () => {
    setVerificando(true);
    try {
      const r = await pagosApi.verificar(pago.folio);
      setPago(r.data);
      recargarCuentas();
    } catch (e) {
      setError(e.message);
    } finally {
      setVerificando(false);
    }
  };

  const productos = resultado?.contenido || [];

  return (
    <div className="tarjeta p-5 md:p-6 space-y-4 animar">
      <Encabezado titulo="Recargas y servicios" subtitulo="Recargas, tarjetas de regalo y pago de servicios">
        <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre (ej. CFE)…"
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-72 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
      </Encabezado>

      {categorias.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['', ...categorias].map((c) => (
            <button key={c || 'todas'} onClick={() => { setCategoria(c); setPagina(0); }}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border transition cursor-pointer ${categoria === c
                ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {c || 'Todas'}
            </button>
          ))}
        </div>
      )}

      <Alerta>{error}</Alerta>

      {cargando && !resultado ? <Cargando texto="Cargando catálogo…" /> : (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 transition ${cargando ? 'opacity-50' : ''}`}>
            {productos.map((p) => {
              const sel = producto?.id === p.id;
              return (
                <button key={p.id} onClick={() => elegir(p)}
                  className={`text-left p-3 rounded-xl transition cursor-pointer flex gap-3 items-start ${sel
                    ? 'border-2 border-blue-600 bg-blue-50/50' : 'border border-slate-200 bg-white hover:border-slate-300'}`}>
                  <LogoServicio url={p.logoUrl} nombre={p.name} />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 text-sm leading-tight">{p.name}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{p.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {p.price > 0 && <span className="text-xs font-black text-slate-800">{formatoMoneda(p.price)}</span>}
                      <span className="text-[10px] text-slate-400">{p.tipoFront === 1 ? 'Recarga' : p.tipoFront === 2 ? 'Servicio' : 'No disponible'}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {productos.length === 0 && !cargando && <p className="text-center text-sm text-slate-400 py-8">No encontramos productos con esos filtros.</p>}
          {resultado && resultado.totalPaginas > 1 && (
            <div className="flex justify-center items-center gap-3 text-xs">
              <Boton variante="secundario" className="text-xs py-1" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>← Anterior</Boton>
              <span className="text-slate-500">Página {pagina + 1} de {resultado.totalPaginas}</span>
              <Boton variante="secundario" className="text-xs py-1" disabled={resultado.esUltima} onClick={() => setPagina(pagina + 1)}>Siguiente →</Boton>
            </div>
          )}
        </>
      )}

      {producto && (
        <form ref={formRef} onSubmit={continuar} className="bg-slate-50 border border-slate-200 p-4 rounded-xl animar">
          <div className="flex items-center gap-3 mb-3">
            <LogoServicio url={producto.logoUrl} nombre={producto.name} className="w-9 h-9" />
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-sm">{producto.name}</p>
              {producto.description && <p className="text-[11px] text-slate-500 line-clamp-1">{producto.description}</p>}
            </div>
            <button type="button" onClick={() => setProducto(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
          </div>

          {!pagable ? (
            <Alerta tipo="aviso">Este producto todavía no se puede pagar en línea.</Alerta>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
              <Campo
                label={esRecarga ? 'Número celular' : 'Referencia de recibo'}
                value={referencia}
                inputMode={esRecarga ? 'numeric' : 'text'}
                maxLength={esRecarga ? 10 : 100}
                placeholder={esRecarga ? '4181234567' : 'Número de contrato o servicio'}
                onChange={(e) => setReferencia(esRecarga ? e.target.value.replace(/\D/g, '') : e.target.value.replace(/[^A-Za-z0-9-]/g, ''))}
                error={errores.referencia}
                className="[&_input]:font-mono [&_input]:bg-white"
                ayuda={!esRecarga && producto.imagenReferenciaUrl && (
                  <button type="button" onClick={() => setAyuda(true)} className="text-blue-600 underline cursor-pointer">¿Dónde encuentro mi referencia?</button>
                )}
              />
              <Campo label="Monto" type="number" min="0" step="0.01" value={monto} readOnly={esRecarga && producto.price > 0}
                onChange={(e) => setMonto(e.target.value)} error={errores.monto} className="[&_input]:font-bold [&_input]:bg-white" />
              <Campo label="Cuenta de cargo" error={errores.cuenta}>
                <select value={cuenta?.numeroCuenta || ''} onChange={(e) => setNumCuenta(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm mt-1">
                  {activas.map((c) => (
                    <option key={c.numeroCuenta} value={c.numeroCuenta}>•••• {ultimos4(c.numeroCuenta)} — {formatoMoneda(c.saldo)}</option>
                  ))}
                </select>
              </Campo>
              <Boton type="submit" variante="exito" className="md:mt-5">Continuar a Autorizar con PIN →</Boton>
            </div>
          )}
        </form>
      )}

      <ModalAutorizar
        abierto={autorizar}
        titulo="Confirmar pago"
        textoBoton={`Pagar ${formatoMoneda(monto)}`}
        variante="exito"
        onCerrar={() => setAutorizar(false)}
        onConfirmar={pagar}
        resumen={producto && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-400">Servicio</span><b className="text-slate-800">{producto.name}</b></div>
            <div className="flex justify-between"><span className="text-slate-400">{esRecarga ? 'Celular' : 'Referencia'}</span><span className="font-mono">{referencia}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Cuenta</span><span className="font-mono">•••• {ultimos4(cuenta?.numeroCuenta)}</span></div>
            <div className="flex justify-between pt-1 border-t border-slate-200"><span className="text-slate-400">Total</span><b className="text-lg">{formatoMoneda(monto)}</b></div>
          </div>
        )}
      />

      <Modal abierto={!!pago} onCerrar={() => setPago(null)}>
        {pago && (
          <>
            <Ticket pago={pago} onVerificar={verificar} verificando={verificando} onCerrar={() => { setPago(null); if (pago.estado === 'EXITOSA') setProducto(null); }} />
            {['PENDIENTE_CONCILIACION', 'PROCESANDO'].includes(pago.estado) && (
              <p className="text-center text-xs mt-3 no-imprimir"><Link to="/historial?vista=pendientes" className="text-blue-600 underline">Ver pagos en verificación</Link></p>
            )}
          </>
        )}
      </Modal>

      <Modal abierto={ayuda} titulo="¿Dónde está mi referencia?" onCerrar={() => setAyuda(false)} ancho="max-w-lg">
        {producto?.imagenReferenciaUrl && (
          <AyudaReferencia url={producto.imagenReferenciaUrl} />
        )}
      </Modal>
    </div>
  );
}

/** Imagen de ayuda del recibo: se ajusta a la pantalla y se puede ampliar con un clic. */
function AyudaReferencia({ url }) {
  const [fallo, setFallo] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  if (fallo) return <p className="text-sm text-slate-500">No hay imagen de ayuda para este servicio.</p>;
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">Busca en tu recibo el número marcado en rojo e ingrésalo como referencia.</p>
      <div className={`bg-slate-50 rounded-md border border-slate-200 p-2 ${ampliada ? 'overflow-auto max-h-[70vh]' : ''}`}>
        <img
          src={url}
          alt="Ubicación de la referencia en el recibo"
          onError={() => setFallo(true)}
          onClick={() => setAmpliada(!ampliada)}
          className={`mx-auto rounded ${ampliada ? 'max-w-none w-[160%] cursor-zoom-out' : 'max-h-[60vh] w-auto object-contain cursor-zoom-in'}`}
        />
      </div>
      <p className="text-xs text-slate-400 text-center">{ampliada ? 'Clic para reducir' : 'Clic en la imagen para ampliar'}</p>
    </div>
  );
}
