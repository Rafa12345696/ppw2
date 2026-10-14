import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function mezclar(base, extra) {
  const resultado = base.map((item) => ({ ...item }));
  for (const item of extra) {
    const existente = resultado.find((r) => r.id === item.id);
    const maximo = item.stock ?? Infinity;
    if (existente) {
      existente.cantidad = Math.min(existente.cantidad + item.cantidad, maximo);
    } else {
      resultado.push({ ...item });
    }
  }
  return resultado;
}

export const useStore = create(
  persist(
    (set, get) => ({
      carrito: [],
      carritosGuardados: {},
      token: null,
      usuario: null,
      hidratado: false,

      agregarAlCarrito: (producto, cantidad) => {
        const carrito = get().carrito.map((item) => ({ ...item }));
        const existente = carrito.find((item) => item.id === producto.id);
        const maximo = producto.stock ?? Infinity;

        if (existente) {
          existente.cantidad = Math.min(existente.cantidad + cantidad, maximo);
          existente.stock = producto.stock;
        } else {
          carrito.push({ ...producto, cantidad: Math.min(cantidad, maximo) });
        }
        set({ carrito });
      },

      quitarDelCarrito: (id) => {
        set({ carrito: get().carrito.filter((item) => item.id !== id) });
      },

      vaciarCarrito: () => set({ carrito: [] }),

      setSesion: (token, usuario) => {
        const { carrito, usuario: actual, carritosGuardados } = get();
        const guardados = { ...carritosGuardados };
        let carritoInvitado = carrito;

        // Si ya habia otra sesion abierta, su carrito se guarda a su nombre
        if (actual) {
          guardados[actual.id] = carrito;
          carritoInvitado = [];
        }

        const propio = guardados[usuario.id] || [];
        delete guardados[usuario.id];

        set({
          token,
          usuario,
          carrito: mezclar(propio, carritoInvitado),
          carritosGuardados: guardados,
        });
      },

      cerrarSesion: () => {
        const { usuario, carrito, carritosGuardados } = get();
        const guardados = { ...carritosGuardados };
        if (usuario) guardados[usuario.id] = carrito;
        set({ token: null, usuario: null, carrito: [], carritosGuardados: guardados });
      },
    }),
    {
      name: 'elixir-storage',
      onRehydrateStorage: () => (state) => {
        if (state) state.hidratado = true;
      },
    },
  ),
);