import { useState } from 'react';
import { useStore } from '../../store';

export default function AgregarAlCarrito({ producto }) {
  const agregarAlCarrito = useStore((state) => state.agregarAlCarrito);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const agotado = producto.stock < 1;

  const cambiarCantidad = (valor) => {
    const n = Math.floor(Number(valor)) || 1;
    setCantidad(Math.max(1, Math.min(n, producto.stock)));
  };

  const handleAgregar = () => {
    agregarAlCarrito(producto, cantidad);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1500);
  };

  return (
    <div>
      <input
        type="number"
        min={1}
        max={producto.stock}
        value={cantidad}
        onChange={(e) => cambiarCantidad(e.target.value)}
        disabled={agotado}
        style={{ width: 60, marginRight: '1rem' }}
      />
      <button onClick={handleAgregar} disabled={agotado}>
        {agotado ? 'Agotado' : agregado ? 'Agregado ✓' : 'Agregar al carrito'}
      </button>
    </div>
  );
}