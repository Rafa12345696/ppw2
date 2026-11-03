import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventosService } from '../eventos/eventos.service.js';
import { CrearProductoInput } from './dto/crear-producto.input.js';
import { ActualizarProductoInput } from './dto/actualizar-producto.input.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

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

  private validarImagen(imagen?: string | null) {
    if (imagen === undefined || imagen === null) return;
    const v = imagen.trim();
    const ruta = v.startsWith('/') && !v.startsWith('//');
    const https = /^https:\/\//i.test(v);
    if (!v || v.length > 500 || !(ruta || https)) {
      throw new BadRequestException('La imagen debe ser una ruta del sitio o una URL https');
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
    const producto = await this.prisma.producto.create({
      data: { ...data, imagen: data.imagen.trim() },
    });
    await this.eventos.productoCambio('CREADO', producto);
    await this.eventos.estadisticasCambio('producto', producto.id);
    return producto;
  }

  async update(id: string, data: ActualizarProductoInput) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Producto no encontrado');

    // GraphQL manda null en los campos que no se tocan: se descartan
    const limpio: Record<string, unknown> = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined && v !== null),
    );
    await this.validar(data.precio, data.stock, data.categoriaId, data.imagen);
    if (typeof limpio.imagen === 'string') limpio.imagen = limpio.imagen.trim();

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