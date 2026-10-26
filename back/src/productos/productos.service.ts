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

  private async validar(precio?: number | null, stock?: number | null, categoriaId?: string | null) {
    if (precio !== undefined && precio !== null && !(precio >= 0)) {
      throw new BadRequestException('El precio no puede ser negativo');
    }
    if (stock !== undefined && stock !== null && stock < 0) {
      throw new BadRequestException('El stock no puede ser negativo');
    }
    if (categoriaId) {
      if (!OBJECT_ID.test(categoriaId)) throw new BadRequestException('Categoria no valida');
      const existe = await this.prisma.categoria.findUnique({ where: { id: categoriaId } });
      if (!existe) throw new BadRequestException('La categoria no existe');
    }
  }

  async create(data: CrearProductoInput) {
    await this.validar(data.precio, data.stock, data.categoriaId);
    const producto = await this.prisma.producto.create({ data });
    await this.eventos.productoCambio('CREADO', producto);
    await this.eventos.estadisticasCambio('producto', producto.id);
    return producto;
  }

  async update(id: string, data: ActualizarProductoInput) {
    if (!OBJECT_ID.test(id)) throw new NotFoundException('Producto no encontrado');

    // GraphQL manda null en los campos que no se tocan: se descartan
    const limpio = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined && v !== null),
    );
    await this.validar(data.precio, data.stock, data.categoriaId);

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