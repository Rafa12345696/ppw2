import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { graphqlRequest } from '../api';
import TopBar from './TopBar';
import Skeleton from './Skeleton';

const QUERY_PRODUCTOS = `
  query {
    productos {
      id
      nombre
      precio
      imagen
      categoriaId
    }
  }
`;

export default function Home() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const seleccionarCategoria = useStore((state) => state.seleccionarCategoria);
  const seleccionarProducto = useStore((state) => state.seleccionarProducto);

  const cargarProductos = () => {
    setCargando(true);
    setError(false);
    graphqlRequest(QUERY_PRODUCTOS)
      .then((data) => {
        if (!data || !data.productos) {
          setError(true);
        } else {
          setProductos(data.productos);
        }
        setCargando(false);
      })
      .catch(() => {
        setError(true);
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const categorias = [...new Set(productos.map((p) => p.categoriaId))];
  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div>
      <TopBar busqueda={busqueda} setBusqueda={setBusqueda} />

      <section style={{ padding: '2rem', background: '#222', color: 'white' }}>
        <h1>Bienvenido a Elixir</h1>
        <p>Los mejores licores, directo a tu puerta.</p>
      </section>

      <div style={{ display: 'flex' }}>
        <aside style={{ padding: '1rem', minWidth: 150, borderRight: '1px solid #ddd' }}>
          <h4>Categorias</h4>
          {categorias.map((cat) => (
            <div
              key={cat}
              onClick={() => seleccionarCategoria(cat)}
              style={{ cursor: 'pointer', padding: '0.4rem 0' }}
            >
              Categoria {cat.slice(-4)}
            </div>
          ))}
        </aside>

        <main style={{ flex: 1 }}>
          <h3 style={{ padding: '0 1rem' }}>Mas vendidos</h3>

          {error && (
            <div style={{ padding: '1rem', color: '#b00020' }}>
              <p>Ocurrio un error al cargar los productos.</p>
              <button onClick={cargarProductos}>Reintentar</button>
            </div>
          )}

          {!error && cargando && <Skeleton />}

          {!error && !cargando && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem' }}>
              {productosFiltrados.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => seleccionarProducto(prod)}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 10,
                    padding: '1rem',
                    cursor: 'pointer',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  <img
                    src={prod.imagen}
                    alt={prod.nombre}
                    style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 6, marginBottom: '0.5rem' }}
                  />
                  <h4>{prod.nombre}</h4>
                  <p>${prod.precio}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <section style={{ padding: '1rem', background: '#f5f5f5' }}>
        <h4>Venta responsable</h4>
        <p>Este sitio es exclusivo para mayores de edad. Verificamos tu identidad antes de completar cualquier compra.</p>
      </section>

      <footer style={{ padding: '1rem', background: '#111', color: 'white', textAlign: 'center' }}>
        Elixir © 2026
      </footer>
    </div>
  );
}