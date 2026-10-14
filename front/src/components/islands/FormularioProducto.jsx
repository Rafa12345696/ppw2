import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';

const QUERY_CATEGORIAS = `
  query {
    categorias {
      id
      nombre
    }
  }
`;

const MUTATION_CREAR = `
  mutation($data: CrearProductoInput!) {
    crearProducto(data: $data) {
      id
    }
  }
`;

const MUTATION_ACTUALIZAR = `
  mutation($id: ID!, $data: ActualizarProductoInput!) {
    actualizarProducto(id: $id, data: $data) {
      id
    }
  }
`;

const QUERY_PRODUCTO = `
  query($id: ID!) {
    productoPorId(id: $id) {
      nombre
      precio
      stock
      descripcion
      imagen
      categoriaId
    }
  }
`;

function Formulario({ productoId }) {
  const token = useStore((state) => state.token);
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagen, setImagen] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    graphqlRequest(QUERY_CATEGORIAS).then((data) => setCategorias(data.categorias));

    if (productoId) {
      graphqlRequest(QUERY_PRODUCTO, { id: productoId }).then((data) => {
        const p = data.productoPorId;
        setNombre(p.nombre);
        setPrecio(p.precio);
        setStock(p.stock);
        setDescripcion(p.descripcion);
        setImagen(p.imagen);
        setCategoriaId(p.categoriaId);
      });
    }
  }, [productoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      if (productoId) {
        await graphqlRequest(
          MUTATION_ACTUALIZAR,
          { id: productoId, data: { nombre, precio: Number(precio), stock: Number(stock), descripcion, imagen } },
          token,
        );
      } else {
        await graphqlRequest(
          MUTATION_CREAR,
          { data: { nombre, precio: Number(precio), stock: Number(stock), descripcion, imagen, categoriaId } },
          token,
        );
      }
      window.location.href = '/admin/productos';
    } catch (err) {
      setError('No se pudo guardar el producto. Revisa los datos.');
    }
    setEnviando(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <div style={{ marginBottom: '1rem' }}>
        <label>Nombre</label><br />
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Precio</label><br />
        <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Stock</label><br />
        <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Descripcion</label><br />
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Imagen (ruta o URL)</label><br />
        <input value={imagen} onChange={(e) => setImagen(e.target.value)} required style={{ width: '100%' }} />
      </div>
      {!productoId && (
        <div style={{ marginBottom: '1rem' }}>
          <label>Categoria</label><br />
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required style={{ width: '100%' }}>
            <option value="">Selecciona una categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      )}
      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando...' : productoId ? 'Actualizar' : 'Crear producto'}
      </button>
    </form>
  );
}

export default function FormularioProducto({ productoId }) {
  return (
    <RequiereAdmin>
      <Formulario productoId={productoId} />
    </RequiereAdmin>
  );
}