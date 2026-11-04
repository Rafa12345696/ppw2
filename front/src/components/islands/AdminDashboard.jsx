import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import { suscribirse } from '../../ws';

const QUERY = `
  query($dias: Int) {
    estadisticas(dias: $dias) {
      ingresosTotales
      pedidosPagados
      ticketPromedio
      pedidosPendientes
      ingresosAnterior
      pedidosAnterior
      tasaConversion
      pedidosCreados
      usuariosNuevos
      clientesRecurrentes
      ventasPorDia { fecha total pedidos }
      ventasPorDiaSemana { dia total pedidos }
      ventasPorHora { hora pedidos }
      topProductos { nombre unidades ingresos }
      ventasPorCategoria { categoria total unidades }
      productosRelacionados { a b veces }
      productosSinMovimiento { id nombre stock }
      stockBajo { id nombre stock }
      topClientes { id nombre email pedidos total }
      usuariosPorDia { fecha cantidad }
      ventasPorMetodo { metodo total pedidos }
      pedidosPorEstado { estado cantidad }
    }
  }
`;

const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
// Paleta de graficas: marca, negro, azul, ocre, verde, gris (distinguibles tambien por luminosidad)
const COLORES = ['#6b1d2a', '#1c1c1c', '#1f4e79', '#b07a1f', '#1e6b3a', '#9a9a97'];
const MARCA = '#6b1d2a';
const EJE = { fontSize: 12, fill: '#5c5c5c' };
const METODOS = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal', DESCONOCIDO: 'Sin dato' };
const ESTADOS = { PENDIENTE_PAGO: 'Pendiente', PAGADO: 'Pagado', CANCELADO: 'Cancelado', EXPIRADO: 'Expirado' };

