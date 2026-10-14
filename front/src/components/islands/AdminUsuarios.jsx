import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import PasswordInput from './PasswordInput';

const QUERY = `
  query {
    usuarios { id nombre email rol activo createdAt }
  }
`;

const CREAR = `
  mutation($data: CrearUsuarioInput!) {
    crearUsuario(data: $data) { id }
  }
`;

const ESTADO = `
  mutation($id: ID!, $activo: Boolean!) {
    cambiarEstadoUsuario(id: $id, activo: $activo) { id }
  }
`;

function Gestion() {
  const token = useStore((state) => state.token);
  const yo = useStore((state) => state.usuario);
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('CLIENTE');
  const [enviando, setEnviando] = useState(false);

  const cargar = () => {
    graphqlRequest(QUERY, {}, token)
      .then((data) => setUsuarios(data.usuarios))
      .catch(() => setError('No se pudieron cargar los usuarios'));
  };

  useEffect(() => {
    cargar();
  }, []);

  const crear = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await graphqlRequest(CREAR, { data: { nombre, email, password, rol } }, token);
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('CLIENTE');
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo crear el usuario');
    }
    setEnviando(false);
  };

  const cambiar = async (u, activo) => {
    const texto = activo ? 'reactivar' : 'desactivar';
    if (!confirm(`¿Seguro que quieres ${texto} a ${u.nombre}?`)) return;
    setError('');
    try {
      await graphqlRequest(ESTADO, { id: u.id, activo }, token);
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo cambiar el estado');
    }
  };

  return (
    <div>
      <form onSubmit={crear} style={{ maxWidth: 360, marginBottom: '2rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: 10 }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Nuevo usuario</h4>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>Nombre</label><br />
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>Correo</label><br />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>Contraseña (minimo 6)</label><br />
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>Rol</label><br />
          <select value={rol} onChange={(e) => setRol(e.target.value)} style={{ width: '100%' }}>
            <option value="CLIENTE">Cliente</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        <button type="submit" disabled={enviando}>{enviando ? 'Creando...' : 'Crear usuario'}</button>
      </form>

      {error && <p style={{ color: '#b00020', marginBottom: '1rem' }}>{error}</p>}
      {!usuarios && !error && <p>Cargando usuarios...</p>}

      {usuarios && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const activo = u.activo !== false;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee', opacity: activo ? 1 : 0.55 }}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{u.rol === 'ADMIN' ? 'Administrador' : 'Cliente'}</td>
                  <td>{activo ? 'Activo' : 'Desactivado'}</td>
                  <td>
                    {u.id === yo?.id ? (
                      <em>(tu cuenta)</em>
                    ) : activo ? (
                      <button onClick={() => cambiar(u, false)}>Desactivar</button>
                    ) : (
                      <button onClick={() => cambiar(u, true)}>Reactivar</button>
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

export default function AdminUsuarios() {
  return (
    <RequiereAdmin>
      <Gestion />
    </RequiereAdmin>
  );
}