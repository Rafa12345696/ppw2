import { useStore } from '../store';
import TopBar from './TopBar';

export default function Carrito() {
  const carrito = useStore((state) => state.carrito);
  const quitarDelCarrito = useStore((state) => state.quitarDelCarrito);
  const irA = useStore((state) => state.irA);

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  return (
    <div>
      <TopBar />
      <button onClick={() => irA('home')} style={{ margin: '1rem' }}>Seguir comprando</button>
      <div style={{ padding: '1rem' }}>
        {carrito.length === 0 && <p>Tu carrito esta vacio</p>}
        {carrito.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
            <span>{item.nombre} x{item.cantidad}</span>
            <span>${item.precio * item.cantidad}</span>
            <button onClick={() => quitarDelCarrito(item.id)}>Quitar</button>
          </div>
        ))}
        {carrito.length > 0 && (
          <>
            <h3>Total: ${total}</h3>
            <button onClick={() => irA('checkout')}>Ir a pagar</button>
          </>
        )}
      </div>
    </div>
  );
}