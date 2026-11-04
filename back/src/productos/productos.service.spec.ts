import { ProductosService } from './productos.service.js';

const CAT = '65f0c0ffee00000000000aaa';

function armar(prismaExtra: Record<string, unknown> = {}) {
  const prisma = {
    pedido: { findMany: vi.fn().mockResolvedValue([]) },
    producto: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    categoria: { findUnique: vi.fn().mockResolvedValue({ id: CAT }) },
    ...prismaExtra,
  };
  const eventos = { productoCambio: vi.fn(), estadisticasCambio: vi.fn() };
  return { servicio: new ProductosService(prisma as any, eventos as any), prisma };
}

describe('ProductosService', () => {
  it('ordena los mas vendidos por unidades de pedidos pagados', async () => {
    const { servicio, prisma } = armar();
    prisma.pedido.findMany.mockResolvedValue([
      { detalles: [{ productoId: 'a', cantidad: 1 }, { productoId: 'b', cantidad: 5 }] },
      { detalles: [{ productoId: 'a', cantidad: 2 }] },
    ]);
    // La base puede devolverlos en cualquier orden
    prisma.producto.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    const lista = await servicio.masVendidos(10);
    expect(lista.map((p) => p.id)).toEqual(['b', 'a']);
    expect(prisma.pedido.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: 'PAGADO' } }),
    );
  });

  it('sin ventas regresa una lista vacia', async () => {
    const { servicio } = armar();
    expect(await servicio.masVendidos(5)).toEqual([]);
  });

  it('rechaza una promocion con precio anterior menor o igual al actual', async () => {
    const { servicio } = armar();
    await expect(
      servicio.create({
        nombre: 'X',
        precio: 500,
        precioAntes: 400,
        stock: 1,
        descripcion: 'd',
        imagen: '/x.png',
        categoriaId: CAT,
      }),
    ).rejects.toThrow('precio anterior');
  });

  it('al editar valida contra como quedara el producto', async () => {
    const { servicio, prisma } = armar();
    const id = '65f0c0ffee00000000000001';
    prisma.producto.findUnique.mockResolvedValue({ id, precio: 300, precioAntes: 380 });
    // Subir el precio por encima del precio anterior rompe la promocion
    await expect(servicio.update(id, { precio: 400 })).rejects.toThrow('precio anterior');
    // Mandar 0 quita la promocion y entonces si se permite
    prisma.producto.update.mockResolvedValue({ id, categoriaId: CAT });
    await servicio.update(id, { precio: 400, precioAntes: 0 });
    expect(prisma.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { precio: 400, precioAntes: null } }),
    );
  });
});
