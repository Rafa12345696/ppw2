import { useEffect, useRef, useState } from 'react';
import { IcoCheck, IcoCerrar } from './Iconos';

// Aviso breve abajo a la derecha ("Agregaste ... al carrito"). Se cierra solo a los 4 segundos.
export function useAvisoFlotante() {
  const [aviso, setAviso] = useState(null);
  const timer = useRef(null);

  const mostrar = (texto) => {
    clearTimeout(timer.current);
    setAviso({ texto, id: Date.now() });
    timer.current = setTimeout(() => setAviso(null), 4000);
  };
  const cerrar = () => {
    clearTimeout(timer.current);
    setAviso(null);
  };

  useEffect(() => () => clearTimeout(timer.current), []);
  return [aviso, mostrar, cerrar];
}

// La region "status" existe siempre para que el lector de pantalla anuncie el aviso al aparecer
export default function AvisoFlotante({ aviso, onCerrar, enlace = '/carrito', textoEnlace = 'Ver carrito' }) {
  return (
    <div role="status" aria-live="polite">
      {aviso && (
        <div className="flotante" key={aviso.id}>
          <IcoCheck />
          <span>{aviso.texto}</span>
          {enlace && <a href={enlace}>{textoEnlace}</a>}
          <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
            <IcoCerrar tam={16} />
          </button>
        </div>
      )}
    </div>
  );
}
