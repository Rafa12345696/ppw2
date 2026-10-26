import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import { useListado, Paginador, BarraFiltros, Campo, estilos, dinero } from './adminUi';

const QUERY = `
  query($filtro: FiltroProductos, $pagina: Int, $porPagina: Int) {
    productosPagina(filtro: $filtro, pagina: $pagina, porPagina: $porPagina) {
      total
      pagina
      paginas
      items { id nombre precio stock categoria { nombre } }
    }
  }
`;

const CATEGORIAS = `query { categoriasAdmin { id nombre } }`;

const ELIMINAR = `
  mutation($id: ID!) {
    eliminarProducto(id: $id) { id }
  }
`;

const INICIAL = { categoriaId: null, stock: null };

function Lista() {
  const token = useStore((state) => state.token);
  const L = useListado({ query: QUERY, campo: 'productosPagina', inicial: INICIAL, enVivo: true });
  const [categorias, setCategorias] = useState([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    graphqlRequest(CATEGORIAS, {}, token)
      .then((d) => setCategorias(d.categoriasAdmin))
      .catch(() => {});
  }, [token]);

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    setMensaje('');
    try {
      await graphqlRequest(ELIMINAR, { id: p.id }, token);
      L.recargar();
    } catch (e) {
      setMensaje(e.message || 'No se pudo eliminar el producto');
    }
  };

  return (
    <div>
      <a href="/admin/nuevo"><button style={{ marginBottom: '1rem' }}>+ Nuevo producto</button></a>

      <BarraFiltros
        escrito={L.escrito}
        setEscrito={L.setEscrito}
        placeholder="Nombre o descripcion"
        limpiar={L.limpiar}
      >
        <Campo etiqueta="Categoria">
          <select value={L.filtros.categoriaId || ''} onChange={(e) => L.cambiarFiltro('categoriaId', e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Inventario">
          <select value={L.filtros.stock || ''} onChange={(e) => L.cambiarFiltro('stock', e.target.value)}>
            <option value="">Todo</option>
            <option value="BAJO">Stock bajo (1 a 5)</option>
            <option value="AGOTADO">Agotados</option>
          </select>
        </Campo>
      </BarraFiltros>

      {mensaje && <p style={{ color: '#b00020' }}>{mensaje}</p>}
      {L.error && <p style={{ color: '#b00020' }}>{L.error}</p>}
      {!L.datos && !L.error && <p>Cargando productos...</p>}

      {L.datos && (
        <div style={{ opacity: L.cargando ? 0.6 : 1 }}>
          {L.datos.items.length === 0 ? (
            <p>No hay productos con esos filtros.</p>
          ) : (
            <table style={estilos.tabla}>
              <thead>
                <tr style={estilos.encabezado}>
                  <th>Nombre</th>
                  <th>Categoria</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {L.datos.items.map((p) => (
                  <tr key={p.id} style={estilos.fila}>
                    <td>{p.nombre}</td>
                    <td>{p.categoria?.nombre || '—'}</td>
                    <td>{dinero.format(p.precio)}</td>
                    <td style={{ color: p.stock === 0 ? '#b00020' : p.stock <= 5 ? '#b26a00' : 'inherit' }}>
                      {p.stock === 0 ? 'Agotado' : p.stock}
                    </td>
                    <td>
                      <a href={`/admin/editar/${p.id}`}>Editar</a>
                      {' | '}
                      <button onClick={() => eliminar(p)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Paginador pagina={L.datos.pagina} paginas={L.datos.paginas} total={L.datos.total} onCambiar={L.setPagina} />
        </div>
      )}
    </div>
  );
}

export default function AdminProductos() {
  return (
    <RequiereAdmin>
      <Lista />
    </RequiereAdmin>
  );
}