import { create } from 'zustand';

export const useStore = create((set, get) => ({
  pantalla: 'home',
  categoriaSeleccionada: null,
  productoSeleccionado: null,
  carrito: [],

  irA: (pantalla) => set({ pantalla }),

  seleccionarCategoria: (categoriaId) =>
    set({ categoriaSeleccionada: categoriaId, pantalla: 'categoria' }),

  seleccionarProducto: (producto) =>
    set({ productoSeleccionado: producto, pantalla: 'producto' }),

  agregarAlCarrito: (producto, cantidad) => {
    const carrito = [...get().carrito];
    const existente = carrito.find((item) => item.id === producto.id);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      carrito.push({ ...producto, cantidad });
    }
    set({ carrito });
  },

  quitarDelCarrito: (id) => {
    set({ carrito: get().carrito.filter((item) => item.id !== id) });
  },

  vaciarCarrito: () => set({ carrito: [] }),
}));