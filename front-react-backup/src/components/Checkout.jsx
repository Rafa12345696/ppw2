import { useState } from 'react';
import { useStore } from '../store';
import { graphqlRequest } from '../api';
import TopBar from './TopBar';

const MUTATION = `
  mutation($items: [ItemPedidoInput!]!) {
    crearPedido(items: $items) {
      id
      estado
      total
    }
  }
`;

export default function Checkout() {
  const carrito = useStore((state) => state.carrito);
  const vaciarCarrito = useStore((state) => state.vaciarCarrito);
  const irA = useStore((state) => state.irA);
  const [pedido, setPedido] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const confirmar = async () => {
    setEnviando(true);
    const items = carrito.map((item) => ({
      productoId: item.id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnit: item.precio,
    }));
    const data = await graphqlRequest(MUTATION, { items });
    setPedido(data.crearPedido);
    vaciarCarrito();
    setEnviando(false);
  };

  if (pedido) {
    return (
      <div>
        <TopBar />
        <div style={{ padding: '2rem' }}>
          <h2>Pedido confirmado</h2>
          <p>Numero de pedido: {pedido.id}</p>
          <p>Total: ${pedido.total}</p>
          <button onClick={() => irA('home')}>Volver al inicio</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar />
      <div style={{ padding: '2rem' }}>
        <h2>Resumen de tu compra</h2>
        {carrito.map((item) => (
          <p key={item.id}>{item.nombre} x{item.cantidad} — ${item.precio * item.cantidad}</p>
        ))}
        <h3>Total: ${total}</h3>
        <button onClick={confirmar} disabled={enviando}>
          {enviando ? 'Procesando...' : 'Confirmar pedido'}
        </button>
      </div>
    </div>
  );
}