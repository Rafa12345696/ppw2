import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';

const QUERY = `
  query($id: ID!) {
    miPedido(id: $id) {
      id
      fecha
      estado
      total
      metodoPago
      pagadoEn
      usuario { nombre email }
      detalles { nombre cantidad precioUnit }
      pagos { proveedor estado pagoIdExterno monto moneda }
    }
  }
`;

const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const METODOS = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal' };

const celda = { padding: '0.4rem', borderBottom: '1px solid #ddd', textAlign: 'left' };

export default function Comprobante() {
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const [id, setId] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setId(params.get('pedido') || '');
  }, []);

  useEffect(() => {
    if (!hidratado || id === null) return;
    if (!usuario) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
      return;
    }
    if (!id) {
      setError('Falta el numero de pedido.');
      return;
    }

    let cancelado = false;
    graphqlRequest(QUERY, { id }, useStore.getState().token)
      .then((data) => {
        if (!cancelado) setPedido(data.miPedido);
      })
      .catch(() => {
        if (!cancelado) setError('No se pudo cargar el pedido.');
      });
    return () => {
      cancelado = true;
    };
  }, [hidratado, usuario, id]);

  if (error) return <p style={{ color: '#b00020' }}>{error}</p>;
  if (!pedido) return <p>Cargando comprobante...</p>;

  if (pedido.estado !== 'PAGADO') {
    return (
      <div>
        <p>El comprobante solo esta disponible para pedidos pagados.</p>
        <a href="/mis-pedidos">Volver a Mis pedidos</a>
      </div>
    );
  }

  const pago = pedido.pagos.find((g) => g.estado === 'APROBADO');
  const folio = `ELX-${pedido.id.slice(-8).toUpperCase()}`;

  return (
    <div>
      <button className="no-imprimir" onClick={() => window.print()} style={{ marginBottom: '1rem' }}>
        Imprimir o guardar como PDF
      </button>

      <div style={{ maxWidth: 720, background: 'white', color: '#1a1a1a', padding: '2rem', border: '1px solid #ccc' }}>
        <h2 style={{ marginBottom: '0.25rem' }}>Elixir</h2>
        <h3 style={{ marginBottom: '1rem' }}>Comprobante de compra</h3>

        <p><strong>Folio:</strong> {folio}</p>
        <p><strong>Fecha de pago:</strong> {new Date(pedido.pagadoEn || pedido.fecha).toLocaleString('es-MX')}</p>
        <p><strong>Cliente:</strong> {pedido.usuario?.nombre} ({pedido.usuario?.email})</p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Metodo de pago:</strong> {METODOS[pedido.metodoPago] || '—'}
          {pago?.pagoIdExterno && ` (ref. ${pago.pagoIdExterno})`}
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr>
              <th style={celda}>Producto</th>
              <th style={celda}>Cant.</th>
              <th style={celda}>Precio</th>
              <th style={celda}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {pedido.detalles.map((d, i) => (
              <tr key={i}>
                <td style={celda}>{d.nombre}</td>
                <td style={celda}>{d.cantidad}</td>
                <td style={celda}>{dinero.format(d.precioUnit)}</td>
                <td style={celda}>{dinero.format(d.precioUnit * d.cantidad)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: '1.2rem' }}><strong>Total: {dinero.format(pedido.total)}</strong></p>
        {pago && pago.moneda !== 'MXN' && (
          <p>Monto cobrado por el proveedor: {pago.monto} {pago.moneda}</p>
        )}

        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#555' }}>
          Este documento es un comprobante de compra y no tiene validez como factura fiscal (CFDI).
        </p>
      </div>
    </div>
  );
}