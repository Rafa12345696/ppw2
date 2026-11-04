import { useState } from 'react';
import { useStore } from '../../store';
import AvisoFlotante, { useAvisoFlotante } from './AvisoFlotante';

export default function AgregarAlCarrito({ producto }) {
  const agregarAlCarrito = useStore((state) => state.agregarAlCarrito);
  const enCarrito = useStore((state) => state.carrito.find((i) => i.id === producto.id)?.cantidad ?? 0);
  const [cantidad, setCantidad] = useState(1);
  const [aviso, mostrarAviso, cerrarAviso] = useAvisoFlotante();

  const disponibles = Math.max(0, producto.stock - enCarrito);
  const agotado = producto.stock < 1;
  const sinMas = !agotado && disponibles === 0;

  const fijar = (valor) => {
    const n = Math.floor(Number(valor)) || 1;
    setCantidad(Math.max(1, Math.min(n, Math.max(disponibles, 1))));
  };

  const handleAgregar = () => {
    agregarAlCarrito(producto, Math.min(cantidad, disponibles));
    mostrarAviso(`Agregaste ${Math.min(cantidad, disponibles)} × ${producto.nombre}`);
    setCantidad(1);
  };

  return (
    <div className="pila-sm">
      <div className="fila">
        <div className="cantidad" role="group" aria-label="Cantidad">
          <button type="button" onClick={() => fijar(cantidad - 1)} disabled={agotado || sinMas || cantidad <= 1} aria-label="Quitar una">−</button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(disponibles, 1)}
            value={cantidad}
            onChange={(e) => fijar(e.target.value)}
            disabled={agotado || sinMas}
            aria-label="Cantidad"
          />
          <button type="button" onClick={() => fijar(cantidad + 1)} disabled={agotado || sinMas || cantidad >= disponibles} aria-label="Agregar una">+</button>
        </div>
        <button type="button" className="btn btn-primario btn-lg" style={{ flex: '1 1 220px' }} onClick={handleAgregar} disabled={agotado || sinMas}>
          {agotado ? 'Agotado' : sinMas ? 'Ya tienes todas en tu carrito' : 'Agregar al carrito'}
        </button>
      </div>
      {enCarrito > 0 && (
        <p className="texto-3">
          Tienes {enCarrito} en tu carrito. <a href="/carrito">Ver carrito</a>
        </p>
      )}
      <AvisoFlotante aviso={aviso} onCerrar={cerrarAviso} />
    </div>
  );
}
