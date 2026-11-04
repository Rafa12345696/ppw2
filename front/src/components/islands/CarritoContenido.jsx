import { useStore } from '../../store';
import { dinero } from '../../formato';
import Imagen from './Imagen';
import { IcoBolsa, IcoBasura } from './Iconos';

export default function CarritoContenido() {
  const carrito = useStore((state) => state.carrito);
  const hidratado = useStore((state) => state.hidratado);
  const quitarDelCarrito = useStore((state) => state.quitarDelCarrito);
  const cambiarCantidad = useStore((state) => state.cambiarCantidad);

  const piezas = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  if (!hidratado) {
    return <div className="esqueleto" style={{ height: 200 }} aria-hidden="true" />;
  }

  if (carrito.length === 0) {
    return (
      <div className="vacio">
        <IcoBolsa tam={32} />
        <h2>Tu carrito esta vacio</h2>
        <p>Explora el catalogo y agrega los licores que quieras.</p>
        <a className="btn btn-primario" href="/tienda">Ir a la tienda</a>
      </div>
    );
  }

  return (
    <div className="compra">
      <section aria-label="Productos en tu carrito">
        <ul style={{ listStyle: 'none' }}>
          {carrito.map((item) => (
            <li key={item.id} className="linea-carrito">
              <div className="miniatura">
                <Imagen url={item.imagen} alt="" anchos={[120, 200]} sizes="80px" />
              </div>
              <div className="pila-sm">
                <a href={`/producto/${item.id}`} className="producto-nombre">{item.nombre}</a>
                <span className="texto-3 num">{dinero.format(item.precio)} c/u</span>
                <div className="fila">
                  <div className="cantidad cantidad-sm" role="group" aria-label={`Cantidad de ${item.nombre}`}>
                    <button type="button" onClick={() => cambiarCantidad(item.id, item.cantidad - 1)} disabled={item.cantidad <= 1} aria-label="Quitar una">−</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={item.stock}
                      value={item.cantidad}
                      onChange={(e) => cambiarCantidad(item.id, e.target.value)}
                      aria-label={`Cantidad de ${item.nombre}`}
                    />
                    <button type="button" onClick={() => cambiarCantidad(item.id, item.cantidad + 1)} disabled={item.cantidad >= item.stock} aria-label="Agregar una">+</button>
                  </div>
                  <button type="button" className="btn btn-fantasma btn-sm" onClick={() => quitarDelCarrito(item.id)}>
                    <IcoBasura /> Quitar<span className="sr-only"> {item.nombre}</span>
                  </button>
                </div>
              </div>
              <strong className="num" style={{ textAlign: 'right' }}>{dinero.format(item.precio * item.cantidad)}</strong>
            </li>
          ))}
        </ul>
      </section>

      <aside className="tarjeta resumen pila" aria-labelledby="resumen-titulo">
        <h2 id="resumen-titulo">Resumen</h2>
        <dl>
          <dt>Productos</dt>
          <dd>{piezas}</dd>
          <dt className="total">Total</dt>
          <dd className="total">{dinero.format(total)}</dd>
        </dl>
        <a className="btn btn-primario btn-bloque btn-lg" href="/checkout">Continuar al pago</a>
        <a className="btn btn-fantasma btn-bloque" href="/tienda">Seguir comprando</a>
        <p className="texto-3">El precio final lo confirma el servidor al crear tu pedido.</p>
      </aside>
    </div>
  );
}
