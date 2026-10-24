import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import { estilos } from './adminUi';

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

  if (error) return <p style={{ color: '#b00020' }}>{error}</p>;
  if (!categorias) return <p>Cargando categorias...</p>;

  const visibles = categorias.filter((c) => c.nombre.toLowerCase().includes(buscar.trim().toLowerCase()));

  return (
    <div>
      <form onSubmit={crear} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <input value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nombre de la nueva categoria" required minLength={2} maxLength={40} />
        <button type="submit">+ Crear categoria</button>
      </form>

      <div style={{ marginBottom: '1rem' }}>
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar categoria" style={{ minWidth: 240 }} />
      </div>

      {mensaje && <p style={{ color: '#b00020' }}>{mensaje}</p>}

      {visibles.length === 0 ? (
        <p>No hay categorias que coincidan.</p>
      ) : (
        <table style={estilos.tabla}>
          <thead>
            <tr style={estilos.encabezado}>
              <th>Nombre</th>
              <th>Productos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => {
              const editando = edicion?.id === c.id;
              return (
                <tr key={c.id} style={estilos.fila}>
                  <td>
                    {editando ? (
                      <input value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} />
                    ) : (
                      c.nombre
                    )}
                  </td>
                  <td>{c.totalProductos}</td>
                  <td>
                    {editando ? (
                      <>
                        <button onClick={guardar}>Guardar</button>
                        <button style={{ marginLeft: '0.4rem' }} onClick={() => setEdicion(null)}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEdicion({ id: c.id, nombre: c.nombre })}>Renombrar</button>
                        <button
                          style={{ marginLeft: '0.4rem' }}
                          disabled={c.totalProductos > 0}
                          title={c.totalProductos > 0 ? 'Mueve sus productos a otra categoria primero' : ''}
                          onClick={() => eliminar(c)}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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