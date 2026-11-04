import { useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { fechaMaximaNacimiento } from '../../edad';
import PasswordInput from './PasswordInput';
import { IcoAlerta } from './Iconos';

const MUTATION = `
  mutation($data: RegistrarInput!) {
    registrar(data: $data) {
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

// Mensajes del servidor que si conviene mostrar tal cual
const CONOCIDOS = ['Ya existe', 'mayores de 18', 'Fecha de nacimiento', 'contraseña'];

export default function RegistroForm() {
  const setSesion = useStore((state) => state.setSesion);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [errorConfirmar, setErrorConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorConfirmar('');

    if (password !== confirmar) {
      setErrorConfirmar('Las contraseñas no coinciden');
      document.getElementById('reg-confirmar')?.focus();
      return;
    }

    setEnviando(true);
    try {
      const data = await graphqlRequest(MUTATION, {
        data: { nombre, email, password, fechaNacimiento },
      });
      setSesion(data.registrar.accessToken, data.registrar.usuario);
      window.location.href = '/tienda';
    } catch (err) {
      const mensaje = err.message || '';
      setError(
        CONOCIDOS.some((c) => mensaje.includes(c))
          ? mensaje
          : 'No se pudo crear la cuenta. Revisa que el servidor este funcionando.',
      );
    }
    setEnviando(false);
  };

  return (
    <form onSubmit={handleSubmit} className="pila">
      <div className="campo">
        <label htmlFor="reg-nombre">Nombre completo</label>
        <input id="reg-nombre" type="text" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="campo">
        <label htmlFor="reg-email">Correo</label>
        <input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="campo">
        <label htmlFor="reg-fecha">Fecha de nacimiento</label>
        <input
          id="reg-fecha"
          type="date"
          autoComplete="bday"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          max={fechaMaximaNacimiento()}
          required
          aria-describedby="reg-fecha-ayuda"
        />
        <span id="reg-fecha-ayuda" className="ayuda">Debes tener 18 años o mas. No se puede cambiar despues.</span>
      </div>
      <div className="campo">
        <label htmlFor="reg-password">Contraseña</label>
        <PasswordInput
          id="reg-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          autoComplete="new-password"
          describedBy="reg-password-ayuda"
        />
        <span id="reg-password-ayuda" className="ayuda">Minimo 6 caracteres.</span>
      </div>
      <div className="campo">
        <label htmlFor="reg-confirmar">Confirmar contraseña</label>
        <PasswordInput
          id="reg-confirmar"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          minLength={6}
          autoComplete="new-password"
          describedBy={errorConfirmar ? 'reg-confirmar-error' : undefined}
        />
        {errorConfirmar && <span id="reg-confirmar-error" className="error-campo" role="alert">{errorConfirmar}</span>}
      </div>
      {error && (
        <div className="alerta alerta-error" role="alert">
          <IcoAlerta /> <span>{error}</span>
        </div>
      )}
      <button type="submit" className="btn btn-primario btn-bloque btn-lg" disabled={enviando} aria-busy={enviando}>
        {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  );
}
