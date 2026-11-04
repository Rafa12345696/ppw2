import { useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import { useListado, Paginador, BarraFiltros, Campo, EstadoListado, Mensaje, dinero, fechaHora, folio, descargarTexto } from './adminUi';
import { METODOS } from '../../formato';

const QUERY = `
  query($filtro: FiltroFacturas, $pagina: Int, $porPagina: Int) {
    facturasPagina(filtro: $filtro, pagina: $pagina, porPagina: $porPagina) {
      total
      pagina
      paginas
      items {
        id
        pagadoEn
        total
        metodoPago
        usuario { nombre email }
        detalles { nombre cantidad }
      }
    }
  }
`;

const EXPORTAR = `query($filtro: FiltroFacturas) { exportarFacturasCsv(filtro: $filtro) }`;

const INICIAL = { metodoPago: null, desde: null, hasta: null };

function Lista() {
  const token = useStore((state) => state.token);
  const L = useListado({ query: QUERY, campo: 'facturasPagina', inicial: INICIAL, enVivo: true });
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');

  const exportar = async () => {
    setExportando(true);
    setError('');
    try {
      const d = await graphqlRequest(EXPORTAR, { filtro: { ...L.filtros, buscar: L.buscar || null } }, token);
      const hoy = new Date().toISOString().slice(0, 10);
      descargarTexto(`comprobantes-elixir-${hoy}.csv`, d.exportarFacturasCsv);
    } catch (e) {
      setError(e.message || 'No se pudo exportar');
    }
    setExportando(false);
  };

  return (
    <div>
      <BarraFiltros escrito={L.escrito} setEscrito={L.setEscrito} placeholder="Folio, cliente o correo" limpiar={L.limpiar}>
        <Campo etiqueta="Metodo de pago">
          <select value={L.filtros.metodoPago || ''} onChange={(e) => L.cambiarFiltro('metodoPago', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(METODOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Pagado desde">
          <input type="date" value={L.filtros.desde || ''} onChange={(e) => L.cambiarFiltro('desde', e.target.value)} />
        </Campo>
        <Campo etiqueta="Pagado hasta">
          <input type="date" value={L.filtros.hasta || ''} onChange={(e) => L.cambiarFiltro('hasta', e.target.value)} />
        </Campo>
        <button type="button" className="btn btn-neutro btn-sm" onClick={exportar} disabled={exportando} aria-busy={exportando}>
          {exportando ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </BarraFiltros>

      <Mensaje>{error}</Mensaje>
      <EstadoListado L={L} vacio="No hay comprobantes con esos filtros." />

      {L.datos && L.datos.items.length > 0 && (
        <div style={{ opacity: L.cargando ? 0.6 : 1 }} aria-busy={L.cargando}>
          <div className="tabla-envoltura">
            <table className="tabla">
              <caption className="sr-only">Comprobantes</caption>
              <thead>
                <tr>
                  <th scope="col">Folio</th>
                  <th scope="col">Fecha de pago</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Productos</th>
                  <th scope="col">Metodo</th>
                  <th scope="col" className="derecha">Total</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {L.datos.items.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{folio(p.id)}</td>
                    <td>{fechaHora(p.pagadoEn)}</td>
                    <td>
                      {p.usuario ? (
                        <>
                          {p.usuario.nombre}
                          <div className="texto-3">{p.usuario.email}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td>{p.detalles.map((d) => `${d.nombre} × ${d.cantidad}`).join(', ')}</td>
                    <td>{METODOS[p.metodoPago] || '—'}</td>
                    <td className="derecha num">{dinero.format(p.total)}</td>
                    <td><a href={`/comprobante?pedido=${p.id}`}>Ver<span className="sr-only"> comprobante {folio(p.id)}</span></a></td>
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

export default function AdminFacturas() {
  return (
    <RequiereAdmin>
      <Lista />
    </RequiereAdmin>
  );
}
