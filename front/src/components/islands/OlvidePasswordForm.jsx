import { useState } from 'react';
import { graphqlRequest } from '../../api';

const MUTATION = `
  mutation($email: String!) {
    solicitarRecuperacion(email: $email)
  }
`;

export default function OlvidePasswordForm() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await graphqlRequest(MUTATION, { email });
      setEnviado(true);
    } catch (err) {
      setError('No se pudo procesar la solicitud. Intenta de nuevo en unos minutos.');
    }
    setEnviando(false);
  };

  if (enviado) {
    return (
      <div style={{ maxWidth: 360 }}>
        <p>
          Si <strong>{email}</strong> esta registrado, te enviamos un enlace para restablecer tu
          contraseña. Revisa tambien la carpeta de spam. El enlace dura 1 hora.
        </p>
        <p style={{ marginTop: '1rem' }}><a href="/login">Volver a iniciar sesion</a></p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 300 }}>
      <p style={{ marginBottom: '1rem' }}>
        Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
      </p>
      <div style={{ marginBottom: '1rem' }}>
        <label>Correo</label><br />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
      </div>
      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      <button type="submit" disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar enlace'}
      </button>
    </form>
  );
}