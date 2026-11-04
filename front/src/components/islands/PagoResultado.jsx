import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { suscribirse } from '../../ws';
import { dinero, METODOS, ESTADOS_PEDIDO } from '../../formato';
import BotonesPago from './BotonesPago';
import { IcoCheck, IcoReloj, IcoAlerta } from './Iconos';

const CONFIRMAR = `
  mutation($pedidoId: ID!) {
    confirmarPago(pedidoId: $pedidoId) {
      id
      estado
      total
      metodoPago
    }
  }
`;

const SUB = `
  subscription($pedidoId: ID) {
    miPedidoActualizado(pedidoId: $pedidoId) {
      id
      estado
      total
      metodoPago
    }
  }
`;

const MAX_REVISIONES = 8;

// Circulo con icono para el estado del pago
function Sello({ tono, children }) {
  const colores = {
    ok: ['var(--c-ok-fondo)', 'var(--c-ok)'],
    aviso: ['var(--c-aviso-fondo)', 'var(--c-aviso)'],
    neutra: ['var(--c-fondo-3)', 'var(--c-texto-2)'],
  }[tono];
  return (
    <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: colores[0], color: colores[1] }}>
      {children}
    </span>
  );
}

export default function PagoResultado() {
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const [pedidoId, setPedidoId] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');
  const [agotado, setAgotado] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPedidoId(params.get('pedido') || '');
  }, []);

  useEffect(() => {
    if (!hidratado || pedidoId === null) return;
    if (!usuario) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
      return;
    }
    if (!pedidoId) return;

    let cancelado = false;
    let timer;
    let revisiones = 0;
    const token = useStore.getState().token;

    // Respaldo: consulta el pago al proveedor y repite de vez en cuando
    const verificar = async () => {
      try {
        const data = await graphqlRequest(CONFIRMAR, { pedidoId }, token);
        if (cancelado) return;
        setPedido(data.confirmarPago);
        revisiones += 1;

        if (data.confirmarPago.estado === 'PENDIENTE_PAGO') {
          if (revisiones < MAX_REVISIONES) {
            timer = setTimeout(verificar, 15000);
          } else {
            setAgotado(true);
          }
        }
      } catch (e) {
        if (!cancelado) setError(e.message || 'No se pudo verificar el pago');
      }
    };
    verificar();

    // En vivo: el servidor avisa en cuanto cambia el pedido
    const parar = suscribirse({
      query: SUB,
      variables: { pedidoId },
      token,
      onData: (data) => {
        if (cancelado) return;
        const p = data.miPedidoActualizado;
        setPedido((anterior) => ({ ...(anterior || {}), ...p }));
        if (p.estado !== 'PENDIENTE_PAGO') {
          clearTimeout(timer);
          setAgotado(false);
        }
      },
    });

    return () => {
      cancelado = true;
      clearTimeout(timer);
      parar();
    };
  }, [hidratado, usuario, pedidoId]);

  if (pedidoId === '') return <div className="alerta alerta-error" role="alert">Falta el numero de pedido.</div>;
  if (error) return <div className="alerta alerta-error" role="alert"><IcoAlerta /> <span>{error}</span></div>;
  if (!pedido) {
    return (
      <div className="tarjeta pila" style={{ alignItems: 'center', textAlign: 'center' }} role="status">
        <Sello tono="neutra"><IcoReloj tam={26} /></Sello>
        <h1>Verificando tu pago...</h1>
      </div>
    );
  }

  const folio = <span className="mono">{pedido.id.slice(-6).toUpperCase()}</span>;

  if (pedido.estado === 'PAGADO') {
    return (
      <div className="tarjeta pila-lg" style={{ alignItems: 'center', textAlign: 'center' }} role="status">
        <Sello tono="ok"><IcoCheck tam={28} /></Sello>
        <div className="pila-sm">
          <h1>¡Pago confirmado!</h1>
          <p className="texto-2">Pedido {folio}{pedido.metodoPago && ` · ${METODOS[pedido.metodoPago] || pedido.metodoPago}`}</p>
        </div>
        <p className="precio precio-grande num">{dinero.format(pedido.total)}</p>
        <p className="texto-2">Te avisaremos por correo cuando empecemos a prepararlo.</p>
        <div className="acciones" style={{ justifyContent: 'center' }}>
          <a className="btn btn-primario" href="/mis-pedidos">Seguir mi pedido</a>
          <a className="btn btn-neutro" href={`/comprobante?pedido=${pedido.id}`}>Ver comprobante</a>
        </div>
      </div>
    );
  }

  if (pedido.estado === 'PENDIENTE_PAGO') {
    return (
      <div className="tarjeta pila-lg" style={{ alignItems: 'center', textAlign: 'center' }} role="status">
        <Sello tono="aviso"><IcoReloj tam={28} /></Sello>
        <div className="pila-sm">
          <h1>{agotado ? 'Aun no recibimos la confirmacion' : 'Confirmando tu pago...'}</h1>
          <p className="texto-2">
            {agotado
              ? 'Si ya pagaste, puede tardar unos minutos. Esta pagina se actualiza sola cuando se confirme.'
              : 'No cierres esta pagina: se actualiza sola en cuanto se confirme el pago.'}
          </p>
        </div>
        <p className="texto-2">¿No terminaste de pagar? Puedes intentarlo de nuevo.</p>
        <div className="acciones" style={{ justifyContent: 'center' }}>
          <BotonesPago pedidoId={pedido.id} />
          <a className="btn btn-neutro" href="/mis-pedidos">Ir a Mis pedidos</a>
        </div>
      </div>
    );
  }

  return (
    <div className="tarjeta pila-lg" style={{ alignItems: 'center', textAlign: 'center' }} role="status">
      <Sello tono="neutra"><IcoAlerta tam={28} /></Sello>
      <div className="pila-sm">
        <h1>Este pedido ya no esta activo</h1>
        <p className="texto-2">
          El pedido {folio} esta {(ESTADOS_PEDIDO[pedido.estado]?.texto || pedido.estado).toLowerCase()}.
        </p>
      </div>
      <a className="btn btn-primario" href="/tienda">Volver a la tienda</a>
    </div>
  );
}
