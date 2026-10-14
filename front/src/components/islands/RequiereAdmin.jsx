import { useEffect, useState } from 'react';
import { useStore } from '../../store';

export default function RequiereAdmin({ children }) {
  const usuario = useStore((state) => state.usuario);
  const hidratado = useStore((state) => state.hidratado);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!hidratado) return;

    if (!usuario || usuario.rol !== 'ADMIN') {
      window.location.href = '/login';
    } else {
      setListo(true);
    }
  }, [usuario, hidratado]);

  if (!listo) {
    return <p>Verificando acceso...</p>;
  }

  return children;
}