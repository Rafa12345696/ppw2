import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import { useListado, Paginador, BarraFiltros, Campo, EstadoListado, Mensaje, dinero } from './adminUi';
import { Etiquetas } from './Precio';

const QUERY = `
  query($filtro: FiltroProductos, $pagina: Int, $porPagina: Int) {
    productosPagina(filtro: $filtro, pagina: $pagina, porPagina: $porPagina) {
      total
      pagina
      paginas
      items { id nombre precio precioAntes premium stock categoria { nombre } }
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
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta accion no se puede deshacer.`)) return;
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
      <div className="fila-entre" style={{ marginBottom: 16 }}>
        <span className="texto-2">Los cambios se ven al instante en la tienda.</span>
        <a href="/admin/nuevo" className="btn btn-primario">+ Nuevo producto</a>
      </div>

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

      <Mensaje>{mensaje}</Mensaje>
      <EstadoListado L={L} vacio="No hay productos con esos filtros." />

      {L.datos && L.datos.items.length > 0 && (
        <div style={{ opacity: L.cargando ? 0.6 : 1 }} aria-busy={L.cargando}>
          <div className="tabla-envoltura">
            <table className="tabla">
              <caption className="sr-only">Productos</caption>
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col">Categoria</th>
                  <th scope="col" className="derecha">Precio</th>
                  <th scope="col" className="derecha">Stock</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {L.datos.items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="pila-sm" style={{ gap: 4 }}>
                        <strong style={{ fontWeight: 500 }}>{p.nombre}</strong>
                        <Etiquetas producto={p} />
                      </div>
                    </td>
                    <td>{p.categoria?.nombre || '—'}</td>
                    <td className="derecha num">
                      {dinero.format(p.precio)}
                      {p.precioAntes > p.precio && <div className="texto-3"><s>{dinero.format(p.precioAntes)}</s></div>}
                    </td>
                    <td className="derecha num">
                      {p.stock === 0 ? (
                        <span className="etiqueta etiqueta-error">Agotado</span>
                      ) : p.stock <= 5 ? (
                        <span className="etiqueta etiqueta-aviso">{p.stock}</span>
                      ) : (
                        p.stock
                      )}
                    </td>
                    <td>
                      <div className="acciones" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <a className="btn btn-neutro btn-sm" href={`/admin/editar/${p.id}`}>
                          Editar<span className="sr-only"> {p.nombre}</span>
                        </a>
                        <button type="button" className="btn btn-peligro btn-sm" onClick={() => eliminar(p)}>
                          Eliminar<span className="sr-only"> {p.nombre}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