function Variacion({ actual, anterior }) {
  if (!anterior) {
    return <span className="texto-3">Sin periodo anterior para comparar</span>;
  }
  const pct = ((actual - anterior) / anterior) * 100;
  const sube = pct >= 0;
  return (
    <span className={`variacion ${sube ? 'variacion-sube' : 'variacion-baja'}`}>
      {sube ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% <span className="texto-3">vs periodo anterior</span>
    </span>
  );
}

function Tarjeta({ titulo, valor, extra }) {
  return (
    <div className="kpi">
      <span className="titulo-kpi">{titulo}</span>
      <span className="valor-kpi">{valor}</span>
      {extra}
    </div>
  );
}

// Grafica dentro de una tarjeta; la grafica es decorativa para lectores de pantalla:
// los mismos datos estan en las listas y tarjetas de numeros
function Caja({ titulo, vacio, children }) {
  return (
    <figure className="tarjeta tarjeta-sm pila-sm" style={{ margin: 0 }}>
      <figcaption><h3 style={{ fontSize: 'var(--t-md)' }}>{titulo}</h3></figcaption>
      {vacio ? (
        <p className="texto-3" style={{ padding: '32px 0', textAlign: 'center' }}>Sin datos en este periodo.</p>
      ) : (
        <div style={{ width: '100%', height: 260 }}>{children}</div>
      )}
    </figure>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div className="tarjeta tarjeta-sm pila-sm">
      <h3 style={{ fontSize: 'var(--t-md)' }}>{titulo}</h3>
      {children}
    </div>
  );
}

function Seccion({ titulo, children, kpis = false }) {
  return (
    <section className="pila" style={{ marginBottom: 32 }} aria-label={titulo}>
      <h2 style={{ fontSize: 'var(--t-lg)' }}>{titulo}</h2>
      <div className={kpis ? 'kpis' : 'graficas'}>{children}</div>
    </section>
  );
}

function Dona({ datos, formato }) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={datos} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} stroke="#fff" strokeWidth={2}>
          {datos.map((_, i) => (
            <Cell key={i} fill={COLORES[i % COLORES.length]} />
          ))}
        </Pie>
        <Tooltip formatter={formato} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Panel() {
  const token = useStore((state) => state.token);
  const [dias, setDias] = useState(30);
  const [d, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [refresco, setRefresco] = useState(0);
  const [enVivo, setEnVivo] = useState(false);

  // Cuando el servidor avisa de un cambio, se vuelve a pedir el resumen
  useEffect(() => {
    let espera = null;
    const parar = suscribirse({
      query: 'subscription { estadisticasActualizadas { motivo } }',
      token,
      onData: () => {
        clearTimeout(espera);
        espera = setTimeout(() => setRefresco((n) => n + 1), 400);
      },
      onEstado: setEnVivo,
    });
    return () => {
      clearTimeout(espera);
      parar();
    };
  }, [token]);

  useEffect(() => {
    let cancelado = false;
    setError('');
    graphqlRequest(QUERY, { dias }, token)
      .then((data) => {
        if (!cancelado) setDatos(data.estadisticas);
      })
      .catch(() => {
        if (!cancelado) setError('No se pudieron cargar las estadisticas');
      });
    return () => {
      cancelado = true;
    };
  }, [dias, token, refresco]);

  if (error) return <div className="alerta alerta-error" role="alert">{error}</div>;
  if (!d) return <div className="esqueleto" style={{ height: 320 }} aria-label="Cargando estadisticas" />;

  const sinVentas = d.pedidosPagados === 0;
  const metodos = d.ventasPorMetodo.map((m) => ({ name: METODOS[m.metodo] || m.metodo, value: m.total }));
  const estados = d.pedidosPorEstado.map((e) => ({ name: ESTADOS[e.estado] || e.estado, value: e.cantidad }));
  const categorias = d.ventasPorCategoria.map((c) => ({ name: c.categoria, value: c.total }));

  return (
    <div>
      <div className="fila-entre" style={{ marginBottom: 24 }}>
        <span className="en-vivo" data-activo={enVivo}>
          <span className="punto" aria-hidden="true" />
          {enVivo ? 'En vivo' : 'Sin conexion en vivo'}
        </span>
        <div className="fila" style={{ gap: 8 }}>
          <span className="texto-2" id="periodo">Periodo</span>
          <div className="segmentado" role="group" aria-labelledby="periodo">
            {[7, 30, 90].map((n) => (
              <button key={n} type="button" aria-pressed={dias === n} onClick={() => setDias(n)}>
                {n} dias
              </button>
            ))}
          </div>
        </div>
      </div>

      <Seccion titulo="Resumen" kpis>
        <Tarjeta
          titulo="Ingresos"
          valor={dinero.format(d.ingresosTotales)}
          extra={<Variacion actual={d.ingresosTotales} anterior={d.ingresosAnterior} />}
        />
        <Tarjeta
          titulo="Pedidos pagados"
          valor={d.pedidosPagados}
          extra={<Variacion actual={d.pedidosPagados} anterior={d.pedidosAnterior} />}
        />
        <Tarjeta titulo="Ticket promedio" valor={dinero.format(d.ticketPromedio)} />
        <Tarjeta
          titulo="Conversion"
          valor={`${d.tasaConversion}%`}
          extra={<span className="texto-3">{d.pedidosCreados} pedidos creados</span>}
        />
        <Tarjeta titulo="Usuarios nuevos" valor={d.usuariosNuevos} />
        <Tarjeta titulo="Clientes recurrentes" valor={d.clientesRecurrentes} />
        <Tarjeta titulo="Pendientes de pago" valor={d.pedidosPendientes} />
      </Seccion>

      <Seccion titulo="Tendencias de ventas">
        <Caja titulo="Ventas por dia" vacio={sinVentas}>
          <ResponsiveContainer>
            <LineChart data={d.ventasPorDia}>
              <CartesianGrid stroke="#e2e2e0" vertical={false} />
              <XAxis dataKey="fecha" tickFormatter={(f) => f.slice(5)} tick={EJE} />
              <YAxis tick={EJE} />
              <Tooltip formatter={(v) => dinero.format(v)} />
              <Line type="monotone" dataKey="total" name="Ventas" stroke={MARCA} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Caja>

        <Caja titulo="Ventas por dia de la semana" vacio={sinVentas}>
          <ResponsiveContainer>
            <BarChart data={d.ventasPorDiaSemana}>
              <CartesianGrid stroke="#e2e2e0" vertical={false} />
              <XAxis dataKey="dia" tick={EJE} />
              <YAxis tick={EJE} />
              <Tooltip formatter={(v) => dinero.format(v)} />
              <Bar dataKey="total" name="Ventas" fill={MARCA} />
            </BarChart>
          </ResponsiveContainer>
        </Caja>

        <Caja titulo="Pedidos por hora del dia" vacio={sinVentas}>
          <ResponsiveContainer>
            <BarChart data={d.ventasPorHora}>
              <CartesianGrid stroke="#e2e2e0" vertical={false} />
              <XAxis dataKey="hora" tickFormatter={(h) => `${h}h`} interval={2} tick={EJE} />
              <YAxis allowDecimals={false} tick={EJE} />
              <Tooltip labelFormatter={(h) => `${h}:00 h`} />
              <Bar dataKey="pedidos" name="Pedidos" fill="#1c1c1c" />
            </BarChart>
          </ResponsiveContainer>
        </Caja>
      </Seccion>

      <Seccion titulo="Productos">
        <Caja titulo="Mas vendidos (unidades)" vacio={d.topProductos.length === 0}>
          <ResponsiveContainer>
            <BarChart data={d.topProductos} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke="#e2e2e0" vertical={false} />
              <XAxis type="number" allowDecimals={false} tick={EJE} />
              <YAxis type="category" dataKey="nombre" width={130} tick={EJE} />
              <Tooltip />
              <Bar dataKey="unidades" name="Unidades" fill={MARCA} />
            </BarChart>
          </ResponsiveContainer>
        </Caja>

        <Caja titulo="Ingresos por categoria" vacio={categorias.length === 0}>
          <Dona datos={categorias} formato={(v) => dinero.format(v)} />
        </Caja>

        <Bloque titulo="Se compran juntos">
          {d.productosRelacionados.length === 0 ? (
            <p className="texto-3">Aun no hay pedidos con 2 o mas productos distintos.</p>
          ) : (
            <ul className="lista-simple">
              {d.productosRelacionados.map((p, i) => (
                <li key={i}>
                  <span>{p.a} + {p.b}</span>
                  <strong className="num">{p.veces} {p.veces === 1 ? 'vez' : 'veces'}</strong>
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque titulo="Sin movimiento en el periodo">
          {d.productosSinMovimiento.length === 0 ? (
            <p className="texto-3">Todos los productos con stock tuvieron ventas.</p>
          ) : (
            <ul className="lista-simple">
              {d.productosSinMovimiento.map((p) => (
                <li key={p.id}>
                  <span>{p.nombre}</span>
                  <span className="num texto-2">{p.stock} sin vender</span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque titulo="Stock bajo (5 o menos)">
          {d.stockBajo.length === 0 ? (
            <p className="texto-3">Todo el inventario esta bien.</p>
          ) : (
            <ul className="lista-simple">
              {d.stockBajo.map((p) => (
                <li key={p.id}>
                  <span>{p.nombre}</span>
                  {p.stock === 0 ? (
                    <span className="etiqueta etiqueta-error">Agotado</span>
                  ) : (
                    <span className="etiqueta etiqueta-aviso">{p.stock} piezas</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      </Seccion>

      <Seccion titulo="Clientes">
        <Caja titulo="Clientes que mas gastan" vacio={d.topClientes.length === 0}>
          <ResponsiveContainer>
            <BarChart data={d.topClientes} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke="#e2e2e0" vertical={false} />
              <XAxis type="number" tick={EJE} />
              <YAxis type="category" dataKey="nombre" width={130} tick={EJE} />
              <Tooltip formatter={(v) => dinero.format(v)} />
              <Bar dataKey="total" name="Gastado" fill="#1e6b3a" />
            </BarChart>
          </ResponsiveContainer>
        </Caja>

        <Bloque titulo="Clientes destacados">
          {d.topClientes.length === 0 ? (
            <p className="texto-3">Aun no hay compras pagadas.</p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col" className="derecha">Pedidos</th>
                  <th scope="col" className="derecha">Gastado</th>
                </tr>
              </thead>
              <tbody>
                {d.topClientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.nombre}
                      <div className="texto-3">{c.email}</div>
                    </td>
                    <td className="derecha num">{c.pedidos}</td>
                    <td className="derecha num">{dinero.format(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Bloque>

        <Caja titulo="Nuevos registros por dia" vacio={d.usuariosNuevos === 0}>
          <ResponsiveContainer>
            <LineChart data={d.usuariosPorDia}>
              <CartesianGrid stroke="#e2e2e0" vertical={false} />
              <XAxis dataKey="fecha" tickFormatter={(f) => f.slice(5)} tick={EJE} />
              <YAxis allowDecimals={false} tick={EJE} />
              <Tooltip />
              <Line type="monotone" dataKey="cantidad" name="Registros" stroke="#1f4e79" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Caja>
      </Seccion>

      <Seccion titulo="Pagos y pedidos">
        <Caja titulo="Ingresos por metodo de pago" vacio={metodos.length === 0}>
          <Dona datos={metodos} formato={(v) => dinero.format(v)} />
        </Caja>

        <Caja titulo="Pedidos por estado (historico)" vacio={estados.length === 0}>
          <Dona datos={estados} />
        </Caja>
      </Seccion>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <RequiereAdmin>
      <Panel />
    </RequiereAdmin>
  );
}