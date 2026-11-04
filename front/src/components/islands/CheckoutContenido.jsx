import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { fechaMaximaNacimiento } from '../../edad';
import BotonesPago from './BotonesPago';

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
    <form onSubmit={enviar} style={{ maxWidth: 360 }}>
      <h2>Antes de continuar</h2>
      <p style={{ margin: '0.5rem 0 1rem' }}>
        Solo vendemos a mayores de 18 años. Confirma tu fecha de nacimiento (solo se pide una vez).
      </p>
      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        max={fechaMaximaNacimiento()}
        required
      />
      {error && <p style={{ color: '#b00020', marginTop: '0.5rem' }}>{error}</p>}
      <div style={{ marginTop: '1rem' }}>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Guardando...' : 'Confirmar'}
        </button>
      </div>
    </form>
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

  useEffect(() => {
    if (!hidratado) return;
    if (!usuario) {
      window.location.href = '/login?next=/checkout';
    } else {
      setListo(true);
    }
  }, [usuario, hidratado]);

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
      if (mensaje.includes('fecha de nacimiento')) {
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

  if (!listo) {
    return <p>Verificando sesion...</p>;
  }

  if (pedido) {
    return (
      <div>
        <h2>Elige como pagar</h2>
        <p>Pedido {pedido.id}</p>
        <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total: ${pedido.total}</p>
        <p style={{ margin: '0.5rem 0 1rem' }}>
          Reservamos tus productos durante 30 minutos. Si no pagas en ese tiempo, el pedido se cancela.
        </p>
        <BotonesPago pedidoId={pedido.id} />
        <p style={{ marginTop: '1rem' }}>
          <a href="/mis-pedidos">Pagar despues desde Mis pedidos</a>
        </p>
      </div>
    );
  }

  if (carrito.length === 0) {
    return <p>Tu carrito esta vacio.</p>;
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
    <div>
      <h2>Resumen de tu compra</h2>
      {carrito.map((item) => (
        <p key={item.id}>{item.nombre} x{item.cantidad} — ${item.precio * item.cantidad}</p>
      ))}
      <h3>Total: ${total}</h3>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}

      <button onClick={confirmar} disabled={enviando}>
        {enviando ? 'Creando pedido...' : 'Continuar al pago'}
      </button>
    </div>  
  );
}