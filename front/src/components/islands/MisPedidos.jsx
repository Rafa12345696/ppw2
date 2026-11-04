import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { suscribirse } from '../../ws';
import { dinero, fechaHora, METODOS, PASOS_ENVIO, ENVIOS } from '../../formato';
import BotonesPago from './BotonesPago';
import { EstadoPedido } from './Estado';
import { IcoBolsa } from './Iconos';

const CAMPOS = 'id fecha estado envio total metodoPago detalles { nombre cantidad }';

const QUERY = `
  query {
    misPedidos { ${CAMPOS} }
  }
`;

const SUB = `
  subscription {
    miPedidoActualizado { ${CAMPOS} }
  }
`;

const CONFIRMAR = `
  mutation($pedidoId: ID!) {
    confirmarPago(pedidoId: $pedidoId) {
      id
    }
  }
`;

// Barra de 4 pasos del envio; el paso actual se anuncia con aria-current
function Seguimiento({ envio }) {
  const actual = PASOS_ENVIO.indexOf(envio || 'POR_PREPARAR');
  return (
    <ol className="pasos" aria-label="Seguimiento del envio">
      {PASOS_ENVIO.map((paso, i) => (
        <li key={paso} className="paso" data-hecho={i <= actual} aria-current={i === actual ? 'step' : undefined}>
          {ENVIOS[paso].texto}
        </li>
      ))}
    </ol>
  );
}

function Esqueletos() {
  return (
    <div className="pila" aria-hidden="true">
      {[1, 2].map((i) => (
        <div key={i} className="esqueleto" style={{ height: 150 }} />
      ))}
    </div>
  );
}

export default function MisPedidos() {
  const token = useStore((state) => state.token);
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');
  const [enVivo, setEnVivo] = useState(false);

  useEffect(() => {
    if (!hidratado) return;
    if (!usuario) {
      window.location.href = '/login?next=/mis-pedidos';
      return;
    }

    let cancelado = false;

    const cargar = async () => {
      try {
        let data = await graphqlRequest(QUERY, {}, token);
        const pendientes = data.misPedidos.filter((p) => p.estado === 'PENDIENTE_PAGO').slice(0, 5);

        if (pendientes.length > 0) {
          await Promise.allSettled(
            pendientes.map((p) => graphqlRequest(CONFIRMAR, { pedidoId: p.id }, token)),
          );
          data = await graphqlRequest(QUERY, {}, token);
        }
        if (!cancelado) setPedidos(data.misPedidos);
      } catch (e) {
        if (!cancelado) setError('No se pudieron cargar tus pedidos');
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, [hidratado, usuario, token]);

  // En vivo: cualquier cambio en mis pedidos se refleja sin recargar
  useEffect(() => {
    if (!hidratado || !usuario) return;

    const parar = suscribirse({
      query: SUB,
      token,
      onData: (data) => {
        const nuevo = data.miPedidoActualizado;
        setPedidos((lista) => {
          if (!lista) return lista;
          return lista.some((p) => p.id === nuevo.id)
            ? lista.map((p) => (p.id === nuevo.id ? { ...p, ...nuevo } : p))
            : [nuevo, ...lista];
        });
      },
      onEstado: setEnVivo,
    });
    return parar;
  }, [hidratado, usuario, token]);

  if (error) return <div className="alerta alerta-error" role="alert">{error}</div>;
  if (!pedidos) return <Esqueletos />;

  if (pedidos.length === 0) {
    return (
      <div className="vacio">
        <IcoBolsa tam={32} />
        <h2>Todavia no tienes pedidos</h2>
        <p>Cuando compres algo, aqui veras su pago y su envio en tiempo real.</p>
        <a className="btn btn-primario" href="/tienda">Ir a la tienda</a>
      </div>
    );
  }

  return (
    <div className="pila">
      <span className="en-vivo" data-activo={enVivo}>
        <span className="punto" aria-hidden="true" />
        {enVivo ? 'Se actualiza en vivo' : 'Sin conexion en vivo'}
      </span>

      <ul className="pila" style={{ listStyle: 'none' }}>
        {pedidos.map((p) => (
          <li key={p.id} className="tarjeta pila">
            <div className="fila-entre">
              <div className="pila-sm" style={{ gap: 2 }}>
                <h2 style={{ fontSize: 'var(--t-md)' }}>
                  Pedido <span className="mono">{p.id.slice(-6).toUpperCase()}</span>
                </h2>
                <span className="texto-3">{fechaHora(p.fecha)}</span>
              </div>
              <EstadoPedido estado={p.estado} />
            </div>

            <p className="texto-2">{p.detalles.map((d) => `${d.nombre} × ${d.cantidad}`).join(' · ')}</p>

            {p.estado === 'PAGADO' && <Seguimiento envio={p.envio} />}

            <div className="fila-entre" style={{ borderTop: '1px solid var(--c-borde)', paddingTop: 12 }}>
              <span>
                <strong className="num">{dinero.format(p.total)}</strong>
                {p.metodoPago && <span className="texto-3"> · {METODOS[p.metodoPago] || p.metodoPago}</span>}
              </span>
              <div className="acciones">
                {p.estado === 'PAGADO' && (
                  <a className="btn btn-neutro btn-sm" href={`/comprobante?pedido=${p.id}`}>Ver comprobante</a>
                )}
                {p.estado === 'PENDIENTE_PAGO' && <BotonesPago pedidoId={p.id} secundario />}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
