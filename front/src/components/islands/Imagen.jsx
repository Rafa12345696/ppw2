import { useState } from 'react';
import { propsImagen } from '../../imagenes';
import { IcoBotella } from './Iconos';

export default function Imagen({ url, alt, sizes = '100vw', anchos, prioridad = false }) {
  const [fallo, setFallo] = useState(false);

  if (!url || fallo) {
    return (
      <div className="sin-imagen" role="img" aria-label={alt ? `${alt}: sin imagen` : 'Sin imagen'}>
        <IcoBotella tam={40} />
        <span aria-hidden="true">Sin imagen</span>
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
    />
  );
}
