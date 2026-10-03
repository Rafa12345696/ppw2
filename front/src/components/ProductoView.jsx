import { useState } from 'react';
import { useStore } from '../store';
import TopBar from './TopBar';

export default function ProductoView() {
  const producto = useStore((state) => state.productoSeleccionado);
  const agregarAlCarrito = useStore((state) => state.agregarAlCarrito);
  const irA = useStore((state) => state.irA);
  const [cantidad, setCantidad] = useState(1);

  if (!producto) return null;

  return (
    <div>
      <TopBar />
      <button onClick={() => irA('home')} style={{ margin: '1rem' }}>Volver</button>
      <div style={{ padding: '1rem', maxWidth: 500 }}>
        <img
          src={producto.imagen}
          alt={producto.nombre}
          style={{ width: '100%', height: 300, objectFit: 'cover', borderRadius: 10, marginBottom: '1rem' }}
        />
        <h1>{producto.nombre}</h1>
        <p>${producto.precio}</p>
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          style={{ width: 60, marginRight: '1rem' }}
        />
        <button
          onClick={() => {
            agregarAlCarrito(producto, cantidad);
            irA('home');
          }}
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}