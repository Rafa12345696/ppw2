import { useListado, Paginador, BarraFiltros, Campo, EstadoListado, dinero, fechaHora } from './adminUi';
import { METODOS, ESTADOS_PAGO } from '../../formato';
import { EstadoPago } from './Estado';
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
            {Object.entries(ESTADOS_PAGO).map(([v, t]) => <option key={v} value={v}>{t.texto}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Desde">
          <input type="date" value={L.filtros.desde || ''} onChange={(e) => L.cambiarFiltro('desde', e.target.value)} />
        </Campo>
        <Campo etiqueta="Hasta">
          <input type="date" value={L.filtros.hasta || ''} onChange={(e) => L.cambiarFiltro('hasta', e.target.value)} />
        </Campo>
      </BarraFiltros>

      <EstadoListado L={L} vacio="No hay pagos con esos filtros." />

      {L.datos && L.datos.items.length > 0 && (
        <div style={{ opacity: L.cargando ? 0.6 : 1 }} aria-busy={L.cargando}>
          <div className="tabla-envoltura">
            <table className="tabla">
              <caption className="sr-only">Pagos</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Proveedor</th>
                  <th scope="col">Pedido</th>
                  <th scope="col" className="derecha">Monto</th>
                  <th scope="col">Estado</th>
                  <th scope="col">ID del proveedor</th>
                </tr>
              </thead>
              <tbody>
                {L.datos.items.map((p) => (
                  <tr key={p.id}>
                    <td>{fechaHora(p.creadoEn)}</td>
                    <td>{METODOS[p.proveedor] || p.proveedor}</td>
                    <td className="mono">{p.pedidoId.slice(-6).toUpperCase()}</td>
                    <td className="derecha num">{p.moneda === 'MXN' ? dinero.format(p.monto) : `${p.monto} ${p.moneda}`}</td>
                    <td><EstadoPago estado={p.estado} /></td>
                    <td className="mono texto-3">{p.pagoIdExterno || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
