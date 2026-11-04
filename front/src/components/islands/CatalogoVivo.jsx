import { useEffect, useMemo, useRef, useState } from 'react';
import { graphqlRequest } from '../../api';
import { suscribirse } from '../../ws';
import { useStore } from '../../store';
import { normalizar } from '../../formato';
import Imagen from './Imagen';
import { Precio, Etiquetas, Existencia, descuento } from './Precio';
import AvisoFlotante, { useAvisoFlotante } from './AvisoFlotante';
import { IcoCerrar, IcoFiltro } from './Iconos';

const CAMPOS = 'id nombre precio precioAntes premium stock imagen categoriaId';

const SUB = `
  subscription {
    productoCambio {
      accion
      productoId
      producto { ${CAMPOS} }
    }
  }
`;

const QUERY_TODOS = `query { categorias { productos { ${CAMPOS} } } }`;
const QUERY_CATEGORIA = `query($id: ID!) { productosPorCategoria(categoriaId: $id) { ${CAMPOS} } }`;

const DESTACADOS = [
  { id: 'vendidos', texto: 'Mas vendidos' },
  { id: 'promo', texto: 'En promocion' },
  { id: 'premium', texto: 'Premium' },
];

// Aplica un aviso del servidor a la lista que se esta mostrando
function aplicar(lista, ev, categoriaId) {
  if (ev.accion === 'ELIMINADO') return lista.filter((p) => p.id !== ev.productoId);

  const p = ev.producto;
  if (!p) return lista;

  // En la pagina de una categoria, un producto que se movio a otra categoria desaparece
  if (categoriaId && p.categoriaId !== categoriaId) return lista.filter((x) => x.id !== p.id);

  return lista.some((x) => x.id === p.id)
    ? lista.map((x) => (x.id === p.id ? { ...x, ...p } : x))
    : [...lista, p];
}

// Filtros: dentro de un grupo basta con cumplir uno (Tequila O Whisky);
// entre grupos hay que cumplir todos (Tequila Y en promocion).
function filtrar(lista, f, masVendidos, nombreCategoria) {
  const posicion = new Map(masVendidos.map((id, i) => [id, i]));
  const q = normalizar(f.busqueda);

  const r = lista.filter((p) => {
    if (q && !normalizar(`${p.nombre} ${nombreCategoria(p.categoriaId)}`).includes(q)) return false;
    if (f.categorias.length && !f.categorias.includes(p.categoriaId)) return false;
    if (f.destacados.length) {
      const cumple =
        (f.destacados.includes('promo') && descuento(p) > 0) ||
        (f.destacados.includes('premium') && p.premium) ||
        (f.destacados.includes('vendidos') && posicion.has(p.id));
      if (!cumple) return false;
    }
    if (f.ocultarAgotados && p.stock < 1) return false;
    return true;
  });

  const porVentas = (a, b) => (posicion.get(a.id) ?? 1e9) - (posicion.get(b.id) ?? 1e9);
  const agotadosAlFinal = (a, b) => (a.stock < 1) - (b.stock < 1);

  if (f.orden === 'PRECIO_ASC') return [...r].sort((a, b) => a.precio - b.precio);
  if (f.orden === 'PRECIO_DESC') return [...r].sort((a, b) => b.precio - a.precio);
  if (f.orden === 'NOMBRE') return [...r].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  // Relevancia: lo mas vendido primero si se filtro por eso; los agotados siempre al final
  return [...r].sort((a, b) => agotadosAlFinal(a, b) || (f.destacados.includes('vendidos') ? porVentas(a, b) : 0));
}

function Tarjeta({ p, categoria, resaltado, enCarrito, onAgregar }) {
  const agotado = p.stock < 1;
  const tope = !agotado && enCarrito >= p.stock;
  return (
    <article className={`producto${resaltado ? ' resaltado' : ''}`} aria-labelledby={`p-${p.id}`}>
      {/* La imagen repite el enlace del nombre: se omite del tabulador para no duplicarlo */}
      <a href={`/producto/${p.id}`} className="producto-imagen" tabIndex={-1} aria-hidden="true">
        <Etiquetas producto={p} />
        <Imagen url={p.imagen} alt="" anchos={[240, 360, 540]} sizes="(max-width: 600px) 50vw, 240px" />
      </a>
      <div className="producto-info">
        {categoria && <span className="producto-categoria">{categoria}</span>}
        <a id={`p-${p.id}`} href={`/producto/${p.id}`} className="producto-nombre">{p.nombre}</a>
        <Precio producto={p} />
        {p.stock <= 5 && <Existencia stock={p.stock} />}
      </div>
      <button
        type="button"
        className="btn btn-secundario btn-bloque"
        disabled={agotado || tope}
        onClick={() => onAgregar(p)}
      >
        {agotado ? 'Agotado' : tope ? 'Ya esta todo en tu carrito' : 'Agregar al carrito'}
        <span className="sr-only">: {p.nombre}</span>
      </button>
    </article>
  );
}

