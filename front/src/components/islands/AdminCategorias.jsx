import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import { Mensaje } from './adminUi';

const QUERY = `query { categoriasAdmin { id nombre totalProductos } }`;
const CREAR = `mutation($nombre: String!) { crearCategoria(nombre: $nombre) { id } }`;
const ACTUALIZAR = `mutation($id: ID!, $nombre: String!) { actualizarCategoria(id: $id, nombre: $nombre) { id } }`;
const ELIMINAR = `mutation($id: ID!) { eliminarCategoria(id: $id) }`;

function Gestion() {
  const token = useStore((state) => state.token);
  const [categorias, setCategorias] = useState(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [buscar, setBuscar] = useState('');
  const [nueva, setNueva] = useState('');
  const [edicion, setEdicion] = useState(null);

  const cargar = () => {
    graphqlRequest(QUERY, {}, token)
      .then((d) => setCategorias(d.categoriasAdmin))
      .catch(() => setError('No se pudieron cargar las categorias'));
  };

  useEffect(() => {
    cargar();
  }, []);

  const ejecutar = async (mutation, variables) => {
    setMensaje('');
    try {
      await graphqlRequest(mutation, variables, token);
      cargar();
      return true;
    } catch (e) {
      setMensaje(e.message || 'No se pudo completar la accion');
      return false;
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    if (await ejecutar(CREAR, { nombre: nueva })) setNueva('');
  };

  const guardar = async () => {
    if (await ejecutar(ACTUALIZAR, { id: edicion.id, nombre: edicion.nombre })) setEdicion(null);
  };

  const eliminar = (c) => {
    if (!confirm(`¿Eliminar la categoria "${c.nombre}"?`)) return;
    ejecutar(ELIMINAR, { id: c.id });
  };

  if (error) return <div className="alerta alerta-error" role="alert">{error}</div>;
  if (!categorias) return <div className="esqueleto" style={{ height: 220 }} aria-label="Cargando categorias" />;

  const visibles = categorias.filter((c) => c.nombre.toLowerCase().includes(buscar.trim().toLowerCase()));

  return (
    <div className="pila-lg">
      <div className="fila-entre" style={{ alignItems: 'flex-end' }}>
        <form onSubmit={crear} className="fila" style={{ alignItems: 'flex-end' }}>
          <label className="campo-compacto">
            Nueva categoria
            <input value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Ej. Mezcal" required minLength={2} maxLength={40} />
          </label>
          <button type="submit" className="btn btn-primario btn-sm" style={{ minHeight: 40 }}>Crear categoria</button>
        </form>
        <label className="campo-compacto">
          Buscar
          <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre" style={{ minWidth: 220 }} />
        </label>
      </div>

      <Mensaje>{mensaje}</Mensaje>

      {visibles.length === 0 ? (
        <div className="vacio"><p>No hay categorias que coincidan.</p></div>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <caption className="sr-only">Categorias</caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col" className="derecha">Productos</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => {
                const editando = edicion?.id === c.id;
                return (
                  <tr key={c.id}>
                    <td>
                      {editando ? (
                        <label className="campo-compacto">
                          <span className="sr-only">Nuevo nombre de {c.nombre}</span>
                          <input value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} autoFocus />
                        </label>
                      ) : (
                        c.nombre
                      )}
                    </td>
                    <td className="derecha num">{c.totalProductos}</td>
                    <td>
                      <div className="acciones" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        {editando ? (
                          <>
                            <button type="button" className="btn btn-primario btn-sm" onClick={guardar}>Guardar</button>
                            <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setEdicion(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn btn-neutro btn-sm" onClick={() => setEdicion({ id: c.id, nombre: c.nombre })}>
                              Renombrar<span className="sr-only"> {c.nombre}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-peligro btn-sm"
                              disabled={c.totalProductos > 0}
                              title={c.totalProductos > 0 ? 'Mueve sus productos a otra categoria primero' : undefined}
                              aria-describedby={c.totalProductos > 0 ? `no-borrar-${c.id}` : undefined}
                              onClick={() => eliminar(c)}
                            >
                              Eliminar<span className="sr-only"> {c.nombre}</span>
                            </button>
                            {c.totalProductos > 0 && (
                              <span id={`no-borrar-${c.id}`} className="sr-only">No se puede eliminar porque tiene productos</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminCategorias() {
  return (
    <RequiereAdmin>
      <Gestion />
    </RequiereAdmin>
  );
}
