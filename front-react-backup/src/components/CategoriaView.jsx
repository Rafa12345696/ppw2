import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { graphqlRequest } from '../api';
import TopBar from './TopBar';
import Skeleton from './Skeleton';

const QUERY = `
  query($categoriaId: ID!) {
    productosPorCategoria(categoriaId: $categoriaId) {
      id
      nombre
      precio
      imagen
    }
  }
`;

export default function CategoriaView() {
  const categoriaSeleccionada = useStore((state) => state.categoriaSeleccionada);
  const seleccionarProducto = useStore((state) => state.seleccionarProducto);
  const irA = useStore((state) => state.irA);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = () => {
    setCargando(true);
    setError(false);
    graphqlRequest(QUERY, { categoriaId: categoriaSeleccionada })
      .then((data) => {
        if (!data || !data.productosPorCategoria) {
          setError(true);
        } else {
          setProductos(data.productosPorCategoria);
        }
        setCargando(false);
      })
      .catch(() => {
        setError(true);
        setCargando(false);
      });
  };

  useEffect(() => {
    cargar();
  }, [categoriaSeleccionada]);

  return (
    <div>
      <TopBar />
      <button onClick={() => irA('home')} style={{ margin: '1rem' }}>Volver</button>

      {error && (
        <div style={{ padding: '1rem', color: '#b00020' }}>
          <p>Ocurrio un error al cargar los productos de esta categoria.</p>
          <button onClick={cargar}>Reintentar</button>
        </div>
      )}

      {!error && cargando && <Skeleton />}

      {!error && !cargando && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem' }}>
          {productos.map((prod) => (
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
    </div>
  );
}