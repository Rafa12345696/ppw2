import { useListado, Paginador, BarraFiltros, Campo, EstadoListado, fechaHora } from './adminUi';
import RequiereAdmin from './RequiereAdmin';

const QUERY = `
  query($filtro: FiltroBitacora, $pagina: Int, $porPagina: Int) {
    bitacoraPagina(filtro: $filtro, pagina: $pagina, porPagina: $porPagina) {
      total
      pagina
      paginas
      items { id fecha adminEmail accion entidad entidadId detalle }
    }
  }
`;

const ENTIDADES = ['PRODUCTO', 'CATEGORIA', 'USUARIO', 'PEDIDO', 'IMAGEN', 'OTRO'];
const INICIAL = { entidad: null, desde: null, hasta: null };

function Lista() {
  const L = useListado({ query: QUERY, campo: 'bitacoraPagina', inicial: INICIAL, porPagina: 20 });

  return (
    <div>
      <BarraFiltros
        escrito={L.escrito}
        setEscrito={L.setEscrito}
        placeholder="Accion, correo del admin o dato"
        limpiar={L.limpiar}
      >
        <Campo etiqueta="Tipo">
          <select value={L.filtros.entidad || ''} onChange={(e) => L.cambiarFiltro('entidad', e.target.value)}>
            <option value="">Todos</option>
            {ENTIDADES.map((e) => <option key={e} value={e}>{e.charAt(0) + e.slice(1).toLowerCase()}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Desde">
          <input type="date" value={L.filtros.desde || ''} onChange={(e) => L.cambiarFiltro('desde', e.target.value)} />
        </Campo>
        <Campo etiqueta="Hasta">
          <input type="date" value={L.filtros.hasta || ''} onChange={(e) => L.cambiarFiltro('hasta', e.target.value)} />
        </Campo>
        <button type="button" className="btn btn-neutro btn-sm" onClick={L.recargar}>Actualizar</button>
      </BarraFiltros>

      <EstadoListado L={L} vacio="No hay acciones registradas con esos filtros." />

      {L.datos && L.datos.items.length > 0 && (
        <div style={{ opacity: L.cargando ? 0.6 : 1 }} aria-busy={L.cargando}>
          <div className="tabla-envoltura">
            <table className="tabla">
              <caption className="sr-only">Bitacora de acciones del administrador</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Admin</th>
                  <th scope="col">Accion</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">ID</th>
                  <th scope="col">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {L.datos.items.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fechaHora(r.fecha)}</td>
                    <td>{r.adminEmail}</td>
                    <td className="mono">{r.accion}</td>
                    <td><span className="etiqueta etiqueta-neutra">{r.entidad}</span></td>
                    <td className="mono">{r.entidadId ? r.entidadId.slice(-6).toUpperCase() : '—'}</td>
                    <td className="mono texto-3" style={{ maxWidth: 360, overflowWrap: 'anywhere', fontSize: 'var(--t-xs)' }}>
                      {r.detalle || '—'}
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

export default function AdminBitacora() {
  return (
    <RequiereAdmin>
      <Lista />
    </RequiereAdmin>
  );
}
