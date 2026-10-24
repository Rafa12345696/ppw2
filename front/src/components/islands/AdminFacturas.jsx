import { useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import { useListado, Paginador, BarraFiltros, Campo, estilos, dinero, fechaHora, folio, descargarTexto } from './adminUi';

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

const METODOS = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal' };
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
      <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
        Comprobantes de compra de los pedidos pagados. No son facturas fiscales (CFDI).
      </p>

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
        <button type="button" onClick={exportar} disabled={exportando}>
          {exportando ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </BarraFiltros>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      {L.error && <p style={{ color: '#b00020' }}>{L.error}</p>}
      {!L.datos && !L.error && <p>Cargando comprobantes...</p>}

      {L.datos && (
        <div style={{ opacity: L.cargando ? 0.6 : 1 }}>
          {L.datos.items.length === 0 ? (
            <p>No hay comprobantes con esos filtros.</p>
          ) : (
            <table style={estilos.tabla}>
              <thead>
                <tr style={estilos.encabezado}>
                  <th>Folio</th>
                  <th>Fecha de pago</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Metodo</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {L.datos.items.map((p) => (
                  <tr key={p.id} style={estilos.fila}>
                    <td>{folio(p.id)}</td>
                    <td>{fechaHora(p.pagadoEn)}</td>
                    <td>{p.usuario ? `${p.usuario.nombre} (${p.usuario.email})` : '—'}</td>
                    <td>{p.detalles.map((d) => `${d.nombre} x${d.cantidad}`).join(', ')}</td>
                    <td>{METODOS[p.metodoPago] || '—'}</td>
                    <td>{dinero.format(p.total)}</td>
                    <td><a href={`/comprobante?pedido=${p.id}`}>Ver o imprimir</a></td>
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

export default function AdminFacturas() {
  return (
    <RequiereAdmin>
      <Lista />
    </RequiereAdmin>
  );
}