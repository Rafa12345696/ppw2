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
const COLORES = ['#b8860b', '#1a1a1a', '#2e7d32', '#1565c0', '#b00020', '#6a1b9a'];
const METODOS = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal', DESCONOCIDO: 'Sin dato' };
const ESTADOS = { PENDIENTE_PAGO: 'Pendiente', PAGADO: 'Pagado', CANCELADO: 'Cancelado', EXPIRADO: 'Expirado' };

const estiloCaja = { border: '1px solid #e0e0e0', borderRadius: 10, padding: '1rem', background: 'white' };

function Variacion({ actual, anterior }) {
  if (!anterior) {
    return <div style={{ fontSize: '0.8rem', color: '#666' }}>Sin periodo anterior para comparar</div>;
  }
  const pct = ((actual - anterior) / anterior) * 100;
  const sube = pct >= 0;
  return (
    <div style={{ fontSize: '0.8rem', color: sube ? '#2e7d32' : '#b00020' }}>
      {sube ? '+' : ''}{pct.toFixed(1)}% vs periodo anterior
    </div>
  );
}

function Tarjeta({ titulo, valor, extra }) {
  return (
    <div style={{ ...estiloCaja, flex: '1 1 170px' }}>
      <div style={{ fontSize: '0.85rem', color: '#666' }}>{titulo}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{valor}</div>
      {extra}
    </div>
  );
}

function Caja({ titulo, vacio, children }) {
  return (
    <div style={{ ...estiloCaja, flex: '1 1 380px' }}>
      <h4 style={{ marginBottom: '0.5rem' }}>{titulo}</h4>
      {vacio ? (
        <p style={{ color: '#666' }}>Sin datos en este periodo.</p>
      ) : (
        <div style={{ width: '100%', height: 260 }}>{children}</div>
      )}
    </div>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div style={{ ...estiloCaja, flex: '1 1 380px' }}>
      <h4 style={{ marginBottom: '0.5rem' }}>{titulo}</h4>
      {children}
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '0.75rem' }}>{titulo}</h3>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>{children}</div>
    </section>
  );
}

