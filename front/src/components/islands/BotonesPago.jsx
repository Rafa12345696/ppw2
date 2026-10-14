import { useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';

const MUTATION = `
  mutation($pedidoId: ID!, $proveedor: String!) {
    iniciarPago(pedidoId: $pedidoId, proveedor: $proveedor) {
      url
    }
  }
`;

export default function BotonesPago({ pedidoId }) {
  const token = useStore((state) => state.token);
  const [cargando, setCargando] = useState('');
  const [error, setError] = useState('');

  const pagar = async (proveedor) => {
    setCargando(proveedor);
    setError('');
    try {
      const data = await graphqlRequest(MUTATION, { pedidoId, proveedor }, token);
      window.location.href = data.iniciarPago.url;
    } catch (e) {
      setError(e.message || 'No se pudo iniciar el pago');
      setCargando('');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => pagar('MERCADOPAGO')} disabled={cargando !== ''}>
          {cargando === 'MERCADOPAGO' ? 'Redirigiendo...' : 'Pagar con Mercado Pago'}
        </button>
        <button onClick={() => pagar('PAYPAL')} disabled={cargando !== ''}>
          {cargando === 'PAYPAL' ? 'Redirigiendo...' : 'Pagar con PayPal'}
        </button>
      </div>
      {error && <p style={{ color: '#b00020', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}