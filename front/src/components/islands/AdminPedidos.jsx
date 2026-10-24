import { Fragment, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import { useListado, Paginador, BarraFiltros, Campo, estilos, dinero, fechaHora } from './adminUi';

const QUERY = `
  query($filtro: FiltroPedidos, $pagina: Int, $porPagina: Int) {
    pedidosPagina(filtro: $filtro, pagina: $pagina, porPagina: $porPagina) {
      total
      pagina
      paginas
      items {
        id
        fecha
        estado
        envio
        total
        metodoPago
        usuario { nombre email }
        detalles { nombre cantidad precioUnit }
        pagos { id proveedor estado monto moneda }
      }
    }
  }
`;

const CANCELAR = `mutation($id: ID!) { cancelarPedido(id: $id) { id } }`;
const CAMBIAR_ENVIO = `mutation($id: ID!, $envio: String!) { cambiarEnvioPedido(id: $id, envio: $envio) { id envio } }`;

const ESTADOS = { PENDIENTE_PAGO: 'Pendiente de pago', PAGADO: 'Pagado', CANCELADO: 'Cancelado', EXPIRADO: 'Expirado' };
const ENVIOS = { POR_PREPARAR: 'Por preparar', PREPARANDO: 'Preparando', ENVIADO: 'Enviado', ENTREGADO: 'Entregado' };
const SIGUIENTE = { POR_PREPARAR: 'PREPARANDO', PREPARANDO: 'ENVIADO', ENVIADO: 'ENTREGADO' };
const METODOS = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal' };

const INICIAL = { estado: null, envio: null, metodoPago: null, desde: null, hasta: null };

function Lista() {
  const token = useStore((state) => state.token);
  const L = useListado({ query: QUERY, campo: 'pedidosPagina', inicial: INICIAL, enVivo: true });
  const [abierto, setAbierto] = useState(null);
  const [mensaje, setMensaje] = useState('');

  const ejecutar = async (mutation, variables) => {
    setMensaje('');
    try {
      await graphqlRequest(mutation, variables, token);
      L.recargar();
    } catch (e) {
      setMensaje(e.message || 'No se pudo completar la accion');
    }
  };

  const cancelar = (p) => {
    if (!confirm('¿Cancelar este pedido y devolver el stock?')) return;
    ejecutar(CANCELAR, { id: p.id });
  };

  return (
    <div>
      <BarraFiltros
        escrito={L.escrito}
        setEscrito={L.setEscrito}
        placeholder="Folio, cliente o correo"
        limpiar={L.limpiar}
      >
        <Campo etiqueta="Estado">
          <select value={L.filtros.estado || ''} onChange={(e) => L.cambiarFiltro('estado', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Envio">
          <select value={L.filtros.envio || ''} onChange={(e) => L.cambiarFiltro('envio', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ENVIOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Metodo de pago">
          <select value={L.filtros.metodoPago || ''} onChange={(e) => L.cambiarFiltro('metodoPago', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(METODOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Desde">
          <input type="date" value={L.filtros.desde || ''} onChange={(e) => L.cambiarFiltro('desde', e.target.value)} />
        </Campo>
        <Campo etiqueta="Hasta">
          <input type="date" value={L.filtros.hasta || ''} onChange={(e) => L.cambiarFiltro('hasta', e.target.value)} />
        </Campo>
      </BarraFiltros>

      {mensaje && <p style={{ color: '#b00020' }}>{mensaje}</p>}
      {L.error && <p style={{ color: '#b00020' }}>{L.error}</p>}
      {!L.datos && !L.error && <p>Cargando pedidos...</p>}

      {L.datos && (
        <div style={{ opacity: L.cargando ? 0.6 : 1 }}>
          {L.datos.items.length === 0 ? (
            <p>No hay pedidos con esos filtros.</p>
          ) : (
            <table style={estilos.tabla}>
              <thead>
                <tr style={estilos.encabezado}>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Envio</th>
                  <th>Metodo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {L.datos.items.map((p) => {
                  const envio = p.estado === 'PAGADO' ? p.envio || 'POR_PREPARAR' : null;
                  const siguiente = envio ? SIGUIENTE[envio] : null;
                  return (
                    <Fragment key={p.id}>
                      <tr style={estilos.fila}>
                        <td>{p.id.slice(-6)}</td>
                        <td>{fechaHora(p.fecha)}</td>
                        <td>{p.usuario ? `${p.usuario.nombre} (${p.usuario.email})` : '—'}</td>
                        <td>{dinero.format(p.total)}</td>
                        <td>{ESTADOS[p.estado] || p.estado}</td>
                        <td>{envio ? ENVIOS[envio] : '—'}</td>
                        <td>{METODOS[p.metodoPago] || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button onClick={() => setAbierto(abierto === p.id ? null : p.id)}>
                            {abierto === p.id ? 'Ocultar' : 'Detalle'}
                          </button>
                          {siguiente && (
                            <button
                              style={{ marginLeft: '0.4rem' }}
                              onClick={() => ejecutar(CAMBIAR_ENVIO, { id: p.id, envio: siguiente })}
                            >
                              Marcar {ENVIOS[siguiente].toLowerCase()}
                            </button>
                          )}
                          {p.estado === 'PENDIENTE_PAGO' && (
                            <button style={{ marginLeft: '0.4rem' }} onClick={() => cancelar(p)}>Cancelar</button>
                          )}
                        </td>
                      </tr>
                      {abierto === p.id && (
                        <tr style={{ background: '#fafafa', color: '#1a1a1a' }}>
                          <td colSpan={8} style={{ padding: '0.75rem' }}>
                            <p style={{ marginBottom: '0.5rem' }}>
                              <a href={`/comprobante?pedido=${p.id}`}>Ver comprobante</a>
                            </p>
                            <strong>Productos</strong>
                            <ul style={{ paddingLeft: '1.2rem', marginBottom: '0.5rem' }}>
                              {p.detalles.map((d, i) => (
                                <li key={i}>{d.nombre} x{d.cantidad} — {dinero.format(d.precioUnit)} c/u</li>
                              ))}
                            </ul>
                            <strong>Pagos</strong>
                            {p.pagos.length === 0 ? (
                              <p>Sin intentos de pago.</p>
                            ) : (
                              <ul style={{ paddingLeft: '1.2rem' }}>
                                {p.pagos.map((g) => (
                                  <li key={g.id}>
                                    {METODOS[g.proveedor] || g.proveedor}: {g.estado} — {g.monto} {g.moneda}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

export default function AdminPedidos() {
  return (
    <RequiereAdmin>
      <Lista />
    </RequiereAdmin>
  );
}