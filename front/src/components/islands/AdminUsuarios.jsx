import { useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import PasswordInput from './PasswordInput';
import { useListado, Paginador, BarraFiltros, Campo, EstadoListado, Mensaje, fechaHora } from './adminUi';

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
    <div className="pila-lg">
      <details className="tarjeta tarjeta-sm">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Crear un usuario</summary>
        <form onSubmit={crear} className="pila" style={{ maxWidth: 420, marginTop: 16 }}>
          <div className="campo">
            <label htmlFor="nu-nombre">Nombre</label>
            <input id="nu-nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
          </div>
          <div className="campo">
            <label htmlFor="nu-email">Correo</label>
            <input id="nu-email" type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} required />
          </div>
          <div className="campo">
            <label htmlFor="nu-password">Contraseña</label>
            <PasswordInput id="nu-password" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} minLength={6} autoComplete="new-password" describedBy="nu-password-ayuda" />
            <span id="nu-password-ayuda" className="ayuda">Minimo 6 caracteres.</span>
          </div>
          <div className="campo">
            <label htmlFor="nu-rol">Rol</label>
            <select id="nu-rol" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
              <option value="CLIENTE">Cliente</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primario" disabled={enviando} aria-busy={enviando}>
            {enviando ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      </details>

      <div>
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

        <Mensaje tipo={mensaje.tipo}>{mensaje.texto}</Mensaje>
        <EstadoListado L={L} vacio="No hay usuarios con esos filtros." />

        {L.datos && L.datos.items.length > 0 && (
          <div style={{ opacity: L.cargando ? 0.6 : 1 }} aria-busy={L.cargando}>
            <div className="tabla-envoltura">
              <table className="tabla">
                <caption className="sr-only">Usuarios</caption>
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Alta</th>
                    <th scope="col"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {L.datos.items.map((u) => {
                    const activo = u.activo !== false;
                    const editando = edicion?.id === u.id;
                    const esYo = u.id === yo?.id;
                    return (
                      <tr key={u.id} className={activo ? undefined : 'fila-inactiva'}>
                        <td>
                          {editando && edicion.modo === 'datos' ? (
                            <label className="campo-compacto">
                              <span className="sr-only">Nombre</span>
                              <input value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} autoFocus />
                            </label>
                          ) : (
                            <>
                              {u.nombre} {esYo && <span className="etiqueta etiqueta-info">Tu</span>}
                            </>
                          )}
                          <div className="texto-3">{u.email}</div>
                        </td>
                        <td>
                          {editando && edicion.modo === 'datos' ? (
                            <label className="campo-compacto">
                              <span className="sr-only">Rol</span>
                              <select value={edicion.rol} disabled={esYo} onChange={(e) => setEdicion({ ...edicion, rol: e.target.value })}>
                                <option value="CLIENTE">Cliente</option>
                                <option value="ADMIN">Administrador</option>
                              </select>
                            </label>
                          ) : u.rol === 'ADMIN' ? (
                            <span className="etiqueta etiqueta-premium">Administrador</span>
                          ) : (
                            'Cliente'
                          )}
                        </td>
                        <td>
                          <span className={`etiqueta etiqueta-${activo ? 'ok' : 'neutra'}`}>
                            <span className="punto" aria-hidden="true" />
                            {activo ? 'Activo' : 'Desactivado'}
                          </span>
                        </td>
                        <td>{fechaHora(u.createdAt)}</td>
                        <td style={{ minWidth: 260 }}>
                          {editando && edicion.modo === 'password' && (
                            <div style={{ marginBottom: 8 }}>
                              <label htmlFor={`pw-${u.id}`} className="sr-only">Contraseña nueva para {u.nombre}</label>
                              <PasswordInput
                                id={`pw-${u.id}`}
                                value={edicion.password}
                                onChange={(e) => setEdicion({ ...edicion, password: e.target.value })}
                                placeholder="Contraseña nueva"
                                minLength={6}
                                autoComplete="new-password"
                              />
                            </div>
                          )}
                          <div className="acciones" style={{ justifyContent: 'flex-end' }}>
                            {editando ? (
                              <>
                                <button type="button" className="btn btn-primario btn-sm" onClick={guardarEdicion}>Guardar</button>
                                <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setEdicion(null)}>Cancelar</button>
                              </>
                            ) : (
                              <>
                                <button type="button" className="btn btn-neutro btn-sm" onClick={() => setEdicion({ id: u.id, modo: 'datos', nombre: u.nombre, rol: u.rol })}>
                                  Editar<span className="sr-only"> {u.nombre}</span>
                                </button>
                                <button type="button" className="btn btn-neutro btn-sm" onClick={() => setEdicion({ id: u.id, modo: 'password', password: '' })}>
                                  Contraseña<span className="sr-only"> de {u.nombre}</span>
                                </button>
                                {!esYo && (
                                  <button type="button" className={`btn btn-sm ${activo ? 'btn-peligro' : 'btn-secundario'}`} onClick={() => cambiarEstado(u, !activo)}>
                                    {activo ? 'Desactivar' : 'Reactivar'}<span className="sr-only"> {u.nombre}</span>
                                  </button>
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
            <Paginador pagina={L.datos.pagina} paginas={L.datos.paginas} total={L.datos.total} onCambiar={L.setPagina} />
          </div>
        )}
      </div>
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
