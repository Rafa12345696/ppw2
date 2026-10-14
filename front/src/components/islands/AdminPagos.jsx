import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';

const QUERY = `
  query {
    pagos {
      id
      pedidoId
      proveedor
      estado
      monto
      moneda
      pagoIdExterno
      creadoEn
    }
  }
`;

const METODOS = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal' };

function Lista() {
  const token = useStore((state) => state.token);
  const [pagos, setPagos] = useState(null);
  const [proveedor, setProveedor] = useState('TODOS');
  const [error, setError] = useState('');

  useEffect(() => {
    graphqlRequest(QUERY, {}, token)
      .then((data) => setPagos(data.pagos))
      .catch(() => setError('No se pudieron cargar los pagos'));
  }, []);

  if (error) return <p style={{ color: '#b00020' }}>{error}</p>;
  if (!pagos) return <p>Cargando pagos...</p>;

  const visibles = proveedor === 'TODOS' ? pagos : pagos.filter((p) => p.proveedor === proveedor);

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Proveedor: </label>
        <select value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
          <option value="TODOS">Todos</option>
          <option value="MERCADOPAGO">Mercado Pago</option>
          <option value="PAYPAL">PayPal</option>
        </select>
      </div>

      {visibles.length === 0 && <p>No hay pagos registrados.</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
            <th>Fecha</th>
            <th>Proveedor</th>
            <th>Pedido</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>ID del proveedor</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{new Date(p.creadoEn).toLocaleString('es-MX')}</td>
              <td>{METODOS[p.proveedor] || p.proveedor}</td>
              <td>{p.pedidoId.slice(-6)}</td>
              <td>${p.monto} {p.moneda}</td>
              <td>{p.estado}</td>
              <td>{p.pagoIdExterno || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
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