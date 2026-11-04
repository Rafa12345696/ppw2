import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma, Producto } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventosService } from '../eventos/eventos.service.js';
import { CrearProductoInput } from './dto/crear-producto.input.js';
import { ActualizarProductoInput } from './dto/actualizar-producto.input.js';
import { ESTADO_PEDIDO } from '../pedidos/pedido.constants.js';
import { OBJECT_ID } from '../comun/object-id.js';

@Injectable()
export class ProductosService {
  constructor(
    private prisma: PrismaService,
    private eventos: EventosService,
  ) {}

  findAll(skip: number, take: number) {
    return this.prisma.producto.findMany({ skip, take });
  }

  findOne(id: string) {
    if (!OBJECT_ID.test(id)) return null;
    return this.prisma.producto.findUnique({ where: { id } });
  }

  findByCategoria(categoriaId: string) {
    if (!OBJECT_ID.test(categoriaId)) return [];
    return this.prisma.producto.findMany({ where: { categoriaId } });
  }

  // Productos con mas unidades vendidas en pedidos PAGADOS, de mayor a menor
  async masVendidos(limite: number) {
    const n = Math.min(Math.max(Math.floor(limite) || 1, 1), 20);

    const pedidos = await this.prisma.pedido.findMany({
      where: { estado: ESTADO_PEDIDO.PAGADO },
      select: { detalles: true },
    });

    const unidades = new Map<string, number>();
    for (const pedido of pedidos) {
      for (const d of pedido.detalles) {
        unidades.set(d.productoId, (unidades.get(d.productoId) ?? 0) + d.cantidad);
      }
    }
    if (unidades.size === 0) return [];

    const ids = [...unidades.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

    // Los productos que ya se borraron simplemente no aparecen
    const productos = await this.prisma.producto.findMany({ where: { id: { in: ids } } });
    const porId = new Map(productos.map((p) => [p.id, p]));
    return ids
      .map((id) => porId.get(id))
      .filter((p): p is Producto => p !== undefined)
      .slice(0, n);
  }

  private validarImagen(imagen?: string | null) {
    if (imagen === undefined || imagen === null) return;
    const v = imagen.trim();
    const ruta = v.startsWith('/') && !v.startsWith('//');
    const https = /^https:\/\//i.test(v);
    if (!v || v.length > 500 || !(ruta || https)) {
      throw new BadRequestException('La imagen debe ser una ruta del sitio o una URL https');
    }
  }

  // La promocion solo tiene sentido si el precio anterior es mayor que el actual
  private validarPromocion(precio: number, precioAntes: number | null) {
    if (precioAntes !== null && !(precioAntes > precio)) {
      throw new BadRequestException('El precio anterior debe ser mayor que el precio actual');
    }
  }

  private async validar(
    precio?: number | null,
    stock?: number | null,
    categoriaId?: string | null,
    imagen?: string | null,
  ) {
    if (precio !== undefined && precio !== null && !(precio >= 0)) {
      throw new BadRequestException('El precio no puede ser negativo');
    }
    if (stock !== undefined && stock !== null && stock < 0) {
      throw new BadRequestException('El stock no puede ser negativo');
    }
    this.validarImagen(imagen);
    if (categoriaId) {
      if (!OBJECT_ID.test(categoriaId)) throw new BadRequestException('Categoria no valida');
      const existe = await this.prisma.categoria.findUnique({ where: { id: categoriaId } });
      if (!existe) throw new BadRequestException('La categoria no existe');
    }
  }

  async create(data: CrearProductoInput) {
    await this.validar(data.precio, data.stock, data.categoriaId, data.imagen);

    // 0, null o vacio significan "sin promocion"
    const precioAntes = data.precioAntes ? data.precioAntes : null;
    this.validarPromocion(data.precio, precioAntes);

    const producto = await this.prisma.producto.create({
      data: {
        nombre: data.nombre,
        precio: data.precio,
        stock: data.stock,
        descripcion: data.descripcion,
        imagen: data.imagen.trim(),
        categoriaId: data.categoriaId,
        precioAntes,
        premium: data.premium ?? false,
      },
    });
    await this.eventos.productoCambio('CREADO', producto);
    await this.eventos.estadisticasCambio('producto', producto.id);
    return producto;
  }

  async update(id: string, data: ActualizarProductoInput) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Producto no encontrado');

    const actual = await this.prisma.producto.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException('Producto no encontrado');

    // GraphQL manda null en los campos que no se tocan: se descartan
    const limpio: Record<string, unknown> = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined && v !== null),
    );
    await this.validar(data.precio, data.stock, data.categoriaId, data.imagen);
    if (typeof limpio.imagen === 'string') limpio.imagen = limpio.imagen.trim();

    // precioAntes = 0 quita la promocion
    if (limpio.precioAntes === 0) limpio.precioAntes = null;

    // Se valida contra como quedara el producto, no solo contra lo que se mando
    const precioFinal = (limpio.precio as number | undefined) ?? actual.precio;
    const precioAntesFinal =
      'precioAntes' in limpio ? (limpio.precioAntes as number | null) : (actual.precioAntes ?? null);
    this.validarPromocion(precioFinal, precioAntesFinal);

    const producto = await this.prisma.producto.update({
      where: { id },
      data: limpio as Prisma.ProductoUncheckedUpdateInput,
    });
    await this.eventos.productoCambio('ACTUALIZADO', producto);
    await this.eventos.estadisticasCambio('producto', id);
    return producto;
  }

  async remove(id: string) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Producto no encontrado');
    const producto = await this.prisma.producto.delete({ where: { id } });
    await this.eventos.productoCambio('ELIMINADO', producto);
    await this.eventos.estadisticasCambio('producto', id);
    return producto;
  }
}
