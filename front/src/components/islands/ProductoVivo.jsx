import { useEffect, useRef, useState } from 'react';
import { graphqlRequest } from '../../api';
import { suscribirse } from '../../ws';
import AgregarAlCarrito from './AgregarAlCarrito';
import Imagen from './Imagen';
import { Precio, Etiquetas, Existencia } from './Precio';
import { IcoCandado, IcoReloj, IcoCamion } from './Iconos';

const CAMPOS = 'id nombre precio precioAntes premium stock descripcion imagen categoriaId';

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
              .then((d) => (d.productoPorId ? setProducto((a) => ({ ...a, ...d.productoPorId })) : setEliminado(true)))
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
      <div className="vacio">
        <h1>Este producto ya no esta disponible</h1>
        <p>Lo retiramos del catalogo mientras lo veias.</p>
        <a className="btn btn-neutro" href="/tienda">Volver a la tienda</a>
      </div>
    );
  }

  return (
    <div className="detalle-producto">
      <div className="detalle-imagen">
        <Imagen
          url={producto.imagen}
          alt={producto.nombre}
          anchos={[480, 720, 960, 1200]}
          sizes="(max-width: 900px) 100vw, 640px"
          prioridad
        />
      </div>

      <div className="pila-lg">
        <div className="pila-sm">
          <Etiquetas producto={producto} />
          {producto.categoria && <span className="producto-categoria">{producto.categoria.nombre}</span>}
          <h1>{producto.nombre}</h1>
        </div>

        {/* El cambio de precio o existencia en vivo se anuncia a lectores de pantalla */}
        <div className="pila-sm" aria-live="polite" style={{ transition: 'background-color 0.4s', backgroundColor: cambio ? 'var(--c-marca-suave)' : 'transparent', borderRadius: 4 }}>
          <Precio producto={producto} grande />
          <Existencia stock={producto.stock} />
        </div>

        {producto.descripcion && <p className="texto-2" style={{ maxWidth: 520 }}>{producto.descripcion}</p>}

        <AgregarAlCarrito producto={producto} />

        <ul className="lista-confianza">
          <li><IcoCandado /> Pago seguro con Mercado Pago o PayPal</li>
          <li><IcoReloj /> Apartamos tus productos 30 minutos mientras pagas</li>
          <li><IcoCamion /> Sigue tu pedido en vivo desde Mis pedidos</li>
        </ul>

        <span className="en-vivo" data-activo={enVivo}>
          <span className="punto" aria-hidden="true" />
          {enVivo ? 'Precio y existencias en vivo' : 'Sin conexion en vivo'}
        </span>
      </div>
    </div>
  );
}