function Esqueletos() {
  return (
    <div className="grid-productos" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="producto">
          <div className="esqueleto" style={{ aspectRatio: '4 / 5' }} />
          <div className="esqueleto" style={{ height: 14, width: '40%' }} />
          <div className="esqueleto" style={{ height: 18, width: '80%' }} />
          <div className="esqueleto" style={{ height: 44 }} />
        </div>
      ))}
    </div>
  );
}

export default function CatalogoVivo({
  productos: iniciales,
  categoriaId = null,
  categorias = [],
  recargarAlMontar = false,
  masVendidos = [],
  busquedaInicial = '',
  destacadoInicial = null,
}) {
  const carrito = useStore((s) => s.carrito);
  const agregarAlCarrito = useStore((s) => s.agregarAlCarrito);
  const [productos, setProductos] = useState(iniciales);
  const [cargando, setCargando] = useState(recargarAlMontar);
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [destacados, setDestacados] = useState(
    DESTACADOS.some((d) => d.id === destacadoInicial) ? [destacadoInicial] : [],
  );
  const [cats, setCats] = useState([]);
  const [ocultarAgotados, setOcultarAgotados] = useState(false);
  const [orden, setOrden] = useState('RELEVANCIA');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [enVivo, setEnVivo] = useState(false);
  const [destacado, setDestacado] = useState(null);
  const [aviso, mostrarAviso, cerrarAviso] = useAvisoFlotante();
  const yaConecto = useRef(false);
  const timer = useRef(null);

  const nombres = useMemo(() => Object.fromEntries(categorias.map((c) => [c.id, c.nombre])), [categorias]);
  const nombreCategoria = (id) => nombres[id] || '';

  const recargar = () => {
    const consulta = categoriaId
      ? graphqlRequest(QUERY_CATEGORIA, { id: categoriaId }).then((d) => d.productosPorCategoria)
      : graphqlRequest(QUERY_TODOS).then((d) => d.categorias.flatMap((c) => c.productos));
    consulta
      .then(setProductos)
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  // Si el servidor no pudo traer el catalogo al armar la pagina, se intenta desde el navegador
  useEffect(() => {
    if (recargarAlMontar) recargar();
  }, []);

  useEffect(() => {
    const parar = suscribirse({
      query: SUB,
      onData: (data) => {
        const ev = data.productoCambio;
        setProductos((lista) => aplicar(lista, ev, categoriaId));

        if (ev.accion !== 'ELIMINADO') {
          setDestacado(ev.productoId);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setDestacado(null), 1500);
        }
      },
      onEstado: (conectado) => {
        setEnVivo(conectado);
        if (conectado) {
          // Al reconectar se pierden los avisos de mientras estuvo caido: se vuelve a pedir todo
          if (yaConecto.current) recargar();
          yaConecto.current = true;
        }
      },
    });

    return () => {
      clearTimeout(timer.current);
      parar();
    };
  }, [categoriaId]);

  // La URL refleja la busqueda y el apartado, para poder compartir o recargar la vista
  useEffect(() => {
    const url = new URL(window.location.href);
    busqueda ? url.searchParams.set('q', busqueda) : url.searchParams.delete('q');
    destacados.length === 1 ? url.searchParams.set('destacado', destacados[0]) : url.searchParams.delete('destacado');
    window.history.replaceState(null, '', url);
  }, [busqueda, destacados]);

  const alternar = (lista, setLista, valor) =>
    setLista(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);

  const limpiar = () => {
    setBusqueda('');
    setDestacados([]);
    setCats([]);
    setOcultarAgotados(false);
    const q = document.getElementById('q');
    if (q) q.value = '';
  };

  const agregar = (p) => {
    agregarAlCarrito(p, 1);
    mostrarAviso(`Agregaste ${p.nombre}`);
  };

  const visibles = filtrar(productos, { busqueda, destacados, categorias: cats, ocultarAgotados, orden }, masVendidos, nombreCategoria);
  const cantidadEnCarrito = (id) => carrito.find((i) => i.id === id)?.cantidad ?? 0;

  const conteoCategoria = (id) => productos.filter((p) => p.categoriaId === id).length;
  const destacadosDisponibles = masVendidos.length > 0 ? DESTACADOS : DESTACADOS.filter((d) => d.id !== 'vendidos');
  const activos = [
    ...(busqueda ? [{ clave: 'q', texto: `“${busqueda}”`, quitar: () => {
      setBusqueda('');
      const q = document.getElementById('q');
      if (q) q.value = '';
    } }] : []),
    ...destacados.map((d) => ({ clave: d, texto: DESTACADOS.find((x) => x.id === d)?.texto, quitar: () => alternar(destacados, setDestacados, d) })),
    ...cats.map((c) => ({ clave: c, texto: nombreCategoria(c), quitar: () => alternar(cats, setCats, c) })),
    ...(ocultarAgotados ? [{ clave: 'ag', texto: 'Sin agotados', quitar: () => setOcultarAgotados(false) }] : []),
  ];

  return (
    <div className="con-filtros">
      <aside id="filtros" className="filtros" data-abierto={filtrosAbiertos} aria-label="Filtros">
        <fieldset>
          <legend>Destacados</legend>
          {destacadosDisponibles.map((d) => (
            <label key={d.id} className="casilla">
              <input type="checkbox" checked={destacados.includes(d.id)} onChange={() => alternar(destacados, setDestacados, d.id)} />
              {d.texto}
            </label>
          ))}
        </fieldset>

        {!categoriaId && categorias.length > 0 && (
          <fieldset>
            <legend>Categoria</legend>
            {categorias.map((c) => (
              <label key={c.id} className="casilla">
                <input type="checkbox" checked={cats.includes(c.id)} onChange={() => alternar(cats, setCats, c.id)} />
                {c.nombre}
                <span className="cuenta-casilla num">{conteoCategoria(c.id)}</span>
              </label>
            ))}
          </fieldset>
        )}

        <fieldset>
          <legend>Disponibilidad</legend>
          <label className="casilla">
            <input type="checkbox" checked={ocultarAgotados} onChange={(e) => setOcultarAgotados(e.target.checked)} />
            Ocultar agotados
          </label>
        </fieldset>
      </aside>

      <section className="resultados" aria-label="Productos">
        <div className="barra-resultados">
          <div className="fila">
            <button
              type="button"
              className="btn btn-neutro btn-sm solo-movil"
              aria-expanded={filtrosAbiertos}
              aria-controls="filtros"
              onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
            >
              <IcoFiltro /> Filtros{activos.length > 0 && ` (${activos.length})`}
            </button>
            <p className="texto-2 num" aria-live="polite">
              {visibles.length} {visibles.length === 1 ? 'producto' : 'productos'}
            </p>
            <span className="en-vivo" data-activo={enVivo}>
              <span className="punto" aria-hidden="true" />
              {enVivo ? 'Precios y existencias en vivo' : 'Sin conexion en vivo'}
            </span>
          </div>
          <label className="campo-compacto" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, fontWeight: 400 }}>
            <span className="texto-2">Ordenar por</span>
            <select value={orden} onChange={(e) => setOrden(e.target.value)}>
              <option value="RELEVANCIA">Relevancia</option>
              <option value="PRECIO_ASC">Precio: menor a mayor</option>
              <option value="PRECIO_DESC">Precio: mayor a menor</option>
              <option value="NOMBRE">Nombre: A a Z</option>
            </select>
          </label>
        </div>

        {activos.length > 0 && (
          <div className="fila" style={{ gap: 8 }}>
            {activos.map((a) => (
              <span key={a.clave} className="chip">
                {a.texto}
                <button type="button" onClick={a.quitar} aria-label={`Quitar filtro ${a.texto}`}>
                  <IcoCerrar tam={14} />
                </button>
              </span>
            ))}
            <button type="button" className="btn btn-fantasma btn-sm" onClick={limpiar}>Limpiar todo</button>
          </div>
        )}

        {cargando ? (
          <Esqueletos />
        ) : visibles.length === 0 ? (
          <div className="vacio">
            <h2>{busqueda ? `No encontramos “${busqueda}”` : 'No hay productos con estos filtros'}</h2>
            <p>Prueba con otra palabra o quita algunos filtros para ver mas opciones.</p>
            {activos.length > 0 && (
              <button type="button" className="btn btn-neutro" onClick={limpiar}>Ver todo el catalogo</button>
            )}
          </div>
        ) : (
          <div className="grid-productos">
            {visibles.map((p) => (
              <Tarjeta
                key={p.id}
                p={p}
                categoria={nombreCategoria(p.categoriaId)}
                resaltado={destacado === p.id}
                enCarrito={cantidadEnCarrito(p.id)}
                onAgregar={agregar}
              />
            ))}
          </div>
        )}
      </section>

      <AvisoFlotante aviso={aviso} onCerrar={cerrarAviso} />
    </div>
  );
}
