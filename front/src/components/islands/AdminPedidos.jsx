import { Fragment, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import { useListado, Paginador, BarraFiltros, Campo, EstadoListado, Mensaje, dinero, fechaHora } from './adminUi';
import { ESTADOS_PEDIDO, ENVIOS, METODOS } from '../../formato';
import { EstadoPedido, EstadoEnvio, EstadoPago } from './Estado';

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

const SIGUIENTE = { POR_PREPARAR: 'PREPARANDO', PREPARANDO: 'ENVIADO', ENVIADO: 'ENTREGADO' };

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
            {Object.entries(ESTADOS_PEDIDO).map(([v, t]) => <option key={v} value={v}>{t.texto}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Envio">
          <select value={L.filtros.envio || ''} onChange={(e) => L.cambiarFiltro('envio', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ENVIOS).map(([v, t]) => <option key={v} value={v}>{t.texto}</option>)}
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

      <Mensaje>{mensaje}</Mensaje>
      <EstadoListado L={L} vacio="No hay pedidos con esos filtros." />

      {L.datos && L.datos.items.length > 0 && (
        <div style={{ opacity: L.cargando ? 0.6 : 1 }} aria-busy={L.cargando}>
          <div className="tabla-envoltura">
            <table className="tabla">
              <caption className="sr-only">Pedidos</caption>
              <thead>
                <tr>
                  <th scope="col">Pedido</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Cliente</th>
                  <th scope="col" className="derecha">Total</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Envio</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {L.datos.items.map((p) => {
                  const envio = p.estado === 'PAGADO' ? p.envio || 'POR_PREPARAR' : null;
                  const siguiente = envio ? SIGUIENTE[envio] : null;
                  const detalleId = `detalle-${p.id}`;
                  return (
                    <Fragment key={p.id}>
                      <tr>
                        <td className="mono">{p.id.slice(-6).toUpperCase()}</td>
                        <td>{fechaHora(p.fecha)}</td>
                        <td>
                          {p.usuario ? (
                            <>
                              {p.usuario.nombre}
                              <div className="texto-3">{p.usuario.email}</div>
                            </>
                          ) : '—'}
                        </td>
                        <td className="derecha num">
                          {dinero.format(p.total)}
                          {p.metodoPago && <div className="texto-3">{METODOS[p.metodoPago]}</div>}
                        </td>
                        <td><EstadoPedido estado={p.estado} /></td>
                        <td>{envio ? <EstadoEnvio envio={envio} /> : <span className="texto-3">—</span>}</td>
                        <td>
                          <div className="acciones" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                            {siguiente && (
                              <button type="button" className="btn btn-primario btn-sm" onClick={() => ejecutar(CAMBIAR_ENVIO, { id: p.id, envio: siguiente })}>
                                Marcar {ENVIOS[siguiente].texto.toLowerCase()}
                              </button>
                            )}
                            {p.estado === 'PENDIENTE_PAGO' && (
                              <button type="button" className="btn btn-peligro btn-sm" onClick={() => cancelar(p)}>Cancelar</button>
                            )}
                            <button
                              type="button"
                              className="btn btn-fantasma btn-sm"
                              aria-expanded={abierto === p.id}
                              aria-controls={detalleId}
                              onClick={() => setAbierto(abierto === p.id ? null : p.id)}
                            >
                              {abierto === p.id ? 'Ocultar' : 'Detalle'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {abierto === p.id && (
                        <tr className="detalle" id={detalleId}>
                          <td colSpan={7}>
                            <div className="fila" style={{ alignItems: 'flex-start', gap: 32 }}>
                              <div className="pila-sm">
                                <strong>Productos</strong>
                                <ul className="lista-simple" style={{ minWidth: 260 }}>
                                  {p.detalles.map((d, i) => (
                                    <li key={i}>
                                      <span>{d.nombre} × {d.cantidad}</span>
                                      <span className="num">{dinero.format(d.precioUnit)} c/u</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="pila-sm">
                                <strong>Intentos de pago</strong>
                                {p.pagos.length === 0 ? (
                                  <span className="texto-3">Sin intentos de pago.</span>
                                ) : (
                                  <ul className="lista-simple" style={{ minWidth: 260 }}>
                                    {p.pagos.map((g) => (
                                      <li key={g.id}>
                                        <span>{METODOS[g.proveedor] || g.proveedor} · {g.monto} {g.moneda}</span>
                                        <EstadoPago estado={g.estado} />
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              {p.estado === 'PAGADO' && <a href={`/comprobante?pedido=${p.id}`}>Ver comprobante</a>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
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
