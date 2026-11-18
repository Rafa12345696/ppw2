import { useEffect, useState } from 'react';

// Boton propio para instalar la app (bono de la practica P3-2).
// El navegador avisa con "beforeinstallprompt" cuando la tienda se puede instalar. Ese aviso puede llegar
// antes de que este boton cargue, por eso Base.astro lo guarda en window.__avisoInstalar y avisa con
// el evento "elixir:instalable".
export default function BotonInstalar() {
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    const tomar = () => setAviso(window.__avisoInstalar ?? null);
    const instalada = () => setAviso(null);
    tomar();
    window.addEventListener('elixir:instalable', tomar);
    window.addEventListener('appinstalled', instalada);
    return () => {
      window.removeEventListener('elixir:instalable', tomar);
      window.removeEventListener('appinstalled', instalada);
    };
  }, []);

  if (!aviso) return null;

  const instalar = async () => {
    aviso.prompt();
    await aviso.userChoice; // el aviso solo se puede usar una vez, acepte o no
    window.__avisoInstalar = null;
    setAviso(null);
  };

  return (
    <button type="button" className="btn btn-fantasma" onClick={instalar}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 4v11" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 20h14" />
      </svg>
      Instalar app
    </button>
  );
}
