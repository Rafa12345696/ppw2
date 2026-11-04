import { dinero } from '../../formato';

// Porcentaje de descuento de un producto (0 si no esta en promocion)
export function descuento(p) {
  return p.precioAntes && p.precioAntes > p.precio
    ? Math.round((1 - p.precio / p.precioAntes) * 100)
    : 0;
}

// Precio actual; si hay promocion, en color de marca con el anterior tachado
export function Precio({ producto, grande = false }) {
  const pct = descuento(producto);
  const clases = ['precio', pct > 0 && 'precio-oferta', grande && 'precio-grande'].filter(Boolean).join(' ');
  return (
    <p className={clases}>
      {dinero.format(producto.precio)}
      {pct > 0 && (
        <>
          <span className="sr-only">, precio anterior </span>
          <s className="precio-antes">{dinero.format(producto.precioAntes)}</s>
        </>
      )}
    </p>
  );
}

// Etiquetas "Premium" y "-N%" sobre la imagen o junto al nombre
export function Etiquetas({ producto }) {
  const pct = descuento(producto);
  if (!producto.premium && pct === 0) return null;
  return (
    <span className="etiquetas fila" style={{ gap: 6 }}>
      {producto.premium && <span className="etiqueta etiqueta-premium">Premium</span>}
      {pct > 0 && (
        <span className="etiqueta etiqueta-promo">
          -{pct}%<span className="sr-only"> de descuento</span>
        </span>
      )}
    </span>
  );
}

// Disponibilidad con texto (no solo color)
export function Existencia({ stock }) {
  if (stock < 1) return <span className="existencia existencia-agotada"><span className="punto" aria-hidden="true" />Agotado</span>;
  if (stock <= 5) return <span className="existencia existencia-poca"><span className="punto" aria-hidden="true" />Quedan {stock}</span>;
  return <span className="existencia existencia-ok"><span className="punto" aria-hidden="true" />Disponible</span>;
}
