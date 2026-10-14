import { useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import PasswordInput from './PasswordInput';

const MUTATION = `
  mutation($data: LoginInput!) {
    login(data: $data) {
      accessToken
      usuario {
        id
        nombre
        email
        rol
      }
    }
  }
`;

function obtenerNext() {
  if (typeof window === 'undefined') return '/tienda';
  const params = new URLSearchParams(window.location.search);
  return params.get('next') || '/tienda';
}

export default function LoginForm() {
  const setSesion = useStore((state) => state.setSesion);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const data = await graphqlRequest(MUTATION, { data: { email, password } });
      setSesion(data.login.accessToken, data.login.usuario);
      const next = obtenerNext();
      if (data.login.usuario.rol === 'ADMIN' && next === '/tienda') {
        window.location.href = '/admin';
      } else {
        window.location.href = next;
      }
    } catch (err) {
      const mensaje = err.message || '';
      setError(
        mensaje.includes('incorrectos')
          ? mensaje
          : 'No se pudo iniciar sesion. Revisa que el servidor este funcionando.',
      );
    }
    setEnviando(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 300 }}>
      <div style={{ marginBottom: '1rem' }}>
        <label>Correo</label><br />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <label>Contraseña</label><br />
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
        <a href="/olvide-password">¿Olvidaste tu contraseña?</a>
      </p>
      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      <button type="submit" disabled={enviando}>
        {enviando ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}