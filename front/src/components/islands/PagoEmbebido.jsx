import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { dinero } from '../../formato';
import { IcoReloj, IcoCandado } from './Iconos';

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
            setPpError('');
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

  if (error) return <div className="alerta alerta-error" role="alert">{error}</div>;
  if (!pedido || !config) return <div className="esqueleto" style={{ height: 320 }} aria-label="Cargando tu pedido" />;

  if (pedido.estado === 'PAGADO') {
    return (
      <div className="vacio">
        <h1>Este pedido ya esta pagado</h1>
        <p>No necesitas hacer nada mas. Puedes seguir su envio desde Mis pedidos.</p>
        <a className="btn btn-primario" href="/mis-pedidos">Ver mis pedidos</a>
      </div>
    );
  }

  if (!activo) {
    return (
      <div className="vacio">
        <h1>Este pedido ya no esta activo</h1>
        <p>Su estado es {pedido.estado.toLowerCase().replace('_', ' ')}. Los productos se liberaron.</p>
        <a className="btn btn-primario" href="/tienda">Volver a la tienda</a>
      </div>
    );
  }

  return (
    <div className="compra">
      <div className="pila-lg">
        <div className="encabezado-pagina" style={{ marginBottom: 0 }}>
          <div>
            <h1>Pagar tu pedido</h1>
            <p>Elige un metodo. Tus datos de pago los procesa directamente el proveedor.</p>
          </div>
        </div>

        {aviso && (
          <div className="alerta alerta-aviso" role="status">
            <div className="pila-sm">
              <p>{aviso.texto}</p>
              <div className="acciones">
                {aviso.url && (
                  <a href={aviso.url} target="_blank" rel="noopener noreferrer">Ver mi ficha de pago<span className="sr-only"> (se abre en otra pestaña)</span></a>
                )}
                <a href="/mis-pedidos">Ir a Mis pedidos</a>
              </div>
            </div>
          </div>
        )}

        <section className="tarjeta pila" aria-labelledby="mp-titulo">
          <div className="pila-sm" style={{ gap: 2 }}>
            <h2 id="mp-titulo">Tarjeta, efectivo o cajero</h2>
            <p className="texto-3">Con Mercado Pago: credito, debito, OXXO y cajeros.</p>
          </div>
          {!config.mpPublicKey && <p className="texto-2">Mercado Pago no esta configurado.</p>}
          {mpError && <div className="alerta alerta-error" role="alert">{mpError}</div>}
          <div id="mp-brick" />
        </section>

        <section className="tarjeta pila" aria-labelledby="pp-titulo">
          <div className="pila-sm" style={{ gap: 2 }}>
            <h2 id="pp-titulo">PayPal</h2>
            <p className="texto-3">Paga con tu cuenta PayPal; se abre una ventana de PayPal.</p>
          </div>
          {!config.paypalClientId && <p className="texto-2">PayPal no esta configurado.</p>}
          <div id="pp-botones" />
          {ppError && <div className="alerta alerta-error" role="alert">{ppError}</div>}
        </section>
      </div>

      <aside className="tarjeta resumen pila" aria-labelledby="resumen-pago">
        <h2 id="resumen-pago">Tu pedido</h2>
        <dl>
          <dt>Pedido</dt>
          <dd className="mono">{pedido.id.slice(-6).toUpperCase()}</dd>
          <dt className="total">Total</dt>
          <dd className="total">{dinero.format(pedido.total)}</dd>
        </dl>
        {pedido.expiraEn && (
          <p className="fila texto-2" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <IcoReloj />
            <span>Apartamos tus productos hasta las <strong>{new Date(pedido.expiraEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</strong>.</span>
          </p>
        )}
        <p className="fila texto-3" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <IcoCandado />
          <span>Elixir no guarda los datos de tu tarjeta.</span>
        </p>
      </aside>
    </div>
  );
}
