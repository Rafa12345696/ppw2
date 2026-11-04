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

// Lee la fecha de vencimiento (exp) que viene dentro del JWT.
// No verifica la firma (eso lo hace el servidor): solo evita usar un token que ya sabemos que vencio.
export function tokenVencido(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64));
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true; // si no se puede leer, se trata como vencido
  }
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

      // Fija la cantidad de un producto del carrito, entre 1 y lo que haya en existencia
      cambiarCantidad: (id, cantidad) => {
        set({
          carrito: get().carrito.map((item) =>
            item.id === id
              ? { ...item, cantidad: Math.max(1, Math.min(Math.floor(cantidad) || 1, item.stock ?? Infinity)) }
              : item,
          ),
        });
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

      // Cambia datos del usuario con sesion sin tocar el token (por ejemplo, la fecha de nacimiento)
      actualizarUsuario: (cambios) => {
        const { usuario } = get();
        if (usuario) set({ usuario: { ...usuario, ...cambios } });
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
      // "hidratado" describe esta carga de la pagina: no se guarda en localStorage
      partialize: ({ hidratado, ...resto }) => resto,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hidratado = true;
        // Token guardado ya vencido: se cierra la sesion antes de usarlo (el carrito se guarda)
        if (state.token && tokenVencido(state.token)) state.cerrarSesion();
      },
    },
  ),
);