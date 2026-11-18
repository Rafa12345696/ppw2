import { useStore } from '../../store';

export default function CartBadge() {
  const carrito = useStore((state) => state.carrito);
  const total = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    // aria-live: el lector de pantalla anuncia el nuevo total cuando se agrega o quita algo
    <span className="contador num" aria-live="polite" aria-atomic="true">
      {total}
      <span className="sr-only">{total === 1 ? ' producto' : ' productos'}</span>
    </span>
  );
}
