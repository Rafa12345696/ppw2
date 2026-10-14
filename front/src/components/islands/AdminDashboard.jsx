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
      ventasPorDia { fecha total pedidos }
      topProductos { nombre unidades ingresos }
      ventasPorMetodo { metodo total pedidos }
      pedidosPorEstado { estado cantidad }
      stockBajo { id nombre stock }
    }
  }
`;

const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const COLORES = ['#b8860b', '#1a1a1a', '#2e7d32', '#1565c0', '#b00020', '#6a1b9a'];
const METODOS = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal', DESCONOCIDO: 'Sin dato' };
const ESTADOS = { PENDIENTE_PAGO: 'Pendiente', PAGADO: 'Pagado', CANCELADO: 'Cancelado', EXPIRADO: 'Expirado' };

function Tarjeta({ titulo, valor }) {
  return (
    <div style={{ flex: '1 1 180px', border: '1px solid #e0e0e0', borderRadius: 10, padding: '1rem', background: 'white' }}>
      <div style={{ fontSize: '0.85rem', color: '#666' }}>{titulo}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{valor}</div>
    </div>
  );
}

function Caja({ titulo, vacio, children }) {
  return (
    <div style={{ flex: '1 1 380px', border: '1px solid #e0e0e0', borderRadius: 10, padding: '1rem', background: 'white' }}>
      <h4 style={{ marginBottom: '0.5rem' }}>{titulo}</h4>
      {vacio ? (
        <p style={{ color: '#666' }}>Sin datos en este periodo.</p>
      ) : (
        <div style={{ width: '100%', height: 260 }}>{children}</div>
      )}
    </div>
  );
}

function Panel() {
  const token = useStore((state) => state.token);
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null);
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
  if (!datos) return <p>Cargando estadisticas...</p>;

  const metodos = datos.ventasPorMetodo.map((m) => ({ name: METODOS[m.metodo] || m.metodo, value: m.total }));
  const estados = datos.pedidosPorEstado.map((e) => ({ name: ESTADOS[e.estado] || e.estado, value: e.cantidad }));

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <span>Periodo:</span>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDias(d)} disabled={dias === d}>
            {d} dias
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Tarjeta titulo="Ingresos" valor={dinero.format(datos.ingresosTotales)} />
        <Tarjeta titulo="Pedidos pagados" valor={datos.pedidosPagados} />
        <Tarjeta titulo="Ticket promedio" valor={dinero.format(datos.ticketPromedio)} />
        <Tarjeta titulo="Pendientes de pago" valor={datos.pedidosPendientes} />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Caja titulo="Ventas por dia" vacio={datos.pedidosPagados === 0}>
          <ResponsiveContainer>
            <LineChart data={datos.ventasPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tickFormatter={(f) => f.slice(5)} />
              <YAxis />
              <Tooltip formatter={(v) => dinero.format(v)} />
              <Line type="monotone" dataKey="total" name="Ventas" stroke="#b8860b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Caja>

        <Caja titulo="Productos mas vendidos (unidades)" vacio={datos.topProductos.length === 0}>
          <ResponsiveContainer>
            <BarChart data={datos.topProductos} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="nombre" width={120} />
              <Tooltip />
              <Bar dataKey="unidades" name="Unidades" fill="#b8860b" />
            </BarChart>
          </ResponsiveContainer>
        </Caja>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Caja titulo="Ingresos por metodo de pago" vacio={metodos.length === 0}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={metodos} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                {metodos.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => dinero.format(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Caja>

        <Caja titulo="Pedidos por estado (historico)" vacio={estados.length === 0}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={estados} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                {estados.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Caja>

        <div style={{ flex: '1 1 380px', border: '1px solid #e0e0e0', borderRadius: 10, padding: '1rem', background: 'white' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Stock bajo (5 o menos)</h4>
          {datos.stockBajo.length === 0 ? (
            <p style={{ color: '#666' }}>Todo el inventario esta bien.</p>
          ) : (
            <ul style={{ paddingLeft: '1.2rem' }}>
              {datos.stockBajo.map((p) => (
                <li key={p.id} style={{ color: p.stock === 0 ? '#b00020' : 'inherit' }}>
                  {p.nombre}: {p.stock === 0 ? 'agotado' : `${p.stock} piezas`}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
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