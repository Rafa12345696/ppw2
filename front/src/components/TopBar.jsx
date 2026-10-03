import { useStore } from '../store';

export default function TopBar({ busqueda, setBusqueda }) {
  const irA = useStore((state) => state.irA);
  const carrito = useStore((state) => state.carrito);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#1a1a1a', color: 'white', gap: '1rem' }}>
      <h2 onClick={() => irA('home')} style={{ cursor: 'pointer', margin: 0 }}>Elixir</h2>

      {setBusqueda && (
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
      )}

      <button onClick={() => irA('carrito')}>
        Carrito ({carrito.length})
      </button>
    </div>
  );
}