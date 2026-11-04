import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { dinero, fechaHora, folio as folioDe, METODOS } from '../../formato';

const QUERY = `
  query($id: ID!) {
    miPedido(id: $id) {
      id
      fecha
      estado
      total
      metodoPago
      pagadoEn
      usuario { nombre email }
      detalles { nombre cantidad precioUnit }
      pagos { proveedor estado pagoIdExterno monto moneda }
    }
  }
`;

export default function Comprobante() {
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const [id, setId] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setId(params.get('pedido') || '');
  }, []);

  useEffect(() => {
    if (!hidratado || id === null) return;
    if (!usuario) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
      return;
    }
    if (!id) {
      setError('Falta el numero de pedido.');
      return;
    }

    let cancelado = false;
    graphqlRequest(QUERY, { id }, useStore.getState().token)
      .then((data) => {
        if (!cancelado) setPedido(data.miPedido);
      })
      .catch(() => {
        if (!cancelado) setError('No se pudo cargar el pedido.');
      });
    return () => {
      cancelado = true;
    };
  }, [hidratado, usuario, id]);

  if (error) return <div className="alerta alerta-error" role="alert">{error}</div>;
  if (!pedido) return <div className="esqueleto" style={{ height: 420, maxWidth: 760 }} aria-label="Cargando comprobante" />;

  if (pedido.estado !== 'PAGADO') {
    return (
      <div className="vacio">
        <h1>Comprobante no disponible</h1>
        <p>El comprobante solo existe para pedidos pagados.</p>
        <a className="btn btn-neutro" href="/mis-pedidos">Volver a Mis pedidos</a>
      </div>
    );
  }

  const pago = pedido.pagos.find((g) => g.estado === 'APROBADO');

  return (
    <div className="pila" style={{ maxWidth: 760 }}>
      <div className="fila-entre no-imprimir">
        <a href="/mis-pedidos">← Mis pedidos</a>
        <button type="button" className="btn btn-neutro" onClick={() => window.print()}>
          Imprimir o guardar como PDF
        </button>
      </div>

      <article className="documento pila-lg" aria-labelledby="doc-titulo">
        <header className="fila-entre" style={{ alignItems: 'flex-start' }}>
          <div className="pila-sm" style={{ gap: 2 }}>
            <span className="logo">elixir</span>
            <span className="texto-3">Tienda en linea de licores</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 id="doc-titulo" style={{ fontSize: 'var(--t-lg)' }}>Comprobante de compra</h1>
            <p className="mono">{folioDe(pedido.id)}</p>
          </div>
        </header>

        <dl>
          <dt>Fecha de pago</dt>
          <dd>{fechaHora(pedido.pagadoEn || pedido.fecha)}</dd>
          <dt>Cliente</dt>
          <dd>{pedido.usuario?.nombre} · {pedido.usuario?.email}</dd>
          <dt>Metodo de pago</dt>
          <dd>
            {METODOS[pedido.metodoPago] || '—'}
            {pago?.pagoIdExterno && <span className="texto-3"> (ref. <span className="mono">{pago.pagoIdExterno}</span>)</span>}
          </dd>
        </dl>

        <div className="tabla-envoltura">
          <table className="tabla">
            <caption className="sr-only">Productos del pedido</caption>
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col" className="derecha">Cant.</th>
                <th scope="col" className="derecha">Precio</th>
                <th scope="col" className="derecha">Importe</th>
              </tr>
            </thead>
            <tbody>
              {pedido.detalles.map((d, i) => (
                <tr key={i}>
                  <td>{d.nombre}</td>
                  <td className="derecha num">{d.cantidad}</td>
                  <td className="derecha num">{dinero.format(d.precioUnit)}</td>
                  <td className="derecha num">{dinero.format(d.precioUnit * d.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="fila-entre" style={{ borderTop: '2px solid var(--c-texto)', paddingTop: 12 }}>
          <strong>Total pagado</strong>
          <strong className="precio num" style={{ margin: 0 }}>{dinero.format(pedido.total)}</strong>
        </div>
        {pago && pago.moneda !== 'MXN' && (
          <p className="texto-3">Monto cobrado por el proveedor: {pago.monto} {pago.moneda}</p>
        )}

        <p className="texto-3">
          Este documento es un comprobante de compra y no tiene validez como factura fiscal (CFDI).
        </p>
      </article>
    </div>
  );
}
