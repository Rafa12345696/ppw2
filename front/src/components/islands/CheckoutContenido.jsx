import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { fechaMaximaNacimiento } from '../../edad';
import { dinero } from '../../formato';
import BotonesPago from './BotonesPago';
import { IcoAlerta, IcoCheck, IcoReloj } from './Iconos';

const MUTATION = `
  mutation($items: [ItemPedidoInput!]!) {
    crearPedido(items: $items) {
      id
      estado
      total
    }
  }
`;

const CONFIRMAR_FECHA = `
  mutation($fecha: String!) {
    confirmarFechaNacimiento(fecha: $fecha) {
      id
      fechaNacimiento
    }
  }
`;

const MI_VERIFICACION = `query { miVerificacion { requerida verificada estado } }`;

// Mensajes del servidor que si conviene mostrar tal cual
const CONOCIDOS = ['Stock insuficiente', 'ya no existe', 'mayores de 18'];

// Para cuentas sin fecha de nacimiento (viejas o creadas por el admin): se pide una sola vez
function ConfirmarEdad({ token, onConfirmada }) {
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const data = await graphqlRequest(CONFIRMAR_FECHA, { fecha }, token);
      onConfirmada(data.confirmarFechaNacimiento.fechaNacimiento);
    } catch (err) {
      setError(err.message || 'No se pudo guardar la fecha');
    }
    setEnviando(false);
  };

  return (
    <form onSubmit={enviar} className="tarjeta pila" style={{ maxWidth: 480 }}>
      <div className="pila-sm">
        <h2>Antes de continuar</h2>
        <p className="texto-2">
          Solo vendemos a mayores de 18 años. Confirma tu fecha de nacimiento; solo te la pedimos una vez.
        </p>
      </div>
      <div className="campo">
        <label htmlFor="fecha-nac">Fecha de nacimiento</label>
        <input
          id="fecha-nac"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          max={fechaMaximaNacimiento()}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'fecha-error' : undefined}
        />
        {error && <span id="fecha-error" className="error-campo" role="alert">{error}</span>}
      </div>
      <button type="submit" className="btn btn-primario" disabled={enviando}>
        {enviando ? 'Guardando...' : 'Confirmar y continuar'}
      </button>
    </form>
  );
}

// La tienda pide INE + selfie antes de la primera compra
function PedirVerificacion() {
  return (
    <div className="tarjeta pila" style={{ maxWidth: 520 }}>
      <div className="pila-sm">
        <h2>Verifica tu identidad para comprar</h2>
        <p className="texto-2">
          Solo vendemos a mayores de 18 años. Confirmalo una sola vez con una foto de tu INE y una selfie; tarda unos 2
          minutos y tu carrito se queda como esta.
        </p>
      </div>
      <a className="btn btn-primario" href="/verificar-identidad?next=/checkout">Verificar con mi INE</a>
    </div>
  );
}

