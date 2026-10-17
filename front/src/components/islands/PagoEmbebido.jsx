import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';

const CONFIG = `
  query {
    configPagos { mpPublicKey paypalClientId paypalCurrency }
  }
`;

const PEDIDO = `
  query($id: ID!) {
    miPedido(id: $id) { id estado total expiraEn }
  }
`;

const PAGAR_MP = `
  mutation($pedidoId: ID!, $datos: String!) {
    pagarConMercadoPago(pedidoId: $pedidoId, datos: $datos) {
      estado
      detalle
      urlComprobante
      pedidoEstado
    }
  }
`;

const CREAR_ORDEN = `
  mutation($pedidoId: ID!) {
    crearOrdenPayPal(pedidoId: $pedidoId)
  }
`;

const CAPTURAR = `
  mutation($pedidoId: ID!, $orderId: String!) {
    capturarPayPal(pedidoId: $pedidoId, orderId: $orderId) { id estado }
  }
`;

// Carga un script externo una sola vez
const scripts = {};
function cargarScript(src) {
  if (!scripts[src]) {
    scripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => {
        delete scripts[src];
        reject(new Error(`No se pudo cargar ${src}`));
      };
      document.head.appendChild(s);
    });
  }
  return scripts[src];
}

// Vuelve a una pagina de la tienda que verifica el pago con el backend
function irAResultado(pedidoId, proveedor) {
  window.location.href = `/pago/resultado?pedido=${pedidoId}&proveedor=${proveedor}&estado=success`;
}

const caja = {
  background: 'white',
  color: '#1a1a1a',
  border: '1px solid #e0e0e0',
  borderRadius: 10,
  padding: '1rem',
  marginBottom: '1rem',
};

const campoPayPal = {
  height: 42,
  background: 'white',
  border: '1px solid #ccc',
  borderRadius: 6,
  marginBottom: '0.6rem',
};

