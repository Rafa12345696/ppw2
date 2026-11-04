import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { graphqlRequest } from '../../api';
import RequiereAdmin from './RequiereAdmin';
import SubirImagen from './SubirImagen';

const QUERY_CATEGORIAS = `query { categoriasAdmin { id nombre } }`;

const MUTATION_CREAR = `
  mutation($data: CrearProductoInput!) {
    crearProducto(data: $data) { id }
  }
`;

const MUTATION_ACTUALIZAR = `
  mutation($id: ID!, $data: ActualizarProductoInput!) {
    actualizarProducto(id: $id, data: $data) { id }
  }
`;

const QUERY_PRODUCTO = `
  query($id: ID!) {
    productoPorId(id: $id) {
      nombre
      precio
      precioAntes
      premium
      stock
      descripcion
      imagen
      categoriaId
    }
  }
`;

function Formulario({ productoId }) {
  const token = useStore((state) => state.token);
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [precioAntes, setPrecioAntes] = useState('');
  const [premium, setPremium] = useState(false);
  const [stock, setStock] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagen, setImagen] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    graphqlRequest(QUERY_CATEGORIAS, {}, token).then((data) => setCategorias(data.categoriasAdmin));

    if (productoId) {
      graphqlRequest(QUERY_PRODUCTO, { id: productoId }).then((data) => {
        const p = data.productoPorId;
        if (!p) {
          setError('El producto no existe.');
          return;
        }
        setNombre(p.nombre);
        setPrecio(p.precio);
        setPrecioAntes(p.precioAntes ?? '');
        setPremium(Boolean(p.premium));
        setStock(p.stock);
        setDescripcion(p.descripcion);
        setImagen(p.imagen);
        setCategoriaId(p.categoriaId);
      });
    }
  }, [productoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!imagen.trim()) {
      setError('Sube una imagen del producto.');
      return;
    }

    setEnviando(true);
    const datos = {
      nombre,
      precio: Number(precio),
      stock: Number(stock),
      descripcion,
      imagen: imagen.trim(),
      categoriaId,
      premium,
      // Vacio = sin promocion. Al editar se manda 0 para quitarla en el servidor.
      precioAntes: precioAntes === '' ? (productoId ? 0 : null) : Number(precioAntes),
    };
    try {
      if (productoId) {
        await graphqlRequest(MUTATION_ACTUALIZAR, { id: productoId, data: datos }, token);
      } else {
        await graphqlRequest(MUTATION_CREAR, { data: datos }, token);
      }
      window.location.href = '/admin/productos';
    } catch (err) {
      setError(err.message || 'No se pudo guardar el producto. Revisa los datos.');
    }
    setEnviando(false);
  };

  // Vista previa del descuento mientras se escribe
  const pct = Number(precioAntes) > Number(precio) && Number(precio) > 0
    ? Math.round((1 - Number(precio) / Number(precioAntes)) * 100)
    : 0;

  return (
    <form onSubmit={handleSubmit} className="pila-lg" style={{ maxWidth: 960 }}>
      <div className="compra" style={{ gridTemplateColumns: 'minmax(0, 1fr) 300px' }}>
        <div className="pila-lg">
          <fieldset className="tarjeta pila">
            <legend className="sr-only">Datos del producto</legend>
            <h2 style={{ fontSize: 'var(--t-lg)' }}>Datos</h2>
            <div className="campo">
              <label htmlFor="fp-nombre">Nombre</label>
              <input id="fp-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej. Don Julio 70 Añejo Cristalino" />
            </div>
            <div className="campo">
              <label htmlFor="fp-descripcion">Descripcion</label>
              <textarea id="fp-descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required rows={3} />
            </div>
            <div className="campo">
              <label htmlFor="fp-categoria">Categoria</label>
              <select id="fp-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
                <option value="">Selecciona una categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="tarjeta pila">
            <legend className="sr-only">Precio e inventario</legend>
            <h2 style={{ fontSize: 'var(--t-lg)' }}>Precio e inventario</h2>
            <div className="fila" style={{ alignItems: 'flex-start' }}>
              <div className="campo" style={{ flex: '1 1 160px' }}>
                <label htmlFor="fp-precio">Precio (MXN)</label>
                <input id="fp-precio" type="number" inputMode="decimal" min={0} step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
              </div>
              <div className="campo" style={{ flex: '1 1 160px' }}>
                <label htmlFor="fp-antes">Precio anterior <span className="texto-3">(opcional)</span></label>
                <input id="fp-antes" type="number" inputMode="decimal" min={0} step="0.01" value={precioAntes} onChange={(e) => setPrecioAntes(e.target.value)} placeholder="Sin promocion" aria-describedby="fp-antes-ayuda" />
                <span id="fp-antes-ayuda" className="ayuda">
                  {pct > 0 ? `Se mostrara tachado con -${pct}%.` : 'Si es mayor al precio, el producto aparece en Promociones.'}
                </span>
              </div>
              <div className="campo" style={{ flex: '1 1 120px' }}>
                <label htmlFor="fp-stock">Stock</label>
                <input id="fp-stock" type="number" inputMode="numeric" min={0} step={1} value={stock} onChange={(e) => setStock(e.target.value)} required />
              </div>
            </div>
            <label className="casilla">
              <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} />
              <span>
                Producto premium
                <span className="texto-3" style={{ display: 'block' }}>Aparece con la etiqueta Premium y en su apartado.</span>
              </span>
            </label>
          </fieldset>
        </div>

        <fieldset className="tarjeta pila" style={{ alignSelf: 'start' }}>
          <legend className="sr-only">Imagen</legend>
          <h2 style={{ fontSize: 'var(--t-lg)' }}>Imagen</h2>
          <SubirImagen valor={imagen} onCambio={setImagen} />
        </fieldset>
      </div>

      {error && <div className="alerta alerta-error" role="alert">{error}</div>}

      <div className="acciones">
        <button type="submit" className="btn btn-primario btn-lg" disabled={enviando} aria-busy={enviando}>
          {enviando ? 'Guardando...' : productoId ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <a className="btn btn-fantasma" href="/admin/productos">Cancelar</a>
      </div>
    </form>
  );
}

export default function FormularioProducto({ productoId }) {
  return (
    <RequiereAdmin>
      <Formulario productoId={productoId} />
    </RequiereAdmin>
  );
}