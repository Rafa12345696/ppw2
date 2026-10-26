import { useEffect, useRef, useState } from 'react';
import { graphqlRequest } from '../../api';
import { suscribirse } from '../../ws';

const CAMPOS = 'id nombre precio stock imagen categoriaId';

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

function Tarjeta({ p, resaltado }) {
  const agotado = p.stock < 1;
  return (
    <a
      href={`/producto/${p.id}`}
      style={{
        border: `1px solid ${resaltado ? '#b8860b' : '#e0e0e0'}`,
        borderRadius: 10,
        padding: '1rem',
        background: 'white',
        color: '#1a1a1a',
        boxShadow: resaltado ? '0 0 0 3px rgba(184,134,11,0.35)' : '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.3s, border-color 0.3s',
        textDecoration: 'none',
        display: 'block',
        opacity: agotado ? 0.7 : 1,
      }}
    >
      <img
        src={p.imagen}
        alt={p.nombre}
        style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 6, marginBottom: '0.5rem' }}
      />
      <h4>{p.nombre}</h4>
      <p>${p.precio}</p>
      {agotado ? (
        <p style={{ color: '#b00020', fontSize: '0.85rem' }}>Agotado</p>
      ) : p.stock <= 5 ? (
        <p style={{ color: '#b26a00', fontSize: '0.85rem' }}>Quedan {p.stock}</p>
      ) : null}
    </a>
  );
}

export default function CatalogoVivo({ productos: iniciales, categoriaId = null, recargarAlMontar = false }) {
  const [productos, setProductos] = useState(iniciales);
  const [enVivo, setEnVivo] = useState(false);
  const [destacado, setDestacado] = useState(null);
  const yaConecto = useRef(false);
  const timer = useRef(null);

  const recargar = () => {
    const consulta = categoriaId
      ? graphqlRequest(QUERY_CATEGORIA, { id: categoriaId }).then((d) => d.productosPorCategoria)
      : graphqlRequest(QUERY_TODOS).then((d) => d.categorias.flatMap((c) => c.productos));
    consulta.then(setProductos).catch(() => {});
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

  return (
    <div>
      <p style={{ padding: '0 1rem', fontSize: '0.85rem' }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: enVivo ? '#2e7d32' : '#999',
            marginRight: 6,
          }}
        />
        {enVivo ? 'Catalogo en vivo' : 'Sin conexion en vivo'}
      </p>

      {productos.length === 0 ? (
        <p style={{ padding: '1rem' }}>No hay productos disponibles.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
            padding: '1rem',
          }}
        >
          {productos.map((p) => (
            <Tarjeta key={p.id} p={p} resaltado={destacado === p.id} />
          ))}
        </div>
      )}
    </div>
  );
}