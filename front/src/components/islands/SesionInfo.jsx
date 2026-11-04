import { useStore } from '../../store';

export default function SesionInfo() {
  const usuario = useStore((state) => state.usuario);
  const cerrarSesion = useStore((state) => state.cerrarSesion);

  if (!usuario) {
    return (
      <>
        <a href="/login">Iniciar sesion</a>
        <a href="/registro">Crear cuenta</a>
      </>
    );
  }

  return (
    <>
      {usuario.rol === 'ADMIN' && <a href="/admin">Panel admin</a>}
      <a href="/mis-pedidos">Mis pedidos</a>
      <span className="texto-2">Hola, {usuario.nombre.split(' ')[0]}</span>
      <button
        type="button"
        className="btn btn-fantasma btn-sm"
        onClick={() => {
          cerrarSesion();
          window.location.href = '/tienda';
        }}
      >
        Salir
      </button>
    </>
  );
}
