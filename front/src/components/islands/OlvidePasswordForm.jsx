import { useState } from 'react';
import { graphqlRequest } from '../../api';
import { IcoAlerta, IcoCheck } from './Iconos';

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
      <div className="pila">
        <div className="alerta alerta-ok" role="status">
          <IcoCheck />
          <span>
            Si <strong>{email}</strong> esta registrado, te enviamos un enlace para crear una contraseña nueva.
          </span>
        </div>
        <p className="texto-2">Revisa tambien la carpeta de spam. El enlace dura 1 hora.</p>
        <a className="btn btn-neutro btn-bloque" href="/login">Volver a iniciar sesion</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pila">
      <div className="campo">
        <label htmlFor="olvide-email">Correo de tu cuenta</label>
        <input id="olvide-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {error && (
        <div className="alerta alerta-error" role="alert">
          <IcoAlerta /> <span>{error}</span>
        </div>
      )}
      <button type="submit" className="btn btn-primario btn-bloque btn-lg" disabled={enviando} aria-busy={enviando}>
        {enviando ? 'Enviando...' : 'Enviar enlace'}
      </button>
      <a href="/login" className="texto-3" style={{ textAlign: 'center' }}>Volver a iniciar sesion</a>
    </form>
  );
}
