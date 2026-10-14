import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import BotonesPago from './BotonesPago';

const MUTATION = `
  mutation($pedidoId: ID!) {
    confirmarPago(pedidoId: $pedidoId) {
      id
      estado
      total
      metodoPago
    }
  }
`;

const MAX_INTENTOS = 20;

export default function PagoResultado() {
  const token = useStore((state) => state.token);
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const [pedidoId, setPedidoId] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');
  const [agotado, setAgotado] = useState(false);
  const intentos = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPedidoId(params.get('pedido') || '');
  }, []);

  useEffect(() => {
    if (!hidratado || pedidoId === null) return;
    if (!usuario) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
      return;
    }
    if (!pedidoId) return;

    let cancelado = false;
    let timer;

    const verificar = async () => {
      try {
        const data = await graphqlRequest(MUTATION, { pedidoId }, token);
        if (cancelado) return;
        setPedido(data.confirmarPago);
        intentos.current += 1;

        if (data.confirmarPago.estado === 'PENDIENTE_PAGO') {
          if (intentos.current < MAX_INTENTOS) {
            timer = setTimeout(verificar, 4000);
          } else {
            setAgotado(true);
          }
        }
      } catch (e) {
        if (!cancelado) setError(e.message || 'No se pudo verificar el pago');
      }
    };

    verificar();
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [hidratado, usuario, pedidoId, token]);

  if (pedidoId === '') return <p>Falta el numero de pedido.</p>;
  if (error) return <p style={{ color: '#b00020' }}>{error}</p>;
  if (!pedido) return <p>Verificando tu pago...</p>;

  if (pedido.estado === 'PAGADO') {
    return (
      <div>
        <h2>Pago confirmado</h2>
        <p>Pedido {pedido.id}</p>
        <p>Total pagado: ${pedido.total}</p>
        <p style={{ marginTop: '1rem' }}>
          <a href="/mis-pedidos"><button>Ver mis pedidos</button></a>
        </p>
      </div>
    );
  }

  if (pedido.estado === 'PENDIENTE_PAGO') {
    return (
      <div>
        <h2>{agotado ? 'Aun no recibimos la confirmacion' : 'Confirmando tu pago...'}</h2>
        <p>
          {agotado
            ? 'Si ya pagaste, puede tardar unos minutos. Tambien puedes revisar el estado en Mis pedidos.'
            : 'No cierres esta pagina, solo tarda unos segundos.'}
        </p>
        <p style={{ margin: '1rem 0 0.5rem' }}>¿No terminaste de pagar? Puedes intentarlo de nuevo:</p>
        <BotonesPago pedidoId={pedido.id} />
        <p style={{ marginTop: '1rem' }}><a href="/mis-pedidos">Ir a Mis pedidos</a></p>
      </div>
    );
  }

  return (
    <div>
      <h2>Este pedido ya no esta activo</h2>
      <p>El pedido {pedido.id} esta en estado {pedido.estado.toLowerCase()}.</p>
      <p style={{ marginTop: '1rem' }}><a href="/tienda"><button>Volver a la tienda</button></a></p>
    </div>
  );
}