export default function PagoEmbebido() {
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const [pedidoId, setPedidoId] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [mpError, setMpError] = useState('');
  const [ppError, setPpError] = useState('');
  const [aviso, setAviso] = useState(null);
  const [cardDisponible, setCardDisponible] = useState(true);
  const [enviandoCard, setEnviandoCard] = useState(false);
  const camposRef = useRef(null);

  // 1. Numero de pedido desde la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPedidoId(params.get('pedido') || '');
  }, []);

  // 2. Cargar configuracion y pedido (exige sesion)
  useEffect(() => {
    if (!hidratado || pedidoId === null) return;
    if (!usuario) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
      return;
    }
    if (!pedidoId) {
      setError('Falta el numero de pedido.');
      return;
    }

    let cancelado = false;
    const token = useStore.getState().token;
    Promise.all([graphqlRequest(CONFIG), graphqlRequest(PEDIDO, { id: pedidoId }, token)])
      .then(([c, p]) => {
        if (cancelado) return;
        setConfig(c.configPagos);
        setPedido(p.miPedido);
      })
      .catch(() => {
        if (!cancelado) setError('No se pudo cargar el pedido.');
      });
    return () => {
      cancelado = true;
    };
  }, [hidratado, usuario, pedidoId]);

  const activo = pedido?.estado === 'PENDIENTE_PAGO';

  // 3. Mercado Pago: Payment Brick dentro de la pagina
  useEffect(() => {
    if (!activo || !config?.mpPublicKey) return;
    let cancelado = false;
    let controlador = null;
    const id = pedido.id;
    const total = pedido.total;

    (async () => {
      try {
        await cargarScript('https://sdk.mercadopago.com/js/v2');
        if (cancelado) return;
        const mp = new window.MercadoPago(config.mpPublicKey, { locale: 'es-MX' });
        const creado = await mp.bricks().create('payment', 'mp-brick', {
          initialization: { amount: total },
          customization: {
            // Sin "mercadoPago" (saldo de cuenta): esa opcion redirige a la pagina de Mercado Pago
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
              prepaidCard: 'all',
              ticket: 'all',
              atm: 'all',
            },
          },
          callbacks: {
            onReady: () => {},
            onSubmit: ({ formData }) =>
              new Promise((resolve, reject) => {
                setMpError('');
                graphqlRequest(
                  PAGAR_MP,
                  { pedidoId: id, datos: JSON.stringify(formData) },
                  useStore.getState().token,
                )
                  .then((data) => {
                    const r = data.pagarConMercadoPago;
                    if (r.estado === 'RECHAZADO') {
                      setMpError(r.detalle || 'El pago fue rechazado.');
                      reject();
                      return;
                    }
                    resolve();
                    if (r.estado === 'APROBADO') {
                      irAResultado(id, 'MERCADOPAGO');
                    } else {
                      setAviso({
                        texto:
                          'Tu pago quedo pendiente. Si elegiste efectivo o cajero, paga con tu ficha antes de que venza (24 horas). Cuando se acredite, tu pedido pasara a Pagado automaticamente.',
                        url: r.urlComprobante,
                      });
                    }
                  })
                  .catch((e) => {
                    setMpError(e.message || 'No se pudo procesar el pago.');
                    reject();
                  });
              }),
            onError: (e) => console.error('Brick de Mercado Pago:', e),
          },
        });
        if (cancelado) {
          creado.unmount();
        } else {
          controlador = creado;
        }
      } catch (e) {
        if (!cancelado) setMpError('No se pudo cargar el formulario de Mercado Pago.');
      }
    })();

    return () => {
      cancelado = true;
      try {
        controlador?.unmount();
      } catch {
        // ya estaba desmontado
      }
    };
  }, [activo, pedido?.id, pedido?.total, config?.mpPublicKey]);

  // 4. PayPal: boton y campos de tarjeta
  useEffect(() => {
    if (!activo || !config?.paypalClientId) return;
    let cancelado = false;
    let botones = null;
    const id = pedido.id;

    const crearOrden = () =>
      graphqlRequest(CREAR_ORDEN, { pedidoId: id }, useStore.getState().token).then(
        (d) => d.crearOrdenPayPal,
      );

    const capturar = async (orderId) => {
      try {
        const d = await graphqlRequest(
          CAPTURAR,
          { pedidoId: id, orderId },
          useStore.getState().token,
        );
        if (d.capturarPayPal.estado === 'PAGADO') {
          irAResultado(id, 'PAYPAL');
        } else {
          setAviso({
            texto:
              'Recibimos tu pago, pero PayPal todavia lo esta revisando. Tu pedido pasara a Pagado cuando se confirme.',
            url: null,
          });
        }
      } catch (e) {
        setPpError(e.message || 'No se pudo confirmar el pago.');
      }
    };

    (async () => {
      try {
        const src =
          `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.paypalClientId)}` +
          `&components=buttons,card-fields&currency=${encodeURIComponent(config.paypalCurrency)}&intent=capture`;
        await cargarScript(src);
        if (cancelado || !window.paypal) return;

        botones = window.paypal.Buttons({
          style: { layout: 'vertical', shape: 'rect', label: 'pay' },
          createOrder: crearOrden,
          onApprove: (data) => capturar(data.orderID),
          onError: (e) => {
            console.error('PayPal (boton):', e);
            setPpError('PayPal no pudo procesar el pago. Intenta de nuevo.');
          },
        });
        if (botones.isEligible()) await botones.render('#pp-botones');

        const campos = window.paypal.CardFields({
          createOrder: crearOrden,
          onApprove: (data) => capturar(data.orderID),
          onError: (e) => {
            console.error('PayPal (tarjeta):', e);
            setPpError('No se pudo procesar la tarjeta. Revisa los datos e intenta de nuevo.');
            setEnviandoCard(false);
          },
          style: {
            input: { 'font-size': '16px', 'font-family': 'Arial, sans-serif', color: '#222' },
            '.invalid': { color: '#b00020' },
          },
        });

        if (campos.isEligible()) {
          campos.NameField().render('#pp-nombre');
          campos.NumberField().render('#pp-numero');
          campos.ExpiryField().render('#pp-vence');
          campos.CVVField().render('#pp-cvv');
          camposRef.current = campos;
        } else {
          setCardDisponible(false);
        }
      } catch (e) {
        if (!cancelado) setPpError('No se pudo cargar PayPal.');
      }
    })();

    return () => {
      cancelado = true;
      try {
        botones?.close();
      } catch {
        // ya estaba cerrado
      }
      camposRef.current = null;
    };
  }, [activo, pedido?.id, config?.paypalClientId, config?.paypalCurrency]);

  const pagarConTarjetaPayPal = () => {
    if (!camposRef.current) return;
    setEnviandoCard(true);
    setPpError('');
    camposRef.current
      .submit()
      .catch(() => setPpError('No se pudo procesar la tarjeta. Revisa los datos.'))
      .finally(() => setEnviandoCard(false));
  };

  if (error) return <p style={{ color: '#b00020' }}>{error}</p>;
  if (!pedido || !config) return <p>Cargando tu pedido...</p>;

  if (pedido.estado === 'PAGADO') {
    return (
      <div>
        <h2>Este pedido ya esta pagado</h2>
        <a href="/mis-pedidos"><button>Ver mis pedidos</button></a>
      </div>
    );
  }

  if (!activo) {
    return (
      <div>
        <h2>Este pedido ya no esta activo</h2>
        <p>Su estado es {pedido.estado.toLowerCase()}.</p>
        <a href="/tienda"><button>Volver a la tienda</button></a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Pagar tu pedido</h2>
      <p>
        Pedido {pedido.id.slice(-6)} — <strong>Total: ${pedido.total}</strong>
      </p>
      {pedido.expiraEn && (
        <p style={{ marginBottom: '1rem' }}>
          Reservamos tus productos hasta las {new Date(pedido.expiraEn).toLocaleTimeString('es-MX')}.
        </p>
      )}

      {aviso && (
        <div style={{ background: '#fff8e1', color: '#4a3b00', padding: '1rem', borderRadius: 8, marginBottom: '1rem' }}>
          <p>{aviso.texto}</p>
          {aviso.url && (
            <p style={{ marginTop: '0.5rem' }}>
              <a href={aviso.url} target="_blank" rel="noopener noreferrer">Ver mi ficha de pago</a>
            </p>
          )}
          <p style={{ marginTop: '0.5rem' }}><a href="/mis-pedidos">Ir a Mis pedidos</a></p>
        </div>
      )}

      <section style={caja}>
        <h3 style={{ marginBottom: '0.5rem' }}>Tarjeta, efectivo o cajero</h3>
        {!config.mpPublicKey && <p>Mercado Pago no esta configurado.</p>}
        {mpError && <p style={{ color: '#b00020', marginBottom: '0.5rem' }}>{mpError}</p>}
        <div id="mp-brick" />
      </section>

      <section style={caja}>
        <h3 style={{ marginBottom: '0.5rem' }}>PayPal</h3>
        {!config.paypalClientId && <p>PayPal no esta configurado.</p>}
        <div id="pp-botones" style={{ marginBottom: '1rem' }} />

        <h4 style={{ marginBottom: '0.5rem' }}>O paga con tarjeta</h4>
        {cardDisponible ? (
          <div style={{ maxWidth: 420 }}>
            <label>Nombre en la tarjeta</label>
            <div id="pp-nombre" style={campoPayPal} />
            <label>Numero de tarjeta</label>
            <div id="pp-numero" style={campoPayPal} />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label>Vencimiento</label>
                <div id="pp-vence" style={campoPayPal} />
              </div>
              <div style={{ flex: 1 }}>
                <label>CVV</label>
                <div id="pp-cvv" style={campoPayPal} />
              </div>
            </div>
            <button onClick={pagarConTarjetaPayPal} disabled={enviandoCard}>
              {enviandoCard ? 'Procesando...' : 'Pagar con tarjeta'}
            </button>
          </div>
        ) : (
          <p>El pago con tarjeta de PayPal no esta disponible. Usa el boton de PayPal o Mercado Pago.</p>
        )}
        {ppError && <p style={{ color: '#b00020', marginTop: '0.5rem' }}>{ppError}</p>}
      </section>
    </div>
  );
}