function Dona({ datos, formato }) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={datos} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
          {datos.map((_, i) => (
            <Cell key={i} fill={COLORES[i % COLORES.length]} />
          ))}
        </Pie>
        <Tooltip formatter={formato} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Panel() {
  const token = useStore((state) => state.token);
  const [dias, setDias] = useState(30);
  const [d, setDatos] = useState(null);
  const [error, setError] = useState('');

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
  }, [dias, token]);

  if (error) return <p style={{ color: '#b00020' }}>{error}</p>;
  if (!d) return <p>Cargando estadisticas...</p>;

  const sinVentas = d.pedidosPagados === 0;
  const metodos = d.ventasPorMetodo.map((m) => ({ name: METODOS[m.metodo] || m.metodo, value: m.total }));
  const estados = d.pedidosPorEstado.map((e) => ({ name: ESTADOS[e.estado] || e.estado, value: e.cantidad }));
  const categorias = d.ventasPorCategoria.map((c) => ({ name: c.categoria, value: c.total }));

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <span>Periodo:</span>
        {[7, 30, 90].map((n) => (
          <button key={n} onClick={() => setDias(n)} disabled={dias === n}>
            {n} dias
          </button>
        ))}
      </div>

      <Seccion titulo="Resumen">
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
          extra={<div style={{ fontSize: '0.8rem', color: '#666' }}>{d.pedidosCreados} pedidos creados</div>}
        />
        <Tarjeta titulo="Usuarios nuevos" valor={d.usuariosNuevos} />
        <Tarjeta titulo="Clientes recurrentes" valor={d.clientesRecurrentes} />
        <Tarjeta titulo="Pendientes de pago" valor={d.pedidosPendientes} />
      </Seccion>

      <Seccion titulo="Tendencias de ventas">
        <Caja titulo="Ventas por dia" vacio={sinVentas}>
          <ResponsiveContainer>
            <LineChart data={d.ventasPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tickFormatter={(f) => f.slice(5)} />
              <YAxis />
              <Tooltip formatter={(v) => dinero.format(v)} />
              <Line type="monotone" dataKey="total" name="Ventas" stroke="#b8860b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Caja>

        <Caja titulo="Ventas por dia de la semana" vacio={sinVentas}>
          <ResponsiveContainer>
            <BarChart data={d.ventasPorDiaSemana}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip formatter={(v) => dinero.format(v)} />
              <Bar dataKey="total" name="Ventas" fill="#b8860b" />
            </BarChart>
          </ResponsiveContainer>
        </Caja>

        <Caja titulo="Pedidos por hora del dia" vacio={sinVentas}>
          <ResponsiveContainer>
            <BarChart data={d.ventasPorHora}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" tickFormatter={(h) => `${h}h`} interval={2} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(h) => `${h}:00 h`} />
              <Bar dataKey="pedidos" name="Pedidos" fill="#1a1a1a" />
            </BarChart>
          </ResponsiveContainer>
        </Caja>
      </Seccion>

      <Seccion titulo="Productos">
        <Caja titulo="Mas vendidos (unidades)" vacio={d.topProductos.length === 0}>
          <ResponsiveContainer>
            <BarChart data={d.topProductos} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="nombre" width={120} />
              <Tooltip />
              <Bar dataKey="unidades" name="Unidades" fill="#b8860b" />
            </BarChart>
          </ResponsiveContainer>
        </Caja>

        <Caja titulo="Ingresos por categoria" vacio={categorias.length === 0}>
          <Dona datos={categorias} formato={(v) => dinero.format(v)} />
        </Caja>

        <Bloque titulo="Se compran juntos">
          {d.productosRelacionados.length === 0 ? (
            <p style={{ color: '#666' }}>Aun no hay pedidos con 2 o mas productos distintos.</p>
          ) : (
            <ul style={{ paddingLeft: '1.2rem' }}>
              {d.productosRelacionados.map((p, i) => (
                <li key={i}>
                  {p.a} + {p.b}: <strong>{p.veces}</strong> {p.veces === 1 ? 'vez' : 'veces'}
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque titulo="Sin movimiento en el periodo">
          {d.productosSinMovimiento.length === 0 ? (
            <p style={{ color: '#666' }}>Todos los productos con stock tuvieron ventas.</p>
          ) : (
            <ul style={{ paddingLeft: '1.2rem' }}>
              {d.productosSinMovimiento.map((p) => (
                <li key={p.id}>{p.nombre}: {p.stock} piezas sin vender</li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque titulo="Stock bajo (5 o menos)">
          {d.stockBajo.length === 0 ? (
            <p style={{ color: '#666' }}>Todo el inventario esta bien.</p>
          ) : (
            <ul style={{ paddingLeft: '1.2rem' }}>
              {d.stockBajo.map((p) => (
                <li key={p.id} style={{ color: p.stock === 0 ? '#b00020' : 'inherit' }}>
                  {p.nombre}: {p.stock === 0 ? 'agotado' : `${p.stock} piezas`}
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="nombre" width={120} />
              <Tooltip formatter={(v) => dinero.format(v)} />
              <Bar dataKey="total" name="Gastado" fill="#2e7d32" />
            </BarChart>
          </ResponsiveContainer>
        </Caja>

        <Bloque titulo="Clientes destacados">
          {d.topClientes.length === 0 ? (
            <p style={{ color: '#666' }}>Aun no hay compras pagadas.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                  <th>Cliente</th>
                  <th>Pedidos</th>
                  <th>Gastado</th>
                </tr>
              </thead>
              <tbody>
                {d.topClientes.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td>
                      {c.nombre}
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{c.email}</div>
                    </td>
                    <td>{c.pedidos}</td>
                    <td>{dinero.format(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Bloque>

        <Caja titulo="Nuevos registros por dia" vacio={d.usuariosNuevos === 0}>
          <ResponsiveContainer>
            <LineChart data={d.usuariosPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tickFormatter={(f) => f.slice(5)} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="cantidad" name="Registros" stroke="#1565c0" strokeWidth={2} />
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