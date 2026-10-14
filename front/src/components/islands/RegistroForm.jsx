import { useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import PasswordInput from './PasswordInput';

const MUTATION = `
  mutation($data: RegistrarInput!) {
    registrar(data: $data) {
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

export default function RegistroForm() {
  const setSesion = useStore((state) => state.setSesion);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setEnviando(true);
    try {
      const data = await graphqlRequest(MUTATION, { data: { nombre, email, password } });
      setSesion(data.registrar.accessToken, data.registrar.usuario);
      window.location.href = '/tienda';
    } catch (err) {
      const mensaje = err.message || '';
      setError(
        mensaje.includes('Ya existe')
          ? mensaje
          : 'No se pudo crear la cuenta. Revisa que el servidor este funcionando.',
      );
    }
    setEnviando(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 300 }}>
      <div style={{ marginBottom: '1rem' }}>
        <label>Nombre</label><br />
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Correo</label><br />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Contraseña (minimo 6 caracteres)</label><br />
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Confirmar contraseña</label><br />
        <PasswordInput value={confirmar} onChange={(e) => setConfirmar(e.target.value)} minLength={6} />
      </div>
      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      <button type="submit" disabled={enviando}>
        {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  );
}