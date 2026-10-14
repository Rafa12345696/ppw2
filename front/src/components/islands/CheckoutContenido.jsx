import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import BotonesPago from './BotonesPago';

const MUTATION = `
  mutation($items: [ItemPedidoInput!]!) {
    crearPedido(items: $items) {
      id
      estado
      total
    }
  }
`;

export default function CheckoutContenido() {
  const carrito = useStore((state) => state.carrito);
  const vaciarCarrito = useStore((state) => state.vaciarCarrito);
  const token = useStore((state) => state.token);
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const [pedido, setPedido] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!hidratado) return;
    if (!usuario) {
      window.location.href = '/login?next=/checkout';
    } else {
      setListo(true);
    }
  }, [usuario, hidratado]);

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const confirmar = async () => {
    setEnviando(true);
    setError('');
    try {
      const items = carrito.map((item) => ({
        productoId: item.id,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnit: item.precio,
      }));
      const data = await graphqlRequest(MUTATION, { items }, token);
      setPedido(data.crearPedido);
      vaciarCarrito();
    } catch (e) {
      const mensaje = e.message || '';
      setError(
        mensaje.includes('Stock insuficiente') || mensaje.includes('ya no existe')
          ? mensaje
          : 'Ocurrio un error al procesar tu pedido. Intenta de nuevo.',
      );
    }
    setEnviando(false);
  };

  if (!listo) {
    return <p>Verificando sesion...</p>;
  }

  if (pedido) {
    return (
      <div>
        <h2>Elige como pagar</h2>
        <p>Pedido {pedido.id}</p>
        <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total: ${pedido.total}</p>
        <p style={{ margin: '0.5rem 0 1rem' }}>
          Reservamos tus productos durante 30 minutos. Si no pagas en ese tiempo, el pedido se cancela.
        </p>
        <BotonesPago pedidoId={pedido.id} />
        <p style={{ marginTop: '1rem' }}>
          <a href="/mis-pedidos">Pagar despues desde Mis pedidos</a>
        </p>
      </div>
    );
  }

  if (carrito.length === 0) {
    return <p>Tu carrito esta vacio.</p>;
  }

  return (
    <div>
      <h2>Resumen de tu compra</h2>
      {carrito.map((item) => (
        <p key={item.id}>{item.nombre} x{item.cantidad} — ${item.precio * item.cantidad}</p>
      ))}
      <h3>Total: ${total}</h3>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}

      <button onClick={confirmar} disabled={enviando}>
        {enviando ? 'Creando pedido...' : 'Continuar al pago'}
      </button>
    </div>
  );
} 