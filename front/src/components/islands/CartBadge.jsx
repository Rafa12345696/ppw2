import { useStore } from '../../store';

export default function CartBadge() {
  const carrito = useStore((state) => state.carrito);
  const total = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <span className="contador num">
      {total}
      <span className="sr-only">{total === 1 ? ' producto' : ' productos'}</span>
    </span>
  );
}
