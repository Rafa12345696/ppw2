import { useListado, Paginador, BarraFiltros, Campo, estilos, dinero, fechaHora } from './adminUi';
import RequiereAdmin from './RequiereAdmin';

const QUERY = `
  query($filtro: FiltroPagos, $pagina: Int, $porPagina: Int) {
    pagosPagina(filtro: $filtro, pagina: $pagina, porPagina: $porPagina) {
      total
      pagina
      paginas
      items { id pedidoId proveedor estado monto moneda pagoIdExterno creadoEn }
    }
  }
`;

const METODOS = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal' };
const ESTADOS = ['APROBADO', 'PENDIENTE', 'RECHAZADO', 'ERROR', 'MONTO_INVALIDO', 'REQUIERE_REEMBOLSO', 'REEMBOLSADO'];

const INICIAL = { proveedor: null, estado: null, desde: null, hasta: null };

function Lista() {
  const L = useListado({ query: QUERY, campo: 'pagosPagina', inicial: INICIAL, enVivo: true });

  return (
    <div>
      <BarraFiltros
        escrito={L.escrito}
        setEscrito={L.setEscrito}
        placeholder="Folio del pedido o ID del proveedor"
        limpiar={L.limpiar}
      >
        <Campo etiqueta="Proveedor">
          <select value={L.filtros.proveedor || ''} onChange={(e) => L.cambiarFiltro('proveedor', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(METODOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Estado">
          <select value={L.filtros.estado || ''} onChange={(e) => L.cambiarFiltro('estado', e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Desde">
          <input type="date" value={L.filtros.desde || ''} onChange={(e) => L.cambiarFiltro('desde', e.target.value)} />
        </Campo>
        <Campo etiqueta="Hasta">
          <input type="date" value={L.filtros.hasta || ''} onChange={(e) => L.cambiarFiltro('hasta', e.target.value)} />
        </Campo>
      </BarraFiltros>

      {L.error && <p style={{ color: '#b00020' }}>{L.error}</p>}
      {!L.datos && !L.error && <p>Cargando pagos...</p>}

      {L.datos && (
        <div style={{ opacity: L.cargando ? 0.6 : 1 }}>
          {L.datos.items.length === 0 ? (
            <p>No hay pagos con esos filtros.</p>
          ) : (
            <table style={estilos.tabla}>
              <thead>
                <tr style={estilos.encabezado}>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Pedido</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>ID del proveedor</th>
                </tr>
              </thead>
              <tbody>
                {L.datos.items.map((p) => (
                  <tr key={p.id} style={estilos.fila}>
                    <td>{fechaHora(p.creadoEn)}</td>
                    <td>{METODOS[p.proveedor] || p.proveedor}</td>
                    <td>{p.pedidoId.slice(-6)}</td>
                    <td>{p.moneda === 'MXN' ? dinero.format(p.monto) : `${p.monto} ${p.moneda}`}</td>
                    <td>{p.estado}</td>
                    <td>{p.pagoIdExterno || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Paginador pagina={L.datos.pagina} paginas={L.datos.paginas} total={L.datos.total} onCambiar={L.setPagina} />
        </div>
      )}
    </div>
  );
}

export default function AdminPagos() {
  return (
    <RequiereAdmin>
      <Lista />
    </RequiereAdmin>
  );
}