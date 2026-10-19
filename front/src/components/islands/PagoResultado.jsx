import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { suscribirse } from '../../ws';
import BotonesPago from './BotonesPago';

const CONFIRMAR = `
  mutation($pedidoId: ID!) {
    confirmarPago(pedidoId: $pedidoId) {
      id
      estado
      total
      metodoPago
    }
  }
`;

const SUB = `
  subscription($pedidoId: ID) {
    miPedidoActualizado(pedidoId: $pedidoId) {
      id
      estado
      total
      metodoPago
    }
  }
`;

const MAX_REVISIONES = 8;

export default function PagoResultado() {
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const [pedidoId, setPedidoId] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');
  const [agotado, setAgotado] = useState(false);

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
    let revisiones = 0;
    const token = useStore.getState().token;

    // Respaldo: consulta el pago al proveedor y repite de vez en cuando
    const verificar = async () => {
      try {
        const data = await graphqlRequest(CONFIRMAR, { pedidoId }, token);
        if (cancelado) return;
        setPedido(data.confirmarPago);
        revisiones += 1;

        if (data.confirmarPago.estado === 'PENDIENTE_PAGO') {
          if (revisiones < MAX_REVISIONES) {
            timer = setTimeout(verificar, 15000);
          } else {
            setAgotado(true);
          }
        }
      } catch (e) {
        if (!cancelado) setError(e.message || 'No se pudo verificar el pago');
      }
    };
    verificar();

    // En vivo: el servidor avisa en cuanto cambia el pedido
    const parar = suscribirse({
      query: SUB,
      variables: { pedidoId },
      token,
      onData: (data) => {
        if (cancelado) return;
        const p = data.miPedidoActualizado;
        setPedido((anterior) => ({ ...(anterior || {}), ...p }));
        if (p.estado !== 'PENDIENTE_PAGO') {
          clearTimeout(timer);
          setAgotado(false);
        }
      },
    });

    return () => {
      cancelado = true;
      clearTimeout(timer);
      parar();
    };
  }, [hidratado, usuario, pedidoId]);

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
            ? 'Si ya pagaste, puede tardar unos minutos. Esta pagina se actualiza sola cuando se confirme.'
            : 'No cierres esta pagina: se actualiza sola en cuanto se confirme el pago.'}
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