export default function CheckoutContenido() {
  const carrito = useStore((state) => state.carrito);
  const vaciarCarrito = useStore((state) => state.vaciarCarrito);
  const actualizarUsuario = useStore((state) => state.actualizarUsuario);
  const token = useStore((state) => state.token);
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const [pedido, setPedido] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [verificacion, setVerificacion] = useState(null);

  useEffect(() => {
    if (!hidratado) return;
    if (!usuario) {
      window.location.href = '/login?next=/checkout';
    } else {
      setListo(true);
    }
  }, [usuario, hidratado]);

  // Si la consulta falla se deja seguir: el servidor vuelve a revisar al crear el pedido
  useEffect(() => {
    if (!listo || !token) return;
    graphqlRequest(MI_VERIFICACION, {}, token)
      .then((data) => setVerificacion(data.miVerificacion))
      .catch(() => setVerificacion({ requerida: false, verificada: false }));
  }, [listo]);

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const confirmar = async () => {
    setEnviando(true);
    setError('');
    try {
      const items = carrito.map((item) => ({
        productoId: item.id,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnit: item.precio,
      }));
      const data = await graphqlRequest(MUTATION, { items }, token);
      setPedido(data.crearPedido);
      vaciarCarrito();
    } catch (e) {
      const mensaje = e.message || '';
      if (mensaje.includes('Verifica tu identidad')) {
        setVerificacion({ requerida: true, verificada: false });
      } else if (mensaje.includes('fecha de nacimiento')) {
        // El servidor no tiene la fecha (sesion vieja en este navegador): se vuelve a pedir
        actualizarUsuario({ fechaNacimiento: null });
      } else {
        setError(
          CONOCIDOS.some((c) => mensaje.includes(c))
            ? mensaje
            : 'Ocurrio un error al procesar tu pedido. Intenta de nuevo.',
        );
      }
    }
    setEnviando(false);
  };

  if (!listo || (!pedido && carrito.length > 0 && !verificacion)) {
    return <div className="esqueleto" style={{ height: 240 }} aria-label="Verificando tu sesion" />;
  }

  if (pedido) {
    return (
      <div className="tarjeta pila" style={{ maxWidth: 560 }}>
        <div className="alerta alerta-ok" role="status">
          <IcoCheck /> Tu pedido se creo correctamente.
        </div>
        <div className="pila-sm">
          <h2>Elige como pagar</h2>
          <p className="texto-2">Pedido <span className="mono">{pedido.id.slice(-6).toUpperCase()}</span></p>
          <p className="precio precio-grande num">{dinero.format(pedido.total)}</p>
        </div>
        <p className="fila texto-2" style={{ gap: 8 }}>
          <IcoReloj /> Apartamos tus productos 30 minutos. Si no pagas en ese tiempo, el pedido se cancela solo.
        </p>
        <div className="acciones">
          <BotonesPago pedidoId={pedido.id} />
          <a className="btn btn-fantasma" href="/mis-pedidos">Pagar despues</a>
        </div>
      </div>
    );
  }

  if (carrito.length === 0) {
    return (
      <div className="vacio">
        <h2>No hay nada que pagar</h2>
        <p>Tu carrito esta vacio.</p>
        <a className="btn btn-primario" href="/tienda">Ir a la tienda</a>
      </div>
    );
  }

  if (verificacion.requerida && !verificacion.verificada) {
    return <PedirVerificacion />;
  }

  if (!usuario.fechaNacimiento) {
    return (
      <ConfirmarEdad
        token={token}
        onConfirmada={(fechaNacimiento) => actualizarUsuario({ fechaNacimiento })}
      />
    );
  }

  return (
    <div className="compra">
      <section className="tarjeta" aria-labelledby="revisa-titulo">
        <h2 id="revisa-titulo" style={{ marginBottom: 12 }}>Revisa tu pedido</h2>
        <ul className="lista-simple">
          {carrito.map((item) => (
            <li key={item.id}>
              <span>
                {item.nombre} <span className="texto-3">× {item.cantidad}</span>
              </span>
              <span className="num">{dinero.format(item.precio * item.cantidad)}</span>
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 16 }}><a href="/carrito">Modificar carrito</a></p>
      </section>

      <aside className="tarjeta resumen pila" aria-labelledby="total-titulo">
        <h2 id="total-titulo">Total</h2>
        <dl>
          <dt>Comprador</dt>
          <dd>{usuario.nombre}</dd>
          <dt className="total">A pagar</dt>
          <dd className="total">{dinero.format(total)}</dd>
        </dl>
        {error && (
          <div className="alerta alerta-error" role="alert">
            <IcoAlerta /> <span>{error}</span>
          </div>
        )}
        <button type="button" className="btn btn-primario btn-bloque btn-lg" onClick={confirmar} disabled={enviando} aria-busy={enviando}>
          {enviando ? 'Creando pedido...' : 'Continuar al pago'}
        </button>
        <p className="texto-3">Al continuar apartamos tus productos y eliges como pagar.</p>
      </aside>
    </div>
  );
}
