import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import PasswordInput from './PasswordInput';
import { IcoAlerta, IcoInfo } from './Iconos';

const MUTATION = `
  mutation($data: LoginInput!) {
    login(data: $data) {
      accessToken
      usuario {
        id
        nombre
        email
        rol
        fechaNacimiento
        telefono
      }
    }
  }
`;

// Solo acepta rutas internas: evita que un enlace manipulado mande a otro sitio despues de entrar
function obtenerNext() {
  if (typeof window === 'undefined') return '/tienda';
  const next = new URLSearchParams(window.location.search).get('next') || '';
  const interna = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\');
  return interna ? next : '/tienda';
}

export default function LoginForm() {
  const setSesion = useStore((state) => state.setSesion);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Se lee en el navegador (no al renderizar en el servidor) para no causar diferencias de hidratacion
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('expirada') === '1') {
      setAviso('Tu sesion termino. Inicia sesion de nuevo para continuar.');
    }
  }, []);

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
      const conocido = mensaje.includes('incorrectos') || mensaje.includes('desactivada');
      setError(conocido ? mensaje : 'No se pudo iniciar sesion. Revisa que el servidor este funcionando.');
    }
    setEnviando(false);
  };

  return (
    <form onSubmit={handleSubmit} className="pila">
      {aviso && (
        <div className="alerta alerta-info" role="status">
          <IcoInfo /> <span>{aviso}</span>
        </div>
      )}
      <div className="campo">
        <label htmlFor="login-email">Correo</label>
        <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="campo">
        <div className="fila-entre">
          <label htmlFor="login-password" className="etiqueta-campo">Contraseña</label>
          <a href="/olvide-password" className="texto-3">¿La olvidaste?</a>
        </div>
        <PasswordInput id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && (
        <div className="alerta alerta-error" role="alert">
          <IcoAlerta /> <span>{error}</span>
        </div>
      )}
      <button type="submit" className="btn btn-primario btn-bloque btn-lg" disabled={enviando} aria-busy={enviando}>
        {enviando ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
