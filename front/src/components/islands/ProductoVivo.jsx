import { useEffect, useRef, useState } from 'react';
import { graphqlRequest } from '../../api';
import { suscribirse } from '../../ws';
import AgregarAlCarrito from './AgregarAlCarrito';

const CAMPOS = 'id nombre precio stock descripcion imagen categoriaId';

const SUB = `
  subscription($id: ID) {
    productoCambio(productoId: $id) {
      accion
      producto { ${CAMPOS} }
    }
  }
`;

const QUERY = `query($id: ID!) { productoPorId(id: $id) { ${CAMPOS} } }`;

export default function ProductoVivo({ producto: inicial }) {
  const [producto, setProducto] = useState(inicial);
  const [eliminado, setEliminado] = useState(false);
  const [enVivo, setEnVivo] = useState(false);
  const [cambio, setCambio] = useState(false);
  const yaConecto = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    const parar = suscribirse({
      query: SUB,
      variables: { id: inicial.id },
      onData: (data) => {
        const ev = data.productoCambio;
        if (ev.accion === 'ELIMINADO') {
          setEliminado(true);
          return;
        }
        if (ev.producto) {
          setProducto((anterior) => ({ ...anterior, ...ev.producto }));
          setCambio(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCambio(false), 1500);
        }
      },
      onEstado: (conectado) => {
        setEnVivo(conectado);
        if (conectado) {
          // Al reconectar se pierden los avisos de mientras estuvo caido: se vuelve a consultar
          if (yaConecto.current) {
            graphqlRequest(QUERY, { id: inicial.id })
              .then((d) => (d.productoPorId ? setProducto(d.productoPorId) : setEliminado(true)))
              .catch(() => {});
          }
          yaConecto.current = true;
        }
      },
    });

    return () => {
      clearTimeout(timer.current);
      parar();
    };
  }, [inicial.id]);

  if (eliminado) {
    return (
      <div style={{ padding: '1rem' }}>
        <h2>Este producto ya no esta disponible</h2>
        <p style={{ marginTop: '1rem' }}><a href="/tienda">Volver a la tienda</a></p>
      </div>
    );
  }

  const agotado = producto.stock < 1;

  return (
    <div style={{ padding: '1rem', maxWidth: 500 }}>
      <img
        src={producto.imagen}
        alt={producto.nombre}
        style={{ width: '100%', height: 300, objectFit: 'cover', borderRadius: 10, marginBottom: '1rem' }}
      />
      <h1>{producto.nombre}</h1>
      <p>{producto.descripcion}</p>
      <p
        style={{
          fontSize: '1.3rem',
          fontWeight: 'bold',
          background: cambio ? 'rgba(184,134,11,0.25)' : 'transparent',
          transition: 'background 0.3s',
        }}
      >
        ${producto.precio}
      </p>
      <p
        style={{
          color: agotado ? '#b00020' : producto.stock <= 5 ? '#b26a00' : '#2e7d32',
          background: cambio ? 'rgba(184,134,11,0.25)' : 'transparent',
          transition: 'background 0.3s',
        }}
      >
        {agotado ? 'Agotado' : `Disponibles: ${producto.stock}`}
      </p>
      <AgregarAlCarrito producto={producto} />
      <p style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
        {enVivo ? 'Informacion en vivo' : 'Sin conexion en vivo'}
      </p>
    </div>
  );
}