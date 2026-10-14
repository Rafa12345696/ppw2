import { useStore } from '../../store';

export default function CarritoContenido() {
  const carrito = useStore((state) => state.carrito);
  const quitarDelCarrito = useStore((state) => state.quitarDelCarrito);

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  if (carrito.length === 0) {
    return <p>Tu carrito esta vacio</p>;
  }

  return (
    <div>
      {carrito.map((item) => (
        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
          <span>{item.nombre} x{item.cantidad}</span>
          <span>${item.precio * item.cantidad}</span>
          <button onClick={() => quitarDelCarrito(item.id)}>Quitar</button>
        </div>
      ))}
      <h3>Total: ${total}</h3>
      <a href="/checkout">
        <button>Ir a pagar</button>
      </a>
    </div>
  );
}