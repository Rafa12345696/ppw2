import { useStore } from '../../store';

export default function SesionInfo() {
  const usuario = useStore((state) => state.usuario);
  const cerrarSesion = useStore((state) => state.cerrarSesion);

  if (!usuario) {
    return <a href="/login" style={{ color: 'white' }}>Entrar</a>;
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {usuario.rol === 'ADMIN' && <a href="/admin" style={{ color: 'white' }}>Admin</a>}
      <a href="/mis-pedidos" style={{ color: 'white' }}>Mis pedidos</a>
      <span>Hola, {usuario.nombre}</span>
      <button onClick={() => { cerrarSesion(); window.location.href = '/tienda'; }}>Salir</button>
    </div>
  );
}