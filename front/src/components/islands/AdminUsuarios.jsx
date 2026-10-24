import { useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import PasswordInput from './PasswordInput';
import { useListado, Paginador, BarraFiltros, Campo, estilos, fechaHora } from './adminUi';

const QUERY = `
  query($filtro: FiltroUsuarios, $pagina: Int, $porPagina: Int) {
    usuariosPagina(filtro: $filtro, pagina: $pagina, porPagina: $porPagina) {
      total
      pagina
      paginas
      items { id nombre email rol activo createdAt }
    }
  }
`;

const CREAR = `mutation($data: CrearUsuarioInput!) { crearUsuario(data: $data) { id } }`;
const ESTADO = `mutation($id: ID!, $activo: Boolean!) { cambiarEstadoUsuario(id: $id, activo: $activo) { id } }`;
const ACTUALIZAR = `mutation($id: ID!, $data: ActualizarUsuarioInput!) { actualizarUsuario(id: $id, data: $data) { id } }`;
const PASSWORD = `mutation($id: ID!, $password: String!) { restablecerPasswordUsuario(id: $id, password: $password) }`;

const INICIAL = { rol: null, estado: null };

function Gestion() {
  const token = useStore((state) => state.token);
  const yo = useStore((state) => state.usuario);
  const L = useListado({ query: QUERY, campo: 'usuariosPagina', inicial: INICIAL });
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [edicion, setEdicion] = useState(null);
  const [nuevo, setNuevo] = useState({ nombre: '', email: '', password: '', rol: 'CLIENTE' });
  const [enviando, setEnviando] = useState(false);

  const avisar = (tipo, texto) => setMensaje({ tipo, texto });

  const ejecutar = async (mutation, variables, exito) => {
    avisar('', '');
    try {
      await graphqlRequest(mutation, variables, token);
      if (exito) avisar('ok', exito);
      L.recargar();
      return true;
    } catch (e) {
      avisar('error', e.message || 'No se pudo completar la accion');
      return false;
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    setEnviando(true);
    const ok = await ejecutar(CREAR, { data: nuevo }, 'Usuario creado');
    if (ok) setNuevo({ nombre: '', email: '', password: '', rol: 'CLIENTE' });
    setEnviando(false);
  };

  const cambiarEstado = (u, activo) => {
    if (!confirm(`¿Seguro que quieres ${activo ? 'reactivar' : 'desactivar'} a ${u.nombre}?`)) return;
    ejecutar(ESTADO, { id: u.id, activo });
  };

  const guardarEdicion = async () => {
    const ok =
      edicion.modo === 'datos'
        ? await ejecutar(ACTUALIZAR, { id: edicion.id, data: { nombre: edicion.nombre, rol: edicion.rol } }, 'Usuario actualizado')
        : await ejecutar(PASSWORD, { id: edicion.id, password: edicion.password }, 'Contraseña restablecida');
    if (ok) setEdicion(null);
  };

  return (
    <div>
      <form onSubmit={crear} style={{ maxWidth: 360, marginBottom: '2rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: 10 }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Nuevo usuario</h4>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>Nombre</label><br />
          <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>Correo</label><br />
          <input type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>Contraseña (minimo 6)</label><br />
          <PasswordInput value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} minLength={6} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>Rol</label><br />
          <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })} style={{ width: '100%' }}>
            <option value="CLIENTE">Cliente</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        <button type="submit" disabled={enviando}>{enviando ? 'Creando...' : 'Crear usuario'}</button>
      </form>

      <BarraFiltros escrito={L.escrito} setEscrito={L.setEscrito} placeholder="Nombre o correo" limpiar={L.limpiar}>
        <Campo etiqueta="Rol">
          <select value={L.filtros.rol || ''} onChange={(e) => L.cambiarFiltro('rol', e.target.value)}>
            <option value="">Todos</option>
            <option value="CLIENTE">Cliente</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </Campo>
        <Campo etiqueta="Estado">
          <select value={L.filtros.estado || ''} onChange={(e) => L.cambiarFiltro('estado', e.target.value)}>
            <option value="">Todos</option>
            <option value="ACTIVO">Activos</option>
            <option value="DESACTIVADO">Desactivados</option>
          </select>
        </Campo>
      </BarraFiltros>

      {mensaje.texto && (
        <p style={{ color: mensaje.tipo === 'error' ? '#b00020' : '#2e7d32', marginBottom: '1rem' }}>{mensaje.texto}</p>
      )}
      {L.error && <p style={{ color: '#b00020' }}>{L.error}</p>}
      {!L.datos && !L.error && <p>Cargando usuarios...</p>}

      {L.datos && (
        <div style={{ opacity: L.cargando ? 0.6 : 1 }}>
          {L.datos.items.length === 0 ? (
            <p>No hay usuarios con esos filtros.</p>
          ) : (
            <table style={estilos.tabla}>
              <thead>
                <tr style={estilos.encabezado}>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Alta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {L.datos.items.map((u) => {
                  const activo = u.activo !== false;
                  const editando = edicion?.id === u.id;
                  return (
                    <tr key={u.id} style={{ ...estilos.fila, opacity: activo ? 1 : 0.55, verticalAlign: 'top' }}>
                      <td>
                        {editando && edicion.modo === 'datos' ? (
                          <input value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} />
                        ) : (
                          u.nombre
                        )}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        {editando && edicion.modo === 'datos' ? (
                          <select
                            value={edicion.rol}
                            disabled={u.id === yo?.id}
                            onChange={(e) => setEdicion({ ...edicion, rol: e.target.value })}
                          >
                            <option value="CLIENTE">Cliente</option>
                            <option value="ADMIN">Administrador</option>
                          </select>
                        ) : u.rol === 'ADMIN' ? 'Administrador' : 'Cliente'}
                      </td>
                      <td>{activo ? 'Activo' : 'Desactivado'}</td>
                      <td>{fechaHora(u.createdAt)}</td>
                      <td style={{ minWidth: 230 }}>
                        {editando && edicion.modo === 'password' && (
                          <div style={{ marginBottom: '0.4rem' }}>
                            <PasswordInput
                              value={edicion.password}
                              onChange={(e) => setEdicion({ ...edicion, password: e.target.value })}
                              placeholder="Contraseña nueva"
                              minLength={6}
                            />
                          </div>
                        )}
                        {editando ? (
                          <>
                            <button onClick={guardarEdicion}>Guardar</button>
                            <button style={{ marginLeft: '0.4rem' }} onClick={() => setEdicion(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEdicion({ id: u.id, modo: 'datos', nombre: u.nombre, rol: u.rol })}>Editar</button>
                            <button style={{ marginLeft: '0.4rem' }} onClick={() => setEdicion({ id: u.id, modo: 'password', password: '' })}>Contraseña</button>
                            {u.id === yo?.id ? (
                              <em style={{ marginLeft: '0.4rem' }}>(tu cuenta)</em>
                            ) : (
                              <button style={{ marginLeft: '0.4rem' }} onClick={() => cambiarEstado(u, !activo)}>
                                {activo ? 'Desactivar' : 'Reactivar'}
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <Paginador pagina={L.datos.pagina} paginas={L.datos.paginas} total={L.datos.total} onCambiar={L.setPagina} />
        </div>
      )}
    </div>
  );
}

export default function AdminUsuarios() {
  return (
    <RequiereAdmin>
      <Gestion />
    </RequiereAdmin>
  );
}