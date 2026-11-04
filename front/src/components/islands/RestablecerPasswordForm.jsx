import { useEffect, useState } from 'react';
import { graphqlRequest } from '../../api';
import PasswordInput from './PasswordInput';
import { IcoAlerta, IcoCheck } from './Iconos';

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

  if (token === null) return <div className="esqueleto" style={{ height: 180 }} aria-hidden="true" />;

  if (token === '') {
    return (
      <div className="pila">
        <div className="alerta alerta-error" role="alert">
          <IcoAlerta /> <span>El enlace no es valido o esta incompleto.</span>
        </div>
        <a className="btn btn-neutro btn-bloque" href="/olvide-password">Solicitar un enlace nuevo</a>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="pila">
        <div className="alerta alerta-ok" role="status">
          <IcoCheck /> <span>Tu contraseña se actualizo correctamente.</span>
        </div>
        <a className="btn btn-primario btn-bloque btn-lg" href="/login">Iniciar sesion</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pila">
      <div className="campo">
        <label htmlFor="nueva-password">Contraseña nueva</label>
        <PasswordInput id="nueva-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" />
      </div>
      <div className="campo">
        <label htmlFor="nueva-confirmar">Confirmar contraseña</label>
        <PasswordInput id="nueva-confirmar" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} minLength={6} autoComplete="new-password" />
      </div>
      {error && (
        <div className="alerta alerta-error" role="alert">
          <IcoAlerta />
          <span>
            {error} {error.includes('enlace') && <a href="/olvide-password">Solicitar uno nuevo</a>}
          </span>
        </div>
      )}
      <button type="submit" className="btn btn-primario btn-bloque btn-lg" disabled={enviando} aria-busy={enviando}>
        {enviando ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
