import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';

const QUERY = `
  query {
    productos(take: 100) {
      id
      nombre
      precio
      stock
    }
  }
`;

const MUTATION_ELIMINAR = `
  mutation($id: ID!) {
    eliminarProducto(id: $id) {
      id
    }
  }
`;

function ListaProductos() {
  const token = useStore((state) => state.token);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = () => {
    setCargando(true);
    graphqlRequest(QUERY)
      .then((data) => {
        setProductos(data.productos);
        setCargando(false);
      })
      .catch(() => {
        setError('Error al cargar productos');
        setCargando(false);
      });
  };

  useEffect(() => {
    cargar();
  }, []);

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await graphqlRequest(MUTATION_ELIMINAR, { id }, token);
      cargar();
    } catch (e) {
      setError('No se pudo eliminar el producto');
    }
  };

  if (cargando) return <p>Cargando...</p>;
  if (error) return <p style={{ color: '#b00020' }}>{error}</p>;

  return (
    <div>
      <a href="/admin/nuevo"><button style={{ marginBottom: '1rem' }}>+ Nuevo producto</button></a>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{p.nombre}</td>
              <td>${p.precio}</td>
              <td>{p.stock}</td>
              <td>
                <a href={`/admin/editar/${p.id}`}>Editar</a>
                {' | '}
                <button onClick={() => eliminar(p.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminProductos() {
  return (
    <RequiereAdmin>
      <ListaProductos />
    </RequiereAdmin>
  );
}