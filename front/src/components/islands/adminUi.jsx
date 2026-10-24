import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { suscribirse } from '../../ws';

export const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
export const fechaHora = (f) => (f ? new Date(f).toLocaleString('es-MX') : '—');
export const folio = (id) => `ELX-${id.slice(-8).toUpperCase()}`;

export const estilos = {
  barra: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' },
  campo: { display: 'flex', flexDirection: 'column', fontSize: '0.85rem', gap: 2 },
  tabla: { width: '100%', borderCollapse: 'collapse' },
  encabezado: { textAlign: 'left', borderBottom: '2px solid #ccc' },
  fila: { borderBottom: '1px solid #eee' },
};

// Maneja busqueda (con pausa al escribir), filtros, pagina y recarga de una tabla del servidor
export function useListado({ query, campo, inicial, porPagina = 10, enVivo = false }) {
  const token = useStore((state) => state.token);
  const [filtros, setFiltros] = useState(inicial);
  const [escrito, setEscrito] = useState('');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setBuscar(escrito.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [escrito]);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    graphqlRequest(query, { filtro: { ...filtros, buscar: buscar || null }, pagina, porPagina }, token)
      .then((d) => {
        if (cancelado) return;
        const lista = d[campo];
        // Si se borro el ultimo elemento de una pagina, se regresa a la anterior
        if (lista.items.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }
        setDatos(lista);
        setCargando(false);
      })
      .catch((e) => {
  if (cancelado) return;
  console.error('Error al cargar listado:', campo, e);
  setError(e.message || 'No se pudo cargar la informacion');
  setCargando(false);
});
    return () => {
      cancelado = true;
    };
  }, [filtros, buscar, pagina, version, token]);

  // Tablas en vivo: se vuelven a pedir cuando el servidor avisa de un cambio
  useEffect(() => {
    if (!enVivo) return;
    let espera;
    const parar = suscribirse({
      query: 'subscription { estadisticasActualizadas { motivo } }',
      token,
      onData: () => {
        clearTimeout(espera);
        espera = setTimeout(() => setVersion((n) => n + 1), 500);
      },
    });
    return () => {
      clearTimeout(espera);
      parar();
    };
  }, [enVivo, token]);

  const cambiarFiltro = (nombre, valor) => {
    setFiltros((f) => ({ ...f, [nombre]: valor || null }));
    setPagina(1);
  };
  const limpiar = () => {
    setFiltros(inicial);
    setEscrito('');
    setBuscar('');
    setPagina(1);
  };
  const recargar = () => setVersion((n) => n + 1);

  return { datos, cargando, error, filtros, cambiarFiltro, escrito, setEscrito, buscar, pagina, setPagina, limpiar, recargar };
}

export function Campo({ etiqueta, children }) {
  return (
    <div style={estilos.campo}>
      <label>{etiqueta}</label>
      {children}
    </div>
  );
}

export function BarraFiltros({ escrito, setEscrito, placeholder, limpiar, children }) {
  return (
    <div style={estilos.barra}>
      <Campo etiqueta="Buscar">
        <input
          value={escrito}
          onChange={(e) => setEscrito(e.target.value)}
          placeholder={placeholder}
          style={{ minWidth: 240 }}
        />
      </Campo>
      {children}
      <button type="button" onClick={limpiar}>Limpiar filtros</button>
    </div>
  );
}

export function Paginador({ pagina, paginas, total, onCambiar }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
      <button disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>Anterior</button>
      <span>Pagina {pagina} de {paginas} ({total} resultados)</span>
      <button disabled={pagina >= paginas} onClick={() => onCambiar(pagina + 1)}>Siguiente</button>
    </div>
  );
}

export function descargarTexto(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}