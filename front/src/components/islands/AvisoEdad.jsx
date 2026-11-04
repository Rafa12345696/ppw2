import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';

// Recuerda en este navegador que el visitante ya confirmo ser mayor de edad
const CLAVE = 'elixir-mayor-edad';

function yaConfirmo() {
  try {
    return localStorage.getItem(CLAVE) === 'si';
  } catch {
    return false;
  }
}

export default function AvisoEdad() {
  const usuario = useStore((s) => s.usuario);
  const hidratado = useStore((s) => s.hidratado);
  const [mostrar, setMostrar] = useState(false);
  const [rechazado, setRechazado] = useState(false);
  const primerBoton = useRef(null);
  const dialogo = useRef(null);

  useEffect(() => {
    if (!hidratado) return;
    // Quien ya registro su fecha de nacimiento no necesita confirmarlo otra vez
    setMostrar(!usuario?.fechaNacimiento && !yaConfirmo());
  }, [hidratado, usuario]);

  // Al abrir, el foco va al dialogo y la pagina de fondo no se desplaza
  useEffect(() => {
    if (!mostrar) return;
    primerBoton.current?.focus();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [mostrar]);

  // Al rechazar desaparecen los botones: el foco pasa al dialogo para que el lector lea el mensaje
  useEffect(() => {
    if (rechazado) dialogo.current?.focus();
  }, [rechazado]);

  const aceptar = () => {
    try {
      localStorage.setItem(CLAVE, 'si');
    } catch {
      // sin almacenamiento: se volvera a preguntar en la siguiente visita
    }
    setMostrar(false);
  };

  // Mantiene el foco dentro del dialogo mientras esta abierto
  const atraparFoco = (e) => {
    if (e.key !== 'Tab') return;
    const botones = [...e.currentTarget.querySelectorAll('button')];
    if (botones.length === 0) {
      e.preventDefault();
      return;
    }
    const primero = botones[0];
    const ultimo = botones[botones.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  if (!mostrar) return null;

  return (
    <div className="capa">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edad-titulo"
        aria-describedby="edad-texto"
        tabIndex={-1}
        ref={dialogo}
        onKeyDown={atraparFoco}
      >
        <span className="logo" aria-hidden="true">elixir</span>
        {rechazado ? (
          <>
            <h2 id="edad-titulo">Lo sentimos</h2>
            <p id="edad-texto" className="texto-2">
              Elixir vende bebidas alcoholicas y solo pueden entrar personas mayores de 18 años.
            </p>
          </>
        ) : (
          <>
            <h2 id="edad-titulo">¿Eres mayor de 18 años?</h2>
            <p id="edad-texto" className="texto-2">
              Para entrar a la tienda confirma que tienes la edad legal para comprar alcohol en Mexico.
            </p>
            <div className="pila-sm">
              <button ref={primerBoton} type="button" className="btn btn-primario btn-bloque" onClick={aceptar}>
                Si, soy mayor de 18
              </button>
              <button type="button" className="btn btn-neutro btn-bloque" onClick={() => setRechazado(true)}>
                No
              </button>
            </div>
            <p className="texto-3">Al comprar te pediremos tu fecha de nacimiento.</p>
          </>
        )}
      </div>
    </div>
  );
}
