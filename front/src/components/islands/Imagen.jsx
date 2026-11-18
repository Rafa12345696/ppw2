import { useState } from 'react';
import { propsImagen } from '../../imagenes';
import { IcoBotella } from './Iconos';

// ancho/alto reservan el espacio de la imagen antes de que cargue (evita CLS)
export default function Imagen({ url, alt, sizes = '100vw', anchos, prioridad = false, ancho = 400, alto = 500 }) {
  const [fallo, setFallo] = useState(false);

  // Una direccion que no es http(s) ni una ruta del sitio (por ejemplo "a" o "/" solo) se trata como sin imagen:
  // si no, el navegador la pide al servidor, recibe un 404 y Lighthouse baja Best Practices
  const valida = typeof url === 'string' && /^(https?:\/\/|\/[^/])/.test(url);

  if (!valida || fallo) {
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
      width={ancho}
      height={alto}
      loading={prioridad ? 'eager' : 'lazy'}
      fetchPriority={prioridad ? 'high' : undefined}
      decoding="async"
      onError={() => setFallo(true)}
    />
  );
}
