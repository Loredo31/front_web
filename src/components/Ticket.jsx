import { Boton, Estado, LogoServicio } from './ui';
import { fechaPago, formatoFecha, formatoMoneda } from '../utils/formato';

const titulos = {
  EXITOSA: { icono: '✓', texto: 'Pago Aprobado', tono: 'bg-emerald-100 text-emerald-600' },
  PROCESANDO: { icono: '⏳', texto: 'Pago en verificación', tono: 'bg-amber-100 text-amber-600' },
  PENDIENTE_CONCILIACION: { icono: '⏳', texto: 'Pago en verificación', tono: 'bg-amber-100 text-amber-600' },
  RECHAZADA: { icono: '✕', texto: 'Pago rechazado', tono: 'bg-rose-100 text-rose-600' },
  ERROR: { icono: '✕', texto: 'Pago no realizado', tono: 'bg-rose-100 text-rose-600' },
};

/** Comprobante digital de un pago (imprimible). */
export default function Ticket({ pago, onVerificar, verificando, onCerrar }) {
  const t = titulos[pago.estado] || titulos.ERROR;
  const enVerificacion = pago.estado === 'PROCESANDO' || pago.estado === 'PENDIENTE_CONCILIACION';
  const filas = [
    enVerificacion && ['Monto retenido', <span className="font-bold text-amber-700">{formatoMoneda(pago.montoPago)}</span>],
    ['Folio', <span className="font-mono font-bold text-blue-600 break-all">{pago.folio}</span>],
    ['Servicio', pago.nombreProducto || `Servicio ${pago.idServicio}`],
    ['Referencia', <span className="font-mono">{pago.referencia}</span>],
    ['Cuenta de cargo', <span className="font-mono">{pago.numCuenta}</span>],
    // Datos de la petición a GestoPago (sendTx) y de su respuesta.
    pago.upc && ['UPC', <span className="font-mono">{pago.upc}</span>],
    pago.numeroAutorizacion && ['Autorización', <span className="font-mono font-bold">{pago.numeroAutorizacion}</span>],
    pago.codigoCanje && ['Código de canje', <span className="font-mono font-bold text-emerald-700">{pago.codigoCanje}</span>],
    // Una sola fecha: la que generamos y enviamos a GestoPago (Date de sendTx, hora de México).
    ['Fecha', formatoFecha(fechaPago(pago), true, true)],
    ['Estado', <Estado valor={pago.estado} />],
  ].filter(Boolean);

  return (
    <div className="imprimible bg-white">
      <div className="text-center">
        <div className={`w-12 h-12 rounded-full ${t.tono} mx-auto flex items-center justify-center font-bold text-xl mb-2`}>{t.icono}</div>
        <span className="text-xs font-bold uppercase text-slate-500">{t.texto}</span>
        <h3 className="text-2xl font-black text-slate-900 mt-0.5">{formatoMoneda(pago.montoPago)} MXN</h3>
        <div className="flex justify-center mt-2"><LogoServicio url={pago.logoUrl} nombre={pago.nombreProducto} /></div>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 mt-4 text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <span className="text-slate-400 shrink-0">{k}</span>
            <span className="text-slate-800 font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
      {pago.descripcionProducto && (
        <p className="text-xs text-slate-500 mt-3"><span className="font-semibold text-slate-600">Descripción: </span>{pago.descripcionProducto}</p>
      )}
      {pago.leyenda && <p className="text-xs text-slate-500 mt-3 whitespace-pre-line">{pago.leyenda}</p>}
      {pago.mensajeRespuesta && pago.estado !== 'EXITOSA' && (
        <p className="text-xs text-slate-500 mt-3">Respuesta del proveedor: {pago.mensajeRespuesta}</p>
      )}
      {(pago.estado === 'PROCESANDO' || pago.estado === 'PENDIENTE_CONCILIACION') && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
          El proveedor aún no confirma el resultado. El saldo queda retenido; no repitas la compra.
        </p>
      )}
      <div className="flex gap-2 mt-4 no-imprimir">
        {onVerificar && (pago.estado === 'PROCESANDO' || pago.estado === 'PENDIENTE_CONCILIACION') && (
          <Boton variante="primario" className="flex-1" onClick={onVerificar} cargando={verificando}>Verificar estado</Boton>
        )}
        {pago.estado === 'EXITOSA' && <Boton variante="secundario" className="flex-1" onClick={() => window.print()}>🖨️ Imprimir</Boton>}
        {onCerrar && <Boton variante="secundario" className="flex-1" onClick={onCerrar}>Cerrar</Boton>}
      </div>
    </div>
  );
}
