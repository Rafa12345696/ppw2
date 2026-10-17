import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';

const QUERY = `
  query {
    pedidos {
      id
      fecha
      estado
      total
      metodoPago
      usuario { nombre email }
      detalles { nombre cantidad precioUnit }
      pagos { id proveedor estado monto moneda }
    }
  }
`;

const CANCELAR = `
  mutation($id: ID!) {
    cancelarPedido(id: $id) { id }
  }
`;

const ETIQUETAS = { PENDIENTE_PAGO: 'Pendiente de pago', PAGADO: 'Pagado', CANCELADO: 'Cancelado', EXPIRADO: 'Expirado' };
const METODOS = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal' };

function Lista() {
  const token = useStore((state) => state.token);
  const [pedidos, setPedidos] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState('');

  const cargar = () => {
    graphqlRequest(QUERY, {}, token)
      .then((data) => setPedidos(data.pedidos))
      .catch(() => setError('No se pudieron cargar los pedidos'));
  };

  useEffect(() => {
    cargar();
  }, []);

  const cancelar = async (id) => {
    if (!confirm('¿Cancelar este pedido y devolver el stock?')) return;
    try {
      await graphqlRequest(CANCELAR, { id }, token);
      cargar();
    } catch (e) {
      setError(e.message || 'No se pudo cancelar');
    }
  };

  if (error) return <p style={{ color: '#b00020' }}>{error}</p>;
  if (!pedidos) return <p>Cargando pedidos...</p>;

  const visibles = filtro === 'TODOS' ? pedidos : pedidos.filter((p) => p.estado === filtro);

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Estado: </label>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="TODOS">Todos</option>
          {Object.entries(ETIQUETAS).map(([valor, texto]) => (
            <option key={valor} value={valor}>{texto}</option>
          ))}
        </select>
      </div>

      {visibles.length === 0 && <p>No hay pedidos con ese filtro.</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
            <th>Pedido</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Metodo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((p) => (
            <>
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{p.id.slice(-6)}</td>
                <td>{new Date(p.fecha).toLocaleString('es-MX')}</td>
                <td>{p.usuario ? `${p.usuario.nombre} (${p.usuario.email})` : '—'}</td>
                <td>${p.total}</td>
                <td>{ETIQUETAS[p.estado] || p.estado}</td>
                <td>{METODOS[p.metodoPago] || '—'}</td>
                <td>
                  <button onClick={() => setAbierto(abierto === p.id ? null : p.id)}>
                    {abierto === p.id ? 'Ocultar' : 'Detalle'}
                  </button>
                  {p.estado === 'PENDIENTE_PAGO' && (
                    <button onClick={() => cancelar(p.id)} style={{ marginLeft: '0.5rem' }}>Cancelar</button>
                  )}
                </td>
              </tr>
              {abierto === p.id && (
                <tr key={`${p.id}-detalle`} style={{ background: '#fafafa' }}>
                  <td colSpan={7} style={{ padding: '0.75rem' }}>
                    <p style={{ marginBottom: '0.5rem' }}><a href={`/comprobante?pedido=${p.id}`}>Ver comprobante</a></p>
                    <strong>Productos</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '0.5rem' }}>
                      {p.detalles.map((d, i) => (
                        <li key={i}>{d.nombre} x{d.cantidad} — ${d.precioUnit} c/u</li>
                      ))}
                    </ul>
                    <strong>Pagos</strong>
                    {p.pagos.length === 0 ? (
                      <p>Sin intentos de pago.</p>
                    ) : (
                      <ul style={{ paddingLeft: '1.2rem' }}>
                        {p.pagos.map((g) => (
                          <li key={g.id}>
                            {METODOS[g.proveedor] || g.proveedor}: {g.estado} — ${g.monto} {g.moneda}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPedidos() {
  return (
    <RequiereAdmin>
      <Lista />
    </RequiereAdmin>
  );
}