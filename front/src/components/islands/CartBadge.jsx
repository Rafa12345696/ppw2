import { useStore } from '../../store';

export default function CartBadge() {
  const carrito = useStore((state) => state.carrito);
  const total = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  return <span>({total})</span>;
}