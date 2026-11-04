import { useState } from 'react';
import { IcoOjo, IcoOjoTachado } from './Iconos';

// Campo de contraseña con boton para mostrarla. Pasa "id" para ligarlo a su <label>.
export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = '',
  minLength,
  autoComplete = 'current-password',
  describedBy,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="contrasena">
      <input
        id={id}
        className="control"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
      >
        {visible ? <IcoOjoTachado /> : <IcoOjo />}
      </button>
    </div>
  );
}
