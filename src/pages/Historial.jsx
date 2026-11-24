import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pagosApi } from '../api/servicios';
import { useCuentas } from '../layout/AppLayout';
import { Alerta, Boton, Cargando, Estado, Modal } from '../components/ui';
import Ticket from '../components/Ticket';
import { Encabezado } from './Billetera';
import { formatoFecha, formatoMoneda } from '../utils/formato';

const TAMANO = 10;

const VISTAS = {
  exitosas: { texto: 'Exitosas', subtitulo: 'Recargas y pagos de servicios exitosos, del más reciente al más antiguo', vacio: 'Aún no tienes recargas ni pagos de servicios exitosos.', cargar: pagosApi.historial },
  pendientes: { texto: 'En verificación', subtitulo: 'Pagos en verificación con el proveedor', vacio: 'No tienes pagos en verificación.', cargar: pagosApi.pendientes },
  rechazadas: { texto: 'Rechazadas', subtitulo: 'Pagos rechazados por el proveedor; no se hizo ningún cargo', vacio: 'No tienes pagos rechazados.', cargar: pagosApi.rechazadas },
};

export default function Historial() {
  const [params, setParams] = useSearchParams();
  const vista = VISTAS[params.get('vista')] ? params.get('vista') : 'exitosas';
  const { cuentas, recargarCuentas } = useCuentas();
  const totalRetenido = (cuentas || []).reduce((s, c) => s + Number(c.saldoRetenido || 0), 0);

  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);
  const [cargandoTicket, setCargandoTicket] = useState(null);
  const [verificando, setVerificando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const r = await VISTAS[vista].cargar(pagina, TAMANO);
      setDatos(r.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [vista, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarVista = (v) => { setPagina(0); setDatos(null); setParams(v === 'exitosas' ? {} : { vista: v }); };

  const abrir = async (folio) => {
    setCargandoTicket(folio);
    try {
      const r = await pagosApi.detalle(folio);
      setTicket(r.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoTicket(null);
    }
  };

  const verificar = async () => {
    setVerificando(true);
    try {
      const r = await pagosApi.verificar(ticket.folio);
      setTicket(r.data);
      recargarCuentas();
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setVerificando(false);
    }
  };

  const filas = datos?.contenido || [];

  return (
    <div className="tarjeta p-5 md:p-6 space-y-4 animar">
      <Encabezado titulo="Historial" subtitulo={VISTAS[vista].subtitulo}>
        <span className="text-sm font-semibold text-slate-600">Total: {datos?.totalElementos ?? '—'} operaciones</span>
      </Encabezado>

      <div className="flex gap-6 border-b border-slate-200 text-sm font-semibold overflow-x-auto [scrollbar-width:none]">
        {Object.entries(VISTAS).map(([v, { texto }]) => (
          <button key={v} onClick={() => cambiarVista(v)}
            className={`pb-2.5 -mb-px border-b-2 whitespace-nowrap transition cursor-pointer ${vista === v
              ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{texto}</button>
        ))}
      </div>

      <Alerta>{error}</Alerta>

      {vista === 'pendientes' && totalRetenido > 0 && (
        <Alerta tipo="aviso">
          Monto retenido por pagos en verificación: <b>{formatoMoneda(totalRetenido)}</b>. Se descuenta si el pago se confirma
          o se libera si se rechaza; mientras tanto no está disponible para nuevas recargas o pagos de servicios.
        </Alerta>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-12 p-3 bg-slate-50 font-bold text-slate-500 text-[11px] uppercase tracking-wide">
          <span className="col-span-3">Folio</span>
          <span className="col-span-3">Servicio</span>
          <span className="col-span-2">Fecha</span>
          <span className="col-span-2 text-right">{vista === 'pendientes' ? 'Monto retenido' : 'Monto'}</span>
          <span className="col-span-2 text-center">Estado</span>
        </div>
        {cargando && !datos ? <Cargando /> : filas.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10">
            {VISTAS[vista].vacio}
          </p>
        ) : (
          <div className={`divide-y divide-slate-100 ${cargando ? 'opacity-50' : ''}`}>
            {filas.map((p) => (
              <button key={p.folio} onClick={() => abrir(p.folio)}
                className="w-full text-left p-3 grid grid-cols-2 md:grid-cols-12 gap-1 items-center hover:bg-slate-50 transition cursor-pointer text-sm">
                <span className="md:col-span-3 font-mono font-bold text-blue-600 truncate" title={p.folio}>
                  {cargandoTicket === p.folio ? 'Abriendo…' : p.folio.slice(0, 13).toUpperCase()}
                </span>
                <span className="md:col-span-3 text-slate-800 font-medium truncate text-right md:text-left">{p.nombreProducto || `Servicio ${p.idServicio}`}</span>
                <span className="md:col-span-2 text-xs text-slate-500">{formatoFecha(p.fechaCreacion)}</span>
                <span className="md:col-span-2 text-right font-black text-slate-900">
                  {formatoMoneda(p.montoPago)}
                  {vista === 'pendientes' && <span className="block text-[10px] font-semibold text-amber-600">retenido</span>}
                  {vista === 'rechazadas' && <span className="block text-[10px] font-semibold text-slate-400">sin cargo</span>}
                </span>
                <span className="col-span-2 md:col-span-2 md:text-center"><Estado valor={p.estado} /></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {datos && datos.totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-3 text-xs">
          <Boton variante="secundario" className="text-xs py-1" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>← Anterior</Boton>
          <span className="text-slate-500">Página {pagina + 1} de {datos.totalPaginas}</span>
          <Boton variante="secundario" className="text-xs py-1" disabled={datos.esUltima} onClick={() => setPagina(pagina + 1)}>Siguiente →</Boton>
        </div>
      )}

      <Modal abierto={!!ticket} onCerrar={() => setTicket(null)} titulo="Comprobante digital">
        {ticket && <Ticket pago={ticket} onVerificar={verificar} verificando={verificando} onCerrar={() => setTicket(null)} />}
      </Modal>
    </div>
  );
}
