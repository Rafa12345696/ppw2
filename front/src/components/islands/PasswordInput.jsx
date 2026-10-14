import { useState } from 'react';

export default function PasswordInput({ value, onChange, placeholder = '', minLength }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
        minLength={minLength}
        placeholder={placeholder}
        style={{ width: '100%', paddingRight: '2.5rem' }}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        style={{
          position: 'absolute',
          right: 4,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          color: '#555',
          padding: '0.2rem 0.4rem',
        }}
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  );
}