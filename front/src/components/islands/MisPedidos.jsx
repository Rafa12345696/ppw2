import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { suscribirse } from '../../ws';
import BotonesPago from './BotonesPago';

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

const ETIQUETAS = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADO: 'Pagado',
  CANCELADO: 'Cancelado',
  EXPIRADO: 'Expirado',
};

const ENVIOS = {
  POR_PREPARAR: 'Por preparar',
  PREPARANDO: 'Preparando tu pedido',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
};

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

  if (error) return <p style={{ color: '#b00020' }}>{error}</p>;
  if (!pedidos) return <p>Cargando tus pedidos...</p>;
  if (pedidos.length === 0) return <p>Todavia no tienes pedidos.</p>;

  return (
    <div style={{ maxWidth: 700 }}>
      <p style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: enVivo ? '#2e7d32' : '#999',
            marginRight: 6,
          }}
        />
        {enVivo ? 'Se actualiza en vivo' : 'Sin conexion en vivo'}
      </p>

      {pedidos.map((p) => (
        <div key={p.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <strong>Pedido {p.id.slice(-6)}</strong>
            <span>{new Date(p.fecha).toLocaleString('es-MX')}</span>
          </div>
          <p>{p.detalles.map((d) => `${d.nombre} x${d.cantidad}`).join(', ')}</p>
          <p>
            Total: ${p.total} — <strong>{ETIQUETAS[p.estado] || p.estado}</strong>
            {p.metodoPago && ` (${p.metodoPago === 'PAYPAL' ? 'PayPal' : 'Mercado Pago'})`}
          </p>
          {p.estado === 'PAGADO' && (
            <p>
              Envio: <strong>{ENVIOS[p.envio || 'POR_PREPARAR']}</strong>
            </p>
          )}
          {p.estado === 'PAGADO' && (
            <p style={{ marginTop: '0.5rem' }}>
              <a href={`/comprobante?pedido=${p.id}`}>Ver comprobante</a>
            </p>
          )}
          {p.estado === 'PENDIENTE_PAGO' && (
            <div style={{ marginTop: '0.5rem' }}>
              <BotonesPago pedidoId={p.id} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}