import { useEffect, useState } from 'react';
import { graphqlRequest } from '../../api';
import PasswordInput from './PasswordInput';

const MUTATION = `
  mutation($token: String!, $password: String!) {
    restablecerPassword(token: $token, password: $password)
  }
`;

export default function RestablecerPasswordForm() {
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setEnviando(true);
    try {
      await graphqlRequest(MUTATION, { token, password });
      setListo(true);
    } catch (err) {
      const mensaje = err.message || '';
      setError(
        mensaje.includes('enlace')
          ? mensaje
          : 'No se pudo cambiar la contraseña. Intenta de nuevo.',
      );
    }
    setEnviando(false);
  };

  if (token === null) return <p>Cargando...</p>;

  if (token === '') {
    return (
      <div>
        <p>El enlace no es valido.</p>
        <a href="/olvide-password">Solicitar uno nuevo</a>
      </div>
    );
  }

  if (listo) {
    return (
      <div>
        <p>Tu contraseña se actualizo correctamente.</p>
        <a href="/login"><button style={{ marginTop: '1rem' }}>Iniciar sesion</button></a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 300 }}>
      <div style={{ marginBottom: '1rem' }}>
        <label>Contraseña nueva (minimo 6 caracteres)</label><br />
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Confirmar contraseña</label><br />
        <PasswordInput value={confirmar} onChange={(e) => setConfirmar(e.target.value)} minLength={6} />
      </div>
      {error && (
        <p style={{ color: '#b00020' }}>
          {error} {error.includes('enlace') && <a href="/olvide-password">Solicitar uno nuevo</a>}
        </p>
      )}
      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}