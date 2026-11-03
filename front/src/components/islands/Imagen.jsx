import { useState } from 'react';
import { propsImagen } from '../../imagenes';

export default function Imagen({ url, alt, sizes = '100vw', anchos, prioridad = false }) {
  const [fallo, setFallo] = useState(false);

  if (!url || fallo) {
    return (
      <div style={{ color: '#888', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
        Sin imagen
      </div>
    );
  }

  return (
    <img
      {...propsImagen(url, { anchos, sizes })}
      alt={alt}
      loading={prioridad ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFallo(true)}
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
    />
  );
}