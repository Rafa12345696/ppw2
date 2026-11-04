import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import { suscribirse } from '../../ws';

// Formatos compartidos (se reexportan para no cambiar los imports de las pantallas)
export { dinero, fechaHora, folio } from '../../formato';

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

// El <label> envuelve al control: asi quedan ligados sin necesidad de ids
export function Campo({ etiqueta, children }) {
  return (
    <label className="campo-compacto">
      {etiqueta}
      {children}
    </label>
  );
}

export function BarraFiltros({ escrito, setEscrito, placeholder, limpiar, children }) {
  return (
    <div className="barra-filtros" role="search">
      <Campo etiqueta="Buscar">
        <input type="search" value={escrito} onChange={(e) => setEscrito(e.target.value)} placeholder={placeholder} style={{ minWidth: 240 }} />
      </Campo>
      {children}
      <button type="button" className="btn btn-fantasma btn-sm" onClick={limpiar}>Limpiar filtros</button>
    </div>
  );
}

export function Paginador({ pagina, paginas, total, onCambiar }) {
  return (
    <nav className="paginador" aria-label="Paginas">
      <span className="num">{total} {total === 1 ? 'resultado' : 'resultados'}</span>
      <div className="acciones">
        <button type="button" className="btn btn-neutro btn-sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>Anterior</button>
        <span className="num" aria-current="page">Pagina {pagina} de {paginas}</span>
        <button type="button" className="btn btn-neutro btn-sm" disabled={pagina >= paginas} onClick={() => onCambiar(pagina + 1)}>Siguiente</button>
      </div>
    </nav>
  );
}

// Estados comunes de una tabla: error, cargando y vacio
export function EstadoListado({ L, vacio }) {
  if (L.error) return <div className="alerta alerta-error" role="alert">{L.error}</div>;
  if (!L.datos) return <div className="esqueleto" style={{ height: 220 }} aria-label="Cargando" />;
  if (L.datos.items.length === 0) return <div className="vacio"><p>{vacio}</p></div>;
  return null;
}

// Mensaje de exito o error tras una accion
export function Mensaje({ tipo = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`alerta alerta-${tipo === 'ok' ? 'ok' : 'error'}`} role={tipo === 'ok' ? 'status' : 'alert'} style={{ marginBottom: 16 }}>
      {children}
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