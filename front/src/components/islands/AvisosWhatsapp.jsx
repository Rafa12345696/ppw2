import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';

const ACTUALIZAR = `
  mutation($telefono: String) {
    actualizarTelefono(telefono: $telefono) {
      id
      telefono
    }
  }
`;

// Permite poner o quitar el telefono para recibir avisos del pedido por WhatsApp
export default function AvisosWhatsapp() {
  const usuario = useStore((s) => s.usuario);
  const token = useStore((s) => s.token);
  const hidratado = useStore((s) => s.hidratado);
  const actualizarUsuario = useStore((s) => s.actualizarUsuario);
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (hidratado && usuario?.telefono) setTelefono(usuario.telefono);
  }, [hidratado, usuario?.telefono]);

  if (!hidratado || !usuario) return null;

  const guardar = async (valor) => {
    setEnviando(true);
    setMensaje('');
    setError('');
    try {
      const d = await graphqlRequest(ACTUALIZAR, { telefono: valor || null }, token);
      const nuevo = d.actualizarTelefono.telefono;
      actualizarUsuario({ telefono: nuevo });
      setTelefono(nuevo || '');
      setMensaje(nuevo ? 'Listo: te avisaremos por WhatsApp.' : 'Ya no recibiras avisos por WhatsApp.');
    } catch (e) {
      setError(e.message || 'No se pudo guardar el telefono');
    }
    setEnviando(false);
  };

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', margin: '1rem 0', maxWidth: 480 }}>
      <strong>Avisos por WhatsApp</strong>
      <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>
        Te avisamos cuando tu pedido se paga, se prepara, se envia y se entrega. Tambien te llega por correo.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void guardar(telefono.trim());
        }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
      >
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="10 digitos, ej. 3312345678"
          style={{ flex: 1, minWidth: 180 }}
        />
        <button type="submit" disabled={enviando}>{enviando ? 'Guardando...' : 'Guardar'}</button>
        {usuario.telefono && (
          <button type="button" disabled={enviando} onClick={() => void guardar('')}>
            Quitar
          </button>
        )}
      </form>
      {mensaje && <p style={{ color: '#2e7d32', marginTop: '0.5rem' }}>{mensaje}</p>}
      {error && <p style={{ color: '#b00020', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
